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
            type: "button", texto: "+ Perícia", onclick: function () { nova(ctx); },
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

    if (ctx.emEdicao()) {
      return el("div.pilha--curta", { class: "pilha" }, pericias.map(function (p) {
        return emEdicao(ctx, p);
      }));
    }

    /* Em ordem alfabética no modo normal: procurar "Percepção" numa
       lista de 28 é a operação mais frequente da aba, e ordem
       alfabética é a única em que se procura sem pensar. */
    var ordenadas = pericias.slice().sort(function (a, b) {
      return U.chaveDeBusca(a.nome).localeCompare(U.chaveDeBusca(b.nome), "pt-BR");
    });

    return el("div.pericias", {}, ordenadas.map(function (p) { return normal(ctx, p); }));
  }

  /* =================================================================
     MODO NORMAL — um clique, uma rolagem
     ================================================================= */

  function normal(ctx, p) {
    var atributo = F.atributoDaPericia(ctx.ficha, p);
    var bonus = F.bonusDaPericia(p);
    var extras = (p.dadosExtras || []);

    return el("button.pericia", {
      type: "button",
      "aria-label": "Rolar " + p.nome + (atributo ? ", atributo " + atributo.nome : ""),
      title: atributo ? "Rola " + atributo.dado + " de " + atributo.nome : "Sem atributo vinculado",
      onclick: function () { rolar(ctx, p); },
    }, [
      el("span.pericia__nome", {}, [
        el("span", { texto: p.nome }),
        el("span.pericia__attr", { texto: "(" + (atributo ? atributo.sigla : "—") + ")" }),
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
    var atributo = F.atributoDaPericia(ctx.ficha, p);
    if (!atributo) {
      UI.avisoErro(p.nome + " não tem atributo vinculado. Escolha um no modo edição.");
      return;
    }

    var r = D.dependente(F.pedidoDeRolagem(ctx.ficha, p));
    if (!r.ok) {
      UI.avisoErro("O dado de " + atributo.nome + " (" + atributo.dado + ") não é válido.");
      return;
    }

    global.RAMARolagens.mostrar(r, { nome: p.nome + " (" + atributo.sigla + ")" });
  }

  /* =================================================================
     MODO EDIÇÃO
     ================================================================= */

  function emEdicao(ctx, p) {
    var permitidos = p.atributosPermitidos && p.atributosPermitidos.length > 1
      ? ctx.ficha.atributos.filter(function (a) { return p.atributosPermitidos.indexOf(a.id) >= 0; })
      : ctx.ficha.atributos;

    return el("div.pericia-edicao", {}, [
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
        valor: p.atributoId,
        opcoes: permitidos.map(function (a) {
          return { valor: a.id, rotulo: a.nome + " (" + a.sigla + ")" };
        }),
        aoMudar: function (v) { p.atributoId = v; ctx.alterou(); },
      }),

      p.atributosPermitidos && p.atributosPermitidos.length > 1
        ? el("p.t-mini", { texto: "Esta perícia aceita mais de um atributo. Escolha o que vale nesta ficha." })
        : null,

      dadosExtras(ctx, p),
    ]);
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
