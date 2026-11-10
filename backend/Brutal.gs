/* =====================================================================
   R.A.M.A. — BRUTAL (Corte Rápido) no servidor (v7.0)
   =====================================================================
   O módulo de BRUTAL: a Mesa da Diretora (CAMPANHA_BRUTAL) — o
   THRILLER da campanha. O servidor roda o MESMO motor do navegador: os
   arquivos de js/brutal/ estão copiados abaixo, entre marcadores
   (testes/gerar-brutal-gs.js; a suíte confere que as cópias batem).

     ler_brutal     membro: a Diretora recebe o Thriller inteiro; a
                    jogadora, a VISTA (sem Pontos de Horror, ficha do
                    Assassino, meta da Fuga, decisões e registro
                    privado). Com as Sobreviventes da campanha e quais
                    a conta pode conduzir
     brutal_operar  TODA mudança do Thriller: uma operação com opId,
                    validada pelo motor com o papel de quem pede (a
                    Diretora; a jogadora só pelas Sobreviventes que são
                    dela). Os dados são ROLADOS AQUI e entram no
                    histórico de rolagens da campanha. A segunda
                    chegada do mesmo opId devolve o estado sem aplicar
                    de novo; com `rev`, uma configuração feita sobre um
                    estado velho responde 'conflito'

   A ficha (ficha.brutal) é de quem a Sobrevivente É; o jogo mora aqui.
   A única escrita na ficha é o Desejo Obscuro revelado (para sempre).

   As ferramentas só respondem numa campanha de BRUTAL
   (exigirFerramenta 'diretora'); trocar o sistema guarda o Thriller.
   ===================================================================== */

function sistemaBrutal() {
  return {
    id: 'brutal',
    rotas: rotasDeBrutal,
    fichaDoSistema: function (ficha) { return !!ficha && !!ficha.brutal && typeof ficha.brutal === 'object'; },
    projecao: function (ficha) {
      try { return { brutal: RAMABrutal.resumoParaMesa(ficha.brutal) }; }
      catch (erro) { return {}; }
    },
    projecaoDoSistema: function (proj) { return !!proj && !!proj.brutal && typeof proj.brutal === 'object'; },
    painel: function (proj, o) {
      var b = proj.brutal;
      if (o.recursosVisiveis) return { brutal: b };
      return { brutal: { arquetipo: b.arquetipo, arquetipoNome: b.arquetipoNome } };
    },
    estadoDasMecanicas: { diretora: brutalTemMesa },
  };
}

function rotasDeBrutal() {
  return {
    ler_brutal: { publica: false, fn: acaoLerBrutal },
    brutal_operar: { publica: false, fn: acaoBrutalOperar },
  };
}

var MAX_OPS_BRUTAL = 120;
/* Operações em que um estado velho não deve sobrescrever o novo: com
   `rev`, o servidor recusa se a mesa mudou desde que a tela leu. */
var OPS_BRUTAL_COM_REV = ['configurarAssassino', 'configurarLacunas', 'vantagemDaMesa', 'novoThriller'];

function roladorDeBrutal(faces) {
  var f = Math.max(1, Math.floor(Number(faces) || 1));
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid());
  var n = 0;
  for (var i = 0; i < 4; i++) n = n * 256 + ((bytes[i] + 256) % 256);
  return (n % f) + 1;
}

function brutalTemMesa(campanhaId) {
  try { return lerLeves(ABAS.CAMPANHA_BRUTAL).some(function (r) { return String(r.campanhaId) === String(campanhaId); }); }
  catch (erro) { return false; }
}

function registroDoThriller(campanhaId) {
  try { return acharPor(ABAS.CAMPANHA_BRUTAL, 'campanhaId', String(campanhaId)); }
  catch (erro) { return null; }
}

function instalacaoDoThriller() {
  try { aba(ABAS.CAMPANHA_BRUTAL); return null; }
  catch (erro) { return { ok: false, erro: 'instalacao_incompleta', detalhe: 'CAMPANHA_BRUTAL' }; }
}

/* As Sobreviventes da campanha: id, nome, dona e o resumo (projeção). */
function personagensDeBrutal(campanhaId) {
  var regs = daCampanhaLeves(ABAS.PERSONAGENS, campanhaId);
  if (!regs.length) return [];
  var textos = lerCelulas(ABAS.PERSONAGENS, regs, 'resumo');
  return regs.map(function (r) { return { r: r, p: projecaoGuardada(textos[r._linha]) }; })
    .filter(function (x) { return !!x.p && x.p.tipo === 'brutal'; })
    .map(function (x) { return { id: String(x.r.id), nome: String(x.r.nome || '').slice(0, 120), ownerId: String(x.r.ownerId || ''), resumo: x.p.brutal || null }; });
}

function estadoDoThriller(registro, personagens) {
  var e = RAMABrutalMesa.normalizar(registro ? lerJson(registro.dadosJson, {}) : {});
  return RAMABrutalMesa.sincronizarElenco(e, personagens);
}

/* Quem pode o quê: a Diretora (mestre) tudo; a jogadora, as dela. */
function papelNoThriller(ctx, usuario, personagens) {
  var pode = personagens.filter(function (p) { return p.ownerId === String(usuario.id); }).map(function (p) { return p.id; });
  return { diretora: !!ctx.mestre, pode: pode };
}

function thrillerParaCliente(ctx, registro, estado, papel, personagens, usuario) {
  var rev = registro ? Number(registro.rev) || 0 : 0;
  var lista = personagens.map(function (p) { return { id: p.id, nome: p.nome, meu: p.ownerId === String(usuario.id), resumo: p.resumo }; });
  if (ctx.mestre) return { mestre: true, rev: rev, estado: estado, personagens: lista, pode: papel.pode };
  return { mestre: false, rev: rev, vista: RAMABrutalMesa.vista(estado, papel), personagens: lista, pode: papel.pode };
}

function acaoLerBrutal(corpo, usuario) {
  var ctx = contextoDaCampanha(corpo.campanhaId, usuario);
  if (!ctx.ok) return ctx;
  var foraDoSistema = exigirFerramenta(ctx, 'diretora');
  if (foraDoSistema) return foraDoSistema;
  if (ctx.papel === PAPEL_ESPECTADOR) return { ok: false, erro: 'sem_permissao' };
  var personagens = personagensDeBrutal(ctx.campanha.id);
  var registro = registroDoThriller(ctx.campanha.id);
  var estado = estadoDoThriller(registro, personagens);
  var papel = papelNoThriller(ctx, usuario, personagens);
  var dados = thrillerParaCliente(ctx, registro, estado, papel, personagens, usuario);
  return { ok: true, rev: dados.rev, dados: dados };
}

function gravarThriller(ctx, registro, estado, revAtual, feitas) {
  var json = JSON.stringify(estado);
  var voltas = 0;
  /* O registro e as rolagens mais antigas cedem primeiro quando não cabe. */
  while (json.length > MAX_CELULA && voltas < 20) {
    voltas++;
    estado.registro = estado.registro.slice(Math.ceil(estado.registro.length / 4) || 1);
    estado.privado = estado.privado.slice(Math.ceil(estado.privado.length / 4) || 1);
    estado.rolagens = estado.rolagens.slice(Math.ceil(estado.rolagens.length / 4) || 1);
    json = JSON.stringify(estado);
  }
  if (json.length > MAX_CELULA) return { ok: false, erro: 'dados_grandes' };
  var novo = { campanhaId: String(ctx.campanha.id), atualizadoEm: new Date().toISOString(), rev: revAtual + 1, opsJson: JSON.stringify(feitas.slice(-MAX_OPS_BRUTAL)), dadosJson: json };
  if (registro) atualizarLinha(ABAS.CAMPANHA_BRUTAL, registro._linha, Object.assign({}, registro, novo));
  else inserir(ABAS.CAMPANHA_BRUTAL, novo);
  marcarMesa(ctx.campanha.id, ['brutal']);
  return { ok: true, rev: revAtual + 1 };
}

/* Rolagem feita AQUI entra no histórico da campanha, como as do
   navegador (registrar_rolagem): o mesmo formato, um id próprio. A do
   Assassino segue "rolagens do mestre ocultas". */
function registrarRolagensDeBrutal(ctx, usuario, rolagens, opId) {
  if (!rolagens || !rolagens.length) return;
  try {
    var config = lerJson(ctx.campanha.dadosJson, {});
    rolagens.forEach(function (r, i) {
      var doAssassino = r.quem === 'assassino';
      var visibilidade = (doAssassino && config.rolagensMestreOcultas) ? VIS_ROLAGEM_OCULTA : VIS_ROLAGEM_PUBLICA;
      var parcelas = r.dificuldade ? [{ rotulo: 'Sucesso em', valor: r.dificuldade }] : [];
      var resultado = doAssassino ? (r.faces[0] === 6 ? '6!' : 'Ferida ' + r.faces[0]) : (r.superado ? 'superado' : 'falhou') + ' · ' + r.sucessos + ' sucesso(s)';
      var dados = { expressao: r.faces.length + 'd6', rolagens: r.faces, natural: null, total: doAssassino ? r.faces[0] : r.sucessos, selecao: null, parcelas: parcelas, critico: false, servidor: true };
      inserir(ABAS.CAMPANHA_ROLAGENS, {
        id: ('br-' + opId + '-' + i).slice(0, 80), campanhaId: ctx.campanha.id, autorUserId: usuario.id,
        personagemId: doAssassino ? '' : String(r.quem || ''), tipo: 'brutal',
        nome: (String(r.nome || '') + ' · ' + String(r.rotulo || 'Teste')).slice(0, 100) + ' · ' + resultado,
        visibilidade: visibilidade, criadoEm: new Date().toISOString(), dadosJson: JSON.stringify(dados),
      });
    });
    marcarMesa(ctx.campanha.id, ['rolagens']);
  } catch (erro) { /* o histórico é bônus: a operação já valeu */ }
}

/* O Desejo Obscuro revelado vai para a ficha (vale em qualquer Thriller).
   Repetir não muda nada: a ficha já está revelada. */
function gravarDesejoNaFicha(campanhaId, personagemId, opId) {
  try {
    var reg = acharPor(ABAS.PERSONAGENS, 'id', String(personagemId));
    if (!reg || String(reg.campanhaId || '') !== String(campanhaId)) return;
    var lido = lerFichaDoPersonagem(reg);
    if (!lido.ok) return;
    var ficha = comVinculoDaColuna(lido.ficha, reg);
    if (String(ficha.tipoFicha || '') !== 'brutal') return;
    ficha.brutal = RAMABrutal.normalizar(ficha.brutal);
    if (ficha.brutal.apegos.desejo.revelado) return;
    ficha.brutal.apegos.desejo.revelado = true;
    ficha.brutal.apegos.desejo.reveladoEm = new Date().toISOString();
    if (ficha.brutal.operacoes.indexOf(opId) < 0) ficha.brutal.operacoes.push(opId);
    try { ficha.resumoBrutal = RAMABrutal.resumoParaMesa(ficha.brutal); } catch (erro) { /* o painel recalcula */ }
    var quando = new Date().toISOString();
    ficha.atualizadoEm = quando;
    reg.atualizadoEm = quando;
    reg.rev = (Number(reg.rev) || 0) + 1;
    publicarFicha(reg, ficha, { operacao: opId });
    marcarMesa(campanhaId, ['personagens']);
  } catch (erro) { /* o Thriller já registrou; a ficha pode ser corrigida à mão */ }
}

function acaoBrutalOperar(corpo, usuario) {
  var opId = String(corpo.opId || '');
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(opId)) return { ok: false, erro: 'dados_invalidos' };
  var op = corpo.operacao && typeof corpo.operacao === 'object' && !Array.isArray(corpo.operacao) ? corpo.operacao : null;
  if (!op) return { ok: false, erro: 'dados_invalidos' };
  var tipo = String(op.tipo || '');
  if (RAMABrutalMesa.OPS_DA_DIRETORA.indexOf(tipo) < 0 && RAMABrutalMesa.OPS_DA_SOBREVIVENTE.indexOf(tipo) < 0) return { ok: false, erro: 'dados_invalidos' };

  return comTrava(function () {
    var ctx = contextoDaCampanha(corpo.campanhaId, usuario);
    if (!ctx.ok) return ctx;
    var foraDoSistema = exigirFerramenta(ctx, 'diretora');
    if (foraDoSistema) return foraDoSistema;
    if (ctx.papel === PAPEL_ESPECTADOR) return { ok: false, erro: 'sem_permissao' };
    if (RAMABrutalMesa.OPS_DA_DIRETORA.indexOf(tipo) >= 0 && !ctx.mestre) return { ok: false, erro: 'sem_permissao' };
    var inst = instalacaoDoThriller(); if (inst) return inst;

    var personagens = personagensDeBrutal(ctx.campanha.id);
    var registro = registroDoThriller(ctx.campanha.id);
    var revAtual = registro ? Number(registro.rev) || 0 : 0;
    var feitas = registro ? (lerJson(registro.opsJson, []) || []) : [];
    if (!Array.isArray(feitas)) feitas = [];
    var estado = estadoDoThriller(registro, personagens);
    var papel = papelNoThriller(ctx, usuario, personagens);

    /* Repetição (clique duplo, reconexão, outra aba): nada de novo. */
    if (feitas.indexOf(opId) >= 0) {
      return { ok: true, repetida: true, rev: revAtual, dados: thrillerParaCliente(ctx, registro, estado, papel, personagens, usuario) };
    }
    if (OPS_BRUTAL_COM_REV.indexOf(tipo) >= 0 && corpo.rev !== undefined && corpo.rev !== null && Number(corpo.rev) !== revAtual) {
      return { ok: false, erro: 'conflito', rev: revAtual, dados: thrillerParaCliente(ctx, registro, estado, papel, personagens, usuario) };
    }

    var r = RAMABrutalMesa.aplicar(estado, op, papel, roladorDeBrutal);
    if (!r.ok) return { ok: false, erro: 'dados_invalidos', motivo: r.motivo || '' };

    feitas.push(opId);
    var g = gravarThriller(ctx, registro, RAMABrutalMesa.normalizar(estado), revAtual, feitas);
    if (!g.ok) return g;
    registrarRolagensDeBrutal(ctx, usuario, r.rolagens, opId);
    (r.fichas || []).forEach(function (f) { if (f.desejoRevelado) gravarDesejoNaFicha(ctx.campanha.id, f.id, opId); });

    var registroNovo = registroDoThriller(ctx.campanha.id);
    var estadoNovo = estadoDoThriller(registroNovo, personagens);
    var eventos = (r.eventos || []).filter(function (e) { return ctx.mestre || !e.privado; }).map(function (e) { return e.texto; });
    return {
      ok: true, rev: g.rev,
      dados: thrillerParaCliente(ctx, registroNovo, estadoNovo, papel, personagens, usuario),
      resultado: { eventos: eventos, pendente: !!r.pendente, rolagens: r.rolagens || [], faltam: r.faltam === undefined ? null : r.faltam },
    };
  });
}

/* =====================================================================
   O MOTOR (cópia fiel de js/brutal/; não edite aqui)
   ===================================================================== */

/* >>> js/brutal/catalogo.js */
/* =====================================================================
   R.A.M.A. — BRUTAL · Corte Rápido · catálogo (v7.0)
   ---------------------------------------------------------------------
   Os dados do Fast Play "BRUTAL: Corte Rápido" (25 páginas), na forma
   que a ficha, a Mesa da Diretora, o servidor e o Catálogo leem — sem
   cópia. Os textos são resumos das regras, com a página do PDF.

   Só o que o PDF define entra como regra. O que ele deixa em aberto
   (a meta da Pilha de Fuga de cada Assassino, o custo de Tratar
   Feridas, o fim da habilidade da Valentona, o Estigma, o Nível de
   Brutalidade…) está em LACUNAS, e a mesa decide no ponto de uso —
   nunca com um número inventado.

   Este arquivo é copiado para backend/Brutal.gs
   (testes/gerar-brutal-gs.js); não use nada do navegador aqui.
   ===================================================================== */

