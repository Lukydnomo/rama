/* =====================================================================
   R.A.M.A. — backend
   =====================================================================
   Google Apps Script publicado como app da Web. É a ÚNICA coisa entre o
   navegador e a planilha, e é onde toda decisão de segurança acontece.

   ---------------------------------------------------------------------
   OS TRÊS ARQUIVOS
   ---------------------------------------------------------------------

   A implantação precisa dos três, com estes nomes:

     Dados.gs      esquema das abas e acesso ao Sheets
     Codigo.gs     este — entrada, sessão, permissões, personagens
     Campanhas.gs  tudo o que é campanha

   O Apps Script avalia todos os .gs no mesmo escopo global antes de
   atender qualquer requisição, e declarações de função são içadas entre
   arquivos: a ordem em que aparecem no editor não importa. O que
   importa é os três existirem. Faltando Dados.gs o sistema não tem como
   ler nada, e `doPost` responde com um erro que diz isso em vez de uma
   pilha de execução.

   A divisão é de manutenção, não de desempenho: separar arquivos não
   deixa nada mais rápido. O que ficou mais rápido está DENTRO do
   Dados.gs, no jeito de ler.

   ---------------------------------------------------------------------
   O QUE ESTE ARQUIVO ASSUME, E POR QUÊ
   ---------------------------------------------------------------------

   O frontend é território de quem usa. Ele roda no navegador de outra
   pessoa, pode ser lido inteiro, alterado pelo console e chamado por
   fora da interface. Então nada do que ele manda é confiável:

     · o ownerId de uma gravação NUNCA vem do pedido — é derivado da
       sessão, aqui;
     · toda leitura confere o dono, mesmo que a tela já tivesse
       escondido o botão;
     · trocar o id no pedido não abre o registro de outra conta.

   Esconder um botão é conveniência visual. Recusar é aqui.

   ---------------------------------------------------------------------
   O QUE PRECISA ESTAR EM SCRIPT PROPERTIES
   ---------------------------------------------------------------------

     RAMA_PLANILHA_ID   obrigatório se o script não estiver vinculado a
                        uma planilha. O id que aparece na URL dela.

     RAMA_PEPPER        obrigatório. Segredo do servidor misturado a
                        toda senha antes do hash. Ele NÃO fica na
                        planilha: quem conseguir uma cópia do arquivo
                        ainda não consegue testar senhas sem ele.
                        Gere uma vez com gerarPepper() e guarde.

     RAMA_ITERACOES     opcional, padrão 10000. Quantas voltas de
                        HMAC-SHA-256 a derivação da senha dá. Mais
                        voltas = login mais lento para todo mundo,
                        inclusive para quem tenta adivinhar.

   NENHUM desses valores pode ir para o repositório. Este arquivo, como
   está, é seguro para publicar — ele lê os segredos, não os contém.

   ---------------------------------------------------------------------
   COMO INSTALAR
   ---------------------------------------------------------------------

     1. rode setupRama()          cria as abas e os cabeçalhos
     2. rode gerarPepper()        cria o segredo, uma única vez
     3. rode criarPrimeiroUsuario()  ajuste o nome e a senha antes
     4. Implantar → Nova implantação → App da Web
          Executar como:  Eu
          Quem tem acesso: Qualquer pessoa
     5. copie a URL /exec para js/config.js do frontend

   "Qualquer pessoa" libera o ENDEREÇO, não os dados: sem token válido
   toda ação responde erro. É assim que se consegue receber POST de um
   site no GitHub Pages sem pedir login do Google a cada pessoa.
   ===================================================================== */

/* =====================================================================
   CONFIGURAÇÃO
   ===================================================================== */

/* Visibilidade, em um só lugar. 'privado' é o padrão de tudo o que não
   diz o contrário — inclusive das linhas antigas, cuja célula está
   vazia. Um padrão que erra para o lado de esconder. */
var VIS_PRIVADO = 'privado';
var VIS_PUBLICO = 'publico';

function visibilidadeDe(valor) {
  return String(valor) === VIS_PUBLICO ? VIS_PUBLICO : VIS_PRIVADO;
}

var PAPEL_MESTRE = 'mestre';
var PAPEL_JOGADOR = 'jogador';
var PAPEL_ESPECTADOR = 'espectador';

var DIAS_SESSAO = 30;

/* Uma hora entre carimbos de atividade. Gravar a cada requisição
   dobraria o número de escritas e disputaria o lock com o salvamento
   da ficha, para ganhar precisão que ninguém usa. */
var INTERVALO_ATIVIDADE_MS = 60 * 60 * 1000;

var MAX_TENTATIVAS = 8;
var MINUTOS_BLOQUEIO = 15;

/* =====================================================================
   ENTRADA
   ===================================================================== */

function doPost(e) {
  var comecou = Date.now();
  var acao = '';

  /* Uma requisição do Apps Script começa com o escopo global limpo, e o
     Dados.gs conta com isso para guardar o que leu sem risco de servir
     dado de outra pessoa. Dizer isso em voz alta custa nada e faz o
     comportamento ser o mesmo em qualquer ambiente que reaproveite o
     global — o simulador dos testes, por exemplo. */
  if (typeof reiniciarExecucao === 'function') reiniciarExecucao();

  try {
    /* Dados.gs ausente é o único erro de instalação que vale a pena
       distinguir: sem ele nenhuma ação funciona, e o sintoma sem esta
       conferência seria "ReferenceError: ABAS is not defined" chegando
       ao navegador como um 500 sem explicação. */
    if (typeof ABAS === 'undefined') {
      return responder({ ok: false, erro: 'instalacao_incompleta' });
    }

    var corpo = lerCorpo(e);
    if (!corpo) return responder({ ok: false, erro: 'dados_invalidos' });

    acao = String(corpo.acao || '');
    var rota = rotaDe(acao);
    if (!rota) return responder({ ok: false, erro: 'acao_desconhecida' }, acao, comecou);

    /* Login e ping são as únicas portas abertas. Todo o resto exige
       uma sessão que o servidor reconheça — e a identidade sai dela,
       nunca do que o pedido afirma ser. */
    if (rota.publica) return responder(rota.fn(corpo, null), acao, comecou);

    var antesDaSessao = Date.now();
    var sessao = validarSessao(corpo.token);
    anotar('msSessao', Date.now() - antesDaSessao);
    if (!sessao.ok) return responder({ ok: false, erro: sessao.erro }, acao, comecou);

    return responder(rota.fn(corpo, sessao.usuario), acao, comecou);
  } catch (erro) {
    /* A mensagem interna vai para o log do Apps Script; o cliente
       recebe um código, não a pilha de execução. */
    console.error('R.A.M.A. falhou: ' + (erro && erro.stack ? erro.stack : erro));
    return responder({ ok: false, erro: 'servidor_falhou' }, acao, comecou);
  }
}

/* Abrir a URL no navegador não pode devolver dado nenhum: doGet existe
   só para dizer que o endereço está no ar. */
function doGet() {
  return responder({ ok: true, dados: { servico: 'R.A.M.A.', metodo: 'use POST' } });
}

function lerCorpo(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return null;
    var corpo = JSON.parse(e.postData.contents);
    return (corpo && typeof corpo === 'object') ? corpo : null;
  } catch (erro) {
    return null;
  }
}

/* A única saída. Com o diagnóstico ligado, ela é também o único lugar
   que sabe quanto a requisição inteira custou — ver "Diagnóstico de
   desempenho", abaixo. */
function responder(objeto, acao, comecou) {
  var resposta = objeto;
  var ligado = false;

  try { ligado = comecou !== undefined && diagnosticoLigado(); } catch (erro) { ligado = false; }

  if (ligado) {
    var numeros = numerosDaRequisicao(acao, Date.now() - comecou, 0);
    resposta.diag = numeros;
  }

  var texto = JSON.stringify(resposta);

  if (ligado) {
    resposta.diag.resposta = texto.length;
    texto = JSON.stringify(resposta);
    console.log('R.A.M.A. perf ' + JSON.stringify(resposta.diag));
  }

  return ContentService
    .createTextOutput(texto)
    .setMimeType(ContentService.MimeType.JSON);
}
/* =====================================================================
   DIAGNÓSTICO DE DESEMPENHO
   ---------------------------------------------------------------------
   O medidor de Dados.gs conta sempre. Este interruptor decide se a
   contagem vira LOG e se ela volta na resposta:

     RAMA_DIAGNOSTICO = 1   uma linha no log por requisição, e o campo
                            `diag` na resposta
     ausente ou 0           nada

   Ligar e desligar pelo editor: ligarDiagnostico() / desligarDiagnostico().

   Três coisas que esta instrumentação NÃO faz, de propósito:

     · não grava nada na planilha. Uma linha de log por requisição numa
       aba seria uma escrita por leitura — o contrário de medir;
     · não registra token, senha, id de conta, nome nem conteúdo de
       ficha. O que sai são números e o nome da ação;
     · não muda decisão nenhuma. Com o diagnóstico ligado ou desligado,
       a resposta é a mesma fora do campo `diag`.

   O campo `diag` existe para separar o que é tempo de servidor do que é
   latência de rede: o navegador mede a viagem inteira e desconta o `ms`
   que veio de dentro — ver js/rede.js.
   ===================================================================== */

function diagnosticoLigado() {
  var e = exec();
  if (e.diagnostico === undefined) {
    e.diagnostico = String(propriedade('RAMA_DIAGNOSTICO', '0')) === '1';
  }
  return e.diagnostico;
}

function ligarDiagnostico() {
  definirPropriedade('RAMA_DIAGNOSTICO', '1');
  console.log('R.A.M.A.: diagnóstico LIGADO. Cada requisição passa a registrar uma linha "R.A.M.A. perf".');
  return true;
}

function desligarDiagnostico() {
  definirPropriedade('RAMA_DIAGNOSTICO', '0');
  console.log('R.A.M.A.: diagnóstico desligado.');
  return false;
}

/* Os números desta requisição, prontos para o log e para a resposta.
   `ms` é o tempo do servidor: da entrada do doPost até a serialização
   da resposta. */
function numerosDaRequisicao(acao, ms, tamanho) {
  var m = medidor();
  return {
    acao: String(acao || ''),
    ms: ms,
    sessaoMs: m.msSessao,
    travaMs: m.msTrava,
    presaMs: m.msPresa,
    sheets: m.chamadas,
    leituras: m.leituras,
    escritas: m.escritas,
    celulas: m.celulas,
    cache: m.cacheAcertos + '/' + (m.cacheAcertos + m.cacheFalhas),
    fichas: m.fichas,
    blocos: m.blocos,
    resumos: m.resumosUsados + '/' + (m.resumosUsados + m.resumosRefeitos),
    resposta: tamanho,
  };
}



/* =====================================================================
   ROTEAMENTO
   ===================================================================== */

/* O mapa é montado sob demanda, e não numa `var` de topo.

   O motivo é concreto: as ações de campanha moram em Campanhas.gs, e o
   Apps Script avalia os arquivos numa ordem que não controlamos. Um
   objeto literal montado no carregamento de Codigo.gs poderia apontar
   para funções que ainda não existem. Montado na primeira requisição,
   todos os arquivos já foram lidos.

   O resultado fica em cache: a execução seguinte reaproveita. */
var CACHE_ROTAS = null;

function rotaDe(acao) {
  if (!CACHE_ROTAS) {
    CACHE_ROTAS = rotasDoNucleo();

    /* Campanhas.gs se anuncia por esta função. Se o arquivo não
       estiver instalado, o núcleo continua funcionando sozinho — e as
       ações de campanha respondem 'acao_desconhecida' em vez de
       derrubar o script inteiro. */
    if (typeof rotasDeCampanha === 'function') {
      var extras = rotasDeCampanha();
      Object.keys(extras).forEach(function (chave) { CACHE_ROTAS[chave] = extras[chave]; });
    }

    /* Cris.gs (v2.34): a leitura de ficha pública do CRIS. Mesmo
       contrato: sem o arquivo, a ação responde 'acao_desconhecida' e a
       tela explica que o servidor precisa ser atualizado. */
    if (typeof rotasDoCris === 'function') {
      var doCris = rotasDoCris();
      Object.keys(doCris).forEach(function (chave) { CACHE_ROTAS[chave] = doCris[chave]; });
    }
  }
  return CACHE_ROTAS[acao] || null;
}

function rotasDoNucleo() {
  return {
  ping:                  { publica: true,  fn: acaoPing },
  login:                 { publica: true,  fn: acaoLogin },

  /* Várias leituras numa requisição só. Ver acaoLote(). */
  lote:                  { publica: false, fn: acaoLote },

  sessao:                { publica: false, fn: acaoSessao },
  logout:                { publica: false, fn: acaoLogout },
  resumo:                { publica: false, fn: acaoResumo },

  listar_personagens:    { publica: false, fn: acaoListarPersonagens },
  ler_personagem:        { publica: false, fn: acaoLerPersonagem },
  criar_personagem:      { publica: false, fn: acaoCriarPersonagem },
  salvar_personagem:     { publica: false, fn: acaoSalvarPersonagem },
  excluir_personagem:    { publica: false, fn: acaoExcluirPersonagem },
  duplicar_personagem:   { publica: false, fn: acaoDuplicarPersonagem },

  /* A organização pessoal da página Personagens (v2.26). Só o dono:
     ser mestre de uma mesa dá acesso à ficha, não às pastas da conta. */
  criar_pasta:           { publica: false, fn: acaoCriarPasta },
  renomear_pasta:        { publica: false, fn: acaoRenomearPasta },
  excluir_pasta:         { publica: false, fn: acaoExcluirPasta },
  mover_personagem:      { publica: false, fn: acaoMoverPersonagem },

  ler_foto:              { publica: false, fn: acaoLerFoto },
  /* Várias fotos numa viagem, sem a listagem carregá-las. Ver
     "Imagens sob demanda". */
  ler_fotos:             { publica: false, fn: acaoLerFotos },
  ler_avatares:          { publica: false, fn: acaoLerAvatares },
  salvar_foto:           { publica: false, fn: acaoSalvarFoto },

  listar_homebrew:       { publica: false, fn: acaoListarHomebrew },
  ler_homebrew:          { publica: false, fn: acaoLerHomebrew },
  salvar_homebrew:       { publica: false, fn: acaoSalvarHomebrew },
  excluir_homebrew:      { publica: false, fn: acaoExcluirHomebrew },

  ler_imagem_criatura:   { publica: false, fn: acaoLerImagemCriatura },
  salvar_imagem_criatura:{ publica: false, fn: acaoSalvarImagemCriatura },

  ler_perfil:            { publica: false, fn: acaoLerPerfil },
  salvar_perfil:         { publica: false, fn: acaoSalvarPerfil },
  /* Temas de dados (v2.40): o resgate é a ÚNICA porta que concede. */
  resgatar_codigo:       { publica: false, fn: acaoResgatarCodigo },
  listar_desbloqueios:   { publica: false, fn: acaoListarDesbloqueios },

  /* As ações de campanha ficam em Campanhas.gs e entram pelo rotaDe(). */
  };
}

/* =====================================================================
   O LOTE
   ---------------------------------------------------------------------
   Várias leituras numa requisição só.

   O problema que ele resolve não é de planilha, é de latência. Abrir
   uma ficha pedia quatro requisições: conferir a sessão, ler a ficha,
   ler a foto e listar as campanhas. Cada uma é uma viagem completa até
   o Apps Script — e o Apps Script tem um custo de partida que não
   depende do que se pediu. Quatro viagens custam quatro partidas.

   Juntas numa execução, elas pagam a partida uma vez, validam a sessão
   uma vez e — porque o Dados.gs guarda o que leu enquanto a execução
   dura — leem cada aba uma vez, mesmo que três delas precisem da mesma.

   O QUE O LOTE NÃO FAZ
   ---------------------------------------------------------------------

   Gravar. A lista de ações aceitas é fechada e só tem leitura, por três
   motivos que se somam:

     · o lote é declarado idempotente no cliente, para poder ser
       repetido quando o servidor demora a acordar. Uma gravação
       repetida cria registro duas vezes;
     · uma falha no meio de um lote de gravações deixaria metade
       aplicada, e o Apps Script não oferece transação para desfazer;
     · a trava seria segurada por tantas operações quantas coubessem no
       lote, que é exatamente o contrário do que esta versão persegue.

   Cada sub-ação faz a PRÓPRIA conferência de permissão, com o mesmo
   usuário da sessão. O lote não é um caminho lateral mais frouxo: é a
   mesma função que a ação avulsa chamaria, com o mesmo argumento. Um
   pedido de campanha alheia dentro de um lote é recusado pela mesma
   linha de código que o recusaria sozinho.
   ===================================================================== */

var LOTE_MAXIMO = 8;

/* Fechada de propósito, e só com leitura. Uma ação nova não entra aqui
   por descuido: entra porque alguém escreveu o nome. */
function acoesDeLote() {
  return {
    sessao: true,
    resumo: true,
    listar_personagens: true,
    ler_personagem: true,
    ler_foto: true,
    ler_fotos: true,
    ler_avatares: true,
    listar_homebrew: true,
    ler_homebrew: true,
    ler_imagem_criatura: true,
    ler_perfil: true,
    listar_campanhas: true,
    ler_campanha: true,
    listar_usuarios: true,
    listar_personagens_campanha: true,
    listar_rolagens: true,
    listar_documentos: true,
    ler_imagem_documento: true,
    listar_notas_mestre: true,
    listar_combates: true,
    ler_capa_campanha: true,
    ler_capas: true,
  };
}

function acaoLote(corpo, usuario) {
  var pedidos = Array.isArray(corpo.pedidos) ? corpo.pedidos : [];

  if (!pedidos.length) return { ok: false, erro: 'dados_invalidos' };
  if (pedidos.length > LOTE_MAXIMO) return { ok: false, erro: 'dados_invalidos' };

  var permitidas = acoesDeLote();

  var respostas = pedidos.map(function (pedido) {
    var acao = String((pedido && pedido.acao) || '');

    if (!permitidas[acao]) return { ok: false, erro: 'acao_desconhecida', acao: acao };

    var rota = rotaDe(acao);
    if (!rota || rota.publica) return { ok: false, erro: 'acao_desconhecida', acao: acao };

    /* Uma sub-ação que estoura não derruba as outras. Quem pediu quatro
       coisas e recebeu três recebe também o motivo da quarta, em vez de
       uma tela em branco. */
    try {
      var r = rota.fn(pedido, usuario) || { ok: false, erro: 'sem_resposta' };
      r.acao = acao;
      return r;
    } catch (erro) {
      console.error('R.A.M.A. lote/' + acao + ': ' + (erro && erro.stack ? erro.stack : erro));
      return { ok: false, erro: 'servidor_falhou', acao: acao };
    }
  });

  return { ok: true, dados: { respostas: respostas } };
}

/* =====================================================================
   CRIPTOGRAFIA
   ===================================================================== */

function bytesParaHex(bytes) {
  var saida = '';
  for (var i = 0; i < bytes.length; i++) {
    var b = (bytes[i] + 256) % 256;
    saida += (b < 16 ? '0' : '') + b.toString(16);
  }
  return saida;
}

function hexParaBytes(hex) {
  var texto = String(hex || '');
  var bytes = [];
  for (var i = 0; i + 1 < texto.length; i += 2) {
    var b = parseInt(texto.substr(i, 2), 16);
    bytes.push(b > 127 ? b - 256 : b);
  }
  return bytes;
}

function sha256Hex(texto) {
  return bytesParaHex(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(texto), Utilities.Charset.UTF_8)
  );
}

/* Utilities.getUuid() usa o gerador seguro da plataforma. Dois deles
   juntos passam de 240 bits de entropia; o hash só uniformiza o
   formato. Um token previsível seria a falha mais grave possível aqui. */
function novoSegredo() {
  return sha256Hex(Utilities.getUuid() + '|' + Utilities.getUuid() + '|' + Date.now());
}

function novoId() {
  return Utilities.getUuid();
}

/* PBKDF2-HMAC-SHA256, um bloco de 32 bytes.
   ---------------------------------------------------------------------
   O Apps Script não traz bcrypt, scrypt nem PBKDF2 prontos, mas traz
   HMAC-SHA-256 — e PBKDF2 é exatamente HMAC repetido com XOR
   acumulado. Implementar é melhor do que a alternativa comum, que é
   guardar SHA-256 puro: um hash de uma volta só cai numa tabela
   pronta em segundos.

   Repetir custa tempo de propósito. É o mesmo custo para quem entra
   uma vez e para quem tenta um milhão de senhas. */
function derivarSenha(senha, saltHex, iteracoes) {
  var pepper = propriedade('RAMA_PEPPER', '');
  if (!pepper) throw new Error('RAMA_PEPPER não definido. Rode gerarPepper() uma vez.');

  var chave = Utilities.newBlob(String(senha) + '|' + pepper).getBytes();
  var salt = hexParaBytes(saltHex);

  /* PBKDF2 manda concatenar o salt com o índice do bloco (1) em quatro
     bytes big-endian. Como só há um bloco, o índice é sempre 1. */
  var bloco = salt.concat([0, 0, 0, 1]);

  var u = Utilities.computeHmacSha256Signature(bloco, chave);
  var saida = u.slice();

  for (var i = 1; i < iteracoes; i++) {
    u = Utilities.computeHmacSha256Signature(u, chave);
    for (var j = 0; j < saida.length; j++) saida[j] = saida[j] ^ u[j];
  }

  return bytesParaHex(saida);
}

/* Comparação de tempo constante. Um `===` sai no primeiro caractere
   diferente, e a diferença de tempo entre "errou no primeiro" e
   "errou no último" é medível pela rede. */
function iguaisEmTempoConstante(a, b) {
  var x = String(a || '');
  var y = String(b || '');
  if (x.length !== y.length) return false;

  var diferenca = 0;
  for (var i = 0; i < x.length; i++) {
    diferenca |= x.charCodeAt(i) ^ y.charCodeAt(i);
  }
  return diferenca === 0;
}

/* =====================================================================
   SESSÃO
   ===================================================================== */

/* Na planilha fica o HASH do token, nunca o token. Quem abrir o arquivo
   vê 64 caracteres que não servem para entrar em lugar nenhum — o mesmo
   raciocínio que se aplica à senha vale para a chave de sessão.

   ---------------------------------------------------------------------
   O CACHE DA SESSÃO
   ---------------------------------------------------------------------

   Toda requisição passa por aqui, e antes desta versão toda requisição
   pagava duas varreduras completas: SESSOES para achar o token e
   USUARIOS para achar a conta. Numa sessão de jogo com vinte pessoas
   isso é o custo fixo mais alto do sistema, e ele é pago antes de a
   ação sequer começar.

   A resposta é um cache curto, e cada decisão dele tem motivo:

     chave      'rama.sessao.' + o hash do token. Formar essa chave
                exige o token, que só quem tem a sessão tem. Não existe
                caminho para ler a entrada de outra pessoa.

     conteúdo   id, usuário, nome e datas — o suficiente para as ações
                trabalharem. NUNCA hashSenha, salt, token ou o pepper:
                o cache é mais fácil de inspecionar do que a planilha,
                e não há motivo para pôr lá o que não é usado.

     validade   120 segundos. Curto o bastante para uma revogação feita
                à mão na planilha aparecer quase na hora; longo o
                bastante para cobrir a rajada de requisições de quem
                abre uma tela.

     época      o carimbo de RAMA_EPOCA entra na entrada e é conferido
                na leitura. Trocar senha, desativar conta ou mexer em
                participantes avança a época e derruba TODAS as
                entradas na mesma hora — que é o jeito de revogar num
                serviço que não deixa procurar chaves.

     ausência   cache vazio não é erro. Cai no caminho da planilha, que
                continua sendo a fonte da verdade. O cache acelera; não
                autoriza.

   O que continua sendo conferido a CADA requisição, venha o dado de
   onde vier: a sessão estar ativa, o prazo não ter vencido e a conta
   não estar desativada. Nada disso é dispensado por estar em cache — o
   prazo, inclusive, é conferido contra o relógio de agora, e não contra
   o de quando a entrada foi criada.

   E o que o cache NÃO cobre, dito sem rodeio: marcar `ativo = false` na
   linha da SESSOES direto na planilha, com a mão, pode levar até dois
   minutos para fazer efeito. Sair pelo botão, trocar a senha e
   desativar a conta têm efeito imediato, porque passam por código que
   apaga a entrada ou avança a época. */

var SEGUNDOS_CACHE_SESSAO = 120;

function chaveDeSessao(hash) { return 'rama.sessao.' + hash; }

function sessaoDoCache(hash) {
  var bruto = cacheLer(chaveDeSessao(hash));
  if (!bruto) return null;

  var guardado = lerJson(bruto, null);
  if (!guardado || guardado.epoca !== epoca()) return null;

  return guardado;
}

function guardarSessaoNoCache(hash, usuario, sessao) {
  cacheGravar(chaveDeSessao(hash), JSON.stringify({
    epoca: epoca(),
    /* Campo a campo, e não o registro inteiro: o registro traz
       hashSenha e salt, que não têm o que fazer aqui. */
    usuario: {
      id: usuario.id,
      usuario: usuario.usuario,
      nome: usuario.nome,
      ativo: String(usuario.ativo),
      criadoEm: usuario.criadoEm,
    },
    expiraEm: Number(sessao.expiraEm) || 0,
    ultimaAtividade: Number(sessao.ultimaAtividade) || 0,
  }), SEGUNDOS_CACHE_SESSAO);
}

function esquecerSessaoNoCache(hash) {
  cacheApagar(chaveDeSessao(hash));
}

function validarSessao(token) {
  var bruto = String(token || '');
  if (!bruto) return { ok: false, erro: 'sem_token' };

  var hash = sha256Hex(bruto);
  var agora = Date.now();

  var guardado = sessaoDoCache(hash);
  if (guardado) {
    /* O prazo vale contra o relógio de agora, nunca contra o de quando
       a entrada foi criada. Uma sessão que venceu dentro da janela do
       cache é recusada aqui, sem consultar nada. */
    if (guardado.expiraEm && agora > guardado.expiraEm) {
      esquecerSessaoNoCache(hash);
      return expirarSessao(hash);
    }
    if (String(guardado.usuario.ativo) !== 'true') return { ok: false, erro: 'inativo' };

    renovarAtividade(hash, guardado.ultimaAtividade, agora);

    return { ok: true, usuario: guardado.usuario, sessao: null, doCache: true };
  }

  var sessao = acharPor(ABAS.SESSOES, 'tokenHash', hash);
  if (!sessao) return { ok: false, erro: 'sessao' };

  if (String(sessao.ativo) !== 'true') return { ok: false, erro: 'sessao' };

  var expira = Number(sessao.expiraEm) || 0;
  if (expira && agora > expira) return expirarSessao(hash);

  var usuario = acharPor(ABAS.USUARIOS, 'id', sessao.userId);
  if (!usuario) return { ok: false, erro: 'sessao' };
  if (String(usuario.ativo) !== 'true') return { ok: false, erro: 'inativo' };

  guardarSessaoNoCache(hash, usuario, sessao);

  renovarAtividade(hash, Number(sessao.ultimaAtividade) || 0, agora);

  return { ok: true, usuario: usuario, sessao: sessao };
}

