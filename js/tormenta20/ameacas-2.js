/* R.A.M.A. — Tormenta20 · ameaças: Ermos e Puristas (Livro Básico, p. 291–296).
   Formato em js/tormenta20/ameacas.js. Resumos do RAMA. */
(function () {
  var D = RAMATormenta20Ameacas.def;
  var ODIO = { n: "Ódio Puro", r: "+5 em Vontade seguindo ordens de um purista de ND maior; +2 no dano contra humanoides não humanos (p. 295).", danoContra: { valor: 2, tipo: "humanoideNaoHumano" } };
  var FORMACAO = { n: "Lutar em Formação", r: "Adjacente a um aliado com esta habilidade, +2 em ataque e Defesa." };
  D("trog", "Trog", "1", "ermos", 291, {
    tipo: "humanoide", sub: "trog", tam: "medio", papel: "lacaio", ini: 3, per: 0, sentidos: ["visão no escuro"], def: 16, fort: 10, ref: 5, von: 1, pv: 11, desl: 9,
    ataques: [{ n: "Lança", a: 11, d: "1d6+5", t: "P" }, { n: "Mordida", a: 11, d: "1d6+5", t: "P" }, { n: "Azagaia", a: 9, d: "1d6+5", t: "P", dist: true, alc: "medio" }],
    habs: [{ n: "Mau Cheiro", acao: "padrao", r: "Criaturas (menos trogs) em alcance curto ficam enjoadas 1d6 rodadas (Fort CD 15 evita; quem passa fica imune por um dia). Veneno.", cd: 15, res: "fortitude", condicao: "enjoado" }, { n: "Sangue Frio", r: "+1 de dano por dado de dano de frio." }],
    vulner: [], atr: [3, 1, 3, -2, 0, -1], pericias: { furtividade: 7 }, equip: "2 azagaias, lança.", tesouro: "metade",
  }, "Homem-lagarto camaleônico que embosca no escuro e odeia anões.");
  D("loboDasCavernas", "Lobo-das-Cavernas", "2", "ermos", 292, {
    tipo: "animal", tam: "grande", papel: "lacaio", ini: 5, per: 7, sentidos: ["faro", "visão na penumbra"], def: 19, fort: 11, ref: 7, von: 6, pv: 73, desl: 15,
    ataques: [{ n: "Mordida", a: 13, d: "2d6+10", t: "P" }],
    habs: [{ n: "Derrubar", acao: "livre", r: "Ao acertar a mordida, pode derrubar (teste +15)." }, { n: "Táticas de Alcateia", r: "Flanqueando, +2 no ataque e no dano além do bônus normal." }],
    atr: [6, 2, 5, -4, 2, -2], pericias: { sobrevivencia: 11 }, tesouro: "nenhum",
  }, "Lobo pré-histórico com placas no dorso, usado como montaria por goblinoides.");
  D("caoDoInferno", "Cão do Inferno", "3", "ermos", 292, {
    tipo: "espirito", tam: "grande", papel: "solo", ini: 6, per: 4, sentidos: ["faro", "visão no escuro"], def: 21, fort: 11, ref: 9, von: 7, imune: ["fogo"], rd: { naoMagico: 10 }, vulner: ["frio"], pv: 95, desl: 12,
    ataques: [{ n: "Mordida", a: 14, d: "2d6+6", x: "2d6 fogo", t: "P" }],
    habs: [{ n: "Sopro", acao: "padrao", recarga: "movimento", r: "Cone de 6 m: 4d6+4 de fogo (Ref CD 17 reduz à metade).", cd: 17, res: "reflexos", dano: "4d6+4", tipoDano: "fogo" }],
    atr: [6, 3, 4, -2, 1, -2], pericias: { atletismo: 9 }, tesouro: "1d4 doses de essência abissal (CD 18 para extrair)", defesasTexto: "RD 10/mágico",
  }, "Fera ígnea de planos divinos trazida por conjuradores malignos.");
  D("grifo", "Grifo", "3", "ermos", 292, {
    tipo: "monstro", tam: "grande", papel: "solo", ini: 9, per: 7, sentidos: ["visão no escuro"], def: 19, fort: 9, ref: 15, von: 4, imune: ["medo"], pv: 110, desl: 12, mov: { voo: 24 },
    ataques: [{ n: "Mordida", a: 14, d: "2d6+5", t: "P" }, { n: "Garra", a: 14, d: "1d6+5", q: 2, t: "C" }],
    habs: [{ n: "Bote", acao: "completa", r: "Investida com mordida e duas garras no mesmo alvo, todas com +2 da investida." }],
    atr: [5, 4, 3, -4, 2, -1], tesouro: "Ninho: 25% de chance de 1d4 ovos de T$ 2.500 cada",
  }, "Leão com asas e cabeça de águia, entre os voadores mais rápidos de Arton.");
  D("basilisco", "Basilisco", "4", "ermos", 293, {
    tipo: "monstro", tam: "medio", papel: "solo", ini: 6, per: 5, sentidos: ["visão no escuro"], def: 23, fort: 10, ref: 9, von: 9, rd: { geral: 5 }, pv: 145, desl: 9, mov: { natacao: 9 },
    ataques: [{ n: "Mordida", a: 16, d: "2d8+12", t: "P", efeito: "veneno: peçonha concentrada" }],
    habs: [{ n: "Olhar Petrificante", r: "No início do turno dele, cada personagem em alcance curto faz Reflexos CD 18: falha fica lento; já lento, petrificado para sempre. Fechar os olhos (reação) dá imunidade, mas cego por 1 rodada. Remover paralisia reverte. Metamorfose.", cd: 18, res: "reflexos", condicao: "lento" }, { n: "Veneno", r: "Peçonha concentrada: perde 1d12 PV por rodada por 3 rodadas (Fort CD 18 reduz para 1 rodada).", cd: 18, res: "fortitude", dano: "1d12", tipoDano: "perdaDeVida" }],
    atr: [4, 2, 4, -4, 1, 0], tesouro: "1d4 doses de peçonha concentrada (CD 19); couro de basilisco (CD 19, T$ 1.000 em matéria-prima para armadura superior)",
  }, "Lagarto venenoso cujo olhar transforma em pedra.");
  D("ogro", "Ogro", "4", "ermos", 293, {
    tipo: "humanoide", sub: "gigante", tam: "grande", papel: "solo", ini: 3, per: 1, sentidos: ["visão na penumbra"], def: 23, fort: 16, ref: 10, von: 0, pv: 130, desl: 9,
    ataques: [{ n: "Tacape", a: 16, d: "1d12+18", t: "I" }],
    habs: [{ n: "Burro Demais...", r: "–5 em Intuição e Vontade (já na ficha)." }, { n: "...Para Morrer!", r: "Dano de corte, impacto e perfuração sofrido é reduzido à metade.", metadeFisico: true }],
    atr: [7, 0, 4, -3, -2, -2], pericias: { atletismo: 12, intuicao: -5 }, equip: "Tacape aumentado.", tesouro: "padrao",
  }, "Gigante bruto e fácil de enganar, às vezes a serviço de bandidos ou cultistas.");
  D("ursoCoruja", "Urso-Coruja", "4", "ermos", 293, {
    tipo: "monstro", tam: "grande", papel: "solo", ini: 7, per: 5, sentidos: ["faro", "visão no escuro"], def: 23, fort: 16, ref: 10, von: 5, pv: 145, desl: 12,
    ataques: [{ n: "Mordida", a: 16, d: "1d8+5", t: "P" }, { n: "Garra", a: 15, d: "1d6+5", q: 2, t: "C" }],
    habs: [{ n: "Agarrar Aprimorado", acao: "livre", r: "Ao acertar uma garra, pode agarrar (teste +18)." }],
    atr: [7, 3, 5, -4, 1, -2], tesouro: "nenhum",
  }, "Urso emplumado com cabeça de coruja, agressivo com tudo que se move.");
  D("serpe", "Serpe", "5", "ermos", 293, {
    tipo: "monstro", tam: "grande", papel: "solo", ini: 5, per: 7, sentidos: ["faro", "visão no escuro"], def: 24, fort: 10, ref: 16, von: 5, imune: ["paralisado"], pv: 200, desl: 9, mov: { voo: 18 },
    ataques: [{ n: "Mordida", a: 17, d: "2d6+12", t: "P" }, { n: "Ferrão", a: 17, d: "1d8+12", t: "P", efeito: "veneno: peçonha concentrada" }],
    habs: [{ n: "Agarrar Aprimorado", acao: "livre", r: "Ao acertar a mordida, pode agarrar (teste +19)." }, { n: "Veneno", r: "Peçonha concentrada: perde 1d12 PV por rodada por 3 rodadas (Fort CD 20 reduz para 1 rodada).", cd: 20, res: "fortitude", dano: "1d12", tipoDano: "perdaDeVida" }],
    atr: [6, 1, 6, -2, 1, -1], tesouro: "1d4 doses de peçonha concentrada (CD 20)",
  }, "Réptil alado sem braços, com ferrão de veneno poderoso.");
  D("recrutaPurista", "Recruta Purista", "1/2", "puristas", 294, {
    tipo: "humanoide", sub: "humano", tam: "medio", papel: "lacaio", ini: 3, per: 0, def: 16, fort: 6, ref: 2, von: 0, pv: 10, desl: 6,
    ataques: [{ n: "Alabarda", a: 8, d: "1d10+5", c: 3, t: "C" }], habs: [FORMACAO, ODIO],
    atr: [2, 1, 2, -1, -1, 0], equip: "Alabarda, cota de malha.", tesouro: "nenhum",
  }, "A ralé do exército da Supremacia.");
  D("soldadoPurista", "Soldado Purista", "1", "puristas", 294, {
    tipo: "humanoide", sub: "humano", tam: "medio", papel: "lacaio", ini: 4, per: 1, def: 20, fort: 10, ref: 4, von: 1, pv: 20, desl: 6,
    ataques: [{ n: "Espada bastarda", a: 9, d: "1d10+9", m: 19, t: "C" }, { n: "Besta pesada", a: 7, d: "1d12+4", m: 19, t: "P", dist: true, alc: "medio" }], habs: [FORMACAO, ODIO],
    atr: [3, 1, 3, 0, -1, 0], equip: "Besta pesada, escudo pesado, espada bastarda, meia armadura, 10 virotes.", tesouro: "metade",
  }, "Soldado doutrinado desde a infância nos campos da Supremacia.");
  D("sargentoMor", "Sargento-Mor", "3", "puristas", 294, {
    tipo: "humanoide", sub: "humano", tam: "medio", papel: "solo", ini: 4, per: 3, def: 24, fort: 14, ref: 9, von: 5, pv: 105, desl: 6,
    ataques: [{ n: "Espada bastarda", a: 14, d: "1d12+15", m: 19, t: "C" }, { n: "Besta pesada", a: 12, d: "1d12+10", m: 19, t: "P", dist: true, alc: "medio" }],
    habs: [FORMACAO, { n: "Varrer", acao: "livre", r: "Uma vez por rodada, ao derrubar um alvo a 0 PV com ataque corpo a corpo, ataca outra criatura ao alcance." }, ODIO],
    atr: [4, 1, 4, 0, 0, 0], equip: "Armadura completa, besta pesada, escudo pesado, espada bastarda aumentada certeira, 20 virotes.", tesouro: "padrao",
  }, "Veterano que lidera o batalhão pelo exemplo.");
  D("capelaoDeGuerra", "Capelão de Guerra", "4", "puristas", 295, {
    tipo: "humanoide", sub: "humano", tam: "medio", papel: "especial", ini: 4, per: 7, def: 21, fort: 10, ref: 5, von: 16, imune: ["medo"], pv: 105, desl: 6, pm: 25,
    ataques: [{ n: "Martelo de guerra", a: 14, d: "1d8+15", c: 3, t: "I" }],
    magias: { como: "clérigo de 5º nível", cd: 18, lista: [{ id: "armaMagica", acao: "padrao", pm: 5, r: "Uma arma fica mágica: +2 em ataque e dano e +1d6 de fogo." }, { id: "bencao", acao: "padrao", pm: 3, r: "Aliados em alcance curto: +2 em ataque e dano até o fim da cena." }, { id: "curarFerimentos", acao: "padrao", pm: 5, r: "Uma criatura adjacente cura 6d8+6 PV." }, { id: "socoDeArsenal", acao: "padrao", pm: 5, r: "Uma criatura em alcance médio: 5d6+5 de impacto e empurrada 3 m (Fortitude reduz à metade e evita)." }] },
    habs: [ODIO], atr: [4, 0, 4, 1, 3, -1], pericias: { misticismo: 5, religiao: 7 }, equip: "Armadura completa, escudo leve, martelo de guerra certeiro, símbolo sagrado.", tesouro: "padrao",
  }, "Fanático do Templo da Pureza Divina que acompanha os batalhões.");
  D("capitaoBaluarte", "Capitão-Baluarte", "5", "puristas", 295, {
    tipo: "humanoide", sub: "humano", tam: "medio", papel: "especial", ini: 4, per: 5, def: 33, fort: 15, ref: 5, von: 13, pv: 115, desl: 6,
    ataques: [{ n: "Espada longa", a: 17, d: "1d8+8", m: 19, t: "C" }],
    habs: [{ n: "Comandar", acao: "padrao", r: "Aliados em alcance médio: +4 em ataque e dano até o fim da rodada." }, { n: "Formação Invencível", r: "Aliados em alcance curto: +2 na Defesa." }, ODIO],
    atr: [3, 0, 4, 3, 1, 4], pericias: { cavalgar: 4, guerra: 7, nobreza: 7 }, equip: "Armadura completa reforçada, escudo pesado reforçado, espada longa certeira.", tesouro: "dobro",
  }, "Jovem nobre treinado para conduzir as investidas da tropa.");
  D("cavaleiroDoLeopardo", "Cavaleiro do Leopardo Sangrento", "9", "puristas", 295, {
    tipo: "humanoide", sub: "humano", tam: "medio", papel: "especial", ini: 17, per: 15, def: 36, fort: 21, ref: 11, von: 17, imune: ["medo"], pv: 270, desl: 9, pm: 58,
    ataques: [{ n: "Espada bastarda", a: 28, d: "3d6+15", m: 19, t: "C" }],
    magias: { como: "mago de 9º nível (lança magias arcanas de armadura sem teste; ao agredir corpo a corpo, uma magia como ação livre por rodada)", cd: 28, lista: [{ id: "concentracaoDeCombate", acao: "padrao", pm: 3, r: "Até o fim da cena, rola dois dados nos ataques e usa o melhor." }, { id: "dissiparMagia", acao: "padrao", pm: 3, r: "Teste de Misticismo dissipa magias com CD menor num alvo ou esfera de 3 m em alcance médio." }, { id: "peleDePedra", acao: "padrao", pm: 6, r: "RD 5 até o fim da cena." }, { id: "toqueChocante", acao: "padrao", pm: 9, r: "Ataque corpo a corpo que, acertando, causa mais 8d8+8 de eletricidade." }, { id: "velocidade", acao: "padrao", pm: 3, r: "Sustentada: uma ação padrão extra por turno (não para magias)." }] },
    habs: [ODIO], atr: [5, 2, 4, 4, 0, 2], pericias: { furtividade: 8, intimidacao: 17, misticismo: 19 }, equip: "Armadura completa reforçada, espada bastarda aumentada pungente de adamante.", tesouro: "padrao",
  }, "Guarda-costas e assassino de elite, purista entre os puristas.");
})();
