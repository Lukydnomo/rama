/* =====================================================================
   R.A.M.A. — Criaturas → Catálogo (v6.12)
   ---------------------------------------------------------------------
   A antiga página Criaturas virou a categoria Criaturas do Catálogo
   (catalogo/). Links antigos continuam funcionando: o sistema é
   preservado, "?secao=geradores" abre a categoria Geradores e o resto
   abre a categoria das criaturas daquele sistema (Criaturas e aliados,
   Ameaças, Antagonistas ou Inimigos — o id é "criaturas" em todos).
   ===================================================================== */
(function (global) {
  "use strict";
  var SISTEMAS = ["ordem", "oblivio", "vampiro", "goblins"];

  function destino(busca, caminho) {
    var q = new URLSearchParams(busca || "");
    var sistema = SISTEMAS.indexOf(q.get("sistema")) >= 0 ? q.get("sistema") : "ordem";
    var categoria = q.get("secao") === "geradores" ? "geradores" : "criaturas";
    var base = String(caminho || "/").replace(/criaturas\/?(index\.html)?$/, "");
    if (!/\/$/.test(base)) base += "/";
    return base + "catalogo/?sistema=" + encodeURIComponent(sistema) + "&categoria=" + categoria;
  }

  global.RAMAEncaminharCriaturas = { destino: destino };
  if (global.location && global.location.replace && /criaturas\/?(index\.html)?$/.test(global.location.pathname || "")) {
    global.location.replace(destino(global.location.search, global.location.pathname));
  }
})(typeof window !== "undefined" ? window : globalThis);
