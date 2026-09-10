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
    excluir_combate:             { publica: false, fn: acaoExcluirCombate },
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
    if (dados.descricao !== undefined) guardado.descricao = String(dados.descricao).slice(0, 4000);
    if (dados.rolagensMestreOcultas !== undefined) {
      guardado.rolagensMestreOcultas = !!dados.rolagensMestreOcultas;
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

    return { ok: true, rev: registro.rev };
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
     ABAS.CAMPANHA_DOCUMENTOS_IMAGENS, ABAS.CAMPANHA_NOTAS, ABAS.CAMPANHA_COMBATES
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

    return { ok: true, dados: { membros: membrosParaCliente(ctx.campanha, membrosDaCampanha(ctx.campanha.id)) } };
  });
}

/* =====================================================================
   PERSONAGENS DA CAMPANHA
   ===================================================================== */

function acaoListarPersonagensCampanha(corpo, usuario) {
  var ctx = contextoDaCampanha(corpo.campanhaId, usuario);
  if (!ctx.ok) return ctx;

  /* Espectador de campanha pública não recebe a mesa: ver que uma
     campanha existe não é ver quem joga nela com que ficha. */
  if (ctx.papel === PAPEL_ESPECTADOR) return { ok: true, dados: [] };

  var donos = {};
  lerTudo(ABAS.USUARIOS).forEach(function (u) { donos[u.id] = u.nome || u.usuario; });

  /* Duas etapas, e a ordem é o ponto.

     Primeiro descobre QUAIS personagens são desta campanha, varrendo só
     as colunas leves — nenhum fichaJson e nenhuma foto atravessam o
     serviço nesta etapa. Só então busca o conteúdo das linhas que
     sobraram.

     Antes, esta tela lia a ficha completa e a foto de TODOS os
     personagens do sistema para desenhar os sete da mesa. */
  var daMesa = lerLeves(ABAS.PERSONAGENS).filter(function (p) {
    return String(p.campanhaId) === String(ctx.campanha.id);
  });

  var fichas = lerCelulas(ABAS.PERSONAGENS, daMesa, 'fichaJson');

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
      var ficha = lerJson(fichas[p._linha], {});

      /* O painel do mestre precisa de status e atributos para os
         controles rápidos, mas não da ficha inteira: perícias,
         inventário e anotações ficam para quando alguém abrir a ficha
         de verdade. É a diferença entre uma tela que carrega e uma que
         baixa megabytes para desenhar quatro números. */
      return {
        id: p.id,
        nome: p.nome,
        classe: p.classe || '',
        origem: p.origem || '',
        ownerId: p.ownerId,
        dono: donos[p.ownerId] || '',
        souDono: meu(p, usuario),
        foto: fotos[p.id] || '',
        rev: Number(p.rev) || 0,
        atributos: (ficha.atributos || []).map(function (a) {
          return { id: a.id, nome: a.nome, sigla: a.sigla, valor: a.valor, dado: a.dado };
        }),
        status: (ficha.status || []).map(function (s) {
          return { id: s.id, nome: s.nome, atual: s.atual, maximo: s.maximo };
        }),
      };
    })
    .sort(function (a, b) { return String(a.nome).localeCompare(String(b.nome), 'pt-BR'); });

  return { ok: true, dados: lista };
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

    /* O vínculo também vive dentro do fichaJson, e os dois precisam
       concordar — senão a ficha abre dizendo uma campanha e a listagem
       mostra outra. */
    var ficha = lerJson(personagem.fichaJson, {});
    ficha.campanhaId = personagem.campanhaId || null;

    personagem.atualizadoEm = new Date().toISOString();
    personagem.rev = (Number(personagem.rev) || 0) + 1;
    personagem.fichaJson = JSON.stringify(ficha);

    atualizarLinha(ABAS.PERSONAGENS, personagem._linha, personagem);

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
};

