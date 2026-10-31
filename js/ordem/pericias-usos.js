/* =====================================================================
   R.A.M.A. — Ordem Paranormal · usos das perícias (consulta)
   =====================================================================
   O texto de referência que a ficha mostra ao clicar no NOME de uma
   perícia: a descrição e cada uso específico, com treinamento mínimo,
   DT, ação, custos, resultados e restrições — e a fonte de cada um.
   Só consulta: nada aqui rola dado, muda a ficha ou vira automação.

   Indexado pela chave de C.PERICIAS (js/ordem/catalogo.js). As páginas
   são as IMPRESSAS nos livros (o campo `pagina` do catálogo de perícias
   não é usado aqui: algumas não batem com o livro básico — ver
   docs/ORDEM-REGRAS.md, "Usos das perícias").

   PADRÃO PARA OS PRÓXIMOS CONTEÚDOS: um suplemento que acrescentar ou
   mudar um uso de perícia entra AQUI, com descrição, requisitos, custos,
   efeitos, restrições, fonte e página — `usos` quando é um uso que
   qualquer personagem pode fazer; `especificos` quando só existe dentro
   de uma regra (cena de perseguição, regra opcional…), com o contexto.
   Nunca substitui o uso do livro básico em silêncio. Benefício exclusivo
   de origem, poder, trilha ou item NÃO entra: não é uso da perícia.

   Formato:
     PERICIAS_USOS[chave] = {
       intro      a descrição geral, em redação própria
       pagina     página impressa da descrição (livro básico)
       usos       [{ nome, treino ("" | "treinado" | "veterano" |
                    "expert"), dt (texto: "20", "oposto", "variável"…),
                    acao, custo, alcance, texto, fonte, pagina }]
       notas      regras da perícia que valem para vários usos (kit,
                  uso em si mesmo…)
       especificos [{ contexto, nome, texto, fonte, pagina }]
     }

   Dados: −1d20 é "um dado a menos" (o ícone que a extração dos PDFs
   transforma em "O"); +1d20, um dado a mais.
   ===================================================================== */

