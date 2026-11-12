/* R.A.M.A. — Tormenta20 · magias de 4º círculo (Livro Básico, Jogo do Ano).
   Resumos do RAMA; formato descrito em js/tormenta20/magias.js. */
RAMATormenta20Magias.def("alterarMemoria", "Alterar Memória", "A4", "encan", 179, "padrao|toque|1 criatura|instantanea|Vontade anula",
  "Invade a mente do alvo e altera ou apaga as memórias da última hora.",
  [[2, "m", "Pessoal; área: cone de 4,5 m.", { al: "pessoal", area: "cone de 4,5m", alvo: "" }], [5, "o", "Alcança as memórias das últimas 24 horas."]]);
RAMATormenta20Magias.def("animarObjetos", "Animar Objetos", "A4", "trans", 179, "padrao|medio|até 8 objetos Minúsculos ou Pequenos, 4 Médios, 2 Grandes ou 1 Enorme|cena|",
  "Objetos viram parceiros construtos sob seu controle (fora do limite de parceiros), comandados com ação de movimento. Sem Defesa nem resistências, falham em testes opostos e podem ser alvo de ações hostis. Não afeta itens mágicos nem objetos carregados por outros. Minúsculo: For –3, Des 4, 5 PV (assassino ou combatente iniciante). Pequeno: For –2, Des 2, 10 PV (combatente ou guardião iniciante). Médio: For 0, Des 1, 20 PV (combatente ou guardião veterano). Grande: For 2, Des 0, 40 PV (fortão, guardião ou montaria veterano). Enorme: For 4, Des –2, 80 PV (fortão, guardião ou montaria mestre).",
  [[5, "m", "Permanente; prataria (T$ 1.000). Máximo de objetos animados igual à metade do seu nível.", { du: "permanente", mat: "prataria (T$ 1.000)" }]]);
RAMATormenta20Magias.def("assassinoFantasmagorico", "Assassino Fantasmagórico", "A4", "necro", 181, "padrao|longo|1 criatura|cena, até ser descarregada|Vontade anula, Fortitude parcial",
  "Ilusão daquilo que o alvo mais teme (os outros veem um espectro). Vontade: passando, a magia se dissipa. Falhando, o espectro incorpóreo e imune a magias (salvo dissipação) voa 18 m por rodada até ele no fim do seu turno; terminando adjacente, Fortitude: passa e sofre 6d6 de trevas (sem cair abaixo de 0 PV); falha e cai a –1 PV, sangrando. Some se o alvo ficar inconsciente ou passar do alcance longo.",
  [],
  { dano: "6d6", tipo: "trevas" });
RAMATormenta20Magias.def("campoAntimagia", "Campo Antimagia", "A4", "abjur", 183, "padrao|pessoal|você|sustentada|",
  "Barreira invisível de 3 m de raio que acompanha você e suprime habilidades e itens mágicos dentro dela; convocados somem até o campo acabar. Criaturas mágicas não são afetadas diretamente, mas não usam magia ali. Não é dissipada por magia; artefatos e deuses maiores a ignoram.",
  []);
RAMATormenta20Magias.def("concederMilagre", "Conceder Milagre", "D4", "encan", 184, "padrao|toque|1 criatura|permanente até ser descarregada|",
  "Escolha uma magia de até 2º círculo que você conhece: o alvo a lança uma vez sem pagar o custo (aprimoramentos com os PM dele). Você fica com –3 PM até lá.",
  [[4, "m", "Magia de 3º círculo; penalidade de –6 PM.", { circuloConcedido: 3, penalidadePM: 6 }]],
  { penalidadePM: 3 });
RAMATormenta20Magias.def("conjurarElemental", "Conjurar Elemental", "A4", "conv", 185, "completa|medio|ef:parceiro elemental|sustentada|",
  "Uma porção de elemento vira um elemental Grande que só ajuda você, parceiro mestre destruidor (habilidade por 2 PM) e de mais um tipo, fora do limite de parceiros. Ar (eletricidade): assassino, perseguidor ou vigilante. Água (frio): ajudante, guardião ou médico. Fogo: atirador, combatente ou fortão. Terra (impacto): combatente, guardião ou montaria.",
  [[5, "o", "Elemental Enorme, com dois tipos da lista do elemento."], [5, "o", "Um elemental de cada tipo; cada um ajuda você ou um aliado no alcance.", { r: 5 }]],
  { parceiro: { nivel: "mestre", tipos: ["destruidor"] }, opcoes: ["ar", "agua", "fogo", "terra"] });
