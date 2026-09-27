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
      perfil: "agente",
      pagina: 24,
      resumo: "Perito em armas brancas e de fogo. A linha de frente contra o Outro Lado.",
      pvInicial: { base: 20, atributo: "vig" },
      pvPorNex: { base: 4, atributo: "vig" },
      peInicial: { base: 2, atributo: "pre" },
      pePorNex: { base: 2, atributo: "pre" },
      sanInicial: { base: 12, atributo: null },
      sanPorNex: { base: 3, atributo: null },
      /* Pontos de determinação, só com "Jogando sem Sanidade" (SAH p.104):
         substituem PE e Sanidade juntos. */
      pdInicial: { base: 6, atributo: "pre" },
      pdPorNex: { base: 3, atributo: "pre" },
      /* Duas escolhas obrigatórias, uma de cada par, mais livres. */
      periciasEscolhaObrigatoria: [
        { entre: ["luta", "pontaria"] },
        { entre: ["fortitude", "reflexos"] },
      ],
      periciasFixas: [],
      periciasLivres: { base: 1, atributo: "int" },
      proficiencias: ["Armas simples", "Armas táticas", "Proteções leves"],
      /* Grau de Treinamento: "um número de perícias treinadas igual a
         2 + Int" — OPRPG p.26. */
      grauTreinamentoBase: 2,
    },
    {
      chave: "especialista",
      nome: "Especialista",
      perfil: "agente",
      pagina: 28,
      resumo: "Conhecimento, esperteza e lábia. Versátil e habilidoso.",
      pvInicial: { base: 16, atributo: "vig" },
      pvPorNex: { base: 3, atributo: "vig" },
      peInicial: { base: 3, atributo: "pre" },
      pePorNex: { base: 3, atributo: "pre" },
      sanInicial: { base: 16, atributo: null },
      sanPorNex: { base: 4, atributo: null },
      pdInicial: { base: 8, atributo: "pre" },
      pdPorNex: { base: 4, atributo: "pre" },
      periciasEscolhaObrigatoria: [],
      periciasFixas: [],
      periciasLivres: { base: 7, atributo: "int" },
      proficiencias: ["Armas simples", "Proteções leves"],
      /* "igual a 5 + Int" — OPRPG p.30. */
      grauTreinamentoBase: 5,
    },
    {
      chave: "ocultista",
      nome: "Ocultista",
      perfil: "agente",
      pagina: 32,
      resumo: "Estudioso do paranormal, que domina rituais e os poderes do Outro Lado.",
      pvInicial: { base: 12, atributo: "vig" },
      pvPorNex: { base: 2, atributo: "vig" },
      peInicial: { base: 4, atributo: "pre" },
      pePorNex: { base: 4, atributo: "pre" },
      sanInicial: { base: 20, atributo: null },
      sanPorNex: { base: 5, atributo: null },
      pdInicial: { base: 10, atributo: "pre" },
      pdPorNex: { base: 5, atributo: "pre" },
      periciasEscolhaObrigatoria: [],
      periciasFixas: ["ocultismo", "vontade"],
      periciasLivres: { base: 3, atributo: "int" },
      proficiencias: ["Armas simples"],
      /* "igual a 3 + Int" — OPRPG p.34. */
      grauTreinamentoBase: 3,
      /* Escolhido pelo Outro Lado — OPRPG p.33. O círculo máximo que o
         ocultista consegue conjurar, por NEX. */
      circuloPorNex: [
        { nex: 5, circulo: 1 },
        { nex: 25, circulo: 2 },
        { nex: 55, circulo: 3 },
        { nex: 85, circulo: 4 },
      ],
    },

    /* -----------------------------------------------------------------
       PESSOAS COMUNS — antes de a Ordem aparecer
       -----------------------------------------------------------------
       Mundano (OPRPG p. 171-172) e Sobrevivente (SAH p. 30-32) NÃO têm
       NEX de agente: ficam em NEX 0% (ou nível 0, com NEX & Experiência).
       O Mundano não evolui — ao atingir NEX 5%, treina e vira agente. O
       Sobrevivente evolui em ESTÁGIOS, de 1 a 5, com incrementos fixos
       (não se soma Vigor nem Presença de novo a cada estágio).

       `perfil` separa os dois de um agente; ninguém vira Mundano ou
       Sobrevivente só por estar em NEX 0%: um combatente com NEX de
       exposição 0% (NEX & Experiência) continua combatente.
       ----------------------------------------------------------------- */
    {
      chave: "mundano",
      nome: "Mundano",
      perfil: "mundano",
      pagina: 171,
      resumo: "Uma pessoa comum, de NEX 0%, sem treinamento da Ordem. Compensa com Empenho; ao atingir NEX 5%, treina e vira agente.",
      pvInicial: { base: 8, atributo: "vig" },
      peInicial: { base: 1, atributo: "pre" },
      sanInicial: { base: 8, atributo: null },
      /* O livro não traz pontos de determinação para o Mundano (SAH
         p. 104 só lista as três classes e o Sobrevivente). */
      pdInicial: null,
      periciasEscolhaObrigatoria: [],
      periciasFixas: [],
      periciasLivres: { base: 1, atributo: "int" },
      proficiencias: ["Armas simples"],
      limitePe: 1,
    },
    {
      chave: "sobrevivente",
      nome: "Sobrevivente",
      perfil: "sobrevivente",
      pagina: 30,
      fonte: SAH,
      resumo: "Uma pessoa comum diante do horror, de NEX 0%, que evolui em estágios de 1 a 5: Empenho, trilha, aumento de atributo e Cicatrizado.",
      pvInicial: { base: 8, atributo: "vig" },
      peInicial: { base: 2, atributo: "pre" },
      sanInicial: { base: 8, atributo: null },
      /* "A cada novo estágio": valores FIXOS, sem atributo. */
      pvPorEstagio: 2,
      pePorEstagio: 1,
      sanPorEstagio: 2,
      /* SAH p. 104: "Sobrevivente. PD Iniciais: 4 + Pre. A cada novo
         estágio: 2." */
      pdInicial: { base: 4, atributo: "pre" },
      pdPorEstagio: 2,
      periciasEscolhaObrigatoria: [],
      periciasFixas: [],
      periciasLivres: { base: 1, atributo: "int" },
      proficiencias: ["Armas simples"],
      /* "Seu limite de PE é sempre 1, em qualquer estágio. Entretanto,
         você sempre pode usar pelo menos uma habilidade em seu custo
         mínimo por turno" (SAH p. 31). */
      limitePe: 1,
    },
  ];

  /* A geração de atributos de quem ainda não é agente: "começa com cada
     atributo em 1. Porém, por não ter passado pelo treinamento de
     agente, recebe apenas 3 pontos para distribuir, em vez de 4. Você
     ainda pode reduzir um único atributo para 0 para receber 1 ponto
     adicional" (OPRPG p. 171; SAH p. 30). O teto inicial é o de sempre. */
  var GERACAO_ATRIBUTOS_COMUM = {
    inicial: 1,
    pontos: 3,
    maximoInicial: 3,
    reducoesPermitidas: 1,
    pontoPorReducao: 1,
    fonte: OPRPG, pagina: 171,
  };

  /* SAH p. 31, Tabela 1.2. */
  var ESTAGIOS_SOBREVIVENTE = [
    { estagio: 1, rotulos: ["Empenho"] },
    { estagio: 2, rotulos: ["Trilha (1ª habilidade)"] },
    { estagio: 3, rotulos: ["Aumento de atributo"] },
    { estagio: 4, rotulos: ["Trilha (2ª habilidade)"] },
    { estagio: 5, rotulos: ["Cicatrizado"] },
  ];
  var ESTAGIO_MAXIMO = 5;

  /* As trilhas do Sobrevivente (SAH p. 31-32). Não são trilhas de
     agente: ficam fora de TRILHAS e são escolhidas no 2º estágio. */
  var TRILHAS_SOBREVIVENTE = [
    { chave: "durao", nome: "Durão", pagina: 31, fonte: SAH,
      resumo: "Resistente, defende a si mesmo e aos outros: atleta, segurança, trabalhador da construção civil.",
      habilidades: ["durao", "pancadaForte"] },
    { chave: "esperto", nome: "Esperto", pagina: 32, fonte: SAH,
      resumo: "Conhecimento, inteligência e persuasão: estudante, técnico, engenheiro.",
      habilidades: ["esperto", "entendido"] },
    { chave: "esoterico", nome: "Esotérico", pagina: 32, fonte: SAH,
      resumo: "Ligado a aspectos espirituais — religião, astrologia, cartomancia — ou com um sexto sentido para o Outro Lado.",
      habilidades: ["esoterico", "iniciado"] },
  ];

  /* =================================================================
     VIRAR AGENTE
     -----------------------------------------------------------------
     As duas transições são DIFERENTES, e nenhuma é uma conversão
     genérica:

     Mundano — "Atingindo NEX 5%" (OPRPG p. 172): 1 ponto de atributo
     (sem passar de 3) e os ganhos da classe escolhida. Somados ao
     Mundano, dão exatamente os valores de um agente novato.

     Sobrevivente — "Treinamento Especial" (SAH p. 32): no lugar da
     próxima subida de estágio, vira NEX 5% da classe, com ganhos
     MENORES, sem ponto de atributo, e mantém tudo o que já tinha.
     ================================================================= */

  var TRANSICOES = {
    mundano: {
      pagina: 172, fonte: OPRPG, titulo: "Atingindo NEX 5%",
      atributo: { pontos: 1, maximo: 3 },
      preservaHabilidades: false,
      classes: {
        combatente: { pv: 12, pe: 1, san: 4,
          pericias: { pares: [["fortitude", "reflexos"], ["luta", "pontaria"]], fixas: [], livres: 0 },
          proficiencias: ["Armas táticas", "Proteções leves"], habilidades: ["Ataque Especial"] },
        especialista: { pv: 8, pe: 2, san: 8,
          pericias: { pares: [], fixas: [], livres: 6 },
          proficiencias: ["Proteções leves"], habilidades: ["Eclético", "Perito"] },
        ocultista: { pv: 4, pe: 3, san: 12,
          pericias: { pares: [], fixas: ["ocultismo", "vontade"], livres: 2 },
          proficiencias: [], habilidades: ["Escolhido pelo Outro Lado"] },
      },
    },
    sobrevivente: {
      pagina: 32, fonte: SAH, titulo: "Treinamento Especial",
      atributo: null,
      preservaHabilidades: true,
      classes: {
        combatente: { pv: 8, pe: 0, san: 0,
          pericias: { pares: [["fortitude", "reflexos"], ["luta", "pontaria"]], fixas: [], livres: 0 },
          proficiencias: ["Armas táticas", "Proteções leves"], habilidades: ["Ataque Especial"] },
        especialista: { pv: 4, pe: 1, san: 4,
          pericias: { pares: [], fixas: [], livres: 6 },
          proficiencias: ["Proteções leves"], habilidades: ["Eclético", "Perito"] },
        ocultista: { pv: 0, pe: 2, san: 8,
          pericias: { pares: [], fixas: ["ocultismo", "vontade"], livres: 2 },
          proficiencias: [], habilidades: ["Escolhido pelo Outro Lado"] },
      },
    },
  };

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
      { nex: 40, rotulos: ["Habilidade de trilha"], escolhas: [] },
      { nex: 45, rotulos: ["Poder de combatente"], escolhas: ["poderClasse"] },
      { nex: 50, rotulos: ["Aumento de atributo", "Versatilidade"], escolhas: ["atributo", "versatilidade"] },
      { nex: 55, rotulos: ["Ataque especial (4 PE, +15)"], escolhas: [] },
      { nex: 60, rotulos: ["Poder de combatente"], escolhas: ["poderClasse"] },
      { nex: 65, rotulos: ["Habilidade de trilha"], escolhas: [] },
      { nex: 70, rotulos: ["Grau de treinamento"], escolhas: ["grauTreinamento"] },
      { nex: 75, rotulos: ["Poder de combatente"], escolhas: ["poderClasse"] },
      { nex: 80, rotulos: ["Aumento de atributo"], escolhas: ["atributo"] },
      { nex: 85, rotulos: ["Ataque especial (5 PE, +20)"], escolhas: [] },
      { nex: 90, rotulos: ["Poder de combatente"], escolhas: ["poderClasse"] },
      { nex: 95, rotulos: ["Aumento de atributo"], escolhas: ["atributo"] },
      { nex: 99, rotulos: ["Habilidade de trilha"], escolhas: [] },
    ],
    especialista: [
      { nex: 5,  rotulos: ["Eclético", "Perito (2 PE, +1d6)"], escolhas: ["perito"] },
      { nex: 10, rotulos: ["Habilidade de trilha"], escolhas: ["trilha"] },
      { nex: 15, rotulos: ["Poder de especialista"], escolhas: ["poderClasse"] },
      { nex: 20, rotulos: ["Aumento de atributo"], escolhas: ["atributo"] },
      { nex: 25, rotulos: ["Perito (3 PE, +1d8)"], escolhas: [] },
      { nex: 30, rotulos: ["Poder de especialista"], escolhas: ["poderClasse"] },
      { nex: 35, rotulos: ["Grau de treinamento"], escolhas: ["grauTreinamento"] },
      { nex: 40, rotulos: ["Engenhosidade (veterano)", "Habilidade de trilha"], escolhas: [] },
      { nex: 45, rotulos: ["Poder de especialista"], escolhas: ["poderClasse"] },
      { nex: 50, rotulos: ["Aumento de atributo", "Versatilidade"], escolhas: ["atributo", "versatilidade"] },
      { nex: 55, rotulos: ["Perito (4 PE, +1d10)"], escolhas: [] },
      { nex: 60, rotulos: ["Poder de especialista"], escolhas: ["poderClasse"] },
      { nex: 65, rotulos: ["Habilidade de trilha"], escolhas: [] },
      { nex: 70, rotulos: ["Grau de treinamento"], escolhas: ["grauTreinamento"] },
      { nex: 75, rotulos: ["Engenhosidade (expert)", "Poder de especialista"], escolhas: ["poderClasse"] },
      { nex: 80, rotulos: ["Aumento de atributo"], escolhas: ["atributo"] },
      { nex: 85, rotulos: ["Perito (5 PE, +1d12)"], escolhas: [] },
      { nex: 90, rotulos: ["Poder de especialista"], escolhas: ["poderClasse"] },
      { nex: 95, rotulos: ["Aumento de atributo"], escolhas: ["atributo"] },
      { nex: 99, rotulos: ["Habilidade de trilha"], escolhas: [] },
    ],
    ocultista: [
      { nex: 5,  rotulos: ["Escolhido pelo Outro Lado (1º círculo)"], escolhas: [] },
      { nex: 10, rotulos: ["Habilidade de trilha"], escolhas: ["trilha"] },
      { nex: 15, rotulos: ["Poder de ocultista"], escolhas: ["poderClasse"] },
      { nex: 20, rotulos: ["Aumento de atributo"], escolhas: ["atributo"] },
      { nex: 25, rotulos: ["Escolhido pelo Outro Lado (2º círculo)"], escolhas: [] },
      { nex: 30, rotulos: ["Poder de ocultista"], escolhas: ["poderClasse"] },
      { nex: 35, rotulos: ["Grau de treinamento"], escolhas: ["grauTreinamento"] },
      { nex: 40, rotulos: ["Habilidade de trilha"], escolhas: [] },
      { nex: 45, rotulos: ["Poder de ocultista"], escolhas: ["poderClasse"] },
      { nex: 50, rotulos: ["Aumento de atributo", "Versatilidade"], escolhas: ["atributo", "versatilidade"] },
      { nex: 55, rotulos: ["Escolhido pelo Outro Lado (3º círculo)"], escolhas: [] },
      { nex: 60, rotulos: ["Poder de ocultista"], escolhas: ["poderClasse"] },
      { nex: 65, rotulos: ["Habilidade de trilha"], escolhas: [] },
      { nex: 70, rotulos: ["Grau de treinamento"], escolhas: ["grauTreinamento"] },
      { nex: 75, rotulos: ["Poder de ocultista"], escolhas: ["poderClasse"] },
      { nex: 80, rotulos: ["Aumento de atributo"], escolhas: ["atributo"] },
      { nex: 85, rotulos: ["Escolhido pelo Outro Lado (4º círculo)"], escolhas: [] },
      { nex: 90, rotulos: ["Poder de ocultista"], escolhas: ["poderClasse"] },
      { nex: 95, rotulos: ["Aumento de atributo"], escolhas: ["atributo"] },
      { nex: 99, rotulos: ["Habilidade de trilha"], escolhas: [] },
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
      /* "Para escolher esta trilha, você precisa ser treinado em
         Medicina" — OPRPG p.31. */
      requisitos: [{ tipo: "treinado", pericia: "medicina" }],
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

    /* --- Sobrevivendo ao Horror, p.15-29 ---
       As nove trilhas novas do suplemento. Os poderes delas estão em
       poderes.js, como os das trilhas do livro básico. */
    { chave: "agentesecreto", classe: "combatente", nome: "Agente Secreto", pagina: 15, fonte: SAH,
      resumo: "Agente de governo emprestado à Ordem: documentos que abrem portas e um sorriso que resolve.",
      poderes: [poder(10, "Carteirada", 15), poder(40, "O Sorriso", 16),
                poder(65, "Método Investigativo", 16), poder(99, "Multifacetado", 16)] },
    { chave: "cacador", classe: "combatente", nome: "Caçador", pagina: 16, fonte: SAH,
      resumo: "Decidiu não ser presa: estuda rastros e fraquezas do que espreita no escuro.",
      poderes: [poder(10, "Rastrear o Paranormal", 16), poder(40, "Estudar Fraquezas", 16),
                poder(65, "Atacar das Sombras", 17), poder(99, "Estudar a Presa", 17)] },
    { chave: "monstruoso", classe: "combatente", nome: "Monstruoso", pagina: 17, fonte: SAH,
      resumo: "Abre o próprio corpo às Entidades em troca de poder, e paga com a humanidade.",
      especial: "Usa a Progressão de NEX da regra NEX & Experiência mesmo sem a regra ligada; em NEX 75% fica permanentemente perturbado e perde o apoio da Ordem (SAH p.17-21).",
      poderes: [poder(10, "Ser Amaldiçoado", 17), poder(40, "Ser Macabro", 18),
                poder(65, "Ser Assustador", 19), poder(99, "Ser Aterrorizante", 20)] },
    { chave: "bibliotecario", classe: "especialista", nome: "Bibliotecário", pagina: 23, fonte: SAH,
      resumo: "Leitura obstinada que vira solução para situações desesperadoras.",
      poderes: [poder(10, "Conhecimento Prático", 23), poder(40, "Leitor Contumaz", 23),
                poder(65, "Rato de Biblioteca", 23), poder(99, "A Força do Saber", 23)] },
    { chave: "perseverante", classe: "especialista", nome: "Perseverante", pagina: 24, fonte: SAH,
      resumo: "O último sobrevivente do filme de terror: nunca desiste e sempre acha uma saída.",
      poderes: [poder(10, "Soluções Improvisadas", 24), poder(40, "Fuga Obstinada", 24),
                poder(65, "Determinação Inquestionável", 24), poder(99, "Só Mais um Passo…", 24)] },
    { chave: "muambeiro", classe: "especialista", nome: "Muambeiro", pagina: 25, fonte: SAH,
      resumo: "Produz ou encontra o item certo para cada ocasião.",
      poderes: [poder(10, "Mascate", 25), poder(40, "Fabricação Própria", 25),
                poder(65, "Laboratório de Campo", 25), poder(99, "Achado Conveniente", 25)] },
    { chave: "exorcista", classe: "ocultista", nome: "Exorcista", pagina: 27, fonte: SAH,
      resumo: "A fé como escudo e as palavras como espada contra o paranormal.",
      poderes: [poder(10, "Revelação do Mal", 27), poder(40, "Poder da Fé", 27),
                poder(65, "Parareligiosidade", 27), poder(99, "Chagas da Resistência", 28)] },
    { chave: "possuido", classe: "ocultista", nome: "Possuído", pagina: 28, fonte: SAH,
      resumo: "O paranormal cresce por dentro e oferece poder em troca de obediência.",
      poderes: [poder(10, "Poder Não Desejado", 28), poder(40, "As Sombras Dentro de Mim", 28),
                poder(65, "Ele Me Ensina", 28), poder(99, "Tornamo-nos Um", 28)] },
    { chave: "parapsicologo", classe: "ocultista", nome: "Parapsicólogo", pagina: 29, fonte: SAH,
      resumo: "Usa o estudo da mente para curar o que o Outro Lado perturba.",
      /* "Para escolher esta trilha, você precisa ser treinado em
         Profissão (psicólogo)" — SAH p.29. O R.A.M.A. tem uma perícia
         Profissão só; o requisito confere o treinamento nela. */
      requisitos: [{ tipo: "treinado", pericia: "profissao" }],
      requisitoNota: "O livro pede Profissão (psicólogo). A ficha confere o treinamento em Profissão; a especialidade é conferida pela mesa.",
      poderes: [poder(10, "Terapia", 29), poder(40, "Palavras-chave", 29),
                poder(65, "Reprogramação Mental", 29), poder(99, "A Sanidade Está Lá Fora", 29)] },
  ];

  /* =================================================================
     ORIGENS — OPRPG p.16-21
     -----------------------------------------------------------------
     Cada origem dá duas perícias treinadas e um poder.

     `efeito` só existe nas origens cujo poder é numérico, permanente e
     calculável na ficha — essas entram na conta. `escolha` marca as
     origens cujo poder pede uma decisão (Traços do Outro Lado,
     Ferramentas Favoritas), que vira vaga na Progressão.

     As demais têm poderes que dependem de gastar PE, de uma cena, de uma
     rolagem de dano de arma ou de decisão do mestre, e são informativas
     por natureza, não por preguiça.
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
      periciasObservacao: "Profissão (cozinheiro).", especialidades: { profissao: "cozinheiro" },
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
      /* O poder paranormal de Traços do Outro Lado é uma escolha: a
         ficha abre a vaga dela na Progressão. */
      escolha: { chave: "poder", tipo: "poderParanormal", rotulo: "Poder paranormal de Traços do Outro Lado" },
      resumo: "Você tem um poder paranormal à sua escolha, mas começa com METADE da Sanidade normal da sua classe." },

    { chave: "desgarrado", nome: "Desgarrado", pagina: 18,
      pericias: ["fortitude", "sobrevivencia"],
      poder: "Calejado", automacao: "calculo",
      efeito: { tipo: "pvPorNex", valor: 1 },
      resumo: "+1 PV para cada 5% de NEX." },

    { chave: "engenheiro", nome: "Engenheiro", pagina: 18,
      pericias: ["profissao", "tecnologia"],
      poder: "Ferramentas Favoritas", automacao: "calculo",
      escolha: { chave: "item", tipo: "item", excetoArmas: true, rotulo: "Item de Ferramentas Favoritas" },
      efeitoEscolha: { tipo: "categoriaItem", opcao: "item", reducao: 1 },
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
      /* O +2 vale na rolagem de dano da arma. A ficha de Ordem ainda não
         rola dano de arma pelas regras de Ordem, então isto é anotação. */
      poder: "Mão Pesada", automacao: "informacao",
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
      /* Idem: vale na rolagem de dano com arma de fogo. */
      poder: "Para Bellum", automacao: "informacao",
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

    /* -----------------------------------------------------------------
       SOBREVIVENDO AO HORROR v1.2, p. 7-13 (Tabela 1.1, p. 12)
       -----------------------------------------------------------------
       Material oficial — as 10 "origens da comunidade" também: o livro
       as publica, com o crédito de quem criou (`comunidade`).

       Campos novos, todos opcionais, lidos pela criação, pela
       biblioteca, pelo cartão da habilidade e pela camada de cálculo:
         especialidades   a especialidade da perícia concedida
                          ({ profissao: "cozinheiro" })
         efeitos          efeitos permanentes objetivos, sem escolha
         escolhas         o que o poder pede para decidir (vaga
                          b.origem.<chave> na Progressão); `nexMinimo`
                          adia uma opção até o marco
         efeitosEscolha   efeitos que dependem do que foi escolhido
         acoesNoTeste     "gaste PE para…" oferecido no resultado de um
                          teste daquelas perícias, sempre por clique
         substituicoes    usar uma perícia no lugar de outra, numa
                          situação: oferecido no resultado da outra
         controles        o cartão da origem ganha botões próprios
                          (js/paginas/ficha-origens.js)
       ----------------------------------------------------------------- */

    { chave: "amigoDosAnimais", nome: "Amigo dos Animais", fonte: SAH, pagina: 7, comunidade: "Gabriela “Louie” · Arsenal Paranormal",
      pericias: ["adestramento", "percepcao"],
      poder: "Companheiro Animal", automacao: "parcial", controles: true,
      resumo: "Entende intenções e sentimentos de animais e pode usar Adestramento para mudar a atitude deles. Tem um melhor amigo animal: um aliado que dá +2 numa perícia à sua escolha (aprovada pelo mestre). Em NEX 35%, ele também dá o bônus de um tipo de aliado à sua escolha; em NEX 70%, a habilidade desse tipo. Se ele morrer, você perde 10 de Sanidade permanente e fica perturbado até o fim da cena.",
      escolhas: [
        { chave: "pericia", tipo: "pericia", rotulo: "Perícia do bônus do companheiro (+2, aprovada pelo mestre)" },
        { chave: "companheiro", tipo: "texto", opcional: true, rotulo: "Nome e espécie do companheiro", limite: 80 },
        { chave: "aliado", tipo: "texto", nexMinimo: 35, rotulo: "Tipo de aliado do companheiro (NEX 35%, aprovado pelo mestre)", dica: "o tipo de aliado da regra de aliados", limite: 60 },
      ],
      efeitosEscolha: [{ tipo: "bonusPericia", opcao: "pericia", valor: 2, seNao: "companheiroPerdido" }],
      nota: "O +2 do companheiro entra na conta enquanto ele estiver vivo. O bônus e a habilidade do tipo de aliado (NEX 35% e 70%) são aplicados pela mesa." },

    { chave: "astronauta", nome: "Astronauta", fonte: SAH, pagina: 8,
      pericias: ["ciencias", "fortitude"],
      poder: "Acostumado ao Extremo", automacao: "parcial", controles: true,
      resumo: "Ao sofrer dano de fogo, de frio ou mental, gaste 1 PE para reduzir esse dano em 5. A cada uso de novo na mesma cena, o custo aumenta em +1 PE.",
      nota: "A ficha conta os usos da cena e cobra o custo certo; a redução é aplicada por você no dano." },

    { chave: "chefDoOutroLado", nome: "Chef do Outro Lado", fonte: SAH, pagina: 8, comunidade: "Julie Sathler · Ateliê Secreto",
      pericias: ["ocultismo", "profissao"], especialidades: { profissao: "cozinheiro" },
      periciasObservacao: "Ocultismo e Profissão (cozinheiro).",
      poder: "Fome do Outro Lado", automacao: "parcial", controles: true,
      resumo: "Partes de criaturas do Outro Lado viram ingredientes (itens de categoria I, 0,5 espaço; pedidos no início da missão ou tirados de criaturas derrotadas — uma por criatura Pequena ou maior). No interlúdio, 1 ingrediente e um teste de Profissão (cozinheiro) DT 15 + 1 dado, oculto pelo mestre, preparam um prato: se passou, RD 10 contra o dano do elemento da criatura; se não, vulnerabilidade a ele, até o fim da próxima cena. Cada refeição custa 1 de Sanidade permanente e, com NEX & Experiência, cada parte de criatura diferente dá +3% de NEX.",
      nota: "Ingrediente, preparo, prato e refeição são passos separados, cada um por clique. O resultado do teste fica com o mestre." },

    { chave: "colegial", nome: "Colegial", fonte: SAH, pagina: 9,
      pericias: ["atualidades", "tecnologia"],
      poder: "Poder da Amizade", automacao: "parcial", controles: true,
      resumo: "Escolha um personagem como melhor amigo. Em alcance médio dele, podendo ao menos trocar olhares, você recebe +2 em todos os testes de perícia. Se ele morrer, seu total de PE cai 1 para cada 5% de NEX até o fim da missão; na missão seguinte você pode escolher outro.",
      escolhas: [{ chave: "amigo", tipo: "texto", rotulo: "Melhor amigo (personagem)", limite: 80 }],
      nota: "O +2 só vale com o amigo por perto: um botão o ativa como efeito, e ele sai quando você encerra." },

    { chave: "cosplayer", nome: "Cosplayer", fonte: SAH, pagina: 9, comunidade: "Rafael “Damnu” e Victor Moda · Toca dos Monstros",
      pericias: ["artes", "vontade"],
      poder: "Não É Fantasia, É Cosplay!", automacao: "parcial", controles: true,
      resumo: "Faz testes de disfarce com Artes em vez de Enganação. Usando um cosplay relacionado ao teste, recebe +2 nele (vestido de um gato agente secreto, +2 para ser furtivo e se equilibrar).",
      substituicoes: [{ de: "enganacao", para: "artes", rotulo: "Disfarce: usar Artes", condicao: "Só em testes de disfarce." }],
      nota: "O +2 do cosplay entra como efeito, nas perícias que você indicar, enquanto estiver com a fantasia." },

    { chave: "diplomata", nome: "Diplomata", fonte: SAH, pagina: 9,
      pericias: ["atualidades", "diplomacia"],
      poder: "Conexões", automacao: "parcial",
      resumo: "+2 em Diplomacia. Podendo contatar um NPC capaz de ajudar, gaste 10 minutos e 2 PE para trocar um teste de perícia ligada ao conhecimento dele, feito até o fim da cena, por um teste de Diplomacia.",
      efeitos: [{ tipo: "bonusPericia", pericias: ["diplomacia"], valor: 2 }],
      nota: "O +2 em Diplomacia entra na conta. A troca pelo contato é decidida na cena." },

    { chave: "explorador", nome: "Explorador", fonte: SAH, pagina: 9, comunidade: "Guilherme “Guirassol” e João Vitor “Vapor” · Arquivo do Medo",
      pericias: ["fortitude", "sobrevivencia"],
      poder: "Manual do Sobrevivente", automacao: "parcial",
      resumo: "Para resistir a armadilhas, clima, doenças, fome, sede, fumaça, sono, sufocamento ou veneno (inclusive paranormais), gaste 2 PE para receber +5 no teste. No interlúdio, sono precário conta como normal.",
      acoesNoTeste: [{ id: "manual", rotulo: "Manual do Sobrevivente", pericias: ["fortitude", "reflexos", "vontade"], custo: 2, tipo: "bonus", valor: 5,
        condicao: "Só para resistir a armadilhas, clima, doenças, fome, sede, fumaça, sono, sufocamento ou veneno." }] },

    { chave: "experimento", nome: "Experimento", fonte: SAH, pagina: 9,
      pericias: ["atletismo", "fortitude"],
      poder: "Mutação", automacao: "calculo",
      resumo: "Resistência a dano 2 e +2 numa perícia à sua escolha originalmente baseada em Força, Agilidade ou Vigor. Em troca, sofre –1 dado em Diplomacia.",
      efeitos: [{ tipo: "resistenciaDano", dano: "geral", valor: 2 }, { tipo: "dadosPericia", pericias: ["diplomacia"], valor: -1 }],
      escolhas: [{ chave: "pericia", tipo: "pericia", atributosOriginais: ["for", "agi", "vig"], rotulo: "Perícia da Mutação (+2; originalmente de Força, Agilidade ou Vigor)" }],
      efeitosEscolha: [{ tipo: "bonusPericia", opcao: "pericia", valor: 2 }] },

    { chave: "fanaticoPorCriaturas", nome: "Fanático por Criaturas", fonte: SAH, pagina: 10, comunidade: "Everson “Akkiel” e Yasmim Furtado · Grimório Paranormal",
      pericias: ["investigacao", "ocultismo"],
      poder: "Conhecimento Oculto", automacao: "parcial", controles: true,
      resumo: "Faz testes de Ocultismo para identificar criatura a partir de imagens, rastros, indícios ou pistas que o mestre aceite: passando, descobre as características dela, mas não a identidade. Passando num teste de Ocultismo para identificar criatura, recebe +2 em todos os testes contra ela até o fim da missão.",
      nota: "O +2 vale só contra a criatura identificada: a ficha registra a criatura e o prazo, e o bônus é somado no teste contra ela." },

    { chave: "fotografo", nome: "Fotógrafo", fonte: SAH, pagina: 10,
      pericias: ["artes", "percepcao"],
      poder: "Através da Lente", automacao: "parcial",
      resumo: "Em teste de Investigação ou Percepção para achar pistas olhando por uma câmera ou analisando fotos, gaste 2 PE para receber +5. Quem se move olhando pela lente anda metade do deslocamento.",
      acoesNoTeste: [{ id: "lente", rotulo: "Através da Lente", pericias: ["investigacao", "percepcao"], custo: 2, tipo: "bonus", valor: 5,
        condicao: "Só procurando pistas por uma câmera ou em fotos." }] },

    { chave: "inventorParanormal", nome: "Inventor Paranormal", fonte: SAH, pagina: 10, comunidade: "Bruno Sargi · C.R.I.S.",
      pericias: ["profissao", "vontade"], especialidades: { profissao: "engenheiro" },
      periciasObservacao: "Profissão (engenheiro) e Vontade.",
      poder: "Invenção Paranormal", automacao: "parcial", controles: true,
      resumo: "Escolha um ritual de 1º círculo: você tem um invento paranormal (item de categoria 0, 1 espaço) que executa o efeito dele. Ativar custa uma ação padrão (ou a do ritual, se maior) e um teste de Profissão (engenheiro) DT 15, +5 por ativação na mesma missão: passando, é como conjurar a forma básica sem pagar PE; falhando, enguiça. Uma ação de interlúdio conserta e volta a DT a 15. O ritual pode ser trocado no início de cada missão.",
      escolhas: [{ chave: "ritual", tipo: "ritualCatalogo", circulo: 1, rotulo: "Ritual do invento (1º círculo)" }],
      nota: "O ritual do invento NÃO é um ritual aprendido: fica preso ao invento, não entra na aba Rituais e não conta em limite nenhum." },

    { chave: "jovemMistico", nome: "Jovem Místico", fonte: SAH, pagina: 11, comunidade: "Ramon “PlayRay” e João “Portill” · A Passagem",
      pericias: ["ocultismo", "religiao"],
      poder: "A Culpa é das Estrelas", automacao: "parcial", controles: true,
      resumo: "Escolha um número da sorte de 1 a 6. No início de cada cena, gaste 1 PE e role 1d6: se sair um número da sorte, +2 em testes de perícia até o fim da cena; se não, na próxima vez escolha mais um número. Quando rolar um número da sorte, a quantidade volta a 1.",
      escolhas: [{ chave: "numero", tipo: "escolha", valores: ["1", "2", "3", "4", "5", "6"], rotulo: "Número da sorte" }],
      nota: "Os números acumulados ficam gravados na ficha; recarregar não os reinicia." },

    { chave: "legistaDoTurnoDaNoite", nome: "Legista do Turno da Noite", fonte: SAH, pagina: 11, comunidade: "Ivo “Eddu” e Ana Beatriz “Bix” · Arquivos Confidenciais",
      pericias: ["ciencias", "medicina"],
      poder: "Luto Habitual", automacao: "parcial",
      resumo: "Sofre metade do dano mental de cenas ligadas à rotina de um legista (uma morte, um cadáver, órgãos humanos — a critério do mestre). Em teste de Medicina para primeiros socorros ou necropsia, gaste 2 PE para receber +5.",
      acoesNoTeste: [{ id: "legista", rotulo: "Luto Habitual", pericias: ["medicina"], custo: 2, tipo: "bonus", valor: 5,
        condicao: "Só em primeiros socorros ou necropsia." }] },

    { chave: "mateiro", nome: "Mateiro", fonte: SAH, pagina: 12,
      pericias: ["percepcao", "sobrevivencia"],
      poder: "Mapa Celeste", automacao: "parcial",
      resumo: "Vendo o céu, sabe os pontos cardeais e chega sem se perder a qualquer lugar em que já esteve. Em teste de Sobrevivência, gaste 2 PE para rolar de novo e ficar com o melhor. No interlúdio, sono precário conta como normal.",
      acoesNoTeste: [{ id: "mapa", rotulo: "Mapa Celeste", pericias: ["sobrevivencia"], custo: 2, tipo: "rerrolar", condicao: "" }] },

    { chave: "mergulhador", nome: "Mergulhador", fonte: SAH, pagina: 12,
      pericias: ["atletismo", "fortitude"],
      poder: "Fôlego de Nadador", automacao: "parcial",
      resumo: "+5 PV e prende a respiração por rodadas iguais ao dobro do Vigor. Passando em Atletismo para natação, avança o deslocamento normal (não a metade).",
      efeitos: [{ tipo: "pvFixo", valor: 5 }],
      nota: "Os +5 PV entram na conta. Fôlego e natação são aplicados na cena." },

    { chave: "motorista", nome: "Motorista", fonte: SAH, pagina: 13,
      pericias: ["pilotagem", "reflexos"],
      poder: "Mãos no Volante", automacao: "parcial",
      resumo: "Sem penalidade em ataques por estar num veículo em movimento. Pilotando, em teste de Pilotagem ou de resistência, gaste 2 PE para receber +5.",
      acoesNoTeste: [{ id: "volante", rotulo: "Mãos no Volante", pericias: ["pilotagem", "fortitude", "reflexos", "vontade"], custo: 2, tipo: "bonus", valor: 5,
        condicao: "Só pilotando." }] },

    { chave: "nerdEntusiasta", nome: "Nerd Entusiasta", fonte: SAH, pagina: 13, comunidade: "Daniel Dill e Lukas Castanho · Remate Paranormal",
      pericias: ["ciencias", "tecnologia"],
      poder: "O Inteligentão", automacao: "informacao",
      resumo: "O bônus da ação de interlúdio ler aumenta em +1 dado (de +1d6 para +2d6)." },

    { chave: "profetizado", nome: "Profetizado", fonte: SAH, pagina: 13,
      pericias: ["vontade"], periciasAEscolher: 1,
      periciasObservacao: "Vontade e mais uma à sua escolha, relacionada à sua premonição (a mesa confere).",
      poder: "Luta ou Fuga", automacao: "parcial", controles: true,
      resumo: "Você sabe como vai morrer: uma premonição, clara ou enigmática, da sua cena de morte (o mestre pode guardar detalhes em segredo). +2 em Vontade. Quando surge uma referência à premonição, recebe também +2 PE temporários até o fim da cena.",
      efeitos: [{ tipo: "bonusPericia", pericias: ["vontade"], valor: 2 }],
      escolhas: [{ chave: "premonicao", tipo: "texto", rotulo: "O que você sabe da premonição", dica: "só o que o personagem premuniu — detalhes secretos ficam com o mestre", limite: 200 }],
      nota: "O +2 em Vontade entra na conta. Os PE temporários chegam por um botão, quando a mesa reconhece a referência, e saem com a cena." },

    { chave: "psicologo", nome: "Psicólogo", fonte: SAH, pagina: 13, comunidade: "Luiz Giovane e Matheus Santana · Missões Ordem",
      pericias: ["intuicao", "profissao"], especialidades: { profissao: "psicólogo" },
      periciasObservacao: "Intuição e Profissão (psicólogo).",
      poder: "Terapia", automacao: "parcial", controles: true,
      resumo: "Usa Profissão (psicólogo) como Diplomacia. Uma vez por rodada, quando você ou um aliado em alcance curto falha num teste de resistência contra efeito que causa dano mental, gaste 2 PE para fazer um teste de Profissão (psicólogo) e usar esse resultado no lugar.",
      substituicoes: [{ de: "diplomacia", para: "profissao", rotulo: "Terapia: usar Profissão (psicólogo)", condicao: "" }] },

    { chave: "reporterInvestigativo", nome: "Repórter Investigativo", fonte: SAH, pagina: 13,
      pericias: ["atualidades", "investigacao"],
      poder: "Encontrar a Verdade", automacao: "parcial",
      resumo: "Usa Investigação no lugar de Diplomacia para persuadir e mudar atitude. Em teste de Investigação, gaste 2 PE para receber +5.",
      substituicoes: [{ de: "diplomacia", para: "investigacao", rotulo: "Encontrar a Verdade: usar Investigação", condicao: "Só para persuadir e mudar atitude." }],
      acoesNoTeste: [{ id: "verdade", rotulo: "Encontrar a Verdade", pericias: ["investigacao"], custo: 2, tipo: "bonus", valor: 5, condicao: "" }] },
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

  /* Categorias de item — OPRPG p.53. "Você pode escolher quantos itens
     quiser de categoria 0". Guardadas como número (0 a 4), mostradas em
     romano. */
  var CATEGORIAS_ITEM = [
    { valor: 0, rotulo: "0" },
    { valor: 1, rotulo: "I" },
    { valor: 2, rotulo: "II" },
    { valor: 3, rotulo: "III" },
    { valor: 4, rotulo: "IV" },
  ];

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

  /* Afinidade — OPRPG p.110 e p.114: "Escolha um elemento entre
     Conhecimento, Energia, Morte ou Sangue." Medo não é opção. */
  var ELEMENTOS_AFINIDADE = ["conhecimento", "energia", "morte", "sangue"];

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
  function elemento(chave) { return POR_CHAVE.elementos[chave] || null; }

  /* "agente", "mundano" ou "sobrevivente". Sem classe, "". */
  function perfilDaClasse(chave) {
    var c = classe(chave);
    return c ? (c.perfil || "agente") : "";
  }

  function ehAgente(chave) { return perfilDaClasse(chave) === "agente"; }

  function classesDeAgente() {
    return CLASSES.filter(function (c) { return (c.perfil || "agente") === "agente"; });
  }

  function trilhaSobrevivente(chave) {
    return TRILHAS_SOBREVIVENTE.filter(function (t) { return t.chave === chave; })[0] || null;
  }

  /* Os efeitos permanentes de uma origem, na forma de lista (as do livro
     básico usam `efeito`, uma só). */
  function efeitosDaOrigem(org) {
    if (!org) return [];
    if (Array.isArray(org.efeitos)) return org.efeitos;
    return org.efeito ? [org.efeito] : [];
  }

  /* As opções que o poder da origem pede, até o marco alcançado. */
  function escolhasDaOrigem(org, nexEquivalente) {
    if (!org) return [];
    var lista = Array.isArray(org.escolhas) ? org.escolhas : (org.escolha ? [org.escolha] : []);
    return lista.filter(function (op) { return !op.nexMinimo || (nexEquivalente || 0) >= op.nexMinimo; });
  }

  function efeitosDaEscolhaDaOrigem(org) {
    if (!org) return [];
    if (Array.isArray(org.efeitosEscolha)) return org.efeitosEscolha;
    return org.efeitoEscolha ? [org.efeitoEscolha] : [];
  }

  /* "Profissão (cozinheiro)": o nome da perícia com a especialidade que
     a origem dá. */
  function nomeComEspecialidade(org, chavePericia) {
    var pe = pericia(chavePericia);
    var esp = org && org.especialidades ? org.especialidades[chavePericia] : "";
    return (pe ? pe.nome : chavePericia) + (esp ? " (" + esp + ")" : "");
  }

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
    GERACAO_ATRIBUTOS_COMUM: GERACAO_ATRIBUTOS_COMUM,
    ESTAGIOS_SOBREVIVENTE: ESTAGIOS_SOBREVIVENTE,
    ESTAGIO_MAXIMO: ESTAGIO_MAXIMO,
    TRILHAS_SOBREVIVENTE: TRILHAS_SOBREVIVENTE,
    TRANSICOES: TRANSICOES,
    PROGRESSAO: PROGRESSAO,
    TRILHAS: TRILHAS,
    ORIGENS: ORIGENS,
    PATENTES: PATENTES,
    CREDITOS: CREDITOS,
    CATEGORIAS_ITEM: CATEGORIAS_ITEM,
    ELEMENTOS: ELEMENTOS,
    ELEMENTOS_AFINIDADE: ELEMENTOS_AFINIDADE,
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
    elemento: elemento,
    trilhasDaClasse: trilhasDaClasse,
    progressaoDaClasse: progressaoDaClasse,
    perfilDaClasse: perfilDaClasse,
    efeitosDaOrigem: efeitosDaOrigem,
    escolhasDaOrigem: escolhasDaOrigem,
    efeitosDaEscolhaDaOrigem: efeitosDaEscolhaDaOrigem,
    nomeComEspecialidade: nomeComEspecialidade,
    ehAgente: ehAgente,
    classesDeAgente: classesDeAgente,
    trilhaSobrevivente: trilhaSobrevivente,
    referencia: referencia,
  };
})(typeof window !== "undefined" ? window : globalThis);
