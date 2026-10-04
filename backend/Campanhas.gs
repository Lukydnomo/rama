/* =====================================================================
   R.A.M.A. — campanhas
   =====================================================================
   Segundo arquivo do Apps Script. Tudo o que é campanha mora aqui:
   participantes, personagens vinculados, histórico de rolagens,
   documentos, notas do mestre e combates.

   Está separado de Codigo.gs por tamanho — 2.300 linhas num arquivo só
   é ingovernável, e o Apps Script lê vários .gs no mesmo escopo global
   sem custo nenhum. As duas metades se encontram por rotaDe(), que
   monta o mapa de ações na primeira requisição, quando os dois
   arquivos já foram carregados.

   ---------------------------------------------------------------------
   A REGRA QUE VALE PARA TODA FUNÇÃO DESTE ARQUIVO
   ---------------------------------------------------------------------

   A identidade vem da SESSÃO. As relações vêm do BANCO. Nada que o
   navegador afirme sobre si mesmo é levado em conta:

     · não existe `ehMestre` vindo do corpo da requisição;
     · não existe `role` que o cliente escolhe;
     · não existe `visibleUserIds` aceito sem conferir quem manda;
     · `campanhaId` enviado é sempre reconferido contra o papel real.

   O primeiro passo de cada ação é contextoDaCampanha() ou
   exigirMestre(). Não existe caminho que pule isso.
   ===================================================================== */

function rotasDeCampanha() {
  return {
    listar_campanhas:            { publica: false, fn: acaoListarCampanhas },
    ler_campanha:                { publica: false, fn: acaoLerCampanha },
    criar_campanha:              { publica: false, fn: acaoCriarCampanha },
    salvar_campanha:             { publica: false, fn: acaoSalvarCampanha },
    excluir_campanha:            { publica: false, fn: acaoExcluirCampanha },

    listar_usuarios:             { publica: false, fn: acaoListarUsuarios },
    salvar_participantes:        { publica: false, fn: acaoSalvarParticipantes },

    listar_personagens_campanha: { publica: false, fn: acaoListarPersonagensCampanha },
    vincular_personagem:         { publica: false, fn: acaoVincularPersonagem },
    efeito_personagem:           { publica: false, fn: acaoEfeitoPersonagem },
    ler_hexatombe:               { publica: false, fn: acaoLerHexatombe },
    salvar_hexatombe:            { publica: false, fn: acaoSalvarHexatombe },
    lancar_hexatombe:            { publica: false, fn: acaoLancarHexatombe },
    ler_hacking:                 { publica: false, fn: acaoLerHacking },
    salvar_hacking:              { publica: false, fn: acaoSalvarHacking },
    ler_imagem_do_turno:         { publica: false, fn: acaoLerImagemDoTurno },
    ajustar_personagem:          { publica: false, fn: acaoAjustarPersonagem },

    listar_rolagens:             { publica: false, fn: acaoListarRolagens },
    registrar_rolagem:           { publica: false, fn: acaoRegistrarRolagem },
    limpar_rolagens:             { publica: false, fn: acaoLimparRolagens },

    listar_documentos:           { publica: false, fn: acaoListarDocumentos },
    salvar_documento:            { publica: false, fn: acaoSalvarDocumento },
    excluir_documento:           { publica: false, fn: acaoExcluirDocumento },
    ler_imagem_documento:        { publica: false, fn: acaoLerImagemDocumento },
    salvar_imagem_documento:     { publica: false, fn: acaoSalvarImagemDocumento },

    listar_notas_mestre:         { publica: false, fn: acaoListarNotasMestre },
    salvar_nota_mestre:          { publica: false, fn: acaoSalvarNotaMestre },
    excluir_nota_mestre:         { publica: false, fn: acaoExcluirNotaMestre },

    listar_combates:             { publica: false, fn: acaoListarCombates },
    salvar_combate:              { publica: false, fn: acaoSalvarCombate },
    atualizar_combate:           { publica: false, fn: acaoAtualizarCombate },
    excluir_combate:             { publica: false, fn: acaoExcluirCombate },

    sincronizar_campanha:        { publica: false, fn: acaoSincronizarCampanha },
    ler_capa_campanha:           { publica: false, fn: acaoLerCapaCampanha },
    ler_capas:                   { publica: false, fn: acaoLerCapas },
    salvar_capa_campanha:        { publica: false, fn: acaoSalvarCapaCampanha },
    atualizar_resumo_personagem: { publica: false, fn: acaoAtualizarResumoPersonagem },
  };
}

/* Quantas rolagens uma página traz. O histórico cresce sem teto, e
   baixar a tabela inteira para desenhar as últimas vinte linhas seria
   pagar caro por nada. */
var PAGINA_ROLAGENS = 50;
var MAX_PAGINA_ROLAGENS = 200;

var VIS_ROLAGEM_PUBLICA = 'publica';
var VIS_ROLAGEM_OCULTA = 'oculta';

/* Quanto tempo o atalho de idempotência de uma rolagem vale. Meia hora
   cobre com folga qualquer retentativa de rede; passado isso, a
   conferência volta a ser feita na planilha, onde ela é definitiva. */
var SEGUNDOS_IDEMPOTENCIA = 1800;

/* =====================================================================
   MARCAS DA MESA
   ---------------------------------------------------------------------
   Quem está com a campanha aberta precisa ver o que outra pessoa acabou
   de mudar — a vida que o mestre tirou, a iniciativa, o turno. Não há
   conexão aberta com o Apps Script: o navegador PERGUNTA, de tempos em
   tempos. O que decide se essa pergunta é barata é o que ela lê.

   Ler as abas a cada pergunta, com vinte pessoas perguntando a cada
   poucos segundos, seria encher a fila de leituras de planilha para, na
   imensa maioria das vezes, descobrir que nada mudou. Então a pergunta
   não lê planilha nenhuma: ela lê MARCAS.

   Uma marca é um valor curto no CacheService, uma por parte da campanha
   (campanha, membros, personagens, combates, documentos, rolagens). Toda
   gravação que muda uma parte troca a marca dela. O navegador guarda as
   marcas que já viu e, quando uma muda, busca de novo SÓ aquela parte —
   pelo caminho normal, com todas as conferências de permissão.

   A marca não carrega dado nenhum: é um carimbo de tempo mais um trecho
   aleatório. Saber que "os combates mudaram" não revela o combate.

   QUANDO O CACHE PERDE A MARCA
   ---------------------------------------------------------------------
   O CacheService descarta entradas quando quer, e nenhuma dura mais que
   seis horas. Marca ausente vira uma marca de reserva que muda a cada
   minuto: quem estava olhando busca a parte de novo uma vez por minuto
   até a próxima gravação criar uma marca de verdade. O pior caso é um
   minuto de atraso, nunca uma mudança perdida para sempre — e a marca
   presente é regravada com o MESMO valor antes de vencer, para mesa
   parada não cair nesse passo de reserva à toa.
   ===================================================================== */

var PARTES_DA_MESA = ['campanha', 'membros', 'personagens', 'combates', 'documentos', 'rolagens', 'hexatombe', 'hacking'];
var SEGUNDOS_MARCA = 21600;
var MS_RENOVAR_MARCAS = 4 * 60 * 60 * 1000;
var SEGUNDOS_PAPEL_EM_CACHE = 300;

function chaveDaMarca(campanhaId, parte) {
  return 'rama.mesa.' + String(campanhaId) + '.' + parte;
}

function chaveDaRenovacao(campanhaId) {
  return 'rama.mesa.' + String(campanhaId) + '.renovada';
}

/* Troca a marca das partes pedidas (todas, sem lista). Chamada DEPOIS da
   gravação, dentro da mesma trava: quem perguntar em seguida já encontra
   a marca nova e o dado novo. */
function marcarMesa(campanhaId, partes) {
  if (!campanhaId) return;
  var lista = (partes && partes.length) ? partes : PARTES_DA_MESA;
  var valor = 't' + Date.now() + '-' + String(novoId()).replace(/-/g, '').slice(0, 8);
  var mapa = {};
  lista.forEach(function (p) {
    if (PARTES_DA_MESA.indexOf(p) >= 0) mapa[chaveDaMarca(campanhaId, p)] = valor;
  });
  mapa[chaveDaRenovacao(campanhaId)] = String(Date.now());
  try {
    cache().putAll(mapa, SEGUNDOS_MARCA);
  } catch (erro) {
    /* Sem cache a mesa continua funcionando: as marcas caem no passo de
       reserva e cada parte é buscada de novo uma vez por minuto. */
  }
}

function marcasDaMesa(campanhaId) {
  var chaves = PARTES_DA_MESA.map(function (p) { return chaveDaMarca(campanhaId, p); });
  var renovacao = chaveDaRenovacao(campanhaId);
  var lidas = {};
  try { lidas = cache().getAll(chaves.concat([renovacao])) || {}; } catch (erro) { lidas = {}; }

  var agora = Date.now();
  var reserva = 'r' + Math.floor(agora / 60000);
  var saida = {};
  var presentes = {};

  PARTES_DA_MESA.forEach(function (p, i) {
    var v = lidas[chaves[i]];
    if (v) { saida[p] = String(v); presentes[chaves[i]] = String(v); }
    else saida[p] = reserva;
  });

  /* Renovação: regrava as marcas presentes com o MESMO valor antes de
     elas vencerem. O valor não muda, então ninguém busca nada de novo. */
  var renovadaEm = Number(lidas[renovacao]) || 0;
  if (Object.keys(presentes).length && agora - renovadaEm > MS_RENOVAR_MARCAS) {
    presentes[renovacao] = String(agora);
    try { cache().putAll(presentes, SEGUNDOS_MARCA); } catch (erro) { /* segue sem renovar */ }
  }

  return saida;
}

/* O papel de quem pergunta, para a pergunta das marcas.

   Ele é guardado por alguns minutos numa chave que inclui as marcas de
   `membros` e de `campanha`: quando alguém entra, sai ou a visibilidade
   muda, a marca muda, a chave muda e o papel é conferido de novo na
   planilha. O papel em cache só decide se a pessoa recebe MARCAS — nunca
   dado: toda busca de conteúdo passa pela conferência completa. */
function papelParaMarcas(campanhaId, usuario, marcas) {
  var chave = 'rama.papel.' + epoca() + '.' + String(campanhaId) + '.' + String(usuario.id) +
    '.' + marcas.membros + '.' + marcas.campanha;
  var guardado = cacheLer(chave);
  if (guardado) return guardado === '-' ? null : guardado;

  var campanha = campanhaLeve(campanhaId);
  var papel = campanha ? papelNaCampanha(campanha, usuario) : null;
  cacheGravar(chave, papel || '-', SEGUNDOS_PAPEL_EM_CACHE);
  return papel;
}

function acaoSincronizarCampanha(corpo, usuario) {
  var id = String(corpo.campanhaId || '');
  if (!id) return { ok: false, erro: 'dados_invalidos' };

  var marcas = marcasDaMesa(id);
  var papel = papelParaMarcas(id, usuario, marcas);
  if (!papel) return { ok: false, erro: 'nao_encontrado' };

  /* O espectador só olha a campanha por fora: marcas de mesa não
     servem para nada a ele. */
  if (papel === PAPEL_ESPECTADOR) {
    marcas = { campanha: marcas.campanha, membros: marcas.membros };
  }

  return { ok: true, dados: { papel: papel, mestre: papel === PAPEL_MESTRE, marcas: marcas } };
}

/* =====================================================================
   CAMPANHAS
   ===================================================================== */

function acaoListarCampanhas(corpo, usuario) {
  /* A descrição mora no dadosJson, e a lista mostra a descrição — mas
     só das campanhas que esta conta alcança. Numa planilha com trinta
     campanhas em que ela participa de três, o conteúdo lido é o de
     três. */
  var alcance = campanhasDoUsuarioCompletas(usuario);

  /* A VERSÃO da capa de cada uma, sem a imagem: a lista mostra a capa
     no lugar das iniciais, e o navegador pede as imagens em lote só das
     que ainda não tem (v2.16). As quatro primeiras colunas da aba de
     capas são curtas — a imagem é a quinta e não é tocada aqui. */
  var versaoDaCapa = {};
  lerLeves(ABAS.CAMPANHA_CAPAS).forEach(function (capa) {
    var id = String(capa.campanhaId);
    if (!alcance[id]) return;
    var quando = String(capa.atualizadoEm || '');
    if (quando) versaoDaCapa[id] = quando;
  });

  var lista = Object.keys(alcance).map(function (id) {
    var c = alcance[id].campanha;
    var papel = alcance[id].papel;
    var dados = alcance[id].dados || {};

    return {
      id: c.id,
      nome: c.nome,
      descricao: dados.descricao || '',
      visibilidade: visibilidadeDe(c.visibilidade),
      papel: papel,
      mestre: papel === PAPEL_MESTRE,
      criadoEm: c.criadoEm,
      atualizadoEm: c.atualizadoEm,
      rev: Number(c.rev) || 0,
      capaVersao: versaoDaCapa[String(c.id)] || '',
    };
  });

  /* As minhas primeiro, depois as que jogo, depois as que só observo:
     a lista responde "onde eu tenho algo a fazer" antes de "o que
     existe". */
  var peso = {};
  peso[PAPEL_MESTRE] = 0;
  peso[PAPEL_JOGADOR] = 1;
  peso[PAPEL_ESPECTADOR] = 2;

  lista.sort(function (a, b) {
    return (peso[a.papel] - peso[b.papel]) ||
           String(a.nome).localeCompare(String(b.nome), 'pt-BR');
  });

  return { ok: true, dados: lista };
}

function acaoLerCampanha(corpo, usuario) {
  var ctx = contextoDaCampanha(corpo.campanhaId, usuario);
  if (!ctx.ok) return ctx;

  var c = ctx.campanha;
  var dados = lerJson(c.dadosJson, {});

  var resposta = {
    id: c.id,
    nome: c.nome,
    descricao: dados.descricao || '',
    visibilidade: visibilidadeDe(c.visibilidade),
    papel: ctx.papel,
    mestre: ctx.mestre,
    criadoEm: c.criadoEm,
    atualizadoEm: c.atualizadoEm,
  };

  /* Configuração que muda o comportamento do sistema é sempre
     devolvida — o jogador precisa saber, por exemplo, que as rolagens
     do mestre estão ocultas, senão o histórico parece quebrado. */
  resposta.rolagensMestreOcultas = !!dados.rolagensMestreOcultas;
  resposta.ocultarStatusJogadores = !!dados.ocultarStatusJogadores;
  /* O modo Hexatombe (v2.30): só se está ligado — a aba aparece para o
     jogador apenas assim. O conteúdo vem por ler_hexatombe. */
  resposta.hexatombe = hexatombeAtivo(c.id);
  /* A regra opcional de Hacking (v2.38, AS4): o mesmo esquema. */
  resposta.hacking = hackingAtivo(c.id);

  /* Se há capa, de que tamanho e de quando — só as colunas leves. A
     imagem vem por ler_capa_campanha, que confere o acesso de novo. */
  var capa = capaDaCampanha(c.id);
  resposta.capa = capa.existe
    ? { existe: true, atualizadoEm: capa.atualizadoEm, largura: capa.largura, altura: capa.altura }
    : { existe: false };

  /* O ponto de partida das marcas: o navegador compara as próximas
     perguntas com estas. */
  resposta.marcas = marcasDaMesa(c.id);

  /* Quem participa é informação da mesa, não segredo: o jogador precisa
     saber com quem joga. O que não sai daqui é qualquer dado interno
     das contas — só o mínimo para identificar. */
  if (ctx.papel !== PAPEL_ESPECTADOR) {
    resposta.membros = membrosParaCliente(c, membrosDaCampanha(c.id));
  }

  return { ok: true, rev: Number(c.rev) || 0, dados: resposta };
}

/* O diretório mínimo: o suficiente para reconhecer uma pessoa numa
   lista, e nada além. Nunca hashSenha, salt, token, sessão ou qualquer
   campo interno — nem por engano, porque a montagem é explícita campo a
   campo e não um "espalha o registro inteiro". */
function usuarioParaCliente(u, versaoPorId) {
  return {
    id: u.id,
    usuario: u.usuario,
    nome: u.nome || u.usuario,
    /* O avatar não vem aqui (v2.16): vem a versão dele, e o navegador
       pede as imagens em lote — ver "Imagens sob demanda" em
       Codigo.gs. Uma mesa de oito pessoas deixou de carregar oito
       avatares em toda abertura de campanha. */
    avatarVersao: (versaoPorId && versaoPorId[u.id]) || '',
  };
}

function membrosParaCliente(campanha, membros) {
  var usuarios = contasDoSistema();

  var envolvidos = [String(campanha.ownerId)];
  membros.forEach(function (m) { envolvidos.push(String(m.userId)); });

  var perfis = versoesDeAvatar(envolvidos);

  var saida = [];
  var vistos = {};

  /* O criador entra sempre, mesmo sem linha em MEMBROS. */
  if (usuarios[campanha.ownerId]) {
    saida.push(Object.assign(usuarioParaCliente(
      Object.assign({ id: campanha.ownerId }, usuarios[campanha.ownerId]), perfis), {
      papel: PAPEL_MESTRE,
      criador: true,
    }));
    vistos[campanha.ownerId] = true;
  }

  membros.forEach(function (m) {
    if (vistos[m.userId] || !usuarios[m.userId]) return;
    vistos[m.userId] = true;
    saida.push(Object.assign(usuarioParaCliente(
      Object.assign({ id: m.userId }, usuarios[m.userId]), perfis), {
      papel: String(m.papel) === PAPEL_MESTRE ? PAPEL_MESTRE : PAPEL_JOGADOR,
      criador: false,
    }));
  });

  return saida;
}

/* Quem pode aparecer numa lista de "quem vê" — só os ids, sem avatar
   nem nome. Montar a lista completa de participantes para depois usar
   apenas os identificadores obrigaria a ler os avatares de todo mundo
   para não mostrar nenhum deles. */
function idsDaMesa(campanha) {
  var conjunto = {};
  conjunto[String(campanha.ownerId)] = true;
  membrosDaCampanha(campanha.id).forEach(function (m) { conjunto[String(m.userId)] = true; });
  return conjunto;
}

function acaoListarUsuarios(corpo, usuario) {
  var contas = contasDoSistema();
  var ativos = Object.keys(contas)
    .filter(function (id) { return contas[id].ativo; })
    .map(function (id) { return Object.assign({ id: id }, contas[id]); });

  var perfis = versoesDeAvatar(ativos.map(function (u) { return u.id; }));

  var lista = ativos
    .map(function (u) { return usuarioParaCliente(u, perfis); })
    .sort(function (a, b) { return String(a.nome).localeCompare(String(b.nome), 'pt-BR'); });

  return { ok: true, dados: lista };
}

function acaoCriarCampanha(corpo, usuario) {
  var dados = corpo.dados || {};
  var nome = String(dados.nome || '').trim().slice(0, 120);
  if (!nome) return { ok: false, erro: 'dados_invalidos' };

  var agora = new Date().toISOString();
  var id = novoId();

  return comTrava(function () {
    inserir(ABAS.CAMPANHAS, {
      id: id,
      ownerId: usuario.id,
      nome: nome,
      /* Nasce privada. Um padrão que erra para o lado de esconder: quem
         quer público diz que quer. */
      visibilidade: visibilidadeDe(dados.visibilidade),
      criadoEm: agora,
      atualizadoEm: agora,
      rev: 1,
      dadosJson: JSON.stringify({
        descricao: String(dados.descricao || '').slice(0, 4000),
        rolagensMestreOcultas: false,
        ocultarStatusJogadores: false,
      }),
    });

    return { ok: true, rev: 1, dados: { id: id } };
  });
}

function acaoSalvarCampanha(corpo, usuario) {
  var dados = corpo.dados || {};

  return comTrava(function () {
    var ctx = exigirMestre(corpo.campanhaId, usuario);
    if (!ctx.ok) return ctx;

    var registro = ctx.campanha;
    var revAtual = Number(registro.rev) || 0;
    var revPedida = Number(corpo.rev);

    if (Number.isFinite(revPedida) && revPedida !== revAtual) {
      return { ok: false, erro: 'conflito', rev: revAtual, dados: lerJson(registro.dadosJson, {}) };
    }

    var guardado = lerJson(registro.dadosJson, {});
    var ocultarAntes = !!guardado.ocultarStatusJogadores;
    var visibilidadeAntes = visibilidadeDe(registro.visibilidade);

    if (dados.descricao !== undefined) guardado.descricao = String(dados.descricao).slice(0, 4000);
    if (dados.rolagensMestreOcultas !== undefined) {
      guardado.rolagensMestreOcultas = !!dados.rolagensMestreOcultas;
    }
    /* "Esconder status dos jogadores". Só chega aqui quem passou por
       exigirMestre — um jogador que mande o campo recebe sem_permissao
       antes de qualquer leitura. */
    if (dados.ocultarStatusJogadores !== undefined) {
      guardado.ocultarStatusJogadores = !!dados.ocultarStatusJogadores;
    }

    if (dados.nome !== undefined) {
      var nome = String(dados.nome).trim().slice(0, 120);
      if (nome) registro.nome = nome;
    }
    if (dados.visibilidade !== undefined) {
      registro.visibilidade = visibilidadeDe(dados.visibilidade);
    }

    registro.atualizadoEm = new Date().toISOString();
    registro.rev = revAtual + 1;
    registro.dadosJson = JSON.stringify(guardado);

    atualizarLinha(ABAS.CAMPANHAS, registro._linha, registro);

    /* Mudar a ocultação muda o que os cartões e os combates podem
       mostrar: as duas partes precisam ser buscadas de novo, e a busca
       nova já vem sem o que deixou de ser permitido. */
    var partes = ['campanha'];
    if (ocultarAntes !== !!guardado.ocultarStatusJogadores) partes.push('personagens', 'combates');
    if (visibilidadeAntes !== visibilidadeDe(registro.visibilidade)) partes.push('membros');
    marcarMesa(registro.id, partes);

    return {
      ok: true,
      rev: registro.rev,
      dados: { ocultarStatusJogadores: !!guardado.ocultarStatusJogadores },
    };
  });
}

/* Excluir é do CRIADOR, não de qualquer mestre. Um mestre promovido
   administra a campanha; desfazê-la continua sendo de quem a fez. */
function acaoExcluirCampanha(corpo, usuario) {
  return comTrava(function () {
    var registro = meuRegistro(ABAS.CAMPANHAS, corpo.campanhaId, usuario);
    if (!registro) return { ok: false, erro: 'nao_encontrado' };

    var id = String(corpo.campanhaId);

    apagarLinha(ABAS.CAMPANHAS, registro._linha);

    /* Os blocos dos combates grandes (v2.28) moram em outra aba, sem
       campanhaId: saem pelos ids dos combates, antes de as linhas deles
       sumirem. */
    apagarBlocosDeCombates(daCampanhaLeves(ABAS.CAMPANHA_COMBATES, id).map(function (c) { return c.id; }));

    /* Tudo o que pendurava nesta campanha sai junto. Deixar para trás
       encheria a planilha de linhas que ninguém mais alcança. Fichas
       NÃO entram nisso: elas são dos jogadores e só perdem o vínculo. */
    [ABAS.CAMPANHA_MEMBROS, ABAS.CAMPANHA_ROLAGENS, ABAS.CAMPANHA_DOCUMENTOS,
     ABAS.CAMPANHA_DOCUMENTOS_IMAGENS, ABAS.CAMPANHA_NOTAS, ABAS.CAMPANHA_COMBATES,
     ABAS.CAMPANHA_CAPAS
    ].forEach(function (tabela) {
      /* Descobrir o que apagar não exige ler o que vai ser apagado: as
         colunas leves trazem o campanhaId, que é o filtro. */
      apagarLinhas(tabela, daCampanhaLeves(tabela, id).map(function (r) { return r._linha; }));
    });

    lerLeves(ABAS.PERSONAGENS).forEach(function (p) {
      if (String(p.campanhaId) === id) {
        p.campanhaId = '';
        atualizarCampos(ABAS.PERSONAGENS, p, ['campanhaId']);
      }
    });

    /* Quem estava com a campanha aberta descobre na próxima pergunta:
       a busca de qualquer parte responde nao_encontrado. */
    marcarMesa(id);

    return { ok: true };
  });
}

/* =====================================================================
   PARTICIPANTES
   ---------------------------------------------------------------------
   A lista chega inteira e substitui a anterior. Ids de usuário, sempre:
   nome e username mudam, id não.
   ===================================================================== */

function acaoSalvarParticipantes(corpo, usuario) {
  return comTrava(function () {
    var ctx = exigirMestre(corpo.campanhaId, usuario);
    if (!ctx.ok) return ctx;

    var pedidos = Array.isArray(corpo.membros) ? corpo.membros : [];

    /* Só entra quem existe e está ativo. Um id inventado no console não
       vira membro — vira nada. */
    var validos = {};
    lerTudo(ABAS.USUARIOS).forEach(function (u) {
      if (String(u.ativo) === 'true') validos[u.id] = true;
    });

    var agora = new Date().toISOString();
    var vistos = {};
    var novos = [];

    pedidos.forEach(function (m) {
      var id = m && m.userId ? String(m.userId) : '';
      if (!id || !validos[id] || vistos[id]) return;

      /* O criador não entra na lista: o papel dele não é editável e
         tirá-lo da própria campanha não pode ser possível. */
      if (id === String(ctx.campanha.ownerId)) return;

      vistos[id] = true;
      novos.push({
        id: novoId(),
        campanhaId: ctx.campanha.id,
        userId: id,
        papel: String(m.papel) === PAPEL_MESTRE ? PAPEL_MESTRE : PAPEL_JOGADOR,
        criadoEm: agora,
      });
    });

    var antigos = membrosDaCampanha(ctx.campanha.id);
    for (var i = antigos.length - 1; i >= 0; i--) {
      apagarLinha(ABAS.CAMPANHA_MEMBROS, antigos[i]._linha);
    }
    novos.forEach(function (m) { inserir(ABAS.CAMPANHA_MEMBROS, m); });

    /* Quem saiu da campanha leva os personagens junto: manter a ficha
       de alguém que não participa mais dentro da mesa daria ao mestre
       acesso a um personagem de quem já foi embora. */
    var aindaDentro = {};
    aindaDentro[String(ctx.campanha.ownerId)] = true;
    novos.forEach(function (m) { aindaDentro[String(m.userId)] = true; });

    /* Varredura leve e gravação cirúrgica: tirar um personagem da
       campanha mexe numa célula. Reescrever a linha inteira obrigaria a
       ler o fichaJson de cada um só para devolvê-lo igual. */
    lerLeves(ABAS.PERSONAGENS).forEach(function (p) {
      if (String(p.campanhaId) !== String(ctx.campanha.id)) return;
      if (aindaDentro[String(p.ownerId)]) return;
      p.campanhaId = '';
      atualizarCampos(ABAS.PERSONAGENS, p, ['campanhaId']);
    });

    /* Entrar ou sair muda o papel de alguém — e com ele o que cada parte
       pode mostrar. Todas as partes são buscadas de novo. */
    marcarMesa(ctx.campanha.id);

    return { ok: true, dados: { membros: membrosParaCliente(ctx.campanha, membrosDaCampanha(ctx.campanha.id)) } };
  });
}

/* =====================================================================
   PERSONAGENS DA CAMPANHA
   ===================================================================== */

/* QUEM VÊ O QUÊ NOS CARTÕES
   ---------------------------------------------------------------------
     mestre          tudo de todos: os dados de cálculo, os recursos, o
                     controle de ajuste e o acesso à ficha
     dono            o mesmo, do PRÓPRIO personagem (de todos eles, se
                     tiver mais de um na mesa)
     outro jogador   identificação; recursos atuais e máximos — a menos
                     que o mestre tenha ligado "Esconder status dos
                     jogadores"; nada de ficha, escolhas ou inventário
     espectador      nada (a mesa não é dele)

   Ver o resumo de um personagem não abre a ficha: `podeAbrirFicha` é só
   rótulo para a tela, e ler_personagem continua recusando quem não é
   dono nem mestre. Com a ocultação ligada, os recursos dos outros NÃO
   entram na resposta — não há barra, número ou percentual para esconder
   com CSS, porque eles não chegam. */
function acaoListarPersonagensCampanha(corpo, usuario) {
  var ctx = contextoDaCampanha(corpo.campanhaId, usuario);
  if (!ctx.ok) return ctx;

  /* Espectador de campanha pública não recebe a mesa: ver que uma
     campanha existe não é ver quem joga nela com que ficha. */
  if (ctx.papel === PAPEL_ESPECTADOR) return { ok: true, dados: [] };

  var configDaMesa = lerJson(ctx.campanha.dadosJson, {});
  var ocultarStatus = !!configDaMesa.ocultarStatusJogadores;

  var donos = nomesDasContas();

  /* Três etapas, e a ordem é o ponto.

     Primeiro descobre QUAIS personagens são desta campanha, varrendo só
     as colunas leves. Depois lê a PROJEÇÃO de cada um — uma coluna
     curta, sem ficha, sem bloco, sem anotação (v2.16). Só as fichas
     cuja projeção não vale é que são remontadas.

     Antes da v2.15 esta tela lia a ficha completa e a foto de TODOS os
     personagens do sistema para desenhar os sete da mesa; até a v2.15
     ela remontava as sete fichas inteiras. Agora, com as projeções em
     dia, ela não abre ficha nenhuma — e a foto vira uma versão curta,
     pedida em lote só quando o navegador ainda não a tem. */
  var daMesa = lerLeves(ABAS.PERSONAGENS).filter(function (p) {
    return String(p.campanhaId) === String(ctx.campanha.id);
  });

  var painel = projecoesDosPersonagens(daMesa);
  var fotos = versoesDeFoto(daMesa);

  var lista = daMesa
    .map(function (p) {
      var souDono = meu(p, usuario);
      var proj = painel.porId[p.id];

      /* Uma ficha que não se montou aparece como tal: identificação e o
         aviso, sem números inventados e sem controles de ajuste — que
         gravariam por cima de uma ficha que ninguém conseguiu ler. */
      if (!proj) {
        return {
          id: p.id,
          nome: p.nome,
          tipoFicha: 'universal',
          classe: p.classe || '',
          origem: p.origem || '',
          ownerId: p.ownerId,
          dono: donos[p.ownerId] || '',
          souDono: souDono,
          detalhado: false,
          podeEditarRecursos: false,
          podeAbrirFicha: ctx.mestre || souDono,
          recursosVisiveis: false,
          fichaIlegivel: true,
          fotoVersao: fotos[p.id] || '',
          rev: Number(p.rev) || 0,
        };
      }

      /* O mestre e o dono veem o personagem inteiro no painel; os outros
         jogadores da mesa, a identificação e — se o mestre permitir — os
         recursos. */
      var detalhado = ctx.mestre || souDono;
      var recursosVisiveis = detalhado || !ocultarStatus;
      var ehOrdem = projecaoDeOrdem(proj);

      var saida = {
        id: p.id,
        nome: p.nome,
        tipoFicha: ehOrdem ? 'ordem' : 'universal',
        classe: p.classe || '',
        origem: p.origem || '',
        ownerId: p.ownerId,
        dono: donos[p.ownerId] || '',
        souDono: souDono,
        detalhado: detalhado,
        /* Rótulos para a tela. A decisão de verdade é de
           ajustar_personagem e ler_personagem, que conferem de novo. */
        podeEditarRecursos: detalhado,
        podeAbrirFicha: detalhado,
        recursosVisiveis: recursosVisiveis,
        /* A imagem não vem na listagem (v2.16): vem a VERSÃO dela, e o
           navegador pede em lote só as que ainda não tem — ver
           ler_fotos. */
        fotoVersao: fotos[p.id] || '',
        rev: Number(p.rev) || 0,
      };

      if (ehOrdem) {
        /* Uma ficha de Ordem NÃO usa `status` e `atributos` universais —
           ela os tem só como padrão de nascimento. Os números dela são
           calculados pelas regras no navegador (js/ordem/regras.js), o
           mesmo cálculo da ficha: o painel recebe os dados de entrada
           desse cálculo, não um resultado paralelo. É exatamente isso
           que a projeção guarda. */
        if (detalhado) {
          saida.ordem = proj.ordem;
          saida.inventario = { itens: proj.itens || [] };
          /* O resumo guardado, para quem calcula conferir se ele ainda
             bate com a ficha — ver atualizar_resumo_personagem. */
          saida.resumoRecursos = normalizarResumoRecursos(proj.resumoRecursos);
        } else {
          saida.ordem = ordemPublicaParaPainel(proj.ordem);
          if (recursosVisiveis) {
            var resumidos = recursosResumidos(proj);
            saida.recursos = resumidos || [];
            if (!resumidos) saida.recursosPendentes = true;
            /* Morrendo e enlouquecendo seguem a MESMA regra dos recursos:
               escondidos com "Esconder status dos jogadores". */
            saida.condicoes = resumoPublicoDeCondicoes(proj.ordem);
          }
        }
      } else {
        /* O painel precisa de status e atributos para os controles
           rápidos, mas não da ficha inteira: perícias, inventário e
           anotações ficam para quando alguém abrir a ficha de verdade. */
        saida.atributos = proj.atributos || [];
        if (recursosVisiveis) saida.status = proj.status || [];
      }
      return saida;
    })
    .sort(function (a, b) { return String(a.nome).localeCompare(String(b.nome), 'pt-BR'); });

  return { ok: true, dados: lista, config: { ocultarStatusJogadores: ocultarStatus } };
}

/* ---------------------------------------------------------------------
   As projeções de um punhado de personagens.

   Devolve { porId, remontadas }: a projeção de cada um, venha ela da
   coluna (o caminho normal) ou da ficha remontada (ficha ainda no
   formato antigo, projeção de outra versão do formato, coluna apagada,
   gravação feita por um backend que não conhece a coluna). Quem não
   estiver em `porId` é quem não se montou — e o cartão dele diz isso.

   Nenhuma listagem GRAVA para consertar projeção: a próxima gravação da
   ficha resolve sozinha, e reconstruirResumos() resolve em lote. Uma
   tela de leitura que grava é uma tela de leitura que disputa a trava.
   --------------------------------------------------------------------- */
function projecoesDosPersonagens(registros) {
  var saida = { porId: {}, remontadas: 0 };
  if (!registros || !registros.length) return saida;

  var textos = lerCelulas(ABAS.PERSONAGENS, registros, 'resumo');
  var faltando = [];
  var duvidosos = [];

  registros.forEach(function (p) {
    var proj = projecaoDoRegistro(p, textos[p._linha]);
    if (proj) { saida.porId[p.id] = proj; anotar('resumosUsados'); return; }

    /* Tem projeção, mas de outra revisão. Pode ser só uma revisão que
       subiu sem o conteúdo mudar — a geração do manifesto diz. */
    var talvez = projecaoGuardada(textos[p._linha]);
    if (talvez && talvez.geracao) { duvidosos.push({ registro: p, projecao: talvez }); return; }

    faltando.push(p);
  });

  if (duvidosos.length) {
    var manifestos = lerCelulas(ABAS.PERSONAGENS,
      duvidosos.map(function (d) { return d.registro; }), 'armazenamento');

    duvidosos.forEach(function (d) {
      var m = manifestoDe(manifestos[d.registro._linha]);
      if (m && !m.invalido && String(m.geracao) === String(d.projecao.geracao)) {
        saida.porId[d.registro.id] = d.projecao;
        anotar('resumosUsados');
        return;
      }
      faltando.push(d.registro);
    });
  }

  if (!faltando.length) return saida;

  var fichas = lerFichasDosPersonagens(faltando);
  faltando.forEach(function (p) {
    var lida = fichas[p.id];
    if (!lida || !lida.ok) return;
    try {
      saida.porId[p.id] = projecaoDaFicha(lida.ficha);
      saida.remontadas++;
      anotar('resumosRefeitos');
    } catch (erro) {
      console.warn('R.A.M.A.: projeção de ' + p.id + ' não montada: ' + erro);
    }
  });

  return saida;
}

/* A VERSÃO da foto de cada personagem — a data da última gravação —,
   sem a imagem. É o que deixa o navegador reaproveitar o que já baixou
   e pedir só o que mudou. A coluna da data é curta; a da imagem não é
   tocada aqui. */
function versoesDeFoto(registros) {
  var querido = {};
  (registros || []).forEach(function (p) { querido[String(p.id)] = true; });

  var linhas = lerLeves(ABAS.PERSONAGENS_FOTOS).filter(function (f) {
    return querido[String(f.personagemId)];
  });
  if (!linhas.length) return {};

  var datas = lerCelulas(ABAS.PERSONAGENS_FOTOS, linhas, 'atualizadoEm');

  var saida = {};
  linhas.forEach(function (f) {
    var v = String(datas[f._linha] || '');
    if (v) saida[String(f.personagemId)] = v;
  });
  return saida;
}

function ehFichaDeOrdem(ficha) {
  return !!ficha && String(ficha.tipoFicha || '') === 'ordem' && !!ficha.ordem && typeof ficha.ordem === 'object';
}

/* A projeção também responde por "é de Ordem", porque ela carrega o
   tipo decidido na hora da gravação. */
