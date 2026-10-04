/* =====================================================================
   R.A.M.A. — painel de criatura
   ---------------------------------------------------------------------
   A consulta compartilhada: combate, aliados, biblioteca e Homebrew
   desenham a criatura por aqui, com o mesmo modelo (js/criaturas.js),
   o mesmo motor de dados e o mesmo mostrador com histórico.

   criar(criatura, {
     nome, rotulo, aviso, tipo,
     consulta          só leitura: sem rolagem e sem controles (biblioteca)
     permitirRolagem   false desliga as rolagens
     aoStatus(id, v)   vida, esforço e outros status DESTA ocorrência
     aoInstancia(chave, valor)
                       estado de fase, uso, marcador, Enigma, anotação —
                       o formato de RAMACriaturas.definirNaInstancia
     aoIniciativa(total)  combate: o resultado vira iniciativa SÓ quando
                       o mestre clica em "Usar na ordem"
     resultadosLocais  repete o cartão da rolagem dentro do painel
   })

   ---------------------------------------------------------------------
   CONSULTA, ROLAGEM E APLICAÇÃO SÃO TRÊS COISAS
   ---------------------------------------------------------------------

     consulta   ler a ficha. Nunca muda nada
     rolagem    sortear pelo motor e mostrar quem rolou o quê; o
                resultado sobe para o histórico pelo funil de sempre
                (RAMARolagens → RAMAHistorico), com a visibilidade da mesa
     aplicação  mudar um número da OCORRÊNCIA (vida, estado, uso,
                Enigma) — sempre por um controle que o mestre acionou.
                Nenhum dano é descontado de alvo nenhum, nenhuma condição
                é aplicada a outro ser e nenhum bloqueio ou esquiva é
                rolado sozinho.
   ===================================================================== */
