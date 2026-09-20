/* =====================================================================
   R.A.M.A. — versão
   =====================================================================
   A FONTE ÚNICA da versão do sistema.

   O primeiro registro do CHANGELOG é SEMPRE a versão atual. Não existe
   nenhuma outra constante, em nenhum arquivo, dizendo qual versão o
   R.A.M.A. está — o rodapé, a tela de changelog e qualquer coisa que
   venha depois leem daqui. Assim tela e histórico não têm como
   divergir, que é o defeito clássico de versão escrita à mão em dois
   lugares.

   ---------------------------------------------------------------------
   TRÊS COISAS DIFERENTES, QUE NÃO SE MISTURAM
   ---------------------------------------------------------------------

     versão do aplicativo   está aqui. É o que a pessoa vê: v2.16.0.
     schemaVersion          está em js/ficha.js. É o formato da FICHA,
                            e só sobe quando a ficha muda de forma.
     versaoFormato          está em js/config.js. É o formato dos
                            arquivos de importação/exportação.

   Elas sobem em ritmos próprios. A v2.16.0 leva schemaVersion 8 e
   versaoFormato 1 — e isso é normal: a v2.15 mudou ONDE a ficha é guardada
   (em blocos, no backend) e a v2.16 mudou como ela é ACHADA e o que o painel
   lê para desenhar um cartão. Nenhuma das duas mudou o que é uma ficha, então
   nem o formato da ficha nem o dos arquivos de importação mudaram. A forma de guardar tem a
   própria versão, no manifesto de cada ficha (`formato: "blocos"`,
   `versao: 1` — ver docs/DATABASE.md). A última subida de schema com
   migração foi a v2.14.0: o texto longo do ritual saiu de `efeito` e foi
   para `descricao`, junto com o rótulo personalizado.

   ---------------------------------------------------------------------
   A REGRA, PARA TODA ENTREGA FUTURA
   ---------------------------------------------------------------------

     PATCH  X.Y.(Z+1)  correções, ajustes visuais, textos, refinos
     MINOR  X.(Y+1).0  funcionalidades, telas, sistemas novos
     MAJOR  (X+1).0.0  reformulação estrutural, nova fase do projeto

   Ao subir MINOR, Z volta a 0. Ao subir MAJOR, Y e Z voltam a 0.
   Nunca carregue os números de baixo (v1.4.7 → v1.5.0, jamais v1.5.7).

   UMA ENTREGA = UM REGISTRO NOVO NO TOPO. Não se cria uma versão por
   microalteração, e o conjunto é classificado pela mudança mais
   relevante que ele contém.

   O codinome é uma palavra, em maiúsculas, sem número e sem espaço, e
   não se repete. Os temas são os do R.A.M.A.: arquivo, registro,
   ramificação, nó, linha, rede, multiverso, anomalia — nunca os do
   projeto que serviu de referência.
   ===================================================================== */

