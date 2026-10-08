/* =====================================================================
   R.A.M.A. — ficha · perícias
   ---------------------------------------------------------------------
   A perícia é o exemplo puro de rolagem dependente: ela não tem dado
   próprio. Rola o dado do atributo vinculado, pega o principal e só
   nele aplica o que é seu — bônus fixo, bônus temporário e os dados
   extras.

   O nome sempre aparece com a sigla do atributo ao lado. ACROBACIA
   sozinho não diz por qual dado ela rola; ACROBACIA (AGI) diz.

   Trocar o atributo de uma perícia é mexer na estrutura da ficha, e
   por isso só acontece no modo edição. Sobrevivência é a exceção
   prevista: ela aceita Intelecto ou Presença, e cada ficha escolhe o
   seu — a escolha continua sendo de edição, mas a lista já vem
   limitada aos dois.

   FÓRMULA (v2.43). Outros sistemas contam os dados de outro jeito: o
   atributo como quantidade, metade dele mais alguma coisa. A perícia
   pode ter uma fórmula ("(@FOR/2+1)d6 + @INT") que substitui o dado do
   atributo, e então o atributo vinculado é opcional. Bônus, temporário
   e dados extras somam por cima, como sempre. A conta é do motor de
   dados (js/dados.js); aqui só se escreve e se mostra.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var F = global.RAMAFicha;
  var V = global.RAMAValidacao;
  var D = global.RAMADados;
  var el = U.el;

  function aba(ctx) {
    return el("div.pilha--larga", { class: "pilha" }, [
      UI.painel("Perícias", corpo(ctx), {
        acoes: ctx.emEdicao() ? [
          el("button.r-botao.r-botao--mini", {
            type: "button", texto: "Adicionar perícia", onclick: function () { nova(ctx); },
          }),
        ] : null,
      }),
    ]);
  }

  function corpo(ctx) {
    var pericias = ctx.ficha.pericias || [];

    if (!pericias.length) {
      return UI.vazio({
        titulo: "Nenhuma perícia",
        texto: ctx.emEdicao()
          ? "Acrescente perícias para esta ficha."
          : "Entre no modo edição para acrescentar perícias.",
      });
    }

    var ordenadas = ordenar(ctx);
    var barra = barraDeOrdem(ctx);

    if (ctx.emEdicao()) {
      var arrastar = modoDe(ctx) === "personalizada" && !!global.RAMAArrastar && !!global.RAMAOrganizar;
      var lista = el("div.pilha--curta", { class: "pilha", dataset: { arrastarLista: "pericias" } }, ordenadas.map(function (p) {
        var cartao = emEdicao(ctx, p, arrastar);
        cartao.dataset.arrastarItem = p.id;
        cartao.dataset.arrastarRotulo = p.nome;
        return cartao;
      }));
      if (arrastar) ligarArraste(ctx, lista, ordenadas.map(function (p) { return p.id; }));
      return el("div.pilha--curta", { class: "pilha" }, [barra, lista]);
    }

    return el("div.pilha--curta", { class: "pilha" }, [
      barra,
      el("div.pericias", {}, ordenadas.map(function (p) { return normal(ctx, p); })),
    ]);
  }

  /* =================================================================
     ORDEM (v2.42) — a mesma escolha da ficha de Ordem
     -----------------------------------------------------------------
     Alfabética (o padrão: procurar "Percepção" é a operação mais
     frequente da aba), pelo bônus — o mesmo número que o botão mostra,
     bônus fixo + temporário, sem os dados extras — ou personalizada. A
     personalizada é a ordem da própria lista `pericias`: arrastar mexe
     só nela, e trocar de modo não a perde. Empate desempata pelo nome.
     ================================================================= */

  var ROTULOS_DE_ORDEM = {
    az: "Alfabética",
    maior: "Maior bônus primeiro",
    menor: "Menor bônus primeiro",
    personalizada: "Personalizada",
  };

  function organizacao(ctx) {
    if (!ctx.ficha.organizacao || typeof ctx.ficha.organizacao !== "object") ctx.ficha.organizacao = F.normalizarOrganizacao(null);
    if (!ctx.ficha.organizacao.pericias) ctx.ficha.organizacao.pericias = F.normalizarOrganizacao(null).pericias;
    return ctx.ficha.organizacao.pericias;
  }

  function modoDe(ctx) {
    var m = organizacao(ctx).modo;
    return F.MODOS_DE_PERICIA.indexOf(m) >= 0 ? m : "az";
  }

  function ordenar(ctx) {
    var modo = modoDe(ctx);
    var pericias = ctx.ficha.pericias || [];
    if (modo === "personalizada") return pericias.slice();
    var nome = function (a, b) {
      return U.compararNomes(a.nome, b.nome) || (a.id < b.id ? -1 : (a.id > b.id ? 1 : 0));
    };
    if (modo === "maior" || modo === "menor") {
      var sinal = modo === "maior" ? -1 : 1;
      return pericias.slice().sort(function (a, b) {
        return (sinal * (F.bonusDaPericia(a) - F.bonusDaPericia(b))) || nome(a, b);
      });
    }
    return pericias.slice().sort(nome);
  }

  function definirModo(ctx, modo) {
    var org = organizacao(ctx);
    if (org.modo === modo || F.MODOS_DE_PERICIA.indexOf(modo) < 0) return;
    org.modo = modo;
    ctx.alterou();
    ctx.redesenhar();
    var s = document.querySelector('[data-foco="ordem-pericias-universal"]');
    if (s) s.focus();
  }

  /* A primeira vez na personalizada começa da ordem que está na tela,
     para nada pular. Uma personalizada já arrumada nunca é tocada: ela
     só existe enquanto alguém arrastou. */
  function usarPersonalizada(ctx) {
    var org = organizacao(ctx);
    if (!org.arrumada) {
      ctx.ficha.pericias = ordenar(ctx);
      org.arrumada = true;
    }
    definirModo(ctx, "personalizada");
  }

  function barraDeOrdem(ctx) {
    var modo = modoDe(ctx);
    var id = "ordem-pericias-" + U.uuid().slice(0, 6);
    return el("div.pilha--curta", { class: "pilha" }, [
      el("div.ordenacao-barra", {}, [
        el("span.ordenacao", {}, [
          el("label.ordenacao__rotulo", { for: id, texto: "Ordenar" }),
          el("select.r-selecao.ordenacao__selecao", {
            id: id,
            dataset: { foco: "ordem-pericias-universal" },
            onchange: function (ev) {
              if (ev.target.value === "personalizada") usarPersonalizada(ctx);
              else definirModo(ctx, ev.target.value);
            },
          }, F.MODOS_DE_PERICIA.map(function (m) {
            return el("option", { value: m, selected: m === modo, texto: ROTULOS_DE_ORDEM[m] });
          })),
        ]),
      ]),
      ctx.emEdicao()
        ? (modo === "personalizada"
            ? el("span.t-mini", { texto: "Arraste pela alça para mudar esta ordem — ou, com o foco na alça, use ↑ e ↓." })
            : el("div.ordenacao-arrastar", {}, [
                el("span.t-mini", { texto: "Esta ordem é automática. Para arrastar, use a ordem personalizada — a guardada continua como estava." }),
                el("button.r-botao.r-botao--mini", {
                  type: "button", texto: "Usar ordem personalizada",
                  onclick: function () { usarPersonalizada(ctx); },
                }),
              ]))
        : null,
    ]);
  }

  /* Arrastar muda só a posição na lista `pericias`: nome, bônus,
     atributo e dados extras não são tocados. */
  function ligarArraste(ctx, lista, ids) {
    var O = global.RAMAOrganizar;
    function aplicar(mudou) {
      if (!mudou) return false;
      organizacao(ctx).arrumada = true;
      ctx.alterou();
      ctx.redesenhar();
      return true;
    }
    global.RAMAArrastar.ligar(lista, {
      podeSoltar: function () { return { ok: true }; },
      aoSoltar: function (item, destino) { aplicar(O.reposicionar(ctx.ficha.pericias, item.id, destino.indice, ids)); },
      aoTeclado: function (item, direcao) {
        if (!aplicar(O.passo(ctx.ficha.pericias, item.id, direcao, ids))) {
          return { ok: false, motivo: direcao < 0 ? "Já é a primeira." : "Já é a última." };
        }
        return { ok: true };
      },
    });
  }

  /* =================================================================
     MODO NORMAL — um clique, uma rolagem
     ================================================================= */

  function normal(ctx, p) {
    var atributo = F.atributoDaPericia(ctx.ficha, p);
    var bonus = F.bonusDaPericia(p);
    var extras = (p.dadosExtras || []);
    var formula = F.temFormula(p);
    var previa = formula ? F.previaDaPericia(ctx.ficha, p) : null;
    var titulo = formula
      ? (previa.ok ? "Rola " + previa.texto + " (fórmula: " + p.formula + ")" : "Fórmula com erro: " + previa.mensagem)
      : (atributo ? "Rola " + atributo.dado + " de " + atributo.nome : "Sem atributo e sem fórmula");

    return el("button.pericia", {
      type: "button",
      class: formula && !previa.ok ? "pericia--erro" : "",
      "aria-label": "Rolar " + p.nome + (formula ? ", " + (previa.ok ? previa.texto : "fórmula com erro") : (atributo ? ", atributo " + atributo.nome : "")),
      title: titulo,
      onclick: function () { rolar(ctx, p); },
    }, [
      el("span.pericia__nome", {}, [
        el("span", { texto: p.nome }),
        el("span.pericia__attr", {
          texto: formula ? "(" + (previa.ok ? previa.texto : "fórmula com erro") + ")" : "(" + (atributo ? atributo.sigla : "—") + ")",
        }),
      ]),
      el("span.pericia__bonus", {
        class: bonus === 0 && !extras.length ? "pericia__bonus--zero" : "",
        texto: rotuloDoBonus(bonus, extras),
      }),
    ]);
  }

  function rotuloDoBonus(bonus, extras) {
    var partes = [U.comSinal(bonus)];
    extras.forEach(function (m) { partes.push((m.operacao === "-" ? "−" : "+") + m.dado); });
    return partes.join(" ");
  }

  function rolar(ctx, p) {
    var r = F.rolarPericia(ctx.ficha, p);
    if (!r.ok) {
      UI.avisoErro(F.temFormula(p) ? p.nome + ": " + r.mensagem : r.mensagem);
      return;
    }
    var atributo = F.atributoDaPericia(ctx.ficha, p);
    global.RAMARolagens.mostrar(r, { nome: p.nome + (atributo ? " (" + atributo.sigla + ")" : "") });
  }

  /* =================================================================
     MODO EDIÇÃO
     ================================================================= */

  function emEdicao(ctx, p, arrastar) {
    var permitidos = p.atributosPermitidos && p.atributosPermitidos.length > 1
      ? ctx.ficha.atributos.filter(function (a) { return p.atributosPermitidos.indexOf(a.id) >= 0; })
      : ctx.ficha.atributos;

    return el("div.pericia-edicao", {}, [
      arrastar
        ? el("div.pericia-edicao__mover", {}, [
            global.RAMAArrastar.alca({ id: p.id, rotulo: p.nome }),
            el("span.t-mini", { texto: p.nome }),
          ])
        : null,
      el("div.pericia-edicao__linha", {}, [
        UI.campo({
          rotulo: "Perícia", valor: p.nome, limite: 60,
          aoMudar: function (v) { p.nome = U.aparar(v, 60) || p.nome; ctx.alterou(); },
        }),
        UI.campo({
          rotulo: "Bônus", tipo: "numero", valor: p.bonus,
          aoMudar: function (v, entrada) {
            var r = V.bonus(v);
            if (!r.ok) { entrada.value = String(p.bonus); UI.avisoErro(r.mensagem); return; }
            p.bonus = r.valor; ctx.alterou();
          },
        }),
        UI.campo({
          rotulo: "Temporário", tipo: "numero", valor: p.bonusTemporario,
          aoMudar: function (v, entrada) {
            var r = V.bonus(v);
            if (!r.ok) { entrada.value = String(p.bonusTemporario); UI.avisoErro(r.mensagem); return; }
            p.bonusTemporario = r.valor; ctx.alterou();
          },
        }),
        el("button.r-icone", {
          type: "button", "aria-label": "Remover " + p.nome,
          onclick: function () { remover(ctx, p); },
        }, [UI.simbolo("lixeira")]),
      ]),

      UI.campo({
        rotulo: "Atributo vinculado",
        tipo: "selecao",
        valor: p.atributoId || "",
        opcoes: [{ valor: "", rotulo: "Nenhum (só a fórmula)" }].concat(permitidos.map(function (a) {
          return { valor: a.id, rotulo: a.nome + " (" + a.sigla + ")" };
        })),
        aoMudar: function (v) { p.atributoId = v || null; ctx.alterou(); ctx.redesenhar(); },
      }),

      p.atributosPermitidos && p.atributosPermitidos.length > 1
        ? el("p.t-mini", { texto: "Esta perícia aceita mais de um atributo. Escolha o que vale nesta ficha." })
        : null,

      campoDaFormula(ctx, p),

      dadosExtras(ctx, p),
    ]);
  }

  /* =================================================================
     FÓRMULA DOS DADOS (v2.43)
     -----------------------------------------------------------------
     Vazia, a perícia rola o dado do atributo vinculado — o de sempre.
     Escrita, ela manda: a prévia mostra a conta com os valores de agora
     ("3d6 + 2"), e o erro aparece embaixo do campo, sem apagar o que foi
     digitado. A prévia acompanha a digitação; gravar é no "change".
     ================================================================= */

  var AJUDA_DA_FORMULA = "Vazia: rola o dado do atributo. Exemplos: @FOR d6 (o valor de FOR como quantidade) · " +
    "(@FOR/2 + 1)d6 + @INT · teto(@AGI/2)d10 · 1d20 + @{Nome do atributo}. Funções: piso, teto, arred, min, max, abs. " +
    "Divisões arredondam para baixo no fim.";

  var ROTULOS_DE_CONTAGEM = {
    soma: "Somar todos os dados",
    maior: "Valer o maior dado (do primeiro grupo)",
    menor: "Valer o menor dado (do primeiro grupo)",
  };

  function campoDaFormula(ctx, p) {
    var previa = el("p.t-mini.pericia-edicao__previa", { "aria-live": "polite" });
    var campo = UI.campo({
      rotulo: "Fórmula dos dados (opcional)",
      valor: p.formula || "",
      limite: D.MAX_FORMULA,
      dica: "ex.: (@FOR/2 + 1)d6 + @INT",
      ajuda: AJUDA_DA_FORMULA,
      aoMudar: function (v) {
        var antes = !!U.aparar(p.formula);
        p.formula = U.aparar(v, D.MAX_FORMULA);
        ctx.alterou();
        /* Ligar ou desligar a fórmula muda o resto do bloco. */
        if (antes !== !!p.formula) ctx.redesenhar();
      },
    });
    campo.entrada.setAttribute("spellcheck", "false");
    campo.entrada.setAttribute("autocapitalize", "off");

    function atualizar() {
      var texto = U.aparar(campo.entrada.value);
      if (!texto) {
        campo.marcarErro("");
        previa.textContent = !p.atributoId ? "Sem atributo e sem fórmula, esta perícia não rola." : "";
        previa.classList.toggle("t-erro", !p.atributoId);
        return;
      }
      var r = D.previaDaFormula(texto, function (n) { return F.valorDeReferencia(ctx.ficha, n); });
      var semDado = r.ok && !r.dados;
      campo.marcarErro(r.ok ? (semDado ? "A fórmula precisa ter pelo menos um dado (por exemplo, 1d20)." : "") : r.mensagem);
      previa.classList.remove("t-erro");
      previa.textContent = r.ok && !semDado ? "Com os valores de agora: " + r.texto : "";
    }
    campo.entrada.addEventListener("input", atualizar);
    atualizar();

    var partes = [campo, previa];
    if (U.aparar(p.formula)) {
      partes.push(UI.campo({
        rotulo: "Como os dados contam",
        tipo: "selecao",
        valor: D.contagemValida(p.contagem),
        opcoes: D.CONTAGENS.map(function (c) { return { valor: c, rotulo: ROTULOS_DE_CONTAGEM[c] }; }),
        ajuda: "“Maior” e “menor” elegem um dado do primeiro grupo da fórmula (como 2d20 de atributo) e decidem o crítico; os outros dados somam.",
        aoMudar: function (v) { p.contagem = D.contagemValida(v); ctx.alterou(); },
      }));
    }
    return el("div.pilha--curta", { class: "pilha" }, partes);
  }

  /* =================================================================
     DADOS EXTRAS
     -----------------------------------------------------------------
     Cada modificador é guardado inteiro e separado — operação e
     expressão — e não achatado num texto tipo "+1d6-1d4". Achatado,
     seria preciso reinterpretar a string toda vez que alguém quisesse
     tirar só um deles.
     ================================================================= */

  function dadosExtras(ctx, p) {
    var lista = p.dadosExtras || [];

    return el("div.r-campo", {}, [
      el("span.r-rotulo", { texto: "Dados extras" }),
      el("div.dados-extras", {}, lista.map(function (m) {
        return el("span.dado-extra", {
          class: m.operacao === "-" ? "dado-extra--menos" : "dado-extra--mais",
        }, [
          el("span", { texto: (m.operacao === "-" ? "−" : "+") + m.dado }),
          el("button.r-icone", {
            type: "button",
            estilo: { width: "20px", height: "20px" },
            "aria-label": "Remover dado extra " + m.dado,
            onclick: function () {
              p.dadosExtras = p.dadosExtras.filter(function (x) { return x.id !== m.id; });
              ctx.alterou();
              ctx.redesenhar();
            },
          }, [UI.simbolo("x", 12)]),
        ]);
      }).concat([
        el("button.r-botao.r-botao--mini", {
          type: "button", texto: "+ Dado",
          onclick: function () { acrescentarDado(ctx, p); },
        }),
      ])),
      el("p.r-ajuda", { texto: "Rolados junto com a perícia e somados (ou subtraídos) do resultado principal." }),
    ]);
  }

  async function acrescentarDado(ctx, p) {
    var operacao = "+";

    var expressao = UI.campo({ rotulo: "Expressão", valor: "1d6", limite: 12, dica: "1d6, 2d4…" });

    var alternar = el("div.modo", {}, ["+", "-"].map(function (op) {
      return el("button.modo__opcao", {
        type: "button",
        texto: op === "+" ? "Somar" : "Subtrair",
        "aria-pressed": String(op === operacao),
        onclick: function (ev) {
          operacao = op;
          U.$$(".modo__opcao", ev.target.parentNode).forEach(function (b) {
            b.setAttribute("aria-pressed", String(b === ev.target));
          });
        },
      });
    }));

    UI.modal({
      titulo: "Dado extra",
      conteudo: [
        el("div.r-campo", {}, [el("span.r-rotulo", { texto: "Operação" }), alternar]),
        expressao,
        el("p.t-mini", { texto: "Todos os dados desta expressão são somados entre si, e o resultado entra no total da perícia." }),
      ],
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        {
          rotulo: "Acrescentar",
          classe: "r-botao--principal",
          aoClicar: function (fechar) {
            var r = V.dado(expressao.entrada.value);
            if (!r.ok) { expressao.marcarErro(r.mensagem); return; }

            if (!Array.isArray(p.dadosExtras)) p.dadosExtras = [];
            p.dadosExtras.push({ id: U.uuid(), operacao: operacao, dado: r.valor });

            ctx.alterou();
            fechar();
            ctx.redesenhar();
          },
        },
      ],
    });
  }

  /* =================================================================
     CRIAR E REMOVER
     ================================================================= */

  function nova(ctx) {
    if (!ctx.ficha.atributos.length) {
      UI.avisoErro("Crie um atributo antes de acrescentar perícias.");
      return;
    }
    ctx.ficha.pericias.push({
      id: U.uuid(),
      natureza: F.NATUREZA.DEPENDENTE,
      nome: "Nova perícia",
      atributoId: ctx.ficha.atributos[0].id,
      bonus: 0,
      bonusTemporario: 0,
      dadosExtras: [],
      formula: "",
      contagem: "soma",
    });
    ctx.alterou();
    ctx.redesenhar();
  }

  async function remover(ctx, p) {
    var certeza = await UI.confirmar({
      titulo: "Remover " + p.nome + "?",
      texto: "A perícia será removida desta ficha.",
      detalhe: "Esta ação não pode ser desfeita.",
      rotuloConfirmar: "Remover",
      perigo: true,
    });
    if (!certeza) return;

    ctx.ficha.pericias = ctx.ficha.pericias.filter(function (x) { return x.id !== p.id; });
    ctx.alterou();
    ctx.redesenhar();
  }

  global.RAMASecaoPericias = { aba: aba, rolar: rolar };
})(window);
