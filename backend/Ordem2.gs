/* =====================================================================
   R.A.M.A. — Ordem Paranormal RPG II (Experimental) no servidor (v9.0)
   =====================================================================
   O módulo `ordem2` — um sistema À PARTE de `ordem` (1ª edição): nada
   daqui lê ou grava o bloco `ordem`, as campanhas de Ordem I, os
   suplementos ou o importador do CRIS.

     ler_ordem2     membro: o Mestre recebe a mesa inteira; o jogador, a
                    VISTA (sem nota privada, contexto, DT nem pistas não
                    descobertas; NPCs ocultos fora; NPCs só com a
                    situação). Com os personagens de Ordem II da campanha
                    e quais a conta conduz.
     ordem2_operar  TODA ação: uma operação com opId, validada pelo motor
                    (o MESMO do navegador, copiado abaixo) com o papel de
                    quem pede. Os dados são ROLADOS AQUI e entram no
                    histórico da campanha. PV, PD, marcadores, lesões e
                    usos moram na FICHA: a operação leva o opId para
                    dentro do bloco (operacoes) de cada ficha que muda.
                    A segunda chegada do mesmo opId devolve o estado sem
                    aplicar de novo; configurações levam `rev`.

   As ferramentas só respondem numa campanha de Ordem II (exigirFerramenta
   'mesaOrdem2'); trocar o sistema guarda a mesa (CAMPANHA_ORDEM2).

   v9.1 — PACOTES DE MISSÃO: o conteúdo do Mestre (pontos, pistas,
   senhas, soluções, roteiros) mora num arquivo SÓ do Apps Script,
   backend/Ordem2Pacotes.local.gs (ignorado pelo git, nunca no site
   público), que define PACOTES_ORDEM2. A cena carregada é HIDRATADA a
   cada leitura/operação (RAMAOrdem2Proc.hidratar) e só o estado
   dinâmico e o que o Mestre editou vão para a planilha. Sem o arquivo,
   a mesa funciona com os pontos próprios do Mestre. Anexos ligados a um
   documento da campanha: quem recebeu a pista passa a ver o documento
   (visiveisJson só cresce; o Mestre tira à mão).
   ===================================================================== */

function sistemaOrdem2() {
  return {
    id: 'ordem2',
    rotas: rotasDeOrdem2,
    fichaDoSistema: function (ficha) { return !!ficha && !!ficha.ordem2 && typeof ficha.ordem2 === 'object'; },
    projecao: function (ficha) {
      try { return { ordem2: RAMAOrdem2.resumoParaMesa(ficha.ordem2) }; }
      catch (erro) { return {}; }
    },
    projecaoDoSistema: function (proj) { return !!proj && !!proj.ordem2 && typeof proj.ordem2 === 'object'; },
    painel: function (proj, o) {
      var x = proj.ordem2;
      if (o.recursosVisiveis) return { ordem2: x };
      return { ordem2: { perfilRegras: x.perfilRegras, perfil: x.perfil, perfilNome: x.perfilNome, ocupacao: x.ocupacao, nivel: x.nivel } };
    },
    estadoDasMecanicas: { mesaOrdem2: ordem2TemMesa },
  };
}

/* v9.3: a evolução de uma ficha numa campanha de Ordem II é do servidor.
   Uma gravação comum (aba antiga, edição atrasada ou um navegador que
   mande outro nível) não muda o nível, os registros de evolução nem as
   habilidades ganhas por eles: ficam os gravados, que só mudam pelas
   operações da mesa (subirNivel, escolherMelhoria, definirNivel…).
   Ficha sem campanha (ou de campanha de outro sistema) segue livre: a
   própria ficha é a mesa local. */
function preservarEvolucaoDeOrdem2(ficha, registro, anterior) {
  if (!ficha || !ficha.ordem2 || typeof ficha.ordem2 !== 'object') return;
  if (!registro || !registro.campanhaId) return;
  var camp = acharPor(ABAS.CAMPANHAS, 'id', String(registro.campanhaId));
  if (!camp || sistemaDaCampanha(camp).id !== 'ordem2') return;
  if (!anterior || !anterior.ok || !anterior.ficha || !anterior.ficha.ordem2) return;
  var antes = anterior.ficha.ordem2, novo = ficha.ordem2;
  novo.nivel = antes.nivel;
  novo.evolucao = antes.evolucao === undefined ? null : JSON.parse(JSON.stringify(antes.evolucao));
  var ganhas = (Array.isArray(antes.habilidades) ? antes.habilidades : []).filter(function (h) { return h && h.origemEvolucao; });
  novo.habilidades = (Array.isArray(novo.habilidades) ? novo.habilidades : []).filter(function (h) { return !(h && h.origemEvolucao); }).concat(JSON.parse(JSON.stringify(ganhas)));
}

function rotasDeOrdem2() {
  return {
    ler_ordem2: { publica: false, fn: acaoLerOrdem2 },
    ordem2_operar: { publica: false, fn: acaoOrdem2Operar },
  };
}

var MAX_OPS_ORDEM2 = 160;

/* O pacote local, se existir neste projeto do Apps Script. */
function pacotesDeOrdem2() {
  try { return typeof PACOTES_ORDEM2 !== 'undefined' && PACOTES_ORDEM2 ? PACOTES_ORDEM2 : {}; }
  catch (erro) { return {}; }
}
/* A lista que o Mestre vê para escolher (nomes, sem conteúdo). */
function listaDePacotesDeOrdem2() {
  var p = pacotesDeOrdem2();
  return Object.keys(p).map(function (id) {
    var x = p[id] || {};
    return { id: id, nome: String(x.nome || id).slice(0, 160), versao: Number(x.versao) || 0, perfil: String(x.perfil || ''), cenas: (x.cenas || []).map(function (c) { return { id: c.id, nome: String(c.nome || c.id).slice(0, 160), tipo: c.tipo || '', perfil: c.perfil || '' }; }) };
  });
}

function roladorDeOrdem2(faces) {
  var f = Math.max(1, Math.floor(Number(faces) || 1));
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid());
  var n = 0;
  for (var i = 0; i < 4; i++) n = n * 256 + ((bytes[i] + 256) % 256);
  return (n % f) + 1;
}

function ordem2TemMesa(campanhaId) {
  try { return lerLeves(ABAS.CAMPANHA_ORDEM2).some(function (r) { return String(r.campanhaId) === String(campanhaId); }); }
  catch (erro) { return false; }
}
function registroDaMesaOrdem2(campanhaId) {
  try { return acharPor(ABAS.CAMPANHA_ORDEM2, 'campanhaId', String(campanhaId)); }
  catch (erro) { return null; }
}
function instalacaoDaMesaOrdem2() {
  try { aba(ABAS.CAMPANHA_ORDEM2); return null; }
  catch (erro) { return { ok: false, erro: 'instalacao_incompleta', detalhe: 'CAMPANHA_ORDEM2' }; }
}
function estadoDaMesaOrdem2(registro) {
  var e = RAMAOrdem2Mesa.normalizar(registro ? lerJson(registro.dadosJson, {}) : {});
  return RAMAOrdem2Proc.hidratar(e, pacotesDeOrdem2());
}

/* Os personagens de Ordem II da campanha: id, nome, dono e o resumo. */
function personagensDeOrdem2(campanhaId) {
  var regs = daCampanhaLeves(ABAS.PERSONAGENS, campanhaId);
  if (!regs.length) return [];
  var textos = lerCelulas(ABAS.PERSONAGENS, regs, 'resumo');
  return regs.map(function (r) { return { r: r, p: projecaoGuardada(textos[r._linha]) }; })
    .filter(function (x) { return !!x.p && x.p.tipo === 'ordem2'; })
    .map(function (x) { return { id: String(x.r.id), nome: String(x.r.nome || '').slice(0, 120), ownerId: String(x.r.ownerId || ''), resumo: x.p.ordem2 || null }; });
}

function papelNaMesaOrdem2(ctx, usuario, personagens) {
  var pode = personagens.filter(function (p) { return p.ownerId === String(usuario.id); }).map(function (p) { return p.id; });
  return { mestre: !!ctx.mestre, pode: pode };
}

function mesaOrdem2ParaCliente(ctx, registro, estado, papel, personagens, usuario) {
  var rev = registro ? Number(registro.rev) || 0 : 0;
  var lista = personagens.map(function (p) { return { id: p.id, nome: p.nome, meu: p.ownerId === String(usuario.id), resumo: p.resumo }; });
  if (ctx.mestre) return { mestre: true, rev: rev, estado: estado, cena: RAMAOrdem2Proc.cenaParaMestre(estado), pacotes: listaDePacotesDeOrdem2(), personagens: lista, pode: papel.pode };
  return { mestre: false, rev: rev, vista: RAMAOrdem2Mesa.vista(estado, papel), personagens: lista, pode: papel.pode };
}

function acaoLerOrdem2(corpo, usuario) {
  var ctx = contextoDaCampanha(corpo.campanhaId, usuario);
  if (!ctx.ok) return ctx;
  var foraDoSistema = exigirFerramenta(ctx, 'mesaOrdem2');
  if (foraDoSistema) return foraDoSistema;
  if (ctx.papel === PAPEL_ESPECTADOR) return { ok: false, erro: 'sem_permissao' };
  var personagens = personagensDeOrdem2(ctx.campanha.id);
  var registro = registroDaMesaOrdem2(ctx.campanha.id);
  var estado = estadoDaMesaOrdem2(registro);
  var papel = papelNaMesaOrdem2(ctx, usuario, personagens);
  var dados = mesaOrdem2ParaCliente(ctx, registro, estado, papel, personagens, usuario);
  return { ok: true, rev: dados.rev, dados: dados };
}

function gravarMesaOrdem2(ctx, registro, estado, revAtual, feitas) {
  estado = RAMAOrdem2Proc.desidratar(estado);
  var json = JSON.stringify(estado);
  var voltas = 0;
  /* O registro, os testes antigos e as rolagens cedem primeiro. */
  while (json.length > MAX_CELULA && voltas < 20) {
    voltas++;
    estado.registro = estado.registro.slice(Math.ceil(estado.registro.length / 4) || 1);
    estado.privado = estado.privado.slice(Math.ceil(estado.privado.length / 4) || 1);
    estado.rolagens = estado.rolagens.slice(Math.ceil(estado.rolagens.length / 4) || 1);
    estado.testes = estado.testes.filter(function (t, i) { return t.estado === 'aguardando' || i > estado.testes.length / 2; });
    json = JSON.stringify(estado);
  }
  if (json.length > MAX_CELULA) return { ok: false, erro: 'dados_grandes' };
  var novo = { campanhaId: String(ctx.campanha.id), atualizadoEm: new Date().toISOString(), rev: revAtual + 1, opsJson: JSON.stringify(feitas.slice(-MAX_OPS_ORDEM2)), dadosJson: json };
  if (registro) atualizarLinha(ABAS.CAMPANHA_ORDEM2, registro._linha, Object.assign({}, registro, novo));
  else inserir(ABAS.CAMPANHA_ORDEM2, novo);
  marcarMesa(ctx.campanha.id, ['ordem2']);
  return { ok: true, rev: revAtual + 1 };
}

/* As fichas de Ordem II que a operação toca, lidas e normalizadas —
   todas desta campanha. */
function fichasDeOrdem2(campanhaId, ids) {
  var saida = {};
  for (var i = 0; i < ids.length; i++) {
    if (saida[ids[i]]) continue;
    var reg = acharPor(ABAS.PERSONAGENS, 'id', String(ids[i]));
    if (!reg || String(reg.campanhaId || '') !== String(campanhaId)) continue;
    var lido = lerFichaDoPersonagem(reg);
    if (!lido.ok) continue;
    var ficha = comVinculoDaColuna(lido.ficha, reg);
    if (String(ficha.tipoFicha || '') !== 'ordem2') continue;
    ficha.ordem2 = RAMAOrdem2.normalizar(ficha.ordem2);
    saida[ids[i]] = { registro: reg, ficha: ficha, antes: JSON.stringify(ficha.ordem2) };
  }
  return saida;
}

/* Grava as fichas que mudaram; o opId em cada uma faz a repetição não
   aplicar de novo. */
function gravarFichasDeOrdem2(carregadas, mapa, opId, campanhaId) {
  var quando = new Date().toISOString();
  var gravadas = 0, ids = Object.keys(carregadas);
  for (var i = 0; i < ids.length; i++) {
    var f = carregadas[ids[i]];
    f.ficha.ordem2 = mapa[ids[i]].bloco;
    if (JSON.stringify(f.ficha.ordem2) === f.antes) continue;
    if (f.ficha.ordem2.operacoes.indexOf(opId) < 0) f.ficha.ordem2.operacoes.push(opId);
    f.ficha.ordem2.operacoes = f.ficha.ordem2.operacoes.slice(-120);
    try { f.ficha.resumoOrdem2 = RAMAOrdem2.resumoParaMesa(f.ficha.ordem2); } catch (erro) { /* o painel recalcula */ }
    f.ficha.atualizadoEm = quando;
    f.registro.atualizadoEm = quando;
    f.registro.rev = (Number(f.registro.rev) || 0) + 1;
    var publicado = publicarFicha(f.registro, f.ficha, { operacao: opId });
    if (!publicado.ok) return Object.assign({ parcial: gravadas > 0 }, publicado);
    gravadas++;
  }
  if (gravadas) marcarMesa(campanhaId, ['personagens']);
  return { ok: true, gravadas: gravadas };
}

/* Rolagens feitas AQUI entram no histórico da campanha, com id derivado
   do opId: repetir a operação não cria outra linha. As do Mestre seguem
   "rolagens do mestre ocultas"; as de NPC oculto ficam ocultas. */
function registrarRolagensDeOrdem2(ctx, usuario, rolagens, opId, estado) {
  if (!rolagens || !rolagens.length) return;
  try {
    var config = lerJson(ctx.campanha.dadosJson, {});
    var ocultos = estado.combate.participantes.filter(function (p) { return p.oculto; }).map(function (p) { return p.id; });
    rolagens.forEach(function (r, i) {
      var id = ('o2-' + opId + '-' + i).slice(0, 80);
      if (acharPor(ABAS.CAMPANHA_ROLAGENS, 'id', id)) return;
      var ehNpc = String(r.quem || '').indexOf('npc-') === 0;
      var visibilidade = (ocultos.indexOf(r.quem) >= 0 || (ehNpc && ctx.mestre && config.rolagensMestreOcultas)) ? VIS_ROLAGEM_OCULTA : VIS_ROLAGEM_PUBLICA;
      var faces = (r.dados || []).map(function (d) { return d.valor; });
      var resultado = r.critico ? 'crítico' : r.falhaCritica ? 'falha crítica' : r.sucesso === true ? 'sucesso' : r.sucesso === false ? 'falha' : '';
      var parcelas = r.dt !== null && r.dt !== undefined ? [{ rotulo: 'DT', valor: r.dt }] : [];
      var dados = { expressao: (r.dados || []).map(function (d) { return 'd' + d.faces; }).join('+'), rolagens: faces, natural: null, total: r.total, selecao: null, parcelas: parcelas, critico: !!r.critico, servidor: true };
      inserir(ABAS.CAMPANHA_ROLAGENS, {
        id: id, campanhaId: ctx.campanha.id, autorUserId: usuario.id,
        personagemId: ehNpc ? '' : String(r.quem || ''), tipo: 'ordem2',
        nome: (String(r.nome || '') + ' · ' + String(r.rotulo || 'Teste')).slice(0, 120) + (resultado ? ' · ' + resultado : ''),
        visibilidade: visibilidade, criadoEm: new Date().toISOString(), dadosJson: JSON.stringify(dados),
      });
    });
    marcarMesa(ctx.campanha.id, ['rolagens']);
  } catch (erro) { /* o histórico é bônus: a operação já valeu */ }
}

/* Anexo ligado a um documento da campanha: quem tem a pista (ou o grupo
   todo) passa a ver o documento. Só acrescenta — nunca tira quem já via. */
function sincronizarAnexosDeOrdem2(ctx, estado, personagens) {
  try {
    var anexos = estado.proc && estado.proc.anexos ? estado.proc.anexos : {};
    var ids = Object.keys(anexos).filter(function (k) { return anexos[k].documentoId; });
    if (!ids.length) return;
    var donoDe = {};
    personagens.forEach(function (p) { donoDe[p.id] = p.ownerId; });
    var membros = idsDaMesa(ctx.campanha);
    var mudou = false;
    ids.forEach(function (aid) {
      var usuarios = {};
      var doGrupo = (estado.proc.grupo || []).some(function (d) { return d.anexo === aid; });
      Object.keys(estado.investigacao.descobertas || {}).forEach(function (pid) {
        if (doGrupo || (estado.investigacao.descobertas[pid] || []).some(function (d) { return d.anexo === aid; })) if (donoDe[pid]) usuarios[donoDe[pid]] = true;
      });
      if (doGrupo) personagens.forEach(function (p) { usuarios[p.ownerId] = true; });
      var quem = Object.keys(usuarios).filter(function (u) { return membros[u]; });
      if (!quem.length) return;
      var doc = acharPor(ABAS.CAMPANHA_DOCUMENTOS, 'id', String(anexos[aid].documentoId));
      if (!doc || String(doc.campanhaId) !== String(ctx.campanha.id)) return;
      var visiveis = lerJson(doc.visiveisJson, []) || [];
      var novos = quem.filter(function (u) { return visiveis.indexOf(u) < 0; });
      if (!novos.length) return;
      doc.visiveisJson = JSON.stringify(visiveis.concat(novos));
      doc.atualizadoEm = new Date().toISOString();
      doc.rev = (Number(doc.rev) || 0) + 1;
      atualizarLinha(ABAS.CAMPANHA_DOCUMENTOS, doc._linha, doc);
      mudou = true;
    });
    if (mudou) marcarMesa(ctx.campanha.id, ['documentos']);
  } catch (erro) { /* o documento é bônus: a pista já valeu */ }
}

function acaoOrdem2Operar(corpo, usuario) {
  var opId = String(corpo.opId || '');
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(opId)) return { ok: false, erro: 'dados_invalidos' };
  var op = corpo.operacao && typeof corpo.operacao === 'object' && !Array.isArray(corpo.operacao) ? corpo.operacao : null;
  if (!op) return { ok: false, erro: 'dados_invalidos' };
  var tipo = String(op.tipo || '');
  var M = RAMAOrdem2Mesa;
  if (M.OPS_DO_MESTRE.indexOf(tipo) < 0 && M.OPS_DO_PERSONAGEM.indexOf(tipo) < 0) return { ok: false, erro: 'dados_invalidos' };

  return comTrava(function () {
    var ctx = contextoDaCampanha(corpo.campanhaId, usuario);
    if (!ctx.ok) return ctx;
    var foraDoSistema = exigirFerramenta(ctx, 'mesaOrdem2');
    if (foraDoSistema) return foraDoSistema;
    if (ctx.papel === PAPEL_ESPECTADOR) return { ok: false, erro: 'sem_permissao' };
    if (M.OPS_DO_MESTRE.indexOf(tipo) >= 0 && !ctx.mestre) return { ok: false, erro: 'sem_permissao' };
    var inst = instalacaoDaMesaOrdem2(); if (inst) return inst;

    var personagens = personagensDeOrdem2(ctx.campanha.id);
    var registro = registroDaMesaOrdem2(ctx.campanha.id);
    var revAtual = registro ? Number(registro.rev) || 0 : 0;
    var feitas = registro ? (lerJson(registro.opsJson, []) || []) : [];
    if (!Array.isArray(feitas)) feitas = [];
    var estado = estadoDaMesaOrdem2(registro);
    var papel = papelNaMesaOrdem2(ctx, usuario, personagens);

    var ids = M.fichasDaOperacao(estado, op, personagens.map(function (p) { return p.id; }));
    var carregadas = fichasDeOrdem2(ctx.campanha.id, ids);
    var mapa = {};
    Object.keys(carregadas).forEach(function (pid) { mapa[pid] = { nome: String(carregadas[pid].registro.nome || carregadas[pid].ficha.nome || '').slice(0, 120), bloco: carregadas[pid].ficha.ordem2 }; });

    /* Repetição (clique duplo, reconexão, outra aba): nada de novo. */
    var repetida = feitas.indexOf(opId) >= 0 || Object.keys(mapa).some(function (pid) { return mapa[pid].bloco.operacoes.indexOf(opId) >= 0; });
    if (repetida) return { ok: true, repetida: true, rev: revAtual, dados: mesaOrdem2ParaCliente(ctx, registro, estado, papel, personagens, usuario) };
    if (M.OPS_COM_REV.indexOf(tipo) >= 0 && corpo.rev !== undefined && corpo.rev !== null && Number(corpo.rev) !== revAtual) {
      return { ok: false, erro: 'conflito', rev: revAtual, dados: mesaOrdem2ParaCliente(ctx, registro, estado, papel, personagens, usuario) };
    }

    var r = M.aplicar(estado, mapa, op, papel, roladorDeOrdem2, { pacotes: pacotesDeOrdem2() });
    if (!r.ok) return { ok: false, erro: 'dados_invalidos', motivo: r.motivo || '' };

    /* As fichas primeiro (cada uma com o opId), depois a mesa. */
    var gf = gravarFichasDeOrdem2(carregadas, mapa, opId, ctx.campanha.id);
    if (!gf.ok) return gf;
    feitas.push(opId);
    var normalizado = RAMAOrdem2Proc.hidratar(M.normalizar(estado), pacotesDeOrdem2());
    sincronizarAnexosDeOrdem2(ctx, normalizado, personagens);
    var g = gravarMesaOrdem2(ctx, registro, normalizado, revAtual, feitas);
    if (!g.ok) return g;
    registrarRolagensDeOrdem2(ctx, usuario, r.rolagens, opId, estado);

    var registroNovo = registroDaMesaOrdem2(ctx.campanha.id);
    var estadoNovo = estadoDaMesaOrdem2(registroNovo);
    var personagensNovos = personagensDeOrdem2(ctx.campanha.id);
    var eventos = (r.eventos || []).filter(function (e) { return ctx.mestre || !e.privado; }).map(function (e) { return e.texto; });
    return {
      ok: true, rev: g.rev,
      dados: mesaOrdem2ParaCliente(ctx, registroNovo, estadoNovo, papel, personagensNovos, usuario),
      resultado: { eventos: eventos, tocadas: r.tocadas, resultado: r.resultado || {} },
    };
  });
}

/* =====================================================================
   O MOTOR (cópia fiel de js/ordem2/; não edite aqui)
   ===================================================================== */

/* >>> js/ordem2/catalogo.js */
/* =====================================================================
   R.A.M.A. — Ordem Paranormal RPG II (Experimental) · catálogo (v9.0)
   ---------------------------------------------------------------------
   Os dados dos dois playtests, com a fonte de cada um:

     Alpha  "Ordem Paranormal RPG 2 — Playtest Alpha" (pp. 14–26) e as
            fichas do Ato II (ZIP de extras do Alpha)
     Beta   "Ordem 2 — Playtest Beta, Missões 1 e 2" (pp. 2, 6–25) e as
            fichas dos ZIPs de extras do Beta (Missão 1 e Missão 2)

   Nada aqui é texto do livro: são números, nomes e resumos próprios das
   regras, com a página. Onde as fontes divergem, DIVERGENCIAS diz qual
   comportamento o R.A.M.A. adota e qual teste o fixa (docs/ORDEM2.md).

   Ordem II é um sistema À PARTE do `ordem` (Ordem Paranormal, 1ª
   edição): nada de categoria, crédito, PE, SAN ou crítico de Ordem I.

   Copiado para backend/Ordem2.gs (testes/gerar-ordem2-gs.js).
   ===================================================================== */

