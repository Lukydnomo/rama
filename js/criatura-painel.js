/* Consulta compartilhada de criaturas: combate e aliados usam o mesmo
   modelo, motor de dados e mostrador com histórico. */
(function (global) {
  "use strict";
  var U = global.RAMAUtil, UI = global.RAMAUI, el = U.el;
  function criar(criatura, opcoes) {
    var o = opcoes || {};
    var c = global.RAMACriaturas.normalizar(criatura);
    var nome = o.nome || c.nome;
    var controles = {};
    var resultados = el("div.pilha", { "aria-live": "polite", "aria-label": "Resultado do aliado" });

    var status = c.status.length ? UI.painel("Status", el("div.editar-grade", {}, c.status.map(function (s) {
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
      if (o.permitirRolagem !== false && global.RAMARolagens) {
        if (!resultado.ok) { UI.avisoErro("Confira os dados desta rolagem."); return; }
        var cartao = global.RAMARolagens.mostrar(resultado, { nome: nome + " · " + rotulo, tipo: o.tipo || "criatura", critico: !!critico });
        // O mesmo resultado/histórico, visível dentro da janela de consulta.
        if (o.resultadosLocais && cartao) {
          var secao = document.activeElement && document.activeElement.closest(".r-painel");
          (secao && corpo.contains(secao) ? secao : corpo).appendChild(resultados);
          U.trocar(resultados, [cartao]);
          resultados.scrollIntoView({ block: "nearest" });
        }
      }
    }

    var corpo = el("div.pilha.criatura-painel", {}, [
      el("div.criatura-painel__topo", {}, [
        el("p.t-secao", { texto: nome }),
        el("span.r-etiqueta", { texto: o.rotulo || "Criatura" }),
      ]),
      el("p.t-mini", { texto: o.aviso || "Esta cópia tem estado próprio. Alterações não modificam a biblioteca nem outras cópias." }),

      status,

      c.atributos.length ? UI.painel("Atributos", el("div.atributos", {}, c.atributos.map(function (a) {
        return el("div.atributo", {}, [
          el("button.atributo__caixa", {
            type: "button", disabled: o.permitirRolagem === false,
            "aria-label": "Rolar " + a.nome + ", " + a.dado,
            onclick: function () {
              var r = global.RAMADados.rolar(a.dado);
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
          type: "button", disabled: o.permitirRolagem === false,
          "aria-label": "Rolar " + p.nome,
          onclick: function () { rolar(p.nome, global.RAMADados.dependente(global.RAMACriaturas.pedidoDePericia(c, p))); },
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
          el("div.item__acoes", {}, [
            el("button.r-botao.r-botao--mini", {
              type: "button", disabled: o.permitirRolagem === false, texto: "Ataque",
              onclick: function () {
                var r = global.RAMADados.dependente(global.RAMACriaturas.pedidoDeAtaque(c, a));
                rolar(a.nome + " · Ataque", r, global.RAMADados.ehCritico(r.natural, a.critico));
              },
            }),
            el("button.r-botao.r-botao--mini", {
              type: "button", texto: "Dano", disabled: !a.dano || o.permitirRolagem === false,
              onclick: function () {
                rolar(a.nome + " · Dano", global.RAMADados.dano({
                  nome: a.nome, dano: a.dano, danoExtra: a.danoExtra,
                  critico: false, multiplicador: a.multiplicador,
                }));
              },
            }),
            a.critico ? el("button.r-botao.r-botao--mini", {
              type: "button", texto: "Dano crítico", disabled: !a.dano || o.permitirRolagem === false,
              onclick: function () {
                rolar(a.nome + " · Dano crítico", global.RAMADados.dano({
                  nome: a.nome, dano: a.dano, danoExtra: a.danoExtra, critico: true, multiplicador: a.multiplicador,
                }), true);
              },
            }) : null,
          ]),
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
        var snap = global.RAMACriaturas.normalizar(nova);
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

  global.RAMACriaturaPainel = { criar: criar };
})(window);
