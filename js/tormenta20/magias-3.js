/* R.A.M.A. — Tormenta20 · magias de 3º círculo (Livro Básico, Jogo do Ano).
   Resumos do RAMA; formato descrito em js/tormenta20/magias.js. */
RAMATormenta20Magias.def("anularALuz", "Anular a Luz", "D3", "necro", 180, "padrao|pessoal|area:esfera com 6m de raio|veja texto|",
  "Onda de escuridão: dissipa magias de até 3º círculo na área se você passar em Religião contra a CD de cada uma; aliados na área ganham +4 na Defesa até o fim da cena; inimigos ficam enjoados 1d4 rodadas (uma vez por cena). Anula Dispersar as Trevas.",
  [[2, "a", "+1 no bônus de Defesa."], [4, "m", "Dissipa magias de até 4º círculo.", { circuloDissipa: 4, r: 4 }], [9, "m", "Dissipa magias de até 5º círculo.", { circuloDissipa: 5, r: 5 }]],
  { anula: "dispersarAsTrevas", efeitosAliados: [{ t: "bonus", alvo: "defesa", valor: "4 + a0", categoria: "magia" }], testeReligiao: 1 });
RAMATormenta20Magias.def("banimento", "Banimento", "D3", "abjur", 182, "1d3+1 rodadas|curto|1 criatura|instantanea|Vontade parcial",
  "Expulsa uma criatura não nativa de Arton para um lugar aleatório do mundo de origem; morto-vivo vai a 0 PV. Passando, fica enjoado 1d4 rodadas. Cada item que se oponha ao alvo (a critério do mestre) dá +2 na CD.",
  [[0, "m", "Sem resistência: devolve automaticamente uma criatura conjurada ao plano de origem.", { res: "nenhuma", substitui: 1 }]],
  { cdPorItem: 2 });
RAMATormenta20Magias.def("colunaDeChamas", "Coluna de Chamas", "D3", "evoc", 184, "padrao|longo|area:cilindro com 3m de raio e 30m de altura|instantanea|Reflexos reduz à metade",
  "Pilar de fogo sagrado: 6d6 de dano de fogo mais 6d6 de luz nas criaturas e objetos soltos da área.",
  [[1, "a", "+1d6 de fogo."], [1, "a", "+1d6 de luz."]],
  { dano: "(6 + a0)d6", tipo: "fogo", danoExtra: { dados: "(6 + a1)d6", tipo: "luz" }, metade: 1 });
RAMATormenta20Magias.def("comunhaoComANatureza", "Comunhão com a Natureza", "D3", "adiv", 184, "completa|pessoal|você|1 dia|",
  "Intuições sobre a região (um dia de viagem): 6d4 dados de auxílio. Em testes de perícia em áreas naturais, gaste 2d4 (+2d4 por círculo acima do 3º que você lança) como bônus. Termina sem dados.",
  [[1, "m", "Execução 1 minuto, instantânea: descobre 1d4+1 informações sobre terreno, animais, vegetais, minerais, cursos d'água e criaturas antinaturais da região.", { ex: "1 minuto", du: "instantanea", substitui: 1 }], [3, "a", "+2 dados de auxílio."], [4, "m", "Dados de auxílio viram d6.", { dado: "d6" }], [8, "m", "Dados de auxílio viram d8.", { dado: "d8" }]],
  { auxilio: { quantidade: "6 + 2 * a1", dado: "a3 ? 'd8' : (a2 ? 'd6' : 'd4')", porUso: "2 + 2 * (circuloMax - 3)", natural: 1 } });
RAMATormenta20Magias.def("contatoExtraplanar", "Contato Extraplanar", "A3", "adiv", 186, "completa|pessoal|você|1 dia|",
  "Pacto com uma entidade de outro plano: 6d6 dados de auxílio. Em testes de perícia, gaste 1d6 (+1d6 por círculo acima do 3º que você lança) como bônus; cada 6 rolado suga 1 PM. Termina sem dados, sem PM ou no fim do dia.",
  [[2, "a", "+1 dado de auxílio."], [8, "m", "Dados viram d12; cada 12 rolado suga 2 PM.", { dado: "d12", r: 4 }]],
  { auxilio: { quantidade: "6 + a0", dado: "a1 ? 'd12' : 'd6'", porUso: "1 + (circuloMax - 3)", suga: "a1 ? '12:2' : '6:1'" } });
