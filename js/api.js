/* =====================================================================
   R.A.M.A. — camada de API
   ---------------------------------------------------------------------
   Uma função por operação do servidor, e o token entrando sozinho em
   todas. Nenhuma tela monta corpo de requisição à mão: se uma ação
   nova aparecer, ela nasce aqui.

   O ponto sensível é `repetir`. Uma operação idempotente pode ser
   repetida quando o Apps Script demora a acordar ou tropeça no próprio
   redirecionamento. Uma que CRIA registro não pode: repetir
   "criar_personagem" cria dois personagens.

   Por isso a lista é explícita, e não adivinhada por prefixo do nome da
   ação — nome é fácil de errar, lista é fácil de conferir.
   ===================================================================== */

(function (global) {
  "use strict";

  /* Só o que pode ser repetido sem consequência entra nesta lista.

     Toda leitura entra, por definição. E entram duas gravações, porque
     as duas SUBSTITUEM um valor em vez de acrescentar um registro:
     gravar a mesma foto duas vezes deixa a mesma foto na mesma célula,
     e gravar o mesmo perfil duas vezes deixa o mesmo perfil. Repetir
     não cria nada.

     O que NÃO pode entrar aqui é qualquer ação que CRIE registro —
     criar_personagem repetida cria dois personagens. Essas são
     tentadas uma vez só, e quem chamou decide o que fazer. */
  var IDEMPOTENTES = [
    "ping",
    "sessao",
    "resumo",
    "listar_personagens",
    "ler_personagem",
    "ler_foto",
    "listar_homebrew",
    "listar_campanhas",
    "ler_campanha",
    "ler_perfil",

    "listar_usuarios",
    "listar_personagens_campanha",
    "listar_rolagens",
    "listar_documentos",
    "ler_imagem_documento",
    "listar_notas_mestre",
    "listar_combates",
    "ler_homebrew",
    "ler_imagem_criatura",
    "ler_capa_campanha",
    "sincronizar_campanha",

    "salvar_foto",
    "salvar_perfil",
    "salvar_imagem_criatura",
    "salvar_imagem_documento",
    "salvar_capa_campanha",

    /* Substitui um valor derivado, e só se a revisão ainda for a mesma:
       repetir grava o mesmo número ou recusa por revisão. */
    "atualizar_resumo_personagem",

    /* Cada lote de operações leva um opId, e o servidor guarda os que já
       aplicou: a segunda chegada do mesmo lote é reconhecida e não é
       aplicada de novo. É isso — e só isso — que põe esta gravação na
       lista. */
    "atualizar_combate",

    /* registrar_rolagem repete com segurança porque carrega um id
       próprio: o servidor reconhece a segunda chegada e não cria a
       segunda linha. Sem essa chave ela NÃO poderia estar aqui. */
    "registrar_rolagem",

    /* O lote só aceita leitura — a lista de ações permitidas está
       fechada no servidor. Repeti-lo repete leituras. */
    "lote",
  ];

  function podeRepetir(acao) { return IDEMPOTENTES.indexOf(acao) >= 0; }

  /* Criações que levam um id de operação (v2.15). Sem o id, repetir
     criaria dois personagens; COM ele, o servidor reconhece a segunda
     chegada e devolve o personagem que a primeira criou. É o caso da
     importação de uma ficha grande que estoura o prazo do navegador
     enquanto o servidor ainda termina de gravar.

     salvar_personagem e ajustar_personagem também levam id, mas NÃO
     entram aqui: quem os repete é o salvador e a fila, com espera
     crescente e o MESMO pedido — repetir de novo aqui embaixo, com prazo
     curto, só empilharia pedidos iguais na trava do servidor. */
  var REPETIVEIS_COM_CHAVE = {
    criar_personagem: true,
    duplicar_personagem: true,
  };

  function podeRepetirPedido(dados) {
    return podeRepetir(dados.acao) || (!!REPETIVEIS_COM_CHAVE[dados.acao] && !!dados.operacaoId);
  }

  /* Um id por intenção de gravar. Vai no pedido e, se a resposta se
     perder, vai IGUAL na repetição — é por ele que o servidor sabe que
     é a mesma gravação. */
  function novaOperacao() { return "op-" + global.RAMAUtil.uuid(); }

  /* =================================================================
     DEDUPLICAÇÃO DE PEDIDOS EM VOO
     -----------------------------------------------------------------
     Duas partes da mesma tela pedem a mesma coisa ao mesmo tempo. É
     comum: a lista de campanhas serve ao seletor da ficha e ao rótulo
     do topo; o painel do mestre recarrega os personagens enquanto a aba
     de combate faz o mesmo.

     Quando o segundo pedido chega e o primeiro ainda está voando, não
     há motivo para uma segunda viagem — e com vinte pessoas conectadas
     há bom motivo para não fazê-la. O segundo espera o primeiro.

     Três cuidados:

     · só LEITURA entra. Duas gravações iguais podem ser duas intenções
       diferentes, e juntá-las esconderia uma delas;
     · a chave inclui a ação e todos os parâmetros, menos o token. Dois
       pedidos que diferem em um id não são o mesmo pedido;
     · quem chega depois recebe uma CÓPIA. Sem isso, duas telas ficariam
       com o mesmo objeto na mão e a alteração de uma apareceria na
       outra.

     A janela é a do voo, e nada mais: quando a resposta chega, a
     entrada some. Isto não é cache — não guarda resposta para depois,
     não tem validade e não devolve nada desatualizado. Um pedido feito
     um instante depois do anterior terminar vai à rede de novo. */

  var GRAVACOES_REPETIVEIS = {
    registrar_rolagem: true,
    atualizar_resumo_personagem: true,
    atualizar_combate: true,
  };

  var LEITURAS = {};
  IDEMPOTENTES.forEach(function (acao) {
    if (acao.indexOf("salvar_") !== 0 && !GRAVACOES_REPETIVEIS[acao]) LEITURAS[acao] = true;
  });

  /* =================================================================
     OPERAÇÕES EM ANDAMENTO
     -----------------------------------------------------------------
     Toda ida ao servidor passa por post(). É aqui, então, e só aqui,
     que o sistema sabe que está esperando a planilha — e avisa quem
     quiser mostrar isso.

     Cada operação é anunciada duas vezes: quando começa e quando
     termina (bem ou mal). O anúncio traz a ação, se é leitura ou
     gravação, se foi pedida em SEGUNDO PLANO (a sincronização automática,
     que não merece ocupar a tela) e o resumo de tudo o que está em
     andamento.

     Quem escuta decide o que mostrar: a barra de atividade da casca
     (js/ui.js) acende com qualquer operação de primeiro plano, e o selo
     discreto de "Atualizando…" com as de segundo plano. Botões e regiões
     mostram o próprio estado com RAMAUI.ocupar() — o anúncio central não
     substitui o contexto local, só garante que nenhuma espera fique muda.
     ================================================================= */

  var ouvintes = [];
  var emAndamento = {};
  var proximaOperacao = 0;

  function aoOperar(fn) {
    ouvintes.push(fn);
    return function () { ouvintes = ouvintes.filter(function (f) { return f !== fn; }); };
  }

  function resumoDasOperacoes() {
    var saida = { total: 0, primeiroPlano: 0, segundoPlano: 0, gravacoes: 0 };
    Object.keys(emAndamento).forEach(function (id) {
      var op = emAndamento[id];
      saida.total++;
      if (op.segundoPlano) saida.segundoPlano++; else saida.primeiroPlano++;
      if (op.tipo === "gravacao") saida.gravacoes++;
    });
    return saida;
  }

  function anunciar(evento) {
    evento.resumo = resumoDasOperacoes();
    ouvintes.slice().forEach(function (fn) {
      try { fn(evento); } catch (e) { console.error("[R.A.M.A. · api] ouvinte de operação falhou", e); }
    });
    try {
      document.dispatchEvent(new CustomEvent("rama:operacao", { detail: evento }));
    } catch (e) { /* ambiente sem DOM */ }
  }

  var emVoo = {};

  function chaveDoPedido(dados) {
    var copia = {};
    Object.keys(dados).sort().forEach(function (k) {
      if (k !== "token") copia[k] = dados[k];
    });
    return JSON.stringify(copia);
  }

  /* Chamada crua: quem precisa de uma ação que ainda não tem função
     própria usa esta, e o token entra do mesmo jeito.

     opcoes.segundoPlano: a operação é uma atualização automática — o
     aviso dela é o selo discreto, nunca a barra de atividade. */
  async function post(corpo, opcoes) {
    var o = opcoes || {};
    var dados = Object.assign({}, corpo);
    if (!dados.token && global.RAMAAuth) {
      var t = global.RAMAAuth.token();
      if (t) dados.token = t;
    }

    var operacao = {
      id: ++proximaOperacao,
      acao: dados.acao,
      tipo: LEITURAS[dados.acao] ? "leitura" : "gravacao",
      segundoPlano: !!o.segundoPlano,
      inicio: Date.now(),
    };

    emAndamento[operacao.id] = operacao;
    anunciar({ fase: "inicio", operacao: operacao });

    var r;
    try {
      r = await postSemAnuncio(dados);
      return r;
    } finally {
      delete emAndamento[operacao.id];
      anunciar({ fase: "fim", operacao: operacao, ok: !!(r && r.ok), erro: r ? r.erro : "sem_resposta" });
    }
  }

  async function postSemAnuncio(dados) {
    if (!LEITURAS[dados.acao]) return enviar(dados);

    var chave = chaveDoPedido(dados);

    if (emVoo[chave]) {
      var r0 = await emVoo[chave];
      return global.RAMAUtil.copiar(r0);
    }

    var promessa = enviar(dados);
    emVoo[chave] = promessa;

    try {
      return await promessa;
    } finally {
      delete emVoo[chave];
    }
  }

  async function enviar(dados) {
    var r = await global.RAMARede.postar(dados, { repetir: podeRepetirPedido(dados) });

    /* Sessão morta é assunto de autenticação, não de tela: quem
       descobre avisa o RAMAAuth, que limpa e leva ao portão. Sem isto
       cada página precisaria repetir esse tratamento. */
    if (r && !r.ok && ehErroDeSessao(r.erro) && global.RAMAAuth) {
      global.RAMAAuth.aoPerderSessao(r.erro);
    }

    return r || { ok: false, erro: "sem_resposta" };
  }

  function ehErroDeSessao(erro) {
    return erro === "sessao" || erro === "expirada" || erro === "inativo" || erro === "sem_token";
  }

  /* =================================================================
     SESSÃO
     ================================================================= */

  function login(usuario, senha) {
    /* Login pode repetir: uma senha errada volta como resposta de
       verdade e para na primeira tentativa. Só o tropeço do Google —
       que não chega a contar tentativa — é repetido. */
    return global.RAMARede.postar(
      { acao: "login", usuario: usuario, senha: senha },
      { repetir: true }
    );
  }

  /* =================================================================
     LOTE
     -----------------------------------------------------------------
     Várias leituras numa requisição só.

     O ganho não é de planilha, é de latência: cada chamada ao Apps
     Script paga o custo de partida do contêiner, e abrir uma ficha
     pedia quatro chamadas em duas ondas. Juntas, pagam uma partida e
     validam a sessão uma vez.

     Devolve SEMPRE um array do mesmo tamanho da lista de pedidos, na
     mesma ordem. Se o lote inteiro falhar — sessão vencida, servidor
     fora —, cada posição recebe esse mesmo erro, para quem chamou
     tratar cada resposta do mesmo jeito que trataria a avulsa.

     O servidor só aceita leitura aqui. Gravação continua indo uma a
     uma, porque uma falha no meio de um lote de gravações deixaria
     metade aplicada e não há como desfazer.

     O LOTE É OTIMIZAÇÃO, NÃO REQUISITO
     -----------------------------------------------------------------
     O site e o Apps Script são publicados separadamente, e nada garante
     que estejam na mesma versão. Um servidor mais antigo não conhece
     esta ação e responde `acao_desconhecida`.

     Quando isso acontece, o lote não pode ser um beco sem saída: quem
     chamou precisa conseguir fazer do jeito antigo. Por isso a
     descoberta fica guardada, e a partir da primeira recusa o lote
     responde na hora, sem gastar outra viagem para ouvir o mesmo não.

     A memória dura o tempo desta página, e não mais. Guardá-la no
     navegador pouparia uma chamada por tela abrida enquanto o servidor
     estiver desatualizado, ao custo de o site continuar no caminho
     lento depois de o Apps Script ser atualizado — até alguém fechar a
     aba. Entre gastar uma viagem por página num estado que é
     temporário e ficar preso nele depois de resolvido, a escolha é a
     primeira. */
  var servidorAceitaLote = true;

  function semLote(lista) {
    return lista.map(function () { return { ok: false, erro: "acao_desconhecida" }; });
  }

  async function lote(pedidos) {
    var lista = pedidos || [];
    if (!lista.length) return [];
    if (!servidorAceitaLote) return semLote(lista);

    var r = await post({ acao: "lote", pedidos: lista });

    if (r && !r.ok && r.erro === "acao_desconhecida") {
      servidorAceitaLote = false;
      global.RAMARede.registrar("aviso",
        "Este servidor não conhece a ação 'lote' — seguindo com chamadas avulsas. " +
        "Atualize a implantação do Apps Script para as telas abrirem numa viagem só.");
      return semLote(lista);
    }

    if (!r || !r.ok || !r.dados || !Array.isArray(r.dados.respostas)) {
      var erro = { ok: false, erro: (r && r.erro) || "sem_resposta" };
      return lista.map(function () { return Object.assign({}, erro); });
    }

    var respostas = r.dados.respostas;
    return lista.map(function (pedido, i) {
      return respostas[i] || { ok: false, erro: "sem_resposta" };
    });
  }

  function sessao(token) { return post({ acao: "sessao", token: token }); }
  function logout(token) { return post({ acao: "logout", token: token }); }
  function ping() { return post({ acao: "ping" }); }

  /* =================================================================
     PANORAMA
     ================================================================= */

  function resumo() { return post({ acao: "resumo" }); }

  /* =================================================================
     PERSONAGENS
     -----------------------------------------------------------------
     A listagem devolve só o cabeçalho de cada registro (nome, campanha,
     datas) — nunca a ficha inteira. Trinta fichas completas numa
     resposta seria megabytes para desenhar uma lista de nomes.
     ================================================================= */

  function listarPersonagens() { return post({ acao: "listar_personagens" }); }

  function lerPersonagem(id) {
    return post({ acao: "ler_personagem", personagemId: id });
  }

  /* A criação (e a importação, que é uma criação) leva um id de
     operação: repetida porque a resposta não chegou, não vira dois. */
  function criarPersonagem(dados) {
    return post({ acao: "criar_personagem", dados: dados, operacaoId: novaOperacao() });
  }

  /* A rev é obrigatória: é ela que impede sobrescrever em silêncio o
     que outro aparelho gravou enquanto esta tela estava aberta.

     `operacaoId` identifica ESTA gravação. O salvador manda o mesmo id
     quando repete o mesmo pedido depois de uma falha de rede: se o
     servidor já tinha gravado, ele responde que deu certo em vez de
     aplicar de novo — ou de acusar um conflito com a própria gravação. */
  function salvarPersonagem(id, rev, dados, operacaoId) {
    var corpo = { acao: "salvar_personagem", personagemId: id, rev: rev, dados: dados };
    if (operacaoId) corpo.operacaoId = operacaoId;
    return post(corpo);
  }

  function excluirPersonagem(id) {
    return post({ acao: "excluir_personagem", personagemId: id });
  }

  function duplicarPersonagem(id) {
    return post({ acao: "duplicar_personagem", personagemId: id, operacaoId: novaOperacao() });
  }

  /* A foto anda fora da ficha, e por um motivo prático: ela é o campo
     mais pesado do registro e o que menos muda. Junto no fichaJson,
     cada tecla digitada numa anotação reenviaria a imagem inteira. */
  function lerFoto(id) { return post({ acao: "ler_foto", personagemId: id }); }

  /* Várias fotos numa viagem (v2.16). As listagens passaram a devolver
     só a VERSÃO de cada foto; quem desenha os cartões pede aqui as que
     ainda não tem — ver js/imagens.js. O servidor devolve só as que a
     conta alcança, e quem não aparecer na resposta é quem não tem foto
     ou não pode ser visto. */
  function lerFotos(ids) {
    return post({ acao: "ler_fotos", personagemIds: ids });
  }

  function lerAvatares(ids) {
    return post({ acao: "ler_avatares", userIds: ids });
  }

  function salvarFoto(id, imagem) {
    return post({ acao: "salvar_foto", personagemId: id, imagem: imagem });
  }

  /* =================================================================
     HOMEBREW
     ================================================================= */

  /* escopo: "meus" (padrão), "publicos" ou "todos". O padrão é o mais
     restrito de propósito — quem não pediu conteúdo alheio não recebe. */
  /* opcoes.tipos: só estes tipos (ex.: os de item, sem habilidades nem
     criaturas). O servidor filtra antes de ler o conteúdo; um servidor
     antigo ignora o campo, e por isso quem chama filtra de novo. */
  function listarHomebrew(opcoes) {
    var o = opcoes || {};
    var corpo = { acao: "listar_homebrew", escopo: o.escopo || "meus", tipo: o.tipo || "" };
    if (Array.isArray(o.tipos) && o.tipos.length) corpo.tipos = o.tipos;
    return post(corpo, o.segundoPlano ? { segundoPlano: true } : undefined);
  }

  function salvarHomebrew(registro) {
    return post({ acao: "salvar_homebrew", dados: registro });
  }

  function excluirHomebrew(id) {
    return post({ acao: "excluir_homebrew", homebrewId: id });
  }

  /* =================================================================
     CAMPANHAS
     ================================================================= */

  function listarCampanhas() { return post({ acao: "listar_campanhas" }); }

  function lerCampanha(id, opcoes) { return post({ acao: "ler_campanha", campanhaId: id }, opcoes); }

  function criarCampanha(dados) { return post({ acao: "criar_campanha", dados: dados }); }

  function salvarCampanha(id, rev, dados) {
    return post({ acao: "salvar_campanha", campanhaId: id, rev: rev, dados: dados });
  }

  function excluirCampanha(id) { return post({ acao: "excluir_campanha", campanhaId: id }); }

  /* As marcas de cada parte da campanha. Pergunta leve e automática —
     sempre em segundo plano. Ver "Marcas da mesa" em Campanhas.gs. */
  function sincronizarCampanha(id) {
    return post({ acao: "sincronizar_campanha", campanhaId: id }, { segundoPlano: true });
  }

  function lerCapaCampanha(id, opcoes) {
    return post({ acao: "ler_capa_campanha", campanhaId: id }, opcoes);
  }

  /* imagem vazia remove a capa. */
  function salvarCapaCampanha(id, imagem, largura, altura) {
    return post({ acao: "salvar_capa_campanha", campanhaId: id, imagem: imagem || "", largura: largura, altura: altura });
  }

  /* =================================================================
     PERFIL
     ================================================================= */

  function lerPerfil() { return post({ acao: "ler_perfil" }); }

  function salvarPerfil(dados) { return post({ acao: "salvar_perfil", dados: dados }); }

  /* =================================================================
     HOMEBREW — LEITURA AVULSA E IMAGENS
     ================================================================= */

  function lerHomebrew(id) { return post({ acao: "ler_homebrew", homebrewId: id }); }

  function lerImagemCriatura(id) { return post({ acao: "ler_imagem_criatura", criaturaId: id }); }

  function salvarImagemCriatura(id, imagem) {
    return post({ acao: "salvar_imagem_criatura", criaturaId: id, imagem: imagem });
  }

  /* =================================================================
     CAMPANHA — PARTICIPANTES E PERSONAGENS
     ================================================================= */

  function listarUsuarios() { return post({ acao: "listar_usuarios" }); }

  function salvarParticipantes(campanhaId, membros) {
    return post({ acao: "salvar_participantes", campanhaId: campanhaId, membros: membros });
  }

  function listarPersonagensCampanha(campanhaId, opcoes) {
    return post({ acao: "listar_personagens_campanha", campanhaId: campanhaId }, opcoes);
  }

  /* O máximo de PV, PE e Sanidade calculado por quem pode ver a ficha,
     para a mesa ver sem receber a ficha. `rev` é a revisão sobre a qual a
     conta foi feita. */
  function atualizarResumoPersonagem(personagemId, rev, resumo) {
    return post({
      acao: "atualizar_resumo_personagem", personagemId: personagemId, rev: rev, resumo: resumo,
    }, { segundoPlano: true });
  }

  function vincularPersonagem(campanhaId, personagemId, vincular) {
    return post({
      acao: "vincular_personagem", campanhaId: campanhaId,
      personagemId: personagemId, vincular: vincular !== false,
    });
  }

  /* O ajuste cirúrgico do painel do mestre: um campo, por id, com a
     revisão conferida. Não é um atalho mais frouxo do que salvar a
     ficha — é o mesmo controle sobre um payload menor. */
  /* `campanhaId` (opcional): o servidor confere que o personagem
     continua nesta campanha antes de ajustar. */
  /* `operacaoId` (opcional): a fila do painel manda o mesmo id quando
     repete o mesmo ajuste, para uma resposta perdida não virar um
     conflito com o próprio ajuste. */
  function ajustarPersonagem(personagemId, rev, alvo, itemId, campo, valor, campanhaId, operacaoId) {
    var corpo = {
      acao: "ajustar_personagem", personagemId: personagemId, rev: rev,
      alvo: alvo, itemId: itemId, campo: campo, valor: valor,
    };
    if (campanhaId) corpo.campanhaId = campanhaId;
    if (operacaoId) corpo.operacaoId = operacaoId;
    return post(corpo);
  }

  /* =================================================================
     CAMPANHA — ROLAGENS
     ================================================================= */

  /* `envio` vai para post(): { segundoPlano: true } na atualização
     automática da aba.

     A página seguinte é pedida por CURSOR (v2.16), não por posição: o
     servidor devolve `proximo`, e mandá-lo de volta continua de onde
     parou. Uma rolagem nova no topo deixa de empurrar a paginação — com
     posição, a última linha de uma página reaparecia na seguinte. */
  function listarRolagens(campanhaId, opcoes, envio) {
    var o = opcoes || {};
    var corpo = { acao: "listar_rolagens", campanhaId: campanhaId, limite: o.limite };
    if (o.cursor) corpo.cursor = o.cursor;
    return post(corpo, envio);
  }

  /* A rolagem JÁ aconteceu. O `rolagemId` é gerado por quem rolou e é a
     chave que impede uma retentativa de virar duas linhas no histórico.
     Nunca gere um id novo ao repetir o envio. */
  function registrarRolagem(campanhaId, rolagem) {
    return post({
      acao: "registrar_rolagem", campanhaId: campanhaId,
      rolagemId: rolagem.id, personagemId: rolagem.personagemId || "",
      tipo: rolagem.tipo || "", nome: rolagem.nome || "",
      dados: rolagem.dados,
    });
  }

  function limparRolagens(campanhaId) {
    return post({ acao: "limpar_rolagens", campanhaId: campanhaId });
  }

  /* =================================================================
     CAMPANHA — DOCUMENTOS, NOTAS E COMBATES
     ================================================================= */

  function listarDocumentos(campanhaId, opcoes) {
    return post({ acao: "listar_documentos", campanhaId: campanhaId }, opcoes);
  }

  function salvarDocumento(campanhaId, dados, rev) {
    return post({ acao: "salvar_documento", campanhaId: campanhaId, dados: dados, rev: rev });
  }

  function excluirDocumento(campanhaId, documentoId) {
    return post({ acao: "excluir_documento", campanhaId: campanhaId, documentoId: documentoId });
  }

  function lerImagemDocumento(campanhaId, documentoId, opcoes) {
    return post({ acao: "ler_imagem_documento", campanhaId: campanhaId, documentoId: documentoId }, opcoes);
  }

  function salvarImagemDocumento(campanhaId, documentoId, imagem) {
    return post({
      acao: "salvar_imagem_documento", campanhaId: campanhaId,
      documentoId: documentoId, imagem: imagem,
    });
  }

  function listarNotasMestre(campanhaId) {
    return post({ acao: "listar_notas_mestre", campanhaId: campanhaId });
  }

  function salvarNotaMestre(campanhaId, dados) {
    return post({ acao: "salvar_nota_mestre", campanhaId: campanhaId, dados: dados });
  }

  function excluirNotaMestre(campanhaId, notaId) {
    return post({ acao: "excluir_nota_mestre", campanhaId: campanhaId, notaId: notaId });
  }

  function listarCombates(campanhaId, opcoes) {
    return post({ acao: "listar_combates", campanhaId: campanhaId }, opcoes);
  }

  /* Um lote de operações sobre um combate. `opId` identifica o lote e é
     o MESMO em toda repetição dele — gerar outro ao repetir seria pedir
     para aplicar duas vezes. */
  function atualizarCombate(campanhaId, combateId, rev, opId, ops) {
    return post({
      acao: "atualizar_combate", campanhaId: campanhaId, combateId: combateId,
      rev: rev, opId: opId, ops: ops,
    });
  }

  function salvarCombate(campanhaId, dados, rev) {
    return post({ acao: "salvar_combate", campanhaId: campanhaId, dados: dados, rev: rev });
  }

  function excluirCombate(campanhaId, combateId) {
    return post({ acao: "excluir_combate", campanhaId: campanhaId, combateId: combateId });
  }

  /* =================================================================
     MENSAGENS
     -----------------------------------------------------------------
     Um código de erro do servidor vira uma frase que uma pessoa
     entende. "Error 403 fetch" não ajuda ninguém; o detalhe técnico
     continua no console, onde é útil.
     ================================================================= */

  var FRASES = {
    sem_configuracao: {
      titulo: "R.A.M.A. NÃO CONFIGURADO",
      texto: "O endereço do servidor ainda não foi informado. Preencha API_URL em js/config.js.",
    },
    sem_conexao: {
      titulo: "SEM CONEXÃO",
      texto: "Este aparelho não conseguiu alcançar a rede. O que você digitou continua aqui; assim que a conexão voltar, o envio se repete sozinho.",
    },
    prazo: {
      titulo: "O SERVIDOR DEMOROU DEMAIS",
      texto: "O R.A.M.A. já tentou algumas vezes e a resposta não chegou. " +
             "O servidor entra em repouso quando fica parado e a primeira consulta " +
             "o acorda — se esta foi a primeira do dia, tente de novo: agora costuma ir.",
    },
    servidor_falhou: {
      titulo: "NÃO FOI POSSÍVEL ACESSAR O ARQUIVO",
      texto: "O servidor respondeu de forma inesperada. Tente novamente; se continuar, confira a publicação do Apps Script.",
    },
    sem_permissao: {
      titulo: "ACESSO NEGADO",
      texto: "Este registro não pertence à sua conta.",
    },
    nao_encontrado: {
      titulo: "REGISTRO NÃO ENCONTRADO",
      texto: "Ele pode ter sido excluído de outro aparelho.",
    },
    conflito: {
      titulo: "ALTERAÇÃO CONFLITANTE",
      texto: "Este registro mudou em outro aparelho enquanto você trabalhava.",
    },
    credenciais: {
      titulo: "ENTRADA RECUSADA",
      texto: "Usuário ou senha incorretos.",
    },
    bloqueado: {
      titulo: "ENTRADA BLOQUEADA",
      texto: "Tentativas demais. Espere alguns minutos antes de tentar de novo.",
    },
    expirada: {
      titulo: "SESSÃO EXPIRADA",
      texto: "Entre novamente para continuar.",
    },
    sessao: {
      titulo: "SESSÃO INVÁLIDA",
      texto: "Entre novamente para continuar.",
    },
    inativo: {
      titulo: "CONTA DESATIVADA",
      texto: "Esta conta não está mais ativa. Procure quem administra o R.A.M.A.",
    },
    dados_invalidos: {
      titulo: "DADOS RECUSADOS",
      texto: "O servidor não aceitou o conteúdo enviado. Confira os campos e tente de novo.",
    },
    ocupado: {
      titulo: "ARQUIVO OCUPADO",
      texto: "Outra gravação está acontecendo neste momento. Tente novamente em instantes.",
    },
    instalacao_incompleta: {
      titulo: "SERVIDOR INCOMPLETO",
      texto: "Falta uma parte da instalação no Apps Script: um dos arquivos (Dados.gs, Codigo.gs, Campanhas.gs) ou uma aba da planilha. " +
             "Quem administra o R.A.M.A. confere os três arquivos e roda setupRama() no editor. O que você fez continua aqui.",
    },
    /* v2.15 — a ficha em blocos. Nenhuma destas frases sugere apagar
       habilidades, rituais ou anotações: o problema nunca é o que a
       pessoa escreveu. */
    ficha_ilegivel: {
      titulo: "A FICHA NÃO SE MONTOU POR INTEIRO",
      texto: "Uma parte do que está guardado desta ficha não confere com a verificação do arquivo. Por segurança ela não abre " +
             "nem é gravada por cima: nada foi alterado nem apagado. Quem administra o R.A.M.A. pode conferir e recuperar a " +
             "versão anterior no Apps Script (diagnosticarPersonagem e restaurarGeracaoAnterior).",
    },
    armazenamento_falhou: {
      titulo: "O ARQUIVO NÃO CONFIRMOU A GRAVAÇÃO",
      texto: "A planilha não confirmou esta versão. A versão anterior continua guardada e intacta, e o que você fez continua " +
             "neste aparelho — a gravação é repetida sozinha.",
    },
    dados_grandes: {
      titulo: "CONTEÚDO GRANDE DEMAIS PARA UM CAMPO",
      texto: "Este conteúdo passou do tamanho que um campo da planilha aceita (imagem, nota, item ou combate). Nada foi " +
             "gravado pela metade. Se isto apareceu ao salvar uma ficha, o servidor ainda é de uma versão anterior à v2.15: " +
             "quem administra o R.A.M.A. precisa implantar o Apps Script atual.",
    },
    acao_desconhecida: {
      titulo: "OPERAÇÃO NÃO RECONHECIDA",
      texto: "Esta versão do site pediu algo que o servidor não conhece. Atualize a implantação do Apps Script.",
    },
  };

  function milhares(n) {
    return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  function frase(resposta) {
    var codigo = (resposta && resposta.erro) || "servidor_falhou";

    /* O limite de uma ficha inteira. Os números vêm do servidor — o site
       não guarda cópia dele, então quem mudar o limite lá não precisa
       mudar nada aqui. */
    if (codigo === "ficha_grande_demais") {
      var tamanho = resposta.tamanho ? milhares(resposta.tamanho) + " caracteres" : "o tamanho atual";
      var limite = resposta.limite ? milhares(resposta.limite) : "o limite";
      return {
        titulo: "A FICHA PASSOU DO LIMITE DE GRAVAÇÃO",
        texto: "Esta ficha tem " + tamanho + ", e o servidor aceita até " + limite + " por gravação — um limite de operação, " +
               "para cada salvamento não segurar a mesa inteira. Nada foi perdido: o que está na tela continua aqui. Exporte uma " +
               "cópia em Opções da ficha → Exportar ficha e avise quem administra o R.A.M.A. (o limite fica em backend/Dados.gs).",
      };
    }

    var f = FRASES[codigo];
    if (f) return f;
    return {
      titulo: "ALGO DEU ERRADO",
      texto: "O servidor recusou esta operação (" + codigo + "). Detalhes no console.",
    };
  }

  /* Uma linha só, para avisos passageiros. */
  function recado(resposta) {
    var f = frase(resposta);
    return f.titulo + " — " + f.texto;
  }

  global.RAMAApi = {
    post: post,
    lote: lote,
    aoOperar: aoOperar,
    operacoesEmAndamento: resumoDasOperacoes,
    aceitaLote: function () { return servidorAceitaLote; },
    podeRepetir: podeRepetir,
    podeRepetirPedido: podeRepetirPedido,
    novaOperacao: novaOperacao,
    ehErroDeSessao: ehErroDeSessao,

    login: login,
    sessao: sessao,
    logout: logout,
    ping: ping,
    resumo: resumo,

    listarPersonagens: listarPersonagens,
    lerPersonagem: lerPersonagem,
    criarPersonagem: criarPersonagem,
    salvarPersonagem: salvarPersonagem,
    excluirPersonagem: excluirPersonagem,
    duplicarPersonagem: duplicarPersonagem,
    lerFoto: lerFoto,
    lerFotos: lerFotos,
    lerAvatares: lerAvatares,
    salvarFoto: salvarFoto,

    listarHomebrew: listarHomebrew,
    salvarHomebrew: salvarHomebrew,
    excluirHomebrew: excluirHomebrew,

    listarCampanhas: listarCampanhas,
    lerCampanha: lerCampanha,
    criarCampanha: criarCampanha,
    salvarCampanha: salvarCampanha,
    excluirCampanha: excluirCampanha,
    sincronizarCampanha: sincronizarCampanha,
    lerCapaCampanha: lerCapaCampanha,
    salvarCapaCampanha: salvarCapaCampanha,

    lerPerfil: lerPerfil,
    salvarPerfil: salvarPerfil,

    lerHomebrew: lerHomebrew,
    lerImagemCriatura: lerImagemCriatura,
    salvarImagemCriatura: salvarImagemCriatura,

    listarUsuarios: listarUsuarios,
    salvarParticipantes: salvarParticipantes,
    listarPersonagensCampanha: listarPersonagensCampanha,
    atualizarResumoPersonagem: atualizarResumoPersonagem,
    vincularPersonagem: vincularPersonagem,
    ajustarPersonagem: ajustarPersonagem,

    listarRolagens: listarRolagens,
    registrarRolagem: registrarRolagem,
    limparRolagens: limparRolagens,

    listarDocumentos: listarDocumentos,
    salvarDocumento: salvarDocumento,
    excluirDocumento: excluirDocumento,
    lerImagemDocumento: lerImagemDocumento,
    salvarImagemDocumento: salvarImagemDocumento,

    listarNotasMestre: listarNotasMestre,
    salvarNotaMestre: salvarNotaMestre,
    excluirNotaMestre: excluirNotaMestre,

    listarCombates: listarCombates,
    salvarCombate: salvarCombate,
    atualizarCombate: atualizarCombate,
    excluirCombate: excluirCombate,

    frase: frase,
    recado: recado,
  };
})(window);
