/* =====================================================================
   R.A.M.A. — imagens da ficha (v9.13)
   ---------------------------------------------------------------------
   As imagens que moram FORA do fichaJson, em PERSONAGENS_IMAGENS: a
   biblioteca de retratos e as imagens das anotações. A ficha guarda só
   as refs; aqui elas viram imagem, sob demanda e uma vez só.

     obter(personagemId, refs)   → Promise<{ ref: dataURL }>
                                   pede ao servidor só o que falta, em
                                   lotes, e junta pedidos iguais em voo
     guardar(personagemId, ref, imagem)   o que acabou de subir
     esquecer(personagemId, ref)          o que foi excluído
     novaRef()                            a ref de uma imagem nova
     escolherArquivos({ multiplo })       o seletor do aparelho
     preparar(arquivo, destino)           comprime sem recorte (anotação)
     ampliar(lista, indice)               a imagem grande, com legenda

   Permissão: o servidor confere a ficha em cada pedido. Este cache é da
   página e da conta aberta — uma ref sozinha não abre nada.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el;
  var LOTE = 40;

  var cache = {};      /* personagemId → { ref → dataURL } */
  var ausentes = {};   /* personagemId → { ref → true } (pedida e não veio) */
  var emVoo = {};      /* personagemId|ref → Promise */

  function doPersonagem(id) { return cache[id] || (cache[id] = {}); }

  function ja(personagemId, ref) { return (cache[personagemId] || {})[ref] || ""; }

  function guardar(personagemId, ref, imagem) {
    if (!ref || !imagem) return;
    doPersonagem(personagemId)[ref] = imagem;
    if (ausentes[personagemId]) delete ausentes[personagemId][ref];
  }

  function esquecer(personagemId, ref) {
    if (cache[personagemId]) delete cache[personagemId][ref];
  }

  async function buscar(personagemId, refs) {
    var r = await global.RAMAApi.lerImagensPersonagem(personagemId, refs);
    var imagens = (r && r.ok && r.dados && r.dados.imagens) || {};
    refs.forEach(function (ref) {
      if (imagens[ref]) guardar(personagemId, ref, imagens[ref]);
      else if (r && r.ok) (ausentes[personagemId] || (ausentes[personagemId] = {}))[ref] = true;
    });
    return r;
  }

  /* As que já estão aqui voltam na hora; as que faltam vêm em lotes de
     40. Uma falha de rede não marca nada como ausente: a próxima pede
     de novo. */
  async function obter(personagemId, refs) {
    var pedidas = (refs || []).filter(Boolean);
    var saida = {};
    var faltam = [];
    var esperas = [];
    pedidas.forEach(function (ref) {
      if (ja(personagemId, ref)) { saida[ref] = ja(personagemId, ref); return; }
      if (ausentes[personagemId] && ausentes[personagemId][ref]) return;
      var chave = personagemId + "|" + ref;
      if (emVoo[chave]) { esperas.push(emVoo[chave]); return; }
      if (faltam.indexOf(ref) < 0) faltam.push(ref);
    });
    for (var i = 0; i < faltam.length; i += LOTE) {
      var lote = faltam.slice(i, i + LOTE);
      var p = buscar(personagemId, lote);
      lote.forEach(function (ref) { emVoo[personagemId + "|" + ref] = p; });
      esperas.push(p.then(function () {}, function () {}).then(function () {
        lote.forEach(function (ref) { delete emVoo[personagemId + "|" + ref]; });
      }));
    }
    await Promise.all(esperas.map(function (e) { return Promise.resolve(e).catch(function () {}); }));
    pedidas.forEach(function (ref) { if (ja(personagemId, ref)) saida[ref] = ja(personagemId, ref); });
    return saida;
  }

  function novaRef() { return U.uuid(); }

  /* O seletor do aparelho. Cancelar não dispara `change` em navegador
     nenhum de forma confiável: o foco voltando à janela é o sinal. */
  function escolherArquivos(opcoes) {
    var o = opcoes || {};
    return new Promise(function (ok) {
      var entrada = document.createElement("input");
      entrada.type = "file";
      entrada.accept = (global.RAMAImagem && global.RAMAImagem.TIPOS_ACEITOS || ["image/*"]).join(",");
      if (o.multiplo) entrada.multiple = true;
      entrada.style.display = "none";
      var respondido = false, escolheu = false;
      function responder(lista) {
        if (respondido) return;
        respondido = true;
        window.removeEventListener("focus", aoVoltar);
        if (entrada.parentNode) entrada.parentNode.removeChild(entrada);
        ok(lista);
      }
      entrada.addEventListener("change", function () {
        var lista = Array.prototype.slice.call(entrada.files || []);
        escolheu = lista.length > 0;
        responder(lista);
      });
      function aoVoltar() { setTimeout(function () { if (!escolheu) responder([]); }, 700); }
      window.addEventListener("focus", aoVoltar, { once: true });
      document.body.appendChild(entrada);
      entrada.click();
    });
  }

  /* Uma imagem de anotação vai inteira (sem recorte), reduzida para
     caber em 1024 px e no limite de uma célula — o mesmo codificador da
     foto. GIF animado pequeno vai como veio. */
  function preparar(arquivo) {
    return global.RAMAImagem.preparar(arquivo, { lado: 1024, quadrado: false });
  }

  /* A imagem grande: um visualizador simples, com anterior/próxima e a
     legenda. Fecha com Esc, com o X ou tocando fora. */
  function ampliar(lista, indice) {
    var itens = (lista || []).filter(function (x) { return x && x.src; });
    if (!itens.length) return;
    var i = Math.max(0, Math.min(itens.length - 1, indice || 0));
    var figura = el("figure.imagem-ampliada");
    var m = global.RAMAUI.modal({
      titulo: itens.length > 1 ? "Imagem " + (i + 1) + " de " + itens.length : "Imagem",
      conteudo: [figura],
      largo: true,
      fundoFecha: true,
      classe: "r-modal--imagem",
    });
    function pintar() {
      var x = itens[i];
      var titulo = m.janela.querySelector(".r-modal__topo .t-secao");
      if (titulo) titulo.textContent = itens.length > 1 ? "Imagem " + (i + 1) + " de " + itens.length : "Imagem";
      U.trocar(figura, [
        el("img.imagem-ampliada__img", { src: x.src, alt: x.legenda || x.alt || "Imagem" }),
        x.legenda ? el("figcaption.t-mini", { texto: x.legenda }) : null,
        itens.length > 1 ? el("div.faixa.imagem-ampliada__nav", {}, [
          el("button.r-botao.r-botao--mini", { type: "button", texto: "‹ Anterior", disabled: i === 0, onclick: function () { i--; pintar(); } }),
          el("button.r-botao.r-botao--mini", { type: "button", texto: "Próxima ›", disabled: i === itens.length - 1, onclick: function () { i++; pintar(); } }),
        ]) : null,
      ]);
    }
    m.janela.addEventListener("keydown", function (ev) {
      if (ev.key === "ArrowLeft" && i > 0) { i--; pintar(); }
      if (ev.key === "ArrowRight" && i < itens.length - 1) { i++; pintar(); }
    });
    pintar();
    return m;
  }

  global.RAMAImagensFicha = {
    obter: obter,
    ja: ja,
    guardar: guardar,
    esquecer: esquecer,
    novaRef: novaRef,
    escolherArquivos: escolherArquivos,
    preparar: preparar,
    ampliar: ampliar,
  };
})(window);