RAMATormenta20Magias.def("controlarTerra", "Controlar Terra", "D3", "trans", 188, "padrao|longo|area:9 cubos com 1,5m de lado|instantanea|veja texto",
  "Escolha. Amolecer: num teto ou coluna, desabamento de 10d6 de impacto (Reflexos reduz à metade); num piso, terreno difícil de areia ou argila. Modelar: objetos simples Enormes ou menores de pedra ou argila (passagens, paredes com cobertura total, RD 8 e 50 PV a cada 3 m). Solidificar: lama ou areia viram terra ou pedra e quem pisa nela fica agarrado (ação padrão e Acrobacia ou Atletismo para soltar).",
  [[1, "a", "+2 cubos de 1,5 m."], [1, "m", "Pessoal, 1 dia: você se funde a uma superfície de pedra, terra, argila ou areia adjacente (sai com ação livre; se o trecho for destruído, sofre 10d6 de impacto).", { al: "pessoal", alvo: "você", du: "1 dia", substitui: 1 }]],
  { opcoes: ["amolecer", "modelar", "solidificar"], dano: "10d6", tipo: "impacto" });
RAMATormenta20Magias.def("controlarAgua", "Controlar Água", "D3", "trans", 186, "padrao|longo|area:esfera com 30m de raio|cena|veja texto",
  "Escolha. Congelar: a água mundana congela e quem nada fica imóvel (ação padrão e Atletismo ou Acrobacia para escapar). Derreter: gelo vira água. Enchente: o nível sobe até 4,5 m (ou uma embarcação ganha +3 m de deslocamento). Evaporar: água e gelo somem; elementais da água, plantas monstruosas e imunes a frio sofrem 10d8 de fogo, outros vivos metade (Fortitude reduz à metade). Partir: o nível baixa até 4,5 m, abrindo caminho ou criando redemoinho; elementais da água ficam lentos.",
  [[2, "a", "+2d8 de dano."]],
  { opcoes: ["congelar", "derreter", "enchente", "evaporar", "partir"], dano: "(10 + 2 * a0)d8", tipo: "fogo", metade: 1 });
RAMATormenta20Magias.def("convocacaoInstantanea", "Convocação Instantânea", "A3", "conv", 188, "padrao|ilimitado|1 objeto de até 2 espaços|instantanea|",
  "Traz para sua mão um objeto marcado antes com sua runa (T$ 5). Se outra criatura o tiver, não funciona, mas você sabe onde está e com quem.",
  [[1, "o", "Até 1 hora depois, ação de movimento para devolver o objeto ao lugar de onde veio."], [1, "m", "Baú Médio, permanente, sacrifício de 1 PM: esconde no Éter um baú com 20 espaços (tudo cabe); ação padrão para chamá-lo ou mandá-lo de volta. Baú de T$ 1.000 e miniatura de T$ 100.", { alvo: "1 baú Médio", du: "permanente", mat: "baú (T$ 1.000) e miniatura (T$ 100)", sacrificioPM: 1, substitui: 1 }], [2, "a", "+1 alvo.", { alvos: 1 }], [2, "m", "Alvo: 1 objeto de até 10 espaços (se não couber nas mãos, surge adjacente).", { alvo: "1 objeto de até 10 espaços" }]]);
RAMATormenta20Magias.def("despertarConsciencia", "Despertar Consciência", "D3", "encan", 190, "completa|toque|1 animal ou planta|1 dia|",
  "O alvo vira parceiro veterano (ajudante, combatente, fortão, guardião, médico, perseguidor ou vigilante), racional, com Inteligência –1 e fala. Num parceiro que você já tem, um tipo sobe um passo (uma vez por parceiro); se já for mestre, ganha outro tipo iniciante.",
  [[4, "m", "Alvo: 1 escultura mundana, que também ganha as características de construto.", { alvo: "1 escultura mundana" }], [4, "m", "Permanente, com –3 PM máximos enquanto durar.", { du: "permanente", penalidadePM: 3 }]],
  { parceiro: { nivel: "veterano", tipos: ["ajudante", "combatente", "fortao", "guardiao", "medico", "perseguidor", "vigilante"] } });
RAMATormenta20Magias.def("dificultarDeteccao", "Dificultar Detecção", "A3", "abjur", 190, "padrao|toque|1 criatura ou objeto|1 dia|",
  "Oculta o alvo (e o equipamento) de detecção mágica: quem usa adivinhação para achá-lo faz Vontade; falhando, a magia não funciona e os PM são gastos.",
  [[4, "m", "Área: cubo de 9 m; tudo dentro dela fica protegido.", { area: "cubo de 9m", alvo: "" }], [4, "m", "Duração 1 semana.", { du: "1 semana" }]]);
