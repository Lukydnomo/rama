/* =====================================================================
   R.A.M.A. — os artigos da Ajuda (guias, perguntas frequentes e
   percursos por sistema) e a busca por tarefa
   ---------------------------------------------------------------------
   Um lugar só para o conteúdo: a página Ajuda (ajuda/), o "Ajuda desta
   tela" da casca e a etapa da Ajuda no tutorial inicial leem DAQUI.
   Um guia se abre por endereço: ajuda/?guia=<id>.

   CADA TRECHO DIZ DE ONDE VEM (campo `fonte` do bloco):
     { rama: true }                    "Funcionamento do RAMA" — interface
                                       e comportamento da plataforma
     { livro, edicao, paginas, secao } regra de livro; `paginas` é a
                                       numeração IMPRESSA, conferida no
                                       catálogo e em docs/; sem página
                                       verificada, só o livro e a seção
     { fa: true, ... }                 conteúdo de fã (não oficial)
     { interpretacao: true, ... }      leitura própria do RAMA onde a
                                       fonte diverge de si mesma
   Nada de página estimada. Os nomes de controle são os da tela.

   Os percursos com ficha de exemplo (tipo "tutorial") apontam para
   ficha/?demo=<sistema>; as etapas deles moram em
   js/ajuda/tutoriais-sistemas.js.
   ===================================================================== */

