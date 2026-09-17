/* =====================================================================
   R.A.M.A. — dados
   =====================================================================
   Terceiro arquivo do Apps Script, e o mais baixo: é aqui que o sistema
   toca a planilha. Nenhuma decisão de permissão mora neste arquivo —
   ele não sabe quem está pedindo. Ele sabe ler barato e gravar sem
   estragar.

   Os três arquivos precisam existir na implantação:

     Dados.gs      este — esquema das abas e acesso ao Sheets
     Codigo.gs     entrada, sessão, permissões, personagens, homebrew
     Campanhas.gs  tudo o que é campanha

   O Apps Script avalia todos os .gs no mesmo escopo global antes de
   atender qualquer requisição, e declarações de função são içadas entre
   arquivos. Por isso a ordem entre eles não importa — desde que nenhuma
   `var` de topo dependa de outra `var` de topo de outro arquivo. Este
   arquivo respeita essa regra: só ABAS é declarada no topo, e ela não
   depende de nada.

   ---------------------------------------------------------------------
   POR QUE ESTE ARQUIVO EXISTE
   ---------------------------------------------------------------------

   Até a v2 toda busca era `lerTudo()` seguido de um laço. Numa planilha
   de mesa pequena isso é irrelevante; com vinte pessoas jogando ao mesmo
   tempo, não é. Três coisas davam errado:

   1. LER TUDO LÊ TUDO. `acharPor(PERSONAGENS, 'id', x)` baixava o
      fichaJson de TODOS os personagens do sistema para achar um.
      Sessenta fichas de 8 KB são meio megabyte por requisição, e a
      requisição fazia isso três ou quatro vezes.

   2. LER DE NOVO O QUE JÁ SE LEU. Validar a sessão lia USUARIOS e
      SESSOES inteiras; a ação seguinte lia de novo; conferir a campanha
      lia CAMPANHA_MEMBROS uma vez por campanha do usuário.

   3. LER DENTRO DA TRAVA. Gravar um personagem segurava a trava global
      do script durante a leitura completa da aba. Com vinte pessoas,
      cada uma esperava a leitura da anterior.

   A resposta é a mesma para os três: ler só as colunas necessárias,
   guardar o que já foi lido enquanto a execução dura, e entrar na trava
   já sabendo o que vai fazer.

   ---------------------------------------------------------------------
   COLUNA LEVE E COLUNA PESADA
   ---------------------------------------------------------------------

   Toda aba tem um punhado de colunas curtas — id, dono, nome, datas — e
   normalmente UMA coluna que carrega o peso: o fichaJson, a imagem em
   base64, o dadosJson. `leves` diz quantas colunas do começo são as
   curtas.

   Com isso dá para varrer uma aba inteira sem tocar no peso:

     lerLeves()  varre só as colunas curtas — serve para listar,
                 filtrar, contar e ACHAR
     lerLinha()  traz UMA linha completa, já que agora se sabe qual

   Achar um registro passa a custar uma varredura barata mais uma linha,
   em vez de uma varredura cara.

   ---------------------------------------------------------------------
   O CABEÇALHO MANDA
   ---------------------------------------------------------------------

   As posições das colunas saem do cabeçalho REAL da aba, não da ordem
   em que estão escritas aqui. Isso conserta um problema silencioso: o
   setupRama acrescenta coluna nova no FIM da aba, mas na lista abaixo
   ela pode estar no meio. Uma planilha criada na v1 e atualizada para a
   v2 tem `visibilidade` como última coluna do HOMEBREW, enquanto o
   código a declara em quinto lugar — ler por posição devolveria uma
   coluna pelo valor de outra.

   Ler pelo NOME não tem esse problema, seja qual for a ordem física.
   ===================================================================== */

/* =====================================================================
   ESQUEMA
   ---------------------------------------------------------------------
     colunas  os nomes, na ordem em que uma aba NOVA é criada
     chave    a coluna que identifica a linha (para achar e para
              conferir antes de gravar)
     leves    quantas colunas do começo são baratas de ler. Ausente
              quer dizer "todas".
   ===================================================================== */