RAMATormenta20Magias.def("dispersarAsTrevas", "Dispersar as Trevas", "D3", "evoc", 191, "padrao|pessoal|area:esfera com 6m de raio|veja texto|",
  "Brilho forte: dissipa magias de até 3º círculo na área se você passar em Religião contra a CD de cada uma; aliados ganham +4 nas resistências e redução de trevas 10 até o fim da cena; inimigos ficam cegos 1d4 rodadas (uma vez por cena). Anula Anular a Luz.",
  [[2, "a", "+1 no bônus de resistência."], [4, "m", "Alcance curto, 1 criatura, cena: imune a efeitos de trevas.", { al: "curto", area: "", alvo: "1 criatura", du: "cena", substitui: 1 }], [4, "m", "Dissipa magias de até 4º círculo.", { circuloDissipa: 4, r: 4 }], [9, "m", "Dissipa magias de até 5º círculo.", { circuloDissipa: 5, r: 5 }]],
  { anula: "anularALuz", efeitosAliados: [{ t: "bonus", alvo: "resistencias", valor: "4 + a0", categoria: "magia" }, { t: "rd", valor: 10, tipos: ["trevas"], fonteRd: "dispersarAsTrevas" }], testeReligiao: 1 });
RAMATormenta20Magias.def("enxameRubroDeIchabod", "Enxame Rubro de Ichabod", "A3", "conv", 192, "padrao|medio|ef:1 enxame Grande (quadrado de 3m)|sustentada|Reflexos reduz à metade",
  "Enxame de criaturinhas da Tormenta que ocupa espaços alheios. No fim de cada turno seu, 4d12 de ácido em quem estiver no espaço dele. Ação de movimento: move 12 m.",
  [[1, "o", "Quem falha fica agarrado (ação padrão e Acrobacia ou Atletismo para escapar; mover o enxame solta)."], [2, "a", "+1d12 de dano."], [2, "m", "Dano de trevas.", { tipoDano: "trevas" }], [3, "m", "Enxame Enorme (quadrado de 6 m).", { tamanho: "enorme" }], [3, "o", "Voo 18 m; ocupa um cubo."], [4, "o", "Parasitas: no início de cada turno seu, 1d6; com 5 ou 6 surge outro enxame adjacente (todos se movem com uma ação).", { r: 4 }]],
  { dano: "(4 + a1)d12", tipo: "acido", metade: 1 });
RAMATormenta20Magias.def("erupcaoGlacial", "Erupção Glacial", "A3", "evoc", 192, "padrao|medio|area:quadrado de 6m de lado|instantanea|Reflexos parcial",
  "Estacas de gelo: 4d6 de corte e 4d6 de frio, e caído. Passar evita o corte e a queda. As estacas ficam pela cena (terreno difícil e cobertura leve) e quebram com qualquer dano de fogo mágico.",
  [[3, "a", "+2d6 de frio e +2d6 de corte."], [4, "m", "Cilindro de 6 m de raio e altura, sustentada: granizo de 3d6 de impacto e 3d6 de frio por rodada sem teste, camuflagem leve e piso escorregadio (terreno difícil, Acrobacia para equilíbrio).", { area: "cilindro com 6m de raio e 6m de altura", du: "sustentada", res: "nenhuma", substitui: 1, r: 4 }]],
  { dano: "a1 ? '3d6' : (4 + 2 * a0) + 'd6'", tipo: "frio", danoExtra: { dados: "a1 ? '3d6' : (4 + 2 * a0) + 'd6'", tipo: "a1 ? 'impacto' : 'corte'" }, cond: "caido" });
RAMATormenta20Magias.def("ferverSangue", "Ferver Sangue", "A3", "necro", 193, "padrao|curto|1 criatura|sustentada|Fortitude parcial",
  "Ao lançar e no início de cada turno seu: 4d8 de fogo e enjoado 1 rodada (Fortitude reduz à metade e evita a condição). Dois sucessos seguidos dissipam. Se o alvo cair a 0 PV por ela, explode e morre, causando 6d6 de fogo a até 3 m (Reflexos reduz à metade). Não afeta criaturas sem sangue.",
  [[2, "a", "+1d8 de dano."], [9, "m", "Alvo: criaturas escolhidas.", { alvo: "criaturas escolhidas", r: 5 }]],
  { dano: "(4 + a0)d8", tipo: "fogo", cond: "enjoado", metade: 1, porTurno: 1 });