(function (global) {
  "use strict";

  var FONTE = { sigla: "CR", nome: "BRUTAL — Corte Rápido", curto: "Corte Rápido" };
  function referencia(pagina) { return FONTE.nome + (pagina ? ", p. " + pagina : ""); }

  /* p. 3 e 5: limites. */
  var LIMITES = {
    pilha: 6,          // a Pilha Comum de uma Sobrevivente nunca passa de 6 (p. 3)
    pt: 10,            // Pontos de Tensão: começa em 0 e acumula até 10 (p. 5)
    dificuldade: 4,    // sucesso em 4 ou mais (p. 4)
    fugaMaxima: 6,     // a Pilha de Fuga nunca é maior que 6 (p. 22)
  };

  var CENAS = {
    livre:    { nome: "Livre",    falhas: "sacrificar", texto: "O perigo ainda não se revelou: dados que falham são SACRIFICADOS (vão para a Pilha da Diretora).", pagina: 4 },
    suspense: { nome: "Suspense", falhas: "sacrificar", texto: "Ainda sem o perigo revelado: dados que falham são SACRIFICADOS.", pagina: 4 },
    encontro: { nome: "Encontro", falhas: "descartar",  texto: "O perigo se revelou: dados que falham são DESCARTADOS (vão para a Pilha de Descarte).", pagina: 21 },
  };

  /* ---------------------------------------------------------------
     ESTILOS (p. 6) — usar um estilo seu reduz a Dificuldade em 1
     --------------------------------------------------------------- */
  var ESTILOS = {
    desenrolado: { nome: "Desenrolado", texto: "Reagir à surpresa, encarar situações incômodas e colaborar com os colegas no meio do caos.", pagina: 6 },
    firme:       { nome: "Firme",       texto: "Resistir a eventos danosos, manter-se estável sob tensão e impor a própria vontade.", pagina: 6 },
    ligeiro:     { nome: "Ligeiro",     texto: "Acrobacias, passar despercebida e enganar — em situações sociais ou numa fuga.", pagina: 6 },
    potente:     { nome: "Potente",     texto: "Manobras brutais, intimidar e quebrar barreiras, sociais e físicas, com os punhos.", pagina: 6 },
    sagaz:       { nome: "Sagaz",       texto: "Resolver problemas mirabolantes, desatar complexidades e persuadir em conflitos sociais.", pagina: 6 },
  };
  var ORDEM_ESTILOS = ["desenrolado", "firme", "ligeiro", "potente", "sagaz"];

  /* ---------------------------------------------------------------
     RECARGAS — quando uma Vantagem ou Habilidade volta a valer
     --------------------------------------------------------------- */
  var RECARGAS = {
    semRestricao:   { nome: "Sem restrição" },
    fimEncontro:    { nome: "Fim de um Encontro" },
    inicioEncontro: { nome: "Início de um Encontro" },
    inicioSessao:   { nome: "Início de uma sessão" },
    /* "Encontro, Livre" (Choque de Realidade): volta quando um Encontro
       acaba ou uma cena Livre começa — leitura registrada em LACUNAS. */
    encontroLivre:  { nome: "Encontro, Livre" },
    /* Buh! "Recarga: Livre": volta quando uma cena Livre começa. */
    livre:          { nome: "Livre" },
    /* Planejar Fuga: o campo traz "6 pts" (lacuna) — vale até o efeito
       pendente ser usado, ou o que a Diretora configurar. */
    planejarFuga:   { nome: "Confira a lacuna (o PDF diz \"6 pts\")" },
  };

  /* ---------------------------------------------------------------
     ARQUÉTIPOS (p. 6, 9–12) e INICIATIVA (p. 21)
     --------------------------------------------------------------- */
  var ARQUETIPOS = {
    atleta: {
      nome: "Atleta", adjetivos: "Energética · Esportista · Motivada", cor: "#5b5fc7", iniciativa: 2, pagina: 9,
      resumo: "Cresceu ouvindo que perder é para os fracos; a pressão que ninguém vê é o que talvez a mantenha viva.",
      estilos: ["potente", "ligeiro"],
      habilidade: { chave: "resiliencia", nome: "Resiliência", cena: "Sem restrição", recarga: "fimEncontro",
        texto: "Uma vez a cada Encontro, substitua o resultado de uma rolagem sua pelo valor de um dos seus Dados Marcadores." },
    },
    cetica: {
      nome: "Cética", adjetivos: "Centrada · Inquisitiva · Sensata", cor: "#6b6b70", iniciativa: 8, pagina: 9,
      resumo: "Para ela, toda anormalidade tem explicação lógica — o que pode ser o seu fim ou o que a mantém viva.",
      estilos: ["firme", "sagaz"],
      habilidade: { chave: "beneficioDaDuvida", nome: "Benefício da Dúvida", cena: "Sem restrição", recarga: "semRestricao",
        texto: "Pode repetir cada Teste de Susto ao menos uma vez." },
    },
    esbelta: {
      nome: "Esbelta", adjetivos: "Deslumbrante · Diva · Egocêntrica", cor: "#9b3fa3", iniciativa: 4, pagina: 10,
      resumo: "Beleza, riqueza e poder; as fofocas chegam primeiro a ela, e há quem se sacrificaria por ela.",
      estilos: ["desenrolado", "firme"],
      habilidade: { chave: "egocentrica", nome: "Egocêntrica", cena: "Sem restrição", recarga: "semRestricao",
        texto: "Recebe 1 Ponto de Tensão para cada 6 obtido numa rolagem." },
    },
    heroina: {
      nome: "Heroína", adjetivos: "Altruísta · Confiante · Valente", cor: "#c9a227", iniciativa: 1, pagina: 10,
      resumo: "Nunca pediu para ser heroína, mas é para ela que todos olham quando a matança começa.",
      estilos: ["potente", "sagaz"],
      habilidade: { chave: "ateOFim", nome: "Até o Fim", cena: "Encontro", recarga: "semRestricao",
        texto: "Num Encontro, ao Arriscar Tudo para se salvar, pode manter um único dado na Pilha Comum em vez de perder todos." },
    },
    inocente: {
      nome: "Inocente", adjetivos: "Ingênua · Passiva · Pura", cor: "#2c9c8f", iniciativa: 5, pagina: 11,
      resumo: "Confiável e bondosa; sua empatia amolece até os mais indiferentes, que estarão lá para protegê-la.",
      estilos: ["desenrolado", "sagaz"],
      habilidade: { chave: "carencia", nome: "Carência", cena: "Encontro", recarga: "inicioSessao",
        texto: "Uma vez por sessão, ao ser alvo de Ajudar Alguém num Encontro, quem ajuda não perde os dados doados: eles saem da Pilha de Descarte." },
    },
    nerd: {
      nome: "Nerd", adjetivos: "Engenhosa · Inteligente · Patética", cor: "#7a4fb0", iniciativa: 6, pagina: 11,
      resumo: "Sempre com a cabeça nos livros; agora saber demais é dádiva e maldição ao mesmo tempo.",
      estilos: ["ligeiro", "sagaz"],
      habilidade: { chave: "memoriaFotografica", nome: "Memória Fotográfica", cena: "Encontro", recarga: "inicioSessao",
        texto: "Uma vez por sessão, num Encontro, descobre quantos dados faltam para completar a sua Pilha de Fuga." },
    },
    relaxada: {
      nome: "Relaxada", adjetivos: "Chapada · Criativa · Tonta", cor: "#3a9a45", iniciativa: 7, pagina: 12,
      resumo: "Sempre de boa com a vida, cabeça na lua — o que pode fazer dela a primeira vítima.",
      estilos: ["desenrolado", "ligeiro"],
      habilidade: { chave: "ole", nome: "Olé", cena: "Sem restrição", recarga: "fimEncontro",
        texto: "Uma vez a cada Encontro, ao sofrer uma Ferida, rola o Dado Marcador de novo e fica com o novo resultado." },
    },
    valentona: {
      nome: "Valentona", adjetivos: "Briguenta · Insensível · Rebelde", cor: "#c0392b", iniciativa: 3, pagina: 12,
      resumo: "Nunca seguiu regras nem respeitou autoridade; a mesma brutalidade que a torna babaca a faz lutar até o fim.",
      estilos: ["firme", "potente"],
      habilidade: { chave: "caraLavada", nome: "Cara Lavada", cena: "Encontro", recarga: "inicioEncontro", lacuna: "caraLavada",
        texto: "Uma vez durante um Encontro, pode descartar um dado da sua Pilha de Fuga… (o texto termina aqui na p. 12 do Corte Rápido)." },
    },
  };
  /* A ordem das fichas do PDF (p. 9–12). */
  var ORDEM_ARQUETIPOS = ["atleta", "cetica", "esbelta", "heroina", "inocente", "nerd", "relaxada", "valentona"];
  /* A ordem de Iniciativa (p. 21): o Assassino é sempre o último. */
  var INICIATIVA = ["heroina", "atleta", "valentona", "esbelta", "inocente", "nerd", "relaxada", "cetica"];

  /* ---------------------------------------------------------------
     APEGOS (p. 7)
     --------------------------------------------------------------- */
  var APEGOS = {
    item:    { nome: "Item Icônico",    pt: 2, limite: "sessao", pagina: 7, texto: "Objeto que acompanha a Sobrevivente; não some nem quebra (a não ser que ela queira) e não serve como Recurso. Usá-lo numa ação: +2 PT, uma vez por sessão, só pela dona." },
    relacao: { nome: "Relação Afetiva", pt: 2, limite: "sessao", pagina: 7, texto: "Uma pessoa ou animal que é porto seguro. Passar tempo com ela numa sessão: +2 PT, uma vez por sessão." },
    desejo:  { nome: "Desejo Obscuro",  pt: 3, limite: "unico",  pagina: 7, texto: "Vontade, impulso ou segredo guardado a sete chaves. Revelá-lo num Thriller: +3 PT; revelado, não pode ser usado de novo." },
  };

  /* ---------------------------------------------------------------
     VANTAGENS (p. 8) — fora de Encontro; custo em PT e recarga
     efeito: o que o motor aplica (js/brutal/mesa.js)
     --------------------------------------------------------------- */
  var VANTAGENS = {
    choqueDeRealidade: { nome: "Choque de Realidade", estilo: null, custo: 6, recarga: "encontroLivre", efeito: "dado", pagina: 8,
      texto: "Você recebe um dado adicional para a sua Pilha Comum." },
    tomarJeito: { nome: "Tomar Jeito", estilo: null, custo: 3, recarga: "semRestricao", efeito: "recuperarEstilo", pagina: 8,
      texto: "Você recupera um Estilo Incapacitado seu ou de outra Sobrevivente." },
    tratarFeridas: { nome: "Tratar Feridas", estilo: null, custo: null, custoTexto: "Confira a descrição", recarga: "fimEncontro", efeito: "dado", pagina: 8, lacuna: "tratarFeridas",
      texto: "Você recebe um dado adicional para a sua Pilha Comum. (O PDF manda conferir o custo na descrição, que não o informa.)" },
    cacarRecursos: { nome: "Caçar Recursos", estilo: "sagaz", custo: 3, recarga: "semRestricao", efeito: "recurso", pagina: 8, lacuna: "cacarRecursos",
      texto: "A seu critério, recebe um Recurso que não estava na cena nem com você, desde que faça sentido na narrativa. Recursos têm um uso e reduzem a dificuldade de um teste em 1." },
    compartilharForcas: { nome: "Compartilhar Forças", estilo: "desenrolado", custo: null, custoTexto: "Os PT transferidos", recarga: "fimEncontro", efeito: "transferirPt", pagina: 8,
      texto: "Transfere quantos Pontos de Tensão quiser para outra Sobrevivente." },
    planejarFuga: { nome: "Planejar Fuga", estilo: "ligeiro", custo: 3, recarga: "planejarFuga", efeito: "fugaNoEncontro", pagina: 8, lacuna: "planejarFuga",
      texto: "No começo do próximo Encontro, pode mover um dado da Pilha Comum para a Pilha de Fuga." },
    resistirADor: { nome: "Resistir à Dor", estilo: "firme", custo: 2, recarga: "fimEncontro", efeito: "dado", pagina: 8,
      texto: "Você recebe um dado adicional para a sua Pilha Comum." },
    surpreender: { nome: "Surpreender", estilo: "potente", custo: 3, recarga: "fimEncontro", efeito: "sucessoPartir", pagina: 8,
      texto: "Garante um sucesso no seu próximo teste de Partir Para Cima." },
  };
  var ORDEM_VANTAGENS = ["choqueDeRealidade", "tomarJeito", "tratarFeridas", "cacarRecursos", "compartilharForcas", "planejarFuga", "resistirADor", "surpreender"];

  /* Os efeitos que uma Vantagem da mesa pode ter (a Diretora cria). */
  var EFEITOS_DE_VANTAGEM = {
    dado:            { nome: "+1 dado na Pilha Comum" },
    reduzirFerida:   { nome: "Reduz a próxima Ferida", valor: true },
    sucessoPartir:   { nome: "Um sucesso garantido no próximo Partir Para Cima" },
    fugaNoEncontro:  { nome: "Mover 1 dado para a Pilha de Fuga no próximo Encontro" },
    recurso:         { nome: "Recebe um Recurso (1 uso)" },
    recuperarEstilo: { nome: "Recupera um Estilo Incapacitado" },
    transferirPt:    { nome: "Transfere PT para outra Sobrevivente" },
    manual:          { nome: "Só registra (a mesa resolve)" },
  };

  /* ---------------------------------------------------------------
     AÇÕES DE ENCONTRO (p. 22–23)
     --------------------------------------------------------------- */
  var ACOES_ENCONTRO = {
    ajudarAlguem:     { nome: "Ajudar Alguém", estilo: "livre", teste: "contagem", pagina: 22,
      texto: "Teste num Estilo apropriado. Os dados que derem sucesso são doados a uma Sobrevivente à sua escolha; os que falharem não são descartados." },
    arriscarTudo:     { nome: "Arriscar Tudo", estilo: null, teste: null, pagina: 22,
      texto: "Escolha uma Sobrevivente (pode ser você) para escapar do Encontro na hora; você descarta todos os seus dados. Uma Sobrevivente por Encontro, um uso por sessão, e nunca se você for a última na cena." },
    distrair:         { nome: "Distrair", estilo: "desenrolado", teste: "complexo", pagina: 22,
      texto: "Teste Complexo Desenrolado. Superado, a Diretora precisa gastar 1 dado comum e 3 Pontos de Horror para MATAR na vez dela. Acumula." },
    partirParaCima:   { nome: "Partir Para Cima", estilo: "potente", teste: "comum", pagina: 23,
      texto: "Teste Potente. Com ao menos um sucesso, a Diretora descarta um dado." },
    recuperarFolego:  { nome: "Recuperar Fôlego", estilo: null, teste: null, pagina: 23,
      texto: "Você recebe +1 dado comum na sua Pilha." },
    vazarDali:        { nome: "Vazar Dali", estilo: "ligeiro", teste: "contagem", pagina: 23,
      texto: "Teste Ligeiro. Cada sucesso vai para a Pilha de Fuga; cada 6 puxa mais um dado da Pilha Comum (ou, sem dados nela, da Pilha de Descarte) para a Fuga." },
  };
  var ORDEM_ACOES_ENCONTRO = ["ajudarAlguem", "arriscarTudo", "distrair", "partirParaCima", "recuperarFolego", "vazarDali"];

  /* ---------------------------------------------------------------
     AÇÕES DO ASSASSINO (p. 13–14) e APAVOROS (p. 15)
     --------------------------------------------------------------- */
  var ACOES_ASSASSINO = {
    assustar:  { nome: "Assustar",  tipo: "geral", cena: ["encontro", "livre"], custo: 0, pagina: 13,
      texto: "Força um Teste de Susto nas Sobreviventes, até o número de Testes de Susto por Encontro do Assassino. Se alguém suspirar de medo ou se contorcer de nojo, +1 PH." },
    dificultar:{ nome: "Dificultar", tipo: "geral", cena: ["encontro"], custo: 4, pagina: 13,
      texto: "No início de um Encontro, aumenta a Pilha de Fuga em 1." },
    escapar:   { nome: "Escapar",   tipo: "geral", cena: ["encontro"], custo: 0, pagina: 13,
      texto: "Na sua vez, retira-se do Encontro, encerrando a cena, e recebe 1 dado na Pilha." },
    ferir:     { nome: "Ferir",     tipo: "geral", cena: ["encontro"], custo: 0, pagina: 13,
      texto: "Escolha uma Sobrevivente e role um dado: 6 a mata na hora; 1 a 5 vira o Dado Marcador da Ferida (somado à Ferida que ela já tiver). Cada FERIR dá 1 Sequela; a Ferida não pode ser reduzida abaixo das Sequelas. O dado rolado é descartado." },
    matar:     { nome: "Matar",     tipo: "geral", cena: ["encontro", "livre"], custo: 0, pagina: 13,
      texto: "Num Encontro, mata uma Sobrevivente com menos dados que a sua Pilha. Em qualquer cena, pode matar pela ação POSSUIR." },
    mutilar:   { nome: "Mutilar",   tipo: "geral", cena: ["encontro", "livre"], custo: 0, pagina: 13,
      texto: "Ao tirar 6 num FERIR, descarta o dado e deixa o alvo vivo com mais 3 Sequelas e uma última chance de correr. Recebe 4 PH." },
    acidentar: { nome: "Acidentar", tipo: "unica", cena: ["livre"], custo: 4, pagina: 14,
      texto: "Ao ASSUSTAR o grupo fora de um Encontro, pode FERIR uma Sobrevivente que falhou no teste." },
    devorar:   { nome: "Devorar",   tipo: "unica", cena: ["encontro", "livre"], custo: 0, pagina: 14,
      texto: "Quando uma Sobrevivente anunciar um 6 num teste, recebe 1 PH; ela mantém o sucesso." },
    incapacitar:{ nome: "Incapacitar", tipo: "unica", cena: ["encontro"], custo: 4, pagina: 14,
      texto: "Ao FERIR uma Sobrevivente num Encontro, incapacita um dos Estilos dela (e a Vantagem desse Estilo)." },
    possuir:   { nome: "Possuir",   tipo: "unica", cena: ["encontro"], custo: 0, pagina: 14,
      texto: "Dá à Sobrevivente um Dado Marcador 1, que sobe 1 a cada dado falho que ela rolar. No 6, em qualquer cena, você pode MATAR uma Sobrevivente por meio da possuída, sem as condições do MATAR; num Encontro, isso acontece na vez da possuída, que perde a vez. O marcador é descartado." },
    segurar:   { nome: "Segurar",   tipo: "unica", cena: ["encontro"], custo: 5, pagina: 14,
      texto: "Ao FERIR sem matar, imobiliza a Sobrevivente: ela não move dados para a Pilha de Fuga e a Ferida sobe 1 no começo de cada turno dela. As outras podem fazer Testes Complexos para livrá-la." },
    restringir:{ nome: "Restringir", tipo: "unica", cena: ["encontro"], custo: 0, pagina: 14,
      texto: "Dá um Dado Marcador 3: enquanto existir, todos os testes da Sobrevivente são Complexos. Testes Ligeiros ou Sagazes o reduzem em 1 por sucesso; falhar aumenta em 1 e dá Feridas iguais ao valor. Some ao zerar." },
  };

  var APAVOROS = {
    buh:               { nome: "Buh!", cena: "Livre", recarga: "livre", custo: 4, pagina: 15,
      texto: "No início de um Encontro, provoca um Teste de Susto em todas as Sobreviventes da cena, sem gastar os Testes de Susto do Encontro." },
    mudandoDePlanos:   { nome: "Mudando de Planos!", cena: "Livre", recarga: "fimEncontro", custo: 5, pagina: 15,
      texto: "Logo após o fim de um Encontro, troca uma Ação Única por outra da mesma Ameaça." },
    sintoCheiroDeSangue: { nome: "Sinto Cheiro de Sangue!", cena: "Encontro", recarga: "inicioEncontro", custo: null, custoPorInterprete: 2, pagina: 15,
      texto: "Ao MATAR uma Sobrevivente pela primeira vez num Encontro, força as vivas a descartar 1 dado. Custa 2 PH por Intérprete do grupo." },
    suaHoraChegou:     { nome: "Sua Hora Chegou!", cena: "Encontro", recarga: "fimEncontro", custo: 3, pagina: 15,
      texto: "No início de um Encontro, aumenta em 1 um Dado Marcador da mesa, menos os de Ferida." },
  };

  /* ---------------------------------------------------------------
     AMEAÇAS (p. 11, 16) — as quatro descritas no Corte Rápido; as
     outras só aparecem pelo nome nas fichas prontas (definida: false)
     --------------------------------------------------------------- */
  var AMEACAS = {
    assombracao: { nome: "Assombração", adjetivos: "Etérea · Macabra · Nefasta", representante: "sangria", definida: true, pagina: 16,
      acoesUnicas: ["acidentar", "incapacitar", "possuir"], intento: "assombracao",
      texto: "Caminha entre os mortos e os vivos, presa a este plano por vingança, proteção ou rancor." },
    brutamontes: { nome: "Brutamontes", adjetivos: "Amedrontador · Brutal · Resiliente", representante: "bruto", definida: true, pagina: 16,
      acoesUnicas: ["incapacitar", "segurar"], intento: "brutamontes",
      texto: "Forte, grande e resistente; um predador nato que raramente poupa esforço." },
    estrategico: { nome: "Estratégico", adjetivos: "Calculista · Cruel · Frio", representante: "rato", definida: true, pagina: 16,
      acoesUnicas: ["acidentar", "devorar", "incapacitar", "restringir"], intento: "estrategico",
      texto: "Sabe o que quer, quando e como; paciente, ardiloso e sádico." },
    mestre:      { nome: "Mestre", adjetivos: "Influente · Líder · Manipulador", representante: "profeta", definida: true, pagina: 16,
      acoesUnicas: ["segurar", "possuir", "devorar", "incapacitar"], intento: "mestre",
      texto: "Tema o que os seguidores dele são capazes de fazer: um culto, um político, uma histeria coletiva, um vírus." },
    carniceiro:  { nome: "Carniceiro", definida: false, pagina: 17, acoesUnicas: [], intento: "",
      texto: "Citada nas fichas do Bruto e do Profeta; não é descrita no Corte Rápido." },
    amaldicoada: { nome: "Amaldiçoada", definida: false, pagina: 18, acoesUnicas: [], intento: "",
      texto: "Citada na ficha da Sangria; não é descrita no Corte Rápido." },
    perseguidor: { nome: "Perseguidor", definida: false, pagina: 19, acoesUnicas: [], intento: "",
      texto: "Citada na ficha do Rato; não é descrita no Corte Rápido." },
  };
  var AMEACAS_DEFINIDAS = ["assombracao", "brutamontes", "estrategico", "mestre"];

  /* ---------------------------------------------------------------
     INTENTOS (p. 12, 16) — PH ganhos. auto: o motor verifica sozinho
     --------------------------------------------------------------- */
  var INTENTOS_HORRIVEIS = {
    beijo:          { texto: "Sobreviventes se beijam.", ph: 1, auto: false },
    morteEncontro:  { texto: "Sobrevivente morre durante um Encontro.", ph: 1, auto: true },
    feridaEncontro: { texto: "Sobrevivente sai com uma Ferida de um Encontro.", ph: 1, auto: true },
    choque:         { texto: "Sobrevivente usa a Vantagem Choque de Realidade.", ph: 1, auto: true },
    sustoFalha:     { texto: "Sobrevivente falha num Teste de Susto.", ph: 1, auto: true },
    armadilha:      { texto: "Sobrevivente cai numa Armadilha.", ph: 2, auto: false },
    primeiroTurno:  { texto: "Todas as Sobreviventes tentam escapar de um Encontro no primeiro turno.", ph: 4, auto: true },
  };
  var ORDEM_INTENTOS = ["beijo", "morteEncontro", "feridaEncontro", "choque", "sustoFalha", "armadilha", "primeiroTurno"];
  var INTENTOS_UNICOS = {
    assombracao: { texto: "Ao impor um Teste de Susto, recebe PH igual ao número de Sobreviventes que falharem.", auto: true },
    brutamontes: { texto: "Quando uma Sobrevivente falha num teste de Partir Para Cima, recebe 2 PH.", auto: true },
    estrategico: { texto: "Recebe 1 PH por Armadilha ativada num Suspense.", auto: true },
    mestre:      { texto: "Recebe 1 PH toda vez que uma Intérprete obtém a primeira Sequela na sessão.", auto: true },
  };

  /* ---------------------------------------------------------------
     ASSASSINOS PRONTOS (p. 17–20)
     --------------------------------------------------------------- */
  var ASSASSINOS = {
    bruto:   { nome: "Bruto", ameacas: ["brutamontes", "carniceiro"], dados: 6, ph: 3, sustos: 1, acoesUnicas: ["incapacitar", "segurar"], apavoro: "sintoCheiroDeSangue", pagina: 17,
      resumo: "Um gigante recluso numa mansão de campo; o martelo enferrujado do pai serve para acabar com quem invade o seu exílio." },
    sangria: { nome: "Sangria", ameacas: ["assombracao", "amaldicoada"], dados: 4, ph: 2, sustos: 3, acoesUnicas: ["acidentar", "possuir"], apavoro: "buh", pagina: 18,
      resumo: "A assombração invocada diante do espelho: responde a qualquer pergunta, mas cobra um preço carmesim." },
    rato:    { nome: "Rato", ameacas: ["estrategico", "perseguidor"], dados: 3, ph: 1, sustos: 4, acoesUnicas: ["acidentar", "restringir"], apavoro: "mudandoDePlanos", pagina: 19,
      resumo: "Uma lenda de fóruns que monta a cena perfeita de slasher, sempre um passo à frente das vítimas." },
    profeta: { nome: "Profeta", ameacas: ["mestre", "carniceiro"], dados: 3, ph: 1, sustos: 3, acoesUnicas: ["devorar", "possuir"], apavoro: "suaHoraChegou", pagina: 20,
      resumo: "Líder de uma igreja de sangue numa cabana na floresta; manipula os seguidores e pratica hemomancia." },
  };
  var ORDEM_ASSASSINOS = ["bruto", "sangria", "rato", "profeta"];

  /* ---------------------------------------------------------------
     LACUNAS — o que o Corte Rápido não define. Cada uma diz onde a
     mesa decide. As "leituras" são as que o R.A.M.A. usa enquanto a
     Diretora não muda (Mesa da Diretora → Lacunas do Corte Rápido).
     --------------------------------------------------------------- */
  var LACUNAS = {
    metaFuga: { titulo: "Tamanho da Pilha de Fuga", onde: "Ao iniciar cada Encontro",
      texto: "Cada Assassino muda o tamanho da Pilha de Fuga \"de uma maneira descrita em sua ficha\" (p. 22), mas as fichas prontas não trazem o valor. A Diretora escolhe de 1 a 6 ao iniciar o Encontro (Dificultar soma 1, até 6)." },
    tratarFeridas: { titulo: "Custo de Tratar Feridas", onde: "Lacunas da mesa",
      texto: "O custo é \"Confira a descrição\", e a descrição não diz (p. 8; o efeito repete o de Choque de Realidade). Até a Diretora definir o custo, a Vantagem fica indisponível, com o motivo." },
    cacarRecursos: { titulo: "Caçar Recursos: custo e recarga trocados", onde: "Vantagem",
      texto: "A ficha traz \"Recarga: 3 pts\" e \"Custo: Sem restrição\" (p. 8). Leitura: custo 3 PT, recarga sem restrição." },
    planejarFuga: { titulo: "Planejar Fuga: \"Recarga: 6 pts\"", onde: "Lacunas da mesa",
      texto: "A recarga traz um valor em pontos (p. 8). Leitura: vale até o efeito pendente ser usado no próximo Encontro; a Diretora pode trocar para \"Fim de um Encontro\" ou \"Sem restrição\"." },
    caraLavada: { titulo: "Cara Lavada (Valentona)", onde: "Na hora do uso",
      texto: "O texto termina em \"descartar um dado da sua Pilha de Fuga\" (p. 12). O R.A.M.A. descarta o dado e abre uma decisão para a Diretora resolver o resto." },
    fonteDosDados: { titulo: "De onde vem o dado recebido", onde: "Lacunas da mesa",
      texto: "Recuperar Fôlego, Choque de Realidade, Resistir à Dor e Tratar Feridas dão \"um dado\" sem dizer de onde. Leitura: da Pilha de Descarte quando houver; senão, um dado novo. A Diretora pode escolher \"sempre do Descarte\" ou \"sempre novo\"." },
    ferir: { titulo: "De quem é o dado do FERIR", onde: "Ação FERIR",
      texto: "\"Rolar um de seus dados\" (p. 13). Leitura: um dado da Pilha da Diretora, gasto e descartado (o turno do Assassino \"gasta dados da sua Pilha\", p. 23)." },
    feridaAlem: { titulo: "Ferida acima de 6", onde: "Decisão da Diretora",
      texto: "Feridas se somam, mas o Corte Rápido não diz o que acontece quando passam do valor de um dado. O R.A.M.A. avisa a Diretora e não mata ninguém sozinho." },
    entradaEncontro: { titulo: "Condição do Encontro", onde: "Ao iniciar",
      texto: "\"Quando a sua Pilha superar em quantidade a de qualquer Intérprete\" (p. 21). Leitura: maior que a Pilha Comum de pelo menos uma Sobrevivente presente." },
    sustosForaDoEncontro: { titulo: "Testes de Susto fora do Encontro", onde: "Ação ASSUSTAR",
      texto: "O limite das fichas é \"por Encontro\" (p. 17–20). Fora dele, o R.A.M.A. não conta limite." },
    estilosIncapacitados: { titulo: "Estilo Incapacitado nos testes", onde: "Testes",
      texto: "O PDF diz que o Estilo Incapacitado impede a Vantagem dele (p. 8, 14). Leitura: ele também deixa de reduzir a Dificuldade enquanto estiver incapacitado." },
    recursosPorTeste: { titulo: "Recursos por teste", onde: "Testes",
      texto: "Cada Recurso reduz a Dificuldade em 1 (p. 8). O PDF não limita quantos num teste; o R.A.M.A. aceita vários, com Dificuldade mínima 2 (um 1 nunca é sucesso)." },
    excessoDeDados: { titulo: "Dados além do limite de 6", onde: "Doações e fim do Encontro",
      texto: "A Pilha Comum nunca passa de 6 (p. 3). O que passaria (uma doação, a Fuga voltando) fica com quem doou ou vai para a Pilha de Descarte." },
    morteDados: { titulo: "Os dados de quem morre", onde: "Morte",
      texto: "O PDF não diz. Os dados da Pilha Comum de uma Sobrevivente morta saem de jogo (ficam com ela)." },
    distrair: { titulo: "Duração do Distrair", onde: "Encontro",
      texto: "\"Durante sua vez\" e \"cumulativa\" (p. 22). Leitura: vale para a próxima vez do Assassino e zera depois dela." },
    estigma: { titulo: "Estigma e Nível de Brutalidade", onde: "Ficha do Assassino",
      texto: "O Corte Rápido cita o Estigma (da Ameaça Principal) e o Nível de Brutalidade, mas não os descreve. Ficam como texto livre; um Assassino personalizado recebe dados, PH e Testes de Susto à mão." },
    carniceiro: { titulo: "Ameaças sem descrição", onde: "Assassinos prontos",
      texto: "Carniceiro, Amaldiçoada e Perseguidor aparecem só pelo nome; não trazem Ações nem Intentos." },
    vantagensDoPrint: { titulo: "Vantagens fora do Corte Rápido", onde: "Vantagens da mesa",
      texto: "Vantagens de outras versões de BRUTAL não estão no PDF. A Diretora pode criá-las como Vantagens da mesa, com custo, recarga e um efeito automático." },
  };

  global.RAMABrutalCatalogo = {
    FONTE: FONTE, referencia: referencia, LIMITES: LIMITES, CENAS: CENAS,
    ESTILOS: ESTILOS, ORDEM_ESTILOS: ORDEM_ESTILOS, RECARGAS: RECARGAS,
    ARQUETIPOS: ARQUETIPOS, ORDEM_ARQUETIPOS: ORDEM_ARQUETIPOS, INICIATIVA: INICIATIVA,
    APEGOS: APEGOS, VANTAGENS: VANTAGENS, ORDEM_VANTAGENS: ORDEM_VANTAGENS, EFEITOS_DE_VANTAGEM: EFEITOS_DE_VANTAGEM,
    ACOES_ENCONTRO: ACOES_ENCONTRO, ORDEM_ACOES_ENCONTRO: ORDEM_ACOES_ENCONTRO,
    ACOES_ASSASSINO: ACOES_ASSASSINO, APAVOROS: APAVOROS,
    AMEACAS: AMEACAS, AMEACAS_DEFINIDAS: AMEACAS_DEFINIDAS,
    INTENTOS_HORRIVEIS: INTENTOS_HORRIVEIS, ORDEM_INTENTOS: ORDEM_INTENTOS, INTENTOS_UNICOS: INTENTOS_UNICOS,
    ASSASSINOS: ASSASSINOS, ORDEM_ASSASSINOS: ORDEM_ASSASSINOS,
    LACUNAS: LACUNAS,
  };
})(typeof window !== "undefined" ? window : globalThis);
/* <<< js/brutal/catalogo.js */

