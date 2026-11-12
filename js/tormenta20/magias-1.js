/* R.A.M.A. — Tormenta20 · magias de 1º círculo (Livro Básico, Jogo do Ano).
   Resumos do RAMA; formato descrito em js/tormenta20/magias.js. */
RAMATormenta20Magias.def("abencoarAlimentos", "Abençoar Alimentos", "D1", "trans", 178, "padrao|curto|alimento para 1 criatura|cena|",
  "Purifica uma porção de comida ou bebida. Consumida dentro da duração, dá 5 PV ou 1 PM temporários (bônus de alimentação: um por dia, dura um dia).",
  [[0, "T", "Só purifica; sem bônus.", { substitui: 1 }], [1, "a", "+1 alvo.", { alvos: 1 }], [1, "m", "Permanente: cria um frasco de água benta (pó de prata, T$ 5).", { du: "permanente", alvo: "1 frasco com água", mat: "pó de prata (T$ 5)", substitui: 1 }]]);
RAMATormenta20Magias.def("acalmarAnimal", "Acalmar Animal", "D1", "encan", 178, "padrao|curto|1 animal|cena|Vontade anula",
  "O animal fica prestativo e interpreta suas ações da forma mais favorável; você tem +10 em Adestramento e Diplomacia com ele. Alvo hostil ou em combate tem +5 na resistência. Ação hostil sua ou de aliados dissipa a magia.",
  [[1, "m", "Alcance médio.", { al: "medio" }], [1, "m", "Alvo: 1 monstro ou espírito com Inteligência –5 ou –4.", { alvo: "1 monstro ou espírito (Int –5 ou –4)" }], [2, "a", "+1 alvo.", { alvos: 1 }], [5, "m", "Alvo: 1 monstro ou espírito.", { alvo: "1 monstro ou espírito", r: 3 }]]);
RAMATormenta20Magias.def("adagaMental", "Adaga Mental", "A1", "encan", 178, "padrao|curto|1 criatura|instantanea|Vontade parcial",
  "2d6 de dano psíquico e atordoado por 1 rodada. Passar na resistência reduz o dano à metade e evita a condição. Cada criatura só fica atordoada por esta magia uma vez por cena.",
  [[1, "o", "Sem gestos nem palavras (pode ser lançada de armadura); a adaga é invisível e, se o alvo falhar, ele não percebe a magia.", { silenciosa: 1 }], [2, "m", "Duração 1 dia: você sabe a direção e a localização do alvo no mesmo mundo.", { du: "1 dia" }], [2, "a", "+1d6 de dano."]],
  { dano: "(2 + a2)d6", tipo: "psiquico", cond: "atordoado", metade: 1 });
RAMATormenta20Magias.def("alarme", "Alarme", "A1", "abjur", 178, "padrao|curto|area:esfera com 9m de raio|1 dia|",
  "Barreira invisível que detecta quem entra ou toca a área (você escolhe quem passa livre). Aviso telepático (só você, até 1 km, acorda você) ou sonoro (ouvido em alcance longo).",
  [[2, "m", "Alcance pessoal; a área emana de você.", { al: "pessoal" }], [5, "o", "Também percebe adivinhação usada na área ou através dela; teste oposto de Misticismo revela o rosto e a localização aproximada de quem a usou."], [9, "m", "Pode ser descarregada quando um intruso entra: Vontade anula ou fica paralisado 1d4 rodadas; por 24 h você e os escolhidos têm +10 em Sobrevivência para rastreá-lo.", { du: "1 dia ou até descarregar", res: "Vontade anula" }]]);
RAMATormenta20Magias.def("amedrontar", "Amedrontar", "A1", "necro", 179, "padrao|curto|1 animal ou humanoide|cena|Vontade parcial",
  "Falha: apavorado por 1 rodada e depois abalado. Sucesso: abalado por 1d4 rodadas.",
  [[2, "o", "Quem falha fica apavorado por 1d4+1 rodadas."], [2, "m", "Alvo: 1 criatura.", { alvo: "1 criatura" }], [5, "m", "Afeta todos os alvos válidos que você escolher no alcance.", { alvo: "alvos válidos escolhidos no alcance" }]],
  { cond: "apavorado" });
RAMATormenta20Magias.def("armaEspiritual", "Arma Espiritual", "D1", "conv", 180, "padrao|pessoal|você|cena|",
  "A arma preferida da sua divindade flutua a seu lado. Uma vez por rodada, quando você sofre um ataque corpo a corpo, reação: ela causa 2d6 de dano (do tipo da arma) no atacante. Dissipa se você morrer.",
  [[1, "o", "A arma protege você: +1 na Defesa."], [2, "a", "+1 na Defesa (com o aprimoramento anterior).", { precisa: 0 }], [2, "m", "Sustentada; uma vez por rodada, ação livre: a arma acerta automaticamente um alvo adjacente (sem contra-atacar até seu próximo turno).", { du: "sustentada", r: 2 }], [2, "m", "Dano de essência.", { tipoDano: "essencia", r: 2 }], [2, "a", "+1d6 de dano (limite pelo círculo máximo que você lança).", { lim: "circuloMax" }], [5, "o", "Duas armas: contra-ataca (ou ataca) duas vezes por rodada.", { r: 3 }]],
  { dano: "(2 + a4)d6", tipo: "arma", efeitos: [{ t: "bonus", alvo: "defesa", valor: "a0 + a1", categoria: "magia" }] });
RAMATormenta20Magias.def("armaMagica", "Arma Mágica", "U1", "trans", 181, "padrao|toque|1 arma empunhada|cena|",
  "A arma fica mágica e dá +1 em ataque e dano (bônus de encanto). Se você a empunha, pode usar seu atributo-chave de magias nos ataques com ela.",
  [[2, "a", "+1 no bônus (limite pelo círculo máximo).", { lim: "circuloMax - 1" }], [2, "o", "+1d6 de dano de ácido, eletricidade, fogo ou frio (escolha ao lançar).", { escolha: ["acido", "eletricidade", "fogo", "frio"] }], [3, "o", "O dano do aprimoramento anterior vira +2d6.", { precisa: 1 }]],
  { efeitos: [{ t: "bonus", alvo: "ataque", valor: "1 + a0", categoria: "magia", naArma: 1 }, { t: "bonus", alvo: "dano", valor: "1 + a0", categoria: "magia", naArma: 1 }, { t: "atrAtaque", atributo: "chave", naArma: 1 }, { t: "danoExtra", valor: "a2 ? '2d6' : (a1 ? '1d6' : '0')", tipo: "opcao", naArma: 1 }] });