RAMATormenta20Magias.def("globoDeInvulnerabilidade", "Globo de Invulnerabilidade", "A3", "abjur", 194, "padrao|pessoal|você|sustentada|",
  "Esfera imóvel de 3 m de raio que detém magias de 2º círculo ou menor: não podem mirar quem está dentro nem penetrar com área (as de dentro saem normalmente). Efeitos são suprimidos, não dissipados. Só é dissipada se a dissipação mirar você.",
  [[4, "m", "Detém magias de até 3º círculo.", { circuloBarra: 3, r: 4 }], [9, "m", "Detém magias de até 4º círculo.", { circuloBarra: 4, r: 5 }]]);
RAMATormenta20Magias.def("heroismo", "Heroísmo", "D3", "encan", 194, "padrao|toque|1 criatura|cena|",
  "O alvo fica imune a medo, recebe 40 PV temporários e +4 em ataques e dano contra o inimigo de maior ND na cena.",
  [[2, "m", "O bônus vira +6.", { bonus: 6 }]],
  { pvTemp: "40", imune: ["medo"], efeitos: [{ t: "bonus", alvo: "ataque", valor: "a0 ? 6 : 4", categoria: "magia", cond: "inimigoMaiorND" }, { t: "bonus", alvo: "dano", valor: "a0 ? 6 : 4", categoria: "magia", cond: "inimigoMaiorND" }, { t: "imune", valor: "medo" }] });
RAMATormenta20Magias.def("ilusaoLacerante", "Ilusão Lacerante", "A3", "ilus", 195, "padrao|medio|area:cubo de 9m|sustentada|Vontade anula",
  "Ilusão de um perigo mortal: ao lançar, e sempre que alguém começar o turno na área, Vontade; quem falha acredita e sofre 3d6 de dano psíquico não letal (e racionaliza a repetição).",
  [[3, "a", "+2d6 de dano."], [4, "m", "Área: cubo de 90 m.", { area: "cubo de 90m", r: 4 }]],
  { dano: "(3 + 2 * a0)d6", tipo: "psiquico", naoLetal: 1, porTurno: 1 });
RAMATormenta20Magias.def("imobilizar", "Imobilizar", "U3", "encan", 195, "padrao|curto|1 humanoide ou animal|cena|Vontade parcial",
  "O alvo fica paralisado (passando, fica lento). A cada rodada, uma ação completa permite novo teste de Vontade para se libertar.",
  [[1, "m", "Alvo: 1 espírito.", { alvo: "1 espírito" }], [2, "a", "+1 alvo.", { alvos: 1 }], [3, "m", "Alvo: 1 criatura.", { alvo: "1 criatura", r: 4 }]],
  { cond: "paralisado" });
RAMATormenta20Magias.def("lancaIgneaDeAleph", "Lança Ígnea de Aleph", "A3", "evoc", 196, "padrao|medio|1 criatura|instantanea|Reflexos parcial",
  "Projétil de magma: 4d6 de fogo e 4d6 de perfuração, e em chamas (2d6 por rodada no lugar do normal). Passar reduz à metade e evita as chamas. Criaturas adjacentes ao alvo fazem Reflexos ou também ficam em chamas.",
  [[3, "a", "+2d6 no dano inicial e +1d6 no dano das chamas."], [4, "m", "Cena ou até descarregar: quatro dardos de lava; uma vez por rodada, ação livre, dispara um com o efeito normal.", { du: "cena ou até descarregar", r: 4 }]],
  { dano: "(4 + a0)d6", tipo: "fogo", danoExtra: { dados: "(4 + a0)d6", tipo: "perfuracao" }, porRodada: "(2 + a0)d6", cond: "emChamas", metade: 1 });
RAMATormenta20Magias.def("lendasEHistorias", "Lendas e Histórias", "U3", "adiv", 196, "padrao|toque|1 criatura, objeto ou local|sustentada|",
  "A cada rodada sustentada, descobre (a critério do mestre, às vezes só pistas): tudo o que os testes de Conhecimento revelariam; as habilidades e estatísticas do alvo (ou o funcionamento do item mágico); e as magias ativas sobre ele.",
  [[4, "m", "Execução 1 dia, alcance ilimitado; cuba de ouro e ingredientes (T$ 1.000). Precisa de nome, descrição ou localização do alvo.", { ex: "1 dia", al: "ilimitado", mat: "cuba de ouro e ingredientes (T$ 1.000)" }]]);