var ABAS = {
  USUARIOS: {
    nome: 'USUARIOS',
    colunas: ['id', 'usuario', 'nome', 'hashSenha', 'salt', 'iteracoes', 'ativo', 'criadoEm', 'atualizadoEm'],
    chave: 'id',
  },
  SESSOES: {
    nome: 'SESSOES',
    colunas: ['tokenHash', 'userId', 'criadoEm', 'ultimaAtividade', 'expiraEm', 'ativo', 'agente'],
    chave: 'tokenHash',
  },
  PERFIS: {
    /* O avatar é base64 e vem logo na segunda coluna. Varrer PERFIS
       para achar um userId não pode arrastar o avatar de todo mundo. */
    nome: 'PERFIS',
    colunas: ['userId', 'avatar', 'preferenciasJson', 'atualizadoEm'],
    chave: 'userId',
    leves: 1,
  },
  PERSONAGENS: {
    nome: 'PERSONAGENS',
    colunas: ['id', 'ownerId', 'nome', 'campanhaId', 'classe', 'origem', 'criadoEm', 'atualizadoEm', 'rev', 'fichaJson'],
    chave: 'id',
    leves: 9,
  },
  PERSONAGENS_FOTOS: {
    /* A foto mora fora da ficha de propósito: é o campo mais pesado e o
       que menos muda. Junto no fichaJson, cada tecla digitada numa
       anotação reenviaria a imagem inteira — e a célula tem limite. */
    nome: 'PERSONAGENS_FOTOS',
    colunas: ['personagemId', 'ownerId', 'imagem', 'atualizadoEm'],
    chave: 'personagemId',
    leves: 2,
  },
  HOMEBREW: {
    /* `visibilidade` entrou na v2. Registro antigo fica com a célula
       vazia, e vazio é lido como 'privado' — nenhuma biblioteca que já
       existia vira pública sozinha. Numa planilha atualizada ela está
       fisicamente no fim; o cabeçalho resolve. */
    nome: 'HOMEBREW',
    colunas: ['id', 'ownerId', 'tipo', 'nome', 'visibilidade', 'criadoEm', 'atualizadoEm', 'rev', 'dadosJson'],
    chave: 'id',
    leves: 8,
    json: 'dadosJson',
  },
  CRIATURAS_IMAGENS: {
    /* Mesma razão da foto de personagem: imagem fora do JSON que é
       reenviado a cada edição. */
    nome: 'CRIATURAS_IMAGENS',
    colunas: ['criaturaId', 'ownerId', 'imagem', 'atualizadoEm'],
    chave: 'criaturaId',
    leves: 2,
  },
  CAMPANHAS: {
    nome: 'CAMPANHAS',
    colunas: ['id', 'ownerId', 'nome', 'visibilidade', 'criadoEm', 'atualizadoEm', 'rev', 'dadosJson'],
    chave: 'id',
    leves: 7,
    json: 'dadosJson',
  },

  /* ---------------------------------------------------------------
     As tabelas da campanha.

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
    chave: 'id',
  },
  CAMPANHA_ROLAGENS: {
    /* A aba que mais cresce. Tudo o que a listagem precisa para
       filtrar e ordenar está nas oito primeiras colunas; o resultado
       da rolagem, que é o volume, fica na nona e só é lido para as
       linhas da página pedida. */
    nome: 'CAMPANHA_ROLAGENS',
    colunas: ['id', 'campanhaId', 'autorUserId', 'personagemId', 'tipo', 'nome',
              'visibilidade', 'criadoEm', 'dadosJson'],
    chave: 'id',
    leves: 8,
  },
  CAMPANHA_DOCUMENTOS: {
    nome: 'CAMPANHA_DOCUMENTOS',
    colunas: ['id', 'campanhaId', 'nome', 'descricao', 'visiveisJson',
              'criadoEm', 'atualizadoEm', 'rev'],
    chave: 'id',
  },
  CAMPANHA_DOCUMENTOS_IMAGENS: {
    nome: 'CAMPANHA_DOCUMENTOS_IMAGENS',
    colunas: ['documentoId', 'campanhaId', 'imagem', 'atualizadoEm'],
    chave: 'documentoId',
    leves: 2,
  },
  CAMPANHA_NOTAS: {
    /* Privadas do mestre. Nenhuma resposta destinada a jogador toca
       nesta aba. */
    nome: 'CAMPANHA_NOTAS',
    colunas: ['id', 'campanhaId', 'personagemId', 'pasta', 'titulo',
              'criadoEm', 'atualizadoEm', 'conteudo'],
    chave: 'id',
    leves: 7,
  },
  CAMPANHA_COMBATES: {
    nome: 'CAMPANHA_COMBATES',
    colunas: ['id', 'campanhaId', 'nome', 'estado', 'visiveisJson',
              'criadoEm', 'atualizadoEm', 'rev', 'dadosJson'],
    chave: 'id',
    leves: 8,
  },
  CAMPANHA_CAPAS: {
    /* A capa (banner) da campanha. Fora do dadosJson pelo mesmo motivo
       da foto de personagem: é o campo mais pesado e o que menos muda.
       Dentro do JSON da campanha, salvar a descrição reenviaria a
       imagem inteira. As quatro primeiras colunas são leves — dá para
       saber se existe capa, de que tamanho e de quando, sem ler a
       imagem. */
    nome: 'CAMPANHA_CAPAS',
    colunas: ['campanhaId', 'atualizadoEm', 'largura', 'altura', 'imagem'],
    chave: 'campanhaId',
    leves: 4,
  },
};

/* Limite prático de uma célula do Sheets é 50.000 caracteres. */
var MAX_CELULA = 45000;

/* =====================================================================
   A EXECUÇÃO
   ---------------------------------------------------------------------
   Uma requisição do Apps Script é uma execução isolada: memória
   própria, que morre junto com a resposta. Guardar aqui o que já foi
   lido é seguro por construção — não existe segunda pessoa dentro desta
   memória, e ela não sobrevive à resposta.

   O que fica guardado, e por quanto tempo:

     propriedades   Script Properties, uma leitura por execução
     planilha       o objeto da planilha, uma abertura por execução
     folhas         o objeto de cada aba tocada
     cabecalhos     o mapa nome→coluna de cada aba tocada
     varreduras     o resultado de lerTudo/lerLeves de cada aba

   As varreduras são o único item com risco, e o risco tem nome:
   ler ANTES da trava e gravar DEPOIS, em cima de dado que envelheceu
   enquanto se esperava a vez. Por isso `comTrava` esvazia as varreduras
   ao obter a trava — tudo o que for lido de dentro da região crítica é
   lido de novo, do jeito que tem de ser.
   ===================================================================== */

var _EXEC = null;

function exec() {
  if (!_EXEC) {
    _EXEC = {
      propriedades: null,
      planilha: null,
      folhas: {},
      cabecalhos: {},
      varreduras: {},
      /* Sobe a cada trava obtida. Um registro lido na geração 2 não pode
         ser gravado com um número de linha colhido na geração 1. */
      geracao: 0,
    };
  }
  return _EXEC;
}

/* Esvazia o que pode ter envelhecido. Os objetos da planilha e o
   cabeçalho ficam: aba não muda de nome nem de colunas no meio de uma
   requisição, e reabrir custaria uma chamada à toa. */
