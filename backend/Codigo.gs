/* =====================================================================
   R.A.M.A. — backend
   =====================================================================
   Google Apps Script publicado como app da Web. É a ÚNICA coisa entre o
   navegador e a planilha, e é onde toda decisão de segurança acontece.

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

var ABAS = {
  USUARIOS: {
    nome: 'USUARIOS',
    colunas: ['id', 'usuario', 'nome', 'hashSenha', 'salt', 'iteracoes', 'ativo', 'criadoEm', 'atualizadoEm'],
  },
  SESSOES: {
    nome: 'SESSOES',
    colunas: ['tokenHash', 'userId', 'criadoEm', 'ultimaAtividade', 'expiraEm', 'ativo', 'agente'],
  },
  PERFIS: {
    nome: 'PERFIS',
    colunas: ['userId', 'avatar', 'preferenciasJson', 'atualizadoEm'],
  },
  PERSONAGENS: {
    nome: 'PERSONAGENS',
    colunas: ['id', 'ownerId', 'nome', 'campanhaId', 'classe', 'origem', 'criadoEm', 'atualizadoEm', 'rev', 'fichaJson'],
  },
  PERSONAGENS_FOTOS: {
    /* A foto mora fora da ficha de propósito: é o campo mais pesado e o
       que menos muda. Junto no fichaJson, cada tecla digitada numa
       anotação reenviaria a imagem inteira — e a célula tem limite. */
    nome: 'PERSONAGENS_FOTOS',
    colunas: ['personagemId', 'ownerId', 'imagem', 'atualizadoEm'],
  },
  HOMEBREW: {
    /* `visibilidade` entrou na v2. Registro antigo fica com a célula
       vazia, e vazio é lido como 'privado' — nenhuma biblioteca que já
       existia vira pública sozinha. */
    nome: 'HOMEBREW',
    colunas: ['id', 'ownerId', 'tipo', 'nome', 'visibilidade', 'criadoEm', 'atualizadoEm', 'rev', 'dadosJson'],
  },
  CRIATURAS_IMAGENS: {
    /* Mesma razão da foto de personagem: imagem fora do JSON que é
       reenviado a cada edição. */
    nome: 'CRIATURAS_IMAGENS',
    colunas: ['criaturaId', 'ownerId', 'imagem', 'atualizadoEm'],
  },
  CAMPANHAS: {
    nome: 'CAMPANHAS',
    colunas: ['id', 'ownerId', 'nome', 'visibilidade', 'criadoEm', 'atualizadoEm', 'rev', 'dadosJson'],
  },

  /* ---------------------------------------------------------------
     As cinco tabelas novas da campanha.

     Nada disto cabia dentro do dadosJson da campanha: rolagens crescem
     sem fim, documentos carregam imagem, notas e combates têm
     permissão própria e são editados de forma independente. Enfiados
     num só JSON, abrir a campanha baixaria tudo e uma nota nova
     reescreveria o histórico inteiro.
     --------------------------------------------------------------- */

  CAMPANHA_MEMBROS: {
    /* O vínculo entre conta e campanha, por ID permanente. Nunca por
       nome ou usuário: renomear uma conta não pode dar nem tirar
       acesso de ninguém. */
    nome: 'CAMPANHA_MEMBROS',
    colunas: ['id', 'campanhaId', 'userId', 'papel', 'criadoEm'],
  },
  CAMPANHA_ROLAGENS: {
    nome: 'CAMPANHA_ROLAGENS',
    colunas: ['id', 'campanhaId', 'autorUserId', 'personagemId', 'tipo', 'nome',
              'visibilidade', 'criadoEm', 'dadosJson'],
  },
  CAMPANHA_DOCUMENTOS: {
    nome: 'CAMPANHA_DOCUMENTOS',
    colunas: ['id', 'campanhaId', 'nome', 'descricao', 'visiveisJson',
              'criadoEm', 'atualizadoEm', 'rev'],
  },
  CAMPANHA_DOCUMENTOS_IMAGENS: {
    nome: 'CAMPANHA_DOCUMENTOS_IMAGENS',
    colunas: ['documentoId', 'campanhaId', 'imagem', 'atualizadoEm'],
  },
  CAMPANHA_NOTAS: {
    /* Privadas do mestre. Nenhuma resposta destinada a jogador toca
       nesta aba. */
    nome: 'CAMPANHA_NOTAS',
    colunas: ['id', 'campanhaId', 'personagemId', 'pasta', 'titulo',
              'criadoEm', 'atualizadoEm', 'conteudo'],
  },
  CAMPANHA_COMBATES: {
    nome: 'CAMPANHA_COMBATES',
    colunas: ['id', 'campanhaId', 'nome', 'estado', 'visiveisJson',
              'criadoEm', 'atualizadoEm', 'rev', 'dadosJson'],
  },
};

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

