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

function rotasDeOrdem2() {
  return {
    ler_ordem2: { publica: false, fn: acaoLerOrdem2 },
    ordem2_operar: { publica: false, fn: acaoOrdem2Operar },
  };
}

var MAX_OPS_ORDEM2 = 160;

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
  return RAMAOrdem2Mesa.normalizar(registro ? lerJson(registro.dadosJson, {}) : {});
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
  if (ctx.mestre) return { mestre: true, rev: rev, estado: estado, personagens: lista, pode: papel.pode };
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

    var r = M.aplicar(estado, mapa, op, papel, roladorDeOrdem2);
    if (!r.ok) return { ok: false, erro: 'dados_invalidos', motivo: r.motivo || '' };

    /* As fichas primeiro (cada uma com o opId), depois a mesa. */
    var gf = gravarFichasDeOrdem2(carregadas, mapa, opId, ctx.campanha.id);
    if (!gf.ok) return gf;
    feitas.push(opId);
    var g = gravarMesaOrdem2(ctx, registro, M.normalizar(estado), revAtual, feitas);
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
  var FASES = {
    geral: { nome: "Fase Geral", texto: "Qualquer ação, exceto ataques." },
    distancia: { nome: "Ataques à Distância", texto: "Ataques com armas de arremesso ou disparo." },
    corpo: { nome: "Corpo a Corpo", texto: "Ataques corpo a corpo e manobras." },
  };
  var ORDEM_FASES_PADRAO = ["geral", "distancia", "corpo"];
  var ACOES_COMBATE = {
    atrapalhar: { fase: "geral", nome: "Atrapalhar", texto: "Perícia coerente contra a Percepção do alvo (curto); vencendo, o alvo sofre −1 passo em todos os testes até o fim da rodada." },
    defender: { fase: "geral", nome: "Defender-se", texto: "Acrobacia +d6 (ou Luta, contra corpo a corpo) oposta a um ataque escolhido antes da rolagem; vencendo, não sofre dano (nem causa)." },
    fintar: { fase: "geral", nome: "Fintar", texto: "Enganação contra a Intuição do alvo (curto); vencendo, +2 passos no próximo ataque contra ele até o fim da próxima rodada." },
    mirar: { fase: "geral", nome: "Mirar", texto: "Na próxima rodada, +d6 em ataques à distância contra o alvo." },
    preparar: { fase: "geral", nome: "Preparar", texto: "Declara uma ação e o evento que a dispara; ela acontece antes do evento. Sem o evento, perde a ação." },
    habilidade: { fase: "geral", nome: "Usar habilidade ou item", texto: "Conforme o texto da habilidade ou item." },
    outra: { fase: "geral", nome: "Outra ação", texto: "Movimentar-se, ajudar, interagir…" },
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
  };

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
    FASES: FASES, ORDEM_FASES_PADRAO: ORDEM_FASES_PADRAO, ACOES_COMBATE: ACOES_COMBATE, ACOES_LIVRES: ACOES_LIVRES,
    MINIJOGOS: MINIJOGOS, PARANORMAL: PARANORMAL,
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
  function dadoDoAtributo(b, chave) {
    var e = passosDeEfeitos(b, "passoAtributo", chave);
    return passoDado(b.base.atributos[chave] || 6, e.n, e.d20);
  }
  function dadoDaPericia(b, p) {
    if (!p) return 4;
    var e = passosDeEfeitos(b, "passoPericia", p.chave);
    return passoDado(p.dado, e.n + passosDeItens(b, p.chave), e.d20);
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
    var n = b.recursos.pv.max;
    lista(b.estado && b.estado.lesoes).forEach(function (l) { if (l.ref === "laceracao") n -= 2; });
    return Math.max(1, n);
  }
  function pdMax(b) {
    var n = b.recursos.pd.max;
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
  function respostaDaFechadura(senha, tentativa) {
    return lista(senha).map(function (v, i) { var t = Number(tentativa[i]); return t === v ? "exato" : t < v ? "baixo" : "alto"; });
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
/* <<< js/ordem2/mesa.js */
