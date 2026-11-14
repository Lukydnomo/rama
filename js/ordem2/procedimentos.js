/* =====================================================================
   R.A.M.A. — Ordem Paranormal RPG II (Experimental) · procedimentos
   das missões (v9.1)
   ---------------------------------------------------------------------
   O que o site resolve numa missão — contadores, testes e efeitos —
   enquanto o Mestre decide narrativa e revelações. Tudo entra pela MESMA
   porta (RAMAOrdem2Mesa.aplicar), registrado aqui como operações e
   ganchos; o servidor roda esta cópia com o rolador dele.

     quadro        cena carregada de um PACOTE (conteúdo do Mestre, que
                   mora no servidor: backend/Ordem2Pacotes.local.gs, fora
                   do git) — pontos com estado oculto/anunciado, pistas com
                   pré-requisito, personagem exclusivo, número de
                   jogadores, anexos e ordem; o que cada personagem e o
                   grupo já sabem; revelação manual; flags de cena
     desafios      destrancar (senha secreta, alto/baixo/exato, tentativas
                   por rodada pelo Crime e limite da fechadura), senha de
                   teclado com bloqueio, arrombar (1 PV, RA até a PA),
                   alcançar seguro/arriscado, sustentar (1 PV, −1 passo
                   por rodada), equilíbrio (2d10 e reserva de d4), escalar
                   (acumular), travessia por áreas, hack técnico (faixa,
                   problema, tempo) e social (perguntas, chances), enigma
                   e encaixe de runas
     ferramentas   posse, cargas, leitura por ponto, laser por ambiente,
                   rádio (Tecnologia tira os falsos), laboratório (4–6
                   dados em sequência, fora do teto de 4) e o compêndio
     rodadas       sobrecarga e maldição por cena, uma vez por rodada,
                   com suspensão; afogamento; ondas; perseguição;
                   esconderijo — encerrar a rodada leva o número dela
     encontros     ondas com chegada, tributo, bloqueio da entrada,
                   efeitos em grupo e ações especiais das ameaças

   Uma pista não revelada, uma senha, a solução de um enigma e os
   bastidores do encontro nunca entram na VISTA do jogador.
   Copiado para backend/Ordem2.gs (testes/gerar-ordem2-gs.js).
   ===================================================================== */