/* Marca a sessão vencida na planilha e no cache. */
function expirarSessao(hash) {
  esquecerSessaoNoCache(hash);

  comTrava(function () {
    var atual = acharPor(ABAS.SESSOES, 'tokenHash', hash);
    if (atual && String(atual.ativo) === 'true') {
      atual.ativo = 'false';
      atualizarLinha(ABAS.SESSOES, atual._linha, atual);
    }
    return { ok: true };
  });

  return { ok: false, erro: 'expirada' };
}

/* Renova o prazo, mas com parcimônia: uma gravação por hora, não uma
   por requisição. Com vinte pessoas conectadas, carimbar a atividade a
   cada chamada seria uma disputa constante pela trava do script para
   ganhar precisão que ninguém usa. */
function renovarAtividade(hash, ultimaAtividade, agora) {
  if (agora - ultimaAtividade <= INTERVALO_ATIVIDADE_MS) return;

  comTrava(function () {
    var atual = acharPor(ABAS.SESSOES, 'tokenHash', hash);
    if (!atual) return { ok: true };

    atual.ultimaAtividade = agora;
    atual.expiraEm = agora + DIAS_SESSAO * 86400000;
    atualizarLinha(ABAS.SESSOES, atual._linha, atual);

    /* A entrada guardada envelheceu junto: sem isto, a próxima
       requisição leria a atividade antiga e tentaria carimbar de novo. */
    esquecerSessaoNoCache(hash);
    return { ok: true };
  });
}

function acaoPing() {
  var nome = '';
  try { nome = planilha().getName(); } catch (erro) { nome = '(sem planilha)'; }
  return { ok: true, dados: { servico: 'R.A.M.A.', planilha: nome, quando: new Date().toISOString() } };
}

function acaoLogin(corpo) {
  var usuario = String(corpo.usuario || '').trim().toLowerCase();
  var senha = String(corpo.senha || '');

  if (!usuario || !senha) return { ok: false, erro: 'credenciais' };

  /* A aba USUARIOS precisa estar legível ANTES de conferir qualquer
     senha.

     Se ela não estiver — cabeçalho perdido, coluna renomeada —, o hash
     guardado volta vazio e NENHUMA senha do mundo confere. Sem esta
     conferência, o sintoma é "usuário ou senha incorretos" para todo
     mundo, para sempre, sem nenhuma pista de que o problema é a
     planilha e não a senha.

     A conferência vem antes da busca de propósito: assim ela não
     revela se aquele usuário existe. Ela fala da PLANILHA, não da
     conta. */
  var quebradas = colunasIlegiveis(ABAS.USUARIOS).filter(function (c) {
    return c === 'usuario' || c === 'hashSenha' || c === 'salt' || c === 'ativo';
  });

  if (quebradas.length) {
    console.error('R.A.M.A.: a aba USUARIOS está sem as colunas ' + quebradas.join(', ') +
      '. Nenhuma senha vai conferir enquanto isso durar. Rode setupRama().');
    return { ok: false, erro: 'instalacao_incompleta' };
  }

  var bloqueio = conferirBloqueio(usuario);
  if (bloqueio.bloqueado) {
    return { ok: false, erro: 'bloqueado', minutos: bloqueio.minutos };
  }

  var registro = acharPor(ABAS.USUARIOS, 'usuario', usuario);

  /* Usuário inexistente e senha errada devolvem exatamente a mesma
     resposta. Distinguir os dois entrega a lista de quem existe. */
  if (!registro || String(registro.ativo) !== 'true') {
    var restamA = anotarFalha(usuario);
    return { ok: false, erro: 'credenciais', restam: restamA };
  }

  var iteracoes = Number(registro.iteracoes) || Number(propriedade('RAMA_ITERACOES', '10000'));
  var derivada = derivarSenha(senha, registro.salt, iteracoes);

  if (!iguaisEmTempoConstante(derivada, registro.hashSenha)) {
    var restamB = anotarFalha(usuario);
    return { ok: false, erro: 'credenciais', restam: restamB };
  }

  limparFalhas(usuario);

  var token = novoSegredo();
  var agora = Date.now();

  var resultado = comTrava(function () {
    inserir(ABAS.SESSOES, {
      tokenHash: sha256Hex(token),
      userId: registro.id,
      criadoEm: agora,
      ultimaAtividade: agora,
      expiraEm: agora + DIAS_SESSAO * 86400000,
      ativo: 'true',
      agente: String(corpo.agente || '').slice(0, 120),
    });
    limparSessoesVelhas();
    return { ok: true };
  });

  if (!resultado.ok) return resultado;

  return { ok: true, token: token, agente: perfilPublico(registro) };
}

function acaoSessao(corpo, usuario) {
  return { ok: true, agente: perfilPublico(usuario) };
}

function acaoLogout(corpo) {
  var hash = sha256Hex(String(corpo.token || ''));

  /* Primeiro o cache, depois a planilha. Nesta ordem, uma falha na
     gravação deixa a sessão fora do cache — o pior caso é uma leitura a
     mais. Na ordem inversa, a mesma falha deixaria a sessão VIVA no
     cache por dois minutos depois de a pessoa ter clicado em sair. */
  esquecerSessaoNoCache(hash);

  return comTrava(function () {
    var sessao = acharPor(ABAS.SESSOES, 'tokenHash', hash);
    if (sessao) {
      sessao.ativo = 'false';
      atualizarLinha(ABAS.SESSOES, sessao._linha, sessao);
    }
    return { ok: true };
  });
}

function perfilPublico(usuario) {
  var perfil = acharPor(ABAS.PERFIS, 'userId', usuario.id);
  return {
    id: usuario.id,
    usuario: usuario.usuario,
    nome: usuario.nome || usuario.usuario,
    avatar: imagemDe(perfil, 'avatar'),
    /* As preferências de apresentação vêm com a sessão: a página as
       aplica sem outra consulta. */
    preferencias: preferenciasDaSessao(perfil),
  };
}

/* ---- Preferências da conta (v2.25) ----
   `preferenciasJson` guarda um objeto; quem salva manda só as chaves que
   mudou, e o resto fica. Cada chave aceita tem a sua validação; chave
   desconhecida ou valor fora da lista é recusado — nada vira "sucesso"
   sem ter sido gravado. `null` apaga a chave (volta ao padrão). */
var PREFERENCIAS_ACEITAS = {
  /* v2.36: "personalizado" = o tema da conta indicado em temaAtivo. */
  tema: ['sistema', 'claro', 'escuro', 'personalizado'],
  /* v2.35: como a página Personagens mostra as pastas. */
  exibicaoPastas: ['abas', 'icones'],
};
var PREFERENCIAS_PADRAO = { tema: 'sistema', exibicaoPastas: 'abas' };
/* Preferências estruturadas (v2.36): cada uma com a sua validação, que
   devolve o valor limpo ou null (recusa). */
var PREFERENCIAS_ESTRUTURADAS = {
  temaAtivo: function (v) { return idDeTema(v); },
  temas: function (v) { return normalizarTemasServidor(v); },
};
/* O tamanho da célula, conferido depois de juntar ao que já estava
   gravado (acaoSalvarPerfil): passar dele é "dados_grandes". */
var MAX_PREFERENCIAS_JSON = 45000;

/* Cada preferência aceita, com o valor gravado ou o padrão. A sessão traz
   só o tema personalizado ATIVO (para a página pintar); a lista inteira
   vem com ler_perfil. */
function preferenciasDaSessao(perfil) {
  var prefs = lerJson(perfil && perfil.preferenciasJson, {});
  var saida = {};
  Object.keys(PREFERENCIAS_ACEITAS).forEach(function (chave) {
    var v = prefs && prefs[chave];
    saida[chave] = PREFERENCIAS_ACEITAS[chave].indexOf(v) >= 0 ? v : PREFERENCIAS_PADRAO[chave];
  });
  var ativo = idDeTema(prefs && prefs.temaAtivo);
  var temas = normalizarTemasServidor(prefs && prefs.temas) || [];
  saida.temaAtivo = ativo;
  saida.temaPersonalizado = null;
  temas.forEach(function (t) { if (t.id === ativo) saida.temaPersonalizado = t; });
  return saida;
}

/* Valida o pedido. Devolve null quando algo não serve, ou o pedido com os
   valores estruturados já limpos. */
function validarPreferencias(pedido) {
  if (!pedido || typeof pedido !== 'object' || Array.isArray(pedido)) return null;
  var chaves = Object.keys(pedido);
  if (!chaves.length) return null;
  var limpo = {};
  for (var i = 0; i < chaves.length; i++) {
    var chave = chaves[i];
    var v = pedido[chave];
    if (PREFERENCIAS_ACEITAS[chave]) {
      if (v !== null && PREFERENCIAS_ACEITAS[chave].indexOf(v) < 0) return null;
      limpo[chave] = v;
    } else if (PREFERENCIAS_ESTRUTURADAS[chave]) {
      if (v === null) { limpo[chave] = null; continue; }
      var bom = PREFERENCIAS_ESTRUTURADAS[chave](v);
      if (bom === null) return null;
      limpo[chave] = bom;
    } else {
      return null;
    }
  }
  return limpo;
}

/* =====================================================================
   TEMAS PERSONALIZÁVEIS (v2.36)
   ---------------------------------------------------------------------
   As mesmas regras de js/tema-modelo.js (testes/tema-backend.js confere
   que as listas não divergem). Um tema é dado: cores em hexadecimal,
   transparência, tipo de preenchimento e parâmetros de gradiente. Nada de
   CSS livre, url() ou HTML — o navegador gera o CSS a partir disto.

   Tipo de cada propriedade: g = cor ou gradiente (com transparência),
   c = cor sólida, a = cor com transparência.

   O tema da CONTA só aceita as propriedades gerais (v2.37). As de um
   sistema (TEMA_TOKENS_SISTEMA) só ficam no tema de uma ficha daquele
   sistema; em qualquer outro lugar, caem fora. */
var TEMA_TOKENS = {
  fundo: 'g', superficie: 'g', superficie2: 'g', superficie3: 'c',
  cabecalho: 'g', selecao: 'g', selecaoTexto: 'c',
  texto: 'c', texto2: 'c', texto3: 'c', link: 'c', textoDica: 'c',
  botao: 'g', botaoTexto: 'c', botaoHover: 'g', botaoComum: 'g',
  campo: 'c', tracoMedia: 'c', tracoFraca: 'c', tracoForte: 'c', foco: 'c',
  ok: 'c', aviso: 'c', erro: 'c', paranormal: 'c',
  sombra: 'a', veuModal: 'a', vinheta: 'a', scanline: 'a', veuRecorte: 'a', contornoCor: 'a',
  grau: 'c', elementoSangue: 'c', elementoMorte: 'c', elementoConhecimento: 'c', elementoEnergia: 'c', elementoMedo: 'c',
};
var TEMA_TOKENS_SISTEMA = {
  grau: 'ordem', elementoSangue: 'ordem', elementoMorte: 'ordem',
  elementoConhecimento: 'ordem', elementoEnergia: 'ordem', elementoMedo: 'ordem',
};
var TEMA_MAX_PONTOS = 8;
var TEMA_MAX_TEMAS = 12;
var TEMA_MODOS_FICHA = ['conta', 'sistema', 'claro', 'escuro', 'personalizado'];

function idDeTema(v) { return typeof v === 'string' && /^[a-z0-9-]{1,40}$/.test(v) ? v : null; }
function corDeTema(v) {
  if (typeof v !== 'string') return null;
  var s = v.trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(s)) s = '#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
  return /^#[0-9a-f]{6}$/.test(s) ? s : null;
}
function numeroDeTema(v, min, max) {
  var n = typeof v === 'number' ? v : (typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN);
  if (!isFinite(n)) return null;
  return Math.min(max, Math.max(min, n));
}
function arredondarTema(n, casas) { var f = Math.pow(10, casas); return Math.round(n * f) / f; }

function valorDeTema(tipo, v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  if (v.tipo === 'cor') {
    var cor = corDeTema(v.cor);
    var alfa = v.alfa === undefined ? 1 : numeroDeTema(v.alfa, 0, 1);
    if (!cor || alfa === null) return null;
    return { tipo: 'cor', cor: cor, alfa: tipo === 'c' ? 1 : arredondarTema(alfa, 2) };
  }
  if ((v.tipo === 'linear' || v.tipo === 'radial') && tipo === 'g') {
    if (!Array.isArray(v.pontos) || v.pontos.length < 2 || v.pontos.length > TEMA_MAX_PONTOS) return null;
    var pontos = [];
    for (var i = 0; i < v.pontos.length; i++) {
      var p = v.pontos[i];
      if (!p || typeof p !== 'object') return null;
      var pc = corDeTema(p.cor), pos = numeroDeTema(p.pos, 0, 100);
      var pa = p.alfa === undefined ? 1 : numeroDeTema(p.alfa, 0, 1);
      if (!pc || pos === null || pa === null) return null;
      pontos.push({ cor: pc, alfa: arredondarTema(pa, 2), pos: arredondarTema(pos, 1) });
    }
    pontos.sort(function (a, b) { return a.pos - b.pos; });
    if (v.tipo === 'linear') {
      var ang = numeroDeTema(v.angulo === undefined ? 180 : v.angulo, 0, 360);
      if (ang === null) return null;
      return { tipo: 'linear', angulo: Math.round(ang), pontos: pontos };
    }
    var forma = v.forma === 'circulo' ? 'circulo' : (v.forma === undefined || v.forma === 'elipse' ? 'elipse' : null);
    var x = numeroDeTema(v.x === undefined ? 50 : v.x, 0, 100), y = numeroDeTema(v.y === undefined ? 50 : v.y, 0, 100);
    if (!forma || x === null || y === null) return null;
    return { tipo: 'radial', forma: forma, x: Math.round(x), y: Math.round(y), pontos: pontos };
  }
  return null;
}

/* Um tema; `comId` para os da conta. `sistema`: 'geral' (conta), 'ordem'
   ou 'universal' (o da ficha). null quando a estrutura não serve. Valores
   inválidos — ou de outro sistema — são descartados (voltam à base). */
