/* =====================================================================
   R.A.M.A. — Vampiro · Disciplinas, Rituais e Alquimia (v5.0)
   ---------------------------------------------------------------------
   RAMASecaoVampiroDisciplinas. Ter pontos não dá todos os poderes: a
   ficha lista os que a personagem TEM (um por ponto, amálgamas e
   pré-requisitos conferidos pelo motor na compra).

   USAR UM PODER (js/vampiro/poderes.js):
     ativarPoder  cobra o custo ANTES (Checagens, FdV, Máculas) e rola o
                  teste se houver — a janela da rolagem fica pendente
     resolverPoder  ao concluir: vitória aplica o efeito; o custo pago
                  não volta numa falha
   Ritual: Checagem + Inteligência + Feitiçaria contra nível + 1.
   Alquimia: destilar (uma Checagem do Alquimista + o teste do método)
   e ativar uma dose pronta, que se consome uma vez.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el;
  function C() { return global.RAMAVampiroCatalogo; }
  function DS() { return global.RAMAVampiroDisciplinas; }
  function R() { return global.RAMAVampiro; }
  function P() { return global.RAMAVampiroPoderes; }
  function T() { return global.RAMAVampiroTela; }
  function M() { return global.RAMAVampiroMesaDaFicha; }
  function UI() { return global.RAMAUI; }

  function op(ctx, fn, x) { return T().operar(ctx, fn, x); }
  function botao(texto, aoClicar, opcoes) {
    var o = opcoes || {};
    return el("button.r-botao.r-botao--mini", { type: "button", texto: texto, disabled: !!o.motivo, title: o.motivo || o.dica || "", onclick: aoClicar });
  }

  function custoTexto(def) {
    var c = def.custo || {};
    if (c.texto) return c.texto;
    var partes = [];
    if (c.checagens) partes.push(c.checagens + " Checagem" + (c.checagens > 1 ? "s" : ""));
    if (c.ate) partes.push("até " + c.ate + " Checagens");
    if (c.porUso) partes.push("Checagens por uso");
    if (c.fdv) partes.push(c.fdv + " FdV");
    if (c.maculas) partes.push("Máculas");
    return partes.join(" + ") || "Grátis";
  }
  function paradaTexto(par) {
    return (par || []).map(function (x) { return x.map(function (k) { return k === "disciplina" ? "Disciplina" : C().atributo(k) ? T().nomeAtr(k) : C().habilidade(k) ? T().nomeHab(k) : DS().DISCIPLINAS[k] ? T().nomeDisc(k) : k; }).join(" + "); }).join(" ou ");
  }
  var DURACAO = { passiva: "Passivo", uso: "Um uso", turno: "Um turno", cena: "Uma cena", noite: "Uma noite", indefinida: "Indefinida", "ate desativar": "Até desativar", doPoder: "Pela regra do poder", horas: "Horas", dia: "Um dia" };

  /* Ativar, e — se houver teste — abrir a janela pendente. */
  function usarPoder(ctx, chave) {
    var def = DS().poder(chave);
    var o = ctx.ficha.vampiro;
    var x = { parada: 0, comCusto: true, checagens: 1 };
    var campos = [];
    if (def.parada && def.parada.length > 1) campos.push(UI().campo({ rotulo: "Parada", tipo: "selecao", valor: "0", opcoes: def.parada.map(function (p, i) { return { valor: String(i), rotulo: paradaTexto([p]) }; }), aoMudar: function (v) { x.parada = U.inteiro(v, 0); } }));
    if (def.custo && (def.custo.ate || def.custo.porUso)) campos.push(UI().campo({ rotulo: "Checagens", tipo: "numero", valor: 1, aoMudar: function (v) { x.checagens = U.inteiro(v, 1); } }));
    if (def.custo && def.custo.opcional) campos.push(el("label.r-marca", {}, [el("input", { type: "checkbox", checked: true, onchange: function (ev) { x.comCusto = ev.currentTarget.checked; } }), el("span", { texto: "Pagar o custo opcional (" + custoTexto(def) + ")" })]));
    if (def.parada) {
      campos.push(UI().campo({ rotulo: def.resistencia ? "Oposição (sucessos do alvo, se já sabidos)" : "Dificuldade", tipo: "numero", valor: def.dificuldade !== undefined ? def.dificuldade : "", aoMudar: function (v) { var n = v.trim() === "" ? undefined : U.inteiro(v, 0); if (def.resistencia) x.oposicao = n; else x.dificuldade = n; } }));
      if (def.resistencia) campos.push(el("p.t-mini", { texto: "O alvo resiste com " + paradaTexto(def.resistencia) + "." }));
    }
    var desc = P().descreverPoder(o, chave);
    function ativar() {
      var res = null;
      var r = op(ctx, function (b) { var a = P().ativarPoder(b, chave, x, T().rolador); if (a.ok && a.resultado) res = a.resultado; return a; });
      if (r.ok === false || !res) return;
      T().resultado(ctx, res, { concluir: function (b, rr) { return P().resolverPoder(b, rr); } });
    }
    if (!campos.length) { ativar(); return; }
    UI().modal({
      titulo: def.nome,
      conteudo: [el("p.t-mini", { texto: "Custo: " + custoTexto(def) + (desc && desc.rerrolaChecagem ? " (a Potência rerrola a Checagem)" : "") + "." })].concat(campos),
      botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Usar", classe: "r-botao--principal", aoClicar: function (f) { f(); ativar(); } }],
    });
  }

  function cartaoDoPoder(ctx, chave, origem) {
    var o = ctx.ficha.vampiro;
    var d = P().descreverPoder(o, chave);
    if (!d) return null;
    var def = d.def;
    var pode = ctx.podeEditar();
    return el("li.vamp-poder", { dataset: { ativo: d.ativo ? "1" : "" } }, [
      el("div.vamp-poder__topo", {}, [
        el("span.vamp-poder__nome", { texto: def.nome }),
        el("span.r-etiqueta", { texto: "Nível " + def.nivel }),
        def.amalgama ? el("span.r-etiqueta", { texto: "Amálgama: " + T().nomeDisc(def.amalgama.disciplina) + " " + def.amalgama.nivel }) : null,
        def.formula ? el("span.r-etiqueta", { texto: "Fórmula" }) : null,
        d.ativo ? el("span.r-etiqueta.r-etiqueta--aviso", { texto: "Ativo" }) : null,
        el("span.t-mini", { texto: (origem ? origem + " · " : "") + "p. " + def.pagina }),
      ]),
      el("p.vamp-poder__efeito", { texto: def.efeito || "" }),
      el("p.t-mini", { texto: ["Custo: " + custoTexto(def), def.parada ? "Parada: " + paradaTexto(def.parada) : "", def.resistencia ? "Resistência: " + paradaTexto(def.resistencia) : "", "Duração: " + (DURACAO[def.duracao] || def.duracao)].filter(Boolean).join(" · ") }),
      def.critico ? el("p.t-mini", { texto: "Crítico: " + def.critico }) : null,
      pode && !d.passivo || (pode && def.parada) ? el("div.faixa", {}, [
        botao(def.parada ? "Usar (rolar)" : "Ativar", function () { usarPoder(ctx, chave); }),
        d.ativo ? botao("Desativar", function () { op(ctx, function (b) { return P().desativarPoder(b, chave); }); }) : null,
      ]) : d.passivo ? el("p.t-mini", { texto: "Passivo: vale sempre (o motor aplica onde couber)." }) : null,
    ]);
  }

  function aba(ctx) {
    var o = ctx.ficha.vampiro;
    var c = R().calcular(o);
    var edicao = ctx.emEdicao() && ctx.podeEditar();
    var poderes = R().poderesDaFicha(o);
    var disponiveis = P().poderesDisponiveis(o);
    var temporarios = disponiveis.filter(function (k) { return !poderes.some(function (p) { return p.chave === k; }); });
    var discs = Object.keys(c.disciplinas);
    var doCla = (C().CLAS[o.cla] || {}).disciplinas || [];
    var paineis = discs.map(function (k) {
      var x = c.disciplinas[k];
      var dd = DS().DISCIPLINAS[k];
      var meus = poderes.filter(function (p) { var def = DS().poder(p.chave); return def && def.disciplina === k && !def.formula; });
      return UI().painel(dd.nome, [
        el("div.faixa", {}, [
          T().pontos({ valor: x.valor, maximo: 5, rotulo: dd.nome, aoMudar: edicao ? function (v) { op(ctx, function (b) { return global.RAMAVampiroFicha.corrigir(b, "disciplina", k, v, x.valor); }, { silencioso: true }); } : null }),
          el("span.t-mini", { texto: (dd.tipo === "fisica" ? "Física" : "Mental") + (doCla.indexOf(k) >= 0 ? " · do clã" : "") + (dd.ressonancia ? " · Ressonância " + T().nomeDe(C().RESSONANCIAS, dd.ressonancia) : "") + " · " + global.RAMAVampiroFicha.composicaoTexto(x.composicao) }),
        ]),
        meus.length ? el("ul.vamp-poderes", {}, meus.map(function (p) { return cartaoDoPoder(ctx, p.chave, { criacao: "criação", predador: "Predador", xp: "experiência" }[p.origem] || p.origem); })) : el("p.t-mini", { texto: "Nenhum poder escolhido. Um poder por ponto (aba Experiência ou criação)." }),
        edicao && meus.length < x.valor ? escolherPoder(ctx, k, x.valor) : null,
      ], { classe: "vamp-disciplina" });
    });
    return el("div.vamp-aba.pilha", {}, [
      discs.length ? null : UI().painel("Disciplinas", [el("p.t-mini", { texto: R().ehSangueRalo(o) ? "Sangue-ralo: Disciplinas só pela Ressonância (temporárias) ou pela Alquimia." : "Nenhuma Disciplina ainda." })]),
    ].concat(paineis).concat([
      temporarios.length ? UI().painel("Poderes temporários", [el("ul.vamp-poderes", {}, temporarios.map(function (k) { return cartaoDoPoder(ctx, k, "temporário"); }))]) : null,
      o.rituais.length || R().valorDeDisciplina(o, "feiticaria") ? UI().painel("Rituais (Feitiçaria de Sangue)", [painelRituais(ctx)]) : null,
      R().ehSangueRalo(o) || o.formulas.length ? UI().painel("Alquimia Sangue-Ralo", [painelAlquimia(ctx)]) : null,
      M().dados(ctx) && ctx.podeEditar() ? UI().painel("Direto da Fonte", [painelDiretoDaFonte(ctx)]) : null,
    ]));
  }

  /* Corrigir os poderes no modo Edição (a compra com XP já escolhe). */
  function escolherPoder(ctx, disciplina, nivelMax) {
    var o = ctx.ficha.vampiro;
    var opcoes = DS().daDisciplina(disciplina).filter(function (x) { return !x.formula && x.nivel <= nivelMax && !R().temPoder(o, x.chave); });
    var sel = UI().campo({ rotulo: "Poder", tipo: "selecao", valor: "", opcoes: [{ valor: "", rotulo: "Escolha…" }].concat(opcoes.map(function (x) { return { valor: x.chave, rotulo: x.nivel + " · " + x.nome }; })) });
    return el("div.faixa", {}, [sel, botao("Adicionar poder", function () {
      var k = sel.entrada.value; if (!k) return;
      op(ctx, function (b) {
        var pode = R().podeAdquirirPoder(b, k, { disciplina: disciplina, nivel: nivelMax });
        if (!pode.ok) return pode;
        b.poderes.push({ id: R().novoId("po"), chave: k, origem: b.criacao.concluida ? "ajuste" : "criacao" });
        return { ok: true, eventos: [] };
      });
    })]);
  }

  function painelRituais(ctx) {
    var o = ctx.ficha.vampiro;
    var pode = ctx.podeEditar();
    var nivel = R().valorDeDisciplina(o, "feiticaria");
    return el("ul.vamp-poderes", {}, o.rituais.map(function (ri) {
      var def = DS().ritual(ri.chave);
      return el("li.vamp-poder", {}, [
        el("div.vamp-poder__topo", {}, [el("span.vamp-poder__nome", { texto: def.nome }), el("span.r-etiqueta", { texto: "Nível " + def.nivel }), el("span.t-mini", { texto: "p. " + def.pagina })]),
        el("p.vamp-poder__efeito", { texto: def.efeito }),
        el("p.t-mini", { texto: ["Dificuldade " + def.dificuldade, def.ingredientes ? "Ingredientes: " + def.ingredientes : "", def.execucaoNoites ? def.execucaoNoites + " noites" : def.execucaoMinutos + " min"].filter(Boolean).join(" · ") }),
        pode ? botao("Conduzir", function () {
          var res = null;
          var r = op(ctx, function (b) { var a = P().executarRitual(b, ri.chave, {}, T().rolador); if (a.ok) res = a.resultado; return a; });
          if (r.ok !== false && res) T().resultado(ctx, res, { concluir: function (b, rr) { return P().resolverRitual(b, rr); } });
        }, { motivo: def.nivel > nivel ? "Exige Feitiçaria de Sangue " + def.nivel + "." : o.fome >= 5 ? "Fome 5." : "" }) : null,
      ]);
    }));
  }

  function painelAlquimia(ctx) {
    var o = ctx.ficha.vampiro;
    var pode = ctx.podeEditar();
    var metodo = DS().METODOS_DE_ALQUIMIA[o.metodoAlquimia];
    var lab = false;
    var conhecidas = el("ul.vamp-poderes", {}, o.formulas.map(function (f) {
      var def = DS().poder(f.chave);
      return el("li.vamp-poder", {}, [
        el("div.vamp-poder__topo", {}, [el("span.vamp-poder__nome", { texto: def.nome }), el("span.r-etiqueta", { texto: "Nível " + def.nivel }), el("span.t-mini", { texto: "p. " + def.pagina })]),
        el("p.vamp-poder__efeito", { texto: def.efeito || "" }),
        pode ? botao("Destilar", function () {
          var res = null;
          var r = op(ctx, function (b) { var a = P().destilar(b, f.chave, { laboratorio: lab }, T().rolador); if (a.ok) res = a.resultado; return a; });
          if (r.ok !== false && res) T().resultado(ctx, res, { concluir: function (b, rr) { return P().concluirDestilacao(b, rr); } });
        }) : null,
      ]);
    }));
    var prontas = o.formulasProntas.filter(function (f) { return !f.consumida; });
    return el("div.pilha.pilha--curta", {}, [
      el("p", { texto: metodo ? "Método: " + metodo.nome + " — " + metodo.texto : "Sem método escolhido." }),
      o.metodoAlquimia === "fixatio" && pode ? el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) { lab = ev.currentTarget.checked; } }), el("span", { texto: "Com laboratório" })]) : null,
      o.formulas.length ? conhecidas : el("p.t-mini", { texto: "Nenhuma fórmula conhecida." }),
      el("h3.t-rotulo", { texto: "Doses prontas" }),
      prontas.length ? el("ul.vamp-lista", {}, prontas.map(function (f) {
        var def = DS().poder(f.chave);
        return el("li.faixa", {}, [el("span", { texto: def.nome + " — " + f.qualidade + " (" + f.sucessos + " sucesso(s))" }), pode ? botao("Ativar", function () {
          var res = null;
          var r = op(ctx, function (b) { var a = P().ativarFormula(b, f.id, {}, T().rolador); if (a.ok) res = a.resultado; return a; });
          if (r.ok !== false && res) T().resultado(ctx, res, { concluir: function (b, rr) { return P().resolverPoder(b, rr); } });
        }) : null]);
      })) : el("p.t-mini", { texto: "Nenhuma dose pronta." }),
    ]);
  }

  /* Direto da Fonte: beber de quem tem o poder (Celeridade, Fortitude,
     Potência 4). O servidor confere as duas fichas. */
  function painelDiretoDaFonte(ctx) {
    var cron = M().dados(ctx);
    var outros = (cron.personagens || []).filter(function (x) { return x.id !== ctx.personagemId; });
    if (!outros.length) return el("p.t-mini", { texto: "Ninguém mais na crônica." });
    var doador = outros[0].id, disc = "potencia";
    return el("div.pilha.pilha--curta", {}, [
      el("p.t-mini", { texto: "Quem bebe ganha metade dos pontos do doador numa Disciplina física por uma noite. O doador faz a Checagem." }),
      el("div.editar-grade", {}, [
        UI().campo({ rotulo: "Doador", tipo: "selecao", valor: doador, opcoes: outros.map(function (x) { return { valor: x.id, rotulo: x.nome }; }), aoMudar: function (v) { doador = v; } }),
        UI().campo({ rotulo: "Disciplina", tipo: "selecao", valor: disc, opcoes: ["celeridade", "fortitude", "potencia"].map(function (k) { return { valor: k, rotulo: T().nomeDisc(k) }; }), aoMudar: function (v) { disc = v; } }),
      ]),
      botao("Beber Direto da Fonte", function () { M().operar(ctx, { tipo: "diretoDaFonte", quem: ctx.personagemId, doador: doador, disciplina: disc }); }),
    ]);
  }

  global.RAMASecaoVampiroDisciplinas = { aba: aba };
  global.RAMAVampiroDisciplinasTela = { usarPoder: usarPoder, custoTexto: custoTexto, paradaTexto: paradaTexto };
})(window);