function esquecerVarreduras() {
  var e = exec();
  e.varreduras = {};
  e.geracao++;
}

/* Só para os testes: recomeça a execução do zero. Em produção cada
   requisição já começa com o global limpo. */
function reiniciarExecucao() {
  _EXEC = null;
}

/* Chamado pelo setupRama: qualquer mudança de coluna sai de circulação
   na hora, em vez de esperar as seis horas do cache. */
function esquecerCabecalhos() {
  avancarEpoca();
  reiniciarExecucao();
}

/* =====================================================================
   PROPRIEDADES
   ---------------------------------------------------------------------
   `getProperties()` traz todas de uma vez. Antes, cada `propriedade()`
   era uma chamada ao serviço — e `planilha()` chamava uma por vez que
   alguém tocasse numa aba.
   ===================================================================== */

function propriedades() {
  var e = exec();
  if (!e.propriedades) {
    e.propriedades = PropertiesService.getScriptProperties().getProperties() || {};
  }
  return e.propriedades;
}

function propriedade(chave, padrao) {
  var v = propriedades()[chave];
  return (v === null || v === undefined || v === '') ? padrao : v;
}

/* Escrever uma propriedade invalida a cópia desta execução. */
function definirPropriedade(chave, valor) {
  PropertiesService.getScriptProperties().setProperty(chave, String(valor));
  exec().propriedades = null;
}

/* =====================================================================
   PLANILHA E ABAS
   ===================================================================== */

function planilha() {
  var e = exec();
  if (e.planilha) return e.planilha;

  var id = propriedade('RAMA_PLANILHA_ID', '');
  if (id) { e.planilha = SpreadsheetApp.openById(id); return e.planilha; }

  var ativa = SpreadsheetApp.getActiveSpreadsheet();
  if (ativa) { e.planilha = ativa; return e.planilha; }

  throw new Error('Sem planilha: defina RAMA_PLANILHA_ID em Script Properties ou vincule o script a uma planilha.');
}

function aba(definicao) {
  var e = exec();
  var guardada = e.folhas[definicao.nome];
  if (guardada) return guardada;

  var folha = planilha().getSheetByName(definicao.nome);
  if (!folha) throw new Error('A aba ' + definicao.nome + ' não existe. Rode setupRama().');

  e.folhas[definicao.nome] = folha;
  return folha;
}

/* O mapa nome→número da coluna, lido do cabeçalho de verdade.

   Uma coluna declarada aqui mas ausente da planilha fica com posição
   zero: quem lê recebe string vazia, quem grava não escreve nada. É o
   comportamento certo para uma aba que ainda não passou pelo setupRama
   desta versão — funciona degradado em vez de estourar.

   ---------------------------------------------------------------------
   POR QUE OS CABEÇALHOS FICAM EM CACHE
   ---------------------------------------------------------------------

   Ler o cabeçalho é uma chamada ao Sheets por aba tocada. Uma
   requisição que encosta em quatro abas paga quatro viagens antes de
   ler o primeiro dado útil — para buscar uma linha que praticamente
   nunca muda.

   Por isso os cabeçalhos de TODAS as abas moram numa única entrada de
   cache, carregada de uma vez na primeira necessidade. Uma leitura de
   cache no lugar de quatro do Sheets.

     chave       'rama.cabecalhos.' + a época
     validade    seis horas
     invalidação setupRama() avança a época; toda entrada anterior
                 deixa de valer na hora
     ausência    lê da planilha, aba por aba, e regrava

   O cabeçalho de uma aba muda quando o setupRama acrescenta coluna, e
   é exatamente aí que a época avança. Mexer nas colunas À MÃO, direto
   na planilha, é o caso que este cache não cobre — e a saída é a mesma
   de sempre: rodar setupRama() depois. A gravação ainda confere a
   coluna-chave antes de escrever, então uma referência errada é
   recusada em vez de aplicada.

   Nada aqui é privado: é o nome das colunas, o mesmo para todo mundo. */

var SEGUNDOS_CACHE_CABECALHO = 21600;

function chaveDosCabecalhos() { return 'rama.cabecalhos.' + epoca(); }

function cabecalhosDoCache() {
  var e = exec();
  if (e.cacheDeCabecalhos !== undefined) return e.cacheDeCabecalhos;

  var bruto = cacheLer(chaveDosCabecalhos());
  e.cacheDeCabecalhos = bruto ? lerJson(bruto, null) : null;
  return e.cacheDeCabecalhos;
}

function guardarCabecalhos() {
  var e = exec();
  var guardar = {};

  var doCache = cabecalhosDoCache() || {};
  Object.keys(doCache).forEach(function (k) { guardar[k] = doCache[k]; });
  Object.keys(e.cabecalhos).forEach(function (k) { guardar[k] = e.cabecalhos[k]; });

  e.cacheDeCabecalhos = guardar;
  cacheGravar(chaveDosCabecalhos(), JSON.stringify(guardar), SEGUNDOS_CACHE_CABECALHO);
}

