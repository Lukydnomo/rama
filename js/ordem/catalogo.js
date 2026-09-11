/* =====================================================================
   R.A.M.A. — Ordem Paranormal · catálogo
   =====================================================================
   Os dados das regras, separados do código que os usa.

   Tudo aqui saiu dos dois livros, com a página anotada em cada entrada.
   Nada foi deduzido de memória nem preenchido por analogia: o que não
   foi encontrado está registrado como lacuna em docs/ORDEM-REGRAS.md,
   e não como um valor plausível.

   ---------------------------------------------------------------------
   FONTES
   ---------------------------------------------------------------------

     OPRPG  Ordem Paranormal RPG — Livro de Regras, v1.1, Jambô, 2022
     SAH    Sobrevivendo ao Horror, v1.2, Jambô, 2024

   As páginas são as do LIVRO, não as do PDF.

   ---------------------------------------------------------------------
   DESCRIÇÕES SÃO RESUMOS
   ---------------------------------------------------------------------

   Os textos aqui são resumos próprios, escritos para caber numa ficha e
   para quem já tem o livro lembrar do que se trata. O R.A.M.A. não é uma
   cópia dos livros e não substitui nenhum dos dois: quem for jogar
   precisa deles.

   ---------------------------------------------------------------------
   O QUE `automacao` SIGNIFICA
   ---------------------------------------------------------------------

   Cada entrada diz honestamente o que o sistema faz com ela:

     "calculo"      o efeito entra no cálculo da ficha sozinho
     "parcial"      parte do efeito entra; o resto é anotação
     "informacao"   só o texto. O efeito depende de gasto de PE, de uma
                    condição de cena ou de decisão do mestre, e quem
                    joga aplica na hora

   Uma entrada marcada "informacao" NÃO é uma entrada quebrada. É uma
   entrada honesta: dizer que Faro para Pistas está automatizado quando
   ele exige gastar 1 PE numa cena específica seria mentir sobre o que a
   ficha faz.
   ===================================================================== */