RAMATormenta20Magias.def("mantoDeSombras", "Manto de Sombras", "U3", "ilus", 197, "padrao|pessoal|você|sustentada|",
  "Você fica incorpóreo (com o equipamento): só armas e habilidades mágicas ou incorpóreos o afetam; atravessa objetos sem manipulá-los e não ataca criaturas normais (mas lança magias). Luz direta causa 1 de dano por rodada. Ação de movimento e 1 PM: entra numa sombra e sai em outra em alcance médio.",
  [[4, "m", "Toque; alvo: 1 criatura.", { al: "toque", alvo: "1 criatura", r: 4 }]],
  { efeitos: [{ t: "estado", valor: "incorporeo" }] });
RAMATormenta20Magias.def("miragem", "Miragem", "A3", "ilus", 199, "padrao|longo|area:cubo de até 90m de lado|1 dia|Vontade desacredita",
  "Um terreno parece outro, com sons e cheiros (útil para armadilhas). Altera, inclui ou esconde estruturas, mas não criaturas.",
  [[4, "o", "Também altera a aparência de criaturas escolhidas na área, como Disfarce Ilusório."], [9, "m", "Permanente; pó de diamante (T$ 1.000).", { du: "permanente", mat: "pó de diamante (T$ 1.000)", r: 4 }]]);
RAMATormenta20Magias.def("missaoDivina", "Missão Divina", "D3", "encan", 199, "padrao|curto|1 criatura|1 semana ou até ser descarregada|Vontade anula (veja texto)",
  "Obriga o alvo a uma tarefa possível e não suicida. Pode recusar, mas a cada dia sem se esforçar faz Vontade; falhando, sofre –2 cumulativo em todos os testes e rolagens.",
  [[2, "m", "Toque, permanente, –1 PM máximo: marca na pele ativada por um tipo de ação (crime, quebra de obrigações); cada ativação dá –2 cumulativo. Dissipar suprime por um dia; só o conjurador ou Purificação removem.", { al: "toque", du: "permanente", penalidadePM: 1, substitui: 1 }], [4, "m", "Duração 1 ano ou até descarregar.", { du: "1 ano ou até ser descarregada" }]]);
RAMATormenta20Magias.def("muralhaElemental", "Muralha Elemental", "A3", "evoc", 200, "padrao|medio|ef:muralha de energia|cena|veja texto",
  "Muro de até 30 m × 3 m (ou o inverso) ou cúpula de 3 m de raio. Fogo: um lado emite 2d6 de fogo a até 6 m ao lançar e no início dos seus turnos; atravessar causa 8d6 de fogo (quem estava no local faz Reflexos para metade e escolhe o lado). Gelo: parede de 15 cm (cada trecho de 3 m: Defesa 8, 40 PV, RD 5, fogo causa o dobro); a cúpula pode prender (Reflexos escapa); atravessar trecho rompido causa 4d6 de frio.",
  [[2, "a", "+2d6 no dano por atravessar."], [2, "a", "+15 m de comprimento e +3 m de altura (até 60 m × 9 m)."], [4, "m", "Sustentada, nova opção Essência: muralha invisível e indestrutível que nada atravessa (só teletransporte); magias lançadas direto em alvos do outro lado funcionam.", { du: "sustentada", r: 4 }]],
  { opcoes: ["fogo", "gelo"], dano: "(8 + 2 * a0)d6", tipo: "fogo", metade: 1 });
RAMATormenta20Magias.def("peleDePedra", "Pele de Pedra", "U3", "trans", 201, "padrao|pessoal|você|cena|",
  "Pele dura como rocha: redução de dano 5.",
  [[1, "m", "Toque; alvo: 1 criatura.", { al: "toque", alvo: "1 criatura" }], [4, "m", "Duração 1 dia.", { du: "1 dia" }], [4, "m", "Pele de aço: redução de dano 10.", { rd: 10, r: 4 }], [4, "m", "Toque, 1 criatura, 1d4 rodadas, Fortitude anula: vira estátua inerte (mesmos PV, RD 8; quebrada, a criatura morre).", { al: "toque", alvo: "1 criatura", du: "1d4 rodadas", res: "Fortitude anula", substitui: 1, r: 4 }], [9, "m", "Como o anterior, permanente.", { al: "toque", alvo: "1 criatura", du: "permanente", res: "Fortitude anula", substitui: 1, r: 5 }]],
  { efeitos: [{ t: "rd", valor: "a2 ? 10 : 5", fonteRd: "peleDePedra" }] });