RAMATormenta20Magias.def("controlarAGravidade", "Controlar a Gravidade", "A4", "trans", 186, "padrao|medio|area:cubo de 12m de lado|sustentada|",
  "Escolha (ação padrão para trocar). Aumentar: no início dos seus turnos, cada criatura faz Atletismo; passa e fica fatigada, falha e fica fatigada e caída. Inverter: tudo “cai” para cima (1d6 por 1,5 m se bater num teto; sem teto, flutua no topo); quem tem onde se agarrar faz Reflexos. Reduzir: criaturas e objetos Médios ou menores voam 6 m à vontade, +20 em Atletismo para escalar e saltar, –2 em ataques.",
  [],
  { opcoes: ["aumentar", "inverter", "reduzir"] });
RAMATormenta20Magias.def("controlarOClima", "Controlar o Clima", "D4", "trans", 187, "completa|2km|area:esfera com 2km de raio|4d12 horas|",
  "Cria qualquer condição climática na área (chuva, neve, vento, névoa…); efeitos do clima no Capítulo 6.",
  [[1, "m", "Apenas druidas: raio de 3 km e duração 1d4 dias.", { area: "esfera com 3km de raio", du: "1d4 dias", apenasClasse: "druida" }]]);
RAMATormenta20Magias.def("circuloDaRestauracao", "Círculo da Restauração", "D4", "evoc", 184, "padrao|curto|area:esfera com 3m de raio|5 rodadas|",
  "Círculo de luz: criatura viva que termina o turno nele recupera 3d8+3 PV e 1 PM (no máximo 5 PM por dia assim). Mortos-vivos e quem sofre dano por luz perdem o mesmo.",
  [[2, "a", "+1d8+1 de PV por turno."]],
  { cura: "(3 + a0)d8 + (3 + a0)", porTurno: 1 });
RAMATormenta20Magias.def("coleraDeAzgher", "Cólera de Azgher", "D4", "evoc", 184, "padrao|medio|area:esfera com 6m de raio|instantanea|Reflexos parcial",
  "Fulgor dourado: cego por 1d4 rodadas, em chamas e 10d6 de fogo (10d8 em mortos-vivos). Passar evita cegueira e chamas e reduz o dano à metade.",
  [[2, "a", "+2d6 de dano (+2d8 em mortos-vivos)."], [2, "a", "+6 m de raio."], [5, "o", "Dissipa todas as magias de necromancia ativas na área.", { r: 5 }]],
  { dano: "(10 + 2 * a0)d6", danoMortoVivo: "(10 + 2 * a0)d8", tipo: "fogo", cond: "cego", metade: 1 });
RAMATormenta20Magias.def("cupulaDeRepulsao", "Cúpula de Repulsão", "D4", "abjur", 189, "padrao|pessoal|você|sustentada|Vontade anula",
  "Escolha um tipo de criatura ou uma raça: quem for do grupo e tentar chegar a menos de 3 m faz Vontade; falhando, gasta a ação e só tenta de novo na próxima rodada (impede corpo a corpo, não ataques à distância). Se você avançar sobre eles, a magia se rompe.",
  [[2, "m", "Distância mínima de 4,5 m.", { distancia: "4,5m" }], [5, "o", "Ataques e efeitos à distância dessas criaturas também exigem o teste; falhando, são desviados.", { r: 5 }]]);
RAMATormenta20Magias.def("desintegrar", "Desintegrar", "A4", "trans", 190, "padrao|medio|1 criatura ou objeto|instantanea|Fortitude parcial",
  "Raio esverdeado de 10d12 de essência (passando, 2d12). Se os PV do alvo chegarem a 0 ou menos, vira pó.",
  [[4, "a", "+2d12 no dano total e +1d12 no mínimo."]],
  { dano: "(10 + 2 * a0)d12", danoSucesso: "(2 + a0)d12", tipo: "essencia" });
RAMATormenta20Magias.def("duplicataIlusoria", "Duplicata Ilusória", "A4", "ilus", 191, "padrao|medio|ef:cópia ilusória|cena|",
  "Cópia semirreal e intangível de você que imita suas ações; a cada turno, escolha por qual corpo vê e ouve. Magias de toque ou mais podem sair da cópia. Para agir diferente, ação de movimento. Quem interage com ela faz Vontade para perceber a ilusão. Some se sair do alcance.",
  [[3, "a", "+1 cópia."]]);
