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

    var acao = String(corpo.acao || '');
    var rota = rotaDe(acao);
    if (!rota) return responder({ ok: false, erro: 'acao_desconhecida' });

    /* Login e ping são as únicas portas abertas. Todo o resto exige
       uma sessão que o servidor reconheça — e a identidade sai dela,
       nunca do que o pedido afirma ser. */
    if (rota.publica) return responder(rota.fn(corpo, null));

    var sessao = validarSessao(corpo.token);
    if (!sessao.ok) return responder({ ok: false, erro: sessao.erro });

    return responder(rota.fn(corpo, sessao.usuario));
  } catch (erro) {
    /* A mensagem interna vai para o log do Apps Script; o cliente
       recebe um código, não a pilha de execução. */
    console.error('R.A.M.A. falhou: ' + (erro && erro.stack ? erro.stack : erro));
    return responder({ ok: false, erro: 'servidor_falhou' });
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

function responder(objeto) {
  return ContentService
    .createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
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

  ler_foto:              { publica: false, fn: acaoLerFoto },
  salvar_foto:           { publica: false, fn: acaoSalvarFoto },

  listar_homebrew:       { publica: false, fn: acaoListarHomebrew },
  ler_homebrew:          { publica: false, fn: acaoLerHomebrew },
  salvar_homebrew:       { publica: false, fn: acaoSalvarHomebrew },
  excluir_homebrew:      { publica: false, fn: acaoExcluirHomebrew },

  ler_imagem_criatura:   { publica: false, fn: acaoLerImagemCriatura },
  salvar_imagem_criatura:{ publica: false, fn: acaoSalvarImagemCriatura },

  ler_perfil:            { publica: false, fn: acaoLerPerfil },
  salvar_perfil:         { publica: false, fn: acaoSalvarPerfil },

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
    avatar: (perfil && perfil.avatar) || '',
  };
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

  /* As fotos são o campo mais pesado da planilha inteira, e esta tela
     precisa das do usuário — não das de todo mundo.

     Antes, a aba de fotos era lida inteira e filtrada depois: sessenta
     imagens em base64 atravessavam o serviço do Sheets para três
     aparecerem na tela. Agora a varredura leva só as duas colunas de
     identificação, e as imagens são buscadas pelas linhas que
     sobraram. */
  var minhasFotos = lerLeves(ABAS.PERSONAGENS_FOTOS).filter(function (f) {
    return String(f.ownerId) === String(usuario.id);
  });

  var imagens = lerCelulas(ABAS.PERSONAGENS_FOTOS, minhasFotos, 'imagem');

  var fotos = {};
  minhasFotos.forEach(function (f) { fotos[f.personagemId] = imagens[f._linha] || ''; });

  /* A listagem devolve o cabeçalho de cada ficha, nunca o fichaJson.
     Trinta fichas completas para desenhar trinta nomes seriam
     megabytes por tela — e agora nem chegam a ser lidas da planilha. */
  var lista = lerLeves(ABAS.PERSONAGENS)
    .filter(function (p) { return meu(p, usuario); })
    .map(function (p) {
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
        foto: fotos[p.id] || '',
      };
    })
    .sort(function (a, b) { return String(b.atualizadoEm).localeCompare(String(a.atualizadoEm)); });

  return { ok: true, dados: lista };
}