RAMATormenta20Magias.def("poeiraDaPodridao", "Poeira da Podridão", "D3", "necro", 201, "padrao|medio|area:nuvem com 6m de raio|cena|Fortitude (veja texto)",
  "Nuvem de energia negativa: ao lançar e no início dos seus turnos, 2d8+8 de trevas (Fortitude reduz à metade). Quem falha não recupera PV por uma rodada.",
  [[2, "a", "+1d8+4 de dano."]],
  { dano: "(2 + a0)d8 + (8 + 4 * a0)", tipo: "trevas", metade: 1, porTurno: 1 });
RAMATormenta20Magias.def("potenciaDivina", "Potência Divina", "D3", "trans", 201, "padrao|pessoal|você|sustentada|",
  "Você cresce uma categoria de tamanho (o equipamento acompanha) e recebe Força +4 e RD 10. Não lança magias enquanto durar.",
  [[2, "a", "+1 de Força."], [5, "a", "+5 de RD."], [2, "m", "Toque; alvo: 1 criatura devota da mesma divindade.", { al: "toque", alvo: "1 criatura (mesma divindade)" }]],
  { efeitos: [{ t: "tamanhoPasso", valor: 1 }, { t: "bonus", alvo: "atr.for", valor: "4 + a0", categoria: "magia" }, { t: "rd", valor: "10 + 5 * a1", fonteRd: "potenciaDivina" }, { t: "semMagias" }] });
RAMATormenta20Magias.def("protecaoContraMagia", "Proteção contra Magia", "D3", "abjur", 202, "padrao|toque|1 criatura|cena|",
  "+5 nos testes de resistência contra magias.",
  [[4, "m", "O bônus vira +10.", { protecao: "mais10", r: 4 }], [4, "m", "Imune a uma escola de magia à escolha.", { protecao: "escola1", r: 4 }], [9, "m", "Imune a duas escolas à escolha.", { protecao: "escola2", r: 5 }]],
  { efeitos: [{ t: "bonus", alvo: "resistencias", valor: "a0 ? 10 : (a1 || a2 ? 0 : 5)", categoria: "magia", cond: "contraMagia" }] });
RAMATormenta20Magias.def("seloDeMana", "Selo de Mana", "U3", "encan", 205, "padrao|toque|1 criatura|cena|Vontade parcial",
  "Selo que atrapalha o mana: sempre que o alvo fizer algo que gaste PM, faz Vontade; falhando, a ação não tem efeito (os PM são gastos).",
  [[4, "m", "Alcance curto; alvo: criaturas escolhidas.", { al: "curto", alvo: "criaturas escolhidas", r: 4 }]]);
RAMATormenta20Magias.def("servoDivino", "Servo Divino", "D3", "conv", 205, "padrao|curto|ef:criatura conjurada|cena ou até ser descarregada|",
  "Sua divindade envia um espírito (tipo escolhido pelo mestre) que cumpre uma tarefa de até uma hora e volta ao plano natal. Pagamento de T$ 100 ao espírito (doação, item mágico ou dinheiro).",
  [[4, "m", "Duração 1 dia: tarefa de até um dia; pagamento T$ 500.", { du: "1 dia ou até ser descarregada", mat: "pagamento de T$ 500" }], [9, "m", "Duração 1 semana: tarefa de até uma semana; pagamento T$ 1.000.", { du: "1 semana ou até ser descarregada", mat: "pagamento de T$ 1.000" }]],
  { mat: "pagamento de T$ 100" });
RAMATormenta20Magias.def("servoMortoVivo", "Servo Morto-Vivo", "U3", "necro", 206, "completa|toque|1 cadáver|instantanea|",
  "Transforma o cadáver de humanoide, animal ou monstro em esqueleto ou zumbi que obedece a tudo. Pode acompanhar você como parceiro iniciante (ajudante, atirador, combatente, fortão, guardião ou montaria). Uma vez por rodada, ao sofrer dano, você pode sacrificar um servo para evitar esse dano. Componente: ônix negro (T$ 100).",
  [[3, "m", "Carniçal (pó de ônix negro, T$ 500): parceiro veterano (ajudante, atirador, combatente, fortão ou guardião).", { servo: "carnical", mat: "pó de ônix negro (T$ 500)" }], [3, "m", "Sombra (pó de ônix negro, T$ 500): parceiro veterano (assassino, combatente ou perseguidor).", { servo: "sombra", mat: "pó de ônix negro (T$ 500)" }], [7, "m", "Múmia (ferramentas de embalsamar, T$ 1.000): parceiro mestre (ajudante, destruidor, guardião ou médico).", { servo: "mumia", mat: "ferramentas de embalsamar (T$ 1.000)", r: 4 }]],
  { mat: "ônix negro (T$ 100)", parceiro: { nivel: "iniciante", tipos: ["ajudante", "atirador", "combatente", "fortao", "guardiao", "montaria"] } });