function cabecalho(definicao) {
  var e = exec();
  var guardado = e.cabecalhos[definicao.nome];
  if (guardado) return guardado;

  var doCache = cabecalhosDoCache();
  if (doCache && doCache[definicao.nome]) {
    e.cabecalhos[definicao.nome] = doCache[definicao.nome];
    return doCache[definicao.nome];
  }

  var folha = aba(definicao);
  var largura = Math.max(folha.getLastColumn(), definicao.colunas.length);
  var linha = folha.getRange(1, 1, 1, largura).getValues()[0];

  var mapa = {};
  for (var i = 0; i < linha.length; i++) {
    var nome = String(linha[i]).trim();
    if (nome && !mapa[nome]) mapa[nome] = i + 1;
  }

  /* Quais posições o cabeçalho já reivindica para alguma coluna
     DECLARADA. Só elas contam: uma coluna que a mesa acrescentou por
     conta própria não impede nada. */
  var reivindicadas = {};
  definicao.colunas.forEach(function (c) { if (mapa[c]) reivindicadas[mapa[c]] = c; });

  /* ---------------------------------------------------------------
     A REDE DE SEGURANÇA DO CABEÇALHO
     ---------------------------------------------------------------
     Até a v2.1 este arquivo lia as colunas por POSIÇÃO e ignorava o
     cabeçalho. Ler pelo NOME conserta a aba cujas colunas estão fora
     da ordem declarada — mas troca um problema por outro: se o
     cabeçalho não tiver o nome exato, a coluna passa a ser lida como
     VAZIA.

     Isso é catastrófico em silêncio. Numa aba USUARIOS cujo cabeçalho
     perdeu "hashSenha", toda senha do mundo passa a estar errada, e a
     tela diz "usuário ou senha incorretos" sem nenhuma pista de que o
     problema é a planilha.

     Então: nome primeiro, posição declarada como rede. A rede só é
     usada quando a posição não pertence a NENHUMA outra coluna
     declarada — porque ler a coluna do vizinho seria pior do que ler
     vazio.

     As duas listas são diferentes de propósito:

       recuperadas  o nome sumiu do cabeçalho, mas a posição declarada
                    estava livre e a coluna continua legível. É um
                    AVISO: vale consertar, não impede nada.

       ilegiveis    o nome sumiu e a posição declarada pertence a outra
                    coluna. Aí a coluna volta vazia de verdade, e quem
                    depende dela precisa parar em vez de tratar o vazio
                    como resposta. */
  var recuperadas = [];
  var ilegiveis = [];

  var posicoes = definicao.colunas.map(function (c, i) {
    if (mapa[c]) return mapa[c];

    var declarada = i + 1;
    if (reivindicadas[declarada]) { ilegiveis.push(c); return 0; }

    recuperadas.push(c);
    return declarada;
  });

  var maior = 0;
  posicoes.forEach(function (p) { if (p > maior) maior = p; });

  guardado = {
    mapa: mapa,
    posicoes: posicoes,
    /* 1, 2, 3… — a ordem em que o código declara as colunas. É a
       gramática das linhas gravadas pela v2 numa aba desalinhada. */
    declaradas: definicao.colunas.map(function (c, i) { return i + 1; }),
    /* Os nomes que o cabeçalho não tinha mas a posição salvou. */
    recuperadas: recuperadas,
    /* Os nomes que nem a posição salvou: estes voltam vazios. */
    ilegiveis: ilegiveis,
    largura: Math.max(maior, 1),
    /* Verdadeiro quando a ordem física bate com a declarada. É o caso
       de toda planilha criada por esta versão, e o caminho em que a
       leitura por faixa é mais justa. */
    alinhado: posicoes.every(function (p, i) { return p === i + 1; }),
  };

  e.cabecalhos[definicao.nome] = guardado;
  guardarCabecalhos();
  return guardado;
}

/* As colunas que voltam VAZIAS porque nem o nome nem a posição
   resolveram. Vazio quer dizer que a aba está legível.

   Não confundir com `recuperadas`: essas o cabeçalho perdeu, mas a
   posição declarada salvou, e o dado continua chegando inteiro. */
function colunasIlegiveis(definicao) {
  try {
    return cabecalho(definicao).ilegiveis || [];
  } catch (erro) {
    return definicao.colunas.slice();
  }
}

/* As colunas que o cabeçalho perdeu e a posição declarada salvou.
   Vale consertar com setupRama(), mas nada está quebrado. */
function colunasRecuperadas(definicao) {
  try {
    return cabecalho(definicao).recuperadas || [];
  } catch (erro) {
    return [];
  }
}

/* Quantas colunas do começo da declaração são baratas. */
function quantasLeves(definicao) {
  var n = definicao.leves;
  if (!n || n > definicao.colunas.length) return definicao.colunas.length;
  return n;
}

/* =====================================================================
   LEITURA
   ===================================================================== */

/* =====================================================================
   DUAS GRAMÁTICAS NA MESMA ABA
   ---------------------------------------------------------------------
   Este bloco existe por causa de um problema concreto e silencioso.

   O QUE ACONTECEU
   ---------------------------------------------------------------------
   A v2 acrescentou a coluna `visibilidade` ao HOMEBREW e às CAMPANHAS.
   O setupRama põe coluna nova no FIM da aba — é a única forma de não
   mover dado de lugar. Mas o código declara `visibilidade` no MEIO da
   lista, e a v2 lia e gravava por POSIÇÃO na lista declarada.

   Numa planilha criada já na v2, os dois coincidem e nada acontece.
   Numa planilha que veio da v1, não coincidem, e a aba passou a ter
   linhas em duas gramáticas diferentes:

     linha da v1   segue o cabeçalho: …, criadoEm, atualizadoEm, rev,
                   dadosJson, e a última célula vazia
     linha da v2   segue a lista declarada: …, visibilidade, criadoEm,
                   atualizadoEm, rev, dadosJson

   Ler tudo pelo cabeçalho conserta as linhas da v1 e quebra as da v2.
   Ler tudo por posição faz o contrário. Nenhuma das duas serve sozinha.

   COMO ISTO SE RESOLVE
   ---------------------------------------------------------------------
   Cada linha diz de qual gramática ela é, e o sinal é o JSON: numa aba
   dessas há sempre uma coluna que guarda um objeto serializado, e um
   objeto serializado começa com chave. A célula que estiver com o JSON
   revela qual leitura vale para AQUELA linha.

   Nada é movido. A escolha é de leitura, e acontece só nas abas cujo
   cabeçalho está fora da ordem declarada — que o `alinhado` já sabe
   dizer. Quando a aba está alinhada, este código não roda.

   A primeira gravação numa linha da v2 reescreve todas as colunas pelo
   cabeçalho, e ela passa a ser uma linha normal. O conserto é
   progressivo e nunca precisa de uma passagem que reorganize a
   planilha inteira.
   ===================================================================== */

