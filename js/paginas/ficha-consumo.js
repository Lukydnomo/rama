/* =====================================================================
   R.A.M.A. — ficha de Ordem · munição, componentes e "Usar ritual"
   =====================================================================
   A tela das duas regras opcionais de consumo (js/ordem/consumo.js):

     · na aba Geral, os painéis "Munição" e "Componentes ritualísticos",
       cada um só com a sua regra ligada;
     · no ataque com arma que usa munição, a confirmação compacta do
       gasto — uma janela só, com o saldo depois e a opção de atacar sem
       registrar;
     · "Usar ritual", com a versão, o custo, os componentes e o que vai
       ser gasto, antes de confirmar.

   Tudo o que é gasto passa por ctx.alterou() e sobe pelo salvador de
   sempre; cada uso confirmado leva um id, e o mesmo id não gasta duas
   vezes. Cancelar antes de confirmar não gasta nada.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var el = U.el;

  function CS() { return global.RAMAOrdemConsumo; }
  function R() { return global.RAMAOrdemRegras; }
  function RT() { return global.RAMAOrdemRituais || null; }
  function EF() { return global.RAMAOrdemEfeitos || null; }
  function OPC() { return global.RAMAOrdemOpcionais || null; }

  function ordemDe(ctx) { return ctx.ficha.ordem; }
  function afinidadeDe(o) { return (o.afinidade && o.afinidade.elemento) || ""; }
  function inventario(ctx) { return ctx.ficha.inventario; }

  function novoOpId(tipo) { return tipo + "-" + U.uuid().replace(/[^A-Za-z0-9_-]/g, ""); }

  function feito(ctx, foco) {
    ctx.alterou();
    ctx.redesenhar();
    if (foco) setTimeout(function () {
      var alvo = document.querySelector('[data-foco="' + foco + '"]');
      if (alvo) alvo.focus();
    }, 0);
  }

  function pedirNumero(titulo, rotulo, valor, aoConfirmar) {
    UI.pedirTexto({ titulo: titulo, rotulo: rotulo, valor: String(valor), limite: 5 }).then(function (t) {
      if (t === null || t === undefined) return;
      var n = Number(String(t).trim().replace(",", "."));
      if (!isFinite(n)) { UI.avisoAtencao("Informe um número."); return; }
      aoConfirmar(Math.round(n));
    });
  }

  /* =================================================================
     PAINEL DE MUNIÇÃO (aba Geral)
     ================================================================= */

  function painelMunicao(ctx) {
    var o = ordemDe(ctx);
    var inv = inventario(ctx);
    var itens = (inv && inv.itens) || [];
    var armas = itens.filter(function (i) { return CS().usaMunicao(i); });
    var municoes = itens.filter(function (i) { return CS().ehMunicao(i); });

    var partes = [
      el("p.t-mini", { texto: "Contagem de munição (Ordem Paranormal RPG, p. 174): cada pacote tem munição para 20 ataques (foguete: 1). " +
        "O que está carregado já saiu da reserva. Recarregar é uma ação de movimento." }),
    ];

    if (!armas.length && !municoes.length) {
      partes.push(el("p.t-mini", { texto: "Nenhuma arma de disparo ou de fogo, nem munição, no inventário." }));
    }

    armas.forEach(function (arma) { partes.push(linhaDeArma(ctx, o, inv, arma, municoes)); });
    municoes.forEach(function (m) { partes.push(linhaDeMunicao(ctx, o, m)); });
    partes.push(registroDeConsumo(o, ["ataque", "recarga", "reposicao", "ajuste"]));
    return UI.painel("Munição", el("div.pilha--curta.consumo", { class: "pilha", dataset: { painelMunicao: "sim" } }, partes));
  }

  function linhaDeArma(ctx, o, inv, arma, municoes) {
    var cap = CS().capacidade(arma);
    var achada = CS().municaoDaArma(inv, arma);
    var seletor = el("select.r-selecao", {
      "aria-label": "Munição de " + arma.nome, dataset: { foco: "municao-de-" + arma.id },
      onchange: function (ev) {
        var r = CS().associar(arma, ev.target.value);
        if (r.mudou) feito(ctx, "municao-de-" + arma.id);
      },
    }, [el("option", { value: "", texto: municoes.length ? "— escolher —" : "sem munição no inventário" })].concat(
      municoes.map(function (m) {
        return el("option", { value: m.id, texto: m.nome, selected: achada.item && achada.item.id === m.id });
      })));

    var estado = cap
      ? "Carregadas: " + CS().carregada(arma) + " de " + cap
      : "Sem carregador: atira direto da reserva";
    return el("div.consumo-item", { dataset: { armaId: arma.id } }, [
      el("div.consumo-item__topo", {}, [
        el("span.consumo-item__nome", { texto: arma.nome }),
        el("span.t-mini", { texto: estado }),
      ]),
      el("div.faixa.consumo-item__botoes", {}, [
        el("label.t-mini.consumo-item__rotulo", {}, [el("span", { texto: "Munição " }), seletor]),
        achada.sugerida ? el("span.t-mini", { texto: "(pelo nome da arma)" }) : null,
        cap ? el("button.r-botao.r-botao--mini", {
          type: "button", texto: "Recarregar", dataset: { foco: "recarregar-" + arma.id },
          onclick: function () { recarregar(ctx, arma); },
        }) : null,
        cap ? el("button.r-botao.r-botao--mini.r-botao--fantasma", {
          type: "button", texto: "Ajustar carregadas",
          onclick: function () {
            pedirNumero("Balas carregadas em " + arma.nome, "Quantas estão na arma (0 a " + cap + ")", CS().carregada(arma), function (n) {
              var r = CS().ajustarCarregada(o, arma, n, novoOpId("ajuste"));
              if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
              feito(ctx, "recarregar-" + arma.id);
            });
          },
        }) : null,
      ]),
    ]);
  }

  function recarregar(ctx, arma) {
    var o = ordemDe(ctx);
    var plano = CS().planoDeRecarga(inventario(ctx), arma);
    if (!plano.ok) { UI.avisoAtencao(plano.motivo); return; }
    var r = CS().recarregar(o, inventario(ctx), arma, novoOpId("recarga"));
    if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
    UI.aviso(arma.nome + ": recarregou " + plano.quanto + " (" + plano.carregadaDepois + " de " + plano.capacidade + "). Reserva: " +
      plano.reservaDepois + "." + (plano.incompleta ? " A reserva não bastou para encher." : "") + " Recarregar gasta uma ação de movimento.");
    feito(ctx, "recarregar-" + arma.id);
  }

  function linhaDeMunicao(ctx, o, m) {
    var d = global.RAMAOrdemInventario.dadosDoItem(m);
    var reserva = CS().reserva(m);
    var vazios = CS().pacotesVazios(m);
    return el("div.consumo-item", { dataset: { municaoId: m.id } }, [
      el("div.consumo-item__topo", {}, [
        el("span.consumo-item__nome", { texto: m.nome }),
        el("span.consumo-item__saldo", { texto: reserva + " na reserva" }),
        el("span.t-mini", { texto: (d.quantidade || 1) + " pacote(s) de " + CS().porPacote(m) + (vazios ? " · " + vazios + " vazio(s)" : "") }),
      ]),
      el("div.faixa.consumo-item__botoes", {}, [
        el("button.r-botao.r-botao--mini", {
          type: "button", texto: "+ Pacote", dataset: { foco: "repor-" + m.id },
          onclick: function () {
            var r = CS().repor(o, m, 1, novoOpId("reposicao"));
            if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
            feito(ctx, "repor-" + m.id);
          },
        }),
        el("button.r-botao.r-botao--mini.r-botao--fantasma", {
          type: "button", texto: "Ajustar reserva",
          onclick: function () {
            pedirNumero("Reserva de " + m.nome, "Quantos ataques restam na reserva", reserva, function (n) {
              var r = CS().ajustarReserva(o, m, n, novoOpId("ajuste"));
              if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
              feito(ctx, "repor-" + m.id);
            });
          },
        }),
        el("button.r-botao.r-botao--mini.r-botao--fantasma", {
          type: "button", texto: "Ataques por pacote",
          title: "Para munição Homebrew ou de outra regra. O livro: 20 (foguete: 1).",
          onclick: function () {
            pedirNumero("Ataques por pacote de " + m.nome, "Quantos ataques cada pacote dá", CS().porPacote(m), function (n) {
              if (n < 1 || n > 999) { UI.avisoAtencao("De 1 a 999."); return; }
              if (!m.ordem || typeof m.ordem !== "object") m.ordem = {};
              if (!m.ordem.contagem || typeof m.ordem.contagem !== "object") m.ordem.contagem = {};
              m.ordem.contagem.porPacote = n;
              feito(ctx, "repor-" + m.id);
            });
          },
        }),
        vazios && vazios < (d.quantidade || 1) ? el("button.r-botao.r-botao--mini.r-botao--fantasma", {
          type: "button", texto: "Descartar vazios",
          onclick: function () {
            var r = CS().descartarVazios(m);
            if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
            feito(ctx, "repor-" + m.id);
          },
        }) : null,
      ]),
    ]);
  }

  function registroDeConsumo(o, tipos) {
    var lista = (o.consumos || []).filter(function (x) { return tipos.indexOf(x.tipo) >= 0; }).slice(-8).reverse();
    if (!lista.length) return null;
    return el("details.consumo-registro", {}, [
      el("summary", { texto: "Últimos registros (" + lista.length + ")" }),
      el("ul", {}, lista.map(function (x) {
        return el("li.t-mini", { texto: (x.em ? U.dataHora(x.em) + " · " : "") + x.resumo });
      })),
    ]);
  }

  /* =================================================================
     A CONFIRMAÇÃO DO ATAQUE
     -----------------------------------------------------------------
     Uma janela só: o modo (tiro, rajada, dois canos), o que será gasto e
     o saldo depois. "Atacar e registrar" gasta e rola; "Atacar sem
     registrar" só rola; Cancelar não faz nada. O dano rolado depois não
     gasta de novo — ele pertence ao mesmo ataque.
     ================================================================= */

  function confirmarAtaque(ctx, arma, aoAtacar) {
    var o = ordemDe(ctx);
    var inv = inventario(ctx);
    var d = global.RAMAOrdemInventario.dadosDoItem(arma);
    var automatica = !!(d.arma && d.arma.automatica) || !!(R().armaEfetiva(o, inv, arma, ctx.ficha.pericias).automatica);
    var caneDuplo = arma.origemCatalogoId === CS().CANO_DUPLO;
    var modos = [{ chave: "unico", rotulo: "Ataque normal" }];
    if (automatica) modos.push({ chave: "rajada", rotulo: "Rajada: 10 balas, −1 dado no ataque, +2 dados de dano" });
    if (caneDuplo) modos.push({ chave: "doisCanos", rotulo: "Dois canos: 2 cartuchos, −1 dado no ataque, dano 6d6" });
    var escolhido = "unico";
    var opId = novoOpId("ataque");
    var usado = false;
    var resumo = el("div.consumo-confirmacao__resumo", { "aria-live": "polite" });
    var botoesDoResumo = el("div.faixa.consumo-confirmacao__botoes");
    var janela = null;

    function pintar() {
      var plano = CS().planoDeAtaque(inv, arma, escolhido);
      var linhas = [];
      if (plano.municao) linhas.push(el("p", { texto: "Munição: " + plano.municao.nome + (plano.sugerida ? " (pelo nome da arma)" : "") }));
      if (plano.ok) {
        linhas.push(el("p.consumo-confirmacao__gasto", {
          texto: "Gasta " + plano.gasto + (plano.gasto === 1 ? " disparo" : " disparos") + " · " +
                 (plano.deOnde === "carregada" ? "carregadas " : "reserva ") + plano.antes + " → " + plano.depois,
        }));
      } else {
        linhas.push(el("p.t-aviso", { texto: plano.motivo }));
      }
      U.trocar(resumo, linhas);

      var botoes = [];
      if (plano.ok) {
        botoes.push(el("button.r-botao.r-botao--principal", {
          type: "button", texto: "Atacar e registrar", dataset: { foco: "ataque-registrar" },
          onclick: function () { concluir(true, plano); },
        }));
      } else if (plano.acao === "recarregar") {
        botoes.push(el("button.r-botao.r-botao--principal", {
          type: "button", texto: "Recarregar (ação de movimento)",
          onclick: function () {
            var r = CS().recarregar(o, inv, arma, novoOpId("recarga"));
            if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
            ctx.alterou();
            UI.aviso(arma.nome + ": recarregada (" + r.plano.carregadaDepois + " de " + r.plano.capacidade + ").");
            pintar();
          },
        }));
      } else if (plano.acao === "associar") {
        botoes.push(el("p.t-mini", { texto: "Escolha a munição da arma no painel Munição, na aba Geral." }));
      } else if (plano.acao === "semMunicao") {
        botoes.push(el("p.t-mini", { texto: "Reponha pacotes ou ajuste a reserva no painel Munição, na aba Geral." }));
      }
      botoes.push(el("button.r-botao", {
        type: "button", texto: "Atacar sem registrar",
        title: "Rola o ataque sem mexer na munição — para regularizar à mão depois, se for o caso.",
        onclick: function () { concluir(false, plano); },
      }));
      botoes.push(el("button.r-botao.r-botao--fantasma", { type: "button", texto: "Cancelar", onclick: function () { janela.fechar(); } }));
      U.trocar(botoesDoResumo, botoes);
    }

    function concluir(registrar, plano) {
      if (usado) return;
      usado = true;
      var nota = "";
      if (registrar) {
        var r = CS().aplicarAtaque(o, inv, arma, plano, opId);
        if (!r.ok) { usado = false; UI.avisoAtencao(r.motivo); pintar(); return; }
        if (!r.repetido) {
          ctx.alterou();
          nota = "Munição: " + r.plano.gasto + " · sobram " + r.plano.depois + (r.plano.deOnde === "carregada" ? " carregadas" : " na reserva");
        }
      } else {
        nota = "Ataque sem registro de munição.";
      }
      janela.fechar();
      ctx.redesenhar();
      aoAtacar({ modo: escolhido, registrou: registrar, nota: nota, opId: opId });
    }

    var modosEl = modos.length > 1
      ? el("div.filtros__grupo", { role: "group", "aria-label": "Tipo de ataque" }, modos.map(function (m) {
          var b = el("button.filtro", {
            type: "button", "aria-pressed": String(m.chave === escolhido), texto: m.rotulo, dataset: { modo: m.chave },
            onclick: function () {
              escolhido = m.chave;
              U.$$(".filtro", modosEl).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
              pintar();
            },
          });
          return b;
        }))
      : null;

    janela = UI.modal({
      titulo: "Ataque com " + arma.nome,
      conteudo: [el("div.pilha--curta.consumo-confirmacao", { class: "pilha" }, [modosEl, resumo, botoesDoResumo])],

    });
    pintar();
  }

  /* =================================================================
     PAINEL DE COMPONENTES (aba Geral)
     ================================================================= */

  function painelComponentes(ctx, c) {
    var o = ordemDe(ctx);
    if (!o.componentes || !o.componentes.elementos) o.componentes = CS().normalizarControle(o.componentes);
    var inv = inventario(ctx);
    var af = afinidadeDe(o);

    var partes = [
      el("p.t-mini", { texto: "Pelo livro, conjurar pede componentes do elemento do ritual (Ordem Paranormal RPG, p. 119), exceto rituais de Medo, " +
        "e a afinidade dispensa os do seu elemento (p. 114). Eles não se gastam ao conjurar: o livro só diz que é preciso tê-los. " +
        "Catalisadores se gastam (Sobrevivendo ao Horror, p. 44). Contar usos é uma escolha da mesa." }),
    ];
    CS().ELEMENTOS.forEach(function (elemento) { partes.push(linhaDeElemento(ctx, o, inv, elemento, af)); });

    var cats = CS().catalisadores(inv, "");
    if (cats.length) {
      partes.push(el("p.t-mini", {
        texto: "Catalisadores no inventário: " + cats.map(function (x) {
          return x.nome + " ×" + (global.RAMAOrdemInventario.dadosDoItem(x).quantidade || 1);
        }).join(", ") + ". Um por ritual, gasto ao ser usado (SAH p. 44).",
      }));
    }

    o.componentes.extras.forEach(function (x) { partes.push(linhaDeExtra(ctx, o, x)); });
    partes.push(el("button.r-botao.r-botao--mini.r-botao--fantasma", {
      type: "button", texto: "+ Elemento ou conjunto da mesa", dataset: { foco: "componente-extra" },
      onclick: function () {
        UI.pedirTexto({ titulo: "Componentes de um elemento da mesa", rotulo: "Nome (um elemento Homebrew, um conjunto específico…)", valor: "", limite: 60 }).then(function (nome) {
          if (!nome || !nome.trim()) return;
          o.componentes.extras.push({ id: "cx-" + U.uuid().slice(0, 12), nome: nome.trim(), modo: "posse", tem: true, quantidade: 0, unidade: "usos", porUso: 1 });
          feito(ctx, "componente-extra");
        });
      },
    }));
    partes.push(registroDeConsumo(o, ["ritual"]));
    return UI.painel("Componentes ritualísticos", el("div.pilha--curta.consumo", { class: "pilha", dataset: { painelComponentes: "sim" } }, partes));
  }

  function controlesDeModo(ctx, alvo, rotulo, foco, aoMudarQuantidade) {
    var modo = el("select.r-selecao", {
      "aria-label": "Como acompanhar " + rotulo, dataset: { foco: foco + "-modo" },
      onchange: function (ev) { alvo.modo = ev.target.value === "quantidade" ? "quantidade" : "posse"; feito(ctx, foco + "-modo"); },
    }, [
      el("option", { value: "posse", texto: "Pelo livro: tem ou não tem", selected: alvo.modo !== "quantidade" }),
      el("option", { value: "quantidade", texto: "Regra da mesa: contar usos", selected: alvo.modo === "quantidade" }),
    ]);
    var extra = [];
    if (alvo.modo === "quantidade") {
      extra.push(UI.passo({
        valor: alvo.quantidade, minimo: 0, maximo: 9999, rotulo: rotulo + ": quantidade (" + alvo.unidade + ")",
        aoMudar: function (v) { alvo.quantidade = v; ctx.alterou(); if (aoMudarQuantidade) aoMudarQuantidade(); },
      }));
      extra.push(el("button.r-botao.r-botao--mini.r-botao--fantasma", {
        type: "button", texto: "Unidade: " + alvo.unidade + " · gasta " + alvo.porUso + " por uso",
        onclick: function () {
          UI.pedirTexto({ titulo: "Unidade acompanhada", rotulo: "Unidade (ex.: usos, frascos, velas)", valor: alvo.unidade, limite: 30 }).then(function (u) {
            if (u === null || u === undefined) return;
            alvo.unidade = String(u).trim() || "usos";
            pedirNumero("Quanto cada uso gasta", "Quantos " + alvo.unidade + " por uso (1 a 99)", alvo.porUso, function (n) {
              if (n < 1 || n > 99) { UI.avisoAtencao("De 1 a 99."); return; }
              alvo.porUso = n;
              feito(ctx, foco + "-modo");
            });
          });
        },
      }));
    }
    return el("div.faixa.consumo-item__botoes", {}, [modo].concat(extra));
  }

  function linhaDeElemento(ctx, o, inv, elemento, afinidade) {
    var alvo = o.componentes.elementos[elemento];
    var sit = CS().situacaoDoElemento(o.componentes, inv, elemento);
    var nome = CS().NOMES_ELEMENTOS[elemento];
    var rotuloEstado = el("span.t-mini");
    function pintarEstado() {
      var sit = CS().situacaoDoElemento(o.componentes, inv, elemento);
      var estado;
      if (sit.modo === "quantidade") {
        estado = sit.quantidade + " " + sit.unidade + " (regra da mesa: cada uso gasta " + sit.porUso + ")";
      } else if (sit.itens.length) {
        estado = "tem — " + sit.itens.map(function (i) { return i.nome; }).join(", ");
      } else {
        estado = sit.tem ? "tem (marcado à mão)" : "não tem";
      }
      rotuloEstado.textContent = estado;
      rotuloEstado.classList.toggle("t-aviso", !sit.tem);
    }
    pintarEstado();
    return el("div.consumo-item", { dataset: { componente: elemento } }, [
      el("div.consumo-item__topo", {}, [
        el("span.consumo-item__nome", { texto: nome }),
        rotuloEstado,
        afinidade === elemento ? el("span.r-etiqueta", { texto: "afinidade: dispensa" }) : null,
      ]),
      controlesDeModo(ctx, alvo, "componentes de " + nome, "componente-" + elemento, pintarEstado),
      sit.modo === "posse" && !sit.itens.length
        ? el("label.r-marca.t-mini", {}, [
            el("input", {
              type: "checkbox", checked: alvo.tem, dataset: { foco: "componente-" + elemento + "-tem" },
              onchange: function (ev) { alvo.tem = ev.target.checked; feito(ctx, "componente-" + elemento + "-tem"); },
            }),
            el("span", { texto: "Tem componentes de " + nome + " (sem item no inventário)" }),
          ])
        : null,
    ]);
  }

  function linhaDeExtra(ctx, o, x) {
    var rotuloEstado = el("span.t-mini");
    function pintarEstado() { rotuloEstado.textContent = x.modo === "quantidade" ? x.quantidade + " " + x.unidade : (x.tem ? "tem" : "não tem"); }
    pintarEstado();
    return el("div.consumo-item", {}, [
      el("div.consumo-item__topo", {}, [
        el("span.consumo-item__nome", { texto: x.nome }),
        el("span.r-etiqueta", { texto: "da mesa" }),
        rotuloEstado,
        el("button.r-icone", {
          type: "button", "aria-label": "Tirar " + x.nome,
          onclick: function () {
            o.componentes.extras = o.componentes.extras.filter(function (y) { return y.id !== x.id; });
            feito(ctx, "componente-extra");
          },
        }, [UI.simbolo("x")]),
      ]),
      controlesDeModo(ctx, x, x.nome, "componente-" + x.id, pintarEstado),
      x.modo === "posse" ? el("label.r-marca.t-mini", {}, [
        el("input", { type: "checkbox", checked: x.tem, onchange: function (ev) { x.tem = ev.target.checked; feito(ctx); } }),
        el("span", { texto: "Tem" }),
      ]) : null,
    ]);
  }

  /* =================================================================
     USAR RITUAL
     -----------------------------------------------------------------
     Escolher a versão, ver o custo e o que vai ser gasto, confirmar.
     Consultar, aprender ou acrescentar um ritual nunca passa por aqui;
     rolar o dano depois não gasta de novo. Funciona para ritual sem
     rolagem (Coincidência Forçada) — e, se o efeito dele é conhecido,
     oferece registrá-lo na própria ficha.
     ================================================================= */

  function elementoDoRitual(ritual) {
    var d = RT() ? RT().dadosDoRitual(ritual) : (ritual.ordem || {});
    if (d.elemento) return d.elemento;
    var bruto = U.chaveDeBusca(ritual.elemento || "");
    var achado = ["sangue", "morte", "conhecimento", "energia", "medo"].filter(function (e) { return bruto === e; })[0];
    return achado || "";
  }

  function usarRitual(ctx, ritual) {
    var o = ordemDe(ctx);
    var inv = inventario(ctx);
    var c = R().calcular(o, inv);
    var comPd = !!c.determinacao;
    var recurso = comPd ? "pd" : "pe";
    var atual = comPd ? c.atual.pd : c.atual.pe;
    var controle = CS().ligada(o, "controleComponentes");
    var complexa = OPC() && OPC().ligada(o, "conjuracaoComplexa");
    var afinidade = afinidadeDe(o);
    var elemento = elementoDoRitual(ritual);
    var versoes = (ritual.versoes && ritual.versoes.length) ? ritual.versoes : [{ nome: "Normal" }];
    var custoPeExtra = 0;
    (c.efeitos ? c.efeitos.contextuais : []).forEach(function (x) { if (x.alvo === "custoPe") custoPeExtra += x.valor; });

    var efeito = efeitoConhecido(ritual);
    var estado = { versao: 0, gastar: true, dispensa: "", entregar: false, catalisador: "", emMim: false };
    var opId = novoOpId("ritual");
    var usado = false;
    var corpo = el("div.pilha--curta.consumo-confirmacao", { class: "pilha" });
    var janela = UI.modal({ titulo: "Usar " + ritual.nome, conteudo: [corpo] });

    function plano() {
      var v = versoes[estado.versao];
      var custo = RT() ? RT().custoDaVersao(ritual, v) : null;
      return {
        v: v,
        custo: custo,
        p: CS().planoDeRitual({
          elemento: elemento, afinidade: afinidade, controle: o.componentes, inventario: inv,
          controleLigado: controle, dispensa: estado.dispensa, entregar: complexa && estado.entregar,
          catalisadorId: estado.catalisador, custo: custo ? custo.total : 0, acrescimoPe: custoPeExtra,
        }),
      };
    }

    function pintar() {
      var pl = plano();
      var partes = [];
      if (versoes.length > 1) {
        partes.push(el("label.ordenacao", {}, [
          el("span.ordenacao__rotulo", { texto: "Versão" }),
          el("select.r-selecao", {
            onchange: function (ev) { estado.versao = Number(ev.target.value) || 0; pintar(); },
          }, versoes.map(function (v, i) {
            var cv = RT() ? RT().custoDaVersao(ritual, v) : null;
            return el("option", { value: String(i), selected: i === estado.versao, texto: v.nome + (cv ? " (" + cv.total + " PE)" : "") });
          })),
        ]));
      }
      if (pl.custo) {
        var total = pl.p.custo;
        var detalhes = [pl.custo.base + " do círculo"];
        if (pl.custo.adicional) detalhes.push("+" + pl.custo.adicional + " da versão");
        if (custoPeExtra) detalhes.push((custoPeExtra > 0 ? "+" : "") + custoPeExtra + " de condição (alquebrado)");
        if (estado.dispensa === "camuflar") detalhes.push("+2 de Camuflar Ocultismo");
        partes.push(el("label.r-marca", {}, [
          el("input", { type: "checkbox", checked: estado.gastar, onchange: function (ev) { estado.gastar = ev.target.checked; } }),
          el("span", { texto: "Gastar " + total + " " + recurso.toUpperCase() + " (" + detalhes.join(", ") + ") — " + recurso.toUpperCase() + " " + atual + " → " + (atual - total) }),
        ]));
        if (total > atual) partes.push(el("p.t-aviso", { texto: "Não há " + recurso.toUpperCase() + " suficientes para o custo." }));
      } else {
        partes.push(el("p.t-mini", { texto: "O custo deste ritual não está nos dados dele: registre o gasto à mão, nos recursos." }));
      }

      if (controle) {
        partes.push(el("p.t-mini", { texto: pl.p.exigencia.motivo }));
        if (pl.p.exigencia.precisa) {
          partes.push(el("label.ordenacao", {}, [
            el("span.ordenacao__rotulo", { texto: "Dispensa" }),
            el("select.r-selecao", { onchange: function (ev) { estado.dispensa = ev.target.value; pintar(); } },
              CS().DISPENSAS.map(function (d) { return el("option", { value: d.chave, texto: d.nome, selected: d.chave === estado.dispensa }); })),
          ]));
        }
        if (pl.p.situacao) {
          var s = pl.p.situacao;
          partes.push(el("p.t-mini", { texto: s.modo === "quantidade"
            ? "Componentes: " + s.quantidade + " " + s.unidade + " (regra da mesa)."
            : "Componentes: " + (s.tem ? "tem" : "não tem") + ". Pelo livro, não se gastam." }));
        }
        if (complexa && pl.p.exigencia.precisa && !estado.dispensa) {
          partes.push(el("label.r-marca", {}, [
            el("input", { type: "checkbox", checked: estado.entregar, onchange: function (ev) { estado.entregar = ev.target.checked; pintar(); } }),
            el("span", { texto: "Entregar os componentes à entidade: eles se perdem, +1 dado no teste de Ocultismo (Conjuração Complexa, SAH p. 115)" }),
          ]));
        }
        var cats = elemento && elemento !== "medo" ? CS().catalisadores(inv, elemento) : [];
        if (cats.length) {
          partes.push(el("label.ordenacao", {}, [
            el("span.ordenacao__rotulo", { texto: "Catalisador" }),
            el("select.r-selecao", { onchange: function (ev) { estado.catalisador = ev.target.value; pintar(); } },
              [el("option", { value: "", texto: "Nenhum" })].concat(cats.map(function (x) {
                return el("option", { value: x.id, selected: x.id === estado.catalisador, texto: x.nome + " (é gasto)" });
              }))),
          ]));
        }
        pl.p.avisos.forEach(function (a) { partes.push(el("p.t-aviso", { texto: a })); });
        var gasta = [];
        if (pl.p.consumirComponentes && pl.p.situacao) {
          gasta.push("componentes de " + (CS().NOMES_ELEMENTOS[elemento] || elemento) + ", " + pl.p.consumirComponentes + " de " +
            pl.p.situacao.quantidade + " " + pl.p.situacao.unidade + " (regra da mesa)");
        }
        if (pl.p.consumirItem) gasta.push(pl.p.consumirItem.nome);
        if (pl.p.consumirCatalisador) gasta.push(pl.p.consumirCatalisador.nome);
        partes.push(el("p.consumo-confirmacao__gasto", { texto: gasta.length ? "Será gasto: " + gasta.join(", ") + "." : "Nenhum componente será gasto." }));
      }

      if (elemento === "medo") {
        partes.push(el("p.t-mini", { texto: "Ritual de Medo: cada conjuração custa Sanidade permanente e dano mental (OPRPG p. 119). Isso não é descontado aqui — registre na ficha." }));
      }
      if (efeito) {
        partes.push(el("label.r-marca", {}, [
          el("input", { type: "checkbox", checked: estado.emMim, dataset: { foco: "usar-ritual-em-mim" }, onchange: function (ev) { estado.emMim = ev.target.checked; } }),
          el("span", { texto: "Registrar o efeito em " + (ctx.ficha.nome || "mim") + " (se este personagem for o alvo). Em outro personagem, quem registra é o alvo ou o mestre." }),
        ]));
      }

      partes.push(el("div.faixa.consumo-confirmacao__botoes", {}, [
        el("button.r-botao.r-botao--principal", {
          type: "button", texto: "Usar ritual", dataset: { foco: "usar-ritual-confirmar" },
          onclick: function () { concluir(pl); },
        }),
        el("button.r-botao.r-botao--fantasma", { type: "button", texto: "Cancelar", onclick: function () { janela.fechar(); } }),
      ]));
      U.trocar(corpo, partes);
    }

    /* O uso confirmado: gasta o que a pessoa viu e marcou, uma vez só.
       O mesmo opId, se o clique se repetir, não gasta de novo. */
    function concluir(pl) {
      if (usado) return;
      usado = true;
      var r = CS().aplicarRitual(o, inv, ritual.nome, pl.p, {
        gastar: estado.gastar && !!pl.custo, recurso: recurso, atual: atual, elemento: elemento, versao: pl.v.nome,
      }, opId);
      if (!r.ok) { usado = false; UI.avisoAtencao(r.motivo); return; }
      var registro = "";
      if (!r.repetido && efeito && estado.emMim) registro = registrarEfeito(ctx, ritual, efeito, pl.v.nome);
      janela.fechar();
      if (!r.repetido) ctx.alterou();
      ctx.redesenhar();
      var gasto = r.partes && r.partes.length ? "Gasto: " + r.partes.join("; ") + "." : "Nenhum gasto registrado.";
      UI.avisoOk(ritual.nome + " (" + pl.v.nome + ") usado. " + gasto + (registro ? " " + registro : ""), { duracao: 7000 });
    }

    pintar();
  }

  function efeitoConhecido(ritual) {
    if (!EF()) return null;
    var id = ritual.origemCatalogoId || "";
    return id && EF().ritualComEfeito(id) ? { id: id, dados: EF().ritualComEfeito(id) } : null;
  }

  /* Registra o efeito estruturado do ritual nesta ficha. O mesmo ritual
     não se soma a si mesmo: na mesma versão, a aplicação é renovada; em
     outra versão, a anterior é encerrada e a nova entra. */
  function registrarEfeito(ctx, ritual, efeito, versao) {
    var o = ordemDe(ctx);
    var mods = efeito.dados.versoes[versao] || efeito.dados.versoes.Normal || [];
    var dur = EF().duracaoDoRitual(ritual.duracao) || { tipo: "cena" };
    var ag = global.RAMAAuth && global.RAMAAuth.agente ? global.RAMAAuth.agente() : null;
    var inst = EF().criarInstancia({
      modelo: "ritual:" + efeito.id, nome: ritual.nome, versao: versao,
      descricao: U.texto(ritual.efeito || ritual.descricao || "").slice(0, 1000),
      origem: { tipo: "ritual", nome: ritual.nome }, modificadores: JSON.parse(JSON.stringify(mods)),
      acumula: !!efeito.dados.acumulaComRituais, duracao: dur, alvoNome: ctx.ficha.nome, cena: o.condicoes.cena.id,
      aplicadoPor: { id: ag ? ag.id : "", nome: ag ? (ag.nome || ag.usuario || "") : "", papel: ctx.ehDono && !ctx.ehDono() ? "mestre" : "jogador" },
    });
    var av = EF().avaliarAplicacao(o.condicoes, inst);
    var modo = "nova";
    if (av.ok && av.conflito) {
      if (av.conflito.existente.versao === versao) modo = "renovar";
      else EF().encerrar(o.condicoes, av.conflito.existente.id, "manual", inst.aplicadoPor.nome || "");
    }
    var r = EF().aplicar(o.condicoes, inst, modo);
    if (!r.ok) return "O efeito não foi registrado: " + r.motivo;
    return r.acao === "renovada" ? "Efeito renovado nas condições." : "Efeito registrado nas condições.";
  }

  global.RAMASecaoConsumo = {
    painelMunicao: painelMunicao,
    painelComponentes: painelComponentes,
    confirmarAtaque: confirmarAtaque,
    usarRitual: usarRitual,
    elementoDoRitual: elementoDoRitual,
  };
})(window);
