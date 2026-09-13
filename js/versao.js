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

     versão do aplicativo   está aqui. É o que a pessoa vê: v2.7.1.
     schemaVersion          está em js/ficha.js. É o formato da FICHA,
                            e só sobe quando a ficha muda de forma.
     versaoFormato          está em js/config.js. É o formato dos
                            arquivos de importação/exportação.

   Elas sobem em ritmos próprios. A v2.7.1 leva schemaVersion 6 e
   versaoFormato 1 — e isso é normal: a ficha ganhou versões personalizadas e
   etiquetas, mas o formato dos arquivos de importação continua
   o mesmo,
   porque um arquivo antigo continua sendo lido sem perder nada.

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
