/* R.A.M.A. — Tormenta20 · ameaças: Masmorras e Ermos (Livro Básico, p. 286–293).
   Formato em js/tormenta20/ameacas.js. Resumos do RAMA. */
RAMATormenta20Ameacas.def("glop", "Glop", "1/4", "masmorras", 286, {
  tipo: "monstro", tam: "pequeno", papel: "lacaio", ini: 0, per: 0, sentidos: ["percepção às cegas"], def: 10, fort: 0, ref: 2, von: -5, imune: ["acido"], pv: 10, desl: 9,
  ataques: [{ n: "Pancada", a: 7, d: "1d4", x: "1d4 acido", t: "I" }], atr: [0, 0, 0, null, -5, -5], tesouro: "nenhum",
}, "Gosma ácida que salta sobre matéria orgânica pelos corredores das masmorras.");
RAMATormenta20Ameacas.def("ratoGigante", "Rato Gigante", "1/4", "masmorras", 286, {
  tipo: "animal", tam: "pequeno", papel: "lacaio", ini: 5, per: 4, sentidos: ["faro", "visão na penumbra"], def: 12, fort: 0, ref: 3, von: -2, pv: 3, desl: 12, mov: { escalar: 6 },
  ataques: [{ n: "Mordida", a: 7, d: "1d4+3", t: "P", efeito: "doença (infecção do esgoto, p. 318)" }],
  habs: [{ n: "Doença", r: "Quem é mordido fica exposto à infecção do esgoto (p. 318)." }], atr: [0, 2, 1, -4, 1, -3], tesouro: "nenhum",
}, "Roedor do tamanho de um cão que vive em bandos em esgotos, porões e pântanos.");
RAMATormenta20Ameacas.def("orcCombatente", "Orc Combatente", "1/2", "masmorras", 286, {
  tipo: "humanoide", sub: "orc", tam: "medio", papel: "lacaio", ini: 4, per: 1, sentidos: ["visão no escuro"], def: 14, fort: 5, ref: 3, von: 0, pv: 8, desl: 9,
  ataques: [{ n: "Maça", a: 9, d: "1d8+7", t: "I" }],
  habs: [{ n: "Sensibilidade a Luz", r: "Sob luz do sol ou similar, fica ofuscado." }], atr: [4, 1, 2, -1, -1, -1], equip: "Couro batido, maça.", tesouro: "metade",
}, "Guerreiro brutal de bando, sensível à luz do sol.");
RAMATormenta20Ameacas.def("orcChefe", "Orc Chefe", "2", "masmorras", 286, {
  tipo: "humanoide", sub: "orc", tam: "medio", papel: "solo", ini: 5, per: 3, sentidos: ["visão no escuro"], def: 19, fort: 13, ref: 7, von: 2, pv: 66, desl: 9,
  ataques: [{ n: "Machado de batalha", a: 11, d: "1d8+12", c: 3, t: "C" }],
  habs: [{ n: "Urro Selvagem", acao: "movimento", r: "+2 em ataques e dano corpo a corpo até o fim da cena, mas não faz ações que exijam calma e concentração.", efeito: { ataque: 2, dano: 2, duracao: "cena" } }, { n: "Sensibilidade a Luz", r: "Sob luz do sol ou similar, fica ofuscado." }],
  atr: [5, 2, 4, 0, 0, 0], pericias: { intimidacao: 4, sobrevivencia: 5 }, equip: "Gibão de peles, machado de batalha.", tesouro: "padrao",
}, "Líder que mantém a tribo pela força.");
RAMATormenta20Ameacas.def("orcMutante", "Orc Mutante", "5", "masmorras", 286, {
  tipo: "humanoide", sub: "orc", tam: "medio", papel: "lacaio", ini: 8, per: 5, sentidos: ["visão no escuro"], def: 22, fort: 15, ref: 11, von: 7, pv: 55, desl: 9,
  ataques: [{ n: "Machado de guerra", a: 20, d: "1d12+18", c: 3, t: "C" }, { n: "Mordida", a: 20, d: "1d6+18", t: "P" }],
  habs: [{ n: "Terceiro Braço", acao: "livre", r: "Se acertar o machado e a mordida na mesma criatura na rodada, causa mais 1d6+9 de corte.", dano: "1d6+9", tipoDano: "corte" }, { n: "Sensibilidade a Luz", r: "Sob luz do sol ou similar, fica ofuscado." }],
  atr: [6, 2, 4, -2, -2, -2], equip: "Machado de guerra.", tesouro: "padrao",
}, "Orc deformado com um terceiro braço degenerado.");
RAMATormenta20Ameacas.def("aranhaGigante", "Aranha Gigante", "2", "masmorras", 287, {
  tipo: "monstro", tam: "grande", papel: "solo", ini: 7, per: 3, sentidos: ["visão no escuro"], def: 19, fort: 8, ref: 11, von: 3, pv: 77, desl: 12, mov: { escalar: 12 },
  ataques: [{ n: "Mordida", a: 12, d: "2d6+8", t: "P", efeito: "veneno: fraco (Fort CD 18 evita)" }],
  habs: [{ n: "Teia", acao: "padrao", r: "Quadrado de 3 m em alcance curto: enredado (Ref CD 18 evita). Soltar: ação completa e Força ou Acrobacia CD 20, ou cortar (5 PV, RD 5 por 1,5 m). Fogo queima em 2 rodadas (1d6 por rodada a quem está nela). Também cobre uma área de 6 m quase invisível (Percepção CD 20); percebe tudo na própria teia.", cd: 18, res: "reflexos", condicao: "enredado" }, { n: "Veneno", r: "Fraco (Fort CD 18 evita).", cd: 18, res: "fortitude", condicao: "fraco" }],
  atr: [5, 4, 1, -5, 0, -4], pericias: { furtividade: 9 }, tesouro: "1d4 doses de veneno de aranha gigante (CD 17 para extrair, T$ 45 cada)",
}, "Aranha do tamanho de um cavalo que prende vítimas com teia e as paralisa com veneno.");
RAMATormenta20Ameacas.def("gargula", "Gárgula", "2", "masmorras", 287, {
  tipo: "construto", tam: "medio", papel: "solo", ini: 3, per: 3, sentidos: ["visão no escuro"], def: 19, fort: 13, ref: 7, von: 2, imune: ["petrificado"], rd: { geral: 5 }, pv: 65, desl: 12, mov: { voo: 18 },
  ataques: [{ n: "Garra", a: 12, d: "1d6+6", q: 2, t: "C" }],
  habs: [{ n: "Imobilidade", r: "Parada, passa por estátua (Percepção CD 35 percebe)." }], atr: [6, 2, 4, -2, 1, -2], tesouro: "padrao",
}, "Predador que finge ser estátua no alto de ruínas e mergulha com as garras.");
RAMATormenta20Ameacas.def("guerreiroDeChifres", "Guerreiro de Chifres", "3", "masmorras", 287, {
  tipo: "espirito", sub: "demônio", tam: "medio", papel: "solo", ini: 6, per: 3, sentidos: ["faro", "visão no escuro"], def: 21, fort: 13, ref: 11, von: 9, imune: ["acido", "veneno"], rd: { geral: 5, fogo: 10, frio: 10 }, pv: 100, desl: 9,
  ataques: [{ n: "Machado de guerra", a: 14, d: "1d12+16", c: 3, t: "C", grupo: "machado" }, { n: "Chifres", a: 14, d: "2d6+10", t: "I", grupo: "chifres" }],
  habs: [{ n: "Marrada", acao: "completa", r: "Investida atacando com machado e chifres no mesmo alvo, ambos com +2 da investida." }],
  atr: [5, 3, 4, -2, 1, -1], pericias: { atletismo: 8, intimidacao: 4 }, equip: "Machado de guerra cruel.", tesouro: "padrao",
}, "Demônio menor com cabeça de bode, convocado às vezes por arcanistas.");
RAMATormenta20Ameacas.def("manticora", "Mantícora", "6", "masmorras", 287, {
  tipo: "monstro", tam: "grande", papel: "solo", ini: 7, per: 8, sentidos: ["faro", "visão no escuro"], def: 26, fort: 18, ref: 7, von: 12, pv: 240, desl: 9, mov: { voo: 15 },
  ataques: [{ n: "Mordida", a: 18, d: "1d10+12", t: "P" }, { n: "Garra", a: 18, d: "1d8+12", q: 2, t: "C" }],
  habs: [{ n: "Espinhos", acao: "movimento", recarga: "movimento", r: "1d4 espinhos, cada um numa criatura em alcance médio: 1d8+7 de perfuração (Ref CD 22 reduz à metade).", cd: 22, res: "reflexos", dano: "1d8+7", tipoDano: "perfuracao" }],
  atr: [7, 2, 5, -2, 1, -1], tesouro: "padrao", recursos: "Espinhos (CD 21): T$ 150 em matéria-prima para flechas superiores.",
}, "Leão alado com rosto humano e cauda de espinhos.");
RAMATormenta20Ameacas.def("centopeiaDragao", "Centopeia-Dragão", "7", "masmorras", 287, {
  tipo: "monstro", tam: "enorme", papel: "solo", ini: 10, per: 8, sentidos: ["visão no escuro"], def: 27, fort: 20, ref: 14, von: 9, imune: ["caido"], rd: { fogo: 10 }, pv: 275, desl: 15, mov: { escavar: 6 },
  ataques: [{ n: "Mordida", a: 24, d: "2d8+18", x: "2d6 fogo", t: "P" }],
  habs: [{ n: "Agarrar Aprimorado", acao: "livre", r: "Ao acertar a mordida, pode agarrar (teste +29)." }, { n: "Aura de Calor", r: "Enfurecida, no início de cada turno dela todos em alcance curto sofrem 4d6+9 de fogo.", dano: "4d6+9", tipoDano: "fogo" }, { n: "Engolir", acao: "padrao", r: "Começando o turno agarrando uma criatura Média ou menor, vence um teste de agarrar e a engole: 2d6+18 de impacto mais 4d6+9 de fogo por turno. Uma por vez; escapa causando 20 de dano ao estômago (Defesa 10)." }],
  atr: [11, 3, 9, -4, 1, 0], tesouro: "2d4 doses de essência abissal (CD 22 para extrair)",
}, "Centopeia incandescente de dez metros que enche túneis com a bocarra.");
RAMATormenta20Ameacas.def("golemDeFerro", "Golem de Ferro", "10", "masmorras", 288, {
  tipo: "construto", tam: "grande", papel: "solo", ini: 4, per: 9, sentidos: ["visão no escuro"], def: 36, fort: 24, ref: 14, von: 11, rd: { geral: 10 }, imune: ["magia"], pv: 400, desl: 9,
  ataques: [{ n: "Pancada", a: 30, d: "2d10+25", q: 2, t: "I" }],
  habs: [{ n: "Imunidade a Magia", r: "Imune a efeitos mágicos, exceto: eletricidade mágica o deixa lento 1d6 rodadas; fogo mágico remove lento e cura 1 PV a cada 3 de dano." }, { n: "Sopro", acao: "movimento", recarga: "movimento", r: "Gás venenoso num cubo de 3 m: perde 6d12 PV e fica enjoado (Fort CD 30 reduz à metade e evita).", cd: 30, res: "fortitude", dano: "6d12", tipoDano: "perdaDeVida", condicao: "enjoado" }],
  atr: [12, -1, 10, null, 0, -5], tesouro: "nenhum",
}, "Guardião antigo e sem mente, quase invulnerável.");
RAMATormenta20Ameacas.def("bandido", "Bandido", "1/4", "ermos", 289, {
  tipo: "humanoide", sub: "humano", tam: "medio", papel: "lacaio", ini: 4, per: 1, def: 13, fort: 1, ref: 3, von: -1, pv: 6, desl: 9,
  ataques: [{ n: "Clava", a: 7, d: "1d6+3", t: "I" }], atr: [1, 2, 1, 0, -1, 0], pericias: { furtividade: 5 }, equip: "Clava.", tesouro: "metade",
}, "Salteador de estrada que embosca viajantes.");
RAMATormenta20Ameacas.def("chefeBandido", "Chefe Bandido", "1", "ermos", 289, {
  tipo: "humanoide", sub: "humano", tam: "medio", papel: "especial", ini: 4, per: 2, def: 16, fort: 5, ref: 8, von: 3, pv: 30, desl: 9,
  ataques: [{ n: "Espada curta", a: 9, d: "1d6+5", m: 19, t: "P" }, { n: "Adaga", a: 7, d: "1d4+3", m: 19, t: "P", dist: true, alc: "curto" }],
  habs: [{ n: "Ataque Furtivo", r: "Uma vez por rodada, +2d6 contra alvo desprevenido ou flanqueado (corpo a corpo ou à distância em alcance curto).", dano: "2d6" }],
  atr: [3, 2, 2, 0, 0, 1], pericias: { furtividade: 7, intimidacao: 6 }, equip: "Adaga, espada curta.", tesouro: "padrao",
}, "Líder de bando que ataca pelos flancos.");
RAMATormenta20Ameacas.def("guardaDeCidade", "Guarda de Cidade", "1/2", "ermos", 289, {
  tipo: "humanoide", sub: "humano", tam: "medio", papel: "lacaio", ini: 4, per: 3, def: 15, fort: 5, ref: 2, von: 1, pv: 8, desl: 9,
  ataques: [{ n: "Maça", a: 7, d: "1d8+5", t: "I" }], atr: [2, 1, 2, 0, 0, 0], pericias: { atletismo: 5 }, equip: "Apito, couro batido, maça.", tesouro: "nenhum",
}, "Miliciano de ruas e postos de fronteira.");
RAMATormenta20Ameacas.def("sargentoDaGuarda", "Sargento da Guarda", "1", "ermos", 289, {
  tipo: "humanoide", sub: "humano", tam: "medio", papel: "especial", ini: 5, per: 4, def: 17, fort: 9, ref: 4, von: 3, pv: 28, desl: 6,
  ataques: [{ n: "Maça", a: 10, d: "1d8+10", t: "I" }, { n: "Besta leve", a: 9, d: "1d8+5", m: 19, t: "P", dist: true, alc: "medio" }],
  habs: [{ n: "Ordens", acao: "movimento", r: "Aliados em alcance médio recebem +2 em testes de perícia até o fim da cena." }],
  atr: [3, 1, 2, 0, 0, 1], pericias: { atletismo: 7, intuicao: 4 }, equip: "Apito, besta leve, cota de malha, maça, 20 virotes.", tesouro: "metade",
}, "Oficial que coordena a guarda com ordens.");
RAMATormenta20Ameacas.def("lobo", "Lobo", "1/2", "ermos", 290, {
  tipo: "animal", tam: "medio", papel: "lacaio", ini: 5, per: 6, sentidos: ["faro", "visão na penumbra"], def: 14, fort: 6, ref: 3, von: 1, pv: 14, desl: 15,
  ataques: [{ n: "Mordida", a: 7, d: "1d6+5", t: "P" }],
  habs: [{ n: "Derrubar", acao: "livre", r: "Ao acertar a mordida, pode derrubar (teste +7)." }, { n: "Táticas de Alcateia", r: "Flanqueando, +2 no ataque e no dano além do bônus normal." }],
  atr: [3, 3, 3, -4, 2, -2], pericias: { sobrevivencia: 6 }, tesouro: "nenhum",
}, "Caçador de alcateia que derruba a presa mordendo as pernas.");
RAMATormenta20Ameacas.def("centauroCombatente", "Centauro Combatente", "1", "ermos", 290, {
  tipo: "humanoide", sub: "centauro", tam: "grande", papel: "lacaio", ini: 3, per: 3, def: 16, fort: 9, ref: 2, von: 5, pv: 35, desl: 12,
  ataques: [{ n: "Tacape", a: 9, d: "1d12+5", t: "I" }, { n: "Cascos", a: 9, d: "1d8+5", t: "I" }, { n: "Arco longo", a: 7, d: "1d10+5", c: 3, t: "P", dist: true, alc: "medio" }],
  habs: [{ n: "Investida Poderosa", r: "Em investida com o tacape, +1d12 de dano.", dano: "1d12" }, { n: "Medo de Altura", r: "Adjacente a uma queda de 3 m ou mais, fica abalado." }],
  atr: [5, 2, 3, -2, 1, -2], pericias: { sobrevivencia: 5 }, equip: "Arco longo aumentado, 20 flechas, tacape aumentado.", tesouro: "metade",
}, "Caçador equino das planícies, desconfiado e territorial.");
RAMATormenta20Ameacas.def("centauroXama", "Centauro Xamã", "3", "ermos", 290, {
  tipo: "humanoide", sub: "centauro", tam: "grande", papel: "especial", ini: 4, per: 8, def: 21, fort: 9, ref: 4, von: 15, pv: 35, desl: 12, pm: 20,
  ataques: [{ n: "Bordão", a: 11, d: "1d8+4", t: "I" }, { n: "Cascos", a: 11, d: "1d8+4", t: "I" }],
  magias: { como: "clérigo de Allihanna de 3º nível", cd: 17, lista: [{ id: "armamentoDaNatureza", acao: "movimento", pm: 3, r: "Uma arma fica mágica e o dano sobe um passo (1d8 → 1d10)." }, { id: "controlarPlantas", acao: "padrao", pm: 2, r: "Quadrado de 9 m em alcance curto vira terreno difícil; quem está nele fica enredado e imóvel (Fortitude evita)." }, { id: "curarFerimentos", acao: "padrao", pm: 3, r: "Uma criatura adjacente cura 4d8+4 PV." }] },
  habs: [{ n: "Medo de Altura", r: "Adjacente a uma queda de 3 m ou mais, fica abalado." }, { n: "Voz da Natureza", r: "Sempre sob Voz Divina, só para falar com animais." }],
  atr: [4, 1, 3, -1, 4, 0], pericias: { religiao: 8, sobrevivencia: 10 }, equip: "Bordão aumentado, símbolo sagrado de Allihanna.", tesouro: "metade",
}, "Líder espiritual que guia bandos de centauros.");
RAMATormenta20Ameacas.def("gnollSaqueador", "Gnoll Saqueador", "1", "ermos", 290, {
  tipo: "humanoide", sub: "gnoll", tam: "medio", papel: "lacaio", ini: 5, per: 4, sentidos: ["faro"], def: 15, fort: 7, ref: 7, von: 1, pv: 15, desl: 9,
  ataques: [{ n: "Lança", a: 10, d: "1d6+4", t: "P" }, { n: "Mordida", a: 10, d: "1d6+4", t: "P" }, { n: "Arco curto", a: 9, d: "1d6+3", c: 3, t: "P", dist: true, alc: "medio" }],
  atr: [3, 2, 3, -2, 1, -1], equip: "Arco curto, 20 flechas, lança.", tesouro: "metade",
}, "Povo-hiena covarde que embosca em beira de estrada e honra a rendição.");
RAMATormenta20Ameacas.def("gnollFilibusteiro", "Gnoll Filibusteiro", "2", "ermos", 291, {
  tipo: "humanoide", sub: "gnoll", tam: "medio", papel: "solo", ini: 9, per: 4, sentidos: ["faro"], def: 19, fort: 7, ref: 11, von: 4, pv: 60, desl: 9,
  ataques: [{ n: "Espada curta", a: 11, d: "1d6+4", m: 19, t: "P" }, { n: "Mordida", a: 11, d: "1d6+4", t: "P" }, { n: "Mosquete", a: 12, d: "2d8+9", m: 19, c: 3, t: "P", dist: true, alc: "medio" }],
  habs: [{ n: "Recarga Rápida", r: "Recarrega o mosquete com ação de movimento." }],
  atr: [3, 4, 3, -1, 2, -1], equip: "20 balas, espada curta, mosquete.", tesouro: "padrao",
}, "Gnoll que aprendeu as armas de fogo da civilização.");
RAMATormenta20Ameacas.def("gorlogg", "Gorlogg", "1", "ermos", 291, {
  tipo: "animal", tam: "grande", papel: "lacaio", ini: 4, per: 3, sentidos: ["visão na penumbra"], def: 16, fort: 8, ref: 5, von: 3, pv: 36, desl: 12,
  ataques: [{ n: "Mordida", a: 9, d: "2d6+8", c: 3, t: "P" }],
  habs: [{ n: "Agarrar Aprimorado", acao: "livre", r: "Ao acertar a mordida, pode agarrar (teste +13)." }],
  atr: [5, 2, 5, -4, 1, -2], pericias: { atletismo: 9 }, tesouro: "nenhum",
}, "Fera de Galrasia, meio lobo, meio crocodilo, cobiçada como montaria.");