RAMATormenta20Magias.def("soproDaSalvacao", "Sopro da Salvação", "D3", "evoc", 207, "padrao|pessoal|area:cone de 9m|instantanea|",
  "Cone de poeira de luz que só afeta aliados: cura 2d8+4 PV e remove uma destas condições de todos: abalado, atordoado, apavorado, alquebrado, cego, confuso, debilitado, enfeitiçado, enjoado, esmorecido, exausto, fascinado, fatigado, fraco, frustrado, lento, paralisado, pasmo, surdo.",
  [[2, "a", "+1d8+2 de cura."], [4, "o", "Aliado com PV negativos vai a 0 antes de receber a cura."], [4, "o", "Remove todas as condições listadas."]],
  { cura: "(2 + a0)d8 + (4 + 2 * a0)", removeCondicoes: ["abalado", "atordoado", "apavorado", "alquebrado", "cego", "confuso", "debilitado", "enfeiticado", "enjoado", "esmorecido", "exausto", "fascinado", "fatigado", "fraco", "frustrado", "lento", "paralisado", "pasmo", "surdo"] });
RAMATormenta20Magias.def("telecinesia", "Telecinesia", "A3", "trans", 208, "padrao|medio|veja texto|sustentada ou instantanea|",
  "Escolha. Força Contínua (sustentada): move uma criatura Média ou menor ou objeto de até 10 espaços até 6 m por rodada em qualquer direção (Vontade anula; cai ao sair do alcance). Empurrão Violento (instantânea): arremessa até 10 objetos (10 espaços, a até 3 m uns dos outros); cada espaço causa de 1 a 1d6 de impacto (Reflexos reduz à metade). Criaturas Médias ou menores podem ser arremessadas (Vontade evita) e sofrem 1d6 a cada 3 m voados ao bater numa superfície.",
  [[3, "a", "+1 categoria de tamanho de criatura ou o dobro de espaços de objeto."]],
  { opcoes: ["forcaContinua", "empurraoViolento"] });
RAMATormenta20Magias.def("teletransporte", "Teletransporte", "A3", "conv", 208, "padrao|toque|até 5 criaturas voluntárias|instantanea|",
  "Leva os alvos a um lugar a até 1.000 km. Misticismo: CD 20 (familiar), 30 (já visitado) ou 40 (só por descrição). Falha: surge 1d10 × 10 km longe; falha por 5 ou mais: lugar parecido, errado; 1 natural: a magia falha (PM gastos) e você fica atordoado 1d4 rodadas.",
  [[2, "a", "+5 alvos.", { alvos: 5 }], [2, "m", "Vai ao seu santuário (preparado com ritual de um dia e T$ 1.000; um por vez), sem limite de distância nem teste, no mesmo plano.", { destino: "santuario", substitui: 1 }], [9, "m", "Ação completa, cena, sacrifício de 1 PM: círculo de 1,5 m que leva quem pisar a um destino conhecido em qualquer mundo, sem teste.", { ex: "completa", du: "cena", sacrificioPM: 1, destino: "circulo", substitui: 1, r: 5 }]],
  { teste: { pericia: "misticismo", cds: { familiar: 20, conhecido: 30, descricao: 40 } } });
RAMATormenta20Magias.def("tentaculosDeTrevas", "Tentáculos de Trevas", "A3", "necro", 209, "padrao|medio|area:esfera com 6m de raio|cena|",
  "Tentáculos de treva: ao lançar e no início de cada turno seu, faça a manobra agarrar (com seu Misticismo) contra cada criatura na área; quem já estava agarrado sofre 4d6 de trevas. Terreno difícil; os tentáculos são imunes a dano.",
  [[2, "a", "+3 m de raio."], [2, "a", "+2d6 de dano."]],
  { dano: "(4 + 2 * a1)d6", tipo: "trevas", manobra: { tipo: "agarrar", pericia: "misticismo" }, porTurno: 1 });
