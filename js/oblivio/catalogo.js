/* =====================================================================
   R.A.M.A. — Oblívio · catálogo da Persona
   =====================================================================
   Os dados das regras de Oblívio RPG, separados do código que os usa
   (js/oblivio/regras.js). Ameaças em js/oblivio/ameacas-dados.js; as
   tabelas do Buraco em js/oblivio/buraco-dados.js.

   FONTE
     Oblívio RPG — livro de regras (PDF de 146 páginas) e a Ficha de
     Persona (2 páginas). As páginas citadas são as IMPRESSAS no livro;
     a do PDF é a impressa − 2 até a p. 27 e − 4 da p. 30 em diante
     (paginaDoPdf, abaixo).

   DESCRIÇÕES SÃO RESUMOS
     O texto de cada entrada é um resumo mecânico para consulta na tela,
     com a página para quem quiser o original. O que o motor aplica vem
     dos CAMPOS estruturados, nunca do texto.

   O QUE NÃO ESTÁ AQUI
     Nada foi completado por analogia. O que o livro cita sem dar os
     dados (a Habilidade "Histórias de Acampamento", "Equipamento
     Corrompido", a "Lâmina Grande" das recompensas…) está em LACUNAS,
     no fim, e em docs/OBLIVIO.md — com a leitura adotada, quando há uma.
   ===================================================================== */