RAMATormenta20Magias.def("armaduraArcana", "Armadura Arcana", "A1", "abjur", 181, "padrao|pessoal|você|cena|",
  "Película invisível que dá +5 na Defesa. Acumula com outras magias, mas não com o bônus de armadura.",
  [[1, "m", "Execução reação: ao sofrer um ataque, +5 na Defesa contra ele (acumula com o efeito básico e com armaduras).", { ex: "reacao", du: "instantanea", substitui: 1 }], [2, "a", "+1 na Defesa."], [2, "m", "Duração 1 dia.", { du: "1 dia" }]],
  { efeitos: [{ t: "bonus", alvo: "defesa", valor: "5 + a1", categoria: "magia", cumulativo: 1, naoAcumulaArmadura: 1 }] });
RAMATormenta20Magias.def("armamentoDaNatureza", "Armamento da Natureza", "D1", "trans", 181, "padrao|toque|1 arma primitiva, natural ou desarmado|cena|",
  "Arma primitiva sem custo (bordão, clava, funda, tacape), arma natural ou ataque desarmado: dano +1 passo e conta como mágica. Pode mudar o tipo de dano para corte, impacto ou perfuração.",
  [[1, "o", "+1 nos ataques com a arma."], [2, "m", "Execução ação de movimento.", { ex: "movimento" }], [3, "a", "+1 nos ataques (com o primeiro aprimoramento).", { precisa: 0 }], [5, "o", "Dano +1 passo adicional."]],
  { efeitos: [{ t: "passoDano", valor: "1 + a3", naArma: 1 }, { t: "bonus", alvo: "ataque", valor: "a0 + a2", categoria: "magia", naArma: 1 }] });
RAMATormenta20Magias.def("aviso", "Aviso", "U1", "adiv", 182, "movimento|longo|1 criatura|instantanea|",
  "Recado telepático, mesmo sem ver o alvo. Escolha: Alerta (+5 no próximo teste de Iniciativa e de Percepção na cena), Mensagem (até 25 palavras, idioma em comum) ou Localização (sabe onde você está agora).",
  [[1, "a", "Alcance ×10 (90 m → 900 m → 9 km…)."], [1, "o", "Mensagem: o alvo pode responder com até 25 palavras até o fim do próximo turno dele."], [2, "o", "Localização dura a cena e acompanha você.", { du: "cena" }], [3, "a", "+1 alvo.", { alvos: 1 }]]);
RAMATormenta20Magias.def("bencao", "Bênção", "D1", "encan", 182, "padrao|curto|aliados|cena|",
  "Aliados recebem +1 em testes de ataque e rolagens de dano. Anula Perdição.",
  [[1, "m", "Alvo: 1 cadáver por 1 semana; não se decompõe nem vira morto-vivo.", { alvo: "1 cadáver", du: "1 semana", substitui: 1 }], [2, "a", "+1 nos bônus (limite pelo círculo máximo).", { lim: "circuloMax - 1" }]],
  { efeitos: [{ t: "bonus", alvo: "ataque", valor: "1 + a1", categoria: "magia" }, { t: "bonus", alvo: "dano", valor: "1 + a1", categoria: "magia" }], anula: "perdicao" });
RAMATormenta20Magias.def("caminhosDaNatureza", "Caminhos da Natureza", "D1", "conv", 183, "padrao|curto|area:criaturas escolhidas|1 dia|",
  "As criaturas afetadas recebem +3 m de deslocamento e ignoram terreno difícil natural.",
  [[0, "T", "Só você: +5 em Sobrevivência para se orientar.", { al: "pessoal", alvo: "você", substitui: 1 }], [1, "o", "A CD para rastrear os alvos em terreno natural sobe +10."], [2, "a", "+3 m no bônus de deslocamento."]],
  { efeitos: [{ t: "bonus", alvo: "deslocamento", valor: "truque ? 0 : 3 + 3 * a2", categoria: "magia" }] });
RAMATormenta20Magias.def("comando", "Comando", "D1", "encan", 184, "padrao|curto|1 humanoide|1 rodada|Vontade anula",
  "Ordem irresistível que o alvo precisa ouvir. Fuja (gasta o turno se afastando), Largue (solta o que segura), Pare (pasmo; uma vez por cena), Senta (senta e não levanta até seu próximo turno) ou Venha (gasta o turno se aproximando).",
  [[1, "m", "Alvo: 1 criatura.", { alvo: "1 criatura" }], [2, "a", "+1 alvo.", { alvos: 1 }]]);
RAMATormenta20Magias.def("compreensao", "Compreensão", "U1", "adiv", 184, "padrao|toque|1 criatura ou texto|cena|Vontade anula (veja texto)",
  "Entende textos em qualquer idioma, conversa com criaturas inteligentes sem idioma comum e percebe sentimentos de animais. Ação de movimento: ouve os pensamentos de quem toca (involuntário faz Vontade).",
  [[1, "m", "Alcance curto.", { al: "curto" }], [2, "m", "Alcance curto; alvo: criaturas escolhidas (ouve os pensamentos de uma por vez).", { al: "curto", alvo: "criaturas escolhidas" }], [2, "m", "Alvo: 1 criatura; vasculha os pensamentos dela atrás de uma informação (Vontade anula; o mestre decide se ela sabe).", { alvo: "1 criatura", r: 2 }], [5, "m", "Pessoal: você fala, entende e escreve qualquer idioma.", { al: "pessoal", alvo: "você", r: 3, substitui: 1 }]]);
