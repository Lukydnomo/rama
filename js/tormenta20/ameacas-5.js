/* R.A.M.A. — Tormenta20 · ameaças: Sszzaazitas e Trolls nobres (Livro Básico, p. 304–308).
   Formato em js/tormenta20/ameacas.js. Resumos do RAMA. */
(function () {
  var D = RAMATormenta20Ameacas.def;
  var OFIDIAS = { n: "Fraquezas Ofídias", r: "+1 de dano por dado de frio; –5 nas resistências contra Músicas de Bardo." };
  var VEGETAL = { n: "Natureza Vegetal", r: "Afetado por habilidades e magias que afetam plantas." };
  var REGEN = { n: "Regeneração Vegetal", acao: "movimento", r: "Recupera 5 PV (não cura ácido nem fogo; não funciona sob luz do sol ou similar).", cura: 5 };
  var LUZ = { n: "Sensibilidade a Luz", r: "Sob luz do sol ou similar, fica ofuscado." };
  D("cascavel", "Cascavel", "1/4", "sszzaazitas", 304, {
    tipo: "animal", tam: "minusculo", papel: "lacaio", ini: 5, per: 3, sentidos: ["faro", "visão na penumbra"], def: 13, fort: 2, ref: 5, von: -1, pv: 2, desl: 6, mov: { escalar: 6, natacao: 9 },
    ataques: [{ n: "Mordida", a: 7, d: "1d4", t: "P", efeito: "veneno" }],
    habs: [{ n: "Veneno", r: "Perde 1d12 PV (Fort CD 16 evita).", cd: 16, res: "fortitude", dano: "1d12", tipoDano: "perdaDeVida" }],
    atr: [-2, 3, 0, -5, 0, -4], pericias: { furtividade: 12 }, tesouro: "1 dose de peçonha comum (CD 15)",
  }, "Cobra peçonhenta usada como armadilha pelos cultistas.");
  D("jiboia", "Jiboia", "1/2", "sszzaazitas", 304, {
    tipo: "animal", tam: "medio", papel: "lacaio", ini: 5, per: 3, sentidos: ["faro", "visão na penumbra"], def: 14, fort: 3, ref: 5, von: 0, pv: 14, desl: 6, mov: { escalar: 6, natacao: 9 },
    ataques: [{ n: "Mordida", a: 9, d: "1d6+4", t: "P" }],
    habs: [{ n: "Agarrar Aprimorado", acao: "livre", r: "Ao acertar a mordida, pode agarrar (teste +9)." }, { n: "Constrição", acao: "livre", r: "No início do turno dela, 2d6+4 de impacto em quem estiver agarrando.", dano: "2d6+4", tipoDano: "impacto" }],
    atr: [2, 3, 1, -5, 1, -4], pericias: { furtividade: 7 }, tesouro: "nenhum",
  }, "Serpente constritora.");
  D("naja", "Naja", "1", "sszzaazitas", 304, {
    tipo: "animal", tam: "pequeno", papel: "lacaio", ini: 8, per: 3, sentidos: ["faro", "visão na penumbra"], def: 17, fort: 5, ref: 10, von: 1, pv: 13, desl: 6, mov: { escalar: 6, natacao: 6 },
    ataques: [{ n: "Mordida", a: 12, d: "1d4", t: "P", efeito: "veneno" }],
    habs: [{ n: "Veneno", r: "Perde 1d12 PV por 3 rodadas (Fort CD 18 reduz para 1 rodada).", cd: 18, res: "fortitude", dano: "1d12", tipoDano: "perdaDeVida" }],
    atr: [-1, 4, 1, -5, 0, -4], pericias: { furtividade: 10 }, tesouro: "1 dose de peçonha concentrada (CD 16)",
  }, "Cobra de veneno potente, preferida para assassinatos.");
  D("sucuri", "Sucuri", "3", "sszzaazitas", 304, {
    tipo: "animal", tam: "grande", papel: "solo", ini: 5, per: 4, sentidos: ["faro", "visão na penumbra"], def: 19, fort: 9, ref: 15, von: 3, pv: 88, desl: 6, mov: { escalar: 9, natacao: 9 },
    ataques: [{ n: "Mordida", a: 18, d: "2d6+14", t: "P" }],
    habs: [{ n: "Agarrar Aprimorado", acao: "livre", r: "Ao acertar a mordida, pode agarrar (teste +20)." }, { n: "Constrição", acao: "livre", r: "No início do turno dela, 4d6+14 de impacto em quem estiver agarrando.", dano: "4d6+14", tipoDano: "impacto" }],
    atr: [6, 2, 4, -5, 1, -4], pericias: { furtividade: 8 }, tesouro: "nenhum",
  }, "Serpente gigante que esmaga a presa.");
  D("nagahGuardiao", "Nagah Guardião", "3", "sszzaazitas", 305, {
    tipo: "humanoide", sub: "nagah", tam: "medio", papel: "lacaio", ini: 6, per: 3, sentidos: ["visão na penumbra"], def: 21, fort: 6, ref: 11, von: 9, pv: 45, desl: 9, defesasTexto: "resistência a veneno +5",
    ataques: [{ n: "Cimitarra", a: 14, d: "1d6+6", m: 18, q: 2, t: "C" }, { n: "Cauda", a: 14, d: "1d6+6", t: "I" }],
    habs: [OFIDIAS], atr: [4, 3, 2, 0, 0, 0], pericias: { enganacao: 4, furtividade: 6 }, equip: "2 cimitarras.", tesouro: "padrao",
  }, "Guerreiro meio serpente a serviço dos cultos de Sszzaas.");
  D("nagahMistica", "Nagah Mística", "6", "sszzaazitas", 305, {
    tipo: "humanoide", sub: "nagah", tam: "medio", papel: "especial", ini: 8, per: 6, sentidos: ["visão na penumbra"], def: 20, fort: 6, ref: 12, von: 18, pv: 160, desl: 9, pm: 35, defesasTexto: "resistência a veneno +5",
    ataques: [{ n: "Adaga", a: 18, d: "1d6+6", m: 19, t: "P" }, { n: "Cauda", a: 18, d: "1d6+6", t: "I" }],
    habs: [{ n: "Magia Acelerada", acao: "livre", pm: 4, r: "Uma vez por rodada, uma magia de ação completa ou menor vira ação livre." }, OFIDIAS],
    magias: { como: "maga de 8º nível", cd: 24, lista: [{ id: "imagemEspelhada", acao: "padrao", pm: 5, r: "Cinco cópias: +10 na Defesa, –2 a cada ataque que erra." }, { id: "relampago", acao: "padrao", pm: 5, r: "8d6 de eletricidade numa linha em alcance médio (Reflexos reduz à metade)." }, { id: "velocidade", acao: "padrao", pm: 3, r: "Sustentada: uma ação padrão extra por turno (não para magias)." }] },
    atr: [1, 3, 2, 4, 2, 2], pericias: { conhecimento: 10, enganacao: 9, furtividade: 10, intuicao: 9, misticismo: 10 }, equip: "Adaga, essência de mana.", tesouro: "padrao",
  }, "Líder arcana das nagahs, mestra do disfarce.");
  D("cultistaDeSszzaas", "Cultista de Sszzaas", "7", "sszzaazitas", 306, {
    tipo: "monstro", sub: "medusa", tam: "medio", papel: "especial", ini: 11, per: 12, sentidos: ["visão no escuro"], def: 29, fort: 7, ref: 14, von: 20, pv: 160, desl: 9, pm: 40, defesasTexto: "resistência a veneno +5",
    ataques: [{ n: "Adaga", a: 22, d: "1d4+4", m: 19, t: "P", efeito: "veneno" }],
    habs: [{ n: "Ataque Furtivo", r: "Uma vez por rodada, +5d6 contra desprevenidos ou flanqueados.", dano: "5d6" }, { n: "Olhar Atordoante", acao: "movimento", r: "Uma criatura em alcance curto fica atordoada por 1 rodada (uma vez por cena; Fort CD 26 evita).", cd: 26, res: "fortitude", condicao: "atordoado" }, { n: "Veneno", r: "Perde 2d12 PV por 3 rodadas (Fort CD 26 reduz para 1 rodada).", cd: 26, res: "fortitude", dano: "2d12", tipoDano: "perdaDeVida" }],
    magias: { como: "clériga de Sszzaas de 7º nível", cd: 26, lista: [{ id: "armaMagica" }, { id: "comando" }, { id: "curarFerimentos" }, { id: "escuridao" }, { id: "enxameDePestes" }, { id: "miasmaMefitico" }] },
    atr: [0, 2, 0, 4, 4, 5], pericias: { enganacao: 20, intuicao: 20, religiao: 17 }, equip: "Adaga certeira, couraça, escudo leve, símbolo sagrado de Sszzaas.", tesouro: "padrao",
  }, "Medusa que manipula a cabala sszzaazita das sombras.");
  D("hidra", "Hidra", "11", "sszzaazitas", 306, {
    tipo: "monstro", tam: "enorme", papel: "solo", ini: 9, per: 9, sentidos: ["faro", "visão no escuro"], def: 35, fort: 24, ref: 18, von: 9, pv: 550, desl: 9, mov: { natacao: 9 }, curaAcelerada: 100, defesasTexto: "cura acelerada 100",
    ataques: [{ n: "Mordida", a: 34, d: "3d6+16", q: 5, t: "P" }],
    habs: [{ n: "Cortar Cabeças", r: "Atacar uma cabeça dá –2; acertando com 25+ de corte, decepa (–1 mordida). Em 1d4 rodadas nascem duas (até dez), salvo se o pescoço for cauterizado com 25 de ácido ou fogo. Sem cabeças e com tudo cauterizado, morre.", cabecas: { inicial: 5, max: 10, danoCorte: 25, cauterizar: 25 } }],
    atr: [10, 0, 10, -4, 0, -1], pericias: { furtividade: 4 }, tesouro: "padrao",
  }, "Réptil de cinco cabeças que se multiplicam quando cortadas.");
  D("lagash", "Lagash", "13", "sszzaazitas", 306, {
    tipo: "monstro", tam: "enorme", papel: "solo", ini: 19, per: 11, sentidos: ["faro", "visão no escuro"], def: 41, fort: 26, ref: 20, von: 13, imune: ["movimento", "veneno"], pv: 660, desl: 12, mov: { escalar: 12, natacao: 12 },
    ataques: [{ n: "Mordida", a: 37, d: "4d12+28", t: "P", efeito: "veneno" }],
    habs: [{ n: "Agarrar Aprimorado", acao: "livre", r: "Ao acertar a mordida, pode agarrar (teste +42)." }, { n: "Constrição", acao: "livre", r: "No início do turno dele, 6d12+28 de impacto em quem estiver agarrando.", dano: "6d12+28", tipoDano: "impacto" }, { n: "Crias de Sszzaas", acao: "movimento", recarga: "movimento", r: "Cospe 2d6 serpentes em alcance curto: agem a partir da próxima rodada, deslocamento 9 m, ação padrão para 1d6 de perfuração; Defesa nula, 1 PV; somem mortas ou no fim da cena." }, { n: "Cuspe Venenoso", acao: "padrao", r: "Cone de 9 m: perde 6d12 PV e cego 1d4 rodadas (Fort CD 35 reduz à metade e evita a cegueira).", cd: 35, res: "fortitude", dano: "6d12", tipoDano: "perdaDeVida", condicao: "cego" }, { n: "Veneno", r: "Perde 4d12 PV por rodada por 5 rodadas (Fort CD 35 reduz para 1 rodada).", cd: 35, res: "fortitude", dano: "4d12", tipoDano: "perdaDeVida" }],
    atr: [11, 4, 9, -3, 2, -2], pericias: { furtividade: 17 }, tesouro: "padrao",
  }, "Serpente colossal e sagrada que cospe veneno e cobras.");
  D("finntrollCacador", "Finntroll Caçador", "2", "trollsNobres", 307, {
    tipo: "monstro", sub: "finntroll", tam: "medio", papel: "lacaio", ini: 7, per: 7, sentidos: ["visão no escuro"], def: 19, fort: 6, ref: 12, von: 4, imune: ["atordoado", "metamorfose"], pv: 65, desl: 9, defesasTexto: "resistência a magia +2",
    ataques: [{ n: "Cimitarra", a: 12, d: "1d6+5", m: 18, q: 2, t: "C" }, { n: "Besta pesada", a: 12, d: "1d12+4", m: 19, t: "P", dist: true, alc: "medio" }, { n: "Rede", a: 12, d: "0", t: "", dist: true, alc: "curto", efeito: "agarrar", grupo: "rede" }],
    habs: [{ n: "Marca da Presa", acao: "movimento", r: "Até o fim da cena, +1d8 de dano contra uma criatura em alcance curto (+2d8 se anão, elfo ou humano)." }, VEGETAL, REGEN, LUZ],
    atr: [2, 3, 3, 2, 2, -1], pericias: { furtividade: 8, sobrevivencia: 7 }, equip: "Besta pesada, 2 cimitarras, rede, 20 virotes.", tesouro: "padrao",
  }, "Troll nobre caçador de escravos da superfície.");
  D("finntrollFeitor", "Finntroll Feitor", "6", "trollsNobres", 307, {
    tipo: "monstro", sub: "finntroll", tam: "medio", papel: "especial", ini: 9, per: 5, sentidos: ["visão no escuro"], def: 20, fort: 8, ref: 12, von: 16, imune: ["atordoado", "metamorfose"], pv: 155, desl: 9, pm: 35, defesasTexto: "resistência a magia +2",
    ataques: [{ n: "Chicote", a: 18, d: "1d3+10", m: 19, t: "C" }],
    habs: [{ n: "Açoitar", acao: "padrao", r: "No próximo turno de cada aliado em alcance médio, ele ganha uma ação de movimento extra e +2 em ataque e dano." }, VEGETAL, REGEN, LUZ],
    magias: { como: "mago de 7º nível", cd: 26, cdEscola: { encantamento: 28 }, lista: [{ id: "adagaMental" }, { id: "armaduraArcana" }, { id: "enfeiticar" }, { id: "desesperoEsmagador" }, { id: "marcaDaObediencia" }, { id: "relampago" }] },
    atr: [0, 3, 3, 4, 0, 2], pericias: { intimidacao: 9, misticismo: 11 }, equip: "Chicote cruel.", tesouro: "dobro",
  }, "Troll nobre de casta alta que comanda escravos e monstros.");
})();