RAMATormenta20Magias.def("explosaoCaleidoscopica", "Explosão Caleidoscópica", "A4", "ilus", 193, "padrao|curto|area:esfera com 6m de raio|instantanea|Fortitude parcial",
  "Luzes e sons desorientam, conforme o nível ou ND. Até 4: falha inconsciente; passa atordoado 1d4 rodadas e enjoado pela cena. De 5 a 9: falha atordoado 1d4 rodadas e enjoado pela cena; passa atordoado 1 rodada e enjoado 1d4. 10 ou mais: falha atordoado 1 rodada e enjoado 1d4; passa desprevenido e enjoado 1 rodada. Atordoa cada criatura só uma vez por cena.",
  [],
  { porND: [[4, "inconsciente"], [9, "atordoado"], [99, "atordoado"]] });
RAMATormenta20Magias.def("formaEterea", "Forma Etérea", "A4", "trans", 193, "completa|pessoal|você|sustentada|",
  "Você e o equipamento vão ao plano etéreo: invisível (alterna como ação livre), incorpóreo, move-se em qualquer direção e percebe o mundo físico em cinza até 18 m. Só abjuração e essência o afetam; não ataca nem lança magias no plano material. Materializar-se é uma ação de movimento (em espaço ocupado, é empurrado e sofre 1d6 por 1,5 m).",
  [[5, "m", "Toque; até 5 criaturas voluntárias de mãos dadas (podem soltar depois).", { al: "toque", alvo: "até 5 criaturas voluntárias", r: 5 }]],
  { efeitos: [{ t: "estado", valor: "etereo" }] });
RAMATormenta20Magias.def("guardiaoDivino", "Guardião Divino", "D4", "conv", 194, "padrao|curto|ef:elemental de luz invocado|cena ou até ser descarregado|",
  "Orbe Pequeno de luz divina, incorpóreo e imune a dano, que ilumina como tocha e tem 100 pontos de luz. Uma vez por rodada, no seu turno, voa 18 m e gasta pontos para curar criaturas em alcance curto: 1 PV por ponto ou uma condição por 3 pontos (abalado, apavorado, alquebrado, atordoado, cego, confuso, debilitado, enjoado, esmorecido, exausto, fascinado, fatigado, fraco, frustrado, ofuscado, pasmo, sangrando, surdo ou vulnerável). Acaba sem pontos.",
  [],
  { reserva: { nome: "pontos de luz", total: 100 } });
RAMATormenta20Magias.def("ligacaoSombria", "Ligação Sombria", "D4", "necro", 196, "padrao|longo|1 criatura|1 dia|Fortitude anula",
  "Marca idêntica em você e no alvo: sempre que você sofrer dano ou condição, ele faz Fortitude; falhando, sofre o mesmo. Termina se ele chegar a 0 PV.",
  [[5, "o", "Não termina a 0 PV (o dano pode matá-lo)."]]);
RAMATormenta20Magias.def("libertacao", "Libertação", "U4", "abjur", 196, "padrao|curto|1 criatura|cena|",
  "O alvo fica imune a efeitos de movimento, ignora tudo que impeça ou restrinja seu deslocamento e usa habilidades que exigem liberdade de movimentos mesmo de armadura ou escudo.",
  [[2, "o", "Caminha sobre água e outros líquidos (sem proteção contra os efeitos deles)."], [2, "o", "Pode escolher 20 em todos os testes de Atletismo."], [2, "o", "Pode escolher 20 em Acrobacia e fazer as manobras dela sem treino."], [5, "m", "Alcance curto; até 5 criaturas.", { alvo: "até 5 criaturas" }], [5, "o", "Pode dissipar Aprisionamento."]],
  { efeitos: [{ t: "ignoraReducaoDeslocamento" }, { t: "imune", valor: "movimento" }] });
RAMATormenta20Magias.def("mantoDoCruzado", "Manto do Cruzado", "D4", "evoc", 197, "padrao|pessoal|você|sustentada|",
  "Manto de energia divina em duas versões; escolha uma ao aprender (não muda). Luz: no início de cada turno seu, você e aliados em alcance curto recuperam 2d8 PV; você fica imune a trevas e seus ataques corpo a corpo causam +2d8 de luz. Trevas: no início de cada turno seu, inimigos em alcance curto sofrem 4d8 de trevas e você cura metade do dano causado.",
  [],
  { versaoAoAprender: ["luz", "trevas"], porTurno: 1 });