function projecaoDeOrdem(p) {
  return !!p && String(p.tipo || '') === 'ordem' && !!p.ordem && typeof p.ordem === 'object';
}

/* =====================================================================
   A PROJEÇÃO DO PERSONAGEM
   ---------------------------------------------------------------------
   O painel da mesa desenha oito cartões. Até a v2.15 ele remontava as
   oito fichas inteiras para isso — anotações, perícias, rituais,
   inventário completo — e jogava fora 95% do que leu. Numa mesa de oito
   fichas com anotações de verdade, meio megabyte atravessava o serviço
   do Sheets para desenhar oito caixinhas.

   A projeção é o que o cartão usa, e só isso, gravado na coluna
   `resumo` do personagem na MESMA gravação que publica a ficha. Ler a
   mesa passa a ser: varrer as colunas leves, ler uma coluna curta, e
   pronto — nenhuma ficha remontada, nenhum bloco lido.

   O QUE ELA CONTÉM, E POR QUE NÃO CONTÉM CONTA NENHUMA
   ---------------------------------------------------------------------
   Para uma ficha de Ordem, o máximo de PV/PE/Sanidade NÃO é calculado
   aqui: ele sai do motor de regras, que mora no navegador. A projeção
   guarda as mesmas ENTRADAS que a v2.15 mandava para o painel —
   `ordemParaPainel`, `itensParaPainel`, `resumoRecursos` — montadas
   pelas MESMAS funções que o painel já usava. Não existe uma segunda
   fórmula no servidor: existe o mesmo recorte, gravado em vez de
   recalculado.

     tipo            'ordem' ou 'universal'
     ordem           o bloco de Ordem do painel (sem organização, sem
                     textos longos de personalização)
     itens           id, tipo, nome, defesa e bloco de Ordem de cada item
     resumoRecursos  { pv, pe, san } validado, calculado por quem podia
                     ver a ficha inteira
     atributos       ficha universal: id, nome, sigla, valor, dado
     status          ficha universal: id, nome, atual, maximo

   QUANDO ELA VALE
   ---------------------------------------------------------------------
   A projeção carrega a REVISÃO e a GERAÇÃO da ficha de onde saiu. Ela
   vale enquanto a revisão for a mesma da linha — e a revisão está entre
   as colunas leves, então conferir isso não custa leitura nenhuma. Se
   não bater (ficha ainda no formato antigo, coluna vazia, projeção de
   uma versão anterior do formato, gravação feita por um backend que não
   conhece esta coluna), o painel remonta AQUELA ficha e monta o cartão
   como sempre fez. Nenhuma listagem grava nada para consertar isso: a
   próxima gravação da ficha resolve sozinha, e reconstruirResumos()
   resolve em lote quando alguém quiser.

   Ela é DERIVADA e RECUPERÁVEL. A ficha continua sendo a fonte; perder
   toda a coluna custa desempenho, nunca dado.
   ===================================================================== */

var VERSAO_RESUMO = 1;

/* Uma projeção maior que isto não é gravada: fica o marcador `grande`,
   e o painel remonta a ficha. Nenhuma projeção real chega perto —
   `ordemParaPainel` já deixa os textos longos de fora —, e a célula não
   pode ser o teto de nada (v2.15). */
var LIMITE_RESUMO_PROJECAO = 40000;

function projecaoDaFicha(ficha) {
  var p = { v: VERSAO_RESUMO };

  if (ehFichaDeOrdem(ficha)) {
    p.tipo = 'ordem';
    p.ordem = ordemParaPainel(ficha.ordem);
    p.itens = itensParaPainel(ficha.inventario);
    p.resumoRecursos = normalizarResumoRecursos(ficha.resumoRecursos);
    return p;
  }

  p.tipo = 'universal';
  p.atributos = (Array.isArray(ficha.atributos) ? ficha.atributos : [])
    .filter(function (a) { return a && typeof a === 'object'; })
    .map(function (a) { return { id: a.id, nome: a.nome, sigla: a.sigla, valor: a.valor, dado: a.dado }; });
  p.status = (Array.isArray(ficha.status) ? ficha.status : [])
    .filter(function (s) { return s && typeof s === 'object'; })
    .map(function (s) { return { id: s.id, nome: s.nome, atual: s.atual, maximo: s.maximo }; });
  return p;
}

/* O texto que vai para a coluna. Chamado por publicarFicha, dentro da
   mesma gravação de uma linha que publica o manifesto: a projeção nunca
   fica apontando para uma geração que não foi confirmada, porque ela
   entra na planilha junto com o manifesto dela. */
function textoDaProjecao(ficha, geracao, rev) {
  var p;
  try {
    p = projecaoDaFicha(ficha);
  } catch (erro) {
    console.warn('R.A.M.A.: projeção não montada: ' + erro);
    return '';
  }

  p.geracao = String(geracao || '');
  p.rev = Number(rev) || 0;

  var texto = JSON.stringify(p);
  if (texto.length > LIMITE_RESUMO_PROJECAO) {
    return JSON.stringify({ v: VERSAO_RESUMO, geracao: p.geracao, rev: p.rev, grande: true });
  }
  return texto;
}

/* A projeção guardada, em forma legível — sem dizer ainda se ela vale
   para a linha de agora. */
function projecaoGuardada(texto) {
  if (!texto) return null;
  var p = lerJson(String(texto), null);
  if (!p || Number(p.v) !== VERSAO_RESUMO || p.grande) return null;
  return p;
}

/* A projeção guardada, se ela ainda valer para ESTE registro.

   A conferência barata é a REVISÃO, que está entre as colunas leves:
   bateu, vale. Não bateu, ainda pode valer — há gravações que sobem a
   revisão sem tocar no conteúdo (tirar alguém da mesa, excluir a
   campanha, vincular) —, e aí quem decide é a GERAÇÃO do manifesto, que
   só muda quando o conteúdo muda. Ver projecoesDosPersonagens. */
function projecaoDoRegistro(registro, texto) {
  var p = projecaoGuardada(texto === undefined ? registro.resumo : texto);
  if (!p) return null;
  if (Number(p.rev) !== (Number(registro.rev) || 0)) return null;
  return p;
}



/* =====================================================================
   RESUMO DE RECURSOS
   ---------------------------------------------------------------------
   O outro jogador vê a vida atual e máxima do personagem de Ordem da
   mesa, mas não pode receber a ficha: o máximo sai de classe, trilha,
   escolhas, poderes — o build inteiro. E o Apps Script não tem o motor
   de regras; ele mora no navegador (js/ordem/regras.js).

   Então o MÁXIMO é calculado por quem já pode ver a ficha inteira — o
   dono ou o mestre — e guardado dentro da própria ficha, em
   `resumoRecursos`: { pv, pe, san } (san nula com "Jogando sem
   Sanidade"). Ele chega de dois jeitos:

     · junto de toda gravação da ficha (a ficha calcula antes de enviar);
     · por atualizar_resumo_personagem, quando o painel da mesa de quem
       pode ver a ficha percebe que o guardado não bate com o cálculo —
       uma ficha salva por uma versão antiga do site, por exemplo.

   O ATUAL não entra no resumo: ele é lido de `ordem.recursos` na hora,
   que é onde o ajuste rápido grava. Assim um −1 de vida aparece para a
   mesa sem ninguém precisar recalcular nada.

   Confiança: quem grava o resumo é quem já pode editar a ficha inteira.
   O dono conseguiria mostrar à mesa um máximo inventado — e conseguiria
   do mesmo jeito editando a própria ficha. O servidor valida a forma.
   ===================================================================== */

/* Os números do resumo de uma ficha de Ordem, validados, ou null. */
function recursosResumidos(ficha) {
  var resumo = normalizarResumoRecursos(ficha.resumoRecursos);
  if (!resumo) return null;

  var guardados = (ficha.ordem && ficha.ordem.recursos && typeof ficha.ordem.recursos === 'object')
    ? ficha.ordem.recursos : {};
  var rotulos = { pv: 'PV', pe: 'PE', san: 'SAN', pd: 'PD' };

  return ['pv', 'pe', 'san', 'pd']
    .filter(function (k) { return resumo[k] !== null; })
    .map(function (k) {
      return { chave: k, rotulo: rotulos[k], atual: recursoAtualGuardado(guardados[k], resumo[k]), maximo: resumo[k] };
    });
}

/* A mesma regra de js/ordem/regras.js (recursoAtual): nunca tocado vale
   o máximo; tocado vale o que foi gravado, aparado no máximo. */
function recursoAtualGuardado(guardado, maximo) {
  if (guardado === null || guardado === undefined || guardado === '') return maximo;
  var n = Number(guardado);
  if (!isFinite(n)) return maximo;
  return Math.min(Math.round(n), maximo);
}

function acaoAtualizarResumoPersonagem(corpo, usuario) {
  var resumo = normalizarResumoRecursos(corpo.resumo);
  if (!resumo) return { ok: false, erro: 'dados_invalidos' };

  /* A revisão é obrigatória: um painel aberto antes de a ficha subir de
     nível calculou o máximo VELHO, e não pode gravá-lo por cima do novo. */
  var revPedida = Number(corpo.rev);
  if (!Number.isFinite(revPedida)) return { ok: false, erro: 'dados_invalidos' };

  return comTrava(function () {
    var acesso = personagemAcessivel(corpo.personagemId, usuario);
    if (!acesso.ok) return acesso;

    var registro = acesso.personagem;
    var revAtual = Number(registro.rev) || 0;
    if (revPedida !== revAtual) return { ok: false, erro: 'conflito', rev: revAtual };

    /* Ficha que não se monta não recebe resumo: gravar por cima dela
       seria salvar o que ninguém conseguiu ler. */
    var lido = lerFichaDoPersonagem(registro);
    if (!lido.ok) return lido;
    var ficha = comVinculoDaColuna(lido.ficha, registro);
    if (!ehFichaDeOrdem(ficha)) return { ok: false, erro: 'dados_invalidos' };

    var guardado = normalizarResumoRecursos(ficha.resumoRecursos);
    if (guardado && guardado.pv === resumo.pv && guardado.pe === resumo.pe && guardado.san === resumo.san &&
        guardado.pd === resumo.pd) {
      return { ok: true, rev: revAtual, dados: { mudou: false } };
    }

    ficha.resumoRecursos = resumo;

    /* A revisão NÃO sobe: o resumo é derivado da ficha, não uma decisão
       de ninguém. Subir a revisão faria toda ficha aberta em outro
       aparelho entrar em conflito por causa de uma conta. Quem gravar a
       ficha depois manda o próprio resumo junto. Por isso a gravação não
       leva id de operação: o manifesto continua reconhecendo a última
       gravação que subiu a revisão. */
    var publicado = publicarFicha(registro, ficha, {});
    if (!publicado.ok) return publicado;

    marcarMesa(registro.campanhaId, ['personagens', 'combates']);
    return { ok: true, rev: revAtual, dados: { mudou: true } };
  });
}

/* O bloco `ordem` com o necessário para calcular PV, PE, Sanidade,
   Defesa, limite de PE e deslocamento — sem os textos das versões
   personalizadas (só o que muda efeito: aquisição e `efeitos`). */
function ordemParaPainel(ordem) {
  var copia = {};
  Object.keys(ordem).forEach(function (k) {
    if (k === 'organizacao') return;
    copia[k] = ordem[k];
  });
  copia.personalizacoes = (Array.isArray(ordem.personalizacoes) ? ordem.personalizacoes : [])
    .filter(function (x) { return x && typeof x === 'object'; })
    .map(function (x) {
      return { id: x.id, aquisicao: x.aquisicao, poder: x.poder, nome: x.nome, efeitos: x.efeitos };
    });
  return copia;
}

/* O que outro jogador da mesa vê de uma ficha de Ordem que não é dele:
   identificação, e nada de recursos, escolhas ou inventário. */
function ordemPublicaParaPainel(ordem) {
  var opcionais = ordem.opcionais && typeof ordem.opcionais === 'object' ? ordem.opcionais : {};
  return {
    classe: ordem.classe || '',
    trilha: ordem.trilha || '',
    nex: ordem.nex === undefined ? null : ordem.nex,
    nivel: ordem.nivel === undefined ? null : ordem.nivel,
    /* O estágio do Sobrevivente (v2.21): é a progressão dele, e o cartão
       mostra "Sobrevivente · Estágio 3". Não revela escolha nenhuma. */
    estagio: ordem.estagio === undefined ? null : ordem.estagio,
    opcionais: { nexExperiencia: opcionais.nexExperiencia === true },
  };
}

/* Itens com o que conta para Defesa e carga (tipo, Defesa, bloco de
   Ordem). Descrição e etiqueta ficam na ficha. */
function itensParaPainel(inventario) {
  var itens = inventario && Array.isArray(inventario.itens) ? inventario.itens : [];
  return itens
    .filter(function (i) { return i && typeof i === 'object'; })
    .map(function (i) {
      return { id: i.id, tipo: i.tipo, nome: i.nome, defesa: i.defesa, ordem: i.ordem };
    });
}

/* Põe ou tira um personagem da campanha.

   Duas pessoas podem fazer isso: o dono do personagem (que decide onde
   joga) e o mestre (que administra a mesa). Um estranho, não. */
function acaoVincularPersonagem(corpo, usuario) {
  return comTrava(function () {
    var ctx = contextoDaCampanha(corpo.campanhaId, usuario);
    if (!ctx.ok) return ctx;
    if (ctx.papel === PAPEL_ESPECTADOR) return { ok: false, erro: 'sem_permissao' };

    var personagem = acharPor(ABAS.PERSONAGENS, 'id', corpo.personagemId);
    if (!personagem) return { ok: false, erro: 'nao_encontrado' };

    var souDono = meu(personagem, usuario);
    if (!souDono && !ctx.mestre) return { ok: false, erro: 'nao_encontrado' };

    var vincular = corpo.vincular !== false;
    var campanhaAnterior = personagem.campanhaId;

    if (vincular) {
      /* Só entra personagem de quem é da mesa. Sem isto, um mestre
         poderia puxar para dentro a ficha de qualquer conta cujo id ele
         descobrisse — e ganharia acesso de edição sobre ela. */
      var papelDoDono = papelNaCampanha(ctx.campanha,
        { id: personagem.ownerId });
      if (papelDoDono !== PAPEL_MESTRE && papelDoDono !== PAPEL_JOGADOR) {
        return { ok: false, erro: 'sem_permissao' };
      }
      personagem.campanhaId = ctx.campanha.id;
    } else {
      personagem.campanhaId = '';
    }

    /* O vínculo é a COLUNA (v2.15): é ela que decide permissão, e a
       leitura da ficha a põe dentro do que sai para o navegador — ver
       comVinculoDaColuna. Então vincular não regrava a ficha: grava três
       colunas e, se houver, o manifesto, que precisa acompanhar a
       revisão nova. Uma ficha de 300 mil caracteres entra ou sai da mesa
       sem ser lida nem reescrita.

       A revisão sobe mesmo assim: uma ficha aberta noutro aparelho ainda
       tem a campanha antiga, e gravá-la sem conflito a levaria de volta
       para lá. */
    personagem.atualizadoEm = new Date().toISOString();
    personagem.rev = (Number(personagem.rev) || 0) + 1;

    var campos = ['campanhaId', 'atualizadoEm', 'rev'];
    var manifesto = manifestoDe(personagem.armazenamento);
    if (manifesto && !manifesto.invalido) {
      manifesto.rev = personagem.rev;
      manifesto.operacao = '';
      personagem.armazenamento = JSON.stringify(manifesto);
      campos.push('armazenamento');
    }

    /* A projeção continua valendo — o conteúdo da ficha não mudou —,
       mas ela é conferida pela revisão, que mudou. Carimbar a revisão
       nova nela custa uma célula vizinha na mesma gravação; não fazer
       isso obrigaria o painel a remontar a ficha inteira na próxima
       abertura da mesa. */
    var projecaoAtual = projecaoDoRegistro(
      { rev: (Number(personagem.rev) || 0) - 1 }, personagem.resumo);
    if (projecaoAtual) {
      projecaoAtual.rev = personagem.rev;
      personagem.resumo = JSON.stringify(projecaoAtual);
      campos.push('resumo');
    }

    atualizarCampos(ABAS.PERSONAGENS, personagem, campos);

    marcarMesa(ctx.campanha.id, ['personagens', 'combates']);
    if (campanhaAnterior && String(campanhaAnterior) !== String(ctx.campanha.id)) {
      marcarMesa(campanhaAnterior, ['personagens', 'combates']);
    }

    return { ok: true, rev: personagem.rev };
  });
}

/* =====================================================================
   AJUSTE RÁPIDO DE STATUS E ATRIBUTO
   ---------------------------------------------------------------------
   Os botões [-] e [+] do painel do mestre. Poderiam reusar
   salvar_personagem, mas isso obrigaria a baixar a ficha inteira,
   alterar um número e devolver tudo — e duas pessoas mexendo em
   personagens diferentes disputariam a mesma gravação enorme.

   Aqui a alteração é cirúrgica: um campo, por id, com a revisão
   conferida do mesmo jeito. NÃO é um caminho paralelo mais frouxo — é
   o mesmo controle de concorrência sobre um payload menor. O servidor
   valida o alvo, o campo e o valor.
   ===================================================================== */

var CAMPOS_AJUSTAVEIS = {
  status: ['atual', 'maximo'],
  atributo: ['valor'],
  /* Ficha de Ordem: o que sobrou de PV, PE e Sanidade — ou de PD, com
     "Jogando sem Sanidade". O máximo é calculado pelas regras e nunca é
     gravado. */
  recurso: ['atual'],
};

var RECURSOS_DE_ORDEM = ['pv', 'pe', 'san', 'pd'];

/* O mesmo piso da ficha de Ordem (js/paginas/ficha-ordem.js). */
var PISO_DE_RECURSO = -99;

/* O item e o campo que um ajuste mexe, dentro da ficha. Devolve
   { item, campo } ou { erro }. Criar o bloco de recursos de uma ficha de
   Ordem que ainda não o tinha é a única escrita aqui — e só na cópia em
   memória. */
function alvoDoAjuste(ficha, alvo, itemId, campo) {
  if (alvo === 'recurso') {
    /* Só existe em ficha de Ordem. Numa universal, o recurso é um
       status — e mexer num bloco que ela não tem seria criar dado. */
    if (String(ficha.tipoFicha || '') !== 'ordem' || !ficha.ordem || typeof ficha.ordem !== 'object') {
      return { erro: 'dados_invalidos' };
    }
    if (!ficha.ordem.recursos || typeof ficha.ordem.recursos !== 'object') {
      ficha.ordem.recursos = { pv: null, pe: null, san: null, pd: null };
    }
    return { item: ficha.ordem.recursos, campo: String(itemId) };
  }

  var lista = alvo === 'status' ? (ficha.status || []) : (ficha.atributos || []);
  for (var i = 0; i < lista.length; i++) {
    if (String(lista[i].id) === String(itemId)) return { item: lista[i], campo: campo };
  }
  return { erro: 'nao_encontrado' };
}

function acaoAjustarPersonagem(corpo, usuario) {
  var alvo = String(corpo.alvo || '');
  var campo = String(corpo.campo || '');
  var operacao = idDeOperacao(corpo.operacaoId);

  var permitidos = CAMPOS_AJUSTAVEIS[alvo];
  if (!permitidos || permitidos.indexOf(campo) < 0) return { ok: false, erro: 'dados_invalidos' };

  /* Só número de verdade. `Number("")`, `Number(null)` e `Number(false)`
     valem 0 — e um campo apagado não pode virar zero em silêncio. */
  var bruto = corpo.valor;
  var ehNumero = typeof bruto === 'number' ||
    (typeof bruto === 'string' && /^\s*-?\d+(\.\d+)?\s*$/.test(bruto));
  if (!ehNumero) return { ok: false, erro: 'dados_invalidos' };
  var valor = Number(bruto);
  if (!Number.isFinite(valor)) return { ok: false, erro: 'dados_invalidos' };
  valor = Math.round(valor);
  if (valor < -99999 || valor > 999999) return { ok: false, erro: 'dados_invalidos' };
  if (alvo === 'recurso') {
    if (RECURSOS_DE_ORDEM.indexOf(String(corpo.itemId || '')) < 0) return { ok: false, erro: 'dados_invalidos' };
    if (valor < PISO_DE_RECURSO) return { ok: false, erro: 'dados_invalidos' };
  }

  return comTrava(function () {
    var acesso = personagemAcessivel(corpo.personagemId, usuario);
    if (!acesso.ok) return acesso;

    var registro = acesso.personagem;

    /* Pedido feito a partir de uma campanha: o personagem precisa
       continuar nela. Um cartão aberto há uma hora não pode mexer numa
       ficha que já foi tirada daquela mesa. */
    if (corpo.campanhaId !== undefined && corpo.campanhaId !== null &&
        String(registro.campanhaId || '') !== String(corpo.campanhaId)) {
      return { ok: false, erro: 'nao_encontrado' };
    }
    var revAtual = Number(registro.rev) || 0;
    var revPedida = Number(corpo.rev);

    if (Number.isFinite(revPedida) && revPedida !== revAtual) {
      /* O mesmo ajuste chegando de novo (a resposta se perdeu): já está
         aplicado. Responde com o valor que ficou, como a primeira
         resposta teria feito. */
      if (operacaoJaAplicada(registro, operacao)) {
        var ja = lerFichaDoPersonagem(registro);
        if (!ja.ok) return ja;
        var feito = alvoDoAjuste(ja.ficha, alvo, corpo.itemId, campo);
        return { ok: true, rev: revAtual, repetida: true, dados: { valor: feito.item ? feito.item[feito.campo] : valor } };
      }
      return { ok: false, erro: 'conflito', rev: revAtual };
    }

    /* A ficha inteira é lida e regravada: o ajuste muda um número, mas
       o conteúdo é um só. Ficha que não se monta não é ajustada — o
       número seria gravado sobre o que ninguém conseguiu ler. */
    var lido = lerFichaDoPersonagem(registro);
    if (!lido.ok) return lido;
    var ficha = comVinculoDaColuna(lido.ficha, registro);

    var achado = alvoDoAjuste(ficha, alvo, corpo.itemId, campo);
    if (achado.erro) return { ok: false, erro: achado.erro };
    var item = achado.item;
    campo = achado.campo;

    item[campo] = valor;

    /* A mesma regra que a ficha aplica: o atual não passa do máximo. */
    if (alvo === 'status') {
      var maximo = Number(item.maximo) || 0;
      if (maximo > 0 && Number(item.atual) > maximo) item.atual = maximo;
    }

    var agora = new Date().toISOString();
    ficha.atualizadoEm = agora;

    registro.atualizadoEm = agora;
    registro.rev = revAtual + 1;

    var publicado = publicarFicha(registro, ficha, { operacao: operacao });
    if (!publicado.ok) return publicado;

    marcarMesa(registro.campanhaId, ['personagens', 'combates']);

    return { ok: true, rev: registro.rev, dados: { valor: item[campo] } };
  });
}

/* =====================================================================
   HISTÓRICO DE ROLAGENS
   ===================================================================== */

/* A rolagem já aconteceu no navegador. Aqui ela só é registrada — o
   servidor NUNCA rola de novo.

   O `id` vem do cliente e é a chave de idempotência: se a rede falhar e
   o envio se repetir, a segunda gravação encontra a primeira e não faz
   nada. Sem isso, um retry viraria duas linhas no histórico com o mesmo
   resultado, e a mesa veria um ataque que nunca foi feito duas vezes. */
function acaoRegistrarRolagem(corpo, usuario) {
  var ctx = contextoDaCampanha(corpo.campanhaId, usuario);
  if (!ctx.ok) return ctx;
  if (ctx.papel === PAPEL_ESPECTADOR) return { ok: false, erro: 'sem_permissao' };

  var id = String(corpo.rolagemId || '').slice(0, 80);
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(id)) return { ok: false, erro: 'dados_invalidos' };

  var dados = corpo.dados;
  if (!dados || typeof dados !== 'object') return { ok: false, erro: 'dados_invalidos' };

  /* Se veio personagem, ele tem de ser desta campanha e desta pessoa
     (ou dela como mestre). Registrar em nome de um personagem alheio
     colocaria no histórico uma rolagem que ninguém fez. */
  var personagemId = String(corpo.personagemId || '');
  if (personagemId) {
    var acesso = personagemAcessivel(personagemId, usuario);
    if (!acesso.ok) return { ok: false, erro: 'nao_encontrado' };
    if (String(acesso.personagem.campanhaId) !== String(ctx.campanha.id)) {
      return { ok: false, erro: 'sem_permissao' };
    }
  }

  /* A visibilidade NÃO vem do cliente. Rolagem de jogador é sempre
     pública dentro da mesa; rolagem do mestre segue a configuração
     atual da campanha. Assim um navegador adulterado não consegue nem
     esconder o próprio resultado nem revelar o que o mestre escondeu. */
  var config = lerJson(ctx.campanha.dadosJson, {});
  var visibilidade = (ctx.mestre && config.rolagensMestreOcultas)
    ? VIS_ROLAGEM_OCULTA
    : VIS_ROLAGEM_PUBLICA;

  var json = JSON.stringify(dados);
  if (json.length > MAX_CELULA) return { ok: false, erro: 'dados_grandes' };

  /* Atalho de idempotência.

     Quando o navegador reenvia uma rolagem porque a resposta se perdeu,
     o id é o MESMO — e quase sempre a segunda chegada acontece segundos
     depois da primeira, ainda dentro da janela do cache. Reconhecer
     ali evita entrar na trava e varrer a aba.

     O cache aqui ACELERA um caminho que já era correto sem ele. Se a
     entrada tiver sumido, a conferência na planilha acontece do mesmo
     jeito, e é ela que decide. Um cache vazio nunca produz linha
     duplicada; produz só uma conferência a mais. */
  var chaveDeIdempotencia = 'rama.rolagem.' + id;
  if (cacheLer(chaveDeIdempotencia)) {
    return { ok: true, dados: { id: id, repetida: true } };
  }

  return comTrava(function () {
    /* Só a coluna de ids: para saber se este id já entrou não é preciso
       trazer mais nada de 1.500 linhas. */
    if (linhaDe(ABAS.CAMPANHA_ROLAGENS, 'id', id)) {
      cacheGravar(chaveDeIdempotencia, '1', SEGUNDOS_IDEMPOTENCIA);
      /* Já registrada. Responder ok mantém o cliente calmo e não cria
         a segunda linha. */
      return { ok: true, dados: { id: id, repetida: true } };
    }

    inserir(ABAS.CAMPANHA_ROLAGENS, {
      id: id,
      campanhaId: ctx.campanha.id,
      autorUserId: usuario.id,
      personagemId: personagemId,
      tipo: String(corpo.tipo || '').slice(0, 40),
      nome: String(corpo.nome || '').slice(0, 120),
      visibilidade: visibilidade,
      criadoEm: new Date().toISOString(),
      dadosJson: json,
    });

    cacheGravar(chaveDeIdempotencia, '1', SEGUNDOS_IDEMPOTENCIA);
    marcarMesa(ctx.campanha.id, ['rolagens']);

    return { ok: true, dados: { id: id, visibilidade: visibilidade } };
  });
}

/* =====================================================================
   O HISTÓRICO, EM PÁGINAS DE CUSTO CONTROLADO
   ---------------------------------------------------------------------
   Até a v2.15 cada página do histórico varria as oito colunas leves da
   aba INTEIRA — 1.500 rolagens para mostrar 25 —, ordenava tudo e
   fatiava. O custo era o do histórico, não o da página, e crescia para
   sempre.

   Agora são duas coisas:

     o índice    uma chamada, UMA coluna (campanhaId), que dá os números
                 de linha desta campanha em ordem cronológica — porque
                 rolagem só entra no fim da aba, nunca no meio
     a página    as linhas do fim do índice para trás, lidas inteiras, só
                 as que a página precisa (mais uma margem para o que for
                 filtrado)

   O CURSOR
   ---------------------------------------------------------------------
   A página seguinte não é "pule 25": é "mais velhas que esta". O cursor
   carrega a data, a linha e o id, e o que decide é a DATA, com a LINHA
   desempatando. Assim uma rolagem nova no topo não empurra a paginação:
   nada é repetido e nada é pulado, mesmo com a mesa rolando dados
   enquanto alguém lê o histórico.

ONDE A PÁGINA SEGUINTE COMEÇA
   ---------------------------------------------------------------------
   O cursor se localiza pelo ID da última rolagem que ele entregou. Com
   o id, o índice diz exatamente em que posição parar — e isso vale
   mesmo que as linhas tenham mudado de número (o mestre limpou o
   histórico de OUTRA campanha e tudo subiu) e mesmo que várias
   rolagens tenham sido gravadas no mesmo milissegundo, caso em que a
   data não desempata nada.

   Por isso a primeira página lê UMA coluna (campanhaId) e as seguintes
   leem DUAS (id e campanhaId, que são vizinhas): a viagem é a mesma, e
   a coluna a mais só é paga por quem está rolando o histórico para
   trás.

   Se o id não estiver mais lá — o histórico foi limpo entre uma página
   e outra —, sobra a pista: a linha do cursor, com a data como
   conferência. Nesse caso, no pior cenário, uma rolagem já mostrada
   aparece de novo, e a tela a reconhece pelo id. Nunca o contrário:
   rolagem mais antiga não some.

   O TOTAL EXATO NÃO É CALCULADO
   ---------------------------------------------------------------------
   Contar quantas rolagens uma pessoa pode ver exige aplicar a
   filtragem de ocultas em todas as linhas — ou seja, a varredura que
   esta mudança existe para não fazer. A tela deixou de mostrar "N
   restantes" e passou a mostrar "Carregar mais", que é o que ela usa de
   verdade.
   ===================================================================== */

/* Quantas linhas a mais ler, além do tamanho da página, para cobrir as
   que a filtragem vai descartar. */
var MARGEM_DA_PAGINA = 10;

/* Quantas vezes insistir quando a filtragem come a página inteira (uma
   campanha em que quase tudo é rolagem oculta do mestre). */
var VOLTAS_DA_PAGINA = 4;

function cursorDaRolagem(r) {
  return String(r._linha) + '|' + String(r.criadoEm || '') + '|' + String(r.id);
}

function lerCursorDeRolagem(valor) {
  var texto = String(valor || '');
  if (!texto || texto.length > 200) return null;

  var partes = texto.split('|');
  if (partes.length < 3) return null;

  var linha = Number(partes[0]);
  var id = partes.slice(2).join('|');
  if (!(linha >= 2) || !/^[A-Za-z0-9_-]{8,80}$/.test(id)) return null;

  return { linha: linha, criadoEm: String(partes[1]), id: id };
}

/* Mais velha que o cursor? Data primeiro, linha desempatando. */
function antesDoCursor(r, cursor) {
  var data = String(r.criadoEm || '');
  if (data !== cursor.criadoEm) return data < cursor.criadoEm;
  return Number(r._linha) < Number(cursor.linha);
}

/* A ordem da página é EXATAMENTE a chave do cursor, ao contrário: data
   e, no empate, linha. As duas precisam concordar — uma ordenando por
   linha e a outra comparando por id deixaria escapar as rolagens
   gravadas no mesmo milissegundo. */
function maisNovaPrimeiro(a, b) {
  var da = String(a.criadoEm || '');
  var db = String(b.criadoEm || '');
  if (da !== db) return db < da ? -1 : 1;
  return Number(b._linha) - Number(a._linha);
}

/* As linhas desta campanha, em ordem cronológica — porque rolagem só
   entra no fim da aba. Com `comIds`, cada linha vem com o id junto, que
   é o que o cursor usa para se localizar. Uma chamada; uma coluna, ou
   duas vizinhas. */
function linhasDasRolagens(campanhaId, comIds) {
  if (!comIds) {
    var soCampanha = linhasPorValor(ABAS.CAMPANHA_ROLAGENS, ['campanhaId']);
    return (soCampanha[String(campanhaId)] || []).map(function (l) { return { linha: l, id: '' }; });
  }

  var mapa = linhasPorValor(ABAS.CAMPANHA_ROLAGENS, ['id', 'campanhaId']);
  var sufixo = '\n' + String(campanhaId);
  var lista = [];

  Object.keys(mapa).forEach(function (chave) {
    if (chave.length <= sufixo.length) return;
    if (chave.slice(chave.length - sufixo.length) !== sufixo) return;
    var id = chave.slice(0, chave.length - sufixo.length);
    mapa[chave].forEach(function (l) { lista.push({ linha: l, id: id }); });
  });

  lista.sort(function (a, b) { return a.linha - b.linha; });
  return lista;
}

function acaoListarRolagens(corpo, usuario) {
  var ctx = contextoDaCampanha(corpo.campanhaId, usuario);
  if (!ctx.ok) return ctx;

  if (ctx.papel === PAPEL_ESPECTADOR) return { ok: true, dados: { rolagens: [], fim: true } };

  var limite = Number(corpo.limite) || PAGINA_ROLAGENS;
  limite = Math.max(1, Math.min(MAX_PAGINA_ROLAGENS, limite));

  var nomes = nomesDasContas();

  var cursor = lerCursorDeRolagem(corpo.cursor);
  var linhas = linhasDasRolagens(ctx.campanha.id, !!cursor);

  /* `pulo` é o contrato antigo (v2.15): "já tenho N". Continua aceito
     para um site que ainda não foi publicado com esta versão, e custa
     ler as N linhas que ele manda pular. */
  var pular = cursor ? 0 : Math.max(0, Number(corpo.pulo) || 0);

  var alto = linhas.length;
  var achouOCursor = false;

  if (cursor) {
    for (var c = linhas.length - 1; c >= 0; c--) {
      if (linhas[c].id !== cursor.id) continue;
      alto = c;
      achouOCursor = true;
      break;
    }
    /* O id sumiu (histórico limpo no meio da paginação): sobra a pista
       da linha, e a comparação por data conferindo. */
    if (!achouOCursor) {
      while (alto > 0 && linhas[alto - 1].linha >= cursor.linha) alto--;
    }
  }

  var pagina = [];
  var maisVelhaVista = null;
  var encheu = false;
  var voltas = 0;
  var i = alto;

  while (!encheu && i > 0 && voltas < VOLTAS_DA_PAGINA) {
    var quantas = (limite - pagina.length) + MARGEM_DA_PAGINA + pular;
    var inicio = Math.max(0, i - quantas);

    var registros = lerLinhas(ABAS.CAMPANHA_ROLAGENS,
      linhas.slice(inicio, i).map(function (x) { return x.linha; }));
    registros.sort(maisNovaPrimeiro);

    for (var k = 0; k < registros.length; k++) {
      var r = registros[k];
      maisVelhaVista = r;

      /* O índice pode ter envelhecido: a linha é conferida no próprio
         registro, nunca presumida. */
      if (String(r.campanhaId) !== String(ctx.campanha.id)) continue;

      /* A FILTRAGEM ACONTECE AQUI, no servidor. Uma rolagem oculta do
         mestre não é escondida com CSS: ela nem chega ao navegador do
         jogador. */
      if (!ctx.mestre && String(r.visibilidade) === VIS_ROLAGEM_OCULTA) continue;

      /* Com o cursor localizado pelo id, o corte já garantiu que só
         vêm rolagens anteriores a ele. A comparação por data só entra
         quando o id não foi achado. */
      if (cursor && !achouOCursor && !antesDoCursor(r, cursor)) continue;
      if (pular > 0) { pular--; continue; }

      pagina.push(r);
      if (pagina.length >= limite) { encheu = true; break; }
    }

    /* Encheu no meio do lote: o que sobrou dele fica para a próxima
       página, que começa pelo cursor. Avançar `i` aqui pularia essas
       linhas para sempre. */
    if (encheu) break;

    i = inicio;
    voltas++;
  }

  /* Só é o fim quando as linhas acabaram sem encher a página. */
  var acabou = !encheu && i <= 0;

  /* O cursor da próxima página: a última que entrou. Se a filtragem
     comeu tudo, o da mais velha que foi OLHADA — senão pedir de novo
     devolveria a mesma coisa para sempre. */
  var ultima = pagina.length ? pagina[pagina.length - 1] : maisVelhaVista;

  return {
    ok: true,
    dados: {
      rolagens: pagina.map(function (r) {
        /* A linha já veio inteira da leitura da página: o resultado
           não custa uma segunda viagem. */
        var d = lerJson(r.dadosJson, {});
        return {
          id: r.id,
          autorUserId: r.autorUserId,
          autor: nomes[r.autorUserId] || '',
          personagemId: r.personagemId || null,
          tipo: r.tipo,
          nome: r.nome,
          oculta: String(r.visibilidade) === VIS_ROLAGEM_OCULTA,
          criadoEm: r.criadoEm,
          resultado: d,
        };
      }),
      /* Verdadeiro quando não há mais nada antes desta página. */
      fim: acabou,
      proximo: acabou || !ultima ? null : cursorDaRolagem(ultima),
    },
  };
}

