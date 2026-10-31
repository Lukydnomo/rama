/* =====================================================================
   R.A.M.A. — Ordem Paranormal · o que a ficha usa de cada fonte (v6.1)
   =====================================================================
   Desligar um suplemento não tira nada da ficha: a origem, os poderes,
   as regras, os rituais e os itens que ela já tem continuam valendo.
   Este módulo só LEVANTA o que está em uso, por fonte, para a ficha e a
   janela de suplementos dizerem "isto é de um suplemento desligado".

   A fonte vem sempre dos metadados do catálogo (o campo `fonte` da
   origem, classe, trilha, poder e regra; o item e o ritual pelo id de
   catálogo guardado na ficha). Conteúdo sem fonte identificada — escrito
   à mão, Homebrew, copiado sem rastro — não é atribuído a suplemento
   nenhum.
   ===================================================================== */

(function (global) {
  "use strict";

  function C() { return global.RAMAOrdemCatalogo; }
  function P() { return global.RAMAOrdemPoderes; }
  function OP() { return global.RAMAOrdemOpcionais; }

  var porIdItem = null, porIdRitual = null;
  function indice(dados, campo) {
    var m = {};
    ((dados && dados[campo]) || []).forEach(function (e) { if (e && e.id) m[e.id] = e; });
    return m;
  }
  function item(id) {
    if (!porIdItem) porIdItem = indice(global.RAMAOrdemItensDados, "itens");
    return porIdItem[id] || null;
  }
  function ritual(id) {
    if (!porIdRitual) porIdRitual = indice(global.RAMAOrdemRituaisDados, "rituais");
    return porIdRitual[id] || null;
  }

  /* { SIGLA: ["Origem: Mateiro", "Poder: …"] } — só fontes de suplemento
     (o livro básico e EXTRA ficam de fora). */
  function emUso(ficha) {
    var saida = {};
    var S = global.RAMASuplementos;
    function anotar(fonte, texto) {
      var f = String(fonte || "").toUpperCase();
      if (!f || !S || !S.daFonte("ordem", f)) return;
      (saida[f] = saida[f] || []);
      if (saida[f].indexOf(texto) < 0) saida[f].push(texto);
    }
    var o = ficha && ficha.ordem;
    if (o && C()) {
      var org = C().origem(o.origem); if (org) anotar(org.fonte, "Origem: " + org.nome);
      var cl = C().classe(o.classe); if (cl) anotar(cl.fonte, "Classe: " + cl.nome);
      var tr = C().trilha(o.trilha); if (tr) anotar(tr.fonte, "Trilha: " + tr.nome);
      (o.escolhas || []).forEach(function (r) {
        var p = P() && r && typeof r.valor === "string" ? P().poder(r.valor) : null;
        if (p) anotar(p.fonte, "Poder: " + p.nome);
      });
      Object.keys(o.opcionais || {}).forEach(function (k) {
        if (!o.opcionais[k] || !OP()) return;
        var rg = OP().regra(k);
        if (rg) anotar(rg.fonte, "Regra opcional: " + rg.nome);
      });
    }
    ((ficha && ficha.rituais && ficha.rituais.itens) || []).forEach(function (r) {
      var e = r && r.origemCatalogoId ? ritual(r.origemCatalogoId) : null;
      if (e) anotar(e.fonte, "Ritual: " + (r.nome || e.nome));
    });
    ((ficha && ficha.inventario && ficha.inventario.itens) || []).forEach(function (i) {
      var e = i && i.origemCatalogoId ? item(i.origemCatalogoId) : null;
      if (e) anotar(e.fonte, "Item: " + (i.nome || e.nome));
    });
    return saida;
  }

  /* Para a janela de suplementos: { idDoSuplemento: "Em uso: …" }. */
  function porSuplemento(ficha) {
    var S = global.RAMASuplementos;
    var u = emUso(ficha);
    var saida = {};
    Object.keys(u).forEach(function (f) {
      var s = S.daFonte("ordem", f);
      if (!s) return;
      var l = u[f];
      saida[s.id] = "Em uso nesta ficha: " + l.slice(0, 4).join("; ") + (l.length > 4 ? " e mais " + (l.length - 4) : "") + ". Continua valendo mesmo desligado.";
    });
    return saida;
  }

  /* O que está em uso e cuja fonte está desligada no contexto atual. */
  function desligadosEmUso(ficha) {
    var u = emUso(ficha);
    var Cat = C();
    return Object.keys(u).filter(function (f) { return Cat && Cat.fonteLiberada && !Cat.fonteLiberada(f); })
      .map(function (f) { return { fonte: f, nome: Cat.nomeDoLivro(f), itens: u[f], motivo: Cat.motivoDaFonte(f) }; });
  }

  global.RAMAOrdemFontesEmUso = { emUso: emUso, porSuplemento: porSuplemento, desligadosEmUso: desligadosEmUso };
})(typeof window !== "undefined" ? window : globalThis);
