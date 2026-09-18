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
function usuarioParaCliente(u, avatarPorId) {
  return {
    id: u.id,
    usuario: u.usuario,
    nome: u.nome || u.usuario,
    avatar: (avatarPorId && avatarPorId[u.id]) || '',
  };
}

/* Os avatares de um conjunto de contas, e só dele.

   O avatar é base64 e mora na segunda coluna de PERFIS. Ler a aba
   inteira para montar uma lista de sete participantes trazia o avatar
   de todas as vinte contas do sistema. A varredura leva só o userId; as
   imagens vêm pelas linhas que interessam. */
function avataresDe(ids) {
  var querido = {};
  (ids || []).forEach(function (id) { querido[String(id)] = true; });

  var linhas = lerLeves(ABAS.PERFIS).filter(function (perfil) {
    return querido[String(perfil.userId)];
  });

  var imagens = lerCelulas(ABAS.PERFIS, linhas, 'avatar');

  var saida = {};
  linhas.forEach(function (p) { saida[String(p.userId)] = imagens[p._linha] || ''; });
  return saida;
}

function membrosParaCliente(campanha, membros) {
  var usuarios = {};
  lerTudo(ABAS.USUARIOS).forEach(function (u) { usuarios[u.id] = u; });

  var envolvidos = [String(campanha.ownerId)];
  membros.forEach(function (m) { envolvidos.push(String(m.userId)); });

  var perfis = avataresDe(envolvidos);

  var saida = [];
  var vistos = {};

  /* O criador entra sempre, mesmo sem linha em MEMBROS. */
  if (usuarios[campanha.ownerId]) {
    saida.push(Object.assign(usuarioParaCliente(usuarios[campanha.ownerId], perfis), {
      papel: PAPEL_MESTRE,
      criador: true,
    }));
    vistos[campanha.ownerId] = true;
  }

  membros.forEach(function (m) {
    if (vistos[m.userId] || !usuarios[m.userId]) return;
    vistos[m.userId] = true;
    saida.push(Object.assign(usuarioParaCliente(usuarios[m.userId], perfis), {
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
  var ativos = lerTudo(ABAS.USUARIOS).filter(function (u) { return String(u.ativo) === 'true'; });

  var perfis = avataresDe(ativos.map(function (u) { return u.id; }));

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

  var donos = {};
  lerTudo(ABAS.USUARIOS).forEach(function (u) { donos[u.id] = u.nome || u.usuario; });

  /* Duas etapas, e a ordem é o ponto.

     Primeiro descobre QUAIS personagens são desta campanha, varrendo só
     as colunas leves — nenhum conteúdo de ficha e nenhuma foto
     atravessam o serviço nesta etapa. Só então busca o conteúdo das
     linhas que sobraram: os blocos só destas fichas, com uma varredura
     da aba de blocos para a mesa inteira (v2.15).

     Antes, esta tela lia a ficha completa e a foto de TODOS os
     personagens do sistema para desenhar os sete da mesa. */
  var daMesa = lerLeves(ABAS.PERSONAGENS).filter(function (p) {
    return String(p.campanhaId) === String(ctx.campanha.id);
  });

  var fichas = lerFichasDosPersonagens(daMesa);

  var idsDaMesa = {};
  daMesa.forEach(function (p) { idsDaMesa[String(p.id)] = true; });

  var linhasDeFoto = lerLeves(ABAS.PERSONAGENS_FOTOS).filter(function (f) {
    return idsDaMesa[String(f.personagemId)];
  });

  var imagens = lerCelulas(ABAS.PERSONAGENS_FOTOS, linhasDeFoto, 'imagem');

  var fotos = {};
  linhasDeFoto.forEach(function (f) { fotos[String(f.personagemId)] = imagens[f._linha] || ''; });

  var lista = daMesa
    .map(function (p) {
      var lida = fichas[p.id] || { ok: false, erro: 'ficha_ilegivel', motivo: 'bloco_ausente' };
      var souDono = meu(p, usuario);

      /* Uma ficha que não se montou aparece como tal: identificação e o
         aviso, sem números inventados e sem controles de ajuste — que
         gravariam por cima de uma ficha que ninguém conseguiu ler. */
      if (!lida.ok) {
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
          foto: fotos[p.id] || '',
          rev: Number(p.rev) || 0,
        };
      }

      var ficha = lida.ficha;

      /* O mestre e o dono veem o personagem inteiro no painel; os outros
         jogadores da mesa, a identificação e — se o mestre permitir — os
         recursos. */
      var detalhado = ctx.mestre || souDono;
      var recursosVisiveis = detalhado || !ocultarStatus;
      var ehOrdem = ehFichaDeOrdem(ficha);

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
        foto: fotos[p.id] || '',
        rev: Number(p.rev) || 0,
      };

      if (ehOrdem) {
        /* Uma ficha de Ordem NÃO usa `status` e `atributos` universais —
           ela os tem só como padrão de nascimento. Os números dela são
           calculados pelas regras no navegador (js/ordem/regras.js), o
           mesmo cálculo da ficha: o painel recebe os dados de entrada
           desse cálculo, não um resultado paralelo. Textos longos
           (personalizações, descrições de item) ficam de fora. */
        if (detalhado) {
          saida.ordem = ordemParaPainel(ficha.ordem);
          saida.inventario = { itens: itensParaPainel(ficha.inventario) };
          /* O resumo guardado, para quem calcula conferir se ele ainda
             bate com a ficha — ver atualizar_resumo_personagem. */
          saida.resumoRecursos = normalizarResumoRecursos(ficha.resumoRecursos);
        } else {
          saida.ordem = ordemPublicaParaPainel(ficha.ordem);
          if (recursosVisiveis) {
            var resumidos = recursosResumidos(ficha);
            saida.recursos = resumidos || [];
            if (!resumidos) saida.recursosPendentes = true;
          }
        }
      } else {
        /* O painel precisa de status e atributos para os controles
           rápidos, mas não da ficha inteira: perícias, inventário e
           anotações ficam para quando alguém abrir a ficha de verdade. */
        saida.atributos = (ficha.atributos || []).map(function (a) {
          return { id: a.id, nome: a.nome, sigla: a.sigla, valor: a.valor, dado: a.dado };
        });
        if (recursosVisiveis) {
          saida.status = (ficha.status || []).map(function (s) {
            return { id: s.id, nome: s.nome, atual: s.atual, maximo: s.maximo };
          });
        }
      }
      return saida;
    })
    .sort(function (a, b) { return String(a.nome).localeCompare(String(b.nome), 'pt-BR'); });

  return { ok: true, dados: lista, config: { ocultarStatusJogadores: ocultarStatus } };
}

function ehFichaDeOrdem(ficha) {
  return !!ficha && String(ficha.tipoFicha || '') === 'ordem' && !!ficha.ordem && typeof ficha.ordem === 'object';
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
  var rotulos = { pv: 'PV', pe: 'PE', san: 'SAN' };

  return ['pv', 'pe', 'san']
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
    if (guardado && guardado.pv === resumo.pv && guardado.pe === resumo.pe && guardado.san === resumo.san) {
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
  /* Ficha de Ordem: o que sobrou de PV, PE e Sanidade. O máximo é
     calculado pelas regras e nunca é gravado. */
  recurso: ['atual'],
};

var RECURSOS_DE_ORDEM = ['pv', 'pe', 'san'];

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
      ficha.ordem.recursos = { pv: null, pe: null, san: null };
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

function acaoListarRolagens(corpo, usuario) {
  var ctx = contextoDaCampanha(corpo.campanhaId, usuario);
  if (!ctx.ok) return ctx;
  if (ctx.papel === PAPEL_ESPECTADOR) return { ok: true, dados: { rolagens: [], fim: true } };

  var limite = Number(corpo.limite) || PAGINA_ROLAGENS;
  limite = Math.max(1, Math.min(MAX_PAGINA_ROLAGENS, limite));

  var nomes = {};
  lerTudo(ABAS.USUARIOS).forEach(function (u) { nomes[u.id] = u.nome || u.usuario; });

  /* O CUSTO REAL DESTA PAGINAÇÃO
     -----------------------------------------------------------------
     A varredura abaixo percorre TODAS as linhas de CAMPANHA_ROLAGENS,
     não só as da página. Não adianta fingir o contrário: para saber
     quais são as vinte e cinco mais recentes DESTA campanha, e quantas
     existem ao todo, é preciso olhar o campanhaId de cada linha.

     O que mudou é o que a varredura carrega. Ela lê oito colunas
     curtas — id, autor, tipo, nome, visibilidade, data — e deixa o
     dadosJson para trás. O resultado de cada rolagem, que é o volume,
     é buscado depois, só para as linhas que a página realmente mostra.

     Com 1.500 rolagens gravadas, uma página deixou de trazer 1.500
     resultados para trazer 25.

     O que continua verdadeiro: o custo cresce com o tamanho da aba, não
     com o da página. Numa mesa de dezenas de milhares de linhas isso
     volta a pesar, e a saída continua sendo o botão "Limpar" do
     mestre. Um índice de verdade exigiria uma estrutura que a planilha
     não oferece. */
  var todas = daCampanhaLeves(ABAS.CAMPANHA_ROLAGENS, ctx.campanha.id)
    /* A FILTRAGEM ACONTECE AQUI, no servidor. Uma rolagem oculta do
       mestre não é escondida com CSS: ela nem chega ao navegador do
       jogador. */
    .filter(function (r) {
      if (ctx.mestre) return true;
      return String(r.visibilidade) !== VIS_ROLAGEM_OCULTA;
    })
    .sort(function (a, b) { return String(b.criadoEm).localeCompare(String(a.criadoEm)); });

  /* Página simples por posição: o cliente diz quantas já tem. */
  var pulo = Math.max(0, Number(corpo.pulo) || 0);
  var pagina = todas.slice(pulo, pulo + limite);

  var resultados = lerCelulas(ABAS.CAMPANHA_ROLAGENS, pagina, 'dadosJson');

  return {
    ok: true,
    dados: {
      rolagens: pagina.map(function (r) {
        var d = lerJson(resultados[r._linha], {});
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
      total: todas.length,
      fim: pulo + pagina.length >= todas.length,
    },
  };
}

function acaoLimparRolagens(corpo, usuario) {
  return comTrava(function () {
    var ctx = exigirMestre(corpo.campanhaId, usuario);
    if (!ctx.ok) return ctx;

    var linhas = daCampanhaLeves(ABAS.CAMPANHA_ROLAGENS, ctx.campanha.id);
    var removidas = apagarLinhas(ABAS.CAMPANHA_ROLAGENS,
      linhas.map(function (r) { return r._linha; }));
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

  var fichas = lerFichasDosPersonagens(permitidas);

  permitidas.forEach(function (p) {
    /* Ficha que não se montou fica sem recursos na lista — ausente do
       mapa quer dizer "não mostrar", e nenhum número é inventado. */
    var lida = fichas[p.id];
    if (!lida || !lida.ok) return;
    var ficha = lida.ficha;
    var lista;
    if (ehFichaDeOrdem(ficha)) {
      lista = recursosResumidos(ficha);
      if (!lista) { saida[String(p.id)] = { pendente: true, lista: [] }; return; }
    } else {
      lista = (Array.isArray(ficha.status) ? ficha.status : [])
        .filter(function (s) { return s && typeof s === 'object'; })
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

    return {
      ok: true,
      rev: registro.rev,
      avisos: resultado.avisos,
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
      combate.turno = { rodada: t.rodada, ativoId: t.ativoId };
      continue;
    }

    if (tipo === 'estado') {
      var destino = String(op.valor || '');
      if (destino === combate.estado) continue;
      if (combate.estado === 'preparando' && destino === 'ativo') {
        combate.estado = 'ativo';
        combate.turno = turnoNormalizado(null, combate.participantes, 'ativo');
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
        combate.turno = turnoSemParticipante(combate.turno, combate.participantes, saindo.id);
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
  combate.turno = turnoNormalizado(combate.turno, combate.participantes, combate.estado);
  return { ok: true, avisos: avisos };
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
