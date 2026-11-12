/* R.A.M.A. — Tormenta20 · magias de 2º círculo (Livro Básico, Jogo do Ano).
   Resumos do RAMA; formato descrito em js/tormenta20/magias.js. */
RAMATormenta20Magias.def("aliadoAnimal", "Aliado Animal", "D2", "encan", 178, "padrao|curto|1 animal prestativo|1 dia|",
  "Vínculo mental com um animal prestativo, que obedece mesmo arriscando a vida. Funciona como parceiro veterano de um tipo à sua escolha: ajudante, combatente, fortão, guardião, montaria ou perseguidor.",
  [[1, "m", "Alvo: 1 animal Minúsculo por 1 semana: leva um item ou mensagem a um local e espera lá, deixando só quem você escolheu pegar o que carrega.", { alvo: "1 animal Minúsculo", du: "1 semana", substitui: 1 }], [7, "m", "O parceiro é mestre.", { parceiro: "mestre", r: 3 }], [12, "m", "Alvo: 2 animais prestativos, parceiros de tipos diferentes (respeitando seu limite de parceiros).", { alvo: "2 animais prestativos", r: 4 }]],
  { parceiro: { nivel: "veterano", tipos: ["ajudante", "combatente", "fortao", "guardiao", "montaria", "perseguidor"] } });
RAMATormenta20Magias.def("alterarTamanho", "Alterar Tamanho", "A2", "trans", 179, "padrao|curto|1 objeto|1 dia|",
  "Aumenta ou diminui um item mundano em até três categorias e pode mudar a consistência (rígido ou flexível) sem alterar RD nem PV. Objeto de criatura involuntária: Vontade anula.",
  [[1, "a", "+1 alvo.", { alvos: 1 }], [2, "m", "Toque, 1 criatura: aumenta uma categoria de tamanho e ganha Força +2 (involuntária: Fortitude anula).", { al: "toque", alvo: "1 criatura", substitui: 1, efeitoAlvo: "aumentar" }], [3, "m", "Toque, 1 criatura: diminui uma categoria de tamanho e ganha Destreza +2 (involuntária: Fortitude anula).", { al: "toque", alvo: "1 criatura", substitui: 1, efeitoAlvo: "diminuir", r: 3 }], [7, "m", "Toque, 1 criatura, permanente, Fortitude anula: vira Minúsculo, Força –5 e deslocamentos 3 m.", { al: "toque", alvo: "1 criatura", du: "permanente", res: "Fortitude anula", substitui: 1, efeitoAlvo: "encolher", r: 4 }]],
  { efeitosPorOpcao: { aumentar: [{ t: "tamanhoPasso", valor: 1 }, { t: "bonus", alvo: "atr.for", valor: 2, categoria: "magia" }], diminuir: [{ t: "tamanhoPasso", valor: -1 }, { t: "bonus", alvo: "atr.des", valor: 2, categoria: "magia" }] } });
RAMATormenta20Magias.def("amarrasEtereas", "Amarras Etéreas", "A2", "conv", 179, "padrao|medio|1 criatura|cena|Reflexos anula",
  "Três laços de energia deixam o alvo agarrado. Ação padrão e Atletismo destrói um laço, mais um a cada 5 pontos acima da CD. Cada laço tem Defesa 10, 10 PV, RD 5 e imunidade a dano mágico; destruídos todos, a magia acaba. Afeta incorpóreos.",
  [[2, "a", "+1 alvo.", { alvos: 1 }], [2, "a", "+1 laço num alvo (limite pelo círculo máximo).", { lim: "circuloMax" }], [3, "o", "Cada laço cai com um único ataque, mas solta um choque de 1d8+1 de essência na criatura presa.", { r: 3 }]],
  { cond: "agarrado" });
RAMATormenta20Magias.def("aparenciaPerfeita", "Aparência Perfeita", "A2", "ilus", 180, "padrao|pessoal|você|cena|",
  "Aparência idealizada: Carisma +2 se já for 5 ou mais; senão, vira 5 (conta como bônus). +5 em Diplomacia e Enganação. Quem nota a mudança tende a desconfiar. No fim da cena, pode pagar o custo de novo (ação livre) para manter. Não dá PV nem PM extras.",
  [[1, "m", "Toque; alvo: 1 humanoide.", { al: "toque", alvo: "1 humanoide" }]],
  { efeitos: [{ t: "bonus", alvo: "atr.car", valor: "atr.car >= 5 ? 2 : 5 - atr.car", categoria: "magia", semPVPM: 1 }, { t: "bonus", alvo: "pericia.diplomacia", valor: 5, categoria: "magia" }, { t: "bonus", alvo: "pericia.enganacao", valor: 5, categoria: "magia" }] });
RAMATormenta20Magias.def("augurio", "Augúrio", "D2", "adiv", 181, "completa|pessoal|você|instantanea|",
  "Diz se uma ação em até uma hora trará felicidade, miséria, ambas ou nada. O mestre rola 1d6 em segredo: 1 falha e responde “nada”. Repetir sobre o mesmo assunto dá o primeiro resultado.",
  [[3, "m", "Execução 1 minuto: uma pergunta a uma divindade sobre algo em até um dia; com 2–6, recebe uma frase, profecia ou enigma.", { ex: "1 minuto", substitui: 1, r: 3 }], [7, "m", "Execução 10 minutos, duração 1 minuto: uma pergunta de sim/não/não sei por rodada (falha em cada uma responde “não sei”).", { ex: "10 minutos", du: "1 minuto", substitui: 1, r: 4 }], [7, "m", "O mestre rola 1d12 (falha só no 1).", { chance: "1d12" }], [12, "m", "O mestre rola 1d20 (falha só no 1).", { chance: "1d20" }]],
  { chanceFalha: "1d6" });