function normalizarTemaServidor(bruto, comId, sistema) {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return null;
  var base = bruto.base === 'escuro' ? 'escuro' : (bruto.base === undefined || bruto.base === 'claro' ? 'claro' : null);
  if (!base) return null;
  var nome = typeof bruto.nome === 'string' ? bruto.nome.replace(/[\u0000-\u001F\u007F<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40) : '';
  var tema = { v: 1, nome: nome || 'Tema personalizado', base: base, valores: {} };
  if (comId) {
    var id = idDeTema(bruto.id);
    if (!id) return null;
    tema.id = id;
  }
  var valores = bruto.valores && typeof bruto.valores === 'object' && !Array.isArray(bruto.valores) ? bruto.valores : {};
  Object.keys(valores).forEach(function (k) {
    if (!Object.prototype.hasOwnProperty.call(TEMA_TOKENS, k)) return;
    if (TEMA_TOKENS_SISTEMA[k] && TEMA_TOKENS_SISTEMA[k] !== sistema) return;
    var limpo = valorDeTema(TEMA_TOKENS[k], valores[k]);
    if (limpo) tema.valores[k] = limpo;
  });
  return tema;
}

/* A lista de temas da conta: null quando não é lista, passa do máximo ou
   tem id repetido ou inválido. */
function normalizarTemasServidor(lista) {
  if (!Array.isArray(lista) || lista.length > TEMA_MAX_TEMAS) return null;
  var vistos = {};
  var saida = [];
  for (var i = 0; i < lista.length; i++) {
    var t = normalizarTemaServidor(lista[i], true, 'geral');
    if (!t || vistos[t.id]) return null;
    vistos[t.id] = true;
    saida.push(t);
  }
  return saida;
}

/* O bloco de apresentação de uma ficha: inválido vira "usar o tema da
   conta", nunca CSS livre. Chamado em toda criação e gravação. */
function sistemaDaFicha(ficha) {
  return ficha && String(ficha.tipoFicha || '') === 'ordem' ? 'ordem' : 'universal';
}

function normalizarAparenciaServidor(bruto, sistema) {
  var a = bruto && typeof bruto === 'object' && !Array.isArray(bruto) ? bruto : {};
  var modo = TEMA_MODOS_FICHA.indexOf(a.modo) >= 0 ? a.modo : 'conta';
  var saida = { v: 1, modo: modo };
  if (modo === 'personalizado') {
    var tema = normalizarTemaServidor(a.tema, false, sistema);
    if (tema) saida.tema = tema;
    else saida.modo = 'conta';
  }
  /* O tema de dados (v2.40) é outra escolha: só a forma aqui. Quem pode
     equipá-lo é conferido em conferirTemaDosDados, com a conta dona. */
  var dados = RAMATemasDados.normalizarSelecao(a.dados);
  if (dados) saida.dados = dados;
  return saida;
}

function sanearAparencia(ficha) {
  if (ficha && typeof ficha === 'object' && ficha.aparencia !== undefined) {
    ficha.aparencia = normalizarAparenciaServidor(ficha.aparencia, sistemaDaFicha(ficha));
  }
}

/* Junta o pedido ao que está gravado — lido de novo, dentro da trava. */
function juntarPreferencias(gravadoJson, pedido) {
  var atual = lerJson(gravadoJson, {});
  if (!atual || typeof atual !== 'object' || Array.isArray(atual)) atual = {};
  Object.keys(pedido).forEach(function (chave) {
    if (pedido[chave] === null) delete atual[chave];
    else atual[chave] = pedido[chave];
  });
  return atual;
}

/* Sessões encerradas ou vencidas há mais de 30 dias saem da planilha.
   Sem isso a aba cresce para sempre e o login fica mais lento a cada
   entrada — porque validar sessão lê a aba inteira quando o cache não
   ajuda.

   Roda no máximo uma vez por dia. Antes rodava em TODO login, dentro da
   trava, apagando linha por linha: com vinte pessoas entrando na mesma
   noite, dezenove pagavam por uma faxina que a primeira já tinha feito.
   A data da última passagem fica em Script Properties, que é o único
   lugar por aqui que sobrevive à execução e não custa uma gravação na
   planilha. */
var INTERVALO_FAXINA_MS = 24 * 60 * 60 * 1000;

function limparSessoesVelhas() {
  var agora = Date.now();
  var ultima = Number(propriedade('RAMA_FAXINA', '0')) || 0;
  if (agora - ultima < INTERVALO_FAXINA_MS) return 0;

  definirPropriedade('RAMA_FAXINA', String(agora));

  var limite = agora - DIAS_SESSAO * 86400000;
  var condenadas = lerTudo(ABAS.SESSOES).filter(function (s) {
    var venceu = (Number(s.expiraEm) || 0) < limite;
    var morta = String(s.ativo) !== 'true' && (Number(s.ultimaAtividade) || 0) < limite;
    return venceu || morta;
  }).map(function (s) { return s._linha; });

  return apagarLinhas(ABAS.SESSOES, condenadas);
}

/* =====================================================================
   FREIO DE TENTATIVAS
   ---------------------------------------------------------------------
   No CacheService, e não na planilha: a contagem é descartável por
   natureza (só vale durante a janela de bloqueio), e gravar cada senha
   errada na planilha disputaria o lock com o trabalho de verdade.
   ===================================================================== */

function chaveDeTentativa(usuario) { return 'rama.tentativas.' + usuario; }

function conferirBloqueio(usuario) {
  var cache = CacheService.getScriptCache();
  var bruto = cache.get(chaveDeTentativa(usuario));
  var contagem = Number(bruto) || 0;

  if (contagem >= MAX_TENTATIVAS) return { bloqueado: true, minutos: MINUTOS_BLOQUEIO };
  return { bloqueado: false, restam: MAX_TENTATIVAS - contagem };
}

function anotarFalha(usuario) {
  var cache = CacheService.getScriptCache();
  var chave = chaveDeTentativa(usuario);
  var contagem = (Number(cache.get(chave)) || 0) + 1;

  cache.put(chave, String(contagem), MINUTOS_BLOQUEIO * 60);

  return Math.max(0, MAX_TENTATIVAS - contagem);
}

function limparFalhas(usuario) {
  CacheService.getScriptCache().remove(chaveDeTentativa(usuario));
}

/* =====================================================================
   PERMISSÃO
   ---------------------------------------------------------------------
   Uma função só, usada em toda leitura e em toda gravação. Não existe
   caminho que pule esta conferência.
   ===================================================================== */

function meu(registro, usuario) {
  return !!registro && String(registro.ownerId) === String(usuario.id);
}

/* Acha a linha sem trazer a coluna pesada.

   Serve para o caso em que só interessa ONDE o registro está — porque o
   que vem depois é uma gravação por cima, e ler o valor antigo seria
   trabalho jogado fora. O que volta daqui não pode ir para
   `atualizarLinha`; vai para `atualizarCampos`, que grava só o que
   recebeu. */
function linhaLeve(definicao, coluna, valor) {
  var alvo = String(valor);
  if (!alvo) return null;

  var leves = lerLeves(definicao);
  for (var i = 0; i < leves.length; i++) {
    if (String(leves[i][coluna]) === alvo) return leves[i];
  }
  return null;
}

/* Devolve o registro só se ele for de quem está pedindo. Registro de
   outra pessoa responde 'nao_encontrado', e não 'sem_permissao': dizer
   "existe, mas não é seu" já confirma que aquele id existe. */
function meuRegistro(definicao, id, usuario) {
  var registro = acharPor(definicao, 'id', id);
  if (!registro || !meu(registro, usuario)) return null;
  return registro;
}

/* =====================================================================
   A MATRIZ DE PERMISSÕES
   ---------------------------------------------------------------------
   Até a v1 havia uma regra só: o dono acessa, mais ninguém. Com mestre
   de campanha isso deixou de bastar — mas a saída NÃO é afrouxar a
   conferência de dono. É acrescentar um segundo caminho, igualmente
   explícito, e obrigar toda ação a passar por um dos dois.

   Papéis, e o que cada um alcança:

     mestre       criou a campanha (ou foi promovido). Lê e edita as
                  fichas VINCULADAS a ela, vê todas as rolagens,
                  administra documentos, notas e combates.
     jogador      foi convidado. Entra na campanha, vê o que foi
                  liberado, edita a própria ficha como sempre.
     espectador   a campanha é pública e ele não é membro. Vê a
                  existência dela e o que for realmente público.
     nenhum       campanha privada e ele está de fora. Não existe.

   Três coisas que ser mestre NÃO dá:

     · virar dono de ficha alguma (ownerId nunca muda);
     · apagar o personagem de outra pessoa;
     · abrir o catálogo Homebrew privado de um jogador.

   Catálogo e conteúdo já anexado à ficha são coisas diferentes: o
   mestre lê a cópia que está DENTRO da ficha, nunca a biblioteca de
   onde ela saiu.
   ===================================================================== */

/* O contexto que toda ação de campanha pede antes de decidir qualquer
   coisa. Devolve o papel real, derivado da SESSÃO e do BANCO — nunca
   de um campo enviado pelo navegador. */
function contextoDaCampanha(campanhaId, usuario) {
  var campanha = acharPor(ABAS.CAMPANHAS, 'id', campanhaId);
  if (!campanha) return { ok: false, erro: 'nao_encontrado' };

  var papel = papelNaCampanha(campanha, usuario);
  if (!papel) return { ok: false, erro: 'nao_encontrado' };

  return { ok: true, campanha: campanha, papel: papel, mestre: papel === PAPEL_MESTRE };
}

function papelNaCampanha(campanha, usuario) {
  if (!campanha || !usuario) return null;

  /* Quem criou é mestre. Não depende de haver linha em MEMBROS — uma
     campanha recém-criada não teria nenhuma, e o dono ficaria trancado
     para fora da própria campanha. */
  if (String(campanha.ownerId) === String(usuario.id)) return PAPEL_MESTRE;

  var membro = membroDaCampanha(campanha.id, usuario.id);
  if (membro) {
    return String(membro.papel) === PAPEL_MESTRE ? PAPEL_MESTRE : PAPEL_JOGADOR;
  }

  /* Pública deixa entrar para olhar; privada não deixa nem saber que
     existe. */
  if (visibilidadeDe(campanha.visibilidade) === VIS_PUBLICO) return PAPEL_ESPECTADOR;

  return null;
}

/* A aba de membros é pequena e é consultada muitas vezes na mesma
   requisição: uma vez por campanha do usuário ao montar a lista, mais
   uma a cada conferência de papel. Ela é lida UMA vez por execução — o
   Dados.gs cuida disso — e aqui vira um índice por campanha, para as
   conferências seguintes não repetirem o laço.

   O índice vive na execução e some com ela. Não é cache entre
   requisições: mudança de participante feita por outra pessoa aparece
   na requisição seguinte, como tem de ser. */
function indiceDeMembros() {
  var linhas = lerTudo(ABAS.CAMPANHA_MEMBROS);
  var e = exec();

  /* A validade do índice é amarrada ao ARRAY que veio do Dados.gs, e
     não a um sinalizador próprio. Toda gravação em CAMPANHA_MEMBROS
     invalida a varredura, a leitura seguinte devolve um array novo, e
     este `!==` percebe. Um sinalizador separado seria mais uma coisa
     para lembrar de limpar — e a que alguém esqueceria. */
  if (e.indiceMembros && e.indiceMembros.fonte === linhas) return e.indiceMembros.porCampanha;

  var porCampanha = {};
  linhas.forEach(function (m) {
    var c = String(m.campanhaId);
    if (!porCampanha[c]) porCampanha[c] = [];
    porCampanha[c].push(m);
  });

  e.indiceMembros = { fonte: linhas, porCampanha: porCampanha };
  return porCampanha;
}

function membroDaCampanha(campanhaId, userId) {
  var lista = indiceDeMembros()[String(campanhaId)] || [];
  var alvo = String(userId);
  for (var i = 0; i < lista.length; i++) {
    if (String(lista[i].userId) === alvo) return lista[i];
  }
  return null;
}

function membrosDaCampanha(campanhaId) {
  return (indiceDeMembros()[String(campanhaId)] || []).slice();
}

/* Exige mestre. Devolve o contexto ou o erro, e é a primeira linha de
   toda ação administrativa. */
function exigirMestre(campanhaId, usuario) {
  var ctx = contextoDaCampanha(campanhaId, usuario);
  if (!ctx.ok) return ctx;
  if (!ctx.mestre) return { ok: false, erro: 'sem_permissao' };
  return ctx;
}

/* As linhas da campanha que pertencem a ela. Filtro aplicado no
   servidor, sempre — o navegador nunca recebe linha de outra campanha
   para descartar depois. */
function daCampanha(definicao, campanhaId) {
  var alvo = String(campanhaId);
  return lerTudo(definicao).filter(function (r) { return String(r.campanhaId) === alvo; });
}

/* Igual, mas sem arrastar a coluna pesada. Serve para listar, contar e
   filtrar; os registros que voltam daqui NÃO podem ser gravados de
   volta, e o Dados.gs recusa se alguém tentar. */
function daCampanhaLeves(definicao, campanhaId) {
  var alvo = String(campanhaId);
  return lerLeves(definicao).filter(function (r) { return String(r.campanhaId) === alvo; });
}

/* =====================================================================
   ACESSO A PERSONAGEM
   ---------------------------------------------------------------------
   O ponto onde a v1 e a v2 se separam. Duas portas, e só duas:

     1. é seu;
     2. é de um jogador, está vinculado a uma campanha, e quem pede é o
        mestre DAQUELA campanha.

   A segunda porta confere o vínculo no BANCO. Não basta o pedido vir
   com um campanhaId: se o personagem não estiver realmente naquela
   campanha, ou quem pede não for realmente mestre dela, a porta não
   abre. É por isso que o campanhaId do corpo da requisição não entra
   nesta função — ela lê o do próprio personagem.
   ===================================================================== */

function personagemAcessivel(personagemId, usuario, opcoes) {
  var o = opcoes || {};
  var personagem = acharPor(ABAS.PERSONAGENS, 'id', personagemId);
  if (!personagem) return { ok: false, erro: 'nao_encontrado' };

  if (meu(personagem, usuario)) {
    return { ok: true, personagem: personagem, dono: true, mestre: false };
  }

  /* Não é seu. Só resta o caminho do mestre — e ele exige que o
     personagem esteja mesmo numa campanha. */
  if (!personagem.campanhaId) return { ok: false, erro: 'nao_encontrado' };

  /* Para decidir o papel bastam id, dono e visibilidade — todas
     colunas leves. O dadosJson da campanha não entra nesta decisão e
     não precisa ser lido para tomá-la. */
  var campanha = campanhaLeve(personagem.campanhaId);
  if (!campanha) return { ok: false, erro: 'nao_encontrado' };

  if (papelNaCampanha(campanha, usuario) !== PAPEL_MESTRE) {
    return { ok: false, erro: 'nao_encontrado' };
  }

  /* Ser mestre não é ser dono. Apagar e transferir continuam sendo do
     dono, e só dele. */
  if (o.exigeDono) return { ok: false, erro: 'sem_permissao' };

  return { ok: true, personagem: personagem, dono: false, mestre: true, campanha: campanha };
}

/* A campanha sem o dadosJson. É o bastante para decidir papel, que é
   o que quase todo caminho precisa. */
function campanhaLeve(campanhaId) {
  var alvo = String(campanhaId);
  var todas = lerLeves(ABAS.CAMPANHAS);
  for (var i = 0; i < todas.length; i++) {
    if (String(todas[i].id) === alvo) return todas[i];
  }
  return null;
}

/* As campanhas que este usuário alcança, com o papel em cada uma.

   Só as colunas leves: nome, dono e visibilidade decidem tudo o que se
   pergunta aqui. Quem precisar da descrição — que mora no dadosJson —
   pede em campanhasDoUsuarioCompletas().

   Calculado uma vez por requisição e reaproveitado. */
function campanhasDoUsuario(usuario) {
  var porId = {};

  lerLeves(ABAS.CAMPANHAS).forEach(function (c) {
    var papel = papelNaCampanha(c, usuario);
    if (papel) porId[c.id] = { campanha: c, papel: papel };
  });

  return porId;
}

/* A mesma coisa, com o dadosJson das campanhas alcançadas — e só
   dessas. Numa planilha com trinta campanhas em que o usuário está em
   três, lê três descrições em vez de trinta. */
function campanhasDoUsuarioCompletas(usuario) {
  var alcance = campanhasDoUsuario(usuario);
  var ids = Object.keys(alcance);
  if (!ids.length) return alcance;

  /* Passa os registros, não os números: só eles sabem em que ordem de
     colunas a linha foi gravada. */
  var registros = ids.map(function (id) { return alcance[id].campanha; });
  var conteudo = lerCelulas(ABAS.CAMPANHAS, registros, 'dadosJson');

  ids.forEach(function (id) {
    var c = alcance[id].campanha;
    alcance[id].dados = lerJson(conteudo[c._linha], {});
  });

  return alcance;
}


/* =====================================================================
   O DIRETÓRIO DE CONTAS
   ---------------------------------------------------------------------
   Quatro telas precisam da mesma coisa: o nome que acompanha um id de
   conta. O painel da mesa, a lista de participantes, o histórico de
   rolagens e o editor de membros. Cada uma varria a aba USUARIOS
   inteira para montar o mesmo mapa.

   Agora o mapa é montado uma vez e fica no cache por alguns minutos:

     conteúdo     id → { usuario, nome, ativo }. NADA além disso — nem
                  hashSenha, nem salt, nem iterações. O que está aqui é
                  o que qualquer conta já vê em listar_usuarios.
     chave        'rama.contas.' + a época
     validade     300 segundos
     invalidação  a época (troca de senha, conta desativada, mexida em
                  participantes) derruba tudo na hora; trocar o próprio
                  nome apaga a entrada explicitamente
     sem cache    lê a aba, como antes. O cache acelera; não decide
     desatualizado  no pior caso um nome trocado aparece velho por até
                  cinco minutos numa lista. Nenhuma permissão sai daqui

   Permissão NUNCA vem deste mapa: quem decide acesso é a sessão e as
   relações no banco, lidas na hora.
   ===================================================================== */

var SEGUNDOS_CACHE_CONTAS = 300;
var LIMITE_CACHE_CONTAS = 90000;

function chaveDasContas() { return 'rama.contas.' + epoca(); }

function contasDoSistema() {
  var e = exec();
  if (e.contas) return e.contas;

  var doCache = lerJson(cacheLer(chaveDasContas()), null);
  if (doCache) { e.contas = doCache; return doCache; }

  var mapa = {};
  lerTudo(ABAS.USUARIOS).forEach(function (u) {
    mapa[String(u.id)] = { usuario: u.usuario, nome: u.nome || u.usuario, ativo: String(u.ativo) === 'true' };
  });

  var texto = JSON.stringify(mapa);
  if (texto.length <= LIMITE_CACHE_CONTAS) cacheGravar(chaveDasContas(), texto, SEGUNDOS_CACHE_CONTAS);

  e.contas = mapa;
  return mapa;
}

/* id → nome, que é o que as listagens usam. */
function nomesDasContas() {
  var e = exec();
  if (e.nomesDeContas) return e.nomesDeContas;

  var mapa = {};
  var contas = contasDoSistema();
  Object.keys(contas).forEach(function (id) { mapa[id] = contas[id].nome; });

  e.nomesDeContas = mapa;
  return mapa;
}

function esquecerContas() {
  cacheApagar(chaveDasContas());
  var e = exec();
  e.contas = null;
  e.nomesDeContas = null;
}

/* =====================================================================
   IMAGENS SOB DEMANDA
   ---------------------------------------------------------------------
   Foto de personagem e avatar de conta são os campos mais pesados do
   sistema e os que menos mudam. Até a v2.15 eles viajavam DENTRO das
   listagens: abrir uma mesa de oito fichas baixava 120 KB de imagem
   toda vez, inclusive quando nenhuma tinha mudado, e a sincronização da
   mesa repetia isso a cada alteração de qualquer cartão.

   Agora a listagem devolve a VERSÃO (a data da última gravação) e o
   navegador pede as imagens em lote, só as que ainda não tem — ver
   js/imagens.js. Uma foto trocada muda a versão e é buscada de novo;
   as outras não são pedidas.

   PERMISSÃO
   ---------------------------------------------------------------------
   Não é um caminho lateral: a regra é a MESMA que o painel aplica ao
   mandar a foto hoje — o dono do personagem e quem joga na mesma mesa
   que ele (mestre ou jogador; espectador não). Conhecer o id não basta,
   e o pedido de quem não alcança volta sem aquela chave: nenhuma
   imagem, nenhum aviso de que ela existe.

   O avatar segue a regra que já existia: toda conta ativa aparece em
   listar_usuarios para qualquer pessoa conectada, e o avatar vai junto.
   ===================================================================== */

var MAX_IMAGENS_POR_PEDIDO = 40;

function acaoLerFotos(corpo, usuario) {
  var ids = Array.isArray(corpo.personagemIds) ? corpo.personagemIds : [];
  if (!ids.length || ids.length > MAX_IMAGENS_POR_PEDIDO) return { ok: false, erro: 'dados_invalidos' };

  var pedidos = {};
  ids.forEach(function (id) { pedidos[String(id)] = true; });

  var alcance = campanhasDoUsuario(usuario);

  var permitidos = {};
  lerLeves(ABAS.PERSONAGENS).forEach(function (p) {
    if (!pedidos[String(p.id)]) return;
    if (meu(p, usuario)) { permitidos[String(p.id)] = true; return; }

    var daMesa = alcance[String(p.campanhaId || '')];
    if (daMesa && daMesa.papel !== PAPEL_ESPECTADOR) permitidos[String(p.id)] = true;
  });

  var linhas = lerLeves(ABAS.PERSONAGENS_FOTOS).filter(function (f) {
    return permitidos[String(f.personagemId)];
  });

  var imagens = imagensDasLinhas(ABAS.PERSONAGENS_FOTOS, linhas, 'imagem');
  var datas = lerCelulas(ABAS.PERSONAGENS_FOTOS, linhas, 'atualizadoEm');

  var saida = {};
  linhas.forEach(function (f) {
    saida[String(f.personagemId)] = {
      imagem: imagens[f._linha] || '',
      versao: String(datas[f._linha] || ''),
    };
  });

  return { ok: true, dados: saida };
}

function acaoLerAvatares(corpo, usuario) {
  var ids = Array.isArray(corpo.userIds) ? corpo.userIds : [];
  if (!ids.length || ids.length > MAX_IMAGENS_POR_PEDIDO) return { ok: false, erro: 'dados_invalidos' };

  var contas = contasDoSistema();
  var querido = {};
  ids.forEach(function (id) {
    var conta = contas[String(id)];
    if (conta && conta.ativo) querido[String(id)] = true;
  });

  var linhas = lerLeves(ABAS.PERFIS).filter(function (p) { return querido[String(p.userId)]; });

  var imagens = imagensDasLinhas(ABAS.PERFIS, linhas, 'avatar');
  var datas = lerCelulas(ABAS.PERFIS, linhas, 'atualizadoEm');

  var saida = {};
  linhas.forEach(function (p) {
    saida[String(p.userId)] = {
      imagem: imagens[p._linha] || '',
      versao: String(datas[p._linha] || ''),
    };
  });

  return { ok: true, dados: saida };
}

/* A versão do avatar de um punhado de contas, sem a imagem. */
function versoesDeAvatar(ids) {
  var querido = {};
  (ids || []).forEach(function (id) { querido[String(id)] = true; });

  var linhas = lerLeves(ABAS.PERFIS).filter(function (p) { return querido[String(p.userId)]; });
  if (!linhas.length) return {};

  var datas = lerCelulas(ABAS.PERFIS, linhas, 'atualizadoEm');

  var saida = {};
  linhas.forEach(function (p) {
    var v = String(datas[p._linha] || '');
    if (v) saida[String(p.userId)] = v;
  });
  return saida;
}

/* =====================================================================
   PERSONAGENS
   ===================================================================== */

function acaoListarPersonagens(corpo, usuario) {
  /* A lista pessoal continua sendo só do dono: o mestre chega às
     fichas dos jogadores pela tela da campanha, não misturadas às
     dele. O que mudou é a resolução do NOME da campanha, que agora
     alcança as campanhas de que o usuário participa. */
  var campanhas = {};
  var alcance = campanhasDoUsuario(usuario);
  Object.keys(alcance).forEach(function (id) { campanhas[id] = alcance[id].campanha.nome; });

  /* As fotos são o campo mais pesado da planilha inteira, e nenhuma
     delas atravessa esta listagem (v2.16): sai daqui a VERSÃO de cada
     uma — a data da última gravação —, e o navegador pede em lote as
     que ainda não tem, ver ler_fotos. Antes, abrir "Meus personagens"
     baixava as imagens de todas as fichas da conta a cada visita, e a
     faixa de leitura ainda arrastava as fotos das fichas vizinhas na
     planilha. */
  var minhasFotos = lerLeves(ABAS.PERSONAGENS_FOTOS).filter(function (f) {
    return String(f.ownerId) === String(usuario.id);
  });

  var datas = lerCelulas(ABAS.PERSONAGENS_FOTOS, minhasFotos, 'atualizadoEm');

  var fotos = {};
  minhasFotos.forEach(function (f) { fotos[f.personagemId] = String(datas[f._linha] || ''); });

  /* A listagem devolve o cabeçalho de cada ficha, nunca o fichaJson.
     Trinta fichas completas para desenhar trinta nomes seriam
     megabytes por tela — e agora nem chegam a ser lidas da planilha. */
  var meus = lerLeves(ABAS.PERSONAGENS).filter(function (p) { return meu(p, usuario); });

  /* Sistema e pasta (v2.26) vêm do índice de organização, que é leve.
     Ficha sem linha no índice — anterior à v2.26 — tem o sistema lido da
     ficha uma vez e anotado; ver organizacaoDaListagem. */
  var org = organizacaoDaListagem(usuario, meus);

  var lista = meus
    .map(function (p) {
      var ind = org.indice[String(p.id)];
      return {
        id: p.id,
        nome: p.nome,
        campanhaId: p.campanhaId || null,
        campanha: campanhas[p.campanhaId] || '',
        classe: p.classe || '',
        origem: p.origem || '',
        criadoEm: p.criadoEm,
        atualizadoEm: p.atualizadoEm,
        rev: Number(p.rev) || 0,
        fotoVersao: fotos[p.id] || '',
        sistema: ind ? ind.sistema : null,
        pastaId: (ind && ind.pastaId && org.pastasValidas[ind.pastaId]) ? ind.pastaId : null,
      };
    })
    .sort(function (a, b) { return String(b.atualizadoEm).localeCompare(String(a.atualizadoEm)); });

  /* `dados` continua sendo a lista: um site antigo lê o que sempre leu e
     ignora o resto. */
  return {
    ok: true,
    dados: lista,
    organizacao: { disponivel: org.disponivel, pastas: org.pastas },
  };
}

/* =====================================================================
   ORGANIZAÇÃO PESSOAL — PASTAS E SISTEMA (v2.26)
   ---------------------------------------------------------------------
   Duas abas leves: PASTAS (as pastas de cada conta) e
   PERSONAGENS_ORGANIZACAO (o índice: sistema e pasta de cada ficha).

   Tudo é do DONO. Cada ação confere, contra a sessão, que a pasta e o
   personagem são da conta — um id de outra conta responde como se não
   existisse. O mestre que edita a ficha de um jogador não alcança as
   pastas dele.

   Nada aqui toca na ficha: mover não sobe a revisão, não muda a
   campanha nem a data. E salvar a ficha não toca aqui (a não ser para
   CRIAR a linha que falta, sem pasta) — uma gravação atrasada nunca
   devolve uma pasta antiga.
   ===================================================================== */

var LIMITE_PASTAS = 100;
var LIMITE_NOME_PASTA = 60;
var LIMITE_SISTEMAS_LIDOS = 25;

/* O sistema de uma ficha, como ela diz. Ficha antiga, sem tipoFicha,
   fica vazia — o site a trata pelo modelo universal, a compatibilidade
   de sempre. Um valor que nenhuma versão conhece fica como veio (só
   aparado): não some da lista nem é trocado por outro. */
function sistemaDaFicha(ficha) {
  var t = ficha && ficha.tipoFicha;
  if (t === undefined || t === null) return '';
  return String(t).trim().toLowerCase().slice(0, 40);
}

function organizacaoPronta() {
  try {
    aba(ABAS.PASTAS);
    aba(ABAS.PERSONAGENS_ORGANIZACAO);
    return true;
  } catch (erro) {
    return false;
  }
}

function pastasDaConta(usuario) {
  return lerLeves(ABAS.PASTAS).filter(function (p) { return meu(p, usuario); });
}

function indiceDaConta(usuario) {
  return lerLeves(ABAS.PERSONAGENS_ORGANIZACAO).filter(function (l) { return meu(l, usuario); });
}

function pastaPublica(p) {
  return { id: String(p.id), nome: String(p.nome || ''), criadoEm: p.criadoEm || '' };
}

/* O que a listagem precisa, sem abrir ficha — salvo as que ainda não
   têm linha no índice. Essas têm o sistema lido UMA vez (até
   LIMITE_SISTEMAS_LIDOS por listagem) e anotado no índice, na trava, se
   ela estiver livre; ocupada, fica para a próxima. indexarPersonagens()
   faz isso de uma vez, pelo editor. */
function organizacaoDaListagem(usuario, meus) {
  var saida = { disponivel: false, pastas: [], pastasValidas: {}, indice: {} };
  if (!organizacaoPronta()) return saida;
  saida.disponivel = true;

  pastasDaConta(usuario)
    .sort(function (a, b) { return String(a.nome).localeCompare(String(b.nome), 'pt-BR', { sensitivity: 'base' }); })
    .forEach(function (p) {
      saida.pastas.push(pastaPublica(p));
      saida.pastasValidas[String(p.id)] = true;
    });

  indiceDaConta(usuario).forEach(function (l) {
    saida.indice[String(l.personagemId)] = { sistema: String(l.sistema || ''), pastaId: String(l.pastaId || '') };
  });

  var faltando = meus.filter(function (p) { return !saida.indice[String(p.id)]; });
  if (!faltando.length) return saida;

  var lidas = lerFichasDosPersonagens(faltando.slice(0, LIMITE_SISTEMAS_LIDOS));
  var novos = [];
  faltando.slice(0, LIMITE_SISTEMAS_LIDOS).forEach(function (p) {
    var r = lidas[p.id];
    if (!r || !r.ok) return;
    var sistema = sistemaDaFicha(r.ficha);
    saida.indice[String(p.id)] = { sistema: sistema, pastaId: '' };
    novos.push({ personagemId: p.id, ownerId: p.ownerId, sistema: sistema });
  });

  if (novos.length) {
    try {
      comTrava(function () {
        var ja = {};
        lerLeves(ABAS.PERSONAGENS_ORGANIZACAO).forEach(function (l) { ja[String(l.personagemId)] = true; });
        var agora = new Date().toISOString();
        var linhas = novos.filter(function (n) { return !ja[String(n.personagemId)]; }).map(function (n) {
          return { personagemId: n.personagemId, ownerId: n.ownerId, sistema: n.sistema, pastaId: '', atualizadoEm: agora };
        });
        if (linhas.length) inserirLinhas(ABAS.PERSONAGENS_ORGANIZACAO, linhas);
        return { ok: true };
      });
    } catch (erro) {
      console.warn('R.A.M.A.: índice de organização não anotado agora: ' + erro);
    }
  }
  return saida;
}

/* O índice nunca derruba a gravação da ficha: se ele falhar, a linha é
   criada depois, pela listagem. */
function indiceSemFalhar(registro, ficha, pastaId) {
  try {
    garantirIndice(registro, ficha, pastaId);
  } catch (erro) {
    console.warn('R.A.M.A.: índice de organização não gravado para ' + registro.id + ': ' + erro);
  }
}

/* A linha do índice de um personagem, criada se faltar — sem pasta. Só
   CRIA: uma linha que já existe não é tocada, então salvar a ficha nunca
   desfaz uma mudança de pasta. Chamada DENTRO da trava. Sem as abas
   (setupRama ainda não rodou), não faz nada. */
function garantirIndice(registro, ficha, pastaId) {
  if (!organizacaoPronta()) return;
  var existente = linhaLeve(ABAS.PERSONAGENS_ORGANIZACAO, 'personagemId', registro.id);
  if (existente) return;
  inserir(ABAS.PERSONAGENS_ORGANIZACAO, {
    personagemId: registro.id,
    ownerId: registro.ownerId,
    sistema: sistemaDaFicha(ficha),
    pastaId: pastaId || '',
    atualizadoEm: new Date().toISOString(),
  });
}

/* Nome de pasta: texto, aparado, espaços juntados, sem caractere de
   controle, de 1 a LIMITE_NOME_PASTA. Devolve null quando não serve. */
function nomeDePasta(valor) {
  if (typeof valor !== 'string') return null;
  var s = valor.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!s || s.length > LIMITE_NOME_PASTA) return null;
  return s;
}

function idValido(valor) {
  return typeof valor === 'string' && /^[A-Za-z0-9_-]{8,80}$/.test(valor);
}

function nomeRepetido(pastas, nome, excetoId) {
  var alvo = nome.toLocaleLowerCase('pt-BR');
  return pastas.some(function (p) {
    return String(p.id) !== String(excetoId || '') && String(p.nome || '').toLocaleLowerCase('pt-BR') === alvo;
  });
}

function acaoCriarPasta(corpo, usuario) {
  var nome = nomeDePasta(corpo.nome);
  if (!nome) return { ok: false, erro: 'dados_invalidos' };
  var operacao = idDeOperacao(corpo.operacaoId);
  if (!organizacaoPronta()) return { ok: false, erro: 'instalacao_incompleta' };

  return comTrava(function () {
    var minhas = pastasDaConta(usuario);

    /* A mesma criação chegando de novo — a resposta se perdeu no
       caminho. Devolve a pasta que ela criou, sem criar outra. */
    if (operacao) {
      for (var i = 0; i < minhas.length; i++) {
        if (String(minhas[i].operacao || '') === operacao) return { ok: true, dados: pastaPublica(minhas[i]), repetida: true };
      }
    }

    if (minhas.length >= LIMITE_PASTAS) return { ok: false, erro: 'limite_pastas' };
    if (nomeRepetido(minhas, nome)) return { ok: false, erro: 'pasta_repetida' };

    var agora = new Date().toISOString();
    var pasta = { id: novoId(), ownerId: usuario.id, nome: nome, operacao: operacao, criadoEm: agora, atualizadoEm: agora };
    inserir(ABAS.PASTAS, pasta);
    return { ok: true, dados: pastaPublica(pasta) };
  });
}

/* A pasta, se for desta conta. De outra conta ou inexistente: null —
   a resposta não diz qual dos dois. */
function minhaPasta(pastaId, usuario) {
  if (!idValido(pastaId)) return null;
  var p = acharPor(ABAS.PASTAS, 'id', pastaId);
  return meu(p, usuario) ? p : null;
}

function acaoRenomearPasta(corpo, usuario) {
  var nome = nomeDePasta(corpo.nome);
  if (!nome || !idValido(corpo.pastaId)) return { ok: false, erro: 'dados_invalidos' };
  if (!organizacaoPronta()) return { ok: false, erro: 'instalacao_incompleta' };

  return comTrava(function () {
    var pasta = minhaPasta(corpo.pastaId, usuario);
    if (!pasta) return { ok: false, erro: 'nao_encontrado' };
    if (nomeRepetido(pastasDaConta(usuario), nome, pasta.id)) return { ok: false, erro: 'pasta_repetida' };

    pasta.nome = nome;
    pasta.atualizadoEm = new Date().toISOString();
    atualizarLinha(ABAS.PASTAS, pasta._linha, pasta);
    return { ok: true, dados: pastaPublica(pasta) };
  });
}

/* Excluir a pasta não exclui personagem nenhum: os dela voltam para
   "Sem pasta", e só então a pasta sai. */
function acaoExcluirPasta(corpo, usuario) {
  if (!idValido(corpo.pastaId)) return { ok: false, erro: 'dados_invalidos' };
  if (!organizacaoPronta()) return { ok: false, erro: 'instalacao_incompleta' };

  return comTrava(function () {
    var pasta = minhaPasta(corpo.pastaId, usuario);
    if (!pasta) return { ok: false, erro: 'nao_encontrado' };

    var agora = new Date().toISOString();
    var liberados = 0;
    indiceDaConta(usuario).forEach(function (l) {
      if (String(l.pastaId) !== String(pasta.id)) return;
      l.pastaId = '';
      l.atualizadoEm = agora;
      atualizarLinha(ABAS.PERSONAGENS_ORGANIZACAO, l._linha, l);
      liberados++;
    });

    apagarLinha(ABAS.PASTAS, pasta._linha);
    return { ok: true, dados: { pastaId: String(pasta.id), liberados: liberados } };
  });
}

/* Põe o personagem numa pasta (ou em nenhuma, com pastaId vazio). Só
   aquele registro muda, e só no índice. */
