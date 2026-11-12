/* R.A.M.A. — Tormenta20 · magias de 5º círculo (Livro Básico, Jogo do Ano).
   Resumos do RAMA; formato descrito em js/tormenta20/magias.js. */
RAMATormenta20Magias.def("auraDivina", "Aura Divina", "D5", "abjur", 182, "padrao|pessoal|area:esfera com 9m de raio|cena|Vontade parcial",
  "Aura brilhante: você e aliados devotos da mesma divindade ficam imunes a encantamento e recebem +10 na Defesa e nas resistências; outros aliados recebem +5. Inimigos que entram na área fazem Vontade ou ficam esmorecidos, debilitados ou lentos (à sua escolha) até o fim da cena; o teste se repete a cada entrada.",
  [[2, "a", "+1 nos bônus de Defesa e resistências."]],
  { efeitos: [{ t: "bonus", alvo: "defesa", valor: "10 + a0", categoria: "magia" }, { t: "bonus", alvo: "resistencias", valor: "10 + a0", categoria: "magia" }, { t: "imune", valor: "encantamento" }], efeitosAliados: [{ t: "bonus", alvo: "defesa", valor: "5 + a0", categoria: "magia" }, { t: "bonus", alvo: "resistencias", valor: "5 + a0", categoria: "magia" }] });
RAMATormenta20Magias.def("barragemElementalDeVectorius", "Barragem Elemental de Vectorius", "A5", "evoc", 182, "padrao|longo|ef:4 esferas elementais|instantanea|Reflexos parcial",
  "Quatro esferas (ácido, eletricidade, fogo e frio), cada uma com seu ponto: 6d6 do seu tipo em raio de 12 m (Reflexos reduz à metade; um teste por esfera). Quem falha sofre: ácido, vulnerável pela cena; eletricidade, atordoado 1 rodada (uma vez por cena); fogo, em chamas; frio, lento pela cena.",
  [[5, "a", "+2d6 em cada esfera."], [5, "m", "Todas causam dano de essência (mantendo os efeitos).", { tipoDano: "essencia" }]],
  { dano: "(6 + 2 * a0)d6", tipo: "elementos", esferas: 4, metade: 1 });
RAMATormenta20Magias.def("buracoNegro", "Buraco Negro", "U5", "conv", 182, "completa|longo|ef:buraco negro|3 rodadas|Fortitude parcial",
  "Vácuo num espaço vazio. No início de cada um dos seus três turnos seguintes, todos em alcance longo (inclusive você) fazem Fortitude ou ficam caídos e são puxados 30 m (segurar-se num objeto fixo, ação de movimento, dá +2). Quem começa o turno no buraco gasta ação de movimento e Fortitude para se arrastar 1,5 m; quem termina o turno nele some para sempre.",
  [[5, "o", "Você não é afetado."]]);
RAMATormenta20Magias.def("chuvaDeMeteoros", "Chuva de Meteoros", "A5", "conv", 183, "completa|longo|area:quadrado com 18m de lado|instantanea|Reflexos parcial",
  "Só a céu aberto. 15d6 de impacto e 15d6 de fogo, caído e agarrado sob escombros (ação padrão e Atletismo para escapar). Passar reduz à metade e evita cair e ficar preso. A área vira terreno difícil com poeira (camuflagem leve).",
  [[2, "a", "+2d6 de impacto e +2d6 de fogo."]],
  { dano: "(15 + 2 * a0)d6", tipo: "impacto", danoExtra: { dados: "(15 + 2 * a0)d6", tipo: "fogo" }, cond: "agarrado", metade: 1 });
