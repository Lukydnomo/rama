/* =====================================================================
   R.A.M.A. — Oblívio · tabelas do Buraco (pp. 98–115)
   =====================================================================
   As Cartas do Buraco sem o baralho físico: o livro dá as TABELAS
   ALTERNATIVAS (p. 113) — Entrada por 1D12 e Construção por 1D100,
   61+ rola de novo — e é delas que o R.A.M.A. saca as cartas. Não
   existe aqui composição oficial de baralho inventada.

   Cada resultado tem `eventos`: o que o motor do Buraco
   (js/oblivio/buraco.js) transforma em ação de jogo — iniciar um
   encontro, conceder item, abrir teste, cena de tensão, avançar o
   objetivo. O `resumo` é só para ler.

   Faixas sobrepostas ou títulos trocados no livro estão anotados com a
   leitura adotada (docs/OBLIVIO.md, seção Buraco).
   ===================================================================== */

(function (global) {
  "use strict";

  function f(de, ate, chave, nome, resumo, eventos, extra) {
    return Object.assign({ de: de, ate: ate, chave: chave, nome: nome, resumo: resumo, eventos: eventos || [] }, extra || {});
  }
  function enc(lista, extra) {
    return Object.assign({ tipo: "iniciarEncontro", ameacas: lista.map(function (x) { return { ameaca: x[1], qtd: x[0] }; }), recompensa: true }, extra || {});
  }

  /* 1D12 (p. 114). */
  var ENTRADA = [
    { de: 1, ate: 6, conexoes: 2 },
    { de: 7, ate: 10, conexoes: 3 },
    { de: 11, ate: 12, conexoes: 4 },
  ];

  /* 1D100 (pp. 114–115). 61+ rola de novo. */
  var CONSTRUCAO = [
    { de: 1, ate: 4, carta: "armadilha", conexoes: 2 }, { de: 5, ate: 8, carta: "armadilha", conexoes: 3 }, { de: 9, ate: 10, carta: "armadilha", conexoes: 4 },
    { de: 11, ate: 14, carta: "encontro", conexoes: 2 }, { de: 15, ate: 18, carta: "encontro", conexoes: 3 }, { de: 19, ate: 20, carta: "encontro", conexoes: 4 },
    { de: 21, ate: 24, carta: "escada", conexoes: 1 },
    { de: 25, ate: 28, carta: "infortunio", conexoes: 2 }, { de: 29, ate: 32, carta: "infortunio", conexoes: 3 }, { de: 33, ate: 34, carta: "infortunio", conexoes: 4 },
    { de: 35, ate: 38, carta: "objetivo", conexoes: 1 },
    { de: 39, ate: 42, carta: "saida", conexoes: 1 },
    { de: 43, ate: 46, carta: "segredo", conexoes: 1 },
    { de: 47, ate: 48, carta: "tesouro", conexoes: 1 }, { de: 49, ate: 52, carta: "tesouro", conexoes: 2 }, { de: 53, ate: 54, carta: "tesouro", conexoes: 3 }, { de: 55, ate: 56, carta: "tesouro", conexoes: 4 },
    { de: 57, ate: 58, carta: "vazio", conexoes: 2 }, { de: 59, ate: 60, carta: "vazio", conexoes: 3 },
  ];
  var CONSTRUCAO_REROLA_ACIMA = 60;

  var CARTAS = {
    entrada: { nome: "Entrada", pag: 100 }, fogueira: { nome: "Fogueira", pag: 100 },
    efeito: { nome: "Efeito", pag: 100 }, missao: { nome: "Missão", pag: 101 },
    armadilha: { nome: "Armadilha", pag: 103 }, encontro: { nome: "Encontro", pag: 104 },
    escada: { nome: "Escada", pag: 106 }, infortunio: { nome: "Infortúnio", pag: 106 },
    objetivo: { nome: "Objetivo", pag: 108 }, saida: { nome: "Saída", pag: 111 },
    segredo: { nome: "Segredo", pag: 112 }, tesouro: { nome: "Tesouro", pag: 112 },
    vazio: { nome: "Vazio", pag: 113 }, oblivio: { nome: "Oblívio", pag: 103, lacuna: true },
  };

  /* Efeito (1D6, pp. 100–101) — vale para o Buraco todo ou um andar. */
  var EFEITO = [
    f(1, 1, "amaldicoado", "Amaldiçoado", "Toda recuperação de Estresse dentro do Buraco é pela metade.", [{ tipo: "regraDoBuraco", recuperacao: 0.5 }]),
    f(2, 2, "assustador", "Assustador", "Perdas de Coragem dentro do Buraco dobram.", [{ tipo: "regraDoBuraco", perdaDeCoragem: 2 }]),
    f(3, 3, "confortavel", "Confortável", "Descansar no Buraco recupera todo o Estresse.", [{ tipo: "regraDoBuraco", descansoTotal: true }]),
    f(4, 4, "escuro", "Escuro", "Combustíveis e outras fontes de luz duram metade.", [{ tipo: "regraDoBuraco", luz: 0.5 }]),
    f(5, 5, "insonia", "Insônia", "Não é possível descansar no Buraco.", [{ tipo: "regraDoBuraco", semDescanso: true }]),
    f(6, 6, "mortal", "Mortal", "Atingir o limite de Estresse conta duas vezes Fora de Ação.", [{ tipo: "regraDoBuraco", foraDeAcao: 2 }]),
  ];

  /* Missão (1D6, p. 102). `objetivo`: a tabela que a carta de Objetivo
     consulta; `carta`: o tipo de carta que, além da de Objetivo, aciona
     o objetivo. */
  var MISSAO = [
    f(1, 1, "acabeComOMal", "Acabe com o Mal", "Vencer metade do número de Personas (mín. 1) + 1D4 combates; ao achar Encontro ou Objetivo, rola na Tabela de Objetivo.",
      [{ tipo: "objetivoDeMissao", combates: { metadeDasPersonas: true, minimo: 1, mais: "1d4" } }], { objetivo: "acabeComOMal", carta: "encontro" }),
    f(2, 2, "acheASaida", "Ache a Saída", "Rola o Objetivo antes de começar; a Entrada deixa de servir de saída — só Saída ou Objetivo.",
      [{ tipo: "objetivoDeMissao", rolarObjetivoAntes: true, entradaFechada: true }], { objetivo: "acheASaida", carta: "saida" }),
    f(3, 3, "destruaOOculto", "Destrua o Oculto", "Achar uma carta de Segredo ou Objetivo e rolar o Objetivo.",
      [{ tipo: "objetivoDeMissao" }], { objetivo: "destruaOOculto", carta: "segredo" }),
    f(4, 4, "devolvaAoLar", "Devolva ao Lar", "Começam com algo que deve voltar ao Oblívio; achar Vazio ou Objetivo e rolar o Objetivo.",
      [{ tipo: "objetivoDeMissao", carregaAlgo: true }], { objetivo: "devolvaAoLar", carta: "vazio" }),
    f(5, 5, "resgateOPerdido", "Resgate o Perdido", "Achar Tesouro ou Objetivo e rolar o Objetivo.",
      [{ tipo: "objetivoDeMissao" }], { objetivo: "resgateOPerdido", carta: "tesouro" }),
    f(6, 6, "salveODia", "Salve o Dia", "Achar uma carta de Objetivo e rolar o Objetivo: destruir o avatar do Oblívio.",
      [{ tipo: "objetivoDeMissao" }], { objetivo: "salveODia", carta: "objetivo" }),
  ];

  /* Armadilha (1D6, pp. 103–104). */
  var ARMADILHA = [
    f(1, 1, "claustrofobia", "Claustrofobia", "Cena de Tensão: 3 rodadas para 2 sucessos em Esforço, Bandidagem ou similar; falhando, cada Persona sofre 3D4 e fica Sem Fôlego.",
      [{ tipo: "tensao", rodadas: 3, sucessos: 2, conhecimentos: ["esforco", "bandidagem"], falha: { todos: { dano: "3d4", mazela: "semFolego" } } }]),
    f(2, 2, "coringa", "Coringa", "Não dispara agora; na próxima entrada de qualquer um na carta, rola de novo nesta tabela.",
      [{ tipo: "armadilhaArmada", rolaDeNovo: "armadilha" }]),
    f(3, 3, "defeito", "Defeito", "Nada acontece; desmontar com Saber dá 1D4 Recursos.",
      [{ tipo: "testeOpcional", conhecimento: "saber", quem: "um", sucesso: { item: "recurso", qtd: "1d4" } }]),
    f(4, 4, "explosao", "Explosão", "1D6: 1–2 uma Bomba Atordoante, 3–4 3D2 Bombas de Estalo, 5–6 2D4 Bombas Incendiárias; todos testam Reflexos.",
      [{ tipo: "explosao", dado: "1d6", tabela: [{ de: 1, ate: 2, bomba: "bombaAtordoante", qtd: 1 }, { de: 3, ate: 4, bomba: "bombaDeEstalo", qtd: "3d2" }, { de: 5, ate: 6, bomba: "bombaIncendiaria", qtd: "2d4" }], teste: "reflexos" }]),
    f(5, 5, "ferimento", "Ferimento", "Todos testam Reflexos; falhando, 3D4 e uma Ferida igual ao dano.",
      [{ tipo: "teste", quem: "todos", conhecimento: "reflexos", falha: { dano: "3d4", feridaIgualAoDano: true } }]),
    f(6, 6, "visao", "Visão", "Todos testam Emocional; falhando, perdem 1D6 de Coragem.",
      [{ tipo: "teste", quem: "todos", conhecimento: "emocional", falha: { coragem: "-1d6" } }]),
  ];

  /* Encontros (1D6, pp. 104–106). Dificuldade pelo MAIOR entre Personas
     e missões concluídas: Fácil até 3 Personas ou 2 missões; Médio até
     5 ou 5; Difícil acima. */
  var ENCONTRO = {
    facil: [
      f(1, 1, "arrastao", "Arrastão", "3 Trombadinhas.", [enc([[3, "trombadinha"]])]),
      f(2, 2, "mausoleu", "Mausoléu", "1 Mortalha e 3 Golfos; o vínculo da Mortalha está nesta sala: 1 sucesso em Rastro para achar e uma Ação Regular para destruir.",
        [enc([[1, "mortalha"], [3, "golfo"]], { vinculo: { salas: [[1, 6, 0]], sucessos: 1, conhecimento: "rastro", coletivo: false } })]),
      f(3, 3, "necroterio", "Necrotério", "2 Carcaças.", [enc([[2, "carcaca"]])]),
      f(4, 4, "pestilencia", "Pestilência", "3 Pestes.", [enc([[3, "peste"]])]),
      f(5, 5, "podridao", "Podridão", "5 Golfos.", [enc([[5, "golfo"]])]),
      f(6, 6, "umbral", "Umbral", "1 Mortalha e 1 Carcaça; o vínculo está nesta sala: 2 sucessos coletivos em Rastro.",
        [enc([[1, "mortalha"], [1, "carcaca"]], { vinculo: { salas: [[1, 6, 0]], sucessos: 2, conhecimento: "rastro", coletivo: true } })]),
    ],
    medio: [
      f(1, 1, "contaminacao", "Contaminação", "3 Mutágenos.", [enc([[3, "mutageno"]])]),
      f(2, 2, "falsidade", "Falsidade", "1 Quimera.", [enc([[1, "quimera"]])]),
      f(3, 3, "multidao", "Multidão", "2 Enxames.", [enc([[2, "enxame"]])]),
      f(4, 4, "obsessao", "Obsessão", "1 Coletor.", [enc([[1, "coletor"]])]),
      f(5, 5, "peconha", "Peçonha", "2 Pestes e 1 Cilada.", [enc([[2, "peste"], [1, "cilada"]])]),
      f(6, 6, "umbral", "Umbral", "3 Carcaças e 2 Mortalhas; os vínculos estão nesta sala (1–3) ou na próxima (4–6): 4 sucessos coletivos em Rastro por vínculo.",
        [enc([[3, "carcaca"], [2, "mortalha"]], { vinculo: { salas: [[1, 3, 0], [4, 6, 1]], sucessos: 4, conhecimento: "rastro", coletivo: true } })]),
    ],
    dificil: [
      f(1, 1, "contaminacao", "Contaminação", "3 Mutágenos e 1 Patógeno.", [enc([[3, "mutageno"], [1, "patogeno"]])]),
      f(2, 2, "cacada", "Caçada", "6 Pestes e 1 Errante.", [enc([[6, "peste"], [1, "errante"]])]),
      f(3, 3, "invasao", "Invasão", "3 Mortalhas e 1 Coletor; vínculos nesta sala (1–2), na próxima (3–4) ou na seguinte (5–6): 6 sucessos coletivos em Rastro por vínculo.",
        [enc([[3, "mortalha"], [1, "coletor"]], { vinculo: { salas: [[1, 2, 0], [3, 4, 1], [5, 6, 2]], sucessos: 6, conhecimento: "rastro", coletivo: true } })]),
      f(4, 4, "multidao", "Multidão", "2 Enxames e 1 Rei dos Ratos.", [enc([[2, "enxame"], [1, "reiDosRatos"]])]),
      f(5, 5, "passeata", "Passeata", "3 Carcaças e 1 Horda.", [enc([[3, "carcaca"], [1, "horda"]])]),
      f(6, 6, "podridao", "Podridão", "2 Amálgamas Golfadas e 6 Golfos.", [enc([[2, "amalgamaGolfada"], [6, "golfo"]])]),
    ],
  };
  var DIFICULDADE_DE_ENCONTRO = [
    { chave: "facil", personasAte: 3, missoesAte: 2 },
    { chave: "medio", personasAte: 5, missoesAte: 5 },
    { chave: "dificil", personasAte: Infinity, missoesAte: Infinity },
  ];

  /* Infortúnio (1D6, p. 107). */
  var INFORTUNIO = [
    f(1, 1, "aposta", "Aposta", "Uma Persona rola 1D6: 1–3 todas sofrem 2D4; 4–6 todas recuperam 2D4.",
      [{ tipo: "aposta", dado: "1d6", baixo: { todos: { dano: "2d4" } }, alto: { todos: { cura: "2d4" } } }]),
    f(2, 2, "bolsoFurado", "Bolso Furado", "Todas rolam 1D6; a de menor resultado perde um Equipamento Guardado (sorteado ou à escolha da Testemunha).",
      [{ tipo: "perderItem", dado: "1d6", menor: true, de: "guardados" }]),
    f(3, 3, "dejaVu", "Déjà-vu", "Na próxima vez que passarem por um cômodo já explorado, o efeito da carta dele acontece de novo (ou rola um novo).",
      [{ tipo: "dejaVu" }]),
    f(4, 4, "desmoronamento", "Desmoronamento", "Uma conexão desta carta fica bloqueada; 3 sucessos em grupo em Esforço ou similar desobstruem.",
      [{ tipo: "bloquearConexao", desbloqueio: { sucessos: 3, conhecimento: "esforco", coletivo: true } }]),
    f(5, 5, "drenagem", "Drenagem", "Todas testam Emocional; falhando, 1D6 decide o atributo que cai 1 (Carne, Força, Fôlego, Coragem, Velocidade; 6 rola de novo).",
      [{ tipo: "teste", quem: "todos", conhecimento: "emocional", falha: { reduzAtributo: { dado: "1d6", ordem: ["carne", "forca", "folego", "coragem", "velocidade"], rerola: 6 } } }], { divergencia: "B4" }),
    f(6, 6, "mauOlhado", "Mau Olhado", "Todas testam Emocional; falhando, 1D6 decide a mazela (Botando para Fora, Carne Fraca, Ferida, Fome, Pegando Fogo, Sem Fôlego); Ferida e Fogo com 2D4.",
      [{ tipo: "teste", quem: "todos", conhecimento: "emocional", falha: { mazelaPorD6: ["botandoParaFora", "carneFraca", "ferida", "fome", "pegandoFogo", "semFolego"], danoDaMazela: "2d4" } }]),
  ];

  /* Objetivo (pp. 108–111), por missão. */
  var OBJETIVO = {
    acabeComOMal: [
      f(1, 2, "doseDupla", "Dose Dupla", "Rola um Encontro e enfrenta o dobro das Ameaças.", [{ tipo: "encontroDeObjetivo", multiplica: 2 }]),
      f(3, 5, "incentivo", "Incentivo", "Rola um Encontro; todas as Ameaças ganham uma Ação Regular a mais.", [{ tipo: "encontroDeObjetivo", acaoExtra: 1 }]),
      f(6, 6, "general", "General", "Rola um Encontro e uma Ameaça de Grau 5 aleatória se junta.", [{ tipo: "encontroDeObjetivo", mais: { grau: 5, qtd: 1 } }]),
    ],
    acheASaida: [
      f(1, 2, "colapsoIminente", "Colapso Iminente", "Fim de cada cena sem escapar: 1D4 de Estresse por cena já passada.", [{ tipo: "regraDoBuraco", colapso: { dado: "d4", cresce: true } }]),
      f(3, 4, "fimDaLinha", "Fim da Linha", "Na Tabela de Saída, Saída Falsa passa a sair com 1–3.", [{ tipo: "regraDoBuraco", saidaFalsaAte: 3 }]),
      f(5, 6, "piquePega", "Pique-Pega", "Fim de cada cena, 1D6: 5–6 um Encontro ataca.", [{ tipo: "regraDoBuraco", perseguicao: { dado: "1d6", de: 5 } }]),
    ],
    /* O livro: Portal 1, Relicário "3 a 5", Ritual "5 ou 6" — o 2 sobra e
       o 5 repete. Leitura adotada: 1–2, 3–4, 5–6 (B1). */
    destruaOOculto: [
      f(1, 2, "portal", "Portal", "Portal com Proteção 5 e 40 de Estresse (ou 5 sucessos em Místico em conjunto); a cada rodada aberto, mais Ameaças à frente dele.",
        [{ tipo: "portal", protecao: 5, limiteEstresse: 40, desativa: { sucessos: 5, conhecimento: "mistico", coletivo: true },
          ondas: [{ rodada: 1, grau: 1, qtd: "2d4" }, { rodada: 2, grau: 2, qtd: 3 }, { rodada: 3, grau: 3, qtd: 2 }, { rodada: 4, grau: 4, qtd: 1 }, { rodada: 5, grau: 5, qtd: 1 }, { rodada: 6, grau: 6, qtd: 1 }] }],
        { divergencia: "B1" }),
      f(3, 4, "relicario", "Relicário", "Cena de Tensão: 6 rodadas para 12 sucessos em grupo em Saber ou similar.",
        [{ tipo: "tensao", rodadas: 6, sucessos: 12, conhecimentos: ["saber"], coletivo: true }], { divergencia: "B1" }),
      f(5, 6, "ritual", "Ritual", "3 rodadas para derrotar 5 Carcaças antes que uma Ameaça de Grau 5 seja invocada.",
        [enc([[5, "carcaca"]], { prazo: { rodadas: 3, senao: { grau: 5, qtd: 1 } } })], { divergencia: "B1" }),
    ],
    /* Impressa como "Destrua o Oculto" pela segunda vez (p. 110); o
       conteúdo ("retornar aquilo que havia sido tomado do Oblívio") é o
       de Devolva ao Lar (B2). */
    devolvaAoLar: [
      f(1, 4, "anomalia", "Anomalia", "Cena de Tensão: 4 rodadas para 8 sucessos em grupo em Esforço; cada falha, 2D6 de Estresse.",
        [{ tipo: "tensao", rodadas: 4, sucessos: 8, conhecimentos: ["esforco"], coletivo: true, porFalha: { dano: "2d6" } }], { divergencia: "B2" }),
      f(5, 6, "legiao", "Legião", "1D6: 1–3 quatro de Grau 2 e uma de Grau 3; 4–5 duas de Grau 4 e uma de Grau 5; 6 uma de Grau 6.",
        [{ tipo: "encontroPorGrau", dado: "1d6", tabela: [{ de: 1, ate: 3, graus: [[2, 4], [3, 1]] }, { de: 4, ate: 5, graus: [[4, 2], [5, 1]] }, { de: 6, ate: 6, graus: [[6, 1]] }] }],
        { divergencia: "B2" }),
    ],
    resgateOPerdido: [
      f(1, 4, "falsaEsperanca", "Falsa Esperança", "Ainda não é aqui: rola na Tabela de Tesouro e continua. Se for a última carta de Tesouro/Objetivo, conta como Na Mosca.",
        [{ tipo: "tesouro" }, { tipo: "objetivoNaoCumprido", ultimaViraSucesso: true }]),
      f(5, 6, "naMosca", "Na Mosca", "Encontrou; volte à Entrada ou Saída mais próxima.", [{ tipo: "objetivoCumprido", voltar: true }]),
    ],
    salveODia: [
      f(1, 2, "arena", "Arena", "1 Apogeu e 1 Errante.", [enc([[1, "apogeu"], [1, "errante"]])]),
      f(3, 4, "palacio", "Palácio", "1 Comensal e 4 Carcaças.", [enc([[1, "comensal"], [4, "carcaca"]])]),
      f(5, 6, "praca", "Praça", "1 Forca.", [enc([[1, "forca"]])]),
    ],
  };

  /* Saída (1D6, p. 111). O livro: "2 a 5" Normal e "5 ou 6" Emergência.
     Leitura adotada: Emergência em 5–6, como a faixa dela diz; Normal
     2–4 (B3). */
  var SAIDA = [
    f(1, 1, "saidaFalsa", "Saída Falsa", "Vira um Encontro com uma Cilada. Se for a última Saída do Buraco, é uma Saída Normal.",
      [enc([[1, "cilada"]])], { ultimaViraNormal: true }),
    f(2, 4, "saidaNormal", "Saída Normal", "Pode sair (e voltar depois) por aqui.", [{ tipo: "saida", volta: true }], { divergencia: "B3" }),
    f(5, 6, "saidaDeEmergencia", "Saída de Emergência", "Saindo por aqui, todos recuperam todo o Estresse; não dá para voltar por ela.",
      [{ tipo: "saida", volta: false, curaTotal: true }], { divergencia: "B3" }),
  ];

  /* Segredo (1D6, p. 112) — impressa com o título "Tabela de Saída" (B5). */
  var SEGREDO = [
    f(1, 1, "acampamento", "Acampamento", "Descanso seguro sem gastar Fogueira.", [{ tipo: "descansoSeguro", semFogueira: true }]),
    f(2, 2, "atalho", "Atalho", "Coloca a próxima carta da Missão numa extremidade desta, mesmo sem conexão livre.", [{ tipo: "atalho" }]),
    f(3, 3, "enfermaria", "Enfermaria", "Todos recuperam 5 de Estresse e testam Rastro; um Sucesso Extremo acha um Kit de Primeiros Socorros.",
      [{ tipo: "cura", todos: 5 }, { tipo: "teste", quem: "todos", conhecimento: "rastro", extremo: { item: "kitPrimeirosSocorros", qtd: 1, umaVez: true } }]),
    f(4, 4, "jardim", "Jardim", "Todos recuperam 1 de Coragem e testam Rastro; sucesso acha 1D2 Estimulantes cada.",
      [{ tipo: "coragem", todos: 1 }, { tipo: "teste", quem: "todos", conhecimento: "rastro", sucesso: { item: "estimulante", qtd: "1d2" } }]),
    f(5, 5, "oficina", "Oficina", "Cada Persona repara 5 de Estresse de um Equipamento e testa Rastro; sucesso acha 1D4 Recursos.",
      [{ tipo: "reparo", todos: 5 }, { tipo: "teste", quem: "todos", conhecimento: "rastro", sucesso: { item: "recurso", qtd: "1d4" } }]),
    f(6, 6, "passagem", "Passagem", "Conexão especial com outra carta qualquer do Buraco, até em outro andar.", [{ tipo: "passagem" }]),
  ];

  /* Tesouro (1D6, p. 113). */
  var TESOURO = [
    f(1, 1, "cofre", "Cofre", "Cada Persona rola 3D6 moedas.", [{ tipo: "moedas", cada: "3d6" }]),
    f(2, 2, "contrabando", "Contrabando", "1D6: 1–3 1D4 Armas, 4–6 1D4 Proteções; outro D6 para o peso (1–3 Leve, 4–5 Média, 6 Pesada).",
      [{ tipo: "contrabando", dado: "1d6", armas: [1, 3], protecoes: [4, 6], qtd: "1d4", peso: { dado: "1d6", leve: [1, 3], media: [4, 5], pesada: [6, 6] } }]),
    f(3, 3, "dica", "Dica", "As cartas adjacentes ainda não exploradas são reveladas (ou uma carta à escolha).", [{ tipo: "revelar", adjacentes: true }]),
    f(4, 4, "forja", "Forja", "Cada Persona ganha uma Modificação à escolha sem gastar Recursos.", [{ tipo: "modificacaoGratis", cada: 1 }]),
    f(5, 5, "santuario", "Santuário", "Cada Persona escolhe: recuperar todo o Estresse, remover todas as mazelas ou ganhar 1D6 de Coragem.",
      [{ tipo: "escolhaDeCada", opcoes: [{ chave: "curaTotal" }, { chave: "removerMazelas" }, { chave: "coragem", dado: "1d6" }] }]),
    f(6, 6, "suprimentos", "Suprimentos", "Cada Persona rola 1D6: 1–2 1D2 Combustível, 3–4 1D4 Estimulantes, 5–6 1D6 Rações.",
      [{ tipo: "itemPorD6", cada: true, tabela: [{ de: 1, ate: 2, item: "combustivel", qtd: "1d2" }, { de: 3, ate: 4, item: "estimulante", qtd: "1d4" }, { de: 5, ate: 6, item: "racao", qtd: "1d6" }] }]),
  ];

  global.RAMAOblivioBuraco = {
    ENTRADA: ENTRADA, CONSTRUCAO: CONSTRUCAO, CONSTRUCAO_REROLA_ACIMA: CONSTRUCAO_REROLA_ACIMA, CARTAS: CARTAS,
    EFEITO: EFEITO, MISSAO: MISSAO, ARMADILHA: ARMADILHA, ENCONTRO: ENCONTRO, DIFICULDADE_DE_ENCONTRO: DIFICULDADE_DE_ENCONTRO,
    INFORTUNIO: INFORTUNIO, OBJETIVO: OBJETIVO, SAIDA: SAIDA, SEGREDO: SEGREDO, TESOURO: TESOURO,
  };
})(typeof window !== "undefined" ? window : globalThis);
