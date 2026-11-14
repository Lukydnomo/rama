/* =====================================================================
   R.A.M.A. — Ordem Paranormal RPG II (Experimental) · a mesa (v9.0)
   ---------------------------------------------------------------------
   O estado compartilhado de uma campanha (CAMPANHA_ORDEM2, uma linha) e
   a porta ÚNICA de toda ação: aplicar(estado, fichas, op, papel, rolar).
   O servidor (backend/Ordem2.gs) roda esta mesma função com o rolador
   dele; a ficha sem campanha roda aqui, com um estado local guardado no
   próprio bloco (`ordem2.local`).

     missão e cena     renovação de relações por missão; fim de cena
     pedidos           testes pedidos pelo Mestre e as respostas
     testes            um teste fica "aguardando" enquanto há escolhas
                       pós-rolagem (Análise, Prontidão, Olhar Infalível,
                       Mentoria, os três somados); só ao confirmar o efeito
                       é aplicado e o resultado final é registrado
     ajudas            quem ajudou quem, com passos, Mentoria e relação
     investigação      pontos de interesse com descrição pública, pistas
                       por perícia/limiar e nota privada; Investigar,
                       Observar, Examinar, Interagir, Recapitular e
                       Compartilhar conforme o perfil de regras
     combate           Beta: fases configuráveis (Geral → Distância →
                       Corpo a corpo), declarar, rolar, aplicar a fase
                       de uma vez (simultaneidade); Alpha: o conflito
                       simplificado da p. 26

   `fichas`: { personagemId: { nome, bloco } } — só as que a operação
   toca (fichasDaOperacao). O retorno diz quais blocos mudaram.
   Copiado para backend/Ordem2.gs (testes/gerar-ordem2-gs.js).
   ===================================================================== */