(function (global) {
  "use strict";

  /* A versão destes DADOS (presets, catálogos). Uma ficha copiada de um
     preset guarda a versão de então; quando os dados mudarem, a ficha
     NÃO é atualizada sozinha — a tela só avisa. */
  var VERSAO_DADOS = 1;

  var FONTES = {
    alpha: { nome: "Playtest Alpha", curto: "Alpha" },
    alphaAto2: { nome: "Playtest Alpha — fichas do Ato II", curto: "Alpha Ato II" },
    beta: { nome: "Playtest Beta — Missões 1 e 2", curto: "Beta" },
    betaFichas: { nome: "Playtest Beta — fichas de personagens", curto: "Beta (fichas)" },
  };
  function referencia(fonte, pagina) {
    var f = FONTES[fonte] || { curto: fonte };
    return f.curto + (pagina ? " p. " + pagina : "");
  }

  /* ---------------------------------------------------------------
     PERFIS DE REGRAS E AMBIENTAÇÃO
     --------------------------------------------------------------- */
  var PERFIS_REGRAS = {
    "alpha-contemporaneo": {
      id: "alpha-contemporaneo", nome: "Alpha · Contemporâneo", curto: "Alpha",
      fonte: "alpha", ambientacao: "contemporaneo", termoOcupacao: "Ocupação",
      combate: "simplificado", /* Alpha p. 26: só o conflito simplificado */
      texto: "Investigação do Playtest Alpha (pp. 14–26), perícias da p. 17, ocupação, e o conflito simplificado da p. 26.",
    },
    "beta-vigilia": {
      id: "beta-vigilia", nome: "Beta · Vigília", curto: "Beta",
      fonte: "beta", ambientacao: "vigilia", termoOcupacao: "Vocação",
      combate: "fases", /* Beta p. 18: três fases */
      texto: "Ação do Playtest Beta (pp. 6–25), perícias da p. 9, vocação, combate em fases, lesões e traumas, pavor e relações.",
    },
  };
  var ORDEM_PERFIS_REGRAS = ["alpha-contemporaneo", "beta-vigilia"];
  var AMBIENTACOES = {
    contemporaneo: { nome: "Contemporâneo (Ordo Realitas)", rotuloOcultismo: "Ocultismo" },
    vigilia: { nome: "Vigília (Idade Média)", rotuloOcultismo: "Bruxaria" },
  };

  /* ---------------------------------------------------------------
     ATRIBUTOS E DEGRAUS (Alpha p. 16; Beta p. 8)
     --------------------------------------------------------------- */
  var ATRIBUTOS = {
    fisico: { nome: "Físico", curto: "FÍS" },
    mente: { nome: "Mente", curto: "MEN" },
    emocao: { nome: "Emoção", curto: "EMO" },
  };
  var ORDEM_ATRIBUTOS = ["fisico", "mente", "emocao"];
  /* d20 só quando um efeito autoriza (Alpha p. 20; Beta p. 12). */
  var DEGRAUS = [4, 6, 8, 10, 12];
  var ESCALA_ATRIBUTO = { 4: "Abaixo da média", 6: "Média humana", 8: "Acima da média", 10: "Muito acima da média", 12: "Ápice humano", 20: "Sobre-humano (paranormal)" };
  var ESCALA_PERICIA = { 4: "Destreinado", 6: "Treinado", 8: "Especialista", 10: "Mestre", 12: "Grão-mestre", 20: "Sobre-humano (paranormal)" };

  /* ---------------------------------------------------------------
     PERÍCIAS — duas listas (Alpha p. 17; Beta p. 9)
     `ocultismo` é UMA chave: o rótulo segue a ambientação (Ocultismo /
     Bruxaria). `metalurgia` aceita "Ofício" como alias. Pesquisar
     (Alpha) e Inspecionar (Beta) são a mesma função em perfis
     diferentes: cada perfil tem a sua, nunca as duas.
     --------------------------------------------------------------- */
  var PERICIAS_ALPHA = [
    ["acrobacia", "Acrobacia", "fisico", "Ginástica, parkour, skate e patins."],
    ["aptidao", "Aptidão", "mente", "Conhecimento em um campo específico (especialização)."],
    ["atletismo", "Atletismo", "fisico", "Correr, saltar, escalar, nadar, remar."],
    ["crime", "Crime", "fisico", "Furtar, abrir fechaduras, falsificar documentos."],
    ["disciplina", "Disciplina", "emocao", "Estudar, meditar, resistir a traumas e sustos."],
    ["enganacao", "Enganação", "emocao", "Mentir, disfarçar-se, seduzir."],
    ["furtividade", "Furtividade", "fisico", "Esconder-se, andar sem ser visto ou ouvido."],
    ["intimidar", "Intimidar", "emocao", "Assustar e coagir pessoas."],
    ["intuicao", "Intuição", "emocao", "\"Sexto sentido\" sobre pessoas e ambientes."],
    ["luta", "Luta", "fisico", "Atacar desarmado ou com armas corpo a corpo."],
    ["maquinas", "Máquinas", "mente", "Operar e consertar máquinas, dirigir veículos."],
    ["medicina", "Medicina", "mente", "Primeiros socorros, tratamentos, necropsias."],
    ["ocultismo", "Ocultismo", "mente", "Conhecimento sobre o paranormal."],
    ["percepcao", "Percepção", "mente", "Notar coisas pelos sentidos, revistar lugares."],
    ["persuasao", "Persuasão", "emocao", "Convencer com argumentos e lábia."],
    ["pesquisar", "Pesquisar", "mente", "Pesquisar documentos e bancos de dados, analisar evidências."],
    ["pontaria", "Pontaria", "fisico", "Atacar com armas de arremesso ou de disparo."],
    ["sobrevivencia", "Sobrevivência", "mente", "Acampar, rastrear, acalmar animais ferozes."],
    ["tecnologia", "Tecnologia", "mente", "Operar dispositivos, hackear redes."],
    ["vigor", "Vigor", "fisico", "Fôlego, venenos, suportar ferimentos."],
  ];
  var PERICIAS_BETA = [
    ["acrobacia", "Acrobacia", "fisico", "Ginástica, parkour, equilíbrio."],
    ["animais", "Animais", "emocao", "Manejar animais, acalmar feras, cavalgar."],
    ["aptidao", "Aptidão", "mente", "Conhecimento em um campo específico (especialização)."],
    ["atletismo", "Atletismo", "fisico", "Correr, saltar, escalar, nadar, remar."],
    ["ocultismo", "Bruxaria", "mente", "Conhecimento sobre o paranormal."],
    ["crime", "Crime", "fisico", "Furtar, abrir fechaduras, falsificar documentos."],
    ["disciplina", "Disciplina", "emocao", "Estudar, meditar, resistir a traumas e sustos."],
    ["enganacao", "Enganação", "emocao", "Mentir, disfarçar-se, seduzir."],
    ["furtividade", "Furtividade", "fisico", "Esconder-se, andar sem ser visto ou ouvido."],
    ["intimidar", "Intimidar", "emocao", "Assustar e coagir pessoas."],
    ["intuicao", "Intuição", "emocao", "\"Sexto sentido\" sobre pessoas e ambientes."],
    ["inspecionar", "Inspecionar", "mente", "Examinar documentos e analisar evidências."],
    ["luta", "Luta", "fisico", "Atacar desarmado ou com armas corpo a corpo."],
    ["medicina", "Medicina", "mente", "Primeiros socorros, tratamentos."],
    ["metalurgia", "Metalurgia", "mente", "Fabricar e consertar itens. Nas fichas: \"Ofício\"."],
    ["percepcao", "Percepção", "mente", "Notar coisas pelos sentidos, revistar lugares."],
    ["persuasao", "Persuasão", "emocao", "Convencer com argumentos e lábia."],
    ["pontaria", "Pontaria", "fisico", "Atacar com armas de arremesso ou de disparo."],
    ["sobrevivencia", "Sobrevivência", "mente", "Acampar, rastrear, acalmar animais ferozes."],
    ["vigor", "Vigor", "fisico", "Fôlego, venenos, suportar ferimentos."],
  ];
  var ESPECIALIZACOES = {
    "alpha-contemporaneo": ["Artes", "Atualidades", "Burocracia", "Exatas", "Humanas", "Tática"],
    "beta-vigilia": ["Artes", "Erudição", "Folclore", "Guerra", "Nobreza", "Religião"],
  };
  /* Rótulos de ficha que apontam para uma chave da lista (Beta: as
     fichas impressas usam "Ofício" para Metalurgia e "Ocultismo" para
     Bruxaria). */
  var ALIASES = { oficio: "metalurgia", "ofício": "metalurgia", bruxaria: "ocultismo" };

  function listaDePericias(perfil) {
    var l = perfil === "beta-vigilia" ? PERICIAS_BETA : PERICIAS_ALPHA;
    return l.map(function (p) { return { chave: p[0], nome: p[1], atributo: p[2], texto: p[3] }; });
  }
  function pericia(perfil, chave) {
    var c = ALIASES[chave] || chave;
    return listaDePericias(perfil).filter(function (p) { return p.chave === c; })[0] || null;
  }
  /* O nome que a tela mostra: Ocultismo/Bruxaria pela ambientação. */
  function nomeDaPericia(perfil, chave, ambientacao) {
    if (chave === "ocultismo") {
      var amb = AMBIENTACOES[ambientacao] || AMBIENTACOES[(PERFIS_REGRAS[perfil] || {}).ambientacao] || AMBIENTACOES.contemporaneo;
      return amb.rotuloOcultismo;
    }
    var p = pericia(perfil, chave);
    if (p) return p.nome;
    var outra = pericia(perfil === "beta-vigilia" ? "alpha-contemporaneo" : "beta-vigilia", chave);
    return outra ? outra.nome : chave;
  }
  /* A perícia de "pesquisa" do perfil (Compartilhar, ver DIVERGENCIAS). */
  function periciaDePesquisa(perfil) { return perfil === "beta-vigilia" ? "inspecionar" : "pesquisar"; }

  /* ---------------------------------------------------------------
     PERFIS (Alpha p. 14; Beta p. 6)
     --------------------------------------------------------------- */
  var PERFIS = {
    executor: { nome: "Executor", texto: "Age primeiro e insiste até conseguir." },
    analista: { nome: "Analista", texto: "Observa, entende e se prepara antes de agir." },
    vigilante: { nome: "Vigilante", texto: "Atento aos arredores; age primeiro e decide sob pressão." },
  };
  var ORDEM_PERFIS = ["executor", "analista", "vigilante"];

  /* A habilidade de perfil que cada perfil de regras DOCUMENTA para uma
     ficha nova. Beta: as fichas prontas trazem o mesmo texto por perfil
     (fato). Alpha: as fichas do Ato II são de nível 6; para Executor o
     R.A.M.A. usa a versão de 3 espaços (Alan, nível 2, e Raven) —
     inferência registrada em DIVERGENCIAS. */
  var HABILIDADE_DE_PERFIL = {
    "alpha-contemporaneo": { executor: "impeto_alpha3", analista: "avaliacao_alpha", vigilante: "prontidao_alpha" },
    "beta-vigilia": { executor: "impeto_beta", analista: "analise_beta", vigilante: "prontidao_beta" },
  };

  /* ---------------------------------------------------------------
     HABILIDADES
     `motor` diz ao motor (js/ordem2/motor.js) o que automatizar; o resto
     é confirmação narrativa. janela: acao | antes | depois | passiva |
     reacao | inicioCombate | inicioCena. limite: rodada | cena |
     cenaConflito | missao | porAlvoCena.
     --------------------------------------------------------------- */
  var HABILIDADES = {
    impeto_alpha3: { nome: "Ímpeto", versao: "alpha", fonte: "alpha", pagina: 15, perfil: "executor",
      texto: "Barra com 3 espaços; cada teste falho preenche 1. Gaste 1 espaço para +d4 num teste ou 3 para aumentar um atributo em um passo até o fim da cena.",
      motor: { tipo: "impeto", espacos: 3, zeraFimCena: false, opcoes: [{ custo: 1, efeito: "dado", faces: 4 }, { custo: 3, efeito: "passoAtributo" }] } },
    impeto_alpha5: { nome: "Ímpeto", versao: "alpha", fonte: "alphaAto2", pagina: null, perfil: "executor", ficha: "Heitor",
      texto: "Barra com 5 espaços; cada teste falho preenche 1. Gaste 1 para +d4, 2 para +d10, 3 para aumentar um atributo até o fim da cena ou 5 para uma ação extra na rodada.",
      motor: { tipo: "impeto", espacos: 5, zeraFimCena: false, opcoes: [{ custo: 1, efeito: "dado", faces: 4 }, { custo: 2, efeito: "dado", faces: 10 }, { custo: 3, efeito: "passoAtributo" }, { custo: 5, efeito: "acaoExtra" }] } },
    impeto_beta: { nome: "Ímpeto", versao: "beta", fonte: "betaFichas", pagina: null, perfil: "executor",
      texto: "Barra com 5 espaços; cada teste falho preenche 1. Ação livre: 1 espaço dá +d4 num teste; 3 aumentam um atributo até o fim da cena; 3 dão uma ação extra em cena de conflito. Esvazia no fim da cena.",
      motor: { tipo: "impeto", espacos: 5, zeraFimCena: true, opcoes: [{ custo: 1, efeito: "dado", faces: 4 }, { custo: 3, efeito: "passoAtributo" }, { custo: 3, efeito: "acaoExtra", soConflito: true }] } },
    impeto_fervilhante: { nome: "Ímpeto Fervilhante", versao: "beta", fonte: "betaFichas", ficha: "Malik",
      texto: "No início de cada cena, preenche 1 espaço da barra de ímpeto.", motor: { tipo: "impetoInicioCena", espacos: 1 } },
    analise_beta: { nome: "Análise", versao: "beta", fonte: "beta", pagina: 7, perfil: "analista",
      texto: "Uma ação dá 2 marcadores (máximo 4). Depois de rolar, cada marcador muda um dado em +1 ou −1, dentro das faces dele. Os não usados somem no fim da cena.",
      motor: { tipo: "analise", ganho: 2, maximo: 4, zeraFimCena: true } },
    leitura_combate: { nome: "Leitura de Combate", versao: "beta", fonte: "beta", pagina: 7, ficha: "Rhiona",
      texto: "Em combate, gastar uma ação para se defender dá 1 marcador de análise.", motor: { tipo: "marcadorAoDefender", ganho: 1 } },
    segredo_do_aco: { nome: "Segredo do Aço", versao: "beta", fonte: "beta", pagina: 7, ficha: "Rhiona",
      texto: "Sabe usar equipamento marcial; um item vestido que dá pontos de armadura dá 1 ponto a mais.", motor: { tipo: "armaduraExtra", valor: 1 } },
    avaliacao_alpha: { nome: "Avaliação", versao: "alpha", fonte: "alphaAto2", perfil: "analista", ficha: "Amanda e Antônio",
      texto: "Uma ação e 2 PD para observar um ser ou ambiente: recebe 2 dados bônus d4 para testes relativos a ele (+2d4 num teste ou +d4 em dois). No máximo 2 dados por esta habilidade.",
      motor: { tipo: "avaliacao", pd: 2, dados: 2, faces: 4, maximo: 2 } },
    prontidao_alpha: { nome: "Prontidão", versao: "alpha", fonte: "alphaAto2", perfil: "vigilante", ficha: "Val",
      texto: "No início de qualquer conflito, gaste 3 PD para ganhar uma rodada em que age antes dos demais personagens e NPCs.",
      motor: { tipo: "rodadaAntecipada", pd: 3 } },
    prontidao_beta: { nome: "Prontidão", versao: "beta", fonte: "betaFichas", perfil: "vigilante",
      texto: "Uma vez por rodada, quando você ou outro ser em alcance curto faz um teste, gaste 2 PD para rolar de novo um dado que não deu 1. Em combate, pode agir na fase da ação ou em fases posteriores, e depois das rolagens daquela fase.",
      motor: { tipo: "prontidao", pd: 2, limite: "rodada", atrasar: true } },
    antecipacao_tatica: { nome: "Antecipação Tática", versao: "beta", fonte: "betaFichas", ficha: "Sira",
      texto: "No início de qualquer combate, gaste 2 PD para ganhar uma rodada em que age antes dos demais.", motor: { tipo: "rodadaAntecipada", pd: 2 } },
    foco_mental: { nome: "Foco Mental", versao: "alpha", fonte: "alpha", pagina: 15,
      texto: "Num teste mental (com o atributo Mente), gaste PD para receber um dado bônus. O custo e o dado dependem da ficha.",
      motor: { tipo: "dadoPorPd", atributo: "mente", pd: 2, faces: 4 } },
    olhar_infalivel: { nome: "Olhar Infalível", versao: "alpha", fonte: "alphaAto2", ficha: "Amanda",
      texto: "Num teste de examinar, gaste 2 PD para rolar de novo um dos dados.", motor: { tipo: "rerrolarExaminar", pd: 2 } },
    amor_descoberta: { nome: "Amor pela Descoberta", versao: "alpha", fonte: "alphaAto2", ficha: "Antônio",
      texto: "Quando examina um ponto de interesse e recebe informação nova, recupera 1 PD.", motor: { tipo: "pdAoDescobrir", pd: 1 } },
    mentoria: { nome: "Mentoria", versao: "ambas", fonte: "alphaAto2", ficha: "Antônio e Cavan",
      texto: "Ao ajudar, faça um teste da perícia usada contra DT 7. Se passar, quem foi ajudado pode trocar um dos dados dele pela sua rolagem alta.", motor: { tipo: "mentoria", dt: 7 } },
    incansavel: { nome: "Incansável", versao: "alpha", fonte: "alphaAto2", ficha: "Heitor",
      texto: "Uma vez por cena de conflito, gaste 5 PV para fazer uma ação extra.", motor: { tipo: "acaoExtraPorPv", pv: 5, limite: "cenaConflito" } },
    linha_de_tiro: { nome: "Linha de Tiro", versao: "alpha", fonte: "alphaAto2", ficha: "Heitor",
      texto: "Proficiência com armas de fogo; num ataque com elas, gaste 4 PD para +d10.", motor: { tipo: "dadoEmAtaque", categoria: "fogo", pd: 4, faces: 10 } },
    estoico: { nome: "Estoico", versao: "alpha", fonte: "alphaAto2", ficha: "Raven",
      texto: "+d6 em testes de trauma; na primeira vez em cada cena em que faz um teste de trauma, recupera 9 PD.", motor: { tipo: "estoico", faces: 6, pd: 9 } },
    para_bellum: { nome: "Para Bellum", versao: "alpha", fonte: "alphaAto2", ficha: "Raven",
      texto: "Proficiência com armas de fogo; dano com elas +2.", motor: { tipo: "danoPorCategoria", categoria: "fogo", valor: 2 } },
    tecnica_medicinal: { nome: "Técnica Medicinal", versao: "alpha", fonte: "alphaAto2", ficha: "Val",
      texto: "Efeitos de cura que você usa curam +1 PV (ou +1 PV por dado).", motor: { tipo: "curaExtra", valor: 1 } },
    varredura_ampla: { nome: "Varredura Ampla", versao: "alpha", fonte: "alphaAto2", ficha: "Val",
      texto: "Ao investigar um ponto de interesse, escolha duas perícias e receba as informações de ambas.", motor: { tipo: "duasPericias" } },
    esquiva: { nome: "Esquiva", versao: "beta", fonte: "betaFichas", ficha: "Rowan",
      texto: "Uma vez por rodada, ao sofrer um ataque, faça um teste de Acrobacia oposto como ação livre; se vencer, evita o ataque.", motor: { tipo: "esquiva", limite: "rodada" } },
    espectro_lobo: { nome: "Espectro, o Lobo", versao: "beta", fonte: "betaFichas", ficha: "Rowan",
      texto: "Um lobo parceiro dá +d6 em ataques corpo a corpo; se esse dado der 1, o lobo se machuca e não ajuda até o fim da cena.", motor: { tipo: "parceiro", faces: 6, ataque: "corpo" } },
    arsenal_herborista: { nome: "Arsenal de Herborista", versao: "beta", fonte: "betaFichas", ficha: "Muirenn",
      texto: "Preparados de uso único (uma ação e um alvo): tônico de urtiga-feroz (Físico +1 passo por uma cena), bálsamo de confrei (2d4 PV; outro alvo fica parado na rodada) e pote de vespa (ataque à distância com Sobrevivência, dano RA+1; o alvo que sobreviver perde a próxima ação).",
      motor: { tipo: "consumiveis" } },
    curandeiro: { nome: "Curandeiro", versao: "beta", fonte: "betaFichas", ficha: "Cavan",
      texto: "Uma ação e 2 PD: teste de Medicina (DT 7); se passar, cura PV do aliado iguais à RA. Uma vez por cena em cada alvo.", motor: { tipo: "curaPorTeste", pd: 2, dt: 7, pericia: "medicina", limite: "porAlvoCena" } },
    sorrateiro: { nome: "Sorrateiro", versao: "beta", fonte: "betaFichas", ficha: "Sira",
      texto: "Num teste de Crime ou Furtividade, gaste 3 PD para +d8.", motor: { tipo: "dadoPorPd", pericias: ["crime", "furtividade"], pd: 3, faces: 8 } },
    guardia: { nome: "Guardiã", versao: "beta", fonte: "betaFichas", ficha: "Sorcha",
      texto: "+1 PV por patamar (já anotado na ficha). Uma vez por rodada, quando um aliado em alcance curto sofre um ataque, gaste 2 PD para se tornar o alvo.", motor: { tipo: "redirecionarAtaque", pd: 2, limite: "rodada" } },
    instinto_sobrevivencia: { nome: "Instinto de Sobrevivência", versao: "beta", fonte: "betaFichas", ficha: "Sorcha",
      texto: "Com metade ou menos dos PV máximos, recebe um aumento de passo em todos os testes.", motor: { tipo: "passoComPvBaixo" } },
    heranca: { nome: "Herança", versao: "beta", fonte: "betaFichas", ficha: "Cormac",
      texto: "A categoria de riqueza aumenta em 1 (as regras de compra virão depois).", motor: { tipo: "narrativa" } },
    plano_estrategico: { nome: "Plano Estratégico", versao: "beta", fonte: "betaFichas", ficha: "Cormac",
      texto: "Uma ação e 3 PD: teste de Aptidão (Guerra) contra DT 7. Se passar, o grupo recebe d6, mais d6 a cada 3 pontos acima da DT, para gastar em testes até o fim da cena.",
      motor: { tipo: "reservaDeGrupo", pd: 3, dt: 7, pericia: "aptidao", especializacao: "Guerra", faces: 6 } },
  };

  /* ---------------------------------------------------------------
     OCUPAÇÕES (Alpha) E VOCAÇÕES (Beta)
     `habilidade`: documentada para a ocupação (a ficha só tem as duas de
     criação). `vistas`: habilidades que aparecem em fichas dela, mas sem
     dizer qual é a da ocupação — a criação guiada só dá uma se a
     pessoa escolher explicitamente.
     --------------------------------------------------------------- */
  var OCUPACOES = {
    "alpha-contemporaneo": [
      { id: "cientista", nome: "Cientista", habilidade: "foco_mental", nota: "Alan (nível 2) tem só Ímpeto e Foco Mental: Foco Mental é a de ocupação.", vistas: ["foco_mental", "avaliacao_alpha", "olhar_infalivel"] },
      { id: "professor", nome: "Professor", habilidade: "", vistas: ["amor_descoberta", "mentoria"] },
      { id: "policial", nome: "Policial", habilidade: "", vistas: ["incansavel", "linha_de_tiro"] },
      { id: "militar", nome: "Militar", habilidade: "", vistas: ["estoico", "para_bellum"] },
      { id: "medico", nome: "Médico", habilidade: "", vistas: ["tecnica_medicinal", "varredura_ampla"] },
    ],
    "beta-vigilia": [
      { id: "ferreira", nome: "Ferreira", habilidade: "", vistas: ["leitura_combate", "segredo_do_aco"] },
      { id: "adestrador", nome: "Adestrador", habilidade: "", vistas: ["esquiva", "espectro_lobo"] },
      { id: "herborista", nome: "Herborista", habilidade: "arsenal_herborista", nota: "Muirenn tem só Ímpeto e Arsenal de Herborista.", vistas: ["arsenal_herborista"] },
      { id: "professor", nome: "Professor", habilidade: "", vistas: ["curandeiro", "mentoria"] },
      { id: "explorador", nome: "Explorador", habilidade: "impeto_fervilhante", nota: "Malik tem só Ímpeto e Ímpeto Fervilhante.", vistas: ["impeto_fervilhante"] },
      { id: "viking", nome: "Viking", habilidade: "", vistas: ["antecipacao_tatica", "sorrateiro"] },
      { id: "talentosa", nome: "Talentosa", habilidade: "", vistas: ["guardia", "instinto_sobrevivencia"] },
      { id: "aristocrata", nome: "Aristocrata", habilidade: "", vistas: ["heranca", "plano_estrategico"] },
    ],
  };

  /* ---------------------------------------------------------------
     RELAÇÕES (Beta pp. 24–25)
     --------------------------------------------------------------- */
  var GRAUS_RELACAO = {
    1: { nome: "Afinidade", dado: 6, recuperar: null, acaoExtra: false },
    2: { nome: "Vínculo", dado: 8, recuperar: "2d4", acaoExtra: false },
    3: { nome: "Devoção", dado: 12, recuperar: "2d6", acaoExtra: true },
  };

  /* ---------------------------------------------------------------
     TABELAS (Alpha p. 19; Beta pp. 11, 22–23)
     --------------------------------------------------------------- */
  var FALHA_CRITICA = [
    { d: 1, nome: "Vexame", texto: "Descreva a falha de forma vergonhosa. Sem efeito em regras.", efeito: null },
    { d: 2, nome: "Machucado", texto: "Físico −1 passo até o fim da cena.", efeito: { tipo: "passoAtributo", alvo: "fisico", n: -1, expira: "cena" } },
    { d: 3, nome: "Desatenção", texto: "Mente −1 passo até o fim da cena.", efeito: { tipo: "passoAtributo", alvo: "mente", n: -1, expira: "cena" } },
    { d: 4, nome: "Irritação", texto: "Emoção −1 passo até o fim da cena.", efeito: { tipo: "passoAtributo", alvo: "emocao", n: -1, expira: "cena" } },
    { d: 5, nome: "Acidente", texto: "Perde 1d4 PV.", efeito: { tipo: "perda", recurso: "pv", dado: 4 } },
    { d: 6, nome: "Frustração", texto: "Perde 1d4 PD.", efeito: { tipo: "perda", recurso: "pd", dado: 4 } },
    { d: 7, nome: "Perda", texto: "Um item carregado (ou espaço de compra) se perde.", efeito: { tipo: "narrativa" } },
    { d: 8, nome: "Nenhum efeito adicional", texto: "Só a falha.", efeito: null },
  ];
  /* Lesões (Beta p. 22). `perm`: permanente (10–18). */
  var LESOES = [
    { de: 1, ate: 4, id: "morteSubita", nome: "Morte Súbita", texto: "O personagem morre.", efeito: { tipo: "morte" } },
    { de: 5, ate: 9, id: "morteLenta", nome: "Morte Lenta", texto: "Recupera 1 PV e acorda; age na rodada seguinte e morre ao fim dela. Nada impede.", efeito: { tipo: "morteLenta" } },
    { de: 10, ate: 10, id: "laceracao", nome: "Laceração Profunda", perm: true, acumula: true, texto: "Perde 2 PV (permanente; acumula).", efeito: { tipo: "pvMax", valor: -2 } },
    { de: 11, ate: 11, id: "semOlho", nome: "Sem Olho", perm: true, texto: "−1 em Percepção e Pontaria.", efeito: { tipo: "modPericia", pericias: { percepcao: -1, pontaria: -1 } } },
    { de: 12, ate: 12, id: "semMao", nome: "Sem Mão", perm: true, texto: "Só empunha um item; tarefas de duas mãos: −1 passo ou falha, a critério do Mestre.", efeito: { tipo: "narrativa" } },
    { de: 13, ate: 13, id: "semPe", nome: "Sem Pé", perm: true, texto: "−2 passos em movimentar-se e perseguição a pé.", efeito: { tipo: "narrativa" } },
    { de: 14, ate: 14, id: "tendao", nome: "Tendão Comprometido", perm: true, texto: "−2 em Acrobacia.", efeito: { tipo: "modPericia", pericias: { acrobacia: -2 } } },
    { de: 15, ate: 15, id: "musculo", nome: "Músculo Comprometido", perm: true, texto: "−2 em Atletismo.", efeito: { tipo: "modPericia", pericias: { atletismo: -2 } } },
    { de: 16, ate: 16, id: "orgaoInterno", nome: "Órgão Interno Comprometido", perm: true, texto: "−2 em Vigor.", efeito: { tipo: "modPericia", pericias: { vigor: -2 } } },
    { de: 17, ate: 17, id: "orgaoSensorial", nome: "Órgão Sensorial Comprometido", perm: true, texto: "−2 em Percepção.", efeito: { tipo: "modPericia", pericias: { percepcao: -2 } } },
    { de: 18, ate: 18, id: "cicatriz", nome: "Cicatriz Assustadora", perm: true, texto: "−2 em Persuasão e +1 em Intimidar.", efeito: { tipo: "modPericia", pericias: { persuasao: -2, intimidar: 1 } } },
    { de: 19, ate: 19, id: "contusao", nome: "Contusão", texto: "Físico −1 passo até o fim da cena.", efeito: { tipo: "passoAtributo", alvo: "fisico", n: -1, expira: "cena" } },
    { de: 20, ate: 99, id: "surto", nome: "Surto de Adrenalina", texto: "Sem sequelas; recupera 1 PV.", efeito: { tipo: "recupera", recurso: "pv", valor: 1 } },
  ];
  /* Traumas (Beta p. 23). `cura`: dura até ser curado (5–14). */
  var TRAUMAS = [
    { de: 1, ate: 4, id: "colapso", nome: "Colapso Total", texto: "A mente sucumbe: o personagem está perdido.", efeito: { tipo: "colapso" } },
    { de: 5, ate: 6, id: "tept", nome: "Estresse Pós-Traumático", cura: true, texto: "Dano emocional sofrido +1.", efeito: { tipo: "danoEmocionalExtra", valor: 1 } },
    { de: 7, ate: 8, id: "degradacao", nome: "Degradação Cognitiva", cura: true, texto: "−1 em Mente.", efeito: { tipo: "modAtributo", atributo: "mente", valor: -1 } },
    { de: 9, ate: 10, id: "macula", nome: "Mácula Psíquica", cura: true, texto: "−1 em Emoção.", efeito: { tipo: "modAtributo", atributo: "emocao", valor: -1 } },
    { de: 11, ate: 12, id: "chaga", nome: "Chaga da Alma", cura: true, texto: "Perde 2 PD (enquanto não for curado).", efeito: { tipo: "pdMax", valor: -2 } },
    { de: 13, ate: 14, id: "retracao", nome: "Retração Defensiva", cura: true, texto: "−2 em Persuasão e Intuição.", efeito: { tipo: "modPericia", pericias: { persuasao: -2, intuicao: -2 } } },
    { de: 15, ate: 17, id: "panico", nome: "Pânico", texto: "Recebe um dado de pavor.", efeito: { tipo: "pavor" } },
    { de: 18, ate: 19, id: "estupor", nome: "Estupor Catatônico", texto: "Perde a ação na próxima rodada.", efeito: { tipo: "perdeAcao" } },
    { de: 20, ate: 99, id: "injecao", nome: "Injeção de Ânimo", texto: "Sem sequelas; recupera 1 PD.", efeito: { tipo: "recupera", recurso: "pd", valor: 1 } },
  ];
  function daTabela(tabela, n) {
    for (var i = 0; i < tabela.length; i++) if (n >= tabela[i].de && n <= tabela[i].ate) return tabela[i];
    return n < 1 ? tabela[0] : tabela[tabela.length - 1];
  }
  /* Bônus por patamar no d20 de lesão/trauma (Beta pp. 22–23): só
     quando o patamar for informado (o playtest não define patamares). */
  var PATAMARES = { "": { nome: "Não informado", bonus: 0 }, iniciante: { nome: "Iniciante", bonus: 0 }, veterano: { nome: "Veterano", bonus: 1 }, elite: { nome: "Elite", bonus: 2 }, lenda: { nome: "Lenda", bonus: 3 } };

  /* ---------------------------------------------------------------
     COMBATE (Beta pp. 18–21)
     --------------------------------------------------------------- */
  /* Três fases (Beta pp. 18–21: Geral → Distância → Corpo a corpo) ou as
     quatro das missões (Beta pp. 32 e 69: Suporte → Distância → Corpo a
     corpo → Final). Uma ação "geral" vai para Suporte ou para Final
     conforme `fase4` — trocar a ordem no meio da cena remapeia as
     declarações, sem perder ação (faseDaAcao, mesa.configurarFases). */
  var FASES = {
    geral: { nome: "Fase Geral", texto: "Qualquer ação, exceto ataques." },
    suporte: { nome: "Fase de Suporte", texto: "Ações de combate que não são ataque nem movimento puro: preparar esquiva, habilidades e itens que ajudam (Beta p. 69)." },
    distancia: { nome: "Ataques à Distância", texto: "Ataques com armas de arremesso ou disparo." },
    corpo: { nome: "Corpo a Corpo", texto: "Ataques corpo a corpo e manobras." },
    final: { nome: "Fase Final", texto: "Movimento puro (inclusive fugir) e o que não é combate — investigar durante a luta, encaixar runas (Beta p. 69)." },
  };
  var ORDEM_FASES_PADRAO = ["geral", "distancia", "corpo"];
  var ORDEM_FASES_4 = ["suporte", "distancia", "corpo", "final"];
  var ACOES_COMBATE = {
    atrapalhar: { fase: "geral", fase4: "suporte", nome: "Atrapalhar", texto: "Perícia coerente contra a Percepção do alvo (curto); vencendo, o alvo sofre −1 passo em todos os testes até o fim da rodada." },
    defender: { fase: "geral", fase4: "suporte", nome: "Defender-se", texto: "Acrobacia +d6 (ou Luta, contra corpo a corpo) oposta a um ataque escolhido antes da rolagem; vencendo, não sofre dano (nem causa)." },
    fintar: { fase: "geral", fase4: "suporte", nome: "Fintar", texto: "Enganação contra a Intuição do alvo (curto); vencendo, +2 passos no próximo ataque contra ele até o fim da próxima rodada." },
    mirar: { fase: "geral", fase4: "suporte", nome: "Mirar", texto: "Na próxima rodada, +d6 em ataques à distância contra o alvo." },
    preparar: { fase: "geral", fase4: "suporte", nome: "Preparar", texto: "Declara uma ação e o evento que a dispara; ela acontece antes do evento. Sem o evento, perde a ação." },
    habilidade: { fase: "geral", fase4: "suporte", nome: "Usar habilidade ou item", texto: "Conforme o texto da habilidade ou item." },
    outra: { fase: "geral", fase4: "final", nome: "Outra ação", texto: "Movimentar-se, ajudar, interagir…" },
    mover: { fase: "geral", fase4: "final", nome: "Mover-se ou fugir", texto: "Movimento puro, inclusive tentar fugir do combate (Beta p. 69)." },
    investigar: { fase: "geral", fase4: "final", nome: "Investigar durante a luta", texto: "Uma ação de investigação, desafio ou encaixe de runa no meio do combate (Beta p. 69): a ação mesmo é feita no quadro." },
    abrigo: { fase: "geral", fase4: "suporte", nome: "Procurar abrigo", texto: "Contra um efeito em área anunciado (ex.: a Enxurrada de Morte na primeira ação do aughisk): +d6 no teste e, passando, sem dano (Beta p. 43)." },
    escapar: { fase: "corpo", nome: "Escapar (ou soltar um aliado)", texto: "Acrobacia ou Luta oposta à Luta de quem agarra; a vítima sofre −1 passo, quem ajuda não (Beta p. 33)." },
    agredirDistancia: { fase: "distancia", nome: "Agredir (à distância)", texto: "Pontaria contra DT 7 (+3 em alcance longo)." },
    agredirCorpo: { fase: "corpo", nome: "Agredir (corpo a corpo)", texto: "Luta contra DT 7 (alcance curto)." },
    agarrar: { fase: "corpo", manobra: true, nome: "Agarrar", texto: "O alvo fica imóvel, −1 passo em ataques e só ataca com armas pequenas." },
    derrubar: { fase: "corpo", manobra: true, nome: "Derrubar", texto: "O alvo fica caído; vencendo por 5+, dano de impacto igual à RB." },
    desarmar: { fase: "corpo", manobra: true, nome: "Desarmar", texto: "O alvo larga um item; por 5+, você pega ou arremessa." },
    empurrar: { fase: "corpo", manobra: true, nome: "Empurrar", texto: "Empurra alguns metros; por 5+, −1 passo no próximo teste do alvo." },
    quebrar: { fase: "corpo", manobra: true, nome: "Quebrar", texto: "Causa o dano do ataque num item empunhado ou vestido." },
  };
  /* Ações livres (Beta p. 19): sacar/guardar e erguer-se custam −1 passo
     em todos os testes da rodada; jogar-se no chão não custa. */
  var ACOES_LIVRES = {
    sacar: { nome: "Sacar ou guardar item", passosNaRodada: -1 },
    erguer: { nome: "Erguer-se", passosNaRodada: -1, levanta: true },
    jogarSe: { nome: "Jogar-se no chão", passosNaRodada: 0, cai: true },
  };

  /* ---------------------------------------------------------------
     MINIJOGOS (Alpha pp. 24–25; Beta pp. 16–17)
     --------------------------------------------------------------- */
  var MINIJOGOS = {
    destrancar: { nome: "Destrancar", fonte: "beta", pagina: 16, texto: "O Mestre rola a senha escondido; você posiciona os dados e ouve alto, baixo ou exato. Tentativas por rodada pelo Crime (d4 = 1 … d12 = 5); excedido o máximo da fechadura, ela só abre na força ou com a chave." },
    arrombar: { nome: "Arrombar", fonte: "beta", pagina: 16, texto: "1 PV por tentativa; teste de Atletismo contra a DT do objeto; cada sucesso soma a RA até a pontuação alvo." },
    equilibrio: { nome: "Teste de Equilíbrio", fonte: "beta", pagina: 17, texto: "2d10 sem somar: iguais ou com 1 de diferença, você se equilibra. Dados de equilíbrio (d4, metade da Acrobacia) somam a um dos d10." },
    alcancarSeguro: { nome: "Alcançar do jeito seguro", fonte: "beta", pagina: 17, texto: "Duas ações seguidas com Acrobacia; falhando em qualquer uma, dano igual à RB e recomeça." },
    alcancarArriscado: { nome: "Alcançar do jeito arriscado", fonte: "beta", pagina: 17, texto: "Uma ação, Acrobacia com DT +3; falhando, dano igual à RA." },
    sustentar: { nome: "Sustentar", fonte: "beta", pagina: 17, texto: "1 PV e Atletismo; a cada rodada, novo teste com −1 passo acumulado." },
    hackTecnico: { nome: "Hack técnico", fonte: "alpha", pagina: 25, texto: "Teste de Tecnologia e um problema matemático em 10 segundos (mais fácil quanto maior o resultado)." },
    hackSocial: { nome: "Hack social", fonte: "alpha", pagina: 25, texto: "Teste de Intuição e perguntas sobre quem criou a senha; a cada 3 acima da DT, uma chance extra." },
    senha: { nome: "Senha (teclado)", fonte: "alpha", pagina: 50, texto: "Um código que se digita; a missão diz quantos erros bloqueiam o teclado e por quanto tempo." },
    escalar: { nome: "Escalar (acumular)", fonte: "beta", pagina: 41, texto: "A cada ação, rápido (DT maior, soma a RA) ou cauteloso (DT menor, soma a RB) até a meta; falhando, cai com dano igual ao acumulado." },
    travessia: { nome: "Travessia por áreas", fonte: "beta", pagina: 57, texto: "Cada área pede uma soma de avanços; cada ação diz a perícia, a DT, quanto avança e o que acontece na falha." },
    enigma: { nome: "Enigma", fonte: "beta", pagina: 60, texto: "Uma resposta conferida pela mesa (ou pelo Mestre); a missão diz o custo de errar." },
    runas: { nome: "Encaixe de runas", fonte: "beta", pagina: 60, texto: "Pedras encontradas na cena, postas nos nichos na ordem certa." },
    laboratorio: { nome: "Laboratório portátil", fonte: "alpha", pagina: 74, texto: "De 4 a 6 dados rolados um por vez, começando em d4 e subindo um passo até a Aptidão (Exatas); cada um precisa ser igual ou maior que o anterior; metade da Mente em novas rolagens. Não usa o teto de quatro dados de um teste." },
    radio: { nome: "Rádio modificado", fonte: "alpha", pagina: 76, texto: "Conjuntos de palavras para ordenar; um teste de Tecnologia tira conjuntos falsos (7–9: 2; 10–12: 3; 13+: todos)." },
    perseguicao: { nome: "Perseguição", fonte: "beta", pagina: 35, texto: "Rodadas contadas; avançar com Atletismo DT 10 (sucesso soma a RA, falha a RB); fôlego (d6, metade do Vigor) como dados bônus; esforço extra, carregar outro e os limiares de cada rodada." },
    esconderijo: { nome: "Esconderijo", fonte: "beta", pagina: 55, texto: "Os dados do teste viram dados de esconderijo; as criaturas procuram rolando e descartam os iguais; sem dados, você foi encontrado." },
  };

  /* ---------------------------------------------------------------
     FERRAMENTAS DA ORDO REALITAS (Alpha pp. 65–70; uso pp. 74–76)
     Cada ponto de interesse da missão diz o que cada uma mostra ali; sem
     linha para a ferramenta, a leitura é normal/sem reação — e isso
     também é informação (p. 81).
     --------------------------------------------------------------- */
  var FERRAMENTAS = {
    laboratorio: { nome: "Laboratório portátil", pagina: 66, uso: 74, modo: "minijogo", texto: "Coleta e analisa amostras: a sequência de dados do minijogo." },
    camera: { nome: "Câmera modificada", pagina: 67, uso: 74, modo: "anexo", texto: "Fotografa resíduos imagéticos: o Mestre envia o handout do ponto (ou descreve)." },
    uv: { nome: "Lanterna de estouro ultravioleta", pagina: 67, uso: 74, cargas: 3, modo: "texto", texto: "Pulso UV revela vestígios; 3 cargas (iluminar não gasta)." },
    laser: { nome: "Laser de varredura", pagina: 68, uso: 76, modo: "ambiente", texto: "Ativado no ambiente: mostra quais pontos reagem às outras ferramentas." },
    infravermelho: { nome: "Leitor infravermelho", pagina: 68, uso: 76, modo: "texto", texto: "Gradientes térmicos paranormais; requer interpretação." },
    emf: { nome: "Medidor EMF", pagina: 69, uso: 76, modo: "anexo", texto: "Apita num padrão: o Mestre envia o áudio do ponto (ou faz os bips); comparar com o compêndio." },
    radio: { nome: "Rádio modificado", pagina: 69, uso: 76, modo: "radio", pericia: "tecnologia", texto: "Conjuntos de palavras para ordenar; o teste de Tecnologia tira os falsos." },
    po: { nome: "Pó revelador", pagina: 69, uso: 76, cargas: 5, modo: "texto", texto: "Reage em tons e formas conforme o elemento; 5 usos." },
    termometro: { nome: "Termômetro diferencial", pagina: 70, uso: 76, modo: "texto", texto: "Quantas vezes quiser: mais quente, mais frio ou igual ao ambiente." },
    compendium: { nome: "Compêndio da Ordem", pagina: 70, uso: 74, modo: "consulta", texto: "Quem carrega (e quem ele permitir, no mesmo ambiente) consulta a qualquer momento." },
  };
  var ORDEM_FERRAMENTAS = ["laboratorio", "camera", "uv", "laser", "infravermelho", "emf", "radio", "po", "termometro", "compendium"];
  /* Rádio (p. 76): quantos conjuntos falsos saem pelo resultado. */
  var RADIO_FALSOS = [{ ate: 6, remove: 0 }, { ate: 9, remove: 2 }, { ate: 12, remove: 3 }, { ate: 999, remove: "todos" }];
  function falsosDoRadio(total) { for (var i = 0; i < RADIO_FALSOS.length; i++) if (total <= RADIO_FALSOS[i].ate) return RADIO_FALSOS[i].remove; return "todos"; }

  /* Sobrecarga mental (Alpha p. 77): a partir de certo ponto, dano
     emocional no fim de cada rodada da investigação; a tabela é de cada
     ambiente (vem com a cena). Dado: cada um rola o seu. */
  var SOBRECARGA = { pagina: 77, texto: "No fim de cada rodada de investigação, cada personagem sofre o dano emocional da linha da rodada; quando é um dado, cada um rola o próprio. A tabela é do ambiente." };

  /* Desafios de acesso: os testes normais ficam com o teste (montar,
     pós-rolagem); estes números são as regras próprias de cada um. */
  var DESAFIOS = {
    destrancar: { pericia: "crime", tentativasPorDado: { 4: 1, 6: 2, 8: 3, 10: 4, 12: 5 }, pagina: { alpha: 24, beta: 16 } },
    arrombar: { pericia: "atletismo", custoPv: 1, pagina: { alpha: 24, beta: 16 } },
    alcancar: { pericia: "acrobacia", arriscadoDt: 3, pagina: { alpha: 25, beta: 17 } },
    sustentar: { pericia: "atletismo", custoPv: 1, pagina: { alpha: 25, beta: 17 } },
    equilibrio: { faces: 10, reservaFaces: 4, pagina: { beta: 17 } },
    hackSocial: { pericia: "intuicao", pontosPorChance: 3, pagina: { alpha: 25 } },
    hackTecnico: { pericia: "tecnologia", segundos: 10, pagina: { alpha: 25 } },
    esconderijo: { pericia: "furtividade", esconderDt: 7, distrairDt: 7, passoDt: 3, danoEncontrado: "1d6", pagina: { beta: 55 } },
    perseguicao: { pericia: "atletismo", dt: 10, folegoFaces: 6, pagina: { beta: 35 } },
  };
  /* A tabela das criaturas procurando (Beta p. 56), d10. */
  var ESCONDERIJO_CRIATURAS = {
    1: { tipo: "numeros", texto: "O Mestre fala dois números; descartam-se os dados de esconderijo desses números." },
    2: { tipo: "sopro", texto: "Sopro na nuca: um personagem sorteado fica parado (2d6 PD) ou sai de perto (perde um dado)." },
    3: { tipo: "todos", dados: [[1, 10]], texto: "As criaturas procuram todos: 1d10." },
    4: { tipo: "todos", dados: [[2, 8]], texto: "As criaturas procuram todos: 2d8." },
    5: { tipo: "todos", dados: [[3, 6]], texto: "As criaturas procuram todos: 3d6." },
    6: { tipo: "todos", dados: [[1, 8]], texto: "As criaturas procuram todos: 1d8." },
    7: { tipo: "todos", dados: [[2, 6]], texto: "As criaturas procuram todos: 2d6." },
    8: { tipo: "um", porMaior: { 12: [1, 12], 10: [2, 10], 0: [3, 8] }, texto: "Uma criatura salta num personagem sorteado: 1d12, 2d10 ou 3d8 pelo maior dado de esconderijo dele." },
    9: { tipo: "um", porMaior: { 12: [1, 10], 10: [2, 8], 0: [3, 6] }, texto: "Uma criatura procura um personagem sorteado: 1d10, 2d8 ou 3d6 pelo maior dado de esconderijo dele." },
    10: { tipo: "nada", texto: "As criaturas param por um momento: ninguém é procurado." },
  };
  function faseDaAcao(chave, ordem) {
    var a = ACOES_COMBATE[chave];
    if (!a) return "";
    var o = Array.isArray(ordem) && ordem.length ? ordem : ORDEM_FASES_PADRAO;
    if (o.indexOf(a.fase) >= 0) return a.fase;
    if (a.fase === "geral") {
      if (a.fase4 && o.indexOf(a.fase4) >= 0) return a.fase4;
      if (o.indexOf("suporte") >= 0) return "suporte";
      if (o.indexOf("final") >= 0) return "final";
    }
    if ((a.fase === "suporte" || a.fase === "final") && o.indexOf("geral") >= 0) return "geral";
    return a.fase;
  }

  /* ---------------------------------------------------------------
     O BLOCO PARANORMAL — consultável, ainda sem conjuração (etapa 3)
     --------------------------------------------------------------- */
  var PARANORMAL = {
    disponivel: false,
    texto: "Rituais, poderes e objetos amaldiçoados ainda não chegaram nos playtests usados aqui. O que já vale: atributos e perícias podem chegar a d20 só com efeito paranormal explícito (Alpha p. 16 e 20; Beta p. 8 e 12), e Ocultismo/Bruxaria é a perícia do conhecimento paranormal.",
  };

  /* ---------------------------------------------------------------
     FICHAS PRONTAS
     Dados de perícia na ordem da lista do perfil, com as Aptidões
     escritas à parte. PV e PD são os IMPRESSOS — nunca calculados.
     --------------------------------------------------------------- */
  var ORDEM_A = ["acrobacia", "aptidao", "atletismo", "crime", "disciplina", "enganacao", "furtividade", "intimidar", "intuicao", "luta", "maquinas", "medicina", "ocultismo", "percepcao", "persuasao", "pesquisar", "pontaria", "sobrevivencia", "tecnologia", "vigor"];
  var ORDEM_B = ["acrobacia", "animais", "aptidao", "atletismo", "crime", "disciplina", "enganacao", "furtividade", "inspecionar", "intimidar", "intuicao", "luta", "medicina", "ocultismo", "metalurgia", "percepcao", "persuasao", "pontaria", "sobrevivencia", "vigor"];

  /* Monta as perícias: `dados` na ordem da lista; `aptidoes` substitui a
     entrada "aptidao" por uma ou mais especializações. */
  function periciasDe(ordem, dados, aptidoes, extras) {
    var saida = [];
    ordem.forEach(function (k, i) {
      if (k === "aptidao") {
        (aptidoes || [{ esp: "", dado: dados[i] }]).forEach(function (a) { saida.push({ chave: "aptidao", especializacao: a.esp, dado: a.dado }); });
        return;
      }
      var e = { chave: k, especializacao: "", dado: dados[i] };
      if (extras && extras[k]) Object.keys(extras[k]).forEach(function (x) { e[x] = extras[k][x]; });
      saida.push(e);
    });
    return saida;
  }
  /* Os rótulos impressos nas fichas Beta (ver DIVERGENCIAS). */
  var IMPRESSO_BETA = { ocultismo: { rotuloImpresso: "Ocultismo" }, metalurgia: { rotuloImpresso: "Ofício" } };
  function impressoBeta(espMetalurgia) {
    return { ocultismo: { rotuloImpresso: "Ocultismo" }, metalurgia: espMetalurgia ? { rotuloImpresso: "Ofício (" + espMetalurgia + ")", especializacao: espMetalurgia } : { rotuloImpresso: "Ofício" } };
  }
  function rel(nome, rotulo, descricao, grau) { return { nome: nome, rotulo: rotulo, descricao: descricao, grau: grau || 0 }; }
  function arma(nome, tipo, dano, extra) { return Object.assign({ nome: nome, tipo: "arma", alcance: tipo, dano: dano }, extra || {}); }
  function item(nome, extra) { return Object.assign({ nome: nome, tipo: "item" }, extra || {}); }

  var PRESETS = [
    /* ---------------- ALPHA ---------------- */
    { id: "alan", nome: "Alan", perfilRegras: "alpha-contemporaneo", fonte: "alpha", pagina: 15, perfil: "executor", ocupacao: "Cientista", nivel: 2,
      atributos: { fisico: 6, mente: 8, emocao: 8 }, pv: 10, pd: 16,
      pericias: periciasDe(ORDEM_A, [4, 6, 4, 6, 6, 6, 4, 4, 4, 4, 4, 4, 4, 8, 4, 6, 4, 4, 4, 6], [{ esp: "Humanas", dado: 6 }]),
      habilidades: [{ id: "foco_mental", param: { pd: 2, faces: 4 } }, { id: "impeto_alpha3" }],
      itens: [], relacoes: [], idade: null, resumo: "Personagem pronto da explicação da ficha no Alpha." },
    { id: "amanda", nome: "Amanda", perfilRegras: "alpha-contemporaneo", fonte: "alphaAto2", perfil: "analista", ocupacao: "Cientista", nivel: 6,
      atributos: { fisico: 8, mente: 8, emocao: 8 }, pv: 26, pd: 26,
      pericias: periciasDe(ORDEM_A, [4, 0, 4, 6, 6, 6, 4, 4, 8, 4, 6, 6, 4, 10, 4, 10, 4, 4, 10, 4], [{ esp: "Burocracia", dado: 8 }, { esp: "Exatas", dado: 8 }]),
      habilidades: [{ id: "avaliacao_alpha" }, { id: "foco_mental", param: { pd: 4, faces: 8 } }, { id: "olhar_infalivel" }],
      itens: [], relacoes: [], idade: 25, resumo: "Perita criminal cética, recrutada pela Ordo Realitas." },
    { id: "antonio", nome: "Antônio", perfilRegras: "alpha-contemporaneo", fonte: "alphaAto2", perfil: "analista", ocupacao: "Professor", nivel: 6,
      atributos: { fisico: 6, mente: 12, emocao: 6 }, pv: 24, pd: 24,
      pericias: periciasDe(ORDEM_A, [4, 0, 4, 8, 10, 8, 6, 4, 8, 4, 4, 4, 10, 8, 4, 4, 6, 4, 6, 8], [{ esp: "Humanas", dado: 10 }, { esp: "Burocracia", dado: 8 }]),
      habilidades: [{ id: "amor_descoberta" }, { id: "avaliacao_alpha" }, { id: "mentoria" }],
      itens: [], relacoes: [], idade: 60, resumo: "Pesquisador universitário que estuda o paranormal para a Ordem." },
    { id: "heitor", nome: "Heitor", perfilRegras: "alpha-contemporaneo", fonte: "alphaAto2", perfil: "executor", ocupacao: "Policial", nivel: 6,
      atributos: { fisico: 10, mente: 6, emocao: 8 }, pv: 34, pd: 20,
      pericias: periciasDe(ORDEM_A, [4, 0, 10, 4, 6, 4, 4, 6, 4, 10, 4, 4, 4, 10, 4, 6, 8, 4, 4, 8], [{ esp: "Tática", dado: 8 }]),
      habilidades: [{ id: "impeto_alpha5" }, { id: "incansavel" }, { id: "linha_de_tiro" }],
      itens: [], relacoes: [], idade: 31, resumo: "Ex-policial, agente de linha de frente." },
    { id: "raven", nome: "Raven", perfilRegras: "alpha-contemporaneo", fonte: "alphaAto2", perfil: "executor", ocupacao: "Militar", nivel: 6,
      atributos: { fisico: 10, mente: 8, emocao: 6 }, pv: 28, pd: 24,
      pericias: periciasDe(ORDEM_A, [4, 0, 8, 4, 6, 4, 4, 6, 4, 6, 10, 4, 4, 8, 4, 4, 10, 8, 4, 10], [{ esp: "Tática", dado: 10 }]),
      habilidades: [{ id: "estoico" }, { id: "impeto_alpha3" }, { id: "para_bellum" }],
      itens: [], relacoes: [], idade: 29, resumo: "Ex-oficial e piloto, agora na aviação civil e na Ordem." },
    { id: "val", nome: "Val", perfilRegras: "alpha-contemporaneo", fonte: "alphaAto2", perfil: "vigilante", ocupacao: "Médico", nivel: 6,
      atributos: { fisico: 6, mente: 10, emocao: 8 }, pv: 18, pd: 32,
      pericias: periciasDe(ORDEM_A, [4, 0, 4, 4, 10, 6, 4, 4, 8, 4, 4, 10, 8, 6, 8, 6, 10, 4, 10, 4], [{ esp: "Exatas", dado: 10 }]),
      habilidades: [{ id: "prontidao_alpha" }, { id: "tecnica_medicinal" }, { id: "varredura_ampla" }],
      itens: [], relacoes: [], idade: 28, resumo: "Estudante de medicina que decidiu salvar vidas depois de um encontro paranormal." },

    /* ---------------- BETA (nível 3) ---------------- */
    { id: "rhiona", nome: "Rhiona Mac Tuirenn", perfilRegras: "beta-vigilia", fonte: "beta", pagina: 7, fonteExtra: "betaFichas", perfil: "analista", ocupacao: "Ferreira", nivel: 3,
      atributos: { fisico: 10, mente: 6, emocao: 6 }, pv: 22, pd: 12,
      pericias: periciasDe(ORDEM_B, [4, 4, 4, 8, 4, 6, 4, 4, 4, 4, 4, 10, 4, 4, 8, 6, 6, 4, 4, 8], null, impressoBeta("Metalurgia")),
      habilidades: [{ id: "analise_beta" }, { id: "leitura_combate" }, { id: "segredo_do_aco" }],
      itens: [arma("Martelo de forja", "corpo", 3), item("Tenaz de ferreiro")],
      relacoes: [rel("Rowan", "Confiança", "Traz o minério de ferro do pântano."), rel("Muirenn", "Neutro", "Ouviu falar dos enfermos tratados pela curandeira."), rel("Cavan", "Amizade", "Debatem contabilidade."), rel("Malik", "Admiração", "Gosta das histórias de terras distantes."), rel("Sira", "Neutro", "Quer perguntar sobre o naufrágio."), rel("Sorcha", "Respeito", "Reconhece a vigilância dela."), rel("Cormac", "Curiosidade", "De onde vem a espada dele?")],
      idade: 23, resumo: "Filha do ferreiro de Ballynyr, versada no ferro e no fogo." },
    { id: "rowan", nome: "Rowan Lobo Castanho", perfilRegras: "beta-vigilia", fonte: "betaFichas", perfil: "vigilante", ocupacao: "Adestrador", nivel: 3,
      atributos: { fisico: 8, mente: 8, emocao: 6 }, pv: 20, pd: 12,
      pericias: periciasDe(ORDEM_B, [6, 6, 4, 6, 4, 4, 4, 6, 4, 4, 4, 6, 6, 4, 4, 8, 4, 10, 8, 6], null, impressoBeta("")),
      habilidades: [{ id: "prontidao_beta" }, { id: "esquiva" }, { id: "espectro_lobo" }],
      itens: [arma("Arco curto de teixo", "distancia", 1), arma("Lança de javali", "corpo", 2, { efeitos: ["passoPrimeiroAtaqueCena"], especial: "+1 passo no primeiro ataque da cena." })],
      relacoes: [rel("Rhiona", "Dever", "A ferreira é importante e deve ser protegida."), rel("Muirenn", "Cumplicidade", "Vivem à parte da vila."), rel("Cavan", "Neutro", "Bons conselhos aos camponeses."), rel("Malik", "Neutro", "O jeito bisbilhoteiro não incomoda."), rel("Sira", "Neutro", "Viram-se uma vez."), rel("Sorcha", "Neutro", "Os rastros dela chamam atenção demais."), rel("Cormac", "Tranquilidade", "Não o considera ameaça.")],
      idade: 25, resumo: "Aprendiz do caçador da vila, com um lobo castanho leal." },
    { id: "muirenn", nome: "Muirenn da Lua Pálida", perfilRegras: "beta-vigilia", fonte: "betaFichas", perfil: "executor", ocupacao: "Herborista", nivel: 3,
      atributos: { fisico: 8, mente: 8, emocao: 8 }, pv: 15, pd: 17,
      pericias: periciasDe(ORDEM_B, [4, 4, 0, 6, 4, 6, 4, 4, 6, 6, 6, 4, 8, 8, 4, 4, 4, 6, 8, 6], [{ esp: "Folclore", dado: 8 }], impressoBeta("")),
      habilidades: [{ id: "impeto_beta" }, { id: "arsenal_herborista" }],
      itens: [arma("Faca ritualística", "corpo", 0), item("Maleta de medicamentos"),
        item("Tônico de urtiga-feroz", { consumivel: "tonico", quantidade: 1 }), item("Bálsamo de confrei", { consumivel: "balsamo", quantidade: 1 }), item("Pote de vespa", { consumivel: "vespa", quantidade: 1 })],
      relacoes: [rel("Rhiona", "Neutro", "Não gosta de armas de metal."), rel("Rowan", "Amizade", "Não tem medo do lobo."), rel("Cavan", "Neutro", "Desaprova a doutrina escrita."), rel("Malik", "Neutro", "Tolo, mas não perigoso."), rel("Sira", "Neutro", "Sabe que ela finge debilidade."), rel("Sorcha", "Neutro", "Duvida da proteção da guarda."), rel("Cormac", "Neutro", "Mais um forasteiro bem recebido.")],
      idade: 21, resumo: "Bruxa do bosque; dizem ser filha das fadas." },
    { id: "cavan", nome: "Irmão Cavan", perfilRegras: "beta-vigilia", fonte: "betaFichas", perfil: "analista", ocupacao: "Professor", nivel: 3,
      atributos: { fisico: 6, mente: 10, emocao: 6 }, pv: 15, pd: 15,
      pericias: periciasDe(ORDEM_B, [6, 4, 0, 10, 4, 8, 4, 4, 8, 4, 6, 8, 6, 6, 4, 6, 4, 4, 4, 6], [{ esp: "Erudição", dado: 6 }], impressoBeta("")),
      habilidades: [{ id: "analise_beta" }, { id: "curandeiro" }, { id: "mentoria" }],
      itens: [arma("Porrete", "corpo", 1)],
      relacoes: [rel("Rhiona", "Grande afeição", "Sentimento em conflito com os votos."), rel("Rowan", "Neutro", "Espera conversar melhor."), rel("Muirenn", "Neutro", "Desaprova a tradição, sem ódio."), rel("Malik", "Admiração", "O conhecimento de outras terras."), rel("Sira", "Neutro", "Quer perguntar sobre o naufrágio."), rel("Sorcha", "Neutro", "Acha que ela já sofreu muito."), rel("Cormac", "Discrição", "Reconhece o sotaque nobre e não conta.")],
      idade: 26, nomeCompleto: "Irmão Cavan do Mosteiro do Olmo Cinzento", resumo: "Monge educador, contabilista e guia espiritual." },
    { id: "malik", nome: "Malik ibn Qamar", perfilRegras: "beta-vigilia", fonte: "betaFichas", perfil: "executor", ocupacao: "Explorador", nivel: 3,
      atributos: { fisico: 6, mente: 6, emocao: 10 }, pv: 15, pd: 19,
      pericias: periciasDe(ORDEM_B, [4, 4, 0, 6, 4, 6, 4, 4, 6, 4, 4, 4, 4, 4, 4, 10, 6, 8, 6, 4], [{ esp: "Erudição", dado: 8 }], impressoBeta("")),
      habilidades: [{ id: "impeto_beta" }, { id: "impeto_fervilhante" }],
      itens: [arma("Arco composto de Al-Andalus", "distancia", 1), item("Diário de viagem")],
      relacoes: [rel("Rhiona", "Neutro", "Boa ouvinte das histórias."), rel("Rowan", "Neutro", "O lobo e as superstições."), rel("Muirenn", "Admiração", "O conhecimento ancestral."), rel("Cavan", "Admiração", "A caligrafia e a didática."), rel("Sira", "Curiosidade", "Enche-a de perguntas."), rel("Sorcha", "Neutro", "O olhar desconfiado dela pesa."), rel("Cormac", "Curiosidade", "Admira o vocabulário.")],
      idade: 24, resumo: "Andarilho árabe atrás das maravilhas e horrores do mundo." },
    { id: "sira", nome: "Sira Cissé", perfilRegras: "beta-vigilia", fonte: "betaFichas", perfil: "vigilante", ocupacao: "Viking", nivel: 3,
      atributos: { fisico: 8, mente: 6, emocao: 8 }, pv: 20, pd: 12,
      pericias: periciasDe(ORDEM_B, [6, 4, 0, 6, 8, 4, 4, 10, 4, 4, 4, 8, 4, 4, 4, 6, 4, 4, 4, 6], [{ esp: "Erudição", dado: 6 }], impressoBeta("")),
      habilidades: [{ id: "prontidao_beta" }, { id: "antecipacao_tatica" }, { id: "sorrateiro" }],
      itens: [arma("Machado de batalha nórdico", "corpo", 3)],
      atributosImpressos: { intuicao: "fisico", luta: "mente", percepcao: "emocao" },
      relacoes: [rel("Rhiona", "Anseio", "Quer o poder social dela para voltar ao mar."), rel("Rowan", "Neutro", "Viram-se uma vez."), rel("Muirenn", "Gratidão", "Tratou as feridas do naufrágio."), rel("Cavan", "Anseio", "Quer o poder religioso dele."), rel("Malik", "Neutro", "Perguntas demais."), rel("Sorcha", "Respeito", "Pode contar com ela numa luta."), rel("Cormac", "Empatia", "Ele também esconde algo.")],
      idade: 27, resumo: "Náufraga recém-chegada; veio de muito longe." },
    { id: "sorcha", nome: "Sorcha Roth", perfilRegras: "beta-vigilia", fonte: "betaFichas", perfil: "vigilante", ocupacao: "Talentosa", nivel: 3,
      atributos: { fisico: 8, mente: 6, emocao: 8 }, pv: 22, pd: 14,
      pericias: periciasDe(ORDEM_B, [4, 4, 0, 8, 4, 8, 4, 4, 4, 4, 6, 8, 6, 4, 4, 6, 4, 4, 4, 8], [{ esp: "Erudição", dado: 4 }], impressoBeta("")),
      habilidades: [{ id: "prontidao_beta" }, { id: "guardia" }, { id: "instinto_sobrevivencia" }],
      itens: [arma("Lança", "corpo", 2, { efeitos: ["passoContraQuemNaoAtacou"], especial: "+1 passo no primeiro ataque contra um inimigo que ainda não a atacou." }),
        item("Escudo", { efeitos: ["escudo"], especial: "Perdendo um teste oposto de ataque com total 7 ou mais, reduz o dano recebido pela sua rolagem baixa." }),
        item("Elmo aberto", { armadura: 1, passos: { percepcao: -1 }, vestido: true, especial: "1 ponto de armadura; Percepção −1 passo." })],
      atributosImpressos: { intuicao: "fisico", luta: "mente", percepcao: "emocao" },
      relacoes: [rel("Rhiona", "Respeito", "Depende das armas dela."), rel("Rowan", "Neutro", "Prefere distância do lobo."), rel("Muirenn", "Admiração", "Valoriza os remédios."), rel("Cavan", "Proteção", "Acha o monge ingênuo."), rel("Malik", "Neutro", "Mantém-no sob vigilância."), rel("Sira", "Suspeita", "Não acredita na fragilidade dela."), rel("Cormac", "Suspeita", "Postura nobre demais para um andarilho.")],
      idade: 28, resumo: "Guarda de Ballynyr, veterana contra saqueadores." },
    { id: "cormac", nome: "Cormac Coluim", perfilRegras: "beta-vigilia", fonte: "betaFichas", perfil: "executor", ocupacao: "Aristocrata", nivel: 3,
      atributos: { fisico: 8, mente: 8, emocao: 6 }, pv: 17, pd: 15,
      pericias: periciasDe(ORDEM_B, [4, 4, 0, 6, 4, 8, 4, 6, 6, 4, 4, 8, 4, 4, 4, 6, 6, 4, 8, 8], [{ esp: "Erudição", dado: 6 }, { esp: "Guerra", dado: 6 }, { esp: "Nobreza", dado: 6 }], impressoBeta("")),
      habilidades: [{ id: "impeto_beta" }, { id: "heranca" }, { id: "plano_estrategico" }],
      itens: [arma("Espada forjada em castelo", "corpo", 3, { efeitos: ["critico5"], especial: "Crítico com dois valores 5 ou mais." }),
        item("Cota de malha", { armadura: 2, passos: { furtividade: -1 }, vestido: true, especial: "2 pontos de armadura; Furtividade −1 passo." })],
      relacoes: [rel("Rhiona", "Admiração", "A líder que ele não quis ser."), rel("Rowan", "Neutro", "Admira a liberdade nos ermos."), rel("Muirenn", "Neutro", "Teme que ela revele quem ele é."), rel("Cavan", "Vínculo", "A única companhia intelectual da vila.", 2), rel("Malik", "Afinidade", "Gosta das histórias de longe.", 1), rel("Sira", "Neutro", "Ela também esconde algo."), rel("Sorcha", "Confiança", "Aprendeu a confiar em soldados.")],
      idade: 22, resumo: "Andarilho de postura e equipamento aristocráticos." },
  ];
  /* Cavan: a coluna de atributo impressa está trocada em várias linhas. */
  PRESETS.filter(function (p) { return p.id === "cavan"; })[0].atributosImpressos = { inspecionar: "emocao", intuicao: "fisico", luta: "mente", percepcao: "emocao", persuasao: "mente", pontaria: "fisico(d10)", sobrevivencia: "mente(d6)" };
  /* As entradas com dado 0 são as Aptidões substituídas (sem uso). */
  PRESETS.forEach(function (p) { p.pericias = p.pericias.filter(function (x) { return x.dado > 0; }); });

  function preset(id) { return PRESETS.filter(function (p) { return p.id === id; })[0] || null; }

  /* ---------------------------------------------------------------
     DIVERGENCIAS — fonte, escolha e o teste que fixa (docs/ORDEM2.md)
     --------------------------------------------------------------- */
  var DIVERGENCIAS = [
    { id: "compartilhar", fontes: "Alpha p. 23; Beta p. 15", texto: "O texto de Compartilhar pede Pesquisar (DT 10); a tabela-resumo diz Intuição. O Beta não tem Pesquisar.", escolha: "Vale o texto: Pesquisar no Alpha e Inspecionar (a mesma descrição, p. 9) no Beta. O Mestre pode trocar a perícia.", teste: "executar-ordem2: Compartilhar usa a perícia de pesquisa do perfil" },
    { id: "ocultismo", fontes: "Beta p. 9; fichas Beta", texto: "A lista do Beta chama a perícia de Bruxaria; as fichas impressas dizem Ocultismo.", escolha: "Uma chave só (ocultismo); a tela mostra Bruxaria na Vigília e guarda o rótulo impresso no preset.", teste: "executar-ordem2: ocultismo é único e o rótulo segue a ambientação" },
    { id: "oficio", fontes: "Beta p. 9; fichas Beta", texto: "A lista diz Metalurgia; as fichas dizem Ofício (Rhiona: Ofício (Metalurgia)).", escolha: "Metalurgia, com Ofício como alias; a especialização escrita fica.", teste: "executar-ordem2: Ofício é alias de Metalurgia" },
    { id: "atributoImpresso", fontes: "Fichas Beta de Sira, Sorcha e Cavan", texto: "A coluna de atributo-base impressa está desalinhada (ex.: Intuição/Físico, Luta/Mente, Percepção/Emoção).", escolha: "O motor usa o atributo-base da lista (p. 9); o preset guarda o impresso e a confirmação mostra a diferença. O Mestre pode trocar o atributo de um teste.", teste: "executar-ordem2: atributo impresso divergente não muda o atributo-base" },
    { id: "graus", fontes: "Beta pp. 24–25; fichas Beta", texto: "As relações das fichas têm rótulos livres (Confiança, Amizade, Neutro…); os graus são Afinidade, Vínculo e Devoção.", escolha: "O grau não é deduzido do rótulo; só Vínculo e Afinidade de Cormac viram grau. Sem grau, a relação não pode ser invocada até alguém escolher.", teste: "executar-ordem2: rótulo livre não vira grau" },
    { id: "impetoAlpha", fontes: "Alpha p. 15 (Alan); Ato II (Heitor, Raven); fichas Beta", texto: "Ímpeto tem 3 espaços (Alan, Raven), 5 com +d10 e ação extra (Heitor) e 5 que esvaziam no fim da cena (Beta).", escolha: "Cada ficha usa a versão dela; uma ficha nova de Executor no Alpha recebe a de 3 espaços (inferência: a de Alan, nível 2).", teste: "executar-ordem2: as três versões de Ímpeto" },
    { id: "prontidaoAlpha", fontes: "Ato II (Val); fichas Beta", texto: "Prontidão no Alpha é a rodada antecipada por 3 PD; no Beta é a rolagem de novo por 2 PD (e Antecipação Tática é a rodada por 2 PD).", escolha: "Cada ficha usa a sua; Val gasta 3 PD no início do conflito.", teste: "executar-ordem2: Val 18/32 com a Prontidão Alpha" },
    { id: "testeDeMorte", fontes: "Beta pp. 21–23", texto: "Moribundo pede \"teste de morte\"; a p. 21 chama o mesmo teste de \"teste de lesão\".", escolha: "Um só teste (Físico + Vigor, DT 7 +3 por teste na cena) na máquina de estados de lesão.", teste: "executar-ordem2: moribundo faz o teste de lesão no fim da rodada" },
    { id: "naoLetal", fontes: "Beta p. 23", texto: "Dano não letal dá +1d6 no \"teste de morte\" e, num \"ferimento grave\", 2d20 escolhendo o melhor.", escolha: "+d6 no teste de lesão e 2d20 (o maior) na tabela de lesões, quando o zero veio da soma de letal e não letal.", teste: "executar-ordem2: não letal" },
    { id: "patamar", fontes: "Beta pp. 22–23", texto: "Lesão e trauma dão +1 por patamar acima de iniciante, mas o playtest não define patamares.", escolha: "Bônus só quando o patamar estiver informado na ficha (padrão: não informado = +0).", teste: "executar-ordem2: patamar só quando informado" },
    { id: "laceracao", fontes: "Beta p. 22", texto: "Laceração Profunda: \"perde 2 PV\" e é permanente.", escolha: "Inferência: o máximo de PV cai 2 (acumula). Chaga da Alma: o máximo de PD cai 2 enquanto não for curada.", teste: "executar-ordem2: duplicatas e Laceração" },
    { id: "modNumerico", fontes: "Beta pp. 22–23", texto: "Lesões e traumas dão \"−1 em Percepção\", \"−2 em Vigor\"… num sistema de passos.", escolha: "Modificador numérico somado ao resultado do teste; passos continuam passos.", teste: "executar-ordem2: modificador numérico de lesão" },
    { id: "contadorAlpha", fontes: "Alpha p. 26; Beta pp. 21, 23", texto: "Alpha: DT 7 +3 \"por teste já realizado\"; Beta: \"na cena\".", escolha: "Beta zera no fim da cena; Alpha mantém até o Mestre zerar.", teste: "executar-ordem2: zero de PV/PD nos dois perfis" },
    { id: "fases", fontes: "Beta pp. 12, 18, 24", texto: "A p. 12 diz que a ordem de combate virá depois; a p. 18 a define; a p. 18 também cita uma \"fase tática\" e a p. 24 uma \"fase de suporte\".", escolha: "Três fases (Geral → Distância → Corpo a corpo); tática e suporte = Fase Geral. A ordem é configurável por cena.", teste: "executar-ordem2: fases e simultaneidade" },
    { id: "caido", fontes: "Beta pp. 21 e 24", texto: "A p. 21 dá +1 passo ao corpo a corpo e DT +3 à distância contra caído; a p. 24 diz \"ataques\" +1 passo.", escolha: "Vale a p. 21 (mais específica).", teste: "executar-ordem2: modificadores de ataque" },
    { id: "ajudaPagina", fontes: "Beta p. 11", texto: "Ajuda remete à \"página 20\" (a do Alpha).", escolha: "Passos pela p. 12 do Beta.", teste: "—" },
    { id: "escudo", fontes: "Ficha de Sorcha", texto: "\"reduz a sua rolagem baixa do dano recebido\".", escolha: "Inferência: o dano cai pela RB de Sorcha naquele teste.", teste: "executar-ordem2: escudo de Sorcha" },
    { id: "arsenal", fontes: "Ficha de Muirenn", texto: "Os preparados são de uso único, sem quantidade impressa.", escolha: "Inferência: uma dose de cada, editável.", teste: "—" },
    { id: "diarmaid", fontes: "Ficha de Cormac", texto: "A nota de rodapé de Herança fala em \"Diarmaid\" (nome anterior).", escolha: "Nada muda; só registrado.", teste: "—" },
    { id: "ocupacaoAlan", fontes: "Alpha pp. 15 e 62", texto: "A ficha de Alan diz Cientista; a missão o chama de arqueólogo.", escolha: "Vale a ficha.", teste: "executar-ordem2: presets conferidos" },
    /* Etapa 2 (v9.1): procedimentos das missões. */
    { id: "fechaduraSentido", fontes: "Alpha p. 24; Beta p. 16", texto: "\"Alto/baixo\" pode ler-se como o dado posto ou como a senha. O exemplo (senha 3-5-2, tentativa 4-5-1 → baixo, exato, alto) fixa: diz onde está a senha.", escolha: "A resposta descreve a senha em relação ao dado posto. A v9.0 respondia ao contrário e foi corrigida.", teste: "executar-ordem2: senha 3-5-2, tentativa 4-5-1 → baixo, exato, alto" },
    { id: "remissoes", fontes: "Beta pp. 31, 39, 42, 70 (texto) × pp. 33, 37, 43, 71 (arquivo)", texto: "As remissões do texto apontam páginas que, no arquivo, são outras: Afogado (p. 35 → 33), balista (p. 39 → 37), Aughisk (p. 46 → 43), Crias da Floresta (p. 73 → 71).", escolha: "O R.A.M.A. cita a página do arquivo e guarda a do texto na ficha da ameaça.", teste: "executar-ordem2: ameaças com a página do arquivo" },
    { id: "nexAughisk", fontes: "Beta p. 43", texto: "Presença Aterradora diz \"NEX 35%+ evita\" — NEX é da primeira edição e não existe nos playtests.", escolha: "Ignorado: vale o resto (2d6 emocional; Disciplina DT 10 reduz à metade). Não puxamos regra de Ordem I.", teste: "executar-ordem2: Presença Aterradora sem NEX" },
    { id: "rdAughisk", fontes: "Beta pp. 38, 41, 43", texto: "Destruir o crânio tira a \"redução de dano\" do aughisk, mas a ficha não imprime o valor; balista e tocha \"ignoram 5 pontos de RD\".", escolha: "A RD do aughisk fica como lacuna (o Mestre informa no encontro); nada é inventado. O crânio tem RD 5, impresso.", teste: "executar-ordem2: aughisk sem RD inventada" },
    { id: "tochaFase3", fontes: "Beta p. 41", texto: "\"O efeito da tocha é descrito na Fase 3\", mas a Fase 3 não descreve efeito nenhum.", escolha: "As ondas seguem o roteiro da p. 44; a tocha tem um interruptor manual do Mestre (\"a tocha afeta as ondas\") e o ataque da p. 41.", teste: "executar-ordem2: ondas do aughisk pelo roteiro" },
    { id: "ondasCrias", fontes: "Beta p. 70", texto: "A onda \"dura 4 rodadas\", a próxima vem \"no início da quinta\" e depois \"a cada 3 rodadas\"; \"com mais uma criatura por personagem\" pode ser uma por personagem de novo ou uma a mais que a anterior.", escolha: "Ondas nas rodadas 2, 5, 8…; cada uma com 1 cria por personagem (o Mestre pode ligar \"crescente\"). Param quando a chama acende e ao menos duas ondas já vieram.", teste: "executar-ordem2: ondas da gruta param com a chama depois da 2ª" },
    { id: "freezerArrombar", fontes: "Alpha p. 58", texto: "O freezer diz \"Arrombar — DT acumulada 12\", sem a DT do teste.", escolha: "PA 12; a DT do teste fica 7 (a padrão) até o Mestre mudar. Destrancar 4d6 não traz número de tentativas: sem limite até o Mestre definir.", teste: "executar-ordem2: arrombar soma a RA até a PA" },
    { id: "alcancarPericia", fontes: "Beta pp. 17 × 64", texto: "A regra geral de Alcançar usa Acrobacia (DT e DT +3); a plataforma da gruta usa Atletismo DT 7 e DT 10.", escolha: "A cena manda na exceção explícita: o pacote da plataforma traz Atletismo 7/10; o resto usa a regra geral.", teste: "executar-ordem2: alcançar com perícia e DT da cena" },
    { id: "handoutsAto2", fontes: "Alpha pp. 88–100 × ZIP de extras do Ato II", texto: "O texto chama os handouts do Ato II por outros números (Foto do Altar = 01, Depósito B = 03, Freezer = 04, Varredura = 16A/16B); no ZIP são 03, 04, 06 e 02A/02B.", escolha: "O pacote liga cada pista ao arquivo pelo conteúdo e mostra os dois nomes.", teste: "pacote local: anexos com nome do texto e do arquivo" },
    { id: "faltantes", fontes: "Alpha pp. 31–59, 76, 87, 100; ZIPs", texto: "Os handouts e mapas 02/03 do Ato I, as fichas de Victor, Eloísa, Edgar e Kênia, os áudios EMF e as músicas \"O Porão\"/\"O Ídolo\" não vieram nos arquivos.", escolha: "Ficam como referência no pacote, com envio manual ou descrição pelo Mestre (os padrões de bips do texto estão lá).", teste: "pacote local: referências faltantes marcadas" },
    { id: "copiaTrocada", fontes: "Alpha pp. 91, 93, 95, 97, 100; Beta pp. 62–63", texto: "Algumas caixas repetem o texto de outra (Depósito A com a descrição do teto; roupas com as chaves; ferramentas do freezer rotuladas \"Laboratório\"; o altar e o buraco da gruta com linhas da balista e da carroça).", escolha: "O pacote usa o texto que corresponde ao ponto (o do Ato I quando é o mesmo lugar) e não copia a linha trocada.", teste: "—" },
    { id: "sobrecargaIcones", fontes: "Alpha p. 77", texto: "A tabela do porão vem com dados desenhados; no texto extraído viram \"4_on_d4\".", escolha: "Conferida na página renderizada: 0, 0, 1, 1, 1d4, 1d4, 1d6, 1d6 e 2d4 da 9ª em diante.", teste: "pacote local: preset exato do porão" },
  ];

  /* Decisões de implementação (não são regras publicadas). */
  var DECISOES = [
    { id: "tresMaiores", texto: "Com quatro dados de teste, a soma sugerida é a dos três maiores; a pessoa pode escolher outros três (Alpha p. 20; Beta p. 12 não dizem quais)." },
    { id: "sobreviventes", texto: "Crítico, RA e RB leem os dados de teste que sobraram depois do pavor; a escolha dos três afeta só a soma. O dado de pavor nunca entra no crítico. Sem dado sobrando: falha crítica." },
    { id: "pavorPiso", texto: "Controlar o pavor não desce abaixo de d4; o efeito só termina com o resultado 1 (ou pelo Mestre)." },
    { id: "pavorAbraco", texto: "Abraçar o pavor converte o dado em bônus SÓ naquele teste; o pavor continua nos seguintes." },
    { id: "impetoAntes", texto: "Gastar Ímpeto (+d4, +d10) é antes da rolagem." },
    { id: "prontidaoForaDeCombate", texto: "Fora de rodadas, \"uma vez por rodada\" vale uma vez por teste." },
    { id: "passoSemAlvo", texto: "Quando o efeito não diz que dado recebe o passo, a tela pergunta (padrão: a perícia) e registra a escolha." },
    { id: "pvPdGuiada", texto: "Criação guiada: 16 PV e 12 PD de referência inicial de mesa para teste — valores novos, editáveis, não uma dedução do livro." },
    { id: "armadura", texto: "Gastar o ponto de armadura é marcado ao aplicar o dano (uma vez por ocorrência)." },
    { id: "efeitoEmGrupo", texto: "Efeitos que pedem um teste de todos ao mesmo tempo (Presença Aterradora, Enxurrada, o susto dos afogados, o Ídolo) rolam direto no servidor, sem escolhas pós-rolagem; o resultado fica no registro." },
    { id: "sustentarRodada", texto: "O novo teste de Sustentar no fim da rodada é rolado na hora de encerrar a rodada, com −1 passo por rodada já sustentada, para quem não soltou." },
    { id: "umaVezPorRodada", texto: "Encerrar uma rodada leva o número dela: repetir o pedido (mesma operação ou outra janela) não aplica sobrecarga, afogamento, ondas ou dano de perseguição duas vezes." },
    { id: "criticoAvanco", texto: "Pontuação de arrombar, escalar e avançar: a RA; no crítico do Beta, as duas maiores (a regra da p. 11 para pontuações)." },
    { id: "criticoEsconderijo", texto: "Crítico no esconderijo: o dado extra é do maior tipo rolado no teste." },
    { id: "hackSocialDt", texto: "Sem DT impressa para o hack social, vale 7 até o Mestre mudar; respostas são conferidas sem acento, maiúsculas nem pontuação, e o Mestre pode aceitar uma resposta à mão." },
    { id: "laboratorioRerrolar", texto: "Laboratório: os dados saem um por vez; as novas rolagens (metade da Mente) podem ser gastas em qualquer dado já rolado, antes de concluir." },
  ];

  global.RAMAOrdem2Catalogo = {
    VERSAO_DADOS: VERSAO_DADOS,
    FONTES: FONTES, referencia: referencia,
    PERFIS_REGRAS: PERFIS_REGRAS, ORDEM_PERFIS_REGRAS: ORDEM_PERFIS_REGRAS, AMBIENTACOES: AMBIENTACOES,
    ATRIBUTOS: ATRIBUTOS, ORDEM_ATRIBUTOS: ORDEM_ATRIBUTOS, DEGRAUS: DEGRAUS, ESCALA_ATRIBUTO: ESCALA_ATRIBUTO, ESCALA_PERICIA: ESCALA_PERICIA,
    PERICIAS_ALPHA: PERICIAS_ALPHA, PERICIAS_BETA: PERICIAS_BETA, ESPECIALIZACOES: ESPECIALIZACOES, ALIASES: ALIASES,
    listaDePericias: listaDePericias, pericia: pericia, nomeDaPericia: nomeDaPericia, periciaDePesquisa: periciaDePesquisa,
    PERFIS: PERFIS, ORDEM_PERFIS: ORDEM_PERFIS, HABILIDADE_DE_PERFIL: HABILIDADE_DE_PERFIL,
    HABILIDADES: HABILIDADES, OCUPACOES: OCUPACOES, GRAUS_RELACAO: GRAUS_RELACAO,
    FALHA_CRITICA: FALHA_CRITICA, LESOES: LESOES, TRAUMAS: TRAUMAS, daTabela: daTabela, PATAMARES: PATAMARES,
    FASES: FASES, ORDEM_FASES_PADRAO: ORDEM_FASES_PADRAO, ORDEM_FASES_4: ORDEM_FASES_4, ACOES_COMBATE: ACOES_COMBATE, ACOES_LIVRES: ACOES_LIVRES, faseDaAcao: faseDaAcao,
    MINIJOGOS: MINIJOGOS, PARANORMAL: PARANORMAL,
    FERRAMENTAS: FERRAMENTAS, ORDEM_FERRAMENTAS: ORDEM_FERRAMENTAS, RADIO_FALSOS: RADIO_FALSOS, falsosDoRadio: falsosDoRadio,
    SOBRECARGA: SOBRECARGA, DESAFIOS: DESAFIOS, ESCONDERIJO_CRIATURAS: ESCONDERIJO_CRIATURAS,
    PRESETS: PRESETS, preset: preset, IMPRESSO_BETA: IMPRESSO_BETA,
    DIVERGENCIAS: DIVERGENCIAS, DECISOES: DECISOES,
  };
})(typeof window !== "undefined" ? window : globalThis);
/* <<< js/ordem2/catalogo.js */