(function (global) {
  "use strict";

  var OPRPG = "OPRPG";
  var SAH = "SAH";

  /* =================================================================
     ATRIBUTOS — OPRPG p.14-15
     ================================================================= */

  var ATRIBUTOS = [
    { chave: "agi", sigla: "AGI", nome: "Agilidade", pagina: 15 },
    { chave: "for", sigla: "FOR", nome: "Força", pagina: 15 },
    { chave: "int", sigla: "INT", nome: "Intelecto", pagina: 15 },
    { chave: "pre", sigla: "PRE", nome: "Presença", pagina: 15 },
    { chave: "vig", sigla: "VIG", nome: "Vigor", pagina: 15 },
  ];

  /* Geração de atributos — OPRPG p.14 */
  var GERACAO_ATRIBUTOS = {
    inicial: 1,
    pontos: 4,
    maximoInicial: 3,
    /* "Você pode reduzir um de seus atributos para 0 para receber 1
       ponto adicional." Um, no singular. */
    reducoesPermitidas: 1,
    pontoPorReducao: 1,
    /* Aumento de atributo em NEX 20%, 50%, 80% e 95% — OPRPG p.26.
       "Você não pode aumentar um atributo além de 5 desta forma." */
    nexDeAumento: [20, 50, 80, 95],
    maximoPorAumento: 5,
    fonte: OPRPG, pagina: 14,
  };

  /* =================================================================
     PERÍCIAS — OPRPG p.40-49
     -----------------------------------------------------------------
     O atributo-base saiu do TÍTULO de cada perícia (p.41-49), e não da
     Tabela 2.1 (p.40): a extração de texto do PDF embaralha as colunas
     da tabela, e os títulos conferem com a descrição dos atributos.
     ================================================================= */

  var PERICIAS = [
    { chave: "acrobacia",    nome: "Acrobacia",    atributo: "agi", treinada: false, carga: true,  kit: false, pagina: 41 },
    { chave: "adestramento", nome: "Adestramento", atributo: "pre", treinada: true,  carga: false, kit: false, pagina: 41 },
    { chave: "artes",        nome: "Artes",        atributo: "pre", treinada: true,  carga: false, kit: false, pagina: 41 },
    { chave: "atletismo",    nome: "Atletismo",    atributo: "for", treinada: false, carga: false, kit: false, pagina: 42 },
    { chave: "atualidades",  nome: "Atualidades",  atributo: "int", treinada: false, carga: false, kit: false, pagina: 42 },
    { chave: "ciencias",     nome: "Ciências",     atributo: "int", treinada: true,  carga: false, kit: false, pagina: 42 },
    { chave: "crime",        nome: "Crime",        atributo: "agi", treinada: true,  carga: true,  kit: true,  pagina: 42 },
    { chave: "diplomacia",   nome: "Diplomacia",   atributo: "pre", treinada: false, carga: false, kit: false, pagina: 43 },
    { chave: "enganacao",    nome: "Enganação",    atributo: "pre", treinada: false, carga: false, kit: true,  pagina: 43 },
    { chave: "fortitude",    nome: "Fortitude",    atributo: "vig", treinada: false, carga: false, kit: false, pagina: 43 },
    { chave: "furtividade",  nome: "Furtividade",  atributo: "agi", treinada: false, carga: true,  kit: false, pagina: 44 },
    { chave: "iniciativa",   nome: "Iniciativa",   atributo: "agi", treinada: false, carga: false, kit: false, pagina: 44 },
    { chave: "intimidacao",  nome: "Intimidação",  atributo: "pre", treinada: false, carga: false, kit: false, pagina: 44 },
    { chave: "intuicao",     nome: "Intuição",     atributo: "pre", treinada: false, carga: false, kit: false, pagina: 44 },
    { chave: "investigacao", nome: "Investigação", atributo: "int", treinada: false, carga: false, kit: false, pagina: 45 },
    { chave: "luta",         nome: "Luta",         atributo: "for", treinada: false, carga: false, kit: false, pagina: 45 },
    { chave: "medicina",     nome: "Medicina",     atributo: "int", treinada: false, carga: false, kit: true,  pagina: 45 },
    { chave: "ocultismo",    nome: "Ocultismo",    atributo: "int", treinada: true,  carga: false, kit: false, pagina: 46 },
    { chave: "percepcao",    nome: "Percepção",    atributo: "pre", treinada: false, carga: false, kit: false, pagina: 46 },
    { chave: "pilotagem",    nome: "Pilotagem",    atributo: "agi", treinada: true,  carga: false, kit: false, pagina: 46 },
    { chave: "pontaria",     nome: "Pontaria",     atributo: "agi", treinada: false, carga: false, kit: false, pagina: 47 },
    { chave: "profissao",    nome: "Profissão",    atributo: "int", treinada: true,  carga: false, kit: false, pagina: 47 },
    { chave: "reflexos",     nome: "Reflexos",     atributo: "agi", treinada: false, carga: false, kit: false, pagina: 47 },
    { chave: "religiao",     nome: "Religião",     atributo: "pre", treinada: true,  carga: false, kit: false, pagina: 47 },
    { chave: "sobrevivencia",nome: "Sobrevivência",atributo: "int", treinada: false, carga: false, kit: false, pagina: 48 },
    { chave: "tatica",       nome: "Tática",       atributo: "int", treinada: true,  carga: false, kit: false, pagina: 48 },
    { chave: "tecnologia",   nome: "Tecnologia",   atributo: "int", treinada: true,  carga: false, kit: true,  pagina: 48 },
    { chave: "vontade",      nome: "Vontade",      atributo: "pre", treinada: false, carga: false, kit: false, pagina: 49 },
  ];

  /* Grau de treinamento e bônus — OPRPG p.40.
     Os NEX mínimos vêm de Grau de Treinamento (OPRPG p.26): veterano a
     partir de NEX 35%, expert a partir de NEX 70%. */
  var GRAUS = [
    { chave: "destreinado", nome: "Destreinado", bonus: 0,  nexMinimo: 0 },
    { chave: "treinado",    nome: "Treinado",    bonus: 5,  nexMinimo: 0 },
    { chave: "veterano",    nome: "Veterano",    bonus: 10, nexMinimo: 35 },
    { chave: "expert",      nome: "Expert",      bonus: 15, nexMinimo: 70 },
  ];

  /* =================================================================
     CLASSES — OPRPG p.24-35
     -----------------------------------------------------------------
     `pvInicial` e companhia valem em NEX 5%. A cada 5% de NEX
     seguintes, soma-se o valor "porNex".
     ================================================================= */

  var CLASSES = [
    {
      chave: "combatente",
      nome: "Combatente",
      pagina: 24,
      resumo: "Perito em armas brancas e de fogo. A linha de frente contra o Outro Lado.",
      pvInicial: { base: 20, atributo: "vig" },
      pvPorNex: { base: 4, atributo: "vig" },
      peInicial: { base: 2, atributo: "pre" },
      pePorNex: { base: 2, atributo: "pre" },
      sanInicial: { base: 12, atributo: null },
      sanPorNex: { base: 3, atributo: null },
      /* Duas escolhas obrigatórias, uma de cada par, mais livres. */
      periciasEscolhaObrigatoria: [
        { entre: ["luta", "pontaria"] },
        { entre: ["fortitude", "reflexos"] },
      ],
      periciasFixas: [],
      periciasLivres: { base: 1, atributo: "int" },
      proficiencias: ["Armas simples", "Armas táticas", "Proteções leves"],
    },
    {
      chave: "especialista",
      nome: "Especialista",
      pagina: 28,
      resumo: "Conhecimento, esperteza e lábia. Versátil e habilidoso.",
      pvInicial: { base: 16, atributo: "vig" },
      pvPorNex: { base: 3, atributo: "vig" },
      peInicial: { base: 3, atributo: "pre" },
      pePorNex: { base: 3, atributo: "pre" },
      sanInicial: { base: 16, atributo: null },
      sanPorNex: { base: 4, atributo: null },
      periciasEscolhaObrigatoria: [],
      periciasFixas: [],
      periciasLivres: { base: 7, atributo: "int" },
      proficiencias: ["Armas simples", "Proteções leves"],
    },
    {
      chave: "ocultista",
      nome: "Ocultista",
      pagina: 32,
      resumo: "Estudioso do paranormal, que domina rituais e os poderes do Outro Lado.",
      pvInicial: { base: 12, atributo: "vig" },
      pvPorNex: { base: 2, atributo: "vig" },
      peInicial: { base: 4, atributo: "pre" },
      pePorNex: { base: 4, atributo: "pre" },
      sanInicial: { base: 20, atributo: null },
      sanPorNex: { base: 5, atributo: null },
      periciasEscolhaObrigatoria: [],
      periciasFixas: ["ocultismo", "vontade"],
      periciasLivres: { base: 3, atributo: "int" },
      proficiencias: ["Armas simples"],
      /* Escolhido pelo Outro Lado — OPRPG p.33. O círculo máximo que o
         ocultista consegue conjurar, por NEX. */
      circuloPorNex: [
        { nex: 5, circulo: 1 },
        { nex: 25, circulo: 2 },
        { nex: 55, circulo: 3 },
        { nex: 85, circulo: 4 },
      ],
    },
  ];

  /* =================================================================
     O QUE CADA NEX ENTREGA — OPRPG p.25, p.29, p.33
     -----------------------------------------------------------------
     As três tabelas de progressão. `escolhas` é o que a progressão
     precisa PERGUNTAR a quem joga; o R.A.M.A. nunca escolhe sozinho.
     ================================================================= */

  var PROGRESSAO = {
    combatente: [
      { nex: 5,  rotulos: ["Ataque especial (2 PE, +5)"], escolhas: [] },
      { nex: 10, rotulos: ["Habilidade de trilha"], escolhas: ["trilha"] },
      { nex: 15, rotulos: ["Poder de combatente"], escolhas: ["poderClasse"] },
      { nex: 20, rotulos: ["Aumento de atributo"], escolhas: ["atributo"] },
      { nex: 25, rotulos: ["Ataque especial (3 PE, +10)"], escolhas: [] },
      { nex: 30, rotulos: ["Poder de combatente"], escolhas: ["poderClasse"] },
      { nex: 35, rotulos: ["Grau de treinamento"], escolhas: ["grauTreinamento"] },
      { nex: 40, rotulos: ["Habilidade de trilha"], escolhas: ["poderTrilha"] },
      { nex: 45, rotulos: ["Poder de combatente"], escolhas: ["poderClasse"] },
      { nex: 50, rotulos: ["Aumento de atributo", "Versatilidade"], escolhas: ["atributo", "versatilidade"] },
      { nex: 55, rotulos: ["Ataque especial (4 PE, +15)"], escolhas: [] },
      { nex: 60, rotulos: ["Poder de combatente"], escolhas: ["poderClasse"] },
      { nex: 65, rotulos: ["Habilidade de trilha"], escolhas: ["poderTrilha"] },
      { nex: 70, rotulos: ["Grau de treinamento"], escolhas: ["grauTreinamento"] },
      { nex: 75, rotulos: ["Poder de combatente"], escolhas: ["poderClasse"] },
      { nex: 80, rotulos: ["Aumento de atributo"], escolhas: ["atributo"] },
      { nex: 85, rotulos: ["Ataque especial (5 PE, +20)"], escolhas: [] },
      { nex: 90, rotulos: ["Poder de combatente"], escolhas: ["poderClasse"] },
      { nex: 95, rotulos: ["Aumento de atributo"], escolhas: ["atributo"] },
      { nex: 99, rotulos: ["Habilidade de trilha"], escolhas: ["poderTrilha"] },
    ],
    especialista: [
      { nex: 5,  rotulos: ["Eclético", "Perito (2 PE, +1d6)"], escolhas: ["perito"] },
      { nex: 10, rotulos: ["Habilidade de trilha"], escolhas: ["trilha"] },
      { nex: 15, rotulos: ["Poder de especialista"], escolhas: ["poderClasse"] },
      { nex: 20, rotulos: ["Aumento de atributo"], escolhas: ["atributo"] },
      { nex: 25, rotulos: ["Perito (3 PE, +1d8)"], escolhas: [] },
      { nex: 30, rotulos: ["Poder de especialista"], escolhas: ["poderClasse"] },
      { nex: 35, rotulos: ["Grau de treinamento"], escolhas: ["grauTreinamento"] },
      { nex: 40, rotulos: ["Engenhosidade (veterano)", "Habilidade de trilha"], escolhas: ["poderTrilha"] },
      { nex: 45, rotulos: ["Poder de especialista"], escolhas: ["poderClasse"] },
      { nex: 50, rotulos: ["Aumento de atributo", "Versatilidade"], escolhas: ["atributo", "versatilidade"] },
      { nex: 55, rotulos: ["Perito (4 PE, +1d10)"], escolhas: [] },
      { nex: 60, rotulos: ["Poder de especialista"], escolhas: ["poderClasse"] },
      { nex: 65, rotulos: ["Habilidade de trilha"], escolhas: ["poderTrilha"] },
      { nex: 70, rotulos: ["Grau de treinamento"], escolhas: ["grauTreinamento"] },
      { nex: 75, rotulos: ["Engenhosidade (expert)", "Poder de especialista"], escolhas: ["poderClasse"] },
      { nex: 80, rotulos: ["Aumento de atributo"], escolhas: ["atributo"] },
      { nex: 85, rotulos: ["Perito (5 PE, +1d12)"], escolhas: [] },
      { nex: 90, rotulos: ["Poder de especialista"], escolhas: ["poderClasse"] },
      { nex: 95, rotulos: ["Aumento de atributo"], escolhas: ["atributo"] },
      { nex: 99, rotulos: ["Habilidade de trilha"], escolhas: ["poderTrilha"] },
    ],
    ocultista: [
      { nex: 5,  rotulos: ["Escolhido pelo Outro Lado (1º círculo)"], escolhas: [] },
      { nex: 10, rotulos: ["Habilidade de trilha"], escolhas: ["trilha"] },
      { nex: 15, rotulos: ["Poder de ocultista"], escolhas: ["poderClasse"] },
      { nex: 20, rotulos: ["Aumento de atributo"], escolhas: ["atributo"] },
      { nex: 25, rotulos: ["Escolhido pelo Outro Lado (2º círculo)"], escolhas: [] },
      { nex: 30, rotulos: ["Poder de ocultista"], escolhas: ["poderClasse"] },
      { nex: 35, rotulos: ["Grau de treinamento"], escolhas: ["grauTreinamento"] },
      { nex: 40, rotulos: ["Habilidade de trilha"], escolhas: ["poderTrilha"] },
      { nex: 45, rotulos: ["Poder de ocultista"], escolhas: ["poderClasse"] },
      { nex: 50, rotulos: ["Aumento de atributo", "Versatilidade"], escolhas: ["atributo", "versatilidade"] },
      { nex: 55, rotulos: ["Escolhido pelo Outro Lado (3º círculo)"], escolhas: [] },
      { nex: 60, rotulos: ["Poder de ocultista"], escolhas: ["poderClasse"] },
      { nex: 65, rotulos: ["Habilidade de trilha"], escolhas: ["poderTrilha"] },
      { nex: 70, rotulos: ["Grau de treinamento"], escolhas: ["grauTreinamento"] },
      { nex: 75, rotulos: ["Poder de ocultista"], escolhas: ["poderClasse"] },
      { nex: 80, rotulos: ["Aumento de atributo"], escolhas: ["atributo"] },
      { nex: 85, rotulos: ["Escolhido pelo Outro Lado (4º círculo)"], escolhas: [] },
      { nex: 90, rotulos: ["Poder de ocultista"], escolhas: ["poderClasse"] },
      { nex: 95, rotulos: ["Aumento de atributo"], escolhas: ["atributo"] },
      { nex: 99, rotulos: ["Habilidade de trilha"], escolhas: ["poderTrilha"] },
    ],
  };

  /* =================================================================
     TRILHAS — OPRPG p.26-27, p.30-31, p.34-35
     -----------------------------------------------------------------
     Cinco por classe, quatro poderes cada, em NEX 10%, 40%, 65% e 99%.
     ================================================================= */

  function poder(nex, nome, pagina) {
    return { nex: nex, nome: nome, pagina: pagina, automacao: "informacao" };
  }

  var TRILHAS = [
    /* --- combatente --- */
    { chave: "aniquilador", classe: "combatente", nome: "Aniquilador", pagina: 26,
      resumo: "Abate alvos com eficiência e velocidade. A arma favorita fica mais barata e mais letal.",
      poderes: [poder(10, "A Favorita", 26), poder(40, "Técnica Secreta", 26),
                poder(65, "Técnica Sublime", 26), poder(99, "Máquina de Matar", 26)] },
    { chave: "comandante", classe: "combatente", nome: "Comandante de Campo", pagina: 26,
      resumo: "Coordena e auxilia aliados em combate, tirando proveito do talento do grupo.",
      poderes: [poder(10, "Inspirar Confiança", 26), poder(40, "Estrategista", 27),
                poder(65, "Brecha na Guarda", 27), poder(99, "Oficial Comandante", 27)] },
    { chave: "guerreiro", classe: "combatente", nome: "Guerreiro", pagina: 27,
      resumo: "Transformou o corpo numa arma. Golpes corpo a corpo tão fortes quanto uma bala.",
      poderes: [poder(10, "Técnica Letal", 27), poder(40, "Revidar", 27),
                poder(65, "Força Opressora", 27), poder(99, "Potência Máxima", 27)] },
    { chave: "operacoes", classe: "combatente", nome: "Operações Especiais", pagina: 27,
      resumo: "Ações calculadas e posicionamento inteligente no campo de batalha.",
      poderes: [poder(10, "Iniciativa Aprimorada", 27), poder(40, "Ataque Extra", 27),
                poder(65, "Surto de Adrenalina", 27), poder(99, "Sempre Alerta", 27)] },
    { chave: "tropadechoque", classe: "combatente", nome: "Tropa de Choque", pagina: 27,
      resumo: "Duro na queda. Se coloca entre os aliados e o perigo.",
      poderes: [poder(10, "Casca Grossa", 27), poder(40, "Cai Dentro", 27),
                poder(65, "Duro de Matar", 27), poder(99, "Inquebrável", 27)] },

    /* --- especialista --- */
    { chave: "atirador", classe: "especialista", nome: "Atirador de Elite", pagina: 30,
      resumo: "Precisão à distância, com disparos que derrubam e matam.",
      poderes: [poder(10, "Mira de Elite", 30), poder(40, "Disparo Letal", 30),
                poder(65, "Disparo Impactante", 30), poder(99, "Atirar para Matar", 30)] },
    { chave: "infiltrador", classe: "especialista", nome: "Infiltrador", pagina: 30,
      resumo: "Atinge pontos vitais e se move sem ser visto.",
      poderes: [poder(10, "Ataque Furtivo", 30), poder(40, "Gatuno", 30),
                poder(65, "Assassinar", 30), poder(99, "Sombra Fugaz", 31)] },
    { chave: "medico", classe: "especialista", nome: "Médico de Campo", pagina: 31,
      resumo: "Mantém o grupo de pé no meio do horror.",
      poderes: [poder(10, "Paramédico", 31), poder(40, "Equipe de Trauma", 31),
                poder(65, "Resgate", 31), poder(99, "Reanimação", 31)] },
    { chave: "negociador", classe: "especialista", nome: "Negociador", pagina: 31,
      resumo: "Resolve com a palavra o que outros resolveriam com a arma.",
      poderes: [poder(10, "Eloquência", 31), poder(40, "Discurso Motivador", 31),
                poder(65, "Eu Conheço um Cara", 31), poder(99, "Truque de Mestre", 31)] },
    { chave: "tecnico", classe: "especialista", nome: "Técnico", pagina: 31,
      resumo: "Improvisa, conserta e sempre tem o item certo na mochila.",
      poderes: [poder(10, "Inventário Otimizado", 31), poder(40, "Remendão", 31),
                poder(65, "Improvisar", 31), poder(99, "Preparado para Tudo", 31)] },

    /* --- ocultista --- */
    { chave: "conduite", classe: "ocultista", nome: "Conduíte", pagina: 34,
      resumo: "Canaliza rituais com mais força, mais rápido, e anula os dos outros.",
      poderes: [poder(10, "Ampliar Ritual", 34), poder(40, "Acelerar Ritual", 34),
                poder(65, "Anular Ritual", 34), poder(99, "Canalizar o Medo", 34)] },
    { chave: "flagelador", classe: "ocultista", nome: "Flagelador", pagina: 34,
      resumo: "Paga com o próprio corpo o preço do poder.",
      poderes: [poder(10, "Poder do Flagelo", 34), poder(40, "Abraçar a Dor", 34),
                poder(65, "Absorver Agonia", 34), poder(99, "Medo Tangível", 34)] },
    { chave: "graduado", classe: "ocultista", nome: "Graduado", pagina: 34,
      resumo: "Estudo formal do Outro Lado: mais rituais, mais eficientes.",
      poderes: [poder(10, "Saber Ampliado", 34), poder(40, "Grimório Ritualístico", 35),
                poder(65, "Rituais Eficientes", 35), poder(99, "Conhecendo o Medo", 35)] },
    { chave: "intuitivo", classe: "ocultista", nome: "Intuitivo", pagina: 35,
      resumo: "Compreende o paranormal sem estudá-lo. Mente firme diante do horror.",
      poderes: [poder(10, "Mente Sã", 35), poder(40, "Presença Poderosa", 35),
                poder(65, "Inabalável", 35), poder(99, "Presença do Medo", 35)] },
    { chave: "laminaparanormal", classe: "ocultista", nome: "Lâmina Paranormal", pagina: 35,
      resumo: "Junta ritual e combate corpo a corpo numa arma só.",
      poderes: [poder(10, "Lâmina Maldita", 35), poder(40, "Gladiador Paranormal", 35),
                poder(65, "Conjuração Marcial", 35), poder(99, "Lâmina do Medo", 35)] },
  ];

  /* =================================================================
     ORIGENS — OPRPG p.16-21
     -----------------------------------------------------------------
     Cada origem dá duas perícias treinadas e um poder.

     `efeito` só existe nas origens cujo poder é numérico e permanente —
     essas entram no cálculo. As outras 16 têm poderes que dependem de
     gastar PE, de uma vez por cena ou de decisão do mestre, e são
     informativas por natureza, não por preguiça.
     ================================================================= */

  var ORIGENS = [
    { chave: "academico", nome: "Acadêmico", pagina: 16,
      pericias: ["ciencias", "investigacao"],
      poder: "Saber é Poder", automacao: "informacao",
      resumo: "Em teste com Intelecto, gaste 2 PE para receber +5." },

    { chave: "agentesaude", nome: "Agente de Saúde", pagina: 16,
      pericias: ["intuicao", "medicina"],
      poder: "Técnica Medicinal", automacao: "informacao",
      resumo: "Ao curar alguém, soma seu Intelecto no total de PV curados." },

    { chave: "amnesico", nome: "Amnésico", pagina: 16,
      pericias: [], periciasAEscolher: 2,
      periciasObservacao: "Duas à escolha do mestre.",
      poder: "Vislumbres do Passado", automacao: "informacao",
      resumo: "Uma vez por sessão, teste de Intelecto (DT 10) para reconhecer algo do passado: 1d4 PE temporários e uma informação." },

    { chave: "artista", nome: "Artista", pagina: 17,
      pericias: ["artes", "enganacao"],
      poder: "Magnum Opus", automacao: "informacao",
      resumo: "Uma vez por missão, alguém o reconhece: +5 em testes de Presença contra essa pessoa." },

    { chave: "atleta", nome: "Atleta", pagina: 17,
      pericias: ["acrobacia", "atletismo"],
      poder: "110%", automacao: "informacao",
      resumo: "Em teste de perícia com Força ou Agilidade (exceto Luta e Pontaria), gaste 2 PE para receber +5." },

    { chave: "chef", nome: "Chef", pagina: 17,
      pericias: ["fortitude", "profissao"],
      periciasObservacao: "Profissão (cozinheiro).",
      poder: "Ingrediente Secreto", automacao: "informacao",
      resumo: "No interlúdio, cozinha um prato especial: você e quem se alimentar recebem o benefício de dois pratos." },

    { chave: "criminoso", nome: "Criminoso", pagina: 17,
      pericias: ["crime", "furtividade"],
      poder: "O Crime Compensa", automacao: "informacao",
      resumo: "Um item encontrado na missão não conta no seu limite de itens por patente na missão seguinte." },

    { chave: "cultistaarrependido", nome: "Cultista Arrependido", pagina: 18,
      pericias: ["ocultismo", "religiao"],
      poder: "Traços do Outro Lado", automacao: "calculo",
      efeito: { tipo: "sanidadeMetade" },
      resumo: "Você tem um poder paranormal à sua escolha, mas começa com METADE da Sanidade normal da sua classe." },

    { chave: "desgarrado", nome: "Desgarrado", pagina: 18,
      pericias: ["fortitude", "sobrevivencia"],
      poder: "Calejado", automacao: "calculo",
      efeito: { tipo: "pvPorNex", valor: 1 },
      resumo: "+1 PV para cada 5% de NEX." },

    { chave: "engenheiro", nome: "Engenheiro", pagina: 18,
      pericias: ["profissao", "tecnologia"],
      poder: "Ferramentas Favoritas", automacao: "informacao",
      resumo: "Um item à sua escolha (exceto armas) conta como uma categoria abaixo." },

    { chave: "executivo", nome: "Executivo", pagina: 18,
      pericias: ["diplomacia", "profissao"],
      poder: "Processo Otimizado", automacao: "informacao",
      resumo: "Em teste estendido ou ao revisar documentos, gaste 2 PE para receber +5." },

    { chave: "investigador", nome: "Investigador", pagina: 19,
      pericias: ["investigacao", "percepcao"],
      poder: "Faro para Pistas", automacao: "informacao",
      resumo: "Uma vez por cena, ao procurar pistas, gaste 1 PE para receber +5." },

    { chave: "lutador", nome: "Lutador", pagina: 19,
      pericias: ["luta", "reflexos"],
      poder: "Mão Pesada", automacao: "calculo",
      efeito: { tipo: "danoCorpoACorpo", valor: 2 },
      resumo: "+2 em rolagens de dano com ataques corpo a corpo." },

    { chave: "magnata", nome: "Magnata", pagina: 20,
      pericias: ["diplomacia", "pilotagem"],
      poder: "Patrocinador da Ordem", automacao: "calculo",
      efeito: { tipo: "creditoAcima", valor: 1 },
      resumo: "Seu limite de crédito é sempre considerado um acima do atual." },

    { chave: "mercenario", nome: "Mercenário", pagina: 20,
      pericias: ["iniciativa", "intimidacao"],
      poder: "Posição de Combate", automacao: "informacao",
      resumo: "No primeiro turno de cada cena de ação, gaste 2 PE para uma ação de movimento adicional." },

    { chave: "militar", nome: "Militar", pagina: 20,
      pericias: ["pontaria", "tatica"],
      poder: "Para Bellum", automacao: "calculo",
      efeito: { tipo: "danoArmaDeFogo", valor: 2 },
      resumo: "+2 em rolagens de dano com armas de fogo." },

    { chave: "operario", nome: "Operário", pagina: 20,
      pericias: ["fortitude", "profissao"],
      poder: "Ferramenta de Trabalho", automacao: "informacao",
      resumo: "Escolha uma arma simples ou tática: você sabe usá-la e recebe +1 em ataque, dano e margem de ameaça com ela." },

    { chave: "policial", nome: "Policial", pagina: 20,
      pericias: ["percepcao", "pontaria"],
      poder: "Patrulha", automacao: "calculo",
      efeito: { tipo: "defesa", valor: 2 },
      resumo: "+2 em Defesa." },

    { chave: "religioso", nome: "Religioso", pagina: 20,
      pericias: ["religiao", "vontade"],
      poder: "Acalentar", automacao: "informacao",
      resumo: "+5 em Religião para acalmar; quem você acalma recebe 1d6 + sua Presença em Sanidade." },

    { chave: "servidorpublico", nome: "Servidor Público", pagina: 20,
      pericias: ["intuicao", "vontade"],
      poder: "Espírito Cívico", automacao: "informacao",
      resumo: "Ao ajudar alguém, gaste 1 PE para aumentar o bônus concedido em +2." },

    { chave: "teorico", nome: "Teórico da Conspiração", pagina: 21,
      pericias: ["investigacao", "ocultismo"],
      poder: "Eu Já Sabia", automacao: "calculo",
      efeito: { tipo: "resistenciaMental", atributo: "int" },
      resumo: "Resistência a dano mental igual ao seu Intelecto." },

    { chave: "ti", nome: "T.I.", pagina: 21,
      pericias: ["investigacao", "tecnologia"],
      poder: "Motor de Busca", automacao: "informacao",
      resumo: "Com acesso à internet, gaste 2 PE para substituir um teste de perícia por um de Tecnologia." },

    { chave: "trabalhadorrural", nome: "Trabalhador Rural", pagina: 21,
      pericias: ["adestramento", "sobrevivencia"],
      poder: "Desbravador", automacao: "parcial",
      efeito: { tipo: "ignoraTerrenoDificil" },
      resumo: "Gaste 2 PE para +5 em Adestramento ou Sobrevivência. Não sofre penalidade de deslocamento por terreno difícil." },

    { chave: "trambiqueiro", nome: "Trambiqueiro", pagina: 21,
      pericias: ["crime", "enganacao"],
      poder: "Impostor", automacao: "informacao",
      resumo: "Uma vez por cena, gaste 2 PE para substituir um teste de perícia por um de Enganação." },

    { chave: "universitario", nome: "Universitário", pagina: 21,
      pericias: ["atualidades", "investigacao"],
      poder: "Dedicação", automacao: "calculo",
      efeito: { tipo: "dedicacao" },
      resumo: "+1 PE, e mais 1 PE a cada NEX ímpar (15%, 25%…). Seu limite de PE por turno aumenta em 1." },

    { chave: "vitima", nome: "Vítima", pagina: 21,
      pericias: ["reflexos", "vontade"],
      poder: "Cicatrizes Psicológicas", automacao: "calculo",
      efeito: { tipo: "sanPorNex", valor: 1 },
      resumo: "+1 de Sanidade para cada 5% de NEX." },
  ];

  /* =================================================================
     PATENTES — OPRPG p.51-52, Tabela 3.1
     ================================================================= */

  var PATENTES = [
    { chave: "recruta",  nome: "Recruta",              pp: 0,   credito: "Baixo",     itens: { I: 2, II: 0, III: 0, IV: 0 } },
    { chave: "operador", nome: "Operador",             pp: 20,  credito: "Médio",     itens: { I: 3, II: 1, III: 0, IV: 0 } },
    { chave: "especial", nome: "Agente especial",      pp: 50,  credito: "Médio",     itens: { I: 3, II: 2, III: 1, IV: 0 } },
    { chave: "oficial",  nome: "Oficial de operações", pp: 100, credito: "Alto",      itens: { I: 3, II: 3, III: 2, IV: 1 } },
    { chave: "elite",    nome: "Agente de elite",      pp: 200, credito: "Ilimitado", itens: { I: 3, II: 3, III: 3, IV: 2 } },
  ];

  var CREDITOS = ["Baixo", "Médio", "Alto", "Ilimitado"];

  /* =================================================================
     RITUAIS — OPRPG p.117-121
     ================================================================= */

  var ELEMENTOS = [
    { chave: "conhecimento", nome: "Conhecimento", resumo: "A entidade da consciência. Afeta a mente, revela e esconde." },
    { chave: "energia",      nome: "Energia",      resumo: "A entidade do caos. Luz, eletricidade, fogo, frio e probabilidades." },
    { chave: "morte",        nome: "Morte",        resumo: "A entidade da espiral do tempo. Energia vital e distorção do tempo." },
    { chave: "sangue",       nome: "Sangue",       resumo: "A entidade do sentimento. Fortalece o corpo e manipula emoções." },
    { chave: "medo",         nome: "Medo",         resumo: "O elemento mais misterioso. Afeta a relação do Outro Lado com a Realidade." },
  ];

  /* "Cada elemento é efetivo contra outro e menos efetivo contra si."
     OPRPG p.118. O Medo é neutro nos dois sentidos. */
  var OPRESSAO = {
    sangue: "conhecimento",
    conhecimento: "energia",
    energia: "morte",
    morte: "sangue",
  };

  /* Custo por círculo — OPRPG p.119, Tabela 5.2. */
  var CUSTO_RITUAL = { 1: 1, 2: 3, 3: 6, 4: 10 };

  var EXECUCOES = ["Ação livre", "Ação de movimento", "Ação padrão", "Ação completa", "Maior que ação completa"];

  /* Alcances com a distância que o livro dá — OPRPG p.120. */
  var ALCANCES = [
    { chave: "pessoal",   nome: "Pessoal",   metros: 0 },
    { chave: "toque",     nome: "Toque",     metros: 0 },
    { chave: "curto",     nome: "Curto",     metros: 9 },
    { chave: "medio",     nome: "Médio",     metros: 18 },
    { chave: "longo",     nome: "Longo",     metros: 36 },
    { chave: "extremo",   nome: "Extremo",   metros: 90 },
    { chave: "ilimitado", nome: "Ilimitado", metros: null },
  ];

  /* =================================================================
     CONSTANTES DE REGRA
     ================================================================= */

  var REGRAS = {
    /* OPRPG p.36 */
    defesaBase: 10,
    defesaAtributo: "agi",
    deslocamentoPadrao: 9,

    /* OPRPG p.53 */
    espacosPorForca: 5,
    espacosForcaZero: 2,
    penalidadeSobrecarga: { defesa: -5, pericias: -5, deslocamento: -3 },

    /* OPRPG p.23 */
    nexMinimo: 5,
    nexMaximo: 99,
    passoNex: 5,

    /* OPRPG p.119 */
    limiteRituaisPorIntelecto: true,
  };

  /* =================================================================
     ÍNDICES
     ================================================================= */

  function indexar(lista, chave) {
    var mapa = {};
    lista.forEach(function (item) { mapa[item[chave || "chave"]] = item; });
    return mapa;
  }

  var POR_CHAVE = {
    atributos: indexar(ATRIBUTOS),
    pericias: indexar(PERICIAS),
    classes: indexar(CLASSES),
    trilhas: indexar(TRILHAS),
    origens: indexar(ORIGENS),
    graus: indexar(GRAUS),
    patentes: indexar(PATENTES),
    elementos: indexar(ELEMENTOS),
  };

  function pericia(chave) { return POR_CHAVE.pericias[chave] || null; }
  function classe(chave) { return POR_CHAVE.classes[chave] || null; }
  function origem(chave) { return POR_CHAVE.origens[chave] || null; }
  function trilha(chave) { return POR_CHAVE.trilhas[chave] || null; }
  function grau(chave) { return POR_CHAVE.graus[chave] || POR_CHAVE.graus.destreinado; }

  function trilhasDaClasse(chaveClasse) {
    return TRILHAS.filter(function (t) { return t.classe === chaveClasse; });
  }

  function progressaoDaClasse(chaveClasse) {
    return PROGRESSAO[chaveClasse] || [];
  }

  /* A referência de livro e página, como texto, para aparecer ao lado
     de cada entrada do catálogo. */
  function referencia(entrada) {
    if (!entrada || !entrada.pagina) return "";
    var livro = entrada.fonte === SAH ? "Sobrevivendo ao Horror" : "Ordem Paranormal RPG";
    return livro + ", p. " + entrada.pagina;
  }

  global.RAMAOrdemCatalogo = {
    FONTES: { OPRPG: OPRPG, SAH: SAH },

    ATRIBUTOS: ATRIBUTOS,
    GERACAO_ATRIBUTOS: GERACAO_ATRIBUTOS,
    PERICIAS: PERICIAS,
    GRAUS: GRAUS,
    CLASSES: CLASSES,
    PROGRESSAO: PROGRESSAO,
    TRILHAS: TRILHAS,
    ORIGENS: ORIGENS,
    PATENTES: PATENTES,
    CREDITOS: CREDITOS,
    ELEMENTOS: ELEMENTOS,
    OPRESSAO: OPRESSAO,
    CUSTO_RITUAL: CUSTO_RITUAL,
    EXECUCOES: EXECUCOES,
    ALCANCES: ALCANCES,
    REGRAS: REGRAS,

    pericia: pericia,
    classe: classe,
    origem: origem,
    trilha: trilha,
    grau: grau,
    trilhasDaClasse: trilhasDaClasse,
    progressaoDaClasse: progressaoDaClasse,
    referencia: referencia,
  };
})(typeof window !== "undefined" ? window : globalThis);
