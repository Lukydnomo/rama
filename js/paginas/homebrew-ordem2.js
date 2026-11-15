/* =====================================================================
   R.A.M.A. — Homebrew · Perfil e Ocupação de Ordem Paranormal RPG II (v9.21)
   ---------------------------------------------------------------------
   Uma etapa cada, na moldura dos editores de T20 (ferramentas de
   js/paginas/homebrew-origem-divindade-t20.js). Experimental, como a
   edição: a habilidade é uma do catálogo de Ordem II.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el;
  function K() { return global.RAMAOrdem2Catalogo; }
  function H() { return global.RAMAOrdem2Homebrew; }
  function F() { return global.RAMAHomebrewT20Estruturais.ferramentas; }
  function copia(x) { return JSON.parse(JSON.stringify(x)); }

  function editor(tipo, opcoes) {
    var o = opcoes || {};
    var reg = o.registro || null;
    var d = reg && reg.modelo && reg.modelo.def ? copia(reg.modelo.def) : { habilidade: "", ambientacoes: [] };
    d.ambientacoes = d.ambientacoes || [];
    var r = F().rascunho(reg);
    if (!r.descricao && d.texto) r.descricao = d.texto;
    var m;
    function mudou(rep) { r.sujo = true; if (rep) m.pintar(); else m.pintarLado(); }
    var c = F().controles(mudou);
    var rot = tipo === "perfil" ? "Perfil" : "Ocupação";
    function def() { var x = copia(d); x.nome = r.nome || rot + " Homebrew"; x.texto = r.descricao; x.homebrewId = reg ? reg.id : "rascunho"; x.chave = ""; x.id = ""; return K().normalizarHomebrew(tipo, x); }
    var habs = Object.keys(K().HABILIDADES).map(function (k) { return [k, K().HABILIDADES[k].nome]; }).sort(function (a, b) { return a[1].localeCompare(b[1]); });
    function passo() {
      return el("div.pc-editor__passo", {}, [
        el("p.t-mini", { texto: "Ordem Paranormal RPG II é experimental: o Perfil e a Ocupação seguem o formato dos playtests." }),
        c.txt("hbo2" + tipo + "-nome", "Nome", r.nome, function (v) { r.nome = v; }, tipo === "perfil" ? 40 : 60),
        c.txt("hbo2" + tipo + "-desc", "Texto", r.descricao, function (v) { r.descricao = v; }, 300, tipo === "perfil" ? "Como os do playtest: \"Age primeiro e insiste até conseguir.\"" : null, true),
        c.sel("hbo2" + tipo + "-hab", tipo === "perfil" ? "Habilidade de perfil" : "Habilidade de ocupação", [["", "Nenhuma"]].concat(habs), d.habilidade, function (v) { d.habilidade = v; }, "Entra na criação guiada, como as do catálogo."),
        tipo === "ocupacao" ? c.marcas("hbo2ocupacao-amb", "Sugerida em", Object.keys(K().AMBIENTACOES).map(function (a) { return [a, K().AMBIENTACOES[a].nome]; }), d.ambientacoes, function (k, on) { var i = d.ambientacoes.indexOf(k); if (on && i < 0) d.ambientacoes.push(k); if (!on && i >= 0) d.ambientacoes.splice(i, 1); }) : null,
        el("p.t-rotulo", { texto: "Prévia" }),
        el("ul.hbe-mini", {}, H().previa(tipo, def()).map(function (t) { return el("li", { texto: t }); })),
        m ? m.visibilidade() : null,
      ]);
    }
    m = F().moldura({ r: r, reg: reg, pref: "hbo2" + tipo, rotulo: rot.toLowerCase(), subtipo: tipo, sistema: "ordem2", aoSalvar: o.aoSalvar,
      titulo: (reg ? "Editar " : "Novo · ") + rot + " · Ordem II", rotuloSalvar: reg ? "Salvar" : "Criar " + rot.toLowerCase(),
      passos: [[rot, passo]],
      previa: function () { return H().previa(tipo, def()); },
      paraGravar: function () { var x = def(); ["chave", "id", "homebrewId", "homebrew", "nome", "texto", "vistas"].forEach(function (k) { delete x[k]; }); return x; },
      recarregar: function () { if (H()) H().carregarBiblioteca(true); },
      okCriar: rot + " criado(a). Aparece na criação de personagens de Ordem II.",
      okEditar: rot + " atualizado(a). As fichas que já usam continuam com a versão delas." });
    m.pintar();
    return m.janela;
  }

  global.RAMAHomebrewOrdem2 = { perfil: function (o) { return editor("perfil", o); }, ocupacao: function (o) { return editor("ocupacao", o); } };
})(typeof window !== "undefined" ? window : globalThis);