/* >>> js/ordem2/regras.js */
/* =====================================================================
   R.A.M.A. — Ordem Paranormal RPG II (Experimental) · a ficha (v9.0)
   ---------------------------------------------------------------------
   O bloco `ficha.ordem2`. Separado de propósito:

     base        os DADOS-BASE: atributos e perícias como estão na ficha
     efeitos     o que muda temporariamente (passos de Ímpeto, falha
                 crítica, contusão…), com expiração — nunca reescreve a base
     recursos    PV e PD (máximo impresso/decidido e atual), dano não letal
                 anotado à parte, pontos de armadura gastos
     estado      condições, lesões, traumas, pavor, contadores de cena,
                 testes pendentes, reservas de dados, usos
     procedencia de onde a ficha veio (preset, página, versão dos dados)
     escolhas    o que a criação guiada distribuiu

   PV e PD de uma ficha pronta são os IMPRESSOS; nada é calculado por
   fórmula. A guiada sugere 16/12, editáveis (decisão de mesa, não regra).

   O perfil de regras (`alpha-contemporaneo` | `beta-vigilia`) é fixo
   na ficha; a campanha tem o dela, e a tela avisa quando divergem.

   Copiado para backend/Ordem2.gs (testes/gerar-ordem2-gs.js).
   ===================================================================== */