(function (global) {
  "use strict";

  function K() { return global.RAMAOrdem2Catalogo; }
  function R() { return global.RAMAOrdem2; }
  function M() { return global.RAMAOrdem2Motor; }
  function lista(v) { return Array.isArray(v) ? v : []; }
  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  function texto(v, n) { return String(v === undefined || v === null ? "" : v).slice(0, n || 200); }
  function inteiro(v, a, b, p) { return R().inteiro(v, a, b, p); }
  function copiar(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
  function id() { return R().novoId(); }

  var VERSAO = 1;
  var MAX_TESTES = 40, MAX_REGISTRO = 200, MAX_ROLAGENS = 60;

  /* Quem pode o quê. */
  var OPS_DO_MESTRE = ["configurar", "novaMissao", "novaCena", "pedirTeste", "fecharPedido", "dano", "curar", "pavor", "condicao", "corrigir",
    "iniciarCombate", "adicionarNpc", "removerParticipante", "configurarFases", "aplicarFase", "proximaRodada", "encerrarCombate",
    "ponto", "removerPonto", "revelarPonto", "resolverSolicitacao", "darPista", "conflitoAlpha"];
  var OPS_DO_PERSONAGEM = ["teste", "resolverTeste", "usarHabilidade", "ajudar", "invocarRelacao", "investigar", "recapitular", "compartilhar",
    "declarar", "cancelarDeclaracao", "acaoLivre", "gastar", "redirecionar", "configurarParticipante"];
  /* As do Mestre que não tocam ficha nenhuma. */
  var OPS_SEM_FICHA = ["configurar", "pedirTeste", "fecharPedido", "ponto", "removerPonto", "revelarPonto", "resolverSolicitacao", "configurarFases", "adicionarNpc", "removerParticipante"];
  /* Configurações com `rev` (um estado velho não sobrescreve). */
  var OPS_COM_REV = ["configurar", "ponto", "removerPonto", "configurarFases"];

  function estadoVazio(perfil) {
    var pr = K().PERFIS_REGRAS[perfil] ? perfil : "beta-vigilia";
    return {
      versao: VERSAO,
      perfil: pr, ambientacao: K().PERFIS_REGRAS[pr].ambientacao,
      missao: { numero: 1, nome: "" },
      cena: { numero: 1, nome: "", tipo: "livre" },
      combate: combateVazio(),
      investigacao: { pontos: [], descobertas: {}, travas: { recapitular: false, compartilhar: false }, solicitacoes: [] },
      pedidos: [], ajudas: [], testes: [], reservasGrupo: [],
      rolagens: [], registro: [], privado: [],
    };
  }
  function combateVazio() {
    return { ativo: false, rodada: 0, ordemFases: K().ORDEM_FASES_PADRAO.slice(), fase: 0, etapa: "declarar", participantes: [], declaracoes: [], agiu: {}, antecipados: [], corpoNaRodada: {}, corpoAnterior: {}, atacaramNaCena: {}, miras: [], fintas: [] };
  }
  /* Mira vale na rodada seguinte; finta, até o fim da próxima rodada. */
  function marcasDeRodada(v) {
    return lista(v).map(function (x) { var o = obj(x); return { a: texto(o.a, 80), b: texto(o.b, 80), de: inteiro(o.de, 0, 100000), ate: inteiro(o.ate, 0, 100000) }; }).filter(function (x) { return x.a && x.b; }).slice(-30);
  }

  function normalizar(bruto) {
    var b = obj(bruto);
    var v = estadoVazio(b.perfil);
    v.ambientacao = K().AMBIENTACOES[b.ambientacao] ? b.ambientacao : v.ambientacao;
    var mi = obj(b.missao), ce = obj(b.cena);
    v.missao = { numero: inteiro(mi.numero, 1, 100000, 1), nome: texto(mi.nome, 120) };
    v.cena = { numero: inteiro(ce.numero, 1, 100000, 1), nome: texto(ce.nome, 120), tipo: ["livre", "investigacao", "combate", "acao"].indexOf(ce.tipo) >= 0 ? ce.tipo : "livre" };
    var c = obj(b.combate), cv = combateVazio();
    cv.ativo = c.ativo === true;
    cv.rodada = inteiro(c.rodada, 0, 100000);
    var fases = lista(c.ordemFases).filter(function (f, i, t) { return K().FASES[f] && t.indexOf(f) === i; });
    cv.ordemFases = fases.length ? fases : K().ORDEM_FASES_PADRAO.slice();
    cv.fase = inteiro(c.fase, 0, cv.ordemFases.length);
    cv.etapa = c.etapa === "rolada" ? "rolada" : "declarar";
    cv.participantes = lista(c.participantes).map(normalizarParticipante).filter(Boolean).slice(0, 30);
    cv.declaracoes = lista(c.declaracoes).map(function (d) { return copiar(obj(d)); }).filter(function (d) { return d.id && d.ator; }).slice(0, 60);
    cv.agiu = obj(copiar(c.agiu)); cv.antecipados = lista(c.antecipados).map(String).slice(0, 30);
    cv.corpoNaRodada = obj(copiar(c.corpoNaRodada)); cv.corpoAnterior = obj(copiar(c.corpoAnterior)); cv.atacaramNaCena = obj(copiar(c.atacaramNaCena));
    cv.miras = marcasDeRodada(c.miras); cv.fintas = marcasDeRodada(c.fintas);
    v.combate = cv;
    var inv = obj(b.investigacao);
    v.investigacao.pontos = lista(inv.pontos).map(normalizarPonto).slice(0, 60);
    Object.keys(obj(inv.descobertas)).forEach(function (pid) {
      v.investigacao.descobertas[texto(pid, 80)] = lista(inv.descobertas[pid]).map(function (x) { var o = obj(x); return { id: texto(o.id, 80) || id(), pista: texto(o.pista, 80), ponto: texto(o.ponto, 80), texto: texto(o.texto, 1200), como: texto(o.como, 80), critico: o.critico === true }; }).slice(-120);
    });
    var tr = obj(inv.travas);
    v.investigacao.travas = { recapitular: tr.recapitular === true, compartilhar: tr.compartilhar === true };
    v.investigacao.solicitacoes = lista(inv.solicitacoes).map(function (s) { return copiar(obj(s)); }).filter(function (s) { return s.id; }).slice(-40);
    v.pedidos = lista(b.pedidos).map(function (p) { return copiar(obj(p)); }).filter(function (p) { return p.id; }).slice(-30);
    v.ajudas = lista(b.ajudas).map(function (p) { return copiar(obj(p)); }).filter(function (p) { return p.id; }).slice(-30);
    v.testes = lista(b.testes).map(function (p) { return copiar(obj(p)); }).filter(function (p) { return p.id && p.quem; }).slice(-MAX_TESTES);
    v.reservasGrupo = lista(b.reservasGrupo).map(function (r) { var o = obj(r); return { id: texto(o.id, 80) || id(), faces: R().faces(o.faces, 6), fonte: texto(o.fonte, 80) }; }).slice(0, 12);
    v.rolagens = lista(b.rolagens).map(function (p) { return copiar(obj(p)); }).slice(-MAX_ROLAGENS);
    v.registro = lista(b.registro).map(function (r) { var o = obj(r); return { quando: texto(o.quando, 40), texto: texto(o.texto, 400) }; }).slice(-MAX_REGISTRO);
    v.privado = lista(b.privado).map(function (r) { var o = obj(r); return { quando: texto(o.quando, 40), texto: texto(o.texto, 400) }; }).slice(-MAX_REGISTRO);
    return v;
  }

  function normalizarPonto(x) {
    var p = obj(x);
    return {
      id: texto(p.id, 80) || id(), nome: texto(p.nome, 120) || "Ponto de interesse", descricao: texto(p.descricao, 2000), revelado: p.revelado !== false,
      pistas: lista(p.pistas).map(function (q) {
        var o = obj(q);
        var pericias = lista(o.pericias).map(function (k) { return texto(k, 60).toLowerCase(); }).filter(Boolean);
        if (!pericias.length && o.pericia) pericias = [texto(o.pericia, 60).toLowerCase()];
        return { id: texto(o.id, 80) || id(), pericias: pericias.slice(0, 4), dt: inteiro(o.dt, 0, 40, 6), texto: texto(o.texto, 1200), restricao: texto(o.restricao, 120) };
      }).slice(0, 30),
      contextual: texto(p.contextual, 4000), notaPrivada: texto(p.notaPrivada, 2000),
    };
  }

  function normalizarParticipante(x) {
    var p = obj(x);
    if (!p.id) return null;
    var tipo = p.tipo === "npc" ? "npc" : "pc";
    var v = { id: texto(p.id, 80), tipo: tipo, personagemId: tipo === "pc" ? texto(p.personagemId, 80) : "", nome: texto(p.nome, 120) || "?", oculto: p.oculto === true, esquivaAuto: p.esquivaAuto === true,
      /* Gastar armadura é escolha de quem joga (os pontos não voltam no
         playtest); o NPC usa sempre que tiver. */
      armaduraAuto: tipo === "npc" ? p.armaduraAuto !== false : p.armaduraAuto === true };
    if (tipo === "npc") {
      v.bloco = R().normalizar(p.bloco);
      v.ataques = lista(p.ataques).map(function (a) { return R().normalizarItem(Object.assign({ tipo: "arma" }, obj(a))); }).slice(0, 6);
      v.notas = texto(p.notas, 1200);
    }
    return v;
  }

  /* ---------------------------------------------------------------
     UTILITÁRIOS
     --------------------------------------------------------------- */
  function agora() { return new Date().toISOString(); }
  function log(e, t, privado) { (privado ? e.privado : e.registro).push({ quando: agora(), texto: String(t).slice(0, 400) }); }
  function chaveDaMissao(e, local) { return local ? "l" + local : "m" + e.missao.numero; }
  function nomeDe(fichas, pid) { return fichas[pid] ? fichas[pid].nome : "?"; }
  function bloco(fichas, pid) { return fichas[pid] ? fichas[pid].bloco : null; }

  function participante(e, idP) { return e.combate.participantes.filter(function (p) { return p.id === idP; })[0] || null; }
  function participanteDoPersonagem(e, pid) { return e.combate.participantes.filter(function (p) { return p.personagemId === pid; })[0] || null; }
  /* O bloco de um participante (ficha do PC ou o do NPC). */
  function blocoDoAtor(e, fichas, p) { return p ? (p.tipo === "pc" ? bloco(fichas, p.personagemId) : p.bloco) : null; }
  function foraDeCombate(b) { return !b || b.estado.morto || b.estado.colapso || b.estado.inconsciente || b.recursos.pv.atual <= 0 && !b.estado.morteLenta; }

  /* A permissão de agir por um personagem: o Mestre, ou quem pode. */
  function podeAgir(papel, pid) { return !!papel.mestre || lista(papel.pode).indexOf(pid) >= 0; }

  function registrarRolagem(e, quem, nome, m, res, saida) {
    var r = { id: id(), quem: quem, nome: nome, rotulo: m.rotulo, dados: res.dados.map(function (d) { return { faces: d.faces, valor: d.valor, anulado: d.anulado, somado: d.somado, fonte: d.fonte }; }), pavor: res.pavor, total: res.total, dt: res.dt, ra: res.ra, rb: res.rb, critico: res.critico, falhaCritica: res.falhaCritica, sucesso: res.sucesso, quando: agora() };
    e.rolagens.push(r); e.rolagens = e.rolagens.slice(-MAX_ROLAGENS);
    if (saida) saida.rolagens.push(r);
    return r;
  }
  function descreverResultado(res) {
    var faces = res.dados.map(function (d) { return (d.anulado ? "~" : "") + d.valor + (d.somado ? "" : "*"); }).join(", ");
    var s = "[" + faces + "]" + (res.pavor ? " pavor " + res.pavor.valor : "") + " = " + res.total + (res.dt !== null && res.dt !== undefined ? " vs DT " + res.dt : "");
    if (res.critico) s += " · CRÍTICO";
    else if (res.falhaCritica) s += " · FALHA CRÍTICA";
    else if (res.sucesso === true) s += " · sucesso";
    else if (res.sucesso === false) s += " · falha";
    return s;
  }

  /* ---------------------------------------------------------------
     FICHAS QUE UMA OPERAÇÃO TOCA
     --------------------------------------------------------------- */
  /* Quase toda operação pode tocar outra ficha (Prontidão de um aliado,
     ajuda, relação, fase de combate): carrega as da campanha. As
     configurações do Mestre não tocam ficha nenhuma. */
  function fichasDaOperacao(e, op, todos) {
    var o = obj(op);
    if (OPS_SEM_FICHA.indexOf(o.tipo) >= 0) return [];
    return lista(todos).map(String);
  }

  /* ---------------------------------------------------------------
     A PORTA
     --------------------------------------------------------------- */
  function aplicar(e, fichas, op, papel, rolar, opcoes) {
    var o = obj(op);
    var ctx = Object.assign({ local: 0 }, obj(opcoes));
    var saida = { ok: true, eventos: [], rolagens: [], tocadas: [], resultado: {} };
    var antes = {};
    Object.keys(fichas).forEach(function (pid) { antes[pid] = JSON.stringify(fichas[pid].bloco); });
    if (OPS_DO_MESTRE.indexOf(o.tipo) < 0 && OPS_DO_PERSONAGEM.indexOf(o.tipo) < 0) return { ok: false, motivo: "Operação desconhecida." };
    if (OPS_DO_MESTRE.indexOf(o.tipo) >= 0 && !papel.mestre) return { ok: false, motivo: "Só o Mestre pode fazer isso." };
    var fn = OPERACOES[o.tipo];
    var r = fn(e, fichas, o, papel, rolar, saida, ctx);
    if (r && r.ok === false) return r;
    Object.keys(fichas).forEach(function (pid) { if (JSON.stringify(fichas[pid].bloco) !== antes[pid]) saida.tocadas.push(pid); });
    e.testes = e.testes.slice(-MAX_TESTES);
    e.registro = e.registro.slice(-MAX_REGISTRO);
    e.privado = e.privado.slice(-MAX_REGISTRO);
    return saida;
  }
  function ev(saida, t, privado) { saida.eventos.push({ texto: String(t), privado: !!privado }); }
  function evs(saida, lista_) { lista(lista_).forEach(function (x) { saida.eventos.push(x); }); }

  /* ---------------------------------------------------------------
     MISSÃO, CENA, CONFIGURAÇÃO
     --------------------------------------------------------------- */
  var OPERACOES = {};
  OPERACOES.configurar = function (e, f, o, p, rolar, s) {
    if (o.perfil && K().PERFIS_REGRAS[o.perfil]) e.perfil = o.perfil;
    if (o.ambientacao && K().AMBIENTACOES[o.ambientacao]) e.ambientacao = o.ambientacao;
    log(e, "Perfil de regras da campanha: " + K().PERFIS_REGRAS[e.perfil].nome + ".");
    ev(s, "Configuração salva.");
  };
  OPERACOES.novaMissao = function (e, f, o, p, rolar, s) {
    e.missao = { numero: e.missao.numero + 1, nome: texto(o.nome, 120) };
    log(e, "Missão " + e.missao.numero + (e.missao.nome ? " — " + e.missao.nome : "") + ": as relações podem ser invocadas de novo.");
    ev(s, "Nova missão: os usos de relação foram renovados.");
  };
  OPERACOES.novaCena = function (e, fichas, o, p, rolar, s) {
    Object.keys(fichas).forEach(function (pid) {
      var b = fichas[pid].bloco;
      M().fimDeCena(b).forEach(function (x) { s.eventos.push({ texto: fichas[pid].nome + ": " + x.texto, privado: false }); });
    });
    e.combate = combateVazio();
    e.cena = { numero: e.cena.numero + 1, nome: texto(o.nome, 120), tipo: ["livre", "investigacao", "combate", "acao"].indexOf(o.cenaTipo) >= 0 ? o.cenaTipo : "livre" };
    e.investigacao.travas = { recapitular: false, compartilhar: false };
    e.ajudas = []; e.reservasGrupo = [];
    e.pedidos.forEach(function (x) { x.aberto = false; });
    Object.keys(fichas).forEach(function (pid) {
      M().inicioDeCena(fichas[pid].bloco).forEach(function (x) { s.eventos.push({ texto: fichas[pid].nome + ": " + x.texto, privado: false }); });
    });
    log(e, "Cena " + e.cena.numero + (e.cena.nome ? " — " + e.cena.nome : "") + ".");
  };
  OPERACOES.pedirTeste = function (e, fichas, o, p, rolar, s) {
    var alvos = lista(o.alvos).map(String).slice(0, 12);
    if (!alvos.length) return { ok: false, motivo: "Escolha quem testa." };
    var pedido = { id: id(), rotulo: texto(o.rotulo, 120) || "Teste", atributo: K().ATRIBUTOS[o.atributo] ? o.atributo : "", pericia: texto(o.pericia, 40), dt: o.dt === null || o.dt === "" || o.dt === undefined ? null : inteiro(o.dt, 0, 40, 7), oculto: o.oculto === true, alvos: alvos, respostas: {}, aberto: true };
    e.pedidos.push(pedido);
    log(e, "O Mestre pede " + pedido.rotulo + (pedido.dt !== null && !pedido.oculto ? " (DT " + pedido.dt + ")" : "") + ".");
    s.resultado.pedido = pedido.id;
  };
  OPERACOES.fecharPedido = function (e, f, o) { e.pedidos.forEach(function (x) { if (x.id === o.id) x.aberto = false; }); };

  /* ---------------------------------------------------------------
     RECURSOS, PAVOR, CONDIÇÕES, CORREÇÕES (Mestre)
     --------------------------------------------------------------- */
  function alvoDoMestre(e, fichas, o) {
    if (o.personagem && bloco(fichas, o.personagem)) return { b: bloco(fichas, o.personagem), nome: nomeDe(fichas, o.personagem), pid: o.personagem };
    var pa = participante(e, o.participante);
    if (pa) return { b: blocoDoAtor(e, fichas, pa), nome: pa.nome, pid: pa.personagemId, participante: pa };
    return null;
  }
  OPERACOES.dano = function (e, fichas, o, p, rolar, s, ctx) {
    var a = alvoDoMestre(e, fichas, o);
    if (!a || !a.b) return { ok: false, motivo: "Alvo não encontrado." };
    var evd = M().aplicarDano(a.b, { valor: o.valor, tipo: o.danoTipo, naoLetal: o.naoLetal === true, externo: o.externo !== false, armadura: o.armadura === true });
    evd.forEach(function (x) { ev(s, a.nome + ": " + x.texto); });
    log(e, a.nome + ": " + evd.map(function (x) { return x.texto; }).join(" "));
  };
  OPERACOES.curar = function (e, fichas, o, p, rolar, s) {
    var a = alvoDoMestre(e, fichas, o);
    if (!a || !a.b) return { ok: false, motivo: "Alvo não encontrado." };
    var n = M().curar(a.b, o.recurso === "pd" ? "pd" : "pv", o.valor);
    ev(s, a.nome + " recupera " + n + " " + (o.recurso === "pd" ? "PD" : "PV") + ".");
    log(e, a.nome + " recupera " + n + " " + (o.recurso === "pd" ? "PD" : "PV") + ".");
  };
  OPERACOES.pavor = function (e, fichas, o, p, rolar, s) {
    var a = alvoDoMestre(e, fichas, o);
    if (!a || !a.b) return { ok: false, motivo: "Alvo não encontrado." };
    if (o.acao === "remover") { a.b.estado.pavor = 0; ev(s, a.nome + ": sem pavor."); }
    else if (o.acao === "definir") { a.b.estado.pavor = o.faces ? R().faces(o.faces, 6) : 0; ev(s, a.nome + ": pavor d" + a.b.estado.pavor + " (ajuste do Mestre)."); }
    else M().darPavor(a.b).forEach(function (x) { ev(s, a.nome + ": " + x.texto); });
    log(e, s.eventos.map(function (x) { return x.texto; }).join(" "));
  };
  OPERACOES.condicao = function (e, fichas, o, p, rolar, s) {
    var a = alvoDoMestre(e, fichas, o);
    if (!a || !a.b) return { ok: false, motivo: "Alvo não encontrado." };
    var c = String(o.chave || "");
    if (["caido", "inconsciente", "moribundo", "morto", "perdeAcao"].indexOf(c) < 0) return { ok: false, motivo: "Condição desconhecida." };
    a.b.estado[c] = c === "perdeAcao" ? (o.valor ? 2 : 0) : o.valor === true;
    ev(s, a.nome + ": " + R().NOMES_CONDICAO[c] + (o.valor ? " ✓" : " removido") + ".");
    log(e, s.eventos[0].texto);
  };
  /* O Mestre corrige uma consequência grave (fica no histórico). */
  OPERACOES.corrigir = function (e, fichas, o, p, rolar, s) {
    var b = bloco(fichas, o.personagem);
    if (!b) return { ok: false, motivo: "Personagem não encontrado." };
    var nome = nomeDe(fichas, o.personagem), t = "";
    if (o.alvo === "lesao") { var l = b.estado.lesoes.filter(function (x) { return x.id === o.id; })[0]; if (!l) return { ok: false, motivo: "Lesão não encontrada." }; b.estado.lesoes = b.estado.lesoes.filter(function (x) { return x.id !== o.id; }); t = "lesão removida: " + l.nome; }
    else if (o.alvo === "trauma") { var tr = b.estado.traumas.filter(function (x) { return x.id === o.id; })[0]; if (!tr) return { ok: false, motivo: "Trauma não encontrado." }; tr.curado = o.curar !== false; if (o.curar === "remover") b.estado.traumas = b.estado.traumas.filter(function (x) { return x.id !== o.id; }); t = "trauma " + (tr.curado ? "curado" : "reaberto") + ": " + tr.nome; }
    else if (o.alvo === "contadores") { b.estado.testesLesao = 0; b.estado.testesTrauma = 0; t = "contadores de lesão e trauma zerados"; }
    else if (o.alvo === "vida") { b.estado.morto = false; b.estado.colapso = false; b.estado.morteLenta = false; t = "morte/colapso desfeitos"; }
    else if (o.alvo === "pendente") { b.estado.pendentes = b.estado.pendentes.filter(function (x) { return x.id !== o.id; }); t = "teste pendente descartado"; }
    else return { ok: false, motivo: "Correção desconhecida." };
    M().registrar(b, "correcao", "Correção do Mestre: " + t + ".");
    b.historico[b.historico.length - 1].corrigido = true;
    b.recursos.pv.atual = Math.min(b.recursos.pv.atual, R().pvMax(b));
    b.recursos.pd.atual = Math.min(b.recursos.pd.atual, R().pdMax(b));
    ev(s, nome + ": " + t + ".");
    log(e, nome + ": correção do Mestre — " + t + ".");
  };

  /* ---------------------------------------------------------------
     TESTES
     --------------------------------------------------------------- */
  function ajudasPara(e, pid) { return e.ajudas.filter(function (a) { return a.alvo === pid && !a.consumida; }); }

  OPERACOES.teste = function (e, fichas, o, papel, rolar, s, ctx) {
    var pid = String(o.quem || "");
    var b = bloco(fichas, pid);
    if (!b) return { ok: false, motivo: "Personagem não encontrado." };
    if (!podeAgir(papel, pid)) return { ok: false, motivo: "Você não conduz este personagem." };
    if (b.estado.morto || b.estado.colapso) return { ok: false, motivo: "Este personagem está fora de jogo." };
    var pedido = copiar(obj(o.pedido));
    var cx = obj(o.contexto);
    /* Teste pendente (lesão/trauma): o motor diz o teste. */
    if (cx.pendente) {
      var pend = b.estado.pendentes.filter(function (x) { return x.id === cx.pendente; })[0];
      if (!pend) return { ok: false, motivo: "Esse teste pendente não existe mais." };
      var base = M().pedidoDoPendente(b, pend);
      pedido = Object.assign(base, { usar: pedido.usar, passos: pedido.passos, alvoDosPassos: pedido.alvoDosPassos, bonus: base.bonus.concat(lista(pedido.bonus)) });
    }
    if (cx.pedido) {
      var pe = e.pedidos.filter(function (x) { return x.id === cx.pedido; })[0];
      if (!pe || !pe.aberto) return { ok: false, motivo: "O pedido foi encerrado." };
      if (pe.alvos.indexOf(pid) < 0) return { ok: false, motivo: "O pedido não é para este personagem." };
      if (pe.respostas[pid]) return { ok: false, motivo: "Já respondido." };
      pedido.rotulo = pe.rotulo; if (pe.dt !== null) pedido.dt = pe.dt;
      if (!pedido.atributo && pe.atributo) pedido.atributo = pe.atributo;
      if (!pedido.pericia && pe.pericia) pedido.pericia = pe.pericia;
    }
    /* Ajudas declaradas para este personagem: passos e bônus. */
    var ajudas = ajudasPara(e, pid);
    pedido.passos = lista(pedido.passos);
    pedido.bonus = lista(pedido.bonus);
    ajudas.forEach(function (a) {
      if (a.passos) pedido.passos.push({ alvo: a.alvoPasso || "pericia", n: a.passos, fonte: "Ajuda de " + a.nomeAjudante });
      if (a.bonusRelacao) pedido.bonus.push({ faces: a.bonusRelacao, fonte: "Relação (ajuda de " + a.nomeAjudante + ")" });
    });
    /* Reserva de grupo (Plano Estratégico). */
    var grupo = lista(obj(pedido.usar).grupo).filter(function (gid) { return e.reservasGrupo.some(function (r) { return r.id === gid; }); });
    grupo.forEach(function (gid) { var r = e.reservasGrupo.filter(function (x) { return x.id === gid; })[0]; pedido.bonus.push({ faces: r.faces, fonte: r.fonte }); });
    var mt = M().montar(b, pedido, { permitir20: false });
    if (!mt.ok) return mt;
    var m = mt.montagem;
    var pg = M().pagarCustos(b, m.custos);
    if (!pg.ok) return pg;
    e.reservasGrupo = e.reservasGrupo.filter(function (r) { return grupo.indexOf(r.id) < 0; });
    var rolagem = M().rolar(m, rolar);
    var t = { id: id(), quem: pid, nome: nomeDe(fichas, pid), montagem: m, rolagem: rolagem, pos: { ajustes: [], trocas: [], soma: [] }, usos: {}, contexto: copiar(cx), ajudas: ajudas.map(function (a) { return a.id; }), estado: "aguardando", quando: agora(), rodada: e.combate.ativo ? e.combate.rodada : null, aguardar: o.aguardar === true };
    ajudas.forEach(function (a) { a.consumida = true; });
    t.resultado = M().resolver(m, rolagem, t.pos);
    e.testes.push(t);
    s.resultado.teste = t.id;
    var opcoes = opcoesPos(e, fichas, t, papel);
    if (!opcoes.algum || o.confirmar === true) return finalizar(e, fichas, t, papel, rolar, s, ctx);
    s.resultado.aguardando = true;
    s.resultado.opcoes = opcoes;
    ev(s, t.nome + " · " + m.rotulo + ": " + descreverResultado(t.resultado) + " — escolhas pós-rolagem abertas.");
  };

  /* O que ainda pode mudar o teste antes de valer. */
  function opcoesPos(e, fichas, t, papel) {
    var b = bloco(fichas, t.quem);
    var o = { analise: 0, prontidao: [], olhar: false, mentoria: null, escolherSoma: false, algum: false };
    if (!b) return o;
    R().habilidadesDoTipo(b, "analise").forEach(function (h) { o.analise += h.estado.marcadores; });
    o.analise -= t.pos.ajustes.reduce(function (s, a) { return s + Math.abs(Number(a.delta) || 0); }, 0);
    o.analise = Math.max(0, o.analise);
    var faces = t.resultado.dados.map(function (d) { return d.valor; });
    var rerrolavel = faces.some(function (v) { return v !== 1; });
    /* Prontidão (Beta): a própria ou de outro ser em alcance curto. */
    Object.keys(fichas).forEach(function (pid) {
      var bx = fichas[pid].bloco;
      R().habilidadesDoTipo(bx, "prontidao").forEach(function (h) {
        var chave = "rodada:prontidao:" + h.id;
        var usadoNoTeste = t.usos["prontidao:" + pid];
        var usadoNaRodada = t.rodada !== null && bx.estado.usos[chave] === t.rodada;
        if (!usadoNoTeste && !usadoNaRodada && bx.recursos.pd.atual >= R().motorDe(h).pd && rerrolavel) o.prontidao.push({ por: pid, nome: fichas[pid].nome, pd: R().motorDe(h).pd, proprio: pid === t.quem });
      });
    });
    if (t.montagem.examinar && !t.usos.olhar) R().habilidadesDoTipo(b, "rerrolarExaminar").forEach(function (h) { if (b.recursos.pd.atual >= R().motorDe(h).pd) o.olhar = { pd: R().motorDe(h).pd }; });
    t.ajudas.forEach(function (aid) { var a = e.ajudas.filter(function (x) { return x.id === aid; })[0]; if (a && a.mentoria && !t.usos.mentoria) o.mentoria = { valor: a.mentoria, nome: a.nomeAjudante }; });
    var vivos = t.resultado.dados.filter(function (d) { return !d.anulado; }).length;
    o.escolherSoma = vivos > M().MAX_DADOS_SOMADOS;
    /* A Prontidão de um ALIADO só segura o teste quando quem rolou pediu
       para esperar reações, ou em combate (a fase espera o Mestre). */
    var esperaAliados = t.aguardar === true || !!(t.contexto && t.contexto.combate);
    var prontidaoQueSegura = o.prontidao.filter(function (x) { return x.proprio || esperaAliados; });
    o.algum = o.analise > 0 || prontidaoQueSegura.length > 0 || !!o.olhar || !!o.mentoria || o.escolherSoma;
    return o;
  }

  OPERACOES.resolverTeste = function (e, fichas, o, papel, rolar, s, ctx) {
    var t = e.testes.filter(function (x) { return x.id === o.testeId; })[0];
    if (!t) return { ok: false, motivo: "Teste não encontrado." };
    if (t.estado !== "aguardando") return { ok: false, motivo: "Este teste já valeu." };
    var b = bloco(fichas, t.quem);
    if (!b) return { ok: false, motivo: "Personagem não encontrado." };
    var donoDoTeste = podeAgir(papel, t.quem);
    if (!donoDoTeste && (o.mentoria || Array.isArray(o.soma) || o.confirmar)) return { ok: false, motivo: "Só quem rolou (ou o Mestre) decide a soma, a Mentoria e quando o teste vale." };
    /* Análise ±1 (Beta): só quem rolou. */
    if (lista(o.ajustes).length) {
      if (!donoDoTeste) return { ok: false, motivo: "Só quem rolou usa Análise." };
      var disp = opcoesPos(e, fichas, t, papel).analise;
      var pedidos = lista(o.ajustes).map(function (a) { return { indice: inteiro(a.indice, 0, 3), delta: Number(a.delta) > 0 ? 1 : -1 }; });
      if (pedidos.length > disp) return { ok: false, motivo: "Marcadores de análise insuficientes (" + disp + ")." };
      t.pos.ajustes = t.pos.ajustes.concat(pedidos);
    }
    /* Rolar de novo um dado: Prontidão (de quem a tem) ou Olhar Infalível. */
    if (o.rerrolar) {
      var rr = obj(o.rerrolar), i = inteiro(rr.indice, 0, 3);
      if (i >= t.montagem.dados.length) return { ok: false, motivo: "Dado inválido." };
      var atual = M().resolver(t.montagem, t.rolagem, t.pos).dados[i].valor;
      if (rr.fonte === "olhar") {
        if (!donoDoTeste) return { ok: false, motivo: "Só quem rolou usa Olhar Infalível." };
        var ho = R().habilidadesDoTipo(b, "rerrolarExaminar")[0];
        if (!ho || !t.montagem.examinar || t.usos.olhar) return { ok: false, motivo: "Olhar Infalível não se aplica aqui." };
        var c1 = M().pagarCustos(b, { pd: R().motorDe(ho).pd }); if (!c1.ok) return c1;
        t.usos.olhar = true;
      } else {
        var por = String(rr.por || t.quem);
        if (!podeAgir(papel, por)) return { ok: false, motivo: "Você não conduz quem tem a Prontidão." };
        var bp = bloco(fichas, por);
        var hp = bp ? R().habilidadesDoTipo(bp, "prontidao")[0] : null;
        if (!hp) return { ok: false, motivo: "Sem Prontidão." };
        if (atual === 1) return { ok: false, motivo: "Prontidão não rola de novo um dado que deu 1." };
        if (t.usos["prontidao:" + por] || (t.rodada !== null && bp.estado.usos["rodada:prontidao:" + hp.id] === t.rodada)) return { ok: false, motivo: "Prontidão já foi usada nesta rodada." };
        if (por !== t.quem && rr.alcanceCurto !== true) return { ok: false, motivo: "Confirme que o ser está em alcance curto." };
        var c2 = M().pagarCustos(bp, { pd: R().motorDe(hp).pd }); if (!c2.ok) return c2;
        t.usos["prontidao:" + por] = true;
        if (t.rodada !== null) bp.estado.usos["rodada:prontidao:" + hp.id] = t.rodada;
      }
      var novo = rolar(t.montagem.dados[i].faces);
      t.pos.trocas.push({ indice: i, valor: novo, fonte: rr.fonte === "olhar" ? "Olhar Infalível" : "Prontidão" });
      ev(s, t.nome + ": " + (rr.fonte === "olhar" ? "Olhar Infalível" : "Prontidão") + " — o dado " + (i + 1) + " sai de " + atual + " para " + novo + ".");
    }
    /* Mentoria: troca um dado pela RA de quem ajudou. */
    if (o.mentoria) {
      var op = opcoesPos(e, fichas, t, papel).mentoria;
      if (!op) return { ok: false, motivo: "Sem Mentoria disponível." };
      var im = inteiro(obj(o.mentoria).indice, 0, 3);
      t.pos.trocas.push({ indice: im, valor: Math.min(op.valor, t.montagem.dados[im].faces), fonte: "Mentoria de " + op.nome });
      t.usos.mentoria = true;
    }
    if (Array.isArray(o.soma)) t.pos.soma = o.soma.map(Number).slice(0, 3);
    t.resultado = M().resolver(t.montagem, t.rolagem, t.pos);
    if (o.confirmar) return finalizar(e, fichas, t, papel, rolar, s, ctx);
    s.resultado.teste = t.id;
    s.resultado.aguardando = true;
    s.resultado.opcoes = opcoesPos(e, fichas, t, papel);
  };

  /* O teste VALE: custos de marcador, Ímpeto, pavor e o efeito. */
  function finalizar(e, fichas, t, papel, rolar, s, ctx) {
    var b = bloco(fichas, t.quem);
    var res = t.resultado = M().resolver(t.montagem, t.rolagem, t.pos);
    /* Marcadores de Análise gastos. */
    var gastos = t.pos.ajustes.length;
    R().habilidadesDoTipo(b, "analise").forEach(function (h) { var tira = Math.min(h.estado.marcadores, gastos); h.estado.marcadores -= tira; gastos -= tira; });
    t.estado = "final";
    registrarRolagem(e, t.quem, t.nome, t.montagem, res, s);
    var linha = t.nome + " · " + t.montagem.rotulo + (t.montagem.atributoTrocado ? " (com " + K().ATRIBUTOS[t.montagem.atributo].nome + ")" : "") + ": " + descreverResultado(res);
    ev(s, linha);
    log(e, linha);
    M().aposTeste(b, t.montagem, res).forEach(function (x) { ev(s, t.nome + ": " + x.texto); });
    var cx = obj(t.contexto);
    if (cx.pendente) {
      var rp = M().resolverPendente(b, cx.pendente, res, rolar, e.combate.ativo ? e.combate.rodada : null);
      if (!rp.ok) return rp;
      if (rp.tabela) ev(s, t.nome + ": d20 na tabela → " + rp.tabela.rolagens.join(" e ") + (rp.tabela.bonus ? " +" + rp.tabela.bonus : "") + ".");
      rp.eventos.forEach(function (x) { ev(s, t.nome + ": " + x.texto); log(e, t.nome + ": " + x.texto); });
    }
    if (cx.pedido) {
      var pe = e.pedidos.filter(function (x) { return x.id === cx.pedido; })[0];
      if (pe) pe.respostas[t.quem] = { total: res.total, sucesso: res.sucesso, critico: res.critico, falhaCritica: res.falhaCritica, teste: t.id };
    }
    if (cx.investigacao) concluirExaminar(e, fichas, t, res, s);
    if (cx.solicitacao) concluirSolicitacao(e, t, res, s);
    if (cx.habilidade) concluirHabilidade(e, fichas, t, res, s, rolar, ctx);
    if (cx.combate) {
      var d = e.combate.declaracoes.filter(function (x) { return x.id === cx.combate; })[0];
      if (d) { d.teste = t.id; d.resultado = res; }
    }
    if (res.falhaCritica && cx.tabelaFalha !== false) ev(s, t.nome + ": falha crítica — o Mestre aplica a penalidade ou rola 1d8 na tabela (p. 19/11).");
    if (res.critico && t.montagem.examinar && !t.montagem.beta) ev(s, t.nome + ": crítico examinando — o Mestre revela uma informação adicional (Alpha p. 19).", true);
    s.resultado.teste = t.id;
    s.resultado.final = true;
    s.resultado.resultado = res;
  }

  /* ---------------------------------------------------------------
     HABILIDADES
     --------------------------------------------------------------- */
  function habilidadeDaFicha(b, hid) { return lista(b.habilidades).filter(function (h) { return h.id === hid || h.ref === hid; })[0] || null; }

  OPERACOES.usarHabilidade = function (e, fichas, o, papel, rolar, s, ctx) {
    var pid = String(o.quem || ""), b = bloco(fichas, pid);
    if (!b) return { ok: false, motivo: "Personagem não encontrado." };
    if (!podeAgir(papel, pid)) return { ok: false, motivo: "Você não conduz este personagem." };
    var h = habilidadeDaFicha(b, o.habilidade);
    if (!h) return { ok: false, motivo: "Habilidade não encontrada." };
    var m = R().motorDe(h);
    if (!m) return { ok: false, motivo: "Esta habilidade não tem efeito automático: descreva e confirme com o Mestre." };
    var nome = nomeDe(fichas, pid);
    var f = HABILIDADES_ATIVAS[m.tipo];
    if (!f) return { ok: false, motivo: "Esta habilidade age sozinha (na hora certa) ou é narrativa." };
    return f(e, fichas, b, h, m, o, papel, rolar, s, ctx, nome, pid);
  };

  var HABILIDADES_ATIVAS = {
    analise: function (e, f, b, h, m, o, papel, rolar, s, ctx, nome) {
      var antes = h.estado.marcadores;
      h.estado.marcadores = Math.min(m.maximo, antes + m.ganho);
      ev(s, nome + " · " + h.nome + ": " + antes + " → " + h.estado.marcadores + " marcador(es) (máximo " + m.maximo + ").");
      log(e, s.eventos[s.eventos.length - 1].texto);
    },
    avaliacao: function (e, f, b, h, m, o, papel, rolar, s, ctx, nome) {
      var livres = m.maximo - h.estado.reserva.length;
      if (livres <= 0) return { ok: false, motivo: "Já tem " + m.maximo + " dados de " + h.nome + "." };
      var pg = M().pagarCustos(b, { pd: m.pd }); if (!pg.ok) return pg;
      var alvo = texto(o.alvo, 120) || "ser ou ambiente";
      for (var i = 0; i < Math.min(m.dados, livres); i++) h.estado.reserva.push({ id: id(), faces: m.faces, alvo: alvo });
      ev(s, nome + " · " + h.nome + " (" + m.pd + " PD): " + h.estado.reserva.length + " d" + m.faces + " para testes sobre " + alvo + ".");
      log(e, s.eventos[0].texto);
    },
    impeto: function (e, f, b, h, m, o, papel, rolar, s, ctx, nome) {
      var op = m.opcoes[inteiro(o.opcao, 0, 9)];
      if (!op || op.efeito === "dado") return { ok: false, motivo: "O dado do Ímpeto entra na hora do teste." };
      if (h.estado.espacos < op.custo) return { ok: false, motivo: "Faltam espaços de ímpeto." };
      if (op.soConflito && !e.combate.ativo && !o.conflito) return { ok: false, motivo: "Essa opção vale em cena de conflito." };
      h.estado.espacos -= op.custo;
      if (op.efeito === "passoAtributo") {
        if (!K().ATRIBUTOS[o.atributo]) return { ok: false, motivo: "Escolha o atributo." };
        b.efeitos.push({ id: id(), tipo: "passoAtributo", alvo: o.atributo, n: 1, faces: 0, expira: "cena", fonte: h.nome, d20: false });
        ev(s, nome + " · " + h.nome + ": " + K().ATRIBUTOS[o.atributo].nome + " +1 passo até o fim da cena.");
      } else if (op.efeito === "acaoExtra") {
        b.estado.acaoExtra++;
        ev(s, nome + " · " + h.nome + ": uma ação extra.");
      }
      log(e, s.eventos[0].texto);
    },
    acaoExtraPorPv: function (e, f, b, h, m, o, papel, rolar, s, ctx, nome) {
      if (!e.combate.ativo && !o.conflito) return { ok: false, motivo: h.nome + " vale em cena de conflito." };
      var chave = "cena:" + h.id;
      if (b.estado.usos[chave]) return { ok: false, motivo: "Já usada nesta cena." };
      var pg = M().pagarCustos(b, { pv: m.pv }); if (!pg.ok) return pg;
      b.estado.usos[chave] = true; b.estado.acaoExtra++;
      ev(s, nome + " · " + h.nome + " (" + m.pv + " PV): uma ação extra.");
      log(e, s.eventos[0].texto);
    },
    rodadaAntecipada: function (e, f, b, h, m, o, papel, rolar, s, ctx, nome, pid) {
      var c = e.combate;
      if (!c.ativo || c.rodada !== 0) return { ok: false, motivo: h.nome + " vale no início de um conflito (antes da 1ª rodada)." };
      var pa = participanteDoPersonagem(e, pid);
      if (!pa) return { ok: false, motivo: "Entre no combate primeiro." };
      if (c.antecipados.indexOf(pa.id) >= 0) return { ok: false, motivo: "Já antecipado." };
      var pg = M().pagarCustos(b, { pd: m.pd }); if (!pg.ok) return pg;
      c.antecipados.push(pa.id);
      ev(s, nome + " · " + h.nome + " (" + m.pd + " PD): age numa rodada antes dos demais.");
      log(e, s.eventos[0].texto);
    },
    consumiveis: function (e, fichas, b, h, m, o, papel, rolar, s, ctx, nome, pid) {
      var it = lista(b.itens).filter(function (x) { return x.id === o.item; })[0];
      if (!it || !it.consumivel) return { ok: false, motivo: "Escolha o preparado." };
      if (it.quantidade !== null && it.quantidade <= 0) return { ok: false, motivo: it.nome + ": acabou." };
      var alvoPid = o.alvo ? String(o.alvo) : pid;
      var ba = bloco(fichas, alvoPid) || b;
      var nomeAlvo = fichas[alvoPid] ? fichas[alvoPid].nome : nome;
      if (it.consumivel === "vespa") return { ok: false, motivo: "O pote de vespa é um ataque à distância: declare-o no combate (Sobrevivência, dano RA+1)." };
      if (it.consumivel === "tonico") { ba.efeitos.push({ id: id(), tipo: "passoAtributo", alvo: "fisico", n: 1, faces: 0, expira: "cena", fonte: it.nome, d20: false }); ev(s, nome + " usa " + it.nome + " em " + nomeAlvo + ": Físico +1 passo nesta cena."); }
      if (it.consumivel === "balsamo") {
        var d1 = rolar(4), d2 = rolar(4), total = d1 + d2;
        var extra = R().habilidadesDoTipo(b, "curaExtra").reduce(function (x, hh) { return x + 2 * (Number(R().motorDe(hh).valor) || 1); }, 0);
        var n = M().curar(ba, "pv", total + extra);
        ev(s, nome + " usa " + it.nome + " em " + nomeAlvo + ": 2d4 [" + d1 + ", " + d2 + "]" + (extra ? " +" + extra : "") + " → recupera " + n + " PV" + (alvoPid !== pid ? " (o alvo fica parado nesta rodada)" : "") + ".");
        s.rolagens.push({ id: id(), quem: pid, nome: nome, rotulo: it.nome, dados: [{ faces: 4, valor: d1 }, { faces: 4, valor: d2 }], total: total, quando: agora() });
      }
      if (it.quantidade !== null) it.quantidade--;
      log(e, s.eventos[s.eventos.length - 1].texto);
    },
    curaPorTeste: function (e, fichas, b, h, m, o, papel, rolar, s, ctx, nome, pid) {
      var alvo = String(o.alvo || pid);
      if (!bloco(fichas, alvo)) return { ok: false, motivo: "Escolha um aliado desta mesa." };
      var chave = "cena:" + h.id + ":" + alvo;
      if (b.estado.usos[chave]) return { ok: false, motivo: h.nome + ": uma vez por cena em cada alvo." };
      return OPERACOES.teste(e, fichas, { quem: pid, pedido: Object.assign({ pericia: m.pericia, dt: m.dt, rotulo: h.nome, usar: obj(o.usar) }, {}), contexto: { habilidade: { id: h.id, tipo: m.tipo, alvo: alvo, pd: m.pd } }, confirmar: o.confirmar }, papel, rolar, s, ctx);
    },
    reservaDeGrupo: function (e, fichas, b, h, m, o, papel, rolar, s, ctx, nome, pid) {
      var per = lista(b.base.pericias).filter(function (p) { return p.chave === m.pericia && (!m.especializacao || p.especializacao === m.especializacao); })[0];
      if (!per) return { ok: false, motivo: "Falta a perícia " + m.pericia + (m.especializacao ? " (" + m.especializacao + ")" : "") + "." };
      return OPERACOES.teste(e, fichas, { quem: pid, pedido: { pericia: per.id, dt: m.dt, rotulo: h.nome, usar: obj(o.usar) }, contexto: { habilidade: { id: h.id, tipo: m.tipo, pd: m.pd } }, confirmar: o.confirmar }, papel, rolar, s, ctx);
    },
    redirecionarAtaque: function (e, fichas, b, h, m, o, papel, rolar, s, ctx, nome, pid) {
      return OPERACOES.redirecionar(e, fichas, Object.assign({}, o, { quem: pid }), papel, rolar, s, ctx);
    },
  };

  /* Custos que vêm junto com o teste da habilidade. */
  function concluirHabilidade(e, fichas, t, res, s, rolar, ctx) {
    var hb = obj(t.contexto.habilidade);
    var b = bloco(fichas, t.quem);
    var h = habilidadeDaFicha(b, hb.id);
    if (!h) return;
    if (hb.pd) M().pagarCustos(b, { pd: Math.min(hb.pd, b.recursos.pd.atual) });
    if (hb.tipo === "curaPorTeste") {
      b.estado.usos["cena:" + h.id + ":" + hb.alvo] = true;
      if (res.sucesso) {
        var ba = bloco(fichas, hb.alvo);
        var extra = R().habilidadesDoTipo(b, "curaExtra").reduce(function (x, hh) { return x + (Number(R().motorDe(hh).valor) || 1); }, 0);
        var n = M().curar(ba, "pv", res.ra + extra);
        ev(s, t.nome + " · " + h.nome + ": " + (fichas[hb.alvo] ? fichas[hb.alvo].nome : "aliado") + " recupera " + n + " PV (RA " + res.ra + (extra ? " +" + extra : "") + ").");
      } else ev(s, t.nome + " · " + h.nome + ": não curou.");
    }
    if (hb.tipo === "reservaDeGrupo" && res.sucesso) {
      var n2 = 1 + Math.max(0, Math.floor((res.total - (t.montagem.dt || 7)) / 3));
      if (ctx.local) { for (var i = 0; i < n2; i++) b.estado.reservas.push({ id: id(), faces: 6, fonte: h.nome, expira: "cena", alvo: "" }); }
      else { for (var j = 0; j < n2; j++) e.reservasGrupo.push({ id: id(), faces: 6, fonte: h.nome + " de " + t.nome }); }
      ev(s, t.nome + " · " + h.nome + ": o grupo recebe " + n2 + "d6 para gastar em testes até o fim da cena.");
    }
    log(e, s.eventos[s.eventos.length - 1].texto);
  }

  OPERACOES.gastar = function (e, fichas, o, papel, rolar, s) {
    var pid = String(o.quem || ""), b = bloco(fichas, pid);
    if (!b || !podeAgir(papel, pid)) return { ok: false, motivo: "Você não conduz este personagem." };
    var recurso = o.recurso === "pv" ? "pv" : "pd";
    var n = inteiro(o.valor, 1, 99, 1);
    var pg = M().pagarCustos(b, recurso === "pv" ? { pv: n } : { pd: n });
    if (!pg.ok) return pg;
    ev(s, nomeDe(fichas, pid) + " gasta " + n + " " + recurso.toUpperCase() + (o.motivo ? " (" + texto(o.motivo, 80) + ")" : "") + ". Gasto voluntário: não dispara trauma.");
    log(e, s.eventos[0].texto);
  };

  /* ---------------------------------------------------------------
     AJUDA E RELAÇÕES
     --------------------------------------------------------------- */
  function passosDeAjuda(f) { return f >= 10 ? 2 : f >= 6 ? 1 : 0; }
  OPERACOES.ajudar = function (e, fichas, o, papel, rolar, s, ctx) {
    var pid = String(o.quem || ""), b = bloco(fichas, pid);
    if (!b || !podeAgir(papel, pid)) return { ok: false, motivo: "Você não conduz este personagem." };
    var alvo = String(o.alvo || "");
    if (!bloco(fichas, alvo) || alvo === pid) return { ok: false, motivo: "Escolha quem você ajuda." };
    var per = R().pericia(b, o.pericia);
    if (!per) return { ok: false, motivo: "Escolha a perícia coerente com a ajuda." };
    var f = R().dadoDaPericia(b, per);
    var passos = passosDeAjuda(f);
    if (!passos) return { ok: false, motivo: "Não dá para ajudar com perícia d4 (Alpha p. 19; Beta p. 11)." };
    var a = { id: id(), ajudante: pid, nomeAjudante: nomeDe(fichas, pid), alvo: alvo, pericia: per.chave, passos: passos, alvoPasso: o.alvoPasso === "atributo" ? "atributo" : "pericia", mentoria: 0, bonusRelacao: 0, consumida: false };
    /* Mentoria: um teste da perícia contra DT 7; passando, a RA serve
       para trocar um dado do ajudado. */
    var hm = R().habilidadesDoTipo(b, "mentoria")[0];
    if (hm) {
      var mt = M().montar(b, { pericia: per.id, dt: R().motorDe(hm).dt, rotulo: hm.nome }, {});
      if (mt.ok) {
        var rl = M().rolar(mt.montagem, rolar), rs = M().resolver(mt.montagem, rl, {});
        registrarRolagem(e, pid, a.nomeAjudante, mt.montagem, rs, s);
        if (rs.sucesso) a.mentoria = rs.ra;
        ev(s, a.nomeAjudante + " · " + hm.nome + ": " + descreverResultado(rs) + (rs.sucesso ? " — o ajudado pode trocar um dado por " + rs.ra + "." : "."));
      }
    }
    /* Relação com o ajudado: +dX na ajuda (invocada aqui). */
    if (o.relacao) {
      var r = lista(b.relacoes).filter(function (x) { return x.id === o.relacao; })[0];
      var inv = invocar(e, b, r, ctx);
      if (!inv.ok) return inv;
      a.bonusRelacao = K().GRAUS_RELACAO[r.grau].dado;
      ev(s, a.nomeAjudante + " invoca a relação com " + r.nome + ": +d" + a.bonusRelacao + " no teste ajudado.");
    }
    e.ajudas.push(a);
    ev(s, a.nomeAjudante + " ajuda " + nomeDe(fichas, alvo) + " com " + R().nomeDaPericia(b, per) + " (d" + f + "): +" + passos + " passo(s) no próximo teste (gasta a ação).");
    log(e, s.eventos[s.eventos.length - 1].texto);
  };

  function invocar(e, b, r, ctx) {
    if (!r) return { ok: false, motivo: "Relação não encontrada." };
    if (!r.grau) return { ok: false, motivo: "Escolha o grau da relação (Afinidade, Vínculo ou Devoção) antes de invocar — o rótulo da ficha não define grau." };
    var chave = chaveDaMissao(e, ctx.local ? b.estado.missaoLocal : 0);
    if (r.usadaEm === chave) return { ok: false, motivo: "Esta relação já foi invocada nesta missão (Beta p. 24)." };
    r.usadaEm = chave;
    return { ok: true };
  }
  OPERACOES.invocarRelacao = function (e, fichas, o, papel, rolar, s, ctx) {
    var pid = String(o.quem || ""), b = bloco(fichas, pid);
    if (!b || !podeAgir(papel, pid)) return { ok: false, motivo: "Você não conduz este personagem." };
    var r = lista(b.relacoes).filter(function (x) { return x.id === o.relacao; })[0];
    var g = r && r.grau ? K().GRAUS_RELACAO[r.grau] : null;
    var ben = String(o.beneficio || "teste");
    if (ben === "motivar" && (!g || !g.recuperar)) return { ok: false, motivo: "Motivar exige Vínculo ou Devoção." };
    if (ben === "acaoExtra" && (!g || !g.acaoExtra)) return { ok: false, motivo: "A ação extra é da Devoção." };
    if (ben === "ajuda") return { ok: false, motivo: "O bônus de ajuda entra na ação Ajudar." };
    var inv = invocar(e, b, r, ctx);
    if (!inv.ok) return inv;
    var nome = nomeDe(fichas, pid);
    if (ben === "teste") {
      b.estado.reservas.push({ id: id(), faces: g.dado, fonte: "Relação: " + r.nome, expira: "cena", alvo: "teste ligado a " + r.nome });
      ev(s, nome + " invoca " + r.nome + " (" + g.nome + "): +d" + g.dado + " num teste diretamente ligado a essa pessoa.");
    }
    if (ben === "motivar") {
      var faces = g.recuperar === "2d6" ? 6 : 4;
      var d1 = rolar(faces), d2 = rolar(faces);
      var alvoB = r.alvoPersonagemId ? bloco(fichas, r.alvoPersonagemId) : null;
      if (alvoB) { var n = M().curar(alvoB, "pd", d1 + d2); ev(s, nome + " motiva " + r.nome + " (" + g.nome + ", gasta a ação): " + g.recuperar + " [" + d1 + ", " + d2 + "] → recupera " + n + " PD."); }
      else ev(s, nome + " motiva " + r.nome + " (" + g.nome + ", gasta a ação): " + g.recuperar + " [" + d1 + ", " + d2 + "] = " + (d1 + d2) + " PD para " + r.nome + " (a relação não está ligada a uma ficha desta mesa: aplique à mão).");
      s.rolagens.push({ id: id(), quem: pid, nome: nome, rotulo: "Motivar " + r.nome, dados: [{ faces: faces, valor: d1 }, { faces: faces, valor: d2 }], total: d1 + d2, quando: agora() });
    }
    if (ben === "acaoExtra") { b.estado.acaoExtra++; ev(s, nome + " invoca " + r.nome + " (Devoção): uma ação extra para ajudar essa pessoa em perigo."); }
    log(e, s.eventos[s.eventos.length - 1].texto);
  };

  /* ---------------------------------------------------------------
     INVESTIGAÇÃO (Alpha pp. 21–23; Beta pp. 13–15)
     --------------------------------------------------------------- */
  function pistaCabe(b, pista, per) {
    var ch = per.chave + (per.especializacao ? ":" + per.especializacao.toLowerCase() : "");
    return pista.pericias.some(function (k) {
      var kk = K().ALIASES[k] || k;
      if (kk.indexOf("aptidao") === 0) return per.chave === "aptidao" && (kk === "aptidao" || kk === ch);
      return kk === per.chave;
    });
  }
  function revelar(e, pid, ponto, per, limite, b, como) {
    var ja = e.investigacao.descobertas[pid] || (e.investigacao.descobertas[pid] = []);
    var novas = [];
    ponto.pistas.forEach(function (q) {
      if (!pistaCabe(b, q, per) || q.dt > limite) return;
      if (ja.some(function (d) { return d.pista === q.id; })) return;
      var d = { id: id(), pista: q.id, ponto: ponto.id, texto: q.texto, como: como, critico: false };
      ja.push(d); novas.push(d);
    });
    return novas;
  }
  function periciasDoPonto(ponto) {
    var l = [];
    ponto.pistas.forEach(function (q) { q.pericias.forEach(function (k) { if (l.indexOf(k) < 0) l.push(k); }); });
    return l;
  }

  OPERACOES.investigar = function (e, fichas, o, papel, rolar, s, ctx) {
    var pid = String(o.quem || ""), b = bloco(fichas, pid);
    if (!b || !podeAgir(papel, pid)) return { ok: false, motivo: "Você não conduz este personagem." };
    var ponto = e.investigacao.pontos.filter(function (x) { return x.id === o.ponto && x.revelado; })[0];
    if (!ponto) return { ok: false, motivo: "Ponto de interesse não encontrado." };
    var beta = e.perfil === "beta-vigilia";
    var nome = nomeDe(fichas, pid);
    var modo = String(o.modo || "examinar");
    function interagir() {
      var sol = { id: id(), tipo: "interagir", quem: pid, nome: nome, ponto: ponto.id, descricao: texto(o.descricao, 600), estado: "pendente" };
      e.investigacao.solicitacoes.push(sol);
      ev(s, nome + " interage com " + ponto.nome + ": " + (sol.descricao || "(sem descrição)") + " — o Mestre resolve pela descrição contextual.");
      log(e, s.eventos[s.eventos.length - 1].texto);
    }
    /* Beta (p. 14): Interagir é a alternativa a Investigar, sem passiva. */
    if (modo === "interagir" && (beta || !o.pericia)) { interagir(); return; }
    var per = R().pericia(b, o.pericia);
    if (!per) return { ok: false, motivo: "Escolha uma perícia listada do ponto." };
    var face = R().dadoDaPericia(b, per);
    var novas = revelar(e, pid, ponto, per, face, b, R().nomeDaPericia(b, per) + " d" + face + " (passiva)");
    var linha = nome + " investiga " + ponto.nome + " com " + R().nomeDaPericia(b, per) + " d" + face + ": " + novas.length + " informação(ões) passiva(s).";
    /* Varredura Ampla (Alpha): duas perícias na passiva. */
    if (o.segunda && !beta) {
      if (!R().habilidadesDoTipo(b, "duasPericias").length) return { ok: false, motivo: "Duas perícias na passiva é da Varredura Ampla." };
      var p2 = R().pericia(b, o.segunda);
      if (p2) { var f2 = R().dadoDaPericia(b, p2); var n2 = revelar(e, pid, ponto, p2, f2, b, R().nomeDaPericia(b, p2) + " d" + f2 + " (Varredura Ampla)"); novas = novas.concat(n2); linha += " Varredura Ampla com " + R().nomeDaPericia(b, p2) + ": +" + n2.length + "."; }
    }
    /* Beta: Observar com outra perícia (passiva). */
    if (modo === "observar") {
      if (!beta) return { ok: false, motivo: "Observar é do Beta (p. 14)." };
      var p3 = R().pericia(b, o.segunda);
      if (!p3 || p3.id === per.id) return { ok: false, motivo: "Observar usa OUTRA perícia listada." };
      var f3 = R().dadoDaPericia(b, p3);
      var n3 = revelar(e, pid, ponto, p3, f3, b, R().nomeDaPericia(b, p3) + " d" + f3 + " (observar)");
      novas = novas.concat(n3);
      linha += " Observa com " + R().nomeDaPericia(b, p3) + " d" + f3 + ": +" + n3.length + ".";
    }
    s.resultado.novas = novas;
    ev(s, linha);
    log(e, linha);
    /* Alpha (p. 22): depois da passiva, examinar OU interagir. */
    if (modo === "interagir") { interagir(); return; }
    if (modo === "examinar") {
      return OPERACOES.teste(e, fichas, { quem: pid, pedido: Object.assign({}, obj(o.pedido), { pericia: per.id, dt: null, semDt: true, tipo: "simples", examinar: true, rotulo: "Examinar " + ponto.nome + " (" + R().nomeDaPericia(b, per) + ")" }), contexto: { investigacao: { ponto: ponto.id, pericia: per.id } }, confirmar: o.confirmar }, papel, rolar, s, ctx);
    }
  };

  function concluirExaminar(e, fichas, t, res, s) {
    var inv = t.contexto.investigacao;
    var b = bloco(fichas, t.quem);
    var ponto = e.investigacao.pontos.filter(function (x) { return x.id === inv.ponto; })[0];
    var per = R().pericia(b, inv.pericia);
    if (!ponto || !per) return;
    var limite = res.falhaCritica ? -1 : res.total;
    var novas = revelar(e, t.quem, ponto, per, limite, b, "Examinar (" + res.total + ")");
    if (res.critico) { var ds = e.investigacao.descobertas[t.quem]; ds.push({ id: id(), pista: "", ponto: ponto.id, texto: "Crítico: o Mestre revela uma informação adicional.", como: "Crítico (Alpha p. 19)", critico: true }); }
    if (novas.length) {
      ev(s, t.nome + " examina " + ponto.nome + ": " + novas.length + " informação(ões) nova(s).");
      R().habilidadesDoTipo(b, "pdAoDescobrir").forEach(function (h) { var n = M().curar(b, "pd", R().motorDe(h).pd); ev(s, t.nome + " · " + h.nome + ": +" + n + " PD."); });
    } else {
      M().pagarCustos(b, { pd: Math.min(1, b.recursos.pd.atual) });
      ev(s, t.nome + " examina " + ponto.nome + " e não acha nada novo: perde 1 PD (Alpha p. 22; Beta p. 14).");
    }
    s.resultado.novas = novas;
    log(e, s.eventos[s.eventos.length - 1].texto);
  }

  /* Recapitular e Compartilhar: aprovação narrativa do Mestre, DT 10 e
     trava na cena depois do sucesso. */
  OPERACOES.recapitular = function (e, fichas, o, papel, rolar, s) {
    var pid = String(o.quem || ""), b = bloco(fichas, pid);
    if (!b || !podeAgir(papel, pid)) return { ok: false, motivo: "Você não conduz este personagem." };
    if (e.investigacao.travas.recapitular) return { ok: false, motivo: "Alguém já recapitulou com sucesso nesta cena." };
    var sol = { id: id(), tipo: "recapitular", quem: pid, nome: nomeDe(fichas, pid), descricao: texto(o.descricao, 1200), estado: "pendente", pericia: "intuicao", dt: 10 };
    e.investigacao.solicitacoes.push(sol);
    ev(s, sol.nome + " recapitula o caso — aguardando o Mestre julgar a coerência.");
    log(e, s.eventos[0].texto);
  };
  OPERACOES.compartilhar = function (e, fichas, o, papel, rolar, s) {
    var pid = String(o.quem || ""), b = bloco(fichas, pid);
    if (!b || !podeAgir(papel, pid)) return { ok: false, motivo: "Você não conduz este personagem." };
    if (e.investigacao.travas.compartilhar) return { ok: false, motivo: "Uma dedução por Compartilhar já saiu nesta cena." };
    var aliado = String(o.aliado || "");
    if (!fichas[aliado] || aliado === pid) return { ok: false, motivo: "Escolha o aliado que ouve." };
    var sol = { id: id(), tipo: "compartilhar", quem: pid, nome: nomeDe(fichas, pid), aliado: aliado, nomeAliado: nomeDe(fichas, aliado), descricao: texto(o.descricao, 1200), estado: "pendente", pericia: K().periciaDePesquisa(e.perfil), dt: 10 };
    e.investigacao.solicitacoes.push(sol);
    ev(s, sol.nome + " compartilha uma pista com " + sol.nomeAliado + " — aguardando o Mestre.");
    log(e, s.eventos[0].texto);
  };
  OPERACOES.resolverSolicitacao = function (e, fichas, o, papel, rolar, s) {
    var sol = e.investigacao.solicitacoes.filter(function (x) { return x.id === o.id; })[0];
    if (!sol || sol.estado !== "pendente") return { ok: false, motivo: "Solicitação não encontrada." };
    sol.estado = o.aprovar ? "aprovada" : "recusada";
    if (o.pericia) sol.pericia = texto(o.pericia, 40);
    if (o.dt !== undefined && o.dt !== null && o.dt !== "") sol.dt = inteiro(o.dt, 0, 40, 10);
    if (sol.tipo === "interagir") { sol.estado = "resolvida"; sol.resposta = texto(o.resposta, 1200); }
    ev(s, (sol.tipo === "interagir" ? "Interação de " + sol.nome + " resolvida." : sol.nome + ": " + (o.aprovar ? "o Mestre aprova; teste de " + K().nomeDaPericia(e.perfil, sol.pericia, e.ambientacao) + " (DT " + sol.dt + ")" + (sol.tipo === "compartilhar" ? " por " + sol.nomeAliado + ", como ação livre" : "") + "." : "o Mestre não aprovou.")));
    log(e, s.eventos[0].texto);
  };
  function concluirSolicitacao(e, t, res, s) {
    var sol = e.investigacao.solicitacoes.filter(function (x) { return x.id === t.contexto.solicitacao; })[0];
    if (!sol) return;
    sol.estado = res.sucesso ? "sucesso" : "falha";
    if (res.sucesso) { e.investigacao.travas[sol.tipo] = true; ev(s, (sol.tipo === "recapitular" ? sol.nome : sol.nomeAliado) + " deduz uma nova pista — o Mestre a revela. " + (sol.tipo === "recapitular" ? "Recapitular" : "Compartilhar") + " fica travado nesta cena."); }
  }
  function solicitacaoDoTeste(e, cx, pid) {
    var sol = e.investigacao.solicitacoes.filter(function (x) { return x.id === cx.solicitacao; })[0];
    if (!sol || sol.estado !== "aprovada") return { ok: false, motivo: "Aguardando a aprovação do Mestre." };
    var quem = sol.tipo === "compartilhar" ? sol.aliado : sol.quem;
    if (quem !== pid) return { ok: false, motivo: "Quem testa é " + (sol.tipo === "compartilhar" ? sol.nomeAliado : sol.nome) + "." };
    return { ok: true, sol: sol };
  }
  /* O teste de uma solicitação aprovada usa a perícia e a DT dela. */
  var testeOriginal = OPERACOES.teste;
  OPERACOES.teste = function (e, fichas, o, papel, rolar, s, ctx) {
    var cx = obj(o.contexto);
    if (cx.solicitacao) {
      var ok = solicitacaoDoTeste(e, cx, String(o.quem || ""));
      if (!ok.ok) return ok;
      var b = bloco(fichas, o.quem);
      var per = R().pericia(b, ok.sol.pericia);
      o = Object.assign({}, o, { pedido: Object.assign({}, obj(o.pedido), { pericia: per ? per.id : ok.sol.pericia, dt: ok.sol.dt, rotulo: (ok.sol.tipo === "recapitular" ? "Recapitular" : "Compartilhar") + " (DT " + ok.sol.dt + ")" }) });
    }
    return testeOriginal(e, fichas, o, papel, rolar, s, ctx);
  };

  OPERACOES.ponto = function (e, f, o, p, rolar, s) {
    var n = normalizarPonto(o.ponto);
    var i = e.investigacao.pontos.map(function (x) { return x.id; }).indexOf(n.id);
    if (i >= 0) e.investigacao.pontos[i] = n; else e.investigacao.pontos.push(n);
    ev(s, "Ponto de interesse salvo: " + n.nome + ".", true);
    log(e, s.eventos[0].texto, true);
  };
  OPERACOES.removerPonto = function (e, f, o, p, rolar, s) {
    e.investigacao.pontos = e.investigacao.pontos.filter(function (x) { return x.id !== o.id; });
    ev(s, "Ponto removido.", true);
  };
  OPERACOES.revelarPonto = function (e, f, o, p, rolar, s) {
    var pt = e.investigacao.pontos.filter(function (x) { return x.id === o.id; })[0];
    if (!pt) return { ok: false, motivo: "Ponto não encontrado." };
    pt.revelado = o.revelado !== false;
    if (pt.revelado) log(e, "Ponto de interesse: " + pt.nome + ".");
  };
  OPERACOES.darPista = function (e, fichas, o, p, rolar, s) {
    var pid = String(o.personagem || "");
    if (!pid) return { ok: false, motivo: "Escolha o personagem." };
    var ds = e.investigacao.descobertas[pid] || (e.investigacao.descobertas[pid] = []);
    ds.push({ id: id(), pista: texto(o.pista, 80), ponto: texto(o.ponto, 80), texto: texto(o.texto, 1200), como: texto(o.como, 80) || "Mestre", critico: false });
    ev(s, "O Mestre revela uma pista para " + (fichas[pid] ? fichas[pid].nome : "o personagem") + ".");
  };

  /* ---------------------------------------------------------------
     COMBATE · BETA (pp. 18–21)
     --------------------------------------------------------------- */
  OPERACOES.iniciarCombate = function (e, fichas, o, p, rolar, s) {
    var c = combateVazio();
    var ordem = lista(o.ordemFases).filter(function (x, i, t) { return K().FASES[x] && t.indexOf(x) === i; });
    if (ordem.length) c.ordemFases = ordem;
    c.ativo = true; c.rodada = o.antecipar === false ? 1 : 0;
    lista(o.personagens).forEach(function (pid) { if (fichas[pid]) c.participantes.push({ id: "pc-" + pid, tipo: "pc", personagemId: pid, nome: fichas[pid].nome, oculto: false, esquivaAuto: false }); });
    lista(o.npcs).forEach(function (n) { var x = novoNpc(n); if (x) c.participantes.push(x); });
    e.combate = c;
    e.cena.tipo = "combate";
    log(e, "Combate! " + (c.rodada === 0 ? "Rodada antecipada (Prontidão/Antecipação) antes da 1ª." : "Rodada 1.") + " Fases: " + c.ordemFases.map(function (f) { return K().FASES[f].nome; }).join(" → ") + ".");
    ev(s, "Combate iniciado.");
  };
  function novoNpc(n) {
    var o = obj(n);
    var at = obj(o.atributos), pe = obj(o.pericias);
    var pericias = Object.keys(pe).map(function (k) { return { chave: k, dado: pe[k] }; });
    var pv = inteiro(o.pv, 1, 999, 10);
    return normalizarParticipante({
      id: "npc-" + id(), tipo: "npc", nome: texto(o.nome, 120) || "NPC", oculto: o.oculto === true,
      bloco: { perfilRegras: "beta-vigilia", base: { atributos: { fisico: at.fisico || 6, mente: at.mente || 6, emocao: at.emocao || 6 }, pericias: pericias.length ? pericias : [{ chave: "luta", dado: 6 }, { chave: "pontaria", dado: 4 }, { chave: "acrobacia", dado: 4 }, { chave: "percepcao", dado: 4 }, { chave: "intuicao", dado: 4 }] }, recursos: { pv: { max: pv, atual: pv }, pd: { max: inteiro(o.pd, 1, 999, 10), atual: inteiro(o.pd, 1, 999, 10) } }, itens: o.armadura ? [{ nome: "Proteção", armadura: inteiro(o.armadura, 0, 20), vestido: true }] : [] },
      ataques: lista(o.ataques).length ? o.ataques : [{ nome: "Ataque", alcance: "corpo", dano: 1 }],
      notas: o.notas,
    });
  }
  OPERACOES.adicionarNpc = function (e, f, o, p, rolar, s) {
    var x = novoNpc(o.npc); if (!x) return { ok: false, motivo: "NPC inválido." };
    e.combate.participantes.push(x);
    ev(s, x.nome + " entra no combate.", x.oculto);
  };
  OPERACOES.removerParticipante = function (e, f, o) {
    e.combate.participantes = e.combate.participantes.filter(function (x) { return x.id !== o.id; });
    e.combate.declaracoes = e.combate.declaracoes.filter(function (d) { return d.ator !== o.id; });
  };
  OPERACOES.configurarFases = function (e, f, o, p, rolar, s) {
    var ordem = lista(o.ordem).filter(function (x, i, t) { return K().FASES[x] && t.indexOf(x) === i; });
    if (!ordem.length) return { ok: false, motivo: "Escolha ao menos uma fase." };
    e.combate.ordemFases = ordem; e.combate.fase = 0; e.combate.etapa = "declarar";
    log(e, "Ordem de fases: " + ordem.map(function (x) { return K().FASES[x].nome; }).join(" → ") + ".");
  };

  function faseAtual(e) { return e.combate.ordemFases[e.combate.fase] || ""; }
  function acoesNaRodada(e, ator) { return Number(e.combate.agiu[ator] || 0); }
  function podeDeclarar(e, fichas, pa, fase) {
    var c = e.combate;
    var b = blocoDoAtor(e, fichas, pa);
    if (!b) return "Sem ficha.";
    if (foraDeCombate(b)) return pa.nome + " não pode agir (fora de combate).";
    if (b.estado.perdeAcao === 1) return pa.nome + " perde a ação nesta rodada.";
    if (c.rodada === 0 && c.antecipados.indexOf(pa.id) < 0) return "Na rodada antecipada só age quem usou Prontidão/Antecipação.";
    var extra = b.estado.acaoExtra || 0;
    if (acoesNaRodada(e, pa.id) >= 1 + extra) return pa.nome + " já agiu nesta rodada.";
    var idx = c.ordemFases.indexOf(fase);
    var prontidao = R().habilidadesDoTipo(b, "prontidao").length > 0;
    if (idx < c.fase && !prontidao) return "Essa fase já passou.";
    if (idx === c.fase && c.etapa === "rolada" && !prontidao) return "As ações desta fase já foram roladas (Prontidão permite agir depois).";
    return "";
  }

  OPERACOES.declarar = function (e, fichas, o, papel, rolar, s, ctx) {
    var c = e.combate;
    if (!c.ativo) return { ok: false, motivo: "Não há combate." };
    var pa = participante(e, o.ator) || (o.quem ? participanteDoPersonagem(e, String(o.quem)) : null);
    if (!pa) return { ok: false, motivo: "Participante não encontrado." };
    if (pa.tipo === "npc" ? !papel.mestre : !podeAgir(papel, pa.personagemId)) return { ok: false, motivo: "Você não conduz este participante." };
    var acao = K().ACOES_COMBATE[o.acao];
    if (!acao) return { ok: false, motivo: "Ação desconhecida." };
    var fase = acao.fase;
    /* Prontidão: uma ação geral feita numa fase posterior. */
    if (o.naFase && K().FASES[o.naFase] && o.naFase !== fase) {
      var bP = blocoDoAtor(e, fichas, pa);
      if (!R().habilidadesDoTipo(bP, "prontidao").length) return { ok: false, motivo: "Agir em fase posterior é da Prontidão." };
      fase = o.naFase;
    }
    if (c.ordemFases.indexOf(fase) < 0) return { ok: false, motivo: K().FASES[fase].nome + " não está na ordem desta cena." };
    var motivo = podeDeclarar(e, fichas, pa, fase);
    if (motivo) return { ok: false, motivo: motivo };
    var d = { id: id(), ator: pa.id, nome: pa.nome, acao: o.acao, fase: fase, alvo: texto(o.alvo, 80), arma: texto(o.arma, 80), opcoes: copiar(obj(o.opcoes)), descricao: texto(o.descricao, 400), estado: "declarada", rodada: c.rodada };
    c.declaracoes.push(d);
    c.agiu[pa.id] = acoesNaRodada(e, pa.id) + 1;
    ev(s, pa.nome + " declara " + acao.nome + (d.alvo && participante(e, d.alvo) ? " contra " + participante(e, d.alvo).nome : "") + " (" + K().FASES[fase].nome + ").", pa.oculto);
    /* Declarada depois das rolagens (Prontidão): rola já. */
    if (c.etapa === "rolada" && c.ordemFases.indexOf(fase) === c.fase) rolarDeclaracao(e, fichas, d, papel, rolar, s, ctx);
    s.resultado.declaracao = d.id;
  };
  OPERACOES.cancelarDeclaracao = function (e, fichas, o, papel) {
    var d = e.combate.declaracoes.filter(function (x) { return x.id === o.id; })[0];
    if (!d) return { ok: false, motivo: "Declaração não encontrada." };
    var pa = participante(e, d.ator);
    if (!papel.mestre && !(pa && pa.tipo === "pc" && podeAgir(papel, pa.personagemId))) return { ok: false, motivo: "Sem permissão." };
    if (d.estado !== "declarada") return { ok: false, motivo: "Já rolada." };
    e.combate.declaracoes = e.combate.declaracoes.filter(function (x) { return x.id !== o.id; });
    e.combate.agiu[d.ator] = Math.max(0, acoesNaRodada(e, d.ator) - 1);
  };
  OPERACOES.acaoLivre = function (e, fichas, o, papel, rolar, s) {
    var pa = participante(e, o.ator) || (o.quem ? participanteDoPersonagem(e, String(o.quem)) : null);
    var pid = pa ? pa.personagemId : String(o.quem || "");
    var b = pa ? blocoDoAtor(e, fichas, pa) : bloco(fichas, pid);
    if (!b) return { ok: false, motivo: "Personagem não encontrado." };
    if (pa && pa.tipo === "npc" ? !papel.mestre : !podeAgir(papel, pid)) return { ok: false, motivo: "Sem permissão." };
    var a = K().ACOES_LIVRES[o.acao];
    if (!a) return { ok: false, motivo: "Ação livre desconhecida." };
    if (a.passosNaRodada) b.efeitos.push({ id: id(), tipo: "passoTodos", alvo: "", n: a.passosNaRodada, faces: 0, expira: "rodada", fonte: a.nome + " (ação livre)", d20: false });
    if (a.levanta) b.estado.caido = false;
    if (a.cai) b.estado.caido = true;
    ev(s, (pa ? pa.nome : nomeDe(fichas, pid)) + ": " + a.nome + (a.passosNaRodada ? " (−1 passo em todos os testes nesta rodada)" : "") + ".");
    log(e, s.eventos[0].texto);
  };
  /* Guardiã: tornar-se o alvo de um ataque contra aliado em curto. */
  OPERACOES.redirecionar = function (e, fichas, o, papel, rolar, s) {
    var pid = String(o.quem || ""), b = bloco(fichas, pid);
    if (!b || !podeAgir(papel, pid)) return { ok: false, motivo: "Você não conduz este personagem." };
    var h = R().habilidadesDoTipo(b, "redirecionarAtaque")[0];
    if (!h) return { ok: false, motivo: "Sem Guardiã." };
    var d = e.combate.declaracoes.filter(function (x) { return x.id === o.declaracao; })[0];
    if (!d || ["agredirCorpo", "agredirDistancia"].indexOf(d.acao) < 0) return { ok: false, motivo: "Escolha um ataque declarado." };
    var chave = "rodada:" + h.id;
    if (b.estado.usos[chave] === e.combate.rodada) return { ok: false, motivo: "Uma vez por rodada." };
    var pg = M().pagarCustos(b, { pd: R().motorDe(h).pd }); if (!pg.ok) return pg;
    b.estado.usos[chave] = e.combate.rodada;
    var eu = participanteDoPersonagem(e, pid);
    d.alvoOriginal = d.alvo; d.alvo = eu ? eu.id : d.alvo;
    ev(s, nomeDe(fichas, pid) + " · " + h.nome + " (2 PD): torna-se o alvo do ataque de " + d.nome + ".");
    log(e, s.eventos[0].texto);
  };

  /* Monta e rola UMA declaração (o teste do ator e, se houver, o do alvo
     que se opõe). NPC: o Mestre; PC: o teste fica com as escolhas
     pós-rolagem abertas até aplicar a fase. */
  function periciaDaAcao(acao, d) {
    if (acao === "agredirDistancia") return d.opcoes && d.opcoes.pericia ? d.opcoes.pericia : "pontaria";
    if (acao === "agredirCorpo" || K().ACOES_COMBATE[acao].manobra) return "luta";
    if (acao === "atrapalhar") return d.opcoes && d.opcoes.pericia ? d.opcoes.pericia : "enganacao";
    if (acao === "fintar") return "enganacao";
    if (acao === "defender") return d.opcoes && d.opcoes.comLuta ? "luta" : "acrobacia";
    return "";
  }
  function rolarDeclaracao(e, fichas, d, papel, rolar, s, ctx) {
    var pa = participante(e, d.ator);
    var b = blocoDoAtor(e, fichas, pa);
    var acao = K().ACOES_COMBATE[d.acao];
    d.estado = "rolada";
    var per = periciaDaAcao(d.acao, d);
    if (!per) { d.resultado = null; return; }
    var alvo = participante(e, d.alvo);
    var bAlvo = blocoDoAtor(e, fichas, alvo);
    var arma = null;
    if (pa.tipo === "pc") arma = lista(b.itens).filter(function (i) { return i.id === d.arma; })[0] || null;
    else arma = lista(pa.ataques).filter(function (i) { return i.id === d.arma; })[0] || lista(pa.ataques).filter(function (i) { return i.alcance === (d.acao === "agredirDistancia" ? "distancia" : "corpo"); })[0] || null;
    /* Pote de vespa (Arsenal de Herborista): ataque à distância com
       Sobrevivência, dano RA+1, uso único. */
    if (pa.tipo === "pc" && arma && arma.consumivel === "vespa") {
      if (arma.quantidade !== null && arma.quantidade <= 0) { d.estado = "declarada"; d.motivo = arma.nome + ": acabou."; return; }
      if (arma.quantidade !== null) arma.quantidade--;
      d.vespa = true; per = "sobrevivencia"; arma = null; d.opcoes.letal = true;
    }
    var pedido = { pericia: per, rotulo: acao.nome + (alvo ? " → " + alvo.nome : ""), usar: obj(d.opcoes.usar), passos: [], bonus: [] };
    if (d.acao === "defender") {
      pedido.bonus.push({ faces: 6, fonte: "Defender-se (+d6)" });
      /* Leitura de Combate: gastar a ação para se defender dá 1 marcador. */
      if (R().habilidadesDoTipo(b, "marcadorAoDefender").length) R().habilidadesDoTipo(b, "analise").forEach(function (h) { var mx = R().motorDe(h).maximo; if (h.estado.marcadores < mx) { h.estado.marcadores++; ev(s, pa.nome + " · Leitura de Combate: +1 marcador de análise."); } });
    }
    if (d.acao === "agredirCorpo" || d.acao === "agredirDistancia" || acao.manobra) {
      pedido.tipo = "ataque"; pedido.alcance = d.acao === "agredirDistancia" ? "distancia" : "corpo";
      if (arma && pa.tipo === "pc") pedido.arma = arma.id;
      var dist = d.acao === "agredirDistancia";
      var c = e.combate;
      var finta = lista(c.fintas).filter(function (x) { return x.a === pa.id && x.b === d.alvo && c.rodada <= x.ate; })[0];
      if (finta) c.fintas = c.fintas.filter(function (x) { return x !== finta; });
      var mod = M().modificadoresDeAtaque({ alcance: d.opcoes.alcance, cobertura: d.opcoes.cobertura, alvoCaido: bAlvo && bAlvo.estado.caido, distancia: dist, vantagemTatica: d.opcoes.vantagemTatica, ocultacao: d.opcoes.ocultacao, atirandoEmCorpo: dist && alvo && (c.corpoAnterior[alvo.id] || []).length > 0, aceitarDesvio: d.opcoes.aceitarDesvio, fintado: !!finta });
      if (!mod.ok) { d.resultado = null; d.motivo = mod.motivo; return; }
      pedido.dt = mod.dt;
      if (mod.passos) pedido.passos.push({ alvo: "pericia", n: mod.passos, fonte: mod.partes.join(", ") });
      d.desvio = mod.rolarDesvio;
      /* Mirar (na rodada anterior): +d6 à distância contra o alvo. */
      if (dist && lista(c.miras).some(function (x) { return x.a === pa.id && x.b === d.alvo && x.ate === c.rodada; })) pedido.bonus.push({ faces: 6, fonte: "Mirar (+d6)" });
      /* Não letal (Beta p. 23): desarmado já é; trocar o tipo custa −2 passos. */
      var desarmado = !arma;
      d.naoLetal = d.opcoes.naoLetal === true || (desarmado && d.opcoes.letal !== true);
      if ((d.opcoes.naoLetal === true && !desarmado) || (desarmado && d.opcoes.letal === true)) pedido.passos.push({ alvo: "pericia", n: -2, fonte: "Trocar dano letal/não letal (−2 passos)" });
      /* Lança de javali / lança de Sorcha: +1 passo. */
      if (arma && arma.efeitos.indexOf("passoPrimeiroAtaqueCena") >= 0 && !b.estado.usos["cena:primeiroAtaque:" + arma.id]) { pedido.passos.push({ alvo: "pericia", n: 1, fonte: arma.nome + " (primeiro ataque da cena)" }); b.estado.usos["cena:primeiroAtaque:" + arma.id] = true; }
      if (arma && arma.efeitos.indexOf("passoContraQuemNaoAtacou") >= 0 && lista(e.combate.atacaramNaCena[d.alvo]).indexOf(pa.id) < 0) pedido.passos.push({ alvo: "pericia", n: 1, fonte: arma.nome + " (alvo ainda não a atacou)" });
      if (pa.tipo === "npc" && arma) d.danoArma = arma.dano;
      if (d.opcoes.pericia && dist && d.opcoes.pericia !== "pontaria") pedido.pericia = d.opcoes.pericia; /* pote de vespa: Sobrevivência */
    } else if (d.acao === "atrapalhar" || d.acao === "fintar") {
      pedido.tipo = "oposto"; pedido.dt = null;
    } else { pedido.tipo = "oposto"; pedido.dt = null; }
    /* Passos de rodada sobre o ator (atrapalhado, empurrado…). */
    if (pa.tipo === "pc") {
      var r0 = OPERACOES.teste(e, fichas, { quem: pa.personagemId, pedido: pedido, contexto: { combate: d.id }, confirmar: false }, { mestre: true, pode: [pa.personagemId] }, rolar, s, ctx);
      if (r0 && r0.ok === false) { d.estado = "declarada"; d.motivo = r0.motivo; return r0; }
      d.teste = s.resultado.teste;
      var t = e.testes.filter(function (x) { return x.id === d.teste; })[0];
      d.resultado = t ? t.resultado : null;
    } else {
      var mt = M().montar(b, pedido, {});
      if (!mt.ok) { d.motivo = mt.motivo; return; }
      var rl = M().rolar(mt.montagem, rolar);
      d.resultado = M().resolver(mt.montagem, rl, {});
      d.montagem = mt.montagem;
      registrarRolagem(e, pa.id, pa.nome, mt.montagem, d.resultado, s);
      ev(s, pa.nome + " · " + mt.montagem.rotulo + ": " + descreverResultado(d.resultado), pa.oculto);
    }
  }

  /* Aplicar a fase: 1ª chamada rola todas as declarações elegíveis; a
     2ª resolve tudo de uma vez (simultâneo) e passa à próxima fase. */
  OPERACOES.aplicarFase = function (e, fichas, o, papel, rolar, s, ctx) {
    var c = e.combate;
    if (!c.ativo) return { ok: false, motivo: "Não há combate." };
    var fase = faseAtual(e);
    if (!fase) return { ok: false, motivo: "Todas as fases desta rodada já passaram: avance a rodada." };
    var daFase = c.declaracoes.filter(function (d) { return d.fase === fase && d.rodada === c.rodada; });
    if (c.etapa === "declarar") {
      /* Elegibilidade no início da fase: quem caiu antes não age. */
      daFase.forEach(function (d) {
        var pa = participante(e, d.ator);
        var b = blocoDoAtor(e, fichas, pa);
        if (!pa || foraDeCombate(b)) { d.estado = "perdida"; ev(s, (pa ? pa.nome : "?") + " caiu antes da " + K().FASES[fase].nome + ": não age."); return; }
        if (d.estado === "declarada") rolarDeclaracao(e, fichas, d, papel, rolar, s, ctx);
      });
      c.etapa = "rolada";
      ev(s, K().FASES[fase].nome + ": dados rolados. Escolhas pós-rolagem e Prontidão antes de aplicar.");
      log(e, "Rodada " + c.rodada + " · " + K().FASES[fase].nome + ": rolagens.");
      return;
    }
    /* Testes de PC ainda aguardando: valem como estão. */
    daFase.forEach(function (d) {
      if (!d.teste) return;
      var t = e.testes.filter(function (x) { return x.id === d.teste; })[0];
      if (t && t.estado === "aguardando") { finalizar(e, fichas, t, { mestre: true, pode: [t.quem] }, rolar, s, ctx); d.resultado = t.resultado; }
    });
    var danos = resolverFase(e, fichas, daFase, fase, rolar, s);
    /* Simultâneo: o dano de todos entra depois de todos resolvidos. */
    danos.forEach(function (x) {
      var pa = participante(e, x.alvo);
      var b = blocoDoAtor(e, fichas, pa);
      if (!b) return;
      var escolha = obj(o.armadura)[pa.id];
      var arm = R().armaduraAtual(b) > 0 && (escolha === true || (escolha !== false && pa.armaduraAuto));
      var evd = M().aplicarDano(b, { valor: x.valor, tipo: "fisico", naoLetal: x.naoLetal, externo: true, armadura: arm });
      evd.forEach(function (y) { ev(s, pa.nome + ": " + y.texto, pa.oculto); });
      log(e, pa.nome + ": " + evd.map(function (y) { return y.texto; }).join(" "), pa.oculto);
      if (x.vespa && b.recursos.pv.atual > 0) {
        /* "Perde a próxima ação": a declarada mais adiante nesta rodada,
           ou a da rodada seguinte. */
        var adiante = c.declaracoes.filter(function (dd) { return dd.ator === pa.id && dd.rodada === c.rodada && dd.estado === "declarada" && c.ordemFases.indexOf(dd.fase) > c.fase; })[0];
        if (adiante) adiante.estado = "perdida"; else b.estado.perdeAcao = 2;
        ev(s, pa.nome + " perde a próxima ação espantando as vespas.", pa.oculto);
      }
      if (pa.tipo === "npc" && b.recursos.pv.atual <= 0) { b.estado.pendentes = []; b.estado.inconsciente = true; ev(s, pa.nome + " está fora de combate.", pa.oculto); }
    });
    daFase.forEach(function (d) { if (d.estado === "rolada") d.estado = "aplicada"; });
    c.fase++;
    c.etapa = "declarar";
    ev(s, K().FASES[fase].nome + " aplicada." + (c.fase >= c.ordemFases.length ? " Fim das fases desta rodada." : ""));
  };

  function resolverFase(e, fichas, daFase, fase, rolar, s) {
    var c = e.combate;
    var danos = [];
    var ataques = daFase.filter(function (d) { return d.resultado && (d.acao === "agredirCorpo" || d.acao === "agredirDistancia" || K().ACOES_COMBATE[d.acao].manobra) && d.estado !== "perdida"; });
    var defesas = c.declaracoes.filter(function (d) { return d.acao === "defender" && d.rodada === c.rodada && d.resultado; });
    var tratados = {};
    ataques.forEach(function (d) {
      if (tratados[d.id]) return;
      var at = participante(e, d.ator), alvo = participante(e, d.alvo);
      if (!at || !alvo) return;
      var bAt = blocoDoAtor(e, fichas, at), bAl = blocoDoAtor(e, fichas, alvo);
      var dt = d.montagem ? d.montagem.dt : (testeDe(e, d) ? testeDe(e, d).montagem.dt : 7);
      var arma = armaDe(e, at, bAt, d);
      if (d.fase === "corpo") { (c.corpoNaRodada[at.id] = c.corpoNaRodada[at.id] || []).push(alvo.id); (c.corpoNaRodada[alvo.id] = c.corpoNaRodada[alvo.id] || []).push(at.id); }
      (c.atacaramNaCena[alvo.id] = c.atacaramNaCena[alvo.id] || []).push(at.id);
      /* Desvio ao atirar em corpo a corpo (ímpar: o ataque vai para quem
         o alvo enfrentou na rodada anterior). */
      if (d.desvio) {
        var dd = rolar(6);
        if (dd % 2 === 1) { var outros = lista(c.corpoAnterior[alvo.id]); if (outros.length) { var novo = participante(e, outros[(rolar(outros.length) - 1) % outros.length]); if (novo) { ev(s, d.nome + ": d6 = " + dd + " (ímpar) — o disparo vai para " + novo.nome + "."); alvo = novo; bAl = blocoDoAtor(e, fichas, novo); } } }
      }
      /* Ataque mútuo corpo a corpo: teste oposto. */
      var mutuo = d.fase === "corpo" ? ataques.filter(function (x) { return x.ator === alvo.id && x.alvo === at.id && x.fase === "corpo" && !tratados[x.id]; })[0] : null;
      if (mutuo) {
        tratados[mutuo.id] = true;
        var dtB = mutuo.montagem ? mutuo.montagem.dt : (testeDe(e, mutuo) ? testeDe(e, mutuo).montagem.dt : 7);
        var r = M().ataqueMutuo(d.resultado, mutuo.resultado, dt, dtB);
        ev(s, "Ataque mútuo: " + at.nome + " " + d.resultado.total + " × " + alvo.nome + " " + mutuo.resultado.total + (r.vencedor === "empate" ? " — empate" : " — vence " + (r.vencedor === "a" ? at.nome : alvo.nome)) + ".");
        if (r.acertaA) danos = danos.concat(golpe(e, fichas, d, at, bAt, alvo, bAl, arma, d.resultado, s, mutuo.resultado));
        if (r.acertaB) danos = danos.concat(golpe(e, fichas, mutuo, alvo, bAl, at, bAt, armaDe(e, alvo, bAl, mutuo), mutuo.resultado, s, d.resultado));
        if (!r.acertaA && !r.acertaB) ev(s, "Ninguém atinge a DT: os dois erram.");
        tratados[d.id] = true;
        return;
      }
      tratados[d.id] = true;
      /* Defender-se contra este ataque. */
      var def = defesas.filter(function (x) { return x.ator === alvo.id && (!x.alvo || x.alvo === at.id); })[0];
      if (def) {
        var v = M().opor(def.resultado, d.resultado);
        ev(s, alvo.nome + " se defende (" + def.resultado.total + " × " + d.resultado.total + ")" + (v === "a" ? ": evita o ataque." : ": não evita."));
        if (v === "a") return;
      }
      /* Esquiva (Rowan): uma vez por rodada, ação livre automática. */
      var hesq = bAl ? R().habilidadesDoTipo(bAl, "esquiva")[0] : null;
      if (hesq && alvo.esquivaAuto && bAl.estado.usos["rodada:" + hesq.id] !== c.rodada) {
        bAl.estado.usos["rodada:" + hesq.id] = c.rodada;
        var me = M().montar(bAl, { pericia: "acrobacia", tipo: "oposto", dt: null, rotulo: hesq.nome }, {});
        if (me.ok) {
          var re = M().resolver(me.montagem, M().rolar(me.montagem, rolar), {});
          registrarRolagem(e, alvo.id, alvo.nome, me.montagem, re, s);
          var ve = M().opor(re, d.resultado);
          ev(s, alvo.nome + " · " + hesq.nome + ": " + descreverResultado(re) + (ve === "a" ? " — evita o ataque." : " — não evita."));
          if (ve === "a") return;
        }
      }
      var alcanca = d.resultado.critico || (!d.resultado.falhaCritica && d.resultado.total >= dt);
      if (!alcanca) { ev(s, at.nome + " erra " + alvo.nome + " (" + d.resultado.total + " vs DT " + dt + ")."); return; }
      if (K().ACOES_COMBATE[d.acao].manobra) {
        var mo = M().montar(bAl, { pericia: "acrobacia", tipo: "oposto", dt: null, rotulo: "Resistir a " + K().ACOES_COMBATE[d.acao].nome }, {});
        var rm = mo.ok ? M().resolver(mo.montagem, M().rolar(mo.montagem, rolar), {}) : { total: 0, critico: false, falhaCritica: true };
        var vm = M().opor(d.resultado, rm);
        ev(s, at.nome + " tenta " + K().ACOES_COMBATE[d.acao].nome + " em " + alvo.nome + " (" + d.resultado.total + " × " + rm.total + "): " + (vm === "a" ? "consegue." : "não consegue."));
        if (vm !== "a") return;
        var margem = d.resultado.total - rm.total;
        if (d.acao === "derrubar") { bAl.estado.caido = true; if (margem >= 5) danos.push({ alvo: alvo.id, valor: d.resultado.rb, naoLetal: false }); }
        if (d.acao === "empurrar" && margem >= 5) bAl.efeitos.push({ id: id(), tipo: "passoTodos", alvo: "", n: -1, faces: 0, expira: "teste", fonte: "Empurrado", d20: false });
        if (d.acao === "agarrar") bAl.efeitos.push({ id: id(), tipo: "passoTodos", alvo: "", n: -1, faces: 0, expira: "cena", fonte: "Agarrado (solte com teste de manobra)", d20: false });
        if (d.acao === "quebrar") ev(s, "O item de " + alvo.nome + " sofre " + M().dano(d.resultado, arma, [], true).valor + " de dano.");
        return;
      }
      danos = danos.concat(golpe(e, fichas, d, at, bAt, alvo, bAl, arma, d.resultado, s, null));
    });
    /* Gerais: atrapalhar, fintar, mirar. */
    daFase.filter(function (d) { return d.resultado && (d.acao === "atrapalhar" || d.acao === "fintar"); }).forEach(function (d) {
      var alvo = participante(e, d.alvo), bAl = blocoDoAtor(e, fichas, alvo);
      if (!alvo || !bAl) return;
      var mo = M().montar(bAl, { pericia: d.acao === "atrapalhar" ? "percepcao" : "intuicao", tipo: "oposto", dt: null, rotulo: d.acao === "atrapalhar" ? "Percepção (resistir)" : "Intuição (resistir)" }, {});
      var rr = mo.ok ? M().resolver(mo.montagem, M().rolar(mo.montagem, rolar), {}) : { total: 0, critico: false, falhaCritica: true };
      var v = M().opor(d.resultado, rr);
      if (v !== "a") { ev(s, d.nome + " não consegue " + (d.acao === "atrapalhar" ? "atrapalhar" : "fintar") + " " + alvo.nome + "."); return; }
      if (d.acao === "atrapalhar") { bAl.efeitos.push({ id: id(), tipo: "passoTodos", alvo: "", n: -1, faces: 0, expira: "rodada", fonte: "Atrapalhado por " + d.nome, d20: false }); ev(s, alvo.nome + " foi atrapalhado: −1 passo em todos os testes até o fim da rodada."); }
      else { c.fintas.push({ a: d.ator, b: d.alvo, de: c.rodada, ate: c.rodada + 1 }); ev(s, d.nome + " finta " + alvo.nome + ": +2 passos no próximo ataque contra ele (até o fim da próxima rodada)."); }
    });
    daFase.filter(function (d) { return d.acao === "mirar" && d.alvo; }).forEach(function (d) { c.miras.push({ a: d.ator, b: d.alvo, de: c.rodada, ate: c.rodada + 1 }); ev(s, d.nome + " mira: +d6 no ataque à distância na próxima rodada."); });
    return danos;
  }
  function testeDe(e, d) { return d.teste ? e.testes.filter(function (x) { return x.id === d.teste; })[0] : null; }
  function armaDe(e, pa, b, d) {
    if (!pa || !b) return null;
    if (pa.tipo === "pc") return lista(b.itens).filter(function (i) { return i.id === d.arma; })[0] || null;
    return lista(pa.ataques).filter(function (i) { return i.id === d.arma; })[0] || lista(pa.ataques).filter(function (i) { return i.alcance === (d.fase === "distancia" ? "distancia" : "corpo"); })[0] || null;
  }
  /* O dano de um acerto: RA + arma (duas maiores no crítico Beta);
     Para Bellum; o escudo de Sorcha no oposto perdido. */
  function golpe(e, fichas, d, at, bAt, alvo, bAl, arma, res, s, resDoAlvo) {
    var extras = [];
    if (arma && arma.categoria) R().habilidadesDoTipo(bAt, "danoPorCategoria").forEach(function (h) { var m = R().motorDe(h); if (m.categoria === arma.categoria) extras.push({ valor: m.valor, fonte: h.nome }); });
    var dn = M().dano(res, d.vespa ? { dano: 1 } : arma, extras, true);
    var valor = dn.valor;
    if (resDoAlvo && bAl && lista(bAl.itens).some(function (i) { return i.efeitos.indexOf("escudo") >= 0; }) && resDoAlvo.total >= 7) {
      valor = Math.max(0, valor - resDoAlvo.rb);
      ev(s, alvo.nome + " · Escudo: −" + resDoAlvo.rb + " (rolagem baixa) no dano.");
    }
    ev(s, at.nome + " acerta " + alvo.nome + ": " + (res.critico ? "duas maiores " + dn.base : "RA " + dn.base) + (dn.arma ? " + " + dn.arma : "") + (extras.length ? " + " + extras.map(function (x) { return x.valor + " " + x.fonte; }).join(" + ") : "") + " = " + valor + " de dano.");
    return [{ alvo: alvo.id, valor: valor, naoLetal: !!d.naoLetal, vespa: !!d.vespa }];
  }

  OPERACOES.proximaRodada = function (e, fichas, o, p, rolar, s) {
    var c = e.combate;
    if (!c.ativo) return { ok: false, motivo: "Não há combate." };
    var rodada = c.rodada;
    c.participantes.forEach(function (pa) {
      var b = blocoDoAtor(e, fichas, pa);
      if (!b) return;
      M().fimDeRodada(b, rodada).forEach(function (x) { ev(s, pa.nome + ": " + x.texto, pa.oculto); log(e, pa.nome + ": " + x.texto, pa.oculto); });
    });
    c.corpoAnterior = c.corpoNaRodada; c.corpoNaRodada = {};
    c.rodada = rodada + 1; c.fase = 0; c.etapa = "declarar"; c.agiu = {};
    c.miras = c.miras.filter(function (x) { return x.ate >= c.rodada; });
    c.fintas = c.fintas.filter(function (x) { return x.ate >= c.rodada; });
    c.declaracoes = c.declaracoes.filter(function (d) { return d.rodada >= rodada; }).slice(-40);
    log(e, "Rodada " + c.rodada + ".");
    ev(s, "Rodada " + c.rodada + ".");
  };
  /* As escolhas de quem joga sobre o próprio participante. */
  OPERACOES.configurarParticipante = function (e, fichas, o, papel, rolar, s) {
    var pa = participante(e, o.ator) || (o.quem ? participanteDoPersonagem(e, String(o.quem)) : null);
    if (!pa) return { ok: false, motivo: "Participante não encontrado." };
    if (pa.tipo === "npc" ? !papel.mestre : !podeAgir(papel, pa.personagemId)) return { ok: false, motivo: "Sem permissão." };
    if (o.esquivaAuto !== undefined) pa.esquivaAuto = o.esquivaAuto === true;
    if (o.armaduraAuto !== undefined) pa.armaduraAuto = o.armaduraAuto === true;
    if (papel.mestre && o.oculto !== undefined) pa.oculto = o.oculto === true;
    ev(s, pa.nome + ": preferências de combate salvas.");
  };
  OPERACOES.encerrarCombate = function (e, fichas, o, p, rolar, s) {
    e.combate.ativo = false;
    log(e, "Fim do combate.");
    ev(s, "Fim do combate (os efeitos de cena seguem até a próxima cena).");
  };

  /* ---------------------------------------------------------------
     COMBATE · ALPHA SIMPLIFICADO (p. 26)
     --------------------------------------------------------------- */
  OPERACOES.conflitoAlpha = function (e, fichas, o, papel, rolar, s, ctx) {
    var at = participante(e, o.atacante), df = participante(e, o.defensor);
    if (!at || !df) return { ok: false, motivo: "Escolha atacante e defensor." };
    var bA = blocoDoAtor(e, fichas, at), bD = blocoDoAtor(e, fichas, df);
    var defesa = o.defesa === "esquivar" ? "esquivar" : o.defesa === "nenhuma" ? "nenhuma" : "lutar";
    var mA = M().montar(bA, { pericia: "luta", tipo: "oposto", dt: defesa === "nenhuma" ? 7 : null, rotulo: "Luta (conflito)" }, {});
    if (!mA.ok) return mA;
    var rA = M().resolver(mA.montagem, M().rolar(mA.montagem, rolar), {});
    registrarRolagem(e, at.id, at.nome, mA.montagem, rA, s);
    var danos = [];
    if (defesa === "nenhuma") {
      /* Múltiplos agressores: o outro testa Luta contra DT 7. */
      ev(s, at.nome + " ataca " + df.nome + " (agressor extra): " + descreverResultado(rA));
      if (rA.sucesso) danos.push({ b: bD, nome: df.nome, valor: o.armadoAtacante ? rA.ra : rA.rb });
    } else {
      var mD = M().montar(bD, { pericia: defesa === "esquivar" ? "acrobacia" : "luta", tipo: "oposto", dt: null, rotulo: defesa === "esquivar" ? "Esquiva (+d6)" : "Luta (conflito)", bonus: defesa === "esquivar" ? [{ faces: 6, fonte: "Esquiva (+d6)" }] : [] }, {});
      if (!mD.ok) return mD;
      var rD = M().resolver(mD.montagem, M().rolar(mD.montagem, rolar), {});
      registrarRolagem(e, df.id, df.nome, mD.montagem, rD, s);
      var v = M().opor(rA, rD);
      ev(s, at.nome + " " + rA.total + " × " + df.nome + " " + rD.total + (defesa === "esquivar" ? " (esquiva)" : "") + ": " + (v === "empate" ? "empate" : "vence " + (v === "a" ? at.nome : df.nome)) + ".");
      if (v === "a") danos.push({ b: bD, nome: df.nome, valor: o.armadoAtacante ? rA.ra : rA.rb });
      if (v === "b" && defesa === "lutar") danos.push({ b: bA, nome: at.nome, valor: o.armadoDefensor ? rD.ra : rD.rb });
    }
    danos.forEach(function (x) {
      M().aplicarDano(x.b, { valor: x.valor, tipo: "fisico", externo: true }).forEach(function (y) { ev(s, x.nome + ": " + y.texto); log(e, x.nome + ": " + y.texto); });
    });
  };

  /* ---------------------------------------------------------------
     A VISTA DO JOGADOR — sem soluções nem notas privadas
     --------------------------------------------------------------- */
  function vista(e, papel) {
    var v = copiar(e);
    var meus = lista(papel.pode);
    v.privado = [];
    v.investigacao.pontos = e.investigacao.pontos.filter(function (p) { return p.revelado; }).map(function (p) {
      return { id: p.id, nome: p.nome, descricao: p.descricao, revelado: true, pericias: periciasDoPonto(p) };
    });
    var desc = {};
    meus.forEach(function (pid) { if (e.investigacao.descobertas[pid]) desc[pid] = e.investigacao.descobertas[pid]; });
    v.investigacao.descobertas = desc;
    v.investigacao.solicitacoes = e.investigacao.solicitacoes.filter(function (x) { return meus.indexOf(x.quem) >= 0 || meus.indexOf(x.aliado) >= 0; });
    v.pedidos = e.pedidos.map(function (p) { var q = copiar(p); if (q.oculto) q.dt = null; return q; });
    v.combate.participantes = e.combate.participantes.filter(function (p) { return !p.oculto; }).map(function (p) {
      if (p.tipo === "pc") return copiar(p);
      var b = p.bloco;
      var fora = foraDeCombate(b);
      return { id: p.id, tipo: "npc", nome: p.nome, oculto: false, situacao: fora ? "fora de combate" : b.estado.caido ? "caído" : b.recursos.pv.atual <= b.recursos.pv.max / 2 ? "ferido" : "de pé" };
    });
    var ocultos = e.combate.participantes.filter(function (p) { return p.oculto; }).map(function (p) { return p.id; });
    v.combate.declaracoes = e.combate.declaracoes.filter(function (d) { return ocultos.indexOf(d.ator) < 0; }).map(function (d) { var q = copiar(d); delete q.montagem; return q; });
    v.rolagens = e.rolagens.filter(function (r) { return ocultos.indexOf(r.quem) < 0; });
    return v;
  }

  /* Um estado local (ficha sem campanha), com o próprio perfil. */
  function local(perfil) { return estadoVazio(perfil); }

  global.RAMAOrdem2Mesa = {
    VERSAO: VERSAO,
    OPS_DO_MESTRE: OPS_DO_MESTRE, OPS_DO_PERSONAGEM: OPS_DO_PERSONAGEM, OPS_COM_REV: OPS_COM_REV,
    estadoVazio: estadoVazio, normalizar: normalizar, local: local,
    aplicar: aplicar, fichasDaOperacao: fichasDaOperacao, vista: vista, opcoesPos: opcoesPos,
    participante: participante, participanteDoPersonagem: participanteDoPersonagem, blocoDoAtor: blocoDoAtor,
    faseAtual: faseAtual, podeDeclarar: podeDeclarar, periciasDoPonto: periciasDoPonto, descreverResultado: descreverResultado,
    passosDeAjuda: passosDeAjuda,
  };
})(typeof window !== "undefined" ? window : globalThis);