(function (global) {
  "use strict";
  var U = global.RAMAUtil, UI = global.RAMAUI, el = U.el;
  function C() { return global.RAMACriaturas; }
  function D() { return global.RAMADados; }
  function OC() { return global.RAMAOrdemCriaturas; }

  var NOMES_ACAO = { padrao: "Padrão", movimento: "Movimento", completa: "Completa", livre: "Livre", reacao: "Reação" };
  var ORDEM_ACOES = ["padrao", "movimento", "completa", "livre", "reacao"];
  var NOMES_ELEMENTO = { sangue: "Sangue", morte: "Morte", conhecimento: "Conhecimento", energia: "Energia", medo: "Medo" };
  var NOMES_NATUREZA = { paranormal: "Paranormal", humana: "Pessoa", animal: "Animal" };
  var NOMES_DEFESA = { percepcao: "Percepção", iniciativa: "Iniciativa", fortitude: "Fortitude", reflexos: "Reflexos", vontade: "Vontade" };

  function criar(criatura, opcoes) {
    if (C().ehOrdem(criatura)) return criarOrdem(criatura, opcoes || {});
    return criarUniversal(criatura, opcoes || {});
  }

  /* O cartão da rolagem, pelo mostrador de sempre. */
  function mostrar(o, nome, rotulo, resultado, extra) {
    if (!global.RAMARolagens) return null;
    if (!resultado || !resultado.ok) { UI.avisoErro("Confira os dados desta rolagem."); return null; }
    var x = extra || {};
    return global.RAMARolagens.mostrar(resultado, {
      nome: nome + " · " + rotulo, tipo: o.tipo || "criatura", critico: !!x.critico,
      notas: x.notas || [], acoes: x.acoes || [],
    });
  }

  /* =================================================================
     UNIVERSAL — a mini ficha de sempre
     ================================================================= */

  function criarUniversal(criatura, o) {
    var c = C().normalizar(criatura);
    var nome = o.nome || c.nome;
    var controles = {};
    var resultados = el("div.pilha", { "aria-live": "polite", "aria-label": "Resultado da rolagem" });
    var rolaveis = o.permitirRolagem !== false && !o.consulta;

    var status = c.status.length ? UI.painel("Status", el("div.editar-grade", {}, c.status.map(function (s) {
      if (!o.aoStatus) {
        return el("div.painel-numero", {}, [el("span.t-rotulo", { texto: s.nome }), el("span.t-forte", { texto: s.atual + " / " + s.maximo })]);
      }
      var passo = UI.passo({
        valor: s.atual, minimo: 0, maximo: s.maximo > 0 ? s.maximo : 999999,
        rotulo: s.nome + " de " + nome,
        aoMudar: function (v) { if (o.aoStatus) o.aoStatus(s.id, v); },
      });
      controles[s.id] = passo;
      return el("div.painel-numero", {}, [
        el("span.t-rotulo", { texto: s.nome + " / " + s.maximo }),
        passo,
      ]);
    }))) : null;

    function rolar(rotulo, resultado, critico) {
      if (!rolaveis) return;
      var cartao = mostrar(o, nome, rotulo, resultado, { critico: critico });
      // O mesmo resultado/histórico, visível dentro da janela de consulta.
      if (o.resultadosLocais && cartao) {
        var secao = document.activeElement && document.activeElement.closest(".r-painel");
        (secao && corpo.contains(secao) ? secao : corpo).appendChild(resultados);
        U.trocar(resultados, [cartao]);
        resultados.scrollIntoView({ block: "nearest" });
      }
    }

    var corpo = el("div.pilha.criatura-painel", {}, [
      el("div.criatura-painel__topo", {}, [
        el("p.t-secao", { texto: nome }),
        el("span.r-etiqueta", { texto: o.rotulo || "Criatura" }),
      ]),
      el("p.t-mini", { texto: o.aviso || (o.consulta ? "Consulta: nada aqui muda a criatura." : "Esta cópia tem estado próprio. Alterações não modificam a biblioteca nem outras cópias.") }),

      status,

      c.atributos.length ? UI.painel("Atributos", el("div.atributos", {}, c.atributos.map(function (a) {
        return el("div.atributo", {}, [
          el("button.atributo__caixa", {
            type: "button", disabled: !rolaveis,
            "aria-label": "Rolar " + a.nome + ", " + a.dado,
            onclick: function () {
              var r = D().rolar(a.dado);
              if (!r.ok) { UI.avisoErro("Dado inválido: " + a.dado); return; }
              rolar(a.nome, {
                ok: true, tipo: "atributo", expressao: r.expressao, rolagens: r.rolagens,
                natural: r.principal, total: r.principal, parcelas: [],
              });
            },
          }, [
            el("span.atributo__sigla", { texto: a.sigla }),
            el("span.atributo__valor", { texto: String(a.valor) }),
            el("span.atributo__dado", { texto: a.dado }),
          ]),
        ]);
      }))) : null,

      c.pericias.length ? UI.painel("Perícias", el("div.pericias", {}, c.pericias.map(function (p) {
        return el("button.pericia", {
          type: "button", disabled: !rolaveis,
          "aria-label": "Rolar " + p.nome,
          onclick: function () { rolar(p.nome, D().dependente(C().pedidoDePericia(c, p))); },
        }, [
          el("span.pericia__nome", { texto: p.nome }),
          el("span.pericia__bonus", { texto: U.comSinal(p.bonus + p.bonusTemporario) }),
        ]);
      }))) : null,

      c.ataques.length ? UI.painel("Ataques", el("div.pilha--curta", { class: "pilha" }, c.ataques.map(function (a) {
        return el("div.item", {}, [
          el("p.item__nome", { texto: a.nome }),
          a.descricao ? el("p", { texto: a.descricao }) : null,
          el("dl.r-dados", {}, [
            el("dt", { texto: "Dano" }),
            el("dd", { texto: (a.dano || "—") + (a.danoExtra ? " + " + a.danoExtra : "") }),
            el("dt", { texto: "Crítico" }),
            el("dd", { texto: a.critico ? a.critico + " / x" + a.multiplicador : "—" }),
          ]),
          rolaveis ? el("div.item__acoes", {}, [
            el("button.r-botao.r-botao--mini", {
              type: "button", texto: "Ataque",
              onclick: function () {
                var r = D().dependente(C().pedidoDeAtaque(c, a));
                rolar(a.nome + " · Ataque", r, D().ehCritico(r.natural, a.critico));
              },
            }),
            el("button.r-botao.r-botao--mini", {
              type: "button", texto: "Dano", disabled: !a.dano,
              onclick: function () {
                rolar(a.nome + " · Dano", D().dano({
                  nome: a.nome, dano: a.dano, danoExtra: a.danoExtra,
                  critico: false, multiplicador: a.multiplicador,
                }));
              },
            }),
            a.critico ? el("button.r-botao.r-botao--mini", {
              type: "button", texto: "Dano crítico", disabled: !a.dano,
              onclick: function () {
                rolar(a.nome + " · Dano crítico", D().dano({
                  nome: a.nome, dano: a.dano, danoExtra: a.danoExtra, critico: true, multiplicador: a.multiplicador,
                }), true);
              },
            }) : null,
          ]) : null,
        ]);
      }))) : null,

      c.habilidades.length ? UI.painel("Habilidades",
        el("div.pilha--curta", { class: "pilha" }, c.habilidades.map(function (h) {
          return UI.recolhivel({ titulo: h.nome, extra: h.origem, conteudo: [el("p", { texto: h.texto })] });
        }))
      ) : null,

      c.descricao ? UI.painel("Descrição", el("p", { texto: c.descricao, estilo: { whiteSpace: "pre-wrap" } })) : null,
    ]);

    return {
      titulo: nome,
      raiz: corpo,
      /* Mudança vinda de fora (outra aba) ou confirmada pelo servidor: o
         número acompanha, a menos que a pessoa esteja digitando nele. */
      atualizar: function (nova) {
        var snap = C().normalizar(nova);
        snap.status.forEach(function (s) {
          var passo = controles[s.id];
          if (!passo) return;
          var campo = U.$(".r-passo__valor", passo);
          if (campo && document.activeElement === campo) return;
          if (passo.valor() !== s.atual) passo.definir(s.atual);
        });
      },
    };
  }

  /* =================================================================
     ORDEM PARANORMAL — a ficha de ameaça
     ================================================================= */

  function criarOrdem(criatura, o) {
    var atual = C().normalizar(criatura);
    var nome = o.nome || atual.nome;
    var rolaveis = o.permitirRolagem !== false && !o.consulta && !!global.RAMARolagens;
    var instancia = !o.consulta && !!(o.aoStatus || o.aoInstancia);
    var raiz = el("div.pilha.criatura-painel.criatura-ordem");
    var resultados = el("div.pilha", { "aria-live": "polite", "aria-label": "Resultado da rolagem" });
    var abertos = {};
    var pendente = false;

    /* ---------- rolagens ---------- */

    function rolar(rotulo, resultado, extra) {
      if (!rolaveis) return null;
      var cartao = mostrar(o, nome, rotulo, resultado, extra);
      if (o.resultadosLocais && cartao) {
        raiz.appendChild(resultados);
        U.trocar(resultados, [cartao]);
        resultados.scrollIntoView({ block: "nearest" });
      }
      return cartao;
    }

    function notasDeDano(r) {
      var notas = [];
      if (r.porTipo && r.porTipo.length > 1) {
        notas.push("Por tipo: " + r.porTipo.map(function (p) { return (p.tipo || "sem tipo") + " " + p.total; }).join(" · "));
      }
      if (r.critico) notas.push(r.multiplicaTodas
        ? "Crítico: os dados de todas as partes foram multiplicados (a ficha manda); números fixos ficam de fora."
        : "Crítico: só os dados da primeira parte foram multiplicados; números fixos e outras partes ficam de fora.");
      return notas;
    }

    function rolarDano(rotulo, partes, critico, multiplicador, todas) {
      var r = D().danoComposto({ nome: rotulo, partes: partes, critico: critico, multiplicador: multiplicador, multiplicaTodas: !!todas });
      return rolar(rotulo + (critico ? " · dano crítico" : " · dano"), r, { critico: critico, notas: notasDeDano(r) });
    }

    function rolarTeste(rotulo, expressao, extra) {
      return rolar(rotulo, D().teste(expressao, { nome: rotulo }), extra);
    }

    function rolarRolagem(r, contexto) {
      var rotulo = contexto + " · " + r.rotulo;
      if (r.tipo === "dano") return rolarDano(rotulo, r.partes, false, 2);
      if (r.tipo === "teste") return rolarTeste(rotulo, r.expressao);
      return rolar(rotulo, D().total(r.expressao, { nome: rotulo }));
    }

    function rolavel(r) {
      if (r.tipo === "dano") return D().danoValido(r.partes);
      if (r.tipo === "teste") return D().testeValido(r.expressao);
      return D().termos(r.expressao).ok;
    }

    /* Um ataque: a quantidade do livro ("x2") rola cada teste à parte —
       cada um decide o próprio crítico pelo natural principal. O dano
       sai do cartão de cada acerto, por clique, nunca sozinho. */
    function rolarAtaque(ataque, contexto) {
      var n = ataque.quantidade || 1;
      for (var i = 1; i <= n; i++) {
        var rotulo = contexto + " · " + ataque.nome + (n > 1 ? " (" + i + "/" + n + ")" : "");
        var r = D().teste(ataque.teste, { nome: rotulo });
        var critico = r.ok && D().ehCritico(r.natural, ataque.critico.margem);
        rolar(rotulo, r, {
          critico: critico,
          notas: ataque.nota ? [ataque.nota] : [],
          acoes: D().danoValido(ataque.dano) ? [{
            rotulo: critico ? "Rolar dano crítico" : "Rolar dano",
            dica: critico ? "O natural atingiu a margem de crítico (" + ataque.critico.margem + ")" : "",
            aoClicar: (function (critico, rotulo) {
              return function (cartao, botao) {
                botao.disabled = true;
                rolarDano(rotulo, ataque.dano, critico, ataque.critico.multiplicador, ataque.multiplicaTudo);
              };
            })(critico, rotulo),
          }] : [],
        });
      }
    }

    function botaoTeste(rotulo, expressao, contexto, extra) {
      var c = C().classificar(expressao);
      if (c.tipo !== "expressao") return el("span.criatura-valor", { texto: c.texto, class: "criatura-valor--" + c.tipo });
      if (!rolaveis) return el("span.criatura-valor", { texto: c.texto });
      return el("button.r-botao.r-botao--mini.criatura-rolar", {
        type: "button", texto: c.texto, "aria-label": "Rolar " + rotulo + ", " + c.texto,
        onclick: function () {
          var nomeDoTeste = contexto ? contexto + " · " + rotulo : rotulo;
          var r = D().teste(expressao, { nome: nomeDoTeste });
          rolar(nomeDoTeste, r, extra && r.ok ? extra(r) : null);
        },
      });
    }

    /* ---------- aplicação na ocorrência ---------- */

    function aplicar(chave, valor) {
      if (!o.aoInstancia) return;
      var copia = U.copiar(atual);
      if (!C().definirNaInstancia(copia, chave, valor)) { UI.avisoErro("Esse valor não vale para esta criatura."); return; }
      atual = copia;
      o.aoInstancia(chave, valor);
      pintar();
    }

    function aplicarStatus(id, valor) {
      var s = U.porId(atual.status, id);
      if (!s || !o.aoStatus) return;
      s.atual = s.maximo > 0 ? U.limitar(valor, 0, s.maximo) : Math.max(0, valor);
      o.aoStatus(id, s.atual);
      pintarCabecaDeVida();
    }

    /* ---------- desenho ---------- */

    var controlesDeStatus = {};
    var marcaMachucado = el("span.r-etiqueta.r-etiqueta--aviso", { texto: "Machucado", hidden: true });

    function pintarCabecaDeVida() {
      marcaMachucado.hidden = !C().estaMachucada(atual);
    }

    function cabecalho(v) {
      var od = v.ordem;
      var linha = [];
      if (typeof od.vd === "number") linha.push("VD " + od.vd);
      if (od.nivel) linha.push(od.nivel);
      linha.push(od.tipo);
      if (od.tamanho) linha.push(od.tamanho);
      linha.push(NOMES_NATUREZA[v.natureza] || v.natureza);
      var origem = v.origem || {};
      var ref = origem.livro && OC() ? OC().referencia(origem.livro, origem.pagina) : (origem.livro ? origem.livro + (origem.pagina ? " p. " + origem.pagina : "") : "");
      var origemTexto = origem.tipo === "catalogo" ? "Ordem Paranormal · " + ref
        : (origem.copiadoDe ? "Homebrew · cópia de " + (ref || origem.copiadoDe) : "Homebrew");

      var imagens = o.semImagem ? null : C().imagensDoCatalogo(v);
      return el("div.pilha--curta.criatura-cabeca", { class: "pilha" }, [
        el("div.criatura-painel__topo", {}, [
          imagens ? retratoComCorpo(imagens, nome) : null,
          el("p.t-secao", { texto: nome + (v.formaAtiva ? " · " + v.formaAtiva.nome : "") }),
          el("span.r-etiqueta", { texto: o.rotulo || (od.aliada ? "Aliado" : "Criatura") }),
        ]),
        el("p.t-mini.criatura-linha", { texto: linha.filter(Boolean).join(" · ") }),
        el("div.faixa.criatura-elementos", {}, od.elementos.map(function (e) {
          return el("span.r-etiqueta.bib-elemento.bib-elemento--" + e, { texto: NOMES_ELEMENTO[e] || e });
        }).concat(od.elementos.length ? [] : [el("span.r-etiqueta", { texto: v.natureza === "paranormal" ? "Sem elemento" : "Realidade" })])),
        el("p.t-mini", { texto: origemTexto + (od.variante ? " · " + (od.variante.rotulo || "Variante") : "") }),
        el("p.t-mini", {
          texto: o.aviso || (o.consulta
            ? "Consulta: nada aqui muda a criatura. Os números já incluem os modificadores da ficha."
            : "Esta ocorrência tem estado próprio. Mudar aqui não altera o modelo, o catálogo nem outras cópias."),
        }),
      ]);
    }

    function blocoDaOcorrencia(v) {
      var od = v.ordem;
      var partes = [];

      partes.push(el("div.editar-grade", {}, v.status.map(function (s) {
        var rotulo = s.id === "vida" ? "PV" : (s.id === "pe" ? "PE" : s.nome);
        if (!instancia || !o.aoStatus) {
          return el("div.painel-numero", {}, [el("span.t-rotulo", { texto: rotulo }), el("span.t-forte", { texto: s.atual + " / " + s.maximo })]);
        }
        var passo = UI.passo({
          valor: s.atual, minimo: 0, maximo: s.maximo > 0 ? s.maximo : 999999,
          rotulo: s.nome + " de " + nome,
          aoMudar: function (valor) { aplicarStatus(s.id, valor); },
        });
        controlesDeStatus[s.id] = passo;
        return el("div.painel-numero", {}, [el("span.t-rotulo", { texto: rotulo + " / " + s.maximo }), passo]);
      })));

      if (typeof od.machucado === "number") {
        partes.push(el("p.t-mini", {}, [el("span", { texto: "Machucado com " + od.machucado + " PV ou menos. " }), marcaMachucado]));
      } else {
        partes.push(el("p.t-mini", { texto: "Machucado: " + C().classificar(od.machucado).texto + "." }));
      }

      if (od.estados.length) {
        partes.push(el("div.editar-grade", {}, od.estados.map(function (e) {
          var valor = C().valorDoEstado(v, e.id);
          var controle = instancia && o.aoInstancia
            ? UI.passo({ valor: valor, minimo: 0, maximo: e.maximo, rotulo: e.nome, aoMudar: function (n) { aplicar("estado:" + e.id, n); } })
            : el("span.t-forte", { texto: valor + " / " + e.maximo });
          return el("div.painel-numero", {}, [el("span.t-rotulo", { texto: e.nome + (e.maximo > 1 ? " / " + e.maximo : "") }), controle]);
        })));
      }

      if (od.forma) partes.push(el("p.t-mini", { texto: "Forma inicial: " + (od.forma.nota || od.forma.inicial) }));
      if (od.formas && od.formas.length) partes.push(blocoDeFormas(v));
      if (od.procedimentos && od.procedimentos.length) partes.push(blocoDeProcedimentos(v));
      var inq = blocoDoInquerito(v);
      if (inq) partes.push(inq);

      if (instancia && o.aoInstancia) {
        var nota = el("textarea.r-area", { rows: 2, maxlength: 1000, "aria-label": "Condições e anotações desta ocorrência" });
        nota.value = (v.instancia && v.instancia.nota) || "";
        nota.addEventListener("change", function () { aplicar("nota", nota.value); });
        partes.push(el("div.r-campo", {}, [el("label.t-mini", { texto: "Condições e anotações desta ocorrência" }), nota]));
      }

      return UI.painel(instancia ? "Esta ocorrência" : "Recursos", el("div.pilha--curta", { class: "pilha" }, partes));
    }

    /* Inquérito Paranormal (AS4 p. 76–78): ajudas que a investigação pode
       render contra esta ameaça. Consulta; numa ocorrência, o mestre
       registra a que valer — nunca muda o modelo do catálogo. */
    function blocoDoInquerito(v) {
      var ref = OC() && OC().inquerito ? OC().inquerito((v.origem && (v.origem.catalogoId || v.origem.copiadoDe)) || "") : null;
      if (!ref) return null;
      var pode = instancia && !!o.aoInstancia;
      var itens = ref.ajudas.map(function (a) {
        return el("li.pilha--curta", { class: "pilha" }, [
          el("p.t-mini", { texto: a.titulo + " (p. " + a.pagina + "): " + a.efeito }),
          pode ? el("button.r-botao.r-botao--mini", { type: "button", texto: "Registrar nesta ocorrência", onclick: function () {
            var atualNota = (v.instancia && v.instancia.nota) || "";
            var linhaNova = "[Inquérito] " + a.titulo + ": " + a.efeito;
            if (atualNota.indexOf(linhaNova) >= 0) { UI.aviso("Já registrado nesta ocorrência."); return; }
            aplicar("nota", (atualNota ? atualNota + "\n" : "") + linhaNova);
          } }) : null,
        ]);
      });
      return UI.recolhivel({
        titulo: "Inquérito Paranormal",
        extra: ref.referencia,
        conteudo: [el("div.pilha--curta", { class: "pilha" }, [
          el("p.t-mini", { texto: "Sugestões situacionais, não errata: o catálogo não muda. Uma ajuda vale só na ocorrência em que o mestre a registrar." + (pode ? " Os jogadores não precisam saber dela de cara." : "") }),
          el("ul.pilha--curta", { class: "pilha" }, itens),
          el("p.t-mini", { texto: ref.geral }),
        ])],
      });
    }

    /* Arquivos Secretos 2: a ficha transformada é a mesma ocorrência.
       A troca pede confirmação, porque mexe nos PV máximos. */
    function blocoDeFormas(v) {
      var od = v.ordem;
      var ativa = (v.instancia && v.instancia.forma) || "";
      /* AS4: o estágio inicial tem nome (Simulacro: troyan). */
      var inicial = od.forma && od.forma.inicial && !/\./.test(od.forma.inicial) ? od.forma.inicial + " (ficha de partida)" : "Ficha de partida";
      var opcoes = [{ id: "", nome: inicial, pv: od.pvBase }].concat(od.formas.map(function (f) {
        return { id: f.id, nome: f.nome, pv: f.pv, pagina: f.pagina, ativacao: f.ativacao };
      }));
      function rotulo(x) { return x.nome + (x.pv ? " (" + x.pv + " PV)" : ""); }
      var partes = [];
      if (instancia && o.aoInstancia) {
        partes.push(el("div.faixa", { role: "group", "aria-label": "Forma desta ocorrência" }, opcoes.map(function (x) {
          return el("button.filtro", {
            type: "button", texto: rotulo(x), "aria-pressed": String(x.id === ativa),
            onclick: function () {
              if (x.id === ativa) return;
              UI.confirmar({
                titulo: "Trocar de forma",
                texto: (x.id ? nome + " assume a forma " + x.nome : nome + " volta à ficha de partida") + ".",
                detalhe: "Os PV máximos passam a " + (x.pv || "os da ficha") + "; os PV atuais ficam como estão (presos no novo máximo, nunca restaurados). Estados, usos, marcadores e a anotação continuam os desta ocorrência.",
                rotuloConfirmar: "Trocar",
              }).then(function (sim) { if (sim) aplicar("forma", x.id); });
            },
          });
        })));
      } else {
        partes.push(el("p.t-mini", { texto: "Forma: " + rotulo(opcoes.filter(function (x) { return x.id === ativa; })[0] || opcoes[0]) }));
      }
      od.formas.forEach(function (f) {
        if (f.ativacao) partes.push(el("p.t-mini", { texto: f.nome + (f.pagina ? " (p. " + f.pagina + ")" : "") + ": " + f.ativacao }));
      });
      return el("div.pilha--curta", { class: "pilha" }, partes);
    }

    /* Arquivos Secretos 4: um procedimento da ficha (Exorcismo Digital).
       Participantes, requisitos e o teste estendido ficam NESTA
       ocorrência; cada passo é um clique do mestre. Aprisionar e
       destruir são etapas diferentes, e nada termina sozinho. */
    var NOMES_DO_ESTADO = { preparando: "preparando", andamento: "em andamento", aprisionado: "aprisionado no objeto analógico",
      destruido: "destruído", escapou: "escapou para a internet", cancelado: "interrompido" };
    var NOMES_DO_PAPEL = { encarar: "encara a tela", executar: "exorciza", outro: "apoio" };

    function andamentoDe(v, p) {
      var a = v.instancia && v.instancia.procedimentos && v.instancia.procedimentos[p.id];
      return a ? U.copiar(a) : { estado: "preparando", participantes: [], requisitos: {}, sucessos: 0, falhas: 0, testes: [] };
    }

    function blocoDeProcedimentos(v) {
      return el("div.pilha--curta", { class: "pilha" }, v.ordem.procedimentos.map(function (p) { return blocoDoProcedimento(v, p); }));
    }

    function blocoDoProcedimento(v, p) {
      var a = andamentoDe(v, p);
      var pode = instancia && !!o.aoInstancia;
      var partes = [
        el("p.t-forte", { texto: p.nome + (p.pagina ? " (p. " + p.pagina + ")" : "") + " · " + NOMES_DO_ESTADO[a.estado] }),
        el("p.t-mini", { texto: "Teste estendido de " + p.pericia + " contra DT " + p.dt + ": " + p.sucessos + " sucessos antes de " + p.falhas + " falhas. Pelo menos " +
          p.participantes.minimo + " participante(s)" + (p.participantes.treinamento ? " treinado(s) em " + p.participantes.treinamento : "") + "." }),
      ];
      if (p.papeis.length) partes.push(el("p.t-mini", { texto: "Papéis: " + p.papeis.join(" · ") + "." }));
      if (p.nota) partes.push(el("p.t-mini", { texto: p.nota }));

      function gravar(novo) { aplicar("procedimento:" + p.id, novo); }

      /* participantes */
      partes.push(el("ul.pilha--curta", { class: "pilha", "aria-label": "Participantes de " + p.nome }, a.participantes.length ? a.participantes.map(function (x, i) {
        return el("li.faixa", {}, [
          el("span.t-mini", { texto: x.nome + " — " + NOMES_DO_PAPEL[x.papel] + (x.treinado ? " · treinado" : " · sem treino") }),
          pode && a.estado === "preparando" ? el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Tirar", onclick: function () {
            a.participantes.splice(i, 1); gravar(a);
          } }) : null,
        ]);
      }) : [el("li.t-mini", { texto: "Nenhum participante registrado." })]));
      if (pode && a.estado === "preparando" && a.participantes.length < 8) {
        var nomeP = el("input.r-entrada", { type: "text", maxlength: 80, "aria-label": "Nome do participante", placeholder: "Nome do personagem" });
        var papelP = el("select.r-selecao", { "aria-label": "Papel do participante" }, Object.keys(NOMES_DO_PAPEL).map(function (k) { return el("option", { value: k, texto: NOMES_DO_PAPEL[k] }); }));
        var treinoP = el("input", { type: "checkbox" });
        partes.push(el("div.faixa", {}, [nomeP, papelP, el("label.r-marca", {}, [treinoP, el("span.t-mini", { texto: "treinado" })]),
          el("button.r-botao.r-botao--mini", { type: "button", texto: "Adicionar", onclick: function () {
            var n = String(nomeP.value || "").trim();
            if (!n) { UI.avisoAtencao("Diga o nome do participante."); return; }
            a.participantes.push({ nome: n, papel: papelP.value, treinado: treinoP.checked });
            gravar(a);
          } })]));
      }

      /* requisitos */
      if (p.requisitos.length) {
        partes.push(el("div.pilha--curta", { class: "pilha" }, p.requisitos.map(function (r) {
          var marcado = !!a.requisitos[r.id];
          return pode && a.estado === "preparando"
            ? el("label.r-marca", {}, [el("input", { type: "checkbox", checked: marcado, onchange: function (ev) {
                if (ev.target.checked) a.requisitos[r.id] = true; else delete a.requisitos[r.id];
                gravar(a);
              } }), el("span.t-mini", { texto: r.texto })])
            : el("p.t-mini", { texto: (marcado ? "✓ " : "○ ") + r.texto });
        })));
      }

      if (a.sucessos || a.falhas || a.testes.length) {
        partes.push(el("p.t-mini", { texto: "Sucessos " + a.sucessos + " de " + p.sucessos + " · falhas " + a.falhas + " de " + p.falhas + "." }));
        var desde = Math.max(0, a.testes.length - 6);
        partes.push(el("ul.pilha--curta", { class: "pilha", "aria-label": "Testes de " + p.nome }, a.testes.slice(desde).map(function (t, i) {
          return el("li.t-mini", { texto: "Teste " + (desde + i + 1) + (t.por ? " (" + t.por + ")" : "") + ": " + t.total + " contra DT " + t.dt + " — " + (t.sucesso ? "sucesso" : "falha") });
        })));
      }
      if (a.estado === "andamento" && a.sucessos >= 1 && p.primeiroSucesso) partes.push(el("p.t-mini.t-aviso", { texto: p.primeiroSucesso }));
      if (a.estado === "aprisionado" && p.sucesso) partes.push(el("p.t-mini.t-aviso", { texto: p.sucesso }));
      if (a.estado === "escapou" && p.falhaTotal) partes.push(el("p.t-mini.t-aviso", { texto: p.falhaTotal }));
      if (a.estado === "destruido") partes.push(el("p.t-mini.t-aviso", { texto: "O objeto analógico foi destruído: fim da criatura. Os PV e o resto da ocorrência ficam como o mestre deixar." }));

      if (!pode) return el("div.pilha--curta.criatura-procedimento", { class: "pilha" }, partes);

      var botoes = [];
      if (a.estado === "preparando") {
        botoes.push(el("button.r-botao.r-botao--mini.r-botao--principal", { type: "button", texto: "Começar", onclick: function () {
          var treinados = a.participantes.filter(function (x) { return x.treinado; }).length;
          var faltam = p.requisitos.filter(function (r) { return !a.requisitos[r.id]; });
          if (treinados < p.participantes.minimo) { UI.avisoAtencao("São precisos pelo menos " + p.participantes.minimo + " participantes treinados" + (p.participantes.treinamento ? " em " + p.participantes.treinamento : "") + "."); return; }
          if (faltam.length) { UI.avisoAtencao("Falta cumprir: " + faltam.map(function (r) { return r.texto; }).join(" ")); return; }
          a.estado = "andamento"; gravar(a);
        } }));
      }
      if (a.estado === "andamento") {
        var totalT = el("input.r-entrada", { type: "number", inputmode: "numeric", min: -99, max: 999, "aria-label": "Resultado do teste de " + p.pericia, placeholder: "resultado" });
        var porT = el("select.r-selecao", { "aria-label": "Quem testou" }, [el("option", { value: "", texto: "quem testou" })].concat(a.participantes.map(function (x) { return el("option", { value: x.nome, texto: x.nome }); })));
        botoes.push(el("span.t-mini", { texto: "Teste de " + p.pericia + ":" }), porT, totalT);
        botoes.push(el("button.r-botao.r-botao--mini.r-botao--principal", { type: "button", texto: "Rolar a DT (" + p.dt + ") e registrar", onclick: function () {
          var total = Math.round(Number(totalT.value));
          if (totalT.value === "" || !isFinite(total)) { UI.avisoAtencao("Informe o resultado do teste de " + p.pericia + " (rolado na ficha de quem exorciza)."); return; }
          var r = /^\d+$/.test(p.dt) ? { ok: true, total: Number(p.dt) } : D().total(p.dt, { nome: p.nome + " · DT" });
          if (!r || !r.ok) { UI.avisoErro("A DT do procedimento não é válida."); return; }
          var sucesso = total >= r.total;
          var primeiro = sucesso && a.sucessos === 0;
          a.testes.push({ id: "t" + Date.now().toString(36), dt: r.total, total: total, sucesso: sucesso, por: porT.value });
          if (sucesso) a.sucessos += 1; else a.falhas += 1;
          if (a.sucessos >= p.sucessos) a.estado = "aprisionado";
          else if (a.falhas >= p.falhas) a.estado = "escapou";
          if (r.rolagens || r.parcelas) rolar(p.nome + " · DT", r, { notas: [total + " contra " + r.total + ": " + (sucesso ? "sucesso" : "falha") + "."].concat(primeiro && p.primeiroSucesso ? [p.primeiroSucesso] : []) });
          gravar(a);
        } }));
      }
      if (a.estado === "aprisionado") {
        botoes.push(el("button.r-botao.r-botao--mini.r-botao--perigo", { type: "button", texto: "Destruir o objeto analógico", onclick: function () {
          UI.confirmar({ titulo: "Destruir o objeto", texto: "O simulacro está preso no objeto analógico. Destruí-lo dá fim a ele.", rotuloConfirmar: "Destruir", perigo: true })
            .then(function (sim) { if (sim) { a.estado = "destruido"; gravar(a); } });
        } }));
      }
      if (a.estado === "preparando" || a.estado === "andamento") {
        botoes.push(el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Interromper", onclick: function () { a.estado = "cancelado"; gravar(a); } }));
      }
      if (a.estado !== "preparando" || a.participantes.length || Object.keys(a.requisitos).length) {
        botoes.push(el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Recomeçar", onclick: function () {
          UI.confirmar({ titulo: "Recomeçar " + p.nome, texto: "Apaga participantes, requisitos e testes desta ocorrência.", rotuloConfirmar: "Recomeçar" })
            .then(function (sim) { if (sim) aplicar("procedimento:" + p.id, null); });
        } }));
      }
      partes.push(el("div.faixa", {}, botoes));
      return el("div.pilha--curta.criatura-procedimento", { class: "pilha" }, partes);
    }

    /* Perfil "como aliado": benefícios, sem PV, PE nem ficha de combate. */
    function blocoDoAliado(v) {
      var od = v.ordem;
      var partes = [el("p.t-mini", { texto: "Aliados não têm PV, PE nem ficha de combate: dão os benefícios abaixo a quem acompanham (OPRPG p. 170). O mestre decide quando o aliado pode agir." })];
      if (od.ficha && od.ficha.nome) {
        partes.push(el("p.t-mini", { texto: "Como ameaça, a mesma pessoa tem ficha própria: " + od.ficha.nome + (od.ficha.pagina ? " (p. " + od.ficha.pagina + ")" : "") + " — o perfil de aliado não herda nada dela." }));
      }
      if (instancia && o.aoInstancia) {
        var nota = el("textarea.r-area", { rows: 2, maxlength: 1000, "aria-label": "Anotações deste aliado" });
        nota.value = (v.instancia && v.instancia.nota) || "";
        nota.addEventListener("change", function () { aplicar("nota", nota.value); });
        partes.push(el("div.r-campo", {}, [el("label.t-mini", { texto: "Anotações deste aliado" }), nota]));
      }
      return UI.painel("Como aliado", el("div.pilha--curta", { class: "pilha" }, partes));
    }

    function listaTexto(lista) { return lista && lista.length ? lista.join("; ") : "—"; }

    function textoResistencias(lista) {
      return lista && lista.length ? lista.map(function (r) {
        return r.tipos.map(function (t) { return t === "dano" ? "qualquer dano" : t; }).join(", ") + " " + r.valor;
      }).join("; ") : "—";
    }

    function textoDeslocamento(lista) {
      return lista && lista.length ? lista.map(function (d) {
        return (d.modo ? d.modo + " " : "") + d.metros + " m" + (d.quadrados !== null ? " (" + d.quadrados + " q)" : "");
      }).join(" · ") : "—";
    }

    function marcaAlterado(v, chave) {
      return v.alterados && v.alterados[chave] ? el("span.r-etiqueta.r-etiqueta--para", { texto: v.alterados[chave], title: "Mudou por " + v.alterados[chave] }) : null;
    }

    function blocoDeFicha(v) {
      var od = v.ordem;
      var pares = [];

      function par(rotulo, valor, chave) {
        pares.push(el("dt", { texto: rotulo }));
        pares.push(el("dd", {}, [valor, chave ? marcaAlterado(v, chave) : null]));
      }

      if (od.presenca) {
        var p = od.presenca;
        var danoOk = D().termos(p.dano).ok;
        par("Presença Perturbadora", el("span.faixa", {}, [
          el("span", { texto: "DT " + (p.dt === null ? "—" : p.dt) + " · " }),
          danoOk && rolaveis
            ? el("button.r-botao.r-botao--mini.criatura-rolar", {
                type: "button", texto: p.dano + " mental", "aria-label": "Rolar dano mental da Presença Perturbadora",
                onclick: function () { rolarDano("Presença Perturbadora", [p.dano + " mental"], false, 2); },
              })
            : el("span", { texto: (p.dano || "—") + " mental" }),
          el("span.t-mini", { texto: p.imune ? " · imune: " + p.imune : " · sem imunidade por NEX informada" }),
        ]));
      }

      ["percepcao", "iniciativa"].forEach(function (k) {
        par(NOMES_DEFESA[k], el("span.faixa", {}, [
          botaoTeste(NOMES_DEFESA[k], od[k], "", k === "iniciativa" && o.aoIniciativa ? function (r) {
            return { acoes: [{ rotulo: "Usar na ordem", dica: "Grava este total como iniciativa desta ocorrência",
              aoClicar: function (cartao, botao) { botao.disabled = true; o.aoIniciativa(r.total); } }] };
          } : null),
        ]), k);
      });
      if (od.sentidos.length) par("Sentidos", el("span", { texto: od.sentidos.join(", ") }));

      par("Defesa", el("span.t-forte", { texto: C().classificar(od.defesa).texto }), "defesa");
      ["fortitude", "reflexos", "vontade"].forEach(function (k) { par(NOMES_DEFESA[k], botaoTeste(NOMES_DEFESA[k], od[k]), k); });
      par("Resistências", el("span", { texto: textoResistencias(od.resistencias) }), "resistencias");
      par("Imunidades", el("span", { texto: listaTexto(od.imunidades) }), "imunidades");
      par("Vulnerabilidades", el("span", { texto: listaTexto(od.vulnerabilidades) }), "vulnerabilidades");
      par("Deslocamento", el("span", { texto: textoDeslocamento(od.deslocamento) }), "deslocamento");

      var atributos = el("div.atributos", {}, v.atributos.map(function (a) {
        var rolavel = rolaveis && !!a.dado;
        return el("div.atributo", {}, [
          el("button.atributo__caixa", {
            type: "button", disabled: !rolavel,
            "aria-label": a.naoAplica ? a.nome + ": não se aplica" : "Rolar " + a.nome + ", " + a.dado,
            onclick: function () { rolarTeste(a.nome, a.dado); },
          }, [
            el("span.atributo__sigla", { texto: a.sigla }),
            el("span.atributo__valor", { texto: a.naoAplica ? "—" : (a.valor === null ? "?" : String(a.valor)) }),
            el("span.atributo__dado", { texto: a.dado || "" }),
          ]),
          marcaAlterado(v, "atributo:" + a.sigla),
        ]);
      }));

      var pericias = v.pericias.length ? el("div.pericias", {}, v.pericias.map(function (p) {
        var ok = p.expressao && D().testeValido(p.expressao);
        return el("button.pericia", {
          type: "button", disabled: !(rolaveis && ok),
          "aria-label": ok ? "Rolar " + p.nome + ", " + p.expressao : p.nome,
          onclick: function () { rolarTeste(p.nome, p.expressao); },
        }, [el("span.pericia__nome", { texto: p.nome }), el("span.pericia__bonus", { texto: p.expressao || "—" })]);
      })) : null;

      return [
        UI.painel("Ficha", el("dl.r-dados.criatura-dados", {}, pares)),
        UI.painel("Atributos", atributos),
        pericias ? UI.painel("Perícias", pericias) : null,
      ];
    }

    /* Habilidade ou ação: texto, controles de uso e marcador, e as
       rolagens numa faixa que não se recolhe. */
    function efeito(ef, v, ehAcao) {
      var chaveAberta = (ehAcao ? "a:" : "h:") + ef.id;
      var titulo = ehAcao ? NOMES_ACAO[ef.tipo] + " · " + ef.nome : ef.nome;
      var marcas = [];
      if (ef.desativada) marcas.push("Desativada (" + ef.motivo + ")");
      if (ef.inativa) marcas.push("Fase não atingida");
      var inst = v.instancia || { usos: {}, marcadores: {} };

      var detalhes = [];
      if (ef.texto) detalhes.push(el("p", { texto: ef.texto, estilo: { whiteSpace: "pre-wrap" } }));
      var info = [];
      if (ef.resistencia) info.push("Resistência: " + ef.resistencia);
      if (ef.custo) info.push("Custo: " + ef.custo);
      if (ef.recarga) info.push("Recarga: " + ef.recarga);
      if (ef.requer) {
        var est = U.porId(v.ordem.estados, ef.requer.estado);
        info.push("Exige " + (est ? est.nome : ef.requer.estado) + " ≥ " + ef.requer.minimo);
      }
      if (info.length) detalhes.push(el("p.t-mini", { texto: info.join(" · ") }));

      (ef.ataques || []).forEach(function (a) {
        detalhes.push(el("dl.r-dados.criatura-ataque", {}, [
          el("dt", { texto: a.nome + (a.quantidade > 1 ? " ×" + a.quantidade : "") }),
          el("dd", { texto: [a.alcance, "teste " + (a.teste || "—"), "dano " + (a.dano.join(" + ") || "—"), "crítico " + C().textoDoCritico(a.critico)].filter(Boolean).join(" · ") }),
          a.nota ? el("dd.t-mini", { texto: a.nota }) : null,
        ]));
      });

      var controles = [];
      if (ef.limite) {
        var usados = inst.usos[ef.id] || 0;
        controles.push(el("span.faixa.criatura-uso", {}, [
          el("span.t-mini", { texto: "Usos (" + ef.limite.quantidade + " por " + ef.limite.periodo + ")" }),
          instancia && o.aoInstancia
            ? UI.passo({ valor: usados, minimo: 0, maximo: ef.limite.quantidade, rotulo: "Usos de " + ef.nome, aoMudar: function (n) { aplicar("uso:" + ef.id, n); } })
            : el("span.t-forte", { texto: "0 / " + ef.limite.quantidade }),
        ]));
      }
      function alternador(chave, rotulo) {
        var ligado = !!inst.marcadores[chave];
        if (!instancia || !o.aoInstancia) return null;
        return el("button.r-aba.criatura-marcador", {
          type: "button", "aria-pressed": String(ligado), texto: rotulo,
          onclick: function () { aplicar("marcador:" + chave, !ligado); },
        });
      }
      if (ef.marcador) controles.push(alternador(ef.id, ef.marcador));
      if (ef.recarga) controles.push(alternador("recarga." + ef.id, "Em recarga"));
      if (ef.marcador && inst.marcadores[ef.id] && !(instancia && o.aoInstancia)) marcas.push(ef.marcador);

      var botoes = [];
      if (rolaveis) {
        (ef.ataques || []).forEach(function (a) {
          var testeOk = D().testeValido(a.teste);
          var danoOk = D().danoValido(a.dano);
          botoes.push(el("button.r-botao.r-botao--mini", {
            type: "button", texto: a.nome + (a.quantidade > 1 ? " ×" + a.quantidade : ""), disabled: !testeOk,
            "aria-label": "Atacar com " + a.nome + (a.quantidade > 1 ? ", " + a.quantidade + " ataques" : ""),
            onclick: function () { rolarAtaque(a, ef.nome); },
          }));
          botoes.push(el("button.r-botao.r-botao--mini.r-botao--fantasma", {
            type: "button", texto: "Dano", disabled: !danoOk, "aria-label": "Rolar dano de " + a.nome,
            onclick: function () { rolarDano(ef.nome + " · " + a.nome, a.dano, false, a.critico.multiplicador); },
          }));
          botoes.push(el("button.r-botao.r-botao--mini.r-botao--fantasma", {
            type: "button", texto: "Crítico", disabled: !danoOk, "aria-label": "Rolar dano crítico de " + a.nome,
            onclick: function () { rolarDano(ef.nome + " · " + a.nome, a.dano, true, a.critico.multiplicador, a.multiplicaTudo); },
          }));
        });
        (ef.rolagens || []).forEach(function (r) {
          botoes.push(el("button.r-botao.r-botao--mini", {
            type: "button", texto: r.rotulo, disabled: !rolavel(r),
            title: r.tipo === "dano" ? r.partes.join(" + ") : r.expressao,
            onclick: function () { rolarRolagem(r, ef.nome); },
          }));
        });
      }

      var faixa = botoes.length || controles.filter(Boolean).length
        ? el("div.faixa.criatura-faixa", {}, controles.filter(Boolean).concat(botoes)) : null;

      return UI.recolhivel({
        titulo: titulo,
        extra: marcas.join(" · "),
        classe: "criatura-efeito" + (ef.desativada || ef.inativa ? " criatura-efeito--apagado" : ""),
        aberto: !!abertos[chaveAberta],
        aoAlternar: function (aberto) { abertos[chaveAberta] = aberto; },
        conteudo: detalhes.length ? detalhes : [el("p.t-mini", { texto: "Sem texto." })],
        faixa: faixa,
      });
    }

    function blocoDeEnigma(v) {
      var e = v.ordem.enigma;
      if (!e) return null;
      var resolvido = !!(v.instancia && v.instancia.enigma);
      var partes = [el("p", { texto: e.texto, estilo: { whiteSpace: "pre-wrap" } })];
      if (e.efeito) partes.push(el("p.t-mini", { texto: "Ao resolver: " + e.efeito }));
      if (!e.altera) partes.push(el("p.t-mini", { texto: "O livro não traz números para este efeito: marcar como resolvido só registra o fato, e o mestre ajusta o resto." }));
      if (instancia && o.aoInstancia) {
        partes.push(el("label.r-marca", {}, [
          el("input", { type: "checkbox", checked: resolvido, onchange: function (ev) { aplicar("enigma", ev.target.checked); } }),
          el("span", { texto: "Enigma resolvido nesta ocorrência" }),
        ]));
      } else if (resolvido) {
        partes.push(el("span.r-etiqueta.r-etiqueta--para", { texto: "Resolvido" }));
      }
      if (rolaveis && e.rolagens.length) {
        partes.push(el("div.faixa", {}, e.rolagens.map(function (r) {
          return el("button.r-botao.r-botao--mini", { type: "button", texto: r.rotulo, disabled: !rolavel(r), onclick: function () { rolarRolagem(r, "Enigma"); } });
        })));
      }
      return UI.painel("Enigma de Medo", el("div.pilha--curta", { class: "pilha" }, partes));
    }

    function pintar() {
      var v = C().vistaEfetiva(atual);
      var rolagem = raiz.parentNode ? raiz.parentNode.scrollTop : 0;
      controlesDeStatus = {};

      var acoes = ORDEM_ACOES.map(function (tipo) {
        return v.acoes.filter(function (a) { return a.tipo === tipo; });
      }).reduce(function (a, b) { return a.concat(b); }, []);

      if (v.ordem.aliada) {
        U.trocar(raiz, [
          cabecalho(v),
          blocoDoAliado(v),
          v.habilidades.length ? UI.painel("Benefícios", el("div.pilha--curta", { class: "pilha" }, v.habilidades.map(function (h) { return efeito(h, v, false); }))) : null,
          acoes.length ? UI.painel("Ações", el("div.pilha--curta", { class: "pilha" }, acoes.map(function (a) { return efeito(a, v, true); }))) : null,
          v.descricao ? UI.painel("Descrição", el("p", { texto: v.descricao, estilo: { whiteSpace: "pre-wrap" } })) : null,
          v.ordem.notas.length ? UI.painel("Notas do catálogo", el("ul.bib-lista-textos", {}, v.ordem.notas.map(function (n) { return el("li.t-mini", { texto: n }); }))) : null,
        ].filter(Boolean));
        return;
      }

      var notasDaForma = v.formaAtiva ? v.formaAtiva.notas : [];
      var notas = v.ordem.notas.concat(notasDaForma);
      U.trocar(raiz, [
        cabecalho(v),
        blocoDaOcorrencia(v),
      ].concat(blocoDeFicha(v)).concat([
        v.habilidades.length ? UI.painel("Habilidades", el("div.pilha--curta", { class: "pilha" }, v.habilidades.map(function (h) { return efeito(h, v, false); }))) : null,
        acoes.length ? UI.painel("Ações", el("div.pilha--curta", { class: "pilha" }, acoes.map(function (a) { return efeito(a, v, true); }))) : null,
        blocoDeEnigma(v),
        v.descricao ? UI.painel("Descrição", el("p", { texto: v.descricao, estilo: { whiteSpace: "pre-wrap" } })) : null,
        notas.length ? UI.painel("Notas do catálogo", el("ul.bib-lista-textos", {}, notas.map(function (n) { return el("li.t-mini", { texto: n }); }))) : null,
      ]).filter(Boolean));

      pintarCabecaDeVida();
      if (raiz.parentNode && rolagem) raiz.parentNode.scrollTop = rolagem;
    }

    pintar();

    return {
      titulo: nome,
      raiz: raiz,
      /* Mudança vinda de fora (outra aba, servidor). Vida e esforço só
         mexem no número; o resto redesenha — a não ser que alguém esteja
         escrevendo ali dentro, e aí espera sair do campo. */
      atualizar: function (nova) {
        var snap = C().normalizar(nova);
        var mudouInstancia = JSON.stringify(snap.instancia || null) !== JSON.stringify(atual.instancia || null);
        atual.status = snap.status;
        snap.status.forEach(function (s) {
          var passo = controlesDeStatus[s.id];
          if (!passo) return;
          var campo = U.$(".r-passo__valor", passo);
          if (campo && document.activeElement === campo) return;
          if (passo.valor() !== s.atual) passo.definir(s.atual);
        });
        pintarCabecaDeVida();
        if (!mudouInstancia) return;
        atual = snap;
        var foco = document.activeElement;
        if (foco && raiz.contains(foco) && /^(TEXTAREA|INPUT)$/.test(foco.tagName)) {
          if (!pendente) {
            pendente = true;
            foco.addEventListener("blur", function () { pendente = false; pintar(); }, { once: true });
          }
          return;
        }
        pintar();
      },
    };
  }

  /* O retrato 1:1 do catálogo e, no clique, o corpo inteiro. Imagem que
     não carrega some sem aviso: a ficha não depende dela. */
  function retratoComCorpo(imagens, nome) {
    var botao = el("button.criatura-retrato", {
      type: "button", title: "Ver o corpo inteiro", "aria-label": "Ver a imagem de corpo inteiro de " + nome,
      onclick: function () { verCorpoInteiro(imagens, nome); },
    });
    var img = el("img", { src: imagens.retrato, alt: "", loading: "lazy", width: 64, height: 64 });
    img.addEventListener("error", function () { botao.hidden = true; });
    botao.appendChild(img);
    return botao;
  }

  function verCorpoInteiro(imagens, nome) {
    var img = el("img.criatura-corpo", { src: imagens.corpo, alt: "Corpo inteiro de " + nome });
    var falha = el("p.t-mini", { texto: "Esta criatura ainda não tem imagem de corpo inteiro.", hidden: true });
    img.addEventListener("error", function () { img.hidden = true; falha.hidden = false; });
    UI.modal({ titulo: nome, largo: true, conteudo: [el("div.criatura-corpo__caixa", {}, [img, falha])], botoes: [{ rotulo: "Fechar" }] });
  }

  global.RAMACriaturaPainel = { criar: criar, verCorpoInteiro: verCorpoInteiro };
})(window);
