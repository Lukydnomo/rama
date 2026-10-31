/* =====================================================================
   R.A.M.A. — Malditos Goblins (3ª edição) no servidor (v6.0)
   =====================================================================
   O módulo de Malditos Goblins: a mesa do mestre (CAMPANHA_GOBLINS, o
   Covil) e as operações que tocam fichas de mais de um goblin ou a
   mesa e uma ficha juntas. O servidor roda o MESMO motor do navegador:
   os arquivos de js/goblins/ estão copiados abaixo, entre marcadores
   (testes/gerar-goblins-gs.js; a suíte confere que as cópias batem).

     ler_goblins      membro: o mestre recebe a mesa inteira; o jogador,
                      a VISTA (sem notas, registro privado, participantes,
                      sorteios e masmorras ocultos). Com a lista dos
                      goblins da campanha e o resumo de cada um
     salvar_goblins   só o mestre (rev + opId)
     goblins_operar   do mestre: momentos (dia novo, fim da batalha, fim
                      do turno), ataque recebido, cura, efeito, Medo,
                      progressão, explosão, regras da campanha nas fichas.
                      De quem joga (precisa poder agir pelo goblin na
                      mesa: dono ou mestre): Grito de Guerra, Humilhação,
                      magia com alvos, ataque contra um inimigo da mesa —
                      ROLADOS AQUI, com o motor, e registrados no
                      histórico de rolagens da campanha

   As ferramentas só respondem numa campanha de Malditos Goblins
   (exigirFerramenta 'covil'); trocar o sistema guarda a mesa.
   ===================================================================== */

function sistemaGoblins() {
  return {
    id: 'goblins',
    rotas: rotasDeGoblins,
    fichaDoSistema: function (ficha) { return !!ficha && !!ficha.goblins && typeof ficha.goblins === 'object'; },
    /* O resumo do painel é calculado AQUI, com o motor. */
    projecao: function (ficha) {
      try { return { goblins: RAMAGoblins.resumoParaMesa(RAMAGoblins.normalizar(ficha.goblins)) }; }
      catch (erro) { return {}; }
    },
    projecaoDoSistema: function (proj) { return !!proj && !!proj.goblins && typeof proj.goblins === 'object'; },
    painel: function (proj, o) {
      var g = proj.goblins;
      if (o.recursosVisiveis) return { goblins: g };
      return { goblins: { ocupacao: g.ocupacao, ocupacaoNome: g.ocupacaoNome, nivel: g.nivel, situacao: g.situacao } };
    },
    estadoDasMecanicas: { covil: goblinsTemCovil },
  };
}

function rotasDeGoblins() {
  return {
    ler_goblins: { publica: false, fn: acaoLerGoblins },
    salvar_goblins: { publica: false, fn: acaoSalvarGoblins },
    goblins_operar: { publica: false, fn: acaoGoblinsOperar },
  };
}

var MAX_OPS_GOBLINS = 80;
var OPERACOES_DO_MESTRE_GOBLINS = ['momentos', 'dano', 'curar', 'efeito', 'medo', 'progressao', 'explodir', 'regras'];
var OPERACOES_DE_GOBLIN = ['gritoDeGuerra', 'humilhacao', 'conjurar', 'atacarInimigo'];

function roladorDeGoblins(faces) {
  var f = Math.max(1, Math.floor(Number(faces) || 1));
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid());
  var n = 0;
  for (var i = 0; i < 4; i++) n = n * 256 + ((bytes[i] + 256) % 256);
  return (n % f) + 1;
}

function goblinsTemCovil(campanhaId) {
  try { return lerLeves(ABAS.CAMPANHA_GOBLINS).some(function (r) { return String(r.campanhaId) === String(campanhaId); }); }
  catch (erro) { return false; }
}

function registroDoCovil(campanhaId) {
  try { return acharPor(ABAS.CAMPANHA_GOBLINS, 'campanhaId', String(campanhaId)); }
  catch (erro) { return null; }
}

function estadoDoCovil(registro) {
  return RAMAGoblinsMesa.normalizar(registro ? lerJson(registro.dadosJson, {}) : {});
}

/* Os goblins da campanha: id, nome, dono e o resumo (projeção). */
function personagensDeGoblins(campanhaId) {
  var regs = daCampanhaLeves(ABAS.PERSONAGENS, campanhaId);
  if (!regs.length) return [];
  var textos = lerCelulas(ABAS.PERSONAGENS, regs, 'resumo');
  return regs.map(function (r) { return { r: r, p: projecaoGuardada(textos[r._linha]) }; })
    .filter(function (x) { return !!x.p && x.p.tipo === 'goblins'; })
    .map(function (x) { return { id: String(x.r.id), nome: String(x.r.nome || '').slice(0, 120), ownerId: String(x.r.ownerId || ''), resumo: x.p.goblins || null }; });
}

function covilParaCliente(ctx, registro) {
  var estado = estadoDoCovil(registro);
  var rev = registro ? Number(registro.rev) || 0 : 0;
  if (ctx.mestre) return { mestre: true, rev: rev, estado: estado };
  return { mestre: false, rev: rev, vista: RAMAGoblinsMesa.vistaDosJogadores(estado) };
}

function acaoLerGoblins(corpo, usuario) {
  var ctx = contextoDaCampanha(corpo.campanhaId, usuario);
  if (!ctx.ok) return ctx;
  var foraDoSistema = exigirFerramenta(ctx, 'covil');
  if (foraDoSistema) return foraDoSistema;
  if (ctx.papel === PAPEL_ESPECTADOR) return { ok: false, erro: 'sem_permissao' };
  var dados = covilParaCliente(ctx, registroDoCovil(ctx.campanha.id));
  dados.personagens = personagensDeGoblins(ctx.campanha.id).map(function (p) {
    return { id: p.id, nome: p.nome, meu: p.ownerId === String(usuario.id), resumo: p.resumo };
  });
  return { ok: true, rev: dados.rev, dados: dados };
}

function gravarCovil(ctx, registro, estado, revAtual, feitas) {
  var json = JSON.stringify(estado);
  var voltas = 0;
  /* O registro e os sorteios mais antigos cedem primeiro quando não cabe. */
  while (json.length > MAX_CELULA && voltas < 20) {
    voltas++;
    estado.registro = estado.registro.slice(Math.ceil(estado.registro.length / 4) || 1);
    estado.sorteios = estado.sorteios.slice(Math.ceil(estado.sorteios.length / 4) || 1);
    json = JSON.stringify(estado);
  }
  if (json.length > MAX_CELULA) return { ok: false, erro: 'dados_grandes' };
  var novo = { campanhaId: String(ctx.campanha.id), atualizadoEm: new Date().toISOString(), rev: revAtual + 1, opsJson: JSON.stringify(feitas.slice(-MAX_OPS_GOBLINS)), dadosJson: json };
  if (registro) atualizarLinha(ABAS.CAMPANHA_GOBLINS, registro._linha, Object.assign({}, registro, novo));
  else inserir(ABAS.CAMPANHA_GOBLINS, novo);
  marcarMesa(ctx.campanha.id, ['goblins']);
  return { ok: true, rev: revAtual + 1 };
}

function instalacaoDoCovil() {
  try { aba(ABAS.CAMPANHA_GOBLINS); return null; }
  catch (erro) { return { ok: false, erro: 'instalacao_incompleta', detalhe: 'CAMPANHA_GOBLINS' }; }
}

function acaoSalvarGoblins(corpo, usuario) {
  var opId = String(corpo.opId || '');
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(opId)) return { ok: false, erro: 'dados_invalidos' };
  if (!corpo.estado || typeof corpo.estado !== 'object' || Array.isArray(corpo.estado)) return { ok: false, erro: 'dados_invalidos' };
  var revPedida = Number(corpo.rev);
  if (!Number.isFinite(revPedida)) return { ok: false, erro: 'dados_invalidos' };
  return comTrava(function () {
    var ctx = exigirMestre(corpo.campanhaId, usuario);
    if (!ctx.ok) return ctx;
    var foraDoSistema = exigirFerramenta(ctx, 'covil');
    if (foraDoSistema) return foraDoSistema;
    var inst = instalacaoDoCovil(); if (inst) return inst;
    var registro = registroDoCovil(ctx.campanha.id);
    var revAtual = registro ? Number(registro.rev) || 0 : 0;
    var feitas = registro ? (lerJson(registro.opsJson, []) || []) : [];
    if (!Array.isArray(feitas)) feitas = [];
    if (feitas.indexOf(opId) >= 0) return { ok: true, repetida: true, rev: revAtual, dados: covilParaCliente(ctx, registro) };
    if (revPedida !== revAtual) return { ok: false, erro: 'conflito', rev: revAtual, dados: covilParaCliente(ctx, registro) };
    var estado = RAMAGoblinsMesa.normalizar(corpo.estado);
    /* Goblins de jogador só os desta campanha. */
    var daMesa = {};
    daCampanhaLeves(ABAS.PERSONAGENS, ctx.campanha.id).forEach(function (r) { daMesa[String(r.id)] = true; });
    estado.combate.participantes = estado.combate.participantes.filter(function (p) { return p.tipo !== 'pc' || daMesa[p.personagemId]; });
    estado = RAMAGoblinsMesa.normalizar(estado);
    feitas.push(opId);
    var g = gravarCovil(ctx, registro, estado, revAtual, feitas);
    if (!g.ok) return g;
    return { ok: true, rev: g.rev, dados: covilParaCliente(ctx, registroDoCovil(ctx.campanha.id)) };
  });
}

/* As fichas de Malditos Goblins que a operação toca, lidas e
   normalizadas — todas desta campanha. */
function fichasDeGoblins(campanhaId, ids) {
  var saida = {};
  for (var i = 0; i < ids.length; i++) {
    if (saida[ids[i]]) continue;
    var reg = acharPor(ABAS.PERSONAGENS, 'id', String(ids[i]));
    if (!reg || String(reg.campanhaId || '') !== String(campanhaId)) return { ok: false, erro: 'nao_encontrado' };
    var lido = lerFichaDoPersonagem(reg);
    if (!lido.ok) return lido;
    var ficha = comVinculoDaColuna(lido.ficha, reg);
    if (String(ficha.tipoFicha || '') !== 'goblins') return { ok: false, erro: 'dados_invalidos', detalhe: 'nao_e_goblins' };
    ficha.goblins = RAMAGoblins.normalizar(ficha.goblins);
    saida[ids[i]] = { registro: reg, ficha: ficha, antes: JSON.stringify(ficha.goblins) };
  }
  return { ok: true, fichas: saida };
}

/* Grava TODAS as fichas tocadas, ou nenhuma a mais depois da primeira
   falha; o opId em cada ficha faz a repetição terminar o que faltou sem
   aplicar de novo. */
function gravarFichasDeGoblins(fichas, opId, campanhaId) {
  var quando = new Date().toISOString();
  var gravadas = 0, ids = Object.keys(fichas);
  for (var i = 0; i < ids.length; i++) {
    var f = fichas[ids[i]];
    if (JSON.stringify(f.ficha.goblins) === f.antes) continue;
    if (f.ficha.goblins.operacoes.indexOf(opId) < 0) f.ficha.goblins.operacoes.push(opId);
    try { f.ficha.resumoGoblins = RAMAGoblins.resumoParaMesa(f.ficha.goblins); } catch (erro) { /* o painel recalcula */ }
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

/* Agir pelo goblin na mesa: dono ou mestre (ter a ficha compartilhada
   não basta, como em registrar_rolagem). */
function podeAgirPorGoblin(ctx, usuario, personagemId) {
  if (ctx.mestre) return { ok: true };
  return personagemAcessivel(personagemId, usuario, { semCompartilhamento: true });
}

/* Rolagem feita AQUI entra no histórico da campanha, como as do
   navegador (registrar_rolagem): o mesmo formato, um id próprio. */
function registrarRolagemDeGoblins(ctx, usuario, personagemId, r, opId, sufixo) {
  if (!r) return;
  try {
    var cartao = RAMAGoblinsDados.paraCartao(r);
    var config = lerJson(ctx.campanha.dadosJson, {});
    var visibilidade = (ctx.mestre && config.rolagensMestreOcultas) ? VIS_ROLAGEM_OCULTA : VIS_ROLAGEM_PUBLICA;
    var dados = { expressao: cartao.expressao, rolagens: cartao.rolagens, natural: null, total: cartao.total, selecao: null, parcelas: cartao.parcelas, critico: false, marcas: cartao.marcas, servidor: true };
    inserir(ABAS.CAMPANHA_ROLAGENS, {
      id: ('gs-' + opId + '-' + (sufixo || 'r')).slice(0, 80), campanhaId: ctx.campanha.id, autorUserId: usuario.id,
      personagemId: String(personagemId || ''), tipo: 'goblins', nome: String(r.rotulo || 'Rolagem').slice(0, 100) + ' · ' + String(r.classificacao.rotulo || '').slice(0, 60),
      visibilidade: visibilidade, criadoEm: new Date().toISOString(), dadosJson: JSON.stringify(dados),
    });
    marcarMesa(ctx.campanha.id, ['rolagens']);
  } catch (erro) { /* o histórico é bônus: a operação já valeu */ }
}

function texto80(v) { return String(v === undefined || v === null ? '' : v).slice(0, 80); }

function acaoGoblinsOperar(corpo, usuario) {
  var opId = String(corpo.opId || '');
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(opId)) return { ok: false, erro: 'dados_invalidos' };
  var op = corpo.operacao && typeof corpo.operacao === 'object' && !Array.isArray(corpo.operacao) ? corpo.operacao : null;
  if (!op) return { ok: false, erro: 'dados_invalidos' };
  var tipo = String(op.tipo || '');
  if (OPERACOES_DO_MESTRE_GOBLINS.indexOf(tipo) < 0 && OPERACOES_DE_GOBLIN.indexOf(tipo) < 0) return { ok: false, erro: 'dados_invalidos' };

  return comTrava(function () {
    var ctx = contextoDaCampanha(corpo.campanhaId, usuario);
    if (!ctx.ok) return ctx;
    var foraDoSistema = exigirFerramenta(ctx, 'covil');
    if (foraDoSistema) return foraDoSistema;
    if (ctx.papel === PAPEL_ESPECTADOR) return { ok: false, erro: 'sem_permissao' };
    if (OPERACOES_DO_MESTRE_GOBLINS.indexOf(tipo) >= 0 && !ctx.mestre) return { ok: false, erro: 'sem_permissao' };

    var todos = personagensDeGoblins(ctx.campanha.id);
    var daMesa = {};
    todos.forEach(function (p) { daMesa[p.id] = p; });
    var ids = [];
    var quem = String(op.quem || '');
    if (OPERACOES_DE_GOBLIN.indexOf(tipo) >= 0) {
      if (!daMesa[quem]) return { ok: false, erro: 'nao_encontrado' };
      var acesso = podeAgirPorGoblin(ctx, usuario, quem);
      if (!acesso.ok) return { ok: false, erro: 'sem_permissao' };
      ids.push(quem);
    }
    /* Aliados tocados só pelo efeito da regra — goblins desta mesa. */
    var aliados = (Array.isArray(op.aliados) ? op.aliados : []).map(String).filter(function (id) { return daMesa[id] && id !== quem; }).slice(0, 12);
    if (tipo === 'gritoDeGuerra') aliados = todos.map(function (p) { return p.id; }).filter(function (id) { return id !== quem; });
    if (tipo === 'humilhacao') { aliados = aliados.slice(0, 1); if (!aliados.length) return { ok: false, erro: 'dados_invalidos', motivo: 'Escolha o aliado.' }; }
    if (['momentos', 'regras'].indexOf(tipo) >= 0) ids = todos.map(function (p) { return p.id; });
    if (['dano', 'curar', 'progressao', 'explodir'].indexOf(tipo) >= 0) { var alvo = String(op.personagem || ''); if (!daMesa[alvo]) return { ok: false, erro: 'nao_encontrado' }; ids = [alvo]; }
    if (['efeito', 'medo'].indexOf(tipo) >= 0) ids = (Array.isArray(op.personagens) ? op.personagens : []).map(String).filter(function (id) { return daMesa[id]; }).slice(0, 20);
    ids = ids.concat(aliados);
    if (!ids.length) return { ok: false, erro: 'dados_invalidos' };

    var carregadas = fichasDeGoblins(ctx.campanha.id, ids);
    if (!carregadas.ok) return carregadas;
    var blocos = {};
    Object.keys(carregadas.fichas).forEach(function (id) { blocos[id] = carregadas.fichas[id].ficha.goblins; });
    var registroMesa = null, estadoMesa = null, revMesa = 0, feitasMesa = [];
    var tocaMesa = tipo === 'atacarInimigo' || (tipo === 'conjurar' && Array.isArray(op.inimigos) && op.inimigos.length);
    if (tocaMesa) {
      var inst = instalacaoDoCovil(); if (inst) return inst;
      registroMesa = registroDoCovil(ctx.campanha.id);
      estadoMesa = estadoDoCovil(registroMesa);
      revMesa = registroMesa ? Number(registroMesa.rev) || 0 : 0;
      feitasMesa = registroMesa ? (lerJson(registroMesa.opsJson, []) || []) : [];
      if (!Array.isArray(feitasMesa)) feitasMesa = [];
    }
    /* Repetição: a operação já está numa ficha que ela toca (ou na mesa). */
    if (Object.keys(blocos).some(function (id) { return blocos[id].operacoes.indexOf(opId) >= 0; }) || feitasMesa.indexOf(opId) >= 0) {
      return { ok: true, repetida: true, dados: { eventos: [] } };
    }

    var eventos = [];
    var resultado = {};
    function em(id, fn) {
      var o = blocos[id];
      if (!o) return null;
      var r = RAMAGoblins.aplicarOperacao(o, opId, fn);
      if (r && r.eventos) eventos = eventos.concat(r.eventos.map(function (e) { return Object.assign({ personagem: id }, e); }));
      return r;
    }
    function recusa(r) { return { ok: false, erro: 'dados_invalidos', motivo: r && r.motivo ? r.motivo : '' }; }

    if (tipo === 'momentos') {
      var lista = Array.isArray(op.momentos) ? op.momentos.slice(0, 6) : [];
      Object.keys(blocos).forEach(function (id) {
        em(id, function (o) {
          var evs = [];
          lista.forEach(function (m) {
            var r = null;
            if (m.tipo === 'novoDia') r = RAMAGoblins.novoDia(o, { descansou: m.descansou !== false }, roladorDeGoblins);
            if (m.tipo === 'iniciarBatalha' && !o.tempo.batalha) r = RAMAGoblins.iniciarBatalha(o);
            if (m.tipo === 'fimDaBatalha') r = RAMAGoblins.fimDaBatalha(o);
            if (m.tipo === 'fimDoTurno' && String(m.personagemId || '') === id) r = RAMAGoblins.fimDoTurno(o);
            if (r && r.eventos) evs = evs.concat(r.eventos);
          });
          return { ok: true, eventos: evs };
        });
      });
    }
    if (tipo === 'regras') {
      var rg = RAMAGoblinsMesa.normalizar({ regras: op.regras }).regras;
      Object.keys(blocos).forEach(function (id) {
        em(id, function (o) {
          ['vozGoblin', 'deuRuim', 'niveisEpicos', 'explosoesManuais'].forEach(function (k) { o.opcoes[k] = rg[k]; });
          Object.keys(rg.adaptacoes).forEach(function (k) { o.opcoes.adaptacoes[k] = rg.adaptacoes[k]; });
          RAMAGoblins.registrar(o, 'regras', 'Regras da campanha aplicadas pelo mestre');
          return { ok: true, eventos: [] };
        });
      });
    }
    if (tipo === 'dano') {
      var pedido = {
        acertos: Math.max(0, Math.min(200, Math.floor(Number(op.acertos) || 0))), distancia: op.distancia === true, fogo: op.fogo === true, armaDeFogo: op.armaDeFogo === true,
        etereo: op.etereo === true, automatico: op.automatico === true, fonte: texto80(op.fonte),
        esquiva: op.esquiva === undefined || op.esquiva === null ? undefined : Math.max(0, Math.floor(Number(op.esquiva) || 0)),
        protecaoId: op.protecaoId ? texto80(op.protecaoId) : '', sorteId: op.sorteId ? texto80(op.sorteId) : '',
        paraParceiro: Math.max(0, Math.floor(Number(op.paraParceiro) || 0)),
      };
      var rd = em(ids[0], function (o) { return RAMAGoblins.receberAtaque(o, pedido); });
      if (rd && rd.ok === false) return recusa(rd);
      resultado.recebidos = rd ? rd.recebidos : 0;
    }
    if (tipo === 'curar') {
      var rc = em(ids[0], function (o) { return RAMAGoblins.curar(o, op.valor === 'todos' ? 'todos' : Math.max(0, Math.min(99, Math.floor(Number(op.valor) || 0))), texto80(op.fonte) || 'Mestre'); });
      if (rc && rc.ok === false) return recusa(rc);
    }
    if (tipo === 'efeito') {
      var def = op.efeito && typeof op.efeito === 'object' ? op.efeito : null;
      if (!def) return { ok: false, erro: 'dados_invalidos' };
      Object.keys(blocos).forEach(function (id) { em(id, function (o) { return RAMAGoblins.receberEfeito(o, def); }); });
    }
    if (tipo === 'medo') {
      var valorMedo = Math.max(1, Math.min(50, Math.floor(Number(op.valor) || 1)));
      Object.keys(blocos).forEach(function (id) { em(id, function (o) { return RAMAGoblins.receberMedo(o, valorMedo, texto80(op.fonte)); }); });
    }
    if (tipo === 'progressao') {
      var rp = em(ids[0], function (o) { return RAMAGoblins.derrotouOponente(o, { oponente: texto80(op.oponente) }, roladorDeGoblins); });
      if (rp && rp.ok === false) return recusa(rp);
      resultado.dados = rp ? rp.dados : [];
      resultado.subiu = rp ? !!rp.subiu : false;
    }
    if (tipo === 'explodir') {
      em(ids[0], function (o) { var evs = []; RAMAGoblins.registrar(o, 'mesa', 'Explodiu na mesa: ' + texto80(op.causa)); if (RAMAGoblins.ativo(o)) { o.estado.situacao = 'explodiu'; o.estado.causa = texto80(op.causa) || 'Explodiu'; evs.push({ tipo: 'fim', situacao: 'explodiu' }); } return { ok: true, eventos: evs }; });
    }
    if (tipo === 'gritoDeGuerra') {
      var efeitoGrito = null, rolGrito = null;
      var rg1 = em(quem, function (o) { var r = RAMAGoblins.usarTecnica(o, 'gritoDeGuerra', { seZero: 'falha' }, roladorDeGoblins); if (r.ok) { efeitoGrito = r.paraAliados; rolGrito = r.rolagem; } return r; });
      if (rg1 && rg1.ok === false) return recusa(rg1);
      if (efeitoGrito) aliados.forEach(function (id) { em(id, function (o) { return RAMAGoblins.receberEfeito(o, efeitoGrito); }); });
      registrarRolagemDeGoblins(ctx, usuario, quem, rolGrito, opId, 'grito');
      resultado.rolagem = rolGrito ? RAMAGoblinsDados.paraHistorico(rolGrito) : null;
      resultado.sucesso = !!efeitoGrito;
    }
    if (tipo === 'humilhacao') {
      var rh = em(quem, function (o) { return RAMAGoblins.usarTecnica(o, 'humilhacao', { alvo: daMesa[aliados[0]].nome }, roladorDeGoblins); });
      if (rh && rh.ok === false) return recusa(rh);
      em(aliados[0], function (o) { return RAMAGoblins.curar(o, 'todos', 'Humilhação de ' + daMesa[quem].nome); });
    }
    if (tipo === 'conjurar') {
      var pedidoMagia = { magia: String(op.magia || ''), fonte: op.fonte ? texto80(op.fonte) : '', condutorId: op.condutorId ? texto80(op.condutorId) : '', ciranda: Math.max(0, Math.min(12, Math.floor(Number(op.ciranda) || 0))), dificuldade: ['facil', 'dificil'].indexOf(op.dificuldade) >= 0 ? op.dificuldade : '', implacavel: op.implacavel === undefined || op.implacavel === null || op.implacavel === '' ? undefined : Math.max(0, Math.min(3, Math.floor(Number(op.implacavel) || 0))), seZero: 'falha' };
      var magia = null;
      var rm = em(quem, function (o) { var r = RAMAGoblins.conjurar(o, pedidoMagia, roladorDeGoblins); if (r.ok) magia = r; return r; });
      if (rm && rm.ok === false) return recusa(rm);
      if (magia && magia.efeito && magia.efeito.alvos) {
        var al = magia.efeito.alvos;
        var limite = al.quem === 'umAliado' || al.quem === 'umInimigo' || al.quem === 'umVisivel' ? 1 : al.maximo || 30;
        aliados.slice(0, limite).forEach(function (id) {
          em(id, function (o) {
            if (al.curar) return RAMAGoblins.curar(o, al.curar, 'Magia ' + magia.nome + ' de ' + daMesa[quem].nome);
            if (al.ferimentos) return RAMAGoblins.sofrer(o, { ferimentos: al.ferimentos, fogo: !!al.fogo, fonte: 'Magia ' + magia.nome });
            if (al.efeito) return RAMAGoblins.receberEfeito(o, Object.assign({ fonte: magia.nome }, al.efeito));
            return { ok: true, eventos: [] };
          });
        });
        if (estadoMesa) {
          (Array.isArray(op.inimigos) ? op.inimigos : []).map(String).slice(0, limite).forEach(function (pid) {
            var p = RAMAGoblinsMesa.participante(estadoMesa, pid);
            if (!p || p.tipo === 'pc') return;
            if (al.ferimentos) { var rf = RAMAGoblinsMesa.ferir(estadoMesa, pid, al.ferimentos, { fogo: !!al.fogo }); eventos = eventos.concat(rf.eventos || []); }
            if (al.curar) RAMAGoblinsMesa.curarParticipante(estadoMesa, pid, al.curar);
            if (al.efeito) RAMAGoblinsMesa.efeitoEmParticipante(estadoMesa, pid, al.efeito);
          });
        }
      }
      if (magia) {
        registrarRolagemDeGoblins(ctx, usuario, quem, magia.rolagem, opId, 'magia');
        resultado.resultado = magia.resultado;
        resultado.efeito = magia.efeito;
        resultado.rolagem = magia.rolagem ? RAMAGoblinsDados.paraHistorico(magia.rolagem) : null;
      }
    }
    if (tipo === 'atacarInimigo') {
      var alvoP = RAMAGoblinsMesa.participante(estadoMesa, String(op.alvo || ''));
      if (!alvoP || alvoP.tipo === 'pc' || alvoP.derrotado) return { ok: false, erro: 'dados_invalidos', motivo: 'Alvo fora do combate.' };
      var defAlvo = RAMAGoblinsCatalogo.INIMIGOS[alvoP.chave] || {};
      var pa = op.pedido && typeof op.pedido === 'object' ? op.pedido : {};
      var pedidoAtaque = {
        armaId: pa.armaId ? texto80(pa.armaId) : '', modo: ['corporal', 'distancia', 'arremesso'].indexOf(pa.modo) >= 0 ? pa.modo : '',
        dificuldade: ['facil', 'dificil'].indexOf(pa.dificuldade) >= 0 ? pa.dificuldade : '',
        furtivo: pa.furtivo === true, brutal: pa.brutal === true, tiroCerteiro: pa.tiroCerteiro === true, duasArmas: pa.duasArmas === true, cacunda: pa.cacunda === true, giratorio: pa.giratorio === true,
        alvo: { nome: alvoP.nome, especie: defAlvo.especie || '', goblin: !!defAlvo.goblin, humano: defAlvo.humano === true ? true : (defAlvo.especie ? false : undefined) },
        seZero: 'falha',
      };
      var ataque = null;
      var ra = em(quem, function (o) { var r = RAMAGoblins.atacar(o, pedidoAtaque, roladorDeGoblins); if (r.ok) ataque = r; return r; });
      if (ra && ra.ok === false) return recusa(ra);
      if (ataque) {
        var rfer = RAMAGoblinsMesa.ferir(estadoMesa, alvoP.id, ataque.ferimentos, { fogo: !!ataque.fogo, bloquear: op.alvoBloqueia === true });
        eventos = eventos.concat(rfer.eventos || []);
        registrarRolagemDeGoblins(ctx, usuario, quem, ataque.rolagem, opId, 'ataque');
        resultado.ferimentos = ataque.ferimentos;
        resultado.giratorio = ataque.giratorio;
        resultado.derrotado = (rfer.eventos || []).some(function (e) { return e.tipo === 'derrotado'; });
        resultado.rolagem = RAMAGoblinsDados.paraHistorico(ataque.rolagem);
      }
    }

    if (estadoMesa) {
      feitasMesa.push(opId);
      var gm = gravarCovil(ctx, registroMesa, RAMAGoblinsMesa.normalizar(estadoMesa), revMesa, feitasMesa);
      if (!gm.ok) return gm;
    }
    var g = gravarFichasDeGoblins(carregadas.fichas, opId, ctx.campanha.id);
    if (!g.ok) return g;
    return { ok: true, dados: { eventos: eventos, gravadas: g.gravadas, resultado: resultado } };
  });
}

/* =====================================================================
   O MOTOR (cópia fiel de js/goblins/; não edite aqui)
   ===================================================================== */

/* >>> js/goblins/catalogo.js */
/* =====================================================================
   R.A.M.A. — Malditos Goblins (3ª edição) · o catálogo
   =====================================================================
   Tudo o que o livro tabela, com a PÁGINA impressa (no PDF digital a
   página do arquivo é a mesma). Nenhuma regra mora aqui: só dados, que
   o motor (regras.js), o dado (dados.js) e a mesa (mesa.js) leem.

   Os textos são resumos para consulta ao lado da ação, não o livro.

   Valores especiais dos inimigos (p. 21–23): `null` é o "-" do livro
   (o atributo NÃO EXISTE: Golem não tem Noção), diferente de 0 (o Zumbi
   Goblin tem Habilidade 0); "?" (Besta Indescritível) é `indescritivel`
   e não ganha número nenhum. O número entre parênteses é guardado À
   PARTE: em Combate são os dados da arma (`bonusCombate`), em
   Vitalidade é a durabilidade das proteções (`protecao`) — nunca
   Vitalidade extra.

   Adaptações (p. 32–41): cada uma marca o que traz com `adaptacao`.
   ===================================================================== */

(function (global) {
  "use strict";

  var LIVRO = "Malditos Goblins 3ª ed.";
  function referencia(pagina) { return pagina ? LIVRO + ", p. " + pagina : LIVRO; }

  var ATRIBUTOS = [
    { chave: "combate", nome: "Combate", curto: "Com", texto: "Dados para atacar (e se esquivar).", pagina: 5 },
    { chave: "habilidade", nome: "Habilidade", curto: "Hab", texto: "Dados para ações físicas fora de combate.", pagina: 5 },
    { chave: "nocao", nome: "Noção", curto: "Noç", texto: "Dados para saber de algo e para conjurar.", pagina: 5 },
    { chave: "vitalidade", nome: "Vitalidade", curto: "Vit", texto: "Quantos ferimentos aguenta: morre com MAIS ferimentos que a Vitalidade.", pagina: 5 },
  ];
  var CHAVES_ATRIBUTO = ATRIBUTOS.map(function (a) { return a.chave; });

  /* ---- 1ª etapa: nome (p. 4). Dois dados: o 1º é a COLUNA, o 2º a
     LINHA. A linha 6 tem só duas casas largas; o R.A.M.A. lê colunas
     1–3 como a primeira e 4–6 como a segunda (ver INCONSISTENCIAS). */
  var NOMES = [
    ["Plaft", "Glub", "Crash", "Spray", "Bing", { especial: "comida", texto: "[Última coisa que comeu]" }],
    ["Plin", "Tim", "Zzzz", "Cringe", "Riso", { especial: "comida", texto: "[Última coisa que comeu]" }],
    ["Tik", "Ranço", "Sussa", "Sopa", "Slash", { especial: "comida", texto: "[Última coisa que comeu]" }],
    ["Tok", "Yhaa", "Bibi", "Ovo", "Coff", { especial: "inverter", texto: "[Inverta seu nome]" }],
    ["Bash", "Vrum", "Boom", "Ban", "Ugh", { especial: "inverter", texto: "[Inverta seu nome]" }],
    ["Cricri", "Aiaiai", "Bum", "Nhack", "Sniff", { especial: "inverter", texto: "[Inverta seu nome]" }],
  ];

  /* ---- 2ª etapa: ocupação e descritor (p. 4–5, técnicas p. 7–9) ---- */
  var OCUPACOES = {
    mercenario: {
      nome: "Mercenário", pagina: 7, mod: { combate: 1 },
      equipamento: [
        { rotulo: "Espada e Escudo", itens: ["espada", "escudo"] },
        { rotulo: "2 Machadinhas", itens: ["machadinha", "machadinha"] },
        { rotulo: "Machadão", itens: ["machadao"] },
      ],
      escolhas: ["armaFavorita"],
      tecnicas: [
        { nivel: 1, chave: "mestreDeArmas", nome: "Mestre de Armas", texto: "+1 dado em todos os ataques com a sua arma favorita." },
        { nivel: 2, chave: "ataqueGiratorio", nome: "Ataque Giratório", texto: "Ao causar dano com arma corporal, pode fazer mais um ataque contra outro inimigo ao alcance." },
        { nivel: 3, chave: "ataqueBrutal", nome: "Ataque Brutal", uso: "dia", texto: "1 vez por dia: um ataque corporal com o dobro de dados." },
      ],
    },
    cacador: {
      nome: "Caçador", pagina: 7, mod: { combate: 1 },
      equipamento: [
        { rotulo: "3 Adagas", itens: ["adaga", "adaga", "adaga"] },
        { rotulo: "Arco de Caça", itens: ["arcoEFlecha"], nota: "O livro diz “Arco de Caça”; a tabela de armas só tem Arco e Flecha (ver inconsistências)." },
        { rotulo: "Pistola e Chapéu", itens: ["pistola", "chapeu"] },
      ],
      escolhas: ["especieInimiga"],
      tecnicas: [
        { nivel: 1, chave: "inimigo", nome: "Inimigo", texto: "Escolha uma espécie de criatura no começo: +1 dado em todos os ataques contra ela." },
        { nivel: 2, chave: "rastrear", nome: "Rastrear", texto: "Sabe seguir pegadas e identificar a criatura que as deixou." },
        { nivel: 3, chave: "tiroCerteiro", nome: "Tiro Certeiro", uso: "dia", texto: "1 vez por dia: um ataque à distância com o dobro de dados." },
      ],
    },
    gatuno: {
      nome: "Gatuno", pagina: 8, mod: { habilidade: 1 },
      equipamento: [
        { rotulo: "3 Adagas", itens: ["adaga", "adaga", "adaga"] },
        { rotulo: "Rapieira e Broquel", itens: ["rapieira", "broquel"] },
        { rotulo: "Pistola e Chapéu", itens: ["pistola", "chapeu"] },
      ],
      escolhas: [],
      tecnicas: [
        { nivel: 1, chave: "roubar", nome: "Roubar", texto: "Com 1 hit num teste de Habilidade, rouba um objeto do bolso de alguém sem que perceba." },
        { nivel: 2, chave: "ataqueFurtivo", nome: "Ataque Furtivo", texto: "+2 dados no ataque contra um alvo que não sabe onde você está." },
        { nivel: 3, chave: "esconder", nome: "Esconder", uso: "dia", texto: "1 vez por dia: esconde-se sem teste, até se mexer ou fazer barulho." },
      ],
    },
    lider: {
      nome: "Líder", pagina: 9, mod: { vitalidade: 1 },
      equipamento: [
        { rotulo: "Espada e Medalhas de Guerra", itens: ["espada", "medalhasDeGuerra"], nota: "Medalhas de Guerra não estão em nenhuma tabela: entram como item sem regra." },
        { rotulo: "Lança e Elmo", itens: ["lanca", "elmo"] },
        { rotulo: "Espadona", itens: ["espadona"] },
      ],
      escolhas: [],
      tecnicas: [
        { nivel: 1, chave: "gritoDeGuerra", nome: "Grito de Guerra", uso: "dia", texto: "1 vez por dia: teste de Noção; com 1 hit, todos os seus aliados ficam com Combate +1 até o fim da batalha." },
        { nivel: 2, chave: "humilhacao", nome: "Humilhação", uso: "dia", texto: "1 vez por dia: grita e xinga um aliado, que elimina todos os ferimentos." },
        { nivel: 3, chave: "ataqueBrutal", nome: "Ataque Brutal", uso: "dia", texto: "1 vez por dia: um ataque corporal com o dobro de dados." },
      ],
    },
    incendiario: {
      nome: "Incendiário", pagina: 8, mod: { vitalidade: 1 },
      equipamento: [
        { rotulo: "Barril de Pólvora", itens: ["barrilDePolvora"] },
        { rotulo: "Pistola e Galinha Explosiva", itens: ["pistola", "galinhaExplosiva"] },
        { rotulo: "Bacamarte e Chapéu", itens: ["bacamarte", "chapeu"] },
      ],
      escolhas: [],
      tecnicas: [
        { nivel: 1, chave: "resistencia", nome: "Resistência", texto: "Recebe 1 ferimento a menos de ataques de fogo ou de tiro de arma de fogo." },
        { nivel: 2, chave: "delirio", nome: "Delírio", texto: "Pode se livrar de todos os ferimentos se explodir ou queimar completamente uma casa ou algo maior." },
        { nivel: 3, chave: "imunidade", nome: "Imunidade", texto: "Imune a fogo." },
      ],
    },
    bruxo: {
      nome: "Bruxo", pagina: 9, mod: { nocao: 1 },
      equipamento: [
        { rotulo: "Cajado", itens: ["cajado"] },
        { rotulo: "Varinha e Cachecol", itens: ["varinha", "cachecol"] },
        { rotulo: "Vassoura e Chapéu", itens: ["vassoura", "chapeu"] },
      ],
      escolhas: ["magias"],
      tecnicas: [
        { nivel: 1, chave: "magias", nome: "Magias", texto: "Escolha 3 magias da lista; para conjurar, teste de Noção e consulte a magia (p. 10)." },
        { nivel: 2, chave: "condutorMagico", nome: "Condutor Mágico", texto: "+1 dado ao conjurar por uma varinha, cajado ou outro Condutor Mágico." },
        { nivel: 3, chave: "implacavel", nome: "Implacável", uso: "dia", texto: "1 vez por dia: conjura sem rolar, escolhendo o resultado." },
      ],
    },
    /* Adaptações que trazem ocupação própria. */
    treinador: {
      nome: "Treinador", pagina: 34, adaptacao: "pokepragas", mod: { habilidade: 1 },
      equipamento: [{ rotulo: "6 PokéPedras", itens: [], pokepedras: 6 }],
      escolhas: [],
      tecnicas: [
        { nivel: 1, chave: "pokepragaInicial", nome: "PokéPraga Inicial", texto: "Começa com uma PokéPraga incomum (rolada na tabela)." },
        { nivel: 2, chave: "mestreDaEvolucao", nome: "Mestre da Evolução", texto: "Rola dois dados ao verificar a evolução." },
        { nivel: 3, chave: "mestreTreinador", nome: "Mestre Treinador", texto: "O melhor dos melhores. Pode rir dos outros agora." },
      ],
    },
    fazendeiro: {
      nome: "Fazendeiro", pagina: 40, adaptacao: "vale", modEscolha: ["habilidade", "nocao"],
      equipamento: [
        { rotulo: "Bacamarte, Chapéu e Enxada", itens: ["bacamarte", "chapeu", "enxada"] },
        { rotulo: "Picareta, Machado, Enxada e Vara de Pesca", itens: ["picareta", "machado", "enxada", "varaDePesca"] },
      ],
      escolhas: [],
      tecnicas: [
        { nivel: 1, chave: "heranca", nome: "Herança", texto: "Herdou uma fazenda com 1 galinha e 1 vaca." },
        { nivel: 2, chave: "dedoVerde", nome: "Dedo Verde", texto: "Ao colher uma horta, recebe o dobro de alimentos." },
        { nivel: 3, chave: "matadorDePragas", nome: "Matador de Pragas", texto: "+1 dado em combate contra criaturas que são pestes nas fazendas." },
      ],
    },
  };
  var OCUPACAO_D6 = ["mercenario", "cacador", "gatuno", "lider", "incendiario", "bruxo"];

  var DESCRITORES = {
    covarde: { nome: "Covarde", mod: { combate: -1 } },
    atrapalhado: { nome: "Atrapalhado", mod: { habilidade: -1 } },
    tapado: { nome: "Tapado", mod: { nocao: -1 } },
    fracote: { nome: "Fracote", mod: { vitalidade: -1 } },
    mediocre: { nome: "Medíocre", mod: {} },
    supimpa: { nome: "Supimpa", mod: {}, escolha: true, texto: "Escolha um atributo para ganhar +1." },
  };
  var DESCRITOR_D6 = ["covarde", "atrapalhado", "tapado", "fracote", "mediocre", "supimpa"];

  /* ---- 3ª etapa: característica (p. 4 e 6). Dois dados: 1º COLUNA,
     2º LINHA. "rolarDuasVezes": rola duas outras. */
  var CARACTERISTICAS = {
    amaldicoado: { nome: "Amaldiçoado", texto: "Acha que é um humano amaldiçoado. É só um goblin perdido." },
    amarelo: { nome: "Amarelo", texto: "Pele amarela." },
    apendiceExtra: { nome: "Apêndice extra", texto: "Dois apêndices: o dobro de chance de apendicite." },
    aracnideo: { nome: "Aracnídeo", texto: "Escala superfícies lisas e pode defecar cordas de seda." },
    azul: { nome: "Azul", texto: "Pele azul." },
    bombaRelogio: { nome: "Bomba-relógio", texto: "Quando alguém fala de fogo ou explosão, role 1 dado: com 1, você explode.", acao: "bombaRelogio" },
    bracoExtra: { nome: "Braço extra", texto: "Um braço extra no meio das costas." },
    cabecaExtra: { nome: "Cabeça extra", texto: "Duas cabeças (que não pensam melhor que uma)." },
    cabecao: { nome: "Cabeção", texto: "Cérebro gigante: sabe coisas obscuras, mas não pode usar elmos ou bonés.", semElmo: true, semBone: true },
    chifre: { nome: "Chifre", texto: "Um chifre de unicórnio na testa." },
    cicatrizes: { nome: "Cicatrizes", texto: "Cicatrizes por todo o corpo." },
    cinzento: { nome: "Cinzento", texto: "Pele cinza e enrugada (barba branca opcional)." },
    colorido: { nome: "Colorido", texto: "Pele de vários tons, que trocam de lugar toda manhã." },
    felino: { nome: "Felino", texto: "Acha que é um gato." },
    flutulencia: { nome: "Flutulência", texto: "Vive peidando; pode usar isso para saltar até 6 m ou correr com o dobro da velocidade." },
    fosforescente: { nome: "Fosforescente", texto: "Verde fosforescente: brilha no escuro." },
    galinaceo: { nome: "Galináceo", texto: "Acha que é uma galinha." },
    linguao: { nome: "Linguão", texto: "Língua gigante, fora da boca, babando: não fala direito." },
    listras: { nome: "Listras", texto: "Listras azuis por todo o corpo." },
    maoGigante: { nome: "Mão gigante", texto: "Uma das mãos tem o dobro do tamanho." },
    minicabeca: { nome: "Minicabeça", texto: "Cabeça minúscula: não pode usar elmos.", semElmo: true },
    minion: { nome: "Minion", texto: "Camiseta amarela, odeia vermelho, acredita em qualquer mentira." },
    narizExtra: { nome: "Nariz extra", texto: "Um nariz extra no cotovelo." },
    olhoGigante: { nome: "Olho gigante", texto: "Um olho gigante que raramente pisca." },
    olhosExtras: { nome: "Olhos extras", texto: "1d6 olhos a mais na cabeça.", quantidade: "1d6", unidade: "olho(s) a mais" },
    orelhaExtra: { nome: "Orelha extra", texto: "Uma orelha extra embaixo do sovaco." },
    peixoso: { nome: "Peixoso", texto: "Acha que é um peixe e precisa estar sempre molhado." },
    pesGigantes: { nome: "Pés gigantes", texto: "Não pode usar nenhum tipo de calçado.", semCalcado: true },
    pintas: { nome: "Pintas", texto: "Pintas cor-de-rosa, algumas em forma de coração." },
    pompom: { nome: "Pompom", texto: "Rabinho com pompom." },
    porosFedidos: { nome: "Poros fedidos", texto: "Odor insuportável: ninguém fica perto por muito tempo." },
    tomBelico: { nome: "Tom bélico", texto: "Quem conversa com você se ofende sem razão." },
    verdura: { nome: "Verdura", texto: "Acha que é uma planta e insiste na fotossíntese." },
    vermelho: { nome: "Vermelho", texto: "Pele vermelha." },
  };
  Object.keys(CARACTERISTICAS).forEach(function (k) { CARACTERISTICAS[k].pagina = 6; });
  /* [coluna 1..6][linha 1..6] */
  var CARACTERISTICA_2D6 = [
    ["bombaRelogio", "cinzento", "amaldicoado", "tomBelico", "flutulencia", "rolarDuasVezes"],
    ["minicabeca", "cabecao", "linguao", "olhoGigante", "pesGigantes", "maoGigante"],
    ["apendiceExtra", "orelhaExtra", "narizExtra", "olhosExtras", "bracoExtra", "cabecaExtra"],
    ["porosFedidos", "pintas", "listras", "pompom", "chifre", "cicatrizes"],
    ["verdura", "minion", "galinaceo", "peixoso", "felino", "aracnideo"],
    ["rolarDuasVezes", "fosforescente", "colorido", "amarelo", "azul", "vermelho"],
  ];

  /* ---- magias (p. 10–11; Invocação, p. 33) ----
     Cada resultado traz o que o motor APLICA sozinho (`proprio`: em
     quem conjurou) e o que pede ALVO (`alvos`) — e nada além do que o
     livro diz. `narrativo`: só descrição. */
  var MAGIAS = {
    fogo: { nome: "Fogo", pagina: 10, resultados: [
      { texto: "Uma explosão queima seu rosto: você recebe 1 ferimento.", proprio: { ferimentos: 1, fogo: true } },
      { texto: "Uma bolinha de fogo que ilumina o caminho. Não dá para arremessar.", narrativo: true },
      { texto: "Uma grande bola de fogo: ilumina ou, arremessada, causa automaticamente 3 ferimentos a um alvo visível.", alvos: { quem: "umVisivel", ferimentos: 3, fogo: true, automatico: true, opcional: true } },
      { texto: "Uma rajada de fogo engole todas as criaturas à sua frente, incluindo aliados: 4 ferimentos de fogo em cada uma.", alvos: { quem: "todosAFrente", ferimentos: 4, fogo: true, automatico: true } },
    ] },
    gelo: { nome: "Gelo", pagina: 10, resultados: [
      { texto: "Um dos seus braços congela e não pode ser usado até o fim do dia.", proprio: { efeito: { chave: "bracoCongelado", nome: "Braço congelado", ate: "fimDoDia", texto: "Um braço não pode ser usado (Gelo, 0 hits)." } } },
      { texto: "Um raio de frio: um inimigo recebe 1 ferimento.", alvos: { quem: "umInimigo", ferimentos: 1 } },
      { texto: "Um raio de frio: um inimigo recebe 1 ferimento e não age no próximo turno dele.", alvos: { quem: "umInimigo", ferimentos: 1, efeito: { chave: "semAgir", nome: "Congelado: não age", ate: "turnos", turnos: 1 } } },
      { texto: "Todas as criaturas visíveis, incluindo aliados, ficam congeladas por alguns minutos (conscientes sob o gelo).", alvos: { quem: "todosVisiveis", efeito: { chave: "congelado", nome: "Congelado (alguns minutos)", ate: "manual" } } },
    ] },
    relampago: { nome: "Relâmpago", pagina: 11, resultados: [
      { texto: "Um relâmpago cai em você: 1 ferimento.", proprio: { ferimentos: 1 } },
      { texto: "Um relâmpago cai num inimigo à sua escolha: 1 ferimento.", alvos: { quem: "umInimigo", ferimentos: 1 } },
      { texto: "Relâmpagos em até 4 inimigos à sua escolha: 1 ferimento em cada.", alvos: { quem: "ate4Inimigos", ferimentos: 1, maximo: 4 } },
      { texto: "Uma tempestade se forma: relâmpagos caem aleatoriamente até o fim da batalha.", mesa: { chave: "tempestade", nome: "Tempestade de relâmpagos", ate: "fimDaBatalha", texto: "O livro não diz quantos raios nem quanto dano: a mesa sorteia o alvo e decide." } },
    ] },
    troca: { nome: "Troca", pagina: 11, resultados: [
      { texto: "Sua roupa é trocada pela de outro personagem aleatório.", sorteiaPersonagem: true, narrativo: true },
      { texto: "Some e aparece num local à sua escolha; roupas e pertences ficam para trás.", narrativo: true },
      { texto: "Some e aparece num local à sua escolha, com roupas e pertences.", narrativo: true },
      { texto: "Some e aparece num local aleatório desconhecido.", narrativo: true },
    ] },
    cura: { nome: "Cura", pagina: 11, resultados: [
      { texto: "Fica pálido e tonto: perde 1 de Vitalidade até o fim do dia.", proprio: { efeito: { chave: "curaFalhou", nome: "Pálido e tonto", ate: "fimDoDia", mods: { vitalidade: -1 } } } },
      { texto: "Um aliado ao seu toque remove 1 ferimento.", alvos: { quem: "umAliado", curar: 1 } },
      { texto: "Um aliado ao seu toque remove todos os ferimentos.", alvos: { quem: "umAliado", curar: "todos" } },
      { texto: "Todas as criaturas visíveis, incluindo inimigos, removem todos os ferimentos.", proprio: { curar: "todos" }, alvos: { quem: "todosVisiveis", curar: "todos" } },
    ] },
    morte: { nome: "Morte", pagina: 11, resultados: [
      { texto: "Sua pele cai e você vira um esqueleto ambulante: perde PERMANENTEMENTE 1 de Habilidade e 1 de Vitalidade.", proprio: { permanente: { habilidade: -1, vitalidade: -1 }, marca: "esqueleto" } },
      { texto: "Anima um esqueleto inteiro, que luta por você por 2 turnos.", mesa: { aliado: "esqueletoHumano", turnos: 2 } },
      { texto: "Anima um esqueleto inteiro, que luta por você até o fim da batalha.", mesa: { aliado: "esqueletoHumano", ate: "fimDaBatalha" } },
      { texto: "Todos os esqueletos a até 10 m ganham vida e dançam por 1 hora.", narrativo: true },
    ] },
    planta: { nome: "Planta", pagina: 11, resultados: [
      { texto: "Nascem folhas e flores por todo o seu corpo.", narrativo: true },
      { texto: "Cria plantas ou arbustos com o toque na terra.", narrativo: true },
      { texto: "Cria plantas em qualquer lugar visível; pode prender os pés de inimigos.", alvos: { quem: "umInimigo", opcional: true, efeito: { chave: "presoPorPlantas", nome: "Pés presos por plantas", ate: "manual", texto: "O livro não dá número: a mesa decide quando solta." } } },
      { texto: "Surge um matagal à sua volta (raio de 5 m).", narrativo: true },
    ] },
    invocacao: { nome: "Invocação", pagina: 33, adaptacao: "cthulin", resultados: [
      { texto: "Uma visão da realidade eterna: receba 1 Medo.", proprio: { medo: 1 } },
      { texto: "Invoca um Horror, mas ele não obedece.", mesa: { horror: "desobediente" } },
      { texto: "Invoca um Horror que cumpre UM comando seu.", mesa: { horror: "umComando" } },
      { texto: "Invoca um Horror que obedece até o fim dos tempos.", mesa: { horror: "obediente" } },
    ] },
  };
  var MAGIAS_DO_BRUXO = ["fogo", "gelo", "relampago", "troca", "cura", "morte", "planta"];

  /* ---- armas (p. 12; WarGoblin p. 36) ----
     maos 1|2; ataque "corporal"|"distancia"; bonus em dados;
     arremesso, condutor, recarga, municao (null = ilimitada), fogo (arma
     de fogo, para a Resistência do Incendiário). */
  var ARMAS = {
    adaga: { nome: "Adaga", maos: 1, ataque: "corporal", bonus: 1, arremesso: true },
    arcoEFlecha: { nome: "Arco e Flecha", maos: 2, ataque: "distancia", bonus: 2, municao: 10, arco: true },
    bacamarte: { nome: "Bacamarte", maos: 2, ataque: "distancia", bonus: 3, recarga: true, municao: 2, fogo: true },
    besta: { nome: "Besta", maos: 2, ataque: "distancia", bonus: 3, recarga: true, municao: 6, arco: true },
    cajado: { nome: "Cajado", maos: 2, ataque: "corporal", bonus: 1, condutor: true },
    clava: { nome: "Clava", maos: 1, ataque: "corporal", bonus: 1 },
    espada: { nome: "Espada", maos: 1, ataque: "corporal", bonus: 2 },
    espadaDeMadeira: { nome: "Espada de Madeira", maos: 1, ataque: "corporal", bonus: 0 },
    espadona: { nome: "Espadona", maos: 2, ataque: "corporal", bonus: 3 },
    estilingue: { nome: "Estilingue", maos: 2, ataque: "distancia", bonus: 0, recarga: true },
    faca: { nome: "Faca", maos: 1, ataque: "corporal", bonus: 1 },
    forcado: { nome: "Forcado", maos: 2, ataque: "corporal", bonus: 2 },
    gadanha: { nome: "Gadanha", maos: 2, ataque: "corporal", bonus: 3 },
    lanca: { nome: "Lança", maos: 2, ataque: "corporal", bonus: 3 },
    machadao: { nome: "Machadão", maos: 2, ataque: "corporal", bonus: 3 },
    machadinha: { nome: "Machadinha", maos: 1, ataque: "corporal", bonus: 2, arremesso: true },
    martelao: { nome: "Martelão", maos: 2, ataque: "corporal", bonus: 3 },
    pistola: { nome: "Pistola", maos: 1, ataque: "distancia", bonus: 2, recarga: true, municao: 5, fogo: true },
    rapieira: { nome: "Rapieira", maos: 1, ataque: "corporal", bonus: 2 },
    varinha: { nome: "Varinha", maos: 1, ataque: "corporal", bonus: 0, varinha: true },
    vassoura: { nome: "Vassoura", maos: 2, ataque: "corporal", bonus: 1, condutor: true },
    pistolaBolter: { nome: "Pistola Bólter", maos: 1, ataque: "distancia", bonus: 2, municao: 12, fogo: true, adaptacao: "wargoblin", pagina: 36 },
    metrancaDePlasma: { nome: "Metranca de Plasma", maos: 2, ataque: "distancia", bonus: 3, municao: 8, adaptacao: "wargoblin", pagina: 36 },
    lancaChamas: { nome: "Lança-chamas", maos: 2, ataque: "distancia", bonus: 4, alcance: "3 metros", ataqueDeFogo: true, adaptacao: "wargoblin", pagina: 36 },
    espadaSerra: { nome: "Espada Serra", maos: 1, ataque: "corporal", bonus: 4, adaptacao: "wargoblin", pagina: 36 },
    maozonaDoPoder: { nome: "Mãozona do Poder", maos: 1, ataque: "corporal", bonus: 3, condutor: true, adaptacao: "wargoblin", pagina: 36 },
  };
  Object.keys(ARMAS).forEach(function (k) { if (!ARMAS[k].pagina) ARMAS[k].pagina = 12; if (ARMAS[k].municao === undefined) ARMAS[k].municao = null; });

  var ESPECIAIS_DE_ARMA = {
    arremesso: { nome: "Arremesso", texto: "Pode ser arremessado como arma de distância.", pagina: 12 },
    condutor: { nome: "Condutor Mágico", texto: "Pode conjurar magias através deste item.", pagina: 12 },
    municao: { nome: "Munição [X]", texto: "Limite de X ataques; depois, precisa de mais munição.", pagina: 12 },
    recarga: { nome: "Recarga", texto: "Depois de atacar, gasta um turno recarregando para atacar de novo.", pagina: 12 },
  };

  /* ---- proteções (p. 13; WarGoblin p. 37; itens mágicos p. 25–27) ----
     uso: umaMao | pescoco | cabeca | tronco | corpo | pes | ombros.
     `elmo`: conta como elmo (Cabeção e Minicabeça não usam).
     `calcado`: Pés gigantes não usa. */
  var PROTECOES = {
    broquel: { nome: "Broquel", uso: "umaMao", durabilidade: 1 },
    cachecol: { nome: "Cachecol", uso: "pescoco", durabilidade: 0, arcano: true },
    chapeu: { nome: "Chapéu", uso: "cabeca", durabilidade: 0, sorte: true },
    cotaDeMalha: { nome: "Cota de Malha", uso: "tronco", durabilidade: 2 },
    elmo: { nome: "Elmo", uso: "cabeca", durabilidade: 2, elmo: true },
    escudo: { nome: "Escudo", uso: "umaMao", durabilidade: 2 },
    panela: { nome: "Panela", uso: "cabeca", durabilidade: 1 },
    peitoral: { nome: "Peitoral", uso: "tronco", durabilidade: 3 },
    penico: { nome: "Penico", uso: "cabeca", durabilidade: 1, sorte: true },
    tampaDePanela: { nome: "Tampa de Panela", uso: "umaMao", durabilidade: 1 },
    armaduraEspacial: { nome: "Armadura Espacial", uso: "corpo", durabilidade: 8, adaptacao: "wargoblin", pagina: 37 },
    capaceteDeOvo: { nome: "Capacete de Ovo", uso: "cabeca", durabilidade: 2, elmo: true, mods: { combate: -1 }, texto: "Não vê nada; Combate −1 para tudo.", adaptacao: "wargoblin", pagina: 37 },
  };
  Object.keys(PROTECOES).forEach(function (k) { if (!PROTECOES[k].pagina) PROTECOES[k].pagina = 13; });
  var ESPECIAIS_DE_PROTECAO = {
    arcano: { nome: "Arcano", texto: "Quem estiver vestindo rola 1 dado a mais nos testes para conjurar.", pagina: 13 },
    sorte: { nome: "Sorte", texto: "Na cabeça: destrua o item ao receber um ataque à distância para ignorar todo o dano.", pagina: 13 },
  };
  var USOS_DE_PROTECAO = { umaMao: "Uma mão", pescoco: "Pescoço", cabeca: "Cabeça", tronco: "Tronco", corpo: "Corpo", pes: "Pés", ombros: "Ombros" };

  /* ---- equipamento (p. 13) e o que as adaptações trazem ---- */
  var EQUIPAMENTOS = {
    aljava: { nome: "Aljava", texto: "Flechas para duplicar a munição de um arco ou besta.", acao: "aljava" },
    banquete: { nome: "Banquete", texto: "Alimenta um bando de goblins por 1d6 dias.", quantidade: "1d6", unidade: "dia(s) de comida" },
    barrilDeCerveja: { nome: "Barril de Cerveja", texto: "Embebeda uma festa de goblins inteira." },
    barrilDePolvora: { nome: "Barril de Pólvora", texto: "Aceso, explode: 4 ferimentos em todos em volta e 2 em todos a até 5 m. Ou completa a munição de até 3 armas de fogo.", acao: "barrilDePolvora", consumivel: true },
    cordaEGancho: { nome: "Corda e Gancho", texto: "+2 dados no teste de Habilidade para escalar.", acao: "escalar" },
    guardaChuva: { nome: "Guarda-chuva", texto: "Cobre até 4 goblins; −1 ferimento numa queda.", acao: "queda" },
    galinhaExplosiva: { nome: "Galinha Explosiva", texto: "Arremesse ou deixe andando: explode em dois turnos, 3 ferimentos em todos em volta.", acao: "galinhaExplosiva", consumivel: true },
    livroEstranho: { nome: "Livro Estranho", texto: "2 hits num teste de Noção para ler. 1 chance em 6 de ser um livro de magia (sorteie uma magia).", acao: "livroEstranho" },
    roupaChique: { nome: "Roupa Chique", texto: "Um goblin nojento continua nojento, mas com autoestima." },
    tenda: { nome: "Tenda", texto: "Para 5 goblins (10 empilhados)." },
    veneno: { nome: "Veneno", texto: "Na bebida de alguém: 1 ferimento por minuto em quem beber.", acao: "veneno", consumivel: true },
    medalhasDeGuerra: { nome: "Medalhas de Guerra", texto: "Equipamento inicial do Líder (p. 9), sem regra em nenhuma tabela.", semTabela: true, pagina: 9 },
    pokepedra: { nome: "PokéPedra", texto: "Arremessada, captura uma PokéPraga (teste de Habilidade).", adaptacao: "pokepragas", pagina: 34 },
    livroEspecial: { nome: "Livro Especial", texto: "Contém uma magia (qualquer do Bruxo ou Invocação). Queimá-lo elimina todo o Medo.", adaptacao: "cthulin", pagina: 33, acao: "livroEspecial" },
    enxada: { nome: "Enxada", texto: "Para arar e plantar uma vez ao dia.", adaptacao: "vale", pagina: 41, semTabela: true },
    picareta: { nome: "Picareta", texto: "Para tirar pedra das minas.", adaptacao: "vale", pagina: 40, semTabela: true },
    machado: { nome: "Machado", texto: "Para tirar madeira dos bosques.", adaptacao: "vale", pagina: 40, semTabela: true },
    varaDePesca: { nome: "Vara de Pesca", texto: "Para pescar em lagos e rios.", adaptacao: "vale", pagina: 41, semTabela: true },
  };
  Object.keys(EQUIPAMENTOS).forEach(function (k) { if (!EQUIPAMENTOS[k].pagina) EQUIPAMENTOS[k].pagina = 13; });

  /* ---- itens mágicos (p. 24–27) ----
     `base`: a arma ou proteção que o item é (com o bônus da tabela).
     `mods`: atributo enquanto equipado. `acao`: o que o motor faz. */
  var ITENS_MAGICOS = {
    espadaDestruidora: { nome: "Espada Destruidora de Mundos", tipo: "artefato", pagina: 26, base: "espada", texto: "Uma espada comum, mas se alguém falar “FIM” (ou espirrar), um vórtex absorve tudo e todos.", acao: "fim" },
    marteloDoPoder: { nome: "Martelo do Poder", tipo: "artefato", pagina: 26, base: "martelao", texto: "Um martelão brilhante: causa 1 ferimento automaticamente em alvos que não sejam humanos.", automaticoNaoHumano: 1 },
    coroaDoRei: { nome: "Coroa do Rei Feiticeiro", tipo: "artefato", pagina: 25, vestivel: "cabeca", mods: { nocao: 1 }, texto: "Vestida: +1 de Noção." },
    estatuetaSerpente: { nome: "Estatueta do Deus Serpente", tipo: "artefato", pagina: 26, texto: "Apontada para uma criatura, uma serpente imensa a devora e some.", acao: "estatueta" },
    ombreirasAnao: { nome: "Ombreiras do Lorde Anão", tipo: "artefato", pagina: 27, protecao: { uso: "ombros", durabilidade: 2, durabilidadePar: 5 }, texto: "Cada ombreira tem durabilidade 2; o par, durabilidade 5." },
    necronomicon: { nome: "Necronomicon", tipo: "artefato", pagina: 27, magia: "morte", texto: "Qualquer goblin pode conjurar Morte. Quem morrer com ele em mãos pode voltar como morto-vivo.", acao: "necronomicon" },
    pocao: { nome: "Poção", tipo: "especial", pagina: 27, texto: "Uma cor (1d6). Bebida, o efeito é o da cor.", acao: "pocao", consumivel: true },
    braceleteMagico: { nome: "Bracelete Mágico", tipo: "especial", pagina: 25, vestivel: "pulso", mods: { habilidade: 1 }, texto: "Vestido: Habilidade +1 (temporariamente)." },
    tochaMagica: { nome: "Tocha Mágica", tipo: "especial", pagina: 27, texto: "Acende com água; o fogo só apaga com a palavra “Xaluf”." },
    espadaBrilhante: { nome: "Espada Brilhante", tipo: "especial", pagina: 26, base: "espada", texto: "A lâmina só brilha quando há goblins por perto." },
    adagaMatadora: { nome: "Adaga Matadora", tipo: "especial", pagina: 25, base: "adaga", contraGoblin: 2, texto: "+2 dados se o alvo for um goblin." },
    anelMagico: { nome: "Anel Mágico", tipo: "especial", pagina: 25, vestivel: "dedo", texto: "Ao colocar, role na tabela do anel.", acao: "anel" },
    latinhas: { nome: "Latinhas sem Fio", tipo: "estranho", pagina: 26, texto: "O que se fala numa sai na outra, a qualquer distância." },
    piranha: { nome: "Piranha Empalhada", tipo: "estranho", pagina: 27, texto: "Quem gritar “Ah! Uma piranha!” é mordido e ela fica presa até ganhar vida de novo." },
    escudoFalante: { nome: "Escudo Falante", tipo: "estranho", pagina: 25, base: "escudo", texto: "Um escudo que, cumprimentado, fala sem parar." },
    cordaSerpente: { nome: "Corda-Serpente", tipo: "estranho", pagina: 25, texto: "“Sobe”: ergue-se até o teto. “Prende”: a ponta se prende onde der." },
    cintoPraCima: { nome: "Cinto que Cai pra Cima", tipo: "estranho", pagina: 25, vestivel: "cintura", texto: "Quem usar tem a gravidade invertida." },
    relogioTicPloc: { nome: "Relógio Tic-Ploc", tipo: "estranho", pagina: 27, texto: "Quem o deixar cair some da existência; o nome fica escrito atrás do relógio.", acao: "relogio" },
    tortaDeliciosa: { nome: "Torta Deliciosa", tipo: "porcaria", pagina: 27, texto: "Ilusória: quem tentar comer faz um teste de Noção para perceber.", acao: "torta" },
    macaCheirosa: { nome: "Maçã Cheirosa", tipo: "porcaria", pagina: 26, texto: "Comida, remove todos os ferimentos.", acao: "macaCheirosa", consumivel: true },
    elmoCadeira: { nome: "Elmo-Cadeira", tipo: "porcaria", pagina: 25, protecao: { uso: "cabeca", durabilidade: 1, elmo: true }, texto: "+1 de Proteção; pode se esquivar com outro goblin na cabeça; ejeta quem estiver sentado num salto de até 10 m." },
    dentesPosticos: { nome: "Dentes Postiços", tipo: "porcaria", pagina: 25, texto: "Parece bonito para outros goblins. Só goblins." },
    sandaliaVayanna: { nome: "Sandália da Vayanna", tipo: "porcaria", pagina: 27, protecao: { uso: "pes", durabilidade: 2, calcado: true }, texto: "Durabilidade 2." },
    peteca: { nome: "Peteca", tipo: "porcaria", pagina: 27, texto: "Brincando com amigos, role 1 dado no fim do dia: com 6, todos que brincaram têm Habilidade +1 no dia seguinte.", acao: "peteca" },
    /* Descritos na lista (p. 25–26), fora das tabelas de sorteio. */
    carteiraFalsa: { nome: "Carteira de Vacinação Falsa", tipo: "foraDaTabela", pagina: 25, texto: "O teu chefe agora pode entrar no reino do norte." },
    espadaJusticeira: { nome: "Espada da Justiçeira", tipo: "foraDaTabela", pagina: 26, base: "espada", texto: "Funciona como binóculo; quem a erguer e gritar “Hooooo” é morto por um raio.", acao: "justiceira" },
    joiasAuditas: { nome: "Joias Auditas", tipo: "foraDaTabela", pagina: 26, texto: "Para subornos e negociações. Basta não declarar." },
    macaMalcheirosa: { nome: "Maçã Malcheirosa", tipo: "foraDaTabela", pagina: 26, texto: "Arremessada, explode: 1 ferimento em todos em volta.", acao: "macaMalcheirosa", consumivel: true },
  };
  var TIPO_MAGICO_D6 = ["artefato", "especial", "especial", "estranho", "estranho", "porcaria"];
  var NOMES_TIPO_MAGICO = { artefato: "Artefato", especial: "Especial", estranho: "Estranho", porcaria: "Porcaria", foraDaTabela: "Fora das tabelas" };
  var MAGICOS_D6 = {
    artefato: ["espadaDestruidora", "marteloDoPoder", "coroaDoRei", "estatuetaSerpente", "ombreirasAnao", "necronomicon"],
    especial: ["pocao", "braceleteMagico", "tochaMagica", "espadaBrilhante", "adagaMatadora", "anelMagico"],
    estranho: ["latinhas", "piranha", "escudoFalante", "cordaSerpente", "cintoPraCima", "relogioTicPloc"],
    porcaria: ["tortaDeliciosa", "macaCheirosa", "elmoCadeira", "dentesPosticos", "sandaliaVayanna", "peteca"],
  };
  var ANEL_D6 = [
    { texto: "O dedo fica roxo: se não tirar o anel em 2 horas, o dedo cai.", efeito: { chave: "dedoRoxo", nome: "Dedo roxo (tire o anel em 2 horas)", ate: "manual" } },
    { texto: "Você vira uma galinha.", efeito: { chave: "galinha", nome: "Virou galinha", ate: "manual" } },
    { texto: "A pele fica em chamas (pode queimar coisas) e você fica imune a fogo.", efeito: { chave: "peleEmChamas", nome: "Pele em chamas: imune a fogo", ate: "manual", imuneFogo: true } },
    { texto: "Você fala com os animais.", efeito: { chave: "falaComAnimais", nome: "Fala com os animais", ate: "manual" } },
    { texto: "Fica invisível, mas sempre que tirar fica obcecado pelo anel.", efeito: { chave: "invisivel", nome: "Invisível (obcecado ao tirar)", ate: "manual" } },
    { texto: "Mais bronzeado e mais forte: Combate +1 temporariamente.", efeito: { chave: "bronzeado", nome: "Bronzeado: Combate +1", ate: "manual", mods: { combate: 1 } } },
  ];
  var POCAO_D6 = [
    { cor: "Amarelo", texto: "Explode!", explode: true },
    { cor: "Laranja", texto: "Penas surgem no seu corpo.", efeito: { chave: "penas", nome: "Penas pelo corpo", ate: "manual" } },
    { cor: "Vermelho", texto: "Sua língua fica colorida.", efeito: { chave: "linguaColorida", nome: "Língua colorida", ate: "manual" } },
    { cor: "Roxo", texto: "+1 dado no próximo teste.", efeito: { chave: "pocaoRoxa", nome: "+1 dado no próximo teste", ate: "proximoTeste", dados: 1 } },
    { cor: "Azul", texto: "Remove todos os ferimentos.", curar: "todos" },
    { cor: "Verde", texto: "Aumenta um atributo em +1.", atributo: 1 },
  ];

  /* ---- regras de consulta (fonte e página ao lado da ação) ---- */
  var REGRAS = {
    teste: { nome: "Testes", pagina: 14, tipo: "basica", texto: "Role dados iguais ao atributo; cada 4, 5 ou 6 é 1 hit. 0 hits: Falhou! · 1: Conseguiu, mas deu ruim… · 2: Conseguiu! · 3+: Conseguiu e foi épico!" },
    dificuldade: { nome: "Dificuldade", pagina: 14, tipo: "basica", texto: "Teste fácil: +1 dado. Teste difícil: −1 dado." },
    explosaoDeDado: { nome: "Explosão de Dado", pagina: 14, tipo: "basica", texto: "Cada 6 é 1 hit e deixa rolar mais um dado, que também explode no 6 — infinitamente." },
    explosaoDeGoblin: { nome: "Explosão de Goblin", pagina: 14, tipo: "basica", texto: "Se todos os dados caírem em 1, o goblin explode em milhões de pedacinhos. Faça um novo goblin." },
    combate: { nome: "Combate", pagina: 15, tipo: "basica", texto: "Em turnos, uma ação por turno. Goblins que surpreendem inimigos distraídos agem primeiro (escolhem a ordem entre si); se esbarram nos inimigos, os inimigos agem primeiro." },
    ataque: { nome: "Atacar", pagina: 15, tipo: "basica", texto: "Teste de Combate: cada hit é 1 ferimento no alvo. Armas somam dados. Explosões valem." },
    esquiva: { nome: "Esquivar", pagina: 15, tipo: "basica", texto: "Ao ser atacado: teste de Combate; cada hit reduz um hit do atacante. Quem se esquiva não ataca no próximo turno." },
    bloqueio: { nome: "Bloquear", pagina: 15, tipo: "basica", texto: "Com uma proteção vestida: cada ferimento tomado reduz 1 de Durabilidade dela. Com Durabilidade zero, não bloqueia." },
    niveis: { nome: "Níveis", pagina: 5, tipo: "basica", texto: "Começa no nível 1. Ao derrotar um oponente, role 1 dado: com 6, ganha um nível e uma técnica. No nível 4, explode de alegria." },
    ferimentos: { nome: "Ferimentos e Morte", pagina: 5, tipo: "basica", texto: "Morre com MAIS ferimentos que a Vitalidade. Cada noite de descanso remove 1 ferimento. Morreu? Um parente chega em minutos: novo goblin de nível 1." },
    magia: { nome: "Regras de Magia", pagina: 10, tipo: "basica", texto: "Só o Bruxo conjura (3 magias). Teste de Noção e consulte a tabela da magia: 0 hits é ruim, 2 é o esperado, 3+ pode exagerar." },
    equipamento: { nome: "Equipamento", pagina: 12, tipo: "basica", texto: "Armas somam dados ao ataque; Munição limita ataques; Recarga gasta um turno depois de atacar. Proteções têm Durabilidade." },
    vozGoblin: { nome: "Voz Goblin", pagina: 16, tipo: "opcional", texto: "Quem imita a voz de goblin o tempo todo nunca explode quando os dados caem 1. Falou uma palavra sem a voz, perde a vantagem até o fim do jogo." },
    deuRuim: { nome: "Mas deu ruim…", pagina: 16, tipo: "opcional", texto: "1 hit num teste de Habilidade e sem ideia? Role 1 dado na tabela." },
    niveisEpicos: { nome: "Níveis Épicos", pagina: 16, tipo: "opcional", texto: "No nível 4, se os outros jogadores acreditarem, escolha outra ocupação e ganhe níveis nela." },
    semMestre: { nome: "Jogando sem Mestre", pagina: 16, tipo: "opcional", texto: "Use as tabelas do livro: aventura aleatória, inspiração e a resposta do mestre (sim ou não)." },
    manobras: { nome: "Manobras", pagina: 17, tipo: "basica", texto: "Catapultando Goblins, Pendurar no Inimigo, Ataque com Duas Armas, Cacunda!, Combate Sincronizado, Derrubar Inimigo, Ciranda Mágica e Tralha do Poder." },
    negociacao: { nome: "Negociação", pagina: 18, tipo: "basica", texto: "Se o viajante tem mais Combate que o goblin mais forte, ataca primeiro. Senão: negociador e vítima testam Noção; bando com mais hits leva tudo, empate continua, vítima com mais hits leva tudo dos goblins." },
    itensMagicos: { nome: "Itens Mágicos", pagina: 24, tipo: "basica", texto: "Role o tipo (Artefato, Especial, Estranho, Porcaria) e depois o item." },
    masmorra: { nome: "Gerador de Masmorra", pagina: 28, tipo: "basica", texto: "Tipo (1d6); cada segmento: 1d6 + segmentos entre ele e a entrada; conteúdo de corredores e salas." },
    cthulin: { nome: "Chamado de Cthulin", pagina: 32, tipo: "adaptacao", texto: "Ocupações renomeadas, Chapéu ou Livro Especial, Investigação, Eventos Sobrenaturais, Medo e Horrores." },
    pokepragas: { nome: "PokéPragas", pagina: 34, tipo: "adaptacao", texto: "Treinador, PokéPedras, PokéPragas por raridade e elemento, captura, PokéBatalhas e evolução." },
    wargoblin: { nome: "WarGoblin 40k", pagina: 36, tipo: "adaptacao", texto: "Turminhas (as ocupações), dois equipamentos à escolha, armas e proteções do futuro, alienígenas." },
    goblinHigh: { nome: "Goblin High", pagina: 38, tipo: "adaptacao", texto: "Estudantes com Reação, conversar, agradar, Amigos, Romance, Inimigos e Brigas." },
    vale: { nome: "Vale dos Goblins", pagina: 40, tipo: "adaptacao", texto: "Fazendeiro, fazenda, coleta, horta, pescaria, construções, cozinha e vilarejo." },
  };

  var DEU_RUIM_D6 = ["Algo pegou fogo!", "Estragou algo importante.", "Da próxima vez, vai ser pior.", "Ficou preso em algo.", "Outro goblin vai sofrer por isso.", "Chamou atenção de alguém."];

  var MANOBRAS = {
    catapulta: { nome: "Catapultando Goblins", pagina: 17, texto: "Quem pula testa Habilidade para acertar o alvo; falhou, espatifa-se: 1d6 ferimentos." },
    pendurar: { nome: "Pendurar no Inimigo", pagina: 17, texto: "Teste de Habilidade: com 1 hit fica em cima da vítima e, nos próximos turnos, +1 dado nos ataques contra ela. A vítima não ataca o pendurado, mas pode tirá-lo vencendo um teste de Habilidade." },
    duasArmas: { nome: "Ataque com Duas Armas", pagina: 17, texto: "Uma arma em cada mão: cada ataque contra um alvo diferente, com 1 dado a menos em ambos." },
    cacunda: { nome: "Cacunda!", pagina: 17, texto: "Dois goblins como um só: atacam o mesmo alvo, não se esquivam; o de cima rola +1 dado; o ferimento sofrido pode ser dividido." },
    sincronizado: { nome: "Combate Sincronizado", pagina: 17, texto: "Três ou mais goblins atacando o mesmo alvo no mesmo turno: o alvo rola 1 dado a menos no próximo ataque." },
    derrubar: { nome: "Derrubar Inimigo", pagina: 17, texto: "Quem empurra testa Habilidade: 1 hit, o alvo testa Habilidade para ficar de pé; 2+ hits, cai e perde o próximo turno." },
    ciranda: { nome: "Ciranda Mágica", pagina: 17, texto: "Pelo menos 2 amigos girando e cantando: cada amigo na roda dá +1 dado à conjuração." },
    tralha: { nome: "Tralha do Poder", pagina: 17, texto: "Um objeto que pelo menos dez goblins acham bonito: ganha um goblin seguidor, que vai embora se a tralha se perder ou se ele a roubar." },
  };

  /* ---- jogando sem mestre (p. 16) e aventuras (p. 18–20) ---- */
  var AVENTURA_D6 = ["saquearViajante", "saquearViajante", "sequestrar", "saquearCasa", "protegerMasmorra", "invadirVizinhos"];
  var AVENTURAS = {
    saquearViajante: { nome: "Saquear Viajantes", pagina: 18 },
    sequestrar: { nome: "Sequestrar Pessoa Importante", pagina: 18 },
    saquearCasa: { nome: "Saquear Casa Humana", pagina: 19 },
    protegerMasmorra: { nome: "Proteger Masmorra", pagina: 19 },
    invadirVizinhos: { nome: "Invadir Vizinhos", pagina: 19 },
  };
  var INSPIRACAO_D6 = [["Explosões", "Medo", "Destruir"], ["Madeira", "Risada", "Construir"], ["Vento", "Dança", "Aparecer"], ["Terra", "Força", "Atacar"], ["Água", "Tranquilidade", "Mudar"], ["Fogo", "Amor", "Resistir"]];
  var RESPOSTA_D6 = ["“Teu goblin explode! Faz outro aí.”", "“Definitivamente não!”", "“Não.”", "“O que tu acha?”", "“Sim.”", "“Definitivamente sim!”"];

  /* Entradas com grupo: [{ quantidade (número ou expressão), inimigo }]. */
  function g() { var a = []; for (var i = 0; i < arguments.length; i += 2) a.push({ quantidade: arguments[i], inimigo: arguments[i + 1] }); return a; }
  var VIAJANTE_2D6 = {
    2: { texto: "Um Dragão", grupo: g(1, "dragao") },
    3: { texto: "Um grupo de aventureiros", grupo: g("1d6", "aventureiro"), nota: "O livro não diz quantos: o R.A.M.A. sugere 1d6, editável." },
    4: { texto: "Uma carruagem nobre", grupo: g(1, "nobre") },
    5: { texto: "Um Ogro", grupo: g(1, "ogro") },
    6: { texto: "Um mercador", grupo: g(1, "campones"), nota: "O livro não traz ficha de mercador: usa a do Camponês, editável." },
    7: { texto: "Uma carroça velha", grupo: [] },
    8: { texto: "Dois Guardas", grupo: g(2, "guarda") },
    9: { texto: "Um Camponês qualquer", grupo: g(1, "campones") },
    10: { texto: "Um bando de 1d6 goblins", grupo: g("1d6", "goblinComum") },
    11: { texto: "O Bando Rival", bandoRival: true },
    12: { texto: "Um goblin aleatório explode!", goblinExplode: true },
  };
  var VITIMA_D6 = ["Uma princesa", "Um aventureiro", "Um camponês", "Uma criança", "Um barril de cerveja", "Uma galinha"];
  var RECOMPENSA_D6 = ["Um penico muito bonito", "Um baú cheio de moedas brilhantes", "Um título de nobreza", "A mão da princesa (mas pode ser o pé)", "Um covil melhor localizado", { texto: "Um item mágico", itemMagico: true }];
  var LOCAL_D6 = ["celeiro", "casaComum", "casaNobre", "taverna", "castelo", "torreDoMago"];
  var PROTEGER_2D6 = {
    2: { texto: "Um Dragão", grupo: g(1, "dragao") },
    3: { texto: "O Grande Mago e 1d6 Aventureiros", grupo: g(1, "grandeMago", "1d6", "aventureiro") },
    4: { texto: "O Grande Mago e 2 Guardas", grupo: g(1, "grandeMago", 2, "guarda") },
    5: { texto: "1d6 Aventureiros", grupo: g("1d6", "aventureiro") },
    6: { texto: "2d6 Guardas", grupo: g("2d6", "guarda") },
    7: { texto: "1d6 Guardas e 1d6 Cães", grupo: g("1d6", "guarda", "1d6", "cao") },
    8: { texto: "1d6 Camponeses furiosos", grupo: g("1d6", "campones") },
    9: { texto: "O Bando Rival", bandoRival: true },
    10: { texto: "Bando de 1d6 goblins", grupo: g("1d6", "goblinComum") },
    11: { texto: "1d6 Goblins e 1 Troll", grupo: g("1d6", "goblinComum", 1, "troll") },
    12: { texto: "Algo tão assustador que é indescritível", grupo: g(1, "besta") },
  };
  var VIZINHOS_2D6 = {
    2: { texto: "Um Dragão e 2d6 Goblins", grupo: g(1, "dragao", "2d6", "goblinComum") },
    3: { texto: "1 Golem de Pedra e 1d6 Esqueletos", grupo: g(1, "golemPedra", "1d6", "esqueletoHumano") },
    4: { texto: "1d6 Aranhas Gigantes", grupo: g("1d6", "aranhaGigante") },
    5: { texto: "1 Vampiro e 2d6 Zumbis", grupo: g(1, "vampiro", "2d6", "zumbiHumano") },
    6: { texto: "Bando de 2d6 goblins", grupo: g("2d6", "goblinComum") },
    7: { texto: "O Bando Rival", bandoRival: true },
    8: { texto: "1d6 Goblins Abominação", grupo: g("1d6", "goblinAbominacao") },
    9: { texto: "1d6 Goblins e 1 Troll", grupo: g("1d6", "goblinComum", 1, "troll") },
    10: { texto: "1d6 Ogros e 1d6 Goblins", grupo: g("1d6", "ogro", "1d6", "goblinComum") },
    11: { texto: "Cubo Gosmento", grupo: g(1, "cuboGosmento") },
    12: { texto: "Algo tão assustador que é indescritível", grupo: g(1, "besta") },
  };

  /* Locais (p. 20). `conteudo`: o que se sorteia ao entrar; `chance`:
     "1 em 6" (sai no 6 de 1d6) ou 50%. Os testes viram notas. */
  var LOCAIS = {
    celeiro: { nome: "Celeiro", pagina: 20, texto: "Pilhas de palha, galinhas (uma é galo, os goblins não sabem) e animais grandes.", conteudo: [{ rotulo: "Galinhas", expressao: "1d6+1", inimigo: "galinha" }, { rotulo: "Animais grandes (cavalo ou vaca)", expressao: "1d6", inimigo: "vaca" }, { rotulo: "Um humano no momento", chance: "50%", inimigo: "campones" }] },
    casaComum: { nome: "Casa Comum", pagina: 20, texto: "Só depois de entrar se sabe quantos estão lá; metade (arredondada para cima) são crianças; talvez um penico bonito.", conteudo: [{ rotulo: "Pessoas (camponeses)", expressao: "1d6-2", inimigo: "campones", metadeCriancas: true }, { rotulo: "Um deles é um guarda", chance: "1em6", inimigo: "guarda", substitui: true }] },
    casaNobre: { nome: "Casa Nobre", pagina: 20, texto: "Difícil acesso (escalar paredes). Um criado grita chamando os guardas; no mínimo 2 de vigia. Muitas coisas brilhantes.", conteudo: [{ rotulo: "Cães ferozes", expressao: "1d6-3", inimigo: "cao" }, { rotulo: "Criado", quantidade: 1, inimigo: "campones" }, { rotulo: "Guardas (mínimo 2 de vigia)", expressao: "1d6+1", inimigo: "guarda" }, { rotulo: "O nobre está", chance: "1em6", inimigo: "nobre" }, { rotulo: "O filho ou filha do nobre está", chance: "1em6", inimigo: "nobre" }, { rotulo: "Itens mágicos", expressao: "1d6", itemMagico: true, nota: "“possivelmente”: a mesa confirma" }] },
    templo: { nome: "Templo ou Santuário", pagina: 20, foraDaTabela: true, texto: "Não é lugar para goblins. Pouca coisa lá dentro.", conteudo: [{ rotulo: "Camponeses", expressao: "1d6", inimigo: "campones" }, { rotulo: "Sacerdotes (1 ou 2)", expressao: "1d2", inimigo: "campones", nota: "Sem ficha de sacerdote no livro: Camponês, editável." }, { rotulo: "Item mágico perto do altar", chance: "1em6", itemMagico: true }] },
    taverna: { nome: "Taverna", pagina: 20, texto: "Perigosa para goblins. Sempre um taverneiro; vários barris de cerveja.", conteudo: [{ rotulo: "Taverneiro", quantidade: 1, inimigo: "taverneiro" }, { rotulo: "Camponeses", expressao: "1d6", inimigo: "campones" }, { rotulo: "Aventureiros", expressao: "1d6-2", inimigo: "aventureiro" }, { rotulo: "Guardas", expressao: "1d6-2", inimigo: "guarda" }] },
    castelo: { nome: "Castelo", pagina: 20, texto: "Muralhas altas: teste de Habilidade difícil (−1 dado). Toda sala secreta tem itens mágicos.", testes: [{ atributo: "habilidade", dificuldade: "dificil", rotulo: "Escalar as muralhas" }], conteudo: [{ rotulo: "Guardas nos arredores", expressao: "3d6", inimigo: "guarda" }, { rotulo: "Criados", expressao: "1d6+5", inimigo: "campones" }, { rotulo: "Nobres da família real", expressao: "1d6", inimigo: "nobre" }, { rotulo: "O Rei/Lorde está (com mais 1d6 guardas)", chance: "1em6", inimigo: "nobre", extra: { expressao: "1d6", inimigo: "guarda" } }, { rotulo: "Itens mágicos na sala secreta", expressao: "2d6", itemMagico: true }] },
    torreDoMago: { nome: "Torre do Grande Mago", pagina: 20, texto: "Alta (Habilidade difícil, −1 dado) e com armadilhas explosivas (teste de Habilidade). 1º piso: biblioteca e passagem secreta (Noção). 2º piso: um Golem e um item mágico. 3º piso: o mago, talvez.", testes: [{ atributo: "habilidade", dificuldade: "dificil", rotulo: "Escalar a torre" }, { atributo: "habilidade", rotulo: "Armadilhas explosivas" }, { atributo: "nocao", rotulo: "Achar a passagem secreta" }], conteudo: [{ rotulo: "Passagem secreta: itens mágicos", expressao: "1d6-2", itemMagico: true }, { rotulo: "Golem do 2º piso (Madeira ou Pedra)", golem: true }, { rotulo: "Item mágico na mesa do 2º piso", quantidade: 1, itemMagico: true }, { rotulo: "O mago NÃO está no 3º piso", chance: "1em6", ausencia: "grandeMago" }, { rotulo: "Itens mágicos espalhados", expressao: "1d6", itemMagico: true }] },
  };

  /* ---- inimigos (p. 21–23; Horrores p. 33; alienígenas p. 37) ---- */
  function ini(nome, c, bc, n, h, v, p, extra) {
    return Object.assign({ nome: nome, combate: c, bonusCombate: bc, nocao: n, habilidade: h, vitalidade: v, protecao: p }, extra || {});
  }
  var INIMIGOS = {
    campones: ini("Camponês", 3, 1, 3, 3, 3, 0, { equip: "Clava", humano: true, especie: "humano", pagina: 21 }),
    guarda: ini("Guarda", 4, 3, 3, 4, 3, 3, { equip: "Lança e Peitoral", humano: true, especie: "humano", pagina: 21 }),
    taverneiro: ini("Taverneiro", 3, 1, 4, 3, 5, 0, { equip: "Clava", humano: true, especie: "humano", pagina: 21 }),
    nobre: ini("Nobre (Rei, Princesa etc.)", 2, 3, 3, 2, 2, 4, { equip: "Espada Especial e Peitoral Reforçado", humano: true, especie: "humano", pagina: 21, nota: "Espada Especial e Peitoral Reforçado não estão nas tabelas: valem os números entre parênteses." }),
    crianca: ini("Criança", 2, 0, 2, 2, 2, 0, { equip: "Espada de Madeira", humano: true, especie: "humano", pagina: 21 }),
    aventureiro: ini("Aventureiro", 5, 2, 4, 4, 4, 7, { equip: "Espada, Escudo, Peitoral e Elmo", humano: true, especie: "humano", pagina: 21 }),
    grandeMago: ini("Grande Mago", 2, 0, 5, 3, 4, 0, { humano: true, especie: "humano", pagina: 21, habilidades: [{ nome: "Magia", texto: "Todas as magias; pode controlar o resultado removendo hits depois de rolar.", magia: true }] }),
    cao: ini("Cão", 4, 0, 2, 3, 2, 0, { especie: "cão", pagina: 21 }),
    lobo: ini("Lobo", 5, 0, 3, 4, 4, 0, { especie: "lobo", pagina: 21, habilidades: [{ nome: "Uivo", texto: "Em vez de atacar, uiva: em dois turnos aparece outro lobo.", uivo: true }] }),
    galinha: ini("Galinha", 1, 0, 1, 2, 1, 0, { especie: "galinha", pagina: 21 }),
    bode: ini("Bode", 5, 0, 3, 3, 2, 0, { especie: "bode", pagina: 21, habilidades: [{ nome: "Escalador", texto: "Pode escalar qualquer coisa." }] }),
    vaca: ini("Vaca", 3, 0, 2, 1, 8, 0, { especie: "vaca", pagina: 21 }),
    crocodilo: ini("Crocodilo", 5, 0, 3, 3, 9, 0, { especie: "crocodilo", pagina: 21, habilidades: [{ nome: "Giro Mortal", texto: "Se acertar, pode girar o alvo: ele fica preso e recebe 1 ferimento por turno.", giroMortal: true }] }),
    golemCoco: ini("Golem de Cocô", 4, 0, null, 2, 6, 0, { especie: "golem", pagina: 22, asterisco: "Vitalidade", habilidades: [{ nome: "Gosmento", texto: "Quem atacar com arma corporal deve vencer um teste ou fica com a arma presa.", gosmento: true }] }),
    golemMadeira: ini("Golem de Madeira", 5, 0, null, 3, 8, 0, { especie: "golem", pagina: 22, vulneravelFogo: true, habilidades: [{ nome: "Vulnerabilidade", texto: "Recebe o dobro de ferimentos por fogo." }] }),
    golemMetal: ini("Golem de Metal", 6, 0, null, 1, 12, 0, { especie: "golem", pagina: 22 }),
    golemPedra: ini("Golem de Pedra", 6, 0, null, 2, 15, 0, { especie: "golem", pagina: 22 }),
    esqueletoHumano: ini("Esqueleto (Humano)", 2, 1, null, 3, 1, 1, { equip: "Espada Enferrujada e Escudo", especie: "esqueleto", pagina: 22, nota: "Espada Enferrujada não está na tabela de armas; e o Escudo da tabela tem durabilidade 2, não 1: valem os números entre parênteses." }),
    esqueletoGoblin: ini("Esqueleto (Goblin)", 1, 1, null, 2, 1, 0, { equip: "Adaga", especie: "esqueleto", goblin: true, pagina: 22 }),
    zumbiHumano: ini("Zumbi (Humano)", 2, 0, null, 1, 2, 0, { especie: "zumbi", pagina: 22, asterisco: "Combate", habilidades: [{ nome: "Infecção", texto: "Se causar ferimento, o alvo vira zumbi depois de morrer.", infeccao: true }] }),
    zumbiGoblin: ini("Zumbi (Goblin)", 1, 0, null, 0, 1, 0, { especie: "zumbi", goblin: true, pagina: 22, asterisco: "Combate", habilidades: [{ nome: "Infecção", texto: "Se causar ferimento, o alvo vira zumbi depois de morrer.", infeccao: true }] }),
    fantasma: ini("Fantasma", 3, 1, 2, 4, 3, 0, { equip: "Correntes", especie: "fantasma", pagina: 22, etereo: true, habilidades: [{ nome: "Etéreo", texto: "Os ataques ignoram a proteção do goblin alvo." }] }),
    vampiro: ini("Vampiro", 5, 3, 5, 5, 7, 3, { equip: "Espadão e Peitoral", especie: "vampiro", pagina: 22, habilidades: [{ nome: "Mordida", texto: "Remove todos os próprios ferimentos ao causar dano.", mordida: true }] }),
    lich: ini("Lich", 4, 1, 6, 2, 12, 0, { especie: "lich", pagina: 22, habilidades: [{ nome: "Magia", texto: "Todas as magias; pode controlar o resultado removendo hits depois de rolar.", magia: true }] }),
    cuboGosmento: ini("Cubo Gosmento", 2, 0, 1, 2, 20, 0, { especie: "cubo", pagina: 23, habilidades: [{ nome: "Gosmento", texto: "Quem atacar com arma corporal deve vencer um teste ou fica com a arma presa.", gosmento: true }] }),
    aranhaGigante: ini("Aranha Gigante", 5, 0, 3, 4, 9, 0, { especie: "aranha", pagina: 23, habilidades: [{ nome: "Teia", texto: "Ataque à distância: sem ferimento, mas paralisa o alvo por 1d6 turnos.", teia: true }] }),
    ogro: ini("Ogro", 5, 3, 2, 2, 12, 0, { equip: "Clava Gigante", especie: "ogro", pagina: 23 }),
    troll: ini("Troll", 6, 0, 2, 3, 20, 0, { especie: "troll", pagina: 23, habilidades: [{ nome: "Regeneração", texto: "No turno do Troll, remova 1d6−1 ferimentos.", regeneracao: "1d6-1" }] }),
    berroldinho: ini("Berroldinho", 5, 0, 6, 4, 30, 0, { especie: "berroldinho", pagina: 23, habilidades: [{ nome: "Magia", texto: "Todas as magias; pode controlar o resultado removendo hits depois de rolar.", magia: true }] }),
    besta: { nome: "Besta Indescritível", indescritivel: true, combate: null, bonusCombate: null, nocao: null, habilidade: null, vitalidade: null, protecao: null, pagina: 23, habilidades: [{ nome: "Ataque Especial", texto: "Alguma coisa acontece..." }] },
    dragao: ini("Dragão", 9, 0, 9, 9, 50, 0, { especie: "dragão", pagina: 23, imuneFogo: true, habilidades: [{ nome: "Baforada", texto: "Todos são alvo. Causa dano por fogo.", baforada: true }, { nome: "Imunidade", texto: "Não recebe ferimentos de fogo." }] }),
    goblinComum: ini("Goblin Comum", 2, 1, 2, 2, 2, 0, { equip: "Adaga", especie: "goblin", goblin: true, pagina: 23 }),
    aracnogoblin: ini("Aracnogoblin", 2, 0, 2, 4, 3, 0, { especie: "goblin", goblin: true, pagina: 23, habilidades: [{ nome: "Teia", texto: "Ataque à distância: sem ferimento, mas paralisa o alvo por 1d6 turnos.", teia: true }] }),
    goblinAbominacao: ini("Goblin Abominação", 5, 0, 1, 3, 5, 0, { especie: "goblin", goblin: true, pagina: 23 }),
    /* Chamado de Cthulin (p. 33) */
    abissal: ini("Abissal (Deep one)", 4, 0, 2, 2, 5, 0, { especie: "horror", adaptacao: "cthulin", pagina: 33, habilidadeAlternativa: 4, habilidades: [{ nome: "Aquático", texto: "Vive embaixo d'água; nada muito rápido (Habilidade 4 na água)." }] }),
    byakhee: ini("Byakhee", 4, 0, 1, 4, 7, 0, { especie: "horror", adaptacao: "cthulin", pagina: 33, habilidades: [{ nome: "Voador", texto: "Pode voar." }] }),
    caoTindalos: ini("Cão de Tindalos", 5, 0, 3, 2, 6, 0, { especie: "horror", adaptacao: "cthulin", pagina: 33, habilidades: [{ nome: "Dimensional", texto: "Viaja pelas dimensões; pode se teleportar." }] }),
    criaShub: ini("Cria de Shub-Niggurath", 5, 0, 3, 4, 9, 0, { especie: "horror", adaptacao: "cthulin", pagina: 33, terror: "1d6", invocacao: -1, habilidades: [{ nome: "Terror", texto: "Quem a vê recebe 1d6 Medo." }] }),
    shogoth: ini("Shogoth", 3, 0, 5, 2, 15, 0, { especie: "horror", adaptacao: "cthulin", pagina: 33, terror: "1d6", invocacao: -1, habilidades: [{ nome: "Regeneração", texto: "Remove 3 ferimentos todo turno.", regeneracao: "3" }, { nome: "Terror", texto: "Quem o vê recebe 1d6 Medo." }] }),
    cthulhu: ini("Cthulhu", 50, 0, 50, 50, 1000, 0, { especie: "horror", adaptacao: "cthulin", pagina: 33, terror: "2d6", invocacao: -2, habilidades: [{ nome: "Terror", texto: "Quem o vê recebe 2d6 Medo." }] }),
    azathoth: ini("Azathoth", 100, 0, 100, 100, null, 0, { especie: "horror", adaptacao: "cthulin", pagina: 33, invocacao: -2, semVitalidade: true, habilidades: [{ nome: "Fim", texto: "O mundo acaba!" }] }),
    /* WarGoblin 40k (p. 37) */
    insetaoRoubaGenes: ini("Insetão Rouba-Genes", 4, 0, 1, 5, 4, 0, { especie: "insetão", adaptacao: "wargoblin", pagina: 37, habilidades: [{ nome: "Escalador", texto: "Escala qualquer superfície." }] }),
    insetaoArmado: ini("Insetão Armado", 4, 2, 2, 5, 5, 0, { equip: "Pistola Bólter", especie: "insetão", adaptacao: "wargoblin", pagina: 37 }),
    roboExterminador: ini("Robô Exterminador", 4, 3, 4, 4, 12, 0, { equip: "Metranca de Plasma", especie: "robô", adaptacao: "wargoblin", pagina: 37, habilidades: [{ nome: "Restauração", texto: "Destruído, reconstrói-se em 1d6 horas." }] }),
    roboQuatroBracos: ini("Robô de Quatro Braços", 4, 2, 4, 4, 15, 0, { equip: "4 Espadas", especie: "robô", adaptacao: "wargoblin", pagina: 37, habilidades: [{ nome: "Multiataque", texto: "Até 4 ataques corporais.", multiataque: 4 }, { nome: "Restauração", texto: "Destruído, reconstrói-se em 1d6 horas." }] }),
    zelfoSoldado: ini("Zelfo Soldado", 4, 2, 3, 5, 2, 10, { equip: "Pistola Bólter, Armadura Espacial e Capacete de Ovo", especie: "zelfo", adaptacao: "wargoblin", pagina: 37 }),
    zelfoGotico: ini("Zelfo Gótico", 4, 1, 3, 6, 3, 2, { equip: "Chicote e Capacete de Ovo", especie: "zelfo", adaptacao: "wargoblin", pagina: 37, nota: "Chicote não está em nenhuma tabela: vale o número entre parênteses." }),
  };

  var CARACTERISTICA_RIVAL_2D6 = {
    2: "Exatamente igual!", 3: "Tem uma marca de nascença numa nádega.", 4: "Gosta de usar chapéu (se o goblin do jogador gosta, este não gosta).",
    5: "Tem característica invertida.", 6: "Tem um cavanhaque.", 7: "Cores das roupas invertidas.", 8: "Outro gênero.",
    9: "Característica ainda mais acentuada.", 10: "Mais bonito (se é que um goblin pode ser bonito).", 11: "É canhoto (se o goblin é canhoto, este é destro).", 12: "Gosta de comidas diferentes.",
  };

  /* ---- gerador de masmorra (p. 28–29) ---- */
  var MASMORRA_TIPO_D6 = ["templo", "cidadela", "laboratorio", "calabouco", "cripta", "caverna"];
  var MASMORRAS = {
    templo: { nome: "Templo Esquecido", texto: "Templo de um deus esquecido; desenhos e símbolos religiosos nas paredes.", salas: ["Altar coberto por velas", "Estátua de um deus antigo", "2 Golens de Madeira", "1d6 Goblins Abominação", "Ogro em um trono e 1d6 Goblins", "1d6 Crocodilos em um fosso"] },
    cidadela: { nome: "Cidadela Abandonada", texto: "Antiga cidadela dos anões, com marcas de batalha.", salas: ["Sala de Tesouros", "Estandartes e troféus de guerra", "Centenas de armas enferrujadas", "2d6 Esqueletos", "1d6 Goblins", "Golem de Pedra"] },
    laboratorio: { nome: "Antigo Laboratório", texto: "Laboratório de alquimista; círculos de magia por toda parte.", salas: ["Estante coberta por livros", "Estante coberta por frascos", "Mesa com 1d6 Poções", "1d6 Goblins Abominação", "1 Troll e 1d6 Goblins Abominação", "1 Lich e 1d6 Esqueletos"] },
    calabouco: { nome: "Calabouço Arruinado", texto: "Onde um antigo rei prendia criminosos e traidores.", salas: ["Armas enferrujadas e correntes", "Cama de tortura e correntes", "Celas com grades enferrujadas", "2d6 Esqueletos", "1d6 Aranhas Gigantes", "2 Ogros com 1d6 Lobos"] },
    cripta: { nome: "Cripta Assombrada", texto: "Túmulo de um grande mago ou rei; esqueletos dos súditos por toda parte.", salas: ["Vampiro em um trono", "1d6 Fantasmas", "1d6 Zumbis", "1d6 Esqueletos", "Paredes de ossos", "Grande sarcófago"] },
    caverna: { nome: "Caverna Comum", texto: "Cavernas simples: estalactites, estalagmites e pedras.", salas: ["Teto alto cheio de morcegos", "Teto baixo e claustrofóbico", "Rio atravessa o local", "1d6 Goblins", "Golem de Pedra", "Dragão dormindo sobre ouro"] },
  };
  /* Índice = 1d6 + segmentos entre ele e a entrada (12 ou mais: Salão). */
  var SEGMENTOS = {
    1: { tipo: "corredor", nome: "Corredor longo", medida: "1x6", portas: 2 },
    2: { tipo: "sala", nome: "Sala média", medida: "4x4", portas: 2 },
    3: { tipo: "corredor", nome: "Corredor", medida: "1x5", portas: 3 },
    4: { tipo: "sala", nome: "Sala pequena", medida: "3x3", portas: 1 },
    5: { tipo: "sala", nome: "Sala larga", medida: "3x5", portas: 2 },
    6: { tipo: "corredor", nome: "Corredor", medida: "1x5", portas: 1 },
    7: { tipo: "sala", nome: "Sala média", medida: "4x4", portas: 0 },
    8: { tipo: "corredor", nome: "Corredor curto", medida: "1x4", portas: 1 },
    9: { tipo: "sala", nome: "Sala grande", medida: "5x5", portas: 0 },
    10: { tipo: "sala", nome: "Sala média", medida: "4x4", portas: 1 },
    11: { tipo: "corredor", nome: "Corredor longo", medida: "1x6", portas: 2 },
    12: { tipo: "sala", nome: "Salão", medida: "5x7", portas: 0 },
  };
  var CORREDOR_D6 = ["Nada", "Nada", "Nada", "Armadilha (1d6−1 ferimentos)", "1 Cubo Gosmento", "1d6 Goblins"];

  /* ---- Chamado de Cthulin (p. 32–33) ---- */
  var CTHULIN = {
    pagina: 32,
    nomes: { mercenario: "Policial / Gangster", cacador: "Caçador / Burguês", gatuno: "Criminoso / Marujo", lider: "Detetive / Padre / Freira", incendiario: "Artista / Pintor", bruxo: "Bibliotecário / Cultista" },
    inicial: ["chapeu", "livroEspecial"],
    investigacao: ["Sem pista.", "Uma dica bem mais aberta.", "O personagem pensa onde procurar.", "O mestre explica onde está, mas algo sobrenatural acontece na cena."],
    evento: [
      { texto: "Alguém fica tão apavorado que explode!" },
      { texto: "O Horror aparece na cena!" },
      { texto: "Tentáculos por toda parte! (personagens ganham 1 Medo)", medo: 1 },
      { texto: "Uma visão terrível do futuro." },
      { texto: "Uma pista do Horror." },
      { texto: "Vulto estranho passa no canto do olho." },
    ],
    horrores: ["abissal", "byakhee", "caoTindalos", "criaShub", "shogoth", "cthulhu", "azathoth"],
  };

  /* ---- PokéPragas (p. 34–35) ---- */
  var POKE = {
    pagina: 34,
    bichos: {
      comum: ["rato", "lagartixa", "besouro", "sapo", "galinha", "peixe"],
      incomum: ["pomba", "tartaruga", "cobra", "sagui", "esquilo", "coelho"],
      raro: ["pinscher", "caranguejo", "gato", "morcego", "aranha", "escorpiao"],
    },
    raridades: { comum: { nome: "Comum", captura: 1 }, incomum: { nome: "Incomum", captura: 2 }, raro: { nome: "Raro", captura: 3 } },
    /* [combate, habilidade, nocao, vitalidade] (p. 35) */
    ficha: {
      aranha: ["Aranha", 2, 4, 3, 2], besouro: ["Besouro", 1, 0, 1, 3], caranguejo: ["Caranguejo", 3, 2, 3, 4], cobra: ["Cobra", 2, 2, 2, 3],
      coelho: ["Coelho", 1, 3, 2, 3], escorpiao: ["Escorpião", 2, 4, 3, 2], esquilo: ["Esquilo", 1, 3, 2, 3], gato: ["Gato", 2, 4, 3, 4],
      galinha: ["Galinha", 2, 1, 0, 3], lagartixa: ["Lagartixa", 1, 2, 1, 1], morcego: ["Morcego", 2, 4, 3, 3], peixe: ["Peixe", 0, 1, 1, 2],
      pinscher: ["Pinscher", 2, 3, 3, 4], pomba: ["Pomba", 1, 2, 2, 3], rato: ["Rato", 1, 1, 1, 2], sagui: ["Sagui", 1, 3, 2, 3],
      sapo: ["Sapo", 0, 2, 1, 2], tartaruga: ["Tartaruga", 1, 1, 2, 5],
    },
    /* Elemento: 1º dado escolhe a coluna (1–4 | 5–6), 2º a linha. */
    elemento: [["fogo", "agua", "planta", "eletrico", "pedra", "vento"], ["dragao", "trevoso", "metal", "fada", "psiquico", "fantasma"]],
    elementos: {
      eletrico: { nome: "Elétrico", mods: { habilidade: 1 }, fraqueza: "vento" },
      fogo: { nome: "Fogo", mods: { combate: 1 }, fraqueza: "agua" },
      agua: { nome: "Água", mods: { habilidade: 1 }, fraqueza: "eletrico" },
      planta: { nome: "Planta", mods: { combate: 1 }, fraqueza: "fogo" },
      pedra: { nome: "Pedra", mods: { vitalidade: 1 }, fraqueza: "planta" },
      vento: { nome: "Vento", mods: { vitalidade: 1 }, fraqueza: "pedra" },
      dragao: { nome: "Dragão", mods: { combate: 1, habilidade: 1, nocao: 1, vitalidade: 1 }, fraqueza: "fada" },
      trevoso: { nome: "Trevoso", mods: { combate: 1, habilidade: 1 }, fraqueza: "dragao" },
      metal: { nome: "Metal", mods: { vitalidade: 2 }, fraqueza: "psiquico" },
      fada: { nome: "Fada", mods: { habilidade: 1, nocao: 1 }, fraqueza: "metal" },
      psiquico: { nome: "Psíquico", mods: { nocao: 2 }, fraqueza: "fantasma" },
      fantasma: { nome: "Fantasma", mods: { habilidade: 1 }, fraqueza: "trevoso" },
    },
    procurando: [null, "comum", "comum", "comum", "incomum", "raro"],
  };

  /* ---- WarGoblin 40k (p. 36–37) ---- */
  var WARGOBLIN = {
    pagina: 36,
    grupos: {
      marinheirosDeAzul: { nome: "Marinheiros de Azul", ocupacao: "cacador" },
      marinheirosSanguinarios: { nome: "Marinheiros Sanguinários", ocupacao: "mercenario" },
      guardaPestilenta: { nome: "Guarda Pestilenta", ocupacao: "lider" },
      legiaoTrevosa: { nome: "Legião Trevosa", ocupacao: "incendiario" },
      mecanicosDoidos: { nome: "Mecânicos Doidos", ocupacao: "gatuno" },
      freirasPorradeiras: { nome: "Freiras Porradeiras", ocupacao: "bruxo" },
    },
    equipamento: ["armaduraEspacial", "pistolaBolter", "metrancaDePlasma", "lancaChamas", "espadaSerra", "maozonaDoPoder"],
    aliens: ["insetaoRoubaGenes", "insetaoArmado", "roboExterminador", "roboQuatroBracos", "zelfoSoldado", "zelfoGotico"],
  };

  /* ---- Goblin High (p. 38–39) ---- */
  var GOBLIN_HIGH = {
    pagina: 38,
    /* A escala, de baixo para cima. */
    escala: ["inimigo", "hostil", "desconfiado", "neutro", "amigavel", "amigo"],
    nomes: { inimigo: "Inimigo", hostil: "Hostil", desconfiado: "Desconfiado", neutro: "Neutro", amigavel: "Amigável", amigo: "Amigo" },
    reacaoD6: ["amigavel", "neutro", "neutro", "desconfiado", "desconfiado", "hostil"],
    conversaD6: [
      { texto: "Fala sobre o seu Assunto Favorito.", revela: "assunto" },
      { texto: "Fala sobre seus Gostos.", revela: "gosto" },
      { texto: "Fala sobre uma Matéria da escola.", revela: "materia" },
      { texto: "Fala sobre sua Reação com outro Estudante." },
      { texto: "Fala sobre o clima." },
      { texto: "Não fala nada. (Diminua a Reação)", baixa: true },
    ],
    assunto: ["Explosões", "Namoro", "Nerdice", "Esporte", "Filmes", "Escola"],
    gosto: ["Armas", "Roupas", "Livros", "Gatinhos", "Comidas", "Perfumes"],
    materia: ["História", "Línguas", "Física", "Química", "Matemática", "Biologia"],
    segredo: ["Quer explodir a escola!", "Precisa de ajuda na Matéria", "Odeia um Estudante", "Já roubou algo de outro Estudante", "Gosta de um outro Estudante", "Gosta de você!"],
    tePego: ["Fica te encarando o dia todo.", "Coloca alguma coisa no teu lanche.", "Rouba alguma coisa sua.", "Agride um amigo seu.", "Te derruba do nada.", "Começa uma Briga com você."],
  };

  /* ---- Vale dos Goblins (p. 40–41) ---- */
  var VALE = {
    pagina: 40,
    plantas: ["Cenoura", "Batata", "Alface", "Brócolis", "Morango", "Banana", "Arroz", "Trigo", "Milho"],
    frutas: ["Morango", "Banana"],
    peixes: { rio: ["Franzino", "Peixe-Goblin", "Piranha", "Cabeçudo", "Espinhento", "Dourado"], lago: ["Franzino", "Soneca", "Pintas-Roxas", "Pedregoso", "Crista Punk", "Arco-íris"] },
    /* iguais → gramas */
    pesos: { 2: 400, 3: 600, 4: 1000, 5: 3000 },
    construcoes: {
      picareta: { nome: "Picareta", custo: { espada: 1, madeira: 1 }, ferramenta: true },
      enxada: { nome: "Enxada", custo: { pedra: 1, madeira: 1 }, ferramenta: true },
      varaDePesca: { nome: "Vara de Pescar", custo: { madeira: 1 }, ferramenta: true },
      celeiro: { nome: "Celeiro", custo: { pedra: 2, madeira: 8 } },
      fazenda: { nome: "Fazenda", custo: { pedra: 10, madeira: 12 } },
      restaurante: { nome: "Restaurante", custo: { pedra: 12, madeira: 7 } },
    },
    /* ingredientes: { alimento: n } ; peixe: { gramas, tipos? } */
    receitas: {
      ensopado: { nome: "Ensopado de Peixe", hits: 1, ingredientes: { Cenoura: 1, Batata: 1 }, peixe: { gramas: 400 } },
      salada: { nome: "Salada Mista", hits: 1, ingredientes: { Alface: 1, Tomate: 1, Cenoura: 1, "Brócolis": 1 } },
      batataFrita: { nome: "Batata Frita", hits: 1, ingredientes: { Batata: 1 } },
      pratoFeito: { nome: "Prato Feito", hits: 2, ingredientes: { Arroz: 1, Ovo: 1, Batata: 1 }, peixe: { gramas: 600 } },
      omeletao: { nome: "Omeletão", hits: 2, ingredientes: { Ovo: 1, Leite: 1 }, peixe: { gramas: 600 } },
      sorvete: { nome: "Sorvete", hits: 2, ingredientes: { Leite: 1, Fruta: 1 } },
      sanduiche: { nome: "Sanduíche", hits: 2, ingredientes: { Trigo: 1, Leite: 1 }, peixe: { gramas: 200, tipos: ["Franzino"] } },
      sushi: { nome: "Sushi", hits: 3, ingredientes: { Arroz: 1 }, peixe: { gramas: 600, tipos: ["Soneca", "Arco-íris"] } },
      bolo: { nome: "Bolo", hits: 3, ingredientes: { Leite: 1, Ovo: 1, Trigo: 2 } },
    },
  };

  var ADAPTACOES = {
    cthulin: { nome: "Chamado de Cthulin", pagina: 32 },
    pokepragas: { nome: "PokéPragas", pagina: 34 },
    wargoblin: { nome: "WarGoblin 40k", pagina: 36 },
    goblinHigh: { nome: "Goblin High", pagina: 38 },
    vale: { nome: "Vale dos Goblins", pagina: 40 },
  };

  /* O que o livro deixa em aberto ou contradiz — o R.A.M.A. não corrige
     em silêncio: cada item diz o que foi feito. */
  var INCONSISTENCIAS = [
    { chave: "varinha", pagina: 9, texto: "A técnica Condutor Mágico (Bruxo, nível 2) cita a varinha, mas a tabela de armas (p. 12) não dá Condutor Mágico à Varinha. O R.A.M.A. aplica o +1 da técnica à Varinha (como o texto da técnica diz) e mantém a tabela como está." },
    { chave: "arcoDeCaca", pagina: 7, texto: "O Caçador escolhe “Arco de Caça”; a tabela só tem Arco e Flecha. Entra como Arco e Flecha (+2d, Munição 10)." },
    { chave: "semTabela", pagina: 9, texto: "Medalhas de Guerra, Espada Especial, Peitoral Reforçado, Espadão, Correntes, Espada Enferrujada, Clava Gigante, Chicote, Machado, Picareta, Enxada e Vara de Pesca não estão em tabela: nos inimigos valem os números entre parênteses; os de jogador entram sem regra (ou com a regra da adaptação)." },
    { chave: "templo", pagina: 20, texto: "O Templo ou Santuário é descrito, mas não está na tabela de Local Aleatório (p. 19): fica disponível à parte." },
    { chave: "sumario", pagina: 3, texto: "O sumário dá páginas diferentes das impressas para algumas seções (o Gerador de Masmorra está na p. 28). O R.A.M.A. usa a página impressa." },
    { chave: "tomate", pagina: 41, texto: "A Salada Mista pede Tomate, que não está na lista de plantas; o Sanduíche pede 200 g de Franzino, mas nenhuma combinação da pescaria dá 200 g. Tomate entra como alimento manual; 200 g sai de um peixe maior." },
    { chave: "elmoCadeira", pagina: 25, texto: "Elmo-Cadeira: “+1 de Proteção” — o R.A.M.A. trata como proteção de cabeça com Durabilidade 1." },
    { chave: "evolucao", pagina: 34, texto: "Mestre da Evolução: “role dois dados” — o R.A.M.A. evolui se QUALQUER um dos dois der 6." },
    { chave: "zeroDados", pagina: 14, texto: "O livro não diz o que acontece com um teste de 0 dados (atributo 0, difícil com 1). O R.A.M.A. não inventa: pergunta se conta como falha ou se a mesa rola 1 dado." },
    { chave: "nomesLinha6", pagina: 4, texto: "Na tabela de nomes, a linha 6 tem só duas casas: o R.A.M.A. lê colunas 1–3 como “Última coisa que comeu” e 4–6 como “Inverta seu nome”." },
    { chave: "bloqueio", pagina: 15, texto: "Bloquear: “cada ferimento tomado reduz 1 de Durabilidade”. O R.A.M.A. faz a proteção absorver ferimentos até a Durabilidade atual; o que sobra vai para o goblin." },
    { chave: "martelo", pagina: 26, texto: "Martelo do Poder: “1 ferimento automaticamente” em não humanos — somado a cada ataque contra não humano, mesmo com 0 hits." },
    { chave: "livroDeMagia", pagina: 13, texto: "Livro Estranho: “1 chance em 6” — sai no 6 de 1d6; a magia é sorteada entre as 7 do Bruxo." },
    { chave: "pocaoVerde", pagina: 27, texto: "Poção Verde: “aumenta um atributo em +1” — o livro não diz qual nem por quanto tempo: a pessoa escolhe o atributo e o aumento fica permanente." },
    { chave: "elemento", pagina: 34, texto: "Elemento da PokéPraga: “um dado na linha e outro na coluna” — o 1º dado escolhe a coluna (1–4 ou 5–6), o 2º a linha." },
    { chave: "pescariaEmpate", pagina: 41, texto: "Pescaria com duas combinações (dois pares, trinca e par): o livro não diz qual vale; vale a maior, e no empate a pessoa escolhe." },
    { chave: "magiaCuraAliado", pagina: 11, texto: "Cura 1 e 2 falam de “um aliado ao seu toque”: o R.A.M.A. não aplica em quem conjurou (só o 3+, “todas as criaturas visíveis”)." },
    { chave: "tempestade", pagina: 11, texto: "Relâmpago 3+: o livro não diz quantos raios nem quanto dano; a mesa marca a tempestade até o fim da batalha e sorteia alvos, sem número inventado." },
    { chave: "ataqueGiratorio", pagina: 7, texto: "Ataque Giratório: o ataque extra não gera outro Ataque Giratório (o livro não fala em cadeia)." },
  ];

  /* ---- busca ---- */
  function arma(k) { return ARMAS[k] || null; }
  function protecao(k) { return PROTECOES[k] || null; }
  function equipamento(k) { return EQUIPAMENTOS[k] || null; }
  function magico(k) { return ITENS_MAGICOS[k] || null; }
  function inimigo(k) { return INIMIGOS[k] || null; }
  function tecnica(chave) {
    var achada = null;
    Object.keys(OCUPACOES).some(function (o) { return OCUPACOES[o].tecnicas.some(function (t) { if (t.chave === chave) { achada = Object.assign({ ocupacao: o }, t); return true; } return false; }); });
    return achada;
  }
  /* Um item do catálogo, de qualquer tabela: { categoria, def }. */
  function itemDoCatalogo(chave) {
    if (ARMAS[chave]) return { categoria: "arma", def: ARMAS[chave] };
    if (PROTECOES[chave]) return { categoria: "protecao", def: PROTECOES[chave] };
    if (ITENS_MAGICOS[chave]) return { categoria: "magico", def: ITENS_MAGICOS[chave] };
    if (EQUIPAMENTOS[chave]) return { categoria: "equipamento", def: EQUIPAMENTOS[chave] };
    return null;
  }

  global.RAMAGoblinsCatalogo = {
    LIVRO: LIVRO, referencia: referencia,
    ATRIBUTOS: ATRIBUTOS, CHAVES_ATRIBUTO: CHAVES_ATRIBUTO, NOMES: NOMES,
    OCUPACOES: OCUPACOES, OCUPACAO_D6: OCUPACAO_D6, DESCRITORES: DESCRITORES, DESCRITOR_D6: DESCRITOR_D6,
    CARACTERISTICAS: CARACTERISTICAS, CARACTERISTICA_2D6: CARACTERISTICA_2D6,
    MAGIAS: MAGIAS, MAGIAS_DO_BRUXO: MAGIAS_DO_BRUXO,
    ARMAS: ARMAS, ESPECIAIS_DE_ARMA: ESPECIAIS_DE_ARMA, PROTECOES: PROTECOES, ESPECIAIS_DE_PROTECAO: ESPECIAIS_DE_PROTECAO, USOS_DE_PROTECAO: USOS_DE_PROTECAO,
    EQUIPAMENTOS: EQUIPAMENTOS, ITENS_MAGICOS: ITENS_MAGICOS, TIPO_MAGICO_D6: TIPO_MAGICO_D6, NOMES_TIPO_MAGICO: NOMES_TIPO_MAGICO, MAGICOS_D6: MAGICOS_D6,
    ANEL_D6: ANEL_D6, POCAO_D6: POCAO_D6,
    REGRAS: REGRAS, DEU_RUIM_D6: DEU_RUIM_D6, MANOBRAS: MANOBRAS,
    AVENTURA_D6: AVENTURA_D6, AVENTURAS: AVENTURAS, INSPIRACAO_D6: INSPIRACAO_D6, RESPOSTA_D6: RESPOSTA_D6,
    VIAJANTE_2D6: VIAJANTE_2D6, VITIMA_D6: VITIMA_D6, RECOMPENSA_D6: RECOMPENSA_D6, LOCAL_D6: LOCAL_D6, LOCAIS: LOCAIS,
    PROTEGER_2D6: PROTEGER_2D6, VIZINHOS_2D6: VIZINHOS_2D6,
    INIMIGOS: INIMIGOS, CARACTERISTICA_RIVAL_2D6: CARACTERISTICA_RIVAL_2D6,
    MASMORRA_TIPO_D6: MASMORRA_TIPO_D6, MASMORRAS: MASMORRAS, SEGMENTOS: SEGMENTOS, CORREDOR_D6: CORREDOR_D6,
    CTHULIN: CTHULIN, POKE: POKE, WARGOBLIN: WARGOBLIN, GOBLIN_HIGH: GOBLIN_HIGH, VALE: VALE, ADAPTACOES: ADAPTACOES,
    INCONSISTENCIAS: INCONSISTENCIAS,
    arma: arma, protecao: protecao, equipamento: equipamento, magico: magico, inimigo: inimigo, tecnica: tecnica, itemDoCatalogo: itemDoCatalogo,
  };
})(typeof window !== "undefined" ? window : globalThis);
/* <<< js/goblins/catalogo.js */

/* >>> js/goblins/dados.js */
/* =====================================================================
   R.A.M.A. — Malditos Goblins · o motor de dados (d6)
   =====================================================================
   Livro p. 14–15. Puro: quem rola passa um `rolador(faces)` (na
   página, o de js/dados.js; nos testes, uma fila). Nada aqui toca a
   ficha — regras.js monta a parada e aplica as consequências.

     · a parada é o atributo + bônus (arma, técnica, item…); fácil +1
       dado, difícil −1;
     · cada dado de 4 a 6 é 1 HIT;
     · cada 6 EXPLODE: além do hit, rola mais um dado, que também
       explode no 6 — em cadeia, sem limite (o livro diz
       "infinitamente"). Por padrão as explosões se resolvem sozinhas;
       com `explosoes: "manual"` cada uma espera a pessoa ("pode rolar
       mais um dado") e ela pode parar;
     · EXPLOSÃO DE GOBLIN: todos os dados caíram em 1 → o goblin
       explode. Só na rolagem de um goblin de jogador
       (`podeExplodirGoblin`), e nunca com a Voz Goblin declarada (regra
       opcional, p. 16);
     · TESTE: 0 hits Falhou! · 1 Conseguiu, mas deu ruim… · 2
       Conseguiu! · 3+ Conseguiu e foi épico! (o rótulo para em 3; os
       hits, não);
     · ATAQUE: os hits são os ferimentos — sem teto;
     · ESQUIVA: cada hit tira um hit do atacante;
     · CONJURAR: o resultado da magia é min(hits, 3).

   Parada de 0 dados (atributo 0, teste difícil com 1 dado…): o livro
   não diz. Com `seZero` ausente a rolagem volta `lacuna: true` e
   ninguém decide por ela; "falha" conta como 0 hits sem rolar (e sem
   explosão de goblin); "umDado" rola 1 dado (regra da casa, marcada).

   Também aqui: sorteios em tabela (1d6, 2d6 somados, 2d6 coluna e
   linha), rolagens de quantidade (1d6−2, 3d6…) e o minijogo da
   pescaria (Vale dos Goblins, p. 41). Nenhum deles explode nem conta
   hit — são outra coisa, e o histórico diz qual.
   ===================================================================== */

(function (global) {
  "use strict";

  var LIMIAR = 4;
  var EXPLODE = 6;
  /* Guarda contra um rolador quebrado (sempre 6). Dado de verdade não
     chega perto: 500 seis seguidos. A cadeia não é cortada por regra. */
  var GUARDA_DE_CADEIA = 500;

  var RESULTADOS = ["Falhou!", "Conseguiu, mas deu ruim…", "Conseguiu!", "Conseguiu e foi épico!"];

  function inteiro(v, padrao) {
    var n = Math.floor(Number(v));
    return isFinite(n) ? n : (padrao === undefined ? 0 : padrao);
  }

  function face(rolador, faces) {
    var f = faces || 6;
    var n = Math.floor(Number(rolador(f)));
    return n >= 1 && n <= f ? n : 1;
  }

  /* Ajuste de dificuldade (p. 14). */
  function ajusteDeDificuldade(d) { return d === "facil" ? 1 : d === "dificil" ? -1 : 0; }

  /* Monta a parada: base + parcelas + dificuldade. A composição fica
     com cada parcela (fonte, valor) para a tela e o histórico. */
  function montarParada(base, parcelas, dificuldade, opcoes) {
    var comp = [{ fonte: base.fonte, valor: inteiro(base.valor) }];
    (parcelas || []).forEach(function (p) { if (p && inteiro(p.valor)) comp.push({ fonte: p.fonte, valor: inteiro(p.valor) }); });
    var aj = ajusteDeDificuldade(dificuldade);
    if (aj) comp.push({ fonte: aj > 0 ? "Teste fácil" : "Teste difícil", valor: aj });
    var total = comp.reduce(function (s, c) { return s + c.valor; }, 0);
    /* Dobrar (Ataque Brutal, Tiro Certeiro): o dobro da parada já
       montada — todos os dados, não só o atributo. */
    if (opcoes && opcoes.dobrar && total > 0) { comp.push({ fonte: opcoes.dobrar, valor: total }); total = total * 2; }
    return { parada: total, composicao: comp };
  }

  /* Rola uma parada. `o`:
       parada            dados (já com tudo)
       tipo              "teste" | "ataque" | "esquiva" | "conjurar" | "oposto"
       rotulo, id, composicao
       necessarios       hits exigidos (captura, Livro Estranho, cozinha…)
       explosoes         "auto" (padrão) | "manual"
       podeExplodirGoblin  padrão true (goblin de jogador)
       vozGoblin         a regra opcional, declarada por quem joga
       seZero            "falha" | "umDado" (ver o cabeçalho) */
  function rolar(o, rolador) {
    var tipo = o.tipo || "teste";
    var parada = inteiro(o.parada, 0);
    var r = {
      id: o.id || "", tipo: tipo, rotulo: o.rotulo || "",
      composicao: Array.isArray(o.composicao) ? o.composicao.slice() : [],
      paradaPedida: parada, parada: Math.max(0, parada),
      necessarios: o.necessarios === undefined || o.necessarios === null ? null : Math.max(0, inteiro(o.necessarios)),
      modoExplosao: o.explosoes === "manual" ? "manual" : "auto",
      podeExplodirGoblin: o.podeExplodirGoblin !== false,
      vozGoblin: !!o.vozGoblin,
      dados: [], explosoesPendentes: 0, explosoesRecusadas: 0,
      lacuna: false, casaUmDado: false, zeroComoFalha: false, cortada: false,
      concluida: false,
    };
    if (r.parada <= 0) {
      if (o.seZero === "umDado") { r.parada = 1; r.casaUmDado = true; }
      else if (o.seZero === "falha") { r.zeroComoFalha = true; r.concluida = true; r.classificacao = classificar(r); return r; }
      else { r.lacuna = true; r.classificacao = classificar(r); return r; }
    }
    for (var i = 0; i < r.parada; i++) {
      var f = face(rolador);
      r.dados.push({ face: f, origem: "inicial", de: null });
      if (f === EXPLODE) r.explosoesPendentes++;
    }
    if (r.modoExplosao === "auto") resolverTodas(r, rolador);
    r.classificacao = classificar(r);
    if (!r.explosoesPendentes) r.concluida = true;
    return r;
  }

  /* Uma explosão: o dado novo vem DO último 6 ainda não seguido. */
  function explodir(r, rolador) {
    if (!r.explosoesPendentes) return { ok: false, motivo: "Nenhum 6 esperando." };
    if (r.dados.length >= GUARDA_DE_CADEIA) { r.cortada = true; r.explosoesPendentes = 0; r.classificacao = classificar(r); r.concluida = true; return { ok: false, motivo: "Rolador sem fim (500 dados)." }; }
    var seguidos = {};
    r.dados.forEach(function (d) { if (d.de !== null) seguidos[d.de] = true; });
    var pai = -1;
    for (var i = 0; i < r.dados.length; i++) if (r.dados[i].face === EXPLODE && !seguidos[i]) { pai = i; break; }
    var f = face(rolador);
    r.dados.push({ face: f, origem: "explosao", de: pai });
    r.explosoesPendentes--;
    if (f === EXPLODE) r.explosoesPendentes++;
    r.classificacao = classificar(r);
    if (!r.explosoesPendentes) r.concluida = true;
    return { ok: true, face: f };
  }

  function resolverTodas(r, rolador) {
    while (r.explosoesPendentes > 0) {
      if (!explodir(r, rolador).ok) break;
    }
  }

  /* "Pode rolar" — a pessoa decidiu não rolar as que faltam. */
  function recusarExplosoes(r) {
    r.explosoesRecusadas += r.explosoesPendentes;
    r.explosoesPendentes = 0;
    r.classificacao = classificar(r);
    r.concluida = true;
    return { ok: true };
  }

  function contarHits(dados) { return dados.filter(function (d) { return d.face >= LIMIAR; }).length; }

  function classificar(r) {
    var iniciais = r.dados.filter(function (d) { return d.origem === "inicial"; });
    var hits = contarHits(r.dados);
    var todosUm = iniciais.length > 0 && r.dados.every(function (d) { return d.face === 1; });
    var c = {
      hits: hits,
      explosoes: r.dados.filter(function (d) { return d.origem === "explosao"; }).length,
      todosUm: todosUm,
      goblinExplode: todosUm && r.podeExplodirGoblin && !r.vozGoblin && !r.casaUmDado,
      vozSalvou: todosUm && r.podeExplodirGoblin && r.vozGoblin,
      lacuna: !!r.lacuna,
    };
    var nivel = Math.min(hits, 3);
    c.nivel = nivel;
    if (r.tipo === "ataque") { c.ferimentos = hits; c.rotulo = hits + " ferimento(s)"; }
    else if (r.tipo === "esquiva") { c.reduz = hits; c.rotulo = "Esquiva: −" + hits + " hit(s) do atacante"; }
    else if (r.tipo === "conjurar") { c.resultado = nivel; c.rotulo = hits + " hit(s) — resultado " + (nivel === 3 ? "3+" : nivel); }
    else if (r.tipo === "oposto") { c.rotulo = hits + " hit(s)"; }
    else { c.resultado = nivel; c.rotulo = RESULTADOS[nivel]; }
    if (r.necessarios !== null && r.necessarios !== undefined) {
      c.sucesso = hits >= r.necessarios;
      c.rotuloNecessarios = (c.sucesso ? "Conseguiu" : "Não conseguiu") + " (" + hits + " de " + r.necessarios + " hit(s))";
    } else {
      c.sucesso = hits >= 1;
    }
    if (r.lacuna) c.rotulo = "Parada sem dados — o livro não diz o que fazer";
    if (r.zeroComoFalha) c.rotulo = (r.tipo === "teste" ? RESULTADOS[0] : "0 hits") + " (parada sem dados, contada como falha)";
    return c;
  }

  /* Disputa (negociação, p. 18; ou qualquer teste oposto). */
  function disputa(hitsA, hitsB) {
    var a = inteiro(hitsA), b = inteiro(hitsB);
    return { a: a, b: b, vence: a > b ? "a" : b > a ? "b" : "empate" };
  }

  /* ---------------------------------------------------------------
     SORTEIOS EM TABELA, QUANTIDADES
     --------------------------------------------------------------- */

  /* tabela: { id, nome, pagina, dados: "1d6"|"2d6"|"colunaLinha"|"d7",
     entradas } — 1d6: lista de 6; 2d6: { 2..12 }; colunaLinha: [col][lin].
     Devolve o sorteio inteiro (dados, índice, resultado). */
  function sortear(tabela, rolador) {
    var dados = [], indice, resultado;
    if (tabela.dados === "2d6") {
      dados = [face(rolador), face(rolador)];
      indice = dados[0] + dados[1];
      resultado = tabela.entradas[indice];
    } else if (tabela.dados === "colunaLinha") {
      dados = [face(rolador), face(rolador)];
      indice = { coluna: dados[0], linha: dados[1] };
      resultado = tabela.entradas[dados[0] - 1][dados[1] - 1];
    } else if (/^d\d+$/.test(tabela.dados || "")) {
      var n = inteiro(tabela.dados.slice(1), 6);
      dados = [face(rolador, n)];
      indice = dados[0];
      resultado = tabela.entradas[dados[0] - 1];
    } else {
      dados = [face(rolador)];
      indice = dados[0];
      resultado = tabela.entradas[dados[0] - 1];
    }
    return { tipo: "sorteio", tabela: tabela.id || "", nome: tabela.nome || "", pagina: tabela.pagina || null, dados: dados, indice: indice, resultado: resultado === undefined ? null : JSON.parse(JSON.stringify(resultado)) };
  }

  /* "1d6", "2d6", "1d6-2", "1d6+5", "3d6", "1d2", "4" — mínimo 0. */
  var EXPRESSAO = /^\s*(\d*)d(\d+)\s*([+-]\s*\d+)?\s*$/i;
  function quantidade(expr, rolador) {
    var texto = String(expr === undefined || expr === null ? "" : expr).replace(/−/g, "-");
    if (/^\s*\d+\s*$/.test(texto)) return { tipo: "quantidade", expressao: texto.trim(), dados: [], total: inteiro(texto), bruto: inteiro(texto) };
    var m = EXPRESSAO.exec(texto);
    if (!m) return { tipo: "quantidade", expressao: texto, dados: [], total: 0, bruto: 0, invalida: true };
    var n = m[1] ? inteiro(m[1], 1) : 1, faces = inteiro(m[2], 6), soma = m[3] ? inteiro(m[3].replace(/\s/g, "")) : 0;
    var dados = [];
    for (var i = 0; i < n; i++) dados.push(face(rolador, faces));
    var bruto = dados.reduce(function (s, d) { return s + d; }, 0) + soma;
    return { tipo: "quantidade", expressao: texto.trim(), dados: dados, total: Math.max(0, bruto), bruto: bruto, minimoZero: bruto < 0 };
  }

  /* "1 chance em 6" (sai no 6) ou 50% (4–6). */
  function chance(tipo, rolador) {
    var f = face(rolador);
    return { tipo: "chance", chance: tipo, dados: [f], saiu: tipo === "50%" ? f >= 4 : f === 6 };
  }

  /* ---------------------------------------------------------------
     PESCARIA (Vale dos Goblins, p. 41)
     5 dados; rerrola de 1 a 5 escolhidos, no máximo duas vezes; a
     combinação (dados iguais) dá o peso, o valor do dado o peixe.
     --------------------------------------------------------------- */
  function pescar(rolador, local) {
    var dados = [];
    for (var i = 0; i < 5; i++) dados.push(face(rolador));
    return { tipo: "pescaria", local: local === "lago" ? "lago" : "rio", dados: dados, historico: [dados.slice()], rerrolagens: 0, concluida: false };
  }

  function rerrolarPescaria(p, indices, rolador) {
    if (p.concluida) return { ok: false, motivo: "A pescaria já terminou." };
    if (p.rerrolagens >= 2) return { ok: false, motivo: "Só dá para rerrolar duas vezes." };
    var lista = (Array.isArray(indices) ? indices : []).map(Number).filter(function (i, k, t) { return i >= 0 && i < 5 && t.indexOf(i) === k; });
    if (!lista.length) return { ok: false, motivo: "Escolha de 1 a 5 dados." };
    lista.forEach(function (i) { p.dados[i] = face(rolador); });
    p.rerrolagens++;
    p.historico.push(p.dados.slice());
    return { ok: true };
  }

  /* As combinações possíveis: [{ valor, iguais }], maior primeiro. */
  function combinacoes(dados) {
    var cont = {};
    dados.forEach(function (d) { cont[d] = (cont[d] || 0) + 1; });
    return Object.keys(cont).map(Number).filter(function (v) { return cont[v] >= 2; })
      .map(function (v) { return { valor: v, iguais: cont[v] }; })
      .sort(function (a, b) { return b.iguais - a.iguais || b.valor - a.valor; });
  }

  /* Fecha: `escolha` (o valor do dado) desempata combinações do mesmo
     tamanho; sem ela, vale a maior (e, no empate, o maior valor). */
  function concluirPescaria(p, pesos, peixes, escolha) {
    if (p.concluida) return { ok: true, repetida: true, peixe: p.peixe };
    var cs = combinacoes(p.dados);
    p.concluida = true;
    if (!cs.length) { p.peixe = null; return { ok: true, peixe: null }; }
    var maior = cs[0].iguais;
    var empatadas = cs.filter(function (c) { return c.iguais === maior; });
    var c = empatadas[0];
    if (escolha !== undefined && escolha !== null) {
      var e = empatadas.filter(function (x) { return x.valor === inteiro(escolha); })[0];
      if (e) c = e;
    }
    p.peixe = { valor: c.valor, iguais: c.iguais, nome: peixes[p.local][c.valor - 1], gramas: pesos[c.iguais], empate: empatadas.length > 1 };
    return { ok: true, peixe: p.peixe };
  }

  /* ---------------------------------------------------------------
     PARA A TELA E O HISTÓRICO
     --------------------------------------------------------------- */

  function rotuloDoDado(d) {
    var leitura = d.face === EXPLODE ? "6, hit e explode" : d.face >= LIMIAR ? d.face + ", hit" : d.face + ", sem hit";
    return (d.origem === "explosao" ? "dado de explosão: " : "dado: ") + leitura;
  }

  /* O resultado no formato do mostrador de rolagens (js/paginas/
     ficha-rolagens.js): faces, marcas ("explosao" no dado que veio de
     um 6), total = hits, e as parcelas da parada. */
  function paraCartao(r) {
    var c = r.classificacao || classificar(r);
    var nIni = r.dados.filter(function (d) { return d.origem === "inicial"; }).length;
    var nExp = r.dados.length - nIni;
    return {
      tipo: "goblins",
      expressao: (r.lacuna || r.zeroComoFalha ? "0 dados" : nIni + " dado" + (nIni === 1 ? "" : "s")) + (nExp ? " + " + nExp + " de explosão" : ""),
      rolagens: r.dados.map(function (d) { return d.face; }),
      marcas: r.dados.map(function (d) { return d.origem === "explosao" ? "explosao" : ""; }),
      total: c.hits,
      parcelas: (r.composicao || []).map(function (p) { return { rotulo: p.fonte, valor: p.valor }; }),
    };
  }

  function paraHistorico(r) {
    return {
      v: 1, sistema: "goblins", tipo: r.tipo, rotulo: r.rotulo, parada: r.parada, composicao: r.composicao,
      dados: r.dados.map(function (d) { return { face: d.face, origem: d.origem, de: d.de }; }),
      necessarios: r.necessarios, classificacao: r.classificacao, explosoesRecusadas: r.explosoesRecusadas,
      lacuna: r.lacuna, casaUmDado: r.casaUmDado, zeroComoFalha: r.zeroComoFalha, vozGoblin: r.vozGoblin,
    };
  }

  global.RAMAGoblinsDados = {
    LIMIAR: LIMIAR, EXPLODE: EXPLODE, RESULTADOS: RESULTADOS,
    ajusteDeDificuldade: ajusteDeDificuldade, montarParada: montarParada,
    rolar: rolar, explodir: explodir, recusarExplosoes: recusarExplosoes, classificar: classificar, contarHits: contarHits, disputa: disputa,
    sortear: sortear, quantidade: quantidade, chance: chance,
    pescar: pescar, rerrolarPescaria: rerrolarPescaria, combinacoes: combinacoes, concluirPescaria: concluirPescaria,
    rotuloDoDado: rotuloDoDado, paraCartao: paraCartao, paraHistorico: paraHistorico,
  };
})(typeof window !== "undefined" ? window : globalThis);
/* <<< js/goblins/dados.js */

/* >>> js/goblins/regras.js */
/* =====================================================================
   R.A.M.A. — Malditos Goblins (3ª edição) · o motor da ficha
   =====================================================================
   Tudo o que muda a ficha passa por aqui — a tela só pergunta e
   mostra. O mesmo arquivo roda no servidor (backend/Goblins.gs, cópia
   entre marcadores), então nada aqui toca a página.

   O BLOCO `goblins` (VERSAO_BLOCO 1):
     criacao       modo, concluída, os sorteios feitos, se o equipamento
                   inicial já entrou (entra UMA vez)
     ocupacao, descritor, supimpa, modEscolhido (Fazendeiro)
     caracteristicas [{ id, chave, quantidade }]
     equipamentoInicial (índice da opção), escolhas (arma favorita,
                   espécie inimiga, 3 magias, turminha e itens do
                   WarGoblin, Chapéu ou Livro do Cthulin)
     nivel, epicas [{ ocupacao, nivel }] (Níveis Épicos, opcional)
     ajustes       permanentes, com motivo (Morte 0, Poção Verde…)
     ferimentos
     itens         armas, proteções, equipamento, itens mágicos: cada um
                   com munição, recarga, durabilidade atual/original,
                   destruído/consumido — nada some
     efeitos       temporários, com DURAÇÃO POR MARCO (próximo ataque,
                   próximo teste, N turnos, fim da batalha, fim do dia,
                   manual) — nunca por relógio de verdade
     marcas        usos por dia, por batalha e por turno
     tempo         dia, batalha em curso, turno
     estado        situação (ativo, morto, explodiu, explodiu de
                   alegria, louco, sumiu, morto-vivo), causa, marcas
     opcoes        regras opcionais e adaptações LIGADAS; desligar não
                   apaga os dados da adaptação
     adaptacoes    Cthulin (Medo), PokéPragas, Goblin High, Vale
     linhagem      o goblin anterior e o seguinte (morreu? o parente
                   novo aponta para ele — a ficha antiga fica)
     historico, operacoes (ids aplicados: repetir não aplica duas vezes)

   VALORES EM CAMADAS. Atributo = base 2 + ocupação + descritor (+1 do
   Supimpa) + ajustes permanentes (a BASE) + equipamento vestido +
   efeitos temporários. calcular() devolve cada camada e a composição;
   nada disso é gravado de volta na base — abrir e salvar não somam
   bônus de novo.
   ===================================================================== */

(function (global) {
  "use strict";

  var VERSAO_BLOCO = 1;
  var LIMITE_OPERACOES = 200;
  var LIMITE_HISTORICO = 300;
  var SITUACOES = {
    ativo: "Ativo", morto: "Morto", explodiu: "Explodiu", explodiuDeAlegria: "Explodiu de alegria",
    louco: "Perdido para a loucura", sumiu: "Sumiu da existência", mortoVivo: "Morto-vivo",
  };
  var FIM = ["morto", "explodiu", "explodiuDeAlegria", "louco", "sumiu"];
  var DURACOES = {
    proximoAtaque: "até o próximo ataque", proximoTeste: "até a próxima rolagem", turnos: "por turnos",
    fimDaBatalha: "até o fim da batalha", fimDoDia: "até o fim do dia", manual: "até ser encerrado", permanente: "permanente",
  };

  function C() { return global.RAMAGoblinsCatalogo; }
  function D() { return global.RAMAGoblinsDados; }

  function copiar(x) { return x === undefined ? undefined : JSON.parse(JSON.stringify(x)); }
  var contadorDeId = 0;
  function novoId(prefixo) {
    var U = global.RAMAUtil;
    if (U && U.uuid) return (prefixo || "g") + "-" + U.uuid().replace(/-/g, "").slice(0, 16);
    contadorDeId++;
    return (prefixo || "g") + "-" + Date.now().toString(36) + "-" + contadorDeId;
  }
  function evento(tipo, dados) { return Object.assign({}, dados || {}, { tipo: tipo }); }
  function falha(motivo, extra) { return Object.assign({ ok: false, motivo: motivo, eventos: [] }, extra || {}); }
  function ok(eventos, extra) { return Object.assign({ ok: true, eventos: eventos || [] }, extra || {}); }
  function lista(v) { return Array.isArray(v) ? v : []; }
  function objeto(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  function inteiro(v, min, padrao) {
    var n = Math.floor(Number(v));
    if (!isFinite(n)) n = padrao === undefined ? 0 : padrao;
    return min !== undefined && min !== null && n < min ? min : n;
  }
  function texto(v, max) { return typeof v === "string" ? v.slice(0, max || 200) : ""; }
  function chaveValida(v) { return typeof v === "string" && /^[A-Za-z0-9_-]{1,60}$/.test(v); }
  function bool(v) { return v === true; }
  function normalizarTexto(t) { return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim(); }

  /* ---------------------------------------------------------------
     O BLOCO
     --------------------------------------------------------------- */

  function adaptacoesVazias() {
    return {
      cthulin: { medo: 0 },
      pokepragas: { pokepedras: 0, pragas: [], encontrada: null },
      goblinHigh: { estudantes: [], popular: false, humilhado: false, briga: null },
      vale: { fazenda: false, galinhas: 0, vacas: 0, minas: 0, bosques: 0, hortas: [], construcoes: [], recursos: { ovo: 0, leite: 0, pedra: 0, madeira: 0 }, alimentos: {}, peixes: [], pratos: {} },
    };
  }

  function fichaVazia() {
    return {
      v: VERSAO_BLOCO,
      criacao: { modo: "", concluida: false, sorteios: [], equipamentoAplicado: false, nomeSugerido: "", pendenciaDeNome: "" },
      nomeDeFamilia: "",
      ocupacao: "", descritor: "", supimpa: "", modEscolhido: "",
      caracteristicas: [],
      equipamentoInicial: null,
      escolhas: { armaFavorita: "", especieInimiga: "", magias: [], grupoWar: "", equipamentoWar: [], inicialCthulin: "" },
      nivel: 1,
      epicas: [],
      ajustes: [],
      ferimentos: 0,
      itens: [],
      efeitos: [],
      marcas: { dia: {}, batalha: {}, turno: {} },
      tempo: { dia: 1, batalha: false, turno: 0 },
      estado: { situacao: "ativo", causa: "", marcas: [], vozGoblin: "", pendenteEpico: false },
      opcoes: { vozGoblin: false, deuRuim: false, niveisEpicos: false, explosoesManuais: false, adaptacoes: { cthulin: false, pokepragas: false, wargoblin: false, goblinHigh: false, vale: false } },
      adaptacoes: adaptacoesVazias(),
      linhagem: { anterior: null, seguinte: null },
      historico: [],
      operacoes: [],
      seq: 0,
    };
  }

  function normalizarItem(b) {
    var x = objeto(b);
    var i = {
      id: chaveValida(x.id) ? x.id : novoId("it"),
      chave: typeof x.chave === "string" ? x.chave.slice(0, 60) : "",
      categoria: ["arma", "protecao", "equipamento", "magico", "outro"].indexOf(x.categoria) >= 0 ? x.categoria : "outro",
      nome: texto(x.nome, 120) || "Item",
      equipado: bool(x.equipado),
      quantidade: inteiro(x.quantidade, 0, 1),
      nota: texto(x.nota, 600),
      destruido: bool(x.destruido),
      consumido: bool(x.consumido),
      arremessado: bool(x.arremessado),
      precisaRecarregar: bool(x.precisaRecarregar),
      municao: null, durabilidade: null,
      magico: objeto(x.magico),
      personalizado: x.personalizado && typeof x.personalizado === "object" ? copiar(x.personalizado) : null,
      aceso: x.aceso && typeof x.aceso === "object" ? { turnos: inteiro(x.aceso.turnos, 0) } : null,
    };
    if (x.municao && typeof x.municao === "object") i.municao = { atual: inteiro(x.municao.atual, 0), max: inteiro(x.municao.max, 0) };
    if (x.durabilidade && typeof x.durabilidade === "object") i.durabilidade = { atual: inteiro(x.durabilidade.atual, 0), original: inteiro(x.durabilidade.original, 0) };
    return i;
  }

  function normalizarEfeito(b) {
    var x = objeto(b);
    var e = {
      id: chaveValida(x.id) ? x.id : novoId("ef"),
      chave: texto(x.chave, 60) || "efeito",
      nome: texto(x.nome, 120) || "Efeito",
      ate: DURACOES[x.ate] ? x.ate : "manual",
      turnos: inteiro(x.turnos, 0),
      mods: {},
      dados: inteiro(x.dados, 0),
      fonte: texto(x.fonte, 120), pagina: x.pagina ? inteiro(x.pagina, 0) : null, texto: texto(x.texto, 400),
      item: chaveValida(x.item) ? x.item : "",
      alvo: texto(x.alvo, 120),
      imuneFogo: bool(x.imuneFogo), semAtaque: bool(x.semAtaque), semAgir: bool(x.semAgir), semEsquiva: bool(x.semEsquiva),
      ataque: inteiro(x.ataque), porMinuto: inteiro(x.porMinuto, 0),
      dia: inteiro(x.dia, 0),
    };
    Object.keys(objeto(x.mods)).forEach(function (k) { if (C().CHAVES_ATRIBUTO.indexOf(k) >= 0 && inteiro(x.mods[k])) e.mods[k] = inteiro(x.mods[k]); });
    return e;
  }

  function normalizarPraga(b) {
    var x = objeto(b);
    return {
      id: chaveValida(x.id) ? x.id : novoId("pp"),
      nome: texto(x.nome, 60) || "PokéPraga",
      bicho: chaveValida(x.bicho) ? x.bicho : "rato",
      raridade: ["comum", "incomum", "raro"].indexOf(x.raridade) >= 0 ? x.raridade : "comum",
      elementos: lista(x.elementos).filter(chaveValida).slice(0, 12),
      evolucoes: inteiro(x.evolucoes, 0),
      ferimentos: inteiro(x.ferimentos, 0),
      desmaiada: bool(x.desmaiada),
    };
  }

  function normalizarEstudante(b) {
    var x = objeto(b);
    var esc = C().GOBLIN_HIGH.escala;
    var rev = objeto(x.revelado);
    return {
      id: chaveValida(x.id) ? x.id : novoId("es"),
      nome: texto(x.nome, 60) || "Estudante",
      reacao: esc.indexOf(x.reacao) >= 0 ? x.reacao : "neutro",
      assunto: inteiro(x.assunto, 1, 1), gosto: inteiro(x.gosto, 1, 1), materia: inteiro(x.materia, 1, 1), segredo: inteiro(x.segredo, 1, 1),
      revelado: { assunto: bool(rev.assunto), gosto: bool(rev.gosto), materia: bool(rev.materia), segredo: bool(rev.segredo) },
      romance: x.romance && typeof x.romance === "object" ? { meses: inteiro(x.romance.meses, 0), desde: inteiro(x.romance.desde, 0) } : null,
      agrados3: lista(x.agrados3).map(function (n) { return inteiro(n, 0); }).slice(-4),
      nota: texto(x.nota, 400),
    };
  }

  function normalizarVale(b) {
    var x = objeto(b);
    var v = adaptacoesVazias().vale;
    v.fazenda = bool(x.fazenda);
    ["galinhas", "vacas", "minas", "bosques"].forEach(function (k) { v[k] = inteiro(x[k], 0); });
    v.hortas = lista(x.hortas).slice(0, 60).map(function (h) {
      var y = objeto(h);
      return { id: chaveValida(y.id) ? y.id : novoId("ho"), planta: texto(y.planta, 40) || "Cenoura", m2: inteiro(y.m2, 0), plantadaNoDia: inteiro(y.plantadaNoDia, 0), colheitaEm: inteiro(y.colheitaEm, 0), colhida: bool(y.colhida) };
    });
    v.construcoes = lista(x.construcoes).filter(chaveValida).slice(0, 40);
    var rec = objeto(x.recursos);
    ["ovo", "leite", "pedra", "madeira"].forEach(function (k) { v.recursos[k] = inteiro(rec[k], 0); });
    Object.keys(objeto(x.alimentos)).slice(0, 40).forEach(function (k) { var n = inteiro(x.alimentos[k], 0); if (n > 0) v.alimentos[texto(k, 40)] = n; });
    v.peixes = lista(x.peixes).slice(0, 200).map(function (p) {
      var y = objeto(p);
      return { id: chaveValida(y.id) ? y.id : novoId("px"), nome: texto(y.nome, 40) || "Peixe", local: y.local === "lago" ? "lago" : "rio", gramas: inteiro(y.gramas, 0) };
    }).filter(function (p) { return p.gramas > 0; });
    Object.keys(objeto(x.pratos)).slice(0, 40).forEach(function (k) { var n = inteiro(x.pratos[k], 0); if (n > 0 && chaveValida(k)) v.pratos[k] = n; });
    return v;
  }

  function normalizar(bruto) {
    var b = objeto(bruto);
    var o = fichaVazia();
    var cr = objeto(b.criacao);
    o.criacao = {
      modo: ["guiada", "manual", "aleatoria"].indexOf(cr.modo) >= 0 ? cr.modo : "",
      concluida: bool(cr.concluida),
      sorteios: lista(cr.sorteios).slice(-40).map(function (s) { return objeto(s); }),
      equipamentoAplicado: bool(cr.equipamentoAplicado),
      nomeSugerido: texto(cr.nomeSugerido, 80),
      pendenciaDeNome: ["", "comida", "inverter"].indexOf(cr.pendenciaDeNome) >= 0 ? cr.pendenciaDeNome : "",
    };
    o.nomeDeFamilia = texto(b.nomeDeFamilia, 60);
    o.ocupacao = C().OCUPACOES[b.ocupacao] ? b.ocupacao : "";
    o.descritor = C().DESCRITORES[b.descritor] ? b.descritor : "";
    o.supimpa = C().CHAVES_ATRIBUTO.indexOf(b.supimpa) >= 0 ? b.supimpa : "";
    o.modEscolhido = C().CHAVES_ATRIBUTO.indexOf(b.modEscolhido) >= 0 ? b.modEscolhido : "";
    o.caracteristicas = lista(b.caracteristicas).slice(0, 12).map(function (c) {
      var y = objeto(c);
      return { id: chaveValida(y.id) ? y.id : novoId("ca"), chave: C().CARACTERISTICAS[y.chave] ? y.chave : "", quantidade: y.quantidade === undefined || y.quantidade === null ? null : inteiro(y.quantidade, 0) };
    }).filter(function (c) { return c.chave; });
    o.equipamentoInicial = b.equipamentoInicial === null || b.equipamentoInicial === undefined ? null : inteiro(b.equipamentoInicial, 0);
    var es = objeto(b.escolhas);
    o.escolhas = {
      armaFavorita: C().ARMAS[es.armaFavorita] ? es.armaFavorita : "",
      especieInimiga: texto(es.especieInimiga, 60),
      magias: lista(es.magias).filter(function (m) { return C().MAGIAS_DO_BRUXO.indexOf(m) >= 0; }).filter(function (m, i, t) { return t.indexOf(m) === i; }).slice(0, 3),
      grupoWar: C().WARGOBLIN.grupos[es.grupoWar] ? es.grupoWar : "",
      equipamentoWar: lista(es.equipamentoWar).filter(function (k) { return C().WARGOBLIN.equipamento.indexOf(k) >= 0; }).slice(0, 2),
      inicialCthulin: C().CTHULIN.inicial.indexOf(es.inicialCthulin) >= 0 ? es.inicialCthulin : "",
    };
    o.nivel = Math.max(1, Math.min(4, inteiro(b.nivel, 1, 1)));
    o.epicas = lista(b.epicas).map(function (e) { var y = objeto(e); return { ocupacao: C().OCUPACOES[y.ocupacao] ? y.ocupacao : "", nivel: Math.max(1, Math.min(4, inteiro(y.nivel, 1, 1))) }; }).filter(function (e) { return e.ocupacao; }).slice(0, 8);
    o.ajustes = lista(b.ajustes).slice(0, 60).map(function (a) {
      var y = objeto(a);
      return { id: chaveValida(y.id) ? y.id : novoId("aj"), atributo: C().CHAVES_ATRIBUTO.indexOf(y.atributo) >= 0 ? y.atributo : "combate", valor: inteiro(y.valor), motivo: texto(y.motivo, 200), pagina: y.pagina ? inteiro(y.pagina, 0) : null, dia: inteiro(y.dia, 0) };
    }).filter(function (a) { return a.valor; });
    o.ferimentos = inteiro(b.ferimentos, 0);
    o.itens = lista(b.itens).slice(0, 120).map(normalizarItem);
    o.efeitos = lista(b.efeitos).slice(0, 60).map(normalizarEfeito);
    var mc = objeto(b.marcas);
    o.marcas = { dia: Object.assign({}, objeto(mc.dia)), batalha: Object.assign({}, objeto(mc.batalha)), turno: Object.assign({}, objeto(mc.turno)) };
    var tp = objeto(b.tempo);
    o.tempo = { dia: inteiro(tp.dia, 1, 1), batalha: bool(tp.batalha), turno: inteiro(tp.turno, 0) };
    var st = objeto(b.estado);
    o.estado = {
      situacao: SITUACOES[st.situacao] ? st.situacao : "ativo",
      causa: texto(st.causa, 200),
      marcas: lista(st.marcas).filter(chaveValida).slice(0, 20),
      vozGoblin: ["", "ativa", "perdida"].indexOf(st.vozGoblin) >= 0 ? st.vozGoblin : "",
      pendenteEpico: bool(st.pendenteEpico),
    };
    var op = objeto(b.opcoes), ad = objeto(op.adaptacoes);
    o.opcoes = { vozGoblin: bool(op.vozGoblin), deuRuim: bool(op.deuRuim), niveisEpicos: bool(op.niveisEpicos), explosoesManuais: bool(op.explosoesManuais), adaptacoes: {} };
    Object.keys(C().ADAPTACOES).forEach(function (k) { o.opcoes.adaptacoes[k] = bool(ad[k]); });
    var a = objeto(b.adaptacoes);
    o.adaptacoes.cthulin = { medo: inteiro(objeto(a.cthulin).medo, 0) };
    var pk = objeto(a.pokepragas);
    o.adaptacoes.pokepragas = { pokepedras: inteiro(pk.pokepedras, 0), pragas: lista(pk.pragas).slice(0, 40).map(normalizarPraga), encontrada: pk.encontrada && typeof pk.encontrada === "object" ? normalizarPraga(pk.encontrada) : null };
    var gh = objeto(a.goblinHigh);
    o.adaptacoes.goblinHigh = { estudantes: lista(gh.estudantes).slice(0, 60).map(normalizarEstudante), popular: bool(gh.popular), humilhado: bool(gh.humilhado), briga: gh.briga && typeof gh.briga === "object" ? { estudante: texto(gh.briga.estudante, 60), amigosDele: inteiro(gh.briga.amigosDele, 0), dia: inteiro(gh.briga.dia, 0) } : null };
    o.adaptacoes.vale = normalizarVale(a.vale);
    var ln = objeto(b.linhagem);
    function ref(x) { return x && typeof x === "object" && chaveValida(x.id) ? { id: x.id, nome: texto(x.nome, 120) } : null; }
    o.linhagem = { anterior: ref(ln.anterior), seguinte: ref(ln.seguinte) };
    o.historico = lista(b.historico).slice(-LIMITE_HISTORICO).map(function (h) { var y = objeto(h); return { n: inteiro(y.n, 0), dia: inteiro(y.dia, 0), tipo: texto(y.tipo, 40), texto: texto(y.texto, 400) }; });
    o.operacoes = lista(b.operacoes).filter(function (x) { return typeof x === "string"; }).slice(-LIMITE_OPERACOES);
    o.seq = inteiro(b.seq, 0);
    return o;
  }

  function registrar(o, tipo, t) {
    o.seq++;
    o.historico.push({ n: o.seq, dia: o.tempo.dia, tipo: tipo, texto: String(t).slice(0, 400) });
    if (o.historico.length > LIMITE_HISTORICO) o.historico = o.historico.slice(-LIMITE_HISTORICO);
  }

  /* ---------------------------------------------------------------
     O QUE O GOBLIN É
     --------------------------------------------------------------- */

  function ativo(o) { return o.estado.situacao === "ativo" || o.estado.situacao === "mortoVivo"; }
  function motivoInativo(o) { return ativo(o) ? "" : "Este goblin está fora de jogo (" + SITUACOES[o.estado.situacao] + ")."; }

  function nomeDaOcupacao(o, chave) {
    var k = chave || o.ocupacao;
    var def = C().OCUPACOES[k];
    if (!def) return "";
    if (o.opcoes.adaptacoes.wargoblin && o.escolhas.grupoWar && k === o.ocupacao) return C().WARGOBLIN.grupos[o.escolhas.grupoWar].nome;
    if (o.opcoes.adaptacoes.cthulin && C().CTHULIN.nomes[k]) return C().CTHULIN.nomes[k];
    return def.nome;
  }

  /* As ocupações e o nível em cada uma (a principal + as épicas). */
  function ocupacoesDe(o) {
    var r = [];
    if (o.ocupacao) r.push({ ocupacao: o.ocupacao, nivel: o.nivel, epica: false });
    o.epicas.forEach(function (e) { r.push({ ocupacao: e.ocupacao, nivel: e.nivel, epica: true }); });
    return r;
  }

  function tecnicasDe(o) {
    var r = [];
    ocupacoesDe(o).forEach(function (oc) {
      var def = C().OCUPACOES[oc.ocupacao];
      def.tecnicas.forEach(function (t) {
        if (t.nivel <= oc.nivel) r.push(Object.assign({ ocupacao: oc.ocupacao, pagina: def.pagina }, t));
      });
    });
    return r;
  }
  function temTecnica(o, chave) { return tecnicasDe(o).some(function (t) { return t.chave === chave; }); }
  function usoDiario(o, chave) { return !!o.marcas.dia["tecnica:" + chave]; }

  /* A definição efetiva de um item: o catálogo (ou o item mágico e a
     arma ou proteção que ele é), mais o personalizado. */
  function defDoItem(i) {
    var cat = C().itemDoCatalogo(i.chave);
    var def = { arma: null, protecao: null, mods: null, magico: null, equip: null };
    if (cat && cat.categoria === "arma") def.arma = cat.def;
    if (cat && cat.categoria === "protecao") { def.protecao = cat.def; if (cat.def.mods) def.mods = cat.def.mods; }
    if (cat && cat.categoria === "equipamento") def.equip = cat.def;
    if (cat && cat.categoria === "magico") {
      def.magico = cat.def;
      if (cat.def.base && C().ARMAS[cat.def.base]) def.arma = C().ARMAS[cat.def.base];
      if (cat.def.base && C().PROTECOES[cat.def.base]) def.protecao = C().PROTECOES[cat.def.base];
      if (cat.def.protecao) def.protecao = Object.assign({ nome: cat.def.nome }, cat.def.protecao);
      if (cat.def.mods) def.mods = cat.def.mods;
    }
    var p = i.personalizado;
    if (p && p.arma) def.arma = Object.assign({ nome: i.nome, maos: 1, ataque: "corporal", bonus: 0, municao: null }, p.arma);
    if (p && p.protecao) def.protecao = Object.assign({ nome: i.nome, uso: "tronco", durabilidade: 0 }, p.protecao);
    return def;
  }

  function disponivel(i) { return !i.destruido && !i.consumido; }
  function vestido(i) { return disponivel(i) && i.equipado && !i.arremessado; }

  /* Os atributos em camadas. */
  function calcular(o) {
    var At = C().CHAVES_ATRIBUTO;
    var oc = C().OCUPACOES[o.ocupacao];
    var de = C().DESCRITORES[o.descritor];
    var atributos = {};
    At.forEach(function (a) {
      var comp = [{ fonte: "Base", valor: 2, camada: "base" }];
      if (oc && oc.mod && oc.mod[a]) comp.push({ fonte: oc.nome, valor: oc.mod[a], camada: "base" });
      if (oc && oc.modEscolha && o.modEscolhido === a) comp.push({ fonte: oc.nome + " (escolha)", valor: 1, camada: "base" });
      if (de && de.mod && de.mod[a]) comp.push({ fonte: de.nome, valor: de.mod[a], camada: "base" });
      if (de && de.escolha && o.supimpa === a) comp.push({ fonte: "Supimpa", valor: 1, camada: "base" });
      o.ajustes.forEach(function (aj) { if (aj.atributo === a) comp.push({ fonte: aj.motivo || "Ajuste", valor: aj.valor, camada: "permanente" }); });
      o.itens.forEach(function (i) {
        if (!vestido(i)) return;
        var d = defDoItem(i);
        if (d.mods && d.mods[a]) comp.push({ fonte: i.nome, valor: d.mods[a], camada: "equipamento" });
      });
      o.efeitos.forEach(function (e) { if (e.mods[a]) comp.push({ fonte: e.nome, valor: e.mods[a], camada: "temporario" }); });
      var soma = function (cam) { return comp.filter(function (c) { return !cam || cam.indexOf(c.camada) >= 0; }).reduce(function (s, c) { return s + c.valor; }, 0); };
      atributos[a] = {
        base: soma(["base"]), permanente: soma(["base", "permanente"]), equipamento: soma(["equipamento"]), temporario: soma(["temporario"]),
        valor: soma(null), composicao: comp,
      };
    });
    var vit = atributos.vitalidade.valor;
    var armas = o.itens.filter(function (i) { return vestido(i) && defDoItem(i).arma; });
    var protecoes = o.itens.filter(function (i) { return disponivel(i) && defDoItem(i).protecao; });
    return {
      atributos: atributos,
      vitalidade: vit,
      ferimentos: o.ferimentos,
      /* Morre com MAIS ferimentos que a Vitalidade (p. 5). */
      passouDoLimite: o.ferimentos > vit,
      noLimite: o.ferimentos === vit && vit >= 0,
      situacao: o.estado.situacao,
      armas: armas, protecoes: protecoes,
      tecnicas: tecnicasDe(o),
      magias: magiasDisponiveis(o),
      imuneFogo: imuneAFogo(o),
    };
  }

  function valor(o, atributo) { return calcular(o).atributos[atributo].valor; }

  function imuneAFogo(o) {
    if (temTecnica(o, "imunidade")) return true;
    return o.efeitos.some(function (e) { return e.imuneFogo; });
  }

  /* Morte, loucura: o estado só muda quando o número passa do limite
     NUMA AÇÃO — curar ou o efeito acabar depois não ressuscita. */
  function verificarFim(o, eventos, causa) {
    if (!ativo(o)) return;
    var c = calcular(o);
    if (c.passouDoLimite) {
      fim(o, "morto", causa || "Mais ferimentos que Vitalidade", eventos);
      if (o.itens.some(function (i) { return disponivel(i) && i.chave === "necronomicon"; })) eventos.push(evento("necronomicon", { texto: "Morreu com o Necronomicon: pode voltar como morto-vivo (a mesa decide)." }));
      return;
    }
    if (o.opcoes.adaptacoes.cthulin && o.adaptacoes.cthulin.medo > c.atributos.nocao.valor) fim(o, "louco", "Mais Medo que Noção", eventos);
  }

  function fim(o, situacao, causa, eventos) {
    if (!ativo(o) && o.estado.situacao !== "mortoVivo") return;
    o.estado.situacao = situacao;
    o.estado.causa = causa || "";
    registrar(o, "fim", SITUACOES[situacao] + (causa ? ": " + causa : ""));
    eventos.push(evento("fim", { situacao: situacao, causa: causa || "" }));
  }

  /* ---------------------------------------------------------------
     EFEITOS E MARCOS DE TEMPO
     --------------------------------------------------------------- */

  function adicionarEfeito(o, def, eventos) {
    var e = normalizarEfeito(Object.assign({ dia: o.tempo.dia }, def));
    /* O mesmo efeito de novo (pela chave e pelo item) renova em vez de
       empilhar. */
    o.efeitos = o.efeitos.filter(function (x) { return !(x.chave === e.chave && x.item === e.item && x.alvo === e.alvo); });
    o.efeitos.push(e);
    if (eventos) eventos.push(evento("efeito", { nome: e.nome, ate: e.ate }));
    return e;
  }

  function removerEfeito(o, id) {
    var e = o.efeitos.filter(function (x) { return x.id === id; })[0];
    if (!e) return falha("Efeito não encontrado.");
    o.efeitos = o.efeitos.filter(function (x) { return x.id !== id; });
    registrar(o, "efeito", e.nome + " encerrado");
    return ok([evento("efeitoEncerrado", { nome: e.nome })]);
  }

  function temEfeito(o, chave) { return o.efeitos.some(function (e) { return e.chave === chave; }); }

  /* Expira por marco: "proximoAtaque", "proximoTeste", "turno",
     "fimDaBatalha", "fimDoDia". */
  function expirar(o, marco, eventos) {
    var ficam = [];
    o.efeitos.forEach(function (e) {
      var sai = false;
      if (marco === "proximoAtaque" && e.ate === "proximoAtaque") sai = true;
      if ((marco === "proximoTeste" || marco === "proximoAtaque") && e.ate === "proximoTeste") sai = true;
      if (marco === "turno" && e.ate === "turnos") { e.turnos--; sai = e.turnos <= 0; }
      if (marco === "fimDaBatalha" && (e.ate === "fimDaBatalha" || e.ate === "turnos" || e.ate === "proximoAtaque")) sai = true;
      if (marco === "fimDoDia" && (e.ate === "fimDoDia" || e.ate === "fimDaBatalha" || e.ate === "turnos")) sai = true;
      if (sai) { if (eventos) eventos.push(evento("efeitoExpirou", { nome: e.nome })); }
      else ficam.push(e);
    });
    o.efeitos = ficam;
  }

  /* Os dados extras que efeitos dão à próxima rolagem (Poção Roxa). */
  function dadosDeEfeitos(o) {
    return o.efeitos.filter(function (e) { return e.dados && (e.ate === "proximoTeste" || e.ate === "proximoAtaque"); })
      .map(function (e) { return { fonte: e.nome, valor: e.dados }; });
  }

  function iniciarBatalha(o) {
    if (o.tempo.batalha) return falha("Já há uma batalha em curso.");
    o.tempo.batalha = true;
    o.tempo.turno = 1;
    o.marcas.batalha = {};
    o.marcas.turno = {};
    registrar(o, "tempo", "Começou uma batalha");
    return ok([evento("batalha", { inicio: true })]);
  }

  function fimDaBatalha(o) {
    var eventos = [evento("batalha", { inicio: false })];
    expirar(o, "fimDaBatalha", eventos);
    o.tempo.batalha = false;
    o.tempo.turno = 0;
    o.marcas.batalha = {};
    o.marcas.turno = {};
    o.itens.forEach(function (i) { i.precisaRecarregar = false; });
    registrar(o, "tempo", "Fim da batalha");
    return ok(eventos);
  }

  /* O fim do turno DESTE goblin: conta os efeitos por turno e o pavio
     das galinhas acesas. */
  function fimDoTurno(o) {
    var eventos = [evento("turno", { turno: o.tempo.turno })];
    expirar(o, "turno", eventos);
    o.marcas.turno = {};
    o.tempo.turno++;
    o.itens.forEach(function (i) {
      if (!i.aceso || !disponivel(i)) return;
      i.aceso.turnos--;
      if (i.aceso.turnos <= 0) {
        i.aceso = null;
        i.consumido = true;
        i.equipado = false;
        registrar(o, "item", i.nome + " explodiu");
        eventos.push(evento("explosaoDeArea", { item: i.nome, aneis: [{ alcance: "em volta", ferimentos: 3 }], pagina: 13 }));
      }
    });
    return ok(eventos);
  }

  /* A noite de descanso e o dia novo (p. 5): −1 ferimento (se
     descansou), usos diários de volta, efeitos "até o fim do dia" acabam.
     Peteca: quem brincou rola no fim do dia. Goblin High: cada Inimigo
     rola "Te pego na saída". */
  function novoDia(o, opcoes, rolador) {
    var op = opcoes || {};
    var eventos = [];
    expirar(o, "fimDoDia", eventos);
    var brincou = !!o.marcas.dia.peteca;
    o.marcas.dia = {};
    o.marcas.batalha = {};
    o.marcas.turno = {};
    if (o.tempo.batalha) { o.tempo.batalha = false; o.tempo.turno = 0; }
    o.tempo.dia++;
    if (op.descansou !== false && ativo(o) && o.ferimentos > 0) {
      o.ferimentos--;
      eventos.push(evento("cura", { valor: 1, motivo: "Noite de descanso" }));
    }
    if (brincou && rolador) {
      var f = D().quantidade("1d6", rolador);
      eventos.push(evento("peteca", { dados: f.dados, saiu: f.total === 6 }));
      if (f.total === 6) adicionarEfeito(o, { chave: "peteca", nome: "Peteca: Habilidade +1 hoje", ate: "fimDoDia", mods: { habilidade: 1 }, fonte: "Peteca", pagina: 27 }, eventos);
    }
    if (o.opcoes.adaptacoes.goblinHigh && rolador) {
      o.adaptacoes.goblinHigh.estudantes.forEach(function (es) {
        if (es.reacao !== "inimigo") return;
        var s = D().sortear({ id: "tePego", nome: "Te pego na saída", pagina: 39, dados: "1d6", entradas: C().GOBLIN_HIGH.tePego }, rolador);
        eventos.push(evento("tePego", { estudante: es.nome, dados: s.dados, resultado: s.resultado }));
        if (s.indice === 6) o.adaptacoes.goblinHigh.briga = { estudante: es.nome, amigosDele: D().quantidade("1d6-1", rolador).total, dia: o.tempo.dia };
      });
    }
    var vale = o.adaptacoes.vale;
    vale.hortas.forEach(function (h) { if (!h.colhida && h.colheitaEm && h.colheitaEm === o.tempo.dia) eventos.push(evento("hortaPronta", { planta: h.planta, m2: h.m2 })); });
    registrar(o, "tempo", "Dia " + o.tempo.dia + (op.descansou !== false ? " (descansou)" : ""));
    eventos.unshift(evento("novoDia", { dia: o.tempo.dia }));
    return ok(eventos);
  }

  /* ---------------------------------------------------------------
     FERIMENTOS, CURA, ATAQUES RECEBIDOS
     --------------------------------------------------------------- */

  /* Ferimentos que chegam ao goblin (já depois de esquiva e bloqueio):
     a Resistência (−1 de fogo ou tiro de arma de fogo) e a Imunidade
     (fogo) do Incendiário; o anel em chamas também protege do fogo. */
  function ferimentosQueChegam(o, n, tipo) {
    var t = tipo || {};
    var valorFinal = inteiro(n, 0);
    var notas = [];
    if (t.fogo && imuneAFogo(o)) { if (valorFinal) notas.push("Imune a fogo"); return { valor: 0, notas: notas }; }
    if ((t.fogo || t.armaDeFogo) && temTecnica(o, "resistencia") && valorFinal > 0) { valorFinal--; notas.push("Resistência: −1"); }
    if (t.queda && o.itens.some(function (i) { return disponivel(i) && i.chave === "guardaChuva"; }) && valorFinal > 0) { valorFinal--; notas.push("Guarda-chuva: −1"); }
    return { valor: valorFinal, notas: notas };
  }

  function sofrer(o, pedido) {
    var p = pedido || {};
    var eventos = [];
    var r = ferimentosQueChegam(o, p.ferimentos, p);
    o.ferimentos += r.valor;
    registrar(o, "ferimentos", "+" + r.valor + " ferimento(s)" + (p.fonte ? " (" + p.fonte + ")" : "") + (r.notas.length ? " — " + r.notas.join(", ") : ""));
    eventos.push(evento("ferimentos", { valor: r.valor, pedido: inteiro(p.ferimentos, 0), notas: r.notas, fonte: p.fonte || "" }));
    verificarFim(o, eventos, p.fonte ? "Ferimentos (" + p.fonte + ")" : "");
    return ok(eventos, { recebidos: r.valor });
  }

  function curar(o, quanto, fonte) {
    var antes = o.ferimentos;
    o.ferimentos = quanto === "todos" ? 0 : Math.max(0, o.ferimentos - inteiro(quanto, 0));
    var tirou = antes - o.ferimentos;
    registrar(o, "cura", "−" + tirou + " ferimento(s)" + (fonte ? " (" + fonte + ")" : ""));
    return ok([evento("cura", { valor: tirou, motivo: fonte || "" })]);
  }

  /* Esquiva (p. 15): teste de Combate; cada hit tira um hit do
     atacante; quem se esquiva não ataca no próximo turno. */
  function esquivar(o, pedido, rolador) {
    var p = pedido || {};
    if (!ativo(o)) return falha(motivoInativo(o));
    if (o.efeitos.some(function (e) { return e.semEsquiva; }) && !o.itens.some(function (i) { return vestido(i) && i.chave === "elmoCadeira"; })) return falha("Na Cacunda não dá para se esquivar (só com o Elmo-Cadeira).");
    if (o.efeitos.some(function (e) { return e.semAgir; })) return falha("Este goblin não pode agir agora.");
    var m = D().montarParada({ fonte: "Combate", valor: valor(o, "combate") }, dadosDeEfeitos(o).concat(lista(p.extras)), p.dificuldade);
    var r = D().rolar(opcoesDeRolagem(o, { parada: m.parada, composicao: m.composicao, tipo: "esquiva", rotulo: "Esquiva", seZero: p.seZero }), rolador);
    var eventos = [];
    if (r.lacuna) return ok([], { rolagem: r, lacuna: true });
    expirar(o, "proximoTeste", eventos);
    adicionarEfeito(o, { chave: "esquivou", nome: "Esquivou: não ataca no próximo turno", ate: "turnos", turnos: 1, semAtaque: true, fonte: "Esquivar", pagina: 15 }, eventos);
    posRolagem(o, r, eventos);
    registrar(o, "rolagem", "Esquiva: " + r.classificacao.hits + " hit(s)");
    return ok(eventos, { rolagem: r });
  }

  /* Um ataque recebido. pedido:
       acertos          hits do atacante
       distancia        ataque à distância (para a Sorte)
       fogo, armaDeFogo, etereo (ignora proteção), automatico (sem
                        esquiva: dano que não vem de rolagem)
       esquiva          hits da esquiva já rolada (esquivar())
       protecaoId       bloquear com esta proteção vestida
       sorteId          destruir este chapéu/penico (Sorte)
       paraParceiro     ferimentos passados ao parceiro de Cacunda
       fonte            quem atacou */
  function receberAtaque(o, pedido) {
    var p = pedido || {};
    var eventos = [];
    var notas = [];
    var hits = inteiro(p.acertos, 0);
    if (p.sorteId) {
      var s = o.itens.filter(function (i) { return i.id === p.sorteId; })[0];
      var ds = s ? defDoItem(s).protecao : null;
      if (!s || !vestido(s) || !ds || !ds.sorte || ds.uso !== "cabeca") return falha("A Sorte só vale com o item na cabeça.");
      if (!p.distancia) return falha("A Sorte só vale contra ataque à distância.");
      s.destruido = true; s.equipado = false;
      registrar(o, "item", s.nome + " destruído (Sorte): ignorou todo o dano de " + (p.fonte || "um ataque"));
      eventos.push(evento("sorte", { item: s.nome }));
      return ok(eventos, { recebidos: 0, notas: ["Sorte: " + s.nome + " destruído, dano ignorado"] });
    }
    if (p.esquiva !== undefined && p.esquiva !== null) {
      if (p.automatico) return falha("Dano automático não é esquivado.");
      var reduz = Math.min(hits, inteiro(p.esquiva, 0));
      hits -= reduz;
      if (reduz) notas.push("Esquiva: −" + reduz);
    }
    if (p.protecaoId && hits > 0) {
      if (p.etereo) return falha("Ataque etéreo ignora a proteção: não dá para bloquear.");
      var pr = o.itens.filter(function (i) { return i.id === p.protecaoId; })[0];
      if (!pr || !vestido(pr) || !defDoItem(pr).protecao) return falha("Bloqueia só com uma proteção vestida.");
      if (!pr.durabilidade || pr.durabilidade.atual <= 0) return falha(pr.nome + " está com Durabilidade zero e não bloqueia.");
      var abs = Math.min(hits, pr.durabilidade.atual);
      pr.durabilidade.atual -= abs;
      hits -= abs;
      notas.push(pr.nome + " absorveu " + abs + " (Durabilidade " + pr.durabilidade.atual + "/" + pr.durabilidade.original + ")");
      eventos.push(evento("bloqueio", { item: pr.nome, absorveu: abs, durabilidade: pr.durabilidade.atual }));
    }
    if (p.paraParceiro) {
      var passa = Math.min(hits, inteiro(p.paraParceiro, 0));
      hits -= passa;
      if (passa) notas.push("Cacunda: " + passa + " para o parceiro");
    }
    var r = ferimentosQueChegam(o, hits, p);
    o.ferimentos += r.valor;
    notas = notas.concat(r.notas);
    registrar(o, "ataque", "Recebeu " + inteiro(p.acertos, 0) + " hit(s)" + (p.fonte ? " de " + p.fonte : "") + " → " + r.valor + " ferimento(s)" + (notas.length ? " (" + notas.join("; ") + ")" : ""));
    eventos.push(evento("ferimentos", { valor: r.valor, pedido: inteiro(p.acertos, 0), notas: notas, fonte: p.fonte || "" }));
    verificarFim(o, eventos, p.fonte ? "Atacado por " + p.fonte : "");
    return ok(eventos, { recebidos: r.valor, notas: notas });
  }

  /* ---------------------------------------------------------------
     ROLAGENS DO GOBLIN
     --------------------------------------------------------------- */

  function vozAtiva(o) { return o.opcoes.vozGoblin && o.estado.vozGoblin === "ativa"; }

  function opcoesDeRolagem(o, x) {
    return Object.assign({ podeExplodirGoblin: true, vozGoblin: vozAtiva(o), explosoes: o.opcoes.explosoesManuais ? "manual" : "auto" }, x);
  }

  /* Depois de toda rolagem do goblin: explosão de goblin e o evento
     sobrenatural do Cthulin (3 hits em qualquer teste). */
  function posRolagem(o, r, eventos, rolador) {
    var c = r.classificacao;
    if (c.goblinExplode) fim(o, "explodiu", "Todos os dados caíram em 1", eventos);
    if (c.vozSalvou) eventos.push(evento("vozSalvou", {}));
    if (o.opcoes.adaptacoes.cthulin && rolador && c.hits >= 3 && ativo(o)) {
      var s = D().sortear({ id: "eventoSobrenatural", nome: "Evento Sobrenatural", pagina: 32, dados: "1d6", entradas: C().CTHULIN.evento }, rolador);
      eventos.push(evento("sobrenatural", { dados: s.dados, resultado: s.resultado }));
      registrar(o, "cthulin", "Evento sobrenatural: " + s.resultado.texto);
      if (s.resultado.medo) receberMedoInterno(o, s.resultado.medo, "Tentáculos", eventos);
    }
  }

  /* Rolagem com explosões MANUAIS: cada uma, e o fim. A ficha não muda
     até concluir (o goblin só explode com a rolagem fechada). */
  function concluirRolagem(o, r, eventos, rolador) { if (r.concluida) posRolagem(o, r, eventos, rolador); }

  /* A pessoa rolou mais um dado de explosão ("explodir") ou parou
     ("parar"). Fechada a rolagem, valem as consequências. */
  function continuarRolagem(o, r, acao, rolador) {
    if (!r || r.concluida) return falha("A rolagem já terminou.");
    var x = acao === "parar" ? D().recusarExplosoes(r) : D().explodir(r, rolador);
    if (x.ok === false) return falha(x.motivo);
    var eventos = [];
    concluirRolagem(o, r, eventos, rolador);
    return ok(eventos, { rolagem: r });
  }

  /* Teste (p. 14). pedido: { atributo, dificuldade, rotulo, necessarios,
     escalar (Corda e Gancho), extras: [{fonte, valor}], seZero,
     interpretacao: "investigacao" } */
  function montarTeste(o, pedido) {
    var p = pedido || {};
    var at = C().CHAVES_ATRIBUTO.indexOf(p.atributo) >= 0 ? p.atributo : "habilidade";
    var nome = C().ATRIBUTOS.filter(function (a) { return a.chave === at; })[0].nome;
    var parcelas = dadosDeEfeitos(o).concat(lista(p.extras));
    if (p.escalar && at === "habilidade" && o.itens.some(function (i) { return disponivel(i) && i.chave === "cordaEGancho"; })) parcelas.push({ fonte: "Corda e Gancho", valor: 2 });
    var m = D().montarParada({ fonte: nome, valor: valor(o, at) }, parcelas, p.dificuldade);
    return { atributo: at, nomeAtributo: nome, parada: m.parada, composicao: m.composicao };
  }

  function testar(o, pedido, rolador) {
    var p = pedido || {};
    if (!ativo(o)) return falha(motivoInativo(o));
    var m = montarTeste(o, p);
    var r = D().rolar(opcoesDeRolagem(o, { parada: m.parada, composicao: m.composicao, tipo: "teste", rotulo: p.rotulo || "Teste de " + m.nomeAtributo, necessarios: p.necessarios, seZero: p.seZero }), rolador);
    var eventos = [];
    if (r.lacuna) return ok([], { rolagem: r, lacuna: true });
    expirar(o, "proximoTeste", eventos);
    concluirRolagem(o, r, eventos, rolador);
    registrar(o, "rolagem", r.rotulo + ": " + r.classificacao.hits + " hit(s) — " + (r.classificacao.rotuloNecessarios || r.classificacao.rotulo));
    var extra = { rolagem: r, atributo: m.atributo };
    if (p.interpretacao === "investigacao") extra.investigacao = C().CTHULIN.investigacao[r.classificacao.nivel];
    /* "Mas deu ruim…" fica oferecido (a regra diz "se estiver sem
       ideia"): a tela mostra o botão. */
    extra.podeDeuRuim = o.opcoes.deuRuim && m.atributo === "habilidade" && r.classificacao.hits === 1;
    return ok(eventos, extra);
  }

  function deuRuim(o, rolador) {
    if (!o.opcoes.deuRuim) return falha("A regra opcional “Mas deu ruim…” está desligada.");
    var s = D().sortear({ id: "deuRuim", nome: "Mas deu ruim…", pagina: 16, dados: "1d6", entradas: C().DEU_RUIM_D6 }, rolador);
    registrar(o, "sorteio", "Mas deu ruim…: " + s.resultado);
    return ok([evento("sorteio", { nome: s.nome, resultado: s.resultado, dados: s.dados })], { sorteio: s });
  }

  /* ---------------------------------------------------------------
     ATAQUE
     --------------------------------------------------------------- */

  /* pedido:
       armaId        "" = desarmado (só Combate)
       modo          "corporal" | "distancia" | "arremesso"
       dificuldade
       alvo          { nome, especie, goblin, humano, praga } — o que
                     liga Inimigo, Adaga Matadora, Martelo, Matador de
                     Pragas, Pendurar
       furtivo       o alvo não sabe onde você está (Ataque Furtivo)
       brutal        Ataque Brutal · tiroCerteiro  Tiro Certeiro
       duasArmas     −1 dado (manobra)
       cacunda       você é o de cima (+1 dado)
       giratorio     o ataque extra do Ataque Giratório
       extras        [{ fonte, valor }] */
  function montarAtaque(o, pedido) {
    var p = pedido || {};
    var avisos = [];
    if (!ativo(o)) return { ok: false, motivo: motivoInativo(o) };
    if (o.efeitos.some(function (e) { return e.semAgir; })) return { ok: false, motivo: "Este goblin não pode agir neste turno." };
    var sem = o.efeitos.filter(function (e) { return e.semAtaque; })[0];
    if (sem && !p.giratorio) return { ok: false, motivo: sem.nome + "." };
    var arma = null, def = null;
    if (p.armaId) {
      arma = o.itens.filter(function (i) { return i.id === p.armaId; })[0];
      if (!arma) return { ok: false, motivo: "Arma não encontrada." };
      if (!disponivel(arma)) return { ok: false, motivo: arma.nome + " não existe mais (destruída ou gasta)." };
      if (arma.arremessado) return { ok: false, motivo: arma.nome + " foi arremessada: pegue de volta primeiro." };
      def = defDoItem(arma).arma;
      if (!def) return { ok: false, motivo: arma.nome + " não é uma arma." };
      if (!arma.equipado) return { ok: false, motivo: "Empunhe " + arma.nome + " antes de atacar." };
    }
    var modo = p.modo || (def ? def.ataque : "corporal");
    if (def) {
      if (modo === "arremesso" && !def.arremesso) return { ok: false, motivo: arma.nome + " não é de arremesso." };
      if (modo === "corporal" && def.ataque !== "corporal") return { ok: false, motivo: arma.nome + " é de distância." };
      if (modo === "distancia" && def.ataque !== "distancia") return { ok: false, motivo: arma.nome + " é corporal (arremessar, se der)." };
      if (arma.municao && arma.municao.atual <= 0) return { ok: false, motivo: arma.nome + " está sem munição." };
      if (arma.precisaRecarregar) return { ok: false, motivo: arma.nome + " precisa ser recarregada (gasta um turno)." };
    }
    var distancia = modo !== "corporal";
    if (p.brutal) {
      if (!temTecnica(o, "ataqueBrutal")) return { ok: false, motivo: "Sem a técnica Ataque Brutal." };
      if (usoDiario(o, "ataqueBrutal")) return { ok: false, motivo: "Ataque Brutal já foi usado hoje." };
      if (distancia) return { ok: false, motivo: "Ataque Brutal é um ataque corporal." };
    }
    if (p.tiroCerteiro) {
      if (!temTecnica(o, "tiroCerteiro")) return { ok: false, motivo: "Sem a técnica Tiro Certeiro." };
      if (usoDiario(o, "tiroCerteiro")) return { ok: false, motivo: "Tiro Certeiro já foi usado hoje." };
      if (!distancia) return { ok: false, motivo: "Tiro Certeiro é um ataque à distância." };
    }
    var alvo = objeto(p.alvo);
    var parcelas = [];
    if (def && def.bonus) parcelas.push({ fonte: arma.nome, valor: def.bonus });
    var chaveBase = arma ? (C().ITENS_MAGICOS[arma.chave] && C().ITENS_MAGICOS[arma.chave].base) || arma.chave : "";
    if (arma && temTecnica(o, "mestreDeArmas") && o.escolhas.armaFavorita && chaveBase === o.escolhas.armaFavorita) parcelas.push({ fonte: "Mestre de Armas", valor: 1 });
    if (temTecnica(o, "inimigo") && o.escolhas.especieInimiga && alvo.especie && normalizarTexto(alvo.especie) === normalizarTexto(o.escolhas.especieInimiga)) parcelas.push({ fonte: "Inimigo (" + o.escolhas.especieInimiga + ")", valor: 1 });
    var escondido = temEfeito(o, "escondido");
    if ((p.furtivo || escondido) && temTecnica(o, "ataqueFurtivo")) parcelas.push({ fonte: "Ataque Furtivo", valor: 2 });
    if (arma && C().ITENS_MAGICOS[arma.chave] && C().ITENS_MAGICOS[arma.chave].contraGoblin && alvo.goblin) parcelas.push({ fonte: arma.nome + " (alvo goblin)", valor: C().ITENS_MAGICOS[arma.chave].contraGoblin });
    if (alvo.praga && temTecnica(o, "matadorDePragas")) parcelas.push({ fonte: "Matador de Pragas", valor: 1 });
    var pendurado = o.efeitos.filter(function (e) { return e.chave === "pendurado"; })[0];
    if (pendurado && (!pendurado.alvo || !alvo.nome || normalizarTexto(pendurado.alvo) === normalizarTexto(alvo.nome))) parcelas.push({ fonte: "Pendurado no inimigo", valor: 1 });
    if (p.cacunda || temEfeito(o, "cacundaEmCima")) parcelas.push({ fonte: "Cacunda (em cima)", valor: 1 });
    if (p.duasArmas) parcelas.push({ fonte: "Duas armas", valor: -1 });
    o.efeitos.forEach(function (e) { if (e.ataque) parcelas.push({ fonte: e.nome, valor: e.ataque }); });
    parcelas = parcelas.concat(dadosDeEfeitos(o)).concat(lista(p.extras));
    var dobro = p.brutal ? "Ataque Brutal (dobro)" : p.tiroCerteiro ? "Tiro Certeiro (dobro)" : "";
    var m = D().montarParada({ fonte: "Combate", valor: valor(o, "combate") }, parcelas, p.dificuldade, { dobrar: dobro });
    if (o.efeitos.some(function (e) { return e.chave === "bracoCongelado"; }) && def && def.maos === 2) avisos.push("Um braço está congelado: arma de duas mãos?");
    return {
      ok: true, parada: m.parada, composicao: m.composicao, arma: arma, def: def, modo: modo, distancia: distancia, avisos: avisos,
      fogo: !!(def && def.ataqueDeFogo), armaDeFogo: !!(def && def.fogo && !p.arremessar),
      automatico: arma && C().ITENS_MAGICOS[arma.chave] && C().ITENS_MAGICOS[arma.chave].automaticoNaoHumano && alvo.humano === false ? C().ITENS_MAGICOS[arma.chave].automaticoNaoHumano : 0,
    };
  }

  function atacar(o, pedido, rolador) {
    var p = pedido || {};
    var m = montarAtaque(o, p);
    if (!m.ok) return falha(m.motivo);
    var r = D().rolar(opcoesDeRolagem(o, { parada: m.parada, composicao: m.composicao, tipo: "ataque", rotulo: (p.brutal ? "Ataque Brutal" : p.tiroCerteiro ? "Tiro Certeiro" : p.giratorio ? "Ataque Giratório" : "Ataque") + (m.arma ? " · " + m.arma.nome : " desarmado") + (p.alvo && p.alvo.nome ? " → " + p.alvo.nome : ""), seZero: p.seZero }), rolador);
    var eventos = [];
    if (r.lacuna) return ok([], { rolagem: r, lacuna: true });
    var arma = m.arma;
    if (arma) {
      if (arma.municao) arma.municao.atual = Math.max(0, arma.municao.atual - 1);
      if (m.def.recarga) arma.precisaRecarregar = true;
      if (m.modo === "arremesso") { arma.arremessado = true; arma.equipado = false; }
    }
    if (p.brutal) o.marcas.dia["tecnica:ataqueBrutal"] = true;
    if (p.tiroCerteiro) o.marcas.dia["tecnica:tiroCerteiro"] = true;
    expirar(o, "proximoAtaque", eventos);
    /* Atacar faz barulho: o Esconder acaba. */
    if (temEfeito(o, "escondido")) { o.efeitos = o.efeitos.filter(function (e) { return e.chave !== "escondido"; }); eventos.push(evento("efeitoExpirou", { nome: "Escondido" })); }
    concluirRolagem(o, r, eventos, rolador);
    var ferimentos = r.classificacao.hits + (m.automatico || 0);
    var notas = [];
    if (m.automatico) notas.push("+" + m.automatico + " automático (alvo não humano)");
    if (arma && arma.municao) notas.push("Munição: " + arma.municao.atual + "/" + arma.municao.max);
    if (arma && arma.precisaRecarregar) notas.push("Precisa recarregar (um turno)");
    if (m.modo === "arremesso") notas.push(arma.nome + " ficou onde caiu");
    registrar(o, "ataque", r.rotulo + ": " + ferimentos + " ferimento(s)");
    return ok(eventos, {
      rolagem: r, ferimentos: ferimentos, notas: notas, fogo: m.fogo, armaDeFogo: m.armaDeFogo, distancia: m.distancia,
      giratorio: !p.giratorio && m.modo === "corporal" && !!arma && ferimentos > 0 && temTecnica(o, "ataqueGiratorio"),
    });
  }

  function recarregar(o, armaId) {
    var a = o.itens.filter(function (i) { return i.id === armaId; })[0];
    if (!a || !disponivel(a)) return falha("Arma não encontrada.");
    if (!a.precisaRecarregar) return falha(a.nome + " não precisa recarregar.");
    if (a.municao && a.municao.atual <= 0) return falha(a.nome + " está sem munição: recarregar não adianta.");
    a.precisaRecarregar = false;
    o.marcas.turno.recarregou = true;
    registrar(o, "item", "Recarregou " + a.nome + " (gastou o turno)");
    return ok([evento("recarga", { item: a.nome })]);
  }

  function reabastecer(o, armaId, quanto) {
    var a = o.itens.filter(function (i) { return i.id === armaId; })[0];
    if (!a || !disponivel(a) || !a.municao) return falha("Esta arma não usa munição.");
    var antes = a.municao.atual;
    a.municao.atual = quanto === undefined || quanto === null ? a.municao.max : Math.max(0, Math.min(a.municao.max, a.municao.atual + inteiro(quanto, 0)));
    registrar(o, "item", a.nome + ": munição " + antes + " → " + a.municao.atual);
    return ok([evento("municao", { item: a.nome, atual: a.municao.atual })]);
  }

  function pegarDeVolta(o, id) {
    var a = o.itens.filter(function (i) { return i.id === id; })[0];
    if (!a || !a.arremessado) return falha("Nada a pegar de volta.");
    a.arremessado = false;
    registrar(o, "item", "Pegou " + a.nome + " de volta");
    return ok();
  }

  /* ---------------------------------------------------------------
     MAGIA
     --------------------------------------------------------------- */

  /* As magias que este goblin conjura e de onde: { magia, fonte, item }. */
  function magiasDisponiveis(o) {
    var r = [];
    if (temTecnica(o, "magias")) o.escolhas.magias.forEach(function (m) { r.push({ magia: m, fonte: "tecnica", rotulo: "Bruxo" }); });
    o.itens.forEach(function (i) {
      if (!disponivel(i)) return;
      if (i.chave === "necronomicon") r.push({ magia: "morte", fonte: i.id, rotulo: "Necronomicon" });
      if (i.chave === "livroEstranho" && i.magico.lido && i.magico.magia) r.push({ magia: i.magico.magia, fonte: i.id, rotulo: i.nome });
      if (i.chave === "livroEspecial" && i.magico.magia && o.opcoes.adaptacoes.cthulin) r.push({ magia: i.magico.magia, fonte: i.id, rotulo: i.nome });
    });
    return r;
  }

  /* pedido: { magia, fonte, condutorId, ciranda (amigos na roda),
     dificuldade, implacavel (0..3: escolhe sem rolar), horror,
     extras, seZero } */
  function montarConjuracao(o, pedido) {
    var p = pedido || {};
    var def = C().MAGIAS[p.magia];
    if (!def) return { ok: false, motivo: "Magia desconhecida." };
    if (!ativo(o)) return { ok: false, motivo: motivoInativo(o) };
    if (o.efeitos.some(function (e) { return e.semAgir; })) return { ok: false, motivo: "Este goblin não pode agir neste turno." };
    var fonte = magiasDisponiveis(o).filter(function (x) { return x.magia === p.magia && (!p.fonte || x.fonte === p.fonte); })[0];
    if (!fonte) return { ok: false, motivo: "Só o Bruxo conjura (ou quem tem o livro certo)." };
    var parcelas = [];
    if (p.condutorId) {
      var c = o.itens.filter(function (i) { return i.id === p.condutorId; })[0];
      var dc = c ? defDoItem(c).arma : null;
      if (!c || !vestido(c) || !dc || !(dc.condutor || dc.varinha)) return { ok: false, motivo: "Escolha um Condutor Mágico empunhado." };
      if (temTecnica(o, "condutorMagico")) parcelas.push({ fonte: "Condutor Mágico (" + c.nome + ")", valor: 1 });
    }
    var arcano = o.itens.filter(function (i) { var d = vestido(i) ? defDoItem(i).protecao : null; return d && d.arcano; })[0];
    if (arcano) parcelas.push({ fonte: "Arcano (" + arcano.nome + ")", valor: 1 });
    var roda = inteiro(p.ciranda, 0);
    if (roda >= 2) parcelas.push({ fonte: "Ciranda Mágica (" + roda + ")", valor: roda });
    if (p.magia === "invocacao" && p.horror && C().INIMIGOS[p.horror] && C().INIMIGOS[p.horror].invocacao) parcelas.push({ fonte: "Invocar " + C().INIMIGOS[p.horror].nome, valor: C().INIMIGOS[p.horror].invocacao });
    parcelas = parcelas.concat(dadosDeEfeitos(o)).concat(lista(p.extras));
    var m = D().montarParada({ fonte: "Noção", valor: valor(o, "nocao") }, parcelas, p.dificuldade);
    return { ok: true, def: def, fonte: fonte, parada: m.parada, composicao: m.composicao };
  }

  function conjurar(o, pedido, rolador) {
    var p = pedido || {};
    var m = montarConjuracao(o, p);
    if (!m.ok) return falha(m.motivo);
    var eventos = [];
    var r, resultado;
    if (p.implacavel !== undefined && p.implacavel !== null && p.implacavel !== "") {
      if (!temTecnica(o, "implacavel")) return falha("Sem a técnica Implacável.");
      if (usoDiario(o, "implacavel")) return falha("Implacável já foi usado hoje.");
      resultado = Math.max(0, Math.min(3, inteiro(p.implacavel, 0)));
      o.marcas.dia["tecnica:implacavel"] = true;
      r = null;
    } else {
      r = D().rolar(opcoesDeRolagem(o, { parada: m.parada, composicao: m.composicao, tipo: "conjurar", rotulo: "Magia: " + m.def.nome, seZero: p.seZero }), rolador);
      if (r.lacuna) return ok([], { rolagem: r, lacuna: true });
      expirar(o, "proximoTeste", eventos);
      concluirRolagem(o, r, eventos, rolador);
      resultado = r.classificacao.resultado;
    }
    var res = m.def.resultados[resultado];
    var aplicado = [];
    if (ativo(o) && res.proprio) {
      var pr = res.proprio;
      if (pr.ferimentos) { var s = sofrer(o, { ferimentos: pr.ferimentos, fogo: pr.fogo, fonte: m.def.nome }); eventos = eventos.concat(s.eventos); aplicado.push(s.recebidos + " ferimento(s) em você"); }
      if (pr.efeito) { adicionarEfeito(o, Object.assign({ fonte: m.def.nome, pagina: m.def.pagina }, pr.efeito), eventos); aplicado.push(pr.efeito.nome); }
      if (pr.curar) { eventos = eventos.concat(curar(o, pr.curar, m.def.nome).eventos); aplicado.push("Seus ferimentos foram removidos"); }
      if (pr.permanente) {
        Object.keys(pr.permanente).forEach(function (a) { o.ajustes.push({ id: novoId("aj"), atributo: a, valor: pr.permanente[a], motivo: "Magia " + m.def.nome + " (0 hits)", pagina: m.def.pagina, dia: o.tempo.dia }); });
        aplicado.push("Permanente: " + Object.keys(pr.permanente).map(function (a) { return C().ATRIBUTOS.filter(function (x) { return x.chave === a; })[0].nome + " " + pr.permanente[a]; }).join(", "));
        verificarFim(o, eventos, "Magia " + m.def.nome);
      }
      if (pr.marca && o.estado.marcas.indexOf(pr.marca) < 0) o.estado.marcas.push(pr.marca);
      if (pr.medo) { receberMedoInterno(o, pr.medo, m.def.nome, eventos); aplicado.push("+" + pr.medo + " Medo"); }
      verificarFim(o, eventos, "Magia " + m.def.nome);
    }
    registrar(o, "magia", m.def.nome + ": resultado " + (resultado === 3 ? "3+" : resultado) + (r ? " (" + r.classificacao.hits + " hit(s))" : " (Implacável)") + " — " + res.texto);
    eventos.push(evento("magia", { magia: p.magia, resultado: resultado }));
    return ok(eventos, { rolagem: r, resultado: resultado, efeito: copiar(res), aplicado: aplicado, magia: p.magia, nome: m.def.nome, pagina: m.def.pagina });
  }

  /* ---------------------------------------------------------------
     TÉCNICAS DE USO DECLARADO
     --------------------------------------------------------------- */

  function usarTecnica(o, chave, opcoes, rolador) {
    var op = opcoes || {};
    if (!ativo(o)) return falha(motivoInativo(o));
    if (!temTecnica(o, chave)) return falha("Este goblin não tem essa técnica.");
    var t = C().tecnica(chave);
    if (t.uso === "dia" && usoDiario(o, chave)) return falha(t.nome + " já foi usada hoje.");
    var eventos = [];
    if (chave === "gritoDeGuerra") {
      var tr = testar(o, { atributo: "nocao", rotulo: "Grito de Guerra", dificuldade: op.dificuldade, seZero: op.seZero }, rolador);
      if (!tr.ok || tr.lacuna) return tr;
      o.marcas.dia["tecnica:gritoDeGuerra"] = true;
      var deu = tr.rolagem.classificacao.hits >= 1;
      registrar(o, "tecnica", "Grito de Guerra: " + (deu ? "aliados com Combate +1 até o fim da batalha" : "ninguém se animou"));
      return ok(tr.eventos.concat([evento("tecnica", { chave: chave, sucesso: deu })]), {
        rolagem: tr.rolagem,
        paraAliados: deu ? { chave: "gritoDeGuerra", nome: "Grito de Guerra: Combate +1", ate: "fimDaBatalha", mods: { combate: 1 }, fonte: "Grito de Guerra", pagina: 9 } : null,
      });
    }
    if (chave === "humilhacao") {
      o.marcas.dia["tecnica:humilhacao"] = true;
      registrar(o, "tecnica", "Humilhação" + (op.alvo ? " em " + op.alvo : ""));
      return ok([evento("tecnica", { chave: chave })], { paraAliado: { curar: "todos", fonte: "Humilhação" } });
    }
    if (chave === "esconder") {
      o.marcas.dia["tecnica:esconder"] = true;
      adicionarEfeito(o, { chave: "escondido", nome: "Escondido (até se mexer ou fazer barulho)", ate: "manual", fonte: "Esconder", pagina: 8 }, eventos);
      registrar(o, "tecnica", "Escondeu-se sem teste");
      return ok(eventos);
    }
    if (chave === "delirio") {
      if (!op.confirmado) return falha("Delírio só vale se você explodiu ou queimou completamente uma casa ou algo maior.");
      var c = curar(o, "todos", "Delírio");
      registrar(o, "tecnica", "Delírio: " + (op.oque || "uma casa ou algo maior") + " foi pelos ares");
      return ok(c.eventos.concat([evento("tecnica", { chave: chave })]));
    }
    if (chave === "roubar") {
      var rr = testar(o, { atributo: "habilidade", rotulo: "Roubar" + (op.alvo ? " de " + op.alvo : ""), dificuldade: op.dificuldade, necessarios: 1, seZero: op.seZero }, rolador);
      return rr;
    }
    if (chave === "rastrear") {
      registrar(o, "tecnica", "Rastrear" + (op.alvo ? ": " + op.alvo : ""));
      return ok([evento("tecnica", { chave: chave })]);
    }
    return falha("Esta técnica se usa na ação dela (ataque, magia) ou é sempre ativa.");
  }

  /* Efeito que um aliado manda (Grito de Guerra, Gelo, Planta…). */
  function receberEfeito(o, def) {
    var eventos = [];
    adicionarEfeito(o, def, eventos);
    registrar(o, "efeito", (def.nome || "Efeito") + (def.fonte ? " (de " + def.fonte + ")" : ""));
    return ok(eventos);
  }

  /* ---------------------------------------------------------------
     PROGRESSÃO (p. 5 e 16)
     --------------------------------------------------------------- */

  function ocupacaoEmProgresso(o) {
    if (o.epicas.length) return o.epicas[o.epicas.length - 1];
    return null;
  }

  function derrotouOponente(o, opcoes, rolador) {
    var op = opcoes || {};
    if (!ativo(o)) return falha(motivoInativo(o));
    if (o.estado.pendenteEpico) return falha("Escolha a ocupação épica antes (ou recuse).");
    var ep = ocupacaoEmProgresso(o);
    var nivelAtual = ep ? ep.nivel : o.nivel;
    if (nivelAtual >= 4) return falha("Já está no nível 4 desta ocupação.");
    var f = D().quantidade("1d6", rolador);
    var eventos = [evento("progressao", { dados: f.dados, subiu: f.total === 6, oponente: op.oponente || "" })];
    registrar(o, "nivel", "Derrotou " + (op.oponente || "um oponente") + ": rolou " + f.total + (f.total === 6 ? " — subiu de nível!" : ""));
    if (f.total !== 6) return ok(eventos, { dados: f.dados, subiu: false });
    if (ep) ep.nivel++; else o.nivel++;
    var novo = ep ? ep.nivel : o.nivel;
    var ocup = ep ? ep.ocupacao : o.ocupacao;
    var tec = C().OCUPACOES[ocup].tecnicas.filter(function (t) { return t.nivel === novo; })[0];
    eventos.push(evento("nivel", { nivel: novo, ocupacao: ocup, tecnica: tec ? tec.nome : "" }));
    registrar(o, "nivel", "Nível " + novo + " de " + nomeDaOcupacao(o, ocup) + (tec ? ": " + tec.nome : ""));
    if (novo >= 4) {
      if (o.opcoes.niveisEpicos && ocupacoesLivres(o).length) {
        o.estado.pendenteEpico = true;
        eventos.push(evento("epicoPendente", {}));
      } else {
        fim(o, "explodiuDeAlegria", "Chegou ao nível 4", eventos);
      }
    }
    return ok(eventos, { dados: f.dados, subiu: true, nivel: novo });
  }

  function ocupacoesLivres(o) {
    var usadas = ocupacoesDe(o).map(function (x) { return x.ocupacao; });
    return Object.keys(C().OCUPACOES).filter(function (k) {
      var d = C().OCUPACOES[k];
      if (usadas.indexOf(k) >= 0) return false;
      return !d.adaptacao || o.opcoes.adaptacoes[d.adaptacao];
    });
  }

  /* Níveis Épicos: "se os outros jogadores realmente acreditarem" —
     `acreditaram: false` aplica a regra básica (explode de alegria). */
  function escolherOcupacaoEpica(o, chave, acreditaram) {
    if (!o.estado.pendenteEpico) return falha("Não há nível épico a escolher.");
    var eventos = [];
    o.estado.pendenteEpico = false;
    if (acreditaram === false) { fim(o, "explodiuDeAlegria", "Chegou ao nível 4 (ninguém acreditou)", eventos); return ok(eventos); }
    if (ocupacoesLivres(o).indexOf(chave) < 0) { o.estado.pendenteEpico = true; return falha("Escolha outra ocupação."); }
    o.epicas.push({ ocupacao: chave, nivel: 1 });
    registrar(o, "nivel", "Nível épico: começou " + nomeDaOcupacao(o, chave) + " no nível 1");
    eventos.push(evento("epico", { ocupacao: chave }));
    return ok(eventos);
  }

  /* ---------------------------------------------------------------
     ITENS
     --------------------------------------------------------------- */

  /* Novo item a partir do catálogo (com munição e durabilidade
     cheias) ou personalizado ({ nome, categoria, personalizado }). */
  function novoItem(chave, extra) {
    var x = extra || {};
    var cat = C().itemDoCatalogo(chave);
    var i = normalizarItem({ chave: cat ? chave : "", categoria: cat ? cat.categoria : (x.categoria || "outro"), nome: x.nome || (cat ? cat.def.nome : "Item"), nota: x.nota || "", personalizado: x.personalizado || null, magico: x.magico || {} });
    var d = defDoItem(i);
    if (d.arma && d.arma.municao) i.municao = { atual: d.arma.municao, max: d.arma.municao };
    if (d.protecao) {
      var dur = d.protecao.durabilidade || 0;
      if (cat && cat.def.protecao && cat.def.protecao.durabilidadePar && x.par !== false) { dur = cat.def.protecao.durabilidadePar; i.magico.par = true; }
      i.durabilidade = { atual: dur, original: dur };
    }
    return i;
  }

  function adicionarItem(o, chave, extra, rolador) {
    var i = novoItem(chave, extra);
    var eventos = [];
    /* Poção: a cor é rolada quando se acha (p. 27). */
    if (i.chave === "pocao" && !i.magico.cor && rolador) {
      var s = D().sortear({ id: "pocao", nome: "Cor da Poção", pagina: 27, dados: "1d6", entradas: C().POCAO_D6 }, rolador);
      i.magico.cor = s.indice;
      i.nome = "Poção " + s.resultado.cor;
      eventos.push(evento("sorteio", { nome: s.nome, dados: s.dados, resultado: s.resultado.cor }));
    }
    if (i.chave === "banquete" && rolador) {
      var q = D().quantidade("1d6", rolador);
      i.magico.dias = q.total;
      i.nota = (i.nota ? i.nota + " " : "") + "Comida para " + q.total + " dia(s).";
      eventos.push(evento("quantidade", { nome: "Banquete", dados: q.dados, total: q.total }));
    }
    o.itens.push(i);
    registrar(o, "item", "Ganhou " + i.nome);
    return ok(eventos, { item: i });
  }

  /* Restrições de característica (p. 6): Cabeção e Minicabeça não usam
     elmos (Cabeção, nem bonés); Pés gigantes, nenhum calçado. */
  function restricaoDeUso(o, i) {
    var d = defDoItem(i).protecao;
    if (!d) return "";
    var tem = function (k) { return o.caracteristicas.some(function (c) { return c.chave === k; }); };
    if (d.elmo && (tem("cabecao") || tem("minicabeca"))) return (tem("cabecao") ? "Cabeção" : "Minicabeça") + " não pode usar elmos (p. 6).";
    if (d.calcado && tem("pesGigantes")) return "Pés gigantes não usa calçado nenhum (p. 6).";
    return "";
  }

  function equipar(o, id, equipado, rolador) {
    var i = o.itens.filter(function (x) { return x.id === id; })[0];
    if (!i) return falha("Item não encontrado.");
    if (!disponivel(i)) return falha(i.nome + " não existe mais.");
    var eventos = [];
    var avisos = [];
    if (equipado) {
      var r = restricaoDeUso(o, i);
      if (r) return falha(r);
      if (i.arremessado) return falha("Pegue " + i.nome + " de volta primeiro.");
      var d = defDoItem(i);
      var maos = function (x) { var dd = defDoItem(x); return dd.arma ? dd.arma.maos : dd.protecao && dd.protecao.uso === "umaMao" ? 1 : 0; };
      var ocupadas = o.itens.filter(function (x) { return x.id !== i.id && vestido(x); }).reduce(function (s, x) { return s + maos(x); }, 0);
      if (ocupadas + maos(i) > 2) avisos.push("Mais de duas mãos ocupadas.");
      if (d.protecao && d.protecao.uso !== "umaMao") {
        var mesmo = o.itens.filter(function (x) { return x.id !== i.id && vestido(x) && defDoItem(x).protecao && defDoItem(x).protecao.uso === d.protecao.uso; });
        if (mesmo.length) avisos.push("Já há algo em " + (C().USOS_DE_PROTECAO[d.protecao.uso] || d.protecao.uso) + ": " + mesmo.map(function (x) { return x.nome; }).join(", ") + ".");
      }
    }
    i.equipado = !!equipado;
    /* O efeito do anel acaba ao tirar; colocar rola de novo (p. 25). */
    o.efeitos = o.efeitos.filter(function (e) { return !(e.item === i.id && !i.equipado); });
    if (i.chave === "anelMagico" && i.equipado && rolador) {
      var s = D().sortear({ id: "anel", nome: "Efeito do Anel Mágico", pagina: 25, dados: "1d6", entradas: C().ANEL_D6 }, rolador);
      i.magico.anel = s.indice;
      adicionarEfeito(o, Object.assign({ item: i.id, fonte: "Anel Mágico", pagina: 25 }, s.resultado.efeito), eventos);
      eventos.push(evento("sorteio", { nome: s.nome, dados: s.dados, resultado: s.resultado.texto }));
    }
    registrar(o, "item", (i.equipado ? "Equipou " : "Guardou ") + i.nome);
    return ok(eventos, { avisos: avisos });
  }

  function removerItem(o, id, motivo) {
    var i = o.itens.filter(function (x) { return x.id === id; })[0];
    if (!i) return falha("Item não encontrado.");
    o.itens = o.itens.filter(function (x) { return x.id !== id; });
    o.efeitos = o.efeitos.filter(function (e) { return e.item !== id; });
    registrar(o, "item", "Perdeu " + i.nome + (motivo ? " (" + motivo + ")" : ""));
    return ok();
  }

  function marcarDestruido(o, id, destruido) {
    var i = o.itens.filter(function (x) { return x.id === id; })[0];
    if (!i) return falha("Item não encontrado.");
    i.destruido = !!destruido;
    if (i.destruido) i.equipado = false;
    registrar(o, "item", i.nome + (i.destruido ? " destruído" : " recuperado"));
    return ok();
  }

  function consumir(o, i) { i.consumido = true; i.equipado = false; o.efeitos = o.efeitos.filter(function (e) { return e.item !== i.id; }); }

  /* As ações dos itens (p. 13, 24–27). acao: a do catálogo; opcoes
     conforme o item. Devolve, quando o efeito é em OUTROS, `area`
     (explosões) ou `alvo` para a mesa aplicar. */
  function usarItem(o, id, acao, opcoes, rolador) {
    var op = opcoes || {};
    var i = o.itens.filter(function (x) { return x.id === id; })[0];
    if (!i || !disponivel(i)) return falha("Item não encontrado.");
    if (!ativo(o) && ["livroEspecial"].indexOf(i.chave) < 0) return falha(motivoInativo(o));
    var eventos = [];
    switch (i.chave) {
      case "pocao": {
        var cor = i.magico.cor;
        if (!cor) { var s0 = D().sortear({ id: "pocao", nome: "Cor da Poção", pagina: 27, dados: "1d6", entradas: C().POCAO_D6 }, rolador); cor = s0.indice; i.magico.cor = cor; }
        var p = C().POCAO_D6[cor - 1];
        consumir(o, i);
        registrar(o, "item", "Bebeu a poção " + p.cor + ": " + p.texto);
        eventos.push(evento("pocao", { cor: p.cor, texto: p.texto }));
        if (p.explode) fim(o, "explodiu", "Bebeu a poção amarela", eventos);
        if (p.efeito) adicionarEfeito(o, Object.assign({ fonte: "Poção " + p.cor, pagina: 27 }, p.efeito), eventos);
        if (p.curar) eventos = eventos.concat(curar(o, "todos", "Poção azul").eventos);
        if (p.atributo) {
          if (C().CHAVES_ATRIBUTO.indexOf(op.atributo) < 0) { i.consumido = false; return falha("Escolha o atributo que a poção verde aumenta."); }
          o.ajustes.push({ id: novoId("aj"), atributo: op.atributo, valor: 1, motivo: "Poção verde", pagina: 27, dia: o.tempo.dia });
        }
        return ok(eventos, { pocao: p });
      }
      case "macaCheirosa":
        consumir(o, i);
        eventos = curar(o, "todos", "Maçã Cheirosa").eventos;
        return ok(eventos);
      case "macaMalcheirosa":
        consumir(o, i);
        registrar(o, "item", "Arremessou a Maçã Malcheirosa");
        return ok([evento("explosaoDeArea", { item: i.nome, aneis: [{ alcance: "em volta", ferimentos: 1 }], pagina: 26 })], { area: [{ alcance: "em volta", ferimentos: 1 }] });
      case "barrilDePolvora":
        if (acao === "municao") {
          var alvos = lista(op.armas).slice(0, 3);
          var feitas = [];
          alvos.forEach(function (aid) {
            var a = o.itens.filter(function (x) { return x.id === aid; })[0];
            if (a && disponivel(a) && a.municao && defDoItem(a).arma && defDoItem(a).arma.fogo) { a.municao.atual = a.municao.max; feitas.push(a.nome); }
          });
          if (!feitas.length) return falha("Escolha até 3 armas de fogo com munição.");
          consumir(o, i);
          registrar(o, "item", "Barril de Pólvora: completou a munição de " + feitas.join(", "));
          return ok([evento("municao", { item: feitas.join(", ") })]);
        }
        consumir(o, i);
        registrar(o, "item", "Acendeu o Barril de Pólvora");
        return ok([evento("explosaoDeArea", { item: i.nome, aneis: [{ alcance: "em volta", ferimentos: 4 }, { alcance: "até 5 m", ferimentos: 2 }], pagina: 13 })], { area: [{ alcance: "em volta", ferimentos: 4 }, { alcance: "até 5 m", ferimentos: 2 }] });
      case "galinhaExplosiva":
        if (i.aceso) return falha("A galinha já está andando por aí.");
        i.aceso = { turnos: 2 };
        i.equipado = false;
        registrar(o, "item", (acao === "arremessar" ? "Arremessou" : "Soltou") + " a Galinha Explosiva: explode em dois turnos");
        return ok([evento("acesa", { item: i.nome, turnos: 2 })]);
      case "veneno":
        consumir(o, i);
        registrar(o, "item", "Pôs veneno na bebida" + (op.alvo ? " de " + op.alvo : ""));
        return ok([evento("veneno", { alvo: op.alvo || "" })], { alvo: { efeito: { chave: "veneno", nome: "Envenenado: 1 ferimento por minuto", ate: "manual", porMinuto: 1, fonte: "Veneno", pagina: 13 } } });
      case "aljava": {
        var arco = o.itens.filter(function (x) { return x.id === op.armaId; })[0];
        var da = arco ? defDoItem(arco).arma : null;
        if (!arco || !da || !da.arco || !arco.municao) return falha("A Aljava serve num arco ou besta.");
        if (i.magico.vinculada) return falha("Esta Aljava já está em uso.");
        var base = da.municao;
        arco.municao.max = base * 2;
        arco.municao.atual = Math.min(arco.municao.max, arco.municao.atual + base);
        i.magico.vinculada = arco.id;
        registrar(o, "item", "Aljava em " + arco.nome + ": munição " + arco.municao.atual + "/" + arco.municao.max);
        return ok([evento("municao", { item: arco.nome, atual: arco.municao.atual })]);
      }
      case "livroEstranho": {
        if (i.magico.lido) return falha("Já foi lido.");
        var t = testar(o, { atributo: "nocao", rotulo: "Ler o Livro Estranho", necessarios: 2, dificuldade: op.dificuldade, seZero: op.seZero }, rolador);
        if (!t.ok || t.lacuna) return t;
        var extra = { rolagem: t.rolagem };
        if (t.rolagem.classificacao.sucesso) {
          i.magico.lido = true;
          var ch = D().chance("1em6", rolador);
          extra.chance = ch;
          if (ch.saiu) {
            var sm = D().sortear({ id: "magiaDoLivro", nome: "Magia do livro", pagina: 13, dados: "d7", entradas: C().MAGIAS_DO_BRUXO }, rolador);
            i.magico.magia = sm.resultado;
            i.nome = "Livro de Magia (" + C().MAGIAS[sm.resultado].nome + ")";
            extra.magia = sm.resultado;
            registrar(o, "item", "O Livro Estranho é um livro de magia: " + C().MAGIAS[sm.resultado].nome);
          } else {
            i.magico.semMagia = true;
            registrar(o, "item", "Leu o Livro Estranho: não é de magia");
          }
        }
        return ok(t.eventos, extra);
      }
      case "livroEspecial":
        if (acao === "queimar") {
          consumir(o, i);
          var antes = o.adaptacoes.cthulin.medo;
          o.adaptacoes.cthulin.medo = 0;
          registrar(o, "cthulin", "Queimou um Livro Especial: Medo " + antes + " → 0");
          return ok([evento("medo", { de: antes, para: 0 })]);
        }
        return falha("Livro Especial: conjure pela aba de magias ou queime para eliminar o Medo.");
      case "anelMagico":
        return equipar(o, i.id, !i.equipado, rolador);
      case "tortaDeliciosa":
        return testar(o, { atributo: "nocao", rotulo: "Perceber que a torta é ilusão", dificuldade: op.dificuldade, seZero: op.seZero }, rolador);
      case "relogioTicPloc":
        fim(o, "sumiu", "Deixou o Relógio Tic-Ploc cair", eventos);
        return ok(eventos);
      case "espadaJusticeira":
        fim(o, "morto", "Gritou “Hooooo” com a Espada da Justiçeira erguida", eventos);
        return ok(eventos);
      case "espadaDestruidora":
        registrar(o, "item", "Alguém falou “FIM” perto da Espada Destruidora de Mundos");
        return ok([evento("narrativo", { texto: "Um vórtex se abre e absorve tudo e todos!", pagina: 26 })]);
      case "estatuetaSerpente":
        registrar(o, "item", "Apontou a Estatueta do Deus Serpente" + (op.alvo ? " para " + op.alvo : ""));
        return ok([evento("narrativo", { texto: "Uma serpente imensa devora " + (op.alvo || "o alvo") + " e some.", pagina: 26 })], { alvo: { devorado: true } });
      case "peteca":
        o.marcas.dia.peteca = true;
        registrar(o, "item", "Brincou de peteca (rola no fim do dia)");
        return ok([evento("narrativo", { texto: "No fim do dia, um dado: com 6, Habilidade +1 amanhã.", pagina: 27 })]);
      default:
        return falha("Este item não tem ação automática.");
    }
  }

  /* Veneno no próprio goblin: cada minuto, 1 ferimento. */
  function passarMinuto(o) {
    var vs = o.efeitos.filter(function (e) { return e.porMinuto; });
    if (!vs.length) return falha("Nada correndo por minuto.");
    var total = vs.reduce(function (s, e) { return s + e.porMinuto; }, 0);
    return sofrer(o, { ferimentos: total, fonte: "Veneno (1 minuto)" });
  }

  /* Bomba-relógio (p. 6): alguém falou de fogo ou explosão. */
  function bombaRelogio(o, rolador) {
    if (!o.caracteristicas.some(function (c) { return c.chave === "bombaRelogio"; })) return falha("Este goblin não é uma Bomba-relógio.");
    if (!ativo(o)) return falha(motivoInativo(o));
    var f = D().quantidade("1d6", rolador);
    var eventos = [evento("bombaRelogio", { dados: f.dados, explodiu: f.total === 1 })];
    registrar(o, "caracteristica", "Bomba-relógio: rolou " + f.total);
    if (f.total === 1) fim(o, "explodiu", "Bomba-relógio", eventos);
    return ok(eventos, { dados: f.dados });
  }

  /* ---------------------------------------------------------------
     CHAMADO DE CTHULIN (p. 32–33)
     --------------------------------------------------------------- */

  function receberMedoInterno(o, n, fonte, eventos) {
    var antes = o.adaptacoes.cthulin.medo;
    o.adaptacoes.cthulin.medo = Math.max(0, antes + inteiro(n, 0));
    registrar(o, "cthulin", "Medo " + antes + " → " + o.adaptacoes.cthulin.medo + (fonte ? " (" + fonte + ")" : ""));
    eventos.push(evento("medo", { de: antes, para: o.adaptacoes.cthulin.medo }));
    verificarFim(o, eventos, "Medo");
  }

  function receberMedo(o, n, fonte) {
    if (!o.opcoes.adaptacoes.cthulin) return falha("A adaptação Chamado de Cthulin está desligada.");
    var eventos = [];
    receberMedoInterno(o, n, fonte, eventos);
    return ok(eventos);
  }

  function verHorror(o, chave, rolador) {
    var h = C().INIMIGOS[chave];
    if (!h || !h.terror) return falha("Este Horror não causa Terror.");
    var q = D().quantidade(h.terror, rolador);
    var r = receberMedo(o, q.total, "Terror: " + h.nome);
    if (r.ok) r.quantidade = q;
    return r;
  }

  function descansarEmLugarSagrado(o) {
    var antes = o.adaptacoes.cthulin.medo;
    o.adaptacoes.cthulin.medo = 0;
    registrar(o, "cthulin", "Descansou num lugar sagrado: Medo " + antes + " → 0");
    return ok([evento("medo", { de: antes, para: 0 })]);
  }

  /* ---------------------------------------------------------------
     POKÉPRAGAS (p. 34–35)
     --------------------------------------------------------------- */

  function rolarElemento(rolador) {
    var s = D().sortear({ id: "elemento", nome: "Elemento", pagina: 34, dados: "colunaLinha", entradas: [C().POKE.elemento[0], C().POKE.elemento[0], C().POKE.elemento[0], C().POKE.elemento[0], C().POKE.elemento[1], C().POKE.elemento[1]] }, rolador);
    return s;
  }

  function gerarPraga(raridade, rolador, nome) {
    var bichos = C().POKE.bichos[raridade];
    var sb = D().sortear({ id: "bicho", nome: "Bicho (" + raridade + ")", pagina: 34, dados: "1d6", entradas: bichos }, rolador);
    var se = rolarElemento(rolador);
    var praga = normalizarPraga({ nome: nome || C().POKE.ficha[sb.resultado][0], bicho: sb.resultado, raridade: raridade, elementos: [se.resultado] });
    return { praga: praga, sorteios: [sb, se] };
  }

  function statsDaPraga(pr) {
    var f = C().POKE.ficha[pr.bicho] || ["?", 0, 0, 0, 1];
    var s = { combate: f[1], habilidade: f[2], nocao: f[3], vitalidade: f[4] };
    pr.elementos.forEach(function (e) { var d = C().POKE.elementos[e]; if (!d) return; Object.keys(d.mods).forEach(function (k) { s[k] += d.mods[k]; }); });
    s.vitalidade += pr.evolucoes;
    var primeiro = C().POKE.elementos[pr.elementos[0]];
    s.fraqueza = primeiro ? primeiro.fraqueza : "";
    return s;
  }

  function procurarPraga(o, rolador) {
    if (!o.opcoes.adaptacoes.pokepragas) return falha("A adaptação PokéPragas está desligada.");
    if (o.marcas.dia.procurouPraga) return falha("Procurar leva o dia inteiro: amanhã de novo.");
    o.marcas.dia.procurouPraga = true;
    var s = D().sortear({ id: "procurando", nome: "Procurando PokéPraga", pagina: 35, dados: "1d6", entradas: C().POKE.procurando }, rolador);
    var eventos = [evento("sorteio", { nome: s.nome, dados: s.dados, resultado: s.resultado || "nada" })];
    if (!s.resultado) { registrar(o, "poke", "Procurou o dia todo na grama alta: nada"); return ok(eventos, { sorteio: s }); }
    var g = gerarPraga(s.resultado, rolador);
    o.adaptacoes.pokepragas.encontrada = g.praga;
    registrar(o, "poke", "Encontrou uma PokéPraga " + C().POKE.raridades[s.resultado].nome.toLowerCase() + ": " + g.praga.nome);
    return ok(eventos, { sorteio: s, praga: g.praga, sorteios: g.sorteios });
  }

  function capturarPraga(o, nome, opcoes, rolador) {
    var op = opcoes || {};
    var pk = o.adaptacoes.pokepragas;
    var alvo = pk.encontrada;
    if (!alvo) return falha("Nenhuma PokéPraga à vista.");
    if (pk.pokepedras <= 0) return falha("Sem PokéPedras.");
    var precisa = C().POKE.raridades[alvo.raridade].captura;
    var t = testar(o, { atributo: "habilidade", rotulo: "Capturar " + alvo.nome, necessarios: precisa, dificuldade: op.dificuldade, seZero: op.seZero }, rolador);
    if (!t.ok || t.lacuna) return t;
    if (t.rolagem.classificacao.sucesso) {
      alvo.nome = texto(nome, 60) || alvo.nome;
      pk.pragas.push(alvo);
      pk.pokepedras--;
      pk.encontrada = null;
      registrar(o, "poke", "Capturou " + alvo.nome);
    }
    return ok(t.eventos, { rolagem: t.rolagem, capturou: t.rolagem.classificacao.sucesso });
  }

  /* Ganhou uma PokéBatalha: 1 dado (2 com Mestre da Evolução; evolui
     com 6 em qualquer um). */
  function verificarEvolucao(o, pragaId, rolador) {
    var pr = o.adaptacoes.pokepragas.pragas.filter(function (x) { return x.id === pragaId; })[0];
    if (!pr) return falha("PokéPraga não encontrada.");
    var n = temTecnica(o, "mestreDaEvolucao") ? 2 : 1;
    var q = D().quantidade(n + "d6", rolador);
    var evoluiu = q.dados.indexOf(6) >= 0;
    var eventos = [evento("evolucao", { dados: q.dados, evoluiu: evoluiu })];
    var extra = { dados: q.dados, evoluiu: evoluiu };
    if (evoluiu) {
      var novo = null, tentativas = 0, s;
      while (tentativas < 12) { s = rolarElemento(rolador); tentativas++; if (pr.elementos.indexOf(s.resultado) < 0) { novo = s.resultado; break; } }
      pr.evolucoes++;
      if (novo) pr.elementos.push(novo);
      extra.elemento = novo;
      registrar(o, "poke", pr.nome + " evoluiu: Vitalidade +1" + (novo ? " e " + C().POKE.elementos[novo].nome : ""));
    }
    return ok(eventos, extra);
  }

  function ferirPraga(o, pragaId, n) {
    var pr = o.adaptacoes.pokepragas.pragas.filter(function (x) { return x.id === pragaId; })[0];
    if (!pr) return falha("PokéPraga não encontrada.");
    pr.ferimentos = Math.max(0, pr.ferimentos + inteiro(n, 0));
    var st = statsDaPraga(pr);
    var eventos = [];
    if (pr.ferimentos > st.vitalidade && !pr.desmaiada) { pr.desmaiada = true; eventos.push(evento("desmaiou", { nome: pr.nome })); registrar(o, "poke", pr.nome + " desmaiou e voltou para a PokéPedra"); }
    if (pr.ferimentos <= st.vitalidade && pr.desmaiada && n < 0) pr.desmaiada = false;
    return ok(eventos);
  }

  /* Ataque de PokéPraga: normal com Combate, elemental com Habilidade;
     elemental que causar dano e for a fraqueza do alvo: +1 ferimento. */
  function ataqueDePraga(o, pragaId, pedido, rolador) {
    var p = pedido || {};
    var pr = o.adaptacoes.pokepragas.pragas.filter(function (x) { return x.id === pragaId; })[0];
    if (!pr) return falha("PokéPraga não encontrada.");
    if (pr.desmaiada) return falha(pr.nome + " está desmaiada.");
    var st = statsDaPraga(pr);
    var elemental = !!p.elemento;
    if (elemental && pr.elementos.indexOf(p.elemento) < 0) return falha("Elemento que ela não tem.");
    var m = D().montarParada({ fonte: elemental ? "Habilidade (" + pr.nome + ")" : "Combate (" + pr.nome + ")", valor: elemental ? st.habilidade : st.combate }, lista(p.extras), p.dificuldade);
    var r = D().rolar({ parada: m.parada, composicao: m.composicao, tipo: "ataque", rotulo: pr.nome + (elemental ? " · ataque de " + C().POKE.elementos[p.elemento].nome : " · ataque"), podeExplodirGoblin: false, seZero: p.seZero }, rolador);
    if (r.lacuna) return ok([], { rolagem: r, lacuna: true });
    var fer = r.classificacao.hits;
    var notas = [];
    if (elemental && fer > 0 && p.fraquezaDoAlvo === p.elemento) { fer++; notas.push("Fraqueza do alvo: +1"); }
    return ok([], { rolagem: r, ferimentos: fer, notas: notas });
  }

  /* ---------------------------------------------------------------
     GOBLIN HIGH (p. 38–39) — e o vilarejo do Vale (p. 41)
     --------------------------------------------------------------- */

  function gerarEstudante(nome, rolador) {
    var GH = C().GOBLIN_HIGH;
    var r = D().sortear({ id: "reacao", nome: "Reação", pagina: 38, dados: "1d6", entradas: GH.reacaoD6 }, rolador);
    var q = function () { return D().quantidade("1d6", rolador).total; };
    return normalizarEstudante({ nome: nome, reacao: r.resultado, assunto: q(), gosto: q(), materia: q(), segredo: q() });
  }

  function adicionarEstudante(o, nome, rolador) {
    var e = gerarEstudante(nome, rolador);
    o.adaptacoes.goblinHigh.estudantes.push(e);
    registrar(o, "goblinHigh", "Novo estudante: " + e.nome + " (" + C().GOBLIN_HIGH.nomes[e.reacao] + ")");
    return ok([], { estudante: e });
  }

  function moverReacao(e, delta) {
    var esc = C().GOBLIN_HIGH.escala;
    var i = esc.indexOf(e.reacao);
    var antes = e.reacao;
    e.reacao = esc[Math.max(0, Math.min(esc.length - 1, i + delta))];
    return { de: antes, para: e.reacao };
  }

  function estudante(o, id) { return o.adaptacoes.goblinHigh.estudantes.filter(function (x) { return x.id === id; })[0]; }

  function conversar(o, id, opcoes, rolador) {
    var op = opcoes || {};
    var e = estudante(o, id);
    if (!e) return falha("Estudante não encontrado.");
    var GH = C().GOBLIN_HIGH;
    if (e.reacao === "hostil") {
      registrar(o, "goblinHigh", e.nome + " (Hostil) te agrediu e foi embora");
      return ok([evento("narrativo", { texto: e.nome + " está Hostil: te agride (um ataque) e vai embora." })], { hostil: true });
    }
    if (["neutro", "amigavel", "amigo"].indexOf(e.reacao) < 0) return falha("Só se conversa com quem está Neutro ou Amigável (ou é seu Amigo).");
    var t = testar(o, { atributo: "nocao", rotulo: "Conversar com " + e.nome, dificuldade: op.dificuldade, seZero: op.seZero }, rolador);
    if (!t.ok || t.lacuna) return t;
    var eventos = t.eventos.slice();
    var extra = { rolagem: t.rolagem };
    o.marcas.dia["conversou:" + e.id] = true;
    if (t.rolagem.classificacao.hits < 1) {
      if (e.reacao !== "amigo") { var mv = moverReacao(e, -1); extra.reacao = mv; registrar(o, "goblinHigh", "Conversa com " + e.nome + " falhou: " + GH.nomes[mv.de] + " → " + GH.nomes[mv.para]); }
      return ok(eventos, extra);
    }
    var s = D().sortear({ id: "conversa", nome: "Conversa", pagina: 38, dados: "1d6", entradas: GH.conversaD6 }, rolador);
    extra.conversa = s;
    if (s.resultado.revela) { e.revelado[s.resultado.revela] = true; extra.revelou = s.resultado.revela; }
    if (s.resultado.baixa) { var mv2 = moverReacao(e, -1); extra.reacao = mv2; }
    registrar(o, "goblinHigh", "Conversou com " + e.nome + ": " + s.resultado.texto);
    return ok(eventos, extra);
  }

  /* Amigos revelam o Segredo (p. 39). */
  function perguntarSegredo(o, id) {
    var e = estudante(o, id);
    if (!e) return falha("Estudante não encontrado.");
    if (e.reacao !== "amigo") return falha("Só um Amigo conta o Segredo.");
    e.revelado.segredo = true;
    registrar(o, "goblinHigh", e.nome + " contou o Segredo: " + C().GOBLIN_HIGH.segredo[e.segredo - 1]);
    return ok([], { segredo: C().GOBLIN_HIGH.segredo[e.segredo - 1], gostaDeVoce: e.segredo === 6 });
  }

  /* Agradar: fazendo algo que ele gosta (+1, sem teste) ou falando algo
     agradável (Noção: falhou −1, mesmo Amigo; 2+ hits +1). Precisa ter
     conversado hoje (menos com Inimigo, que nem conversa: é o caminho
     para desfazer a inimizade — 3 hits em dois dias seguidos). Uma vez
     por dia por estudante. */
  function agradar(o, id, opcoes, rolador) {
    var op = opcoes || {};
    var e = estudante(o, id);
    if (!e) return falha("Estudante não encontrado.");
    var GH = C().GOBLIN_HIGH;
    if (o.marcas.dia["agradou:" + e.id]) return falha("Não dá para agradar a mesma pessoa duas vezes no mesmo dia.");
    if (e.reacao !== "inimigo" && !o.marcas.dia["conversou:" + e.id]) return falha("É preciso conversar antes.");
    o.marcas.dia["agradou:" + e.id] = true;
    if (op.gosto && e.reacao !== "inimigo") {
      var mv = moverReacao(e, 1);
      registrar(o, "goblinHigh", "Fez algo que " + e.nome + " gosta: " + GH.nomes[mv.de] + " → " + GH.nomes[mv.para]);
      return ok([], { reacao: mv });
    }
    var t = testar(o, { atributo: "nocao", rotulo: "Agradar " + e.nome, dificuldade: op.dificuldade, seZero: op.seZero }, rolador);
    if (!t.ok || t.lacuna) { o.marcas.dia["agradou:" + e.id] = false; return t; }
    var h = t.rolagem.classificacao.hits;
    var extra = { rolagem: t.rolagem };
    if (e.reacao === "inimigo") {
      if (h >= 3) {
        e.agrados3.push(o.tempo.dia);
        var n = e.agrados3.length;
        if (n >= 2 && e.agrados3[n - 1] - e.agrados3[n - 2] === 1) { e.reacao = "hostil"; e.agrados3 = []; extra.reacao = { de: "inimigo", para: "hostil" }; registrar(o, "goblinHigh", e.nome + " deixou de ser Inimigo (segue Hostil)"); }
      }
      return ok(t.eventos, extra);
    }
    if (h < 1) extra.reacao = moverReacao(e, -1);
    else if (h >= 2) extra.reacao = moverReacao(e, 1);
    if (extra.reacao) registrar(o, "goblinHigh", "Agradar " + e.nome + ": " + GH.nomes[extra.reacao.de] + " → " + GH.nomes[extra.reacao.para]);
    return ok(t.eventos, extra);
  }

  function mudarReacao(o, id, delta, motivo) {
    var e = estudante(o, id);
    if (!e) return falha("Estudante não encontrado.");
    var mv = moverReacao(e, delta > 0 ? 1 : -1);
    registrar(o, "goblinHigh", e.nome + ": " + C().GOBLIN_HIGH.nomes[mv.de] + " → " + C().GOBLIN_HIGH.nomes[mv.para] + (motivo ? " (" + motivo + ")" : ""));
    return ok([], { reacao: mv });
  }

  /* Romance (p. 39): Amigo cujo segredo é "gosta de você", ou quem
     sabe Assunto, Gostos e Segredo e vence um teste de Noção — os hits
     são os meses juntos. */
  function tentarRomance(o, id, opcoes, rolador) {
    var op = opcoes || {};
    var e = estudante(o, id);
    if (!e) return falha("Estudante não encontrado.");
    if (e.romance) return falha("Já há um romance com " + e.nome + ".");
    if (e.reacao === "amigo" && e.revelado.segredo && e.segredo === 6 && !op.teste) {
      e.romance = { meses: 0, desde: o.tempo.dia };
      registrar(o, "goblinHigh", "Começou um romance com " + e.nome);
      return ok([evento("romance", { nome: e.nome })]);
    }
    if (!(e.revelado.assunto && e.revelado.gosto && e.revelado.segredo)) return falha("É preciso conhecer o Assunto Favorito, os Gostos e o Segredo.");
    var t = testar(o, { atributo: "nocao", rotulo: "Encantar " + e.nome, dificuldade: op.dificuldade, seZero: op.seZero }, rolador);
    if (!t.ok || t.lacuna) return t;
    var h = t.rolagem.classificacao.hits;
    if (h >= 1) { e.romance = { meses: h, desde: o.tempo.dia }; registrar(o, "goblinHigh", "Romance com " + e.nome + " por " + h + " mês(es)"); }
    return ok(t.eventos, { rolagem: t.rolagem, meses: h });
  }

  function resolverBriga(o, venceu) {
    var gh = o.adaptacoes.goblinHigh;
    if (!gh.briga) return falha("Não há briga marcada.");
    var quem = gh.briga.estudante;
    gh.briga = null;
    if (venceu) { gh.popular = true; registrar(o, "goblinHigh", "Venceu a briga com " + quem + ": popular na escola"); return ok([evento("narrativo", { texto: "Popular na escola!" })]); }
    gh.humilhado = true;
    gh.estudantes.forEach(function (e) { if (e.reacao !== "amigo") moverReacao(e, -1); });
    registrar(o, "goblinHigh", "Perdeu a briga com " + quem + ": humilhado, todos (menos Amigos) −1 na Reação");
    return ok([evento("narrativo", { texto: "Humilhado: todos (menos os Amigos) reduzem a Reação." })]);
  }

  /* ---------------------------------------------------------------
     VALE DOS GOBLINS (p. 40–41)
     --------------------------------------------------------------- */

  function temFerramenta(o, chave) { return o.itens.some(function (i) { return disponivel(i) && i.chave === chave; }); }
  function exigirVale(o) { return o.opcoes.adaptacoes.vale ? "" : "A adaptação Vale dos Goblins está desligada."; }

  /* Um teste por animal / m² / mina / bosque: hits = unidades. */
  function testesEmSerie(o, n, atributo, rotulo, rolador) {
    var total = 0, rolagens = [], eventos = [];
    for (var k = 0; k < n && ativo(o); k++) {
      var t = testar(o, { atributo: atributo, rotulo: rotulo + " (" + (k + 1) + "/" + n + ")", seZero: "falha" }, rolador);
      if (!t.ok) break;
      total += t.rolagem.classificacao.hits;
      rolagens.push(t.rolagem);
      eventos = eventos.concat(t.eventos);
    }
    return { total: total, rolagens: rolagens, eventos: eventos };
  }

  function coletar(o, tipo, rolador) {
    var m = exigirVale(o); if (m) return falha(m);
    var v = o.adaptacoes.vale;
    var marca = "coleta:" + tipo;
    if (o.marcas.dia[marca]) return falha("Já coletou isso hoje.");
    var r;
    if (tipo === "animais") {
      if (!v.galinhas && !v.vacas) return falha("Nenhum animal na fazenda.");
      var g = testesEmSerie(o, v.galinhas, "habilidade", "Ovos", rolador);
      var l = testesEmSerie(o, v.vacas, "habilidade", "Leite", rolador);
      v.recursos.ovo += g.total; v.recursos.leite += l.total;
      o.marcas.dia[marca] = true;
      registrar(o, "vale", "Coleta: " + g.total + " ovo(s), " + l.total + " litro(s) de leite");
      return ok(g.eventos.concat(l.eventos), { rolagens: g.rolagens.concat(l.rolagens), ovos: g.total, leite: l.total });
    }
    if (tipo === "pedra" || tipo === "madeira") {
      var ferr = tipo === "pedra" ? "picareta" : "machado";
      if (!temFerramenta(o, ferr)) return falha("Precisa de " + (tipo === "pedra" ? "uma Picareta" : "um Machado") + ".");
      var n = tipo === "pedra" ? v.minas : v.bosques;
      if (!n) return falha(tipo === "pedra" ? "Nenhuma mina no mapa." : "Nenhum bosque no mapa.");
      r = testesEmSerie(o, n, "combate", tipo === "pedra" ? "Minerar" : "Cortar madeira", rolador);
      v.recursos[tipo] += r.total;
      o.marcas.dia[marca] = true;
      registrar(o, "vale", "Coleta: " + r.total + " " + (tipo === "pedra" ? "bloco(s) de pedra" : "tábua(s) de madeira"));
      return ok(r.eventos, { rolagens: r.rolagens, total: r.total });
    }
    return falha("Coleta desconhecida.");
  }

  function plantar(o, planta, rolador) {
    var m = exigirVale(o); if (m) return falha(m);
    if (!temFerramenta(o, "enxada")) return falha("Precisa de uma Enxada.");
    if (o.marcas.dia.plantou) return falha("Só dá para plantar uma vez ao dia.");
    var nome = C().VALE.plantas.indexOf(planta) >= 0 ? planta : "";
    if (!nome) return falha("Escolha o que plantar.");
    var t = testar(o, { atributo: "habilidade", rotulo: "Plantar " + nome, seZero: "falha" }, rolador);
    if (!t.ok) return t;
    o.marcas.dia.plantou = true;
    var m2 = t.rolagem.classificacao.hits;
    var extra = { rolagem: t.rolagem, m2: m2 };
    if (m2 > 0) {
      var dias = D().quantidade("1d6", rolador);
      o.adaptacoes.vale.hortas.push({ id: novoId("ho"), planta: nome, m2: m2, plantadaNoDia: o.tempo.dia, colheitaEm: o.tempo.dia + dias.total, colhida: false });
      extra.dias = dias;
      registrar(o, "vale", "Plantou " + m2 + " m² de " + nome + ": colhe no dia " + (o.tempo.dia + dias.total));
    }
    return ok(t.eventos, extra);
  }

  function colher(o, hortaId, rolador) {
    var m = exigirVale(o); if (m) return falha(m);
    var h = o.adaptacoes.vale.hortas.filter(function (x) { return x.id === hortaId; })[0];
    if (!h || h.colhida) return falha("Horta não encontrada.");
    if (o.tempo.dia < h.colheitaEm) return falha("Ainda não: colhe no dia " + h.colheitaEm + ".");
    var r = testesEmSerie(o, h.m2, "nocao", "Colher " + h.planta, rolador);
    var total = r.total * (temTecnica(o, "dedoVerde") ? 2 : 1);
    h.colhida = true;
    o.adaptacoes.vale.alimentos[h.planta] = (o.adaptacoes.vale.alimentos[h.planta] || 0) + total;
    registrar(o, "vale", "Colheu " + total + " " + h.planta + (temTecnica(o, "dedoVerde") ? " (Dedo Verde: dobro)" : "") + "; a horta precisa ser plantada de novo");
    return ok(r.eventos, { rolagens: r.rolagens, total: total });
  }

  /* A pescaria é jogada na tela (dados.js); aqui só guarda o peixe. */
  function guardarPeixe(o, pescaria) {
    var m = exigirVale(o); if (m) return falha(m);
    if (!temFerramenta(o, "varaDePesca")) return falha("Precisa de uma Vara de Pesca.");
    if (!pescaria || !pescaria.concluida) return falha("A pescaria não terminou.");
    if (!pescaria.peixe) { registrar(o, "vale", "Pescou e não pegou nada"); return ok([], { peixe: null }); }
    var p = pescaria.peixe;
    o.adaptacoes.vale.peixes.push({ id: novoId("px"), nome: p.nome, local: pescaria.local, gramas: p.gramas });
    registrar(o, "vale", "Pescou um " + p.nome + " de " + (p.gramas >= 1000 ? p.gramas / 1000 + " kg" : p.gramas + " g") + " no " + pescaria.local);
    return ok([evento("peixe", { nome: p.nome, gramas: p.gramas })], { peixe: p });
  }

  function construir(o, chave, rolador) {
    var m = exigirVale(o); if (m) return falha(m);
    var def = C().VALE.construcoes[chave];
    if (!def) return falha("Construção desconhecida.");
    var v = o.adaptacoes.vale;
    var falta = [];
    var espada = null;
    Object.keys(def.custo).forEach(function (k) {
      if (k === "espada") { espada = o.itens.filter(function (i) { return disponivel(i) && i.chave === "espada"; })[0]; if (!espada) falta.push("1 Espada"); }
      else if ((v.recursos[k] || 0) < def.custo[k]) falta.push(def.custo[k] + " " + k);
    });
    if (falta.length) return falha("Faltam: " + falta.join(", ") + ".");
    var t = testar(o, { atributo: "nocao", rotulo: "Construir " + def.nome, necessarios: 2, seZero: "falha" }, rolador);
    if (!t.ok) return t;
    var extra = { rolagem: t.rolagem, construiu: t.rolagem.classificacao.sucesso };
    if (extra.construiu) {
      Object.keys(def.custo).forEach(function (k) { if (k === "espada") consumir(o, espada); else v.recursos[k] -= def.custo[k]; });
      if (def.ferramenta) o.itens.push(novoItem(chave === "varaDePesca" ? "varaDePesca" : chave));
      else if (chave === "fazenda") v.fazenda = true;
      else v.construcoes.push(chave);
      registrar(o, "vale", "Construiu " + def.nome);
    }
    return ok(t.eventos, extra);
  }

  /* Cozinha: confere os ingredientes, testa Noção; falhou, perdeu os
     ingredientes (p. 41). Peixe: gasta os gramas do peixe escolhido. */
  function cozinhar(o, chave, opcoes, rolador) {
    var op = opcoes || {};
    var m = exigirVale(o); if (m) return falha(m);
    var rc = C().VALE.receitas[chave];
    if (!rc) return falha("Receita desconhecida.");
    var v = o.adaptacoes.vale;
    var falta = [];
    var usar = {};
    Object.keys(rc.ingredientes).forEach(function (k) {
      var n = rc.ingredientes[k];
      if (k === "Ovo") { if (v.recursos.ovo < n) falta.push(n + " Ovo"); else usar.ovo = n; return; }
      if (k === "Leite") { if (v.recursos.leite < n) falta.push(n + " Leite"); else usar.leite = n; return; }
      if (k === "Fruta") {
        var fr = C().VALE.frutas.filter(function (f) { return (v.alimentos[f] || 0) >= n; })[0];
        if (op.fruta && (v.alimentos[op.fruta] || 0) >= n) fr = op.fruta;
        if (!fr) falta.push("1 Fruta"); else usar["al:" + fr] = n;
        return;
      }
      if ((v.alimentos[k] || 0) < n) falta.push(n + " " + k); else usar["al:" + k] = n;
    });
    var peixe = null;
    if (rc.peixe) {
      peixe = v.peixes.filter(function (p) { return p.id === op.peixeId; })[0];
      if (!peixe) falta.push(rc.peixe.gramas + " g de peixe" + (rc.peixe.tipos ? " (" + rc.peixe.tipos.join(" ou ") + ")" : ""));
      else if (peixe.gramas < rc.peixe.gramas) falta.push(rc.peixe.gramas + " g de peixe (este tem " + peixe.gramas + " g)");
      else if (rc.peixe.tipos && rc.peixe.tipos.indexOf(peixe.nome) < 0) falta.push("peixe " + rc.peixe.tipos.join(" ou "));
    }
    if (falta.length) return falha("Faltam: " + falta.join(", ") + ".");
    var t = testar(o, { atributo: "nocao", rotulo: "Cozinhar " + rc.nome, necessarios: rc.hits, seZero: "falha" }, rolador);
    if (!t.ok) return t;
    Object.keys(usar).forEach(function (k) {
      if (k === "ovo" || k === "leite") v.recursos[k] -= usar[k];
      else { var nome = k.slice(3); v.alimentos[nome] -= usar[k]; if (v.alimentos[nome] <= 0) delete v.alimentos[nome]; }
    });
    if (peixe) { peixe.gramas -= rc.peixe.gramas; v.peixes = v.peixes.filter(function (p) { return p.gramas > 0; }); }
    var deu = t.rolagem.classificacao.sucesso;
    if (deu) v.pratos[chave] = (v.pratos[chave] || 0) + 1;
    registrar(o, "vale", (deu ? "Cozinhou " : "Estragou os ingredientes de ") + rc.nome);
    return ok(t.eventos, { rolagem: t.rolagem, cozinhou: deu });
  }

  function heranca(o) {
    var v = o.adaptacoes.vale;
    if (v.fazenda) return;
    v.fazenda = true; v.galinhas = Math.max(v.galinhas, 1); v.vacas = Math.max(v.vacas, 1);
    registrar(o, "vale", "Herança: uma fazenda com 1 galinha e 1 vaca");
  }

  /* ---------------------------------------------------------------
     CRIAÇÃO (p. 4–6)
     --------------------------------------------------------------- */

  function sorteioDeNome(rolador) {
    return D().sortear({ id: "nome", nome: "Nome", pagina: 4, dados: "colunaLinha", entradas: C().NOMES }, rolador);
  }

  /* Característica: "role 2 vezes" rola duas outras (e se cair de novo,
     rola de novo — o livro não proíbe, o R.A.M.A. só para em 6 delas).
     Olhos extras: rola a quantidade (1d6). */
  function sortearCaracteristicas(rolador) {
    var tabela = { id: "caracteristica", nome: "Característica", pagina: 4, dados: "colunaLinha", entradas: C().CARACTERISTICA_2D6 };
    var sorteios = [], saida = [], fila = 1, guarda = 0;
    while (fila > 0 && guarda < 12 && saida.length < 6) {
      guarda++; fila--;
      var s = D().sortear(tabela, rolador);
      sorteios.push(s);
      if (s.resultado === "rolarDuasVezes") { fila += 2; continue; }
      var def = C().CARACTERISTICAS[s.resultado];
      var c = { id: novoId("ca"), chave: s.resultado, quantidade: null };
      if (def.quantidade) { var q = D().quantidade(def.quantidade, rolador); c.quantidade = q.total; sorteios.push(Object.assign({ nome: def.nome }, q)); }
      saida.push(c);
    }
    return { caracteristicas: saida, sorteios: sorteios };
  }

  /* Rola tudo o que o livro manda rolar. O que é ESCOLHA (Supimpa,
     equipamento, arma favorita, espécie inimiga, magias…) fica como
     pendência — nada é escolhido pela pessoa. */
  function criarAleatoria(o, rolador, opcoes) {
    var op = opcoes || {};
    var eventos = [];
    o.criacao.modo = "aleatoria";
    var sn = sorteioDeNome(rolador);
    o.criacao.sorteios.push(sn);
    if (typeof sn.resultado === "string") { o.criacao.nomeSugerido = sn.resultado; o.criacao.pendenciaDeNome = ""; }
    else { o.criacao.nomeSugerido = ""; o.criacao.pendenciaDeNome = sn.resultado.especial; }
    if (op.ocupacao && C().OCUPACOES[op.ocupacao]) o.ocupacao = op.ocupacao;
    else {
      var so = D().sortear({ id: "ocupacao", nome: "Ocupação", pagina: 4, dados: "1d6", entradas: C().OCUPACAO_D6 }, rolador);
      o.criacao.sorteios.push(so);
      o.ocupacao = so.resultado;
    }
    var sd = D().sortear({ id: "descritor", nome: "Descritor", pagina: 4, dados: "1d6", entradas: C().DESCRITOR_D6 }, rolador);
    o.criacao.sorteios.push(sd);
    o.descritor = sd.resultado;
    var sc = sortearCaracteristicas(rolador);
    o.caracteristicas = sc.caracteristicas;
    o.criacao.sorteios = o.criacao.sorteios.concat(sc.sorteios).slice(-40);
    registrar(o, "criacao", "Criação aleatória: " + nomeDaOcupacao(o) + " " + C().DESCRITORES[o.descritor].nome.toLowerCase() + ", " + o.caracteristicas.map(function (c) { return C().CARACTERISTICAS[c.chave].nome; }).join(", "));
    return ok(eventos);
  }

  function rerrolarCaracteristica(o, rolador) {
    if (o.criacao.concluida) return falha("A criação já foi concluída.");
    var sc = sortearCaracteristicas(rolador);
    o.caracteristicas = sc.caracteristicas;
    o.criacao.sorteios = o.criacao.sorteios.concat(sc.sorteios).slice(-40);
    return ok([], { sorteios: sc.sorteios });
  }

  function pendencias(o) {
    var p = [];
    var oc = C().OCUPACOES[o.ocupacao];
    if (!oc) { p.push("Escolha (ou role) a ocupação."); return p; }
    if (!o.descritor) p.push("Escolha (ou role) o descritor.");
    if (o.descritor === "supimpa" && !o.supimpa) p.push("Supimpa: escolha o atributo que ganha +1.");
    if (oc.modEscolha && !o.modEscolhido) p.push(oc.nome + ": escolha Habilidade ou Noção (+1).");
    if (!o.caracteristicas.length) p.push("Escolha (ou role) a característica.");
    var war = o.opcoes.adaptacoes.wargoblin;
    if (war) {
      if (!o.escolhas.grupoWar) p.push("WarGoblin: escolha a turminha.");
      if (o.escolhas.equipamentoWar.length < 2) p.push("WarGoblin: escolha dois equipamentos.");
    } else if (oc.equipamento.length > 1 && (o.equipamentoInicial === null || !oc.equipamento[o.equipamentoInicial])) p.push("Escolha o equipamento inicial.");
    if (oc.escolhas.indexOf("armaFavorita") >= 0 && !o.escolhas.armaFavorita) p.push("Mestre de Armas: escolha a arma favorita.");
    if (oc.escolhas.indexOf("especieInimiga") >= 0 && !o.escolhas.especieInimiga) p.push("Inimigo: escolha a espécie de criatura.");
    if (oc.escolhas.indexOf("magias") >= 0 && o.escolhas.magias.length < 3) p.push("Magias: escolha 3 (" + o.escolhas.magias.length + "/3).");
    if (o.opcoes.adaptacoes.cthulin && !o.escolhas.inicialCthulin) p.push("Cthulin: comece com um Chapéu ou um Livro Especial.");
    if (o.criacao.pendenciaDeNome) p.push(o.criacao.pendenciaDeNome === "comida" ? "Nome: a última coisa que você comeu." : "Nome: inverta o seu nome.");
    return p;
  }

  function concluirCriacao(o, rolador) {
    var p = pendencias(o).filter(function (x) { return x.indexOf("Nome:") !== 0; });
    if (p.length) return falha(p[0], { pendencias: p });
    var eventos = [];
    if (!o.criacao.equipamentoAplicado) {
      var oc = C().OCUPACOES[o.ocupacao];
      var chaves = [];
      if (o.opcoes.adaptacoes.wargoblin) chaves = o.escolhas.equipamentoWar.slice();
      else {
        var opc = oc.equipamento[oc.equipamento.length === 1 ? 0 : o.equipamentoInicial];
        chaves = opc.itens.slice();
        if (opc.pokepedras) o.adaptacoes.pokepragas.pokepedras += opc.pokepedras;
      }
      if (o.opcoes.adaptacoes.cthulin && o.escolhas.inicialCthulin) chaves.push(o.escolhas.inicialCthulin);
      var maosLivres = 2;
      chaves.forEach(function (k) {
        var i = novoItem(k);
        var d = defDoItem(i);
        var maos = d.arma ? d.arma.maos : d.protecao && d.protecao.uso === "umaMao" ? 1 : 0;
        if ((d.arma || d.protecao) && !restricaoDeUso(o, i) && maos <= maosLivres) { i.equipado = true; maosLivres -= maos; }
        o.itens.push(i);
      });
      o.criacao.equipamentoAplicado = true;
      registrar(o, "criacao", "Equipamento inicial: " + chaves.map(function (k) { var c = C().itemDoCatalogo(k); return c ? c.def.nome : k; }).join(", "));
    }
    if (temTecnica(o, "heranca")) heranca(o);
    if (temTecnica(o, "pokepragaInicial") && !o.adaptacoes.pokepragas.pragas.length && rolador) {
      var g = gerarPraga("incomum", rolador);
      o.adaptacoes.pokepragas.pragas.push(g.praga);
      registrar(o, "poke", "PokéPraga inicial: " + g.praga.nome + " (" + g.praga.elementos.map(function (e) { return C().POKE.elementos[e].nome; }).join(", ") + ")");
      eventos.push(evento("sorteio", { nome: "PokéPraga inicial", resultado: g.praga.nome }));
    }
    o.criacao.concluida = true;
    registrar(o, "criacao", "Criação concluída");
    return ok(eventos);
  }

  /* O parente que chega para vingar (p. 5): um bloco NOVO, de nível 1,
     com as mesmas regras ligadas e o rastro do anterior. A ficha antiga
     fica como está. */
  function novoParente(anterior, refAnterior, rolador) {
    var o = fichaVazia();
    o.opcoes = copiar(anterior.opcoes);
    o.tempo.dia = anterior.tempo.dia;
    o.nomeDeFamilia = anterior.nomeDeFamilia;
    o.linhagem.anterior = refAnterior || null;
    if (rolador) criarAleatoria(o, rolador);
    registrar(o, "criacao", "Chegou para vingar " + (refAnterior ? refAnterior.nome : "o goblin anterior"));
    return o;
  }

  /* Correção no modo Edição: voltar um fim marcado por engano. Fica no
     histórico. */
  function corrigirSituacao(o, situacao, motivo) {
    if (!SITUACOES[situacao]) return falha("Situação desconhecida.");
    var antes = o.estado.situacao;
    o.estado.situacao = situacao;
    if (situacao === "ativo") o.estado.causa = "";
    registrar(o, "correcao", "Situação " + SITUACOES[antes] + " → " + SITUACOES[situacao] + (motivo ? " (" + motivo + ")" : ""));
    return ok([evento("correcao", { de: antes, para: situacao })]);
  }

  function voltarComoMortoVivo(o) {
    if (o.estado.situacao !== "morto") return falha("Só quem morreu.");
    if (!o.itens.some(function (i) { return disponivel(i) && i.chave === "necronomicon"; })) return falha("Só quem morreu com o Necronomicon em mãos.");
    o.estado.situacao = "mortoVivo";
    if (o.estado.marcas.indexOf("mortoVivo") < 0) o.estado.marcas.push("mortoVivo");
    registrar(o, "fim", "Voltou como morto-vivo (Necronomicon). Os ferimentos ficam como estavam: a mesa decide");
    return ok([evento("mortoVivo", {})]);
  }

  /* ---------------------------------------------------------------
     OPERAÇÕES, RESUMO
     --------------------------------------------------------------- */

  /* fn(copia) → { ok, motivo?, eventos }. Aplicada numa CÓPIA: falhou
     no meio, a ficha fica como estava. Uma vez por id. */
  function aplicarOperacao(o, opId, fn) {
    var id = texto(opId, 120);
    if (!id) return falha("Operação sem identificação.");
    if (o.operacoes.indexOf(id) >= 0) return { ok: true, repetida: true, eventos: [] };
    var copia = copiar(o);
    var r = fn(copia) || { ok: true, eventos: [] };
    if (r.ok === false) return r;
    Object.keys(o).forEach(function (k) { delete o[k]; });
    Object.assign(o, copia);
    o.operacoes.push(id);
    if (o.operacoes.length > LIMITE_OPERACOES) o.operacoes = o.operacoes.slice(-LIMITE_OPERACOES);
    return r;
  }

  /* O que a mesa lê sem abrir a ficha. */
  function resumoParaMesa(o) {
    var c = calcular(o);
    var a = {};
    C().CHAVES_ATRIBUTO.forEach(function (k) { a[k] = c.atributos[k].valor; });
    return {
      v: 1, ocupacao: o.ocupacao, ocupacaoNome: nomeDaOcupacao(o), descritor: o.descritor, nivel: o.nivel,
      epicas: o.epicas.map(function (e) { return { ocupacao: e.ocupacao, nivel: e.nivel }; }),
      atributos: a, ferimentos: o.ferimentos, situacao: o.estado.situacao,
      caracteristicas: o.caracteristicas.map(function (x) { return C().CARACTERISTICAS[x.chave].nome + (x.quantidade ? " (" + x.quantidade + ")" : ""); }),
      efeitos: o.efeitos.map(function (e) { return { nome: e.nome, ate: e.ate, turnos: e.turnos }; }).slice(0, 12),
      protecoes: c.protecoes.filter(function (i) { return i.equipado; }).map(function (i) { return { id: i.id, nome: i.nome, atual: i.durabilidade ? i.durabilidade.atual : 0, original: i.durabilidade ? i.durabilidade.original : 0 }; }).slice(0, 8),
      armas: c.armas.map(function (i) { return { id: i.id, nome: i.nome, bonus: defDoItem(i).arma.bonus || 0, municao: i.municao ? { atual: i.municao.atual, max: i.municao.max } : null, recarregar: i.precisaRecarregar }; }).slice(0, 8),
      melhorArma: c.armas.reduce(function (m, i) { return Math.max(m, defDoItem(i).arma.bonus || 0); }, 0),
      usos: tecnicasDe(o).filter(function (t) { return t.uso === "dia"; }).map(function (t) { return { chave: t.chave, nome: t.nome, usado: usoDiario(o, t.chave) }; }),
      medo: o.opcoes.adaptacoes.cthulin ? o.adaptacoes.cthulin.medo : null,
      dia: o.tempo.dia,
    };
  }

  global.RAMAGoblins = {
    VERSAO_BLOCO: VERSAO_BLOCO, SITUACOES: SITUACOES, FIM: FIM, DURACOES: DURACOES,
    fichaVazia: fichaVazia, normalizar: normalizar, normalizarItem: normalizarItem, inteiro: inteiro, novoId: novoId, copiar: copiar, evento: evento, registrar: registrar,
    ativo: ativo, nomeDaOcupacao: nomeDaOcupacao, ocupacoesDe: ocupacoesDe, tecnicasDe: tecnicasDe, temTecnica: temTecnica, usoDiario: usoDiario,
    defDoItem: defDoItem, disponivel: disponivel, vestido: vestido, calcular: calcular, valor: valor, imuneAFogo: imuneAFogo, verificarFim: verificarFim,
    adicionarEfeito: function (o, def) { var ev = []; adicionarEfeito(o, def, ev); return ok(ev); }, removerEfeito: removerEfeito, temEfeito: temEfeito, expirar: expirar,
    iniciarBatalha: iniciarBatalha, fimDaBatalha: fimDaBatalha, fimDoTurno: fimDoTurno, novoDia: novoDia,
    ferimentosQueChegam: ferimentosQueChegam, sofrer: sofrer, curar: curar, esquivar: esquivar, receberAtaque: receberAtaque,
    montarTeste: montarTeste, testar: testar, deuRuim: deuRuim, posRolagem: posRolagem, continuarRolagem: continuarRolagem,
    montarAtaque: montarAtaque, atacar: atacar, recarregar: recarregar, reabastecer: reabastecer, pegarDeVolta: pegarDeVolta,
    magiasDisponiveis: magiasDisponiveis, montarConjuracao: montarConjuracao, conjurar: conjurar,
    usarTecnica: usarTecnica, receberEfeito: receberEfeito,
    derrotouOponente: derrotouOponente, ocupacoesLivres: ocupacoesLivres, escolherOcupacaoEpica: escolherOcupacaoEpica,
    novoItem: novoItem, adicionarItem: adicionarItem, restricaoDeUso: restricaoDeUso, equipar: equipar, removerItem: removerItem, marcarDestruido: marcarDestruido, usarItem: usarItem,
    passarMinuto: passarMinuto, bombaRelogio: bombaRelogio,
    receberMedo: receberMedo, verHorror: verHorror, descansarEmLugarSagrado: descansarEmLugarSagrado,
    gerarPraga: gerarPraga, statsDaPraga: statsDaPraga, procurarPraga: procurarPraga, capturarPraga: capturarPraga, verificarEvolucao: verificarEvolucao, ferirPraga: ferirPraga, ataqueDePraga: ataqueDePraga,
    gerarEstudante: gerarEstudante, adicionarEstudante: adicionarEstudante, conversar: conversar, perguntarSegredo: perguntarSegredo, agradar: agradar, mudarReacao: mudarReacao, tentarRomance: tentarRomance, resolverBriga: resolverBriga,
    coletar: coletar, plantar: plantar, colher: colher, guardarPeixe: guardarPeixe, construir: construir, cozinhar: cozinhar, heranca: heranca,
    sorteioDeNome: sorteioDeNome, sortearCaracteristicas: sortearCaracteristicas, criarAleatoria: criarAleatoria, rerrolarCaracteristica: rerrolarCaracteristica,
    pendencias: pendencias, concluirCriacao: concluirCriacao, novoParente: novoParente, corrigirSituacao: corrigirSituacao, voltarComoMortoVivo: voltarComoMortoVivo,
    aplicarOperacao: aplicarOperacao, resumoParaMesa: resumoParaMesa,
  };
})(typeof window !== "undefined" ? window : globalThis);
/* <<< js/goblins/regras.js */

/* >>> js/goblins/mesa.js */
/* =====================================================================
   R.A.M.A. — Malditos Goblins · a mesa da campanha (o Covil)
   =====================================================================
   O estado que o mestre guarda numa campanha de Malditos Goblins
   (CAMPANHA_GOBLINS, uma linha por campanha). Puro como o resto: quem
   rola passa o rolador. O mesmo arquivo roda no servidor.

     regras        as regras opcionais e adaptações da campanha (o
                   mestre aplica às fichas por goblins_operar)
     dia           o dia da campanha
     combate       participantes (goblins, inimigos do catálogo,
                   aliados), ordem MANUAL (p. 15: quem surpreende age
                   primeiro, os goblins escolhem a ordem entre si),
                   rodada, vez, efeitos com duração por marco, ações
                   demoradas (Galinha Explosiva, Uivo do Lobo, Veneno),
                   efeitos da mesa (Tempestade)
     sorteios      cada sorteio com tabela, dados e resultado, guardado
                   pelo id da operação: refazer a mesma operação devolve
                   o MESMO sorteio, e sortear de novo é outro registro
     masmorras     as geradas (p. 28–29), segmento a segmento
     rivais        o Bando Rival (p. 23)
     negociacoes   o registro das negociações (p. 18)
     registro      o que aconteceu

   Valores dos inimigos: `null` é atributo que não existe (o "-" do
   livro), 0 é zero, e a Besta Indescritível não tem número nenhum. A
   proteção do inimigo é um contador À PARTE da Vitalidade.
   ===================================================================== */

(function (global) {
  "use strict";

  var VERSAO = 1;
  var MAX_SORTEIOS = 200, MAX_REGISTRO = 300, MAX_PARTICIPANTES = 60, MAX_MASMORRAS = 12, MAX_SEGMENTOS = 40;

  function C() { return global.RAMAGoblinsCatalogo; }
  function D() { return global.RAMAGoblinsDados; }

  function copiar(x) { return x === undefined ? undefined : JSON.parse(JSON.stringify(x)); }
  var contador = 0;
  function novoId(p) {
    var U = global.RAMAUtil;
    if (U && U.uuid) return (p || "m") + "-" + U.uuid().replace(/-/g, "").slice(0, 16);
    contador++;
    return (p || "m") + "-" + Date.now().toString(36) + "-" + contador;
  }
  function lista(v) { return Array.isArray(v) ? v : []; }
  function objeto(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  function texto(v, max) { return typeof v === "string" ? v.slice(0, max || 200) : ""; }
  function inteiro(v, min, padrao) {
    var n = Math.floor(Number(v));
    if (!isFinite(n)) n = padrao === undefined ? 0 : padrao;
    return min !== undefined && min !== null && n < min ? min : n;
  }
  /* Número ou null (atributo que não existe). */
  function numeroOuNulo(v) { if (v === null || v === undefined || v === "") return null; var n = Math.floor(Number(v)); return isFinite(n) ? n : null; }
  function chaveValida(v) { return typeof v === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(v); }
  function falha(m) { return { ok: false, motivo: m }; }

  function vazio() {
    return {
      v: VERSAO,
      regras: { vozGoblin: false, deuRuim: false, niveisEpicos: false, explosoesManuais: false, adaptacoes: { cthulin: false, pokepragas: false, wargoblin: false, goblinHigh: false, vale: false } },
      dia: 1,
      combate: { ativo: false, rodada: 0, vez: 0, surpresa: "", ordem: [], participantes: [], acoes: [], efeitosDaMesa: [] },
      sorteios: [], masmorras: [], rivais: [], negociacoes: [], registro: [], notas: "", seq: 0,
    };
  }

  function normalizarEfeito(b) {
    var x = objeto(b);
    var e = { id: chaveValida(x.id) ? x.id : novoId("ef"), chave: texto(x.chave, 60) || "efeito", nome: texto(x.nome, 120) || "Efeito", ate: ["turnos", "fimDaBatalha", "manual", "proximoAtaque"].indexOf(x.ate) >= 0 ? x.ate : "manual", turnos: inteiro(x.turnos, 0), ataque: inteiro(x.ataque), semAgir: x.semAgir === true, semAtaque: x.semAtaque === true, porTurno: inteiro(x.porTurno, 0), porMinuto: inteiro(x.porMinuto, 0), fonte: texto(x.fonte, 120) };
    return e;
  }

  function normalizarParticipante(b) {
    var x = objeto(b);
    var p = {
      id: chaveValida(x.id) ? x.id : novoId("pa"),
      tipo: ["pc", "inimigo", "aliado"].indexOf(x.tipo) >= 0 ? x.tipo : "inimigo",
      personagemId: chaveValida(x.personagemId) ? x.personagemId : "",
      chave: chaveValida(x.chave) ? x.chave : "",
      nome: texto(x.nome, 80) || "Participante",
      lado: x.lado === "goblins" ? "goblins" : "inimigos",
      combate: numeroOuNulo(x.combate), bonusCombate: numeroOuNulo(x.bonusCombate), nocao: numeroOuNulo(x.nocao), habilidade: numeroOuNulo(x.habilidade), vitalidade: numeroOuNulo(x.vitalidade),
      protecao: x.protecao && typeof x.protecao === "object" ? { atual: inteiro(x.protecao.atual, 0), original: inteiro(x.protecao.original, 0) } : null,
      ferimentos: inteiro(x.ferimentos, 0),
      efeitos: lista(x.efeitos).slice(0, 20).map(normalizarEfeito),
      derrotado: x.derrotado === true,
      indescritivel: x.indescritivel === true,
      turnosRestantes: x.turnosRestantes === null || x.turnosRestantes === undefined ? null : inteiro(x.turnosRestantes, 0),
      ateFimDaBatalha: x.ateFimDaBatalha === true,
      oculto: x.oculto === true,
      nota: texto(x.nota, 400),
    };
    return p;
  }

  function normalizar(bruto) {
    var b = objeto(bruto);
    var e = vazio();
    var rg = objeto(b.regras), ad = objeto(rg.adaptacoes);
    ["vozGoblin", "deuRuim", "niveisEpicos", "explosoesManuais"].forEach(function (k) { e.regras[k] = rg[k] === true; });
    Object.keys(e.regras.adaptacoes).forEach(function (k) { e.regras.adaptacoes[k] = ad[k] === true; });
    e.dia = inteiro(b.dia, 1, 1);
    var cb = objeto(b.combate);
    e.combate.ativo = cb.ativo === true;
    e.combate.rodada = inteiro(cb.rodada, 0);
    e.combate.vez = inteiro(cb.vez, 0);
    e.combate.surpresa = ["goblins", "inimigos", ""].indexOf(cb.surpresa) >= 0 ? cb.surpresa : "";
    e.combate.participantes = lista(cb.participantes).slice(0, MAX_PARTICIPANTES).map(normalizarParticipante);
    var ids = e.combate.participantes.map(function (p) { return p.id; });
    e.combate.ordem = lista(cb.ordem).filter(function (id) { return ids.indexOf(id) >= 0; }).filter(function (id, i, t) { return t.indexOf(id) === i; });
    ids.forEach(function (id) { if (e.combate.ordem.indexOf(id) < 0) e.combate.ordem.push(id); });
    if (e.combate.vez >= e.combate.ordem.length) e.combate.vez = 0;
    e.combate.acoes = lista(cb.acoes).slice(0, 30).map(function (a) {
      var y = objeto(a);
      return { id: chaveValida(y.id) ? y.id : novoId("ac"), nome: texto(y.nome, 120), turnos: inteiro(y.turnos, 0), tipo: texto(y.tipo, 30), ferimentos: inteiro(y.ferimentos, 0), inimigo: chaveValida(y.inimigo) ? y.inimigo : "", fonte: texto(y.fonte, 120) };
    });
    e.combate.efeitosDaMesa = lista(cb.efeitosDaMesa).slice(0, 20).map(normalizarEfeito);
    e.sorteios = lista(b.sorteios).slice(-MAX_SORTEIOS).map(function (s) {
      var y = objeto(s);
      return { id: chaveValida(y.id) ? y.id : novoId("so"), n: inteiro(y.n, 0), tabela: texto(y.tabela, 60), nome: texto(y.nome, 120), pagina: y.pagina ? inteiro(y.pagina, 0) : null, dados: lista(y.dados).map(function (d) { return inteiro(d, 0); }).slice(0, 40), resultado: y.resultado === undefined ? null : copiar(y.resultado), texto: texto(y.texto, 600), detalhes: lista(y.detalhes).slice(0, 30).map(function (d) { return copiar(objeto(d)); }), oculto: y.oculto === true, dia: inteiro(y.dia, 0) };
    });
    e.masmorras = lista(b.masmorras).slice(-MAX_MASMORRAS).map(function (m) {
      var y = objeto(m);
      return { id: chaveValida(y.id) ? y.id : novoId("ms"), tipo: C().MASMORRAS[y.tipo] ? y.tipo : "caverna", dadosTipo: lista(y.dadosTipo).map(function (d) { return inteiro(d, 0); }), segmentos: lista(y.segmentos).slice(0, MAX_SEGMENTOS).map(function (s) { return copiar(objeto(s)); }), oculto: y.oculto === true, nome: texto(y.nome, 80) };
    });
    e.rivais = lista(b.rivais).slice(0, 20).map(function (r) { return copiar(objeto(r)); });
    e.negociacoes = lista(b.negociacoes).slice(-40).map(function (r) { return copiar(objeto(r)); });
    e.registro = lista(b.registro).slice(-MAX_REGISTRO).map(function (r) { var y = objeto(r); return { n: inteiro(y.n, 0), dia: inteiro(y.dia, 0), texto: texto(y.texto, 400), privado: y.privado === true }; });
    e.notas = texto(b.notas, 8000);
    e.seq = inteiro(b.seq, 0);
    return e;
  }

  function registrar(e, t, privado) {
    e.seq++;
    e.registro.push({ n: e.seq, dia: e.dia, texto: String(t).slice(0, 400), privado: !!privado });
    if (e.registro.length > MAX_REGISTRO) e.registro = e.registro.slice(-MAX_REGISTRO);
  }

  /* O que os jogadores veem: sem notas, sem o registro privado, sem
     participantes, sorteios e masmorras ocultos. */
  function vistaDosJogadores(e) {
    var v = copiar(e);
    v.notas = "";
    v.registro = v.registro.filter(function (r) { return !r.privado; });
    v.combate.participantes = v.combate.participantes.filter(function (p) { return !p.oculto; });
    var vis = v.combate.participantes.map(function (p) { return p.id; });
    v.combate.ordem = v.combate.ordem.filter(function (id) { return vis.indexOf(id) >= 0; });
    v.sorteios = v.sorteios.filter(function (s) { return !s.oculto; });
    v.masmorras = v.masmorras.filter(function (m) { return !m.oculto; });
    return v;
  }

  /* ---------------------------------------------------------------
     TABELAS (cada uma: id, nome, página, dados, entradas, texto)
     --------------------------------------------------------------- */

  function textoDeEntrada(r) {
    if (r === null || r === undefined) return "Nada";
    if (typeof r === "string") return r;
    if (Array.isArray(r)) return r.join("; ");
    if (r.texto) return r.texto;
    if (r.cor) return r.cor + ": " + r.texto;
    return JSON.stringify(r);
  }

  function nomes(mapa, lista_) { return lista_.map(function (k) { return mapa[k] ? mapa[k].nome || mapa[k] : k; }); }

  function tabelas() {
    var K = C();
    var GH = K.GOBLIN_HIGH;
    var t = {
      nome: { nome: "Nome", pagina: 4, dados: "colunaLinha", entradas: K.NOMES, grupo: "Personagem" },
      ocupacao: { nome: "Ocupação", pagina: 4, dados: "1d6", entradas: nomes(K.OCUPACOES, K.OCUPACAO_D6), grupo: "Personagem" },
      descritor: { nome: "Descritor", pagina: 4, dados: "1d6", entradas: nomes(K.DESCRITORES, K.DESCRITOR_D6), grupo: "Personagem" },
      caracteristica: { nome: "Característica", pagina: 4, dados: "colunaLinha", entradas: K.CARACTERISTICA_2D6.map(function (col) { return col.map(function (k) { return k === "rolarDuasVezes" ? "[Role 2 vezes]" : K.CARACTERISTICAS[k].nome; }); }), grupo: "Personagem" },
      aventura: { nome: "Aventura Aleatória", pagina: 16, dados: "1d6", entradas: K.AVENTURA_D6.map(function (k) { return K.AVENTURAS[k].nome; }), grupo: "Sem mestre" },
      inspiracao: { nome: "Inspiração", pagina: 16, dados: "1d6", entradas: K.INSPIRACAO_D6, grupo: "Sem mestre" },
      resposta: { nome: "Resposta do Mestre", pagina: 16, dados: "1d6", entradas: K.RESPOSTA_D6, grupo: "Sem mestre" },
      viajante: { nome: "Viajante Aleatório", pagina: 18, dados: "2d6", entradas: K.VIAJANTE_2D6, grupo: "Aventuras", encontro: true },
      vitima: { nome: "Vítima Aleatória", pagina: 18, dados: "1d6", entradas: K.VITIMA_D6, grupo: "Aventuras" },
      recompensa: { nome: "Recompensa", pagina: 18, dados: "1d6", entradas: K.RECOMPENSA_D6, grupo: "Aventuras" },
      local: { nome: "Local Aleatório", pagina: 19, dados: "1d6", entradas: K.LOCAL_D6.map(function (k) { return K.LOCAIS[k].nome; }), grupo: "Aventuras", local: true },
      proteger: { nome: "Invasores Aleatórios (Proteger Masmorra)", pagina: 19, dados: "2d6", entradas: K.PROTEGER_2D6, grupo: "Aventuras", encontro: true },
      vizinhos: { nome: "Bando Inimigo Aleatório (Invadir Vizinhos)", pagina: 19, dados: "2d6", entradas: K.VIZINHOS_2D6, grupo: "Aventuras", encontro: true },
      itemMagico: { nome: "Item Mágico", pagina: 24, dados: "1d6", entradas: K.TIPO_MAGICO_D6.map(function (k) { return K.NOMES_TIPO_MAGICO[k]; }), grupo: "Itens", itemMagico: true },
      pocao: { nome: "Cor da Poção", pagina: 27, dados: "1d6", entradas: K.POCAO_D6, grupo: "Itens" },
      anel: { nome: "Efeito do Anel Mágico", pagina: 25, dados: "1d6", entradas: K.ANEL_D6.map(function (a) { return a.texto; }), grupo: "Itens" },
      deuRuim: { nome: "Mas deu ruim…", pagina: 16, dados: "1d6", entradas: K.DEU_RUIM_D6, grupo: "Regras opcionais" },
      caracteristicaRival: { nome: "Característica Rival", pagina: 23, dados: "2d6", entradas: K.CARACTERISTICA_RIVAL_2D6, grupo: "Inimigos" },
      masmorraTipo: { nome: "Tipo da Masmorra", pagina: 28, dados: "1d6", entradas: K.MASMORRA_TIPO_D6.map(function (k) { return K.MASMORRAS[k].nome; }), grupo: "Masmorra" },
      corredor: { nome: "Conteúdo do Corredor", pagina: 29, dados: "1d6", entradas: K.CORREDOR_D6, grupo: "Masmorra" },
      eventoSobrenatural: { nome: "Evento Sobrenatural", pagina: 32, dados: "1d6", entradas: K.CTHULIN.evento, grupo: "Chamado de Cthulin", adaptacao: "cthulin" },
      procurando: { nome: "Procurando PokéPraga", pagina: 35, dados: "1d6", entradas: ["Não encontrou nada", "Uma PokéPraga comum", "Uma PokéPraga comum", "Uma PokéPraga comum", "Uma PokéPraga incomum", "Uma PokéPraga rara"], grupo: "PokéPragas", adaptacao: "pokepragas" },
      reacao: { nome: "Reação", pagina: 38, dados: "1d6", entradas: GH.reacaoD6.map(function (k) { return GH.nomes[k]; }), grupo: "Goblin High", adaptacao: "goblinHigh" },
      conversa: { nome: "Conversa", pagina: 38, dados: "1d6", entradas: GH.conversaD6.map(function (c) { return c.texto; }), grupo: "Goblin High", adaptacao: "goblinHigh" },
      assunto: { nome: "Assunto", pagina: 38, dados: "1d6", entradas: GH.assunto, grupo: "Goblin High", adaptacao: "goblinHigh" },
      gosto: { nome: "Gosto", pagina: 38, dados: "1d6", entradas: GH.gosto, grupo: "Goblin High", adaptacao: "goblinHigh" },
      materia: { nome: "Matéria", pagina: 38, dados: "1d6", entradas: GH.materia, grupo: "Goblin High", adaptacao: "goblinHigh" },
      segredo: { nome: "Segredo", pagina: 38, dados: "1d6", entradas: GH.segredo, grupo: "Goblin High", adaptacao: "goblinHigh" },
      tePego: { nome: "Te pego na saída", pagina: 39, dados: "1d6", entradas: GH.tePego, grupo: "Goblin High", adaptacao: "goblinHigh" },
    };
    Object.keys(t).forEach(function (k) { t[k].id = k; });
    return t;
  }

  /* Monta os inimigos de um encontro: cada quantidade vira número
     (rolando quando é expressão), e a rolagem fica registrada. */
  function resolverGrupo(grupo, rolador) {
    return lista(grupo).map(function (g) {
      var q = typeof g.quantidade === "number" ? { total: g.quantidade, dados: [], expressao: String(g.quantidade) } : D().quantidade(g.quantidade, rolador);
      return { inimigo: g.inimigo, nome: C().INIMIGOS[g.inimigo] ? C().INIMIGOS[g.inimigo].nome : g.inimigo, quantidade: q.total, expressao: q.expressao, dados: q.dados };
    });
  }

  /* Os detalhes de um local (p. 20): quantidades e chances. */
  function gerarLocal(chave, rolador) {
    var def = C().LOCAIS[chave];
    if (!def) return [];
    var det = [];
    def.conteudo.forEach(function (c) {
      var d = { rotulo: c.rotulo, inimigo: c.inimigo || "", itemMagico: !!c.itemMagico, nota: c.nota || "" };
      if (c.expressao) { var q = D().quantidade(c.expressao, rolador); d.quantidade = q.total; d.dados = q.dados; d.expressao = q.expressao; if (c.metadeCriancas) d.criancas = Math.ceil(q.total / 2); }
      else if (c.quantidade) d.quantidade = c.quantidade;
      else if (c.chance) { var ch = D().chance(c.chance === "50%" ? "50%" : "1em6", rolador); d.chance = c.chance; d.dados = ch.dados; d.saiu = ch.saiu; d.quantidade = ch.saiu ? 1 : 0; if (ch.saiu && c.extra) { var qe = D().quantidade(c.extra.expressao, rolador); d.extra = { inimigo: c.extra.inimigo, quantidade: qe.total, dados: qe.dados }; } }
      else if (c.golem) { var gq = D().chance("50%", rolador); d.inimigo = gq.saiu ? "golemPedra" : "golemMadeira"; d.dados = gq.dados; d.quantidade = 1; d.rotulo = "Golem do 2º piso: " + C().INIMIGOS[d.inimigo].nome; }
      det.push(d);
    });
    return det;
  }

  /* Sorteia numa tabela. O id da operação faz o sorteio ÚNICO: pedir
     de novo com o mesmo id devolve o que já saiu. */
  function sortear(e, tabelaId, opId, rolador, opcoes) {
    var op = opcoes || {};
    var id = chaveValida(opId) ? opId : novoId("so");
    var ja = e.sorteios.filter(function (s) { return s.id === id; })[0];
    if (ja) return { ok: true, repetida: true, sorteio: ja };
    var t = tabelas()[tabelaId];
    if (!t) return falha("Tabela desconhecida.");
    var s = D().sortear(t, rolador);
    var reg = { id: id, n: 0, tabela: tabelaId, nome: t.nome, pagina: t.pagina, dados: s.dados.slice(), resultado: s.resultado, texto: textoDeEntrada(s.resultado), detalhes: [], oculto: !!op.oculto, dia: e.dia };
    if (t.encontro && s.resultado && s.resultado.grupo) reg.detalhes = resolverGrupo(s.resultado.grupo, rolador);
    if (t.encontro && s.resultado && s.resultado.bandoRival) reg.detalhes = [{ bandoRival: true, rotulo: "Gere o Bando Rival (ferramenta ao lado)" }];
    if (t.local) { var chave = C().LOCAL_D6[s.dados[0] - 1]; reg.detalhes = gerarLocal(chave, rolador); reg.resultado = { local: chave, texto: C().LOCAIS[chave].nome }; }
    if (t.itemMagico) {
      var tipo = C().TIPO_MAGICO_D6[s.dados[0] - 1];
      var si = D().sortear({ dados: "1d6", entradas: C().MAGICOS_D6[tipo] }, rolador);
      reg.dados.push(si.dados[0]);
      reg.resultado = { tipo: tipo, item: si.resultado };
      reg.texto = C().NOMES_TIPO_MAGICO[tipo] + ": " + C().ITENS_MAGICOS[si.resultado].nome;
      if (si.resultado === "pocao") { var sp = D().sortear({ dados: "1d6", entradas: C().POCAO_D6 }, rolador); reg.dados.push(sp.dados[0]); reg.resultado.cor = sp.indice; reg.texto += " (" + sp.resultado.cor + ")"; }
    }
    if (tabelaId === "aventura") reg.resultado = { aventura: C().AVENTURA_D6[s.dados[0] - 1], texto: reg.texto };
    if (tabelaId === "recompensa" && s.resultado && s.resultado.itemMagico) {
      var sub = sortear(e, "itemMagico", id + "-item", rolador, op);
      if (sub.ok) reg.detalhes = [{ rotulo: "Item mágico", texto: sub.sorteio.texto }];
    }
    e.seq++;
    reg.n = e.seq;
    e.sorteios.push(reg);
    if (e.sorteios.length > MAX_SORTEIOS) e.sorteios = e.sorteios.slice(-MAX_SORTEIOS);
    registrar(e, t.nome + ": " + reg.texto, !!op.oculto);
    return { ok: true, sorteio: reg };
  }

  /* ---------------------------------------------------------------
     COMBATE (p. 15)
     --------------------------------------------------------------- */

  function participanteDoCatalogo(chave, n) {
    var d = C().INIMIGOS[chave];
    if (!d) return null;
    return normalizarParticipante({
      tipo: "inimigo", chave: chave, nome: d.nome + (n ? " " + n : ""), lado: "inimigos",
      combate: d.combate, bonusCombate: d.bonusCombate, nocao: d.nocao, habilidade: d.habilidade, vitalidade: d.vitalidade,
      protecao: d.protecao ? { atual: d.protecao, original: d.protecao } : null, indescritivel: !!d.indescritivel,
    });
  }

  function adicionarInimigos(e, chave, quantidade, opcoes) {
    var op = opcoes || {};
    var d = C().INIMIGOS[chave];
    if (!d) return falha("Inimigo desconhecido.");
    var q = Math.max(1, Math.min(30, inteiro(quantidade, 1, 1)));
    if (e.combate.participantes.length + q > MAX_PARTICIPANTES) return falha("Participantes demais no combate.");
    var ja = e.combate.participantes.filter(function (p) { return p.chave === chave; }).length;
    var novos = [];
    for (var i = 0; i < q; i++) {
      var p = participanteDoCatalogo(chave, q > 1 || ja ? ja + i + 1 : 0);
      if (op.lado === "goblins") { p.lado = "goblins"; p.tipo = "aliado"; }
      if (op.oculto) p.oculto = true;
      if (op.turnos) p.turnosRestantes = inteiro(op.turnos, 1);
      if (op.ateFimDaBatalha) p.ateFimDaBatalha = true;
      e.combate.participantes.push(p);
      e.combate.ordem.push(p.id);
      novos.push(p);
    }
    registrar(e, "Entrou no combate: " + q + "× " + d.nome, !!op.oculto);
    return { ok: true, participantes: novos };
  }

  /* Um goblin de jogador entra pela projeção da ficha (resumo). */
  function adicionarPC(e, pc) {
    var x = objeto(pc);
    if (!chaveValida(x.id)) return falha("Personagem inválido.");
    if (e.combate.participantes.some(function (p) { return p.personagemId === x.id; })) return falha("Já está no combate.");
    var r = objeto(x.resumo), at = objeto(r.atributos);
    var p = normalizarParticipante({ tipo: "pc", personagemId: x.id, nome: x.nome, lado: "goblins", combate: at.combate, nocao: at.nocao, habilidade: at.habilidade, vitalidade: at.vitalidade, ferimentos: r.ferimentos });
    e.combate.participantes.push(p);
    e.combate.ordem.push(p.id);
    return { ok: true, participante: p };
  }

  function participante(e, id) { return e.combate.participantes.filter(function (p) { return p.id === id; })[0]; }

  function removerParticipante(e, id) {
    var p = participante(e, id);
    if (!p) return falha("Participante não encontrado.");
    e.combate.participantes = e.combate.participantes.filter(function (x) { return x.id !== id; });
    e.combate.ordem = e.combate.ordem.filter(function (x) { return x !== id; });
    if (e.combate.vez >= e.combate.ordem.length) e.combate.vez = 0;
    return { ok: true };
  }

  /* Ordem manual: subir/descer. */
  function moverNaOrdem(e, id, delta) {
    var o = e.combate.ordem, i = o.indexOf(id), j = i + (delta > 0 ? 1 : -1);
    if (i < 0 || j < 0 || j >= o.length) return falha("Não dá para mover.");
    var atual = o[e.combate.vez];
    o[i] = o[j]; o[j] = id;
    e.combate.vez = Math.max(0, o.indexOf(atual));
    return { ok: true };
  }

  /* Quem surpreende age primeiro (p. 15). A ordem DENTRO de cada lado
     é a que já está (os goblins decidem entre si). */
  function iniciarCombate(e, surpresa) {
    var lado = function (l) { return e.combate.ordem.filter(function (id) { var p = participante(e, id); return p && p.lado === l; }); };
    var g = lado("goblins"), i = lado("inimigos");
    e.combate.surpresa = surpresa === "inimigos" ? "inimigos" : surpresa === "goblins" ? "goblins" : "";
    if (e.combate.surpresa === "inimigos") e.combate.ordem = i.concat(g);
    else if (e.combate.surpresa === "goblins") e.combate.ordem = g.concat(i);
    e.combate.ativo = true;
    e.combate.rodada = 1;
    e.combate.vez = 0;
    registrar(e, "Começou o combate" + (e.combate.surpresa === "goblins" ? " (os goblins pegaram os inimigos distraídos)" : e.combate.surpresa === "inimigos" ? " (os goblins esbarraram nos inimigos)" : ""));
    return { ok: true, eventos: [{ tipo: "momento", momento: "iniciarBatalha" }] };
  }

  function vezAtual(e) { return participante(e, e.combate.ordem[e.combate.vez]); }

  /* Fim da vez do participante atual: efeitos por turno dele; o
     esqueleto animado conta os turnos; no fim da rodada, as ações
     demoradas andam. Devolve o que a tela precisa aplicar ou mostrar
     (momentos de ficha, explosões, regeneração). */
  function proximaVez(e, rolador) {
    if (!e.combate.ativo) return falha("Nenhum combate em curso.");
    var eventos = [];
    var p = vezAtual(e);
    if (p) {
      p.efeitos = p.efeitos.filter(function (ef) {
        if (ef.ate === "turnos") { ef.turnos--; if (ef.turnos <= 0) { eventos.push({ tipo: "efeitoExpirou", participante: p.nome, nome: ef.nome }); return false; } }
        return true;
      });
      if (p.turnosRestantes !== null) {
        p.turnosRestantes--;
        if (p.turnosRestantes <= 0) { p.derrotado = true; eventos.push({ tipo: "dispensado", participante: p.nome }); registrar(e, p.nome + " volta a ser só ossos"); }
      }
      if (p.tipo === "pc") eventos.push({ tipo: "momento", momento: "fimDoTurno", personagemId: p.personagemId });
    }
    var vivos = e.combate.ordem.length;
    e.combate.vez++;
    var guarda = 0;
    while (guarda < vivos + 1) {
      guarda++;
      if (e.combate.vez >= e.combate.ordem.length) { e.combate.vez = 0; e.combate.rodada++; eventos = eventos.concat(fimDaRodada(e, rolador)); }
      var q = vezAtual(e);
      if (q && !q.derrotado) break;
      e.combate.vez++;
    }
    var atual = vezAtual(e);
    if (atual) eventos = eventos.concat(inicioDaVez(e, atual, rolador));
    return { ok: true, eventos: eventos };
  }

  /* No turno do participante: Regeneração (Troll 1d6−1, Shogoth 3) e o
     que prende (Giro Mortal: 1 ferimento por turno). */
  function inicioDaVez(e, p, rolador) {
    var ev = [];
    var def = C().INIMIGOS[p.chave];
    var reg = def && lista(def.habilidades).filter(function (h) { return h.regeneracao; })[0];
    if (reg && p.ferimentos > 0 && rolador) {
      var q = D().quantidade(reg.regeneracao, rolador);
      var tira = Math.min(p.ferimentos, q.total);
      p.ferimentos -= tira;
      ev.push({ tipo: "regeneracao", participante: p.nome, dados: q.dados, valor: tira });
      registrar(e, p.nome + " regenerou " + tira + " ferimento(s)");
    }
    p.efeitos.forEach(function (ef) {
      if (ef.porTurno) {
        ev.push({ tipo: "porTurno", participante: p.nome, nome: ef.nome, ferimentos: ef.porTurno, personagemId: p.personagemId || "" });
        if (p.tipo !== "pc") ferir(e, p.id, ef.porTurno, {});
      }
    });
    return ev;
  }

  function fimDaRodada(e) {
    var ev = [];
    e.combate.acoes = e.combate.acoes.filter(function (a) {
      a.turnos--;
      if (a.turnos > 0) return true;
      ev.push({ tipo: "acaoDemorada", nome: a.nome, ferimentos: a.ferimentos, inimigo: a.inimigo, acao: a.tipo });
      if (a.tipo === "uivo" && a.inimigo) adicionarInimigos(e, a.inimigo, 1);
      registrar(e, a.nome + ": aconteceu");
      return false;
    });
    return ev;
  }

  function encerrarCombate(e) {
    e.combate.ativo = false;
    e.combate.rodada = 0;
    e.combate.vez = 0;
    e.combate.acoes = [];
    e.combate.efeitosDaMesa = e.combate.efeitosDaMesa.filter(function (x) { return x.ate !== "fimDaBatalha"; });
    e.combate.participantes.forEach(function (p) {
      p.efeitos = p.efeitos.filter(function (x) { return x.ate === "manual"; });
      if (p.ateFimDaBatalha) p.derrotado = true;
    });
    registrar(e, "Fim do combate");
    return { ok: true, eventos: [{ tipo: "momento", momento: "fimDaBatalha" }] };
  }

  function limparDerrotados(e) {
    var fora = e.combate.participantes.filter(function (p) { return p.derrotado && p.tipo !== "pc"; }).map(function (p) { return p.id; });
    fora.forEach(function (id) { removerParticipante(e, id); });
    return { ok: true, removidos: fora.length };
  }

  /* Ferir um participante (não-PC: os PCs são feridos na ficha, pelo
     servidor). `bloquear`: a proteção absorve até a durabilidade.
     Vulnerabilidade (Golem de Madeira) dobra fogo; Imunidade (Dragão)
     zera fogo. Mais ferimentos que Vitalidade: derrotado. */
  function ferir(e, id, n, tipo) {
    var t = tipo || {};
    var p = participante(e, id);
    if (!p) return falha("Participante não encontrado.");
    if (p.tipo === "pc") return falha("Goblins de jogador se ferem pela ficha.");
    var def = C().INIMIGOS[p.chave] || {};
    var valor = inteiro(n, 0);
    var notas = [];
    if (t.fogo && def.imuneFogo) { valor = 0; notas.push("imune a fogo"); }
    if (t.fogo && def.vulneravelFogo && valor) { valor *= 2; notas.push("vulnerável a fogo: dobro"); }
    if (t.bloquear && p.protecao && p.protecao.atual > 0 && valor > 0 && !t.ignoraProtecao) {
      var abs = Math.min(valor, p.protecao.atual);
      p.protecao.atual -= abs; valor -= abs;
      notas.push("proteção absorveu " + abs);
    }
    var autom = inteiro(t.automatico, 0);
    if (autom) { valor += autom; notas.push("+" + autom + " automático"); }
    p.ferimentos += valor;
    var ev = [{ tipo: "ferimentos", participante: p.nome, valor: valor, notas: notas }];
    if (p.vitalidade !== null && !p.indescritivel && p.ferimentos > p.vitalidade && !p.derrotado) {
      p.derrotado = true;
      ev.push({ tipo: "derrotado", participante: p.nome, id: p.id });
      registrar(e, p.nome + " foi derrotado");
    }
    registrar(e, p.nome + ": +" + valor + " ferimento(s)" + (notas.length ? " (" + notas.join(", ") + ")" : ""), p.oculto);
    return { ok: true, eventos: ev, valor: valor };
  }

  function curarParticipante(e, id, quanto) {
    var p = participante(e, id);
    if (!p) return falha("Participante não encontrado.");
    var antes = p.ferimentos;
    p.ferimentos = quanto === "todos" ? 0 : Math.max(0, p.ferimentos - inteiro(quanto, 0));
    if (p.derrotado && p.vitalidade !== null && p.ferimentos <= p.vitalidade && p.turnosRestantes === null) p.derrotado = false;
    registrar(e, p.nome + ": −" + (antes - p.ferimentos) + " ferimento(s)");
    return { ok: true };
  }

  function efeitoEmParticipante(e, id, def) {
    var p = participante(e, id);
    if (!p) return falha("Participante não encontrado.");
    var ef = normalizarEfeito(def);
    p.efeitos = p.efeitos.filter(function (x) { return x.chave !== ef.chave; });
    p.efeitos.push(ef);
    registrar(e, p.nome + ": " + ef.nome);
    return { ok: true, efeito: ef };
  }

  function removerEfeitoDeParticipante(e, id, efId) {
    var p = participante(e, id);
    if (!p) return falha("Participante não encontrado.");
    p.efeitos = p.efeitos.filter(function (x) { return x.id !== efId; });
    return { ok: true };
  }

  /* A parada de ataque de um inimigo: Combate + dados da arma (o número
     entre parênteses) + efeitos (Combate Sincronizado: −1). */
  function paradaDeInimigo(e, id, pedido) {
    var p = participante(e, id);
    var q = pedido || {};
    if (!p) return { ok: false, motivo: "Participante não encontrado." };
    if (p.indescritivel || p.combate === null) return { ok: false, motivo: "Sem número de Combate: “alguma coisa acontece…” — a mesa narra." };
    if (p.efeitos.some(function (x) { return x.semAgir; })) return { ok: false, motivo: p.nome + " não pode agir." };
    if (p.efeitos.some(function (x) { return x.semAtaque; }) && q.tipo !== "esquiva") return { ok: false, motivo: p.nome + " não pode atacar agora." };
    var parcelas = [];
    if (q.tipo !== "esquiva" && p.bonusCombate) parcelas.push({ fonte: "Arma", valor: p.bonusCombate });
    if (q.tipo !== "esquiva") p.efeitos.forEach(function (x) { if (x.ataque) parcelas.push({ fonte: x.nome, valor: x.ataque }); });
    parcelas = parcelas.concat(lista(q.extras));
    var at = q.atributo && ["habilidade", "nocao"].indexOf(q.atributo) >= 0 ? q.atributo : "combate";
    if (p[at] === null) return { ok: false, motivo: p.nome + " não tem " + (at === "nocao" ? "Noção" : "Habilidade") + "." };
    var m = D().montarParada({ fonte: at === "combate" ? "Combate" : at === "nocao" ? "Noção" : "Habilidade", valor: p[at] }, parcelas, q.dificuldade);
    return { ok: true, parada: m.parada, composicao: m.composicao, participante: p };
  }

  /* O inimigo ataca (ou testa): rola na mesa, sem explosão de goblin
     (os dados todos em 1 só viram nota). Consome "próximo ataque". */
  function rolarPorParticipante(e, id, pedido, rolador) {
    var q = pedido || {};
    var m = paradaDeInimigo(e, id, q);
    if (!m.ok) return falha(m.motivo);
    var p = m.participante;
    var r = D().rolar({ parada: m.parada, composicao: m.composicao, tipo: q.tipo === "esquiva" ? "esquiva" : q.atributo ? "teste" : "ataque", rotulo: p.nome + (q.rotulo ? " · " + q.rotulo : q.tipo === "esquiva" ? " · esquiva" : " · ataque"), podeExplodirGoblin: p.tipo === "pc", seZero: q.seZero || "falha" }, rolador);
    if (q.tipo !== "esquiva" && !q.atributo) p.efeitos = p.efeitos.filter(function (x) { return x.ate !== "proximoAtaque"; });
    if (q.tipo === "esquiva") efeitoEmParticipante(e, p.id, { chave: "esquivou", nome: "Esquivou: não ataca no próximo turno", ate: "turnos", turnos: 1, semAtaque: true });
    registrar(e, r.rotulo + ": " + r.classificacao.hits + " hit(s)", p.oculto);
    return { ok: true, rolagem: r };
  }

  /* Combate Sincronizado (p. 17): 3+ goblins no mesmo alvo neste turno
     → o alvo rola 1 dado a menos no próximo ataque. */
  function combateSincronizado(e, alvoId) {
    return efeitoEmParticipante(e, alvoId, { chave: "sincronizado", nome: "Confuso (Combate Sincronizado): −1 dado no próximo ataque", ate: "proximoAtaque", ataque: -1 });
  }

  function acaoDemorada(e, def) {
    var a = { id: novoId("ac"), nome: texto(def.nome, 120) || "Ação", turnos: Math.max(1, inteiro(def.turnos, 1, 1)), tipo: texto(def.tipo, 30), ferimentos: inteiro(def.ferimentos, 0), inimigo: chaveValida(def.inimigo) ? def.inimigo : "", fonte: texto(def.fonte, 120) };
    e.combate.acoes.push(a);
    registrar(e, a.nome + " (em " + a.turnos + " rodada(s))");
    return { ok: true, acao: a };
  }

  function efeitoDaMesa(e, def) {
    var ef = normalizarEfeito(def);
    e.combate.efeitosDaMesa.push(ef);
    registrar(e, ef.nome);
    return { ok: true, efeito: ef };
  }

  /* Um participante ao acaso (Tempestade, Troca 0): só entre os que
     ainda estão de pé. */
  function participanteAleatorio(e, rolador, filtro) {
    var vivos = e.combate.participantes.filter(function (p) { return !p.derrotado && (!filtro || filtro(p)); });
    if (!vivos.length) return null;
    var i = Math.floor(Number(rolador(vivos.length))) - 1;
    return vivos[Math.max(0, Math.min(vivos.length - 1, i))];
  }

  /* ---------------------------------------------------------------
     NEGOCIAÇÃO (p. 18)
     --------------------------------------------------------------- */

  /* pedido: { negociador: { nome, nocao, personagemId }, maisForte:
     Combate do goblin mais forte, vitima: { nome, combate, nocao } } */
  function negociar(e, pedido, opId, rolador) {
    var p = pedido || {};
    var id = chaveValida(opId) ? opId : novoId("ng");
    var ja = e.negociacoes.filter(function (n) { return n.id === id; })[0];
    if (ja) return { ok: true, repetida: true, negociacao: ja };
    var neg = objeto(p.negociador), vit = objeto(p.vitima);
    var reg = { id: id, dia: e.dia, negociador: texto(neg.nome, 80), personagemId: chaveValida(neg.personagemId) ? neg.personagemId : "", vitima: texto(vit.nome, 80) };
    if (numeroOuNulo(vit.combate) !== null && inteiro(vit.combate) > inteiro(p.maisForte)) {
      reg.resultado = "ataca";
      reg.texto = reg.vitima + " tem mais Combate que o goblin mais forte: não negocia e ataca primeiro.";
    } else {
      var rg = D().rolar({ parada: inteiro(neg.nocao, 0), tipo: "oposto", rotulo: "Negociação · " + reg.negociador, podeExplodirGoblin: true, seZero: "falha" }, rolador);
      var rv = D().rolar({ parada: inteiro(vit.nocao, 0), tipo: "oposto", rotulo: "Negociação · " + reg.vitima, podeExplodirGoblin: false, seZero: "falha" }, rolador);
      var d = D().disputa(rg.classificacao.hits, rv.classificacao.hits);
      reg.rolagens = { goblin: D().paraHistorico(rg), vitima: D().paraHistorico(rv) };
      reg.hits = { goblin: d.a, vitima: d.b };
      reg.goblinExplode = rg.classificacao.goblinExplode;
      reg.resultado = d.vence === "a" ? "vitimaEntrega" : d.vence === "b" ? "goblinsEntregam" : "continua";
      reg.texto = d.vence === "a" ? reg.vitima + " entrega tudo." : d.vence === "b" ? "Os goblins ficam confusos e entregam tudo a " + reg.vitima + "." : "Empate: a negociação continua.";
      if (reg.goblinExplode) reg.texto += " Todos os dados do negociador caíram em 1: ele explode!";
    }
    e.negociacoes.push(reg);
    if (e.negociacoes.length > 40) e.negociacoes = e.negociacoes.slice(-40);
    registrar(e, "Negociação com " + reg.vitima + ": " + reg.texto);
    return { ok: true, negociacao: reg };
  }

  /* ---------------------------------------------------------------
     BANDO RIVAL (p. 23)
     --------------------------------------------------------------- */

  /* pcs: [{ id, nome, resumo }] — cada goblin do grupo ganha um gêmeo
     rival com os mesmos números e uma característica rival (2d6). */
  function gerarBandoRival(e, pcs, opId, rolador) {
    var id = chaveValida(opId) ? opId : novoId("br");
    var ja = e.rivais.filter(function (r) { return r.id === id; })[0];
    if (ja) return { ok: true, repetida: true, bando: ja };
    var membros = lista(pcs).slice(0, 12).map(function (pc) {
      var s = D().sortear({ dados: "2d6", entradas: C().CARACTERISTICA_RIVAL_2D6 }, rolador);
      var r = objeto(pc.resumo), at = objeto(r.atributos);
      return { nome: texto(pc.nome, 80) + " (rival)", base: texto(pc.nome, 80), ocupacao: texto(r.ocupacaoNome, 60), atributos: { combate: numeroOuNulo(at.combate), habilidade: numeroOuNulo(at.habilidade), nocao: numeroOuNulo(at.nocao), vitalidade: numeroOuNulo(at.vitalidade) }, bonusCombate: inteiro(r.melhorArma, 0), caracteristica: { dados: s.dados, texto: s.resultado } };
    });
    var bando = { id: id, dia: e.dia, membros: membros };
    e.rivais.push(bando);
    if (e.rivais.length > 20) e.rivais = e.rivais.slice(-20);
    registrar(e, "Bando Rival gerado (" + membros.length + " goblin(s))");
    return { ok: true, bando: bando };
  }

  function rivaisNoCombate(e, bandoId) {
    var b = e.rivais.filter(function (r) { return r.id === bandoId; })[0];
    if (!b) return falha("Bando não encontrado.");
    b.membros.forEach(function (m) {
      var p = normalizarParticipante({ tipo: "inimigo", nome: m.nome, lado: "inimigos", combate: m.atributos.combate, bonusCombate: m.bonusCombate, nocao: m.atributos.nocao, habilidade: m.atributos.habilidade, vitalidade: m.atributos.vitalidade, nota: m.caracteristica.texto });
      e.combate.participantes.push(p);
      e.combate.ordem.push(p.id);
    });
    registrar(e, "O Bando Rival entrou no combate");
    return { ok: true };
  }

  /* ---------------------------------------------------------------
     MASMORRA (p. 28–29)
     --------------------------------------------------------------- */

  /* "1d6 Goblins" → rola; o texto fica com o número. */
  function resolverTexto(t, rolador) {
    var m = /(\d*d\d+(?:\s*[−-]\s*\d+)?)/.exec(t);
    if (!m) return { texto: t, dados: [] };
    var q = D().quantidade(m[1].replace(/−/g, "-").replace(/\s/g, ""), rolador);
    return { texto: t.replace(m[1], String(q.total)) + " (" + m[1] + ": " + q.dados.join("+") + ")", dados: q.dados, quantidade: q.total };
  }

  /* A partir da entrada: cada segmento rola 1d6 + quantos segmentos há
     entre ele e a entrada; cada porta abre um caminho. Depois, o
     conteúdo de cada corredor e de cada sala (pela tabela do tipo). */
  function gerarMasmorra(e, opId, rolador, opcoes) {
    var op = opcoes || {};
    var id = chaveValida(opId) ? opId : novoId("ms");
    var ja = e.masmorras.filter(function (m) { return m.id === id; })[0];
    if (ja) return { ok: true, repetida: true, masmorra: ja };
    var tipo, dadosTipo = [];
    if (op.tipo && C().MASMORRAS[op.tipo]) tipo = op.tipo;
    else { var st = D().sortear({ dados: "1d6", entradas: C().MASMORRA_TIPO_D6 }, rolador); tipo = st.resultado; dadosTipo = st.dados; }
    var segmentos = [];
    var fila = [{ pai: null, profundidade: 0 }];
    while (fila.length && segmentos.length < MAX_SEGMENTOS) {
      var x = fila.shift();
      var f = D().quantidade("1d6", rolador).total;
      var indice = Math.min(12, f + x.profundidade);
      var seg = C().SEGMENTOS[indice];
      var s = { id: "s" + (segmentos.length + 1), pai: x.pai, profundidade: x.profundidade, dado: f, indice: indice, tipo: seg.tipo, nome: seg.nome, medida: seg.medida, portas: seg.portas };
      segmentos.push(s);
      for (var k = 0; k < seg.portas; k++) fila.push({ pai: s.id, profundidade: x.profundidade + 1 });
    }
    var cortada = fila.length > 0;
    segmentos.forEach(function (s) {
      var c = D().quantidade("1d6", rolador).total;
      var t = s.tipo === "corredor" ? C().CORREDOR_D6[c - 1] : C().MASMORRAS[tipo].salas[c - 1];
      var r = resolverTexto(t, rolador);
      s.conteudo = { dado: c, texto: r.texto, base: t };
    });
    var m = { id: id, tipo: tipo, dadosTipo: dadosTipo, segmentos: segmentos, oculto: op.oculto !== false, nome: texto(op.nome, 80) || C().MASMORRAS[tipo].nome, cortada: cortada };
    e.masmorras.push(m);
    if (e.masmorras.length > MAX_MASMORRAS) e.masmorras = e.masmorras.slice(-MAX_MASMORRAS);
    registrar(e, "Masmorra gerada: " + m.nome + " (" + segmentos.length + " segmentos)", m.oculto);
    return { ok: true, masmorra: m };
  }

  function revelarMasmorra(e, id, revelar) {
    var m = e.masmorras.filter(function (x) { return x.id === id; })[0];
    if (!m) return falha("Masmorra não encontrada.");
    m.oculto = !revelar;
    return { ok: true };
  }

  function novoDia(e) {
    e.dia++;
    registrar(e, "Dia " + e.dia);
    return { ok: true, eventos: [{ tipo: "momento", momento: "novoDia" }] };
  }

  global.RAMAGoblinsMesa = {
    VERSAO: VERSAO,
    vazio: vazio, normalizar: normalizar, normalizarParticipante: normalizarParticipante, vistaDosJogadores: vistaDosJogadores, registrar: registrar,
    tabelas: tabelas, textoDeEntrada: textoDeEntrada, resolverGrupo: resolverGrupo, gerarLocal: gerarLocal, sortear: sortear,
    participanteDoCatalogo: participanteDoCatalogo, adicionarInimigos: adicionarInimigos, adicionarPC: adicionarPC, participante: participante, removerParticipante: removerParticipante,
    moverNaOrdem: moverNaOrdem, iniciarCombate: iniciarCombate, vezAtual: vezAtual, proximaVez: proximaVez, encerrarCombate: encerrarCombate, limparDerrotados: limparDerrotados,
    ferir: ferir, curarParticipante: curarParticipante, efeitoEmParticipante: efeitoEmParticipante, removerEfeitoDeParticipante: removerEfeitoDeParticipante,
    paradaDeInimigo: paradaDeInimigo, rolarPorParticipante: rolarPorParticipante, combateSincronizado: combateSincronizado,
    acaoDemorada: acaoDemorada, efeitoDaMesa: efeitoDaMesa, participanteAleatorio: participanteAleatorio,
    negociar: negociar, gerarBandoRival: gerarBandoRival, rivaisNoCombate: rivaisNoCombate,
    gerarMasmorra: gerarMasmorra, revelarMasmorra: revelarMasmorra, novoDia: novoDia,
  };
})(typeof window !== "undefined" ? window : globalThis);
/* <<< js/goblins/mesa.js */
