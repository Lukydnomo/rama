/* =====================================================================
   R.A.M.A. — Ordem Paranormal · catálogo de elementos (v9.8)
   ---------------------------------------------------------------------
   Os cinco elementos oficiais e os elementos HOMEBREW de Ordem, num
   catálogo só. Separa duas perguntas que antes eram a mesma lista fixa:

     aceito(k)     o CAMPO aceita este elemento? (ritual, criatura,
                   item, poder, maldição) — oficiais + Homebrew
     oficial(k)    há REGRA OFICIAL para ele? — só os cinco. Regras do
                   livro (requisito de Sangue, afinidade sem Medo,
                   Opressão, horda, Arquivos) continuam olhando para os
                   oficiais e NUNCA herdam nada de um Homebrew pela cor
                   ou pelo nome.

   Um elemento Homebrew:
     { chave: "hbe-<slug>-<id>", nome, descricao, cor, simbolo,
       forteContra: [], fracoContra: [], permiteAfinidade, homebrewId }
   Ele é temático por padrão: relações e afinidade só valem se a mesa
   configurou E se a regra que pergunta aceita Homebrew.

   A definição viaja COPIADA em quem a usa (`elementosHomebrew` no
   bloco de um ritual ou criatura; `ordem.homebrew.elementos` na ficha):
   renomear ou apagar na biblioteca não quebra nada. Uma chave `hbe-…`
   sem definição (arquivo incompleto) continua aceita como REFERÊNCIA
   PENDENTE — aparece identificada, e não vira Medo nem "sem elemento".
   ===================================================================== */

(function (global) {
  "use strict";

  var OFICIAIS = [
    { chave: "conhecimento", nome: "Conhecimento", cor: "#c9a227" },
    { chave: "energia", nome: "Energia", cor: "#7b2cbf" },
    { chave: "morte", nome: "Morte", cor: "#3d3d3d" },
    { chave: "sangue", nome: "Sangue", cor: "#a4161a" },
    { chave: "medo", nome: "Medo", cor: "#e8e8e8" },
  ];
  var CHAVES_OFICIAIS = OFICIAIS.map(function (e) { return e.chave; });
  var PADRAO_HB = /^hbe-[a-z0-9-]{3,60}$/;
  var registro = {};

  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  function texto(v, max) { return String(v === undefined || v === null ? "" : v).slice(0, max || 200); }

  function ehHomebrew(k) { return PADRAO_HB.test(String(k || "")); }
  function oficial(k) { return CHAVES_OFICIAIS.indexOf(k) >= 0; }
  function aceito(k) { return oficial(k) || ehHomebrew(k); }
  function def(k) {
    if (oficial(k)) return OFICIAIS.filter(function (e) { return e.chave === k; })[0];
    return registro[k] || null;
  }
  function pendente(k) { return ehHomebrew(k) && !registro[k]; }
  function nome(k) {
    var d = def(k);
    if (d) return d.nome;
    if (ehHomebrew(k)) return "Elemento Homebrew não encontrado (" + k + ")";
    return String(k || "");
  }
  function cor(k) { var d = def(k); return d && d.cor ? d.cor : "#888888"; }

  function chaveNova(nomeEl, homebrewId) {
    var slug = String(nomeEl || "elemento").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "elemento";
    var id = String(homebrewId || Math.random().toString(36).slice(2)).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
    return "hbe-" + slug + "-" + id;
  }
  function normalizar(bruto) {
    var b = obj(bruto);
    var chave = ehHomebrew(b.chave) ? b.chave : chaveNova(b.nome, b.homebrewId);
    var c = /^#[0-9a-fA-F]{6}$/.test(String(b.cor || "")) ? String(b.cor).toLowerCase() : "#5c7c8a";
    var lista = function (v) { return (Array.isArray(v) ? v : []).map(String).filter(function (k, i, l) { return aceito(k) && k !== chave && l.indexOf(k) === i; }).slice(0, 10); };
    return {
      chave: chave, nome: texto(b.nome, 40).trim() || "Elemento", descricao: texto(b.descricao, 1200), cor: c,
      simbolo: texto(b.simbolo, 4), forteContra: lista(b.forteContra), fracoContra: lista(b.fracoContra),
      permiteAfinidade: b.permiteAfinidade === true, homebrewId: texto(b.homebrewId, 80), homebrew: true,
    };
  }
  function registrar(d) {
    if (!d || !ehHomebrew(d.chave)) return null;
    var n = normalizar(d);
    registro[n.chave] = n;
    return n;
  }
  /* Um mapa { chave: def } (o que viaja copiado num ritual, criatura ou ficha). */
  function registrarMapa(m) {
    var saida = {};
    Object.keys(obj(m)).forEach(function (k) { if (ehHomebrew(k)) { var n = registrar(Object.assign({}, m[k], { chave: k })); if (n) saida[k] = n; } });
    return saida;
  }
  /* As cópias das definições que uma lista de chaves usa (para guardar
     junto do ritual, da criatura ou do item). */
  function copiasPara(chaves) {
    var m = {};
    (Array.isArray(chaves) ? chaves : [chaves]).forEach(function (k) { if (registro[k]) m[k] = JSON.parse(JSON.stringify(registro[k])); });
    return m;
  }
  /* A lista para um seletor: os oficiais e os Homebrew conhecidos. */
  function paraSelecao(opcoes) {
    var o = opcoes || {};
    var hb = Object.keys(registro).map(function (k) { return registro[k]; }).sort(function (a, b) { return a.nome.localeCompare(b.nome, "pt-BR"); });
    var oficiais = OFICIAIS.filter(function (e) { return !o.semMedo || e.chave !== "medo"; });
    if (o.afinidade) hb = hb.filter(function (e) { return e.permiteAfinidade; });
    return oficiais.map(function (e) { return { chave: e.chave, nome: e.nome, oficial: true }; }).concat(hb.map(function (e) { return { chave: e.chave, nome: e.nome, oficial: false, cor: e.cor }; }));
  }
  /* Relação entre dois elementos: só as oficiais (C.OPRESSAO, fora daqui)
     ou as que a mesa configurou no Homebrew. Nunca herdada. */
  function relacaoHomebrew(atacante, alvo) {
    var a = registro[atacante];
    if (!a) return "";
    if (a.forteContra.indexOf(alvo) >= 0) return "forte";
    if (a.fracoContra.indexOf(alvo) >= 0) return "fraco";
    return "";
  }

  global.RAMAOrdemElementos = {
    OFICIAIS: OFICIAIS, CHAVES_OFICIAIS: CHAVES_OFICIAIS,
    oficial: oficial, aceito: aceito, ehHomebrew: ehHomebrew, pendente: pendente, def: def, nome: nome, cor: cor,
    chaveNova: chaveNova, normalizar: normalizar, registrar: registrar, registrarMapa: registrarMapa, copiasPara: copiasPara,
    paraSelecao: paraSelecao, relacaoHomebrew: relacaoHomebrew,
    _limpar: function () { registro = {}; },
  };
})(typeof window !== "undefined" ? window : globalThis);
