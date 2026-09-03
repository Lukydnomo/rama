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
    nome: 'HOMEBREW',
    colunas: ['id', 'ownerId', 'tipo', 'nome', 'criadoEm', 'atualizadoEm', 'rev', 'dadosJson'],
  },
  CAMPANHAS: {
    nome: 'CAMPANHAS',
    colunas: ['id', 'ownerId', 'nome', 'criadoEm', 'atualizadoEm', 'rev', 'dadosJson'],
  },
};

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
    var rota = ROTAS[acao];
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

var ROTAS = {
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
  salvar_homebrew:       { publica: false, fn: acaoSalvarHomebrew },
  excluir_homebrew:      { publica: false, fn: acaoExcluirHomebrew },

  listar_campanhas:      { publica: false, fn: acaoListarCampanhas },
  ler_campanha:          { publica: false, fn: acaoLerCampanha },
  criar_campanha:        { publica: false, fn: acaoCriarCampanha },
  salvar_campanha:       { publica: false, fn: acaoSalvarCampanha },
  excluir_campanha:      { publica: false, fn: acaoExcluirCampanha },

  ler_perfil:            { publica: false, fn: acaoLerPerfil },
  salvar_perfil:         { publica: false, fn: acaoSalvarPerfil },
};

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
   PERSONAGENS
   ===================================================================== */