(function (global) {
  "use strict";

  function K() { return global.RAMAOrdem2Catalogo; }

  var VERSAO = 1;
  var MAX_OPS = 120;

  function texto(v, max) { return String(v === undefined || v === null ? "" : v).slice(0, max || 400); }
  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  function lista(v) { return Array.isArray(v) ? v : []; }
  function inteiro(v, min, max, padrao) {
    var n = Math.floor(Number(v));
    if (!isFinite(n)) n = padrao === undefined ? 0 : padrao;
    if (min !== undefined && n < min) n = min;
    if (max !== undefined && n > max) n = max;
    return n;
  }
  function copiar(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }

  /* Ids: o mesmo bloco roda no navegador e no Apps Script. */
  function novoId() {
    if (global.RAMAUtil && global.RAMAUtil.uuid) return global.RAMAUtil.uuid();
    if (typeof Utilities !== "undefined" && Utilities.getUuid) return Utilities.getUuid();
    return "o2-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e9).toString(36);
  }

  var FACES = [4, 6, 8, 10, 12, 20];
  function faces(v, padrao) {
    var n = inteiro(v, 0, 20, padrao || 4);
    return FACES.indexOf(n) >= 0 ? n : (padrao || 4);
  }
  function perfilValido(p) { return K().PERFIS_REGRAS[p] ? p : "beta-vigilia"; }

  /* ---------------------------------------------------------------
     O VAZIO E A NORMALIZAÇÃO
     --------------------------------------------------------------- */
  function periciasBase(perfil) {
    return K().listaDePericias(perfil).map(function (p) { return { id: novoId(), chave: p.chave, especializacao: "", dado: 4, rotuloImpresso: "", atributoImpresso: "" }; });
  }

  function fichaVazia(perfil) {
    var pr = perfilValido(perfil || "beta-vigilia");
    return {
      versao: VERSAO,
      perfilRegras: pr,
      ambientacao: K().PERFIS_REGRAS[pr].ambientacao,
      modoCriacao: "livre",
      procedencia: null,
      escolhas: null,
      perfil: "",
      ocupacao: { id: "", nome: "", personalizada: false },
      nivel: 1,
      patamar: "",
      idade: "",
      resumo: "",
      historia: "",
      aparencia: "",
      base: { atributos: { fisico: 6, mente: 6, emocao: 6 }, pericias: periciasBase(pr) },
      recursos: { pv: { max: 16, atual: 16 }, pd: { max: 12, atual: 12 }, naoLetal: 0, armaduraGasta: 0 },
      habilidades: [],
      itens: [],
      relacoes: [],
      efeitos: [],
      estado: estadoVazio(),
      historico: [],
      local: null,
      operacoes: [],
      /* v9.2: registros de evolução (separados dos impressos) e o bloco
         paranormal experimental (rituais conhecidos, em andamento, ativos). */
      evolucao: { nex: "", pendente: null, registros: [] },
      paranormal: { rituais: [], emAndamento: null, ativos: [], historico: [] },
    };
  }

  function estadoVazio() {
    return {
      inconsciente: false, moribundo: false, caido: false, morto: false, colapso: false,
      morteLenta: false, morteLentaRodada: null,
      lesoes: [], traumas: [],
      pavor: 0,
      testesLesao: 0, testesTrauma: 0,
      pendentes: [],
      reservas: [],
      acaoExtra: 0, perdeAcao: 0, /* 2: perde na próxima rodada; 1: nesta */
      usos: {},
      missaoLocal: 1,
    };
  }

  function normalizarPericia(x, perfil) {
    var p = obj(x);
    var chave = texto(p.chave, 40).toLowerCase();
    if (K().ALIASES[chave]) chave = K().ALIASES[chave];
    if (!chave) return null;
    return {
      id: texto(p.id, 80) || novoId(),
      chave: chave,
      especializacao: texto(p.especializacao, 40),
      dado: faces(p.dado, 4),
      rotuloImpresso: texto(p.rotuloImpresso, 60),
      atributoImpresso: texto(p.atributoImpresso, 20),
    };
  }

  function normalizarHabilidade(x) {
    var h = obj(x);
    var ref = texto(h.ref, 60);
    var cat = K().HABILIDADES[ref];
    var e = obj(h.estado);
    return {
      id: texto(h.id, 80) || novoId(),
      ref: cat ? ref : "",
      nome: texto(h.nome || (cat ? cat.nome : ""), 80),
      texto: texto(h.texto || (cat ? cat.texto : ""), 1200),
      param: obj(copiar(h.param)),
      personalizada: !cat,
      origemEvolucao: texto(h.origemEvolucao, 80),
      estado: {
        espacos: inteiro(e.espacos, 0, 20),
        marcadores: inteiro(e.marcadores, 0, 20),
        reserva: lista(e.reserva).map(function (r) { var o = obj(r); return { id: texto(o.id, 80) || novoId(), faces: faces(o.faces, 4), alvo: texto(o.alvo, 120) }; }).slice(0, 8),
        indisponivel: e.indisponivel === true,
      },
    };
  }

  function normalizarItem(x) {
    var i = obj(x);
    var passos = {};
    Object.keys(obj(i.passos)).forEach(function (k) { passos[texto(k, 40)] = inteiro(i.passos[k], -4, 4); });
    return {
      id: texto(i.id, 80) || novoId(),
      nome: texto(i.nome, 120) || "Item",
      tipo: i.tipo === "arma" ? "arma" : "item",
      alcance: i.alcance === "distancia" ? "distancia" : "corpo",
      dano: inteiro(i.dano, -10, 50),
      categoria: texto(i.categoria, 30),
      armadura: inteiro(i.armadura, 0, 20),
      passos: passos,
      vestido: i.vestido === true,
      quantidade: i.quantidade === undefined || i.quantidade === null ? null : inteiro(i.quantidade, 0, 999),
      consumivel: texto(i.consumivel, 30),
      efeitos: lista(i.efeitos).map(function (s) { return texto(s, 40); }).filter(Boolean).slice(0, 8),
      especial: texto(i.especial, 600),
      descricao: texto(i.descricao, 1200),
    };
  }

  function normalizarRelacao(x) {
    var r = obj(x);
    return {
      id: texto(r.id, 80) || novoId(),
      nome: texto(r.nome, 80),
      alvoPersonagemId: texto(r.alvoPersonagemId, 80),
      rotulo: texto(r.rotulo, 60),
      descricao: texto(r.descricao, 600),
      grau: [0, 1, 2, 3].indexOf(Number(r.grau)) >= 0 ? Number(r.grau) : 0,
      usadaEm: texto(r.usadaEm, 80),
    };
  }

  var TIPOS_EFEITO = ["passoAtributo", "passoPericia", "passoTodos", "dado", "acaoExtra"];
  var EXPIRA = ["teste", "rodada", "cena", "missao", "permanente"];
  function normalizarEfeito(x) {
    var e = obj(x);
    if (TIPOS_EFEITO.indexOf(e.tipo) < 0) return null;
    return {
      id: texto(e.id, 80) || novoId(),
      tipo: e.tipo,
      alvo: texto(e.alvo, 40),
      n: inteiro(e.n, -4, 4),
      faces: e.faces ? faces(e.faces, 4) : 0,
      expira: EXPIRA.indexOf(e.expira) >= 0 ? e.expira : "cena",
      fonte: texto(e.fonte, 80),
      d20: e.d20 === true,
    };
  }

  function normalizarEstado(x) {
    var s = obj(x);
    var v = estadoVazio();
    ["inconsciente", "moribundo", "caido", "morto", "colapso", "morteLenta"].forEach(function (k) { v[k] = s[k] === true; });
    v.perdeAcao = s.perdeAcao === true ? 2 : inteiro(s.perdeAcao, 0, 2);
    v.morteLentaRodada = s.morteLentaRodada === null || s.morteLentaRodada === undefined ? null : inteiro(s.morteLentaRodada, 0, 100000);
    v.lesoes = lista(s.lesoes).map(function (l) { var o = obj(l); return { id: texto(o.id, 80) || novoId(), ref: texto(o.ref, 40), nome: texto(o.nome, 80), quando: texto(o.quando, 40) }; }).slice(0, 40);
    v.traumas = lista(s.traumas).map(function (l) { var o = obj(l); return { id: texto(o.id, 80) || novoId(), ref: texto(o.ref, 40), nome: texto(o.nome, 80), curado: o.curado === true, quando: texto(o.quando, 40) }; }).slice(0, 40);
    v.pavor = s.pavor ? faces(s.pavor, 6) : 0;
    v.testesLesao = inteiro(s.testesLesao, 0, 50);
    v.testesTrauma = inteiro(s.testesTrauma, 0, 50);
    v.pendentes = lista(s.pendentes).map(function (p) {
      var o = obj(p);
      if (["lesao", "trauma", "vigorAlpha", "disciplinaAlpha"].indexOf(o.tipo) < 0) return null;
      return { id: texto(o.id, 80) || novoId(), tipo: o.tipo, dt: inteiro(o.dt, 0, 99, 7), naoLetal: o.naoLetal === true, motivo: texto(o.motivo, 120) };
    }).filter(Boolean).slice(0, 10);
    v.reservas = lista(s.reservas).map(function (r) { var o = obj(r); return { id: texto(o.id, 80) || novoId(), faces: faces(o.faces, 6), fonte: texto(o.fonte, 80), expira: EXPIRA.indexOf(o.expira) >= 0 ? o.expira : "cena", alvo: texto(o.alvo, 120) }; }).slice(0, 16);
    v.acaoExtra = inteiro(s.acaoExtra, 0, 5);
    v.usos = {};
    Object.keys(obj(s.usos)).forEach(function (k) { v.usos[texto(k, 60)] = copiar(s.usos[k]); });
    v.missaoLocal = inteiro(s.missaoLocal, 1, 100000, 1);
    return v;
  }

  function normalizarProcedencia(x) {
    if (!x || typeof x !== "object") return null;
    var p = obj(x);
    var impressos = {};
    Object.keys(obj(p.atributosImpressos)).forEach(function (k) { impressos[texto(k, 40)] = texto(p.atributosImpressos[k], 30); });
    return {
      preset: texto(p.preset, 40), nome: texto(p.nome, 120), fonte: texto(p.fonte, 40), pagina: p.pagina ? inteiro(p.pagina, 1, 999) : null,
      versaoDados: inteiro(p.versaoDados, 0, 9999), copiadoEm: texto(p.copiadoEm, 40), atributosImpressos: impressos,
    };
  }

  function normalizar(bruto) {
    var b = obj(bruto);
    var v = fichaVazia(b.perfilRegras);
    var pr = v.perfilRegras;
    v.ambientacao = K().AMBIENTACOES[b.ambientacao] ? b.ambientacao : K().PERFIS_REGRAS[pr].ambientacao;
    v.modoCriacao = ["pronta", "livre", "guiada"].indexOf(b.modoCriacao) >= 0 ? b.modoCriacao : "livre";
    v.procedencia = normalizarProcedencia(b.procedencia);
    v.escolhas = b.escolhas && typeof b.escolhas === "object" ? copiar(b.escolhas) : null;
    v.perfil = K().PERFIS[b.perfil] ? b.perfil : "";
    var oc = obj(b.ocupacao);
    v.ocupacao = { id: texto(oc.id, 40), nome: texto(oc.nome, 80), personalizada: oc.personalizada === true };
    v.nivel = inteiro(b.nivel, 1, 10, 1);
    v.patamar = K().PATAMARES[b.patamar] ? b.patamar : "";
    v.idade = texto(b.idade, 20);
    v.resumo = texto(b.resumo, 600);
    v.historia = texto(b.historia, 6000);
    v.aparencia = texto(b.aparencia, 2000);
    var base = obj(b.base);
    var at = obj(base.atributos);
    v.base.atributos = { fisico: faces(at.fisico, 6), mente: faces(at.mente, 6), emocao: faces(at.emocao, 6) };
    if (Array.isArray(base.pericias)) v.base.pericias = base.pericias.map(function (p) { return normalizarPericia(p, pr); }).filter(Boolean).slice(0, 60);
    var r = obj(b.recursos);
    var pv = obj(r.pv), pd = obj(r.pd);
    v.recursos.pv.max = inteiro(pv.max, 1, 999, 16);
    v.recursos.pv.atual = inteiro(pv.atual === undefined ? v.recursos.pv.max : pv.atual, 0, 999);
    v.recursos.pd.max = inteiro(pd.max, 1, 999, 12);
    v.recursos.pd.atual = inteiro(pd.atual === undefined ? v.recursos.pd.max : pd.atual, 0, 999);
    v.recursos.naoLetal = inteiro(r.naoLetal, 0, 999);
    v.recursos.armaduraGasta = inteiro(r.armaduraGasta, 0, 99);
    v.habilidades = lista(b.habilidades).map(normalizarHabilidade).slice(0, 40);
    v.itens = lista(b.itens).map(normalizarItem).slice(0, 80);
    v.relacoes = lista(b.relacoes).map(normalizarRelacao).slice(0, 24);
    v.efeitos = lista(b.efeitos).map(normalizarEfeito).filter(Boolean).slice(0, 40);
    v.estado = normalizarEstado(b.estado);
    v.historico = lista(b.historico).map(function (h) { var o = obj(h); return { quando: texto(o.quando, 40), tipo: texto(o.tipo, 30), texto: texto(o.texto, 400), corrigido: o.corrigido === true }; }).slice(-80);
    v.local = b.local && typeof b.local === "object" ? (global.RAMAOrdem2Mesa ? global.RAMAOrdem2Mesa.normalizar(b.local) : copiar(b.local)) : null;
    v.operacoes = lista(b.operacoes).map(function (x) { return texto(x, 80); }).filter(Boolean).slice(-MAX_OPS);
    v.evolucao = global.RAMAOrdem2Evolucao ? global.RAMAOrdem2Evolucao.normalizar(b.evolucao) : (b.evolucao && typeof b.evolucao === "object" ? copiar(b.evolucao) : v.evolucao);
    v.paranormal = global.RAMAOrdem2Paranormal ? global.RAMAOrdem2Paranormal.normalizarBloco(b.paranormal) : (b.paranormal && typeof b.paranormal === "object" ? copiar(b.paranormal) : v.paranormal);
    /* Atual nunca acima do máximo efetivo. */
    v.recursos.pv.atual = Math.min(v.recursos.pv.atual, pvMax(v));
    v.recursos.pd.atual = Math.min(v.recursos.pd.atual, pdMax(v));
    return v;
  }

  /* ---------------------------------------------------------------
     O QUE A FICHA É AGORA (base + efeitos + itens + estado)
     --------------------------------------------------------------- */
  function habilidadePorRef(b, ref) { return lista(b.habilidades).filter(function (h) { return h.ref === ref; })[0] || null; }
  function temHabilidade(b, ref) { return !!habilidadePorRef(b, ref); }
  /* O motor de uma habilidade, com os parâmetros próprios da ficha
     (Foco Mental de Alan: 2 PD/+d4; de Amanda: 4 PD/+d8). */
  function motorDe(h) {
    var cat = K().HABILIDADES[h.ref];
    if (!cat || !cat.motor) return null;
    var m = copiar(cat.motor);
    Object.keys(obj(h.param)).forEach(function (k) { m[k] = h.param[k]; });
    return m;
  }
  function habilidadesDoTipo(b, tipo) {
    return lista(b.habilidades).filter(function (h) { var m = motorDe(h); return m && m.tipo === tipo; });
  }

  function pericia(b, idOuChave) {
    var l = lista(b.base.pericias);
    return l.filter(function (p) { return p.id === idOuChave; })[0] ||
      l.filter(function (p) { return p.chave === (K().ALIASES[idOuChave] || idOuChave); })[0] || null;
  }
  function atributoBase(b, chave) {
    var p = K().pericia(b.perfilRegras, chave);
    if (p) return p.atributo;
    var outra = K().pericia(b.perfilRegras === "beta-vigilia" ? "alpha-contemporaneo" : "beta-vigilia", chave);
    return outra ? outra.atributo : "mente";
  }
  function nomeDaPericia(b, p) {
    var n = K().nomeDaPericia(b.perfilRegras, p.chave, b.ambientacao);
    return p.especializacao && p.chave === "aptidao" ? n + " (" + p.especializacao + ")" : n;
  }

  function passoDado(f, n, permitir20) {
    var D = [4, 6, 8, 10, 12];
    if (f === 20) return n < 0 ? passoDado(12, n + 1, permitir20) : 20;
    var i = D.indexOf(f);
    if (i < 0) i = 0;
    var j = i + n;
    if (j < 0) j = 0;
    if (j > 4) return permitir20 ? 20 : 12;
    return D[j];
  }

  /* Passos permanentes de itens vestidos (cota: Furtividade −1; elmo:
     Percepção −1). */
  function passosDeItens(b, periciaChave) {
    var n = 0;
    lista(b.itens).forEach(function (i) { if (i.vestido && i.passos && i.passos[periciaChave]) n += i.passos[periciaChave]; });
    return n;
  }
  function passosDeEfeitos(b, tipo, alvo) {
    var n = 0, d20 = false;
    lista(b.efeitos).forEach(function (e) {
      if (e.tipo === tipo && (e.alvo === alvo || !alvo)) { n += e.n; if (e.d20) d20 = true; }
    });
    return { n: n, d20: d20 };
  }
  /* Evolução (v9.2): os passos dos registros vivos entram como passos
     permanentes — o valor impresso em `base` não muda. */
  function EV() { return global.RAMAOrdem2Evolucao; }
  function dadoDoAtributo(b, chave) {
    var e = passosDeEfeitos(b, "passoAtributo", chave);
    var base = b.evolucao && EV() ? EV().permanenteAtributo(b, chave) : (b.base.atributos[chave] || 6);
    if (b.base.atributos[chave] === 20) base = 20;
    return passoDado(base, e.n, e.d20);
  }
  function dadoDaPericia(b, p) {
    if (!p) return 4;
    var e = passosDeEfeitos(b, "passoPericia", p.chave);
    var base = b.evolucao && EV() && p.dado !== 20 ? EV().permanentePericia(b, p) : p.dado;
    return passoDado(base, e.n + passosDeItens(b, p.chave), e.d20);
  }

  /* Modificadores NUMÉRICOS de lesões e traumas (ver DIVERGENCIAS). */
  function modificadorNumerico(b, periciaChave, atributo) {
    var n = 0, partes = [];
    lista(b.estado.lesoes).forEach(function (l) {
      var t = K().LESOES.filter(function (x) { return x.id === l.ref; })[0];
      if (t && t.efeito && t.efeito.tipo === "modPericia" && t.efeito.pericias[periciaChave]) { n += t.efeito.pericias[periciaChave]; partes.push(t.nome); }
    });
    lista(b.estado.traumas).forEach(function (l) {
      if (l.curado) return;
      var t = K().TRAUMAS.filter(function (x) { return x.id === l.ref; })[0];
      if (!t || !t.efeito) return;
      if (t.efeito.tipo === "modPericia" && t.efeito.pericias[periciaChave]) { n += t.efeito.pericias[periciaChave]; partes.push(t.nome); }
      if (t.efeito.tipo === "modAtributo" && t.efeito.atributo === atributo) { n += t.efeito.valor; partes.push(t.nome); }
    });
    return { valor: n, fontes: partes };
  }

  function pvMax(b) {
    var n = b.recursos.pv.max + (b.evolucao && EV() ? EV().extra(b, "pv") : 0);
    lista(b.estado && b.estado.lesoes).forEach(function (l) { if (l.ref === "laceracao") n -= 2; });
    return Math.max(1, n);
  }
  function pdMax(b) {
    var n = b.recursos.pd.max + (b.evolucao && EV() ? EV().extra(b, "pd") : 0);
    lista(b.estado && b.estado.traumas).forEach(function (l) { if (l.ref === "chaga" && !l.curado) n -= 2; });
    return Math.max(1, n);
  }
  /* Pontos de armadura: os dos itens vestidos (+1 com Segredo do Aço). */
  function armaduraMax(b) {
    var n = 0, vestindo = false;
    lista(b.itens).forEach(function (i) { if (i.vestido && i.armadura > 0) { n += i.armadura; vestindo = true; } });
    if (vestindo) habilidadesDoTipo(b, "armaduraExtra").forEach(function (h) { n += Number(motorDe(h).valor) || 1; });
    return n;
  }
  function armaduraAtual(b) { return Math.max(0, armaduraMax(b) - b.recursos.armaduraGasta); }

  function condicoes(b) {
    var s = b.estado, l = [];
    if (s.morto) l.push("morto");
    if (s.colapso) l.push("colapso");
    if (s.morteLenta) l.push("morteLenta");
    if (s.moribundo) l.push("moribundo");
    if (s.inconsciente) l.push("inconsciente");
    if (s.caido) l.push("caido");
    if (s.pavor) l.push("pavor");
    if (s.perdeAcao) l.push("perdeAcao");
    return l;
  }
  var NOMES_CONDICAO = { morto: "Morto", colapso: "Colapso total", morteLenta: "Morte lenta", moribundo: "Moribundo", inconsciente: "Inconsciente", caido: "Caído", pavor: "Pavor", perdeAcao: "Perde a próxima ação" };

  /* ---------------------------------------------------------------
     CRIAÇÃO
     --------------------------------------------------------------- */
  function habilidadeDoCatalogo(ref, param) {
    var cat = K().HABILIDADES[ref];
    return normalizarHabilidade({ id: novoId(), ref: ref, nome: cat ? cat.nome : ref, texto: cat ? cat.texto : "", param: param || {} });
  }

  /* Uma CÓPIA de um preset: ids próprios, procedência e os números
     impressos. Nada é recalculado. */
  function dePreset(id, agora) {
    var p = K().preset(id);
    if (!p) return null;
    var v = fichaVazia(p.perfilRegras);
    v.modoCriacao = "pronta";
    v.procedencia = { preset: p.id, nome: p.nome, fonte: p.fonte, pagina: p.pagina || null, versaoDados: K().VERSAO_DADOS, copiadoEm: agora || new Date().toISOString(), atributosImpressos: copiar(p.atributosImpressos || {}) };
    v.perfil = p.perfil;
    var oc = (K().OCUPACOES[p.perfilRegras] || []).filter(function (o) { return o.nome === p.ocupacao; })[0];
    v.ocupacao = { id: oc ? oc.id : "", nome: p.ocupacao, personalizada: !oc };
    v.nivel = p.nivel;
    v.idade = p.idade ? String(p.idade) : "";
    v.resumo = p.resumo || "";
    v.base.atributos = copiar(p.atributos);
    v.base.pericias = p.pericias.map(function (x) {
      var e = normalizarPericia(Object.assign({ id: novoId() }, x), p.perfilRegras);
      if (p.atributosImpressos && p.atributosImpressos[e.chave]) e.atributoImpresso = p.atributosImpressos[e.chave];
      return e;
    });
    v.recursos = { pv: { max: p.pv, atual: p.pv }, pd: { max: p.pd, atual: p.pd }, naoLetal: 0, armaduraGasta: 0 };
    v.habilidades = p.habilidades.map(function (h) { return habilidadeDoCatalogo(h.id, h.param); });
    v.itens = p.itens.map(function (i) { return normalizarItem(Object.assign({ id: novoId() }, i)); });
    v.relacoes = p.relacoes.map(function (r) { return normalizarRelacao(Object.assign({ id: novoId() }, r)); });
    return normalizar(v);
  }

  /* A criação guiada (experimental): confere a distribuição. */
  var GUIADA = { nivel: 1, atributoInicial: 6, passosAtributo: 2, tetoAtributo: 10, periciaInicial: 4, passosPericia: 8, tetoPericia: 8, pv: 16, pd: 12 };
  function passosEntre(de, ate) { var D = [4, 6, 8, 10, 12]; return D.indexOf(ate) - D.indexOf(de); }
  function conferirGuiada(o) {
    var erros = [];
    var at = obj(o.atributos);
    var gastosA = 0;
    K().ORDEM_ATRIBUTOS.forEach(function (k) {
      var f = faces(at[k], 6);
      if (f === 20) erros.push("d20 não é permitido na criação guiada.");
      var n = passosEntre(GUIADA.atributoInicial, f);
      if (n < 0) erros.push(K().ATRIBUTOS[k].nome + " não pode ficar abaixo de d6 na guiada.");
      if (f > GUIADA.tetoAtributo) erros.push(K().ATRIBUTOS[k].nome + ": o teto da guiada é d10.");
      gastosA += Math.max(0, n);
    });
    if (gastosA > GUIADA.passosAtributo) erros.push("Atributos: " + gastosA + " passos usados de " + GUIADA.passosAtributo + ".");
    var gastosP = 0;
    lista(o.pericias).forEach(function (p) {
      var f = faces(p.dado, 4);
      if (f === 20) erros.push("d20 não é permitido na criação guiada.");
      if (f > GUIADA.tetoPericia) erros.push("Perícias: o teto da guiada é d8 por entrada.");
      gastosP += Math.max(0, passosEntre(GUIADA.periciaInicial, f));
    });
    if (gastosP > GUIADA.passosPericia) erros.push("Perícias: " + gastosP + " passos usados de " + GUIADA.passosPericia + ".");
    if (!K().PERFIS[o.perfil]) erros.push("Escolha o perfil.");
    if (!texto(o.ocupacaoNome).trim()) erros.push("Escolha ou escreva a " + K().PERFIS_REGRAS[perfilValido(o.perfilRegras)].termoOcupacao.toLowerCase() + ".");
    return { ok: !erros.length, erros: erros.filter(function (e, i, t) { return t.indexOf(e) === i; }), passosAtributo: gastosA, passosPericia: gastosP };
  }
  function deGuiada(o) {
    var c = conferirGuiada(o);
    if (!c.ok) return { ok: false, erros: c.erros };
    var pr = perfilValido(o.perfilRegras);
    var v = fichaVazia(pr);
    v.modoCriacao = "guiada";
    v.perfil = o.perfil;
    var oc = (K().OCUPACOES[pr] || []).filter(function (x) { return x.id === o.ocupacaoId; })[0];
    v.ocupacao = { id: oc ? oc.id : "", nome: texto(o.ocupacaoNome, 80), personalizada: !oc };
    v.nivel = GUIADA.nivel;
    v.base.atributos = { fisico: faces(o.atributos.fisico, 6), mente: faces(o.atributos.mente, 6), emocao: faces(o.atributos.emocao, 6) };
    v.base.pericias = lista(o.pericias).map(function (p) { return normalizarPericia(p, pr); }).filter(Boolean);
    var pv = inteiro(o.pv, 1, 999, GUIADA.pv), pd = inteiro(o.pd, 1, 999, GUIADA.pd);
    v.recursos = { pv: { max: pv, atual: pv }, pd: { max: pd, atual: pd }, naoLetal: 0, armaduraGasta: 0 };
    var habs = [];
    var dePerfil = K().HABILIDADE_DE_PERFIL[pr][o.perfil];
    if (dePerfil) habs.push(habilidadeDoCatalogo(dePerfil));
    var daOc = texto(o.habilidadeOcupacao, 60);
    if (daOc && K().HABILIDADES[daOc] && daOc !== dePerfil) habs.push(habilidadeDoCatalogo(daOc));
    v.habilidades = habs;
    v.escolhas = { passosAtributo: c.passosAtributo, passosPericia: c.passosPericia, pvPdReferencia: { pv: GUIADA.pv, pd: GUIADA.pd, editados: pv !== GUIADA.pv || pd !== GUIADA.pd }, habilidadeOcupacao: daOc || "", habilidadeOcupacaoDocumentada: !!(oc && oc.habilidade && oc.habilidade === daOc) };
    v.nivel = 1;
    return { ok: true, bloco: normalizar(v) };
  }

  /* ---------------------------------------------------------------
     O RESUMO QUE A MESA LÊ
     --------------------------------------------------------------- */
  function resumoParaMesa(bruto) {
    var b = normalizar(bruto);
    return {
      perfilRegras: b.perfilRegras,
      perfil: b.perfil, perfilNome: b.perfil ? K().PERFIS[b.perfil].nome : "",
      ocupacao: b.ocupacao.nome, nivel: b.nivel,
      atributos: { fisico: dadoDoAtributo(b, "fisico"), mente: dadoDoAtributo(b, "mente"), emocao: dadoDoAtributo(b, "emocao") },
      pv: { atual: b.recursos.pv.atual, max: pvMax(b), naoLetal: b.recursos.naoLetal },
      pd: { atual: b.recursos.pd.atual, max: pdMax(b) },
      armadura: { atual: armaduraAtual(b), max: armaduraMax(b) },
      pavor: b.estado.pavor,
      condicoes: condicoes(b),
      lesoes: b.estado.lesoes.length,
      traumas: b.estado.traumas.filter(function (t) { return !t.curado; }).length,
      preset: b.procedencia ? b.procedencia.preset : "",
      evolucao: global.RAMAOrdem2Evolucao ? global.RAMAOrdem2Evolucao.resumo(b) : null,
      paranormal: global.RAMAOrdem2Paranormal ? global.RAMAOrdem2Paranormal.resumo(b) : null,
    };
  }

  /* Uma alteração com id: repetir o mesmo id não aplica de novo. */
  function aplicarOperacao(b, opId, fn) {
    if (opId && b.operacoes.indexOf(opId) >= 0) return { ok: true, repetida: true, eventos: [] };
    var copia = copiar(b);
    var r = fn(copia) || { ok: true };
    if (r.ok === false) return r;
    Object.keys(copia).forEach(function (k) { b[k] = copia[k]; });
    if (opId) { b.operacoes.push(opId); b.operacoes = b.operacoes.slice(-MAX_OPS); }
    return r;
  }

  /* O preset mudou desde a cópia? Só para AVISAR — a ficha não muda. */
  function presetDesatualizado(b) {
    return !!(b.procedencia && b.procedencia.preset && b.procedencia.versaoDados && b.procedencia.versaoDados !== K().VERSAO_DADOS);
  }

  global.RAMAOrdem2 = {
    VERSAO: VERSAO,
    fichaVazia: fichaVazia,
    normalizar: normalizar,
    estadoVazio: estadoVazio,
    normalizarItem: normalizarItem, normalizarRelacao: normalizarRelacao, normalizarHabilidade: normalizarHabilidade, normalizarEfeito: normalizarEfeito, normalizarPericia: normalizarPericia,
    novoId: novoId, copiar: copiar, inteiro: inteiro, texto: texto, faces: faces,
    pericia: pericia, atributoBase: atributoBase, nomeDaPericia: nomeDaPericia,
    passoDado: passoDado, dadoDoAtributo: dadoDoAtributo, dadoDaPericia: dadoDaPericia,
    modificadorNumerico: modificadorNumerico,
    pvMax: pvMax, pdMax: pdMax, armaduraMax: armaduraMax, armaduraAtual: armaduraAtual,
    condicoes: condicoes, NOMES_CONDICAO: NOMES_CONDICAO,
    habilidadePorRef: habilidadePorRef, temHabilidade: temHabilidade, motorDe: motorDe, habilidadesDoTipo: habilidadesDoTipo,
    habilidadeDoCatalogo: habilidadeDoCatalogo,
    dePreset: dePreset, GUIADA: GUIADA, conferirGuiada: conferirGuiada, deGuiada: deGuiada,
    resumoParaMesa: resumoParaMesa, aplicarOperacao: aplicarOperacao, presetDesatualizado: presetDesatualizado,
  };
})(typeof window !== "undefined" ? window : globalThis);
/* <<< js/ordem2/regras.js */