RAMATormenta20Magias.def("concentracaoDeCombate", "Concentração de Combate", "A1", "adiv", 185, "livre|pessoal|você|1 rodada|",
  "Você antecipa os movimentos dos inimigos: nos testes de ataque, rola dois dados e usa o melhor.",
  [[2, "m", "Execução padrão; duração cena.", { ex: "padrao", du: "cena", r: 2 }], [5, "o", "Além do normal, quem ataca você rola dois dados e usa o pior.", { r: 3 }], [9, "m", "Execução padrão, alcance curto, alvo: criaturas escolhidas, duração cena.", { ex: "padrao", al: "curto", alvo: "criaturas escolhidas", du: "cena", r: 4 }], [14, "m", "Execução padrão; duração 1 dia. Sexto sentido: imune a surpreendido e desprevenido, +10 na Defesa e em Reflexos.", { ex: "padrao", du: "1 dia", r: 5 }]],
  { efeitos: [{ t: "rolagemDupla", alvo: "ataque" }] });
RAMATormenta20Magias.def("conjurarMonstro", "Conjurar Monstro", "A1", "conv", 185, "completa|curto|ef:1 criatura conjurada|sustentada|",
  "Conjura um construto de energia Pequeno (aparência e dano corte, impacto ou perfuração à escolha), um por vez. Age a partir da próxima rodada com uma ação de movimento (deslocamento 9 m). Ação padrão sua para ordenar: Mover (dobro do deslocamento), Atacar (2d4+2 em adjacente) ou Lançar Magia (serve de origem para uma magia sua de ação padrão ou menor). For 2, Des 3, outros nulos; Defesa igual à sua, 20 PV, usa seus Reflexos; imune a efeitos de Fortitude e Vontade.",
  [[1, "o", "Escalada ou natação igual ao deslocamento terrestre."], [1, "a", "+3 m de deslocamento."], [1, "m", "Dano do ataque vira ácido, fogo, frio ou eletricidade.", { escolha: ["acido", "fogo", "frio", "eletricidade"] }], [2, "a", "+10 PV por categoria de tamanho a partir de Pequeno."], [2, "m", "Tamanho Médio: For 4, Des 3, 45 PV, deslocamento 12 m, ataque 2d6+6.", { tamanho: "medio" }], [2, "a", "Resistência 5 contra dois tipos de dano."], [4, "o", "Nova ordem Arma de Sopro: gasta 1 PM, dobro do dano de ataque em cone de 6 m (Reflexos reduz à metade)."], [5, "m", "Tamanho Grande: For 7, Des 2, 75 PV, deslocamento 12 m, ataque 4d6+10 com alcance 3 m.", { tamanho: "grande", r: 2 }], [9, "o", "Voo igual ao dobro do deslocamento."], [9, "a", "Imunidade a dois tipos de dano."], [9, "m", "Tamanho Enorme: For 11, Des 1, 110 PV, deslocamento 15 m, ataque 4d8+15 com alcance 4,5 m.", { tamanho: "enorme", r: 4 }], [14, "m", "Tamanho Colossal: For 15, Des 0, 180 PV, deslocamento 15 m, ataque 4d12+20 com alcance 9 m.", { tamanho: "colossal", r: 5 }]],
  { conjura: { pv: 20, ataque: "2d4+2" } });
RAMATormenta20Magias.def("consagrar", "Consagrar", "D1", "evoc", 186, "padrao|longo|area:esfera com 9m de raio|1 dia|",
  "Enche a área de energia positiva: curas de luz são maximizadas ali (e o dano de luz em mortos-vivos também). Não pode ser lançada onde há símbolo visível de outra divindade. Anula Profanar.",
  [[1, "o", "Mortos-vivos na área sofrem –2 em testes e Defesa."], [2, "a", "Penalidade dos mortos-vivos –1 (com o anterior; limite pelo círculo máximo).", { precisa: 0, lim: "circuloMax - 2" }], [9, "m", "Execução 1 hora; permanente; incenso e óleos (T$ 1.000).", { ex: "1 hora", du: "permanente", mat: "incenso e óleos (T$ 1.000)", r: 4 }]],
  { anula: "profanar" });
RAMATormenta20Magias.def("controlarPlantas", "Controlar Plantas", "D1", "trans", 188, "padrao|curto|area:quadrado com 9m de lado|cena|Reflexos anula",
  "Só em área com vegetação. Plantas se enroscam: quem falha fica enredado (ação padrão e Acrobacia ou Atletismo para se soltar). A área vira terreno difícil e repete o teste de Reflexos no início do turno de quem está nela.",
  [[0, "T", "Alvo: 1 planta, sem resistência; ela se move como animada (não causa dano nem atrapalha conjuradores).", { alvo: "1 planta", res: "nenhuma", substitui: 1 }], [1, "m", "Instantânea: as plantas da área encolhem; terreno difícil vira normal e não dá camuflagem. Dissipa o uso normal desta magia.", { du: "instantanea", substitui: 1 }], [1, "o", "Quem falha também fica imóvel."], [2, "m", "Pessoal, sem resistência: você conversa com plantas (prestativas) e pode usar Diplomacia com elas.", { al: "pessoal", alvo: "você", res: "nenhuma", substitui: 1 }]],
  { cond: "enredado" });
RAMATormenta20Magias.def("criarElementos", "Criar Elementos", "D1", "conv", 188, "padrao|curto|ef:elemento escolhido|instantanea|",
  "Cria uma pequena porção real de um elemento numa superfície (ou objetos simples de gelo, terra ou pedra). Água: enche um recipiente Minúsculo ou um cubo de gelo. Ar: vento fraco num quadrado de 1,5 m que dispersa gás, fumaça ou névoa. Fogo: chama que ilumina como tocha; num quadrado ocupado causa 1d6 de fogo e, com falha em Reflexos, deixa em chamas. Terra: cubo Minúsculo de terra, argila ou pedra.",
  [[1, "a", "Quantidade +1 passo (+1 categoria de tamanho para água ou terra; +1 quadrado para ar e fogo)."], [1, "m", "Alvo: 1 criatura ou objeto, Reflexos reduz à metade: arremessa água ou terra causando 2d4 de impacto (+1 passo por categoria acima de Minúsculo).", { alvo: "1 criatura ou objeto", res: "Reflexos reduz à metade" }], [1, "a", "Fogo: +1d6 no dano inicial de cada chama."]],
  { dano: "(1 + a2)d6", tipo: "fogo" });