function acaoListarPersonagens(corpo, usuario) {
  var campanhas = {};
  lerTudo(ABAS.CAMPANHAS).forEach(function (c) {
    if (meu(c, usuario)) campanhas[c.id] = c.nome;
  });

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
  var registro = meuRegistro(ABAS.PERSONAGENS, corpo.personagemId, usuario);
  if (!registro) return { ok: false, erro: 'nao_encontrado' };

  return {
    ok: true,
    rev: Number(registro.rev) || 0,
    dados: lerJson(registro.fichaJson, {}),
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
    var registro = meuRegistro(ABAS.PERSONAGENS, corpo.personagemId, usuario);
    if (!registro) return { ok: false, erro: 'nao_encontrado' };

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
    var registro = meuRegistro(ABAS.PERSONAGENS, corpo.personagemId, usuario);
    if (!registro) return { ok: false, erro: 'nao_encontrado' };

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
    var registro = meuRegistro(ABAS.PERSONAGENS, corpo.personagemId, usuario);
    if (!registro) return { ok: false, erro: 'nao_encontrado' };

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
function campanhaValida(campanhaId, usuario) {
  if (!campanhaId) return '';
  var campanha = acharPor(ABAS.CAMPANHAS, 'id', campanhaId);
  return (campanha && meu(campanha, usuario)) ? campanhaId : '';
}

/* =====================================================================
   FOTOS
   ===================================================================== */

function acaoLerFoto(corpo, usuario) {
  var personagem = meuRegistro(ABAS.PERSONAGENS, corpo.personagemId, usuario);
  if (!personagem) return { ok: false, erro: 'nao_encontrado' };

  var foto = acharPor(ABAS.PERSONAGENS_FOTOS, 'personagemId', corpo.personagemId);
  if (!foto || String(foto.ownerId) !== String(usuario.id)) {
    return { ok: true, dados: { imagem: '' } };
  }

  return { ok: true, dados: { imagem: foto.imagem || '' } };
}

function acaoSalvarFoto(corpo, usuario) {
  var imagem = String(corpo.imagem || '');

  if (imagem && imagem.indexOf('data:image/') !== 0) return { ok: false, erro: 'dados_invalidos' };
  if (imagem.length > MAX_CELULA) return { ok: false, erro: 'dados_grandes' };

  return comTrava(function () {
    var personagem = meuRegistro(ABAS.PERSONAGENS, corpo.personagemId, usuario);
    if (!personagem) return { ok: false, erro: 'nao_encontrado' };

    var agora = new Date().toISOString();
    var existente = acharPor(ABAS.PERSONAGENS_FOTOS, 'personagemId', corpo.personagemId);

    if (existente) {
      existente.ownerId = usuario.id;
      existente.imagem = imagem;
      existente.atualizadoEm = agora;
      atualizarLinha(ABAS.PERSONAGENS_FOTOS, existente._linha, existente);
    } else {
      inserir(ABAS.PERSONAGENS_FOTOS, {
        personagemId: corpo.personagemId,
        ownerId: usuario.id,
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

var TIPOS_HOMEBREW = ['item', 'arma', 'armadura', 'mochila'];

function acaoListarHomebrew(corpo, usuario) {
  var lista = lerTudo(ABAS.HOMEBREW)
    .filter(function (h) { return meu(h, usuario); })
    .map(function (h) {
      var dados = lerJson(h.dadosJson, {});
      dados.id = h.id;
      dados.tipo = h.tipo;
      dados.nome = h.nome;
      dados.criadoEm = h.criadoEm;
      dados.atualizadoEm = h.atualizadoEm;
      return dados;
    })
    .sort(function (a, b) { return String(a.nome).localeCompare(String(b.nome), 'pt-BR'); });

  return { ok: true, dados: lista };
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

  return comTrava(function () {
    var agora = new Date().toISOString();
    var existente = dados.id ? meuRegistro(ABAS.HOMEBREW, dados.id, usuario) : null;

    if (existente) {
      existente.tipo = tipo;
      existente.nome = nome;
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
    return { ok: true };
  });
}

/* =====================================================================
   CAMPANHAS
   ===================================================================== */

function acaoListarCampanhas(corpo, usuario) {
  var lista = lerTudo(ABAS.CAMPANHAS)
    .filter(function (c) { return meu(c, usuario); })
    .map(function (c) {
      var dados = lerJson(c.dadosJson, {});
      return {
        id: c.id,
        nome: c.nome,
        descricao: dados.descricao || '',
        criadoEm: c.criadoEm,
        atualizadoEm: c.atualizadoEm,
        rev: Number(c.rev) || 0,
      };
    })
    .sort(function (a, b) { return String(a.nome).localeCompare(String(b.nome), 'pt-BR'); });

  return { ok: true, dados: lista };
}

function acaoLerCampanha(corpo, usuario) {
  var registro = meuRegistro(ABAS.CAMPANHAS, corpo.campanhaId, usuario);
  if (!registro) return { ok: false, erro: 'nao_encontrado' };

  return {
    ok: true,
    rev: Number(registro.rev) || 0,
    dados: lerJson(registro.dadosJson, {}),
  };
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
      criadoEm: agora,
      atualizadoEm: agora,
      rev: 1,
      dadosJson: JSON.stringify({ descricao: String(dados.descricao || '').slice(0, 4000) }),
    });
    return { ok: true, rev: 1, dados: { id: id } };
  });
}

function acaoSalvarCampanha(corpo, usuario) {
  var dados = corpo.dados || {};

  return comTrava(function () {
    var registro = meuRegistro(ABAS.CAMPANHAS, corpo.campanhaId, usuario);
    if (!registro) return { ok: false, erro: 'nao_encontrado' };

    var revAtual = Number(registro.rev) || 0;
    var revPedida = Number(corpo.rev);

    if (Number.isFinite(revPedida) && revPedida !== revAtual) {
      return { ok: false, erro: 'conflito', rev: revAtual, dados: lerJson(registro.dadosJson, {}) };
    }

    var guardado = lerJson(registro.dadosJson, {});
    if (dados.descricao !== undefined) guardado.descricao = String(dados.descricao).slice(0, 4000);

    registro.nome = String(dados.nome || registro.nome).trim().slice(0, 120);
    registro.atualizadoEm = new Date().toISOString();
    registro.rev = revAtual + 1;
    registro.dadosJson = JSON.stringify(guardado);

    atualizarLinha(ABAS.CAMPANHAS, registro._linha, registro);

    return { ok: true, rev: registro.rev };
  });
}

/* Excluir campanha não apaga personagem. Ela é um agrupamento; apagar
   o agrupamento não pode apagar o que estava agrupado. */
function acaoExcluirCampanha(corpo, usuario) {
  return comTrava(function () {
    var registro = meuRegistro(ABAS.CAMPANHAS, corpo.campanhaId, usuario);
    if (!registro) return { ok: false, erro: 'nao_encontrado' };

    apagarLinha(ABAS.CAMPANHAS, registro._linha);

    lerTudo(ABAS.PERSONAGENS).forEach(function (p) {
      if (meu(p, usuario) && String(p.campanhaId) === String(corpo.campanhaId)) {
        p.campanhaId = '';
        atualizarLinha(ABAS.PERSONAGENS, p._linha, p);
      }
    });

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
  var campanhas = lerTudo(ABAS.CAMPANHAS).filter(function (c) { return meu(c, usuario); });
  var homebrew = lerTudo(ABAS.HOMEBREW).filter(function (h) { return meu(h, usuario); });

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