/* >>> js/ordem2/motor.js */
/* =====================================================================
   R.A.M.A. — Ordem Paranormal RPG II (Experimental) · o motor (v9.0)
   ---------------------------------------------------------------------
   Puro: quem rola passa o rolador. Roda igual no navegador (ficha sem
   campanha) e no servidor (campanha, backend/Ordem2.gs).

   O TESTE (Alpha pp. 18–20; Beta pp. 10–12)
     montar(b, pedido, ctx)   os dados de teste (atributo + perícia +
                              bônus), os passos com a fonte, o pavor
                              separado, custos e modificador numérico
     rolar(m, rolador)        as faces
     resolver(m, rolagem, p)  pós-rolagem (Análise ±1, rerrolagens,
                              Mentoria, escolha dos três somados) →
                              anulados pelo pavor, soma, RA, RB, crítico
                              e falha crítica pelos SOBREVIVENTES

   A FICHA DEPOIS DO TESTE
     aposTeste      Ímpeto na falha, pavor que termina no 1, lobo ferido
     aplicarDano    físico/emocional, não letal anotado, armadura (−10,
                    uma por ocorrência), gatilhos de lesão e trauma
     resolverPendente  a máquina de lesão (Beta p. 21–22) e de trauma
                    (p. 23); no Alpha fiel, os testes da p. 26
     fimDeRodada / fimDeCena / inicioDeCena / novaMissao

   Decisões de implementação: RAMAOrdem2Catalogo.DECISOES.
   Copiado para backend/Ordem2.gs (testes/gerar-ordem2-gs.js).
   ===================================================================== */

(function (global) {
  "use strict";

  function K() { return global.RAMAOrdem2Catalogo; }
  function R() { return global.RAMAOrdem2; }
  function lista(v) { return Array.isArray(v) ? v : []; }
  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }

  var MAX_DADOS_ROLADOS = 4;
  var MAX_DADOS_SOMADOS = 3;
  var DT_PADRAO = 7;

  function ehBeta(b) { return b.perfilRegras === "beta-vigilia"; }

  /* ---------------------------------------------------------------
     MONTAR
     --------------------------------------------------------------- */
  function montar(b, pedido, ctx) {
    var p = obj(pedido), c = obj(ctx);
    var usar = obj(p.usar);
    var fontes = [];
    var per = p.pericia ? R().pericia(b, p.pericia) : null;
    if (p.pericia && !per) return { ok: false, motivo: "Perícia não encontrada nesta ficha." };
    var atributo = K().ATRIBUTOS[p.atributo] ? p.atributo : (per ? R().atributoBase(b, per.chave) : "");
    if (!atributo) return { ok: false, motivo: "Escolha o atributo do teste." };
    var atributoBase = per ? R().atributoBase(b, per.chave) : atributo;

    var permitir20 = c.permitir20 === true;
    var dAt = R().dadoDoAtributo(b, atributo);
    var dPe = per ? R().dadoDaPericia(b, per) : 0;
    var passosA = 0, passosP = 0;
    function passo(alvo, n, fonte) {
      if (!n) return;
      if (alvo === "atributo" || !per) passosA += n; else passosP += n;
      fontes.push({ tipo: "passo", alvo: alvo === "atributo" || !per ? "atributo" : "pericia", n: n, fonte: fonte });
    }
    lista(p.passos).forEach(function (x) { var o = obj(x); passo(o.alvo, Math.max(-4, Math.min(4, Math.floor(Number(o.n) || 0))), String(o.fonte || "Mestre").slice(0, 60)); });
    /* Passos sem alvo prescrito: a tela pergunta; padrão, a perícia. */
    var alvoSemPrescricao = p.alvoDosPassos === "atributo" ? "atributo" : "pericia";
    lista(b.efeitos).forEach(function (e) { if (e.tipo === "passoTodos") passo(alvoSemPrescricao, e.n, e.fonte || "efeito"); });
    if (b.estado.caido && atributo === "fisico" && ehBeta(b)) passo("atributo", -1, "Caído (Beta p. 21)");
    R().habilidadesDoTipo(b, "passoComPvBaixo").forEach(function () {
      if (b.recursos.pv.atual <= Math.floor(R().pvMax(b) / 2)) passo(alvoSemPrescricao, 1, "Instinto de Sobrevivência");
    });
    dAt = R().passoDado(dAt, passosA, permitir20);
    if (per) dPe = R().passoDado(dPe, passosP, permitir20);

    var dados = [{ faces: dAt, fonte: K().ATRIBUTOS[atributo].nome, tipo: "atributo" }];
    if (per) dados.push({ faces: dPe, fonte: R().nomeDaPericia(b, per), tipo: "pericia" });

    var custos = { pd: 0, pv: 0, espacos: {}, reservas: [] };
    function bonus(faces, fonte, extra) { dados.push(Object.assign({ faces: faces, fonte: fonte, tipo: "bonus" }, extra || {})); }
    lista(p.bonus).forEach(function (x) { var o = obj(x); bonus(R().faces(o.faces, 6), String(o.fonte || "bônus").slice(0, 60)); });

    /* Habilidades ANTES da rolagem. */
    if (usar.impeto !== undefined && usar.impeto !== null) {
      var hi = R().habilidadesDoTipo(b, "impeto")[0];
      if (!hi) return { ok: false, motivo: "Esta ficha não tem Ímpeto." };
      var mi = R().motorDe(hi), op = mi.opcoes[Number(usar.impeto)];
      if (!op || op.efeito !== "dado") return { ok: false, motivo: "Opção de Ímpeto inválida para um teste." };
      if (hi.estado.espacos < op.custo) return { ok: false, motivo: "Ímpeto: faltam espaços (" + hi.estado.espacos + "/" + op.custo + ")." };
      custos.espacos[hi.id] = (custos.espacos[hi.id] || 0) + op.custo;
      bonus(op.faces, "Ímpeto (" + op.custo + " espaço" + (op.custo > 1 ? "s" : "") + ")");
    }
    if (usar.focoMental) {
      var hf = R().habilidadesDoTipo(b, "dadoPorPd").filter(function (h) { var m = R().motorDe(h); return m.atributo; })[0];
      if (!hf) return { ok: false, motivo: "Esta ficha não tem Foco Mental." };
      var mf = R().motorDe(hf);
      if (atributo !== mf.atributo) return { ok: false, motivo: "Foco Mental é para testes mentais (com Mente)." };
      custos.pd += mf.pd; bonus(mf.faces, hf.nome + " (" + mf.pd + " PD)");
    }
    if (usar.sorrateiro) {
      var hs = R().habilidadesDoTipo(b, "dadoPorPd").filter(function (h) { var m = R().motorDe(h); return m.pericias; })[0];
      if (!hs) return { ok: false, motivo: "Esta ficha não tem Sorrateiro." };
      var ms = R().motorDe(hs);
      if (!per || ms.pericias.indexOf(per.chave) < 0) return { ok: false, motivo: hs.nome + " vale só em " + ms.pericias.join(" e ") + "." };
      custos.pd += ms.pd; bonus(ms.faces, hs.nome + " (" + ms.pd + " PD)");
    }
    var arma = p.arma ? lista(b.itens).filter(function (i) { return i.id === p.arma; })[0] : null;
    if (usar.linhaDeTiro) {
      var hl = R().habilidadesDoTipo(b, "dadoEmAtaque")[0];
      if (!hl) return { ok: false, motivo: "Esta ficha não tem Linha de Tiro." };
      var ml = R().motorDe(hl);
      if (!arma || arma.categoria !== ml.categoria) return { ok: false, motivo: hl.nome + " vale em ataques com arma de fogo." };
      custos.pd += ml.pd; bonus(ml.faces, hl.nome + " (" + ml.pd + " PD)");
    }
    /* O lobo (Espectro): +d6 nos ataques corpo a corpo, se não estiver ferido. */
    if (p.tipo === "ataque" && p.alcance === "corpo" && usar.parceiro !== false) {
      R().habilidadesDoTipo(b, "parceiro").forEach(function (h) {
        if (!h.estado.indisponivel) bonus(R().motorDe(h).faces, h.nome, { parceiro: h.id });
      });
    }
    lista(usar.reservas).forEach(function (rid) {
      var achou = null, hab = null;
      lista(b.estado.reservas).forEach(function (r) { if (r.id === rid) achou = r; });
      if (!achou) lista(b.habilidades).forEach(function (h) { lista(h.estado.reserva).forEach(function (r) { if (r.id === rid) { achou = r; hab = h; } }); });
      if (!achou) return;
      custos.reservas.push({ id: rid, hab: hab ? hab.id : "" });
      bonus(achou.faces, (achou.fonte || (hab ? hab.nome : "Reserva")) + (achou.alvo ? " · " + achou.alvo : ""));
    });

    /* Pavor (Beta p. 24): controlar (1 PD por passo, piso d4) ou abraçar
       (5 PD: vira dado bônus SÓ neste teste). */
    var pavor = b.estado.pavor || 0;
    var pv = obj(usar.pavor);
    var reduzir = Math.max(0, Math.min(5, Math.floor(Number(pv.controlar) || 0)));
    if (pavor && reduzir) {
      custos.pd += reduzir;
      for (var i = 0; i < reduzir; i++) pavor = R().passoDado(pavor, -1, false);
      fontes.push({ tipo: "pavor", texto: "Pavor controlado: −" + reduzir + " passo(s) (piso d4)" });
    }
    var abracado = false;
    if (pavor && pv.abracar) {
      custos.pd += 5;
      bonus(pavor, "Pavor abraçado (5 PD)");
      abracado = true;
      pavor = 0;
    }
    if (!b.estado.pavor && (reduzir || pv.abracar)) return { ok: false, motivo: "Sem dado de pavor." };

    if (dados.length > MAX_DADOS_ROLADOS) return { ok: false, motivo: "No máximo quatro dados por teste (Alpha p. 20; Beta p. 12). Tire " + (dados.length - MAX_DADOS_ROLADOS) + "." };
    if (custos.pd > b.recursos.pd.atual) return { ok: false, motivo: "PD insuficiente (" + b.recursos.pd.atual + "/" + custos.pd + ")." };

    var mod = R().modificadorNumerico(b, per ? per.chave : "", atributo);
    var modificador = Math.floor(Number(p.modificador) || 0) + mod.valor;
    var criticoMin = 6;
    if (p.tipo === "ataque" && arma && arma.efeitos.indexOf("critico5") >= 0) criticoMin = 5;
    /* Examinar (e qualquer teste marcado semDt) não tem DT: o resultado é
       comparado com as linhas do quadro, não com 7; sem DT, não há
       "falha" para o Ímpeto. */
    var dt = p.semDt === true ? null : p.dt === null || p.dt === undefined || p.dt === "" ? (p.tipo === "oposto" ? null : DT_PADRAO) : Math.max(0, Math.floor(Number(p.dt)));

    return {
      ok: true,
      montagem: {
        rotulo: String(p.rotulo || (per ? R().nomeDaPericia(b, per) : K().ATRIBUTOS[atributo].nome)).slice(0, 120),
        tipo: ["simples", "oposto", "estendido", "ataque", "lesao", "trauma"].indexOf(p.tipo) >= 0 ? p.tipo : "simples",
        atributo: atributo, atributoBase: atributoBase, atributoTrocado: atributo !== atributoBase,
        pericia: per ? per.id : "", periciaChave: per ? per.chave : "",
        dados: dados, pavor: pavor, pavorAbracado: abracado,
        dt: dt, modificador: modificador, fontesModificador: mod.fontes.concat(Number(p.modificador) ? ["Mestre (" + (p.modificador > 0 ? "+" : "") + p.modificador + ")"] : []),
        fontes: fontes, custos: custos, criticoMin: criticoMin,
        arma: arma ? arma.id : "", alcance: p.alcance === "distancia" ? "distancia" : (p.alcance === "corpo" ? "corpo" : ""),
        examinar: p.examinar === true, beta: ehBeta(b),
      },
    };
  }

  /* ---------------------------------------------------------------
     ROLAR E RESOLVER
     --------------------------------------------------------------- */
  function rolar(m, rolador) {
    return { faces: m.dados.map(function (d) { return rolador(d.faces); }), pavor: m.pavor ? rolador(m.pavor) : 0 };
  }

  /* Pós-rolagem: `pos` = { ajustes: [{indice, delta}], trocas: [{indice,
     valor, fonte}], soma: [indices] }. Trocas e ajustes valem antes do
     pavor; a escolha dos três mexe só na soma. */
  function resolver(m, rolagem, pos) {
    var q = obj(pos);
    var faces = rolagem.faces.slice();
    var marcas = faces.map(function () { return []; });
    lista(q.trocas).forEach(function (t) {
      var i = Number(t.indice);
      if (i >= 0 && i < faces.length) { faces[i] = Math.max(1, Math.min(m.dados[i].faces, Math.floor(Number(t.valor) || 1))); marcas[i].push(t.fonte || "trocado"); }
    });
    lista(q.ajustes).forEach(function (a) {
      var i = Number(a.indice), d = Math.floor(Number(a.delta) || 0);
      if (i >= 0 && i < faces.length && d) { faces[i] = Math.max(1, Math.min(m.dados[i].faces, faces[i] + d)); marcas[i].push((d > 0 ? "+" : "") + d + " Análise"); }
    });
    var pavorValor = rolagem.pavor || 0;
    var dados = faces.map(function (v, i) { return { faces: m.dados[i].faces, valor: v, fonte: m.dados[i].fonte, tipo: m.dados[i].tipo, parceiro: m.dados[i].parceiro || "", anulado: !!(pavorValor && v < pavorValor), somado: false, marcas: marcas[i] }; });
    var vivos = dados.map(function (d, i) { return d.anulado ? -1 : i; }).filter(function (i) { return i >= 0; });
    var semSobreviventes = !vivos.length;

    /* Os somados: a escolha, ou os três maiores sobreviventes. */
    var escolhidos = lista(q.soma).map(Number).filter(function (i, k, t) { return vivos.indexOf(i) >= 0 && t.indexOf(i) === k; }).slice(0, MAX_DADOS_SOMADOS);
    var escolheu = escolhidos.length > 0;
    if (!escolheu) escolhidos = vivos.slice().sort(function (a, b) { return dados[b].valor - dados[a].valor || a - b; }).slice(0, MAX_DADOS_SOMADOS);
    escolhidos.forEach(function (i) { dados[i].somado = true; });
    var soma = escolhidos.reduce(function (s, i) { return s + dados[i].valor; }, 0);

    var valoresVivos = vivos.map(function (i) { return dados[i].valor; });
    var ra = valoresVivos.length ? Math.max.apply(null, valoresVivos) : 0;
    var rb = valoresVivos.length ? Math.min.apply(null, valoresVivos) : 0;
    var ordenados = valoresVivos.slice().sort(function (a, b) { return b - a; });
    var duasMaiores = (ordenados[0] || 0) + (ordenados[1] || 0);

    /* Crítico: dois ou mais sobreviventes iguais, valor ≥ 6 (5 com a
       espada de Cormac). Falha crítica: todos os sobreviventes em 1, ou
       nenhum sobrevivente. */
    var cont = {};
    valoresVivos.forEach(function (v) { cont[v] = (cont[v] || 0) + 1; });
    var critico = Object.keys(cont).some(function (v) { return Number(v) >= m.criticoMin && cont[v] >= 2; });
    var falhaCritica = semSobreviventes || (valoresVivos.length > 0 && valoresVivos.every(function (v) { return v === 1; }));
    if (falhaCritica) critico = false;
    var total = soma + (m.modificador || 0);
    var sucesso = null;
    if (critico) sucesso = true;
    else if (falhaCritica) sucesso = false;
    else if (m.dt !== null && m.dt !== undefined) sucesso = total >= m.dt;

    return {
      dados: dados, pavor: m.pavor ? { faces: m.pavor, valor: pavorValor, terminou: pavorValor === 1 } : null,
      soma: soma, modificador: m.modificador || 0, total: total,
      ra: ra, rb: rb, duasMaiores: duasMaiores,
      critico: critico, falhaCritica: falhaCritica, semSobreviventes: semSobreviventes,
      sucesso: sucesso, dt: m.dt, somaEscolhida: escolheu, quatroDados: m.dados.length === 4,
    };
  }

  /* Pontuação de um teste estendido / dano de ataque: RA, ou as duas
     maiores no crítico do Beta (p. 11). */
  function pontuacao(res, beta) { return res.critico && beta ? res.duasMaiores : res.ra; }

  /* Oposto (Alpha/Beta p. 19/11): crítico vence o que não é; empate
     genérico fica para a cena. */
  function opor(a, b) {
    if (a.critico && !b.critico) return "a";
    if (b.critico && !a.critico) return "b";
    if (a.falhaCritica && !b.falhaCritica) return "b";
    if (b.falhaCritica && !a.falhaCritica) return "a";
    if (a.total > b.total) return "a";
    if (b.total > a.total) return "b";
    return "empate";
  }
  /* Ataque mútuo corpo a corpo (Beta p. 20): o maior acerta; empate,
     os dois acertam — sempre se atingirem a DT básica. */
  function ataqueMutuo(a, b, dtA, dtB) {
    var alcanca = function (r, dt) { return r.critico || (!r.falhaCritica && r.total >= dt); };
    var v = opor(a, b);
    return {
      acertaA: (v === "a" || v === "empate") && alcanca(a, dtA === undefined ? DT_PADRAO : dtA),
      acertaB: (v === "b" || v === "empate") && alcanca(b, dtB === undefined ? DT_PADRAO : dtB),
      vencedor: v,
    };
  }

  /* DT e passos de um ataque (Beta pp. 20–21). */
  function modificadoresDeAtaque(o) {
    var x = obj(o);
    var dt = DT_PADRAO, passos = 0, partes = [];
    if (x.alcance === "longo") { dt += 3; partes.push("alcance longo +3 DT"); }
    if (x.cobertura === "leve") { dt += 3; partes.push("cobertura leve +3 DT"); }
    if (x.cobertura === "total") return { ok: false, motivo: "Cobertura total: o alvo não pode ser atacado." };
    if (x.alvoCaido && x.distancia) { dt += 3; partes.push("alvo caído, à distância +3 DT"); }
    if (x.alvoCaido && !x.distancia) { passos += 1; partes.push("alvo caído, corpo a corpo +1 passo"); }
    if (x.vantagemTatica) { passos += 1; partes.push("vantagem tática +1 passo"); }
    if (x.ocultacao === "leve") { passos -= 1; partes.push("ocultação leve −1 passo"); }
    if (x.ocultacao === "total") { passos -= 2; partes.push("ocultação total −2 passos"); }
    if (x.atirandoEmCorpo && x.distancia && !x.aceitarDesvio) { passos -= 2; partes.push("atirando em corpo a corpo −2 passos"); }
    if (x.fintado) { passos += 2; partes.push("finta +2 passos"); }
    return { ok: true, dt: dt, passos: passos, partes: partes, rolarDesvio: !!(x.atirandoEmCorpo && x.distancia && x.aceitarDesvio) };
  }

  function dano(res, arma, extras, beta) {
    var base = pontuacao(res, beta);
    var bonusArma = arma ? arma.dano : 0;
    var extra = lista(extras).reduce(function (s, e) { return s + (Number(e.valor) || 0); }, 0);
    return { valor: Math.max(0, base + bonusArma + extra), base: base, arma: bonusArma, extras: lista(extras) };
  }

  /* ---------------------------------------------------------------
     A FICHA DEPOIS DO TESTE
     --------------------------------------------------------------- */
  function evento(t, privado) { return { texto: t, privado: !!privado }; }

  function pagarCustos(b, custos) {
    var c = obj(custos);
    if ((c.pd || 0) > b.recursos.pd.atual) return { ok: false, motivo: "PD insuficiente." };
    if ((c.pv || 0) > b.recursos.pv.atual) return { ok: false, motivo: "PV insuficiente." };
    b.recursos.pd.atual -= c.pd || 0;
    b.recursos.pv.atual -= c.pv || 0;
    Object.keys(obj(c.espacos)).forEach(function (hid) {
      var h = lista(b.habilidades).filter(function (x) { return x.id === hid; })[0];
      if (h) h.estado.espacos = Math.max(0, h.estado.espacos - c.espacos[hid]);
    });
    lista(c.reservas).forEach(function (r) {
      b.estado.reservas = b.estado.reservas.filter(function (x) { return x.id !== r.id; });
      lista(b.habilidades).forEach(function (h) { h.estado.reserva = h.estado.reserva.filter(function (x) { return x.id !== r.id; }); });
    });
    return { ok: true };
  }

  function aposTeste(b, m, res) {
    var ev = [];
    /* Ímpeto: cada teste falho preenche um espaço (até o máximo). */
    if (res.sucesso === false) {
      R().habilidadesDoTipo(b, "impeto").forEach(function (h) {
        var mx = R().motorDe(h).espacos;
        if (h.estado.espacos < mx) { h.estado.espacos++; ev.push(evento("Ímpeto: " + h.estado.espacos + "/" + mx + ".")); }
      });
    }
    if (res.pavor && res.pavor.terminou && b.estado.pavor) { b.estado.pavor = 0; ev.push(evento("O pavor rolou 1: o efeito de medo termina.")); }
    res.dados.forEach(function (d) {
      if (d.parceiro && d.valor === 1) {
        var h = lista(b.habilidades).filter(function (x) { return x.id === d.parceiro; })[0];
        if (h && !h.estado.indisponivel) { h.estado.indisponivel = true; ev.push(evento(h.nome + ": o dado deu 1 — o parceiro se machucou e não ajuda até o fim da cena.")); }
      }
    });
    b.efeitos = b.efeitos.filter(function (e) { return e.expira !== "teste"; });
    return ev;
  }

  function registrar(b, tipo, t) {
    b.historico.push({ quando: new Date().toISOString(), tipo: tipo, texto: String(t).slice(0, 400), corrigido: false });
    b.historico = b.historico.slice(-80);
  }

  /* Dano físico ou emocional. `externo`: efeito de fora (o gasto
     voluntário de PD não dispara trauma). */
  function aplicarDano(b, o) {
    var x = obj(o);
    var ev = [];
    var valor = Math.max(0, Math.floor(Number(x.valor) || 0));
    var tipo = x.tipo === "emocional" ? "emocional" : "fisico";
    var beta = ehBeta(b);
    if (tipo === "fisico" && x.armadura && R().armaduraAtual(b) > 0 && valor > 0) {
      b.recursos.armaduraGasta++;
      var reduz = Math.min(10, valor);
      valor -= reduz;
      ev.push(evento("Armadura: 1 ponto gasto, −" + reduz + " de dano (restam " + R().armaduraAtual(b) + ")."));
    }
    if (tipo === "emocional") {
      b.estado.traumas.forEach(function (t) { if (t.ref === "tept" && !t.curado) { valor += 1; ev.push(evento("Estresse Pós-Traumático: +1 de dano emocional.")); } });
      var antesPd = b.recursos.pd.atual;
      b.recursos.pd.atual = Math.max(0, antesPd - valor);
      ev.push(evento(valor + " de dano emocional (PD " + b.recursos.pd.atual + "/" + R().pdMax(b) + ")."));
      if (x.externo !== false && (b.recursos.pd.atual === 0) && (antesPd > 0 || valor > 0)) {
        var dtT = 7 + 3 * b.estado.testesTrauma;
        b.estado.pendentes.push({ id: R().novoId(), tipo: beta ? "trauma" : "disciplinaAlpha", dt: dtT, naoLetal: false, motivo: antesPd > 0 ? "Reduzido a 0 PD" : "Dano emocional com 0 PD" });
        ev.push(evento((beta ? "Teste de trauma" : "Teste de Disciplina") + " pendente (DT " + dtT + ")."));
      }
      return ev;
    }
    var antes = b.recursos.pv.atual;
    var perdido = Math.min(antes, valor);
    b.recursos.pv.atual = antes - perdido;
    if (x.naoLetal) b.recursos.naoLetal = Math.min(R().pvMax(b), b.recursos.naoLetal + perdido);
    ev.push(evento(valor + " de dano" + (x.naoLetal ? " não letal" : "") + " (PV " + b.recursos.pv.atual + "/" + R().pvMax(b) + ")."));
    if (b.recursos.pv.atual === 0 && (antes > 0 || valor > 0)) {
      var dt = 7 + 3 * b.estado.testesLesao;
      var naoLetal = b.recursos.naoLetal > 0;
      b.estado.pendentes.push({ id: R().novoId(), tipo: beta ? "lesao" : "vigorAlpha", dt: dt, naoLetal: beta && naoLetal, motivo: antes > 0 ? "Reduzido a 0 PV" : "Perdeu PV com 0 PV" });
      ev.push(evento((beta ? "Teste de lesão" : "Teste de Vigor") + " pendente (DT " + dt + ")."));
    }
    return ev;
  }

  function curar(b, recurso, valor) {
    var n = Math.max(0, Math.floor(Number(valor) || 0));
    if (recurso === "pd") {
      b.recursos.pd.atual = Math.min(R().pdMax(b), b.recursos.pd.atual + n);
      return n;
    }
    var antes = b.recursos.pv.atual;
    b.recursos.pv.atual = Math.min(R().pvMax(b), antes + n);
    b.recursos.naoLetal = Math.max(0, b.recursos.naoLetal - (b.recursos.pv.atual - antes));
    if (b.recursos.pv.atual > 0 && b.estado.inconsciente && !b.estado.moribundo) b.estado.inconsciente = false;
    return b.recursos.pv.atual - antes;
  }

  /* O teste que um pendente pede (atributo + perícia). */
  function pedidoDoPendente(b, pend) {
    if (pend.tipo === "lesao" || pend.tipo === "vigorAlpha") return { atributo: "fisico", pericia: "vigor", dt: pend.dt, tipo: "lesao", rotulo: pend.tipo === "lesao" ? "Teste de lesão" : "Teste de Vigor (0 PV)", bonus: pend.naoLetal ? [{ faces: 6, fonte: "Dano não letal (Beta p. 23)" }] : [] };
    var bonus = [];
    if (pend.tipo === "trauma") R().habilidadesDoTipo(b, "estoico").forEach(function (h) { bonus.push({ faces: R().motorDe(h).faces, fonte: h.nome }); });
    return { atributo: "emocao", pericia: "disciplina", dt: pend.dt, tipo: "trauma", rotulo: pend.tipo === "trauma" ? "Teste de trauma" : "Teste de Disciplina (0 PD)", bonus: bonus };
  }

  function rolarNaTabela(tabela, b, naoLetal, rolador) {
    var bonus = (K().PATAMARES[b.patamar] || { bonus: 0 }).bonus;
    var d1 = rolador(20), d2 = naoLetal ? rolador(20) : null;
    var d = d2 !== null ? Math.max(d1, d2) : d1;
    return { rolagens: d2 !== null ? [d1, d2] : [d1], valor: d + bonus, bonus: bonus, linha: K().daTabela(tabela, d + bonus) };
  }

  /* A máquina de estados: resolve o pendente com o resultado do teste. */
  function resolverPendente(b, pendId, res, rolador, rodadaAtual) {
    var pend = b.estado.pendentes.filter(function (p) { return p.id === pendId; })[0];
    if (!pend) return { ok: false, motivo: "Não há esse teste pendente." };
    b.estado.pendentes = b.estado.pendentes.filter(function (p) { return p.id !== pendId; });
    var ev = [];
    var extra = {};

    if (pend.tipo === "vigorAlpha" || pend.tipo === "disciplinaAlpha") {
      /* Alpha p. 26: passou, segue agindo; falhou, morre (ou colapsa). */
      if (pend.tipo === "vigorAlpha") b.estado.testesLesao++; else b.estado.testesTrauma++;
      if (res.sucesso) ev.push(evento("Passou (DT " + pend.dt + "): continua agindo."));
      else if (pend.tipo === "vigorAlpha") { b.estado.morto = true; ev.push(evento("Falhou no teste de Vigor: morre.")); registrar(b, "morte", "Morreu ao falhar no teste de Vigor (Alpha p. 26)."); }
      else { b.estado.colapso = true; b.estado.morto = true; ev.push(evento("Falhou no teste de Disciplina: colapso mental (Alpha p. 26).")); registrar(b, "colapso", "Colapso mental ao falhar no teste de Disciplina (Alpha p. 26)."); }
      return { ok: true, eventos: ev, pendente: pend };
    }

    if (pend.tipo === "trauma") {
      b.estado.testesTrauma++;
      R().habilidadesDoTipo(b, "estoico").forEach(function (h) {
        if (!b.estado.usos["estoico:" + h.id]) { b.estado.usos["estoico:" + h.id] = true; curar(b, "pd", R().motorDe(h).pd); ev.push(evento(h.nome + ": recupera " + R().motorDe(h).pd + " PD (primeiro teste de trauma da cena).")); }
      });
      if (res.sucesso) { ev.push(evento("Passou no teste de trauma: sem efeito.")); return { ok: true, eventos: ev, pendente: pend }; }
      var t = rolarTraumaSemRepetir(b, rolador);
      extra.tabela = t;
      aplicarLinha(b, t.linha, "trauma", ev, rodadaAtual, rolador);
      return { ok: true, eventos: ev, pendente: pend, tabela: t };
    }

    /* Lesão (Beta p. 21). */
    b.estado.testesLesao++;
    if (res.critico) {
      curar(b, "pv", 1);
      b.estado.inconsciente = false; b.estado.moribundo = false;
      ev.push(evento("Sucesso crítico no teste de lesão: recupera 1 PV e sai de inconsciente/moribundo."));
    } else if (res.falhaCritica) {
      b.estado.morto = true;
      ev.push(evento("Falha crítica no teste de lesão: morre."));
      registrar(b, "morte", "Morreu: falha crítica no teste de lesão.");
    } else if (res.sucesso) {
      b.estado.inconsciente = true; b.estado.moribundo = true;
      b.estado.usos.moribundoDesde = rodadaAtual === undefined ? null : rodadaAtual;
      ev.push(evento("Passou no teste de lesão: inconsciente e moribundo."));
    } else {
      var l = rolarLesaoSemRepetir(b, pend.naoLetal, rolador);
      extra.tabela = l;
      aplicarLinha(b, l.linha, "lesao", ev, rodadaAtual, rolador);
      if (!b.estado.morto && !b.estado.morteLenta && b.estado.moribundo) { b.estado.moribundo = false; ev.push(evento("Sobreviveu à lesão: deixa de estar moribundo.")); }
    }
    return { ok: true, eventos: ev, pendente: pend, tabela: extra.tabela || null };
  }

  /* Duplicatas: rola de novo (exceto Laceração Profunda). */
  function rolarLesaoSemRepetir(b, naoLetal, rolador) {
    var tentativas = [];
    for (var i = 0; i < 12; i++) {
      var r = rolarNaTabela(K().LESOES, b, naoLetal, rolador);
      tentativas.push(r.valor);
      var ja = b.estado.lesoes.some(function (l) { return l.ref === r.linha.id; });
      if (!r.linha.perm || r.linha.acumula || !ja) { r.tentativas = tentativas; return r; }
    }
    r.tentativas = tentativas;
    return r;
  }
  function rolarTraumaSemRepetir(b, rolador) {
    var tentativas = [];
    for (var i = 0; i < 12; i++) {
      var r = rolarNaTabela(K().TRAUMAS, b, false, rolador);
      tentativas.push(r.valor);
      var ja = b.estado.traumas.some(function (t) { return t.ref === r.linha.id && !t.curado; });
      if (!r.linha.cura || !ja) { r.tentativas = tentativas; return r; }
    }
    r.tentativas = tentativas;
    return r;
  }

  function aplicarLinha(b, linha, tipo, ev, rodadaAtual, rolador) {
    var e = linha.efeito || {};
    var quando = new Date().toISOString();
    ev.push(evento((tipo === "lesao" ? "Lesão" : "Trauma") + ": " + linha.nome + " — " + linha.texto));
    if (tipo === "lesao" && linha.perm) b.estado.lesoes.push({ id: R().novoId(), ref: linha.id, nome: linha.nome, quando: quando });
    if (tipo === "trauma" && linha.cura) b.estado.traumas.push({ id: R().novoId(), ref: linha.id, nome: linha.nome, curado: false, quando: quando });
    if (e.tipo === "morte") { b.estado.morto = true; registrar(b, "morte", "Morte súbita (tabela de lesões)."); }
    if (e.tipo === "colapso") { b.estado.colapso = true; registrar(b, "colapso", "Colapso total (tabela de traumas)."); }
    if (e.tipo === "morteLenta") {
      curar(b, "pv", 1);
      b.estado.inconsciente = false; b.estado.moribundo = false; b.estado.morteLenta = true;
      b.estado.morteLentaRodada = rodadaAtual === undefined || rodadaAtual === null ? null : rodadaAtual + 1;
      registrar(b, "morteLenta", "Morte lenta: age uma última vez.");
    }
    if (e.tipo === "passoAtributo") b.efeitos.push({ id: R().novoId(), tipo: "passoAtributo", alvo: e.alvo, n: e.n, faces: 0, expira: e.expira || "cena", fonte: linha.nome, d20: false });
    if (e.tipo === "recupera") curar(b, e.recurso, e.valor);
    if (e.tipo === "pvMax" || e.tipo === "pdMax") {
      b.recursos.pv.atual = Math.min(b.recursos.pv.atual, R().pvMax(b));
      b.recursos.pd.atual = Math.min(b.recursos.pd.atual, R().pdMax(b));
    }
    if (e.tipo === "pavor") ev.push.apply(ev, darPavor(b));
    if (e.tipo === "perdeAcao") b.estado.perdeAcao = 2;
    if (linha.perm || linha.cura || e.tipo === "morte" || e.tipo === "colapso" || e.tipo === "morteLenta") registrar(b, tipo, linha.nome + ": " + linha.texto);
  }

  /* Dado de pavor (Beta p. 24): novo d6, ou +1 passo se já tem. */
  function darPavor(b) {
    if (!b.estado.pavor) { b.estado.pavor = 6; return [evento("Recebe um dado de pavor (d6).")]; }
    b.estado.pavor = R().passoDado(b.estado.pavor, 1, false);
    return [evento("O dado de pavor aumenta para d" + b.estado.pavor + ".")];
  }

  /* ---------------------------------------------------------------
     O TEMPO
     --------------------------------------------------------------- */
  function fimDeRodada(b, rodada) {
    var ev = [];
    if (b.estado.morteLenta && !b.estado.morto && (b.estado.morteLentaRodada === null || rodada >= b.estado.morteLentaRodada)) {
      b.estado.morto = true; b.estado.morteLenta = false;
      ev.push(evento("Morte lenta: o fim da rodada chega — morre."));
      registrar(b, "morte", "Morreu ao fim da rodada (morte lenta).");
    }
    /* Moribundo: teste no fim de cada rodada, exceto a em que ficou. */
    if (b.estado.moribundo && !b.estado.morto && ehBeta(b)) {
      var desde = b.estado.usos.moribundoDesde;
      if (desde === null || desde === undefined || rodada > desde) {
        var dt = 7 + 3 * b.estado.testesLesao;
        if (!b.estado.pendentes.some(function (p) { return p.tipo === "lesao"; })) {
          b.estado.pendentes.push({ id: R().novoId(), tipo: "lesao", dt: dt, naoLetal: b.recursos.naoLetal > 0, motivo: "Moribundo: fim da rodada" });
          ev.push(evento("Moribundo: teste de lesão pendente (DT " + dt + ")."));
        }
      }
    }
    b.estado.perdeAcao = b.estado.perdeAcao === 2 ? 1 : 0;
    b.estado.acaoExtra = 0;
    b.efeitos = b.efeitos.filter(function (e) { return e.expira !== "rodada"; });
    Object.keys(b.estado.usos).forEach(function (k) { if (/^rodada:/.test(k)) delete b.estado.usos[k]; });
    return ev;
  }

  function fimDeCena(b) {
    var ev = [];
    var beta = ehBeta(b);
    lista(b.habilidades).forEach(function (h) {
      var m = R().motorDe(h);
      if (!m) return;
      if (m.tipo === "analise" && m.zeraFimCena && h.estado.marcadores) { h.estado.marcadores = 0; ev.push(evento(h.nome + ": marcadores perdidos no fim da cena.")); }
      if (m.tipo === "impeto" && m.zeraFimCena && h.estado.espacos) { h.estado.espacos = 0; ev.push(evento(h.nome + ": a barra esvazia no fim da cena.")); }
      if (m.tipo === "parceiro") h.estado.indisponivel = false;
      if (m.tipo === "avaliacao") h.estado.reserva = [];
    });
    b.estado.reservas = b.estado.reservas.filter(function (r) { return r.expira !== "cena"; });
    var antes = b.efeitos.length;
    b.efeitos = b.efeitos.filter(function (e) { return ["teste", "rodada", "cena"].indexOf(e.expira) < 0; });
    if (antes !== b.efeitos.length) ev.push(evento("Efeitos de cena terminam."));
    if (beta) { b.estado.testesLesao = 0; b.estado.testesTrauma = 0; }
    /* Beta p. 22: sobreviveu à cena com 0 PV → 1 PV. */
    if (beta && b.recursos.pv.atual === 0 && !b.estado.morto) { curar(b, "pv", 1); ev.push(evento("Fim da cena com 0 PV: recupera 1 PV.")); }
    Object.keys(b.estado.usos).forEach(function (k) { if (/^(cena|rodada|estoico):/.test(k) || k === "moribundoDesde") delete b.estado.usos[k]; });
    b.estado.perdeAcao = 0; b.estado.acaoExtra = 0;
    return ev;
  }

  function inicioDeCena(b) {
    var ev = [];
    R().habilidadesDoTipo(b, "impetoInicioCena").forEach(function (hf) {
      var hi = R().habilidadesDoTipo(b, "impeto")[0];
      if (!hi) return;
      var mx = R().motorDe(hi).espacos;
      if (hi.estado.espacos < mx) { hi.estado.espacos = Math.min(mx, hi.estado.espacos + (R().motorDe(hf).espacos || 1)); ev.push(evento(hf.nome + ": +1 espaço de ímpeto (" + hi.estado.espacos + "/" + mx + ").")); }
    });
    return ev;
  }

  /* ---------------------------------------------------------------
     MINIJOGOS
     --------------------------------------------------------------- */
  function tentativasDeDestrancar(crimeFaces) { return Math.max(1, [4, 6, 8, 10, 12].indexOf(crimeFaces) + 1); }
  /* A resposta diz onde está a SENHA em relação ao dado posto — o
     exemplo do livro: senha 3-5-2, tentativa 4-5-1 → "baixo, exato,
     alto" (Alpha p. 24; Beta p. 16). A v9.0 respondia ao contrário. */
  function respostaDaFechadura(senha, tentativa) {
    return lista(senha).map(function (v, i) { var t = Number(tentativa[i]); return t === v ? "exato" : v < t ? "baixo" : "alto"; });
  }
  function dadosDeEquilibrio(acrobaciaFaces) { return Math.max(1, Math.floor(acrobaciaFaces / 2)); }
  function equilibrado(a, b) { return Math.abs(a - b) <= 1; }

  global.RAMAOrdem2Motor = {
    MAX_DADOS_ROLADOS: MAX_DADOS_ROLADOS, MAX_DADOS_SOMADOS: MAX_DADOS_SOMADOS, DT_PADRAO: DT_PADRAO,
    montar: montar, rolar: rolar, resolver: resolver, pontuacao: pontuacao, opor: opor, ataqueMutuo: ataqueMutuo,
    modificadoresDeAtaque: modificadoresDeAtaque, dano: dano,
    pagarCustos: pagarCustos, aposTeste: aposTeste, aplicarDano: aplicarDano, curar: curar,
    pedidoDoPendente: pedidoDoPendente, resolverPendente: resolverPendente, rolarNaTabela: rolarNaTabela, darPavor: darPavor,
    fimDeRodada: fimDeRodada, fimDeCena: fimDeCena, inicioDeCena: inicioDeCena, registrar: registrar,
    tentativasDeDestrancar: tentativasDeDestrancar, respostaDaFechadura: respostaDaFechadura, dadosDeEquilibrio: dadosDeEquilibrio, equilibrado: equilibrado,
  };
})(typeof window !== "undefined" ? window : globalThis);
/* <<< js/ordem2/motor.js */

