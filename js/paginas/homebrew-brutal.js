/* =====================================================================
   R.A.M.A. — Homebrew · Arquétipo e Estilo de BRUTAL (v9.18)
   ---------------------------------------------------------------------
   Na moldura dos editores de T20 (js/paginas/homebrew-origem-divindade-t20.js):

     Arquétipo  nome, adjetivos, cor, Iniciativa (1 a 9), resumo, os dois
                Estilos (do livro ou Homebrew) e a Habilidade (nome, cena,
                recarga e texto)
     Estilo     nome e texto

   A definição passa pelo normalizador do catálogo (js/brutal/catalogo.js).
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el;
  function K() { return global.RAMABrutalCatalogo; }
  function H() { return global.RAMABrutalHomebrew; }
  function F() { return global.RAMAHomebrewT20Estruturais.ferramentas; }
  function copia(x) { return JSON.parse(JSON.stringify(x)); }

  function arquetipo(opcoes) {
    var o = opcoes || {};
    var reg = o.registro || null;
    var d = reg && reg.modelo && reg.modelo.def ? copia(reg.modelo.def) : { adjetivos: "", cor: "#5b5fc7", iniciativa: 9, estilos: [], habilidade: { nome: "", cena: "Sem restrição", recarga: "fimEncontro", texto: "" } };
    d.habilidade = d.habilidade || { nome: "", cena: "Sem restrição", recarga: "fimEncontro", texto: "" };
    d.estilos = d.estilos || [];
    var r = F().rascunho(reg);
    var m;
    function mudou(rep) { r.sujo = true; if (rep) m.pintar(); else m.pintarLado(); }
    var c = F().controles(mudou);
    function def() { var x = copia(d); x.nome = r.nome || "Arquétipo Homebrew"; x.resumo = r.descricao; x.homebrewId = reg ? reg.id : "rascunho"; x.chave = ""; return K().normalizarArquetipoHomebrew(x); }
    function estilos() { return K().estilosDisponiveis().map(function (k) { return [k, K().ESTILOS[k].nome + (K().ESTILOS[k].homebrew ? " (Homebrew)" : "")]; }); }
    function passo1() {
      return el("div.pc-editor__passo", {}, [
        c.txt("hbba-nome", "Nome do Arquétipo", r.nome, function (v) { r.nome = v; }, 40, "Ex.: \"Vlogueira\"."),
        c.txt("hbba-adj", "Adjetivos", d.adjetivos, function (v) { d.adjetivos = v; }, 80, "Três palavras, como no livro: \"Curiosa · Barulhenta · Leal\"."),
        c.txt("hbba-desc", "Resumo", r.descricao, function (v) { r.descricao = v; }, 600, null, true),
        el("div.editar-grade", {}, [
          el("div.r-campo", {}, [el("label", { for: "hbba-cor", texto: "Cor" }), el("input.hbe-cor", { id: "hbba-cor", type: "color", value: d.cor || "#5b5fc7", onchange: function (ev) { d.cor = ev.target.value; mudou(); } })]),
          c.sel("hbba-ini", "Iniciativa", [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (n) { return [n, n + "º"]; }), d.iniciativa, function (v) { d.iniciativa = Number(v); }, "No empate, o Arquétipo do livro age antes."),
        ]),
      ]);
    }
    function passo2() {
      return el("div.pc-editor__passo", {}, [
        el("div.editar-grade", {}, [0, 1].map(function (i) {
          return c.sel("hbba-est" + i, "Estilo " + (i + 1), [["", "—"]].concat(estilos()), d.estilos[i] || "", function (v) { var l = d.estilos.slice(); l[i] = v; d.estilos = l.filter(Boolean); });
        })),
        el("p.r-ajuda", { texto: "Usar um Estilo seu reduz a Dificuldade em 1; as Vantagens de Estilo do livro seguem o Estilo." }),
        el("fieldset.r-campo.hbr-hab", {}, [
          el("legend.r-rotulo", { texto: "Habilidade" }),
          c.txt("hbba-hab-nome", "Nome", d.habilidade.nome, function (v) { d.habilidade.nome = v; }, 60),
          el("div.editar-grade", {}, [
            c.txt("hbba-hab-cena", "Cena", d.habilidade.cena, function (v) { d.habilidade.cena = v; }, 40, "Ex.: \"Sem restrição\", \"Encontro\"."),
            c.sel("hbba-hab-rec", "Recarga", Object.keys(K().RECARGAS).filter(function (k) { return k !== "planejarFuga"; }).map(function (k) { return [k, K().RECARGAS[k].nome]; }), d.habilidade.recarga, function (v) { d.habilidade.recarga = v; }, "A ficha marca o uso e libera na recarga."),
          ]),
          c.txt("hbba-hab-texto", "Texto", d.habilidade.texto, function (v) { d.habilidade.texto = v; }, 600, null, true),
        ]),
      ]);
    }
    function passo3() {
      var x = def();
      return el("div.pc-editor__passo", {}, [].concat(
        m.lista("Prévia", H().previaArquetipo(x)),
        m.lista("Automático", ["Os Estilos (Dificuldade −1), a Iniciativa no Encontro e o uso da Habilidade com a recarga."]),
        m.lista("Decisão da mesa", ["O efeito da Habilidade (como nas do livro sem automação)."]),
        x.estilos.length < 2 ? m.lista("Atenção", ["Escolha dois Estilos, como nos Arquétipos do livro."]) : [],
        [m.visibilidade()]
      ));
    }
    m = F().moldura({ r: r, reg: reg, pref: "hbba", rotulo: "arquétipo", subtipo: "arquetipo", sistema: "brutal", aoSalvar: o.aoSalvar,
      titulo: (reg ? "Editar Arquétipo" : "Novo Arquétipo") + " · BRUTAL", rotuloSalvar: reg ? "Salvar Arquétipo" : "Criar Arquétipo",
      passos: [["Identidade", passo1], ["Estilos e Habilidade", passo2], ["Revisão", passo3]],
      previa: function () { return H().previaArquetipo(def()); },
      paraGravar: function () { var x = def(); ["chave", "homebrewId", "homebrew", "nome", "pagina"].forEach(function (k) { delete x[k]; }); delete x.habilidade.chave; return x; },
      recarregar: function () { if (H()) H().carregarBiblioteca(true); },
      okCriar: "Arquétipo criado. Ele aparece na criação de Sobreviventes e na troca de Arquétipo.",
      okEditar: "Arquétipo atualizado. As fichas que já o usam continuam com a versão delas." });
    if (H()) H().carregarBiblioteca().then(function () { m.pintar(); });
    m.pintar();
    return m.janela;
  }

  function estilo(opcoes) {
    var o = opcoes || {};
    var reg = o.registro || null;
    var d = reg && reg.modelo && reg.modelo.def ? copia(reg.modelo.def) : { texto: "" };
    var r = F().rascunho(reg);
    var m;
    function mudou(rep) { r.sujo = true; if (rep) m.pintar(); else m.pintarLado(); }
    var c = F().controles(mudou);
    function def() { return K().normalizarEstiloHomebrew({ nome: r.nome || "Estilo Homebrew", texto: d.texto, homebrewId: reg ? reg.id : "rascunho" }); }
    function passo1() {
      return el("div.pc-editor__passo", {}, [
        c.txt("hbbe-nome", "Nome do Estilo", r.nome, function (v) { r.nome = v; }, 40, "Ex.: \"Estiloso\"."),
        c.txt("hbbe-texto", "Para que serve", d.texto, function (v) { d.texto = v; }, 400, "Como os do livro: \"Reagir à surpresa, encarar situações incômodas…\".", true),
        el("p.t-rotulo", { texto: "Prévia" }),
        el("ul.hbe-mini", {}, H().previaEstilo(def()).map(function (t) { return el("li", { texto: t }); })),
        m ? m.visibilidade() : null,
      ]);
    }
    m = F().moldura({ r: r, reg: reg, pref: "hbbe", rotulo: "estilo", subtipo: "estilo", sistema: "brutal", aoSalvar: o.aoSalvar,
      titulo: (reg ? "Editar Estilo" : "Novo Estilo") + " · BRUTAL", rotuloSalvar: reg ? "Salvar Estilo" : "Criar Estilo",
      passos: [["Estilo", passo1]],
      previa: function () { return H().previaEstilo(def()); },
      paraGravar: function () { return { texto: def().texto }; },
      recarregar: function () { if (H()) H().carregarBiblioteca(true); },
      okCriar: "Estilo criado. Ele aparece no editor de Arquétipo e nas listas de Estilo da ficha e da mesa.",
      okEditar: "Estilo atualizado." });
    m.pintar();
    return m.janela;
  }

  /* v9.32 — os modelos de mesa: Ameaça, Apavoro e Assassino (uma etapa e
     a revisão), pelos normalizadores do catálogo. */
  function modelo(qual, opcoes) {
    var o = opcoes || {};
    var reg = o.registro || null;
    var ROT = { ameaca: "Ameaça", apavoro: "Apavoro", assassino: "Assassino" }[qual];
    var PREF = { ameaca: "hbbm", apavoro: "hbbp", assassino: "hbbk" }[qual];
    var padrao = { ameaca: { adjetivos: "", acoesUnicas: [], intentoTexto: "", intentoPh: 1 }, apavoro: { cena: "Livre", recarga: "fimEncontro", custo: 3 }, assassino: { ameacas: [], dados: 3, ph: 1, sustos: 2, acoesUnicas: [], apavoro: "" } }[qual];
    var d = reg && reg.modelo && reg.modelo.def ? copia(reg.modelo.def) : copia(padrao);
    var r = F().rascunho(reg);
    var m;
    function mudou(rep) { r.sujo = true; if (rep) m.pintar(); else m.pintarLado(); }
    var c = F().controles(mudou);
    function def() {
      var x = copia(d); x.nome = r.nome || ROT + " Homebrew"; x.homebrewId = reg ? reg.id : "rascunho"; x.chave = "";
      if (qual === "assassino") { x.resumo = r.descricao; return K().normalizarAssassinoHomebrew(x); }
      x.texto = r.descricao;
      return qual === "ameaca" ? K().normalizarAmeacaHomebrew(x) : K().normalizarApavoroHomebrew(x);
    }
    function previa() { var x = def(); return qual === "ameaca" ? H().previaAmeaca(x) : qual === "apavoro" ? H().previaApavoro(x) : H().previaAssassino(x); }
    function alterna(campo) { return function (k, on) { d[campo] = (d[campo] || []).filter(function (x) { return x !== k; }); if (on) d[campo].push(k); }; }
    var unicas = function () { return Object.keys(K().ACOES_ASSASSINO).filter(function (k) { return K().ACOES_ASSASSINO[k].tipo === "unica"; }).map(function (k) { return [k, K().ACOES_ASSASSINO[k].nome, K().ACOES_ASSASSINO[k].texto]; }); };
    function passo1() {
      var partes = [c.txt(PREF + "-nome", "Nome", r.nome, function (v) { r.nome = v; }, 40)];
      if (qual === "ameaca") {
        partes.push(c.txt(PREF + "-adj", "Adjetivos", d.adjetivos, function (v) { d.adjetivos = v; }, 80, "Três palavras, como no livro: \u201cEtérea · Macabra · Nefasta\u201d."));
        partes.push(c.txt(PREF + "-desc", "Texto", r.descricao, function (v) { r.descricao = v; }, 600, null, true));
        partes.push(c.marcas(PREF + "-unicas", "Ações Únicas da Ameaça", unicas(), d.acoesUnicas || [], alterna("acoesUnicas"), "O Assassino escolhe uma delas por Ameaça (p. 11)."));
        partes.push(c.txt(PREF + "-int", "Intento Único (opcional)", d.intentoTexto, function (v) { d.intentoTexto = v; }, 300, "Quando acontece, a Diretora marca e ganha os PH.", true));
        partes.push(c.sel(PREF + "-intph", "PH do Intento", [[1, "+1"], [2, "+2"], [3, "+3"], [4, "+4"]], d.intentoPh || 1, function (v) { d.intentoPh = Number(v); }));
      } else if (qual === "apavoro") {
        partes.push(el("div.editar-grade", {}, [
          c.sel(PREF + "-cena", "Cena", [["Livre", "Livre"], ["Encontro", "Encontro"]], d.cena, function (v) { d.cena = v; }),
          c.sel(PREF + "-rec", "Recarga", K().RECARGAS_DE_APAVORO.map(function (k) { return [k, K().RECARGAS[k].nome]; }), d.recarga, function (v) { d.recarga = v; }),
          c.num(PREF + "-custo", "Custo (PH)", d.custo, function (v) { d.custo = v; }),
        ]));
        partes.push(c.txt(PREF + "-desc", "Texto (o efeito é da mesa)", r.descricao, function (v) { r.descricao = v; }, 600, null, true));
      } else {
        var ameacas = (K().ameacasDefinidasDisponiveis ? K().ameacasDefinidasDisponiveis() : K().AMEACAS_DEFINIDAS).map(function (k) { return [k, K().AMEACAS[k].nome + (K().AMEACAS[k].homebrew ? " (Homebrew)" : "")]; });
        partes.push(el("div.editar-grade", {}, [
          c.sel(PREF + "-am0", "Ameaça Principal", [["", "—"]].concat(ameacas), (d.ameacas || [])[0] || "", function (v) { d.ameacas = [v, (d.ameacas || [])[1]].filter(Boolean); }),
          c.sel(PREF + "-am1", "Segunda Ameaça", [["", "—"]].concat(ameacas), (d.ameacas || [])[1] || "", function (v) { d.ameacas = [(d.ameacas || [])[0], v].filter(Boolean); }),
        ]));
        partes.push(el("div.editar-grade", {}, [
          c.num(PREF + "-dados", "Dados iniciais", d.dados, function (v) { d.dados = v; }),
          c.num(PREF + "-ph", "PH iniciais", d.ph, function (v) { d.ph = v; }),
          c.num(PREF + "-sustos", "Testes de Susto por Encontro", d.sustos, function (v) { d.sustos = v; }),
        ]));
        var permitidas = [];
        (d.ameacas || []).forEach(function (a) { ((K().AMEACAS[a] || {}).acoesUnicas || []).forEach(function (x) { if (permitidas.indexOf(x) < 0) permitidas.push(x); }); });
        partes.push(c.marcas(PREF + "-unicas", "Ações Únicas (das Ameaças)", unicas().filter(function (p) { return permitidas.indexOf(p[0]) >= 0; }), d.acoesUnicas || [], alterna("acoesUnicas"), permitidas.length ? "" : "Escolha as Ameaças para ver as Ações delas."));
        partes.push(c.sel(PREF + "-apv", "Apavoro", [["", "—"]].concat(Object.keys(K().APAVOROS).map(function (k) { return [k, K().APAVOROS[k].nome + (K().APAVOROS[k].homebrew ? " (Homebrew)" : "")]; })), d.apavoro, function (v) { d.apavoro = v; }));
        partes.push(c.txt(PREF + "-desc", "Resumo", r.descricao, function (v) { r.descricao = v; }, 600, null, true));
      }
      return el("div.pc-editor__passo", {}, partes);
    }
    function passo2() {
      return el("div.pc-editor__passo", {}, [].concat(m.lista("Prévia", previa()),
        m.lista("Automático", [qual === "assassino" ? "Ao escolher este Assassino na mesa: Ameaças, Ações Únicas, Apavoro, dados, PH e Testes de Susto, como os prontos." : qual === "ameaca" ? "As Ações Únicas entram no Assassino; o Intento vira um botão da Diretora." : "Pagar os PH e marcar o uso (volta pela recarga)."]),
        m.lista("Decisão da mesa", [qual === "apavoro" ? "O efeito do texto." : qual === "ameaca" ? "Quando o Intento acontece." : "O Estigma e o resto da narrativa."]),
        [m.visibilidade()]));
    }
    m = F().moldura({ r: r, reg: reg, pref: PREF, rotulo: ROT.toLowerCase(), subtipo: qual, sistema: "brutal", aoSalvar: o.aoSalvar,
      titulo: (reg ? "Editar " : "Novo · ") + ROT + " · BRUTAL", rotuloSalvar: reg ? "Salvar" : "Criar " + ROT.toLowerCase(),
      passos: [[ROT, passo1], ["Revisão", passo2]],
      previa: previa,
      paraGravar: function () { var x = def(); ["chave", "homebrewId", "homebrew", "nome", "pagina", "definida", "intento"].forEach(function (k) { delete x[k]; }); if (qual === "assassino") delete x.resumo; else delete x.texto; return x; },
      recarregar: function () { if (H()) H().carregarBiblioteca(true); },
      okCriar: ROT + " criado(a). Aparece na mesa da Diretora, ao configurar o Assassino.",
      okEditar: ROT + " atualizado(a). A mesa que já o usa continua com a cópia dela." });
    if (H()) H().carregarBiblioteca().then(function () { m.pintar(); });
    m.pintar();
    return m.janela;
  }

  global.RAMAHomebrewBrutal = { arquetipo: arquetipo, estilo: estilo,
    ameaca: function (o) { return modelo("ameaca", o); }, apavoro: function (o) { return modelo("apavoro", o); }, assassino: function (o) { return modelo("assassino", o); } };
})(typeof window !== "undefined" ? window : globalThis);