(function (global) {
  "use strict";

  function K() { return global.RAMAOrdem2Catalogo; }
  function R() { return global.RAMAOrdem2; }
  function M() { return global.RAMAOrdem2Motor; }
  function ME() { return global.RAMAOrdem2Mesa; }
  function A() { return global.RAMAOrdem2Ameacas; }
  function lista(v) { return Array.isArray(v) ? v : []; }
  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  function texto(v, n) { return String(v === undefined || v === null ? "" : v).slice(0, n || 200); }
  function inteiro(v, a, b, p) { return R().inteiro(v, a, b, p); }
  function copiar(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
  function id() { return R().novoId(); }
  function agora(ctx) { return ctx && ctx.agora ? new Date(ctx.agora) : new Date(); }

  var VERSAO = 1;

  /* ---------------------------------------------------------------
     O ESTADO (e.proc)
     --------------------------------------------------------------- */
  function procVazio() {
    return {
      versao: VERSAO,
      pacote: { id: "", cena: "", nome: "", versao: 0 },
      rodada: 1, encerradas: [], presentes: [], jogadores: 0,
      anunciados: {}, flags: {}, grupo: [], anexos: {},
      itens: [], ferramentas: { posse: {}, cargas: {}, disponiveis: [] },
      compendium: { portador: "", permitidos: [], marcas: {} },
      desafios: [], tabelas: [], causouDano: {},
      agarres: [], encontro: null, perseguicao: null, esconderijo: null, recursos: {},
    };
  }
  function normalizarProc(bruto) {
    var b = obj(bruto), v = procVazio();
    var pc = obj(b.pacote);
    v.pacote = { id: texto(pc.id, 60), cena: texto(pc.cena, 60), nome: texto(pc.nome, 160), versao: inteiro(pc.versao, 0, 99999, 0) };
    v.rodada = inteiro(b.rodada, 1, 100000, 1);
    v.encerradas = lista(b.encerradas).map(function (n) { return inteiro(n, 0, 100000, 0); }).slice(-60);
    v.presentes = lista(b.presentes).map(String).slice(0, 12);
    v.jogadores = inteiro(b.jogadores, 0, 12, 0);
    Object.keys(obj(b.anunciados)).slice(0, 120).forEach(function (k) { v.anunciados[texto(k, 80)] = b.anunciados[k] === true; });
    Object.keys(obj(b.flags)).slice(0, 200).forEach(function (k) { var f = obj(b.flags[k]); v.flags[texto(k, 120)] = { grupo: f.grupo === true, pids: lista(f.pids).map(String).slice(0, 12) }; });
    v.grupo = lista(b.grupo).map(function (x) { var o = obj(x); return { id: texto(o.id, 80) || id(), pista: texto(o.pista, 80), ponto: texto(o.ponto, 80), texto: texto(o.texto, 1200), como: texto(o.como, 80), anexo: texto(o.anexo, 80) }; }).slice(-120);
    Object.keys(obj(b.anexos)).slice(0, 80).forEach(function (k) { var a = obj(b.anexos[k]); v.anexos[texto(k, 80)] = { documentoId: texto(a.documentoId, 80), url: /^https:\/\//.test(String(a.url || "")) ? texto(a.url, 600) : "", descricao: texto(a.descricao, 1200) }; });
    v.itens = lista(b.itens).map(function (x) { var o = obj(x); return { id: texto(o.id, 80) || id(), nome: texto(o.nome, 120) || "Item", com: texto(o.com, 80), local: texto(o.local, 80), publico: o.publico === true, usado: o.usado === true, nota: texto(o.nota, 400), runa: texto(o.runa, 40) }; }).slice(0, 60);
    var fe = obj(b.ferramentas);
    v.ferramentas = { posse: {}, cargas: {}, disponiveis: lista(fe.disponiveis).filter(function (f) { return K().FERRAMENTAS[f]; }) };
    Object.keys(obj(fe.posse)).forEach(function (f) { if (K().FERRAMENTAS[f]) v.ferramentas.posse[f] = texto(fe.posse[f], 80); });
    Object.keys(obj(fe.cargas)).forEach(function (f) { if (K().FERRAMENTAS[f]) v.ferramentas.cargas[f] = inteiro(fe.cargas[f], 0, 99, 0); });
    var co = obj(b.compendium);
    v.compendium = { portador: texto(co.portador, 80), permitidos: lista(co.permitidos).map(String).slice(0, 12), marcas: {} };
    Object.keys(obj(co.marcas)).slice(0, 12).forEach(function (pid) { v.compendium.marcas[texto(pid, 80)] = lista(co.marcas[pid]).map(function (s) { return texto(s, 120); }).slice(0, 120); });
    v.desafios = lista(b.desafios).map(normalizarDesafio).filter(Boolean).slice(0, 60);
    v.tabelas = lista(b.tabelas).map(normalizarTabela).filter(Boolean).slice(0, 8);
    Object.keys(obj(b.causouDano)).slice(-30).forEach(function (r) { v.causouDano[texto(r, 12)] = lista(b.causouDano[r]).map(String).slice(0, 20); });
    v.agarres = lista(b.agarres).map(function (x) { var o = obj(x); return o.vitima && o.por ? { vitima: texto(o.vitima, 80), por: texto(o.por, 80), desde: inteiro(o.desde, 0, 100000, 0), dano: lista(o.dano).length ? [inteiro(o.dano[0], 1, 9, 1), inteiro(o.dano[1], 2, 20, 6)] : [1, 6], soltouEm: inteiro(o.soltouEm, 0, 100000, 0) } : null; }).filter(Boolean).slice(0, 20);
    v.encontro = b.encontro && typeof b.encontro === "object" ? copiar(b.encontro) : null;
    v.perseguicao = b.perseguicao && typeof b.perseguicao === "object" ? copiar(b.perseguicao) : null;
    v.esconderijo = b.esconderijo && typeof b.esconderijo === "object" ? copiar(b.esconderijo) : null;
    Object.keys(obj(b.recursos)).slice(0, 12).forEach(function (k) { var r = obj(b.recursos[k]); v.recursos[texto(k, 40)] = { def: copiar(obj(r.def)), usados: lista(r.usados).map(String).slice(0, 12) }; });
    return v;
  }
  function normalizarDesafio(x) {
    var d = obj(x);
    if (!d.tipo) return null;
    return {
      id: texto(d.id, 80) || id(), ref: texto(d.ref, 80), tipo: texto(d.tipo, 30), nome: texto(d.nome, 120) || "Desafio",
      ponto: texto(d.ponto, 80), publico: d.publico === true,
      estado: ["aberto", "vencido", "danificado", "bloqueado", "encerrado"].indexOf(d.estado) >= 0 ? d.estado : "aberto",
      config: copiar(obj(d.config)), segredo: copiar(obj(d.segredo)), por: copiar(obj(d.por)), dados: copiar(obj(d.dados)),
      historico: lista(d.historico).map(function (h) { return texto(h, 300); }).slice(-30),
    };
  }
  function normalizarTabela(x) {
    var t = obj(x);
    if (!lista(t.linhas).length) return null;
    return {
      id: texto(t.id, 60) || id(), nome: texto(t.nome, 120) || "Tabela", tipo: t.tipo === "maldicao" ? "maldicao" : "sobrecarga",
      linhas: lista(t.linhas).slice(0, 30).map(function (l) { var o = obj(l); var x = obj(o.extraSe); return { de: inteiro(o.de, 0, 999, 1), ate: o.ate === null || o.ate === undefined ? 999 : inteiro(o.ate, 0, 999, 999), pd: texto(o.pd, 12), pv: texto(o.pv, 12), condicional: texto(o.condicional, 30), texto: texto(o.texto, 400), extraSe: x.flag ? { flag: texto(x.flag, 80), pv: texto(x.pv, 12), pd: texto(x.pd, 12) } : null }; }),
      inicio: inteiro(t.inicio, 0, 100000, 1), ativa: t.ativa === true, suspensa: t.suspensa === true,
      aplicadas: lista(t.aplicadas).map(function (n) { return inteiro(n, 0, 100000, 0); }).slice(-60),
      isentos: copiar(obj(t.isentos)), fonte: texto(t.fonte, 80),
    };
  }

  /* ---------------------------------------------------------------
     UTILITÁRIOS
     --------------------------------------------------------------- */
  function log(e, t, privado) { ME().log(e, t, privado); }
  function ev(s, t, privado) { s.eventos.push({ texto: String(t), privado: !!privado }); }
  function nomeDe(fichas, pid) { return fichas[pid] ? fichas[pid].nome : "?"; }
  function bloco(fichas, pid) { return fichas[pid] ? fichas[pid].bloco : null; }
  function podeAgir(papel, pid) { return !!papel.mestre || lista(papel.pode).indexOf(pid) >= 0; }
  /* A rodada que conta: a do combate do Beta; no Alpha (conflito simplificado,
     sem rodadas próprias) e fora de combate, a rodada da cena. */
  /* A rodada da atividade em curso: a do combate, se houver; senão a da
     cena. As TABELAS (sobrecarga, maldição) contam rodadas da cena: o
     combate avança o mesmo contador (v9.4), sem aplicar duas vezes. */
  function rodadaAtual(e) { return e.combate.ativo ? e.combate.rodada : e.proc.rodada; }
  /* "1", "1d4", "2d6+1" → { total, faces[] } */
  function rolarExpr(expr, rolar) {
    var t = String(expr === undefined || expr === null ? "0" : expr).replace(/\s/g, "").toLowerCase();
    if (Array.isArray(expr)) t = expr[0] + "d" + expr[1];
    var m = /^(\d*)d(\d+)([+-]\d+)?$/.exec(t);
    if (!m) { var n = parseInt(t, 10); return { total: Number.isFinite(n) ? Math.max(0, n) : 0, faces: [], expr: String(Number.isFinite(n) ? n : 0) }; }
    var q = Math.max(1, Math.min(20, parseInt(m[1] || "1", 10))), f = Math.max(2, Math.min(100, parseInt(m[2], 10)));
    var faces = []; for (var i = 0; i < q; i++) faces.push(rolar(f));
    var total = faces.reduce(function (a, b) { return a + b; }, 0) + (m[3] ? parseInt(m[3], 10) : 0);
    return { total: Math.max(0, total), faces: faces, expr: q + "d" + f + (m[3] || "") };
  }
  /* "2+1", "1d4+1": soma de partes (a maldição com o Ídolo quebrado). */
  function rolarSoma(expr, rolar) {
    var partes = String(expr).split("+").filter(Boolean);
    if (partes.length <= 1 || /^\d*d\d+[+-]\d+$/.test(String(expr))) return rolarExpr(expr, rolar);
    var tot = 0, faces = [], txt = [];
    partes.forEach(function (p) { var r = rolarExpr(p, rolar); tot += r.total; faces = faces.concat(r.faces); txt.push(r.expr); });
    return { total: tot, faces: faces, expr: txt.join("+") };
  }
  function descreverRolagem(r) { return r.faces.length ? r.expr + " [" + r.faces.join(", ") + "] = " + r.total : String(r.total); }
  function presentes(e, fichas) {
    var todos = Object.keys(fichas);
    var p = lista(e.proc.presentes).filter(function (x) { return todos.indexOf(x) >= 0; });
    return (p.length ? p : todos).filter(function (pid) { var b = bloco(fichas, pid); return b && !b.estado.morto && !b.estado.colapso; });
  }
  function numeroDeJogadores(e, fichas) { return e.proc.jogadores || presentes(e, fichas).length || Object.keys(fichas).length; }
  function semAcento(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
  function sortear(lista_, rolar) { return lista_.length ? lista_[(rolar(lista_.length) - 1) % lista_.length] : null; }
  function embaralhar(l, rolar) { var a = l.slice(); for (var i = a.length - 1; i > 0; i--) { var j = rolar(i + 1) - 1; var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  /* Uma perícia com especialização ("aptidao:exatas"): sem ela, d4. */
  function periciaEsp(b, chave) {
    var c = String(chave || "").split(":");
    var ch = K().ALIASES[c[0]] || c[0];
    var l = lista(b.base.pericias).filter(function (p) { return p.chave === ch; });
    var p = c[1] ? l.filter(function (q) { return semAcento(q.especializacao) === semAcento(c[1]); })[0] : l[0];
    return { per: p || null, faces: p ? R().dadoDaPericia(b, p) : 4 };
  }

  /* Flags: pré-requisitos, "parâmetros descobertos", resultados. */
  function flagAtiva(e, chave, pid) {
    var f = e.proc.flags[chave];
    return !!f && (f.grupo || (pid && f.pids.indexOf(pid) >= 0));
  }
  function ligarFlag(e, chave, pid) {
    var k = texto(chave, 120);
    if (!k) return;
    var f = e.proc.flags[k] || (e.proc.flags[k] = { grupo: false, pids: [] });
    if (pid) { if (f.pids.indexOf(pid) < 0) f.pids.push(pid); } else f.grupo = true;
  }

  /* ---------------------------------------------------------------
     PACOTES: a cena carregada vem do servidor e é HIDRATADA a cada
     leitura/operação; só o que o Mestre editou e o estado dinâmico ficam
     gravados (o conteúdo do pacote nunca é duplicado na planilha).
     --------------------------------------------------------------- */
  function cenaDoPacote(pacotes, pacoteId, cenaId) {
    var p = obj(obj(pacotes)[pacoteId]);
    return lista(p.cenas).filter(function (c) { return c.id === cenaId; })[0] || null;
  }
  function hidratar(e, pacotes) {
    var pc = e.proc.pacote;
    if (!pc.id || !pc.cena) return e;
    var pac = obj(obj(pacotes)[pc.id]);
    var cena = cenaDoPacote(pacotes, pc.id, pc.cena);
    if (!cena) return e;
    var locais = {};
    e.investigacao.pontos.forEach(function (p) { locais[p.id] = true; });
    lista(cena.pontos).forEach(function (bruto) {
      if (locais[bruto.id]) return;
      var p = ME().normalizarPonto(Object.assign({}, bruto, { origem: "pacote", revelado: e.proc.anunciados[bruto.id] === true }));
      p.id = bruto.id;
      e.investigacao.pontos.push(p);
    });
    Object.defineProperty(e.proc, "_cena", { value: { id: cena.id, nome: cena.nome, perfil: cena.perfil, tipo: cena.tipo, areas: copiar(lista(cena.areas)), anexos: copiar(lista(cena.anexos).concat(lista(pac.anexos))), compendium: copiar(cena.compendium || pac.compendium || null), roteiro: copiar(lista(cena.roteiro)), efeitos: copiar(obj(cena.efeitos)), versao: inteiro(pac.versao, 0, 99999, 0), pacoteNome: texto(pac.nome, 160) }, enumerable: false, configurable: true, writable: true });
    return e;
  }
  /* Antes de gravar: tira os pontos do pacote não editados, lembrando o
     estado anunciado de cada um. */
  function desidratar(e) {
    e.investigacao.pontos = e.investigacao.pontos.filter(function (p) {
      if (p.origem !== "pacote") return true;
      e.proc.anunciados[p.id] = p.revelado === true;
      return p.editado === true;
    });
    delete e.proc._cena;
    return e;
  }
  /* O que o Mestre vê da cena (anexos, compêndio, roteiro), para a tela. */
  function cenaParaMestre(e) {
    var c = e.proc._cena;
    return c ? copiar(c) : null;
  }
  function anexoDef(e, idA) {
    var c = e.proc._cena;
    var def = c ? lista(c.anexos).filter(function (a) { return a.id === idA; })[0] : null;
    return Object.assign({ id: idA, nome: def ? def.nome : idA, arquivo: def ? def.arquivo : "", veio: def ? def.veio !== false : false, alternativa: def ? def.alternativa || "" : "" }, e.proc.anexos[idA] || {});
  }

  function instanciarDesafio(def, rolar) {
    var d = normalizarDesafio(Object.assign({}, copiar(def), { ref: def.id, id: def.id }));
    var cf = d.config;
    if (d.tipo === "destrancar") {
      var senha = lista(obj(def.segredo).senha).length ? def.segredo.senha.map(Number) : null;
      if (!senha) { senha = []; for (var i = 0; i < inteiro(cf.dados, 1, 8, 3); i++) senha.push(rolar(inteiro(cf.faces, 2, 20, 6))); }
      d.segredo = { senha: senha };
      cf.dados = senha.length;
    }
    d.historico = [];
    return d;
  }

  OP("carregarCena", function (e, fichas, o, papel, rolar, s, ctx) {
    var cena = cenaDoPacote(ctx.pacotes, o.pacote, o.cena);
    if (!cena) return { ok: false, motivo: "Cena não encontrada no pacote (o pacote mora no servidor)." };
    var pac = obj(ctx.pacotes)[o.pacote];
    desidratar(e);
    e.investigacao.pontos = e.investigacao.pontos.filter(function (p) { return p.origem !== "pacote"; });
    var p = procVazio();
    p.pacote = { id: texto(o.pacote, 60), cena: texto(o.cena, 60), nome: texto(cena.nome, 160), versao: inteiro(pac.versao, 0, 99999, 0) };
    p.jogadores = inteiro(o.jogadores, 0, 12, 0);
    p.desafios = lista(cena.desafios).map(function (d) { return instanciarDesafio(d, rolar); });
    p.tabelas = lista(cena.tabelas).map(function (t) { return normalizarTabela(Object.assign({}, copiar(t), { aplicadas: [], isentos: {} })); }).filter(Boolean);
    p.itens = lista(cena.itens).map(function (i) { return { id: i.id, nome: i.nome, com: "", local: i.local || "", publico: i.publico === true, usado: false, nota: i.nota || "", runa: i.runa || "" }; });
    p.ferramentas.disponiveis = lista(cena.ferramentas).filter(function (f) { return K().FERRAMENTAS[f]; });
    p.ferramentas.disponiveis.forEach(function (f) { if (K().FERRAMENTAS[f].cargas) p.ferramentas.cargas[f] = K().FERRAMENTAS[f].cargas; });
    lista(cena.anunciados).forEach(function (pid) { p.anunciados[pid] = true; });
    Object.keys(obj(cena.recursos)).forEach(function (k) { p.recursos[k] = { def: copiar(cena.recursos[k]), usados: [] }; });
    /* Herança do ato anterior (Alpha p. 81): desafios já resolvidos seguem resolvidos. */
    if (o.manterFlags && e.proc) Object.keys(e.proc.flags).forEach(function (k) { p.flags[k] = e.proc.flags[k]; });
    if (cena.encontro) p.encontro = { config: copiar(cena.encontro), ativo: false };
    e.proc = p;
    hidratar(e, ctx.pacotes);
    e.cena.nome = texto(cena.nome, 120);
    if (cena.tipo) e.cena.tipo = ["livre", "investigacao", "combate", "acao"].indexOf(cena.tipo) >= 0 ? cena.tipo : e.cena.tipo;
    log(e, "Cena carregada: " + cena.nome + ".");
    log(e, "Pacote " + texto(pac.nome, 80) + " · cena " + cena.nome + " (versão " + p.pacote.versao + ").", true);
    ev(s, "Cena carregada: " + cena.nome + ". Anuncie os pontos de interesse quando quiser.");
  }, { mestre: true, semFicha: true, rev: true });

  OP("descarregarCena", function (e, fichas, o, papel, rolar, s) {
    desidratar(e);
    e.investigacao.pontos = e.investigacao.pontos.filter(function (p) { return p.origem !== "pacote"; });
    var flags = e.proc.flags;
    e.proc = procVazio();
    if (o.manterFlags) e.proc.flags = flags;
    ev(s, "Cena do pacote descarregada (pontos próprios e descobertas continuam).");
  }, { mestre: true, semFicha: true, rev: true });

  OP("configurarCena", function (e, fichas, o, papel, rolar, s) {
    if (o.presentes) e.proc.presentes = lista(o.presentes).map(String).slice(0, 12);
    if (o.jogadores !== undefined) e.proc.jogadores = inteiro(o.jogadores, 0, 12, 0);
    if (o.rodada !== undefined) e.proc.rodada = inteiro(o.rodada, 1, 100000, 1);
    ev(s, "Cena configurada.", true);
  }, { mestre: true, semFicha: true });

  /* ---------------------------------------------------------------
     O QUADRO: pistas, flags, revelação manual, anexos
     --------------------------------------------------------------- */
  function restricaoCabe(fichas, pid, q, b) {
    if (!q.restricao) return true;
    var alvo = semAcento(q.restricao);
    var nome = semAcento(nomeDe(fichas, pid) || (b && b.nome));
    var preset = semAcento(b && b.procedencia ? b.procedencia.preset || b.procedencia.id || "" : "");
    return !!alvo && (nome.indexOf(alvo) >= 0 || preset === alvo);
  }
  function jaSabe(e, pid, pistaId) {
    if (!pistaId) return false;
    return lista(e.investigacao.descobertas[pid]).some(function (d) { return d.pista === pistaId; }) || e.proc.grupo.some(function (d) { return d.pista === pistaId; });
  }
  /* "a" exige a flag; "!a" exige que NÃO esteja; "a|b" aceita qualquer uma. */
  function umRequisito(e, pid, f) {
    if (f.charAt(0) === "!") return !flagAtiva(e, f.slice(1), pid);
    return f.split("|").some(function (x) { return x.indexOf("item:") === 0 ? e.proc.itens.some(function (i) { return i.id === x.slice(5) && i.com === pid; }) : flagAtiva(e, x, pid); });
  }
  function requisitosOk(e, pid, q) { return lista(q.requer).every(function (f) { return umRequisito(e, pid, f); }); }
  var FICHAS_DO_REVELAR = null;
  ME().gancho("pistaBloqueada", function (e, pid, q, b) {
    if (!e.proc) return false;
    if (!requisitosOk(e, pid, q)) return true;
    if (q.jogadores.length && FICHAS_DO_REVELAR && q.jogadores.indexOf(numeroDeJogadores(e, FICHAS_DO_REVELAR)) < 0) return true;
    if (q.restricao && FICHAS_DO_REVELAR && !restricaoCabe(FICHAS_DO_REVELAR, pid, q, b)) return true;
    if (e.proc.grupo.some(function (d) { return d.pista === q.id; })) return true;
    return false;
  });
  ME().gancho("aoRevelar", function (e, pid, d, q) { concederPorPista(e, pid, q); });
  ME().GANCHOS.flag = flagAtiva;
  function concederPorPista(e, pid, q) {
    lista(q.concede).forEach(function (c) {
      var m = /^(item|flag|grupo):(.+)$/.exec(c);
      if (!m) return;
      if (m[1] === "flag") ligarFlag(e, m[2], pid);
      if (m[1] === "grupo") ligarFlag(e, m[2], null);
      if (m[1] === "item") { var it = e.proc.itens.filter(function (x) { return x.id === m[2]; })[0]; if (it && !it.com) it.com = pid; }
    });
  }
  function acharPista(e, pontoId, pistaId) {
    var ponto = e.investigacao.pontos.filter(function (p) { return p.id === pontoId; })[0];
    var q = ponto ? ponto.pistas.filter(function (x) { return x.id === pistaId; })[0] : null;
    return { ponto: ponto, pista: q };
  }
  /* O Mestre revela uma pista (do quadro ou livre) a personagens ou ao grupo. */
  OP("revelarPista", function (e, fichas, o, papel, rolar, s) {
    var achado = o.pista ? acharPista(e, o.ponto, o.pista) : { ponto: null, pista: null };
    if (o.pista && !achado.pista) return { ok: false, motivo: "Pista não encontrada no quadro." };
    var txt = achado.pista ? achado.pista.texto : texto(o.texto, 1200);
    if (!txt) return { ok: false, motivo: "Escreva a pista." };
    var como = texto(o.como, 80) || "Mestre";
    var anexo = achado.pista ? achado.pista.anexo : texto(o.anexo, 80);
    if (o.para === "grupo") {
      if (achado.pista && e.proc.grupo.some(function (d) { return d.pista === achado.pista.id; })) return { ok: false, motivo: "O grupo já tem essa pista." };
      e.proc.grupo.push({ id: id(), pista: achado.pista ? achado.pista.id : "", ponto: texto(o.ponto, 80), texto: txt, como: como, anexo: anexo });
      if (achado.pista) concederPorPista(e, null, achado.pista);
      ev(s, "O Mestre revela uma pista ao grupo.");
      log(e, "Pista para o grupo (" + como + ").");
      return;
    }
    var para = lista(o.para).map(String).filter(function (pid) { return fichas[pid]; });
    if (!para.length) return { ok: false, motivo: "Escolha para quem." };
    var dados = 0;
    para.forEach(function (pid) {
      if (achado.pista && jaSabe(e, pid, achado.pista.id)) return;
      var ds = e.investigacao.descobertas[pid] || (e.investigacao.descobertas[pid] = []);
      ds.push({ id: id(), pista: achado.pista ? achado.pista.id : "", ponto: texto(o.ponto, 80), texto: txt, como: como, critico: false, anexo: anexo });
      if (achado.pista) concederPorPista(e, pid, achado.pista);
      dados++;
    });
    if (!dados) return { ok: false, motivo: "Quem foi escolhido já tem essa pista." };
    ev(s, "O Mestre revela uma pista para " + para.map(function (p) { return nomeDe(fichas, p); }).join(", ") + ".");
    log(e, "Pista revelada (" + como + ") para " + para.map(function (p) { return nomeDe(fichas, p); }).join(", ") + ".");
  }, { mestre: true });

  /* Recapitular, Compartilhar e Interagir: depois do sucesso (ou da
     interação), o Mestre confirma a coerência escolhendo a pista nova. */
  OP("concederPista", function (e, fichas, o, papel, rolar, s) {
    var sol = e.investigacao.solicitacoes.filter(function (x) { return x.id === o.solicitacao; })[0];
    if (!sol) return { ok: false, motivo: "Solicitação não encontrada." };
    if (sol.concedida) return { ok: false, motivo: "Essa solicitação já rendeu a pista dela." };
    /* Interagir e o crítico examinando (v9.4): o Mestre decide; sem teste. */
    var semTeste = sol.tipo === "interagir" || sol.tipo === "critico";
    var ok = semTeste ? ["pendente", "resolvida"].indexOf(sol.estado) >= 0 : sol.estado === "sucesso";
    if (!ok) return { ok: false, motivo: semTeste ? "Já fechada." : "Só depois de um teste bem-sucedido." };
    var pid = sol.tipo === "compartilhar" ? sol.aliado : sol.quem;
    var achado = o.pista ? acharPista(e, o.ponto, o.pista) : { pista: null };
    if (o.pista && !achado.pista) return { ok: false, motivo: "Pista não encontrada." };
    if (achado.pista && jaSabe(e, pid, achado.pista.id)) return { ok: false, motivo: nomeDe(fichas, pid) + " já tem essa pista: escolha uma nova." };
    var txt = achado.pista ? achado.pista.texto : texto(o.texto, 1200);
    if (!txt) return { ok: false, motivo: "Escolha ou escreva a pista." };
    var ds = e.investigacao.descobertas[pid] || (e.investigacao.descobertas[pid] = []);
    var como = { recapitular: "Recapitular", compartilhar: "Compartilhar", interagir: "Interagir" }[sol.tipo];
    ds.push({ id: id(), pista: achado.pista ? achado.pista.id : "", ponto: texto(o.ponto || sol.ponto, 80), texto: txt, como: como, critico: false, anexo: achado.pista ? achado.pista.anexo : "" });
    if (achado.pista) concederPorPista(e, pid, achado.pista);
    sol.concedida = true;
    if (sol.tipo === "interagir") { sol.estado = "resolvida"; if (o.resposta) sol.resposta = texto(o.resposta, 1200); }
    ev(s, nomeDe(fichas, pid) + " recebe a pista nova (" + como + ").");
    log(e, nomeDe(fichas, pid) + ": pista nova por " + como + ".");
  }, { mestre: true });

  OP("flag", function (e, fichas, o, papel, rolar, s) {
    var k = texto(o.chave, 120);
    if (!k) return { ok: false, motivo: "Informe a flag." };
    if (o.valor === false) delete e.proc.flags[k];
    else ligarFlag(e, k, o.personagem ? String(o.personagem) : null);
    ev(s, "Flag " + k + (o.valor === false ? " desligada." : " ligada."), true);
  }, { mestre: true, semFicha: true });

  OP("anexo", function (e, fichas, o, papel, rolar, s) {
    var k = texto(o.id, 80);
    if (!k) return { ok: false, motivo: "Anexo sem id." };
    var url = String(o.url || "");
    if (url && !/^https:\/\//.test(url)) return { ok: false, motivo: "O endereço precisa começar com https://." };
    e.proc.anexos[k] = { documentoId: texto(o.documentoId, 80), url: texto(url, 600), descricao: texto(o.descricao, 1200) };
    ev(s, "Anexo " + k + " ligado.", true);
  }, { mestre: true, semFicha: true });

  /* ---------------------------------------------------------------
     ITENS DE CENA (corda, virote, runas, crânio…)
     --------------------------------------------------------------- */
  OP("item", function (e, fichas, o, papel, rolar, s) {
    var it = e.proc.itens.filter(function (x) { return x.id === o.id; })[0];
    if (!it) { it = { id: texto(o.id, 80) || id(), nome: texto(o.nome, 120) || "Item", com: "", local: "", publico: false, usado: false, nota: "", runa: texto(o.runa, 40) }; e.proc.itens.push(it); }
    if (o.nome) it.nome = texto(o.nome, 120);
    if (o.com !== undefined) it.com = o.com && fichas[o.com] ? String(o.com) : "";
    if (o.publico !== undefined) it.publico = o.publico === true;
    if (o.usado !== undefined) it.usado = o.usado === true;
    if (o.nota !== undefined) it.nota = texto(o.nota, 400);
    ev(s, it.nome + (it.com ? " está com " + nomeDe(fichas, it.com) : "") + ".", !it.publico && !it.com);
  }, { mestre: true });
  OP("passarItem", function (e, fichas, o, papel, rolar, s) {
    var it = e.proc.itens.filter(function (x) { return x.id === o.item; })[0];
    if (!it || !it.com) return { ok: false, motivo: "Item não encontrado." };
    if (!podeAgir(papel, it.com)) return { ok: false, motivo: "O item não está com você." };
    if (!fichas[o.para]) return { ok: false, motivo: "Para quem?" };
    it.com = String(o.para);
    ev(s, nomeDe(fichas, o.para) + " recebe " + it.nome + ".");
    log(e, nomeDe(fichas, o.para) + " recebe " + it.nome + ".");
  });

  /* ---------------------------------------------------------------
     DESAFIOS
     --------------------------------------------------------------- */
  function desafio(e, idD) { return e.proc.desafios.filter(function (d) { return d.id === idD; })[0] || null; }
  function hist(d, t) { d.historico.push(String(t).slice(0, 300)); d.historico = d.historico.slice(-30); }
  function vencer(e, d, s, pid, texto_) {
    d.estado = "vencido";
    ligarFlag(e, "desafio:" + d.id, d.config.flagPessoal ? pid : null);
    lista(d.config.concede).forEach(function (c) { var m = /^(item|flag|grupo):(.+)$/.exec(c); if (!m) return; if (m[1] === "item") { var it = e.proc.itens.filter(function (x) { return x.id === m[2]; })[0]; if (it && !it.com && pid) it.com = pid; } else ligarFlag(e, m[2], m[1] === "flag" ? pid : null); });
    hist(d, texto_ || "Vencido.");
    ev(s, d.nome + ": " + (texto_ || "vencido") + ".");
    log(e, d.nome + ": " + (texto_ || "vencido") + ".");
  }
  function por(d, pid) { return d.por[pid] || (d.por[pid] = {}); }
  function testeDoDesafio(e, fichas, o, papel, rolar, s, ctx, d, pedido, extra) {
    var pid = String(o.quem || "");
    return ME().OPERACOES.teste(e, fichas, { quem: pid, pedido: pedido, contexto: { proc: Object.assign({ tipo: "desafio", desafio: d.id }, extra || {}) }, confirmar: o.confirmar, aguardar: o.aguardar }, papel, rolar, s, ctx);
  }
  function exigirAgente(fichas, papel, o) {
    var pid = String(o.quem || ""), b = bloco(fichas, pid);
    if (!b) return { ok: false, motivo: "Personagem não encontrado." };
    if (!podeAgir(papel, pid)) return { ok: false, motivo: "Você não conduz este personagem." };
    return { ok: true, pid: pid, b: b };
  }
  function passosDoDesafio(e, d, pid) {
    var l = [];
    lista(d.config.passos).forEach(function (p) { if (!p.flag || flagAtiva(e, p.flag, pid)) l.push({ alvo: "pericia", n: inteiro(p.n, -4, 4, 0), fonte: texto(p.fonte, 60) || d.nome }); });
    return l;
  }

  var ACOES_DESAFIO = {};
  OP("desafioAgir", function (e, fichas, o, papel, rolar, s, ctx) {
    var d = desafio(e, o.id);
    if (!d) return { ok: false, motivo: "Desafio não encontrado." };
    if (!papel.mestre && (!d.publico || (d.ponto && e.investigacao.pontos.some(function (x) { return x.id === d.ponto && !x.revelado; })))) return { ok: false, motivo: "Desafio não encontrado." };
    var ag = exigirAgente(fichas, papel, o);
    if (!ag.ok) return ag;
    var h = (ACOES_DESAFIO[d.tipo] || {})[o.acao];
    if (!h) return { ok: false, motivo: "Ação desconhecida para " + d.nome + "." };
    if (lista(d.config.requer).length && !requisitosOk(e, ag.pid, { requer: d.config.requer })) return { ok: false, motivo: texto(d.config.faltaTexto, 200) || d.nome + ": ainda não dá (falta um passo antes)." };
    if (["vencido", "encerrado"].indexOf(d.estado) >= 0 && !h.depois) return { ok: false, motivo: d.nome + ": já resolvido." };
    return h.fn(e, fichas, o, papel, rolar, s, ctx, d, ag.pid, ag.b);
  });
  OP("desafioMestre", function (e, fichas, o, papel, rolar, s, ctx) {
    var d = desafio(e, o.id);
    if (o.acao === "criar") {
      var nd = normalizarDesafio(Object.assign({ publico: false }, obj(o.desafio)));
      if (!nd) return { ok: false, motivo: "Desafio inválido." };
      e.proc.desafios.push(instanciarDesafio(nd, rolar));
      ev(s, "Desafio criado: " + nd.nome + ".", true);
      return;
    }
    if (!d) return { ok: false, motivo: "Desafio não encontrado." };
    if (o.acao === "anunciar") d.publico = o.valor !== false;
    else if (o.acao === "resolver") vencer(e, d, s, String(o.personagem || ""), "resolvido pelo Mestre");
    else if (o.acao === "reabrir") { d.estado = "aberto"; hist(d, "Reaberto pelo Mestre."); }
    else if (o.acao === "danificar") { d.estado = "danificado"; hist(d, "Danificado (Mestre)."); }
    else if (o.acao === "ajustar") {
      var cf = obj(o.config);
      ["dt", "pa", "max", "meta", "sucessos", "necessarias", "segundos"].forEach(function (k) { if (cf[k] !== undefined && cf[k] !== null && cf[k] !== "") d.config[k] = inteiro(cf[k], 0, 999, 0); });
      if (cf.bonusTentativas !== undefined) d.config.bonusTentativas = inteiro(cf.bonusTentativas, 0, 20, 0);
      hist(d, "Ajustado pelo Mestre.");
    }
    else if (o.acao === "aceitarResposta") {
      var x = por(d, String(o.personagem || ""));
      x.acertos = (x.acertos || 0) + 1;
      hist(d, "O Mestre aceita uma resposta de " + nomeDe(fichas, o.personagem) + ".");
      checarHackSocial(e, fichas, d, String(o.personagem || ""), s);
    }
    else if (o.acao === "remover") e.proc.desafios = e.proc.desafios.filter(function (x) { return x.id !== d.id; });
    else return { ok: false, motivo: "Ação desconhecida." };
    ev(s, d.nome + ": " + o.acao + ".", true);
  }, { mestre: true });

  /* DESTRANCAR (Alpha p. 24; Beta p. 16) */
  ACOES_DESAFIO.destrancar = {
    tentar: { fn: function (e, fichas, o, papel, rolar, s, ctx, d, pid, b) {
      if (d.estado === "danificado") return { ok: false, motivo: d.nome + ": a fechadura foi danificada — só na força ou com a chave." };
      var cf = d.config, senha = lista(d.segredo.senha);
      var faces = inteiro(cf.faces, 2, 20, 6);
      var t = lista(o.valores).map(function (v) { return inteiro(v, 1, faces, 1); });
      if (t.length !== senha.length) return { ok: false, motivo: "Ponha " + senha.length + " dados." };
      var crime = periciaEsp(b, "crime");
      var porRodada = M().tentativasDeDestrancar(crime.faces);
      var x = por(d, pid), r = rodadaAtual(e);
      if (x.rodada !== r) { x.rodada = r; x.n = 0; }
      if (x.n >= porRodada) return { ok: false, motivo: "Crime d" + crime.faces + ": " + porRodada + " tentativa(s) por rodada — já usadas." };
      var bonusFlag = cf.bonusTentativasSe && flagAtiva(e, cf.bonusTentativasSe.flag, null) ? inteiro(cf.bonusTentativasSe.n, 0, 9, 1) : 0;
      var max = cf.max === null || cf.max === undefined || cf.max === "" ? null : inteiro(cf.max, 1, 99, 3) + inteiro(cf.bonusTentativas, 0, 20, 0) + bonusFlag;
      d.dados.total = inteiro(d.dados.total, 0, 999, 0);
      if (max !== null && d.dados.total >= max) { d.estado = "danificado"; return { ok: false, motivo: "A fechadura já foi danificada." }; }
      x.n++; d.dados.total++;
      var resp = M().respostaDaFechadura(senha, t);
      var acertou = resp.every(function (z) { return z === "exato"; });
      x.ultimas = (x.ultimas || []).concat([{ t: t, r: resp }]).slice(-12);
      var linha = nomeDe(fichas, pid) + " tenta " + t.join("-") + ": " + resp.join(", ") + ".";
      hist(d, linha);
      s.resultado.resposta = resp;
      if (acertou) { vencer(e, d, s, pid, "destrancado por " + nomeDe(fichas, pid)); return; }
      ev(s, linha);
      log(e, d.nome + ": " + linha);
      if (max !== null && d.dados.total >= max) { d.estado = "danificado"; hist(d, "Máximo de tentativas: a fechadura foi danificada."); ev(s, d.nome + ": o máximo de tentativas acabou — a fechadura foi danificada (só na força ou com a chave)."); }
    } },
    chave: { fn: function (e, fichas, o, papel, rolar, s, ctx, d, pid) {
      var it = e.proc.itens.filter(function (x) { return x.id === d.config.chave && x.com === pid; })[0];
      if (!it) return { ok: false, motivo: "Você não tem a chave." };
      vencer(e, d, s, pid, "aberto com " + it.nome);
    } },
  };
  /* SENHA de teclado (Alpha p. 50): erros bloqueiam por rodadas. */
  ACOES_DESAFIO.senha = {
    tentar: { fn: function (e, fichas, o, papel, rolar, s, ctx, d, pid) {
      var r = rodadaAtual(e);
      if (d.dados.bloqueadoAte && r <= d.dados.bloqueadoAte) return { ok: false, motivo: d.nome + ": bloqueado até o fim da rodada " + d.dados.bloqueadoAte + "." };
      var t = semAcento(o.texto).replace(/\s/g, "");
      if (!t) return { ok: false, motivo: "Digite a senha." };
      if (t === semAcento(d.segredo.resposta).replace(/\s/g, "")) { vencer(e, d, s, pid, "senha correta, por " + nomeDe(fichas, pid)); return; }
      d.dados.erros = inteiro(d.dados.erros, 0, 999, 0) + 1;
      var bl = obj(d.config.bloqueio);
      var linha = nomeDe(fichas, pid) + " digita " + t + ": errado.";
      if (bl.erros && d.dados.erros % bl.erros === 0) { d.dados.bloqueadoAte = r + inteiro(bl.rodadas, 1, 20, 2); linha += " " + bl.erros + " erros: bloqueado por " + bl.rodadas + " rodada(s)."; }
      hist(d, linha); ev(s, linha); log(e, d.nome + ": " + linha);
    } },
  };
  /* ARROMBAR: 1 PV, Atletismo contra a DT, RA até a PA. */
  ACOES_DESAFIO.arrombar = {
    tentar: { fn: function (e, fichas, o, papel, rolar, s, ctx, d, pid, b) {
      var custo = inteiro(d.config.custoPv, 0, 9, 1);
      if (b.recursos.pv.atual < custo) return { ok: false, motivo: "Arrombar custa " + custo + " PV." };
      var pg = M().pagarCustos(b, { pv: custo }); if (!pg.ok) return pg;
      ev(s, nomeDe(fichas, pid) + " gasta " + custo + " PV no esforço (" + d.nome + ").");
      return testeDoDesafio(e, fichas, o, papel, rolar, s, ctx, d, Object.assign({}, obj(o.pedido), { pericia: d.config.pericia || "atletismo", dt: inteiro(d.config.dt, 0, 40, 7), rotulo: "Arrombar: " + d.nome, passos: lista(obj(o.pedido).passos).concat(passosDoDesafio(e, d, pid)) }), { acao: "arrombar" });
    } },
  };
  /* ALCANÇAR (Alpha p. 25; Beta p. 17): seguro (2 ações) ou arriscado. */
  ACOES_DESAFIO.alcancar = {
    seguro: { fn: function (e, fichas, o, papel, rolar, s, ctx, d, pid) {
      var cf = d.config, sg = obj(cf.seguro);
      var x = por(d, pid);
      if (x.alcancou) return { ok: false, motivo: "Você já alcançou." };
      return testeDoDesafio(e, fichas, o, papel, rolar, s, ctx, d, Object.assign({}, obj(o.pedido), { pericia: sg.pericia || cf.pericia || "acrobacia", dt: inteiro(sg.dt !== undefined ? sg.dt : cf.dt, 0, 40, 7), rotulo: d.nome + " — seguro (" + ((x.etapa || 0) + 1) + "/2)" }), { acao: "seguro" });
    } },
    arriscado: { fn: function (e, fichas, o, papel, rolar, s, ctx, d, pid) {
      var cf = d.config, ar = obj(cf.arriscado);
      if (por(d, pid).alcancou) return { ok: false, motivo: "Você já alcançou." };
      return testeDoDesafio(e, fichas, o, papel, rolar, s, ctx, d, Object.assign({}, obj(o.pedido), { pericia: ar.pericia || cf.pericia || "acrobacia", dt: inteiro(ar.dt !== undefined ? ar.dt : inteiro(cf.dt, 0, 40, 7) + K().DESAFIOS.alcancar.arriscadoDt, 0, 40, 10), rotulo: d.nome + " — arriscado" }), { acao: "arriscado" });
    } },
  };
  /* SUSTENTAR: erguer (1 PV + Atletismo); fim de cada rodada, novo teste
     com −1 passo por rodada já sustentada; quem passa embaixo/por ela. */
  ACOES_DESAFIO.sustentar = {
    erguer: { fn: function (e, fichas, o, papel, rolar, s, ctx, d, pid, b) {
      if (d.dados.sustentador) return { ok: false, motivo: nomeDe(fichas, d.dados.sustentador) + " já está sustentando." };
      var custo = inteiro(d.config.custoPv, 0, 9, 1);
      var pg = M().pagarCustos(b, { pv: custo }); if (!pg.ok) return { ok: false, motivo: "Sustentar custa " + custo + " PV." };
      return testeDoDesafio(e, fichas, o, papel, rolar, s, ctx, d, Object.assign({}, obj(o.pedido), { pericia: d.config.pericia || "atletismo", dt: inteiro(d.config.dt, 0, 40, 7), rotulo: "Sustentar: " + d.nome }), { acao: "erguer" });
    } },
    soltar: { depois: true, fn: function (e, fichas, o, papel, rolar, s, ctx, d, pid) {
      if (d.dados.sustentador !== pid) return { ok: false, motivo: "Você não está sustentando." };
      d.dados.sustentador = ""; d.dados.rodadas = 0;
      hist(d, nomeDe(fichas, pid) + " solta."); ev(s, nomeDe(fichas, pid) + " solta " + d.nome + ".");
    } },
    passar: { depois: true, fn: function (e, fichas, o, papel, rolar, s, ctx, d, pid) {
      if (!d.dados.sustentador) return { ok: false, motivo: "Ninguém está sustentando." };
      var r = rodadaAtual(e);
      d.dados.passando = lista(d.dados.passando).filter(function (p) { return p.rodada === r; });
      var limite = inteiro(d.config.porRodada, 0, 12, 0);
      if (limite && d.dados.passando.length >= limite) return { ok: false, motivo: "Só " + limite + " pessoa(s) por rodada." };
      if (d.dados.passando.some(function (p) { return p.pid === pid; })) return { ok: false, motivo: "Você já está passando nesta rodada." };
      d.dados.passando.push({ pid: pid, rodada: r });
      ligarFlag(e, "passou:" + d.id, pid);
      hist(d, nomeDe(fichas, pid) + " passa por baixo/pela abertura."); ev(s, nomeDe(fichas, pid) + " passa (" + d.nome + "); se a sustentação falhar no fim da rodada, sofre o dano.");
    } },
  };
  /* EQUILÍBRIO (Beta p. 17). */
  function reservaInicial(b) { var a = periciaEsp(b, "acrobacia"); return M().dadosDeEquilibrio(a.faces); }
  ACOES_DESAFIO.equilibrio = {
    rolar: { fn: function (e, fichas, o, papel, rolar, s, ctx, d, pid, b) {
      var x = por(d, pid);
      if (x.caindo) return { ok: false, motivo: "Você está caindo: gaste um dado de equilíbrio ou caia." };
      if (x.concluido) return { ok: false, motivo: "Você já atravessou." };
      if (x.reserva === undefined) x.reserva = reservaInicial(b);
      var r = rodadaAtual(e);
      if (d.config.porRodada !== false && x.rodada === r) return { ok: false, motivo: "Uma rolagem de equilíbrio por rodada." };
      x.rodada = r;
      x.d10 = [rolar(10), rolar(10)];
      x.gastos = [];
      return conferirEquilibrio(e, fichas, d, pid, x, s, rolar);
    } },
    gastar: { fn: function (e, fichas, o, papel, rolar, s, ctx, d, pid) {
      var x = por(d, pid);
      if (!x.caindo) return { ok: false, motivo: "Você não está caindo." };
      if (!x.reserva) return { ok: false, motivo: "Sem dados de equilíbrio." };
      var i = inteiro(o.dado, 0, 1, 0);
      var v = rolar(4);
      x.reserva--; x.d10[i] += v; x.gastos = (x.gastos || []).concat([v]);
      ev(s, nomeDe(fichas, pid) + " gasta um dado de equilíbrio: d4 = " + v + " → " + x.d10.join(" e ") + ".");
      return conferirEquilibrio(e, fichas, d, pid, x, s, rolar);
    } },
    cair: { fn: function (e, fichas, o, papel, rolar, s, ctx, d, pid, b) {
      var x = por(d, pid);
      if (!x.caindo) return { ok: false, motivo: "Você não está caindo." };
      x.caindo = false;
      var f = obj(d.config.falha);
      var dn = rolarExpr(f.dano || "0", rolar);
      if (dn.total) M().aplicarDano(b, { valor: dn.total, tipo: "fisico", externo: true }).forEach(function (y) { ev(s, nomeDe(fichas, pid) + ": " + y.texto); });
      if (f.recomecar !== false) x.sucessos = 0;
      if (f.flag) ligarFlag(e, f.flag, pid);
      var linha = nomeDe(fichas, pid) + " cai (" + d.nome + ")" + (dn.total ? ": " + descreverRolagem(dn) + " de dano" : "") + (f.texto ? " — " + f.texto : "") + ".";
      hist(d, linha); ev(s, linha); log(e, d.nome + ": " + linha);
    } },
  };
  function conferirEquilibrio(e, fichas, d, pid, x, s) {
    var ok = M().equilibrado(x.d10[0], x.d10[1]);
    var linha = nomeDe(fichas, pid) + " · equilíbrio: " + x.d10.join(" e ");
    s.resultado.equilibrio = { d10: x.d10.slice(), reserva: x.reserva, equilibrado: ok };
    if (ok) {
      x.caindo = false;
      x.sucessos = (x.sucessos || 0) + 1;
      var meta = inteiro(d.config.sucessos, 1, 99, 1);
      linha += " — equilibrado" + (meta < 99 ? " (" + x.sucessos + "/" + meta + ")" : "") + ".";
      if (d.config.travessia) {
        var td = desafio(e, d.config.travessia);
        if (td) {
          var tx = por(td, pid), area = lista(td.config.areas)[inteiro(td.dados.area, 0, 20, 0)];
          tx.avancos = (tx.avancos || 0) + inteiro(d.config.avanco, 0, 9, 1);
          linha += " +" + inteiro(d.config.avanco, 0, 9, 1) + " avanço → " + tx.avancos + (area ? "/" + area.meta : "") + ".";
          if (area && tx.avancos >= inteiro(area.meta, 1, 20, 3) && !tx.feito) { tx.feito = true; x.concluido = true; linha += " Cruzou " + area.nome + "."; chegouAoFim(e, td, pid); }
        }
      }
      if (x.sucessos >= meta) { x.concluido = true; x.reserva = undefined; ligarFlag(e, "desafio:" + d.id, pid); linha += " Travessia concluída (os dados de equilíbrio voltam)."; }
    } else { x.caindo = true; linha += " — caindo! (" + x.reserva + " dado(s) de equilíbrio)"; }
    hist(d, linha); ev(s, linha);
  }
  /* ESCALAR / ACUMULAR (Beta p. 41). */
  ACOES_DESAFIO.acumular = {
    acao: { fn: function (e, fichas, o, papel, rolar, s, ctx, d, pid) {
      var modo = lista(d.config.modos).filter(function (m) { return m.id === o.modo; })[0];
      if (!modo) return { ok: false, motivo: "Escolha o jeito." };
      if (por(d, pid).chegou) return { ok: false, motivo: "Você já chegou." };
      return testeDoDesafio(e, fichas, o, papel, rolar, s, ctx, d, Object.assign({}, obj(o.pedido), { pericia: modo.pericia || d.config.pericia || "atletismo", dt: inteiro(modo.dt, 0, 40, 7), rotulo: d.nome + " — " + (modo.nome || modo.id) }), { acao: "acumular", modo: modo.id });
    } },
  };
  /* TRAVESSIA por áreas (Beta pp. 57–59). */
  ACOES_DESAFIO.travessia = {
    agir: { fn: function (e, fichas, o, papel, rolar, s, ctx, d, pid, b) {
      var x = por(d, pid);
      var areas = lista(d.config.areas);
      var ia = inteiro(d.dados.area, 0, 20, 0);
      var area = areas[ia];
      if (!area) return { ok: false, motivo: "Travessia concluída." };
      if (x.area !== ia) { x.area = ia; x.avancos = 0; x.passos = 0; x.feito = false; }
      if (x.feito) return { ok: false, motivo: "Você já cruzou " + area.nome + ": espere o grupo (parado em segurança) ou continue agindo por outra ação." };
      var acao = lista(area.acoes).filter(function (a) { return a.id === o.acaoArea; })[0];
      if (!acao) return { ok: false, motivo: "Escolha a ação." };
      if (!requisitosOk(e, pid, { requer: acao.requer })) return { ok: false, motivo: acao.nome + ": não agora." };
      if (acao.salto) return saltoDeFe(e, fichas, o, papel, rolar, s, ctx, d, pid, b, area, acao, x);
      if (acao.equilibrio) {
        /* Caminhar pelo tronco: um teste de equilíbrio da cena. */
        var eq = desafio(e, acao.equilibrio);
        if (!eq) return { ok: false, motivo: "Equilíbrio da cena não encontrado." };
        return ACOES_DESAFIO.equilibrio.rolar.fn(e, fichas, o, papel, rolar, s, ctx, eq, pid, b);
      }
      var passos = [];
      if (x.passos && acao.pericia === "acrobacia") passos.push({ alvo: "pericia", n: x.passos, fonte: "Trilha encontrada" });
      if (area.escuridao && x.avancos >= inteiro(area.escuridao.apos, 0, 20, 2)) passos.push({ alvo: "pericia", n: inteiro(area.escuridao.passos, -4, 0, -1), fonte: "Escuridão" });
      return testeDoDesafio(e, fichas, o, papel, rolar, s, ctx, d, Object.assign({}, obj(o.pedido), { pericia: acao.pericia, dt: inteiro(acao.dt, 0, 40, 7), rotulo: area.nome + " — " + acao.nome, passos: lista(obj(o.pedido).passos).concat(passos) }), { acao: "travessia", area: ia, acaoArea: acao.id });
    } },
  };
  function saltoDeFe(e, fichas, o, papel, rolar, s, ctx, d, pid, b, area, acao, x) {
    var faltam = Math.max(0, inteiro(area.meta, 1, 20, 4) - (x.avancos || 0));
    return testeDoDesafio(e, fichas, o, papel, rolar, s, ctx, d, Object.assign({}, obj(o.pedido), { pericia: acao.pericia || "acrobacia", dt: inteiro(acao.dt, 0, 40, 7), rotulo: area.nome + " — " + acao.nome }), { acao: "salto", area: inteiro(d.dados.area, 0, 20, 0), faltam: faltam });
  }
  OP("travessiaArea", function (e, fichas, o, papel, rolar, s) {
    var d = desafio(e, o.id);
    if (!d || d.tipo !== "travessia") return { ok: false, motivo: "Travessia não encontrada." };
    var areas = lista(d.config.areas);
    d.dados.area = Math.min(areas.length, inteiro(d.dados.area, 0, 20, 0) + 1);
    if (d.dados.area >= areas.length) vencer(e, d, s, "", "todos atravessaram");
    else { ev(s, "O grupo segue para " + areas[d.dados.area].nome + "."); log(e, "Travessia: " + areas[d.dados.area].nome + "."); }
  }, { mestre: true, semFicha: true });

  /* HACK TÉCNICO (Alpha p. 25): teste → faixa → problema com tempo. */
  ACOES_DESAFIO.hackTecnico = {
    testar: { fn: function (e, fichas, o, papel, rolar, s, ctx, d, pid) {
      var x = por(d, pid), r = rodadaAtual(e);
      if (x.rodada === r && !papel.mestre) return { ok: false, motivo: "Falhando, tente de novo na próxima rodada." };
      x.rodada = r;
      return testeDoDesafio(e, fichas, o, papel, rolar, s, ctx, d, Object.assign({}, obj(o.pedido), { pericia: d.config.pericia || "tecnologia", dt: d.config.dt === undefined || d.config.dt === null ? null : inteiro(d.config.dt, 0, 40, 7), semDt: d.config.dt === undefined || d.config.dt === null, rotulo: "Hack técnico: " + d.nome }), { acao: "hackTecnico" });
    } },
    responder: { fn: function (e, fichas, o, papel, rolar, s, ctx, d, pid) {
      var x = por(d, pid);
      if (!x.problema) return { ok: false, motivo: "Faça o teste primeiro." };
      if (x.respondido) return { ok: false, motivo: "Já respondido: na próxima rodada, teste de novo." };
      x.respondido = true;
      var decorrido = (agora(ctx).getTime() - new Date(x.inicio).getTime()) / 1000;
      var tolerancia = inteiro(d.config.tolerancia, 0, 30, 3);
      var noTempo = decorrido <= x.segundos + tolerancia;
      var certo = semAcento(o.resposta).replace(/\s/g, "") === semAcento(lista(d.segredo.respostas)[x.faixa]).replace(/\s/g, "");
      var linha = nomeDe(fichas, pid) + " responde " + texto(o.resposta, 40) + " em " + Math.round(decorrido) + " s (limite " + x.segundos + " s): " + (certo ? (noTempo ? "certo, no tempo" : "certo, mas fora do tempo") : "errado") + ".";
      hist(d, linha); ev(s, linha); log(e, d.nome + ": " + linha);
      if (certo && noTempo) vencer(e, d, s, pid, "hackeado por " + nomeDe(fichas, pid));
    } },
  };
  /* HACK SOCIAL (Alpha p. 25). */
  ACOES_DESAFIO.hackSocial = {
    testar: { fn: function (e, fichas, o, papel, rolar, s, ctx, d, pid) {
      var x = por(d, pid), r = rodadaAtual(e);
      if (x.rodada === r && !papel.mestre) return { ok: false, motivo: "Falhando, tente de novo na próxima rodada." };
      x.rodada = r;
      return testeDoDesafio(e, fichas, o, papel, rolar, s, ctx, d, Object.assign({}, obj(o.pedido), { pericia: d.config.pericia || "intuicao", dt: inteiro(d.config.dt, 0, 40, 7), rotulo: "Hack social: " + d.nome }), { acao: "hackSocial" });
    } },
    responder: { fn: function (e, fichas, o, papel, rolar, s, ctx, d, pid) {
      var x = por(d, pid);
      if (!x.liberado) return { ok: false, motivo: "Passe no teste de Intuição primeiro." };
      var i = inteiro(o.pergunta, 0, 30, 0);
      var pergunta = lista(d.config.perguntas)[i];
      if (!pergunta) return { ok: false, motivo: "Pergunta inválida." };
      x.respondidas = x.respondidas || [];
      if (x.respondidas.indexOf(i) >= 0) return { ok: false, motivo: "Essa já foi respondida." };
      var aceitas = lista(lista(d.segredo.respostas)[i]).map(function (a) { return semAcento(a).replace(/\s/g, ""); });
      var dada = semAcento(o.resposta).replace(/\s/g, "");
      var certo = !!dada && aceitas.indexOf(dada) >= 0;
      x.respondidas.push(i);
      if (certo) x.acertos = (x.acertos || 0) + 1; else x.erros = (x.erros || 0) + 1;
      var linha = nomeDe(fichas, pid) + " · " + pergunta + " → " + texto(o.resposta, 60) + ": " + (certo ? "certo" : "errado") + ".";
      hist(d, linha); ev(s, linha);
      checarHackSocial(e, fichas, d, pid, s);
    } },
  };
  function checarHackSocial(e, fichas, d, pid, s) {
    var x = por(d, pid);
    var nec = inteiro(d.config.necessarias, 1, 20, 3);
    if ((x.acertos || 0) >= nec) { vencer(e, d, s, pid, "senha descoberta por " + nomeDe(fichas, pid)); return; }
    if ((x.erros || 0) > (x.chancesExtras || 0)) { x.liberado = false; x.respondidas = []; x.acertos = 0; x.erros = 0; hist(d, nomeDe(fichas, pid) + " erra demais: tente de novo na próxima rodada."); ev(s, nomeDe(fichas, pid) + ": errou além das chances — tente de novo na próxima rodada" + (d.config.falha ? " (" + d.config.falha + ")" : "") + "."); }
  }
  /* ENIGMA: resposta conferida; errar pode custar (Beta pp. 63–64). */
  ACOES_DESAFIO.enigma = {
    responder: { fn: function (e, fichas, o, papel, rolar, s, ctx, d, pid, b) {
      var esperado = lista(d.segredo.resposta).map(function (v) { return semAcento(v); });
      var dado = lista(o.resposta).map(function (v) { return semAcento(v); });
      if (!dado.length && o.texto) dado = [semAcento(o.texto)];
      if (!dado.length) return { ok: false, motivo: "Responda." };
      var aceitas = [esperado].concat(lista(d.segredo.alternativas).map(function (alt) { return lista(alt).map(function (v) { return semAcento(v); }); }));
      var certo = aceitas.some(function (esp) { return d.config.ordenado === false ? esp.length === dado.length && esp.every(function (v) { return dado.indexOf(v) >= 0; }) : esp.join("|") === dado.join("|"); });
      var linha = nomeDe(fichas, pid) + " tenta: " + dado.join(", ") + ".";
      if (certo) { hist(d, linha); vencer(e, d, s, pid, texto(d.config.aoResolver, 200) || "resolvido por " + nomeDe(fichas, pid)); return; }
      var f = obj(d.config.falha);
      var dn = rolarExpr(f.dano || "0", rolar);
      if (dn.total) M().aplicarDano(b, { valor: dn.total, tipo: f.tipo === "emocional" ? "emocional" : "fisico", externo: true }).forEach(function (y) { ev(s, nomeDe(fichas, pid) + ": " + y.texto); });
      linha += " Nada acontece" + (dn.total ? " — " + (f.texto || "dano") + ": " + descreverRolagem(dn) : "") + ".";
      hist(d, linha); ev(s, linha); log(e, d.nome + ": " + linha);
    } },
  };
  /* RUNAS: pedras da cena nos nichos, na ordem secreta. */
  ACOES_DESAFIO.runas = {
    encaixar: { fn: function (e, fichas, o, papel, rolar, s, ctx, d, pid) {
      var n = inteiro(d.config.nichos, 1, 12, 6);
      var i = inteiro(o.nicho, 0, n - 1, 0);
      var slots = d.dados.slots = lista(d.dados.slots).length === n ? d.dados.slots : new Array(n).fill("");
      if (slots[i]) return { ok: false, motivo: "Esse nicho já tem uma pedra." };
      var it = e.proc.itens.filter(function (x) { return x.id === o.item && x.com === pid && x.runa && !x.usado; })[0];
      if (!it) return { ok: false, motivo: "Você não tem essa pedra rúnica." };
      slots[i] = it.id; it.usado = true; it.com = "";
      var linha = nomeDe(fichas, pid) + " encaixa " + it.nome + " no nicho " + (i + 1) + ".";
      hist(d, linha); ev(s, linha); log(e, d.nome + ": " + linha);
      if (slots.every(Boolean)) {
        var runas = slots.map(function (sid) { var x = e.proc.itens.filter(function (y) { return y.id === sid; })[0]; return x ? x.runa : ""; });
        if (runas.join("|") === lista(d.segredo.ordem).join("|")) vencer(e, d, s, pid, texto(d.config.aoResolver, 200) || "as runas se acendem");
        else { hist(d, "Todos os nichos cheios, mas nada acontece."); ev(s, d.nome + ": todos os nichos cheios… nada acontece."); }
      }
    } },
    retirar: { fn: function (e, fichas, o, papel, rolar, s, ctx, d, pid) {
      var slots = lista(d.dados.slots);
      var i = inteiro(o.nicho, 0, slots.length - 1, 0);
      if (!slots[i]) return { ok: false, motivo: "Nicho vazio." };
      var it = e.proc.itens.filter(function (x) { return x.id === slots[i]; })[0];
      slots[i] = "";
      if (it) { it.usado = false; it.com = pid; }
      ev(s, nomeDe(fichas, pid) + " retira a pedra do nicho " + (i + 1) + ".");
    } },
  };
  /* AÇÃO DE CENA: teste com custo e efeito (erguer a carroça, consertar
     e municiar a balista, pegar o crânio…). */
  ACOES_DESAFIO.acao = {
    fazer: { fn: function (e, fichas, o, papel, rolar, s, ctx, d, pid, b) {
      var cf = d.config;
      if (cf.ataque && !ME().participante(e, o.alvo)) return { ok: false, motivo: "Escolha o alvo." };
      var custos = { pv: inteiro(cf.custoPv, 0, 9, 0), pd: inteiro(cf.custoPd, 0, 9, 0) };
      if (custos.pv || custos.pd) { var pg = M().pagarCustos(b, custos); if (!pg.ok) return pg; }
      if (cf.danoAoFazer) { var dz = rolarExpr(cf.danoAoFazer.dano, rolar); M().aplicarDano(b, { valor: dz.total, tipo: cf.danoAoFazer.tipo === "emocional" ? "emocional" : "fisico", externo: true }).forEach(function (y) { ev(s, nomeDe(fichas, pid) + ": " + (cf.danoAoFazer.texto || "") + " " + descreverRolagem(dz) + " — " + y.texto); }); }
      var pericia = cf.pericia;
      if (lista(cf.pericias).length) {
        pericia = lista(cf.pericias).indexOf(o.pericia) >= 0 ? o.pericia : lista(cf.pericias).filter(function (k) { return periciaEsp(b, k).per; })[0] || cf.pericias[0];
      }
      if (!pericia) { aplicarAcao(e, fichas, d, pid, s, rolar); vencer(e, d, s, pid, texto(cf.aoResolver, 200) || d.nome + " feito por " + nomeDe(fichas, pid)); return; }
      var pe = periciaEsp(b, pericia);
      if (!pe.per) return { ok: false, motivo: "Sem a perícia pedida (" + pericia + ")." };
      return testeDoDesafio(e, fichas, o, papel, rolar, s, ctx, d, Object.assign({}, obj(o.pedido), { pericia: pe.per.id, dt: inteiro(cf.dt, 0, 40, 7), rotulo: d.nome, tipo: cf.ataque ? "ataque" : undefined, alcance: cf.ataque ? cf.ataque.alcance : undefined }), { acao: "acao", alvo: texto(o.alvo, 80) });
    } },
  };

  /* O que uma ação de cena gasta ou desliga (o virote disparado, a tocha). */
  function aplicarAcao(e, fichas, d, pid, s) {
    var cf = d.config;
    lista(cf.consome).forEach(function (iid) { var it = e.proc.itens.filter(function (x) { return x.id === iid; })[0]; if (it) { it.usado = true; it.com = ""; } });
    lista(cf.desligar).forEach(function (f) { delete e.proc.flags[f]; });
    lista(cf.ligar).forEach(function (f) { ligarFlag(e, f, null); });
  }

  /* O teste de um desafio VALEU (depois das escolhas pós-rolagem). */
  ME().gancho("aoFinalizar", function (e, fichas, t, res, s, rolar, ctx) {
    var cx = obj(t.contexto.proc);
    if (cx.tipo === "desafio") concluirDesafio(e, fichas, t, res, s, rolar, ctx, cx);
    if (cx.tipo === "perseguicao") concluirAvanco(e, fichas, t, res, s, rolar, cx);
    if (cx.tipo === "esconderijo") concluirEsconderijo(e, fichas, t, res, s, rolar, cx);
    if (cx.tipo === "radio") concluirRadio(e, fichas, t, res, s, rolar, cx);
  });
  function pontos(res) { return M().pontuacao(res); }
  function concluirDesafio(e, fichas, t, res, s, rolar, ctx, cx) {
    var d = desafio(e, cx.desafio);
    if (!d) return;
    var pid = t.quem, b = bloco(fichas, pid), nome = t.nome, x = por(d, pid);
    var cf = d.config;
    function dano(valor, tipo, porque) { if (!valor) return; M().aplicarDano(b, { valor: valor, tipo: tipo || "fisico", externo: true }).forEach(function (y) { ev(s, nome + ": " + y.texto); }); hist(d, nome + ": " + valor + " de dano (" + porque + ")."); }
    if (cx.acao === "arrombar") {
      if (res.sucesso) {
        var pts = pontos(res, b);
        d.dados.pa = inteiro(d.dados.pa, 0, 999, 0) + pts;
        var linha = nome + " soma " + pts + (res.critico ? " (crítico: duas maiores)" : "") + " → " + d.dados.pa + "/" + inteiro(cf.pa, 1, 999, 10) + ".";
        hist(d, linha); ev(s, linha);
        if (d.dados.pa >= inteiro(cf.pa, 1, 999, 10)) vencer(e, d, s, pid, "arrombado" + (cf.consequencia ? " — " + cf.consequencia : ""));
      } else { hist(d, nome + " não consegue (" + res.total + ")."); ev(s, nome + " não consegue arrombar desta vez."); }
    }
    if (cx.acao === "seguro") {
      if (res.sucesso) {
        x.etapa = (x.etapa || 0) + 1;
        if (x.etapa >= 2) { x.alcancou = true; x.etapa = 0; ligarFlag(e, "desafio:" + d.id, pid); hist(d, nome + " alcança (seguro)."); ev(s, nome + " alcança " + d.nome + " do jeito seguro."); }
        else { hist(d, nome + ": 1ª ação segura ok."); ev(s, nome + ": primeira ação ok — falta mais uma, em seguida."); }
      } else { x.etapa = 0; dano(res.rb, "fisico", "falha no jeito seguro: RB"); ev(s, nome + " falha: dano igual à RB (" + res.rb + ") e recomeça."); }
    }
    if (cx.acao === "arriscado") {
      if (res.sucesso) { x.alcancou = true; ligarFlag(e, "desafio:" + d.id, pid); hist(d, nome + " alcança (arriscado)."); ev(s, nome + " alcança " + d.nome + " do jeito arriscado."); }
      else { dano(res.ra, "fisico", "falha no jeito arriscado: RA"); ev(s, nome + " falha: dano igual à RA (" + res.ra + ")."); }
    }
    if (cx.acao === "erguer") {
      if (res.sucesso) { d.dados.sustentador = pid; d.dados.rodadas = 0; d.dados.desde = rodadaAtual(e); ligarFlag(e, "desafio:" + d.id, null); hist(d, nome + " ergue e sustenta."); ev(s, nome + " sustenta " + d.nome + " (novo teste no fim de cada rodada, −1 passo por rodada)."); }
      else { hist(d, nome + " não consegue erguer."); ev(s, nome + " não consegue erguer " + d.nome + "."); }
    }
    if (cx.acao === "acumular") {
      var modo = lista(cf.modos).filter(function (m) { return m.id === cx.modo; })[0] || {};
      if (res.sucesso) {
        var soma = modo.soma === "rb" ? res.rb : pontos(res, b);
        x.pontos = (x.pontos || 0) + soma;
        var meta = inteiro(cf.meta, 1, 99, 10);
        var l2 = nome + " soma " + soma + " → " + x.pontos + "/" + meta + ".";
        if (x.pontos >= meta) { x.chegou = true; ligarFlag(e, "desafio:" + d.id, pid); l2 += " Chegou!"; }
        hist(d, l2); ev(s, l2);
      } else { var caiu = x.pontos || 0; x.pontos = 0; dano(caiu, "fisico", "queda: os pontos acumulados"); ev(s, nome + " cai" + (caiu ? " e sofre " + caiu + " de dano (o acumulado)" : "") + "."); }
    }
    if (cx.acao === "travessia" || cx.acao === "salto") concluirTravessia(e, fichas, t, res, s, rolar, d, x, cx, b);
    if (cx.acao === "hackTecnico") {
      var faixas = lista(cf.faixas);
      var fx = -1;
      faixas.forEach(function (f, i) { if (res.total >= inteiro(f.min, -99, 999, 0) && (f.max === undefined || f.max === null || res.total <= f.max)) fx = i; });
      if (res.falhaCritica || fx < 0) { hist(d, nome + ": sem problema a resolver (" + res.total + ")."); ev(s, nome + " não consegue entender o sistema desta vez."); return; }
      x.faixa = fx; x.problema = faixas[fx].problema; x.segundos = inteiro(faixas[fx].segundos, 3, 600, inteiro(cf.segundos, 3, 600, 10)); x.inicio = agora(ctx).toISOString(); x.respondido = false;
      s.resultado.problema = { texto: x.problema, segundos: x.segundos };
      hist(d, nome + ": faixa " + (fx + 1) + " — " + x.segundos + " s."); ev(s, nome + ": resolva em " + x.segundos + " segundos: " + x.problema);
    }
    if (cx.acao === "hackSocial") {
      if (res.sucesso) {
        x.liberado = true; x.acertos = 0; x.erros = 0; x.respondidas = [];
        x.chancesExtras = Math.max(0, Math.floor((res.total - inteiro(cf.dt, 0, 40, 7)) / K().DESAFIOS.hackSocial.pontosPorChance));
        hist(d, nome + " pode responder (" + x.chancesExtras + " chance(s) extra)."); ev(s, nome + ": responda às perguntas — " + inteiro(cf.necessarias, 1, 20, 3) + " certas; pode errar " + x.chancesExtras + " vez(es).");
      } else { hist(d, nome + " falha no teste."); ev(s, nome + " não consegue um palpite desta vez (tente na próxima rodada)."); }
    }
    if (cx.acao === "acao") {
      if (res.sucesso && cf.ataque) {
        var alvoPa = ME().participante(e, cx.alvo), bAlvo = alvoPa ? ME().blocoDoAtor(e, fichas, alvoPa) : null;
        if (bAlvo) {
          var dnA = M().dano(res, { dano: inteiro(cf.ataque.dano, -10, 50, 0) }, []);
          var rd = alvoPa.tipo === "npc" && alvoPa.rd ? Math.max(0, alvoPa.rd - inteiro(cf.ataque.ignoraRd, 0, 99, 0)) : 0;
          var val = Math.max(0, dnA.valor - rd);
          M().aplicarDano(bAlvo, { valor: val, tipo: "fisico", externo: true }).forEach(function (y) { ev(s, alvoPa.nome + " (" + d.nome + ", " + dnA.valor + (rd ? " − RD " + rd : "") + "): " + y.texto); });
          if (cf.ataque.atordoa && bAlvo.recursos.pv.atual > 0) { bAlvo.estado.perdeAcao = 2; ev(s, alvoPa.nome + " fica atordoado(a) por 1 rodada."); }
          if (alvoPa.tipo === "npc" && bAlvo.recursos.pv.atual <= 0) { bAlvo.estado.inconsciente = true; if (lista(alvoPa.aoDestruir).length && !alvoPa.destruido) { alvoPa.destruido = true; aoDestruir(e, fichas, alvoPa, s); } }
        }
        aplicarAcao(e, fichas, d, pid, s, rolar);
        if (cf.repetivel) { hist(d, nome + " acerta."); return; }
      }
      if (res.sucesso) { if (!cf.ataque) aplicarAcao(e, fichas, d, pid, s, rolar); vencer(e, d, s, pid, texto(cf.aoResolver, 200) || d.nome + " feito por " + nome); }
      else if (cf.ataque) { if (cf.consomeSempre) aplicarAcao(e, fichas, d, pid, s, rolar); hist(d, nome + " erra."); ev(s, nome + " erra (" + d.nome + ")" + (cf.consomeSempre ? " — gasto mesmo assim" : "") + "."); }
      else { var f2 = obj(cf.falha); var dn2 = rolarExpr(f2.dano || "0", rolar); if (dn2.total) dano(dn2.total, f2.tipo === "emocional" ? "emocional" : "fisico", f2.texto || "falha"); ev(s, nome + " falha" + (cf.repetir !== false ? " (pode tentar de novo" + (cf.custoPv ? ", pagando de novo" : "") + ")" : "") + "."); hist(d, nome + " falha."); }
    }
  }
  function chegouAoFim(e, td, pid) {
    var areas = lista(td.config.areas);
    if (inteiro(td.dados.area, 0, 20, 0) === areas.length - 1 && e.proc.esconderijo && e.proc.esconderijo.por[pid]) e.proc.esconderijo.por[pid].chegou = true;
  }
  function concluirTravessia(e, fichas, t, res, s, rolar, d, x, cx, b) {
    var area = lista(d.config.areas)[cx.area];
    if (!area) return;
    var meta = inteiro(area.meta, 1, 20, 4);
    var nome = t.nome;
    if (cx.acao === "salto") {
      var faltam = cx.faltam;
      var dn = rolarExpr(faltam + "d6", rolar);
      var reduz = res.sucesso ? res.rb : 0;
      var valor = Math.max(0, dn.total - reduz);
      if (valor) M().aplicarDano(b, { valor: valor, tipo: "fisico", externo: true }).forEach(function (y) { ev(s, nome + ": " + y.texto); });
      x.avancos = meta; x.feito = true; chegouAoFim(e, d, t.quem);
      var l = nome + " salta: " + descreverRolagem(dn) + (reduz ? " − " + reduz + " (RB)" : "") + " = " + valor + " de dano — chega ao fim de " + area.nome + ".";
      hist(d, l); ev(s, l); log(e, l);
      return;
    }
    var acao = lista(area.acoes).filter(function (a) { return a.id === cx.acaoArea; })[0] || {};
    var linha;
    if (acao.ganhaPasso) {
      if (res.sucesso) { x.passos = Math.max(x.passos || 0, inteiro(acao.ganhaPasso, 1, 3, 1)); linha = nome + " acha uma trilha: +" + x.passos + " passo nos testes de Acrobacia desta área."; }
      else linha = nome + " não acha trilha melhor.";
    } else if (res.sucesso) {
      x.avancos = (x.avancos || 0) + inteiro(acao.avanco, 0, 10, 1);
      linha = nome + ": +" + inteiro(acao.avanco, 0, 10, 1) + " avanço(s) → " + x.avancos + "/" + meta + ".";
      if (acao.danoMesmoComSucesso) { /* não usado */ }
    } else {
      var f = obj(acao.falha);
      var margem = res.dt !== null && res.dt !== undefined ? res.dt - res.total : 0;
      if (f.quedaPorFaltante && margem >= inteiro(f.quedaMargem, 1, 20, 3)) {
        var faltam2 = Math.max(0, meta - (x.avancos || 0));
        var q = rolarExpr(faltam2 + "d" + inteiro(f.quedaFaces, 2, 20, 6), rolar);
        if (q.total) M().aplicarDano(b, { valor: q.total, tipo: "fisico", externo: true }).forEach(function (y) { ev(s, nome + ": " + y.texto); });
        x.avancos = meta;
        linha = nome + " cai barranco abaixo: " + descreverRolagem(q) + " de dano — mas chega lá.";
      } else {
        var dn2 = rolarExpr(f.dano || "0", rolar);
        if (dn2.total) M().aplicarDano(b, { valor: dn2.total, tipo: "fisico", externo: true }).forEach(function (y) { ev(s, nome + ": " + y.texto); });
        if (f.avanco) x.avancos = Math.max(0, (x.avancos || 0) + inteiro(f.avanco, -10, 10, 0));
        linha = nome + " falha" + (dn2.total ? ": " + descreverRolagem(dn2) + " de dano" : "") + (f.texto ? " (" + f.texto + ")" : "") + ".";
      }
    }
    if ((x.avancos || 0) >= meta && !x.feito) { x.feito = true; linha += " Cruzou " + area.nome + "."; chegouAoFim(e, d, t.quem); }
    hist(d, linha); ev(s, linha); log(e, d.nome + ": " + linha);
  }

  /* ---------------------------------------------------------------
     FERRAMENTAS (Alpha pp. 65–76)
     --------------------------------------------------------------- */
  OP("ferramentaPosse", function (e, fichas, o, papel, rolar, s) {
    var f = String(o.ferramenta || "");
    if (!K().FERRAMENTAS[f]) return { ok: false, motivo: "Ferramenta desconhecida." };
    if (e.proc.ferramentas.disponiveis.indexOf(f) < 0) e.proc.ferramentas.disponiveis.push(f);
    e.proc.ferramentas.posse[f] = o.personagem && fichas[o.personagem] ? String(o.personagem) : "";
    if (f === "compendium") e.proc.compendium.portador = e.proc.ferramentas.posse[f];
    if (o.cargas !== undefined) e.proc.ferramentas.cargas[f] = inteiro(o.cargas, 0, 99, 0);
    ev(s, K().FERRAMENTAS[f].nome + (e.proc.ferramentas.posse[f] ? " com " + nomeDe(fichas, e.proc.ferramentas.posse[f]) : " sem dono") + ".");
    log(e, K().FERRAMENTAS[f].nome + (e.proc.ferramentas.posse[f] ? " com " + nomeDe(fichas, e.proc.ferramentas.posse[f]) : " sem dono") + ".");
  }, { mestre: true });
  OP("passarFerramenta", function (e, fichas, o, papel, rolar, s) {
    var f = String(o.ferramenta || ""), de = e.proc.ferramentas.posse[f];
    if (!de || !podeAgir(papel, de)) return { ok: false, motivo: "A ferramenta não está com você." };
    if (!fichas[o.para]) return { ok: false, motivo: "Para quem?" };
    e.proc.ferramentas.posse[f] = String(o.para);
    if (f === "compendium") e.proc.compendium.portador = String(o.para);
    ev(s, nomeDe(fichas, de) + " empresta " + K().FERRAMENTAS[f].nome + " para " + nomeDe(fichas, o.para) + ".");
    log(e, s.eventos[s.eventos.length - 1].texto);
  });
  function leitura(e, pid, ponto, f, txt, anexo, extra) {
    var ds = e.investigacao.descobertas[pid] || (e.investigacao.descobertas[pid] = []);
    var d = Object.assign({ id: id(), pista: "ferr:" + f + ":" + (ponto ? ponto.id : "area"), ponto: ponto ? ponto.id : "", texto: txt, como: K().FERRAMENTAS[f].nome, critico: false, anexo: anexo || "", ferramenta: f }, extra || {});
    ds.push(d);
    ligarFlag(e, "ferramenta:" + f + ":" + (ponto ? ponto.id : "area"), pid);
    return d;
  }
  OP("usarFerramenta", function (e, fichas, o, papel, rolar, s, ctx) {
    var ag = exigirAgente(fichas, papel, o); if (!ag.ok) return ag;
    var pid = ag.pid, b = ag.b, f = String(o.ferramenta || "");
    var def = K().FERRAMENTAS[f];
    if (!def) return { ok: false, motivo: "Ferramenta desconhecida." };
    if (e.proc.ferramentas.posse[f] !== pid && !papel.mestre) return { ok: false, motivo: def.nome + " não está com você (peça emprestada)." };
    var nome = nomeDe(fichas, pid);
    if (f === "compendium") return { ok: false, motivo: "O compêndio se consulta na aba Investigação." };
    if (f === "laser") {
      var area = lista(obj(e.proc._cena).areas).filter(function (a) { return a.id === o.area; })[0];
      if (!area) return { ok: false, motivo: "Escolha o ambiente." };
      var lz = obj(area.laser);
      var nomes = lista(lz.pontos).map(function (pidP) { var p = e.investigacao.pontos.filter(function (x) { return x.id === pidP; })[0]; return p ? (p.numero ? p.numero + ". " : "") + p.nome : pidP; });
      var txtL = "Varredura em " + area.nome + ": " + (nomes.length ? nomes.join("; ") : "nenhuma distorção") + ".";
      var dl = leitura(e, pid, null, f, txtL, lz.anexo, { area: area.id });
      ligarFlag(e, "laser:" + area.id, null);
      ev(s, nome + " ativa o laser de varredura em " + area.nome + ".");
      log(e, nome + ": laser de varredura em " + area.nome + ".");
      s.resultado.leitura = dl;
      return;
    }
    var ponto = e.investigacao.pontos.filter(function (p) { return p.id === o.ponto && p.revelado; })[0];
    if (!ponto) return { ok: false, motivo: "Escolha um ponto de interesse anunciado." };
    var cfg = obj(ponto.ferramentas[f]);
    if (cfg.requer && !lista(cfg.requer).every(function (r) { return flagAtiva(e, r, pid); })) cfg = {};
    if (def.cargas) {
      var c = e.proc.ferramentas.cargas[f];
      if (c === undefined) c = def.cargas;
      if (c <= 0) return { ok: false, motivo: def.nome + ": sem cargas." };
      e.proc.ferramentas.cargas[f] = c - 1;
    }
    if (f === "laboratorio") {
      if (cfg.texto && !cfg.sequencia) { if (def.cargas) e.proc.ferramentas.cargas[f]++; return { ok: false, motivo: "A missão não imprime a sequência mínima deste ponto: o Mestre define (edite o ponto) ou revela à mão." }; }
      if (!cfg.sequencia) { var dn = leitura(e, pid, ponto, f, "Laboratório em " + ponto.nome + ": nada a analisar (sem reação)."); ev(s, nome + ": laboratório em " + ponto.nome + " — sem reação."); s.resultado.leitura = dn; return; }
      return iniciarLaboratorio(e, fichas, pid, b, ponto, cfg, s);
    }
    if (f === "radio") {
      if (!lista(cfg.conjuntos).length) { var dr = leitura(e, pid, ponto, f, "Rádio em " + ponto.nome + ": " + (cfg.texto || "só estática.")); ev(s, nome + " liga o rádio em " + ponto.nome + "."); s.resultado.leitura = dr; return; }
      return ME().OPERACOES.teste(e, fichas, { quem: pid, pedido: Object.assign({}, obj(o.pedido), { pericia: "tecnologia", semDt: true, dt: null, rotulo: "Rádio modificado em " + ponto.nome }), contexto: { proc: { tipo: "radio", ponto: ponto.id } }, confirmar: o.confirmar }, papel, rolar, s, ctx);
    }
    var txt = cfg.texto || ((ponto.normal ? "Leitura normal" : "Sem reação") + " (" + def.nome + " em " + ponto.nome + ").");
    if (f === "emf" && cfg.padrao) txt = (cfg.texto ? cfg.texto + " " : "") + "Padrão de bips: " + cfg.padrao + ".";
    var d = leitura(e, pid, ponto, f, def.nome + " — " + ponto.nome + ": " + txt, cfg.anexo);
    ev(s, nome + " usa " + def.nome + " em " + ponto.nome + (def.cargas ? " (" + e.proc.ferramentas.cargas[f] + " carga(s) restantes)" : "") + ".");
    log(e, nome + ": " + def.nome + " em " + ponto.nome + ".");
    s.resultado.leitura = d;
  });
  function concluirRadio(e, fichas, t, res, s, rolar, cx) {
    var ponto = e.investigacao.pontos.filter(function (p) { return p.id === cx.ponto; })[0];
    if (!ponto) return;
    var cfg = obj(ponto.ferramentas.radio);
    var falsos = lista(cfg.falsos), todos = lista(cfg.conjuntos);
    var remover = K().falsosDoRadio(res.total);
    var tirar = remover === "todos" ? falsos.slice() : embaralhar(falsos, rolar).slice(0, remover);
    var ficam = embaralhar(todos.filter(function (c) { return tirar.indexOf(c) < 0; }), rolar);
    var txt = "Rádio em " + ponto.nome + " (" + res.total + ": " + (remover === "todos" ? "todos os falsos saem" : remover + " falso(s) a menos") + "): " + ficam.join(" · ");
    leitura(e, t.quem, ponto, "radio", txt, cfg.anexo, { conjuntos: ficam });
    ev(s, t.nome + " sintoniza o rádio em " + ponto.nome + ": " + ficam.length + " conjunto(s) para ordenar.");
  }

  /* LABORATÓRIO: d4, d6… até a Aptidão (Exatas); não decrescente. */
  function iniciarLaboratorio(e, fichas, pid, b, ponto, cfg, s) {
    var apt = periciaEsp(b, "aptidao:exatas");
    var mente = R().dadoDoAtributo(b, "mente");
    var n = inteiro(cfg.sequencia, 4, 6, 4);
    var faces = [], f = 4;
    for (var i = 0; i < n; i++) { faces.push(Math.min(f, apt.faces)); f = R().passoDado(f, 1, false); }
    var lab = { id: "lab-" + id(), tipo: "laboratorio", nome: "Laboratório: " + ponto.nome, ponto: ponto.id, publico: true, estado: "aberto", config: { faces: faces, rerrolagens: Math.floor(mente / 2), ponto: ponto.id }, segredo: {}, por: {}, dados: { quem: pid, valores: [], rerrolagens: Math.floor(mente / 2) }, historico: [] };
    e.proc.desafios.push(normalizarDesafio(lab));
    ev(s, nomeDe(fichas, pid) + " abre o laboratório em " + ponto.nome + ": " + n + " dados (" + faces.map(function (x) { return "d" + x; }).join(", ") + "), " + lab.dados.rerrolagens + " nova(s) rolagem(ns).");
    s.resultado.laboratorio = lab.id;
  }
  OP("laboratorio", function (e, fichas, o, papel, rolar, s) {
    var d = desafio(e, o.id);
    if (!d || d.tipo !== "laboratorio") return { ok: false, motivo: "Análise não encontrada." };
    var pid = d.dados.quem;
    if (!podeAgir(papel, pid)) return { ok: false, motivo: "A análise é de " + nomeDe(fichas, pid) + "." };
    if (d.estado !== "aberto") return { ok: false, motivo: "A análise acabou." };
    var faces = lista(d.config.faces), v = d.dados.valores;
    var nome = nomeDe(fichas, pid);
    if (o.acao === "rolar") {
      if (v.length >= faces.length) return { ok: false, motivo: "Todos os dados já saíram: conclua." };
      var x = rolar(faces[v.length]);
      v.push(x);
      hist(d, "d" + faces[v.length - 1] + " = " + x);
      ev(s, nome + " · laboratório: d" + faces[v.length - 1] + " = " + x + (v.length > 1 && x < v[v.length - 2] ? " (menor que o anterior!)" : "") + ".");
    } else if (o.acao === "rerrolar") {
      var i = inteiro(o.indice, 0, v.length - 1, 0);
      if (!d.dados.rerrolagens) return { ok: false, motivo: "Sem novas rolagens." };
      if (i >= v.length) return { ok: false, motivo: "Esse dado ainda não saiu." };
      var antes = v[i];
      v[i] = rolar(faces[i]);
      d.dados.rerrolagens--;
      hist(d, "nova rolagem do " + (i + 1) + "º: " + antes + " → " + v[i]);
      ev(s, nome + " rola de novo o " + (i + 1) + "º dado: " + antes + " → " + v[i] + " (" + d.dados.rerrolagens + " restante(s)).");
    } else if (o.acao === "concluir") {
      if (v.length < faces.length) return { ok: false, motivo: "Faltam dados." };
      var ok = v.every(function (val, k) { return k === 0 || val >= v[k - 1]; });
      d.estado = "encerrado";
      var ponto = e.investigacao.pontos.filter(function (p) { return p.id === d.config.ponto; })[0];
      var cfg = ponto ? obj(ponto.ferramentas.laboratorio) : {};
      var txt = ok ? "Laboratório em " + (ponto ? ponto.nome : "?") + " [" + v.join(", ") + "]: " + (cfg.texto || "análise concluída.") : "Laboratório em " + (ponto ? ponto.nome : "?") + " [" + v.join(", ") + "]: a sequência quebrou — amostra inconclusiva.";
      if (ponto) leitura(e, pid, ponto, "laboratorio", txt, ok ? cfg.anexo : "", { sucesso: ok });
      hist(d, ok ? "Sequência válida." : "Sequência quebrada.");
      ev(s, nome + " · laboratório: " + (ok ? "sequência não decrescente — resultado revelado." : "a sequência caiu: inconclusivo."));
      log(e, nome + ": laboratório " + (ok ? "concluído" : "inconclusivo") + ".");
      s.resultado.sucesso = ok;
    } else return { ok: false, motivo: "Ação desconhecida." };
  });

  /* O COMPÊNDIO: quem carrega e quem ele permite consultam; marcas. */
  OP("compendium", function (e, fichas, o, papel, rolar, s) {
    var c = e.proc.compendium;
    if (o.acao === "permitir") {
      if (!c.portador || !podeAgir(papel, c.portador)) return { ok: false, motivo: "Só quem carrega o compêndio permite a consulta." };
      var alvo = String(o.personagem || "");
      if (!fichas[alvo]) return { ok: false, motivo: "Quem?" };
      c.permitidos = c.permitidos.filter(function (p) { return p !== alvo; });
      if (o.valor !== false) c.permitidos.push(alvo);
      ev(s, nomeDe(fichas, c.portador) + (o.valor !== false ? " deixa " : " não deixa mais ") + nomeDe(fichas, alvo) + " consultar o compêndio.");
      return;
    }
    if (o.acao === "marcar") {
      var pid = String(o.quem || "");
      if (!podeAgir(papel, pid)) return { ok: false, motivo: "Você não conduz este personagem." };
      if (c.portador !== pid && c.permitidos.indexOf(pid) < 0 && !papel.mestre) return { ok: false, motivo: "Sem acesso ao compêndio." };
      var m = c.marcas[pid] || (c.marcas[pid] = []);
      var sinal = texto(o.sinal, 120);
      c.marcas[pid] = m.filter(function (x) { return x !== sinal; });
      if (o.valor !== false) c.marcas[pid].push(sinal);
      return;
    }
    return { ok: false, motivo: "Ação desconhecida." };
  });

  /* ---------------------------------------------------------------
     TABELAS POR RODADA: sobrecarga (Alpha p. 77) e maldição (p. 53)
     --------------------------------------------------------------- */
  OP("tabela", function (e, fichas, o, papel, rolar, s) {
    var t = e.proc.tabelas.filter(function (x) { return x.id === o.id; })[0];
    if (o.acao === "criar") {
      var nt = normalizarTabela(Object.assign({}, obj(o.tabela), { inicio: o.tabela && o.tabela.inicio !== undefined ? o.tabela.inicio : e.proc.rodada }));
      if (!nt) return { ok: false, motivo: "Tabela sem linhas." };
      e.proc.tabelas.push(nt);
      ev(s, "Tabela criada: " + nt.nome + ".", true);
      return;
    }
    if (!t) return { ok: false, motivo: "Tabela não encontrada." };
    if (o.acao === "ativar") { t.ativa = o.valor !== false; if (t.ativa && o.inicio !== undefined) t.inicio = inteiro(o.inicio, 0, 100000, e.proc.rodada); else if (t.ativa && o.agora) t.inicio = e.proc.rodada; }
    else if (o.acao === "suspender") t.suspensa = o.valor !== false;
    else if (o.acao === "isentar") { var r = String(inteiro(o.rodada, 0, 100000, e.proc.rodada)); t.isentos[r] = lista(t.isentos[r]).filter(function (p) { return p !== o.personagem; }); if (o.valor !== false) t.isentos[r].push(String(o.personagem)); }
    else return { ok: false, motivo: "Ação desconhecida." };
    log(e, t.nome + ": " + (t.ativa ? (t.suspensa ? "suspensa" : "ativa desde a rodada " + t.inicio) : "desligada") + ".");
    ev(s, t.nome + ": " + o.acao + ".");
  }, { mestre: true, semFicha: true });
  function linhaDaTabela(t, rodadaCena) {
    var n = rodadaCena - t.inicio + 1;
    return lista(t.linhas).filter(function (l) { return n >= l.de && n <= l.ate; })[0] || null;
  }
  function aplicarTabelas(e, fichas, r, rolar, s) {
    e.proc.tabelas.forEach(function (t) {
      if (!t.ativa || t.suspensa || t.aplicadas.indexOf(r) >= 0) return;
      var l = linhaDaTabela(t, r);
      t.aplicadas.push(r);
      if (!l) return;
      if (l.texto && t.tipo === "maldicao") { ev(s, t.nome + " (rodada " + (r - t.inicio + 1) + "): " + l.texto); log(e, t.nome + ": " + l.texto); }
      if (!l.pd && !l.pv) return;
      var isentos = lista(t.isentos[String(r)]).concat(l.condicional === "causarDano" ? lista(e.proc.causouDano[String(r)]) : []);
      presentes(e, fichas).forEach(function (pid) {
        var b = bloco(fichas, pid);
        if (isentos.indexOf(pid) >= 0) { ev(s, nomeDe(fichas, pid) + ": isento de " + t.nome + " nesta rodada."); return; }
        [["pv", "fisico"], ["pd", "emocional"]].forEach(function (par) {
          var expr = l[par[0]];
          if (l.extraSe && flagAtiva(e, l.extraSe.flag, null) && l.extraSe[par[0]]) expr = (expr && expr !== "0" ? expr + "+" : "") + l.extraSe[par[0]];
          if (!expr) return;
          var dn = rolarSoma(expr, rolar);
          if (!dn.total) return;
          M().aplicarDano(b, { valor: dn.total, tipo: par[1], externo: true }).forEach(function (y) { ev(s, nomeDe(fichas, pid) + " · " + t.nome + " (" + descreverRolagem(dn) + "): " + y.texto); log(e, nomeDe(fichas, pid) + " · " + t.nome + ": " + y.texto); });
        });
      });
    });
  }

  /* ---------------------------------------------------------------
     ENCERRAR A RODADA (fora do combate) — e o que vem com ela
     --------------------------------------------------------------- */
  function fimDeRodadaComum(e, fichas, r, rolar, s) {
    aplicarTabelas(e, fichas, e.proc.rodada, rolar, s);
    /* Sustentar: novo teste para quem não soltou. */
    e.proc.desafios.filter(function (d) { return d.tipo === "sustentar" && d.dados.sustentador; }).forEach(function (d) {
      var pid = d.dados.sustentador, b = bloco(fichas, pid);
      if (!b) { d.dados.sustentador = ""; return; }
      d.dados.rodadas = inteiro(d.dados.rodadas, 0, 99, 0) + 1;
      var mt = M().montar(b, { pericia: d.config.pericia || "atletismo", dt: inteiro(d.config.dt, 0, 40, 7), rotulo: "Sustentar (fim da rodada " + r + ")", passos: [{ alvo: "pericia", n: -Math.min(4, d.dados.rodadas), fonte: "Cansaço (" + d.dados.rodadas + " rodada(s))" }] }, {});
      if (!mt.ok) return;
      var res = M().resolver(mt.montagem, M().rolar(mt.montagem, rolar), {});
      ME().registrarRolagem(e, pid, nomeDe(fichas, pid), mt.montagem, res, s);
      var passando = lista(d.dados.passando).filter(function (p) { return p.rodada === r; });
      if (res.sucesso) { ev(s, nomeDe(fichas, pid) + " segura " + d.nome + " (" + ME().descreverResultado(res) + ")."); hist(d, "Fim da rodada " + r + ": segura."); }
      else {
        d.dados.sustentador = ""; d.dados.rodadas = 0;
        var cons = obj(d.config.consequencia);
        ev(s, nomeDe(fichas, pid) + " não segura " + d.nome + " (" + ME().descreverResultado(res) + ")!");
        hist(d, "Fim da rodada " + r + ": soltou.");
        passando.forEach(function (p) {
          var bp = bloco(fichas, p.pid);
          var dn = rolarExpr(cons.dano || "1d4", rolar);
          if (bp && dn.total) M().aplicarDano(bp, { valor: dn.total, tipo: "fisico", externo: true }).forEach(function (y) { ev(s, nomeDe(fichas, p.pid) + " é esmagado(a) (" + descreverRolagem(dn) + "): " + y.texto); });
        });
      }
      log(e, d.nome + ": fim da rodada " + r + (res.sucesso ? " — segura." : " — soltou."));
    });
    perseguicaoFimDeRodada(e, fichas, r, rolar, s);
    esconderijoFimDeRodada(e, fichas, r, rolar, s);
  }
  OP("encerrarRodada", function (e, fichas, o, papel, rolar, s, ctx) {
    if (e.combate.ativo) return ME().OPERACOES.proximaRodada(e, fichas, o, papel, rolar, s, ctx);
    var r = e.proc.rodada;
    if (o.rodada !== undefined && o.rodada !== null && Number(o.rodada) !== r) return { ok: false, motivo: "A rodada " + o.rodada + " já foi encerrada." };
    if (e.proc.encerradas.indexOf(r) >= 0) return { ok: false, motivo: "A rodada " + r + " já foi encerrada." };
    fimDeRodadaComum(e, fichas, r, rolar, s);
    e.proc.encerradas.push(r);
    e.proc.rodada = r + 1;
    e.proc.encerradas = e.proc.encerradas.slice(-60);
    log(e, "Fim da rodada " + r + " da cena.");
    ev(s, "Rodada " + e.proc.rodada + ".");
    inicioDeRodadaComum(e, fichas, e.proc.rodada, rolar, s);
  }, { mestre: true });
  function inicioDeRodadaComum(e, fichas, r, rolar, s) {
    perseguicaoInicioDeRodada(e, fichas, r, rolar, s);
    roteiroDaRodada(e, r, s);
  }
  function roteiroDaRodada(e, r, s) {
    var c = e.proc._cena;
    var etapa = e.proc.encontro && e.proc.encontro.ativo ? e.proc.encontro.etapa : "";
    lista(c ? c.roteiro : []).filter(function (x) { return (!x.etapa || x.etapa === etapa) && (x.rodada === r || (x.cada && r >= (x.desde || 1) && (r - (x.desde || 1)) % x.cada === 0)); }).forEach(function (x) { ev(s, "Roteiro (rodada " + r + "): " + x.texto, true); });
  }
  /* Em combate: a mesa chama estes ganchos em proximaRodada. */
  ME().gancho("fimDeRodadaCombate", function (e, fichas, r, rolar, s) {
    if (!e.proc) return;
    /* Afogamento: perde o dano no fim de cada rodada (Beta pp. 32–33). */
    e.proc.agarres.forEach(function (a) {
      if (a.soltouEm === r) return;
      var pa = ME().participante(e, a.vitima), b = pa ? ME().blocoDoAtor(e, fichas, pa) : null;
      if (!b) return;
      var dn = rolarExpr(a.dano, rolar);
      M().aplicarDano(b, { valor: dn.total, tipo: "fisico", externo: true }).forEach(function (y) { ev(s, pa.nome + " está sendo afogado(a) (" + descreverRolagem(dn) + "): " + y.texto); log(e, pa.nome + " (afogando): " + y.texto); });
    });
    e.proc.agarres = e.proc.agarres.filter(function (a) { var por_ = ME().participante(e, a.por); return a.soltouEm !== r && por_ && !ME().foraDeCombate(ME().blocoDoAtor(e, fichas, por_)); });
    fimDeRodadaComum(e, fichas, r, rolar, s);
    /* A rodada de combate também é uma rodada da cena (tabelas). */
    if (e.proc.encerradas.indexOf(e.proc.rodada) < 0) e.proc.encerradas.push(e.proc.rodada);
    e.proc.rodada++;
    e.proc.encerradas = e.proc.encerradas.slice(-60);
  });
  ME().gancho("inicioDeRodadaCombate", function (e, fichas, r, rolar, s) {
    if (!e.proc) return;
    ondasNoInicio(e, fichas, r, rolar, s);
    tributoNoInicio(e, fichas, r, rolar, s);
    inicioDeRodadaComum(e, fichas, r, rolar, s);
  });
  ME().gancho("novaCena", function (e) {
    if (!e.proc) return;
    e.proc.rodada = 1; e.proc.encerradas = []; e.proc.agarres = []; e.proc.causouDano = {};
    e.proc.perseguicao = null; e.proc.esconderijo = null;
    if (e.proc.encontro) e.proc.encontro.ativo = false;
  });
  /* Quem causou dano em quem (a maldição do Ídolo isenta). */
  ME().gancho("aoDano", function (e, fichas, alvoPa, b, x, s) {
    if (!e.proc || !x.ator || !x.valor) return;
    /* Rodada da CENA (a das tabelas): também vale para dano em combate. */
    var r = String(e.proc.rodada);
    var autor = ME().participante(e, x.ator);
    var pid = autor && autor.tipo === "pc" ? autor.personagemId : "";
    if (pid && alvoPa && alvoPa.tipo === "pc") { var l = e.proc.causouDano[r] || (e.proc.causouDano[r] = []); if (l.indexOf(pid) < 0) l.push(pid); }
    /* Atordoar (balista, tocha): perde a próxima ação. */
    if (x.atordoa && b && b.recursos.pv.atual > 0) { b.estado.perdeAcao = 2; ev(s, alvoPa.nome + " fica atordoado(a) por 1 rodada."); }
    /* Objeto destruído (o crânio): efeitos da cena. */
    if (alvoPa && alvoPa.tipo === "npc" && b.recursos.pv.atual <= 0 && lista(alvoPa.aoDestruir).length && !alvoPa.destruido) {
      alvoPa.destruido = true;
      aoDestruir(e, fichas, alvoPa, s);
    }
  });
  function aoDestruir(e, fichas, pa, s) {
    pa.aoDestruir.forEach(function (efeito) {
      var m = /^(atordoar|tirarRd|flag|grupo):(.+)$/.exec(efeito);
      if (!m) return;
      var alvos = e.combate.participantes.filter(function (p) { return p.ameaca === m[2] || p.id === m[2]; });
      if (m[1] === "atordoar") alvos.forEach(function (p) { if (p.bloco.estado.perdeAcao !== 2) { p.bloco.estado.perdeAcao = 2; ev(s, p.nome + " fica atordoado(a) por 1 rodada."); } });
      if (m[1] === "tirarRd") alvos.forEach(function (p) { p.rd = 0; ev(s, p.nome + " perde a redução de dano."); });
      if (m[1] === "flag" || m[1] === "grupo") ligarFlag(e, m[2], null);
    });
    log(e, pa.nome + " foi destruído(a).");
  }

  /* ---------------------------------------------------------------
     AFOGAR e ESCAPAR (Beta p. 33)
     --------------------------------------------------------------- */
  ME().gancho("aoAtaque", function (e, fichas, d, at, alvo, rolar, s, momento, arma) {
    if (!e.proc) return false;
    if (momento === "acerto" && arma && lista(arma.efeitos).indexOf("afogar") >= 0) {
      if (e.proc.encontro && e.proc.encontro.config && e.proc.encontro.config.semAgua) { ev(s, at.nome + " não tem água por perto para afogar: o ataque não faz nada."); return true; }
      var esp = lista(at.especiais).filter(function (x) { return x.motor && x.motor.tipo === "afogar"; })[0];
      e.proc.agarres = e.proc.agarres.filter(function (a) { return a.vitima !== alvo.id; });
      e.proc.agarres.push({ vitima: alvo.id, por: at.id, desde: e.combate.rodada, dano: esp && esp.motor.dano ? esp.motor.dano : [1, 6], soltouEm: 0 });
      ev(s, at.nome + " agarra " + alvo.nome + " e o(a) afoga: só pode tentar escapar; perde " + (esp && esp.motor.dano ? esp.motor.dano.join("d") : "1d6") + " PV no fim de cada rodada.");
      log(e, at.nome + " afoga " + alvo.nome + ".");
      return true;
    }
    if (momento === "escapar") {
      var ator = ME().participante(e, d.ator);
      var vitimaId = d.alvo && e.proc.agarres.some(function (a) { return a.vitima === d.alvo; }) ? d.alvo : d.ator;
      var ag = e.proc.agarres.filter(function (a) { return a.vitima === vitimaId; })[0];
      if (!ag) { ev(s, d.nome + ": ninguém está agarrado(a)."); return false; }
      var por_ = ME().participante(e, ag.por);
      var bPor = ME().blocoDoAtor(e, fichas, por_);
      if (!bPor) return false;
      var mt = M().montar(bPor, { pericia: "luta", tipo: "oposto", dt: null, rotulo: "Luta (segurar)" }, {});
      var rr = mt.ok ? M().resolver(mt.montagem, M().rolar(mt.montagem, rolar), {}) : { total: 0, critico: false, falhaCritica: true };
      if (mt.ok) ME().registrarRolagem(e, por_.id, por_.nome, mt.montagem, rr, s);
      var v = M().opor(d.resultado, rr);
      var vit = ME().participante(e, vitimaId);
      if (v === "a") { ag.soltouEm = e.combate.rodada; e.proc.agarres = e.proc.agarres.filter(function (a) { return a !== ag; }); e.proc.agarres.push(ag); ev(s, (ator.id === vitimaId ? ator.nome + " escapa" : ator.nome + " solta " + (vit ? vit.nome : "?")) + " de " + por_.nome + " (" + d.resultado.total + " × " + rr.total + "): sem o dano desta rodada."); }
      else ev(s, (ator.id === vitimaId ? ator.nome : ator.nome + " (ajudando)") + " não consegue soltar (" + d.resultado.total + " × " + rr.total + ").");
      return false;
    }
    return false;
  });
  ME().gancho("validarDeclaracao", function (e, fichas, pa, d) {
    if (!e.proc) return "";
    /* Ondas: quem chegou nesta rodada gasta a ação chegando. */
    if (pa.tipo === "npc" && pa.chegaEm && e.combate.rodada < pa.chegaEm) return pa.nome + " ainda está chegando (age a partir da rodada " + pa.chegaEm + ").";
    var ag = e.proc.agarres.filter(function (a) { return a.vitima === pa.id && a.soltouEm !== e.combate.rodada; })[0];
    if (ag && d.acao !== "escapar") return pa.nome + " está sendo afogado(a): só pode tentar escapar.";
    if (pa.tipo === "npc" && e.proc.agarres.some(function (a) { return a.por === pa.id && a.soltouEm !== e.combate.rodada; }) && d.acao !== "outra") return pa.nome + " está agarrando alguém e não faz outra coisa.";
    if (d.acao === "escapar" && !ag && !(d.alvo && e.proc.agarres.some(function (a) { return a.vitima === d.alvo; }))) return "Escapar: escolha o aliado agarrado como alvo (ou ser você o agarrado).";
    /* Bloqueio da entrada (Beta p. 69). */
    var bq = e.proc.encontro && e.proc.encontro.bloqueio;
    if (bq && bq.ativo) {
      var bloqueadores = lista(bq.pcs);
      var corpo = ["agredirCorpo", "agarrar", "derrubar", "desarmar", "empurrar", "quebrar"].indexOf(d.acao) >= 0;
      if (pa.tipo === "pc" && corpo && bloqueadores.indexOf(pa.id) < 0) return "A entrada está bloqueada: só " + bloqueadores.map(function (x) { var p = ME().participante(e, x); return p ? p.nome : "?"; }).join(" e ") + " atacam corpo a corpo.";
      if (pa.tipo === "npc" && corpo) {
        if (bloqueadores.indexOf(d.alvo) < 0) return "Com a entrada bloqueada, as criaturas só alcançam quem bloqueia.";
        var contra = e.combate.declaracoes.filter(function (x) { return x.rodada === e.combate.rodada && x.alvo === d.alvo && ME().participante(e, x.ator) && ME().participante(e, x.ator).tipo === "npc"; }).length;
        if (contra >= inteiro(bq.porDefensor, 1, 9, 2)) return "No espaço apertado, no máximo " + inteiro(bq.porDefensor, 1, 9, 2) + " criaturas atacam cada um por rodada.";
      }
    }
    return "";
  });
  ME().gancho("passosDeclaracao", function (e, fichas, pa, d) {
    var l = [];
    if (!e.proc) return l;
    if (d.acao === "escapar" && e.proc.agarres.some(function (a) { return a.vitima === pa.id; })) l.push({ n: -1, fonte: "Escapar sendo afogado (−1 passo)" });
    var bq = e.proc.encontro && e.proc.encontro.bloqueio;
    if (bq && bq.ativo && pa.tipo === "pc" && d.acao === "agredirDistancia" && lista(bq.pcs).indexOf(pa.id) < 0) l.push({ n: -2, fonte: "Aliados no caminho da entrada (−2 passos)" });
    return l;
  });

  /* ---------------------------------------------------------------
     ENCONTROS: etapas, ondas, tributo, bloqueio, efeitos em grupo
     --------------------------------------------------------------- */
  function pcsNoCombate(e) { return e.combate.participantes.filter(function (p) { return p.tipo === "pc"; }); }
  function contagemDaOnda(cfg, n, numeroOnda) {
    var base = cfg.porPersonagem === "metade" ? Math.floor(n / 2) : Math.max(0, inteiro(cfg.porPersonagem, 0, 6, 1)) * n;
    if (cfg.crescente) base = base * numeroOnda;
    return Math.max(cfg.minimo === undefined ? 1 : inteiro(cfg.minimo, 0, 20, 1), Math.min(30, base));
  }
  function rodadaDeOnda(cfg, r) {
    var primeira = inteiro(cfg.primeira, 0, 999, 2), intervalo = inteiro(cfg.intervalo, 1, 99, 2);
    return r >= primeira && (r - primeira) % intervalo === 0;
  }
  function adicionarOcorrencias(e, ameacaId, quantos, extra, s) {
    var am = ameacaId && typeof ameacaId === "object" ? ameacaId : A().porId(ameacaId);
    if (!am) return [];
    var ids = [];
    var ja = e.combate.participantes.filter(function (p) { return p.ameaca === am.id; }).length;
    for (var i = 0; i < quantos; i++) {
      var base = A().paraNpc(am.ordem2, am.nome + " " + (ja + i + 1));
      if (!base) break;
      var npc = ME().novoNpc(Object.assign({}, base, { ameaca: am.id }, extra || {}));
      if (npc) { e.combate.participantes.push(npc); ids.push(npc.id); }
    }
    return ids;
  }
  function ondasNoInicio(e, fichas, r, rolar, s) {
    var en = e.proc.encontro;
    if (!en || !en.ativo || !en.ondas || en.ondas.paradas) return;
    var cfg = en.ondas;
    if (!rodadaDeOnda(cfg, r)) return;
    cfg.geradas = lista(cfg.geradas);
    if (cfg.geradas.some(function (g) { return g.rodada === r; })) return;
    /* Param quando a condição está ligada e o mínimo de ondas já veio. */
    if (cfg.pararCom && flagAtiva(e, cfg.pararCom, null) && cfg.geradas.length >= inteiro(cfg.minimoAntesDeParar, 0, 99, 0)) { cfg.paradas = true; ev(s, "As ondas param de surgir."); log(e, "As ondas param de surgir."); return; }
    var numero = cfg.geradas.length + 1;
    var n = contagemDaOnda(cfg, pcsNoCombate(e).length || 1, numero);
    var ids = adicionarOcorrencias(e, cfg.ameaca, n, { chegaEm: r + inteiro(cfg.chegada, 0, 9, 0), onda: numero }, s);
    cfg.geradas.push({ rodada: r, ids: ids, n: ids.length });
    ev(s, "Onda " + numero + ": " + ids.length + " " + (A().porId(cfg.ameaca) || { nome: cfg.ameaca }).nome + "(s)" + (cfg.chegada ? " — chegam nesta rodada e atacam a partir da próxima" : "") + ".");
    log(e, "Onda " + numero + " (" + ids.length + ").");
    if (cfg.avisoIntuicao && lista(cfg.avisoIntuicao).indexOf(numero) >= 0 && !(cfg.pararCom && flagAtiva(e, cfg.pararCom, null))) ev(s, "Onda " + numero + ": peça Intuição (DT 10) a todos — matar não basta (dica do texto).", true);
  }
  function tributoNoInicio(e, fichas, r, rolar, s) {
    e.combate.participantes.filter(function (p) { return p.tipo === "npc" && !ME().foraDeCombate(p.bloco); }).forEach(function (chefe) {
      lista(chefe.especiais).filter(function (x) { return x.motor.tipo === "tributo"; }).forEach(function (esp) {
        if (chefe.bloco.recursos.pv.atual > inteiro(esp.motor.limite, 0, 999, 20)) return;
        var chave = "tributo:" + chefe.id + ":" + r;
        if (flagAtiva(e, chave, null)) return;
        ligarFlag(e, chave, null);
        var lacaios = e.combate.participantes.filter(function (p) { return p.ameaca === esp.motor.ameaca && !ME().foraDeCombate(p.bloco) && (!p.chegaEm || p.chegaEm <= r); });
        if (!lacaios.length) return;
        var cura = lacaios.length * inteiro(esp.motor.cura, 0, 99, 10);
        e.combate.participantes = e.combate.participantes.filter(function (p) { return lacaios.indexOf(p) < 0; });
        chefe.bloco.recursos.pv.atual = Math.min(chefe.bloco.recursos.pv.max, chefe.bloco.recursos.pv.atual + cura);
        ev(s, esp.nome + ": " + lacaios.length + " " + lacaios[0].nome.replace(/\s\d+$/, "") + "(s) explodem em lodo — " + chefe.nome + " recupera " + cura + " PV.");
        log(e, esp.nome + ": " + chefe.nome + " +" + cura + " PV.");
      });
    });
  }
  OP("encontro", function (e, fichas, o, papel, rolar, s) {
    var en = e.proc.encontro || (e.proc.encontro = { config: {}, ativo: false });
    var cfg = obj(en.config);
    if (o.acao === "iniciar") {
      en.ativo = true; en.etapa = o.etapa || (lista(cfg.etapas)[0] || {}).id || "";
      en.ondas = cfg.ondas ? Object.assign({ geradas: [], paradas: false }, copiar(cfg.ondas)) : null;
      en.bloqueio = null;
      if (e.combate.ativo && lista(cfg.inimigos).length && !o.semInimigos) lista(cfg.inimigos).forEach(function (x) {
        var n = x.porPersonagem === "metade" ? Math.floor(pcsNoCombate(e).length / 2) : (x.quantidade || inteiro(x.porPersonagem, 0, 6, 1) * pcsNoCombate(e).length);
        var ids = adicionarOcorrencias(e, x.ameaca, Math.max(1, n), { rd: x.rd, aoDestruir: x.aoDestruir }, s);
        ev(s, ids.length + " " + (A().porId(x.ameaca) || { nome: x.ameaca }).nome + "(s) entram.");
      });
      iniciarEtapa(e, fichas, en, s, rolar);
      log(e, "Encontro: " + (cfg.nome || e.cena.nome || "") + ".");
      return;
    }
    if (o.acao === "etapa") { en.etapa = texto(o.etapa, 40); iniciarEtapa(e, fichas, en, s, rolar); return; }
    if (o.acao === "ondas") { if (!en.ondas) return { ok: false, motivo: "Este encontro não tem ondas." }; en.ondas.paradas = o.valor === false; ev(s, en.ondas.paradas ? "Ondas paradas pelo Mestre." : "Ondas retomadas."); log(e, s.eventos[0].texto); return; }
    if (o.acao === "ondaAgora") {
      if (!en.ondas) return { ok: false, motivo: "Este encontro não tem ondas." };
      var numero = lista(en.ondas.geradas).length + 1;
      var ids = adicionarOcorrencias(e, en.ondas.ameaca, contagemDaOnda(en.ondas, pcsNoCombate(e).length || 1, numero), { chegaEm: e.combate.rodada + inteiro(en.ondas.chegada, 0, 9, 0), onda: numero }, s);
      en.ondas.geradas.push({ rodada: e.combate.rodada, ids: ids, n: ids.length, manual: true });
      ev(s, "Onda " + numero + " (Mestre): " + ids.length + ".");
      return;
    }
    if (o.acao === "bloqueio") {
      if (o.valor === false) { en.bloqueio = null; ev(s, "A entrada não está mais bloqueada."); log(e, "Bloqueio da entrada desfeito."); return; }
      var pcs = lista(o.pcs).map(String).filter(function (x) { var p = ME().participante(e, x); return p && p.tipo === "pc"; });
      if (pcs.length !== inteiro(cfg.bloqueio && cfg.bloqueio.exatos, 1, 9, 2)) return { ok: false, motivo: "O bloqueio funciona com exatamente " + inteiro(cfg.bloqueio && cfg.bloqueio.exatos, 1, 9, 2) + " personagens." };
      en.bloqueio = { ativo: true, pcs: pcs, porDefensor: inteiro(cfg.bloqueio && cfg.bloqueio.porDefensor, 1, 9, 2) };
      ev(s, "Entrada bloqueada por " + pcs.map(function (x) { return ME().participante(e, x).nome; }).join(" e ") + ".");
      log(e, s.eventos[0].texto);
      return;
    }
    if (o.acao === "encerrar") { en.ativo = false; ev(s, "Encontro encerrado."); return; }
    return { ok: false, motivo: "Ação desconhecida." };
  }, { mestre: true });
  function iniciarEtapa(e, fichas, en, s, rolar) {
    var et = lista(obj(en.config).etapas).filter(function (x) { return x.id === en.etapa; })[0];
    if (!et) { ev(s, "Encontro iniciado."); return; }
    if (et.fases && e.combate.ativo) ME().reordenarFases(e, et.fases === "quatro" ? K().ORDEM_FASES_4.slice() : K().ORDEM_FASES_PADRAO.slice());
    if (et.ondas) en.ondas = Object.assign({ geradas: [], paradas: false }, copiar(et.ondas));
    if (et.ondas === false) en.ondas = null;
    en.etapaInicio = rodadaAtual(e);
    ev(s, "Etapa: " + et.nome + (et.rodadas ? " (" + et.rodadas + " rodada(s))" : "") + ".");
    log(e, "Encontro — " + et.nome + ".");
    if (et.texto) ev(s, et.texto, true);
  }
  /* Adicionar ocorrências de uma ameaça do catálogo (cada uma com PV e ações próprios). */
  OP("adicionarAmeaca", function (e, fichas, o, papel, rolar, s) {
    if (!e.combate.ativo) return { ok: false, motivo: "Inicie o combate antes." };
    /* Do catálogo (id) ou do Homebrew (a ficha nativa copiada na hora). */
    var am = o.ficha ? { id: "hb-" + texto(o.homebrewId || "homebrew", 40), nome: texto(o.nome, 80) || "Ameaça", ordem2: A().normalizar(o.ficha) } : A().porId(o.ameaca);
    if (!am) return { ok: false, motivo: "Ameaça não encontrada." };
    if (am.ordem2.semFicha) return { ok: false, motivo: am.nome + " não tem ficha nos arquivos (só efeitos)." };
    var extra = { oculto: o.oculto === true };
    if (o.rd !== undefined && o.rd !== null && o.rd !== "") extra.rd = inteiro(o.rd, 0, 99, 0);
    if (o.aoDestruir) extra.aoDestruir = lista(o.aoDestruir);
    var ids = adicionarOcorrencias(e, o.ficha ? am : am.id, inteiro(o.quantidade, 1, 20, 1), extra, s);
    ev(s, ids.length + " " + am.nome + "(s) no combate.", o.oculto === true);
  }, { mestre: true, semFicha: true });
  /* Um objeto de cena atacável (o crânio: PV e RD próprios). */
  OP("adicionarObjeto", function (e, fichas, o, papel, rolar, s) {
    if (!e.combate.ativo) return { ok: false, motivo: "Inicie o combate antes." };
    var npc = ME().novoNpc({ nome: texto(o.nome, 80) || "Objeto", pv: inteiro(o.pv, 1, 999, 5), rd: o.rd, objeto: true, aoDestruir: lista(o.aoDestruir), atributos: { fisico: 4, mente: 4, emocao: 4 }, pericias: { acrobacia: 4 }, ataques: [{ nome: "—", alcance: "corpo", dano: 0 }] });
    npc.armaduraAuto = false;
    e.combate.participantes.push(npc);
    ev(s, npc.nome + " pode ser atacado (PV " + npc.bloco.recursos.pv.max + (npc.rd ? ", RD " + npc.rd : "") + ").");
  }, { mestre: true, semFicha: true });

  /* Efeito em grupo: todos testam ao mesmo tempo (decisão: rola direto). */
  function efeitoDaCena(e, ref) { var c = e.proc._cena; return c && c.efeitos ? c.efeitos[ref] : null; }
  OP("efeitoEmGrupo", function (e, fichas, o, papel, rolar, s) {
    var ef = o.efeito && typeof o.efeito === "object" ? o.efeito : efeitoDaCena(e, o.efeito);
    if (!ef) return { ok: false, motivo: "Efeito não encontrado." };
    var alvos = lista(o.alvos).length ? lista(o.alvos).map(String).filter(function (p) { return fichas[p]; }) : presentes(e, fichas);
    var abrigados = lista(o.abrigo).map(String);
    var nomeEf = ef.nome || "Efeito";
    alvos.forEach(function (pid) {
      var b = bloco(fichas, pid), nome = nomeDe(fichas, pid);
      var res = null;
      if (ef.pericia) {
        var bonus = abrigados.indexOf(pid) >= 0 && ef.abrigo ? [{ faces: inteiro(ef.abrigo.bonus, 4, 12, 6), fonte: "Abrigo" }] : [];
        var mt = M().montar(b, { pericia: ef.pericia, dt: inteiro(ef.dt, 0, 40, 10), rotulo: nomeEf + " (" + K().nomeDaPericia(null, ef.pericia) + ")", bonus: bonus }, {});
        if (mt.ok) { res = M().resolver(mt.montagem, M().rolar(mt.montagem, rolar), {}); ME().registrarRolagem(e, pid, nome, mt.montagem, res, s); M().aposTeste(b, mt.montagem, res); }
      }
      var passou = res ? res.sucesso === true : false;
      var parte = passou ? obj(ef.sucesso) : obj(ef.falha);
      var exprDano = parte.dano || ef.dano;
      if (passou && abrigados.indexOf(pid) >= 0 && ef.abrigo && ef.abrigo.semDanoNoSucesso) exprDano = null;
      var linha = nome + " · " + nomeEf + (res ? ": " + ME().descreverResultado(res) : "");
      if (exprDano) {
        var dn = rolarExpr(exprDano, rolar);
        var valor = passou && parte.metade ? Math.floor(dn.total / 2) : dn.total;
        if (valor) { var tipo = (parte.danoTipo || ef.danoTipo) === "emocional" ? "emocional" : "fisico"; M().aplicarDano(b, { valor: valor, tipo: tipo, externo: true }).forEach(function (y) { linha += " — " + descreverRolagem(dn) + (passou && parte.metade ? " ÷ 2" : "") + ": " + y.texto; }); }
      } else if (passou && abrigados.indexOf(pid) >= 0) linha += " — abrigado(a), sem dano";
      [["pv", "fisico"], ["pd", "emocional"]].forEach(function (par) {
        if (!parte[par[0]]) return;
        var dz = rolarExpr(parte[par[0]], rolar);
        if (dz.total) M().aplicarDano(b, { valor: dz.total, tipo: par[1], externo: true }).forEach(function (y) { linha += " — " + descreverRolagem(dz) + " " + par[0].toUpperCase() + ": " + y.texto; });
      });
      if (parte.caido) { b.estado.caido = true; linha += " Fica caído(a)."; }
      if (parte.pavor) M().darPavor(b).forEach(function (y) { linha += " " + y.texto; });
      if (parte.perdeAcao) { b.estado.perdeAcao = 2; linha += " Perde a próxima rodada."; }
      ev(s, linha); log(e, linha);
    });
  }, { mestre: true });
  /* Ação especial de uma ocorrência (Investida Equina, Derrubar, Enxurrada…). */
  OP("acaoEspecial", function (e, fichas, o, papel, rolar, s, ctx) {
    var pa = ME().participante(e, o.ator);
    if (!pa || pa.tipo !== "npc") return { ok: false, motivo: "Escolha a ameaça." };
    var esp = lista(pa.especiais).filter(function (x) { return x.id === o.especial; })[0];
    if (!esp) return { ok: false, motivo: "Esta ocorrência não tem essa ação." };
    var mo = esp.motor;
    if (mo.tipo === "area") {
      if (mo.acoes === 2 && !o.concluir) {
        pa.preparando = { especial: esp.id, rodada: e.combate.rodada };
        ev(s, pa.nome + " começa " + esp.nome + "… (quem gastar a ação procurando abrigo agora recebe +d" + (mo.abrigo ? mo.abrigo.bonus : 6) + ").");
        log(e, pa.nome + " começa " + esp.nome + ".");
        return;
      }
      pa.preparando = null;
      var abrigados = e.combate.declaracoes.filter(function (d) { return d.acao === "abrigo" && d.rodada >= e.combate.rodada - 1; }).map(function (d) { var p = ME().participante(e, d.ator); return p ? p.personagemId : ""; }).filter(Boolean).concat(lista(o.abrigo).map(String));
      return ME().OPERACOES.efeitoEmGrupo(e, fichas, { efeito: Object.assign({ nome: esp.nome }, mo), abrigo: abrigados, alvos: pcsNoCombate(e).map(function (p) { return p.personagemId; }) }, papel, rolar, s, ctx);
    }
    if (mo.tipo === "oposto") {
      var alvo = ME().participante(e, o.alvo);
      if (!alvo) return { ok: false, motivo: "Escolha o alvo." };
      var bA = ME().blocoDoAtor(e, fichas, alvo);
      var mA = M().montar(pa.bloco, { pericia: mo.pericia, tipo: "oposto", dt: null, rotulo: esp.nome }, {});
      var mD = M().montar(bA, { pericia: mo.contra, tipo: "oposto", dt: null, rotulo: "Contra " + esp.nome, bonus: o.esquivou && mo.bonusSeEsquivou ? [{ faces: mo.bonusSeEsquivou, fonte: "Esquivou" }] : [] }, {});
      if (!mA.ok || !mD.ok) return { ok: false, motivo: (mA.motivo || mD.motivo) };
      var rA = M().resolver(mA.montagem, M().rolar(mA.montagem, rolar), {}), rD = M().resolver(mD.montagem, M().rolar(mD.montagem, rolar), {});
      ME().registrarRolagem(e, pa.id, pa.nome, mA.montagem, rA, s);
      ME().registrarRolagem(e, alvo.id, alvo.nome, mD.montagem, rD, s);
      var v = M().opor(rA, rD);
      var linha = pa.nome + " · " + esp.nome + " em " + alvo.nome + ": " + rA.total + " × " + rD.total;
      if (v === "a") {
        if (mo.dano !== null && mo.dano !== undefined) { var dn = M().dano(rA, { dano: mo.dano }, [], true); M().aplicarDano(bA, { valor: dn.valor, tipo: "fisico", externo: true }).forEach(function (y) { linha += " — " + dn.valor + " de dano: " + y.texto; }); }
        lista(mo.condicoes).forEach(function (c) { if (c === "caido") { bA.estado.caido = true; linha += " Caído(a)."; } if (c === "atordoado") { bA.estado.perdeAcao = 2; linha += " Atordoado(a) 1 rodada."; } });
      } else linha += " — " + alvo.nome + " resiste.";
      ev(s, linha); log(e, linha);
      e.combate.agiu[pa.id] = (e.combate.agiu[pa.id] || 0) + 1;
      return;
    }
    return { ok: false, motivo: "Esta ação é narrada pelo Mestre." };
  }, { mestre: true });

  /* ---------------------------------------------------------------
     PERSEGUIÇÃO (Beta pp. 35, 73–74)
     --------------------------------------------------------------- */
  OP("perseguicao", function (e, fichas, o, papel, rolar, s) {
    if (o.acao === "encerrar") { if (e.proc.perseguicao) e.proc.perseguicao.ativa = false; ev(s, "Perseguição encerrada."); return; }
    if (o.acao !== "iniciar") return { ok: false, motivo: "Ação desconhecida." };
    var cfg = o.config && typeof o.config === "object" ? o.config : (e.proc.encontro && e.proc.encontro.config && e.proc.encontro.config.perseguicao) || null;
    if (o.ref && e.proc._cena) { var et = lista(obj(obj(e.proc.encontro).config).etapas).filter(function (x) { return x.id === o.ref; })[0]; if (et && et.perseguicao) cfg = et.perseguicao; }
    if (!cfg) return { ok: false, motivo: "Sem perseguição nesta cena." };
    var p = { ativa: true, rodada: 1, inicio: e.proc.rodada, config: copiar(cfg), por: {}, sacrificios: {}, cabecas: {}, mortes: [], aplicadas: [], facilitado: o.facilitado === true };
    presentes(e, fichas).forEach(function (pid) {
      var vigor = periciaEsp(bloco(fichas, pid), "vigor");
      p.por[pid] = { pa: 0, folego: Math.floor(vigor.faces / 2), esforcos: 0, outras: [], arrastado: 0, morto: false, rodadaAgiu: 0, vala: "", avisado: false };
    });
    e.proc.perseguicao = p;
    e.proc.rodada = Math.max(1, e.proc.rodada);
    p.inicio = e.proc.rodada;
    ev(s, "Perseguição: " + inteiro(cfg.rodadas, 1, 20, 4) + " rodadas.");
    log(e, "Perseguição iniciada.");
    perseguicaoInicioDeRodada(e, fichas, e.proc.rodada, rolar, s);
  }, { mestre: true });
  function rodadaDaPerseguicao(e) { var p = e.proc.perseguicao; return p ? e.proc.rodada - p.inicio + 1 : 0; }
  OP("perseguir", function (e, fichas, o, papel, rolar, s, ctx) {
    var p = e.proc.perseguicao;
    if (!p || !p.ativa) return { ok: false, motivo: "Não há perseguição." };
    var ag = exigirAgente(fichas, papel, o); if (!ag.ok) return ag;
    var pid = ag.pid, x = p.por[pid];
    if (!x) return { ok: false, motivo: "Você não está na perseguição." };
    if (x.morto) return { ok: false, motivo: "Fora da perseguição." };
    if (x.arrastado) return { ok: false, motivo: "Arrastado(a) pela água: não age até o fim." };
    var r = rodadaDaPerseguicao(e);
    if (x.rodadaAgiu === r) return { ok: false, motivo: "Uma ação por rodada." };
    if (x.carregadoEm === r && o.acao === "avancar") return { ok: false, motivo: "Carregado(a) nesta rodada: não avança por si." };
    var cfg = p.config;
    var acao = String(o.acao || "avancar");
    if (acao === "recuperar") { if (!cfg.recuperarFolego) return { ok: false, motivo: "Nesta perseguição não dá para recuperar o fôlego." }; x.folego += 2; x.rodadaAgiu = r; ev(s, nomeDe(fichas, pid) + " recupera o fôlego (+2 dados)."); return; }
    if (acao === "sacrificio") { if (!cfg.sacrificio) return { ok: false, motivo: "Não há sacrifício nesta perseguição." }; p.sacrificios[r] = lista(p.sacrificios[r]).concat([pid]); x.rodadaAgiu = r; ev(s, nomeDe(fichas, pid) + " se sacrifica para atrapalhar: +d6 no avançar dos aliados nesta rodada."); log(e, s.eventos[0].texto); return; }
    if (acao === "outra") { x.rodadaAgiu = r; ev(s, nomeDe(fichas, pid) + " faz outra coisa e não avança nesta rodada."); return; }
    if (acao !== "avancar" && acao !== "carregar") return { ok: false, motivo: "Ação desconhecida." };
    var pericia = texto(o.pericia, 40) || cfg.pericia || "atletismo";
    if (pericia !== (cfg.pericia || "atletismo") && x.outras.indexOf(pericia) >= 0) return { ok: false, motivo: "Cada perícia além de " + (cfg.pericia || "Atletismo") + " só uma vez." };
    var alvo = null;
    if (acao === "carregar") {
      alvo = String(o.alvo || "");
      var y = p.por[alvo];
      if (!y || alvo === pid || y.morto) return { ok: false, motivo: "Escolha quem carregar." };
      if (y.pa > x.pa) return { ok: false, motivo: "Não dá para carregar quem está na sua frente." };
    }
    var folego = inteiro(o.folego, 0, x.folego, 0);
    var bonus = []; for (var i = 0; i < folego; i++) bonus.push({ faces: 6, fonte: "Fôlego" });
    lista(p.sacrificios[r]).filter(function (q) { return q !== pid; }).forEach(function (q) { bonus.push({ faces: 6, fonte: "Sacrifício de " + nomeDe(fichas, q) }); });
    var passos = [];
    if (o.esforco) passos.push({ alvo: "pericia", n: 1, fonte: "Esforço extra" });
    if (acao === "carregar") passos.push({ alvo: "pericia", n: -1, fonte: "Carregando outro" });
    if (cfg.vala && x.pa >= inteiro(cfg.vala.limiar, 0, 999, 15) && !x.vala) {
      /* A vala oculta (Beta p. 74): perceber antes; falhando, −2 passos no avanço. */
      var avisos = lista(p.avisosVala).filter(function (q) { return q !== pid; }).length ? [{ alvo: "pericia", n: 1, fonte: "Aviso de um aliado" }] : [];
      var pv = texto(o.periciaVala, 40) === "sobrevivencia" ? "sobrevivencia" : (cfg.vala.pericia || "percepcao");
      var mtv = M().montar(ag.b, { pericia: pv, dt: inteiro(cfg.vala.dt, 0, 40, 10), rotulo: "Perceber a vala oculta", passos: avisos }, {});
      if (mtv.ok) {
        var rv = M().resolver(mtv.montagem, M().rolar(mtv.montagem, rolar), {});
        ME().registrarRolagem(e, pid, nomeDe(fichas, pid), mtv.montagem, rv, s);
        x.vala = rv.sucesso ? "passou" : "tropecou";
        if (rv.sucesso) { p.avisosVala = lista(p.avisosVala).concat([pid]); ev(s, nomeDe(fichas, pid) + " percebe a vala e salta por cima."); }
        else { passos.push({ alvo: "pericia", n: -2, fonte: "Tropeçou na vala oculta" }); ev(s, nomeDe(fichas, pid) + " tropeça na vala oculta (−2 passos no avanço)."); }
      }
    }
    var r0 = ME().OPERACOES.teste(e, fichas, { quem: pid, pedido: Object.assign({}, obj(o.pedido), { pericia: pericia, dt: inteiro(cfg.dt, 0, 40, 10), rotulo: (acao === "carregar" ? "Carregar " + nomeDe(fichas, alvo) : "Avançar") + " (perseguição, rodada " + r + ")", bonus: bonus, passos: passos }), contexto: { proc: { tipo: "perseguicao", acao: acao, alvo: alvo, esforco: !!o.esforco, folego: folego, pericia: pericia, rodada: r } }, confirmar: o.confirmar }, papel, rolar, s, ctx);
    if (r0 && r0.ok === false) return r0;
    x.folego -= folego;
    x.rodadaAgiu = r;
    if (pericia !== (cfg.pericia || "atletismo")) x.outras.push(pericia);
    return r0;
  });
  function concluirAvanco(e, fichas, t, res, s, rolar, cx) {
    var p = e.proc.perseguicao;
    if (!p) return;
    var pid = t.quem, x = p.por[pid], b = bloco(fichas, pid);
    if (!x) return;
    if (cx.esforco) {
      x.esforcos++;
      var dn = rolarExpr(x.esforcos + "d4", rolar);
      M().aplicarDano(b, { valor: dn.total, tipo: "fisico", externo: false }).forEach(function (y) { ev(s, t.nome + " · esforço extra (" + descreverRolagem(dn) + "): " + y.texto); });
    }
    var ganho = res.sucesso ? M().pontuacao(res) : res.rb;
    if (cx.acao === "carregar" && cx.alvo && p.por[cx.alvo]) {
      var y = p.por[cx.alvo];
      if (y.pa < x.pa) x.pa = y.pa;
      x.pa += ganho;
      if (x.pa > y.pa) y.pa = x.pa;
      y.carregadoEm = cx.rodada;
      ev(s, t.nome + " carrega " + nomeDe(fichas, cx.alvo) + ": os dois com " + x.pa + " PA.");
    } else { x.pa += ganho; ev(s, t.nome + " avança " + ganho + " (" + (res.sucesso ? "sucesso: " + (res.critico ? "duas maiores" : "RA") : "falha: RB") + ") → " + x.pa + " PA."); }
    log(e, t.nome + ": " + x.pa + " PA na perseguição.");
  }
  function perseguicaoInicioDeRodada(e, fichas, rCena, rolar, s) {
    var p = e.proc.perseguicao;
    if (!p || !p.ativa) return;
    var r = rCena - p.inicio + 1;
    var cfg = p.config;
    if (!cfg.cabecas || p.cabecas[r]) return;
    var vivos = Object.keys(p.por).filter(function (pid) { return !p.por[pid].morto && fichas[pid]; });
    var e1 = sortear(vivos, rolar), resto = vivos.filter(function (q) { return q !== e1; }), e2 = sortear(resto, rolar);
    p.cabecas[r] = [e1 || "", e2 || ""];
    var exp = p.facilitado ? (cfg.cabecas.facilitado || [1, 4]) : null;
    [[e1, "fisico", exp || cfg.cabecas.fisico || [1, 6]], [e2, "emocional", exp || cfg.cabecas.emocional || [1, 6]]].forEach(function (z) {
      if (!z[0]) return;
      var dn = rolarExpr(z[2], rolar);
      M().aplicarDano(bloco(fichas, z[0]), { valor: dn.total, tipo: z[1], externo: true }).forEach(function (y) { ev(s, "Cabeças (rodada " + r + "): " + nomeDe(fichas, z[0]) + " — " + descreverRolagem(dn) + " " + (z[1] === "fisico" ? "físico" : "emocional") + ": " + y.texto); log(e, "Cabeças: " + nomeDe(fichas, z[0]) + " " + y.texto); });
    });
  }
  function perseguicaoFimDeRodada(e, fichas, rCena, rolar, s) {
    var p = e.proc.perseguicao;
    if (!p || !p.ativa) return;
    var r = rCena - p.inicio + 1;
    if (p.aplicadas.indexOf(r) >= 0) return;
    p.aplicadas.push(r);
    var cfg = p.config;
    /* Arrastados sofrem o dano em cada rodada até o fim. */
    Object.keys(p.por).forEach(function (pid) {
      var x = p.por[pid];
      if (x.arrastado && !x.morto && cfg.danoArrastado) {
        var dn = rolarExpr(cfg.danoArrastado, rolar);
        M().aplicarDano(bloco(fichas, pid), { valor: dn.total, tipo: "fisico", externo: true }).forEach(function (y) { ev(s, nomeDe(fichas, pid) + " (arrastado, " + descreverRolagem(dn) + "): " + y.texto); });
      }
    });
    var lim = lista(cfg.limiares).filter(function (l) { return l.rodada === r; })[0];
    if (lim) {
      var abaixo = Object.keys(p.por).filter(function (pid) { var x = p.por[pid]; return !x.morto && !x.arrastado && x.pa < lim.minimo; });
      if (cfg.efeito === "arrastado") {
        abaixo.forEach(function (pid) {
          p.por[pid].arrastado = r;
          var dn = rolarExpr(cfg.danoArrastado || "1d6", rolar);
          ev(s, nomeDe(fichas, pid) + " é alcançado(a) pela água (" + p.por[pid].pa + " < " + lim.minimo + "): derrubado(a) e arrastado(a).");
          M().aplicarDano(bloco(fichas, pid), { valor: dn.total, tipo: "fisico", externo: true }).forEach(function (y) { ev(s, nomeDe(fichas, pid) + " (" + descreverRolagem(dn) + "): " + y.texto); });
        });
      }
      if (cfg.efeito === "devorado" && abaixo.length) {
        var maxMortes = p.facilitado ? inteiro(cfg.maxMortesFacilitado, 1, 12, 3) : 99;
        if (p.mortes.length < maxMortes) {
          var menor = Math.min.apply(null, abaixo.map(function (pid) { return p.por[pid].pa; }));
          var empatados = abaixo.filter(function (pid) { return p.por[pid].pa === menor; });
          if (empatados.length === 1) { matarNaPerseguicao(e, fichas, p, empatados[0], s, lim); }
          else { p.empate = { rodada: r, pids: empatados, minimo: lim.minimo }; ev(s, "Empate entre " + empatados.map(function (q) { return nomeDe(fichas, q); }).join(", ") + " (" + menor + " PA): " + (p.facilitado ? "1d20 cada; o maior sobrevive." : "teste oposto entre eles (Atletismo, ou o que descreverem) — o Mestre decide quem perde.")); log(e, s.eventos[s.eventos.length - 1].texto); }
        }
      }
    }
    if (r >= inteiro(cfg.rodadas, 1, 20, 4)) {
      p.ativa = false;
      var chegaram = Object.keys(p.por).filter(function (pid) { var x = p.por[pid]; return !x.morto && (!cfg.chegada || x.pa >= cfg.chegada); });
      ev(s, "Fim da perseguição." + (cfg.chegada ? " Chegam: " + chegaram.map(function (q) { return nomeDe(fichas, q); }).join(", ") + "." : ""));
      log(e, "Fim da perseguição.");
    }
  }
  function matarNaPerseguicao(e, fichas, p, pid, s, lim) {
    p.por[pid].morto = true;
    p.mortes.push(pid);
    var b = bloco(fichas, pid);
    if (b) { b.estado.morto = true; M().registrar(b, "morte", "Alcançado(a) e devorado(a) na perseguição."); }
    ev(s, nomeDe(fichas, pid) + " é alcançado(a) (" + p.por[pid].pa + " < " + lim.minimo + ") e devorado(a).");
    log(e, nomeDe(fichas, pid) + " é devorado(a) na perseguição.");
  }
  OP("desempatePerseguicao", function (e, fichas, o, papel, rolar, s) {
    var p = e.proc.perseguicao;
    if (!p || !p.empate) return { ok: false, motivo: "Não há empate." };
    var perde = String(o.perde || "");
    if (p.empate.pids.indexOf(perde) < 0) return { ok: false, motivo: "Escolha quem perde." };
    matarNaPerseguicao(e, fichas, p, perde, s, { minimo: p.empate.minimo });
    p.empate = null;
  }, { mestre: true });

  /* ---------------------------------------------------------------
     ESCONDERIJO (Beta pp. 55–56)
     --------------------------------------------------------------- */
  OP("esconderijo", function (e, fichas, o, papel, rolar, s) {
    if (o.acao === "iniciar") {
      e.proc.esconderijo = { ativo: true, por: {}, distrair: 0, rolagens: [] };
      presentes(e, fichas).forEach(function (pid) { e.proc.esconderijo.por[pid] = { dados: [], inicial: false, descoberto: false, chegou: false, parado: false, esconderUsos: 0, sopro: false }; });
      ev(s, "Furtividade: cada personagem faz o teste de esconderijo.");
      log(e, "Esconderijo iniciado.");
      return;
    }
    var h = e.proc.esconderijo;
    if (!h || !h.ativo) return { ok: false, motivo: "Não há cena de furtividade." };
    if (o.acao === "criaturas") return faseDasCriaturas(e, fichas, h, o, rolar, s);
    if (o.acao === "chegou") { var x = h.por[o.personagem]; if (!x) return { ok: false, motivo: "Quem?" }; x.chegou = o.valor !== false; ev(s, nomeDe(fichas, o.personagem) + (x.chegou ? " chegou em segurança." : " ainda não chegou.")); return; }
    if (o.acao === "encerrar") { h.ativo = false; ev(s, "Cena de furtividade encerrada."); return; }
    return { ok: false, motivo: "Ação desconhecida." };
  }, { mestre: true });
  function maiorDado(x) { return lista(x.dados).reduce(function (m, d) { return Math.max(m, d.faces); }, 0); }
  function descartarIguais(h, pid, valores, fichas, s, motivo) {
    var x = h.por[pid];
    if (!x || x.chegou || x.parado) return 0;
    var antes = x.dados.length;
    x.dados = x.dados.filter(function (d) { return valores.indexOf(d.valor) < 0; });
    var perdeu = antes - x.dados.length;
    if (perdeu) ev(s, nomeDe(fichas, pid) + " perde " + perdeu + " dado(s) de esconderijo (" + motivo + ").");
    if (antes && !x.dados.length && !x.descoberto) { x.descoberto = true; ev(s, nomeDe(fichas, pid) + " foi encontrado(a) pelas criaturas!"); }
    return perdeu;
  }
  function faseDasCriaturas(e, fichas, h, o, rolar, s) {
    var r = rodadaAtual(e);
    if (lista(h.rolagens).some(function (x) { return x.rodada === r; }) && !o.repetir) return { ok: false, motivo: "As criaturas já procuraram nesta rodada." };
    var d10 = o.d10 ? inteiro(o.d10, 1, 10, 10) : rolar(10);
    var linha = K().ESCONDERIJO_CRIATURAS[d10];
    var reg = { rodada: r, d10: d10, valores: [] };
    h.rolagens = lista(h.rolagens).concat([reg]).slice(-20);
    ev(s, "Fase das criaturas: d10 = " + d10 + " — " + linha.texto);
    var alvos = Object.keys(h.por).filter(function (pid) { var x = h.por[pid]; return !x.chegou && !x.parado && fichas[pid]; });
    if (linha.tipo === "numeros") {
      var nums = lista(o.numeros).map(function (n) { return inteiro(n, 1, 20, 1); }).slice(0, 2);
      if (nums.length < 2) { reg.pendente = "numeros"; ev(s, "O Mestre escolhe dois números.", true); return; }
      reg.valores = nums;
      alvos.forEach(function (pid) { descartarIguais(h, pid, nums, fichas, s, "números " + nums.join(" e ")); });
    }
    if (linha.tipo === "sopro") {
      var quem = sortear(alvos, rolar);
      if (quem) { h.por[quem].sopro = true; reg.alvo = quem; ev(s, "Sopro na nuca: " + nomeDe(fichas, quem) + " — ficar parado (2d6 PD) ou sair de perto (perde um dado)?"); }
    }
    if (linha.tipo === "todos") {
      var vals = [];
      linha.dados.forEach(function (par) { for (var i = 0; i < par[0]; i++) vals.push(rolar(par[1])); });
      reg.valores = vals;
      ev(s, "As criaturas rolam: " + vals.join(", ") + ".");
      alvos.forEach(function (pid) { descartarIguais(h, pid, vals, fichas, s, "procurados: " + vals.join(", ")); });
    }
    if (linha.tipo === "um") {
      var alvo = sortear(alvos, rolar);
      if (alvo) {
        var mx = maiorDado(h.por[alvo]);
        var par2 = mx >= 12 ? linha.porMaior[12] : mx >= 10 ? linha.porMaior[10] : linha.porMaior[0];
        var vs = []; for (var j = 0; j < par2[0]; j++) vs.push(rolar(par2[1]));
        reg.valores = vs; reg.alvo = alvo;
        ev(s, "Procuram " + nomeDe(fichas, alvo) + ": " + par2[0] + "d" + par2[1] + " = " + vs.join(", ") + ".");
        descartarIguais(h, alvo, vs, fichas, s, "procurado(a)");
      }
    }
    log(e, "Criaturas (d10 " + d10 + ")" + (reg.valores.length ? ": " + reg.valores.join(", ") : "") + ".");
  }
  OP("esconder", function (e, fichas, o, papel, rolar, s, ctx) {
    var h = e.proc.esconderijo;
    if (!h || !h.ativo) return { ok: false, motivo: "Não há cena de furtividade." };
    var ag = exigirAgente(fichas, papel, o); if (!ag.ok) return ag;
    var pid = ag.pid, x = h.por[pid], b = ag.b;
    if (!x) return { ok: false, motivo: "Você não está nesta cena." };
    var acao = String(o.acao || "");
    var cfgE = K().DESAFIOS.esconderijo;
    if (acao === "inicial") {
      if (x.inicial) return { ok: false, motivo: "O teste de esconderijo já foi feito." };
      return ME().OPERACOES.teste(e, fichas, { quem: pid, pedido: Object.assign({}, obj(o.pedido), { pericia: texto(o.pericia, 40) || cfgE.pericia, semDt: true, dt: null, rotulo: "Teste de esconderijo" }), contexto: { proc: { tipo: "esconderijo", acao: "inicial" } }, confirmar: o.confirmar }, papel, rolar, s, ctx);
    }
    if (acao === "esconderSe") {
      var dt = cfgE.esconderDt + cfgE.passoDt * x.esconderUsos;
      return ME().OPERACOES.teste(e, fichas, { quem: pid, pedido: Object.assign({}, obj(o.pedido), { pericia: "furtividade", dt: dt, rotulo: "Esconder-se (DT " + dt + ")" }), contexto: { proc: { tipo: "esconderijo", acao: "esconderSe", dado: o.dado } }, confirmar: o.confirmar }, papel, rolar, s, ctx);
    }
    if (acao === "distrair") {
      var dt2 = cfgE.distrairDt + cfgE.passoDt * h.distrair;
      var para = o.para && h.por[o.para] ? String(o.para) : pid;
      return ME().OPERACOES.teste(e, fichas, { quem: pid, pedido: Object.assign({}, obj(o.pedido), { pericia: "enganacao", dt: dt2, rotulo: "Distrair (DT " + dt2 + ")" }), contexto: { proc: { tipo: "esconderijo", acao: "distrair", para: para, dado: o.dado } }, confirmar: o.confirmar }, papel, rolar, s, ctx);
    }
    if (acao === "chamarAtencao") {
      var al = h.por[o.para];
      if (!al || o.para === pid) return { ok: false, motivo: "Escolha o aliado." };
      if (x.dados.length < 2) return { ok: false, motivo: "Chamar atenção custa dois dados (um para o aliado, outro descartado)." };
      var dado = x.dados.splice(inteiro(o.dado, 0, x.dados.length - 1, 0), 1)[0];
      x.dados.splice(0, 1);
      al.dados.push(dado); al.descoberto = false;
      if (!x.dados.length) { x.descoberto = true; ev(s, nomeDe(fichas, pid) + " foi encontrado(a)!"); }
      ev(s, nomeDe(fichas, pid) + " chama a atenção para si: " + nomeDe(fichas, o.para) + " ganha um d" + dado.faces + " (" + dado.valor + ").");
      return;
    }
    if (acao === "chamativa") {
      if (!x.dados.length) return { ok: false, motivo: "Sem dados de esconderijo." };
      x.dados.splice(inteiro(o.dado, 0, x.dados.length - 1, 0), 1);
      if (!x.dados.length) { x.descoberto = true; ev(s, nomeDe(fichas, pid) + " foi encontrado(a)!"); }
      ev(s, nomeDe(fichas, pid) + " faz algo chamativo e descarta um dado de esconderijo.");
      return;
    }
    if (acao === "sopro") {
      if (!x.sopro) return { ok: false, motivo: "A criatura não está perto de você." };
      x.sopro = false;
      if (o.escolha === "parado") { var dn = rolarExpr("2d6", rolar); M().aplicarDano(b, { valor: dn.total, tipo: "emocional", externo: true }).forEach(function (y) { ev(s, nomeDe(fichas, pid) + " fica imóvel (" + descreverRolagem(dn) + "): " + y.texto); }); }
      else { if (x.dados.length) x.dados.splice(0, 1); if (!x.dados.length) x.descoberto = true; ev(s, nomeDe(fichas, pid) + " sai de perto e perde um dado de esconderijo."); }
      return;
    }
    if (acao === "parar") { x.parado = o.valor !== false; ev(s, nomeDe(fichas, pid) + (x.parado ? " fica parado(a) em segurança (não age, não perde dados)." : " volta a agir.")); return; }
    return { ok: false, motivo: "Ação desconhecida." };
  });
  function concluirEsconderijo(e, fichas, t, res, s, rolar, cx) {
    var h = e.proc.esconderijo;
    if (!h) return;
    var x = h.por[t.quem];
    if (!x) return;
    var vivos = res.dados.filter(function (d) { return !d.anulado; });
    if (cx.acao === "inicial") {
      x.dados = vivos.map(function (d) { return { faces: d.faces, valor: d.valor }; });
      if (res.critico) { var mx = vivos.reduce(function (m, d) { return Math.max(m, d.faces); }, 4); var v = rolar(mx); x.dados.push({ faces: mx, valor: v }); ev(s, t.nome + ": crítico — um d" + mx + " extra (" + v + ")."); }
      x.inicial = true; x.descoberto = !x.dados.length;
      ev(s, t.nome + " se esconde com " + x.dados.length + " dado(s): " + x.dados.map(function (d) { return "d" + d.faces + "=" + d.valor; }).join(", ") + ".");
      return;
    }
    var i = inteiro(cx.dado, 0, Math.max(0, vivos.length - 1), 0);
    var escolhido = vivos.slice().sort(function (a, b) { return b.valor - a.valor; })[i] || vivos[0];
    if (cx.acao === "esconderSe") {
      x.esconderUsos++;
      if (res.sucesso && escolhido) { x.dados.push({ faces: escolhido.faces, valor: escolhido.valor }); x.descoberto = false; ev(s, t.nome + " se esconde melhor: +d" + escolhido.faces + " (" + escolhido.valor + ")."); }
      else ev(s, t.nome + " não consegue se esconder melhor.");
    }
    if (cx.acao === "distrair") {
      h.distrair++;
      var al = h.por[cx.para] || x;
      if (res.sucesso && escolhido) { al.dados.push({ faces: escolhido.faces, valor: escolhido.valor }); al.descoberto = false; ev(s, t.nome + " distrai as criaturas: " + nomeDe(fichas, cx.para) + " ganha d" + escolhido.faces + " (" + escolhido.valor + ")."); }
      else ev(s, t.nome + " não consegue distraí-las.");
    }
  }
  function esconderijoFimDeRodada(e, fichas, r, rolar, s) {
    var h = e.proc.esconderijo;
    if (!h || !h.ativo) return;
    h.danos = lista(h.danos);
    if (h.danos.indexOf(r) >= 0) return;
    h.danos.push(r);
    Object.keys(h.por).forEach(function (pid) {
      var x = h.por[pid];
      if (!x.descoberto || x.chegou || !fichas[pid]) return;
      var dn = rolarExpr(K().DESAFIOS.esconderijo.danoEncontrado, rolar);
      M().aplicarDano(bloco(fichas, pid), { valor: dn.total, tipo: "fisico", externo: true }).forEach(function (y) { ev(s, nomeDe(fichas, pid) + " (encontrado(a), " + descreverRolagem(dn) + "): " + y.texto); log(e, nomeDe(fichas, pid) + " (encontrado): " + y.texto); });
    });
  }

  /* RECURSOS DE CENA (a runa de Brenna, Beta p. 53): uso único por personagem. */
  OP("usarRecurso", function (e, fichas, o, papel, rolar, s) {
    var ag = exigirAgente(fichas, papel, o); if (!ag.ok) return ag;
    var rc = e.proc.recursos[o.recurso];
    if (!rc) return { ok: false, motivo: "Recurso não encontrado." };
    if (rc.usados.indexOf(ag.pid) >= 0) return { ok: false, motivo: "Já usado." };
    var opc = lista(rc.def.opcoes).filter(function (x) { return x.id === o.opcao; })[0];
    if (!opc) return { ok: false, motivo: "Escolha a opção." };
    var dn = rolarExpr(opc.dado || "1d10", rolar);
    var linha = nomeDe(fichas, ag.pid) + " · " + (rc.def.nome || "Recurso") + ": ";
    if (opc.efeito === "pv" || opc.efeito === "pd") linha += "recupera " + M().curar(ag.b, opc.efeito, dn.total) + " " + opc.efeito.toUpperCase() + " (" + descreverRolagem(dn) + ").";
    else if (opc.efeito === "esconderijo") { var h = e.proc.esconderijo, x = h && h.por[ag.pid]; if (!x) return { ok: false, motivo: "Só numa cena de furtividade." }; x.dados.push({ faces: dn.faces.length ? Number(dn.expr.split("d")[1]) : 10, valor: dn.total }); x.descoberto = false; linha += "+1 dado de esconderijo (" + dn.total + ")."; }
    else return { ok: false, motivo: "Efeito desconhecido." };
    rc.usados.push(ag.pid);
    ev(s, linha); log(e, linha);
  });

  /* ---------------------------------------------------------------
     A VISTA DO JOGADOR
     --------------------------------------------------------------- */
  function vistaDesafio(d, e, meus) {
    var v = { id: d.id, tipo: d.tipo, nome: d.nome, ponto: d.ponto, estado: d.estado, historico: d.historico.slice(-8) };
    var cf = d.config;
    var conhece = cf.parametrosOcultos !== true || meus.some(function (pid) { return flagAtiva(e, "parametros:" + d.id, pid); });
    var pub = {};
    if (conhece) ["dados", "faces", "max", "dt", "pa", "pericia", "meta", "sucessos", "necessarias", "porRodada", "nichos", "custoPv", "bonusTentativas"].forEach(function (k) { if (cf[k] !== undefined) pub[k] = cf[k]; });
    if (conhece && cf.seguro) pub.seguro = cf.seguro;
    if (conhece && cf.arriscado) pub.arriscado = cf.arriscado;
    if (cf.modos) pub.modos = lista(cf.modos).map(function (m) { return conhece ? m : { id: m.id, nome: m.nome }; });
    if (cf.areas) pub.areas = lista(cf.areas).map(function (a) { return { id: a.id, nome: a.nome, meta: a.meta, acoes: lista(a.acoes).map(function (x) { return { id: x.id, nome: x.nome, pericia: x.pericia, dt: x.dt, avanco: x.avanco, texto: x.texto || "" }; }) }; });
    if (cf.perguntas) pub.perguntas = cf.perguntas;
    if (cf.opcoes) pub.opcoes = cf.opcoes;
    if (cf.faces && d.tipo === "laboratorio") { pub.faces = cf.faces; }
    if (d.tipo === "laboratorio") v.dados = { quem: d.dados.quem, valores: d.dados.valores, rerrolagens: d.dados.rerrolagens };
    if (d.tipo === "destrancar") v.dados = { total: d.dados.total || 0 };
    if (d.tipo === "senha") v.dados = { erros: d.dados.erros || 0, bloqueadoAte: d.dados.bloqueadoAte || 0 };
    if (d.tipo === "arrombar") v.dados = { pa: d.dados.pa || 0 };
    if (d.tipo === "sustentar") v.dados = { sustentador: d.dados.sustentador || "", rodadas: d.dados.rodadas || 0 };
    if (d.tipo === "runas") v.dados = { slots: lista(d.dados.slots).map(function (sid) { return sid ? (e.proc.itens.filter(function (i) { return i.id === sid; })[0] || { nome: "pedra" }).nome : ""; }) };
    if (d.tipo === "travessia") v.dados = { area: d.dados.area || 0 };
    v.config = pub;
    v.por = {};
    meus.forEach(function (pid) { if (d.por[pid]) { var x = copiar(d.por[pid]); delete x.faixa; v.por[pid] = x; } });
    return v;
  }
  ME().gancho("vista", function (v, e, papel) {
    if (!e.proc) return;
    var meus = lista(papel.pode);
    var p = e.proc;
    var vp = { versao: p.versao, pacote: { nome: p.pacote.nome }, rodada: p.rodada };
    /* Um desafio de um ponto ainda oculto também fica oculto. */
    function pontoVisivel(pid_) { if (!pid_) return true; var pt = e.investigacao.pontos.filter(function (x) { return x.id === pid_; })[0]; return !pt || pt.revelado === true; }
    vp.desafios = p.desafios.filter(function (d) { return (d.publico && pontoVisivel(d.ponto)) || (d.tipo === "laboratorio" && meus.indexOf(d.dados.quem) >= 0); }).map(function (d) { return vistaDesafio(d, e, meus); });
    vp.grupo = p.grupo.map(function (d) { return copiar(d); });
    vp.itens = p.itens.filter(function (i) { return i.publico || meus.indexOf(i.com) >= 0; }).map(function (i) { return { id: i.id, nome: i.nome, com: i.com, usado: i.usado, runa: meus.indexOf(i.com) >= 0 ? i.runa : "" }; });
    vp.ferramentas = { posse: copiar(p.ferramentas.posse), cargas: copiar(p.ferramentas.cargas), disponiveis: p.ferramentas.disponiveis.slice() };
    var acessa = meus.some(function (pid) { return p.compendium.portador === pid || p.compendium.permitidos.indexOf(pid) >= 0; });
    vp.compendium = { portador: p.compendium.portador, permitidos: p.compendium.permitidos.slice(), acesso: acessa, conteudo: acessa && p._cena ? copiar(p._cena.compendium) : null, marcas: {} };
    meus.forEach(function (pid) { if (p.compendium.marcas[pid]) vp.compendium.marcas[pid] = p.compendium.marcas[pid].slice(); });
    /* Anexos: só os de pistas que um dos meus (ou o grupo) recebeu. */
    var ids = {};
    meus.forEach(function (pid) { lista(e.investigacao.descobertas[pid]).forEach(function (d) { if (d.anexo) ids[d.anexo] = true; }); });
    p.grupo.forEach(function (d) { if (d.anexo) ids[d.anexo] = true; });
    vp.anexos = Object.keys(ids).map(function (k) { var a = anexoDef(e, k); return { id: k, nome: a.nome, url: a.url || "", documentoId: a.documentoId || "", descricao: a.descricao || a.alternativa || "", veio: a.veio }; });
    vp.tabelas = p.tabelas.filter(function (t) { return t.ativa; }).map(function (t) { var n = e.proc.rodada - t.inicio + 1; return { id: t.id, nome: t.nome, tipo: t.tipo, suspensa: t.suspensa, rodadaNaTabela: n, linhaAtual: t.tipo === "sobrecarga" ? copiar(linhaDaTabela(t, e.proc.rodada)) : null, passadas: t.tipo === "maldicao" ? t.linhas.filter(function (l) { return l.de <= n && l.texto; }).map(function (l) { return l.texto; }) : [] }; });
    vp.agarres = p.agarres.map(function (a) { return { vitima: a.vitima, por: ME().participante(e, a.por) && !ME().participante(e, a.por).oculto ? a.por : "" }; });
    if (p.perseguicao) { var pe = copiar(p.perseguicao); vp.perseguicao = { ativa: pe.ativa, rodada: rodadaDaPerseguicao(e), rodadas: pe.config.rodadas, limiares: pe.config.limiares, efeito: pe.config.efeito, por: pe.por, mortes: pe.mortes, recuperarFolego: !!pe.config.recuperarFolego, sacrificio: !!pe.config.sacrificio, chegada: pe.config.chegada || 0 }; }
    if (p.esconderijo) { var h = p.esconderijo; vp.esconderijo = { ativo: h.ativo, distrair: h.distrair, por: {} }; Object.keys(h.por).forEach(function (pid) { var x = h.por[pid]; vp.esconderijo.por[pid] = meus.indexOf(pid) >= 0 ? copiar(x) : { quantos: x.dados.length, descoberto: x.descoberto, chegou: x.chegou, parado: x.parado }; }); vp.esconderijo.ultima = lista(h.rolagens).slice(-1).map(function (x) { return { rodada: x.rodada, d10: x.d10, valores: x.valores }; })[0] || null; }
    vp.recursos = {};
    Object.keys(p.recursos).forEach(function (k) { var rc = p.recursos[k]; vp.recursos[k] = { nome: rc.def.nome, opcoes: lista(rc.def.opcoes).map(function (x) { return { id: x.id, nome: x.nome }; }), usados: rc.usados.filter(function (q) { return meus.indexOf(q) >= 0; }) }; });
    if (p.encontro && p.encontro.ativo) vp.encontro = { ativo: true, etapa: (lista(obj(p.encontro.config).etapas).filter(function (x) { return x.id === p.encontro.etapa; })[0] || {}).nome || "", bloqueio: p.encontro.bloqueio ? { ativo: true, pcs: p.encontro.bloqueio.pcs } : null };
    v.proc = vp;
    /* Os pontos do jogador ganham número, área e desafios anunciados. */
    v.investigacao.pontos = v.investigacao.pontos.map(function (vp2) {
      var orig = e.investigacao.pontos.filter(function (x) { return x.id === vp2.id; })[0] || {};
      vp2.numero = orig.numero || ""; vp2.area = orig.area || "";
      vp2.desafios = lista(orig.desafios).filter(function (did) { var d = desafio(e, did); return d && d.publico; });
      vp2.pericias = lista(vp2.pericias).filter(function (k) { return k !== "mestre"; });
      return vp2;
    });
  });

  /* ---------------------------------------------------------------
     REGISTRO
     --------------------------------------------------------------- */
  function OP(nome, fn, o) { ME().registrarOperacao(nome, function (e, fichas, op, papel, rolar, s, ctx) {
    if (!e.proc) e.proc = procVazio();
    FICHAS_DO_REVELAR = fichas;
    try { return fn(e, fichas, op, papel, rolar, s, ctx || {}); } finally { FICHAS_DO_REVELAR = null; }
  }, o); }
  /* As operações da mesa antiga também precisam das fichas no revelar. */
  ["investigar", "resolverTeste", "teste"].forEach(function (nome) {
    var orig = ME().OPERACOES[nome];
    ME().OPERACOES[nome] = function (e, fichas) { var antes = FICHAS_DO_REVELAR; FICHAS_DO_REVELAR = fichas; try { return orig.apply(null, arguments); } finally { FICHAS_DO_REVELAR = antes; } };
  });
  ME().gancho("normalizar", function (v, b) { v.proc = normalizarProc(b.proc); });

  global.RAMAOrdem2Proc = {
    VERSAO: VERSAO, procVazio: procVazio, normalizar: normalizarProc,
    hidratar: hidratar, desidratar: desidratar, cenaParaMestre: cenaParaMestre, cenaDoPacote: cenaDoPacote,
    flagAtiva: flagAtiva, rolarExpr: rolarExpr, periciaEsp: periciaEsp, linhaDaTabela: linhaDaTabela,
    anexoDef: anexoDef, contagemDaOnda: contagemDaOnda, rodadaDeOnda: rodadaDeOnda,
  };
})(typeof window !== "undefined" ? window : globalThis);
