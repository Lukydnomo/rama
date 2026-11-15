/* =====================================================================
   R.A.M.A. — Homebrew · Papel, Motivação, Mazela e Fardo de Oblívio (v9.19)
   ---------------------------------------------------------------------
   Na moldura dos editores de T20 (ferramentas de
   js/paginas/homebrew-origem-divindade-t20.js):

     Papel      Identidade (nome, resumo, cor, Estresse, os 6
                Conhecimentos) → Habilidades (a Principal e até 3 Únicas:
                nome, tipo de ação e texto) → Revisão
     Motivação, Mazela, Fardo   uma etapa

   A definição passa pelo normalizador do catálogo (js/oblivio/catalogo.js).
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el;
  function C() { return global.RAMAOblivioCatalogo; }
  function H() { return global.RAMAOblivioHomebrew; }
  function F() { return global.RAMAHomebrewT20Estruturais.ferramentas; }
  function copia(x) { return JSON.parse(JSON.stringify(x)); }
  var ROT = { papel: "Papel", motivacao: "Motivação", mazela: "Mazela", fardo: "Fardo" };
  var OK = {
    papel: "Papel criado. Ele aparece na criação de Personas, com as Habilidades dele.",
    motivacao: "Motivação criada. Ela aparece na criação de Personas, depois das do livro.",
    mazela: "Mazela criada. Ela aparece em “Aplicar mazela”, na ficha.",
    fardo: "Fardo criado. Ele fica na biblioteca para a mesa aplicar.",
  };

  function editor(tipo, opcoes) {
    var o = opcoes || {};
    var reg = o.registro || null;
    var padrao = { papel: { estresse: 15, cor: "#3f7fbf", lista: [], habilidadePrincipal: { nome: "", acao: "passiva", resumo: "" }, habilidadesUnicas: [] }, motivacao: {}, mazela: { remocao: ["balsamo"] }, fardo: { acumula: false } }[tipo];
    var d = reg && reg.modelo && reg.modelo.def ? copia(reg.modelo.def) : copia(padrao);
    var r = F().rascunho(reg);
    if (tipo !== "papel" && !r.descricao && d.resumo) r.descricao = d.resumo;
    var m;
    function mudou(rep) { r.sujo = true; if (rep) m.pintar(); else m.pintarLado(); }
    var c = F().controles(mudou);
    function def() { var x = copia(d); x.nome = r.nome || ROT[tipo] + " Homebrew"; x.resumo = r.descricao; x.homebrewId = reg ? reg.id : "rascunho"; x.chave = ""; return C().normalizarHomebrew(tipo, x); }
    var acoes = Object.keys(H().ACOES).map(function (k) { return [k, H().ACOES[k]]; });
    function hab(h, id, rotulo, remover) {
      return el("fieldset.r-campo.hbr-hab", {}, [
        el("legend.r-rotulo", { texto: rotulo }),
        el("div.editar-grade", {}, [c.txt(id + "-nome", "Nome", h.nome, function (v) { h.nome = v; }, 60), c.sel(id + "-acao", "Ação", acoes, h.acao, function (v) { h.acao = v; })]),
        c.txt(id + "-texto", "Texto", h.resumo, function (v) { h.resumo = v; }, 600, null, true),
        remover ? el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Remover", onclick: remover }) : null,
      ]);
    }
    var passos;
    if (tipo === "papel") {
      passos = [["Identidade", function () {
        return el("div.pc-editor__passo", {}, [
          c.txt("hbop-nome", "Nome do Papel", r.nome, function (v) { r.nome = v; }, 40, "Como os do livro: \"Quem Vigia\"."),
          c.txt("hbop-desc", "Resumo", r.descricao, function (v) { r.descricao = v; }, 400, null, true),
          el("div.editar-grade", {}, [
            el("div.r-campo", {}, [el("label", { for: "hbop-cor", texto: "Cor" }), el("input.hbe-cor", { id: "hbop-cor", type: "color", value: d.cor || "#3f7fbf", onchange: function (ev) { d.cor = ev.target.value; mudou(); } })]),
            c.sel("hbop-est", "Limite de Estresse", [5, 10, 15, 20, 25].map(function (n) { return [n, n + " + Carne"]; }), d.estresse, function (v) { d.estresse = Number(v); }, "No livro: 10, 15 ou 20."),
          ]),
          c.marcas("hbop-lista", "Conhecimentos do Papel (seis)", C().CONHECIMENTOS.map(function (k) { return [k.chave, k.nome, k.resumo]; }), d.lista, function (k, on) { var i = d.lista.indexOf(k); if (on && i < 0) d.lista.push(k); if (!on && i >= 0) d.lista.splice(i, 1); }, "A Persona escolhe as especializações do Papel entre estes."),
        ]);
      }], ["Habilidades", function () {
        var partes = [el("p.t-mini", { texto: "A Principal vem com o Papel; as Únicas a Persona aprende ao concluir Missões. O efeito é o do texto (a mesa aplica)." }), hab(d.habilidadePrincipal, "hbop-h0", "Habilidade Principal")];
        d.habilidadesUnicas.forEach(function (h, i) { partes.push(hab(h, "hbop-h" + (i + 1), "Habilidade Única " + (i + 1), function () { d.habilidadesUnicas.splice(i, 1); mudou(true); })); });
        if (d.habilidadesUnicas.length < 3) partes.push(el("button.r-botao.r-botao--mini", { type: "button", id: "hbop-mais-hab", texto: "+ Habilidade Única", onclick: function () { d.habilidadesUnicas.push({ nome: "", acao: "regular", resumo: "" }); mudou(true); } }));
        return el("div.pc-editor__passo", {}, partes);
      }], ["Revisão", function () {
        var x = def();
        return el("div.pc-editor__passo", {}, [].concat(m.lista("Prévia", H().previa("papel", x)),
          m.lista("Automático", ["O limite de Estresse; a Habilidade Principal entra com o Papel; as especializações seguem a lista."]),
          m.lista("Decisão da mesa", ["O efeito das Habilidades (como nas do livro sem automação)."]),
          x.lista.length !== 6 ? m.lista("Atenção", ["Marque seis Conhecimentos, como nos Papéis do livro."]) : [],
          [m.visibilidade()]));
      }]];
    } else {
      passos = [[ROT[tipo], function () {
        var partes = [
          c.txt("hbo" + tipo + "-nome", "Nome", r.nome, function (v) { r.nome = v; }, 40),
          c.txt("hbo" + tipo + "-desc", "Texto", r.descricao, function (v) { r.descricao = v; }, tipo === "motivacao" ? 300 : 600, null, true),
        ];
        if (tipo === "mazela") partes.push(c.marcas("hbomz-rem", "Sai com (o resto é da mesa)", [["balsamo", "Bálsamo"], ["kitPrimeirosSocorros", "Kit de Primeiros Socorros"]], d.remocao || [], function (k, on) { d.remocao = (d.remocao || []).filter(function (x) { return x !== k; }); if (on) d.remocao.push(k); }));
        if (tipo === "fardo") partes.push(c.sel("hbofd-acumula", "Acumula?", [["nao", "Não"], ["sim", "Sim (pode vir mais de uma vez)"]], d.acumula ? "sim" : "nao", function (v) { d.acumula = v === "sim"; }));
        partes.push(el("p.t-rotulo", { texto: "Prévia" }), el("ul.hbe-mini", {}, H().previa(tipo, def()).map(function (t) { return el("li", { texto: t }); })), m ? m.visibilidade() : null);
        return el("div.pc-editor__passo", {}, partes);
      }]];
    }
    m = F().moldura({ r: r, reg: reg, pref: tipo === "papel" ? "hbop" : "hbo" + tipo, rotulo: ROT[tipo].toLowerCase(), subtipo: tipo, sistema: "oblivio", aoSalvar: o.aoSalvar,
      titulo: (reg ? "Editar " : "Novo · ") + ROT[tipo] + " · Oblívio", rotuloSalvar: reg ? "Salvar" : "Criar " + ROT[tipo].toLowerCase(),
      passos: passos,
      previa: function () { return H().previa(tipo, def()); },
      paraGravar: function () { var x = def(); ["chave", "homebrewId", "homebrew", "nome", "pag", "principal", "unicas", "processamento"].forEach(function (k) { delete x[k]; }); return x; },
      recarregar: function () { if (H()) H().carregarBiblioteca(true); },
      okCriar: OK[tipo], okEditar: ROT[tipo] + " atualizado(a). As fichas que já usam continuam com a versão delas." });
    m.pintar();
    return m.janela;
  }

  global.RAMAHomebrewOblivio = {
    papel: function (o) { return editor("papel", o); }, motivacao: function (o) { return editor("motivacao", o); },
    mazela: function (o) { return editor("mazela", o); }, fardo: function (o) { return editor("fardo", o); },
  };
})(typeof window !== "undefined" ? window : globalThis);