/* >>> js/brutal/regras.js */
/* =====================================================================
   R.A.M.A. — BRUTAL · a ficha persistente (v7.0)
   ---------------------------------------------------------------------
   O bloco `ficha.brutal`: quem a Sobrevivente É — Arquétipo (e, com ele,
   Estilos, Habilidade e Iniciativa), pronomes, intérprete, Apegos e
   detalhes. Nada de jogo mora aqui: pilhas, PT, Feridas, turnos e
   efeitos são do THRILLER (js/brutal/mesa.js), guardados na campanha
   (CAMPANHA_BRUTAL). Assim a mesma ficha em outra campanha começa um
   Thriller limpo — e nada de uma mesa vaza para a outra.

   Duas exceções, de propósito:
     apegos.desejo.revelado  revelar o Desejo Obscuro é para sempre
                             (p. 7): vale em qualquer Thriller
     treino                  um Thriller de uma pessoa só, guardado na
                             ficha, para jogar sem campanha (testes,
                             Vantagens, Apegos). Não vale numa campanha.

   Copiado para backend/Brutal.gs (testes/gerar-brutal-gs.js).
   ===================================================================== */

(function (global) {
  "use strict";

  function K() { return global.RAMABrutalCatalogo; }

  var VERSAO = 1;
  function texto(v, max) { return String(v === undefined || v === null ? "" : v).slice(0, max || 400); }
  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  function copiar(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }

  function fichaVazia() {
    return {
      versao: VERSAO,
      arquetipo: "",
      pronomes: "",
      interprete: "",
      apegos: {
        item: { nome: "", texto: "" },
        relacao: { nome: "", texto: "" },
        desejo: { texto: "", revelado: false, reveladoEm: "" },
      },
      detalhes: { aparencia: "", historia: "", notas: "" },
      treino: null,
      operacoes: [],
    };
  }

  function normalizar(bruto) {
    var b = obj(bruto);
    var v = fichaVazia();
    v.arquetipo = K().ARQUETIPOS[b.arquetipo] ? b.arquetipo : "";
    v.pronomes = texto(b.pronomes, 40);
    v.interprete = texto(b.interprete, 80);
    var a = obj(b.apegos);
    ["item", "relacao"].forEach(function (k) {
      var x = obj(a[k]);
      v.apegos[k] = { nome: texto(x.nome, 80), texto: texto(x.texto, 600) };
    });
    var d = obj(a.desejo);
    v.apegos.desejo = { texto: texto(d.texto, 600), revelado: d.revelado === true, reveladoEm: texto(d.reveladoEm, 40) };
    var det = obj(b.detalhes);
    v.detalhes = { aparencia: texto(det.aparencia, 1200), historia: texto(det.historia, 4000), notas: texto(det.notas, 4000) };
    v.treino = b.treino && typeof b.treino === "object" && global.RAMABrutalMesa ? global.RAMABrutalMesa.normalizar(b.treino) : (b.treino && typeof b.treino === "object" ? copiar(b.treino) : null);
    v.operacoes = (Array.isArray(b.operacoes) ? b.operacoes : []).map(function (x) { return texto(x, 80); }).filter(Boolean).slice(-60);
    return v;
  }

  function arquetipo(b) { return b && K().ARQUETIPOS[b.arquetipo] ? K().ARQUETIPOS[b.arquetipo] : null; }
  function estilos(b) { var a = arquetipo(b); return a ? a.estilos.slice() : []; }
  function nomeDoArquetipo(chave) { var a = K().ARQUETIPOS[chave]; return a ? a.nome : ""; }

  /* O que a mesa lê sem abrir a ficha (calculado aqui, no navegador e
     no servidor). O estado de jogo vem do Thriller, não daqui. */
  function resumoParaMesa(b) {
    var n = normalizar(b);
    var a = arquetipo(n);
    return {
      arquetipo: n.arquetipo,
      arquetipoNome: a ? a.nome : "",
      estilos: a ? a.estilos.slice() : [],
      iniciativa: a ? a.iniciativa : 0,
      pronomes: n.pronomes,
      interprete: n.interprete,
      desejoRevelado: n.apegos.desejo.revelado,
      temItem: !!n.apegos.item.nome,
      temRelacao: !!n.apegos.relacao.nome,
      temDesejo: !!n.apegos.desejo.texto,
    };
  }

  /* O que falta para a ficha estar pronta para um Thriller. */
  function pendencias(b) {
    var p = [];
    if (!b || !arquetipo(b)) p.push("Escolha o Arquétipo.");
    return p;
  }

  /* Uma alteração com id: repetir o mesmo id não aplica de novo. */
  function aplicarOperacao(b, opId, fn) {
    if (opId && b.operacoes.indexOf(opId) >= 0) return { ok: true, repetida: true, eventos: [] };
    var copia = copiar(b);
    var r = fn(copia) || { ok: true };
    if (r.ok === false) return r;
    Object.keys(copia).forEach(function (k) { b[k] = copia[k]; });
    if (opId) { b.operacoes.push(opId); b.operacoes = b.operacoes.slice(-60); }
    return r;
  }

  global.RAMABrutal = {
    VERSAO: VERSAO,
    fichaVazia: fichaVazia,
    normalizar: normalizar,
    arquetipo: arquetipo,
    estilos: estilos,
    nomeDoArquetipo: nomeDoArquetipo,
    resumoParaMesa: resumoParaMesa,
    pendencias: pendencias,
    aplicarOperacao: aplicarOperacao,
    copiar: copiar,
  };
})(typeof window !== "undefined" ? window : globalThis);
/* <<< js/brutal/regras.js */

/* >>> js/brutal/mesa.js */
/* =====================================================================
   R.A.M.A. — BRUTAL · o Thriller (v7.0)
   ---------------------------------------------------------------------
   O estado de UM Thriller — guardado por campanha (CAMPANHA_BRUTAL) ou,
   sem campanha, no treino da ficha — e TODAS as regras que o mudam.
   O navegador e o servidor rodam este mesmo arquivo (cópia em
   backend/Brutal.gs): a tela mostra o que o motor permite, e numa
   campanha é o servidor que rola os dados e aplica.

     aplicar(estado, op, papel, rolar)  a única porta de mudança. Valida
                         quem pode (a Diretora; cada jogadora só pelas
                         Sobreviventes dela), a cena, a vez, os custos e
                         as recargas; rola; move os dados; dispara os
                         Intentos verificáveis; devolve { ok, motivo,
                         eventos, rolagem, fichas }
     vista(estado, papel) o que as jogadoras veem: sem os Pontos de
                         Horror, a ficha do Assassino, a meta da Fuga
                         (só a Nerd que a descobriu), as decisões e o
                         registro privado da Diretora
     motivoDe…            por que uma ação ou Vantagem não está
                         disponível — a tela mostra o mesmo texto

   As pilhas são CONTAGENS de d6 (o valor só existe quando um dado é
   rolado). Dados Marcadores são outra coisa: têm valor e não rolam.
   ===================================================================== */

