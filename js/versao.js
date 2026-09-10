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

     versão do aplicativo   está aqui. É o que a pessoa vê: v2.0.0.
     schemaVersion          está em js/ficha.js. É o formato da FICHA,
                            e só sobe quando a ficha muda de forma.
     versaoFormato          está em js/config.js. É o formato dos
                            arquivos de importação/exportação.

   Elas sobem em ritmos próprios. A v2.0.0 leva schemaVersion 2 e
   versaoFormato 1 — e isso é normal.

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
