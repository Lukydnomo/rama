/* =====================================================================
   R.A.M.A. — Homebrew · Classe de Tormenta20 (v9.12)
   ---------------------------------------------------------------------
   Editor por etapas, na moldura dos editores de Origem e Divindade
   (js/paginas/homebrew-origem-divindade-t20.js):

     Identidade             nome, descrição, atributo-chave, PV e PM
     Perícias e magias      fixas, à escolha, proficiências e, se a
                            classe conjura, o tipo, o atributo, a
                            progressão de círculos e quantas aprende
     Habilidades e poderes  as habilidades da tabela (cada uma num nível,
                            com efeitos e uma escolha de perícias), os
                            níveis com "Poder de <classe>" e os poderes
                            de classe (texto, efeitos, nível mínimo)
     Revisão                a prévia, a tabela, o automático e o manual

   A definição passa pelo normalizador do MOTOR (classes-c.js) antes de
   ser gravada; a ficha guarda a sua cópia ao escolher a classe.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el;
  function D() { return global.RAMATormenta20Dados; }
  function H() { return global.RAMATormenta20Homebrew; }
  function CL() { return global.RAMATormenta20Classes; }
  function F() { return global.RAMAHomebrewT20Estruturais.ferramentas; }
  function copia(x) { return JSON.parse(JSON.stringify(x)); }
  var TODOS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

  function editor(opcoes) {
    var o = opcoes || {};
    var reg = o.registro || null;
    var d = reg && reg.modelo && reg.modelo.def ? copia(reg.modelo.def) : {
      atributo: "", pv: { inicial: 16, nivel: 4 }, pm: 3,
      pericias: { fixas: [], escolha: { n: 2, de: [] } }, proficiencias: [], magias: null,
      niveisDePoder: TODOS.slice(), habilidadesDaTabela: [{ nivel: 1, nome: "", resumo: "", efeitos: [], escolhas: [] }], poderesProprios: [],
    };
    ["habilidades", "tabela", "poderes"].forEach(function (k) { delete d[k]; });
    d.pericias = d.pericias || { fixas: [], escolha: { n: 0, de: [] } };
    d.pericias.escolha = d.pericias.escolha || { n: 0, de: [] };
    d.niveisDePoder = Array.isArray(d.niveisDePoder) ? d.niveisDePoder : TODOS.slice();
    d.habilidadesDaTabela = (d.habilidadesDaTabela || []).map(function (h) { return { nivel: h.nivel || 1, nome: h.nome || "", resumo: h.resumo || "", efeitos: h.efeitos || [], escolhas: h.escolhas || [], acao: h.acao || null }; });
    d.poderesProprios = (d.poderesProprios || []).map(function (p) { return { nome: p.nome || "", resumo: p.resumo || "", efeitos: p.efeitos || [], ncMinimo: p.ncMinimo || 1, acao: p.acao || null }; });
    var r = F().rascunho(reg);
    var m;
    function mudou(rep) { r.sujo = true; if (rep) m.pintar(); else m.pintarLado(); }
    var c = F().controles(mudou);
    function def() { var x = copia(d); x.nome = r.nome || "Classe Homebrew"; x.descricao = r.descricao; x.homebrewId = reg ? reg.id : "rascunho"; x.id = ""; return CL().normalizarHomebrew(x); }
    function alterna(lista) { return function (k, on) { var i = lista.indexOf(k); if (on && i < 0) lista.push(k); if (!on && i >= 0) lista.splice(i, 1); }; }
    function niveis() { var l = []; for (var n = 1; n <= 20; n++) l.push([n, n + "º"]); return l; }

    function passo1() {
      return el("div.pc-editor__passo", {}, [
        c.txt("hbtc-nome", "Nome da classe", r.nome, function (v) { r.nome = v; }, 60),
        c.txt("hbtc-desc", "Descrição", r.descricao, function (v) { r.descricao = v; }, 1200, "O papel da classe no grupo, em poucas linhas.", true),
        c.txt("hbtc-atributo", "Atributo-chave (texto)", d.atributo, function (v) { d.atributo = v; }, 60, "Ex.: \"Destreza ou Inteligência\". Só informa: a conta usa os atributos de cada coisa."),
        el("div.editar-grade", {}, [
          c.num("hbtc-pv-ini", "PV no 1º nível (+ Con)", d.pv.inicial, function (v) { d.pv.inicial = v; }),
          c.num("hbtc-pv-niv", "PV por nível seguinte (+ Con)", d.pv.nivel, function (v) { d.pv.nivel = v; }),
          c.num("hbtc-pm", "PM por nível", d.pm, function (v) { d.pm = v; }),
        ]),
        el("p.r-ajuda", { texto: "No livro: Guerreiro 20/5 PV e 3 PM; Ladino 12/3 e 4; Arcanista 8/2 e 6." }),
      ]);
    }
    function passo2() {
      var mg = d.magias;
      var partes = [
        c.marcas("hbtc-fixas", "Perícias fixas (até 4)", c.pericias().concat([["oficio", "Ofício"]]), d.pericias.fixas, alterna(d.pericias.fixas)),
        c.sel("hbtc-esc-n", "Perícias à escolha", [[0, "Nenhuma"], [1, "1"], [2, "2"], [3, "3"], [4, "4"], [5, "5"], [6, "6"]], d.pericias.escolha.n, function (v) { d.pericias.escolha.n = Number(v); }, "Quem joga escolhe na criação, entre as marcadas abaixo."),
        d.pericias.escolha.n ? c.marcas("hbtc-esc-de", "Escolhidas entre", c.pericias().concat([["oficio", "Ofício"]]).filter(function (p) { return d.pericias.fixas.indexOf(p[0]) < 0; }), d.pericias.escolha.de, alterna(d.pericias.escolha.de)) : null,
        c.marcas("hbtc-profs", "Proficiências (além de armas simples e armaduras leves)", CL().PROFS_HB.map(function (q) { return [q, H().PROFS[q]]; }), d.proficiencias, alterna(d.proficiencias)),
        c.sel("hbtc-magias", "Magias", [["", "Não conjura"], ["arcana", "Arcanas"], ["divina", "Divinas"]], mg ? mg.tipo : "", function (v) { d.magias = v ? Object.assign({ atributo: v === "arcana" ? "int" : "sab", progressao: "completa", iniciais: 2, porNivel: 1, somaPM: true }, d.magias || {}, { tipo: v }) : null; }),
      ];
      if (mg) partes.push(el("div.editar-grade", {}, [
        c.sel("hbtc-mg-atr", "Atributo das magias", [["int", "Inteligência"], ["sab", "Sabedoria"], ["car", "Carisma"]], mg.atributo, function (v) { mg.atributo = v; }),
        c.sel("hbtc-mg-prog", "Círculos", [["completa", "Completa (1º, 5º, 9º, 13º, 17º)"], ["parcial", "Parcial (1º, 6º, 10º, 14º; até o 4º)"]], mg.progressao, function (v) { mg.progressao = v; }),
        c.sel("hbtc-mg-ini", "Magias iniciais", [[1, "1"], [2, "2"], [3, "3"], [4, "4"]], mg.iniciais, function (v) { mg.iniciais = Number(v); }),
        c.sel("hbtc-mg-niv", "Aprende por nível", [[1, "1"], [0, "nenhuma"]], mg.porNivel, function (v) { mg.porNivel = Number(v); }),
        c.sel("hbtc-mg-pm", "Soma o atributo nos PM", [["sim", "Sim"], ["nao", "Não"]], mg.somaPM === false ? "nao" : "sim", function (v) { mg.somaPM = v === "sim"; }),
      ]));
      return el("div.pc-editor__passo", {}, partes);
    }
    function passo3() {
      var partes = [el("p.t-mini", { texto: "As habilidades entram sozinhas no nível delas; nos níveis marcados, quem joga escolhe um poder de classe ou geral." }), el("p.t-rotulo", { texto: "Habilidades da tabela" })];
      d.habilidadesDaTabela.forEach(function (h, i) {
        var e = h.escolhas[0] || null;
        var modo = !e ? "" : (e.efeito && e.efeito.t === "bonus" ? "bonus" : "treino");
        partes.push(el("fieldset.r-campo.hbr-hab", {}, [
          el("legend.r-rotulo", { texto: "Habilidade " + (i + 1) }),
          el("div.editar-grade", {}, [
            c.txt("hbtc-h" + i + "-nome", "Nome", h.nome, function (v) { h.nome = v; }, 60),
            c.sel("hbtc-h" + i + "-nivel", "Nível", niveis(), h.nivel, function (v) { h.nivel = Number(v); }),
          ]),
          c.txt("hbtc-h" + i + "-texto", "Texto", h.resumo, function (v) { h.resumo = v; }, 600, null, true),
          c.efeitos(h, "hbtc-h" + i + "-ef"),
          c.ativada(h, "hbtc-h" + i + "-at"),
          el("div.editar-grade", {}, [
            c.sel("hbtc-h" + i + "-esc", "Perícias à escolha (opcional)", [["", "Nenhuma"], ["treino", "Treinadas"], ["bonus", "Com bônus"]], modo, function (v) { h.escolhas = v ? [{ tipo: "pericia", quantidade: e ? e.quantidade : 1, efeito: v === "bonus" ? { t: "bonus", valor: 2 } : { t: "treino" } }] : []; }),
            e ? c.sel("hbtc-h" + i + "-esc-q", "Quantas", [[1, "1"], [2, "2"], [3, "3"]], e.quantidade || 1, function (v) { e.quantidade = Number(v); }) : null,
            e && modo === "bonus" ? c.sel("hbtc-h" + i + "-esc-v", "Bônus", [[1, "+1"], [2, "+2"], [3, "+3"], [4, "+4"], [5, "+5"]], e.efeito.valor || 2, function (v) { e.efeito.valor = Number(v); }) : null,
          ]),
          el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Remover habilidade", onclick: function () { d.habilidadesDaTabela.splice(i, 1); mudou(true); } }),
        ]));
      });
      if (d.habilidadesDaTabela.length < 12) partes.push(el("button.r-botao.r-botao--mini", { type: "button", id: "hbtc-mais-hab", texto: "+ Habilidade", onclick: function () { d.habilidadesDaTabela.push({ nivel: 1, nome: "", resumo: "", efeitos: [], escolhas: [] }); mudou(true); } }));
      partes.push(c.marcas("hbtc-niveis-poder", "Níveis com \"Poder de " + (r.nome || "classe") + "\"", niveis(), d.niveisDePoder, alterna(d.niveisDePoder), "No livro, quase todas as classes ganham um poder do 2º ao 20º nível."));
      partes.push(el("p.t-rotulo", { texto: "Poderes de classe (Aumento de Atributo e os poderes gerais entram sozinhos)" }));
      d.poderesProprios.forEach(function (p, i) {
        partes.push(el("fieldset.r-campo.hbr-hab", {}, [
          el("legend.r-rotulo", { texto: "Poder " + (i + 1) }),
          el("div.editar-grade", {}, [
            c.txt("hbtc-p" + i + "-nome", "Nome", p.nome, function (v) { p.nome = v; }, 60),
            c.sel("hbtc-p" + i + "-nc", "A partir do nível na classe", niveis(), p.ncMinimo, function (v) { p.ncMinimo = Number(v); }),
          ]),
          c.txt("hbtc-p" + i + "-texto", "Texto", p.resumo, function (v) { p.resumo = v; }, 600, null, true),
          c.efeitos(p, "hbtc-p" + i + "-ef"),
          c.ativada(p, "hbtc-p" + i + "-at"),
          el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Remover poder", onclick: function () { d.poderesProprios.splice(i, 1); mudou(true); } }),
        ]));
      });
      if (d.poderesProprios.length < 12) partes.push(el("button.r-botao.r-botao--mini", { type: "button", id: "hbtc-mais-poder", texto: "+ Poder de classe", onclick: function () { d.poderesProprios.push({ nome: "", resumo: "", efeitos: [], ncMinimo: 1 }); mudou(true); } }));
      return el("div.pc-editor__passo", {}, partes);
    }
    function passo4() {
      var x = def();
      var linhas = [];
      for (var n = 1; n <= 20; n++) linhas.push(n + "º: " + (x.tabela[n].map(function (hid) { return x.habilidades[hid].nome; }).join(", ") || "—"));
      var auto = ["PV, PM, perícias fixas e proficiências (as perícias e proficiências só na classe inicial, como no livro)."];
      if (x.magias) auto.push("Círculo máximo, CD e PM das magias pelo atributo escolhido.");
      x.habilidadesDaTabela.filter(function (h) { return h.efeitos.length; }).forEach(function (h) { auto.push(h.nome + ": " + h.efeitos.map(H().textoEfeito).join(", ") + "."); });
      var escolha = [x.pericias.escolha.n ? x.pericias.escolha.n + " perícias da classe (na criação)." : null, "O poder de cada nível marcado."].concat(x.magias ? ["As magias iniciais e as aprendidas por nível (aba Magias)."] : []).concat(x.habilidadesDaTabela.filter(function (h) { return h.escolhas; }).map(function (h) { return h.nome + ": " + H().textoEscolha(h.escolhas[0]) + "."; })).filter(Boolean);
      return el("div.pc-editor__passo", {}, [].concat(
        m.lista("Prévia", H().previaClasse(x)),
        m.lista("Tabela", linhas),
        m.lista("Automático", auto),
        m.lista("Escolha de quem joga", escolha),
        m.lista("Decisão da mesa", ["O que o texto das habilidades e dos poderes descreve além dos efeitos."]),
        [m.visibilidade()]
      ));
    }
    m = F().moldura({ r: r, reg: reg, pref: "hbtc", rotulo: "classe", subtipo: "classe", aoSalvar: o.aoSalvar,
      titulo: (reg ? "Editar classe" : "Nova classe") + " · Tormenta20", rotuloSalvar: reg ? "Salvar classe" : "Criar classe",
      passos: [["Identidade", passo1], ["Perícias e magias", passo2], ["Habilidades e poderes", passo3], ["Revisão", passo4]],
      previa: function () { return H().previaClasse(def()); },
      paraGravar: function () { var x = F().limpar(def()); ["habilidades", "tabela", "poderes"].forEach(function (k) { delete x[k]; }); x.poderesProprios.forEach(function (p) { delete p.id; }); return x; },
      okCriar: "Classe criada. Ela aparece na criação de personagem de Tormenta20 e ao subir de nível.",
      okEditar: "Classe atualizada. As fichas que já a usam continuam com a versão delas." });
    m.pintar();
    return m.janela;
  }

  global.RAMAHomebrewClasseT20 = { editor: editor };
})(typeof window !== "undefined" ? window : globalThis);
