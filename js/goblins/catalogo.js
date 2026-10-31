/* =====================================================================
   R.A.M.A. — Malditos Goblins (3ª edição) · o catálogo
   =====================================================================
   Tudo o que o livro tabela, com a PÁGINA impressa (no PDF digital a
   página do arquivo é a mesma). Nenhuma regra mora aqui: só dados, que
   o motor (regras.js), o dado (dados.js) e a mesa (mesa.js) leem.

   Os textos são resumos para consulta ao lado da ação, não o livro.

   Valores especiais dos inimigos (p. 21–23): `null` é o "-" do livro
   (o atributo NÃO EXISTE: Golem não tem Noção), diferente de 0 (o Zumbi
   Goblin tem Habilidade 0); "?" (Besta Indescritível) é `indescritivel`
   e não ganha número nenhum. O número entre parênteses é guardado À
   PARTE: em Combate são os dados da arma (`bonusCombate`), em
   Vitalidade é a durabilidade das proteções (`protecao`) — nunca
   Vitalidade extra.

   Adaptações (p. 32–41): cada uma marca o que traz com `adaptacao`.
   ===================================================================== */

(function (global) {
  "use strict";

  var LIVRO = "Malditos Goblins 3ª ed.";
  function referencia(pagina) { return pagina ? LIVRO + ", p. " + pagina : LIVRO; }

  var ATRIBUTOS = [
    { chave: "combate", nome: "Combate", curto: "Com", texto: "Dados para atacar (e se esquivar).", pagina: 5 },
    { chave: "habilidade", nome: "Habilidade", curto: "Hab", texto: "Dados para ações físicas fora de combate.", pagina: 5 },
    { chave: "nocao", nome: "Noção", curto: "Noç", texto: "Dados para saber de algo e para conjurar.", pagina: 5 },
    { chave: "vitalidade", nome: "Vitalidade", curto: "Vit", texto: "Quantos ferimentos aguenta: morre com MAIS ferimentos que a Vitalidade.", pagina: 5 },
  ];
  var CHAVES_ATRIBUTO = ATRIBUTOS.map(function (a) { return a.chave; });

  /* ---- 1ª etapa: nome (p. 4). Dois dados: o 1º é a COLUNA, o 2º a
     LINHA. A linha 6 tem só duas casas largas; o R.A.M.A. lê colunas
     1–3 como a primeira e 4–6 como a segunda (ver INCONSISTENCIAS). */
  var NOMES = [
    ["Plaft", "Glub", "Crash", "Spray", "Bing", { especial: "comida", texto: "[Última coisa que comeu]" }],
    ["Plin", "Tim", "Zzzz", "Cringe", "Riso", { especial: "comida", texto: "[Última coisa que comeu]" }],
    ["Tik", "Ranço", "Sussa", "Sopa", "Slash", { especial: "comida", texto: "[Última coisa que comeu]" }],
    ["Tok", "Yhaa", "Bibi", "Ovo", "Coff", { especial: "inverter", texto: "[Inverta seu nome]" }],
    ["Bash", "Vrum", "Boom", "Ban", "Ugh", { especial: "inverter", texto: "[Inverta seu nome]" }],
    ["Cricri", "Aiaiai", "Bum", "Nhack", "Sniff", { especial: "inverter", texto: "[Inverta seu nome]" }],
  ];

  /* ---- 2ª etapa: ocupação e descritor (p. 4–5, técnicas p. 7–9) ---- */
  var OCUPACOES = {
    mercenario: {
      nome: "Mercenário", pagina: 7, mod: { combate: 1 },
      equipamento: [
        { rotulo: "Espada e Escudo", itens: ["espada", "escudo"] },
        { rotulo: "2 Machadinhas", itens: ["machadinha", "machadinha"] },
        { rotulo: "Machadão", itens: ["machadao"] },
      ],
      escolhas: ["armaFavorita"],
      tecnicas: [
        { nivel: 1, chave: "mestreDeArmas", nome: "Mestre de Armas", texto: "+1 dado em todos os ataques com a sua arma favorita." },
        { nivel: 2, chave: "ataqueGiratorio", nome: "Ataque Giratório", texto: "Ao causar dano com arma corporal, pode fazer mais um ataque contra outro inimigo ao alcance." },
        { nivel: 3, chave: "ataqueBrutal", nome: "Ataque Brutal", uso: "dia", texto: "1 vez por dia: um ataque corporal com o dobro de dados." },
      ],
    },
    cacador: {
      nome: "Caçador", pagina: 7, mod: { combate: 1 },
      equipamento: [
        { rotulo: "3 Adagas", itens: ["adaga", "adaga", "adaga"] },
        { rotulo: "Arco de Caça", itens: ["arcoEFlecha"], nota: "O livro diz “Arco de Caça”; a tabela de armas só tem Arco e Flecha (ver inconsistências)." },
        { rotulo: "Pistola e Chapéu", itens: ["pistola", "chapeu"] },
      ],
      escolhas: ["especieInimiga"],
      tecnicas: [
        { nivel: 1, chave: "inimigo", nome: "Inimigo", texto: "Escolha uma espécie de criatura no começo: +1 dado em todos os ataques contra ela." },
        { nivel: 2, chave: "rastrear", nome: "Rastrear", texto: "Sabe seguir pegadas e identificar a criatura que as deixou." },
        { nivel: 3, chave: "tiroCerteiro", nome: "Tiro Certeiro", uso: "dia", texto: "1 vez por dia: um ataque à distância com o dobro de dados." },
      ],
    },
    gatuno: {
      nome: "Gatuno", pagina: 8, mod: { habilidade: 1 },
      equipamento: [
        { rotulo: "3 Adagas", itens: ["adaga", "adaga", "adaga"] },
        { rotulo: "Rapieira e Broquel", itens: ["rapieira", "broquel"] },
        { rotulo: "Pistola e Chapéu", itens: ["pistola", "chapeu"] },
      ],
      escolhas: [],
      tecnicas: [
        { nivel: 1, chave: "roubar", nome: "Roubar", texto: "Com 1 hit num teste de Habilidade, rouba um objeto do bolso de alguém sem que perceba." },
        { nivel: 2, chave: "ataqueFurtivo", nome: "Ataque Furtivo", texto: "+2 dados no ataque contra um alvo que não sabe onde você está." },
        { nivel: 3, chave: "esconder", nome: "Esconder", uso: "dia", texto: "1 vez por dia: esconde-se sem teste, até se mexer ou fazer barulho." },
      ],
    },
    lider: {
      nome: "Líder", pagina: 9, mod: { vitalidade: 1 },
      equipamento: [
        { rotulo: "Espada e Medalhas de Guerra", itens: ["espada", "medalhasDeGuerra"], nota: "Medalhas de Guerra não estão em nenhuma tabela: entram como item sem regra." },
        { rotulo: "Lança e Elmo", itens: ["lanca", "elmo"] },
        { rotulo: "Espadona", itens: ["espadona"] },
      ],
      escolhas: [],
      tecnicas: [
        { nivel: 1, chave: "gritoDeGuerra", nome: "Grito de Guerra", uso: "dia", texto: "1 vez por dia: teste de Noção; com 1 hit, todos os seus aliados ficam com Combate +1 até o fim da batalha." },
        { nivel: 2, chave: "humilhacao", nome: "Humilhação", uso: "dia", texto: "1 vez por dia: grita e xinga um aliado, que elimina todos os ferimentos." },
        { nivel: 3, chave: "ataqueBrutal", nome: "Ataque Brutal", uso: "dia", texto: "1 vez por dia: um ataque corporal com o dobro de dados." },
      ],
    },
    incendiario: {
      nome: "Incendiário", pagina: 8, mod: { vitalidade: 1 },
      equipamento: [
        { rotulo: "Barril de Pólvora", itens: ["barrilDePolvora"] },
        { rotulo: "Pistola e Galinha Explosiva", itens: ["pistola", "galinhaExplosiva"] },
        { rotulo: "Bacamarte e Chapéu", itens: ["bacamarte", "chapeu"] },
      ],
      escolhas: [],
      tecnicas: [
        { nivel: 1, chave: "resistencia", nome: "Resistência", texto: "Recebe 1 ferimento a menos de ataques de fogo ou de tiro de arma de fogo." },
        { nivel: 2, chave: "delirio", nome: "Delírio", texto: "Pode se livrar de todos os ferimentos se explodir ou queimar completamente uma casa ou algo maior." },
        { nivel: 3, chave: "imunidade", nome: "Imunidade", texto: "Imune a fogo." },
      ],
    },
    bruxo: {
      nome: "Bruxo", pagina: 9, mod: { nocao: 1 },
      equipamento: [
        { rotulo: "Cajado", itens: ["cajado"] },
        { rotulo: "Varinha e Cachecol", itens: ["varinha", "cachecol"] },
        { rotulo: "Vassoura e Chapéu", itens: ["vassoura", "chapeu"] },
      ],
      escolhas: ["magias"],
      tecnicas: [
        { nivel: 1, chave: "magias", nome: "Magias", texto: "Escolha 3 magias da lista; para conjurar, teste de Noção e consulte a magia (p. 10)." },
        { nivel: 2, chave: "condutorMagico", nome: "Condutor Mágico", texto: "+1 dado ao conjurar por uma varinha, cajado ou outro Condutor Mágico." },
        { nivel: 3, chave: "implacavel", nome: "Implacável", uso: "dia", texto: "1 vez por dia: conjura sem rolar, escolhendo o resultado." },
      ],
    },
    /* Adaptações que trazem ocupação própria. */
    treinador: {
      nome: "Treinador", pagina: 34, adaptacao: "pokepragas", mod: { habilidade: 1 },
      equipamento: [{ rotulo: "6 PokéPedras", itens: [], pokepedras: 6 }],
      escolhas: [],
      tecnicas: [
        { nivel: 1, chave: "pokepragaInicial", nome: "PokéPraga Inicial", texto: "Começa com uma PokéPraga incomum (rolada na tabela)." },
        { nivel: 2, chave: "mestreDaEvolucao", nome: "Mestre da Evolução", texto: "Rola dois dados ao verificar a evolução." },
        { nivel: 3, chave: "mestreTreinador", nome: "Mestre Treinador", texto: "O melhor dos melhores. Pode rir dos outros agora." },
      ],
    },
    fazendeiro: {
      nome: "Fazendeiro", pagina: 40, adaptacao: "vale", modEscolha: ["habilidade", "nocao"],
      equipamento: [
        { rotulo: "Bacamarte, Chapéu e Enxada", itens: ["bacamarte", "chapeu", "enxada"] },
        { rotulo: "Picareta, Machado, Enxada e Vara de Pesca", itens: ["picareta", "machado", "enxada", "varaDePesca"] },
      ],
      escolhas: [],
      tecnicas: [
        { nivel: 1, chave: "heranca", nome: "Herança", texto: "Herdou uma fazenda com 1 galinha e 1 vaca." },
        { nivel: 2, chave: "dedoVerde", nome: "Dedo Verde", texto: "Ao colher uma horta, recebe o dobro de alimentos." },
        { nivel: 3, chave: "matadorDePragas", nome: "Matador de Pragas", texto: "+1 dado em combate contra criaturas que são pestes nas fazendas." },
      ],
    },
  };
  var OCUPACAO_D6 = ["mercenario", "cacador", "gatuno", "lider", "incendiario", "bruxo"];

  var DESCRITORES = {
    covarde: { nome: "Covarde", mod: { combate: -1 } },
    atrapalhado: { nome: "Atrapalhado", mod: { habilidade: -1 } },
    tapado: { nome: "Tapado", mod: { nocao: -1 } },
    fracote: { nome: "Fracote", mod: { vitalidade: -1 } },
    mediocre: { nome: "Medíocre", mod: {} },
    supimpa: { nome: "Supimpa", mod: {}, escolha: true, texto: "Escolha um atributo para ganhar +1." },
  };
  var DESCRITOR_D6 = ["covarde", "atrapalhado", "tapado", "fracote", "mediocre", "supimpa"];

  /* ---- 3ª etapa: característica (p. 4 e 6). Dois dados: 1º COLUNA,
     2º LINHA. "rolarDuasVezes": rola duas outras. */
  var CARACTERISTICAS = {
    amaldicoado: { nome: "Amaldiçoado", texto: "Acha que é um humano amaldiçoado. É só um goblin perdido." },
    amarelo: { nome: "Amarelo", texto: "Pele amarela." },
    apendiceExtra: { nome: "Apêndice extra", texto: "Dois apêndices: o dobro de chance de apendicite." },
    aracnideo: { nome: "Aracnídeo", texto: "Escala superfícies lisas e pode defecar cordas de seda." },
    azul: { nome: "Azul", texto: "Pele azul." },
    bombaRelogio: { nome: "Bomba-relógio", texto: "Quando alguém fala de fogo ou explosão, role 1 dado: com 1, você explode.", acao: "bombaRelogio" },
    bracoExtra: { nome: "Braço extra", texto: "Um braço extra no meio das costas." },
    cabecaExtra: { nome: "Cabeça extra", texto: "Duas cabeças (que não pensam melhor que uma)." },
    cabecao: { nome: "Cabeção", texto: "Cérebro gigante: sabe coisas obscuras, mas não pode usar elmos ou bonés.", semElmo: true, semBone: true },
    chifre: { nome: "Chifre", texto: "Um chifre de unicórnio na testa." },
    cicatrizes: { nome: "Cicatrizes", texto: "Cicatrizes por todo o corpo." },
    cinzento: { nome: "Cinzento", texto: "Pele cinza e enrugada (barba branca opcional)." },
    colorido: { nome: "Colorido", texto: "Pele de vários tons, que trocam de lugar toda manhã." },
    felino: { nome: "Felino", texto: "Acha que é um gato." },
    flutulencia: { nome: "Flutulência", texto: "Vive peidando; pode usar isso para saltar até 6 m ou correr com o dobro da velocidade." },
    fosforescente: { nome: "Fosforescente", texto: "Verde fosforescente: brilha no escuro." },
    galinaceo: { nome: "Galináceo", texto: "Acha que é uma galinha." },
    linguao: { nome: "Linguão", texto: "Língua gigante, fora da boca, babando: não fala direito." },
    listras: { nome: "Listras", texto: "Listras azuis por todo o corpo." },
    maoGigante: { nome: "Mão gigante", texto: "Uma das mãos tem o dobro do tamanho." },
    minicabeca: { nome: "Minicabeça", texto: "Cabeça minúscula: não pode usar elmos.", semElmo: true },
    minion: { nome: "Minion", texto: "Camiseta amarela, odeia vermelho, acredita em qualquer mentira." },
    narizExtra: { nome: "Nariz extra", texto: "Um nariz extra no cotovelo." },
    olhoGigante: { nome: "Olho gigante", texto: "Um olho gigante que raramente pisca." },
    olhosExtras: { nome: "Olhos extras", texto: "1d6 olhos a mais na cabeça.", quantidade: "1d6", unidade: "olho(s) a mais" },
    orelhaExtra: { nome: "Orelha extra", texto: "Uma orelha extra embaixo do sovaco." },
    peixoso: { nome: "Peixoso", texto: "Acha que é um peixe e precisa estar sempre molhado." },
    pesGigantes: { nome: "Pés gigantes", texto: "Não pode usar nenhum tipo de calçado.", semCalcado: true },
    pintas: { nome: "Pintas", texto: "Pintas cor-de-rosa, algumas em forma de coração." },
    pompom: { nome: "Pompom", texto: "Rabinho com pompom." },
    porosFedidos: { nome: "Poros fedidos", texto: "Odor insuportável: ninguém fica perto por muito tempo." },
    tomBelico: { nome: "Tom bélico", texto: "Quem conversa com você se ofende sem razão." },
    verdura: { nome: "Verdura", texto: "Acha que é uma planta e insiste na fotossíntese." },
    vermelho: { nome: "Vermelho", texto: "Pele vermelha." },
  };
  Object.keys(CARACTERISTICAS).forEach(function (k) { CARACTERISTICAS[k].pagina = 6; });
  /* [coluna 1..6][linha 1..6] */
  var CARACTERISTICA_2D6 = [
    ["bombaRelogio", "cinzento", "amaldicoado", "tomBelico", "flutulencia", "rolarDuasVezes"],
    ["minicabeca", "cabecao", "linguao", "olhoGigante", "pesGigantes", "maoGigante"],
    ["apendiceExtra", "orelhaExtra", "narizExtra", "olhosExtras", "bracoExtra", "cabecaExtra"],
    ["porosFedidos", "pintas", "listras", "pompom", "chifre", "cicatrizes"],
    ["verdura", "minion", "galinaceo", "peixoso", "felino", "aracnideo"],
    ["rolarDuasVezes", "fosforescente", "colorido", "amarelo", "azul", "vermelho"],
  ];

  /* ---- magias (p. 10–11; Invocação, p. 33) ----
     Cada resultado traz o que o motor APLICA sozinho (`proprio`: em
     quem conjurou) e o que pede ALVO (`alvos`) — e nada além do que o
     livro diz. `narrativo`: só descrição. */
  var MAGIAS = {
    fogo: { nome: "Fogo", pagina: 10, resultados: [
      { texto: "Uma explosão queima seu rosto: você recebe 1 ferimento.", proprio: { ferimentos: 1, fogo: true } },
      { texto: "Uma bolinha de fogo que ilumina o caminho. Não dá para arremessar.", narrativo: true },
      { texto: "Uma grande bola de fogo: ilumina ou, arremessada, causa automaticamente 3 ferimentos a um alvo visível.", alvos: { quem: "umVisivel", ferimentos: 3, fogo: true, automatico: true, opcional: true } },
      { texto: "Uma rajada de fogo engole todas as criaturas à sua frente, incluindo aliados: 4 ferimentos de fogo em cada uma.", alvos: { quem: "todosAFrente", ferimentos: 4, fogo: true, automatico: true } },
    ] },
    gelo: { nome: "Gelo", pagina: 10, resultados: [
      { texto: "Um dos seus braços congela e não pode ser usado até o fim do dia.", proprio: { efeito: { chave: "bracoCongelado", nome: "Braço congelado", ate: "fimDoDia", texto: "Um braço não pode ser usado (Gelo, 0 hits)." } } },
      { texto: "Um raio de frio: um inimigo recebe 1 ferimento.", alvos: { quem: "umInimigo", ferimentos: 1 } },
      { texto: "Um raio de frio: um inimigo recebe 1 ferimento e não age no próximo turno dele.", alvos: { quem: "umInimigo", ferimentos: 1, efeito: { chave: "semAgir", nome: "Congelado: não age", ate: "turnos", turnos: 1 } } },
      { texto: "Todas as criaturas visíveis, incluindo aliados, ficam congeladas por alguns minutos (conscientes sob o gelo).", alvos: { quem: "todosVisiveis", efeito: { chave: "congelado", nome: "Congelado (alguns minutos)", ate: "manual" } } },
    ] },
    relampago: { nome: "Relâmpago", pagina: 11, resultados: [
      { texto: "Um relâmpago cai em você: 1 ferimento.", proprio: { ferimentos: 1 } },
      { texto: "Um relâmpago cai num inimigo à sua escolha: 1 ferimento.", alvos: { quem: "umInimigo", ferimentos: 1 } },
      { texto: "Relâmpagos em até 4 inimigos à sua escolha: 1 ferimento em cada.", alvos: { quem: "ate4Inimigos", ferimentos: 1, maximo: 4 } },
      { texto: "Uma tempestade se forma: relâmpagos caem aleatoriamente até o fim da batalha.", mesa: { chave: "tempestade", nome: "Tempestade de relâmpagos", ate: "fimDaBatalha", texto: "O livro não diz quantos raios nem quanto dano: a mesa sorteia o alvo e decide." } },
    ] },
    troca: { nome: "Troca", pagina: 11, resultados: [
      { texto: "Sua roupa é trocada pela de outro personagem aleatório.", sorteiaPersonagem: true, narrativo: true },
      { texto: "Some e aparece num local à sua escolha; roupas e pertences ficam para trás.", narrativo: true },
      { texto: "Some e aparece num local à sua escolha, com roupas e pertences.", narrativo: true },
      { texto: "Some e aparece num local aleatório desconhecido.", narrativo: true },
    ] },
    cura: { nome: "Cura", pagina: 11, resultados: [
      { texto: "Fica pálido e tonto: perde 1 de Vitalidade até o fim do dia.", proprio: { efeito: { chave: "curaFalhou", nome: "Pálido e tonto", ate: "fimDoDia", mods: { vitalidade: -1 } } } },
      { texto: "Um aliado ao seu toque remove 1 ferimento.", alvos: { quem: "umAliado", curar: 1 } },
      { texto: "Um aliado ao seu toque remove todos os ferimentos.", alvos: { quem: "umAliado", curar: "todos" } },
      { texto: "Todas as criaturas visíveis, incluindo inimigos, removem todos os ferimentos.", proprio: { curar: "todos" }, alvos: { quem: "todosVisiveis", curar: "todos" } },
    ] },
    morte: { nome: "Morte", pagina: 11, resultados: [
      { texto: "Sua pele cai e você vira um esqueleto ambulante: perde PERMANENTEMENTE 1 de Habilidade e 1 de Vitalidade.", proprio: { permanente: { habilidade: -1, vitalidade: -1 }, marca: "esqueleto" } },
      { texto: "Anima um esqueleto inteiro, que luta por você por 2 turnos.", mesa: { aliado: "esqueletoHumano", turnos: 2 } },
      { texto: "Anima um esqueleto inteiro, que luta por você até o fim da batalha.", mesa: { aliado: "esqueletoHumano", ate: "fimDaBatalha" } },
      { texto: "Todos os esqueletos a até 10 m ganham vida e dançam por 1 hora.", narrativo: true },
    ] },
    planta: { nome: "Planta", pagina: 11, resultados: [
      { texto: "Nascem folhas e flores por todo o seu corpo.", narrativo: true },
      { texto: "Cria plantas ou arbustos com o toque na terra.", narrativo: true },
      { texto: "Cria plantas em qualquer lugar visível; pode prender os pés de inimigos.", alvos: { quem: "umInimigo", opcional: true, efeito: { chave: "presoPorPlantas", nome: "Pés presos por plantas", ate: "manual", texto: "O livro não dá número: a mesa decide quando solta." } } },
      { texto: "Surge um matagal à sua volta (raio de 5 m).", narrativo: true },
    ] },
    invocacao: { nome: "Invocação", pagina: 33, adaptacao: "cthulin", resultados: [
      { texto: "Uma visão da realidade eterna: receba 1 Medo.", proprio: { medo: 1 } },
      { texto: "Invoca um Horror, mas ele não obedece.", mesa: { horror: "desobediente" } },
      { texto: "Invoca um Horror que cumpre UM comando seu.", mesa: { horror: "umComando" } },
      { texto: "Invoca um Horror que obedece até o fim dos tempos.", mesa: { horror: "obediente" } },
    ] },
  };
  var MAGIAS_DO_BRUXO = ["fogo", "gelo", "relampago", "troca", "cura", "morte", "planta"];

  /* ---- armas (p. 12; WarGoblin p. 36) ----
     maos 1|2; ataque "corporal"|"distancia"; bonus em dados;
     arremesso, condutor, recarga, municao (null = ilimitada), fogo (arma
     de fogo, para a Resistência do Incendiário). */
  var ARMAS = {
    adaga: { nome: "Adaga", maos: 1, ataque: "corporal", bonus: 1, arremesso: true },
    arcoEFlecha: { nome: "Arco e Flecha", maos: 2, ataque: "distancia", bonus: 2, municao: 10, arco: true },
    bacamarte: { nome: "Bacamarte", maos: 2, ataque: "distancia", bonus: 3, recarga: true, municao: 2, fogo: true },
    besta: { nome: "Besta", maos: 2, ataque: "distancia", bonus: 3, recarga: true, municao: 6, arco: true },
    cajado: { nome: "Cajado", maos: 2, ataque: "corporal", bonus: 1, condutor: true },
    clava: { nome: "Clava", maos: 1, ataque: "corporal", bonus: 1 },
    espada: { nome: "Espada", maos: 1, ataque: "corporal", bonus: 2 },
    espadaDeMadeira: { nome: "Espada de Madeira", maos: 1, ataque: "corporal", bonus: 0 },
    espadona: { nome: "Espadona", maos: 2, ataque: "corporal", bonus: 3 },
    estilingue: { nome: "Estilingue", maos: 2, ataque: "distancia", bonus: 0, recarga: true },
    faca: { nome: "Faca", maos: 1, ataque: "corporal", bonus: 1 },
    forcado: { nome: "Forcado", maos: 2, ataque: "corporal", bonus: 2 },
    gadanha: { nome: "Gadanha", maos: 2, ataque: "corporal", bonus: 3 },
    lanca: { nome: "Lança", maos: 2, ataque: "corporal", bonus: 3 },
    machadao: { nome: "Machadão", maos: 2, ataque: "corporal", bonus: 3 },
    machadinha: { nome: "Machadinha", maos: 1, ataque: "corporal", bonus: 2, arremesso: true },
    martelao: { nome: "Martelão", maos: 2, ataque: "corporal", bonus: 3 },
    pistola: { nome: "Pistola", maos: 1, ataque: "distancia", bonus: 2, recarga: true, municao: 5, fogo: true },
    rapieira: { nome: "Rapieira", maos: 1, ataque: "corporal", bonus: 2 },
    varinha: { nome: "Varinha", maos: 1, ataque: "corporal", bonus: 0, varinha: true },
    vassoura: { nome: "Vassoura", maos: 2, ataque: "corporal", bonus: 1, condutor: true },
    pistolaBolter: { nome: "Pistola Bólter", maos: 1, ataque: "distancia", bonus: 2, municao: 12, fogo: true, adaptacao: "wargoblin", pagina: 36 },
    metrancaDePlasma: { nome: "Metranca de Plasma", maos: 2, ataque: "distancia", bonus: 3, municao: 8, adaptacao: "wargoblin", pagina: 36 },
    lancaChamas: { nome: "Lança-chamas", maos: 2, ataque: "distancia", bonus: 4, alcance: "3 metros", ataqueDeFogo: true, adaptacao: "wargoblin", pagina: 36 },
    espadaSerra: { nome: "Espada Serra", maos: 1, ataque: "corporal", bonus: 4, adaptacao: "wargoblin", pagina: 36 },
    maozonaDoPoder: { nome: "Mãozona do Poder", maos: 1, ataque: "corporal", bonus: 3, condutor: true, adaptacao: "wargoblin", pagina: 36 },
  };
  Object.keys(ARMAS).forEach(function (k) { if (!ARMAS[k].pagina) ARMAS[k].pagina = 12; if (ARMAS[k].municao === undefined) ARMAS[k].municao = null; });

  var ESPECIAIS_DE_ARMA = {
    arremesso: { nome: "Arremesso", texto: "Pode ser arremessado como arma de distância.", pagina: 12 },
    condutor: { nome: "Condutor Mágico", texto: "Pode conjurar magias através deste item.", pagina: 12 },
    municao: { nome: "Munição [X]", texto: "Limite de X ataques; depois, precisa de mais munição.", pagina: 12 },
    recarga: { nome: "Recarga", texto: "Depois de atacar, gasta um turno recarregando para atacar de novo.", pagina: 12 },
  };

  /* ---- proteções (p. 13; WarGoblin p. 37; itens mágicos p. 25–27) ----
     uso: umaMao | pescoco | cabeca | tronco | corpo | pes | ombros.
     `elmo`: conta como elmo (Cabeção e Minicabeça não usam).
     `calcado`: Pés gigantes não usa. */
  var PROTECOES = {
    broquel: { nome: "Broquel", uso: "umaMao", durabilidade: 1 },
    cachecol: { nome: "Cachecol", uso: "pescoco", durabilidade: 0, arcano: true },
    chapeu: { nome: "Chapéu", uso: "cabeca", durabilidade: 0, sorte: true },
    cotaDeMalha: { nome: "Cota de Malha", uso: "tronco", durabilidade: 2 },
    elmo: { nome: "Elmo", uso: "cabeca", durabilidade: 2, elmo: true },
    escudo: { nome: "Escudo", uso: "umaMao", durabilidade: 2 },
    panela: { nome: "Panela", uso: "cabeca", durabilidade: 1 },
    peitoral: { nome: "Peitoral", uso: "tronco", durabilidade: 3 },
    penico: { nome: "Penico", uso: "cabeca", durabilidade: 1, sorte: true },
    tampaDePanela: { nome: "Tampa de Panela", uso: "umaMao", durabilidade: 1 },
    armaduraEspacial: { nome: "Armadura Espacial", uso: "corpo", durabilidade: 8, adaptacao: "wargoblin", pagina: 37 },
    capaceteDeOvo: { nome: "Capacete de Ovo", uso: "cabeca", durabilidade: 2, elmo: true, mods: { combate: -1 }, texto: "Não vê nada; Combate −1 para tudo.", adaptacao: "wargoblin", pagina: 37 },
  };
  Object.keys(PROTECOES).forEach(function (k) { if (!PROTECOES[k].pagina) PROTECOES[k].pagina = 13; });
  var ESPECIAIS_DE_PROTECAO = {
    arcano: { nome: "Arcano", texto: "Quem estiver vestindo rola 1 dado a mais nos testes para conjurar.", pagina: 13 },
    sorte: { nome: "Sorte", texto: "Na cabeça: destrua o item ao receber um ataque à distância para ignorar todo o dano.", pagina: 13 },
  };
  var USOS_DE_PROTECAO = { umaMao: "Uma mão", pescoco: "Pescoço", cabeca: "Cabeça", tronco: "Tronco", corpo: "Corpo", pes: "Pés", ombros: "Ombros" };

  /* ---- equipamento (p. 13) e o que as adaptações trazem ---- */
  var EQUIPAMENTOS = {
    aljava: { nome: "Aljava", texto: "Flechas para duplicar a munição de um arco ou besta.", acao: "aljava" },
    banquete: { nome: "Banquete", texto: "Alimenta um bando de goblins por 1d6 dias.", quantidade: "1d6", unidade: "dia(s) de comida" },
    barrilDeCerveja: { nome: "Barril de Cerveja", texto: "Embebeda uma festa de goblins inteira." },
    barrilDePolvora: { nome: "Barril de Pólvora", texto: "Aceso, explode: 4 ferimentos em todos em volta e 2 em todos a até 5 m. Ou completa a munição de até 3 armas de fogo.", acao: "barrilDePolvora", consumivel: true },
    cordaEGancho: { nome: "Corda e Gancho", texto: "+2 dados no teste de Habilidade para escalar.", acao: "escalar" },
    guardaChuva: { nome: "Guarda-chuva", texto: "Cobre até 4 goblins; −1 ferimento numa queda.", acao: "queda" },
    galinhaExplosiva: { nome: "Galinha Explosiva", texto: "Arremesse ou deixe andando: explode em dois turnos, 3 ferimentos em todos em volta.", acao: "galinhaExplosiva", consumivel: true },
    livroEstranho: { nome: "Livro Estranho", texto: "2 hits num teste de Noção para ler. 1 chance em 6 de ser um livro de magia (sorteie uma magia).", acao: "livroEstranho" },
    roupaChique: { nome: "Roupa Chique", texto: "Um goblin nojento continua nojento, mas com autoestima." },
    tenda: { nome: "Tenda", texto: "Para 5 goblins (10 empilhados)." },
    veneno: { nome: "Veneno", texto: "Na bebida de alguém: 1 ferimento por minuto em quem beber.", acao: "veneno", consumivel: true },
    medalhasDeGuerra: { nome: "Medalhas de Guerra", texto: "Equipamento inicial do Líder (p. 9), sem regra em nenhuma tabela.", semTabela: true, pagina: 9 },
    pokepedra: { nome: "PokéPedra", texto: "Arremessada, captura uma PokéPraga (teste de Habilidade).", adaptacao: "pokepragas", pagina: 34 },
    livroEspecial: { nome: "Livro Especial", texto: "Contém uma magia (qualquer do Bruxo ou Invocação). Queimá-lo elimina todo o Medo.", adaptacao: "cthulin", pagina: 33, acao: "livroEspecial" },
    enxada: { nome: "Enxada", texto: "Para arar e plantar uma vez ao dia.", adaptacao: "vale", pagina: 41, semTabela: true },
    picareta: { nome: "Picareta", texto: "Para tirar pedra das minas.", adaptacao: "vale", pagina: 40, semTabela: true },
    machado: { nome: "Machado", texto: "Para tirar madeira dos bosques.", adaptacao: "vale", pagina: 40, semTabela: true },
    varaDePesca: { nome: "Vara de Pesca", texto: "Para pescar em lagos e rios.", adaptacao: "vale", pagina: 41, semTabela: true },
  };
  Object.keys(EQUIPAMENTOS).forEach(function (k) { if (!EQUIPAMENTOS[k].pagina) EQUIPAMENTOS[k].pagina = 13; });

  /* ---- itens mágicos (p. 24–27) ----
     `base`: a arma ou proteção que o item é (com o bônus da tabela).
     `mods`: atributo enquanto equipado. `acao`: o que o motor faz. */
  var ITENS_MAGICOS = {
    espadaDestruidora: { nome: "Espada Destruidora de Mundos", tipo: "artefato", pagina: 26, base: "espada", texto: "Uma espada comum, mas se alguém falar “FIM” (ou espirrar), um vórtex absorve tudo e todos.", acao: "fim" },
    marteloDoPoder: { nome: "Martelo do Poder", tipo: "artefato", pagina: 26, base: "martelao", texto: "Um martelão brilhante: causa 1 ferimento automaticamente em alvos que não sejam humanos.", automaticoNaoHumano: 1 },
    coroaDoRei: { nome: "Coroa do Rei Feiticeiro", tipo: "artefato", pagina: 25, vestivel: "cabeca", mods: { nocao: 1 }, texto: "Vestida: +1 de Noção." },
    estatuetaSerpente: { nome: "Estatueta do Deus Serpente", tipo: "artefato", pagina: 26, texto: "Apontada para uma criatura, uma serpente imensa a devora e some.", acao: "estatueta" },
    ombreirasAnao: { nome: "Ombreiras do Lorde Anão", tipo: "artefato", pagina: 27, protecao: { uso: "ombros", durabilidade: 2, durabilidadePar: 5 }, texto: "Cada ombreira tem durabilidade 2; o par, durabilidade 5." },
    necronomicon: { nome: "Necronomicon", tipo: "artefato", pagina: 27, magia: "morte", texto: "Qualquer goblin pode conjurar Morte. Quem morrer com ele em mãos pode voltar como morto-vivo.", acao: "necronomicon" },
    pocao: { nome: "Poção", tipo: "especial", pagina: 27, texto: "Uma cor (1d6). Bebida, o efeito é o da cor.", acao: "pocao", consumivel: true },
    braceleteMagico: { nome: "Bracelete Mágico", tipo: "especial", pagina: 25, vestivel: "pulso", mods: { habilidade: 1 }, texto: "Vestido: Habilidade +1 (temporariamente)." },
    tochaMagica: { nome: "Tocha Mágica", tipo: "especial", pagina: 27, texto: "Acende com água; o fogo só apaga com a palavra “Xaluf”." },
    espadaBrilhante: { nome: "Espada Brilhante", tipo: "especial", pagina: 26, base: "espada", texto: "A lâmina só brilha quando há goblins por perto." },
    adagaMatadora: { nome: "Adaga Matadora", tipo: "especial", pagina: 25, base: "adaga", contraGoblin: 2, texto: "+2 dados se o alvo for um goblin." },
    anelMagico: { nome: "Anel Mágico", tipo: "especial", pagina: 25, vestivel: "dedo", texto: "Ao colocar, role na tabela do anel.", acao: "anel" },
    latinhas: { nome: "Latinhas sem Fio", tipo: "estranho", pagina: 26, texto: "O que se fala numa sai na outra, a qualquer distância." },
    piranha: { nome: "Piranha Empalhada", tipo: "estranho", pagina: 27, texto: "Quem gritar “Ah! Uma piranha!” é mordido e ela fica presa até ganhar vida de novo." },
    escudoFalante: { nome: "Escudo Falante", tipo: "estranho", pagina: 25, base: "escudo", texto: "Um escudo que, cumprimentado, fala sem parar." },
    cordaSerpente: { nome: "Corda-Serpente", tipo: "estranho", pagina: 25, texto: "“Sobe”: ergue-se até o teto. “Prende”: a ponta se prende onde der." },
    cintoPraCima: { nome: "Cinto que Cai pra Cima", tipo: "estranho", pagina: 25, vestivel: "cintura", texto: "Quem usar tem a gravidade invertida." },
    relogioTicPloc: { nome: "Relógio Tic-Ploc", tipo: "estranho", pagina: 27, texto: "Quem o deixar cair some da existência; o nome fica escrito atrás do relógio.", acao: "relogio" },
    tortaDeliciosa: { nome: "Torta Deliciosa", tipo: "porcaria", pagina: 27, texto: "Ilusória: quem tentar comer faz um teste de Noção para perceber.", acao: "torta" },
    macaCheirosa: { nome: "Maçã Cheirosa", tipo: "porcaria", pagina: 26, texto: "Comida, remove todos os ferimentos.", acao: "macaCheirosa", consumivel: true },
    elmoCadeira: { nome: "Elmo-Cadeira", tipo: "porcaria", pagina: 25, protecao: { uso: "cabeca", durabilidade: 1, elmo: true }, texto: "+1 de Proteção; pode se esquivar com outro goblin na cabeça; ejeta quem estiver sentado num salto de até 10 m." },
    dentesPosticos: { nome: "Dentes Postiços", tipo: "porcaria", pagina: 25, texto: "Parece bonito para outros goblins. Só goblins." },
    sandaliaVayanna: { nome: "Sandália da Vayanna", tipo: "porcaria", pagina: 27, protecao: { uso: "pes", durabilidade: 2, calcado: true }, texto: "Durabilidade 2." },
    peteca: { nome: "Peteca", tipo: "porcaria", pagina: 27, texto: "Brincando com amigos, role 1 dado no fim do dia: com 6, todos que brincaram têm Habilidade +1 no dia seguinte.", acao: "peteca" },
    /* Descritos na lista (p. 25–26), fora das tabelas de sorteio. */
    carteiraFalsa: { nome: "Carteira de Vacinação Falsa", tipo: "foraDaTabela", pagina: 25, texto: "O teu chefe agora pode entrar no reino do norte." },
    espadaJusticeira: { nome: "Espada da Justiçeira", tipo: "foraDaTabela", pagina: 26, base: "espada", texto: "Funciona como binóculo; quem a erguer e gritar “Hooooo” é morto por um raio.", acao: "justiceira" },
    joiasAuditas: { nome: "Joias Auditas", tipo: "foraDaTabela", pagina: 26, texto: "Para subornos e negociações. Basta não declarar." },
    macaMalcheirosa: { nome: "Maçã Malcheirosa", tipo: "foraDaTabela", pagina: 26, texto: "Arremessada, explode: 1 ferimento em todos em volta.", acao: "macaMalcheirosa", consumivel: true },
  };
  var TIPO_MAGICO_D6 = ["artefato", "especial", "especial", "estranho", "estranho", "porcaria"];
  var NOMES_TIPO_MAGICO = { artefato: "Artefato", especial: "Especial", estranho: "Estranho", porcaria: "Porcaria", foraDaTabela: "Fora das tabelas" };
  var MAGICOS_D6 = {
    artefato: ["espadaDestruidora", "marteloDoPoder", "coroaDoRei", "estatuetaSerpente", "ombreirasAnao", "necronomicon"],
    especial: ["pocao", "braceleteMagico", "tochaMagica", "espadaBrilhante", "adagaMatadora", "anelMagico"],
    estranho: ["latinhas", "piranha", "escudoFalante", "cordaSerpente", "cintoPraCima", "relogioTicPloc"],
    porcaria: ["tortaDeliciosa", "macaCheirosa", "elmoCadeira", "dentesPosticos", "sandaliaVayanna", "peteca"],
  };
  var ANEL_D6 = [
    { texto: "O dedo fica roxo: se não tirar o anel em 2 horas, o dedo cai.", efeito: { chave: "dedoRoxo", nome: "Dedo roxo (tire o anel em 2 horas)", ate: "manual" } },
    { texto: "Você vira uma galinha.", efeito: { chave: "galinha", nome: "Virou galinha", ate: "manual" } },
    { texto: "A pele fica em chamas (pode queimar coisas) e você fica imune a fogo.", efeito: { chave: "peleEmChamas", nome: "Pele em chamas: imune a fogo", ate: "manual", imuneFogo: true } },
    { texto: "Você fala com os animais.", efeito: { chave: "falaComAnimais", nome: "Fala com os animais", ate: "manual" } },
    { texto: "Fica invisível, mas sempre que tirar fica obcecado pelo anel.", efeito: { chave: "invisivel", nome: "Invisível (obcecado ao tirar)", ate: "manual" } },
    { texto: "Mais bronzeado e mais forte: Combate +1 temporariamente.", efeito: { chave: "bronzeado", nome: "Bronzeado: Combate +1", ate: "manual", mods: { combate: 1 } } },
  ];
  var POCAO_D6 = [
    { cor: "Amarelo", texto: "Explode!", explode: true },
    { cor: "Laranja", texto: "Penas surgem no seu corpo.", efeito: { chave: "penas", nome: "Penas pelo corpo", ate: "manual" } },
    { cor: "Vermelho", texto: "Sua língua fica colorida.", efeito: { chave: "linguaColorida", nome: "Língua colorida", ate: "manual" } },
    { cor: "Roxo", texto: "+1 dado no próximo teste.", efeito: { chave: "pocaoRoxa", nome: "+1 dado no próximo teste", ate: "proximoTeste", dados: 1 } },
    { cor: "Azul", texto: "Remove todos os ferimentos.", curar: "todos" },
    { cor: "Verde", texto: "Aumenta um atributo em +1.", atributo: 1 },
  ];

  /* ---- regras de consulta (fonte e página ao lado da ação) ---- */
  var REGRAS = {
    teste: { nome: "Testes", pagina: 14, tipo: "basica", texto: "Role dados iguais ao atributo; cada 4, 5 ou 6 é 1 hit. 0 hits: Falhou! · 1: Conseguiu, mas deu ruim… · 2: Conseguiu! · 3+: Conseguiu e foi épico!" },
    dificuldade: { nome: "Dificuldade", pagina: 14, tipo: "basica", texto: "Teste fácil: +1 dado. Teste difícil: −1 dado." },
    explosaoDeDado: { nome: "Explosão de Dado", pagina: 14, tipo: "basica", texto: "Cada 6 é 1 hit e deixa rolar mais um dado, que também explode no 6 — infinitamente." },
    explosaoDeGoblin: { nome: "Explosão de Goblin", pagina: 14, tipo: "basica", texto: "Se todos os dados caírem em 1, o goblin explode em milhões de pedacinhos. Faça um novo goblin." },
    combate: { nome: "Combate", pagina: 15, tipo: "basica", texto: "Em turnos, uma ação por turno. Goblins que surpreendem inimigos distraídos agem primeiro (escolhem a ordem entre si); se esbarram nos inimigos, os inimigos agem primeiro." },
    ataque: { nome: "Atacar", pagina: 15, tipo: "basica", texto: "Teste de Combate: cada hit é 1 ferimento no alvo. Armas somam dados. Explosões valem." },
    esquiva: { nome: "Esquivar", pagina: 15, tipo: "basica", texto: "Ao ser atacado: teste de Combate; cada hit reduz um hit do atacante. Quem se esquiva não ataca no próximo turno." },
    bloqueio: { nome: "Bloquear", pagina: 15, tipo: "basica", texto: "Com uma proteção vestida: cada ferimento tomado reduz 1 de Durabilidade dela. Com Durabilidade zero, não bloqueia." },
    niveis: { nome: "Níveis", pagina: 5, tipo: "basica", texto: "Começa no nível 1. Ao derrotar um oponente, role 1 dado: com 6, ganha um nível e uma técnica. No nível 4, explode de alegria." },
    ferimentos: { nome: "Ferimentos e Morte", pagina: 5, tipo: "basica", texto: "Morre com MAIS ferimentos que a Vitalidade. Cada noite de descanso remove 1 ferimento. Morreu? Um parente chega em minutos: novo goblin de nível 1." },
    magia: { nome: "Regras de Magia", pagina: 10, tipo: "basica", texto: "Só o Bruxo conjura (3 magias). Teste de Noção e consulte a tabela da magia: 0 hits é ruim, 2 é o esperado, 3+ pode exagerar." },
    equipamento: { nome: "Equipamento", pagina: 12, tipo: "basica", texto: "Armas somam dados ao ataque; Munição limita ataques; Recarga gasta um turno depois de atacar. Proteções têm Durabilidade." },
    vozGoblin: { nome: "Voz Goblin", pagina: 16, tipo: "opcional", texto: "Quem imita a voz de goblin o tempo todo nunca explode quando os dados caem 1. Falou uma palavra sem a voz, perde a vantagem até o fim do jogo." },
    deuRuim: { nome: "Mas deu ruim…", pagina: 16, tipo: "opcional", texto: "1 hit num teste de Habilidade e sem ideia? Role 1 dado na tabela." },
    niveisEpicos: { nome: "Níveis Épicos", pagina: 16, tipo: "opcional", texto: "No nível 4, se os outros jogadores acreditarem, escolha outra ocupação e ganhe níveis nela." },
    semMestre: { nome: "Jogando sem Mestre", pagina: 16, tipo: "opcional", texto: "Use as tabelas do livro: aventura aleatória, inspiração e a resposta do mestre (sim ou não)." },
    manobras: { nome: "Manobras", pagina: 17, tipo: "basica", texto: "Catapultando Goblins, Pendurar no Inimigo, Ataque com Duas Armas, Cacunda!, Combate Sincronizado, Derrubar Inimigo, Ciranda Mágica e Tralha do Poder." },
    negociacao: { nome: "Negociação", pagina: 18, tipo: "basica", texto: "Se o viajante tem mais Combate que o goblin mais forte, ataca primeiro. Senão: negociador e vítima testam Noção; bando com mais hits leva tudo, empate continua, vítima com mais hits leva tudo dos goblins." },
    itensMagicos: { nome: "Itens Mágicos", pagina: 24, tipo: "basica", texto: "Role o tipo (Artefato, Especial, Estranho, Porcaria) e depois o item." },
    masmorra: { nome: "Gerador de Masmorra", pagina: 28, tipo: "basica", texto: "Tipo (1d6); cada segmento: 1d6 + segmentos entre ele e a entrada; conteúdo de corredores e salas." },
    cthulin: { nome: "Chamado de Cthulin", pagina: 32, tipo: "adaptacao", texto: "Ocupações renomeadas, Chapéu ou Livro Especial, Investigação, Eventos Sobrenaturais, Medo e Horrores." },
    pokepragas: { nome: "PokéPragas", pagina: 34, tipo: "adaptacao", texto: "Treinador, PokéPedras, PokéPragas por raridade e elemento, captura, PokéBatalhas e evolução." },
    wargoblin: { nome: "WarGoblin 40k", pagina: 36, tipo: "adaptacao", texto: "Turminhas (as ocupações), dois equipamentos à escolha, armas e proteções do futuro, alienígenas." },
    goblinHigh: { nome: "Goblin High", pagina: 38, tipo: "adaptacao", texto: "Estudantes com Reação, conversar, agradar, Amigos, Romance, Inimigos e Brigas." },
    vale: { nome: "Vale dos Goblins", pagina: 40, tipo: "adaptacao", texto: "Fazendeiro, fazenda, coleta, horta, pescaria, construções, cozinha e vilarejo." },
  };

  var DEU_RUIM_D6 = ["Algo pegou fogo!", "Estragou algo importante.", "Da próxima vez, vai ser pior.", "Ficou preso em algo.", "Outro goblin vai sofrer por isso.", "Chamou atenção de alguém."];

  var MANOBRAS = {
    catapulta: { nome: "Catapultando Goblins", pagina: 17, texto: "Quem pula testa Habilidade para acertar o alvo; falhou, espatifa-se: 1d6 ferimentos." },
    pendurar: { nome: "Pendurar no Inimigo", pagina: 17, texto: "Teste de Habilidade: com 1 hit fica em cima da vítima e, nos próximos turnos, +1 dado nos ataques contra ela. A vítima não ataca o pendurado, mas pode tirá-lo vencendo um teste de Habilidade." },
    duasArmas: { nome: "Ataque com Duas Armas", pagina: 17, texto: "Uma arma em cada mão: cada ataque contra um alvo diferente, com 1 dado a menos em ambos." },
    cacunda: { nome: "Cacunda!", pagina: 17, texto: "Dois goblins como um só: atacam o mesmo alvo, não se esquivam; o de cima rola +1 dado; o ferimento sofrido pode ser dividido." },
    sincronizado: { nome: "Combate Sincronizado", pagina: 17, texto: "Três ou mais goblins atacando o mesmo alvo no mesmo turno: o alvo rola 1 dado a menos no próximo ataque." },
    derrubar: { nome: "Derrubar Inimigo", pagina: 17, texto: "Quem empurra testa Habilidade: 1 hit, o alvo testa Habilidade para ficar de pé; 2+ hits, cai e perde o próximo turno." },
    ciranda: { nome: "Ciranda Mágica", pagina: 17, texto: "Pelo menos 2 amigos girando e cantando: cada amigo na roda dá +1 dado à conjuração." },
    tralha: { nome: "Tralha do Poder", pagina: 17, texto: "Um objeto que pelo menos dez goblins acham bonito: ganha um goblin seguidor, que vai embora se a tralha se perder ou se ele a roubar." },
  };

  /* ---- jogando sem mestre (p. 16) e aventuras (p. 18–20) ---- */
  var AVENTURA_D6 = ["saquearViajante", "saquearViajante", "sequestrar", "saquearCasa", "protegerMasmorra", "invadirVizinhos"];
  var AVENTURAS = {
    saquearViajante: { nome: "Saquear Viajantes", pagina: 18 },
    sequestrar: { nome: "Sequestrar Pessoa Importante", pagina: 18 },
    saquearCasa: { nome: "Saquear Casa Humana", pagina: 19 },
    protegerMasmorra: { nome: "Proteger Masmorra", pagina: 19 },
    invadirVizinhos: { nome: "Invadir Vizinhos", pagina: 19 },
  };
  var INSPIRACAO_D6 = [["Explosões", "Medo", "Destruir"], ["Madeira", "Risada", "Construir"], ["Vento", "Dança", "Aparecer"], ["Terra", "Força", "Atacar"], ["Água", "Tranquilidade", "Mudar"], ["Fogo", "Amor", "Resistir"]];
  var RESPOSTA_D6 = ["“Teu goblin explode! Faz outro aí.”", "“Definitivamente não!”", "“Não.”", "“O que tu acha?”", "“Sim.”", "“Definitivamente sim!”"];

  /* Entradas com grupo: [{ quantidade (número ou expressão), inimigo }]. */
  function g() { var a = []; for (var i = 0; i < arguments.length; i += 2) a.push({ quantidade: arguments[i], inimigo: arguments[i + 1] }); return a; }
  var VIAJANTE_2D6 = {
    2: { texto: "Um Dragão", grupo: g(1, "dragao") },
    3: { texto: "Um grupo de aventureiros", grupo: g("1d6", "aventureiro"), nota: "O livro não diz quantos: o R.A.M.A. sugere 1d6, editável." },
    4: { texto: "Uma carruagem nobre", grupo: g(1, "nobre") },
    5: { texto: "Um Ogro", grupo: g(1, "ogro") },
    6: { texto: "Um mercador", grupo: g(1, "campones"), nota: "O livro não traz ficha de mercador: usa a do Camponês, editável." },
    7: { texto: "Uma carroça velha", grupo: [] },
    8: { texto: "Dois Guardas", grupo: g(2, "guarda") },
    9: { texto: "Um Camponês qualquer", grupo: g(1, "campones") },
    10: { texto: "Um bando de 1d6 goblins", grupo: g("1d6", "goblinComum") },
    11: { texto: "O Bando Rival", bandoRival: true },
    12: { texto: "Um goblin aleatório explode!", goblinExplode: true },
  };
  var VITIMA_D6 = ["Uma princesa", "Um aventureiro", "Um camponês", "Uma criança", "Um barril de cerveja", "Uma galinha"];
  var RECOMPENSA_D6 = ["Um penico muito bonito", "Um baú cheio de moedas brilhantes", "Um título de nobreza", "A mão da princesa (mas pode ser o pé)", "Um covil melhor localizado", { texto: "Um item mágico", itemMagico: true }];
  var LOCAL_D6 = ["celeiro", "casaComum", "casaNobre", "taverna", "castelo", "torreDoMago"];
  var PROTEGER_2D6 = {
    2: { texto: "Um Dragão", grupo: g(1, "dragao") },
    3: { texto: "O Grande Mago e 1d6 Aventureiros", grupo: g(1, "grandeMago", "1d6", "aventureiro") },
    4: { texto: "O Grande Mago e 2 Guardas", grupo: g(1, "grandeMago", 2, "guarda") },
    5: { texto: "1d6 Aventureiros", grupo: g("1d6", "aventureiro") },
    6: { texto: "2d6 Guardas", grupo: g("2d6", "guarda") },
    7: { texto: "1d6 Guardas e 1d6 Cães", grupo: g("1d6", "guarda", "1d6", "cao") },
    8: { texto: "1d6 Camponeses furiosos", grupo: g("1d6", "campones") },
    9: { texto: "O Bando Rival", bandoRival: true },
    10: { texto: "Bando de 1d6 goblins", grupo: g("1d6", "goblinComum") },
    11: { texto: "1d6 Goblins e 1 Troll", grupo: g("1d6", "goblinComum", 1, "troll") },
    12: { texto: "Algo tão assustador que é indescritível", grupo: g(1, "besta") },
  };
  var VIZINHOS_2D6 = {
    2: { texto: "Um Dragão e 2d6 Goblins", grupo: g(1, "dragao", "2d6", "goblinComum") },
    3: { texto: "1 Golem de Pedra e 1d6 Esqueletos", grupo: g(1, "golemPedra", "1d6", "esqueletoHumano") },
    4: { texto: "1d6 Aranhas Gigantes", grupo: g("1d6", "aranhaGigante") },
    5: { texto: "1 Vampiro e 2d6 Zumbis", grupo: g(1, "vampiro", "2d6", "zumbiHumano") },
    6: { texto: "Bando de 2d6 goblins", grupo: g("2d6", "goblinComum") },
    7: { texto: "O Bando Rival", bandoRival: true },
    8: { texto: "1d6 Goblins Abominação", grupo: g("1d6", "goblinAbominacao") },
    9: { texto: "1d6 Goblins e 1 Troll", grupo: g("1d6", "goblinComum", 1, "troll") },
    10: { texto: "1d6 Ogros e 1d6 Goblins", grupo: g("1d6", "ogro", "1d6", "goblinComum") },
    11: { texto: "Cubo Gosmento", grupo: g(1, "cuboGosmento") },
    12: { texto: "Algo tão assustador que é indescritível", grupo: g(1, "besta") },
  };

  /* Locais (p. 20). `conteudo`: o que se sorteia ao entrar; `chance`:
     "1 em 6" (sai no 6 de 1d6) ou 50%. Os testes viram notas. */
  var LOCAIS = {
    celeiro: { nome: "Celeiro", pagina: 20, texto: "Pilhas de palha, galinhas (uma é galo, os goblins não sabem) e animais grandes.", conteudo: [{ rotulo: "Galinhas", expressao: "1d6+1", inimigo: "galinha" }, { rotulo: "Animais grandes (cavalo ou vaca)", expressao: "1d6", inimigo: "vaca" }, { rotulo: "Um humano no momento", chance: "50%", inimigo: "campones" }] },
    casaComum: { nome: "Casa Comum", pagina: 20, texto: "Só depois de entrar se sabe quantos estão lá; metade (arredondada para cima) são crianças; talvez um penico bonito.", conteudo: [{ rotulo: "Pessoas (camponeses)", expressao: "1d6-2", inimigo: "campones", metadeCriancas: true }, { rotulo: "Um deles é um guarda", chance: "1em6", inimigo: "guarda", substitui: true }] },
    casaNobre: { nome: "Casa Nobre", pagina: 20, texto: "Difícil acesso (escalar paredes). Um criado grita chamando os guardas; no mínimo 2 de vigia. Muitas coisas brilhantes.", conteudo: [{ rotulo: "Cães ferozes", expressao: "1d6-3", inimigo: "cao" }, { rotulo: "Criado", quantidade: 1, inimigo: "campones" }, { rotulo: "Guardas (mínimo 2 de vigia)", expressao: "1d6+1", inimigo: "guarda" }, { rotulo: "O nobre está", chance: "1em6", inimigo: "nobre" }, { rotulo: "O filho ou filha do nobre está", chance: "1em6", inimigo: "nobre" }, { rotulo: "Itens mágicos", expressao: "1d6", itemMagico: true, nota: "“possivelmente”: a mesa confirma" }] },
    templo: { nome: "Templo ou Santuário", pagina: 20, foraDaTabela: true, texto: "Não é lugar para goblins. Pouca coisa lá dentro.", conteudo: [{ rotulo: "Camponeses", expressao: "1d6", inimigo: "campones" }, { rotulo: "Sacerdotes (1 ou 2)", expressao: "1d2", inimigo: "campones", nota: "Sem ficha de sacerdote no livro: Camponês, editável." }, { rotulo: "Item mágico perto do altar", chance: "1em6", itemMagico: true }] },
    taverna: { nome: "Taverna", pagina: 20, texto: "Perigosa para goblins. Sempre um taverneiro; vários barris de cerveja.", conteudo: [{ rotulo: "Taverneiro", quantidade: 1, inimigo: "taverneiro" }, { rotulo: "Camponeses", expressao: "1d6", inimigo: "campones" }, { rotulo: "Aventureiros", expressao: "1d6-2", inimigo: "aventureiro" }, { rotulo: "Guardas", expressao: "1d6-2", inimigo: "guarda" }] },
    castelo: { nome: "Castelo", pagina: 20, texto: "Muralhas altas: teste de Habilidade difícil (−1 dado). Toda sala secreta tem itens mágicos.", testes: [{ atributo: "habilidade", dificuldade: "dificil", rotulo: "Escalar as muralhas" }], conteudo: [{ rotulo: "Guardas nos arredores", expressao: "3d6", inimigo: "guarda" }, { rotulo: "Criados", expressao: "1d6+5", inimigo: "campones" }, { rotulo: "Nobres da família real", expressao: "1d6", inimigo: "nobre" }, { rotulo: "O Rei/Lorde está (com mais 1d6 guardas)", chance: "1em6", inimigo: "nobre", extra: { expressao: "1d6", inimigo: "guarda" } }, { rotulo: "Itens mágicos na sala secreta", expressao: "2d6", itemMagico: true }] },
    torreDoMago: { nome: "Torre do Grande Mago", pagina: 20, texto: "Alta (Habilidade difícil, −1 dado) e com armadilhas explosivas (teste de Habilidade). 1º piso: biblioteca e passagem secreta (Noção). 2º piso: um Golem e um item mágico. 3º piso: o mago, talvez.", testes: [{ atributo: "habilidade", dificuldade: "dificil", rotulo: "Escalar a torre" }, { atributo: "habilidade", rotulo: "Armadilhas explosivas" }, { atributo: "nocao", rotulo: "Achar a passagem secreta" }], conteudo: [{ rotulo: "Passagem secreta: itens mágicos", expressao: "1d6-2", itemMagico: true }, { rotulo: "Golem do 2º piso (Madeira ou Pedra)", golem: true }, { rotulo: "Item mágico na mesa do 2º piso", quantidade: 1, itemMagico: true }, { rotulo: "O mago NÃO está no 3º piso", chance: "1em6", ausencia: "grandeMago" }, { rotulo: "Itens mágicos espalhados", expressao: "1d6", itemMagico: true }] },
  };

  /* ---- inimigos (p. 21–23; Horrores p. 33; alienígenas p. 37) ---- */
  function ini(nome, c, bc, n, h, v, p, extra) {
    return Object.assign({ nome: nome, combate: c, bonusCombate: bc, nocao: n, habilidade: h, vitalidade: v, protecao: p }, extra || {});
  }
  var INIMIGOS = {
    campones: ini("Camponês", 3, 1, 3, 3, 3, 0, { equip: "Clava", humano: true, especie: "humano", pagina: 21 }),
    guarda: ini("Guarda", 4, 3, 3, 4, 3, 3, { equip: "Lança e Peitoral", humano: true, especie: "humano", pagina: 21 }),
    taverneiro: ini("Taverneiro", 3, 1, 4, 3, 5, 0, { equip: "Clava", humano: true, especie: "humano", pagina: 21 }),
    nobre: ini("Nobre (Rei, Princesa etc.)", 2, 3, 3, 2, 2, 4, { equip: "Espada Especial e Peitoral Reforçado", humano: true, especie: "humano", pagina: 21, nota: "Espada Especial e Peitoral Reforçado não estão nas tabelas: valem os números entre parênteses." }),
    crianca: ini("Criança", 2, 0, 2, 2, 2, 0, { equip: "Espada de Madeira", humano: true, especie: "humano", pagina: 21 }),
    aventureiro: ini("Aventureiro", 5, 2, 4, 4, 4, 7, { equip: "Espada, Escudo, Peitoral e Elmo", humano: true, especie: "humano", pagina: 21 }),
    grandeMago: ini("Grande Mago", 2, 0, 5, 3, 4, 0, { humano: true, especie: "humano", pagina: 21, habilidades: [{ nome: "Magia", texto: "Todas as magias; pode controlar o resultado removendo hits depois de rolar.", magia: true }] }),
    cao: ini("Cão", 4, 0, 2, 3, 2, 0, { especie: "cão", pagina: 21 }),
    lobo: ini("Lobo", 5, 0, 3, 4, 4, 0, { especie: "lobo", pagina: 21, habilidades: [{ nome: "Uivo", texto: "Em vez de atacar, uiva: em dois turnos aparece outro lobo.", uivo: true }] }),
    galinha: ini("Galinha", 1, 0, 1, 2, 1, 0, { especie: "galinha", pagina: 21 }),
    bode: ini("Bode", 5, 0, 3, 3, 2, 0, { especie: "bode", pagina: 21, habilidades: [{ nome: "Escalador", texto: "Pode escalar qualquer coisa." }] }),
    vaca: ini("Vaca", 3, 0, 2, 1, 8, 0, { especie: "vaca", pagina: 21 }),
    crocodilo: ini("Crocodilo", 5, 0, 3, 3, 9, 0, { especie: "crocodilo", pagina: 21, habilidades: [{ nome: "Giro Mortal", texto: "Se acertar, pode girar o alvo: ele fica preso e recebe 1 ferimento por turno.", giroMortal: true }] }),
    golemCoco: ini("Golem de Cocô", 4, 0, null, 2, 6, 0, { especie: "golem", pagina: 22, asterisco: "Vitalidade", habilidades: [{ nome: "Gosmento", texto: "Quem atacar com arma corporal deve vencer um teste ou fica com a arma presa.", gosmento: true }] }),
    golemMadeira: ini("Golem de Madeira", 5, 0, null, 3, 8, 0, { especie: "golem", pagina: 22, vulneravelFogo: true, habilidades: [{ nome: "Vulnerabilidade", texto: "Recebe o dobro de ferimentos por fogo." }] }),
    golemMetal: ini("Golem de Metal", 6, 0, null, 1, 12, 0, { especie: "golem", pagina: 22 }),
    golemPedra: ini("Golem de Pedra", 6, 0, null, 2, 15, 0, { especie: "golem", pagina: 22 }),
    esqueletoHumano: ini("Esqueleto (Humano)", 2, 1, null, 3, 1, 1, { equip: "Espada Enferrujada e Escudo", especie: "esqueleto", pagina: 22, nota: "Espada Enferrujada não está na tabela de armas; e o Escudo da tabela tem durabilidade 2, não 1: valem os números entre parênteses." }),
    esqueletoGoblin: ini("Esqueleto (Goblin)", 1, 1, null, 2, 1, 0, { equip: "Adaga", especie: "esqueleto", goblin: true, pagina: 22 }),
    zumbiHumano: ini("Zumbi (Humano)", 2, 0, null, 1, 2, 0, { especie: "zumbi", pagina: 22, asterisco: "Combate", habilidades: [{ nome: "Infecção", texto: "Se causar ferimento, o alvo vira zumbi depois de morrer.", infeccao: true }] }),
    zumbiGoblin: ini("Zumbi (Goblin)", 1, 0, null, 0, 1, 0, { especie: "zumbi", goblin: true, pagina: 22, asterisco: "Combate", habilidades: [{ nome: "Infecção", texto: "Se causar ferimento, o alvo vira zumbi depois de morrer.", infeccao: true }] }),
    fantasma: ini("Fantasma", 3, 1, 2, 4, 3, 0, { equip: "Correntes", especie: "fantasma", pagina: 22, etereo: true, habilidades: [{ nome: "Etéreo", texto: "Os ataques ignoram a proteção do goblin alvo." }] }),
    vampiro: ini("Vampiro", 5, 3, 5, 5, 7, 3, { equip: "Espadão e Peitoral", especie: "vampiro", pagina: 22, habilidades: [{ nome: "Mordida", texto: "Remove todos os próprios ferimentos ao causar dano.", mordida: true }] }),
    lich: ini("Lich", 4, 1, 6, 2, 12, 0, { especie: "lich", pagina: 22, habilidades: [{ nome: "Magia", texto: "Todas as magias; pode controlar o resultado removendo hits depois de rolar.", magia: true }] }),
    cuboGosmento: ini("Cubo Gosmento", 2, 0, 1, 2, 20, 0, { especie: "cubo", pagina: 23, habilidades: [{ nome: "Gosmento", texto: "Quem atacar com arma corporal deve vencer um teste ou fica com a arma presa.", gosmento: true }] }),
    aranhaGigante: ini("Aranha Gigante", 5, 0, 3, 4, 9, 0, { especie: "aranha", pagina: 23, habilidades: [{ nome: "Teia", texto: "Ataque à distância: sem ferimento, mas paralisa o alvo por 1d6 turnos.", teia: true }] }),
    ogro: ini("Ogro", 5, 3, 2, 2, 12, 0, { equip: "Clava Gigante", especie: "ogro", pagina: 23 }),
    troll: ini("Troll", 6, 0, 2, 3, 20, 0, { especie: "troll", pagina: 23, habilidades: [{ nome: "Regeneração", texto: "No turno do Troll, remova 1d6−1 ferimentos.", regeneracao: "1d6-1" }] }),
    berroldinho: ini("Berroldinho", 5, 0, 6, 4, 30, 0, { especie: "berroldinho", pagina: 23, habilidades: [{ nome: "Magia", texto: "Todas as magias; pode controlar o resultado removendo hits depois de rolar.", magia: true }] }),
    besta: { nome: "Besta Indescritível", indescritivel: true, combate: null, bonusCombate: null, nocao: null, habilidade: null, vitalidade: null, protecao: null, pagina: 23, habilidades: [{ nome: "Ataque Especial", texto: "Alguma coisa acontece..." }] },
    dragao: ini("Dragão", 9, 0, 9, 9, 50, 0, { especie: "dragão", pagina: 23, imuneFogo: true, habilidades: [{ nome: "Baforada", texto: "Todos são alvo. Causa dano por fogo.", baforada: true }, { nome: "Imunidade", texto: "Não recebe ferimentos de fogo." }] }),
    goblinComum: ini("Goblin Comum", 2, 1, 2, 2, 2, 0, { equip: "Adaga", especie: "goblin", goblin: true, pagina: 23 }),
    aracnogoblin: ini("Aracnogoblin", 2, 0, 2, 4, 3, 0, { especie: "goblin", goblin: true, pagina: 23, habilidades: [{ nome: "Teia", texto: "Ataque à distância: sem ferimento, mas paralisa o alvo por 1d6 turnos.", teia: true }] }),
    goblinAbominacao: ini("Goblin Abominação", 5, 0, 1, 3, 5, 0, { especie: "goblin", goblin: true, pagina: 23 }),
    /* Chamado de Cthulin (p. 33) */
    abissal: ini("Abissal (Deep one)", 4, 0, 2, 2, 5, 0, { especie: "horror", adaptacao: "cthulin", pagina: 33, habilidadeAlternativa: 4, habilidades: [{ nome: "Aquático", texto: "Vive embaixo d'água; nada muito rápido (Habilidade 4 na água)." }] }),
    byakhee: ini("Byakhee", 4, 0, 1, 4, 7, 0, { especie: "horror", adaptacao: "cthulin", pagina: 33, habilidades: [{ nome: "Voador", texto: "Pode voar." }] }),
    caoTindalos: ini("Cão de Tindalos", 5, 0, 3, 2, 6, 0, { especie: "horror", adaptacao: "cthulin", pagina: 33, habilidades: [{ nome: "Dimensional", texto: "Viaja pelas dimensões; pode se teleportar." }] }),
    criaShub: ini("Cria de Shub-Niggurath", 5, 0, 3, 4, 9, 0, { especie: "horror", adaptacao: "cthulin", pagina: 33, terror: "1d6", invocacao: -1, habilidades: [{ nome: "Terror", texto: "Quem a vê recebe 1d6 Medo." }] }),
    shogoth: ini("Shogoth", 3, 0, 5, 2, 15, 0, { especie: "horror", adaptacao: "cthulin", pagina: 33, terror: "1d6", invocacao: -1, habilidades: [{ nome: "Regeneração", texto: "Remove 3 ferimentos todo turno.", regeneracao: "3" }, { nome: "Terror", texto: "Quem o vê recebe 1d6 Medo." }] }),
    cthulhu: ini("Cthulhu", 50, 0, 50, 50, 1000, 0, { especie: "horror", adaptacao: "cthulin", pagina: 33, terror: "2d6", invocacao: -2, habilidades: [{ nome: "Terror", texto: "Quem o vê recebe 2d6 Medo." }] }),
    azathoth: ini("Azathoth", 100, 0, 100, 100, null, 0, { especie: "horror", adaptacao: "cthulin", pagina: 33, invocacao: -2, semVitalidade: true, habilidades: [{ nome: "Fim", texto: "O mundo acaba!" }] }),
    /* WarGoblin 40k (p. 37) */
    insetaoRoubaGenes: ini("Insetão Rouba-Genes", 4, 0, 1, 5, 4, 0, { especie: "insetão", adaptacao: "wargoblin", pagina: 37, habilidades: [{ nome: "Escalador", texto: "Escala qualquer superfície." }] }),
    insetaoArmado: ini("Insetão Armado", 4, 2, 2, 5, 5, 0, { equip: "Pistola Bólter", especie: "insetão", adaptacao: "wargoblin", pagina: 37 }),
    roboExterminador: ini("Robô Exterminador", 4, 3, 4, 4, 12, 0, { equip: "Metranca de Plasma", especie: "robô", adaptacao: "wargoblin", pagina: 37, habilidades: [{ nome: "Restauração", texto: "Destruído, reconstrói-se em 1d6 horas." }] }),
    roboQuatroBracos: ini("Robô de Quatro Braços", 4, 2, 4, 4, 15, 0, { equip: "4 Espadas", especie: "robô", adaptacao: "wargoblin", pagina: 37, habilidades: [{ nome: "Multiataque", texto: "Até 4 ataques corporais.", multiataque: 4 }, { nome: "Restauração", texto: "Destruído, reconstrói-se em 1d6 horas." }] }),
    zelfoSoldado: ini("Zelfo Soldado", 4, 2, 3, 5, 2, 10, { equip: "Pistola Bólter, Armadura Espacial e Capacete de Ovo", especie: "zelfo", adaptacao: "wargoblin", pagina: 37 }),
    zelfoGotico: ini("Zelfo Gótico", 4, 1, 3, 6, 3, 2, { equip: "Chicote e Capacete de Ovo", especie: "zelfo", adaptacao: "wargoblin", pagina: 37, nota: "Chicote não está em nenhuma tabela: vale o número entre parênteses." }),
  };

  var CARACTERISTICA_RIVAL_2D6 = {
    2: "Exatamente igual!", 3: "Tem uma marca de nascença numa nádega.", 4: "Gosta de usar chapéu (se o goblin do jogador gosta, este não gosta).",
    5: "Tem característica invertida.", 6: "Tem um cavanhaque.", 7: "Cores das roupas invertidas.", 8: "Outro gênero.",
    9: "Característica ainda mais acentuada.", 10: "Mais bonito (se é que um goblin pode ser bonito).", 11: "É canhoto (se o goblin é canhoto, este é destro).", 12: "Gosta de comidas diferentes.",
  };

  /* ---- gerador de masmorra (p. 28–29) ---- */
  var MASMORRA_TIPO_D6 = ["templo", "cidadela", "laboratorio", "calabouco", "cripta", "caverna"];
  var MASMORRAS = {
    templo: { nome: "Templo Esquecido", texto: "Templo de um deus esquecido; desenhos e símbolos religiosos nas paredes.", salas: ["Altar coberto por velas", "Estátua de um deus antigo", "2 Golens de Madeira", "1d6 Goblins Abominação", "Ogro em um trono e 1d6 Goblins", "1d6 Crocodilos em um fosso"] },
    cidadela: { nome: "Cidadela Abandonada", texto: "Antiga cidadela dos anões, com marcas de batalha.", salas: ["Sala de Tesouros", "Estandartes e troféus de guerra", "Centenas de armas enferrujadas", "2d6 Esqueletos", "1d6 Goblins", "Golem de Pedra"] },
    laboratorio: { nome: "Antigo Laboratório", texto: "Laboratório de alquimista; círculos de magia por toda parte.", salas: ["Estante coberta por livros", "Estante coberta por frascos", "Mesa com 1d6 Poções", "1d6 Goblins Abominação", "1 Troll e 1d6 Goblins Abominação", "1 Lich e 1d6 Esqueletos"] },
    calabouco: { nome: "Calabouço Arruinado", texto: "Onde um antigo rei prendia criminosos e traidores.", salas: ["Armas enferrujadas e correntes", "Cama de tortura e correntes", "Celas com grades enferrujadas", "2d6 Esqueletos", "1d6 Aranhas Gigantes", "2 Ogros com 1d6 Lobos"] },
    cripta: { nome: "Cripta Assombrada", texto: "Túmulo de um grande mago ou rei; esqueletos dos súditos por toda parte.", salas: ["Vampiro em um trono", "1d6 Fantasmas", "1d6 Zumbis", "1d6 Esqueletos", "Paredes de ossos", "Grande sarcófago"] },
    caverna: { nome: "Caverna Comum", texto: "Cavernas simples: estalactites, estalagmites e pedras.", salas: ["Teto alto cheio de morcegos", "Teto baixo e claustrofóbico", "Rio atravessa o local", "1d6 Goblins", "Golem de Pedra", "Dragão dormindo sobre ouro"] },
  };
  /* Índice = 1d6 + segmentos entre ele e a entrada (12 ou mais: Salão). */
  var SEGMENTOS = {
    1: { tipo: "corredor", nome: "Corredor longo", medida: "1x6", portas: 2 },
    2: { tipo: "sala", nome: "Sala média", medida: "4x4", portas: 2 },
    3: { tipo: "corredor", nome: "Corredor", medida: "1x5", portas: 3 },
    4: { tipo: "sala", nome: "Sala pequena", medida: "3x3", portas: 1 },
    5: { tipo: "sala", nome: "Sala larga", medida: "3x5", portas: 2 },
    6: { tipo: "corredor", nome: "Corredor", medida: "1x5", portas: 1 },
    7: { tipo: "sala", nome: "Sala média", medida: "4x4", portas: 0 },
    8: { tipo: "corredor", nome: "Corredor curto", medida: "1x4", portas: 1 },
    9: { tipo: "sala", nome: "Sala grande", medida: "5x5", portas: 0 },
    10: { tipo: "sala", nome: "Sala média", medida: "4x4", portas: 1 },
    11: { tipo: "corredor", nome: "Corredor longo", medida: "1x6", portas: 2 },
    12: { tipo: "sala", nome: "Salão", medida: "5x7", portas: 0 },
  };
  var CORREDOR_D6 = ["Nada", "Nada", "Nada", "Armadilha (1d6−1 ferimentos)", "1 Cubo Gosmento", "1d6 Goblins"];

  /* ---- Chamado de Cthulin (p. 32–33) ---- */
  var CTHULIN = {
    pagina: 32,
    nomes: { mercenario: "Policial / Gangster", cacador: "Caçador / Burguês", gatuno: "Criminoso / Marujo", lider: "Detetive / Padre / Freira", incendiario: "Artista / Pintor", bruxo: "Bibliotecário / Cultista" },
    inicial: ["chapeu", "livroEspecial"],
    investigacao: ["Sem pista.", "Uma dica bem mais aberta.", "O personagem pensa onde procurar.", "O mestre explica onde está, mas algo sobrenatural acontece na cena."],
    evento: [
      { texto: "Alguém fica tão apavorado que explode!" },
      { texto: "O Horror aparece na cena!" },
      { texto: "Tentáculos por toda parte! (personagens ganham 1 Medo)", medo: 1 },
      { texto: "Uma visão terrível do futuro." },
      { texto: "Uma pista do Horror." },
      { texto: "Vulto estranho passa no canto do olho." },
    ],
    horrores: ["abissal", "byakhee", "caoTindalos", "criaShub", "shogoth", "cthulhu", "azathoth"],
  };

  /* ---- PokéPragas (p. 34–35) ---- */
  var POKE = {
    pagina: 34,
    bichos: {
      comum: ["rato", "lagartixa", "besouro", "sapo", "galinha", "peixe"],
      incomum: ["pomba", "tartaruga", "cobra", "sagui", "esquilo", "coelho"],
      raro: ["pinscher", "caranguejo", "gato", "morcego", "aranha", "escorpiao"],
    },
    raridades: { comum: { nome: "Comum", captura: 1 }, incomum: { nome: "Incomum", captura: 2 }, raro: { nome: "Raro", captura: 3 } },
    /* [combate, habilidade, nocao, vitalidade] (p. 35) */
    ficha: {
      aranha: ["Aranha", 2, 4, 3, 2], besouro: ["Besouro", 1, 0, 1, 3], caranguejo: ["Caranguejo", 3, 2, 3, 4], cobra: ["Cobra", 2, 2, 2, 3],
      coelho: ["Coelho", 1, 3, 2, 3], escorpiao: ["Escorpião", 2, 4, 3, 2], esquilo: ["Esquilo", 1, 3, 2, 3], gato: ["Gato", 2, 4, 3, 4],
      galinha: ["Galinha", 2, 1, 0, 3], lagartixa: ["Lagartixa", 1, 2, 1, 1], morcego: ["Morcego", 2, 4, 3, 3], peixe: ["Peixe", 0, 1, 1, 2],
      pinscher: ["Pinscher", 2, 3, 3, 4], pomba: ["Pomba", 1, 2, 2, 3], rato: ["Rato", 1, 1, 1, 2], sagui: ["Sagui", 1, 3, 2, 3],
      sapo: ["Sapo", 0, 2, 1, 2], tartaruga: ["Tartaruga", 1, 1, 2, 5],
    },
    /* Elemento: 1º dado escolhe a coluna (1–4 | 5–6), 2º a linha. */
    elemento: [["fogo", "agua", "planta", "eletrico", "pedra", "vento"], ["dragao", "trevoso", "metal", "fada", "psiquico", "fantasma"]],
    elementos: {
      eletrico: { nome: "Elétrico", mods: { habilidade: 1 }, fraqueza: "vento" },
      fogo: { nome: "Fogo", mods: { combate: 1 }, fraqueza: "agua" },
      agua: { nome: "Água", mods: { habilidade: 1 }, fraqueza: "eletrico" },
      planta: { nome: "Planta", mods: { combate: 1 }, fraqueza: "fogo" },
      pedra: { nome: "Pedra", mods: { vitalidade: 1 }, fraqueza: "planta" },
      vento: { nome: "Vento", mods: { vitalidade: 1 }, fraqueza: "pedra" },
      dragao: { nome: "Dragão", mods: { combate: 1, habilidade: 1, nocao: 1, vitalidade: 1 }, fraqueza: "fada" },
      trevoso: { nome: "Trevoso", mods: { combate: 1, habilidade: 1 }, fraqueza: "dragao" },
      metal: { nome: "Metal", mods: { vitalidade: 2 }, fraqueza: "psiquico" },
      fada: { nome: "Fada", mods: { habilidade: 1, nocao: 1 }, fraqueza: "metal" },
      psiquico: { nome: "Psíquico", mods: { nocao: 2 }, fraqueza: "fantasma" },
      fantasma: { nome: "Fantasma", mods: { habilidade: 1 }, fraqueza: "trevoso" },
    },
    procurando: [null, "comum", "comum", "comum", "incomum", "raro"],
  };

  /* ---- WarGoblin 40k (p. 36–37) ---- */
  var WARGOBLIN = {
    pagina: 36,
    grupos: {
      marinheirosDeAzul: { nome: "Marinheiros de Azul", ocupacao: "cacador" },
      marinheirosSanguinarios: { nome: "Marinheiros Sanguinários", ocupacao: "mercenario" },
      guardaPestilenta: { nome: "Guarda Pestilenta", ocupacao: "lider" },
      legiaoTrevosa: { nome: "Legião Trevosa", ocupacao: "incendiario" },
      mecanicosDoidos: { nome: "Mecânicos Doidos", ocupacao: "gatuno" },
      freirasPorradeiras: { nome: "Freiras Porradeiras", ocupacao: "bruxo" },
    },
    equipamento: ["armaduraEspacial", "pistolaBolter", "metrancaDePlasma", "lancaChamas", "espadaSerra", "maozonaDoPoder"],
    aliens: ["insetaoRoubaGenes", "insetaoArmado", "roboExterminador", "roboQuatroBracos", "zelfoSoldado", "zelfoGotico"],
  };

  /* ---- Goblin High (p. 38–39) ---- */
  var GOBLIN_HIGH = {
    pagina: 38,
    /* A escala, de baixo para cima. */
    escala: ["inimigo", "hostil", "desconfiado", "neutro", "amigavel", "amigo"],
    nomes: { inimigo: "Inimigo", hostil: "Hostil", desconfiado: "Desconfiado", neutro: "Neutro", amigavel: "Amigável", amigo: "Amigo" },
    reacaoD6: ["amigavel", "neutro", "neutro", "desconfiado", "desconfiado", "hostil"],
    conversaD6: [
      { texto: "Fala sobre o seu Assunto Favorito.", revela: "assunto" },
      { texto: "Fala sobre seus Gostos.", revela: "gosto" },
      { texto: "Fala sobre uma Matéria da escola.", revela: "materia" },
      { texto: "Fala sobre sua Reação com outro Estudante." },
      { texto: "Fala sobre o clima." },
      { texto: "Não fala nada. (Diminua a Reação)", baixa: true },
    ],
    assunto: ["Explosões", "Namoro", "Nerdice", "Esporte", "Filmes", "Escola"],
    gosto: ["Armas", "Roupas", "Livros", "Gatinhos", "Comidas", "Perfumes"],
    materia: ["História", "Línguas", "Física", "Química", "Matemática", "Biologia"],
    segredo: ["Quer explodir a escola!", "Precisa de ajuda na Matéria", "Odeia um Estudante", "Já roubou algo de outro Estudante", "Gosta de um outro Estudante", "Gosta de você!"],
    tePego: ["Fica te encarando o dia todo.", "Coloca alguma coisa no teu lanche.", "Rouba alguma coisa sua.", "Agride um amigo seu.", "Te derruba do nada.", "Começa uma Briga com você."],
  };

  /* ---- Vale dos Goblins (p. 40–41) ---- */
  var VALE = {
    pagina: 40,
    plantas: ["Cenoura", "Batata", "Alface", "Brócolis", "Morango", "Banana", "Arroz", "Trigo", "Milho"],
    frutas: ["Morango", "Banana"],
    peixes: { rio: ["Franzino", "Peixe-Goblin", "Piranha", "Cabeçudo", "Espinhento", "Dourado"], lago: ["Franzino", "Soneca", "Pintas-Roxas", "Pedregoso", "Crista Punk", "Arco-íris"] },
    /* iguais → gramas */
    pesos: { 2: 400, 3: 600, 4: 1000, 5: 3000 },
    construcoes: {
      picareta: { nome: "Picareta", custo: { espada: 1, madeira: 1 }, ferramenta: true },
      enxada: { nome: "Enxada", custo: { pedra: 1, madeira: 1 }, ferramenta: true },
      varaDePesca: { nome: "Vara de Pescar", custo: { madeira: 1 }, ferramenta: true },
      celeiro: { nome: "Celeiro", custo: { pedra: 2, madeira: 8 } },
      fazenda: { nome: "Fazenda", custo: { pedra: 10, madeira: 12 } },
      restaurante: { nome: "Restaurante", custo: { pedra: 12, madeira: 7 } },
    },
    /* ingredientes: { alimento: n } ; peixe: { gramas, tipos? } */
    receitas: {
      ensopado: { nome: "Ensopado de Peixe", hits: 1, ingredientes: { Cenoura: 1, Batata: 1 }, peixe: { gramas: 400 } },
      salada: { nome: "Salada Mista", hits: 1, ingredientes: { Alface: 1, Tomate: 1, Cenoura: 1, "Brócolis": 1 } },
      batataFrita: { nome: "Batata Frita", hits: 1, ingredientes: { Batata: 1 } },
      pratoFeito: { nome: "Prato Feito", hits: 2, ingredientes: { Arroz: 1, Ovo: 1, Batata: 1 }, peixe: { gramas: 600 } },
      omeletao: { nome: "Omeletão", hits: 2, ingredientes: { Ovo: 1, Leite: 1 }, peixe: { gramas: 600 } },
      sorvete: { nome: "Sorvete", hits: 2, ingredientes: { Leite: 1, Fruta: 1 } },
      sanduiche: { nome: "Sanduíche", hits: 2, ingredientes: { Trigo: 1, Leite: 1 }, peixe: { gramas: 200, tipos: ["Franzino"] } },
      sushi: { nome: "Sushi", hits: 3, ingredientes: { Arroz: 1 }, peixe: { gramas: 600, tipos: ["Soneca", "Arco-íris"] } },
      bolo: { nome: "Bolo", hits: 3, ingredientes: { Leite: 1, Ovo: 1, Trigo: 2 } },
    },
  };

  var ADAPTACOES = {
    cthulin: { nome: "Chamado de Cthulin", pagina: 32 },
    pokepragas: { nome: "PokéPragas", pagina: 34 },
    wargoblin: { nome: "WarGoblin 40k", pagina: 36 },
    goblinHigh: { nome: "Goblin High", pagina: 38 },
    vale: { nome: "Vale dos Goblins", pagina: 40 },
  };

  /* O que o livro deixa em aberto ou contradiz — o R.A.M.A. não corrige
     em silêncio: cada item diz o que foi feito. */
  var INCONSISTENCIAS = [
    { chave: "varinha", pagina: 9, texto: "A técnica Condutor Mágico (Bruxo, nível 2) cita a varinha, mas a tabela de armas (p. 12) não dá Condutor Mágico à Varinha. O R.A.M.A. aplica o +1 da técnica à Varinha (como o texto da técnica diz) e mantém a tabela como está." },
    { chave: "arcoDeCaca", pagina: 7, texto: "O Caçador escolhe “Arco de Caça”; a tabela só tem Arco e Flecha. Entra como Arco e Flecha (+2d, Munição 10)." },
    { chave: "semTabela", pagina: 9, texto: "Medalhas de Guerra, Espada Especial, Peitoral Reforçado, Espadão, Correntes, Espada Enferrujada, Clava Gigante, Chicote, Machado, Picareta, Enxada e Vara de Pesca não estão em tabela: nos inimigos valem os números entre parênteses; os de jogador entram sem regra (ou com a regra da adaptação)." },
    { chave: "templo", pagina: 20, texto: "O Templo ou Santuário é descrito, mas não está na tabela de Local Aleatório (p. 19): fica disponível à parte." },
    { chave: "sumario", pagina: 3, texto: "O sumário dá páginas diferentes das impressas para algumas seções (o Gerador de Masmorra está na p. 28). O R.A.M.A. usa a página impressa." },
    { chave: "tomate", pagina: 41, texto: "A Salada Mista pede Tomate, que não está na lista de plantas; o Sanduíche pede 200 g de Franzino, mas nenhuma combinação da pescaria dá 200 g. Tomate entra como alimento manual; 200 g sai de um peixe maior." },
    { chave: "elmoCadeira", pagina: 25, texto: "Elmo-Cadeira: “+1 de Proteção” — o R.A.M.A. trata como proteção de cabeça com Durabilidade 1." },
    { chave: "evolucao", pagina: 34, texto: "Mestre da Evolução: “role dois dados” — o R.A.M.A. evolui se QUALQUER um dos dois der 6." },
    { chave: "zeroDados", pagina: 14, texto: "O livro não diz o que acontece com um teste de 0 dados (atributo 0, difícil com 1). O R.A.M.A. não inventa: pergunta se conta como falha ou se a mesa rola 1 dado." },
    { chave: "nomesLinha6", pagina: 4, texto: "Na tabela de nomes, a linha 6 tem só duas casas: o R.A.M.A. lê colunas 1–3 como “Última coisa que comeu” e 4–6 como “Inverta seu nome”." },
    { chave: "bloqueio", pagina: 15, texto: "Bloquear: “cada ferimento tomado reduz 1 de Durabilidade”. O R.A.M.A. faz a proteção absorver ferimentos até a Durabilidade atual; o que sobra vai para o goblin." },
    { chave: "martelo", pagina: 26, texto: "Martelo do Poder: “1 ferimento automaticamente” em não humanos — somado a cada ataque contra não humano, mesmo com 0 hits." },
    { chave: "livroDeMagia", pagina: 13, texto: "Livro Estranho: “1 chance em 6” — sai no 6 de 1d6; a magia é sorteada entre as 7 do Bruxo." },
    { chave: "pocaoVerde", pagina: 27, texto: "Poção Verde: “aumenta um atributo em +1” — o livro não diz qual nem por quanto tempo: a pessoa escolhe o atributo e o aumento fica permanente." },
    { chave: "elemento", pagina: 34, texto: "Elemento da PokéPraga: “um dado na linha e outro na coluna” — o 1º dado escolhe a coluna (1–4 ou 5–6), o 2º a linha." },
    { chave: "pescariaEmpate", pagina: 41, texto: "Pescaria com duas combinações (dois pares, trinca e par): o livro não diz qual vale; vale a maior, e no empate a pessoa escolhe." },
    { chave: "magiaCuraAliado", pagina: 11, texto: "Cura 1 e 2 falam de “um aliado ao seu toque”: o R.A.M.A. não aplica em quem conjurou (só o 3+, “todas as criaturas visíveis”)." },
    { chave: "tempestade", pagina: 11, texto: "Relâmpago 3+: o livro não diz quantos raios nem quanto dano; a mesa marca a tempestade até o fim da batalha e sorteia alvos, sem número inventado." },
    { chave: "ataqueGiratorio", pagina: 7, texto: "Ataque Giratório: o ataque extra não gera outro Ataque Giratório (o livro não fala em cadeia)." },
  ];

  /* ---- busca ---- */
  function arma(k) { return ARMAS[k] || null; }
  function protecao(k) { return PROTECOES[k] || null; }
  function equipamento(k) { return EQUIPAMENTOS[k] || null; }
  function magico(k) { return ITENS_MAGICOS[k] || null; }
  function inimigo(k) { return INIMIGOS[k] || null; }
  function tecnica(chave) {
    var achada = null;
    Object.keys(OCUPACOES).some(function (o) { return OCUPACOES[o].tecnicas.some(function (t) { if (t.chave === chave) { achada = Object.assign({ ocupacao: o }, t); return true; } return false; }); });
    return achada;
  }
  /* Um item do catálogo, de qualquer tabela: { categoria, def }. */
  function itemDoCatalogo(chave) {
    if (ARMAS[chave]) return { categoria: "arma", def: ARMAS[chave] };
    if (PROTECOES[chave]) return { categoria: "protecao", def: PROTECOES[chave] };
    if (ITENS_MAGICOS[chave]) return { categoria: "magico", def: ITENS_MAGICOS[chave] };
    if (EQUIPAMENTOS[chave]) return { categoria: "equipamento", def: EQUIPAMENTOS[chave] };
    return null;
  }

  global.RAMAGoblinsCatalogo = {
    LIVRO: LIVRO, referencia: referencia,
    ATRIBUTOS: ATRIBUTOS, CHAVES_ATRIBUTO: CHAVES_ATRIBUTO, NOMES: NOMES,
    OCUPACOES: OCUPACOES, OCUPACAO_D6: OCUPACAO_D6, DESCRITORES: DESCRITORES, DESCRITOR_D6: DESCRITOR_D6,
    CARACTERISTICAS: CARACTERISTICAS, CARACTERISTICA_2D6: CARACTERISTICA_2D6,
    MAGIAS: MAGIAS, MAGIAS_DO_BRUXO: MAGIAS_DO_BRUXO,
    ARMAS: ARMAS, ESPECIAIS_DE_ARMA: ESPECIAIS_DE_ARMA, PROTECOES: PROTECOES, ESPECIAIS_DE_PROTECAO: ESPECIAIS_DE_PROTECAO, USOS_DE_PROTECAO: USOS_DE_PROTECAO,
    EQUIPAMENTOS: EQUIPAMENTOS, ITENS_MAGICOS: ITENS_MAGICOS, TIPO_MAGICO_D6: TIPO_MAGICO_D6, NOMES_TIPO_MAGICO: NOMES_TIPO_MAGICO, MAGICOS_D6: MAGICOS_D6,
    ANEL_D6: ANEL_D6, POCAO_D6: POCAO_D6,
    REGRAS: REGRAS, DEU_RUIM_D6: DEU_RUIM_D6, MANOBRAS: MANOBRAS,
    AVENTURA_D6: AVENTURA_D6, AVENTURAS: AVENTURAS, INSPIRACAO_D6: INSPIRACAO_D6, RESPOSTA_D6: RESPOSTA_D6,
    VIAJANTE_2D6: VIAJANTE_2D6, VITIMA_D6: VITIMA_D6, RECOMPENSA_D6: RECOMPENSA_D6, LOCAL_D6: LOCAL_D6, LOCAIS: LOCAIS,
    PROTEGER_2D6: PROTEGER_2D6, VIZINHOS_2D6: VIZINHOS_2D6,
    INIMIGOS: INIMIGOS, CARACTERISTICA_RIVAL_2D6: CARACTERISTICA_RIVAL_2D6,
    MASMORRA_TIPO_D6: MASMORRA_TIPO_D6, MASMORRAS: MASMORRAS, SEGMENTOS: SEGMENTOS, CORREDOR_D6: CORREDOR_D6,
    CTHULIN: CTHULIN, POKE: POKE, WARGOBLIN: WARGOBLIN, GOBLIN_HIGH: GOBLIN_HIGH, VALE: VALE, ADAPTACOES: ADAPTACOES,
    INCONSISTENCIAS: INCONSISTENCIAS,
    arma: arma, protecao: protecao, equipamento: equipamento, magico: magico, inimigo: inimigo, tecnica: tecnica, itemDoCatalogo: itemDoCatalogo,
  };
})(typeof window !== "undefined" ? window : globalThis);