function acaoMoverPersonagem(corpo, usuario) {
  var destino = corpo.pastaId === null || corpo.pastaId === undefined || corpo.pastaId === '' ? '' : corpo.pastaId;
  if (destino !== '' && !idValido(destino)) return { ok: false, erro: 'dados_invalidos' };
  if (!idValido(corpo.personagemId)) return { ok: false, erro: 'dados_invalidos' };
  if (!organizacaoPronta()) return { ok: false, erro: 'instalacao_incompleta' };

  return comTrava(function () {
    var registro = linhaLeve(ABAS.PERSONAGENS, 'id', corpo.personagemId);
    if (!meu(registro, usuario)) return { ok: false, erro: 'nao_encontrado' };

    if (destino && !minhaPasta(destino, usuario)) return { ok: false, erro: 'pasta_nao_encontrada' };

    var agora = new Date().toISOString();
    var linha = linhaLeve(ABAS.PERSONAGENS_ORGANIZACAO, 'personagemId', registro.id);
    if (linha) {
      if (String(linha.pastaId || '') !== destino) {
        linha.pastaId = destino;
        linha.atualizadoEm = agora;
        atualizarLinha(ABAS.PERSONAGENS_ORGANIZACAO, linha._linha, linha);
      }
    } else {
      /* Ficha anterior ao índice: o sistema é lido dela agora, uma vez. */
      var lido = lerFichaDoPersonagem(registro);
      inserir(ABAS.PERSONAGENS_ORGANIZACAO, {
        personagemId: registro.id,
        ownerId: registro.ownerId,
        sistema: lido.ok ? sistemaDaFicha(lido.ficha) : '',
        pastaId: destino,
        atualizadoEm: agora,
      });
    }
    return { ok: true, dados: { personagemId: String(registro.id), pastaId: destino || null } };
  });
}

/* =====================================================================
   O CONTEÚDO DA FICHA
   ---------------------------------------------------------------------
   Toda leitura e toda gravação do conteúdo de um personagem passam por
   aqui (v2.15). Nenhuma ação toca em `fichaJson`, `armazenamento` ou na
   aba de blocos: elas recebem a ficha como objeto, igual antes, e não
   sabem se ela estava numa célula ou em trinta.

     lerFichaDoPersonagem(registro)       uma ficha, conferida
     lerFichasDosPersonagens(registros)   várias, com uma varredura só
     publicarFicha(registro, ficha, o)    grava, confere e troca
     apagarBlocosDoPersonagem(id)         na exclusão

   DOIS FORMATOS, UM MARCADOR
   ---------------------------------------------------------------------
     armazenamento vazio        formato antigo: a ficha inteira está em
                                fichaJson. É lida como sempre foi, e vira
                                blocos na próxima gravação que der certo
                                — nenhuma migração em massa.
     armazenamento preenchido   o manifesto (ver Dados.gs). A ficha está
                                nos blocos da geração que ele aponta, e
                                fichaJson guarda só o aviso de formato
                                novo.

   A gravação que publica o manifesto troca o fichaJson pelo aviso na
   MESMA linha, de uma vez: uma ficha nunca fica com metade num formato
   e metade no outro.

   LER NUNCA DEVOLVE FICHA VAZIA
   ---------------------------------------------------------------------
   Até a v2.14, JSON corrompido virava ficha em branco — e uma ficha em
   branco na tela é uma ficha que alguém edita e salva por cima da
   original. Agora qualquer falha (bloco ausente, bloco trocado, texto
   que não confere, JSON inválido) volta como `ficha_ilegivel`, com o
   motivo, e nada é gravado.
   ===================================================================== */

/* O que fica em fichaJson de uma ficha em blocos.

   Uma versão ANTIGA do servidor — alguém voltou a implantação — lê esta
   célula como se fosse a ficha inteira. Vazia, ela apareceria como uma
   ficha em branco, e editá-la gravaria por cima. Com isto aparece um
   aviso: o nome diz o que houve, e o schemaVersion altíssimo faz a ficha
   de qualquer site desde a v2.x se recusar a abrir para edição. Mesmo
   que alguém grave assim mesmo por um servidor antigo, só ESTA célula
   muda — o manifesto e os blocos ficam onde estão, e voltam a valer
   quando o servidor atual for implantado de novo. */
var SCHEMA_DO_AVISO = 999999;

function avisoDeFormatoNovo(nome) {
  return JSON.stringify({
    _armazenamento: FORMATO_BLOCOS,
    schemaVersion: SCHEMA_DO_AVISO,
    nome: '⚠ ' + String(nome || 'Ficha').slice(0, 80) + ' — atualize o servidor',
    aviso: 'Esta ficha foi salva em blocos pelo R.A.M.A. v2.15 ou mais novo, e este servidor ' +
      'é mais antigo: ele não sabe montá-la. Nada foi perdido. Implante de novo a versão ' +
      'atual do Apps Script para voltar a abri-la.',
  });
}

function ehAvisoDeFormatoNovo(objeto) {
  return !!objeto && typeof objeto === 'object' && objeto._armazenamento === FORMATO_BLOCOS;
}

/* ---------------------------------------------------------------------
   IDEMPOTÊNCIA
   ---------------------------------------------------------------------
   O navegador manda um id por gravação (`operacaoId`) e o repete, com
   a MESMA ficha e a MESMA revisão, quando a resposta não chega. O
   manifesto guarda o id da última gravação que subiu a revisão, e a
   revisão que ela produziu. Se os dois batem, a gravação que chegou de
   novo já foi aplicada: responde que deu certo, sem aplicar outra vez.

   Qualquer coisa que suba a revisão depois (outro aparelho, o mestre, o
   vínculo de campanha) troca o id — e aí a repetição volta a ser um
   conflito de verdade, como deve ser. */
function idDeOperacao(valor) {
  var s = String(valor === undefined || valor === null ? '' : valor);
  return /^[A-Za-z0-9_-]{8,80}$/.test(s) ? s : '';
}

function operacaoJaAplicada(registro, operacao) {
  if (!operacao) return false;
  var m = manifestoDe(registro.armazenamento);
  return !!(m && !m.invalido && String(m.operacao || '') === operacao &&
    Number(m.rev) === (Number(registro.rev) || 0));
}

/* O personagem que uma CRIAÇÃO com este id já criou — a mesma criação
   repetida porque a resposta se perdeu (uma importação grande que
   estourou o prazo do navegador, por exemplo). Primeiro o cache, porque
   a repetição costuma vir em segundos; sem ele, os manifestos dos
   personagens da própria conta. */
var SEGUNDOS_CACHE_OPERACAO = 600;

function chaveDaOperacao(usuario, operacao) { return 'rama.op.' + usuario.id + '.' + operacao; }

function lembrarOperacao(usuario, operacao, id) {
  if (operacao) cacheGravar(chaveDaOperacao(usuario, operacao), String(id), SEGUNDOS_CACHE_OPERACAO);
}

function personagemDaOperacao(usuario, operacao) {
  if (!operacao) return null;

  var meus = lerLeves(ABAS.PERSONAGENS).filter(function (p) { return meu(p, usuario); });
  if (!meus.length) return null;

  var lembrado = cacheLer(chaveDaOperacao(usuario, operacao));
  if (lembrado) {
    for (var i = 0; i < meus.length; i++) if (String(meus[i].id) === String(lembrado)) return meus[i];
  }

  var manifestos = lerCelulas(ABAS.PERSONAGENS, meus, 'armazenamento');
  for (var j = 0; j < meus.length; j++) {
    var m = manifestoDe(manifestos[meus[j]._linha]);
    if (m && !m.invalido && String(m.operacao || '') === operacao) return meus[j];
  }
  return null;
}

/* ---------------------------------------------------------------------
   LER
   --------------------------------------------------------------------- */

function falhaDeLeitura(motivo) {
  return { ok: false, erro: 'ficha_ilegivel', motivo: String(motivo || 'desconhecido') };
}

/* O texto já provado inteiro vira objeto — só aqui, e só depois. */
function interpretarFicha(texto, formato, manifesto) {
  if (!texto) return falhaDeLeitura('vazia');

  /* Uma ficha remontada é o item mais caro de uma listagem, e é o
     número que o painel da mesa existe para manter em zero. */
  anotar('fichas');

  var ficha;
  try { ficha = JSON.parse(texto); } catch (erro) { return falhaDeLeitura('json'); }
  if (!ficha || typeof ficha !== 'object' || Array.isArray(ficha)) return falhaDeLeitura('json');

  /* O aviso de formato novo SEM manifesto ao lado: alguém esvaziou a
     coluna armazenamento. A ficha está nos blocos, e tratar o aviso como
     ficha seria abrir uma ficha vazia. */
  if (ehAvisoDeFormatoNovo(ficha)) return falhaDeLeitura('manifesto_ausente');

  return { ok: true, ficha: ficha, formato: formato, manifesto: manifesto || null, tamanho: texto.length };
}

/* Lê o conteúdo de UM registro, no formato em que ele estiver, uma vez. */
function conteudoDoRegistro(registro) {
  var m = manifestoDe(registro.armazenamento);

  if (m === null) {
    var bruto = registro.fichaJson;
    return interpretarFicha(bruto === undefined || bruto === null ? '' : String(bruto), 'antigo');
  }
  if (m.invalido) return falhaDeLeitura(m.motivo);

  var id = String(registro.id);
  var lido = lerGeracoes(ABAS.PERSONAGENS_BLOCOS, [{ id: id, manifesto: m }])[id];
  if (!lido || !lido.ok) return falhaDeLeitura((lido && lido.motivo) || 'bloco_ausente');
  return interpretarFicha(lido.texto, 'blocos', m);
}

/* Uma ficha, conferida. Devolve { ok, ficha, registro } — o REGISTRO de
   onde ela saiu, que pode ser mais novo do que o recebido, e cuja `rev`
   é a que acompanha esta ficha.

   Por que tentar de novo: a leitura corre FORA da trava. Entre ler a
   linha do personagem e ler os blocos, uma gravação pode publicar outra
   geração e a limpeza pode apagar ou deslocar as linhas antigas. Isso
   aparece como bloco ausente ou fora do lugar — e a saída é ler a linha
   de novo, porque o manifesto novo aponta blocos que existem. Uma falha
   que continua com o MESMO manifesto é defeito de verdade, e volta como
   erro. Formato antigo não repete: a célula é uma só. */
var TENTATIVAS_DE_LEITURA = 3;

function lerFichaDoPersonagem(registro) {
  var atual = registro;
  var r = conteudoDoRegistro(atual);

  for (var t = 1; t < TENTATIVAS_DE_LEITURA && !r.ok; t++) {
    var m = manifestoDe(atual.armazenamento);
    if (!m || m.invalido) break;

    invalidar(ABAS.PERSONAGENS);
    invalidar(ABAS.PERSONAGENS_BLOCOS);
    var novo = acharPor(ABAS.PERSONAGENS, 'id', registro.id);

    /* Dono e campanha decidiram o acesso. Se mudaram no meio, a decisão
       não vale mais para esta leitura. */
    if (!novo || String(novo.ownerId) !== String(registro.ownerId) ||
        String(novo.campanhaId || '') !== String(registro.campanhaId || '')) {
      return { ok: false, erro: 'nao_encontrado' };
    }

    atual = novo;
    r = conteudoDoRegistro(atual);
  }

  if (!r.ok) {
    console.warn('R.A.M.A.: a ficha ' + registro.id + ' não se montou (' + r.motivo + ')');
    return r;
  }
  r.registro = atual;
  return r;
}

/* Várias fichas — as da mesa, as do combate — com UMA varredura dos
   blocos e só o conteúdo delas. `registros` pode ser leve (de lerLeves):
   o manifesto é lido aqui, e o fichaJson só das fichas que ainda estão
   no formato antigo. Devolve { id: resultado }, cada um como
   lerFichaDoPersonagem devolveria. Uma ficha ilegível não derruba as
   outras. */
function lerFichasDosPersonagens(registros) {
  var saida = {};
  if (!registros || !registros.length) return saida;

  var manifestos = lerCelulas(ABAS.PERSONAGENS, registros, 'armazenamento');
  var antigos = registros.filter(function (p) { return manifestoDe(manifestos[p._linha]) === null; });
  var jsons = lerCelulas(ABAS.PERSONAGENS, antigos, 'fichaJson');

  var pedidos = [];
  registros.forEach(function (p) {
    var m = manifestoDe(manifestos[p._linha]);
    if (m === null) {
      var bruto = jsons[p._linha];
      saida[p.id] = interpretarFicha(bruto === undefined || bruto === null ? '' : String(bruto), 'antigo');
      if (!saida[p.id].ok) console.warn('R.A.M.A.: a ficha ' + p.id + ' não se montou (' + saida[p.id].motivo + ')');
      return;
    }
    if (m.invalido) { saida[p.id] = falhaDeLeitura(m.motivo); return; }
    pedidos.push({ id: String(p.id), manifesto: m });
  });

  var lidos = lerGeracoes(ABAS.PERSONAGENS_BLOCOS, pedidos);

  pedidos.forEach(function (pd) {
    var lido = lidos[pd.id];
    if (lido && lido.ok) {
      saida[pd.id] = interpretarFicha(lido.texto, 'blocos', pd.manifesto);
      return;
    }
    /* Pode ter sido regravada no meio da leitura: de novo, sozinha. */
    var completo = acharPor(ABAS.PERSONAGENS, 'id', pd.id);
    saida[pd.id] = completo ? lerFichaDoPersonagem(completo) : { ok: false, erro: 'nao_encontrado' };
  });

  return saida;
}

/* ---------------------------------------------------------------------
   GRAVAR
   ---------------------------------------------------------------------
   Grava a ficha em blocos e troca o manifesto do personagem.

   `registro` chega com as colunas já decididas por quem chamou (nome,
   campanha, revisão…). Aqui ele ganha o manifesto novo e o aviso de
   formato, e vai para a planilha numa gravação de UMA linha — é ela que
   torna a versão nova a que vale.

   opcoes
     inserir    o registro é novo (criar, duplicar): a linha é acrescentada
     operacao   o id desta gravação, para reconhecer uma repetição.
                Ausente, fica o do manifesto anterior: é o caso de uma
                gravação que NÃO sobe a revisão (o resumo de recursos)

   Onde pode parar, e o que sobra em cada ponto:
     1. blocos da geração nova       linhas que nenhum manifesto aponta;
                                     a ficha continua na versão anterior
     2. conferência desses blocos    idem, e a resposta é erro
     3. a linha do personagem        idem — é esta gravação que troca de
                                     versão, e ela entra inteira ou não
     4. limpeza das gerações velhas  sobra uma geração a mais, que a
                                     próxima gravação (ou limparBlocosOrfaos)
                                     recolhe
   --------------------------------------------------------------------- */
function publicarFicha(registro, ficha, opcoes) {
  var o = opcoes || {};
  var texto = semSubstitutoSolto(JSON.stringify(ficha));

  if (texto.length > LIMITE_TOTAL_FICHA) {
    return { ok: false, erro: 'ficha_grande_demais', tamanho: texto.length, limite: LIMITE_TOTAL_FICHA };
  }

  /* Sem a aba de blocos (setupRama desta versão não rodou), gravar é
     impossível — e dizer isso é melhor do que "falhou". Ler continua
     funcionando para as fichas no formato antigo. */
  try {
    aba(ABAS.PERSONAGENS_BLOCOS);
  } catch (erro) {
    return { ok: false, erro: 'instalacao_incompleta', detalhe: 'PERSONAGENS_BLOCOS' };
  }

  var anterior = manifestoDe(registro.armazenamento);

  /* Um manifesto que esta versão não entende não é sobrescrito: por cima
     dele, a próxima leitura perderia o que ele guardava. */
  if (anterior && anterior.invalido) return falhaDeLeitura(anterior.motivo);

  /* ONDE a geração nova vai (v2.16).

     Três faixas de linhas ficam vivas para cada ficha, e cada uma tem
     um papel:

       a que VALE           o manifesto aponta para ela. Ninguém a toca
                            enquanto ela valer — é ela que atende quem
                            está lendo neste instante
       a ANTERIOR           o ponto de volta de restaurarGeracaoAnterior()
                            e a resposta para uma leitura que começou
                            antes da última troca. Também intocável
       a REUTILIZÁVEL       duas gerações atrás: nenhum manifesto a
                            aponta, ninguém volta para ela. É sobre ela
                            que a gravação nova escreve

     Escrever sobre a reutilizável — e não sobre a anterior — é o que
     faz uma gravação que morre no meio não destruir o ponto de volta: o
     estrago cai sempre numa faixa que já não servia para nada.

     E é o que impede a aba de crescer: um personagem salvo cem vezes
     roda entre as mesmas três faixas, sem apagar linha nenhuma e sem
     deslocar o localizador de ninguém.

     Sem pista boa (primeiro salvamento depois desta atualização, aba
     compactada, gravação anterior que morreu em cima da reutilizável),
     a geração nova vai para o fim da aba e a limpeza é decidida pelo
     índice curto: tudo deste personagem menos a que vale e a anterior. */
  var pontoDeVolta = anterior ? anterior.anterior : null;
  var reutilizavel = anterior ? anterior.reutilizavel : null;
  var reaproveitar = null;
  var sobras = [];

  if (reutilizavel && reutilizavel.local &&
      String(reutilizavel.geracao) !== String(anterior.geracao) &&
      (!pontoDeVolta || String(reutilizavel.geracao) !== String(pontoDeVolta.geracao)) &&
      !faixasSeCruzam(reutilizavel.local, anterior.local) &&
      !faixasSeCruzam(reutilizavel.local, pontoDeVolta && pontoDeVolta.local)) {
    var faixa = null;
    try {
      faixa = conferirFaixaDaGeracao(ABAS.PERSONAGENS_BLOCOS, registro.id,
        reutilizavel.geracao, reutilizavel.local);
    } catch (erro) {
      faixa = null;
    }
    if (faixa) {
      reaproveitar = { linha: Number(reutilizavel.local.linha), blocos: Number(reutilizavel.local.blocos) };
    }
  }

  if (!reaproveitar) {
    var manter = {};
    if (anterior) manter[String(anterior.geracao)] = true;
    if (pontoDeVolta) manter[String(pontoDeVolta.geracao)] = true;
    try {
      sobras = linhasDeGeracoes(ABAS.PERSONAGENS_BLOCOS, registro.id, manter);
    } catch (erro) {
      sobras = [];
    }
  }

  var gravado;
  try {
    gravado = gravarGeracao(ABAS.PERSONAGENS_BLOCOS, registro.id, texto, reaproveitar);
  } catch (erro) {
    console.error('R.A.M.A.: blocos da ficha ' + registro.id + ' não gravados: ' + erro);
    return { ok: false, erro: 'armazenamento_falhou', etapa: 'blocos' };
  }

  var conferido;
  try {
    conferido = conferirGeracao(ABAS.PERSONAGENS_BLOCOS, registro.id, gravado, texto);
  } catch (erro) {
    conferido = { ok: false, motivo: 'leitura' };
  }
  if (!conferido.ok) {
    console.error('R.A.M.A.: blocos da ficha ' + registro.id + ' não conferem (' + conferido.motivo + ')');
    return { ok: false, erro: 'armazenamento_falhou', etapa: 'conferencia' };
  }

  /* O que sobrou da faixa reaproveitada: as linhas que a geração nova
     não ocupou (ela pode ter menos blocos do que a que saiu), ou a
     faixa inteira se ela não coube e a gravação foi para o fim. */
  if (reaproveitar) {
    var desde = gravado.reaproveitou ? gravado.blocos : 0;
    for (var s = desde; s < reaproveitar.blocos; s++) sobras.push(reaproveitar.linha + s);
  }

  var manifesto = {
    formato: FORMATO_BLOCOS,
    versao: VERSAO_BLOCOS,
    geracao: gravado.geracao,
    blocos: gravado.blocos,
    tamanho: gravado.tamanho,
    hash: gravado.hash,
    /* A pista: onde esta geração foi escrita. Ver "O localizador" em
       Dados.gs — é pista, não prova: toda leitura confere o conteúdo. */
    local: { linha: gravado.primeiraLinha, blocos: gravado.blocos },
    rev: Number(registro.rev) || 0,
    operacao: o.operacao !== undefined ? String(o.operacao || '') : (anterior ? String(anterior.operacao || '') : ''),
    gravadoEm: gravado.criadoEm,
    /* A geração que deixa de valer continua conferível: é o ponto de
       volta de restaurarGeracaoAnterior(). */
    anterior: anterior ? {
      geracao: anterior.geracao, blocos: anterior.blocos, tamanho: anterior.tamanho,
      hash: anterior.hash, rev: anterior.rev, gravadoEm: anterior.gravadoEm || '',
      local: anterior.local || null,
    } : null,
    /* A faixa que a PRÓXIMA gravação pode tomar: a que acabou de deixar
       de ser o ponto de volta. Nada aponta para ela. */
    reutilizavel: pontoDeVolta ? { geracao: pontoDeVolta.geracao, local: pontoDeVolta.local || null } : null,
  };

  registro.armazenamento = JSON.stringify(manifesto);
  registro.fichaJson = avisoDeFormatoNovo(registro.nome);

  /* A projeção do painel entra na MESMA gravação de uma linha que
     publica o manifesto — ver "A projeção do personagem", em
     Campanhas.gs. Conteúdo, manifesto e projeção nunca ficam de
     versões diferentes, porque são a mesma escrita. Sem Campanhas.gs
     instalado, a coluna fica vazia e o painel remonta a ficha. */
  registro.resumo = (typeof textoDaProjecao === 'function')
    ? textoDaProjecao(ficha, manifesto.geracao, manifesto.rev)
    : '';

  try {
    if (o.inserir) inserir(ABAS.PERSONAGENS, registro);
    else atualizarLinha(ABAS.PERSONAGENS, registro._linha, registro);
  } catch (erro) {
    console.error('R.A.M.A.: a ficha ' + registro.id + ' não foi publicada: ' + erro);
    return { ok: false, erro: 'armazenamento_falhou', etapa: 'publicacao' };
  }

  /* Ficam a geração nova, a que acabou de sair de cena (o ponto de
     volta) e a reutilizável, que é a faixa da próxima gravação. O resto
     sai.

     As linhas ficam EM BRANCO em vez de serem apagadas: apagar puxaria
     para cima todas as linhas de baixo e envelheceria o localizador de
     todas as outras fichas. Em branco elas não deslocam ninguém e são o
     lugar onde a próxima gravação desta ficha vai escrever. Falhar aqui
     não desfaz nada. */
  try {
    limparBlocos(ABAS.PERSONAGENS_BLOCOS, sobras);
  } catch (erro) {
    console.warn('R.A.M.A.: limpeza dos blocos de ' + registro.id + ' adiada: ' + erro);
  }

  return { ok: true, manifesto: manifesto };
}

/* Na exclusão do personagem: todas as gerações dele, e só dele. Uma
   falha aqui deixa blocos sem dono, que limparBlocosOrfaos() recolhe. */
function apagarBlocosDoPersonagem(personagemId) {
  try {
    return apagarGeracoes(ABAS.PERSONAGENS_BLOCOS, personagemId, {});
  } catch (erro) {
    console.warn('R.A.M.A.: blocos de ' + personagemId + ' ficaram para a limpeza: ' + erro);
    return 0;
  }
}

/* A ficha que sai para o navegador e para as gravações parciais: o
   vínculo de campanha vem da COLUNA, que é o que decide permissão. Tirar
   um jogador da mesa limpa só a coluna (salvar_participantes,
   excluir_campanha), e o vínculo trocado sem regravar a ficha também —
   a ficha não pode abrir dizendo uma campanha que a coluna já não diz. */
function comVinculoDaColuna(ficha, registro) {
  ficha.campanhaId = registro.campanhaId || null;
  return ficha;
}

function acaoLerPersonagem(corpo, usuario) {
  var acesso = personagemAcessivel(corpo.personagemId, usuario);
  if (!acesso.ok) return acesso;

  /* Falhou em montar: erro, com o motivo — nunca uma ficha vazia. */
  var lido = lerFichaDoPersonagem(acesso.personagem);
  if (!lido.ok) return lido;

  return {
    ok: true,
    /* A revisão da linha de onde a ficha saiu — a mesma leitura. */
    rev: Number(lido.registro.rev) || 0,
    /* Quem abriu precisa saber se está como dono ou como mestre: a
       tela mostra um aviso e esconde o que é do dono. A decisão de
       permissão já foi tomada aqui; isto é só o rótulo. */
    dono: acesso.dono,
    mestre: acesso.mestre,
    dados: comVinculoDaColuna(lido.ficha, lido.registro),
  };
}

/* =====================================================================
   RESUMO DE RECURSOS E MESAS AVISADAS
   ---------------------------------------------------------------------
   `resumoRecursos` é o máximo de PV, PE e Sanidade de uma ficha de Ordem,
   calculado pelo navegador de quem pode editar a ficha — ver o bloco
   "Resumo de recursos" em Campanhas.gs. Aqui ele só é validado: números
   inteiros num intervalo sensato, Sanidade podendo ser nula ("Jogando sem
   Sanidade"). Qualquer outra forma é descartada.
   ===================================================================== */

var LIMITE_RESUMO_RECURSO = 99999;

function normalizarResumoRecursos(bruto) {
  if (!bruto || typeof bruto !== 'object') return null;

  function numero(v, aceitaNulo) {
    if (v === null || v === undefined) return aceitaNulo ? null : undefined;
    if (typeof v !== 'number' || !isFinite(v)) return undefined;
    var n = Math.round(v);
    if (n < -999 || n > LIMITE_RESUMO_RECURSO) return undefined;
    return n;
  }

  /* `pd` (v2.19): pontos de determinação, com "Jogando sem Sanidade"
     (SAH p.104). Com ele, PE e SAN vêm nulos — os dois viraram PD. Sem
     ele, `pd` é nulo, e um resumo de uma versão anterior do site (que
     não manda `pd`) continua valendo. */
  var pv = numero(bruto.pv, false);
  var pd = numero(bruto.pd, true);
  var pe = numero(bruto.pe, pd !== null && pd !== undefined);
  var san = numero(bruto.san, true);
  if (pv === undefined || pe === undefined || san === undefined || pd === undefined) return null;

  return { versao: 1, pv: pv, pe: pe, san: san, pd: pd };
}

/* O resumo que vai gravado com a ficha. Ficha que não é de Ordem não tem
   resumo. Gravação que não trouxe resumo — de uma versão do site que não
   o calculava — mantém o que já estava, em vez de apagar o que a mesa
   estava vendo. */
function resumoParaGravar(ficha, fichaAnterior) {
  var ehOrdem = String(ficha.tipoFicha || '') === 'ordem' && !!ficha.ordem && typeof ficha.ordem === 'object';
  if (!ehOrdem) return null;
  return normalizarResumoRecursos(ficha.resumoRecursos) ||
    (fichaAnterior ? normalizarResumoRecursos(fichaAnterior.resumoRecursos) : null);
}

/* Quem estiver com a campanha aberta precisa saber que um personagem
   dela mudou. As marcas são de Campanhas.gs; sem ele instalado, não há
   mesa para avisar. */