(function (global) {
  "use strict";

  /* Ordem de exibição das categorias. Categoria vazia não aparece. */
  var CATEGORIAS = [
    "Adicionado", "Alterado", "Melhorado", "Corrigido",
    "Removido", "Visual", "Conteúdo", "Performance", "Técnico",
  ];

  var CHANGELOG = [
    {
      versao: "2.16.0",
      codinome: "PISTA",
      data: "20/09/2026",
      mudancas: {
        "Performance": [
          "Abrir a mesa deixou de carregar as fichas. O painel desenha os cartões a partir de um resumo gravado junto com cada ficha, em vez de abrir as oito fichas inteiras e jogar fora quase tudo: numa mesa de oito personagens, o que atravessa a planilha caiu de 525 KB para 27 KB, e o que o navegador baixa, de 124 KB para 6,6 KB. Os números do cartão continuam sendo calculados pelas mesmas regras, no navegador.",
          "As fotos e os avatares saíram das listagens. Em vez da imagem, a listagem manda a VERSÃO dela, e o navegador pede em lote só as que ainda não tem — começando pelos cartões que estão à vista. O que já foi baixado fica guardado no aparelho e só é buscado de novo quando a imagem muda. \"Meus personagens\" caiu de 60 KB para 1,1 KB de resposta; o editor de participantes, de 61 KB para 2,5 KB.",
          "Uma página do histórico deixou de custar o histórico inteiro. Antes, mostrar 25 rolagens varria as 1.500 linhas da aba; agora um índice de uma coluna acha as rolagens da campanha e a página lê só o que vai mostrar — de 254 KB para 65 KB, e a décima página custa menos do que a primeira custava.",
          "Abrir uma ficha ficou mais barato: o manifesto passou a guardar ONDE os blocos estão, e a leitura vai direto lá em vez de varrer a aba de blocos inteira (9 → 7 chamadas). Salvar também (20 → 17), e a aba parou de crescer a cada gravação: a ficha roda entre as mesmas faixas de linhas.",
          "Abrir uma campanha carrega a aba que está aberta, e só ela: a Visão geral mostra participantes, não fichas, então a mesa passou a ser buscada quando alguém abre Personagens, Combate ou Notas. O lote de abertura caiu de 558 KB para 35 KB.",
        ],
        "Adicionado": [
          "Medição de verdade, para quando \"está lento\": ligarDiagnostico(), no editor do Apps Script, faz cada requisição registrar quanto tempo passou no servidor, quantas chamadas à planilha ela fez, quantas fichas remontou e quanto do cache acertou. No navegador, RAMARede.medicoes() separa o tempo do servidor do tempo de rede. Desligado por padrão, não grava nada na planilha e não registra token, nome nem conteúdo de ficha.",
          "reconstruirResumos(), no editor: refaz em lote o resumo do painel das fichas gravadas antes desta versão, 25 por vez, com ponto de retomada. Não é obrigatório — cada ficha ganha o dela na próxima gravação.",
        ],
        "Alterado": [
          "O botão do histórico diz \"Carregar mais\", sem contar quantas faltam. Contar exigia varrer o histórico inteiro a cada página — e, para quem não é mestre, a conta ainda incluía as rolagens ocultas, que essa pessoa nem vê.",
          "Um cartão da mesa continua de pé mesmo que os blocos daquela ficha se percam: ele mostra os últimos números confirmados, e o erro aparece ao abrir ou ajustar a ficha, que são os caminhos que tocam o conteúdo. Sem resumo gravado, o cartão volta a dizer que a ficha não se montou, como na v2.15.",
          "Desfazer a última gravação (restaurarGeracaoAnterior) também acerta o cartão da mesa, em vez de deixá-lo mostrando o que foi desfeito.",
        ],
        "Corrigido": [
          "O histórico podia pular uma rolagem ao carregar mais. A página seguinte era pedida por posição (\"pule 25\"), e uma rolagem nova no topo empurrava todas uma casa. Agora ela é pedida por cursor — \"mais velhas que esta\" —, e nada é repetido nem pulado, nem com a mesa rolando dados enquanto alguém lê.",
        ],
        "Técnico": [
          "Requer nova implantação dos três .gs e setupRama(), que acrescenta a coluna `resumo` em PERSONAGENS. Nenhuma ficha é convertida e nada é apagado; rodar duas vezes dá o mesmo resultado. Sem o setup, o painel funciona como na v2.15 (remontando as fichas) e conferirInstalacao() avisa.",
          "Site e servidor mudam juntos duas respostas: as listagens mandam a versão da foto e do avatar em vez da imagem, e o histórico pagina por cursor. Site antigo com servidor novo mostra as iniciais no lugar das fotos e um \"Carregar mais\" que repete a primeira página; publique os dois na mesma janela.",
          "A gravação de ficha parou de APAGAR linhas na aba de blocos: ela deixa em branco a faixa que saiu de circulação e escreve a geração nova nela. Apagar deslocaria todas as linhas de baixo e envelheceria o localizador das outras fichas. Quem apaga é limparBlocosOrfaos(), que agora recolhe também as linhas em branco — e, depois dela, a primeira leitura de cada ficha usa o índice e a gravação seguinte grava a pista nova.",
          "Ficam vivas três faixas por ficha: a que vale, a anterior (ponto de volta) e a reutilizável, que é onde a próxima gravação escreve. Uma gravação que morre no meio estraga só a reutilizável — a que vale e o ponto de volta ficam inteiros.",
          "O diretório de contas (id → nome) virou uma entrada de cache de cinco minutos, no lugar de quatro varreduras da aba USUARIOS por tela. Ele guarda usuário, nome e se a conta está ativa; nada mais. Trocar o próprio nome apaga a entrada na hora.",
          "testes/medir.js ganhou cenários (cache vazio e aquecido, ficha de 300 KB, mesa de dois e de oito, avatares), a opção --backend para medir outra versão sobre os mesmos dados e --comparar para pôr as duas lado a lado.",
          "Testes: 1561 no modelo, 805 no backend (104 novas) e 214 no transporte do frontend (20 novas). Vinte e uma mutações propositais nas garantias novas; vinte foram pegas por algum teste.",
        ],
      },
    },
    {
      versao: "2.15.0",
      codinome: "MOSAICO",
      data: "18/09/2026",
      mudancas: {
        "Corrigido": [
          "Ficha grande deixava de salvar. A ficha inteira morava numa célula da planilha, e a célula do Google aceita 50 mil caracteres: passando de ~45 mil, o servidor recusava a gravação e o site tentava de novo para sempre, sem dizer por quê. Agora a ficha é guardada em blocos e salva, reabre e é editada inteira — nada é cortado e ninguém precisa simplificar a ficha.",
          "Ficha corrompida abria em branco. Um JSON ilegível virava uma ficha vazia na tela — e uma ficha vazia na tela é uma ficha que alguém edita e salva por cima da original. Agora a leitura confere o conteúdo e, se ele não se montar, a ficha não abre: aparece o motivo, e nada é gravado por cima.",
          "A resposta perdida virava conflito com a própria gravação. Quando o servidor terminava de gravar mas a resposta não chegava ao navegador, a nova tentativa era acusada de conflito (e o painel do mestre dizia que o recurso tinha \"mudado em outro aparelho\"). Agora cada gravação leva um id de operação, a repetição é o mesmo pedido, e o servidor a reconhece sem aplicar de novo.",
          "No painel do mestre, um clique feito enquanto um ajuste falhava no caminho podia ser descartado. A fila agora repete o ajuste que falhou e manda o clique mais novo em seguida.",
        ],
        "Adicionado": [
          "A ficha em blocos: uma aba nova, PERSONAGENS_BLOCOS, guarda cada ficha em quantos pedaços forem precisos, todos abaixo do limite seguro da célula, com um manifesto na linha do personagem (geração, quantidade de blocos, tamanho e SHA-256 do texto). Cada gravação escreve uma geração nova, confere o que a planilha guardou e só então troca o manifesto, numa gravação de uma linha — uma falha no meio deixa a versão anterior inteira.",
          "Limite total de uma ficha: 1 milhão de caracteres (antes, os 45 mil de uma célula). Acima dele a gravação é recusada com o tamanho e o limite na mensagem, nada se perde na tela e o site para de insistir sozinho — oferecendo exportar a ficha.",
          "Exportar ficha ganhou \"Baixar arquivo\": a ficha vem num .json pronto, em vez de só uma caixa de texto para copiar — a cópia de segurança de uma ficha grande.",
          "Ferramentas no editor do Apps Script: diagnosticarPersonagem(id) diz como a ficha está guardada e se ela se monta (sem imprimir o conteúdo); restaurarGeracaoAnterior(id) faz a versão anterior voltar a valer, depois de conferi-la; limparBlocosOrfaos() recolhe os blocos que nenhuma ficha aponta. conferirInstalacao() passa a avisar quando há blocos sem dono.",
        ],
        "Alterado": [
          "Toda leitura e gravação de ficha passa por uma camada só no backend — abrir, criar, salvar, duplicar, importar, excluir, o ajuste rápido do mestre, o resumo de recursos, os cartões da mesa e os recursos do combate. O navegador continua recebendo a ficha inteira, como antes, sem saber de blocos.",
          "A ficha antiga não é convertida de uma vez: ela continua abrindo como sempre e passa para blocos sozinha na próxima gravação que der certo.",
          "O vínculo de campanha passa a valer pela coluna do personagem, que é a que decide permissão: tirar ou pôr uma ficha numa mesa grava só colunas, sem reler nem reescrever a ficha, e a ficha aberta mostra sempre o vínculo da coluna.",
          "Uma ficha que não se monta aparece no painel da mesa como tal, sem números nem botões de ajuste — e as outras fichas da mesa continuam carregando.",
          "As mensagens de erro de gravação dizem o motivo (limite total, ficha que não se monta, arquivo que não confirmou a gravação) sem nunca sugerir apagar habilidades, rituais ou anotações.",
          "Criar, importar e duplicar personagem podem ser repetidos com segurança quando a resposta demora: a mesma criação chegando de novo devolve o personagem que a primeira criou.",
        ],
        "Performance": [
          "Abrir e salvar uma ficha custam mais chamadas à planilha, contadas no simulador: salvar 13 → 18, abrir 5 → 9, ajuste do mestre 9 → 17 — o preço de conferir cada gravação e cada leitura. Os blocos de uma ficha nascem lado a lado e são lidos numa chamada; a limpeza reaproveita a varredura já feita; a grade da aba só é consultada quando a gravação não cabe. A listagem de personagens não mudou e não toca nos blocos.",
        ],
        "Técnico": [
          "Requer nova implantação do Apps Script (os três .gs) e setupRama(), que cria a aba PERSONAGENS_BLOCOS, a coluna armazenamento no fim de PERSONAGENS e o formato texto do conteúdo dos blocos. Nenhuma ficha é convertida, nenhuma aba, linha ou coluna é apagada ou movida, e rodar duas vezes dá o mesmo resultado. Sem o setup, as fichas antigas abrem e nenhuma salva (instalacao_incompleta).",
          "Cada bloco é gravado entre marcadores e a coluna é texto puro: um pedaço de JSON nunca vira fórmula, número ou data. O corte nunca parte um emoji ao meio.",
          "comTrava() passa a chamar SpreadsheetApp.flush() antes de soltar a trava: o Apps Script guarda as escritas num buffer, e sem isto a próxima execução podia ler a planilha sem elas — e a resposta \"salvo\" sair antes de a gravação existir.",
          "O cache de cabeçalhos das abas passa a ter a assinatura das colunas declaradas na chave. Sem isso, voltar a implantação para a v2.14 com o mapa da v2.15 no cache apagaria o manifesto das fichas em blocos na primeira gravação — conferido rodando o backend real da v2.14 sobre a mesma planilha simulada. Voltar a uma versão anterior continua desaconselhado: ela não abre as fichas em blocos (o site avisa que o servidor precisa ser atualizado), mas o manifesto e os blocos sobrevivem, e reimplantar a v2.15 devolve tudo.",
          "O simulador do Apps Script dos testes faz o que o Google faz: recusa célula acima de 50 mil caracteres, converte texto em fórmula, número ou booleano, troca meio emoji por U+FFFD, tem grade de linhas, não deixa apagar todas as linhas, e permite derrubar uma chamada ou pôr outra execução no meio de uma leitura. Com ele, o defeito original aparece nos testes.",
          "Testes: 1546 no modelo (as 15 a mais são as conferências do versionamento sobre este registro), 701 no backend (232 novas) e 194 no transporte do frontend (43 novas). Dezoito mutações propositais na camada de blocos e cinco no salvador e na fila, cada uma pega por algum teste.",
        ],
      },
    },
    {
      versao: "2.14.1",
      codinome: "HOSPEDEIRO",
      data: "17/09/2026",
      mudancas: {
        "Corrigido": [
          "Trilha Possuído: a ficha deixava escolher poder de ocultista. “Sempre que receber um novo poder de ocultista, em vez disso você recebe o poder Transcender” (Poder Não Desejado, Sobrevivendo ao Horror, p. 28). Agora as seis vagas de poder de ocultista — e o poder de ocultista da Versatilidade, que é a mesma coisa por outra porta — só aceitam Transcender: a tela mostra Transcender sozinho, com o motivo e a fonte escritos.",
          "Poder geral entra na troca, porque o Sobrevivendo ao Horror o define como poder de todas as classes (p. 33): recebê-lo seria receber um poder de ocultista.",
          "O que não é poder de ocultista continua livre para o Possuído: o primeiro poder de outra trilha (na Versatilidade e em Ele Me Ensina), poder de outra classe e poder paranormal. E o Transcender recebido pela troca custa a Sanidade daquele aumento de NEX, como qualquer outro.",
          "Ficha feita antes, ou troca de trilha: a escolha antiga NÃO é apagada. Fica marcada com o motivo, os efeitos dela ficam suspensos, e a mesa pode mantê-la com “Manter mesmo assim”.",
        ],
        "Alterado": [
          "O resumo de Poder Não Desejado traz os números do livro: 3 pontos de possessão mais 2 por Transcender, gasto até a Presença por turno, 10 PV ou 2 PE por ponto e 1 ponto de volta ao dormir. Os pontos de possessão continuam com a mesa — a ficha não tem esse recurso, e a habilidade diz isso.",
          "Vaga de escolha com uma opção só não mostra mais busca, filtros nem contagem.",
        ],
        "Técnico": [
          "Com NEX & Experiência ligada a troca não é aplicada: Transcender deixa de ser poder de classe (SAH p.98) e não sobra poder para receber no lugar. O livro não resolve o encontro das duas regras; a vaga fica livre, e a divergência está nas lacunas de docs/ORDEM-REGRAS.md.",
          "Mudaram só js/ordem/progressao.js, js/ordem/poderes.js e js/paginas/ordem-escolhas.js. Sem backend e sem schema: esta versão não pede nova implantação do Apps Script (a da v2.14.0 continua necessária para a biblioteca Homebrew de rituais).",
          "Testes: 1531 verificações no modelo (44 novas), 469 no backend, 151 no transporte do frontend e 131 na página testes/biblioteca.html.",
        ],
      },
    },
    {
      versao: "2.14.0",
      codinome: "COMPÊNDIO",
      data: "17/09/2026",
      mudancas: {
        "Adicionado": [
          "Aba Rituais da ficha de Ordem: botão “Da biblioteca”, no mesmo padrão das outras bibliotecas, com duas origens — Ordem Paranormal (o catálogo dos dois livros) e Homebrew (os rituais da própria conta e os que outras contas publicaram). Criar ritual à mão continua exatamente como era.",
          "Catálogo oficial com 98 rituais: os 82 do livro básico (toda a Lista de Rituais, p. 122–143) e os 16 do Sobrevivendo ao Horror (p. 48–56). Cada entrada traz elemento, círculo, execução, alcance, alvo, área ou efeito, duração, resistência, resumo em redação própria, as versões que existem, os requisitos, o custo em PE e o livro com a página.",
          "Filtros do material: elemento (Conhecimento, Energia, Morte, Sangue, Medo e “Todos”), círculo (1º ao 4º e “Todos”) e livro, que só aparece porque há duas fontes. Cada filtro mostra quantos resultados tem contando os outros, a busca ignora acento e maiúsculas, e a busca, os filtros e a posição da lista continuam onde estavam depois de cada inclusão.",
          "Cada resultado mostra nome, elemento e círculo, com custo, execução, alcance e duração de relance; abrir mostra os campos, os efeitos, as versões com o custo adicional e o total, os requisitos, as regras que acompanham (componentes, Custo do Paranormal, Invocando o Medo) e o que a ficha faz — ou não faz — com aquele ritual.",
          "“Adicionar à ficha” preenche os campos e as versões de uma vez, sem copiar descrição nem cadastrar dano à mão. Adicionar NÃO é conjurar: nenhum PE é gasto, nenhum dado é rolado, nenhum efeito é aplicado, e a confirmação diz isso. Um clique duplo não vira dois registros; incluir de novo, de propósito, cria outra cópia com id independente e a janela informa quantas já existem.",
          "Rolagens por versão, com tipo: dano continua dano, cura aparece como cura (“Cura — Ritual · Versão”, no mostrador e no histórico da campanha) e o que não é nem um nem outro aparece com o rótulo do livro (PV temporários, dado de auxílio). Ritual sem expressão de dados não ganha botão nenhum — dos 98, 61 não têm dado para rolar.",
          "Avisos da ficha ao consultar um ritual, sem bloquear nada: círculo acima do que a classe conjura, custo total além do limite de PE por turno, forma avançada que pede afinidade, preço em Sanidade dos rituais de Medo e a DT de resistência da ficha (10 + nível de exposição + Presença, OPRPG p. 121).",
          "Campos novos no ritual, nas duas fichas: Elemento, Execução, Área, Resistência e Descrição. Alvo, Área e Efeito são três campos diferentes, como no livro — um ritual usa o que precisa. Os rótulos continuam configuráveis por seção.",
          "Editor de versões com dano extra (a parte fixa de um 3d4+3), custo adicional em PE, requisito e o que a versão muda em relação à básica. As rolagens que vieram do catálogo são preservadas e mostradas.",
          "Homebrew de rituais: o tipo `ritual` existe na biblioteca, com o MESMO editor e o mesmo schema da ficha. “Enviar à biblioteca” aparece no menu de cada ritual da ficha, e a página Homebrew lista, cria e edita rituais como faz com itens, criaturas e habilidades.",
        ],
        "Alterado": [
          "O texto longo do ritual saiu do campo “Efeito” e passou para “Descrição”, porque “Efeito:” é uma das linhas do livro (o que o ritual cria). A ficha antiga é migrada na leitura: o texto vai para Descrição e o rótulo personalizado vai com ele — quem chamava o campo de “O que faz” continua vendo “O que faz”. Nada é apagado.",
          "A faixa de rolagens do cartão do ritual mostra o tipo de cada uma e o custo em PE da forma básica e das versões avançadas.",
          "O estado vazio da aba Rituais oferece os dois caminhos: criar à mão ou abrir a biblioteca.",
        ],
        "Conteúdo": [
          "Livro básico: os 82 rituais do capítulo (Conhecimento 19, Energia 19, Morte 19, Sangue 19 e Medo 9, contando Amaldiçoar Arma nos quatro elementos em que o livro a coloca), com as formas discente e verdadeira que cada um tem.",
          "Sobrevivendo ao Horror: os 16 rituais novos (quatro por elemento, de Conhecimento, Energia, Morte e Sangue).",
          "Divergências registradas entrada por entrada: Milagre Ionizante impresso como 3º círculo num capítulo com um ritual por círculo, Deflagração de Energia sem duração e com dano “3d10 x 10”, Eco Espiral e Transfusão Vital sem expressão fixa para rolar, Espirais da Perdição com a mesma penalidade nas duas formas avançadas, “Alvos” no plural em três rituais, “Alvo ou Área” em Dissipar Ritual e a área de Purgatório escrita como alvo.",
        ],
        "Técnico": [
          "Novos js/ordem/rituais-dados.js (o catálogo como dado puro, carregado sob demanda na primeira abertura da janela e congelado na memória), js/ordem/rituais.js (busca, filtros, apresentação, a cópia que vira ritual de ficha, o bloco `ordem` do ritual e os avisos da ficha) e js/paginas/ficha-rituais-biblioteca.js (a janela). Nenhuma página carrega o catálogo junto, e a ficha nunca o envia na gravação.",
          "listar_homebrew e salvar_homebrew aceitam o tipo `ritual`. Requer nova implantação do Apps Script (só backend/Codigo.gs mudou) — sem ela, a biblioteca de rituais Homebrew fica vazia, porque o servidor antigo grava o tipo como `item`. setupRama() não é necessário: nenhuma aba nova.",
          "schemaVersion 7 → 8, com a única migração do projeto: `efeito` → `descricao` no ritual (texto e rótulo), feita na leitura de fichas de schema 7 ou menor. Uma aba aberta na versão anterior recusa a ficha nova e pede para recarregar, em vez de gravar por cima.",
          "O editor de ritual da ficha é reaproveitado pela página Homebrew (RAMASecaoRituais.camposDoRitual), para não existirem dois formulários de ritual. RAMAUI.vazio ganhou ação secundária.",
          "Documentação: três trechos de docs/ORDEM-REGRAS.md que a v2.13.0 deveria ter atualizado (mapa dos arquivos, proteção em uso com escudo e proteção pesada, e a linha de equipamentos do SAH) não tinham sido aplicados; entraram agora.",
          "Testes: 1487 verificações no modelo (122 novas), 469 no backend (9 novas), 151 no transporte do frontend (13 novas) e a página testes/biblioteca.html, que agora cobre as duas bibliotecas no navegador — 131 verificações, 133 em largura de celular.",
        ],
      },
    },
    {
      versao: "2.13.0",
      codinome: "ALMOXARIFADO",
      data: "17/09/2026",
      mudancas: {
        "Adicionado": [
          "Inventário da ficha de Ordem: botão “Da biblioteca”, no mesmo lugar e com o mesmo desenho do da aba Habilidades, com duas origens — Ordem Paranormal (o catálogo dos dois livros) e Homebrew (os itens da própria conta e os que outras contas publicaram). Criar item à mão continua exatamente como era.",
          "Catálogo oficial com 244 entradas: 183 itens (45 armas, 9 munições, 3 proteções, 79 equipamentos gerais e paranormais e 47 itens amaldiçoados) e 61 melhorias (26 modificações e 35 maldições). Cada entrada traz nome, tipo e classificação, categoria de 0 a IV, espaços, resumo em redação própria, as propriedades mecânicas que se aplicam e o livro com a página.",
          "Cinco abas de navegação — Armas, Munições, Proteções, Geral e Itens Amaldiçoados —, com seções por dentro (armas simples, táticas e pesadas; acessórios, explosivos, operacionais e paranormais; maldições por tipo de item), busca por nome que ignora acento e maiúsculas, e filtros de fonte, tipo de equipamento, categoria e elemento. A categoria de navegação e a categoria de equipamento são campos diferentes e aparecem separadas.",
          "Cada resultado mostra um resumo compacto — dano, crítico, alcance, tipo de dano, Defesa, duração ou conteúdo da munição, categoria, espaços e a fonte — e abre os detalhes só quando alguém pede, com efeitos, requisitos, o que a ficha automatiza, o que fica no controle manual e as notas de conferência do livro.",
          "“Adicionar ao inventário” cria uma cópia independente na ficha, com id próprio e referência à origem. A quantidade aparece onde faz sentido (munição, consumível, granada, catalisador, medicamento), a confirmação é discreta, a janela continua aberta com a mesma busca e os mesmos filtros, e um clique duplo não vira dois itens — clicar de novo, de propósito, vira.",
          "Arma do catálogo alimenta os botões Ataque e Dano que já existiam: perícia de Ordem (Luta ou Pontaria, com grau e poderes), dados do atributo, arma ágil, penalidade de dados da motosserra, margem de ameaça e multiplicador, alcance, dano alternativo (duas mãos, dois canos, baioneta fixada) e a tabela de 1d6 do Arcabuz dos Moretti.",
          "Proteção do catálogo entra GUARDADA e só soma Defesa quando posta em uso. Escudo agora é um tipo próprio e acumula com a proteção vestida (OPRPG p. 62); proteção pesada em uso tira 5 das perícias que sofrem penalidade de carga.",
          "Modificações e maldições não entram como itens: no menu do item, “Modificações e maldições…” abre a biblioteca já na aba certa, mostra o que aquele item aceita e aplica como um retrato guardado nele. Categoria sobe I por modificação e II na primeira maldição (I nas seguintes), iguais não se acumulam, Reforçada não combina com Discreta, Ferrolho automático não entra em arma já automática e maldições de elementos opressores não convivem no mesmo item.",
          "Aba Inventário da ficha de Ordem: aviso quando a patente ainda não libera itens amaldiçoados, painel “Preço das maldições” com o custo de cada elemento e aviso de item que passou da categoria IV.",
          "Editor do item numa ficha de Ordem: “Como a arma ataca” (perícia, proficiência, tipo, empunhadura, alcance, tipo de dano, munição, atributo somado ao dano, ágil, automática), “Tipo de proteção” (leve, pesada ou escudo) e a lista de modificações e maldições aplicadas, com Remover.",
        ],
        "Alterado": [
          "Na ficha de Ordem, o cartão do item mostra Dano, Crítico e Defesa EFETIVOS — com o que as modificações somam — e a composição da Defesa lista a proteção e o escudo em parcelas separadas. Os valores-base continuam gravados no item, e tirar a modificação devolve os números originais.",
          "A perícia de ataque de uma arma numa ficha de Ordem passou a ser uma perícia de Ordem, escolhida no editor. Uma arma criada antes desta versão continua atacando: a ficha lê a perícia universal que ela já apontava, pelo nome, e o dano extra digitado à mão continua valendo.",
          "A ficha Universal não muda: a janela continua só com a Homebrew, sem catálogo de Ordem, e os itens dela não ganham campo novo nenhum.",
        ],
        "Conteúdo": [
          "Livro básico: Tabela 3.3 (34 armas), 3.4 (munições), 3.5 (modificações de armas e de munições), 3.6 (proteções), 3.7 (modificações de proteções), 3.8 (equipamentos gerais), 3.9 (modificações de acessórios), 3.10 (itens paranormais), os 28 itens amaldiçoados especiais e as 35 maldições para armas, proteções e acessórios (p. 144–151).",
          "Sobrevivendo ao Horror: Tabela 1.4 (11 armas e a modificação Carregador rápido), Tabela 1.5 (45 acessórios, explosivos, itens operacionais, medicamentos, catalisadores e itens paranormais, com as duas modificações do capítulo) e Tabela 1.6 (19 itens amaldiçoados).",
          "Ficaram fora por não serem itens: coronhada, armas improvisadas e ataques desarmados, a contagem de munição opcional (que aparece como nota nas munições e nas armas de fogo) e a fabricação em campo. Onde os dois livros divergem, o catálogo segue um deles e diz qual — a picareta usa as estatísticas do Sobrevivendo ao Horror, e não as da marreta do livro básico.",
        ],
        "Técnico": [
          "Novos js/ordem/itens-dados.js (o catálogo como dado puro, carregado sob demanda na primeira abertura da janela e congelado na memória), js/ordem/itens.js (busca, filtros, apresentação, a conversão de uma entrada em item de ficha e as regras de aplicação de modificações) e js/paginas/ficha-inventario-biblioteca.js (a janela). Nenhuma página carrega o catálogo junto, e a ficha nunca o envia na gravação: o item guarda só a própria cópia.",
          "listar_homebrew aceita `tipos`: o servidor filtra por tipo antes de ler o conteúdo, e habilidade e criatura não chegam à biblioteca de itens. Requer nova implantação do Apps Script (só backend/Codigo.gs mudou) — sem ela a janela filtra no navegador e funciona igual. setupRama() não é necessário: nenhuma aba nova.",
          "schemaVersion 6 → 7, sem conversão: os campos novos do item são opcionais e uma ficha 6 abre igual. A subida impede que uma aba ainda aberta na versão anterior descarte esses campos ao gravar.",
          "Testes: 1363 verificações no modelo (198 novas), 460 no backend (13 novas), 138 no transporte do frontend (18 novas) e uma página nova — testes/biblioteca.html — que abre a janela de verdade no navegador e confere origens, busca, filtros, inclusão de cada tipo, aplicação de modificação, teclado e largura de celular (86 verificações).",
        ],
      },
    },
    {
      versao: "2.12.0",
      codinome: "VIGÍLIA",
      data: "17/09/2026",
      mudancas: {
        "Adicionado": [
          "Campanha: a mesa se atualiza sozinha. Quem está com a campanha aberta vê, sem recarregar a página, os recursos, iniciativas, rodada e turno, participantes, permissões, capa, documentos e rolagens que outra pessoa mudou. Não é tempo real: o navegador pergunta a cada ~8 s nas abas Personagens e Combate e a cada ~20 s nas outras, para de perguntar com a página escondida e espera mais depois de uma falha — uma mudança costuma chegar em 2 a 15 s.",
          "Visão geral: capa da campanha. O mestre importa uma imagem, ajusta o recorte numa prévia na proporção da faixa (aproximação e posição, arrastando ou pelas setas) e salva, troca ou remove. A capa segue a visibilidade da campanha.",
          "Aba Personagens: os jogadores veem os recursos atuais e máximos de todos os personagens da mesa — PV, PE e SAN nas fichas de Ordem, os status configurados nas universais —, editam só os dos próprios personagens e têm “Abrir ficha” só neles.",
          "Chave do mestre “Esconder status dos jogadores”, na aba Personagens: ligada, cada jogador vê os recursos só dos próprios personagens, nos cartões e na lista do combate. O servidor deixa de enviar os números dos outros, e quem está com a campanha aberta recebe a mudança sozinho.",
          "Combate: rodada e turno. “Iniciar combate” começa a rodada 1 com o primeiro da ordem; “Próximo turno” e “Voltar turno”, só do mestre, seguem a iniciativa, mudam de rodada no fim da ordem e não voltam antes do começo. O turno é guardado pelo participante e continua certo depois de recarregar, reordenar, acrescentar ou remover alguém.",
          "Combate: a ficha do participante selecionado abre num painel ao lado da lista (numa gaveta, no celular), só para o mestre. Personagem abre a própria ficha, com o mesmo salvamento e as mesmas rolagens; criatura mostra a instância deste combate, e mexer na vida dela não muda o modelo nem as outras cópias.",
          "Carregamento: toda operação com a planilha acende uma barra fina no topo, e o botão que a disparou mostra “Salvando…”, “Enviando imagem…” ou “Removendo…” até terminar, sem aceitar um segundo clique. As atualizações automáticas mostram só um selo discreto “Atualizando…”. Falha de rede oferece “Tentar de novo”.",
        ],
        "Alterado": [
          "Combate: iniciativa e vida de criatura esperam ~5 s sem nova digitação (~1,2 s para vida) e sobem juntas, num lote. A barra “Alterações pendentes” mostra quando vai salvar e tem “Salvar agora”. Enquanto houver iniciativa por enviar, turno, iniciar, encerrar e remover ficam travados, com o motivo. Trocar de aba ou esconder a página envia o que falta; fechar a página com algo pendente pede confirmação.",
          "“Quem pode ver” de cada combate saiu do menu de opções e foi para os controles abaixo da lista.",
          "Clicar no nome de um participante do combate o seleciona para consulta — não passa a vez.",
        ],
        "Corrigido": [
          "Combate: digitar várias iniciativas seguidas disparava gravações com a mesma revisão. A segunda voltava como conflito, a tela recarregava e a iniciativa ainda sendo digitada se perdia. Iniciar e encerrar também recarregavam depois de um tempo fixo, às vezes antes de a gravação terminar.",
          "Combate: um conflito real (outro mestre, outra aba) não descarta mais tudo. O que é independente é reaplicado; quando as duas pessoas mudaram o mesmo campo, a tela pergunta qual valor fica. Uma resposta perdida pela rede é repetida sem ser aplicada duas vezes — um “Próximo turno” não pula ninguém.",
        ],
        "Removido": [
          "O bloco “Panorama” da Visão geral da campanha.",
        ],
        "Técnico": [
          "Novas ações: sincronizar_campanha (marcas de cada parte da campanha, lidas do cache), ler_capa_campanha e salvar_capa_campanha (aba nova CAMPANHA_CAPAS), atualizar_resumo_personagem (o máximo de PV, PE e SAN guardado na ficha de Ordem, para a mesa) e atualizar_combate (lote de operações com rev e opId, tudo ou nada). listar_personagens_campanha e listar_combates filtram os recursos no servidor; salvar_combate preserva turno e opIds. Novos js/sincronia.js, js/combate-turnos.js (as regras de turno do servidor, conferidas pelos testes) e js/combate-fila.js; RAMAApi.aoOperar e RAMAUI.ocupar.",
          "Requer nova implantação do Apps Script com os três arquivos (Dados.gs, Codigo.gs e Campanhas.gs) e rodar setupRama() para criar a aba CAMPANHA_CAPAS, antes de publicar o site. Nada é migrado nem apagado: combates antigos em andamento começam na rodada 1 com o primeiro da ordem.",
        ],
      },
    },
    {
      versao: "2.11.1",
      codinome: "ESPELHO",
      data: "13/09/2026",
      mudancas: {
        "Corrigido": [
          "Aba Personagens da campanha: os cartões de fichas de Ordem mostravam atributos, PV, Sanidade, Defesa, Bloqueio, Esquiva e deslocamento diferentes da ficha. A página não carregava o catálogo de poderes, e o cálculo ignorava a progressão inteira — aumentos de atributo, poderes, efeitos de trilha e poderes que mudam a capacidade de carga (o que ainda punha o personagem em sobrecarga). Agora o cartão mostra os mesmos números da ficha.",
        ],
        "Técnico": [
          "campanha/index.html carrega js/ordem/poderes.js antes de progressao.js. testes/executar-frontend.js lê os scripts de cada página que calcula ficha de Ordem e compara o cartão da campanha com a ficha. Não requer nova implantação do Apps Script.",
        ],
      },
    },
    {
      versao: "2.11.0",
      codinome: "BÚSSOLA",
      data: "13/09/2026",
      mudancas: {
        "Adicionado": [
          "Criação de ficha de Ordem Paranormal: a Revisão mostra, acima de “Falta decidir”, as regras opcionais que mudam a progressão — NEX & Experiência e Evolução por Patentes —, com a mesma chave da aba Regras. Assim dá para decidir se a mesa usa NEX ou nível antes de resolver as pendências.",
          "Com NEX & Experiência ligada na criação, a Revisão e a etapa Conceito pedem nível de experiência e NEX por exposição, e as pendências passam a seguir o nível.",
        ],
        "Alterado": [
          "Na criação, ligar NEX & Experiência começa o nível no equivalente ao NEX escolhido, e desligar volta o NEX ao equivalente ao nível — o personagem fica no mesmo ponto da progressão. Com decisões já tomadas, a troca pede confirmação e não apaga nada.",
        ],
        "Corrigido": [
          "Os cartões de “Falta decidir” da criação apareciam sem estilo, com o nome colado na explicação (“TrilhaEscolha uma trilha…”).",
        ],
        "Técnico": [
          "Campo `progressao` e função `deProgressao()` em js/ordem/opcionais.js. Os estilos de .ordem-pendencia, .ordem-regra e .r-interruptor saíram de css/ficha.css para css/componentes.css, porque a criação abre na página Personagens. Não requer nova implantação do Apps Script.",
        ],
      },
    },
    {
      versao: "2.10.1",
      codinome: "CAMADA",
      data: "13/09/2026",
      mudancas: {
        "Corrigido": [
          "Na página da ficha, o menu dos três pontinhos ao lado da foto de perfil abria por baixo da barra Normal/Edição, e “Sair” ficava escondido. A navegação do topo agora fica acima dessa barra.",
        ],
      },
    },
    {
      versao: "2.10.0",
      codinome: "ALISTAMENTO",
      data: "13/09/2026",
      mudancas: {
        "Adicionado": [
          "Aba Personagens da campanha: botão “+ Adicionar personagem”, para mestre e jogadores. Ele lista os seus personagens que ainda não estão na campanha e adiciona com um clique, sem abrir a ficha. Personagem que está em outra campanha aparece com o aviso de que sai de lá.",
          "Ficha de Ordem Paranormal: seletor “Campanha” no modo edição (aba Geral, painel Identidade), o mesmo da ficha universal. No modo normal, a campanha aparece na identidade.",
          "O dono também pode tirar o próprio personagem da campanha pelo menu do cartão — antes só o mestre tinha essa opção.",
        ],
        "Alterado": [
          "O seletor de campanha das fichas mostra só as campanhas em que você é mestre ou jogador. Quem abre a ficha como mestre vê a campanha, mas não troca: para onde o personagem vai é decisão do dono.",
          "A mesa vazia sugere “Adicionar personagem” em vez de mandar a pessoa para a ficha.",
        ],
        "Corrigido": [
          "O mestre que editava a ficha de um jogador conseguia, salvando, levá-la para outra campanha dele — até uma em que o jogador nem estava. O servidor agora mantém a campanha de uma ficha salva por quem não é dono.",
          "Escolher na ficha uma campanha que você só observa parecia funcionar e era descartado ao salvar. Ela não aparece mais no seletor.",
          "A ficha guardada podia continuar dizendo uma campanha recusada pelo servidor. Agora a campanha dentro da ficha é sempre a que o servidor aceitou.",
        ],
        "Técnico": [
          "Novo RAMASecaoGeral.campoCampanha, usado pelas duas fichas; ctx.ehDono() e ctx.definirCampanha() na ficha (a troca também reaponta o histórico de rolagens). O botão da campanha usa listar_personagens e vincular_personagem, sem ação nova. Requer nova implantação do Apps Script (backend/Codigo.gs: criar_personagem e salvar_personagem).",
        ],
      },
    },
    {
      versao: "2.9.1",
      codinome: "SUTURA",
      data: "13/09/2026",
      mudancas: {
        "Visual": [
          "Nas perícias da ficha de Ordem Paranormal, os graus de treinamento passam a usar uma cor só (#402A7E) no nome e no bônus do grau: Treinado só com a cor, Veterano em negrito, Expert em negrito e itálico. O nome do grau continua escrito, e o estilo depende só do grau.",
        ],
      },
    },
    {
      versao: "2.9.0",
      codinome: "ALINHAVO",
      data: "13/09/2026",
      mudancas: {
        "Adicionado": [
          "Na ficha de Ordem Paranormal, Defesa e Movimento ganha Bloqueio (bônus de Fortitude) e Esquiva (Defesa + bônus de Reflexos), cada um com a composição aberta ao clicar.",
          "Bônus extra de Defesa, Bloqueio e Esquiva dentro da composição de cada um, com Aplicar e Zerar. Funciona no modo normal e fica guardado até alguém mudar.",
          "Perícias: no modo edição, cada perícia pode usar outro atributo (com “Restaurar atributo padrão”) e ter um bônus extra. O atributo trocado muda os dados da rolagem; o extra entra no total, na rolagem, no Bloqueio e na Esquiva.",
        ],
        "Alterado": [
          "A tabela de perícias ganhou colunas alinhadas — perícia, atributo, grau, treino, extra, total, rolagem e notas — e vira um bloco compacto por perícia no celular.",
          "O grau de treinamento tem cor própria: treinado verde, veterano azul, expert laranja, sempre com o nome escrito.",
        ],
        "Corrigido": [
          "O ícone de rolar aparecia como um quadrado vazio: os pontos do dado agora aparecem.",
        ],
        "Técnico": [
          "Bloqueio, Esquiva e os extras saem de js/ordem/regras.js e chegam iguais à ficha e aos cartões da campanha. Novos campos opcionais `ordem.bonusExtra` e `ordem.periciasAjustes`; fichas antigas leem zero e atributos padrão. Não requer nova implantação do Apps Script.",
        ],
      },
    },
    {
      versao: "2.8.0",
      codinome: "PANORAMA",
      data: "13/09/2026",
      mudancas: {
        "Alterado": [
          "A aba Personagens da campanha virou uma grade de cartões compactos: foto e identificação no topo, atributos numa linha, barras de PV, PE e Sanidade no centro, estatísticas embaixo e “Abrir ficha” no rodapé. Vários cartões por linha no desktop, um no celular.",
          "O ajuste rápido fica nas barras: [−], [+] e o número, que abre um campo (Enter confirma, Esc cancela). Os atributos continuam à vista, só para consulta — a edição deles é na ficha.",
          "“Tirar da campanha” saiu de perto dos recursos e foi para um menu separado, com confirmação. A ficha não é apagada.",
        ],
        "Corrigido": [
          "Para fichas de Ordem Paranormal, o painel mostrava e ajustava os status e atributos universais de nascimento, que a ficha de Ordem não usa. Agora mostra PV, PE, Sanidade, Defesa, PE por turno e deslocamento calculados pelas mesmas regras da ficha, e o ajuste vai para os recursos de verdade.",
          "Um ajuste do mestre que batia em conflito era reenviado mesmo quando o jogador tinha acabado de mexer no mesmo recurso. Agora ele só é reenviado se aquele recurso não mudou; se mudou, a tela mostra o valor novo e avisa.",
          "O servidor aceitava um valor vazio no ajuste rápido e o gravava como 0. Agora recusa.",
          "Uma falha ao buscar os personagens aparecia como “nenhum personagem na mesa”. Agora mostra o erro, com “Tentar novamente”.",
        ],
        "Técnico": [
          "O ajuste rápido ganha o alvo `recurso` (PV, PE e Sanidade da ficha de Ordem, só o atual) e confere, pela campanha informada, que o personagem continua vinculado a ela. Outros jogadores da mesa recebem de uma ficha de Ordem alheia só a identificação.",
          "Requer nova implantação do Apps Script (backend/Campanhas.gs).",
        ],
      },
    },
    {
      versao: "2.7.1",
      codinome: "COURAÇA",
      data: "12/09/2026",
      mudancas: {
        "Corrigido": [
          "Na ficha de Ordem Paranormal, a Defesa cadastrada numa proteção não chegava à Defesa da ficha. Agora a proteção em uso soma uma vez (a quantidade não multiplica) e aparece na composição: Base 10 + Agilidade 3 + Proteção Leve 5 = 18.",
          "O resumo do item recolhido mostrava a categoria e os espaços originais mesmo com modificadores como Mochila de Utilidades. Agora mostra os valores efetivos (Categoria: I · Espaços: 0), e os detalhes explicam a transformação e a fonte.",
        ],
        "Adicionado": [
          "Botão “Usar” no cartão das proteções, com o estado à vista: só uma proteção fica em uso por vez. Sem nenhuma em uso, a composição da Defesa explica por que a do inventário não entrou.",
        ],
        "Técnico": [
          "Cabeçalho, detalhes, carga total e limites por categoria passam a ler os mesmos valores efetivos (R.itensEfetivos). Com mais de uma unidade, o resumo separa espaços por unidade e ocupação total.",
        ],
      },
    },
    {
      versao: "2.7.0",
      codinome: "TRIAGEM",
      data: "12/09/2026",
      mudancas: {
        "Adicionado": [
          "Na ficha de Ordem Paranormal, as abas Habilidades, Rituais e Inventário têm uma barra “Ordenar” com quatro modos: Personalizada, Ordem de adição, A–Z e Z–A. O modo fica gravado na ficha e vale em qualquer aparelho.",
          "Na ordem personalizada, Subir e Descer mudam a posição de cada um — inclusive das habilidades que vêm das regras e dos itens do inventário. Com um filtro de categoria ligado, o item troca com o vizinho visível.",
          "Habilidades, pastas, itens e rituais passam a guardar quando entraram na ficha, para a ordem de adição. O que é anterior a esta versão vem primeiro, na ordem guardada.",
        ],
        "Alterado": [
          "No inventário da ficha de Ordem, a ordem padrão passa a ser a personalizada (a lista guardada) em vez de armas primeiro. A ficha universal continua como era.",
        ],
      },
    },
    {
      versao: "2.6.0",
      codinome: "VARIANTE",
      data: "12/09/2026",
      mudancas: {
        "Adicionado": [
          "Na ficha de Ordem Paranormal, as habilidades oficiais (automáticas de classe, de trilha e poderes escolhidos) podem ser editadas no modo edição. Editar cria uma versão personalizada só daquela ocorrência, naquela ficha; o catálogo e as outras fichas não mudam.",
          "A versão personalizada mantém a automação do original, e o editor diz isso. Quando o original tem efeitos na conta, dá para desativá-los naquela ocorrência, sem mexer em outros bônus nem nos ajustes manuais.",
          "Ações “Salvar na minha biblioteca Homebrew” (sempre privada) e “Restaurar versão oficial”, que volta ao texto atual do catálogo.",
          "Botão “Excluir” nas habilidades oficiais: um poder escolhido por engano tem a escolha desfeita e a etapa volta a ficar pendente; uma habilidade automática sai da lista e da conta e fica em “Habilidades oficiais excluídas”, restaurável.",
          "Etiqueta colorida opcional abaixo do nome de habilidades e itens, nas fichas Universal e de Ordem e na Homebrew, com paleta, cor personalizada e prévia no editor. É só identificação visual: não muda elemento, categoria nem nenhuma regra.",
        ],
        "Técnico": [
          "schemaVersion sobe de 5 para 6, sem converter nenhum dado: uma aba aberta com a versão anterior deixa de gravar por cima de personalizações e etiquetas.",
          "Cada aquisição de Ordem ganha um id estável (etapa + chave do poder), usado pelas personalizações e exclusões.",
        ],
      },
    },
    {
      versao: "2.5.3",
      codinome: "FRAÇÃO",
      data: "12/09/2026",
      mudancas: {
        "Alterado": [
          "Na ficha de Ordem Paranormal, os espaços por unidade de um item aceitam qualquer número a partir de 0 (0,1, 0,3, 2,75…), guardado com duas casas decimais. Antes só frações de quarto eram aceitas.",
        ],
      },
    },
    {
      versao: "2.5.2",
      codinome: "ETIQUETA",
      data: "12/09/2026",
      mudancas: {
        "Corrigido": [
          "Num cartão de item estreito, a linha de tipo e categoria ocupava a largura inteira e o nome do item sumia.",
        ],
        "Visual": [
          "Os itens do inventário mostram o nome em destaque e, logo abaixo, os dados em rótulo e valor: Categoria e Espaços na ficha de Ordem (e Quantidade, quando há mais de um), Peso na universal, Dano nas armas e Defesa nas proteções. Tipo e classificação ficam por último, mais discretos.",
          "A descrição do item aberto usa a fonte do texto corrido, maior e mais clara.",
          "Um item simples não estica mais até a altura da arma ao lado.",
        ],
      },
    },
    {
      versao: "2.5.1",
      codinome: "REALINHO",
      data: "12/09/2026",
      mudancas: {
        "Corrigido": [
          "O campo de busca das janelas (biblioteca de habilidades e de itens, escolhas da Progressão) ocupava um bloco de mais de 200px de altura. Agora tem a altura de um campo comum.",
        ],
      },
    },
    {
      versao: "2.5.0",
      codinome: "ACERVO",
      data: "12/09/2026",
      mudancas: {
        "Adicionado": [
          "Na ficha de Ordem Paranormal, o botão “Da biblioteca” da aba Habilidades mostra também as habilidades oficiais: abas de Combatente, Especialista e Ocultista (habilidades de classe, poderes e trilhas), Poderes gerais e Poderes paranormais por elemento, com busca.",
          "Cada habilidade oficial mostra origem, livro, resumo, afinidade, pré-requisitos e página, e avisa quando já está na ficha.",
        ],
        "Corrigido": [
          "Habilidades enviadas à biblioteca Homebrew eram gravadas como item e não apareciam em lugar nenhum como habilidade. As que já foram gravadas assim voltam a aparecer, sem migração.",
          "Janelas largas não passam mais da largura da tela no celular.",
        ],
        "Técnico": [
          "Requer nova implantação do Apps Script (backend/Codigo.gs) para a correção da Homebrew.",
        ],
      },
    },
    {
      versao: "2.4.2",
      codinome: "GAVETA",
      data: "12/09/2026",
      mudancas: {
        "Alterado": [
          "Na ficha de Ordem Paranormal, o painel “Carga e capacidade” saiu da aba Geral e virou o topo da aba Inventário, com a conta, o ajuste temporário e os itens por categoria logo acima dos itens.",
          "O painel “Poderes e habilidades” saiu da aba Geral: as habilidades automáticas, os poderes da trilha e os escolhidos agora ficam na aba Habilidades, na mesma lista das habilidades criadas à mão.",
        ],
      },
    },
    {
      versao: "2.4.1",
      codinome: "PREFÁCIO",
      data: "12/09/2026",
      mudancas: {
        "Alterado": [
          "A Home virou uma apresentação do R.A.M.A.: o que as fichas, a ficha de Ordem Paranormal, as campanhas e a biblioteca Homebrew fazem, e por onde começar.",
          "Cada seção tem um atalho direto para a aba correspondente, e a abertura leva a criar personagem.",
        ],
        "Removido": [
          "O painel de contagens e de últimos registros saiu da Home. Os personagens, as campanhas e a Homebrew continuam listados nas próprias abas.",
        ],
        "Visual": [
          "As ilustrações da Home são montadas com os traços da própria interface, sem imagens: acompanham a escala de texto do Perfil e funcionam no celular.",
        ],
        "Performance": [
          "A Home não consulta mais o servidor além da conferência da sessão.",
        ],
      },
    },
    {
      versao: "2.4.0",
      codinome: "ENCRUZILHADA",
      data: "12/09/2026",
      mudancas: {
        "Adicionado": [
          "Na ficha de Ordem Paranormal, cada pendência de progressão tem o seu botão — Escolher poder, Escolher atributo, Escolher perícias, Resolver — que abre a escolha certa, com as opções que cabem naquela etapa e o motivo das que não cabem.",
          "Catálogo de poderes com livro e página em cada entrada: os poderes de classe dos dois livros, os 34 poderes gerais e os 30 poderes paranormais do Livro de Regras e do Sobrevivendo ao Horror, e as habilidades das 24 trilhas — incluindo as nove trilhas novas do suplemento.",
          "Transcender, Versatilidade, Expansão de Conhecimento e outros poderes que dão poderes abrem a segunda escolha na mesma janela, com as opções internas de cada um (elemento, perícias, item, ritual).",
          "Afinidade elemental: ao chegar a NEX 50%, a escolha abre uma vez, com Conhecimento, Energia, Morte, Sangue ou um elemento Homebrew com nome. Dá para decidir depois; a pendência fica na Progressão.",
          "Chave “Aplicar regras de patente” na aba Regras. Desligada, a mesa define quantos itens de cada categoria são permitidos, e a configuração fica guardada para a próxima vez.",
          "Bônus temporário de capacidade, com sinal, no modo edição. A ficha mostra a conta inteira: capacidade calculada, ajuste e capacidade final.",
          "Itens de Ordem têm espaços, quantidade, categoria e grupo. A carga ocupada é calculada sozinha, e cada categoria mostra quantos itens usa contra o limite.",
          "Painel “Poderes e habilidades” na aba Geral, com tudo o que o personagem já recebeu, de onde veio e se entra na conta, entra em parte ou é anotação.",
        ],
        "Alterado": [
          "As habilidades de trilha deixaram de aparecer como “Falta decidir”: elas chegam sozinhas quando o NEX alcança a etapa. Só a trilha em si é escolhida.",
          "A criação guiada resolve as pendências no próprio resumo, com as mesmas janelas da ficha. Continua dando para criar o personagem com pendências em aberto.",
          "Revisar uma escolha no modo edição mostra antes o que sai, o que entra e quais escolhas posteriores deixam de cumprir requisito. Nada é apagado: o que perde requisito fica marcado, e a mesa pode manter mesmo assim.",
          "Aumentos de atributo e de grau escolhidos na progressão somam por cima do valor da ficha, com a conta aberta. Recarregar ou recalcular nunca concede o mesmo benefício de novo.",
        ],
        "Corrigido": [
          "A carga do inventário de Ordem ficava sempre em zero, porque os itens não tinham espaços. Agora cada item ocupa o que o livro diz — 1 espaço quando não informado.",
          "A origem Amnésico não deixava escolher as duas perícias da origem na criação.",
          "Mão Pesada e Para Bellum apareciam como “entra na conta” sem somar em rolagem nenhuma. Agora aparecem como anotação, que é o que são hoje.",
          "A aba Progressão ou Regras voltava para Geral ao recarregar a ficha.",
        ],
        "Técnico": [
          "Motor de progressão em js/ordem/progressao.js: cada vaga tem id estável (d3.poderClasse, b.aFavorita, afinidade), e os efeitos das escolhas são recalculados na ordem das etapas, nunca gravados.",
          "schemaVersion 5: o bloco de Ordem ganhou escolhas, afinidade, patente e o ajuste temporário de capacidade; os itens ganharam espaços, quantidade e categoria. Fichas antigas abrem sem migração.",
          "Uma página com o código anterior que abrir uma ficha gravada por esta versão avisa e pede para recarregar, em vez de gravar por cima.",
          "A sincronização junta escolhas de progressão feitas em aparelhos diferentes registro a registro. O catálogo de poderes só carrega nas páginas da ficha e da criação.",
        ],
      },
    },
    {
      versao: "2.3.1",
      codinome: "ÍNDICE",
      data: "11/09/2026",
      mudancas: {
        "Corrigido": [
          "O login recusava a senha certa quando a linha de cabeçalho da aba USUARIOS não estava com os nomes exatos. A v2.1 passou a ler as colunas pelo nome; sem o nome, hashSenha e salt voltavam vazios e nenhuma senha conferia — e a tela dizia “usuário ou senha incorretos”, sem nenhuma pista de que o problema era a planilha.",
          "Agora o nome continua mandando, e a posição declarada entra como rede quando o nome sumiu. Cabeçalho apagado, renomeado, em maiúsculas ou com uma coluna a mais na frente deixaram de trancar todo mundo para fora.",
          "Quando nem a rede pode agir — a posição declarada já pertence a outra coluna — o login recusa dizendo que a instalação está incompleta, em vez de acusar a senha. Esse aviso sai antes de procurar a conta, então ele não revela se o usuário existe.",
        ],
        "Técnico": [
          "conferirInstalacao() passou a listar, aba por aba, quais colunas voltam vazias e quais estão sendo lidas pela posição em vez do nome.",
          "Nova função de manutenção no editor do Apps Script: diagnosticarLogin(“luky”) diz se o pepper existe, se a conta foi encontrada e está ativa, se o cabeçalho está são e se a derivação da senha roda. Ela nunca imprime hash, salt nem pepper.",
        ],
      },
    },
    {
      versao: "2.3.0",
      codinome: "PARALELO",
      data: "10/09/2026",
      mudancas: {
        "Adicionado": [
          "O R.A.M.A. passou a ter dois tipos de ficha. Ao criar um personagem, você escolhe entre Ordem Paranormal — com as regras dos livros — e Universal, o modelo flexível de sempre.",
          "Ficha de Ordem Paranormal com criação guiada em seis passos, na ordem do livro: conceito, atributos, origem, classe, perícias e revisão. Dá para começar em NEX 5% ou já adiantado; a revisão reúne o que aquele NEX acumulou.",
          "PV, PE, Sanidade, Defesa, deslocamento, carga, limite de PE por turno e patente são calculados pelas regras. Todo número calculado abre a conta no clique: valor-base, cada bônus, cada penalidade e o total.",
          "As 28 perícias com atributo-base, grau de treinamento e bônus, com o dado certo em cada uma. Perícia que exige treinamento aparece travada quando você não é treinado nela.",
          "Catálogo com as 26 origens, as 3 classes, as 15 trilhas e as 5 patentes, cada entrada com o livro e a página de onde saiu.",
          "Área de Regras opcionais com as dez regras do Sobrevivendo ao Horror, uma chave para cada. Todas começam desligadas, e ligar mostra antes o que vai mudar.",
          "A regra de separar nível e NEX, implementada de verdade: com ela ligada, o nível manda em PV, PE, Sanidade, habilidades de classe e efeitos de origem, e o NEX passa a medir só a exposição ao Outro Lado.",
          "Ajustes manuais da mesa, com motivo anotado. Eles aparecem na composição do número, separados do que as regras produziram, e sobrevivem a qualquer recálculo.",
        ],
        "Alterado": [
          "Toda ficha criada até hoje continua funcionando exatamente como antes, e passa a ser identificada como Universal. Nenhum dado foi convertido, movido ou perdido.",
          "O tipo fica gravado num campo próprio. Nada no sistema adivinha o sistema pelo nome dos atributos, das seções ou do personagem.",
          "Não existe conversão automática entre os dois modelos nesta entrega. Ela teria de adivinhar o que vira o quê, e adivinhar aqui é perder trabalho em silêncio.",
        ],
        "Corrigido": [
          "Os poderes de origem com efeito numérico entram na conta sozinhos: Calejado, Cicatrizes Psicológicas, Patrulha, Mão Pesada, Para Bellum, Dedicação, Eu Já Sabia, Patrocinador da Ordem e Traços do Outro Lado.",
          "Recalcular a ficha nunca aplica o mesmo bônus duas vezes, nunca devolve recurso gasto e nunca apaga um ajuste da mesa. Valor calculado não é gravado: ele nasce da soma completa toda vez que alguém pergunta.",
        ],
        "Técnico": [
          "As regras de Ordem ficam numa camada própria, em js/ordem. A ficha Universal não sabe que ela existe e não recebeu nenhuma verificação de sistema.",
          "Habilidades, Rituais, Inventário e Anotações são as MESMAS seções nos dois tipos de ficha. Um ritual é um ritual.",
          "A rolagem de Ordem usa o motor de dados e o mostrador central de sempre — mesmo histórico de campanha, mesma idempotência, nenhum interpretador novo.",
          "A matriz de regras, com fonte, página e o que está automatizado, está em docs/ORDEM-REGRAS.md, junto com as lacunas que não foram preenchidas por dedução.",
        ],
      },
    },
    {
      versao: "2.2.0",
      codinome: "RAMIFICAÇÃO",
      data: "10/09/2026",
      mudancas: {
        "Adicionado": [
          "Rituais agora têm dano, e mais de uma versão. Cada versão tem nome e expressão próprios: Normal 6d8, Discente 10d8, Verdadeiro 14d8 — ou o que a sua mesa usar.",
          "Os nomes são livres. Crie, renomeie e remova versões à vontade; nenhum ritual é obrigado a ter Discente e Verdadeiro, e dois rituais podem usar vocabulários diferentes.",
          "Na ficha, cada versão com dano ganha o próprio dado ao lado do nome do ritual. O resultado sai identificado: “Dano — Crepúsculo · Discente”.",
          "A rolagem entra no histórico da campanha como qualquer outra, com autoria e visibilidade iguais às do resto.",
        ],
        "Alterado": [
          "O dano do ritual é opcional. Ritual que não causa dano deixa o campo em branco, e a versão simplesmente não aparece na ficha — campo vazio nunca vira zero.",
          "Rituais gravados antes desta versão abrem com a versão Normal em branco, sem perder nada e sem pedir nada a ninguém. schemaVersion foi para 3.",
        ],
        "Corrigido": [
          "Os botões de Ataque e Dano de uma arma só apareciam depois de abrir o item, embora existissem para não precisar disso. A causa era o próprio recolhível: um bloco fechado não desenha nada além do título, nem o que for pendurado nele depois. Agora essa faixa fica de fora, e continua à vista com o item fechado.",
        ],
        "Técnico": [
          "As versões são uma coleção com id estável, e não campos fixos chamados danoDiscente e danoVerdadeiro. O nome exibido é conteúdo; a identidade é o id — renomear uma versão não move o dano dela para lugar nenhum.",
          "A rolagem reusa o motor de dados e o mostrador central, sem segundo interpretador de expressão e sem caminho paralelo até o histórico.",
          "Duplicar um ritual gera ids novos para as versões, para a cópia não ficar colada no original na hora de conciliar duas edições.",
          "Rituais entraram no esquema de conciliação: dois aparelhos mexendo em rituais diferentes agora casam ritual a ritual e versão a versão, em vez de brigarem pela lista inteira.",
        ],
      },
    },
    {
      versao: "2.1.1",
      codinome: "DESCOMPASSO",
      data: "10/09/2026",
      mudancas: {
        "Corrigido": [
          "Abrir uma ficha ou uma campanha pedia login de novo, mesmo com a sessão válida — e o login funcionava sem resolver nada, porque o problema não era a senha. A tela inicial continuava logada, o que tornava o defeito ainda mais confuso.",
          "A causa: o site e o Apps Script são publicados separadamente, e a v2.1.0 fez essas duas telas dependerem de uma ação que só existe no servidor atualizado. Um servidor ainda na versão anterior respondia que não conhecia a ação, e o site entendia isso como sessão inválida.",
          "Agora essa ação é otimização, e não requisito: um servidor que não a conhece faz o site voltar ao caminho de sempre, sem que ninguém perceba além de a tela demorar um pouco mais.",
          "O portão de login passou a aparecer só quando o problema é mesmo a sessão. Qualquer outra recusa do servidor mostra o que aconteceu e um botão de tentar de novo, em vez de pedir uma senha que não vai adiantar.",
        ],
      },
    },
    {
      versao: "2.1.0",
      codinome: "VAZÃO",
      data: "10/09/2026",
      mudancas: {
        "Melhorado": [
          "Abrir uma ficha passou a ser uma única ida ao servidor, em vez de quatro. Abrir uma campanha, uma em vez de três. Cada ida ao Apps Script custa o tempo de ele acordar, e esse tempo era pago uma vez por chamada.",
          "As telas de lista deixaram de baixar o que não mostram. Ver os seus personagens não lê mais a ficha completa nem a foto de todos os personagens do sistema; abrir o painel da mesa não lê mais as fichas de quem não está nela.",
          "O histórico de rolagens ficou muito mais leve: uma página traz o resultado das rolagens que ela mostra, e não o de todas as que existem.",
          "Os botões de mais e menos do painel do mestre agora juntam cliques seguidos num envio só. Antes, seis cliques rápidos viravam seis gravações, cinco delas recusadas por conflito — e o número piscava de volta para um valor que ninguém pediu.",
          "Conferir quem está conectado deixou de custar duas leituras da planilha em toda requisição.",
          "Pedidos iguais disparados ao mesmo tempo pela mesma tela agora viram um só.",
        ],
        "Corrigido": [
          "Numa planilha criada na v1 e atualizada para a v2, a coluna de visibilidade entrou no fim da aba enquanto o sistema a procurava no meio. O efeito era grave e silencioso: itens da biblioteca e campanhas criados antes da atualização podiam aparecer vazios. O sistema passou a ler pelo NOME da coluna, e reconhece linha por linha as duas formas que a planilha pode ter — sem mover nenhuma célula.",
          "Uma referência a número de linha guardada durante a requisição podia envelhecer se outra coisa apagasse uma linha acima dela. Toda gravação agora confere o identificador antes de escrever.",
        ],
        "Alterado": [
          "A limpeza de sessões vencidas passou a rodar no máximo uma vez por dia, em vez de a cada entrada. Numa noite de mesa, dezenove pessoas pagavam por uma faxina que a primeira já tinha feito.",
          "As esperas entre tentativas ganharam variação aleatória. Quando o servidor tropeça, ele tropeça para todo mundo ao mesmo tempo — e voltar todos juntos refaz a rajada que causou a falha.",
        ],
        "Técnico": [
          "O Apps Script passou a ter três arquivos: Dados.gs (novo), Codigo.gs e Campanhas.gs. A divisão é de manutenção; o que ficou mais rápido está no jeito de ler, não no número de arquivos.",
          "Ação nova de lote, só para leitura, que agrupa várias consultas numa requisição. Cada uma continua passando pela própria conferência de permissão.",
          "Cache curto da sessão, carimbado com uma época que sair da conta, trocar a senha ou desativar o usuário faz avançar — revogação continua imediata.",
          "As regiões protegidas por trava encurtaram: o que dá para preparar antes de entrar na fila é preparado antes.",
        ],
      },
    },
    {
      versao: "2.0.0",
      codinome: "CONVERGÊNCIA",
      data: "10/09/2026",
      mudancas: {
        "Adicionado": [
          "Campanhas deixaram de ser uma lista simples e viraram uma mesa de verdade: participantes, personagens, histórico de rolagens, documentos, anotações do mestre e combates.",
          "Campanhas agora são públicas ou privadas. Numa privada, só entra quem o mestre convidar; numa pública, qualquer agente encontra a campanha, mas o conteúdo continua restrito a quem o mestre escolher.",
          "O mestre abre e edita as fichas dos personagens vinculados à campanha dele, e ajusta PV, status e atributos direto no painel da mesa.",
          "Histórico de rolagens da campanha: tudo o que é rolado numa ficha vinculada aparece para a mesa, com os dados sorteados e as parcelas do resultado.",
          "O mestre pode rolar sem personagem, pela Rolagem livre, e escolher se as próprias rolagens aparecem para os jogadores ou ficam ocultas.",
          "Documentos de campanha, com imagem e escolha de exatamente quem pode ver cada um — inclusive ninguém além do mestre.",
          "Anotações privadas do mestre, gerais ou ligadas a um personagem.",
          "Combates salvos: o mestre monta a lista, acrescenta criaturas, digita a iniciativa de cada participante e a ordem se organiza do maior para o menor.",
          "Criaturas no Homebrew, com status, atributos, perícias, ataques e habilidades — e só o que a criatura realmente tem.",
          "A ficha ganhou a seção HABILIDADES, com pastas dentro de pastas, cor de identificação e opção de texto em negrito.",
          "A ficha ganhou a seção RITUAIS, cujo nome pode ser trocado por Magias, Técnicas ou o que a sua mesa usar — e os cinco campos também podem ser renomeados.",
          "Itens do inventário agora têm categoria, e a seção pode ser filtrada por ela.",
          "Tela de histórico de versões, aberta pela versão no rodapé.",
        ],
        "Alterado": [
          "Itens do inventário e registros de rituais aparecem recolhidos, mostrando só o nome. Os botões de Ataque e Dano das armas continuam à vista.",
          "A biblioteca Homebrew separa o que é seu do que outras contas publicaram. Você usa o público como modelo, mas só o dono edita ou apaga.",
          "A lista de campanhas mostra o seu papel em cada uma e abre a tela da campanha.",
        ],
        "Melhorado": [
          "A ficha avisa de forma destacada quando você a abriu como mestre, e não como dono.",
          "Ao excluir uma pasta de habilidades com conteúdo, o sistema pergunta se você quer manter as habilidades ou apagar tudo.",
        ],
        "Técnico": [
          "Fichas gravadas na versão anterior continuam abrindo: a normalização cria habilidades, rituais e categoria vazios sem pedir nada a ninguém. schemaVersion foi para 2.",
          "O backend passou a ter dois arquivos: Codigo.gs e Campanhas.gs. Rode setupRama() de novo para criar as abas novas.",
          "Toda autorização é decidida no servidor a partir da sessão e das relações no banco. Papel, dono ou permissão enviados pelo navegador são ignorados.",
          "Rolagens registradas carregam um identificador próprio, então uma retentativa de rede nunca vira duas linhas no histórico — e nunca refaz o sorteio.",
          "118 verificações automáticas cobrindo permissões entre contas, além das 249 do motor de dados e do modelo da ficha.",
        ],
      },
    },
    {
      versao: "1.0.0",
      codinome: "ARQUIVO",
      data: "03/09/2026",
      mudancas: {
        "Adicionado": [
          "Primeira versão funcional do R.A.M.A.: login, personagens, ficha completa, motor de dados, inventário, Homebrew, anotações e perfil.",
          "Ficha com modo normal e modo edição, cinco atributos, PV, PE, Sanidade, defesa e as 28 perícias.",
          "Motor de dados com seleção do maior ou do menor, rolagem de perícia, dano somado e crítico multiplicando a quantidade de dados-base.",
          "Salvamento com espera curta, fila e conciliação de três vias quando dois aparelhos alteram a mesma ficha.",
        ],
      },
    },
  ];

  /* A versão atual é o primeiro registro. Não existe outra definição. */
  var atual = CHANGELOG[0];

  global.RAMAVersion = {
    changelog: CHANGELOG,
    categorias: CATEGORIAS,
    atual: atual,
    rotulo: "v" + atual.versao + " — " + atual.codinome,
    numero: atual.versao,
    codinome: atual.codinome,
  };
})(typeof window !== "undefined" ? window : globalThis);
