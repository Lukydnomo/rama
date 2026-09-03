/* =====================================================================
   R.A.M.A. — mostrador de rolagens
   ---------------------------------------------------------------------
   O canto onde o dado aparece. Flutua sobre a ficha, empilha as
   últimas e não rouba o foco: no meio de uma sessão a pessoa clica,
   lê e continua mexendo, sem precisar fechar nada.

   O que ele mostra, nesta ordem, é o que a mesa pergunta:
     o total, grande;
     os dados brutos, com o principal marcado;
     e só então de onde vieram os números.

   Ver os dados descartados importa. Em 2d20 dá para conferir na hora
   que o 15 ganhou do 6 — e em -2d20, que o 6 ganhou do 15.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var el = U.el;

  var MAX_NA_TELA = 4;
  var historico = [];

  function area() { return U.$("#rolagens"); }

  /* mostrar(resultado, { tipo, acao: { rotulo, aoClicar } }) */
  function mostrar(resultado, opcoes) {
    var o = opcoes || {};
    var caixa = area();
    if (!caixa) return;

    var cartao = montar(resultado, o);

    /* As anteriores desbotam em vez de sumir: dá para conferir a
       rolagem passada quando alguém pergunta "quanto deu mesmo?". */
    U.$$(".rolagem", caixa).forEach(function (n) { n.classList.add("rolagem--antiga"); });

    caixa.appendChild(cartao);

    while (caixa.children.length > MAX_NA_TELA) caixa.removeChild(caixa.firstChild);

    historico.unshift({ quando: Date.now(), resultado: resultado });
    if (historico.length > 30) historico.pop();

    return cartao;
  }

  function montar(r, o) {
    var critico = !!o.critico;

    var cartao = el("article.rolagem", {
      class: [
        critico ? "rolagem--critico" : "",
        r.tipo === "dano" ? "rolagem--dano" : "",
      ].filter(Boolean).join(" "),
    }, [
      el("header.rolagem__topo", {}, [
        el("span.rolagem__nome", { texto: o.nome || r.nome || "Rolagem" }),
        el("span.rolagem__expressao", { texto: r.expressao || "" }),
      ]),

      el("p.rolagem__total", { texto: String(r.total !== undefined ? r.total : r.principal) }),

      faces(r),

      critico ? el("p.rolagem__marca", { texto: "Crítico" }) : null,

      parcelas(r),

      o.acao ? el("button.r-botao.r-botao--mini.rolagem__acao", {
        type: "button",
        texto: o.acao.rotulo,
        onclick: function () { o.acao.aoClicar(cartao); },
      }) : null,

      el("button.r-icone.rolagem__acao", {
        type: "button",
        "aria-label": "Dispensar resultado",
        estilo: { position: "absolute", top: "2px", right: "2px" },
        onclick: function () { if (cartao.parentNode) cartao.parentNode.removeChild(cartao); },
      }, [UI.simbolo("x", 12)]),
    ]);

    cartao.style.position = "relative";
    return cartao;
  }

  /* As faces sorteadas. No dano todas contam, então nenhuma é
     destacada; na rolagem dependente só uma vale, e ela fica invertida. */
  function faces(r) {
    var lista = r.rolagens || [];
    if (!lista.length) return null;

    var temPrincipal = r.tipo !== "dano" && r.natural !== undefined;
    var marcou = false;

    return el("div.rolagem__dados", { "aria-hidden": "true" }, lista.map(function (valor) {
      var principal = temPrincipal && !marcou && valor === r.natural;
      if (principal) marcou = true;
      return el("span.face", { class: principal ? "face--principal" : "", texto: String(valor) });
    }));
  }

  function parcelas(r) {
    var lista = (r.parcelas || []).filter(function (p) { return p.valor !== 0 || p.detalhe; });
    if (lista.length < 2) return null;

    return el("div.rolagem__parcelas", {}, lista.map(function (p) {
      return el("div.rolagem__parcela", {}, [
        el("span", { texto: p.rotulo + (p.detalhe ? " (" + p.detalhe + ")" : "") }),
        el("span", { texto: U.comSinal(p.valor) }),
      ]);
    }));
  }

  function limpar() {
    var caixa = area();
    if (caixa) U.limpar(caixa);
  }

  global.RAMARolagens = {
    mostrar: mostrar,
    limpar: limpar,
    historico: function () { return historico.slice(); },
  };
})(window);