function pareceJson(valor) {
  var t = String(valor === undefined || valor === null ? '' : valor);
  return t.charAt(0) === '{' || t.charAt(0) === '[';
}

function posicoesParaLinha(definicao, cab, crua, deslocamento) {
  if (cab.alinhado || !definicao.json) return cab.posicoes;

  var i = definicao.colunas.indexOf(definicao.json);
  if (i < 0) return cab.posicoes;

  var porNome = cab.posicoes[i];
  var porOrdem = i + 1;
  if (!porNome || porNome === porOrdem) return cab.posicoes;

  var doNome = crua[porNome - deslocamento];
  var daOrdem = crua[porOrdem - deslocamento];

  /* O cabeçalho tem a última palavra: só quando ele NÃO aponta para um
     JSON e a ordem declarada aponta é que a linha é lida da outra
     forma. Assim uma célula vazia dos dois lados não muda nada. */
  if (pareceJson(doNome)) return cab.posicoes;
  if (pareceJson(daOrdem)) return cab.declaradas;

  return cab.posicoes;
}

/* Monta um registro a partir de uma linha crua e das posições das
   colunas que foram lidas. */
function montarRegistro(definicao, colunas, posicoes, deslocamento, crua, numeroDaLinha, leve) {
  var registro = { _linha: numeroDaLinha, _geracao: exec().geracao };
  if (leve) registro._leve = true;

  for (var i = 0; i < colunas.length; i++) {
    var p = posicoes[i];
    registro[colunas[i]] = p > 0 ? crua[p - deslocamento] : '';
  }
  return registro;
}

/* Varredura genérica: lê `colunas` de todas as linhas de dados.

   O Sheets só entrega UMA faixa retangular por chamada, então a faixa
   vai do menor ao maior número de coluna pedido. Numa planilha criada
   por esta versão as colunas leves são as primeiras e a faixa é justa;
   numa planilha antiga, cujo setupRama empurrou coluna nova para o fim,
   a faixa pode pegar mais do que o necessário. Ainda assim é correto —
   e continua sendo menos do que ler tudo, quando dá. */
function varrer(definicao, quantasColunas, rotulo) {
  var e = exec();
  var chaveDoCache = definicao.nome + '#' + rotulo;
  if (e.varreduras[chaveDoCache]) return e.varreduras[chaveDoCache];

  var folha = aba(definicao);
  var cab = cabecalho(definicao);
  var ultima = folha.getLastRow();

  if (ultima < 2) { e.varreduras[chaveDoCache] = []; return []; }

  var colunas = definicao.colunas.slice(0, quantasColunas);
  var posicoes = cab.posicoes.slice(0, quantasColunas);

  var menor = 0, maior = 0;
  posicoes.forEach(function (p) {
    if (!p) return;
    if (!menor || p < menor) menor = p;
    if (p > maior) maior = p;
  });
  if (!menor) { e.varreduras[chaveDoCache] = []; return []; }

  var valores = folha.getRange(2, menor, ultima - 1, maior - menor + 1).getValues();
  var leve = quantasColunas < definicao.colunas.length;

  var saida = valores.map(function (crua, i) {
    var daLinha = posicoesParaLinha(definicao, cab, crua, menor);
    var registro = montarRegistro(definicao, colunas, daLinha.slice(0, quantasColunas),
      menor, crua, i + 2, leve);
    if (daLinha !== cab.posicoes) registro._ordemDeclarada = true;
    return registro;
  });

  e.varreduras[chaveDoCache] = saida;
  return saida;
}

/* Todas as linhas, completas. Continua existindo porque algumas ações
   realmente precisam de tudo — mas deixou de ser o caminho padrão. */
function lerTudo(definicao) {
  return varrer(definicao, definicao.colunas.length, 'tudo');
}

/* Todas as linhas, só as colunas baratas.

   O que volta daqui serve para achar, filtrar, contar e listar. NÃO
   serve para gravar de volta: os registros vêm marcados com `_leve` e
   `atualizarLinha` recusa gravá-los, porque escrever um registro sem as
   colunas pesadas apagaria o fichaJson de alguém. */
function lerLeves(definicao) {
  var n = quantasLeves(definicao);
  if (n >= definicao.colunas.length) return lerTudo(definicao);
  return varrer(definicao, n, 'leves');
}

/* Uma linha, completa. */
function lerLinha(definicao, numeroDaLinha) {
  if (!numeroDaLinha || numeroDaLinha < 2) return null;

  var cab = cabecalho(definicao);
  var crua = aba(definicao).getRange(numeroDaLinha, 1, 1, cab.largura).getValues()[0];

  var daLinha = posicoesParaLinha(definicao, cab, crua, 1);
  var registro = montarRegistro(definicao, definicao.colunas, daLinha, 1, crua, numeroDaLinha, false);
  if (daLinha !== cab.posicoes) registro._ordemDeclarada = true;
  return registro;
}

/* Acha por qualquer coluna e devolve o registro COMPLETO.

   O caminho é varredura barata para descobrir a linha, mais uma leitura
   dessa linha. Duas chamadas ao Sheets em vez de uma, e é justamente aí
   que está o ganho: a primeira não arrasta as colunas pesadas de todo
   mundo e a segunda arrasta as de uma linha só.

   Quando a coluna procurada não está entre as leves, não há atalho: cai
   na varredura completa. */
