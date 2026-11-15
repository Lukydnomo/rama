/* =====================================================================
   R.A.M.A. — Homebrew · Clã, Predador, Disciplina, Vantagem e Defeito de
   Vampiro: A Máscara (v9.20)
   ---------------------------------------------------------------------
   Na moldura dos editores de T20 (ferramentas de
   js/paginas/homebrew-origem-divindade-t20.js). A definição passa pelos
   normalizadores do motor (catalogo.js, disciplinas-dados.js).
   Vantagem e Defeito são o mesmo tipo ("vantagem"), com o tipo dentro.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el;
  function C() { return global.RAMAVampiroCatalogo; }
  function DS() { return global.RAMAVampiroDisciplinas; }
  function H() { return global.RAMAVampiroHomebrew; }
  function F() { return global.RAMAHomebrewT20Estruturais.ferramentas; }
  function copia(x) { return JSON.parse(JSON.stringify(x)); }
  var ROT = { cla: "Clã", predador: "Predador", disciplina: "Disciplina", vantagem: "Vantagem", defeito: "Defeito" };

  function editor(qual, opcoes) {
    var o = opcoes || {};
    var reg = o.registro || null;
    var tipo = qual === "defeito" ? "vantagem" : qual;
    var padrao = {
      cla: { disciplinas: [], perdicao: { texto: "" }, compulsao: { nome: "", penalidade: 2, termina: "" } },
      predador: { especializacoes: [], disciplinas: [], humanidade: 0, vantagens: [], defeitos: [], parada: [] },
      disciplina: { tipo: "mental", ressonancia: "", poderesHb: [{ nivel: 1, nome: "", checagens: 0, atributo: "", duracao: "cena", efeito: "" }] },
      vantagem: { tipo: qual === "defeito" ? "defeito" : "qualidade", niveis: [1], texto: "" },
    }[tipo];
    var d = reg && reg.modelo && reg.modelo.def ? copia(reg.modelo.def) : copia(padrao);
    if (tipo === "vantagem" && reg) qual = d.tipo === "defeito" ? "defeito" : "vantagem";
    var r = F().rascunho(reg);
    var m;
    function mudou(rep) { r.sujo = true; if (rep) m.pintar(); else m.pintarLado(); }
    var c = F().controles(mudou);
    function def() {
      var x = copia(d); x.nome = r.nome || ROT[qual] + " Homebrew"; x.homebrewId = reg ? reg.id : "rascunho"; x.chave = "";
      if (tipo === "cla" || tipo === "predador") x.descricao = r.descricao;
      if (tipo === "vantagem") x.texto = r.descricao;
      return tipo === "disciplina" ? DS().normalizarDisciplinaHomebrew(x) : C().normalizarHomebrew(tipo, x);
    }
    var discs = function () { return Object.keys(DS().DISCIPLINAS).filter(function (k) { return k !== "alquimia"; }).map(function (k) { return [k, DS().DISCIPLINAS[k].nome + (DS().DISCIPLINAS[k].homebrew ? " (Homebrew)" : "")]; }); };
    var habs = function () { return C().HABILIDADES.map(function (h) { return [h.chave, h.nome]; }); };
    var atrs = function () { return C().ATRIBUTOS.map(function (a) { return [a.chave, a.nome]; }); };
    var clas = function () { return Object.keys(C().CLAS).map(function (k) { return [k, C().CLAS[k].nome]; }); };
    function alterna(l) { return function (k, on) { var i = l.indexOf(k); if (on && i < 0) l.push(k); if (!on && i >= 0) l.splice(i, 1); }; }
    function identidade(extra) {
      return [c.txt("hbv" + qual + "-nome", "Nome", r.nome, function (v) { r.nome = v; }, 40),
        c.txt("hbv" + qual + "-desc", tipo === "vantagem" ? "Texto" : "Descrição", r.descricao, function (v) { r.descricao = v; }, 600, null, true)].concat(extra || []);
    }
    var corpo;
    if (tipo === "cla") corpo = function () {
      return el("div.pc-editor__passo", {}, identidade([
        c.marcas("hbvcla-disc", "Disciplinas do clã (três)", discs(), d.disciplinas, alterna(d.disciplinas), "Disciplinas Homebrew aparecem aqui depois de criadas."),
        c.txt("hbvcla-perd", "Perdição (texto)", d.perdicao.texto, function (v) { d.perdicao.texto = v; }, 600, "A ficha mostra; a mesa aplica a Gravidade da Perdição.", true),
        el("fieldset.r-campo.hbr-hab", {}, [el("legend.r-rotulo", { texto: "Compulsão" }),
          el("div.editar-grade", {}, [c.txt("hbvcla-comp-nome", "Nome", d.compulsao.nome, function (v) { d.compulsao.nome = v; }, 40), c.sel("hbvcla-comp-pen", "Penalidade", [[1, "−1 dado"], [2, "−2 dados"], [3, "−3 dados"]], d.compulsao.penalidade, function (v) { d.compulsao.penalidade = Number(v); }, "Em todas as paradas, como a Rebelião.")]),
          c.txt("hbvcla-comp-fim", "Termina quando", d.compulsao.termina, function (v) { d.compulsao.termina = v; }, 300, null, true)]),
      ]));
    };
    if (tipo === "predador") corpo = function () {
      var par = (d.parada[0] || ["", ""]);
      var partes = identidade([el("p.t-mini", { texto: "Quem joga escolhe uma especialização e uma Disciplina (+1 ponto), como nos Predadores do livro." })]);
      [0, 1].forEach(function (i) {
        var e = d.especializacoes[i] || { habilidade: "", nome: "" };
        partes.push(el("div.editar-grade", {}, [
          c.sel("hbvpred-esp" + i + "-hab", "Especialização " + (i + 1) + ": Habilidade", [["", "—"]].concat(habs()), e.habilidade, function (v) { var l = d.especializacoes.slice(); l[i] = Object.assign({}, e, { habilidade: v }); d.especializacoes = l.filter(function (x) { return x && x.habilidade; }); }),
          c.txt("hbvpred-esp" + i + "-nome", "Nome", e.nome, function (v) { var l = d.especializacoes.slice(); l[i] = Object.assign({}, e, { nome: v }); d.especializacoes = l.filter(function (x) { return x && x.habilidade; }); }, 40),
        ]));
      });
      partes.push(c.marcas("hbvpred-disc", "Disciplinas (duas)", discs(), d.disciplinas, alterna(d.disciplinas)));
      partes.push(c.sel("hbvpred-hum", "Humanidade", [[-2, "−2"], [-1, "−1"], [0, "0"], [1, "+1"], [2, "+2"]], d.humanidade, function (v) { d.humanidade = Number(v); }));
      var quals = Object.keys(C().VANTAGENS).filter(function (k) { return C().VANTAGENS[k].tipo === "qualidade" && !C().VANTAGENS[k].homebrew; }).map(function (k) { return [k, C().VANTAGENS[k].nome]; });
      var defs = Object.keys(C().VANTAGENS).filter(function (k) { return C().VANTAGENS[k].tipo === "defeito" && !C().VANTAGENS[k].homebrew; }).map(function (k) { return [k, C().VANTAGENS[k].nome]; });
      [["vantagens", quals, "Vantagem que dá"], ["defeitos", defs, "Defeito que dá"]].forEach(function (g) {
        var v = d[g[0]][0] || { chave: "", pontos: 1 };
        partes.push(el("div.editar-grade", {}, [
          c.sel("hbvpred-" + g[0], g[2], [["", "Nenhum"]].concat(g[1]), v.chave, function (k) { d[g[0]] = k ? [{ chave: k, pontos: v.pontos || 1 }] : []; }),
          v.chave ? c.sel("hbvpred-" + g[0] + "-pts", "Pontos", [[1, "1"], [2, "2"], [3, "3"]], v.pontos, function (n) { d[g[0]][0].pontos = Number(n); }) : null,
        ]));
      });
      partes.push(el("div.editar-grade", {}, [
        c.sel("hbvpred-par-atr", "Caça: Atributo", [["", "—"]].concat(atrs()), par[0], function (v) { d.parada = v ? [[v, par[1] || C().HABILIDADES[0].chave]] : []; }),
        c.sel("hbvpred-par-hab", "Caça: Habilidade", [["", "—"]].concat(habs()), par[1], function (v) { if (d.parada[0]) d.parada[0][1] = v; }),
      ]));
      partes.push(c.marcas("hbvpred-proib", "Proibido para (opcional)", clas(), d.proibidoPara || [], function (k, on) { d.proibidoPara = d.proibidoPara || []; alterna(d.proibidoPara)(k, on); }));
      return el("div.pc-editor__passo", {}, partes);
    };
    if (tipo === "disciplina") corpo = function () {
      var partes = identidade([el("div.editar-grade", {}, [
        c.sel("hbvdisc-tipo", "Tipo", [["mental", "Mental"], ["fisica", "Física"]], d.tipo, function (v) { d.tipo = v; }, "Estacado só usa mentais; em frenesi, só físicas."),
        c.sel("hbvdisc-res", "Ressonância", [["", "—"], ["animal", "Animal"], ["fleumatica", "Fleumática"], ["colerica", "Colérica"], ["melancolica", "Melancólica"], ["sanguinea", "Sanguínea"]], d.ressonancia, function (v) { d.ressonancia = v; }),
      ]), el("p.t-rotulo", { texto: "Poderes" })]);
      d.poderesHb.forEach(function (p, i) {
        partes.push(el("fieldset.r-campo.hbr-hab", {}, [el("legend.r-rotulo", { texto: "Poder " + (i + 1) }),
          el("div.editar-grade", {}, [
            c.txt("hbvdisc-p" + i + "-nome", "Nome", p.nome, function (v) { p.nome = v; }, 60),
            c.sel("hbvdisc-p" + i + "-niv", "Nível", [1, 2, 3, 4, 5].map(function (n) { return [n, "●".repeat(n)]; }), p.nivel, function (v) { p.nivel = Number(v); }),
            c.sel("hbvdisc-p" + i + "-cus", "Custo", [[0, "Grátis"], [1, "1 Checagem"], [2, "2 Checagens"], [3, "3 Checagens"]], p.checagens, function (v) { p.checagens = Number(v); }),
            c.sel("hbvdisc-p" + i + "-atr", "Parada", [["", "Sem teste"]].concat(atrs().map(function (a) { return [a[0], a[1] + " + Disciplina"]; })), p.atributo, function (v) { p.atributo = v; }),
            c.sel("hbvdisc-p" + i + "-dur", "Duração", Object.keys(H().DURACOES).map(function (k) { return [k, H().DURACOES[k]]; }), p.duracao, function (v) { p.duracao = v; }),
          ]),
          c.txt("hbvdisc-p" + i + "-ef", "Efeito", p.efeito, function (v) { p.efeito = v; }, 600, "O motor cobra as Checagens, rola a parada e marca a duração; o efeito é da mesa.", true),
          el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Remover poder", onclick: function () { d.poderesHb.splice(i, 1); mudou(true); } }),
        ]));
      });
      if (d.poderesHb.length < 10) partes.push(el("button.r-botao.r-botao--mini", { type: "button", id: "hbvdisc-mais", texto: "+ Poder", onclick: function () { d.poderesHb.push({ nivel: 1, nome: "", checagens: 0, atributo: "", duracao: "cena", efeito: "" }); mudou(true); } }));
      return el("div.pc-editor__passo", {}, partes);
    };
    if (tipo === "vantagem") corpo = function () {
      return el("div.pc-editor__passo", {}, identidade([
        c.marcas("hbvvant-niveis", "Pontos possíveis", [1, 2, 3, 4, 5].map(function (n) { return [n, "●".repeat(n)]; }), d.niveis, alterna(d.niveis)),
        c.sel("hbvvant-social", "Efeito em paradas Sociais (opcional)", [[0, "Nenhum"], [-3, "−3 dados"], [-2, "−2 dados"], [-1, "−1 dado"], [1, "+1 dado"], [2, "+2 dados"], [3, "+3 dados"]], (d.efeito || {}).social || 0, function (v) { var n = Number(v); if (n) d.efeito = { social: n }; else delete d.efeito; }, "Como Belo/Feio: entra nas paradas Sociais relevantes."),
        c.marcas("hbvvant-proib", "Proibido para (opcional)", clas(), d.proibidoPara || [], function (k, on) { d.proibidoPara = d.proibidoPara || []; alterna(d.proibidoPara)(k, on); }),
      ]));
    };
    var passos = [[ROT[qual], corpo], ["Revisão", function () {
      return el("div.pc-editor__passo", {}, [].concat(m.lista("Prévia", H().previa(tipo, def())), m.lista("Decisão da mesa", ["O que o texto descreve além do que a ficha calcula."]), [m.visibilidade()]));
    }]];
    m = F().moldura({ r: r, reg: reg, pref: "hbv" + qual, rotulo: ROT[qual].toLowerCase(), subtipo: tipo, sistema: "vampiro", aoSalvar: o.aoSalvar,
      titulo: (reg ? "Editar " : "Novo · ") + ROT[qual] + " · Vampiro", rotuloSalvar: reg ? "Salvar" : "Criar " + ROT[qual].toLowerCase(),
      passos: passos,
      previa: function () { return H().previa(tipo, def()); },
      paraGravar: function () { var x = def(); ["chave", "homebrewId", "homebrew", "nome", "pagina", "descricao"].forEach(function (k) { delete x[k]; }); if (x.compulsao) delete x.compulsao.chave; if (tipo === "vantagem") { delete x.texto; delete x.grupo; } return x; },
      recarregar: function () { if (H()) H().carregarBiblioteca(true); },
      okCriar: ROT[qual] + " criado(a). Aparece na criação e nas compras com XP da ficha de Vampiro.",
      okEditar: ROT[qual] + " atualizado(a). As fichas que já usam continuam com a versão delas." });
    if (H()) H().carregarBiblioteca().then(function () { m.pintar(); });
    m.pintar();
    return m.janela;
  }

  global.RAMAHomebrewVampiro = {
    cla: function (o) { return editor("cla", o); }, predador: function (o) { return editor("predador", o); }, disciplina: function (o) { return editor("disciplina", o); },
    vantagem: function (o) { return editor("vantagem", o); }, defeito: function (o) { return editor("defeito", o); },
  };
})(typeof window !== "undefined" ? window : globalThis);