/* >>> js/ordem2/mesa.js */
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

  /* Extensão (v9.1): js/ordem2/procedimentos.js registra operações e
     ganchos aqui — a porta continua uma só. */
  var GANCHOS = { normalizar: [], vista: [], pistaBloqueada: [], aoRevelar: [], flag: null, novaCena: [], fimDeRodadaCombate: [], inicioDeRodadaCombate: [], validarDeclaracao: [], passosDeclaracao: [], aoFinalizar: [], aoDano: [], aoAtaque: [] };
  function gancho(nome, fn) { if (GANCHOS[nome]) GANCHOS[nome].push(fn); }
  function registrarOperacao(nome, fn, o) {
    var x = o || {};
    OPERACOES[nome] = fn;
    (x.mestre ? OPS_DO_MESTRE : OPS_DO_PERSONAGEM).push(nome);
    if (x.semFicha) OPS_SEM_FICHA.push(nome);
    if (x.rev) OPS_COM_REV.push(nome);
  }

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
    v.investigacao.pontos = lista(inv.pontos).map(normalizarPontoV91).slice(0, 80);
    Object.keys(obj(inv.descobertas)).forEach(function (pid) {
      v.investigacao.descobertas[texto(pid, 80)] = lista(inv.descobertas[pid]).map(function (x) { var o = obj(x); var d = { id: texto(o.id, 80) || id(), pista: texto(o.pista, 80), ponto: texto(o.ponto, 80), texto: texto(o.texto, 1200), como: texto(o.como, 80), critico: o.critico === true };
        /* v9.1: anexo autorizado, ferramenta, conjuntos do rádio, área do laser. */
        if (o.anexo) d.anexo = texto(o.anexo, 80);
        if (o.ferramenta) d.ferramenta = texto(o.ferramenta, 30);
        if (Array.isArray(o.conjuntos)) d.conjuntos = o.conjuntos.map(function (c) { return texto(c, 120); }).slice(0, 30);
        if (o.area) d.area = texto(o.area, 60);
        if (o.sucesso !== undefined) d.sucesso = o.sucesso === true;
        return d; }).slice(-120);
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
    GANCHOS.normalizar.forEach(function (fn) { fn(v, b); });
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
  /* Os campos novos de um ponto (v9.1): número, área, estado (oculto /
     anunciado), pré-requisitos, anexos, ordem de descoberta, desafios e
     a leitura das ferramentas. Acrescentados sem mexer no formato antigo. */
  function normalizarPontoV91(x) {
    var p = obj(x);
    var n = normalizarPonto(p);
    n.numero = texto(p.numero, 12);
    n.area = texto(p.area, 60);
    n.origem = p.origem === "pacote" ? "pacote" : "";
    n.desafios = lista(p.desafios).map(function (d) { return texto(d, 80); }).filter(Boolean).slice(0, 8);
    n.ferramentas = copiar(obj(p.ferramentas));
    n.normal = p.normal === true;
    n.pistas = n.pistas.map(function (q, i) {
      var o = obj(lista(p.pistas)[i]);
      q.requer = lista(o.requer).map(function (r) { return texto(r, 120); }).filter(Boolean).slice(0, 6);
      q.concede = lista(o.concede).map(function (r) { return texto(r, 120); }).filter(Boolean).slice(0, 6);
      q.anexo = texto(o.anexo, 80);
      q.ordem = inteiro(o.ordem, 0, 999, i);
      q.jogadores = lista(o.jogadores).map(function (j) { return inteiro(j, 1, 12, 0); }).filter(Boolean).slice(0, 6);
      q.dtSe = o.dtSe && obj(o.dtSe).flag ? { flag: texto(o.dtSe.flag, 120), dt: inteiro(o.dtSe.dt, 0, 40, 10) } : null;
      q.ferramenta = texto(o.ferramenta, 30);
      return q;
    });
    return n;
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
      /* v9.1: ameaça de origem, RD (null = não impressa), especiais com
         motor, quando chega (ondas) e a quem está agarrando. */
      v.ameaca = texto(p.ameaca, 60);
      v.rd = p.rd === null || p.rd === undefined || p.rd === "" ? null : inteiro(p.rd, 0, 99, 0);
      v.especiais = lista(p.especiais).map(function (x) { var o = obj(x); return o.id && o.motor ? { id: texto(o.id, 40), nome: texto(o.nome, 80), motor: copiar(obj(o.motor)), fase: texto(o.fase, 20), dano: o.dano === null || o.dano === undefined ? null : inteiro(o.dano, -10, 50, 0) } : null; }).filter(Boolean).slice(0, 8);
      v.chegaEm = inteiro(p.chegaEm, 0, 100000, 0);
      v.onda = inteiro(p.onda, 0, 999, 0);
      v.aoDestruir = lista(p.aoDestruir).map(function (s) { return texto(s, 60); }).filter(Boolean).slice(0, 6);
      v.objeto = p.objeto === true;
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
    saida.documentos = [];
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
    var mudouPerfil = o.perfil && K().PERFIS_REGRAS[o.perfil] && o.perfil !== e.perfil;
    if (o.perfil && K().PERFIS_REGRAS[o.perfil]) e.perfil = o.perfil;
    if (o.ambientacao && K().AMBIENTACOES[o.ambientacao]) e.ambientacao = o.ambientacao;
    /* Trocar o perfil sem dizer a ambientação: vale a do perfil (v9.1). */
    else if (mudouPerfil) e.ambientacao = K().PERFIS_REGRAS[e.perfil].ambientacao;
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
    GANCHOS.novaCena.forEach(function (fn) { fn(e, fichas, o, s); });
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
    if (cx.proc) GANCHOS.aoFinalizar.forEach(function (fn) { fn(e, fichas, t, res, s, rolar, ctx); });
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
  function semAcentoEsp(t) { return String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }
  function pistaCabe(b, pista, per) {
    var ch = per.chave + (per.especializacao ? ":" + semAcentoEsp(per.especializacao) : "");
    return pista.pericias.some(function (k) {
      var kk = semAcentoEsp(K().ALIASES[k] || k);
      if (kk.indexOf("aptidao") === 0) return per.chave === "aptidao" && (kk === "aptidao" || kk === ch);
      return kk === per.chave;
    });
  }
  function revelar(e, pid, ponto, per, limite, b, como) {
    var ja = e.investigacao.descobertas[pid] || (e.investigacao.descobertas[pid] = []);
    var novas = [];
    ponto.pistas.forEach(function (q) {
      if (!pistaCabe(b, q, per)) return;
      var dt = q.dt;
      if (q.dtSe && GANCHOS.flag && GANCHOS.flag(e, q.dtSe.flag, pid)) dt = q.dtSe.dt;
      if (dt > limite) return;
      if (ja.some(function (d) { return d.pista === q.id; })) return;
      /* v9.1: pré-requisito, personagem exclusivo, número de jogadores e
         o que o grupo já sabe (a mesma pista não rende duas vezes). */
      if (GANCHOS.pistaBloqueada.some(function (fn) { return fn(e, pid, q, b, ponto); })) return;
      var d = { id: id(), pista: q.id, ponto: ponto.id, texto: q.texto, como: como, critico: false, anexo: q.anexo || "" };
      ja.push(d); novas.push(d);
      GANCHOS.aoRevelar.forEach(function (fn) { fn(e, pid, d, q, ponto); });
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
    var n = normalizarPontoV91(o.ponto);
    if (n.origem === "pacote") n.editado = true;
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
      ameaca: o.ameaca, rd: o.rd, especiais: o.especiais, chegaEm: o.chegaEm, onda: o.onda, aoDestruir: o.aoDestruir, objeto: o.objeto,
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
    var ordem = o.preset === "quatro" ? K().ORDEM_FASES_4.slice() : o.preset === "tres" ? K().ORDEM_FASES_PADRAO.slice() : lista(o.ordem).filter(function (x, i, t) { return K().FASES[x] && t.indexOf(x) === i; });
    if (!ordem.length) return { ok: false, motivo: "Escolha ao menos uma fase." };
    reordenarFases(e, ordem);
    log(e, "Ordem de fases: " + ordem.map(function (x) { return K().FASES[x].nome; }).join(" → ") + ".");
  };

  /* Trocar a ordem no meio da rodada (v9.1): cada declaração vai para a
     fase equivalente na ordem nova — a ação não se perde nem se repete;
     as já resolvidas ficam como estão; a posição segue a fase atual
     (ou a equivalente) e nada já aplicado volta a acontecer. */
  function equivalente(fase, ordem) {
    if (ordem.indexOf(fase) >= 0) return fase;
    if (fase === "geral") return ordem.indexOf("suporte") >= 0 ? "suporte" : ordem.indexOf("final") >= 0 ? "final" : "";
    if (fase === "suporte" || fase === "final") return ordem.indexOf("geral") >= 0 ? "geral" : "";
    return "";
  }
  function reordenarFases(e, ordem) {
    var c = e.combate;
    var antiga = c.ordemFases.slice();
    var atual = antiga[c.fase] || "";
    var feitas = antiga.slice(0, Math.min(c.fase, antiga.length));
    c.declaracoes.forEach(function (d) {
      if (d.rodada !== c.rodada || ordem.indexOf(d.fase) >= 0) return;
      d.faseAntes = d.fase;
      d.fase = K().faseDaAcao(d.acao, ordem);
    });
    c.ordemFases = ordem;
    var pos;
    if (c.fase >= antiga.length) pos = ordem.length;
    else {
      var eq = equivalente(atual, ordem);
      pos = eq ? ordem.indexOf(eq) : 0;
      /* "Geral" já aplicada vira "Suporte" feita; "Final" ainda vem. */
      while (pos < ordem.length && feitas.some(function (f) { return equivalente(f, ordem) === ordem[pos] && !(f === "geral" && ordem[pos] === "final"); })) pos++;
    }
    /* Uma declaração ainda não rolada que caiu numa fase já passada vem para a atual. */
    c.declaracoes.forEach(function (d) { if (d.rodada === c.rodada && d.estado === "declarada" && pos < ordem.length && ordem.indexOf(d.fase) < pos) d.fase = ordem[pos]; });
    if (ordem[pos] !== atual) c.etapa = "declarar";
    c.fase = pos;
  }
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
    var fase = K().faseDaAcao(o.acao, c.ordemFases);
    /* Prontidão: uma ação geral feita numa fase posterior. */
    if (o.naFase && K().FASES[o.naFase] && o.naFase !== fase) {
      var bP = blocoDoAtor(e, fichas, pa);
      if (!R().habilidadesDoTipo(bP, "prontidao").length) return { ok: false, motivo: "Agir em fase posterior é da Prontidão." };
      fase = o.naFase;
    }
    if (c.ordemFases.indexOf(fase) < 0) return { ok: false, motivo: K().FASES[fase].nome + " não está na ordem desta cena." };
    var motivo = podeDeclarar(e, fichas, pa, fase);
    if (motivo) return { ok: false, motivo: motivo };
    var proposta = { ator: pa.id, acao: o.acao, fase: fase, alvo: texto(o.alvo, 80), opcoes: obj(o.opcoes) };
    for (var gi = 0; gi < GANCHOS.validarDeclaracao.length; gi++) { var mg = GANCHOS.validarDeclaracao[gi](e, fichas, pa, proposta); if (mg) return { ok: false, motivo: mg }; }
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
    if (acao === "escapar") return d.opcoes && d.opcoes.pericia === "luta" ? "luta" : "acrobacia";
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
    if (d.acao === "escapar") { pedido.tipo = "oposto"; pedido.dt = null; }
    GANCHOS.passosDeclaracao.forEach(function (fn) { lista(fn(e, fichas, pa, d)).forEach(function (x) { pedido.passos.push({ alvo: "pericia", n: x.n, fonte: x.fonte }); }); });
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
      var valorFinal = x.valor;
      if (pa.tipo === "npc" && pa.rd) { var ign = Math.min(pa.rd, x.ignoraRd || 0); var corte = pa.rd - ign; valorFinal = Math.max(0, x.valor - corte); if (corte || ign) ev(s, pa.nome + ": RD " + pa.rd + (ign ? " (" + ign + " ignorados)" : "") + " → " + valorFinal + " de dano.", pa.oculto); }
      var evd = M().aplicarDano(b, { valor: valorFinal, tipo: "fisico", naoLetal: x.naoLetal, externo: true, armadura: arm });
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
      GANCHOS.aoDano.forEach(function (fn) { fn(e, fichas, pa, b, x, s); });
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
    /* Escapar (v9.1): os ganchos resolvem contra quem agarra. */
    daFase.filter(function (d) { return d.resultado && d.acao === "escapar"; }).forEach(function (d) {
      GANCHOS.aoAtaque.forEach(function (fn) { fn(e, fichas, d, null, null, rolar, s, "escapar"); });
    });
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
    /* Ataque com efeito próprio (Afogar): o gancho decide; true = sem dano. */
    if (arma && lista(arma.efeitos).length && GANCHOS.aoAtaque.some(function (fn) { return fn(e, fichas, d, at, alvo, null, s, "acerto", arma) === true; })) return [];
    var extras = [];
    if (arma && arma.categoria) R().habilidadesDoTipo(bAt, "danoPorCategoria").forEach(function (h) { var m = R().motorDe(h); if (m.categoria === arma.categoria) extras.push({ valor: m.valor, fonte: h.nome }); });
    var dn = M().dano(res, d.vespa ? { dano: 1 } : arma, extras, true);
    var valor = dn.valor;
    if (resDoAlvo && bAl && lista(bAl.itens).some(function (i) { return i.efeitos.indexOf("escudo") >= 0; }) && resDoAlvo.total >= 7) {
      valor = Math.max(0, valor - resDoAlvo.rb);
      ev(s, alvo.nome + " · Escudo: −" + resDoAlvo.rb + " (rolagem baixa) no dano.");
    }
    ev(s, at.nome + " acerta " + alvo.nome + ": " + (res.critico ? "duas maiores " + dn.base : "RA " + dn.base) + (dn.arma ? " + " + dn.arma : "") + (extras.length ? " + " + extras.map(function (x) { return x.valor + " " + x.fonte; }).join(" + ") : "") + " = " + valor + " de dano.");
    var ignora = arma ? lista(arma.efeitos).map(function (x) { var m = /^ignoraRd:(\d+)$/.exec(x); return m ? Number(m[1]) : 0; }).reduce(function (a, b) { return Math.max(a, b); }, 0) : 0;
    return [{ alvo: alvo.id, valor: valor, naoLetal: !!d.naoLetal, vespa: !!d.vespa, ignoraRd: ignora, atordoa: !!(arma && lista(arma.efeitos).indexOf("atordoa") >= 0), ator: at.id, arma: arma ? arma.id : "" }];
  }

  OPERACOES.proximaRodada = function (e, fichas, o, p, rolar, s) {
    var c = e.combate;
    if (!c.ativo) return { ok: false, motivo: "Não há combate." };
    var rodada = c.rodada;
    /* A rodada pedida é a atual: o mesmo pedido de outra janela não encerra duas. */
    if (o.rodada !== undefined && o.rodada !== null && Number(o.rodada) !== rodada) return { ok: false, motivo: "A rodada " + o.rodada + " já foi encerrada." };
    GANCHOS.fimDeRodadaCombate.forEach(function (fn) { fn(e, fichas, rodada, rolar, s); });
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
    GANCHOS.inicioDeRodadaCombate.forEach(function (fn) { fn(e, fichas, c.rodada, rolar, s); });
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
      var vitima = x.b === bD ? df : at, autor = x.b === bD ? at : df;
      GANCHOS.aoDano.forEach(function (fn) { fn(e, fichas, vitima, x.b, { valor: x.valor, ator: autor.id, conflitoAlpha: true }, s); });
    });
  };

  /* ---------------------------------------------------------------
     A VISTA DO JOGADOR — sem soluções nem notas privadas
     --------------------------------------------------------------- */
  function vista(e, papel, ctx) {
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
    GANCHOS.vista.forEach(function (fn) { fn(v, e, papel, ctx); });
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
    /* v9.1 */
    GANCHOS: GANCHOS, gancho: gancho, registrarOperacao: registrarOperacao, OPERACOES: OPERACOES,
    normalizarPonto: normalizarPontoV91, novoNpc: novoNpc, combateVazio: combateVazio, foraDeCombate: foraDeCombate, reordenarFases: reordenarFases,
    podeAgir: podeAgir, bloco: bloco, nomeDe: nomeDe, registrarRolagem: registrarRolagem, log: log, ev: ev, finalizar: finalizar,
    revelar: revelar, pistaCabe: pistaCabe, OPS_SEM_FICHA: OPS_SEM_FICHA,
  };
})(typeof window !== "undefined" ? window : globalThis);
/* <<< js/ordem2/mesa.js */

/* >>> js/ordem2/ameacas.js */
/* =====================================================================
   R.A.M.A. — Ordem Paranormal RPG II (Experimental) · ameaças (v9.1)
   ---------------------------------------------------------------------
   Fichas NATIVAS de Ordem II (nada de VD, NEX, Defesa ou ação de Ordem
   I): atributos e perícias em dados, PV, ações com a perícia do teste e
   o bônus de dano (RA + n), e habilidades com um `motor` que a mesa sabe
   executar. Só o que os arquivos imprimem — o que falta é LACUNA, com o
   nome, e não um número inventado.

     Beta  Afogado (p. 33), Aughisk (p. 43), Crias da Floresta (p. 71),
           Ellén Trechend (só os efeitos da perseguição, pp. 72–74)
     Alpha inventário do Ato I e II, sem ficha nos arquivos

   O mesmo formato é o bloco `ordem2` de uma criatura de Homebrew
   (js/criaturas.js). A solução de um enigma (o "Enigma de Medo" do
   aughisk) é conteúdo do Mestre: fica no pacote da missão, não aqui.

   Copiado para backend/Ordem2.gs (testes/gerar-ordem2-gs.js).
   ===================================================================== */

(function (global) {
  "use strict";

  function lista(v) { return Array.isArray(v) ? v : []; }
  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  function texto(v, n) { return String(v === undefined || v === null ? "" : v).slice(0, n || 200); }
  function numero(v, a, b, p) { var n = Number(v); if (v === "" || v === null || v === undefined || !Number.isFinite(n)) return p; return Math.max(a, Math.min(b, Math.round(n))); }
  function dado(v) { var n = Number(v); return [4, 6, 8, 10, 12, 20].indexOf(n) >= 0 ? n : null; }

  var NATUREZAS = { criatura: "Criatura", pessoa: "Pessoa", artefato: "Artefato amaldiçoado", manifestacao: "Manifestação", objeto: "Objeto de cena" };
  var ELEMENTOS = ["Sangue", "Morte", "Conhecimento", "Energia", "Medo"];
  var ALCANCES = { corpo: "Corpo a corpo", distancia: "À distância", especial: "Especial" };
  /* O que a mesa sabe fazer com uma ação ou habilidade (mesa/procedimentos). */
  var MOTORES = {
    afogar: "Agarra e afoga: sem dano no acerto; a vítima só pode escapar e perde o dano por rodada no fim de cada rodada.",
    oposto: "Teste oposto contra o alvo; vencendo, dano e condições.",
    area: "Todos testam ao mesmo tempo contra a DT; dano conforme passar ou falhar.",
    tributo: "No início da rodada, com PV no limite, consome as ameaças indicadas e cura.",
    cabecas: "No início de cada rodada, dois personagens sorteados sofrem dano.",
    manual: "Sem automação: o Mestre narra e aplica.",
  };

  function normalizarAcao(x, i) {
    var a = obj(x);
    var nome = texto(a.nome, 80);
    if (!nome) return null;
    return {
      id: texto(a.id, 40) || "a" + i, nome: nome,
      alcance: ALCANCES[a.alcance] ? a.alcance : "corpo",
      pericia: texto(a.pericia, 40) || "luta",
      dano: a.dano === null || a.dano === undefined || a.dano === "" ? null : numero(a.dano, -10, 50, 0),
      efeitos: lista(a.efeitos).map(function (s) { return texto(s, 40); }).filter(Boolean).slice(0, 6),
      fase: ["suporte", "distancia", "corpo", "final", "geral"].indexOf(a.fase) >= 0 ? a.fase : "",
      texto: texto(a.texto, 800),
      motor: a.motor && typeof a.motor === "object" ? JSON.parse(JSON.stringify(a.motor)) : null,
    };
  }
  function normalizarHabilidade(x, i) {
    var h = obj(x);
    var nome = texto(h.nome, 80);
    if (!nome) return null;
    return { id: texto(h.id, 40) || "h" + i, nome: nome, texto: texto(h.texto, 1200), motor: h.motor && typeof h.motor === "object" ? JSON.parse(JSON.stringify(h.motor)) : null };
  }
  /* O bloco `ordem2` (catálogo e Homebrew). */
  function normalizar(bruto) {
    var b = obj(bruto);
    var at = obj(b.atributos), pe = obj(b.pericias);
    var atributos = null;
    if (Object.keys(at).length) atributos = { fisico: dado(at.fisico) || 4, mente: dado(at.mente) || 4, emocao: dado(at.emocao) || 4 };
    var pericias = {};
    Object.keys(pe).slice(0, 24).forEach(function (k) { var d = dado(pe[k]); if (d && /^[a-z]{3,20}$/.test(k)) pericias[k] = d; });
    var f = obj(b.fonte);
    return {
      natureza: NATUREZAS[b.natureza] ? b.natureza : "criatura",
      elementos: lista(b.elementos).filter(function (e) { return ELEMENTOS.indexOf(e) >= 0; }).slice(0, 5),
      pv: b.pv === null || b.pv === undefined || b.pv === "" ? null : numero(b.pv, 0, 9999, 10),
      pd: b.pd === null || b.pd === undefined || b.pd === "" ? null : numero(b.pd, 0, 9999, 10),
      atributos: atributos,
      pericias: pericias,
      rd: b.rd === null || b.rd === undefined || b.rd === "" ? null : numero(b.rd, 0, 99, 0),
      armadura: numero(b.armadura, 0, 20, 0),
      acoes: lista(b.acoes).slice(0, 12).map(normalizarAcao).filter(Boolean),
      habilidades: lista(b.habilidades).slice(0, 16).map(normalizarHabilidade).filter(Boolean),
      estrategia: texto(b.estrategia, 800),
      fonte: { doc: texto(f.doc, 20), pagina: numero(f.pagina, 0, 999, 0), paginaNoTexto: numero(f.paginaNoTexto, 0, 999, 0) },
      lacunas: lista(b.lacunas).map(function (s) { return texto(s, 200); }).filter(Boolean).slice(0, 8),
      semFicha: b.semFicha === true,
    };
  }

  /* ---------------------------------------------------------------
     O CATÁLOGO
     --------------------------------------------------------------- */
  var LISTA = [
    { id: "afogado", nome: "Afogado", ordem2: {
      natureza: "criatura", elementos: ["Morte"], pv: 10, atributos: { fisico: 8, mente: 4, emocao: 4 }, pericias: { atletismo: 8, luta: 6 },
      acoes: [
        { id: "garras", nome: "Garras", alcance: "corpo", pericia: "luta", dano: 1, texto: "Dano RA+1." },
        { id: "afogar", nome: "Afogar", alcance: "corpo", pericia: "luta", dano: null, efeitos: ["afogar"], texto: "Agarra e empurra contra a água; só perto de um corpo d'água. A vítima só pode escapar e perde 1d6 PV no fim de cada rodada; quem agarra não faz outra coisa.", motor: { tipo: "afogar", dano: [1, 6], escapar: { pericias: ["acrobacia", "luta"], contra: "luta", passosVitima: -1 } } },
      ],
      habilidades: [{ id: "escapar", nome: "Escapar", texto: "Na fase de corpo a corpo, a vítima testa Acrobacia ou Luta (−1 passo) contra a Luta do afogado; vencendo, solta-se e não sofre o dano desta rodada. Um aliado pode gastar a ação para tentar o mesmo, sem a redução." }],
      estrategia: "Perto de água, avança no mais próximo: fere (Garras) e afoga (Afogar). Longe dela, só Garras.",
      fonte: { doc: "beta", pagina: 33, paginaNoTexto: 35 },
    } },
    { id: "aughisk", nome: "Aughisk", ordem2: {
      natureza: "criatura", elementos: ["Morte", "Medo"], pv: 40, atributos: { fisico: 10, mente: 6, emocao: 8 }, pericias: { atletismo: 10, luta: 10, percepcao: 10 },
      rd: null,
      acoes: [
        { id: "espada", nome: "Espada", alcance: "corpo", pericia: "luta", dano: 4, texto: "Teste 2d10, dano RA+4." },
        { id: "coice", nome: "Coice", alcance: "corpo", pericia: "luta", dano: 3, texto: "Teste 2d10, dano RA+3." },
        { id: "investida", nome: "Investida Equina", alcance: "especial", fase: "suporte", pericia: "atletismo", dano: 3, texto: "Na fase de suporte, avança num personagem (que pode gastar a ação para esquivar); no corpo a corpo, Atletismo contra a Acrobacia dele (+d6 se esquivou). Vencendo: RA+3 de impacto, atordoado 1 rodada e caído.", motor: { tipo: "oposto", pericia: "atletismo", contra: "acrobacia", bonusSeEsquivou: 6, dano: 3, condicoes: ["atordoado", "caido"] } },
        { id: "enxurrada", nome: "Enxurrada de Morte", alcance: "especial", fase: "suporte", texto: "Duas ações (duas rodadas, fase de suporte). Na segunda, todos testam Acrobacia DT 13: passando, 1d6; falhando, 2d6 e caído. Quem procurou abrigo durante a primeira ação recebe +d6 e, passando, não sofre dano.", motor: { tipo: "area", acoes: 2, pericia: "acrobacia", dt: 13, sucesso: { dano: [1, 6] }, falha: { dano: [2, 6], caido: true }, abrigo: { bonus: 6, semDanoNoSucesso: true } } },
      ],
      habilidades: [
        { id: "presenca", nome: "Presença Aterradora", texto: "No início da cena, quem o vê sofre 2d6 de dano emocional; Disciplina DT 10 reduz à metade. (O texto cita \"NEX\", termo da primeira edição: ignorado.)", motor: { tipo: "area", quando: "inicioDaCena", pericia: "disciplina", dt: 10, dano: [2, 6], danoTipo: "emocional", sucesso: { metade: true } } },
        { id: "tributo", nome: "Tributo Mortal", texto: "Começando a rodada com 20 PV ou menos, os afogados na ilhota gastam a ação de suporte indo até ele e explodem em lodo: +10 PV por afogado.", motor: { tipo: "tributo", limite: 20, ameaca: "afogado", cura: 10 } },
        { id: "enigma", nome: "Enigma de Medo", texto: "A manifestação está presa a objetos da cena; destruir a origem o deixa atordoado 1 rodada e sem a redução de dano. Os detalhes são do Mestre (pacote da missão).", motor: { tipo: "manual" } },
      ],
      estrategia: "1ª rodada: corpo a corpo no mais forte ao alcance; 2ª: Investida Equina; 3ª e 4ª: Enxurrada de Morte; depois repete.",
      fonte: { doc: "beta", pagina: 43, paginaNoTexto: 46 },
      lacunas: ["Redução de dano: o texto diz que ele a perde, mas a ficha não imprime o valor."],
    } },
    { id: "cria-da-floresta", nome: "Cria da Floresta", ordem2: {
      natureza: "criatura", elementos: ["Energia"], pv: 10, atributos: { fisico: 6, mente: 4, emocao: 4 }, pericias: { acrobacia: 6, atletismo: 6, luta: 6, percepcao: 6 },
      acoes: [
        { id: "garras", nome: "Garras", alcance: "corpo", pericia: "luta", dano: 1, texto: "Teste 2d6, dano RA+1." },
        { id: "derrubar", nome: "Derrubar", alcance: "especial", fase: "suporte", pericia: "luta", texto: "Teste de Luta oposto contra o alvo; vencendo, ele fica caído. Quando várias atacam o mesmo alvo, a primeira pode derrubar para facilitar as outras.", motor: { tipo: "oposto", pericia: "luta", contra: "luta", dano: null, condicoes: ["caido"] } },
      ],
      estrategia: "Saltam na vítima e retalham com as garras; várias no mesmo alvo: a primeira tenta derrubar.",
      fonte: { doc: "beta", pagina: 71, paginaNoTexto: 73 },
    } },
    { id: "ellen-trechend", nome: "Ellén Trechend", ordem2: {
      natureza: "criatura", elementos: [], pv: null, semFicha: true,
      habilidades: [
        { id: "cabecas", nome: "Ataques das Cabeças", texto: "No início de cada rodada da perseguição, dois personagens sorteados: o primeiro sofre 1d6 de dano físico (mordida ou veneno), o segundo 1d6 de dano emocional (a cabeça de muitos olhos). Facilitando: 1d4.", motor: { tipo: "cabecas", fisico: [1, 6], emocional: [1, 6], facilitado: [1, 4] } },
        { id: "alcance", nome: "Alcançar e devorar", texto: "No fim das rodadas 3, 4 e 5, quem tiver menos de 15, 20 e 30 pontos de avanço é alcançado; morre só o de menor pontuação (empate: teste oposto entre eles). Facilitando: no máximo três mortes, empate decidido em 1d20.", motor: { tipo: "manual" } },
      ],
      estrategia: "Não há combate: é uma perseguição até a aldeia.",
      fonte: { doc: "beta", pagina: 73 },
      lacunas: ["Sem ficha nos arquivos: atributos, PV e ações não são impressos (só os efeitos da perseguição)."],
    } },
    /* Alpha: o que aparece nas missões sem ficha. */
    { id: "idolo-de-pedra", nome: "Ídolo de Pedra", ordem2: { natureza: "artefato", elementos: [], pv: null, semFicha: true, fonte: { doc: "alpha", pagina: 51 }, lacunas: ["Artefato sem ficha: a maldição é uma tabela de rodadas da missão (pacote do Mestre)."] } },
    { id: "cadaveres-erguidos", nome: "Cadáveres erguidos", ordem2: { natureza: "criatura", elementos: [], pv: null, semFicha: true, fonte: { doc: "alpha", pagina: 53 }, lacunas: ["Sem ficha: o efeito é narrado pela tabela da maldição (pacote do Mestre)."] } },
    { id: "manifestacao-compendio", nome: "Manifestação do compêndio", ordem2: { natureza: "manifestacao", elementos: [], pv: null, semFicha: true, fonte: { doc: "alpha", pagina: 70 }, lacunas: ["Manifestações catalogadas só no compêndio (handout do Ato II), sem ficha de combate."] } },
  ];
  LISTA.forEach(function (x) { x.ordem2 = normalizar(x.ordem2); });

  function porId(idOuNome) {
    var k = String(idOuNome || "").toLowerCase();
    return LISTA.filter(function (x) { return x.id === k || x.nome.toLowerCase() === k; })[0] || null;
  }
  function linha(b) {
    var x = normalizar(b);
    if (x.semFicha) return (NATUREZAS[x.natureza] || "") + " · sem ficha nos arquivos";
    var at = x.atributos ? "Físico d" + x.atributos.fisico + " · Mente d" + x.atributos.mente + " · Emoção d" + x.atributos.emocao : "";
    return [x.pv !== null ? "PV " + x.pv : "", at, x.rd !== null && x.rd ? "RD " + x.rd : ""].filter(Boolean).join(" · ");
  }
  /* Uma OCORRÊNCIA para a mesa: PV, ataques e especiais próprios. */
  function paraNpc(b, nome) {
    var x = normalizar(b);
    if (x.semFicha || x.pv === null || !x.atributos) return null;
    var ataques = x.acoes.filter(function (a) { return a.alcance !== "especial"; }).map(function (a) { return { id: a.id, nome: a.nome, alcance: a.alcance, dano: a.dano === null ? 0 : a.dano, efeitos: a.efeitos, especial: a.texto.slice(0, 600) }; });
    var especiais = x.acoes.filter(function (a) { return a.motor; }).concat(x.habilidades.filter(function (h) { return h.motor && h.motor.tipo !== "manual"; })).map(function (a) { return { id: a.id, nome: a.nome, motor: a.motor, fase: a.fase || "", dano: a.dano === undefined ? null : a.dano }; });
    var pericias = {};
    Object.keys(x.pericias).forEach(function (k) { pericias[k] = x.pericias[k]; });
    ["luta", "acrobacia", "percepcao", "intuicao", "vigor", "disciplina"].forEach(function (k) { if (!pericias[k]) pericias[k] = 4; });
    return { nome: nome || "", pv: x.pv, armadura: x.armadura, rd: x.rd, atributos: x.atributos, pericias: pericias, ataques: ataques.length ? ataques : [{ nome: "Ataque", alcance: "corpo", dano: 0 }], especiais: especiais };
  }

  global.RAMAOrdem2Ameacas = {
    NATUREZAS: NATUREZAS, ELEMENTOS: ELEMENTOS, ALCANCES: ALCANCES, MOTORES: MOTORES,
    LISTA: LISTA, porId: porId, normalizar: normalizar, linha: linha, paraNpc: paraNpc,
  };
})(typeof window !== "undefined" ? window : globalThis);
/* <<< js/ordem2/ameacas.js */