(function (global) {
  "use strict";

  function K() { return global.RAMABrutalCatalogo; }

  var VERSAO = 1;
  var MAX_REGISTRO = 150, MAX_ROLAGENS = 30, MAX_PEDIDOS = 20;

  function inteiro(v, p) { var n = Math.floor(Number(v)); return isFinite(n) ? n : (p === undefined ? 0 : p); }
  function limitar(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function texto(v, max) { return String(v === undefined || v === null ? "" : v).slice(0, max || 200); }
  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  function lista(v) { return Array.isArray(v) ? v : []; }
  function copiar(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
  var contador = 0;
  function novoId(p) { contador = (contador + 1) % 1e6; return (p || "x") + Date.now().toString(36) + contador.toString(36) + Math.floor(Math.random() * 1e6).toString(36); }

  /* =================================================================
     ESTADO
     ================================================================= */

  function assassinoVazio() {
    return { modelo: "", nome: "", ameacas: [], acoesUnicas: [], apavoro: "", dadosIniciais: null, phIniciais: null, sustosPorEncontro: null, estigma: "", notas: "", revelado: false };
  }

  function estadoVazio() {
    return {
      versao: VERSAO,
      sessao: 1,
      cena: "livre",
      assassino: assassinoVazio(),
      diretora: { pilha: 0, ph: 0, usos: {} },
      descarte: 0,
      lacunas: { fonteDosDados: "auto", custoTratarFeridas: null, recargaPlanejarFuga: "pendente", ultimaMeta: null },
      vantagensDaMesa: [],
      sobreviventes: {},
      encontro: null,
      seis: null,
      ultimaFerida: null,
      posEncontro: false,
      pedidos: [],
      pendencias: [],
      rolagens: [],
      registro: [],
      privado: [],
    };
  }

  function sobreviventeVazio(id, nome) {
    return {
      id: String(id), nome: texto(nome, 120), arquetipo: "", estilos: [],
      presente: true, foraDaCampanha: false, situacao: "viva",
      pilha: K().LIMITES.pilha, fuga: 0, pt: 0, ferida: 0, sequelas: 0,
      marcadores: [], recursos: [], incapacitados: [],
      usos: {}, pendentes: { surpreender: 0, planejarFuga: false, reduzirFerida: 0 },
      sessaoUsos: {}, desejoRevelado: false, carenciaAutomatica: true,
      segurada: false, perdeVez: false, planejarNoEncontro: false, teste: null,
    };
  }

  function normalizarMarcador(m) {
    var x = obj(m);
    var tipo = ["condicao", "possessao", "restricao"].indexOf(x.tipo) >= 0 ? x.tipo : "condicao";
    return { id: texto(x.id, 40) || novoId("m"), tipo: tipo, nome: texto(x.nome, 60) || (tipo === "possessao" ? "Possessão" : tipo === "restricao" ? "Restrição" : "Condição"), valor: limitar(inteiro(x.valor, 1), 0, 6) };
  }

  function normalizarSobrevivente(bruto, id) {
    var b = obj(bruto);
    var s = sobreviventeVazio(id, b.nome);
    s.arquetipo = K().ARQUETIPOS[b.arquetipo] ? b.arquetipo : "";
    s.estilos = lista(b.estilos).filter(function (e) { return !!K().ESTILOS[e]; }).slice(0, 2);
    if (!s.estilos.length && s.arquetipo) s.estilos = K().ARQUETIPOS[s.arquetipo].estilos.slice();
    s.presente = b.presente !== false;
    s.foraDaCampanha = b.foraDaCampanha === true;
    s.situacao = ["viva", "fugiu", "morta"].indexOf(b.situacao) >= 0 ? b.situacao : "viva";
    s.pilha = limitar(inteiro(b.pilha, K().LIMITES.pilha), 0, K().LIMITES.pilha);
    s.fuga = limitar(inteiro(b.fuga, 0), 0, K().LIMITES.fugaMaxima);
    s.pt = limitar(inteiro(b.pt, 0), 0, K().LIMITES.pt);
    s.ferida = Math.max(0, inteiro(b.ferida, 0));
    s.sequelas = Math.max(0, inteiro(b.sequelas, 0));
    s.marcadores = lista(b.marcadores).map(normalizarMarcador).slice(0, 12);
    s.recursos = lista(b.recursos).map(function (r) { var x = obj(r); return { id: texto(x.id, 40) || novoId("r"), nome: texto(x.nome, 80) || "Recurso", usos: limitar(inteiro(x.usos, 1), 0, 20) }; }).filter(function (r) { return r.usos > 0; }).slice(0, 20);
    s.incapacitados = lista(b.incapacitados).filter(function (e, i, t) { return !!K().ESTILOS[e] && t.indexOf(e) === i; });
    var u = obj(b.usos); Object.keys(u).forEach(function (k) { if (u[k]) s.usos[texto(k, 60)] = true; });
    var p = obj(b.pendentes);
    s.pendentes = { surpreender: limitar(inteiro(p.surpreender, 0), 0, 9), planejarFuga: p.planejarFuga === true, reduzirFerida: limitar(inteiro(p.reduzirFerida, 0), 0, 12) };
    var su = obj(b.sessaoUsos); Object.keys(su).forEach(function (k) { if (su[k]) s.sessaoUsos[texto(k, 40)] = true; });
    s.desejoRevelado = b.desejoRevelado === true;
    s.carenciaAutomatica = b.carenciaAutomatica !== false;
    s.segurada = b.segurada === true;
    s.perdeVez = b.perdeVez === true;
    s.planejarNoEncontro = b.planejarNoEncontro === true;
    s.teste = b.teste && typeof b.teste === "object" ? copiar(b.teste) : null;
    return s;
  }

  function normalizar(bruto) {
    var b = obj(bruto);
    var e = estadoVazio();
    e.sessao = Math.max(1, inteiro(b.sessao, 1));
    e.cena = ["livre", "suspense", "encontro"].indexOf(b.cena) >= 0 ? b.cena : "livre";
    var a = obj(b.assassino), av = assassinoVazio();
    av.modelo = K().ASSASSINOS[a.modelo] || a.modelo === "personalizado" ? a.modelo : "";
    av.nome = texto(a.nome, 80);
    av.ameacas = lista(a.ameacas).filter(function (x, i, t) { return !!K().AMEACAS[x] && t.indexOf(x) === i; }).slice(0, 2);
    av.acoesUnicas = lista(a.acoesUnicas).filter(function (x, i, t) { var d = K().ACOES_ASSASSINO[x]; return d && d.tipo === "unica" && t.indexOf(x) === i; }).slice(0, 4);
    av.apavoro = K().APAVOROS[a.apavoro] ? a.apavoro : "";
    ["dadosIniciais", "phIniciais", "sustosPorEncontro"].forEach(function (k) { av[k] = a[k] === null || a[k] === undefined || a[k] === "" ? null : limitar(inteiro(a[k], 0), 0, 30); });
    av.estigma = texto(a.estigma, 600);
    av.notas = texto(a.notas, 2000);
    av.revelado = a.revelado === true;
    e.assassino = av;
    var d = obj(b.diretora);
    e.diretora = { pilha: Math.max(0, inteiro(d.pilha, 0)), ph: Math.max(0, inteiro(d.ph, 0)), usos: {} };
    var du = obj(d.usos); Object.keys(du).forEach(function (k) { if (du[k]) e.diretora.usos[texto(k, 40)] = true; });
    e.descarte = Math.max(0, inteiro(b.descarte, 0));
    var l = obj(b.lacunas);
    e.lacunas = {
      fonteDosDados: ["auto", "descarte", "novo"].indexOf(l.fonteDosDados) >= 0 ? l.fonteDosDados : "auto",
      custoTratarFeridas: l.custoTratarFeridas === null || l.custoTratarFeridas === undefined || l.custoTratarFeridas === "" ? null : limitar(inteiro(l.custoTratarFeridas, 0), 0, 10),
      recargaPlanejarFuga: ["pendente", "fimEncontro", "semRestricao"].indexOf(l.recargaPlanejarFuga) >= 0 ? l.recargaPlanejarFuga : "pendente",
      ultimaMeta: l.ultimaMeta === null || l.ultimaMeta === undefined ? null : limitar(inteiro(l.ultimaMeta, 1), 1, 6),
    };
    e.vantagensDaMesa = lista(b.vantagensDaMesa).map(normalizarVantagemDaMesa).filter(Boolean).slice(0, 30);
    var ss = obj(b.sobreviventes);
    Object.keys(ss).slice(0, 30).forEach(function (id) { e.sobreviventes[id] = normalizarSobrevivente(ss[id], id); });
    if (b.encontro && typeof b.encontro === "object") {
      var en = b.encontro;
      e.encontro = {
        rodada: Math.max(1, inteiro(en.rodada, 1)),
        participantes: lista(en.participantes).map(String).filter(function (id) { return !!e.sobreviventes[id]; }),
        ordem: lista(en.ordem).map(String),
        vez: Math.max(0, inteiro(en.vez, 0)),
        meta: limitar(inteiro(en.meta, 1), 1, K().LIMITES.fugaMaxima),
        sustos: Math.max(0, inteiro(en.sustos, 0)),
        distrair: Math.max(0, inteiro(en.distrair, 0)),
        arriscarTudo: texto(en.arriscarTudo, 60),
        acaoFeita: en.acaoFeita === true,
        ferido: texto(en.ferido, 60),
        primeiraMorte: en.primeiraMorte === true,
        cheiro: en.cheiro === true,
        revelada: obj(en.revelada),
        acoesRodada1: obj(en.acoesRodada1),
        primeiroTurnoConferido: en.primeiroTurnoConferido === true,
      };
    }
    e.seis = b.seis && typeof b.seis === "object" && e.sobreviventes[b.seis.alvo] ? { alvo: String(b.seis.alvo), origem: texto(b.seis.origem, 40) } : null;
    e.ultimaFerida = b.ultimaFerida && typeof b.ultimaFerida === "object" && e.sobreviventes[b.ultimaFerida.alvo] ? { alvo: String(b.ultimaFerida.alvo), valor: limitar(inteiro(b.ultimaFerida.valor, 1), 0, 6) } : null;
    e.posEncontro = b.posEncontro === true;
    e.pedidos = lista(b.pedidos).map(function (p) {
      var x = obj(p);
      return { id: texto(x.id, 40) || novoId("p"), tipo: ["comum", "complexo", "susto"].indexOf(x.tipo) >= 0 ? x.tipo : "comum", rotulo: texto(x.rotulo, 120), alvos: lista(x.alvos).map(String), destino: ["auto", "sacrificar", "descartar", "manter"].indexOf(x.destino) >= 0 ? x.destino : "auto", assustar: x.assustar === true, buh: x.buh === true, cena: texto(x.cena, 20), respostas: obj(x.respostas), falharam: lista(x.falharam).map(String), aberto: x.aberto !== false, quando: texto(x.quando, 40) };
    }).slice(-MAX_PEDIDOS);
    e.pendencias = lista(b.pendencias).map(function (p) { var x = obj(p); return { id: texto(x.id, 40) || novoId("d"), tipo: texto(x.tipo, 40), alvo: texto(x.alvo, 60), texto: texto(x.texto, 400), quando: texto(x.quando, 40) }; }).slice(-30);
    e.rolagens = lista(b.rolagens).map(function (r) { return copiar(obj(r)); }).slice(-MAX_ROLAGENS);
    e.registro = lista(b.registro).map(function (r) { var x = obj(r); return { quando: texto(x.quando, 40), texto: texto(x.texto, 300) }; }).slice(-MAX_REGISTRO);
    e.privado = lista(b.privado).map(function (r) { var x = obj(r); return { quando: texto(x.quando, 40), texto: texto(x.texto, 300) }; }).slice(-MAX_REGISTRO);
    return e;
  }

  function normalizarVantagemDaMesa(v) {
    var x = obj(v);
    var nome = texto(x.nome, 60).trim();
    if (!nome) return null;
    return {
      id: texto(x.id, 40) || novoId("vm"), nome: nome,
      estilo: K().ESTILOS[x.estilo] ? x.estilo : null,
      custo: limitar(inteiro(x.custo, 0), 0, 10),
      recarga: K().RECARGAS[x.recarga] && x.recarga !== "planejarFuga" ? x.recarga : "semRestricao",
      efeito: K().EFEITOS_DE_VANTAGEM[x.efeito] ? x.efeito : "manual",
      valor: limitar(inteiro(x.valor, 1), 1, 6),
      texto: texto(x.texto, 400),
    };
  }

  /* As Sobreviventes da campanha: entram as que faltam, nomes e
     Arquétipos se atualizam pela ficha; quem saiu da campanha fica
     guardado (foraDaCampanha), sem apagar nada. */
  function sincronizarElenco(estado, personagens) {
    var vistos = {};
    lista(personagens).forEach(function (p) {
      var id = String(p.id);
      vistos[id] = true;
      var r = obj(p.resumo);
      var s = estado.sobreviventes[id] || (estado.sobreviventes[id] = sobreviventeVazio(id, p.nome));
      s.nome = texto(p.nome, 120) || s.nome;
      s.foraDaCampanha = false;
      if (K().ARQUETIPOS[r.arquetipo]) {
        s.arquetipo = r.arquetipo;
        s.estilos = K().ARQUETIPOS[r.arquetipo].estilos.slice();
      }
      if (r.desejoRevelado === true) s.desejoRevelado = true;
    });
    Object.keys(estado.sobreviventes).forEach(function (id) { if (!vistos[id]) estado.sobreviventes[id].foraDaCampanha = true; });
    return estado;
  }

  /* =================================================================
     CONSULTAS
     ================================================================= */

  function sob(e, id) { return e.sobreviventes[String(id)] || null; }
  function elenco(e) { return Object.keys(e.sobreviventes).map(function (id) { return e.sobreviventes[id]; }).filter(function (s) { return !s.foraDaCampanha; }); }
  function naCena(e) { return elenco(e).filter(function (s) { return s.presente && s.situacao !== "morta"; }); }
  function emEncontro(e, s) { return !!(e.encontro && s && e.encontro.participantes.indexOf(s.id) >= 0 && s.situacao === "viva"); }
  function restantesNoEncontro(e) { return e.encontro ? e.encontro.participantes.map(function (id) { return e.sobreviventes[id]; }).filter(function (s) { return s && s.situacao === "viva"; }) : []; }
  function daVez(e) { return e.encontro ? e.encontro.ordem[e.encontro.vez] || "" : ""; }
  function vezDoAssassino(e) { return daVez(e) === "assassino"; }
  function temAcao(e, chave) { return e.assassino.acoesUnicas.indexOf(chave) >= 0; }
  function temAmeaca(e, chave) { return e.assassino.ameacas.indexOf(chave) >= 0; }
  function nomeDe(e, id) { var s = sob(e, id); return s ? (s.nome || "Sobrevivente") : "?"; }
  function marcadorDe(s, tipo) { return s.marcadores.filter(function (m) { return m.tipo === tipo; })[0] || null; }
  function estiloValido(s, estilo) { return !!estilo && s.estilos.indexOf(estilo) >= 0 && s.incapacitados.indexOf(estilo) < 0; }

  function dificuldade(s, estilo, recursos) {
    var d = K().LIMITES.dificuldade;
    var partes = [{ rotulo: "Base", valor: d }];
    if (estiloValido(s, estilo)) { d -= 1; partes.push({ rotulo: "Estilo " + K().ESTILOS[estilo].nome, valor: -1 }); }
    var usados = lista(recursos).filter(function (id) { return s.recursos.some(function (r) { return r.id === id && r.usos > 0; }); });
    usados.forEach(function (id) { var r = s.recursos.filter(function (x) { return x.id === id; })[0]; d -= 1; partes.push({ rotulo: "Recurso: " + r.nome, valor: -1 }); });
    /* Lacuna (recursosPorTeste): um 1 nunca é sucesso. */
    if (d < 2) { partes.push({ rotulo: "Mínimo", valor: 2 - d }); d = 2; }
    return { valor: d, partes: partes, recursos: usados };
  }
  function forcadoComplexo(s) { return !!marcadorDe(s, "restricao"); }

  function recargaDaVantagem(e, chave) {
    var v = K().VANTAGENS[chave];
    if (v) return v.recarga === "planejarFuga" ? e.lacunas.recargaPlanejarFuga : v.recarga;
    var m = vantagemDaMesa(e, chave);
    return m ? m.recarga : "semRestricao";
  }
  function vantagemDaMesa(e, id) { return e.vantagensDaMesa.filter(function (v) { return v.id === id; })[0] || null; }
  function definicaoDaVantagem(e, chave) {
    var v = K().VANTAGENS[chave];
    if (v) return { chave: chave, nome: v.nome, estilo: v.estilo, custo: chave === "tratarFeridas" ? e.lacunas.custoTratarFeridas : v.custo, efeito: v.efeito, valor: 1, texto: v.texto, oficial: true };
    var m = vantagemDaMesa(e, chave);
    return m ? { chave: m.id, nome: m.nome, estilo: m.estilo, custo: m.custo, efeito: m.efeito, valor: m.valor, texto: m.texto, oficial: false } : null;
  }

  /* As Vantagens de uma Sobrevivente: as Gerais, as dos Estilos dela e
     as da mesa (Gerais ou do Estilo dela). */
  function vantagensDe(e, s) {
    var oficiais = K().ORDEM_VANTAGENS.filter(function (k) { var v = K().VANTAGENS[k]; return !v.estilo || s.estilos.indexOf(v.estilo) >= 0; });
    var mesa = e.vantagensDaMesa.filter(function (v) { return !v.estilo || s.estilos.indexOf(v.estilo) >= 0; }).map(function (v) { return v.id; });
    return oficiais.concat(mesa);
  }

  function motivoBasico(e, s) {
    if (!s) return "Sobrevivente fora deste Thriller.";
    if (s.foraDaCampanha) return "Esta ficha não está mais na campanha.";
    if (s.situacao === "morta") return "Ela está morta.";
    if (s.teste) return "Confirme o teste que está esperando.";
    if (e.seis) return "A Diretora está decidindo um 6 do FERIR.";
    return "";
  }

  function motivoDaVantagem(e, s, chave) {
    var b = motivoBasico(e, s); if (b) return b;
    var v = definicaoDaVantagem(e, chave);
    if (!v) return "Vantagem desconhecida.";
    if (vantagensDe(e, s).indexOf(chave) < 0) return "Só para Sobreviventes com o Estilo " + K().ESTILOS[v.estilo].nome + ".";
    if (e.encontro && emEncontro(e, s)) return "Vantagens não podem ser usadas durante um Encontro (p. 21).";
    if (s.situacao === "fugiu") return "Ela está fora da cena.";
    if (v.estilo && s.incapacitados.indexOf(v.estilo) >= 0) return "O Estilo " + K().ESTILOS[v.estilo].nome + " está incapacitado.";
    if (v.custo === null || v.custo === undefined) {
      if (chave === "tratarFeridas") return "O custo de Tratar Feridas não está no Corte Rápido: a Diretora define em Lacunas.";
    }
    if (s.usos["v:" + chave]) return "Já usada — volta em: " + (K().RECARGAS[recargaDaVantagem(e, chave)] || {}).nome + ".";
    if (chave === "planejarFuga" && s.pendentes.planejarFuga) return "Já há uma fuga planejada para o próximo Encontro.";
    if (v.custo && s.pt < v.custo) return "Precisa de " + v.custo + " PT (tem " + s.pt + ").";
    if (v.efeito === "dado" && s.pilha >= K().LIMITES.pilha) return "A Pilha Comum já tem 6 dados.";
    if (v.efeito === "dado" && e.lacunas.fonteDosDados === "descarte" && e.descarte < 1) return "A Pilha de Descarte está vazia (configuração da mesa).";
    if (v.efeito === "transferirPt" && s.pt < 1) return "Sem Pontos de Tensão para transferir.";
    return "";
  }

  function motivoDoTeste(e, s, pedido) {
    var b = motivoBasico(e, s); if (b) return b;
    if (s.situacao === "fugiu") return "Ela está fora da cena.";
    if (pedido) {
      if (!pedido.aberto) return "Este teste já foi encerrado.";
      if (pedido.alvos.indexOf(s.id) < 0) return "O teste não é para ela.";
      if (pedido.respostas[s.id]) return "Já respondeu a este teste.";
      return "";
    }
    if (e.encontro && emEncontro(e, s)) return "No Encontro, use as Ações de Encontro na sua vez (ou responda a um teste pedido pela Diretora).";
    if (s.pilha < 1) return "A Pilha Comum está vazia.";
    return "";
  }

  function motivoDaAcao(e, s, acao) {
    var b = motivoBasico(e, s); if (b) return b;
    if (!e.encontro) return "Ações de Encontro só durante um Encontro.";
    if (!emEncontro(e, s)) return s.situacao === "fugiu" ? "Ela já escapou do Encontro." : "Ela não está neste Encontro.";
    if (daVez(e) !== s.id) return "Não é a vez dela.";
    if (["ajudarAlguem", "distrair", "partirParaCima", "vazarDali", "livrarRestricao", "livrarAliada"].indexOf(acao) >= 0 && s.pilha < 1) return "A Pilha Comum está vazia.";
    if (acao === "vazarDali" && s.segurada) return "Ela está SEGURADA: não move dados para a Pilha de Fuga.";
    if (acao === "recuperarFolego") {
      if (s.pilha >= K().LIMITES.pilha) return "A Pilha Comum já tem 6 dados.";
      if (e.lacunas.fonteDosDados === "descarte" && e.descarte < 1) return "A Pilha de Descarte está vazia (configuração da mesa).";
    }
    if (acao === "arriscarTudo") {
      if (e.encontro.arriscarTudo) return "Arriscar Tudo já foi usado neste Encontro (uma Sobrevivente por Encontro).";
      if (s.sessaoUsos.arriscarTudo) return "Ela já Arriscou Tudo nesta sessão.";
      if (restantesNoEncontro(e).length < 2) return "Não dá para Arriscar Tudo sendo a última Sobrevivente na cena.";
    }
    if (acao === "livrarRestricao" && !marcadorDe(s, "restricao")) return "Ela não está restringida.";
    if (acao === "livrarAliada" && !restantesNoEncontro(e).some(function (x) { return x.segurada && x.id !== s.id; })) return "Ninguém está SEGURADA.";
    return "";
  }

  function motivoDaHabilidade(e, s, chave) {
    var b = motivoBasico(e, s); if (b) return b;
    var a = K().ARQUETIPOS[s.arquetipo];
    if (!a || a.habilidade.chave !== chave) return "Não é a Habilidade dela.";
    if (chave === "memoriaFotografica") {
      if (!emEncontro(e, s)) return "Só durante um Encontro.";
      if (s.sessaoUsos.memoria) return "Já usada nesta sessão.";
    }
    if (chave === "caraLavada") {
      if (!emEncontro(e, s)) return "Só durante um Encontro.";
      if (s.usos["h:caraLavada"]) return "Já usada neste Encontro.";
      if (s.fuga < 1) return "A Pilha de Fuga está vazia.";
    }
    if (chave === "ole") {
      if (s.usos["h:ole"]) return "Já usada — volta no fim de um Encontro.";
      if (!e.ultimaFerida || e.ultimaFerida.alvo !== s.id) return "Só logo depois de sofrer uma Ferida.";
    }
    return "";
  }

  /* O Encontro pode começar? (p. 21) */
  function motivoDoEncontro(e, ids) {
    if (e.encontro) return "Já há um Encontro em andamento.";
    var part = (ids && ids.length ? ids.map(function (id) { return sob(e, id); }) : naCena(e)).filter(function (s) { return s && !s.foraDaCampanha && s.situacao === "viva" && s.presente; });
    if (!part.length) return "Nenhuma Sobrevivente viva na cena.";
    var menor = Math.min.apply(null, part.map(function (s) { return s.pilha; }));
    if (!(e.diretora.pilha > menor)) return "A Pilha da Diretora (" + e.diretora.pilha + ") precisa superar a de alguma Sobrevivente (a menor tem " + menor + ").";
    return "";
  }

  /* =================================================================
     REGISTRO E EVENTOS
     ================================================================= */

  function agora() { try { return new Date().toISOString(); } catch (x) { return ""; } }
  function contexto(e, papel, rolar) {
    return { e: e, papel: papel || {}, rolar: rolar, eventos: [], rolagens: [], fichas: [] };
  }
  function log(c, t, privado) {
    var item = { quando: agora(), texto: texto(t, 300) };
    (privado ? c.e.privado : c.e.registro).push(item);
    if (c.e.registro.length > MAX_REGISTRO) c.e.registro = c.e.registro.slice(-MAX_REGISTRO);
    if (c.e.privado.length > MAX_REGISTRO) c.e.privado = c.e.privado.slice(-MAX_REGISTRO);
    c.eventos.push({ texto: item.texto, privado: !!privado });
  }
  function ganharPh(c, n, motivo) {
    if (!n) return;
    c.e.diretora.ph += n;
    log(c, "+" + n + " PH: " + motivo, true);
  }
  function pendencia(c, tipo, alvo, t) {
    c.e.pendencias.push({ id: novoId("d"), tipo: tipo, alvo: alvo || "", texto: texto(t, 400), quando: agora() });
    log(c, "Decisão da Diretora: " + t, true);
  }
  function rolarD6(c) { var v = inteiro(c.rolar ? c.rolar(6) : 1 + Math.floor(Math.random() * 6), 1); return limitar(v, 1, 6); }

  /* =================================================================
     DADOS: MOVER, RECEBER, RECARREGAR
     ================================================================= */

  function receberDado(c, s, motivo) {
    var e = c.e;
    if (s.pilha >= K().LIMITES.pilha) return false;
    var fonte = e.lacunas.fonteDosDados;
    if (fonte === "descarte" || (fonte === "auto" && e.descarte > 0)) {
      if (e.descarte < 1) return false;
      e.descarte -= 1;
    }
    s.pilha += 1;
    log(c, nomeDe(e, s.id) + " recebe 1 dado (" + motivo + ").");
    return true;
  }

  function recarregar(e, tipo) {
    elenco(e).forEach(function (s) {
      Object.keys(s.usos).forEach(function (k) {
        var chave = k.slice(2), rec = null;
        if (k.indexOf("v:") === 0) rec = recargaDaVantagem(e, chave);
        if (k.indexOf("h:") === 0) { var a = K().ARQUETIPOS[s.arquetipo]; rec = a && a.habilidade.chave === chave ? a.habilidade.recarga : "fimEncontro"; }
        if (rec === tipo || (tipo === "fimEncontro" && rec === "encontroLivre") || (tipo === "livre" && rec === "encontroLivre")) delete s.usos[k];
      });
    });
    Object.keys(e.diretora.usos).forEach(function (k) {
      var ap = K().APAVOROS[k];
      if (ap && ap.recarga === tipo) delete e.diretora.usos[k];
    });
  }

  /* =================================================================
     FERIDAS, SEQUELAS E MORTE
     ================================================================= */

  function sofrerSequela(c, s, n, motivo) {
    var e = c.e;
    s.sequelas += n;
    log(c, nomeDe(e, s.id) + " sofre " + n + " Sequela" + (n === 1 ? "" : "s") + " (" + motivo + ").");
    if (!s.sessaoUsos.sequela) {
      s.sessaoUsos.sequela = true;
      if (temAmeaca(e, "mestre")) ganharPh(c, 1, "Intento Único (Mestre): primeira Sequela de " + nomeDe(e, s.id) + " na sessão");
    }
  }

  function aplicarFerida(c, s, valor, origem) {
    var e = c.e;
    var antes = s.ferida;
    var red = s.pendentes.reduzirFerida || 0;
    var total = antes + valor;
    if (red) {
      s.pendentes.reduzirFerida = 0;
      var reduzido = Math.max(total - red, Math.min(total, s.sequelas));
      log(c, "A Vantagem reduz a Ferida de " + nomeDe(e, s.id) + " em " + (total - reduzido) + " (não abaixo das Sequelas).");
      total = reduzido;
    }
    s.ferida = total;
    e.ultimaFerida = { alvo: s.id, valor: valor };
    log(c, nomeDe(e, s.id) + " recebe uma Ferida de " + valor + (antes ? " (somada: " + antes + " + " + valor + ")" : "") + " — Dado Marcador de Ferida em " + s.ferida + ". " + origem);
    if (s.ferida > 6) pendencia(c, "feridaAlem", s.id, "A Ferida de " + nomeDe(e, s.id) + " está em " + s.ferida + ", acima do valor de um dado: o Corte Rápido não diz o que acontece. Decida (MATAR, ajustar ou nada).");
  }

  function somarFerida(c, s, n, motivo) {
    s.ferida += n;
    log(c, nomeDe(c.e, s.id) + ": Ferida +" + n + " (" + motivo + "), agora " + s.ferida + ".");
    if (s.ferida > 6) pendencia(c, "feridaAlem", s.id, "A Ferida de " + nomeDe(c.e, s.id) + " está em " + s.ferida + ", acima do valor de um dado. Decida o que acontece.");
  }

  function morrer(c, s, causa) {
    var e = c.e;
    if (s.situacao === "morta") return;
    var noEncontro = emEncontro(e, s);
    s.situacao = "morta";
    s.segurada = false;
    s.teste = null;
    log(c, "☠ " + nomeDe(e, s.id) + " morreu (" + causa + ").");
    if (noEncontro) {
      ganharPh(c, 1, "Intento Horrível: Sobrevivente morreu num Encontro");
      if (!e.encontro.primeiraMorte) {
        e.encontro.primeiraMorte = true;
        if (e.assassino.apavoro === "sintoCheiroDeSangue" && !e.diretora.usos.sintoCheiroDeSangue) e.encontro.cheiro = true;
      }
    }
  }

  /* =================================================================
     O ENCONTRO: VEZ, FIM, INÍCIO
     ================================================================= */

  function podeAgirNaVez(e, id) {
    if (id === "assassino") return true;
    var s = sob(e, id);
    return !!s && emEncontro(e, s);
  }

  function inicioDoTurno(c, id) {
    var e = c.e, s = sob(e, id);
    if (!s) return;
    if (s.segurada) somarFerida(c, s, 1, "SEGURADA, no começo do turno");
  }

  function irParaVez(c, indice) {
    var e = c.e, en = e.encontro;
    for (var voltas = 0; voltas < 40; voltas++) {
      if (indice >= en.ordem.length) {
        /* Passou do Assassino: nova rodada. */
        en.rodada += 1;
        en.distrair = 0;
        indice = 0;
        log(c, "Rodada " + en.rodada + " do Encontro.");
      }
      var id = en.ordem[indice];
      if (id === "assassino") {
        en.vez = indice;
        en.acaoFeita = false;
        en.ferido = "";
        conferirPrimeiroTurno(c);
        log(c, "Vez do Assassino.");
        return;
      }
      var s = sob(e, id);
      if (s && emEncontro(e, s)) {
        if (s.perdeVez) { s.perdeVez = false; log(c, nomeDe(e, id) + " perde a vez."); indice++; continue; }
        en.vez = indice;
        inicioDoTurno(c, id);
        if (s.situacao !== "viva") { indice++; continue; }
        return;
      }
      indice++;
    }
  }

  /* Intento: todas tentaram escapar no primeiro turno — conferido quando
     a vez do Assassino chega na rodada 1 ou quando o Encontro acaba antes. */
  function conferirPrimeiroTurno(c) {
    var en = c.e.encontro;
    if (!en || en.rodada !== 1 || en.primeiroTurnoConferido) return;
    en.primeiroTurnoConferido = true;
    var ids = en.participantes;
    var todas = ids.length > 0 && ids.every(function (x) { var a = en.acoesRodada1[x]; return a === "vazarDali" || a === "arriscarTudo" || a === "fugiu"; });
    if (todas) ganharPh(c, 4, "Intento Horrível: todas tentaram escapar no primeiro turno");
  }

  function terminarVez(c, id, acao) {
    var e = c.e, en = e.encontro;
    if (!en) return;
    if (en.rodada === 1 && id !== "assassino" && !en.acoesRodada1[id]) en.acoesRodada1[id] = acao || "outra";
    if (verificarFim(c)) return;
    if (daVez(e) === id) irParaVez(c, en.vez + 1);
  }

  function verificarFim(c) {
    var e = c.e;
    if (!e.encontro) return true;
    if (e.diretora.pilha <= 0) { encerrarEncontro(c, "O Assassino ficou sem dados na Pilha."); return true; }
    var restantes = restantesNoEncontro(e);
    if (!restantes.length) {
      var fugiram = e.encontro.participantes.some(function (id) { var s = sob(e, id); return s && s.situacao === "fugiu"; });
      encerrarEncontro(c, fugiram ? "Todas as Sobreviventes escaparam ou morreram." : "Todas as Sobreviventes presentes morreram.");
      return true;
    }
    return false;
  }

  function encerrarEncontro(c, motivo) {
    var e = c.e, en = e.encontro;
    if (!en) return;
    conferirPrimeiroTurno(c);
    en.participantes.forEach(function (id) {
      var s = sob(e, id);
      if (!s) return;
      if (s.fuga) {
        var volta = s.fuga;
        var cabe = Math.max(0, K().LIMITES.pilha - s.pilha);
        var entra = Math.min(cabe, volta);
        s.pilha += entra;
        e.descarte += volta - entra;
        s.fuga = 0;
      }
      s.segurada = false;
      s.perdeVez = false;
      s.planejarNoEncontro = false;
      if (s.situacao === "fugiu") s.situacao = "viva";
      if (s.situacao === "viva" && s.ferida > 0) ganharPh(c, 1, "Intento Horrível: " + nomeDe(e, id) + " saiu do Encontro com uma Ferida");
    });
    e.encontro = null;
    e.seis = null;
    e.cena = "livre";
    e.posEncontro = true;
    recarregar(e, "fimEncontro");
    recarregar(e, "livre");
    log(c, "O Encontro terminou: " + motivo + " Os dados das Pilhas de Fuga voltaram às Pilhas Comuns. A cena volta a ser Livre.");
  }

  function iniciarEncontro(c, op) {
    var e = c.e;
    var ids = lista(op.participantes).map(String);
    var motivo = motivoDoEncontro(e, ids);
    if (motivo) return { ok: false, motivo: motivo };
    var part = (ids.length ? ids.map(function (id) { return sob(e, id); }) : naCena(e)).filter(function (s) { return s && s.situacao === "viva" && s.presente && !s.foraDaCampanha; });
    var meta = op.meta === undefined || op.meta === null || op.meta === "" ? null : inteiro(op.meta, 0);
    if (!meta || meta < 1 || meta > 6) return { ok: false, motivo: "Escolha o tamanho da Pilha de Fuga (1 a 6): o Corte Rápido não traz o valor de cada Assassino." };
    var custo = 0;
    if (op.dificultar) { custo += 4; if (meta >= 6) return { ok: false, motivo: "A Pilha de Fuga nunca passa de 6: Dificultar não cabe." }; }
    if (op.buh) {
      if (e.assassino.apavoro !== "buh") return { ok: false, motivo: "Buh! não é o Apavoro deste Assassino." };
      if (e.diretora.usos.buh) return { ok: false, motivo: "Buh! já foi usado — volta numa cena Livre." };
      custo += 4;
    }
    var hora = op.suaHora && typeof op.suaHora === "object" ? op.suaHora : null;
    if (hora) {
      if (e.assassino.apavoro !== "suaHoraChegou") return { ok: false, motivo: "Sua Hora Chegou! não é o Apavoro deste Assassino." };
      if (e.diretora.usos.suaHoraChegou) return { ok: false, motivo: "Sua Hora Chegou! já foi usado — volta no fim de um Encontro." };
      var alvoH = sob(e, hora.alvo), mH = alvoH ? alvoH.marcadores.filter(function (m) { return m.id === hora.marcador; })[0] : null;
      if (!mH) return { ok: false, motivo: "Escolha um Dado Marcador (não vale o de Ferida)." };
      custo += 3;
    }
    if (custo > e.diretora.ph) return { ok: false, motivo: "Faltam Pontos de Horror: custa " + custo + ", há " + e.diretora.ph + "." };
    e.diretora.ph -= custo;
    var ordem = part.slice().sort(function (a, b) {
      var ia = K().INICIATIVA.indexOf(a.arquetipo), ib = K().INICIATIVA.indexOf(b.arquetipo);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    }).map(function (s) { return s.id; });
    if (op.dificultar) { meta += 1; log(c, "DIFICULTAR (4 PH): a Pilha de Fuga aumenta em 1.", true); }
    e.lacunas.ultimaMeta = op.dificultar ? meta - 1 : meta;
    e.encontro = {
      rodada: 1, participantes: ordem.slice(), ordem: ordem.concat(["assassino"]), vez: 0, meta: meta,
      sustos: e.assassino.sustosPorEncontro || 0, distrair: 0, arriscarTudo: "", acaoFeita: false, ferido: "",
      primeiraMorte: false, cheiro: false, revelada: {}, acoesRodada1: {}, primeiroTurnoConferido: false,
    };
    e.cena = "encontro";
    e.posEncontro = false;
    e.pedidos.forEach(function (p) { p.aberto = false; });
    part.forEach(function (s) {
      s.fuga = 0;
      s.planejarNoEncontro = !!s.pendentes.planejarFuga;
      s.pendentes.planejarFuga = false;
    });
    recarregar(e, "inicioEncontro");
    log(c, "⚠ O ENCONTRO começou. Iniciativa: " + ordem.map(function (id) { return nomeDe(e, id); }).join(", ") + " e, por último, o Assassino.");
    log(c, "Pilha de Fuga do Encontro: " + meta + " dado(s).", true);
    if (op.buh) {
      e.diretora.usos.buh = true;
      criarPedido(c, { tipo: "susto", alvos: ordem, rotulo: "Buh! — Teste de Susto", assustar: true, buh: true });
      log(c, "BUH! (4 PH): Teste de Susto em todas, sem gastar os Testes de Susto do Encontro.", true);
    }
    if (hora) {
      e.diretora.usos.suaHoraChegou = true;
      mH.valor = Math.min(6, mH.valor + 1);
      log(c, "SUA HORA CHEGOU! (3 PH): o marcador " + mH.nome + " de " + nomeDe(e, alvoH.id) + " sobe para " + mH.valor + ".");
      if (mH.tipo === "possessao" && mH.valor >= 6) log(c, "A possessão de " + nomeDe(e, alvoH.id) + " chegou a 6.", true);
    }
    irParaVez(c, 0);
    return { ok: true };
  }

  /* =================================================================
     TESTES
     ================================================================= */

  function criarPedido(c, d) {
    var e = c.e;
    var p = { id: novoId("p"), tipo: ["comum", "complexo", "susto"].indexOf(d.tipo) >= 0 ? d.tipo : "comum", rotulo: texto(d.rotulo, 120) || (d.tipo === "susto" ? "Teste de Susto" : d.tipo === "complexo" ? "Teste Complexo" : "Teste"), alvos: lista(d.alvos).map(String), destino: ["auto", "sacrificar", "descartar", "manter"].indexOf(d.destino) >= 0 ? d.destino : "auto", assustar: !!d.assustar, buh: !!d.buh, cena: e.cena, respostas: {}, falharam: [], aberto: true, quando: agora() };
    e.pedidos.push(p);
    if (e.pedidos.length > MAX_PEDIDOS) e.pedidos = e.pedidos.slice(-MAX_PEDIDOS);
    log(c, "A Diretora pede: " + p.rotulo + " — " + p.alvos.map(function (id) { return nomeDe(e, id); }).join(", ") + ".");
    return p;
  }
  function pedido(e, id) { return e.pedidos.filter(function (p) { return p.id === id; })[0] || null; }

  function destinoDasFalhas(e, cfg) {
    if (cfg.destino && cfg.destino !== "auto") return cfg.destino;
    if (cfg.susto) return "descartar";
    return K().CENAS[e.cena].falhas;
  }

  /* Prepara e rola. Devolve o teste (ainda não aplicado). */
  function rolarTesteBase(c, s, cfg) {
    var e = c.e;
    var dados = cfg.susto ? 1 : inteiro(cfg.dados, 0);
    if (!cfg.susto && (dados < 1 || dados > s.pilha)) return { ok: false, motivo: "Escolha de 1 a " + s.pilha + " dado(s) da Pilha Comum." };
    if (cfg.susto && s.pilha < 1) return { ok: true, semDados: true };
    var dif = dificuldade(s, cfg.estilo, cfg.recursos);
    var complexo = !!cfg.complexo || forcadoComplexo(s);
    var faces = [];
    for (var i = 0; i < dados; i++) faces.push(rolarD6(c));
    return {
      ok: true,
      teste: {
        id: novoId("t"), rotulo: texto(cfg.rotulo, 120), acao: cfg.acao || "", estilo: K().ESTILOS[cfg.estilo] ? cfg.estilo : "",
        dados: dados, faces: faces, dificuldade: dif.valor, partes: dif.partes, recursos: dif.recursos,
        complexo: complexo, forcadoComplexo: forcadoComplexo(s) && !cfg.complexo, susto: !!cfg.susto,
        destino: destinoDasFalhas(e, cfg), pedidoId: cfg.pedidoId || "", alvo: cfg.alvo || "", manterUm: !!cfg.manterUm,
        garantidos: cfg.acao === "partirParaCima" ? s.pendentes.surpreender : 0, repetido: false, substituido: null,
      },
    };
  }

  function opcoesReativas(e, s, t) {
    var o = [];
    if (s.arquetipo === "atleta" && !s.usos["h:resiliencia"] && s.marcadores.concat(s.ferida > 0 && s.ferida <= 6 ? [{ id: "ferida", valor: s.ferida }] : []).some(function (m) { return m.valor >= 1 && m.valor <= 6; })) o.push("resiliencia");
    if (t.susto && s.arquetipo === "cetica" && !t.repetido) o.push("beneficioDaDuvida");
    return o;
  }

  function marcadoresDaAtleta(s) {
    var l = s.marcadores.filter(function (m) { return m.valor >= 1 && m.valor <= 6; }).map(function (m) { return { id: m.id, nome: m.nome, valor: m.valor }; });
    if (s.ferida >= 1 && s.ferida <= 6) l.unshift({ id: "ferida", nome: "Ferida", valor: s.ferida });
    return l;
  }

  function testar(c, s, cfg) {
    var r = rolarTesteBase(c, s, cfg);
    if (!r.ok) return r;
    if (r.semDados) {
      log(c, nomeDe(c.e, s.id) + " não tem dados para o Teste de Susto: nada a perder.");
      if (cfg.pedidoId) { var p0 = pedido(c.e, cfg.pedidoId); if (p0) p0.respostas[s.id] = { semDados: true }; }
      return { ok: true };
    }
    var t = r.teste;
    if (opcoesReativas(c.e, s, t).length) {
      s.teste = t;
      log(c, nomeDe(c.e, s.id) + " rolou " + t.faces.join(", ") + " (" + (t.rotulo || "teste") + ") — esperando a decisão dela.");
      return { ok: true, pendente: true, teste: t };
    }
    return finalizar(c, s, t);
  }

  function contar(t) {
    var suc = 0, falhas = 0, seis = 0, sucessosSeis = 0;
    t.faces.forEach(function (f) { if (f >= t.dificuldade) { suc++; if (f === 6) sucessosSeis++; } else falhas++; if (f === 6) seis++; });
    var total = suc + (t.garantidos || 0);
    var superado = t.complexo ? total === 2 : total >= 1;
    return { sucessos: suc, total: total, falhas: falhas, seis: seis, sucessosSeis: sucessosSeis, superado: superado };
  }

  function finalizar(c, s, t) {
    var e = c.e;
    s.teste = null;
    var n = contar(t);
    var nome = nomeDe(e, s.id);
    /* Recursos gastos. */
    t.recursos.forEach(function (id) {
      var rec = s.recursos.filter(function (x) { return x.id === id; })[0];
      if (rec) { rec.usos -= 1; }
    });
    s.recursos = s.recursos.filter(function (x) { return x.usos > 0; });
    if (t.garantidos) s.pendentes.surpreender = 0;

    /* O registro da rolagem. */
    var rolagem = {
      id: t.id, quem: s.id, nome: nome, rotulo: t.rotulo || "Teste", acao: t.acao, faces: t.faces.slice(), dificuldade: t.dificuldade,
      estilo: t.estilo, complexo: t.complexo, susto: t.susto, sucessos: n.total, garantidos: t.garantidos || 0, superado: n.superado,
      seis: n.seis, destino: t.acao === "ajudarAlguem" ? "manter" : t.destino, devorada: false, quando: agora(), substituido: t.substituido, repetido: t.repetido,
    };
    e.rolagens.push(rolagem);
    if (e.rolagens.length > MAX_ROLAGENS) e.rolagens = e.rolagens.slice(-MAX_ROLAGENS);
    c.rolagens.push(rolagem);
    var resumo = nome + " — " + (t.rotulo || "teste") + ": " + t.faces.join(", ") + " (sucesso em " + t.dificuldade + "+) → " + n.total + " sucesso(s)" + (t.garantidos ? " (com " + t.garantidos + " garantido)" : "") + (t.complexo ? " · Complexo (exatamente 2)" : "") + ": " + (n.superado ? "SUPERADO" : "FALHOU") + ".";
    log(c, resumo);

    /* Esbelta: +1 PT por 6. */
    if (s.arquetipo === "esbelta" && n.seis) ganharPt(c, s, n.seis, "Egocêntrica (" + n.seis + " seis)");
    /* Possessão: +1 por dado falho. */
    var pos = marcadorDe(s, "possessao");
    if (pos && n.falhas) {
      pos.valor = Math.min(6, pos.valor + n.falhas);
      log(c, "Possessão de " + nome + " sobe para " + pos.valor + ".");
      if (pos.valor >= 6) log(c, "A possessão de " + nome + " chegou a 6: a Diretora pode MATAR por meio dela.", true);
    }

    /* As falhas. */
    var destino = rolagem.destino;
    var falhas = n.falhas;
    if (falhas) {
      if (destino === "sacrificar") { s.pilha -= falhas; e.diretora.pilha += falhas; log(c, falhas + " dado(s) SACRIFICADO(S): da Pilha de " + nome + " para a da Diretora."); }
      else if (destino === "descartar") { s.pilha -= falhas; e.descarte += falhas; log(c, falhas + " dado(s) DESCARTADO(S) para a Pilha de Descarte."); }
      else log(c, "Os dados falhos ficam com " + nome + ".");
    }

    /* O efeito de cada ação. */
    var efeito = efeitoDaAcao(c, s, t, n);

    /* Pedido respondido. */
    if (t.pedidoId) {
      var p = pedido(e, t.pedidoId);
      if (p) {
        p.respostas[s.id] = { superado: n.superado, sucessos: n.total, rolagem: t.id };
        if (p.tipo === "susto" && !n.superado) {
          p.falharam.push(s.id);
          ganharPh(c, 1, "Intento Horrível: " + nome + " falhou num Teste de Susto");
          if (p.assustar && temAmeaca(e, "assombracao")) ganharPh(c, 1, "Intento Único (Assombração): " + nome + " falhou no Susto imposto");
        }
        if (p.alvos.every(function (id) { return p.respostas[id] || !sob(e, id) || sob(e, id).situacao === "morta"; })) p.aberto = false;
      }
    }
    if (t.acao === "partirParaCima" && !n.superado && temAmeaca(e, "brutamontes")) ganharPh(c, 2, "Intento Único (Brutamontes): " + nome + " falhou em Partir Para Cima");

    if (ACOES_DE_TURNO.indexOf(t.acao) >= 0) terminarVez(c, s.id, t.acao);
    else if (e.encontro) verificarFim(c);
    return { ok: true, teste: t, contagem: n, rolagem: rolagem, efeito: efeito };
  }

  var ACOES_DE_TURNO = ["ajudarAlguem", "distrair", "partirParaCima", "vazarDali", "livrarRestricao", "livrarAliada"];

  function efeitoDaAcao(c, s, t, n) {
    var e = c.e, nome = nomeDe(e, s.id);
    if (t.acao === "partirParaCima") {
      if (n.superado) {
        if (e.diretora.pilha > 0) { e.diretora.pilha -= 1; e.descarte += 1; log(c, "PARTIR PARA CIMA: a Diretora descarta um dado."); }
      }
      return null;
    }
    if (t.acao === "distrair") {
      if (n.superado) { e.encontro.distrair += 1; log(c, "DISTRAIR: para MATAR nesta rodada a Diretora gasta mais " + e.encontro.distrair + " dado(s) e " + (3 * e.encontro.distrair) + " PH."); }
      return null;
    }
    if (t.acao === "vazarDali") {
      var meta = e.encontro.meta;
      var cabe = Math.max(0, meta - s.fuga);
      var movidos = Math.min(n.sucessos, cabe);
      s.pilha -= movidos; s.fuga += movidos; cabe -= movidos;
      var extras = 0;
      for (var i = 0; i < n.sucessosSeis && cabe > 0; i++) {
        if (s.pilha > 0) { s.pilha -= 1; s.fuga += 1; cabe--; extras++; }
        else if (e.descarte > 0) { e.descarte -= 1; s.fuga += 1; cabe--; extras++; }
      }
      log(c, "VAZAR DALI: " + movidos + " dado(s) para a Pilha de Fuga" + (extras ? " e +" + extras + " pela fuga vantajosa (6)" : "") + ".");
      if (s.fuga >= meta) { s.situacao = "fugiu"; log(c, "🏃 " + nome + " completou a Pilha de Fuga e ESCAPOU do Encontro."); if (e.encontro.rodada === 1) e.encontro.acoesRodada1[s.id] = "vazarDali"; }
      return null;
    }
    if (t.acao === "ajudarAlguem") {
      var alvo = sob(e, t.alvo);
      if (!alvo || n.sucessos < 1) { log(c, "AJUDAR ALGUÉM: nenhum dado doado."); return null; }
      var doar = Math.min(n.sucessos, Math.max(0, K().LIMITES.pilha - alvo.pilha));
      if (doar < n.sucessos) log(c, (n.sucessos - doar) + " sucesso(s) não couberam na Pilha de " + nomeDe(e, alvo.id) + " (limite 6) e ficam com " + nome + ".");
      var doDescarte = 0;
      if (alvo.arquetipo === "inocente" && emEncontro(e, alvo) && !alvo.sessaoUsos.carencia && alvo.carenciaAutomatica && doar > 0) {
        doDescarte = Math.min(doar, e.descarte);
        alvo.sessaoUsos.carencia = true;
        e.descarte -= doDescarte;
        log(c, "CARÊNCIA (" + nomeDe(e, alvo.id) + "): " + nome + " não perde os dados doados; " + doDescarte + " vêm da Pilha de Descarte" + (doDescarte < doar ? " (o resto, sem dados no Descarte, sai de " + nome + ")" : "") + ".");
      }
      s.pilha -= (doar - doDescarte);
      alvo.pilha += doar;
      log(c, "AJUDAR ALGUÉM: " + doar + " dado(s) para " + nomeDe(e, alvo.id) + ".");
      return null;
    }
    if (t.acao === "livrarRestricao") {
      var m = marcadorDe(s, "restricao");
      if (!m) return null;
      m.valor = Math.max(0, m.valor - n.sucessos);
      if (!n.superado) {
        m.valor = Math.min(6, m.valor + 1);
        somarFerida(c, s, m.valor, "falhou contra a RESTRIÇÃO");
      }
      if (m.valor <= 0) { s.marcadores = s.marcadores.filter(function (x) { return x !== m; }); log(c, "A RESTRIÇÃO de " + nome + " foi removida."); }
      else log(c, "Restrição de " + nome + " em " + m.valor + ".");
      return null;
    }
    if (t.acao === "livrarAliada") {
      var presa = sob(e, t.alvo);
      if (presa && n.superado && presa.segurada) { presa.segurada = false; log(c, nome + " livrou " + nomeDe(e, presa.id) + " das mãos do Assassino."); }
      return null;
    }
    return null;
  }

  function ganharPt(c, s, n, motivo) {
    var antes = s.pt;
    s.pt = Math.min(K().LIMITES.pt, s.pt + n);
    var ganhou = s.pt - antes;
    log(c, nomeDe(c.e, s.id) + ": +" + ganhou + " PT (" + motivo + ")" + (ganhou < n ? " — limite de 10 PT" : "") + ".");
  }

  /* =================================================================
     A PORTA: aplicar(estado, op, papel, rolar)
     ================================================================= */

  var OPS_DA_DIRETORA = ["configurarAssassino", "configurarLacunas", "vantagemDaMesa", "novoThriller", "novaSessao", "mudarCena", "presenca",
    "darPt", "ajustar", "ajustarDiretora", "marcador", "estilo", "situacao", "pedirTeste", "encerrarPedido", "intento", "resolverPendencia",
    "iniciarEncontro", "encerrarEncontro", "passarVez", "fimDoTurno", "assustar", "ferir", "acidentar", "resolverSeis", "incapacitar", "segurar",
    "matar", "matarPorPossessao", "escapar", "possuir", "restringir", "devorar", "sintoCheiro", "mudandoDePlanos", "revelarAssassino"];
  var OPS_DA_SOBREVIVENTE = ["teste", "confirmarTeste", "repetirSusto", "acaoEncontro", "habilidade", "usarPlanejarFuga", "vantagem", "apego", "recurso", "dadoManual", "preferencia"];

  function aplicar(estado, op, papel, rolar) {
    var o = obj(op);
    var tipo = String(o.tipo || "");
    var pp = obj(papel);
    var c = contexto(estado, pp, rolar);
    if (OPS_DA_DIRETORA.indexOf(tipo) >= 0) {
      if (!pp.diretora) return { ok: false, motivo: "Só a Diretora faz isso." };
      return fechar(c, opsDaDiretora(c, tipo, o));
    }
    if (OPS_DA_SOBREVIVENTE.indexOf(tipo) >= 0) {
      var s = sob(estado, o.quem);
      if (!s) return { ok: false, motivo: "Sobrevivente fora deste Thriller." };
      if (!pp.diretora && lista(pp.pode).indexOf(s.id) < 0) return { ok: false, motivo: "Você só age pelas suas Sobreviventes." };
      return fechar(c, opsDaSobrevivente(c, tipo, o, s));
    }
    return { ok: false, motivo: "Operação desconhecida." };
  }

  function fechar(c, r) {
    var res = r || { ok: true };
    if (res.ok === false) return res;
    return Object.assign({ ok: true }, res, { eventos: c.eventos, rolagens: c.rolagens, fichas: c.fichas });
  }

  function custoPh(c, n, motivo) {
    if (c.e.diretora.ph < n) return "Faltam Pontos de Horror: " + motivo + " custa " + n + ", há " + c.e.diretora.ph + ".";
    c.e.diretora.ph -= n;
    if (n) log(c, "−" + n + " PH: " + motivo + ".", true);
    return "";
  }

  function opsDaDiretora(c, tipo, o) {
    var e = c.e;
    var s = o.alvo !== undefined ? sob(e, o.alvo) : null;
    switch (tipo) {
      case "configurarAssassino": {
        var modelo = K().ASSASSINOS[o.modelo] ? o.modelo : "personalizado";
        var base = K().ASSASSINOS[o.modelo];
        var a = e.assassino;
        a.modelo = modelo;
        a.nome = texto(o.nome, 80) || (base ? base.nome : "Assassino");
        var ameacas = lista(o.ameacas).filter(function (x, i, t) { return !!K().AMEACAS[x] && t.indexOf(x) === i; }).slice(0, 2);
        a.ameacas = base ? base.ameacas.slice() : ameacas;
        if (!base && a.ameacas.length < 1) return { ok: false, motivo: "Escolha as Ameaças (a primeira é a Principal)." };
        var unicas = lista(o.acoesUnicas).filter(function (x, i, t) { var d = K().ACOES_ASSASSINO[x]; return d && d.tipo === "unica" && t.indexOf(x) === i; });
        if (base) unicas = base.acoesUnicas.slice();
        else {
          /* Uma Ação Única por Ameaça, da lista dela (p. 11). */
          var escolhidas = [];
          a.ameacas.forEach(function (m) {
            var l = K().AMEACAS[m].acoesUnicas;
            var x = unicas.filter(function (u) { return l.indexOf(u) >= 0 && escolhidas.indexOf(u) < 0; })[0];
            if (x) escolhidas.push(x);
          });
          unicas = escolhidas;
        }
        a.acoesUnicas = unicas;
        a.apavoro = base ? base.apavoro : (K().APAVOROS[o.apavoro] ? o.apavoro : "");
        a.dadosIniciais = base ? base.dados : (o.dados === "" || o.dados === null || o.dados === undefined ? null : limitar(inteiro(o.dados, 0), 0, 30));
        a.phIniciais = base ? base.ph : (o.ph === "" || o.ph === null || o.ph === undefined ? null : limitar(inteiro(o.ph, 0), 0, 30));
        a.sustosPorEncontro = base ? base.sustos : (o.sustos === "" || o.sustos === null || o.sustos === undefined ? null : limitar(inteiro(o.sustos, 0), 0, 20));
        a.estigma = texto(o.estigma, 600);
        a.notas = texto(o.notas, 2000);
        if (!base && (a.dadosIniciais === null || a.phIniciais === null || a.sustosPorEncontro === null)) return { ok: false, motivo: "Um Assassino personalizado precisa de dados iniciais, PH iniciais e Testes de Susto por Encontro (o Corte Rápido não traz o Nível de Brutalidade)." };
        if (o.aplicarPilha) { e.diretora.pilha = a.dadosIniciais || 0; e.diretora.ph = a.phIniciais || 0; log(c, "Pilha da Diretora: " + e.diretora.pilha + " dado(s); " + e.diretora.ph + " PH.", true); }
        log(c, "Assassino: " + a.nome + " (" + a.ameacas.map(function (m) { return K().AMEACAS[m].nome; }).join(" ") + ").", true);
        return { ok: true };
      }
      case "revelarAssassino": e.assassino.revelado = o.revelado !== false; log(c, e.assassino.revelado ? "O Assassino foi revelado: " + e.assassino.nome + "." : "O Assassino voltou a ficar oculto."); return { ok: true };
      case "configurarLacunas": {
        if (o.fonteDosDados !== undefined) e.lacunas.fonteDosDados = ["auto", "descarte", "novo"].indexOf(o.fonteDosDados) >= 0 ? o.fonteDosDados : "auto";
        if (o.custoTratarFeridas !== undefined) e.lacunas.custoTratarFeridas = o.custoTratarFeridas === null || o.custoTratarFeridas === "" ? null : limitar(inteiro(o.custoTratarFeridas, 0), 0, 10);
        if (o.recargaPlanejarFuga !== undefined) e.lacunas.recargaPlanejarFuga = ["pendente", "fimEncontro", "semRestricao"].indexOf(o.recargaPlanejarFuga) >= 0 ? o.recargaPlanejarFuga : "pendente";
        log(c, "Lacunas do Corte Rápido ajustadas pela Diretora.");
        return { ok: true };
      }
      case "vantagemDaMesa": {
        if (o.acao === "remover") { e.vantagensDaMesa = e.vantagensDaMesa.filter(function (v) { return v.id !== o.id; }); return { ok: true }; }
        var v = normalizarVantagemDaMesa(o.vantagem);
        if (!v) return { ok: false, motivo: "Dê um nome à Vantagem." };
        var i = e.vantagensDaMesa.map(function (x) { return x.id; }).indexOf(v.id);
        if (i >= 0) e.vantagensDaMesa[i] = v; else e.vantagensDaMesa.push(v);
        log(c, "Vantagem da mesa: " + v.nome + " (" + v.custo + " PT).");
        return { ok: true };
      }
      case "novoThriller": {
        var guardar = { assassino: copiar(e.assassino), lacunas: copiar(e.lacunas), vantagensDaMesa: copiar(e.vantagensDaMesa), registro: e.registro.slice(-20) };
        var elencoAntes = elenco(e).map(function (x) { return { id: x.id, nome: x.nome, arquetipo: x.arquetipo, desejoRevelado: x.desejoRevelado, carenciaAutomatica: x.carenciaAutomatica }; });
        var novo = estadoVazio();
        Object.keys(novo).forEach(function (k) { e[k] = novo[k]; });
        e.assassino = guardar.assassino; e.lacunas = guardar.lacunas; e.vantagensDaMesa = guardar.vantagensDaMesa; e.registro = guardar.registro;
        elencoAntes.forEach(function (x) { var n = sobreviventeVazio(x.id, x.nome); n.arquetipo = x.arquetipo; n.estilos = x.arquetipo ? K().ARQUETIPOS[x.arquetipo].estilos.slice() : []; n.desejoRevelado = x.desejoRevelado; n.carenciaAutomatica = x.carenciaAutomatica; e.sobreviventes[x.id] = n; });
        e.diretora.pilha = e.assassino.dadosIniciais || 0;
        e.diretora.ph = e.assassino.phIniciais || 0;
        log(c, "Um NOVO THRILLER começa: cada Sobrevivente com 6 dados e 0 PT; a Diretora com " + e.diretora.pilha + " dado(s).");
        return { ok: true };
      }
      case "novaSessao": {
        if (e.encontro) return { ok: false, motivo: "Encerre o Encontro antes." };
        e.sessao += 1;
        elenco(e).forEach(function (x) { x.sessaoUsos = {}; });
        recarregar(e, "inicioSessao");
        log(c, "Sessão " + e.sessao + " do Thriller.");
        return { ok: true };
      }
      case "mudarCena": {
        if (e.encontro) return { ok: false, motivo: "Encerre o Encontro para mudar de cena." };
        if (["livre", "suspense"].indexOf(o.cena) < 0) return { ok: false, motivo: "Cena inválida (o Encontro começa pelo botão próprio)." };
        e.cena = o.cena;
        e.posEncontro = false;
        if (o.cena === "livre") recarregar(e, "livre");
        log(c, "Cena: " + K().CENAS[o.cena].nome + ".");
        return { ok: true };
      }
      case "presenca": if (!s) return { ok: false, motivo: "Escolha a Sobrevivente." }; s.presente = o.presente !== false; log(c, nomeDe(e, s.id) + (s.presente ? " está na cena." : " saiu da cena.")); return { ok: true };
      case "darPt": {
        if (!s) return { ok: false, motivo: "Escolha a Sobrevivente." };
        var n = inteiro(o.valor, 0);
        if (!n) return { ok: false, motivo: "Quantos PT?" };
        if (n > 0) ganharPt(c, s, n, texto(o.motivo, 80) || "Desafio");
        else { s.pt = Math.max(0, s.pt + n); log(c, nomeDe(e, s.id) + ": " + n + " PT (" + (texto(o.motivo, 80) || "correção") + ")."); }
        return { ok: true };
      }
      case "ajustar": {
        if (!s) return { ok: false, motivo: "Escolha a Sobrevivente." };
        var campo = o.campo, d = inteiro(o.delta, 0);
        if (["pilha", "pt", "ferida", "sequelas", "fuga"].indexOf(campo) < 0 || !d) return { ok: false, motivo: "Ajuste inválido." };
        var max = { pilha: K().LIMITES.pilha, pt: K().LIMITES.pt, ferida: 99, sequelas: 99, fuga: e.encontro ? e.encontro.meta : 0 }[campo];
        var antes = s[campo];
        s[campo] = limitar(s[campo] + d, 0, max);
        if (campo === "sequelas" && s[campo] > antes) { s[campo] = antes; sofrerSequela(c, s, d, "ajuste da Diretora"); }
        log(c, "Ajuste da Diretora: " + campo + " de " + nomeDe(e, s.id) + " " + antes + " → " + s[campo] + ".");
        if (campo === "fuga" && e.encontro && s.fuga >= e.encontro.meta && s.situacao === "viva") { s.situacao = "fugiu"; log(c, nomeDe(e, s.id) + " escapou do Encontro."); verificarFim(c); }
        return { ok: true };
      }
      case "ajustarDiretora": {
        var cd = o.campo, dd = inteiro(o.delta, 0);
        if (["pilha", "ph", "descarte"].indexOf(cd) < 0 || !dd) return { ok: false, motivo: "Ajuste inválido." };
        if (cd === "descarte") e.descarte = Math.max(0, e.descarte + dd);
        else e.diretora[cd] = Math.max(0, e.diretora[cd] + dd);
        log(c, "Ajuste: " + ({ pilha: "Pilha da Diretora", ph: "Pontos de Horror", descarte: "Pilha de Descarte" })[cd] + " " + (dd > 0 ? "+" : "") + dd + ".", cd === "ph");
        if (cd === "pilha" && e.encontro) verificarFim(c);
        return { ok: true };
      }
      case "marcador": {
        if (!s) return { ok: false, motivo: "Escolha a Sobrevivente." };
        if (o.acao === "remover") { s.marcadores = s.marcadores.filter(function (m) { return m.id !== o.marcador; }); log(c, "Marcador removido de " + nomeDe(e, s.id) + "."); return { ok: true }; }
        if (o.acao === "ajustar") {
          var mm = s.marcadores.filter(function (m) { return m.id === o.marcador; })[0];
          if (!mm) return { ok: false, motivo: "Marcador não encontrado." };
          mm.valor = limitar(inteiro(o.valor, mm.valor), 0, 6);
          if (mm.valor === 0) s.marcadores = s.marcadores.filter(function (m) { return m !== mm; });
          log(c, "Marcador " + mm.nome + " de " + nomeDe(e, s.id) + " em " + mm.valor + ".");
          return { ok: true };
        }
        var nome = texto(o.nome, 60).trim() || "Condição";
        var valor = limitar(inteiro(o.valor, 1), 1, 6);
        var existente = s.marcadores.filter(function (m) { return m.tipo === "condicao" && m.nome.toLowerCase() === nome.toLowerCase(); })[0];
        if (existente) { existente.valor = valor; log(c, nomeDe(e, s.id) + ": o marcador " + nome + " é substituído pelo novo (" + valor + ")."); }
        else { s.marcadores.push({ id: novoId("m"), tipo: "condicao", nome: nome, valor: valor }); log(c, nomeDe(e, s.id) + " recebe o Dado Marcador " + nome + " (" + valor + ")."); }
        return { ok: true };
      }
      case "estilo": {
        if (!s || s.estilos.indexOf(o.estilo) < 0) return { ok: false, motivo: "Estilo inválido." };
        if (o.incapacitado) { if (s.incapacitados.indexOf(o.estilo) < 0) s.incapacitados.push(o.estilo); }
        else s.incapacitados = s.incapacitados.filter(function (x) { return x !== o.estilo; });
        log(c, "Estilo " + K().ESTILOS[o.estilo].nome + " de " + nomeDe(e, s.id) + (o.incapacitado ? " incapacitado." : " recuperado."));
        return { ok: true };
      }
      case "situacao": {
        if (!s || ["viva", "morta"].indexOf(o.situacao) < 0) return { ok: false, motivo: "Situação inválida." };
        if (o.situacao === "morta") morrer(c, s, texto(o.causa, 80) || "decisão da Diretora");
        else { s.situacao = "viva"; log(c, nomeDe(e, s.id) + " volta ao Thriller (correção da Diretora)."); }
        if (e.encontro) verificarFim(c);
        return { ok: true };
      }
      case "pedirTeste": {
        var alvos = lista(o.alvos).map(String).filter(function (id) { var x = sob(e, id); return x && x.situacao !== "morta" && !x.foraDaCampanha && (!e.encontro || x.situacao === "viva"); });
        if (!alvos.length) return { ok: false, motivo: "Escolha quem testa." };
        criarPedido(c, { tipo: o.teste, alvos: alvos, rotulo: o.rotulo, destino: o.destino });
        return { ok: true };
      }
      case "encerrarPedido": { var p = pedido(e, o.pedido); if (p) p.aberto = false; return { ok: true }; }
      case "intento": {
        var ch = o.chave;
        if (ch === "beijo") ganharPh(c, 1, "Intento Horrível: Sobreviventes se beijaram");
        else if (ch === "armadilha") {
          ganharPh(c, 2, "Intento Horrível: " + (s ? nomeDe(e, s.id) : "uma Sobrevivente") + " caiu numa Armadilha");
          if (e.cena === "suspense" && temAmeaca(e, "estrategico")) ganharPh(c, 1, "Intento Único (Estratégico): Armadilha ativada num Suspense");
          log(c, (s ? nomeDe(e, s.id) : "Uma Sobrevivente") + " caiu numa Armadilha.");
        } else if (ch === "suspiro") ganharPh(c, 1, "ASSUSTAR: alguém suspirou de medo ou se contorceu de nojo");
        else return { ok: false, motivo: "Intento desconhecido." };
        return { ok: true };
      }
      case "resolverPendencia": e.pendencias = e.pendencias.filter(function (x) { return x.id !== o.id; }); return { ok: true };
      case "iniciarEncontro": return iniciarEncontro(c, o);
      case "encerrarEncontro": if (!e.encontro) return { ok: false, motivo: "Não há Encontro." }; encerrarEncontro(c, texto(o.motivo, 120) || "decisão da Diretora."); return { ok: true };
      case "passarVez": {
        if (!e.encontro) return { ok: false, motivo: "Não há Encontro." };
        if (e.seis) return { ok: false, motivo: "Resolva o 6 do FERIR antes." };
        var quem = daVez(e);
        log(c, (quem === "assassino" ? "O Assassino" : nomeDe(e, quem)) + " passa a vez.");
        if (quem === "assassino") { irParaVez(c, e.encontro.ordem.length); return { ok: true }; }
        terminarVez(c, quem, "passou");
        return { ok: true };
      }
      case "fimDoTurno": {
        if (!e.encontro || !vezDoAssassino(e)) return { ok: false, motivo: "Não é a vez do Assassino." };
        if (e.seis) return { ok: false, motivo: "Resolva o 6 do FERIR antes." };
        irParaVez(c, e.encontro.ordem.length);
        return { ok: true };
      }
      case "assustar": {
        if (e.cena === "suspense") return { ok: false, motivo: "ASSUSTAR é das cenas Livre e Encontro (p. 13)." };
        var alvosS = (lista(o.alvos).length ? lista(o.alvos).map(String) : (e.encontro ? restantesNoEncontro(e).map(function (x) { return x.id; }) : naCena(e).map(function (x) { return x.id; })))
          .filter(function (id) { var x = sob(e, id); return x && x.situacao === "viva" && (!e.encontro || emEncontro(e, x)); });
        if (!alvosS.length) return { ok: false, motivo: "Ninguém para assustar." };
        if (e.encontro) {
          var m1 = motivoDoTurnoDoAssassino(e); if (m1) return { ok: false, motivo: m1 };
          if (e.encontro.sustos < 1) return { ok: false, motivo: "Sem Testes de Susto restantes neste Encontro." };
          e.encontro.sustos -= 1;
          e.encontro.acaoFeita = true;
        }
        criarPedido(c, { tipo: "susto", alvos: alvosS, rotulo: "ASSUSTAR — Teste de Susto", assustar: true });
        return { ok: true };
      }
      case "ferir": {
        var m2 = motivoDoTurnoDoAssassino(e); if (m2) return { ok: false, motivo: m2 };
        if (!s || !emEncontro(e, s)) return { ok: false, motivo: "Escolha uma Sobrevivente do Encontro." };
        if (e.diretora.pilha < 1) return { ok: false, motivo: "A Pilha da Diretora está vazia." };
        e.encontro.acaoFeita = true;
        return ferirRolar(c, s, "FERIR");
      }
      case "acidentar": {
        if (e.cena !== "livre" || e.encontro) return { ok: false, motivo: "ACIDENTAR é só em cena Livre." };
        if (!temAcao(e, "acidentar")) return { ok: false, motivo: "Este Assassino não tem ACIDENTAR." };
        var pa = pedido(e, o.pedido);
        if (!pa || !pa.assustar || pa.falharam.indexOf(String(o.alvo)) < 0) return { ok: false, motivo: "Só numa Sobrevivente que falhou no Susto do ASSUSTAR." };
        if (!s || s.situacao !== "viva") return { ok: false, motivo: "Alvo inválido." };
        if (e.diretora.pilha < 1) return { ok: false, motivo: "A Pilha da Diretora está vazia." };
        var m3 = custoPh(c, 4, "ACIDENTAR"); if (m3) return { ok: false, motivo: m3 };
        pa.falharam = pa.falharam.filter(function (x) { return x !== s.id; });
        return ferirRolar(c, s, "ACIDENTAR");
      }
      case "resolverSeis": {
        if (!e.seis) return { ok: false, motivo: "Não há 6 para resolver." };
        var alvo6 = sob(e, e.seis.alvo);
        e.seis = null;
        if (o.escolha === "mutilar") {
          sofrerSequela(c, alvo6, 3, "MUTILAR");
          ganharPh(c, 4, "MUTILAR");
          log(c, "MUTILAR: " + nomeDe(e, alvo6.id) + " fica viva, com mais 3 Sequelas e uma última chance de correr.");
          if (e.encontro) e.encontro.ferido = alvo6.id;
        } else morrer(c, alvo6, "6 no FERIR");
        if (e.encontro) verificarFim(c);
        return { ok: true };
      }
      case "incapacitar": {
        if (!temAcao(e, "incapacitar")) return { ok: false, motivo: "Este Assassino não tem INCAPACITAR." };
        if (!e.encontro || !s || e.encontro.ferido !== s.id || s.situacao !== "viva") return { ok: false, motivo: "Só logo depois de FERIR esta Sobrevivente num Encontro." };
        if (s.estilos.indexOf(o.estilo) < 0 || s.incapacitados.indexOf(o.estilo) >= 0) return { ok: false, motivo: "Escolha um Estilo dela que esteja ativo." };
        var m4 = custoPh(c, 4, "INCAPACITAR"); if (m4) return { ok: false, motivo: m4 };
        s.incapacitados.push(o.estilo);
        log(c, "INCAPACITAR: o Estilo " + K().ESTILOS[o.estilo].nome + " de " + nomeDe(e, s.id) + " (e a Vantagem dele) está incapacitado.");
        return { ok: true };
      }
      case "segurar": {
        if (!temAcao(e, "segurar")) return { ok: false, motivo: "Este Assassino não tem SEGURAR." };
        if (!e.encontro || !s || e.encontro.ferido !== s.id || s.situacao !== "viva") return { ok: false, motivo: "Só logo depois de FERIR esta Sobrevivente sem matá-la." };
        if (s.segurada) return { ok: false, motivo: "Ela já está SEGURADA." };
        var m5 = custoPh(c, 5, "SEGURAR"); if (m5) return { ok: false, motivo: m5 };
        s.segurada = true;
        log(c, "SEGURAR: " + nomeDe(e, s.id) + " está imobilizada — não move dados para a Fuga e a Ferida sobe 1 a cada turno dela. As outras podem tentar livrá-la (Teste Complexo).");
        return { ok: true };
      }
      case "matar": {
        var m6 = motivoDoTurnoDoAssassino(e); if (m6) return { ok: false, motivo: m6 };
        if (!s || !emEncontro(e, s)) return { ok: false, motivo: "Escolha uma Sobrevivente do Encontro." };
        if (!(s.pilha < e.diretora.pilha)) return { ok: false, motivo: "MATAR exige que ela tenha menos dados (" + s.pilha + ") que a sua Pilha (" + e.diretora.pilha + ")." };
        var nd = e.encontro.distrair;
        if (nd) {
          if (e.diretora.pilha < nd) return { ok: false, motivo: "DISTRAIR: MATAR custa mais " + nd + " dado(s) da sua Pilha." };
          if (e.diretora.ph < 3 * nd) return { ok: false, motivo: "DISTRAIR: MATAR custa mais " + (3 * nd) + " PH." };
          e.diretora.pilha -= nd; e.descarte += nd; e.diretora.ph -= 3 * nd;
          log(c, "Por DISTRAIR, a Diretora gasta " + nd + " dado(s) e " + (3 * nd) + " PH para MATAR.");
        }
        e.encontro.acaoFeita = true;
        morrer(c, s, "MATAR");
        verificarFim(c);
        return { ok: true };
      }
      case "matarPorPossessao": {
        var possuida = sob(e, o.possuida);
        var mp = possuida ? marcadorDe(possuida, "possessao") : null;
        if (!mp || mp.valor < 6) return { ok: false, motivo: "A possessão precisa estar em 6." };
        if (!s || s.situacao === "morta" || s.id === possuida.id) return { ok: false, motivo: "Escolha a vítima." };
        if (e.encontro && emEncontro(e, possuida) && daVez(e) !== possuida.id) return { ok: false, motivo: "Num Encontro, isso acontece na vez da possuída." };
        possuida.marcadores = possuida.marcadores.filter(function (x) { return x !== mp; });
        log(c, "POSSUIR: por meio de " + nomeDe(e, possuida.id) + ", o Assassino mata " + nomeDe(e, s.id) + ". O marcador é descartado.");
        morrer(c, s, "POSSUIR");
        if (e.encontro && emEncontro(e, possuida)) { log(c, nomeDe(e, possuida.id) + " perde a vez."); terminarVez(c, possuida.id, "possuida"); }
        else if (e.encontro) verificarFim(c);
        return { ok: true };
      }
      case "escapar": {
        var m7 = motivoDoTurnoDoAssassino(e); if (m7) return { ok: false, motivo: m7 };
        e.diretora.pilha += 1;
        log(c, "ESCAPAR: o Assassino se retira e recebe 1 dado na Pilha.");
        encerrarEncontro(c, "O Assassino abandonou o Encontro.");
        return { ok: true };
      }
      case "possuir":
      case "restringir": {
        if (!temAcao(e, tipo)) return { ok: false, motivo: "Este Assassino não tem " + tipo.toUpperCase() + "." };
        var m8 = motivoDoTurnoDoAssassino(e); if (m8) return { ok: false, motivo: m8 };
        if (!s || !emEncontro(e, s)) return { ok: false, motivo: "Escolha uma Sobrevivente do Encontro." };
        var tm = tipo === "possuir" ? "possessao" : "restricao";
        s.marcadores = s.marcadores.filter(function (x) { return x.tipo !== tm; });
        s.marcadores.push({ id: novoId("m"), tipo: tm, nome: tipo === "possuir" ? "Possessão" : "Restrição", valor: tipo === "possuir" ? 1 : 3 });
        e.encontro.acaoFeita = true;
        log(c, tipo === "possuir" ? "POSSUIR: " + nomeDe(e, s.id) + " recebe um Dado Marcador 1 de Possessão." : "RESTRINGIR: " + nomeDe(e, s.id) + " recebe um Dado Marcador 3 — todos os testes dela são Complexos.");
        return { ok: true };
      }
      case "devorar": {
        if (!temAcao(e, "devorar")) return { ok: false, motivo: "Este Assassino não tem DEVORAR." };
        var rg = e.rolagens.filter(function (r) { return r.id === o.rolagem; })[0];
        if (!rg || !rg.seis) return { ok: false, motivo: "Só num teste com um 6." };
        if (rg.devorada) return { ok: false, motivo: "Esta esperança já foi devorada." };
        rg.devorada = true;
        ganharPh(c, 1, "DEVORAR a esperança de " + rg.nome);
        log(c, "O Assassino DEVORA a esperança de " + rg.nome + " (ela mantém o sucesso).");
        return { ok: true };
      }
      case "sintoCheiro": {
        if (!e.encontro || !e.encontro.cheiro) return { ok: false, motivo: "Só logo depois da primeira morte do Encontro." };
        var nInt = elenco(e).length;
        var m9 = custoPh(c, 2 * nInt, "SINTO CHEIRO DE SANGUE! (2 PH × " + nInt + " Intérpretes)"); if (m9) return { ok: false, motivo: m9 };
        e.encontro.cheiro = false;
        e.diretora.usos.sintoCheiroDeSangue = true;
        restantesNoEncontro(e).forEach(function (x) { if (x.pilha > 0) { x.pilha -= 1; e.descarte += 1; } });
        log(c, "SINTO CHEIRO DE SANGUE!: cada Sobrevivente viva descarta 1 dado.");
        verificarFim(c);
        return { ok: true };
      }
      case "mudandoDePlanos": {
        if (e.assassino.apavoro !== "mudandoDePlanos") return { ok: false, motivo: "Mudando de Planos! não é o Apavoro deste Assassino." };
        if (!e.posEncontro) return { ok: false, motivo: "Só logo após o fim de um Encontro." };
        if (e.diretora.usos.mudandoDePlanos) return { ok: false, motivo: "Já usado — volta no fim de um Encontro." };
        if (e.assassino.acoesUnicas.indexOf(o.de) < 0) return { ok: false, motivo: "Escolha uma Ação Única que ele tem." };
        var mesma = e.assassino.ameacas.some(function (m) { var l = K().AMEACAS[m].acoesUnicas; return l.indexOf(o.de) >= 0 && l.indexOf(o.para) >= 0; });
        if (!mesma || e.assassino.acoesUnicas.indexOf(o.para) >= 0) return { ok: false, motivo: "A nova Ação Única precisa ser da mesma lista de Ameaça (e ainda não ser dele)." };
        var m10 = custoPh(c, 5, "MUDANDO DE PLANOS!"); if (m10) return { ok: false, motivo: m10 };
        e.diretora.usos.mudandoDePlanos = true;
        e.assassino.acoesUnicas = e.assassino.acoesUnicas.map(function (x) { return x === o.de ? o.para : x; });
        log(c, "MUDANDO DE PLANOS!: " + K().ACOES_ASSASSINO[o.de].nome + " → " + K().ACOES_ASSASSINO[o.para].nome + ".", true);
        return { ok: true };
      }
    }
    return { ok: false, motivo: "Operação desconhecida." };
  }

  function motivoDoTurnoDoAssassino(e) {
    if (!e.encontro) return "Só durante um Encontro.";
    if (!vezDoAssassino(e)) return "Ainda não é a vez do Assassino.";
    if (e.seis) return "Resolva o 6 do FERIR antes.";
    if (e.encontro.acaoFeita) return "O Assassino já fez a ação dele nesta vez.";
    return "";
  }

  function ferirRolar(c, s, origem) {
    var e = c.e;
    var v = rolarD6(c);
    e.diretora.pilha -= 1;
    e.descarte += 1;
    var rolagem = { id: novoId("f"), quem: "assassino", nome: "Assassino", rotulo: origem + " em " + nomeDe(e, s.id), acao: "ferir", faces: [v], dificuldade: null, sucessos: null, superado: null, seis: v === 6 ? 1 : 0, destino: "descartar", quando: agora() };
    e.rolagens.push(rolagem);
    if (e.rolagens.length > MAX_ROLAGENS) e.rolagens = e.rolagens.slice(-MAX_ROLAGENS);
    c.rolagens.push(rolagem);
    log(c, origem + ": a Diretora rola um dado contra " + nomeDe(e, s.id) + " — " + v + ". O dado é descartado.");
    /* "Sofre 1 Sequela toda vez que for alvo de uma ação FERIR" (p. 13). */
    sofrerSequela(c, s, 1, "alvo de " + origem);
    if (e.encontro) e.encontro.ferido = s.id;
    if (v === 6) {
      e.seis = { alvo: s.id, origem: origem };
      log(c, "6! A Diretora decide: a morte instantânea ou MUTILAR.");
    } else aplicarFerida(c, s, v, "(" + origem + ")");
    if (e.encontro && !e.seis) verificarFim(c);
    return { ok: true, valor: v };
  }

  function opsDaSobrevivente(c, tipo, o, s) {
    var e = c.e, nome = nomeDe(e, s.id), m;
    if (s.teste && ["confirmarTeste", "repetirSusto", "preferencia"].indexOf(tipo) < 0) return { ok: false, motivo: "Confirme o teste que está esperando." };
    switch (tipo) {
      case "teste": {
        var p = o.pedido ? pedido(e, o.pedido) : null;
        if (o.pedido && !p) return { ok: false, motivo: "Teste pedido não encontrado." };
        m = motivoDoTeste(e, s, p); if (m) return { ok: false, motivo: m };
        var susto = p ? p.tipo === "susto" : !!o.susto;
        return testar(c, s, { dados: o.dados, estilo: o.estilo, recursos: o.recursos, complexo: p ? p.tipo === "complexo" : !!o.complexo, susto: susto, pedidoId: p ? p.id : "", destino: p ? p.destino : "auto", rotulo: p ? p.rotulo : (texto(o.rotulo, 120) || (susto ? "Teste de Susto" : "Teste")) });
      }
      case "confirmarTeste": {
        if (!s.teste) return { ok: false, motivo: "Não há teste esperando." };
        var t = s.teste;
        var sub = obj(o.substituir);
        if (sub.marcador) {
          if (s.arquetipo !== "atleta" || s.usos["h:resiliencia"]) return { ok: false, motivo: "Resiliência não está disponível." };
          var mk = marcadoresDaAtleta(s).filter(function (x) { return x.id === sub.marcador; })[0];
          var idx = inteiro(sub.indice, -1);
          if (!mk || idx < 0 || idx >= t.faces.length) return { ok: false, motivo: "Escolha o dado e o marcador." };
          log(c, "RESILIÊNCIA: " + nome + " troca o " + t.faces[idx] + " pelo valor do marcador " + mk.nome + " (" + mk.valor + ").");
          t.faces[idx] = mk.valor;
          t.substituido = { indice: idx, valor: mk.valor, marcador: mk.nome };
          s.usos["h:resiliencia"] = true;
        }
        return finalizar(c, s, t);
      }
      case "repetirSusto": {
        var tt = s.teste;
        if (!tt || !tt.susto || s.arquetipo !== "cetica" || tt.repetido) return { ok: false, motivo: "Benefício da Dúvida não está disponível." };
        var antes = tt.faces.slice();
        tt.faces = tt.faces.map(function () { return rolarD6(c); });
        tt.repetido = true;
        log(c, "BENEFÍCIO DA DÚVIDA: " + nome + " repete o Teste de Susto (" + antes.join(", ") + " → " + tt.faces.join(", ") + ").");
        if (!opcoesReativas(e, s, tt).length) return finalizar(c, s, tt);
        return { ok: true, pendente: true, teste: tt };
      }
      case "acaoEncontro": {
        var acao = String(o.acao || "");
        if (!K().ACOES_ENCONTRO[acao] && ["livrarRestricao", "livrarAliada"].indexOf(acao) < 0) return { ok: false, motivo: "Ação desconhecida." };
        m = motivoDaAcao(e, s, acao); if (m) return { ok: false, motivo: m };
        if (acao === "recuperarFolego") {
          receberDado(c, s, "Recuperar Fôlego");
          terminarVez(c, s.id, acao);
          return { ok: true };
        }
        if (acao === "arriscarTudo") {
          var alvo = sob(e, o.alvo || s.id);
          if (!alvo || !emEncontro(e, alvo)) return { ok: false, motivo: "Escolha uma Sobrevivente do Encontro." };
          var manter = alvo.id === s.id && s.arquetipo === "heroina" && o.manterUm === true && s.pilha > 0;
          var perde = manter ? s.pilha - 1 : s.pilha;
          s.pilha -= perde; e.descarte += perde;
          e.encontro.arriscarTudo = s.id;
          s.sessaoUsos.arriscarTudo = true;
          alvo.situacao = "fugiu";
          if (e.encontro.rodada === 1) { e.encontro.acoesRodada1[s.id] = "arriscarTudo"; if (alvo.id !== s.id) e.encontro.acoesRodada1[alvo.id] = e.encontro.acoesRodada1[alvo.id] || "fugiu"; }
          log(c, "ARRISCAR TUDO: " + nome + " descarta " + perde + " dado(s)" + (manter ? " e, por Até o Fim, mantém um" : "") + "; " + nomeDe(e, alvo.id) + " escapa do Encontro.");
          terminarVez(c, s.id, acao);
          return { ok: true };
        }
        var defs = {
          ajudarAlguem: { estilo: o.estilo, rotulo: "Ajudar Alguém" },
          distrair: { estilo: "desenrolado", complexo: true, rotulo: "Distrair (Complexo Desenrolado)" },
          partirParaCima: { estilo: "potente", rotulo: "Partir Para Cima (Potente)" },
          vazarDali: { estilo: "ligeiro", rotulo: "Vazar Dali (Ligeiro)" },
          livrarRestricao: { estilo: o.estilo === "sagaz" ? "sagaz" : "ligeiro", rotulo: "Livrar-se da Restrição" },
          livrarAliada: { estilo: o.estilo, complexo: true, rotulo: "Livrar a aliada (Complexo)" },
        };
        var d = defs[acao];
        if (acao === "ajudarAlguem") { var aj = sob(e, o.alvo); if (!aj || aj.id === s.id || !emEncontro(e, aj)) return { ok: false, motivo: "Escolha outra Sobrevivente do Encontro." }; }
        if (acao === "livrarAliada") { var pr = sob(e, o.alvo); if (!pr || !pr.segurada || pr.id === s.id) return { ok: false, motivo: "Escolha quem está SEGURADA." }; }
        return testar(c, s, { dados: o.dados, estilo: d.estilo, recursos: o.recursos, complexo: !!d.complexo, acao: acao, alvo: o.alvo ? String(o.alvo) : "", rotulo: d.rotulo, destino: "descartar" });
      }
      case "habilidade": {
        m = motivoDaHabilidade(e, s, o.chave); if (m) return { ok: false, motivo: m };
        if (o.chave === "memoriaFotografica") {
          s.sessaoUsos.memoria = true;
          e.encontro.revelada[s.id] = true;
          log(c, "MEMÓRIA FOTOGRÁFICA: " + nome + " descobre quanto falta para completar a Pilha de Fuga.");
          log(c, nome + " soube: faltam " + Math.max(0, e.encontro.meta - s.fuga) + " dado(s) (meta " + e.encontro.meta + ").", true);
          return { ok: true, faltam: Math.max(0, e.encontro.meta - s.fuga) };
        }
        if (o.chave === "caraLavada") {
          s.fuga -= 1; e.descarte += 1;
          s.usos["h:caraLavada"] = true;
          log(c, "CARA LAVADA: " + nome + " descarta um dado da Pilha de Fuga.");
          pendencia(c, "caraLavada", s.id, nome + " usou Cara Lavada (descartou 1 dado da Fuga). O resto do efeito não está no Corte Rápido (p. 12): resolva com a mesa.");
          return { ok: true };
        }
        if (o.chave === "ole") {
          var uf = e.ultimaFerida;
          var novo = rolarD6(c);
          var total = s.ferida - uf.valor + novo;
          if (total < s.ferida) total = Math.max(total, Math.min(s.ferida, s.sequelas));
          log(c, "OLÉ: " + nome + " rola o Dado Marcador de novo (" + uf.valor + " → " + novo + "); Ferida em " + total + ".");
          s.ferida = total;
          s.usos["h:ole"] = true;
          e.ultimaFerida = null;
          return { ok: true };
        }
        return { ok: false, motivo: "Habilidade sem ação." };
      }
      case "usarPlanejarFuga": {
        if (!emEncontro(e, s) || !s.planejarNoEncontro) return { ok: false, motivo: "Sem fuga planejada para este Encontro." };
        if (s.segurada) return { ok: false, motivo: "Ela está SEGURADA." };
        if (s.pilha < 1) return { ok: false, motivo: "A Pilha Comum está vazia." };
        s.planejarNoEncontro = false;
        s.pilha -= 1; s.fuga += 1;
        log(c, "PLANEJAR FUGA: " + nome + " move 1 dado para a Pilha de Fuga.");
        if (s.fuga >= e.encontro.meta) { s.situacao = "fugiu"; log(c, "🏃 " + nome + " ESCAPOU do Encontro."); verificarFim(c); }
        return { ok: true };
      }
      case "vantagem": return usarVantagem(c, s, o);
      case "apego": {
        var ap = K().APEGOS[o.apego];
        if (!ap) return { ok: false, motivo: "Apego desconhecido." };
        if (s.situacao === "morta") return { ok: false, motivo: "Ela está morta." };
        if (o.apego === "desejo") {
          if (s.desejoRevelado) return { ok: false, motivo: "O Desejo Obscuro já foi revelado: não pode ser usado de novo." };
          s.desejoRevelado = true;
          c.fichas.push({ id: s.id, desejoRevelado: true });
        } else {
          if (s.sessaoUsos["apego:" + o.apego]) return { ok: false, motivo: ap.nome + ": uma vez por sessão." };
          s.sessaoUsos["apego:" + o.apego] = true;
        }
        log(c, nome + " usa o Apego " + ap.nome + (o.descricao ? " (" + texto(o.descricao, 120) + ")" : "") + ".");
        ganharPt(c, s, ap.pt, ap.nome);
        return { ok: true };
      }
      case "recurso": {
        if (o.acao === "remover") { s.recursos = s.recursos.filter(function (r) { return r.id !== o.id; }); return { ok: true }; }
        var nr = texto(o.nome, 80).trim();
        if (!nr) return { ok: false, motivo: "Dê um nome ao Recurso." };
        if (s.recursos.length >= 20) return { ok: false, motivo: "Recursos demais." };
        s.recursos.push({ id: novoId("r"), nome: nr, usos: limitar(inteiro(o.usos, 1), 1, 20) });
        log(c, nome + " tem o Recurso " + nr + ".");
        return { ok: true };
      }
      case "dadoManual": {
        if (s.pilha < 1) return { ok: false, motivo: "A Pilha Comum está vazia." };
        if (s.situacao === "morta") return { ok: false, motivo: "Ela está morta." };
        s.pilha -= 1;
        if (o.acao === "sacrificar") { e.diretora.pilha += 1; log(c, nome + " SACRIFICA 1 dado (para a Pilha da Diretora)."); }
        else { e.descarte += 1; log(c, nome + " DESCARTA 1 dado."); }
        if (e.encontro) verificarFim(c);
        return { ok: true };
      }
      case "preferencia": { if (o.carenciaAutomatica !== undefined) s.carenciaAutomatica = o.carenciaAutomatica !== false; return { ok: true }; }
    }
    return { ok: false, motivo: "Operação desconhecida." };
  }

  function usarVantagem(c, s, o) {
    var e = c.e, nome = nomeDe(e, s.id);
    var chave = String(o.chave || "");
    var m = motivoDaVantagem(e, s, chave); if (m) return { ok: false, motivo: m };
    var v = definicaoDaVantagem(e, chave);
    var custo = v.custo || 0;
    var alvo = o.alvo ? sob(e, o.alvo) : s;
    switch (v.efeito) {
      case "transferirPt": {
        if (!alvo || alvo.id === s.id || alvo.situacao === "morta") return { ok: false, motivo: "Escolha outra Sobrevivente viva." };
        var n = limitar(inteiro(o.valor, 0), 1, s.pt);
        var cabe = K().LIMITES.pt - alvo.pt;
        if (cabe < 1) return { ok: false, motivo: nomeDe(e, alvo.id) + " já tem 10 PT." };
        n = Math.min(n, cabe);
        s.pt -= n; alvo.pt += n;
        custo = 0;
        log(c, nome + " usa " + v.nome + ": transfere " + n + " PT para " + nomeDe(e, alvo.id) + ".");
        break;
      }
      case "recuperarEstilo": {
        if (!alvo || alvo.situacao === "morta") return { ok: false, motivo: "Escolha a Sobrevivente." };
        var est = alvo.incapacitados.indexOf(o.estilo) >= 0 ? o.estilo : alvo.incapacitados[0];
        if (!est) return { ok: false, motivo: nomeDe(e, alvo.id) + " não tem Estilo incapacitado." };
        alvo.incapacitados = alvo.incapacitados.filter(function (x) { return x !== est; });
        log(c, nome + " usa " + v.nome + ": o Estilo " + K().ESTILOS[est].nome + " de " + nomeDe(e, alvo.id) + " volta.");
        break;
      }
      case "recurso": {
        var nr = texto(o.nome, 80).trim();
        if (!nr) return { ok: false, motivo: "Diga qual Recurso ela encontrou." };
        s.recursos.push({ id: novoId("r"), nome: nr, usos: 1 });
        log(c, nome + " usa " + v.nome + ": encontra o Recurso " + nr + " (1 uso).");
        break;
      }
      case "dado": {
        if (!receberDado(c, s, v.nome)) return { ok: false, motivo: "Não deu para receber o dado." };
        break;
      }
      case "sucessoPartir": s.pendentes.surpreender = Math.min(9, s.pendentes.surpreender + 1); log(c, nome + " usa " + v.nome + ": um sucesso garantido no próximo Partir Para Cima."); break;
      case "fugaNoEncontro": s.pendentes.planejarFuga = true; log(c, nome + " usa " + v.nome + ": no começo do próximo Encontro pode mover 1 dado para a Pilha de Fuga."); break;
      case "reduzirFerida": s.pendentes.reduzirFerida = Math.min(12, s.pendentes.reduzirFerida + (v.valor || 1)); log(c, nome + " usa " + v.nome + ": a próxima Ferida será reduzida em " + (v.valor || 1) + "."); break;
      default: log(c, nome + " usa a Vantagem " + v.nome + ". A mesa resolve o efeito."); break;
    }
    if (custo) { s.pt -= custo; log(c, "−" + custo + " PT (" + v.nome + ")."); }
    var rec = recargaDaVantagem(e, chave);
    if (rec !== "semRestricao" && rec !== "pendente") s.usos["v:" + chave] = true;
    if (chave === "choqueDeRealidade") ganharPh(c, 1, "Intento Horrível: " + nome + " usou Choque de Realidade");
    return { ok: true };
  }

  /* =================================================================
     A VISTA DAS JOGADORAS
     ================================================================= */

  function vista(estado, papel) {
    var e = copiar(estado);
    var pode = lista(obj(papel).pode);
    var a = e.assassino;
    e.assassino = { revelado: a.revelado, nome: a.revelado ? a.nome : "", modelo: a.revelado ? a.modelo : "", configurado: !!a.nome };
    e.diretora = { pilha: e.diretora.pilha };
    delete e.pendencias;
    delete e.privado;
    if (e.encontro) {
      var faltam = {};
      pode.forEach(function (id) { if (e.encontro.revelada && e.encontro.revelada[id] && e.sobreviventes[id]) faltam[id] = Math.max(0, estado.encontro.meta - e.sobreviventes[id].fuga); });
      e.encontro.faltam = faltam;
      delete e.encontro.meta;
      delete e.encontro.sustos;
      delete e.encontro.revelada;
      delete e.encontro.cheiro;
    }
    e.lacunas = { fonteDosDados: e.lacunas.fonteDosDados, custoTratarFeridas: e.lacunas.custoTratarFeridas, recargaPlanejarFuga: e.lacunas.recargaPlanejarFuga };
    e.vista = true;
    return e;
  }

  /* Um Thriller de treino (ficha sem campanha): uma Sobrevivente só. */
  function treino(ficha, id) {
    var e = estadoVazio();
    var b = ficha || {};
    var s = sobreviventeVazio(id || "eu", "");
    if (K().ARQUETIPOS[b.arquetipo]) { s.arquetipo = b.arquetipo; s.estilos = K().ARQUETIPOS[b.arquetipo].estilos.slice(); }
    s.desejoRevelado = !!(b.apegos && b.apegos.desejo && b.apegos.desejo.revelado);
    e.sobreviventes[s.id] = s;
    return e;
  }

  global.RAMABrutalMesa = {
    VERSAO: VERSAO,
    estadoVazio: estadoVazio, sobreviventeVazio: sobreviventeVazio, normalizar: normalizar, sincronizarElenco: sincronizarElenco,
    aplicar: aplicar, vista: vista, treino: treino,
    OPS_DA_DIRETORA: OPS_DA_DIRETORA, OPS_DA_SOBREVIVENTE: OPS_DA_SOBREVIVENTE,
    sob: sob, elenco: elenco, naCena: naCena, emEncontro: emEncontro, restantesNoEncontro: restantesNoEncontro, daVez: daVez, vezDoAssassino: vezDoAssassino,
    dificuldade: dificuldade, forcadoComplexo: forcadoComplexo, vantagensDe: vantagensDe, definicaoDaVantagem: definicaoDaVantagem, recargaDaVantagem: recargaDaVantagem,
    marcadorDe: marcadorDe, marcadoresDaAtleta: marcadoresDaAtleta, opcoesReativas: opcoesReativas, contar: contar,
    motivoDaVantagem: motivoDaVantagem, motivoDoTeste: motivoDoTeste, motivoDaAcao: motivoDaAcao, motivoDaHabilidade: motivoDaHabilidade,
    motivoDoEncontro: motivoDoEncontro, motivoDoTurnoDoAssassino: motivoDoTurnoDoAssassino, temAcao: temAcao, temAmeaca: temAmeaca, pedido: pedido,
    copiar: copiar,
  };
})(typeof window !== "undefined" ? window : globalThis);
/* <<< js/brutal/mesa.js */