function acaoLimparRolagens(corpo, usuario) {
  return comTrava(function () {
    var ctx = exigirMestre(corpo.campanhaId, usuario);
    if (!ctx.ok) return ctx;

    /* Pelo índice de uma coluna, como a listagem: limpar não precisa
       ler o resultado de cada rolagem para apagá-la. */
    var removidas = apagarLinhas(ABAS.CAMPANHA_ROLAGENS,
      linhasDasRolagens(ctx.campanha.id, false).map(function (x) { return x.linha; }));
    marcarMesa(ctx.campanha.id, ['rolagens']);

    return { ok: true, dados: { removidas: removidas } };
  });
}

/* =====================================================================
   DOCUMENTOS
   ---------------------------------------------------------------------
   Cada documento carrega a lista de quem pode vê-lo. Lista vazia
   significa NINGUÉM além do mestre — e "ninguém" é lido como ninguém,
   nunca como "todos".
   ===================================================================== */

function podeVerDocumento(documento, ctx, usuario) {
  if (ctx.mestre) return true;
  if (ctx.papel === PAPEL_ESPECTADOR) return false;

  var visiveis = lerJson(documento.visiveisJson, null);
  if (!Array.isArray(visiveis)) return false;

  return visiveis.some(function (id) { return String(id) === String(usuario.id); });
}

function acaoListarDocumentos(corpo, usuario) {
  var ctx = contextoDaCampanha(corpo.campanhaId, usuario);
  if (!ctx.ok) return ctx;

  var lista = daCampanha(ABAS.CAMPANHA_DOCUMENTOS, ctx.campanha.id)
    /* Filtrado ANTES de montar a resposta. O jogador sem permissão não
       recebe título, descrição nem sequer a existência do documento —
       não é display:none, é a linha não entrar no JSON. */
    .filter(function (d) { return podeVerDocumento(d, ctx, usuario); })
    .map(function (d) {
      var saida = {
        id: d.id,
        nome: d.nome,
        descricao: d.descricao,
        criadoEm: d.criadoEm,
        atualizadoEm: d.atualizadoEm,
        rev: Number(d.rev) || 0,
      };
      /* Quem pode ver o documento não precisa saber quem MAIS pode.
         Essa lista é administração, e administração é do mestre. */
      if (ctx.mestre) saida.visiveis = lerJson(d.visiveisJson, []) || [];
      return saida;
    })
    .sort(function (a, b) { return String(a.nome).localeCompare(String(b.nome), 'pt-BR'); });

  return { ok: true, dados: lista };
}

function acaoSalvarDocumento(corpo, usuario) {
  var dados = corpo.dados || {};
  var nome = String(dados.nome || '').trim().slice(0, 120);
  if (!nome) return { ok: false, erro: 'dados_invalidos' };

  return comTrava(function () {
    var ctx = exigirMestre(corpo.campanhaId, usuario);
    if (!ctx.ok) return ctx;

    /* A lista de quem vê só é aceita de um mestre — e só com ids de
       gente que realmente participa. Um id qualquer enviado pelo
       console não vira permissão. */
    var membros = idsDaMesa(ctx.campanha);

    var visiveis = (Array.isArray(dados.visiveis) ? dados.visiveis : [])
      .map(String)
      .filter(function (id) { return membros[id]; });

    var agora = new Date().toISOString();
    var existente = null;

    if (dados.id) {
      existente = acharPor(ABAS.CAMPANHA_DOCUMENTOS, 'id', dados.id);
      if (existente && String(existente.campanhaId) !== String(ctx.campanha.id)) existente = null;
    }

    if (existente) {
      var revAtual = Number(existente.rev) || 0;
      var revPedida = Number(corpo.rev);
      if (Number.isFinite(revPedida) && revPedida !== revAtual) {
        return { ok: false, erro: 'conflito', rev: revAtual };
      }

      existente.nome = nome;
      existente.descricao = String(dados.descricao || '').slice(0, 8000);
      existente.visiveisJson = JSON.stringify(visiveis);
      existente.atualizadoEm = agora;
      existente.rev = revAtual + 1;

      atualizarLinha(ABAS.CAMPANHA_DOCUMENTOS, existente._linha, existente);
      marcarMesa(ctx.campanha.id, ['documentos']);
      return { ok: true, dados: { id: existente.id }, rev: existente.rev };
    }

    var id = novoId();
    inserir(ABAS.CAMPANHA_DOCUMENTOS, {
      id: id,
      campanhaId: ctx.campanha.id,
      nome: nome,
      descricao: String(dados.descricao || '').slice(0, 8000),
      visiveisJson: JSON.stringify(visiveis),
      criadoEm: agora,
      atualizadoEm: agora,
      rev: 1,
    });

    marcarMesa(ctx.campanha.id, ['documentos']);
    return { ok: true, dados: { id: id }, rev: 1 };
  });
}

function acaoExcluirDocumento(corpo, usuario) {
  return comTrava(function () {
    var ctx = exigirMestre(corpo.campanhaId, usuario);
    if (!ctx.ok) return ctx;

    var documento = acharPor(ABAS.CAMPANHA_DOCUMENTOS, 'id', corpo.documentoId);
    if (!documento || String(documento.campanhaId) !== String(ctx.campanha.id)) {
      return { ok: false, erro: 'nao_encontrado' };
    }

    apagarLinha(ABAS.CAMPANHA_DOCUMENTOS, documento._linha);

    var imagem = acharPor(ABAS.CAMPANHA_DOCUMENTOS_IMAGENS, 'documentoId', corpo.documentoId);
    if (imagem) apagarLinha(ABAS.CAMPANHA_DOCUMENTOS_IMAGENS, imagem._linha);

    marcarMesa(ctx.campanha.id, ['documentos']);
    return { ok: true };
  });
}

/* A imagem é pedida à parte, e a permissão é conferida de novo aqui.
   Sem esta conferência, quem descobrisse o id de um documento
   restrito baixaria a imagem dele por fora da listagem. */
function acaoLerImagemDocumento(corpo, usuario) {
  var ctx = contextoDaCampanha(corpo.campanhaId, usuario);
  if (!ctx.ok) return ctx;

  var documento = acharPor(ABAS.CAMPANHA_DOCUMENTOS, 'id', corpo.documentoId);
  if (!documento || String(documento.campanhaId) !== String(ctx.campanha.id)) {
    return { ok: false, erro: 'nao_encontrado' };
  }
  if (!podeVerDocumento(documento, ctx, usuario)) return { ok: false, erro: 'nao_encontrado' };

  var imagem = acharPor(ABAS.CAMPANHA_DOCUMENTOS_IMAGENS, 'documentoId', corpo.documentoId);
  return { ok: true, dados: { imagem: imagemDe(imagem, 'imagem') } };
}

function acaoSalvarImagemDocumento(corpo, usuario) {
  var imagem = String(corpo.imagem || '');

  if (imagem && imagem.indexOf('data:image/') !== 0) return { ok: false, erro: 'dados_invalidos' };
  if (imagem.length > MAX_IMAGEM) return { ok: false, erro: 'dados_grandes' };

  return comTrava(function () {
    var ctx = exigirMestre(corpo.campanhaId, usuario);
    if (!ctx.ok) return ctx;

    var documento = acharPor(ABAS.CAMPANHA_DOCUMENTOS, 'id', corpo.documentoId);
    if (!documento || String(documento.campanhaId) !== String(ctx.campanha.id)) {
      return { ok: false, erro: 'nao_encontrado' };
    }

    var agora = new Date().toISOString();
    var existente = acharPor(ABAS.CAMPANHA_DOCUMENTOS_IMAGENS, 'documentoId', corpo.documentoId);

    if (existente) {
      existente.atualizadoEm = agora;
      if (!aplicarImagem(ABAS.CAMPANHA_DOCUMENTOS_IMAGENS, existente, 'imagem', imagem)) return { ok: false, erro: 'instalacao_incompleta', detalhe: 'imagemCont' };
      atualizarLinha(ABAS.CAMPANHA_DOCUMENTOS_IMAGENS, existente._linha, existente);
    } else {
      var novaDoc = { documentoId: corpo.documentoId, campanhaId: ctx.campanha.id, atualizadoEm: agora };
      if (!aplicarImagem(ABAS.CAMPANHA_DOCUMENTOS_IMAGENS, novaDoc, 'imagem', imagem)) return { ok: false, erro: 'instalacao_incompleta', detalhe: 'imagemCont' };
      inserir(ABAS.CAMPANHA_DOCUMENTOS_IMAGENS, novaDoc);
    }

    /* A data do documento acompanha a da imagem: é por ela que a aba
       Documentos, ao se atualizar sozinha, sabe que precisa baixar a
       imagem de novo. A revisão fica: trocar a imagem não é editar o
       texto, e não pode pôr em conflito quem está com o texto aberto. */
    documento.atualizadoEm = agora;
    atualizarLinha(ABAS.CAMPANHA_DOCUMENTOS, documento._linha, documento);

    marcarMesa(ctx.campanha.id, ['documentos']);
    return { ok: true };
  });
}

/* =====================================================================
   CAPA DA CAMPANHA
   ---------------------------------------------------------------------
   Uma imagem por campanha, numa aba própria (CAMPANHA_CAPAS). Três
   regras:

     · só o mestre grava, troca ou remove — exigirMestre, sempre;
     · ler passa por contextoDaCampanha, então a capa de campanha privada
       não sai para quem está de fora, nem pedindo pelo id direto; a de
       campanha pública aparece para o espectador, como o nome e a
       descrição;
     · a imagem chega pronta do navegador (recortada, reduzida e
       comprimida por js/imagem.js) e é recusada — nunca aparada — se
       passar do limite da célula. Imagem cortada no meio é imagem
       quebrada.
   ===================================================================== */

var FORMATO_DE_CAPA = /^data:image\/(webp|jpeg|png|gif);base64,[A-Za-z0-9+\/]+=*$/;
var LADO_MAXIMO_DA_CAPA = 4096;

/* Se a campanha tem capa, pelas colunas leves. */
function capaDaCampanha(campanhaId) {
  var alvo = String(campanhaId);
  var linhas = lerLeves(ABAS.CAMPANHA_CAPAS);
  for (var i = 0; i < linhas.length; i++) {
    if (String(linhas[i].campanhaId) === alvo) {
      return {
        existe: true,
        atualizadoEm: linhas[i].atualizadoEm,
        largura: Number(linhas[i].largura) || 0,
        altura: Number(linhas[i].altura) || 0,
        registro: linhas[i],
      };
    }
  }
  return { existe: false };
}

function acaoLerCapaCampanha(corpo, usuario) {
  var ctx = contextoDaCampanha(corpo.campanhaId, usuario);
  if (!ctx.ok) return ctx;

  var capa = capaDaCampanha(ctx.campanha.id);
  if (!capa.existe) return { ok: true, dados: { imagem: '', atualizadoEm: '', largura: 0, altura: 0 } };

  var celulas = imagensDasLinhas(ABAS.CAMPANHA_CAPAS, [capa.registro], 'imagem');
  return {
    ok: true,
    dados: {
      imagem: celulas[capa.registro._linha] || '',
      atualizadoEm: capa.atualizadoEm,
      largura: capa.largura,
      altura: capa.altura,
    },
  };
}

/* imagem vazia remove a capa. */
/* As capas de um punhado de campanhas, numa viagem.

   A regra de acesso é a mesma de `ler_capa_campanha`: quem alcança a
   campanha vê a capa dela — membro, ou espectador de campanha pública.
   Campanha que a conta não alcança simplesmente não aparece na
   resposta, sem dizer se ela existe. */
function acaoLerCapas(corpo, usuario) {
  var ids = Array.isArray(corpo.campanhaIds) ? corpo.campanhaIds : [];
  if (!ids.length || ids.length > MAX_IMAGENS_POR_PEDIDO) return { ok: false, erro: 'dados_invalidos' };

  var alcance = campanhasDoUsuario(usuario);
  var querido = {};
  ids.forEach(function (id) { if (alcance[String(id)]) querido[String(id)] = true; });

  var linhas = lerLeves(ABAS.CAMPANHA_CAPAS).filter(function (capa) {
    return querido[String(capa.campanhaId)];
  });
  if (!linhas.length) return { ok: true, dados: {} };

  var imagens = imagensDasLinhas(ABAS.CAMPANHA_CAPAS, linhas, 'imagem');

  var saida = {};
  linhas.forEach(function (capa) {
    saida[String(capa.campanhaId)] = {
      imagem: imagens[capa._linha] || '',
      versao: String(capa.atualizadoEm || ''),
    };
  });

  return { ok: true, dados: saida };
}

function acaoSalvarCapaCampanha(corpo, usuario) {
  if (typeof corpo.imagem !== 'string') return { ok: false, erro: 'dados_invalidos' };
  var imagem = corpo.imagem;

  if (imagem.length > MAX_IMAGEM) return { ok: false, erro: 'dados_grandes' };
  if (imagem && !FORMATO_DE_CAPA.test(imagem)) return { ok: false, erro: 'dados_invalidos' };

  var largura = Math.round(Number(corpo.largura));
  var altura = Math.round(Number(corpo.altura));
  if (imagem && !(largura >= 1 && largura <= LADO_MAXIMO_DA_CAPA &&
                  altura >= 1 && altura <= LADO_MAXIMO_DA_CAPA)) {
    return { ok: false, erro: 'dados_invalidos' };
  }

  return comTrava(function () {
    var ctx = exigirMestre(corpo.campanhaId, usuario);
    if (!ctx.ok) return ctx;

    /* Achar a linha sem ler a imagem antiga, que vai ser substituída. */
    var existente = linhaLeve(ABAS.CAMPANHA_CAPAS, 'campanhaId', ctx.campanha.id);
    var agora = new Date().toISOString();

    if (!imagem) {
      if (existente) apagarLinha(ABAS.CAMPANHA_CAPAS, existente._linha);
      marcarMesa(ctx.campanha.id, ['campanha']);
      return { ok: true, dados: { existe: false } };
    }

    if (existente) {
      existente.atualizadoEm = agora;
      existente.largura = largura;
      existente.altura = altura;
      var colunasCapa = aplicarImagem(ABAS.CAMPANHA_CAPAS, existente, 'imagem', imagem);
      if (!colunasCapa) return { ok: false, erro: 'instalacao_incompleta', detalhe: 'imagemCont' };
      atualizarCampos(ABAS.CAMPANHA_CAPAS, existente, ['atualizadoEm', 'largura', 'altura'].concat(colunasCapa));
    } else {
      var novaCapa = { campanhaId: ctx.campanha.id, atualizadoEm: agora, largura: largura, altura: altura };
      if (!aplicarImagem(ABAS.CAMPANHA_CAPAS, novaCapa, 'imagem', imagem)) return { ok: false, erro: 'instalacao_incompleta', detalhe: 'imagemCont' };
      inserir(ABAS.CAMPANHA_CAPAS, novaCapa);
    }

    marcarMesa(ctx.campanha.id, ['campanha']);
    return { ok: true, dados: { existe: true, atualizadoEm: agora, largura: largura, altura: altura } };
  });
}

/* =====================================================================
   NOTAS DO MESTRE
   ---------------------------------------------------------------------
   Privadas. Toda ação aqui começa por exigirMestre() — não existe
   variação "para jogador" destas funções, e é de propósito: a forma
   mais segura de nunca vazar uma nota é não haver caminho de código que
   a devolva a quem não é mestre.
   ===================================================================== */

function acaoListarNotasMestre(corpo, usuario) {
  var ctx = exigirMestre(corpo.campanhaId, usuario);
  if (!ctx.ok) return ctx;

  var linhas = daCampanhaLeves(ABAS.CAMPANHA_NOTAS, ctx.campanha.id);

  /* O conteúdo das notas é a coluna pesada, e é lido só das notas desta
     campanha — não das de todas as campanhas do sistema. */
  var conteudos = lerCelulas(ABAS.CAMPANHA_NOTAS, linhas, 'conteudo');

  var lista = linhas
    .map(function (n) {
      return {
        id: n.id,
        personagemId: n.personagemId || null,
        pasta: n.pasta || '',
        titulo: n.titulo,
        conteudo: conteudos[n._linha] || '',
        criadoEm: n.criadoEm,
        atualizadoEm: n.atualizadoEm,
      };
    })
    .sort(function (a, b) { return String(a.titulo).localeCompare(String(b.titulo), 'pt-BR'); });

  return { ok: true, dados: lista };
}

function acaoSalvarNotaMestre(corpo, usuario) {
  var dados = corpo.dados || {};
  var titulo = String(dados.titulo || '').trim().slice(0, 160);
  if (!titulo) return { ok: false, erro: 'dados_invalidos' };

  var conteudo = String(dados.conteudo || '');
  if (conteudo.length > MAX_CELULA) return { ok: false, erro: 'dados_grandes' };

  return comTrava(function () {
    var ctx = exigirMestre(corpo.campanhaId, usuario);
    if (!ctx.ok) return ctx;

    /* Nota associada a personagem só vale se o personagem for mesmo
       desta campanha. */
    var personagemId = String(dados.personagemId || '');
    if (personagemId) {
      var p = acharPor(ABAS.PERSONAGENS, 'id', personagemId);
      if (!p || String(p.campanhaId) !== String(ctx.campanha.id)) personagemId = '';
    }

    var agora = new Date().toISOString();
    var existente = null;

    if (dados.id) {
      existente = acharPor(ABAS.CAMPANHA_NOTAS, 'id', dados.id);
      if (existente && String(existente.campanhaId) !== String(ctx.campanha.id)) existente = null;
    }

    if (existente) {
      existente.titulo = titulo;
      existente.conteudo = conteudo;
      existente.personagemId = personagemId;
      existente.pasta = String(dados.pasta || '').slice(0, 80);
      existente.atualizadoEm = agora;
      atualizarLinha(ABAS.CAMPANHA_NOTAS, existente._linha, existente);
      return { ok: true, dados: { id: existente.id } };
    }

    var id = novoId();
    inserir(ABAS.CAMPANHA_NOTAS, {
      id: id,
      campanhaId: ctx.campanha.id,
      personagemId: personagemId,
      pasta: String(dados.pasta || '').slice(0, 80),
      titulo: titulo,
      criadoEm: agora,
      atualizadoEm: agora,
      conteudo: conteudo,
    });

    return { ok: true, dados: { id: id } };
  });
}

function acaoExcluirNotaMestre(corpo, usuario) {
  return comTrava(function () {
    var ctx = exigirMestre(corpo.campanhaId, usuario);
    if (!ctx.ok) return ctx;

    var nota = acharPor(ABAS.CAMPANHA_NOTAS, 'id', corpo.notaId);
    if (!nota || String(nota.campanhaId) !== String(ctx.campanha.id)) {
      return { ok: false, erro: 'nao_encontrado' };
    }

    apagarLinha(ABAS.CAMPANHA_NOTAS, nota._linha);
    return { ok: true };
  });
}

/* =====================================================================
   COMBATES
   ---------------------------------------------------------------------
   O combate fica salvo na planilha, e não na memória do navegador:
   recarregar, fechar o navegador ou abrir em outro computador tem de
   encontrar o combate onde ele estava.

   As criaturas entram como SNAPSHOT. Editar o modelo na biblioteca
   depois não muda um combate que já começou — e cada ocorrência tem id
   próprio, então "Existido #1" e "Existido #2" são dois estados
   independentes vindos do mesmo modelo.
   ===================================================================== */

function podeVerCombate(combate, ctx, usuario) {
  if (ctx.mestre) return true;
  if (ctx.papel === PAPEL_ESPECTADOR) return false;

  var visiveis = lerJson(combate.visiveisJson, null);
  if (!Array.isArray(visiveis)) return false;

  return visiveis.some(function (id) { return String(id) === String(usuario.id); });
}

var ESTADOS_DE_COMBATE = ['preparando', 'ativo', 'encerrado'];

function estadoDeCombate(valor) {
  return ESTADOS_DE_COMBATE.indexOf(String(valor)) >= 0 ? String(valor) : 'preparando';
}

function acaoListarCombates(corpo, usuario) {
  var ctx = contextoDaCampanha(corpo.campanhaId, usuario);
  if (!ctx.ok) return ctx;

  /* A permissão é decidida ANTES de ler o conteúdo: um combate que este
     jogador não pode ver não chega nem a ter o dadosJson buscado. A
     coluna que carrega a lista de quem vê é leve, então filtrar é
     barato. */
  var visiveis = daCampanhaLeves(ABAS.CAMPANHA_COMBATES, ctx.campanha.id)
    .filter(function (c) { return podeVerCombate(c, ctx, usuario); });

  var conteudos = textosDosCombates(visiveis,
    lerCelulas(ABAS.CAMPANHA_COMBATES, visiveis, 'dadosJson'),
    lerCelulas(ABAS.CAMPANHA_COMBATES, visiveis, 'armazenamento'));

  /* Os recursos dos personagens que estão em algum destes combates, já
     filtrados pela permissão de quem pede. */
  var idsDePersonagem = {};
  visiveis.forEach(function (c) {
    var dados = lerJson(conteudos[c._linha], {});
    (Array.isArray(dados.participantes) ? dados.participantes : []).forEach(function (p) {
      if (p && p.tipo === 'personagem' && p.personagemId) idsDePersonagem[String(p.personagemId)] = true;
    });
  });
  var recursos = recursosParaCombate(ctx, usuario, idsDePersonagem);

  var lista = visiveis
    .map(function (c) { return combateParaCliente(c, ctx, conteudos[c._linha], recursos); })
    .sort(function (a, b) { return String(b.atualizadoEm).localeCompare(String(a.atualizadoEm)); });

  return { ok: true, dados: lista };
}

/* Os recursos que a lista de combate pode mostrar, por personagem.

   A mesma regra dos cartões da aba Personagens: o mestre vê todos; o
   jogador vê os do próprio personagem sempre e os dos outros só com
   "Esconder status dos jogadores" desligada. Personagem ausente do mapa
   quer dizer "não mostrar" — e o que não pode ser mostrado não entra na
   resposta. Criatura nunca passa por aqui: o snapshot é só do mestre. */
function recursosParaCombate(ctx, usuario, ids) {
  var saida = {};
  if (!Object.keys(ids).length) return saida;

  var ocultar = !!lerJson(ctx.campanha.dadosJson, {}).ocultarStatusJogadores;

  var linhas = lerLeves(ABAS.PERSONAGENS).filter(function (p) {
    return ids[String(p.id)] && String(p.campanhaId) === String(ctx.campanha.id);
  });

  var permitidas = linhas.filter(function (p) {
    return ctx.mestre || meu(p, usuario) || !ocultar;
  });

  /* Pela projeção, como o painel da mesa (v2.16): o combate mostra os
     mesmos números e não precisa da ficha para isso. */
  var painel = projecoesDosPersonagens(permitidas);

  permitidas.forEach(function (p) {
    /* Ficha que não se montou fica sem recursos na lista — ausente do
       mapa quer dizer "não mostrar", e nenhum número é inventado. */
    var proj = painel.porId[p.id];
    if (!proj) return;
    var lista;
    if (projecaoDeOrdem(proj)) {
      lista = recursosResumidos(proj);
      var condicoes = resumoPublicoDeCondicoes(proj.ordem);
      if (!lista) { saida[String(p.id)] = { pendente: true, lista: [], condicoes: condicoes }; return; }
      saida[String(p.id)] = { pendente: false, lista: lista, condicoes: condicoes };
      return;
    } else {
      lista = (Array.isArray(proj.status) ? proj.status : [])
        .map(function (s) {
          return { chave: String(s.id), rotulo: String(s.nome || ''), atual: Number(s.atual) || 0, maximo: Number(s.maximo) || 0 };
        });
    }
    saida[String(p.id)] = { pendente: false, lista: lista };
  });

  return saida;
}

/* O que o mestre vê e o que o jogador vê são respostas DIFERENTES,
   montadas aqui. O jogador autorizado recebe a lista, a ordem e o turno
   — que é o que ele precisa para jogar — e não a ficha interna das
   criaturas. Ver a lista não é ver os pontos de vida do monstro. */
function combateParaCliente(c, ctx, jsonPronto, recursos) {
  var dados = lerJson(jsonPronto === undefined ? c.dadosJson : jsonPronto, {});
  var participantes = Array.isArray(dados.participantes) ? dados.participantes : [];
  /* Nome é dado atual da ficha; o combate preserva o ID e a iniciativa.
     O histórico de rolagens continua com o retrato do momento da ação. */
  var nomesAtuais = personagensDaMesaPorId(ctx);
  participantes = participantes.map(function (p) {
    return p.tipo === 'personagem' && nomesAtuais[p.personagemId]
      ? Object.assign({}, p, { nome: nomesAtuais[p.personagemId] }) : p;
  });
  var estado = estadoDeCombate(c.estado);
  var porPersonagem = recursos || null;

  var turno = turnoNormalizado(dados.turno, participantes, estado);
  var config = configDoCombate(dados.config);
  var saida = {
    id: c.id,
    nome: c.nome,
    estado: estado,
    criadoEm: c.criadoEm,
    atualizadoEm: c.atualizadoEm,
    rev: Number(c.rev) || 0,
    turno: turno,
    config: config,
  };
  /* Manifesto presente e blocos que não conferem (v2.28): o combate sai
     vazio e marcado, e nenhuma gravação passa por cima dele. */
  if (jsonPronto === null) saida.ilegivel = true;

  function comRecursos(p, objeto) {
    if (!porPersonagem || p.tipo !== 'personagem') return objeto;
    var r = porPersonagem[String(p.personagemId)];
    if (r) {
      objeto.recursos = r.lista;
      if (r.pendente) objeto.recursosPendentes = true;
      if (r.condicoes && r.condicoes.length) objeto.condicoes = r.condicoes;
    }
    return objeto;
  }

  if (ctx.mestre) {
    saida.participantes = participantes.map(function (p) { return comRecursos(p, Object.assign({}, p)); });
    saida.visiveis = lerJson(c.visiveisJson, []) || [];
    return saida;
  }

  saida.participantes = participantes.map(function (p) {
    var objeto = comRecursos(p, {
      id: p.id,
      tipo: p.tipo,
      nome: p.nome,
      ordem: Number(p.ordem) || 0,
      personagemId: p.tipo === 'personagem' ? p.personagemId : null,
    });
    /* A vida da criatura só vai ao jogador se o mestre ligou "Mostrar
       vida das criaturas aos jogadores" — e vai só o par atual/máximo.
       Desligada (o padrão), nenhum número sai daqui. */
    if (p.tipo === 'criatura' && config.mostrarVidaCriaturas) {
      var vida = vidaDaCriatura(p);
      if (vida) objeto.vida = vida;
    }
    return objeto;
  });

  /* Quem tem o turno, para o painel do jogador mostrar a imagem: id,
     tipo e nome — a imagem vem de ler_imagem_do_turno, sob demanda. */
  if (estado === 'ativo' && turno.ativoId) {
    var ativo = participantes.filter(function (p) { return String(p.id) === String(turno.ativoId); })[0];
    if (ativo) saida.ativo = { participanteId: ativo.id, tipo: ativo.tipo, nome: ativo.nome || '' };
  }

  return saida;
}

function configDoCombate(bruto) {
  var b = bruto && typeof bruto === 'object' ? bruto : {};
  return { mostrarVidaCriaturas: b.mostrarVidaCriaturas === true };
}

/* A vida de uma criatura, pelo snapshot DAQUELA ocorrência: o status de
   id "vida", ou o primeiro que se chama vida/PV. */
function vidaDaCriatura(p) {
  var lista = p && p.snapshot && Array.isArray(p.snapshot.status) ? p.snapshot.status : [];
  var s = lista.filter(function (x) { return x && String(x.id) === 'vida'; })[0] ||
    lista.filter(function (x) { return x && /^(vida|pv|pontos de vida)$/i.test(String(x.nome || '').trim()); })[0];
  if (!s) return null;
  return { atual: Math.round(Number(s.atual)) || 0, maximo: Math.max(0, Math.round(Number(s.maximo)) || 0) };
}

/* =====================================================================
   ler_imagem_do_turno — a imagem de quem está com o turno
   ---------------------------------------------------------------------
   Para o painel do jogador no combate: só a imagem do participante
   ATIVO, só de um combate que a pessoa pode ver. Personagem: a foto
   dele. Criatura: a imagem do modelo de que a ocorrência saiu. Nada da
   ficha da criatura ou do personagem vem junto.
   ===================================================================== */

function acaoLerImagemDoTurno(corpo, usuario) {
  var ctx = contextoDaCampanha(corpo.campanhaId, usuario);
  if (!ctx.ok) return ctx;
  var registro = acharPor(ABAS.CAMPANHA_COMBATES, 'id', corpo.combateId);
  if (!registro || String(registro.campanhaId) !== String(ctx.campanha.id)) return { ok: false, erro: 'nao_encontrado' };
  if (!podeVerCombate(registro, ctx, usuario)) return { ok: false, erro: 'nao_encontrado' };

  var dados = lerJson(textoDoCombate(registro), {});
  var participantes = Array.isArray(dados.participantes) ? dados.participantes : [];
  var estado = estadoDeCombate(registro.estado);
  var turno = turnoNormalizado(dados.turno, participantes, estado);
  if (estado !== 'ativo' || !turno.ativoId) return { ok: true, dados: { participanteId: null } };
  var p = participantes.filter(function (x) { return String(x.id) === String(turno.ativoId); })[0];
  if (!p) return { ok: true, dados: { participanteId: null } };

  var imagem = '';
  if (p.tipo === 'personagem' && p.personagemId) {
    var foto = acharPor(ABAS.PERSONAGENS_FOTOS, 'personagemId', p.personagemId);
    imagem = imagemDe(foto, 'imagem');
  } else if (p.tipo === 'criatura' && p.origemId) {
    var img = acharPor(ABAS.CRIATURAS_IMAGENS, 'criaturaId', p.origemId);
    imagem = imagemDe(img, 'imagem');
  }
  /* Criatura do catálogo (ou cópia dela) sem imagem enviada: só o id do
     catálogo sai, e o site monta o caminho do retrato (v2.28). Nada da
     ficha vai junto. */
  var retratoCatalogo = '';
  if (p.tipo === 'criatura' && !imagem) {
    var origem = p.snapshot && p.snapshot.origem && typeof p.snapshot.origem === 'object' ? p.snapshot.origem : {};
    var candidato = String(origem.catalogoId || origem.copiadoDe || p.origemId || '');
    if (/^(op|sah|as1|as2|as3|as4)\.criatura\.[a-z0-9.-]+$/.test(candidato)) retratoCatalogo = candidato;
  }
  var nomeAtual = p.tipo === 'personagem' ? personagensDaMesaPorId(ctx)[p.personagemId] : null;
  var dadosDoTurno = { participanteId: p.id, tipo: p.tipo, nome: nomeAtual || p.nome || '', imagem: String(imagem) };
  if (retratoCatalogo) dadosDoTurno.retratoCatalogo = retratoCatalogo;
  return { ok: true, dados: dadosDoTurno };
}

/* =====================================================================
   TURNOS E RODADAS
   ---------------------------------------------------------------------
   A ordem é a de iniciativa DIGITADA: do maior para o menor, e quem
   empata mantém a posição em que entrou na lista (ordenação estável). O
   turno é de um participante, guardado pelo ID — nunca pela posição.
   Por isso mudar uma iniciativa no meio da rodada muda a ordem, mas não
   passa a vez de ninguém.

   As mesmas regras moram em js/combate-turnos.js, para a tela mostrar a
   próxima vez sem esperar o servidor. Os testes conferem que as duas
   implementações dão o mesmo resultado nos mesmos casos.

     iniciar            rodada 1, turno do primeiro da ordem (ou de
                        ninguém, num combate sem participantes)
     próximo turno      o seguinte na ordem; depois do último, volta ao
                        primeiro e a rodada sobe 1
     voltar turno       o anterior; do primeiro, vai ao último da rodada
                        anterior. Na rodada 1, com o primeiro da ordem,
                        não há para onde voltar e nada muda
     um participante    próximo e voltar só mudam a rodada
     acrescentar        entra na ordem pela iniciativa; o turno continua
                        com quem estava. Se ninguém tinha o turno (combate
                        vazio), ele vai para o primeiro da ordem
     remover o da vez   o turno passa para quem vinha depois dele; se ele
                        era o último, para o primeiro, e a rodada sobe
     reordenar          muda quem vem depois; o turno atual não muda
     encerrar           a rodada fica registrada e ninguém tem o turno
     combate antigo     em andamento e sem turno guardado: rodada 1, turno
                        do primeiro da ordem. Não há histórico anterior a
                        reconstruir, e nada é inventado
   ===================================================================== */

function ordemDeIniciativa(participantes) {
  return (Array.isArray(participantes) ? participantes : [])
    .map(function (p, i) { return { p: p, i: i }; })
    .sort(function (a, b) {
      return ((Number(b.p.ordem) || 0) - (Number(a.p.ordem) || 0)) || (a.i - b.i);
    })
    .map(function (x) { return x.p; });
}

function indiceNaOrdem(lista, id) {
  if (!id) return -1;
  for (var i = 0; i < lista.length; i++) {
    if (String(lista[i].id) === String(id)) return i;
  }
  return -1;
}

function turnoNormalizado(turno, participantes, estado) {
  var lista = ordemDeIniciativa(participantes);
  var t = (turno && typeof turno === 'object') ? turno : {};
  var rodada = Math.round(Number(t.rodada));
  var ativoId = t.ativoId ? String(t.ativoId) : null;

  if (estado === 'preparando') return { rodada: 0, ativoId: null };
  if (estado === 'encerrado') return { rodada: rodada > 0 ? rodada : 0, ativoId: null };

  return {
    rodada: rodada >= 1 ? rodada : 1,
    ativoId: indiceNaOrdem(lista, ativoId) >= 0 ? ativoId : (lista.length ? String(lista[0].id) : null),
  };
}

function turnoSeguinte(turno, participantes) {
  var lista = ordemDeIniciativa(participantes);
  if (!lista.length) return { rodada: turno.rodada, ativoId: null, mudou: false };
  var i = indiceNaOrdem(lista, turno.ativoId);
  if (i < 0) return { rodada: turno.rodada, ativoId: String(lista[0].id), mudou: true };
  if (i + 1 < lista.length) return { rodada: turno.rodada, ativoId: String(lista[i + 1].id), mudou: true };
  return { rodada: turno.rodada + 1, ativoId: String(lista[0].id), mudou: true };
}

function turnoAnterior(turno, participantes) {
  var lista = ordemDeIniciativa(participantes);
  if (!lista.length) return { rodada: turno.rodada, ativoId: null, mudou: false };
  var i = indiceNaOrdem(lista, turno.ativoId);
  if (i < 0) return { rodada: turno.rodada, ativoId: String(lista[0].id), mudou: true };
  if (i > 0) return { rodada: turno.rodada, ativoId: String(lista[i - 1].id), mudou: true };
  if (turno.rodada <= 1) return { rodada: turno.rodada, ativoId: turno.ativoId, mudou: false, inicio: true };
  return { rodada: turno.rodada - 1, ativoId: String(lista[lista.length - 1].id), mudou: true };
}

/* O turno depois de tirar um participante (antes de ele sair da lista). */
function turnoSemParticipante(turno, participantes, removidoId) {
  if (!turno || String(turno.ativoId) !== String(removidoId)) return turno;
  var lista = ordemDeIniciativa(participantes);
  var i = indiceNaOrdem(lista, removidoId);
  var restantes = lista.filter(function (p) { return String(p.id) !== String(removidoId); });
  if (!restantes.length) return { rodada: turno.rodada, ativoId: null };
  if (i < 0) return { rodada: turno.rodada, ativoId: String(restantes[0].id) };
  if (i + 1 < lista.length) return { rodada: turno.rodada, ativoId: String(lista[i + 1].id) };
  return { rodada: turno.rodada + 1, ativoId: String(restantes[0].id) };
}

/* =====================================================================
   CONDIÇÕES E TURNOS (v2.19)
   ---------------------------------------------------------------------
   Morrendo e enlouquecendo contam os INÍCIOS DE TURNO do personagem na
   cena (Ordem Paranormal RPG, p. 88). Com o combate da campanha, quem
   conta é o servidor, aqui, no mesmo lote que muda o turno — e só ele:

     · um evento por início de turno, com id `cb:<combate>:<rodada>:<participante>`.
       O mesmo turno é o mesmo evento: mestre e jogador, duas abas, uma
       recarga ou uma resposta repetida não contam duas vezes;
     · conta só o início do turno DO PERSONAGEM — não o turno de outro
       participante, nem a rodada;
     · "voltar turno" retira o evento do turno desfeito, e só ele;
       correções feitas à mão depois ficam onde estão;
     · encerrar o combate não zera nada: cena e combate são coisas
       diferentes, e a cena nova é decisão de quem joga.

   Espelho de js/ordem/condicoes.js (registrarInicioDeTurno e
   retirarInicioDeTurno): os testes rodam os mesmos casos nas duas.
   ===================================================================== */