RAMATormenta20Magias.def("criarIlusao", "Criar Ilusão", "A1", "ilus", 189, "padrao|medio|ef:ilusão de até 4 cubos de 1,5m|cena|Vontade desacredita",
  "Ilusão visual ou sonora simples (sem cheiro, textura, temperatura ou sons complexos; volume de voz normal por cubo). Não causa nem sofre dano, mas pode esconder coisas. Dissipa se você sair do alcance.",
  [[1, "m", "Sustentada: ação livre por rodada para mover a imagem ou ajustar o som; ao parar, persiste uma rodada.", { du: "sustentada" }], [1, "a", "+1 cubo de 1,5 m."], [1, "o", "Imagem e som combinados."], [1, "o", "Sons complexos (volume de cinco pessoas por cubo); ação livre para ajustar volume ou posição."], [2, "o", "Odores e sensações térmicas, percebidos até o dobro do tamanho do efeito."], [2, "m", "Alcance longo; efeito: esfera de 30 m de raio. Em vez do normal, som de multidão: lançar magias ali conta como condição ruim e ouvir tem CD +10.", { al: "longo", ef: "esfera com 30m de raio", substitui: 1, r: 2 }], [2, "o", "Sensações táteis: quem não sabe que é ilusão precisa passar em Vontade para atravessar.", { r: 2 }], [5, "m", "Sustentada; ação livre para modificar a ilusão à vontade (sem novos aprimoramentos).", { du: "sustentada", r: 3 }]]);
RAMATormenta20Magias.def("curarFerimentos", "Curar Ferimentos", "D1", "evoc", 189, "padrao|toque|1 criatura|instantanea|",
  "Luz que recupera 2d8+2 PV na criatura tocada.",
  [[0, "T", "Alvo: 1 morto-vivo; causa 1d8 de luz (Vontade reduz à metade).", { alvo: "1 morto-vivo", res: "Vontade reduz à metade", substitui: 1 }], [1, "a", "+1d8+1 de cura."], [2, "o", "Também remove uma condição de fadiga."], [2, "m", "Alcance curto.", { al: "curto" }], [5, "m", "Alcance curto; alvo: criaturas escolhidas.", { al: "curto", alvo: "criaturas escolhidas" }]],
  { cura: "truque ? '0' : (2 + a1) + 'd8+' + (2 + a1)", dano: "truque ? '1d8' : '0'", tipo: "luz", luz: 1 });
RAMATormenta20Magias.def("despedacar", "Despedaçar", "D1", "evoc", 190, "padrao|curto|1 criatura ou objeto mundano Pequeno|instantanea|Fortitude parcial",
  "Som agudo: 1d8+2 de impacto (o dobro e ignorando RD em construto ou objeto mundano) e atordoado por 1 rodada (uma vez por cena). Fortitude reduz à metade e evita o atordoamento.",
  [[2, "a", "+1d8+2 de dano."], [2, "m", "Alvo: objeto mundano Médio.", { alvo: "objeto mundano Médio", r: 2 }], [5, "m", "Alvo: objeto mundano Grande.", { alvo: "objeto mundano Grande", r: 3 }], [9, "m", "Alvo: objeto mundano Enorme.", { alvo: "objeto mundano Enorme", r: 4 }], [14, "m", "Alvo: objeto mundano Colossal.", { alvo: "objeto mundano Colossal", r: 5 }], [5, "m", "Alcance pessoal; área: esfera de 6 m de raio (todas as criaturas e objetos mundanos).", { al: "pessoal", area: "esfera com 6m de raio" }]],
  { dano: "(1 + a0) + 'd8+' + (2 + 2 * a0)", tipo: "impacto", cond: "atordoado", metade: 1 });
RAMATormenta20Magias.def("detectarAmeacas", "Detectar Ameaças", "D1", "adiv", 190, "padrao|pessoal|area:esfera com 18m de raio|cena, até ser descarregada|",
  "Quando uma criatura hostil ou armadilha entra na área, você faz Percepção (CD do mestre). Passou: sabe a origem, a direção e a distância. Falhou: sabe só que há perigo.",
  [[1, "o", "Também descobre raça ou espécie e o poder pela aura (tênue até 6, moderada até 12, poderosa até 20, avassaladora acima)."], [2, "o", "Não fica surpreendido contra perigos detectados e tem +5 nas resistências contra armadilhas.", { r: 2 }]]);
RAMATormenta20Magias.def("disfarceIlusorio", "Disfarce Ilusório", "A1", "ilus", 191, "padrao|pessoal|você|cena|Vontade desacredita",
  "Muda sua aparência e a do equipamento (altura, peso, pele, voz…): +10 em Enganação para disfarce. Não dá habilidades nem muda o funcionamento dos itens.",
  [[0, "T", "Toque, 1 criatura, 1 semana: uma pequena alteração inofensiva e persistente na aparência.", { al: "toque", alvo: "1 criatura", du: "1 semana", substitui: 1 }], [1, "m", "Alcance curto; alvo: 1 objeto (+10 em Enganação para falsificação).", { al: "curto", alvo: "1 objeto" }], [2, "m", "Alcance curto; alvo: 1 criatura (involuntária anula com Vontade).", { al: "curto", alvo: "1 criatura" }], [2, "o", "Inclui odores e sensações: bônus de disfarce vira +20."], [3, "m", "Alcance curto; alvo: criaturas escolhidas, cada uma com aparência própria (involuntárias anulam com Vontade).", { al: "curto", alvo: "criaturas escolhidas", r: 2 }]],
  { efeitos: [{ t: "bonus", alvo: "pericia.enganacao", valor: "truque ? 0 : (a3 ? 20 : 10)", categoria: "magia", cond: "disfarce" }] });
RAMATormenta20Magias.def("enfeiticar", "Enfeitiçar", "A1", "encan", 191, "padrao|curto|1 humanoide|cena|Vontade anula",
  "O alvo fica enfeitiçado (p. 394). Alvo hostil ou em combate tem +5 na resistência. Ação hostil sua ou de aliados dissipa a magia.",
  [[2, "m", "Em vez do normal, sugere uma ação aceitável que o alvo cumpre (pode ter condição de gatilho); ao cumprir, a magia termina.", { substitui: 1 }], [5, "m", "Alvo: 1 espírito ou monstro.", { alvo: "1 espírito ou monstro", r: 3 }], [5, "m", "Afeta todos os alvos no alcance.", { alvo: "todos os alvos no alcance" }]],
  { cond: "enfeiticado" });
