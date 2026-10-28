/* =====================================================================
   R.A.M.A. — Oblívio · o diagrama do corpo (v3.0)
   ---------------------------------------------------------------------
   As cinco regiões como figura (SVG) e como lista de controles. A
   figura é para ver de relance — Estresse enchendo cada região, a
   esgotada riscada, a prótese tracejada, a ausente só em contorno — e é
   aria-hidden. A LISTA é a interface acessível: cada região um botão com
   tudo dito em texto (Estresse e limite, se pode ser arriscada, o
   equipamento, prótese ou ausente, os efeitos).

     RAMAOblivioCorpo.diagrama(blocoOblivio, {
       somenteLeitura, compacto, selecionadas: [chaves], aoEscolher(chave)
     })

   `selecionadas`: a ordem dos dados de um ataque (Sobrecarga repete a
   região) — o número aparece na região, para o vínculo dado → região
   ficar visível ANTES da rolagem.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el;
  function C() { return global.RAMAOblivioCatalogo; }
  function R() { return global.RAMAOblivio; }

  /* A silhueta num quadro de 120 × 220. O Torso inclui a cabeça. */
  var FORMAS = {
    torso: "M48 6 h24 v22 h-24z M38 32 h44 v70 h-44z",
    bracoD: "M18 34 h16 v62 h-16z",
    bracoE: "M86 34 h16 v62 h-16z",
    pernaD: "M40 106 h18 v100 h-18z",
    pernaE: "M62 106 h18 v100 h-18z",
  };
  var ROTULO = { torso: [60, 70], bracoD: [26, 104], bracoE: [94, 104], pernaD: [49, 214], pernaE: [71, 214] };

  function svg(nome, attrs, filhos) { return U.svg(nome, attrs, filhos); }

  function figura(o, opcoes) {
    var op = opcoes || {};
    var contagem = {};
    (op.selecionadas || []).forEach(function (k, i) { (contagem[k] = contagem[k] || []).push(i + 1); });
    var grupos = o.corpo.regioes.map(function (r) {
      var cheio = r.limite ? Math.min(1, r.estresse / r.limite) : 0;
      var esg = R().esgotada(r);
      var classes = ["oblivio-corpo__forma", "oblivio-corpo__forma--" + r.estado, esg ? "oblivio-corpo__forma--esgotada" : "", contagem[r.chave] ? "oblivio-corpo__forma--arriscada" : ""].join(" ");
      var filhos = [svg("path", { d: FORMAS[r.chave], class: classes, style: "--cheio:" + Math.round(cheio * 100) + "%" })];
      if (r.estado !== "ausente") {
        filhos.push(svg("text", { x: ROTULO[r.chave][0], y: ROTULO[r.chave][1], class: "oblivio-corpo__numero", "text-anchor": "middle" }, [document.createTextNode(r.estresse + "/" + r.limite)]));
      }
      if (contagem[r.chave]) {
        var p = ROTULO[r.chave];
        filhos.push(svg("text", { x: p[0], y: p[1] - (r.chave === "torso" ? 18 : 30), class: "oblivio-corpo__dado", "text-anchor": "middle" }, [document.createTextNode("d" + contagem[r.chave].join(",d"))]));
      }
      return svg("g", { "data-regiao": r.chave }, filhos);
    });
    return svg("svg", { viewBox: "0 0 120 222", class: "oblivio-corpo__figura", "aria-hidden": "true", focusable: "false" }, grupos);
  }

  function descricao(o, r) {
    var cat = C().regiao[r.chave];
    if (r.estado === "ausente") return cat.nome + ": ausente.";
    var partes = [cat.nome + ": " + r.estresse + " de " + r.limite + " de Estresse"];
    partes.push(R().esgotada(r) ? "esgotada — não pode ser arriscada" + (r.chave === "torso" ? " (Fora de Ação)" : "") : "pode ser arriscada");
    if (r.estado === "protese") partes.push("prótese (" + r.falhasExtremas + " Falha(s) Extrema(s) acumulada(s))");
    if (r.curaTemporaria) partes.push(r.curaTemporaria + " de cura temporária");
    var item = o.inventario.itens.filter(function (i) { return i.estado === "carregado" && i.regiao === r.chave; })[0];
    if (item) partes.push("carrega " + item.nome);
    return partes.join("; ") + ".";
  }

  function diagrama(o, opcoes) {
    var op = opcoes || {};
    var contagem = {};
    (op.selecionadas || []).forEach(function (k) { contagem[k] = (contagem[k] || 0) + 1; });
    var lista = el("ul.oblivio-corpo__lista", { "aria-label": "Regiões do corpo" }, o.corpo.regioes.map(function (r) {
      var cat = C().regiao[r.chave];
      var esg = R().esgotada(r);
      var item = o.inventario.itens.filter(function (i) { return i.estado === "carregado" && i.regiao === r.chave; })[0];
      var conteudo = [
        el("span.oblivio-corpo__nome", { texto: cat.nome }),
        r.estado === "ausente" ? el("span.oblivio-corpo__valor", { texto: "ausente" })
          : el("span.oblivio-corpo__valor", {}, [
            el("span.oblivio-corpo__barra", { "aria-hidden": "true" }, [el("span.oblivio-corpo__enchimento", { estilo: { width: Math.round(100 * Math.min(1, r.estresse / Math.max(1, r.limite))) + "%" } })]),
            el("span", { texto: r.estresse + "/" + r.limite }),
          ]),
        r.estado === "protese" ? el("span.r-etiqueta", { texto: "prótese" }) : null,
        item ? el("span.r-etiqueta.oblivio-corpo__item", { "aria-hidden": "true", texto: item.nome }) : null,
        esg && r.estado !== "ausente" ? el("span.r-etiqueta.r-etiqueta--aviso", { texto: "esgotada" }) : null,
        contagem[r.chave] ? el("span.r-etiqueta.r-etiqueta--forte", { texto: contagem[r.chave] + " dado(s)" }) : null,
      ];
      var desc = descricao(o, r);
      var podeEscolher = !op.somenteLeitura && op.aoEscolher && r.estado !== "ausente";
      var corpo = podeEscolher
        ? el("button.oblivio-corpo__regiao", { type: "button", "aria-label": desc + (op.rotuloAcao ? " " + op.rotuloAcao : ""), "aria-pressed": op.selecionadas ? String(!!contagem[r.chave]) : null,
            disabled: op.soDisponiveis && esg, onclick: function () { op.aoEscolher(r.chave); } }, conteudo)
        : el("div.oblivio-corpo__regiao", { title: desc }, conteudo.concat([el("span.so-leitor", { texto: desc })]));
      return el("li", { class: "oblivio-corpo__item--" + r.estado + (esg ? " oblivio-corpo__item--esgotada" : "") }, [corpo]);
    }));
    return el("div.oblivio-corpo", { class: op.compacto ? "oblivio-corpo--compacto" : "" }, [figura(o, op), lista]);
  }

  global.RAMAOblivioCorpo = { diagrama: diagrama, descricao: descricao };
})(window);