RAMATormenta20Magias.def("bolaDeFogo", "Bola de Fogo", "A2", "evoc", 182, "padrao|medio|area:esfera com 6m de raio|instantanea|Reflexos reduz à metade",
  "Explosão de 6d6 de dano de fogo em todas as criaturas e objetos soltos na área.",
  [[2, "a", "+2d6 de dano."], [2, "m", "Efeito: esfera flamejante de 1,5 m, duração cena: 3d6 em quem estiver no espaço dela (uma vez por rodada); ação de movimento para voá-la 9 m. Imune a dano, apagável com água.", { area: "", ef: "esfera flamejante Média", du: "cena", substitui: 1 }], [3, "m", "Duração 1 dia ou até descarregar: pedra flamejante (arremesso, alcance curto) que detona como reação, causando o dano da magia em esfera de 6 m.", { du: "1 dia ou até descarregar" }]],
  { dano: "a1 ? (3 + 2 * a0) + 'd6' : (6 + 2 * a0) + 'd6'", tipo: "fogo", metade: 1 });
RAMATormenta20Magias.def("campoDeForca", "Campo de Força", "A2", "abjur", 183, "padrao|pessoal|você|cena|",
  "Película protetora: 30 PV temporários.",
  [[1, "m", "Reação, instantânea: RD 30 contra o próximo dano.", { ex: "reacao", du: "instantanea", substitui: 1 }], [3, "m", "PV temporários ou RD viram 50.", { valor: 50, r: 3 }], [7, "m", "PV temporários ou RD viram 70.", { valor: 70, r: 4 }], [7, "m", "Alcance curto, outra criatura ou objeto solto Enorme ou menor, sustentada: esfera imóvel que nada atravessa (Reflexos evita ser preso, ao lançar e a cada concentração).", { al: "curto", alvo: "outra criatura ou objeto Enorme ou menor", du: "sustentada", substitui: 1, r: 4 }], [9, "m", "Como o anterior, e o conteúdo quase sem peso: ação livre por rodada para flutuar a esfera 9 m.", { al: "curto", alvo: "outra criatura ou objeto Enorme ou menor", du: "sustentada", substitui: 1, r: 4 }]],
  { pvTemp: "a0 ? '0' : (a2 ? '70' : (a1 ? '50' : '30'))" });
RAMATormenta20Magias.def("camuflagemIlusoria", "Camuflagem Ilusória", "A2", "ilus", 183, "padrao|toque|1 criatura|cena|",
  "A imagem do alvo fica nublada: camuflagem leve.",
  [[3, "m", "Sustentada: a chance de falha da camuflagem leve sobe para 50%.", { du: "sustentada" }], [7, "m", "Alcance curto; alvo: criaturas escolhidas.", { al: "curto", alvo: "criaturas escolhidas", r: 4 }]],
  { efeitos: [{ t: "camuflagem", valor: "a0 ? 50 : 20" }] });
RAMATormenta20Magias.def("condicao", "Condição", "D2", "adiv", 185, "padrao|curto|até 5 criaturas|cena|",
  "Você sabe posição e estado (PV atuais, condições, magias) dos alvos, a qualquer distância, até que morram ou mudem de plano.",
  [[1, "a", "+1 alvo.", { alvos: 1 }], [1, "m", "Duração 1 dia.", { du: "1 dia" }]]);
RAMATormenta20Magias.def("conjurarMortosVivos", "Conjurar Mortos-Vivos", "U2", "necro", 186, "completa|curto|ef:6 mortos-vivos|sustentada|",
  "Seis esqueletos capangas Médios de energia negativa. Ação de movimento: andam 9 m; ação padrão: cada um causa 1d6+2 de trevas num adjacente. For 2, Des 2, Defesa 18, 1 PV; falham em resistências e testes opostos; imunes a atordoamento, não letal, doença, encantamento, fadiga, frio, ilusão, paralisia, sono e veneno. Somem a 0 PV ou no fim da cena; só agem com ordem.",
  [[2, "a", "+1 morto-vivo."], [3, "m", "Carniçais: For 3, Des 3, Defesa 27; 1d8+3 de trevas mais perda de 1d8 PV por veneno e Fortitude ou paralisado 1 rodada (quem passa fica imune por um dia).", { tipoMorto: "carnical", r: 3 }], [7, "m", "Sombras: Des 4, Defesa 35, incorpóreas, 2d10 de trevas e Fortitude ou perde 1d4 PM; perdem a incorporeidade sob o sol.", { tipoMorto: "sombra", r: 4 }]],
  { capangas: "6 + a0" });
RAMATormenta20Magias.def("controlarFogo", "Controlar Fogo", "D2", "evoc", 187, "padrao|curto|veja texto|cena|",
  "Escolha um efeito. Chamejar: armas escolhidas (inclusive naturais e desarmado) causam +1d6 de fogo. Esquentar: 1 objeto sofre e causa 1d6 de fogo por rodada a quem o segura ou veste (ação completa para resfriar). Extinguir: apaga uma chama Grande ou menor, deixando fumaça (camuflagem leve, 3 m). Modelar: move uma chama Grande ou menor 9 m por rodada (ação livre), 2d6 de fogo em quem atravessar.",
  [[1, "m", "Sustentada, Reflexos reduz à metade — Labaredas: ação de movimento por rodada para lançar 4d6 de fogo num alvo em alcance curto da chama.", { du: "sustentada", res: "Reflexos reduz à metade", substitui: 1 }], [2, "a", "+1d6 de dano (menos no Chamejar)."], [3, "m", "Alvo: 1 criatura feita de fogo, lava ou magma, Fortitude parcial: falha vai a 0 PV; passa e sofre 5d6.", { alvo: "1 criatura de fogo, lava ou magma", res: "Fortitude parcial", substitui: 1 }]],
  { opcoes: ["chamejar", "esquentar", "extinguir", "modelar"], tipo: "fogo" });