RAMATormenta20Magias.def("escudoDaFe", "Escudo da Fé", "D1", "abjur", 192, "reacao|curto|1 criatura|1 turno|",
  "Escudo místico momentâneo: +2 na Defesa.",
  [[1, "m", "Execução padrão, alcance toque, duração cena.", { ex: "padrao", al: "toque", du: "cena" }], [1, "o", "Também dá camuflagem leve contra ataques à distância."], [2, "a", "+1 na Defesa."], [2, "m", "Execução padrão, toque, cena; o alvo sofre metade do dano de ataques e efeitos e a outra metade vai para você (dissipa se ele sair do alcance curto).", { ex: "padrao", al: "toque", du: "cena", r: 2 }], [3, "m", "Duração 1 dia.", { du: "1 dia", r: 2 }]],
  { efeitos: [{ t: "bonus", alvo: "defesa", valor: "2 + a2", categoria: "magia" }] });
RAMATormenta20Magias.def("escuridao", "Escuridão", "U1", "necro", 193, "padrao|curto|1 objeto|cena|Vontade anula (veja texto)",
  "O objeto emana sombras num raio de 6 m: camuflagem leve por escuridão leve, que luz natural não ilumina. Guardar o objeto interrompe o efeito. Objeto de criatura involuntária: Vontade anula. Anula Luz.",
  [[1, "a", "+1,5 m de raio."], [2, "o", "Camuflagem total por escuridão total; bloqueia a visão."], [2, "m", "Alvo: 1 criatura, Fortitude parcial: cego pela cena (passou: 1 rodada).", { alvo: "1 criatura", res: "Fortitude parcial", substitui: 1, r: 2 }], [3, "m", "Duração 1 dia.", { du: "1 dia" }], [5, "m", "Pessoal: sombras cobrem você (+10 em Furtividade e camuflagem leve).", { al: "pessoal", alvo: "você", substitui: 1, r: 2 }]],
  { anula: "luz" });
RAMATormenta20Magias.def("explosaoDeChamas", "Explosão de Chamas", "A1", "evoc", 193, "padrao|pessoal|area:cone de 6m|instantanea|Reflexos reduz à metade",
  "Leque de chamas: 2d6 de dano de fogo nas criaturas da área.",
  [[0, "T", "Alcance curto, 1 objeto, Reflexos anula: acende vela, tocha ou fogueira, ou incendeia objeto inflamável com RD 0.", { al: "curto", alvo: "1 objeto", res: "Reflexos anula", substitui: 1 }], [1, "a", "+1d6 de dano."], [1, "m", "Reflexos parcial: quem falha também fica em chamas.", { res: "Reflexos parcial" }]],
  { dano: "truque ? '0' : (2 + a1) + 'd6'", tipo: "fogo", metade: 1 });
RAMATormenta20Magias.def("imagemEspelhada", "Imagem Espelhada", "A1", "ilus", 195, "padrao|pessoal|você|cena|",
  "Três cópias ilusórias imitam você: +6 na Defesa. Cada ataque que erra apaga uma cópia (–2 no bônus). O atacante precisa ver as cópias; se você estiver invisível ou ele de olhos fechados, não há bônus.",
  [[2, "a", "+1 cópia (+2 na Defesa)."], [2, "o", "Cada cópia destruída solta um clarão: quem a destruiu fica ofuscado por 1 rodada.", { r: 2 }]],
  { efeitos: [{ t: "bonus", alvo: "defesa", valor: "6 + 2 * a0 - 2 * contador", categoria: "magia" }], contador: "cópias destruídas" });
RAMATormenta20Magias.def("infligirFerimentos", "Infligir Ferimentos", "D1", "necro", 195, "padrao|toque|1 criatura|instantanea|Fortitude reduz à metade",
  "Energia negativa: 2d8+2 de dano de trevas (ou cura isso num morto-vivo). Anula Curar Ferimentos.",
  [[1, "o", "Quem falha também fica fraco pela cena."], [2, "a", "+1d8+1 de dano."], [2, "m", "Sem resistência: como parte da execução, faz um ataque corpo a corpo; se acertar, causa o dano do ataque e o da magia.", { res: "nenhuma" }], [5, "m", "Alcance curto; alvo: criaturas escolhidas.", { al: "curto", alvo: "criaturas escolhidas" }]],
  { dano: "(2 + a1)d8 + (2 + a1)", tipo: "trevas", metade: 1, anula: "curarFerimentos" });
RAMATormenta20Magias.def("lequeCromatico", "Leque Cromático", "A1", "ilus", 196, "padrao|pessoal|area:cone de 4,5m|instantanea|Vontade parcial",
  "Luzes brilhantes: animais e humanoides na área ficam atordoados por 1 rodada (uma vez por cena; Vontade anula esta parte) e ofuscados pela cena. Não afeta criaturas cegas.",
  [[2, "o", "Os afetados também ficam vulneráveis pela cena."], [2, "o", "Também afeta espíritos e monstros.", { r: 2 }], [5, "o", "Também afeta construtos, espíritos, monstros e mortos-vivos.", { r: 3 }]],
  { cond: "atordoado" });
RAMATormenta20Magias.def("luz", "Luz", "U1", "evoc", 197, "padrao|curto|1 objeto|cena|Vontade anula (veja texto)",
  "O objeto emite luz sem calor num raio de 6 m; guardá-lo interrompe a luz. Objeto de criatura involuntária: Vontade anula. Anula Escuridão.",
  [[1, "a", "+3 m de raio."], [2, "m", "Duração 1 dia.", { du: "1 dia" }], [2, "m", "Permanente; pó de rubi (T$ 50). Não combina com outros aprimoramentos.", { du: "permanente", mat: "pó de rubi (T$ 50)", sozinho: 1, r: 2 }], [0, "m", "Apenas arcanos — alvo: 1 criatura; lançada nos olhos, deixa ofuscado pela cena (não afeta cegos).", { alvo: "1 criatura", apenas: "arcana", substitui: 1 }], [2, "m", "Apenas arcanos — alcance longo: cria 4 globos de luz móveis (ação livre por rodada); cada um ilumina como tocha e quem ocupa o espaço de um fica ofuscado e sem camuflagem por escuridão ou invisibilidade.", { al: "longo", ef: "4 globos flutuantes de luz", apenas: "arcana", r: 2 }], [2, "o", "Apenas divinos — luz do sol: afeta quem sofre com luz solar; aliados na área estabilizam e ficam imunes a sangrando; inimigos ficam ofuscados.", { apenas: "divina", r: 2 }], [5, "m", "Apenas divinos — toque, 1 criatura: halo de luz dá +10 em Diplomacia e redução de trevas 10.", { al: "toque", alvo: "1 criatura", apenas: "divina", substitui: 1, r: 2 }]],
  { anula: "escuridao" });
