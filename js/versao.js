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

     versão do aplicativo   está aqui. É o que a pessoa vê: v2.1.1.
     schemaVersion          está em js/ficha.js. É o formato da FICHA,
                            e só sobe quando a ficha muda de forma.
     versaoFormato          está em js/config.js. É o formato dos
                            arquivos de importação/exportação.

   Elas sobem em ritmos próprios. A v2.1.1 leva schemaVersion 2 e
   versaoFormato 1 — e isso é normal: esta entrega mudou o jeito de
   ler a planilha, não o formato da ficha nem o dos arquivos.

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