RAMATormenta20Magias.def("controlarOTempo", "Controlar o Tempo", "A5", "trans", 187, "padrao|curto|veja texto|veja texto|",
  "Escolha. Congelar: bolha do seu tamanho em que você age por 3 rodadas enquanto, para os outros, nada passa (você e seus efeitos não saem da área). Saltar: você e até 5 voluntários vão de 1 a 24 horas para o futuro, no mesmo lugar. Voltar: desfaz a rodada anterior (inclusive PV e PM, exceto os desta magia); só você lembra; uma vez por rodada revivida.",
  [],
  { opcoes: ["congelar", "saltar", "voltar"] });
RAMATormenta20Magias.def("deflagracaoDeMana", "Deflagração de Mana", "A5", "evoc", 189, "completa|pessoal|area:esfera com 15m de raio|instantanea|Fortitude parcial",
  "Explosão de mana: 150 de dano de essência em todas as criaturas na área (menos você) e itens mágicos que não sejam artefatos viram mundanos. Passar reduz à metade e os itens voltam a funcionar em um dia.",
  [[1, "a", "+10 de dano."], [5, "o", "Afeta só as criaturas que você escolher."]],
  { dano: "150 + 10 * a0", tipo: "essencia", metade: 1 });
RAMATormenta20Magias.def("desejo", "Desejo", "A5", "trans", 190, "completa|veja texto|veja texto|veja texto|veja texto",
  "Altera a realidade. Sem custo extra: dissipa magia de até 4º círculo; leva até 10 voluntários em alcance longo a qualquer lugar e plano; ou obriga um teste da última rodada a ser refeito. Com sacrifício de 2 PM: cria item mundano de até T$ 30.000; duplica magia de até 4º círculo (com componentes); ou dá +1 num atributo de uma criatura (uma vez por atributo). Pedidos maiores ficam com o mestre — e cuidado com o que deseja.",
  [],
  { opcoes: ["dissipar", "transportar", "desfazer", "criarItem", "duplicarMagia", "atributo"], sacrificioPM: { criarItem: 2, duplicarMagia: 2, atributo: 2 } });
RAMATormenta20Magias.def("engenhoDeMana", "Engenho de Mana", "A5", "abjur", 192, "padrao|medio|ef:disco de energia com 1,5m de diâmetro|sustentada|",
  "Disco imóvel e imune a dano que faz contramágica automática (com seu Misticismo) contra magias alheias em alcance médio; vencendo, anula e absorve os PM como PM temporários, que você gasta para lançar magias estando ao alcance dele.",
  [[1, "o", "O disco segue você, sempre adjacente."], [4, "m", "Duração 1 dia.", { du: "1 dia" }]]);
RAMATormenta20Magias.def("furiaDoPanteao", "Fúria do Panteão", "D5", "evoc", 194, "completa|longo|area:cubo de 90m|sustentada|veja texto",
  "Tempestade violenta: ataques à distância impossíveis, lançar magia é condição terrível e inimigos têm a visão reduzida (como Névoa). Uma vez por turno, ação de movimento: Nevasca (10d6 de frio, Fortitude metade; terreno difícil), Raios (até 6 inimigos, 10d8 de eletricidade, Reflexos metade), Siroco (10d6, metade corte e metade fogo, e sangrando; Fortitude metade e evita) ou Trovões (10d6 de impacto e desprevenido 1 rodada; Fortitude metade e evita).",
  [],
  { opcoes: ["nevasca", "raios", "siroco", "trovoes"], dano: "10d6", tipo: "frio", metade: 1 });
RAMATormenta20Magias.def("intervencaoDivina", "Intervenção Divina", "D5", "conv", 195, "completa|veja texto|veja texto|veja texto|veja texto",
  "Sua divindade intercede. Sem custo extra: cura todos os PV e condições de até 10 criaturas em alcance longo (cura mortos-vivos também) ou dissipa magia de até 4º círculo. Com sacrifício de 2 PM: cria item mundano de até T$ 30.000; duplica magia de até 4º círculo; protege uma cidade de um desastre; ressuscita quem morreu há até uma rodada (acorda com 1 PV); ou outra coisa que o mestre autorize.",
  [],
  { opcoes: ["curar", "dissipar", "criarItem", "duplicarMagia", "protegerCidade", "ressuscitar"], sacrificioPM: { criarItem: 2, duplicarMagia: 2, protegerCidade: 2, ressuscitar: 2 } });