RAMATormenta20Magias.def("controlarMadeira", "Controlar Madeira", "D2", "trans", 187, "padrao|medio|1 objeto de madeira Grande ou menor|cena|",
  "Escolha. Fortalecer: armas +1 passo de dano; escudos +2 na Defesa (melhoria, acumula com magias); itens de madeira +5 de RD e o dobro de PV. Modelar: muda a forma (sem mecanismos complexos nem consumíveis). Repelir: arma contra você erra sempre; portas se abrem; objetos que viriam em você desviam. Retorcer: porta emperra (Força CD 25), itens dão –5, escudo perde o bônus, barco afunda no fim da cena. Objeto de criatura involuntária: Vontade anula.",
  [[1, "m", "Pessoal, 1 dia: você vira uma árvore Grande (não fala nem age fisicamente; atacada, a magia acaba; Sobrevivência CD 30 percebe).", { al: "pessoal", alvo: "você", du: "1 dia", substitui: 1 }], [3, "m", "Área: quadrado de 9 m, cena: a vegetação fica afiada (terreno difícil e 1d6 de corte a cada 1,5 m percorrido).", { area: "quadrado com 9m de lado", du: "cena", substitui: 1 }], [7, "m", "Alvo Enorme ou menor.", { alvo: "1 objeto de madeira Enorme ou menor", r: 3 }], [12, "m", "Alvo Colossal ou menor.", { alvo: "1 objeto de madeira Colossal ou menor", r: 4 }]],
  { opcoes: ["fortalecer", "modelar", "repelir", "retorcer"] });
RAMATormenta20Magias.def("cranioVoadorDeVladislav", "Crânio Voador de Vladislav", "A2", "necro", 188, "padrao|medio|1 criatura|instantanea|Fortitude parcial",
  "Crânio de energia negativa: 4d8+4 de trevas e um grito que deixa abalados o alvo e os inimigos a até 3 m dele (já abalados ficam apavorados 1d4 rodadas). Passar reduz o dano à metade e evita a condição (os outros também testam).",
  [[2, "a", "+1d8+1 de dano."], [2, "a", "+1 alvo.", { alvos: 1 }]],
  { dano: "(4 + a0)d8 + (4 + a0)", tipo: "trevas", cond: "abalado", metade: 1 });
RAMATormenta20Magias.def("circuloDaJustica", "Círculo da Justiça", "D2", "abjur", 183, "completa|curto|area:esfera com 9m de raio|1 dia|Vontade parcial",
  "Criaturas na área sofrem –10 em Acrobacia, Enganação, Furtividade e Ladinagem e não podem mentir de propósito (podem ser evasivas). Quem passa na resistência sofre –5 e pode mentir.",
  [[1, "m", "Padrão, pessoal, cena, sem resistência: criaturas e objetos invisíveis em alcance curto ficam visíveis enquanto estiverem perto.", { ex: "padrao", al: "pessoal", alvo: "você", du: "cena", res: "nenhuma", substitui: 1 }], [3, "m", "Penalidade –10 para quem passa e –20 para quem falha.", { penalidade: 20, r: 4 }], [7, "m", "Permanente; balança de prata (T$ 5.000).", { du: "permanente", mat: "balança de prata (T$ 5.000)" }]]);
RAMATormenta20Magias.def("desesperoEsmagador", "Desespero Esmagador", "A2", "encan", 190, "padrao|pessoal|area:cone de 6m|instantanea|Vontade parcial",
  "Humanoides na área ficam fracos e frustrados até o fim da cena (1 rodada se passarem).",
  [[2, "m", "As condições viram debilitado e esmorecido.", { condicoes: "debilitado+esmorecido" }], [3, "o", "Afeta qualquer tipo de criatura."], [3, "o", "Quem falha também fica pasmo por 1 rodada (uma vez por cena).", { r: 3 }]],
  { cond: "fraco" });
RAMATormenta20Magias.def("dissiparMagia", "Dissipar Magia", "U2", "abjur", 191, "padrao|medio|1 criatura, 1 objeto mágico ou esfera de 3m de raio|instantanea|",
  "Encerra magias ativas (não as instantâneas). Em criatura ou área, faça Misticismo: dissipa as magias com CD igual ou menor. Num item mágico, ele vira mundano por 1d6 rodadas (Vontade anula).",
  [[12, "m", "Área: esfera de 9 m — disjunção: todas as magias na área são dissipadas e itens mágicos (menos os seus) viram mundanos pela cena (Vontade evita).", { area: "esfera com 9m de raio", alvo: "", substitui: 1, r: 5 }]],
  { testeMisticismo: 1 });
RAMATormenta20Magias.def("enxameDePestes", "Enxame de Pestes", "D2", "conv", 192, "completa|medio|ef:1 enxame Médio (quadrado de 1,5m)|sustentada|Fortitude reduz à metade",
  "Enxame de bichos à escolha que ocupa espaços alheios. No fim do seu turno, causa 2d12 de corte em quem estiver no espaço dele. Ação de movimento: move 12 m.",
  [[2, "a", "+1d12 de dano."], [3, "m", "Reflexos reduz à metade; criaturas maiores (gatos, guaxinins, kobolds…): 3d12 de corte, impacto ou perfuração.", { res: "Reflexos reduz à metade", enxame: "maior" }], [5, "a", "+1 enxame (não podem ocupar o mesmo espaço).", { r: 3 }], [7, "m", "Reflexos reduz à metade; enxame elemental: 5d12 de ácido, eletricidade, fogo ou frio.", { res: "Reflexos reduz à metade", enxame: "elemental", r: 4 }]],
  { dano: "(a3 ? 5 : (a1 ? 3 : 2)) + a0 + 'd12'", tipo: "corte", metade: 1 });