function avisarMesas(campanhaIds, partes) {
  if (typeof marcarMesa !== 'function') return;
  var vistos = {};
  (campanhaIds || []).forEach(function (id) {
    var c = String(id || '');
    if (!c || vistos[c]) return;
    vistos[c] = true;
    marcarMesa(c, partes);
  });
}

/* Medida ANTES da trava: uma ficha acima do limite operacional é
   recusada sem fazer ninguém esperar na fila. A resposta leva o tamanho
   e o limite, para a tela explicar com números. */
function grandeDemais(ficha) {
  var tamanho = JSON.stringify(ficha).length;
  if (tamanho <= LIMITE_TOTAL_FICHA) return null;
  return { ok: false, erro: 'ficha_grande_demais', tamanho: tamanho, limite: LIMITE_TOTAL_FICHA };
}

function acaoCriarPersonagem(corpo, usuario) {
  var ficha = corpo.dados;
  if (!ficha || typeof ficha !== 'object' || Array.isArray(ficha)) return { ok: false, erro: 'dados_invalidos' };
  sanearAparencia(ficha);
  var operacao = idDeOperacao(corpo.operacaoId);

  var agora = new Date().toISOString();
  var id = novoId();

  /* O dono sai da sessão. Se o pedido trouxer ownerId, ele é
     descartado aqui — e é justamente por isso que trocar o campo no
     console não escreve no arquivo de outra pessoa. */
  ficha.ownerId = undefined;
  ficha.id = undefined;
  ficha.criadoEm = agora;
  ficha.atualizadoEm = agora;
  ficha.resumoRecursos = resumoParaGravar(ficha, null) || undefined;

  var recusa = grandeDemais(ficha);
  if (recusa) return recusa;

  return comTrava(function () {
    /* A mesma criação chegando de novo — a resposta da primeira se
       perdeu no caminho. Devolve o personagem que ela criou. */
    var repetido = personagemDaOperacao(usuario, operacao);
    if (repetido) return { ok: true, rev: Number(repetido.rev) || 1, dados: { id: repetido.id }, repetida: true };

    /* A campanha que o servidor aceitou é a que vai para dentro da
       ficha também — ver acaoSalvarPersonagem. */
    var campanhaId = campanhaValida(ficha.campanhaId, usuario);
    ficha.campanhaId = campanhaId || null;

    /* Importar ou copiar uma ficha não leva o desbloqueio junto: o tema
       de dados só fica se ESTA conta o tem (v2.40). */
    var avisoDosDados = conferirTemaDosDados(ficha, usuario.id);

    var registro = {
      id: id,
      ownerId: usuario.id,
      nome: String(ficha.nome || 'Sem nome').slice(0, 120),
      campanhaId: campanhaId,
      classe: String(ficha.classe || '').slice(0, 80),
      origem: String(ficha.origem || '').slice(0, 80),
      criadoEm: agora,
      atualizadoEm: agora,
      rev: 1,
    };

    var publicado = publicarFicha(registro, ficha, { inserir: true, operacao: operacao });
    if (!publicado.ok) return publicado;

    lembrarOperacao(usuario, operacao, id);
    indiceSemFalhar(registro, ficha, '');
    avisarMesas([campanhaId], ['personagens']);
    var criado = { ok: true, rev: 1, dados: { id: id } };
    if (avisoDosDados) criado.avisos = [avisoDosDados];
    return criado;
  });
}

/* =====================================================================
   REVISÃO
   ---------------------------------------------------------------------
   O cliente manda a revisão que ele leu. Se a do servidor ainda for
   essa, a gravação passa e a revisão sobe. Se já tiver mudado, o
   servidor RECUSA e devolve o estado atual junto — quem chamou concilia
   as duas versões em vez de perder o que digitou.

   Sobrescrever em silêncio seria mais simples de programar e apagaria
   o trabalho de alguém sem ninguém perceber.
   ===================================================================== */

function acaoSalvarPersonagem(corpo, usuario) {
  var ficha = corpo.dados;
  if (!ficha || typeof ficha !== 'object' || Array.isArray(ficha)) return { ok: false, erro: 'dados_invalidos' };
  sanearAparencia(ficha);
  var operacao = idDeOperacao(corpo.operacaoId);

  var recusa = grandeDemais(ficha);
  if (recusa) return recusa;

  return comTrava(function () {
    var acesso = personagemAcessivel(corpo.personagemId, usuario);
    if (!acesso.ok) return acesso;
    var registro = acesso.personagem;

    var revAtual = Number(registro.rev) || 0;
    var revPedida = Number(corpo.rev);

    if (Number.isFinite(revPedida) && revPedida !== revAtual) {
      /* A MESMA gravação chegando de novo: o servidor terminou, a
         resposta se perdeu, e o navegador repetiu. Já está aplicada. */
      if (operacaoJaAplicada(registro, operacao)) return { ok: true, rev: revAtual, repetida: true };

      /* Conflito de verdade: vai junto o estado atual, para o navegador
         conciliar. Se nem o estado atual se monta, quem chamou precisa
         saber disso — e não receber um "conflito" com uma ficha vazia. */
      var atual = lerFichaDoPersonagem(registro);
      if (!atual.ok) return atual;
      return {
        ok: false,
        erro: 'conflito',
        rev: Number(atual.registro.rev) || revAtual,
        dados: comVinculoDaColuna(atual.ficha, atual.registro),
      };
    }

    var agora = new Date().toISOString();
    ficha.atualizadoEm = agora;

    /* A ficha anterior só é lida quando é preciso: uma gravação de uma
       versão do site que não mandava o resumo mantém o que já estava. */
    var resumo = resumoParaGravar(ficha, null);
    var ehOrdem = String(ficha.tipoFicha || '') === 'ordem' && !!ficha.ordem && typeof ficha.ordem === 'object';
    var anterior = null;
    if (!resumo && ehOrdem) {
      anterior = lerFichaDoPersonagem(registro);
      if (anterior.ok) resumo = resumoParaGravar(ficha, anterior.ficha);
    }
    /* v2.36: uma versão do site anterior aos temas não conhece o bloco
       `aparencia` e o mandaria embora a cada gravação. Sem o campo, fica
       o que estava; para voltar ao tema da conta, a versão nova manda
       { modo: "conta" } explicitamente. A ficha anterior só é lida para
       quem se identifica como versão antiga (schema 1 a 15). */
    var schemaPedido = Number(ficha.schemaVersion) || 0;
    /* O tema de dados (v2.40) só fica se a conta DONA da ficha o tem — e
       mexer em outro campo (o mestre, por exemplo) não tira uma escolha
       legítima, porque a conferência é com o dono, não com quem grava. */
    var avisoDosDados = conferirTemaDosDados(ficha, registro.ownerId);
    if (ficha.aparencia === undefined && schemaPedido > 0 && schemaPedido < 16) {
      if (!anterior) anterior = lerFichaDoPersonagem(registro);
      if (anterior.ok && anterior.ficha && anterior.ficha.aparencia) ficha.aparencia = normalizarAparenciaServidor(anterior.ficha.aparencia, sistemaDaFicha(ficha));
    } else if (ficha.aparencia && !ficha.aparencia.dados && schemaPedido > 0 && schemaPedido < 18) {
      /* Uma aba de versão anterior não conhece `aparencia.dados` e a
         mandaria embora: fica a escolha gravada. */
      if (!anterior) anterior = lerFichaDoPersonagem(registro);
      var dadosGravados = anterior.ok && anterior.ficha && anterior.ficha.aparencia ? RAMATemasDados.normalizarSelecao(anterior.ficha.aparencia.dados) : null;
      if (dadosGravados) ficha.aparencia.dados = dadosGravados;
    }
    ficha.resumoRecursos = resumo || undefined;
    var campanhaAnterior = registro.campanhaId;

    registro.nome = String(ficha.nome || 'Sem nome').slice(0, 120);
    /* Para onde o personagem vai é decisão do DONO. O mestre que edita
       a ficha de um jogador salva números e textos, mas a campanha fica
       onde estava: sem isto, bastava trocar o campo para levar a ficha a
       outra mesa dele — uma em que o jogador nem está.

       E a campanha que ficou valendo é a que vai para dentro do
       fichaJson: coluna e ficha precisam dizer a mesma coisa, senão a
       ficha abre numa campanha e a listagem mostra outra. */
    if (acesso.dono) registro.campanhaId = campanhaValida(ficha.campanhaId, usuario);
    ficha.campanhaId = registro.campanhaId || null;
    registro.classe = String(ficha.classe || '').slice(0, 80);
    registro.origem = String(ficha.origem || '').slice(0, 80);
    registro.atualizadoEm = agora;
    registro.rev = revAtual + 1;

    /* Conteúdo, revisão, espelhos e manifesto entram juntos, numa
       gravação de uma linha: não existe instante em que a revisão nova
       aponte para o conteúdo velho, nem o contrário. */
    var publicado = publicarFicha(registro, ficha, { operacao: operacao });
    if (!publicado.ok) return publicado;

    /* Só cria a linha do índice que falta (sem pasta). A pasta que já
       estiver lá fica: a ficha não sabe nada de pastas. */
    indiceSemFalhar(registro, ficha, '');

    avisarMesas([campanhaAnterior, registro.campanhaId], ['personagens', 'combates']);

    var salvo = { ok: true, rev: registro.rev };
    if (avisoDosDados) salvo.avisos = [avisoDosDados];
    return salvo;
  });
}

function acaoExcluirPersonagem(corpo, usuario) {
  return comTrava(function () {
    /* exigeDono: ser mestre dá acesso à FICHA, não à conta. Apagar o
       personagem de outra pessoa continua fora de alcance. */
    var acesso = personagemAcessivel(corpo.personagemId, usuario, { exigeDono: true });
    if (!acesso.ok) return acesso;
    var registro = acesso.personagem;

    apagarLinha(ABAS.PERSONAGENS, registro._linha);

    /* Os blocos saem depois da linha: sem ela, nenhum caminho chega a
       eles no meio tempo. Só os deste personagem — os das outras fichas
       são de outros registros e nem entram na conta. */
    apagarBlocosDoPersonagem(registro.id);

    /* Achar para apagar não precisa da imagem. */
    var foto = linhaLeve(ABAS.PERSONAGENS_FOTOS, 'personagemId', corpo.personagemId);
    if (foto && String(foto.ownerId) === String(usuario.id)) {
      apagarLinha(ABAS.PERSONAGENS_FOTOS, foto._linha);
    }

    /* A linha do índice sai junto; a pasta continua (pode ter outros). */
    if (organizacaoPronta()) {
      var ind = linhaLeve(ABAS.PERSONAGENS_ORGANIZACAO, 'personagemId', registro.id);
      if (ind) apagarLinha(ABAS.PERSONAGENS_ORGANIZACAO, ind._linha);
    }

    avisarMesas([registro.campanhaId], ['personagens', 'combates']);

    return { ok: true };
  });
}

function acaoDuplicarPersonagem(corpo, usuario) {
  var operacao = idDeOperacao(corpo.operacaoId);

  return comTrava(function () {
    /* A mesma duplicação chegando de novo: devolve a cópia que ela fez. */
    var repetido = personagemDaOperacao(usuario, operacao);
    if (repetido) return { ok: true, dados: { id: repetido.id }, repetida: true };

    var acesso = personagemAcessivel(corpo.personagemId, usuario, { exigeDono: true });
    if (!acesso.ok) return acesso;
    var registro = acesso.personagem;

    /* Duplicar o que não se conseguiu ler seria criar uma cópia vazia
       com cara de cópia. */
    var lido = lerFichaDoPersonagem(registro);
    if (!lido.ok) return lido;

    var ficha = comVinculoDaColuna(lido.ficha, registro);
    var agora = new Date().toISOString();
    var id = novoId();

    ficha.nome = String(ficha.nome || registro.nome || 'Sem nome') + ' (cópia)';
    ficha.criadoEm = agora;
    ficha.atualizadoEm = agora;

    var novo = {
      id: id,
      ownerId: usuario.id,
      nome: ficha.nome.slice(0, 120),
      campanhaId: registro.campanhaId || '',
      classe: registro.classe || '',
      origem: registro.origem || '',
      criadoEm: agora,
      atualizadoEm: agora,
      rev: 1,
    };

    var publicado = publicarFicha(novo, ficha, { inserir: true, operacao: operacao });
    if (!publicado.ok) return publicado;
    lembrarOperacao(usuario, operacao, id);

    /* A cópia fica na mesma pasta da original e com o mesmo sistema —
       nenhuma pasta nova. */
    var pastaDaOriginal = '';
    if (organizacaoPronta()) {
      var indOriginal = linhaLeve(ABAS.PERSONAGENS_ORGANIZACAO, 'personagemId', registro.id);
      if (indOriginal && meu(indOriginal, usuario) && indOriginal.pastaId && minhaPasta(String(indOriginal.pastaId), usuario)) {
        pastaDaOriginal = String(indOriginal.pastaId);
      }
    }
    indiceSemFalhar(novo, ficha, pastaDaOriginal);

    var foto = acharPor(ABAS.PERSONAGENS_FOTOS, 'personagemId', corpo.personagemId);
    if (foto && String(foto.ownerId) === String(usuario.id) && foto.imagem) {
      var copiaFoto = { personagemId: id, ownerId: usuario.id, atualizadoEm: agora };
      if (aplicarImagem(ABAS.PERSONAGENS_FOTOS, copiaFoto, 'imagem', imagemDe(foto, 'imagem'))) {
        inserir(ABAS.PERSONAGENS_FOTOS, copiaFoto);
      }
    }

    avisarMesas([registro.campanhaId], ['personagens']);

    return { ok: true, dados: { id: id } };
  });
}

/* Uma campanha só entra na ficha se existir E for desta conta. Sem
   isto, alterar o campanhaId no console vincularia o personagem à
   campanha de outra pessoa. */
/* Uma campanha só entra na ficha se existir E o usuário alcançar. Até
   a v1 isso queria dizer "ser dono"; agora quer dizer "ser mestre ou
   jogador dela" — mas continua sendo conferido aqui, e não aceito de
   quem enviou. Espectador de campanha pública NÃO conta: olhar de fora
   não põe personagem dentro. */
function campanhaValida(campanhaId, usuario) {
  if (!campanhaId) return '';
  var campanha = acharPor(ABAS.CAMPANHAS, 'id', campanhaId);
  if (!campanha) return '';
  var papel = papelNaCampanha(campanha, usuario);
  return (papel === PAPEL_MESTRE || papel === PAPEL_JOGADOR) ? campanhaId : '';
}

/* =====================================================================
   FOTOS
   ===================================================================== */

function acaoLerFoto(corpo, usuario) {
  var acesso = personagemAcessivel(corpo.personagemId, usuario);
  if (!acesso.ok) return acesso;

  /* A permissão já foi decidida pelo acesso ao personagem. Conferir o
     ownerId da FOTO de novo trancaria o mestre para fora de uma imagem
     que ele pode ver na ficha inteira. */
  var foto = acharPor(ABAS.PERSONAGENS_FOTOS, 'personagemId', corpo.personagemId);
  return { ok: true, dados: { imagem: imagemDe(foto, 'imagem') } };
}

function acaoSalvarFoto(corpo, usuario) {
  var imagem = String(corpo.imagem || '');

  if (imagem && imagem.indexOf('data:image/') !== 0) return { ok: false, erro: 'dados_invalidos' };
  if (imagem.length > MAX_IMAGEM) return { ok: false, erro: 'dados_grandes' };

  return comTrava(function () {
    var acesso = personagemAcessivel(corpo.personagemId, usuario);
    if (!acesso.ok) return acesso;

    var agora = new Date().toISOString();

    /* Busca leve: as duas colunas de identificação bastam para achar a
       linha. Ler a linha inteira traria a imagem ANTIGA — quinze mil
       caracteres que vão ser substituídos — só para devolvê-la
       completa com um campo diferente. */
    var existente = linhaLeve(ABAS.PERSONAGENS_FOTOS, 'personagemId', corpo.personagemId);

    if (existente) {
      /* O dono da foto é o dono do PERSONAGEM, não quem gravou: se o
         mestre trocar a imagem, a ficha continua sendo do jogador. */
      existente.ownerId = acesso.personagem.ownerId;
      existente.atualizadoEm = agora;
      var colunasFoto = aplicarImagem(ABAS.PERSONAGENS_FOTOS, existente, 'imagem', imagem);
      if (!colunasFoto) return { ok: false, erro: 'instalacao_incompleta', detalhe: 'imagemCont' };
      atualizarCampos(ABAS.PERSONAGENS_FOTOS, existente, ['ownerId', 'atualizadoEm'].concat(colunasFoto));
    } else {
      var novaFoto = { personagemId: corpo.personagemId, ownerId: acesso.personagem.ownerId, atualizadoEm: agora };
      if (!aplicarImagem(ABAS.PERSONAGENS_FOTOS, novaFoto, 'imagem', imagem)) return { ok: false, erro: 'instalacao_incompleta', detalhe: 'imagemCont' };
      inserir(ABAS.PERSONAGENS_FOTOS, novaFoto);
    }

    avisarMesas([acesso.personagem.campanhaId], ['personagens']);

    return { ok: true };
  });
}

/* =====================================================================
   HOMEBREW
   ===================================================================== */

var TIPOS_HOMEBREW = ['item', 'arma', 'armadura', 'mochila', 'criatura', 'habilidade', 'ritual'];

/* Até a v2.4.2, 'habilidade' faltava na lista acima e toda habilidade
   enviada à biblioteca era gravada com a coluna tipo = 'item' — mas o
   conteúdo guardado continuou dizendo tipo 'habilidade'. Esses registros
   não são reescritos: o tipo certo é lido do conteúdo na hora de
   entregar, e o próximo salvamento corrige a coluna. */
function tipoDoHomebrew(h, dados) {
  if (String(h.tipo) === 'item' && dados && dados.tipo === 'habilidade') return 'habilidade';
  return h.tipo;
}

/* Um registro é alcançável se for seu, ou se for público. Público dá
   direito de LER e de copiar como modelo — nunca de alterar o
   original. Editar e apagar continuam sendo só do dono. */
function homebrewAlcancavel(registro, usuario) {
  if (!registro) return false;
  if (meu(registro, usuario)) return true;
  return visibilidadeDe(registro.visibilidade) === VIS_PUBLICO;
}

/* escopo:
     'meus'     (padrão) só a biblioteca de quem pediu, pública ou não
     'publicos' só o que OUTRAS contas publicaram
     'todos'    os dois juntos — é o que o seletor de criaturas do
                combate usa

   O padrão é 'meus' de propósito: quem não pediu conteúdo alheio não
   recebe conteúdo alheio. E em nenhum escopo entra registro privado de
   outra conta. */
function acaoListarHomebrew(corpo, usuario) {
  var escopo = String(corpo.escopo || 'meus');
  var tipo = String(corpo.tipo || '');

  /* `tipos`: uma lista fechada, para a biblioteca de itens da ficha não
     receber habilidades nem criaturas. Só tipos conhecidos passam. */
  var tipos = (Array.isArray(corpo.tipos) ? corpo.tipos : [])
    .map(String)
    .filter(function (t) { return TIPOS_HOMEBREW.indexOf(t) >= 0; });
  /* Pediu uma lista e nenhum tipo dela existe: a resposta é vazia, não
     "tudo" — um filtro que não casa com nada não pode virar filtro
     nenhum. */
  if (Array.isArray(corpo.tipos) && !tipos.length) return { ok: true, dados: [] };

  /* Primeiro decide QUAIS registros entram, olhando só as colunas
     baratas — tipo, dono e visibilidade bastam para isso. Só depois
     busca o conteúdo dos que passaram.

     A diferença aparece no escopo padrão: numa planilha com oitenta
     itens de vinte contas, "meus" agora lê quatro conteúdos em vez de
     oitenta. */
  var escolhidos = lerLeves(ABAS.HOMEBREW).filter(function (h) {
    /* Pedindo habilidades, os 'item' também passam por aqui: podem ser
       habilidades antigas gravadas com o tipo errado (ver
       tipoDoHomebrew). O conteúdo decide logo abaixo. */
    if (tipo && String(h.tipo) !== tipo && !(tipo === 'habilidade' && String(h.tipo) === 'item')) return false;
    if (tipos.length && tipos.indexOf(String(h.tipo)) < 0) return false;

    var proprio = meu(h, usuario);
    var publico = visibilidadeDe(h.visibilidade) === VIS_PUBLICO;

    if (escopo === 'publicos') return !proprio && publico;
    if (escopo === 'todos') return proprio || publico;
    return proprio;
  });

  var conteudo = lerCelulas(ABAS.HOMEBREW, escolhidos, 'dadosJson');

  var lista = escolhidos
    .map(function (h) { return homebrewParaCliente(h, usuario, conteudo[h._linha]); })
    .filter(function (d) { return !tipo || d.tipo === tipo; })
    /* Uma habilidade antiga gravada com a coluna `item` passa pelo
       filtro das colunas; o conteúdo diz o que ela é, e aqui ela sai. */
    .filter(function (d) { return !tipos.length || tipos.indexOf(d.tipo) >= 0; })
    .sort(function (a, b) { return String(a.nome).localeCompare(String(b.nome), 'pt-BR'); });

  /* resumo (v2.28): a biblioteca de criaturas lista dezenas de fichas e
     só desenha nome, VD, elementos e PV. A ficha inteira vem depois, por
     ler_homebrew, quando alguém escolhe — e aí a permissão é conferida
     de novo. */
  if (corpo.resumo === true) {
    lista = lista.map(function (d) {
      if (d.tipo !== 'criatura') return d;
      return {
        id: d.id, tipo: d.tipo, nome: d.nome, visibilidade: d.visibilidade,
        criadoEm: d.criadoEm, atualizadoEm: d.atualizadoEm, meu: d.meu,
        resumo: resumoDeCriatura(d),
      };
    });
  }

  return { ok: true, dados: lista };
}

var ELEMENTOS_DE_CRIATURA = ['sangue', 'morte', 'conhecimento', 'energia', 'medo'];

function resumoDeCriatura(d) {
  var ordem = d.sistema === 'ordem' && d.ordem && typeof d.ordem === 'object' ? d.ordem : null;
  var status = Array.isArray(d.status) ? d.status : [];
  var vida = status.filter(function (s) { return s && String(s.id) === 'vida'; })[0] || status[0] || null;
  var r = {
    sistema: ordem ? 'ordem' : 'universal',
    natureza: ['paranormal', 'humana', 'animal'].indexOf(d.natureza) >= 0 ? d.natureza : '',
    categoria: String(d.categoria || '').slice(0, 60),
  };
  if (vida) r.pv = Math.max(0, Math.round(Number(vida.maximo)) || 0);
  if (ordem) {
    r.vd = typeof ordem.vd === 'number' && isFinite(ordem.vd) ? ordem.vd : null;
    r.nivel = String(ordem.nivel || '').slice(0, 60);
    r.elementos = (Array.isArray(ordem.elementos) ? ordem.elementos : [])
      .filter(function (e) { return ELEMENTOS_DE_CRIATURA.indexOf(e) >= 0; });
    r.tamanho = String(ordem.tamanho || '').slice(0, 30);
    r.tipo = String(ordem.tipo || '').slice(0, 40);
  }
  return r;
}

/* A forma como um registro chega ao navegador. As colunas mandam sobre
   o JSON: id, tipo, nome e visibilidade vêm da linha, não do conteúdo
   gravado, para um dadosJson adulterado não conseguir mentir sobre a
   própria visibilidade. */
function homebrewParaCliente(h, usuario, jsonPronto) {
  var dados = lerJson(jsonPronto === undefined ? h.dadosJson : jsonPronto, {});
  dados.id = h.id;
  dados.tipo = tipoDoHomebrew(h, dados);
  dados.nome = h.nome;
  dados.visibilidade = visibilidadeDe(h.visibilidade);
  dados.criadoEm = h.criadoEm;
  dados.atualizadoEm = h.atualizadoEm;
  dados.meu = meu(h, usuario);
  return dados;
}

function acaoLerHomebrew(corpo, usuario) {
  var registro = acharPor(ABAS.HOMEBREW, 'id', corpo.homebrewId);
  if (!homebrewAlcancavel(registro, usuario)) return { ok: false, erro: 'nao_encontrado' };
  return { ok: true, rev: Number(registro.rev) || 0, dados: homebrewParaCliente(registro, usuario) };
}

/* Cria ou atualiza, conforme o id vier ou não — e conforme ele ser
   mesmo desta conta. Um id de outra pessoa não vira atualização: vira
   registro novo, sob quem está pedindo. */
function acaoSalvarHomebrew(corpo, usuario) {
  var dados = corpo.dados;
  if (!dados || typeof dados !== 'object') return { ok: false, erro: 'dados_invalidos' };

  var tipo = TIPOS_HOMEBREW.indexOf(dados.tipo) >= 0 ? dados.tipo : 'item';
  var nome = String(dados.nome || '').trim().slice(0, 120);
  if (!nome) return { ok: false, erro: 'dados_invalidos' };

  var json = JSON.stringify(dados);
  if (json.length > MAX_CELULA) return { ok: false, erro: 'dados_grandes' };

  /* Só quem declarou visibilidade muda visibilidade. Um registro que
     chega sem o campo mantém a que tinha — e um registro novo nasce
     privado. */
  var visibilidade = dados.visibilidade === undefined ? null : visibilidadeDe(dados.visibilidade);

  return comTrava(function () {
    var agora = new Date().toISOString();

    /* meuRegistro, e não homebrewAlcancavel: editar um registro público
       de OUTRA conta é exatamente o que não pode acontecer. Um id
       alheio não vira atualização — vira registro novo sob quem pediu. */
    var existente = dados.id ? meuRegistro(ABAS.HOMEBREW, dados.id, usuario) : null;

    if (existente) {
      existente.tipo = tipo;
      existente.nome = nome;
      existente.visibilidade = visibilidade || visibilidadeDe(existente.visibilidade);
      existente.atualizadoEm = agora;
      existente.rev = (Number(existente.rev) || 0) + 1;
      existente.dadosJson = json;
      atualizarLinha(ABAS.HOMEBREW, existente._linha, existente);
      return { ok: true, dados: { id: existente.id }, rev: existente.rev };
    }

    var id = novoId();
    inserir(ABAS.HOMEBREW, {
      id: id,
      ownerId: usuario.id,
      tipo: tipo,
      nome: nome,
      visibilidade: visibilidade || VIS_PRIVADO,
      criadoEm: agora,
      atualizadoEm: agora,
      rev: 1,
      dadosJson: json,
    });

    return { ok: true, dados: { id: id }, rev: 1 };
  });
}