var CONDICOES_CONTADAS = ['morrendo', 'enlouquecendo'];
var LIMITE_DAS_CONDICOES = { morrendo: 3, enlouquecendo: 3 };
var NOMES_DAS_CONDICOES = { morrendo: 'Morrendo', enlouquecendo: 'Enlouquecendo' };
var MAX_EVENTOS_DE_CONDICAO = 60;
var MAX_EVENTOS_DE_EFEITO = 120;
var ID_DE_EVENTO = /^[A-Za-z0-9_.:|#-]{1,160}$/;

/* Os nomes das condições do livro (js/ordem/efeitos.js, CONDICOES): só o
   que o servidor precisa para o resumo público e para conferir o modelo
   de uma aplicação. Os efeitos de cada uma são do navegador. */
var CONDICOES_DO_LIVRO = {
  abalado: 'Abalado', agarrado: 'Agarrado', alquebrado: 'Alquebrado', apavorado: 'Apavorado',
  asfixiado: 'Asfixiado', atordoado: 'Atordoado', caido: 'Caído', cego: 'Cego', confuso: 'Confuso',
  debilitado: 'Debilitado', desprevenido: 'Desprevenido', doente: 'Doente', emChamas: 'Em chamas',
  enjoado: 'Enjoado', enredado: 'Enredado', envenenado: 'Envenenado', esmorecido: 'Esmorecido',
  exausto: 'Exausto', fascinado: 'Fascinado', fatigado: 'Fatigado', fraco: 'Fraco', frustrado: 'Frustrado',
  imovel: 'Imóvel', inconsciente: 'Inconsciente', indefeso: 'Indefeso', lento: 'Lento', machucado: 'Machucado',
  morrendo: 'Morrendo', enlouquecendo: 'Enlouquecendo', perturbado: 'Perturbado', ofuscado: 'Ofuscado',
  paralisado: 'Paralisado', pasmo: 'Pasmo', petrificado: 'Petrificado', sangrando: 'Sangrando', surdo: 'Surdo',
  surpreendido: 'Surpreendido', vulneravel: 'Vulnerável',
};

function rastreadorDeCondicao(cond, chave) {
  if (!cond || typeof cond !== 'object') return null;
  if (CONDICOES_CONTADAS.indexOf(chave) < 0) return null;
  var r = cond[chave];
  if (!r || typeof r !== 'object') return null;
  if (!Array.isArray(r.eventos)) r.eventos = [];
  if (!Array.isArray(r.descartados)) r.descartados = [];
  return r;
}

function cenaDaCondicao(cond) {
  return cond && cond.cena && typeof cond.cena === 'object' && typeof cond.cena.id === 'string' ? cond.cena.id : '';
}

function contagemDaCondicao(cond, r) {
  var cena = cenaDaCondicao(cond);
  return r.eventos.filter(function (e) { return e && String(e.cena || '') === cena; }).length;
}

function idDoInicioDeTurno(combateId, rodada, participanteId) {
  var id = 'cb:' + String(combateId).slice(0, 60) + ':' + Math.round(Number(rodada)) + ':' + String(participanteId).slice(0, 60);
  return ID_DE_EVENTO.test(id) ? id : '';
}

function idDoFimDeTurno(combateId, rodada, participanteId) {
  var id = 'cf:' + String(combateId).slice(0, 60) + ':' + Math.round(Number(rodada)) + ':' + String(participanteId).slice(0, 60);
  return ID_DE_EVENTO.test(id) ? id : '';
}

/* Devolve as chaves que contaram. */
function registrarInicioNaFicha(ficha, evento) {
  var cond = ficha && ficha.ordem ? ficha.ordem.condicoes : null;
  if (!cond || typeof cond !== 'object' || cond.integrarCombate === false) return [];
  if (!evento || !ID_DE_EVENTO.test(String(evento.id || ''))) return [];
  var cena = cenaDaCondicao(cond);
  var contou = [];
  CONDICOES_CONTADAS.forEach(function (chave) {
    var r = rastreadorDeCondicao(cond, chave);
    if (!r || r.ativa !== true) return;
    if (r.eventos.some(function (e) { return e && e.id === evento.id; })) return;
    if (r.descartados.indexOf(evento.id) >= 0) return;
    if (contagemDaCondicao(cond, r) >= LIMITE_DAS_CONDICOES[chave]) return;
    r.eventos.push({ id: evento.id, origem: 'combate', cena: cena, em: evento.em, rodada: evento.rodada, combate: evento.combate });
    if (r.eventos.length > MAX_EVENTOS_DE_CONDICAO) r.eventos = r.eventos.slice(r.eventos.length - MAX_EVENTOS_DE_CONDICAO);
    contou.push(chave);
  });
  return contou;
}

function retirarInicioDaFicha(ficha, id) {
  var cond = ficha && ficha.ordem ? ficha.ordem.condicoes : null;
  if (!cond || typeof cond !== 'object' || !ID_DE_EVENTO.test(String(id || ''))) return [];
  var tirou = [];
  CONDICOES_CONTADAS.forEach(function (chave) {
    var r = rastreadorDeCondicao(cond, chave);
    if (!r) return;
    var antes = r.eventos.length;
    r.eventos = r.eventos.filter(function (e) { return !(e && e.id === id && e.origem === 'combate'); });
    if (r.eventos.length !== antes) tirou.push(chave);
  });
  return tirou;
}

/* ---------------------------------------------------------------------
   A duração dos efeitos aplicados (v2.20) — espelho de
   js/ordem/efeitos.js (contaNoTurno, registrarTurno, retirarTurno).
   evento = { id, tipo: 'inicio' | 'fim', participanteId, desde }; `meu`
   é o participante desta ficha no combate. Um efeito por turnos conta o
   turno de quem ele conta (o afetado, ou o participante escolhido), no
   momento escolhido; o fim de um turno que começou ANTES da aplicação
   não conta — aplicar durante um turno não gasta aquele turno.
   --------------------------------------------------------------------- */

function listaDeEfeitos(cond) {
  return cond && typeof cond === 'object' && Array.isArray(cond.efeitos) ? cond.efeitos : [];
}

function efeitoValendo(inst) {
  if (!inst || typeof inst !== 'object' || inst.encerrado) return false;
  var d = inst.duracao && typeof inst.duracao === 'object' ? inst.duracao : {};
  if (d.tipo === 'turnos') {
    var n = Array.isArray(inst.eventos) ? inst.eventos.length : 0;
    return n < (Math.round(Number(d.turnos)) || 1);
  }
  return true;
}

function efeitoContaNoTurno(inst, ev, meu) {
  if (!efeitoValendo(inst)) return false;
  var d = inst.duracao;
  if (!d || d.tipo !== 'turnos') return false;
  if ((ev.tipo === 'fim') !== (d.momento === 'fim')) return false;
  var dono = d.contador === 'participante' ? (d.participante && d.participante.id) : meu;
  if (!dono || String(dono) !== String(ev.participanteId)) return false;
  var eventos = Array.isArray(inst.eventos) ? inst.eventos : [];
  var descartados = Array.isArray(inst.descartados) ? inst.descartados : [];
  if (eventos.some(function (e) { return e && e.id === ev.id; })) return false;
  if (descartados.indexOf(ev.id) >= 0) return false;
  if (ev.tipo === 'fim' && ev.desde && inst.aplicadoEm && String(inst.aplicadoEm) > String(ev.desde)) return false;
  return true;
}

function registrarTurnoNosEfeitos(cond, ev, meu) {
  if (!cond || typeof cond !== 'object' || cond.integrarCombate === false) return [];
  if (!ev || !ID_DE_EVENTO.test(String(ev.id || ''))) return [];
  var contou = [];
  listaDeEfeitos(cond).forEach(function (inst) {
    if (!efeitoContaNoTurno(inst, ev, meu)) return;
    if (!Array.isArray(inst.eventos)) inst.eventos = [];
    inst.eventos.push({ id: ev.id, origem: 'combate', em: ev.em || new Date().toISOString() });
    if (inst.eventos.length > MAX_EVENTOS_DE_EFEITO) inst.eventos = inst.eventos.slice(inst.eventos.length - MAX_EVENTOS_DE_EFEITO);
    contou.push(inst.id);
  });
  return contou;
}

function retirarTurnoDosEfeitos(cond, id) {
  if (!ID_DE_EVENTO.test(String(id || ''))) return [];
  var tirou = [];
  listaDeEfeitos(cond).forEach(function (inst) {
    if (!inst || !Array.isArray(inst.eventos)) return;
    var antes = inst.eventos.length;
    inst.eventos = inst.eventos.filter(function (e) { return !(e && e.id === id && e.origem === 'combate'); });
    if (inst.eventos.length !== antes) tirou.push(inst.id);
  });
  return tirou;
}

/* Há o que fazer nesta ficha com estes eventos? Pergunta feita à
   projeção do painel, sem abrir a ficha: só quem tem uma condição ativa,
   um efeito que conta aquele turno ou o evento a retirar é lido e
   regravado. */
function condicoesPedemLeitura(cond, eventos, meu) {
  if (!cond || typeof cond !== 'object' || cond.integrarCombate === false) return false;
  var copia = JSON.parse(JSON.stringify(cond));
  return eventos.some(function (ev) {
    if (ev.retirada) {
      var noRastreador = CONDICOES_CONTADAS.some(function (chave) {
        var r = rastreadorDeCondicao(copia, chave);
        return !!r && r.eventos.some(function (e) { return e && e.id === ev.id; });
      });
      return noRastreador || listaDeEfeitos(copia).some(function (inst) {
        return inst && Array.isArray(inst.eventos) && inst.eventos.some(function (e) { return e && e.id === ev.id; });
      });
    }
    if (ev.tipo === 'inicio' && meu && String(ev.participanteId) === String(meu)) {
      var ativa = CONDICOES_CONTADAS.some(function (chave) {
        var r = rastreadorDeCondicao(copia, chave);
        return !!r && r.ativa === true;
      });
      if (ativa) return true;
    }
    return listaDeEfeitos(copia).some(function (inst) { return efeitoContaNoTurno(inst, ev, meu); });
  });
}

/* O que outro jogador pode ver das condições — só com o status visível:
   as ativas e as que já contaram nesta cena; das aplicadas, os nomes das
   condições do livro, e os outros efeitos só contados (o texto que o
   mestre escreveu é do dono da ficha). Espelho de
   RAMAOrdemCondicoes.resumoPublico. */
function resumoPublicoDeCondicoes(ordem) {
  var cond = ordem && ordem.condicoes && typeof ordem.condicoes === 'object' ? JSON.parse(JSON.stringify(ordem.condicoes)) : null;
  if (!cond) return [];
  var saida = [];
  CONDICOES_CONTADAS.forEach(function (chave) {
    var r = rastreadorDeCondicao(cond, chave);
    if (!r) return;
    var n = contagemDaCondicao(cond, r);
    if (r.ativa !== true && !n) return;
    saida.push({
      chave: chave, nome: NOMES_DAS_CONDICOES[chave], oficial: true,
      ativa: r.ativa === true, contagem: n, limite: LIMITE_DAS_CONDICOES[chave],
    });
  });
  ['inconsciente', 'perturbado'].forEach(function (chave) {
    if (cond[chave] && cond[chave].ativa === true) {
      saida.push({ chave: chave, nome: chave === 'inconsciente' ? 'Inconsciente' : 'Perturbado', oficial: true, ativa: true, contagem: 0, limite: null });
    }
  });
  var outros = 0;
  listaDeEfeitos(cond).forEach(function (inst) {
    if (!efeitoValendo(inst) || !inst.nome) return;
    var m = /^cond:(.+)$/.exec(String(inst.modelo || ''));
    if (inst.tipo === 'condicao' && m && CONDICOES_DO_LIVRO[m[1]]) {
      var nome = CONDICOES_DO_LIVRO[m[1]];
      if (!saida.some(function (x) { return x.nome === nome; })) {
        saida.push({ chave: 'efeito', nome: nome, oficial: true, ativa: true, contagem: 0, limite: null });
      }
    } else {
      outros++;
    }
  });
  if (outros) saida.push({ chave: 'outros', nome: outros === 1 ? '1 efeito' : outros + ' efeitos', oficial: false, ativa: true, contagem: 0, limite: null });
  return saida;
}

/* ---------------------------------------------------------------------
   Uma aplicação que chega pela rede (efeito_personagem), limpa. É a
   mesma forma de js/ordem/efeitos.js (normalizarInstancia): textos com
   tamanho máximo, modificadores de uma lista fechada, números com
   limite. Nada é interpretado — texto é texto.
   --------------------------------------------------------------------- */

var ALVOS_DE_EFEITO = ['testes', 'pericias', 'ataques', 'ataques:corpo', 'ataques:distancia', 'defesa', 'defesa:corpo',
  'defesa:distancia', 'dano', 'dano:corpo', 'dano:distancia', 'deslocamento', 'custoPe', 'resistenciaDano',
  'atributo:agi', 'atributo:for', 'atributo:int', 'atributo:pre', 'atributo:vig'];
var ORIGENS_DE_EFEITO = ['ritual', 'criatura', 'habilidade', 'item', 'aliado', 'condicao', 'manual'];

function textoLimpo(v, limite) {
  return String(v === undefined || v === null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, limite);
}

function carimboValido(v) {
  if (typeof v !== 'string' || !v) return '';
  var d = new Date(v);
  return isNaN(d.getTime()) ? '' : v.slice(0, 40);
}

function modificadorRecebido(m) {
  if (!m || typeof m !== 'object') return null;
  var alvo = String(m.alvo || '');
  if (ALVOS_DE_EFEITO.indexOf(alvo) < 0 && !/^pericia:[a-z]{2,30}$/.test(alvo)) return null;
  var tipo = String(m.tipo || '');
  if (alvo === 'deslocamento') {
    if (tipo !== 'deslocamento') return null;
    var op = ['soma', 'metade', 'zero', 'fixo'].indexOf(m.operacao) >= 0 ? m.operacao : 'soma';
    var v = Math.round(Number(m.valor) * 10) / 10;
    if (!isFinite(v)) v = 0;
    return { alvo: alvo, tipo: tipo, operacao: op, valor: (op === 'metade' || op === 'zero') ? 0 : Math.max(-99, Math.min(99, v)) };
  }
  if (tipo !== 'bonus' && tipo !== 'dados') return null;
  if (tipo === 'dados' && /^(defesa|dano|custoPe|resistenciaDano)/.test(alvo)) return null;
  var n = Math.round(Number(m.valor));
  if (!isFinite(n) || !n) return null;
  n = Math.max(-99, Math.min(99, n));
  if (tipo === 'dados') n = Math.max(-10, Math.min(10, n));
  return { alvo: alvo, tipo: tipo, valor: n };
}

function efeitoRecebido(b, usuario, papel) {
  if (!b || typeof b !== 'object') return null;
  var id = String(b.id || '');
  if (!/^[A-Za-z0-9_.:|#-]{1,160}$/.test(id)) return null;
  var nome = textoLimpo(b.nome, 80).trim();
  if (!nome) return null;
  var modelo = String(b.modelo || '');
  if (modelo && !/^(cond|ritual):[A-Za-z0-9_.-]{1,70}$/.test(modelo)) modelo = '';
  var cm = /^cond:(.+)$/.exec(modelo);
  if (cm && !CONDICOES_DO_LIVRO[cm[1]]) modelo = '';
  /* As condições com contador próprio vão pela operação `rastreador`:
     nunca viram uma segunda contagem em paralelo. */
  if (cm && ['morrendo', 'enlouquecendo', 'inconsciente', 'perturbado'].indexOf(cm[1]) >= 0) return null;
  var d = b.duracao && typeof b.duracao === 'object' ? b.duracao : {};
  var tipoDur = ['cena', 'turnos', 'ateRemover', 'especial'].indexOf(d.tipo) >= 0 ? d.tipo : 'cena';
  var duracao = { tipo: tipoDur };
  if (tipoDur === 'turnos') {
    duracao.turnos = Math.max(1, Math.min(99, Math.round(Number(d.turnos)) || 1));
    duracao.contador = d.contador === 'participante' ? 'participante' : 'alvo';
    duracao.momento = d.momento === 'fim' ? 'fim' : 'inicio';
    if (duracao.contador === 'participante') {
      var pp = d.participante && typeof d.participante === 'object' ? d.participante : {};
      var pid = String(pp.id || '');
      if (/^[A-Za-z0-9_.:|#-]{1,160}$/.test(pid)) {
        duracao.participante = { id: pid, nome: textoLimpo(pp.nome, 80), combate: /^[A-Za-z0-9_.:|#-]{1,160}$/.test(String(pp.combate || '')) ? String(pp.combate) : '' };
      } else {
        duracao.contador = 'alvo';
      }
    }
  }
  if (tipoDur === 'especial') duracao.texto = textoLimpo(d.texto, 120);
  var origem = b.origem && typeof b.origem === 'object' ? b.origem : {};
  var inclui = (Array.isArray(b.inclui) ? b.inclui : []).map(String).filter(function (k) { return !!CONDICOES_DO_LIVRO[k]; }).slice(0, 6);
  return {
    id: id,
    modelo: modelo,
    tipo: b.tipo === 'condicao' && cm ? 'condicao' : 'efeito',
    nome: nome,
    descricao: textoLimpo(b.descricao, 1000),
    versao: textoLimpo(b.versao, 40),
    origem: { tipo: ORIGENS_DE_EFEITO.indexOf(origem.tipo) >= 0 ? origem.tipo : 'manual', nome: textoLimpo(origem.nome, 80) },
    alvo: { nome: textoLimpo(b.alvo && b.alvo.nome, 80) },
    modificadores: (Array.isArray(b.modificadores) ? b.modificadores : []).map(modificadorRecebido).filter(Boolean).slice(0, 16),
    inclui: inclui,
    restricoes: (Array.isArray(b.restricoes) ? b.restricoes : []).map(function (r) { return textoLimpo(r, 200).trim(); }).filter(Boolean).slice(0, 8),
    acumula: b.acumula === true,
    duracao: duracao,
    eventos: [],
    descartados: [],
    aplicadoEm: new Date().toISOString(),
    /* Quem aplicou vem da SESSÃO, não do pedido. */
    aplicadoPor: { id: String(usuario.id), nome: textoLimpo(usuario.nome || usuario.usuario, 80), papel: papel },
    cena: /^[A-Za-z0-9_.:|#-]{1,160}$/.test(String(b.cena || '')) ? String(b.cena) : '',
    combate: /^[A-Za-z0-9_.:|#-]{1,160}$/.test(String(b.combate || '')) ? String(b.combate) : '',
    personalizado: b.personalizado === true,
    encerrado: null,
  };
}

/* =====================================================================
   efeito_personagem — o mestre aplica, encerra ou liga uma condição
   ---------------------------------------------------------------------
   Sem abrir a ficha inteira na tela: um pedido pequeno, com a mesma
   conferência de acesso de toda gravação de ficha — o dono, ou o mestre
   da campanha em que o personagem está (e o pedido diz qual campanha).
   Um jogador pedindo por um personagem alheio recebe nao_encontrado,
   mesmo trocando o id no pedido.

     aplicar     { efeito, encerrar? }   uma aplicação nova; `encerrar`
                                         termina outra (repetição)
     renovar     { efeitoId, duracao }   reinicia a duração
     encerrar    { efeitoId }
     rastreador  { chave, encerrar? }    liga morrendo, enlouquecendo,
                                         inconsciente ou perturbado

   Com `operacaoId`, o mesmo pedido chegando de novo não aplica duas
   vezes; e uma aplicação com o id que já está na ficha também não.
   ===================================================================== */

function acaoEfeitoPersonagem(corpo, usuario) {
  var op = String(corpo.op || '');
  if (['aplicar', 'renovar', 'encerrar', 'rastreador'].indexOf(op) < 0) return { ok: false, erro: 'dados_invalidos' };
  var operacao = idDeOperacao(corpo.operacaoId);

  return comTrava(function () {
    var acesso = personagemAcessivel(corpo.personagemId, usuario);
    if (!acesso.ok) return acesso;
    var registro = acesso.personagem;
    if (corpo.campanhaId && String(registro.campanhaId || '') !== String(corpo.campanhaId)) {
      return { ok: false, erro: 'nao_encontrado' };
    }
    if (operacaoJaAplicada(registro, operacao)) return { ok: true, repetida: true, rev: Number(registro.rev) || 0 };

    var lido = lerFichaDoPersonagem(registro);
    if (!lido.ok) return lido;
    var ficha = comVinculoDaColuna(lido.ficha, registro);
    if (!ehFichaDeOrdem(ficha)) return { ok: false, erro: 'dados_invalidos' };
    if (!ficha.ordem.condicoes || typeof ficha.ordem.condicoes !== 'object') ficha.ordem.condicoes = {};
    var cond = ficha.ordem.condicoes;
    if (!Array.isArray(cond.efeitos)) cond.efeitos = [];
    var agora = new Date().toISOString();
    var papel = acesso.dono ? 'jogador' : 'mestre';
    var mudou = false;

    function encerrarPorId(id, motivo) {
      var inst = cond.efeitos.filter(function (x) { return x && x.id === id; })[0];
      if (!inst || inst.encerrado) return false;
      inst.encerrado = { em: agora, motivo: motivo, por: textoLimpo(usuario.nome || usuario.usuario, 80) };
      return true;
    }

    if (op === 'aplicar') {
      var efeito = efeitoRecebido(corpo.efeito, usuario, papel);
      if (!efeito) return { ok: false, erro: 'dados_invalidos' };
      var imunes = Array.isArray(cond.imunidades) ? cond.imunidades : [];
      var cm = /^cond:(.+)$/.exec(efeito.modelo);
      if (cm && imunes.indexOf(cm[1]) >= 0) return { ok: false, erro: 'dados_invalidos', motivo: 'imune' };
      if (!cond.efeitos.some(function (x) { return x && x.id === efeito.id; })) {
        cond.efeitos.push(efeito);
        mudou = true;
      }
      if (corpo.encerrar && encerrarPorId(String(corpo.encerrar), 'repeticao')) mudou = true;
      if (cond.efeitos.length > 80) {
        var sobra = cond.efeitos.length - 80;
        cond.efeitos = cond.efeitos.filter(function (x) {
          if (sobra > 0 && x && x.encerrado) { sobra--; return false; }
          return true;
        }).slice(-80);
      }
    } else if (op === 'renovar') {
      var alvo = cond.efeitos.filter(function (x) { return x && x.id === String(corpo.efeitoId || ''); })[0];
      if (!alvo) return { ok: false, erro: 'nao_encontrado' };
      var molde = efeitoRecebido({ id: alvo.id, nome: alvo.nome || 'Efeito', duracao: corpo.duracao }, usuario, papel);
      alvo.eventos = [];
      alvo.descartados = [];
      alvo.aplicadoEm = agora;
      alvo.encerrado = null;
      if (molde) alvo.duracao = molde.duracao;
      mudou = true;
    } else if (op === 'encerrar') {
      mudou = encerrarPorId(String(corpo.efeitoId || ''), 'manual');
    } else {
      var chave = String(corpo.chave || '');
      if (['morrendo', 'enlouquecendo', 'inconsciente', 'perturbado'].indexOf(chave) < 0) return { ok: false, erro: 'dados_invalidos' };
      if (!cond[chave] || typeof cond[chave] !== 'object') cond[chave] = { ativa: false, desde: '' };
      if (cond[chave].ativa !== true) { cond[chave].ativa = true; cond[chave].desde = agora; mudou = true; }
      if (chave === 'morrendo') {
        if (!cond.inconsciente || typeof cond.inconsciente !== 'object') cond.inconsciente = { ativa: false, desde: '' };
        if (cond.inconsciente.ativa !== true) { cond.inconsciente.ativa = true; cond.inconsciente.desde = agora; mudou = true; }
      }
      if (corpo.encerrar && encerrarPorId(String(corpo.encerrar), 'repeticao')) mudou = true;
    }

    if (!mudou) return { ok: true, rev: Number(registro.rev) || 0, dados: { mudou: false } };

    ficha.atualizadoEm = agora;
    registro.atualizadoEm = agora;
    registro.rev = (Number(registro.rev) || 0) + 1;
    var publicado = publicarFicha(registro, ficha, { operacao: operacao });
    if (!publicado.ok) return publicado;
    avisarMesas([registro.campanhaId], ['personagens', 'combates']);
    return { ok: true, rev: registro.rev, dados: { mudou: true } };
  });
}

/* Aplica os inícios e as retiradas de um lote de combate às fichas dos
   personagens. Cada ficha é gravada uma vez, com a revisão subindo como
   em qualquer gravação: quem estiver com ela aberta concilia na próxima
   gravação, evento a evento (js/sync.js). Uma ficha que não se monta não
   é tocada, e o mestre recebe o aviso para contar à mão. */
function aplicarTurnosAsFichas(ctx, combateId, eventos, participantesPorId, opId) {
  var avisos = [];
  if (!eventos.length) return avisos;
  var agora = new Date().toISOString();

  /* Os eventos do lote, com o id de cada um. */
  var evs = [];
  eventos.forEach(function (ev) {
    var pid = String(ev.participanteId);
    if (ev.tipo === 'retirada') { var r1 = idDoInicioDeTurno(combateId, ev.rodada, pid); if (r1) evs.push({ retirada: true, id: r1 }); return; }
    if (ev.tipo === 'retirada-fim') { var r2 = idDoFimDeTurno(combateId, ev.rodada, pid); if (r2) evs.push({ retirada: true, id: r2 }); return; }
    var id = ev.tipo === 'fim' ? idDoFimDeTurno(combateId, ev.rodada, pid) : idDoInicioDeTurno(combateId, ev.rodada, pid);
    if (!id) return;
    evs.push({ tipo: ev.tipo === 'fim' ? 'fim' : 'inicio', id: id, participanteId: pid, rodada: ev.rodada, desde: ev.desde || '', em: agora });
  });
  if (!evs.length) return avisos;

  /* Cada personagem do combate, com o participante que o representa: o
     turno de um participante pode contar na duração de um efeito de
     outro personagem ("até o fim do próximo turno de quem conjurou"). */
  var meuParticipante = {};
  Object.keys(participantesPorId).forEach(function (pid) {
    var p = participantesPorId[pid];
    if (p && p.tipo === 'personagem' && p.personagemId) meuParticipante[String(p.personagemId)] = String(pid);
  });

  Object.keys(meuParticipante).forEach(function (personagemId) {
    var meu = meuParticipante[personagemId];
    var registro = acharPor(ABAS.PERSONAGENS, 'id', personagemId);
    if (!registro || String(registro.campanhaId) !== String(ctx.campanha.id)) return;

    var proj = projecaoDoRegistro(registro);
    if (proj && (!projecaoDeOrdem(proj) || !condicoesPedemLeitura(proj.ordem.condicoes, evs, meu))) return;

    try {
      var lido = lerFichaDoPersonagem(registro);
      if (!lido.ok) { avisos.push({ aviso: 'condicao_nao_contada', personagemId: personagemId }); return; }
      var ficha = comVinculoDaColuna(lido.ficha, registro);
      if (!ehFichaDeOrdem(ficha)) return;
      var cond = ficha.ordem.condicoes;

      var mudou = false;
      evs.forEach(function (ev) {
        if (ev.retirada) {
          if (retirarInicioDaFicha(ficha, ev.id).length) mudou = true;
          if (retirarTurnoDosEfeitos(cond, ev.id).length) mudou = true;
          return;
        }
        if (ev.tipo === 'inicio' && ev.participanteId === meu) {
          if (registrarInicioNaFicha(ficha, { id: ev.id, rodada: ev.rodada, combate: String(combateId).slice(0, 60), em: agora }).length) mudou = true;
        }
        if (registrarTurnoNosEfeitos(cond, ev, meu).length) mudou = true;
      });
      if (!mudou) return;

      ficha.atualizadoEm = agora;
      registro.atualizadoEm = agora;
      registro.rev = (Number(registro.rev) || 0) + 1;
      var publicado = publicarFicha(registro, ficha, { operacao: idDeOperacao(('turno-' + opId).slice(0, 80)) });
      if (!publicado.ok) { avisos.push({ aviso: 'condicao_nao_contada', personagemId: personagemId }); return; }
      marcarMesa(ctx.campanha.id, ['personagens']);
    } catch (erro) {
      console.warn('R.A.M.A.: condição de ' + personagemId + ' não contada: ' + erro);
      avisos.push({ aviso: 'condicao_nao_contada', personagemId: personagemId });
    }
  });
  return avisos;
}

/* =====================================================================
   O COMBATE EM BLOCOS (v2.28)
   ---------------------------------------------------------------------
   Uma criatura de Ordem completa ocupa alguns KB, e um combate com
   vários chefes passa do limite seguro de uma célula. Quando isso
   acontece, o combate vai para CAMPANHA_COMBATES_BLOCOS pelas MESMAS
   funções dos blocos de ficha (Dados.gs): geração, SHA-256, conferência
   antes de publicar, leitura com pista de linha. A coluna `armazenamento`
   guarda o manifesto; vazia, o combate está inteiro em `dadosJson`, como
   sempre esteve — nenhum combate antigo é convertido.

   Duas gerações ficam vivas: a que vale e a anterior (para quem começou
   a ler antes da troca). A gravação seguinte escreve por cima da faixa
   de DUAS gerações atrás, conferida linha a linha, e a aba não cresce.
   ===================================================================== */

var LIMITE_TOTAL_COMBATE = 900000;

/* O texto do combate, venha de onde vier. null = há manifesto e os
   blocos não conferem: quem chamou não pode gravar por cima. */
function textoDoCombate(registro) {
  var m = manifestoDe(registro.armazenamento);
  if (m === null) return registro.dadosJson;
  if (m.invalido) return null;
  var id = String(registro.id);
  var lido = lerGeracoes(ABAS.CAMPANHA_COMBATES_BLOCOS, [{ id: id, manifesto: m }])[id];
  return lido && lido.ok ? lido.texto : null;
}

/* Os textos de vários combates (a lista), com UMA leitura de blocos. */
function textosDosCombates(registros, conteudos, manifestos) {
  var saida = {};
  var pedidos = [];
  registros.forEach(function (c) {
    var m = manifestoDe(manifestos[c._linha]);
    if (m === null) { saida[c._linha] = conteudos[c._linha]; return; }
    if (m.invalido) { saida[c._linha] = null; return; }
    pedidos.push({ id: String(c.id), manifesto: m, linha: c._linha });
  });
  if (pedidos.length) {
    var lidos = {};
    try {
      lidos = lerGeracoes(ABAS.CAMPANHA_COMBATES_BLOCOS, pedidos.map(function (p) { return { id: p.id, manifesto: p.manifesto }; }));
    } catch (erro) {
      lidos = {};
    }
    pedidos.forEach(function (p) {
      var l = lidos[p.id];
      saida[p.linha] = l && l.ok ? l.texto : null;
    });
  }
  return saida;
}

/* Põe o texto no registro — na célula, se couber; em blocos, se não —
   ANTES de a linha ser gravada, e devolve o que limpar depois. Dentro da
   trava. */
function prepararTextoDoCombate(registro, json) {
  if (json.length > LIMITE_TOTAL_COMBATE) return { ok: false, erro: 'dados_grandes' };
  var anterior = manifestoDe(registro.armazenamento);
  /* Um manifesto que esta versão não entende não é sobrescrito. */
  if (anterior && anterior.invalido) return { ok: false, erro: 'armazenamento_falhou', etapa: 'manifesto' };

  if (json.length <= MAX_CELULA) {
    registro.dadosJson = json;
    registro.armazenamento = '';
    return { ok: true, limpar: anterior ? { tudo: true } : null };
  }

  var def = ABAS.CAMPANHA_COMBATES_BLOCOS;
  try {
    aba(def);
  } catch (erro) {
    return { ok: false, erro: 'instalacao_incompleta', detalhe: 'CAMPANHA_COMBATES_BLOCOS' };
  }

  var reutilizavel = anterior ? anterior.reutilizavel : null;
  var reaproveitar = null;
  if (reutilizavel && reutilizavel.local && String(reutilizavel.geracao) !== String(anterior.geracao) &&
      !faixasSeCruzam(reutilizavel.local, anterior.local)) {
    var faixa = null;
    try {
      faixa = conferirFaixaDaGeracao(def, registro.id, reutilizavel.geracao, reutilizavel.local);
    } catch (erro) {
      faixa = null;
    }
    if (faixa) reaproveitar = { linha: Number(reutilizavel.local.linha), blocos: Number(reutilizavel.local.blocos) };
  }

  var gravado;
  try {
    gravado = gravarGeracao(def, registro.id, json, reaproveitar);
  } catch (erro) {
    console.error('R.A.M.A.: blocos do combate ' + registro.id + ' não gravados: ' + erro);
    return { ok: false, erro: 'armazenamento_falhou', etapa: 'blocos' };
  }

  var conferido;
  try {
    conferido = conferirGeracao(def, registro.id, gravado, json);
  } catch (erro) {
    conferido = { ok: false };
  }
  if (!conferido.ok) return { ok: false, erro: 'armazenamento_falhou', etapa: 'conferencia' };

  registro.armazenamento = JSON.stringify({
    formato: FORMATO_BLOCOS,
    versao: VERSAO_BLOCOS,
    geracao: gravado.geracao,
    blocos: gravado.blocos,
    tamanho: gravado.tamanho,
    hash: gravado.hash,
    local: { linha: gravado.primeiraLinha, blocos: gravado.blocos },
    gravadoEm: gravado.criadoEm,
    reutilizavel: anterior ? { geracao: anterior.geracao, local: anterior.local || null } : null,
  });
  /* Um servidor anterior à v2.28 que abrisse esta linha veria um aviso,
     e não um combate vazio que ele pudesse regravar como se fosse novo. */
  registro.dadosJson = JSON.stringify({ aviso: 'Combate guardado em blocos (v2.28). Atualize o servidor.' });

  if (reaproveitar && gravado.reaproveitou) {
    var sobras = [];
    for (var s = gravado.blocos; s < reaproveitar.blocos; s++) sobras.push(reaproveitar.linha + s);
    return { ok: true, limpar: { linhas: sobras } };
  }
  var manter = {};
  manter[String(gravado.geracao)] = true;
  if (anterior) manter[String(anterior.geracao)] = true;
  return { ok: true, limpar: { manter: manter } };
}

/* Depois de a linha estar gravada. Falhar aqui não desfaz nada: as
   linhas ficam para limparBlocosOrfaos(). */
function limparDepoisDoCombate(combateId, limpar) {
  if (!limpar) return;
  try {
    if (limpar.linhas) limparBlocos(ABAS.CAMPANHA_COMBATES_BLOCOS, limpar.linhas);
    else apagarGeracoes(ABAS.CAMPANHA_COMBATES_BLOCOS, combateId, limpar.tudo ? {} : limpar.manter);
  } catch (erro) {
    console.warn('R.A.M.A.: limpeza dos blocos do combate ' + combateId + ' adiada: ' + erro);
  }
}

/* Os blocos de vários combates de uma vez (exclusão da campanha). */
function apagarBlocosDeCombates(ids) {
  if (!ids || !ids.length) return;
  var alvo = {};
  ids.forEach(function (id) { alvo[String(id)] = true; });
  try {
    var mapa = linhasPorValor(ABAS.CAMPANHA_COMBATES_BLOCOS, ['combateId', 'geracao']);
    var linhas = [];
    Object.keys(mapa).forEach(function (chave) {
      if (alvo[chave.split('\n')[0]]) linhas = linhas.concat(mapa[chave]);
    });
    limparBlocos(ABAS.CAMPANHA_COMBATES_BLOCOS, linhas);
  } catch (erro) {
    /* Sem a aba (instalação anterior à v2.28) não há o que limpar. */
  }
}

/* O estado de UMA ocorrência de criatura (v2.28) — a mesma regra de
   RAMACriaturas.definirNaInstancia (js/criaturas.js):

     "estado:<id>"    inteiro de 0 ao máximo de um estado que a ficha tem
     "uso:<id>"       inteiro de 0 a 999
     "marcador:<id>"  booleano
     "enigma"         booleano
     "nota"           texto, até 1000
     "procedimento:<id>"  o andamento de um procedimento da ficha (AS4,
                      v2.38: Exorcismo Digital), objeto, ou null

   Valor zero ou falso sai do objeto, para a ocorrência não engordar. */
var CHAVE_DE_INSTANCIA = /^[A-Za-z0-9_.:-]{1,90}$/;

var ESTADOS_DO_PROCEDIMENTO = ['preparando', 'andamento', 'aprisionado', 'destruido', 'escapou', 'cancelado'];
var PAPEIS_DO_PROCEDIMENTO = ['encarar', 'executar', 'outro'];

function inteiroEntreServidor(v, min, max, padrao) {
  var n = Math.round(Number(v));
  if (!isFinite(n)) n = padrao;
  return Math.max(min, Math.min(max, n));
}

/* A mesma forma de normalizarAndamento (js/criaturas.js): só o formato
   do dado; a ordem das etapas é decisão do mestre. */
function normalizarAndamentoServidor(a, modelo) {
  if (!a || typeof a !== 'object' || Array.isArray(a)) return null;
  var req = {};
  (Array.isArray(modelo.requisitos) ? modelo.requisitos : []).forEach(function (r) {
    if (r && a.requisitos && a.requisitos[r.id] === true) req[String(r.id)] = true;
  });
  return {
    estado: ESTADOS_DO_PROCEDIMENTO.indexOf(a.estado) >= 0 ? a.estado : 'preparando',
    participantes: (Array.isArray(a.participantes) ? a.participantes : []).map(function (x) {
      if (!x || typeof x !== 'object') return null;
      var nome = String(x.nome || '').trim().slice(0, 80);
      return nome ? { nome: nome, papel: PAPEIS_DO_PROCEDIMENTO.indexOf(x.papel) >= 0 ? x.papel : 'outro', treinado: x.treinado === true } : null;
    }).filter(Boolean).slice(0, 8),
    requisitos: req,
    sucessos: inteiroEntreServidor(a.sucessos, 0, 20, 0),
    falhas: inteiroEntreServidor(a.falhas, 0, 20, 0),
    testes: (Array.isArray(a.testes) ? a.testes : []).map(function (t) {
      if (!t || typeof t !== 'object') return null;
      var tid = String(t.id || '').replace(/[^A-Za-z0-9_.:-]/g, '').slice(0, 60);
      if (!tid) return null;
      return { id: tid, dt: inteiroEntreServidor(t.dt, 0, 99, 0), total: inteiroEntreServidor(t.total, -99, 999, 0),
        sucesso: t.sucesso === true, por: String(t.por || '').trim().slice(0, 80) };
    }).filter(Boolean).slice(-20)
  };
}

function definirNaInstanciaDaCriatura(snapshot, chave, valor) {
  if (typeof chave !== 'string') return false;
  var inst = snapshot.instancia && typeof snapshot.instancia === 'object' ? snapshot.instancia : {};
  ['estados', 'usos', 'marcadores'].forEach(function (k) {
    if (!inst[k] || typeof inst[k] !== 'object' || Array.isArray(inst[k])) inst[k] = {};
  });
  if (typeof inst.enigma !== 'boolean') inst.enigma = false;
  if (typeof inst.nota !== 'string') inst.nota = '';

  if (chave === 'enigma') {
    if (typeof valor !== 'boolean') return false;
    inst.enigma = valor;
  } else if (chave === 'nota') {
    if (typeof valor !== 'string') return false;
    inst.nota = valor.trim().slice(0, 1000);
  } else if (chave === 'forma') {
    /* Arquivos Secretos 2 (v2.30): a forma transformada é a MESMA
       ocorrência. Troca os PV máximos para os da ficha publicada da forma
       (ou da ficha de partida) e só prende os atuais — nunca restaura. */
    var formas = snapshot.ordem && Array.isArray(snapshot.ordem.formas) ? snapshot.ordem.formas : [];
    if (typeof valor !== 'string' || !formas.length) return false;
    var alvo = valor ? formas.filter(function (f) { return f && String(f.id) === valor; })[0] : null;
    if (valor && !alvo) return false;
    if ((inst.forma || '') !== valor) {
      if (valor) inst.forma = valor; else delete inst.forma;
      var status = Array.isArray(snapshot.status) ? snapshot.status : [];
      var vida = status.filter(function (x) { return x && String(x.id) === 'vida'; })[0];
      var maximo = alvo ? Math.round(Number(alvo.pv)) : Math.round(Number(snapshot.ordem.pvBase)) || (vida ? Math.round(Number(vida.maximo)) : 0);
      if (vida && maximo > 0) {
        /* AS3 (v2.33): "+N PV máximos e atuais" ao entrar na forma. */
        var soma = alvo ? Math.max(0, Math.min(999, Math.round(Number(alvo.somaAtuais)) || 0)) : 0;
        vida.maximo = maximo;
        vida.atual = Math.max(0, Math.min((Math.round(Number(vida.atual)) || 0) + soma, maximo));
      }
    }
  } else if (/^procedimento:/.test(chave)) {
    var idProc = chave.slice('procedimento:'.length);
    var procs = snapshot.ordem && Array.isArray(snapshot.ordem.procedimentos) ? snapshot.ordem.procedimentos : [];
    var proc = procs.filter(function (p) { return p && String(p.id) === idProc; })[0];
    if (!proc) return false;
    if (!inst.procedimentos || typeof inst.procedimentos !== 'object' || Array.isArray(inst.procedimentos)) inst.procedimentos = {};
    if (valor === null) {
      delete inst.procedimentos[proc.id];
    } else {
      var andamento = normalizarAndamentoServidor(valor, proc);
      if (!andamento) return false;
      inst.procedimentos[proc.id] = andamento;
    }
  } else {
    var m = /^(estado|uso|marcador):(.+)$/.exec(chave);
    if (!m || !CHAVE_DE_INSTANCIA.test(m[2])) return false;
    if (m[1] === 'marcador') {
      if (typeof valor !== 'boolean') return false;
      if (valor) inst.marcadores[m[2]] = true; else delete inst.marcadores[m[2]];
    } else {
      if (typeof valor !== 'number' || Math.round(valor) !== valor) return false;
      if (m[1] === 'estado') {
        var estados = snapshot.ordem && Array.isArray(snapshot.ordem.estados) ? snapshot.ordem.estados : [];
        var e = estados.filter(function (x) { return x && String(x.id) === m[2]; })[0];
        if (!e || valor < 0 || valor > Math.max(1, Math.round(Number(e.maximo)) || 1)) return false;
        if (valor) inst.estados[m[2]] = valor; else delete inst.estados[m[2]];
      } else {
        if (valor < 0 || valor > 999) return false;
        if (valor) inst.usos[m[2]] = valor; else delete inst.usos[m[2]];
      }
    }
  }
  snapshot.instancia = inst;
  return true;
}

/* =====================================================================
   GRAVAÇÃO COMPLETA
   ---------------------------------------------------------------------
   Criar um combate, e o caminho das versões anteriores do site, que
   mandavam o combate inteiro a cada alteração. O turno e as operações
   já aplicadas continuam guardados — quem não os conhece não os apaga.
   Para editar um combate que já existe, o site usa atualizar_combate.
   ===================================================================== */

function acaoSalvarCombate(corpo, usuario) {
  var dados = corpo.dados || {};
  var nome = String(dados.nome || '').trim().slice(0, 120);
  if (!nome) return { ok: false, erro: 'dados_invalidos' };

  return comTrava(function () {
    var ctx = exigirMestre(corpo.campanhaId, usuario);
    if (!ctx.ok) return ctx;

    var membros = idsDaMesa(ctx.campanha);

    var visiveis = (Array.isArray(dados.visiveis) ? dados.visiveis : [])
      .map(String)
      .filter(function (id) { return membros[id]; });

    var participantes = normalizarParticipantes(dados.participantes, ctx);
    var estado = estadoDeCombate(dados.estado);

    var agora = new Date().toISOString();
    var existente = null;

    if (dados.id) {
      existente = acharPor(ABAS.CAMPANHA_COMBATES, 'id', dados.id);
      if (existente && String(existente.campanhaId) !== String(ctx.campanha.id)) existente = null;
    }

    if (existente) {
      var revAtual = Number(existente.rev) || 0;
      var revPedida = Number(corpo.rev);
      if (Number.isFinite(revPedida) && revPedida !== revAtual) {
        return { ok: false, erro: 'conflito', rev: revAtual };
      }

      var textoAnterior = textoDoCombate(existente);
      if (textoAnterior === null) return { ok: false, erro: 'armazenamento_falhou', etapa: 'leitura' };
      var anteriores = lerJson(textoAnterior, {});
      var turnoAntes = turnoNormalizado(anteriores.turno, participantes, estadoDeCombate(existente.estado));
      var turno = estadoDeCombate(existente.estado) === 'preparando' && estado === 'ativo'
        ? turnoNormalizado(null, participantes, estado)
        : turnoNormalizado(turnoAntes, participantes, estado);

      var json = JSON.stringify({
        participantes: participantes,
        turno: turno,
        ops: Array.isArray(anteriores.ops) ? anteriores.ops : [],
        turnoDesde: anteriores.turnoDesde || '',
        config: configDoCombate(anteriores.config),
      });
      var preparo = prepararTextoDoCombate(existente, json);
      if (!preparo.ok) return preparo;

      existente.nome = nome;
      existente.estado = estado;
      existente.visiveisJson = JSON.stringify(visiveis);
      existente.atualizadoEm = agora;
      existente.rev = revAtual + 1;

      atualizarLinha(ABAS.CAMPANHA_COMBATES, existente._linha, existente);
      limparDepoisDoCombate(existente.id, preparo.limpar);
      marcarMesa(ctx.campanha.id, ['combates']);
      return { ok: true, dados: { id: existente.id }, rev: existente.rev };
    }

    var jsonNovo = JSON.stringify({
      participantes: participantes,
      turno: turnoNormalizado(null, participantes, estado),
      ops: [],
    });

    var id = novoId();
    var novo = {
      id: id,
      campanhaId: ctx.campanha.id,
      nome: nome,
      estado: estado,
      visiveisJson: JSON.stringify(visiveis),
      criadoEm: agora,
      atualizadoEm: agora,
      rev: 1,
      dadosJson: '',
      armazenamento: '',
    };
    var preparoNovo = prepararTextoDoCombate(novo, jsonNovo);
    if (!preparoNovo.ok) return preparoNovo;
    inserir(ABAS.CAMPANHA_COMBATES, novo);
    limparDepoisDoCombate(id, preparoNovo.limpar);

    marcarMesa(ctx.campanha.id, ['combates']);
    return { ok: true, dados: { id: id }, rev: 1 };
  });
}

/* Cada participante é conferido: personagem tem de ser da campanha, e
   a ordem é um número. O snapshot da criatura passa como veio — ele é
   conteúdo do mestre, montado a partir de uma criatura que ele já podia
   ver quando montou o combate. */
function normalizarParticipantes(lista, ctx, daMesaPronta) {
  if (!Array.isArray(lista)) return [];

  /* Só id e nome interessam aqui, e os dois são colunas leves. */
  var daMesa = daMesaPronta || personagensDaMesaPorId(ctx);

  var saida = [];

  lista.slice(0, 200).forEach(function (p) {
    if (!p || typeof p !== 'object') return;

    var ordem = Number(p.ordem);
    if (!Number.isFinite(ordem)) ordem = 0;

    if (p.tipo === 'personagem') {
      if (!daMesa[p.personagemId]) return;
      saida.push({
        id: String(p.id || novoId()),
        tipo: 'personagem',
        personagemId: String(p.personagemId),
        nome: daMesa[p.personagemId],
        ordem: Math.round(ordem),
      });
      return;
    }

    saida.push({
      id: String(p.id || novoId()),
      tipo: 'criatura',
      /* De onde a criatura veio, como rastro. O combate NÃO consulta
         este id para desenhar nada — o que vale é o snapshot. */
      origemId: p.origemId ? String(p.origemId) : null,
      nome: String(p.nome || 'Criatura').slice(0, 120),
      ordem: Math.round(ordem),
      snapshot: (p.snapshot && typeof p.snapshot === 'object') ? p.snapshot : {},
    });
  });

  return saida;
}

function personagensDaMesaPorId(ctx) {
  var daMesa = {};
  lerLeves(ABAS.PERSONAGENS).forEach(function (p) {
    if (String(p.campanhaId) === String(ctx.campanha.id)) daMesa[p.id] = p.nome;
  });
  return daMesa;
}

/* =====================================================================
   OPERAÇÕES NUM COMBATE
   ---------------------------------------------------------------------
   Em vez de reenviar o combate inteiro a cada iniciativa digitada, a
   tela manda um LOTE de operações: "a iniciativa de X é 14", "próximo
   turno", "tirar Y". O servidor aplica todas, em ordem, de uma vez só:
   ou o lote inteiro entra, ou nada entra.

   Três proteções, e nenhuma substitui a outra:

     rev    o lote diz sobre qual revisão foi montado. Se o combate mudou
            em outro lugar — outro mestre, outra aba, outro aparelho —, a
            resposta é `conflito` com o estado atual, e a tela decide o
            que ainda vale reaplicar. Nada é sobrescrito em silêncio.

     opId   cada lote tem um identificador. Ele fica guardado com o
            combate, e um lote que chega de novo com o mesmo opId — a
            resposta se perdeu e a tela repetiu — é reconhecido e NÃO é
            aplicado duas vezes. É o que impede um "próximo turno"
            repetido por causa da rede de pular dois turnos.

     trava  duas gravações nunca se intercalam na planilha.

   As operações:

     iniciativa        { participanteId, valor }
     criatura_status   { participanteId, statusId, valor }  — o snapshot
                       da criatura NESTE combate; o modelo não muda
     criatura_instancia { participanteId, chave, valor } — fase, uso,
                       marcador, Enigma ou anotação DESTA ocorrência
                       (v2.28); ver definirNaInstanciaDaCriatura
     turno             { direcao: "proximo" | "anterior" }
     estado            { valor: "ativo" | "encerrado" }
     adicionar         { participantes: [...] }
     remover           { participanteId }
     renomear          { nome }
     visiveis          { lista: [ids de usuário] }
   ===================================================================== */

var MAX_OPERACOES_POR_LOTE = 100;
var MAX_OPS_GUARDADAS = 40;
var LIMITE_DE_INICIATIVA = 9999;

function numeroEstrito(valor) {
  var ehNumero = typeof valor === 'number' ||
    (typeof valor === 'string' && /^\s*-?\d+(\.\d+)?\s*$/.test(valor));
  if (!ehNumero) return null;
  var n = Number(valor);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function acaoAtualizarCombate(corpo, usuario) {
  var opId = String(corpo.opId || '');
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(opId)) return { ok: false, erro: 'dados_invalidos' };

  var ops = Array.isArray(corpo.ops) ? corpo.ops : null;
  if (!ops || !ops.length || ops.length > MAX_OPERACOES_POR_LOTE) return { ok: false, erro: 'dados_invalidos' };

  return comTrava(function () {
    var ctx = exigirMestre(corpo.campanhaId, usuario);
    if (!ctx.ok) return ctx;

    var registro = acharPor(ABAS.CAMPANHA_COMBATES, 'id', corpo.combateId);
    if (!registro || String(registro.campanhaId) !== String(ctx.campanha.id)) {
      return { ok: false, erro: 'nao_encontrado' };
    }

    var textoAtual = textoDoCombate(registro);
    if (textoAtual === null) return { ok: false, erro: 'armazenamento_falhou', etapa: 'leitura' };
    var dados = lerJson(textoAtual, {});
    var feitas = Array.isArray(dados.ops) ? dados.ops : [];
    var revAtual = Number(registro.rev) || 0;

    /* A repetição vem ANTES da revisão: o lote que já entrou subiu a
       revisão, e a segunda chegada dele sempre pareceria um conflito. */
    var jaFeita = feitas.some(function (o) { return o && String(o.id) === opId; });
    if (jaFeita) {
      return { ok: true, repetida: true, rev: revAtual, dados: combateParaCliente(registro, ctx, textoAtual) };
    }

    var revPedida = Number(corpo.rev);
    if (!Number.isFinite(revPedida)) return { ok: false, erro: 'dados_invalidos' };
    if (revPedida !== revAtual) {
      return { ok: false, erro: 'conflito', rev: revAtual, dados: combateParaCliente(registro, ctx, textoAtual) };
    }

    var estadoAtual = estadoDeCombate(registro.estado);
    var participantesAtuais = Array.isArray(dados.participantes) ? dados.participantes : [];

    var combate = {
      nome: registro.nome,
      estado: estadoAtual,
      visiveis: lerJson(registro.visiveisJson, []) || [],
      participantes: JSON.parse(JSON.stringify(participantesAtuais)),
      turno: turnoNormalizado(dados.turno, participantesAtuais, estadoAtual),
      turnoDesde: typeof dados.turnoDesde === 'string' ? dados.turnoDesde : '',
      config: configDoCombate(dados.config),
    };

    var resultado = aplicarOperacoesDeCombate(combate, ops, ctx);
    if (!resultado.ok) return resultado;

    feitas.push({ id: opId, rev: revAtual + 1 });
    if (feitas.length > MAX_OPS_GUARDADAS) feitas = feitas.slice(feitas.length - MAX_OPS_GUARDADAS);

    var json = JSON.stringify({
      participantes: combate.participantes, turno: combate.turno, ops: feitas,
      turnoDesde: combate.turnoDesde || '', config: combate.config,
    });
    var preparo = prepararTextoDoCombate(registro, json);
    if (!preparo.ok) return preparo;

    registro.nome = combate.nome;
    registro.estado = combate.estado;
    registro.visiveisJson = JSON.stringify(combate.visiveis);
    registro.atualizadoEm = new Date().toISOString();
    registro.rev = revAtual + 1;

    atualizarLinha(ABAS.CAMPANHA_COMBATES, registro._linha, registro);
    limparDepoisDoCombate(registro.id, preparo.limpar);
    marcarMesa(ctx.campanha.id, ['combates']);

    /* Os inícios de turno deste lote, nas fichas dos personagens com
       morrendo, enlouquecendo ou contador da mesa ativo (v2.19). O lote
       repetido (mesmo opId) já voltou lá em cima, sem chegar aqui: um
       "próximo turno" reenviado pela rede não conta duas vezes. */
    var participantesPorId = {};
    participantesAtuais.concat(combate.participantes).forEach(function (p) {
      if (p && p.id !== undefined) participantesPorId[String(p.id)] = p;
    });
    var avisosDasFichas = aplicarTurnosAsFichas(ctx, registro.id, resultado.turnos || [], participantesPorId, opId);

    return {
      ok: true,
      rev: registro.rev,
      avisos: resultado.avisos.concat(avisosDasFichas),
      dados: combateParaCliente(registro, ctx, json),
    };
  });
}

/* Aplica o lote numa cópia. Qualquer operação inválida recusa o lote
   inteiro, com o índice dela — metade de um lote aplicado deixaria o
   combate num estado que ninguém pediu. */
function aplicarOperacoesDeCombate(combate, ops, ctx) {
  var avisos = [];
  var daMesa = null;
  var membros = null;

  /* Os inícios de turno que este lote produziu, e os que ele desfez
     ("voltar turno"), na ordem em que aconteceram. Quem os aplica às
     fichas é acaoAtualizarCombate, depois de gravar o combate. */
  var turnos = [];
  var instante = new Date().toISOString();
  function mudouOTurno(antes, depois, voltando) {
    if (combate.estado !== 'ativo' || !depois) return;
    var mesmo = antes && String(antes.ativoId) === String(depois.ativoId) && Number(antes.rodada) === Number(depois.rodada);
    if (mesmo) return;
    if (voltando) {
      /* Desfaz o início do turno desfeito e o FIM do turno que volta a
         valer — e só eles. */
      if (antes && antes.ativoId) turnos.push({ tipo: 'retirada', rodada: Number(antes.rodada), participanteId: String(antes.ativoId) });
      if (depois.ativoId) turnos.push({ tipo: 'retirada-fim', rodada: Number(depois.rodada), participanteId: String(depois.ativoId) });
      combate.turnoDesde = instante;
      return;
    }
    if (antes && antes.ativoId) {
      turnos.push({ tipo: 'fim', rodada: Number(antes.rodada), participanteId: String(antes.ativoId), desde: combate.turnoDesde || '' });
    }
    if (depois.ativoId) turnos.push({ tipo: 'inicio', rodada: Number(depois.rodada), participanteId: String(depois.ativoId) });
    combate.turnoDesde = instante;
  }

  function recusar(indice, motivo) {
    return { ok: false, erro: 'dados_invalidos', indice: indice, motivo: motivo };
  }

  function acharParticipante(id) {
    for (var i = 0; i < combate.participantes.length; i++) {
      if (String(combate.participantes[i].id) === String(id)) return combate.participantes[i];
    }
    return null;
  }

  for (var i = 0; i < ops.length; i++) {
    var op = ops[i];
    if (!op || typeof op !== 'object') return recusar(i, 'operacao');
    var tipo = String(op.tipo || '');

    if (tipo === 'iniciativa') {
      var alvo = acharParticipante(op.participanteId);
      if (!alvo) return recusar(i, 'participante');
      var valor = numeroEstrito(op.valor);
      if (valor === null || Math.abs(valor) > LIMITE_DE_INICIATIVA) return recusar(i, 'valor');
      alvo.ordem = valor;
      continue;
    }

    if (tipo === 'criatura_status') {
      var criatura = acharParticipante(op.participanteId);
      if (!criatura || criatura.tipo !== 'criatura') return recusar(i, 'participante');
      var snapshot = (criatura.snapshot && typeof criatura.snapshot === 'object') ? criatura.snapshot : {};
      var lista = Array.isArray(snapshot.status) ? snapshot.status : [];
      var status = null;
      for (var s = 0; s < lista.length; s++) {
        if (lista[s] && String(lista[s].id) === String(op.statusId)) { status = lista[s]; break; }
      }
      if (!status) return recusar(i, 'status');
      var novo = numeroEstrito(op.valor);
      if (novo === null) return recusar(i, 'valor');
      var maximo = Math.max(0, Math.round(Number(status.maximo)) || 0);
      /* O mesmo limite de js/criaturas.js: de 0 ao máximo, ou só o piso
         quando a criatura não tem máximo. */
      status.atual = maximo > 0 ? Math.max(0, Math.min(maximo, novo)) : Math.max(0, Math.min(999999, novo));
      continue;
    }

    if (tipo === 'criatura_instancia') {
      var ocorrencia = acharParticipante(op.participanteId);
      /* A ocorrência já saiu (outra aba a tirou): o ajuste não tem onde
         cair, e isso não é erro do lote. */
      if (!ocorrencia) continue;
      if (ocorrencia.tipo !== 'criatura') return recusar(i, 'participante');
      if (!ocorrencia.snapshot || typeof ocorrencia.snapshot !== 'object') ocorrencia.snapshot = {};
      if (!definirNaInstanciaDaCriatura(ocorrencia.snapshot, op.chave, op.valor)) return recusar(i, 'valor');
      continue;
    }

    if (tipo === 'turno') {
      if (combate.estado !== 'ativo') return recusar(i, 'estado');
      var direcao = String(op.direcao || '');
      if (direcao !== 'proximo' && direcao !== 'anterior') return recusar(i, 'direcao');
      var t = direcao === 'proximo'
        ? turnoSeguinte(combate.turno, combate.participantes)
        : turnoAnterior(combate.turno, combate.participantes);
      if (t.inicio) avisos.push({ indice: i, aviso: 'inicio' });
      var antesDoTurno = combate.turno;
      combate.turno = { rodada: t.rodada, ativoId: t.ativoId };
      mudouOTurno(antesDoTurno, combate.turno, direcao === 'anterior');
      continue;
    }

    if (tipo === 'estado') {
      var destino = String(op.valor || '');
      if (destino === combate.estado) continue;
      if (combate.estado === 'preparando' && destino === 'ativo') {
        combate.estado = 'ativo';
        combate.turno = turnoNormalizado(null, combate.participantes, 'ativo');
        mudouOTurno(null, combate.turno, false);
        continue;
      }
      if (combate.estado === 'ativo' && destino === 'encerrado') {
        combate.estado = 'encerrado';
        combate.turno = turnoNormalizado(combate.turno, combate.participantes, 'encerrado');
        continue;
      }
      return recusar(i, 'transicao');
    }

    if (tipo === 'adicionar') {
      if (!Array.isArray(op.participantes) || !op.participantes.length) return recusar(i, 'participantes');
      if (!daMesa) daMesa = personagensDaMesaPorId(ctx);
      var novos = normalizarParticipantes(op.participantes, ctx, daMesa);
      novos.forEach(function (p) {
        if (combate.participantes.length >= 200) return;
        if (acharParticipante(p.id)) return;
        if (p.tipo === 'personagem' && combate.participantes.some(function (x) {
          return x.tipo === 'personagem' && String(x.personagemId) === String(p.personagemId);
        })) return;
        combate.participantes.push(p);
      });
      continue;
    }

    if (tipo === 'remover') {
      var saindo = acharParticipante(op.participanteId);
      /* Tirar quem já saiu não é erro: é a segunda metade de uma mesma
         intenção, vinda de outra aba. */
      if (!saindo) continue;
      if (combate.estado === 'ativo') {
        var antesDeSair = combate.turno;
        combate.turno = turnoSemParticipante(combate.turno, combate.participantes, saindo.id);
        mudouOTurno(antesDeSair, combate.turno, false);
      }
      combate.participantes = combate.participantes.filter(function (p) { return String(p.id) !== String(saindo.id); });
      continue;
    }

    if (tipo === 'config') {
      /* Mostrar a vida das criaturas aos jogadores (v2.20). Só o que vier
         no pedido muda; o resto fica. */
      if (op.mostrarVidaCriaturas !== undefined) {
        if (typeof op.mostrarVidaCriaturas !== 'boolean') return recusar(i, 'valor');
        combate.config.mostrarVidaCriaturas = op.mostrarVidaCriaturas;
      }
      continue;
    }

    if (tipo === 'renomear') {
      var nome = String(op.nome || '').trim().slice(0, 120);
      if (!nome) return recusar(i, 'nome');
      combate.nome = nome;
      continue;
    }

    if (tipo === 'visiveis') {
      if (!Array.isArray(op.lista)) return recusar(i, 'lista');
      if (!membros) membros = idsDaMesa(ctx.campanha);
      var vistos = {};
      combate.visiveis = op.lista.map(String).filter(function (id) {
        if (!membros[id] || vistos[id]) return false;
        vistos[id] = true;
        return true;
      });
      continue;
    }

    return recusar(i, 'tipo');
  }

  /* Depois de tudo: quem tem o turno ainda existe? Um combate que estava
     vazio e ganhou participantes passa o turno ao primeiro da ordem. */
  var antesDoFim = combate.turno;
  combate.turno = turnoNormalizado(combate.turno, combate.participantes, combate.estado);
  mudouOTurno(antesDoFim, combate.turno, false);
  return { ok: true, avisos: avisos, turnos: turnos };
}

function acaoExcluirCombate(corpo, usuario) {
  return comTrava(function () {
    var ctx = exigirMestre(corpo.campanhaId, usuario);
    if (!ctx.ok) return ctx;

    var combate = acharPor(ABAS.CAMPANHA_COMBATES, 'id', corpo.combateId);
    if (!combate || String(combate.campanhaId) !== String(ctx.campanha.id)) {
      return { ok: false, erro: 'nao_encontrado' };
    }

    apagarLinha(ABAS.CAMPANHA_COMBATES, combate._linha);
    if (manifestoDe(combate.armazenamento)) limparDepoisDoCombate(combate.id, { tudo: true });
    marcarMesa(ctx.campanha.id, ['combates']);
    return { ok: true };
  });
}


/* =====================================================================
   HEXATOMBE (v2.30 — Arquivos Secretos 2, p. 4–24)
   ---------------------------------------------------------------------
   O modo de campanha do Hexatombe. Uma linha por campanha em
   CAMPANHA_HEXATOMBE.

     ler_hexatombe       mestre: o estado inteiro; jogador: a VISTA dele
                         (a equipe em que tem personagem, as intenções
                         desbloqueadas, os sacrifícios realizados e o
                         diário público ou da equipe). Equipe rival sai só
                         com o nome; notas do mestre, pendências e
                         lançamentos pendentes nunca saem para jogador.
     salvar_hexatombe    só o mestre. O estado chega inteiro, com `rev` e
                         `opId`: o mesmo lote repetido não conta duas
                         vezes; revisão velha recebe o estado atual
                         (conflito). O servidor normaliza com a MESMA
                         régua do site (o módulo abaixo) e desfaz vínculos
                         com personagens que não são desta campanha.
     lancar_hexatombe    só o mestre, num personagem DESTA campanha: os
                         lançamentos de ficha (sede, fome, desertor,
                         castigo, intenção) com id estável — repetir não
                         lança de novo; desfazer marca o lançamento.

   O módulo é cópia fiel de js/ordem/hexatombe.js (o teste do backend
   confere byte a byte). Em Apps Script todos os arquivos dividem o mesmo
   escopo: o módulo só pendura RAMAHexatombe no global.
   ===================================================================== */

/* >>> js/ordem/hexatombe.js */
/* =====================================================================
   R.A.M.A. — Ordem Paranormal · modo Hexatombe da campanha
   =====================================================================
   As regras de "Jogando o Hexatombe" (Arquivos Secretos 2, p. 4–24)
   como um ESTADO de campanha e um punhado de operações puras sobre ele.
   Quem desenha é js/paginas/campanha-hexatombe.js; quem guarda e filtra
   para cada pessoa é o Apps Script (Campanhas.gs, "HEXATOMBE"), que
   normaliza com a mesma régua deste arquivo e nunca entrega ao jogador
   o que é do mestre ou de outra equipe.

   ---------------------------------------------------------------------
   O QUE O ESTADO GUARDA
   ---------------------------------------------------------------------

     ativo, nome, dia (0–6), fase, faseNota
     equipes        nome, base (melhorias, recursos especiais), estoque
                    (água, comida, sucata, outros itens), produção já
                    recebida por dia, notas do mestre
     participantes  nome, equipe, personagem vinculado (ou NPC),
                    sacrifício e estigma, vivo/morte, desertor, castigos
                    sofridos, perícias alternativas já usadas na jornada,
                    procuras de recursos, consumo por dia, déficits de
                    água e comida, intenções cumpridas, notas do mestre
     sacrificios    as mortes de sacrifício, válidas ou não, com herdeiro
     intencoes      os estigmas desbloqueados (cada sacrifício válido)
     areas, rotas   o mapa explorado (rota percorrida dispensa o teste)
     pendencias     o que só a mesa decide (a Coroa escolhe um herdeiro)
     registro       o diário do Hexatombe (os últimos 60 lançamentos)
     pendentes      lançamentos de ficha que ainda não chegaram
     regrasAs3      as regras opcionais de campanha do Arquivos Secretos 3
                    (v2.33): Trocas de Recursos e Tempo de Construção de
                    Base — desligadas por padrão
     obras          melhorias em construção (Tempo de Construção, AS3
                    p. 121), por equipe
     trocas         informações e segredos trocados por recursos (AS3
                    p. 121), com o conteúdo visível só à equipe e à mesa

   ---------------------------------------------------------------------
   TRÊS DECISÕES
   ---------------------------------------------------------------------

   1. NADA SE RESOLVE SOZINHO. Avançar o dia só muda o dia, a fase e a
      produção da base; mortes, encontros, consumo e intenções são
      lançados pela mesa, cada um na sua hora (p. 14: as fases são
      sugestões, e o mestre ajusta o ritmo).

   2. A FICHA RECEBE LANÇAMENTOS COM ORIGEM. Sede, fome, desertor,
      castigo da Coroa e recompensa de intenção viram lançamentos na
      ficha vinculada (ordem.hexatombe.lancamentos, js/ordem/arquivo2.js)
      com id ESTÁVEL ("hx.<regra>.<participante>.<marca>"): repetir o
      pedido não lança duas vezes, e desfazer é marcar o lançamento.

   3. O QUE O LIVRO NÃO FIXA FICA COM A MESA. A DT do teste de jornada
      não é dada (a mesa informa se passou); a leitura da tabela de
      recursos tem duas opções (uma rolagem na maior coluna alcançada —
      o padrão — ou uma em cada coluna); melhorias de recurso especial
      são instaladas pela mesa, sem teste.
   ===================================================================== */

(function (global) {
  "use strict";

  var ID = /^[A-Za-z0-9_.:|#-]{1,80}$/;
  var FASES = ["preparacao", "execucao", "conclusao"];
  var NOMES_FASE = { preparacao: "Preparação (início do dia)", execucao: "Execução (manhã e tarde)", conclusao: "Conclusão (noite)" };
  var DIAS = 6;
  var MAX_EQUIPES = 8;
  var MAX_PARTICIPANTES = 48;
  var MAX_REGISTRO = 60;
  var MAX_PENDENTES = 60;
  var MAX_CASTIGOS = 6;

  /* ---------------- estigmas e intenções (p. 9–10 e 24) ---------------- */

  var ESTIGMAS = [
    { chave: "desejo", nome: "Desejo", sentimentos: "Desejo, Ambição, Inveja",
      missao: "Chegar a morrendo e se recuperar por completo.",
      recompensa: "Na primeira vez no dia em que cair morrendo, recebe +15 PV temporários e se levanta.",
      lancamento: { tipo: "nota", valor: 0 } },
    { chave: "rancor", nome: "Rancor", sentimentos: "Rancor, Frustração, Ansiedade, Ira",
      missao: "Matar duas pessoas no mesmo dia.",
      recompensa: "Quando causa dano, causa +5 do mesmo tipo.",
      lancamento: { tipo: "dano", valor: 5 } },
    { chave: "obsessao", nome: "Obsessão", sentimentos: "Obsessão, Servidão, Paixão",
      missao: "Ser gravemente ferido por alguém da própria equipe.",
      recompensa: "Resistência a dano 5.",
      lancamento: { tipo: "rd", valor: 5 } },
    { chave: "culpa", nome: "Culpa", sentimentos: "Culpa, Vergonha, Arrependimento, Sofrimento",
      missao: "Deixar morrer um aliado que poderia ter sido salvo.",
      recompensa: "Recebe um poder de quem morreu (a mesa escolhe e registra na Progressão).",
      lancamento: { tipo: "nota", valor: 0 } },
    { chave: "prazer", nome: "Prazer", sentimentos: "Prazer, Euforia, Luxúria, Gula",
      missao: "Consumir 3 águas e 3 comidas na mesma noite.",
      recompensa: "+10 PV máximos.",
      lancamento: { tipo: "pvMax", valor: 10 } },
    { chave: "orgulho", nome: "Orgulho", sentimentos: "Orgulho, Desprezo, Arrogância",
      missao: "Matar alguém sem que essa pessoa o fira.",
      recompensa: "+10 PE máximos.",
      lancamento: { tipo: "peMax", valor: 10 } },
  ];
  var POR_ESTIGMA = {};
  ESTIGMAS.forEach(function (e) { POR_ESTIGMA[e.chave] = e; });

  /* ---------------- melhorias de base (p. 16–17) ---------------- */

  var MELHORIAS = [
    { chave: "limpeza", nome: "Limpeza da base", custo: 0, beneficio: "Obrigatória antes de qualquer outra melhoria." },
    { chave: "filtro", nome: "Filtro de água", custo: 1, beneficio: "6 águas por dia.", producao: { agua: 6 } },
    { chave: "geladeira", nome: "Geladeira", custo: 1, beneficio: "6 comidas por dia.", producao: { comida: 6 } },
    { chave: "camas", nome: "Camas", custo: 1, beneficio: "O descanso passa de precário a normal." },
    { chave: "casaNaArvore", nome: "Casa na árvore", custo: 2, beneficio: "Observatório: uma pergunta por dia sobre o estado do Hexatombe." },
    { chave: "defesas", nome: "Defesas externas", custo: 1, beneficio: "Na base: +2 em Iniciativa, Luta, Pontaria e Defesa." },
    { chave: "academia", nome: "Academia", custo: 1, beneficio: "O bônus de exercitar-se passa a +2d6." },
    { chave: "enfermaria", nome: "Enfermaria improvisada", recurso: "Materiais de enfermaria", beneficio: "Dormir sempre conta com cuidados prolongados (OPRPG p. 46)." },
    { chave: "biblioteca", nome: "Biblioteca do Pomba", recurso: "Documentos dos Pássaros (ou outros)", especialDaTransmissao: true, beneficio: "Informações novas todo dia, ou ler passa a +2d6." },
    { chave: "salaDeMusica", nome: "Sala de música", recurso: "Produtos da Psikolera", especialDaTransmissao: true, beneficio: "Dançar (ação de interlúdio): até o fim do dia, +2 em testes de Agi e Pre e −2 nos de For e Vig." },
    { chave: "adega", nome: "Adega de vinho", recurso: "Vinhos dos Vampiros", especialDaTransmissao: true, beneficio: "Beber o vinho de Sangue: até o fim do dia, +2 em testes de For e Vig e −2 nos de Int e Pre." },
    { chave: "garagem", nome: "Garagem", recurso: "Carro dos Couraças", especialDaTransmissao: true, beneficio: "Guarda o carro. Sem efeito de regra." },
  ];
  var POR_MELHORIA = {};
  MELHORIAS.forEach(function (m) { POR_MELHORIA[m.chave] = m; });
  var DT_MELHORIA = 20;

  var ACOES_DE_DESCANSO = ["Dormir", "Exercitar-se", "Ler", "Manutenção", "Relaxar"];

  /* ---------------- tabelas (p. 18–23) ---------------- */

  var CONSEQUENCIAS = [
    { n: 1, nome: "Encontro inesperado", texto: "A jornada para: role já um encontro de exploração (diurno ou noturno, conforme a hora)." },
    { n: 2, nome: "Barranco", texto: "Um personagem sorteado cai: 2d6 de dano de impacto e fatigado até o fim da próxima cena (Fortitude DT 20 reduz à metade e evita a condição)." },
    { n: 3, nome: "Animal peçonhento", texto: "Um personagem sorteado perde 1 PV e fica envenenado (enjoado) até dormir (Fortitude DT 20 evita a condição)." },
    { n: 4, nome: "Solo instável", texto: "Todos afundam e ficam agarrados; ao fim da terceira rodada, afundam de vez (asfixiado e paralisado). Escapar: Atletismo ou Acrobacia DT 20." },
    { n: 5, nome: "Espinheiro", texto: "Dois personagens sorteados sofrem 2d4 de dano de perfuração (Reflexos DT 20 reduz à metade)." },
    { n: 6, nome: "“Pacote” aéreo", texto: "Um personagem sorteado é atingido por uma ave: alquebrado e −2 em testes de Presença até se limpar." },
  ];

  var RECURSOS_ENCONTRADOS = [
    ["Comida", "Bandagem", "Bússola"],
    ["Sucata", "Incenso", "Caixa de Ferramentas"],
    ["Água", "Pedra de Amolar", "Kit de Escalada"],
    ["Bandagem", "Comida", "Catalisador Ampliador"],
    ["Incenso", "Sucata", "Catalisador Perturbador"],
    ["Dose de Álcool", "Água", "Catalisador Potencializador"],
    ["Balas Curtas", "Bússola", "Comida"],
    ["Balas Longas", "Caixa de Ferramentas", "Sucata"],
    ["Cartuchos", "Dose de Álcool", "Água"],
    ["Catalisador Ampliador", "Balas Curtas", "Pedra de Amolar"],
    ["Catalisador Perturbador", "Balas Longas", "Munição Explosiva"],
    ["Catalisador Potencializador", "Cartuchos", "Dinamite"],
  ];
  var COLUNAS_DE_RECURSO = [15, 20, 25];

  var ENCONTROS = {
    noturnoBase: { nome: "Noturno de base", dado: 6, faixas: [
      [2, "Acerto de contas", "Ao anoitecer, alguém de uma equipe rival chega cobrando uma luta de um contra um."],
      [4, "Sobrevivente", "Um grito se aproxima da base: um sobrevivente muito ferido pede ajuda — ou é uma armadilha."],
      [6, "Caçadores", "Três membros de uma equipe rival vêm atrás do sacrifício dos personagens; vão embora assim que um sacrifício for realizado."],
    ] },
    diurnoBase: { nome: "Diurno de base", dado: 8, faixas: [
      [2, "Uma ajuda extra", "Um participante forte de outra equipe propõe uma parceria pontual; aceitando, ele aparece depois para ajudar."],
      [4, "Bisbilhoteiro", "Barulhos ao redor da base: Percepção contra Furtividade revela alguém de outra equipe espiando."],
      [6, "Visita mal-intencionada", "Uma dupla de outra equipe aparece fazendo perguntas e, ao sair, deixa um “presente” adulterado na porta."],
      [8, "Invasão acanhada", "Um animal assustado invade a base. Morto, rende 3 comidas; poupado, fica abrigado até virar uma criatura sanguinária no fim do quinto dia."],
    ] },
    diurnoExploracao: { nome: "Diurno de exploração", dado: 10, faixas: [
      [2, "Fogo cruzado", "Os personagens chegam no meio de um tiroteio entre duas equipes e decidem se ajudam alguma."],
      [4, "Negociação", "Uma dupla de outra equipe vasculha o local; dá para negociar e dividir os recursos, conforme a relação entre as equipes."],
      [6, "Encontro às escondidas", "Dois participantes de equipes diferentes se encontram em segredo."],
      [8, "Pedágio", "Um participante forte de uma rival exige toda a comida e água que o grupo carrega — ou luta."],
      [10, "Armadilha", "Uma armadilha debilitante prende o grupo (testes para perceber e evitar, como a armadilha manda); três membros de uma rival aparecem para ameaçá-los."],
    ] },
    noturnoExploracao: { nome: "Noturno de exploração", dado: 8, faixas: [
      [2, "Armadilha", "Uma armadilha debilitante prende o grupo; três membros de uma rival aparecem para ameaçá-los."],
      [4, "Predador noturno", "Um animal perigoso caça o grupo: Percepção contra a Furtividade dele; quem falhar fica surpreendido na primeira rodada."],
      [6, "Criatura noturna", "Uma criatura paranormal ataca: Percepção contra a Furtividade dela; quem falhar fica surpreendido na primeira rodada."],
      [8, "Confronto antecipado", "Uma equipe a caminho de matar um sacrifício esbarra no grupo: sem sacrifício presente, há diálogo; com, combate até um sacrifício morrer."],
    ] },
  };

  /* ---------------- utilidades ---------------- */

  function uuid() {
    if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }
  function agora() { return new Date().toISOString(); }
  function lista(v) { return Array.isArray(v) ? v : []; }
  function texto(v, n) { return String(v === undefined || v === null ? "" : v).replace(/[\u0000-\u001F]/g, " ").trim().slice(0, n || 120); }
  function inteiro(v, min, max, padrao) {
    var n = Math.round(Number(v));
    if (!Number.isFinite(n)) return padrao;
    return Math.max(min, Math.min(max, n));
  }
  function idOk(v) { var s = String(v || ""); return ID.test(s) ? s : ""; }
  function carimbo(v) { var s = String(v || ""); return /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(s) ? s : ""; }
  function copiar(v) { return JSON.parse(JSON.stringify(v)); }
  function chavesValidas(lista0, validas) {
    var vistas = {};
    return lista(lista0).filter(function (k) {
      if (validas.indexOf(k) < 0 || vistas[k]) return false;
      vistas[k] = true;
      return true;
    });
  }
  var CHAVES_ESTIGMA = ESTIGMAS.map(function (e) { return e.chave; });
  var CHAVES_MELHORIA = MELHORIAS.map(function (m) { return m.chave; });

  /* =================================================================
     NORMALIZAÇÃO — a mesma régua do servidor (Campanhas.gs)
     ================================================================= */

  function normalizarEstoque(e) {
    var x = e && typeof e === "object" ? e : {};
    var vistos = {};
    return {
      agua: inteiro(x.agua, 0, 999, 0),
      comida: inteiro(x.comida, 0, 999, 0),
      sucata: inteiro(x.sucata, 0, 999, 0),
      itens: lista(x.itens).map(function (i) {
        if (!i || typeof i !== "object") return null;
        var nome = texto(i.nome, 80);
        if (!nome || vistos[nome]) return null;
        vistos[nome] = true;
        var qtd = inteiro(i.qtd, 0, 999, 0);
        return qtd ? { nome: nome, qtd: qtd } : null;
      }).filter(Boolean).slice(0, 40),
    };
  }

  function normalizarEquipe(b) {
    if (!b || typeof b !== "object") return null;
    var id = idOk(b.id);
    var nome = texto(b.nome, 60);
    if (!id || !nome) return null;
    var base = b.base && typeof b.base === "object" ? b.base : {};
    var producao = {};
    Object.keys(b.producao && typeof b.producao === "object" ? b.producao : {}).forEach(function (d) {
      var n = inteiro(d, 1, DIAS, 0);
      if (n && b.producao[d] === true) producao[n] = true;
    });
    return {
      id: id, nome: nome,
      jogadores: b.jogadores === true,
      base: { nome: texto(base.nome, 80), melhorias: chavesValidas(base.melhorias, CHAVES_MELHORIA) },
      estoque: normalizarEstoque(b.estoque),
      obras: lista(b.obras).map(function (o) {
        if (!o || typeof o !== "object" || !idOk(o.id) || CHAVES_MELHORIA.indexOf(o.melhoria) < 0) return null;
        return { id: idOk(o.id), melhoria: o.melhoria, inicio: inteiro(o.inicio, 0, 999, 0), pessoas: inteiro(o.pessoas, 1, 99, 1),
          dias: inteiro(o.dias, 3, 7, 7), nota: texto(o.nota, 200) };
      }).filter(Boolean).slice(0, 8),
      producao: producao,
      notas: texto(b.notas, 1000),
    };
  }

  function normalizarParticipante(b, equipes) {
    if (!b || typeof b !== "object") return null;
    var id = idOk(b.id);
    var nome = texto(b.nome, 80);
    if (!id || !nome) return null;
    var equipeId = idOk(b.equipeId);
    if (equipeId && !equipes[equipeId]) equipeId = "";
    var morte = b.morte && typeof b.morte === "object" && b.vivo === false ? {
      dia: inteiro(b.morte.dia, 0, DIAS, 0), momento: b.morte.momento === "dia" ? "dia" : "noite",
      causa: ["morto", "suicidio", "acidente", "lua"].indexOf(b.morte.causa) >= 0 ? b.morte.causa : "morto",
      por: idOk(b.morte.por),
    } : null;
    var desertor = b.desertor && typeof b.desertor === "object" ? {
      desde: inteiro(b.desertor.desde, 0, DIAS, 0), motivo: b.desertor.motivo === "saiu" ? "saiu" : "equipe",
    } : null;
    var intencoes = {};
    Object.keys(b.intencoes && typeof b.intencoes === "object" ? b.intencoes : {}).forEach(function (k) {
      if (CHAVES_ESTIGMA.indexOf(k) < 0) return;
      var v = b.intencoes[k];
      if (v && typeof v === "object") intencoes[k] = { dia: inteiro(v.dia, 0, DIAS, 0) };
    });
    var consumo = {};
    Object.keys(b.consumo && typeof b.consumo === "object" ? b.consumo : {}).forEach(function (d) {
      var n = inteiro(d, 1, DIAS, 0);
      var v = b.consumo[d];
      if (n && v && typeof v === "object") consumo[n] = { agua: inteiro(v.agua, 0, 9, 0), comida: inteiro(v.comida, 0, 9, 0) };
    });
    return {
      id: id, nome: nome, equipeId: equipeId,
      personagemId: idOk(b.personagemId),
      sacrificio: b.sacrificio === true,
      estigma: CHAVES_ESTIGMA.indexOf(b.estigma) >= 0 ? b.estigma : "",
      original: b.original === true,
      vivo: b.vivo !== false,
      morte: morte,
      desertor: desertor,
      castigos: inteiro(b.castigos, 0, MAX_CASTIGOS, 0),
      alternativas: lista(b.alternativas).map(function (p) { return texto(p, 40); }).filter(Boolean).slice(0, 20),
      procuras: lista(b.procuras).map(idOk).filter(Boolean).slice(-40),
      consumo: consumo,
      sede: inteiro(b.sede, 0, DIAS, 0),
      fome: inteiro(b.fome, 0, DIAS, 0),
      /* "sede.<dia do déficit>@<dia em que a unidade a mais o recuperou>" */
      recuperados: lista(b.recuperados).filter(function (x) { return /^(sede|fome)\.\d@\d$/.test(String(x)); }).slice(0, 24),
      intencoes: intencoes,
      notas: texto(b.notas, 600),
    };
  }

  function normalizar(bruto) {
    var b = bruto && typeof bruto === "object" ? bruto : {};
    var equipes = lista(b.equipes).map(normalizarEquipe).filter(Boolean);
    var vistasE = {};
    equipes = equipes.filter(function (e) { if (vistasE[e.id]) return false; vistasE[e.id] = true; return true; }).slice(0, MAX_EQUIPES);
    var porEquipe = {};
    equipes.forEach(function (e) { porEquipe[e.id] = true; });
    var vistosP = {};
    var participantes = lista(b.participantes).map(function (p) { return normalizarParticipante(p, porEquipe); })
      .filter(function (p) { if (!p || vistosP[p.id]) return false; vistosP[p.id] = true; return true; })
      .slice(0, MAX_PARTICIPANTES);
    var vistasA = {};
    var areas = lista(b.areas).map(function (a) {
      if (!a || typeof a !== "object") return null;
      var id = idOk(a.id);
      var nome = texto(a.nome, 60);
      if (!id || !nome || vistasA[id]) return null;
      vistasA[id] = true;
      return { id: id, nome: nome, explorada: a.explorada === true };
    }).filter(Boolean).slice(0, 40);
    var rotas = lista(b.rotas).map(function (r) {
      if (!r || typeof r !== "object") return null;
      var de = idOk(r.de), para = idOk(r.para);
      return de && para && vistasA[de] && vistasA[para] && de !== para ? { de: de, para: para } : null;
    }).filter(Boolean).slice(0, 80);
    return {
      versao: 1,
      ativo: b.ativo === true,
      nome: texto(b.nome, 60) || "Hexatombe",
      dia: inteiro(b.dia, 0, DIAS, 0),
      fase: FASES.indexOf(b.fase) >= 0 ? b.fase : "preparacao",
      faseNota: texto(b.faseNota, 200),
      leituraDeRecursos: b.leituraDeRecursos === "cumulativa" ? "cumulativa" : "coluna",
      regrasAs3: {
        trocas: !!(b.regrasAs3 && b.regrasAs3.trocas === true),
        construcao: !!(b.regrasAs3 && b.regrasAs3.construcao === true),
      },
      trocas: lista(b.trocas).map(function (x) {
        if (!x || typeof x !== "object" || !idOk(x.id) || !porEquipe[x.equipeId]) return null;
        var pg = x.pagamento && typeof x.pagamento === "object" ? x.pagamento : {};
        return {
          id: idOk(x.id), dia: inteiro(x.dia, 0, DIAS, 0), equipeId: x.equipeId, npc: texto(x.npc, 60),
          tipo: x.tipo === "segredo" ? "segredo" : "informacao",
          pagamento: { agua: inteiro(pg.agua, 0, 3, 0), comida: inteiro(pg.comida, 0, 3, 0), sucata: inteiro(pg.sucata, 0, 3, 0) },
          sobre: texto(x.sobre, 80), conteudo: texto(x.conteudo, 600),
        };
      }).filter(Boolean).slice(-40),
      fracassou: b.fracassou === true,
      equipes: equipes,
      participantes: participantes,
      sacrificios: lista(b.sacrificios).map(function (s) {
        if (!s || typeof s !== "object" || !idOk(s.id)) return null;
        return {
          id: idOk(s.id), dia: inteiro(s.dia, 0, DIAS, 0), participanteId: idOk(s.participanteId),
          estigma: CHAVES_ESTIGMA.indexOf(s.estigma) >= 0 ? s.estigma : "", valido: s.valido === true,
          por: idOk(s.por), herdeiro: idOk(s.herdeiro),
        };
      }).filter(Boolean).slice(-24),
      intencoes: lista(b.intencoes).map(function (x) {
        if (!x || typeof x !== "object" || CHAVES_ESTIGMA.indexOf(x.estigma) < 0) return null;
        return { estigma: x.estigma, dia: inteiro(x.dia, 0, DIAS, 0), sacrificioId: idOk(x.sacrificioId) };
      }).filter(Boolean).slice(0, 24),
      areas: areas,
      rotas: rotas,
      pendencias: lista(b.pendencias).map(function (x) {
        if (!x || typeof x !== "object" || x.tipo !== "herdeiro" || CHAVES_ESTIGMA.indexOf(x.estigma) < 0) return null;
        return { id: idOk(x.id) || ("pend-" + uuid()), tipo: "herdeiro", estigma: x.estigma, dia: inteiro(x.dia, 0, DIAS, 0), motivo: texto(x.motivo, 200) };
      }).filter(Boolean).slice(0, 12),
      registro: lista(b.registro).map(function (r) {
        if (!r || typeof r !== "object" || !idOk(r.id)) return null;
        var vis = r.visivel === "mestre" ? "mestre" : (idOk(r.visivel) && porEquipe[r.visivel] ? r.visivel : "todos");
        return { id: idOk(r.id), dia: inteiro(r.dia, 0, DIAS, 0), tipo: texto(r.tipo, 30), texto: texto(r.texto, 400), em: carimbo(r.em), visivel: vis };
      }).filter(Boolean).slice(-MAX_REGISTRO),
      pendentes: lista(b.pendentes).map(function (x) {
        if (!x || typeof x !== "object") return null;
        var pid = idOk(x.personagemId);
        var l = x.lancamento && typeof x.lancamento === "object" ? x.lancamento : null;
        if (!pid || !l || !idOk(l.id)) return null;
        /* motivo: por que ainda não chegou (ex.: a ficha não liga a
           Participação no Hexatombe, v2.31). */
        return { personagemId: pid, desfazer: x.desfazer === true, motivo: x.motivo === "participacao_desligada" ? x.motivo : "", lancamento: {
          id: idOk(l.id), tipo: texto(l.tipo, 20), valor: inteiro(l.valor, -999, 999, 0), dia: inteiro(l.dia, 0, DIAS, 0),
          motivo: texto(l.motivo, 200), origem: texto(l.origem, 80), atualPv: inteiro(l.atualPv, -999, 0, 0), refazer: l.refazer === true,
        } };
      }).filter(Boolean).slice(-MAX_PENDENTES),
    };
  }

  function vazio() { return normalizar({}); }

  /* =================================================================
     CONSULTAS
     ================================================================= */

  function equipe(estado, id) { return estado.equipes.filter(function (e) { return e.id === id; })[0] || null; }
  function participante(estado, id) { return estado.participantes.filter(function (p) { return p.id === id; })[0] || null; }
  function membros(estado, equipeId) { return estado.participantes.filter(function (p) { return p.equipeId === equipeId; }); }
  function vivos(estado) { return estado.participantes.filter(function (p) { return p.vivo; }); }
  function sacrificioValidoNoDia(estado, dia) { return estado.sacrificios.filter(function (s) { return s.valido && s.dia === dia; })[0] || null; }
  function desbloqueada(estado, estigma) { return estado.intencoes.some(function (x) { return x.estigma === estigma; }); }

  /* A equipe perdeu o sacrifício: algum membro dela, sacrifício, morreu
     (ou o estigma saiu dela) e ninguém da equipe o porta mais. */
  function equipeDesertora(estado, equipeId) {
    var m = membros(estado, equipeId);
    return m.some(function (p) { return p.desertor && p.desertor.motivo === "equipe"; });
  }

  function condicaoDeDescanso(estado, equipeId) {
    var e = equipe(estado, equipeId);
    return e && e.base.melhorias.indexOf("camas") >= 0 ? "normal" : "precária";
  }

  /* =================================================================
     OPERAÇÕES
     -----------------------------------------------------------------
     Todas mudam o estado recebido e devolvem
       { ok, motivo?, avisos: [], lancamentos: [{ personagemId, lancamento }],
         desfazer: [{ personagemId, id }] }
     `rolar(faces)` pode ser injetado (testes); sem ele, Math.random.
     ================================================================= */

  function resultado() { return { ok: true, avisos: [], lancamentos: [], desfazer: [] }; }
  function falha(motivo) { return { ok: false, motivo: motivo, avisos: [], lancamentos: [], desfazer: [] }; }
  function dado(rolar, faces) { return typeof rolar === "function" ? inteiro(rolar(faces), 1, faces, 1) : 1 + Math.floor(Math.random() * faces); }

  function registrar(estado, tipo, txt, visivel) {
    estado.registro.push({ id: "reg-" + uuid(), dia: estado.dia, tipo: texto(tipo, 30), texto: texto(txt, 400), em: agora(), visivel: visivel || "todos" });
    if (estado.registro.length > MAX_REGISTRO) estado.registro = estado.registro.slice(-MAX_REGISTRO);
  }

  /* O lançamento que vai para a ficha vinculada (se houver). */
  function lancar(r, p, id, tipo, valor, motivo, origem, extra) {
    if (!p || !p.personagemId) return;
    var l = Object.assign({ id: id, tipo: tipo, valor: valor, dia: 0, motivo: texto(motivo, 200), origem: texto(origem || "Hexatombe", 80) }, extra || {});
    r.lancamentos.push({ personagemId: p.personagemId, lancamento: l });
  }

  function ligar(estado, ativo) {
    estado.ativo = !!ativo;
    registrar(estado, "modo", ativo ? "O mestre ativou o Hexatombe nesta campanha." : "O mestre desativou o Hexatombe (nada foi apagado).", "mestre");
    return resultado();
  }

  function definirFase(estado, fase, nota) {
    if (FASES.indexOf(fase) < 0) return falha("Fase desconhecida.");
    estado.fase = fase;
    estado.faseNota = texto(nota, 200);
    return resultado();
  }

  /* Só muda o dia, a fase e a produção da base (p. 17). Não resolve
     mortes, encontros, consumo nem intenções. */
  function avancarDia(estado) {
    if (estado.dia >= DIAS) return falha("O sexto dia é o último: a Lua de Sangue fecha o Hexatombe.");
    var r = resultado();
    var anterior = estado.dia;
    if (anterior >= 1 && !sacrificioValidoNoDia(estado, anterior)) {
      r.avisos.push("Nenhum sacrifício válido no dia " + anterior + ": pelas regras, o Hexatombe fracassa (p. 15). Marque o fracasso se a mesa confirmar.");
    }
    if (anterior >= 1) {
      var semConsumo = vivos(estado).filter(function (p) { return !p.consumo[anterior]; }).map(function (p) { return p.nome; });
      if (semConsumo.length) r.avisos.push("Sem consumo registrado no dia " + anterior + ": " + semConsumo.join(", ") + ". Nada foi lançado por eles.");
    }
    estado.dia = anterior + 1;
    estado.fase = "preparacao";
    estado.faseNota = "";
    estado.equipes.forEach(function (e) {
      if (e.producao[estado.dia]) return;
      var agua = 0, comida = 0;
      e.base.melhorias.forEach(function (k) {
        var m = POR_MELHORIA[k];
        if (m && m.producao) { agua += m.producao.agua || 0; comida += m.producao.comida || 0; }
      });
      e.producao[estado.dia] = true;
      if (agua || comida) {
        e.estoque.agua = Math.min(999, e.estoque.agua + agua);
        e.estoque.comida = Math.min(999, e.estoque.comida + comida);
        registrar(estado, "base", e.nome + ": a base produziu " + (agua ? agua + " água(s)" : "") + (agua && comida ? " e " : "") + (comida ? comida + " comida(s)" : "") + ".", e.id);
      }
    });
    registrar(estado, "dia", "Começa o dia " + estado.dia + ".", "todos");
    return r;
  }

  function salvarEquipe(estado, dados) {
    var id = idOk(dados && dados.id) || ("eq-" + uuid());
    var atual = equipe(estado, id);
    var nova = normalizarEquipe(Object.assign({}, atual || {}, dados || {}, { id: id }));
    if (!nova) return falha("A equipe precisa de nome.");
    if (!atual && estado.equipes.length >= MAX_EQUIPES) return falha("Limite de " + MAX_EQUIPES + " equipes.");
    if (atual) estado.equipes[estado.equipes.indexOf(atual)] = nova; else estado.equipes.push(nova);
    var r = resultado();
    r.id = id;
    return r;
  }

  function removerEquipe(estado, id) {
    if (membros(estado, id).length) return falha("Tire os participantes da equipe antes.");
    estado.equipes = estado.equipes.filter(function (e) { return e.id !== id; });
    return resultado();
  }

  function salvarParticipante(estado, dados) {
    var id = idOk(dados && dados.id) || ("pt-" + uuid());
    var atual = participante(estado, id);
    var porEquipe = {};
    estado.equipes.forEach(function (e) { porEquipe[e.id] = true; });
    var novo = normalizarParticipante(Object.assign({}, atual || {}, dados || {}, { id: id }), porEquipe);
    if (!novo) return falha("O participante precisa de nome.");
    if (!atual && estado.participantes.length >= MAX_PARTICIPANTES) return falha("Limite de participantes.");
    if (novo.sacrificio && !novo.estigma) return falha("Um sacrifício porta um estigma: escolha qual.");
    if (!novo.sacrificio) novo.estigma = "";
    if (atual) estado.participantes[estado.participantes.indexOf(atual)] = novo; else estado.participantes.push(novo);
    var r = resultado();
    r.id = id;
    return r;
  }

  function removerParticipante(estado, id) {
    estado.participantes = estado.participantes.filter(function (p) { return p.id !== id; });
    return resultado();
  }

  /* Desertor (p. 11): −1 dado em testes e PV máximos pela metade. Por
     ter saído da arena é temporário (volta ao retornar); por perder o
     sacrifício, permanente. */
  function tornarDesertor(estado, r, p, motivo) {
    if (!p || !p.vivo || p.desertor) return;
    p.desertor = { desde: estado.dia, motivo: motivo === "saiu" ? "saiu" : "equipe" };
    lancar(r, p, "hx.desertor.metade." + p.id, "pvMetade", 0, "Desertor do Hexatombe: PV máximos pela metade (AS2 p. 11)", "Desertor");
    lancar(r, p, "hx.desertor.dado." + p.id, "dadosTestes", -1, "Desertor do Hexatombe: −1 dado em testes (AS2 p. 11)", "Desertor");
  }

  function marcarDesertor(estado, participanteId, motivo) {
    var p = participante(estado, participanteId);
    if (!p || !p.vivo) return falha("Participante não encontrado ou morto.");
    if (p.desertor) return falha("Já é desertor.");
    var r = resultado();
    tornarDesertor(estado, r, p, motivo);
    registrar(estado, "desertor", p.nome + (motivo === "saiu" ? " saiu da arena e virou desertor até voltar." : " virou desertor."), "mestre");
    return r;
  }

  /* Só quem saiu da arena deixa de ser desertor ao voltar. */
  function retornarDaArena(estado, participanteId) {
    var p = participante(estado, participanteId);
    if (!p || !p.desertor) return falha("Não é desertor.");
    if (p.desertor.motivo !== "saiu") return falha("Quem perdeu o sacrifício só deixa de ser desertor ficando entre os seis finais (p. 15).");
    p.desertor = null;
    var r = resultado();
    if (p.personagemId) {
      r.desfazer.push({ personagemId: p.personagemId, id: "hx.desertor.metade." + p.id });
      r.desfazer.push({ personagemId: p.personagemId, id: "hx.desertor.dado." + p.id });
    }
    registrar(estado, "desertor", p.nome + " voltou à arena.", "mestre");
    return r;
  }

  /* A morte de alguém — a regra mais carregada do Hexatombe (p. 6, 11 e
     15). opcoes: { participanteId, por, momento: "noite"|"dia",
     causa: "morto"|"suicidio"|"acidente", rolar } */
  function registrarMorte(estado, opcoes) {
    var o = opcoes || {};
    var p = participante(estado, o.participanteId);
    if (!p) return falha("Participante não encontrado.");
    if (!p.vivo) return falha(p.nome + " já está morto.");
    var momento = o.momento === "dia" ? "dia" : "noite";
    var causa = ["morto", "suicidio", "acidente"].indexOf(o.causa) >= 0 ? o.causa : "morto";
    var algoz = causa === "morto" ? participante(estado, o.por) : null;
    var r = resultado();

    p.vivo = false;
    p.morte = { dia: estado.dia, momento: momento, causa: causa, por: algoz ? algoz.id : "" };

    if (!p.sacrificio) {
      registrar(estado, "morte", p.nome + " morreu.", "mestre");
      return r;
    }

    var valido = momento === "noite" && !sacrificioValidoNoDia(estado, estado.dia);
    var sac = { id: "sac-" + uuid(), dia: estado.dia, participanteId: p.id, estigma: p.estigma, valido: valido, por: algoz ? algoz.id : "", herdeiro: "" };
    estado.sacrificios.push(sac);
    var estigma = POR_ESTIGMA[p.estigma];

    if (valido) {
      /* O sino toca: castigo dos desertores que já existiam, intenção
         desbloqueada — e só depois a equipe do sacrifício deserta. */
      estado.participantes.forEach(function (d) {
        if (!d.vivo || !d.desertor || d.castigos >= MAX_CASTIGOS) return;
        var n = dado(o.rolar, 10);
        d.castigos += 1;
        lancar(r, d, "hx.castigo.pv." + d.id + "." + sac.id, "pvMax", -n, "Castigo da Coroa ao desertor: sacrifício nº " + d.castigos + " (−1d10 = " + n + " PV máx. e atuais)", "Desertor", { atualPv: -n });
        lancar(r, d, "hx.castigo.t." + d.id + "." + sac.id, "testes", -1, "Castigo da Coroa ao desertor: sacrifício nº " + d.castigos + " (−1 em testes)", "Desertor");
        r.avisos.push(d.nome + ": −" + n + " PV máximos e atuais, −1 em testes; Fortitude DT 20 ou fica inconsciente até o amanhecer.");
      });
      if (estigma && !desbloqueada(estado, estigma.chave)) estado.intencoes.push({ estigma: estigma.chave, dia: estado.dia, sacrificioId: sac.id });
      registrar(estado, "sacrificio", "O sino tocou: um sacrifício (" + (estigma ? estigma.nome : "sem estigma") + ") foi realizado no dia " + estado.dia + ". Intenção desbloqueada.", "todos");
      if (estado.dia >= DIAS) r.avisos.push("Sacrifício na sexta noite. Confira se há seis participantes vivos para o sacrifício final (p. 6).");
    } else {
      /* Segundo sacrifício da noite, ou morto de dia: o estigma passa a
         quem matou — ou a Coroa escolhe outro digno. */
      var herda = algoz && algoz.vivo && !algoz.sacrificio && causa === "morto";
      if (herda) {
        algoz.sacrificio = true;
        algoz.estigma = p.estigma;
        algoz.original = false;
        sac.herdeiro = algoz.id;
        registrar(estado, "estigma", algoz.nome + " herdou o estigma de " + (estigma ? estigma.nome : "?") + ".", "mestre");
      } else {
        estado.pendencias.push({ id: "pend-" + uuid(), tipo: "herdeiro", estigma: p.estigma, dia: estado.dia,
          motivo: causa === "suicidio" ? "O sacrifício tirou a própria vida num dia que já teve sacrifício (regra VIII)." : "Quem matou não pode herdar (ou foi acidente)." });
        r.avisos.push("A Coroa de Espinhos escolhe outro participante digno para o estigma. Defina o herdeiro.");
      }
      registrar(estado, "morte", p.nome + " (sacrifício) morreu " + (momento === "dia" ? "de dia" : "depois do sacrifício da noite") + ": não conta como sacrifício.", "mestre");
    }

    /* A equipe que perde o sacrifício deserta (p. 11). */
    if (p.equipeId) {
      var aindaTem = membros(estado, p.equipeId).some(function (m) { return m.vivo && m.sacrificio; });
      if (!aindaTem) {
        membros(estado, p.equipeId).forEach(function (m) { tornarDesertor(estado, r, m, "equipe"); });
        var eq = equipe(estado, p.equipeId);
        registrar(estado, "desertor", (eq ? eq.nome : "A equipe") + " perdeu o sacrifício: seus membros são desertores.", "mestre");
      }
    }
    return r;
  }

  function escolherHerdeiro(estado, pendenciaId, participanteId) {
    var pend = estado.pendencias.filter(function (x) { return x.id === pendenciaId; })[0];
    if (!pend) return falha("Pendência não encontrada.");
    var h = participante(estado, participanteId);
    if (!h || !h.vivo) return falha("O herdeiro precisa estar vivo.");
    if (h.sacrificio) return falha("Quem já é sacrifício não herda outro estigma.");
    h.sacrificio = true;
    h.estigma = pend.estigma;
    h.original = false;
    estado.pendencias = estado.pendencias.filter(function (x) { return x !== pend; });
    registrar(estado, "estigma", "A Coroa escolheu " + h.nome + " para o estigma de " + POR_ESTIGMA[pend.estigma].nome + ".", "mestre");
    return resultado();
  }

  /* Consumo do dia (p. 20): ao menos 1 água e 1 comida por participante
     até a conclusão. Faltando, −10 PV (ou PE) máximos a partir do dia
     seguinte; recupera consumindo 1 unidade a mais no fim de um dia
     seguinte. Tira do estoque da equipe. */
  function consumir(estado, participanteId, agua, comida) {
    var p = participante(estado, participanteId);
    if (!p || !p.vivo) return falha("Participante não encontrado ou morto.");
    if (estado.dia < 1) return falha("O Hexatombe ainda não começou (dia 0).");
    if (p.consumo[estado.dia]) return falha(p.nome + " já tem o consumo do dia " + estado.dia + " registrado. Desfaça antes de registrar de novo.");
    var a = inteiro(agua, 0, 9, 0), c = inteiro(comida, 0, 9, 0);
    var eq = equipe(estado, p.equipeId);
    if (eq && (eq.estoque.agua < a || eq.estoque.comida < c)) return falha("O estoque da equipe não tem o suficiente.");
    if (eq) { eq.estoque.agua -= a; eq.estoque.comida -= c; }
    p.consumo[estado.dia] = { agua: a, comida: c };
    var r = resultado();
    regraDoRecurso(estado, r, p, "sede", a, "pvMax", "PV");
    regraDoRecurso(estado, r, p, "fome", c, "peMax", "PE");
    if (a >= 3 && c >= 3 && desbloqueada(estado, "prazer") && !p.intencoes.prazer) {
      r.avisos.push(p.nome + " consumiu 3 águas e 3 comidas: a intenção do Prazer pode ter sido cumprida (confirme).");
    }
    registrar(estado, "consumo", p.nome + ": " + a + " água(s), " + c + " comida(s).", eq ? eq.id : "mestre");
    return r;
  }

  function regraDoRecurso(estado, r, p, chave, qtd, tipo, sigla) {
    if (qtd < 1) {
      p[chave] += 1;
      lancar(r, p, "hx." + chave + "." + p.id + ".d" + estado.dia, tipo, -10,
        (chave === "sede" ? "Sem água" : "Sem comida") + " no dia " + estado.dia + ": −10 " + sigla + " máximos (AS2 p. 20)", "Hexatombe", { dia: estado.dia + 1 });
      return;
    }
    if (qtd >= 2 && p[chave] > 0) {
      /* A unidade a mais recupera o déficit mais antigo ainda aberto. */
      var campo = chave === "sede" ? "agua" : "comida";
      var jaRecuperados = p.recuperados.map(function (x) { return x.split("@")[0]; });
      var dia = Object.keys(p.consumo).map(Number).sort(function (x, y) { return x - y; }).filter(function (d) {
        return d < estado.dia && p.consumo[d][campo] < 1 && jaRecuperados.indexOf(chave + "." + d) < 0;
      })[0];
      p[chave] -= 1;
      if (dia) {
        p.recuperados.push(chave + "." + dia + "@" + estado.dia);
        if (p.personagemId) r.desfazer.push({ personagemId: p.personagemId, id: "hx." + chave + "." + p.id + ".d" + dia });
        r.avisos.push(p.nome + " recuperou os máximos perdidos " + (chave === "sede" ? "por sede" : "por fome") + " no dia " + dia + ".");
      }
    }
  }

  function desfazerConsumo(estado, participanteId, dia) {
    var p = participante(estado, participanteId);
    var d = inteiro(dia, 1, DIAS, 0);
    if (!p || !p.consumo[d]) return falha("Nada registrado nesse dia.");
    var c = p.consumo[d];
    var eq = equipe(estado, p.equipeId);
    if (eq) { eq.estoque.agua = Math.min(999, eq.estoque.agua + c.agua); eq.estoque.comida = Math.min(999, eq.estoque.comida + c.comida); }
    delete p.consumo[d];
    var r = resultado();
    if (c.agua < 1) { p.sede = Math.max(0, p.sede - 1); if (p.personagemId) r.desfazer.push({ personagemId: p.personagemId, id: "hx.sede." + p.id + ".d" + d }); }
    if (c.comida < 1) { p.fome = Math.max(0, p.fome - 1); if (p.personagemId) r.desfazer.push({ personagemId: p.personagemId, id: "hx.fome." + p.id + ".d" + d }); }
    /* A unidade a mais daquele dia tinha recuperado um déficit: ele volta. */
    p.recuperados = p.recuperados.filter(function (x) {
      var m = /^(sede|fome)\.(\d)@(\d)$/.exec(x);
      if (!m || Number(m[3]) !== d) return true;
      p[m[1]] += 1;
      lancar(r, p, "hx." + m[1] + "." + p.id + ".d" + m[2], m[1] === "sede" ? "pvMax" : "peMax", -10,
        (m[1] === "sede" ? "Sem água" : "Sem comida") + " no dia " + m[2] + ": −10 " + (m[1] === "sede" ? "PV" : "PE") + " máximos (AS2 p. 20)", "Hexatombe", { dia: Number(m[2]) + 1, refazer: true });
      return false;
    });
    registrar(estado, "consumo", "Consumo de " + p.nome + " no dia " + d + " desfeito (o estoque voltou).", "mestre");
    return r;
  }

  /* Fazer melhorias (p. 16): teste contra DT 20. Passa, faz e gasta;
     falha, nada; falha por 5 ou mais, gasta a sucata sem fazer. */
  function tentarMelhoria(estado, equipeId, chave, total) {
    var e = equipe(estado, equipeId);
    var m = POR_MELHORIA[chave];
    if (!e || !m) return falha("Equipe ou melhoria desconhecida.");
    if (m.recurso) return falha(m.nome + " depende de um recurso específico: instale pela mesa quando o grupo o conseguir.");
    if (e.base.melhorias.indexOf(chave) >= 0) return falha("A base já tem " + m.nome + ".");
    if (chave !== "limpeza" && e.base.melhorias.indexOf("limpeza") < 0) return falha("A limpeza da base vem antes de qualquer outra melhoria.");
    if (e.estoque.sucata < m.custo) return falha("Sucata insuficiente: precisa de " + m.custo + ".");
    var n = Math.round(Number(total));
    if (!Number.isFinite(n)) return falha("Informe o resultado do teste.");
    var r = resultado();
    if (n >= DT_MELHORIA) {
      e.estoque.sucata -= m.custo;
      e.base.melhorias.push(chave);
      r.feito = true;
      registrar(estado, "base", e.nome + " construiu " + m.nome + " (teste " + n + ").", e.id);
    } else if (n <= DT_MELHORIA - 5) {
      e.estoque.sucata -= m.custo;
      r.perdeu = true;
      registrar(estado, "base", e.nome + " falhou por 5 ou mais em " + m.nome + " (teste " + n + "): a sucata quebrou.", e.id);
    } else {
      registrar(estado, "base", e.nome + " não conseguiu fazer " + m.nome + " (teste " + n + "); a sucata ficou.", e.id);
    }
    return r;
  }

  function instalarMelhoriaEspecial(estado, equipeId, chave) {
    var e = equipe(estado, equipeId);
    var m = POR_MELHORIA[chave];
    if (!e || !m || !m.recurso) return falha("Melhoria especial desconhecida.");
    if (e.base.melhorias.indexOf(chave) >= 0) return falha("Já instalada.");
    if (e.base.melhorias.indexOf("limpeza") < 0) return falha("A limpeza da base vem antes de qualquer outra melhoria.");
    e.base.melhorias.push(chave);
    registrar(estado, "base", e.nome + " instalou " + m.nome + " (" + m.recurso + ").", e.id);
    return resultado();
  }

  function removerMelhoria(estado, equipeId, chave) {
    var e = equipe(estado, equipeId);
    if (!e || e.base.melhorias.indexOf(chave) < 0) return falha("A base não tem essa melhoria.");
    e.base.melhorias = e.base.melhorias.filter(function (k) { return k !== chave; });
    registrar(estado, "base", e.nome + " perdeu " + POR_MELHORIA[chave].nome + ".", "mestre");
    return resultado();
  }

  /* ---------------- Arquivos Secretos 3 (p. 121) ---------------- */

  function definirRegrasAs3(estado, regras) {
    var r = regras && typeof regras === "object" ? regras : {};
    estado.regrasAs3 = { trocas: r.trocas === true, construcao: r.construcao === true };
    registrar(estado, "regras", "Regras do Arquivos Secretos 3: trocas de recursos " + (r.trocas ? "ligadas" : "desligadas") +
      ", tempo de construção " + (r.construcao ? "ligado" : "desligado") + ".", "mestre");
    return resultado();
  }

  /* Tempo de Construção de Base: 7 dias para uma pessoa, −1 por pessoa a
     mais, mínimo 3. As melhorias improvisadas (tentarMelhoria, AS2 p. 16)
     continuam valendo ao lado desta regra. A sucata da melhoria sai no
     começo da obra; a obra só termina quando a mesa conclui. */
  function diasDeObra(pessoas) { return Math.max(3, 7 - (inteiro(pessoas, 1, 99, 1) - 1)); }

  function iniciarObra(estado, equipeId, chave, pessoas, nota) {
    if (!estado.regrasAs3 || !estado.regrasAs3.construcao) return falha("A regra Tempo de Construção de Base (Arquivos Secretos 3, p. 121) está desligada.");
    var e = equipe(estado, equipeId);
    var m = POR_MELHORIA[chave];
    if (!e || !m) return falha("Equipe ou melhoria desconhecida.");
    if (m.recurso) return falha(m.nome + " depende de um recurso específico: instale pela mesa quando o grupo o conseguir.");
    if (e.base.melhorias.indexOf(chave) >= 0) return falha("A base já tem " + m.nome + ".");
    if (chave !== "limpeza" && e.base.melhorias.indexOf("limpeza") < 0) return falha("A limpeza da base vem antes de qualquer outra melhoria.");
    if (lista(e.obras).some(function (o) { return o.melhoria === chave; })) return falha(m.nome + " já está em obra.");
    if (e.estoque.sucata < m.custo) return falha("Sucata insuficiente: precisa de " + m.custo + ".");
    var n = inteiro(pessoas, 1, 99, 1);
    var obra = { id: "ob-" + uuid(), melhoria: chave, inicio: estado.dia, pessoas: n, dias: diasDeObra(n), nota: texto(nota, 200) };
    e.estoque.sucata -= m.custo;
    if (!Array.isArray(e.obras)) e.obras = [];
    e.obras.push(obra);
    registrar(estado, "base", e.nome + " começou a construir " + m.nome + " com " + n + " pessoa(s): " + obra.dias + " dias (pronta no dia " + (obra.inicio + obra.dias) + ").", e.id);
    var r = resultado();
    r.obra = obra;
    return r;
  }

  function concluirObra(estado, equipeId, obraId, forcar) {
    var e = equipe(estado, equipeId);
    var obra = e ? lista(e.obras).filter(function (o) { return o.id === obraId; })[0] : null;
    if (!obra) return falha("Obra desconhecida.");
    var pronta = obra.inicio + obra.dias;
    if (estado.dia < pronta && !forcar) return falha("A obra fica pronta no dia " + pronta + " (hoje é o dia " + estado.dia + ").");
    e.obras = e.obras.filter(function (o) { return o.id !== obraId; });
    if (e.base.melhorias.indexOf(obra.melhoria) < 0) e.base.melhorias.push(obra.melhoria);
    registrar(estado, "base", e.nome + " terminou " + POR_MELHORIA[obra.melhoria].nome + ".", e.id);
    return resultado();
  }

  function cancelarObra(estado, equipeId, obraId) {
    var e = equipe(estado, equipeId);
    var obra = e ? lista(e.obras).filter(function (o) { return o.id === obraId; })[0] : null;
    if (!obra) return falha("Obra desconhecida.");
    e.obras = e.obras.filter(function (o) { return o.id !== obraId; });
    registrar(estado, "base", e.nome + " abandonou a obra de " + POR_MELHORIA[obra.melhoria].nome + " (a sucata gasta não volta).", e.id);
    return resultado();
  }

  /* Trocas de Recursos: informação (1 recurso) ou segredo (3), pagos em
     água, comida ou sucata — o NPC pode exigir um só tipo. */
  var CUSTO_DA_TROCA = { informacao: 1, segredo: 3 };

  function registrarTroca(estado, dados) {
    if (!estado.regrasAs3 || !estado.regrasAs3.trocas) return falha("A regra Trocas de Recursos (Arquivos Secretos 3, p. 121) está desligada.");
    var d = dados && typeof dados === "object" ? dados : {};
    var e = equipe(estado, d.equipeId);
    if (!e) return falha("Equipe desconhecida.");
    var tipo = d.tipo === "segredo" ? "segredo" : "informacao";
    var pg = d.pagamento && typeof d.pagamento === "object" ? d.pagamento : {};
    var pagamento = { agua: inteiro(pg.agua, 0, 3, 0), comida: inteiro(pg.comida, 0, 3, 0), sucata: inteiro(pg.sucata, 0, 3, 0) };
    var soma = pagamento.agua + pagamento.comida + pagamento.sucata;
    if (soma !== CUSTO_DA_TROCA[tipo]) return falha((tipo === "segredo" ? "Um segredo custa 3 recursos" : "Uma informação custa 1 recurso") + "; o pagamento soma " + soma + ".");
    var so = d.so === "agua" || d.so === "comida" || d.so === "sucata" ? d.so : "";
    if (so && pagamento[so] !== soma) return falha("O NPC só aceita " + so + ".");
    if (e.estoque.agua < pagamento.agua || e.estoque.comida < pagamento.comida || e.estoque.sucata < pagamento.sucata) return falha("O estoque da equipe não tem o suficiente.");
    e.estoque.agua -= pagamento.agua;
    e.estoque.comida -= pagamento.comida;
    e.estoque.sucata -= pagamento.sucata;
    var t = { id: "tr-" + uuid(), dia: estado.dia, equipeId: e.id, npc: texto(d.npc, 60), tipo: tipo, pagamento: pagamento, sobre: texto(d.sobre, 80), conteudo: texto(d.conteudo, 600) };
    if (!Array.isArray(estado.trocas)) estado.trocas = [];
    estado.trocas.push(t);
    estado.trocas = estado.trocas.slice(-40);
    registrar(estado, "troca", e.nome + " trocou " + soma + " recurso(s) por " + (tipo === "segredo" ? "um segredo" : "uma informação") + (t.sobre ? " sobre " + t.sobre : "") + (t.npc ? " com " + t.npc : "") + ".", e.id);
    var r = resultado();
    r.troca = t;
    return r;
  }

  /* ---------------- exploração (p. 18–19) ---------------- */

  function salvarArea(estado, dados) {
    var id = idOk(dados && dados.id) || ("ar-" + uuid());
    var nome = texto(dados && dados.nome, 60);
    if (!nome) return falha("A área precisa de nome.");
    var atual = estado.areas.filter(function (a) { return a.id === id; })[0];
    if (atual) atual.nome = nome;
    else {
      if (estado.areas.length >= 40) return falha("Limite de áreas.");
      estado.areas.push({ id: id, nome: nome, explorada: !!(dados && dados.explorada) });
    }
    var r = resultado();
    r.id = id;
    return r;
  }

  function rotaPercorrida(estado, de, para) {
    return estado.rotas.some(function (x) { return (x.de === de && x.para === para) || (x.de === para && x.para === de); });
  }

  /* Teste de jornada: só para área ainda não explorada por esse caminho.
     Falhar não impede de chegar — só sorteia uma consequência ruim.
     Perícia que não Sobrevivência: uma vez no Hexatombe inteiro, por
     personagem. opcoes: { de, para, testadorId, pericia, passou, rolar } */
  function registrarJornada(estado, opcoes) {
    var o = opcoes || {};
    var de = idOk(o.de), para = idOk(o.para);
    var destino = estado.areas.filter(function (a) { return a.id === para; })[0];
    if (!destino) return falha("Escolha o destino.");
    var r = resultado();
    var origem = estado.areas.filter(function (a) { return a.id === de; })[0];
    var conhecida = origem && rotaPercorrida(estado, de, para);
    if (conhecida) {
      r.semTeste = true;
      registrar(estado, "jornada", "Jornada por caminho já percorrido (" + origem.nome + " → " + destino.nome + "): sem teste.", "todos");
      return r;
    }
    var testador = participante(estado, o.testadorId);
    var pericia = texto(o.pericia, 40) || "Sobrevivência";
    if (pericia !== "Sobrevivência") {
      if (!testador) return falha("Quem fez o teste com outra perícia?");
      if (testador.alternativas.indexOf(pericia) >= 0) return falha(testador.nome + " já usou " + pericia + " numa jornada: perícia que não Sobrevivência vale uma vez no Hexatombe.");
      testador.alternativas.push(pericia);
    }
    if (typeof o.passou !== "boolean") return falha("Informe se o teste passou.");
    if (!o.passou) {
      var n = o.d6 ? inteiro(o.d6, 1, 6, 1) : dado(o.rolar, 6);
      r.consequencia = CONSEQUENCIAS[n - 1];
      r.avisos.push("Consequência (" + n + "): " + r.consequencia.nome + " — " + r.consequencia.texto);
    }
    destino.explorada = true;
    if (origem && !rotaPercorrida(estado, de, para)) estado.rotas.push({ de: de, para: para });
    registrar(estado, "jornada", "Jornada até " + destino.nome + " (" + pericia + (o.passou ? ", passou" : ", falhou: " + r.consequencia.nome) + "). O grupo chegou.", "todos");
    return r;
  }

  /* Procurar recursos (p. 20): um teste por personagem em cada local. */
  function procurarRecursos(estado, opcoes) {
    var o = opcoes || {};
    var p = participante(estado, o.participanteId);
    var area = estado.areas.filter(function (a) { return a.id === o.areaId; })[0];
    if (!p || !p.vivo || !area) return falha("Escolha quem procura e onde.");
    if (p.procuras.indexOf(area.id) >= 0) return falha(p.nome + " já vasculhou " + area.nome + ".");
    var total = Math.round(Number(o.total));
    if (!Number.isFinite(total)) return falha("Informe o resultado do teste.");
    var alcancadas = COLUNAS_DE_RECURSO.map(function (c, i) { return total >= c ? i : -1; }).filter(function (i) { return i >= 0; });
    var colunas = !alcancadas.length ? [] : (estado.leituraDeRecursos === "cumulativa" ? alcancadas : [alcancadas[alcancadas.length - 1]]);
    var r = resultado();
    r.achados = colunas.map(function (col, i) {
      var n = o.d12 && o.d12[i] ? inteiro(o.d12[i], 1, 12, 1) : dado(o.rolar, 12);
      return { coluna: COLUNAS_DE_RECURSO[col], d12: n, nome: RECURSOS_ENCONTRADOS[n - 1][col] };
    });
    p.procuras.push(area.id);
    var eq = equipe(estado, p.equipeId);
    r.achados.forEach(function (a) {
      if (!eq) return;
      if (a.nome === "Água") eq.estoque.agua = Math.min(999, eq.estoque.agua + 1);
      else if (a.nome === "Comida") eq.estoque.comida = Math.min(999, eq.estoque.comida + 1);
      else if (a.nome === "Sucata") eq.estoque.sucata = Math.min(999, eq.estoque.sucata + 1);
      else {
        var it = eq.estoque.itens.filter(function (x) { return x.nome === a.nome; })[0];
        if (it) it.qtd = Math.min(999, it.qtd + 1);
        else if (eq.estoque.itens.length < 40) eq.estoque.itens.push({ nome: a.nome, qtd: 1 });
      }
    });
    registrar(estado, "recursos", p.nome + " procurou recursos em " + area.nome + " (teste " + total + "): " +
      (r.achados.length ? r.achados.map(function (a) { return a.nome; }).join(", ") : "nada") + ".", eq ? eq.id : "mestre");
    return r;
  }

  function rolarEncontro(estado, tipo, opcoes) {
    var t = ENCONTROS[tipo];
    if (!t) return falha("Tipo de encontro desconhecido.");
    var o = opcoes || {};
    var n = o.valor ? inteiro(o.valor, 1, t.dado, 1) : dado(o.rolar, t.dado);
    var faixa = t.faixas.filter(function (f) { return n <= f[0]; })[0];
    var r = resultado();
    r.encontro = { tipo: tipo, nome: faixa[1], texto: faixa[2], valor: n, dado: t.dado };
    registrar(estado, "encontro", "Encontro " + t.nome.toLowerCase() + " (1d" + t.dado + " = " + n + "): " + faixa[1] + ".", o.visivel || "mestre");
    return r;
  }

  /* Intenção cumprida (p. 24): só com o estigma desbloqueado, uma vez
     por participante. A recompensa vira lançamento na ficha. */
  function cumprirIntencao(estado, participanteId, estigma) {
    var p = participante(estado, participanteId);
    var e = POR_ESTIGMA[estigma];
    if (!p || !e) return falha("Participante ou estigma desconhecido.");
    if (!p.vivo) return falha(p.nome + " está morto.");
    if (!desbloqueada(estado, estigma)) return falha("A intenção de " + e.nome + " ainda não foi desbloqueada por um sacrifício.");
    if (p.intencoes[estigma]) return falha(p.nome + " já cumpriu a intenção de " + e.nome + ".");
    p.intencoes[estigma] = { dia: estado.dia };
    var r = resultado();
    lancar(r, p, "hx.intencao." + p.id + "." + estigma, e.lancamento.tipo, e.lancamento.valor,
      "Intenção cumprida: " + e.sentimentos + " — " + e.recompensa + " (AS2 p. 24)", "Intenção");
    registrar(estado, "intencao", p.nome + " cumpriu a intenção de " + e.nome + ".", p.equipeId || "mestre");
    return r;
  }

  function desfazerIntencao(estado, participanteId, estigma) {
    var p = participante(estado, participanteId);
    if (!p || !p.intencoes[estigma]) return falha("Nada a desfazer.");
    delete p.intencoes[estigma];
    var r = resultado();
    if (p.personagemId) r.desfazer.push({ personagemId: p.personagemId, id: "hx.intencao." + p.id + "." + estigma });
    registrar(estado, "intencao", "Intenção de " + POR_ESTIGMA[estigma].nome + " desfeita para " + p.nome + ".", "mestre");
    return r;
  }

  /* A meia-noite do sexto dia (p. 6 e 11): sem o sacrifício final, os
     desertores definham. A mesa confirma. */
  function luaDeSangue(estado, sacrificioFinalFeito) {
    if (estado.dia < DIAS) return falha("A Lua de Sangue é na sexta noite.");
    var r = resultado();
    var restantes = vivos(estado).length;
    if (sacrificioFinalFeito) {
      if (restantes !== 6) r.avisos.push("O sacrifício final pede exatamente seis presentes; há " + restantes + " vivos. Com menos de seis, o Hexatombe fracassa (regra X).");
      estado.participantes.forEach(function (p) {
        if (p.vivo && p.sacrificio && p.original) r.avisos.push(p.nome + " foi eleito sacrifício na origem: pela regra VI, estará morto ao fim do sexto dia.");
      });
      registrar(estado, "final", "O sacrifício final foi realizado sob a Lua de Sangue.", "todos");
      return r;
    }
    estado.participantes.forEach(function (p) {
      if (!p.vivo || !p.desertor) return;
      p.vivo = false;
      p.morte = { dia: estado.dia, momento: "noite", causa: "lua", por: "" };
      r.avisos.push(p.nome + " definhou sob a Lua de Sangue.");
    });
    registrar(estado, "final", "Meia-noite sem o sacrifício final: os desertores definharam.", "todos");
    return r;
  }

  function marcarFracasso(estado, fracassou) {
    estado.fracassou = !!fracassou;
    registrar(estado, "final", fracassou ? "O Hexatombe fracassou." : "Fracasso desmarcado pela mesa.", "todos");
    return resultado();
  }

  function anotar(estado, txt, visivel) {
    if (!texto(txt, 400)) return falha("Escreva algo.");
    registrar(estado, "nota", txt, visivel || "mestre");
    return resultado();
  }

  /* Os lançamentos que ainda não chegaram às fichas ficam pendentes no
     estado até o envio dar certo (o id estável impede a duplicação). */
  function guardarPendentes(estado, r) {
    (r.lancamentos || []).forEach(function (x) { estado.pendentes.push({ personagemId: x.personagemId, desfazer: false, lancamento: copiar(x.lancamento) }); });
    (r.desfazer || []).forEach(function (x) { estado.pendentes.push({ personagemId: x.personagemId, desfazer: true, lancamento: { id: x.id, tipo: "nota", valor: 0 } }); });
    if (estado.pendentes.length > MAX_PENDENTES) estado.pendentes = estado.pendentes.slice(-MAX_PENDENTES);
  }

  function marcarPendente(estado, personagemId, id, motivo) {
    estado.pendentes.forEach(function (x) {
      if (x.personagemId === personagemId && x.lancamento.id === id && !x.desfazer) x.motivo = motivo === "participacao_desligada" ? motivo : "";
    });
  }

  function tirarPendente(estado, personagemId, id, desfazer) {
    estado.pendentes = estado.pendentes.filter(function (x) {
      return !(x.personagemId === personagemId && x.lancamento.id === id && !!x.desfazer === !!desfazer);
    });
  }

  /* =================================================================
     A VISTA DO JOGADOR — a mesma do servidor (Campanhas.gs). Recebe os
     ids dos personagens da pessoa. Equipes rivais: só o nome. Nada de
     notas do mestre, pendências ou registro alheio.
     ================================================================= */

  function vistaDoJogador(bruto, personagemIds) {
    var e = normalizar(bruto);
    if (!e.ativo) return { ativo: false };
    var meus = {};
    lista(personagemIds).forEach(function (id) { meus[String(id)] = true; });
    var minhasEquipes = {};
    e.participantes.forEach(function (p) { if (p.personagemId && meus[p.personagemId] && p.equipeId) minhasEquipes[p.equipeId] = true; });
    return {
      ativo: true, nome: e.nome, dia: e.dia, fase: e.fase, faseNota: e.faseNota, fracassou: e.fracassou,
      equipes: e.equipes.map(function (q) {
        if (!minhasEquipes[q.id]) return { id: q.id, nome: q.nome, rival: true };
        return { id: q.id, nome: q.nome, base: q.base, estoque: q.estoque, obras: q.obras, descanso: condicaoDeDescanso(e, q.id) };
      }),
      participantes: e.participantes.filter(function (p) { return minhasEquipes[p.equipeId]; }).map(function (p) {
        var meu = !!(p.personagemId && meus[p.personagemId]);
        var x = { id: p.id, nome: p.nome, equipeId: p.equipeId, sacrificio: p.sacrificio, estigma: p.estigma, vivo: p.vivo, desertor: !!p.desertor, meu: meu };
        if (meu) { x.intencoes = p.intencoes; x.consumo = p.consumo; x.sede = p.sede; x.fome = p.fome; x.castigos = p.castigos; x.alternativas = p.alternativas; }
        return x;
      }),
      sacrificios: e.sacrificios.filter(function (s) { return s.valido; }).map(function (s) { return { dia: s.dia, estigma: s.estigma }; }),
      intencoes: e.intencoes.map(function (x) { return { estigma: x.estigma, dia: x.dia }; }),
      areas: e.areas,
      rotas: e.rotas,
      registro: e.registro.filter(function (r) { return r.visivel === "todos" || minhasEquipes[r.visivel]; }),
      regrasAs3: e.regrasAs3,
      /* Só as trocas da própria equipe: o conteúdo é dela e da mesa. */
      trocas: e.trocas.filter(function (t) { return minhasEquipes[t.equipeId]; }),
    };
  }

  global.RAMAHexatombe = {
    DIAS: DIAS,
    FASES: FASES,
    NOMES_FASE: NOMES_FASE,
    ESTIGMAS: ESTIGMAS,
    POR_ESTIGMA: POR_ESTIGMA,
    MELHORIAS: MELHORIAS,
    POR_MELHORIA: POR_MELHORIA,
    DT_MELHORIA: DT_MELHORIA,
    ACOES_DE_DESCANSO: ACOES_DE_DESCANSO,
    CONSEQUENCIAS: CONSEQUENCIAS,
    RECURSOS_ENCONTRADOS: RECURSOS_ENCONTRADOS,
    COLUNAS_DE_RECURSO: COLUNAS_DE_RECURSO,
    ENCONTROS: ENCONTROS,
    MAX_CASTIGOS: MAX_CASTIGOS,

    normalizar: normalizar,
    vazio: vazio,
    equipe: equipe,
    participante: participante,
    membros: membros,
    vivos: vivos,
    desbloqueada: desbloqueada,
    equipeDesertora: equipeDesertora,
    condicaoDeDescanso: condicaoDeDescanso,
    rotaPercorrida: rotaPercorrida,

    ligar: ligar,
    definirFase: definirFase,
    avancarDia: avancarDia,
    salvarEquipe: salvarEquipe,
    removerEquipe: removerEquipe,
    salvarParticipante: salvarParticipante,
    removerParticipante: removerParticipante,
    marcarDesertor: marcarDesertor,
    retornarDaArena: retornarDaArena,
    registrarMorte: registrarMorte,
    escolherHerdeiro: escolherHerdeiro,
    consumir: consumir,
    desfazerConsumo: desfazerConsumo,
    tentarMelhoria: tentarMelhoria,
    instalarMelhoriaEspecial: instalarMelhoriaEspecial,
    removerMelhoria: removerMelhoria,
    salvarArea: salvarArea,
    registrarJornada: registrarJornada,
    procurarRecursos: procurarRecursos,
    rolarEncontro: rolarEncontro,
    cumprirIntencao: cumprirIntencao,
    desfazerIntencao: desfazerIntencao,
    luaDeSangue: luaDeSangue,
    marcarFracasso: marcarFracasso,
    anotar: anotar,
    guardarPendentes: guardarPendentes,
    tirarPendente: tirarPendente,
    marcarPendente: marcarPendente,
    vistaDoJogador: vistaDoJogador,
    definirRegrasAs3: definirRegrasAs3,
    diasDeObra: diasDeObra,
    iniciarObra: iniciarObra,
    concluirObra: concluirObra,
    cancelarObra: cancelarObra,
    CUSTO_DA_TROCA: CUSTO_DA_TROCA,
    registrarTroca: registrarTroca,
  };
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
/* <<< js/ordem/hexatombe.js */

var MAX_OPS_HEXATOMBE = 50;
var MAX_LANCAMENTOS_POR_PEDIDO = 30;
var TIPOS_DE_LANCAMENTO_HEX = ['pvMax', 'peMax', 'pvMetade', 'rd', 'testes', 'dadosTestes', 'dano', 'nota'];

function registroDoHexatombe(campanhaId) {
  try {
    return acharPor(ABAS.CAMPANHA_HEXATOMBE, 'campanhaId', String(campanhaId));
  } catch (erro) {
    /* Sem a aba (setupRama desta versão ainda não rodou): não há
       Hexatombe nesta campanha. */
    return null;
  }
}

/* Para o cabeçalho da campanha: só se está ligado. */
function hexatombeAtivo(campanhaId) {
  try {
    var leve = lerLeves(ABAS.CAMPANHA_HEXATOMBE).filter(function (r) { return String(r.campanhaId) === String(campanhaId); })[0];
    return !!leve && (leve.ativo === true || String(leve.ativo) === 'true');
  } catch (erro) {
    return false;
  }
}

function idsDosMeusPersonagens(campanhaId, usuario) {
  return daCampanhaLeves(ABAS.PERSONAGENS, campanhaId)
    .filter(function (r) { return meu(r, usuario); })
    .map(function (r) { return String(r.id); });
}

function estadoDoHexatombe(registro) {
  return RAMAHexatombe.normalizar(registro ? lerJson(registro.dadosJson, {}) : {});
}

function hexatombeParaCliente(ctx, registro, usuario) {
  var estado = estadoDoHexatombe(registro);
  var rev = registro ? Number(registro.rev) || 0 : 0;
  if (ctx.mestre) return { mestre: true, rev: rev, estado: estado };
  return { mestre: false, rev: rev, vista: RAMAHexatombe.vistaDoJogador(estado, idsDosMeusPersonagens(ctx.campanha.id, usuario)) };
}

function acaoLerHexatombe(corpo, usuario) {
  var ctx = contextoDaCampanha(corpo.campanhaId, usuario);
  if (!ctx.ok) return ctx;
  if (ctx.papel === PAPEL_ESPECTADOR) return { ok: false, erro: 'sem_permissao' };
  var registro = registroDoHexatombe(ctx.campanha.id);
  var dados = hexatombeParaCliente(ctx, registro, usuario);
  return { ok: true, rev: dados.rev, dados: dados };
}

function acaoSalvarHexatombe(corpo, usuario) {
  var opId = String(corpo.opId || '');
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(opId)) return { ok: false, erro: 'dados_invalidos' };
  if (!corpo.estado || typeof corpo.estado !== 'object' || Array.isArray(corpo.estado)) return { ok: false, erro: 'dados_invalidos' };
  var revPedida = Number(corpo.rev);
  if (!Number.isFinite(revPedida)) return { ok: false, erro: 'dados_invalidos' };

  return comTrava(function () {
    var ctx = exigirMestre(corpo.campanhaId, usuario);
    if (!ctx.ok) return ctx;
    try {
      aba(ABAS.CAMPANHA_HEXATOMBE);
    } catch (erro) {
      return { ok: false, erro: 'instalacao_incompleta', detalhe: 'CAMPANHA_HEXATOMBE' };
    }

    var registro = registroDoHexatombe(ctx.campanha.id);
    var revAtual = registro ? Number(registro.rev) || 0 : 0;
    var feitas = registro ? (lerJson(registro.opsJson, []) || []) : [];
    if (!Array.isArray(feitas)) feitas = [];

    if (feitas.indexOf(opId) >= 0) {
      return { ok: true, repetida: true, rev: revAtual, dados: hexatombeParaCliente(ctx, registro, usuario) };
    }
    if (revPedida !== revAtual) {
      return { ok: false, erro: 'conflito', rev: revAtual, dados: hexatombeParaCliente(ctx, registro, usuario) };
    }

    var anterior = estadoDoHexatombe(registro);
    var estado = RAMAHexatombe.normalizar(corpo.estado);

    /* Vínculo só com personagem DESTA campanha. */
    var daMesa = {};
    daCampanhaLeves(ABAS.PERSONAGENS, ctx.campanha.id).forEach(function (r) { daMesa[String(r.id)] = true; });
    estado.participantes.forEach(function (p) { if (p.personagemId && !daMesa[p.personagemId]) p.personagemId = ''; });
    estado.pendentes = estado.pendentes.filter(function (x) { return daMesa[x.personagemId]; });

    /* O diário cede primeiro quando o estado não cabe na célula. */
    var json = JSON.stringify(estado);
    while (json.length > MAX_CELULA && estado.registro.length) {
      estado.registro = estado.registro.slice(Math.ceil(estado.registro.length / 4) || 1);
      json = JSON.stringify(estado);
    }
    if (json.length > MAX_CELULA) return { ok: false, erro: 'dados_grandes' };

    feitas.push(opId);
    if (feitas.length > MAX_OPS_HEXATOMBE) feitas = feitas.slice(feitas.length - MAX_OPS_HEXATOMBE);
    var agora = new Date().toISOString();
    var novo = {
      campanhaId: String(ctx.campanha.id),
      ativo: estado.ativo,
      dia: estado.dia,
      atualizadoEm: agora,
      rev: revAtual + 1,
      opsJson: JSON.stringify(feitas),
      dadosJson: json,
    };
    if (registro) atualizarLinha(ABAS.CAMPANHA_HEXATOMBE, registro._linha, Object.assign({}, registro, novo));
    else inserir(ABAS.CAMPANHA_HEXATOMBE, novo);

    var partes = ['hexatombe'];
    if (anterior.ativo !== estado.ativo) partes.push('campanha');
    marcarMesa(ctx.campanha.id, partes);
    var gravado = registroDoHexatombe(ctx.campanha.id);
    return { ok: true, rev: revAtual + 1, dados: hexatombeParaCliente(ctx, gravado, usuario) };
  });
}

/* Um lançamento recebido, limpo. null = não vale. */
function lancamentoHexRecebido(l, usuario, dia) {
  if (!l || typeof l !== 'object') return null;
  var id = String(l.id || '');
  if (!/^[A-Za-z0-9_.:|#-]{1,80}$/.test(id)) return null;
  if (TIPOS_DE_LANCAMENTO_HEX.indexOf(l.tipo) < 0) return null;
  var valor = Math.round(Number(l.valor)) || 0;
  return {
    id: id, tipo: l.tipo, valor: Math.max(-999, Math.min(999, valor)),
    dia: Math.max(0, Math.min(99, Math.round(Number(l.dia)) || dia || 0)),
    motivo: textoLimpo(l.motivo, 200), origem: textoLimpo(l.origem || 'Hexatombe', 80),
    em: new Date().toISOString(), por: textoLimpo(usuario.nome || usuario.usuario, 80), desfeito: '',
  };
}

function acaoLancarHexatombe(corpo, usuario) {
  var itens = Array.isArray(corpo.itens) ? corpo.itens : null;
  if (!itens || !itens.length || itens.length > MAX_LANCAMENTOS_POR_PEDIDO) return { ok: false, erro: 'dados_invalidos' };
  var operacao = idDeOperacao(corpo.operacaoId);

  return comTrava(function () {
    var ctx = exigirMestre(corpo.campanhaId, usuario);
    if (!ctx.ok) return ctx;
    var registro = acharPor(ABAS.PERSONAGENS, 'id', corpo.personagemId);
    if (!registro || String(registro.campanhaId || '') !== String(ctx.campanha.id)) return { ok: false, erro: 'nao_encontrado' };
    if (operacaoJaAplicada(registro, operacao)) return { ok: true, repetida: true, rev: Number(registro.rev) || 0 };

    var lido = lerFichaDoPersonagem(registro);
    if (!lido.ok) return lido;
    var ficha = comVinculoDaColuna(lido.ficha, registro);
    if (!ehFichaDeOrdem(ficha)) return { ok: false, erro: 'dados_invalidos' };
    var o = ficha.ordem;
    if (!o.hexatombe || typeof o.hexatombe !== 'object') o.hexatombe = { campanhaId: '', dia: 0, lancamentos: [] };
    if (!Array.isArray(o.hexatombe.lancamentos)) o.hexatombe.lancamentos = [];
    var lista = o.hexatombe.lancamentos;
    var dia = Math.max(0, Math.min(99, Math.round(Number(corpo.dia)) || 0));
    var agora = new Date().toISOString();
    var mudou = false;
    var aplicados = [];
    var recusados = [];
    /* v2.31: a ficha decide. Sem a regra opcional Participação no
       Hexatombe ligada, nenhum lançamento novo entra (nem por esta via):
       eles voltam como recusados e ficam pendentes na campanha. Desfazer
       continua permitido — só tira efeito. */
    var participa = !!(o.opcionais && o.opcionais.participacaoHexatombe === true);

    for (var i = 0; i < itens.length; i++) {
      var it = itens[i] || {};
      var bruto = it.lancamento || {};
      var id = String(bruto.id || '');
      var existente = lista.filter(function (x) { return x && x.id === id; })[0];
      if (it.desfazer === true) {
        if (existente && !existente.desfeito) { existente.desfeito = agora; mudou = true; }
        aplicados.push(id);
        continue;
      }
      if (!participa) { recusados.push(id); continue; }
      if (existente) {
        if (existente.desfeito && bruto.refazer === true) { existente.desfeito = ''; mudou = true; }
        aplicados.push(id);
        continue;
      }
      var l = lancamentoHexRecebido(bruto, usuario, dia);
      if (!l) return { ok: false, erro: 'dados_invalidos', indice: i };
      lista.push(l);
      mudou = true;
      aplicados.push(id);
      /* "Perde PV máximos e atuais": com os atuais em número, eles descem
         junto; vazios (cheios), já acompanham o máximo novo. */
      var atualPv = Math.round(Number(bruto.atualPv)) || 0;
      if (atualPv < 0 && o.recursos && typeof o.recursos.pv === 'number') {
        o.recursos.pv = Math.max(0, o.recursos.pv + atualPv);
      }
    }
    if (o.hexatombe.lancamentos.length > 120) o.hexatombe.lancamentos = o.hexatombe.lancamentos.slice(-120);
    if (participa && String(o.hexatombe.campanhaId || '') !== String(ctx.campanha.id)) { o.hexatombe.campanhaId = String(ctx.campanha.id); mudou = true; }
    if (participa && dia && o.hexatombe.dia !== dia) { o.hexatombe.dia = dia; mudou = true; }
    var extra = recusados.length ? { recusados: recusados, motivo: 'participacao_desligada' } : {};

    if (!mudou) return { ok: true, rev: Number(registro.rev) || 0, dados: Object.assign({ mudou: false, aplicados: aplicados }, extra) };

    ficha.atualizadoEm = agora;
    registro.atualizadoEm = agora;
    registro.rev = (Number(registro.rev) || 0) + 1;
    var publicado = publicarFicha(registro, ficha, { operacao: operacao });
    if (!publicado.ok) return publicado;
    avisarMesas([registro.campanhaId], ['personagens']);
    return { ok: true, rev: registro.rev, dados: Object.assign({ mudou: true, aplicados: aplicados }, extra) };
  });
}

/* =====================================================================
   HACKING (v2.38 — Arquivos Secretos 4, p. 72–73)
   ---------------------------------------------------------------------
   A regra opcional de Hacking da campanha: uma linha por campanha em
   CAMPANHA_HACKING, desligada até o mestre ligar.

     ler_hacking     mestre: o estado inteiro; jogador: só as cenas em
                     que um personagem dele participa, sem as notas do
                     mestre e com os PS só quando o mestre os mostra
     salvar_hacking  só o mestre. O estado chega inteiro, com `rev` e
                     `opId`: a repetição do mesmo opId não grava de novo,
                     e uma `rev` velha é recusada (conflito)

   O módulo é cópia fiel de js/ordem/hacking.js (o teste do backend
   confere). Nada aqui acessa dispositivo, rede ou arquivo de verdade:
   são registros da história.
   ===================================================================== */

/* >>> js/ordem/hacking.js */
/* =====================================================================
   R.A.M.A. — Hacking (v2.38 — Arquivos Secretos 4, p. 72–73)
   =====================================================================
   A regra OPCIONAL de Hacking de uma campanha. Desligada por padrão; é
   o mestre quem liga, na aba Hacking da campanha. Não tem nada a ver
   com o Hexatombe, e as ações daqui NÃO são usos gerais de Tecnologia:
   só existem dentro de uma cena de hacking.

   Tudo aqui é acontecimento do RPG. Nada acessa dispositivo, rede ou
   arquivo de verdade: "sistema", "backdoor" e "vírus" são registros da
   história, guardados na planilha da campanha.

   O livro, em resumo (o texto é o do AS4):

     cena de hacking   turnos e rodadas, como combate e investigação; a
                       rodada pode durar horas, dias ou semanas, e a
                       cena pode se repartir por várias sessões
     PS                pontos de segurança do sistema = a DT da ação
                       Hackear (OPRPG p. 48): DT 20 = 20 PS. Zerou,
                       invadiu: acesso aos arquivos por UMA cena; numa
                       cena posterior, o processo todo de novo
     dados virtuais    d6; ao começar, tantos quanto o Intelecto
     no turno          até duas ações, pelo treino em Tecnologia:
       Procurar Brechas (treinado)  teste de Tecnologia, DT 15 e +5 a
                                    cada tentativa seguinte; sucesso:
                                    +1 dado virtual
       Quebrar Códigos (treinado)   gasta dados à escolha; a soma vira
                                    dano nos PS
       Cobrir Rastros (veterano)    teste de Tecnologia contra os PS
                                    máximos; sucesso: na próxima ação que
                                    rolar dados virtuais, rola de novo os
                                    1 e fica com o segundo resultado
       Programar Backdoor (veterano) gasta 1+ dados sem rolar; cada d6
                                    gasto = um acesso ao sistema, de
                                    outro dispositivo, sem hackear de novo
       Plantar Vírus (expert)       gasta 1 dado sem rolar; o vírus espião
                                    avisa de cada interação nova (a
                                    critério do mestre) e, a cada aviso,
                                    1d4: no 1, o firewall o remove
     Imprevistos       no fim de cada rodada, um por agente, pelo número
                       de resultados 1 nos dados virtuais do último turno
                       dele (até 4): Dor nos pulsos (−2 em Tecnologia na
                       próxima rodada), Código mal escrito (perde 1 dado
                       no começo do próximo turno), Rastro detectado (o
                       sistema recupera 2d6 PS), Invasão detectada (perde
                       o progresso; o sistema recupera todos os PS)

   O que o livro NÃO diz, e esta implementação decide — sempre à vista,
   como interpretação, nunca como regra oficial (AMBIGUIDADES):

     · a ordem 1→Dor nos pulsos … 4→Invasão detectada vem da ordem em
       que o livro lista os imprevistos
     · com zero resultados 1 no turno, nenhum imprevisto é sugerido; o
       mestre pode registrar um à mão
     · com Cobrir Rastros, contam os 1 que SOBRARAM depois de rolar de
       novo (os resultados que valeram)
     · "perde o progresso": os PS voltam ao máximo; os dados virtuais que
       o agente tem ficam como estão
     · a DT de Procurar Brechas sobe por agente (cada um tem as próprias
       tentativas)

   Os dados são rolados pela tela (o motor de dados de sempre) e chegam
   aqui como números: o módulo só confere e aplica, sem sorteio próprio.
   Isso o deixa igual no navegador e no Apps Script, onde ele é copiado
   (backend/Campanhas.gs, entre os marcadores >>> e <<<).
   ===================================================================== */

(function (global) {
  "use strict";

  var VERSAO = 1;
  var MAX_CENAS = 12;
  var MAX_PARTICIPANTES = 6;
  var MAX_HISTORICO = 60;
  var MAX_BACKDOORS = 10;
  var MAX_VIRUS = 6;
  var MAX_IMPREVISTOS = 40;
  var ACOES_POR_TURNO = 2;

  var TREINOS = ["treinado", "veterano", "expert"];
  var NIVEL = { treinado: 1, veterano: 2, expert: 3 };
  var NOMES_DO_TREINO = { treinado: "treinado", veterano: "veterano", expert: "expert" };

  var ACOES = [
    { chave: "procurarBrechas", nome: "Procurar Brechas", treino: "treinado" },
    { chave: "quebrarCodigos", nome: "Quebrar Códigos", treino: "treinado" },
    { chave: "cobrirRastros", nome: "Cobrir Rastros", treino: "veterano" },
    { chave: "programarBackdoor", nome: "Programar Backdoor", treino: "veterano" },
    { chave: "plantarVirus", nome: "Plantar Vírus", treino: "expert" },
  ];
  var POR_ACAO = {};
  ACOES.forEach(function (a) { POR_ACAO[a.chave] = a; });

  var IMPREVISTOS = [
    { chave: "dorNosPulsos", uns: 1, nome: "Dor nos pulsos", texto: "−2 em testes de Tecnologia durante a próxima rodada." },
    { chave: "codigoMalEscrito", uns: 2, nome: "Código mal escrito", texto: "Perde um dado virtual no começo do próximo turno." },
    { chave: "rastroDetectado", uns: 3, nome: "Rastro detectado", texto: "O sistema recupera 2d6 PS." },
    { chave: "invasaoDetectada", uns: 4, nome: "Invasão detectada", texto: "O agente perde o progresso do hacking e o sistema recupera todos os seus PS." },
  ];
  var POR_IMPREVISTO = {};
  IMPREVISTOS.forEach(function (x) { POR_IMPREVISTO[x.chave] = x; });

  var AMBIGUIDADES = [
    "A correspondência 1 → Dor nos pulsos, 2 → Código mal escrito, 3 → Rastro detectado, 4 → Invasão detectada segue a ordem em que o livro lista os imprevistos.",
    "Com nenhum resultado 1 no turno, o livro não diz qual imprevisto acontece: nada é sugerido, e o mestre pode registrar um à mão.",
    "Com Cobrir Rastros, contam os resultados 1 que sobraram depois de rolar de novo.",
    "“Perde o progresso do hacking”: os PS voltam ao máximo; os dados virtuais do agente ficam como estão.",
    "A DT de Procurar Brechas (15, +5 a cada tentativa) sobe por agente.",
  ];

  var ESTADOS = ["preparando", "andamento", "invadido", "encerrada"];

  /* ---------------- utilidades ---------------- */

  function lista(v) { return Array.isArray(v) ? v : []; }
  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  function texto(v, n) { return String(v === undefined || v === null ? "" : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ").trim().slice(0, n || 120); }
  function inteiro(v, min, max, padrao) {
    var n = Math.round(Number(v));
    if (!isFinite(n)) n = padrao;
    return Math.max(min, Math.min(max, n));
  }
  var ID = /^[A-Za-z0-9_-]{1,40}$/;
  function idOk(v) { var s = String(v || ""); return ID.test(s) ? s : ""; }
  function carimbo(v) { var s = String(v || ""); return /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(s) ? s : ""; }
  function agora() { return new Date().toISOString(); }
  var contador = 0;
  function novoId(prefixo) {
    contador = (contador + 1) % 100000;
    return prefixo + "-" + Date.now().toString(36) + contador.toString(36) + Math.floor(Math.random() * 1e6).toString(36);
  }
  function d6(v) { var n = Math.round(Number(v)); return n >= 1 && n <= 6 ? n : 0; }

  /* ---------------- normalização ---------------- */

  function normalizarParticipante(p) {
    var x = obj(p);
    var id = idOk(x.id);
    var nome = texto(x.nome, 80);
    if (!id || !nome) return null;
    return {
      id: id,
      nome: nome,
      personagemId: texto(x.personagemId, 60).replace(/[^A-Za-z0-9_-]/g, ""),
      treino: TREINOS.indexOf(x.treino) >= 0 ? x.treino : "treinado",
      intelecto: inteiro(x.intelecto, 0, 10, 1),
      dados: inteiro(x.dados, 0, 99, 0),
      tentativas: inteiro(x.tentativas, 0, 99, 0),
      cobrir: x.cobrir === true,
      acoes: inteiro(x.acoes, 0, ACOES_POR_TURNO, 0),
      noTurno: x.noTurno === true,
      uns: inteiro(x.uns, 0, 99, 0),
      unsUltimo: inteiro(x.unsUltimo, 0, 99, 0),
      dor: inteiro(x.dor, 0, 9999, 0),
      perdeDado: x.perdeDado === true,
    };
  }

  function normalizarCena(c) {
    var x = obj(c);
    var id = idOk(x.id);
    var nome = texto(x.nome, 80);
    if (!id || !nome) return null;
    var psMax = inteiro(x.psMax, 1, 99, 15);
    var participantes = lista(x.participantes).map(normalizarParticipante).filter(Boolean).slice(0, MAX_PARTICIPANTES);
    var ids = {};
    participantes = participantes.filter(function (p) { if (ids[p.id]) return false; ids[p.id] = true; return true; });
    var acesso = obj(x.acesso);
    return {
      id: id,
      nome: nome,
      notas: texto(x.notas, 1000),
      psMax: psMax,
      psAtual: inteiro(x.psAtual, 0, psMax, psMax),
      psVisivel: x.psVisivel === true,
      estado: ESTADOS.indexOf(x.estado) >= 0 ? x.estado : "preparando",
      rodada: inteiro(x.rodada, 1, 9999, 1),
      participantes: participantes,
      acesso: acesso.desde ? { desde: carimbo(acesso.desde) || agora(), origem: acesso.origem === "backdoor" ? "backdoor" : "hacking", por: texto(acesso.por, 80) } : null,
      backdoors: lista(x.backdoors).map(function (b) {
        var y = obj(b);
        var bid = idOk(y.id);
        if (!bid) return null;
        var usos = inteiro(y.usos, 1, 99, 1);
        return { id: bid, por: texto(y.por, 80), dispositivo: texto(y.dispositivo, 80), usos: usos, usados: inteiro(y.usados, 0, usos, 0), em: carimbo(y.em) };
      }).filter(Boolean).slice(-MAX_BACKDOORS),
      virus: lista(x.virus).map(function (v) {
        var y = obj(v);
        var vid = idOk(y.id);
        if (!vid) return null;
        return { id: vid, por: texto(y.por, 80), ativo: y.ativo !== false, avisos: inteiro(y.avisos, 0, 999, 0), em: carimbo(y.em), removidoEm: carimbo(y.removidoEm) };
      }).filter(Boolean).slice(-MAX_VIRUS),
      imprevistos: lista(x.imprevistos).map(function (m) {
        var y = obj(m);
        var tipo = POR_IMPREVISTO[y.tipo] ? y.tipo : "";
        if (!tipo) return null;
        return { rodada: inteiro(y.rodada, 1, 9999, 1), participante: texto(y.participante, 80), uns: inteiro(y.uns, 0, 99, 0), tipo: tipo, manual: y.manual === true, nota: texto(y.nota, 200) };
      }).filter(Boolean).slice(-MAX_IMPREVISTOS),
      historico: lista(x.historico).map(function (h) {
        var y = obj(h);
        var t = texto(y.texto, 300);
        return t ? { em: carimbo(y.em), rodada: inteiro(y.rodada, 0, 9999, 0), texto: t } : null;
      }).filter(Boolean).slice(-MAX_HISTORICO),
      criadaEm: carimbo(x.criadaEm),
      atualizadaEm: carimbo(x.atualizadaEm),
    };
  }

  function normalizar(bruto) {
    var x = obj(bruto);
    var cenas = lista(x.cenas).map(normalizarCena).filter(Boolean);
    var ids = {};
    cenas = cenas.filter(function (c) { if (ids[c.id]) return false; ids[c.id] = true; return true; }).slice(-MAX_CENAS);
    return { versao: VERSAO, ativo: x.ativo === true, cenas: cenas };
  }

  function vazio() { return normalizar({}); }

  /* O que o jogador vê: a regra ligada e as cenas em que um personagem
     dele participa — sem as notas do mestre, e com os PS só quando o
     mestre os mostra. */
  function vistaDoJogador(estado, meusPersonagens) {
    var e = normalizar(estado);
    var meus = {};
    lista(meusPersonagens).forEach(function (id) { meus[String(id)] = true; });
    if (!e.ativo) return { ativo: false, cenas: [] };
    return {
      ativo: true,
      cenas: e.cenas.filter(function (c) {
        return c.participantes.some(function (p) { return p.personagemId && meus[p.personagemId]; });
      }).map(function (c) {
        var v = JSON.parse(JSON.stringify(c));
        delete v.notas;
        if (!c.psVisivel) { v.psMax = null; v.psAtual = null; }
        return v;
      }),
    };
  }

  /* ---------------- consultas ---------------- */

  function cena(estado, id) { return lista(estado && estado.cenas).filter(function (c) { return c.id === id; })[0] || null; }
  function participante(c, id) { return lista(c && c.participantes).filter(function (p) { return p.id === id; })[0] || null; }
  function podeAcao(p, chave) {
    var a = POR_ACAO[chave];
    return !!(a && p && NIVEL[p.treino] >= NIVEL[a.treino]);
  }
  function dtDeBrechas(p) { return 15 + 5 * ((p && p.tentativas) || 0); }
  /* Dor nos pulsos vale na rodada marcada. */
  function penalidadeEmTecnologia(c, p) { return p && p.dor && p.dor === c.rodada ? -2 : 0; }
  function imprevistoPorUns(uns) {
    var n = Math.min(4, Math.max(0, Number(uns) || 0));
    return n ? IMPREVISTOS[n - 1] : null;
  }

  function registrar(c, t) {
    c.historico.push({ em: agora(), rodada: c.rodada, texto: texto(t, 300) });
    if (c.historico.length > MAX_HISTORICO) c.historico = c.historico.slice(-MAX_HISTORICO);
    c.atualizadaEm = agora();
  }

  /* ---------------- o mestre: cenas e participantes ---------------- */

  function ligar(estado, sim) {
    estado.ativo = !!sim;
    return { ok: true };
  }

  /* Uma cena: o sistema-alvo e a DT de Hackear dele, que vira os PS. */
  function criarCena(estado, dados) {
    var d = obj(dados);
    var nome = texto(d.nome, 80);
    if (!nome) return { ok: false, motivo: "Dê um nome ao sistema-alvo." };
    var dt = inteiro(d.dt, 0, 99, 0);
    if (dt < 1) return { ok: false, motivo: "Informe a DT de Hackear do sistema (OPRPG p. 48): ela vira os PS." };
    if (estado.cenas.length >= MAX_CENAS) return { ok: false, motivo: "Até " + MAX_CENAS + " cenas de hacking por campanha: encerre e apague uma antiga." };
    var c = normalizarCena({ id: novoId("hk"), nome: nome, notas: d.notas, psMax: dt, psAtual: dt, psVisivel: d.psVisivel === true, criadaEm: agora() });
    registrar(c, "Cena criada: " + nome + " (DT " + dt + " = " + dt + " PS).");
    estado.cenas.push(c);
    return { ok: true, cena: c };
  }

  function apagarCena(estado, id) {
    var antes = estado.cenas.length;
    estado.cenas = estado.cenas.filter(function (c) { return c.id !== id; });
    return antes === estado.cenas.length ? { ok: false, motivo: "Cena não encontrada." } : { ok: true };
  }

  function editarCena(c, dados) {
    var d = obj(dados);
    if (d.nome !== undefined) { var n = texto(d.nome, 80); if (n) c.nome = n; }
    if (d.notas !== undefined) c.notas = texto(d.notas, 1000);
    if (d.psVisivel !== undefined) c.psVisivel = d.psVisivel === true;
    return { ok: true };
  }

  /* Ao entrar, o agente recebe tantos dados virtuais quanto o Intelecto. */
  function adicionarParticipante(c, dados) {
    var d = obj(dados);
    var nome = texto(d.nome, 80);
    if (!nome) return { ok: false, motivo: "Diga quem hackeia." };
    if (TREINOS.indexOf(d.treino) < 0) return { ok: false, motivo: "Hackear exige ao menos treinamento em Tecnologia (e um aparelho próprio que se conecte ao alvo)." };
    if (c.participantes.length >= MAX_PARTICIPANTES) return { ok: false, motivo: "Até " + MAX_PARTICIPANTES + " agentes por cena." };
    var pid = texto(d.personagemId, 60).replace(/[^A-Za-z0-9_-]/g, "");
    if (pid && c.participantes.some(function (p) { return p.personagemId === pid; })) return { ok: false, motivo: "Esse personagem já está na cena." };
    var int = inteiro(d.intelecto, 0, 10, 1);
    var p = normalizarParticipante({ id: novoId("ag"), nome: nome, personagemId: pid, treino: d.treino, intelecto: int, dados: int });
    c.participantes.push(p);
    registrar(c, nome + " entra (" + NOMES_DO_TREINO[p.treino] + " em Tecnologia): " + int + " dado(s) virtual(is).");
    return { ok: true, participante: p };
  }

  function tirarParticipante(c, id) {
    var p = participante(c, id);
    if (!p) return { ok: false, motivo: "Agente não encontrado." };
    c.participantes = c.participantes.filter(function (x) { return x.id !== id; });
    registrar(c, p.nome + " sai da cena.");
    return { ok: true };
  }

  function iniciar(c) {
    if (c.estado !== "preparando") return { ok: false, motivo: "A cena já começou." };
    if (!c.participantes.length) return { ok: false, motivo: "Ninguém está hackeando." };
    c.estado = "andamento";
    c.rodada = 1;
    registrar(c, "O hacking começa (rodada 1).");
    return { ok: true };
  }

  /* ---------------- turnos ---------------- */

  function iniciarTurno(c, id) {
    var p = participante(c, id);
    if (!p) return { ok: false, motivo: "Agente não encontrado." };
    if (c.estado !== "andamento") return { ok: false, motivo: "A cena não está em andamento." };
    if (p.noTurno) return { ok: false, motivo: "O turno de " + p.nome + " já começou." };
    var notas = [];
    if (p.perdeDado) {
      p.perdeDado = false;
      if (p.dados > 0) { p.dados -= 1; notas.push("Código mal escrito: −1 dado virtual."); }
      else notas.push("Código mal escrito: não havia dado virtual para perder.");
    }
    p.noTurno = true;
    p.acoes = 0;
    p.uns = 0;
    registrar(c, "Turno de " + p.nome + "." + (notas.length ? " " + notas.join(" ") : ""));
    return { ok: true, notas: notas };
  }

  function encerrarTurno(c, id) {
    var p = participante(c, id);
    if (!p) return { ok: false, motivo: "Agente não encontrado." };
    if (!p.noTurno) return { ok: false, motivo: "Não é o turno de " + p.nome + "." };
    p.noTurno = false;
    p.unsUltimo = p.uns;
    registrar(c, "Fim do turno de " + p.nome + " (" + p.uns + " resultado[s] 1 nos dados virtuais).");
    return { ok: true };
  }

  function conferirAcao(c, p, chave) {
    if (!p) return "Agente não encontrado.";
    if (c.estado !== "andamento") return c.estado === "invadido" ? "O sistema já caiu: o acesso está liberado nesta cena." : "A cena não está em andamento.";
    if (!p.noTurno) return "Comece o turno de " + p.nome + " primeiro.";
    if (p.acoes >= ACOES_POR_TURNO) return "Até duas ações de hacking por turno.";
    if (!podeAcao(p, chave)) return POR_ACAO[chave].nome + " exige ser " + POR_ACAO[chave].treino + " em Tecnologia.";
    return "";
  }

  function invadiu(c, por) {
    if (c.psAtual > 0 || c.estado !== "andamento") return false;
    c.estado = "invadido";
    c.acesso = { desde: agora(), origem: "hacking", por: por };
    registrar(c, "Os PS chegaram a zero: o sistema caiu. Acesso aos arquivos durante esta cena.");
    return true;
  }

  /* ---------------- as cinco ações ---------------- */

  /* `total`: o resultado do teste de Tecnologia, rolado na ficha. */
  function procurarBrechas(c, id, total) {
    var p = participante(c, id);
    var erro = conferirAcao(c, p, "procurarBrechas");
    if (erro) return { ok: false, motivo: erro };
    var t = Math.round(Number(total));
    if (!isFinite(t)) return { ok: false, motivo: "Informe o resultado do teste de Tecnologia." };
    var dt = dtDeBrechas(p);
    var sucesso = t >= dt;
    p.tentativas += 1;
    p.acoes += 1;
    if (sucesso) p.dados = Math.min(99, p.dados + 1);
    registrar(c, p.nome + " · Procurar Brechas: " + t + " contra DT " + dt + " — " + (sucesso ? "brecha encontrada, +1 dado virtual." : "nada.") +
      (penalidadeEmTecnologia(c, p) ? " (com −2 de Dor nos pulsos)" : ""));
    return { ok: true, sucesso: sucesso, dt: dt };
  }

  /* `valores`: os d6 rolados; `novos`: os d6 rolados de novo para cada 1
     (Cobrir Rastros), na ordem. Fica o segundo resultado. */
  function quebrarCodigos(c, id, valores, novos) {
    var p = participante(c, id);
    var erro = conferirAcao(c, p, "quebrarCodigos");
    if (erro) return { ok: false, motivo: erro };
    var v = lista(valores).map(d6);
    if (!v.length || v.some(function (x) { return !x; })) return { ok: false, motivo: "Os dados virtuais são d6 (1 a 6)." };
    if (v.length > p.dados) return { ok: false, motivo: p.nome + " só tem " + p.dados + " dado(s) virtual(is)." };
    var rerrolados = [];
    if (p.cobrir) {
      var fila = lista(novos).map(d6);
      var precisa = v.filter(function (x) { return x === 1; }).length;
      if (fila.length < precisa || fila.slice(0, precisa).some(function (x) { return !x; })) return { ok: false, motivo: "Cobrir Rastros: role de novo cada resultado 1." };
      var k = 0;
      v = v.map(function (x) { if (x !== 1) return x; var y = fila[k++]; rerrolados.push(y); return y; });
      p.cobrir = false;
    }
    var soma = v.reduce(function (s, x) { return s + x; }, 0);
    var uns = v.filter(function (x) { return x === 1; }).length;
    p.dados -= v.length;
    p.acoes += 1;
    p.uns += uns;
    var antes = c.psAtual;
    c.psAtual = Math.max(0, c.psAtual - soma);
    registrar(c, p.nome + " · Quebrar Códigos: " + v.length + "d6 = " + v.join(", ") + " (soma " + soma + ")" +
      (rerrolados.length ? ", com os 1 rolados de novo (Cobrir Rastros)" : "") + ". PS " + antes + " → " + c.psAtual + ".");
    var caiu = invadiu(c, p.nome);
    return { ok: true, soma: soma, valores: v, uns: uns, invadiu: caiu };
  }

  function cobrirRastros(c, id, total) {
    var p = participante(c, id);
    var erro = conferirAcao(c, p, "cobrirRastros");
    if (erro) return { ok: false, motivo: erro };
    var t = Math.round(Number(total));
    if (!isFinite(t)) return { ok: false, motivo: "Informe o resultado do teste de Tecnologia." };
    var sucesso = t >= c.psMax;
    p.acoes += 1;
    if (sucesso) p.cobrir = true;
    registrar(c, p.nome + " · Cobrir Rastros: " + t + " contra DT " + c.psMax + " (PS máximos) — " + (sucesso ? "na próxima rolagem de dados virtuais, os 1 rolam de novo." : "falhou."));
    return { ok: true, sucesso: sucesso, dt: c.psMax };
  }

  function programarBackdoor(c, id, quantos, dispositivo) {
    var p = participante(c, id);
    var erro = conferirAcao(c, p, "programarBackdoor");
    if (erro) return { ok: false, motivo: erro };
    var n = inteiro(quantos, 0, 99, 0);
    if (n < 1) return { ok: false, motivo: "Gaste ao menos 1 dado virtual." };
    if (n > p.dados) return { ok: false, motivo: p.nome + " só tem " + p.dados + " dado(s) virtual(is)." };
    if (c.backdoors.length >= MAX_BACKDOORS) return { ok: false, motivo: "Backdoors demais neste sistema." };
    p.dados -= n;
    p.acoes += 1;
    var b = { id: novoId("bd"), por: p.nome, dispositivo: texto(dispositivo, 80) || "um dispositivo à escolha", usos: n, usados: 0, em: agora() };
    c.backdoors.push(b);
    registrar(c, p.nome + " · Programar Backdoor: " + n + " dado(s) descartado(s) — " + n + " acesso(s) por " + b.dispositivo + ", sem hackear de novo.");
    return { ok: true, backdoor: b };
  }

  function plantarVirus(c, id) {
    var p = participante(c, id);
    var erro = conferirAcao(c, p, "plantarVirus");
    if (erro) return { ok: false, motivo: erro };
    if (p.dados < 1) return { ok: false, motivo: p.nome + " não tem dado virtual para descartar." };
    if (c.virus.length >= MAX_VIRUS) return { ok: false, motivo: "Vírus demais neste sistema." };
    p.dados -= 1;
    p.acoes += 1;
    var v = { id: novoId("vr"), por: p.nome, ativo: true, avisos: 0, em: agora(), removidoEm: "" };
    c.virus.push(v);
    registrar(c, p.nome + " · Plantar Vírus: 1 dado descartado — o vírus espião avisa das interações novas com o sistema.");
    return { ok: true, virus: v };
  }

  /* ---------------- fim da rodada: imprevistos ---------------- */

  /* A sugestão do livro para cada agente, pelos 1 do último turno. O
     mestre confirma (ou troca) antes de aplicar. */
  function proporImprevistos(c) {
    return c.participantes.map(function (p) {
      var im = imprevistoPorUns(p.unsUltimo);
      return { participante: p.id, nome: p.nome, uns: p.unsUltimo, tipo: im ? im.chave : "" };
    });
  }

  /* `escolhas`: [{ participante, tipo ("" = nenhum), manual }]; `ps2d6`:
     o resultado de 2d6 para cada Rastro detectado, na ordem. */
  function fimDaRodada(c, escolhas, ps2d6) {
    if (c.estado !== "andamento") return { ok: false, motivo: "A cena não está em andamento." };
    if (c.participantes.some(function (p) { return p.noTurno; })) return { ok: false, motivo: "Encerre os turnos abertos antes de fechar a rodada." };
    var rolagens = lista(ps2d6).map(function (x) { return inteiro(x, 2, 12, 0); });
    var k = 0;
    var aplicados = [];
    var rastros = lista(escolhas).filter(function (e) { return e && e.tipo === "rastroDetectado" && participante(c, e.participante); }).length;
    if (rolagens.slice(0, rastros).filter(Boolean).length < rastros) return { ok: false, motivo: "Rastro detectado: role 2d6 de PS recuperados." };
    lista(escolhas).forEach(function (e) {
      var p = participante(c, e && e.participante);
      var tipo = POR_IMPREVISTO[e && e.tipo] ? e.tipo : "";
      if (!p || !tipo) return;
      var nota = "";
      if (tipo === "dorNosPulsos") { p.dor = c.rodada + 1; nota = "−2 em Tecnologia na rodada " + (c.rodada + 1) + "."; }
      if (tipo === "codigoMalEscrito") { p.perdeDado = true; nota = "perde 1 dado virtual no começo do próximo turno."; }
      if (tipo === "rastroDetectado") {
        var r = rolagens[k++];
        var antes = c.psAtual;
        c.psAtual = Math.min(c.psMax, c.psAtual + r);
        nota = "2d6 = " + r + ": PS " + antes + " → " + c.psAtual + ".";
      }
      if (tipo === "invasaoDetectada") { var a2 = c.psAtual; c.psAtual = c.psMax; nota = "o progresso se perde: PS " + a2 + " → " + c.psMax + "."; }
      var reg = { rodada: c.rodada, participante: p.nome, uns: p.unsUltimo, tipo: tipo, manual: e.manual === true, nota: nota };
      c.imprevistos.push(reg);
      aplicados.push(reg);
      registrar(c, "Imprevisto (" + p.nome + ", " + p.unsUltimo + "×1" + (e.manual ? ", escolhido pelo mestre" : "") + "): " + POR_IMPREVISTO[tipo].nome + " — " + nota);
    });
    if (c.imprevistos.length > MAX_IMPREVISTOS) c.imprevistos = c.imprevistos.slice(-MAX_IMPREVISTOS);
    c.participantes.forEach(function (p) { p.unsUltimo = 0; p.uns = 0; p.acoes = 0; });
    c.rodada += 1;
    registrar(c, "Rodada " + c.rodada + ".");
    return { ok: true, aplicados: aplicados };
  }

  /* ---------------- acesso, backdoor e vírus ---------------- */

  /* O acesso vale uma cena: o mestre encerra quando a cena de jogo acaba. */
  function encerrarAcesso(c) {
    if (!c.acesso) return { ok: false, motivo: "Não há acesso aberto." };
    c.acesso = null;
    c.estado = "encerrada";
    registrar(c, "A cena terminou: o acesso aos arquivos acabou. Numa cena posterior, é preciso hackear de novo (ou usar um backdoor).");
    return { ok: true };
  }

  /* Hackear de novo, numa cena posterior: o processo inteiro. Backdoors
     e vírus continuam no sistema. */
  function recomecar(c) {
    c.estado = "preparando";
    c.acesso = null;
    c.psAtual = c.psMax;
    c.rodada = 1;
    c.participantes.forEach(function (p) {
      p.dados = p.intelecto; p.tentativas = 0; p.cobrir = false; p.acoes = 0; p.noTurno = false;
      p.uns = 0; p.unsUltimo = 0; p.dor = 0; p.perdeDado = false;
    });
    registrar(c, "Novo processo de hacking: PS no máximo e dados virtuais pelo Intelecto.");
    return { ok: true };
  }

  function usarBackdoor(c, id) {
    var b = lista(c.backdoors).filter(function (x) { return x.id === id; })[0];
    if (!b) return { ok: false, motivo: "Backdoor não encontrado." };
    if (b.usados >= b.usos) return { ok: false, motivo: "Esse backdoor já foi usado todas as vezes." };
    if (c.acesso) return { ok: false, motivo: "O acesso já está aberto nesta cena." };
    b.usados += 1;
    c.acesso = { desde: agora(), origem: "backdoor", por: b.por };
    if (c.estado !== "andamento") c.estado = "invadido";
    registrar(c, "Backdoor de " + b.por + " (" + b.dispositivo + "): acesso sem hackear (" + b.usados + " de " + b.usos + ").");
    return { ok: true, restam: b.usos - b.usados };
  }

  /* Uma interação nova com o sistema, a critério do mestre: o vírus
     avisa, e o jogador rola 1d4 (no 1, o firewall o remove). */
  function avisoDoVirus(c, id, d4, oQue) {
    var v = lista(c.virus).filter(function (x) { return x.id === id; })[0];
    if (!v || !v.ativo) return { ok: false, motivo: "Esse vírus não está mais no sistema." };
    var r = Math.round(Number(d4));
    if (!(r >= 1 && r <= 4)) return { ok: false, motivo: "Role 1d4." };
    v.avisos += 1;
    var removido = r === 1;
    if (removido) { v.ativo = false; v.removidoEm = agora(); }
    registrar(c, "Vírus de " + v.por + " avisa: " + (texto(oQue, 160) || "nova interação com o sistema") + ". 1d4 = " + r + (removido ? " — o firewall encontrou e removeu o vírus." : "."));
    return { ok: true, removido: removido };
  }

  /* Imprevisto ou nota registrados à mão pelo mestre. */
  function anotar(c, t) {
    var s = texto(t, 300);
    if (!s) return { ok: false, motivo: "Escreva a anotação." };
    registrar(c, s);
    return { ok: true };
  }

  global.RAMAHacking = {
    VERSAO: VERSAO,
    ACOES: ACOES,
    POR_ACAO: POR_ACAO,
    TREINOS: TREINOS,
    IMPREVISTOS: IMPREVISTOS,
    POR_IMPREVISTO: POR_IMPREVISTO,
    AMBIGUIDADES: AMBIGUIDADES,
    ACOES_POR_TURNO: ACOES_POR_TURNO,
    normalizar: normalizar,
    vazio: vazio,
    vistaDoJogador: vistaDoJogador,
    cena: cena,
    participante: participante,
    podeAcao: podeAcao,
    dtDeBrechas: dtDeBrechas,
    penalidadeEmTecnologia: penalidadeEmTecnologia,
    imprevistoPorUns: imprevistoPorUns,
    ligar: ligar,
    criarCena: criarCena,
    apagarCena: apagarCena,
    editarCena: editarCena,
    adicionarParticipante: adicionarParticipante,
    tirarParticipante: tirarParticipante,
    iniciar: iniciar,
    iniciarTurno: iniciarTurno,
    encerrarTurno: encerrarTurno,
    procurarBrechas: procurarBrechas,
    quebrarCodigos: quebrarCodigos,
    cobrirRastros: cobrirRastros,
    programarBackdoor: programarBackdoor,
    plantarVirus: plantarVirus,
    proporImprevistos: proporImprevistos,
    fimDaRodada: fimDaRodada,
    encerrarAcesso: encerrarAcesso,
    recomecar: recomecar,
    usarBackdoor: usarBackdoor,
    avisoDoVirus: avisoDoVirus,
    anotar: anotar,
  };
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
/* <<< js/ordem/hacking.js */

var MAX_OPS_HACKING = 50;

function registroDoHacking(campanhaId) {
  try {
    return acharPor(ABAS.CAMPANHA_HACKING, 'campanhaId', String(campanhaId));
  } catch (erro) {
    /* Sem a aba (setupRama desta versão ainda não rodou): a regra está
       desligada nesta campanha. */
    return null;
  }
}

function hackingAtivo(campanhaId) {
  try {
    var leve = lerLeves(ABAS.CAMPANHA_HACKING).filter(function (r) { return String(r.campanhaId) === String(campanhaId); })[0];
    return !!leve && (leve.ativo === true || String(leve.ativo) === 'true');
  } catch (erro) {
    return false;
  }
}

function estadoDoHacking(registro) {
  return RAMAHacking.normalizar(registro ? lerJson(registro.dadosJson, {}) : {});
}

function hackingParaCliente(ctx, registro, usuario) {
  var estado = estadoDoHacking(registro);
  var rev = registro ? Number(registro.rev) || 0 : 0;
  if (ctx.mestre) return { mestre: true, rev: rev, estado: estado };
  return { mestre: false, rev: rev, vista: RAMAHacking.vistaDoJogador(estado, idsDosMeusPersonagens(ctx.campanha.id, usuario)) };
}

function acaoLerHacking(corpo, usuario) {
  var ctx = contextoDaCampanha(corpo.campanhaId, usuario);
  if (!ctx.ok) return ctx;
  if (ctx.papel === PAPEL_ESPECTADOR) return { ok: false, erro: 'sem_permissao' };
  var dados = hackingParaCliente(ctx, registroDoHacking(ctx.campanha.id), usuario);
  return { ok: true, rev: dados.rev, dados: dados };
}

function acaoSalvarHacking(corpo, usuario) {
  var opId = String(corpo.opId || '');
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(opId)) return { ok: false, erro: 'dados_invalidos' };
  if (!corpo.estado || typeof corpo.estado !== 'object' || Array.isArray(corpo.estado)) return { ok: false, erro: 'dados_invalidos' };
  var revPedida = Number(corpo.rev);
  if (!Number.isFinite(revPedida)) return { ok: false, erro: 'dados_invalidos' };

  return comTrava(function () {
    var ctx = exigirMestre(corpo.campanhaId, usuario);
    if (!ctx.ok) return ctx;
    try {
      aba(ABAS.CAMPANHA_HACKING);
    } catch (erro) {
      return { ok: false, erro: 'instalacao_incompleta', detalhe: 'CAMPANHA_HACKING' };
    }

    var registro = registroDoHacking(ctx.campanha.id);
    var revAtual = registro ? Number(registro.rev) || 0 : 0;
    var feitas = registro ? (lerJson(registro.opsJson, []) || []) : [];
    if (!Array.isArray(feitas)) feitas = [];

    if (feitas.indexOf(opId) >= 0) {
      return { ok: true, repetida: true, rev: revAtual, dados: hackingParaCliente(ctx, registro, usuario) };
    }
    if (revPedida !== revAtual) {
      return { ok: false, erro: 'conflito', rev: revAtual, dados: hackingParaCliente(ctx, registro, usuario) };
    }

    var anterior = estadoDoHacking(registro);
    var estado = RAMAHacking.normalizar(corpo.estado);

    /* Vínculo só com personagem DESTA campanha. */
    var daMesa = {};
    daCampanhaLeves(ABAS.PERSONAGENS, ctx.campanha.id).forEach(function (r) { daMesa[String(r.id)] = true; });
    estado.cenas.forEach(function (c) {
      c.participantes.forEach(function (p) { if (p.personagemId && !daMesa[p.personagemId]) p.personagemId = ''; });
    });

    /* O histórico cede primeiro quando o estado não cabe na célula. */
    var json = JSON.stringify(estado);
    var voltas = 0;
    while (json.length > MAX_CELULA && voltas < 20) {
      voltas++;
      estado.cenas.forEach(function (c) { c.historico = c.historico.slice(Math.ceil(c.historico.length / 4) || 1); });
      json = JSON.stringify(estado);
    }
    if (json.length > MAX_CELULA) return { ok: false, erro: 'dados_grandes' };

    feitas.push(opId);
    if (feitas.length > MAX_OPS_HACKING) feitas = feitas.slice(feitas.length - MAX_OPS_HACKING);
    var novo = {
      campanhaId: String(ctx.campanha.id),
      ativo: estado.ativo,
      atualizadoEm: new Date().toISOString(),
      rev: revAtual + 1,
      opsJson: JSON.stringify(feitas),
      dadosJson: json,
    };
    if (registro) atualizarLinha(ABAS.CAMPANHA_HACKING, registro._linha, Object.assign({}, registro, novo));
    else inserir(ABAS.CAMPANHA_HACKING, novo);

    var partes = ['hacking'];
    if (anterior.ativo !== estado.ativo) partes.push('campanha');
    marcarMesa(ctx.campanha.id, partes);
    return { ok: true, rev: revAtual + 1, dados: hackingParaCliente(ctx, registroDoHacking(ctx.campanha.id), usuario) };
  });
}