function acaoAjustarPersonagem(corpo, usuario) {
  var alvo = String(corpo.alvo || '');
  var campo = String(corpo.campo || '');

  var permitidos = CAMPOS_AJUSTAVEIS[alvo];
  if (!permitidos || permitidos.indexOf(campo) < 0) return { ok: false, erro: 'dados_invalidos' };

  var valor = Number(corpo.valor);
  if (!Number.isFinite(valor)) return { ok: false, erro: 'dados_invalidos' };
  valor = Math.round(valor);
  if (valor < -99999 || valor > 999999) return { ok: false, erro: 'dados_invalidos' };

  return comTrava(function () {
    var acesso = personagemAcessivel(corpo.personagemId, usuario);
    if (!acesso.ok) return acesso;

    var registro = acesso.personagem;
    var revAtual = Number(registro.rev) || 0;
    var revPedida = Number(corpo.rev);

    if (Number.isFinite(revPedida) && revPedida !== revAtual) {
      return { ok: false, erro: 'conflito', rev: revAtual };
    }

    var ficha = lerJson(registro.fichaJson, {});
    var lista = alvo === 'status' ? (ficha.status || []) : (ficha.atributos || []);

    var item = null;
    for (var i = 0; i < lista.length; i++) {
      if (String(lista[i].id) === String(corpo.itemId)) { item = lista[i]; break; }
    }
    if (!item) return { ok: false, erro: 'nao_encontrado' };

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
    registro.fichaJson = JSON.stringify(ficha);

    atualizarLinha(ABAS.PERSONAGENS, registro._linha, registro);

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

    return { ok: true };
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

  var lista = visiveis
    .map(function (c) { return combateParaCliente(c, ctx, conteudos[c._linha]); })
    .sort(function (a, b) { return String(b.atualizadoEm).localeCompare(String(a.atualizadoEm)); });

  return { ok: true, dados: lista };
}

/* O que o mestre vê e o que o jogador vê são respostas DIFERENTES,
   montadas aqui. O jogador autorizado recebe a lista e a ordem — que é
   o que ele precisa para jogar — e não a ficha interna das criaturas.
   Ver a lista não é ver os pontos de vida do monstro. */
function combateParaCliente(c, ctx, jsonPronto) {
  var dados = lerJson(jsonPronto === undefined ? c.dadosJson : jsonPronto, {});
  var participantes = Array.isArray(dados.participantes) ? dados.participantes : [];

  var saida = {
    id: c.id,
    nome: c.nome,
    estado: c.estado || 'preparando',
    criadoEm: c.criadoEm,
    atualizadoEm: c.atualizadoEm,
    rev: Number(c.rev) || 0,
  };

  if (ctx.mestre) {
    saida.participantes = participantes;
    saida.visiveis = lerJson(c.visiveisJson, []) || [];
    return saida;
  }

  saida.participantes = participantes.map(function (p) {
    return {
      id: p.id,
      tipo: p.tipo,
      nome: p.nome,
      ordem: Number(p.ordem) || 0,
      personagemId: p.tipo === 'personagem' ? p.personagemId : null,
    };
  });

  return saida;
}

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

    var estado = ['preparando', 'ativo', 'encerrado'].indexOf(String(dados.estado)) >= 0
      ? String(dados.estado) : 'preparando';

    var json = JSON.stringify({ participantes: participantes });
    if (json.length > MAX_CELULA) return { ok: false, erro: 'dados_grandes' };

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

      existente.nome = nome;
      existente.estado = estado;
      existente.visiveisJson = JSON.stringify(visiveis);
      existente.atualizadoEm = agora;
      existente.rev = revAtual + 1;
      existente.dadosJson = json;

      atualizarLinha(ABAS.CAMPANHA_COMBATES, existente._linha, existente);
      return { ok: true, dados: { id: existente.id }, rev: existente.rev };
    }

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
      dadosJson: json,
    });

    return { ok: true, dados: { id: id }, rev: 1 };
  });
}

/* Cada participante é conferido: personagem tem de ser da campanha, e
   a ordem é um número. O snapshot da criatura passa como veio — ele é
   conteúdo do mestre, montado a partir de uma criatura que ele já podia
   ver quando montou o combate. */
function normalizarParticipantes(lista, ctx) {
  if (!Array.isArray(lista)) return [];

  /* Só id e nome interessam aqui, e os dois são colunas leves. */
  var daMesa = {};
  lerLeves(ABAS.PERSONAGENS).forEach(function (p) {
    if (String(p.campanhaId) === String(ctx.campanha.id)) daMesa[p.id] = p.nome;
  });

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

function acaoExcluirCombate(corpo, usuario) {
  return comTrava(function () {
    var ctx = exigirMestre(corpo.campanhaId, usuario);
    if (!ctx.ok) return ctx;

    var combate = acharPor(ABAS.CAMPANHA_COMBATES, 'id', corpo.combateId);
    if (!combate || String(combate.campanhaId) !== String(ctx.campanha.id)) {
      return { ok: false, erro: 'nao_encontrado' };
    }

    apagarLinha(ABAS.CAMPANHA_COMBATES, combate._linha);
    return { ok: true };
  });
}
