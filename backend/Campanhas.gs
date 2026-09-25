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

var PARTES_DA_MESA = ['campanha', 'membros', 'personagens', 'combates', 'documentos', 'rolagens'];
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
  return { ok: true, dados: { imagem: (imagem && imagem.imagem) || '' } };
}

function acaoSalvarImagemDocumento(corpo, usuario) {
  var imagem = String(corpo.imagem || '');

  if (imagem && imagem.indexOf('data:image/') !== 0) return { ok: false, erro: 'dados_invalidos' };
  if (imagem.length > MAX_CELULA) return { ok: false, erro: 'dados_grandes' };

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
      existente.imagem = imagem;
      existente.atualizadoEm = agora;
      atualizarLinha(ABAS.CAMPANHA_DOCUMENTOS_IMAGENS, existente._linha, existente);
    } else {
      inserir(ABAS.CAMPANHA_DOCUMENTOS_IMAGENS, {
        documentoId: corpo.documentoId,
        campanhaId: ctx.campanha.id,
        imagem: imagem,
        atualizadoEm: agora,
      });
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

var FORMATO_DE_CAPA = /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+\/]+=*$/;
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

  var celulas = lerCelulas(ABAS.CAMPANHA_CAPAS, [capa.registro], 'imagem');
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

  var imagens = lerCelulas(ABAS.CAMPANHA_CAPAS, linhas, 'imagem');

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

  if (imagem.length > MAX_CELULA) return { ok: false, erro: 'dados_grandes' };
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
      existente.imagem = imagem;
      atualizarCampos(ABAS.CAMPANHA_CAPAS, existente, ['atualizadoEm', 'largura', 'altura', 'imagem']);
    } else {
      inserir(ABAS.CAMPANHA_CAPAS, {
        campanhaId: ctx.campanha.id,
        atualizadoEm: agora,
        largura: largura,
        altura: altura,
        imagem: imagem,
      });
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

  var conteudos = lerCelulas(ABAS.CAMPANHA_COMBATES, visiveis, 'dadosJson');

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
  var estado = estadoDeCombate(c.estado);
  var porPersonagem = recursos || null;

  var saida = {
    id: c.id,
    nome: c.nome,
    estado: estado,
    criadoEm: c.criadoEm,
    atualizadoEm: c.atualizadoEm,
    rev: Number(c.rev) || 0,
    turno: turnoNormalizado(dados.turno, participantes, estado),
  };

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
    return comRecursos(p, {
      id: p.id,
      tipo: p.tipo,
      nome: p.nome,
      ordem: Number(p.ordem) || 0,
      personagemId: p.tipo === 'personagem' ? p.personagemId : null,
    });
  });

  return saida;
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
var CONDICOES_DA_MESA = ['exaustao', 'desmaio'];
var LIMITE_DAS_CONDICOES = { morrendo: 3, enlouquecendo: 3 };
var NOMES_DAS_CONDICOES = { morrendo: 'Morrendo', enlouquecendo: 'Enlouquecendo', exaustao: 'Exaustão', desmaio: 'Desmaio' };
var MAX_EVENTOS_DE_CONDICAO = 60;
var CONDICAO_SEM_TETO = 99;
var ID_DE_EVENTO = /^[A-Za-z0-9_.:|#-]{1,160}$/;

function rastreadorDeCondicao(cond, chave) {
  if (!cond || typeof cond !== 'object') return null;
  var r;
  if (CONDICOES_CONTADAS.indexOf(chave) >= 0) r = cond[chave];
  else if (CONDICOES_DA_MESA.indexOf(chave) >= 0) r = cond.mesa && typeof cond.mesa === 'object' ? cond.mesa[chave] : null;
  if (!r || typeof r !== 'object') return null;
  if (!Array.isArray(r.eventos)) r.eventos = [];
  if (!Array.isArray(r.descartados)) r.descartados = [];
  return r;
}

function cenaDaCondicao(cond) {
  return cond && cond.cena && typeof cond.cena === 'object' && typeof cond.cena.id === 'string' ? cond.cena.id : '';
}

function limiteDaCondicao(chave, r) {
  if (LIMITE_DAS_CONDICOES[chave]) return LIMITE_DAS_CONDICOES[chave];
  var n = Math.round(Number(r && r.limite));
  return n >= 1 && n <= 20 ? n : null;
}

function contagemDaCondicao(cond, r) {
  var cena = cenaDaCondicao(cond);
  return r.eventos.filter(function (e) { return e && String(e.cena || '') === cena; }).length;
}

function idDoInicioDeTurno(combateId, rodada, participanteId) {
  var id = 'cb:' + String(combateId).slice(0, 60) + ':' + Math.round(Number(rodada)) + ':' + String(participanteId).slice(0, 60);
  return ID_DE_EVENTO.test(id) ? id : '';
}

/* Devolve as chaves que contaram. */
function registrarInicioNaFicha(ficha, evento) {
  var cond = ficha && ficha.ordem ? ficha.ordem.condicoes : null;
  if (!cond || typeof cond !== 'object' || cond.integrarCombate === false) return [];
  if (!evento || !ID_DE_EVENTO.test(String(evento.id || ''))) return [];
  var cena = cenaDaCondicao(cond);
  var contou = [];
  CONDICOES_CONTADAS.concat(CONDICOES_DA_MESA).forEach(function (chave) {
    var r = rastreadorDeCondicao(cond, chave);
    if (!r || r.ativa !== true) return;
    if (CONDICOES_DA_MESA.indexOf(chave) >= 0 && r.usar !== true) return;
    if (r.eventos.some(function (e) { return e && e.id === evento.id; })) return;
    if (r.descartados.indexOf(evento.id) >= 0) return;
    var limite = limiteDaCondicao(chave, r);
    if (contagemDaCondicao(cond, r) >= (limite === null ? CONDICAO_SEM_TETO : limite)) return;
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
  CONDICOES_CONTADAS.concat(CONDICOES_DA_MESA).forEach(function (chave) {
    var r = rastreadorDeCondicao(cond, chave);
    if (!r) return;
    var antes = r.eventos.length;
    r.eventos = r.eventos.filter(function (e) { return !(e && e.id === id && e.origem === 'combate'); });
    if (r.eventos.length !== antes) tirou.push(chave);
  });
  return tirou;
}

/* Há o que fazer nesta ficha com estes eventos? Pergunta feita à
   projeção do painel, sem abrir a ficha: só quem tem uma condição ativa
   (ou o evento a retirar) é lido e regravado. */
function condicoesPedemLeitura(cond, eventos) {
  if (!cond || typeof cond !== 'object' || cond.integrarCombate === false) return false;
  return eventos.some(function (ev) {
    return CONDICOES_CONTADAS.concat(CONDICOES_DA_MESA).some(function (chave) {
      var r = rastreadorDeCondicao(JSON.parse(JSON.stringify(cond)), chave);
      if (!r) return false;
      if (ev.tipo === 'inicio') return r.ativa === true && (CONDICOES_DA_MESA.indexOf(chave) < 0 || r.usar === true);
      return r.eventos.some(function (e) { return e && e.id === ev.id; });
    });
  });
}

/* O que outro jogador pode ver das condições — só com o status visível:
   as ativas e as que já contaram nesta cena. */
function resumoPublicoDeCondicoes(ordem) {
  var cond = ordem && ordem.condicoes && typeof ordem.condicoes === 'object' ? JSON.parse(JSON.stringify(ordem.condicoes)) : null;
  if (!cond) return [];
  var saida = [];
  CONDICOES_CONTADAS.concat(CONDICOES_DA_MESA).forEach(function (chave) {
    var r = rastreadorDeCondicao(cond, chave);
    if (!r) return;
    if (CONDICOES_DA_MESA.indexOf(chave) >= 0 && r.usar !== true) return;
    var n = contagemDaCondicao(cond, r);
    if (r.ativa !== true && !n) return;
    saida.push({
      chave: chave, nome: NOMES_DAS_CONDICOES[chave], oficial: CONDICOES_CONTADAS.indexOf(chave) >= 0,
      ativa: r.ativa === true, contagem: n, limite: limiteDaCondicao(chave, r),
    });
  });
  ['inconsciente', 'perturbado'].forEach(function (chave) {
    if (cond[chave] && cond[chave].ativa === true) {
      saida.push({ chave: chave, nome: chave === 'inconsciente' ? 'Inconsciente' : 'Perturbado', oficial: true, ativa: true, contagem: 0, limite: null });
    }
  });
  return saida;
}

/* Aplica os inícios e as retiradas de um lote de combate às fichas dos
   personagens. Cada ficha é gravada uma vez, com a revisão subindo como
   em qualquer gravação: quem estiver com ela aberta concilia na próxima
   gravação, evento a evento (js/sync.js). Uma ficha que não se monta não
   é tocada, e o mestre recebe o aviso para contar à mão. */
function aplicarTurnosAsFichas(ctx, combateId, eventos, participantesPorId, opId) {
  var avisos = [];
  if (!eventos.length) return avisos;
  var porPersonagem = {};
  eventos.forEach(function (ev) {
    var p = participantesPorId[ev.participanteId];
    if (!p || p.tipo !== 'personagem' || !p.personagemId) return;
    var id = idDoInicioDeTurno(combateId, ev.rodada, ev.participanteId);
    if (!id) return;
    var chave = String(p.personagemId);
    if (!porPersonagem[chave]) porPersonagem[chave] = [];
    porPersonagem[chave].push({ tipo: ev.tipo, id: id, rodada: ev.rodada });
  });

  Object.keys(porPersonagem).forEach(function (personagemId) {
    var lista = porPersonagem[personagemId];
    var registro = acharPor(ABAS.PERSONAGENS, 'id', personagemId);
    if (!registro || String(registro.campanhaId) !== String(ctx.campanha.id)) return;

    var proj = projecaoDoRegistro(registro);
    if (proj && (!projecaoDeOrdem(proj) || !condicoesPedemLeitura(proj.ordem.condicoes, lista))) return;

    try {
      var lido = lerFichaDoPersonagem(registro);
      if (!lido.ok) { avisos.push({ aviso: 'condicao_nao_contada', personagemId: personagemId }); return; }
      var ficha = comVinculoDaColuna(lido.ficha, registro);
      if (!ehFichaDeOrdem(ficha)) return;

      var agora = new Date().toISOString();
      var mudou = false;
      lista.forEach(function (ev) {
        var r = ev.tipo === 'inicio'
          ? registrarInicioNaFicha(ficha, { id: ev.id, rodada: ev.rodada, combate: String(combateId).slice(0, 60), em: agora })
          : retirarInicioDaFicha(ficha, ev.id);
        if (r.length) mudou = true;
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

      var anteriores = lerJson(existente.dadosJson, {});
      var turnoAntes = turnoNormalizado(anteriores.turno, participantes, estadoDeCombate(existente.estado));
      var turno = estadoDeCombate(existente.estado) === 'preparando' && estado === 'ativo'
        ? turnoNormalizado(null, participantes, estado)
        : turnoNormalizado(turnoAntes, participantes, estado);

      var json = JSON.stringify({
        participantes: participantes,
        turno: turno,
        ops: Array.isArray(anteriores.ops) ? anteriores.ops : [],
      });
      if (json.length > MAX_CELULA) return { ok: false, erro: 'dados_grandes' };

      existente.nome = nome;
      existente.estado = estado;
      existente.visiveisJson = JSON.stringify(visiveis);
      existente.atualizadoEm = agora;
      existente.rev = revAtual + 1;
      existente.dadosJson = json;

      atualizarLinha(ABAS.CAMPANHA_COMBATES, existente._linha, existente);
      marcarMesa(ctx.campanha.id, ['combates']);
      return { ok: true, dados: { id: existente.id }, rev: existente.rev };
    }

    var jsonNovo = JSON.stringify({
      participantes: participantes,
      turno: turnoNormalizado(null, participantes, estado),
      ops: [],
    });
    if (jsonNovo.length > MAX_CELULA) return { ok: false, erro: 'dados_grandes' };

    var id = novoId();
    inserir(ABAS.CAMPANHA_COMBATES, {
      id: id,
      campanhaId: ctx.campanha.id,
      nome: nome,
      estado: estado,
      visiveisJson: JSON.stringify(visiveis),
      criadoEm: agora,
      atualizadoEm: agora,
      rev: 1,
      dadosJson: jsonNovo,
    });

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

    var dados = lerJson(registro.dadosJson, {});
    var feitas = Array.isArray(dados.ops) ? dados.ops : [];
    var revAtual = Number(registro.rev) || 0;

    /* A repetição vem ANTES da revisão: o lote que já entrou subiu a
       revisão, e a segunda chegada dele sempre pareceria um conflito. */
    var jaFeita = feitas.some(function (o) { return o && String(o.id) === opId; });
    if (jaFeita) {
      return { ok: true, repetida: true, rev: revAtual, dados: combateParaCliente(registro, ctx) };
    }

    var revPedida = Number(corpo.rev);
    if (!Number.isFinite(revPedida)) return { ok: false, erro: 'dados_invalidos' };
    if (revPedida !== revAtual) {
      return { ok: false, erro: 'conflito', rev: revAtual, dados: combateParaCliente(registro, ctx) };
    }

    var estadoAtual = estadoDeCombate(registro.estado);
    var participantesAtuais = Array.isArray(dados.participantes) ? dados.participantes : [];

    var combate = {
      nome: registro.nome,
      estado: estadoAtual,
      visiveis: lerJson(registro.visiveisJson, []) || [],
      participantes: JSON.parse(JSON.stringify(participantesAtuais)),
      turno: turnoNormalizado(dados.turno, participantesAtuais, estadoAtual),
    };

    var resultado = aplicarOperacoesDeCombate(combate, ops, ctx);
    if (!resultado.ok) return resultado;

    feitas.push({ id: opId, rev: revAtual + 1 });
    if (feitas.length > MAX_OPS_GUARDADAS) feitas = feitas.slice(feitas.length - MAX_OPS_GUARDADAS);

    var json = JSON.stringify({ participantes: combate.participantes, turno: combate.turno, ops: feitas });
    if (json.length > MAX_CELULA) return { ok: false, erro: 'dados_grandes' };

    registro.nome = combate.nome;
    registro.estado = combate.estado;
    registro.visiveisJson = JSON.stringify(combate.visiveis);
    registro.atualizadoEm = new Date().toISOString();
    registro.rev = revAtual + 1;
    registro.dadosJson = json;

    atualizarLinha(ABAS.CAMPANHA_COMBATES, registro._linha, registro);
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
  function mudouOTurno(antes, depois, voltando) {
    if (combate.estado !== 'ativo' || !depois) return;
    var mesmo = antes && String(antes.ativoId) === String(depois.ativoId) && Number(antes.rodada) === Number(depois.rodada);
    if (mesmo) return;
    if (voltando) {
      if (antes && antes.ativoId) turnos.push({ tipo: 'retirada', rodada: Number(antes.rodada), participanteId: String(antes.ativoId) });
      return;
    }
    if (depois.ativoId) turnos.push({ tipo: 'inicio', rodada: Number(depois.rodada), participanteId: String(depois.ativoId) });
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
    marcarMesa(ctx.campanha.id, ['combates']);
    return { ok: true };
  });
}