RAMATormenta20Magias.def("nevoa", "Névoa", "U1", "conv", 200, "padrao|curto|ef:nuvem com 6m de raio e 6m de altura|cena|",
  "Névoa espessa: criaturas a até 1,5 m têm camuflagem leve; a partir de 3 m, camuflagem total. Vento forte dispersa em 4 rodadas; vendaval, em 1. Não funciona debaixo d'água.",
  [[1, "o", "Funciona debaixo d'água (nuvem de tinta)."], [2, "o", "Criaturas escolhidas ao lançar enxergam através da névoa.", { r: 2 }], [2, "o", "Cheiro horrível: no início do turno, quem está dentro (ou tem faro em alcance curto) faz Fortitude ou fica enjoado 1 rodada."], [2, "o", "Cáustica: no início do turno, quem está dentro sofre 2d4 de ácido."], [3, "a", "+2d4 de ácido (com o anterior).", { precisa: 3 }], [5, "o", "Quase sólida: deslocamento 3 m e –2 em ataques e dano dentro dela."]],
  { dano: "a3 ? (2 + 2 * a4) + 'd4' : '0'", tipo: "acido" });
RAMATormenta20Magias.def("orientacao", "Orientação", "D1", "adiv", 200, "padrao|curto|1 criatura|1 rodada|",
  "No próximo teste de perícia, o alvo rola dois dados e usa o melhor.",
  [[2, "m", "Duração cena: escolha um atributo; testes de perícia dele rolam dois dados (não ataque nem resistência).", { du: "cena", r: 2 }], [5, "m", "Duração cena: como acima, mas para atributos físicos ou mentais.", { du: "cena", r: 3 }], [5, "m", "Alvo: criaturas escolhidas.", { alvo: "criaturas escolhidas", r: 3 }]]);
RAMATormenta20Magias.def("perdicao", "Perdição", "D1", "necro", 201, "padrao|curto|criaturas escolhidas|cena|nenhuma",
  "Os alvos sofrem –1 em testes de ataque e rolagens de dano. Anula Bênção.",
  [[2, "a", "–1 adicional (limite pelo círculo máximo).", { lim: "circuloMax - 1" }]],
  { efeitosAlvo: [{ t: "bonus", alvo: "ataque", valor: "-1 - a0" }, { t: "bonus", alvo: "dano", valor: "-1 - a0" }], anula: "bencao" });
RAMATormenta20Magias.def("primorAtletico", "Primor Atlético", "A1", "trans", 201, "padrao|toque|1 criatura|cena|",
  "O alvo recebe +9 m de deslocamento e +10 em Atletismo.",
  [[1, "o", "+20 adicional em Atletismo para saltar (total +30)."], [1, "o", "Escala paredes e tetos sem testes (mãos livres; uma só se ficar parado) e não fica desprevenido ao escalar."], [1, "m", "Movimento, pessoal, instantânea: salta e pousa adjacente a uma criatura em alcance curto; um ataque corpo a corpo contra ela neste turno conta como investida e causa um dado extra da arma.", { ex: "movimento", al: "pessoal", alvo: "você", du: "instantanea", substitui: 1 }], [3, "o", "Testes de perícias de Força, Destreza ou Constituição rolam dois dados (não ataque nem resistência).", { r: 2 }]],
  { efeitos: [{ t: "bonus", alvo: "deslocamento", valor: 9, categoria: "magia" }, { t: "bonus", alvo: "pericia.atletismo", valor: 10, categoria: "magia" }] });
RAMATormenta20Magias.def("profanar", "Profanar", "D1", "necro", 202, "padrao|longo|area:esfera com 9m de raio|1 dia|",
  "Enche a área de energia negativa: dano de trevas é maximizado ali (e curas de trevas em mortos-vivos também). Não pode ser lançada onde há símbolo visível de outra divindade. Anula Consagrar.",
  [[1, "o", "Mortos-vivos na área recebem +2 na Defesa e em todos os testes."], [2, "a", "+1 nesses bônus (com o anterior; limite pelo círculo máximo).", { precisa: 0, lim: "circuloMax - 2" }], [9, "m", "Execução 1 hora; permanente; incenso e óleos (T$ 1.000).", { ex: "1 hora", du: "permanente", mat: "incenso e óleos (T$ 1.000)", r: 4 }]],
  { anula: "consagrar" });
RAMATormenta20Magias.def("protecaoDivina", "Proteção Divina", "D1", "abjur", 202, "padrao|toque|1 criatura|cena|",
  "Barreira invisível: +2 nos testes de resistência.",
  [[2, "a", "+1 no bônus."], [2, "m", "Reação, alcance curto, 1 rodada: +5 no próximo teste de resistência (acumula com o efeito básico).", { ex: "reacao", al: "curto", du: "1 rodada", substitui: 1 }], [2, "m", "Área: esfera de 3 m de raio; todos os aliados nela recebem o bônus.", { area: "esfera com 3m de raio", r: 2 }], [5, "o", "Imunidade a efeitos mentais e de medo.", { r: 3 }]],
  { efeitos: [{ t: "bonus", alvo: "resistencias", valor: "2 + a0", categoria: "magia" }] });
RAMATormenta20Magias.def("quedaSuave", "Queda Suave", "A1", "trans", 202, "reacao|curto|1 criatura ou objeto Grande ou menor|até chegar ao solo ou cena|",
  "O alvo cai a 18 m por rodada, sem sofrer dano. Num projétil em queda, ele causa metade do dano. Só funciona em queda livre.",
  [[0, "T", "Alvo: objeto Minúsculo; ação de movimento para levitá-lo até 4,5 m.", { alvo: "objeto Minúsculo", substitui: 1 }], [2, "m", "Alvo: até 10 criaturas ou objetos.", { alvo: "até 10 criaturas ou objetos" }], [2, "a", "+1 categoria de tamanho do alvo."]]);