RAMATormenta20Magias.def("invulnerabilidade", "Invulnerabilidade", "U5", "abjur", 195, "padrao|pessoal|você|cena|",
  "Escolha. Proteção mental: imune a abalado, alquebrado, apavorado, atordoado, confuso, esmorecido, fascinado, frustrado, pasmo, encantamento e ilusão. Proteção física: imune a atordoado, cego, debilitado, enjoado, envenenado, exausto, fatigado, fraco, lento, ofuscado, paralisado, acertos críticos, ataques furtivos e doenças.",
  [[5, "m", "Alcance curto; alvo: 1 criatura.", { al: "curto", alvo: "1 criatura" }]],
  { opcoes: ["mental", "fisica"], imunesPorOpcao: { mental: ["abalado", "alquebrado", "apavorado", "atordoado", "confuso", "esmorecido", "fascinado", "frustrado", "pasmo", "encantamento", "ilusao"], fisica: ["atordoado", "cego", "debilitado", "enjoado", "envenenado", "exausto", "fatigado", "fraco", "lento", "ofuscado", "paralisado", "critico", "furtivo", "doenca"] } });
RAMATormenta20Magias.def("lagrimasDeWynna", "Lágrimas de Wynna", "D5", "abjur", 196, "padrao|curto|1 criatura|instantanea|Vontade parcial",
  "O alvo perde a capacidade de lançar magias arcanas até o fim da cena (passando, por uma rodada).",
  [[2, "m", "Área: esfera de 6 m; alvo: criaturas escolhidas.", { area: "esfera com 6m de raio", alvo: "criaturas escolhidas" }], [5, "m", "Execução 1 dia, sacrifício de 1 PM; o alvo fica em alcance curto o tempo todo. Falhando na Vontade, perde a magia arcana para sempre; passando, pode ser alvo de novo no dia seguinte.", { ex: "1 dia", sacrificioPM: 1, r: 5 }]]);
RAMATormenta20Magias.def("legiao", "Legião", "A5", "encan", 196, "padrao|medio|até 10 criaturas na área|sustentada|Vontade parcial",
  "Domina a mente dos alvos, que obedecem a tudo menos ordens claramente suicidas. No fim de cada turno, cada um testa para se livrar; quem passa fica abalado 1 rodada.",
  [[1, "a", "+1 alvo.", { alvos: 1 }]]);
RAMATormenta20Magias.def("mataDragao", "Mata-Dragão", "A5", "evoc", 198, "duas rodadas|pessoal|area:cone de 30m|instantanea|Reflexos reduz à metade",
  "Carga de energia de 20d12 de essência em criaturas, construções e objetos soltos na área; cada 12 rolado soma +1d12. Lenta para usar em combate.",
  [[1, "a", "+1d12 de dano."]],
  { dano: "(20 + a0)d12", tipo: "essencia", explode: 12, metade: 1 });
RAMATormenta20Magias.def("palavraPrimordial", "Palavra Primordial", "U5", "encan", 200, "padrao|curto|1 criatura com menos níveis que você|instantanea ou veja texto|Vontade parcial",
  "Uma palavra primordial, à escolha. Atordoar: atordoado 1d4+1 rodadas (uma vez por cena); passando ou já atordoado por ela, desprevenido 1d4 rodadas. Cegar: cego; passando, ofuscado 1d4 rodadas. Matar: morre; tem também Fortitude se tiver mais da metade dos PV; passando em qualquer um, perde 10d8 PV e fica sangrando.",
  [],
  { opcoes: ["atordoar", "cegar", "matar"], dano: "10d8", tipo: "perdaDeVida" });