RAMATormenta20Magias.def("purificacao", "Purificação", "D2", "evoc", 202, "padrao|toque|1 criatura|instantanea|",
  "Remove uma destas condições: abalado, apavorado, alquebrado, atordoado, cego, confuso, debilitado, enjoado, envenenado, esmorecido, exausto, fascinado, fatigado, fraco, frustrado, lento, ofuscado, paralisado, pasmo ou surdo.",
  [[2, "o", "Também recupera todos os PV perdidos por veneno."], [2, "o", "Remove todas as condições listadas, não só uma."], [3, "o", "O alvo consegue soltar itens amaldiçoados que segura (a maldição continua)."], [7, "o", "Também dissipa magias e efeitos prejudiciais de encantamento, necromancia e transmutação.", { r: 3 }]],
  { removeCondicoes: ["abalado", "apavorado", "alquebrado", "atordoado", "cego", "confuso", "debilitado", "enjoado", "envenenado", "esmorecido", "exausto", "fascinado", "fatigado", "fraco", "frustrado", "lento", "ofuscado", "paralisado", "pasmo", "surdo"] });
RAMATormenta20Magias.def("esculpirSons", "Esculpir Sons", "A2", "ilus", 192, "padrao|medio|1 criatura ou objeto|cena|Vontade anula",
  "Omite ou transforma os sons do alvo (não cria sons nem idiomas que você não conhece); a escolha não muda depois. Conjurador com a voz muito alterada não lança magias.",
  [[2, "a", "+1 alvo (todos afetados da mesma forma).", { alvos: 1 }]]);
RAMATormenta20Magias.def("flechaAcida", "Flecha Ácida", "A2", "evoc", 193, "padrao|medio|1 criatura ou objeto|instantanea|Reflexos parcial",
  "Projétil de 4d6 de dano de ácido. Quem falha fica coberto de muco e sofre mais 2d6 de ácido no início dos dois próximos turnos. Objeto fora da posse de alguém sofre o dobro e ignora RD.",
  [[1, "o", "O muco corrói armadura ou escudo do alvo: –1 permanente no bônus de Defesa do item (consertável com Ofício)."], [2, "a", "+1 na redução de Defesa (com o anterior).", { precisa: 0 }], [2, "a", "+1d6 no dano inicial e por rodada."]],
  { dano: "(4 + a2)d6", porRodada: "(2 + a2)d6", tipo: "acido", metade: 0 });
RAMATormenta20Magias.def("fisicoDivino", "Físico Divino", "D2", "trans", 193, "padrao|toque|1 criatura|cena|",
  "+2 em Força, Destreza ou Constituição, à escolha (sem PV ou PM extras).",
  [[3, "m", "Alcance curto; alvo: criaturas escolhidas.", { al: "curto", alvo: "criaturas escolhidas" }], [3, "m", "+2 nos três atributos físicos.", { forca: "tres2", r: 3 }], [7, "m", "+4 no atributo escolhido.", { forca: "um4", r: 4 }], [12, "m", "+4 nos três atributos físicos.", { forca: "tres4", r: 5 }]],
  { escolha: ["for", "des", "con"], efeitos: [{ t: "bonus", alvo: "atr.opcao", valor: "a2 ? 4 : 2", categoria: "magia", semPVPM: 1, todos: "a1 || a3", valorTodos: "a3 ? 4 : 2", atributos: ["for", "des", "con"] }] });
RAMATormenta20Magias.def("invisibilidade", "Invisibilidade", "A2", "ilus", 195, "livre|pessoal|você|1 rodada|",
  "O alvo e o equipamento ficam invisíveis: camuflagem total, +10 em Furtividade contra ouvir, e quem não o vê fica desprevenido contra ele. Termina com ação hostil contra uma criatura (objetos soltos e dano indireto não contam). Luz nunca fica invisível.",
  [[1, "m", "Execução padrão, toque, 1 criatura ou objeto Grande ou menor.", { ex: "padrao", al: "toque", alvo: "1 criatura ou objeto Grande ou menor" }], [3, "m", "Duração cena.", { du: "cena", r: 3 }], [3, "m", "Sustentada: esfera de invisibilidade de 3 m que acompanha o alvo (não combina com outros aprimoramentos).", { du: "sustentada", sozinho: 1, r: 3 }], [7, "m", "Execução padrão, toque, 1 criatura; não se dissipa com ação hostil.", { ex: "padrao", al: "toque", alvo: "1 criatura", r: 4 }]],
  { cond: "invisivel", efeitos: [{ t: "estado", valor: "invisivel" }] });
RAMATormenta20Magias.def("ligacaoTelepatica", "Ligação Telepática", "A2", "adiv", 197, "padrao|toque|2 criaturas voluntárias|1 dia|",
  "Elo mental entre duas criaturas com Inteligência –4 ou maior (você pode ser uma): conversam sem idioma comum e a qualquer distância no mesmo mundo.",
  [[2, "a", "+1 alvo.", { alvos: 1 }], [3, "m", "Alvo: 1 criatura; ação de movimento para ver e ouvir pelos sentidos dela (involuntária: Vontade suprime por uma hora).", { alvo: "1 criatura", substitui: 1, r: 3 }]]);
