/* =====================================================================
   R.A.M.A. — capa de sistema (v3.0)
   ---------------------------------------------------------------------
   Um pequeno VOLUME de livro que identifica o sistema ao lado do nome:
   a miniatura da capa (um asset local otimizado — nunca o PDF), com
   lombada discreta, borda de página e sombra controlada. Serve a
   qualquer sistema do registro (js/sistemas.js):

     RAMACapaSistema.elemento(sistema, { tamanho: "p" | "m" | "g" })

   Sistema sem capa conhecida ganha uma lombada desenhada com o nome —
   nunca uma capa inventada. A capa é DECORATIVA quando o nome do
   sistema já está escrito ao lado (o padrão): o leitor de tela ouve o
   nome uma vez só. Com { rotulada: true }, ela leva o texto alternativo.

   Use uma vez por lugar (a escolha do sistema, o cabeçalho da ficha):
   não é ícone de linha, e não compete com o retrato do personagem.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el;

  function elemento(sistema, opcoes) {
    var o = opcoes || {};
    var S = global.RAMASistemas;
    var s = typeof sistema === "string" ? (S ? S.de(sistema) : { id: sistema, nome: sistema }) : (sistema || {});
    var base = S ? (S.lista().filter(function (x) { return x.id === s.id; })[0] || s) : s;
    var tamanho = ["p", "m", "g"].indexOf(o.tamanho) >= 0 ? o.tamanho : "m";
    var capa = base.capa ? U.url(tamanho === "p" ? base.capa.replace(/\.webp$/, "-pequena.webp") : base.capa) : "";
    var atributos = {
      class: "capa-sistema--" + tamanho + (capa ? "" : " capa-sistema--sem-capa"),
      dataset: { sistema: base.id || "" },
    };
    if (!o.rotulada) atributos["aria-hidden"] = "true";
    var miolo = capa
      ? el("img.capa-sistema__imagem", {
          src: capa, alt: o.rotulada ? (base.capaAlt || "Capa de " + (base.nome || "")) : "",
          loading: "lazy", decoding: "async", width: tamanho === "p" ? 160 : 320, height: tamanho === "p" ? 240 : 480,
        })
      : el("span.capa-sistema__lombada", {}, [
          el("span.capa-sistema__inicial", { texto: String(base.curto || base.nome || "?").charAt(0) }),
          el("span.capa-sistema__titulo", { texto: base.curto || base.nome || "" }),
        ]);
    return el("span.capa-sistema", atributos, [miolo]);
  }

  global.RAMACapaSistema = { elemento: elemento };
})(window);