RAMATormenta20Magias.def("marionete", "Marionete", "A4", "encan", 198, "padrao|medio|1 criatura|sustentada|Fortitude anula",
  "Controla o sistema nervoso do alvo: ao lançar e no início de cada turno seu, ele faz Fortitude (passa e anula). Falhando, você controla todas as ações físicas dele naquele turno (ele ainda percebe e fala com esforço, sem lançar magias). Sem linha de efeito, ele fica paralisado até você retomar.",
  []);
RAMATormenta20Magias.def("muralhaDeOssos", "Muralha de Ossos", "U4", "necro", 199, "padrao|medio|ef:muro de ossos|cena|",
  "Parede de ossos de 15 m × 9 m × 1,5 m, em qualquer forma apoiada no chão. Ao surgir, quem está no lugar ou adjacente sofre 4d8 de corte e faz Reflexos para não ficar agarrado (ação padrão e Atletismo para sair; falhando, mais 4d8). Cada trecho de 3 m: Defesa 8, 40 PV, redução de corte, frio e perfuração 10. Escalar exige Atletismo e causa 4d8 de corte a cada 3 m.",
  [[3, "a", "+15 m de comprimento e +3 m de altura."], [5, "o", "Esqueletos animados: quem começa o turno adjacente ou escalando faz Reflexos ou fica agarrado."]],
  { dano: "4d8", tipo: "corte" });
RAMATormenta20Magias.def("maoPoderosaDeTalude", "Mão Poderosa de Talude", "A4", "conv", 197, "padrao|medio|ef:mão gigante de energia|sustentada|",
  "Mão Grande flutuante que se põe entre você e um oponente escolhido: cobertura leve (+5 na Defesa) contra ele, sem ser enganada. Defesa 20, PV e resistências iguais aos seus. Ação de movimento: troca de oponente ou Agarrar (Misticismo +10), Esmagar um agarrado (2d6+10 de impacto) ou Empurrar (Misticismo +10).",
  [[2, "a", "+1d6+5 de dano."], [5, "m", "Bônus em Misticismo vira +20.", { bonusManobra: 20, r: 5 }]],
  { dano: "(2 + a0)d6 + (10 + 5 * a0)", tipo: "impacto", manobra: { pericia: "misticismo", bonus: "a1 ? 20 : 10" } });
RAMATormenta20Magias.def("premonicao", "Premonição", "D4", "adiv", 201, "padrao|pessoal|você|cena|",
  "Uma vez por rodada, rola de novo um teste recém-feito e fica com o novo resultado.",
  [[3, "m", "Reação, alcance curto, 1 criatura, instantânea: obriga quem acabou de fazer um teste a rolar de novo e aceitar (involuntária: Vontade nega).", { ex: "reacao", al: "curto", alvo: "1 criatura", du: "instantanea", substitui: 1 }], [10, "m", "Duração 1 dia.", { du: "1 dia" }]]);
RAMATormenta20Magias.def("raioPolar", "Raio Polar", "A4", "evoc", 203, "padrao|medio|1 criatura|instantanea|Fortitude parcial",
  "10d8 de dano de frio e preso num bloco de gelo (paralisado). Passar reduz à metade e deixa só lento por 1 rodada. O bloco tem 20 PV, RD 10 e vulnerabilidade a fogo; o preso usa ação completa e Atletismo para causar 10 de dano nele, ignorando a RD.",
  [[3, "a", "+2d8 de dano."], [5, "m", "Área: esfera de 6 m de raio (bola de gelo).", { area: "esfera com 6m de raio", alvo: "" }]],
  { dano: "(10 + 2 * a0)d8", tipo: "frio", cond: "paralisado", metade: 1 });
RAMATormenta20Magias.def("relampagoFlamejanteDeReynard", "Relâmpago Flamejante de Reynard", "A4", "evoc", 203, "duas rodadas|medio|ef:bolas de fogo e relâmpagos|sustentada|Reflexos reduz à metade",
  "Uma mão em chamas e outra eletrificada. Ação de movimento: bola de fogo (10d6 de fogo em esfera de 6 m) ou relâmpago (10d6 de eletricidade em linha). Ação padrão, com as duas mãos livres: rajada mista de 20d12 (metade fogo, metade eletricidade) em esfera de 9 m, que encerra a magia. A execução não pode ser reduzida.",
  [[2, "a", "+1d6 nas rajadas e +2d12 na rajada mista."]],
  { dano: "(10 + a0)d6", danoMisto: "(20 + 2 * a0)d12", tipo: "fogo", metade: 1, execucaoFixa: 1 });