(function (global) {
  "use strict";

  var RAMA = { rama: true };

  /* As fontes, com nome completo e edição — uma linha por material. */
  var L = {
    OPRPG: { livro: "Ordem Paranormal RPG — livro básico", edicao: "v1.1" },
    SAH: { livro: "Sobrevivendo ao Horror", edicao: "v1.2" },
    EXTRA: { livro: "Ordem Paranormal — conteúdo oficial avulso (Extras)", edicao: "" },
    ALPHA: { livro: "Ordem Paranormal RPG 2 — Playtest Alpha", edicao: "playtest" },
    BETA: { livro: "Ordem 2 — Playtest Beta, Missões 1 e 2", edicao: "playtest" },
    OBLIVIO: { livro: "Oblívio — livro de regras", edicao: "" },
    V5: { livro: "Vampiro: A Máscara — manual básico", edicao: "5ª edição (V5)" },
    GOBLINS: { livro: "Malditos Goblins", edicao: "3ª edição digital" },
    BRUTAL: { livro: "BRUTAL: Corte Rápido", edicao: "Fast Play" },
    T20: { livro: "Tormenta20 — Jogo do Ano", edicao: "2ª edição, 2ª impressão (2023)" },
    MELHOR_AMIGO: { livro: "Melhor Amigo da Ordem", edicao: "suplemento de fã de @_Lesm0_", fa: true },
    AS3: { livro: "Ordem Paranormal — Arquivos Secretos 3", edicao: "v1.0" },
    AS9: { livro: "Ordem Paranormal — Arquivos Secretos 9", edicao: "v1.0" },
    AS11: { livro: "Ordem Paranormal — Arquivos Secretos 11: Gaudérios e as Estradas", edicao: "v1.0" },
    LIMITE: { livro: "Limite de Dados, de Luna Moth (publicada no Arquivos Secretos 11)", edicao: "regra da comunidade, não canônica", fa: true },
  };
  function de(livro, extra) { return Object.assign({}, L[livro], extra || {}); }

  var AREAS = [
    { chave: "primeiros-passos", nome: "Primeiros passos" },
    { chave: "personagens", nome: "Personagens e fichas" },
    { chave: "campanhas", nome: "Campanhas" },
    { chave: "catalogo", nome: "Catálogo" },
    { chave: "homebrew", nome: "Homebrew" },
    { chave: "perfil", nome: "Perfil e personalização" },
    { chave: "sistemas", nome: "Tutoriais por sistema" },
    { chave: "faq", nome: "Perguntas frequentes" },
  ];

  var SISTEMAS = {
    universal: "Universal", ordem: "Ordem Paranormal", ordem2: "Ordem Paranormal RPG II (Experimental)",
    oblivio: "Oblívio", vampiro: "Vampiro: A Máscara (V5)", goblins: "Malditos Goblins (3ª ed.)",
    brutal: "BRUTAL (Corte Rápido)", tormenta20: "Tormenta20 (Jogo do Ano)",
  };

  /* -----------------------------------------------------------------
     OS ARTIGOS
     ----------------------------------------------------------------- */
  var ARTIGOS = [

    /* ================= PRIMEIROS PASSOS ================= */
    { id: "primeiros-passos", area: "primeiros-passos", titulo: "Primeiros passos no R.A.M.A.",
      resumo: "O que é o R.A.M.A., onde fica cada área e por que o livro do seu sistema continua importante.",
      termos: ["começar", "início", "o que é", "como funciona", "visão geral", "áreas", "menu", "navegação"],
      blocos: [
        { texto: ["O R.A.M.A. guarda suas fichas, faz as contas e rola os dados pelas regras de cada sistema, e reúne a mesa numa campanha. Ele ajuda a jogar — mas não substitui o livro: leia o livro ou o PDF do sistema que a sua mesa escolheu e combine com o mestre quais regras opcionais e suplementos valem."], fonte: RAMA },
        { titulo: "Onde fica cada coisa", lista: [
          "Personagens — suas fichas e as que compartilharam com você (aba Compartilhados comigo).",
          "Campanhas — as mesas em que você joga ou é mestre: personagens, combate, rolagens, notas.",
          "Catálogo — o conteúdo oficial de cada sistema para consulta (origens, poderes, itens, criaturas…), com a fonte de cada entrada.",
          "Homebrew — o que você cria: itens, habilidades, rituais, criaturas e pacotes para compartilhar.",
          "Perfil — nome, avatar, aparência (Legacy ou Modern20, tema, densidade), temas de dados e as Importações.",
          "Ajuda — esta página: busca por tarefa, guias, tutoriais por sistema e perguntas frequentes.",
        ], fonte: RAMA },
        { titulo: "Um bom primeiro roteiro", passos: [
          "Em Personagens, use + Adicionar personagem e escolha o sistema da sua mesa.",
          "Siga a criação guiada (quando o sistema tiver) com o livro aberto ao lado.",
          "Peça ao mestre o convite para a campanha e vincule a ficha (guia “Vincular personagem à campanha”).",
        ], fonte: RAMA },
      ], relacionados: ["comecar-jogador", "comecar-mestre", "criar-personagem"] },

    { id: "comecar-jogador", area: "primeiros-passos", titulo: "Começar como jogador",
      resumo: "Criar a ficha, entrar na mesa e jogar a primeira sessão.",
      termos: ["jogador", "jogar", "primeira sessão", "entrar na mesa", "convite"],
      blocos: [
        { passos: [
          "Crie a ficha em Personagens → + Adicionar personagem, no sistema que a mesa usa.",
          "Peça ao mestre para adicionar você como jogador na campanha (ele faz isso nas Configurações da campanha).",
          "Na campanha, aba Personagens, use + Adicionar personagem para levar a sua ficha para a mesa — ou escolha a campanha dentro da própria ficha.",
          "Durante o jogo, deixe a ficha no modo Normal: recursos, condições e rolagens ficam à mão; o modo Edição é para mexer na estrutura.",
          "As rolagens feitas pela ficha vinculada aparecem no histórico da campanha (aba Rolagens).",
        ], fonte: RAMA },
      ], relacionados: ["vincular-personagem", "ficha-modos", "rolagens"] },

    { id: "comecar-mestre", area: "primeiros-passos", titulo: "Começar como mestre",
      resumo: "Criar a campanha, convidar jogadores, escolher suplementos e conhecer as ferramentas da mesa.",
      termos: ["mestre", "narrador", "testemunha", "diretora", "criar mesa", "conduzir", "gm"],
      blocos: [
        { passos: [
          "Em Campanhas, use + Nova campanha e escolha o sistema — ele define as ferramentas da mesa.",
          "Abra a campanha e, em Configurações, adicione os jogadores (Jogadores → Salvar participantes).",
          "Ainda em Configurações, ligue os suplementos que a mesa usa; as fichas vinculadas passam a seguir essa escolha.",
          "Quando os jogadores vincularem as fichas, você as vê na aba Personagens e pode abri-las (como mestre da campanha, você lê e ajusta as fichas da mesa).",
          "Use a aba da mesa do sistema (Combate, Covil, Crônica, Mesa da Testemunha, Mesa da Diretora…) para conduzir as cenas.",
        ], fonte: RAMA },
        { texto: ["O nome de quem conduz muda com o sistema: Narrador em Vampiro, Testemunha em Oblívio, Diretora em BRUTAL e Mestre nos demais."], fonte: RAMA },
      ], relacionados: ["campanhas-comecar", "mestre-ferramentas", "regras-opcionais"] },

    { id: "refazer-tutorial", area: "primeiros-passos", titulo: "Refazer o tutorial inicial",
      resumo: "Repassar os controles comuns numa ficha de exemplo nova, sem mexer na sua conta.",
      termos: ["tutorial", "refazer", "repetir", "revisar", "aprender de novo"],
      acoes: [{ rotulo: "Refazer tutorial inicial", href: "ficha/?tutorial=inicial&revisao=1", principal: true }],
      blocos: [
        { texto: ["O tutorial começa do zero, com uma ficha Universal de exemplo nova. Você pode encerrá-lo a qualquer momento pelo botão Encerrar; a conclusão que você já tem continua valendo, e nada do que for praticado é gravado nas suas fichas, campanhas ou Homebrew."], fonte: RAMA },
      ], relacionados: ["primeiros-passos"] },

    /* ================= PERSONAGENS E FICHAS ================= */
    { id: "criar-personagem", area: "personagens", titulo: "Criar um personagem",
      resumo: "Escolher o sistema, seguir a criação guiada e começar a jogar.",
      termos: ["nova ficha", "novo personagem", "criar ficha", "adicionar personagem", "sistema", "criação guiada"],
      blocos: [
        { passos: [
          "Abra Personagens e clique em + Adicionar personagem.",
          "Escolha o sistema (cada cartão mostra o que a ficha dele faz) e clique em Continuar.",
          "Universal: dê nome, classe e origem; a ficha nasce com atributos, PV, PE e Sanidade para você configurar. Nos demais sistemas, a criação guiada pede as escolhas do livro, etapa por etapa.",
          "Ao terminar, a ficha abre. O que ficou para depois aparece como pendência (na Progressão, em Ordem Paranormal).",
        ], fonte: RAMA },
        { texto: ["A criação segue as regras do livro de cada sistema; tenha o livro aberto para ler as opções por inteiro. Cada sistema tem um tutorial com ficha de exemplo em Ajuda → Tutoriais por sistema."], fonte: RAMA },
      ], relacionados: ["importar-ficha", "universal-configurar", "personagens-organizar"] },

    { id: "importar-ficha", area: "personagens", titulo: "Importar e exportar fichas",
      resumo: "Trazer uma ficha de outro R.A.M.A. ou do CRIS, e guardar uma cópia em arquivo.",
      termos: ["importar ficha", "importar", "exportar", "arquivo", "json", "cris", "backup", "cópia", "trazer ficha"],
      blocos: [
        { titulo: "Importar", passos: [
          "Abra Perfil → Importações.",
          "Importar ficha do RAMA: escolha o arquivo .json exportado; a ficha vira um personagem novo seu.",
          "Importar ficha do CRIS (Ordem Paranormal): cole o link público da ficha e revise seção por seção antes de criar.",
          "Nada é gravado antes de você conferir a prévia, e nenhuma ficha existente é sobrescrita.",
        ], fonte: RAMA },
        { titulo: "Exportar", texto: ["Na ficha, Opções da ficha (⋯) → Exportar ficha baixa ou copia o arquivo .json. É também a saída de segurança quando o servidor recusa uma gravação.", "Na mesma janela, Baixar PDF e Baixar PNG geram a ficha no modelo visual do sistema (Ordem, Vampiro, Tormenta20…), pronta para imprimir: o PDF é um arquivo com todas as páginas, o PNG baixa uma imagem por página. Sai o que está na tela, mesmo antes de salvar; o que não cabe vai para páginas de continuação. O nome do arquivo leva o personagem, o sistema, a data e os códigos Agente e Registro. PDF e PNG não voltam para o R.A.M.A. — para importar, use o .json."], fonte: RAMA },
      ], relacionados: ["faq-importacao", "criar-personagem"] },

    { id: "ficha-modos", area: "personagens", titulo: "Modos Normal e Edição da ficha",
      resumo: "Jogar no Normal; mudar a estrutura (atributos, itens, habilidades) no Edição.",
      termos: ["modo edição", "editar ficha", "modo normal", "travada", "destravar", "estrutura", "editar"],
      blocos: [
        { texto: [
          "No topo da ficha, os botões Normal e Edição trocam o modo. Normal é o modo de jogo: alterar recursos (PV, PE…), marcar condições, rolar e usar itens. Edição destrava a estrutura: criar e apagar itens, habilidades e perícias, mudar atributos e configurar a ficha.",
          "As mudanças são salvas sozinhas; o indicador ao lado dos botões diz quando a última gravação terminou.",
          "Quem recebeu a ficha como Leitor vê “Somente leitura” no lugar dos botões.",
        ], fonte: RAMA },
      ], relacionados: ["faq-nao-consigo-editar", "ficha-recursos", "faq-salvamento"] },

    { id: "ficha-recursos", area: "personagens", titulo: "Recursos e status (PV, PE, Sanidade…)",
      resumo: "Tirar e devolver pontos durante o jogo e mudar os máximos.",
      termos: ["pv", "pe", "sanidade", "vida", "dano", "cura", "recurso", "status", "máximo"],
      blocos: [
        { texto: ["No modo Normal, use − e + ao lado do recurso, ou digite o número no campo (tirar 7 de PV de uma vez não precisa de sete cliques). No modo Edição você muda o máximo e, na ficha Universal, cria, renomeia e apaga status."], fonte: RAMA },
        { texto: ["Em Ordem Paranormal, os máximos de PV, PE e Sanidade são calculados pela classe, atributos e NEX; a ficha mostra a composição de cada número."], fonte: de("OPRPG", { secao: "Capítulo 1 — classes" }) },
      ], relacionados: ["ficha-modos", "rolagens"] },

    { id: "rolagens", area: "personagens", titulo: "Rolar dados e ler o resultado",
      resumo: "Onde rolar, onde aparece o resultado e como ler as parcelas.",
      termos: ["rolar", "rolagem", "dado", "dados", "teste", "resultado", "parcelas", "perícia", "ataque", "dano"],
      blocos: [
        { texto: [
          "Clique no nome ou no botão de dado de um atributo, perícia, ataque ou habilidade. O resultado aparece no canto da tela: o total em destaque, os dados brutos (o principal marcado, os descartados visíveis) e, embaixo, de onde veio cada parcela (atributo, bônus, dados extras).",
          "O cartão some depois de alguns segundos; passar o mouse ou tocar nele segura. Ele fica por cima de janelas abertas, para você não precisar fechá-las.",
          "Numa ficha vinculada a uma campanha, as rolagens do dono e do mestre também vão para a aba Rolagens da campanha. Quem recebeu a ficha compartilhada rola, mas não manda para o histórico.",
        ], fonte: RAMA },
      ], relacionados: ["historico-rolagens", "ficha-modos"] },

    { id: "habilidades-organizar", area: "personagens", titulo: "Habilidades: consultar e organizar",
      resumo: "Abrir o texto de uma habilidade, criar pastas e mudar a ordem.",
      termos: ["habilidade", "habilidades", "poder", "talento", "pasta", "organizar", "ordem", "arrastar"],
      blocos: [
        { texto: [
          "Na aba Habilidades, clique no nome para abrir o texto. Pastas agrupam habilidades e podem ficar abertas ou fechadas (isso fica salvo).",
          "No modo Edição aparecem + Pasta, + Habilidade e Da biblioteca (traz uma habilidade do seu Homebrew). Para reordenar, arraste pela alça ou use Subir e Descer no menu (⋯) de cada uma; com o foco na alça, as setas ↑ e ↓ também movem.",
        ], fonte: RAMA },
      ], relacionados: ["homebrew-criar", "inventario"] },

    { id: "inventario", area: "personagens", titulo: "Inventário: itens, armas e organização",
      resumo: "Abrir detalhes, atacar com uma arma, criar itens e organizar por categoria.",
      termos: ["inventário", "item", "itens", "arma", "armadura", "mochila", "peso", "carga", "espaços", "equipamento", "adicionar item"],
      blocos: [
        { texto: [
          "Na aba Inventário, clique no item para ver detalhes e descrição. Armas mostram Ataque e Dano mesmo fechadas. O menu (⋯) de cada item tem editar, duplicar, mover e excluir.",
          "No modo Edição você cria itens (arma, armadura, mochila ou item comum) ou traz da biblioteca. A categoria é texto livre e vira filtro no topo da lista.",
        ], fonte: RAMA },
        { texto: ["Em Ordem Paranormal, o limite é em espaços, não peso: 5 espaços por ponto de Força (Força 0 carrega 2), cada item ocupa 1 espaço por padrão e a mochila não ocupa espaço; o limite de itens por categoria vem da patente."], fonte: de("OPRPG", { paginas: "p. 51–53" }) },
      ], relacionados: ["inventario-grade", "habilidades-organizar"] },

    { id: "adicionar-ritual", area: "personagens", titulo: "Adicionar ritual (ou magia) à ficha",
      resumo: "Trazer do catálogo ou do Homebrew, ou escrever um ritual novo.",
      termos: ["adicionar ritual", "ritual", "rituais", "magia", "magias", "feitiço", "círculo"],
      blocos: [
        { passos: [
          "Abra a aba Rituais (o nome da seção pode ter sido trocado — por exemplo, Magias — na ficha Universal).",
          "Entre no modo Edição.",
          "Use Da biblioteca para escolher no catálogo oficial do sistema ou no seu Homebrew, ou + Novo para escrever um.",
        ], fonte: RAMA },
        { texto: ["Em Ordem Paranormal, a ficha controla de onde veio cada ritual (rituais iniciais do ocultista, Aprender Ritual, Saber Ampliado…) e o círculo permitido em cada etapa de NEX. Aprender Ritual dá um ritual de 1º círculo, de 2º a partir de NEX 45% e de 3º a partir de 75%."], fonte: de("OPRPG", { paginas: "p. 32, 35 e 114" }) },
        { texto: ["Em Tormenta20 as magias ficam na aba Magias, com os aprimoramentos do livro."], fonte: de("T20", { paginas: "p. 168–211" }) },
      ], relacionados: ["catalogo-consultar", "homebrew-criar"] },

    { id: "universal-configurar", area: "personagens", sistema: "universal", titulo: "Configurar a ficha Universal",
      resumo: "Ligar e desligar seções, criar atributos, perícias e status com os nomes da sua mesa.",
      termos: ["universal", "configurar", "módulos", "seções", "atributos", "perícias", "status", "personalizar ficha", "qualquer sistema"],
      blocos: [
        { texto: [
          "A ficha Universal não impõe regra: você monta a ficha do jeito do livro que a mesa usa. No modo Edição, Configurar módulos liga e desliga seções (Perícias, Rituais, Inventário, Aliados…).",
          "Atributos, perícias e status são criados, renomeados e apagados no modo Edição. Cada atributo tem valor e dado (um atributo 2 pode rolar 3d20); cada perícia usa um atributo, um bônus e, se quiser, dados extras ou uma fórmula própria.",
        ], fonte: RAMA },
      ], relacionados: ["tutorial-universal", "ficha-modos"] },

    { id: "compartilhar-ficha", area: "personagens", titulo: "Compartilhar uma ficha (Leitor e Editor)",
      resumo: "Dar acesso a outra conta para ler ou editar uma ficha sua.",
      termos: ["compartilhar", "compartilhar ficha", "compartilhar com o mestre", "dar acesso", "leitor", "editor", "permissão", "acesso"],
      blocos: [
        { passos: [
          "Abra a ficha e use Opções da ficha (⋯) → Compartilhar… (só o dono da ficha vê essa opção).",
          "Em Adicionar pessoas, escolha a conta e o papel em Adicionar como: Leitor ou Editor. Clique em Salvar.",
          "A pessoa encontra a ficha em Personagens → Compartilhados comigo.",
        ], fonte: RAMA },
        { titulo: "Leitor ou Editor?", lista: [
          "Leitor: abre e rola, mas não altera nada (a ficha aparece como Somente leitura).",
          "Editor: altera a ficha como o dono, mas não compartilha nem exclui.",
          "O mestre da campanha a que a ficha está vinculada já pode abrir e ajustar a ficha pela campanha — não é preciso compartilhar com ele.",
        ], fonte: RAMA },
      ], relacionados: ["vincular-personagem", "faq-ficha-compartilhada", "faq-nao-consigo-editar"] },

    { id: "personagens-organizar", area: "personagens", titulo: "Organizar personagens em pastas",
      resumo: "Pastas, exibição em abas ou pastas laterais e agrupar por sistema.",
      termos: ["pasta", "pastas", "organizar personagens", "agrupar", "mover para pasta", "duplicar", "excluir personagem"],
      blocos: [
        { texto: ["Em Personagens, + Nova pasta cria uma pasta. No menu de cada personagem: Mover para pasta…, Duplicar, Renomear e Excluir. Em Exibição você escolhe Abas ou Pastas laterais, e há a opção de Agrupar por sistema."], fonte: RAMA },
      ], relacionados: ["criar-personagem"] },

    { id: "aliados", area: "personagens", titulo: "Aliados e criaturas na ficha",
      resumo: "Criar um aliado ou trazer uma criatura da biblioteca para a aba Aliados.",
      termos: ["aliado", "aliados", "criatura", "companheiro", "npc", "parceiro"],
      blocos: [
        { texto: ["Na aba Aliados (modo Edição), Criar aliado abre o editor de criatura; Da biblioteca traz uma criatura do catálogo ou do seu Homebrew. Cada aliado é uma cópia: mudar o modelo na biblioteca não muda a ficha. Em Tormenta20 a aba se chama Parceiros."], fonte: RAMA },
      ], relacionados: ["companheiro-animal", "homebrew-criar"] },

    { id: "companheiro-animal", area: "personagens", sistema: "ordem", titulo: "Companheiro animal (Ordem Paranormal)",
      resumo: "A ficha do companheiro do suplemento de fã “Melhor Amigo da Ordem”, dentro da aba Aliados.",
      termos: ["companheiro animal", "animal", "pet", "cachorro", "gato", "elo", "melhor amigo da ordem"],
      blocos: [
        { passos: [
          "Na ficha de Ordem, aba Aliados, modo Edição: Criar aliado → Companheiro animal.",
          "Siga a criação: conceito, porte, atributos, origem, especialização e perícias.",
          "Abra o cartão do companheiro para jogar: recursos, Elo, trauma, perícias e ataques com rolagem. Poderes e marcos de NEX ficam na aba Progressão da janela dele.",
        ], fonte: RAMA },
        { texto: ["As regras do companheiro (porte, origens, especializações, Elo e poderes) são de um suplemento de fã, não oficial. Combine com a mesa antes de usar."], fonte: de("MELHOR_AMIGO", { secao: "o suplemento inteiro" }) },
      ], relacionados: ["aliados", "tutorial-ordem"] },

    { id: "inventario-grade", area: "personagens", sistema: "ordem", titulo: "Inventário em grade (Ordem Paranormal)",
      resumo: "Organizar os itens por encaixe numa grade, em mochilas e no corpo.",
      termos: ["grade", "inventário em grade", "encaixe", "slots", "corpo", "mochila", "tetris"],
      blocos: [
        { texto: [
          "É uma regra opcional: ligue em Regras (aba da ficha de Ordem) → Inventário em grade. Ela só aparece com o suplemento que a libera ligado na ficha ou na campanha.",
          "Ligada, o Inventário mostra a grade principal, as mochilas como grades próprias e o corpo (cabeça, peitoral, mãos, pernas e pés). Arraste para encaixar; no computador, o botão direito num espaço abre um menu curto. Desligar volta à lista e guarda as posições.",
        ], fonte: RAMA },
        { texto: ["A grade principal tem 2 × B células (B é o limite normal sem as mochilas) e cada mochila que dá +C vira uma grade de C células. O material não traz número de página."], fonte: de("EXTRA", { secao: "regra Inventário em grade" }) },
      ], relacionados: ["inventario", "regras-opcionais"] },

    { id: "limite-de-dados", area: "personagens", sistema: "ordem", titulo: "Limite de Dados (Ordem Paranormal)",
      resumo: "No máximo cinco d20 por teste, com os atributos altos valendo inteiros no resto da ficha.",
      termos: ["limite de dados", "cinco dados", "5d20", "dados demais", "atributo maior que 5", "fonte do medo", "luna moth"],
      blocos: [
        { texto: [
          "É uma regra opcional de cada ficha: aba Regras → Combate e sobrevivência → Limite de Dados. Ela só aparece com o Arquivos Secretos 11 ligado na ficha ou na campanha; liberar o suplemento não liga a regra.",
          "Ligada, a composição de cada teste mostra o corte (“Limite de Dados: 7 → 5”). Nas ameaças do combate, quem liga é o mestre, em Configurações da campanha → Mecânicas opcionais → Limite de Dados nas ameaças.",
        ], fonte: RAMA },
        { lista: [
          "O atributo e os acréscimos positivos de dados somam no máximo 5; depois entram as reduções. Ex.: 7 com –2d20 → 3d20, fica com o maior.",
          "Zero: dois d20, com o menor; –1: três; –2: quatro; –3 ou menos: cinco — sempre com o menor.",
          "Bônus numéricos e dados de outros tamanhos entram depois do d20, como sempre.",
          "Atributo acima de 5 continua valendo para PV, PE, Defesa, perícias e o resto.",
          "Ameaça com Enigma de Medo ainda não resolvido tem a Fonte do Medo: rola o atributo inteiro. Resolvido o Enigma, vale o limite.",
        ], fonte: de("LIMITE", { paginas: "p. 103–104" }) },
      ], relacionados: ["regras-opcionais", "viagens-estradas"] },

    { id: "regras-opcionais", area: "personagens", titulo: "Regras opcionais e suplementos",
      resumo: "Ligar suplementos na ficha ou na campanha e as regras opcionais de cada sistema.",
      termos: ["regra opcional", "regras opcionais", "suplemento", "suplementos", "ligar suplemento", "conteúdo não aparece", "sobrevivendo ao horror", "arquivos secretos"],
      blocos: [
        { texto: [
          "Suplementos: na ficha, Opções da ficha (⋯) → Suplementos…; numa campanha, o mestre escolhe em Configurações e a escolha vale para as fichas vinculadas. O livro básico está sempre ligado.",
          "Regras opcionais (Ordem Paranormal): aba Regras da ficha. Cada regra diz o que muda e o que depende dela; desligar não apaga o que foi feito.",
        ], fonte: RAMA },
        { texto: ["As regras opcionais de Ordem Paranormal vêm principalmente do Sobrevivendo ao Horror. Combine com o mestre quais valem antes de ligar."], fonte: de("SAH", { secao: "regras opcionais" }) },
      ], relacionados: ["faq-suplementos", "inventario-grade"] },

    /* ================= CAMPANHAS ================= */
    { id: "campanhas-comecar", area: "campanhas", titulo: "Criar uma campanha e convidar jogadores",
      resumo: "Nova campanha, sistema, visibilidade e participantes.",
      termos: ["criar campanha", "nova campanha", "convidar", "jogadores", "participantes", "mesa"],
      blocos: [
        { passos: [
          "Campanhas → + Nova campanha: nome, Sistema de RPG e Visibilidade.",
          "Abra a campanha → Configurações → Jogadores: adicione as contas e clique em Salvar participantes.",
          "Os jogadores passam a ver a campanha na lista deles e podem vincular as fichas.",
        ], fonte: RAMA },
      ], relacionados: ["vincular-personagem", "comecar-mestre", "mestre-ferramentas"] },

    { id: "vincular-personagem", area: "campanhas", titulo: "Vincular personagem à campanha",
      resumo: "Levar a sua ficha para a mesa e o que muda com isso.",
      termos: ["vincular", "vínculo", "levar ficha", "adicionar personagem na campanha", "compartilhar com o mestre", "mestre ver ficha"],
      blocos: [
        { passos: [
          "Na campanha, aba Personagens → + Adicionar personagem e escolha a ficha. (Você precisa ser jogador da campanha.)",
          "Ou, dentro da ficha, escolha a campanha no campo de campanha.",
          "Para tirar, use Tirar da campanha no menu do personagem.",
        ], fonte: RAMA },
        { texto: ["Vinculada, a ficha aparece para o mestre, que pode abri-la e ajustá-la; os suplementos passam a seguir os da campanha; e as rolagens do dono e do mestre vão para a aba Rolagens. Vincular não dá acesso aos outros jogadores — para isso existe Compartilhar."], fonte: RAMA },
      ], relacionados: ["compartilhar-ficha", "historico-rolagens"] },

    { id: "mestre-ferramentas", area: "campanhas", titulo: "Ferramentas do mestre por sistema",
      resumo: "O que cada sistema acrescenta à campanha.",
      termos: ["ferramentas do mestre", "combate", "iniciativa", "covil", "crônica", "mesa da testemunha", "mesa da diretora", "hexatombe", "hacking"],
      blocos: [
        { lista: [
          "Universal: Combate com ordem, turnos e rodadas.",
          "Ordem Paranormal: Combate com condições e efeitos por turno, recursos no painel e as mecânicas opcionais Hexatombe, Hacking, Perigos complexos e Viagens nas estradas (com Carcaças Vermelhas).",
          "Ordem Paranormal RPG II: a Mesa do Mestre (missão, testes pedidos, investigação, combate em fases).",
          "Oblívio: a Mesa da Testemunha (cenas, Farol, Ameaças e Buracos).",
          "Vampiro V5: a Crônica do Narrador (noites, cenas, coterie, Domínio, conflitos).",
          "Malditos Goblins: o Covil (combate, inimigos, sorteios e encontros).",
          "BRUTAL: a Mesa da Diretora (cenas, Pilha da Diretora, o Assassino).",
          "Tormenta20: a Mesa do Mestre (iniciativa, ameaças por ND, encontros, tesouro).",
        ], fonte: RAMA },
      ], relacionados: ["comecar-mestre"] },

    { id: "viagens-estradas", area: "campanhas", sistema: "ordem", titulo: "Viagens nas estradas (Ordem Paranormal)",
      resumo: "Preparar e conduzir uma viagem: itinerário, veículos, navegação, encontros aleatórios e acidentes — com ou sem Veículos Operacionais.",
      termos: ["viagem", "viagens", "estrada", "estradas", "itinerário", "encontro aleatório", "acidente", "veículo de viagem", "autonomia", "navegação", "gaudérios", "arquivos secretos 11", "comboio"],
      blocos: [
        { titulo: "Ligar e preparar", passos: [
          "Em Configurações da campanha, deixe o Arquivos Secretos 11 permitido em Suplementos e ligue Mecânicas opcionais → Viagens nas estradas. Liberar o suplemento sozinho não liga nada.",
          "Na aba Viagens, use Nova viagem livre…: origem, destino, condução (por itinerário ou trecho a trecho), módulo e velocidade.",
          "Em Veículos e ocupantes, acrescente o veículo de viagem (ou vincule um veículo operacional de uma ficha) e defina ocupantes, motorista, navegador e como ele navega.",
          "No Itinerário, acrescente encontros fixos (escondidos até você revelar) ou troque um encontro aleatório por um fixo.",
        ], fonte: RAMA },
        { titulo: "Conduzir", texto: [
          "Na etapa de encontro, Rolar encontro aleatório (d100): o servidor rola o d100 e as subtabelas e guarda o resultado — reabrir a tela ou repetir o pedido não rola de novo. Cada evento mostra o teste pedido, as decisões da mesa e as consequências; nenhuma consequência entra sem o seu Aplicar.",
          "Perda de PV, PE ou SAN e dano ficam registrados com a natureza e o tipo; cada jogador aplica na própria ficha. Tudo vai para o Histórico, com autor, e Desfazer devolve os efeitos.",
          "Os jogadores veem as etapas percorridas, a atual e as paradas previstas; não veem notas, encontros futuros nem encontros fixos ainda não revelados.",
        ], fonte: RAMA },
        { titulo: "As regras", lista: [
          "Itinerário: Origem > encontro aleatório / encontro fixo / parada > destino. Curta (até ~200 km), média (até ~400 km) e longa (até ~1.000 km), em velocidade padrão ou imprudente.",
          "Trecho a trecho: motorista e navegador testam a cada 100 km, DT 10 subindo 5 por trecho; falha pede encontro aleatório, e encontro que se confirma devolve a DT a 10.",
          "Navegação: conhecer o caminho é sucesso automático; GPS com sinal usa Tecnologia (sem sinal, vira mapa: Sobrevivência); placas usam Percepção; mapas, Sobrevivência. Motorista que navega sofre –1d20 nos dois testes.",
          "Os 17 veículos de viagem têm proporções, vagas, autonomia e categoria de requisição — não têm PV, Defesa nem RD. Bicicleta (Atletismo) e cavalo (Adestramento) andam por dia e sempre na velocidade padrão.",
        ], fonte: de("AS11", { paginas: "p. 36–43" }) },
        { lista: [
          "Encontros: d100 na tabela principal e d20 em cada subtabela (risco humano, problema no veículo, obstáculo, ambiental, paranormal). Bicicleta e cavalo são imunes a problema no veículo.",
          "Acidente: novo teste de Pilotagem com –5 imprudente, –1 motorista intoxicado, –2 sem freio, –2 origem paranormal e a diferença de proporções com o outro envolvido; o resultado decide colisão frontal (20d6), lateral (10d6), traseira (8d6), capotagem (6d6), obstáculo (4d6) ou saída livre.",
        ], fonte: de("AS11", { paginas: "p. 44–55" }) },
        { titulo: "Com os Veículos Operacionais", texto: [
          "As viagens do AS11 não precisam dos Veículos Operacionais. Com eles na mesa, vincule o veículo operacional de uma ficha: a viagem LÊ os PV, o combustível e as regalias da ficha e nunca escreve neles. O combustível pode seguir pelos dados do veículo operacional (na ficha) — aí a viagem não dá baixa de autonomia, para não descontar duas vezes.",
        ], fonte: de("AS3", { paginas: "p. 125–131" }) },
        { titulo: "Regalias novas", texto: [
          "Onze regalias para Veículos Operacionais; as menores ocupam um terço de vaga (três completam uma). Estepe e extintor trazem uma unidade de reserva cada, gasta e reposta à mão. Painéis Solares Avançados evitam as falhas elétrica e eletrônica e dobram a autonomia do carro elétrico. Num veículo de viagem, as mesmas regalias descrevem o equipamento.",
        ], fonte: de("AS11", { paginas: "p. 56–57" }) },
        { texto: ["Equipamento de série dos veículos de viagem: estepe em todo veículo motorizado que não é moto, extintor nesses mesmos menos o carro velho (a fonte só diz que carros velhos e motos não têm extintor de série e trata o estepe como o normal). A primeira aquisição de estepe ou extintor já conta no limite de 3. Onde a fonte não dá número (o airbag), fica a decisão da mesa."], fonte: { interpretacao: true, livro: "Leitura do RAMA para o Arquivos Secretos 11" } },
      ], relacionados: ["carcacas-vermelhas", "limite-de-dados", "mestre-ferramentas"] },

    { id: "carcacas-vermelhas", area: "campanhas", sistema: "ordem", titulo: "Carcaças Vermelhas: os controles da missão",
      resumo: "Contador de perseguição, dados de caçada, as cenas, o Sonnenblume, a explosão e o confronto final com os reféns.",
      termos: ["carcaças vermelhas", "carcacas", "perseguição", "contador de perseguição", "dado de caçada", "dados de caçada", "reféns", "sonnenblume", "confronto final", "pessoa querida", "bruna", "nicole", "rômulo"],
      blocos: [
        { titulo: "Iniciar e conduzir", passos: [
          "Com Viagens nas estradas ligada, use Iniciar Carcaças Vermelhas… e escolha a velocidade (padrão: cenas 1 a 7; imprudente: 1, 2, 3, 4 e 7) e os agentes.",
          "No painel da missão, escolha a Cena atual e registre o que a mesa decidiu: cada escolha aplica os efeitos uma vez (contador e dados de caçada) e pode ser desfeita no Histórico.",
          "Os jogadores gastam os dados de caçada no resultado de um teste, na própria ficha (o servidor rola os d4 ou d6 e grava junto com a rolagem), escolhem o prato do Sonnenblume e registram os próprios testes de passageiro.",
          "No confronto final, Preparar o confronto define os reféns pelo contador, uma vez só. Depois, passageiros, motoristas e Fim da rodada.",
        ], fonte: RAMA },
        { lista: [
          "Missão para quatro agentes de NEX 20%, com 20 pontos de prestígio.",
          "Contador de perseguição: começa em 6, fica entre 1 e 10. Dado de caçada: +1d4 num teste (+1d6 contra um Carcaça Vermelha); vários se somam.",
          "Explosão da viatura (Cena 4): contador 10, ação padrão ou de movimento –1, completa –2; ao zerar, 12d6 (fogo e impacto) e em chamas num raio de 6 m, Reflexos DT 25 reduz à metade e evita.",
          "Sonnenblume: Apfelstrudel (+1d4 nas resistências até o fim da missão), biscoito (1d4 PE temporários), cuca (2d4 PV temporários), Torta Marta Rocha (1d4 SAN temporários).",
          "Confronto: passageiros primeiro, DT 35, sem repetir a perícia da rodada anterior; cada sucesso tira 5 da DT do motorista naquela rodada; motorista: DT 25, 7 sucessos antes de 3 falhas. Falha de passageiro: d12 num alvo aleatório.",
          "Reféns: 14 ao preparar (Nicole já foi resgatada); o contador decide as mortes anteriores e o dado da pessoa querida; com sacrifícios ativos, morre um refém no fim de cada rodada (25% de ser a pessoa querida).",
        ], fonte: de("AS11", { paginas: "p. 60–91" }) },
        { texto: [
          "A Pilotagem do confronto final usa DT 25 (a regra da p. 86 separa a DT do motorista da DT 35 dos passageiros; o exemplo que vai de 35 para 20 levou a base dos passageiros para a conta). Três sucessos de passageiros levam o motorista a DT 10.",
          "Ignorar a fumaça na Cena 4 segue para a Cena 5 (padrão) ou a Cena 7 (imprudente): a volta à Cena 3 indicada na p. 79 contradiz o itinerário e a conclusão da p. 82.",
          "Com várias pessoas queridas vivas, a que morre no 1 do d4 é sorteada entre elas.",
          "Os pontos temporários do Sonnenblume expiram no fim da missão: sai o menor entre o que o prato deu e os temporários daquele recurso que a ficha ainda tem.",
        ], fonte: { interpretacao: true, livro: "Leitura do RAMA para Carcaças Vermelhas (Arquivos Secretos 11)" } },
        { titulo: "Aliados", texto: ["Bruna Machado e Rômulo Machado (iguais de propósito): treinado em Pilotagem, ou +1d20 se já for; Troca Tiro e Dá Porrada, +1d6 por 1 PE num teste de Luta ou Pontaria. Nicole Oliva da Silva: treinada em Artes, ou +1d20 se já for; Ajuda Como Dá, 1 PE para ela fazer algo simples (o mestre decide se dá). Os três estão na biblioteca de criaturas de Ordem como aliados."], fonte: de("AS11", { paginas: "p. 92, 96 e 97" }) },
      ], relacionados: ["viagens-estradas", "aliados"] },

    { id: "historico-rolagens", area: "campanhas", titulo: "Rolagens no histórico da mesa",
      resumo: "Quem manda rolagens para a campanha e onde vê-las.",
      termos: ["histórico", "rolagens da mesa", "log", "dados da mesa", "ver rolagens"],
      blocos: [
        { texto: ["Na campanha, a aba Rolagens mostra as rolagens das fichas vinculadas feitas pelo dono e pelo mestre, com a aparência do dado daquele momento. Rolagens de quem recebeu a ficha compartilhada e de fichas de demonstração não entram."], fonte: RAMA },
      ], relacionados: ["rolagens", "vincular-personagem"] },

    { id: "inquerito-as11", area: "faq", sistema: "ordem", titulo: "Esclarecimentos do Inquérito Mensal (Arquivos Secretos 11)",
      resumo: "Municiador Ambulante, granada de fumaça e óculos de visão térmica.",
      termos: ["municiador ambulante", "munição", "fumaça", "granada de fumaça", "visão térmica", "camuflagem", "cego", "inquérito"],
      blocos: [
        { lista: [
          "Municiador Ambulante só carrega pacotes de munição que você já tem; não cria pacotes.",
          "Granada de fumaça: vale o que o efeito diz — quem está na área fica cego e sob camuflagem total; quem está fora não. Efeito específico prevalece sobre as regras gerais de fumaça e de neblina.",
          "Óculos de visão térmica: tiram as penalidades por camuflagem, dentro ou fora da fumaça; as demais penalidades de cego da granada continuam.",
        ], fonte: de("AS11", { paginas: "p. 102" }) },
        { texto: ["As referências originais: a granada de fumaça e os óculos de visão térmica no livro básico; o Municiador Ambulante no Arquivos Secretos 9 (o R.A.M.A. já conta só os pacotes que estão com você)."], fonte: de("OPRPG", { paginas: "p. 64, 66, 290 e 292" }) },
        { texto: ["Municiador Ambulante: o poder de combatente que prepara pacotes de munição que estão com você."], fonte: de("AS9", { paginas: "p. 39" }) },
      ], relacionados: ["regras-opcionais"] },

    /* ================= CATÁLOGO ================= */
    { id: "catalogo-consultar", area: "catalogo", titulo: "Consultar o Catálogo",
      resumo: "Buscar conteúdo oficial por sistema, filtrar por livro e copiar para o Homebrew.",
      termos: ["catálogo", "consultar", "buscar regra", "origens", "poderes", "itens", "criaturas", "fonte", "página do livro"],
      blocos: [
        { texto: [
          "O Catálogo reúne o conteúdo oficial de cada sistema. Escolha o sistema, depois o tipo de conteúdo; busque pelo nome e use os filtros (Fonte, Categoria, Elemento, Círculo…). Cada entrada mostra o livro e a página para você conferir no seu material.",
          "Copiar para o Homebrew cria uma cópia sua, editável, sem mexer no original.",
        ], fonte: RAMA },
      ], relacionados: ["homebrew-criar", "adicionar-ritual"] },

    /* ================= HOMEBREW ================= */
    { id: "homebrew-criar", area: "homebrew", titulo: "Criar conteúdo Homebrew",
      resumo: "Itens, habilidades, rituais e criaturas seus, para usar nas fichas.",
      termos: ["homebrew", "criar item", "criar habilidade", "criar ritual", "criar criatura", "biblioteca", "conteúdo próprio"],
      blocos: [
        { passos: [
          "Abra Homebrew → + Criar e escolha o tipo.",
          "Preencha e salve. Você escolhe se a criação é só sua ou pública.",
          "Na ficha, no modo Edição, use Da biblioteca na seção certa para trazer uma cópia.",
        ], fonte: RAMA },
        { texto: ["A cópia na ficha é independente: editar o modelo depois não muda as fichas que já o usam."], fonte: RAMA },
      ], relacionados: ["homebrew-pacotes", "catalogo-consultar"] },

    { id: "homebrew-pacotes", area: "homebrew", titulo: "Pacotes de Homebrew",
      resumo: "Juntar criações num pacote e compartilhar com a mesa por código.",
      termos: ["pacote", "pacotes", "compartilhar homebrew", "código do pacote", "importar pacote"],
      blocos: [
        { texto: ["Na aba Pacotes do Homebrew você monta um pacote com várias criações e gera um código. Quem recebe o código vê a prévia e importa as entradas para a própria biblioteca."], fonte: RAMA },
      ], relacionados: ["homebrew-criar"] },

    /* ================= PERFIL ================= */
    { id: "personalizar-aparencia", area: "perfil", titulo: "Aparência: Legacy ou Modern20, tema e densidade",
      resumo: "Mudar o estilo da interface, as cores, o tamanho e o espaçamento.",
      termos: ["aparência", "tema", "modern20", "legacy", "escuro", "claro", "densidade", "compacta", "tamanho", "letra", "cores", "personalizar"],
      blocos: [
        { texto: [
          "Perfil → Aparência → Personalizar aparência: estilo da interface (Legacy ou Modern20), tema (do aparelho, claro, escuro ou personalizado) e o efeito de tela antiga. Essas escolhas são da conta e seguem você em qualquer aparelho.",
          "Em Neste aparelho ficam Tamanho da interface e Densidade (Confortável ou Compacta): valem só neste navegador.",
          "Cada ficha pode ter tema próprio pelo lápis ao lado de Normal e Edição.",
        ], fonte: RAMA },
      ], relacionados: ["perfil-conta"] },

    { id: "perfil-conta", area: "perfil", titulo: "Conta, avatar e temas de dados",
      resumo: "Nome de exibição, avatar, resgate de código e encerrar sessão.",
      termos: ["perfil", "nome", "avatar", "foto de perfil", "senha", "código", "tema de dados", "sair", "encerrar sessão"],
      blocos: [
        { texto: [
          "Perfil → Conta: Editar nome, avatar e Encerrar sessão. Perfil → Temas de dados: os temas desbloqueados e Resgatar código.",
          "A senha é gerida por quem administra o R.A.M.A.; para trocá-la, fale com a administração (Feedback, no menu do agente).",
        ], fonte: RAMA },
      ], relacionados: ["personalizar-aparencia", "faq-feedback"] },

    /* ================= PERGUNTAS FREQUENTES ================= */
    { id: "faq-salvamento", area: "faq", titulo: "Minhas alterações foram salvas?",
      resumo: "O indicador da ficha, a gravação automática e o que acontece sem internet.",
      termos: ["salvar", "salvou", "salvamento", "sincronização", "sincronizar", "perdi", "sumiu", "offline", "sem internet", "não salvou", "conflito"],
      blocos: [
        { texto: [
          "A ficha salva sozinha alguns instantes depois de cada mudança; o indicador no topo mostra “Salvo agora”, “Salvando…” ou o problema. Se a conexão cair, o que você fez continua na tela e o envio se repete quando ela voltar — não feche a aba antes do indicador confirmar.",
          "Se outra aba ou outro aparelho salvou a mesma ficha antes, o R.A.M.A. junta as mudanças que não se chocam e pergunta só o que conflitar. Em último caso, Opções da ficha (⋯) → Exportar ficha guarda o que está na tela.",
        ], fonte: RAMA },
      ], relacionados: ["ficha-modos", "faq-feedback"] },

    { id: "faq-nao-consigo-editar", area: "faq", titulo: "Não consigo editar a ficha",
      resumo: "Somente leitura, modo Normal ou acesso que mudou.",
      termos: ["não consigo editar", "não edita", "somente leitura", "bloqueado", "travado", "sem botão de edição", "não deixa mudar", "não posso editar", "sem permissão"],
      blocos: [
        { lista: [
          "O botão Edição não aparece e há “Somente leitura”: a ficha foi compartilhada com você como Leitor. Peça ao dono para mudar para Editor (Compartilhar…).",
          "Os campos da estrutura estão travados: a ficha está no modo Normal. Clique em Edição no topo.",
          "Apareceu aviso de acesso perdido: o dono removeu o compartilhamento ou tirou a ficha da campanha. O que estava na tela não é gravado; exporte se precisar.",
          "É a ficha de demonstração do tutorial: nada é gravado nela, de propósito.",
        ], fonte: RAMA },
      ], relacionados: ["compartilhar-ficha", "ficha-modos"] },

    { id: "faq-ficha-compartilhada", area: "faq", titulo: "Não encontro a ficha que compartilharam comigo",
      resumo: "Onde ficam as fichas recebidas e por que uma pode não aparecer.",
      termos: ["compartilhada comigo", "não aparece", "ficha sumiu", "recebi ficha", "compartilhados comigo", "acesso"],
      blocos: [
        { texto: ["Fichas recebidas ficam em Personagens → Compartilhados comigo (filtros por sistema e por acesso, Leitor ou Editor). Se não aparece, confira com o dono se ele salvou o compartilhamento com a sua conta. Para ter uma cópia sua, use Copiar para minha biblioteca."], fonte: RAMA },
      ], relacionados: ["compartilhar-ficha"] },

    { id: "faq-suplementos", area: "faq", titulo: "Um conteúdo de suplemento não aparece",
      resumo: "Suplemento desligado na ficha ou na campanha.",
      termos: ["suplemento", "não aparece", "origem não aparece", "poder não aparece", "conteúdo faltando", "arquivos secretos"],
      blocos: [
        { texto: ["Escolhas de suplemento só aparecem com o suplemento ligado: na ficha (Opções da ficha → Suplementos…) ou, numa ficha vinculada, nas Configurações da campanha — aí quem decide é o mestre. Regras opcionais, além disso, precisam estar ligadas na aba Regras (Ordem Paranormal)."], fonte: RAMA },
      ], relacionados: ["regras-opcionais"] },

    { id: "faq-sistemas", area: "faq", titulo: "Por que cada sistema tem uma ficha diferente?",
      resumo: "O que é comum a todos e o que muda em cada sistema.",
      termos: ["diferença entre sistemas", "sistema diferente", "converter ficha", "trocar sistema", "universal", "ordem 2"],
      blocos: [
        { texto: [
          "Cada sistema é um módulo com as regras do seu livro: a ficha, o dado, a criação e as ferramentas da mesa são dele. Os controles comuns (modos Normal e Edição, recursos, rolagem, abas, inventário, compartilhamento) funcionam igual em todos.",
          "Uma ficha não é convertida de um sistema para outro — nem de Ordem Paranormal para Ordem Paranormal RPG II, que é um sistema à parte. A Universal serve para qualquer jogo que ainda não tenha módulo próprio.",
        ], fonte: RAMA },
      ], relacionados: ["tutorial-universal", "criar-personagem"] },

    { id: "faq-importacao", area: "faq", titulo: "A importação deu erro",
      resumo: "Arquivo de outro formato, ficha de versão mais nova ou link do CRIS fechado.",
      termos: ["importação", "erro ao importar", "arquivo inválido", "cris", "link", "não importa"],
      blocos: [
        { lista: [
          "Arquivo inválido: use o .json gerado por Exportar ficha (não o PDF nem uma captura).",
          "Ficha de versão mais nova: atualize a página (o site pode estar em cache) e tente de novo.",
          "CRIS: o link precisa ser o público da ficha. Fichas privadas não são lidas.",
        ], fonte: RAMA },
      ], relacionados: ["importar-ficha", "faq-feedback"] },

    { id: "faq-feedback", area: "faq", titulo: "Encontrei um problema: como avisar",
      resumo: "O Feedback, no menu do agente, leva a mensagem a quem administra o R.A.M.A.",
      termos: ["feedback", "bug", "erro", "problema", "reportar", "sugestão", "contato", "ajuda não resolveu"],
      blocos: [
        { texto: ["Abra o menu do agente (⋯, no canto do cabeçalho) → Feedback. Descreva o que aconteceu e onde; o envio só acontece quando você confirmar. Para dúvidas de regra, consulte o livro do sistema — a fonte de cada regra aparece nos guias e no Catálogo."], fonte: RAMA },
      ], relacionados: ["faq-salvamento"] },

    /* ================= TUTORIAIS POR SISTEMA ================= */
    { id: "tutorial-universal", area: "sistemas", sistema: "universal", tipo: "tutorial", titulo: "Tutorial: Universal",
      resumo: "O modelo flexível: configure atributos, perícias, status e seções do seu jeito.",
      termos: ["universal", "ficha livre", "configurável", "qualquer rpg"],
      acoes: [{ rotulo: "Abrir percurso com ficha de exemplo", href: "ficha/?demo=universal", principal: true }],
      blocos: [
        { texto: ["A ficha Universal não impõe regra. O percurso mostra Configurar módulos, como criar um atributo e uma perícia e como renomear um status — o que você usa para montar a ficha do livro da sua mesa."], fonte: RAMA },
      ], relacionados: ["universal-configurar"] },

    { id: "tutorial-ordem", area: "sistemas", sistema: "ordem", tipo: "tutorial", titulo: "Tutorial: Ordem Paranormal",
      resumo: "NEX, classe e trilha, PV/PE/Sanidade calculados, perícias com grau, progressão e regras opcionais.",
      termos: ["ordem paranormal", "ordem", "nex", "trilha", "classe", "sanidade", "pe", "op"],
      acoes: [{ rotulo: "Abrir percurso com ficha de exemplo", href: "ficha/?demo=ordem", principal: true }],
      blocos: [
        { texto: ["O que muda em relação aos controles comuns: os números da Geral são calculados (passe o mouse ou toque para ver a composição), a aba Perícias rola com o grau de treinamento, a Progressão guarda cada escolha de NEX e a aba Regras liga as regras opcionais."], fonte: RAMA },
        { texto: ["Trilha em NEX 10%, poderes da trilha em 40%, 65% e 99%; graus de treinamento veterano a partir de NEX 35% e expert a partir de 70%."], fonte: de("OPRPG", { paginas: "p. 24, 26, 28, 30, 33 e 34" }) },
        { texto: ["Em NEX 50% o personagem se conecta a um elemento; a afinidade se desenvolve na primeira vez que transcender depois."], fonte: de("OPRPG", { paginas: "p. 110 e 114" }) },
      ], relacionados: ["companheiro-animal", "inventario-grade", "regras-opcionais"] },

    { id: "tutorial-ordem2", area: "sistemas", sistema: "ordem2", tipo: "tutorial", titulo: "Tutorial: Ordem Paranormal RPG II (Experimental)",
      resumo: "Atributo + perícia por degrau, PD, investigação e combate em fases — dos playtests.",
      termos: ["ordem 2", "ordem ii", "ordem paranormal 2", "playtest", "degrau", "pd", "pavor", "experimental"],
      acoes: [{ rotulo: "Abrir percurso com ficha de exemplo", href: "ficha/?demo=ordem2", principal: true }],
      blocos: [
        { texto: ["Ordem II é um sistema à parte, experimental: nada de Ordem Paranormal (1ª edição) é convertido. A ficha rola atributo + perícia por degraus de dado (d4 a d12) e gasta PD nas habilidades."], fonte: RAMA },
        { texto: ["Ficha, perícias, testes e investigação do Playtest Alpha."], fonte: de("ALPHA", { paginas: "p. 14–26" }) },
        { texto: ["Ficha, testes, combate, dano, lesões, traumas, pavor e relações do Playtest Beta."], fonte: de("BETA", { paginas: "p. 6–25" }) },
        { texto: ["Onde os playtests divergem entre si (nomes de perícia, valores de habilidades), o R.A.M.A. adota regras unificadas e registra cada escolha em docs/ORDEM2.md."], fonte: { interpretacao: true, livro: "Regras unificadas do R.A.M.A. para os playtests de Ordem II" } },
      ], relacionados: ["faq-sistemas"] },

    { id: "tutorial-oblivio", area: "sistemas", sistema: "oblivio", tipo: "tutorial", titulo: "Tutorial: Oblívio",
      resumo: "Persona, corpo em cinco regiões com Estresse, Coragem e Mazelas, testes e a mesa da Testemunha.",
      termos: ["oblívio", "oblivio", "persona", "estresse", "coragem", "mazela", "testemunha", "buraco"],
      acoes: [{ rotulo: "Abrir percurso com ficha de exemplo", href: "ficha/?demo=oblivio", principal: true }],
      blocos: [
        { texto: ["O que muda: a aba Persona mostra o corpo em cinco regiões, cada uma com Estresse; a aba Testes monta a parada; Estado guarda Mazelas e Coragem. Quem conduz é a Testemunha."], fonte: RAMA },
        { texto: ["Criação da Persona."], fonte: de("OBLIVIO", { paginas: "p. 17–47" }) },
        { texto: ["Testes e combate."], fonte: de("OBLIVIO", { paginas: "p. 48–52 e 86–90" }) },
      ], relacionados: ["faq-sistemas"] },

    { id: "tutorial-vampiro", area: "sistemas", sistema: "vampiro", tipo: "tutorial", titulo: "Tutorial: Vampiro: A Máscara (V5)",
      resumo: "Paradas de dados, dados de Fome, Força de Vontade, Humanidade e Disciplinas.",
      termos: ["vampiro", "v5", "fome", "humanidade", "disciplina", "força de vontade", "narrador", "clã"],
      acoes: [{ rotulo: "Abrir percurso com ficha de exemplo", href: "ficha/?demo=vampiro", principal: true }],
      blocos: [
        { texto: ["O que muda: a rolagem é uma parada de d10 (Atributo + Habilidade) com dados de Fome no lugar de dados comuns; Força de Vontade rerrola; as abas Sangue e Humanidade guardam Fome, Máculas e Remorso. Quem conduz é o Narrador."], fonte: RAMA },
        { texto: ["Paradas, dificuldade, críticos e Força de Vontade."], fonte: de("V5", { paginas: "p. 118–126" }) },
        { texto: ["Fome, Compulsões e Inflamar o Sangue."], fonte: de("V5", { paginas: "p. 201–213" }) },
      ], relacionados: ["faq-sistemas"] },

    { id: "tutorial-goblins", area: "sistemas", sistema: "goblins", tipo: "tutorial", titulo: "Tutorial: Malditos Goblins (3ª ed.)",
      resumo: "Dados que explodem no 6, hits, explosão de goblin e o Covil do mestre.",
      termos: ["goblins", "malditos goblins", "goblin", "hits", "explosão", "covil", "d6"],
      acoes: [{ rotulo: "Abrir percurso com ficha de exemplo", href: "ficha/?demo=goblins", principal: true }],
      blocos: [
        { texto: ["O que muda: os testes rolam d6 iguais ao atributo; cada 4, 5 ou 6 é um hit, o 6 explode e todos os dados em 1 explodem o goblin. A aba Combate cuida de ataque, esquiva e munição."], fonte: RAMA },
        { texto: ["Testes, explosão de dado e explosão de goblin."], fonte: de("GOBLINS", { paginas: "p. 14" }) },
        { texto: ["Combate, Habilidade, Noção e Vitalidade."], fonte: de("GOBLINS", { paginas: "p. 5" }) },
      ], relacionados: ["faq-sistemas"] },

    { id: "tutorial-brutal", area: "sistemas", sistema: "brutal", tipo: "tutorial", titulo: "Tutorial: BRUTAL (Corte Rápido)",
      resumo: "Pilha Comum, Pilha de Fuga, Pontos de Tensão e a Diretora.",
      termos: ["brutal", "corte rápido", "slasher", "pilha", "pontos de tensão", "diretora", "assassino", "sobrevivente"],
      acoes: [{ rotulo: "Abrir percurso com ficha de exemplo", href: "ficha/?demo=brutal", principal: true }],
      blocos: [
        { texto: ["O que muda: em vez de atributos somados, a Sobrevivente tem pilhas de dados; testar gasta dados da pilha, e o que falha é sacrificado (antes do Encontro) ou descartado (no Encontro). Vantagens custam Pontos de Tensão. Quem conduz é a Diretora."], fonte: RAMA },
        { texto: ["Cenas Livre e Suspense: dados que falham são sacrificados."], fonte: de("BRUTAL", { paginas: "p. 4" }) },
        { texto: ["Cena de Encontro: dados que falham são descartados; Ações de Encontro."], fonte: de("BRUTAL", { paginas: "p. 21–22" }) },
      ], relacionados: ["faq-sistemas"] },

    { id: "tutorial-tormenta20", area: "sistemas", sistema: "tormenta20", tipo: "tutorial", titulo: "Tutorial: Tormenta20 (Jogo do Ano)",
      resumo: "Raça, classe e origem, perícias por ½ nível, magias com aprimoramentos e carga em espaços.",
      termos: ["tormenta", "tormenta20", "t20", "magia", "pm", "nd", "raça", "classe", "origem", "divindade"],
      acoes: [{ rotulo: "Abrir percurso com ficha de exemplo", href: "ficha/?demo=tormenta20", principal: true }],
      blocos: [
        { texto: ["O que muda: a aba Combate traz PV, PM, Defesa e ataques com as parcelas; Perícias soma metade do nível, atributo e treino; Magias controla custo e aprimoramentos; Progressão sobe de nível pela tabela da classe."], fonte: RAMA },
        { texto: ["Atributos (compra por pontos ou 4d6)."], fonte: de("T20", { paginas: "p. 17" }) },
        { texto: ["Raças (p. 18–31), classes (p. 32–84), origens (p. 85–95) e divindades (p. 96)."], fonte: de("T20", { paginas: "p. 18–96" }) },
        { texto: ["Magias e aprimoramentos."], fonte: de("T20", { paginas: "p. 168–211" }) },
      ], relacionados: ["adicionar-ritual", "faq-sistemas"] },
  ];

  /* -----------------------------------------------------------------
     BUSCA
     ----------------------------------------------------------------- */

  function chave(t) {
    return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9%]+/g, " ").trim();
  }
  var VAZIAS = { a: 1, o: 1, as: 1, os: 1, de: 1, da: 1, do: 1, das: 1, dos: 1, e: 1, em: 1, um: 1, uma: 1, com: 1, para: 1, pra: 1, no: 1, na: 1, nos: 1, nas: 1, meu: 1, minha: 1, como: 1, eu: 1, que: 1, se: 1, por: 1, ao: 1 };

  function textoDoArtigo(a) {
    var partes = [];
    (a.blocos || []).forEach(function (b) {
      if (b.titulo) partes.push(b.titulo);
      (b.texto || []).forEach(function (t) { partes.push(t); });
      (b.lista || []).forEach(function (t) { partes.push(t); });
      (b.passos || []).forEach(function (t) { partes.push(t); });
    });
    return partes.join(" ");
  }

  var INDICE = ARTIGOS.map(function (a) {
    return {
      artigo: a,
      titulo: chave(a.titulo),
      termos: (a.termos || []).map(chave),
      resumo: chave(a.resumo),
      corpo: chave(textoDoArtigo(a)),
      sistema: chave(a.sistema ? SISTEMAS[a.sistema] : ""),
    };
  });

  /* Pontua título, termos relacionados, resumo e corpo; a frase inteira
     num termo (um sintoma como "não consigo editar") vale mais. */
  function buscar(consulta, opcoes) {
    var o = opcoes || {};
    var q = chave(consulta);
    if (!q) return [];
    var palavras = q.split(" ").filter(function (p) { return p && !VAZIAS[p]; });
    if (!palavras.length) palavras = q.split(" ");
    var achados = [];
    INDICE.forEach(function (i) {
      if (o.area && i.artigo.area !== o.area) return;
      if (o.sistema && i.artigo.sistema && i.artigo.sistema !== o.sistema) return;
      var pontos = 0;
      if (i.titulo.indexOf(q) >= 0) pontos += 12;
      if (i.termos.some(function (t) { return t === q; })) pontos += 14;
      else if (i.termos.some(function (t) { return t.indexOf(q) >= 0 || (q.length > 5 && q.indexOf(t) >= 0); })) pontos += 8;
      var casadas = 0;
      palavras.forEach(function (p) {
        var raiz = p.length > 5 ? p.slice(0, p.length - 2) : p;
        var aqui = 0;
        if (i.titulo.indexOf(raiz) >= 0) aqui = Math.max(aqui, 5);
        if (i.termos.some(function (t) { return t.indexOf(raiz) >= 0; })) aqui = Math.max(aqui, 4);
        if (i.sistema.indexOf(raiz) >= 0) aqui = Math.max(aqui, 3);
        if (i.resumo.indexOf(raiz) >= 0) aqui = Math.max(aqui, 2);
        if (i.corpo.indexOf(raiz) >= 0) aqui = Math.max(aqui, 1);
        if (aqui) casadas++;
        pontos += aqui;
      });
      /* Mais de uma palavra: quem casa só uma fica bem atrás. */
      if (palavras.length > 1 && casadas < Math.ceil(palavras.length / 2)) pontos = Math.floor(pontos / 3);
      if (pontos > 0) achados.push({ artigo: i.artigo, pontos: pontos });
    });
    achados.sort(function (a, b) { return b.pontos - a.pontos || a.artigo.titulo.localeCompare(b.artigo.titulo, "pt-BR"); });
    return achados.slice(0, o.limite || 12).map(function (x) { return x.artigo; });
  }

  function artigo(id) { return ARTIGOS.filter(function (a) { return a.id === id; })[0] || null; }

  /* A linha da fonte de um bloco, em texto. */
  function textoDaFonte(f) {
    if (!f || f.rama) return "Funcionamento do RAMA";
    var nome = f.livro + (f.edicao ? " (" + f.edicao + ")" : "");
    var onde = f.paginas ? ", " + f.paginas : (f.secao ? " — " + f.secao + " (sem página verificada)" : "");
    var marca = f.fa ? "Conteúdo de fã, não oficial: " : (f.interpretacao ? "Interpretação do RAMA: " : "Fonte: ");
    return marca + nome + onde;
  }

  global.RAMAAjuda = {
    ARTIGOS: ARTIGOS, AREAS: AREAS, SISTEMAS: SISTEMAS,
    artigo: artigo, buscar: buscar, textoDaFonte: textoDaFonte, chave: chave,
  };
})(typeof window !== "undefined" ? window : globalThis);