RAMATormenta20Magias.def("raioDoEnfraquecimento", "Raio do Enfraquecimento", "A1", "necro", 202, "padrao|curto|1 criatura|cena|Fortitude parcial",
  "Falha: fatigado. Sucesso: vulnerável. Lançar de novo no mesmo alvo não o deixa exausto (efeitos de magia não se acumulam).",
  [[0, "T", "Toque, Fortitude anula: ao tocar, o alvo fica fatigado.", { al: "toque", res: "Fortitude anula", substitui: 1 }], [2, "m", "Falha: exausto. Sucesso: fatigado.", { r: 2 }], [5, "m", "Como o anterior, com alvo: criaturas escolhidas.", { alvo: "criaturas escolhidas", r: 3 }]],
  { cond: "fatigado" });
RAMATormenta20Magias.def("resistenciaAEnergia", "Resistência a Energia", "U1", "abjur", 204, "padrao|toque|1 criatura|cena|",
  "Escolha ácido, eletricidade, fogo, frio, luz ou trevas: o alvo recebe redução de dano 10 contra esse tipo.",
  [[2, "a", "+5 na redução."], [2, "m", "Duração 1 dia.", { du: "1 dia", r: 2 }], [5, "m", "Alcance curto; alvo: criaturas escolhidas.", { al: "curto", alvo: "criaturas escolhidas", r: 3 }], [5, "m", "RD contra todos os tipos listados.", { ef: "RD contra todos os tipos", r: 3 }], [9, "m", "Imunidade a um dos tipos listados.", { ef: "imunidade a um tipo", r: 4 }]],
  { escolha: ["acido", "eletricidade", "fogo", "frio", "luz", "trevas"], efeitos: [{ t: "rd", valor: "10 + 5 * a0", tipos: ["opcao"], fonteRd: "resistenciaAEnergia" }] });
RAMATormenta20Magias.def("santuario", "Santuário", "D1", "abjur", 205, "padrao|toque|1 criatura|cena|Vontade anula",
  "Quem tenta uma ação hostil contra o alvo faz Vontade; falhando, perde a ação e não tenta de novo na cena. Não protege de efeitos de área. Se o alvo fizer ação hostil, a magia se dissipa (cura e suporte são permitidos).",
  [[1, "o", "Escolha animal, construto ou morto-vivo: criaturas não inteligentes (Int –4 ou menor) desse tipo não percebem você."], [9, "o", "Também protege de efeitos de área (quem mira a área faz Vontade)."]]);
RAMATormenta20Magias.def("setaInfalivelDeTalude", "Seta Infalível de Talude", "A1", "evoc", 206, "padrao|medio|criaturas escolhidas|instantanea|",
  "Duas setas de energia que acertam automaticamente, 1d4+1 de essência cada, no mesmo alvo ou em alvos diferentes. Bônus de dano em magias (como Arcano de Batalha) vale para uma seta só.",
  [[2, "m", "Lanças de energia caem do céu: 1d8+1 de essência cada.", { r: 2 }], [2, "m", "Três setas/lanças.", { setas: 3 }], [4, "m", "Cinco setas/lanças.", { setas: 5, r: 2 }], [9, "m", "Dez setas/lanças.", { setas: 10, r: 4 }]],
  { dano: "a0 ? '1d8+1' : '1d4+1'", tipo: "essencia", projeteis: "a3 ? 10 : (a2 ? 5 : (a1 ? 3 : 2))", acertoAutomatico: 1 });
RAMATormenta20Magias.def("sono", "Sono", "A1", "encan", 207, "padrao|curto|1 humanoide|cena|Vontade parcial",
  "Falha: inconsciente e caído; em combate ou perigo, exausto por 1 rodada e depois fatigado. Sucesso: fatigado por 1d4 rodadas.",
  [[2, "o", "Quem falha em combate fica exausto por 1d4+1 rodadas."], [2, "m", "Alvo: 1 criatura.", { alvo: "1 criatura" }], [5, "m", "Afeta todos os alvos válidos escolhidos no alcance.", { alvo: "alvos válidos escolhidos no alcance" }]],
  { cond: "inconsciente" });
RAMATormenta20Magias.def("suporteAmbiental", "Suporte Ambiental", "D1", "abjur", 207, "padrao|toque|1 criatura|1 dia|",
  "Imune a calor e frio extremos, respira na água (ou no ar, se for aquático) e não sufoca em fumaça densa.",
  [[5, "m", "Alcance curto; alvo: criaturas escolhidas.", { al: "curto", alvo: "criaturas escolhidas" }]]);
RAMATormenta20Magias.def("teia", "Teia", "A1", "conv", 208, "padrao|curto|area:cubo com 6m de lado|cena|Reflexos anula",
  "Fibras pegajosas: quem falha fica enredado (ação padrão e Acrobacia ou Atletismo para se soltar). A área é terreno difícil. Inflamável: dano de fogo destrói a teia por onde passa, soltando as vítimas, mas deixando-as em chamas.",
  [[1, "o", "Quem falha também fica imóvel."], [2, "o", "No início do turno, quem está na área repete o teste de Reflexos.", { r: 2 }], [2, "a", "+1 cubo de 1,5 m."]],
  { cond: "enredado" });
RAMATormenta20Magias.def("toqueChocante", "Toque Chocante", "A1", "evoc", 209, "padrao|toque|1 criatura|instantanea|Fortitude reduz à metade",
  "2d8+2 de dano de eletricidade. Alvo com armadura de metal (ou muito metal) sofre –5 na resistência.",
  [[1, "a", "+1d8+1 de dano."], [2, "m", "Sem resistência: como parte da execução, faz um ataque corpo a corpo; se acertar, causa o dano do ataque e o da magia.", { res: "nenhuma" }], [2, "m", "Pessoal; área: esfera de 6 m de raio (todas as criaturas).", { al: "pessoal", area: "esfera com 6m de raio" }]],
  { dano: "(2 + a0)d8 + (2 + a0)", tipo: "eletricidade", metade: 1 });
