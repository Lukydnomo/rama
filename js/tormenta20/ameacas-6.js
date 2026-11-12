/* R.A.M.A. — Tormenta20 · ameaças: Trolls, Dragões e Tormenta (Livro Básico, p. 308–316).
   Formato em js/tormenta20/ameacas.js. Resumos do RAMA. */
(function () {
  var D = RAMATormenta20Ameacas.def;
  var LUZ = { n: "Sensibilidade a Luz", r: "Sob luz do sol ou similar, fica ofuscado." };
  var VARRER = { n: "Varrer", acao: "livre", r: "Uma vez por rodada, ao derrubar um alvo a 0 PV com ataque corpo a corpo, ataca outra criatura ao alcance." };
  var DRACONICAS = { n: "Habilidades Dracônicas", r: "Imune a atordoamento, cansaço, fogo (tipo do sopro), metamorfose e paralisia. Adultos ou mais velhos lançam magias sem palavras, gestos ou concentração. Jovens ou mais velhos usam Metamorfose Dracônica (ação completa). Resistência a magia +1 por categoria de idade (p. 311)." };
  var DRAG_IMUNE = ["fogo", "atordoado", "fatigado", "exausto", "metamorfose", "paralisado"];
  function aura(cd) { return { n: "Aura Aterradora", r: "Quem começa o turno em alcance longo fica apavorado (4 níveis ou menos) ou abalado (5 ou mais) até o fim da cena (Vontade CD " + cd + " evita; quem passa fica imune por um dia).", cd: cd, res: "vontade", condicao: "abalado" }; }
  function sopro(cone, dados, cd) { return { n: "Sopro", acao: "padrao", recarga: "movimento", r: "Cone de " + cone + ": " + dados + " de fogo e em chamas (Ref CD " + cd + " reduz à metade e evita a condição).", cd: cd, res: "reflexos", dano: dados, tipoDano: "fogo", condicao: "emChamas" }; }
  var LEFEU_IMUNE = ["critico", "acido", "fatigado", "exausto", "eletricidade", "fogo", "frio", "luz", "paralisado", "metabolismo", "metamorfose", "trevas", "veneno"];
  var LEFEU = { n: "Habilidades Lefeu", r: "Imune a críticos, ácido, cansaço, eletricidade, fogo, frio, luz, paralisia, metabolismo, metamorfose, trevas e veneno. Soma Sabedoria em ataque, Defesa e Reflexos (já na ficha). +5 em Percepção e não pode ser flanqueado (p. 315)." };
  function insanidade(pm, cd) { return { n: "Insanidade da Tormenta", r: "Quem vê lefeu faz Vontade CD " + cd + " (contra o de maior ND) ou perde " + pm + " PM (+1 por lefeu extra); a 0 PM fica confuso. Uma vez por dia.", cd: cd, res: "vontade", perdaPM: pm, insanidade: true }; }

  D("ganchador", "Ganchador", "5", "trollsNobres", 308, {
    tipo: "monstro", tam: "grande", papel: "solo", ini: 7, per: 5, sentidos: ["percepção às cegas"], def: 26, fort: 15, ref: 11, von: 7, pv: 210, desl: 9, mov: { escalar: 9 },
    ataques: [{ n: "Mordida", a: 17, d: "2d6+8", t: "P" }, { n: "Garra", a: 17, d: "1d8+8", m: 19, c: 3, q: 2, t: "C" }],
    habs: [{ n: "Dilacerar", r: "Acertando as duas garras na mesma criatura na rodada, mais 2d8+8 de dano.", dano: "2d8+8" }, { n: "Quebrar Tudo!", r: "+2 para quebrar (teste +21) e +1d8 de dano contra objetos." }, LUZ],
    atr: [6, 3, 5, -2, 1, -2], tesouro: "metade e 2 garras (CD 20; T$ 500 cada em matéria-prima para armas de corte superiores)",
  }, "Besouro humanoide de garras em gancho, escravo dos finntroll.");
  D("troll", "Troll", "5", "trollsNobres", 308, {
    tipo: "monstro", tam: "grande", papel: "solo", ini: 4, per: 3, sentidos: ["visão no escuro"], def: 23, fort: 14, ref: 10, von: 6, pv: 165, desl: 9, curaAcelerada: 15, curaBloqueadaPor: ["acido", "fogo"], defesasTexto: "cura acelerada 15/ácido ou fogo",
    ataques: [{ n: "Mordida", a: 17, d: "1d8+6", t: "P" }, { n: "Garra", a: 17, d: "1d6+6", q: 2, t: "C" }],
    habs: [{ n: "Dilacerar", r: "Acertando as duas garras na mesma criatura na rodada, mais 2d6+6 de dano.", dano: "2d6+6" }, { n: "Variantes (p. 309)", r: "Ghillanin: Defesa 25 e sensível à luz (ofuscado e sem cura acelerada). Glacioll: dano de frio vira PV temporários (+1 em ataque e dano a cada 10, pela cena) e sofre +50% de fogo. Vrakoll: natação 9 m, respira na água, –2 em ataques em terra firme." }],
    atr: [6, 2, 6, -2, -1, -2], tesouro: "padrao", variantes: ["ghillanin", "glacioll", "vrakoll"],
  }, "Monstro vegetal faminto que regenera tudo, menos fogo e ácido.");
  D("trollDasCavernas", "Troll das Cavernas", "9", "trollsNobres", 309, {
    tipo: "monstro", tam: "enorme", papel: "solo", ini: 7, per: 14, sentidos: ["faro", "visão no escuro"], def: 29, fort: 21, ref: 15, von: 9, pv: 345, desl: 12, mov: { escalar: 9 }, curaAcelerada: 20, curaBloqueadaPor: ["acido", "fogo"], defesasTexto: "cura acelerada 20/ácido ou fogo",
    ataques: [{ n: "Tacape", a: 26, d: "3d6+27", t: "I" }, { n: "Mordida", a: 26, d: "2d6+27", t: "P" }],
    habs: [{ n: "Golpe Avassalador", acao: "livre", r: "Acertando o tacape, arremessa a vítima 1d6 × 1,5 m e a deixa caída (Fort CD 28 evita); batendo num obstáculo, 1d6 por 1,5 m voado.", cd: 28, res: "fortitude", condicao: "caido" }, VARRER],
    atr: [9, 0, 11, -2, -1, -2], equip: "Tacape gigante.", tesouro: "metade",
  }, "Troll gigantesco de pele de pedra, arma pesada dos finntroll.");
  D("enxameKobold", "Enxame Kobold", "2", "dragoes", 310, {
    tipo: "monstro", sub: "kobold, enxame", tam: "medio", papel: "solo", ini: 6, per: 1, sentidos: ["visão no escuro"], def: 17, fort: 7, ref: 13, von: 2, pv: 60, desl: 9, enxame: true,
    ataques: [],
    habs: [{ n: "Caixa com Pregos", acao: "padrao", r: "Uma criatura em alcance curto sofre 2d6 de perfuração e fica atordoada 1 rodada (Ref CD 16 reduz à metade e evita).", cd: 16, res: "reflexos", dano: "2d6", tipoDano: "perfuracao", condicao: "atordoado" }, { n: "Enxame", r: "Entra no espaço de personagens e, no fim do turno, causa 2d6 de perfuração automática a quem estiver nele. Imune a manobras e a efeitos de alvo único sem dano; +50% de dano de área; metade do dano de ataques com armas. Dentro dele, lançar magia é condição ruim.", dano: "2d6", tipoDano: "perfuracao", enxame: true }, { n: "Unidos Venceremos", r: "No início de cada rodada, +10 PV (até 100). +1 de dano para cada 10 PV que tem.", ganhaPV: 10, maxPV: 100 }],
    atr: [0, 3, 0, -1, 0, -1], tesouro: "metade",
  }, "Praga de pequenos humanoides dracônicos que ataca em massa.");
  D("dragaoFilhote", "Dragão Filhote", "3", "dragoes", 310, {
    tipo: "monstro", sub: "dragão", tam: "medio", papel: "solo", ini: 8, per: 5, sentidos: ["percepção às cegas", "visão no escuro"], def: 22, fort: 15, ref: 3, von: 9, imune: DRAG_IMUNE, vulner: ["frio"], pv: 140, desl: 12, mov: { voo: 18 }, resistenciaMagia: 1, defesasTexto: "resistência a magia +1",
    ataques: [{ n: "Mordida", a: 15, d: "2d6+5", t: "P" }, { n: "Garra", a: 15, d: "1d6+5", q: 2, t: "C" }],
    habs: [sopro("6 m", "2d12", 18), DRACONICAS],
    atr: [4, 3, 3, 0, 0, 0], tesouro: "padrao",
  }, "Jovem cuspidor de fogo, já perigoso para iniciantes.");
  D("dragaoJovem", "Dragão Jovem", "7", "dragoes", 310, {
    tipo: "monstro", sub: "dragão", tam: "grande", papel: "solo", ini: 11, per: 11, sentidos: ["percepção às cegas", "visão no escuro"], def: 32, fort: 20, ref: 9, von: 12, imune: DRAG_IMUNE, vulner: ["frio"], rd: { geral: 5 }, pv: 320, desl: 12, mov: { voo: 18 }, pm: 15, resistenciaMagia: 2, defesasTexto: "resistência a magia +2",
    ataques: [{ n: "Mordida", a: 25, d: "2d6+14", m: 19, t: "P" }, { n: "Garra", a: 25, d: "1d8+14", m: 19, q: 2, t: "C" }],
    habs: [sopro("9 m", "6d12", 25), VARRER, DRACONICAS],
    atr: [7, 2, 6, 2, 2, 2], pericias: { intimidacao: 11 }, tesouro: "dobro e 2 peças de couro de dragão (CD 22)",
  }, "Dragão em ascensão, capaz de mudar de forma.");
  D("dragaoAdulto", "Dragão Adulto", "11", "dragoes", 311, {
    tipo: "monstro", sub: "dragão", tam: "enorme", papel: "solo", ini: 12, per: 15, sentidos: ["percepção às cegas", "visão no escuro"], def: 42, fort: 24, ref: 11, von: 18, imune: DRAG_IMUNE, vulner: ["frio"], rd: { geral: 10 }, pv: 600, desl: 12, mov: { voo: 24 }, pm: 70, resistenciaMagia: 3, defesasTexto: "resistência a magia +3",
    ataques: [{ n: "Mordida", a: 35, d: "4d10+25", m: 18, t: "P" }, { n: "Garra", a: 35, d: "3d10+25", m: 18, q: 2, t: "C" }],
    magias: { como: "conjurador arcano de 11º nível", cd: 32, lista: [{ id: "campoDeForca", acao: "reacao", pm: 4, r: "Ao sofrer dano, RD 30 contra ele." }, { id: "curarFerimentos", acao: "padrao", pm: 11, r: "Uma criatura adjacente cura 12d8+12 PV." }, { id: "dissiparMagia", acao: "padrao", pm: 3, r: "Misticismo dissipa magias de CD menor num alvo ou esfera de 3 m em alcance médio." }, { id: "enfeiticar", acao: "padrao", pm: 1, r: "Um humanoide em alcance curto fica enfeitiçado até o fim da cena (Vontade evita)." }, { id: "globoDeInvulnerabilidade", acao: "padrao", pm: 6, r: "Sustentada: esfera de 3 m que detém magias de até 2º círculo." }, { id: "velocidade", acao: "padrao", pm: 3, r: "Sustentada: uma ação padrão extra por turno (não para magias)." }] },
    habs: [aura(31), sopro("12 m", "12d12", 32), VARRER, DRACONICAS],
    atr: [11, 1, 8, 4, 4, 4], pericias: { enganacao: 15, intimidacao: 15, misticismo: 15 }, tesouro: "dobro e 4 peças de couro de dragão (CD 26)",
  }, "Dragão em pleno poder, conjurador e tirano de sua região.");
  D("dragaoVeneravel", "Dragão Venerável", "15", "dragoes", 311, {
    tipo: "monstro", sub: "dragão", tam: "enorme", papel: "solo", ini: 16, per: 22, sentidos: ["percepção às cegas", "visão no escuro"], def: 52, fort: 28, ref: 15, von: 22, imune: DRAG_IMUNE, vulner: ["frio"], rd: { geral: 15 }, pv: 800, desl: 12, mov: { voo: 24 }, pm: 97, resistenciaMagia: 4, defesasTexto: "resistência a magia +4",
    ataques: [{ n: "Mordida", a: 44, d: "4d12+40", m: 17, t: "P" }, { n: "Garra", a: 44, d: "3d12+40", m: 17, q: 2, t: "C" }],
    magias: { como: "conjurador arcano de 15º nível", cd: 40, lista: [{ id: "campoDeForca", acao: "reacao", pm: 7, r: "Ao sofrer dano, RD 50 contra ele." }, { id: "controlarAGravidade", acao: "padrao", pm: 10, r: "Sustentada: cubo de 12 m em alcance médio (p. 186)." }, { id: "curarFerimentos", acao: "padrao", pm: 15, r: "Uma criatura adjacente cura 16d8+16 PV." }, { id: "dissiparMagia", acao: "padrao", pm: 3, r: "Misticismo dissipa magias de CD menor num alvo ou esfera de 3 m em alcance médio." }, { id: "enfeiticar", acao: "padrao", pm: 1, r: "Um humanoide em alcance curto fica enfeitiçado até o fim da cena (Vontade evita)." }, { id: "globoDeInvulnerabilidade", acao: "padrao", pm: 10, r: "Sustentada: detém magias de até 3º círculo." }, { id: "velocidade", acao: "padrao", pm: 3, r: "Sustentada: uma ação padrão extra por turno (não para magias)." }] },
    habs: [aura(40), { n: "Fluxo de Mana", r: "Mantém duas magias sustentadas com uma ação livre (pagando cada uma)." }, { n: "Magia Acelerada", acao: "livre", pm: 4, r: "Uma vez por rodada, uma magia de ação completa ou menor vira ação livre." }, sopro("15 m", "16d12", 40), VARRER, DRACONICAS],
    atr: [13, 1, 10, 6, 6, 6], pericias: { enganacao: 22, intimidacao: 22, intuicao: 22, misticismo: 22 }, tesouro: "dobro e 4 peças de couro de dragão (CD 30)",
  }, "Dragão antigo de sabedoria e crueldade imensas.");
  D("dragaoRei", "Dragão-Rei", "20", "dragoes", 312, {
    tipo: "monstro", sub: "dragão", tam: "colossal", papel: "solo", ini: 19, per: 27, sentidos: ["percepção às cegas", "visão no escuro"], def: 62, fort: 34, ref: 20, von: 28, imune: DRAG_IMUNE, vulner: ["frio"], rd: { geral: 20 }, pv: 1400, desl: 12, mov: { voo: 36 }, pm: 128, resistenciaMagia: 5, metadeMundano: true, defesasTexto: "resistência a magia +5; metade do dano de fontes mundanas",
    ataques: [{ n: "Mordida", a: 55, d: "6d20+50", m: 16, t: "P" }, { n: "Garra", a: 50, d: "6d20+50", m: 16, q: 2, t: "C" }],
    magias: { como: "conjurador arcano de 20º nível", cd: 50, lista: [{ id: "campoDeForca", acao: "reacao", pm: 7, r: "Ao sofrer dano, RD 50 contra ele." }, { id: "controlarAGravidade", acao: "padrao", pm: 10, r: "Sustentada: cubo de 12 m em alcance médio." }, { id: "controlarOTempo", acao: "padrao", pm: 15, r: "Controla o tempo ao redor (p. 187)." }, { id: "dissiparMagia", acao: "padrao", pm: 3, r: "Misticismo dissipa magias de CD menor." }, { id: "enfeiticar", acao: "padrao", pm: 1, r: "Um humanoide em alcance curto fica enfeitiçado (Vontade evita)." }, { id: "globoDeInvulnerabilidade", acao: "padrao", pm: 15, r: "Sustentada: detém magias de até 4º círculo." }, { id: "segundaChance", acao: "padrao", pm: 20, r: "Uma criatura adjacente cura 300 PV e condições." }, { id: "velocidade", acao: "padrao", pm: 10, r: "Sustentada: uma ação padrão extra por turno." }] },
    habs: [aura(50), { n: "Escamas Supremas", r: "Sofre metade do dano de fontes mundanas." }, { n: "Fluxo de Mana", r: "Mantém duas magias sustentadas com uma ação livre." }, { n: "Magia Acelerada", acao: "livre", pm: 4, r: "Uma vez por rodada, uma magia de ação completa ou menor vira ação livre." }, sopro("18 m", "20d12", 50), VARRER, DRACONICAS],
    atr: [17, 0, 12, 7, 7, 7], pericias: { enganacao: 26, intimidacao: 26, intuicao: 26, misticismo: 26 }, tesouro: "dobro e 6 peças de couro de dragão (CD 35)",
  }, "O ápice dos dragões, rival de deuses menores.");
  D("tiranoDoTerceiro", "Tirano do Terceiro", "10", "dragoes", 313, {
    tipo: "humanoide", sub: "humano", tam: "medio", papel: "especial", ini: 9, per: 10, sentidos: ["visão no escuro"], def: 37, fort: 22, ref: 10, von: 16, imune: ["atordoado", "medo"], rd: { geral: 5 }, pv: 370, desl: 6, pm: 62, resistenciaMagia: 2, defesasTexto: "resistência a magia +2",
    ataques: [{ n: "Machado de batalha", a: 29, d: "2d8+14", c: 3, q: 2, t: "C" }, { n: "Garra", a: 29, d: "1d8+14", t: "C" }],
    habs: [{ n: "Dádiva Dracônica", r: "Lança magias arcanas cavalgando ou de armadura sem teste de Misticismo." }],
    magias: { como: "mago de 10º nível", cd: 30, lista: [{ id: "bolaDeFogo", acao: "padrao", pm: 9, r: "12d6+5 de fogo num raio de 6 m em alcance médio (Reflexos reduz à metade)." }, { id: "concentracaoDeCombate", acao: "padrao", pm: 8, r: "Até o fim da cena, rola dois dados ao atacar e quem o ataca rola dois e usa o pior." }, { id: "velocidade", acao: "padrao", pm: 3, r: "Sustentada: uma ação padrão extra por turno (não para magias)." }] },
    atr: [6, 0, 6, 2, 1, 4], pericias: { cavalgar: 9, intimidacao: 13, misticismo: 11 }, equip: "Armadura completa de adamante, machado de batalha de adamante atroz.", tesouro: "dobro",
  }, "Servo de Kallyadranoch que cavalga dragões e aterroriza reinos.");
  D("maniacoLefou", "Maníaco Lefou", "2", "tormenta", 314, {
    tipo: "humanoide", sub: "lefou", tam: "medio", papel: "lacaio", ini: 4, per: 2, def: 18, fort: 12, ref: 7, von: 3, pv: 25, desl: 9,
    ataques: [{ n: "Machado de guerra", a: 16, d: "1d12+15", c: 3, t: "C" }],
    habs: [{ n: "Frenesi Insano", r: "Sempre que causa ou sofre dano, +2 cumulativo em ataque e dano até o fim da cena." }],
    atr: [5, 1, 1, -1, -1, -2], equip: "Machado de guerra.", tesouro: "metade",
  }, "Meio-demônio da Tormenta consumido pela loucura.");
  D("uktril", "Uktril", "3", "tormenta", 314, {
    tipo: "monstro", sub: "lefeu", tam: "medio", papel: "lacaio", ini: 9, per: 10, sentidos: ["visão no escuro"], def: 22, fort: 12, ref: 11, von: 6, imune: LEFEU_IMUNE, rd: { geral: 10 }, pv: 45, desl: 9,
    ataques: [{ n: "Pinça", a: 16, d: "2d6+6", m: 19, t: "C" }, { n: "Garra", a: 16, d: "1d6+6", t: "C" }],
    habs: [insanidade("1d6", 17), LEFEU], atr: [5, 4, 2, -1, 2, -4], tesouro: "nenhum",
  }, "O lefeu mais comum: meio humano, meio formiga.");
  D("geraktril", "Geraktril", "6", "tormenta", 314, {
    tipo: "monstro", sub: "lefeu", tam: "medio", papel: "solo", ini: 13, per: 16, sentidos: ["visão no escuro"], def: 30, fort: 18, ref: 15, von: 6, imune: LEFEU_IMUNE, rd: { geral: 10 }, pv: 240, desl: 9,
    ataques: [{ n: "Pinça", a: 23, d: "3d6+10", m: 19, q: 2, t: "C" }, { n: "Garra", a: 23, d: "1d8+10", t: "C" }],
    habs: [insanidade("2d4", 22), LEFEU], atr: [7, 5, 3, 1, 3, -1], tesouro: "nenhum",
  }, "Lefeu de três braços que lidera bandos de uktril.");
  D("reishid", "Reishid", "8", "tormenta", 314, {
    tipo: "monstro", sub: "lefeu", tam: "medio", papel: "especial", ini: 17, per: 19, sentidos: ["visão no escuro"], def: 37, fort: 19, ref: 21, von: 10, imune: LEFEU_IMUNE, rd: { geral: 10 }, pv: 295, desl: 9, mov: { escalar: 9, voo: 15 },
    ataques: [{ n: "Adaga da Tormenta", a: 30, d: "1d4+18", x: "1d8 trevas", m: 19, t: "P" }, { n: "Garra", a: 30, d: "1d6+18", t: "C" }, { n: "Mordida", a: 30, d: "1d6+18", t: "P", efeito: "veneno" }],
    habs: [{ n: "Ataque em Movimento", r: "Pode se mover antes e depois de agredir, sem passar do deslocamento." }, { n: "Ataque Reflexo", acao: "reacao", r: "Uma vez por rodada, ataca um adjacente desprevenido ou que sai do alcance." }, insanidade("2d6", 26), { n: "Sombra Rubra", r: "Rola dois dados em Iniciativa e Furtividade e usa o melhor." }, { n: "Veneno", r: "Paralisado por 1d6 horas (Fort CD 26 reduz para lento por 1d6 rodadas).", cd: 26, res: "fortitude", condicao: "paralisado" }, LEFEU],
    atr: [4, 7, 4, 4, 4, 1], pericias: { furtividade: 20 }, tesouro: "padrao e adaga da Tormenta (adaga formidável tumular; +5 contra desarmar; soltá-la é ação de movimento)",
  }, "Lefeu espião com asas de barata, mestre de cerimônias profanas.");
  D("thuwarokk", "Thuwarokk", "16", "tormenta", 315, {
    tipo: "monstro", sub: "lefeu", tam: "colossal", papel: "solo", ini: 11, per: 12, sentidos: ["visão no escuro"], def: 50, fort: 30, ref: 24, von: 16, imune: LEFEU_IMUNE, rd: { geral: 10 }, pv: 900, desl: 12, metadeFisico: true,
    ataques: [{ n: "Pancada", a: 48, d: "4d12+24", q: 4, t: "I" }],
    habs: [{ n: "Carapaça", r: "Corte, impacto e perfuração causam metade. Passando na resistência contra magia que o mire, ela volta contra o conjurador. Ação de movimento e Percepção CD 25 acham um ponto fraco: atacar ali tem –5 e ignora a carapaça.", metadeFisico: true }, insanidade("2d12", 42), { n: "Jato de Ácido", acao: "movimento", recarga: "movimento", r: "Cone de 30 m: 10d8+20 de ácido (Ref CD 42 reduz à metade).", cd: 42, res: "reflexos", dano: "10d8+20", tipoDano: "acido" }, { n: "Passar por Cima", acao: "completa", r: "Anda o dobro do deslocamento sobre criaturas Enormes ou menores: 10d12+50 (Ref CD 42 reduz à metade).", cd: 42, res: "reflexos", dano: "10d12+50", tipoDano: "impacto" }, LEFEU],
    atr: [17, -1, 10, -3, 0, -4], tesouro: "nenhum",
  }, "Colosso da Tormenta do tamanho de um castelo, capaz de dizimar exércitos.");
  D("otyugh", "Otyugh", "5", "tormenta", 315, {
    tipo: "monstro", tam: "grande", papel: "solo", ini: 3, per: 10, sentidos: ["visão no escuro"], def: 24, fort: 17, ref: 11, von: 5, imune: ["doenca", "veneno"], rd: { geral: 5 }, pv: 213, desl: 6,
    ataques: [{ n: "Tentáculo", a: 17, d: "1d8+9", q: 2, t: "I", alc: "4,5m" }, { n: "Mordida", a: 17, d: "1d6+9", t: "P", efeito: "doença (infecção do esgoto)" }],
    habs: [{ n: "Agarrar Aprimorado", acao: "livre", r: "Ao acertar um tentáculo, pode agarrar (teste +19)." }, { n: "Constrição", acao: "livre", r: "No início do turno dele, 1d8+9 de impacto em quem estiver agarrando.", dano: "1d8+9", tipoDano: "impacto" }, { n: "Doença", r: "Mordido fica exposto à infecção do esgoto (p. 318)." }],
    atr: [5, -1, 4, -2, 1, -2], pericias: { furtividade: 3 }, tesouro: "padrao",
  }, "Monstro pustulento de três patas que devora tudo em esgotos e pântanos.");
  D("sacerdoteDeAharadak", "Sacerdote de Aharadak", "10", "tormenta", 316, {
    tipo: "humanoide", sub: "humano", tam: "medio", papel: "especial", ini: 17, per: 15, def: 38, fort: 16, ref: 10, von: 22, imune: ["confuso"], rd: { acido: 10, eletricidade: 10, fogo: 10, frio: 10, luz: 10, trevas: 10 }, pv: 315, desl: 9, mov: { voo: 15 }, pm: 56, defesasTexto: "resistência a magia divina +5",
    ataques: [{ n: "Corrente de espinhos aberrante", a: 30, d: "4d6+12", x: "1d6 acido", q: 2, t: "C" }, { n: "Mordida", a: 30, d: "1d6+12", t: "P" }],
    habs: [{ n: "Magia Acelerada", acao: "livre", pm: 4, r: "Uma vez por rodada, uma magia de ação completa ou menor vira ação livre." }, { n: "Sangue Ácido", r: "Quem o fere corpo a corpo sofre 10 de ácido.", retaliacao: { dano: 10, tipo: "acido" } }],
    magias: { como: "clérigo de Aharadak de 10º nível", cd: 30, lista: [{ id: "curarFerimentos", acao: "padrao", pm: 10, r: "Uma criatura adjacente cura 11d8+11 PV." }, { id: "perdicao", acao: "padrao", pm: 5, r: "Criaturas escolhidas em alcance curto: –3 em ataque e dano pela cena." }, { id: "potenciaDivina", acao: "padrao", pm: 10, r: "Sustentada: fica Grande, Força +5, RD 10, dados dos ataques viram d8; não lança magias." }, { id: "silencio", acao: "padrao", pm: 4, r: "Sustentada: esfera de 3 m ao redor; quem está nela fica surdo e não lança magias." }] },
    atr: [4, 2, 4, 2, 5, -1], pericias: { intimidacao: 9, religiao: 16 }, equip: "Símbolo sagrado de Aharadak.", tesouro: "padrao",
  }, "Devoto do Deus da Tormenta que abraçou a deturpação aberrante.");
})();