RAMATormenta20Magias.def("possessao", "Possessão", "A5", "encan", 201, "padrao|longo|1 criatura|1 dia|Vontade anula",
  "Sua consciência toma o corpo do alvo: você usa sua ficha com os atributos físicos e o deslocamento dele, enquanto seu corpo fica inconsciente. Quem passa sabe da tentativa e fica imune por um dia. Se o corpo possuído morrer, faça Vontade contra sua própria CD para voltar (no alcance) ou morra também. Voltar é ação livre.",
  [[5, "o", "Acesso às habilidades de raça e classe da criatura."], [5, "o", "Pode saltar para outra criatura (Vontade dela); a anterior recobra a consciência."], [5, "m", "Permanente, destruindo seu corpo: o possuído testa Vontade a cada dia para retomar; se o corpo morrer, pode possuir outro em alcance curto.", { du: "permanente" }]]);
RAMATormenta20Magias.def("projetarConsciencia", "Projetar Consciência", "U5", "adiv", 202, "padrao|ilimitado (veja texto)|local ou criatura conhecidos|sustentada|",
  "Sua consciência vai a um local conhecido ou para perto de uma criatura no mesmo plano: forma fantasmagórica invisível (ação de movimento para se mostrar), voo 18 m, incorpórea, limitada ao local ou ao alcance curto da criatura. Vê, ouve e fala mentalmente com quem vê (idioma em comum).",
  [[10, "o", "A projeção lança magias sem componente material e não sustentadas; funciona como Forma Etérea, mas as magias afetam corpóreos."]]);
RAMATormenta20Magias.def("reanimacaoImpura", "Reanimação Impura", "D5", "necro", 203, "completa|toque|1 criatura|cena|",
  "Reanima à força alguém morto nesta cena como morto-vivo, com memórias e habilidades (inclusive magias), que pensa e fala mas obedece a você. No fim da cena volta a morrer. Destruída, não pode ser reanimada de novo assim.",
  []);
RAMATormenta20Magias.def("roubarAAlma", "Roubar a Alma", "U5", "necro", 204, "padrao|curto|1 criatura|permanente|Vontade parcial",
  "Arranca a alma e a prende num objeto que custe T$ 1.000 por nível ou ND do alvo. Passando, fica abalado 1 rodada. Falhando, o corpo fica inerte e em estase (pode ser destruído). Quebrado o objeto, a alma volta ao corpo ou parte para os Mundos dos Deuses. Sacrifício de 1 PM.",
  [[5, "o", "O objeto guarda os PM totais do alvo; empunhando-o, você os usa para lançar magias (recupera como descanso normal)."], [10, "o", "Reação ao lançar: você possui o corpo vazio, como Possessão."]],
  { sacrificioPM: 1 });
RAMATormenta20Magias.def("requiem", "Réquiem", "A5", "ilus", 204, "completa|curto|criaturas escolhidas|sustentada|Vontade anula",
  "Ilusão particular para cada alvo: no início de cada turno dele, Vontade; falhando, acha que não agiu e repete as ações do turno anterior com –5 cumulativo em todos os testes por repetição (não no teste contra a magia). Gasta recursos normalmente; alvos de resistência ganham bônus igual à penalidade.",
  []);
RAMATormenta20Magias.def("segundaChance", "Segunda Chance", "D5", "evoc", 205, "padrao|toque|1 criatura|instantanea|",
  "Asas de fênix de luz: recupera 200 PV e remove abalado, apavorado, alquebrado, atordoado, cego, confuso, debilitado, enjoado, envenenado, esmorecido, exausto, fascinado, fatigado, fraco, frustrado, lento, ofuscado, paralisado, pasmo e surdo.",
  [[1, "a", "+20 PV de cura."], [2, "m", "Alcance curto; até 5 criaturas.", { al: "curto", alvo: "até 5 criaturas" }], [5, "m", "Alvo: criatura morta há até uma rodada (a magia pode curá-la).", { alvo: "1 criatura morta há até uma rodada" }]],
  { cura: "200 + 20 * a0", removeCondicoes: ["abalado", "apavorado", "alquebrado", "atordoado", "cego", "confuso", "debilitado", "enjoado", "envenenado", "esmorecido", "exausto", "fascinado", "fatigado", "fraco", "frustrado", "lento", "ofuscado", "paralisado", "pasmo", "surdo"] });