RAMATormenta20Magias.def("localizacao", "Localização", "A2", "adiv", 197, "padrao|pessoal|area:esfera com 90m de raio|cena|",
  "Indica direção e distância da criatura ou objeto mais próximo do tipo pensado (geral ou específico; o específico exige imagem precisa, senão falha e os PM são gastos). Chumbo fino bloqueia.",
  [[0, "T", "Alvo: você; sabe onde fica o norte e tem +5 em Sobrevivência para se orientar.", { alvo: "você", substitui: 1 }], [5, "a", "Área ×10."]]);
RAMATormenta20Magias.def("mapear", "Mapear", "A2", "adiv", 198, "padrao|toque|superfície plana (mesa, papel)|cena|",
  "Uma fagulha queima na superfície um mapa da região (até um quadrado de 10 km; dentro de construções, o andar atual). Lugar conhecido: mapa completo; desconhecido: esboço com um ponto de referência e um local de interesse definidos pelo mestre.",
  [[3, "m", "Alvo: 1 criatura, 1 hora: ela sabe o caminho mais direto para entrar ou sair de um lugar (não acha criaturas nem objetos).", { alvo: "1 criatura", du: "1 hora", substitui: 1 }]]);
RAMATormenta20Magias.def("marcaDaObediencia", "Marca da Obediência", "U2", "encan", 198, "padrao|toque|1 criatura|cena|Vontade anula",
  "Grava uma marca com uma ordem específica (sem ordens genéricas nem suicidas), que o alvo cumpre usando todas as ações. A cada rodada, pode fazer Vontade para dissipar.",
  [[3, "m", "Duração 1 dia; fora de combate, o teste é a cada hora.", { du: "1 dia", r: 3 }], [3, "o", "Cada teste de Vontade falho causa 3d6 de dano psíquico.", { r: 3 }]]);
RAMATormenta20Magias.def("menteDivina", "Mente Divina", "D2", "adiv", 198, "padrao|toque|1 criatura|cena|",
  "+2 em Inteligência, Sabedoria ou Carisma, à escolha (sem PV, PM ou perícias extras).",
  [[3, "m", "Alcance curto; alvo: criaturas escolhidas.", { al: "curto", alvo: "criaturas escolhidas" }], [3, "m", "+2 nos três atributos mentais.", { forca: "tres2", r: 3 }], [7, "m", "+4 no atributo escolhido.", { forca: "um4", r: 4 }], [12, "m", "+4 nos três atributos mentais.", { forca: "tres4", r: 5 }]],
  { escolha: ["int", "sab", "car"], efeitos: [{ t: "bonus", alvo: "atr.opcao", valor: "a2 ? 4 : 2", categoria: "magia", semPVPM: 1, todos: "a1 || a3", valorTodos: "a3 ? 4 : 2", atributos: ["int", "sab", "car"] }] });
RAMATormenta20Magias.def("metamorfose", "Metamorfose", "A2", "trans", 198, "padrao|pessoal|você|cena|",
  "Muda sua forma e o equipamento para qualquer criatura: +20 em Enganação para disfarce. Forma humanoide: pode trocar o tipo de dano das armas e mudar uma categoria de tamanho. Outras formas: uma Forma Selvagem básica do druida (armas naturais e bônus dela), sem atacar com armas, falar ou lançar magias.",
  [[1, "o", "A forma ganha faro, visão na penumbra ou visão no escuro."], [3, "o", "A forma ganha percepção às cegas.", { r: 3 }], [3, "m", "Toque, 1 criatura, Vontade anula.", { al: "toque", alvo: "1 criatura", res: "Vontade anula" }], [3, "m", "Alcance médio, 1 criatura, Vontade anula: vira algo inofensivo (não ataca, fala nem lança magias; deslocamento 3 m; Defesa 10); repete Vontade no início do turno.", { al: "medio", alvo: "1 criatura", res: "Vontade anula", substitui: 1, r: 3 }], [5, "m", "Pode escolher uma Forma Selvagem aprimorada.", { forma: "aprimorada", r: 3 }], [9, "m", "Pode escolher uma Forma Selvagem superior.", { forma: "superior", r: 4 }], [12, "o", "No início de cada turno, pode mudar de forma de novo (ação livre).", { r: 5 }]],
  { efeitos: [{ t: "bonus", alvo: "pericia.enganacao", valor: 20, categoria: "magia", cond: "disfarce" }], formaSelvagem: "a5 ? 'superior' : (a4 ? 'aprimorada' : 'basica')" });
RAMATormenta20Magias.def("miasmaMefitico", "Miasma Mefítico", "D2", "necro", 199, "padrao|medio|area:nuvem com 6m de raio|instantanea|Fortitude (veja texto)",
  "Emanações letais: 5d6 de dano de ácido e enjoado por 1 rodada. Passar reduz à metade e evita a condição.",
  [[0, "T", "Toque, 1 criatura com 0 PV ou menos, Fortitude anula; pó de ônix (T$ 10): falhando, ela morre e você ganha +2 na CD das suas magias por um dia; passando, fica imune por um dia.", { al: "toque", alvo: "1 criatura com 0 PV ou menos", area: "", res: "Fortitude anula", mat: "pó de ônix (T$ 10)", substitui: 1 }], [2, "a", "+1d6 de dano."], [3, "m", "Dano de trevas.", { tipoDano: "trevas" }]],
  { dano: "truque ? '0' : (5 + a1) + 'd6'", tipo: "acido", cond: "enjoado", metade: 1 });