/* Limite prático de uma célula do Sheets é 50.000 caracteres. */
var MAX_CELULA = 45000;

/* =====================================================================
   ENTRADA
   ===================================================================== */

function doPost(e) {
  try {
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
   PLANILHA
   ===================================================================== */

function planilha() {
  var id = propriedade('RAMA_PLANILHA_ID', '');
  if (id) return SpreadsheetApp.openById(id);

  var ativa = SpreadsheetApp.getActiveSpreadsheet();
  if (ativa) return ativa;

  throw new Error('Sem planilha: defina RAMA_PLANILHA_ID em Script Properties ou vincule o script a uma planilha.');
}

function aba(definicao) {
  var folha = planilha().getSheetByName(definicao.nome);
  if (!folha) throw new Error('A aba ' + definicao.nome + ' não existe. Rode setupRama().');
  return folha;
}

function propriedade(chave, padrao) {
  var v = PropertiesService.getScriptProperties().getProperty(chave);
  return (v === null || v === undefined || v === '') ? padrao : v;
}

/* Todas as linhas, já viradas em objeto pelo cabeçalho. As tabelas
   deste sistema são pequenas — dezenas de linhas, não milhares —, e ler
   tudo de uma vez custa uma chamada em vez de uma por linha. */
function lerTudo(definicao) {
  var folha = aba(definicao);
  var ultima = folha.getLastRow();
  if (ultima < 2) return [];

  var valores = folha.getRange(2, 1, ultima - 1, definicao.colunas.length).getValues();

  return valores.map(function (linha, i) {
    var registro = { _linha: i + 2 };
    definicao.colunas.forEach(function (coluna, c) { registro[coluna] = linha[c]; });
    return registro;
  });
}

function acharPor(definicao, coluna, valor) {
  var alvo = String(valor);
  var todos = lerTudo(definicao);
  for (var i = 0; i < todos.length; i++) {
    if (String(todos[i][coluna]) === alvo) return todos[i];
  }
  return null;
}

function inserir(definicao, registro) {
  var folha = aba(definicao);
  folha.appendRow(definicao.colunas.map(function (c) {
    return registro[c] === undefined ? '' : registro[c];
  }));
}

function atualizarLinha(definicao, numeroDaLinha, registro) {
  var folha = aba(definicao);
  folha.getRange(numeroDaLinha, 1, 1, definicao.colunas.length).setValues([
    definicao.colunas.map(function (c) { return registro[c] === undefined ? '' : registro[c]; }),
  ]);
}

function apagarLinha(definicao, numeroDaLinha) {
  aba(definicao).deleteRow(numeroDaLinha);
}

/* =====================================================================
   TRAVA
   ---------------------------------------------------------------------
   O LockService impede que duas execuções do script mexam na mesma
   região ao mesmo tempo. Ele resolve um problema diferente do `rev`:

     lock  — duas gravações simultâneas embaralhando linhas da planilha
     rev   — alguém salvando por cima de uma versão que já mudou

   Uma não substitui a outra. Sem lock, duas gravações concorrentes
   podem escrever na mesma linha; sem rev, a segunda gravação apaga em
   silêncio o trabalho da primeira mesmo tendo esperado a vez.
   ===================================================================== */

function comTrava(fn) {
  var trava = LockService.getScriptLock();

  if (!trava.tryLock(25000)) return { ok: false, erro: 'ocupado' };

  try {
    return fn();
  } finally {
    trava.releaseLock();
  }
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
   raciocínio que se aplica à senha vale para a chave de sessão. */
function validarSessao(token) {
  var bruto = String(token || '');
  if (!bruto) return { ok: false, erro: 'sem_token' };

  var hash = sha256Hex(bruto);
  var sessao = acharPor(ABAS.SESSOES, 'tokenHash', hash);
  if (!sessao) return { ok: false, erro: 'sessao' };

  if (String(sessao.ativo) !== 'true') return { ok: false, erro: 'sessao' };

  var agora = Date.now();
  var expira = Number(sessao.expiraEm) || 0;
  if (expira && agora > expira) {
    comTrava(function () {
      var atual = acharPor(ABAS.SESSOES, 'tokenHash', hash);
      if (atual) {
        atual.ativo = 'false';
        atualizarLinha(ABAS.SESSOES, atual._linha, atual);
      }
      return { ok: true };
    });
    return { ok: false, erro: 'expirada' };
  }

  var usuario = acharPor(ABAS.USUARIOS, 'id', sessao.userId);
  if (!usuario) return { ok: false, erro: 'sessao' };
  if (String(usuario.ativo) !== 'true') return { ok: false, erro: 'inativo' };

  /* Renova o prazo, mas com parcimônia: uma gravação por hora, não uma
     por requisição. */
  var ultima = Number(sessao.ultimaAtividade) || 0;
  if (agora - ultima > INTERVALO_ATIVIDADE_MS) {
    comTrava(function () {
      var atual = acharPor(ABAS.SESSOES, 'tokenHash', hash);
      if (atual) {
        atual.ultimaAtividade = agora;
        atual.expiraEm = agora + DIAS_SESSAO * 86400000;
        atualizarLinha(ABAS.SESSOES, atual._linha, atual);
      }
      return { ok: true };
    });
  }

  return { ok: true, usuario: usuario, sessao: sessao };
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
   entrada — porque validar sessão lê a aba inteira. */
function limparSessoesVelhas() {
  var limite = Date.now() - DIAS_SESSAO * 86400000;
  var folha = aba(ABAS.SESSOES);
  var todas = lerTudo(ABAS.SESSOES);

  for (var i = todas.length - 1; i >= 0; i--) {
    var s = todas[i];
    var venceu = (Number(s.expiraEm) || 0) < limite;
    var morta = String(s.ativo) !== 'true' && (Number(s.ultimaAtividade) || 0) < limite;
    if (venceu || morta) folha.deleteRow(s._linha);
  }
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

function membroDaCampanha(campanhaId, userId) {
  var alvoC = String(campanhaId), alvoU = String(userId);
  var todos = lerTudo(ABAS.CAMPANHA_MEMBROS);
  for (var i = 0; i < todos.length; i++) {
    if (String(todos[i].campanhaId) === alvoC && String(todos[i].userId) === alvoU) return todos[i];
  }
  return null;
}

function membrosDaCampanha(campanhaId) {
  var alvo = String(campanhaId);
  return lerTudo(ABAS.CAMPANHA_MEMBROS).filter(function (m) {
    return String(m.campanhaId) === alvo;
  });
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

  var campanha = acharPor(ABAS.CAMPANHAS, 'id', personagem.campanhaId);
  if (!campanha) return { ok: false, erro: 'nao_encontrado' };

  if (papelNaCampanha(campanha, usuario) !== PAPEL_MESTRE) {
    return { ok: false, erro: 'nao_encontrado' };
  }

  /* Ser mestre não é ser dono. Apagar e transferir continuam sendo do
     dono, e só dele. */
  if (o.exigeDono) return { ok: false, erro: 'sem_permissao' };

  return { ok: true, personagem: personagem, dono: false, mestre: true, campanha: campanha };
}

/* As campanhas que este usuário alcança, com o papel em cada uma.
   Calculado uma vez por requisição e reaproveitado, para listar
   personagens não reler a aba de membros a cada linha. */
function campanhasDoUsuario(usuario) {
  var porId = {};

  lerTudo(ABAS.CAMPANHAS).forEach(function (c) {
    var papel = papelNaCampanha(c, usuario);
    if (papel) porId[c.id] = { campanha: c, papel: papel };
  });

  return porId;
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

  var fotos = {};
  lerTudo(ABAS.PERSONAGENS_FOTOS).forEach(function (f) {
    if (String(f.ownerId) === String(usuario.id)) fotos[f.personagemId] = f.imagem;
  });

  /* A listagem devolve o cabeçalho de cada ficha, nunca o fichaJson.
     Trinta fichas completas para desenhar trinta nomes seriam
     megabytes por tela. */
  var lista = lerTudo(ABAS.PERSONAGENS)
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

  var json = JSON.stringify(ficha);
  if (json.length > MAX_CELULA) return { ok: false, erro: 'dados_grandes' };

  return comTrava(function () {
    inserir(ABAS.PERSONAGENS, {
      id: id,
      ownerId: usuario.id,
      nome: String(ficha.nome || 'Sem nome').slice(0, 120),
      campanhaId: campanhaValida(ficha.campanhaId, usuario),
      classe: String(ficha.classe || '').slice(0, 80),
      origem: String(ficha.origem || '').slice(0, 80),
      criadoEm: agora,
      atualizadoEm: agora,
      rev: 1,
      fichaJson: json,
    });
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

  var json = JSON.stringify(ficha);
  if (json.length > MAX_CELULA) return { ok: false, erro: 'dados_grandes' };

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

    registro.nome = String(ficha.nome || 'Sem nome').slice(0, 120);
    registro.campanhaId = campanhaValida(ficha.campanhaId, usuario);
    registro.classe = String(ficha.classe || '').slice(0, 80);
    registro.origem = String(ficha.origem || '').slice(0, 80);
    registro.atualizadoEm = agora;
    registro.rev = revAtual + 1;
    registro.fichaJson = JSON.stringify(ficha);

    atualizarLinha(ABAS.PERSONAGENS, registro._linha, registro);

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

    var foto = acharPor(ABAS.PERSONAGENS_FOTOS, 'personagemId', corpo.personagemId);
    if (foto && String(foto.ownerId) === String(usuario.id)) {
      apagarLinha(ABAS.PERSONAGENS_FOTOS, foto._linha);
    }

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
    var existente = acharPor(ABAS.PERSONAGENS_FOTOS, 'personagemId', corpo.personagemId);

    if (existente) {
      /* O dono da foto é o dono do PERSONAGEM, não quem gravou: se o
         mestre trocar a imagem, a ficha continua sendo do jogador. */
      existente.ownerId = acesso.personagem.ownerId;
      existente.imagem = imagem;
      existente.atualizadoEm = agora;
      atualizarLinha(ABAS.PERSONAGENS_FOTOS, existente._linha, existente);
    } else {
      inserir(ABAS.PERSONAGENS_FOTOS, {
        personagemId: corpo.personagemId,
        ownerId: acesso.personagem.ownerId,
        imagem: imagem,
        atualizadoEm: agora,
      });
    }

    return { ok: true };
  });
}

/* =====================================================================
   HOMEBREW
   ===================================================================== */

var TIPOS_HOMEBREW = ['item', 'arma', 'armadura', 'mochila', 'criatura'];

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

  var lista = lerTudo(ABAS.HOMEBREW)
    .filter(function (h) {
      if (tipo && String(h.tipo) !== tipo) return false;

      var proprio = meu(h, usuario);
      var publico = visibilidadeDe(h.visibilidade) === VIS_PUBLICO;

      if (escopo === 'publicos') return !proprio && publico;
      if (escopo === 'todos') return proprio || publico;
      return proprio;
    })
    .map(function (h) { return homebrewParaCliente(h, usuario); })
    .sort(function (a, b) { return String(a.nome).localeCompare(String(b.nome), 'pt-BR'); });

  return { ok: true, dados: lista };
}

/* A forma como um registro chega ao navegador. As colunas mandam sobre
   o JSON: id, tipo, nome e visibilidade vêm da linha, não do conteúdo
   gravado, para um dadosJson adulterado não conseguir mentir sobre a
   própria visibilidade. */
function homebrewParaCliente(h, usuario) {
  var dados = lerJson(h.dadosJson, {});
  dados.id = h.id;
  dados.tipo = h.tipo;
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
    var imagem = acharPor(ABAS.CRIATURAS_IMAGENS, 'criaturaId', corpo.homebrewId);
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
    var existente = acharPor(ABAS.CRIATURAS_IMAGENS, 'criaturaId', corpo.criaturaId);

    if (existente) {
      existente.ownerId = usuario.id;
      existente.imagem = imagem;
      existente.atualizadoEm = agora;
      atualizarLinha(ABAS.CRIATURAS_IMAGENS, existente._linha, existente);
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
  var personagens = lerTudo(ABAS.PERSONAGENS).filter(function (p) { return meu(p, usuario); });
  var homebrew = lerTudo(ABAS.HOMEBREW).filter(function (h) { return meu(h, usuario); });

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
   AUXILIARES
   ===================================================================== */

/* JSON corrompido numa célula não pode derrubar a resposta inteira: a
   ficha volta vazia, a pessoa vê que algo se perdeu e o log guarda o
   motivo. Melhor uma ficha em branco do que um 500. */
function lerJson(texto, padrao) {
  try {
    if (!texto) return padrao;
    var v = JSON.parse(texto);
    return (v && typeof v === 'object') ? v : padrao;
  } catch (erro) {
    console.warn('JSON inválido na planilha: ' + erro);
    return padrao;
  }
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
  var registro = acharPor(ABAS.USUARIOS, 'usuario', String(usuario || '').trim().toLowerCase());
  if (!registro) throw new Error('Usuário não encontrado.');

  registro.ativo = 'false';
  registro.atualizadoEm = new Date().toISOString();
  atualizarLinha(ABAS.USUARIOS, registro._linha, registro);
  encerrarSessoesDe(registro.id);

  return 'Usuário desativado e sessões encerradas.';
}

function encerrarSessoesDe(userId) {
  lerTudo(ABAS.SESSOES).forEach(function (s) {
    if (String(s.userId) === String(userId) && String(s.ativo) === 'true') {
      s.ativo = 'false';
      atualizarLinha(ABAS.SESSOES, s._linha, s);
    }
  });
}

/* ---------------------------------------------------------------------
   conferirInstalacao()
   Diz o que falta antes de publicar. Rode depois do setup.
   --------------------------------------------------------------------- */
function conferirInstalacao() {
  var problemas = [];
  var avisos = [];

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

  try {
    var usuarios = lerTudo(ABAS.USUARIOS);
    if (!usuarios.length) problemas.push('Nenhum usuário cadastrado — rode criarUsuario().');

    usuarios.forEach(function (u) {
      if (String(u.hashSenha || '').length !== 64) {
        problemas.push('Usuário "' + u.usuario + '" com hash de tamanho inesperado.');
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
   medirDerivacao()
   Quanto tempo a derivação da senha leva com as iterações atuais. Use
   para escolher RAMA_ITERACOES: o alvo razoável é algo entre 300 ms e
   1,5 s. Menos que isso protege pouco; mais que isso irrita quem entra.
   --------------------------------------------------------------------- */
function medirDerivacao() {
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