RAMATormenta20Magias.def("semiplano", "Semiplano", "A5", "conv", 205, "completa|curto|ef:semiplano com 30m de lado|1 dia|",
  "Cria uma dimensão particular (forma à escolha, com ar, luz e calor). Entrar: ação padrão e 10 PM, +1 PM por criatura voluntária tocada e por objeto (1 Médio ou menor, 2 Grande, 5 Enorme, 10 Colossal). Voltar ao mesmo lugar: ação completa (ou Viagem Planar para outro local).",
  [[2, "o", "Alvo extra (1 criatura): é expulsa para um labirinto; a cada rodada faz Investigação ou Sobrevivência (+1 cumulativo) para escapar; Viagem Planar ajuda, teletransporte não."], [5, "m", "Permanente; maquete preciosa (T$ 5.000); lançar de novo aumenta +30 m de lado.", { du: "permanente", mat: "maquete preciosa (T$ 5.000)" }]]);
RAMATormenta20Magias.def("sombraAssassina", "Sombra Assassina", "A5", "ilus", 207, "padrao|curto|1 criatura|cena|Vontade parcial",
  "Uma sombra sólida do alvo, com as mesmas estatísticas, repete cada ação hostil dele contra ele mesmo, com as mesmas rolagens. Pode ser atacada e some a 0 PV. Passando, ela desaparece no fim do turno do alvo depois de copiar a ação dessa rodada.",
  [[10, "m", "Alvo: criaturas escolhidas.", { alvo: "criaturas escolhidas" }]]);
RAMATormenta20Magias.def("toqueDaMorte", "Toque da Morte", "U5", "necro", 209, "padrao|toque|1 criatura|instantanea|veja texto",
  "10d8+10 de dano de trevas. Se o alvo estiver com menos da metade dos PV, faz Fortitude: passando, sofre o dano normal; falhando, os PV vão a –10.",
  [[2, "m", "Alcance curto (raio púrpura).", { al: "curto" }], [10, "m", "Alcance curto; alvo: inimigos no alcance.", { al: "curto", alvo: "inimigos no alcance" }]],
  { dano: "10d8 + 10", tipo: "trevas" });
RAMATormenta20Magias.def("alterarDestino", "Alterar Destino", "A5", "adiv", 179, "reacao|pessoal|você|instantanea|",
  "Você vê todas as possibilidades de um evento: rola de novo um teste de resistência com +10, ou obriga um inimigo a rolar de novo um ataque contra você com –10.",
  [],
  { opcoes: ["resistencia", "ataque"] });
RAMATormenta20Magias.def("aprisionamento", "Aprisionamento", "A5", "abjur", 180, "completa|curto|1 criatura|permanente|Vontade anula",
  "Prisão mágica (quem passa fica imune por uma semana). O preso não respira, não come, não envelhece e não é localizado por adivinhação. Formas (componente de T$ 1.000 cada): Acorrentamento (paralisado e imóvel; corrente de mitral), Contenção Mínima (2 cm dentro de uma gema inquebrável; gema), Prisão Dimensional (semiplano sem teletransporte; miniatura de jade), Sepultamento (esfera indestrutível nas profundezas; orbe de adamante) ou Sono Eterno (fruta com ervas soníferas). Defina uma condição possível e observável que encerra a magia (o mestre valida).",
  [],
  { opcoes: ["acorrentamento", "contencaoMinima", "prisaoDimensional", "sepultamento", "sonoEterno"], mat: "componente da forma escolhida (T$ 1.000)" });