RAMATormenta20Magias.def("montariaArcana", "Montaria Arcana", "A2", "conv", 199, "padrao|curto|ef:criatura conjurada|1 dia|",
  "Convoca um cavalo (ou pônei) de guerra, parceiro veterano, que atravessa terreno difícil sem redução. Você pode usar Misticismo no lugar de Cavalgar com ela (contando como treinado).",
  [[1, "o", "Animais em alcance curto dela fazem Vontade: passam e ficam abalados pela cena; falham e ficam apavorados 1d4 rodadas, depois abalados."], [3, "m", "Permanente, com –3 PM máximos enquanto durar.", { du: "permanente", penalidadePM: 3 }], [3, "a", "+1 categoria de tamanho (Enorme leva duas criaturas; Colossal, seis)."], [3, "m", "Parceiro mestre.", { parceiro: "mestre", r: 3 }]],
  { parceiro: { nivel: "veterano", tipos: ["montaria"] } });
RAMATormenta20Magias.def("oracao", "Oração", "D2", "encan", 200, "padrao|curto|todas as criaturas (veja texto)|sustentada|",
  "Você e aliados no alcance recebem +2 em testes de perícia e rolagens de dano; inimigos no alcance sofrem –2. Acumula com outras magias. Componente: T$ 20 por PM em incenso ou oferendas.",
  [[2, "a", "+1 nos bônus (limite pelo círculo máximo).", { lim: "circuloMax - 2" }], [2, "a", "–1 nas penalidades (limite pelo círculo máximo).", { lim: "circuloMax - 2" }], [7, "m", "Alcance médio.", { al: "medio", r: 3 }], [12, "m", "Duração cena.", { du: "cena", r: 4 }]],
  { matPorPM: 20, efeitos: [{ t: "bonus", alvo: "pericias", valor: "2 + a0", categoria: "magia", cumulativo: 1 }, { t: "bonus", alvo: "dano", valor: "2 + a0", categoria: "magia", cumulativo: 1 }], efeitosInimigos: [{ t: "bonus", alvo: "pericias", valor: "-2 - a1" }, { t: "bonus", alvo: "dano", valor: "-2 - a1" }] });
RAMATormenta20Magias.def("raioSolar", "Raio Solar", "D2", "evoc", 203, "padrao|pessoal|area:linha de 30m|instantanea|Reflexos (veja texto)",
  "Rajada de energia positiva: 4d8 de dano de luz (4d12 em mortos-vivos) e ofuscado por 1 rodada. Passar reduz à metade e evita a condição.",
  [[0, "T", "Duração cena, sem resistência: facho de luz que ilumina a área; ação livre por rodada para mudar a direção.", { du: "cena", res: "nenhuma", substitui: 1 }], [2, "a", "+1d8 de dano ou cura (+1d12 em mortos-vivos)."], [3, "o", "Criaturas vivas escolhidas na área curam 4d8 PV; as demais sofrem o dano."], [3, "o", "Quem falha fica cego por 1d4 rodadas."]],
  { dano: "truque ? '0' : (4 + a1) + 'd8'", danoMortoVivo: "(4 + a1)d12", cura: "a2 ? (4 + a1) + 'd8' : '0'", tipo: "luz", cond: "ofuscado", metade: 1 });
RAMATormenta20Magias.def("refugio", "Refúgio", "A2", "abjur", 203, "completa|curto|ef:domo com 6m de raio|1 dia|",
  "Domo imóvel, quase opaco por fora e transparente por dentro: protege de calor, frio e forças pequenas (não de dano) e dá camuflagem total contra ataques de fora. Entra-se e sai-se livremente; descansar dentro dá recuperação normal.",
  [[1, "o", "Fumaça espessa nas bordas: quem está fora não vê nem ouve o interior; bloqueia adivinhação."], [3, "m", "Cabana para 10 criaturas Médias, com mobília: descanso confortável. Porta e janelas (15 PV, RD 5, com Tranca Arcana); paredes 200 PV, RD 5.", { ef: "cabana", substitui: 1, descanso: "confortavel" }], [3, "m", "Espaço extradimensional (caverna escura para 10 criaturas Médias) com entrada desenhada num objeto fixo; isolado do mundo real, com uma janela de 1 m para observar.", { ef: "espaço extradimensional", substitui: 1, descanso: "normal", r: 3 }], [9, "m", "Mansão extradimensional para 100 criaturas, com comida e dez servos fantasmagóricos: descanso luxuoso. Porta de luz, só os escolhidos passam.", { ef: "mansão extradimensional", substitui: 1, descanso: "luxuosa", r: 4 }]],
  { descanso: "normal" });
RAMATormenta20Magias.def("relampago", "Relâmpago", "A2", "evoc", 203, "padrao|pessoal|area:linha de 30m|instantanea|Reflexos reduz à metade",
  "Raio de 6d6 de dano de eletricidade em todas as criaturas e objetos soltos na linha.",
  [[2, "a", "+2d6 de dano."], [3, "m", "Alvo: criaturas escolhidas; um relâmpago para cada, 6d6 de eletricidade.", { area: "", alvo: "criaturas escolhidas", r: 3 }]],
  { dano: "(6 + 2 * a0)d6", tipo: "eletricidade", metade: 1 });
RAMATormenta20Magias.def("rogarMaldicao", "Rogar Maldição", "D2", "necro", 204, "padrao|curto|1 criatura|sustentada|Fortitude anula",
  "Escolha uma maldição. Debilidade: esmorecido, não se comunica nem lança magias (ainda segue e ajuda aliados de forma simplória). Doença: instantânea, contrai uma doença à sua escolha sem incubação. Fraqueza: debilitado e lento. Isolamento: perde um sentido (visão: cego; audição: surdo; olfato ou paladar: sem faro; tato: caído e sem levantar). O mestre aprova maldições inventadas.",
  [[3, "a", "+1 efeito à escolha.", { r: 3 }], [7, "m", "Permanente, Fortitude parcial (passou: sofre a maldição por 1 rodada).", { du: "permanente", res: "Fortitude parcial", r: 4 }]],
  { opcoes: ["debilidade", "doenca", "fraqueza", "isolamento"] });
