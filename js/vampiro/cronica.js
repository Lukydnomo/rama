/* =====================================================================
   R.A.M.A. — Vampiro: A Máscara (V5) · a crônica (mesa do Narrador)
   =====================================================================
   O estado da campanha de Vampiro, puro como o motor da ficha. O
   Narrador grava o estado inteiro; os jogadores recebem a VISTA, sem
   nada privado (PNs ocultos, relações privadas, notas do Narrador, o
   registro privado) — o servidor monta a vista, o navegador nunca
   recebe e esconde.

   OS PERÍODOS SÃO DIFERENTES (p. 115–117): turno < cena < noite; a
   SESSÃO é a reunião de quem joga e pode continuar a cena da anterior;
   a HISTÓRIA é o arco. Cada um gera os MOMENTOS certos para as fichas
   (regras.inicioDaSessao, novaNoite…); começar sessão nunca é
   despertar.
   ===================================================================== */

(function (global) {
  "use strict";

  var C = global.RAMAVampiroCatalogo;
  var AN = global.RAMAVampiroAntagonistas;

  function inteiro(v, min, max, p) { var n = Math.floor(Number(v)); if (!isFinite(n)) n = p === undefined ? 0 : p; if (min !== undefined && n < min) n = min; if (max !== undefined && n > max) n = max; return n; }
  function texto(v, max) { return String(v === undefined || v === null ? "" : v).slice(0, max || 300); }
  function lista(v) { return Array.isArray(v) ? v : []; }
  function objeto(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  var cont = 0;
  function novoId(p) { var U = global.RAMAUtil; if (U && U.uuid) return (p || "c") + "-" + U.uuid(); cont++; return (p || "c") + "-" + Date.now().toString(36) + "-" + cont; }

  var TIPOS_DE_CENA = { destaque: "Cena de destaque", abstraida: "Cena abstraída", interludio: "Interlúdio" };
  var MODOS_DE_JOGO = { livre: "Estilo livre", direcionado: "Estilo livre direcionado", pontuado: "Estilo livre pontuado", dados: "Baseado em dados" };
  var LIMITE_REGISTRO = 300;

  function estadoVazio() {
    return {
      v: 1, epoca: "", sessao: 0, noite: 0, sessaoAberta: false,
      historia: { id: "", nome: "", n: 0 },
      cena: null,
      principios: [],
      coterie: { nome: "", tipo: "", pontosExtras: 0, dominio: { chasse: 0, lien: 0, portillon: 0 }, antecedentes: [], defeitos: [], membros: [], doacoes: {} },
      personagens: [], grupos: [], relacoes: [],
      conflitos: [], testesEstendidos: [], memoriams: [], favores: [],
      registro: [], operacoes: [],
    };
  }

  function normalizarPN(x) {
    var p = objeto(x);
    return {
      id: texto(p.id, 80) || novoId("pn"), nome: texto(p.nome, 120) || "Sem nome", modelo: texto(p.modelo, 60),
      natureza: ["vampiro", "mortal", "carnical", "animal", "criatura", "simples"].indexOf(p.natureza) >= 0 ? p.natureza : "mortal",
      dados: objeto(p.dados), visivel: !!p.visivel, grupo: texto(p.grupo, 80), personalizado: !!p.personalizado,
      notasPublicas: texto(p.notasPublicas, 4000), notasPrivadas: texto(p.notasPrivadas, 8000),
      dano: { vitalidade: { superficial: inteiro(objeto(objeto(p.dano).vitalidade).superficial, 0, 30), agravado: inteiro(objeto(objeto(p.dano).vitalidade).agravado, 0, 30) }, forcaDeVontade: { superficial: inteiro(objeto(objeto(p.dano).forcaDeVontade).superficial, 0, 30), agravado: inteiro(objeto(objeto(p.dano).forcaDeVontade).agravado, 0, 30) } },
      fome: inteiro(p.fome, 0, 5, 1), personagemId: texto(p.personagemId, 80),
    };
  }

  function normalizar(bruto) {
    var b = objeto(bruto), e = estadoVazio();
    e.epoca = texto(b.epoca, 120);
    e.sessao = inteiro(b.sessao, 0); e.noite = inteiro(b.noite, 0); e.sessaoAberta = !!b.sessaoAberta;
    var h = objeto(b.historia); e.historia = { id: texto(h.id, 80), nome: texto(h.nome, 120), n: inteiro(h.n, 0) };
    var c = objeto(b.cena);
    e.cena = b.cena ? { id: texto(c.id, 80) || novoId("ce"), nome: texto(c.nome, 120), tipo: TIPOS_DE_CENA[c.tipo] ? c.tipo : "destaque", modo: MODOS_DE_JOGO[c.modo] ? c.modo : "dados", turno: inteiro(c.turno, 0), n: inteiro(c.n, 0) } : null;
    e.principios = lista(b.principios).slice(0, 10).map(function (x) { var p = objeto(x); return { id: texto(p.id, 80) || novoId("pr"), texto: texto(p.texto, 300) }; });
    var co = objeto(b.coterie), dom = objeto(co.dominio);
    e.coterie = {
      nome: texto(co.nome, 120), tipo: C.COTERIES[co.tipo] ? co.tipo : "", pontosExtras: inteiro(co.pontosExtras, 0, 20),
      dominio: { chasse: inteiro(dom.chasse, 0, 5), lien: inteiro(dom.lien, 0, 5), portillon: inteiro(dom.portillon, 0, 5) },
      antecedentes: lista(co.antecedentes).filter(function (x) { return x && C.VANTAGENS[x.chave]; }).slice(0, 30).map(function (x) { return { id: texto(x.id, 80) || novoId("ca"), chave: x.chave, pontos: inteiro(x.pontos, 1, 10, 1), nota: texto(x.nota, 200), origem: texto(x.origem, 20) || "parada", relacaoId: texto(x.relacaoId, 80) }; }),
      defeitos: lista(co.defeitos).filter(function (x) { return x && C.VANTAGENS[x.chave]; }).slice(0, 20).map(function (x) { return { id: texto(x.id, 80) || novoId("cd"), chave: x.chave, pontos: inteiro(x.pontos, 1, 10, 1), nota: texto(x.nota, 200), origem: texto(x.origem, 20) || "parada" }; }),
      membros: lista(co.membros).map(String).slice(0, 20),
      doacoes: objeto(co.doacoes),
    };
    e.personagens = lista(b.personagens).slice(0, 300).map(normalizarPN);
    e.grupos = lista(b.grupos).slice(0, 60).map(function (x) { var g = objeto(x); return { id: texto(g.id, 80) || novoId("gr"), nome: texto(g.nome, 120), visivel: !!g.visivel }; });
    e.relacoes = lista(b.relacoes).slice(0, 600).map(function (x) {
      var r = objeto(x);
      return { id: texto(r.id, 80) || novoId("re"), de: texto(r.de, 80), para: texto(r.para, 80), tipo: texto(r.tipo, 60), descricao: texto(r.descricao, 600), direcao: r.direcao === "dupla" ? "dupla" : "mao", visivel: !!r.visivel };
    }).filter(function (r) { return r.de && r.para; });
    e.conflitos = lista(b.conflitos).slice(0, 30).map(function (x) {
      var f = objeto(x);
      return { id: texto(f.id, 80) || novoId("cf"), nome: texto(f.nome, 120), tipo: f.tipo === "social" ? "social" : "fisico", rodada: inteiro(f.rodada, 0), ativo: f.ativo !== false,
        participantes: lista(f.participantes).slice(0, 30).map(function (y) { var p = objeto(y); return { ref: texto(p.ref, 80), nome: texto(p.nome, 120), lado: texto(p.lado, 40), iniciativa: inteiro(p.iniciativa, 0, 40) }; }),
        audiencia: texto(f.audiencia, 30), registro: lista(f.registro).slice(-100) };
    });
    e.testesEstendidos = lista(b.testesEstendidos).slice(0, 30).map(function (x) {
      var t = objeto(x);
      return { id: texto(t.id, 80) || novoId("te"), nome: texto(t.nome, 120), variante: ["padrao", "series", "dificil", "cascata", "disputa"].indexOf(t.variante) >= 0 ? t.variante : "padrao", alvo: inteiro(t.alvo, 1, 99, 10), total: inteiro(t.total, 0, 999), rolagens: inteiro(t.rolagens, 0, 99), bonusProxima: inteiro(t.bonusProxima, 0, 30), encerrado: !!t.encerrado, falhaTotal: !!t.falhaTotal, visivel: t.visivel !== false };
    });
    e.memoriams = lista(b.memoriams).slice(0, 30).map(function (x) {
      var m = objeto(x);
      return { id: texto(m.id, 80) || novoId("me"), personagemId: texto(m.personagemId, 80), quando: texto(m.quando, 200), objetivo: texto(m.objetivo, 400), pontos: inteiro(m.pontos, 1, 3, 1), historia: inteiro(m.historia, 0), resultado: ["", "sucesso", "falha"].indexOf(m.resultado) >= 0 ? m.resultado : "", dadosExtras: inteiro(m.dadosExtras, 0, 20) };
    });
    e.favores = lista(b.favores).slice(0, 100).map(function (x) {
      var f = objeto(x);
      return { id: texto(f.id, 80) || novoId("fv"), de: texto(f.de, 80), para: texto(f.para, 80), nivel: C.FAVORES[f.nivel] ? f.nivel : "trivial", descricao: texto(f.descricao, 400), pago: !!f.pago, visivel: !!f.visivel };
    });
    e.registro = lista(b.registro).slice(-LIMITE_REGISTRO).map(function (x) { var r = objeto(x); return { id: texto(r.id, 80) || novoId("rg"), tipo: texto(r.tipo, 30), texto: texto(r.texto, 600), privado: !!r.privado, sessao: inteiro(r.sessao, 0), noite: inteiro(r.noite, 0) }; });
    e.operacoes = lista(b.operacoes).map(String).slice(-200);
    return e;
  }

  function registrar(e, tipo, txt, privado) {
    e.registro.push({ id: novoId("rg"), tipo: tipo, texto: texto(txt, 600), privado: !!privado, sessao: e.sessao, noite: e.noite });
    if (e.registro.length > LIMITE_REGISTRO) e.registro = e.registro.slice(-LIMITE_REGISTRO);
  }

  /* ---------------- PERÍODOS → MOMENTOS DAS FICHAS ---------------- */

  /* Começar a sessão. `continuaCena`: a anterior parou no meio de uma
     cena de ação (a FdV das fichas fica como estava, p. 158). */
  function iniciarSessao(e, opcoes) {
    var x = opcoes || {};
    e.sessao++;
    e.sessaoAberta = true;
    registrar(e, "sessao", "Sessão " + e.sessao + (x.continuaCena ? " (continua a cena)" : ""));
    return { ok: true, momentos: [{ tipo: "inicioDaSessao", continuaCena: !!x.continuaCena }] };
  }

  /* Encerrar: Ambição de cada personagem (a mesa confirma), XP e o
     Remorso de quem tem Máculas — tudo processado nas fichas. */
  function encerrarSessao(e, opcoes) {
    var x = opcoes || {};
    if (!e.sessaoAberta) return { ok: false, motivo: "Não há sessão aberta." };
    e.sessaoAberta = false;
    registrar(e, "sessao", "Fim da sessão " + e.sessao);
    var fimHistoria = !!x.fimDaHistoria;
    if (fimHistoria) registrar(e, "historia", "Fim da história " + (e.historia.nome || ""));
    return { ok: true, momentos: [{ tipo: "fimDaSessao", ambicao: objeto(x.ambicao), xp: inteiro(x.xp, 0, 10, 1) + (fimHistoria ? 1 : 0) }] };
  }

  function novaNoite(e) {
    e.noite++;
    e.cena = null;
    registrar(e, "noite", "Noite " + e.noite);
    return { ok: true, momentos: [{ tipo: "novaNoite" }] };
  }

  function novaCena(e, dados) {
    var d = objeto(dados);
    var n = e.cena ? e.cena.n + 1 : 1;
    var momentos = e.cena ? [{ tipo: "fimDaCena" }] : [];
    e.cena = { id: novoId("ce"), nome: texto(d.nome, 120), tipo: TIPOS_DE_CENA[d.tipo] ? d.tipo : "destaque", modo: MODOS_DE_JOGO[d.modo] ? d.modo : "dados", turno: 0, n: n };
    registrar(e, "cena", (TIPOS_DE_CENA[e.cena.tipo]) + (e.cena.nome ? ": " + e.cena.nome : ""));
    momentos.push({ tipo: "novaCena" });
    return { ok: true, momentos: momentos };
  }

  function encerrarCena(e) {
    if (!e.cena) return { ok: false, motivo: "Não há cena aberta." };
    registrar(e, "cena", "Fim da cena");
    e.cena = null;
    e.conflitos.forEach(function (c) { c.ativo = false; });
    return { ok: true, momentos: [{ tipo: "fimDaCena" }] };
  }

  function proximoTurno(e) {
    if (!e.cena) return { ok: false, motivo: "Não há cena aberta." };
    e.cena.turno++;
    e.conflitos.forEach(function (c) { if (c.ativo) c.rodada++; });
    return { ok: true, momentos: [{ tipo: "fimDoTurno" }] };
  }

  function iniciarHistoria(e, nome) {
    e.historia = { id: novoId("hi"), nome: texto(nome, 120), n: e.historia.n + 1 };
    registrar(e, "historia", "História: " + e.historia.nome);
    return { ok: true, momentos: [] };
  }

  /* ---------------- PRINCÍPIOS, PNs, RELAÇÕES ---------------- */

  function adicionarPrincipio(e, txt) {
    var p = { id: novoId("pr"), texto: texto(txt, 300) };
    e.principios.push(p);
    return p;
  }

  /* Um PN a partir de um modelo do livro (cópia: o catálogo não muda)
     ou do zero. Editar marca como personalizado. */
  function adicionarPN(e, dados) {
    var d = objeto(dados);
    var base = d.modelo && AN ? AN.porChave(d.modelo) : null;
    var pn = normalizarPN({
      nome: d.nome || (base ? base.nome : ""), modelo: base ? base.chave : "", natureza: base ? base.natureza : (d.natureza || "mortal"),
      dados: base ? JSON.parse(JSON.stringify(base)) : objeto(d.dados), visivel: !!d.visivel, grupo: d.grupo,
      notasPublicas: d.notasPublicas, notasPrivadas: d.notasPrivadas, personalizado: !base || !!d.personalizado, personagemId: d.personagemId,
    });
    e.personagens.push(pn);
    return pn;
  }

  function editarPN(e, id, dados) {
    var pn = e.personagens.filter(function (p) { return p.id === id; })[0];
    if (!pn) return { ok: false, motivo: "PN não encontrado." };
    var d = objeto(dados);
    ["nome", "notasPublicas", "notasPrivadas", "grupo"].forEach(function (k) { if (d[k] !== undefined) pn[k] = texto(d[k], k === "notasPrivadas" ? 8000 : 4000); });
    if (d.visivel !== undefined) pn.visivel = !!d.visivel;
    if (d.dados) { pn.dados = objeto(d.dados); pn.personalizado = true; }
    return { ok: true };
  }

  /* Relações ligam IDs (de PCs ou PNs): Senhor, Pilares, Aliados,
     Contatos, Inimigos apontam para a mesma pessoa, nunca uma cópia. */
  function adicionarRelacao(e, dados) {
    var d = objeto(dados);
    var r = { id: novoId("re"), de: texto(d.de, 80), para: texto(d.para, 80), tipo: texto(d.tipo, 60), descricao: texto(d.descricao, 600), direcao: d.direcao === "dupla" ? "dupla" : "mao", visivel: !!d.visivel };
    if (!r.de || !r.para) return null;
    e.relacoes.push(r);
    return r;
  }

  /* ---------------- COTERIE E DOMÍNIO (p. 195–199) ---------------- */

  /* A parada da coterie: 1 por membro (2 com até 3 jogadores, a critério)
     + pontos que cada um doa das Vantagens + Defeitos de coterie. */
  function parada(e) {
    var co = e.coterie;
    var porMembro = co.membros.length <= 3 && co.pontosExtras ? 2 : 1;
    var doados = Object.keys(co.doacoes).reduce(function (s, k) { return s + inteiro(co.doacoes[k], 0, 20); }, 0);
    var defeitos = co.defeitos.reduce(function (s, d) { return s + d.pontos; }, 0);
    var total = co.membros.length * porMembro + doados + defeitos;
    var gasto = co.dominio.chasse + co.dominio.lien + co.dominio.portillon + co.antecedentes.reduce(function (s, a) { return s + a.pontos; }, 0);
    return { total: total, gasto: gasto, livre: total - gasto };
  }

  /* Escolher o tipo aplica domínio, Antecedentes e Defeitos dele; cada
     um marcado com origem "tipo" (separado do que o grupo compra). */
  function definirCoterie(e, dados) {
    var d = objeto(dados), co = e.coterie;
    if (d.nome !== undefined) co.nome = texto(d.nome, 120);
    if (d.membros) co.membros = lista(d.membros).map(String).slice(0, 20);
    if (d.tipo !== undefined) {
      var t = C.COTERIES[d.tipo];
      co.antecedentes = co.antecedentes.filter(function (a) { return a.origem !== "tipo"; });
      co.defeitos = co.defeitos.filter(function (a) { return a.origem !== "tipo"; });
      co.tipo = t ? d.tipo : "";
      co.dominio = { chasse: 0, lien: 0, portillon: 0 };
      if (t) {
        Object.keys(t.dominio).forEach(function (k) { co.dominio[k] = t.dominio[k]; });
        Object.keys(t.antecedentes).forEach(function (k) { co.antecedentes.push({ id: novoId("ca"), chave: k, pontos: t.antecedentes[k], nota: "", origem: "tipo" }); });
        Object.keys(objeto(t.defeitos)).forEach(function (k) { co.defeitos.push({ id: novoId("cd"), chave: k, pontos: t.defeitos[k], nota: "", origem: "tipo" }); });
      }
    }
    return { ok: true, parada: parada(e) };
  }

  /* ---------------- TESTES ESTENDIDOS, CONFLITOS, MEMORIAM ---------------- */

  function novoTesteEstendido(e, dados) {
    var d = objeto(dados);
    var t = { id: novoId("te"), nome: texto(d.nome, 120), variante: ["padrao", "series", "dificil", "cascata", "disputa"].indexOf(d.variante) >= 0 ? d.variante : "padrao", alvo: inteiro(d.alvo, 1, 99, 10), total: 0, rolagens: 0, bonusProxima: 0, encerrado: false, falhaTotal: false, visivel: d.visivel !== false };
    e.testesEstendidos.push(t);
    return t;
  }
  /* Soma um resultado (já concluído) ao teste. */
  function registrarNoEstendido(e, id, resultado) {
    var t = e.testesEstendidos.filter(function (x) { return x.id === id; })[0];
    if (!t || t.encerrado) return { ok: false, motivo: "Teste encerrado ou inexistente." };
    var D = global.RAMAVampiroDados;
    var s = D.testeEstendido({ total: t.total, rolagens: t.rolagens, encerrado: false }, resultado, t.variante === "padrao" || t.variante === "series" || t.variante === "disputa" ? "" : t.variante);
    t.total = s.total; t.rolagens = s.rolagens; t.bonusProxima = s.bonusProxima || 0; t.falhaTotal = !!s.falhaTotal;
    if (s.encerrado || t.total >= t.alvo) t.encerrado = true;
    return { ok: true, teste: t, concluido: t.total >= t.alvo };
  }

  function novoConflito(e, dados) {
    var d = objeto(dados);
    var c = { id: novoId("cf"), nome: texto(d.nome, 120), tipo: d.tipo === "social" ? "social" : "fisico", rodada: 1, ativo: true, participantes: lista(d.participantes).slice(0, 30).map(function (p) { return { ref: texto(p.ref, 80), nome: texto(p.nome, 120), lado: texto(p.lado, 40), iniciativa: inteiro(p.iniciativa, 0, 40) }; }), audiencia: texto(d.audiencia, 30), registro: [] };
    e.conflitos.push(c);
    return c;
  }

  /* Memoriam (p. 311–314): um por história; dados extras pelas
     circunstâncias; o objetivo vale pontos. */
  function iniciarMemoriam(e, dados) {
    var d = objeto(dados);
    if (e.memoriams.some(function (m) { return m.personagemId === d.personagemId && m.historia === e.historia.n; })) return { ok: false, motivo: "Uma Memoriam por história." };
    var extra = 0;
    if (d.noLocal) extra += 2;
    extra += inteiro(d.fomeSaciadaDeMortal, 0, 5);
    if (d.potenciaDoDoador !== undefined) extra += inteiro(d.potenciaDoDoador, 0, 10) + 1;
    if (d.artefato) extra += 3;
    var m = { id: novoId("me"), personagemId: texto(d.personagemId, 80), quando: texto(d.quando, 200), objetivo: texto(d.objetivo, 400), pontos: inteiro(d.pontos, 1, 3, 1), historia: e.historia.n, resultado: "", dadosExtras: extra };
    e.memoriams.push(m);
    return { ok: true, memoriam: m, momentos: [{ tipo: "checagem", motivo: "Entrar em Memoriam", personagemId: m.personagemId }] };
  }

  /* ---------------- A VISTA DOS JOGADORES ---------------- */

  function vistaDosJogadores(e, meusPersonagens) {
    var meus = lista(meusPersonagens).map(String);
    var visiveis = {}, ocultos = {};
    e.personagens.forEach(function (p) { if (p.visivel) visiveis[p.id] = true; else ocultos[p.id] = true; });
    function pontaVisivel(id) { return !ocultos[id] || !!visiveis[id]; }
    meus.forEach(function (id) { visiveis[id] = true; });
    e.coterie.membros.forEach(function (id) { visiveis[id] = true; });
    return {
      v: 1, epoca: e.epoca, sessao: e.sessao, noite: e.noite, sessaoAberta: e.sessaoAberta,
      historia: { nome: e.historia.nome, n: e.historia.n },
      cena: e.cena ? { nome: e.cena.nome, tipo: e.cena.tipo, modo: e.cena.modo, turno: e.cena.turno } : null,
      principios: e.principios.map(function (p) { return { id: p.id, texto: p.texto }; }),
      coterie: { nome: e.coterie.nome, tipo: e.coterie.tipo, dominio: e.coterie.dominio, antecedentes: e.coterie.antecedentes, defeitos: e.coterie.defeitos, membros: e.coterie.membros },
      personagens: e.personagens.filter(function (p) { return p.visivel; }).map(function (p) { return { id: p.id, nome: p.nome, natureza: p.natureza, grupo: p.grupo, notasPublicas: p.notasPublicas, personagemId: p.personagemId }; }),
      grupos: e.grupos.filter(function (g) { return g.visivel; }).map(function (g) { return { id: g.id, nome: g.nome }; }),
      /* Uma relação só vai se for visível E as duas pontas puderem ser
         vistas (um PC, ou um PN visível): nem a existência de um PN
         oculto vaza por ela. */
      relacoes: e.relacoes.filter(function (r) { return r.visivel && pontaVisivel(r.de) && pontaVisivel(r.para); }).map(function (r) { return { id: r.id, de: r.de, para: r.para, tipo: r.tipo, descricao: r.descricao, direcao: r.direcao }; }),
      conflitos: e.conflitos.filter(function (c) { return c.ativo; }).map(function (c) { return { id: c.id, nome: c.nome, tipo: c.tipo, rodada: c.rodada, participantes: c.participantes.filter(function (p) { return visiveis[p.ref] || meus.indexOf(p.ref) >= 0 || !p.ref; }) }; }),
      testesEstendidos: e.testesEstendidos.filter(function (t) { return t.visivel; }),
      memoriams: e.memoriams.filter(function (m) { return meus.indexOf(m.personagemId) >= 0; }),
      favores: e.favores.filter(function (f) { return f.visivel || meus.indexOf(f.de) >= 0 || meus.indexOf(f.para) >= 0; }),
      registro: e.registro.filter(function (r) { return !r.privado; }).slice(-80),
    };
  }

  global.RAMAVampiroCronica = {
    TIPOS_DE_CENA: TIPOS_DE_CENA, MODOS_DE_JOGO: MODOS_DE_JOGO,
    estadoVazio: estadoVazio, normalizar: normalizar, registrar: registrar,
    iniciarSessao: iniciarSessao, encerrarSessao: encerrarSessao, novaNoite: novaNoite, novaCena: novaCena, encerrarCena: encerrarCena,
    proximoTurno: proximoTurno, iniciarHistoria: iniciarHistoria,
    adicionarPrincipio: adicionarPrincipio, adicionarPN: adicionarPN, editarPN: editarPN, adicionarRelacao: adicionarRelacao,
    parada: parada, definirCoterie: definirCoterie,
    novoTesteEstendido: novoTesteEstendido, registrarNoEstendido: registrarNoEstendido, novoConflito: novoConflito, iniciarMemoriam: iniciarMemoriam,
    vistaDosJogadores: vistaDosJogadores,
  };
})(typeof window !== "undefined" ? window : globalThis);