RAMATormenta20Magias.def("sonho", "Sonho", "A4", "adiv", 207, "10 minutos|ilimitado|1 criatura viva|veja texto|",
  "Entra nos sonhos de uma criatura e conversa com ela até que acorde (pode esperar em transe até ela dormir; em transe você fica indefeso). Sair do transe encerra a magia.",
  [[2, "o", "Pesadelo: Vontade (com os modificadores de Vidência); falhando, não recupera PV nem PM na noite, sofre 1d10 de trevas e acorda fatigado."], [1, "a", "+1 alvo (todos compartilham o sonho).", { alvos: 1 }]]);
RAMATormenta20Magias.def("talhoInvisivelDeEdauros", "Talho Invisível de Edauros", "A4", "evoc", 207, "padrao|pessoal|area:cone de 9m|instantanea|Fortitude parcial",
  "Lâmina de ar: 10d8 de corte e sangrando. Passar reduz à metade e evita o sangramento.",
  [[2, "a", "+2d8 de dano."], [2, "m", "Alvo: você, sustentada: uma vez por rodada, ação de movimento, lança uma lâmina num alvo em alcance médio (6d8 de corte, Fortitude reduz à metade).", { area: "", alvo: "você", du: "sustentada", substitui: 1 }]],
  { dano: "a1 ? (6 + 2 * a0) + 'd8' : (10 + 2 * a0) + 'd8'", tipo: "corte", cond: "sangrando", metade: 1 });
RAMATormenta20Magias.def("terremoto", "Terremoto", "D4", "evoc", 209, "padrao|longo|area:esfera com 30m de raio|1 rodada|veja texto",
  "Tremor de uma rodada: criaturas no solo ficam atordoadas (uma vez por cena). Caverna: o teto cai, 12d6 de impacto e agarrado (Reflexos reduz à metade e evita). Construção: 200 de dano nas estruturas; quem estiver numa que desabe sofre como na caverna. Espaço aberto: role um dado por criatura; ímpar abre fenda (Reflexos ou cai; ação completa e Atletismo para sair); no próximo turno as fendas fecham e matam quem estiver nelas. Penhasco: desmoronamento de 12d6 e agarrado. Água ou pântano: lamaçal agarra (Reflexos evita) e pode afogar. Agarrados sofrem 1d6 por rodada até se soltarem (ação completa e Atletismo).",
  [],
  { dano: "12d6", tipo: "impacto", cond: "atordoado", opcoes: ["caverna", "construcao", "aberto", "penhasco", "agua"] });
RAMATormenta20Magias.def("viagemPlanar", "Viagem Planar", "U4", "conv", 211, "completa|toque|pessoal|instantanea|",
  "Viaja para outro plano, chegando a 1d100 × 10 km do destino. Componente: bastão em forquilha de metal precioso (T$ 1.000); o metal define o plano.",
  [[2, "m", "Alvo: até cinco criaturas voluntárias que você toca.", { alvo: "até 5 criaturas voluntárias" }]],
  { mat: "bastão em forquilha de metal precioso (T$ 1.000)" });
RAMATormenta20Magias.def("visaoDaVerdade", "Visão da Verdade", "U4", "adiv", 211, "movimento|pessoal|você|cena|",
  "Enxerga a forma real: através de camuflagem e escuridão (normais e mágicas) e de ilusões e transmutações.",
  [[1, "m", "Toque; alvo: 1 criatura.", { al: "toque", alvo: "1 criatura" }], [1, "o", "+10 em Percepção."], [2, "o", "+10 em Intuição."], [4, "o", "Enxerga através de paredes e barreiras de até 30 cm."]],
  { efeitos: [{ t: "bonus", alvo: "pericia.percepcao", valor: "a1 ? 10 : 0", categoria: "magia" }, { t: "bonus", alvo: "pericia.intuicao", valor: "a2 ? 10 : 0", categoria: "magia" }, { t: "sentido", valor: "visaoDaVerdade" }] });