/* >>> js/ordem2/procedimentos.js */
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
  function rodadaAtual(e) { return e.combate.ativo && e.perfil !== "alpha-contemporaneo" ? e.combate.rodada : e.proc.rodada; }
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
    if (cena.perfil && cena.perfil !== e.perfil) ev(s, "Atenção: a cena é do perfil " + K().PERFIS_REGRAS[cena.perfil].nome + " e a campanha está em " + K().PERFIS_REGRAS[e.perfil].nome + " — nada é convertido; troque o perfil da campanha se for o caso.", true);
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
    var ok = sol.tipo === "interagir" ? ["pendente", "resolvida"].indexOf(sol.estado) >= 0 : sol.estado === "sucesso";
    if (!ok) return { ok: false, motivo: sol.tipo === "interagir" ? "Interação já fechada." : "Só depois de um teste bem-sucedido." };
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
  function pontos(res, b) { return M().pontuacao(res, b.perfilRegras === "beta-vigilia"); }
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
        var linha = nome + " soma " + pts + (res.critico && b.perfilRegras === "beta-vigilia" ? " (crítico: duas maiores)" : "") + " → " + d.dados.pa + "/" + inteiro(cf.pa, 1, 999, 10) + ".";
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
          var dnA = M().dano(res, { dano: inteiro(cf.ataque.dano, -10, 50, 0) }, [], b.perfilRegras === "beta-vigilia");
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
    if (o.acao === "ativar") { t.ativa = o.valor !== false; if (t.ativa && o.inicio !== undefined) t.inicio = inteiro(o.inicio, 0, 100000, rodadaAtual(e)); else if (t.ativa && o.agora) t.inicio = rodadaAtual(e); }
    else if (o.acao === "suspender") t.suspensa = o.valor !== false;
    else if (o.acao === "isentar") { var r = String(inteiro(o.rodada, 0, 100000, rodadaAtual(e))); t.isentos[r] = lista(t.isentos[r]).filter(function (p) { return p !== o.personagem; }); if (o.valor !== false) t.isentos[r].push(String(o.personagem)); }
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
    aplicarTabelas(e, fichas, r, rolar, s);
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
    var r = String(rodadaAtual(e));
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
        var mt = M().montar(b, { pericia: ef.pericia, dt: inteiro(ef.dt, 0, 40, 10), rotulo: nomeEf + " (" + K().nomeDaPericia(b.perfilRegras, ef.pericia, b.ambientacao) + ")", bonus: bonus }, {});
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
    var ganho = res.sucesso ? M().pontuacao(res, b.perfilRegras === "beta-vigilia") : res.rb;
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
    vp.tabelas = p.tabelas.filter(function (t) { return t.ativa; }).map(function (t) { var n = rodadaAtual(e) - t.inicio + 1; return { id: t.id, nome: t.nome, tipo: t.tipo, suspensa: t.suspensa, rodadaNaTabela: n, linhaAtual: t.tipo === "sobrecarga" ? copiar(linhaDaTabela(t, rodadaAtual(e))) : null, passadas: t.tipo === "maldicao" ? t.linhas.filter(function (l) { return l.de <= n && l.texto; }).map(function (l) { return l.texto; }) : [] }; });
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
/* <<< js/ordem2/procedimentos.js */

/* >>> js/ordem2/evolucao.js */
/* =====================================================================
   R.A.M.A. — Ordem Paranormal RPG II · evolução (v9.2)
   Experimental — regra do R.A.M.A.
   ---------------------------------------------------------------------
   O QUE O TEXTO DIZ (Alpha pp. 15–16; Beta p. 8): nível de 1 a 10; a
   ficha começa com duas habilidades (perfil e ocupação/vocação) e
   "recebe novas habilidades à medida que subir de nível ou treinar";
   d20 só com influência paranormal. NÃO HÁ tabela de evolução.

   O QUE ESTE MÓDULO PROPÕE (configurável pela campanha, nunca chamado
   de regra publicada):
     livre       o Mestre define nível e mudanças (edita a ficha); nada é
                 automático
     marcos      o Mestre confirma subir UM nível; quem joga escolhe UMA
                 melhoria: +1 passo num atributo ou perícia (até d12, sem
                 d20), +2 PV máximos, +2 PD máximos, ou uma habilidade
                 que o Mestre aprova
   Nada é inferido dos presets (nem ganho, nem patamar, nem promoção).
   As melhorias ficam em REGISTROS separados dos valores impressos
   (`base` nunca muda): os dados efetivos somam os passos dos registros
   vivos. Aumentar o máximo preserva os pontos atuais (recuperar é outra
   ação); desfazer tira só os ganhos daquele registro — se um registro
   posterior depende dele, pede para desfazer esse antes — e nunca
   devolve dano antigo. Perícias são referidas pela CHAVE (os ids mudam
   ao importar), habilidades pela marca `origemEvolucao`.

   Copiado para backend/Ordem2.gs (testes/gerar-ordem2-gs.js).
   ===================================================================== */