(function (global) {
  "use strict";

  var LB = "OPRPG";
  var AS1 = "AS1";
  var AS4 = "AS4";
  var AS5 = "AS5";
  var SAH = "SAH";

  function uso(nome, d) { return Object.assign({ nome: nome, treino: "", dt: "", acao: "", custo: "", alcance: "", texto: "", fonte: LB, pagina: 0 }, d); }
  function esp(contexto, nome, texto, fonte, pagina) { return { contexto: contexto, nome: nome, texto: texto, fonte: fonte, pagina: pagina }; }

  /* Os contextos de Sobrevivendo ao Horror — regras de cena, não usos
     do dia a dia. */
  var PERSEGUICAO = "Cena de perseguição (SaH)";
  var FURTIVA = "Cena de furtividade (SaH)";
  var MEDO = "Ações contra o medo (SaH)";
  var INVESTIGACAO = "Cena de investigação (SaH)";
  var FABRICACAO = "Fabricação em campo (SaH)";

  var PERSEGUIR = "Perseguições são testes estendidos de Atletismo: 3 sucessos antes de 3 falhas vencem (o caçador alcança a presa; a presa escapa). A DT vem da velocidade dos adversários: 15 pessoas comuns, 20 pessoas velozes ou animais e criaturas comuns, 25+ animais ou criaturas velozes. Com veículo, Pilotagem no lugar de Atletismo (Adestramento, se for montaria). O mestre pode aceitar outra perícia justificada — mas, fora Atletismo, cada perícia só uma vez por perseguição.";

  var REGRAS_GERAIS = {
    pagina: 40,
    treino: "Perícia “treinada”: só pode ser usada por quem é treinado nela. Alguns usos exigem um grau mínimo (treinado, veterano ou expert).",
    carga: "Perícia com “carga”: aplica a penalidade de carga total ao teste.",
    kit: "Uso que exige kit de perícia: sem o kit, ainda dá para tentar, com −5 no teste.",
  };

  var PERICIAS_USOS = {
    acrobacia: { pagina: 41, intro: "Proezas acrobáticas.",
      usos: [
        uso("Amortecer Queda", { treino: "veterano", dt: "15", acao: "reação", pagina: 41,
          texto: "Ao cair, reduz o dano da queda em 1d6, mais 1d6 para cada 5 pontos acima da DT. Reduzindo o dano a zero, cai de pé." }),
        uso("Equilíbrio", { dt: "10 piso escorregadio · 15 superfície estreita · 20 muito estreita", acao: "um teste por ação de movimento", pagina: 41,
          texto: "Andando por superfícies precárias. Passando, avança metade do deslocamento; falhando, não avança; falhando por 5 ou mais, cai. Com −1d20 no teste, avança o deslocamento todo. Equilibrando-se, fica desprevenido; sofrendo dano, novo teste — falhando, cai." }),
        uso("Escapar", { dt: "teste de Agilidade de quem amarrou +10 (cordas) · 30 (algemas)", acao: "ação completa", pagina: 41,
          texto: "Livra-se de amarras." }),
        uso("Levantar-se Rapidamente", { treino: "treinado", dt: "20", acao: "precisa de uma ação de movimento disponível", pagina: 41,
          texto: "Caído: passando, levanta como ação livre; falhando, gasta a ação de movimento e continua caído." }),
        uso("Passar por Espaço Apertado", { treino: "treinado", dt: "25", acao: "ação completa", pagina: 41,
          texto: "Espreme-se por onde normalmente só a cabeça passaria, avançando metade do deslocamento." }),
        uso("Passar por Inimigo", { dt: "oposto: Acrobacia, Iniciativa ou Luta do oponente (o melhor)", acao: "parte do movimento", pagina: 41,
          texto: "Atravessa o espaço de um inimigo. Passando, atravessa; falhando, não atravessa e a ação de movimento termina. O espaço do inimigo conta como terreno difícil." }),
      ],
      especificos: [
        esp(PERSEGUICAO, "No lugar de Atletismo", "Com justificativa (“vou correr pelas paredes”), o mestre pode aceitar Acrobacia no teste da perseguição — uma vez por perseguição. " + PERSEGUIR, SAH, 90),
      ] },

    adestramento: { pagina: 42, intro: "Lidar com animais.",
      usos: [
        uso("Acalmar Animal", { dt: "25", acao: "ação completa", pagina: 42,
          texto: "Acalma um animal nervoso ou agressivo — controlar um touro furioso, convencer um cão de guarda a não atacar." }),
        uso("Cavalgar", { dt: "20 montar como livre · 15 obstáculo pequeno ou terreno ruim · 20 obstáculo grande ou terreno muito ruim", acao: "parte do movimento (montar: ação de movimento)", pagina: 42,
          texto: "Montar como ação livre pede DT 20 (falhando por 5 ou mais, cai). Terreno plano não pede teste; obstáculos e terreno acidentado, sim — falhando, cai da montaria e sofre 1d6 de dano. Galopar: ação completa e teste; avança deslocamento (da montaria) + o resultado, em quadrados de 1,5 m, só em linha reta e fora de terreno difícil." }),
        uso("Manejar Animal", { dt: "15", acao: "ação de movimento", pagina: 42,
          texto: "Faz o animal realizar uma tarefa para a qual foi treinado. Permite usar Adestramento como Pilotagem em veículos de tração animal (carroças)." }),
      ],
      especificos: [
        esp(PERSEGUICAO, "Perseguição montada", "Se o “veículo” da perseguição é uma montaria, Adestramento substitui Atletismo nos testes. " + PERSEGUIR, SAH, 90),
      ] },

    artes: { pagina: 42, intro: "Expressão artística: música, dança, escrita, pintura, atuação e outras.",
      usos: [
        uso("Impressionar", { dt: "oposto: Vontade de quem assiste", acao: "de alguns minutos (música, dança) a algumas horas (teatro)", pagina: 42,
          texto: "Passando, +2 em testes de perícias de Presença contra essa pessoa na cena. Falhando, −2 nesses testes e não pode tentar de novo na cena. Para uma plateia, o mestre faz um teste só, com o melhor bônus." }),
      ] },

    atletismo: { pagina: 42, intro: "Façanhas atléticas.",
      usos: [
        uso("Corrida", { acao: "ação completa", pagina: 42,
          texto: "Avança deslocamento + o resultado do teste, em quadrados de 1,5 m (deslocamento 9 m e 15 no teste: 21 quadrados), só em linha reta e fora de terreno difícil. Corre por rodadas iguais ao Vigor; depois, Fortitude por rodada (DT 5, +5 por teste anterior) — falhando, fica fatigado." }),
        uso("Escalar", { dt: "10 com apoios · 15 portão ou árvore · 20 muro com reentrâncias · 25 parede lisa", acao: "ação de movimento", pagina: 42,
          texto: "Passando, avança metade do deslocamento; falhando, não avança; falhando por 5 ou mais, cai. Com −1d20, avança o deslocamento todo. Escalando, fica desprevenido; sofrendo dano, novo teste — falhando, cai. Para segurar um personagem adjacente que cai: DT da superfície +5; falhando por 5 ou mais, cai junto." }),
        uso("Natação", { dt: "10 água calma · 15 agitada · 20+ tempestuosa", acao: "ação de movimento por rodada", pagina: 42,
          texto: "Passando, avança metade do deslocamento; falhando, boia sem avançar; falhando por 5 ou mais, afunda. Uma segunda ação de movimento dá outro teste para avançar mais. Submerso, prende a respiração por rodadas iguais ao Vigor; depois, Fortitude por rodada (DT 5, +5 por teste anterior) — falhando, afoga (0 PV e morrendo). Natação sofre a penalidade de carga." }),
        uso("Saltar", { dt: "longo: 5 por quadrado de 1,5 m · altura: 15 por quadrado (+5 sem 6 m de impulso)", acao: "parte do movimento", pagina: 42,
          texto: "Salto longo: DT 10 para 3 m, 15 para 4,5 m, 20 para 6 m… Em altura: 30 para 3 m." }),
      ],
      especificos: [
        esp(PERSEGUICAO, "Teste da perseguição", PERSEGUIR, SAH, 90),
        esp(PERSEGUICAO, "Cortar Caminho", "Caminho mais curto e difícil: −2d20 no teste de Atletismo; passando, acumula 2 sucessos. O mestre pode dizer que não há atalho.", SAH, 90),
        esp(PERSEGUICAO, "Esforço Extra", "+1d20 no teste de Atletismo, mas perde 1d4 PV por vez que já usou esta ação na cena (1d4, depois 2d4…).", SAH, 90),
        esp(PERSEGUICAO, "Criar Obstáculo (presa)", "−1d20 no teste de Atletismo e um teste de Força DT 15 (ou outro atributo coerente). Passando, a DT de Atletismo da rodada cai −5 para todos. Um personagem por rodada; o mestre pode vetar.", SAH, 90),
        esp(PERSEGUICAO, "Sacrifício", "Deixa de correr para atrapalhar os adversários: falha automaticamente no teste da rodada, mas dá +1d20 no teste dos outros personagens.", SAH, 91),
      ] },

    atualidades: { pagina: 43, intro: "Conhecimento de assuntos gerais — política, esporte, entretenimento — para responder dúvidas sobre eles.",
      usos: [
        uso("Informação", { dt: "15 comum · 20 específica · 25 quase desconhecida", pagina: 43,
          texto: "Comum: o autor de um livro. Específica: a história do fundador de uma empresa. Quase desconhecida: uma lenda urbana já esquecida." }),
      ] },

    ciencias: { pagina: 43, intro: "Estudo de campos científicos — matemática, física, química, biologia — para responder dúvidas sobre eles. A especialização num campo é só de interpretação, sem diferença na ficha.",
      usos: [
        uso("Informação", { dt: "sem teste (simples) · 20 complexa · 30 experimental", pagina: 43,
          texto: "Simples: a composição de uma substância conhecida. Complexa: detalhes de um procedimento científico. Campo experimental: a proteção de uma liga metálica recém-criada." }),
      ] },

    crime: { pagina: 43, intro: "Atividades ilícitas.",
      usos: [
        uso("Arrombar", { dt: "20 fechadura comum · 25 reforçada · 30 avançada", acao: "ação completa", pagina: 43,
          texto: "Abre uma fechadura trancada (porta de apartamento, de loja, cofre de banco). Exige kit (sem ele, −5)." }),
        uso("Furto", { dt: "20", acao: "ação padrão", pagina: 43,
          texto: "Pega um objeto de alguém (ou planta um nas posses dele). A vítima faz Percepção com DT igual ao seu resultado: passando, percebe a tentativa, tenha dado certo ou não." }),
        uso("Ocultar", { dt: "oposto: Percepção de quem puder ver", acao: "ação padrão", pagina: 44,
          texto: "Esconde um objeto em você mesmo. Quem revistar você recebe +10 na Percepção." }),
        uso("Sabotar", { treino: "veterano", dt: "20 ação simples · 30 complexa", acao: "1d4+1 ações completas (ação completa com −1d20)", pagina: 44,
          texto: "Desabilita um dispositivo (desativar um alarme; sabotar uma pistola para explodir ao disparar). Falhando por 5 ou mais, algo sai errado — o alarme dispara, ou você acha que sabotou e não sabotou. Exige kit (sem ele, −5)." }),
      ],
      notas: ["Os usos arrombar e sabotar exigem kit; sem ele, −5 no teste (p. 44)."],
      especificos: [] },

    diplomacia: { pagina: 44, intro: "Convencer pessoas com lábia e argumentação.",
      usos: [
        uso("Acalmar", { treino: "treinado", dt: "20 (+5 por vez que o alvo já foi acalmado na cena)", acao: "ação padrão", alcance: "adjacente", pagina: 44,
          texto: "Estabiliza um personagem enlouquecendo: ele fica com Sanidade 1." }),
        uso("Mudar Atitude", { dt: "oposto: Vontade do alvo", acao: "um minuto (ação completa com −2d20)", pagina: 44,
          texto: "Muda a atitude de um NPC em relação a você ou a outra pessoa em uma categoria, para cima ou para baixo; passando por 10 ou mais, até duas. Falhando por 5 ou mais, a atitude muda uma categoria na direção oposta. Uma vez por dia na mesma pessoa. Categorias (p. 45): prestativo (+5 em persuasão), amistoso, indiferente (padrão), inamistoso (−5 em persuasão) e hostil (persuasão falha automaticamente)." }),
        uso("Persuasão", { dt: "20 (ou oposto à Vontade, a critério do mestre)", acao: "um minuto ou mais", pagina: 44,
          texto: "Convence alguém a fazer algo — responder uma pergunta, prestar um favor. Pedido custoso (emprestar o carro): −5. Perigoso (cometer um crime): −10 ou falha automática. A atitude do alvo muda o teste (prestativo +5, inamistoso −5, hostil falha)." }),
      ],
      especificos: [
        esp(MEDO, "Acalmar (variante sem Insanidade)", "Com as regras de medo do SaH (que substituem Insanidade & Loucura): treinado em Diplomacia, Profissão (psicólogo) ou Religião, ação padrão e teste para acalmar um personagem adjacente com Sanidade 0 — ele recupera 1 ponto de Sanidade. A DT sobe +5 por vez que ele já foi acalmado na cena (o livro não dá a DT inicial dessa variante).", SAH, 88),
      ] },

    enganacao: { pagina: 44, intro: "Manipular pessoas com blefes e trapaças.",
      usos: [
        uso("Disfarce", { treino: "treinado", dt: "oposto: Percepção de quem prestar atenção", acao: "pelo menos dez minutos", pagina: 44,
          texto: "Muda a sua aparência ou a de outra pessoa. Quem conhece a pessoa imitada recebe +10 na Percepção. Exige kit (sem ele, −5)." }),
        uso("Falsificação", { treino: "veterano", dt: "oposto: Percepção de quem examinar", pagina: 44,
          texto: "Falsifica um documento. Documento muito complexo, ou com assinatura ou carimbo específico: −2d20." }),
        uso("Fintar", { treino: "treinado", dt: "oposto: Reflexos do alvo", acao: "ação padrão", alcance: "curto", pagina: 44,
          texto: "Passando, o alvo fica desprevenido contra o seu próximo ataque, se feito até o fim do seu próximo turno." }),
        uso("Insinuação", { dt: "20", pagina: 44,
          texto: "Diz algo a alguém sem que os outros entendam. Falhando por 5 ou mais, o receptor entende outra coisa. Outros podem fazer Intuição oposta ao seu teste para entender." }),
        uso("Intriga", { dt: "20 · 30 muito improvável", acao: "pelo menos um dia", pagina: 44,
          texto: "Espalha uma fofoca. Alguém pode rastrear a fonte com Investigação, DT igual ao seu resultado." }),
        uso("Mentir", { dt: "oposto: Intuição da vítima", pagina: 44,
          texto: "Faz alguém acreditar em algo que não é verdade. Mentira muito implausível: −2d20." }),
      ],
      especificos: [
        esp(FURTIVA, "Distrair", "Na regra de visibilidade: teste de Enganação DT 15 (o mestre pode aumentar contra um algoz astuto). Passando, diminui a sua visibilidade, ou a de um aliado próximo, em −1; falhando, a sua aumenta em +1. Uma vez por rodada (um personagem); cada uso na cena soma +5 à DT (20, 25…).", SAH, 93),
        esp(PERSEGUICAO, "No lugar de Atletismo", "Com justificativa (“finjo ir por um caminho e mudo no último momento”), Enganação pode substituir Atletismo — uma vez por perseguição.", SAH, 90),
      ] },

    fortitude: { pagina: 45, intro: "Testes de resistência contra efeitos que exigem vitalidade, como doenças e venenos — a DT vem do efeito.",
      usos: [
        uso("Fôlego", { dt: "5, +5 por teste anterior", pagina: 45,
          texto: "Manter o fôlego correndo ou sem respirar, depois das rodadas iguais ao Vigor: falhando correndo, fica fatigado; falhando submerso, afoga (0 PV e morrendo). Ver Corrida e Natação, em Atletismo." }),
      ] },

    furtividade: { pagina: 45, intro: "Ser discreto e sorrateiro.",
      usos: [
        uso("Esconder-se", { dt: "oposto: Percepção de quem puder notar", acao: "ação livre, só no fim do turno", pagina: 45,
          texto: "Quem falhar não percebe você (camuflagem total contra eles). Só termina escondido num lugar onde dê para se esconder (atrás de uma porta, quarto escuro, mata densa, multidão). Moveu-se no turno: −1d20 (andar à metade do deslocamento evita). Atacou ou fez algo muito chamativo: −3d20." }),
        uso("Seguir", { dt: "oposto: Percepção de quem é seguido", pagina: 45,
          texto: "Lugar sem esconderijos ou sem movimento (descampado, rua deserta): −5. A vítima tomando precauções: +5 na Percepção dela. Passando, segue até o destino; falhando, é percebido no meio do caminho." }),
      ],
      especificos: [
        esp(FURTIVA, "Esconder-se (visibilidade)", "Na regra de visibilidade (todos começam em 0; 3 ou mais no fim da rodada, o algoz vê): concentrado só em se esconder, teste de Furtividade DT 15 (uma boa ideia pode dar +1d20; o mestre pode aumentar a DT). Passando, a visibilidade cai −1; falhando, não muda.", SAH, 93),
        esp(PERSEGUICAO, "Despistar (presa)", "Com pelo menos 1 sucesso na perseguição, troca o teste de Atletismo por Furtividade: passando, ganha 2 sucessos; falhando, recebe 2 falhas.", SAH, 90),
      ] },

    iniciativa: { pagina: 45, intro: "Velocidade de reação. Quando uma cena de ação começa, cada envolvido faz um teste de Iniciativa; todos agem em ordem decrescente dos resultados.",
      usos: [] },

    intimidacao: { pagina: 45, intro: "Assustar ou coagir outras pessoas. Todos os usos de Intimidação são efeitos de medo.",
      usos: [
        uso("Assustar", { treino: "treinado", dt: "oposto: Vontade do alvo", acao: "ação padrão", alcance: "curto (uma pessoa)", pagina: 45,
          texto: "Passando, a pessoa fica abalada pelo resto da cena (não cumulativo). Passando por 10 ou mais, apavorada por uma rodada e depois abalada pelo resto da cena." }),
        uso("Coagir", { dt: "oposto: Vontade do alvo", acao: "um minuto ou mais", alcance: "adjacente (uma pessoa)", pagina: 45,
          texto: "Passando, ela obedece uma ordem sua (uma pequena tarefa, deixar você passar). Ordem perigosa ou contra a natureza dela: +5 no teste dela, ou passa automaticamente. Deixa a pessoa hostil contra você." }),
      ] },

    intuicao: { pagina: 45, intro: "Empatia e “sexto sentido”.",
      usos: [
        uso("Perceber Mentira", { dt: "oposto: Enganação de quem mente", pagina: 45,
          texto: "Descobre se alguém está mentindo. Mentira muito implausível dá −2d20 a quem mente." }),
        uso("Pressentimento", { treino: "treinado", dt: "20", pagina: 45,
          texto: "Analisa uma pessoa (índole, caráter) ou uma situação (algo estranho no comportamento dos moradores de uma cidadezinha). Só indica que há algo anormal; a causa é com Investigação." }),
      ] },

    investigacao: { pagina: 46, intro: "Descobrir pistas e informações.",
      usos: [
        uso("Interrogar", { dt: "sem teste (geral) · 20 restrita · 30 confidencial", acao: "de uma hora a um dia", pagina: 46,
          texto: "Pergunta por aí, ou fica de ouvidos atentos num lugar movimentado. Geral: o dono do bar. Restrita: o delegado do caso. Confidencial, ou que põe em risco quem fala: DT 30." }),
        uso("Procurar", { dt: "15 discreto · 20 escondido · 30 muito bem escondido", acao: "de uma ação completa (escrivaninha) a um dia (biblioteca)", pagina: 46,
          texto: "Examina um local: um item no meio da bagunça; um cofre atrás do quadro; uma passagem secreta, tinta invisível. Informações públicas na internet também são com Investigação (ver Tecnologia)." }),
      ],
      especificos: [
        esp(INVESTIGACAO, "Busca Obstinada", "Funciona como procurar pistas, com +1d20 no teste, mas a cada uso perde 1d4 de Sanidade por vez que já fez esta ação na cena (1d4, depois 2d4…).", SAH, 81),
        esp(INVESTIGACAO, "Recapitular (teste de Intelecto)", "Não é teste de Investigação: o jogador recapitula em voz alta, interpretando, o que o grupo já sabe. Se o mestre achar coerente, teste de INTELECTO DT 15: passando, uma nova pista a critério do mestre. Depois de um sucesso, ninguém mais usa na cena.", SAH, 81),
        esp(INVESTIGACAO, "Compartilhar (teste de Intelecto)", "Não é teste de Investigação: o jogador explica uma pista a outro, interpretando. O interlocutor faz um teste de INTELECTO DT 15 como ação livre; passando, o mestre destaca o que é mais relevante na pista. Depois de um sucesso, ninguém mais usa na cena.", SAH, 81),
      ] },

    luta: { pagina: 46, intro: "Ataques corpo a corpo. A DT é a Defesa do alvo; acertando, o dano é o da arma (regras de ataque no Capítulo 4).",
      usos: [],
      especificos: [
        esp(PERSEGUICAO, "Atrapalhar (presa)", "Uma presa atrapalha outra com o mesmo número de sucessos: −1d20 no próprio teste de Atletismo e Luta oposta à Luta ou Reflexos da vítima. Vencendo, a vítima sofre −2d20 no Atletismo dela. Só funciona se os perseguidores se contentarem com uma vítima.", SAH, 91),
      ] },

    medicina: { pagina: 46, intro: "Tratar ferimentos, doenças e venenos.",
      usos: [
        uso("Primeiros Socorros", { dt: "20 (+5 por vez que o alvo já foi estabilizado na cena)", acao: "ação padrão", alcance: "adjacente", pagina: 46,
          texto: "Um personagem morrendo e inconsciente perde essas condições e fica com 1 PV." }),
        uso("Cuidados Prolongados", { treino: "veterano", dt: "20", acao: "uma ação de interlúdio", pagina: 46,
          texto: "Trata até uma pessoa por ponto de Intelecto: passando, elas recuperam o dobro dos PV da ação dormir neste interlúdio." }),
        uso("Necropsia", { treino: "treinado", dt: "20 · +10 para causas raras ou extraordinárias", acao: "dez minutos", pagina: 46,
          texto: "Determina a causa e o momento aproximado da morte (veneno exótico ou maldição: DT 30)." }),
        uso("Tratamento", { treino: "treinado", dt: "a da doença ou veneno", acao: "ação completa", pagina: 46,
          texto: "Ajuda a vítima de doença ou veneno com efeito contínuo: passando, ela recebe +5 no próximo teste de Fortitude contra esse efeito." }),
      ],
      notas: ["Medicina exige kit; sem ele, −5 no teste.", "Em si mesmo, a perícia pode ser usada com −1d20 no teste."],
      especificos: [] },

    ocultismo: { pagina: 47, intro: "Estudo do paranormal. Ser treinado não significa conjurar rituais: pode ser só o estudo das manifestações registradas.",
      usos: [
        uso("Identificar Criatura", { dt: "a DT da Presença Perturbadora da criatura", acao: "ação completa", pagina: 47,
          texto: "Analisa uma criatura paranormal que possa ver: passando, descobre uma característica (um poder, uma vulnerabilidade), mais uma para cada 5 pontos acima da DT. Falhando por 5 ou mais, tira uma conclusão errada." }),
        uso("Identificar Item Amaldiçoado", { dt: "20", acao: "ação de interlúdio (ação completa com −2d20)", pagina: 47,
          texto: "Estuda um item amaldiçoado: descobre os poderes dele ou qual ritual contém." }),
        uso("Identificar Ritual", { dt: "10 + 5 por círculo do ritual", acao: "reação", pagina: 47,
          texto: "Quando alguém conjura, descobre qual ritual é pelos gestos, palavras e componentes." }),
        uso("Informação", { dt: "sem teste (simples) · 20 complexa · 30 mistérios e enigmas", pagina: 47,
          texto: "Dúvidas sobre o Outro Lado, objetos amaldiçoados, fenômenos paranormais, runas, profecias…" }),
        uso("Blindar a Mente", { treino: "veterano", dt: "20 · 25 num aliado", acao: "ação completa", custo: "1 PE", alcance: "você ou um aliado adjacente", fonte: AS1, pagina: 43,
          texto: "Concentra-se no que sabe do paranormal para proteger a sanidade: passando, +5 no seu próximo teste de Vontade até o fim da cena. Num aliado adjacente, a DT é 25 e ele também faz Vontade DT 20 — falhando, fica assustado com o que ouviu, perde 1d4 de Sanidade e não recebe o bônus." }),
      ] },

    percepcao: { pagina: 47, intro: "Notar coisas com os sentidos.",
      usos: [
        uso("Observar", { dt: "15 a 30 · contra quem se esconde, o resultado de Furtividade ou Crime · 20 ler lábios", pagina: 47,
          texto: "Vê coisas discretas ou escondidas: um livro numa estante (15), uma gota de sangue numa folha na mata à noite (30)." }),
        uso("Ouvir", { dt: "0 conversa próxima · 15 sussurros (+5 atrás de porta) · 20 ou Furtividade +10 contra quem não se vê", pagina: 47,
          texto: "Escuta barulhos sutis. Dormindo, pode testar com −2d20 (sucesso acorda). Perceber um ser que não se vê não tira a penalidade de lutar sem vê-lo." }),
      ] },

    pilotagem: { pagina: 47, intro: "Operar veículos terrestres e aquáticos (motos, carros, lanchas). Pilotar gasta uma ação de movimento por turno.",
      usos: [
        uso("Conduzir", { dt: "sem teste (comum) · 15 ruim · 25 terrível", acao: "um teste por turno", pagina: 47,
          texto: "Comum: estrada, clima tranquilo. Ruim: estrada de chão sem luz, chuva ou ventania. Terrível: terreno acidentado, tempestade." }),
        uso("Veículos aéreos", { treino: "veterano", pagina: 47,
          texto: "Com grau veterano, pode pilotar aviões e helicópteros." }),
      ],
      especificos: [
        esp(PERSEGUICAO, "Perseguição motorizada", "Num veículo, Pilotagem substitui Atletismo nos testes da perseguição (e nas ações dela). " + PERSEGUIR, SAH, 90),
      ] },

    pontaria: { pagina: 47, intro: "Ataques à distância. A DT é a Defesa do alvo; acertando, o dano é o da arma (regras de ataque no Capítulo 4).",
      usos: [] },

    profissao: { pagina: 47, intro: "Exercer uma profissão específica (advogado, engenheiro, jornalista, publicitário…). Combine com o mestre a profissão e que testes ela permite: um advogado argumenta com a polícia; um administrador investiga os documentos de uma corporação.",
      usos: [
        uso("Rendimentos", { treino: "treinado", pagina: 48,
          texto: "Quem é treinado tem rendimentos próprios ou reserva de capital: começa cada missão com um item a mais, além dos da Ordem — categoria I treinado, II veterano, III expert." }),
      ],
      especificos: [
        esp(MEDO, "Acalmar — Profissão (psicólogo)", "Com as regras de medo do SaH: treinado em Profissão (psicólogo), Diplomacia ou Religião, ação padrão e teste para acalmar um personagem adjacente com Sanidade 0 — ele recupera 1 de Sanidade. A DT sobe +5 por vez que ele já foi acalmado na cena.", SAH, 88),
        esp(FABRICACAO, "Fabricar itens", "Treinado na Profissão certa, usa ações de interlúdio para fabricar: Armeiro (armas, munições, proteções), Químico (explosivos, munições e consumíveis, como cicatrizante e spray de pimenta), Engenheiro (os demais equipamentos gerais). Uma ação de manutenção para consumíveis; duas (não precisam ser seguidas) para armas, proteções e equipamentos gerais. Itens modificados ou paranormais não podem ser fabricados. DT pela categoria: 0 → 15, I → 20, II → 25, III → 30, IV → 35. Exige o kit da Profissão (sem ele, −5). Item improvisado (não consumível): DT −5, mas dura uma cena. Presume acesso a matéria-prima; sem ele, o mestre pode vetar.", SAH, 94),
      ] },

    reflexos: { pagina: 48, intro: "Testes de resistência contra efeitos que exigem reação rápida, como armadilhas e explosões — a DT vem do efeito.",
      usos: [
        uso("Evitar finta", { dt: "oposto: Enganação de quem finta", pagina: 48,
          texto: "Reflexos é o teste contra fintar (Enganação): falhando, fica desprevenido contra o próximo ataque de quem fintou, até o fim do próximo turno dele." }),
      ],
      especificos: [
        esp(PERSEGUICAO, "Contra Atrapalhar", "Uma presa atrapalhada por outra pode opor Luta ou Reflexos à Luta dela; perdendo, sofre −2d20 no teste de Atletismo.", SAH, 91),
      ] },

    religiao: { pagina: 48, intro: "Teologia e as religiões do mundo.",
      usos: [
        uso("Acalmar", { dt: "20", acao: "ação padrão", alcance: "adjacente", pagina: 48,
          texto: "Religião no lugar de Diplomacia para acalmar um personagem enlouquecendo: ele fica com Sanidade 1 (a DT sobe +5 por vez que já foi acalmado na cena)." }),
        uso("Informação", { dt: "10 simples · 20 complexa · 30 mistérios e enigmas", pagina: 48,
          texto: "Mitos, profecias, relíquias sagradas…" }),
        uso("Rito", { treino: "veterano", dt: "20", pagina: 48,
          texto: "Realiza uma cerimônia religiosa (batizado, casamento, funeral…)." }),
      ],
      especificos: [
        esp(MEDO, "Acalmar (variante sem Insanidade)", "Com as regras de medo do SaH: treinado em Religião, Diplomacia ou Profissão (psicólogo), ação padrão e teste para acalmar um personagem adjacente com Sanidade 0 — ele recupera 1 de Sanidade. A DT sobe +5 por vez que ele já foi acalmado na cena.", SAH, 88),
      ] },

    sobrevivencia: { pagina: 48, intro: "Guiar-se em regiões selvagens e evitar os perigos da natureza.",
      usos: [
        uso("Acampamento", { treino: "treinado", dt: "15 campo aberto · 20 mata fechada · 25 regiões extremas (−5 por aridez ou clima ruim, cumulativo)", pagina: 48,
          texto: "Consegue abrigo e alimento nos ermos: passando, você e o grupo podem alimentar-se e dormir (ações de interlúdio) mesmo ao relento." }),
        uso("Identificar Animal", { treino: "treinado", dt: "20", acao: "ação completa", pagina: 48,
          texto: "Identifica um animal exótico — como Identificar Criatura, em Ocultismo: uma característica, mais uma a cada 5 acima da DT; falhando por 5 ou mais, uma conclusão errada." }),
        uso("Orientar-se", { dt: "a do terreno (como em Acampamento)", acao: "um teste por dia de viagem", pagina: 48,
          texto: "Passando, avança o deslocamento normal; falhando, metade; falhando por 5 ou mais, se perde e não avança no dia. Num grupo, um guia; treinados podem ajudar. Se mais de um quiser guiar, todos rolam em segredo e o grupo escolhe quem seguir antes de ver o resultado." }),
        uso("Rastrear", { treino: "treinado", dt: "15 grupo grande ou solo macio · 20 solo comum · 25 solo duro (+1 por dia desde os rastros)", acao: "um teste por dia de perseguição", pagina: 48,
          texto: "Identifica e segue rastros. Visibilidade precária ou clima ruim: −1d20. Rastreando, o deslocamento cai à metade. Falhando, pode tentar de novo gastando mais um dia." }),
      ] },

    tatica: { pagina: 48, intro: "Educação militar.",
      usos: [
        uso("Analisar Terreno", { dt: "20", acao: "ação de movimento", pagina: 48,
          texto: "Observa o campo de batalha: passando, descobre uma vantagem (cobertura, camuflagem, terreno elevado), se houver." }),
        uso("Plano de Ação", { treino: "veterano", dt: "20", acao: "ação padrão", alcance: "médio (um aliado)", pagina: 48,
          texto: "Passando, +5 na Iniciativa do aliado. Se ele ainda não agiu na rodada e passar a ter Iniciativa maior que a sua, age logo depois do seu turno; nas próximas rodadas, segue a nova ordem." }),
      ],
      especificos: [
        esp(PERSEGUICAO, "No lugar de Atletismo", "Com justificativa (“analiso o terreno em busca da melhor rota”), Tática pode substituir Atletismo — uma vez por perseguição.", SAH, 90),
      ] },

    tecnologia: { pagina: 48, intro: "Eletrônica e informática avançadas. Usos cotidianos (mexer num computador ou celular) não pedem treinamento nem teste; a perícia é para os avançados, como reprogramar um sistema de vigilância ou invadir um servidor seguro.",
      usos: [
        uso("Falsificação", { treino: "veterano", dt: "oposto: Percepção de quem examinar", pagina: 48,
          texto: "Como a Falsificação de Enganação, só para documentos eletrônicos: documento muito complexo, ou com assinatura ou carimbo específico, −2d20." }),
        uso("Hackear", { dt: "15 computador pessoal · 20 rede profissional · 25 servidor corporativo, governamental ou militar", acao: "1d4+1 ações completas (ação completa com −1d20)", pagina: 48,
          texto: "Invade um computador protegido. Falhando, só tenta de novo com informação nova (um usuário, uma senha); falhando por 5 ou mais, pode ser rastreado pelos administradores. Dentro do sistema: para achar algo, Localizar Arquivo; alterar ou apagar arquivos, desativar aplicativos ou bloquear usuários podem pedir novos testes, a critério do mestre." }),
        uso("Localizar Arquivo", { dt: "15 computador pessoal · 20 rede pequena · 25 rede corporativa ou governamental", acao: "1 ação completa · 1d4+1 · 1d6+2 ações completas", pagina: 49,
          texto: "Procura um arquivo específico num sistema que você possa acessar (sem acesso, primeiro Hackear). Só para sistemas privados que você não conhece; informação pública na internet é com Investigação (e Obter Informações, abaixo)." }),
        uso("Operar Dispositivo", { dt: "15 comum · 20 profissional · 25 sistema protegido", acao: "1d4+1 ações completas (ação completa com −1d20)", pagina: 49,
          texto: "Opera um dispositivo eletrônico complexo: câmeras remotas, fechaduras eletrônicas, alarmes. Exige kit (sem ele, −5)." }),
        uso("Obter Informações", { dt: "5", acao: "ação completa", fonte: AS4, pagina: 64,
          texto: "Pesquisa rápida na internet sobre um local ou pessoa: passando, 1 informação, mais 1 para cada 5 pontos acima da DT." }),
        uso("Rastrear Trilha Digital", { treino: "veterano", dt: "20 trajeto simples · 25 tortuoso · 30 enigmático", acao: "1d4+1 ações completas", fonte: AS5, pagina: 54,
          texto: "Um algoritmo interpreta o movimento de um aparelho eletrônico pelas partículas de radiação dele: refaz o trajeto por onde passou quem o portava." }),
      ],
      notas: ["Operar dispositivo exige kit; sem ele, −5 no teste (p. 49)."],
      especificos: [] },

    vontade: { pagina: 49, intro: "Testes de resistência contra efeitos que exigem determinação, como intimidação e rituais que afetam a mente — a DT vem do efeito. Também é a perícia para conjurar rituais em condições adversas (Capítulo 5).",
      usos: [] },
  };

  var NOMES_DOS_LIVROS = { OPRPG: "Ordem Paranormal RPG", AS1: "Arquivos Secretos 1", AS4: "Arquivos Secretos 4", AS5: "Arquivos Secretos 5", SAH: "Sobrevivendo ao Horror" };

  function referencia(fonte, pagina) {
    var C = global.RAMAOrdemCatalogo;
    var nome = C && C.nomeDoLivro ? C.nomeDoLivro(fonte) : (NOMES_DOS_LIVROS[fonte] || fonte);
    return nome + (pagina ? ", p. " + pagina : "");
  }

  function consulta(chave) { return PERICIAS_USOS[chave] || null; }

  global.RAMAOrdemPericiasUsos = {
    PERICIAS_USOS: PERICIAS_USOS,
    REGRAS_GERAIS: REGRAS_GERAIS,
    consulta: consulta,
    referencia: referencia,
  };
})(typeof window !== "undefined" ? window : globalThis);