RAMATormenta20Magias.def("transformacaoDeGuerra", "Transformação de Guerra", "A3", "trans", 210, "padrao|pessoal|você|sustentada|",
  "Máquina de combate: +6 na Defesa, nos ataques e no dano corpo a corpo e 30 PV temporários. Proficiente em todas as armas, mas não lança magias.",
  [[2, "a", "+1 nos bônus e +10 PV temporários."], [2, "o", "Barra de adamante (T$ 100): RD 10, imunidade a atordoamento, cansaço, encantamento, metabolismo, trevas e veneno, e não respira.", { mat: "barra de adamante (T$ 100)" }]],
  { pvTemp: "30 + 10 * a0", efeitos: [{ t: "bonus", alvo: "defesa", valor: "6 + a0", categoria: "magia" }, { t: "bonus", alvo: "ataque.corpo", valor: "6 + a0", categoria: "magia" }, { t: "bonus", alvo: "dano.corpo", valor: "6 + a0", categoria: "magia" }, { t: "prof", qual: "marciais" }, { t: "prof", qual: "exoticas" }, { t: "prof", qual: "fogo" }, { t: "rd", valor: "a1 ? 10 : 0", fonteRd: "transformacaoDeGuerra" }, { t: "semMagias" }] });
RAMATormenta20Magias.def("viagemArborea", "Viagem Arbórea", "D3", "conv", 210, "completa|pessoal|você|cena|",
  "Você entra numa árvore adjacente maior que você e percebe os arredores (sem agir). Ação de movimento: sai dela ou de qualquer outra a até 1 km. Ação de movimento e 1 PM: entra em outra. Se a árvore for destruída, sai e sofre 10d6 de impacto.",
  [[2, "m", "Toque, até cinco criaturas, instantânea: entram numa planta Média ou maior e saem em outra a até 100 km na direção indicada.", { al: "toque", alvo: "até 5 criaturas", du: "instantanea", substitui: 1 }]]);
RAMATormenta20Magias.def("videncia", "Vidência", "U3", "adiv", 211, "completa|ilimitado|1 criatura|sustentada|Vontade anula",
  "Por uma superfície reflexiva, vê e ouve a criatura e 6 m ao redor, a qualquer distância. Modificadores da Vontade do alvo: não conhece +10; ouviu falar +5; outro plano +5; já encontrou +0; tem representação –2; conhece bem –5; tem pertence –5; tem parte do corpo –10.",
  []);
RAMATormenta20Magias.def("voo", "Voo", "A3", "trans", 211, "padrao|pessoal|você|cena|",
  "Deslocamento de voo 12 m, simples como andar (ataca e lança magias normalmente). No fim, desce devagar como em Queda Suave.",
  [[1, "m", "Toque; alvo: 1 criatura.", { al: "toque", alvo: "1 criatura" }], [4, "m", "Duração 1 dia.", { du: "1 dia", r: 4 }], [4, "m", "Alcance curto; alvo: até 10 criaturas.", { al: "curto", alvo: "até 10 criaturas", r: 4 }]],
  { efeitos: [{ t: "deslocamento", tipo: "voo", base: 12 }] });
RAMATormenta20Magias.def("ancoraDimensional", "Âncora Dimensional", "A3", "abjur", 179, "padrao|curto|1 criatura ou objeto|cena|",
  "Campo esmeralda que impede movimento planar: convocações como Salto Dimensional e Teletransporte, viagem astral e a habilidade incorpóreo.",
  [[2, "m", "Alcance médio; área: esfera de 3 m; alvo: criaturas escolhidas.", { al: "medio", area: "esfera com 3m de raio", alvo: "criaturas escolhidas" }], [2, "m", "Fio de energia prende o alvo a um ponto fixo (não se afasta mais de 3 m); o fio tem 20 PV e RD 20 (efeitos de libertação o desfazem).", { ancora: "fio" }], [4, "m", "Como o anterior, com corrente de 20 PV e RD 40.", { ancora: "corrente" }], [4, "m", "Área: cubo de 9 m, permanente; chave de esmeralda (T$ 2.000): ninguém entra nem sai dali por movimento planar.", { area: "cubo de 9m", du: "permanente", mat: "chave de esmeralda (T$ 2.000)", substitui: 1 }], [9, "m", "Alcance médio, esfera de 3 m, criaturas escolhidas, todas presas por fios ao centro.", { al: "medio", area: "esfera com 3m de raio", alvo: "criaturas escolhidas", ancora: "fios" }]]);
