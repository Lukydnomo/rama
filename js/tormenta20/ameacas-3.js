/* R.A.M.A. — Tormenta20 · ameaças: Colosso e Reino dos Mortos (Livro Básico, p. 296–299).
   Formato em js/tormenta20/ameacas.js. Resumos do RAMA. */
(function () {
  var D = RAMATormenta20Ameacas.def;
  var BANDO = { n: "Bando", r: "Ataque que passa a Defesa por 10 ou mais causa o dobro; ataque que erra causa metade. Imune a manobras e a efeitos de alvo único sem dano; sofre +50% de dano de área. Trespassar permite um ataque extra contra o bando (uma vez por turno).", bando: true };
  var FRAQ_ZUMBI = { n: "Fraqueza Zumbi", r: "Sofre o dobro de dano de críticos e de ataques contra o cérebro (Defesa 21).", criticoDobro: true, defesaCerebro: 21 };
  var ODIO = { n: "Ódio Puro", r: "+5 em Vontade seguindo ordens de um purista de ND maior; +2 no dano contra humanoides não humanos (p. 295)." };
  D("colossoSupremo", "Colosso Supremo", "14", "puristas", 296, {
    tipo: "construto", tam: "colossal", papel: "solo", ini: 8, per: 9, sentidos: ["visão no escuro"], def: 46, fort: 31, ref: 19, von: 20, rd: { geral: 10 }, pv: 675, desl: 12, defesasTexto: "cura acelerada 20, resistência a magia +5",
    curaAcelerada: 20, resistenciaMagia: 5,
    ataques: [{ n: "Espada titânica", a: 39, d: "4d12+30", m: 19, t: "C" }],
    habs: [{ n: "Balistas", acao: "livre", r: "Duas balistas, uma por ombro, disparam em rodadas alternadas: ataque +39, 6d8 de perfuração, crítico 19, alcance médio. Cada tripulação tem Defesa 26, 50 PV e usa as resistências do colosso.", ataque: { a: 39, d: "6d8", m: 19, t: "P" } }, { n: "Fumos Tóxicos", r: "Quem começa o turno em alcance curto perde 4d6 PV e fica enjoado (Fort CD 38 evita). Veneno.", cd: 38, res: "fortitude", dano: "4d6", tipoDano: "perdaDeVida", condicao: "enjoado" }, { n: "Goblins Consertadores", r: "Goblins internos (imunes a dano, Vontade +3) mantêm a cura acelerada; se forem afetados por qualquer condição, a cura acelerada para." }, { n: "Jato de Chamas", acao: "movimento", r: "Cone de 12 m: 8d8+10 de fogo (Ref CD 38 reduz à metade).", cd: 38, res: "reflexos", dano: "8d8+10", tipoDano: "fogo" }, { n: "Passar por Cima", acao: "completa", r: "Anda até o dobro do deslocamento passando sobre criaturas Grandes ou menores: 6d8+15 de impacto (Ref CD 38 reduz à metade).", cd: 38, res: "reflexos", dano: "6d8+15", tipoDano: "impacto" }, { n: "Varrer", acao: "livre", r: "Uma vez por rodada, ao derrubar um alvo a 0 PV, ataca outra criatura ao alcance." }],
    atr: [15, -1, 10, null, -5, -5], tesouro: "1d6 engrenagens (CD 29; T$ 1.000 cada em matéria-prima para engenhocas)",
  }, "Engenho de guerra purista do tamanho de um moinho, movido por escravos goblins.");
  D("zumbi", "Zumbi", "1/4", "reinoDosMortos", 297, {
    tipo: "mortoVivo", tam: "medio", papel: "lacaio", ini: -1, per: -1, sentidos: ["visão no escuro"], def: 11, fort: 3, ref: -1, von: -1, pv: 20, desl: 6,
    ataques: [{ n: "Mordida", a: 7, d: "1d6+6", t: "P" }], habs: [FRAQ_ZUMBI], atr: [3, -1, 2, null, -1, 0], tesouro: "nenhum",
  }, "Cadáver cambaleante; sozinho é fraco, em horda é perigoso.");
  D("turbaZumbi", "Turba Zumbi", "2", "reinoDosMortos", 297, {
    tipo: "mortoVivo", sub: "bando", tam: "grande", papel: "solo", ini: 1, per: 1, sentidos: ["visão no escuro"], def: 11, fort: 5, ref: 1, von: 1, pv: 100, desl: 6, bando: true,
    ataques: [{ n: "Mordida (bando)", a: 17, d: "2d6+12", t: "P", bando: true }], habs: [BANDO, FRAQ_ZUMBI], atr: [3, -1, 3, null, -1, 0], tesouro: "nenhum",
  }, "Uma massa de zumbis que avança como um só corpo.");
  D("esqueleto", "Esqueleto", "2", "reinoDosMortos", 297, {
    tipo: "mortoVivo", tam: "medio", papel: "lacaio", ini: 7, per: 3, sentidos: ["visão no escuro"], def: 19, fort: 3, ref: 7, von: 12, rd: { corte: 5, frio: 5, perfuracao: 5 }, pv: 14, desl: 9,
    ataques: [{ n: "Espada longa", a: 14, d: "2d8+12", m: 19, t: "C" }], atr: [5, 3, 0, null, 0, -5], equip: "Escudo pesado, espada longa.", tesouro: "nenhum",
  }, "Morto-vivo sem mente, ágil com armas, que segue ordens do criador.");
  D("esqueletoDeElite", "Esqueleto de Elite", "4", "reinoDosMortos", 297, {
    tipo: "mortoVivo", tam: "medio", papel: "lacaio", ini: 10, per: 4, sentidos: ["visão no escuro"], def: 25, fort: 4, ref: 10, von: 16, rd: { corte: 5, frio: 5, perfuracao: 5 }, pv: 60, desl: 6,
    ataques: [{ n: "Espada longa", a: 18, d: "2d8+15", m: 19, x: "2d8 trevas", t: "C" }], atr: [6, 4, 2, null, 0, -5], equip: "Escudo pesado, espada longa, meia armadura.", tesouro: "nenhum",
  }, "Soldado esquelético de Aslothia, mais resistente e mais letal.");
  D("falange", "Falange", "8", "reinoDosMortos", 298, {
    tipo: "mortoVivo", sub: "bando", tam: "grande", papel: "solo", ini: 12, per: 6, sentidos: ["visão no escuro"], def: 25, fort: 6, ref: 12, von: 18, rd: { corte: 5, frio: 5, perfuracao: 5 }, pv: 300, desl: 6, bando: true,
    ataques: [{ n: "Espada longa (bando)", a: 28, d: "4d8+30", m: 19, x: "4d8 trevas", t: "C", bando: true }], habs: [BANDO], atr: [6, 4, 2, null, 0, -5], equip: "Escudos pesados, espadas longas, meias armaduras (1d8 de cada).", tesouro: "nenhum",
  }, "Tropa de esqueletos de elite que defende o Reino dos Mortos.");
  D("aparicao", "Aparição", "5", "reinoDosMortos", 298, {
    tipo: "mortoVivo", tam: "medio", papel: "solo", ini: 10, per: 6, sentidos: ["visão no escuro"], def: 23, fort: 5, ref: 17, von: 11, pv: 110, desl: 0, mov: { voo: 18 }, incorporeo: true, defesasTexto: "incorpóreo",
    ataques: [{ n: "Toque drenante", a: 18, d: "3d8+6", t: "trevas", efeito: "criatura viva faz Fort CD 21: falha fica fraca e a aparição ganha 20 PV temporários cumulativos" }],
    habs: [{ n: "Toque Drenante", r: "Vivo atingido: Fortitude CD 21 ou fica fraco; a aparição ganha 20 PV temporários cumulativos.", cd: 21, res: "fortitude", condicao: "fraco" }, { n: "Vulnerabilidade à Luz do Dia", r: "Sob luz solar natural, fica debilitada." }],
    atr: [null, 6, 0, 0, 2, 2], pericias: { furtividade: 15 }, tesouro: "nenhum",
  }, "Sombra separada do dono que odeia os vivos e drena sua força.");
  D("necromante", "Necromante", "7", "reinoDosMortos", 298, {
    tipo: "humanoide", sub: "elfo", tam: "medio", papel: "especial", ini: 9, per: 9, sentidos: ["visão na penumbra"], def: 23, fort: 7, ref: 14, von: 20, pv: 180, desl: 12, pm: 55,
    ataques: [{ n: "Adaga", a: 22, d: "1d4", m: 19, x: "1d8 trevas", t: "P" }],
    habs: [{ n: "Ergam-se!", acao: "completa", pm: 5, r: "Seis mortos-vivos em alcance curto, agindo a partir da próxima rodada: deslocamento 9 m, ação padrão para 2d8 de trevas num adjacente; For 3, Des 3, Defesa 25, 1 PV; falham em testes opostos; somem mortos ou no fim da cena.", capangas: 6 }, { n: "Sacrificar Servo", acao: "reacao", r: "Uma vez por rodada, ao sofrer dano, sacrifica um morto-vivo conjurado e o dano vira 0." }],
    magias: { como: "mago de 7º nível", cd: 26, cdEscola: { necromancia: 28 }, lista: [{ id: "amedrontar", acao: "padrao", pm: 7, r: "Animais e humanoides escolhidos em alcance curto: apavorados 1d4+1 rodadas e depois abalados (Vontade reduz para abalado)." }, { id: "armaduraArcana", acao: "padrao", pm: 7, r: "+7 na Defesa por um dia." }, { id: "cranioVoadorDeVladislav", acao: "padrao", pm: 6, r: "6d8+6 de trevas numa criatura em alcance médio e abala quem está a 3 m (Fortitude reduz à metade e evita)." }, { id: "toqueVampirico", acao: "padrao", pm: 6, r: "Toque de 10d6 de trevas (Fortitude reduz à metade); cura metade do dano causado." }] },
    atr: [0, 2, 1, 5, 0, 0], pericias: { conhecimento: 14, misticismo: 16 }, equip: "Adaga, essência de mana.", tesouro: "dobro",
  }, "Arcanista de trevas que luta protegido por seus mortos-vivos.");
  D("vampiro", "Vampiro", "12", "reinoDosMortos", 299, {
    tipo: "mortoVivo", tam: "medio", papel: "solo", ini: 15, per: 13, sentidos: ["visão no escuro"], def: 45, fort: 12, ref: 26, von: 20, rd: { naoLuz: 10 }, pv: 550, desl: 18, mov: { escalar: 18 }, curaAcelerada: 10, defesasTexto: "cura acelerada 10, RD 10/luz",
    ataques: [{ n: "Espada longa", a: 36, d: "2d8+5", m: 17, x: "2d10 trevas", q: 2, t: "C" }, { n: "Garra", a: 36, d: "2d6+25", x: "2d10 trevas", t: "C" }],
    habs: [{ n: "Dominação Vampírica", acao: "padrao", r: "Um humanoide em alcance curto fica confuso, enfeitiçado ou fascinado até o fim da cena, ou perde as memórias da última hora (Von CD 29 evita; uma vez por cena por alvo).", cd: 29, res: "vontade" }, { n: "Drenar Sangue", acao: "padrao", r: "Num vivo que esteja agarrando: 6d6 de perfuração e cura o mesmo. Quem morre assim levanta como vampiro na noite seguinte e, perdendo Vontade oposta, fica sob controle dele.", dano: "6d6", tipoDano: "perfuracao" }, { n: "Forma de Morcego", acao: "padrao", r: "Vira morcego Minúsculo (+5 Furtividade, –5 manobras), voo 12 m; termina ao atacar, lançar magia ou sofrer dano." }, { n: "Presença Majestosa", acao: "reacao", r: "Quem o ataca faz Vontade CD 29 ou não consegue feri-lo e perde a ação (quem passa fica imune pela cena).", cd: 29, res: "vontade" }, { n: "Sensibilidade ao Sol", r: "Sob luz solar direta, fica ofuscado e perde 6d6 PV por rodada." }],
    atr: [6, 5, 5, 3, 3, 6], pericias: { diplomacia: 16, enganacao: 16, furtividade: 25, nobreza: 13 }, equip: "Armadura completa delicada de mitral, espada longa precisa de mitral.", tesouro: "dobro",
  }, "Nobre morto-vivo de Aslothia, dependente de sangue e vulnerável ao sol.");
  void ODIO;
})();
