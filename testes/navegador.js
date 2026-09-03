/* =====================================================================
   R.A.M.A. — testes no navegador
   ---------------------------------------------------------------------
   O mesmo testes/casos.js do executor de linha de comando, desenhado na
   tela. Existe porque o navegador é onde o sistema roda de verdade: um
   `crypto.getRandomValues` ausente ou um `structuredClone` que o
   Safari antigo não tem só aparecem aqui.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el;

  var saida = U.$("#saida");
  var placar = U.$("#placar");

  var passaram = 0;
  var falharam = 0;
  var grupoAtual = null;

  var coletor = {
    grupo: function (titulo) {
      grupoAtual = el("div.grupo", {}, [el("p.grupo__titulo", { texto: titulo })]);
      saida.appendChild(grupoAtual);
    },

    ok: function (nome, condicao, detalhe) {
      if (condicao) passaram++; else falharam++;

      if (!grupoAtual) coletor.grupo("Geral");

      grupoAtual.appendChild(el("div.caso", {
        class: condicao ? "caso--ok" : "caso--falhou",
      }, [
        el("span.caso__marca", { texto: condicao ? "ok" : "FALHOU" }),
        el("span", {}, [
          el("span", { texto: nome }),
          !condicao && detalhe ? el("span.caso__detalhe", { texto: " — " + detalhe }) : null,
        ]),
      ]));
    },

    igual: function (nome, obtido, esperado) {
      var mesmo = Object.is(obtido, esperado);
      coletor.ok(nome, mesmo, mesmo ? "" :
        "obtido " + JSON.stringify(obtido) + ", esperado " + JSON.stringify(esperado));
    },

    iguais: function (nome, obtido, esperado) {
      var a = JSON.stringify(obtido), b = JSON.stringify(esperado);
      coletor.ok(nome, a === b, a === b ? "" : "obtido " + a + ", esperado " + b);
    },
  };

  try {
    global.RAMACasos(coletor);
  } catch (e) {
    falharam++;
    coletor.grupo("Exceção");
    coletor.ok("os testes pararam: " + e.message, false, e.stack);
  }

  U.trocar(placar, [
    el("div", {}, [
      el("p.placar__numero", { class: falharam ? "t-erro" : "t-ok", texto: String(passaram + falharam) }),
      el("p.t-rotulo", { texto: "verificações" }),
    ]),
    el("div", {}, [
      el("p.placar__numero.t-ok", { texto: String(passaram) }),
      el("p.t-rotulo", { texto: "passaram" }),
    ]),
    el("div", {}, [
      el("p.placar__numero", { class: falharam ? "t-erro" : "t-fraco", texto: String(falharam) }),
      el("p.t-rotulo", { texto: "falharam" }),
    ]),
    el("span.r-estado", {
      dataset: { estado: falharam ? "erro" : "salvo" },
      texto: falharam ? "Há falhas" : "Tudo passando",
    }),
  ]);

  document.title = (falharam ? falharam + " falhas" : "Tudo passando") + " — Testes R.A.M.A.";
})(window);