function acaoExcluirHomebrew(corpo, usuario) {
  return comTrava(function () {
    var registro = meuRegistro(ABAS.HOMEBREW, corpo.homebrewId, usuario);
    if (!registro) return { ok: false, erro: 'nao_encontrado' };

    apagarLinha(ABAS.HOMEBREW, registro._linha);

    /* A imagem mora em outra aba e não some sozinha. Deixá-la para trás
       encheria a planilha de linhas órfãs que ninguém mais consegue
       alcançar nem apagar pela interface. */
    var imagem = linhaLeve(ABAS.CRIATURAS_IMAGENS, 'criaturaId', corpo.homebrewId);
    if (imagem && String(imagem.ownerId) === String(usuario.id)) {
      apagarLinha(ABAS.CRIATURAS_IMAGENS, imagem._linha);
    }

    return { ok: true };
  });
}

/* =====================================================================
   IMAGEM DE CRIATURA
   ---------------------------------------------------------------------
   Mesma arquitetura da foto de personagem: fora do dadosJson, porque é
   o campo mais pesado e o que menos muda. Ler é permitido a quem
   alcança a criatura (dono ou pública); gravar, só ao dono.
   ===================================================================== */

function acaoLerImagemCriatura(corpo, usuario) {
  var registro = acharPor(ABAS.HOMEBREW, 'id', corpo.criaturaId);
  if (!homebrewAlcancavel(registro, usuario)) return { ok: false, erro: 'nao_encontrado' };

  var imagem = acharPor(ABAS.CRIATURAS_IMAGENS, 'criaturaId', corpo.criaturaId);
  return { ok: true, dados: { imagem: imagemDe(imagem, 'imagem') } };
}

function acaoSalvarImagemCriatura(corpo, usuario) {
  var imagem = String(corpo.imagem || '');

  if (imagem && imagem.indexOf('data:image/') !== 0) return { ok: false, erro: 'dados_invalidos' };
  if (imagem.length > MAX_IMAGEM) return { ok: false, erro: 'dados_grandes' };

  return comTrava(function () {
    var registro = meuRegistro(ABAS.HOMEBREW, corpo.criaturaId, usuario);
    if (!registro) return { ok: false, erro: 'nao_encontrado' };

    var agora = new Date().toISOString();
    var existente = linhaLeve(ABAS.CRIATURAS_IMAGENS, 'criaturaId', corpo.criaturaId);

    if (existente) {
      existente.ownerId = usuario.id;
      existente.atualizadoEm = agora;
      var colunasCriatura = aplicarImagem(ABAS.CRIATURAS_IMAGENS, existente, 'imagem', imagem);
      if (!colunasCriatura) return { ok: false, erro: 'instalacao_incompleta', detalhe: 'imagemCont' };
      atualizarCampos(ABAS.CRIATURAS_IMAGENS, existente, ['ownerId', 'atualizadoEm'].concat(colunasCriatura));
    } else {
      var novaImagem = { criaturaId: corpo.criaturaId, ownerId: usuario.id, atualizadoEm: agora };
      if (!aplicarImagem(ABAS.CRIATURAS_IMAGENS, novaImagem, 'imagem', imagem)) return { ok: false, erro: 'instalacao_incompleta', detalhe: 'imagemCont' };
      inserir(ABAS.CRIATURAS_IMAGENS, novaImagem);
    }

    return { ok: true };
  });
}


/* =====================================================================
   PERFIL
   ===================================================================== */

function acaoLerPerfil(corpo, usuario) {
  var perfil = acharPor(ABAS.PERFIS, 'userId', usuario.id);

  return {
    ok: true,
    dados: {
      id: usuario.id,
      usuario: usuario.usuario,
      nome: usuario.nome || usuario.usuario,
      avatar: imagemDe(perfil, 'avatar'),
      criadoEm: usuario.criadoEm,
      preferencias: lerJson(perfil && perfil.preferenciasJson, {}),
    },
  };
}

function acaoSalvarPerfil(corpo, usuario) {
  var dados = corpo.dados || {};

  if (dados.avatar !== undefined) {
    var img = String(dados.avatar || '');
    if (img && img.indexOf('data:image/') !== 0) return { ok: false, erro: 'dados_invalidos' };
    if (img.length > MAX_IMAGEM) return { ok: false, erro: 'dados_grandes' };
    if (img.length > MAX_CELULA && !temColuna(ABAS.PERFIS, 'avatarCont')) return { ok: false, erro: 'instalacao_incompleta', detalhe: 'imagemCont' };
  }

  /* A conta é sempre a da sessão (`usuario`); o corpo não escolhe. */
  var preferenciasLimpas = dados.preferencias !== undefined ? validarPreferencias(dados.preferencias) : null;
  if (dados.preferencias !== undefined && !preferenciasLimpas) {
    return { ok: false, erro: 'dados_invalidos' };
  }

  return comTrava(function () {
    var agora = new Date().toISOString();
    var preferenciasGravadas = null;

    if (dados.nome !== undefined) {
      var registro = acharPor(ABAS.USUARIOS, 'id', usuario.id);
      if (registro) {
        registro.nome = String(dados.nome).trim().slice(0, 80) || registro.usuario;
        /* O diretório de contas guarda nomes: trocar o seu tem de
           aparecer para os outros agora, não em cinco minutos. */
        esquecerContas();
        registro.atualizadoEm = agora;
        atualizarLinha(ABAS.USUARIOS, registro._linha, registro);
      }
    }

    if (dados.avatar !== undefined || dados.preferencias !== undefined) {
      var perfil = acharPor(ABAS.PERFIS, 'userId', usuario.id);

      if (!perfil) {
        perfil = { userId: usuario.id, avatar: '', preferenciasJson: '{}', atualizadoEm: agora };
        inserir(ABAS.PERFIS, perfil);
        perfil = acharPor(ABAS.PERFIS, 'userId', usuario.id);
      }

      /* As preferências são conferidas antes de qualquer escrita: passar
         do tamanho recusa o pedido inteiro, sem meia gravação. */
      if (dados.preferencias !== undefined) {
        preferenciasGravadas = juntarPreferencias(perfil.preferenciasJson, preferenciasLimpas);
        /* Excluir o tema ativo sem dizer qual fica: a conta volta ao
           aparelho, nunca a um "personalizado" que não existe. */
        if (preferenciasGravadas.tema === 'personalizado' && !((preferenciasGravadas.temas || []).some(function (t) { return t && t.id === preferenciasGravadas.temaAtivo; }))) {
          preferenciasGravadas.tema = 'sistema';
        }
        var prefsJson = JSON.stringify(preferenciasGravadas);
        if (prefsJson.length > MAX_PREFERENCIAS_JSON) return { ok: false, erro: 'dados_grandes' };
        perfil.preferenciasJson = prefsJson;
      }
      if (dados.avatar !== undefined) aplicarImagem(ABAS.PERFIS, perfil, 'avatar', String(dados.avatar || ''));
      perfil.atualizadoEm = agora;

      atualizarLinha(ABAS.PERFIS, perfil._linha, perfil);
    }

    return preferenciasGravadas ? { ok: true, preferencias: preferenciasGravadas } : { ok: true };
  });
}

/* =====================================================================
   PANORAMA
   ---------------------------------------------------------------------
   Uma chamada devolve o que a Home precisa. Três chamadas para escrever
   três números pagariam três vezes a lentidão do Apps Script.
   ===================================================================== */

function acaoResumo(corpo, usuario) {
  /* Contagens e seis nomes recentes. Nada aqui olha para dentro de uma
     ficha ou de um item, então nada aqui precisa lê-los. */
  var personagens = lerLeves(ABAS.PERSONAGENS).filter(function (p) { return meu(p, usuario); });
  var homebrew = lerLeves(ABAS.HOMEBREW).filter(function (h) { return meu(h, usuario); });

  /* A conta de campanhas passa a incluir aquelas de que o usuário
     PARTICIPA, e não só as que ele criou: para quem só joga, contar
     zero enquanto está em três mesas seria simplesmente errado.
     Espectador de campanha pública fica de fora — olhar de longe não é
     participar. */
  var alcance = campanhasDoUsuario(usuario);
  var campanhas = Object.keys(alcance)
    .filter(function (id) { return alcance[id].papel !== PAPEL_ESPECTADOR; })
    .map(function (id) { return alcance[id].campanha; });

  var nomeDaCampanha = {};
  campanhas.forEach(function (c) { nomeDaCampanha[c.id] = c.nome; });

  var recentes = []
    .concat(personagens.map(function (p) {
      return {
        tipo: 'personagem', id: p.id, nome: p.nome,
        campanha: nomeDaCampanha[p.campanhaId] || '',
        atualizadoEm: p.atualizadoEm,
      };
    }))
    .concat(campanhas.map(function (c) {
      return { tipo: 'campanha', id: c.id, nome: c.nome, atualizadoEm: c.atualizadoEm };
    }))
    .concat(homebrew.map(function (h) {
      return { tipo: 'homebrew', id: h.id, nome: h.nome, subtipo: h.tipo, atualizadoEm: h.atualizadoEm };
    }))
    .sort(function (a, b) { return String(b.atualizadoEm).localeCompare(String(a.atualizadoEm)); })
    .slice(0, 6);

  return {
    ok: true,
    dados: {
      contagens: {
        personagens: personagens.length,
        campanhas: campanhas.length,
        homebrew: homebrew.length,
      },
      recentes: recentes,
    },
  };
}

/* =====================================================================
   =====================================================================
   FUNÇÕES ADMINISTRATIVAS
   ---------------------------------------------------------------------
   Rodadas À MÃO no editor do Apps Script, nunca pela API. Nenhuma
   delas está no roteamento, então não existe requisição capaz de
   chamá-las.
   =====================================================================
   ===================================================================== */

/* ---------------------------------------------------------------------
   setupRama()
   Cria as abas que faltam e conserta cabeçalhos. NÃO apaga dado nenhum
   e NÃO mexe em aba já configurada — pode rodar quantas vezes quiser,
   inclusive depois de uma atualização que acrescente colunas.
   --------------------------------------------------------------------- */
function setupRama() {
  reiniciarExecucao();
  var arquivo = planilha();
  var relatorio = [];

  Object.keys(ABAS).forEach(function (chave) {
    var definicao = ABAS[chave];
    var folha = arquivo.getSheetByName(definicao.nome);

    if (!folha) {
      folha = arquivo.insertSheet(definicao.nome);
      folha.appendRow(definicao.colunas);
      folha.setFrozenRows(1);
      folha.getRange(1, 1, 1, definicao.colunas.length).setFontWeight('bold');
      relatorio.push('criada: ' + definicao.nome);
      return;
    }

    var largura = Math.max(folha.getLastColumn(), 1);
    var cabecalho = folha.getRange(1, 1, 1, largura).getValues()[0]
      .map(function (v) { return String(v).trim(); });

    /* Coluna nova entra no fim, e as linhas que já existem ficam com
       ela vazia. Reordenar cabeçalho existente moveria dado de coluna
       — o tipo de conserto que estraga mais do que arruma. */
    var faltando = definicao.colunas.filter(function (c) { return cabecalho.indexOf(c) < 0; });

    if (faltando.length) {
      var inicio = cabecalho.filter(function (c) { return c !== ''; }).length + 1;
      folha.getRange(1, inicio, 1, faltando.length).setValues([faltando]);
      folha.getRange(1, 1, 1, inicio + faltando.length - 1).setFontWeight('bold');
      relatorio.push('colunas acrescentadas em ' + definicao.nome + ': ' + faltando.join(', '));
    } else {
      relatorio.push('ok: ' + definicao.nome);
    }

    if (folha.getFrozenRows() < 1) folha.setFrozenRows(1);
  });

  /* As colunas de texto puro — o conteúdo dos blocos de ficha (v2.15).
     O formato "@" faz a planilha guardar o que chega sem converter em
     número, data ou fórmula. É defesa a mais: cada bloco já vai entre
     marcadores e é conferido por SHA-256. Aplicar de novo não muda nada,
     então roda sempre, inclusive numa aba que já existia. */
  Object.keys(ABAS).forEach(function (chave) {
    var definicao = ABAS[chave];
    if (!definicao.somenteTexto) return;
    var folha = arquivo.getSheetByName(definicao.nome);
    if (!folha) return;
    var nomes = folha.getRange(1, 1, 1, Math.max(folha.getLastColumn(), 1)).getValues()[0]
      .map(function (v) { return String(v).trim(); });
    definicao.somenteTexto.forEach(function (coluna) {
      var posicao = nomes.indexOf(coluna) + 1;
      if (!posicao) return;
      folha.getRange(1, posicao, folha.getMaxRows(), 1).setNumberFormat('@');
    });
  });

  /* A aba padrão vazia que toda planilha nova traz só atrapalha. Sai,
     mas apenas se estiver realmente vazia. */
  var padrao = arquivo.getSheetByName('Página1') || arquivo.getSheetByName('Sheet1');
  if (padrao && arquivo.getSheets().length > 1 && padrao.getLastRow() === 0) {
    arquivo.deleteSheet(padrao);
    relatorio.push('removida a aba padrão vazia');
  }

  /* A época começa a existir aqui. Sem ela, o cache de sessão não teria
     com que se comparar e recusaria toda entrada — funcionaria, só que
     sem cache nenhum. */
  if (!propriedade('RAMA_EPOCA', '')) definirPropriedade('RAMA_EPOCA', '1');

  /* Este setup pode ter acrescentado coluna. Avançar a época joga fora
     os cabeçalhos guardados e as sessões em cache, para nada continuar
     trabalhando com o desenho antigo da planilha.

     É também o motivo de a instrução ser sempre "mexeu na planilha,
     rode setupRama()": é aqui que o sistema toma conhecimento. */
  esquecerCabecalhos();

  /* Aviso, não conserto: numa planilha vinda da v1, `visibilidade` foi
     acrescentada no FIM da aba, enquanto o código a declara no meio.
     Reordenar colunas aqui moveria dado de lugar — o tipo de conserto
     que estraga mais do que arruma. O sistema lê pelo NOME da coluna
     justamente para não depender disso; o aviso abaixo só torna a
     situação visível a quem rodar o setup. */
  Object.keys(ABAS).forEach(function (chave) {
    var definicao = ABAS[chave];
    try {
      if (!cabecalho(definicao).alinhado) {
        relatorio.push('ordem física diferente da declarada em ' + definicao.nome +
          ' — lido pelo nome da coluna, nada a fazer');
      }
    } catch (erro) { /* aba recém-criada, sem o que conferir */ }
  });

  /* A ficha em blocos (v2.15) não pede migração: cada ficha antiga
     continua no formato antigo até a próxima gravação que der certo, e
     é lida normalmente até lá. O setup só conta, para quem roda saber
     onde a planilha está. Contar não grava nada. */
  try {
    var personagens = lerLeves(ABAS.PERSONAGENS);
    var manifestos = lerCelulas(ABAS.PERSONAGENS, personagens, 'armazenamento');
    var emBlocos = personagens.filter(function (p) {
      var m = manifestoDe(manifestos[p._linha]);
      return m && !m.invalido;
    }).length;
    relatorio.push('fichas em blocos: ' + emBlocos + ' de ' + personagens.length +
      ' — as outras passam para blocos sozinhas, na próxima gravação de cada uma');

    /* A projeção do painel (v2.16) segue a mesma regra: nasce com a
       gravação, e quem não tem só faz o painel remontar aquela ficha. */
    var guardados = lerCelulas(ABAS.PERSONAGENS, personagens, 'resumo');
    var comProjecao = personagens.filter(function (p) {
      return typeof projecaoDoRegistro === 'function' && !!projecaoDoRegistro(p, guardados[p._linha]);
    }).length;
    relatorio.push('resumos do painel em dia: ' + comProjecao + ' de ' + personagens.length +
      ' — reconstruirResumos() refaz os que faltam, em lotes, sem tocar nas fichas');

    /* O índice de organização (v2.26) também nasce sozinho: na criação,
       na gravação e na listagem de cada conta. Contar não grava nada. */
    var indexados = {};
    lerLeves(ABAS.PERSONAGENS_ORGANIZACAO).forEach(function (l) { indexados[String(l.personagemId)] = true; });
    var comIndice = personagens.filter(function (p) { return indexados[String(p.id)]; }).length;
    relatorio.push('fichas no índice de pastas e sistemas: ' + comIndice + ' de ' + personagens.length +
      ' — as outras entram na próxima listagem de cada conta, ou de uma vez com indexarPersonagens()');
  } catch (erro) { /* aba recém-criada, nada a contar */ }

  var texto = 'R.A.M.A. — setup\n\n' + relatorio.join('\n');
  console.log(texto);
  return texto;
}

/* ---------------------------------------------------------------------
   indexarPersonagens()
   Põe no índice de organização (v2.26) as fichas que ainda não estão
   nele, lendo o sistema de cada uma — sem pasta, sem tocar na ficha.
   Opcional: a listagem de cada conta faz o mesmo aos poucos. Roda em
   lotes; se parar pelo tempo, rode de novo, que continua de onde estava.
   --------------------------------------------------------------------- */
function indexarPersonagens() {
  reiniciarExecucao();
  if (!organizacaoPronta()) {
    var falta = 'R.A.M.A. — índice: rode setupRama() antes, para criar as abas PASTAS e PERSONAGENS_ORGANIZACAO.';
    console.log(falta);
    return falta;
  }
  var inicio = Date.now();
  var feitos = 0;
  var restantes = 0;
  var indexados = {};
  lerLeves(ABAS.PERSONAGENS_ORGANIZACAO).forEach(function (l) { indexados[String(l.personagemId)] = true; });
  var faltando = lerLeves(ABAS.PERSONAGENS).filter(function (p) { return !indexados[String(p.id)]; });

  for (var i = 0; i < faltando.length; i += 20) {
    if (Date.now() - inicio > 4 * 60 * 1000) { restantes = faltando.length - i; break; }
    var lote = faltando.slice(i, i + 20);
    var lidas = lerFichasDosPersonagens(lote);
    comTrava(function () {
      var ja = {};
      lerLeves(ABAS.PERSONAGENS_ORGANIZACAO).forEach(function (l) { ja[String(l.personagemId)] = true; });
      var agora = new Date().toISOString();
      var linhas = lote.filter(function (p) { return !ja[String(p.id)] && lidas[p.id] && lidas[p.id].ok; }).map(function (p) {
        return { personagemId: p.id, ownerId: p.ownerId, sistema: sistemaDaFicha(lidas[p.id].ficha), pastaId: '', atualizadoEm: agora };
      });
      if (linhas.length) inserirLinhas(ABAS.PERSONAGENS_ORGANIZACAO, linhas);
      feitos += linhas.length;
      return { ok: true };
    });
  }

  var texto = 'R.A.M.A. — índice de pastas e sistemas: ' + feitos + ' ficha(s) indexada(s)' +
    (restantes ? '; faltam ' + restantes + ' — rode de novo.' : '; nada pendente.');
  console.log(texto);
  return texto;
}

/* ---------------------------------------------------------------------
   gerarPepper()
   Cria o segredo do servidor. Rode UMA VEZ, no começo.

   ATENÇÃO: trocar o pepper depois invalida TODAS as senhas já
   cadastradas — elas foram derivadas com o valor antigo e não têm como
   ser recalculadas. Se precisar trocar, cadastre as senhas de novo.
   --------------------------------------------------------------------- */
function gerarPepper() {
  reiniciarExecucao();
  var props = PropertiesService.getScriptProperties();

  if (props.getProperty('RAMA_PEPPER')) {
    var aviso = 'RAMA_PEPPER já existe. Não vou sobrescrever — trocar o pepper invalidaria todas as senhas.';
    console.warn(aviso);
    return aviso;
  }

  props.setProperty('RAMA_PEPPER', novoSegredo() + novoSegredo());
  var ok = 'RAMA_PEPPER criado. Ele fica só aqui, nas Script Properties — nunca no repositório.';
  console.log(ok);
  return ok;
}

/* ---------------------------------------------------------------------
   criarUsuario(usuario, nome, senha)
   Cadastra uma conta. Chame pelo editor, com os valores no lugar.
   --------------------------------------------------------------------- */
function criarUsuario(usuario, nome, senha) {
  reiniciarExecucao();
  var login = String(usuario || '').trim().toLowerCase();
  var texto = String(senha || '');

  if (!/^[a-z0-9._-]{3,40}$/.test(login)) {
    throw new Error('Usuário inválido: use de 3 a 40 caracteres, entre letras minúsculas, números, ponto, hífen e sublinhado.');
  }
  if (texto.length < 8) {
    throw new Error('A senha precisa de pelo menos 8 caracteres.');
  }
  if (acharPor(ABAS.USUARIOS, 'usuario', login)) {
    throw new Error('Já existe um usuário com esse nome.');
  }

  var iteracoes = Number(propriedade('RAMA_ITERACOES', '10000'));
  var salt = novoSegredo().slice(0, 32);
  var agora = new Date().toISOString();
  var id = novoId();

  inserir(ABAS.USUARIOS, {
    id: id,
    usuario: login,
    nome: String(nome || login).trim().slice(0, 80),
    hashSenha: derivarSenha(texto, salt, iteracoes),
    salt: salt,
    iteracoes: iteracoes,
    ativo: 'true',
    criadoEm: agora,
    atualizadoEm: agora,
  });

  inserir(ABAS.PERFIS, { userId: id, avatar: '', preferenciasJson: '{}', atualizadoEm: agora });

  var ok = 'Usuário "' + login + '" criado. Apague a senha deste editor depois de rodar.';
  console.log(ok);
  return ok;
}

/* Ajuste os três valores e rode uma vez. Depois APAGUE a senha daqui —
   o editor guarda o arquivo, e senha em texto não deve ficar guardada
   em lugar nenhum. */
function criarPrimeiroUsuario() {
  return criarUsuario('agente', 'Agente', 'teste123');
}

/* ---------------------------------------------------------------------
   trocarSenha(usuario, novaSenha)
   --------------------------------------------------------------------- */
function trocarSenha(usuario, novaSenha) {
  reiniciarExecucao();
  var login = String(usuario || '').trim().toLowerCase();
  var texto = String(novaSenha || '');

  if (texto.length < 8) throw new Error('A senha precisa de pelo menos 8 caracteres.');

  var registro = acharPor(ABAS.USUARIOS, 'usuario', login);
  if (!registro) throw new Error('Usuário não encontrado.');

  var iteracoes = Number(propriedade('RAMA_ITERACOES', '10000'));
  var salt = novoSegredo().slice(0, 32);

  registro.salt = salt;
  registro.iteracoes = iteracoes;
  registro.hashSenha = derivarSenha(texto, salt, iteracoes);
  registro.atualizadoEm = new Date().toISOString();

  atualizarLinha(ABAS.USUARIOS, registro._linha, registro);

  /* Trocar a senha derruba as sessões: se a troca foi porque alguém
     entrou, deixar as sessões vivas não resolveria nada. */
  encerrarSessoesDe(registro.id);

  var ok = 'Senha trocada e sessões encerradas. Apague a senha deste editor.';
  console.log(ok);
  return ok;
}

function desativarUsuario(usuario) {
  reiniciarExecucao();
  var registro = acharPor(ABAS.USUARIOS, 'usuario', String(usuario || '').trim().toLowerCase());
  if (!registro) throw new Error('Usuário não encontrado.');

  registro.ativo = 'false';
  registro.atualizadoEm = new Date().toISOString();
  atualizarLinha(ABAS.USUARIOS, registro._linha, registro);
  encerrarSessoesDe(registro.id);

  return 'Usuário desativado e sessões encerradas.';
}

/* Derruba as sessões de uma conta.

   O avanço da época é a parte que não pode faltar. Marcar `ativo =
   false` na planilha resolve o caminho da planilha; as entradas de
   cache que já existem continuariam valendo por até dois minutos, e
   dois minutos é tempo demais quando o motivo de encerrar foi alguém ter
   entrado onde não devia.

   O CacheService não deixa listar nem apagar por prefixo, então não há
   como achar as entradas dessa conta. Avançar a época invalida as de
   todo mundo de uma vez — grosseiro, mas é a operação que existe, e o
   preço é uma leitura a mais para quem estava online. */
function encerrarSessoesDe(userId) {
  lerTudo(ABAS.SESSOES).forEach(function (s) {
    if (String(s.userId) === String(userId) && String(s.ativo) === 'true') {
      s.ativo = 'false';
      atualizarLinha(ABAS.SESSOES, s._linha, s);
    }
  });

  avancarEpoca();
}

/* ---------------------------------------------------------------------
   conferirInstalacao()
   Diz o que falta antes de publicar. Rode depois do setup.
   --------------------------------------------------------------------- */