function acharPor(definicao, coluna, valor) {
  var alvo = String(valor);
  if (!alvo) return null;

  var n = quantasLeves(definicao);
  var completo = n >= definicao.colunas.length;
  var dentroDasLeves = definicao.colunas.indexOf(coluna) >= 0 &&
                       definicao.colunas.indexOf(coluna) < n;

  if (completo || !dentroDasLeves) {
    var todos = lerTudo(definicao);
    for (var i = 0; i < todos.length; i++) {
      if (String(todos[i][coluna]) === alvo) return todos[i];
    }
    return null;
  }

  var leves = lerLeves(definicao);
  for (var j = 0; j < leves.length; j++) {
    if (String(leves[j][coluna]) === alvo) return lerLinha(definicao, leves[j]._linha);
  }
  return null;
}

/* Lê UMA coluna pesada para um punhado de linhas conhecidas.

   Duas estratégias possíveis, e a escolha entre elas é a decisão mais
   delicada deste arquivo:

     linha a linha   uma chamada por linha. Lê exatamente o que precisa
                     e nada mais, ao custo de várias viagens.
     faixa inteira   uma chamada só, da primeira à última linha pedida.
                     Uma viagem, ao custo de arrastar junto as linhas do
                     meio que ninguém pediu.

   A ESCOLHA, E A SUPOSIÇÃO POR TRÁS DELA
   ---------------------------------------------------------------------

   A conta é: a faixa desperdiça (vão − pedidas) células; as chamadas
   individuais gastam (pedidas − 1) viagens a mais. Trocar uma pela
   outra exige saber quanto vale uma viagem em células, e esse número
   depende do ambiente.

   PESO_DA_CHAMADA é essa estimativa: uma viagem ao Sheets é tratada
   como valendo cerca de vinte células pesadas desperdiçadas. Vem da
   recomendação da própria documentação do Apps Script, que insiste em
   agrupar chamadas aos serviços; NÃO vem de medição numa implantação
   real, e está escrito aqui para poder ser questionado com dados
   quando alguém os tiver.

   O comportamento que a regra produz:

     8 linhas juntas numa aba de 60   → uma faixa. Sete viagens a menos
                                        valem as células do meio.
     3 linhas espalhadas numa de 60   → três leituras. Puxar 60 fichas
                                        para ler 3 não se justifica.
     8 linhas espalhadas numa de 500  → oito leituras. A faixa aqui
                                        seria quase a aba inteira.

   E há um teto: acima de LIMITE_INDIVIDUAL leituras avulsas a faixa
   vence de qualquer jeito, porque trinta viagens numa requisição é o
   tipo de coisa que estoura o tempo de execução. */

var PESO_DA_CHAMADA = 20;
var LIMITE_INDIVIDUAL = 25;

/* `alvos` aceita números de linha ou os próprios registros devolvidos
   por lerLeves(). Os registros são a forma preferida, porque só eles
   dizem em que gramática a linha está — ver "Duas gramáticas na mesma
   aba", acima. Numa aba alinhada os dois dão no mesmo. */
function lerCelulas(definicao, alvos, coluna) {
  var saida = {};
  if (!alvos || !alvos.length) return saida;

  var cab = cabecalho(definicao);
  var indice = definicao.colunas.indexOf(coluna);
  var padrao = cab.mapa[coluna] || 0;

  /* Linhas de gramáticas diferentes ficam em colunas diferentes, então
     cada grupo é lido por conta própria. Na esmagadora maioria das abas
     existe um grupo só. */
  var grupos = {};

  alvos.forEach(function (alvo) {
    var numero = typeof alvo === 'number' ? alvo : alvo._linha;
    if (!numero) return;

    var posicao = padrao;
    if (typeof alvo === 'object' && alvo._ordemDeclarada && indice >= 0) posicao = indice + 1;
    if (!posicao) return;

    if (!grupos[posicao]) grupos[posicao] = [];
    grupos[posicao].push(numero);
  });

  Object.keys(grupos).forEach(function (posicao) {
    lerBloco(definicao, grupos[posicao], Number(posicao), saida);
  });

  return saida;
}

function lerBloco(definicao, linhas, posicao, saida) {
  var folha = aba(definicao);
  var ordenadas = linhas.slice().sort(function (a, b) { return a - b; });
  var menor = ordenadas[0];
  var maior = ordenadas[ordenadas.length - 1];
  var vao = maior - menor + 1;

  var desperdicio = vao - ordenadas.length;
  var viagensPoupadas = ordenadas.length - 1;

  var porFaixa = ordenadas.length > LIMITE_INDIVIDUAL ||
                 desperdicio <= PESO_DA_CHAMADA * viagensPoupadas;

  if (porFaixa) {
    var bloco = folha.getRange(menor, posicao, vao, 1).getValues();
    ordenadas.forEach(function (l) { saida[l] = bloco[l - menor][0]; });
    return;
  }

  ordenadas.forEach(function (l) {
    saida[l] = folha.getRange(l, posicao, 1, 1).getValues()[0][0];
  });
}

/* Uma coluna inteira, para todas as linhas de dados.

   O caso de uso é procurar por um valor quando não interessa mais nada
   da linha — saber se um id já existe, por exemplo. Ler uma coluna
   custa uma fração de ler oito.

   Devolve um mapa valor→número da linha. Valor repetido fica com a
   PRIMEIRA linha, que é a mesma escolha que um laço de busca faria. */
