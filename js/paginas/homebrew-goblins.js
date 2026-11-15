/* =====================================================================
   R.A.M.A. — Homebrew · Ocupação e Descritor de Malditos Goblins (v9.17)
   ---------------------------------------------------------------------
   Dois editores por etapas, na moldura dos editores de T20
   (js/paginas/homebrew-origem-divindade-t20.js, ferramentas):

     Ocupação   nome, descrição, o modificador de atributo, até três
                opções de equipamento inicial (itens do catálogo) e as
                três técnicas (nível 1, 2 e 3; "1 vez por dia" opcional)
     Descritor  nome, modificadores (−2 a +2) ou "escolha um atributo
                para +1" (como o Supimpa), e um texto

   A definição passa pelo normalizador do catálogo (js/goblins/catalogo.js).
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el;
  function C() { return global.RAMAGoblinsCatalogo; }
  function H() { return global.RAMAGoblinsHomebrew; }
  function F() { return global.RAMAHomebrewT20Estruturais.ferramentas; }
  function copia(x) { return JSON.parse(JSON.stringify(x)); }
  function valores(min, max) { var l = []; for (var n = min; n <= max; n++) l.push([n, n > 0 ? "+" + n : n < 0 ? "–" + Math.abs(n) : "0"]); return l; }

  function ocupacao(opcoes) {
    var o = opcoes || {};
    var reg = o.registro || null;
    var d = reg && reg.modelo && reg.modelo.def ? copia(reg.modelo.def) : { mod: { combate: 1 }, equipamento: [], tecnicas: [1, 2, 3].map(function (n) { return { nivel: n, nome: "", texto: "" }; }) };
    d.mod = d.mod || {};
    d.equipamento = (d.equipamento || []).map(function (e) { return { rotulo: e.rotulo || "", itens: (e.itens || []).slice() }; });
    d.tecnicas = [1, 2, 3].map(function (n, i) { var t = (d.tecnicas || [])[i] || {}; return { nivel: n, nome: t.nome || "", texto: t.texto || "", uso: t.uso || "" }; });
    var r = F().rascunho(reg);
    var m;
    function mudou(rep) { r.sujo = true; if (rep) m.pintar(); else m.pintarLado(); }
    var c = F().controles(mudou);
    function def() { var x = copia(d); x.nome = r.nome || "Ocupação Homebrew"; x.descricao = r.descricao; x.homebrewId = reg ? reg.id : "rascunho"; x.chave = ""; return C().normalizarOcupacaoHomebrew(x); }
    function itens() {
      var l = [];
      [["ARMAS", "arma"], ["PROTECOES", "proteção"], ["EQUIPAMENTOS", "equipamento"]].forEach(function (g) { Object.keys(C()[g[0]]).forEach(function (k) { l.push([k, C()[g[0]][k].nome + " (" + g[1] + ")"]); }); });
      return l;
    }
    function passo1() {
      return el("div.pc-editor__passo", {}, [
        c.txt("hbgo-nome", "Nome da ocupação", r.nome, function (v) { r.nome = v; }, 60),
        c.txt("hbgo-desc", "Descrição", r.descricao, function (v) { r.descricao = v; }, 1200, "O que esse goblin faz da vida.", true),
        el("div.hbr-atributos", {}, C().ATRIBUTOS.map(function (a) {
          return c.sel("hbgo-mod-" + a.chave, a.nome, valores(-1, 2), d.mod[a.chave] || 0, function (v) { var n = Number(v); if (n) d.mod[a.chave] = n; else delete d.mod[a.chave]; });
        })),
        el("p.r-ajuda", { texto: "No livro, cada ocupação dá +1 num atributo (o Mercenário, em Combate)." }),
      ]);
    }
    function passo2() {
      var todos = itens();
      var partes = [el("p.t-mini", { texto: "Quem joga escolhe uma opção de equipamento na criação, como no livro (Espada e Escudo, ou 2 Machadinhas…)." })];
      d.equipamento.forEach(function (e, i) {
        partes.push(el("fieldset.r-campo.hbr-hab", {}, [
          el("legend.r-rotulo", { texto: "Opção " + (i + 1) }),
          c.txt("hbgo-eq" + i + "-rot", "Rótulo (opcional)", e.rotulo, function (v) { e.rotulo = v; }, 60),
          el("div.editar-grade", {}, [0, 1, 2].map(function (j) {
            return c.sel("hbgo-eq" + i + "-it" + j, "Item " + (j + 1), [["", "—"]].concat(todos), e.itens[j] || "", function (v) { var l = e.itens.slice(); l[j] = v; e.itens = l.filter(Boolean); });
          })),
          el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Remover opção", onclick: function () { d.equipamento.splice(i, 1); mudou(true); } }),
        ]));
      });
      if (d.equipamento.length < 3) partes.push(el("button.r-botao.r-botao--mini", { type: "button", id: "hbgo-mais-eq", texto: "+ Opção de equipamento", onclick: function () { d.equipamento.push({ rotulo: "", itens: [] }); mudou(true); } }));
      partes.push(el("p.t-rotulo", { texto: "Técnicas" }));
      d.tecnicas.forEach(function (t, i) {
        partes.push(el("fieldset.r-campo.hbr-hab", {}, [
          el("legend.r-rotulo", { texto: "Nível " + t.nivel }),
          c.txt("hbgo-t" + i + "-nome", "Nome", t.nome, function (v) { t.nome = v; }, 60),
          c.txt("hbgo-t" + i + "-texto", "Texto", t.texto, function (v) { t.texto = v; }, 600, null, true),
          c.sel("hbgo-t" + i + "-uso", "Uso", [["", "Sempre"], ["dia", "1 vez por dia (a ficha marca)"]], t.uso, function (v) { t.uso = v; }),
        ]));
      });
      return el("div.pc-editor__passo", {}, partes);
    }
    function passo3() {
      var x = def();
      return el("div.pc-editor__passo", {}, [].concat(
        m.lista("Prévia", H().previaOcupacao(x)),
        m.lista("Automático", ["O modificador entra nos atributos; as técnicas chegam no nível delas; as de 1 vez por dia ganham o controle de uso."]),
        m.lista("Escolha de quem joga", x.equipamento.length ? ["A opção de equipamento, na criação."] : []),
        m.lista("Decisão da mesa", ["O que o texto das técnicas descreve."]),
        [m.visibilidade()]
      ));
    }
    m = F().moldura({ r: r, reg: reg, pref: "hbgo", rotulo: "ocupação", subtipo: "ocupacao", sistema: "goblins", aoSalvar: o.aoSalvar,
      titulo: (reg ? "Editar ocupação" : "Nova ocupação") + " · Malditos Goblins", rotuloSalvar: reg ? "Salvar ocupação" : "Criar ocupação",
      passos: [["Identidade", passo1], ["Equipamento e técnicas", passo2], ["Revisão", passo3]],
      previa: function () { return H().previaOcupacao(def()); },
      paraGravar: function () { var x = def(); ["chave", "homebrewId", "homebrew", "fonte", "pagina", "nome", "descricao", "escolhas"].forEach(function (k) { delete x[k]; }); x.tecnicas.forEach(function (t) { delete t.chave; }); return x; },
      recarregar: function () { if (H()) H().carregarBiblioteca(true); },
      okCriar: "Ocupação criada. Ela aparece na criação de goblins (e como ocupação épica).",
      okEditar: "Ocupação atualizada. As fichas que já a usam continuam com a versão delas." });
    m.pintar();
    return m.janela;
  }

  function descritor(opcoes) {
    var o = opcoes || {};
    var reg = o.registro || null;
    var d = reg && reg.modelo && reg.modelo.def ? copia(reg.modelo.def) : { mod: {}, escolha: false, texto: "" };
    d.mod = d.mod || {};
    var r = F().rascunho(reg);
    var m;
    function mudou(rep) { r.sujo = true; if (rep) m.pintar(); else m.pintarLado(); }
    var c = F().controles(mudou);
    function def() { var x = copia(d); x.nome = r.nome || "Descritor Homebrew"; x.homebrewId = reg ? reg.id : "rascunho"; x.chave = ""; return C().normalizarDescritorHomebrew(x); }
    function passo1() {
      return el("div.pc-editor__passo", {}, [
        c.txt("hbgd-nome", "Nome do descritor", r.nome, function (v) { r.nome = v; }, 40, "Ex.: \"Esperto\", \"Fedorento\"."),
        el("div.hbr-atributos", {}, C().ATRIBUTOS.map(function (a) {
          return c.sel("hbgd-mod-" + a.chave, a.nome, valores(-2, 2), d.mod[a.chave] || 0, function (v) { var n = Number(v); if (n) d.mod[a.chave] = n; else delete d.mod[a.chave]; });
        })),
        c.sel("hbgd-escolha", "Escolha", [["", "Sem escolha"], ["sim", "Quem joga escolhe um atributo para +1 (como Supimpa)"]], d.escolha ? "sim" : "", function (v) { d.escolha = v === "sim"; }),
        c.txt("hbgd-texto", "Texto (opcional)", d.texto, function (v) { d.texto = v; }, 300, null, true),
        el("p.t-rotulo", { texto: "Prévia" }),
        el("ul.hbe-mini", {}, H().previaDescritor(def()).map(function (t) { return el("li", { texto: t }); })),
        m ? m.visibilidade() : null,
      ]);
    }
    m = F().moldura({ r: r, reg: reg, pref: "hbgd", rotulo: "descritor", subtipo: "descritor", sistema: "goblins", aoSalvar: o.aoSalvar,
      titulo: (reg ? "Editar descritor" : "Novo descritor") + " · Malditos Goblins", rotuloSalvar: reg ? "Salvar descritor" : "Criar descritor",
      passos: [["Descritor", passo1]],
      previa: function () { return H().previaDescritor(def()); },
      paraGravar: function () { var x = def(); ["chave", "homebrewId", "homebrew", "fonte", "nome"].forEach(function (k) { delete x[k]; }); return x; },
      recarregar: function () { if (H()) H().carregarBiblioteca(true); },
      okCriar: "Descritor criado. Ele aparece na criação de goblins, depois dos do livro.",
      okEditar: "Descritor atualizado. As fichas que já o usam continuam com a versão delas." });
    m.pintar();
    return m.janela;
  }

  global.RAMAHomebrewGoblins = { ocupacao: ocupacao, descritor: descritor };
})(typeof window !== "undefined" ? window : globalThis);