function conferirInstalacao() {
  /* Os três arquivos, ANTES de qualquer outra coisa. Esta é a função que
     alguém roda justamente quando algo não está no lugar, então ela não
     pode depender do que está faltando — chamar reiniciarExecucao()
     aqui em cima estouraria com ReferenceError e esconderia o
     diagnóstico que ela existe para dar. */
  if (typeof ABAS === 'undefined' || typeof reiniciarExecucao !== 'function') {
    var falta = 'PENDÊNCIAS: Dados.gs não está no projeto — crie o arquivo e cole o conteúdo.';
    console.log(falta);
    return falta;
  }

  reiniciarExecucao();
  var problemas = [];
  var avisos = [];

  if (typeof rotasDeCampanha !== 'function') {
    problemas.push('Campanhas.gs não está no projeto — as ações de campanha vão responder erro.');
  }

  try {
    planilha().getName();
  } catch (erro) {
    problemas.push('Planilha: ' + erro.message);
  }

  if (!propriedade('RAMA_PEPPER', '')) problemas.push('RAMA_PEPPER não definido — rode gerarPepper().');

  Object.keys(ABAS).forEach(function (chave) {
    try {
      aba(ABAS[chave]);
    } catch (erro) {
      problemas.push(erro.message);
    }
  });

  /* Cabeçalho incompleto é a falha mais traiçoeira que esta planilha
     pode ter: tudo parece no lugar, e a coluna some da leitura. Numa
     aba USUARIOS isso faz toda senha ser recusada. */
  Object.keys(ABAS).forEach(function (chave) {
    try {
      var ilegiveis = colunasIlegiveis(ABAS[chave]);
      if (ilegiveis.length) {
        problemas.push('A aba ' + ABAS[chave].nome + ' não consegue ler estas colunas: ' +
          ilegiveis.join(', ') + '. Elas voltam vazias. Rode setupRama() e confira o cabeçalho.');
      }

      var recuperadas = colunasRecuperadas(ABAS[chave]);
      if (recuperadas.length) {
        avisos.push('A aba ' + ABAS[chave].nome + ' está com o cabeçalho fora do esperado em: ' +
          recuperadas.join(', ') + '. O dado continua sendo lido pela posição, mas rode ' +
          'setupRama() para acertar o cabeçalho.');
      }
    } catch (erro) { /* aba ausente, já reportada acima */ }
  });

  try {
    var usuarios = lerTudo(ABAS.USUARIOS);
    if (!usuarios.length) problemas.push('Nenhum usuário cadastrado — rode criarUsuario().');

    usuarios.forEach(function (u) {
      if (String(u.hashSenha || '').length !== 64) {
        problemas.push('Usuário "' + u.usuario + '" com hash de tamanho inesperado. ' +
          'Se a planilha não foi editada à mão, rode trocarSenha() para essa conta.');
      }
    });
  } catch (erro) {
    /* já reportado acima */
  }

  /* A ficha em blocos (v2.15): a aba e a coluna do manifesto precisam
     existir para gravar. Sem elas, fichas antigas ainda abrem, mas
     nenhuma ficha salva. */
  try {
    aba(ABAS.PERSONAGENS_BLOCOS);
    if (!cabecalho(ABAS.PERSONAGENS).mapa.armazenamento) {
      problemas.push('A aba PERSONAGENS não tem a coluna armazenamento — rode setupRama(). ' +
        'Sem ela nenhuma ficha salva.');
    }
    var achado = blocosSemDono();
    if (achado.orfas.length) {
      avisos.push(achado.orfas.length + ' linha(s) de blocos sem ficha que as aponte. Não atrapalham nada; ' +
        'rode limparBlocosOrfaos() para recolhê-las.');
    }
    /* Linha em branco é o espaço que a gravação deixa para a próxima
       geração da mesma ficha (v2.16). Ela só vira aviso quando há muita:
       aí sobrou mais espaço do que as fichas vão reaproveitar. */
    if (achado.vazias.length > 200) {
      avisos.push(achado.vazias.length + ' linha(s) em branco na aba de blocos. É espaço reaproveitável; ' +
        'rode limparBlocosOrfaos() se quiser devolvê-lo à planilha.');
    }

    /* A projeção do painel (v2.16). Sem a coluna, a mesa continua
       carregando — remontando cada ficha, como na v2.15. */
    if (!cabecalho(ABAS.PERSONAGENS).mapa.resumo) {
      avisos.push('A aba PERSONAGENS não tem a coluna resumo — rode setupRama(). ' +
        'Sem ela o painel da mesa remonta todas as fichas para desenhar os cartões.');
    } else {
      var personagens = lerLeves(ABAS.PERSONAGENS);
      var guardados = lerCelulas(ABAS.PERSONAGENS, personagens, 'resumo');
      var semProjecao = personagens.filter(function (p) {
        return typeof projecaoDoRegistro !== 'function' || !projecaoDoRegistro(p, guardados[p._linha]);
      }).length;
      if (semProjecao) {
        avisos.push(semProjecao + ' de ' + personagens.length + ' ficha(s) sem projeção em dia. ' +
          'Cada uma será remontada ao abrir a mesa até a próxima gravação dela; ' +
          'reconstruirResumos() resolve em lote.');
      }
    }
  } catch (erro) {
    /* a falta da aba já foi reportada acima */
  }

  var iteracoes = Number(propriedade('RAMA_ITERACOES', '10000'));
  if (iteracoes < 5000) {
    avisos.push('RAMA_ITERACOES está em ' + iteracoes + '. Abaixo de 5000 a derivação fica fraca.');
  }

  var texto = problemas.length
    ? 'PENDÊNCIAS:\n' + problemas.map(function (p) { return '· ' + p; }).join('\n')
    : 'Instalação completa. Publique como app da Web e copie a URL /exec.';

  if (avisos.length) texto += '\n\nAVISOS:\n' + avisos.map(function (a) { return '· ' + a; }).join('\n');

  console.log(texto);
  return texto;
}

/* ---------------------------------------------------------------------
   FICHAS EM BLOCOS — diagnóstico, restauração e limpeza (v2.15)

   As três rodam À MÃO no editor do Apps Script, como as outras desta
   seção; nenhuma está no roteamento, então não existe requisição capaz
   de chamá-las. Quem roda é quem já tem a planilha aberta — e mesmo
   assim o diagnóstico não imprime o conteúdo de ficha nenhuma.
   --------------------------------------------------------------------- */

/* Blocos que nenhum manifesto aponta: de gerações velhas, de gravações
   que pararam no meio, de fichas excluídas. Uma geração que um manifesto
   aponta — a ativa ou a anterior — nunca entra na conta, nem os blocos
   de uma ficha cujo manifesto esta versão não entende. */
var CARENCIA_ORFAOS_MS = 10 * 60 * 1000;

function blocosSemDono() {
  var personagens = lerLeves(ABAS.PERSONAGENS);
  var manifestos = lerCelulas(ABAS.PERSONAGENS, personagens, 'armazenamento');

  var guardar = {};
  personagens.forEach(function (p) {
    var m = manifestoDe(manifestos[p._linha]);
    var g = {};
    if (m && m.invalido) g['*'] = true;
    else if (m) {
      g[String(m.geracao)] = true;
      if (m.anterior && m.anterior.geracao) g[String(m.anterior.geracao)] = true;
    }
    guardar[String(p.id)] = g;
  });

  /* Devolve { orfas, vazias }: as linhas que nenhum manifesto aponta e
     as que a gravação deixou em branco.

     Blocos de um personagem que não existe só saem depois de uma
     carência: uma criação grava os blocos antes da linha, dentro da
     trava — isto é só uma margem a mais. */
  var limite = Date.now() - CARENCIA_ORFAOS_MS;
  var linhas = [];
  var vazias = [];
  lerLeves(ABAS.PERSONAGENS_BLOCOS).forEach(function (b) {
    /* Linha em branco: espaço que a gravação deixou para trás (v2.16).
       Não é bloco de ninguém — é o que a compactação recolhe. */
    if (String(b.personagemId || '') === '') { vazias.push(b._linha); return; }

    var g = guardar[String(b.personagemId)];
    if (g) {
      if (g['*'] || g[String(b.geracao)]) return;
      linhas.push(b._linha);
      return;
    }
    var quando = Date.parse(String(b.criadoEm || ''));
    if (isFinite(quando) && quando > limite) return;
    linhas.push(b._linha);
  });
  return { orfas: linhas, vazias: vazias };
}

function contarBlocosSemDono() {
  return blocosSemDono().orfas.length;
}

/* ---------------------------------------------------------------------
   limparBlocosOrfaos()
   Recolhe o que a aba de blocos tem de sobra: as linhas que nenhuma
   ficha aponta (ficha excluída cuja limpeza falhou, gravação que parou
   no meio) e as linhas em branco que as gravações deixaram para trás.
   Cada gravação já recolhe as gerações velhas da própria ficha; isto é a
   faxina. Seguro de rodar a qualquer hora, quantas vezes quiser.

   Esta é a ÚNICA operação do sistema que apaga linhas da aba de blocos —
   e apagar desloca. Os localizadores guardados nos manifestos passam a
   apontar para o lugar errado; a leitura percebe (ela confere personagem,
   geração e SHA-256), acha os blocos pelo índice e devolve a ficha
   inteira do mesmo jeito. A gravação seguinte de cada ficha grava o
   localizador novo. Nada se perde; as primeiras leituras depois da
   faxina é que custam uma chamada a mais.
   --------------------------------------------------------------------- */
function limparBlocosOrfaos() {
  reiniciarExecucao();
  var r = comTrava(function () {
    var achado = blocosSemDono();
    return {
      ok: true,
      apagadas: apagarLinhas(ABAS.PERSONAGENS_BLOCOS, achado.orfas.concat(achado.vazias)),
      orfas: achado.orfas.length,
      vazias: achado.vazias.length,
    };
  });
  var texto = r.ok
    ? 'R.A.M.A. — limpeza de blocos: ' + r.apagadas + ' linha(s) recolhida(s) (' +
      r.orfas + ' sem dono, ' + r.vazias + ' em branco).'
    : 'R.A.M.A. — limpeza de blocos: a trava não foi obtida (' + r.erro + '). Tente de novo.';
  console.log(texto);
  return texto;
}
/* ---------------------------------------------------------------------
   reconstruirResumos([quantos])
   Refaz a PROJEÇÃO (coluna `resumo`) das fichas que estiverem sem ela —
   as gravadas antes da v2.16, por exemplo. Nada disto é obrigatório: um
   personagem sem projeção só faz o painel da mesa remontar aquela ficha,
   e a primeira gravação dele já resolve sozinha. Isto é para resolver em
   lote, sem esperar as pessoas salvarem.

   Em LOTES, com ponto de retomada: uma planilha com centenas de fichas
   não cabe numa execução de seis minutos. Cada chamada processa
   `quantos` fichas (25 por padrão) e guarda onde parou; chamar de novo
   continua dali. Terminou, o relatório diz que não falta nada e o ponto
   de retomada é esquecido.

   Cada ficha é tratada dentro da própria trava, e só a coluna `resumo` é
   escrita: nem manifesto, nem blocos, nem revisão. Uma ficha que não se
   monta é contada e deixada em paz.
   --------------------------------------------------------------------- */
var RESUMOS_POR_LOTE = 25;
var CHECKPOINT_DOS_RESUMOS = 'RAMA_RESUMOS_DESDE';

function reconstruirResumos(quantos) {
  reiniciarExecucao();

  if (typeof textoDaProjecao !== 'function') {
    var semCampanhas = 'R.A.M.A. — reconstrução de resumos: Campanhas.gs não está instalado.';
    console.log(semCampanhas);
    return semCampanhas;
  }

  var limite = Math.max(1, Math.min(200, Number(quantos) || RESUMOS_POR_LOTE));
  var desde = String(propriedade(CHECKPOINT_DOS_RESUMOS, ''));

  var todos = lerLeves(ABAS.PERSONAGENS).slice().sort(function (a, b) {
    return String(a.id).localeCompare(String(b.id));
  });
  var resumos = lerCelulas(ABAS.PERSONAGENS, todos, 'resumo');

  var pendentes = todos.filter(function (p) {
    if (desde && String(p.id) <= desde) return false;
    return !projecaoDoRegistro(p, resumos[p._linha]);
  });

  var lote = pendentes.slice(0, limite);
  var feitos = 0;
  var antigas = 0;
  var ilegiveis = 0;

  lote.forEach(function (p) {
    var r = comTrava(function () {
      var atual = acharPor(ABAS.PERSONAGENS, 'id', p.id);
      if (!atual) return { ok: true, pulado: true };

      var m = manifestoDe(atual.armazenamento);
      /* Ficha ainda no formato antigo: a projeção nasce com a primeira
         gravação em blocos, junto com o manifesto. Forçar aqui seria
         gravar uma projeção sem geração para conferir contra. */
      if (!m || m.invalido) return { ok: true, antiga: true };

      var lido = lerFichaDoPersonagem(atual);
      if (!lido.ok) return { ok: true, ilegivel: true };

      var registro = lido.registro;
      registro.resumo = textoDaProjecao(lido.ficha, m.geracao, Number(registro.rev) || 0);
      if (!registro.resumo) return { ok: true, pulado: true };

      try {
        atualizarCampos(ABAS.PERSONAGENS, registro, ['resumo']);
      } catch (erro) {
        console.warn('R.A.M.A.: resumo de ' + p.id + ' não gravado: ' + erro);
        return { ok: true, pulado: true };
      }
      return { ok: true, feito: true };
    });

    if (!r || !r.ok) return;
    if (r.feito) feitos++;
    if (r.antiga) antigas++;
    if (r.ilegivel) ilegiveis++;
  });

  var faltam = pendentes.length - lote.length;

  if (lote.length) definirPropriedade(CHECKPOINT_DOS_RESUMOS, String(lote[lote.length - 1].id));
  else definirPropriedade(CHECKPOINT_DOS_RESUMOS, '');

  var texto = 'R.A.M.A. — reconstrução de resumos: ' + feitos + ' refeito(s)' +
    (antigas ? ', ' + antigas + ' ainda no formato antigo (migram na próxima gravação)' : '') +
    (ilegiveis ? ', ' + ilegiveis + ' que não se montam' : '') +
    (faltam > 0
      ? '. Faltam ' + faltam + ' — rode reconstruirResumos() de novo para continuar.'
      : '. Não falta nenhum.');

  console.log(texto);
  return texto;
}



/* ---------------------------------------------------------------------
   diagnosticarPersonagem(personagemId)
   Como uma ficha está guardada e se ela se monta. Diz formato,
   manifesto, gerações presentes e o resultado da conferência de cada uma
   que dá para conferir. NÃO imprime o conteúdo da ficha.
   --------------------------------------------------------------------- */
function diagnosticarPersonagem(personagemId) {
  reiniciarExecucao();
  var linhas = [];
  function diz(rotulo, valor) { linhas.push(rotulo + ': ' + valor); }

  var registro = acharPor(ABAS.PERSONAGENS, 'id', personagemId);
  if (!registro) {
    var nada = 'R.A.M.A. — diagnóstico: nenhum personagem com o id ' + personagemId + '.';
    console.log(nada);
    return nada;
  }

  diz('personagem', registro.nome + ' (' + registro.id + ')');
  diz('rev', registro.rev);

  var m = manifestoDe(registro.armazenamento);
  if (m === null) {
    diz('formato', 'antigo — a ficha inteira em fichaJson');
    var antigo = conteudoDoRegistro(registro);
    diz('leitura', antigo.ok ? 'ok, ' + antigo.tamanho + ' caracteres' : 'FALHOU — ' + antigo.motivo);
  } else if (m.invalido) {
    diz('formato', 'manifesto que esta versão não entende (' + m.motivo + ') — nada é lido nem gravado por cima');
  } else {
    diz('formato', 'blocos, versão ' + m.versao);
    diz('revisão do manifesto', m.rev + (Number(m.rev) === (Number(registro.rev) || 0) ? ''
      : ' — DIFERENTE da coluna rev (' + registro.rev + '): alguém gravou esta linha sem o servidor atual'));

    var conferir = [{ rotulo: 'geração ativa', manifesto: m }];
    if (m.anterior && m.anterior.geracao) {
      conferir.push({ rotulo: 'geração anterior', manifesto: Object.assign({ formato: m.formato, versao: m.versao }, m.anterior) });
    }
    conferir.forEach(function (c) {
      var id = String(registro.id);
      var r = lerGeracoes(ABAS.PERSONAGENS_BLOCOS, [{ id: id, manifesto: c.manifesto }])[id];
      var ficha = r && r.ok ? interpretarFicha(r.texto, 'blocos', c.manifesto) : null;
      diz(c.rotulo, c.manifesto.geracao + ' — ' + c.manifesto.blocos + ' bloco(s), ' + c.manifesto.tamanho +
        ' caracteres — ' + (ficha && ficha.ok ? 'CONFERE' : 'NÃO CONFERE (' + ((r && r.motivo) || (ficha && ficha.motivo)) + ')'));
    });

    var todas = geracoesDe(ABAS.PERSONAGENS_BLOCOS, registro.id);
    Object.keys(todas).forEach(function (g) {
      var info = todas[g];
      var papel = g === String(m.geracao) ? 'ativa' : (m.anterior && g === String(m.anterior.geracao) ? 'anterior' : 'sem manifesto (sai na limpeza)');
      diz('  linhas da geração ' + g, info.quantos + ' de ' + info.total + ', gravada em ' + info.criadoEm + ' — ' + papel);
    });
  }

  var texto = 'R.A.M.A. — diagnóstico de ficha\n\n' + linhas.join('\n');
  console.log(texto);
  return texto;
}

/* ---------------------------------------------------------------------
   restaurarGeracaoAnterior(personagemId, forcar)
   Faz a geração ANTERIOR voltar a valer — só depois de conferi-la
   inteira. Serve para a ficha cuja geração ativa não se monta (bloco
   apagado à mão, planilha restaurada pela metade). Com a ativa
   conferindo, recusa, a menos que `forcar` seja true: aí é desfazer a
   última gravação, de propósito.

   Nada é apagado: a geração ativa passa a ser a "anterior" do manifesto
   novo, e continua lá para quem quiser examiná-la. A revisão sobe, para
   uma ficha aberta noutro aparelho não gravar por cima sem conflito.
   --------------------------------------------------------------------- */
function restaurarGeracaoAnterior(personagemId, forcar) {
  reiniciarExecucao();

  var r = comTrava(function () {
    var registro = acharPor(ABAS.PERSONAGENS, 'id', personagemId);
    if (!registro) return { ok: false, texto: 'nenhum personagem com este id' };

    var m = manifestoDe(registro.armazenamento);
    if (!m || m.invalido) return { ok: false, texto: 'a ficha não está em blocos que esta versão entenda' };
    if (!m.anterior || !m.anterior.geracao) return { ok: false, texto: 'não há geração anterior guardada' };

    var id = String(registro.id);
    var atual = conteudoDoRegistro(registro);
    if (atual.ok && forcar !== true) {
      return { ok: false, texto: 'a geração ativa confere. Para desfazer a última gravação assim mesmo, ' +
        'rode restaurarGeracaoAnterior("' + id + '", true)' };
    }

    var anterior = Object.assign({ formato: m.formato, versao: m.versao }, m.anterior);
    var lida = lerGeracoes(ABAS.PERSONAGENS_BLOCOS, [{ id: id, manifesto: anterior }])[id];
    var ficha = lida && lida.ok ? interpretarFicha(lida.texto, 'blocos', anterior) : null;
    if (!ficha || !ficha.ok) {
      return { ok: false, texto: 'a geração anterior também não confere (' + ((lida && lida.motivo) || (ficha && ficha.motivo)) + '). ' +
        'Nada foi mudado. Recupere pela cópia exportada ou pelo histórico de versões da planilha.' };
    }

    var agora = new Date().toISOString();
    registro.rev = (Number(registro.rev) || 0) + 1;
    registro.atualizadoEm = agora;
    registro.armazenamento = JSON.stringify({
      formato: m.formato,
      versao: m.versao,
      geracao: anterior.geracao,
      blocos: anterior.blocos,
      tamanho: anterior.tamanho,
      hash: anterior.hash,
      rev: registro.rev,
      operacao: '',
      gravadoEm: agora,
      restauradaEm: agora,
      /* Onde a geração restaurada está, para a leitura ir direto. */
      local: anterior.local || null,
      anterior: { geracao: m.geracao, blocos: m.blocos, tamanho: m.tamanho, hash: m.hash,
                  rev: m.rev, gravadoEm: m.gravadoEm || '', local: m.local || null },
      /* A faixa reutilizável some: depois de uma restauração, a próxima
         gravação decide tudo de novo pelo índice. */
      reutilizavel: null,
    });

    /* A projeção do painel acompanha o conteúdo restaurado. Sem isto o
       cartão da mesa ficaria mostrando a gravação desfeita até alguém
       salvar a ficha. */
    registro.resumo = (typeof textoDaProjecao === 'function')
      ? textoDaProjecao(ficha.ficha, anterior.geracao, registro.rev)
      : '';

    atualizarLinha(ABAS.PERSONAGENS, registro._linha, registro);

    if (typeof marcarMesa === 'function' && registro.campanhaId) marcarMesa(registro.campanhaId, ['personagens', 'combates']);

    return { ok: true, texto: 'restaurada a geração ' + anterior.geracao + ' (' + anterior.tamanho +
      ' caracteres); rev ' + registro.rev + '. A geração que valia continua guardada como anterior.' };
  });

  var texto = 'R.A.M.A. — restauração de ficha: ' + (r.texto || ('a trava não foi obtida (' + r.erro + ')'));
  console.log(texto);
  return texto;
}

/* ---------------------------------------------------------------------
   diagnosticarLogin(usuario)
   Por que uma senha certa está sendo recusada.

   Rode no editor do Apps Script com o nome da conta. Ele NÃO imprime o
   hash, o salt nem o pepper: só diz se cada peça está no lugar e com a
   cara certa. É o que se pode publicar num chat de suporte sem entregar
   nada.
   --------------------------------------------------------------------- */
function diagnosticarLogin(usuario) {
  reiniciarExecucao();

  var login = String(usuario || '').trim().toLowerCase();
  var linhas = [];

  function diz(rotulo, valor) { linhas.push(rotulo + ': ' + valor); }

  if (typeof ABAS === 'undefined') {
    return 'Dados.gs não está no projeto. Nenhuma leitura funciona.';
  }

  diz('RAMA_PEPPER definido', propriedade('RAMA_PEPPER', '') ? 'sim' : 'NÃO — rode gerarPepper()');
  diz('RAMA_ITERACOES', propriedade('RAMA_ITERACOES', '10000 (padrão)'));

  var ilegiveis = colunasIlegiveis(ABAS.USUARIOS);
  var recuperadas = colunasRecuperadas(ABAS.USUARIOS);
  diz('colunas ilegíveis em USUARIOS', ilegiveis.length ? ilegiveis.join(', ') : 'nenhuma');
  diz('colunas lidas pela posição', recuperadas.length ? recuperadas.join(', ') : 'nenhuma');

  if (!login) {
    linhas.push('');
    linhas.push('Passe o nome da conta para conferir a linha dela: diagnosticarLogin("luky")');
    var texto0 = linhas.join('\n');
    console.log(texto0);
    return texto0;
  }

  var registro = acharPor(ABAS.USUARIOS, 'usuario', login);

  if (!registro) {
    diz('conta "' + login + '"', 'NÃO encontrada na aba USUARIOS');
    var nomes = lerTudo(ABAS.USUARIOS).map(function (u) { return String(u.usuario); });
    diz('contas que existem', nomes.length ? nomes.join(', ') : 'nenhuma');
    var texto1 = linhas.join('\n');
    console.log(texto1);
    return texto1;
  }

  diz('conta "' + login + '"', 'encontrada na linha ' + registro._linha);
  diz('ativo', String(registro.ativo) === 'true' ? 'sim' : 'NÃO — a conta está desativada');
  diz('tamanho do hash', String(registro.hashSenha || '').length + ' (o esperado é 64)');
  diz('tamanho do salt', String(registro.salt || '').length + ' (o esperado é 32)');
  diz('iterações da linha', String(registro.iteracoes || '(vazio, usa a propriedade)'));

  /* A prova final: derivar com a senha guardada não dá para fazer, mas
     dá para conferir que a derivação RODA e devolve um hash do tamanho
     certo. Se isto falhar, o problema é o pepper ou o salt, não a
     senha que alguém digitou. */
  try {
    var teste = derivarSenha('conferindo-a-derivacao', registro.salt,
      Number(registro.iteracoes) || Number(propriedade('RAMA_ITERACOES', '10000')));
    diz('a derivação roda', teste.length === 64 ? 'sim' : 'devolveu ' + teste.length + ' caracteres');
  } catch (erro) {
    diz('a derivação roda', 'NÃO — ' + erro.message);
  }

  var texto = linhas.join('\n');
  console.log(texto);
  return texto;
}

/* ---------------------------------------------------------------------
   medirDerivacao()
   Quanto tempo a derivação da senha leva com as iterações atuais. Use
   para escolher RAMA_ITERACOES: o alvo razoável é algo entre 300 ms e
   1,5 s. Menos que isso protege pouco; mais que isso irrita quem entra.
   --------------------------------------------------------------------- */
function medirDerivacao() {
  reiniciarExecucao();
  var iteracoes = Number(propriedade('RAMA_ITERACOES', '10000'));
  var inicio = Date.now();
  derivarSenha('medindo-o-tempo', novoSegredo().slice(0, 32), iteracoes);
  var levou = Date.now() - inicio;

  var texto = iteracoes + ' iterações levaram ' + levou + ' ms.';
  console.log(texto);
  return texto;
}

function cadastrarNovoUsuario() {
  return criarUsuario(
    'usuario',
    'mostrado',
    'senha'
  );
}

function realTrocarSenha() {
  return trocarSenha(
    'usuario',
    'novaSenha'
  )
}

/* =====================================================================
   TEMAS DE DADOS E CÓDIGOS DE RESGATE (v2.40)
   ---------------------------------------------------------------------
   A conta POSSUI temas de dados; o personagem ESCOLHE um; o
   desenvolvedor CRIA os temas (js/temas-dados.js, copiado no fim deste
   arquivo) e os códigos (aqui, pelo editor do Apps Script).

     resgatar_codigo { codigo, operacaoId }
         a única porta que concede. A conta é a da sessão; o navegador
         não manda lista de nada. Um código vale uma vez por conta (e
         para quantas contas o desenvolvedor quiser); dois códigos que
         dão o mesmo tema não duplicam a coleção. A MESMA operação
         chegando de novo (a resposta se perdeu) devolve a concessão que
         ela já fez. Dentro da trava: dois pedidos ao mesmo tempo não
         concedem duas vezes.
     listar_desbloqueios
         os temas desta conta.

   O CÓDIGO
   ---------------------------------------------------------------------
   Normalizado como em RAMATemasDados.normalizarCodigo (NFKC, sem
   espaços/hífens/pontos/sublinhados, maiúsculas, A–Z e 0–9, 4 a 40) e
   guardado só como SHA-256(RAMA_PEPPER + "|codigo-resgate|" + código).
   A planilha não tem o código em texto; o rótulo ("NE…26 (8)") é só para
   o desenvolvedor reconhecer qual é qual.

   O FREIO
   ---------------------------------------------------------------------
   Código errado ou desativado conta uma falha da conta no CacheService
   (como o freio do login). Com 10 em 15 minutos, o resgate responde
   `muitas_tentativas` até a janela passar. Um resgate certo zera a
   conta.

   ADMINISTRAÇÃO (rode no editor do Apps Script, nunca pelo site)
   ---------------------------------------------------------------------
     cadastrarCodigo('NEON-2026', ['sigilo-violeta'], 'live de outubro')
     desativarCodigo('NEON-2026')   novos resgates param; quem já
                                    resgatou continua com o tema
     reativarCodigo('NEON-2026')
     listarCodigos()                rótulos, recompensas, estado e
                                    quantos resgates — sem o código
   ===================================================================== */