function lerColuna(definicao, coluna) {
  var e = exec();
  var chaveDoCache = definicao.nome + '#coluna:' + coluna;
  if (e.varreduras[chaveDoCache]) return e.varreduras[chaveDoCache];

  var posicao = cabecalho(definicao).mapa[coluna] || 0;
  var folha = aba(definicao);
  var ultima = folha.getLastRow();

  var mapa = {};
  if (posicao && ultima >= 2) {
    var valores = folha.getRange(2, posicao, ultima - 1, 1).getValues();
    for (var i = 0; i < valores.length; i++) {
      var v = String(valores[i][0]);
      if (v !== '' && mapa[v] === undefined) mapa[v] = i + 2;
    }
  }

  e.varreduras[chaveDoCache] = mapa;
  return mapa;
}

/* O número da linha em que um valor aparece, ou zero. */
function linhaDe(definicao, coluna, valor) {
  var mapa = lerColuna(definicao, coluna);
  var linha = mapa[String(valor)];
  return linha || 0;
}

/* =====================================================================
   ESCRITA
   ---------------------------------------------------------------------
   Toda gravação passa por aqui, e toda gravação invalida as varreduras
   da aba tocada. Sem isso, a leitura seguinte dentro da MESMA execução
   devolveria o estado anterior — o tipo de erro que só aparece quando
   duas coisas acontecem na mesma requisição.
   ===================================================================== */

function invalidar(definicao) {
  var e = exec();
  var prefixo = definicao.nome + '#';
  Object.keys(e.varreduras).forEach(function (k) {
    if (k.indexOf(prefixo) === 0) delete e.varreduras[k];
  });
}

function linhaCrua(definicao, registro) {
  var cab = cabecalho(definicao);
  var crua = [];
  for (var i = 0; i < cab.largura; i++) crua.push('');

  definicao.colunas.forEach(function (c, i) {
    var p = cab.posicoes[i];
    if (!p) return;
    crua[p - 1] = registro[c] === undefined ? '' : registro[c];
  });

  return crua;
}

function inserir(definicao, registro) {
  aba(definicao).appendRow(linhaCrua(definicao, registro));
  invalidar(definicao);
}

/* O número da linha guardado num registro é uma referência que pode
   envelhecer: basta alguém apagar uma linha acima dele. Enquanto a
   trava está com esta execução isso não acontece — e é por isso que o
   registro carrega a geração em que foi lido.

   Mesma geração: a linha é a que se pensa que é, e grava direto.
   Geração diferente: confere a coluna-chave antes de escrever, e se
   ela não bater, procura o registro de novo pelo id. Uma célula lida a
   mais é barato; gravar a ficha de alguém por cima da de outra pessoa
   não tem conserto. */
function atualizarLinha(definicao, numeroDaLinha, registro) {
  if (registro && registro._leve) {
    throw new Error('Gravação recusada: registro de ' + definicao.nome +
      ' foi lido sem as colunas pesadas e gravá-lo apagaria o conteúdo.');
  }

  var linha = conferirLinha(definicao, numeroDaLinha, registro);
  if (!linha) {
    throw new Error('Gravação recusada: a linha de ' + definicao.nome +
      ' não corresponde mais ao registro ' + registro[definicao.chave] + '.');
  }

  var cab = cabecalho(definicao);
  aba(definicao).getRange(linha, 1, 1, cab.largura).setValues([linhaCrua(definicao, registro)]);
  invalidar(definicao);
}

/* Grava só algumas colunas de uma linha que já existe.

   Existe para um caso concreto: trocar a foto de um personagem. Pela
   via normal seria preciso ler a linha inteira — inclusive a imagem
   ANTIGA, quinze mil caracteres que vão ser jogados fora — só para
   devolvê-la completa com um campo diferente. Aqui a imagem velha nunca
   é lida.

   O Sheets entrega uma faixa retangular por chamada, então as colunas
   pedidas são agrupadas em corridas contíguas: campos vizinhos saem
   numa gravação só. A conferência da linha é a mesma de
   `atualizarLinha` — gravar por cima do registro errado é o erro que
   esta camada existe para não cometer. */
function atualizarCampos(definicao, registro, campos) {
  /* Gravar SÓ algumas colunas de uma linha escrita na outra gramática
     deixaria a linha metade numa e metade noutra. A gravação completa
     normaliza; a parcial não pode. Hoje nenhuma aba com coluna JSON usa
     este caminho, então isto é uma trava para o futuro — e falha alto
     em vez de corromper em silêncio. */
  if (registro && registro._ordemDeclarada) {
    throw new Error('Gravação parcial recusada em ' + definicao.nome +
      ': a linha está na ordem antiga e precisa ser regravada inteira.');
  }

  var linha = conferirLinha(definicao, registro._linha, registro);
  if (!linha) {
    throw new Error('Gravação recusada: a linha de ' + definicao.nome +
      ' não corresponde mais ao registro ' + registro[definicao.chave] + '.');
  }

  var mapa = cabecalho(definicao).mapa;

  var pares = campos
    .map(function (c) { return { coluna: mapa[c] || 0, valor: registro[c] === undefined ? '' : registro[c] }; })
    .filter(function (par) { return par.coluna > 0; })
    .sort(function (a, b) { return a.coluna - b.coluna; });

  if (!pares.length) return;

  var folha = aba(definicao);
  var corrida = [pares[0]];

  function despejar() {
    var inicio = corrida[0].coluna;
    folha.getRange(linha, inicio, 1, corrida.length)
      .setValues([corrida.map(function (par) { return par.valor; })]);
  }

  for (var i = 1; i < pares.length; i++) {
    if (pares[i].coluna === corrida[corrida.length - 1].coluna + 1) {
      corrida.push(pares[i]);
      continue;
    }
    despejar();
    corrida = [pares[i]];
  }
  despejar();

  invalidar(definicao);
}