(function (global) {
  "use strict";

  function K() { return global.RAMAOrdem2Catalogo; }
  function R() { return global.RAMAOrdem2; }
  function ME() { return global.RAMAOrdem2Mesa; }
  function lista(v) { return Array.isArray(v) ? v : []; }
  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  function texto(v, n) { return String(v === undefined || v === null ? "" : v).slice(0, n || 200); }
  function inteiro(v, a, b, p) { var n = Math.floor(Number(v)); if (!Number.isFinite(n)) return p === undefined ? a : p; return Math.max(a, Math.min(b, n)); }
  function copiar(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
  function id() { return R().novoId(); }

  var MODOS = { livre: "Livre (o Mestre atribui)", marcos: "Por marcos — Experimental (regra do R.A.M.A.)" };
  var TIPOS = {
    atributo: "+1 passo num atributo (até d12)",
    pericia: "+1 passo numa perícia (até d12)",
    pv: "+2 PV máximos",
    pd: "+2 PD máximos",
    habilidade: "Uma habilidade (aprovada pelo Mestre)",
  };
  var PADRAO = { modo: "livre", pvPorEscolha: 2, pdPorEscolha: 2, teto: 12 };

  function normalizarConfig(x) {
    var c = obj(x);
    return { modo: MODOS[c.modo] ? c.modo : "livre", pvPorEscolha: inteiro(c.pvPorEscolha, 1, 10, 2), pdPorEscolha: inteiro(c.pdPorEscolha, 1, 10, 2), teto: [8, 10, 12].indexOf(Number(c.teto)) >= 0 ? Number(c.teto) : 12 };
  }
  function normalizarGanho(x) {
    var g = obj(x);
    if (!TIPOS[g.tipo]) return null;
    return { tipo: g.tipo, chave: texto(g.chave, 60), n: inteiro(g.n, -4, 10, 1), de: texto(g.de, 20), para: texto(g.para, 20), habilidade: g.habilidade ? copiar(obj(g.habilidade)) : null };
  }
  function normalizar(x) {
    var e = obj(x);
    return {
      nex: texto(e.nex, 20),
      pendente: e.pendente && typeof e.pendente === "object" ? {
        id: texto(e.pendente.id, 80) || id(), nivelDepois: inteiro(e.pendente.nivelDepois, 1, 10, 1), nivelAntes: inteiro(e.pendente.nivelAntes, 1, 10, 1),
        aprovadoEm: texto(e.pendente.aprovadoEm, 40), proposta: e.pendente.proposta ? copiar(obj(e.pendente.proposta)) : null, config: normalizarConfig(e.pendente.config),
      } : null,
      registros: lista(e.registros).map(function (r) {
        var o = obj(r);
        return {
          id: texto(o.id, 80) || id(), quando: texto(o.quando, 40), opId: texto(o.opId, 80), modo: MODOS[o.modo] ? o.modo : "livre",
          nivelAntes: inteiro(o.nivelAntes, 1, 10, 1), nivelDepois: inteiro(o.nivelDepois, 1, 10, 1),
          ganhos: lista(o.ganhos).map(normalizarGanho).filter(Boolean).slice(0, 6), nota: texto(o.nota, 300),
          desfeito: o.desfeito === true, desfeitoEm: texto(o.desfeitoEm, 40), procedencia: texto(o.procedencia, 120),
        };
      }).slice(-60),
    };
  }
  function bloco(b) { if (!b.evolucao || !b.evolucao.registros) b.evolucao = normalizar(b.evolucao); return b.evolucao; }
  function vivos(b) { return lista(bloco(b).registros).filter(function (r) { return !r.desfeito; }); }
  function chaveDaPericia(p) { return p.chave + (p.especializacao ? ":" + String(p.especializacao).toLowerCase() : ""); }

  /* Somas dos registros vivos (os dados impressos ficam em `base`). */
  function passosAtributo(b, chave) { var n = 0; vivos(b).forEach(function (r) { r.ganhos.forEach(function (g) { if (g.tipo === "atributo" && g.chave === chave) n += g.n; }); }); return n; }
  function passosPericia(b, p) { var k = chaveDaPericia(p), n = 0; vivos(b).forEach(function (r) { r.ganhos.forEach(function (g) { if (g.tipo === "pericia" && g.chave === k) n += g.n; }); }); return n; }
  function extra(b, tipo) { var n = 0; vivos(b).forEach(function (r) { r.ganhos.forEach(function (g) { if (g.tipo === tipo) n += g.n; }); }); return n; }

  /* O valor SEM efeitos temporários (o que a melhoria mexe). */
  function permanenteAtributo(b, chave) { return R().passoDado(b.base.atributos[chave] || 6, passosAtributo(b, chave), false); }
  function permanentePericia(b, p) { return R().passoDado(p.dado, passosPericia(b, p), false); }

  /* A prévia de uma escolha: antes/depois, ou o motivo de não caber. */
  function previa(b, escolha, config) {
    var cfg = normalizarConfig(config);
    var e = obj(escolha);
    if (!TIPOS[e.tipo]) return { ok: false, motivo: "Escolha o tipo de melhoria." };
    if (e.tipo === "atributo") {
      if (!K().ATRIBUTOS[e.chave]) return { ok: false, motivo: "Escolha o atributo." };
      var a = permanenteAtributo(b, e.chave);
      if (b.base.atributos[e.chave] === 20 || a >= cfg.teto) return { ok: false, motivo: K().ATRIBUTOS[e.chave].nome + " já está em d" + a + " (teto d" + cfg.teto + "; d20 só com efeito paranormal)." };
      return { ok: true, ganho: { tipo: "atributo", chave: e.chave, n: 1, de: "d" + a, para: "d" + R().passoDado(a, 1, false) }, rotulo: K().ATRIBUTOS[e.chave].nome + ": d" + a + " → d" + R().passoDado(a, 1, false) };
    }
    if (e.tipo === "pericia") {
      var p = lista(b.base.pericias).filter(function (q) { return q.id === e.chave || chaveDaPericia(q) === e.chave; })[0];
      if (!p) return { ok: false, motivo: "Escolha a perícia." };
      var d = permanentePericia(b, p);
      if (p.dado === 20 || d >= cfg.teto) return { ok: false, motivo: R().nomeDaPericia(b, p) + " já está em d" + d + " (teto d" + cfg.teto + "; sem d20)." };
      return { ok: true, ganho: { tipo: "pericia", chave: chaveDaPericia(p), n: 1, de: "d" + d, para: "d" + R().passoDado(d, 1, false) }, rotulo: R().nomeDaPericia(b, p) + ": d" + d + " → d" + R().passoDado(d, 1, false) };
    }
    if (e.tipo === "pv" || e.tipo === "pd") {
      var n = e.tipo === "pv" ? cfg.pvPorEscolha : cfg.pdPorEscolha;
      var max = e.tipo === "pv" ? R().pvMax(b) : R().pdMax(b);
      var atual = e.tipo === "pv" ? b.recursos.pv.atual : b.recursos.pd.atual;
      return { ok: true, ganho: { tipo: e.tipo, chave: "", n: n, de: String(max), para: String(max + n) }, rotulo: (e.tipo === "pv" ? "PV" : "PD") + " máx. " + max + " → " + (max + n) + "; " + (e.tipo === "pv" ? "PV" : "PD") + " atuais continuam " + atual };
    }
    var h = obj(e.habilidade);
    var nome = texto(h.nome || (K().HABILIDADES[h.ref] || {}).nome, 80);
    if (!nome) return { ok: false, motivo: "Descreva a habilidade (nome e efeito)." };
    if (!h.ref && !texto(h.texto, 1200).trim()) return { ok: false, motivo: "Escreva o efeito da habilidade personalizada." };
    return { ok: true, ganho: { tipo: "habilidade", chave: texto(h.ref, 60), n: 1, de: "", para: nome, habilidade: { ref: texto(h.ref, 60), nome: nome, texto: texto(h.texto || (K().HABILIDADES[h.ref] || {}).texto, 1200) } }, rotulo: "Nova habilidade: " + nome, precisaAprovar: true };
  }

  /* Aplica um registro (o nível sobe aqui). Não mexe em `base`. */
  function registrar(b, meta, ganhos) {
    var ev = bloco(b);
    var r = { id: id(), quando: meta.quando || new Date().toISOString(), opId: texto(meta.opId, 80), modo: meta.modo || "marcos", nivelAntes: b.nivel, nivelDepois: inteiro(meta.nivelDepois, 1, 10, b.nivel), ganhos: lista(ganhos).map(normalizarGanho).filter(Boolean), nota: texto(meta.nota, 300), desfeito: false, desfeitoEm: "", procedencia: texto(meta.procedencia, 120) };
    r.ganhos.forEach(function (g) {
      if (g.tipo === "habilidade" && g.habilidade) {
        var h = R().normalizarHabilidade(g.habilidade);
        h.origemEvolucao = r.id;
        b.habilidades.push(h);
      }
    });
    b.nivel = r.nivelDepois;
    ev.registros.push(r);
    ev.registros = ev.registros.slice(-60);
    return r;
  }

  /* Desfazer: só os ganhos daquele registro; dependências primeiro. */
  function dependentes(b, reg) {
    var todos = lista(bloco(b).registros), i = todos.indexOf(reg);
    var depois = todos.slice(i + 1).filter(function (r) { return !r.desfeito; });
    return depois.filter(function (r) {
      return r.ganhos.some(function (g) { return reg.ganhos.some(function (h) { return (g.tipo === h.tipo && g.chave === h.chave && (g.tipo === "atributo" || g.tipo === "pericia")); }); }) || r.nivelAntes >= reg.nivelDepois;
    });
  }
  function desfazer(b, regId) {
    var reg = lista(bloco(b).registros).filter(function (r) { return r.id === regId; })[0];
    if (!reg || reg.desfeito) return { ok: false, motivo: "Registro não encontrado (ou já desfeito)." };
    var dep = dependentes(b, reg);
    if (dep.length) return { ok: false, motivo: "Antes, desfaça o(s) registro(s) posterior(es) que dependem deste: " + dep.map(function (r) { return "nível " + r.nivelAntes + " → " + r.nivelDepois; }).join(", ") + ".", dependentes: dep.map(function (r) { return r.id; }) };
    reg.desfeito = true;
    reg.desfeitoEm = new Date().toISOString();
    b.habilidades = b.habilidades.filter(function (h) { return h.origemEvolucao !== reg.id; });
    if (b.nivel === reg.nivelDepois) b.nivel = reg.nivelAntes;
    /* Máximo menor: o atual não passa dele (dano antigo não volta). */
    b.recursos.pv.atual = Math.min(b.recursos.pv.atual, R().pvMax(b));
    b.recursos.pd.atual = Math.min(b.recursos.pd.atual, R().pdMax(b));
    return { ok: true, registro: reg };
  }

  /* A trilha 1–10 (só leitura; nada aqui muda a ficha). Patamar é
     SUGESTÃO de mesa: nunca é aplicado a partir do nível. */
  var PATAMAR_SUGERIDO = { 1: "iniciante", 2: "iniciante", 3: "iniciante", 4: "veterano", 5: "veterano", 6: "veterano", 7: "elite", 8: "elite", 9: "elite", 10: "lenda" };
  function trilha(b) {
    var evo = bloco(b), vivosL = vivos(b), l = [];
    for (var n = 1; n <= 10; n++) {
      var reg = vivosL.filter(function (r) { return r.nivelDepois === n && r.nivelAntes < n; }).slice(-1)[0] || null;
      var estado = n < b.nivel ? "passado" : n === b.nivel ? "atual" : evo.pendente && evo.pendente.nivelDepois === n ? "pendente" : "futuro";
      l.push({ nivel: n, estado: estado, registro: reg, patamarSugerido: PATAMAR_SUGERIDO[n] });
    }
    return l;
  }
  /* O registro que dá para desfazer agora: o vivo mais recente sem
     dependentes (e nenhum marco pendente). */
  function desfazivel(b) {
    var v = vivos(b);
    for (var i = v.length - 1; i >= 0; i--) { if (!dependentes(b, v[i]).length) return v[i]; }
    return null;
  }

  /* O rótulo de um ganho já registrado (histórico e resumo da mesa). */
  function rotuloGanho(g, b) {
    if (g.tipo === "atributo") return (K().ATRIBUTOS[g.chave] ? K().ATRIBUTOS[g.chave].nome : g.chave) + " " + g.de + " → " + g.para;
    if (g.tipo === "pericia") { var c = String(g.chave).split(":"); return K().nomeDaPericia(b ? b.perfilRegras : "alpha-contemporaneo", c[0], b ? b.ambientacao : "") + (c[1] ? " (" + c[1] + ")" : "") + " " + g.de + " → " + g.para; }
    if (g.tipo === "pv" || g.tipo === "pd") return g.tipo.toUpperCase() + " máx. " + g.de + " → " + g.para;
    return "Habilidade: " + g.para;
  }
  /* O que a mesa do Mestre vê de cada ficha (vai no resumo). */
  function resumo(b) {
    var e = bloco(b);
    return {
      nex: e.nex,
      pendente: e.pendente ? { id: e.pendente.id, nivelAntes: e.pendente.nivelAntes, nivelDepois: e.pendente.nivelDepois, proposta: e.pendente.proposta ? texto(e.pendente.proposta.rotulo, 120) : "" } : null,
      desfazivel: (desfazivel(b) || {}).id || "",
      registros: e.registros.slice(-6).map(function (r) { return { id: r.id, nivelAntes: r.nivelAntes, nivelDepois: r.nivelDepois, modo: r.modo, desfeito: r.desfeito, quando: r.quando.slice(0, 10), ganhos: r.ganhos.map(function (g) { return rotuloGanho(g, b); }).join("; ") || r.nota }; }),
    };
  }

  /* ---------------------------------------------------------------
     A CONFIGURAÇÃO DA CAMPANHA (e.modulos.evolucao) e as operações
     --------------------------------------------------------------- */
  function configDaMesa(e) { return normalizarConfig(e.modulos && e.modulos.evolucao); }
  function ev(s, t, privado) { s.eventos.push({ texto: String(t), privado: !!privado }); }
  function log(e, t) { ME().log(e, t); }
  function fichaDe(fichas, pid) { return fichas[pid] ? fichas[pid].bloco : null; }
  function nome(fichas, pid) { return fichas[pid] ? fichas[pid].nome : "?"; }

  if (ME()) {
    ME().gancho("normalizar", function (v, b) {
      var m = obj(b.modulos);
      v.modulos = { evolucao: normalizarConfig(m.evolucao), paranormal: m.paranormal ? copiar(m.paranormal) : null };
    });
    ME().registrarOperacao("evolucaoConfigurar", function (e, fichas, o, papel, rolar, s) {
      e.modulos = e.modulos || {};
      e.modulos.evolucao = normalizarConfig(Object.assign({}, configDaMesa(e), obj(o.config)));
      ev(s, "Evolução: " + MODOS[e.modulos.evolucao.modo] + ".");
      log(e, "Evolução da campanha: " + MODOS[e.modulos.evolucao.modo] + ".");
    }, { mestre: true, semFicha: true, rev: true });
    /* Livre: o Mestre põe o nível (e registra a mudança, sem ganhos). */
    ME().registrarOperacao("definirNivel", function (e, fichas, o, papel, rolar, s) {
      var b = fichaDe(fichas, o.personagem);
      if (!b) return { ok: false, motivo: "Personagem não encontrado." };
      var n = inteiro(o.nivel, 1, 10, b.nivel);
      if (n === b.nivel) return { ok: false, motivo: "O nível já é " + n + "." };
      if (bloco(b).pendente) return { ok: false, motivo: "Há um marco pendente: escolha a melhoria ou cancele o marco antes de mudar o nível." };
      registrar(b, { modo: "livre", nivelDepois: n, opId: o.opId, nota: texto(o.nota, 300) || "Nível definido pelo Mestre (modo livre)." }, []);
      ev(s, nome(fichas, o.personagem) + ": nível " + n + " (o Mestre define as mudanças na ficha).");
      log(e, nome(fichas, o.personagem) + " vai ao nível " + n + ".");
    }, { mestre: true });
    /* Marcos: o Mestre confirma subir um nível; fica a escolha pendente. */
    ME().registrarOperacao("subirNivel", function (e, fichas, o, papel, rolar, s) {
      var b = fichaDe(fichas, o.personagem);
      if (!b) return { ok: false, motivo: "Personagem não encontrado." };
      var cfg = configDaMesa(e);
      /* Sem atalho vindo do navegador: a ficha avulsa liga "por marcos"
         na própria mesa local (evolucaoConfigurar), como a campanha. */
      if (cfg.modo !== "marcos") return { ok: false, motivo: "O modo é livre: o nível muda por \"definir nível\"." };
      if (b.nivel >= 10) return { ok: false, motivo: "Nível 10 é o máximo (Alpha p. 15; Beta p. 8)." };
      var evo = bloco(b);
      if (o.nivelAntes !== undefined && Number(o.nivelAntes) !== b.nivel) return { ok: false, motivo: "O nível mudou desde que a tela abriu: confira e tente de novo." };
      if (evo.pendente) return { ok: false, motivo: "Já há uma subida de nível esperando a escolha." };
      evo.pendente = { id: id(), nivelAntes: b.nivel, nivelDepois: b.nivel + 1, aprovadoEm: new Date().toISOString(), proposta: null, config: cfg };
      ev(s, nome(fichas, o.personagem) + " pode subir ao nível " + (b.nivel + 1) + ": escolha a melhoria.");
      log(e, "O Mestre confirma: " + nome(fichas, o.personagem) + " sobe ao nível " + (b.nivel + 1) + " (escolha pendente).");
    }, { mestre: true });
    ME().registrarOperacao("escolherMelhoria", function (e, fichas, o, papel, rolar, s) {
      var pid = String(o.quem || ""), b = fichaDe(fichas, pid);
      if (!b || !ME().podeAgir(papel, pid)) return { ok: false, motivo: "Você não conduz este personagem." };
      var evo = bloco(b);
      if (!evo.pendente) return { ok: false, motivo: "Não há subida de nível pendente." };
      if (o.pendente && o.pendente !== evo.pendente.id) return { ok: false, motivo: "Este marco mudou (foi cancelado ou refeito): a tela foi atualizada." };
      if (evo.pendente.proposta && !papel.mestre) return { ok: false, motivo: "Já há uma habilidade aguardando a aprovação do Mestre." };
      var pv = previa(b, o.escolha, evo.pendente.config);
      if (!pv.ok) return pv;
      if (pv.precisaAprovar && !papel.mestre) {
        evo.pendente.proposta = { escolha: copiar(o.escolha), rotulo: pv.rotulo };
        ev(s, nome(fichas, pid) + " propõe: " + pv.rotulo + " — aguardando o Mestre.");
        log(e, nome(fichas, pid) + " propõe uma habilidade para o nível " + evo.pendente.nivelDepois + ".");
        return;
      }
      var r = registrar(b, { modo: evo.pendente.config.modo, nivelDepois: evo.pendente.nivelDepois, opId: o.opId, procedencia: "marcos" }, [pv.ganho]);
      evo.pendente = null;
      ev(s, nome(fichas, pid) + " sobe ao nível " + r.nivelDepois + ": " + pv.rotulo + ".");
      log(e, nome(fichas, pid) + " sobe ao nível " + r.nivelDepois + ": " + pv.rotulo + ".");
      s.resultado.registro = r.id;
    });
    ME().registrarOperacao("aprovarHabilidade", function (e, fichas, o, papel, rolar, s) {
      var b = fichaDe(fichas, o.personagem);
      if (!b) return { ok: false, motivo: "Personagem não encontrado." };
      var evo = bloco(b);
      if (!evo.pendente || !evo.pendente.proposta) return { ok: false, motivo: "Não há habilidade proposta." };
      if (o.pendente && o.pendente !== evo.pendente.id) return { ok: false, motivo: "Este marco mudou: a tela foi atualizada." };
      if (o.aprovar === false) { evo.pendente.proposta = null; ev(s, "O Mestre não aprovou a habilidade: escolha outra melhoria."); return; }
      var pv = previa(b, evo.pendente.proposta.escolha, evo.pendente.config);
      if (!pv.ok) return pv;
      var r = registrar(b, { modo: evo.pendente.config.modo, nivelDepois: evo.pendente.nivelDepois, procedencia: "marcos (aprovada pelo Mestre)" }, [pv.ganho]);
      evo.pendente = null;
      ev(s, nome(fichas, o.personagem) + " sobe ao nível " + r.nivelDepois + ": " + pv.rotulo + " (aprovada).");
      log(e, nome(fichas, o.personagem) + " sobe ao nível " + r.nivelDepois + ": " + pv.rotulo + ".");
    }, { mestre: true });
    ME().registrarOperacao("cancelarSubida", function (e, fichas, o, papel, rolar, s) {
      var b = fichaDe(fichas, o.personagem);
      if (!b || !bloco(b).pendente) return { ok: false, motivo: "Nada pendente." };
      if (o.pendente && o.pendente !== bloco(b).pendente.id) return { ok: false, motivo: "Este marco mudou: a tela foi atualizada." };
      bloco(b).pendente = null;
      ev(s, "Subida de nível cancelada.");
    }, { mestre: true });
    ME().registrarOperacao("desfazerEvolucao", function (e, fichas, o, papel, rolar, s) {
      var b = fichaDe(fichas, o.personagem);
      if (!b) return { ok: false, motivo: "Personagem não encontrado." };
      if (bloco(b).pendente) return { ok: false, motivo: "Há um marco pendente: resolva ou cancele antes de desfazer." };
      var r = desfazer(b, o.registro);
      if (!r.ok) return r;
      ev(s, nome(fichas, o.personagem) + ": desfeito o nível " + r.registro.nivelAntes + " → " + r.registro.nivelDepois + " (só os ganhos dele; dano antigo não volta).");
      log(e, nome(fichas, o.personagem) + ": evolução desfeita (" + r.registro.nivelAntes + " → " + r.registro.nivelDepois + ").");
    }, { mestre: true });
    ME().registrarOperacao("nex", function (e, fichas, o, papel, rolar, s) {
      var pid = String(o.quem || o.personagem || ""), b = fichaDe(fichas, pid);
      if (!b || !ME().podeAgir(papel, pid)) return { ok: false, motivo: "Sem permissão." };
      bloco(b).nex = texto(o.valor, 20);
      ev(s, "NEX anotado (só metadado; sem efeito nas regras).");
    });
  }

  /* Atualizar a ficha para outra versão do preset: só com prévia e
     confirmação; registros de evolução e o histórico ficam. */
  function previaAtualizacao(b) {
    if (!b.procedencia || !b.procedencia.preset) return { ok: false, motivo: "Esta ficha não veio de uma ficha pronta." };
    var novo = R().dePreset(b.procedencia.preset);
    if (!novo) return { ok: false, motivo: "Preset não encontrado." };
    var dif = [];
    K().ORDEM_ATRIBUTOS.forEach(function (k) { if (novo.base.atributos[k] !== b.base.atributos[k]) dif.push(K().ATRIBUTOS[k].nome + ": d" + b.base.atributos[k] + " → d" + novo.base.atributos[k]); });
    novo.base.pericias.forEach(function (p) { var q = lista(b.base.pericias).filter(function (x) { return chaveDaPericia(x) === chaveDaPericia(p); })[0]; if (!q || q.dado !== p.dado) dif.push(R().nomeDaPericia(novo, p) + ": " + (q ? "d" + q.dado : "—") + " → d" + p.dado); });
    if (novo.recursos.pv.max !== b.recursos.pv.max) dif.push("PV impressos: " + b.recursos.pv.max + " → " + novo.recursos.pv.max);
    if (novo.recursos.pd.max !== b.recursos.pd.max) dif.push("PD impressos: " + b.recursos.pd.max + " → " + novo.recursos.pd.max);
    return { ok: true, diferencas: dif, versaoAntes: b.procedencia.versaoDados, versaoDepois: K().VERSAO_DADOS, novo: novo };
  }
  function aplicarAtualizacao(b, confirmar) {
    var p = previaAtualizacao(b);
    if (!p.ok) return p;
    if (confirmar !== true) return Object.assign({}, p, { ok: false, motivo: "Confirme depois de ver a prévia." });
    var antiga = copiar(b.procedencia);
    b.base = copiar(p.novo.base);
    b.recursos.pv.max = p.novo.recursos.pv.max;
    b.recursos.pd.max = p.novo.recursos.pd.max;
    b.procedencia = Object.assign({}, p.novo.procedencia);
    b.historico.push({ quando: new Date().toISOString(), tipo: "preset", texto: "Atualizada do preset " + antiga.preset + " (dados v" + antiga.versaoDados + " → v" + b.procedencia.versaoDados + "): " + (p.diferencas.join("; ") || "sem diferenças nos números") + ". Registros de evolução preservados.", corrigido: false });
    b.recursos.pv.atual = Math.min(b.recursos.pv.atual, R().pvMax(b));
    b.recursos.pd.atual = Math.min(b.recursos.pd.atual, R().pdMax(b));
    return { ok: true, diferencas: p.diferencas };
  }

  global.RAMAOrdem2Evolucao = {
    MODOS: MODOS, TIPOS: TIPOS, PADRAO: PADRAO,
    normalizar: normalizar, normalizarConfig: normalizarConfig, configDaMesa: configDaMesa,
    passosAtributo: passosAtributo, passosPericia: passosPericia, extra: extra, chaveDaPericia: chaveDaPericia,
    permanenteAtributo: permanenteAtributo, permanentePericia: permanentePericia,
    previa: previa, registrar: registrar, desfazer: desfazer, dependentes: dependentes, vivos: vivos,
    previaAtualizacao: previaAtualizacao, aplicarAtualizacao: aplicarAtualizacao,
    rotuloGanho: rotuloGanho, resumo: resumo, trilha: trilha, desfazivel: desfazivel, PATAMAR_SUGERIDO: PATAMAR_SUGERIDO,
  };
})(typeof window !== "undefined" ? window : globalThis);
/* <<< js/ordem2/evolucao.js */

/* >>> js/ordem2/paranormal.js */
/* =====================================================================
   R.A.M.A. — Ordem Paranormal RPG II · paranormal (v9.2)
   Experimental — regra do R.A.M.A.
   ---------------------------------------------------------------------
   O QUE O TEXTO DIZ: o Beta (p. 2) anuncia um sistema paranormal —
   rituais, poderes, objetos amaldiçoados — que NÃO está nos playtests;
   d20 só vem do paranormal (Alpha p. 16; Beta p. 8). A gruta (Beta pp.
   60–71) é o PROCEDIMENTO de uma aventura (encaixar runas acende a
   chama), não um modo geral de conjurar; o ritual de um handout e a
   classificação do compêndio também não são prova de custo.

   Por isso, três classes de entrada, sempre separadas:
     procedimento   documentado numa missão: joga-se pelo desafio da cena
                    (runas etc.), nunca pela conjuração livre
     consulta       referência sem automação (objeto, manifestação)
     experimental   criado pelo Mestre para o MÓDULO EXPERIMENTAL — este
                    sim conjurável, e só com o módulo ligado

   O MÓDULO (desligado por padrão; o Mestre liga na campanha):
     imediato    consome a ação indicada; Mente + Ocultismo/Bruxaria
     elaborado   etapas, componentes e ordem; teste na execução final
     DT e custo  rascunho ajustável: simples 7/1 PD, intermediário 10/3,
                 complexo 13/5 (campanha e ritual mudam)
     custo       cobrado UMA vez na confirmação da execução, também na
                 falha; repetir a mesma operação (opId) não cobra de novo
     efeitos     normal, crítico, falha e falha crítica separados; sem
                 efeito configurado, vai para o Mestre (nada inventado)
     forçar      opcional: antes da rolagem, 2 PV por +1 passo num dado
                 do teste, uma vez; preço e vantagem editáveis; risco de
                 pavor ou consumo de componente como ALTERNATIVA explícita
     elemento    descreve; não concede efeito sozinho
   Nada de círculo, afinidade, custo ou NEX de Ordem I.

   Desligar o módulo bloqueia conjurações novas e preserva rituais,
   histórico e efeitos ativos (o Mestre finaliza ou encerra à mão).
   Copiado para backend/Ordem2.gs (testes/gerar-ordem2-gs.js).
   ===================================================================== */

(function (global) {
  "use strict";

  function K() { return global.RAMAOrdem2Catalogo; }
  function R() { return global.RAMAOrdem2; }
  function M() { return global.RAMAOrdem2Motor; }
  function ME() { return global.RAMAOrdem2Mesa; }
  function P() { return global.RAMAOrdem2Proc; }
  function lista(v) { return Array.isArray(v) ? v : []; }
  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  function texto(v, n) { return String(v === undefined || v === null ? "" : v).slice(0, n || 200); }
  function inteiro(v, a, b, p) { var n = Math.floor(Number(v)); if (!Number.isFinite(n)) return p === undefined ? a : p; return Math.max(a, Math.min(b, n)); }
  function copiar(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
  function id() { return R().novoId(); }
  function agora() { return new Date().toISOString(); }

  var SELO = "Experimental — regra do R.A.M.A.";
  var ELEMENTOS = ["Sangue", "Morte", "Conhecimento", "Energia", "Medo"];
  var TIPOS = { ritual: "Ritual", poder: "Poder", objeto: "Objeto amaldiçoado" };
  var CLASSES = { experimental: "Experimental (conjurável com o módulo ligado)", procedimento: "Procedimento de missão (joga-se pela cena)", consulta: "Consulta (sem automação)" };
  var COMPLEXIDADES = { simples: "Simples", intermediario: "Intermediário", complexo: "Complexo" };
  var MODOS = { imediato: "Imediato", elaborado: "Elaborado" };
  var DURACOES = { instantaneo: "Instantâneo", rodada: "Até o fim da rodada", cena: "A cena", missao: "A missão", permanente: "Permanente (até encerrar)" };
  var ALVOS = { proprio: "Quem conjura", um: "Um alvo", varios: "Vários alvos", area: "Área (o Mestre escolhe)" };
  var TIPOS_EFEITO = { dano: "Dano", cura: "Cura", condicao: "Condição", passo: "Passo num dado", dado: "Dado bônus guardado", marcador: "Marcador", mestre: "Decisão do Mestre" };
  var RESULTADOS = ["normal", "critico", "falha", "falhaCritica"];
  var CONDICOES = ["caido", "perdeAcao", "inconsciente"];

  /* O rascunho da campanha (todos ajustáveis). */
  function configPadrao() {
    return {
      ativo: false,
      atributo: "mente", pericia: "ocultismo",
      dts: { simples: 7, intermediario: 10, complexo: 13 },
      custos: { simples: 1, intermediario: 3, complexo: 5 },
      forcar: { permitido: false, pv: 2, passos: 1, alternativa: "pv" }, /* pv | pavor | componente */
    };
  }
  function normalizarConfig(x) {
    var c = obj(x), v = configPadrao();
    v.ativo = c.ativo === true;
    v.atributo = K().ATRIBUTOS[c.atributo] ? c.atributo : "mente";
    v.pericia = texto(c.pericia, 40) || "ocultismo";
    var d = obj(c.dts), q = obj(c.custos), f = obj(c.forcar);
    Object.keys(v.dts).forEach(function (k) { v.dts[k] = inteiro(d[k], 0, 40, v.dts[k]); v.custos[k] = inteiro(q[k], 0, 40, v.custos[k]); });
    v.forcar = { permitido: f.permitido === true, pv: inteiro(f.pv, 0, 20, 2), passos: inteiro(f.passos, 1, 2, 1), alternativa: ["pv", "pavor", "componente"].indexOf(f.alternativa) >= 0 ? f.alternativa : "pv" };
    return v;
  }

  function normalizarEfeito(x) {
    var e = obj(x);
    if (!TIPOS_EFEITO[e.tipo]) return null;
    return {
      tipo: e.tipo, valor: texto(e.valor, 20), recurso: e.recurso === "pd" ? "pd" : "pv", danoTipo: e.danoTipo === "emocional" ? "emocional" : "fisico",
      condicao: CONDICOES.indexOf(e.condicao) >= 0 ? e.condicao : "", alvoDado: e.alvoDado === "atributo" || e.alvoDado === "todos" ? e.alvoDado : "pericia", chave: texto(e.chave, 40),
      n: inteiro(e.n, -4, 4, 1), faces: [4, 6, 8, 10, 12, 20].indexOf(Number(e.faces)) >= 0 ? Number(e.faces) : 0, d20: e.d20 === true,
      duracao: DURACOES[e.duracao] ? e.duracao : "", quem: e.quem === "proprio" ? "proprio" : "alvo", texto: texto(e.texto, 600),
    };
  }
  function normalizarEntrada(x) {
    var r = obj(x);
    var nome = texto(r.nome, 120);
    if (!nome) return null;
    var ef = obj(r.efeitos), efeitos = {};
    RESULTADOS.forEach(function (k) { efeitos[k] = lista(ef[k]).map(normalizarEfeito).filter(Boolean).slice(0, 6); });
    return {
      id: texto(r.id, 80) || id(), nome: nome, tipo: TIPOS[r.tipo] ? r.tipo : "ritual", classe: CLASSES[r.classe] ? r.classe : "experimental",
      modo: MODOS[r.modo] ? r.modo : "imediato", complexidade: COMPLEXIDADES[r.complexidade] ? r.complexidade : "simples",
      elementos: lista(r.elementos).filter(function (e) { return ELEMENTOS.indexOf(e) >= 0; }).slice(0, 5),
      escopo: texto(r.escopo, 120), tempo: texto(r.tempo, 60), acao: texto(r.acao, 60) || "uma ação", alcance: texto(r.alcance, 60),
      alvo: ALVOS[r.alvo] ? r.alvo : "um", duracao: DURACOES[r.duracao] ? r.duracao : "instantaneo", gatilho: texto(r.gatilho, 200),
      componentes: lista(r.componentes).map(function (c) { var o = obj(c); return texto(o.nome, 80) ? { nome: texto(o.nome, 80), consome: o.consome === true, etapa: inteiro(o.etapa, 0, 20, 0), item: texto(o.item, 80) } : null; }).filter(Boolean).slice(0, 10),
      etapas: lista(r.etapas).map(function (t) { var o = obj(t); return texto(o.nome, 80) ? { nome: texto(o.nome, 80), acao: texto(o.acao, 60) } : null; }).filter(Boolean).slice(0, 10),
      testePorEtapa: r.testePorEtapa === true, interrompeComDano: r.interrompeComDano !== false,
      dt: r.dt === null || r.dt === undefined || r.dt === "" ? null : inteiro(r.dt, 0, 40, 7),
      custoPd: r.custoPd === null || r.custoPd === undefined || r.custoPd === "" ? null : inteiro(r.custoPd, 0, 40, 1),
      custoPv: inteiro(r.custoPv, 0, 40, 0),
      forcar: r.forcar && typeof r.forcar === "object" ? { pv: inteiro(r.forcar.pv, 0, 20, 2), passos: inteiro(r.forcar.passos, 1, 2, 1), alternativa: ["pv", "pavor", "componente"].indexOf(r.forcar.alternativa) >= 0 ? r.forcar.alternativa : "pv" } : null,
      efeitos: efeitos,
      referencias: lista(r.referencias).map(function (f) { var o = obj(f); return texto(o.fonte, 80) ? { fonte: texto(o.fonte, 80), pagina: texto(o.pagina, 20), nota: texto(o.nota, 300) } : null; }).filter(Boolean).slice(0, 8),
      notas: texto(r.notas, 2000),
      historico: lista(r.historico).map(function (h) { return texto(h, 300); }).slice(-30),
      origem: texto(r.origem, 80), versao: inteiro(r.versao, 1, 9999, 1),
    };
  }
  /* O bloco da ficha: rituais conhecidos (cópias), em andamento, ativos. */
  function normalizarBloco(x) {
    var b = obj(x);
    var em = b.emAndamento && typeof b.emAndamento === "object" ? b.emAndamento : null;
    return {
      rituais: lista(b.rituais).map(normalizarEntrada).filter(Boolean).slice(0, 40),
      emAndamento: em ? { id: texto(em.id, 80) || id(), ritual: texto(em.ritual, 80), etapa: inteiro(em.etapa, 0, 20, 0), alvos: lista(em.alvos).map(String).slice(0, 12), iniciado: texto(em.iniciado, 40), interrompido: em.interrompido === true, motivo: texto(em.motivo, 200), consumidos: lista(em.consumidos).map(String).slice(0, 10) } : null,
      ativos: lista(b.ativos).map(function (a) { var o = obj(a); return o.id ? { id: texto(o.id, 80), ritual: texto(o.ritual, 120), alvos: lista(o.alvos).map(String).slice(0, 12), duracao: DURACOES[o.duracao] ? o.duracao : "cena", efeitos: lista(o.efeitos).map(function (z) { var q = obj(z); return { pid: texto(q.pid, 80), efeitoId: texto(q.efeitoId, 80), descricao: texto(q.descricao, 200) }; }).slice(0, 12), desde: texto(o.desde, 40) } : null; }).filter(Boolean).slice(0, 20),
      historico: lista(b.historico).map(function (h) { var o = obj(h); return { quando: texto(o.quando, 40), texto: texto(o.texto, 400) }; }).slice(-60),
    };
  }
  /* A parte da mesa: config, biblioteca do Mestre, pendências. */
  function normalizarMesa(x) {
    var p = obj(x);
    return {
      biblioteca: lista(p.biblioteca).map(normalizarEntrada).filter(Boolean).slice(0, 80),
      pendentes: lista(p.pendentes).map(function (q) { var o = obj(q); return o.id ? { id: texto(o.id, 80), quem: texto(o.quem, 80), ritual: texto(o.ritual, 120), resultado: texto(o.resultado, 20), alvos: lista(o.alvos).map(String).slice(0, 12), texto: texto(o.texto, 600), estado: o.estado === "resolvido" ? "resolvido" : "pendente", resposta: texto(o.resposta, 600) } : null; }).filter(Boolean).slice(-30),
      historico: lista(p.historico).map(function (h) { var o = obj(h); return { quando: texto(o.quando, 40), texto: texto(o.texto, 400) }; }).slice(-80),
    };
  }

  /* O que a mesa do Mestre vê de cada ficha (vai no resumo). */
  function resumo(b) {
    var p = normalizarBloco(b.paranormal);
    var em = p.emAndamento, rit = em ? p.rituais.filter(function (r) { return r.id === em.ritual; })[0] : null;
    return {
      rituais: p.rituais.slice(0, 12).map(function (r) { return { id: r.id, nome: r.nome, origem: r.origem }; }),
      emAndamento: em ? { ritual: rit ? rit.nome : "?", etapa: em.etapa, total: rit ? Math.max(1, rit.etapas.length) : 1, interrompido: em.interrompido, motivo: em.motivo } : null,
      ativos: p.ativos.map(function (a) { return { id: a.id, ritual: a.ritual, duracao: a.duracao, descricao: a.efeitos.map(function (z) { return z.descricao; }).join("; ") }; }),
    };
  }
  function configDaMesa(e) { return normalizarConfig(e.modulos && e.modulos.paranormal); }
  function dtDe(cfg, r) { return r.dt !== null ? r.dt : cfg.dts[r.complexidade]; }
  function custoDe(cfg, r) { return r.custoPd !== null ? r.custoPd : cfg.custos[r.complexidade]; }
  function forcarDe(cfg, r) { return r.forcar || (cfg.forcar.permitido ? cfg.forcar : null); }

  /* A prévia mostrada antes de confirmar. */
  function previa(e, b, ritual, opcoes) {
    var cfg = configDaMesa(e), o = obj(opcoes);
    var r = normalizarEntrada(ritual);
    var problemas = [];
    if (!cfg.ativo) problemas.push("O módulo paranormal experimental está desligado nesta campanha.");
    if (r.classe !== "experimental") problemas.push(r.classe === "procedimento" ? "É um procedimento de missão: joga-se pela cena (desafio), não pela conjuração livre." : "Entrada de consulta: sem automação.");
    var per = R().pericia(b, cfg.pericia);
    var custo = custoDe(cfg, r);
    var fz = o.forcar ? forcarDe(cfg, r) : null;
    if (o.forcar && !fz) problemas.push("Forçar a conjuração não está habilitado.");
    var pvForcar = fz && fz.alternativa === "pv" ? fz.pv : 0;
    if (custo > b.recursos.pd.atual) problemas.push("PD insuficiente (" + b.recursos.pd.atual + "/" + custo + ").");
    if (pvForcar + r.custoPv > b.recursos.pv.atual) problemas.push("PV insuficiente para o custo.");
    var faltaComp = r.componentes.filter(function (c) { return c.item && !c.etapa && !lista(b.itens).some(function (i) { return i.id === c.item || i.nome === c.item; }); }).map(function (c) { return c.nome; });
    if (faltaComp.length) problemas.push("Faltam componentes: " + faltaComp.join(", ") + ".");
    if (fz && fz.alternativa === "componente" && !r.componentes.length) problemas.push("Forçar consumindo componente exige um componente no ritual.");
    return {
      ok: !problemas.length, problemas: problemas, ritual: r,
      acao: r.modo === "elaborado" ? r.etapas.length + " etapa(s): " + r.etapas.map(function (t) { return t.nome + (t.acao ? " (" + t.acao + ")" : ""); }).join(" → ") : r.acao,
      teste: K().ATRIBUTOS[cfg.atributo].nome + " + " + (per ? R().nomeDaPericia(b, per) : K().nomeDaPericia(b.perfilRegras, cfg.pericia, b.ambientacao)),
      dt: dtDe(cfg, r), custoPd: custo, custoPv: r.custoPv + pvForcar,
      forcar: fz ? (fz.alternativa === "pv" ? "+" + fz.passos + " passo por " + fz.pv + " PV" : fz.alternativa === "pavor" ? "+" + fz.passos + " passo, com risco de pavor na falha" : "+" + fz.passos + " passo consumindo um componente") : "",
      alvo: ALVOS[r.alvo], duracao: DURACOES[r.duracao], componentes: r.componentes.map(function (c) { return c.nome + (c.consome ? " (consumido)" : ""); }),
      selo: SELO,
    };
  }

  /* ---------------------------------------------------------------
     AS OPERAÇÕES (mesma porta, mesmo opId)
     --------------------------------------------------------------- */
  function ev(s, t, privado) { s.eventos.push({ texto: String(t), privado: !!privado }); }
  function nome(fichas, pid) { return fichas[pid] ? fichas[pid].nome : "?"; }
  function fichaDe(fichas, pid) { return fichas[pid] ? fichas[pid].bloco : null; }
  function blocoP(b) { if (!b.paranormal || !b.paranormal.rituais) b.paranormal = normalizarBloco(b.paranormal); return b.paranormal; }
  function histFicha(b, t) { var p = blocoP(b); p.historico.push({ quando: agora(), texto: String(t).slice(0, 400) }); p.historico = p.historico.slice(-60); }
  function histMesa(e, t) { e.paranormal.historico.push({ quando: agora(), texto: String(t).slice(0, 400) }); e.paranormal.historico = e.paranormal.historico.slice(-80); ME().log(e, t); }
  function rolarExpr(x, rolar) { return P() ? P().rolarExpr(x, rolar) : { total: Number(x) || 0, faces: [], expr: String(x) }; }

  function garantir(e) { if (!e.paranormal || !Array.isArray(e.paranormal.biblioteca)) e.paranormal = normalizarMesa(e.paranormal); if (!e.modulos) e.modulos = {}; }
  function OP(nome, fn, o) { ME().registrarOperacao(nome, function (e) { garantir(e); return fn.apply(null, arguments); }, o); }

  if (ME()) {
    ME().gancho("normalizar", function (v, b) { v.paranormal = normalizarMesa(b.paranormal); });
    ME().gancho("vista", function (v, e, papel) {
      garantir(e);
      /* A biblioteca é do Mestre; quem joga vê a configuração e as próprias pendências. */
      v.paranormal = { biblioteca: [], historico: e.paranormal.historico.slice(-20), pendentes: e.paranormal.pendentes.filter(function (q) { return lista(papel.pode).indexOf(q.quem) >= 0; }).map(function (q) { return { id: q.id, quem: q.quem, ritual: q.ritual, estado: q.estado, resposta: q.resposta }; }) };
    });

    OP("paranormalConfigurar", function (e, fichas, o, papel, rolar, s) {
      e.modulos = e.modulos || {};
      var antes = configDaMesa(e);
      var novo = normalizarConfig(Object.assign({}, antes, obj(o.config), { dts: Object.assign({}, antes.dts, obj(obj(o.config).dts)), custos: Object.assign({}, antes.custos, obj(obj(o.config).custos)), forcar: Object.assign({}, antes.forcar, obj(obj(o.config).forcar)) }));
      e.modulos.paranormal = novo;
      var t = "Paranormal (experimental): " + (novo.ativo ? "ligado" : "desligado") + " · DT/custo " + ["simples", "intermediario", "complexo"].map(function (k) { return novo.dts[k] + "/" + novo.custos[k] + " PD"; }).join(", ") + (novo.forcar.permitido ? " · forçar: " + novo.forcar.alternativa : "") + ".";
      if (antes.ativo && !novo.ativo) t += " Conjurações novas bloqueadas; rituais, histórico e efeitos ativos ficam (encerre os ativos à mão).";
      histMesa(e, t); ev(s, t);
    }, { mestre: true, semFicha: true, rev: true });

    OP("ritualSalvar", function (e, fichas, o, papel, rolar, s) {
      var r = normalizarEntrada(o.ritual);
      if (!r) return { ok: false, motivo: "Dê um nome ao ritual." };
      var i = e.paranormal.biblioteca.map(function (x) { return x.id; }).indexOf(r.id);
      if (i >= 0) { r.versao = e.paranormal.biblioteca[i].versao + 1; r.historico = e.paranormal.biblioteca[i].historico.concat(["v" + r.versao + " salva em " + agora().slice(0, 10)]).slice(-30); e.paranormal.biblioteca[i] = r; }
      else { r.historico = ["criada em " + agora().slice(0, 10)]; e.paranormal.biblioteca.push(r); }
      ev(s, "Biblioteca: " + r.nome + " (" + CLASSES[r.classe] + ").", true);
      s.resultado.ritual = r.id;
    }, { mestre: true, semFicha: true });
    OP("ritualRemover", function (e, fichas, o, papel, rolar, s) {
      e.paranormal.biblioteca = e.paranormal.biblioteca.filter(function (x) { return x.id !== o.id; });
      ev(s, "Removido da biblioteca (as cópias nas fichas ficam).", true);
    }, { mestre: true, semFicha: true });
    /* Ensinar: uma CÓPIA vai para a ficha (exporta junto; a biblioteca pode mudar depois). */
    OP("ritualEnsinar", function (e, fichas, o, papel, rolar, s) {
      var r = e.paranormal.biblioteca.filter(function (x) { return x.id === o.ritual; })[0];
      if (!r) return { ok: false, motivo: "Ritual não encontrado na biblioteca." };
      var para = lista(o.para).map(String).filter(function (pid) { return fichas[pid]; });
      if (!para.length) return { ok: false, motivo: "Para quem?" };
      para.forEach(function (pid) {
        var p = blocoP(fichas[pid].bloco);
        var copia = normalizarEntrada(Object.assign(copiar(r), { origem: r.id }));
        p.rituais = p.rituais.filter(function (x) { return x.origem !== r.id; }).concat([copia]);
        histFicha(fichas[pid].bloco, "Aprendeu " + r.nome + " (v" + r.versao + ").");
      });
      ev(s, r.nome + " ensinado a " + para.map(function (x) { return nome(fichas, x); }).join(", ") + ".");
      histMesa(e, r.nome + " ensinado a " + para.map(function (x) { return nome(fichas, x); }).join(", ") + ".");
    }, { mestre: true });

    /* CONJURAR (imediato) ou COMEÇAR (elaborado). Sem `confirmar`: só a prévia. */
    OP("conjurar", function (e, fichas, o, papel, rolar, s, ctx) {
      var pid = String(o.quem || ""), b = fichaDe(fichas, pid);
      if (!b || !ME().podeAgir(papel, pid)) return { ok: false, motivo: "Você não conduz este personagem." };
      var p = blocoP(b);
      var r = p.rituais.filter(function (x) { return x.id === o.ritual; })[0];
      if (!r) return { ok: false, motivo: "Ritual não encontrado na ficha." };
      var pv = previa(e, b, r, { forcar: !!o.forcar });
      s.resultado.previa = pv;
      if (!pv.ok) return { ok: false, motivo: pv.problemas.join(" ") };
      if (o.confirmar !== true) { ev(s, "Prévia: " + r.nome + " — " + pv.teste + " DT " + pv.dt + ", " + pv.custoPd + " PD" + (pv.custoPv ? " e " + pv.custoPv + " PV" : "") + "."); return; }
      if (r.modo === "elaborado") {
        if (p.emAndamento && !p.emAndamento.interrompido) return { ok: false, motivo: "Já há um ritual em andamento: conclua ou interrompa." };
        p.emAndamento = { id: id(), ritual: r.id, etapa: 0, alvos: lista(o.alvos).map(String), iniciado: agora(), interrompido: false, motivo: "", consumidos: [] };
        histFicha(b, "Começa " + r.nome + " (elaborado, " + r.etapas.length + " etapa(s)).");
        ev(s, nome(fichas, pid) + " começa " + r.nome + ": etapa 1 de " + Math.max(1, r.etapas.length) + " — " + ((r.etapas[0] || {}).nome || "preparo") + ".");
        ME().log(e, nome(fichas, pid) + " começa o ritual " + r.nome + ".");
        return;
      }
      return executar(e, fichas, o, papel, rolar, s, ctx, b, pid, r, lista(o.alvos).map(String));
    });
    OP("ritualEtapa", function (e, fichas, o, papel, rolar, s, ctx) {
      var pid = String(o.quem || ""), b = fichaDe(fichas, pid);
      if (!b || !ME().podeAgir(papel, pid)) return { ok: false, motivo: "Você não conduz este personagem." };
      var p = blocoP(b), em = p.emAndamento;
      if (!em) return { ok: false, motivo: "Nenhum ritual em andamento." };
      if (em.interrompido) return { ok: false, motivo: "O ritual foi interrompido: recomece." };
      if (!configDaMesa(e).ativo) return { ok: false, motivo: "O módulo está desligado: o Mestre decide como encerrar o ritual em andamento." };
      var r = p.rituais.filter(function (x) { return x.id === em.ritual; })[0];
      if (!r) return { ok: false, motivo: "Ritual não encontrado." };
      var total = Math.max(1, r.etapas.length);
      if (o.etapa !== undefined && inteiro(o.etapa, 0, 20, -1) !== em.etapa) return { ok: false, motivo: "Fora de ordem: a etapa agora é a " + (em.etapa + 1) + "." };
      /* Componentes daquela etapa. */
      var falta = r.componentes.filter(function (c) { return c.etapa === em.etapa + 1 && c.item && !lista(b.itens).some(function (i) { return i.id === c.item || i.nome === c.item; }); });
      if (falta.length) return { ok: false, motivo: "Falta o componente: " + falta.map(function (c) { return c.nome; }).join(", ") + "." };
      r.componentes.filter(function (c) { return c.etapa === em.etapa + 1 && c.consome; }).forEach(function (c) { consumir(b, c); em.consumidos.push(c.nome); });
      if (r.testePorEtapa && em.etapa < total - 1) {
        return ME().OPERACOES.teste(e, fichas, { quem: pid, pedido: pedidoDoRitual(e, b, r, null), contexto: { proc: { tipo: "ritualEtapa", ritual: r.id, etapa: em.etapa } }, confirmar: o.confirmar }, papel, rolar, s, ctx);
      }
      if (em.etapa < total - 1) {
        em.etapa++;
        ev(s, nome(fichas, pid) + ": etapa " + em.etapa + " de " + total + " feita (" + ((r.etapas[em.etapa - 1] || {}).nome || "") + "). Próxima: " + ((r.etapas[em.etapa] || {}).nome || "a execução") + ".");
        return;
      }
      /* Última etapa: a execução, com o custo e o teste. */
      if (o.confirmar !== true) { var pv = previa(e, b, r, { forcar: !!o.forcar }); s.resultado.previa = pv; ev(s, "Prévia da execução final: DT " + pv.dt + ", " + pv.custoPd + " PD."); return; }
      p.emAndamento = null;
      return executar(e, fichas, o, papel, rolar, s, ctx, b, pid, r, em.alvos);
    });
    OP("ritualInterromper", function (e, fichas, o, papel, rolar, s) {
      var pid = String(o.quem || o.personagem || ""), b = fichaDe(fichas, pid);
      if (!b || !ME().podeAgir(papel, pid)) return { ok: false, motivo: "Sem permissão." };
      var em = blocoP(b).emAndamento;
      if (!em) return { ok: false, motivo: "Nenhum ritual em andamento." };
      interromper(b, texto(o.motivo, 200) || (papel.mestre ? "interrompido pelo Mestre" : "interrompido por quem conjura"), s, nome(fichas, pid));
      if (o.descartar) blocoP(b).emAndamento = null;
    });
    OP("efeitoRitualEncerrar", function (e, fichas, o, papel, rolar, s) {
      var pid = String(o.personagem || ""), b = fichaDe(fichas, pid);
      if (!b) return { ok: false, motivo: "Personagem não encontrado." };
      var p = blocoP(b);
      var a = p.ativos.filter(function (x) { return x.id === o.efeito; })[0];
      if (!a) return { ok: false, motivo: "Efeito não encontrado." };
      a.efeitos.forEach(function (z) { var bz = fichaDe(fichas, z.pid); if (bz) bz.efeitos = bz.efeitos.filter(function (x) { return x.id !== z.efeitoId; }); });
      p.ativos = p.ativos.filter(function (x) { return x.id !== a.id; });
      var t = a.ritual + ": efeito " + (o.como === "finalizar" ? "finalizado" : "encerrado") + " pelo Mestre.";
      histFicha(b, t); histMesa(e, nome(fichas, pid) + " · " + t); ev(s, t);
    }, { mestre: true });
    OP("pendenteRitual", function (e, fichas, o, papel, rolar, s) {
      var q = e.paranormal.pendentes.filter(function (x) { return x.id === o.id; })[0];
      if (!q || q.estado !== "pendente") return { ok: false, motivo: "Pendência não encontrada." };
      q.estado = "resolvido"; q.resposta = texto(o.resposta, 600) || "Resolvido pelo Mestre.";
      histMesa(e, "Ritual " + q.ritual + " (" + q.resultado + "): " + q.resposta);
      ev(s, "Pendência resolvida.");
    }, { mestre: true });
  }

  function consumir(b, c) {
    if (!c.item) return;
    var it = lista(b.itens).filter(function (i) { return i.id === c.item || i.nome === c.item; })[0];
    if (!it) return;
    if (it.quantidade !== null && it.quantidade > 1) it.quantidade--;
    else b.itens = b.itens.filter(function (i) { return i !== it; });
  }
  function interromper(b, motivo, s, nomePc) {
    var em = blocoP(b).emAndamento;
    if (!em || em.interrompido) return;
    em.interrompido = true; em.motivo = motivo;
    histFicha(b, "Ritual interrompido (" + motivo + "); nenhum custo de execução foi cobrado" + (em.consumidos.length ? "; componentes já gastos: " + em.consumidos.join(", ") : "") + ".");
    if (s) ev(s, (nomePc || "") + ": ritual interrompido (" + motivo + ").");
  }
  /* Dano em quem conduz um ritual elaborado que se interrompe com dano. */
  if (M()) {
    var aplicarDanoOriginal = M().aplicarDano;
    M().aplicarDano = function (b, o) {
      var r = aplicarDanoOriginal.apply(null, arguments);
      try {
        var em = b && b.paranormal && b.paranormal.emAndamento;
        if (em && !em.interrompido && Number(obj(o).valor) > 0) {
          var rit = lista(b.paranormal.rituais).filter(function (x) { return x.id === em.ritual; })[0];
          if (rit && rit.interrompeComDano) { interromper(b, "sofreu dano", null); r.push({ texto: "O ritual em andamento foi interrompido pelo dano.", privado: false }); }
        }
      } catch (erro) { /* sem ritual, nada */ }
      return r;
    };
  }

  function pedidoDoRitual(e, b, r, forcar) {
    var cfg = configDaMesa(e);
    var per = R().pericia(b, cfg.pericia);
    var passos = [];
    if (forcar) { var fz = forcarDe(cfg, r); passos.push({ alvo: forcar.dado === "atributo" ? "atributo" : "pericia", n: fz.passos, fonte: "Forçar a conjuração (" + SELO + ")" }); }
    return { atributo: cfg.atributo, pericia: per ? per.id : "", dt: dtDe(cfg, r), rotulo: r.nome + " (" + COMPLEXIDADES[r.complexidade].toLowerCase() + ")", passos: passos };
  }
  /* A execução: cobra UMA vez (também na falha) e rola; os efeitos saem
     depois do teste valer (escolhas pós-rolagem incluídas). */
  function executar(e, fichas, o, papel, rolar, s, ctx, b, pid, r, alvos) {
    var cfg = configDaMesa(e);
    var fz = o.forcar ? forcarDe(cfg, r) : null;
    var pedido = pedidoDoRitual(e, b, r, fz ? obj(o.forcar) : null);
    var mt = M().montar(b, pedido, { permitir20: false });
    if (!mt.ok) return mt;
    var custos = { pd: custoDe(cfg, r), pv: r.custoPv + (fz && fz.alternativa === "pv" ? fz.pv : 0) };
    if (custos.pd > b.recursos.pd.atual || custos.pv > b.recursos.pv.atual) return { ok: false, motivo: "Custo não pode ser pago." };
    if (fz && fz.alternativa === "componente") { var c = r.componentes[0]; if (c) consumir(b, c); }
    M().pagarCustos(b, custos);
    r.componentes.filter(function (c) { return c.consome && !c.etapa; }).forEach(function (c) { consumir(b, c); });
    var execId = id();
    histFicha(b, "Conjura " + r.nome + ": custo " + custos.pd + " PD" + (custos.pv ? " e " + custos.pv + " PV" : "") + " (cobrado na confirmação).");
    ev(s, nome(fichas, pid) + " conjura " + r.nome + " — paga " + custos.pd + " PD" + (custos.pv ? " e " + custos.pv + " PV" : "") + ".");
    return ME().OPERACOES.teste(e, fichas, { quem: pid, pedido: pedido, contexto: { proc: { tipo: "ritual", ritual: r.id, alvos: alvos, execucao: execId, pavorNaFalha: !!(fz && fz.alternativa === "pavor") } }, confirmar: o.confirmar === true && o.aguardar !== true }, papel, rolar, s, ctx);
  }

  /* O teste VALEU: os efeitos do resultado. */
  if (ME()) ME().gancho("aoFinalizar", function (e, fichas, t, res, s, rolar) {
    var cx = obj(t.contexto.proc);
    if (cx.tipo === "ritual" || cx.tipo === "ritualEtapa") garantir(e);
    var b = fichaDe(fichas, t.quem);
    if (!b) return;
    if (cx.tipo === "ritualEtapa") {
      var em = blocoP(b).emAndamento;
      if (!em) return;
      if (res.sucesso) { em.etapa++; ev(s, t.nome + ": etapa " + em.etapa + " feita."); }
      else interromper(b, "falhou na etapa " + (em.etapa + 1), s, t.nome);
      return;
    }
    if (cx.tipo !== "ritual") return;
    var r = blocoP(b).rituais.filter(function (x) { return x.id === cx.ritual; })[0];
    if (!r) return;
    var chave = res.critico ? "critico" : res.falhaCritica ? "falhaCritica" : res.sucesso ? "normal" : "falha";
    var efeitos = r.efeitos[chave];
    if (chave === "critico" && !efeitos.length) efeitos = r.efeitos.normal; /* sem crítico próprio, vale o normal — e o Mestre é avisado */
    var nomeRes = { normal: "sucesso", critico: "crítico", falha: "falha", falhaCritica: "falha crítica" }[chave];
    if (cx.pavorNaFalha && res.sucesso === false) M().darPavor(b).forEach(function (y) { ev(s, t.nome + " (forçou com risco de pavor): " + y.texto); });
    histFicha(b, r.nome + ": " + nomeRes + " (" + res.total + " vs DT " + res.dt + ").");
    if (!efeitos.length) {
      pendente(e, t.quem, r, chave, cx.alvos, "Efeito de " + nomeRes + " não configurado: o Mestre decide.");
      ev(s, r.nome + ": " + nomeRes + " — sem efeito configurado; o Mestre decide (nada é inventado).");
      return;
    }
    if (chave === "critico" && !r.efeitos.critico.length) pendente(e, t.quem, r, chave, cx.alvos, "Crítico sem efeito próprio: aplicado o efeito normal; o Mestre pode acrescentar algo.");
    var ativo = { id: id(), ritual: r.nome, alvos: cx.alvos.slice(), duracao: r.duracao, efeitos: [], desde: agora() };
    efeitos.forEach(function (ef) { aplicarEfeito(e, fichas, t.quem, r, ef, cx.alvos, rolar, s, ativo, chave); });
    if (ativo.efeitos.length && r.duracao !== "instantaneo") blocoP(b).ativos.push(ativo);
  });
  function pendente(e, quem, r, resultado, alvos, txt) {
    e.paranormal.pendentes.push({ id: id(), quem: quem, ritual: r.nome, resultado: resultado, alvos: lista(alvos).slice(), texto: txt, estado: "pendente", resposta: "" });
    e.paranormal.pendentes = e.paranormal.pendentes.slice(-30);
  }
  /* Alvos: personagens da mesa (ids) ou participantes do combate (npc-…). */
  function blocosDosAlvos(e, fichas, quem, ef, alvos) {
    if (ef.quem === "proprio" || !lista(alvos).length) return [{ pid: quem, b: fichaDe(fichas, quem), nome: nome(fichas, quem) }];
    return lista(alvos).map(function (a) {
      if (fichas[a]) return { pid: a, b: fichaDe(fichas, a), nome: nome(fichas, a) };
      var pa = ME().participante(e, a);
      return pa ? { pid: pa.tipo === "pc" ? pa.personagemId : "", b: ME().blocoDoAtor(e, fichas, pa), nome: pa.nome } : null;
    }).filter(function (x) { return x && x.b; });
  }
  var EXPIRA_DE = { instantaneo: "teste", rodada: "rodada", cena: "cena", missao: "missao", permanente: "permanente" };
  function aplicarEfeito(e, fichas, quem, r, ef, alvos, rolar, s, ativo, chave) {
    if (ef.tipo === "mestre") { pendente(e, quem, r, chave, alvos, ef.texto || "O Mestre narra o efeito."); ev(s, r.nome + ": " + (ef.texto || "efeito narrado pelo Mestre") + " — aguardando o Mestre."); return; }
    blocosDosAlvos(e, fichas, quem, ef, alvos).forEach(function (a) {
      if (ef.tipo === "dano") { var d = rolarExpr(ef.valor, rolar); M().aplicarDano(a.b, { valor: d.total, tipo: ef.danoTipo, externo: true }).forEach(function (y) { ev(s, a.nome + " (" + r.nome + ", " + (d.faces.length ? d.expr + " [" + d.faces.join(", ") + "]" : d.total) + "): " + y.texto); }); return; }
      if (ef.tipo === "cura") { var c = rolarExpr(ef.valor, rolar); var n = M().curar(a.b, ef.recurso, c.total); ev(s, a.nome + " recupera " + n + " " + ef.recurso.toUpperCase() + " (" + r.nome + ")."); return; }
      if (ef.tipo === "condicao" && ef.condicao) { if (ef.condicao === "perdeAcao") a.b.estado.perdeAcao = 2; else a.b.estado[ef.condicao] = true; ev(s, a.nome + ": " + (R().NOMES_CONDICAO[ef.condicao] || ef.condicao) + " (" + r.nome + ")."); return; }
      if (ef.tipo === "passo" || ef.tipo === "marcador") {
        var eff = R().normalizarEfeito({ tipo: ef.alvoDado === "atributo" ? "passoAtributo" : ef.alvoDado === "todos" ? "passoTodos" : "passoPericia", alvo: ef.chave, n: ef.n, expira: EXPIRA_DE[ef.duracao || r.duracao] || "cena", fonte: r.nome + " (ritual experimental)", d20: ef.d20 });
        if (eff) { a.b.efeitos.push(eff); if (ativo && a.pid) ativo.efeitos.push({ pid: a.pid, efeitoId: eff.id, descricao: (ef.n > 0 ? "+" : "") + ef.n + " passo" + (ef.chave ? " em " + ef.chave : "") + (ef.d20 ? " (pode chegar a d20)" : "") }); ev(s, a.nome + ": " + (ef.n > 0 ? "+" : "") + ef.n + " passo" + (ef.chave ? " em " + ef.chave : "") + " (" + r.nome + ")."); }
        return;
      }
      if (ef.tipo === "dado" && ef.faces) { a.b.estado.reservas.push({ id: id(), faces: ef.faces, fonte: r.nome + " (ritual)", expira: EXPIRA_DE[ef.duracao || r.duracao] || "cena", alvo: ef.texto || "" }); ev(s, a.nome + " guarda +d" + ef.faces + " (" + r.nome + ")."); }
    });
  }

  global.RAMAOrdem2Paranormal = {
    SELO: SELO, ELEMENTOS: ELEMENTOS, TIPOS: TIPOS, CLASSES: CLASSES, COMPLEXIDADES: COMPLEXIDADES, MODOS: MODOS, DURACOES: DURACOES, ALVOS: ALVOS, TIPOS_EFEITO: TIPOS_EFEITO, RESULTADOS: RESULTADOS, CONDICOES: CONDICOES,
    configPadrao: configPadrao, normalizarConfig: normalizarConfig, configDaMesa: configDaMesa,
    normalizarEntrada: normalizarEntrada, normalizarBloco: normalizarBloco, normalizarMesa: normalizarMesa, normalizarEfeito: normalizarEfeito,
    previa: previa, dtDe: dtDe, custoDe: custoDe, resumo: resumo,
  };
})(typeof window !== "undefined" ? window : globalThis);
/* <<< js/ordem2/paranormal.js */