(function (global) {
  "use strict";

  function paginaDoPdf(impressa) { return impressa <= 27 ? impressa - 2 : impressa - 4; }

  /* ---------------------------------------------------------------
     ATRIBUTOS (pp. 18–21, 32–37)
     --------------------------------------------------------------- */

  var ATRIBUTOS = [
    { chave: "carne", nome: "Carne", sigla: "CAR", resumo: "Saúde, vigor e integridade física.", pag: 33 },
    { chave: "forca", nome: "Força", sigla: "FOR", resumo: "Potência muscular e capacidade de danificar.", pag: 33 },
    { chave: "fuga", nome: "Fuga", sigla: "FUG", resumo: "Agilidade e velocidade de reação.", pag: 33 },
    { chave: "determinacao", nome: "Determinação", sigla: "DET", resumo: "Manejo das emoções e força de vontade.", pag: 33 },
    { chave: "mente", nome: "Mente", sigla: "MEN", resumo: "Aptidão e resiliência intelectual.", pag: 33 },
  ];

  /* Os pontos da criação e os limites de um Atributo Fixo (p. 32). */
  var CRIACAO = { pontos: 10, minimo: 0, maximo: 10, pag: 32 };

  /* Atributos Mutáveis: (A + B) / 2, arredondado para baixo (p. 34).
     O Dano soma Força com Carne OU Fuga, à escolha (p. 34; a ficha
     imprime CAR + FOR). Máximo usual 10 — Proteção e Coragem podem
     passar dele (p. 21). */
  var MUTAVEIS = [
    { chave: "coragem", nome: "Coragem", de: ["determinacao", "mente"], podePassarDe10: true,
      resumo: "Força de vontade. Gasta para alterar rolagens e atributos; ganha com Ações Corajosas e Motivação.", pag: 36 },
    { chave: "dano", nome: "Dano", de: ["forca", "carne|fuga"],
      resumo: "Estresse do ataque desarmado, ou o bônus somado ao dano da arma.", pag: 36 },
    { chave: "folego", nome: "Fôlego", de: ["carne", "determinacao"],
      resumo: "Estresse recuperado em Descanso e por ponto de Coragem.", pag: 35 },
    { chave: "protecao", nome: "Proteção", de: ["carne", "fuga"], podePassarDe10: true,
      resumo: "Sucessos necessários para te acertar em um Teste de Combate.", pag: 35 },
    { chave: "velocidade", nome: "Velocidade", de: ["fuga", "determinacao"],
      resumo: "Casas percorridas no turno e posição na Ordem de Ação.", pag: 35 },
  ];
  var MAXIMO_MUTAVEL = 10;

  /* ---------------------------------------------------------------
     CONHECIMENTOS (pp. 22–24, 38–40)
     --------------------------------------------------------------- */

  var CONHECIMENTOS = [
    { chave: "bandidagem", nome: "Bandidagem", resumo: "Cometer delitos, roubar, se esgueirar, invadir.", pag: 38 },
    { chave: "duelo", nome: "Duelo", resumo: "Estratégia de combate: formações, brechas, posições vantajosas.", pag: 38 },
    { chave: "emocional", nome: "Emocional", resumo: "Autocontrole: conter a raiva, manter a calma diante do horror.", pag: 38 },
    { chave: "esforco", nome: "Esforço", resumo: "Ações físicas cansativas, resistir a algo nocivo.", pag: 38 },
    { chave: "mistico", nome: "Místico", resumo: "O sobrenatural: fenômenos, runas, seres de outra realidade.", pag: 39 },
    { chave: "mundo", nome: "Mundo", resumo: "Natureza: animais, orientação, plantas.", pag: 39 },
    { chave: "rastro", nome: "Rastro", resumo: "Percepção: achar, ler lábios, farejar.", pag: 39 },
    { chave: "reflexos", nome: "Reflexos", resumo: "Esquivar, acertar algo em movimento, equilíbrio.", pag: 39 },
    { chave: "saber", nome: "Saber", resumo: "Memória e estudo: o que aprendeu, hobbies, conversas.", pag: 39 },
    { chave: "social", nome: "Social", resumo: "Convencer, mentir, acalmar emoções alheias.", pag: 39 },
  ];

  /* Bônus de um Conhecimento Especializado. O livro diz +3 na p. 40 e +2
     na seção de Testes (p. 48), com exemplos de +2 (pp. 48, 49, 52). O
     padrão é +2; a mesa pode escolher +3 (docs/OBLIVIO.md, D1). */
  var BONUS_ESPECIALIZACAO = { padrao: 2, alternativo: 3, pag: 48, divergencia: "D1" };

  /* ---------------------------------------------------------------
     ZONA DE ACERTO (pp. 13, 52; ficha, p. 2)
     --------------------------------------------------------------- */

  /* D20, o padrão do livro. Falha Extrema é sempre 1 e Sucesso Extremo
     sempre 20 (o mínimo do Extremo pode baixar com Coragem). */
  var ZONA_D20 = {
    reduzida: { sucessoRegular: 10 },
    normal: { sucessoRegular: 13 },
    aumentada: { sucessoRegular: 16 },
    falhaExtrema: 1, sucessoExtremo: 20, pag: 52,
  };
  var DIFICULDADES = [
    { chave: "reduzida", nome: "Reduzida" },
    { chave: "normal", nome: "Normal" },
    { chave: "aumentada", nome: "Aumentada" },
  ];

  /* As tabelas de 1D6 e 2D6 impressas só na ficha (p. 2 da ficha). O
     livro não as explica: não há bônus de especialização, Coragem nem
     modificadores definidos para elas. São uma modalidade ALTERNATIVA,
     que a mesa liga de propósito (docs/OBLIVIO.md, D5). Cada faixa:
     [mínimo, máximo] do resultado bruto. */
  var ZONAS_DA_FICHA = {
    d6: {
      dados: "1d6", fonte: "Ficha de Persona, p. 2",
      normal: { falhaExtrema: [1, 1], falhaRegular: [2, 3], sucessoRegular: [4, 5], sucessoExtremo: [6, 6] },
      reduzida: { falhaExtrema: [1, 1], falhaRegular: [2, 2], sucessoRegular: [3, 5], sucessoExtremo: [6, 6] },
      aumentada: { falhaExtrema: [1, 1], falhaRegular: [2, 4], sucessoRegular: [5, 5], sucessoExtremo: [6, 6] },
    },
    "2d6": {
      dados: "2d6", fonte: "Ficha de Persona, p. 2",
      normal: { falhaExtrema: [2, 3], falhaRegular: [4, 6], sucessoRegular: [7, 10], sucessoExtremo: [11, 12] },
      reduzida: { falhaExtrema: [2, 3], falhaRegular: [4, 4], sucessoRegular: [5, 10], sucessoExtremo: [11, 12] },
      aumentada: { falhaExtrema: [2, 3], falhaRegular: [4, 9], sucessoRegular: [10, 10], sucessoExtremo: [11, 12] },
    },
  };

  var RESULTADOS = {
    falhaExtrema: { nome: "Falha Extrema", sucesso: false, grau: 2 },
    falhaRegular: { nome: "Falha Regular", sucesso: false, grau: 1 },
    sucessoRegular: { nome: "Sucesso Regular", sucesso: true, grau: 1 },
    sucessoExtremo: { nome: "Sucesso Extremo", sucesso: true, grau: 2 },
  };

  /* ---------------------------------------------------------------
     CORPO (pp. 41–47, 50–51)
     --------------------------------------------------------------- */

  var REGIOES = [
    { chave: "torso", nome: "Torso", resumo: "Cabeça e tronco. Esgotado, deixa a Persona Fora de Ação.", essencial: true },
    { chave: "bracoE", nome: "Braço esquerdo", fardo: 1 },
    { chave: "bracoD", nome: "Braço direito", fardo: 2 },
    { chave: "pernaE", nome: "Perna esquerda", fardo: 3, perna: true },
    { chave: "pernaD", nome: "Perna direita", fardo: 4, perna: true },
  ];
  /* Jogando com Menos Regiões (pp. 42–44). */
  var MENOS_REGIOES = {
    proteses: { nome: "Usar Próteses", limiteProtese: 5, pag: 43,
      resumo: "A região vira uma Prótese de até 5 de Estresse, recuperada só por Kit de Reparos ou Ajudar os Necessitados (nunca por Coragem). Falhas Extremas acima da metade de Carne destroem a prótese." },
    aprimorar: { nome: "Aprimorar o Corpo", pag: 44,
      resumo: "+1 no limite de Estresse e +1 de Coragem para cada região que faltar." },
    irAlem: { nome: "Ir Além", pag: 44,
      resumo: "Recebe Sobrecarga: arrisca a mesma região mais de uma vez, até 5 rolagens por ataque." },
  };
  var MAXIMO_DADOS_ATAQUE = 5;

  /* ---------------------------------------------------------------
     PAPÉIS (pp. 53–63)
     --------------------------------------------------------------- */

  var PAPEIS = [
    { chave: "age", nome: "Quem Age", estresse: 15, pag: 54, cor: "#c0392b",
      resumo: "Enfrenta as ameaças de frente; a principal arma do grupo.",
      lista: ["esforco", "mundo", "rastro", "bandidagem", "reflexos", "duelo"],
      principal: "voracidade", unicas: ["ataqueEmDupla", "estocada", "sedeDeSangue"] },
    { chave: "cuida", nome: "Quem Cuida", estresse: 10, pag: 56, cor: "#9bbd2b",
      resumo: "Ajuda os necessitados e mantém o grupo de pé.",
      lista: ["esforco", "saber", "mistico", "rastro", "social", "emocional"],
      principal: "ajudarOsNecessitados", unicas: ["abrirFeridas", "balsamo", "ultimaEsperanca"] },
    { chave: "protege", nome: "Quem Protege", estresse: 20, pag: 58, cor: "#d63384",
      resumo: "O escudo do grupo; atrai o perigo para si.",
      lista: ["esforco", "saber", "mundo", "rastro", "reflexos", "duelo"],
      principal: "escudoHumano", unicas: ["armaduraDeEspinhos", "pesoPesado", "repartirADor"] },
    { chave: "resolve", nome: "Quem Resolve", estresse: 15, pag: 60, cor: "#e08a1e",
      resumo: "Encontra uma solução para tudo e auxilia os pontos fracos.",
      lista: ["esforco", "saber", "social", "emocional", "reflexos", "duelo"],
      principal: "darUmaMaozinha", unicas: ["animarOsAnimos", "copiaBarata", "instrucaoDecisiva"] },
    { chave: "sabe", nome: "Quem Sabe", estresse: 10, pag: 62, cor: "#3f7fbf",
      resumo: "Entende um pouco de tudo e sempre tem uma carta na manga.",
      lista: ["saber", "mistico", "mundo", "rastro", "emocional", "duelo"],
      principal: "repertorioDeConhecimento", unicas: ["feedbackDefensivo", "planoDeContingencia", "pontoFraco"] },
  ];
  var ESPECIALIZACOES_DO_PAPEL = 3;

  /* ---------------------------------------------------------------
     HABILIDADES (pp. 55–65)
     acao: passiva | regular | extra | completa | regular+movimento
     limites: as contagens que o motor controla (escopo + quantidade).
     --------------------------------------------------------------- */

  var HABILIDADES = [
    /* Quem Age */
    { chave: "voracidade", nome: "Voracidade", papel: "age", tipo: "principal", acao: "passiva", pag: 55,
      resumo: "Na primeira vez que acertar um ataque e causar Estresse a um alvo, o atributo de Dano é dobrado." },
    { chave: "ataqueEmDupla", nome: "Ataque em Dupla", papel: "age", tipo: "unica", acao: "completa", pag: 55,
      resumo: "Escolhe uma Persona adjacente para atacar em conjunto: cada uma rola o próprio Teste de Combate, e as duas causam dano se tiverem sucesso." },
    { chave: "estocada", nome: "Estocada", papel: "age", tipo: "unica", acao: "regular+movimento", pag: 55,
      resumo: "Avança pelo menos 1 casa e ataca: acerto soma 1 de dano por casa avançada; mesmo errando, o alvo testa Reflexos e fica No Chão se falhar." },
    { chave: "sedeDeSangue", nome: "Sede de Sangue", papel: "age", tipo: "unica", acao: "passiva", pag: 55,
      resumo: "Ao eliminar um alvo, recupera Estresse igual ao dano total do ataque final." },
    /* Quem Cuida */
    { chave: "ajudarOsNecessitados", nome: "Ajudar os Necessitados", papel: "cuida", tipo: "principal", acao: "extra", pag: 57,
      limites: [{ escopo: "rodada", vezes: 1, quando: "inicioDaRodada" }, { escopo: "cenaCalma", vezes: 1 }],
      resumo: "No início de cada rodada (ou uma vez por Cena de Descanso ou Interação), até duas Personas adjacentes recuperam metade de Mente em Estresse. Também repara Próteses." },
    { chave: "abrirFeridas", nome: "Abrir Feridas", papel: "cuida", tipo: "unica", acao: "regular", pag: 57,
      limites: [{ escopo: "rodada", vezes: 1 }],
      resumo: "Metade do Estresse que curou em outras Personas com habilidades do Papel nesta cena vira reserva; uma vez por rodada, um ataque que acerte soma metade da reserva como dano extra, e a reserva zera." },
    { chave: "balsamo", nome: "Bálsamo", papel: "cuida", tipo: "unica", acao: "regular", pag: 57,
      limites: [{ escopo: "partida", vezes: 1, modo: "regiao" }],
      resumo: "Remove uma mazela de si ou de uma Persona adjacente. Uma vez por Partida, recupera uma região perdida; quem cuida recebe Estresse igual ao limite dela." },
    { chave: "ultimaEsperanca", nome: "Última Esperança", papel: "cuida", tipo: "unica", acao: "regular", pag: 57,
      limites: [{ escopo: "cena", vezes: 1 }],
      resumo: "Uma vez por cena: por 3 rodadas, no início dos seus turnos (ou 3 momentos num Descanso/Interação), todo o grupo recupera metade de Mente em Estresse." },
    /* Quem Protege */
    { chave: "escudoHumano", nome: "Escudo Humano", papel: "protege", tipo: "principal", acao: "passiva", pag: 59,
      resumo: "Enquanto estiver à frente de outras Personas, todas recebem metade de Carne em Proteção. No Chão, as Personas atrás perdem o bônus." },
    { chave: "armaduraDeEspinhos", nome: "Armadura de Espinhos", papel: "protege", tipo: "unica", acao: "passiva", pag: 59,
      resumo: "Ao sofrer um ataque com sucesso, o atacante faz um \"teste de Fuga\"; se falhar, recebe metade de Carne (mín. 1) em Estresse." },
    { chave: "pesoPesado", nome: "Peso Pesado", papel: "protege", tipo: "unica", acao: "passiva", pag: 59,
      resumo: "Soma metade de Carne ao dano de ataques corpo a corpo." },
    { chave: "repartirADor", nome: "Repartir a Dor", papel: "protege", tipo: "unica", acao: "passiva", pag: 59,
      resumo: "Quando uma Persona atrás do Escudo Humano sofre dano de ataque ou habilidade, pode dividir o Estresse com ela." },
    /* Quem Resolve */
    { chave: "darUmaMaozinha", nome: "Dar uma Mãozinha", papel: "resolve", tipo: "principal", acao: "extra", pag: 61,
      resumo: "Quando uma Persona (inclusive você) falha num Teste de Conhecimento ou Combate, rola 1D6: 4–6 vira sucesso; 1–3 continua falha e você recebe Estresse igual ao grau da falha." },
    { chave: "animarOsAnimos", nome: "Animar os Ânimos", papel: "resolve", tipo: "unica", acao: "extra", pag: 61,
      limites: [{ escopo: "cena", vezes: 1 }],
      resumo: "Uma vez por cena, quando uma Persona adjacente atinge o limite de Estresse pela primeira vez, ela recupera metade da sua Determinação e não fica Fora de Ação." },
    { chave: "copiaBarata", nome: "Cópia Barata", papel: "resolve", tipo: "unica", acao: "extra", pag: 61,
      resumo: "Copia uma Habilidade Única de alguém do grupo até o fim da cena. Máximo de cópias entre Descansos: metade da Determinação; cada habilidade só pode ser copiada uma vez até o próximo Descanso." },
    { chave: "instrucaoDecisiva", nome: "Instrução Decisiva", papel: "resolve", tipo: "unica", acao: "regular", pag: 61,
      resumo: "Uma Persona realiza uma ação que não seja Completa fora do turno dela." },
    /* Quem Sabe */
    { chave: "repertorioDeConhecimento", nome: "Repertório de Conhecimento", papel: "sabe", tipo: "principal", acao: "extra", pag: 63,
      limites: [{ escopo: "rodada", vezes: 1 }, { escopo: "cenaCalma", vezes: 3 }],
      resumo: "Uma vez por rodada (ou 3 vezes por Descanso/Interação), soma metade de Mente a um Teste de Conhecimento ou Combate seu ou de outra Persona." },
    { chave: "feedbackDefensivo", nome: "Feedback Defensivo", papel: "sabe", tipo: "unica", acao: "regular", pag: 63,
      limites: [{ escopo: "cena", vezes: 1 }, { escopo: "descanso", vezes: "folego" }],
      resumo: "Uma vez por cena, +metade de Mente (mín. 1) na Proteção de uma Persona até o fim da cena, mesmo se zerada. Um por Persona; usos entre Descansos: Fôlego (mín. 1)." },
    { chave: "planoDeContingencia", nome: "Plano de Contingência", papel: "sabe", tipo: "unica", acao: "extra", pag: 63,
      limites: [{ escopo: "cena", vezes: 1 }],
      resumo: "Uma vez por cena, reduz a dificuldade de um Teste de Conhecimento." },
    { chave: "pontoFraco", nome: "Ponto Fraco", papel: "sabe", tipo: "unica", acao: "regular", pag: 63,
      resumo: "Disputa de Saber contra um alvo em Alcance Médio. Vencendo: +metade de Mente de dano contra ele, OU uma mazela por 1D6, OU −1 de Proteção até ele sofrer o próximo dano." },
    /* Gerais */
    { chave: "aprenderComAPratica", nome: "Aprender com a Prática", papel: null, tipo: "geral", acao: "passiva", pag: 64,
      resumo: "Obtém uma habilidade de uma Persona que fez parte do grupo na última missão." },
    { chave: "aumentoDeAtributo", nome: "Aumento de Atributo", papel: null, tipo: "geral", acao: "passiva", pag: 64, repetivel: true,
      resumo: "3 pontos para distribuir entre os Atributos Fixos. Pode ser obtida mais de uma vez." },
    { chave: "caoVelho", nome: "Cão Velho", papel: null, tipo: "geral", acao: "passiva", pag: 64, repetivel: true,
      resumo: "Imunidade a uma Mazela. Pode ser obtida mais de uma vez." },
    { chave: "saberEPoder", nome: "Saber é Poder", papel: null, tipo: "geral", acao: "passiva", pag: 64, repetivel: true,
      resumo: "Um Conhecimento Especializado a mais, à escolha. Pode ser obtida mais de uma vez." },
    { chave: "todosPorUm", nome: "Todos por Um", papel: null, tipo: "geral", acao: "completa", pag: 65,
      resumo: "Se todo o grupo tem a habilidade e usa uma Ação Completa: elegem uma Persona; cada uma arrisca as regiões que quiser; acerto soma o dano de todas; falha põe todo o Estresse das falhas na eleita. Consome o turno de todas." },
  ];

  /* A habilidade especial de "Ir Além" (p. 44). */
  var SOBRECARGA = { chave: "sobrecarga", nome: "Sobrecarga", acao: "passiva", pag: 44,
    resumo: "Arrisca a mesma região várias vezes num Teste de Combate, até 5 rolagens por ataque." };

  /* ---------------------------------------------------------------
     CORAGEM (p. 37)
     --------------------------------------------------------------- */

  var USOS_DE_CORAGEM = [
    { chave: "aumentarMutavel", nome: "Aumentar Atributo Mutável", custo: "1 por uso", pag: 37,
      resumo: "Soma de novo o valor de um Atributo Mutável até o fim do turno ou da próxima ação." },
    { chave: "aumentarExtremo", nome: "Aumentar Extremo", custo: "1 por Sucesso Extremo", pag: 37,
      resumo: "Depois de um Sucesso Extremo, +1 sucesso na rolagem." },
    { chave: "comprarSucesso", nome: "Comprar Sucessos", custo: "1 por Falha Regular, 2 por Falha Extrema", pag: 37,
      resumo: "Depois de uma falha, paga o grau dela para virar sucesso." },
    { chave: "recuperarEstresse", nome: "Recuperar Estresse", custo: "1 por uso", pag: 37,
      resumo: "Recupera Estresse igual ao Fôlego por ponto gasto (nunca de Próteses)." },
    { chave: "reduzirExtremo", nome: "Reduzir Extremo", custo: "1 por valor reduzido", pag: 37,
      resumo: "Baixa o mínimo do Sucesso Extremo no próximo teste." },
  ];

  /* ---------------------------------------------------------------
     AÇÕES (pp. 85–90)
     --------------------------------------------------------------- */

  /* "Padrão" (p. 85) e "Regular" (o resto do livro) são a mesma ação:
     internamente, sempre `regular`. */
  var TIPOS_DE_ACAO = [
    { chave: "regular", nome: "Ação Regular", sinonimos: ["padrao"], pag: 85 },
    { chave: "extra", nome: "Ação Extra", foraDoTurno: true, pag: 85 },
    { chave: "movimento", nome: "Ação de Movimento", pag: 85 },
    { chave: "completa", nome: "Ação Completa", ocupaOTurno: true, pag: 85 },
  ];

  var ACOES = [
    { chave: "acelerar", nome: "Acelerar", acao: "regular", pag: 86,
      resumo: "Velocidade dobrada até o fim do próximo turno. Usos entre Descansos: Fôlego; acima disso, 1D4 cumulativo de Estresse nas pernas." },
    { chave: "ajudar", nome: "Ajudar", acao: "regular", pag: 86, resumo: "+1 no teste de um aliado por Persona que ajuda." },
    { chave: "analisar", nome: "Analisar", acao: "regular", pag: 86,
      resumo: "Disputa de Duelo contra alvo em Alcance Médio; vencendo, ataques contra ele somam metade de Mente num dos Testes de Combate até o fim da cena. Um alvo analisado não pode ser analisado de novo." },
    { chave: "atacar", nome: "Atacar", acao: "regular", pag: 86, resumo: "Arrisca regiões: 1D20 por região, Zona de Acerto." },
    { chave: "descansar", nome: "Descansar", acao: "completa", pag: 86, resumo: "Cena de Descanso com uma Fogueira, em lugar minimamente seguro." },
    { chave: "distrair", nome: "Distrair", acao: "regular", pag: 86, resumo: "Teste de Social: testes do alvo para notar o evento escolhido ficam com a dificuldade aumentada enquanto durar." },
    { chave: "escapar", nome: "Escapar", acao: "regular|completa", pag: 87,
      resumo: "Testes para fugir; como Ação Completa os sucessos dobram. Escapa com sucessos ≥ Grau da Ameaça (várias: maior grau + número de Ameaças)." },
    { chave: "fabricar", nome: "Fabricar", acao: "completa", pag: 87, resumo: "Teste de Saber para criar um Equipamento ou Modificação com Recursos." },
    { chave: "mirar", nome: "Mirar", acao: "completa", pag: 89,
      resumo: "Ataca uma região do alvo: Proteção do alvo + o Estresse que a região ainda aguenta; acertando, todo o dano vai para ela." },
    { chave: "preparar", nome: "Preparar", acao: "regular+extra", pag: 89,
      resumo: "Ação Regular para definir o gatilho; Ação Extra quando ele acontece. Perdida se fizer outra Ação Regular antes." },
    { chave: "seguirEmFrente", nome: "Seguir em Frente", acao: "regular", corajosa: true, pag: 90,
      resumo: "Teste de Emocional para abrir mão da Motivação; +1 de Coragem." },
    { chave: "resgatar", nome: "Resgatar", acao: "regular", corajosa: true, pag: 90,
      resumo: "Teste de Emocional para acalmar uma Persona em Pavor: ela recebe 1 de Coragem e sai da mazela." },
    { chave: "sacrificar", nome: "Sacrificar", acao: "extra", corajosa: true, pag: 90,
      resumo: "Uma vez por rodada, recebe no corpo o Estresse que uma Persona adjacente sofreria; +1 de Coragem." },
  ];

  /* ---------------------------------------------------------------
     MOTIVAÇÕES (pp. 82–84) — 1D6
     --------------------------------------------------------------- */

  var MOTIVACOES = [
    { chave: "alcancarOIdeal", nome: "Alcançar o Ideal", d6: 1, resumo: "Obter aquilo que sempre sonhou." },
    { chave: "darOTroco", nome: "Dar o Troco", d6: 2, resumo: "Devolver ao mundo o bem ou o mal que alguém lhe fez." },
    { chave: "encontrarAquilo", nome: "Encontrar Aquilo", d6: 3, resumo: "Ter em mãos algo fora do seu alcance." },
    { chave: "salvarAquilo", nome: "Salvar Aquilo", d6: 4, resumo: "Proteger algo que vale arriscar a vida." },
    { chave: "seguirAsRegras", nome: "Seguir as Regras", d6: 5, resumo: "Obedecer à crença que é sua âncora." },
    { chave: "seRedimir", nome: "Se Redimir", d6: 6, resumo: "Reparar um grande arrependimento." },
  ];

  /* ---------------------------------------------------------------
     EQUIPAMENTOS (pp. 66–76)
     tipo: consumivel | duravel. peso (duráveis): leve | media | pesada.
     classe: bomba | luz | utilidade | recurso | protese | arma | escudo | vestimenta
     --------------------------------------------------------------- */

  var EQUIPAMENTOS = [
    /* Consumíveis — bombas (pp. 67–68) */
    { chave: "bombaAtordoante", nome: "Bomba Atordoante", tipo: "consumivel", classe: "bomba", espacos: 1, usos: 1, acao: "regular|extra",
      dano: "1d2", alcance: "medio", pag: 67, efeito: { disputa: "reflexos", mazela: "semReacao", extremoAdjacentes: { teste: "rastro", mazela: "semReacao" } },
      resumo: "Clarão Ofuscante: disputa de Reflexos; o perdedor sofre 1D2 e fica Sem Reação. Perdendo com Falha Extrema, os adjacentes testam Rastro ou recebem a mazela." },
    { chave: "bombaDeEstalo", nome: "Bomba de Estalo", tipo: "consumivel", classe: "bomba", espacos: 1, usos: 1, acao: "regular|extra",
      dano: "1d6", alcance: "medio", pag: 68, efeito: { disputa: "reflexos", mazela: "noChao", extremoAdjacentes: { teste: "esforco", metadeDoDano: true } },
      resumo: "Zona de Impacto: disputa de Reflexos; o perdedor sofre 1D6 e fica No Chão. Com Falha Extrema, os adjacentes testam Esforço ou sofrem metade." },
    { chave: "bombaDeFumaca", nome: "Bomba de Fumaça", tipo: "consumivel", classe: "bomba", espacos: 1, usos: 1, acao: "regular|extra",
      alcance: "medio", pag: 68, efeito: { area: { duracao: "1d4", escopo: "rodada", reduz: ["bandidagem"], aumenta: ["combate", "rastro"] } },
      resumo: "Ocultar Rastros: por 1D4 rodadas, esconder-se na área fica mais fácil; Testes de Combate e de Rastro para achar alvos ficam mais difíceis." },
    { chave: "bombaIncendiaria", nome: "Bomba Incendiária", tipo: "consumivel", classe: "bomba", espacos: 1, usos: 1, acao: "regular|extra",
      dano: "1d4", alcance: "medio", pag: 68, efeito: { disputa: "reflexos", mazela: "pegandoFogo", extremoAdjacentes: { teste: "esforco", metadeDoDano: true, mazela: "pegandoFogo" } },
      resumo: "Rastro de Chamas: disputa de Reflexos; o perdedor sofre 1D4 e fica Pegando Fogo. Com Falha Extrema, os adjacentes testam Esforço ou sofrem metade e pegam fogo." },
    /* Luz (p. 69) */
    { chave: "fogueira", nome: "Fogueira", tipo: "consumivel", classe: "luz", espacos: 3, usos: 1, acao: "regular", pag: 69,
      resumo: "Transiciona para uma Cena de Descanso; consumida ao usar." },
    { chave: "combustivel", nome: "Combustível", tipo: "consumivel", classe: "luz", espacos: 1, usos: 1, acao: "regular", pag: 69,
      efeito: { abastece: { cenas: 1, rodadas: 6 } }, resumo: "Alimenta uma Fonte de Luz por mais 1 cena ou 6 rodadas." },
    { chave: "fonteDeLuz", nome: "Fonte de Luz", tipo: "consumivel", classe: "luz", espacos: 1, usos: null, pag: 69,
      efeito: { ilumina: { cenas: 1, rodadas: 6 } }, resumo: "Ilumina por 1 cena ou 6 rodadas; precisa de Combustível para continuar." },
    /* Utilidades (pp. 69–70) */
    { chave: "kitPrimeirosSocorros", nome: "Kit de Primeiros Socorros", tipo: "consumivel", classe: "utilidade", espacos: 2, usos: 5, acao: "regular", pag: 69,
      efeito: { remove: ["botandoParaFora", "ferida"], curaTemporaria: 5 },
      resumo: "Remove Botando para Fora ou Ferida, ou recupera 5 de Estresse temporariamente até o início da próxima cena." },
    { chave: "kitDeReparos", nome: "Kit de Reparos", tipo: "consumivel", classe: "utilidade", espacos: 2, usos: 5, acao: "regular", pag: 70,
      efeito: { repara: 5 },
      resumo: "Recupera 5 de Estresse de Próteses ou Duráveis (pode dividir). Gastando todos os usos: cria uma Modificação ou tira 1 Falha Extrema acumulada de uma Prótese." },
    { chave: "estimulante", nome: "Estimulante", tipo: "consumivel", classe: "utilidade", espacos: 1, usos: 1, acao: "regular", pag: 70,
      efeito: { coragem: 1 }, resumo: "Dá 1 ponto de Coragem a uma Persona." },
    { chave: "utensilio", nome: "Utensílio", tipo: "consumivel", classe: "utilidade", espacos: 2, usos: 5, acao: "regular", pag: 70,
      exemplos: "Binóculo, Corda, Mapa…", efeito: { reduzDificuldade: true }, resumo: "Reduz a dificuldade de um Teste de Conhecimento." },
    { chave: "racao", nome: "Ração", tipo: "consumivel", classe: "utilidade", espacos: 2, usos: 1, acao: "regular", pag: 70,
      efeito: { cura: 5, alimenta: true }, resumo: "Recupera 5 de Estresse (pode dividir entre regiões) e conta como refeição para a Fome." },
    { chave: "recurso", nome: "Recurso", tipo: "consumivel", classe: "recurso", espacos: 1, usos: null, pag: 71,
      resumo: "Matéria-prima consumida para Fabricar." },
    { chave: "municao", nome: "Munição", tipo: "consumivel", classe: "utilidade", espacos: 1, usos: 5, acao: "regular", pag: 71,
      efeito: { recarrega: true }, resumo: "Recarrega uma Arma de Disparo." },
    /* Duráveis — prótese (p. 71) */
    { chave: "protese", nome: "Prótese", tipo: "duravel", classe: "protese", peso: "pesada", espacos: 3, limiteEstresse: 5, pag: 71,
      resumo: "Substitui uma região (nunca o Torso) e pode ser arriscada normalmente." },
    /* Armas leves (pp. 71–73): arriscar a região que empunha */
    { chave: "arremessavel", nome: "Arremessável", tipo: "duravel", classe: "arma", peso: "leve", espacos: 1, limiteEstresse: 3,
      dano: "1d4", alcance: "adjacente|medio", pag: 72, exemplos: "Bombinha, Azagaia, Machadinha…", especial: "arremesso",
      resumo: "Arremesso: ataca em Adjacente ou, arremessada, em Médio; para recuperar, ficar ao menos em Alcance Curto e gastar uma Ação Extra." },
    { chave: "disparoMedio", nome: "Disparo Médio", tipo: "duravel", classe: "arma", peso: "leve", espacos: 1, limiteEstresse: 4,
      dano: "1d6", alcance: "medio", pag: 72, exemplos: "Besta de Mão, Estilingue, Pistola…", recargaApos: 3, disparo: true, especial: "tiroCerteiro",
      resumo: "Recarga com Ação Regular após 3 ataques. Tiro Certeiro: acertando após Mirar no mesmo alvo, dobra os dados de dano." },
    { chave: "laminaCurta", nome: "Lâmina Curta", tipo: "duravel", classe: "arma", peso: "leve", espacos: 1, limiteEstresse: 3,
      dano: "1d2", alcance: "adjacente", pag: 72, exemplos: "Adaga, Punhal, Tesoura…", especial: "corteRelampago",
      resumo: "Corte Relâmpago: após um sucesso com a região que a empunha, pode arriscá-la de novo recebendo 1 de Estresse nela; a sequência para na primeira falha." },
    { chave: "laminaDeGuerra", nome: "Lâmina de Guerra", tipo: "duravel", classe: "arma", peso: "leve", espacos: 1, limiteEstresse: 4,
      dano: "2d4", alcance: "curto", pag: 72, exemplos: "Espada Curta, Rapieira, Picareta…", especial: "ataqueArqueado",
      resumo: "Ataque Arqueado: depois de acertar, pode guardar o dano e, no próximo turno, gastar uma Ação Completa para causar o máximo da arma; até lá, Proteção pela metade." },
    { chave: "taco", nome: "Taco", tipo: "duravel", classe: "arma", peso: "leve", espacos: 1, limiteEstresse: 4,
      dano: "1d4", alcance: "adjacente", pag: 73, exemplos: "Porrete, Maça, Martelo…", especial: "apagarAsLuzes",
      resumo: "Apagar as Luzes: acertando com pelo menos um Sucesso Extremo, o alvo testa Reflexos ou fica Sem Reação." },
    /* Armas médias (p. 73): Força 5 e 2 regiões arriscadas */
    { chave: "corda", nome: "Corda", tipo: "duravel", classe: "arma", peso: "media", espacos: 2, limiteEstresse: 6,
      dano: "1d6", alcance: "medio", pag: 73, exemplos: "Chicote, Martelo Meteoro, Mangual…", especial: "fisgar",
      resumo: "Fisgar: após acertar, disputa de Esforço; vencendo puxa o alvo 1 casa (No Chão se já adjacente; Sem Fôlego com Sucesso Extremo). Perdendo com Falha Extrema, a arma é arrancada." },
    { chave: "disparoLongo", nome: "Disparo Longo", tipo: "duravel", classe: "arma", peso: "media", espacos: 2, limiteEstresse: 7,
      dano: "1d8", alcance: "longo", pag: 73, exemplos: "Escopeta, SMG, Uzi…", recargaApos: 2, disparo: true, especial: "tiroCerteiro",
      resumo: "Recarga com Ação Regular após 2 ataques. Tiro Certeiro após Mirar." },
    { chave: "laminaLonga", nome: "Lâmina Longa", tipo: "duravel", classe: "arma", peso: "media", espacos: 2, limiteEstresse: 7,
      dano: "2d6", alcance: "medio", pag: 74, exemplos: "Espada Longa, Machado de Batalha…", especial: "destruirBarreiras",
      resumo: "Destruir Barreiras: acertando com pelo menos 2 Sucessos Extremos contra o mesmo alvo, −1 de Proteção cumulativo até o fim do combate." },
    /* Armas pesadas (p. 74): Força e Carne 5, 3 regiões arriscadas */
    { chave: "disparoAbsoluto", nome: "Disparo Absoluto", tipo: "duravel", classe: "arma", peso: "pesada", espacos: 3, limiteEstresse: 10,
      dano: "1d10", alcance: "absoluto", pag: 74, exemplos: "Rifle, Arco Longo, Canhão…", recargaApos: 1, disparo: true, especial: "tiroCerteiro",
      resumo: "Recarga com Ação Regular após cada ataque. Tiro Certeiro após Mirar." },
    { chave: "hasteGrande", nome: "Haste Grande", tipo: "duravel", classe: "arma", peso: "pesada", espacos: 3, limiteEstresse: 12,
      dano: "1d10", alcance: "longo", pag: 74, exemplos: "Lança de Montaria, Alabarda, Machado…", especial: "tudoQueVaiVolta",
      resumo: "Tudo que Vai, Volta: após acertar, uma Ação Extra rola 1D6; 4–6 causa +1D4 de Estresse." },
    /* Proteções (pp. 75–76) */
    { chave: "escudoLeve", nome: "Escudo Leve", tipo: "duravel", classe: "escudo", peso: "leve", espacos: 1, limiteEstresse: 5, bonusProtecao: 1, pag: 75,
      especial: "escudo", resumo: "Manter a Guarda e Prontidão (ver Escudos)." },
    { chave: "vestimentaLeve", nome: "Vestimenta Leve", tipo: "duravel", classe: "vestimenta", peso: "leve", espacos: 1, limiteEstresse: 6, bonusProtecao: 2, pag: 75,
      resumo: "+2 de Proteção. Só uma Vestimenta por vez." },
    { chave: "escudoMedio", nome: "Escudo Médio", tipo: "duravel", classe: "escudo", peso: "media", espacos: 2, limiteEstresse: 9, bonusProtecao: 2, pag: 75,
      especial: "escudo", resumo: "Manter a Guarda e Prontidão." },
    { chave: "vestimentaMedia", nome: "Vestimenta Média", tipo: "duravel", classe: "vestimenta", peso: "media", espacos: 2, limiteEstresse: 10, bonusProtecao: 3, pag: 76,
      especial: "protecaoElevada", resumo: "Proteção Elevada: ataques à distância causam menos metade de Carne ou Fuga (à escolha)." },
    { chave: "escudoPesado", nome: "Escudo Pesado", tipo: "duravel", classe: "escudo", peso: "pesada", espacos: 3, limiteEstresse: 14, bonusProtecao: 3, pag: 76,
      especial: "escudo", resumo: "Manter a Guarda e Prontidão." },
    { chave: "vestimentaPesada", nome: "Vestimenta Pesada", tipo: "duravel", classe: "vestimenta", peso: "pesada", espacos: 3, limiteEstresse: 15, bonusProtecao: 4, pag: 76,
      especial: "protecaoMaximizada", resumo: "Proteção Maximizada: todos os ataques causam menos metade de Carne ou Fuga (à escolha)." },
  ];

  /* Requisitos por peso (pp. 71, 73, 74, 75, 76). As armas pedem um
     número mínimo de regiões ARRISCADAS no ataque para causar o dano
     delas; abaixo disso, só o atributo de Dano. */
  var REQUISITOS_POR_PESO = {
    arma: {
      leve: { atributos: {}, regioesMinimas: 1, pag: 71 },
      media: { atributos: { forca: 5 }, regioesMinimas: 2, pag: 73 },
      pesada: { atributos: { forca: 5, carne: 5 }, regioesMinimas: 3, pag: 74 },
    },
    protecao: {
      leve: { atributos: {}, pag: 75 },
      media: { atributos: { carne: 5 }, pag: 75 },
      pesada: { atributos: { carne: 5, forca: 5 }, pag: 76 },
    },
  };

  var ESCUDO = {
    manterAGuarda: "Quando a região que carrega o escudo atinge o limite, o escudo é derrubado e para de somar Proteção.",
    prontidao: "Ação Regular: dobra o bônus do escudo até o início do próximo turno; ataques que acertam nesse estado causam Estresse direto no escudo.",
    pag: 75,
  };

  /* Inventário (p. 66): 5 + Carne ou Força (ou 1, o que for maior). Um
     equipamento por região carregado; carregados não ocupam espaço. */
  var INVENTARIO = { base: 5, pag: 66 };

  /* ---------------------------------------------------------------
     MODIFICAÇÕES (pp. 77–79)
     alvo: o que aceita (o motor confere com aceitaModificacao).
     --------------------------------------------------------------- */

  var LIMITE_MODIFICACOES = { consumivel: 1, leve: 2, media: 3, pesada: 4, pag: 77 };

  var MODIFICACOES = [
    { chave: "bandoleira", nome: "Bandoleira", grupo: "geral", pag: 77, alvo: { exceto: ["vestimenta"] },
      resumo: "Conta sempre como carregado, mesmo sem região livre." },
    { chave: "contrapeso", nome: "Contrapeso", grupo: "geral", pag: 78, alvo: { classes: ["arma", "escudo"], pesos: ["media", "pesada"] },
      resumo: "−1 região mínima para empunhar (nunca 0)." },
    { chave: "efetividade", nome: "Efetividade", grupo: "geral", pag: 78, alvo: { tipos: ["consumivel"] },
      resumo: "Dobra a função principal (Kit de Reparos 10, Fumaça 2D4 rodadas, Combustível 2 cenas ou 12 rodadas)." },
    { chave: "radiante", nome: "Radiante", grupo: "geral", pag: 78, alvo: { classes: ["arma", "escudo", "vestimenta"] },
      resumo: "Serve como Fonte de Luz e pode ser abastecido com Combustível." },
    { chave: "vidaLonga", nome: "Vida Longa", grupo: "geral", pag: 78, alvo: { tipos: ["consumivel"], excetoClasses: ["bomba"] },
      resumo: "+1 uso." },
    { chave: "empunhadura", nome: "Empunhadura", grupo: "armas", pag: 78, alvo: { classes: ["arma"] },
      resumo: "Rola de novo um dos dados de cada Teste de Combate e fica com o melhor." },
    { chave: "extensao", nome: "Extensão", grupo: "armas", pag: 78, alvo: { classes: ["arma"], alcanceAte: "longo" },
      resumo: "+1 nível de alcance." },
    { chave: "incendiaria", nome: "Incendiária", grupo: "armas", pag: 78, alvo: { classes: ["arma"] },
      resumo: "Ação Extra para ativar na cena: ao acertar, o alvo testa Esforço ou sofre 1D4 e fica Pegando Fogo. 3 vezes entre Descansos; com Radiante, sempre que abastecida." },
    { chave: "mortal", nome: "Mortal", grupo: "armas", pag: 79, alvo: { classes: ["arma"], alcanceAte: "longo" },
      resumo: "+1 dado de dano." },
    { chave: "suporteDeCarregador", nome: "Suporte de Carregador", grupo: "armas", pag: 79, alvo: { classes: ["arma"], disparo: true },
      resumo: "Recarregar passa a custar uma Ação Extra ou de Movimento." },
    { chave: "amarra", nome: "Amarra", grupo: "protecoes", pag: 79, alvo: { classes: ["escudo"] },
      resumo: "O escudo fica preso numa região que segue livre para outro equipamento; o bônus continua mesmo com a região esgotada." },
    { chave: "belica", nome: "Bélica", grupo: "protecoes", pag: 79, alvo: { classes: ["escudo"] },
      resumo: "O escudo vira Arma (aceita modificações de arma) e ataca em Adjacente causando 1D6." },
    { chave: "espacosa", nome: "Espaçosa", grupo: "protecoes", pag: 79, alvo: { classes: ["vestimenta"] }, repetivel: true,
      resumo: "+5 Espaços de Inventário enquanto vestida. Pode repetir." },
    { chave: "reforco", nome: "Reforço", grupo: "protecoes", pag: 79, alvo: { classes: ["escudo", "vestimenta"] }, repetivel: true,
      resumo: "+1 no bônus de Proteção. Pode repetir." },
    { chave: "versatil", nome: "Versátil", grupo: "protecoes", pag: 79, alvo: { classes: ["vestimenta"] }, escolhe: "conhecimento",
      resumo: "Testes de um Conhecimento escolhido com a dificuldade reduzida, enquanto vestida." },
  ];

  /* Fabricar (p. 88). */
  var FABRICACAO = {
    teste: "saber", acao: "completa", pag: 88,
    consumivel: { custo: "usos", metadeSemKit: ["usos", "habilidades"], proibidos: ["recurso", "kitDeReparos"] },
    duravel: { custo: { leve: 2, media: 3, pesada: 4 }, metadeSemKit: ["limiteEstresse", "dano"] },
    modificacao: { custo: 2 },
  };

  /* ---------------------------------------------------------------
     MAZELAS (pp. 91–94; ficha, p. 2)
     processamento: quando o motor age sozinho.
     --------------------------------------------------------------- */

  var MAZELAS = [
    { chave: "botandoParaFora", nome: "Botando para Fora", pag: 91, processamento: ["fimDoTurno"],
      remocao: ["teste:esforco:regular", "kitPrimeirosSocorros", "balsamo"],
      resumo: "Carne não soma na Proteção; 1 de Estresse ao fim de cada turno. Sai com sucesso em Esforço (Ação Regular), Kit de Primeiros Socorros ou Bálsamo." },
    { chave: "carneFraca", nome: "Carne Fraca", pag: 91, processamento: ["proximoEstresse"],
      remocao: ["proximoEstresse", "balsamo"],
      resumo: "Ao recuperar 10+ de Estresse de uma vez na cena ou rodada: o próximo Estresse sofrido dobra, e a mazela termina." },
    { chave: "confusao", nome: "Confusão", pag: 91, processamento: ["antesDaAcao"],
      remocao: ["teste:esforco|rastro", "balsamo"],
      resumo: "Antes de agir sem ajuda, 1D6: 1–3 a ação sai ao contrário; 4–6 funciona. Sai com sucesso em Esforço ou Rastro." },
    { chave: "coragemCega", nome: "Coragem Cega", pag: 91, parametros: ["reducao"], processamento: ["proximoDanoSofrido"],
      remocao: ["proximoDanoSofrido", "balsamo"],
      resumo: "Ao recuperar 3+ de Coragem de uma vez na cena ou rodada: Proteção reduzida nesse valor até o próximo ataque que causar dano." },
    { chave: "ferida", nome: "Ferida", pag: 92, parametros: ["dano"], processamento: ["fimDaRodada", "sucessoExtremoInimigo"],
      remocao: ["kitPrimeirosSocorros", "balsamo"],
      resumo: "Ao sofrer de uma vez metade ou mais do limite de Estresse (ou por habilidade): repete esse Estresse ao fim de cada rodada. +1 cumulativo quando um inimigo tira Sucesso Extremo contra a Persona." },
    { chave: "fome", nome: "Fome", pag: 92, processamento: ["descanso"],
      remocao: ["racao", "balsamo"],
      resumo: "Sem comer Ração até o Descanso: curas que não sejam Ração recuperam metade, e recebe Carne Fraca." },
    { chave: "juraDeMorte", nome: "Jura de Morte", pag: 92, parametros: ["origem"],
      remocao: ["teste:esforco", "teste:bandidagem", "derrotarOrigem", "balsamo"],
      resumo: "Alvo de todos os ataques inimigos, com a dificuldade reduzida contra ela. Sai ao Escapar (Esforço), Esconder (Bandidagem) ou derrotar quem a causou." },
    { chave: "lentidao", nome: "Lentidão", pag: 92,
      remocao: ["balsamo", "descanso"],
      resumo: "Fuga pela metade (mín. 1); Bandidagem e Reflexos com a dificuldade aumentada. Sai com Bálsamo ou um Descanso." },
    { chave: "noChao", nome: "No Chão", pag: 93,
      remocao: ["acao:extra+movimento", "balsamo"],
      resumo: "Ação Extra e de Movimento para levantar. Seus Testes de Combate rolam duas vezes e ficam com o pior; contra ela, com o melhor." },
    { chave: "noEscuro", nome: "No Escuro", pag: 93, implica: ["pavor"],
      remocao: ["luz"],
      resumo: "Também em Pavor; Testes de Combate rolam de novo e ficam com o pior." },
    { chave: "pavor", nome: "Pavor", pag: 93, processamento: ["fimDaRodada"],
      remocao: ["teste:emocional:aposEscapar", "resgatar", "balsamo"],
      resumo: "Bônus viram penalidades; gasta as ações para Escapar. Fim de cada rodada: −1 Coragem (ou Determinação; sem as duas, teste de Esforço ou Fora de Ação). Após Escapar, teste de Emocional encerra e devolve 1 de Coragem." },
    { chave: "pegandoFogo", nome: "Pegando Fogo", pag: 93, parametros: ["dano"], processamento: ["fimDaRodada"],
      remocao: ["acao:regular+movimento", "danoZerado", "balsamo"],
      resumo: "Fim de cada rodada: metade do dano original, que cai 1 a cada vez. Apagar: Ação Regular e de Movimento. Mais de 5 de Estresse por fogo dá Ferida." },
    { chave: "semFolego", nome: "Sem Fôlego", pag: 94, processamento: ["fimDoTurno"], parametros: ["turnos"],
      remocao: ["teste:esforco:completa", "balsamo"],
      resumo: "Regular vira Completa, Extra vira Regular, Movimento à metade, Completa leva 2 turnos. Fim do turno: Esforço como Ação Completa para sair. Dura até Fôlego (mín. 1) turnos; depois, Fora de Ação." },
    { chave: "semReacao", nome: "Sem Reação", pag: 94, processamento: ["fimDoTurno"], parametros: ["turnos"],
      remocao: ["teste:rastro:aposPrimeiroTurno", "doisTurnos", "balsamo"],
      resumo: "Até 2 turnos. Proteção 1 (só as armaduras somam); falha em todo teste que não seja o Rastro para se recuperar, ao fim do primeiro turno." },
  ];

  /* ---------------------------------------------------------------
     FORA DE AÇÃO E FARDOS (pp. 45–46)
     --------------------------------------------------------------- */

  var FORA_DE_ACAO = [
    { vez: 1, mazelas: ["noChao", "semReacao"], saida: "fimDaProximaRodada", recupera: "metadeDoLimite", fardo: true, pag: 45 },
    { vez: 2, mazelas: ["noChao", "semReacao"], saida: "inicioDaProximaCena", recupera: "folego", fardo: true, pag: 45 },
    { vez: 3, morte: true, pag: 45 },
  ];

  var FARDOS = [
    { chave: "guilhotina", nome: "Guilhotina", d6: 1, acumula: true, pag: 46,
      resumo: "Perde um braço ou perna (1D4: braço esquerdo, braço direito, perna esquerda, perna direita; rola de novo se já não tiver)." },
    { chave: "deterioracao", nome: "Deterioração", d6: 2, acumula: true, pag: 46,
      resumo: "Um Atributo Fixo cai 1D4 (mín. 0) e o máximo dele passa a 9 (1D6: Carne, Força, Fuga, Mente, Determinação; 6 rola de novo)." },
    { chave: "covardia", nome: "Covardia", d6: 3, acumula: false, pag: 46,
      resumo: "Perde o dobro de Coragem ao falhar em testes ou ao perder Coragem por habilidades; Emocional contra sustos com a dificuldade aumentada." },
    { chave: "malDasPernas", nome: "Mal das Pernas", d6: 4, acumula: true, pag: 46,
      resumo: "−1 no limite máximo de Estresse." },
    { chave: "fragilidade", nome: "Fragilidade", d6: 5, acumula: false, pag: 46,
      resumo: "Ataques bem-sucedidos causam um dado de dano a mais na Persona." },
    { chave: "ataqueCardiaco", nome: "Ataque Cardíaco", d6: 6, acumula: true, pag: 46,
      resumo: "Teste de Esforço: falhando, a Persona morre na hora." },
  ];
  /* Ordem da Deterioração (1D6) e da Guilhotina (1D4). */
  var DETERIORACAO_D6 = ["carne", "forca", "fuga", "mente", "determinacao"];
  var GUILHOTINA_D4 = ["bracoE", "bracoD", "pernaE", "pernaD"];

  /* ---------------------------------------------------------------
     RECUPERAÇÃO, DESCANSO, PROGRESSÃO (pp. 47, 95, 119)
     --------------------------------------------------------------- */

  var RECUPERACAO = {
    racao: 5, descanso: { base: 5, mais: "folego" }, coragem: "folego", pag: 47,
    carneFraca: 10, coragemCega: 3,
  };
  var DESCANSO_PERIGOSO = { dado: "1d6", seguroDe: 5, metade: true, vigiliaReduz: 1, pag: 119 };
  var PROGRESSAO = {
    estresse: "metadeCarneMin1", habilidades: "1+mortos", pag: 95,
  };

  /* ---------------------------------------------------------------
     FAROL E LUZ (pp. 80–81)
     --------------------------------------------------------------- */

  var FAROL = {
    duracao: { cenas: 1, rodadas: 6 }, pag: 80,
    apagada: { dado: "1d6", ate3: 1, de4: 2 }, // rodadas até a escuridão (p. 81)
    reacenderAte: "fimDaProximaRodada",
    abastecerAliado: ["movimento", "regular"],
    pegarDoChao: { mesmaZona: ["movimento|regular"], longe: ["movimento", "regular"] },
  };

  /* ---------------------------------------------------------------
     CENAS, ALCANCE (pp. 116–120)
     --------------------------------------------------------------- */

  var CENAS = [
    { chave: "combate", nome: "Combate", rodadas: true, pag: 116 },
    { chave: "descanso", nome: "Descanso", pag: 119 },
    { chave: "interacao", nome: "Interação", pag: 119 },
    { chave: "tensao", nome: "Tensão", rodadas: true, trocaDeOrdem: true, pag: 120 },
  ];

  var ALCANCES = [
    { chave: "adjacente", nome: "Adjacente", casa: 1, exemplo: "um braço estendido" },
    { chave: "curto", nome: "Curto", casa: 2, exemplo: "um sofá" },
    { chave: "medio", nome: "Médio", casa: 3, exemplo: "uma van" },
    { chave: "longo", nome: "Longo", casa: 4, exemplo: "um ônibus" },
    { chave: "absoluto", nome: "Absoluto", casa: 5, exemplo: "um vagão de metrô, ou mais" },
  ];

  /* ---------------------------------------------------------------
     LACUNAS — citado no livro, sem os dados (docs/OBLIVIO.md)
     --------------------------------------------------------------- */

  var LACUNAS = [
    { chave: "paginaXX", texto: "A p. 12 remete à \"página XX\" para variações da Zona de Acerto.", pag: 12 },
    { chave: "partidaSolo", texto: "\"Partida Solo\", no capítulo A Testemunha, não está no PDF.", pag: 8 },
    { chave: "ameacasDeJogo", texto: "O capítulo \"Ameaças de Jogo\" (criar Ameaças, usado pela Quimera) não está no PDF.", pag: 137 },
    { chave: "historiasDeAcampamento", texto: "\"Histórias de Acampamento\", de Quem Resolve, é citada no Descanso mas não existe na lista do Papel.", pag: 119 },
    { chave: "baterEmRetirada", texto: "\"Bater em Retirada\", de Quem Resolve, é citada nas Cenas de Combate mas não existe na lista do Papel.", pag: 117 },
    { chave: "equipamentoCorrompido", texto: "\"Equipamento Corrompido\" (Mortalha, Comensal, Devolva ao Lar) não é definido.", pag: 130 },
    { chave: "laminaGrande", texto: "A recompensa do Errante dá \"Lâmina Grande\", que não está no catálogo.", pag: 144 },
    { chave: "revoada", texto: "\"Revoada\" (invocada pelo Comensal) não tem ficha.", pag: 150 },
    { chave: "devaneio", texto: "\"Devaneio\" (Aura Pavorosa do Comensal) não tem ficha.", pag: 149 },
    { chave: "carnical", texto: "\"Carniçal\" aparece nos exemplos, sem ficha.", pag: 43 },
    { chave: "perseguidor", texto: "O efeito \"Perseguidor\" (Pique-Pega) não é definido.", pag: 109 },
    { chave: "cegueira", texto: "\"Cegueira\" é citada como Fardo que não acumula, mas não está na tabela.", pag: 45 },
    { chave: "infeccao", texto: "Os pontos de Infecção da Carcaça são definidos só no ataque dela.", pag: 129 },
  ];

  function porChave(lista) {
    var m = {};
    lista.forEach(function (x) { m[x.chave] = x; });
    return m;
  }

  global.RAMAOblivioCatalogo = {
    FONTE: "Oblívio RPG — livro de regras e Ficha de Persona",
    paginaDoPdf: paginaDoPdf,
    ATRIBUTOS: ATRIBUTOS, CRIACAO: CRIACAO, MUTAVEIS: MUTAVEIS, MAXIMO_MUTAVEL: MAXIMO_MUTAVEL,
    CONHECIMENTOS: CONHECIMENTOS, BONUS_ESPECIALIZACAO: BONUS_ESPECIALIZACAO,
    ZONA_D20: ZONA_D20, ZONAS_DA_FICHA: ZONAS_DA_FICHA, DIFICULDADES: DIFICULDADES, RESULTADOS: RESULTADOS,
    REGIOES: REGIOES, MENOS_REGIOES: MENOS_REGIOES, MAXIMO_DADOS_ATAQUE: MAXIMO_DADOS_ATAQUE,
    PAPEIS: PAPEIS, ESPECIALIZACOES_DO_PAPEL: ESPECIALIZACOES_DO_PAPEL,
    HABILIDADES: HABILIDADES, SOBRECARGA: SOBRECARGA,
    USOS_DE_CORAGEM: USOS_DE_CORAGEM, TIPOS_DE_ACAO: TIPOS_DE_ACAO, ACOES: ACOES, MOTIVACOES: MOTIVACOES,
    EQUIPAMENTOS: EQUIPAMENTOS, REQUISITOS_POR_PESO: REQUISITOS_POR_PESO, ESCUDO: ESCUDO, INVENTARIO: INVENTARIO,
    LIMITE_MODIFICACOES: LIMITE_MODIFICACOES, MODIFICACOES: MODIFICACOES, FABRICACAO: FABRICACAO,
    MAZELAS: MAZELAS, FORA_DE_ACAO: FORA_DE_ACAO, FARDOS: FARDOS, DETERIORACAO_D6: DETERIORACAO_D6, GUILHOTINA_D4: GUILHOTINA_D4,
    RECUPERACAO: RECUPERACAO, DESCANSO_PERIGOSO: DESCANSO_PERIGOSO, PROGRESSAO: PROGRESSAO,
    FAROL: FAROL, CENAS: CENAS, ALCANCES: ALCANCES, LACUNAS: LACUNAS,
    papel: porChave(PAPEIS), habilidade: porChave(HABILIDADES.concat([SOBRECARGA])), conhecimento: porChave(CONHECIMENTOS),
    equipamento: porChave(EQUIPAMENTOS), modificacao: porChave(MODIFICACOES), mazela: porChave(MAZELAS),
    fardo: porChave(FARDOS), motivacao: porChave(MOTIVACOES), atributo: porChave(ATRIBUTOS), mutavel: porChave(MUTAVEIS),
    regiao: porChave(REGIOES), acao: porChave(ACOES), alcance: porChave(ALCANCES), cena: porChave(CENAS),
  };
})(typeof window !== "undefined" ? window : globalThis);