RAMATormenta20Magias.def("runaDeProtecao", "Runa de Proteção", "U2", "abjur", 204, "1 hora|toque|uma área de 6m de raio|permanente até ser descarregada|varia (veja texto)",
  "Runa quase invisível numa superfície fixa. Quando alguém entra na área, explode: 6d6 de dano (ácido, eletricidade, fogo, frio, luz ou trevas, escolhido ao lançar) em todos a até 6 m; quem ativou não tem teste, os demais fazem Reflexos para metade. Pode ter condições de ativação e palavra de passe. Investigação encontra e Ladinagem desarma. Componente: pó de diamante (T$ 200).",
  [[1, "a", "+2d6 de dano."], [1, "m", "Pessoal, em você: grave uma magia de 1º círculo que você conhece (padrão ou menos) com uma condição; cumprida, lance-a como reação. Uma runa no corpo por vez.", { al: "pessoal", alvo: "você", substitui: 1 }], [3, "m", "Como o anterior, com magias de 2º círculo.", { al: "pessoal", alvo: "você", substitui: 1, r: 3 }]],
  { dano: "(6 + 2 * a0)d6", tipo: "opcao", escolha: ["acido", "eletricidade", "fogo", "frio", "luz", "trevas"], mat: "pó de diamante (T$ 200)", metade: 1 });
RAMATormenta20Magias.def("saltoDimensional", "Salto Dimensional", "A2", "conv", 205, "padrao|curto|você|instantanea|",
  "Teletransporta você para um ponto no alcance, mesmo sem vê-lo. Depois de chegar, não age até a rodada seguinte. Sem espaço livre, surge no vazio mais próximo.",
  [[1, "m", "Alcance médio.", { al: "medio" }], [1, "a", "+1 criatura voluntária que você esteja tocando.", { alvos: 1 }], [2, "m", "Reação: +5 na Defesa e em Reflexos contra um ataque ou efeito; depois, salta 1,5 m.", { ex: "reacao", substitui: 1 }], [3, "m", "Alcance longo.", { al: "longo" }]]);
RAMATormenta20Magias.def("servosInvisiveis", "Servos Invisíveis", "A2", "conv", 206, "padrao|longo|ef:criaturas conjuradas|cena|",
  "Até três servos invisíveis e silenciosos para tarefas simples (arrumar, montar acampamento — p. 123). Gastar um servo dá +2 não cumulativo num teste de perícia (não ataque nem resistência). Não lutam e falham em qualquer resistência ou teste oposto, sendo destruídos.",
  [[2, "a", "+1 servo."], [3, "o", "Os servos fazem uma tarefa por você: passam num teste de perícia com CD até seu nível +2 por servo, no tempo normal do uso.", { r: 3 }]],
  { servos: "3 + a0" });
RAMATormenta20Magias.def("silencio", "Silêncio", "D2", "ilus", 206, "padrao|medio|area:esfera com 6m de raio|sustentada|",
  "Nenhum som na área: criaturas nela ficam surdas e, como magias exigem palavras, normalmente não se lança magia ali.",
  [[1, "m", "Alvo: 1 objeto que emana silêncio em 3 m (objeto de involuntária: Vontade anula).", { area: "", alvo: "1 objeto", substitui: 1 }], [2, "m", "Duração cena: nenhum som sai da área, mas dentro dela fala-se, ouve-se e lança-se magia normalmente.", { du: "cena", substitui: 1 }]],
  { cond: "surdo" });
RAMATormenta20Magias.def("socoDeArsenal", "Soco de Arsenal", "D2", "conv", 206, "padrao|medio|1 criatura|instantanea|Fortitude parcial",
  "Golpe à distância: 4d6 + sua Força de dano de impacto e empurra 3 m. Passar reduz à metade e evita o empurrão.",
  [[1, "m", "Pessoal, cena, sem resistência: seu alcance natural corpo a corpo aumenta 3 m.", { al: "pessoal", alvo: "você", du: "cena", res: "nenhuma", substitui: 1 }], [2, "a", "+1d6 de dano."], [4, "a", "+3 m de empurrão."], [5, "m", "Dano de essência.", { tipoDano: "essencia" }]],
  { dano: "(4 + a1)d6 + atr.for", tipo: "impacto", metade: 1, empurrao: "3 + 3 * a2" });
RAMATormenta20Magias.def("soproDasUivantes", "Sopro das Uivantes", "A2", "evoc", 207, "padrao|pessoal|area:cone de 9m|instantanea|Fortitude parcial",
  "Ar gélido: 4d6 de dano de frio (Fortitude reduz à metade). Criaturas Médias ou menores que falham ficam caídas e são empurradas 6 m; batendo numa parede ou objeto sólido, param e sofrem +2d6 de impacto.",
  [[2, "a", "+2d6 de frio."], [3, "a", "+1 categoria no tamanho máximo afetado.", { r: 3 }]],
  { dano: "(4 + 2 * a0)d6", tipo: "frio", cond: "caido", metade: 1 });