RAMATormenta20Magias.def("trancaArcana", "Tranca Arcana", "A1", "abjur", 209, "padrao|toque|1 objeto Grande ou menor|permanente|",
  "Tranca porta, baú ou similar: +10 na CD de Força ou Ladinagem para abrir; você abre livremente.",
  [[0, "T", "Alcance curto: abre ou fecha um objeto Grande ou menor que não esteja trancado.", { al: "curto", substitui: 1 }], [1, "m", "Alcance curto, instantânea: abre portas, baús e janelas trancadas, presas ou barradas (dissipa Tranca Arcana) e afrouxa grilhões e correntes.", { al: "curto", du: "instantanea", substitui: 1 }], [5, "a", "+5 na CD para abrir."], [5, "m", "Alvo: 1 objeto de qualquer tamanho.", { alvo: "1 objeto de qualquer tamanho", r: 3 }]],
  { mat: "chave de bronze (T$ 25)" });
RAMATormenta20Magias.def("tranquilidade", "Tranquilidade", "D1", "encan", 210, "padrao|curto|1 animal ou humanoide|cena|Vontade parcial",
  "Falha: atitude indiferente (p. 259) e não pode fazer ações agressivas. Sucesso: –2 em ataques. Ação hostil contra o alvo ou aliados dele dissipa a magia.",
  [[1, "m", "Alvo: 1 criatura.", { alvo: "1 criatura" }], [1, "a", "+1 alvo.", { alvos: 1 }], [5, "m", "Alcance médio; alvo: criaturas escolhidas.", { al: "medio", alvo: "criaturas escolhidas", r: 3 }]]);
RAMATormenta20Magias.def("transmutarObjetos", "Transmutar Objetos", "A1", "trans", 210, "padrao|toque|matéria-prima (madeira, rocha, ossos…)|cena|",
  "Molda matéria bruta num objeto Pequeno ou menor de até T$ 25 (sem consumíveis nem mecanismos complexos). Reverte no fim da cena ou ao tocar chumbo. Anula Despedaçar.",
  [[0, "T", "1 objeto mundano Minúsculo, instantânea: colore, limpa, aquece, esfria ou conserta pequenas falhas (cura 1 PV do objeto); uma vez por dia por objeto.", { alvo: "1 objeto mundano Minúsculo", du: "instantanea", substitui: 1 }], [1, "m", "Toque, 1 construto, instantânea: cura 2d8 PV (+2 PM por +1d8).", { alvo: "1 construto", du: "instantanea", substitui: 1 }], [2, "a", "+1 categoria de tamanho do objeto."], [3, "a", "Preço máximo ×10 por vez."], [5, "m", "1 objeto mundano, instantânea: restaura todos os PV do objeto (dentro dos limites de tamanho e preço; não se foi destruído por completo).", { alvo: "1 objeto mundano", du: "instantanea", substitui: 1, r: 3 }], [9, "m", "Como o anterior, mas também afeta itens mágicos.", { alvo: "1 objeto (inclusive mágico)", du: "instantanea", substitui: 1 }]],
  { anula: "despedacar" });
RAMATormenta20Magias.def("visaoMistica", "Visão Mística", "U1", "adiv", 211, "padrao|pessoal|você|cena|",
  "Enxerga auras mágicas: detecta todas em alcance médio e sabe tudo sobre elas sem gastar ações. Ação de movimento: descobre se uma criatura em alcance médio lança magias e a aura do círculo mais alto dela.",
  [[1, "o", "Recebe visão no escuro."], [2, "m", "Duração 1 dia.", { du: "1 dia" }], [2, "o", "Também enxerga objetos e criaturas invisíveis (formas translúcidas)."]]);
RAMATormenta20Magias.def("vitalidadeFantasma", "Vitalidade Fantasma", "A1", "necro", 211, "padrao|pessoal|você|instantanea|",
  "Suga energia vital da terra: 2d10 PV temporários, que somem no fim da cena.",
  [[2, "a", "+1d10 nos PV temporários (ou no dano, com o aprimoramento seguinte)."], [5, "m", "Área: esfera de 6 m centrada em você, Fortitude reduz à metade: 1d10 de trevas nas criaturas vivas e PV temporários iguais ao dano total.", { area: "esfera com 6m de raio", res: "Fortitude reduz à metade", substitui: 1, r: 2 }]],
  { pvTemp: "a1 ? '0' : (2 + a0) + 'd10'", dano: "a1 ? (1 + a0) + 'd10' : '0'", tipo: "trevas", metade: 1 });
RAMATormenta20Magias.def("areaEscorregadia", "Área Escorregadia", "A1", "conv", 180, "padrao|curto|area:quadrado de 3m ou 1 objeto|cena|Reflexos (veja texto)",
  "Substância escorregadia: quem está na área faz Reflexos ou cai; depois, mover-se por ela exige Acrobacia CD 10. Num objeto, quem o segura faz Reflexos a cada uso ou o derruba.",
  [[1, "a", "+1 quadrado de 1,5 m."], [2, "m", "Acrobacia CD 15.", { cdAcrobacia: 15 }], [5, "m", "Acrobacia CD 20.", { cdAcrobacia: 20 }]],
  { cond: "caido" });
RAMATormenta20Magias.def("hipnotismo", "Hipnotismo", "A1", "encan", 194, "padrao|curto|1 animal ou humanoide|1d4 rodadas|Vontade anula",
  "Palavras e gestos ritmados deixam o alvo fascinado. Só afeta quem percebe você; em combate, o alvo tem +5 na resistência. Quem passa fica imune por um dia.",
  [[0, "T", "Duração 1 rodada: em vez de fascinado, pasmo (uma vez por cena).", { du: "1 rodada", substitui: 1 }], [1, "o", "Quem passa não percebe que foi alvo de magia."], [2, "m", "Alvo: animais ou humanoides escolhidos.", { alvo: "animais ou humanoides escolhidos" }], [2, "m", "Duração sustentada.", { du: "sustentada" }], [2, "o", "Também afeta espíritos e monstros.", { r: 2 }], [5, "o", "Também afeta construtos, espíritos, monstros e mortos-vivos.", { r: 3 }]],
  { cond: "fascinado" });
