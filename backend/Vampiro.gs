/* =====================================================================
   R.A.M.A. — Vampiro: A Máscara (V5) no servidor (v4.1)
   =====================================================================
   O módulo de Vampiro: a crônica do Narrador (CAMPANHA_VAMPIRO) e as
   operações que tocam fichas de mais de um personagem. O servidor roda
   o MESMO motor do navegador: os arquivos de js/vampiro/ estão copiados
   abaixo, entre marcadores (testes/gerar-vampiro-gs.js; a suíte confere
   que as cópias batem).

     ler_vampiro      membro: o Narrador recebe a crônica inteira; o
                      jogador, a VISTA (sem PNs ocultos, relações
                      privadas, notas do Narrador nem registro privado)
     salvar_vampiro   só o Narrador (rev + opId)
     vampiro_operar   momentos da crônica nas fichas (Narrador), XP,
                      Máculas, dano e Pilares decididos pelo Narrador;
                      alimentar-se de outro vampiro e Direto da Fonte
                      (quem age precisa poder editar a própria ficha; a
                      outra ficha só é tocada pelo efeito da regra, e só
                      se for de quem pede ou com o Narrador)

   As ferramentas só respondem numa campanha de Vampiro
   (exigirFerramenta 'cronica'); trocar o sistema guarda a crônica.
   ===================================================================== */

/* Os ganchos que o núcleo chama (Sistemas.gs). */
function sistemaVampiro() {
  return {
    id: 'vampiro',
    rotas: rotasDeVampiro,
    fichaDoSistema: function (ficha) { return !!ficha && !!ficha.vampiro && typeof ficha.vampiro === 'object'; },
    /* O resumo do painel é calculado AQUI, com o motor: a mesa não
       depende do número que o navegador mandou. */
    projecao: function (ficha) {
      try { return { vampiro: RAMAVampiro.resumoParaMesa(RAMAVampiro.normalizar(ficha.vampiro)) }; }
      catch (erro) { return {}; }
    },
    projecaoDoSistema: function (proj) { return !!proj && !!proj.vampiro && typeof proj.vampiro === 'object'; },
    painel: function (proj, o) {
      var v = proj.vampiro;
      if (o.recursosVisiveis) return { vampiro: v };
      return { vampiro: { cla: v.cla, natureza: v.natureza } };
    },
    estadoDasMecanicas: { cronica: vampiroTemCronica },
  };
}

function rotasDeVampiro() {
  return {
    ler_vampiro: { publica: false, fn: acaoLerVampiro },
    salvar_vampiro: { publica: false, fn: acaoSalvarVampiro },
    vampiro_operar: { publica: false, fn: acaoVampiroOperar },
  };
}

var MAX_OPS_VAMPIRO = 80;
var OPERACOES_DO_NARRADOR = ['momentos', 'xp', 'maculas', 'dano', 'pilar', 'diablerie'];
var OPERACOES_DE_VAMPIRO = ['alimentarDeVampiro', 'diretoDaFonte'];

/* O dado do servidor: o mesmo sorteio uniforme do resto do backend. */
function roladorDeVampiro(faces) {
  var f = Math.max(1, Math.floor(Number(faces) || 1));
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid());
  var n = 0;
  for (var i = 0; i < 4; i++) n = n * 256 + ((bytes[i] + 256) % 256);
  return (n % f) + 1;
}

function vampiroTemCronica(campanhaId) {
  try { return lerLeves(ABAS.CAMPANHA_VAMPIRO).some(function (r) { return String(r.campanhaId) === String(campanhaId); }); }
  catch (erro) { return false; }
}

function registroDaCronica(campanhaId) {
  try { return acharPor(ABAS.CAMPANHA_VAMPIRO, 'campanhaId', String(campanhaId)); }
  catch (erro) { return null; }
}

function estadoDaCronica(registro) {
  return RAMAVampiroCronica.normalizar(registro ? lerJson(registro.dadosJson, {}) : {});
}

/* Os personagens de Vampiro da campanha — id e nome, pela projeção. */
function personagensDeVampiro(campanhaId) {
  var regs = daCampanhaLeves(ABAS.PERSONAGENS, campanhaId);
  if (!regs.length) return [];
  var textos = lerCelulas(ABAS.PERSONAGENS, regs, 'resumo');
  return regs.filter(function (r) { var p = projecaoGuardada(textos[r._linha]); return !!p && p.tipo === 'vampiro'; })
    .map(function (r) { return { id: String(r.id), nome: String(r.nome || '').slice(0, 120), ownerId: String(r.ownerId || '') }; });
}

function cronicaParaCliente(ctx, registro, usuario) {
  var estado = estadoDaCronica(registro);
  var rev = registro ? Number(registro.rev) || 0 : 0;
  if (ctx.mestre) return { mestre: true, rev: rev, estado: estado };
  var meus = daCampanhaLeves(ABAS.PERSONAGENS, ctx.campanha.id).filter(function (r) { return meu(r, usuario); }).map(function (r) { return String(r.id); });
  return { mestre: false, rev: rev, vista: RAMAVampiroCronica.vistaDosJogadores(estado, meus) };
}

function acaoLerVampiro(corpo, usuario) {
  var ctx = contextoDaCampanha(corpo.campanhaId, usuario);
  if (!ctx.ok) return ctx;
  var foraDoSistema = exigirFerramenta(ctx, 'cronica');
  if (foraDoSistema) return foraDoSistema;
  if (ctx.papel === PAPEL_ESPECTADOR) return { ok: false, erro: 'sem_permissao' };
  var dados = cronicaParaCliente(ctx, registroDaCronica(ctx.campanha.id), usuario);
  dados.personagens = personagensDeVampiro(ctx.campanha.id).map(function (p) { return { id: p.id, nome: p.nome }; });
  return { ok: true, rev: dados.rev, dados: dados };
}

function gravarCronica(ctx, registro, estado, revAtual, feitas) {
  var json = JSON.stringify(estado);
  var voltas = 0;
  /* O registro cede primeiro quando o estado não cabe. */
  while (json.length > MAX_CELULA && voltas < 20) {
    voltas++;
    estado.registro = estado.registro.slice(Math.ceil(estado.registro.length / 4) || 1);
    json = JSON.stringify(estado);
  }
  if (json.length > MAX_CELULA) return { ok: false, erro: 'dados_grandes' };
  var novo = { campanhaId: String(ctx.campanha.id), atualizadoEm: new Date().toISOString(), rev: revAtual + 1, opsJson: JSON.stringify(feitas.slice(-MAX_OPS_VAMPIRO)), dadosJson: json };
  if (registro) atualizarLinha(ABAS.CAMPANHA_VAMPIRO, registro._linha, Object.assign({}, registro, novo));
  else inserir(ABAS.CAMPANHA_VAMPIRO, novo);
  marcarMesa(ctx.campanha.id, ['vampiro']);
  return { ok: true, rev: revAtual + 1 };
}

function acaoSalvarVampiro(corpo, usuario) {
  var opId = String(corpo.opId || '');
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(opId)) return { ok: false, erro: 'dados_invalidos' };
  if (!corpo.estado || typeof corpo.estado !== 'object' || Array.isArray(corpo.estado)) return { ok: false, erro: 'dados_invalidos' };
  var revPedida = Number(corpo.rev);
  if (!Number.isFinite(revPedida)) return { ok: false, erro: 'dados_invalidos' };
  return comTrava(function () {
    var ctx = exigirMestre(corpo.campanhaId, usuario);
    if (!ctx.ok) return ctx;
    var foraDoSistema = exigirFerramenta(ctx, 'cronica');
    if (foraDoSistema) return foraDoSistema;
    try { aba(ABAS.CAMPANHA_VAMPIRO); }
    catch (erro) { return { ok: false, erro: 'instalacao_incompleta', detalhe: 'CAMPANHA_VAMPIRO' }; }
    var registro = registroDaCronica(ctx.campanha.id);
    var revAtual = registro ? Number(registro.rev) || 0 : 0;
    var feitas = registro ? (lerJson(registro.opsJson, []) || []) : [];
    if (!Array.isArray(feitas)) feitas = [];
    if (feitas.indexOf(opId) >= 0) return { ok: true, repetida: true, rev: revAtual, dados: cronicaParaCliente(ctx, registro, usuario) };
    if (revPedida !== revAtual) return { ok: false, erro: 'conflito', rev: revAtual, dados: cronicaParaCliente(ctx, registro, usuario) };
    var estado = RAMAVampiroCronica.normalizar(corpo.estado);
    /* A coterie só com personagens desta campanha. */
    var daMesa = {};
    daCampanhaLeves(ABAS.PERSONAGENS, ctx.campanha.id).forEach(function (r) { daMesa[String(r.id)] = true; });
    estado.coterie.membros = estado.coterie.membros.filter(function (id) { return daMesa[id]; });
    feitas.push(opId);
    var g = gravarCronica(ctx, registro, estado, revAtual, feitas);
    if (!g.ok) return g;
    return { ok: true, rev: g.rev, dados: cronicaParaCliente(ctx, registroDaCronica(ctx.campanha.id), usuario) };
  });
}

/* As fichas de Vampiro que a operação toca: lidas e normalizadas. */
function fichasDeVampiro(campanhaId, ids) {
  var saida = {};
  for (var i = 0; i < ids.length; i++) {
    var reg = acharPor(ABAS.PERSONAGENS, 'id', String(ids[i]));
    if (!reg || String(reg.campanhaId || '') !== String(campanhaId)) return { ok: false, erro: 'nao_encontrado' };
    var lido = lerFichaDoPersonagem(reg);
    if (!lido.ok) return lido;
    var ficha = comVinculoDaColuna(lido.ficha, reg);
    if (String(ficha.tipoFicha || '') !== 'vampiro') return { ok: false, erro: 'dados_invalidos', detalhe: 'nao_e_vampiro' };
    ficha.vampiro = RAMAVampiro.normalizar(ficha.vampiro);
    saida[ids[i]] = { registro: reg, ficha: ficha, antes: JSON.stringify(ficha.vampiro) };
  }
  return { ok: true, fichas: saida };
}

/* Grava TODAS as fichas tocadas, ou nenhuma: a primeira falha volta
   antes de qualquer gravação seguinte, e o opId em cada ficha garante
   que repetir o pedido termina o que faltou sem aplicar de novo. */
function gravarFichasDeVampiro(fichas, opId, campanhaId) {
  var quando = new Date().toISOString();
  var gravadas = 0, ids = Object.keys(fichas);
  for (var i = 0; i < ids.length; i++) {
    var f = fichas[ids[i]];
    if (JSON.stringify(f.ficha.vampiro) === f.antes) continue;
    if (f.ficha.vampiro.operacoes.indexOf(opId) < 0) f.ficha.vampiro.operacoes.push(opId);
    try { f.ficha.resumoVampiro = RAMAVampiro.resumoParaMesa(f.ficha.vampiro); } catch (erro) { /* o painel recalcula */ }
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

function podeOperarPor(ctx, usuario, personagemId) {
  if (ctx.mestre) return { ok: true };
  return personagemAcessivel(personagemId, usuario, {});
}

function acaoVampiroOperar(corpo, usuario) {
  var opId = String(corpo.opId || '');
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(opId)) return { ok: false, erro: 'dados_invalidos' };
  var op = corpo.operacao && typeof corpo.operacao === 'object' ? corpo.operacao : null;
  if (!op) return { ok: false, erro: 'dados_invalidos' };
  var tipo = String(op.tipo || '');
  if (OPERACOES_DO_NARRADOR.indexOf(tipo) < 0 && OPERACOES_DE_VAMPIRO.indexOf(tipo) < 0) return { ok: false, erro: 'dados_invalidos' };

  return comTrava(function () {
    var ctx = contextoDaCampanha(corpo.campanhaId, usuario);
    if (!ctx.ok) return ctx;
    var foraDoSistema = exigirFerramenta(ctx, 'cronica');
    if (foraDoSistema) return foraDoSistema;
    if (ctx.papel === PAPEL_ESPECTADOR) return { ok: false, erro: 'sem_permissao' };
    if (OPERACOES_DO_NARRADOR.indexOf(tipo) >= 0 && !ctx.mestre) return { ok: false, erro: 'sem_permissao' };

    var ids = [];
    if (tipo === 'momentos') ids = daCampanhaLeves(ABAS.PERSONAGENS, ctx.campanha.id).map(function (r) { return String(r.id); });
    else if (tipo === 'xp') ids = (Array.isArray(op.personagens) ? op.personagens : []).map(String).slice(0, 30);
    else if (tipo === 'alimentarDeVampiro' || tipo === 'diretoDaFonte') {
      var quem = String(op.quem || ''), doador = String(op.doador || '');
      if (!quem || !doador || quem === doador) return { ok: false, erro: 'dados_invalidos' };
      /* Quem bebe: precisa poder editar. O doador: ou é de quem pede,
         ou o Narrador conduz — uma ação contra outro personagem não dá
         acesso à ficha dele. */
      var a1 = podeOperarPor(ctx, usuario, quem); if (!a1.ok) return a1;
      var a2 = podeOperarPor(ctx, usuario, doador); if (!a2.ok) return { ok: false, erro: 'sem_permissao', detalhe: 'doador' };
      ids = [quem, doador];
    } else if (tipo === 'diablerie') ids = [String(op.quem || ''), String(op.vitima || '')].filter(Boolean);
    else ids = [String(op.persona || '')];

    var carregadas = { ok: true, fichas: {} };
    if (tipo === 'momentos' || tipo === 'xp') {
      ids.forEach(function (id) { var r = fichasDeVampiro(ctx.campanha.id, [id]); if (r.ok) carregadas.fichas[id] = r.fichas[id]; });
    } else {
      carregadas = fichasDeVampiro(ctx.campanha.id, ids);
      if (!carregadas.ok) return carregadas;
    }
    var blocos = {};
    Object.keys(carregadas.fichas).forEach(function (id) { blocos[id] = carregadas.fichas[id].ficha.vampiro; });
    /* Repetição: a operação já está em alguma ficha que ela toca. */
    if (tipo !== 'momentos' && tipo !== 'xp' && Object.keys(blocos).some(function (id) { return blocos[id].operacoes.indexOf(opId) >= 0; })) {
      return { ok: true, repetida: true, dados: { eventos: [] } };
    }

    var eventos = [];
    function em(id, fn) {
      var o = blocos[id];
      if (!o) return;
      var r = RAMAVampiro.aplicarOperacao(o, opId, fn);
      if (r && r.eventos) eventos = eventos.concat(r.eventos.map(function (e) { return Object.assign({ personagem: id }, e); }));
      return r;
    }

    if (tipo === 'momentos') {
      var lista = Array.isArray(op.momentos) ? op.momentos.slice(0, 10) : [];
      Object.keys(blocos).forEach(function (id) {
        em(id, function (o) {
          var evs = [];
          lista.forEach(function (m) {
            var r = null;
            if (m.tipo === 'inicioDaSessao') r = RAMAVampiro.inicioDaSessao(o, { continuaCena: !!m.continuaCena });
            if (m.tipo === 'fimDaSessao') r = RAMAVampiro.fimDaSessao(o, { ambicao: !!(m.ambicao && m.ambicao[id]), xp: Math.max(0, Math.min(10, Number(m.xp) || 0)), motivoXP: 'Sessão' }, roladorDeVampiro);
            if (m.tipo === 'novaNoite') r = RAMAVampiro.novaNoite(o, roladorDeVampiro);
            if (m.tipo === 'novaCena') r = RAMAVampiro.novaCena(o);
            if (m.tipo === 'fimDaCena') r = RAMAVampiro.fimDaCena(o);
            if (m.tipo === 'fimDoTurno') r = RAMAVampiro.fimDoTurno(o);
            if (m.tipo === 'checagem' && m.personagemId === id) r = RAMAVampiro.checagemDeSangue(o, { motivo: String(m.motivo || '').slice(0, 80) }, roladorDeVampiro);
            if (r && r.eventos) evs = evs.concat(r.eventos);
          });
          return { ok: true, eventos: evs };
        });
      });
    }
    if (tipo === 'xp') {
      var valor = Math.max(-50, Math.min(50, Math.floor(Number(op.valor) || 0)));
      Object.keys(blocos).forEach(function (id) { em(id, function (o) { return RAMAVampiro.receberXP(o, valor, String(op.motivo || 'Narrador').slice(0, 200)); }); });
    }
    if (tipo === 'maculas') {
      var rm = em(ids[0], function (o) { return RAMAVampiro.adicionarMaculas(o, Math.max(1, Math.min(10, Number(op.valor) || 1)), String(op.motivo || '').slice(0, 200), { convicao: !!op.convicao, mitigar: Number(op.mitigar) || 1 }); });
      if (rm && rm.ok === false) return { ok: false, erro: 'dados_invalidos', motivo: rm.motivo };
    }
    if (tipo === 'dano') {
      var rd = em(ids[0], function (o) { return RAMAVampiro.sofrerDano(o, { trilha: op.trilha, tipo: op.tipoDeDano, valor: Number(op.valor) || 0, fonte: String(op.fonte || 'fisico'), naoDividir: !!op.naoDividir }); });
      if (rd && rd.ok === false) return { ok: false, erro: 'dados_invalidos', motivo: rd.motivo };
    }
    if (tipo === 'pilar') {
      var rp = em(ids[0], function (o) { return RAMAVampiro.eventoDePilar(o, String(op.pilar || ''), String(op.evento || '')); });
      if (rp && rp.ok === false) return { ok: false, erro: 'dados_invalidos', motivo: rp.motivo };
    }
    if (tipo === 'alimentarDeVampiro') {
      var pontos = Math.max(1, Math.min(5, Math.floor(Number(op.fome) || 1)));
      var doadorBloco = blocos[ids[1]];
      var potDoador = RAMAVampiro.potencia(doadorBloco);
      var nomeDoador = String(carregadas.fichas[ids[1]].ficha.nome || '').slice(0, 120);
      var ra = em(ids[0], function (o) { return RAMAVampiro.alimentar(o, { fonte: 'vampiro', fomeDoDoador: pontos, potenciaDoDoador: potDoador, doador: ids[1], doadorNome: nomeDoador }, roladorDeVampiro); });
      if (ra && ra.ok === false) return { ok: false, erro: 'dados_invalidos', motivo: ra.motivo };
      em(ids[1], function (o) { return RAMAVampiro.doarSangue(o, pontos); });
    }
    if (tipo === 'diretoDaFonte') {
      var disc = String(op.disciplina || '');
      if (['celeridade', 'fortitude', 'potencia'].indexOf(disc) < 0) return { ok: false, erro: 'dados_invalidos' };
      var poderFonte = { celeridade: 'eleganciaDiretoDaFonte', fortitude: 'resistenciaDiretoDaFonte', potencia: 'forcaDiretoDaFonte' }[disc];
      var dono = blocos[ids[1]];
      if (!RAMAVampiro.temPoder(dono, poderFonte)) return { ok: false, erro: 'dados_invalidos', motivo: 'O doador não tem o poder Direto da Fonte.' };
      var custo = em(ids[1], function (o) { return RAMAVampiro.checagemDeSangue(o, { motivo: 'Direto da Fonte', nivelDoPoder: 4, contexto: 'poder' }, roladorDeVampiro); });
      if (custo && custo.ok === false) return { ok: false, erro: 'dados_invalidos', motivo: custo.motivo };
      var poderesDoDoador = RAMAVampiro.poderesDaFicha(dono).map(function (p) { return p.chave; });
      var nivelDoDoador = RAMAVampiro.valorDeDisciplina(dono, disc);
      var rf = em(ids[0], function (o) { return RAMAVampiroPoderes.receberDiretoDaFonte(o, disc, nivelDoDoador, poderesDoDoador); });
      if (rf && rf.ok === false) return { ok: false, erro: 'dados_invalidos', motivo: rf.motivo };
    }
    if (tipo === 'diablerie') {
      /* Consumada (as etapas por turno foram roladas na ficha): a vítima
         sofre a Morte Final — a ficha fica —, o diabolista recebe o
         processo do livro, rolado aqui. */
      if (ids.length < 2) return { ok: false, erro: 'dados_invalidos' };
      var vit = blocos[ids[1]];
      var dadosVitima = { determinacao: RAMAVampiro.valorDeAtributo(vit, 'determinacao'), potencia: RAMAVampiro.potencia(vit), geracao: vit.geracao, disciplinas: Object.keys(RAMAVampiro.calcular(vit).disciplinas) };
      em(ids[0], function (o) { return RAMAVampiro.diablerieConsumada(o, dadosVitima, roladorDeVampiro); });
      em(ids[1], function (o) { return RAMAVampiro.morteFinal(o, 'Diablerie'); });
    }

    var g = gravarFichasDeVampiro(carregadas.fichas, opId, ctx.campanha.id);
    if (!g.ok) return g;
    return { ok: true, dados: { eventos: eventos, gravadas: g.gravadas } };
  });
}

/* =====================================================================
   O MOTOR (cópia fiel de js/vampiro/; não edite aqui)
   ===================================================================== */

/* >>> js/vampiro/catalogo.js */
/* =====================================================================
   R.A.M.A. — Vampiro: A Máscara (V5) · catálogo
   =====================================================================
   Os dados do Livro Básico da 5ª edição em português (Galápagos), com a
   página IMPRESSA de cada regra. A página do PDF fornecido difere: até a
   impressa 305 o PDF é +2; dali em diante, +4 (o PDF repete as páginas
   304–305). Use paginaDoPdf(impressa).

   Só o Livro Básico: nada de suplementos, de clãs ou poderes que vieram
   depois, nem de regras de edições anteriores (Pontos de Sangue,
   Virtudes, Trilhas, Natureza/Comportamento, absorção de dano).

   Nada aqui calcula estado: são tabelas. Quem aplica é js/vampiro/regras.js.
   Divergências e leituras: docs/VAMPIRO.md (Interpretações).
   ===================================================================== */

(function (global) {
  "use strict";

  function paginaDoPdf(impressa) {
    var n = Number(impressa) || 0;
    return n <= 305 ? n + 2 : n + 4;
  }

  /* ---------------------------------------------------------------
     ATRIBUTOS E HABILIDADES (p. 155–171)
     --------------------------------------------------------------- */

  var ATRIBUTOS = [
    { chave: "forca", nome: "Força", categoria: "fisico" },
    { chave: "destreza", nome: "Destreza", categoria: "fisico" },
    { chave: "vigor", nome: "Vigor", categoria: "fisico" },
    { chave: "carisma", nome: "Carisma", categoria: "social" },
    { chave: "manipulacao", nome: "Manipulação", categoria: "social" },
    { chave: "autocontrole", nome: "Autocontrole", categoria: "social" },
    { chave: "inteligencia", nome: "Inteligência", categoria: "mental" },
    { chave: "raciocinio", nome: "Raciocínio", categoria: "mental" },
    { chave: "determinacao", nome: "Determinação", categoria: "mental" },
  ];

  var CATEGORIAS = { fisico: "Físicos", social: "Sociais", mental: "Mentais" };

  /* `especializacaoNaCompra`: ganha uma especialização ao adquirir o
     primeiro ponto (Erudição, Ofícios, Performance, Ciência — p. 159). */
  var HABILIDADES = [
    { chave: "armasBrancas", nome: "Armas Brancas", categoria: "fisico", exemplos: ["Armas Improvisadas", "Correntes", "Desarme", "Esgrima", "Espadas", "Estacas", "Facas", "Garrotes", "Machados", "Porretes"] },
    { chave: "armasDeFogo", nome: "Armas de Fogo", categoria: "fisico", exemplos: ["Bestas", "Comércio de Armas", "Fabricação de Armas de Fogo", "Atirador de Elite", "Recarga Manual", "Saque Rápido", "Tiro de Exibição"] },
    { chave: "atletismo", nome: "Atletismo", categoria: "fisico", exemplos: ["Acrobacia", "Arquearia", "Arremesso", "Escalada", "Natação", "Parkour", "Resistência", "Salto"] },
    { chave: "briga", nome: "Briga", categoria: "fisico", exemplos: ["Agarramento", "Animais", "Briga de Bar", "Combate Esportivo", "Enquanto em Forma de Besta", "Lobisomens", "Membros", "Mortais Armados", "Mortais Desarmados"] },
    { chave: "conducao", nome: "Condução", categoria: "fisico", exemplos: ["Acrobacias", "Caminhões", "Fuga", "Modelos Vintage", "Motocicletas", "Rachas", "Tratores", "Veículos Off-Road"] },
    { chave: "furtividade", nome: "Furtividade", categoria: "fisico", exemplos: ["Disfarce", "Cidades", "Emboscadas", "Ermos", "Esconder-se", "Movimento Furtivo", "Multidões", "Perseguição"] },
    { chave: "ladroagem", nome: "Ladroagem", categoria: "fisico", exemplos: ["Abrir Cofres", "Abrir Fechaduras", "Alarmes", "Análise de Segurança", "Bater Carteiras", "Falsificação", "GTA (Grand Theft Auto)", "Invasão Domiciliar"] },
    { chave: "oficios", nome: "Ofícios", categoria: "fisico", especializacaoNaCompra: true, semLimiteDeEspecializacoes: true, exemplos: ["Carpintaria", "Costura", "Design", "Escultura", "Fabricação de Armas", "Gravura", "Pintura"] },
    { chave: "sobrevivencia", nome: "Sobrevivência", categoria: "fisico", exemplos: ["Abrigos", "Armadilhas", "Bosques", "Caça", "Deserto", "Exploração Urbana", "Rastreamento", "Selva"] },
    { chave: "empatiaComAnimais", nome: "Empatia com Animais", categoria: "social", exemplos: ["Cães", "Cavalos", "Cobras", "Falcoaria", "Gatos", "Lobos", "Pacificação", "Ratos", "Treinamento para Ataque", "Treino de Acrobacias"] },
    { chave: "etiqueta", nome: "Etiqueta", categoria: "social", exemplos: ["Anarchs", "Camarilla", "Celebridades", "Corporativo", "Elísio", "Feudal", "Sociedade Secreta", "Um Por Cento"] },
    { chave: "intimidacao", nome: "Intimidação", categoria: "social", exemplos: ["Ameaças Veladas", "Coerção Física", "Extorsão", "Insultos", "Interrogatório", "Olhares Intimidadores"] },
    { chave: "lideranca", nome: "Liderança", categoria: "social", exemplos: ["Bando de Guerra", "Comando", "Dinâmica de Grupo", "Inspiração", "Oratória", "Práxis"] },
    { chave: "manha", nome: "Manha", categoria: "social", exemplos: ["Contrabando de Armas", "Drogas", "Gangues", "Grafite", "Mercado Negro", "Receptação", "Reputação Pessoal", "Sobrevivência Urbana", "Suborno", "Tráfico Sexual"] },
    { chave: "performance", nome: "Performance", categoria: "social", especializacaoNaCompra: true, exemplos: ["Bateria", "Canto", "Comédia", "Dança", "Drama", "Discurso Público", "Guitarra", "Instrumentos de Sopro", "Poesia", "Rap", "Teclado", "Violino"] },
    { chave: "persuasao", nome: "Persuasão", categoria: "social", exemplos: ["Argumento Jurídico", "Barganha", "Interrogatório", "Lábia", "Negociação", "Retórica"] },
    { chave: "sagacidade", nome: "Sagacidade", categoria: "social", exemplos: ["Ambições", "Desejos", "Detectar Mentiras", "Emoções", "Empatia", "Fobias", "Interrogatório", "Motivos", "Vícios"] },
    { chave: "subterfugio", nome: "Subterfúgio", categoria: "social", exemplos: ["Blefar", "Fingir Mortalidade", "Golpes a Longo Prazo", "Inocência", "Mentiras Impecáveis", "Sedução"] },
    { chave: "ciencia", nome: "Ciência", categoria: "mental", especializacaoNaCompra: true, exemplos: ["Astronomia", "Biologia", "Demolição", "Engenharia", "Física", "Genética", "Geologia", "Matemática", "Química"] },
    { chave: "erudicao", nome: "Erudição", categoria: "mental", especializacaoNaCompra: true, exemplos: ["Arquitetura", "Filosofia", "História", "História da Arte", "Jornalismo", "Literatura Brasileira", "Pedagogia", "Pesquisa", "Teologia"] },
    { chave: "financas", nome: "Finanças", categoria: "mental", exemplos: ["Avaliação", "Contabilidade Forense", "Finanças Corporativas", "Lavagem de Dinheiro", "Manipulação de Moedas", "Mercado de Ações", "Mercado de Arte", "Mercados Negros", "Transações Bancárias"] },
    { chave: "investigacao", nome: "Investigação", categoria: "mental", exemplos: ["Análise de Tráfego", "Assassinato", "Criminologia", "Dedução", "Investigação Forense", "Mistérios Paranormais", "Pessoas Desaparecidas"] },
    { chave: "medicina", nome: "Medicina", categoria: "mental", exemplos: ["Cirurgia", "Farmácia", "Flebotomia", "Hematologia", "Patologia", "Primeiros Socorros", "Trauma", "Veterinária"] },
    { chave: "ocultismo", nome: "Ocultismo", categoria: "mental", exemplos: ["Alquimia", "Fadas", "Fantasmas", "Grimórios", "Infernalismo", "Lobisomens", "Magi", "Magia de Sangue", "Necromancia", "Nodismo", "Parapsicologia", "Vodu"] },
    { chave: "percepcao", nome: "Percepção", categoria: "mental", exemplos: ["Áreas Selvagens", "Armadilhas", "Audição", "Camuflagem", "Emboscadas", "Instintos", "Objetos Ocultos", "Olfato", "Visão"] },
    { chave: "politica", nome: "Política", categoria: "mental", exemplos: ["Anarchs", "Camarilla", "Clã", "Diplomacia", "Governo Municipal", "Mídia", "Política Estadual", "Política Nacional"] },
    { chave: "tecnologia", nome: "Tecnologia", categoria: "mental", exemplos: ["Artilharia", "Codificação", "Extração de Dados", "Hackear", "Montagem de Computadores", "Redes", "Sistemas de Vigilância", "Telefones"] },
  ];

  /* Distribuições da criação (p. 136, 146). */
  var DISTRIBUICAO_DE_ATRIBUTOS = [4, 3, 3, 3, 2, 2, 2, 2, 1];
  var DISTRIBUICOES_DE_HABILIDADES = {
    pauPraTodaObra: { nome: "Pau pra Toda Obra", valores: [3, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
    equilibrado: { nome: "Equilibrado", valores: [3, 3, 3, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1] },
    especialista: { nome: "Especialista", valores: [4, 3, 3, 3, 2, 2, 2, 1, 1, 1] },
  };

  /* ---------------------------------------------------------------
     TABELAS GERAIS (p. 119–130)
     --------------------------------------------------------------- */

  var DIFICULDADES = [
    { valor: 1, nome: "Fácil" }, { valor: 2, nome: "Rotineira" }, { valor: 3, nome: "Moderada" },
    { valor: 4, nome: "Desafiadora" }, { valor: 5, nome: "Difícil" }, { valor: 6, nome: "Muito difícil" },
    { valor: 7, nome: "Quase impossível" },
  ];

  /* Custos de experiência (p. 137, 151). `fator` × NOVO nível, salvo
     onde o custo é por ponto/fixo. */
  var CUSTOS_XP = {
    atributo: { fator: 5, nome: "Atributo" },
    habilidade: { fator: 3, nome: "Habilidade" },
    especializacao: { fixo: 3, nome: "Especialização" },
    disciplinaDoCla: { fator: 5, nome: "Disciplina do clã" },
    disciplinaForaDoCla: { fator: 7, nome: "Outra Disciplina" },
    disciplinaCaitiff: { fator: 6, nome: "Disciplina de Caitiff" },
    ritual: { fatorDoNivel: 3, nome: "Ritual" },
    formula: { fatorDoNivel: 3, nome: "Fórmula sangue-ralo" },
    vantagem: { porPonto: 3, nome: "Vantagem" },
    potencia: { fator: 10, nome: "Potência do Sangue" },
    humanidade: { fator: 10, nome: "Humanidade", soComNarrador: true, pagina: 241 },
  };

  /* O Mar do Tempo (p. 137, 148–151). */
  var IDADES = {
    crianca: { nome: "Criança da Noite", resumo: "Abraçada nos últimos 15 anos.", geracoes: [12, 13], potencia: 1, xp: 0, humanidade: 7, vantagens: 0, defeitos: 0, pagina: 148 },
    neofito: { nome: "Neófito", resumo: "Abraçado entre 1940 e uma década atrás.", geracoes: [12, 13], potencia: 1, xp: 15, humanidade: 7, vantagens: 0, defeitos: 0, pagina: 151 },
    ancilla: { nome: "Ancilla", resumo: "Abraçado entre 1780 e 1940.", geracoes: [10, 11], potencia: 2, xp: 35, humanidade: 6, vantagens: 2, defeitos: 2, pagina: 151 },
  };

  /* Geração × Potência do Sangue (p. 214). */
  var GERACOES = {
    4: [5, 10], 5: [4, 9], 6: [3, 8], 7: [3, 7], 8: [2, 6], 9: [2, 5],
    10: [1, 4], 11: [1, 4], 12: [1, 3], 13: [1, 3], 14: [0, 0], 15: [0, 0], 16: [0, 0],
  };

  /* Potência do Sangue (p. 216). `rerrolagem`: nível máximo de poder de
     Disciplina cuja Checagem pode rolar dois dados (escolhe o melhor).
     `saciaMenos`: Fome a menos saciada por humano; `minimoSemMatar`:
     Fome mínima sem drenar e matar; `animalEnsacado`: "metade" | "nada". */
  var POTENCIA = [
    { valor: 0, surto: 1, recupera: 1, bonusPoder: 0, rerrolagem: 0, perdicao: 0, animalEnsacado: "", saciaMenos: 0, minimoSemMatar: 1 },
    { valor: 1, surto: 2, recupera: 1, bonusPoder: 0, rerrolagem: 1, perdicao: 2, animalEnsacado: "", saciaMenos: 0, minimoSemMatar: 1 },
    { valor: 2, surto: 2, recupera: 2, bonusPoder: 1, rerrolagem: 1, perdicao: 2, animalEnsacado: "metade", saciaMenos: 0, minimoSemMatar: 1 },
    { valor: 3, surto: 3, recupera: 2, bonusPoder: 1, rerrolagem: 2, perdicao: 3, animalEnsacado: "nada", saciaMenos: 0, minimoSemMatar: 1 },
    { valor: 4, surto: 3, recupera: 3, bonusPoder: 2, rerrolagem: 2, perdicao: 3, animalEnsacado: "nada", saciaMenos: 1, minimoSemMatar: 1 },
    { valor: 5, surto: 4, recupera: 3, bonusPoder: 2, rerrolagem: 3, perdicao: 4, animalEnsacado: "nada", saciaMenos: 1, minimoSemMatar: 2 },
    { valor: 6, surto: 4, recupera: 3, bonusPoder: 3, rerrolagem: 3, perdicao: 4, animalEnsacado: "nada", saciaMenos: 1, minimoSemMatar: 2 },
    { valor: 7, surto: 5, recupera: 3, bonusPoder: 3, rerrolagem: 4, perdicao: 5, animalEnsacado: "nada", saciaMenos: 2, minimoSemMatar: 2 },
    { valor: 8, surto: 5, recupera: 4, bonusPoder: 4, rerrolagem: 4, perdicao: 5, animalEnsacado: "nada", saciaMenos: 2, minimoSemMatar: 3 },
    { valor: 9, surto: 6, recupera: 4, bonusPoder: 4, rerrolagem: 5, perdicao: 6, animalEnsacado: "nada", saciaMenos: 2, minimoSemMatar: 3 },
    { valor: 10, surto: 6, recupera: 5, bonusPoder: 5, rerrolagem: 5, perdicao: 6, animalEnsacado: "nada", saciaMenos: 3, minimoSemMatar: 3 },
  ];

  /* Humanidade (p. 236–241). `penalidade`: dados a menos para interagir
     com humanos; `comRubor`: a mesma com Rubor de Vida (níveis 2 e 1).
     `frenesi`: dados somados à resistência (1/3, arredondado para baixo).
     `torpor`: duração (texto) e `torporDias` para cálculos de data. */
  var HUMANIDADE = {
    10: { frenesi: 3, torpor: "um dia", torporDias: 1, penalidade: 0, curaComoMortal: true, semRubor: true, solPelaMetade: true, despertaAntes: 0, notas: "Não precisa de Rubor de Vida; come; acordado de dia como um humano; o sol fere pela metade." },
    9: { frenesi: 3, torpor: "três dias", torporDias: 3, penalidade: 0, curaComoMortal: true, despertaAntes: 1, notas: "Parece doente; come carne crua; desperta até 1 hora antes do pôr do sol e fica até 1 hora depois do amanhecer." },
    8: { frenesi: 2, torpor: "uma semana", torporDias: 7, penalidade: 0, ruborDoisDados: true, despertaAntes: 1, notas: "Rolar dois dados na Checagem do Rubor (fica o melhor); o Rubor permite sexo e prazer; digere vinho." },
    7: { frenesi: 2, torpor: "duas semanas", torporDias: 14, penalidade: 0, notas: "Rubor de Vida por Checagem; sem ele, comida e bebida voltam (Autocontrole + Vigor, Dif 3, para sair a tempo)." },
    6: { frenesi: 2, torpor: "um mês", torporDias: 30, penalidade: 0, notas: "Como 7, sem prazer; com Rubor, manter comida 1 hora: Autocontrole + Vigor, Dif 3." },
    5: { frenesi: 1, torpor: "um ano", torporDias: 365, penalidade: 1, notas: "−1 dado para interagir com humanos." },
    4: { frenesi: 1, torpor: "uma década", torporDias: 3650, penalidade: 2, semComida: true, notas: "−2 dados; não mantém comida mesmo com Rubor." },
    3: { frenesi: 1, torpor: "cinco décadas", torporDias: 18250, penalidade: 4, semComida: true, notas: "−4 dados; não consegue fingir sexo." },
    2: { frenesi: 0, torpor: "um século", torporDias: 36500, penalidade: 6, comRubor: 4, semComida: true, notas: "−6 dados (−4 com Rubor de Vida)." },
    1: { frenesi: 0, torpor: "cinco séculos", torporDias: 182500, penalidade: 8, comRubor: 5, semComida: true, notas: "−8 dados (−5 com Rubor de Vida)." },
    0: { frenesi: 0, torpor: "", torporDias: 0, penalidade: 0, besta: true, notas: "A Besta: o personagem passa ao Narrador." },
  };

  /* Pilares (p. 240): Máculas por evento. */
  var MACULAS_DE_PILAR = [
    { chave: "enlacar", nome: "Enlaçar um mortal", maculas: 1 },
    { chave: "abracar", nome: "Abraçar um mortal", maculas: 2 },
    { chave: "pilarFerido", nome: "Um Pilar sofre dano", maculas: 1 },
    { chave: "pilarFeridoPorVoce", nome: "Um Pilar sofre dano por suas ações", maculas: 2 },
    { chave: "pilarDestruido", nome: "Um Pilar é destruído", maculas: 2 },
    { chave: "pilarDestruidoPorVoce", nome: "Um Pilar é destruído por suas ações", maculas: 3 },
  ];

  /* ---------------------------------------------------------------
     CLÃS (p. 59–114)
     --------------------------------------------------------------- */

  /* `perdicao.efeito`: o que o motor aplica com a Gravidade da Perdição.
     `compulsao`: a Compulsão de clã (p. 210–211). */
  var CLAS = {
    brujah: {
      nome: "Brujah", disciplinas: ["celeridade", "potencia", "presenca"], pagina: 61,
      perdicao: { pagina: 67, efeito: "resistirFuria", texto: "Subtraia a Gravidade da Perdição de qualquer parada para resistir a frenesi de fúria (mínimo 1 dado)." },
      compulsao: { chave: "rebeliao", nome: "Rebelião", penalidade: 2, alvo: "todas", termina: "Contrariar alguém, fazer alguém mudar de ideia ou fazer o oposto do esperado.", pagina: 210 },
    },
    gangrel: {
      nome: "Gangrel", disciplinas: ["animalismo", "fortitude", "proteanismo"], pagina: 68,
      perdicao: { pagina: 73, efeito: "aspectosAnimais", texto: "Em frenesi, ganha aspectos animalescos em número igual à Gravidade; cada um reduz um Atributo em 1 até uma noite depois. Curtindo a Onda, pode manifestar só um." },
      compulsao: { chave: "impulsosFerais", nome: "Impulsos Ferais", penalidade: 3, alvo: ["manipulacao", "inteligencia"], duracao: "cena", termina: "Fim da cena.", pagina: 210 },
    },
    malkaviano: {
      nome: "Malkavianos", disciplinas: ["auspicios", "dominacao", "ofuscacao"], pagina: 74,
      perdicao: { pagina: 79, efeito: "categoriaAfligida", texto: "Em falha bestial ou Compulsão, penalidade igual à Gravidade numa categoria de parada (definida na criação) por toda a cena." },
      compulsao: { chave: "delirio", nome: "Delírio", penalidade: 2, alvo: ["destreza", "manipulacao", "autocontrole", "raciocinio", "frenesiDeTerror"], duracao: "cena", termina: "Fim da cena.", pagina: 210 },
    },
    nosferatu: {
      nome: "Nosferatu", disciplinas: ["animalismo", "ofuscacao", "potencia"], pagina: 80,
      perdicao: { pagina: 85, efeito: "repulsivo", texto: "Defeito Repulsivo (−2) e nunca aumentam a Qualidade Visual; tentar esconder as deformidades sofre penalidade igual à Gravidade (inclui Máscara de Mil Faces e Disfarce do Impostor)." },
      compulsao: { chave: "criptofilia", nome: "Criptofilia", penalidade: 2, alvo: "naoSegredo", termina: "Aprender um segredo grande o bastante.", pagina: 210 },
    },
    toreador: {
      nome: "Toreador", disciplinas: ["auspicios", "celeridade", "presenca"], pagina: 86,
      perdicao: { pagina: 91, efeito: "ambienteFeio", texto: "Em ambiente menos que belo, as paradas para acionar Disciplinas sofrem redutor igual à Gravidade (o Narrador decide)." },
      compulsao: { chave: "obsessao", nome: "Obsessão", penalidade: 2, alvo: "naoObjeto", duracao: "cena", termina: "Deixar de perceber o objeto belo, ou o fim da cena.", pagina: 211 },
    },
    tremere: {
      nome: "Tremere", disciplinas: ["auspicios", "dominacao", "feiticaria"], pagina: 92,
      perdicao: { pagina: 97, efeito: "lacoDiminuido", texto: "Não criam Laços com outros Membros; para enlaçar mortais e carniçais, o vitae precisa ser consumido um número de vezes extra igual à Gravidade." },
      compulsao: { chave: "perfeccionismo", nome: "Perfeccionismo", penalidade: 2, alvo: "todas", duracao: "cena", termina: "Vitória crítica numa rolagem de Habilidade, ou fim da cena; repetir a ação reduz a penalidade para 1, e na segunda repetição ela some.", pagina: 211 },
    },
    ventrue: {
      nome: "Ventrue", disciplinas: ["dominacao", "fortitude", "presenca"], pagina: 98,
      perdicao: { pagina: 102, efeito: "presaExclusiva", texto: "Só se alimentam do tipo de vítima preferido; outro tipo exige gastar Força de Vontade igual à Gravidade (senão vomita). Determinação + Percepção (Dif 4+) para sentir se o mortal serve." },
      compulsao: { chave: "arrogancia", nome: "Arrogância", penalidade: 2, alvo: "naoOrdem", termina: "Alguém obedecer uma ordem (não por Dominação).", pagina: 211 },
    },
    caitiff: {
      nome: "Caitiff", disciplinas: [], pagina: 105, semCla: true,
      perdicao: { pagina: 107, efeito: "", texto: "Sem Perdição de clã. Começa com o Defeito Suspeito (•) e não pode ter Status na criação; aumentar Disciplinas custa 6 × o novo nível." },
      compulsao: null,
    },
    sangueRalo: {
      nome: "Sangue-Ralo", disciplinas: [], pagina: 109, semCla: true, sangueRalo: true,
      perdicao: { pagina: 111, efeito: "", texto: "Sem Perdição nem Compulsão de clã (salvo o Defeito Maldição de Clã)." },
      compulsao: null,
    },
  };

  /* ---------------------------------------------------------------
     COMPULSÕES (p. 208–211) e FRENESI (p. 219–220)
     --------------------------------------------------------------- */

  var COMPULSOES = {
    fome: { nome: "Fome", penalidade: 2, alvo: "naoAlimentar", termina: "Saciar pelo menos 1 nível de Fome.", encerraAoSaciar: true, pagina: 208 },
    dominancia: { nome: "Dominância", penalidade: 2, alvo: "naoDominar", termina: "Vencer e se regozijar; trabalho em equipe proibido.", pagina: 208 },
    dano: { nome: "Dano", penalidade: 2, alvo: "naoFerir", termina: "Incapacitar, destruir ou expulsar o alvo.", pagina: 209 },
    paranoia: { nome: "Paranoia", penalidade: 2, alvo: "naoFugir", termina: "Cerca de uma hora num local seguro.", pagina: 209 },
  };
  /* Tabela aleatória (d10): 1–3 Fome, 4–5 Dominância, 6–7 Dano,
     8–9 Paranoia, 10 Compulsão de Clã (rerrole sem clã). */
  function compulsaoDaTabela(face) {
    var f = Number(face);
    if (f <= 3) return "fome";
    if (f <= 5) return "dominancia";
    if (f <= 7) return "dano";
    if (f <= 9) return "paranoia";
    return "cla";
  }

  var FRENESI = {
    furia: { nome: "Fúria", pagina: 220, gatilhos: [
      { nome: "Amigo morto", dificuldade: 2 }, { nome: "Pilar ou amante ferido", dificuldade: 3 },
      { nome: "Pilar ou amante morto", dificuldade: 4 }, { nome: "Provocação ou assédio físico", dificuldade: 2 },
      { nome: "Ofendido por um inferior", dificuldade: 2 }, { nome: "Humilhação pública", dificuldade: 2 },
    ], termina: "Destruir o alvo ou fim da cena; depois de destruir, Força de Vontade Dif 3 (5 se ainda houver inimigos de pé) para encerrar." },
    fome: { nome: "Fome", pagina: 220, gatilhos: [
      { nome: "Ferida aberta ou cheiro de sangue (Fome 4+)", dificuldade: 2, fomeMinima: 4 },
      { nome: "Gosto de sangue (Fome 4+)", dificuldade: 3, fomeMinima: 4 },
      { nome: "Falha numa Checagem com Fome 5", dificuldade: 4, fomeMinima: 5 },
    ], termina: "Fome 1 ou menos." },
    terror: { nome: "Terror", pagina: 220, gatilhos: [
      { nome: "Fogueira", dificuldade: 2 }, { nome: "Interior de construção em chamas", dificuldade: 3 },
      { nome: "Ser queimado", dificuldade: 2 }, { nome: "Luz do sol obscurecida", dificuldade: 3 },
      { nome: "Exposição total ao sol", dificuldade: 4 },
    ], termina: "Não perceber mais o perigo, ou fim da cena." },
  };

  /* ---------------------------------------------------------------
     FOME E ALIMENTAÇÃO (p. 205–213)
     --------------------------------------------------------------- */

  /* `sacia`: Fome reduzida; `maxSacia` quando variável. `tempo`: texto.
     `ressonancia`: "humana" | "animal" | "nenhuma". `danoNaVitima`:
     Agravado igual à Fome saciada. `mata`: única fonte que leva a 0. */
  var FONTES_DE_SANGUE = {
    animaisPequenos: { nome: "Vários animais pequenos (3–4 gatos, 12+ ratos)", sacia: 1, tempo: "uma cena", animal: true, ressonancia: "animal", pagina: 212 },
    animalMedio: { nome: "Animal médio (guaxinim, cachorro, coiote)", sacia: 1, tempo: "um turno", animal: true, ressonancia: "animal", pagina: 212 },
    animalGrande: { nome: "Animal grande (cavalo)", sacia: 2, tempo: "uma cena", animal: true, ressonancia: "animal", pagina: 212 },
    bolsaDeSangue: { nome: "Bolsa de banco de sangue", sacia: 1, tempo: "um turno", ensacado: true, ressonancia: "nenhuma", pagina: 212 },
    humanoGoles: { nome: "Alguns goles de um humano", sacia: 1, tempo: "três turnos", humano: true, ressonancia: "humana", pagina: 212 },
    humanoSemDano: { nome: "O máximo sem causar dano a um humano", sacia: 2, tempo: "uma cena", humano: true, ressonancia: "humana", pagina: 212 },
    humanoFerido: { nome: "Até causar dano (risco de morte sem tratamento)", sacia: 4, minSacia: 1, tempo: "um turno por Fome saciada", humano: true, ressonancia: "humana", danoNaVitima: true, sobrevivencia: true, pagina: 212 },
    humanoDrenado: { nome: "Humano completamente drenado e morto", sacia: 5, tempo: "cinco turnos", humano: true, ressonancia: "humana", mata: true, pagina: 212 },
    vampiro: { nome: "Outro vampiro", sacia: 1, tempo: "por turno", vampiro: true, ressonancia: "humana", pagina: 213 },
  };

  var TERRITORIOS_DE_CACA = [
    { chave: "favela", nome: "Favela, subúrbio, projeto de habitação pública ou banlieue", dificuldade: 2 },
    { chave: "boemio", nome: "Bairro boêmio ou hipster, bairro pobre ou em gentrificação", dificuldade: 3 },
    { chave: "classeMedia", nome: "Bairro de classe média, comercial, turístico, aeroporto ou cassino", dificuldade: 4 },
    { chave: "industrial", nome: "Bairro industrial ou portuário, zona residencial de classe média alta", dificuldade: 5 },
    { chave: "rico", nome: "Bairro rico", dificuldade: 6 },
  ];
  var MODIFICADORES_DE_CACA = [
    { chave: "policia", nome: "Presença da polícia maior que a normal", valor: 1 },
    { chave: "seguranca", nome: "Segurança reforçada", valor: 2 },
    { chave: "multidao", nome: "Festival, parada, comício, multidões", valor: -2 },
  ];

  /* ---------------------------------------------------------------
     RESSONÂNCIA E DISCRASIAS (p. 226–231)
     --------------------------------------------------------------- */

  var RESSONANCIAS = {
    colerica: { nome: "Colérica", disciplinas: ["celeridade", "potencia"], humor: "irado, violento, provocador, passional, invejoso" },
    melancolica: { nome: "Melancólica", disciplinas: ["fortitude", "ofuscacao"], humor: "triste, assustado, intelectual, deprimido, equilibrado" },
    fleumatica: { nome: "Fleumática", disciplinas: ["auspicios", "dominacao"], humor: "preguiçoso, apático, calmo, controlador, sentimental" },
    sanguinea: { nome: "Sanguínea", disciplinas: ["feiticaria", "presenca"], humor: "excitado, feliz, viciado, ativo, volúvel, entusiasmado" },
    animal: { nome: "Sangue animal", disciplinas: ["animalismo", "proteanismo"], humor: "a natureza do animal" },
  };
  var TEMPERAMENTOS = { efemero: "Efêmero", intenso: "Intenso", agudo: "Agudo" };
  /* d10 da Ressonância aleatória (p. 228). */
  function ressonanciaDaTabela(face) {
    var f = Number(face);
    if (f <= 3) return "fleumatica";
    if (f <= 6) return "melancolica";
    if (f <= 8) return "colerica";
    return "sanguinea";
  }

  /* `efeito`: o que o motor sabe aplicar. `uso`: "unico" consome. */
  var DISCRASIAS = {
    agressivo: { ressonancia: "colerica", nome: "Agressivo", efeito: { rerrolarHabilidade: ["intimidacao"] }, texto: "Rerrole quaisquer rolagens com Intimidação (dados de Fome com 1 da primeira rolagem ficam)." },
    cicloDeViolencia: { ressonancia: "colerica", nome: "Ciclo de Violência", efeito: { proximaAlimentacao: { colerica: 1, outra: -1 } }, uso: "unico", texto: "Próxima alimentação colérica sacia +1; outras, −1." },
    energetico: { ressonancia: "colerica", nome: "Energético", efeito: { xpGratis: ["celeridade", "potencia"] }, uso: "unico", texto: "+1 XP grátis para Celeridade ou Potência." },
    escrupuloso: { ressonancia: "colerica", nome: "Escrupuloso", efeito: { rerrolarContra: "inimigo ideológico" }, texto: "Rerrole qualquer rolagem num conflito contra um inimigo ideológico." },
    inveja: { ressonancia: "colerica", nome: "Inveja", efeito: { danoExtra: 1, condicao: "oponente melhor" }, texto: "+1 de dano contra oponentes melhores (físico e social)." },
    valentao: { ressonancia: "colerica", nome: "Valentão", efeito: { danoExtra: 1, condicao: "oponente mais fraco" }, texto: "+1 de dano contra oponentes mais fracos." },
    vingativo: { ressonancia: "colerica", nome: "Vingativo", efeito: { dados: 2, condicao: "contra o alvo da vingança" }, texto: "+2 dados contra o tipo de alvo ou o indivíduo odiado." },
    amorPerdido: { ressonancia: "melancolica", nome: "Amor Perdido", efeito: { dados: 1, condicao: "resistir a sedução (inclui Presença)" }, texto: "+1 dado para resistir a sedução." },
    emLuto: { ressonancia: "melancolica", nome: "Em Luto", efeito: { remorso: 1 }, texto: "+1 dado em Remorso." },
    evocador: { ressonancia: "melancolica", nome: "Evocador", efeito: { xpGratis: ["fortitude", "ofuscacao"] }, uso: "unico", texto: "+1 XP grátis para Fortitude ou Ofuscação." },
    falhaEpica: { ressonancia: "melancolica", nome: "Falha Épica", efeito: { rerrolarContra: "testes ligados à falha" }, texto: "Rerrole testes que lembrem da falha." },
    nostalgico: { ressonancia: "melancolica", nome: "Nostálgico", efeito: { dados: 1, condicao: "ligado à década, arte ou grupo", memoriam: 3 }, texto: "+1 dado ligado à época; +3 numa parada de Memoriam." },
    parentePerdido: { ressonancia: "melancolica", nome: "Parente Perdido", efeito: { saciaExtra: 1, condicao: "parentes" }, texto: "Sacia +1 ao se alimentar dos parentes." },
    anestesiado: { ressonancia: "fleumatica", nome: "Anestesiado", efeito: { ignoraDor: true }, texto: "Sem penalidade de dor física ou social." },
    comendoEmocoes: { ressonancia: "fleumatica", nome: "Comendo suas Emoções", efeito: { comer: true }, texto: "Come e digere alimentos sem enjoo." },
    dadoPorVencido: { ressonancia: "fleumatica", nome: "Dado por Vencido", efeito: { proximaAlimentacao: { fleumatica: 1, outra: -1 } }, uso: "unico", texto: "Próxima alimentação fleumática sacia +1; outras, −1." },
    indiferente: { ressonancia: "fleumatica", nome: "Indiferente", efeito: { frenesi: 2 }, texto: "+2 dados para resistir a frenesi." },
    loboSolitario: { ressonancia: "fleumatica", nome: "Lobo Solitário", efeito: { dados: 1, condicao: "sozinho", ajuda: -1 }, texto: "+1 dado sozinho; −1 ao ajudar em equipe; uma cena." },
    procrastinar: { ressonancia: "fleumatica", nome: "Procrastinar", efeito: { fdvPorSessao: 1 }, texto: "Recupera 1 FdV ao adiar algo importante por um dia (1× por sessão)." },
    reflexao: { ressonancia: "fleumatica", nome: "Reflexão", efeito: { xpGratis: ["auspicios", "dominacao"] }, uso: "unico", texto: "+1 XP grátis para Auspícios ou Dominação." },
    amorVerdadeiro: { ressonancia: "sanguinea", nome: "Amor Verdadeiro", efeito: { saciaExtra: 1, condicao: "do amor da bolsa" }, texto: "Sacia +1 com o amor da bolsa." },
    arrebatamento: { ressonancia: "sanguinea", nome: "Arrebatamento Maníaco", efeito: { dados: 1, ateFalhar: true, depois: -2 }, texto: "+1 dado em todos os testes até falhar; depois, −2 em todos." },
    bulicoso: { ressonancia: "sanguinea", nome: "Buliçoso", efeito: { xpGratis: ["feiticaria", "presenca"] }, uso: "unico", texto: "+1 XP grátis para Feitiçaria de Sangue ou Presença." },
    entusiasmoConstante: { ressonancia: "sanguinea", nome: "Entusiasmo Constante", efeito: { dados: 3, condicao: "convencer ao tocar a pele" }, texto: "Tocando a pele: +3 dados para convencer." },
    entusiasmoPelaVida: { ressonancia: "sanguinea", nome: "Entusiasmo pela Vida", efeito: { ruborGratis: true }, texto: "Rubor de Vida sem Checagem." },
    jogoDoOlfato: { ressonancia: "sanguinea", nome: "Jogo do Olfato", efeito: { dados: 3, condicao: "detectar bolsas Sanguíneas" }, texto: "+3 dados para detectar bolsas Sanguíneas." },
  };

  /* ---------------------------------------------------------------
     TIPOS DE PREDADOR (p. 175–178; paradas de caça p. 307–308)
     --------------------------------------------------------------- */

  /* Estrutura: `especializacoes` (escolha 1), `disciplinas` (escolha 1;
     `soTremere` limita), `vantagens`/`defeitos` fixos ou `escolha` com
     pontos a repartir; `humanidade`, `potencia`; `proibidoPara` clãs;
     `potenciaMaxima`; `parada` de caça. */
  var PREDADORES = {
    consensualista: {
      nome: "Consensualista", pagina: 175,
      especializacoes: [{ habilidade: "medicina", nome: "Flebotomia" }, { habilidade: "persuasao", nome: "Bolsas" }],
      disciplinas: ["auspicios", "fortitude"],
      humanidade: 1,
      defeitos: [{ chave: "segredoSombrio", pontos: 1, nota: "Quebrador da Máscara" }, { chave: "exclusaoDePresa", pontos: 1, nota: "sem consentimento" }],
      parada: [["manipulacao", "persuasao"]],
    },
    fazendeiro: {
      nome: "Fazendeiro", pagina: 175, proibidoPara: ["ventrue"], potenciaMaxima: 2,
      especializacoes: [{ habilidade: "empatiaComAnimais", nome: "Animal Específico" }, { habilidade: "sobrevivencia", nome: "Caça" }],
      disciplinas: ["animalismo", "proteanismo"],
      humanidade: 1,
      defeitos: [{ chave: "fazendeiro", pontos: 2 }],
      parada: [["autocontrole", "empatiaComAnimais"]],
    },
    osiris: {
      nome: "Osíris", pagina: 176,
      especializacoes: [{ habilidade: "ocultismo", nome: "Tradição específica" }, { habilidade: "performance", nome: "Campo de entretenimento" }],
      disciplinas: ["feiticaria", "presenca"], soTremere: ["feiticaria"],
      escolhas: [
        { tipo: "antecedente", pontos: 3, entre: ["fama", "rebanho"] },
        { tipo: "defeito", pontos: 2, entre: ["inimigos", "miticos"] },
      ],
      parada: [["manipulacao", "subterfugio"], ["intimidacao", "fama"]],
    },
    sacoleiro: {
      nome: "Sacoleiro", pagina: 176, proibidoPara: ["ventrue"],
      especializacoes: [{ habilidade: "ladroagem", nome: "Abrir Fechaduras" }, { habilidade: "manha", nome: "Mercado Negro" }],
      disciplinas: ["feiticaria", "ofuscacao"], soTremere: ["feiticaria"],
      vantagens: [{ chave: "esofagoDeFerro", pontos: 3 }],
      defeitos: [{ chave: "inimigos", pontos: 2 }],
      parada: [["inteligencia", "manha"]],
    },
    sandman: {
      nome: "Sandman", pagina: 176,
      especializacoes: [{ habilidade: "medicina", nome: "Anestésicos" }, { habilidade: "furtividade", nome: "Invasão" }],
      disciplinas: ["auspicios", "ofuscacao"],
      vantagens: [{ chave: "recursos", pontos: 1 }],
      parada: [["destreza", "furtividade"]],
    },
    sanguessuga: {
      nome: "Sanguessuga", pagina: 177,
      especializacoes: [{ habilidade: "briga", nome: "Membros" }, { habilidade: "furtividade", nome: "contra Membros" }],
      disciplinas: ["celeridade", "proteanismo"],
      humanidade: -1, potencia: 1,
      escolhas: [{ tipo: "defeitoUnico", entre: [{ chave: "segredoSombrio", pontos: 2, nota: "Diablerista" }, { chave: "segregado", pontos: 2 }] }],
      defeitos: [{ chave: "exclusaoDePresa", pontos: 2, nota: "mortais" }],
      parada: [["manipulacao", "subterfugio"]],
    },
    sceneQueen: {
      nome: "Scene Queen", pagina: 177,
      especializacoes: [{ habilidade: "etiqueta", nome: "Cena específica" }, { habilidade: "lideranca", nome: "Cena específica" }, { habilidade: "manha", nome: "Cena específica" }],
      disciplinas: ["dominacao", "potencia"],
      vantagens: [{ chave: "fama", pontos: 1 }, { chave: "contatos", pontos: 1 }],
      escolhas: [{ tipo: "defeitoUnico", entre: [{ chave: "malquisto", pontos: 1, nota: "Rejeitado fora da subcultura" }, { chave: "exclusaoDePresa", pontos: 1, nota: "uma subcultura diferente da sua" }] }],
      parada: [["manipulacao", "persuasao"]],
    },
    sereia: {
      nome: "Sereia", pagina: 177,
      especializacoes: [{ habilidade: "persuasao", nome: "Sedução" }, { habilidade: "subterfugio", nome: "Sedução" }],
      disciplinas: ["fortitude", "presenca"],
      vantagens: [{ chave: "belo", pontos: 2 }],
      defeitos: [{ chave: "inimigos", pontos: 1, nota: "amante desprezado ou parceiro ciumento" }],
      parada: [["carisma", "subterfugio"]],
    },
    trinchador: {
      nome: "Trinchador", pagina: 178,
      especializacoes: [{ habilidade: "persuasao", nome: "Gaslighting" }, { habilidade: "subterfugio", nome: "Encobrimento" }],
      disciplinas: ["dominacao", "animalismo"],
      vantagens: [{ chave: "rebanho", pontos: 2 }],
      defeitos: [{ chave: "segredoSombrio", pontos: 1, nota: "Trinchador" }],
      parada: [["manipulacao", "subterfugio"]],
    },
    viraLata: {
      nome: "Vira-lata", pagina: 178,
      especializacoes: [{ habilidade: "intimidacao", nome: "Assalto à Mão Armada" }, { habilidade: "briga", nome: "Agarramento" }],
      disciplinas: ["celeridade", "potencia"],
      humanidade: -1,
      vantagens: [{ chave: "contatos", pontos: 3, nota: "criminosos" }],
      parada: [["forca", "briga"], ["raciocinio", "manha"]],
    },
  };

  /* ---------------------------------------------------------------
     VANTAGENS (p. 179–194)
     --------------------------------------------------------------- */

  /* tipo: "qualidade" | "antecedente" | "defeito". `niveis`: os valores
     permitidos. `grupo`: o título do livro. `efeito`: o que o motor
     aplica. `requisito`: idade/clã/condição. `nome` de defeito com o
     mesmo grupo mostra que são espelhos. */
  var VANTAGENS = {
    // Linguística
    linguistica: { tipo: "qualidade", grupo: "Linguística", nome: "Linguística", niveis: [1, 2, 3, 4, 5], porNivel: true, texto: "Um idioma adicional por ponto.", pagina: 179 },
    analfabeto: { tipo: "defeito", grupo: "Linguística", nome: "Analfabeto", niveis: [2], efeito: { limiteHabilidade: { erudicao: 1, ciencia: 1 } }, texto: "Erudição e Ciência limitadas a 1, sem especializações modernas.", pagina: 179 },
    // Visual
    repulsivo: { tipo: "defeito", grupo: "Visual", nome: "Repulsivo", niveis: [2], efeito: { social: -2 }, texto: "−2 dados em paradas Sociais relevantes.", pagina: 179 },
    feio: { tipo: "defeito", grupo: "Visual", nome: "Feio", niveis: [1], efeito: { social: -1 }, texto: "−1 dado em paradas Sociais relevantes.", pagina: 179 },
    belo: { tipo: "qualidade", grupo: "Visual", nome: "Belo", niveis: [2], efeito: { social: 1 }, proibidoPara: ["nosferatu"], texto: "+1 dado em paradas Sociais apropriadas.", pagina: 179 },
    deslumbrante: { tipo: "qualidade", grupo: "Visual", nome: "Deslumbrante", niveis: [4], efeito: { social: 2 }, proibidoPara: ["nosferatu"], texto: "+2 dados em paradas Sociais apropriadas.", pagina: 179 },
    // Uso de substância
    vicioIncuravel: { tipo: "defeito", grupo: "Uso de Substância", nome: "Vício Incurável", niveis: [2], efeito: { abstinencia: -2 }, texto: "−2 em todas as paradas quando a última vítima não estava sob efeito da droga (exceto para obtê-la).", pagina: 179 },
    dependencia: { tipo: "defeito", grupo: "Uso de Substância", nome: "Dependência", niveis: [1], efeito: { abstinencia: -1 }, texto: "−1 em todas as paradas quando a última vítima não estava sob efeito da droga.", pagina: 179 },
    viciadoFuncional: { tipo: "qualidade", grupo: "Uso de Substância", nome: "Viciado Funcional", niveis: [1], efeito: { sobEfeito: 1 }, texto: "+1 dado numa categoria de parada quando a última vítima estava sob efeito.", pagina: 180 },
    // Arcaico
    arcaico: { tipo: "defeito", grupo: "Arcaico", nome: "Arcaico", niveis: [2], requisito: { idadeMinima: "ancilla" }, efeito: { limiteHabilidade: { tecnologia: 0 } }, texto: "Tecnologia permanentemente 0; −1 dado com tecnologia moderna.", pagina: 180 },
    vivendoNoPassado: { tipo: "defeito", grupo: "Arcaico", nome: "Vivendo no Passado", niveis: [1], requisito: { idadeMinima: "ancilla" }, texto: "−1 dado em Sociais que envolvam crenças antiquadas.", pagina: 180 },
    // Laço
    escravoDoLaco: { tipo: "defeito", grupo: "Laço", nome: "Escravo do Laço", niveis: [2], efeito: { lacoNoPrimeiroGole: true }, texto: "Enlaça ao primeiro gole.", pagina: 180 },
    viciadoEmLaco: { tipo: "defeito", grupo: "Laço", nome: "Viciado em Laço", niveis: [1], efeito: { contraLaco: -1 }, texto: "−1 dado para agir contra um Laço.", pagina: 180 },
    lacoLongo: { tipo: "defeito", grupo: "Laço", nome: "Laço Longo", niveis: [1], efeito: { lacoEnfraquece: "trimestre" }, texto: "Laços perdem força mais devagar: 1 nível a cada 3 meses.", pagina: 180 },
    resistenciaAoLaco: { tipo: "qualidade", grupo: "Laço", nome: "Resistência ao Laço", niveis: [1, 2, 3], efeito: { resistirLacoPorNivel: 1 }, texto: "+1 dado por nível para resistir a um Laço.", pagina: 180 },
    lacoCurto: { tipo: "qualidade", grupo: "Laço", nome: "Laço Curto", niveis: [2], efeito: { lacoEnfraquece: "quinzena" }, texto: "Laços perdem 2 níveis por mês.", pagina: 181 },
    aProvaDeLaco: { tipo: "qualidade", grupo: "Laço", nome: "À Prova de Laço", niveis: [5], efeito: { imuneLaco: true }, texto: "Não pode ser Enlaçado.", pagina: 181 },
    // Alimentação
    fazendeiro: { tipo: "defeito", grupo: "Alimentação", nome: "Fazendeiro", niveis: [2], proibidoPara: ["ventrue"], efeito: { soAnimal: true, custoHumanoFdV: 2 }, texto: "Só se alimenta de sangue animal; beber humano custa 2 FdV.", pagina: 181 },
    organivoro: { tipo: "defeito", grupo: "Alimentação", nome: "Organívoro", niveis: [2], efeito: { soOrgaos: true }, texto: "Só reduz Fome comendo carne e órgãos humanos.", pagina: 181 },
    sedeDoMatusalem: { tipo: "defeito", grupo: "Alimentação", nome: "Sede do Matusalém", niveis: [1], efeito: { fomeMinima: 1 }, texto: "Só fica totalmente saciado com sangue sobrenatural; senão, Fome mínima 1.", pagina: 181 },
    exclusaoDePresa: { tipo: "defeito", grupo: "Alimentação", nome: "Exclusão de Presa", niveis: [1, 2], efeito: { presaExcluida: true }, texto: "Recusa uma classe de presa; alimentar-se dela gera Máculas como violar um Princípio.", pagina: 181 },
    sabujoDeSangue: { tipo: "qualidade", grupo: "Alimentação", nome: "Sabujo de Sangue", niveis: [1], efeito: { farejarRessonancia: true }, texto: "Fareja a Ressonância sem provar: Determinação + Percepção, Dif 3.", pagina: 182 },
    esofagoDeFerro: { tipo: "qualidade", grupo: "Alimentação", nome: "Esôfago de Ferro", niveis: [3], proibidoPara: ["ventrue"], efeito: { ensacadoIntegral: true }, texto: "Alimenta-se de sangue frio, rançoso ou plasma fracionado (sem Ressonância).", pagina: 182 },
    // Míticos
    iscaDeEstaca: { tipo: "defeito", grupo: "Míticos", nome: "Isca de Estaca", niveis: [2], efeito: { estacaMata: true }, texto: "Estacado no coração: Morte Final em vez de Torpor.", pagina: 182 },
    perdicaoFolclorica: { tipo: "defeito", grupo: "Míticos", nome: "Perdição Folclórica", niveis: [1], parametro: ["Luz UV", "Prata", "Água benta"], texto: "Sofre Agravado da substância escolhida.", pagina: 182 },
    tabuFolclorico: { tipo: "defeito", grupo: "Míticos", nome: "Tabu Folclórico", niveis: [1], texto: "Diante do tabu, afasta-se ou gasta 1 FdV.", pagina: 182 },
    estigma: { tipo: "defeito", grupo: "Míticos", nome: "Estigma", niveis: [1], texto: "Com Fome 4, começa a sangrar.", pagina: 182 },
    ingerirComida: { tipo: "qualidade", grupo: "Míticos", nome: "Ingerir Comida", niveis: [2], texto: "Consome comida (sem nutrição) e a expele antes de descansar.", pagina: 182 },
    // Antecedentes
    aliados: { tipo: "antecedente", grupo: "Aliados", nome: "Aliados", niveis: [1, 2, 3, 4, 5, 6], relacao: true, texto: "Efetividade (• fraco a •••• mortífero) + confiabilidade (• a •••); até 6 pontos.", pagina: 184 },
    inimigos: { tipo: "defeito", grupo: "Aliados", nome: "Inimigos", niveis: [1, 2, 3, 4, 5, 6], relacao: true, texto: "Um adversário mortal com a mesma escala de Aliados.", pagina: 184 },
    contatos: { tipo: "antecedente", grupo: "Contatos", nome: "Contatos", niveis: [1, 2, 3], relacao: true, texto: "• barato/comum; •• útil; ••• caro ou difícil.", pagina: 185 },
    fama: { tipo: "antecedente", grupo: "Fama", nome: "Fama", niveis: [1, 2, 3, 4, 5], efeito: { famaCaca: true }, texto: "Subtrai da Dificuldade de testes sociais com fãs; dificulta caçar com discrição.", pagina: 186 },
    infamia: { tipo: "defeito", grupo: "Fama", nome: "Infâmia", niveis: [1, 2, 3, 4, 5], texto: "Reputação ruim conhecida.", pagina: 186 },
    segredoSombrio: { tipo: "defeito", grupo: "Fama", nome: "Segredo Sombrio", niveis: [1, 2], texto: "Um segredo que, revelado, traria perigo.", pagina: 187 },
    influencia: { tipo: "antecedente", grupo: "Influência", nome: "Influência", niveis: [1, 2, 3, 4, 5], texto: "Bem-Relacionado, Influente, Estabelecido, Poderoso, Dominante.", pagina: 187 },
    desprezado: { tipo: "defeito", grupo: "Influência", nome: "Desprezado", niveis: [2], efeito: { social: -2, condicao: "convencer alguém neutro do grupo" }, texto: "−2 dados para convencer neutros.", pagina: 187 },
    malquisto: { tipo: "defeito", grupo: "Influência", nome: "Malquisto", niveis: [1], efeito: { social: -1, condicao: "com o grupo" }, texto: "−1 dado em Sociais com o grupo.", pagina: 187 },
    refugio: { tipo: "antecedente", grupo: "Refúgio", nome: "Refúgio", niveis: [1, 2, 3], efeito: { refugio: true }, texto: "+1 Dificuldade para detectar/invadir por ponto; +1 dado para perceber perigo ou despertar.", pagina: 188 },
    semRefugio: { tipo: "defeito", grupo: "Refúgio", nome: "Nenhum Refúgio", niveis: [1], texto: "Não tem refúgio.", pagina: 188 },
    refugioQualidade: { tipo: "qualidade", grupo: "Refúgio", nome: "Qualidade de Refúgio", niveis: [1, 2, 3], porNivel: true, parametro: ["Arsenal Oculto", "Cela", "Vigilância", "Laboratório", "Biblioteca", "Localização", "Luxo", "Poterna", "Sistema de Segurança", "Sala de Operações", "Proteção"], texto: "Cada ponto, uma qualidade do refúgio (p. 188–189).", pagina: 188 },
    refugioDefeito: { tipo: "defeito", grupo: "Refúgio", nome: "Defeito de Refúgio", niveis: [1, 2], parametro: ["Comprometido (••)", "Assustador (•)", "Assombrado (•)"], texto: "Comprometido +2 dados a invasores; Assustador −2 Sociais para seduzir hóspedes; Assombrado.", pagina: 189 },
    rebanho: { tipo: "antecedente", grupo: "Rebanho", nome: "Rebanho", niveis: [1, 2, 3, 4, 5], efeito: { rebanho: true }, texto: "1–3, 4–7, 8–15, 16–30, 31–60 bolsas; alimenta sem rolar para caçar.", pagina: 189 },
    predadorManifesto: { tipo: "defeito", grupo: "Rebanho", nome: "Predador Manifesto", niveis: [2], efeito: { caca: -2, semRebanho: true }, texto: "−2 dados para caçar; não pode manter Rebanho.", pagina: 190 },
    mascara: { tipo: "antecedente", grupo: "Máscara", nome: "Máscara", niveis: [1, 2], texto: "Identidade falsa; •• passa verificação oficial.", pagina: 190 },
    zerado: { tipo: "qualidade", grupo: "Máscara", nome: "Zerado", niveis: [1], requisito: { vantagem: "mascara", nivel: 2 }, texto: "Apagado dos registros.", pagina: 191 },
    sapateiro: { tipo: "qualidade", grupo: "Máscara", nome: "Sapateiro", niveis: [1], requisito: { vantagem: "mascara", nivel: 2 }, texto: "Fabrica Máscaras para outros.", pagina: 191 },
    corpoFrioIdentificado: { tipo: "defeito", grupo: "Máscara", nome: "Corpo Frio Identificado", niveis: [2], texto: "Sua natureza vampírica está em registros.", pagina: 191 },
    cadaverIdentificado: { tipo: "defeito", grupo: "Máscara", nome: "Cadáver Identificado", niveis: [1], texto: "Oficialmente morto.", pagina: 191 },
    mawla: { tipo: "antecedente", grupo: "Mawla", nome: "Mawla", niveis: [1, 2, 3, 4, 5], relacao: true, texto: "Mentor: Neófito, Ancilla, Ancião, Primogênito, Príncipe ou Barão.", pagina: 192 },
    adversario: { tipo: "defeito", grupo: "Mawla", nome: "Adversário", niveis: [1, 2, 3, 4, 5], relacao: true, texto: "Um Membro hostil.", pagina: 193 },
    recursos: { tipo: "antecedente", grupo: "Recursos", nome: "Recursos", niveis: [1, 2, 3, 4, 5], texto: "Proletariado, Classe Média, Rico, Milionário, Bilionário.", pagina: 193 },
    destituido: { tipo: "defeito", grupo: "Recursos", nome: "Destituído", niveis: [1], texto: "Sem renda.", pagina: 193 },
    lacaios: { tipo: "antecedente", grupo: "Lacaios", nome: "Lacaios", niveis: [1, 2, 3], relacao: true, texto: "Servos: decepcionante (Fraco), carniçal (Médio), competente (Talentoso).", pagina: 194 },
    perseguidores: { tipo: "defeito", grupo: "Lacaios", nome: "Perseguidores", niveis: [1], texto: "Alguém insiste em servi-lo.", pagina: 194 },
    status: { tipo: "antecedente", grupo: "Status", nome: "Status", niveis: [1, 2, 3, 4, 5], proibidoPara: ["caitiff", "sangueRalo"], texto: "Conhecido, Respeitado, Influente, Poderoso, Luminar numa seita.", pagina: 194 },
    segregado: { tipo: "defeito", grupo: "Status", nome: "Segregado", niveis: [2], efeito: { social: -2, condicao: "com a facção" }, texto: "Banido de uma facção.", pagina: 194 },
    suspeito: { tipo: "defeito", grupo: "Status", nome: "Suspeito", niveis: [1], efeito: { social: -2, condicao: "com a facção" }, texto: "−2 dados em Sociais com a facção.", pagina: 194 },
  };

  /* Os grupos de Defeitos de Predador que o livro chama pelo grupo
     ("Inimigos ou Míticos"): resolvidos para a chave real. */
  var GRUPOS_DE_DEFEITO = {
    miticos: ["iscaDeEstaca", "perdicaoFolclorica", "tabuFolclorico", "estigma"],
    inimigos: ["inimigos"],
    fama: ["fama"],
    rebanho: ["rebanho"],
  };

  /* Sangue-Ralo (p. 182–184): sem valor em pontos; cada Defeito
     compensa uma Qualidade (1 a 3 de cada na criação). */
  var SANGUE_RALO = {
    qualidades: {
      camaradasAnarchs: { nome: "Camaradas Anarchs", texto: "Equivale a Mawla (Anarch) 1.", conflitaCom: "segregadoPelosAnarchs" },
      contatoNaCamarilla: { nome: "Contato na Camarilla", texto: "Equivale a Mawla (Camarilla) 1.", conflitaCom: "marcadoPelaCamarilla" },
      sangueAgregador: { nome: "Sangue Agregador", texto: "Cria Laços e Abraça como um vampiro pleno (o Abraço gera sangue-ralo)." },
      bebedorDiurno: { nome: "Bebedor Diurno", efeito: { sol: "metadeVitalidade" }, texto: "Ao sol, a Vitalidade cai à metade (arred. para cima) e os dons vampíricos somem; sem outro dano." },
      afinidadeComDisciplina: { nome: "Afinidade com Disciplina", efeito: { disciplinaFixa: 1 }, texto: "1 ponto numa Disciplina; aumenta como Disciplina de fora do clã; a Ressonância não dá pontos temporários." },
      semblanteDeVida: { nome: "Semblante de Vida", efeito: { semblante: true }, conflitaCom: "carneMorta", texto: "Batimento, comida, sexo; só o exame mais avançado nota." },
      alquimista: { nome: "Alquimista Sangue-Ralo", efeito: { alquimia: 1 }, texto: "1 ponto em Alquimia Sangue-Ralo e 1 fórmula." },
      resilienciaVampirica: { nome: "Resiliência Vampírica", efeito: { danoComoVampiro: true }, conflitaCom: "fragilidadeMortal", texto: "Sofre dano como vampiro pleno." },
    },
    defeitos: {
      denteDeLeite: { nome: "Dente de Leite", efeito: { semMordida: true }, texto: "Presas inúteis." },
      temperamentoBestial: { nome: "Temperamento Bestial", efeito: { frenesiPleno: true }, texto: "Testa frenesi como um vampiro pleno." },
      marcadoPelaCamarilla: { nome: "Marcado pela Camarilla", texto: "Registrado pela Camarilla." },
      maldicaoDeCla: { nome: "Maldição de Clã", efeito: { perdicaoDeCla: 1 }, texto: "Uma Perdição de clã com Gravidade 1 (Brujah e Gangrel só com Temperamento Bestial; Tremere só com Sangue Agregador)." },
      carneMorta: { nome: "Carne Morta", efeito: { socialComMortais: -1, semRubor: true }, texto: "−1 dado em Sociais face a face com mortais; não pode usar Semblante de Vida." },
      fragilidadeMortal: { nome: "Fragilidade Mortal", efeito: { curaComoMortal: true }, texto: "Não pode Inflamar o Sangue para curar; cura como mortal." },
      segregadoPelosAnarchs: { nome: "Segregado pelos Anarchs", texto: "Não pode ter Camaradas Anarchs." },
      dependenciaDeVitae: { nome: "Dependência de Vitae", efeito: { vitaeSemanal: true }, texto: "Sem saciar 1 de Fome com vitae por semana, perde Disciplinas e Alquimia." },
    },
  };

  /* Modelos de mortais (p. 185): Aliados, Lacaios, Contatos. */
  var MODELOS_MORTAIS = {
    fraco: { nome: "Fraco", atributos: [2, 2, 1, 1, 1, 1, 1, 1, 1], habilidades: [2, 2, 2, 1, 1, 1, 1, 1], vantagens: 0, defeitos: 0 },
    medio: { nome: "Médio", atributos: [3, 3, 2, 2, 2, 1, 1, 1, 1], habilidades: [3, 3, 3, 2, 2, 2, 2, 1, 1, 1, 1, 1], vantagens: 3, defeitos: 2 },
    talentoso: { nome: "Talentoso", atributos: [4, 3, 3, 2, 2, 1, 1, 1, 1], habilidades: [4, 4, 3, 3, 3, 3, 2, 2, 2, 2, 1, 1, 1, 1], especializacoes: 1, vantagens: 10, defeitos: 4 },
    mortifero: { nome: "Mortífero", atributos: [5, 5, 4, 4, 3, 3, 2, 2, 2], habilidades: [5, 4, 4, 4, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2], especializacoes: 3, vantagens: 15, defeitos: 0 },
  };

  /* ---------------------------------------------------------------
     COTERIE E DOMÍNIO (p. 195–199)
     --------------------------------------------------------------- */

  var DOMINIO = {
    chasse: { nome: "Chasse", texto: "1 ponto: Dificuldade de caça 6 no domínio; cada ponto a mais reduz 1 (Chasse 5 → 2).", pagina: 196 },
    lien: { nome: "Lien", texto: "+1 dado por ponto para interagir pacificamente com mortais nativos, encontrar algo ou investigar no domínio. Nunca modifica caça.", pagina: 196 },
    portillon: { nome: "Portillon", texto: "−1 dado por ponto na parada de quem tenta invadir, investigar ou vigiar o domínio sem a coterie saber.", pagina: 196 },
  };
  function dificuldadeDeCacaDoChasse(chasse) {
    var c = Math.max(0, Math.min(5, Number(chasse) || 0));
    return c ? 7 - c : 0;
  }

  /* Tipos de coterie: o que custa da parada (domínio e antecedentes);
     `extras` são sugestões que o grupo pode comprar. */
  var COTERIES = {
    campeoes: { nome: "Campeões", dominio: { chasse: 1, lien: 3 }, antecedentes: { aliados: 1 }, defeitos: { inimigos: 2 }, extras: ["Adversários", "Contatos"] },
    cerbero: { nome: "Cérbero", dominio: { chasse: 1, portillon: 3 }, antecedentes: { refugio: 2 }, extras: ["Adversário", "Defeito de Refúgio (Assombrado)", "Status"] },
    comando: { nome: "Comando", dominio: { chasse: 1, portillon: 2 }, antecedentes: { mawla: 3, status: 1 }, defeitos: { inimigos: 2 }, extras: ["Adversário", "Refúgio", "Máscara"] },
    cultoDeSangue: { nome: "Culto de Sangue", dominio: { lien: 1, portillon: 2 }, antecedentes: { rebanho: 3 }, defeitos: { suspeito: 1 }, extras: ["Inimigos ••", "Refúgio", "Defeito de Máscara ••", "Lacaios"] },
    gangueDasPresas: { nome: "Gangue das Presas", dominio: { chasse: 1, lien: 1, portillon: 1 }, antecedentes: { contatos: 1 }, defeitos: { inimigos: 2 }, extras: ["Refúgio", "Rebanho", "Influência", "Lacaios", "Status"] },
    grupoDeCaca: { nome: "Grupo de Caça", dominio: { chasse: 3 }, antecedentes: {}, escolha: { pontos: 1, entre: ["aliados", "mawla"] }, extras: ["Rebanho", "Influência"] },
    guardaDiurna: { nome: "Guarda Diurna", dominio: { chasse: 1, portillon: 2 }, antecedentes: { influencia: 2 }, defeitos: { inimigos: 3 }, extras: ["Aliados", "Contatos", "Refúgio", "Mawla"] },
    marechal: { nome: "Marechal", dominio: { chasse: 2, portillon: 2 }, antecedentes: { status: 3 }, extras: ["Adversários", "Influência", "Mawla", "Lacaios"] },
    nomades: { nome: "Nômades", dominio: {}, antecedentes: { contatos: 3, lacaios: 2 }, defeitos: { suspeito: 1 }, extras: ["Rebanho"] },
    plumaire: { nome: "Plumaire", dominio: { chasse: 2, lien: 2 }, antecedentes: { contatos: 3 }, extras: ["Adversário ou Inimigo", "Status"] },
    questari: { nome: "Questari", dominio: { chasse: 1, lien: 3 }, antecedentes: { contatos: 2 }, extras: ["Refúgio com Biblioteca", "Mawla", "Recursos"] },
    regencia: { nome: "Regência", dominio: { chasse: 2, portillon: 3 }, antecedentes: { mawla: 2, status: 4 }, livre: { pontos: 10, entre: ["refugio", "rebanho", "influencia", "recursos", "lacaios"], defeitosIguais: true }, extras: [] },
    sbirri: { nome: "Sbirri", dominio: {}, antecedentes: { mawla: 2, mascara: 1 }, extras: ["Adversários na Primigênie"] },
    vehme: { nome: "Vehme", dominio: { chasse: 1 }, antecedentes: { influencia: 3, status: 3 }, extras: ["Adversários", "Mawla"] },
    vigilantes: { nome: "Vigilantes", dominio: { chasse: 1, lien: 2, portillon: 1 }, antecedentes: { status: 2 }, extras: ["Contatos", "Lacaios"] },
  };

  /* ---------------------------------------------------------------
     CONFLITO (p. 124–127, 295–305)
     --------------------------------------------------------------- */

  var ARMAS = {
    improvisada: { nome: "Arma improvisada", dano: 0, tipo: "impacto" },
    estaca: { nome: "Estaca", dano: 0, tipo: "perfuracao", estaca: true },
    impactoLeve: { nome: "Impacto leve (soco inglês)", dano: 1, tipo: "impacto" },
    impactoPesado: { nome: "Impacto pesado (cassetete, taco, chave de roda)", dano: 2, tipo: "impacto" },
    perfuracaoLeve: { nome: "Perfuração leve (virote de besta, canivete)", dano: 2, tipo: "perfuracao" },
    disparoLeve: { nome: "Disparo leve (pistola .22)", dano: 2, tipo: "disparo", distancia: true },
    brancaPesada: { nome: "Arma branca pesada (espada larga, machado de bombeiro)", dano: 3, tipo: "corte" },
    disparoMedio: { nome: "Disparo médio (rifle .308, pistola 9 mm, escopeta no alcance)", dano: 3, tipo: "disparo", distancia: true },
    disparoPesado: { nome: "Disparo pesado (escopeta 12 à curta, Magnum .357)", dano: 4, tipo: "disparo", distancia: true },
    brancaEnorme: { nome: "Arma branca enorme (claymore, viga de aço)", dano: 4, tipo: "corte" },
    soproDeDragao: { nome: "Munição sopro de dragão", dano: 0, tipo: "fogo", distancia: true, agravadoEmVampiros: true, incendeia: 1 },
    raufoss: { nome: "Raufoss", dano: 5, tipo: "disparo", distancia: true, ignoraArmadura: true, agravadoEmVampiros: true },
    hafla: { nome: "Hafla", dano: 3, tipo: "fogo", distancia: true, agravadoEmVampiros: true, incendeia: 3, dificuldadeMinima: 3 },
    lancaChamas: { nome: "Lança-chamas", dano: 0, tipo: "fogo", distancia: true, agravadoEmVampiros: true, incendeia: 1 },
    molotov: { nome: "Coquetel Molotov", dano: 0, tipo: "fogo", distancia: true, agravadoEmVampiros: true, incendeia: 2, dificuldadeMinima: 4 },
    lancadorDeEstacas: { nome: "Lançador de estacas", dano: 0, tipo: "perfuracao", distancia: true, estaca: true },
  };
  var ARMADURAS = {
    reforcada: { nome: "Roupa reforçada / couro pesado", valor: 2, contraBalas: 0 },
    balistico: { nome: "Tecido balístico", valor: 2 },
    kevlar: { nome: "Colete Kevlar / jaqueta flak", valor: 4 },
    swat: { nome: "Armadura tática da SWAT / militar", valor: 6, penalidade: { destreza: 1 } },
  };
  var COBERTURA = [
    { chave: "nenhuma", nome: "Nenhuma cobertura", dados: -2 },
    { chave: "ocultacao", nome: "Apenas ocultação (arbustos, árvore pequena)", dados: -1 },
    { chave: "rigida", nome: "Cobertura rígida (bloco de motor, esquina de concreto)", dados: 0 },
    { chave: "entrincheirado", nome: "Entrincheiramento (sacos de areia, casamata)", dados: 1 },
    { chave: "ameia", nome: "Ameia (fenda de disparo de um veículo militar)", dados: 2 },
  ];
  var AUDIENCIA_SOCIAL = [
    { chave: "oponentes", nome: "Apenas oponentes", dano: 0 },
    { chave: "coterie", nome: "Sua coterie", dano: 1 },
    { chave: "valoriza", nome: "Membros cujas opiniões você valoriza", dano: 2 },
    { chave: "primogenito", nome: "Primogênito, Harpia ou outras figuras importantes; rival verdadeiro", dano: 3 },
    { chave: "principe", nome: "O Príncipe, Barão ou outra figura poderosa", dano: 4 },
  ];
  /* Ferimentos incapacitantes (p. 303): d10 + Agravado atual. */
  var FERIMENTOS = [
    { ate: 6, chave: "atordoado", nome: "Atordoado", texto: "Gaste 1 FdV ou perca um turno." },
    { ate: 8, chave: "traumaNaCabeca", nome: "Trauma grave na cabeça", texto: "Físicas −1; Mentais −2.", penalidades: { fisico: 1, mental: 2 } },
    { ate: 10, chave: "membroQuebrado", nome: "Membro quebrado ou cegado", texto: "−3 com o membro afetado (ou na visão)." },
    { ate: 11, chave: "ferimentoMacico", nome: "Ferimento maciço", texto: "Todas as rolagens −2; +1 a todo dano sofrido.", penalidades: { todas: 2 }, danoExtra: 1 },
    { ate: 12, chave: "aleijado", nome: "Aleijado", texto: "Como membro quebrado, mas o membro está perdido." },
    { ate: 99, chave: "morte", nome: "Morte (mortais) ou Torpor imediato (vampiro)", texto: "" },
  ];
  /* Conflito de rolagem única (p. 298): Dificuldade pela oposição. */
  var ROLAGEM_UNICA = [
    { chave: "fraca", nome: "Oposição fraca", dificuldade: 2 },
    { chave: "igual", nome: "Oposição equivalente", dificuldade: 4 },
    { chave: "forte", nome: "Oposição forte", dificuldade: 6 },
  ];

  /* ---------------------------------------------------------------
     AÇÕES PADRÃO (Apêndice I, p. 407–418) — paradas sugeridas
     --------------------------------------------------------------- */

  var ACOES_PADRAO = [
    { chave: "criacaoArtistica", nome: "Criação artística", parada: [["inteligencia", "oficios"], ["inteligencia", "performance"]], pagina: 407 },
    { chave: "explosivos", nome: "Explosivos", parada: [["inteligencia", "ciencia"], ["inteligencia", "tecnologia"]], pagina: 407 },
    { chave: "ocultamento", nome: "Ocultamento", parada: [["inteligencia", "sobrevivencia"], ["inteligencia", "manha"]], pagina: 407 },
    { chave: "percepcao", nome: "Percepção", parada: [["raciocinio", "percepcao"], ["inteligencia", "percepcao"], ["determinacao", "percepcao"]], pagina: 407 },
    { chave: "pesquisa", nome: "Pesquisa", parada: [["inteligencia", "erudicao"]], pagina: 408 },
    { chave: "preparacao", nome: "Preparação", parada: [["inteligencia", "armasDeFogo"], ["inteligencia", "oficios"]], pagina: 408 },
    { chave: "rastreamento", nome: "Rastreamento", parada: [["raciocinio", "sobrevivencia"]], pagina: 408 },
    { chave: "hackear", nome: "Usar computadores", parada: [["inteligencia", "tecnologia"]], pagina: 408 },
    { chave: "forca", nome: "Ações de força", parada: [["forca", "atletismo"]], pagina: 409 },
    { chave: "conducao", nome: "Condução", parada: [["destreza", "conducao"], ["raciocinio", "conducao"]], pagina: 409 },
    { chave: "escalada", nome: "Escalada", parada: [["destreza", "atletismo"]], pagina: 410 },
    { chave: "esgueirar", nome: "Esgueirar-se", parada: [["destreza", "furtividade"]], oposicao: [["raciocinio", "percepcao"]], pagina: 410 },
    { chave: "espreitamento", nome: "Espreitamento", parada: [["raciocinio", "furtividade"]], oposicao: [["raciocinio", "percepcao"]], pagina: 410 },
    { chave: "invasao", nome: "Invasão", parada: [["destreza", "ladroagem"], ["inteligencia", "ladroagem"], ["forca", "ladroagem"]], pagina: 410 },
    { chave: "natacao", nome: "Natação", parada: [["vigor", "atletismo"]], pagina: 411 },
    { chave: "perseguicao", nome: "Perseguição", parada: [["destreza", "atletismo"], ["vigor", "atletismo"], ["raciocinio", "conducao"]], pagina: 411 },
    { chave: "prestidigitacao", nome: "Prestidigitação", parada: [["destreza", "ladroagem"]], oposicao: [["raciocinio", "percepcao"]], pagina: 411 },
    { chave: "credibilidade", nome: "Credibilidade", parada: [["manipulacao", "subterfugio"]], oposicao: [["raciocinio", "sagacidade"]], pagina: 412 },
    { chave: "farrear", nome: "Farrear", parada: [["carisma", "sagacidade"]], pagina: 412 },
    { chave: "interrogacao", nome: "Interrogação", parada: [["manipulacao", "sagacidade"], ["manipulacao", "intimidacao"]], oposicao: [["autocontrole", "determinacao"]], pagina: 412 },
    { chave: "intimidacaoCoercao", nome: "Intimidação (coerção sutil)", parada: [["manipulacao", "intimidacao"]], oposicao: [["autocontrole", "determinacao"]], pagina: 413 },
    { chave: "intimidacaoAmeaca", nome: "Intimidação (ameaça aberta)", parada: [["forca", "intimidacao"]], oposicao: [["autocontrole", "determinacao"], ["forca", "intimidacao"]], pagina: 413 },
    { chave: "labia", nome: "Lábia", parada: [["carisma", "subterfugio"]], oposicao: [["autocontrole", "sagacidade"]], pagina: 414 },
    { chave: "oratoria", nome: "Oratória", parada: [["carisma", "performance"]], pagina: 414 },
    { chave: "performance", nome: "Performance artística", parada: [["carisma", "performance"]], pagina: 414 },
    { chave: "seducao", nome: "Sedução", parada: [["carisma", "subterfugio"], ["carisma", "sagacidade"], ["autocontrole", "etiqueta"]], pagina: 414 },
  ];

  var ATITUDES_SOCIAIS = [
    { chave: "leal", nome: "Leal / Devotado", dificuldade: -1 }, { chave: "amistoso", nome: "Amistoso / Fraco", dificuldade: 0 },
    { chave: "indiferente", nome: "Indiferente", dificuldade: 1 }, { chave: "desconfiado", nome: "Desconfiado", dificuldade: 2 },
    { chave: "agressivo", nome: "Agressivo / Pouco amigável", dificuldade: 3 }, { chave: "hostil", nome: "Hostil / Violento", dificuldade: 5 },
  ];

  /* Fichas de Conhecimento (p. 382–406). Cada nível se compra à parte
     (Antecedente, 3 XP por ponto); `cla`: exclusiva desse clã; `uso`:
     "historia" | "sessao" | "cronica" — o limite de uso que a ficha
     marca. Nomes conferidos no original. */
  var FICHAS_DE_CONHECIMENTO = {
    bahari: { nome: "Os Bahari", pagina: 382, cla: "", niveis: [{ nivel: 1, nome: "Reputação Perigosa", uso: "historia", texto: "+2 dados em Intimidação contra adoradores de Caim que conheçam sua filiação." }, { nivel: 2, nome: "Escarificação Ritual", uso: "sessao", texto: "Causar em si 1 Agravado para recuperar 1 nível de dano à Força de Vontade." }, { nivel: 3, nome: "Sacrifício dos Filhos", uso: "", texto: "Ao diablerizar a própria cria, +3 dados em Humanidade + Potência para absorver Disciplinas." }, { nivel: 4, nome: "O Sangue do Útero", uso: "historia", texto: "Após beber sangue do útero, +2 pontos em Vigor ou Determinação até o amanhecer." }, { nivel: 5, nome: "Amaldiçoada Original", uso: "", texto: "A Perdição de Clã diminui; caminha na primeira e na última hora de sol; irradia perigo (Predador Manifesto)." }] },
    theoBell: { nome: "Theo Bell", pagina: 383, cla: "", niveis: [{ nivel: 1, nome: "Célula Rebelde", uso: "", texto: "Um bando de mortais rebeldes (Aliado de três pontos)." }, { nivel: 2, nome: "Anarch Verdadeiro", uso: "", texto: "Dois sucessos automáticos em investigar vampiros que desertaram para o Movimento Anarch." }, { nivel: 3, nome: "Informação de Contato", uso: "", texto: "Contatar Theo Bell; o Narrador determina os efeitos." }, { nivel: 4, nome: "Círculo de Bell", uso: "", texto: "Theo Bell equivale a um Mawla de cinco pontos, com os problemas dele." }, { nivel: 5, nome: "Neutralidade de Seita", uso: "", texto: "Cinco pontos entre Contatos, Refúgio, Mawla e Lacaios." }] },
    heresiaCainita: { nome: "Heresia Cainita", pagina: 384, cla: "", niveis: [{ nivel: 1, nome: "Que Ele tenha Compreensão", uso: "historia", texto: "Uma pista grátis sobre as ações ou planos da Heresia." }, { nivel: 2, nome: "Mão da Heresia", uso: "", texto: "Três pontos entre Aliados, Rebanho, Mawla ou Lacaios; Defeito Segredo Sombrio (Heresia) em alguns domínios." }, { nivel: 3, nome: "Contra-Inquisição", uso: "", texto: "Detecta Fé Verdadeira: Determinação + seu maior valor em Heresia Cainita." }, { nivel: 4, nome: "Celebrante Vermelho", uso: "historia", texto: "Ritual de Pentecostes Vermelho (Checagem de Sangue; pode despertar frenesi em Membros participantes)." }, { nivel: 5, nome: "O Nomeado na Profecia", uso: "historia", texto: "Vencer um conflito Social com uma explicação plausível." }] },
    carna: { nome: "Carna", pagina: 385, cla: "", niveis: [{ nivel: 1, nome: "Abraçar a Visão", uso: "", texto: "+1 dado em todos os testes de Força de Vontade na presença da subfacção." }, { nivel: 2, nome: "O Rastro Rebelde", uso: "", texto: "Teste de Força de Vontade (Dif = Potência do Vitae) para ignorar um Laço de Sangue." }, { nivel: 3, nome: "Rituais Heterodoxos", uso: "historia", texto: "Realizar um ritual conhecido sem gastar Sangue (crítico bestial: transtorno até o fim da história)." }, { nivel: 4, nome: "Laço Reimaginado", uso: "", texto: "Estender os efeitos do ritual de Carna a terceiros (Laço por intercurso)." }, { nivel: 5, nome: "Livro da Guerra dos Túmulos", uso: "", texto: "Sucesso automático em Ocultismo sobre a Gehenna; imune ao Laço enquanto o possuir." }] },
    sistemaCirculatorio: { nome: "O Sistema Circulatório", pagina: 386, cla: "", niveis: [{ nivel: 1, nome: "Acessar o Sistema", uso: "historia", texto: "Solicitar bolsas específicas do Sistema." }, { nivel: 2, nome: "Livrinho Preto", uso: "", texto: "+1 dado em Investigação, Alquimia, Medicina ou Ciência sobre safras; metade do tempo de pesquisa de fórmulas de 2 ou 3." }, { nivel: 3, nome: "Fazenda Remota", uso: "", texto: "Uma fazenda de bolsas (equivale a Rebanho de quatro pontos, uma bolsa por semana)." }, { nivel: 4, nome: "Trânsito Seguro", uso: "", texto: "Acesso a um furgão blindado de trânsito protegido." }, { nivel: 5, nome: "Sommelier de Sangue", uso: "historia", texto: "+2 dados para descobrir uma Ressonância; 3 pontos entre Contatos, Aliados ou Refúgio." }] },
    convencaoDeThorns: { nome: "Convenção de Thorns", pagina: 387, cla: "", niveis: [{ nivel: 1, nome: "Historiador de Thorns", uso: "historia", texto: "Pedir ao Narrador uma informação sobre a convenção." }, { nivel: 2, nome: "Mestre da Tradição", uso: "cronica", texto: "Aplicar leis marginais da convenção." }, { nivel: 3, nome: "Segredos da Convenção", uso: "historia", texto: "+1 dado em testes Sociais com quem esteve na convenção; perguntar o nome de quem precisa dos seus conhecimentos." }, { nivel: 4, nome: "Candidato a Justicar", uso: "", texto: "Apoio para ser o próximo Justicar do seu clã." }, { nivel: 5, nome: "Novas Tradições", uso: "", texto: "Propor uma nova Tradição ao Círculo Interno; sua voz é ouvida." }] },
    primeiraInquisicao: { nome: "A Primeira Inquisição", pagina: 388, cla: "", niveis: [{ nivel: 1, nome: "Erros do Passado", uso: "historia", texto: "Uma informação sobre a Inquisição original." }, { nivel: 2, nome: "Os Nomes dos Culpados", uso: "historia", texto: "O nome de um descendente dos traidores." }, { nivel: 3, nome: "A Seita de Santiago", uso: "historia", texto: "Um Contato de quatro pontos entre os 'velhos inquisidores'." }, { nivel: 4, nome: "O Segundo Ato", uso: "", texto: "Um Contato dentro da Segunda Inquisição." }, { nivel: 5, nome: "Ponto Obscuro", uso: "historia", texto: "Um local que a Segunda Inquisição teme: escondido ali, os caçadores cancelam a busca." }] },
    golconda: { nome: "Golconda", pagina: 389, cla: "", niveis: [{ nivel: 1, nome: "Sementes da Golconda", uso: "historia", texto: "Perguntar se uma ação compromete a Golconda." }, { nivel: 2, nome: "O único Caminho Verdadeiro", uso: "historia", texto: "+3 dados em testes Sociais sobre a natureza da Golconda." }, { nivel: 3, nome: "Discípulo de Saulot", uso: "", texto: "Sucumbir voluntariamente ao frenesi dá sucesso automático no próximo teste de frenesi." }, { nivel: 4, nome: "Satisfazer a Fome", uso: "sessao", texto: "Diminuir a Fome em 1 sem se alimentar (não abaixo de 1)." }, { nivel: 5, nome: "Saudar o Sol", uso: "historia", texto: "Enfrentar a luz do sol direta sem dano; na noite seguinte desperta em frenesi de Fome." }] },
    hardestadt: { nome: "Descendente de Hardestadt", pagina: 390, cla: "ventrue", niveis: [{ nivel: 1, nome: "A Voz de Hardestadt", uso: "", texto: "Ser ouvido acima de qualquer barulho." }, { nivel: 2, nome: "Líder Supremo", uso: "historia", texto: "Ordenar a partir da retaguarda sem penalidade." }, { nivel: 3, nome: "Esteio Ventrue", uso: "", texto: "Sempre três pontos de Status com os Ventrue." }, { nivel: 4, nome: "Linha Direta com os Fundadores", uso: "cronica", texto: "Ligar ou marcar reunião com um fundador da Camarilla." }, { nivel: 5, nome: "Herdeiro de Hardestadt", uso: "", texto: "Um documento que o nomeia sucessor." }] },
    helena: { nome: "Descendente de Helena", pagina: 391, cla: "toreador", niveis: [{ nivel: 1, nome: "À Flor da Pele", uso: "historia", texto: "+1 Status ao mencionar Helena." }, { nivel: 2, nome: "Talento Inato", uso: "", texto: "Uma Habilidade entre Ofícios, Etiqueta ou Performance custa metade da XP (arred. para baixo)." }, { nivel: 3, nome: "Abrace o Estereótipo", uso: "historia", texto: "Uma festa lendária: +2 em Status e/ou Influência com os convidados." }, { nivel: 4, nome: "Pureza Divina", uso: "", texto: "+2 dados para evitar a culpa por suas ações." }, { nivel: 5, nome: "Franquia do Succubus Club", uso: "", texto: "Chasse do Domínio +2 enquanto o clube estiver aberto; 4 pontos entre Recursos, Fama e Status." }] },
    veteranoGuerraDasSeitas: { nome: "Veterano da Guerra das Seitas", pagina: 392, cla: "", niveis: [{ nivel: 1, nome: "Sobrevivente", uso: "historia", texto: "Uma informação sobre a guerra no domínio." }, { nivel: 2, nome: "Participante Ativo", uso: "", texto: "Três pontos em Status ou Mawla." }, { nivel: 3, nome: "Troféu", uso: "historia", texto: "Usar a lenda para evitar uma disputa." }, { nivel: 4, nome: "Terra de nenhum Vampiro", uso: "", texto: "+2 no Portillon do Domínio; +2 dados em Manha, Ladroagem e Furtividade em dois domínios vizinhos." }, { nivel: 5, nome: "Agitador de Seita", uso: "", texto: "+2 dados em testes Sociais para inflamar a tensão entre as seitas." }] },
    trindade: { nome: "A Trindade", pagina: 393, cla: "", niveis: [{ nivel: 1, nome: "Constantinopla", uso: "historia", texto: "Uma pergunta sobre o passado de Constantinopla." }, { nivel: 2, nome: "A Arquitetura de Antonius", uso: "historia", texto: "+2 dados em Política ao governar; mediar e acalmar um debate." }, { nivel: 3, nome: "O Sonho", uso: "historia", texto: "+1 dado em Sagacidade para sondar a Besta; gastar 1 FdV para outro vampiro rerrolar até 3 dados contra frenesi." }, { nivel: 4, nome: "O Dracon", uso: "", texto: "Um discípulo do Dracon: Mawla de cinco pontos." }, { nivel: 5, nome: "A Nova Trindade", uso: "historia", texto: "Remover até cinco Máculas antes do Remorso." }] },
    voerman: { nome: "Jeanette/Therese Voerman", pagina: 394, cla: "", niveis: [{ nivel: 1, nome: "Membro do Asylum", uso: "sessao", texto: "Caçar no Asylum uma ou duas vezes por sessão (Dificuldade 2)." }, { nivel: 2, nome: "Pau Mandado", uso: "", texto: "Recurso confiável das irmãs (missões e favores)." }, { nivel: 3, nome: "O Queridinho da Jeanette", uso: "", texto: "Mawla de quatro pontos (Malkavianos e Anarchs)." }, { nivel: 4, nome: "O Queridinho da Therese", uso: "", texto: "Mawla de três pontos." }, { nivel: 5, nome: "Gerente do Asylum", uso: "", texto: "Quatro pontos entre Refúgio, Rebanho, Recursos ou o Chasse do Domínio." }] },
    semanaDosPesadelos: { nome: "A Semana dos Pesadelos", pagina: 395, cla: "", niveis: [{ nivel: 1, nome: "História Oral", uso: "", texto: "+3 dados em Performance para contar a história." }, { nivel: 2, nome: "Ravnos Remanescentes", uso: "cronica", texto: "Três pontos de Mawla (contatos Ravnos)." }, { nivel: 3, nome: "Eu estive Lá", uso: "historia", texto: "Status entre historiadores e ocultistas; um favor menor." }, { nivel: 4, nome: "A Estrela Vermelha", uso: "historia", texto: "Reduzir a Fome em 2 ou +1 dado numa Disciplina por uma noite após encarar a estrela 10 minutos." }, { nivel: 5, nome: "Sangue de Zapathasura", uso: "", texto: "Um frasco do Sangue do Antediluviano Ravnos." }] },
    rudi: { nome: "Rudi", pagina: 396, cla: "", niveis: [{ nivel: 1, nome: "Novos Direitos", uso: "historia", texto: "Rerrolar uma parada de Habilidade ao combater ou denunciar a classe dominante." }, { nivel: 2, nome: "Eles e Deles", uso: "", texto: "Quando um Pilar de outro membro da coterie é ameaçado, você fica atento e pronto." }, { nivel: 3, nome: "Advogado Gangrel", uso: "", texto: "+1 dado em testes Sociais com os Gangrel do domínio." }, { nivel: 4, nome: "O Bando do Urso", uso: "historia", texto: "Mawla grupal de três pontos; um sucesso automático ao inflamar Anarchs e mortais." }, { nivel: 5, nome: "O Exército de Rudi", uso: "", texto: "Seis pontos entre Aliados, Influência e Contatos." }] },
    tyler: { nome: "Descendente de Tyler", pagina: 397, cla: "brujah", niveis: [{ nivel: 1, nome: "Instigador", uso: "historia", texto: "+2 dados para persuadir uma multidão de mortais a agir com violência." }, { nivel: 2, nome: "Campeão da Causa", uso: "", texto: "+2 dados em Status com quem quer liderança numa rebelião." }, { nivel: 3, nome: "A Piedade de Tyler", uso: "historia", texto: "Ao entrar em frenesi, assumir uma Compulsão Brujah para cessar imediatamente o surto." }, { nivel: 4, nome: "Os Furores", uso: "cronica", texto: "Os Furores o armam e dão santuário; Aliados de cinco pontos de Efetividade." }, { nivel: 5, nome: "Revolução Permanente", uso: "", texto: "Os Anarchs Brujah o obedecem ao pé da letra." }] },
    zelios: { nome: "Descendente de Zelios", pagina: 398, cla: "nosferatu", niveis: [{ nivel: 1, nome: "Santuário", uso: "", texto: "Dois pontos entre as Qualidades de Refúgio Poterna e Sistema de Segurança." }, { nivel: 2, nome: "Sabotador", uso: "", texto: "Encontra a fraqueza de uma construção e a destrói sem explosivos." }, { nivel: 3, nome: "Em Comissão", uso: "", texto: "Um favor menor por construir refúgios." }, { nivel: 4, nome: "O Labirinto", uso: "", texto: "Um labirinto subterrâneo que serve de Refúgio." }, { nivel: 5, nome: "Sentir as Linhas Ley", uso: "", texto: "Onde as linhas convergem, a Checagem de Sangue do despertar rola dois dados (fica o melhor)." }] },
    vasantasena: { nome: "Descendente de Vasantasena", pagina: 399, cla: "malkaviano", niveis: [{ nivel: 1, nome: "Agente do Caos", uso: "sessao", texto: "Rerrolar um único dado sem gastar Força de Vontade em situações turbulentas." }, { nivel: 2, nome: "Ouça minhas Palavras", uso: "historia", texto: "Quem para para escutar pode rerrolar uma parada num teste futuro." }, { nivel: 3, nome: "Odor do Laço", uso: "historia", texto: "Determinação + Percepção (Dif 4) para farejar o Laço." }, { nivel: 4, nome: "Destruir o Laço", uso: "historia", texto: "Remover o Laço de uma vítima bebendo o Vitae dela (e entrando em frenesi)." }, { nivel: 5, nome: "O Sabá se torna a Camarilla", uso: "historia", texto: "Desprogramar as crenças da seita: teste estendido de Inteligência ou Carisma + Sagacidade." }] },
    altoCla: { nome: "Alto-Clã", pagina: 400, cla: "", niveis: [{ nivel: 1, nome: "Pavão", uso: "sessao", texto: "Rerrolar um único dado ao ordenar a um vampiro sem título que o trate com deferência." }, { nivel: 2, nome: "Controle de Massas", uso: "", texto: "Séquito de Baixos-Clãs (Mawla de três pontos); +3 dados em Intimidação ou Liderança contra eles." }, { nivel: 3, nome: "Erguer o Baixo", uso: "cronica", texto: "Proclamar a ascendência de um Baixo-Clã; +1 dado em testes Sociais contra Baixos-Clãs." }, { nivel: 4, nome: "Abraçar para Governar", uso: "", texto: "+1 dado em Liderança com vampiros Alto-Clã que conheçam sua linhagem." }, { nivel: 5, nome: "Abençoado, não Amaldiçoado", uso: "sessao", texto: "Gastar 1 FdV para ignorar os fardos da Perdição de Clã." }] },
    baixoCla: { nome: "Baixo-Clã", pagina: 401, cla: "", niveis: [{ nivel: 1, nome: "Casca-Grossa", uso: "historia", texto: "Ignorar farpas verbais por uma cena sem teste." }, { nivel: 2, nome: "Amaldiçoado com Orgulho", uso: "historia", texto: "Um sucesso automático ao incorporar a Perdição numa ação." }, { nivel: 3, nome: "Parentesco Misterioso", uso: "", texto: "Três pontos entre Mawla ou Status com os Baixos-Clãs." }, { nivel: 4, nome: "Comércio entre Iguais", uso: "", texto: "Uma Disciplina de um Baixo-Clã custa XP como Disciplina do clã." }, { nivel: 5, nome: "Incidente Crítico", uso: "cronica", texto: "+1 dado em Projetos contra Altos-Clãs; sacrificar até 10 pontos de Antecedentes para derrubar Membros Alto-Clã." }] },
    ambrusMaropis: { nome: "Ambrus Maropis", pagina: 402, cla: "", niveis: [{ nivel: 1, nome: "Crente Sincero", uso: "", texto: "+1 dado para encontrar os melhores esconderijos compartilhados." }, { nivel: 2, nome: "Informação Clandestina", uso: "historia", texto: "Uma informação armazenada online sobre a maioria dos mortais." }, { nivel: 3, nome: "Ensinado pelos Melhores", uso: "", texto: "Ambrus como Mawla de três pontos." }, { nivel: 4, nome: "Backdoor Panóptico", uso: "historia", texto: "Dois sucessos automáticos em investigar atividades online ou celulares." }, { nivel: 5, nome: "Totalmente em outra Rede", uso: "", texto: "Identidades falsas (Máscara 2 e Zerado); +3 dados contra quem tenta encontrá-lo online." }] },
    carmelitaNeillson: { nome: "Carmelita Neillson", pagina: 403, cla: "", niveis: [{ nivel: 1, nome: "A Arte da Narrativa", uso: "", texto: "Os Toreador são atraídos pelas suas histórias." }, { nivel: 2, nome: "A Arte da Vontade", uso: "sessao", texto: "Meditar uma hora (Determinação + Erudição, Dif 5) e despertar com 1 FdV extra." }, { nivel: 3, nome: "Biblioteca Neillson", uso: "", texto: "Curador de uma biblioteca (Refúgio 2 com Biblioteca 2)." }, { nivel: 4, nome: "Entrevista com o Matusalém", uso: "historia", texto: "O Narrador conta um segredo da gravação." }, { nivel: 5, nome: "A Tumba do Ancestral", uso: "historia", texto: "Guardar o local de descanso de um ancestral: um favor maior." }] },
    fiorenzaSavona: { nome: "Fiorenza Savona", pagina: 404, cla: "", niveis: [{ nivel: 1, nome: "Na Lista de Fiorenza", uso: "", texto: "Um Lacaio mortal Talentoso." }, { nivel: 2, nome: "Café da Manhã com Fiorenza", uso: "historia", texto: "Um encontro com Fiorenza." }, { nivel: 3, nome: "Benefícios da Amizade", uso: "", texto: "Mawla de três pontos." }, { nivel: 4, nome: "A Diretoria", uso: "", texto: "Seis pontos entre Contatos, Mawla e Recursos (com Laço e memórias apagadas)." }, { nivel: 5, nome: "Influência no Governo", uso: "cronica", texto: "Cinco dados a distribuir em rolagens de ação governamental." }] },
    karlSchrekt: { nome: "Descendente de Karl Schrekt", pagina: 405, cla: "tremere", niveis: [{ nivel: 1, nome: "Não Esqueça a Casa", uso: "historia", texto: "Uma informação sobre a Casa Tremere." }, { nivel: 2, nome: "Linha Dura", uso: "", texto: "+2 dados para resistir a desviá-lo dos objetivos de Schrekt." }, { nivel: 3, nome: "Rituais Preparados", uso: "historia", texto: "Realizar um ritual conhecido em cinco minutos, sem preparação." }, { nivel: 4, nome: "Perdição dos Arcontes", uso: "", texto: "Um Aliado sobrenatural de quatro pontos." }, { nivel: 5, nome: "Conheça o Mundo", uso: "historia", texto: "Biblioteca de Refúgio de três pontos; uma pergunta simples sobre criaturas." }] },
    xaviar: { nome: "Descendente de Xaviar", pagina: 406, cla: "gangrel", niveis: [{ nivel: 1, nome: "Ancestral Martirizado", uso: "", texto: "Refúgio com outros Gangrel; dois pontos de Status." }, { nivel: 2, nome: "Onde os Corpos são Enterrados", uso: "", texto: "Determinação + Percepção para detectar quem se fundiu com a terra ou jaz em Torpor." }, { nivel: 3, nome: "Sabujo Leal", uso: "", texto: "Quatro pontos entre Domínio, Rebanho e Status." }, { nivel: 4, nome: "Morcego Monstruoso", uso: "historia", texto: "Forma de morcego humano: +1 em Atributos Físicos, plana; mordida +1 Agravado." }, { nivel: 5, nome: "Experiência com o Antediluviano", uso: "historia", texto: "Sentir a localização de um Gangrel e drenar um gole de Vitae (Fome dele até 2)." }] },
  };

  /* Prestação (p. 314–315). */
  var FAVORES = {
    trivial: { nome: "Trivial", texto: "Nenhum risco ou custo significativo." },
    menor: { nome: "Menor", texto: "Algum esforço ou risco; num teste Social contra o devedor, equivale a uma vitória automática." },
    maior: { nome: "Maior", texto: "Altera o andamento dos assuntos de um domínio." },
    vital: { nome: "Vital", texto: "O mais raro: uma vida (ou não vida) devida." },
  };

  /* Fé Verdadeira (p. 222). */
  var FE_VERDADEIRA = "Determinação + Fé contra a Força de Vontade do vampiro; cada sucesso afasta um passo; tocar causa 1 Agravado por sucesso.";

  /* Sangue contaminado (p. 310). */
  var DROGAS = {
    alcool: { nome: "Álcool", penalidades: { destreza: 1, inteligencia: 1 } },
    estimulante: { nome: "Cocaína / Metanfetamina / Speed", frenesi: 1, rerrolarBestial: true },
    alucinogeno: { nome: "Alucinógenos", penalidades: { raciocinio: 2, determinacao: 2, manipulacao: 2 } },
    opiaceo: { nome: "Heroína / Morfina / Opiáceos", penalidades: { fisico: 2 }, frenesi: -1 },
    marijuana: { nome: "Marijuana", penalidades: { raciocinio: 1 }, frenesi: -1 },
    veneno: { nome: "Veneno", penalidades: { todas: 1 }, danoSuperficial: [1, 3] },
  };

  global.RAMAVampiroCatalogo = {
    paginaDoPdf: paginaDoPdf,
    ATRIBUTOS: ATRIBUTOS, CATEGORIAS: CATEGORIAS, HABILIDADES: HABILIDADES,
    DISTRIBUICAO_DE_ATRIBUTOS: DISTRIBUICAO_DE_ATRIBUTOS, DISTRIBUICOES_DE_HABILIDADES: DISTRIBUICOES_DE_HABILIDADES,
    DIFICULDADES: DIFICULDADES, CUSTOS_XP: CUSTOS_XP, IDADES: IDADES, GERACOES: GERACOES, POTENCIA: POTENCIA,
    HUMANIDADE: HUMANIDADE, MACULAS_DE_PILAR: MACULAS_DE_PILAR, CLAS: CLAS,
    COMPULSOES: COMPULSOES, compulsaoDaTabela: compulsaoDaTabela, FRENESI: FRENESI,
    FONTES_DE_SANGUE: FONTES_DE_SANGUE, TERRITORIOS_DE_CACA: TERRITORIOS_DE_CACA, MODIFICADORES_DE_CACA: MODIFICADORES_DE_CACA,
    RESSONANCIAS: RESSONANCIAS, TEMPERAMENTOS: TEMPERAMENTOS, ressonanciaDaTabela: ressonanciaDaTabela, DISCRASIAS: DISCRASIAS,
    PREDADORES: PREDADORES, VANTAGENS: VANTAGENS, GRUPOS_DE_DEFEITO: GRUPOS_DE_DEFEITO, SANGUE_RALO: SANGUE_RALO, MODELOS_MORTAIS: MODELOS_MORTAIS,
    DOMINIO: DOMINIO, dificuldadeDeCacaDoChasse: dificuldadeDeCacaDoChasse, COTERIES: COTERIES,
    ARMAS: ARMAS, ARMADURAS: ARMADURAS, COBERTURA: COBERTURA, AUDIENCIA_SOCIAL: AUDIENCIA_SOCIAL, FERIMENTOS: FERIMENTOS, ROLAGEM_UNICA: ROLAGEM_UNICA,
    FICHAS_DE_CONHECIMENTO: FICHAS_DE_CONHECIMENTO,
    ACOES_PADRAO: ACOES_PADRAO, ATITUDES_SOCIAIS: ATITUDES_SOCIAIS, FAVORES: FAVORES, FE_VERDADEIRA: FE_VERDADEIRA, DROGAS: DROGAS,
    atributo: function (k) { return ATRIBUTOS.filter(function (a) { return a.chave === k; })[0] || null; },
    habilidade: function (k) { return HABILIDADES.filter(function (h) { return h.chave === k; })[0] || null; },
    potencia: function (v) { return POTENCIA[Math.max(0, Math.min(10, Math.floor(Number(v) || 0)))]; },
  };
})(typeof window !== "undefined" ? window : globalThis);
/* <<< js/vampiro/catalogo.js */

/* >>> js/vampiro/disciplinas-dados.js */
/* =====================================================================
   R.A.M.A. — Vampiro: A Máscara (V5) · Disciplinas, Rituais e Alquimia
   =====================================================================
   Livro Básico, p. 244–287 (página impressa; PDF = +2). Cada poder é um
   registro estruturado que o motor (js/vampiro/poderes.js) sabe aplicar:

     custo        { checagens: n }  Checagens de Sangue ao ativar;
                  { gratis: true }; { fdv: n }; { maculas: true };
                  { doPoder: true }  o custo do poder amplificado.
     parada       [[atributo, "disciplina"|habilidade], …] alternativas
     resistencia  [[…]] a parada do alvo (disputa)
     dificuldade  número fixo, quando há
     duracao      "passiva" | "turno" | "cena" | "noite" | "indefinida"
                  | "alimentacao" | "uso"
     amalgama     { disciplina, nivel } — exige a outra Disciplina
     prereq       chave de outro poder exigido
     efeitos      o que o motor aplica enquanto o poder está ativo
                  (mods de parada, Vitalidade, dano, redução de dano…)
     narrativo    true quando o efeito é decisão da mesa (o motor
                  resolve custo, teste e duração; o resto é registro)

   Nada de poderes de suplementos. Interpretações: docs/VAMPIRO.md.
   ===================================================================== */

(function (global) {
  "use strict";

  var DISCIPLINAS = {
    animalismo: { nome: "Animalismo", tipo: "mental", mascara: "baixa a média", ressonancia: "animal", pagina: 244 },
    auspicios: { nome: "Auspícios", tipo: "mental", mascara: "baixa", ressonancia: "fleumatica", pagina: 248 },
    celeridade: { nome: "Celeridade", tipo: "fisica", mascara: "média a alta", ressonancia: "colerica", pagina: 252 },
    dominacao: { nome: "Dominação", tipo: "mental", mascara: "baixa", ressonancia: "fleumatica", pagina: 254 },
    fortitude: { nome: "Fortitude", tipo: "fisica", mascara: "média", ressonancia: "melancolica", pagina: 257 },
    ofuscacao: { nome: "Ofuscação", tipo: "mental", mascara: "baixa", ressonancia: "melancolica", pagina: 260 },
    potencia: { nome: "Potência", tipo: "fisica", mascara: "média a alta", ressonancia: "colerica", pagina: 263 },
    presenca: { nome: "Presença", tipo: "mental", mascara: "baixa a média", ressonancia: "sanguinea", pagina: 265 },
    proteanismo: { nome: "Proteanismo", tipo: "fisica", mascara: "alta", ressonancia: "animal", pagina: 269 },
    feiticaria: { nome: "Feitiçaria de Sangue", tipo: "mental", mascara: "baixa a alta", ressonancia: "sanguinea", pagina: 271, rituais: true },
    alquimia: { nome: "Alquimia Sangue-Ralo", tipo: "especial", mascara: "varia", ressonancia: "", pagina: 282, soSangueRalo: true, formulas: true },
  };

  /* Atalho para montar poderes sem repetir as chaves. */
  function p(disciplina, nivel, chave, nome, pagina, o) {
    return Object.assign({ disciplina: disciplina, nivel: nivel, chave: chave, nome: nome, pagina: pagina, custo: { gratis: true }, duracao: "passiva" }, o || {});
  }
  var CH = function (n) { return { checagens: n || 1 }; };

  var PODERES = [
    /* ---------------- ANIMALISMO (p. 244–248) ---------------- */
    p("animalismo", 1, "famulusEnlacado", "Famulus Enlaçado", 245, { custo: { checagensExtras: 3, texto: "Alimentar o animal 3 noites com Sangue, uma Checagem cada" }, parada: [["carisma", "empatiaComAnimais"]], duracao: "indefinida", efeito: "Enlaça um animal como famulus (um por vez); ordens simples sem Sussurros: Carisma + Empatia com Animais, Dif 2+.", narrativo: true }),
    p("animalismo", 1, "sentirABesta", "Sentir a Besta", 245, { parada: [["determinacao", "disciplina"]], resistencia: [["autocontrole", "subterfugio"]], efeito: "Sente a Besta e a hostilidade de um alvo, e se é sobrenatural.", critico: "Tipo exato de criatura, Fome e Ressonância." }),
    p("animalismo", 2, "sussurrosSelvagens", "Sussurros Selvagens", 245, { custo: { checagens: 1, texto: "1 Checagem por tipo de animal na cena (grátis com o famulus)" }, parada: [["manipulacao", "disciplina"], ["carisma", "disciplina"]], duracao: "cena", efeito: "Conversa com animais; ordens Dif 3–6; convocar: Carisma + Animalismo pela escassez.", narrativo: true }),
    p("animalismo", 3, "enxameNaoVivo", "Enxame Não Vivo", 246, { amalgama: { disciplina: "ofuscacao", nivel: 2 }, efeito: "Estende os poderes de Animalismo a enxames: Vitalidade 5, parada 8 para resistir; −2 dados por distração; +1 a +3 Intimidação." }),
    p("animalismo", 3, "subjugarABesta", "Subjugar a Besta", 246, { custo: CH(1), parada: [["carisma", "disciplina"]], resistencia: [["vigor", "determinacao"]], duracao: "cena", efeito: "Mortal: letárgico na cena. Vampiro: não pode Surto de Sangue e é imune a críticos bestiais por turnos = margem.", critico: "Contra vampiro, encerra o frenesi." }),
    p("animalismo", 3, "suculenciaAnimal", "Suculência Animal", 247, { efeitos: { saciaAnimalExtra: 1, potenciaContraAnimal: -2, famulusSacia: 4 }, efeito: "Animais saciam +1 de Fome; a Potência conta 2 a menos para a penalidade de animal; consumir o famulus sacia 4 (nunca o último dado de Fome)." }),
    p("animalismo", 4, "comunhaoDeEspiritos", "Comunhão de Espíritos", 247, { custo: { checagens: 1, texto: "1 Checagem (grátis no famulus)" }, parada: [["manipulacao", "disciplina"]], dificuldade: 4, duracao: "cena", efeito: "Habita um animal; o corpo fica como em Torpor; morte do animal: 1 Agravado à FdV.", critico: "Indefinidamente.", narrativo: true }),
    p("animalismo", 5, "controleAnimal", "Controle Animal", 247, { custo: CH(2), parada: [["carisma", "disciplina"]], duracao: "cena", efeito: "Comanda um grupo de animais (Dif 3 a 5 pela natureza da ordem).", narrativo: true }),
    p("animalismo", 5, "expulsarABesta", "Expulsar a Besta", 247, { custo: CH(1), parada: [["raciocinio", "disciplina"]], resistencia: [["autocontrole", "determinacao"]], duracao: "uso", efeitos: { substituiFrenesi: ["furia", "terror"] }, efeito: "Substitui o teste de FdV contra frenesi de terror ou fúria: vitória transfere o frenesi ao alvo; falha, entra em frenesi. Não transfere frenesi de fome." }),

    /* ---------------- AUSPÍCIOS (p. 248–252) ---------------- */
    p("auspicios", 1, "sentidosAgucados", "Sentidos Aguçados", 249, { duracao: "ate desativar", alternavel: true, efeitos: { mods: [{ contexto: "percepcao", valor: "nivel" }] }, efeito: "Soma Auspícios às rolagens de percepção; estímulos extremos: Raciocínio + Determinação, Dif 3+, ou −3 dados na cena." }),
    p("auspicios", 1, "sentirOInvisivel", "Sentir o Invisível", 249, { parada: [["raciocinio", "disciplina"], ["determinacao", "disciplina"]], efeito: "Percebe o sobrenatural oculto; contra Ofuscação: Raciocínio + Auspícios vs. Raciocínio + Ofuscação." }),
    p("auspicios", 2, "premonicao", "Premonição", 249, { custo: { checagens: 1, opcional: true, texto: "Grátis (passiva) ou 1 Checagem para provocar" }, parada: [["determinacao", "disciplina"]], efeito: "Vislumbres (passivo, sugestão: 1 por cena); provocada, os sucessos dão o nível da revelação.", narrativo: true }),
    p("auspicios", 3, "compartilharOsSentidos", "Compartilhar os Sentidos", 250, { custo: CH(1), parada: [["determinacao", "disciplina"]], dificuldade: 3, duracao: "cena", efeito: "Vê e ouve pelos sentidos de outro na linha de visão (ou com seu Sangue no corpo).", narrativo: true }),
    p("auspicios", 3, "perscrutarAAlma", "Perscrutar a Alma", 250, { custo: CH(1), parada: [["inteligencia", "disciplina"]], resistencia: [["autocontrole", "subterfugio"]], duracao: "turno", efeitos: { perguntas: "margem" }, efeito: "Perguntas = margem: estado emocional, Ressonância, se é vampiro ou sobrenatural, se está sob magia, Diablerie no último ano.", critico: "Algo inesperado também." }),
    p("auspicios", 4, "toqueDoEspirito", "Toque do Espírito", 250, { custo: CH(1), parada: [["inteligencia", "disciplina"]], dificuldade: 3, duracao: "turno", efeitos: { perguntas: "margem" }, efeito: "Cada margem revela um portador anterior do objeto." }),
    p("auspicios", 5, "clarividencia", "Clarividência", 251, { custo: CH(1), parada: [["inteligencia", "disciplina"]], duracao: "uso", efeitos: { perguntas: "margem" }, efeito: "Observa um local (Dif pela segurança e atividade); perguntas = margem." }),
    p("auspicios", 5, "possessao", "Possessão", 251, { amalgama: { disciplina: "dominacao", nivel: 3 }, custo: CH(2), parada: [["determinacao", "disciplina"]], resistencia: [["determinacao", "inteligencia"]], duracao: "indefinida", efeito: "Possui um mortal (contato visual). Agravado ao hospedeiro: Determinação + Auspícios, Dif 2 + dano; morte do hospedeiro: 3 Agravado à FdV.", falhaTotal: "O alvo fica imune na história.", narrativo: true }),
    p("auspicios", 5, "telepatia", "Telepatia", 252, { custo: { checagens: 1, texto: "1 Checagem (+1 FdV contra vampiro relutante)" }, parada: [["determinacao", "disciplina"]], resistencia: [["raciocinio", "subterfugio"]], duracao: "cena", efeito: "Projeta pensamentos sem rolar; ler: pensamentos superficiais, margem → memórias.", narrativo: true }),

    /* ---------------- CELERIDADE (p. 252–254) ---------------- */
    p("celeridade", 1, "gracaFelina", "Graça Felina", 252, { efeitos: { autoSucesso: "equilibrio" }, efeito: "Passa automaticamente em Destreza/Atletismo para equilíbrio." }),
    p("celeridade", 1, "reflexosRapidos", "Reflexos Rápidos", 252, { efeitos: { semPenalidadeCobertura: true, acaoMenorLivre: 2 }, efeito: "Sem penalidade de defesa por falta de cobertura contra armas de fogo; uma ação menor (até 2 dados) livre por turno." }),
    p("celeridade", 2, "rapidez", "Rapidez", 253, { custo: CH(1), duracao: "cena", efeitos: { mods: [{ atributo: "destreza", foraDeCombate: true, valor: "nivel" }, { contexto: "defesaDestreza", valor: "nivel", vezesPorTurno: 1 }] }, efeito: "+Celeridade às paradas de Destreza fora de combate; uma vez por turno também para defender com Destreza + Atletismo." }),
    p("celeridade", 3, "piscadela", "Piscadela", 253, { custo: CH(1), parada: [["destreza", "atletismo"]], duracao: "turno", efeito: "Move até 50 m em linha reta e ainda age." }),
    p("celeridade", 3, "travessia", "Travessia", 253, { custo: CH(1), parada: [["destreza", "atletismo"]], duracao: "turno", efeito: "Corre por superfícies verticais ou líquidas (Dif 3–6)." }),
    p("celeridade", 4, "eleganciaDiretoDaFonte", "Elegância Direto da Fonte", 254, { custo: CH(1), duracao: "noite", efeitos: { emprestaDisciplina: true }, efeito: "Quem bebe ganha Celeridade = metade da do doador e os poderes até esse nível, por uma noite." }),
    p("celeridade", 4, "miraInfalivel", "Mira Infalível", 254, { amalgama: { disciplina: "auspicios", nivel: 2 }, custo: CH(1), duracao: "uso", efeitos: { semDefesa: "distancia", dificuldadeFixa: 1 }, efeito: "O alvo do ataque à distância não rola defesa (Dif 1). Celeridade 5 anula com uma Checagem." }),
    p("celeridade", 5, "fracaoDeSegundo", "Fração de Segundo", 254, { custo: CH(1), duracao: "uso", efeito: "Substitui a narração por uma ação razoável.", narrativo: true }),
    p("celeridade", 5, "golpeRelampago", "Golpe Relâmpago", 254, { custo: CH(1), duracao: "uso", efeitos: { semDefesa: "corpoACorpo", dificuldadeFixa: 1 }, efeito: "Ataque de Briga ou Armas Brancas sem defesa do oponente (Dif 1). Celeridade 5 anula." }),

    /* ---------------- DOMINAÇÃO (p. 254–257) ---------------- */
    p("dominacao", 1, "compelir", "Compelir", 256, { parada: [["carisma", "disciplina"]], resistencia: [["inteligencia", "determinacao"]], duracao: "turno", efeito: "Um comando curto, cumprido no turno. Mortal despreparado: sem rolagem.", falhaTotal: "Não pode Dominar o alvo na história.", narrativo: true }),
    p("dominacao", 1, "nublarMemoria", "Nublar Memória", 256, { parada: [["carisma", "disciplina"]], resistencia: [["raciocinio", "determinacao"]], duracao: "indefinida", efeito: "O alvo esquece o momento atual e os últimos minutos.", narrativo: true }),
    p("dominacao", 2, "dementacao", "Dementação", 256, { amalgama: { disciplina: "ofuscacao", nivel: 2 }, custo: { checagens: 1, texto: "1 Checagem por cena (+1 por vítima adicional)" }, parada: [["manipulacao", "disciplina"]], resistencia: [["autocontrole", "inteligencia"]], duracao: "cena", efeitos: { danoSocial: "superficialFdV" }, efeito: "Ataca a mente: dano Superficial à FdV; mortal Debilitado tem um ataque de nervos; vampiro Debilitado sofre uma Compulsão escolhida pelo usuário." }),
    p("dominacao", 2, "mesmerismo", "Mesmerismo", 256, { custo: CH(1), parada: [["manipulacao", "disciplina"]], resistencia: [["inteligencia", "determinacao"]], duracao: "cena", efeito: "Comandos complexos até cumpridos ou fim da cena.", narrativo: true }),
    p("dominacao", 3, "diretrizSubmersa", "Diretriz Submersa", 257, { custo: { doPoder: true, texto: "Sem custo adicional (Mesmerismo)" }, prereqDisciplina: "mesmerismo", efeito: "Sugestão pós-hipnótica com gatilho; uma por vítima.", narrativo: true }),
    p("dominacao", 3, "aMenteEsquecida", "A Mente Esquecida", 257, { custo: CH(1), parada: [["manipulacao", "disciplina"]], resistencia: [["inteligencia", "determinacao"]], duracao: "indefinida", efeito: "Margem = memórias acrescentadas ou removidas.", critico: "Impecável.", narrativo: true }),
    p("dominacao", 4, "racionalizar", "Racionalizar", 257, { efeito: "A vítima crê ter agido por vontade própria; questionada: Raciocínio + Percepção, Dif 5." }),
    p("dominacao", 5, "decretoTerminal", "Decreto Terminal", 257, { efeito: "Comandos de dano grave ou morte deixam de falhar automaticamente e passam a ser resistidos.", maculasPossiveis: true }),
    p("dominacao", 5, "manipulacaoEmMassa", "Manipulação em Massa", 257, { custo: { checagens: 1, doPoder: true, texto: "1 Checagem + o custo do poder amplificado" }, duracao: "doPoder", efeito: "Amplifica um poder de Dominação a todo um grupo que veja os olhos; rola contra o oponente mais forte." }),

    /* ---------------- FORTITUDE (p. 257–260) ---------------- */
    p("fortitude", 1, "menteInescrutavel", "Mente Inescrutável", 258, { efeitos: { mods: [{ contexto: "resistirCoercao", valor: "nivel" }] }, efeito: "+Fortitude para resistir a coerção, intimidação, sedução e influência (inclui Dominação e Presença)." }),
    p("fortitude", 1, "resiliencia", "Resiliência", 258, { efeitos: { vitalidade: "nivel" }, efeito: "+Fortitude à trilha de Vitalidade." }),
    p("fortitude", 2, "ferasTenazes", "Feras Tenazes", 258, { amalgama: { disciplina: "animalismo", nivel: 1 }, custo: { checagens: 1, opcional: true, texto: "Grátis no famulus; outros: 1 Checagem + Vigor + Animalismo, Dif 3" }, duracao: "cena", efeito: "Animais ganham Vitalidade = Fortitude." }),
    p("fortitude", 2, "tenacidade", "Tenacidade", 258, { custo: CH(1), duracao: "cena", efeitos: { reduzSuperficial: "nivel" }, efeito: "Subtrai Fortitude de todo dano Superficial ANTES de dividir (mínimo 1)." }),
    p("fortitude", 3, "desafioAPerdicao", "Desafio à Perdição", 259, { custo: CH(1), duracao: "cena", efeitos: { converteAgravado: "nivel" }, efeito: "Converte Agravado = Fortitude em Superficial por cena; ativar por reflexo: Raciocínio + Sobrevivência, Dif 3." }),
    p("fortitude", 3, "fortificarAFachada", "Fortificar a Fachada Interior", 259, { duracao: "cena", efeitos: { dificuldadeContraMente: "metadeCima", mods: [{ contexto: "resistirMente", valor: "nivel" }] }, efeito: "+metade da Fortitude (arred. para cima) à Dificuldade de Perscrutar a Alma, Telepatia e similares; onde há resistência, +Fortitude." }),
    p("fortitude", 4, "resistenciaDiretoDaFonte", "Resistência Direto da Fonte", 259, { custo: CH(1), duracao: "noite", efeitos: { emprestaDisciplina: true }, efeito: "Quem bebe ganha Fortitude = metade da do doador e os poderes até esse nível." }),
    p("fortitude", 5, "peleDeMarmore", "Pele de Mármore", 259, { custo: CH(2), duracao: "cena", efeitos: { ignoraPrimeiraFonte: true }, efeito: "Ignora a primeira fonte de dano físico a cada turno (inclui fogo, não sol); um crítico a supera." }),
    p("fortitude", 5, "poderVindoDaDor", "Poder Vindo da Dor", 260, { custo: CH(1), duracao: "cena", efeitos: { ignoraPenalidadeVitalidade: true, fisicoPorDano: true }, efeito: "Ignora penalidades de dano e Debilitação à Vitalidade; +1 num Atributo Físico por nível de dano (máximo Surto + 6)." }),

    /* ---------------- OFUSCAÇÃO (p. 260–263) ---------------- */
    p("ofuscacao", 1, "mantoDeSombras", "Manto de Sombras", 261, { duracao: "cena", efeito: "Parado, quieto e com cobertura, some de vista até se mover ou ser detectado." }),
    p("ofuscacao", 1, "silencioDaMorte", "Silêncio da Morte", 261, { duracao: "cena", efeito: "Anula os sons do usuário, até para aparelhos." }),
    p("ofuscacao", 2, "passagemInvisivel", "Passagem Invisível", 261, { custo: CH(1), duracao: "cena", efeito: "Move-se oculto; não pode desaparecer enquanto observado." }),
    p("ofuscacao", 3, "fantasmaNaMaquina", "Fantasma na Máquina", 262, { custo: { doPoder: true }, efeitos: { mods: [{ contexto: "vigilanciaEletronica", valor: 3 }] }, efeito: "A Ofuscação vale por meios eletrônicos; +3 Dif para identificar em gravações; +3 dados para contornar vigilância." }),
    p("ofuscacao", 3, "mascaraDeMilFaces", "Máscara de Mil Faces", 262, { custo: CH(1), duracao: "cena", efeito: "Rosto esquecível ou aparência neutra, sem teste." }),
    p("ofuscacao", 4, "desaparecer", "Desaparecer", 262, { prereq: "mantoDeSombras", custo: { doPoder: true }, parada: [["raciocinio", "disciplina"]], resistencia: [["raciocinio", "percepcao"]], limite: "cena", efeito: "Ativa Manto de Sombras ou Passagem Invisível mesmo observado.", critico: "Some também da memória." }),
    p("ofuscacao", 4, "ocultar", "Ocultar", 262, { amalgama: { disciplina: "auspicios", nivel: 3 }, custo: CH(1), parada: [["inteligencia", "disciplina"]], duracao: "noite", efeito: "Oculta um objeto (Dif 2–6) por uma noite + uma por margem." }),
    p("ofuscacao", 5, "disfarceDoImpostor", "Disfarce do Impostor", 263, { prereq: "mascaraDeMilFaces", custo: CH(1), parada: [["raciocinio", "disciplina"], ["manipulacao", "performance"]], duracao: "cena", efeito: "Assume a aparência de alguém estudado por 5 minutos." }),
    p("ofuscacao", 5, "ocultarOGrupo", "Ocultar o Grupo", 263, { custo: { checagens: 1, doPoder: true }, duracao: "doPoder", efeito: "Estende a Ofuscação a alvos voluntários = Raciocínio (+1 por Checagem extra)." }),

    /* ---------------- POTÊNCIA (p. 263–265) ---------------- */
    p("potencia", 1, "corpoLetal", "Corpo Letal", 264, { efeitos: { desarmadoAgravadoMortais: true, ignoraArmadura: "nivel" }, efeito: "Desarmado causa Agravado a mortais (opcional) e ignora 1 nível de armadura por Potência." }),
    p("potencia", 1, "saltoVertiginoso", "Salto Vertiginoso", 264, { efeito: "Salto vertical 3 × Potência metros; horizontal 5 ×." }),
    p("potencia", 2, "poderio", "Poderio", 264, { custo: CH(1), duracao: "cena", efeitos: { danoDesarmado: "nivel", danoArmaBranca: "metadeCima", mods: [{ contexto: "forcaBruta", valor: "nivel" }] }, efeito: "+Potência ao dano desarmado e a feitos de Força; +metade (arred. para cima) ao dano com Armas Brancas." }),
    p("potencia", 3, "alimentacaoBrutal", "Alimentação Brutal", 264, { duracao: "alimentacao", efeitos: { drenarNumTurno: true }, efeito: "Drena um humano num turno; contra vampiro, só Superficial.", maculasPossiveis: true }),
    p("potencia", 3, "centelhaDeFuria", "Centelha de Fúria", 264, { amalgama: { disciplina: "presenca", nivel: 3 }, custo: CH(1), parada: [["manipulacao", "disciplina"]], resistencia: [["autocontrole", "inteligencia"]], duracao: "cena", efeito: "+Potência para irritar e incitar; contra vampiro, vitória causa frenesi de fúria Dif 3." }),
    p("potencia", 3, "pegadaSobrenatural", "Pegada Sobrenatural", 265, { custo: CH(1), duracao: "cena", efeito: "Escala superfícies automaticamente; deixa rastros (Inteligência + Investigação, Dif 2)." }),
    p("potencia", 4, "forcaDiretoDaFonte", "Força Direto da Fonte", 265, { custo: CH(1), duracao: "noite", efeitos: { emprestaDisciplina: true }, efeito: "Quem bebe ganha Potência = metade da do doador e os poderes até esse nível." }),
    p("potencia", 5, "punhoDeCaim", "Punho de Caim", 265, { custo: CH(1), duracao: "cena", efeitos: { desarmadoAgravado: true }, efeito: "Dano Agravado à Vitalidade de mortais e sobrenaturais com Briga." }),
    p("potencia", 5, "terremoto", "Terremoto", 265, { custo: CH(2), duracao: "uso", limite: "cena", efeito: "Onda de choque de 5 m: Destreza + Atletismo, Dif 3, ou cai e perde a ação." }),

    /* ---------------- PRESENÇA (p. 265–268) ---------------- */
    p("presenca", 1, "amedrontar", "Amedrontar", 266, { duracao: "cena", exclui: ["fascinio"], efeitos: { mods: [{ habilidade: "intimidacao", valor: "nivel", grupo: "presenca" }] }, efeito: "+Presença em Intimidação; atacá-lo exige Determinação + Autocontrole, Dif 2." }),
    p("presenca", 1, "fascinio", "Fascínio", 266, { duracao: "cena", exclui: ["amedrontar"], efeitos: { mods: [{ habilidade: "persuasao", valor: "nivel", grupo: "presenca" }, { habilidade: "performance", valor: "nivel", grupo: "presenca" }, { atributo: "carisma", valor: "nivel", grupo: "presenca" }] }, resistencia: [["autocontrole", "inteligencia"]], efeito: "+Presença em Persuasão, Performance e Carisma; resistir: Autocontrole + Inteligência vs. Manipulação + Presença.", critico: "Na resistência, imune pela noite." }),
    p("presenca", 2, "beijoIndelevel", "Beijo Indelével", 267, { duracao: "alimentacao", efeito: "Durante uma alimentação que sacie 1+ Fome, a vítima ganha +metade da Presença num Atributo Social por uma noite; abstinência depois.", narrativo: true }),
    p("presenca", 3, "olharAterrorizante", "Olhar Aterrorizante", 267, { custo: CH(1), parada: [["carisma", "disciplina"]], resistencia: [["autocontrole", "determinacao"]], duracao: "turno", efeito: "Mortais fogem; vampiros não agem um turno a menos que gastem FdV = margem.", critico: "Mortais congelam; vampiros entram em frenesi de terror Dif 3." }),
    p("presenca", 3, "transe", "Transe", 267, { custo: CH(1), parada: [["carisma", "disciplina"]], resistencia: [["autocontrole", "raciocinio"]], duracao: "horas", efeitos: { mods: [{ contexto: "socialContraFascinado", valor: "nivel", grupo: "presenca" }] }, efeito: "O alvo fica fascinado por 1 hora + 1 por margem; +Presença em Sociais contra ele." }),
    p("presenca", 4, "convocar", "Convocar", 268, { custo: CH(1), parada: [["manipulacao", "disciplina"]], resistencia: [["autocontrole", "inteligencia"]], duracao: "noite", efeito: "Chama quem já sofreu Fascínio, Transe, Majestade ou provou seu Sangue.", critico: "Vem o mais rápido possível.", narrativo: true }),
    p("presenca", 4, "vozIrresistivel", "Voz Irresistível", 268, { amalgama: { disciplina: "dominacao", nivel: 1 }, efeito: "A Dominação funciona só pela voz (não por meios eletrônicos)." }),
    p("presenca", 5, "magnetismoDeEstrela", "Magnetismo de Estrela", 268, { custo: { checagens: 1, doPoder: true }, duracao: "doPoder", efeito: "Fascínio, Amedrontar e Transe por transmissão ao vivo." }),
    p("presenca", 5, "majestade", "Majestade", 268, { custo: CH(2), parada: [["carisma", "disciplina"]], resistencia: [["autocontrole", "determinacao"]], duracao: "cena", efeito: "Ninguém age contra o usuário; vencer a resistência dá 1 turno de liberdade + 1 por margem.", critico: "Na resistência, livre pela cena." }),

    /* ---------------- PROTEANISMO (p. 269–271) ---------------- */
    p("proteanismo", 1, "olhosDaBesta", "Olhos da Besta", 269, { duracao: "ate desativar", alternavel: true, efeitos: { mods: [{ habilidade: "intimidacao", contexto: "contraMortais", valor: 2 }], semPenalidadeEscuro: true }, efeito: "Enxerga no escuro; +2 dados em Intimidação contra mortais." }),
    p("proteanismo", 1, "pesoPena", "Peso Pena", 269, { duracao: "ate desativar", alternavel: true, efeito: "Imune a dano de quedas e colisões; em reação, Raciocínio + Sobrevivência, Dif 3." }),
    p("proteanismo", 2, "armasFerais", "Armas Ferais", 270, { custo: CH(1), duracao: "cena", efeitos: { danoDesarmado: 2, superficialNaoDivide: true, mordidaSemPenalidade: true }, efeito: "Garras: arma leve de Briga (+2); mordida sem penalidade de ataque localizado; o dano Superficial em vampiros não é dividido." }),
    p("proteanismo", 3, "fusaoComATerra", "Fusão com a Terra", 270, { custo: CH(1), duracao: "dia", efeito: "Afunda numa superfície natural (1 turno) e descansa protegido." }),
    p("proteanismo", 3, "mudancaDeForma", "Mudança de Forma", 270, { custo: CH(1), duracao: "cena", efeitos: { forma: "animal" }, efeito: "Assume a forma de um animal do próprio tamanho: Atributos Físicos, sentidos e Habilidades do animal (p. 373)." }),
    p("proteanismo", 4, "metamorfose", "Metamorfose", 271, { prereq: "mudancaDeForma", custo: CH(1), duracao: "cena", efeitos: { forma: "animalQualquer" }, efeito: "A forma animal pode ser de outro tamanho." }),
    p("proteanismo", 5, "coracaoVagante", "Coração Vagante", 271, { efeitos: { estacaDificuldade: 3 }, efeito: "+3 Dif para estaqueá-lo; estacado: 1 Checagem e Força + Determinação, Dif 5, uma vez por hora, para expulsar a estaca (não com Fome 5)." }),
    p("proteanismo", 5, "formaDeNevoa", "Forma de Névoa", 271, { custo: { checagens: 1, ate: 3, texto: "1 a 3 Checagens (cada uma acelera a transformação)" }, duracao: "cena", efeitos: { forma: "nevoa" }, efeito: "Névoa intocável, exceto por fogo, sol e o sobrenatural." }),

    /* ---------------- FEITIÇARIA DE SANGUE (p. 271–274) ---------------- */
    p("feiticaria", 1, "umGostoPorSangue", "Um Gosto por Sangue", 272, { parada: [["determinacao", "disciplina"]], dificuldade: 3, duracao: "uso", efeito: "Prova o sangue: Ressonância, intensidade, se é humano, mortal/carniçal/vampiro, Potência relativa.", critico: "Diablerie e geração exata." }),
    p("feiticaria", 1, "vitaeCorrosivo", "Vitae Corrosivo", 272, { custo: { checagens: 1, porUso: true, texto: "1+ Checagens" }, duracao: "uso", efeito: "Cada Checagem corrói ~35 cm de matéria morta." }),
    p("feiticaria", 2, "extinguirVitae", "Extinguir Vitae", 273, { custo: CH(1), parada: [["inteligencia", "disciplina"]], resistencia: [["vigor", "autocontrole"]], duracao: "uso", efeitos: { fomeNoAlvo: 1, fomeNoAlvoCritico: 2 }, efeito: "Vitória: +1 Fome no alvo (crítico, +2)." }),
    p("feiticaria", 3, "picadaDeEscorpiao", "Picada de Escorpião", 273, { custo: { checagens: 1, porUso: true, texto: "1+ Checagens" }, parada: [["forca", "disciplina"]], resistencia: [["vigor", "ocultismo"], ["vigor", "fortitude"]], duracao: "cena", efeitos: { danoVeneno: "margem" }, efeito: "Cuspe venenoso (ataque Destreza + Atletismo): Agravado = margem a mortais; Superficial não dividido a vampiros." }),
    p("feiticaria", 3, "sanguePotente", "Sangue Potente", 273, { custo: CH(1), parada: [["determinacao", "disciplina"]], duracao: "noite", efeitos: { potenciaTemporaria: 1, potenciaCritico: 2 }, efeito: "+1 Potência (crítico, +2), acima do limite da geração; Dif 2 + Potência." }),
    p("feiticaria", 4, "rouboDeVitae", "Roubo de Vitae", 274, { custo: CH(1), parada: [["raciocinio", "disciplina"]], resistencia: [["raciocinio", "ocultismo"]], duracao: "alimentacao", efeito: "Alimenta-se à distância." }),
    p("feiticaria", 5, "caldeiraoDeSangue", "Caldeirão de Sangue", 274, { custo: { checagens: 1, maculas: true, texto: "1 Checagem + uma ou mais Máculas" }, parada: [["determinacao", "disciplina"]], resistencia: [["autocontrole", "ocultismo"], ["autocontrole", "fortitude"]], duracao: "turno", efeitos: { danoAgravado: "margem" }, efeito: "Toque: Agravado = margem; mortais morrem; vampiros +1 Fome por dano." }),
    p("feiticaria", 5, "cariciaDeBaal", "Carícia de Baal", 274, { custo: { checagens: 1, porUso: true }, parada: [["forca", "disciplina"]], resistencia: [["vigor", "ocultismo"], ["vigor", "fortitude"]], duracao: "cena", efeitos: { danoAgravado: "margem" }, efeito: "Veneno: Agravado = margem (mortais e vampiros); mortal com 1 dano morre; vampiro que sofre Agravado rola de novo: vitória, Torpor no próximo sono." }),

    /* ---------------- ALQUIMIA SANGUE-RALO (p. 282–287) ---------------- */
    p("alquimia", 1, "longoAlcance", "Longo Alcance", 284, { formula: true, custo: CH(1), parada: [["determinacao", "disciplina"]], resistencia: [["forca", "atletismo"]], duracao: "turno", efeito: "Move um objeto de até 100 kg a 10 m; empurrar uma pessoa: margem = metros e Superficial; manter flutuando: Dif 3 por turno." }),
    p("alquimia", 1, "neblina", "Neblina", 285, { formula: true, custo: CH(1), duracao: "cena", efeitos: { penalidadeContraVoceDistancia: 2 }, efeito: "Uma nuvem segue o usuário: −2 dados a ataques à distância contra ele; estender a um grupo de 5 com outra Checagem." }),
    p("alquimia", 2, "envolver", "Envolver", 285, { formula: true, custo: CH(1), parada: [["raciocinio", "disciplina"]], resistencia: [["vigor", "sobrevivencia"]], duracao: "cena", efeito: "−3 dados em detecção visual e ataques à distância; mortal sufoca (vitória não age; crítico, inconsciente)." }),
    p("alquimia", 2, "defracionar", "Defracionar", 285, { formula: true, custo: { gratis: true, texto: "Sem custo de ativação" }, duracao: "uso", efeito: "Cada sucesso torna uma bolsa de sangue fracionado em integral (sacia 1)." }),
    p("alquimia", 3, "hierosGamosProfano", "Hieros Gamos Profano", 285, { formula: true, custo: { checagens: 1, texto: "1 Checagem (ou 1 Agravado à Vitalidade de um mortal)" }, parada: [["vigor", "determinacao"]], duracao: "permanente", efeito: "Transforma a forma (Dif 8 − sucessos da destilação; vampiro soma a Gravidade da Perdição).", critico: "Pode conceder ou remover Qualidades/Defeitos Visuais (pagando XP)." }),
    p("alquimia", 4, "impetoAereo", "Ímpeto Aéreo", 287, { formula: true, custo: CH(1), parada: [["forca", "disciplina"]], resistencia: [["forca", "atletismo"]], duracao: "cena", efeito: "Voa na velocidade de corrida." }),
    p("alquimia", 4, "despertarAdormecido", "Despertar Adormecido", 287, { formula: true, custo: { gratis: true }, duracao: "uso", efeito: "Cada sucesso acima de 2 desperta do Torpor um vampiro daquela Potência." }),
  ];

  /* ---------------- RITUAIS (p. 274–282) ---------------- */
  /* Todos: 1 Checagem; 5 min por nível; Inteligência + Feitiçaria,
     Dif = nível + 1 (p. 274). `ingredientes`, `duracao`, `efeito`. */
  function r(nivel, chave, nome, pagina, o) {
    return Object.assign({ tipo: "ritual", nivel: nivel, chave: chave, nome: nome, pagina: pagina, custo: { checagens: 1 }, parada: [["inteligencia", "feiticaria"]], dificuldade: nivel + 1, execucaoMinutos: 5 * nivel }, o || {});
  }
  var RITUAIS = [
    r(1, "aderenciaDoInseto", "Aderência do Inseto", 276, { ingredientes: "Uma aranha viva", duracao: "cena", efeito: "Adere a paredes e tetos por uma cena (crítico: a noite), na metade da velocidade." }),
    r(1, "caminhoDoSangue", "Caminho do Sangue", 276, { ingredientes: "Copo de prata com o Sangue do alvo", efeito: "Revela a geração e o nome do Senhor do alvo.", critico: "Também os Laços ativos." }),
    r(1, "criarPedraDeSangue", "Criar Pedra de Sangue", 276, { ingredientes: "Seixo de ferro ou ímã; 1 litro de sangue", execucaoNoites: 3, duracao: "indefinida", efeito: "Rastreia a pedra (direção e distância); máximo de pedras = Determinação." }),
    r(1, "despertarComFrescor", "Despertar com o Frescor do Anoitecer", 276, { ingredientes: "Ossos e cinzas de galo", duracao: "dia", efeitos: { ignoraPenalidadeDiurna: true }, efeito: "Desperta alerta se houver perigo; ignora penalidades diurnas na cena.", critico: "Até o amanhecer." }),
    r(1, "protecaoContraCarnicais", "Proteção contra Carniçais", 276, { protecao: "carnicais", duracao: "indefinida", efeito: "Glifo: carniçal que toca sofre 1 Agravado (crítico 3)." }),
    r(2, "circuloContraCarnicais", "Círculo de Proteção contra Carniçais", 277, { circulo: "carnicais", custo: { checagens: 3 }, duracao: "noite", efeito: "Círculo de até 3 m; cruzar exige disputa contra a FdV; 3 Superficial (crítico 3 Agravado)." }),
    r(2, "comunicacaoComOSenhor", "Comunicação com o Senhor do Membro", 277, { ingredientes: "Objeto do Senhor, tigela de prata", execucaoMinutos: 15, duracao: "10 minutos", efeito: "Telepatia com o Senhor por 10 minutos.", critico: "Imediata." }),
    r(2, "iluminarORastro", "Iluminar o Rastro da Presa", 277, { ingredientes: "Fita de cetim branca", duracao: "noite", efeito: "Rastro brilhante de até 24 h (rastrear: Inteligência + Sobrevivência, Dif 6 − margem).", critico: "Duas noites." }),
    r(2, "olhosDeBabel", "Olhos de Babel", 277, { ingredientes: "Olho e língua de uma vítima", maculasPossiveis: true, duracao: "uma semana", efeito: "Lê e fala a língua da vítima.", critico: "Um mês." }),
    r(2, "protecaoContraEspiritos", "Proteção contra Espíritos", 277, { protecao: "espiritos", duracao: "indefinida", efeito: "Glifo contra espíritos." }),
    r(2, "verdadeDoSangue", "Verdade do Sangue", 277, { ingredientes: "Sangue do alvo", duracao: "cena", efeito: "Determinação + Feitiçaria vs. Autocontrole + Ocultismo por afirmação: sabe se é verdade." }),
    r(3, "andarilhoDoFogo", "Andarilho do Fogo", 278, { ingredientes: "A ponta de um dedo", duracao: "noite", efeitos: { metadeFogo: true }, efeito: "Metade do dano de fogo na noite (Vigor + Determinação, Dif 3)." }),
    r(3, "chamadoDeDagon", "O Chamado de Dagon", 278, { ingredientes: "Adaga; a vítima exposta ao sangue do conjurador", resistencia: [["vigor", "determinacao"]], efeitos: { danoAgravado: "margem", contraVampiro: "superficial" }, efeito: "Afoga por dentro: margem = Agravado a mortais, Superficial a vampiros; repetir 2× com Checagem." }),
    r(3, "circuloContraEspiritos", "Círculo de Proteção contra Espíritos", 278, { circulo: "espiritos", custo: { checagens: 3 }, duracao: "noite", efeito: "Círculo contra espíritos." }),
    r(3, "deflexaoDaRuina", "Deflecção da Ruína de Madeira", 278, { ingredientes: "Lascas de madeira", duracao: "noite", efeitos: { primeiraEstaca: true }, efeito: "A primeira estaca se despedaça.", critico: "Cega o atacante 2 turnos." }),
    r(3, "essenciaDoAr", "Essência do Ar", 279, { ingredientes: "Beladona", duracao: "cena", efeito: "Voo lento por uma cena.", critico: "Duas doses." }),
    r(3, "protecaoContraLupinos", "Proteção contra Lupinos", 279, { protecao: "lupinos", duracao: "indefinida", efeito: "Glifo contra lobisomens." }),
    r(4, "circuloContraLupinos", "Círculo de Proteção contra Lupinos", 279, { circulo: "lupinos", custo: { checagens: 3 }, duracao: "noite", efeito: "Círculo contra lobisomens." }),
    r(4, "defesaDoRefugio", "Defesa do Refúgio Sagrado", 279, { execucaoMinutos: 60, duracao: "indefinida", efeito: "Raio de 6 m impede a luz solar enquanto o conjurador estiver." }),
    r(4, "olhosDoFalcao", "Olhos do Falcão Noturno", 279, { ingredientes: "Olhos de uma ave carnívora", duracao: "cena", efeito: "Controla a ave e vê pelos olhos dela; arrancar os olhos da ave depois, senão 3 noites de cegueira." }),
    r(4, "passagemIncorporea", "Passagem Incorpórea", 280, { ingredientes: "Um espelho", duracao: "cena", efeito: "Incorpóreo; imune exceto a fogo, sol e armas arcanas." }),
    r(4, "protecaoContraCainitas", "Proteção contra Cainitas", 280, { protecao: "cainitas", ingredientes: "Cinzas de fogo", duracao: "indefinida", efeito: "Glifo contra vampiros (risco de frenesi de terror)." }),
    r(5, "circuloContraCainitas", "Círculo de Proteção contra Cainitas", 280, { circulo: "cainitas", custo: { checagens: 3 }, duracao: "noite", efeito: "Círculo contra vampiros." }),
    r(5, "coracaoDePedra", "Coração de Pedra", 280, { ingredientes: "Laje e vela", duracao: "indefinida", efeitos: { imuneEstaca: true, remorso: -3, social: -3 }, efeito: "1 Agravado e frenesi de terror Dif 3; imune a estacas; −3 dados em Remorso e Sociais ativas (exceto Intimidação e Dominação); sem Presença; +3 para resistir a Presença." }),
    r(5, "fugaParaOSantuario", "Fuga para o Verdadeiro Santuário", 281, { custo: { checagens: 12, texto: "12 Checagens ao preparar os dois círculos" }, duracao: "uso", efeito: "Teleporta-se entre os dois círculos; um por cena." }),
    r(5, "fusteDeExtincao", "Fuste de Extinção Tardia", 281, { ingredientes: "Estaca de sorveira", custo: { checagens: 2 }, execucaoMinutos: 300, efeito: "+3 dados para estacar; margem 5+: reduz a pó; senão a ponta se enterra até o coração em horas ou noites (remover: Destreza + Medicina, Dif 6)." }),
  ];

  /* Proteções e Círculos (p. 275–276): mecânica comum. */
  var PROTECOES = {
    glifo: "Ao tocar: a rolagem do Ritual; vitória, 1 Agravado à Vitalidade do intruso (crítico 3); para tocar de novo: 1 FdV + Vigor + Determinação, Dif 4 (7 se crítico).",
    circulo: "Até 3 m; uma noite para conjurar (Dif + 2); um ano e um dia ou até o amanhecer; cruzar: Inteligência + Feitiçaria vs. FdV do intruso; vencer: 3 Superficial (crítico 3 Agravado) e não entra; 1 FdV para tentar de novo.",
  };

  /* ---------------- ALQUIMIA: métodos e destilação (p. 282–284) ---------------- */
  var METODOS_DE_ALQUIMIA = {
    athanorCorporis: { nome: "Athanor Corporis", parada: ["vigor", "alquimia"], texto: "No próprio corpo: bebe os sangues ressonantes; só um poder ativo por vez; ~3 turnos de concentração.", umAtivo: true, armazena: false },
    calcinatio: { nome: "Calcinatio", parada: ["manipulacao", "alquimia"], texto: "No corpo de um humano: bebe do alvo para ativar; Fome saciada = nível do poder (mínimo 1); um poder por vítima.", saciaNivel: true, armazena: false },
    fixatio: { nome: "Fixatio", parada: ["inteligencia", "alquimia"], texto: "Em laboratório: fórmulas fixas e carregáveis; sem laboratório, só fracas (nível 3 ou menos) com −2 dados; carrega até Raciocínio ou Destreza; armazena até 2 × (Alquimia + Refúgio).", armazena: true, semLaboratorio: -2 },
  };
  /* Resultado da destilação (p. 283): sucessos → qualidade. */
  function qualidadeDaDestilacao(sucessos) {
    var s = Number(sucessos) || 0;
    if (s >= 6) return "aumentada";
    if (s >= 4) return "funciona";
    if (s >= 2) return "fraca";
    return "falha";
  }
  /* Imitar poderes (p. 285–287): o nível da fórmula imita o nível − 1
     de outra Disciplina; tempo de destilação e pesquisa. */
  var IMITACAO = {
    2: { imitaNivel: 1, destilar: "algumas horas", pesquisa: "uma semana" },
    3: { imitaNivel: 2, destilar: "uma noite", pesquisa: "um mês" },
    4: { imitaNivel: 3, destilar: "três noites", pesquisa: "três meses", exigeVitae: true },
    5: { imitaNivel: 4, destilar: "um mês", pesquisa: "três anos", exigeVitae: true },
  };

  var porChave = {};
  PODERES.forEach(function (x) { porChave[x.chave] = x; });
  var ritualPorChave = {};
  RITUAIS.forEach(function (x) { ritualPorChave[x.chave] = x; });

  global.RAMAVampiroDisciplinas = {
    DISCIPLINAS: DISCIPLINAS, PODERES: PODERES, RITUAIS: RITUAIS, PROTECOES: PROTECOES,
    METODOS_DE_ALQUIMIA: METODOS_DE_ALQUIMIA, IMITACAO: IMITACAO, qualidadeDaDestilacao: qualidadeDaDestilacao,
    poder: function (k) { return porChave[k] || null; },
    ritual: function (k) { return ritualPorChave[k] || null; },
    daDisciplina: function (d) { return PODERES.filter(function (x) { return x.disciplina === d; }); },
  };
})(typeof window !== "undefined" ? window : globalThis);
/* <<< js/vampiro/disciplinas-dados.js */

/* >>> js/vampiro/antagonistas-dados.js */
/* =====================================================================
   R.A.M.A. — Vampiro: A Máscara (V5) · antagonistas do Livro Básico
   =====================================================================
   p. 369–377 (PDF +4). Cada um com a fisiologia própria:
     natureza "mortal"   paradas Físico/Social/Mental padrão + as
                         excepcionais; Debilitado = incapacitado
     natureza "animal"   idem, com o dano extra da espécie
     natureza "vampiro"  ficha completa (Atributos, Habilidades,
                         Disciplinas, Humanidade, Potência)
     natureza "criatura" sem Fome: o que seria Checagem vira 1
                         Superficial à FdV ou à Vitalidade (p. 376)
   O catálogo é só leitura: uma cópia vira PN da crônica e pode ser
   editada lá, marcada como personalizada.
   ===================================================================== */

(function (global) {
  "use strict";

  function m(chave, nome, natureza, o) { return Object.assign({ chave: chave, nome: nome, natureza: natureza }, o); }

  var LISTA = [
    /* Mortais (p. 371–372) */
    m("detetive", "Detetive da Polícia", "mortal", { paradas: { fisico: 4, social: 3, mental: 4 }, vitalidade: 6, forcaDeVontade: 5, excepcionais: { atletismo: 5, armasDeFogo: 5, investigacao: 6, manha: 5 }, pagina: 371 }),
    m("criminoso", "Criminoso", "mortal", { paradas: { fisico: 4, social: 3, mental: 3 }, vitalidade: 6, forcaDeVontade: 4, excepcionais: { briga: 5, armasDeFogo: 5, intimidacao: 5, ladroagem: 5, manha: 7 }, pagina: 371 }),
    m("clerigo", "Clérigo", "mortal", { paradas: { fisico: 3, social: 5, mental: 4 }, vitalidade: 5, forcaDeVontade: 7, excepcionais: { erudicao: 6, sagacidade: 7, ocultismo: 5, lideranca: 6 }, especial: "Alguns possuem Fé Verdadeira (p. 222).", pagina: 371 }),
    m("cacadorDaFe", "Caçador da Fé", "mortal", { paradas: { fisico: 4, social: 4, mental: 5 }, vitalidade: 6, forcaDeVontade: 8, excepcionais: { erudicao: 7, percepcao: 7, armasBrancas: 6, investigacao: 7, ocultismo: 8 }, especial: "Sangue alterado: +4 dados para resistir a Disciplinas; beber dele causa 4 Agravado salvo Vigor + Determinação, Dif 5.", resistirDisciplinas: 4, pagina: 371 }),
    m("investigadorInquisicao", "Investigador da Inquisição", "mortal", { paradas: { fisico: 5, social: 4, mental: 5 }, vitalidade: 7, forcaDeVontade: 7, excepcionais: { erudicao: 6, percepcao: 7, armasDeFogo: 6, investigacao: 7 }, pagina: 372 }),
    m("inquisidorDelta", "Inquisidor Delta", "mortal", { paradas: { fisico: 6, social: 4, mental: 4 }, vitalidade: 8, forcaDeVontade: 7, excepcionais: { atletismo: 8, percepcao: 7, briga: 8, armasDeFogo: 9, armasBrancas: 8, especialista: 9 }, especial: "Equipamento apropriado à missão (armaduras, munições especiais).", pagina: 372 }),
    m("carnical", "Carniçal", "carnical", { paradas: { fisico: 4, social: 4, mental: 4 }, vitalidade: 6, forcaDeVontade: 5, excepcionais: { percepcao: 6, intimidacao: 5, ocultismo: 6, furtividade: 5 }, disciplinas: 1, especial: "Uma Disciplina com valor 1 (p. 234).", pagina: 372 }),
    /* Animais (p. 373) */
    m("morcego", "Morcego (grande)", "animal", { paradas: { fisico: 3, social: 1, mental: 1 }, vitalidade: 2, forcaDeVontade: 1, excepcionais: { percepcao: 7, furtividade: 5 }, pagina: 373 }),
    m("urso", "Urso", "animal", { paradas: { fisico: 7, social: 1, mental: 1 }, vitalidade: 8, forcaDeVontade: 3, excepcionais: { percepcao: 3, intimidacao: 6 }, danoExtra: 2, pagina: 373 }),
    m("aveDeRapina", "Ave de Rapina", "animal", { paradas: { fisico: 4, social: 1, mental: 1 }, vitalidade: 3, forcaDeVontade: 2, excepcionais: { percepcao: 6, briga: 5, furtividade: 6 }, pagina: 373 }),
    m("caoDeGuarda", "Cão de Guarda", "animal", { paradas: { fisico: 5, social: 1, mental: 1 }, vitalidade: 5, forcaDeVontade: 2, excepcionais: { percepcao: 4, briga: 6, intimidacao: 4, furtividade: 4 }, danoExtra: 1, pagina: 373 }),
    m("cavalo", "Cavalo", "animal", { paradas: { fisico: 6, social: 1, mental: 1 }, vitalidade: 7, forcaDeVontade: 2, excepcionais: { percepcao: 4 }, danoExtra: 2, especial: "+2 de dano ao pisotear caídos.", pagina: 373 }),
    m("rato", "Rato", "animal", { paradas: { fisico: 3, social: 1, mental: 1 }, vitalidade: 1, forcaDeVontade: 1, excepcionais: { percepcao: 5, briga: 4, furtividade: 7 }, especial: "Um bando soma 3 à Vitalidade e às rolagens Físicas.", pagina: 373 }),
    m("lobo", "Lobo", "animal", { paradas: { fisico: 6, social: 1, mental: 1 }, vitalidade: 6, forcaDeVontade: 3, excepcionais: { percepcao: 3, intimidacao: 5, furtividade: 5 }, danoExtra: 1, pagina: 373 }),
    /* Vampiros (p. 374–375) */
    m("harpiaDeElisio", "Harpia de Elísio", "vampiro", {
      atributos: { forca: 2, destreza: 3, vigor: 2, carisma: 4, manipulacao: 4, autocontrole: 3, inteligencia: 2, raciocinio: 3, determinacao: 3 }, vitalidade: 5, forcaDeVontade: 6,
      habilidades: { erudicao: 2, percepcao: 4, financas: 2, investigacao: 3, politica: 4, ocultismo: 1, atletismo: 1, briga: 1, oficios: 1, conducao: 2, etiqueta: 5, sagacidade: 4, intimidacao: 3, lideranca: 3, performance: 3, persuasao: 4, manha: 3, subterfugio: 4 },
      disciplinas: { auspicios: 3, celeridade: 2, fortitude: 1, presenca: 3 }, humanidade: 6, potencia: 3, pagina: 374 }),
    m("revolucionarioAnarch", "Revolucionário Anarch", "vampiro", {
      atributos: { forca: 4, destreza: 3, vigor: 3, carisma: 3, manipulacao: 3, autocontrole: 2, inteligencia: 2, raciocinio: 4, determinacao: 4 }, vitalidade: 6, forcaDeVontade: 6,
      habilidades: { erudicao: 1, percepcao: 3, investigacao: 1, ocultismo: 1, politica: 3, ciencia: 2, tecnologia: 3, atletismo: 4, briga: 4, conducao: 3, armasDeFogo: 3, ladroagem: 4, armasBrancas: 3, furtividade: 2, sobrevivencia: 2, empatiaComAnimais: 2, etiqueta: 1, sagacidade: 2, intimidacao: 2, lideranca: 2, persuasao: 1, manha: 4, subterfugio: 1 },
      disciplinas: { animalismo: 2, celeridade: 2, fortitude: 3, potencia: 2, proteanismo: 1 }, humanidade: 7, potencia: 2, pagina: 374 }),
    m("bispoNodista", "Bispo Nodista", "vampiro", {
      atributos: { forca: 2, destreza: 2, vigor: 2, carisma: 5, manipulacao: 3, autocontrole: 4, inteligencia: 5, raciocinio: 3, determinacao: 5 }, vitalidade: 8, forcaDeVontade: 9,
      habilidades: { erudicao: 4, percepcao: 2, financas: 1, investigacao: 2, medicina: 2, politica: 4, ocultismo: 5, ciencia: 1, ladroagem: 2, armasBrancas: 1, furtividade: 2, empatiaComAnimais: 1, etiqueta: 4, sagacidade: 3, intimidacao: 3, lideranca: 4, performance: 2, persuasao: 5, subterfugio: 4 },
      disciplinas: { auspicios: 2, dominacao: 2, fortitude: 3, presenca: 4 }, humanidade: 5, potencia: 3, pagina: 375 }),
    m("xerifeSanguinario", "Xerife Sanguinário", "vampiro", {
      atributos: { forca: 4, destreza: 5, vigor: 4, carisma: 2, manipulacao: 1, autocontrole: 2, inteligencia: 3, raciocinio: 4, determinacao: 4 }, vitalidade: 7, forcaDeVontade: 7,
      habilidades: { erudicao: 1, percepcao: 3, financas: 1, investigacao: 4, politica: 2, tecnologia: 2, atletismo: 4, briga: 3, conducao: 2, armasDeFogo: 4, ladroagem: 3, armasBrancas: 3, furtividade: 4, sobrevivencia: 3, empatiaComAnimais: 2, etiqueta: 1, sagacidade: 1, intimidacao: 5, lideranca: 1, persuasao: 1, manha: 3 },
      disciplinas: { animalismo: 2, celeridade: 3, ofuscacao: 3, potencia: 4 }, humanidade: 5, potencia: 4, pagina: 375 }),
    m("criatura", "Criatura (Humanidade 0)", "vampiro", {
      atributos: { forca: 3, destreza: 3, vigor: 5, carisma: 1, manipulacao: 1, autocontrole: 1, inteligencia: 1, raciocinio: 4, determinacao: 2 }, vitalidade: 8, forcaDeVontade: 3,
      habilidades: { percepcao: 5, investigacao: 4, atletismo: 4, briga: 4, armasDeFogo: 1, armasBrancas: 2, furtividade: 4, sobrevivencia: 5, empatiaComAnimais: 2, intimidacao: 4, subterfugio: 2 },
      disciplinas: { animalismo: 3, celeridade: 4, fortitude: 3, potencia: 4 }, humanidade: 0, potencia: 3, pagina: 375 }),
    /* Criaturas de horror (p. 376–377) */
    m("lobisomem", "Lobisomem", "criatura", { semFome: true, vitalidade: 7, forcaDeVontade: 6,
      atributos: { forca: 3, destreza: 3, vigor: 4, carisma: 3, manipulacao: 3, autocontrole: 2, inteligencia: 3, raciocinio: 4, determinacao: 4 },
      disciplinas: { animalismo: 5, auspicios: 5, celeridade: 4, fortitude: 5, ofuscacao: 1, potencia: 5 },
      especial: "Sofre Agravado só de armas de prata e fogo; recupera 1 Superficial à Vitalidade por turno; garras e presas causam Superficial não dividido em vampiros (+3); +3 em todos os Atributos Físicos na forma de guerra. Sangue: cada gole sacia o dobro e +1 Dificuldade para resistir a frenesi por Fome saciada.", pagina: 376 }),
    m("mago", "Mago", "criatura", { semFome: true, vitalidade: 5, forcaDeVontade: 10,
      atributos: { forca: 2, destreza: 3, vigor: 2, carisma: 3, manipulacao: 4, autocontrole: 5, inteligencia: 5, raciocinio: 4, determinacao: 5 },
      disciplinas: { auspicios: 4, feiticaria: 4, dominacao: 4, ofuscacao: 3, presenca: 2 },
      especial: "Tão vulnerável quanto mortais; pode erguer defesas ad hoc gastando 1 FdV.", pagina: 377 }),
    m("feerico", "Feérico", "criatura", { semFome: true, vitalidade: 6, forcaDeVontade: 7,
      atributos: { forca: 2, destreza: 4, vigor: 3, carisma: 7, manipulacao: 5, autocontrole: 4, inteligencia: 3, raciocinio: 4, determinacao: 4 },
      disciplinas: { celeridade: 1, dominacao: 4, ofuscacao: 4, presenca: 5 },
      especial: "Agravado só de fogo e ferro frio; ilusões: Raciocínio ou Determinação + Auspícios vs. Manipulação + Raciocínio.", pagina: 377 }),
    m("espectro", "Espectro", "criatura", { semFome: true, vitalidade: 7, forcaDeVontade: 4,
      atributos: { forca: 4, destreza: 4, vigor: 4, carisma: 1, manipulacao: 3, autocontrole: 2, inteligencia: 3, raciocinio: 3, determinacao: 2 },
      disciplinas: { auspicios: 4, celeridade: 2, dominacao: 2, ofuscacao: 2 },
      especial: "Não pode ser atacado sem forma concreta; possui corpos (como Possessão); Destreza + Briga para arremessar objetos.", pagina: 377 }),
  ];

  /* Antagonista simples (p. 370): só uma Dificuldade. */
  function simples(nome, dificuldade) { return { chave: "", nome: nome, natureza: "simples", dificuldade: Math.max(1, Math.min(7, Number(dificuldade) || 3)) }; }

  global.RAMAVampiroAntagonistas = {
    LISTA: LISTA, simples: simples,
    porChave: function (k) { return LISTA.filter(function (a) { return a.chave === k; })[0] || null; },
  };
})(typeof window !== "undefined" ? window : globalThis);
/* <<< js/vampiro/antagonistas-dados.js */

/* >>> js/vampiro/dados.js */
/* =====================================================================
   R.A.M.A. — Vampiro: A Máscara (V5) · o motor de dados
   =====================================================================
   Paradas de d10, Livro Básico p. 117–125 e 205–207. Puro: quem rola
   passa um `rolador(faces)` (na página, o de js/dados.js; nos testes,
   uma fila). Nada aqui toca a ficha — a ficha (regras.js) monta a
   parada, cobra os custos e aplica as consequências.

     · cada dado de 6 a 9 é um sucesso; o 10 também;
     · cada PAR de 10 vale 4 sucessos (2 a mais que os dois 10 sozinhos):
       três 10 = 5 sucessos, quatro 10 = 8;
     · a Dificuldade é o número de sucessos necessários — o limiar de
       cada dado continua 6;
     · dados de Fome SUBSTITUEM dados comuns (a parada não cresce): tantos
       quanto a Fome, nunca mais que a parada; Checagens e testes de
       trilha (Força de Vontade, Humanidade) não têm dado de Fome;
     · crítico bestial: vitória CRÍTICA com um 10 num dado de Fome;
       falha bestial: teste FRACASSADO com um 1 num dado de Fome; um 1
       de Fome numa vitória não é nada, um 10 de Fome sozinho não é
       crítico;
     · Força de Vontade rerrola até 3 dados COMUNS, uma vez por rolagem,
       nunca dados de Fome, nunca Checagens, trilhas ou conflito de
       rolagem única; os resultados novos valem, mesmo piores.

   A rolagem nasce PENDENTE: enquanto houver uma decisão que pode mudar
   a classificação (rerrolar com FdV), a ficha não aplica consequências.
   Quem conclui é concluir(); depois disso nada muda.
   ===================================================================== */

(function (global) {
  "use strict";

  var LIMIAR = 6;
  var MAX_RERROLAGEM = 3;

  function inteiro(v, min, padrao) {
    var n = Math.floor(Number(v));
    if (!isFinite(n)) n = padrao === undefined ? 0 : padrao;
    return min !== undefined && n < min ? min : n;
  }

  function face(rolador) {
    var f = Math.floor(Number(rolador(10)));
    return f >= 1 && f <= 10 ? f : 1;
  }

  /* Conta sucessos de uma lista de faces (ou de dados {face}). */
  function contar(dados) {
    var faces = dados.map(function (d) { return typeof d === "number" ? d : d.face; });
    var simples = faces.filter(function (f) { return f >= LIMIAR; }).length;
    var dezes = faces.filter(function (f) { return f === 10; }).length;
    var pares = Math.floor(dezes / 2);
    return { sucessos: simples + pares * 2, dezes: dezes, pares: pares, critico: pares > 0 };
  }

  /* Quantos dos dados de uma parada são de Fome (p. 205). */
  function dadosDeFome(parada, fome, semFome) {
    if (semFome) return 0;
    return Math.max(0, Math.min(inteiro(parada, 0), inteiro(fome, 0)));
  }

  /* Rola uma parada. `o`:
       parada     número de dados (mínimo 1, salvo checagem)
       fome       Fome atual (ignorada com semFome)
       tipo       "teste" | "trilha" | "checagem" | "rolagemUnica"
       dificuldade, oposicao (sucessos do oponente), agente (quem age vence o empate)
       composicao [{ fonte, valor }] — guardada no histórico
       rotulo, id
     Devolve um RESULTADO, pendente até concluir(). */
  function rolar(o, rolador) {
    var tipo = o.tipo || "teste";
    var semFome = tipo !== "teste" || !!o.semFome;
    var parada = Math.max(1, inteiro(o.parada, 1));
    var nFome = dadosDeFome(parada, o.fome, semFome);
    var dados = [];
    for (var i = 0; i < parada; i++) {
      var f = face(rolador);
      /* Os de Fome são os ÚLTIMOS da parada: os comuns vêm antes. */
      dados.push({ i: i, face: f, original: f, fome: i >= parada - nFome, rerrolado: false });
    }
    var r = {
      id: o.id || "",
      rotulo: o.rotulo || "",
      tipo: tipo,
      parada: parada,
      fome: nFome,
      composicao: Array.isArray(o.composicao) ? o.composicao.slice() : [],
      dificuldade: o.dificuldade === undefined || o.dificuldade === null || o.dificuldade === "" ? null : Math.max(0, inteiro(o.dificuldade, 0)),
      oposicao: o.oposicao === undefined || o.oposicao === null ? null : Math.max(0, inteiro(o.oposicao, 0)),
      agente: o.agente !== false,
      dados: dados,
      rerrolagem: null,
      pendente: true,
      surto: !!o.surto,
      custos: Array.isArray(o.custos) ? o.custos.slice() : [],
    };
    r.classificacao = classificar(r);
    return r;
  }

  /* A classificação de um resultado com o que se sabe: SEM Dificuldade
     nem oposição, não há vitória a anunciar — só os sucessos. */
  function classificar(r) {
    var c = contar(r.dados);
    var fomeDez = r.dados.some(function (d) { return d.fome && d.face === 10; });
    var fomeUm = r.dados.some(function (d) { return d.fome && d.face === 1; });
    var alvo = r.oposicao !== null && r.oposicao !== undefined ? r.oposicao : r.dificuldade;
    var julgado = alvo !== null && alvo !== undefined;
    var out = { sucessos: c.sucessos, dezes: c.dezes, pares: c.pares, critico: c.critico, julgado: julgado };
    if (!julgado) return out;
    /* Disputa: quem age vence o empate (p. 123). */
    var vitoria = r.oposicao !== null && r.oposicao !== undefined
      ? (r.agente ? c.sucessos >= r.oposicao : c.sucessos > r.oposicao)
      : c.sucessos >= r.dificuldade;
    out.vitoria = vitoria;
    out.margem = vitoria ? c.sucessos - alvo : 0;
    out.faltam = vitoria ? 0 : alvo - c.sucessos;
    out.vitoriaCritica = vitoria && c.critico;
    /* Bestiais só em testes com Fome (p. 207). */
    out.criticoBestial = r.tipo === "teste" && out.vitoriaCritica && fomeDez;
    out.falhaBestial = r.tipo === "teste" && !vitoria && fomeUm;
    out.falhaTotal = c.sucessos === 0;
    /* Vencer a um custo (p. 121): algum sucesso, mas não o bastante. */
    out.podeVencerACusto = !vitoria && c.sucessos > 0 && r.tipo !== "checagem";
    return out;
  }

  /* Julgar depois: a Dificuldade ou a oposição chegou. */
  function julgar(r, criterio) {
    if (!r.pendente) return { ok: false, motivo: "A rolagem já foi concluída." };
    if (criterio.dificuldade !== undefined) r.dificuldade = Math.max(0, inteiro(criterio.dificuldade, 0));
    if (criterio.oposicao !== undefined) r.oposicao = Math.max(0, inteiro(criterio.oposicao, 0));
    if (criterio.agente !== undefined) r.agente = !!criterio.agente;
    r.classificacao = classificar(r);
    return { ok: true };
  }

  /* Pode rerrolar? E quais dados (índices). */
  function podeRerrolar(r) {
    if (!r.pendente) return { ok: false, motivo: "A rolagem já foi concluída." };
    if (r.tipo !== "teste") return { ok: false, motivo: "Força de Vontade não rerrola Checagens, testes de trilha nem conflito de rolagem única." };
    if (r.rerrolagem) return { ok: false, motivo: "Esta rolagem já usou Força de Vontade." };
    if (!r.dados.some(function (d) { return !d.fome; })) return { ok: false, motivo: "Não há dados comuns para rerrolar." };
    return { ok: true };
  }

  /* Rerrola até 3 dados comuns escolhidos (índices). O custo (1 dano
     Superficial à FdV, sem dividir) é cobrado pela ficha. */
  function rerrolar(r, indices, rolador) {
    var pode = podeRerrolar(r);
    if (!pode.ok) return pode;
    var lista = (Array.isArray(indices) ? indices : []).map(Number).filter(function (i, k, todos) { return todos.indexOf(i) === k; });
    if (!lista.length) return { ok: false, motivo: "Escolha ao menos um dado." };
    if (lista.length > MAX_RERROLAGEM) return { ok: false, motivo: "Até três dados." };
    for (var k = 0; k < lista.length; k++) {
      var d = r.dados[lista[k]];
      if (!d) return { ok: false, motivo: "Dado inexistente." };
      if (d.fome) return { ok: false, motivo: "Dados de Fome não podem ser rerrolados com Força de Vontade." };
    }
    var antes = r.classificacao;
    lista.forEach(function (i) {
      var d = r.dados[i];
      d.face = face(rolador);
      d.rerrolado = true;
    });
    r.rerrolagem = { indices: lista, antes: { sucessos: antes.sucessos, criticoBestial: !!antes.criticoBestial, falhaBestial: !!antes.falhaBestial } };
    r.classificacao = classificar(r);
    return { ok: true };
  }

  /* Fecha a rolagem: a classificação não muda mais. `vencerACusto`:
     o Narrador aceitou (só quando possível). */
  function concluir(r, opcoes) {
    var o = opcoes || {};
    if (!r.pendente) return { ok: true, repetida: true };
    if (o.vencerACusto) {
      if (!r.classificacao.podeVencerACusto) return { ok: false, motivo: "Só quando a rolagem teve algum sucesso e falhou." };
      r.classificacao.vitoriaACusto = true;
    }
    r.pendente = false;
    return { ok: true };
  }

  /* Checagem (p. 122): 1 dado, sucesso em 6+; `dados: 2` rola dois e
     fica com o melhor (Potência do Sangue, Humanidade 8 no Rubor). */
  function checagem(rolador, opcoes) {
    var n = opcoes && opcoes.dados === 2 ? 2 : 1;
    var faces = [];
    for (var i = 0; i < n; i++) faces.push(face(rolador));
    var melhor = Math.max.apply(null, faces);
    return { faces: faces, face: melhor, sucesso: melhor >= LIMIAR, dois: n === 2 };
  }

  /* Vitória automática (p. 120): parada ≥ 2 × Dificuldade, margem 0.
     Nunca em checagens. */
  function vitoriaAutomatica(parada, dificuldade) {
    var d = inteiro(dificuldade, 0);
    return d > 0 && inteiro(parada, 0) >= 2 * d;
  }

  /* Pegar a metade (p. 123): metade da parada, arredondada para baixo. */
  function pegarAMetade(parada) { return Math.floor(inteiro(parada, 0) / 2); }

  /* Disputa entre dois resultados já rolados: vence quem tem mais
     sucessos; empate favorece quem age (p. 123). */
  function disputa(agente, oponente) {
    var a = contar(agente.dados).sucessos, b = contar(oponente.dados).sucessos;
    return { agente: a, oponente: b, vence: a >= b ? "agente" : "oponente", margem: Math.abs(a - b) };
  }

  /* Conflito (p. 125): o vencedor subtrai os sucessos do perdedor e
     aplica o resto como dano, somado ao modificador da arma. Empate
     bilateral: os dois causam dano como se vencessem por 1. */
  function resolverConflito(a, b, opcoes) {
    var o = opcoes || {};
    var sa = typeof a === "number" ? a : contar(a.dados).sucessos;
    var sb = typeof b === "number" ? b : contar(b.dados).sucessos;
    if (sa === sb) {
      if (o.bilateral) return { empate: true, danoEmB: 1 + (o.armaA || 0), danoEmA: 1 + (o.armaB || 0) };
      return { empate: true, danoEmB: 0, danoEmA: 0 };
    }
    if (sa > sb) return { vence: "a", margem: sa - sb, danoEmB: sa - sb + (o.armaA || 0), danoEmA: 0 };
    return { vence: "b", margem: sb - sa, danoEmA: o.bilateral ? sb - sa + (o.armaB || 0) : 0, danoEmB: 0, defendeu: !o.bilateral };
  }

  /* Conflito de rolagem única (p. 298): dano = dobro da Dificuldade −
     sucessos, sem dividir, sem armadura, sem FdV nem Surto. */
  function danoDeRolagemUnica(sucessos, dificuldade) {
    return Math.max(0, 2 * inteiro(dificuldade, 0) - inteiro(sucessos, 0));
  }

  /* Teste estendido (p. 293–294): acumula sucessos por rolagem. */
  function testeEstendido(estado, resultado, variante) {
    var e = estado || { total: 0, rolagens: 0, encerrado: false };
    if (e.encerrado) return e;
    var c = resultado.classificacao || classificar(resultado);
    e.rolagens++;
    if (c.falhaTotal) { e.total = 0; e.falhaTotal = true; if (variante === "cascata") e.encerrado = true; return e; }
    if (variante === "dificil") e.total += c.vitoria ? c.margem : 0;
    else if (variante === "cascata") { if (!c.vitoria) { e.encerrado = true; return e; } e.total += 1; e.bonusProxima = c.margem; }
    else e.total += c.sucessos;
    return e;
  }

  /* O que vai para o histórico: tudo o que a rolagem foi. */
  function paraHistorico(r) {
    return {
      v: 1, sistema: "vampiro", tipo: r.tipo, rotulo: r.rotulo, parada: r.parada, fome: r.fome,
      composicao: r.composicao, dificuldade: r.dificuldade, oposicao: r.oposicao,
      dados: r.dados.map(function (d) { return { face: d.face, original: d.original, fome: d.fome, rerrolado: d.rerrolado }; }),
      rerrolagem: r.rerrolagem, classificacao: r.classificacao, surto: r.surto, custos: r.custos,
      consequencias: r.consequencias || [],
    };
  }

  /* Texto acessível de um dado: nunca só a cor. */
  function rotuloDoDado(d) {
    var tipo = d.fome ? "dado de Fome" : "dado comum";
    var leitura = d.face === 10 ? (d.fome ? "10, crítico de Fome" : "10, crítico")
      : d.face >= LIMIAR ? d.face + ", sucesso"
      : d.face === 1 && d.fome ? "1, bestial" : d.face + ", falha";
    return tipo + ": " + leitura + (d.rerrolado ? " (rerrolado, era " + d.original + ")" : "");
  }

  global.RAMAVampiroDados = {
    LIMIAR: LIMIAR, MAX_RERROLAGEM: MAX_RERROLAGEM,
    contar: contar, dadosDeFome: dadosDeFome, rolar: rolar, classificar: classificar, julgar: julgar,
    podeRerrolar: podeRerrolar, rerrolar: rerrolar, concluir: concluir, checagem: checagem,
    vitoriaAutomatica: vitoriaAutomatica, pegarAMetade: pegarAMetade, disputa: disputa,
    resolverConflito: resolverConflito, danoDeRolagemUnica: danoDeRolagemUnica, testeEstendido: testeEstendido,
    paraHistorico: paraHistorico, rotuloDoDado: rotuloDoDado,
  };
})(typeof window !== "undefined" ? window : globalThis);
/* <<< js/vampiro/dados.js */

/* >>> js/vampiro/regras.js */
/* =====================================================================
   R.A.M.A. — Vampiro: A Máscara (V5) · motor da ficha
   =====================================================================
   Funções PURAS sobre o bloco `vampiro` da ficha (schema 25). Nada aqui
   lê a tela, sorteia sozinho ou olha o relógio do computador: quem rola
   passa um `rolador(faces)`; quem avança o tempo chama os MOMENTOS
   (inicioDaSessao, fimDaSessao, novaNoite, fimDaCena, fimDoTurno).

   AS CAMADAS — de onde vem cada ponto
     base        o que a pessoa distribuiu na criação (atributos,
                 habilidades, Disciplinas, especializações, vantagens)
     concessões  CALCULADAS a partir das escolhas da criação (clã, idade,
                 Predador): trocar o Predador troca só o que ele dá, sem
                 duplicar nem apagar compras independentes
     compras     experiência gasta, uma entrada por compra, com o custo
     ajustes     o que o Narrador autorizou e o que a história fez
                 (Remorso, Diablerie, Torpor…), cada um com a origem
   O valor efetivo é a soma; calcular() devolve a composição de cada um.
   Recalcular nunca cura dano nem devolve recurso: dano, Fome, Máculas e
   estados são SALDOS guardados.

   CADA ALTERAÇÃO DEVOLVE EVENTOS { ok, eventos[] }. Operações vindas de
   fora (mesa, servidor, clique repetido) passam por aplicarOperacao.

   Páginas: impressas (PDF = +2 até a 305). Interpretações: docs/VAMPIRO.md.
   ===================================================================== */

(function (global) {
  "use strict";

  var C = global.RAMAVampiroCatalogo;
  var D = global.RAMAVampiroDados;
  function DS() { return global.RAMAVampiroDisciplinas; }

  var VERSAO_BLOCO = 1;
  var LIMITE_OPERACOES = 300;
  var NATUREZAS = ["vampiro", "carnical", "mortal"];

  /* ---------------------------------------------------------------
     UTILIDADES
     --------------------------------------------------------------- */

  function inteiro(v, min, max, padrao) {
    var n = Math.floor(Number(v));
    if (!isFinite(n)) n = padrao === undefined ? 0 : padrao;
    if (min !== undefined && n < min) n = min;
    if (max !== undefined && n > max) n = max;
    return n;
  }
  function texto(v, max) { return String(v === undefined || v === null ? "" : v).slice(0, max || 300); }
  function copiar(x) { return x === undefined ? undefined : JSON.parse(JSON.stringify(x)); }
  var contadorDeId = 0;
  function novoId(prefixo) {
    var U = global.RAMAUtil;
    if (U && U.uuid) return (prefixo || "v") + "-" + U.uuid();
    contadorDeId++;
    return (prefixo || "v") + "-" + Date.now().toString(36) + "-" + contadorDeId;
  }
  function evento(tipo, dados) { return Object.assign({}, dados || {}, { tipo: tipo }); }
  function falha(motivo, extra) { return Object.assign({ ok: false, motivo: motivo, eventos: [] }, extra || {}); }
  function lista(v) { return Array.isArray(v) ? v : []; }
  function objeto(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  function chaveValida(v) { return typeof v === "string" && /^[A-Za-z0-9_-]{1,60}$/.test(v); }

  /* ---------------------------------------------------------------
     O BLOCO: vazio e normalizado
     --------------------------------------------------------------- */

  function atributosIniciais(valor) {
    var a = {};
    C.ATRIBUTOS.forEach(function (x) { a[x.chave] = valor; });
    return a;
  }

  function fichaVazia(natureza) {
    return {
      v: VERSAO_BLOCO,
      natureza: NATUREZAS.indexOf(natureza) >= 0 ? natureza : "vampiro",
      conceito: "", cla: "", senhor: "", geracao: 13, idade: "neofito",
      abraco: { data: "", local: "", circunstancias: "" },
      idadeVerdadeira: "", idadeAparente: "", epoca: "",
      ambicao: "", desejo: "", predador: "",
      perdicaoParametro: "",
      atributos: atributosIniciais(1), habilidades: {}, disciplinas: {},
      especializacoes: [], poderes: [], rituais: [], formulas: [], metodoAlquimia: "",
      vantagens: [], fichas: [], sangueRalo: { qualidades: [], defeitos: [] },
      convicoes: [], pilares: [], principiosAceitos: true,
      humanidadeBase: 7, maculas: 0, potenciaBase: 1, fome: 1, fracaoDeFome: 0,
      vitalidade: { superficial: 0, agravado: 0 }, forcaDeVontade: { superficial: 0, agravado: 0 },
      ressonancia: null,
      estado: { torpor: null, estacado: false, morteFinal: null, frenesi: null, compulsao: null, degeneracao: false, wassail: false, dormindo: false, ambienteFeio: false, ferimentos: [] },
      efeitos: [], lacos: [], formulasProntas: [],
      compras: [], ajustes: [], xp: { recebido: 0, historico: [] },
      criacao: { concluida: false, etapa: 0, distribuicao: "", predador: { especializacao: -1, disciplina: "", escolhas: {} }, excecoes: [], semPredador: false },
      equipamento: [], notas: "",
      tempo: { sessao: 0, noite: 0, cena: 0, turno: 0 },
      marcas: { sessao: {}, noite: {}, cena: {} },
      historicoDeEventos: [],
      operacoes: [],
    };
  }

  function normalizarDano(b) {
    var x = objeto(b);
    return { superficial: inteiro(x.superficial, 0, 30, 0), agravado: inteiro(x.agravado, 0, 30, 0) };
  }

  function normalizar(bruto) {
    var b = objeto(bruto);
    var o = fichaVazia(b.natureza);
    o.v = VERSAO_BLOCO;
    ["conceito", "senhor", "idadeVerdadeira", "idadeAparente", "epoca", "ambicao", "desejo", "perdicaoParametro", "notas", "metodoAlquimia"].forEach(function (k) { o[k] = texto(b[k], k === "notas" ? 20000 : 600); });
    o.cla = C.CLAS[b.cla] ? b.cla : "";
    o.predador = C.PREDADORES[b.predador] ? b.predador : "";
    o.idade = C.IDADES[b.idade] ? b.idade : "neofito";
    o.geracao = inteiro(b.geracao, 4, 16, 13);
    var ab = objeto(b.abraco);
    o.abraco = { data: texto(ab.data, 60), local: texto(ab.local, 200), circunstancias: texto(ab.circunstancias, 2000) };
    var at = objeto(b.atributos);
    C.ATRIBUTOS.forEach(function (x) { o.atributos[x.chave] = inteiro(at[x.chave], 0, 10, 1); });
    var hb = objeto(b.habilidades);
    C.HABILIDADES.forEach(function (x) { var v = inteiro(hb[x.chave], 0, 10, 0); if (v) o.habilidades[x.chave] = v; });
    var di = objeto(b.disciplinas);
    Object.keys(DS().DISCIPLINAS).forEach(function (k) { var v = inteiro(di[k], 0, 10, 0); if (v) o.disciplinas[k] = v; });
    o.especializacoes = lista(b.especializacoes).filter(function (e) { return e && C.habilidade(e.habilidade); }).slice(0, 80).map(function (e) {
      return { id: texto(e.id, 80) || novoId("es"), habilidade: e.habilidade, nome: texto(e.nome, 80), origem: texto(e.origem, 20) || "criacao" };
    });
    o.poderes = lista(b.poderes).filter(function (x) { return x && DS().poder(x.chave); }).slice(0, 80).map(function (x) {
      return { id: texto(x.id, 80) || novoId("po"), chave: x.chave, origem: texto(x.origem, 20) || "criacao" };
    });
    o.rituais = lista(b.rituais).filter(function (x) { return x && DS().ritual(x.chave); }).slice(0, 80).map(function (x) {
      return { id: texto(x.id, 80) || novoId("ri"), chave: x.chave, origem: texto(x.origem, 20) || "criacao" };
    });
    o.formulas = lista(b.formulas).filter(function (x) { return x && DS().poder(x.chave) && DS().poder(x.chave).formula; }).slice(0, 40).map(function (x) {
      return { id: texto(x.id, 80) || novoId("fo"), chave: x.chave, origem: texto(x.origem, 20) || "criacao" };
    });
    o.vantagens = lista(b.vantagens).filter(function (x) { return x && C.VANTAGENS[x.chave]; }).slice(0, 80).map(normalizarVantagem);
    /* Fichas de Conhecimento: cada nível é um item à parte (p. 180). */
    var vistos = {};
    o.fichas = lista(b.fichas).filter(function (x) {
      if (!x || !chaveValida(x.ficha) || !C.FICHAS_DE_CONHECIMENTO[x.ficha]) return false;
      var k = x.ficha + ":" + inteiro(x.nivel, 1, 5, 1);
      if (vistos[k]) return false;
      vistos[k] = true;
      return true;
    }).slice(0, 40).map(function (x) {
      return { id: texto(x.id, 80) || novoId("fc"), ficha: x.ficha, nivel: inteiro(x.nivel, 1, 5, 1), origem: texto(x.origem, 20) || "criacao" };
    });
    var sr = objeto(b.sangueRalo);
    o.sangueRalo = {
      qualidades: lista(sr.qualidades).filter(function (k) { return C.SANGUE_RALO.qualidades[k]; }).slice(0, 8),
      defeitos: lista(sr.defeitos).filter(function (k) { return C.SANGUE_RALO.defeitos[k]; }).slice(0, 8),
    };
    o.convicoes = lista(b.convicoes).slice(0, 6).map(function (x) {
      var c = objeto(x);
      return { id: texto(c.id, 80) || novoId("cv"), texto: texto(c.texto, 300), perdida: !!c.perdida };
    });
    o.pilares = lista(b.pilares).slice(0, 6).map(function (x) {
      var p = objeto(x);
      return { id: texto(p.id, 80) || novoId("pi"), nome: texto(p.nome, 120), convicaoId: texto(p.convicaoId, 80), relacaoId: texto(p.relacaoId, 80),
        estado: ["vivo", "ferido", "destruido"].indexOf(p.estado) >= 0 ? p.estado : "vivo", historico: lista(p.historico).slice(-20) };
    });
    o.humanidadeBase = inteiro(b.humanidadeBase, 0, 10, 7);
    o.maculas = inteiro(b.maculas, 0, 10, 0);
    o.potenciaBase = inteiro(b.potenciaBase, 0, 10, 1);
    o.fome = inteiro(b.fome, 0, 5, 1);
    o.fracaoDeFome = inteiro(b.fracaoDeFome, 0, 1, 0);
    o.vitalidade = normalizarDano(b.vitalidade);
    o.forcaDeVontade = normalizarDano(b.forcaDeVontade);
    var rs = objeto(b.ressonancia);
    o.ressonancia = C.RESSONANCIAS[rs.tipo] ? { tipo: rs.tipo, temperamento: C.TEMPERAMENTOS[rs.temperamento] ? rs.temperamento : "efemero", discrasia: C.DISCRASIAS[rs.discrasia] ? rs.discrasia : "", fonte: texto(rs.fonte, 120), usada: !!rs.usada } : null;
    var es = objeto(b.estado);
    o.estado = {
      torpor: es.torpor && typeof es.torpor === "object" ? { motivo: texto(es.torpor.motivo, 40), noite: inteiro(es.torpor.noite, 0), dias: inteiro(es.torpor.dias, 0), ate: texto(es.torpor.ate, 60) } : null,
      estacado: !!es.estacado,
      morteFinal: es.morteFinal && typeof es.morteFinal === "object" ? { causa: texto(es.morteFinal.causa, 200), quando: texto(es.morteFinal.quando, 60) } : null,
      frenesi: es.frenesi && typeof es.frenesi === "object" && C.FRENESI[es.frenesi.tipo] ? { tipo: es.frenesi.tipo, curtindo: !!es.frenesi.curtindo, cena: inteiro(es.frenesi.cena, 0) } : null,
      compulsao: es.compulsao && typeof es.compulsao === "object" ? normalizarCompulsao(es.compulsao) : null,
      degeneracao: !!es.degeneracao,
      wassail: !!es.wassail,
      dormindo: !!es.dormindo,
      ambienteFeio: !!es.ambienteFeio,
      ferimentos: lista(es.ferimentos).filter(function (f) { return f && C.FERIMENTOS.some(function (x) { return x.chave === f.chave; }); }).slice(0, 10).map(function (f) { return { id: texto(f.id, 80) || novoId("fe"), chave: f.chave, nota: texto(f.nota, 120) }; }),
    };
    o.efeitos = lista(b.efeitos).filter(function (e) { return e && chaveValida(e.chave); }).slice(0, 60).map(normalizarEfeito);
    o.lacos = lista(b.lacos).slice(0, 20).map(function (x) {
      var l = objeto(x);
      return { id: texto(l.id, 80) || novoId("la"), reinante: texto(l.reinante, 120), reinanteId: texto(l.reinanteId, 80), forca: inteiro(l.forca, 0, 6, 0), noites: lista(l.noites).map(String).slice(-6), ultimaNoite: inteiro(l.ultimaNoite, 0) };
    });
    o.formulasProntas = lista(b.formulasProntas).slice(0, 40).filter(function (x) { return x && DS().poder(x.chave); }).map(function (x) {
      return { id: texto(x.id, 80) || novoId("fp"), chave: x.chave, qualidade: texto(x.qualidade, 20), sucessos: inteiro(x.sucessos, 0, 30), metodo: texto(x.metodo, 30), ativa: !!x.ativa, consumida: !!x.consumida };
    });
    o.compras = lista(b.compras).slice(0, 400).map(function (x) {
      var c = objeto(x);
      return { id: texto(c.id, 80) || novoId("cp"), tipo: texto(c.tipo, 30), alvo: texto(c.alvo, 60), de: inteiro(c.de, 0, 20), para: inteiro(c.para, 0, 20), custo: inteiro(c.custo, 0, 9999), nome: texto(c.nome, 120), poderes: lista(c.poderes).map(String).slice(0, 10), noite: inteiro(c.noite, 0), credito: inteiro(c.credito, 0, 99, 0) };
    });
    o.ajustes = lista(b.ajustes).slice(0, 400).map(function (x) {
      var a = objeto(x);
      return { id: texto(a.id, 80) || novoId("aj"), tipo: texto(a.tipo, 30), alvo: texto(a.alvo, 60), valor: inteiro(a.valor, -20, 20, 0), origem: texto(a.origem, 30) || "narrador", motivo: texto(a.motivo, 300), noite: inteiro(a.noite, 0) };
    });
    var xp = objeto(b.xp);
    o.xp = { recebido: inteiro(xp.recebido, 0, 99999, 0), historico: lista(xp.historico).slice(-200).map(function (h) { var x = objeto(h); return { id: texto(x.id, 80), valor: inteiro(x.valor, -9999, 9999), motivo: texto(x.motivo, 200), noite: inteiro(x.noite, 0) }; }), creditos: objeto(xp.creditos) };
    var cr = objeto(b.criacao), pr = objeto(cr.predador);
    o.criacao = {
      concluida: !!cr.concluida, etapa: inteiro(cr.etapa, 0, 20, 0),
      distribuicao: C.DISTRIBUICOES_DE_HABILIDADES[cr.distribuicao] ? cr.distribuicao : "",
      predador: { especializacao: inteiro(pr.especializacao, -1, 10, -1), disciplina: texto(pr.disciplina, 30), poder: texto(pr.poder, 60), escolhas: objeto(pr.escolhas) },
      excecoes: lista(cr.excecoes).slice(0, 30).map(function (e) { return { id: texto(e.id, 80) || novoId("ex"), texto: texto(e.texto, 300), autorizada: !!e.autorizada }; }),
      semPredador: !!cr.semPredador,
    };
    o.equipamento = lista(b.equipamento).slice(0, 80).map(function (x) {
      var e = objeto(x);
      return { id: texto(e.id, 80) || novoId("eq"), nome: texto(e.nome, 120), arma: C.ARMAS[e.arma] ? e.arma : "", armadura: C.ARMADURAS[e.armadura] ? e.armadura : "", dano: e.dano === undefined || e.dano === "" ? null : inteiro(e.dano, 0, 10), notas: texto(e.notas, 600), personalizado: !!e.personalizado };
    });
    var tp = objeto(b.tempo);
    o.tempo = { sessao: inteiro(tp.sessao, 0), noite: inteiro(tp.noite, 0), cena: inteiro(tp.cena, 0), turno: inteiro(tp.turno, 0) };
    var mc = objeto(b.marcas);
    o.marcas = { sessao: objeto(mc.sessao), noite: objeto(mc.noite), cena: objeto(mc.cena) };
    o.historicoDeEventos = lista(b.historicoDeEventos).slice(-200);
    o.operacoes = lista(b.operacoes).map(String).slice(-LIMITE_OPERACOES);
    return o;
  }

  function normalizarVantagem(x) {
    var v = objeto(x), def = C.VANTAGENS[v.chave];
    var pts = inteiro(v.pontos, 0, 10, def.niveis[0]);
    if (def.niveis.indexOf(pts) < 0) pts = def.niveis[0];
    return { id: texto(v.id, 80) || novoId("va"), chave: v.chave, pontos: pts, nota: texto(v.nota, 200), parametro: texto(v.parametro, 120), relacaoId: texto(v.relacaoId, 80), origem: texto(v.origem, 20) || "criacao", compartilhada: !!v.compartilhada };
  }

  function normalizarCompulsao(c) {
    return { chave: texto(c.chave, 30), cla: !!c.cla, penalidade: inteiro(c.penalidade, 0, 5, 2), cena: inteiro(c.cena, 0), repeticoes: inteiro(c.repeticoes, 0, 5, 0), nota: texto(c.nota, 200) };
  }

  function normalizarEfeito(x) {
    var e = objeto(x);
    return {
      id: texto(e.id, 80) || novoId("ef"), chave: e.chave, nome: texto(e.nome, 120),
      origem: { tipo: texto(objeto(e.origem).tipo, 20), chave: texto(objeto(e.origem).chave, 60) },
      duracao: texto(e.duracao, 30) || "cena",
      inicio: { sessao: inteiro(objeto(e.inicio).sessao, 0), noite: inteiro(objeto(e.inicio).noite, 0), cena: inteiro(objeto(e.inicio).cena, 0), turno: inteiro(objeto(e.inicio).turno, 0) },
      dados: objeto(e.dados),
    };
  }

  /* ---------------------------------------------------------------
     CONCESSÕES — o que clã, idade e Predador dão (calculado)
     --------------------------------------------------------------- */

  function ehSangueRalo(o) { return o.cla === "sangueRalo"; }
  function ehVampiro(o) { return o.natureza === "vampiro"; }

  function concessoes(o) {
    var out = [];
    var idade = C.IDADES[o.idade];
    if (ehVampiro(o) && idade && !ehSangueRalo(o)) {
      if (idade.humanidade !== 7) out.push({ origem: "idade", tipo: "humanidade", valor: idade.humanidade - 7 });
    }
    if (o.cla === "caitiff") out.push({ origem: "cla", tipo: "vantagem", chave: "suspeito", pontos: 1, nota: "Caitiff" });
    if (o.cla === "nosferatu") out.push({ origem: "cla", tipo: "vantagem", chave: "repulsivo", pontos: 2, nota: "Perdição Nosferatu" });
    var p = C.PREDADORES[o.predador];
    if (p && ehVampiro(o) && !ehSangueRalo(o)) {
      var esc = o.criacao.predador;
      var e = p.especializacoes[esc.especializacao];
      if (e) {
        out.push({ origem: "predador", tipo: "especializacao", habilidade: e.habilidade, nome: e.nome });
        if (!(o.habilidades[e.habilidade] > 0)) out.push({ origem: "predador", tipo: "habilidade", alvo: e.habilidade, valor: 1 });
      }
      if (esc.disciplina && p.disciplinas.indexOf(esc.disciplina) >= 0 && predadorDisciplinaPermitida(o, p, esc.disciplina)) {
        out.push({ origem: "predador", tipo: "disciplina", alvo: esc.disciplina, valor: 1 });
        if (esc.poder) out.push({ origem: "predador", tipo: "poder", chave: esc.poder });
      }
      if (p.humanidade) out.push({ origem: "predador", tipo: "humanidade", valor: p.humanidade });
      if (p.potencia) out.push({ origem: "predador", tipo: "potencia", valor: p.potencia });
      lista(p.vantagens).forEach(function (v) { out.push({ origem: "predador", tipo: "vantagem", chave: v.chave, pontos: v.pontos, nota: v.nota || "" }); });
      lista(p.defeitos).forEach(function (v) { out.push({ origem: "predador", tipo: "vantagem", chave: v.chave, pontos: v.pontos, nota: v.nota || "" }); });
      lista(p.escolhas).forEach(function (esco, i) {
        var feito = esc.escolhas[String(i)];
        if (esco.tipo === "defeitoUnico") {
          var opc = esco.entre.filter(function (x) { return x.chave === feito; })[0];
          if (opc) out.push({ origem: "predador", tipo: "vantagem", chave: opc.chave, pontos: opc.pontos, nota: opc.nota || "" });
        } else if (feito && typeof feito === "object") {
          /* Repartição de pontos ("3 entre Fama e Rebanho"). Os grupos
             ("Míticos") viram a vantagem escolhida dentro deles. */
          Object.keys(feito).forEach(function (chave) {
            var n = inteiro(feito[chave], 0, esco.pontos, 0);
            if (!n || !C.VANTAGENS[chave]) return;
            out.push({ origem: "predador", tipo: "vantagem", chave: chave, pontos: n, nota: "" });
          });
        }
      });
    }
    return out;
  }

  function predadorDisciplinaPermitida(o, p, disciplina) {
    return !(p.soTremere && p.soTremere.indexOf(disciplina) >= 0 && o.cla !== "tremere");
  }

  /* ---------------------------------------------------------------
     CALCULAR — o valor efetivo, com a composição
     --------------------------------------------------------------- */

  function somarCamadas(o, tipo, alvo, base, conc) {
    var comp = [];
    if (base) comp.push({ fonte: "criação", valor: base });
    conc.forEach(function (c) { if (c.tipo === tipo && (alvo === null || c.alvo === alvo)) comp.push({ fonte: c.origem, valor: c.valor }); });
    o.compras.forEach(function (c) { if (c.tipo === tipo && (alvo === null || c.alvo === alvo)) comp.push({ fonte: "experiência", valor: c.para - c.de, id: c.id }); });
    o.ajustes.forEach(function (a) { if (a.tipo === tipo && (alvo === null || a.alvo === alvo || !a.alvo)) comp.push({ fonte: a.origem, valor: a.valor, id: a.id, motivo: a.motivo }); });
    var total = comp.reduce(function (s, x) { return s + x.valor; }, 0);
    return { valor: total, composicao: comp };
  }

  function efeitosAtivos(o) { return o.efeitos; }
  function temEfeito(o, chave) { return o.efeitos.some(function (e) { return e.chave === chave; }); }

  /* Os poderes que a ficha tem (base + concessões + compras). */
  function poderesDaFicha(o, conc) {
    var c = conc || concessoes(o);
    var out = o.poderes.map(function (x) { return { id: x.id, chave: x.chave, origem: x.origem }; });
    c.filter(function (x) { return x.tipo === "poder"; }).forEach(function (x) {
      if (!out.some(function (y) { return y.chave === x.chave; })) out.push({ id: "pred-" + x.chave, chave: x.chave, origem: "predador" });
    });
    return out;
  }
  function temPoder(o, chave) { return poderesDaFicha(o).some(function (p) { return p.chave === chave; }); }

  function vantagensDaFicha(o, conc) {
    var c = conc || concessoes(o);
    var out = o.vantagens.map(function (v) { return Object.assign({}, v); });
    c.filter(function (x) { return x.tipo === "vantagem"; }).forEach(function (x, i) {
      out.push({ id: "conc-" + x.origem + "-" + x.chave + "-" + i, chave: x.chave, pontos: x.pontos, nota: x.nota || "", origem: x.origem });
    });
    return out;
  }
  function temVantagem(o, chave) { return vantagensDaFicha(o).some(function (v) { return v.chave === chave; }); }
  function pontosDeVantagem(o, chave) { return vantagensDaFicha(o).filter(function (v) { return v.chave === chave; }).reduce(function (s, v) { return s + v.pontos; }, 0); }
  function temQualidadeRalo(o, k) { return ehSangueRalo(o) && o.sangueRalo.qualidades.indexOf(k) >= 0; }
  function temDefeitoRalo(o, k) { return ehSangueRalo(o) && o.sangueRalo.defeitos.indexOf(k) >= 0; }

  function especializacoesDaFicha(o, conc) {
    var c = conc || concessoes(o);
    var out = o.especializacoes.map(function (e) { return Object.assign({}, e); });
    c.filter(function (x) { return x.tipo === "especializacao"; }).forEach(function (x, i) {
      out.push({ id: "pred-esp-" + i, habilidade: x.habilidade, nome: x.nome, origem: "predador" });
    });
    return out;
  }

  function valorDeAtributo(o, k) { return calcularAtributo(o, k).valor; }
  function calcularAtributo(o, k) {
    var r = somarCamadas(o, "atributo", k, o.atributos[k] || 0, []);
    /* Aspectos animais (Perdição Gangrel), Poder Vindo da Dor: efeitos. */
    o.efeitos.forEach(function (e) {
      var d = objeto(e.dados.atributos);
      if (d[k]) r.composicao.push({ fonte: e.nome || e.chave, valor: d[k], efeito: e.id });
    });
    r.valor = Math.max(0, r.composicao.reduce(function (s, x) { return s + x.valor; }, 0));
    return r;
  }
  function valorDeHabilidade(o, k, conc) { return Math.max(0, somarCamadas(o, "habilidade", k, o.habilidades[k] || 0, conc || concessoes(o)).valor); }
  function valorDeDisciplina(o, k, conc) {
    var base = somarCamadas(o, "disciplina", k, o.disciplinas[k] || 0, conc || concessoes(o)).valor;
    /* Pontos temporários (sangue-ralo pela Ressonância; Direto da Fonte). */
    var temp = 0;
    o.efeitos.forEach(function (e) { var d = objeto(e.dados.disciplinas); if (d[k]) temp = Math.max(temp, d[k]); });
    return Math.max(0, Math.max(base, temp));
  }

  function humanidade(o, conc) { return inteiro(somarCamadas(o, "humanidade", null, o.humanidadeBase, conc || concessoes(o)).valor, 0, 10); }

  function potencia(o, conc) {
    if (ehSangueRalo(o) || !ehVampiro(o)) return 0;
    /* Durante a criação, a base vem da idade (p. 151); depois de
       concluída, é o valor da ficha. */
    var idade = C.IDADES[o.idade];
    var base = o.criacao.concluida || !idade ? o.potenciaBase : idade.potencia;
    var bruto = somarCamadas(o, "potencia", null, base, conc || concessoes(o)).valor;
    var lim = limitesDePotencia(o);
    var v = inteiro(bruto, lim[0], lim[1]);
    /* Sangue Potente (Feitiçaria): passa do limite da geração (p. 273). */
    o.efeitos.forEach(function (e) { if (e.dados.potencia) v += inteiro(e.dados.potencia, 0, 3); });
    return Math.min(10, v);
  }
  function limitesDePotencia(o) {
    if (ehSangueRalo(o)) return [0, 0];
    var g = C.GERACOES[o.geracao] || [0, 10];
    return [g[0], g[1]];
  }
  function gravidadeDaPerdicao(o) {
    if (temDefeitoRalo(o, "maldicaoDeCla")) return 1;
    return C.potencia(potencia(o)).perdicao;
  }

  function vitalidadeMaxima(o, conc) {
    var vig = valorDeAtributo(o, "vigor");
    var max = vig + 3;
    var c = conc || concessoes(o);
    if (temPoder(o, "resiliencia") && !estaEmFormaSemCorpo(o)) max += valorDeDisciplina(o, "fortitude", c);
    o.efeitos.forEach(function (e) { if (e.dados.vitalidade) max += inteiro(e.dados.vitalidade, -10, 10); });
    /* Bebedor Diurno ao sol: metade (arred. para cima) — efeito "sol". */
    if (o.efeitos.some(function (e) { return e.chave === "bebedorDiurnoAoSol"; })) max = Math.ceil(max / 2);
    return Math.max(1, max);
  }
  function estaEmFormaSemCorpo(o) { return o.efeitos.some(function (e) { return e.dados.forma === "nevoa"; }); }
  function fdvMaxima(o) { return Math.max(1, valorDeAtributo(o, "autocontrole") + valorDeAtributo(o, "determinacao")); }

  function trilha(max, t) {
    var sup = Math.min(t.superficial, max), agr = Math.min(t.agravado, max);
    var usado = Math.min(max, sup + agr);
    return { max: max, superficial: sup, agravado: agr, livre: max - usado, atual: max - usado, debilitado: usado >= max, toda: agr >= max };
  }

  /* O estado da Persona: ativa | debilitada | incapacitada | torpor |
     estacada | morte (nenhum apaga a ficha). */
  function estadoDe(o, vit) {
    if (o.estado.morteFinal) return "morteFinal";
    if (o.estado.torpor) return "torpor";
    if (o.estado.estacado) return "estacado";
    var v = vit || trilha(vitalidadeMaxima(o), o.vitalidade);
    if (!ehVampiro(o)) {
      if (v.toda) return "morte";
      if (v.debilitado) return "incapacitado";
    }
    if (o.estado.wassail) return "besta";
    return "ativo";
  }

  function xpGasto(o) { return o.compras.reduce(function (s, c) { return s + c.custo; }, 0); }
  function xpTotal(o) {
    var idade = C.IDADES[o.idade];
    var inicial = ehVampiro(o) && idade && !ehSangueRalo(o) ? idade.xp : 0;
    return inicial + o.xp.recebido;
  }

  function calcular(o) {
    var conc = concessoes(o);
    var atributos = {}, habilidades = {}, disciplinas = {};
    C.ATRIBUTOS.forEach(function (a) { atributos[a.chave] = calcularAtributo(o, a.chave); });
    C.HABILIDADES.forEach(function (h) { var r = somarCamadas(o, "habilidade", h.chave, o.habilidades[h.chave] || 0, conc); if (r.valor) habilidades[h.chave] = r; });
    Object.keys(DS().DISCIPLINAS).forEach(function (k) { var v = valorDeDisciplina(o, k, conc); if (v) disciplinas[k] = { valor: v, composicao: somarCamadas(o, "disciplina", k, o.disciplinas[k] || 0, conc).composicao }; });
    var pot = potencia(o, conc);
    var vit = trilha(vitalidadeMaxima(o, conc), o.vitalidade);
    var fdv = trilha(fdvMaxima(o), o.forcaDeVontade);
    var hum = humanidade(o, conc);
    var xpT = xpTotal(o), xpG = xpGasto(o);
    return {
      atributos: atributos, habilidades: habilidades, disciplinas: disciplinas,
      especializacoes: especializacoesDaFicha(o, conc), vantagens: vantagensDaFicha(o, conc), poderes: poderesDaFicha(o, conc),
      concessoes: conc,
      humanidade: hum, humanidadeComposicao: somarCamadas(o, "humanidade", null, o.humanidadeBase, conc).composicao, maculas: o.maculas, espacosVazios: Math.max(0, 10 - hum - o.maculas),
      humanidadeTabela: C.HUMANIDADE[hum],
      potencia: pot, limitesDePotencia: limitesDePotencia(o), tabelaPotencia: C.potencia(pot),
      gravidadePerdicao: gravidadeDaPerdicao(o), fome: o.fome,
      vitalidade: vit, forcaDeVontade: fdv,
      estado: estadoDe(o, vit),
      xp: { total: xpT, gasto: xpG, disponivel: xpT - xpG },
      cla: C.CLAS[o.cla] || null, predador: C.PREDADORES[o.predador] || null,
    };
  }

  /* ---------------------------------------------------------------
     TRILHAS: dano, conversão, Debilitação, cura (p. 126–127)
     --------------------------------------------------------------- */

  /* Marca dano numa trilha. `superficial` já vem dividido (ou não, se a
     regra manda). Cada ponto além dos espaços livres converte um
     Superficial em Agravado; sem Superficial a converter, transborda. */
  function marcarNaTrilha(t, max, sup, agr) {
    var transbordou = 0, convertidos = 0;
    for (var a = 0; a < agr; a++) {
      if (t.superficial + t.agravado < max) t.agravado++;
      else if (t.superficial > 0) { t.superficial--; t.agravado++; convertidos++; }
      else transbordou++;
    }
    for (var s = 0; s < sup; s++) {
      if (t.superficial + t.agravado < max) t.superficial++;
      else if (t.superficial > 0) { t.superficial--; t.agravado++; convertidos++; }
      else transbordou++;
    }
    return { transbordou: transbordou, convertidos: convertidos };
  }

  /* Aplica dano. `o.trilha`: "vitalidade" | "forcaDeVontade".
     `tipo`: "superficial" | "agravado". `naoDividir`: gasto voluntário,
     rolagem única, Armas Ferais etc. `fonte`: "fisico" | "fogo" | "sol" |
     "social" | "gasto" — para Pele de Mármore, Tenacidade e Desafio. */
  function sofrerDano(o, pedido) {
    var p = pedido || {};
    var qual = p.trilha === "forcaDeVontade" ? "forcaDeVontade" : "vitalidade";
    var tipo = p.tipo === "agravado" ? "agravado" : "superficial";
    var valor = inteiro(p.valor, 0, 50, 0);
    var eventos = [];
    if (!valor) return { ok: true, eventos: [], aplicado: { superficial: 0, agravado: 0 } };
    if (o.estado.morteFinal) return falha("A personagem já sofreu a Morte Final.");
    var fisico = qual === "vitalidade" && p.fonte !== "gasto";
    /* Pele de Mármore: ignora a primeira fonte de dano físico do turno. */
    if (fisico && p.fonte !== "sol" && temEfeito(o, "peleDeMarmore") && !p.critico) {
      var marca = "marmore-" + o.tempo.turno;
      if (!o.marcas.cena[marca]) {
        o.marcas.cena[marca] = true;
        eventos.push(evento("danoIgnorado", { motivo: "Pele de Mármore", valor: valor }));
        return { ok: true, eventos: eventos, aplicado: { superficial: 0, agravado: 0 } };
      }
    }
    /* Sangue-ralo e mortais: armas cortantes/perfurantes e fogo causam
       Agravado (p. 111, 126) — quem chama diz o tipo pela arma; aqui
       só a Resiliência Vampírica reverte para o tratamento vampírico. */
    var sup = tipo === "superficial" ? valor : 0;
    var agr = tipo === "agravado" ? valor : 0;
    /* Desafio à Perdição: converte Agravado em Superficial (limite por cena). */
    if (fisico && agr && temEfeito(o, "desafioAPerdicao")) {
      var ef = o.efeitos.filter(function (e) { return e.chave === "desafioAPerdicao"; })[0];
      var resta = inteiro(ef.dados.restante, 0, 10, 0);
      var conv = Math.min(resta, agr);
      if (conv) { agr -= conv; sup += conv; ef.dados.restante = resta - conv; eventos.push(evento("danoConvertido", { motivo: "Desafio à Perdição", valor: conv })); }
    }
    /* Tenacidade: subtrai Fortitude do Superficial ANTES de dividir (mínimo 1). */
    if (fisico && sup && temEfeito(o, "tenacidade")) {
      var red = valorDeDisciplina(o, "fortitude");
      var antes = sup;
      sup = Math.max(1, sup - red);
      if (sup !== antes) eventos.push(evento("danoReduzido", { motivo: "Tenacidade", de: antes, para: sup }));
    }
    if (sup && !p.naoDividir && p.fonte !== "gasto") {
      var dividido = Math.ceil(sup / 2);
      if (dividido !== sup) eventos.push(evento("danoDividido", { de: sup, para: dividido }));
      sup = dividido;
    }
    /* Ferimento maciço: +1 a todo dano sofrido. */
    if (fisico && o.estado.ferimentos.some(function (f) { return f.chave === "ferimentoMacico"; })) { if (agr) agr += 1; else sup += 1; }
    var max = qual === "vitalidade" ? vitalidadeMaxima(o) : fdvMaxima(o);
    var antesT = trilha(max, o[qual]);
    var m = marcarNaTrilha(o[qual], max, sup, agr);
    var depois = trilha(max, o[qual]);
    eventos.push(evento("dano", { trilha: qual, superficial: sup, agravado: agr, convertidos: m.convertidos, fonte: p.fonte || "" }));
    if (!antesT.debilitado && depois.debilitado) eventos.push(evento("debilitado", { trilha: qual }));
    if (depois.toda && !antesT.toda) eventos = eventos.concat(fimDaTrilha(o, qual, p).eventos);
    else if (depois.toda && (p.fonte === "fogo" || p.fonte === "sol") && qual === "vitalidade" && o.estado.torpor && ehVampiro(o)) {
      /* Em Torpor com a Vitalidade toda Agravada, mais fogo ou sol: fim. */
      eventos = eventos.concat(morteFinal(o, p.fonte === "sol" ? "Luz do sol em Torpor" : "Fogo em Torpor").eventos);
    }
    return { ok: true, eventos: eventos, aplicado: { superficial: sup, agravado: agr } };
  }

  /* A trilha inteira preenchida de Agravado (p. 127). */
  function fimDaTrilha(o, qual, p) {
    var eventos = [];
    if (qual === "forcaDeVontade") {
      eventos.push(evento("colapsoMental", {}));
      return { eventos: eventos };
    }
    if (!ehVampiro(o)) {
      eventos.push(evento("mortal", { estado: "morte ou coma (Narrador)" }));
      return { eventos: eventos };
    }
    if (p && (p.fonte === "fogo" || p.fonte === "sol" || p.decapitacao)) {
      return morteFinal(o, p.decapitacao ? "Decapitação" : (p.fonte === "sol" ? "Luz do sol" : "Fogo"));
    }
    return entrarEmTorpor(o, "dano");
  }

  /* Gasto voluntário (Força de Vontade para rerrolar etc., p. 126): o
     Superficial não é dividido; com todos os espaços já Superficiais,
     vira Agravado. */
  function gastarForcaDeVontade(o, n, motivo) {
    var r = sofrerDano(o, { trilha: "forcaDeVontade", tipo: "superficial", valor: inteiro(n, 1, 10, 1), fonte: "gasto", naoDividir: true });
    r.eventos.unshift(evento("gastoDeFdV", { valor: inteiro(n, 1, 10, 1), motivo: motivo || "" }));
    return r;
  }

  function curarTrilha(o, qual, tipo, valor) {
    var t = o[qual], n = inteiro(valor, 0, 50, 0);
    var feito = Math.min(n, tipo === "agravado" ? t.agravado : t.superficial);
    if (tipo === "agravado") t.agravado -= feito; else t.superficial -= feito;
    return feito;
  }

  /* As penalidades de dano numa parada (p. 126): Vitalidade Debilitada
     → físicas; Força de Vontade Debilitada → sociais e mentais. */
  function penalidadesDeTrilha(o, categorias) {
    var out = [];
    var vit = trilha(vitalidadeMaxima(o), o.vitalidade);
    var fdv = trilha(fdvMaxima(o), o.forcaDeVontade);
    var ignora = temEfeito(o, "poderVindoDaDor") || !!o.estado.frenesi || temEfeito(o, "ignorarDor");
    if (vit.debilitado && !ignora && categorias.indexOf("fisico") >= 0) out.push({ fonte: "Vitalidade Debilitada", valor: -2 });
    if (fdv.debilitado && (categorias.indexOf("social") >= 0 || categorias.indexOf("mental") >= 0)) out.push({ fonte: "Força de Vontade Debilitada", valor: -2 });
    return out;
  }

  /* ---------------------------------------------------------------
     FOME E CHECAGENS DE SANGUE (p. 205, 211, 217–219)
     --------------------------------------------------------------- */

  function aumentarFome(o, n, motivo) {
    var antes = o.fome;
    o.fome = Math.min(5, o.fome + inteiro(n, 0, 5, 1));
    var eventos = [evento("fome", { de: antes, para: o.fome, motivo: motivo || "" })];
    if (o.fome >= 5) eventos = eventos.concat(expirarPor(o, "fome5"));
    return eventos;
  }

  /* Uma Checagem de Sangue. `o2`:
       motivo     texto (o que motivou)
       nivelDoPoder  para a rerrolagem da Potência
       forcada    a regra obriga (despertar, cura do Agravado, poder já
                  em curso): com Fome 5, a falha não é recusada
       contexto   "despertar" | "cura" | "torpor" | "poder" | …
     Uma falha aumenta a Fome; o efeito que motivou NÃO é cancelado. */
  function checagemDeSangue(o, o2, rolador) {
    var x = o2 || {};
    if (!ehVampiro(o)) {
      /* Carniçal: usar poderes acima do nível 1 custa 1 Agravado (p. 234);
         criaturas de horror: 1 Superficial (quem chama decide). */
      return falha("Só vampiros fazem Checagens de Sangue.");
    }
    if (o.fome >= 5 && !x.forcada) return falha("Com Fome 5 não se Inflama o Sangue por vontade (p. 211).", { fome5: true });
    var pot = C.potencia(potencia(o));
    var dois = !!x.doisDados || (x.nivelDoPoder !== undefined && x.nivelDoPoder !== null && inteiro(x.nivelDoPoder, 0, 10) <= pot.rerrolagem && pot.rerrolagem > 0);
    var c = D.checagem(rolador, { dados: dois ? 2 : 1 });
    var eventos = [evento("checagem", { faces: c.faces, sucesso: c.sucesso, motivo: x.motivo || "", dois: dois })];
    var consequencia = "";
    if (!c.sucesso) {
      if (o.fome >= 5) {
        if (x.contexto === "despertar" || x.contexto === "cura" || x.contexto === "torpor") {
          eventos = eventos.concat(entrarEmTorpor(o, x.contexto === "cura" ? "cura" : "fome").eventos);
          consequencia = "torpor";
        } else {
          eventos.push(evento("frenesiPendente", { frenesi: "fome", dificuldade: 4, motivo: "Falha numa Checagem com Fome 5" }));
          consequencia = "frenesi";
        }
      } else {
        eventos = eventos.concat(aumentarFome(o, 1, x.motivo));
      }
    }
    return { ok: true, sucesso: c.sucesso, faces: c.faces, consequencia: consequencia, eventos: eventos };
  }

  /* Várias Checagens de uma vez, cada uma resolvida (p. 219). */
  function checagens(o, n, o2, rolador) {
    var total = inteiro(n, 0, 20, 1), eventos = [], resultados = [];
    for (var i = 0; i < total; i++) {
      var r = checagemDeSangue(o, Object.assign({}, o2, { forcada: (o2 && o2.forcada) || i > 0 }), rolador);
      if (!r.ok) { if (!i) return r; break; }
      resultados.push(r);
      eventos = eventos.concat(r.eventos);
      if (r.consequencia === "torpor") break;
    }
    return { ok: true, resultados: resultados, falhas: resultados.filter(function (r) { return !r.sucesso; }).length, eventos: eventos };
  }

  /* Rubor de Vida (p. 218, Humanidade p. 236–238). */
  function ruborDeVida(o, rolador) {
    if (temEfeito(o, "ruborDeVida")) return falha("O Rubor de Vida já está ativo nesta noite.");
    var hum = humanidade(o);
    if (temDefeitoRalo(o, "carneMorta")) return falha("Carne Morta: sem Rubor de Vida.");
    var gratis = hum >= 10 || (o.ressonancia && o.ressonancia.discrasia === "entusiasmoPelaVida") || temQualidadeRalo(o, "semblanteDeVida") || ehSangueRalo(o);
    var eventos = [];
    if (!gratis) {
      var r = checagemDeSangue(o, { motivo: "Rubor de Vida", doisDados: hum === 8, contexto: "rubor" }, rolador);
      if (!r.ok) return r;
      eventos = eventos.concat(r.eventos);
    }
    eventos.push(evento("efeito", { chave: "ruborDeVida" }));
    adicionarEfeito(o, { chave: "ruborDeVida", nome: "Rubor de Vida", origem: { tipo: "sangue", chave: "rubor" }, duracao: "noite" });
    return { ok: true, eventos: eventos };
  }

  /* Recuperar Superficial à Vitalidade: 1 Checagem → a quantidade da
     tabela (p. 218). Fragilidade Mortal impede. */
  function curarSuperficial(o, rolador) {
    if (!ehVampiro(o)) return falha("Mortais e carniçais curam pelo tempo (p. 127).");
    if (temDefeitoRalo(o, "fragilidadeMortal")) return falha("Fragilidade Mortal: cura como mortal.");
    if (!o.vitalidade.superficial) return falha("Não há dano Superficial à Vitalidade.");
    var marca = "curaSup-" + o.tempo.turno;
    if (o.marcas.cena[marca]) return falha("Uma Checagem de cura por turno.");
    var r = checagemDeSangue(o, { motivo: "Recuperar dano Superficial", contexto: "curaSuperficial" }, rolador);
    if (!r.ok) return r;
    o.marcas.cena[marca] = true;
    var n = curarTrilha(o, "vitalidade", "superficial", C.potencia(potencia(o)).recupera);
    r.eventos.push(evento("cura", { trilha: "vitalidade", dano: "superficial", valor: n }));
    return { ok: true, eventos: r.eventos };
  }

  /* Agravado à Vitalidade: na noite seguinte ao dano, 3 Checagens além
     da do despertar removem 1 Agravado (ou um Ferimento Incapacitante);
     1 por noite; se a Fome passaria de 5, Torpor (p. 218–219). */
  function curarAgravado(o, rolador, opcoes) {
    if (!ehVampiro(o)) return falha("Mortais tratam o Agravado com Medicina (p. 127).");
    if (temDefeitoRalo(o, "fragilidadeMortal")) return falha("Fragilidade Mortal: cura como mortal.");
    if (o.marcas.noite.curaAgravado) return falha("Só 1 Agravado à Vitalidade por noite.");
    var alvo = opcoes && opcoes.ferimento ? "ferimento" : "agravado";
    if (alvo === "agravado" && !o.vitalidade.agravado) return falha("Não há dano Agravado à Vitalidade.");
    if (alvo === "ferimento" && !o.estado.ferimentos.length) return falha("Não há Ferimento Incapacitante.");
    if (o.fome >= 5) return falha("Com Fome 5 não se Inflama o Sangue por vontade.");
    var r = checagens(o, 3, { motivo: "Curar dano Agravado", contexto: "cura", forcada: false }, rolador);
    if (!r.ok) return r;
    var eventos = r.eventos;
    if (o.estado.torpor) return { ok: true, eventos: eventos, torpor: true };
    o.marcas.noite.curaAgravado = true;
    if (alvo === "ferimento") {
      var f = opcoes.ferimento ? o.estado.ferimentos.filter(function (x) { return x.id === opcoes.ferimento; })[0] : o.estado.ferimentos[0];
      o.estado.ferimentos = o.estado.ferimentos.filter(function (x) { return x !== f; });
      eventos.push(evento("cura", { ferimento: f ? f.chave : "" }));
    } else {
      curarTrilha(o, "vitalidade", "agravado", 1);
      eventos.push(evento("cura", { trilha: "vitalidade", dano: "agravado", valor: 1 }));
    }
    return { ok: true, eventos: eventos };
  }

  /* Mortais (e carniçais, que curam o dobro, exceto fogo): Superficial
     igual ao Vigor por dia; Medicina converte Agravado. */
  function curarComoMortal(o, dias) {
    var vig = valorDeAtributo(o, "vigor");
    var fator = o.natureza === "carnical" ? 2 : 1;
    var n = curarTrilha(o, "vitalidade", "superficial", vig * fator * inteiro(dias, 1, 365, 1));
    return { ok: true, eventos: [evento("cura", { trilha: "vitalidade", dano: "superficial", valor: n, mortal: true })] };
  }
  function tratarComMedicina(o, sucessosExcedentes, medicina) {
    var max = Math.ceil(inteiro(medicina, 0, 10) / 2);
    var n = Math.min(max, inteiro(sucessosExcedentes, 0, 20));
    var conv = Math.min(n, o.vitalidade.agravado);
    o.vitalidade.agravado -= conv;
    o.vitalidade.superficial += conv;
    return { ok: true, eventos: [evento("tratamento", { convertidos: conv })] };
  }

  /* ---------------------------------------------------------------
     A PARADA — o que entra e de onde vem (p. 118–120, 205, 217–218)
     --------------------------------------------------------------- */

  function categoriaDe(atributo) { var a = C.atributo(atributo); return a ? a.categoria : ""; }

  /* `pedido`:
       atributo, habilidade | disciplina | atributo2
       especializacao  id da especialização escolhida (uma)
       contexto        ["percepcao", "combate", "humanos", "resistirCoercao", …]
       modificadores   [{ fonte, valor }] da mesa (±dados)
       opcionais       chaves de modificadores opcionais aceitos
       surto           Surto de Sangue (a Checagem é cobrada por rolarTeste)
       resistirDisciplina  rolagem de resistência a um poder
       poder           chave do poder usado (bônus de Potência)
       tipo            "teste" | "trilha" | "rolagemUnica" */
  function montarParada(o, pedido) {
    var p = pedido || {};
    var conc = concessoes(o);
    var comp = [];
    var cats = [];
    var ctx = lista(p.contexto);
    if (p.atributo) {
      comp.push({ fonte: (C.atributo(p.atributo) || {}).nome || p.atributo, valor: valorDeAtributo(o, p.atributo), tipo: "atributo" });
      cats.push(categoriaDe(p.atributo));
    }
    if (p.atributo2) {
      comp.push({ fonte: (C.atributo(p.atributo2) || {}).nome || p.atributo2, valor: valorDeAtributo(o, p.atributo2), tipo: "atributo" });
      cats.push(categoriaDe(p.atributo2));
    }
    if (p.habilidade) comp.push({ fonte: (C.habilidade(p.habilidade) || {}).nome || p.habilidade, valor: valorDeHabilidade(o, p.habilidade, conc), tipo: "habilidade" });
    if (p.disciplina) comp.push({ fonte: (DS().DISCIPLINAS[p.disciplina] || {}).nome || p.disciplina, valor: valorDeDisciplina(o, p.disciplina, conc), tipo: "disciplina" });
    if (p.valorFixo !== undefined) comp.push({ fonte: p.rotuloFixo || "Trilha", valor: inteiro(p.valorFixo, 0, 30), tipo: "trilha" });

    var opcionais = [];
    if (p.tipo !== "trilha") {
      /* Especialização: +1 dado, uma só (p. 159). */
      if (p.especializacao && p.habilidade) {
        var esp = especializacoesDaFicha(o, conc).filter(function (e) { return e.id === p.especializacao && e.habilidade === p.habilidade; })[0];
        if (esp) comp.push({ fonte: "Especialização: " + esp.nome, valor: 1, tipo: "especializacao" });
      }
      /* Penalidades de trilha. */
      penalidadesDeTrilha(o, cats).forEach(function (x) { comp.push(Object.assign({ tipo: "penalidade" }, x)); });
      if (o.estado.degeneracao) comp.push({ fonte: "Degeneração", valor: -2, tipo: "penalidade" });
      /* Humanidade baixa: interagir com humanos (p. 238). */
      if (ctx.indexOf("humanos") >= 0) {
        var ht = C.HUMANIDADE[humanidade(o, conc)];
        var pen = temEfeito(o, "ruborDeVida") && ht.comRubor ? ht.comRubor : ht.penalidade;
        if (pen) comp.push({ fonte: "Humanidade " + humanidade(o, conc), valor: -pen, tipo: "penalidade" });
      }
      /* Compulsão (p. 208–211). */
      penalidadeDeCompulsao(o, p, cats).forEach(function (x) { comp.push(x); });
      /* Ferimentos, drogas, aspectos: efeitos com penalidades. */
      penalidadesDeEfeitos(o, p, cats).forEach(function (x) { comp.push(x); });
      /* Perdições automáticas. */
      perdicaoNaParada(o, p, cats).forEach(function (x) { comp.push(x); });
      /* Poderes (passivos e ativos), sem acumular o mesmo grupo. */
      modsDePoderes(o, p, cats).forEach(function (x) { comp.push(x); });
      /* Bônus de Potência do Sangue: usar ou resistir a Disciplinas. */
      if ((p.disciplina || p.resistirDisciplina) && ehVampiro(o)) {
        var bp = C.potencia(potencia(o, conc)).bonusPoder;
        if (bp) comp.push({ fonte: "Potência do Sangue", valor: bp, tipo: "potencia" });
      }
      /* Ressonância intensa/aguda: +1 na Disciplina correspondente. */
      if (p.disciplina && o.ressonancia && o.ressonancia.temperamento !== "efemero") {
        var res = C.RESSONANCIAS[o.ressonancia.tipo];
        if (res && res.disciplinas.indexOf(p.disciplina) >= 0) comp.push({ fonte: "Ressonância " + res.nome, valor: 1, tipo: "ressonancia" });
      }
      /* Vantagens e Discrasias com condição: opcionais. */
      opcionais = modificadoresOpcionais(o, p, cats);
      opcionais.forEach(function (x) { if (lista(p.opcionais).indexOf(x.chave) >= 0) comp.push(x); });
      /* Surto de Sangue: atributo, uma vez por rolagem; nunca trilha nem
         rolagem única (p. 218). */
      if (p.surto && p.tipo !== "rolagemUnica" && p.atributo && ehVampiro(o)) {
        comp.push({ fonte: "Surto de Sangue", valor: C.potencia(potencia(o, conc)).surto, tipo: "surto" });
      }
    }
    lista(p.modificadores).forEach(function (m) { comp.push({ fonte: texto(m.fonte, 60) || "Modificador", valor: inteiro(m.valor, -10, 10), tipo: "mesa" }); });
    var total = comp.reduce(function (s, x) { return s + x.valor; }, 0);
    return { total: Math.max(1, total), bruto: total, composicao: comp, opcionais: opcionais, categorias: cats };
  }

  function penalidadeDeCompulsao(o, p, cats) {
    var c = o.estado.compulsao;
    if (!c) return [];
    var ctx = lista(p.contexto);
    if (ctx.indexOf("compulsao") >= 0) return [];
    var def = c.cla ? (C.CLAS[o.cla] || {}).compulsao : C.COMPULSOES[c.chave];
    if (!def) return [];
    var pen = c.penalidade;
    if (Array.isArray(def.alvo)) {
      var acerta = def.alvo.some(function (a) { return a === p.atributo || a === p.atributo2 || (a === "frenesiDeTerror" && ctx.indexOf("frenesiDeTerror") >= 0); });
      if (!acerta) return [];
    }
    return [{ fonte: "Compulsão: " + def.nome, valor: -pen, tipo: "penalidade" }];
  }

  function penalidadesDeEfeitos(o, p, cats) {
    var out = [];
    o.efeitos.forEach(function (e) {
      var pen = objeto(e.dados.penalidades);
      Object.keys(pen).forEach(function (k) {
        var acerta = k === "todas" || k === p.atributo || k === p.atributo2 || cats.indexOf(k) >= 0 || (k === "disciplinas" && p.disciplina);
        if (acerta) out.push({ fonte: e.nome || e.chave, valor: -inteiro(pen[k], 0, 10), tipo: "penalidade" });
      });
    });
    o.estado.ferimentos.forEach(function (f) {
      var def = C.FERIMENTOS.filter(function (x) { return x.chave === f.chave; })[0];
      var pen = objeto(def && def.penalidades);
      Object.keys(pen).forEach(function (k) {
        if (k === "todas" || cats.indexOf(k) >= 0) out.push({ fonte: def.nome, valor: -pen[k], tipo: "penalidade" });
      });
    });
    return out;
  }

  function perdicaoNaParada(o, p, cats) {
    var out = [];
    var g = gravidadeDaPerdicao(o);
    if (!g) return out;
    var ctx = lista(p.contexto);
    if (o.cla === "brujah" && ctx.indexOf("frenesiDeFuria") >= 0) out.push({ fonte: "Perdição Brujah", valor: -g, tipo: "perdicao" });
    if (o.cla === "toreador" && p.disciplina && o.estado.ambienteFeio) out.push({ fonte: "Perdição Toreador (ambiente)", valor: -g, tipo: "perdicao" });
    if (o.cla === "nosferatu" && ctx.indexOf("disfarce") >= 0) out.push({ fonte: "Perdição Nosferatu", valor: -g, tipo: "perdicao" });
    if (o.cla === "malkaviano" && temEfeito(o, "perdicaoMalkaviana") && cats.indexOf(o.perdicaoParametro) >= 0) out.push({ fonte: "Perdição Malkaviana", valor: -g, tipo: "perdicao" });
    return out;
  }

  /* Modificadores dos poderes: os passivos que a ficha tem e os ativos
     que estão em curso. O mesmo grupo (Presença) entra uma vez. */
  function modsDePoderes(o, p, cats) {
    var out = [], grupos = {}, ctx = lista(p.contexto);
    var ativos = {};
    o.efeitos.forEach(function (e) { if (e.origem.tipo === "poder") ativos[e.origem.chave] = e; });
    poderesDaFicha(o).forEach(function (pp) {
      var def = DS().poder(pp.chave);
      if (!def || !def.efeitos || !def.efeitos.mods) return;
      var passivo = def.duracao === "passiva";
      if (!passivo && !ativos[pp.chave]) return;
      var nivel = valorDeDisciplina(o, def.disciplina);
      def.efeitos.mods.forEach(function (m) {
        var acerta = (m.atributo && (m.atributo === p.atributo || m.atributo === p.atributo2)) ||
          (m.habilidade && m.habilidade === p.habilidade && (!m.contexto || ctx.indexOf(m.contexto) >= 0)) ||
          (!m.atributo && !m.habilidade && m.contexto && ctx.indexOf(m.contexto) >= 0);
        if (!acerta) return;
        if (m.foraDeCombate && ctx.indexOf("combate") >= 0) return;
        var v = m.valor === "nivel" ? nivel : inteiro(m.valor, -10, 10);
        if (m.grupo) { if (grupos[m.grupo] !== undefined) { if (v > grupos[m.grupo].valor) grupos[m.grupo].valor = v; return; } }
        var item = { fonte: def.nome, valor: v, tipo: "poder", poder: def.chave };
        if (m.grupo) grupos[m.grupo] = item;
        out.push(item);
      });
    });
    return out;
  }

  /* Modificadores que dependem de uma circunstância que só a mesa sabe:
     a tela mostra, quem rola marca. */
  function modificadoresOpcionais(o, p, cats) {
    var out = [];
    var social = cats.indexOf("social") >= 0;
    vantagensDaFicha(o).forEach(function (v) {
      var def = C.VANTAGENS[v.chave];
      var ef = def && def.efeito;
      if (!ef) return;
      if (ef.social && social) out.push({ chave: "vant-" + v.chave, fonte: def.nome, valor: ef.social, tipo: "vantagem", condicao: ef.condicao || "parada Social relevante" });
      if (ef.abstinencia) out.push({ chave: "vant-" + v.chave, fonte: def.nome, valor: ef.abstinencia, tipo: "vantagem", condicao: "a última vítima não estava sob efeito" });
      if (ef.sobEfeito) out.push({ chave: "vant-" + v.chave, fonte: def.nome, valor: ef.sobEfeito, tipo: "vantagem", condicao: "a última vítima estava sob efeito" });
    });
    if (o.ressonancia && o.ressonancia.discrasia) {
      var dis = C.DISCRASIAS[o.ressonancia.discrasia];
      if (dis && dis.efeito.dados) out.push({ chave: "dis-" + o.ressonancia.discrasia, fonte: "Discrasia: " + dis.nome, valor: dis.efeito.dados, tipo: "discrasia", condicao: dis.efeito.condicao || "" });
    }
    if (lista(p.contexto).indexOf("humanos") >= 0 && temDefeitoRalo(o, "carneMorta")) out.push({ chave: "ralo-carneMorta", fonte: "Carne Morta", valor: -1, tipo: "vantagem", condicao: "face a face com mortais" });
    return out;
  }

  /* ---------------------------------------------------------------
     TESTES — do pedido ao resultado pendente, e a conclusão
     --------------------------------------------------------------- */

  /* Rola um teste da ficha. Cobra a Checagem do Surto antes (ela é
     voluntária: recusada com Fome 5). Devolve o resultado PENDENTE. */
  function rolarTeste(o, pedido, rolador) {
    var p = pedido || {};
    var eventos = [];
    var podeAgir = podeAgirAgora(o, p);
    if (!podeAgir.ok) return podeAgir;
    if (p.surto) {
      if (!ehVampiro(o)) return falha("Só vampiros usam o Surto de Sangue.");
      if (p.tipo === "trilha" || p.tipo === "rolagemUnica") return falha("O Surto não vale em testes de trilha nem em conflito de rolagem única.");
      if (temEfeito(o, "subjugado")) return falha("Subjugar a Besta impede o Surto de Sangue.");
      var ch = checagemDeSangue(o, { motivo: "Surto de Sangue", contexto: "surto" }, rolador);
      if (!ch.ok) return ch;
      eventos = eventos.concat(ch.eventos);
    }
    var par = montarParada(o, p);
    var tipo = p.tipo === "trilha" ? "trilha" : p.tipo === "rolagemUnica" ? "rolagemUnica" : "teste";
    var semFome = tipo !== "teste" || !ehVampiro(o) || !!p.semFome;
    var r = D.rolar({ parada: par.total, fome: o.fome, semFome: semFome, tipo: tipo, dificuldade: p.dificuldade, oposicao: p.oposicao, composicao: par.composicao, rotulo: p.rotulo || "", surto: !!p.surto, id: p.id || novoId("ro"), custos: eventos.filter(function (e) { return e.tipo === "checagem"; }).map(function (e) { return { tipo: "checagem", sucesso: e.sucesso }; }) }, rolador);
    r.pedido = { atributo: p.atributo || "", habilidade: p.habilidade || "", disciplina: p.disciplina || "", atributo2: p.atributo2 || "", poder: p.poder || "", contexto: lista(p.contexto) };
    return { ok: true, resultado: r, eventos: eventos };
  }

  function podeAgirAgora(o, p) {
    if (o.estado.morteFinal) return falha("Morte Final: a ficha fica para consulta.");
    if (o.estado.torpor && !lista(p.contexto).some(function (c) { return c === "torpor"; })) return falha("Em Torpor não se age.");
    if (o.estado.estacado && p.disciplina && (DS().DISCIPLINAS[p.disciplina] || {}).tipo !== "mental") return falha("Estacado: só Disciplinas mentais (sem dar ordens).");
    if (o.estado.frenesi && p.disciplina && (DS().DISCIPLINAS[p.disciplina] || {}).tipo !== "fisica") return falha("Em frenesi, só Disciplinas físicas (Celeridade, Fortitude, Potência).");
    return { ok: true };
  }

  /* Gasta 1 FdV e rerrola até 3 dados comuns (p. 122, 158). O custo é
     Superficial SEM dividir. Só dentro da janela pendente. */
  function rerrolarComFdV(o, resultado, indices, rolador) {
    var pode = D.podeRerrolar(resultado);
    if (!pode.ok) return falha(pode.motivo);
    if (o.estado.frenesi) return falha("Em frenesi, a Força de Vontade não rerrola (p. 220).");
    var lista2 = (Array.isArray(indices) ? indices : []).filter(function (i) { return resultado.dados[i] && !resultado.dados[i].fome; });
    if (!lista2.length || lista2.length !== (indices || []).length) return falha("Escolha até três dados comuns.");
    var gasto = gastarForcaDeVontade(o, 1, "Rerrolar dados");
    var r = D.rerrolar(resultado, indices, rolador);
    if (!r.ok) return falha(r.motivo);
    resultado.custos.push({ tipo: "forcaDeVontade", valor: 1 });
    return { ok: true, eventos: gasto.eventos.concat([evento("rerrolagem", { indices: lista2, sucessos: resultado.classificacao.sucessos })]) };
  }

  /* Fecha o teste: daqui em diante a classificação vale. Um crítico
     bestial ou falha bestial vira PENDÊNCIA de consequência (escolha da
     mesa); a Perdição Malkaviana entra; a Compulsão Tremere encerra numa
     vitória crítica de Habilidade. */
  function concluirTeste(o, resultado, opcoes) {
    if (!resultado.classificacao.julgado && !(opcoes && opcoes.semJulgamento)) return falha("Falta a Dificuldade ou a oposição para julgar o teste.");
    var c = D.concluir(resultado, opcoes);
    if (!c.ok) return falha(c.motivo);
    if (c.repetida) return { ok: true, eventos: [] };
    var eventos = [], cl = resultado.classificacao;
    if (cl.criticoBestial && !temEfeito(o, "subjugado")) eventos.push(evento("criticoBestial", { opcoes: ["compulsao", "maculas", "mascara", "vantagem"] }));
    if (cl.falhaBestial) {
      eventos.push(evento("falhaBestial", { opcoes: ["compulsao", "vantagem", "dano", "fome"] }));
      if (o.cla === "malkaviano" && o.perdicaoParametro) {
        adicionarEfeito(o, { chave: "perdicaoMalkaviana", nome: "Perdição Malkaviana", origem: { tipo: "perdicao", chave: "malkaviano" }, duracao: "cena" });
        eventos.push(evento("perdicao", { cla: "malkaviano" }));
      }
    }
    if (o.estado.compulsao && o.estado.compulsao.cla && o.cla === "tremere" && cl.vitoriaCritica && resultado.pedido && resultado.pedido.habilidade) {
      eventos = eventos.concat(encerrarCompulsao(o, "Vitória crítica (Perfeccionismo)").eventos);
    }
    if (cl.vitoria === false && o.efeitos.some(function (e) { return e.chave === "arrebatamento"; })) {
      eventos.push(evento("discrasia", { chave: "arrebatamento", texto: "Falhou: −2 em todos os testes agora." }));
    }
    registrarNoHistorico(o, evento("teste", { rotulo: resultado.rotulo, sucessos: cl.sucessos, vitoria: cl.vitoria, critica: cl.vitoriaCritica, bestial: cl.criticoBestial ? "critico" : cl.falhaBestial ? "falha" : "" }));
    return { ok: true, eventos: eventos };
  }

  /* A consequência ESCOLHIDA de um resultado bestial (p. 207). Uma só,
     nunca todas ao mesmo tempo. */
  function consequenciaBestial(o, escolha, rolador) {
    var e = escolha || {};
    var eventos = [];
    switch (e.tipo) {
      case "compulsao": return iniciarCompulsao(o, e.compulsao, rolador);
      case "maculas": return adicionarMaculas(o, inteiro(e.valor, 1, 5, 1), "Crítico bestial");
      case "mascara": eventos.push(evento("quebraDaMascara", { nota: texto(e.nota, 200) })); break;
      case "vantagem": eventos.push(evento("perdaDeVantagem", { chave: texto(e.vantagem, 60), nota: texto(e.nota, 200) })); break;
      case "dano": return sofrerDano(o, { trilha: "vitalidade", tipo: "agravado", valor: inteiro(e.valor, 1, 5, 1), naoDividir: true });
      case "fome":
        if (o.fome >= 5) { eventos.push(evento("frenesiPendente", { frenesi: "fome", dificuldade: 4, motivo: "Falha bestial com Fome 5" })); break; }
        eventos = eventos.concat(aumentarFome(o, 1, "Falha bestial")); break;
      default: return falha("Consequência desconhecida.");
    }
    return { ok: true, eventos: eventos };
  }

  /* ---------------------------------------------------------------
     COMPULSÕES (p. 208–211) e FRENESI (p. 219–220)
     --------------------------------------------------------------- */

  function iniciarCompulsao(o, chave, rolador) {
    if (o.estado.frenesi) return falha("Em frenesi não se ganha Compulsão (p. 220).");
    var k = chave;
    var eventos = [];
    if (!k || k === "aleatoria") {
      var f = rolador(10);
      k = C.compulsaoDaTabela(f);
      eventos.push(evento("tabelaDeCompulsao", { face: f, resultado: k }));
      if (k === "cla" && !(C.CLAS[o.cla] && C.CLAS[o.cla].compulsao)) {
        var f2;
        do { f2 = rolador(10); } while (f2 === 10);
        k = C.compulsaoDaTabela(f2);
        eventos.push(evento("tabelaDeCompulsao", { face: f2, resultado: k, rerrolada: true }));
      }
    }
    var cla = k === "cla";
    var def = cla ? (C.CLAS[o.cla] || {}).compulsao : C.COMPULSOES[k];
    if (!def) return falha("Compulsão desconhecida.");
    o.estado.compulsao = { chave: cla ? def.chave : k, cla: cla, penalidade: def.penalidade, cena: o.tempo.cena, repeticoes: 0, nota: "" };
    eventos.push(evento("compulsao", { chave: o.estado.compulsao.chave, nome: def.nome, penalidade: def.penalidade, termina: def.termina }));
    if (o.cla === "malkaviano" && o.perdicaoParametro) {
      adicionarEfeito(o, { chave: "perdicaoMalkaviana", nome: "Perdição Malkaviana", origem: { tipo: "perdicao", chave: "malkaviano" }, duracao: "cena" });
    }
    return { ok: true, eventos: eventos };
  }

  function encerrarCompulsao(o, motivo) {
    if (!o.estado.compulsao) return { ok: true, eventos: [] };
    var c = o.estado.compulsao;
    o.estado.compulsao = null;
    return { ok: true, eventos: [evento("compulsaoEncerrada", { chave: c.chave, motivo: motivo || "cumprida" })] };
  }

  /* Perfeccionismo (Tremere): repetir a ação reduz a penalidade. */
  function repetirAcaoPerfeccionismo(o) {
    var c = o.estado.compulsao;
    if (!c || !c.cla || o.cla !== "tremere") return falha("Sem Perfeccionismo ativo.");
    c.repeticoes++;
    if (c.repeticoes >= 2) return encerrarCompulsao(o, "Segunda repetição");
    c.penalidade = 1;
    return { ok: true, eventos: [evento("compulsao", { chave: c.chave, penalidade: 1 })] };
  }

  /* A parada de resistência ao frenesi: Força de Vontade atual + 1/3 da
     Humanidade (arred. para baixo), sem dados de Fome (p. 219). */
  function paradaDeFrenesi(o, tipo) {
    var fdv = trilha(fdvMaxima(o), o.forcaDeVontade).atual;
    var hum = humanidade(o);
    var comp = [{ fonte: "Força de Vontade atual", valor: fdv }, { fonte: "Humanidade (1/3)", valor: Math.floor(hum / 3) }];
    if (o.cla === "brujah" && tipo === "furia") comp.push({ fonte: "Perdição Brujah", valor: -gravidadeDaPerdicao(o) });
    if (o.ressonancia && o.ressonancia.discrasia === "indiferente") comp.push({ fonte: "Discrasia Indiferente", valor: 2 });
    var total = comp.reduce(function (s, x) { return s + x.valor; }, 0);
    return { total: Math.max(1, total), composicao: comp };
  }

  function frenesiPossivel(o) {
    if (!ehVampiro(o)) return false;
    if (ehSangueRalo(o) && !temDefeitoRalo(o, "temperamentoBestial")) return "sobrenatural";
    return true;
  }

  /* Testar o frenesi: { tipo, dificuldade, gatilho, sobrenatural }.
     `curtir`: Curtir a Onda — sucumbe sem teste (p. 220). */
  function testarFrenesi(o, pedido, rolador) {
    var p = pedido || {};
    if (!C.FRENESI[p.tipo]) return falha("Tipo de frenesi desconhecido.");
    var poss = frenesiPossivel(o);
    if (!poss) return falha("Só vampiros entram em frenesi.");
    if (poss === "sobrenatural" && !p.sobrenatural) return falha("Sangue-ralo só entra em frenesi por meios sobrenaturais (p. 113).");
    if (o.estado.frenesi) return falha("Já está em frenesi.");
    if (p.curtir) return entrarEmFrenesi(o, p.tipo, true);
    var par = paradaDeFrenesi(o, p.tipo);
    var dif = inteiro(p.dificuldade, 1, 10, 3);
    lista(o.efeitos).forEach(function (e) { if (e.dados.dificuldadeFrenesi) dif = Math.max(1, dif + inteiro(e.dados.dificuldadeFrenesi, -3, 3)); });
    var r = D.rolar({ parada: par.total, tipo: "trilha", dificuldade: dif, composicao: par.composicao, rotulo: "Resistir a frenesi de " + C.FRENESI[p.tipo].nome }, rolador);
    D.concluir(r);
    var cl = r.classificacao;
    var eventos = [evento("testeDeFrenesi", { frenesi: p.tipo, dificuldade: dif, sucessos: cl.sucessos, vitoria: cl.vitoria, critica: cl.vitoriaCritica })];
    if (cl.vitoria) {
      eventos.push(evento("frenesiResistido", { perdeTurno: !cl.vitoriaCritica }));
      return { ok: true, resultado: r, resistiu: true, eventos: eventos };
    }
    var e = entrarEmFrenesi(o, p.tipo, false);
    return { ok: true, resultado: r, resistiu: false, eventos: eventos.concat(e.eventos) };
  }

  function entrarEmFrenesi(o, tipo, curtindo) {
    o.estado.frenesi = { tipo: tipo, curtindo: !!curtindo, cena: o.tempo.cena };
    var eventos = [evento("frenesi", { frenesi: tipo, curtindo: !!curtindo })];
    /* Compulsão e frenesi são estados distintos: o frenesi suspende a
       Compulsão em curso (não pode ganhar outra), sem apagá-la. */
    return { ok: true, eventos: eventos };
  }

  /* Encerrar o frenesi. A Perdição Gangrel deixa aspectos animais
     (Gravidade; Curtindo a Onda pode ficar com um só) até uma noite
     depois (p. 73). `aspectos`: [{ atributo }] escolhidos. */
  function encerrarFrenesi(o, motivo, aspectos) {
    var f = o.estado.frenesi;
    if (!f) return { ok: true, eventos: [] };
    o.estado.frenesi = null;
    var eventos = [evento("frenesiEncerrado", { frenesi: f.tipo, motivo: motivo || "" })];
    if (o.cla === "gangrel") {
      var n = f.curtindo ? Math.min(1, gravidadeDaPerdicao(o)) : gravidadeDaPerdicao(o);
      var escolhidos = lista(aspectos).slice(0, n);
      var padrao = ["inteligencia", "manipulacao"];
      while (escolhidos.length < n) escolhidos.push({ atributo: padrao[escolhidos.length % 2] });
      var at = {};
      escolhidos.forEach(function (a) { if (C.atributo(a.atributo)) at[a.atributo] = (at[a.atributo] || 0) - 1; });
      if (n) {
        adicionarEfeito(o, { chave: "aspectosAnimais", nome: "Aspectos animais (Perdição Gangrel)", origem: { tipo: "perdicao", chave: "gangrel" }, duracao: "noiteSeguinte", dados: { atributos: at, aspectos: escolhidos.map(function (a) { return texto(a.nota || a.atributo, 80); }) } });
        eventos.push(evento("perdicao", { cla: "gangrel", aspectos: n }));
      }
    }
    return { ok: true, eventos: eventos };
  }

  /* Assumir o controle por um turno (FdV, p. 158): em frenesi ou sob
     coerção sobrenatural. */
  function assumirControle(o, motivo) {
    if (!o.estado.frenesi && !(motivo === "coercao")) return falha("Nada a resistir agora.");
    var r = gastarForcaDeVontade(o, 1, "Assumir o controle por um turno");
    r.eventos.push(evento("controleAssumido", { motivo: motivo || "frenesi" }));
    return r;
  }

  /* ---------------------------------------------------------------
     HUMANIDADE, MÁCULAS, REMORSO, PILARES (p. 236–241)
     --------------------------------------------------------------- */

  function adicionarMaculas(o, n, motivo, opcoes) {
    var hum = humanidade(o);
    var antes = o.maculas;
    var mitigadas = opcoes && opcoes.convicao ? inteiro(opcoes.mitigar, 1, 5, 1) : 0;
    var valor = Math.max(0, inteiro(n, 0, 10, 1) - mitigadas);
    var espaco = 10 - hum;
    var eventos = [];
    if (mitigadas) eventos.push(evento("maculaMitigada", { valor: mitigadas, motivo: "Convicção" }));
    if (!valor) return { ok: true, eventos: eventos };
    o.maculas = Math.min(10, antes + valor);
    eventos.push(evento("maculas", { de: antes, para: o.maculas, motivo: motivo || "" }));
    var excesso = Math.max(0, o.maculas - espaco) - Math.max(0, antes - espaco);
    if (excesso > 0) {
      /* Degeneração (p. 239): Debilitado e 1 Agravado à FdV por Mácula
         que não coube, até o Remorso do fim da sessão. */
      o.estado.degeneracao = true;
      eventos.push(evento("degeneracao", { excesso: excesso }));
      eventos = eventos.concat(sofrerDano(o, { trilha: "forcaDeVontade", tipo: "agravado", valor: excesso, naoDividir: true }).eventos);
    }
    return { ok: true, eventos: eventos };
  }

  /* Remorso no fim da sessão: dados = espaços vazios (mínimo 1), sem
     Fome. Sucesso mantém; nenhum sucesso perde 1. As Máculas somem. */
  function testarRemorso(o, rolador) {
    if (!o.maculas) return falha("Sem Máculas, sem teste de Remorso.");
    var hum = humanidade(o);
    var comp = [{ fonte: "Espaços vazios", valor: Math.max(0, 10 - hum - o.maculas) }];
    if (o.ressonancia && o.ressonancia.discrasia === "emLuto") comp.push({ fonte: "Discrasia Em Luto", valor: 1 });
    o.efeitos.forEach(function (e) { if (e.dados.remorso) comp.push({ fonte: e.nome, valor: inteiro(e.dados.remorso, -5, 5) }); });
    var total = Math.max(1, comp.reduce(function (s, x) { return s + x.valor; }, 0));
    var r = D.rolar({ parada: total, tipo: "trilha", dificuldade: 1, composicao: comp, rotulo: "Remorso" }, rolador);
    D.concluir(r);
    var eventos = [evento("remorso", { sucessos: r.classificacao.sucessos, dados: total })];
    o.maculas = 0;
    o.estado.degeneracao = false;
    if (!r.classificacao.vitoria) eventos = eventos.concat(mudarHumanidade(o, -1, "remorso", "Remorso sem sucesso").eventos);
    else eventos.push(evento("humanidadeMantida", {}));
    return { ok: true, resultado: r, eventos: eventos };
  }

  /* Encerrar a Degeneração antes: aceitar perder 1 Humanidade. */
  function aceitarDegeneracao(o) {
    if (!o.estado.degeneracao) return falha("Sem Degeneração.");
    o.estado.degeneracao = false;
    o.maculas = 0;
    var r = mudarHumanidade(o, -1, "degeneracao", "Aceitou a Degeneração");
    return r;
  }

  function mudarHumanidade(o, delta, origem, motivo) {
    var antes = humanidade(o);
    o.ajustes.push({ id: novoId("aj"), tipo: "humanidade", alvo: "", valor: inteiro(delta, -10, 10), origem: origem || "narrador", motivo: motivo || "", noite: o.tempo.noite });
    var depois = humanidade(o);
    var eventos = [evento("humanidade", { de: antes, para: depois, motivo: motivo || "" })];
    if (depois <= 0 && antes > 0 && ehVampiro(o)) {
      /* A última gota (p. 241): frenesi, Físicos 5 na cena, wassail,
         a personagem passa ao Narrador. A ficha fica. */
      o.estado.wassail = true;
      adicionarEfeito(o, { chave: "ultimaGota", nome: "A última gota", origem: { tipo: "humanidade", chave: "0" }, duracao: "cena", dados: { atributos: atributosParaCinco(o) } });
      eventos.push(evento("humanidadeZero", {}));
      if (!o.estado.frenesi) eventos = eventos.concat(entrarEmFrenesi(o, "furia", false).eventos);
    }
    return { ok: true, eventos: eventos };
  }
  function atributosParaCinco(o) {
    var out = {};
    ["forca", "destreza", "vigor"].forEach(function (k) { var v = valorDeAtributo(o, k); if (v < 5) out[k] = 5 - v; });
    return out;
  }

  /* Um Pilar sofre algo (p. 240): Máculas automáticas; destruído, a
     Convicção ligada se perde se não houver transferência. */
  function eventoDePilar(o, pilarId, chave, rolador, opcoes) {
    var pi = o.pilares.filter(function (x) { return x.id === pilarId; })[0];
    var def = C.MACULAS_DE_PILAR.filter(function (x) { return x.chave === chave; })[0];
    if (!pi || !def) return falha("Pilar ou evento desconhecido.");
    var eventos = [];
    pi.historico = lista(pi.historico).concat([{ evento: chave, noite: o.tempo.noite }]).slice(-20);
    if (chave.indexOf("Destruido") >= 0 || chave === "pilarDestruido") pi.estado = "destruido";
    else if (chave.indexOf("Ferido") >= 0) pi.estado = pi.estado === "destruido" ? "destruido" : "ferido";
    eventos = eventos.concat(adicionarMaculas(o, def.maculas, def.nome).eventos);
    if (pi.estado === "destruido") eventos.push(evento("pilarDestruido", { pilar: pi.id, nome: pi.nome, convicao: pi.convicaoId, transferir: "Humanidade, Dif 4" }));
    return { ok: true, eventos: eventos };
  }

  /* Transferir a fixação para outro Pilar: Humanidade Dif 4; falha, a
     Convicção associada se perde (p. 240). */
  function transferirPilar(o, pilarId, novoNome, rolador) {
    var pi = o.pilares.filter(function (x) { return x.id === pilarId; })[0];
    if (!pi || pi.estado !== "destruido") return falha("Só um Pilar destruído é transferido.");
    var r = D.rolar({ parada: humanidade(o), tipo: "trilha", dificuldade: 4, rotulo: "Transferir Pilar" }, rolador);
    D.concluir(r);
    var eventos = [evento("transferenciaDePilar", { sucessos: r.classificacao.sucessos, vitoria: r.classificacao.vitoria })];
    if (r.classificacao.vitoria) {
      o.pilares.push({ id: novoId("pi"), nome: texto(novoNome, 120), convicaoId: pi.convicaoId, relacaoId: "", estado: "vivo", historico: [{ evento: "transferido", de: pi.id }] });
    } else {
      o.convicoes.forEach(function (c) { if (c.id === pi.convicaoId) c.perdida = true; });
      eventos.push(evento("convicaoPerdida", { convicao: pi.convicaoId }));
    }
    return { ok: true, resultado: r, eventos: eventos };
  }

  /* ---------------------------------------------------------------
     ESTADOS: Torpor, estaca, Morte Final, sono diurno (p. 219–223)
     --------------------------------------------------------------- */

  function entrarEmTorpor(o, motivo) {
    if (o.estado.torpor) return { ok: true, eventos: [] };
    var ht = C.HUMANIDADE[humanidade(o)] || C.HUMANIDADE[1];
    o.estado.torpor = { motivo: motivo || "", noite: o.tempo.noite, dias: ht.torporDias, ate: "" };
    o.estado.frenesi = null;
    o.estado.compulsao = null;
    return { ok: true, eventos: [evento("torpor", { motivo: motivo || "", duracao: ht.torpor })] };
  }

  /* Despertar do Torpor: com Fome 5 (p. 223). `sangue`: alimentado por
     sangue de Potência maior, bastante para saciar 1 — interrompe. */
  function despertarDoTorpor(o, modo) {
    if (!o.estado.torpor) return falha("Não está em Torpor.");
    if (o.estado.estacado) return falha("Estacado: fica em Torpor até tirarem a estaca.");
    var t = o.estado.torpor;
    if (modo !== "sangue" && modo !== "narrador" && o.tempo.noite - t.noite < t.dias && t.motivo !== "dano") return falha("O período de Torpor ainda não passou.");
    if (t.motivo === "dano" && o.vitalidade.agravado >= vitalidadeMaxima(o) && modo !== "narrador") return falha("Ainda com a Vitalidade toda Agravada.");
    o.estado.torpor = null;
    o.fome = modo === "sangue" ? 4 : 5;
    return { ok: true, eventos: [evento("despertouDoTorpor", { modo: modo || "tempo", fome: o.fome })] };
  }

  function estaquear(o) {
    if (!ehVampiro(o)) return falha("Só vampiros são paralisados pela estaca.");
    if (ehSangueRalo(o)) {
      /* Sangue-ralo: a estaca não paralisa; é trauma maciço (p. 111). */
      return { ok: true, eventos: [evento("estacaSemEfeito", { motivo: "Sangue-ralo: trauma maciço, não paralisia" })] };
    }
    if (temVantagem(o, "iscaDeEstaca")) return morteFinal(o, "Isca de Estaca");
    if (o.efeitos.some(function (e) { return e.dados.imuneEstaca || e.dados.primeiraEstaca; })) {
      var ef = o.efeitos.filter(function (e) { return e.dados.primeiraEstaca; })[0];
      if (ef) { removerEfeito(o, ef.id); return { ok: true, eventos: [evento("estacaDespedacada", { motivo: ef.nome })] }; }
      return { ok: true, eventos: [evento("estacaSemEfeito", { motivo: "Coração de Pedra" })] };
    }
    o.estado.estacado = true;
    return { ok: true, eventos: [evento("estacado", {})] };
  }
  function removerEstaca(o) {
    if (!o.estado.estacado) return falha("Não está estacado.");
    o.estado.estacado = false;
    return { ok: true, eventos: [evento("estacaRemovida", {})] };
  }

  function morteFinal(o, causa) {
    if (o.estado.morteFinal) return { ok: true, eventos: [] };
    o.estado.morteFinal = { causa: texto(causa, 200), quando: "noite " + o.tempo.noite };
    o.estado.frenesi = null; o.estado.compulsao = null;
    return { ok: true, eventos: [evento("morteFinal", { causa: texto(causa, 200) })] };
  }

  /* Luz do sol (p. 221): Agravado = Gravidade da Perdição por turno
     (obscurecida: turno sim, turno não). Sangue-ralo: 1 Superficial.
     Humanidade 10: pela metade. Bebedor Diurno: só a metade da
     Vitalidade. */
  function luzDoSol(o, intensidade) {
    if (!ehVampiro(o)) return { ok: true, eventos: [] };
    if (ehSangueRalo(o)) {
      if (temQualidadeRalo(o, "bebedorDiurno")) {
        if (!temEfeito(o, "bebedorDiurnoAoSol")) adicionarEfeito(o, { chave: "bebedorDiurnoAoSol", nome: "Bebedor Diurno ao sol", origem: { tipo: "sangueRalo", chave: "bebedorDiurno" }, duracao: "cena" });
        return { ok: true, eventos: [evento("sol", { bebedorDiurno: true })] };
      }
      return sofrerDano(o, { trilha: "vitalidade", tipo: "superficial", valor: 1, fonte: "sol", naoDividir: true });
    }
    var g = Math.max(1, gravidadeDaPerdicao(o));
    if (humanidade(o) >= 10) g = Math.ceil(g / 2);
    if (intensidade === "obscurecida") {
      var m = "sol-" + Math.floor(o.tempo.turno / 2);
      if (o.marcas.cena[m]) return { ok: true, eventos: [evento("sol", { obscurecida: true, poupado: true })] };
      o.marcas.cena[m] = true;
    }
    return sofrerDano(o, { trilha: "vitalidade", tipo: "agravado", valor: g, fonte: "sol" });
  }

  function fogo(o, exposicao) {
    var n = exposicao === "engolfado" ? 3 : exposicao === "corpo" ? 2 : 1;
    if (temEfeito(o, "andarilhoDoFogo")) n = Math.ceil(n / 2);
    return sofrerDano(o, { trilha: "vitalidade", tipo: "agravado", valor: n, fonte: "fogo" });
  }

  /* Despertar de dia (p. 219): Humanidade Dif pela crise. Acordado,
     a parada máxima é a Humanidade. */
  function despertarDeDia(o, dificuldade, rolador) {
    var r = D.rolar({ parada: Math.max(1, humanidade(o)), tipo: "trilha", dificuldade: inteiro(dificuldade, 1, 8, 3), rotulo: "Despertar de dia" }, rolador);
    D.concluir(r);
    var eventos = [evento("despertarDeDia", { sucessos: r.classificacao.sucessos, vitoria: r.classificacao.vitoria })];
    if (r.classificacao.vitoria) adicionarEfeito(o, { chave: "acordadoDeDia", nome: "Acordado de dia", origem: { tipo: "sono", chave: "dia" }, duracao: "cena", dados: { paradaMaxima: humanidade(o), critico: r.classificacao.vitoriaCritica } });
    return { ok: true, resultado: r, eventos: eventos };
  }

  /* ---------------------------------------------------------------
     RESSONÂNCIA E DISCRASIAS (p. 226–231)
     --------------------------------------------------------------- */

  /* Ressonância aleatória (p. 228). */
  function ressonanciaAleatoria(rolador) {
    var t = rolador(10), temperamento;
    if (t <= 5) return { tipo: "", temperamento: "", faces: [t] };
    if (t <= 8) temperamento = "efemero";
    else { var t2 = rolador(10); temperamento = t2 <= 8 ? "intenso" : "agudo"; }
    var f = rolador(10);
    return { tipo: C.ressonanciaDaTabela(f), temperamento: temperamento, faces: [t, f] };
  }

  function definirRessonancia(o, r) {
    var anterior = o.ressonancia;
    o.ressonancia = r && C.RESSONANCIAS[r.tipo] ? { tipo: r.tipo, temperamento: C.TEMPERAMENTOS[r.temperamento] ? r.temperamento : "efemero", discrasia: r.temperamento === "agudo" && C.DISCRASIAS[r.discrasia] && C.DISCRASIAS[r.discrasia].ressonancia === r.tipo ? r.discrasia : "", fonte: texto(r.fonte, 120), usada: false } : null;
    /* Sangue-ralo: 1 ponto numa Disciplina da Ressonância e um poder de
       nível 1; intensa ou mais, +1 ponto e um segundo poder (p. 113). */
    o.efeitos = o.efeitos.filter(function (e) { return e.chave !== "disciplinaDaRessonancia"; });
    var eventos = [evento("ressonancia", { de: anterior ? anterior.tipo : "", para: o.ressonancia ? o.ressonancia.tipo : "", temperamento: o.ressonancia ? o.ressonancia.temperamento : "" })];
    if (o.ressonancia && ehSangueRalo(o) && !temQualidadeRalo(o, "afinidadeComDisciplina")) {
      var res = C.RESSONANCIAS[o.ressonancia.tipo];
      var disc = r.disciplina && res.disciplinas.indexOf(r.disciplina) >= 0 ? r.disciplina : res.disciplinas[0];
      var pontos = o.ressonancia.temperamento === "efemero" ? 1 : 2;
      var d = {}; d[disc] = pontos;
      adicionarEfeito(o, { chave: "disciplinaDaRessonancia", nome: "Ressonância (sangue-ralo): " + DS().DISCIPLINAS[disc].nome, origem: { tipo: "ressonancia", chave: disc }, duracao: "ateFome5", dados: { disciplinas: d, poderes: lista(r.poderes).slice(0, pontos) } });
      eventos.push(evento("disciplinaTemporaria", { disciplina: disc, pontos: pontos }));
    }
    return eventos;
  }

  /* ---------------------------------------------------------------
     ALIMENTAÇÃO (p. 211–213, 226–231, 306–308)
     --------------------------------------------------------------- */

  /* Planejar mostra o que vai acontecer ANTES de confirmar: quanto sacia,
     o mínimo que a Potência permite, custos e as escolhas que só a mesa
     faz (matar, violar uma Convicção, quebrar a Máscara). */
  function planejarAlimentacao(o, pedido) {
    var p = pedido || {};
    var fonte = C.FONTES_DE_SANGUE[p.fonte];
    if (!fonte) return falha("Fonte de sangue desconhecida.");
    if (!ehVampiro(o)) return falha("Só vampiros se alimentam de sangue.");
    if (o.estado.torpor || o.estado.morteFinal) return falha("Não pode se alimentar agora.");
    var pot = potencia(o);
    var tab = C.potencia(pot);
    var avisos = [], custos = [], escolhas = [];
    var sacia = fonte.sacia;
    if (fonte.minSacia !== undefined) sacia = inteiro(p.quantidade, fonte.minSacia, fonte.sacia, fonte.minSacia);
    var potEf = pot;
    if ((fonte.animal) && temPoder(o, "suculenciaAnimal")) { sacia += 1; potEf = Math.max(0, pot - 2); }
    var meio = false;
    if (fonte.animal || fonte.ensacado) {
      var tabEf = C.potencia(potEf);
      if (fonte.ensacado && temVantagem(o, "esofagoDeFerro")) { /* integral */ }
      else if (tabEf.animalEnsacado === "nada") { avisos.push("Potência " + pot + ": sangue animal ou ensacado não sacia nada."); sacia = 0; }
      else if (tabEf.animalEnsacado === "metade") { meio = true; avisos.push("Potência 2: sacia a metade — é preciso o dobro."); }
    }
    if (fonte.humano) {
      if (tab.saciaMenos && !fonte.mata) { sacia = Math.max(0, sacia - tab.saciaMenos); avisos.push("Potência " + pot + ": cada humano sacia " + tab.saciaMenos + " a menos."); }
      if (temVantagem(o, "fazendeiro")) custos.push({ tipo: "forcaDeVontade", valor: 2, motivo: "Defeito Fazendeiro" });
      if (temVantagem(o, "organivoro")) avisos.push("Organívoro: só reduz a Fome comendo carne e órgãos.");
    }
    if (fonte.animal && o.cla === "ventrue") avisos.push("Ventrue: o sangue animal costuma fugir da preferência.");
    if (o.cla === "ventrue" && !p.preferido && (fonte.humano || fonte.animal)) custos.push({ tipo: "forcaDeVontade", valor: gravidadeDaPerdicao(o), motivo: "Perdição Ventrue (fora da preferência)" });
    if (fonte.vampiro) {
      var aumento = inteiro(p.fomeDoDoador, 1, 5, 1);
      var dif = inteiro(p.potenciaDoDoador, 0, 10, pot) - pot;
      sacia = dif >= 2 ? aumento * 2 : dif <= -2 ? Math.floor(aumento / 2) : aumento;
      avisos.push("A Fome do doador sobe " + aumento + "; beber de outro vampiro pode gerar Laço de Sangue.");
    }
    var minimo = 0;
    if (!fonte.mata) minimo = Math.max(minimo, tab.minimoSemMatar);
    if (temVantagem(o, "sedeDoMatusalem") && !p.sobrenatural) minimo = Math.max(minimo, 1);
    var fomeFinal = Math.max(minimo, o.fome - sacia);
    if (meio) {
      var meios = o.fracaoDeFome + 1;
      fomeFinal = Math.max(minimo, o.fome - Math.floor(meios / 2));
    }
    if (fonte.danoNaVitima) escolhas.push({ tipo: "vitima", texto: "A vítima sofre " + sacia + " Agravado; sobrevive com Força + Vigor contra Dificuldade " + sacia + "." });
    if (fonte.mata) escolhas.push({ tipo: "matar", texto: "A vítima morre. É uma escolha, nunca um acaso: confirme." });
    if (temVantagem(o, "exclusaoDePresa")) escolhas.push({ tipo: "exclusao", texto: "Se a presa é da classe excluída, gera Máculas como violar um Princípio." });
    return {
      ok: true, fonte: p.fonte, sacia: sacia, meio: meio, minimo: minimo, fomeAntes: o.fome, fomeFinal: fomeFinal,
      custos: custos, avisos: avisos, escolhas: escolhas, tempo: fonte.tempo, ressonancia: fonte.ressonancia,
    };
  }

  /* Alimentar-se de verdade, com as escolhas confirmadas. */
  function alimentar(o, pedido, rolador) {
    var p = pedido || {};
    var plano = planejarAlimentacao(o, p);
    if (!plano.ok) return plano;
    var fonte = C.FONTES_DE_SANGUE[p.fonte];
    if (fonte.mata && !p.confirmarMorte) return falha("Matar a vítima precisa ser confirmado.", { plano: plano });
    var eventos = [];
    plano.custos.forEach(function (c) { if (c.tipo === "forcaDeVontade") eventos = eventos.concat(gastarForcaDeVontade(o, c.valor, c.motivo).eventos); });
    var antes = o.fome;
    if (plano.meio) {
      o.fracaoDeFome += 1;
      if (o.fracaoDeFome >= 2) { o.fracaoDeFome = 0; o.fome = Math.max(plano.minimo, o.fome - 1); }
    } else {
      o.fome = Math.max(plano.minimo, o.fome - plano.sacia);
    }
    var saciou = antes - o.fome;
    eventos.push(evento("alimentacao", { fonte: p.fonte, de: antes, para: o.fome, saciou: saciou }));
    if (p.exclusao) eventos = eventos.concat(adicionarMaculas(o, inteiro(p.maculasExclusao, 1, 3, 1), "Presa excluída").eventos);
    /* A vítima: dano e a chance de sobreviver (rolada aqui, para a mesa). */
    if (fonte.danoNaVitima) {
      var vit = { dano: plano.sacia };
      if (p.vitimaForcaVigor !== undefined) {
        var rv = D.rolar({ parada: Math.max(1, inteiro(p.vitimaForcaVigor, 1, 20)), tipo: "trilha", dificuldade: plano.sacia, rotulo: "A vítima sobrevive?" }, rolador);
        D.concluir(rv);
        vit.sobreviveu = rv.classificacao.vitoria;
        vit.sucessos = rv.classificacao.sucessos;
      }
      eventos.push(evento("vitima", vit));
    }
    if (fonte.mata) eventos.push(evento("vitimaMorta", { nota: texto(p.nota, 200) }));
    /* Ressonância: saciar ≥1 prende o efeito; ensacado zera. */
    if (saciou > 0 || fonte.ensacado) {
      eventos = eventos.concat(expirarPor(o, "alimentacao"));
      if (fonte.ressonancia === "animal") eventos = eventos.concat(definirRessonancia(o, { tipo: "animal", temperamento: "efemero", fonte: p.fonte }));
      else if (fonte.ressonancia === "nenhuma") eventos = eventos.concat(definirRessonancia(o, null));
      else if (p.ressonancia && p.ressonancia.tipo) eventos = eventos.concat(definirRessonancia(o, Object.assign({ fonte: p.fonte }, p.ressonancia)));
    }
    /* Compulsão de Fome termina ao saciar; frenesi de fome com Fome ≤ 1. */
    if (saciou > 0 && o.estado.compulsao && !o.estado.compulsao.cla && o.estado.compulsao.chave === "fome") eventos = eventos.concat(encerrarCompulsao(o, "Saciou").eventos);
    if (o.estado.frenesi && o.estado.frenesi.tipo === "fome" && o.fome <= 1) eventos = eventos.concat(encerrarFrenesi(o, "Fome 1 ou menos").eventos);
    /* Laço: beber de outro vampiro (p. 233). */
    if (fonte.vampiro && p.doador) eventos = eventos.concat(beberDeVampiro(o, p.doador, p.doadorNome).eventos);
    registrarNoHistorico(o, evento("alimentacao", { fonte: p.fonte, saciou: saciou }));
    return { ok: true, eventos: eventos, plano: plano, saciou: saciou };
  }

  /* O doador (outra ficha) — chamado pelo servidor na operação entre
     duas fichas: a Fome dele sobe. */
  function doarSangue(o, pontos) {
    var antes = o.fome;
    var eventos = aumentarFome(o, inteiro(pontos, 1, 5, 1), "Doou sangue");
    return { ok: true, eventos: eventos, de: antes, para: o.fome };
  }

  /* Caçada (p. 306–308): a parada do Predador contra a Dificuldade do
     território (ou do Chasse). */
  function paradaDeCaca(o, alternativa) {
    var p = C.PREDADORES[o.predador];
    var par = p ? p.parada[inteiro(alternativa, 0, 2, 0)] || p.parada[0] : ["raciocinio", "manha"];
    var pedido = { atributo: par[0], contexto: ["caca"] };
    if (C.habilidade(par[1])) pedido.habilidade = par[1];
    else if (C.VANTAGENS[par[1]]) pedido.modificadores = [{ fonte: C.VANTAGENS[par[1]].nome, valor: pontosDeVantagem(o, par[1]) }];
    if (temVantagem(o, "predadorManifesto")) pedido.modificadores = lista(pedido.modificadores).concat([{ fonte: "Predador Manifesto", valor: -2 }]);
    return pedido;
  }
  function dificuldadeDeCaca(territorio, mods, chasse) {
    if (chasse) return C.dificuldadeDeCacaDoChasse(chasse);
    var t = C.TERRITORIOS_DE_CACA.filter(function (x) { return x.chave === territorio; })[0];
    var d = t ? t.dificuldade : 4;
    lista(mods).forEach(function (m) { var x = C.MODIFICADORES_DE_CACA.filter(function (y) { return y.chave === m; })[0]; if (x) d += x.valor; });
    return Math.max(1, d);
  }

  /* ---------------------------------------------------------------
     LAÇOS DE SANGUE (p. 233–234)
     --------------------------------------------------------------- */

  function beberDeVampiro(o, reinanteId, nome) {
    if (temVantagem(o, "aProvaDeLaco")) return { ok: true, eventos: [evento("laco", { imune: true })] };
    var l = o.lacos.filter(function (x) { return x.reinanteId === reinanteId; })[0];
    if (!l) { l = { id: novoId("la"), reinante: texto(nome, 120), reinanteId: texto(reinanteId, 80), forca: 0, noites: [], ultimaNoite: 0 }; o.lacos.push(l); }
    var noite = String(o.tempo.noite);
    if (l.noites.indexOf(noite) >= 0) return { ok: true, eventos: [evento("laco", { reinante: l.reinante, forca: l.forca, mesmaNoite: true })] };
    l.noites.push(noite);
    l.noites = l.noites.slice(-6);
    l.ultimaNoite = o.tempo.noite;
    l.forca = Math.min(6, l.forca + (temVantagem(o, "escravoDoLaco") && l.forca < 3 ? 3 : 1));
    var eventos = [evento("laco", { reinante: l.reinante, forca: l.forca, completo: l.forca >= 3 })];
    if (l.forca >= 3) {
      /* Um escravo só tem um reinante: o Laço mais antigo se desfaz. */
      o.lacos.forEach(function (x) { if (x !== l && x.forca >= 3) { x.forca = 0; eventos.push(evento("lacoDesfeito", { reinante: x.reinante })); } });
    }
    return { ok: true, eventos: eventos };
  }

  /* Desafiar o reinante: Determinação + Inteligência contra a Força do
     Laço (Resistência ao Laço soma; Viciado em Laço subtrai). */
  function paradaContraLaco(o) {
    var comp = [{ fonte: "Determinação", valor: valorDeAtributo(o, "determinacao") }, { fonte: "Inteligência", valor: valorDeAtributo(o, "inteligencia") }];
    var r = pontosDeVantagem(o, "resistenciaAoLaco");
    if (r) comp.push({ fonte: "Resistência ao Laço", valor: r });
    if (temVantagem(o, "viciadoEmLaco")) comp.push({ fonte: "Viciado em Laço", valor: -1 });
    return { total: Math.max(1, comp.reduce(function (s, x) { return s + x.valor; }, 0)), composicao: comp };
  }

  /* Um mês sem beber: cada Laço perde força (p. 233). */
  function enfraquecerLacos(o, meses) {
    var n = inteiro(meses, 1, 120, 1), eventos = [];
    var fator = temVantagem(o, "lacoCurto") ? 2 : temVantagem(o, "lacoLongo") ? 1 / 3 : 1;
    o.lacos.forEach(function (l) {
      var perde = Math.floor(n * fator);
      if (!perde) return;
      var antes = l.forca;
      l.forca = Math.max(0, l.forca - perde);
      if (l.forca !== antes) eventos.push(evento("lacoEnfraquecido", { reinante: l.reinante, de: antes, para: l.forca }));
    });
    o.lacos = o.lacos.filter(function (l) { return l.forca > 0; });
    return { ok: true, eventos: eventos };
  }

  /* ---------------------------------------------------------------
     DIABLERIE (p. 234–235) — em etapas, nunca um botão de ganho
     --------------------------------------------------------------- */

  /* Etapa de drenar a centelha: Força + Determinação, Dif 3, um teste
     por turno; precisa de tantos sucessos (vitórias) quanto a Potência
     da vítima. Uma falha apaga a centelha (Morte Final, sem diablerie). */
  function diablerieTurno(o, estado, rolador) {
    var e = estado || { vitorias: 0, encerrada: false };
    if (e.encerrada) return falha("A Diablerie já terminou.");
    var r = rolarTeste(o, { atributo: "forca", atributo2: "determinacao", dificuldade: 3, rotulo: "Diablerie: drenar a alma" }, rolador);
    if (!r.ok) return r;
    D.concluir(r.resultado);
    var ok = r.resultado.classificacao.vitoria;
    if (!ok) { e.encerrada = true; e.apagada = true; }
    else { e.vitorias++; if (e.vitorias >= inteiro(e.potenciaDaVitima, 1, 10, 1)) { e.encerrada = true; e.consumada = true; } }
    return { ok: true, estado: e, resultado: r.resultado, eventos: [evento("diablerieTurno", { vitoria: ok, vitorias: e.vitorias, consumada: !!e.consumada, apagada: !!e.apagada })] };
  }

  /* Consumada: −1 Humanidade; disputa Humanidade + Potência contra
     Determinação + Potência da vítima; vitória: 5 XP por sucesso para
     Potência (até a da vítima) ou Disciplinas dela; derrota: −1
     Humanidade por sucesso faltante. Geração cai se a vítima era de
     geração menor. A XP fica como crédito restrito. */
  function diablerieConsumada(o, vitima, rolador) {
    var v = vitima || {};
    var eventos = mudarHumanidade(o, -1, "diablerie", "Diablerie").eventos;
    var minha = Math.max(1, humanidade(o) + potencia(o));
    var dela = Math.max(1, inteiro(v.determinacao, 0, 10, 2) + inteiro(v.potencia, 0, 10, 1));
    var ra = D.rolar({ parada: minha, tipo: "trilha", rotulo: "Diablerie: a alma" }, rolador);
    var rb = D.rolar({ parada: dela, tipo: "trilha", rotulo: "A vítima resiste" }, rolador);
    D.concluir(ra); D.concluir(rb);
    var a = ra.classificacao.sucessos, b = rb.classificacao.sucessos;
    if (a >= b) {
      var credito = { id: novoId("dx"), valor: 5 * Math.max(0, a - b), restrito: { potenciaAte: inteiro(v.potencia, 0, 10), disciplinas: lista(v.disciplinas).slice(0, 10) }, motivo: "Diablerie" };
      o.xp.creditos = Object.assign({}, o.xp.creditos);
      o.xp.creditos[credito.id] = credito;
      eventos.push(evento("diablerieVenceu", { sucessos: a, vitima: b, xp: credito.valor }));
    } else {
      for (var i = 0; i < b - a; i++) eventos = eventos.concat(mudarHumanidade(o, -1, "diablerie", "A alma resistiu").eventos);
      eventos.push(evento("diablerieResistida", { faltaram: b - a }));
    }
    if (v.geracao && inteiro(v.geracao, 4, 16) < o.geracao) {
      var antes = o.geracao;
      o.geracao = ehSangueRalo(o) ? 13 : o.geracao - 1;
      eventos.push(evento("geracao", { de: antes, para: o.geracao }));
    }
    o.ajustes.push({ id: novoId("aj"), tipo: "marca", alvo: "veiasNegras", valor: 0, origem: "diablerie", motivo: "Veias negras na aura (1 ano, ou anos = diferença de gerações)", noite: o.tempo.noite });
    return { ok: true, eventos: eventos, resultados: [ra, rb] };
  }

  /* ---------------------------------------------------------------
     EXPERIÊNCIA (p. 130, 137, 151)
     --------------------------------------------------------------- */

  function disciplinasDoCla(o) { return (C.CLAS[o.cla] || { disciplinas: [] }).disciplinas; }

  function custoDeNivel(o, tipo, alvo, nivel) {
    var n = inteiro(nivel, 1, 10);
    if (tipo === "atributo") return 5 * n;
    if (tipo === "habilidade") return 3 * n;
    if (tipo === "potencia") return 10 * n;
    if (tipo === "humanidade") return 10 * n;
    if (tipo === "disciplina") {
      if (o.cla === "caitiff") return 6 * n;
      if (alvo === "alquimia" && ehSangueRalo(o)) return 5 * n;
      return disciplinasDoCla(o).indexOf(alvo) >= 0 ? 5 * n : 7 * n;
    }
    return 0;
  }

  /* Custo de subir de `de` para `para`: CADA nível intermediário. */
  function custoDeCompra(o, tipo, alvo, de, para) {
    var total = 0;
    for (var n = inteiro(de, 0, 10) + 1; n <= inteiro(para, 0, 10); n++) total += custoDeNivel(o, tipo, alvo, n);
    return total;
  }

  function valorAtual(o, tipo, alvo) {
    if (tipo === "atributo") return valorDeAtributo(o, alvo);
    if (tipo === "habilidade") return valorDeHabilidade(o, alvo);
    if (tipo === "disciplina") return somarCamadas(o, "disciplina", alvo, o.disciplinas[alvo] || 0, concessoes(o)).valor;
    if (tipo === "potencia") return potencia(o);
    if (tipo === "humanidade") return humanidade(o);
    return 0;
  }

  /* Comprar com experiência. `p`: { tipo, alvo, para, nome (especialização),
     poderes [chaves, um por nível novo], ressonancia (confirmada),
     sangueProvado (fora do clã), autorizado (Narrador) }. */
  function validarCompra(o, p) {
    var tipo = p.tipo, alvo = p.alvo;
    var xp = xpTotal(o) - xpGasto(o);
    var creditos = creditosAplicaveis(o, p);
    var de, para, custo;
    if (["atributo", "habilidade", "disciplina", "potencia", "humanidade"].indexOf(tipo) >= 0) {
      de = valorAtual(o, tipo, alvo);
      para = inteiro(p.para, 0, 10);
      if (para <= de) return falha("O novo valor precisa ser maior que o atual (" + de + ").");
      if (tipo === "atributo" && !C.atributo(alvo)) return falha("Atributo desconhecido.");
      if (tipo === "habilidade" && !C.habilidade(alvo)) return falha("Habilidade desconhecida.");
      if ((tipo === "atributo" || tipo === "habilidade" || tipo === "disciplina") && para > 5) return falha("O máximo é 5.");
      if (tipo === "habilidade" && pontosLimite(o, alvo) !== null && para > pontosLimite(o, alvo)) return falha("Um Defeito limita esta Habilidade.");
      if (tipo === "potencia") {
        if (ehSangueRalo(o)) return falha("Sangue-ralo nunca aumenta a Potência (salvo Diablerie).");
        var lim = limitesDePotencia(o);
        if (para > lim[1]) return falha("A geração " + o.geracao + " permite Potência até " + lim[1] + ".");
      }
      if (tipo === "humanidade" && !p.autorizado) return falha("Humanidade só sobe com um arco narrativo e a autorização do Narrador (p. 241).");
      if (tipo === "disciplina") {
        var def = DS().DISCIPLINAS[alvo];
        if (!def) return falha("Disciplina desconhecida.");
        if (def.soSangueRalo && !ehSangueRalo(o)) return falha("Alquimia é dos sangues-ralos.");
        if (ehSangueRalo(o) && alvo !== "alquimia" && !(temQualidadeRalo(o, "afinidadeComDisciplina") && de > 0)) return falha("Sangue-ralo não compra Disciplinas (salvo Afinidade com Disciplina).");
        if (!p.ressonancia && !(o.ressonancia && C.RESSONANCIAS[o.ressonancia.tipo].disciplinas.indexOf(alvo) >= 0) && alvo !== "alquimia") return falha("Alimente-se da Ressonância correspondente antes (p. 231), ou confirme que o fez.");
        if (o.cla !== "caitiff" && disciplinasDoCla(o).indexOf(alvo) < 0 && !ehSangueRalo(o) && !p.sangueProvado) return falha("Uma Disciplina fora do clã exige provar o Sangue de quem a possua (p. 231).");
        var novos = lista(p.poderes);
        if (novos.length !== para - de) return falha("Escolha um poder para cada nível novo.");
        for (var i = 0; i < novos.length; i++) {
          var pode = podeAdquirirPoder(o, novos[i], { disciplina: alvo, nivel: de + i + 1, jaEscolhidos: novos.slice(0, i) });
          if (!pode.ok) return pode;
        }
      }
      custo = custoDeCompra(o, tipo, alvo, de, para);
    } else if (tipo === "especializacao") {
      var hab = valorDeHabilidade(o, alvo);
      if (!hab) return falha("Precisa de ao menos 1 ponto na Habilidade.");
      var atuais = especializacoesDaFicha(o).filter(function (e) { return e.habilidade === alvo; }).length;
      var h = C.habilidade(alvo);
      if (!(h && h.semLimiteDeEspecializacoes) && atuais >= hab) return falha("Especializações: no máximo o valor da Habilidade (p. 159).");
      if (!texto(p.nome, 80).trim()) return falha("Dê nome à especialização.");
      de = atuais; para = atuais + 1; custo = C.CUSTOS_XP.especializacao.fixo;
    } else if (tipo === "vantagem") {
      var vdef = C.VANTAGENS[alvo];
      if (!vdef || vdef.tipo === "defeito") return falha("Escolha uma Qualidade ou um Antecedente.");
      de = pontosDeVantagem(o, alvo); para = inteiro(p.para, 1, 10);
      if (para <= de) return falha("O novo valor precisa ser maior.");
      if (vdef.niveis.indexOf(para) < 0 && !vdef.porNivel) return falha("Nível inexistente para esta Vantagem.");
      if (vdef.proibidoPara && vdef.proibidoPara.indexOf(o.cla) >= 0) return falha(vdef.nome + " não é permitido para " + C.CLAS[o.cla].nome + ".");
      custo = (para - de) * C.CUSTOS_XP.vantagem.porPonto;
    } else if (tipo === "ficha") {
      /* Cada nível é independente: não exige nem concede os anteriores. */
      var fdef = C.FICHAS_DE_CONHECIMENTO[alvo];
      if (!fdef) return falha("Ficha de Conhecimento desconhecida.");
      para = inteiro(p.para, 1, 5, 1); de = 0;
      if (fdef.cla && fdef.cla !== o.cla) return falha(fdef.nome + " é exclusiva do clã " + C.CLAS[fdef.cla].nome + ".");
      if (o.fichas.some(function (x) { return x.ficha === alvo && x.nivel === para; })) return falha("Já tem este nível.");
      custo = para * C.CUSTOS_XP.vantagem.porPonto;
    } else if (tipo === "ritual" || tipo === "formula") {
      var rdef = tipo === "ritual" ? DS().ritual(alvo) : DS().poder(alvo);
      if (!rdef || (tipo === "formula" && !rdef.formula)) return falha("Desconhecido.");
      var lim2 = valorDeDisciplina(o, tipo === "ritual" ? "feiticaria" : "alquimia");
      if (rdef.nivel > lim2) return falha("Precisa de " + (tipo === "ritual" ? "Feitiçaria de Sangue" : "Alquimia") + " " + rdef.nivel + ".");
      var lst = tipo === "ritual" ? o.rituais : o.formulas;
      if (lst.some(function (x) { return x.chave === alvo; })) return falha("Já conhece.");
      de = 0; para = rdef.nivel; custo = rdef.nivel * 3;
    } else {
      return falha("Tipo de compra desconhecido.");
    }
    var desconto = Math.min(custo, creditos.total);
    if (custo - desconto > xp) return falha("Experiência insuficiente: custa " + custo + (desconto ? " (crédito " + desconto + ")" : "") + ", há " + xp + ".");
    return { ok: true, de: de, para: para, custo: custo, desconto: desconto, creditos: creditos.usados };
  }

  function pontosLimite(o, habilidade) {
    var lim = null;
    vantagensDaFicha(o).forEach(function (v) {
      var ef = (C.VANTAGENS[v.chave] || {}).efeito;
      if (ef && ef.limiteHabilidade && ef.limiteHabilidade[habilidade] !== undefined) lim = lim === null ? ef.limiteHabilidade[habilidade] : Math.min(lim, ef.limiteHabilidade[habilidade]);
    });
    return lim;
  }

  /* Créditos de XP restritos (Discrasias Energético/Evocador/…,
     Diablerie): só valem para o que dizem. */
  function creditosAplicaveis(o, p) {
    var cr = objeto(o.xp.creditos), usados = [], total = 0;
    Object.keys(cr).forEach(function (k) {
      var c = cr[k];
      if (!c || !(c.valor > 0)) return;
      var r = objeto(c.restrito);
      var vale = (p.tipo === "disciplina" && lista(r.disciplinas).indexOf(p.alvo) >= 0) ||
        (p.tipo === "potencia" && r.potenciaAte !== undefined && inteiro(p.para, 0, 10) <= r.potenciaAte);
      if (vale) { usados.push(k); total += c.valor; }
    });
    return { total: total, usados: usados };
  }

  function comprar(o, p) {
    var v = validarCompra(o, p || {});
    if (!v.ok) return v;
    var compra = { id: novoId("cp"), tipo: p.tipo, alvo: p.alvo, de: v.de, para: v.para, custo: v.custo - v.desconto, credito: v.desconto, nome: texto(p.nome, 120), poderes: lista(p.poderes).slice(0, 10), noite: o.tempo.noite };
    /* Consumir créditos usados. */
    var falta = v.desconto;
    v.creditos.forEach(function (k) { var c = o.xp.creditos[k]; var usa = Math.min(c.valor, falta); c.valor -= usa; falta -= usa; if (c.valor <= 0) delete o.xp.creditos[k]; });
    var eventos = [];
    if (p.tipo === "especializacao") {
      o.especializacoes.push({ id: novoId("es"), habilidade: p.alvo, nome: texto(p.nome, 80), origem: "xp" });
      compra.de = 0; compra.para = 0; compra.tipo = "especializacao";
    } else if (p.tipo === "vantagem") {
      var existente = o.vantagens.filter(function (x) { return x.chave === p.alvo && x.origem === "xp"; })[0];
      if (existente) existente.pontos = v.para - (v.de - existente.pontos);
      else o.vantagens.push({ id: novoId("va"), chave: p.alvo, pontos: v.para - v.de, nota: texto(p.nome, 200), parametro: "", relacaoId: "", origem: "xp", compartilhada: false });
      compra.tipo = "vantagemComprada";
    } else if (p.tipo === "ficha") {
      o.fichas.push({ id: novoId("fc"), ficha: p.alvo, nivel: v.para, origem: "xp" });
      compra.tipo = "fichaComprada";
    } else if (p.tipo === "ritual") {
      o.rituais.push({ id: novoId("ri"), chave: p.alvo, origem: "xp" });
      compra.tipo = "ritualAprendido";
    } else if (p.tipo === "formula") {
      o.formulas.push({ id: novoId("fo"), chave: p.alvo, origem: "xp" });
      compra.tipo = "formulaAprendida";
    } else if (p.tipo === "disciplina") {
      lista(p.poderes).forEach(function (k) { o.poderes.push({ id: novoId("po"), chave: k, origem: "xp" }); });
    }
    o.compras.push(compra);
    eventos.push(evento("compra", { compra: p.tipo, alvo: p.alvo, de: v.de, para: v.para, custo: compra.custo, credito: v.desconto }));
    return { ok: true, eventos: eventos, compra: compra };
  }

  function receberXP(o, valor, motivo) {
    var n = inteiro(valor, -999, 999, 0);
    o.xp.recebido = Math.max(0, o.xp.recebido + n);
    o.xp.historico.push({ id: novoId("xp"), valor: n, motivo: texto(motivo, 200), noite: o.tempo.noite });
    o.xp.historico = o.xp.historico.slice(-200);
    return { ok: true, eventos: [evento("xp", { valor: n, motivo: texto(motivo, 200) })] };
  }

  /* ---------------------------------------------------------------
     PODERES: aquisição e requisitos (p. 244)
     --------------------------------------------------------------- */

  /* Ter pontos não dá todos os poderes: um por ponto, de nível ≤ ao
     valor, com amálgamas e pré-requisitos. */
  function podeAdquirirPoder(o, chave, contexto) {
    var x = contexto || {};
    var def = DS().poder(chave);
    if (!def) return falha("Poder desconhecido.");
    var disc = x.disciplina || def.disciplina;
    if (def.disciplina !== disc) return falha(def.nome + " é de " + DS().DISCIPLINAS[def.disciplina].nome + ".");
    var nivel = x.nivel !== undefined ? x.nivel : valorDeDisciplina(o, disc);
    if (def.nivel > nivel) return falha(def.nome + " exige " + DS().DISCIPLINAS[disc].nome + " " + def.nivel + ".");
    var tem = poderesDaFicha(o).map(function (p) { return p.chave; }).concat(lista(x.jaEscolhidos));
    if (tem.indexOf(chave) >= 0) return falha("Já possui " + def.nome + ".");
    if (def.amalgama && valorDeDisciplina(o, def.amalgama.disciplina) < def.amalgama.nivel) return falha(def.nome + " exige " + DS().DISCIPLINAS[def.amalgama.disciplina].nome + " " + def.amalgama.nivel + " (amálgama).");
    if (def.prereq && tem.indexOf(def.prereq) < 0) return falha(def.nome + " exige " + DS().poder(def.prereq).nome + ".");
    if (def.formula) return falha("Fórmulas se aprendem à parte.");
    return { ok: true };
  }

  /* Os requisitos de um poder que a ficha JÁ tem (criação: o clã ou o
     Predador podem ter mudado depois da escolha): nível, amálgama e
     pré-requisito. */
  function requisitosDoPoder(o, chave, conc) {
    var def = DS().poder(chave);
    if (!def) return falha("Poder desconhecido.");
    if (def.formula) return { ok: true };
    var c = conc || concessoes(o);
    if (valorDeDisciplina(o, def.disciplina, c) < def.nivel) return falha(def.nome + " exige " + DS().DISCIPLINAS[def.disciplina].nome + " " + def.nivel + ".");
    if (def.amalgama && valorDeDisciplina(o, def.amalgama.disciplina, c) < def.amalgama.nivel) return falha(def.nome + " exige " + DS().DISCIPLINAS[def.amalgama.disciplina].nome + " " + def.amalgama.nivel + " (amálgama).");
    if (def.prereq && !poderesDaFicha(o, c).some(function (p) { return p.chave === def.prereq; })) return falha(def.nome + " exige " + DS().poder(def.prereq).nome + ".");
    return { ok: true };
  }

  /* Poderes que a ficha "deve" (um por ponto) e os que faltam escolher. */
  function poderesPendentes(o) {
    var conc = concessoes(o), out = [];
    Object.keys(DS().DISCIPLINAS).forEach(function (k) {
      if (k === "alquimia") return;
      var pontos = somarCamadas(o, "disciplina", k, o.disciplinas[k] || 0, conc).valor;
      var tem = poderesDaFicha(o, conc).filter(function (p) { var d = DS().poder(p.chave); return d && d.disciplina === k; }).length;
      if (pontos > tem) out.push({ disciplina: k, faltam: pontos - tem });
    });
    return out;
  }

  /* ---------------------------------------------------------------
     EFEITOS: adicionar, remover, expirar
     --------------------------------------------------------------- */

  function adicionarEfeito(o, e) {
    var ef = normalizarEfeito(Object.assign({ inicio: copiar(o.tempo) }, e));
    /* O mesmo efeito da mesma origem não se acumula: renova. */
    o.efeitos = o.efeitos.filter(function (x) { return !(x.chave === ef.chave && x.origem.tipo === ef.origem.tipo && x.origem.chave === ef.origem.chave); });
    o.efeitos.push(ef);
    return ef;
  }
  function removerEfeito(o, id) {
    var antes = o.efeitos.length;
    o.efeitos = o.efeitos.filter(function (e) { return e.id !== id; });
    return antes !== o.efeitos.length;
  }

  /* Expira o que termina num momento. Durações:
       turno          fim do turno
       cena, uso      fim da cena
       noite, horas   nova noite
       noiteSeguinte  a segunda nova noite (aspectos Gangrel)
       ateFome5       ao chegar a Fome 5
       alimentacao    na próxima alimentação */
  function expirarPor(o, momento) {
    var eventos = [];
    var fica = [];
    o.efeitos.forEach(function (e) {
      var sai = false;
      if (momento === "turno") sai = e.duracao === "turno";
      else if (momento === "cena") sai = ["turno", "cena", "uso"].indexOf(e.duracao) >= 0;
      else if (momento === "noite") {
        if (e.duracao === "noiteSeguinte") { if (o.tempo.noite - e.inicio.noite >= 2) sai = true; }
        else sai = ["turno", "cena", "uso", "noite", "horas", "dia"].indexOf(e.duracao) >= 0;
      }
      else if (momento === "fome5") sai = e.duracao === "ateFome5" || e.chave === "disciplinaDaRessonancia";
      else if (momento === "alimentacao") sai = e.duracao === "alimentacao" || e.duracao === "ateFome5";
      if (sai) eventos.push(evento("efeitoExpirou", { chave: e.chave, nome: e.nome || e.chave, momento: momento }));
      else fica.push(e);
    });
    o.efeitos = fica;
    /* A Ressonância e a Discrasia também acabam com Fome 5. */
    if (momento === "fome5" && o.ressonancia) { o.ressonancia = null; eventos.push(evento("ressonancia", { para: "", motivo: "Fome 5" })); }
    return eventos;
  }

  /* ---------------------------------------------------------------
     MOMENTOS — o tempo só anda por aqui
     --------------------------------------------------------------- */

  /* Início de sessão (p. 158). `continuaCena`: a sessão anterior parou
     no meio de uma cena de ação — a FdV fica como estava. NÃO é uma
     noite nova: o despertar é novaNoite(). */
  function inicioDaSessao(o, opcoes) {
    var x = opcoes || {};
    o.tempo.sessao++;
    o.marcas.sessao = {};
    var eventos = [evento("inicioDaSessao", { sessao: o.tempo.sessao, continuaCena: !!x.continuaCena })];
    if (!x.continuaCena) {
      var n = Math.max(valorDeAtributo(o, "autocontrole"), valorDeAtributo(o, "determinacao"));
      var curado = curarTrilha(o, "forcaDeVontade", "superficial", n);
      if (curado) eventos.push(evento("cura", { trilha: "forcaDeVontade", dano: "superficial", valor: curado }));
    }
    return { ok: true, eventos: eventos };
  }

  /* Fim de sessão: Ambição trabalhada → 1 Agravado de FdV; XP; Remorso
     de quem tem Máculas (a Degeneração acaba aqui). */
  function fimDaSessao(o, opcoes, rolador) {
    var x = opcoes || {};
    var eventos = [evento("fimDaSessao", { sessao: o.tempo.sessao })];
    if (x.ambicao) {
      var c = curarTrilha(o, "forcaDeVontade", "agravado", 1);
      eventos.push(evento("ambicao", { curado: c }));
    }
    if (x.xp) eventos = eventos.concat(receberXP(o, x.xp, x.motivoXP || "Sessão").eventos);
    if (o.maculas && rolador) {
      var r = testarRemorso(o, rolador);
      if (r.ok) eventos = eventos.concat(r.eventos);
    } else if (o.estado.degeneracao) {
      o.estado.degeneracao = false;
    }
    return { ok: true, eventos: eventos };
  }

  /* Desejo (p. 174): 1× por sessão, ao agir decididamente pelo Desejo,
     recupera 1 Superficial de FdV. A mesa confirma que aconteceu. */
  function cumprirDesejo(o) {
    if (o.marcas.sessao.desejo) return falha("O Desejo já recuperou Força de Vontade nesta sessão.");
    o.marcas.sessao.desejo = true;
    var c = curarTrilha(o, "forcaDeVontade", "superficial", 1);
    return { ok: true, eventos: [evento("desejo", { curado: c })] };
  }

  /* Recuperações a critério do Narrador (p. 158–159): Pilar ou
     Convicção contra os próprios interesses (Agravado), Compulsão ou
     frenesi bem interpretados (Superficial). */
  function recuperarFdV(o, tipo, valor, motivo) {
    var c = curarTrilha(o, "forcaDeVontade", tipo === "agravado" ? "agravado" : "superficial", inteiro(valor, 1, 10, 1));
    return { ok: true, eventos: [evento("cura", { trilha: "forcaDeVontade", dano: tipo, valor: c, motivo: texto(motivo, 200) })] };
  }

  /* Uma noite nova: o despertar (Checagem; Fome além de 5 → Torpor),
     efeitos da noite expiram, a estaca cobra, o Torpor conta. */
  function novaNoite(o, rolador, opcoes) {
    var x = opcoes || {};
    o.tempo.noite++;
    o.tempo.cena = 0; o.tempo.turno = 0;
    o.marcas.noite = {};
    o.marcas.cena = {};
    var eventos = [evento("novaNoite", { noite: o.tempo.noite })].concat(expirarPor(o, "noite"));
    if (o.estado.morteFinal || !ehVampiro(o)) return { ok: true, eventos: eventos };
    if (o.estado.torpor) {
      var t = o.estado.torpor;
      if (t.motivo === "dano" && o.vitalidade.agravado > 0) {
        /* Recupera 1 Vitalidade por noite; curado, desperta (p. 223). */
        curarTrilha(o, "vitalidade", "agravado", 1);
        eventos.push(evento("cura", { trilha: "vitalidade", dano: "agravado", valor: 1, torpor: true }));
        if (o.vitalidade.agravado < vitalidadeMaxima(o) && !o.estado.estacado) eventos = eventos.concat(despertarDoTorpor(o, "narrador").eventos);
      }
      return { ok: true, eventos: eventos };
    }
    if (x.semDespertar) return { ok: true, eventos: eventos };
    var r = checagemDeSangue(o, { motivo: o.estado.estacado ? "Pôr do sol (estacado)" : "Despertar", forcada: true, contexto: "despertar" }, rolador);
    if (r.ok) eventos = eventos.concat(r.eventos);
    o.estado.dormindo = false;
    return { ok: true, eventos: eventos };
  }

  function novaCena(o) {
    o.tempo.cena++;
    o.tempo.turno = 0;
    o.marcas.cena = {};
    return { ok: true, eventos: [evento("novaCena", { cena: o.tempo.cena })] };
  }

  /* Fim da cena: efeitos da cena expiram; frenesi e Compulsões de cena
     terminam; a Perdição Malkaviana também. */
  function fimDaCena(o) {
    var eventos = [evento("fimDaCena", { cena: o.tempo.cena })].concat(expirarPor(o, "cena"));
    if (o.estado.frenesi) eventos = eventos.concat(encerrarFrenesi(o, "Fim da cena").eventos);
    var c = o.estado.compulsao;
    if (c) {
      var def = c.cla ? (C.CLAS[o.cla] || {}).compulsao : C.COMPULSOES[c.chave];
      if (def && def.duracao === "cena") eventos = eventos.concat(encerrarCompulsao(o, "Fim da cena").eventos);
    }
    if (o.estado.wassail) o.efeitos = o.efeitos.filter(function (e) { return e.chave !== "ultimaGota"; });
    return { ok: true, eventos: eventos };
  }

  function fimDoTurno(o) {
    o.tempo.turno++;
    return { ok: true, eventos: [evento("fimDoTurno", { turno: o.tempo.turno })].concat(expirarPor(o, "turno")) };
  }

  /* ---------------------------------------------------------------
     CRIAÇÃO (p. 135–154) — validação e pendências
     --------------------------------------------------------------- */

  function multiconjunto(valores) { return valores.slice().sort(function (a, b) { return b - a; }).join(","); }

  function validarCriacao(o) {
    var pend = [], conc = concessoes(o);
    function falta(etapa, t) { pend.push({ etapa: etapa, texto: t }); }
    if (!ehVampiro(o)) return { pendencias: [], regular: true, excecoes: [] };
    var ralo = ehSangueRalo(o);
    if (!texto(o.conceito).trim()) falta(1, "Defina o conceito.");
    if (!o.cla) falta(2, "Escolha o clã (ou Caitiff, ou Sangue-Ralo).");
    if (o.cla && o.cla !== "caitiff" && !ralo && !texto(o.senhor).trim()) falta(3, "Registre o Senhor (pode ser desconhecido).");
    var idade = C.IDADES[o.idade];
    if (ralo) { if (o.geracao < 14) falta(3, "Sangue-ralo é da 14ª à 16ª geração."); }
    else if (idade && idade.geracoes.indexOf(o.geracao) < 0) falta(3, idade.nome + ": geração " + idade.geracoes.join(" ou ") + ".");
    if (o.cla === "malkaviano" && ["fisico", "social", "mental"].indexOf(o.perdicaoParametro) < 0) falta(2, "Malkaviano: escolha a categoria afligida pela Perdição.");
    if (o.cla === "ventrue" && !texto(o.perdicaoParametro).trim()) falta(2, "Ventrue: defina a presa preferida.");
    /* Atributos 4/3/3/3/2/2/2/2/1. */
    var atr = C.ATRIBUTOS.map(function (a) { return o.atributos[a.chave] || 0; });
    if (multiconjunto(atr) !== multiconjunto(C.DISTRIBUICAO_DE_ATRIBUTOS)) falta(4, "Atributos: um com 4, três com 3, quatro com 2 e um com 1.");
    /* Habilidades pela distribuição escolhida. */
    var dist = C.DISTRIBUICOES_DE_HABILIDADES[o.criacao.distribuicao];
    if (!dist) falta(5, "Escolha a distribuição de Habilidades.");
    else {
      var hab = C.HABILIDADES.map(function (h) { return o.habilidades[h.chave] || 0; }).filter(Boolean);
      if (multiconjunto(hab) !== multiconjunto(dist.valores)) falta(5, dist.nome + ": " + resumoDist(dist.valores) + ".");
    }
    /* Especializações: grátis nas quatro, + 1 livre (+ a do Predador). */
    var esps = o.especializacoes;
    ["erudicao", "oficios", "performance", "ciencia"].forEach(function (k) {
      if (o.habilidades[k] && !esps.some(function (e) { return e.habilidade === k && e.origem === "gratis"; })) falta(5, (C.habilidade(k) || {}).nome + " precisa da especialização gratuita.");
    });
    var livres = esps.filter(function (e) { return e.origem === "criacao"; }).length;
    if (livres !== 1) falta(5, "Uma especialização livre (há " + livres + ").");
    esps.forEach(function (e) { if (!(valorDeHabilidade(o, e.habilidade, conc) > 0)) falta(5, "Especialização em " + (C.habilidade(e.habilidade) || {}).nome + " sem pontos na Habilidade."); });
    /* A mesma especialização duas vezes (a livre igual à do Predador)
       não soma nada: é pendência. */
    var vistas = {};
    especializacoesDaFicha(o, conc).forEach(function (e) {
      var k = e.habilidade + "|" + texto(e.nome).trim().toLowerCase();
      if (vistas[k]) falta(5, "Especialização repetida: " + (C.habilidade(e.habilidade) || {}).nome + " (" + e.nome + ").");
      vistas[k] = true;
    });
    /* Disciplinas. */
    var discs = Object.keys(o.disciplinas).filter(function (k) { return o.disciplinas[k] > 0; });
    var vals = discs.map(function (k) { return o.disciplinas[k]; });
    if (ralo) {
      var alq = temQualidadeRalo(o, "alquimista") ? 1 : 0;
      if (discs.some(function (k) { return k !== "alquimia"; })) falta(6, "Sangue-ralo não tem Disciplinas intrínsecas.");
      if ((o.disciplinas.alquimia || 0) !== alq) falta(6, alq ? "Alquimista Sangue-Ralo: 1 ponto em Alquimia." : "Alquimia só com a Qualidade Alquimista Sangue-Ralo.");
      if (alq && !o.metodoAlquimia) falta(6, "Escolha o método de Alquimia.");
      if (alq && o.formulas.filter(function (f) { return f.origem === "criacao"; }).length !== 1) falta(6, "Alquimista: uma fórmula de nível 1.");
    } else if (o.cla) {
      if (multiconjunto(vals) !== "2,1") falta(6, "Disciplinas: 2 pontos numa e 1 noutra.");
      if (o.cla !== "caitiff" && discs.some(function (k) { return disciplinasDoCla(o).indexOf(k) < 0; })) falta(6, "As Disciplinas da criação são as do clã.");
      if (discs.indexOf("alquimia") >= 0) falta(6, "Alquimia é dos sangues-ralos.");
    }
    poderesPendentes(o).forEach(function (x) { falta(6, "Escolha " + x.faltam + " poder(es) de " + DS().DISCIPLINAS[x.disciplina].nome + "."); });
    poderesDaFicha(o, conc).forEach(function (p) {
      var req = requisitosDoPoder(o, p.chave, conc);
      if (!req.ok) falta(p.origem === "predador" ? 7 : 6, req.motivo);
    });
    if (o.disciplinas.feiticaria && !o.rituais.some(function (r) { return r.origem === "criacao" && DS().ritual(r.chave).nivel === 1; })) falta(6, "Feitiçaria de Sangue: escolha um Ritual de nível 1.");
    /* Predador. */
    var semPredador = ralo || o.criacao.semPredador;
    if (!semPredador) {
      var p = C.PREDADORES[o.predador];
      if (!p) falta(7, "Escolha o tipo de Predador.");
      else {
        if (p.proibidoPara && p.proibidoPara.indexOf(o.cla) >= 0) falta(7, p.nome + " não é permitido para " + C.CLAS[o.cla].nome + ".");
        if (p.potenciaMaxima !== undefined && potencia(o, conc) > p.potenciaMaxima) falta(7, p.nome + ": Potência até " + p.potenciaMaxima + ".");
        if (o.criacao.predador.especializacao < 0) falta(7, "Escolha a especialização do Predador.");
        if (!o.criacao.predador.disciplina) falta(7, "Escolha a Disciplina do Predador.");
        else if (!predadorDisciplinaPermitida(o, p, o.criacao.predador.disciplina)) falta(7, "Essa Disciplina do Predador é só para Tremere.");
        else if (!o.criacao.predador.poder) falta(7, "Escolha o poder do ponto do Predador.");
        lista(p.escolhas).forEach(function (esco, i) {
          var feito = o.criacao.predador.escolhas[String(i)];
          if (esco.tipo === "defeitoUnico") { if (!feito) falta(7, "Escolha um dos Defeitos do Predador."); }
          else {
            var soma = feito && typeof feito === "object" ? Object.keys(feito).reduce(function (s, k) { return s + inteiro(feito[k], 0, 10); }, 0) : 0;
            if (soma !== esco.pontos) falta(7, "Reparta " + esco.pontos + " pontos (" + esco.entre.join(" / ") + ").");
          }
        });
      }
    }
    /* Vantagens: 7 pontos (+2 ancilla); Defeitos: 2 (+2 ancilla), além dos do Predador. */
    var extra = idade && !ralo ? idade.vantagens : 0;
    var extraDef = idade && !ralo ? idade.defeitos : 0;
    var qual = o.vantagens.filter(function (v) { return v.origem === "criacao" && C.VANTAGENS[v.chave].tipo !== "defeito"; }).reduce(function (s, v) { return s + v.pontos; }, 0);
    var defe = o.vantagens.filter(function (v) { return v.origem === "criacao" && C.VANTAGENS[v.chave].tipo === "defeito"; }).reduce(function (s, v) { return s + v.pontos; }, 0);
    qual += o.fichas.filter(function (x) { return x.origem === "criacao"; }).reduce(function (s, x) { return s + x.nivel; }, 0);
    o.fichas.forEach(function (x) {
      var fd = C.FICHAS_DE_CONHECIMENTO[x.ficha];
      if (fd.cla && fd.cla !== o.cla) falta(8, fd.nome + " é exclusiva do clã " + C.CLAS[fd.cla].nome + ".");
    });
    if (qual !== 7 + extra) falta(8, "Vantagens: " + (7 + extra) + " pontos (há " + qual + ").");
    if (defe !== 2 + extraDef) falta(8, "Defeitos: " + (2 + extraDef) + " pontos além dos do Predador (há " + defe + ").");
    o.vantagens.forEach(function (v) {
      var def = C.VANTAGENS[v.chave];
      if (def.proibidoPara && def.proibidoPara.indexOf(o.cla) >= 0) falta(8, def.nome + " não é permitido para " + C.CLAS[o.cla].nome + ".");
      if (def.requisito && def.requisito.idadeMinima === "ancilla" && o.idade !== "ancilla") falta(8, def.nome + " só para ancillae.");
      if (ralo && ["status", "mawla", "lacaios"].indexOf(v.chave) >= 0 && !v.compartilhada) falta(8, "Sangue-ralo não compra " + def.nome + " na criação.");
    });
    if (ralo) {
      var nq = o.sangueRalo.qualidades.length, nd = o.sangueRalo.defeitos.length;
      if (nq < 1 || nq > 3) falta(8, "Sangue-ralo: de 1 a 3 Qualidades de Sangue-Ralo.");
      if (nd !== nq) falta(8, "Sangue-ralo: o mesmo número de Defeitos e Qualidades de Sangue-Ralo.");
      o.sangueRalo.qualidades.forEach(function (k) {
        var cf = C.SANGUE_RALO.qualidades[k].conflitaCom;
        if (cf && o.sangueRalo.defeitos.indexOf(cf) >= 0) falta(8, C.SANGUE_RALO.qualidades[k].nome + " e " + C.SANGUE_RALO.defeitos[cf].nome + " se excluem.");
      });
    }
    /* Crenças. */
    var nc = o.convicoes.filter(function (c) { return texto(c.texto).trim(); }).length;
    if (nc < 1 || nc > 3) falta(9, "De 1 a 3 Convicções.");
    if (o.pilares.length !== nc) falta(9, "Um Pilar para cada Convicção.");
    o.pilares.forEach(function (pi) { if (!o.convicoes.some(function (c) { return c.id === pi.convicaoId; })) falta(9, "O Pilar " + (pi.nome || "") + " precisa de uma Convicção."); });
    if (!texto(o.ambicao).trim()) falta(10, "Defina a Ambição.");
    if (!texto(o.desejo).trim()) falta(10, "Defina o Desejo.");
    /* Experiência inicial. */
    var xpDisp = xpTotal(o) - xpGasto(o);
    if (xpDisp < 0) falta(11, "Experiência gasta além da disponível.");
    var excecoes = o.criacao.excecoes;
    var naoAutorizadas = excecoes.filter(function (e) { return !e.autorizada; });
    return { pendencias: pend, regular: !pend.length && !excecoes.length, excecoes: excecoes, completa: !pend.length && !naoAutorizadas.length };
  }

  function resumoDist(valores) {
    var c = {};
    valores.forEach(function (v) { c[v] = (c[v] || 0) + 1; });
    return Object.keys(c).sort(function (a, b) { return b - a; }).map(function (k) { return c[k] + " com " + k; }).join(", ");
  }

  /* Distribuir as concessões no bloco ao concluir: a Humanidade e a
     Potência viram valores próprios da ficha; Fome inicial 1. Os
     campos da criação ficam, para consulta. */
  function concluirCriacao(o) {
    var v = validarCriacao(o);
    if (!v.completa) return falha("Ainda há pendências na criação.", { pendencias: v.pendencias });
    o.criacao.concluida = true;
    var idade = C.IDADES[o.idade];
    if (ehSangueRalo(o)) o.potenciaBase = 0;
    else if (idade) o.potenciaBase = idade.potencia;
    if (o.fome === undefined || o.fome === null) o.fome = 1;
    return { ok: true, eventos: [evento("criacaoConcluida", { regular: v.regular })] };
  }

  /* Trocar uma escolha da criação: só os campos dela mudam; as
     concessões são recalculadas sozinhas (nada duplica). */
  function escolherPredador(o, chave, escolha) {
    if (o.criacao.concluida) return falha("A criação já foi concluída.");
    var p = C.PREDADORES[chave];
    if (chave && !p) return falha("Predador desconhecido.");
    o.predador = chave || "";
    var e = escolha || {};
    o.criacao.predador = { especializacao: inteiro(e.especializacao, -1, 10, -1), disciplina: texto(e.disciplina, 30), poder: texto(e.poder, 60), escolhas: objeto(e.escolhas) };
    return { ok: true, eventos: [evento("predador", { chave: o.predador })] };
  }

  /* ---------------------------------------------------------------
     HISTÓRICO, OPERAÇÕES, RESUMO
     --------------------------------------------------------------- */

  function registrarNoHistorico(o, ev) {
    o.historicoDeEventos.push(Object.assign({ noite: o.tempo.noite, cena: o.tempo.cena }, ev));
    if (o.historicoDeEventos.length > 200) o.historicoDeEventos = o.historicoDeEventos.slice(-200);
  }

  /* Aplica `fn(o)` uma vez por opId. Uma segunda chegada não muda nada. */
  function aplicarOperacao(o, opId, fn) {
    var id = texto(opId, 120);
    if (!id) return falha("Operação sem identificação.");
    if (o.operacoes.indexOf(id) >= 0) return { ok: true, repetida: true, eventos: [] };
    var r = fn(o) || { ok: true, eventos: [] };
    if (r.ok !== false) {
      o.operacoes.push(id);
      if (o.operacoes.length > LIMITE_OPERACOES) o.operacoes = o.operacoes.slice(-LIMITE_OPERACOES);
    }
    return r;
  }

  /* O resumo que a mesa lê sem abrir a ficha. Nada privado: sem
     Convicções, Pilares, Laços nem notas. */
  function resumoParaMesa(o) {
    var c = calcular(o);
    return {
      v: 1, natureza: o.natureza, cla: o.cla, predador: o.predador, geracao: o.geracao,
      fome: o.fome, humanidade: c.humanidade, maculas: o.maculas, potencia: c.potencia,
      vitalidade: { max: c.vitalidade.max, superficial: c.vitalidade.superficial, agravado: c.vitalidade.agravado },
      forcaDeVontade: { max: c.forcaDeVontade.max, superficial: c.forcaDeVontade.superficial, agravado: c.forcaDeVontade.agravado },
      estado: c.estado, frenesi: o.estado.frenesi ? o.estado.frenesi.tipo : "", compulsao: o.estado.compulsao ? o.estado.compulsao.chave : "",
      ressonancia: o.ressonancia ? { tipo: o.ressonancia.tipo, temperamento: o.ressonancia.temperamento } : null,
      xp: c.xp,
    };
  }

  global.RAMAVampiro = {
    VERSAO_BLOCO: VERSAO_BLOCO, NATUREZAS: NATUREZAS,
    fichaVazia: fichaVazia, normalizar: normalizar, inteiro: inteiro, novoId: novoId, copiar: copiar, evento: evento,
    concessoes: concessoes, calcular: calcular, trilha: trilha, estadoDe: estadoDe,
    valorDeAtributo: valorDeAtributo, valorDeHabilidade: valorDeHabilidade, valorDeDisciplina: valorDeDisciplina,
    humanidade: humanidade, potencia: potencia, limitesDePotencia: limitesDePotencia, gravidadeDaPerdicao: gravidadeDaPerdicao,
    vitalidadeMaxima: vitalidadeMaxima, fdvMaxima: fdvMaxima,
    poderesDaFicha: poderesDaFicha, temPoder: temPoder, vantagensDaFicha: vantagensDaFicha, temVantagem: temVantagem,
    pontosDeVantagem: pontosDeVantagem, especializacoesDaFicha: especializacoesDaFicha, ehSangueRalo: ehSangueRalo,
    sofrerDano: sofrerDano, gastarForcaDeVontade: gastarForcaDeVontade, curarSuperficial: curarSuperficial, curarAgravado: curarAgravado,
    curarComoMortal: curarComoMortal, tratarComMedicina: tratarComMedicina, penalidadesDeTrilha: penalidadesDeTrilha,
    aumentarFome: aumentarFome, checagemDeSangue: checagemDeSangue, checagens: checagens, ruborDeVida: ruborDeVida,
    montarParada: montarParada, rolarTeste: rolarTeste, rerrolarComFdV: rerrolarComFdV, concluirTeste: concluirTeste,
    consequenciaBestial: consequenciaBestial,
    iniciarCompulsao: iniciarCompulsao, encerrarCompulsao: encerrarCompulsao, repetirAcaoPerfeccionismo: repetirAcaoPerfeccionismo,
    paradaDeFrenesi: paradaDeFrenesi, testarFrenesi: testarFrenesi, entrarEmFrenesi: entrarEmFrenesi, encerrarFrenesi: encerrarFrenesi, assumirControle: assumirControle,
    adicionarMaculas: adicionarMaculas, testarRemorso: testarRemorso, aceitarDegeneracao: aceitarDegeneracao, mudarHumanidade: mudarHumanidade,
    eventoDePilar: eventoDePilar, transferirPilar: transferirPilar,
    entrarEmTorpor: entrarEmTorpor, despertarDoTorpor: despertarDoTorpor, estaquear: estaquear, removerEstaca: removerEstaca,
    morteFinal: morteFinal, luzDoSol: luzDoSol, fogo: fogo, despertarDeDia: despertarDeDia,
    ressonanciaAleatoria: ressonanciaAleatoria, definirRessonancia: definirRessonancia,
    planejarAlimentacao: planejarAlimentacao, alimentar: alimentar, doarSangue: doarSangue, paradaDeCaca: paradaDeCaca, dificuldadeDeCaca: dificuldadeDeCaca,
    beberDeVampiro: beberDeVampiro, paradaContraLaco: paradaContraLaco, enfraquecerLacos: enfraquecerLacos,
    diablerieTurno: diablerieTurno, diablerieConsumada: diablerieConsumada,
    custoDeNivel: custoDeNivel, custoDeCompra: custoDeCompra, validarCompra: validarCompra, comprar: comprar, receberXP: receberXP,
    podeAdquirirPoder: podeAdquirirPoder, requisitosDoPoder: requisitosDoPoder, poderesPendentes: poderesPendentes,
    adicionarEfeito: adicionarEfeito, removerEfeito: removerEfeito, temEfeito: temEfeito, expirarPor: expirarPor,
    inicioDaSessao: inicioDaSessao, fimDaSessao: fimDaSessao, cumprirDesejo: cumprirDesejo, recuperarFdV: recuperarFdV,
    novaNoite: novaNoite, novaCena: novaCena, fimDaCena: fimDaCena, fimDoTurno: fimDoTurno,
    validarCriacao: validarCriacao, concluirCriacao: concluirCriacao, escolherPredador: escolherPredador,
    registrarNoHistorico: registrarNoHistorico, aplicarOperacao: aplicarOperacao, resumoParaMesa: resumoParaMesa,
  };
})(typeof window !== "undefined" ? window : globalThis);
/* <<< js/vampiro/regras.js */

/* >>> js/vampiro/poderes.js */
/* =====================================================================
   R.A.M.A. — Vampiro: A Máscara (V5) · poderes, Rituais e Alquimia
   =====================================================================
   Ativar um poder tem fases, e cada uma é visível:
     1. declarar     ativarPoder(): confere posse, estado, custos;
     2. custos       Checagens de Sangue (com a rerrolagem da Potência para
                     poderes até o nível da tabela), FdV, Máculas;
     3. teste        a parada do poder (resultado PENDENTE, como todo teste);
     4. decisões     rerrolar com FdV, julgar contra a resistência;
     5. resolução    resolverPoder(): aplica o efeito definido;
     6. persistência o efeito ativo fica em `efeitos`, com a duração, e
                     expira no momento certo (regras.expirarPor).
   Uma falha na Checagem aumenta a Fome e NÃO cancela o poder (p. 217).
   Poderes mentais e narrativos: o motor resolve custo, teste e duração;
   o que o alvo faz é da mesa — nada aqui decide por outra pessoa.
   ===================================================================== */

(function (global) {
  "use strict";

  var R = global.RAMAVampiro;
  var C = global.RAMAVampiroCatalogo;
  var D = global.RAMAVampiroDados;
  var DS = global.RAMAVampiroDisciplinas;

  function falha(m, x) { return Object.assign({ ok: false, motivo: m, eventos: [] }, x || {}); }
  function evento(t, d) { return R.evento(t, d); }
  function lista(v) { return Array.isArray(v) ? v : []; }

  /* Os poderes disponíveis agora: os da ficha e os temporários
     (sangue-ralo pela Ressonância, Direto da Fonte). */
  function poderesDisponiveis(o) {
    var out = R.poderesDaFicha(o).map(function (p) { return p.chave; });
    o.efeitos.forEach(function (e) { lista(e.dados.poderes).forEach(function (k) { if (out.indexOf(k) < 0) out.push(k); }); });
    return out;
  }

  /* O que o poder vale para a mesa ler antes de usar. */
  function descreverPoder(o, chave) {
    var def = DS.poder(chave);
    if (!def) return null;
    var nivel = R.valorDeDisciplina(o, def.disciplina);
    var pot = C.potencia(R.potencia(o));
    var checks = def.custo && def.custo.checagens ? def.custo.checagens : 0;
    return {
      def: def, nivel: nivel,
      checagens: checks,
      rerrolaChecagem: checks > 0 && pot.rerrolagem >= def.nivel,
      ativo: o.efeitos.some(function (e) { return e.origem.tipo === "poder" && e.origem.chave === chave; }),
      passivo: def.duracao === "passiva",
    };
  }

  function valorDoEfeito(v, nivel, margem) {
    if (v === "nivel") return nivel;
    if (v === "metadeCima") return Math.ceil(nivel / 2);
    if (v === "margem") return margem || 0;
    return v;
  }

  /* Declarar e pagar. `x`: { parada (índice), alvo, contexto, dificuldade,
     oposicao, checagensExtras, modificadores, opcionais, surto }. */
  function ativarPoder(o, chave, x, rolador) {
    var op = x || {};
    var def = DS.poder(chave);
    if (!def) return falha("Poder desconhecido.");
    if (poderesDisponiveis(o).indexOf(chave) < 0) return falha("A ficha não tem " + def.nome + ".");
    if (def.duracao === "passiva" && !def.parada) return falha(def.nome + " é passivo: já vale sempre.");
    if (o.estado.morteFinal || o.estado.torpor) return falha("Não pode usar poderes agora.");
    var disc = DS.DISCIPLINAS[def.disciplina];
    if (o.estado.frenesi && disc.tipo !== "fisica") return falha("Em frenesi, só Disciplinas físicas.");
    if (o.estado.estacado && disc.tipo !== "mental") return falha("Estacado: só Disciplinas mentais.");
    if (def.limite === "cena" && o.marcas.cena["poder-" + chave]) return falha(def.nome + ": uma vez por cena.");
    var eventos = [];
    /* Custos. */
    var n = def.custo && def.custo.checagens ? def.custo.checagens : 0;
    if (def.custo && def.custo.ate) n = Math.max(1, Math.min(def.custo.ate, Number(op.checagens) || 1));
    if (def.custo && def.custo.porUso) n = Math.max(1, Math.min(10, Number(op.checagens) || 1));
    if (def.custo && def.custo.opcional && !op.comCusto) n = 0;
    n += Math.max(0, Number(op.checagensExtras) || 0);
    if (n) {
      if (o.natureza === "carnical") {
        if (def.nivel > 1) eventos = eventos.concat(R.sofrerDano(o, { trilha: "vitalidade", tipo: "agravado", valor: 1, naoDividir: true }).eventos);
      } else if (o.natureza === "vampiro") {
        if (o.fome >= 5) return falha("Com Fome 5 não se Inflama o Sangue por vontade (p. 211).", { fome5: true });
        var ch = R.checagens(o, n, { motivo: def.nome, nivelDoPoder: def.nivel, contexto: "poder" }, rolador);
        if (!ch.ok) return ch;
        eventos = eventos.concat(ch.eventos);
      }
    }
    if (def.custo && def.custo.fdv) eventos = eventos.concat(R.gastarForcaDeVontade(o, def.custo.fdv, def.nome).eventos);
    if (def.custo && def.custo.maculas) eventos = eventos.concat(R.adicionarMaculas(o, Math.max(1, Number(op.maculas) || 1), def.nome).eventos);
    if (def.limite === "cena") o.marcas.cena["poder-" + chave] = true;
    eventos.push(evento("poder", { chave: chave, nome: def.nome, checagens: n }));
    /* Teste. */
    var resultado = null;
    if (def.parada) {
      var par = def.parada[Math.max(0, Math.min(def.parada.length - 1, Number(op.parada) || 0))];
      var pedido = { atributo: par[0], contexto: lista(op.contexto), poder: chave, dificuldade: op.dificuldade !== undefined ? op.dificuldade : def.dificuldade, oposicao: op.oposicao, modificadores: op.modificadores, opcionais: op.opcionais, surto: op.surto, rotulo: def.nome };
      if (par[1] === "disciplina") pedido.disciplina = def.disciplina;
      else if (C.habilidade(par[1])) pedido.habilidade = par[1];
      else if (DS.DISCIPLINAS[par[1]]) pedido.disciplina = par[1];
      else if (C.atributo(par[1])) pedido.atributo2 = par[1];
      var r = R.rolarTeste(o, pedido, rolador);
      if (!r.ok) return Object.assign(r, { eventos: eventos.concat(r.eventos || []) });
      resultado = r.resultado;
      resultado.poder = chave;
      eventos = eventos.concat(r.eventos);
    }
    /* Sem teste: o efeito vale já. */
    if (!resultado) eventos = eventos.concat(aplicarEfeitoDoPoder(o, def, { margem: 0, critico: false }));
    return { ok: true, eventos: eventos, resultado: resultado };
  }

  /* Depois do teste concluído: vitória aplica o efeito do poder. A
     falha não devolve a Checagem (ela já foi feita). */
  function resolverPoder(o, resultado) {
    var def = DS.poder(resultado.poder);
    if (!def) return falha("Poder desconhecido.");
    if (resultado.pendente) {
      var c = R.concluirTeste(o, resultado, { semJulgamento: !resultado.classificacao.julgado });
      if (!c.ok) return c;
      var ev = c.eventos;
    }
    var cl = resultado.classificacao;
    var eventos = (ev || []).concat([evento("poderResolvido", { chave: def.chave, vitoria: cl.julgado ? cl.vitoria : null, margem: cl.margem || 0, critico: !!cl.vitoriaCritica })]);
    if (cl.julgado && !cl.vitoria) {
      if (cl.falhaTotal && def.falhaTotal) eventos.push(evento("falhaTotalDoPoder", { texto: def.falhaTotal }));
      return { ok: true, eventos: eventos };
    }
    return { ok: true, eventos: eventos.concat(aplicarEfeitoDoPoder(o, def, { margem: cl.margem || cl.sucessos, critico: !!cl.vitoriaCritica })) };
  }

  /* O efeito persistente (o que tem duração) entra em `efeitos`. */
  function aplicarEfeitoDoPoder(o, def, r) {
    var eventos = [];
    var nivel = R.valorDeDisciplina(o, def.disciplina);
    var ef = def.efeitos || {};
    var dados = {};
    if (ef.reduzSuperficial) dados.reducao = valorDoEfeito(ef.reduzSuperficial, nivel);
    if (ef.converteAgravado) dados.restante = valorDoEfeito(ef.converteAgravado, nivel);
    if (ef.ignoraPenalidadeVitalidade) {
      /* Poder Vindo da Dor: +1 Físico por nível de dano, até Surto + 6. */
      var dano = o.vitalidade.superficial + o.vitalidade.agravado;
      if (dano) {
        var teto = C.potencia(R.potencia(o)).surto + 6;
        var forca = R.valorDeAtributo(o, "forca");
        dados.atributos = { forca: Math.max(0, Math.min(dano, teto - forca)) };
      }
    }
    if (ef.forma) dados.forma = ef.forma;
    if (ef.potenciaTemporaria) dados.potencia = r.critico ? ef.potenciaCritico : ef.potenciaTemporaria;
    if (ef.vitalidade) dados.vitalidade = valorDoEfeito(ef.vitalidade, nivel);
    if (def.chave === "subjugarABesta") dados.alvo = true;
    var temDuracao = ["passiva", "uso", "turno"].indexOf(def.duracao) < 0 || ef.mods || Object.keys(dados).length;
    if (temDuracao && def.duracao !== "passiva") {
      var duracao = def.duracao === "ate desativar" ? "indefinida" : def.duracao === "doPoder" || def.duracao === "horas" ? "cena" : def.duracao === "dia" ? "noite" : def.duracao;
      R.adicionarEfeito(o, { chave: def.chave, nome: def.nome, origem: { tipo: "poder", chave: def.chave }, duracao: duracao, dados: dados });
      eventos.push(evento("efeito", { chave: def.chave, nome: def.nome, duracao: duracao }));
    }
    if (ef.perguntas) eventos.push(evento("perguntas", { quantas: valorDoEfeito(ef.perguntas, nivel, r.margem) }));
    if (ef.danoAgravado || ef.danoVeneno || ef.fomeNoAlvo || ef.danoSocial) eventos.push(evento("efeitoNoAlvo", { poder: def.chave, margem: r.margem, critico: r.critico }));
    return eventos;
  }

  /* Encerrar um poder ativo antes do fim (desativar). */
  function desativarPoder(o, chave) {
    var e = o.efeitos.filter(function (x) { return x.origem.tipo === "poder" && x.origem.chave === chave; })[0];
    if (!e) return falha("O poder não está ativo.");
    R.removerEfeito(o, e.id);
    return { ok: true, eventos: [evento("efeitoEncerrado", { chave: chave })] };
  }

  /* Direto da Fonte (Celeridade, Fortitude, Potência 4): quem bebe
     ganha metade dos pontos do doador e os poderes até esse nível, por
     uma noite. Chamado na ficha de quem bebe (o servidor opera as duas). */
  function receberDiretoDaFonte(o, disciplina, pontosDoDoador, poderesDoDoador) {
    var pontos = Math.floor(Number(pontosDoDoador) / 2);
    if (!pontos) return falha("O doador precisa de ao menos 2 pontos.");
    var poderes = lista(poderesDoDoador).filter(function (k) { var d = DS.poder(k); return d && d.disciplina === disciplina && d.nivel <= pontos && !d.amalgama; });
    var d = {}; d[disciplina] = pontos;
    R.adicionarEfeito(o, { chave: "diretoDaFonte", nome: DS.DISCIPLINAS[disciplina].nome + " Direto da Fonte", origem: { tipo: "sangue", chave: disciplina }, duracao: o.natureza === "vampiro" ? "alimentacao" : "noite", dados: { disciplinas: d, poderes: poderes } });
    return { ok: true, eventos: [evento("diretoDaFonte", { disciplina: disciplina, pontos: pontos })] };
  }

  /* ---------------- RITUAIS (p. 274–282) ---------------- */

  /* conhecido → em execução (5 min/nível) → teste → efeito ativo.
     `x`: { modificadores, dificuldadeExtra (círculo: +2) }. */
  function executarRitual(o, chave, x, rolador) {
    var op = x || {};
    var def = DS.ritual(chave);
    if (!def) return falha("Ritual desconhecido.");
    if (!o.rituais.some(function (r) { return r.chave === chave; })) return falha("A ficha não conhece " + def.nome + ".");
    if (R.valorDeDisciplina(o, "feiticaria") < def.nivel) return falha(def.nome + " exige Feitiçaria de Sangue " + def.nivel + ".");
    if (o.estado.frenesi || o.estado.torpor || o.estado.morteFinal) return falha("Não pode conduzir um Ritual agora.");
    var eventos = [];
    var n = def.custo.checagens || 1;
    if (o.fome >= 5) return falha("Com Fome 5 não se Inflama o Sangue por vontade.");
    var ch = R.checagens(o, n, { motivo: def.nome, contexto: "ritual" }, rolador);
    if (!ch.ok) return ch;
    eventos = eventos.concat(ch.eventos);
    if (def.maculasPossiveis && op.maculas) eventos = eventos.concat(R.adicionarMaculas(o, op.maculas, def.nome).eventos);
    eventos.push(evento("ritual", { chave: chave, nome: def.nome, minutos: def.execucaoMinutos, noites: def.execucaoNoites || 0 }));
    var dif = def.dificuldade + (def.circulo ? 2 : 0) + (Number(op.dificuldadeExtra) || 0);
    var r = R.rolarTeste(o, { atributo: "inteligencia", disciplina: "feiticaria", dificuldade: dif, modificadores: op.modificadores, rotulo: def.nome, contexto: ["ritual"] }, rolador);
    if (!r.ok) return Object.assign(r, { eventos: eventos.concat(r.eventos || []) });
    r.resultado.ritual = chave;
    return { ok: true, eventos: eventos.concat(r.eventos), resultado: r.resultado };
  }

  function resolverRitual(o, resultado) {
    var def = DS.ritual(resultado.ritual);
    if (!def) return falha("Ritual desconhecido.");
    var eventos = [];
    if (resultado.pendente) {
      var c = R.concluirTeste(o, resultado);
      if (!c.ok) return c;
      eventos = c.eventos;
    }
    var cl = resultado.classificacao;
    eventos.push(evento("ritualResolvido", { chave: def.chave, vitoria: cl.vitoria, critico: !!cl.vitoriaCritica }));
    if (!cl.vitoria) return { ok: true, eventos: eventos };
    var duracao = { cena: "cena", noite: "noite", dia: "noite", indefinida: "indefinida", uso: "uso" }[def.duracao] || (def.duracao ? "indefinida" : "uso");
    if (def.duracao) {
      var dados = Object.assign({}, def.efeitos || {});
      if (cl.vitoriaCritica) dados.critico = true;
      R.adicionarEfeito(o, { chave: def.chave, nome: def.nome, origem: { tipo: "ritual", chave: def.chave }, duracao: duracao, dados: dados });
      eventos.push(evento("efeito", { chave: def.chave, nome: def.nome, duracao: duracao }));
    }
    return { ok: true, eventos: eventos };
  }

  /* ---------------- ALQUIMIA SANGUE-RALO (p. 282–287) ---------------- */

  /* Destilar: o custo de DESTILAÇÃO (o vitae do Alquimista: uma
     Checagem) é separado do de ATIVAÇÃO (o do poder). */
  function destilar(o, chave, x, rolador) {
    var op = x || {};
    var def = DS.poder(chave);
    if (!def || !def.formula) return falha("Fórmula desconhecida.");
    if (!R.ehSangueRalo(o)) return falha("Alquimia é dos sangues-ralos.");
    if (!o.formulas.some(function (f) { return f.chave === chave; })) return falha("A ficha não conhece " + def.nome + ".");
    var alq = R.valorDeDisciplina(o, "alquimia");
    if (def.nivel > alq) return falha(def.nome + " exige Alquimia " + def.nivel + ".");
    var metodo = DS.METODOS_DE_ALQUIMIA[o.metodoAlquimia];
    if (!metodo) return falha("Escolha o método de Alquimia.");
    var mods = lista(op.modificadores).slice();
    if (o.metodoAlquimia === "fixatio" && !op.laboratorio) {
      if (def.nivel > 3) return falha("Sem laboratório, só fórmulas fracas (nível 3 ou menos).");
      mods.push({ fonte: "Sem laboratório", valor: metodo.semLaboratorio });
    }
    if (o.metodoAlquimia === "fixatio") {
      var guardadas = o.formulasProntas.filter(function (f) { return !f.consumida; }).length;
      var cap = 2 * (alq + R.pontosDeVantagem(o, "refugio"));
      if (guardadas >= cap) return falha("Armazenamento cheio: até 2 × (Alquimia + Refúgio) = " + cap + ".");
    }
    if (o.fome >= 5) return falha("Com Fome 5 não se Inflama o Sangue por vontade.");
    var ch = R.checagemDeSangue(o, { motivo: "Destilar " + def.nome, contexto: "destilacao" }, rolador);
    if (!ch.ok) return ch;
    var r = R.rolarTeste(o, { atributo: metodo.parada[0], disciplina: "alquimia", modificadores: mods, rotulo: "Destilar " + def.nome, contexto: ["alquimia"] }, rolador);
    if (!r.ok) return r;
    r.resultado.formula = chave;
    return { ok: true, eventos: ch.eventos.concat(r.eventos), resultado: r.resultado };
  }

  function concluirDestilacao(o, resultado) {
    var def = DS.poder(resultado.formula);
    if (resultado.pendente) {
      var c = R.concluirTeste(o, resultado, { semJulgamento: true });
      if (!c.ok) return c;
    }
    var q = DS.qualidadeDaDestilacao(resultado.classificacao.sucessos);
    if (q === "falha") return { ok: true, eventos: [evento("destilacao", { chave: def.chave, qualidade: q })] };
    var pronta = { id: R.novoId("fp"), chave: def.chave, qualidade: q, sucessos: resultado.classificacao.sucessos, metodo: o.metodoAlquimia, ativa: false, consumida: false };
    if (o.metodoAlquimia === "athanorCorporis") {
      /* Um poder ativo por vez: a nova substitui a anterior não usada. */
      o.formulasProntas.forEach(function (f) { if (f.metodo === "athanorCorporis" && !f.consumida) f.consumida = true; });
    }
    o.formulasProntas.push(pronta);
    return { ok: true, eventos: [evento("destilacao", { chave: def.chave, qualidade: q, sucessos: pronta.sucessos })], pronta: pronta };
  }

  /* Ativar uma fórmula pronta: consome-a UMA vez e paga a ativação. */
  function ativarFormula(o, id, x, rolador) {
    var f = o.formulasProntas.filter(function (y) { return y.id === id; })[0];
    if (!f) return falha("Fórmula pronta não encontrada.");
    if (f.consumida) return falha("Esta dose já foi usada.");
    var def = DS.poder(f.chave);
    f.consumida = true;
    var eventos = [evento("formulaAtivada", { chave: f.chave, qualidade: f.qualidade })];
    var n = def.custo && def.custo.checagens ? def.custo.checagens : 0;
    if (n) {
      if (o.fome >= 5) { f.consumida = false; return falha("Com Fome 5 não se Inflama o Sangue por vontade."); }
      var ch = R.checagens(o, n, { motivo: def.nome, contexto: "formula" }, rolador);
      if (!ch.ok) { f.consumida = false; return ch; }
      eventos = eventos.concat(ch.eventos);
    }
    var resultado = null;
    if (def.parada) {
      var par = def.parada[0];
      var pedido = { atributo: par[0], disciplina: "alquimia", rotulo: def.nome, oposicao: x && x.oposicao, dificuldade: x && x.dificuldade };
      if (C.atributo(par[1])) { delete pedido.disciplina; pedido.atributo2 = par[1]; }
      if (f.qualidade === "fraca") pedido.modificadores = [{ fonte: "Destilação fraca", valor: -1 }];
      if (f.qualidade === "aumentada") pedido.modificadores = [{ fonte: "Destilação aumentada", valor: 1 }];
      var r = R.rolarTeste(o, pedido, rolador);
      if (!r.ok) return Object.assign(r, { eventos: eventos });
      resultado = r.resultado;
      resultado.poder = f.chave;
    } else {
      eventos = eventos.concat(aplicarEfeitoDoPoder(o, def, { margem: f.sucessos, critico: false }));
    }
    if (o.metodoAlquimia === "calcinatio") eventos.push(evento("calcinatio", { sacia: Math.max(1, def.nivel), texto: "Beber do alvo sacia Fome = nível do poder (mínimo 1)." }));
    return { ok: true, eventos: eventos, resultado: resultado };
  }

  global.RAMAVampiroPoderes = {
    poderesDisponiveis: poderesDisponiveis, descreverPoder: descreverPoder,
    ativarPoder: ativarPoder, resolverPoder: resolverPoder, desativarPoder: desativarPoder, receberDiretoDaFonte: receberDiretoDaFonte,
    executarRitual: executarRitual, resolverRitual: resolverRitual,
    destilar: destilar, concluirDestilacao: concluirDestilacao, ativarFormula: ativarFormula,
  };
})(typeof window !== "undefined" ? window : globalThis);
/* <<< js/vampiro/poderes.js */

/* >>> js/vampiro/cronica.js */
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
/* <<< js/vampiro/cronica.js */