RAMATormenta20Magias.def("sussurrosInsanos", "Sussurros Insanos", "A2", "encan", 207, "padrao|curto|1 humanoide|cena|Vontade anula",
  "Palavras desconexas deixam o alvo confuso.",
  [[2, "a", "+1 alvo.", { alvos: 1 }], [3, "m", "Alvo: 1 criatura.", { alvo: "1 criatura" }], [12, "m", "Alvo: criaturas escolhidas.", { alvo: "criaturas escolhidas", r: 5 }]],
  { cond: "confuso" });
RAMATormenta20Magias.def("tempestadeDivina", "Tempestade Divina", "D2", "evoc", 208, "completa|longo|area:cilindro com 15m de raio e 15m de altura|sustentada|",
  "Só ao ar livre. Vendaval: ataques à distância –5, chamas apagam e névoas se dissipam. Pode gerar chuva (–5 em Percepção), neve (como chuva e terreno difícil) ou granizo (como chuva e 1 de impacto por rodada no início dos seus turnos).",
  [[1, "o", "Uma vez por rodada, ação padrão: um raio cai num alvo na área, 3d8 de eletricidade (Reflexos reduz à metade)."], [2, "a", "+1d8 no dano dos raios (com o anterior).", { precisa: 0 }], [3, "o", "Chuva grossa: revela invisíveis, Médios ou menores ficam lentos e voadores fazem Atletismo por rodada ou caem."], [3, "o", "Granizo causa 2d6 por rodada."], [3, "o", "Neve causa 2d6 de frio no início dos turnos de quem está na área."], [3, "m", "Área: cilindro de 90 m de raio e 90 m de altura.", { area: "cilindro com 90m de raio e 90m de altura" }]],
  { dano: "a0 ? (3 + a1) + 'd8' : '0'", tipo: "eletricidade", opcoes: ["chuva", "neve", "granizo"] });
RAMATormenta20Magias.def("toqueVampirico", "Toque Vampírico", "A2", "necro", 209, "padrao|toque|1 criatura|instantanea|Fortitude reduz à metade",
  "6d6 de dano de trevas; você recupera PV iguais à metade do dano causado.",
  [[2, "m", "Sem resistência: como parte da execução, faz um ataque corpo a corpo; se acertar, causa o dano do ataque e o da magia e recupera metade do dano da magia.", { res: "nenhuma" }], [2, "a", "+2d6 de dano."], [2, "m", "Pessoal, cena: a cada rodada, ação padrão para tocar 1 criatura e causar 3d6, recuperando metade.", { al: "pessoal", alvo: "você", du: "cena", substitui: 1, r: 3 }]],
  { dano: "a2 ? '3d6' : (6 + 2 * a1) + 'd6'", tipo: "trevas", metade: 1, drenoMetade: 1 });
RAMATormenta20Magias.def("velocidade", "Velocidade", "A2", "trans", 210, "padrao|curto|1 criatura|sustentada|",
  "O alvo ganha uma ação padrão ou de movimento extra por turno (não para lançar magias nem ativar engenhocas).",
  [[0, "m", "Duração cena; a ação extra é só de movimento. Uma ação extra por turno por Velocidade.", { du: "cena" }], [7, "m", "Alvo: criaturas escolhidas no alcance.", { alvo: "criaturas escolhidas", r: 4 }], [7, "m", "Pessoal: a ação extra também serve para lançar magias e ativar engenhocas.", { al: "pessoal", alvo: "você", r: 4 }]],
  { efeitos: [{ t: "acaoExtra", valor: "a0 ? 'movimento' : 'padraoOuMovimento'" }] });
RAMATormenta20Magias.def("vestimentaDaFe", "Vestimenta da Fé", "D2", "abjur", 210, "padrao|toque|1 armadura, escudo ou vestuário|1 dia|",
  "+2 no bônus de Defesa de uma armadura ou escudo; num vestuário, +2 na Defesa (não cumulativo com armadura). Conta como bônus de encanto.",
  [[3, "o", "O item dá o mesmo bônus nos testes de resistência.", { r: 3 }], [4, "a", "+1 no bônus."], [7, "o", "O item também dá redução de dano 5.", { r: 4 }]],
  { efeitos: [{ t: "bonus", alvo: "defesa", valor: "2 + a1", categoria: "encanto" }, { t: "bonus", alvo: "resistencias", valor: "a0 ? 2 + a1 : 0", categoria: "encanto" }, { t: "rd", valor: "a2 ? 5 : 0", fonteRd: "vestimentaDaFe" }] });
RAMATormenta20Magias.def("vozDivina", "Voz Divina", "D2", "adiv", 211, "padrao|pessoal|você|cena|",
  "Conversa com criaturas de qualquer tipo, mesmo sem idioma ou fala, dentro dos limites da Inteligência delas. A atitude não muda, mas Diplomacia funciona.",
  [[1, "o", "Faz um cadáver responder perguntas (respostas curtas e enigmáticas, só o que sabia em vida; uma vez por corpo; não funciona sem cabeça)."], [1, "o", "Fala com plantas e rochas (percepção limitada, respostas simples)."]]);
RAMATormenta20Magias.def("globoDaVerdadeDeGwen", "Globo da Verdade de Gwen", "D2", "adiv", 194, "padrao|curto|ef:1 globo|cena|",
  "Globo flutuante e intangível de 50 cm que mostra, para todos verem, uma cena vista até uma semana atrás por você ou por uma criatura que você toque (ao responder a uma pergunta; ela pode anular com Vontade).",
  [[1, "m", "Cena de até um mês atrás.", { prazo: "mes" }], [2, "m", "Cena de até um ano atrás.", { prazo: "ano" }], [2, "o", "Tocando um cadáver, mostra a última cena que ele viu."], [4, "m", "Alcance longo; 10 globos com a mesma cena.", { al: "longo", ef: "10 globos" }]]);