function conferirLinha(definicao, numeroDaLinha, registro) {
  var e = exec();
  if (registro && registro._geracao === e.geracao) return numeroDaLinha;

  var chave = definicao.chave;
  if (!chave || registro[chave] === undefined) return numeroDaLinha;

  var posicao = cabecalho(definicao).mapa[chave] || 0;
  if (!posicao) return numeroDaLinha;

  var atual = aba(definicao).getRange(numeroDaLinha, posicao, 1, 1).getValues()[0][0];
  if (String(atual) === String(registro[chave])) return numeroDaLinha;

  /* A linha se mexeu. Procura de novo — e desta vez sem cache, porque o
     cache é justamente o que pode estar errado. */
  invalidar(definicao);
  var achado = acharPor(definicao, chave, registro[chave]);
  return achado ? achado._linha : 0;
}

function apagarLinha(definicao, numeroDaLinha) {
  aba(definicao).deleteRow(numeroDaLinha);
  invalidar(definicao);
}

/* Apaga várias linhas de uma vez, de baixo para cima.

   A ordem não é estética: apagar a linha 5 puxa a 6 para o lugar dela.
   Indo do fim para o começo, cada número continua valendo quando chega
   a sua vez. */
function apagarLinhas(definicao, linhas) {
  var ordenadas = (linhas || []).slice().sort(function (a, b) { return b - a; });
  var folha = aba(definicao);
  ordenadas.forEach(function (l) { folha.deleteRow(l); });
  if (ordenadas.length) invalidar(definicao);
  return ordenadas.length;
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

   O QUE MUDOU NESTA VERSÃO, E POR QUÊ
   ---------------------------------------------------------------------

   A trava do Apps Script é do SCRIPT INTEIRO. Não existe trava por
   linha, por aba ou por registro — a plataforma não oferece isso, e
   fingir que oferece seria pior do que não ter. Com vinte pessoas, toda
   gravação do sistema passa por esta fila, uma de cada vez.

   Como a fila é inevitável, o que dá para encurtar é o tempo de cada
   um dentro dela. Duas mudanças:

   1. Ao OBTER a trava, as varreduras são esquecidas. O que for lido de
      dentro da região crítica é lido agora, e não aproveitado de antes
      de entrar na fila. Sem isto, o cache por execução viraria um jeito
      elegante de reintroduzir a condição de corrida que o `rev`
      existe para evitar.

   2. O que dá para fazer antes de entrar, é feito antes de entrar:
      serializar JSON, medir tamanho, validar formato. Só a leitura da
      revisão, a decisão e a escrita ficam dentro.
   ===================================================================== */

var ESPERA_TRAVA_MS = 25000;

function comTrava(fn) {
  var trava = LockService.getScriptLock();

  if (!trava.tryLock(ESPERA_TRAVA_MS)) return { ok: false, erro: 'ocupado' };

  esquecerVarreduras();

  try {
    return fn();
  } finally {
    trava.releaseLock();
  }
}

/* =====================================================================
   CACHE ENTRE EXECUÇÕES
   ---------------------------------------------------------------------
   O CacheService sobrevive à requisição; a memória da execução, não.
   Isso o torna útil e perigoso pelo mesmo motivo, então este arquivo
   oferece só o encanamento, e cada uso decide a política — chave,
   validade e invalidação — no lugar onde a regra mora.

   Três limites que valem para todo uso, sem exceção:

   1. O cache NUNCA é a única fonte de um dado essencial. Se ele vier
      vazio, o caminho da planilha precisa existir e funcionar. O Google
      descarta entradas quando quer, e um sistema que depende de o cache
      estar lá é um sistema que quebra sem aviso.

   2. Nada privado vai para uma chave que outra pessoa consiga formar.
      Chave derivada de segredo de quem pede, ou nada.

   3. Cache não substitui persistência, controle de concorrência nem
      idempotência. Ele acelera; não decide.

   A ÉPOCA
   ---------------------------------------------------------------------
   Um número guardado em Script Properties e carimbado em toda entrada
   de cache que dependa de identidade ou permissão. Trocar senha,
   desativar conta ou mexer em participantes incrementa esse número —
   e toda entrada carimbada com o valor anterior deixa de valer na hora,
   sem precisar procurar e apagar chave por chave, o que o CacheService
   não permite fazer.

   É grosso: uma revogação invalida o cache de todo mundo. É também
   raro, e o custo de errar para este lado é uma leitura a mais.
   ===================================================================== */

function epoca() {
  return String(propriedade('RAMA_EPOCA', '1'));
}

function avancarEpoca() {
  var atual = Number(propriedade('RAMA_EPOCA', '1')) || 1;
  definirPropriedade('RAMA_EPOCA', String(atual + 1));
}

function cache() {
  return CacheService.getScriptCache();
}

/* Ler, gravar e apagar sem nunca deixar o cache derrubar a requisição.
   Uma falha do CacheService é um cache que não ajudou, não um erro. */
function cacheLer(chave) {
  try { return cache().get(chave); } catch (erro) { return null; }
}

function cacheGravar(chave, valor, segundos) {
  try { cache().put(chave, valor, segundos); } catch (erro) { /* seguiu sem cache */ }
}

function cacheApagar(chave) {
  try { cache().remove(chave); } catch (erro) { /* seguiu sem cache */ }
}

/* =====================================================================
   JSON
   ---------------------------------------------------------------------
   JSON corrompido numa célula não pode derrubar a resposta inteira: a
   ficha volta vazia, a pessoa vê que algo se perdeu e o log guarda o
   motivo. Melhor uma ficha em branco do que um 500.
   ===================================================================== */

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
