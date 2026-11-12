/* R.A.M.A. — Tormenta20 · ameaças: Duyshidakk (Livro Básico, p. 300–303).
   Formato em js/tormenta20/ameacas.js. Resumos do RAMA. */
(function () {
  var D = RAMATormenta20Ameacas.def;
  D("goblinSalteador", "Goblin Salteador", "1/4", "duyshidakk", 300, {
    tipo: "humanoide", sub: "goblin", tam: "pequeno", papel: "lacaio", ini: 5, per: 1, sentidos: ["visão no escuro"], def: 13, fort: 2, ref: 3, von: -1, pv: 4, desl: 9, mov: { escalar: 9 },
    ataques: [{ n: "Adaga", a: 7, d: "1d4", m: 19, q: 2, t: "P" }],
    habs: [{ n: "Frenesi", r: "+2 em ataque e dano para cada outro goblin salteador adjacente ao alvo." }],
    atr: [0, 3, 0, 0, -1, -1], equip: "2 adagas.", tesouro: "padrao",
  }, "Goblin feroz e caótico que ataca em bando por todos os lados.");
  D("hobgoblinSoldado", "Hobgoblin Soldado", "2", "duyshidakk", 300, {
    tipo: "humanoide", sub: "hobgoblin", tam: "medio", papel: "lacaio", ini: 4, per: 1, sentidos: ["visão no escuro"], def: 19, fort: 12, ref: 7, von: 3, pv: 18, desl: 6,
    ataques: [{ n: "Espada longa", a: 15, d: "1d8+15", m: 19, t: "C" }, { n: "Arco longo", a: 11, d: "1d8+6", c: 3, t: "P", dist: true, alc: "medio" }],
    atr: [4, 2, 1, 0, 0, -1], pericias: { "oficio:armeiro": 2 }, equip: "Arco longo, cota de malha, escudo pesado, espada longa, 20 flechas.", tesouro: "padrao",
  }, "Militar disciplinado de armas e táticas de primeira.");
  D("goblinEngenhoqueiro", "Goblin Engenhoqueiro", "3", "duyshidakk", 300, {
    tipo: "humanoide", sub: "goblin", tam: "pequeno", papel: "especial", ini: 5, per: 2, sentidos: ["visão no escuro"], def: 19, fort: 3, ref: 15, von: 9, pv: 74, desl: 9, mov: { escalar: 9 },
    ataques: [{ n: "Adaga", a: 8, d: "1d4+3", m: 19, t: "P" }, { n: "Besta leve", a: 9, d: "1d8+3", m: 19, t: "P", dist: true, alc: "medio" }],
    habs: [{ n: "Engenhocas", acao: "padrao", r: "Ofício (engenhoqueiro) +10 contra CD 15 (+5 por ativação da mesma engenhoca no dia); falha enguiça pela cena. Asa de Bambu: voo 12 m pela cena. Cospe-chamas: cone de 9 m, 6d6 de fogo e em chamas (Ref CD 19 reduz à metade e evita). Gritador: criaturas escolhidas em alcance curto sofrem –2 em ataque e dano pela cena.", engenhocas: [{ n: "Asa de Bambu" }, { n: "Cospe-chamas", cd: 19, res: "reflexos", dano: "6d6", tipoDano: "fogo", condicao: "emChamas" }, { n: "Gritador" }], teste: { pericia: "oficio:engenhoqueiro", bonus: 10, cd: 15, porAtivacao: 5 } }],
    atr: [0, 2, 2, 3, -1, 0], pericias: { furtividade: 7, "oficio:engenhoqueiro": 10 }, equip: "Adaga, besta leve, instrumentos de Ofício (engenhoqueiro), 20 virotes.", tesouro: "padrao",
  }, "Inventor de sucata cujas engenhocas imprevisíveis ajudam as hordas.");
  D("arautoDeThwor", "Arauto de Thwor", "4", "duyshidakk", 301, {
    tipo: "humanoide", sub: "humano", tam: "medio", papel: "especial", ini: 5, per: 8, def: 23, fort: 10, ref: 4, von: 16, pv: 135, desl: 6, pm: 26,
    ataques: [{ n: "Machado de guerra", a: 16, d: "3d6+12", c: 3, t: "C" }],
    habs: [{ n: "O Mundo como Ele É", acao: "reacao", r: "Ao errar um ataque, rola de novo (uma vez por oponente por cena)." }],
    magias: { como: "clérigo de Thwor de 4º nível", cd: 18, lista: [{ id: "amedrontar", acao: "padrao", pm: 3, r: "Um animal ou humanoide em alcance curto: apavorado 1d4+1 rodadas e depois abalado (Vontade reduz para abalado)." }, { id: "curarFerimentos", acao: "padrao", pm: 4, r: "Uma criatura adjacente cura 5d8+5 PV." }, { id: "perdicao", acao: "padrao", pm: 1, r: "Criaturas escolhidas em alcance curto: –1 em ataque e dano pela cena." }] },
    atr: [3, 1, 3, 0, 4, 0], pericias: { intimidacao: 9, religiao: 8 }, equip: "Machado de guerra, símbolo sagrado de Thwor.", tesouro: "padrao",
  }, "Clérigo de qualquer raça que abraçou a causa de Thwor.");
  D("hobgoblinMagoDeBatalha", "Hobgoblin Mago de Batalha", "5", "duyshidakk", 301, {
    tipo: "humanoide", sub: "hobgoblin", tam: "medio", papel: "especial", ini: 5, per: 4, sentidos: ["visão no escuro"], def: 17, fort: 11, ref: 5, von: 17, pv: 120, desl: 9, pm: 35,
    ataques: [{ n: "Espada longa", a: 14, d: "1d8+3", m: 19, t: "C" }],
    habs: [{ n: "Arcano de Batalha", r: "Soma Inteligência (+4) no dano das magias." }],
    magias: { como: "mago de 5º nível", cd: 22, lista: [{ id: "amedrontar", acao: "padrao", pm: 3, r: "Um animal ou humanoide em alcance curto: apavorado 1d4+1 rodadas e depois abalado (Vontade reduz para abalado)." }, { id: "armaduraArcana", acao: "padrao", pm: 5, r: "+6 na Defesa por um dia." }, { id: "bolaDeFogo", acao: "padrao", pm: 5, r: "8d6+5 de fogo num raio de 6 m em alcance médio (Reflexos reduz à metade)." }, { id: "concentracaoDeCombate", acao: "livre", pm: 1, r: "Rola dois dados num ataque e usa o melhor." }, { id: "toqueVampirico", acao: "padrao", pm: 5, r: "Ataque com a espada; acertando, mais 6d6+5 de trevas e cura metade desse dano." }] },
    atr: [3, 1, 3, 4, 0, -1], pericias: { guerra: 9, misticismo: 9, "oficio:armeiro": 11 }, equip: "Espada longa, essência de mana.", tesouro: "padrao",
  }, "Hobgoblin que aprendeu a magia destrutiva dos tomos élficos.");
  D("engenhoDeGuerraGoblin", "Engenho de Guerra Goblin", "6", "duyshidakk", 301, {
    tipo: "construto", tam: "enorme", papel: "solo", ini: 3, per: 5, sentidos: ["visão no escuro"], def: 25, fort: 18, ref: 6, von: 12, rd: { geral: 10 }, pv: 246, desl: 12,
    ataques: [],
    habs: [{ n: "Arsenal de Engenhocas", acao: "padrao", r: "Role 1d6 quatro vezes; cada resultado ativa uma engenhoca (repetidos se perdem). 1 Canhão elétrico: linha em alcance médio, 8d8 de eletricidade (Ref CD 22 metade). 2 Balestra ácida: uma criatura em alcance médio, 8d6 de ácido e mais 4d6 no próximo turno (Ref CD 22 metade e evita o resto). 3 Foles: cone curto, 6d6 de fogo e em chamas (Ref CD 23 metade e evita). 4 Lâmina giratória: ataque +20 (4d6+10 corte, 19) em cada adjacente. 5 Poça de óleo: em alcance curto, vulneráveis a fogo e caídos (Ref CD 22 evita). 6 Reparos: recupera 20 PV.", tabela: "1d6x4", opcoes: [{ n: "Canhão elétrico", cd: 22, res: "reflexos", dano: "8d8", tipoDano: "eletricidade" }, { n: "Balestra ácida", cd: 22, res: "reflexos", dano: "8d6", tipoDano: "acido" }, { n: "Foles", cd: 23, res: "reflexos", dano: "6d6", tipoDano: "fogo", condicao: "emChamas" }, { n: "Lâmina giratória", ataque: { a: 20, d: "4d6+10", m: 19, t: "C" } }, { n: "Poça de óleo", cd: 22, res: "reflexos", condicao: "caido" }, { n: "Reparos emergenciais", cura: 20 }] }, { n: "Tripulação", r: "Destruído, 1d6 goblins salteadores saem dos escombros no início da rodada seguinte." }],
    atr: [10, 0, 7, null, 0, -5], tesouro: "padrao",
  }, "Carroça de guerra sem cavalos, cheia de armas e goblins frenéticos.");
  D("devoradorDeMedos", "Devorador de Medos", "8", "duyshidakk", 303, {
    tipo: "humanoide", sub: "bugbear", tam: "medio", papel: "solo", ini: 11, per: 9, sentidos: ["faro", "visão no escuro"], def: 31, fort: 21, ref: 15, von: 8, imune: ["medo"], pv: 325, desl: 9,
    ataques: [{ n: "Machado de guerra", a: 26, d: "1d12+20", c: 3, q: 2, t: "C" }],
    habs: [{ n: "Apavorar", acao: "movimento", r: "Intimidação oposta pela Vontade de criaturas escolhidas em alcance médio: falha fica abalado pela cena; falha por 10 ou mais, apavorado 1d4 rodadas e abalado pela cena (uma vez por criatura por cena)." }, { n: "Artesão do Medo", r: "Rola dois dados em Intimidação e usa o melhor." }, { n: "Medo Inebriante", r: "Sofre metade do dano de criaturas abaladas ou apavoradas; perto delas, ganha em perícias e dano corpo a corpo o valor da penalidade delas e PV temporários iguais a ela ao acertá-las." }],
    atr: [5, 3, 3, 0, 1, 0], pericias: { furtividade: 13, intimidacao: 14 }, equip: "Machado de guerra cruel.", tesouro: "metade",
  }, "Bugbear que fareja o medo e aterroriza antes de matar.");
  D("sombraDeThwor", "Sombra de Thwor", "9", "duyshidakk", 303, {
    tipo: "humanoide", sub: "hobgoblin", tam: "medio", papel: "especial", ini: 17, per: 10, sentidos: ["visão no escuro"], def: 33, fort: 15, ref: 21, von: 9, pv: 295, desl: 9,
    ataques: [{ n: "Machadinha", a: 27, d: "1d6+12", c: 3, q: 2, t: "C", efeito: "veneno" }, { n: "Machadinha arremessada", a: 27, d: "1d6+12", c: 3, q: 2, t: "C", dist: true, alc: "curto", efeito: "veneno" }],
    habs: [{ n: "Assassinar", acao: "movimento", r: "Analisa uma criatura em alcance curto; o primeiro Ataque Furtivo contra ela até o fim do próximo turno tem os dados dobrados." }, { n: "Ataque Furtivo", r: "Uma vez por rodada, +7d6 contra desprevenidos ou flanqueados (corpo a corpo ou à distância em alcance curto).", dano: "7d6" }, { n: "Evasão Aprimorada", r: "Reflexos para metade: passando, nenhum dano; falhando, metade.", evasaoAprimorada: true }, { n: "Um com as Sombras", r: "Nunca fica surpreendido nem flanqueado; usa Furtividade em deslocamento normal sem penalidade." }, { n: "Veneno", r: "Perde 2d12 PV por rodada por 3 rodadas (Fort CD 26 reduz para 1 rodada).", cd: 26, res: "fortitude", dano: "2d12", tipoDano: "perdaDeVida" }],
    atr: [5, 5, 5, 2, 2, 0], pericias: { acrobacia: 15, atletismo: 13, furtividade: 18, intimidacao: 9, ladinagem: 15, "oficio:armeiro": 12 }, equip: "Couro batido ajustado, 4 machadinhas atrozes, 1d4 doses de peçonha potente.", tesouro: "padrao",
  }, "Hobgoblin espião e assassino silencioso.");
})();