var MAX_FALHAS_RESGATE = 10;
var MINUTOS_FREIO_RESGATE = 15;
var SEGUNDOS_CACHE_DESBLOQUEIOS = 21600;

function chaveDosDesbloqueios(userId) { return 'rama.desbloqueios.' + userId; }
function chaveDoFreioDeResgate(userId) { return 'rama.resgate.falhas.' + userId; }

/* Lidos da planilha, sem cache: [{ id, concedidoEm }]. */
function desbloqueiosLidos(userId) {
  var uid = String(userId || '');
  return lerTudo(ABAS.DESBLOQUEIOS).filter(function (r) {
    return String(r.userId) === uid && String(r.tipo) === 'temaDados';
  }).map(function (r) {
    return { id: String(r.recompensaId), concedidoEm: String(r.concedidoEm || '') };
  });
}

/* Os temas de dados de uma conta, pelo cache quando ele ajuda. Sem a aba
   (setupRama desta versão ainda não rodou), nenhum. */
function desbloqueiosDe(userId) {
  var uid = String(userId || '');
  if (!uid) return [];
  var guardado = cacheLer(chaveDosDesbloqueios(uid));
  if (guardado) {
    var lista = lerJson(guardado, null);
    if (Array.isArray(lista)) return lista;
  }
  var lidos;
  try { lidos = desbloqueiosLidos(uid); } catch (erro) { return []; }
  cacheGravar(chaveDosDesbloqueios(uid), JSON.stringify(lidos), SEGUNDOS_CACHE_DESBLOQUEIOS);
  return lidos;
}

function temTemaDeDados(userId, temaId) {
  var id = String(temaId || '');
  return !!id && desbloqueiosDe(userId).some(function (d) { return d.id === id; });
}

/* A escolha de tema de dados que a ficha traz: só fica se a conta DONA
   a tem. Um tema que saiu do catálogo mas foi desbloqueado continua (a
   tela usa a reserva); um que a conta não tem sai, com aviso. */
function conferirTemaDosDados(ficha, donoId) {
  var ap = ficha && ficha.aparencia;
  var sel = ap && typeof ap === 'object' ? RAMATemasDados.normalizarSelecao(ap.dados) : null;
  if (!sel) { if (ap && typeof ap === 'object') delete ap.dados; return null; }
  if (temTemaDeDados(donoId, sel.id)) { ap.dados = sel; return null; }
  delete ap.dados;
  return 'tema_dados_indisponivel';
}

/* A aparência que uma rolagem traz: a forma pelo catálogo e o tema só se
   a conta dona da escolha o tem (o dono do personagem, ou quem rolou). */
function conferirAparenciaDaRolagem(bruta, donoId) {
  var ap = RAMATemasDados.normalizarAparenciaDaRolagem(bruta);
  if (!ap) return null;
  if (ap.tema && !temTemaDeDados(donoId, ap.tema.id)) delete ap.tema;
  return ap.tema || ap.padrao ? ap : null;
}

function hashDoCodigo(codigoNormalizado) {
  var pepper = propriedade('RAMA_PEPPER', '');
  if (!pepper) throw new Error('RAMA_PEPPER não definido. Rode gerarPepper() uma vez.');
  return sha256Hex(pepper + '|codigo-resgate|' + codigoNormalizado);
}

function rotuloDoCodigo(normal) {
  return normal.slice(0, 2) + '…' + normal.slice(-2) + ' (' + normal.length + ')';
}

/* As recompensas de um código que o catálogo deste servidor conhece. */
function recompensasDoCodigo(registro) {
  var lista = lerJson(registro && registro.recompensasJson, []);
  if (!Array.isArray(lista)) return [];
  var vistas = {};
  return lista.map(String).filter(function (id) {
    if (vistas[id] || !RAMATemasDados.tema(id)) return false;
    vistas[id] = true;
    return true;
  });
}

function descreverRecompensas(ids, possuidas) {
  return ids.map(function (id) {
    var t = RAMATemasDados.tema(id);
    return { tipo: 'temaDados', id: id, nome: t ? t.nome : id, novo: !!(possuidas && possuidas[id]) };
  });
}

function freioDoResgate(userId) {
  var n = Number(cacheLer(chaveDoFreioDeResgate(userId))) || 0;
  return n >= MAX_FALHAS_RESGATE ? { ok: false, erro: 'muitas_tentativas', minutos: MINUTOS_FREIO_RESGATE } : null;
}
function anotarFalhaDeResgate(userId) {
  var chave = chaveDoFreioDeResgate(userId);
  var n = (Number(cacheLer(chave)) || 0) + 1;
  cacheGravar(chave, String(n), MINUTOS_FREIO_RESGATE * 60);
}

function acaoResgatarCodigo(corpo, usuario) {
  var operacao = String(corpo.operacaoId || '');
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(operacao)) return { ok: false, erro: 'dados_invalidos' };

  var freio = freioDoResgate(usuario.id);
  if (freio) return freio;

  var codigo = RAMATemasDados.normalizarCodigo(corpo.codigo);
  if (!codigo) {
    anotarFalhaDeResgate(usuario.id);
    return { ok: false, erro: 'codigo_invalido' };
  }
  try {
    aba(ABAS.CODIGOS_RESGATE); aba(ABAS.RESGATES); aba(ABAS.DESBLOQUEIOS);
  } catch (erro) {
    return { ok: false, erro: 'instalacao_incompleta', detalhe: 'CODIGOS_RESGATE' };
  }
  var hash;
  try { hash = hashDoCodigo(codigo); } catch (erro) { return { ok: false, erro: 'instalacao_incompleta', detalhe: 'RAMA_PEPPER' }; }

  return comTrava(function () {
    var registro = acharPor(ABAS.CODIGOS_RESGATE, 'codigoHash', hash);
    if (!registro) {
      anotarFalhaDeResgate(usuario.id);
      return { ok: false, erro: 'codigo_invalido' };
    }

    var uid = String(usuario.id);
    var feito = lerTudo(ABAS.RESGATES).filter(function (r) {
      return String(r.userId) === uid && String(r.codigoId) === String(registro.id);
    })[0];
    if (feito) {
      var concedidas = lerJson(feito.recompensasJson, []);
      /* A MESMA operação de novo: a resposta da primeira se perdeu. */
      if (String(feito.operacaoId) === operacao) {
        return { ok: true, repetida: true, dados: { recompensas: Array.isArray(concedidas) ? concedidas : [], desbloqueios: desbloqueiosLidos(uid) } };
      }
      return { ok: false, erro: 'ja_resgatado', dados: { recompensas: Array.isArray(concedidas) ? concedidas : [] } };
    }

    var ativo = registro.ativo === true || String(registro.ativo) === 'true';
    var recompensas = recompensasDoCodigo(registro);
    if (!ativo || !recompensas.length) {
      anotarFalhaDeResgate(usuario.id);
      return { ok: false, erro: 'codigo_desativado' };
    }

    /* Lidos de novo DENTRO da trava: o cache pode estar um passo atrás de
       um resgate que acabou de terminar. */
    var possuidas = {};
    desbloqueiosLidos(uid).forEach(function (d) { possuidas[d.id] = true; });
    var agora = new Date().toISOString();
    var novas = {};
    recompensas.forEach(function (id) {
      if (possuidas[id]) return;
      inserir(ABAS.DESBLOQUEIOS, { id: novoId(), userId: uid, tipo: 'temaDados', recompensaId: id, origemCodigoId: registro.id, concedidoEm: agora });
      novas[id] = true;
      possuidas[id] = true;
    });
    var descricao = descreverRecompensas(recompensas, novas);
    inserir(ABAS.RESGATES, { id: novoId(), userId: uid, codigoId: registro.id, operacaoId: operacao, criadoEm: agora, recompensasJson: JSON.stringify(descricao) });

    cacheApagar(chaveDosDesbloqueios(uid));
    cacheApagar(chaveDoFreioDeResgate(uid));
    return { ok: true, dados: { recompensas: descricao, desbloqueios: desbloqueiosLidos(uid) } };
  });
}

function acaoListarDesbloqueios(corpo, usuario) {
  return { ok: true, dados: { temasDados: desbloqueiosDe(usuario.id) } };
}

/* ---------------------------------------------------------------------
   ADMINISTRAÇÃO DOS CÓDIGOS — editor do Apps Script
   ---------------------------------------------------------------------
   Não estão no roteamento: o site não alcança nenhuma destas funções. */

function codigoDoAdministrador(codigo) {
  var normal = RAMATemasDados.normalizarCodigo(codigo);
  if (!normal) throw new Error('Código inválido: use de 4 a 40 letras e números (espaços, hífens, pontos e sublinhados são ignorados; maiúsculas e minúsculas, iguais).');
  try { aba(ABAS.CODIGOS_RESGATE); } catch (erro) { throw new Error('Falta a aba CODIGOS_RESGATE: rode setupRama() primeiro.'); }
  return normal;
}

function cadastrarCodigo(codigo, temas, nota) {
  reiniciarExecucao();
  var normal = codigoDoAdministrador(codigo);
  var lista = [].concat(temas || []).map(String).filter(Boolean);
  var desconhecidos = lista.filter(function (id) { return !RAMATemasDados.tema(id); });
  if (!lista.length) throw new Error('Diga ao menos um tema: cadastrarCodigo("CODIGO", ["id-do-tema"]).');
  if (desconhecidos.length) throw new Error('Temas fora do catálogo (js/temas-dados.js): ' + desconhecidos.join(', '));
  var hash = hashDoCodigo(normal);
  var msg = comTrava(function () {
    var agora = new Date().toISOString();
    var existente = acharPor(ABAS.CODIGOS_RESGATE, 'codigoHash', hash);
    if (existente) {
      existente.recompensasJson = JSON.stringify(lista);
      existente.ativo = true;
      existente.atualizadoEm = agora;
      if (nota !== undefined) existente.nota = String(nota || '').slice(0, 200);
      atualizarLinha(ABAS.CODIGOS_RESGATE, existente._linha, existente);
      return 'Código ' + existente.rotulo + ' atualizado e ativo: ' + lista.join(', ') + '.';
    }
    var rotulo = rotuloDoCodigo(normal);
    inserir(ABAS.CODIGOS_RESGATE, { id: novoId(), codigoHash: hash, rotulo: rotulo, recompensasJson: JSON.stringify(lista),
      ativo: true, criadoEm: agora, atualizadoEm: agora, nota: String(nota || '').slice(0, 200) });
    return 'Código ' + rotulo + ' cadastrado: ' + lista.join(', ') + '.';
  });
  console.log(msg);
  return msg;
}

function mudarCodigo(codigo, ativo) {
  reiniciarExecucao();
  var hash = hashDoCodigo(codigoDoAdministrador(codigo));
  var msg = comTrava(function () {
    var existente = acharPor(ABAS.CODIGOS_RESGATE, 'codigoHash', hash);
    if (!existente) return 'Código não encontrado.';
    existente.ativo = !!ativo;
    existente.atualizadoEm = new Date().toISOString();
    atualizarLinha(ABAS.CODIGOS_RESGATE, existente._linha, existente);
    return 'Código ' + existente.rotulo + (ativo ? ' reativado.' : ' desativado. Quem já resgatou continua com as recompensas.');
  });
  console.log(msg);
  return msg;
}
function desativarCodigo(codigo) { return mudarCodigo(codigo, false); }
function reativarCodigo(codigo) { return mudarCodigo(codigo, true); }

function listarCodigos() {
  reiniciarExecucao();
  var resgates = {};
  try { lerTudo(ABAS.RESGATES).forEach(function (r) { resgates[r.codigoId] = (resgates[r.codigoId] || 0) + 1; }); } catch (erro) { /* sem aba */ }
  var linhas = lerTudo(ABAS.CODIGOS_RESGATE).map(function (c) {
    var ativo = c.ativo === true || String(c.ativo) === 'true';
    return c.rotulo + ' · ' + (ativo ? 'ativo' : 'desativado') + ' · ' + lerJson(c.recompensasJson, []).join(', ') +
      ' · ' + (resgates[c.id] || 0) + ' resgate(s)' + (c.nota ? ' · ' + c.nota : '');
  });
  console.log(linhas.join('\n') || 'Nenhum código cadastrado.');
  return linhas;
}

/* >>> js/temas-dados.js */
/* =====================================================================
   R.A.M.A. — temas de dados (v2.40)
   =====================================================================
   O catálogo dos temas de dados e as regras puras que valem igual no
   navegador e no Apps Script (este arquivo é copiado dentro do
   backend/Codigo.gs, entre os marcadores >>> e <<<; um teste confere).

   Três responsabilidades, que não se misturam:

     a conta         POSSUI os temas desbloqueados (aba DESBLOQUEIOS,
                     escrita só pelo resgate de código no servidor)
     o personagem    ESCOLHE qual usar nas próprias rolagens
                     (ficha.aparencia.dados = { id })
     o desenvolvedor CRIA os temas — aqui, com os assets em
                     assets/dados/ — e os códigos, na configuração
                     privada do backend (cadastrarCodigo no Apps Script)

   Nenhum código de resgate mora aqui: este arquivo é público.

   ---------------------------------------------------------------------
   O CONTRATO DE UM TEMA
   ---------------------------------------------------------------------

     id        estável, minúsculas e hífen; nunca muda
     nome, descricao
     versoes   cada versão é imutável: uma rolagem antiga guarda id e
               versão e continua sendo desenhada como era. Arte nova =
               versão nova, numa pasta nova (…/v2/)

   Cada versão:

     previa       a imagem pronta para listas (já recortada)
     dado
       mascara    a silhueta: alfa vale, cor não (assets/dados/mascaras/)
       base       a arte de baixo, quadrada (1:1)
       camadas    em ordem; { imagem, opacidade (0–1), recortar }
                  recortar: true  → no grupo da base, sob a máscara
                  recortar: false → por cima, fora do recorte, mas presa
                                    à mesma tela quadrada (não vaza)
     notificacao
       fundo        uma imagem inteira, de proporção livre
       ajusteFundo  { modo: "zoom-pela-altura", alinhamentoHorizontal }
                    a imagem é escalada pela ALTURA do cartão
                    (background-size: auto 100%), sem repetir e sem
                    cortar topo ou base; 0 = esquerda, 0.5 = centro
       cores        legibilidade do cartão (hexadecimais)
       veu          { cor, alfa } opcional: uma película sobre o fundo

   Todas as imagens do dado usam a MESMA tela quadrada e a mesma origem
   (o modelo usa 1024 × 1024). Caminhos só dentro de assets/dados/.
   ===================================================================== */

(function (global) {
  "use strict";

  var VERSAO_CONTRATO = 1;
  var ID = /^[a-z0-9][a-z0-9-]{0,39}$/;
  var CAMINHO = /^assets\/dados\/[a-z0-9][a-z0-9/_.-]{0,200}\.(png|webp|svg|jpg|jpeg|avif)$/;
  var MAX_CAMADAS = 8;
  var MODOS_DE_FUNDO = ["zoom-pela-altura"];

  /* As cores que o cartão usa, na ordem em que a tela as lê. São estas, e
     só estas, que uma rolagem com o dado padrão leva para os outros. */
  var CORES = ["superficie", "texto", "texto2", "texto3", "tracoForte", "tracoMedia", "tracoFraca",
    "selecao", "selecaoTexto", "paranormal", "erro", "aviso"];

  /* =================================================================
     O CATÁLOGO
     ================================================================= */

  var BRUTO = [
    {
      id: "modelo-tecnico",
      nome: "Modelo técnico",
      descricao: "O exemplo do kit: base cinza, facetas claras e o fundo com as linhas de topo e base.",
      versoes: [{
        versao: 1,
        previa: "assets/dados/temas/modelo-tecnico/v1/previa.png",
        dado: {
          mascara: "assets/dados/mascaras/d20-v1.svg",
          base: "assets/dados/temas/modelo-tecnico/v1/base.png",
          camadas: [
            { imagem: "assets/dados/temas/modelo-tecnico/v1/facetas.png", opacidade: 1, recortar: true },
          ],
        },
        notificacao: {
          fundo: "assets/dados/temas/modelo-tecnico/v1/fundo.png",
          ajusteFundo: { modo: "zoom-pela-altura", alinhamentoHorizontal: 0.5 },
          cores: {
            superficie: "#121216", texto: "#ffffff", texto2: "#d4d4dd", texto3: "#b4b4c0",
            tracoForte: "#e8e0f5", tracoMedia: "#8240c6", tracoFraca: "#4c3a66",
            selecao: "#d4d4dd", selecaoTexto: "#121216",
            paranormal: "#b98cf0", erro: "#e0675c", aviso: "#e2c15a",
          },
          veu: { cor: "#121216", alfa: 0.25 },
        },
      }],
    },
    {
      id: "sigilo-violeta",
      nome: "Sigilo Violeta",
      descricao: "Violeta com um sigilo gravado no dado, faíscas em volta e linhas de néon no fundo.",
      versoes: [{
        versao: 1,
        previa: "assets/dados/temas/sigilo-violeta/v1/previa.png",
        dado: {
          mascara: "assets/dados/mascaras/d20-v1.svg",
          base: "assets/dados/temas/sigilo-violeta/v1/base.png",
          camadas: [
            { imagem: "assets/dados/temas/sigilo-violeta/v1/facetas.png", opacidade: 0.8, recortar: true },
            { imagem: "assets/dados/temas/sigilo-violeta/v1/sigilo.png", opacidade: 1, recortar: true },
            { imagem: "assets/dados/temas/sigilo-violeta/v1/faiscas.png", opacidade: 1, recortar: false },
          ],
        },
        notificacao: {
          fundo: "assets/dados/temas/sigilo-violeta/v1/fundo.png",
          ajusteFundo: { modo: "zoom-pela-altura", alinhamentoHorizontal: 0.5 },
          cores: {
            superficie: "#1a0f2a", texto: "#ffffff", texto2: "#e6dcf5", texto3: "#c3b4dc",
            tracoForte: "#f0e6ff", tracoMedia: "#a066f0", tracoFraca: "#5a3c82",
            selecao: "#e6dcf5", selecaoTexto: "#1a0f2a",
            paranormal: "#c89bff", erro: "#ff7a6e", aviso: "#f0cf6a",
          },
          veu: { cor: "#140a20", alfa: 0.3 },
        },
      }],
    },
  ];

  /* =================================================================
     CONFERÊNCIA
     ================================================================= */

  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : null; }
  function texto(v, n) { return String(v === undefined || v === null ? "" : v).replace(/[\u0000-\u001F<>]/g, "").trim().slice(0, n || 80); }

  /* "#abc" ou "#aabbcc", em minúsculas e com seis dígitos. */
  function cor(v) {
    var s = String(v || "").trim().toLowerCase();
    if (/^#[0-9a-f]{3}$/.test(s)) return "#" + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
    return /^#[0-9a-f]{6}$/.test(s) ? s : "";
  }
  function fracao(v, padrao) {
    var n = Number(v);
    return isFinite(n) ? Math.max(0, Math.min(1, Math.round(n * 1000) / 1000)) : padrao;
  }
  function caminho(v) {
    var s = String(v || "");
    return CAMINHO.test(s) && s.indexOf("..") < 0 && s.indexOf("//") < 0 ? s : "";
  }

  function normalizarCores(bruto) {
    var b = obj(bruto) || {};
    var saida = {};
    CORES.forEach(function (k) { var c = cor(b[k]); if (c) saida[k] = c; });
    return saida;
  }

  /* Uma versão como o desenvolvedor a escreveu → a versão conferida, ou
     null com o motivo em `problemas`. */
  function normalizarVersao(v, problemas, rotulo) {
    var b = obj(v);
    if (!b) { problemas.push(rotulo + ": versão inválida"); return null; }
    var n = Math.round(Number(b.versao));
    if (!(n >= 1 && n <= 999)) { problemas.push(rotulo + ": número de versão inválido"); return null; }
    var dado = obj(b.dado) || {};
    var base = caminho(dado.base);
    var mascara = caminho(dado.mascara);
    if (!base || !mascara) { problemas.push(rotulo + " v" + n + ": base e máscara precisam de caminho em assets/dados/"); return null; }
    var camadas = (Array.isArray(dado.camadas) ? dado.camadas : []).map(function (c, i) {
      var cc = obj(c) || {};
      var img = caminho(cc.imagem);
      if (!img) { problemas.push(rotulo + " v" + n + ": camada " + (i + 1) + " sem caminho válido"); return null; }
      return { imagem: img, opacidade: fracao(cc.opacidade, 1), recortar: cc.recortar !== false };
    }).filter(Boolean);
    if (camadas.length > MAX_CAMADAS) { problemas.push(rotulo + " v" + n + ": mais de " + MAX_CAMADAS + " camadas"); return null; }
    var notif = obj(b.notificacao) || {};
    var ajuste = obj(notif.ajusteFundo) || {};
    var modo = MODOS_DE_FUNDO.indexOf(ajuste.modo) >= 0 ? ajuste.modo : "zoom-pela-altura";
    var cores = normalizarCores(notif.cores);
    if (!cores.superficie || !cores.texto) { problemas.push(rotulo + " v" + n + ": as cores precisam ao menos de superficie e texto"); return null; }
    var veu = obj(notif.veu);
    return {
      versao: n,
      previa: caminho(b.previa),
      dado: { base: base, mascara: mascara, camadas: camadas },
      notificacao: {
        fundo: caminho(notif.fundo),
        ajusteFundo: { modo: modo, alinhamentoHorizontal: fracao(ajuste.alinhamentoHorizontal, 0.5) },
        cores: cores,
        veu: veu && cor(veu.cor) ? { cor: cor(veu.cor), alfa: fracao(veu.alfa, 0) } : null,
      },
    };
  }

  function normalizarTema(t, problemas) {
    var b = obj(t);
    var lista = problemas || [];
    if (!b || !ID.test(String(b.id || ""))) { lista.push("tema sem id válido"); return null; }
    var versoes = (Array.isArray(b.versoes) ? b.versoes : []).map(function (v) { return normalizarVersao(v, lista, b.id); }).filter(Boolean);
    var vistas = {};
    versoes = versoes.filter(function (v) { if (vistas[v.versao]) { lista.push(b.id + ": versão " + v.versao + " repetida"); return false; } vistas[v.versao] = true; return true; });
    if (!versoes.length) { lista.push(b.id + ": nenhuma versão válida"); return null; }
    versoes.sort(function (x, y) { return x.versao - y.versao; });
    return { id: b.id, nome: texto(b.nome, 60) || b.id, descricao: texto(b.descricao, 240), versoes: versoes };
  }

  var PROBLEMAS = [];
  var CATALOGO = [];
  var POR_ID = {};
  BRUTO.forEach(function (t) {
    var n = normalizarTema(t, PROBLEMAS);
    if (!n || POR_ID[n.id]) return;
    POR_ID[n.id] = n;
    CATALOGO.push(n);
  });

  /* =================================================================
     CONSULTAS
     ================================================================= */

  function tema(id) { return POR_ID[String(id || "")] || null; }
  function versaoDe(id, n) {
    var t = tema(id);
    if (!t) return null;
    var alvo = Math.round(Number(n));
    for (var i = 0; i < t.versoes.length; i++) if (t.versoes[i].versao === alvo) return t.versoes[i];
    return null;
  }
  function atual(id) {
    var t = tema(id);
    return t ? { id: t.id, versao: t.versoes[t.versoes.length - 1].versao } : null;
  }
  function conhecido(id, n) { return !!versaoDe(id, n); }
  function lista() { return CATALOGO.slice(); }

  /* =================================================================
     A ESCOLHA DO PERSONAGEM — ficha.aparencia.dados
     -----------------------------------------------------------------
     Só a forma do id: um tema que saiu do catálogo (ou que ainda não
     chegou a este navegador) NÃO apaga a escolha gravada — a tela usa a
     reserva e diz isso.
     ================================================================= */

  function normalizarSelecao(bruto) {
    var b = obj(bruto);
    var id = b ? String(b.id || "") : "";
    return ID.test(id) ? { id: id } : null;
  }

  /* =================================================================
     O CÓDIGO DE RESGATE
     -----------------------------------------------------------------
     Antes de comparar: forma de compatibilidade Unicode (NFKC), sem
     espaços, hífens, pontos ou sublinhados, e em maiúsculas. Assim
     "neon-2026", " NEON 2026 " e "Neon_2026" são o mesmo código.
     Sobra só A–Z e 0–9, de 4 a 40 caracteres; fora disso, inválido.
     ================================================================= */

  function normalizarCodigo(bruto) {
    var s = String(bruto === undefined || bruto === null ? "" : bruto);
    if (s.length > 200) return "";
    if (typeof s.normalize === "function") s = s.normalize("NFKC");
    s = s.replace(/[\s\-_.]+/g, "").toUpperCase();
    return /^[A-Z0-9]{4,40}$/.test(s) ? s : "";
  }

  /* =================================================================
     A APARÊNCIA DE UMA ROLAGEM — guardada com o resultado
     -----------------------------------------------------------------
       { v: 1, tema: { id, versao }, padrao: { cores… } }

     `tema` só com id e versão do catálogo (nunca caminho, CSS ou URL);
     `padrao` só com as cores conhecidas, em hexadecimal. O servidor
     confere ainda se a conta dona da escolha tem o tema desbloqueado.
     ================================================================= */

  function normalizarAparenciaDaRolagem(bruto) {
    var b = obj(bruto);
    if (!b) return null;
    var saida = { v: VERSAO_CONTRATO };
    var t = obj(b.tema);
    if (t && conhecido(t.id, t.versao)) saida.tema = { id: String(t.id), versao: Math.round(Number(t.versao)) };
    var p = normalizarCores(b.padrao);
    if (Object.keys(p).length) saida.padrao = p;
    return saida.tema || saida.padrao ? saida : null;
  }

  global.RAMATemasDados = {
    VERSAO_CONTRATO: VERSAO_CONTRATO,
    CORES: CORES,
    MAX_CAMADAS: MAX_CAMADAS,
    PROBLEMAS: PROBLEMAS,
    lista: lista,
    tema: tema,
    versao: versaoDe,
    atual: atual,
    conhecido: conhecido,
    normalizarTema: normalizarTema,
    normalizarSelecao: normalizarSelecao,
    normalizarCodigo: normalizarCodigo,
    normalizarAparenciaDaRolagem: normalizarAparenciaDaRolagem,
    cor: cor,
  };
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
/* <<< js/temas-dados.js */