function acaoLerPersonagem(corpo, usuario) {
  var acesso = personagemAcessivel(corpo.personagemId, usuario);
  if (!acesso.ok) return acesso;

  return {
    ok: true,
    rev: Number(acesso.personagem.rev) || 0,
    /* Quem abriu precisa saber se está como dono ou como mestre: a
       tela mostra um aviso e esconde o que é do dono. A decisão de
       permissão já foi tomada aqui; isto é só o rótulo. */
    dono: acesso.dono,
    mestre: acesso.mestre,
    dados: lerJson(acesso.personagem.fichaJson, {}),
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

  var pv = numero(bruto.pv, false);
  var pe = numero(bruto.pe, false);
  var san = numero(bruto.san, true);
  if (pv === undefined || pe === undefined || san === undefined) return null;

  return { versao: 1, pv: pv, pe: pe, san: san };
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

function acaoCriarPersonagem(corpo, usuario) {
  var ficha = corpo.dados;
  if (!ficha || typeof ficha !== 'object') return { ok: false, erro: 'dados_invalidos' };

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

  if (JSON.stringify(ficha).length > MAX_CELULA) return { ok: false, erro: 'dados_grandes' };

  return comTrava(function () {
    /* A campanha que o servidor aceitou é a que vai para dentro da
       ficha também — ver acaoSalvarPersonagem. */
    var campanhaId = campanhaValida(ficha.campanhaId, usuario);
    ficha.campanhaId = campanhaId || null;
    var json = JSON.stringify(ficha);
    if (json.length > MAX_CELULA) return { ok: false, erro: 'dados_grandes' };

    inserir(ABAS.PERSONAGENS, {
      id: id,
      ownerId: usuario.id,
      nome: String(ficha.nome || 'Sem nome').slice(0, 120),
      campanhaId: campanhaId,
      classe: String(ficha.classe || '').slice(0, 80),
      origem: String(ficha.origem || '').slice(0, 80),
      criadoEm: agora,
      atualizadoEm: agora,
      rev: 1,
      fichaJson: json,
    });
    avisarMesas([campanhaId], ['personagens']);
    return { ok: true, rev: 1, dados: { id: id } };
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
  if (!ficha || typeof ficha !== 'object') return { ok: false, erro: 'dados_invalidos' };

  if (JSON.stringify(ficha).length > MAX_CELULA) return { ok: false, erro: 'dados_grandes' };

  return comTrava(function () {
    var acesso = personagemAcessivel(corpo.personagemId, usuario);
    if (!acesso.ok) return acesso;
    var registro = acesso.personagem;

    var revAtual = Number(registro.rev) || 0;
    var revPedida = Number(corpo.rev);

    if (Number.isFinite(revPedida) && revPedida !== revAtual) {
      return {
        ok: false,
        erro: 'conflito',
        rev: revAtual,
        dados: lerJson(registro.fichaJson, {}),
      };
    }

    var agora = new Date().toISOString();
    ficha.atualizadoEm = agora;
    ficha.resumoRecursos = resumoParaGravar(ficha, lerJson(registro.fichaJson, {})) || undefined;
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
    registro.fichaJson = JSON.stringify(ficha);
    /* Conferido de novo: o id da campanha que entrou acima ocupa espaço. */
    if (registro.fichaJson.length > MAX_CELULA) return { ok: false, erro: 'dados_grandes' };

    atualizarLinha(ABAS.PERSONAGENS, registro._linha, registro);

    avisarMesas([campanhaAnterior, registro.campanhaId], ['personagens', 'combates']);

    return { ok: true, rev: registro.rev };
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

    /* Achar para apagar não precisa da imagem. */
    var foto = linhaLeve(ABAS.PERSONAGENS_FOTOS, 'personagemId', corpo.personagemId);
    if (foto && String(foto.ownerId) === String(usuario.id)) {
      apagarLinha(ABAS.PERSONAGENS_FOTOS, foto._linha);
    }

    avisarMesas([registro.campanhaId], ['personagens', 'combates']);

    return { ok: true };
  });
}

function acaoDuplicarPersonagem(corpo, usuario) {
  return comTrava(function () {
    var acesso = personagemAcessivel(corpo.personagemId, usuario, { exigeDono: true });
    if (!acesso.ok) return acesso;
    var registro = acesso.personagem;

    var ficha = lerJson(registro.fichaJson, {});
    var agora = new Date().toISOString();
    var id = novoId();

    ficha.nome = String(ficha.nome || registro.nome || 'Sem nome') + ' (cópia)';
    ficha.criadoEm = agora;
    ficha.atualizadoEm = agora;

    inserir(ABAS.PERSONAGENS, {
      id: id,
      ownerId: usuario.id,
      nome: ficha.nome.slice(0, 120),
      campanhaId: registro.campanhaId || '',
      classe: registro.classe || '',
      origem: registro.origem || '',
      criadoEm: agora,
      atualizadoEm: agora,
      rev: 1,
      fichaJson: JSON.stringify(ficha),
    });

    var foto = acharPor(ABAS.PERSONAGENS_FOTOS, 'personagemId', corpo.personagemId);
    if (foto && String(foto.ownerId) === String(usuario.id) && foto.imagem) {
      inserir(ABAS.PERSONAGENS_FOTOS, {
        personagemId: id,
        ownerId: usuario.id,
        imagem: foto.imagem,
        atualizadoEm: agora,
      });
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
  return { ok: true, dados: { imagem: (foto && foto.imagem) || '' } };
}

function acaoSalvarFoto(corpo, usuario) {
  var imagem = String(corpo.imagem || '');

  if (imagem && imagem.indexOf('data:image/') !== 0) return { ok: false, erro: 'dados_invalidos' };
  if (imagem.length > MAX_CELULA) return { ok: false, erro: 'dados_grandes' };

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
      existente.imagem = imagem;
      existente.atualizadoEm = agora;
      atualizarCampos(ABAS.PERSONAGENS_FOTOS, existente, ['ownerId', 'imagem', 'atualizadoEm']);
    } else {
      inserir(ABAS.PERSONAGENS_FOTOS, {
        personagemId: corpo.personagemId,
        ownerId: acesso.personagem.ownerId,
        imagem: imagem,
        atualizadoEm: agora,
      });
    }

    avisarMesas([acesso.personagem.campanhaId], ['personagens']);

    return { ok: true };
  });
}

/* =====================================================================
   HOMEBREW
   ===================================================================== */

var TIPOS_HOMEBREW = ['item', 'arma', 'armadura', 'mochila', 'criatura', 'habilidade'];

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
    .sort(function (a, b) { return String(a.nome).localeCompare(String(b.nome), 'pt-BR'); });

  return { ok: true, dados: lista };
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
  return { ok: true, dados: { imagem: (imagem && imagem.imagem) || '' } };
}

function acaoSalvarImagemCriatura(corpo, usuario) {
  var imagem = String(corpo.imagem || '');

  if (imagem && imagem.indexOf('data:image/') !== 0) return { ok: false, erro: 'dados_invalidos' };
  if (imagem.length > MAX_CELULA) return { ok: false, erro: 'dados_grandes' };

  return comTrava(function () {
    var registro = meuRegistro(ABAS.HOMEBREW, corpo.criaturaId, usuario);
    if (!registro) return { ok: false, erro: 'nao_encontrado' };

    var agora = new Date().toISOString();
    var existente = linhaLeve(ABAS.CRIATURAS_IMAGENS, 'criaturaId', corpo.criaturaId);

    if (existente) {
      existente.ownerId = usuario.id;
      existente.imagem = imagem;
      existente.atualizadoEm = agora;
      atualizarCampos(ABAS.CRIATURAS_IMAGENS, existente, ['ownerId', 'imagem', 'atualizadoEm']);
    } else {
      inserir(ABAS.CRIATURAS_IMAGENS, {
        criaturaId: corpo.criaturaId,
        ownerId: usuario.id,
        imagem: imagem,
        atualizadoEm: agora,
      });
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
      avatar: (perfil && perfil.avatar) || '',
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
    if (img.length > MAX_CELULA) return { ok: false, erro: 'dados_grandes' };
  }

  return comTrava(function () {
    var agora = new Date().toISOString();

    if (dados.nome !== undefined) {
      var registro = acharPor(ABAS.USUARIOS, 'id', usuario.id);
      if (registro) {
        registro.nome = String(dados.nome).trim().slice(0, 80) || registro.usuario;
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

      if (dados.avatar !== undefined) perfil.avatar = String(dados.avatar || '');
      if (dados.preferencias !== undefined) perfil.preferenciasJson = JSON.stringify(dados.preferencias || {});
      perfil.atualizadoEm = agora;

      atualizarLinha(ABAS.PERFIS, perfil._linha, perfil);
    }

    return { ok: true };
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

  var texto = 'R.A.M.A. — setup\n\n' + relatorio.join('\n');
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