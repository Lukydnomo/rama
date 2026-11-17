/* =====================================================================
   R.A.M.A. — Homebrew · Origem e Divindade de Tormenta20 (v9.11)
   ---------------------------------------------------------------------
   Dois editores por etapas (Identidade → Regras → Revisão), no modelo do
   editor de Raça:

     Origem     itens, as perícias e os poderes gerais de onde saem os dois
                benefícios, e o poder único (nome, texto e efeitos que o
                motor já soma)
     Divindade  título, energia, arma preferida, devotos, obrigações &
                restrições, os poderes concedidos do livro e até 3 próprios

   A definição passa pelo normalizador do MOTOR (origens.js, deuses.js)
   antes de ser gravada; a ficha guarda a sua cópia ao escolher.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var el = U.el;
  function D() { return global.RAMATormenta20Dados; }
  function H() { return global.RAMATormenta20Homebrew; }
  function A() { return global.RAMAHomebrewAdaptadores; }
  function OR() { return global.RAMATormenta20Origens; }
  function DE() { return global.RAMATormenta20Deuses; }
  function PO() { return global.RAMATormenta20Poderes; }
  function EQ() { return global.RAMATormenta20Equipamento; }
  function RA() { return global.RAMATormenta20Racas; }
  function CL() { return global.RAMATormenta20Classes; }
  function copia(x) { return JSON.parse(JSON.stringify(x)); }

  /* Os controles do editor, presos ao rascunho (mudou repinta). */
  function controles(mudou) {
    var c = {};
    c.sel = function (id, rot, pares, valor, ao, ajuda) {
      return el("div.r-campo", {}, [el("label", { for: id, texto: rot }), el("select.r-selecao", { id: id, onchange: function (ev) { ao(ev.target.value); mudou(true); } }, pares.map(function (p) { return el("option", { value: p[0], texto: p[1], selected: String(p[0]) === String(valor === undefined || valor === null ? "" : valor) }); })), ajuda ? el("p.r-ajuda", { texto: ajuda }) : null]);
    };
    c.txt = function (id, rot, valor, ao, max, ajuda, area) {
      var x = area ? el("textarea.r-area", { id: id, rows: 3, maxlength: max, oninput: function (ev) { ao(ev.target.value); mudou(); } }) : el("input.r-entrada", { id: id, value: valor || "", maxlength: max, oninput: function (ev) { ao(ev.target.value); mudou(); } });
      if (area) x.value = valor || "";
      return el("div.r-campo", {}, [el("label", { for: id, texto: rot }), x, ajuda ? el("p.r-ajuda", { texto: ajuda }) : null]);
    };
    c.num = function (id, rot, valor, ao) {
      return el("div.r-campo", {}, [el("label", { for: id, texto: rot }), el("input.r-entrada.r-entrada--numero", { id: id, inputmode: "numeric", maxlength: 3, value: String(valor || 0), oninput: function (ev) { ao(Number(ev.target.value) || 0); mudou(); }, onchange: function () { mudou(true); } })]);
    };
    c.marcas = function (id, rot, pares, atuais, ao, ajuda) {
      return el("fieldset.r-campo.hbt20-marcas", { id: id }, [el("legend.r-rotulo", { texto: rot })].concat(pares.map(function (p) {
        return el("label.r-marca", { title: p[2] || "" }, [el("input", { type: "checkbox", checked: atuais.indexOf(p[0]) >= 0, onchange: function (ev) { ao(p[0], ev.target.checked); mudou(); } }), el("span", { texto: p[1] })]);
      })).concat(ajuda ? [el("p.r-ajuda", { texto: ajuda })] : []));
    };
    c.pericias = function () { return D().PERICIAS.filter(function (p) { return p.chave !== "oficio"; }).map(function (p) { return [p.chave, p.nome]; }); };
    /* Os efeitos (o mesmo conjunto da raça). */
    c.efeitos = function (dono, id, ativada) {
      dono.efeitos = dono.efeitos || [];
      var lista = H().efeitosPara(!!ativada);
      var tipos = lista.map(function (x) { return [x.chave, x.rotulo]; });
      return el("fieldset.r-campo.hbo-efeitos", {}, [el("legend.r-rotulo", { texto: ativada ? "Efeito enquanto dura (opcional)" : "Efeito na conta da ficha (opcional)" })].concat(dono.efeitos.map(function (ef, j) {
        var k = H().chaveDoEfeito(ef);
        var campos = [c.sel(id + "-t" + j, "Efeito", tipos, k, function (v) { dono.efeitos[j] = copia(H().EFEITOS.filter(function (x) { return x.chave === v; })[0].modelo); })];
        if (k === "defesa" || k === "ataque" || k === "dano") campos.push(c.num(id + "-v" + j, "Valor", ef.valor, function (v) { ef.valor = v; }));
        if (k === "pericia") campos.push(c.sel(id + "-p" + j, "Perícia", c.pericias(), String(ef.alvo).slice(8), function (v) { ef.alvo = "pericia." + v; }), c.num(id + "-v" + j, "Valor", ef.valor, function (v) { ef.valor = v; }));
        if (k === "treino") campos.push(c.sel(id + "-p" + j, "Perícia", c.pericias(), ef.pericia, function (v) { ef.pericia = v; }));
        if (k === "pv") campos.push(c.num(id + "-i" + j, "No 1º nível", ef.inicial, function (v) { ef.inicial = v; }), c.num(id + "-v" + j, "Por nível seguinte", ef.valor, function (v) { ef.valor = v; }));
        if (k === "pm") campos.push(c.sel(id + "-v" + j, "Por nível", [[1, "+1"], [2, "+2"], [3, "+3"]], ef.valor, function (v) { ef.valor = Number(v); }));
        if (k === "sentido") campos.push(c.sel(id + "-s" + j, "Sentido", Object.keys(H().SENTIDOS).map(function (x) { return [x, H().SENTIDOS[x]]; }), ef.valor, function (v) { ef.valor = v; }));
        if (k === "rd") campos.push(c.sel(id + "-d" + j, "Tipo de dano", D().TIPOS_DANO.map(function (x) { return [x[0], x[1]]; }), (ef.tipos || [])[0], function (v) { ef.tipos = [v]; }), c.num(id + "-v" + j, "Redução", ef.valor, function (v) { ef.valor = v; }));
        if (k === "prof") campos.push(c.sel(id + "-q" + j, "Proficiência", Object.keys(H().PROFS).map(function (x) { return [x, H().PROFS[x]]; }), ef.qual, function (v) { ef.qual = v; }));
        campos.push(el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Remover", "aria-label": "Remover o efeito " + (j + 1), onclick: function () { dono.efeitos.splice(j, 1); mudou(true); } }));
        return el("div.faixa.hbc-par", {}, campos);
      })).concat([
        dono.efeitos.length < 4 ? el("button.r-botao.r-botao--mini", { type: "button", id: id + "-mais", texto: "+ Efeito", onclick: function () { dono.efeitos.push(copia(lista[0].modelo)); mudou(true); } }) : null,
        ativada ? null : el("p.r-ajuda", { texto: "Sem efeito, o poder é informativo: a ficha mostra o texto e a mesa aplica." }),
      ]));
    };
    /* v9.13: habilidade ATIVADA (gasta PM): a ficha ganha o botão Usar. */
    c.ativada = function (dono, id) {
      var a = dono.acao;
      var partes = [el("legend.r-rotulo", { texto: "Ativada (gasta PM) — opcional" }),
        c.sel(id + "-liga", "Ativada?", [["", "Não: efeito sempre ligado ou só texto"], ["sim", "Sim: a ficha ganha o botão Usar"]], a ? "sim" : "", function (v) { dono.acao = v ? { custo: 1, execucao: "movimento", duracao: "cena", efeitos: [] } : null; })];
      if (a) {
        partes.push(el("div.editar-grade", {}, [
          c.sel(id + "-custo", "Custo", [[0, "0 PM"], [1, "1 PM"], [2, "2 PM"], [3, "3 PM"], [4, "4 PM"], [5, "5 PM"]], a.custo, function (v) { a.custo = Number(v); }),
          c.sel(id + "-exec", "Execução", Object.keys(H().EXECUCOES).map(function (k) { return [k, H().EXECUCOES[k]]; }), a.execucao, function (v) { a.execucao = v; }),
          c.sel(id + "-dur", "Duração", Object.keys(H().DURACOES).map(function (k) { return [k, H().DURACOES[k]]; }), a.duracao, function (v) { a.duracao = v; }),
          c.sel(id + "-lim", "Limite", [["", "Sem limite"], ["cena", "Uma vez por cena"]], a.limite || "", function (v) { if (v) a.limite = v; else delete a.limite; }),
        ]));
        partes.push(c.efeitos(a, id + "-ef", true));
        partes.push(el("p.r-ajuda", { texto: "Ex.: Armadura de Allihanna — 1 PM, movimento, cena: +2 na Defesa. Usar cobra os PM e cria o efeito ativo." }));
      }
      return el("fieldset.r-campo.hbo-efeitos", {}, partes);
    };
    return c;
  }

  /* A moldura comum: janela, etapas, rodapé, lado, salvar. */
  function moldura(cfg) {
    var r = cfg.r;
    /* v9.14: a imagem opcional da criação (js/homebrew-imagem.js), na
       etapa da visibilidade; sobe depois que o registro foi gravado. */
    var HI = global.RAMAHomebrewImagem;
    var imagem = HI ? HI.campo({ registro: cfg.reg, sistema: cfg.sistema || "tormenta20", grupo: cfg.grupo || "estrutural", subtipo: cfg.subtipo, aoMudar: function () { r.sujo = true; } }) : null;
    var form = el("div.hbe-form"), lado = el("aside.hbe-lado", { "aria-label": "Revisão" });
    var janela = UI.modal({
      titulo: cfg.titulo, largo: true, classe: "hbe-janela hbc-janela",
      conteudo: el("div.hbe-grade", {}, [form, lado]),
      podeFechar: function () {
        if (!r.sujo) return true;
        UI.confirmar({ titulo: "Descartar o rascunho?", texto: "A " + cfg.rotulo + " ainda não foi salva.", rotuloConfirmar: "Descartar", perigo: true }).then(function (s) { if (s) { r.sujo = false; janela.fechar(); } });
        return false;
      },
      botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: cfg.rotuloSalvar, classe: "r-botao--principal", aoClicar: salvar }],
    });
    function pintar() {
      var foco = document.activeElement && form.contains(document.activeElement) ? document.activeElement.id : "";
      U.trocar(form, [
        el("ol.pc-passos", { "aria-label": "Etapas" }, cfg.passos.map(function (p, i) {
          return el("li", {}, [el("button.pc-passo", { type: "button", id: cfg.pref + "-passo-" + (i + 1), "aria-current": r.passo === i + 1 ? "step" : null, onclick: function () { r.passo = i + 1; pintar(); } }, [el("span.pc-passo__n", { texto: String(i + 1) }), el("span", { texto: p[0] })])]);
        })),
        cfg.passos[r.passo - 1][1](),
        el("div.faixa.pc-editor__rodape", {}, [
          r.passo > 1 ? el("button.r-botao.r-botao--fantasma", { type: "button", id: cfg.pref + "-voltar", texto: "Voltar", onclick: function () { r.passo--; pintar(); } }) : null,
          r.passo < cfg.passos.length ? el("button.r-botao", { type: "button", id: cfg.pref + "-continuar", texto: "Continuar", onclick: function () { r.passo++; pintar(); } }) : null,
        ]),
      ]);
      pintarLado();
      if (foco) { var f = document.getElementById(foco); if (f) f.focus(); }
    }
    function pintarLado() {
      U.trocar(lado, [el("p.t-rotulo", { texto: "Revisão" }), el("p.t-secao", { texto: r.nome || "Sem nome" }), el("ul.hbe-mini", {}, cfg.previa().map(function (t) { return el("li", { texto: t }); }))]);
    }
    async function salvar(fechar) {
      if (!U.aparar(r.nome)) { r.passo = 1; pintar(); UI.avisoErro("Dê um nome à " + cfg.rotulo + "."); var n = document.getElementById(cfg.pref + "-nome"); if (n) n.focus(); return; }
      var def = cfg.paraGravar();
      var g = A().guardar(cfg.sistema || "tormenta20", cfg.grupo || "estrutural", cfg.subtipo, { id: cfg.reg ? cfg.reg.id : undefined, nome: r.nome, descricao: r.descricao, valores: cfg.valores ? cfg.valores() : {}, def: def, visibilidade: r.visibilidade, modeloAnterior: cfg.reg ? cfg.reg.modelo : null });
      if (!g.ok) { UI.avisoErro(g.erro); return; }
      var resp = await global.RAMAApi.salvarHomebrew(g.registro);
      if (!resp.ok) { UI.avisoDeFalha(resp, "gravação da " + cfg.rotulo); return; }
      if (imagem) await imagem.salvarEm((resp.dados && resp.dados.id) || (cfg.reg && cfg.reg.id));
      r.sujo = false;
      fechar();
      if (cfg.recarregar) cfg.recarregar(); else if (H()) H().carregarBiblioteca(true);
      UI.avisoOk(cfg.reg ? cfg.okEditar : cfg.okCriar);
      if (cfg.aoSalvar) cfg.aoSalvar(resp.dados && resp.dados.id);
    }
    function visibilidade() {
      var vis = el("div.r-campo", {}, [el("span.r-rotulo", { texto: "Visibilidade" }), el("div.filtros__grupo", { role: "group", "aria-label": "Visibilidade" }, [["privado", "Privada"], ["publico", "Pública"]].map(function (x) {
        return el("button.filtro", { type: "button", "aria-pressed": String(r.visibilidade === x[0]), texto: x[1], onclick: function () { r.visibilidade = x[0]; r.sujo = true; pintar(); } });
      }))]);
      return imagem ? el("div.pilha--curta", { class: "pilha" }, [imagem.el, vis]) : vis;
    }
    function lista(rotulo, itens) { return itens.length ? [el("p.t-rotulo", { texto: rotulo }), el("ul.hbe-mini", {}, itens.map(function (t) { return el("li", { texto: t }); }))] : []; }
    return { pintar: pintar, pintarLado: pintarLado, janela: janela, visibilidade: visibilidade, lista: lista };
  }
  function rascunho(reg) { return { nome: reg ? reg.nome : "", descricao: reg ? reg.descricao || "" : "", visibilidade: reg ? reg.visibilidade || "privado" : "privado", passo: 1, sujo: false }; }
  function limpar(def) { ["id", "homebrewId", "homebrew", "fonte", "pagina", "nome", "descricao"].forEach(function (k) { delete def[k]; }); return def; }

  /* ================================================== ORIGEM */
  function origem(opcoes) {
    var o = opcoes || {};
    var reg = o.registro || null;
    var d = reg && reg.modelo && reg.modelo.def ? copia(reg.modelo.def) : { itens: [], pericias: [], poderes: [], unico: { nome: "", resumo: "", efeitos: [] } };
    d.unico = d.unico || { nome: "", resumo: "", efeitos: [] };
    var r = rascunho(reg);
    var m;
    function mudou(rep) { r.sujo = true; if (rep) m.pintar(); else m.pintarLado(); }
    var c = controles(mudou);
    function def() { var x = copia(d); x.nome = r.nome || "Origem Homebrew"; x.descricao = r.descricao; x.homebrewId = reg ? reg.id : "rascunho"; x.id = ""; return OR().normalizarHomebrew(x); }
    function alternar(lista) { return function (k, on) { var i = d[lista].indexOf(k); if (on && i < 0) d[lista].push(k); if (!on && i >= 0) d[lista].splice(i, 1); }; }
    function passo1() {
      return el("div.pc-editor__passo", {}, [
        c.txt("hbto-nome", "Nome da origem", r.nome, function (v) { r.nome = v; }, 60),
        c.txt("hbto-desc", "Descrição", r.descricao, function (v) { r.descricao = v; }, 1200, "O que o personagem fazia antes de se aventurar.", true),
        c.txt("hbto-itens", "Itens (um por linha)", d.itens.join("\n"), function (v) { d.itens = v.split("\n").map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 6); }, 800, "Ex.: Lente de aumento; Avental de couro. Entram como texto.", true),
      ]);
    }
    function passo2() {
      var gerais = PO().PODERES.filter(function (p) { return p.grupo !== "concedido"; }).map(function (p) { return [p.id, p.nome + " (" + PO().GRUPOS[p.grupo] + ")", p.resumo]; });
      return el("div.pc-editor__passo", {}, [
        el("p.t-mini", { texto: "No livro, cada origem lista perícias e poderes gerais; quem joga escolhe dois benefícios entre eles e o poder único." }),
        c.marcas("hbto-pericias", "Perícias (até 6)", c.pericias().concat([["oficio", "Ofício (qualquer)"]]), d.pericias, alternar("pericias")),
        c.marcas("hbto-poderes", "Poderes gerais (até 6)", gerais, d.poderes, alternar("poderes"), "Passe o mouse para ler o resumo."),
        el("fieldset.r-campo.hbr-hab", {}, [
          el("legend.r-rotulo", { texto: "Poder único" }),
          c.txt("hbto-unico-nome", "Nome", d.unico.nome, function (v) { d.unico.nome = v; }, 60),
          c.txt("hbto-unico-texto", "Texto", d.unico.resumo, function (v) { d.unico.resumo = v; }, 600, "Como aparece na ficha.", true),
          c.efeitos(d.unico, "hbto-unico-ef"),
          c.ativada(d.unico, "hbto-unico-at"),
        ]),
      ]);
    }
    function passo3() {
      var x = def();
      var aviso = x.pericias.length + x.poderes.length + 1 < 2 ? ["Marque pelo menos uma perícia ou poder: quem joga escolhe dois benefícios."] : [];
      return el("div.pc-editor__passo", {}, [].concat(
        m.lista("Prévia", H().previaOrigem(x)),
        m.lista("Automático", ["Os benefícios escolhidos entram na ficha: perícias treinadas, poderes gerais com as regras do livro" + (x.unico.efeitos.length ? " e os efeitos do poder único." : ".")]),
        m.lista("Escolha de quem joga", ["Dois benefícios, na criação."]),
        m.lista("Atenção", aviso),
        m.lista("Decisão da mesa", ["Os itens e o que o texto do poder único descreve além dos efeitos."]),
        [m.visibilidade()]
      ));
    }
    m = moldura({ r: r, reg: reg, pref: "hbto", rotulo: "origem", subtipo: "origem", aoSalvar: o.aoSalvar,
      titulo: (reg ? "Editar origem" : "Nova origem") + " · Tormenta20", rotuloSalvar: reg ? "Salvar origem" : "Criar origem",
      passos: [["Identidade", passo1], ["Benefícios", passo2], ["Revisão", passo3]],
      previa: function () { return H().previaOrigem(def()); },
      paraGravar: function () { return limpar(def()); },
      okCriar: "Origem criada. Ela aparece na criação de personagem de Tormenta20, depois das origens do livro.",
      okEditar: "Origem atualizada. As fichas que já a usam continuam com a versão delas." });
    m.pintar();
    return m.janela;
  }

  /* ================================================== DIVINDADE */
  function divindade(opcoes) {
    var o = opcoes || {};
    var reg = o.registro || null;
    var d = reg && reg.modelo && reg.modelo.def ? copia(reg.modelo.def) : { titulo: "", energia: "qualquer", armaPreferida: "", devotos: "qualquer", obrigacoes: "", poderes: [], poderesProprios: [] };
    d.poderes = (d.poderes || []).filter(function (k) { return !/-p\d$/.test(k); });
    d.poderesProprios = (d.poderesProprios || []).map(function (p) { return { nome: p.nome || "", resumo: p.resumo || "", efeitos: p.efeitos || [], acao: p.acao || null }; });
    var r = rascunho(reg);
    var m;
    function mudou(rep) { r.sujo = true; if (rep) m.pintar(); else m.pintarLado(); }
    var c = controles(mudou);
    function def() { var x = copia(d); x.nome = r.nome || "Divindade Homebrew"; x.descricao = r.descricao; x.homebrewId = reg ? reg.id : "rascunho"; x.id = ""; return DE().normalizarHomebrew(x); }
    function passo1() {
      var lista = d.devotos === "qualquer" ? [] : d.devotos;
      var opDev = RA().RACAS.map(function (x) { return [x.id, x.nome + " (raça)"]; }).concat(CL().CLASSES.map(function (x) { return [x.id, x.nome + " (classe)"]; }));
      return el("div.pc-editor__passo", {}, [
        c.txt("hbtd-nome", "Nome da divindade", r.nome, function (v) { r.nome = v; }, 60),
        c.txt("hbtd-titulo", "Título", d.titulo, function (v) { d.titulo = v; }, 80, "Ex.: \"Deusa do Vidro\"."),
        c.txt("hbtd-desc", "Descrição", r.descricao, function (v) { r.descricao = v; }, 1200, "O que a divindade representa e quem a segue.", true),
        el("div.editar-grade", {}, [
          c.sel("hbtd-energia", "Energia canalizada", [["positiva", "Positiva"], ["negativa", "Negativa"], ["qualquer", "Qualquer (o devoto escolhe)"]], d.energia, function (v) { d.energia = v; }),
          c.sel("hbtd-arma", "Arma preferida", [["", "Nenhuma"]].concat(EQ().ARMAS.map(function (a) { return [a.id, a.nome]; })), d.armaPreferida, function (v) { d.armaPreferida = v; }),
        ]),
        c.sel("hbtd-devotos-modo", "Devotos", [["qualquer", "Qualquer um"], ["lista", "Raças e classes escolhidas"]], d.devotos === "qualquer" ? "qualquer" : "lista", function (v) { d.devotos = v === "qualquer" ? "qualquer" : []; }, "Humanos e clérigos podem ser devotos de qualquer divindade (p. 96)."),
        d.devotos === "qualquer" ? null : c.marcas("hbtd-devotos", "Quem pode ser devoto", opDev, lista, function (k, on) { var i = d.devotos.indexOf(k); if (on && i < 0) d.devotos.push(k); if (!on && i >= 0) d.devotos.splice(i, 1); }),
      ]);
    }
    function passo2() {
      var conc = PO().PODERES.filter(function (p) { return p.grupo === "concedido"; }).map(function (p) { return [p.id, p.nome, p.resumo]; });
      return el("div.pc-editor__passo", {}, [
        c.txt("hbtd-oer", "Obrigações e restrições", d.obrigacoes, function (v) { d.obrigacoes = v; }, 1200, "Texto que a ficha mostra; a mesa aplica (violar tira os PM até o próximo dia, p. 96).", true),
        c.marcas("hbtd-poderes", "Poderes concedidos do livro (até 6)", conc, d.poderes, function (k, on) { var i = d.poderes.indexOf(k); if (on && i < 0) d.poderes.push(k); if (!on && i >= 0) d.poderes.splice(i, 1); }, "Passe o mouse para ler o resumo."),
        el("p.t-rotulo", { texto: "Poderes concedidos próprios" }),
      ].concat(d.poderesProprios.map(function (p, i) {
        return el("fieldset.r-campo.hbr-hab", {}, [
          el("legend.r-rotulo", { texto: "Poder próprio " + (i + 1) }),
          c.txt("hbtd-p" + i + "-nome", "Nome", p.nome, function (v) { p.nome = v; }, 60),
          c.txt("hbtd-p" + i + "-texto", "Texto", p.resumo, function (v) { p.resumo = v; }, 600, null, true),
          c.efeitos(p, "hbtd-p" + i + "-ef"),
          c.ativada(p, "hbtd-p" + i + "-at"),
          el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Remover poder", onclick: function () { d.poderesProprios.splice(i, 1); mudou(true); } }),
        ]);
      })).concat([d.poderesProprios.length < 3 ? el("button.r-botao.r-botao--mini", { type: "button", id: "hbtd-mais-poder", texto: "+ Poder próprio", onclick: function () { d.poderesProprios.push({ nome: "", resumo: "", efeitos: [] }); mudou(true); } }) : null]));
    }
    function passo3() {
      var x = def();
      var proprios = x.poderesProprios.filter(function (p) { return p.efeitos.length; });
      return el("div.pc-editor__passo", {}, [].concat(
        m.lista("Prévia", H().previaDeus(x)),
        m.lista("Automático", ["O poder concedido escolhido entra na ficha (os do livro com as regras do livro)." ].concat(proprios.map(function (p) { return p.nome + ": " + p.efeitos.map(H().textoEfeito).join(", ") + "."; })).concat(x.armaPreferida ? ["A arma preferida vale para os poderes que a pedem."] : [])),
        m.lista("Escolha de quem joga", ["Ser devoto e o poder concedido (clérigos, druidas e paladinos: dois, na ficha)." ].concat(x.energia === "qualquer" ? ["A energia canalizada, uma vez."] : [])),
        m.lista("Decisão da mesa", ["As obrigações e restrições." ].concat(x.poderes.length ? [] : ["Sem poder concedido, ninguém consegue completar o passo de divindade."])),
        [m.visibilidade()]
      ));
    }
    m = moldura({ r: r, reg: reg, pref: "hbtd", rotulo: "divindade", subtipo: "divindade", aoSalvar: o.aoSalvar,
      titulo: (reg ? "Editar divindade" : "Nova divindade") + " · Tormenta20", rotuloSalvar: reg ? "Salvar divindade" : "Criar divindade",
      passos: [["Identidade", passo1], ["Poderes e obrigações", passo2], ["Revisão", passo3]],
      previa: function () { return H().previaDeus(def()); },
      paraGravar: function () { var x = limpar(def()); x.poderes = x.poderes.filter(function (k) { return !/-p\d$/.test(k); }); x.poderesProprios.forEach(function (p) { delete p.id; }); return x; },
      okCriar: "Divindade criada. Ela aparece na criação de personagem de Tormenta20, depois do Panteão.",
      okEditar: "Divindade atualizada. As fichas que já a usam continuam com a versão delas." });
    m.pintar();
    return m.janela;
  }

  /* ================================================== PODER (v9.14) */
  function poder(opcoes) {
    var o = opcoes || {};
    var reg = o.registro || null;
    var v0 = reg && reg.modelo && reg.modelo.def ? copia(reg.modelo.def) : {};
    var d = { grupo: v0.grupoT20 || ({ tormenta: "tormenta" })[v0.grupo] || "destino", requisitosTexto: v0.requisitos || "", nivelMinimo: v0.nivelMinimo || 1, efeitos: v0.efeitos || [], acao: v0.acao || null };
    var r = rascunho(reg);
    var m;
    function mudou(rep) { r.sujo = true; if (rep) m.pintar(); else m.pintarLado(); }
    var c = controles(mudou);
    function def() { return PO().normalizarHomebrew(Object.assign(copia(d), { id: "", nome: r.nome || "Poder Homebrew", resumo: r.descricao, homebrewId: reg ? reg.id : "rascunho" })); }
    function niveis() { var l = []; for (var n = 1; n <= 20; n++) l.push([n, n === 1 ? "Qualquer" : n + "º"]); return l; }
    function passo1() {
      return el("div.pc-editor__passo", {}, [
        c.txt("hbtp-nome", "Nome do poder", r.nome, function (v) { r.nome = v; }, 60),
        c.txt("hbtp-desc", "Texto", r.descricao, function (v) { r.descricao = v; }, 1200, "O que o poder faz, como aparece na ficha.", true),
        el("div.editar-grade", {}, [
          c.sel("hbtp-grupo", "Grupo", [["combate", "Combate"], ["destino", "Destino"], ["magia", "Magia"], ["tormenta", "Tormenta"]], d.grupo, function (v) { d.grupo = v; }, "Poderes de classe, concedidos e de origem: pelos tipos Classe, Divindade e Origem."),
          c.sel("hbtp-nivel", "Nível mínimo", niveis(), d.nivelMinimo, function (v) { d.nivelMinimo = Number(v); }, "Conferido ao subir de nível."),
        ]),
        c.txt("hbtp-req", "Outros requisitos (texto)", d.requisitosTexto, function (v) { d.requisitosTexto = v; }, 200, "Ex.: \"Des 2, treinado em Acrobacia\". A mesa confere."),
      ]);
    }
    function passo2() {
      return el("div.pc-editor__passo", {}, [c.efeitos(d, "hbtp-ef"), c.ativada(d, "hbtp-at")]);
    }
    function passo3() {
      var x = def();
      return el("div.pc-editor__passo", {}, [].concat(
        m.lista("Prévia", H().previaPoder(x)),
        m.lista("Onde entra", ["Subir de nível (na escolha do poder) e + Poder avulso, na ficha de Tormenta20."]),
        m.lista("Decisão da mesa", [x.requisitosTexto ? "Os requisitos em texto." : null, "O que o texto descreve além dos efeitos."].filter(Boolean)),
        [m.visibilidade()]
      ));
    }
    m = moldura({ r: r, reg: reg, pref: "hbtp", rotulo: "habilidade", subtipo: "poder", grupo: "habilidade", aoSalvar: o.aoSalvar,
      titulo: (reg ? "Editar poder" : "Novo poder") + " · Tormenta20", rotuloSalvar: reg ? "Salvar poder" : "Criar poder",
      passos: [["Identidade", passo1], ["Regras", passo2], ["Revisão", passo3]],
      previa: function () { return H().previaPoder(def()); },
      valores: function () { return { grupo: d.grupo === "tormenta" ? "tormenta" : "geral", requisitos: d.requisitosTexto }; },
      paraGravar: function () { var x = def(); var out = { grupoT20: x.grupo, nivelMinimo: x.nivelMinimo, efeitos: x.efeitos }; if (x.acao) out.acao = x.acao; return out; },
      okCriar: "Poder criado. Ele aparece ao subir de nível e em + Poder avulso, na ficha de Tormenta20.",
      okEditar: "Poder atualizado. As fichas que já o usam continuam com a versão delas." });
    m.pintar();
    return m.janela;
  }

  global.RAMAHomebrewT20Estruturais = { origem: origem, divindade: divindade, poder: poder, ferramentas: { controles: controles, moldura: moldura, rascunho: rascunho, limpar: limpar } };
})(typeof window !== "undefined" ? window : globalThis);
