/* =====================================================================
   R.A.M.A. — Oblívio no servidor (v3.0)
   ---------------------------------------------------------------------
   O estado da MESA de uma campanha de Oblívio (missão, cenas, Ordem de
   Ação, fileiras, Farol, encontro, Buraco) e as operações que mexem em
   mais de uma ficha.

     ler_oblivio      Testemunha (mestre): o estado inteiro. Jogador: a
                      vista sem o privado (Buraco não revelado, fichas de
                      Ameaça, registro privado).
     salvar_oblivio   só a Testemunha; o estado chega inteiro, com `rev`
                      e `opId` (repetição reconhecida; revisão velha é
                      conflito, nunca sobrescrita).
     oblivio_operar   operações de jogo validadas aqui, com o MESMO motor
                      do navegador (cópia abaixo, conferida pelos testes):
                        momentos     só a Testemunha: fim de turno/rodada,
                                     início de cena, missão — nas fichas
                                     de Oblívio da campanha
                        estresse     só a Testemunha: Estresse numa Persona
                                     (ataque de Ameaça, armadilha)
                        habilidade   quem pode editar a Persona QUE USA:
                                     a habilidade dela, nos alvos da mesma
                                     campanha — só o efeito da habilidade,
                                     nunca edição livre da ficha do aliado
                        acao         idem, para as ações específicas
                        ataqueAmeaca quem pode editar a Persona: desgasta
                                     a Proteção da Ameaça e aplica o dano
     Cada operação leva `opId`; cada ficha e a mesa guardam os ids
     aplicados — a repetição (resposta perdida, clique duplo, outra aba)
     não aplica de novo.

   Este arquivo é opcional como o Cris.gs: sem ele, as ações respondem
   `acao_desconhecida`, e a ficha de Oblívio continua funcionando avulsa.
   A aba CAMPANHA_OBLIVIO nasce com setupRama().
   ===================================================================== */

/* >>> js/oblivio/catalogo.js */
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
/* <<< js/oblivio/catalogo.js */

/* >>> js/oblivio/ameacas-dados.js */
/* =====================================================================
   R.A.M.A. — Oblívio · Ameaças (pp. 126–150)
   =====================================================================
   As 18 Ameaças do livro, com os valores PUBLICADOS: Dano, Proteção,
   Velocidade, limite de Estresse e regiões são os da página, nunca
   recalculados pelas fórmulas da Persona. O grau (1 a 6) só aparece no
   desenho da página — foi conferido visualmente.

   habilidades[].efeito descreve o que o motor de Ameaças
   (js/oblivio/ameacas.js) automatiza; resumo é para ler. Os números
   entre parênteses que o livro dá ("metade do atributo de Carne (4)")
   estão em `valor`, como publicados.

   Divergências e leituras adotadas: docs/OBLIVIO.md (seção Ameaças).
   ===================================================================== */

(function (global) {
  "use strict";

  function a(carne, forca, fuga, determinacao, mente) {
    return { carne: carne, forca: forca, fuga: fuga, determinacao: determinacao, mente: mente };
  }
  function rec(lista) { return lista.map(function (x) { return { de: x[0], ate: x[1], itens: x[2] }; }); }

  var AMEACAS = [
    { chave: "golfo", nome: "Golfo", grau: 1, pag: 126, atributos: a(1, 0, 2, 2, 0),
      dano: 1, protecao: 1, velocidade: 2, especializacoes: ["esforco"],
      limiteEstresse: 12, regioes: 1, tamanho: "Pequeno", casas: 1,
      habilidades: [
        { chave: "aUniaoFazAForca", nome: "A União Faz a Força", acao: "completa",
          efeito: { tipo: "uniao", minimo: 3, vira: "amalgamaGolfada", senao: "destruidosNoFimDaProximaRodada" },
          resumo: "Com 3+ Golfos na cena, um deles gasta Ação Completa e todos viram uma Amálgama Golfada. Se não conseguirem, são destruídos no fim da próxima rodada." },
      ],
      recompensa: rec([[1, 1, []], [2, 4, [{ item: "combustivel", qtd: 1 }]], [5, 6, [{ item: "escudoLeve", qtd: 1 }]]]) },

    { chave: "peste", nome: "Peste", grau: 1, pag: 127, atributos: a(0, 0, 4, 0, 1),
      dano: 2, protecao: 2, velocidade: 2, especializacoes: ["mundo"],
      limiteEstresse: 10, regioes: 7, tamanho: "Pequeno ou Regular", casas: 1,
      habilidades: [
        { chave: "ataquePeconhento", nome: "Ataque Peçonhento", acao: "regular", dano: "2d2+2", alcance: "adjacente",
          efeito: { tipo: "ataque", depois: { teste: "esforco", falha: { mazela: "botandoParaFora" } } },
          resumo: "Ataca em Adjacente: 2D2+2; o alvo testa Esforço ou fica Botando para Fora." },
      ],
      recompensa: rec([[1, 1, []], [2, 4, [{ item: "racao", qtd: 1 }]], [5, 6, [{ item: "laminaDeGuerra", qtd: 1 }]]]) },

    { chave: "trombadinha", nome: "Trombadinha", grau: 1, pag: 128, atributos: a(0, 0, 2, 2, 1),
      dano: 1, protecao: 1, velocidade: 2, especializacoes: ["bandidagem"],
      limiteEstresse: 10, regioes: 5, tamanho: "Pequeno", casas: 1,
      habilidades: [
        { chave: "maoLeve", nome: "Mão Leve", acao: "regular", alcance: "curto",
          efeito: { tipo: "roubo", teste: "bandidagem", alvoItem: "carregado", depois: { acao: "completa", sai: true } },
          resumo: "Teste de Bandidagem contra alguém em Alcance Curto para roubar um Equipamento Carregado; no turno seguinte, Ação Completa para sair da cena com ele." },
      ],
      recompensa: rec([[1, 1, []], [2, 2, [{ item: "combustivel", qtd: 1 }]], [3, 3, [{ item: "racao", qtd: 1 }]],
        [4, 4, [{ item: "bombaAtordoante", qtd: 1 }]], [5, 5, [{ item: "utensilio", qtd: 1 }]], [6, 6, [{ item: "kitPrimeirosSocorros", qtd: 1 }]]]) },

    { chave: "carcaca", nome: "Carcaça", grau: 2, pag: 129, atributos: a(2, 4, 2, 2, 0),
      dano: 3, protecao: 2, velocidade: 2, especializacoes: ["esforco", "rastro"],
      limiteEstresse: 22, regioes: 4, tamanho: "Regular ou Médio", casas: [1, 2],
      habilidades: [
        { chave: "regeneracaoMaldita", nome: "Regeneração Maldita", acao: "passiva",
          efeito: { tipo: "retorno", quando: "fimDaProximaCena", recupera: "metade", impedidoPor: ["combustivel", "bombaIncendiaria", "fogo"] },
          resumo: "Derrotada, volta com metade do Estresse recuperado no fim da próxima cena, a menos que alguém destrua os restos com Combustível, Bomba Incendiária ou similar." },
        { chave: "ataqueDaCarcaca", nome: "Ataque (título repetido no livro)", acao: "regular", dano: "2d4+3", alcance: "curto",
          divergencia: "A2",
          efeito: { tipo: "ataque", depois: { teste: "esforco", falha: { infeccao: 1 } } },
          resumo: "2D4+3; o alvo testa Esforço ou recebe 1 ponto de Infecção (ver Infecção)." },
      ],
      recompensa: rec([[1, 1, []], [2, 4, [{ item: "vestimentaLeve", qtd: 1 }]], [5, 6, [{ item: "municao", qtd: 1 }]]]) },

    { chave: "mortalha", nome: "Mortalha", grau: 2, pag: 130, atributos: a(0, 0, 6, 4, 0),
      dano: 3, protecao: 3, velocidade: 5, especializacoes: ["bandidagem", "social"],
      limiteEstresse: 20, regioes: 1, tamanho: "Regular", casas: 1,
      habilidades: [
        { chave: "alemTumulo", nome: "Além Túmulo", acao: "passiva",
          efeito: { tipo: "retorno", quando: "fimDaProximaCena", recupera: "tudo", impedidoPor: ["vinculoCessado"], soDanoDe: "corrompido" },
          resumo: "Só sofre dano de Equipamentos Corrompidos; derrotada, volta inteira no fim da próxima cena se ninguém cessar o vínculo que a prende (um Equipamento, local ou pessoa)." },
        { chave: "assombrarACarne", nome: "Assombrar a Carne", acao: "completa", dano: "1d6+3", alcance: "adjacente",
          efeito: { tipo: "teste", teste: "emocional", falha: { dano: "1d6+3", mazela: "semReacao", possessao: true } },
          resumo: "O alvo testa Emocional: falhando, sofre 1D6+3 e fica Sem Reação; enquanto durar, a Mortalha pode possuí-lo com Ação Extra, e ele perde 1 de Coragem ao fim de cada turno assim." },
      ],
      recompensa: rec([[1, 1, []], [2, 4, [{ item: "recurso", qtd: 1 }]], [5, 6, [{ item: "estimulante", qtd: 1 }]]]) },

    { chave: "mutageno", nome: "Mutágeno", grau: 2, pag: 131, atributos: a(4, 0, 0, 4, 2),
      dano: 2, protecao: 2, velocidade: 2, especializacoes: ["duelo", "esforco", "mundo"],
      limiteEstresse: 24, regioes: 7, tamanho: "Pequeno ou Regular", casas: 1,
      habilidades: [
        { chave: "mutacao", nome: "Mutação", acao: "passiva",
          efeito: { tipo: "mutacao", dado: "1d6", ganhaCom: 4,
            beneficios: [
              { custo: 1, chave: "atributo", texto: "+1 em um Atributo Fixo" },
              { custo: 3, chave: "regiao", texto: "+1 região" },
              { custo: 5, chave: "acao", texto: "+1 Ação Regular por turno" },
              { custo: 8, chave: "regeneracao", texto: "Regeneração igual ao Fôlego (4) no fim de cada rodada", valor: 4 },
              { custo: 12, chave: "imunidade", texto: "Imunidade a uma habilidade de uma Persona" },
              { custo: 15, chave: "evolui", texto: "Evolui para Patógeno no fim da rodada", vira: "patogeno" },
            ] },
          resumo: "Alvo de algo que vise derrotá-lo, rola 1D6: 4–6 dá 1 ponto de Mutação, gasto nos benefícios da tabela." },
        { chave: "ataqueDoMutageno", nome: "Ataque (título repetido no livro)", acao: "regular", dano: "1d10+3", alcance: "longo",
          divergencia: "A2",
          efeito: { tipo: "ataque", aplica: { mazela: "botandoParaFora" }, inicioDoTurno: { acao: "extra", mazelas: ["carneFraca", "lentidao", "semFolego"] } },
          resumo: "1D10+3 em Alcance Longo e Botando para Fora. No início dos turnos, Ação Extra para aplicar Carne Fraca, Lentidão ou Sem Fôlego ao alvo." },
      ],
      recompensa: rec([[1, 1, []], [2, 4, [{ item: "bombaAtordoante", qtd: 1 }]], [5, 6, [{ item: "kitPrimeirosSocorros", qtd: 1 }]]]) },

    { chave: "amalgamaGolfada", nome: "Amálgama Golfada", grau: 3, pag: 132, atributos: a(8, 4, 2, 1, 0),
      dano: 6, protecao: 5, velocidade: 1, especializacoes: ["bandidagem", "esforco", "rastro"],
      limiteEstresse: 38, regioes: 3, tamanho: "Médio ou Grande", casas: [2, 3],
      formacao: { de: "golfo", minimo: 3, porAdicional: { limiteEstresse: 5, atributo: 1, regioes: 1, atributosPreferidos: ["carne", "forca"] } },
      habilidades: [
        { chave: "toqueCorrosivo", nome: "Toque Corrosivo", acao: "passiva", valor: 4,
          efeito: { tipo: "reflexo", gatilho: "acertoCorpoACorpo", dano: 4 },
          resumo: "Quem a toca ou acerta corpo a corpo sofre metade da Carne dela (4)." },
        { chave: "disparoCatarrento", nome: "Disparo Catarrento", acao: "regular", alcance: "medio", alvos: 3,
          efeito: { tipo: "teste", teste: "reflexos", falha: { mazela: "lentidao", preso: { ate: "esforco" } }, falhaExtrema: { regioesPresas: "1d2" } },
          resumo: "Até 3 alvos em Alcance Médio testam Reflexos: falhando, Lentidão e presos até passar em Esforço; com Falha Extrema, 1D2 regiões presas." },
        { chave: "engolfar", nome: "Engolfar", acao: "completa", dano: "2d6+6", alcance: "curto", valor: 4,
          efeito: { tipo: "disputa", teste: "esforco", aumentadaSe: "presoCatarrento", perde: { dano: "2d6+6", mazela: "semFolego", puxado: true, englobado: { porRodada: 4, sai: "esforco:aumentada" } } },
          resumo: "Disputa de Esforço (aumentada se preso pelo disparo): perdendo, 2D6+6, Sem Fôlego e englobado; 4 por rodada até vencer Esforço com a dificuldade aumentada." },
      ],
      recompensa: rec([[1, 1, []], [2, 4, [{ item: "combustivel", qtd: 1 }]], [5, 6, [{ item: "vestimentaLeve", qtd: 1 }]]]) },

    { chave: "cilada", nome: "Cilada", grau: 3, pag: 133, atributos: a(1, 2, 6, 2, 4),
      dano: 4, protecao: 3, velocidade: 4, especializacoes: ["bandidagem", "esforco", "rastro", "reflexos", "social"],
      limiteEstresse: 31, regioes: 4, tamanho: "Regular", casas: 1,
      habilidades: [
        { chave: "saltoDeMola", nome: "Salto de Mola", acao: "regular+movimento", dano: "1d8+4", alcance: "curto", valor: 2,
          divergencia: "A3",
          efeito: { tipo: "disputa", teste: "esforco", perde: { dano: "1d8+4", mazela: "semFolego", puxado: true, agarrado: { porRodada: 2, sai: "disputa:esforco" } } },
          resumo: "Disputa de Esforço: perdendo, 1D8+4, Sem Fôlego, puxado e agarrado; 2 por rodada até vencer outra disputa de Esforço." },
        { chave: "surpresa", nome: "Surpresa!", acao: "extra", alcance: "curto", alvos: "todos",
          efeito: { tipo: "teste", teste: "emocional", falha: { coragem: -1, mazela: "pavor" } },
          resumo: "Todos em Alcance Curto testam Emocional: falhando, −1 de Coragem e Pavor." },
        { chave: "deMudanca", nome: "De Mudança", acao: "completa", dano: "2d6+4",
          efeito: { tipo: "disputa", teste: "esforco", dificuldade: "aumentada", requer: "agarradoPeloSalto", perde: { dano: "2d6+4", invadido: { libertar: { teste: "esforco", sucessos: 2 }, foraDeAcaoMata: true } } },
          resumo: "Contra quem está no Salto de Mola: disputa de Esforço aumentada; perdendo, 2D6+4 e corpo invadido (a Cilada usa Carne, Força, Dano e Proteção dele). Libertar: 2 sucessos conjuntos em Esforço. Fora de Ação assim, morre." },
      ],
      recompensa: rec([[1, 1, []], [2, 4, [{ item: "recurso", qtd: 3 }]], [5, 6, [{ item: "utensilio", qtd: 1 }]]]) },

    { chave: "enxame", nome: "Enxame", grau: 3, pag: 134, atributos: a(6, 2, 4, 2, 1),
      dano: 4, protecao: 5, velocidade: 3, especializacoes: ["esforco", "mundo", "rastro"],
      limiteEstresse: 36, regioes: 12, tamanho: "Médio", casas: 2,
      perdeRegioes: { acimaDe: 3, perde: 1 },
      habilidades: [
        { chave: "dificilDeAcertar", nome: "Difícil de Acertar", acao: "passiva",
          efeito: { tipo: "defesa", combateContra: "aumentada" },
          resumo: "Testes de Combate contra o Enxame têm a dificuldade aumentada." },
        { chave: "devorarOsRestos", nome: "Devorar os Restos", acao: "regular", dano: "1d8+4", alcance: "medio",
          efeito: { tipo: "ataque", foraDeAcaoMultiplo: 2, seMorrer: { recupera: "carneDoAlvo", regioes: 1 } },
          resumo: "1D8+4 em Alcance Médio; atingindo o limite, o alvo fica 2 vezes Fora de Ação. Se ele morrer assim, o Enxame recupera a Carne dele e ganha +1 região." },
        { chave: "atropelar", nome: "Atropelar", acao: "movimento", alcance: "curto", alvos: "todos", valor: 3,
          efeito: { tipo: "teste", teste: "esforco", falha: { dano: 3, mazela: "semFolego" } },
          resumo: "Todos em Alcance Curto testam Esforço: falhando, 3 de Estresse e Sem Fôlego." },
      ],
      recompensa: rec([[1, 1, []], [2, 4, [{ item: "racao", qtd: 1 }]], [5, 6, [{ item: "kitPrimeirosSocorros", qtd: 1 }]]]) },

    { chave: "coletor", nome: "Coletor", grau: 4, pag: 135, atributos: a(10, 6, 0, 4, 0),
      dano: 8, protecao: 5, velocidade: 2, especializacoes: ["duelo", "esforco", "rastro", "social"],
      limiteEstresse: 50, regioes: { base: 5, dado: "1d10" }, tamanho: "Grande", casas: 3,
      habilidades: [
        { chave: "muralhaDeCarne", nome: "Muralha de Carne", acao: "passiva", valor: 7,
          efeito: { tipo: "muralha", reduzDanoPorRegiao: 7, criar: { acao: "movimento", limiteEstresse: 5, protecao: 1, casas: 1 } },
          resumo: "Atacado, pode perder uma região para reduzir o dano em 7 (Fôlego). Ação de Movimento: troca regiões por Muralhas de Carne (5 de Estresse, Proteção 1, 1 casa) à frente." },
        { chave: "apropriacaoForcada", nome: "Apropriação Forçada", acao: "regular", dano: "1d10+8", alcance: "longo",
          efeito: { tipo: "ataque", mirar: true, regiaoEsgotada: { disputa: "esforco", perde: { ferida: "metadeDoDano", arrancaRegiao: true } } },
          resumo: "Ataque Mirado em Alcance Longo: 1D10+8. Esgotando a região, disputa de Esforço: perdendo, Ferida de metade do dano e a região é arrancada e passa ao Coletor." },
        { chave: "beneficiosDaApropriacao", nome: "Benefícios da Apropriação (título repetido no livro)", acao: "passiva", divergencia: "A4",
          efeito: { tipo: "beneficios", gatilho: "apropriacaoComSucesso", maximo: 3, ate: "fimDaCena",
            opcoes: [{ chave: "velocidade", dado: "1d6" }, { chave: "protecao", dado: "1d4" }, { chave: "dano", dado: "1d2" }, { chave: "acao", valor: 1 }, { chave: "regeneracao", valor: 7 }] },
          resumo: "Após Apropriação Forçada com sucesso, um benefício até o fim da cena (máx. 3): +1D6 Velocidade, +1D4 Proteção, +1D2 Dano, +1 Ação Regular ou regeneração de 7 por rodada." },
        { chave: "desabrocharPutrido", nome: "Desabrochar Pútrido", acao: "completa",
          efeito: { tipo: "transformar", consome: { muralhas: 2 }, cria: [{ ameaca: "carcaca", qtd: 2 }] },
          resumo: "Transforma 2 Muralhas em Carcaças aliadas." },
      ],
      recompensa: rec([[1, 1, []], [2, 4, [{ item: "kitDeReparos", qtd: 1 }]], [5, 6, [{ item: "protese", qtd: 1 }]]]) },

    { chave: "patogeno", nome: "Patógeno", grau: 4, pag: 136, atributos: a(8, 2, 0, 4, 6),
      dano: 5, protecao: 4, velocidade: 2, especializacoes: ["duelo", "emocional", "esforco", "mundo", "rastro", "reflexos", "saber"],
      limiteEstresse: 48, regioes: 9, tamanho: "Médio", casas: 2,
      habilidades: [
        { chave: "respostaImunologica", nome: "Resposta Imunológica", acao: "extra",
          efeito: { tipo: "ataquesAdicionais", igualA: "danosDeAtaqueNaUltimaRodada", curaFere: true },
          resumo: "No início do turno, um ataque adicional (Ação Extra) por vez que sofreu dano de ataque na última rodada. Curas de Personas o ferem sem contar como ataque." },
        { chave: "selecaoNatural", nome: "Seleção Natural", acao: "passiva",
          efeito: { tipo: "aprende", aposFalhar: "conhecimento", passa: "reduzida", mantemMutacoes: true },
          resumo: "Depois de falhar num Teste de Conhecimento, passa a fazê-lo com a dificuldade reduzida. Vindo de um Mutágeno já enfrentado, mantém as Mutações." },
        { chave: "sobrevivenciaDoMaisApto", nome: "Sobrevivência do mais Apto", acao: "passiva", usos: { escopo: "partida", vezes: 6 },
          efeito: { tipo: "inicioDaCena", alvos: "todos", teste: "esforco", falha: { mazelaPorD6: [["botandoParaFora", 1, 2], ["carneFraca", 3, 4], ["semFolego", 5, 6]] } },
          resumo: "No início da cena (ou ao entrar), todos testam Esforço: falhando, 1D6 decide Botando para Fora, Carne Fraca ou Sem Fôlego. 6 usos por Partida (Fôlego)." },
        { chave: "baixaImunidade", nome: "Baixa Imunidade", acao: "regular", dano: "1d10+5", alcance: "longo",
          efeito: { tipo: "ataque", dobraSe: "alvoComMazela" },
          resumo: "1D10+5 em Alcance Longo; o dobro se o alvo sofre de alguma Mazela." },
      ],
      recompensa: rec([[1, 1, []], [2, 4, [{ item: "utensilio", qtd: 1 }]], [5, 6, [{ item: "kitPrimeirosSocorros", qtd: 1 }]]]) },

    { chave: "quimera", nome: "Quimera", grau: 4, pag: 137, atributos: a(4, 2, 0, 6, 8),
      dano: 3, protecao: 2, velocidade: 3, especializacoes: ["esforco", "duelo", "mistico", "mundo", "rastro", "reflexos", "saber", "social"],
      limiteEstresse: 44, regioes: 8, tamanho: "Grande", casas: 3,
      montagem: { componentes: 3, habilidadeObrigatoria: "decifraMeOuTeDevoro", umaHabilidadeDeCada: true, lacuna: "ameacasDeJogo" },
      habilidades: [
        { chave: "infeccaoPerniciosa", nome: "Infecção Perniciosa", acao: "regular", dano: "1d10+3", alcance: "longo",
          efeito: { tipo: "ataque", aplica: { mazela: "botandoParaFora" }, inicioDoTurno: { acao: "extra", mazelas: ["carneFraca", "lentidao", "semFolego"] } },
          resumo: "1D10+3 em Alcance Longo e Botando para Fora; no início dos turnos, Ação Extra para Carne Fraca, Lentidão ou Sem Fôlego." },
        { chave: "mauOlhado", nome: "Mau-Olhado", acao: "regular", dano: "2d8+3", alcance: "medio",
          efeito: { tipo: "teste", teste: "esforco", falha: { dano: "2d8+3", mazela: "carneFraca" } },
          resumo: "O alvo testa Esforço: falhando, 2D8+3 e Carne Fraca." },
        { chave: "bonsSonhos", nome: "Bons Sonhos", acao: "completa", alcance: "longo", alvos: "todos", usos: { escopo: "partidaPorAlvo", vezes: 1 },
          efeito: { tipo: "teste", teste: "emocional", falha: { mazela: "semFolego", sonho: { sai: ["rastro", "saber"], acordar: "social" } } },
          resumo: "Todos em Alcance Longo testam Emocional: falhando, Sem Fôlego e presos num sonho; fim de cada rodada, Rastro ou Saber para acordar; outros acordam com Social. Uma vez por Partida em cada alvo." },
        { chave: "decifraMeOuTeDevoro", nome: "Decifra-me ou Te Devoro", acao: "completa", dano: "1d10+3", alcance: "longo", valor: 4,
          efeito: { tipo: "disputa", teste: "escolhaDaAmeaca", bonusAmeaca: 4, repete: "fimDaRodada", perde: { dano: "1d10+3", coragem: -1 }, ameacaPerde: { dano: "1d10+3" } },
          resumo: "Disputa de um Conhecimento à escolha (a Quimera soma 4), repetida no fim de cada rodada: quem perde sofre 1D10+3 (a Persona também perde 1 de Coragem)." },
      ],
      recompensa: rec([[1, 1, []], [2, 4, [{ item: "recurso", qtd: 4 }]], [5, 6, [{ item: "laminaLonga", qtd: 1 }]]]) },

    { chave: "errante", nome: "Errante", grau: 5, pag: 140, atributos: a(10, 10, 0, 4, 1),
      dano: 10, protecao: 5, velocidade: 2, especializacoes: ["duelo", "esforco", "mundo", "rastro", "reflexos"],
      limiteEstresse: 60, regioes: 5, tamanho: "Médio", casas: 2,
      habilidades: [
        { chave: "hematofagia", nome: "Hematofagia", acao: "passiva",
          efeito: { tipo: "aoDerrubar", recupera: "danoDoAtaque" },
          resumo: "Deixando um alvo Fora de Ação, recupera Estresse igual ao dano do ataque." },
        { chave: "protecaoVariavel", nome: "Proteção Variável", acao: "passiva", divergencia: "A5",
          efeito: { tipo: "protecaoPorPersonas", ajuste: "errante.protecaoVariavel" },
          resumo: "+1 de Proteção por Jogador na cena; com 3 ou menos, o bônus é reduzido (o livro não diz quanto — ajuste da mesa)." },
        { chave: "sedeDeSangueErrante", nome: "Sede de Sangue", acao: "passiva",
          efeito: { tipo: "primeiroAcerto", escopo: "cena", dobra: "dano" },
          resumo: "Na primeira vez que acerta um alvo numa cena, dobra o Dano." },
        { chave: "golpeDoCarrasco", nome: "Golpe do Carrasco", acao: "regular", dano: "2d10+10", alcance: "absoluto",
          efeito: { tipo: "ataque", aoErrar: { protecao: "metade", ataqueAdicional: "extra" } },
          resumo: "2D10+10 em Alcance Absoluto. Errando, pode reduzir a própria Proteção pela metade para atacar de novo com Ação Extra." },
        { chave: "marcaDoCacador", nome: "Marca do Caçador", acao: "extra",
          efeito: { tipo: "aposFerida", mazela: "lentidao", escaparAumentado: true },
          resumo: "Depois de causar uma Ferida, Ação Extra: Lentidão e Escapar com a dificuldade aumentada." },
      ],
      recompensa: rec([[1, 1, []], [2, 4, [{ item: "vestimentaMedia", qtd: 1 }]], [5, 6, [{ item: "laminaGrande", qtd: 1, lacuna: true }]]]) },

    { chave: "horda", nome: "Horda", grau: 5, pag: 141, atributos: a(10, 8, 6, 1, 0),
      dano: 9, protecao: 8, velocidade: 3, especializacoes: ["duelo", "esforco", "mundo", "rastro", "reflexos"],
      limiteEstresse: 60, regioes: 16, tamanho: "Grande", casas: 3,
      perdeRegioes: { acimaDe: 10, perde: 2 },
      habilidades: [
        { chave: "forcaImparavel", nome: "Força Imparável", acao: "passiva", valor: 5,
          efeito: { tipo: "reducao", reduz: 5, exceto: { classe: "bomba", multiplica: 2 }, perseguir: "reduzida" },
          resumo: "Todo dano sofrido cai 5 (metade da Carne); bombas causam o dobro. Testes para perseguir, com a dificuldade reduzida." },
        { chave: "rodaPunk", nome: "Roda Punk", acao: "passiva",
          efeito: { tipo: "ataquesAdicionais", porRegioes: 8 },
          resumo: "Um ataque adicional (Ação Extra) a cada 8 regiões." },
        { chave: "destacarForcas", nome: "Destacar Forças", acao: "regular",
          efeito: { tipo: "invocar", trocaRegioes: [{ ameaca: "carcaca", regioes: 2 }, { ameaca: "enxame", regioes: 3 }] },
          resumo: "Troca regiões por Ameaças à frente: Carcaça (2 regiões) ou Enxame (3)." },
        { chave: "maremoto", nome: "Maremoto", acao: "regular", dano: "1d12+9", alcance: "longo",
          efeito: { tipo: "ataque", foraDeAcaoMata: true, seMorrer: { recupera: "metadeDoLimiteDoAlvo", incorporaRegioes: true } },
          resumo: "1D12+9 em Alcance Longo; Fora de Ação assim, o alvo morre, e a Horda recupera metade do limite dele e incorpora as regiões." },
        { chave: "passarPorCima", nome: "Passar por Cima", acao: "movimento", alcance: "longo", alvos: "todos", valor: 10,
          efeito: { tipo: "teste", teste: "reflexos", avanca: 3, falha: { dano: 10, mazelas: ["noChao", "carneFraca"] }, sucesso: { dano: 5 }, equipamentoDobra: true },
          resumo: "Avança 3 casas; todos em Alcance Longo testam Reflexos: 10 de Estresse (5 com sucesso); falhando, No Chão e Carne Fraca. Contra Equipamento, o dobro." },
      ],
      recompensa: rec([[1, 1, []], [2, 4, [{ item: "recurso", qtd: 5 }]], [5, 6, [{ item: "vestimentaMedia", qtd: 2 }]]]) },

    { chave: "reiDosRatos", nome: "Rei dos Ratos", grau: 5, pag: 143, atributos: a(6, 3, 4, 10, 2),
      dano: 4, protecao: 5, velocidade: 7, especializacoes: ["duelo", "emocional", "esforco", "reflexos", "saber", "social"],
      limiteEstresse: 56, regioes: 12, tamanho: "Grande", casas: 3,
      habilidades: [
        { chave: "vidaLongaAoRei", nome: "Vida Longa ao Rei", acao: "passiva", valor: 8,
          efeito: { tipo: "regeneracao", porRodada: 8, primeiraDerrota: { vira: "enxame", rodadas: 3, senao: { volta: "reiDosRatos", estresse: "metade" } } },
          resumo: "Recupera 8 (Fôlego) no fim de cada rodada. Na primeira derrota vira um Enxame; se não for derrotado em 3 rodadas, volta como Rei com metade do Estresse." },
        { chave: "guardas", nome: "Guardas!", acao: "regular",
          efeito: { tipo: "invocar", trocaRegioes: [{ ameaca: "enxame", regioes: 3 }], bonusCombatePorInvocado: 1 },
          resumo: "Um Enxame à frente a cada 3 regiões removidas; +1 nos Testes de Combate por Enxame na cena." },
        { chave: "aNovaRoupaDoRei", nome: "A Nova Roupa do Rei", acao: "completa",
          efeito: { tipo: "devorar", requer: "alvoForaDeAcao", mata: true, incorporaRegioes: true, usaEquipamento: true },
          resumo: "Devora um alvo Fora de Ação (morte), incorpora as regiões e passa a usar um Equipamento dele." },
        { chave: "decretoReal", nome: "Decreto Real", acao: "extra", alcance: "longo", valor: 5,
          efeito: { tipo: "marca", mazela: "juraDeMorte", bonusCombateContra: 5 },
          resumo: "Jura de Morte num alvo em Alcance Longo; Testes de Combate contra ele recebem +5 enquanto durar." },
        { chave: "desfileDaCoroa", nome: "Desfile da Coroa", acao: "movimento", alcance: "variavel",
          efeito: { tipo: "teste", teste: "reflexos", avancaAte: 7, alvos: "noAlcanceAvancado", falha: { danoPorCasa: "1d8", mazela: "noChao" } },
          resumo: "Avança até 7 casas; os alvos no caminho testam Reflexos: 1D8 por casa avançada e No Chão se falharem." },
      ],
      recompensa: rec([[1, 1, []], [2, 4, [{ item: "hasteGrande", qtd: 1, leitura: "\"Uma Haste\" — a única Haste do catálogo é a Grande (A6)" }]], [5, 6, [{ item: "disparoAbsoluto", qtd: 1 }]]]) },

    { chave: "forca", nome: "A Forca", grau: 6, pag: 145, atributos: a(10, 10, 0, 10, 0),
      dano: 10, protecao: 5, protecaoMaisCorpos: true, velocidade: 5, especializacoes: ["duelo", "esforco", "mistico", "rastro", "social"],
      limiteEstresse: 60, regioes: { base: 2, dado: "3d4", corpos: true }, tamanho: "Grande", casas: 3,
      corpo: { limiteEstresse: 10, protecao: 2 },
      habilidades: [
        { chave: "fimDeTodasAsCoisas", nome: "Fim de Todas as Coisas", acao: "passiva",
          efeito: { tipo: "retorno", quando: "personaForaDeAcao" },
          resumo: "Derrotada, volta na próxima vez que um Jogador ficar Fora de Ação." },
        { chave: "horaDaMorte", nome: "Hora da Morte", acao: "passiva",
          efeito: { tipo: "inicioDaCena", alvos: "todos", alcance: "absoluto", teste: "emocional", dificuldade: "aumentada", falha: { coragem: "-1d6", acumulaEm: "noDoCarrasco" } },
          resumo: "Início da cena: todos testam Emocional (aumentada): falhando, perdem 1D6 de Coragem; cada ponto perdido soma no Nó do Carrasco." },
        { chave: "marcadoParaMorrer", nome: "Marcado para Morrer", acao: "regular", alcance: "absoluto",
          efeito: { tipo: "marca", marcas: { aoFalhar: "1d6>=4", maximo: 6, chega: "foraDeAcao" } },
          resumo: "Marca da Forca num alvo: ao falhar em testes, 1D6 (4–6) dá mais uma marca; 6 marcas, Fora de Ação." },
        { chave: "balancarOsCorpos", nome: "Balançar os Corpos", acao: "regular+movimento", dano: "2d12+10", alcance: "absoluto",
          efeito: { tipo: "ataque", ataquesAdicionaisPorCorpo: true },
          resumo: "2D12+10 em Alcance Absoluto; um ataque adicional (Ação Extra) por corpo pendurado. Cada corpo: 10 de Estresse, Proteção 2, +1 de Proteção da Forca." },
        { chave: "sentenca", nome: "Sentença", acao: "extra", alcance: "absoluto", usos: { escopo: "partida", vezes: 1 },
          efeito: { tipo: "teste", teste: "emocional", falha: { mazela: "juraDeMorte", ate: "forcaDerrotada" } },
          resumo: "O alvo testa Emocional: falhando, Jura de Morte até a Forca ser derrotada. Uma vez por Partida." },
        { chave: "noDoCarrasco", nome: "Nó do Carrasco", acao: "completa", dano: "1d20+10", alcance: "absoluto", alvos: "todos", valor: 10,
          efeito: { tipo: "disputa", teste: "esforco", aumentadaSe: "pavor", perde: { dano: "1d20+10+horaDaMorte", mazela: "semFolego", enforcado: { repete: "completa:aumentada", perdeDano: 10, apertar: { acao: "regular", dano: 10 } } }, foraDeAcaoMata: true, ganhaRegiao: 1 },
          resumo: "Todos em Alcance Absoluto disputam Esforço (aumentada em Pavor): perdendo, 1D20+10+bônus da Hora da Morte e Sem Fôlego. Enforcado: Ação Completa para repetir (aumentada), 10 se perder; a Forca aperta com Ação Regular (10 em todos). Fora de Ação assim, morre, e a Forca ganha 1 região." },
      ],
      recompensa: rec([[1, 1, []], [2, 4, [{ item: "corda", qtd: 1 }]], [5, 6, [{ item: "hasteGrande", qtd: 1 }]]]) },

    { chave: "apogeu", nome: "Apogeu", grau: 6, pag: 147, atributos: a(10, 10, 6, 4, 0),
      dano: 10, protecao: 8, velocidade: 5, especializacoes: ["duelo", "esforco", "mistico", "mundo", "reflexos", "social"],
      limiteEstresse: 70, regioes: 8, tamanho: "Enorme", casas: 4,
      habilidades: [
        { chave: "apiceDaEvolucao", nome: "Ápice da Evolução", acao: "passiva", valor: 7,
          efeito: { tipo: "regeneracao", porRodada: 7, desligaCom: "ferida", ate: "fimDaPartida" },
          resumo: "Recupera 7 (Fôlego) no fim de cada rodada; uma Ferida desliga isso até o fim da Partida." },
        { chave: "couracaImpenetravel", nome: "Couraça Impenetrável", acao: "passiva",
          efeito: { tipo: "reducao", metade: true, analisado: { pontoFraco: "regiao", multiplica: 2 } },
          resumo: "Todo dano sofrido cai pela metade; analisado, uma região vira ponto fraco e recebe o dobro." },
        { chave: "estrondoFinal", nome: "Estrondo Final", acao: "passiva", dano: "1d20+10",
          efeito: { tipo: "aoSerDerrotado", rodadas: 3, tensao: { sucessos: 12, falha: { dano: "1d20+10" } } },
          resumo: "Derrotado, explode em 3 rodadas: Cena de Tensão, 12 sucessos em grupo para Escapar; quem falha sofre 1D20+10." },
        { chave: "ataqueDevastador", nome: "Ataque Devastador", acao: "regular", dano: "2d12+10", alcance: "absoluto", alvos: 3,
          efeito: { tipo: "ataqueMultiplo", alvos: 3, comparaCada: true, teste: "reflexos", sucesso: { metade: true }, falha: { mazelas: ["noChao", "semFolego"] } },
          resumo: "Até 3 alvos (metade da Fuga) em Alcance Absoluto, comparando os sucessos com a Proteção de cada um; cada alvo testa Reflexos: 2D12+10 (metade com sucesso); falhando, No Chão e Sem Fôlego." },
        { chave: "zonaDeImpacto", nome: "Zona de Impacto", acao: "extra+movimento", alcance: "longo", alvos: "todos", valor: 5,
          efeito: { tipo: "teste", teste: "reflexos", falha: { dano: 5 }, sucesso: { dano: 2 } },
          resumo: "Todos em Alcance Longo testam Reflexos: 5 de Estresse, ou metade com sucesso." },
        { chave: "avancoDoApogeu", nome: "Avanço (título repetido no livro)", acao: "completa", alcance: "longo", alvos: "todos", valor: 5, divergencia: "A4",
          efeito: { tipo: "teste", teste: "esforco|reflexos", avancaPeloMenos: 2, falha: { dano: 5 }, cria: { obstaculos: "1d4", limiteEstresse: 20, protecao: 4, casas: 2, bonusCombate: 2 } },
          resumo: "Avança pelo menos 2 casas; todos em Alcance Longo testam Esforço ou Reflexos (5 de Estresse); cria 1D4 Obstáculos (20 de Estresse, Proteção 4, 2 casas) que dão +2 no próximo Teste de Combate de quem os usar." },
      ],
      recompensa: rec([[1, 1, []], [2, 4, [{ item: "escudoPesado", qtd: 1 }]], [5, 6, [{ item: "vestimentaPesada", qtd: 1 }]]]) },

    { chave: "comensal", nome: "Comensal", grau: 6, pag: 149, atributos: a(4, 0, 6, 10, 10),
      dano: 3, protecao: 5, velocidade: 8, especializacoes: ["bandidagem", "duelo", "emocional", "esforco", "mistico", "mundo", "rastro", "reflexos", "saber", "social"],
      limiteEstresse: 64, regioes: 13, tamanho: "Grande", casas: 3,
      habilidades: [
        { chave: "auraPavorosa", nome: "Aura Pavorosa", acao: "passiva",
          efeito: { tipo: "fimDaRodada", alvos: "todos", alcance: "absoluto", teste: "emocional", falha: { coragem: -1 }, semCoragemNemDeterminacao: { vira: "devaneio", lacuna: true } },
          resumo: "Fim de cada rodada: todos testam Emocional e perdem 1 de Coragem se falharem; quem não tem mais Coragem nem Determinação vira um Devaneio (sem ficha no livro)." },
        { chave: "amedrontar", nome: "Amedrontar", acao: "regular", alcance: "longo", valor: 5,
          efeito: { tipo: "teste", teste: "emocional", falha: { coragem: -5, comensalRecupera: "coragemPerdida" } },
          resumo: "O alvo testa Emocional: falhando, perde 5 de Coragem; o Comensal recupera o mesmo em Estresse." },
        { chave: "acertoFantasmagorico", nome: "Acerto Fantasmagórico", acao: "extra", alcance: "longo",
          efeito: { tipo: "aposAnalisar", proximoAtaque: { diretoNoCorpo: true, porCorrompido: "1d6" } },
          resumo: "Depois de analisar o alvo com sucesso, o próximo ataque vai direto ao corpo e soma 1D6 por Equipamento Corrompido dele." },
        { chave: "corromperOsFracos", nome: "Corromper os Fracos", acao: "extra",
          efeito: { tipo: "disputa", teste: "social", requer: "pavorDaAura", perde: { controle: "proximaAcao" } },
          resumo: "Contra quem está em Pavor pela Aura: disputa de Social; perdendo, o Comensal decide a próxima ação do alvo." },
        { chave: "horaDaColheita", nome: "Hora da Colheita", acao: "regular+movimento", dano: "1d20+3", alcance: "absoluto",
          efeito: { tipo: "ataque", ataquePorCasaAvancada: 8 },
          resumo: "1D20+3 em Alcance Absoluto; um ataque adicional por casa avançada (até 8)." },
        { chave: "ultimaTrombeta", nome: "Última Trombeta", acao: "completa", usos: { aCada: 6, escopo: "rodada" },
          efeito: { tipo: "invocarPorTabela", dado: "1d12", tabela: [
            { de: 1, ate: 5, ameacas: [{ ameaca: "peste", qtd: 4 }, { ameaca: "revoada", qtd: 2, lacuna: true }] },
            { de: 6, ate: 8, ameacas: [{ ameaca: "carcaca", qtd: 4 }] },
            { de: 9, ate: 10, ameacas: [{ ameaca: "enxame", qtd: 2 }] },
            { de: 11, ate: 11, ameacas: [{ ameaca: "coletor", qtd: 1 }] },
            { de: 12, ate: 12, ameacas: [{ ameaca: "horda", qtd: 1 }] }] },
          resumo: "A cada 6 rodadas, 1D12: 1–5 4 Pestes e 2 Revoadas (sem ficha), 6–8 4 Carcaças, 9–10 2 Enxames, 11 um Coletor, 12 uma Horda." },
      ],
      recompensa: rec([[1, 1, []], [2, 4, [{ item: "recurso", qtd: 6 }]], [5, 6, [{ item: "equipamentoCorrompido", qtd: 1, lacuna: true }]]]) },
  ];

  /* Infecção da Carcaça (p. 129): pontos acumulados e o que cada faixa faz. */
  var INFECCAO = [
    { de: 1, ate: 1, mazela: "botandoParaFora", ate_: "fimDaCena" },
    { de: 2, ate: 3, mazela: "lentidao", ate_: "tratar" },
    { de: 4, ate: 5, mazela: "fome", ate_: "tratar" },
    { de: 6, ate: 6, vira: "carcaca" },
  ];

  var porChave = {};
  AMEACAS.forEach(function (x) { porChave[x.chave] = x; });

  global.RAMAOblivioAmeacas = {
    AMEACAS: AMEACAS,
    INFECCAO: INFECCAO,
    ameaca: porChave,
    porGrau: function (grau) { return AMEACAS.filter(function (x) { return x.grau === grau; }); },
  };
})(typeof window !== "undefined" ? window : globalThis);
/* <<< js/oblivio/ameacas-dados.js */

/* >>> js/oblivio/buraco-dados.js */
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
/* <<< js/oblivio/buraco-dados.js */

/* >>> js/oblivio/regras.js */
/* =====================================================================
   R.A.M.A. — Oblívio · motor de regras da Persona
   =====================================================================
   Funções PURAS sobre o bloco `oblivio` da ficha (schema 24): nada aqui
   lê a tela, sorteia sozinho ou depende do relógio. Quem rola passa um
   `rolador(faces)` (na página, o de js/dados.js; nos testes, uma fila de
   resultados). Quem avança o tempo chama as funções de MOMENTO
   (fimDoTurno, fimDaRodada, inicioDaCena, descanso) — nunca o desenho.

   O QUE É GUARDADO E O QUE É CALCULADO
     Guardado: escolhas (papel, atributos, especializações, distribuição
     do limite pelas regiões), SALDOS (Estresse por região, Coragem,
     usos), estados (mazelas, Fora de Ação, fardos, inventário) e o
     registro das operações já aplicadas.
     Calculado (calcular): Atributos Mutáveis com a composição, limite
     total, Proteção completa, espaços de inventário, pendências.
     Recalcular nunca restaura um saldo: a Coragem gasta continua gasta.

   CADA ALTERAÇÃO DEVOLVE EVENTOS
     As funções que mudam o estado devolvem { ok, eventos[] } — o que
     aconteceu, em ordem, para a tela narrar e o histórico registrar.
     Operações que vêm de fora (mesa, servidor) passam por aplicarOperacao,
     que recusa um opId já aplicado.

   Interpretações (D1…, A1…, B1…): docs/OBLIVIO.md.
   ===================================================================== */

(function (global) {
  "use strict";

  var C = global.RAMAOblivioCatalogo;

  /* ---------------------------------------------------------------
     UTILIDADES
     --------------------------------------------------------------- */

  function inteiro(v, min, max, padrao) {
    var n = Math.floor(Number(v));
    if (!isFinite(n)) n = padrao === undefined ? 0 : padrao;
    if (min !== undefined && n < min) n = min;
    if (max !== undefined && n > max) n = max;
    return n;
  }
  function metade(v) { return Math.floor(Number(v) / 2); }
  function metadeMin1(v) { return Math.max(1, metade(v)); }
  function texto(v, max) { return String(v === undefined || v === null ? "" : v).slice(0, max || 200); }
  function copiar(x) { return x === undefined ? undefined : JSON.parse(JSON.stringify(x)); }
  var contadorDeId = 0;
  function novoId(prefixo) {
    var U = global.RAMAUtil;
    if (U && U.uuid) return (prefixo || "o") + "-" + U.uuid();
    contadorDeId++;
    return (prefixo || "o") + "-" + Date.now().toString(36) + "-" + contadorDeId;
  }
  function evento(tipo, dados) { return Object.assign({ tipo: tipo }, dados || {}); }

  /* Expressões de dado "2d4+3", "1d20+10". O rolador decide cada face. */
  function analisarDados(expr) {
    var m = /^\s*(\d+)d(\d+)\s*([+-]\s*\d+)?\s*$/i.exec(String(expr || ""));
    if (!m) {
      var fixo = Number(expr);
      return isFinite(fixo) ? { qtd: 0, faces: 0, mais: fixo } : null;
    }
    return { qtd: Number(m[1]), faces: Number(m[2]), mais: m[3] ? Number(m[3].replace(/\s/g, "")) : 0 };
  }
  function rolarExpressao(expr, rolador, dadosExtras) {
    var a = analisarDados(expr);
    if (!a) return { total: 0, faces: [], expressao: String(expr) };
    var qtd = a.qtd + (dadosExtras || 0);
    var faces = [];
    for (var i = 0; i < qtd; i++) faces.push(rolador(a.faces));
    var soma = faces.reduce(function (s, x) { return s + x; }, 0) + a.mais;
    return { total: soma, faces: faces, expressao: (qtd ? qtd + "d" + a.faces : "") + (a.mais ? (a.mais > 0 && qtd ? "+" : "") + a.mais : "") };
  }
  function maximoDaExpressao(expr) {
    var a = analisarDados(expr);
    return a ? a.qtd * a.faces + a.mais : 0;
  }

  /* ---------------------------------------------------------------
     AJUSTES DA MESA — as leituras que a mesa pode trocar
     (docs/OBLIVIO.md, "Ajustes da mesa"). Persistidos na campanha;
     numa ficha avulsa, no próprio bloco.
     --------------------------------------------------------------- */

  var AJUSTES_PADRAO = {
    bonusEspecializacao: 2,            // D1: +2 (p. 48) ou +3 (p. 40)
    zona: "d20",                       // D5: d20 (livro) | d6 | 2d6 (ficha, alternativa)
    testeDeFuga: "reflexos",           // D6: reflexos | testemunha
    desgasteParcial: "cena",           // C3: cena | turnoDoAlvo
    errante: "metade",                 // A5: metade | zero | testemunha
  };
  function ajustesDe(bruto) {
    var b = bruto && typeof bruto === "object" ? bruto : {};
    return {
      bonusEspecializacao: b.bonusEspecializacao === 3 ? 3 : 2,
      zona: ["d20", "d6", "2d6"].indexOf(b.zona) >= 0 ? b.zona : "d20",
      testeDeFuga: b.testeDeFuga === "testemunha" ? "testemunha" : "reflexos",
      desgasteParcial: b.desgasteParcial === "turnoDoAlvo" ? "turnoDoAlvo" : "cena",
      errante: ["metade", "zero", "testemunha"].indexOf(b.errante) >= 0 ? b.errante : "metade",
    };
  }

  /* ---------------------------------------------------------------
     O BLOCO VAZIO E A NORMALIZAÇÃO
     --------------------------------------------------------------- */

  var VERSAO_BLOCO = 1;
  var LIMITE_OPERACOES = 300;

  function regiaoVazia(chave) {
    return { chave: chave, estado: "organica", limite: 1, estresse: 0, falhasExtremas: 0, curaTemporaria: 0 };
  }

  function fichaVazia() {
    return {
      v: VERSAO_BLOCO,
      papel: "",
      atributos: { carne: 0, forca: 0, fuga: 0, determinacao: 0, mente: 0 },
      maximos: {},
      perdas: { determinacao: 0 },
      escolhas: { dano: "carne", inventario: "carne", menosRegioes: "", protecaoContra: "carne" },
      especializacoes: [],
      motivacao: { chave: "", texto: "", abandonada: false },
      corpo: { regioes: C.REGIOES.map(function (r) { return regiaoVazia(r.chave); }) },
      limiteAjustes: [],
      coragem: 0,
      coragemIniciada: false,
      habilidades: [],
      mazelas: [],
      foraDeAcao: { ativo: false, retorno: null, historico: [] },
      morte: null,
      fardos: [],
      inventario: { itens: [], moedas: 0 },
      usos: [],
      efeitos: [],
      reservas: { abrirFeridas: 0, curadoNaCena: { cena: "", valor: 0 } },
      missao: { id: "", concluidas: 0, aplicadas: [] },
      descansos: 0,
      escolhasPendentes: [],
      operacoes: [],
      ajustes: ajustesDe(null),
      criacao: { concluida: false },
      /* Ficha avulsa (fora de campanha): o tempo de jogo local, que só
         anda pelos botões de turno/rodada/cena da própria ficha. Numa
         campanha com mesa de Oblívio, quem manda é a mesa. */
      contexto: { cena: "", tipoDeCena: "", rodada: 0, partida: "", n: 0 },
    };
  }

  var ESTADOS_REGIAO = ["organica", "protese", "ausente"];
  var ESTADOS_ITEM = ["guardado", "carregado", "derrubado", "arremessado", "destruido"];

  function normalizarItem(b) {
    if (!b || typeof b !== "object") return null;
    var cat = b.chave && C.equipamento[b.chave] ? C.equipamento[b.chave] : null;
    var item = {
      id: texto(b.id || novoId("it"), 80),
      chave: cat ? cat.chave : (b.chave ? texto(b.chave, 40) : ""),
      nome: texto(b.nome || (cat ? cat.nome : "Equipamento"), 80),
      estado: ESTADOS_ITEM.indexOf(b.estado) >= 0 ? b.estado : "guardado",
      regiao: b.regiao && C.regiao[b.regiao] ? b.regiao : null,
      estresse: inteiro(b.estresse, 0, 999, 0),
      usos: b.usos === null || b.usos === undefined ? null : inteiro(b.usos, 0, 999, 0),
      ataques: inteiro(b.ataques, 0, 99, 0),
      modificacoes: Array.isArray(b.modificacoes) ? b.modificacoes.filter(function (m) { return m && C.modificacao[m.chave]; }).map(function (m) {
        return { id: texto(m.id || novoId("md"), 80), chave: m.chave, param: m.param && typeof m.param === "object" ? copiar(m.param) : {}, fabricada: m.fabricada === true };
      }) : [],
      fabricado: b.fabricado && typeof b.fabricado === "object" ? { metade: b.fabricado.metade === true } : null,
      corrompido: b.corrompido === true,
      luz: b.luz && typeof b.luz === "object" ? { acesa: b.luz.acesa === true, rodadas: inteiro(b.luz.rodadas, 0, 999, 0), cenas: inteiro(b.luz.cenas, 0, 99, 0) } : null,
      incendiaria: b.incendiaria && typeof b.incendiaria === "object" ? { ativa: b.incendiaria.ativa === true, cena: texto(b.incendiaria.cena, 80) } : null,
      prontidao: b.prontidao && typeof b.prontidao === "object" ? copiar(b.prontidao) : null,
      nota: texto(b.nota, 300),
      qtd: inteiro(b.qtd, 1, 99, 1),
    };
    if (item.usos === null && cat && cat.usos) item.usos = cat.usos + (temMod(item, "vidaLonga") ? contarMod(item, "vidaLonga") : 0);
    return item;
  }

  function normalizar(bruto) {
    var b = bruto && typeof bruto === "object" ? bruto : {};
    var o = fichaVazia();
    o.papel = C.papel[b.papel] ? b.papel : "";
    var atr = b.atributos || {};
    Object.keys(o.atributos).forEach(function (k) { o.atributos[k] = inteiro(atr[k], 0, 99, 0); });
    if (b.maximos && typeof b.maximos === "object") {
      Object.keys(o.atributos).forEach(function (k) { if (b.maximos[k] !== undefined) o.maximos[k] = inteiro(b.maximos[k], 0, 10, 10); });
    }
    o.perdas = { determinacao: inteiro(b.perdas && b.perdas.determinacao, 0, 99, 0) };
    var e = b.escolhas || {};
    o.escolhas = {
      dano: e.dano === "fuga" ? "fuga" : "carne",
      inventario: e.inventario === "forca" ? "forca" : "carne",
      menosRegioes: ["proteses", "aprimorar", "irAlem"].indexOf(e.menosRegioes) >= 0 ? e.menosRegioes : "",
      protecaoContra: e.protecaoContra === "fuga" ? "fuga" : "carne",
    };
    var vistos = {};
    o.especializacoes = (Array.isArray(b.especializacoes) ? b.especializacoes : []).filter(function (s) {
      if (!s || !C.conhecimento[s.conhecimento] || vistos[s.conhecimento]) return false;
      vistos[s.conhecimento] = true;
      return true;
    }).map(function (s) {
      return { id: texto(s.id || novoId("es"), 80), conhecimento: s.conhecimento, origem: ["papel", "mente", "habilidade", "mesa"].indexOf(s.origem) >= 0 ? s.origem : "mesa", ref: texto(s.ref, 80) };
    });
    var mo = b.motivacao || {};
    o.motivacao = { chave: C.motivacao[mo.chave] ? mo.chave : "", texto: texto(mo.texto, 500), abandonada: mo.abandonada === true };
    var regs = b.corpo && Array.isArray(b.corpo.regioes) ? b.corpo.regioes : [];
    o.corpo.regioes = C.REGIOES.map(function (r) {
      var g = regs.filter(function (x) { return x && x.chave === r.chave; })[0] || {};
      var est = ESTADOS_REGIAO.indexOf(g.estado) >= 0 ? g.estado : "organica";
      if (r.essencial) est = "organica";
      return {
        chave: r.chave, estado: est,
        limite: est === "ausente" ? 0 : inteiro(g.limite, 1, 999, 1),
        estresse: est === "ausente" ? 0 : inteiro(g.estresse, 0, 999, 0),
        falhasExtremas: inteiro(g.falhasExtremas, 0, 99, 0),
        curaTemporaria: inteiro(g.curaTemporaria, 0, 999, 0),
      };
    });
    o.limiteAjustes = (Array.isArray(b.limiteAjustes) ? b.limiteAjustes : []).filter(function (x) { return x && isFinite(Number(x.valor)); }).map(function (x) {
      return { id: texto(x.id || novoId("la"), 80), valor: inteiro(x.valor, -99, 99, 0), origem: texto(x.origem, 40), ref: texto(x.ref, 80), nota: texto(x.nota, 200) };
    });
    o.coragem = inteiro(b.coragem, 0, 999, 0);
    o.coragemIniciada = b.coragemIniciada === true;
    o.habilidades = (Array.isArray(b.habilidades) ? b.habilidades : []).filter(function (h) { return h && C.habilidade[h.chave]; }).map(function (h) {
      return { id: texto(h.id || novoId("hb"), 80), chave: h.chave, origem: texto(h.origem || "mesa", 40), ref: texto(h.ref, 80), param: h.param && typeof h.param === "object" ? copiar(h.param) : {} };
    });
    o.mazelas = (Array.isArray(b.mazelas) ? b.mazelas : []).filter(function (m) { return m && C.mazela[m.chave]; }).map(function (m) {
      return { id: texto(m.id || novoId("mz"), 80), chave: m.chave, param: m.param && typeof m.param === "object" ? copiar(m.param) : {}, origem: m.origem && typeof m.origem === "object" ? copiar(m.origem) : {} };
    });
    var fa = b.foraDeAcao || {};
    o.foraDeAcao = {
      ativo: fa.ativo === true,
      retorno: fa.retorno && typeof fa.retorno === "object" ? copiar(fa.retorno) : null,
      historico: (Array.isArray(fa.historico) ? fa.historico : []).filter(Boolean).map(function (h) {
        return { id: texto(h.id || novoId("fa"), 80), vez: inteiro(h.vez, 1, 3, 1), missao: texto(h.missao, 80), fardo: h.fardo ? texto(h.fardo, 40) : "", quando: texto(h.quando, 80), contaComo: inteiro(h.contaComo, 1, 3, 1) };
      }),
    };
    o.morte = b.morte && typeof b.morte === "object" ? { causa: texto(b.morte.causa, 200), quando: texto(b.morte.quando, 80) } : null;
    o.fardos = (Array.isArray(b.fardos) ? b.fardos : []).filter(function (f) { return f && C.fardo[f.chave]; }).map(function (f) {
      return { id: texto(f.id || novoId("fd"), 80), chave: f.chave, param: f.param && typeof f.param === "object" ? copiar(f.param) : {} };
    });
    var inv = b.inventario || {};
    o.inventario = { itens: (Array.isArray(inv.itens) ? inv.itens : []).map(normalizarItem).filter(Boolean), moedas: inteiro(inv.moedas, 0, 999999, 0) };
    o.usos = (Array.isArray(b.usos) ? b.usos : []).filter(function (u) { return u && u.chave; }).map(function (u) {
      return { chave: texto(u.chave, 60), escopo: texto(u.escopo, 30), marca: texto(u.marca, 120), n: inteiro(u.n, 0, 999, 0) };
    });
    o.efeitos = (Array.isArray(b.efeitos) ? b.efeitos : []).filter(function (x) { return x && x.tipo; }).map(function (x) { return copiar(x); });
    var rs = b.reservas || {};
    o.reservas = { abrirFeridas: inteiro(rs.abrirFeridas, 0, 999, 0), curadoNaCena: { cena: texto(rs.curadoNaCena && rs.curadoNaCena.cena, 80), valor: inteiro(rs.curadoNaCena && rs.curadoNaCena.valor, 0, 999, 0) } };
    var ms = b.missao || {};
    o.missao = { id: texto(ms.id, 80), concluidas: inteiro(ms.concluidas, 0, 999, 0), aplicadas: (Array.isArray(ms.aplicadas) ? ms.aplicadas : []).map(function (x) { return texto(x, 80); }).slice(-100) };
    o.descansos = inteiro(b.descansos, 0, 99999, 0);
    o.escolhasPendentes = (Array.isArray(b.escolhasPendentes) ? b.escolhasPendentes : []).filter(function (p) { return p && p.tipo; }).map(function (p) { return copiar(p); });
    o.operacoes = (Array.isArray(b.operacoes) ? b.operacoes : []).map(function (x) { return texto(x, 120); }).slice(-LIMITE_OPERACOES);
    o.ajustes = ajustesDe(b.ajustes);
    o.criacao = { concluida: !!(b.criacao && b.criacao.concluida) };
    var cx = b.contexto || {};
    o.contexto = { cena: texto(cx.cena, 80), tipoDeCena: C.cena[cx.tipoDeCena] ? cx.tipoDeCena : "", rodada: inteiro(cx.rodada, 0, 9999, 0), partida: texto(cx.partida, 80), n: inteiro(cx.n, 0, 99999, 0) };
    return o;
  }

  /* ---------------------------------------------------------------
     CONSULTAS BÁSICAS
     --------------------------------------------------------------- */

  function temHabilidade(o, chave) {
    if (chave === "sobrecarga") return o.escolhas.menosRegioes === "irAlem";
    if (o.habilidades.some(function (h) { return h.chave === chave; })) return true;
    /* Cópia Barata: a habilidade copiada vale até o fim da cena. */
    return o.efeitos.some(function (e) { return e.tipo === "copia" && e.habilidade === chave; });
  }
  function temMazela(o, chave) { return o.mazelas.some(function (m) { return m.chave === chave; }); }
  function mazelaDe(o, chave) { return o.mazelas.filter(function (m) { return m.chave === chave; })[0] || null; }
  function temFardo(o, chave) { return o.fardos.some(function (f) { return f.chave === chave; }); }
  function imune(o, chaveMazela) {
    return o.habilidades.some(function (h) { return h.chave === "caoVelho" && h.param && h.param.mazela === chaveMazela; });
  }
  function regiao(o, chave) { return o.corpo.regioes.filter(function (r) { return r.chave === chave; })[0] || null; }
  function regioesPresentes(o) { return o.corpo.regioes.filter(function (r) { return r.estado !== "ausente"; }); }
  function esgotada(r) { return r.estado !== "ausente" && r.estresse >= r.limite; }
  function temMod(item, chave) { return (item.modificacoes || []).some(function (m) { return m.chave === chave; }); }
  function contarMod(item, chave) { return (item.modificacoes || []).filter(function (m) { return m.chave === chave; }).length; }

  /* Atributos Fixos efetivos: o valor guardado, a perda por Pavor na
     Determinação e a Lentidão (Fuga pela metade, mín. 1). */
  function atributosEfetivos(o) {
    var a = copiar(o.atributos);
    a.determinacao = Math.max(0, a.determinacao - (o.perdas.determinacao || 0));
    if (temMazela(o, "lentidao")) a.fuga = Math.max(1, metade(a.fuga));
    return a;
  }

  /* ---------------------------------------------------------------
     CÁLCULO — tudo o que é derivado, com a composição
     --------------------------------------------------------------- */

  function papelDe(o) { return C.papel[o.papel] || null; }

  function limiteTotal(o) {
    var p = papelDe(o);
    var base = p ? p.estresse : 0;
    var partes = [{ fonte: p ? p.nome : "Papel", valor: base }, { fonte: "Carne", valor: o.atributos.carne }];
    o.limiteAjustes.forEach(function (x) { partes.push({ fonte: x.nota || x.origem, valor: x.valor }); });
    var total = partes.reduce(function (s, x) { return s + x.valor; }, 0);
    return { total: Math.max(1, total), partes: partes };
  }

  function itensEquipados(o) {
    return o.inventario.itens.filter(function (i) { return i.estado === "carregado"; });
  }

  /* Proteção completa: base, equipamentos e efeitos. O Escudo Humano e o
     que depende do grupo vêm em ctx.bonusDeGrupo (mesa.js). */
  function protecaoCompleta(o, ctx) {
    var a = atributosEfetivos(o);
    var c = ctx || {};
    var partes = [];
    var carneNaBase = temMazela(o, "botandoParaFora") ? 0 : a.carne;
    var base = metade(carneNaBase + a.fuga);
    partes.push({ fonte: temMazela(o, "botandoParaFora") ? "(Fuga) / 2 — Botando para Fora" : "(Carne + Fuga) / 2", valor: base });
    var armaduras = 0;
    itensEquipados(o).forEach(function (i) {
      var cat = C.equipamento[i.chave];
      if (!cat || !cat.bonusProtecao) return;
      var reg = i.regiao ? regiao(o, i.regiao) : null;
      if (cat.classe === "escudo" && reg && esgotada(reg) && !temMod(i, "amarra")) return; // Manter a Guarda
      var bonus = cat.bonusProtecao + contarMod(i, "reforco");
      if (cat.classe === "escudo" && i.prontidao && i.prontidao.ativa) bonus *= 2;
      if (cat.classe === "vestimenta") armaduras += bonus;
      partes.push({ fonte: i.nome, valor: bonus, classe: cat.classe });
    });
    o.efeitos.forEach(function (e) {
      if (e.tipo === "protecao") partes.push({ fonte: e.fonte || "Efeito", valor: inteiro(e.valor, -99, 99, 0) });
    });
    (c.bonusDeGrupo || []).forEach(function (b) { partes.push(b); });
    var cega = mazelaDe(o, "coragemCega");
    if (cega) partes.push({ fonte: "Coragem Cega", valor: -inteiro(cega.param.reducao, 0, 99, 0) });
    var total = partes.reduce(function (s, x) { return s + x.valor; }, 0);
    var aumento = o.efeitos.filter(function (e) { return e.tipo === "aumentarMutavel" && e.atributo === "protecao"; }).length;
    if (aumento) { partes.push({ fonte: "Coragem: Aumentar Atributo", valor: total * aumento }); total += total * aumento; }
    if (temMazela(o, "semReacao")) {
      /* Sem Reação: Proteção 1, só as armaduras (Vestimentas) somam. */
      return { total: 1 + armaduras, partes: [{ fonte: "Sem Reação", valor: 1 }].concat(armaduras ? [{ fonte: "Vestimenta", valor: armaduras }] : []) };
    }
    return { total: Math.max(0, total), partes: partes };
  }

  function calcularMutaveis(o, ctx) {
    var a = atributosEfetivos(o);
    function aumento(chave) { return o.efeitos.filter(function (e) { return e.tipo === "aumentarMutavel" && e.atributo === chave; }).length; }
    var danoCom = o.escolhas.dano === "fuga" ? "fuga" : "carne";
    var m = {};
    function mut(chave, valorBase, formula, extras) {
      var v = Math.min(C.MAXIMO_MUTAVEL, valorBase);
      var partes = [{ fonte: formula, valor: v }].concat(extras || []);
      var total = partes.reduce(function (s, x) { return s + x.valor; }, 0);
      var n = aumento(chave);
      if (n) { partes.push({ fonte: "Coragem: Aumentar Atributo", valor: total * n }); total += total * n; }
      m[chave] = { base: v, total: total, partes: partes };
    }
    mut("dano", metade(a.forca + a[danoCom]), "(Força + " + (danoCom === "fuga" ? "Fuga" : "Carne") + ") / 2");
    mut("folego", metade(a.carne + a.determinacao), "(Carne + Determinação) / 2");
    var vel = metade(a.fuga + a.determinacao);
    var extrasVel = [];
    if (o.efeitos.some(function (e) { return e.tipo === "acelerar"; })) extrasVel.push({ fonte: "Acelerar", valor: Math.min(C.MAXIMO_MUTAVEL, vel) });
    mut("velocidade", vel, "(Fuga + Determinação) / 2", extrasVel);
    var cor = metade(a.determinacao + a.mente);
    m.coragem = { base: cor, saldo: o.coragem, total: o.coragem, partes: [{ fonte: "(Determinação + Mente) / 2 — valor inicial", valor: cor }] };
    m.protecao = protecaoCompleta(o, ctx);
    return m;
  }

  function espacosDeInventario(o) {
    var a = atributosEfetivos(o);
    var attr = o.escolhas.inventario === "forca" ? a.forca : a.carne;
    var partes = [{ fonte: "Base", valor: C.INVENTARIO.base }, { fonte: (o.escolhas.inventario === "forca" ? "Força" : "Carne") + " (mín. 1)", valor: Math.max(1, attr) }];
    itensEquipados(o).forEach(function (i) {
      var n = contarMod(i, "espacosa");
      if (n && C.equipamento[i.chave] && C.equipamento[i.chave].classe === "vestimenta") partes.push({ fonte: i.nome + " (Espaçosa)", valor: 5 * n });
    });
    var total = partes.reduce(function (s, x) { return s + x.valor; }, 0);
    var usados = o.inventario.itens.filter(function (i) { return i.estado === "guardado"; }).reduce(function (s, i) { return s + espacosDoItem(i); }, 0);
    return { total: total, usados: usados, livres: total - usados, partes: partes };
  }

  /* Espaços de um item guardado: o do catálogo × quantidade + 1 por
     modificação (p. 77). */
  function espacosDoItem(i) {
    var cat = C.equipamento[i.chave];
    var base = cat ? cat.espacos : 1;
    return base * (i.qtd || 1) + (i.modificacoes || []).length;
  }

  /* Distribuição do limite: a soma dos limites das regiões presentes
     deve bater com o limite total. Diferença vira pendência. */
  function distribuicao(o) {
    var lim = limiteTotal(o).total;
    var soma = regioesPresentes(o).reduce(function (s, r) { return s + r.limite; }, 0);
    return { limite: lim, distribuido: soma, falta: lim - soma };
  }

  function especializacoesEsperadas(o) {
    var a = o.atributos;
    return {
      papel: C.ESPECIALIZACOES_DO_PAPEL,
      mente: metade(a.mente),
      habilidades: o.habilidades.filter(function (h) { return h.chave === "saberEPoder"; }).length,
    };
  }

  function bonusDeEspecializacao(o, conhecimento) {
    var tem = o.especializacoes.some(function (s) { return s.conhecimento === conhecimento; });
    return tem ? o.ajustes.bonusEspecializacao : 0;
  }

  function pendencias(o) {
    var p = [];
    var d = distribuicao(o);
    if (d.falta !== 0) p.push({ tipo: "distribuirLimite", falta: d.falta, texto: d.falta > 0 ? "Distribua " + d.falta + " de limite de Estresse pelas regiões." : "Retire " + (-d.falta) + " de limite das regiões." });
    if (o.papel) {
      var esp = especializacoesEsperadas(o);
      var doPapel = o.especializacoes.filter(function (s) { return s.origem === "papel"; }).length;
      var daMente = o.especializacoes.filter(function (s) { return s.origem === "mente"; }).length;
      if (doPapel < esp.papel) p.push({ tipo: "especializacaoPapel", falta: esp.papel - doPapel, texto: "Escolha " + (esp.papel - doPapel) + " especialização(ões) da lista do Papel." });
      if (daMente < esp.mente) p.push({ tipo: "especializacaoMente", falta: esp.mente - daMente, texto: "Escolha " + (esp.mente - daMente) + " especialização(ões) por metade de Mente." });
      if (!temHabilidade(o, papelDe(o).principal)) p.push({ tipo: "habilidadePrincipal", texto: "Falta a Habilidade Principal do Papel." });
    }
    o.escolhasPendentes.forEach(function (e) { p.push(e); });
    regioesPresentes(o).forEach(function (r) {
      if (r.limite < 1) p.push({ tipo: "regiaoSemLimite", regiao: r.chave, texto: "Toda região presente precisa de pelo menos 1 de limite." });
    });
    var esp = espacosDeInventario(o);
    if (o.criacao.concluida && esp.usados > esp.total) p.push({ tipo: "inventarioCheio", excesso: esp.usados - esp.total, texto: "O inventário passou " + (esp.usados - esp.total) + " espaço(s) do limite: carregue, use ou largue algo." });
    if (o.inventario.itens.some(function (i) { return i.estado === "carregado" && i.regiao && regiao(o, i.regiao) && regiao(o, i.regiao).estado === "ausente"; })) {
      p.push({ tipo: "itemSemRegiao", texto: "Há equipamento numa região que não existe mais." });
    }
    return p;
  }

  function estadoDaPersona(o) {
    if (o.morte) return "morta";
    if (o.foraDeAcao.ativo) return "foraDeAcao";
    return "ativa";
  }

  function calcular(o, ctx) {
    var lim = limiteTotal(o);
    return {
      atributos: atributosEfetivos(o),
      mutaveis: calcularMutaveis(o, ctx),
      limite: lim,
      distribuicao: distribuicao(o),
      estresseTotal: regioesPresentes(o).reduce(function (s, r) { return s + r.estresse; }, 0),
      regioes: o.corpo.regioes.map(function (r) {
        var item = o.inventario.itens.filter(function (i) { return i.estado === "carregado" && i.regiao === r.chave; })[0] || null;
        return Object.assign({}, r, {
          nome: C.regiao[r.chave].nome,
          disponivel: r.estado !== "ausente" && !esgotada(r),
          esgotada: esgotada(r),
          restante: r.estado === "ausente" ? 0 : Math.max(0, r.limite - r.estresse),
          item: item,
        });
      }),
      espacos: espacosDeInventario(o),
      pendencias: pendencias(o),
      estado: estadoDaPersona(o),
      foraDeAcaoNaMissao: ocorrenciasNaMissao(o),
    };
  }

  /* ---------------------------------------------------------------
     CRIAÇÃO (pp. 18–25, 53, 67)
     --------------------------------------------------------------- */

  /* Confere um rascunho de criação; não altera nada. */
  function validarCriacao(o) {
    var erros = [];
    var soma = 0;
    C.ATRIBUTOS.forEach(function (at) {
      var v = o.atributos[at.chave];
      if (v < C.CRIACAO.minimo || v > C.CRIACAO.maximo) erros.push({ campo: at.chave, texto: at.nome + " vai de 0 a 10." });
      soma += v;
    });
    if (soma !== C.CRIACAO.pontos) erros.push({ campo: "atributos", texto: soma < C.CRIACAO.pontos ? "Faltam " + (C.CRIACAO.pontos - soma) + " ponto(s) de atributo." : "Passou " + (soma - C.CRIACAO.pontos) + " ponto(s) de atributo." });
    var p = papelDe(o);
    if (!p) erros.push({ campo: "papel", texto: "Escolha um Papel." });
    if (p) {
      var doPapel = o.especializacoes.filter(function (s) { return s.origem === "papel"; });
      if (doPapel.length !== C.ESPECIALIZACOES_DO_PAPEL) erros.push({ campo: "especializacoes", texto: "Escolha exatamente 3 especializações da lista de " + p.nome + "." });
      doPapel.forEach(function (s) { if (p.lista.indexOf(s.conhecimento) < 0) erros.push({ campo: "especializacoes", texto: C.conhecimento[s.conhecimento].nome + " não está na lista do Papel." }); });
      var daMente = o.especializacoes.filter(function (s) { return s.origem === "mente"; }).length;
      if (daMente !== metade(o.atributos.mente)) erros.push({ campo: "especializacoes", texto: "Por Mente, escolha " + metade(o.atributos.mente) + " especialização(ões) a mais (da lista completa)." });
    }
    var d = distribuicao(o);
    if (p && d.falta !== 0) erros.push({ campo: "corpo", texto: d.falta > 0 ? "Distribua mais " + d.falta + " de limite de Estresse." : "Tire " + (-d.falta) + " de limite de Estresse." });
    regioesPresentes(o).forEach(function (r) { if (r.limite < 1) erros.push({ campo: "corpo", texto: C.regiao[r.chave].nome + " precisa de pelo menos 1." }); });
    o.corpo.regioes.forEach(function (r) { if (r.estado === "protese" && r.limite > C.MENOS_REGIOES.proteses.limiteProtese) erros.push({ campo: "corpo", texto: "Uma prótese aguenta até 5." }); });
    var faltando = o.corpo.regioes.filter(function (r) { return r.estado !== "organica"; }).length;
    if (faltando && !o.escolhas.menosRegioes) erros.push({ campo: "corpo", texto: "Com menos regiões, escolha Usar Próteses, Aprimorar o Corpo ou Ir Além." });
    /* Equipamento inicial (p. 67): a soma dos espaços de TODOS os
       escolhidos, carregados ou não, cabe nos espaços; sem modificações. */
    var esp = espacosDeInventario(o);
    var todos = o.inventario.itens.reduce(function (s, i) { var cat = C.equipamento[i.chave]; return s + (cat ? cat.espacos : 1) * (i.qtd || 1); }, 0);
    if (todos > esp.total) erros.push({ campo: "equipamentos", texto: "Os equipamentos iniciais ocupam " + todos + " espaços; o limite é " + esp.total + " (contando os que vão carregados)." });
    o.inventario.itens.forEach(function (i) {
      var r = requisitosDoItem(o, i);
      if (!r.ok) erros.push({ campo: "equipamentos", texto: i.nome + ": " + r.motivo });
      if ((i.modificacoes || []).length) erros.push({ campo: "equipamentos", texto: i.nome + " não pode começar com modificação (a menos que a Testemunha permita)." });
    });
    var carregados = {};
    o.inventario.itens.forEach(function (i) {
      if (i.estado !== "carregado" || temMod(i, "bandoleira")) return;
      if (!i.regiao) erros.push({ campo: "equipamentos", texto: i.nome + ": escolha a região que o carrega." });
      else if (carregados[i.regiao]) erros.push({ campo: "equipamentos", texto: "Uma região carrega um equipamento só." });
      carregados[i.regiao] = true;
    });
    return { ok: !erros.length, erros: erros };
  }

  /* Uma distribuição sugerida: Torso com um pouco mais, o resto igual.
     Só preenche quando pedida — nunca sobrescreve a escolha. */
  function sugerirDistribuicao(o) {
    var lim = limiteTotal(o).total;
    var presentes = regioesPresentes(o);
    var proteses = presentes.filter(function (r) { return r.estado === "protese"; });
    var organicas = presentes.filter(function (r) { return r.estado === "organica"; });
    var restante = lim;
    var saida = {};
    proteses.forEach(function (r) { var v = Math.min(C.MENOS_REGIOES.proteses.limiteProtese, Math.max(1, Math.floor(lim / presentes.length))); saida[r.chave] = v; restante -= v; });
    var n = organicas.length;
    if (!n) return saida;
    var cada = Math.max(1, Math.floor(restante / (n + 1)));
    organicas.forEach(function (r) { if (r.chave !== "torso") { saida[r.chave] = cada; restante -= cada; } });
    saida.torso = Math.max(1, restante);
    return saida;
  }

  /* Conclui a criação: Habilidade Principal, Coragem inicial (e a de
     Aprimorar o Corpo), sem pisar no que já foi escolhido. */
  function concluirCriacao(o) {
    var p = papelDe(o);
    var eventos = [];
    if (p && !temHabilidade(o, p.principal)) {
      o.habilidades.push({ id: novoId("hb"), chave: p.principal, origem: "papel", ref: "", param: {} });
      eventos.push(evento("habilidade", { chave: p.principal }));
    }
    if (!o.coragemIniciada) {
      var base = metade(atributosEfetivos(o).determinacao + o.atributos.mente);
      var extra = o.escolhas.menosRegioes === "aprimorar" ? o.corpo.regioes.filter(function (r) { return r.estado === "ausente"; }).length : 0;
      o.coragem = base + extra;
      o.coragemIniciada = true;
      eventos.push(evento("coragem", { valor: o.coragem, motivo: "inicial" }));
    }
    sincronizarAprimorar(o);
    o.criacao.concluida = true;
    return { ok: true, eventos: eventos };
  }

  /* Aprimorar o Corpo (p. 44): +1 de limite por região ausente — um
     ajuste por região, idempotente. */
  function sincronizarAprimorar(o) {
    var ausentes = o.corpo.regioes.filter(function (r) { return r.estado === "ausente"; }).map(function (r) { return r.chave; });
    o.limiteAjustes = o.limiteAjustes.filter(function (x) { return x.origem !== "aprimorar" || (o.escolhas.menosRegioes === "aprimorar" && ausentes.indexOf(x.ref) >= 0); });
    if (o.escolhas.menosRegioes !== "aprimorar") return;
    ausentes.forEach(function (r) {
      if (!o.limiteAjustes.some(function (x) { return x.origem === "aprimorar" && x.ref === r; })) {
        o.limiteAjustes.push({ id: novoId("la"), valor: 1, origem: "aprimorar", ref: r, nota: "Aprimorar o Corpo (" + C.regiao[r].nome + ")" });
      }
    });
  }

  /* ---------------------------------------------------------------
     USOS — contagens por escopo (rodada, cena, descanso, partida…)
     --------------------------------------------------------------- */

  /* A marca de um escopo no contexto atual: o mesmo uso conta uma vez
     por rodada da mesma cena, por cena, por intervalo entre Descansos… */
  function marcaDoEscopo(o, escopo, ctx) {
    var c = ctx || {};
    switch (escopo) {
      case "rodada": return (c.cena || "") + "#" + (c.rodada || 0);
      case "cena": return c.cena || "";
      case "cenaCalma": return c.cena || "";
      case "descanso": return "d" + o.descansos;
      case "partida": return c.partida || "avulsa";
      case "missao": return c.missao || o.missao.id || "";
      default: return "";
    }
  }
  function usosFeitos(o, chave, escopo, ctx) {
    var marca = marcaDoEscopo(o, escopo, ctx);
    var u = o.usos.filter(function (x) { return x.chave === chave && x.escopo === escopo && x.marca === marca; })[0];
    return u ? u.n : 0;
  }
  function limiteDoUso(o, lim) {
    if (lim.vezes === "folego") return Math.max(1, calcularMutaveis(o).folego.total);
    return lim.vezes;
  }
  /* Uma habilidade pode ser usada agora? Confere TODOS os limites que
     valem no tipo de cena do contexto. */
  function podeUsar(o, chave, ctx) {
    var h = C.habilidade[chave];
    if (!h) return { ok: false, motivo: "Habilidade desconhecida." };
    if (!temHabilidade(o, chave)) return { ok: false, motivo: "A Persona não tem " + h.nome + "." };
    if (estadoDaPersona(o) !== "ativa") return { ok: false, motivo: "A Persona não pode agir agora." };
    var c = ctx || {};
    var calma = c.tipoDeCena === "descanso" || c.tipoDeCena === "interacao";
    var limites = (h.limites || []).filter(function (l) {
      if (l.escopo === "cenaCalma") return calma;
      if (l.escopo === "rodada") return !calma;
      return true;
    });
    for (var i = 0; i < limites.length; i++) {
      var l = limites[i];
      var feitos = usosFeitos(o, chave, l.escopo, c);
      if (feitos >= limiteDoUso(o, l)) return { ok: false, motivo: h.nome + ": limite de " + limiteDoUso(o, l) + " por " + nomeDoEscopo(l.escopo) + " atingido." };
    }
    return { ok: true, limites: limites };
  }
  function nomeDoEscopo(e) {
    return { rodada: "rodada", cena: "cena", cenaCalma: "cena de Descanso ou Interação", descanso: "intervalo entre Descansos", partida: "Partida", missao: "Missão", partidaPorAlvo: "Partida e alvo" }[e] || e;
  }
  function registrarUso(o, chave, ctx, escopos) {
    var h = C.habilidade[chave];
    var lista = escopos || ((h && h.limites) || []).map(function (l) { return l.escopo; });
    lista.forEach(function (escopo) {
      var marca = marcaDoEscopo(o, escopo, ctx);
      var u = o.usos.filter(function (x) { return x.chave === chave && x.escopo === escopo && x.marca === marca; })[0];
      if (u) u.n++;
      else o.usos.push({ chave: chave, escopo: escopo, marca: marca, n: 1 });
    });
    /* Guarda só o que ainda pode valer: marcas velhas saem. */
    if (o.usos.length > 120) o.usos = o.usos.slice(-120);
  }

  /* ---------------------------------------------------------------
     CORAGEM (p. 37; mazelas Pavor e Coragem Cega; fardo Covardia)
     --------------------------------------------------------------- */

  /* Ganho: passa de 10 se a regra der (p. 21). 3+ de uma vez na mesma
     cena ou rodada dá Coragem Cega (p. 91). */
  function ganharCoragem(o, n, motivo) {
    var v = inteiro(n, 0, 99, 0);
    if (!v) return { ok: false, eventos: [] };
    o.coragem += v;
    var eventos = [evento("coragem", { valor: v, motivo: motivo || "" })];
    if (v >= C.RECUPERACAO.coragemCega) {
      var r = aplicarMazela(o, "coragemCega", { reducao: v }, { tipo: "coragem" });
      eventos = eventos.concat(r.eventos);
    }
    return { ok: true, eventos: eventos };
  }

  /* Perda: Covardia e o efeito Assustador do Buraco dobram; sem Coragem,
     a perda vira Pavor (p. 93). ctx.perdaDeCoragem: multiplicador do
     Buraco. `porFalha`: perda por ter falhado num teste (Covardia). */
  function perderCoragem(o, n, opcoes) {
    var op = opcoes || {};
    var v = inteiro(n, 0, 99, 0);
    if (!v) return { ok: false, eventos: [] };
    if (temFardo(o, "covardia") && (op.porFalha || op.porHabilidade)) v *= 2;
    if (op.multiplicador) v *= op.multiplicador;
    var eventos = [];
    if (o.coragem <= 0) {
      eventos = eventos.concat(aplicarMazela(o, "pavor", {}, { tipo: "semCoragem" }).eventos);
      return { ok: true, perdeu: 0, eventos: eventos };
    }
    var perdeu = Math.min(o.coragem, v);
    o.coragem -= perdeu;
    eventos.push(evento("coragem", { valor: -perdeu, motivo: op.motivo || "" }));
    if (perdeu < v) eventos = eventos.concat(aplicarMazela(o, "pavor", {}, { tipo: "semCoragem" }).eventos);
    return { ok: true, perdeu: perdeu, eventos: eventos };
  }

  /* Gastos de Coragem fora do teste (os do teste ficam no combate). */
  function gastarCoragem(o, uso, param, ctx) {
    var p = param || {};
    var eventos = [];
    if (estadoDaPersona(o) !== "ativa") return { ok: false, motivo: "A Persona não pode agir agora.", eventos: [] };
    if (uso === "recuperarEstresse") {
      var pontos = inteiro(p.pontos, 1, 99, 1);
      if (o.coragem < pontos) return { ok: false, motivo: "Coragem insuficiente.", eventos: [] };
      var folego = calcularMutaveis(o).folego.total;
      o.coragem -= pontos;
      eventos.push(evento("coragem", { valor: -pontos, motivo: "Recuperar Estresse" }));
      var cura = recuperarEstresse(o, folego * pontos, { fonte: "coragem", distribuicao: p.distribuicao, ctx: ctx });
      return { ok: true, eventos: eventos.concat(cura.eventos) };
    }
    if (uso === "aumentarMutavel") {
      if (!C.mutavel[p.atributo] || p.atributo === "coragem") return { ok: false, motivo: "Escolha Dano, Fôlego, Proteção ou Velocidade.", eventos: [] };
      if (o.coragem < 1) return { ok: false, motivo: "Coragem insuficiente.", eventos: [] };
      o.coragem -= 1;
      o.efeitos.push({ id: novoId("ef"), tipo: "aumentarMutavel", atributo: p.atributo, expira: "fimDoTurnoOuProximaAcao" });
      return { ok: true, eventos: [evento("coragem", { valor: -1, motivo: "Aumentar " + C.mutavel[p.atributo].nome })] };
    }
    if (uso === "reduzirExtremo") {
      var n = inteiro(p.valor, 1, 19, 1);
      if (o.coragem < n) return { ok: false, motivo: "Coragem insuficiente.", eventos: [] };
      o.coragem -= n;
      var ja = o.efeitos.filter(function (e) { return e.tipo === "reduzirExtremo"; })[0];
      if (ja) ja.valor += n;
      else o.efeitos.push({ id: novoId("ef"), tipo: "reduzirExtremo", valor: n, expira: "proximoTeste" });
      return { ok: true, eventos: [evento("coragem", { valor: -n, motivo: "Reduzir Extremo (próximo teste)" })] };
    }
    return { ok: false, motivo: "Uso de Coragem desconhecido.", eventos: [] };
  }

  /* ---------------------------------------------------------------
     MAZELAS (pp. 91–94)
     --------------------------------------------------------------- */

  function aplicarMazela(o, chave, param, origem) {
    var m = C.mazela[chave];
    if (!m) return { ok: false, eventos: [] };
    if (imune(o, chave)) return { ok: false, imune: true, eventos: [evento("imunidade", { mazela: chave })] };
    var p = param || {};
    var ja = mazelaDe(o, chave);
    if (ja) {
      /* Uma mazela não se duplica: a nova só vale se for pior. */
      if (chave === "ferida" && inteiro(p.dano, 0, 999, 0) > inteiro(ja.param.dano, 0, 999, 0)) ja.param.dano = inteiro(p.dano, 0, 999, 0);
      if (chave === "pegandoFogo" && inteiro(p.dano, 0, 999, 0) > inteiro(ja.param.dano, 0, 999, 0)) ja.param = { dano: inteiro(p.dano, 0, 999, 0), proximo: metade(p.dano), sofrido: 0 };
      if (chave === "coragemCega") ja.param.reducao = inteiro(ja.param.reducao, 0, 99, 0) + inteiro(p.reducao, 0, 99, 0);
      return { ok: true, repetida: true, eventos: [] };
    }
    var nova = { id: novoId("mz"), chave: chave, param: {}, origem: origem || {} };
    if (chave === "ferida") nova.param = { dano: inteiro(p.dano, 1, 999, 1) };
    if (chave === "pegandoFogo") nova.param = { dano: inteiro(p.dano, 0, 999, 0), proximo: metade(p.dano), sofrido: 0 };
    if (chave === "coragemCega") nova.param = { reducao: inteiro(p.reducao, 0, 99, 0) };
    if (chave === "semFolego") nova.param = { turnos: 0, maximo: Math.max(1, calcularMutaveis(o).folego.total) };
    if (chave === "semReacao") nova.param = { turnos: 0 };
    if (chave === "juraDeMorte") nova.param = { origem: texto(p.origem, 80), permanente: p.permanente === true };
    o.mazelas.push(nova);
    var eventos = [evento("mazela", { chave: chave, param: nova.param })];
    (m.implica || []).forEach(function (k) { eventos = eventos.concat(aplicarMazela(o, k, {}, { tipo: "implicada", por: chave }).eventos); });
    return { ok: true, eventos: eventos };
  }

  /* Remover respeita a forma: Fardo nunca sai por cura comum; mazela
     só sai pelos meios dela (o motor confere `meio` contra a lista). */
  function removerMazela(o, chave, meio) {
    var m = C.mazela[chave];
    if (!m || !temMazela(o, chave)) return { ok: false, motivo: "A Persona não tem essa mazela.", eventos: [] };
    if (meio && meio !== "mesa" && m.remocao.indexOf(meio) < 0 && !m.remocao.some(function (r) { return r.indexOf(meio) === 0; })) {
      return { ok: false, motivo: m.nome + " não sai com isso.", eventos: [] };
    }
    o.mazelas = o.mazelas.filter(function (x) { return x.chave !== chave; });
    return { ok: true, eventos: [evento("mazelaRemovida", { chave: chave, meio: meio || "" })] };
  }

  /* ---------------------------------------------------------------
     ESTRESSE — receber e recuperar
     --------------------------------------------------------------- */

  /* Receber Estresse. opcoes:
       regiao   onde cai (escolha de quem recebe; Mirar fixa a região)
       item     id de um Durável EMPUNHADO para absorver (p. 66–67):
                tudo ou nada — não se divide entre itens nem com o corpo
       origem   { tipo, ref } para a narração e para gatilhos
       semEquipamento  (Sacrificar, ataques "direto no corpo")
       ctx      contexto (Buraco: Mortal etc.)
     Aplica Carne Fraca (dobra e encerra), transborda para o Torso, abre
     Ferida (metade do limite de uma vez) e detecta Fora de Ação. */
  function receberEstresse(o, valor, opcoes) {
    var op = opcoes || {};
    var eventos = [];
    var v = inteiro(valor, 0, 9999, 0);
    if (!v) return { ok: true, valor: 0, eventos: eventos };
    if (estadoDaPersona(o) === "morta") return { ok: false, motivo: "A Persona está morta.", eventos: eventos };
    var fraca = mazelaDe(o, "carneFraca");
    if (fraca) {
      v *= 2;
      o.mazelas = o.mazelas.filter(function (m) { return m !== fraca; });
      eventos.push(evento("mazelaRemovida", { chave: "carneFraca", meio: "proximoEstresse", dobrou: true }));
    }
    var recebido = v;
    /* Um Durável empunhado pode absorver tudo (e só ele). */
    if (op.item && !op.semEquipamento) {
      var item = o.inventario.itens.filter(function (i) { return i.id === op.item && i.estado === "carregado"; })[0];
      var cat = item && C.equipamento[item.chave];
      if (item && cat && cat.tipo === "duravel") {
        var limI = limiteDoItem(item);
        var cabe = Math.max(0, limI - item.estresse);
        var noItem = Math.min(cabe, v);
        item.estresse += noItem;
        eventos.push(evento("estresseNoItem", { item: item.id, nome: item.nome, valor: noItem }));
        v -= noItem;
        if (item.estresse >= limI) {
          var regDoItem = item.regiao;
          item.estado = "destruido";
          eventos.push(evento("itemDestruido", { item: item.id, nome: item.nome }));
          if (v > 0) op = Object.assign({}, op, { regiao: regDoItem || op.regiao });
        }
      }
    }
    var restante = v;
    if (restante > 0) {
      var alvo = op.regiao ? regiao(o, op.regiao) : null;
      var redirecionado = false;
      if (!alvo || alvo.estado === "ausente") { alvo = regiao(o, "torso"); redirecionado = !!op.regiao; }
      if (esgotada(alvo) && alvo.chave !== "torso") { alvo = regiao(o, "torso"); redirecionado = true; }
      var cap = alvo.estado === "ausente" ? 0 : Math.max(0, alvo.limite - alvo.estresse);
      var aqui = Math.min(cap, restante);
      alvo.estresse += aqui;
      if (aqui) eventos.push(evento("estresse", redirecionado ? { regiao: alvo.chave, valor: aqui, transbordo: true, de: op.regiao } : { regiao: alvo.chave, valor: aqui }));
      restante -= aqui;
      if (restante > 0 && alvo.chave !== "torso") {
        var torso = regiao(o, "torso");
        var capT = Math.max(0, torso.limite - torso.estresse);
        var noTorso = Math.min(capT, restante);
        torso.estresse += noTorso;
        if (noTorso) eventos.push(evento("estresse", { regiao: "torso", valor: noTorso, transbordo: true }));
        restante -= noTorso;
      }
      if (restante > 0) eventos.push(evento("excesso", { valor: restante, texto: "Estresse além do limite do Torso (nada mais o recebe)." }));
      if (alvo.estado === "protese" && esgotada(alvo)) eventos.push(evento("proteseEsgotada", { regiao: alvo.chave }));
    }
    /* Ferida (p. 92): metade do limite total ou mais de uma vez. */
    if (recebido >= Math.max(1, metade(limiteTotal(o).total)) && !op.semFerida) {
      eventos = eventos.concat(aplicarMazela(o, "ferida", { dano: recebido }, { tipo: "estresse" }).eventos);
    }
    /* Escudo derrubado: Manter a Guarda (p. 75). */
    o.inventario.itens.forEach(function (i) {
      var cat = C.equipamento[i.chave];
      if (i.estado !== "carregado" || !cat || cat.classe !== "escudo" || temMod(i, "amarra")) return;
      var r = i.regiao && regiao(o, i.regiao);
      if (r && esgotada(r)) { i.estado = "derrubado"; eventos.push(evento("itemDerrubado", { item: i.id, nome: i.nome, motivo: "Manter a Guarda" })); }
    });
    var fora = deveFicarForaDeAcao(o);
    if (fora) eventos.push(evento("atingiuLimite", { motivo: fora }));
    return { ok: true, valor: recebido, eventos: eventos, atingiuLimite: !!fora };
  }

  function deveFicarForaDeAcao(o) {
    if (o.foraDeAcao.ativo || o.morte) return "";
    var torso = regiao(o, "torso");
    if (esgotada(torso)) return "torso";
    var presentes = regioesPresentes(o);
    if (presentes.length && presentes.every(esgotada)) return "todas";
    return "";
  }

  /* Recuperar Estresse. opcoes:
       fonte         racao | descanso | coragem | habilidade | kit | buraco | mesa
       distribuicao  { regiao: valor } — escolha da Persona (opcional;
                     sem ela, o motor preenche do Torso para fora)
       temporaria    true (Kit de Primeiros Socorros): some no início da
                     próxima cena
       ctx           { recuperacao: multiplicador do Buraco, cena, rodada }
     Fome corta pela metade o que não for Ração; Próteses só com Kit de
     Reparos ou Ajudar os Necessitados; 10+ de uma vez dá Carne Fraca. */
  function recuperarEstresse(o, valor, opcoes) {
    var op = opcoes || {};
    var ctx = op.ctx || {};
    var eventos = [];
    var v = inteiro(valor, 0, 9999, 0);
    if (temMazela(o, "fome") && op.fonte !== "racao") v = metade(v);
    if (ctx.recuperacao && ctx.recuperacao !== 1) v = Math.floor(v * ctx.recuperacao);
    if (!v) return { ok: true, recuperado: 0, eventos: [evento("recuperacao", { valor: 0, fonte: op.fonte })] };
    var podeProtese = op.fonte === "kitDeReparos" || op.fonte === "ajudarOsNecessitados";
    var elegiveis = regioesPresentes(o).filter(function (r) { return r.estresse > 0 && (r.estado !== "protese" || podeProtese) && (r.estado === "protese" || op.fonte !== "kitDeReparos"); });
    var restante = v;
    var recuperado = 0;
    function curar(r, q) {
      var x = Math.min(q, r.estresse);
      r.estresse -= x;
      if (op.temporaria) r.curaTemporaria += x;
      recuperado += x;
      restante -= x;
      if (x) eventos.push(evento("recuperacao", { regiao: r.chave, valor: x, fonte: op.fonte, temporaria: !!op.temporaria }));
    }
    if (op.distribuicao && typeof op.distribuicao === "object") {
      Object.keys(op.distribuicao).forEach(function (k) {
        var r = elegiveis.filter(function (x) { return x.chave === k; })[0];
        if (r && restante > 0) curar(r, Math.min(restante, inteiro(op.distribuicao[k], 0, 999, 0)));
      });
    }
    /* O que sobrou da escolha: Torso primeiro, depois quem tem mais. */
    var ordem = elegiveis.slice().sort(function (a, b) { return (a.chave === "torso" ? -1 : 0) - (b.chave === "torso" ? -1 : 0) || b.estresse - a.estresse; });
    ordem.forEach(function (r) { if (restante > 0) curar(r, restante); });
    if (recuperado >= C.RECUPERACAO.carneFraca) eventos = eventos.concat(aplicarMazela(o, "carneFraca", {}, { tipo: "recuperacao" }).eventos);
    return { ok: true, recuperado: recuperado, eventos: eventos };
  }

  /* ---------------------------------------------------------------
     FORA DE AÇÃO E FARDOS (pp. 42, 45–46)
     --------------------------------------------------------------- */

  function ocorrenciasNaMissao(o) {
    var id = o.missao.id || "";
    return o.foraDeAcao.historico.filter(function (h) { return h.missao === id; }).reduce(function (s, h) { return s + (h.contaComo || 1); }, 0);
  }

  /* Entrar Fora de Ação. ANTES de chamar, a mesa confere as intervenções
     (Animar os Ânimos) — ver intervencoesAntesDeForaDeAcao. vezes: 2 no
     Buraco Mortal e no Devorar os Restos do Enxame. mata: a causa mata
     direto (Maremoto, Nó do Carrasco, De Mudança). */
  function entrarForaDeAcao(o, opcoes, rolador) {
    var op = opcoes || {};
    var eventos = [];
    if (o.morte) return { ok: false, motivo: "A Persona já morreu.", eventos: [] };
    if (o.foraDeAcao.ativo) return { ok: false, motivo: "Já está Fora de Ação.", eventos: [] };
    if (op.mata) {
      o.morte = { causa: texto(op.causa || "Morta pela habilidade da Ameaça", 200), quando: texto(op.quando, 80) };
      return { ok: true, morta: true, eventos: [evento("morte", { causa: o.morte.causa })] };
    }
    var antes = ocorrenciasNaMissao(o);
    var conta = Math.max(1, inteiro(op.vezes, 1, 3, 1));
    var depois = Math.min(3, antes + conta);
    o.foraDeAcao.historico.push({ id: novoId("fa"), vez: depois, missao: o.missao.id || "", fardo: "", quando: texto(op.quando, 80), contaComo: depois - antes });
    if (depois >= 3) {
      o.morte = { causa: "Terceira vez Fora de Ação na Missão", quando: texto(op.quando, 80) };
      return { ok: true, morta: true, vez: depois, eventos: [evento("foraDeAcao", { vez: depois }), evento("morte", { causa: o.morte.causa })] };
    }
    var regra = C.FORA_DE_ACAO[depois - 1];
    o.foraDeAcao.ativo = true;
    o.foraDeAcao.retorno = { saida: regra.saida, recupera: regra.recupera, cena: texto(op.cena, 80), rodada: inteiro(op.rodada, 0, 9999, 0) };
    eventos.push(evento("foraDeAcao", { vez: depois, saida: regra.saida }));
    regra.mazelas.forEach(function (k) { eventos = eventos.concat(aplicarMazela(o, k, {}, { tipo: "foraDeAcao" }).eventos); });
    /* O Fardo: um por ocorrência (contaComo 2 rola uma vez — a regra
       fala em "a cada vez que ficar Fora de Ação"; docs D9). */
    if (rolador) {
      var f = rolarFardo(o, rolador, op);
      eventos = eventos.concat(f.eventos);
      o.foraDeAcao.historico[o.foraDeAcao.historico.length - 1].fardo = f.chave || "";
    } else {
      o.escolhasPendentes.push({ tipo: "rolarFardo", id: novoId("pe"), texto: "Role na Tabela de Fardos." });
    }
    return { ok: true, vez: depois, eventos: eventos };
  }

  /* Volta de Fora de Ação: some No Chão e Sem Reação desta origem e
     recupera o previsto (metade do limite, ou Fôlego mín. 1). Chamada
     pelo MOMENTO certo (fimDaRodada / inicioDaCena) — nunca sozinha. */
  function retornarDeForaDeAcao(o, ctx) {
    if (!o.foraDeAcao.ativo || o.morte) return { ok: false, eventos: [] };
    var r = o.foraDeAcao.retorno || {};
    var eventos = [evento("retorno", {})];
    o.mazelas = o.mazelas.filter(function (m) { return !(m.origem && m.origem.tipo === "foraDeAcao"); });
    o.foraDeAcao.ativo = false;
    o.foraDeAcao.retorno = null;
    var lim = limiteTotal(o).total;
    var valor = r.recupera === "metadeDoLimite" ? metade(lim) : Math.max(1, calcularMutaveis(o).folego.total);
    var cura = recuperarEstresse(o, valor, { fonte: "foraDeAcao", ctx: ctx });
    return { ok: true, eventos: eventos.concat(cura.eventos) };
  }

  /* Tabela de Fardos (p. 46): sorteios válidos — repete o que não
     acumula e o que é impossível (sem braços nem pernas para perder). */
  function rolarFardo(o, rolador, op) {
    var eventos = [];
    for (var tentativa = 0; tentativa < 50; tentativa++) {
      var d = rolador(6);
      var f = C.FARDOS.filter(function (x) { return x.d6 === d; })[0];
      if (!f.acumula && temFardo(o, f.chave)) { eventos.push(evento("fardoRepetido", { chave: f.chave, d6: d })); continue; }
      if (f.chave === "guilhotina" && !C.GUILHOTINA_D4.some(function (k) { var r = regiao(o, k); return r && r.estado !== "ausente"; })) {
        eventos.push(evento("fardoImpossivel", { chave: f.chave, d6: d })); continue;
      }
      var r = aplicarFardo(o, f.chave, rolador, op);
      return { ok: true, chave: f.chave, eventos: eventos.concat([evento("fardo", { chave: f.chave, d6: d })]).concat(r.eventos) };
    }
    return { ok: false, eventos: eventos };
  }

  function aplicarFardo(o, chave, rolador, op) {
    var eventos = [];
    var param = {};
    if (chave === "guilhotina") {
      var alvo = null;
      for (var i = 0; i < 50 && !alvo; i++) {
        var k = C.GUILHOTINA_D4[rolador(4) - 1];
        var reg = regiao(o, k);
        if (reg && reg.estado !== "ausente") alvo = reg;
      }
      if (alvo) {
        param.regiao = alvo.chave;
        eventos = eventos.concat(perderRegiao(o, alvo.chave, "guilhotina").eventos);
      }
    } else if (chave === "deterioracao") {
      var atr = null;
      for (var j = 0; j < 50 && !atr; j++) { var d6 = rolador(6); if (d6 <= 5) atr = C.DETERIORACAO_D6[d6 - 1]; }
      var perda = rolador(4);
      var antes = o.atributos[atr];
      o.atributos[atr] = Math.max(0, antes - perda);
      o.maximos[atr] = 9;
      param = { atributo: atr, perda: antes - o.atributos[atr] };
      eventos.push(evento("atributo", { atributo: atr, valor: -(antes - o.atributos[atr]), maximo: 9 }));
      if (atr === "carne") eventos.push(evento("limiteMudou", {}));
    } else if (chave === "malDasPernas") {
      o.limiteAjustes.push({ id: novoId("la"), valor: -1, origem: "fardo", ref: "malDasPernas", nota: "Mal das Pernas" });
      eventos.push(evento("limiteMudou", { valor: -1 }));
    } else if (chave === "ataqueCardiaco") {
      param.teste = "esforco";
      o.escolhasPendentes.push({ tipo: "testeDeAtaqueCardiaco", id: novoId("pe"), texto: "Ataque Cardíaco: teste de Esforço — falhando, a Persona morre." });
    }
    o.fardos.push({ id: novoId("fd"), chave: chave, param: param });
    if (distribuicao(o).falta !== 0) eventos.push(evento("redistribuir", { falta: distribuicao(o).falta }));
    return { ok: true, eventos: eventos };
  }

  /* Perder uma região (Guilhotina, Apropriação Forçada, prótese
     destruída): o Estresse dela não some — vai para o registro — e o
     limite que ela tinha volta para redistribuição. O equipamento que
     ela carregava é derrubado, não apagado. */
  function perderRegiao(o, chave, motivo) {
    var r = regiao(o, chave);
    if (!r || r.estado === "ausente" || chave === "torso") return { ok: false, eventos: [] };
    var eventos = [evento("regiaoPerdida", { regiao: chave, estresse: r.estresse, limite: r.limite, motivo: motivo })];
    o.inventario.itens.forEach(function (i) {
      if (i.estado === "carregado" && i.regiao === chave && !temMod(i, "bandoleira")) {
        i.estado = "derrubado"; i.regiao = null;
        eventos.push(evento("itemDerrubado", { item: i.id, nome: i.nome, motivo: "região perdida" }));
      }
    });
    r.estado = "ausente"; r.limite = 0; r.estresse = 0; r.falhasExtremas = 0;
    if (o.escolhas.menosRegioes === "aprimorar") sincronizarAprimorar(o);
    if (!o.escolhas.menosRegioes) o.escolhasPendentes.push({ tipo: "menosRegioes", id: novoId("pe"), texto: "Escolha como jogar com menos regiões: Próteses, Aprimorar o Corpo ou Ir Além." });
    var d = distribuicao(o);
    if (d.falta !== 0) eventos.push(evento("redistribuir", { falta: d.falta }));
    return { ok: true, eventos: eventos };
  }

  /* Redistribuir o limite: a Persona escolhe; o motor só confere. */
  function definirLimites(o, mapa) {
    var copia = {};
    var erros = [];
    regioesPresentes(o).forEach(function (r) {
      var v = inteiro(mapa && mapa[r.chave] !== undefined ? mapa[r.chave] : r.limite, 0, 999, 0);
      if (v < 1) erros.push(C.regiao[r.chave].nome + " precisa de pelo menos 1.");
      if (r.estado === "protese" && v > C.MENOS_REGIOES.proteses.limiteProtese) erros.push("Uma prótese aguenta até 5.");
      copia[r.chave] = v;
    });
    var soma = Object.keys(copia).reduce(function (s, k) { return s + copia[k]; }, 0);
    var lim = limiteTotal(o).total;
    if (soma !== lim) erros.push(soma < lim ? "Faltam " + (lim - soma) + " de limite." : "Sobram " + (soma - lim) + " de limite.");
    if (erros.length) return { ok: false, erros: erros, eventos: [] };
    var eventos = [];
    regioesPresentes(o).forEach(function (r) {
      r.limite = copia[r.chave];
      /* O Estresse acumulado nunca é apagado: se o limite novo for menor
         que o Estresse, a região fica esgotada com ele. */
      if (r.estresse > r.limite) eventos.push(evento("regiaoEsgotada", { regiao: r.chave }));
    });
    o.escolhasPendentes = o.escolhasPendentes.filter(function (p) { return p.tipo !== "distribuirLimite"; });
    eventos.push(evento("limites", { mapa: copia }));
    return { ok: true, eventos: eventos };
  }

  /* ---------------------------------------------------------------
     INVENTÁRIO, EQUIPAMENTOS E MODIFICAÇÕES (pp. 66–79)
     --------------------------------------------------------------- */

  function limiteDoItem(item) {
    var cat = C.equipamento[item.chave];
    if (!cat || !cat.limiteEstresse) return 0;
    return item.fabricado && item.fabricado.metade ? Math.max(1, metade(cat.limiteEstresse)) : cat.limiteEstresse;
  }

  function pesoDoItem(item) {
    var cat = C.equipamento[item.chave];
    if (!cat) return null;
    if (cat.tipo === "consumivel") return "consumivel";
    return cat.peso;
  }

  function regioesMinimas(item) {
    var cat = C.equipamento[item.chave];
    if (!cat) return 1;
    var tipo = cat.classe === "arma" || (cat.classe === "escudo" && temMod(item, "belica")) ? "arma" : null;
    if (!tipo) return 0;
    var base = cat.classe === "escudo" ? 1 : C.REQUISITOS_POR_PESO.arma[cat.peso].regioesMinimas;
    return Math.max(1, base - (temMod(item, "contrapeso") ? 1 : 0));
  }

  function requisitosDoItem(o, item) {
    var cat = C.equipamento[item.chave];
    if (!cat || cat.tipo !== "duravel" || !cat.peso) return { ok: true };
    var grupo = cat.classe === "arma" ? "arma" : (cat.classe === "escudo" || cat.classe === "vestimenta") ? "protecao" : null;
    if (!grupo) return { ok: true };
    var req = C.REQUISITOS_POR_PESO[grupo][cat.peso].atributos;
    var a = atributosEfetivos(o);
    var falta = Object.keys(req).filter(function (k) { return a[k] < req[k]; });
    if (falta.length) return { ok: false, motivo: "pede " + falta.map(function (k) { return C.atributo[k].nome + " " + req[k]; }).join(" e ") + "." };
    return { ok: true };
  }

  function adicionarItem(o, chave, opcoes) {
    var op = opcoes || {};
    var cat = C.equipamento[chave];
    if (!cat && !op.nome) return { ok: false, motivo: "Equipamento desconhecido.", eventos: [] };
    var item = normalizarItem({ chave: cat ? chave : "", nome: op.nome || (cat && cat.nome), estado: op.estado || "guardado", regiao: op.regiao || null, qtd: op.qtd || 1, fabricado: op.fabricado || null, nota: op.nota || "", corrompido: op.corrompido === true });
    if (cat && cat.usos && item.usos !== null && item.fabricado && item.fabricado.metade) item.usos = Math.max(1, metade(item.usos));
    o.inventario.itens.push(item);
    return { ok: true, item: item, eventos: [evento("itemAdicionado", { item: item.id, nome: item.nome })] };
  }

  /* Carregar/empunhar/vestir numa região (p. 66). */
  function equipar(o, itemId, regiaoChave) {
    var item = o.inventario.itens.filter(function (i) { return i.id === itemId; })[0];
    if (!item) return { ok: false, motivo: "Equipamento não encontrado.", eventos: [] };
    if (item.estado === "destruido") return { ok: false, motivo: "Destruído.", eventos: [] };
    var cat = C.equipamento[item.chave];
    var req = requisitosDoItem(o, item);
    if (!req.ok) return { ok: false, motivo: item.nome + " " + req.motivo, eventos: [] };
    if (cat && cat.classe === "vestimenta" && itensEquipados(o).some(function (i) { return i.id !== item.id && C.equipamento[i.chave] && C.equipamento[i.chave].classe === "vestimenta"; })) {
      return { ok: false, motivo: "Só uma Vestimenta por vez.", eventos: [] };
    }
    if (!temMod(item, "bandoleira")) {
      var r = regiao(o, regiaoChave);
      if (!r || r.estado === "ausente") return { ok: false, motivo: "Escolha uma região presente.", eventos: [] };
      var ocupada = itensEquipados(o).filter(function (i) { return i.id !== item.id && i.regiao === regiaoChave && !temMod(i, "bandoleira") && !(C.equipamento[i.chave] && C.equipamento[i.chave].classe === "escudo" && temMod(i, "amarra")); })[0];
      if (ocupada && !(cat && cat.classe === "escudo" && temMod(item, "amarra"))) return { ok: false, motivo: C.regiao[regiaoChave].nome + " já carrega " + ocupada.nome + ".", eventos: [] };
      var regras = regioesMinimas(item);
      if (regras > 1 && regioesPresentes(o).filter(function (x) { return !esgotada(x); }).length < regras) return { ok: false, motivo: "Não há regiões disponíveis suficientes para empunhar (" + regras + ").", eventos: [] };
    }
    item.estado = "carregado";
    item.regiao = temMod(item, "bandoleira") ? (regiaoChave || null) : regiaoChave;
    return { ok: true, eventos: [evento("itemEquipado", { item: item.id, regiao: item.regiao })] };
  }

  function guardar(o, itemId) {
    var item = o.inventario.itens.filter(function (i) { return i.id === itemId; })[0];
    if (!item || item.estado === "destruido") return { ok: false, motivo: "Indisponível.", eventos: [] };
    var esp = espacosDeInventario(o);
    var precisa = espacosDoItem(item);
    if (item.estado !== "guardado" && esp.livres < precisa) return { ok: false, motivo: "Sem espaço no inventário (" + esp.livres + " livres, precisa de " + precisa + ").", eventos: [] };
    item.estado = "guardado"; item.regiao = null; item.prontidao = null;
    return { ok: true, eventos: [evento("itemGuardado", { item: item.id })] };
  }

  function derrubar(o, itemId, motivo) {
    var item = o.inventario.itens.filter(function (i) { return i.id === itemId; })[0];
    if (!item) return { ok: false, eventos: [] };
    item.estado = "derrubado"; item.regiao = null;
    return { ok: true, eventos: [evento("itemDerrubado", { item: item.id, nome: item.nome, motivo: motivo || "" })] };
  }

  /* Usar um consumível: tira um uso; sem usos, sai do inventário. */
  function consumir(o, itemId, quantos) {
    var item = o.inventario.itens.filter(function (i) { return i.id === itemId; })[0];
    if (!item) return { ok: false, motivo: "Equipamento não encontrado.", eventos: [] };
    var cat = C.equipamento[item.chave];
    var n = inteiro(quantos, 1, 99, 1);
    if (cat && cat.usos === null && cat.classe === "recurso") {
      if (item.qtd < n) return { ok: false, motivo: "Recursos insuficientes.", eventos: [] };
      item.qtd -= n;
      if (!item.qtd) o.inventario.itens = o.inventario.itens.filter(function (i) { return i !== item; });
      return { ok: true, eventos: [evento("consumo", { item: item.id, nome: item.nome, valor: n })] };
    }
    if (item.usos === null || item.usos === undefined) return { ok: false, motivo: item.nome + " não tem usos.", eventos: [] };
    if (item.usos < n) return { ok: false, motivo: item.nome + ": usos insuficientes.", eventos: [] };
    item.usos -= n;
    var eventos = [evento("consumo", { item: item.id, nome: item.nome, valor: n, restam: item.usos })];
    if (item.usos <= 0) {
      if (item.qtd > 1) { item.qtd -= 1; item.usos = (cat ? cat.usos : 1) + contarMod(item, "vidaLonga"); }
      else { o.inventario.itens = o.inventario.itens.filter(function (i) { return i !== item; }); eventos.push(evento("itemEsgotado", { nome: item.nome })); }
    }
    return { ok: true, eventos: eventos };
  }

  function contarRecursos(o) {
    return o.inventario.itens.filter(function (i) { return i.chave === "recurso" && i.estado !== "destruido"; }).reduce(function (s, i) { return s + (i.qtd || 1); }, 0);
  }

  /* Reparar (Kit de Reparos, Oficina): Duráveis e Próteses. */
  function repararItem(o, itemId, valor) {
    var item = o.inventario.itens.filter(function (i) { return i.id === itemId; })[0];
    if (!item || item.estado === "destruido") return { ok: false, motivo: "Não dá para reparar.", eventos: [] };
    var x = Math.min(item.estresse, inteiro(valor, 0, 999, 0));
    item.estresse -= x;
    return { ok: true, eventos: [evento("reparo", { item: item.id, nome: item.nome, valor: x })] };
  }

  /* Uma modificação cabe neste item? (p. 77–79) */
  function aceitaModificacao(item, chave) {
    var m = C.modificacao[chave];
    var cat = C.equipamento[item.chave];
    if (!m || !cat) return { ok: false, motivo: "Modificação ou equipamento desconhecido." };
    var classe = cat.classe;
    var ehArma = classe === "arma" || (classe === "escudo" && temMod(item, "belica"));
    var al = m.alvo || {};
    if (al.exceto && al.exceto.indexOf(classe) >= 0) return { ok: false, motivo: m.nome + " não serve para " + cat.nome + "." };
    if (al.tipos && al.tipos.indexOf(cat.tipo) < 0) return { ok: false, motivo: m.nome + " é só para consumíveis." };
    if (al.excetoClasses && al.excetoClasses.indexOf(classe) >= 0) return { ok: false, motivo: m.nome + " não serve para " + classe + "." };
    if (al.classes) {
      var aceita = al.classes.indexOf(classe) >= 0 || (al.classes.indexOf("arma") >= 0 && ehArma);
      if (!aceita) return { ok: false, motivo: m.nome + " não serve para " + cat.nome + "." };
    }
    if (al.pesos && al.pesos.indexOf(cat.peso) < 0) return { ok: false, motivo: m.nome + " é para equipamentos médios ou pesados." };
    if (al.disparo && !cat.disparo) return { ok: false, motivo: m.nome + " é para Armas de Disparo." };
    if (al.alcanceAte) {
      var alc = alcanceDoItem(item);
      if (alc.casa > C.alcance[al.alcanceAte].casa) return { ok: false, motivo: m.nome + " vale até Alcance Longo." };
    }
    if (!m.repetivel && temMod(item, chave)) return { ok: false, motivo: m.nome + " não se repete." };
    var limite = C.LIMITE_MODIFICACOES[pesoDoItem(item)] || 0;
    if ((item.modificacoes || []).length >= limite) return { ok: false, motivo: cat.nome + " aceita até " + limite + " modificação(ões)." };
    return { ok: true };
  }

  function aplicarModificacao(o, itemId, chave, param, opcoes) {
    var item = o.inventario.itens.filter(function (i) { return i.id === itemId; })[0];
    if (!item) return { ok: false, motivo: "Equipamento não encontrado.", eventos: [] };
    var r = aceitaModificacao(item, chave);
    if (!r.ok) return { ok: false, motivo: r.motivo, eventos: [] };
    var m = C.modificacao[chave];
    if (m.escolhe === "conhecimento" && !(param && C.conhecimento[param.conhecimento])) return { ok: false, motivo: "Escolha o Conhecimento.", eventos: [] };
    item.modificacoes.push({ id: novoId("md"), chave: chave, param: param || {}, fabricada: !!(opcoes && opcoes.fabricada) });
    if (chave === "vidaLonga" && item.usos !== null) item.usos += 1;
    return { ok: true, eventos: [evento("modificacao", { item: item.id, chave: chave })] };
  }

  /* Alcance do item com Extensão. */
  function alcanceDoItem(item) {
    var cat = C.equipamento[item.chave];
    var base = cat && cat.alcance ? String(cat.alcance).split("|") : ["adjacente"];
    if (cat && cat.classe === "escudo" && temMod(item, "belica")) base = ["adjacente"];
    var maior = base.map(function (k) { return C.alcance[k].casa; }).reduce(function (a, b) { return Math.max(a, b); }, 1);
    var casa = Math.min(5, maior + (temMod(item, "extensao") ? 1 : 0));
    return { casa: casa, chave: C.ALCANCES[casa - 1].chave, opcoes: base };
  }

  /* Fabricar (p. 88): custo, uso do Kit de Reparos e a marca na
     INSTÂNCIA (o catálogo não muda). O teste de Saber é feito antes; a
     chamada traz o resultado. */
  function custoDeFabricacao(alvo) {
    if (alvo.modificacao) return { recursos: C.FABRICACAO.modificacao.custo };
    var cat = C.equipamento[alvo.chave];
    if (!cat) return { erro: "Equipamento desconhecido." };
    if (C.FABRICACAO.consumivel.proibidos.indexOf(cat.chave) >= 0) return { erro: "Não é possível fabricar " + cat.nome + "." };
    if (cat.tipo === "consumivel") return { recursos: Math.max(1, cat.usos || 1) };
    return { recursos: C.FABRICACAO.duravel.custo[cat.peso] || 2 };
  }

  function fabricar(o, alvo, opcoes) {
    var op = opcoes || {};
    var custo = custoDeFabricacao(alvo);
    if (custo.erro) return { ok: false, motivo: custo.erro, eventos: [] };
    if (!op.sucesso) return { ok: false, motivo: "O teste de Saber falhou: nada é fabricado (os Recursos ficam).", eventos: [evento("fabricacaoFalhou", {})] };
    if (contarRecursos(o) < custo.recursos) return { ok: false, motivo: "Faltam Recursos: precisa de " + custo.recursos + ".", eventos: [] };
    var kit = op.kitId ? o.inventario.itens.filter(function (i) { return i.id === op.kitId && i.chave === "kitDeReparos"; })[0] : null;
    if (op.kitId && (!kit || !kit.usos)) return { ok: false, motivo: "O Kit de Reparos escolhido não tem uso.", eventos: [] };
    var eventos = [];
    /* Gasta os Recursos de quantas pilhas precisar. */
    var falta = custo.recursos;
    o.inventario.itens.filter(function (i) { return i.chave === "recurso"; }).forEach(function (i) {
      if (falta <= 0) return;
      var x = Math.min(falta, i.qtd);
      eventos = eventos.concat(consumir(o, i.id, x).eventos);
      falta -= x;
    });
    if (kit) eventos = eventos.concat(consumir(o, kit.id, 1).eventos);
    var metadeSem = !kit;
    if (alvo.modificacao) {
      var r = aplicarModificacao(o, alvo.itemId, alvo.modificacao, alvo.param, { fabricada: true });
      if (!r.ok) return { ok: false, motivo: r.motivo, eventos: [] };
      return { ok: true, eventos: eventos.concat(r.eventos) };
    }
    var novo = adicionarItem(o, alvo.chave, { fabricado: { metade: metadeSem } });
    return { ok: true, item: novo.item, eventos: eventos.concat(novo.eventos).concat([evento("fabricado", { nome: novo.item.nome, metade: metadeSem })]) };
  }

  /* ---------------------------------------------------------------
     DESCANSO, INTERAÇÃO, MISSÃO (pp. 47, 95, 119–120)
     --------------------------------------------------------------- */

  /* Uma Cena de Descanso. opcoes:
       perigoso  { dado: resultado do 1D6 (já com a vigília) } — 1–4 cura
                 metade e a mesa resolve o Encontro
       buraco    { descansoTotal, recuperacao }
     Fome: quem não comeu Ração desde o último Descanso recebe Fome e
     Carne Fraca (p. 92). */
  function descansar(o, opcoes) {
    var op = opcoes || {};
    var eventos = [];
    if (estadoDaPersona(o) === "morta") return { ok: false, eventos: [] };
    o.descansos++;
    var b = op.buraco || {};
    var folego = calcularMutaveis(o).folego.total;
    var valor = b.descansoTotal ? 9999 : C.RECUPERACAO.descanso.base + folego;
    if (op.perigoso && op.perigoso.encontro) valor = metade(valor);
    if (!o.efeitos.some(function (e) { return e.tipo === "comeu"; })) {
      eventos = eventos.concat(aplicarMazela(o, "fome", {}, { tipo: "descanso" }).eventos);
      eventos = eventos.concat(aplicarMazela(o, "carneFraca", {}, { tipo: "fome" }).eventos);
    }
    o.efeitos = o.efeitos.filter(function (e) { return e.tipo !== "comeu"; });
    var cura = recuperarEstresse(o, valor, { fonte: "descanso", ctx: { recuperacao: b.recuperacao } });
    eventos = eventos.concat(cura.eventos);
    if (temMazela(o, "lentidao")) eventos = eventos.concat(removerMazela(o, "lentidao", "descanso").eventos);
    /* Cópia Barata: o que foi copiado volta a poder ser copiado. */
    o.efeitos = o.efeitos.filter(function (e) { return e.tipo !== "copiaUsada"; });
    return { ok: true, eventos: eventos };
  }

  /* Comer uma Ração: 5 de Estresse (divisível) e marca a refeição. */
  function comerRacao(o, itemId, distribuicao) {
    var item = o.inventario.itens.filter(function (i) { return i.id === itemId && i.chave === "racao"; })[0];
    if (!item) return { ok: false, motivo: "Sem Ração.", eventos: [] };
    var eventos = consumir(o, item.id, 1).eventos;
    if (!o.efeitos.some(function (e) { return e.tipo === "comeu"; })) o.efeitos.push({ id: novoId("ef"), tipo: "comeu" });
    if (temMazela(o, "fome")) eventos = eventos.concat(removerMazela(o, "fome", "racao").eventos);
    return { ok: true, eventos: eventos.concat(recuperarEstresse(o, C.RECUPERACAO.racao, { fonte: "racao", distribuicao: distribuicao }).eventos) };
  }

  /* Concluir a Missão (p. 95): +metade de Carne (mín. 1) no limite, 1 +
     mortos habilidades a escolher, Fora de Ação da missão zerado — uma
     vez por missão (aplicadas). */
  function concluirMissao(o, missaoId, mortos) {
    var id = texto(missaoId, 80);
    if (!id) return { ok: false, motivo: "Missão sem identificação.", eventos: [] };
    if (o.missao.aplicadas.indexOf(id) >= 0) return { ok: false, repetida: true, motivo: "Progressão desta missão já aplicada.", eventos: [] };
    if (o.morte) return { ok: false, motivo: "A Persona morreu na missão.", eventos: [] };
    var eventos = [];
    var ganho = metadeMin1(o.atributos.carne);
    o.limiteAjustes.push({ id: novoId("la"), valor: ganho, origem: "missao", ref: id, nota: "Missão concluída" });
    eventos.push(evento("limiteMudou", { valor: ganho }));
    var n = 1 + inteiro(mortos, 0, 99, 0);
    o.escolhasPendentes.push({ tipo: "habilidades", id: novoId("pe"), quantas: n, missao: id, texto: "Escolha " + n + " Habilidade(s) Única(s) ou Geral(is)." });
    o.escolhasPendentes.push({ tipo: "distribuirLimite", id: novoId("pe"), texto: "Distribua +" + ganho + " de limite de Estresse." });
    eventos.push(evento("habilidadesAEscolher", { quantas: n }));
    o.missao.aplicadas.push(id);
    o.missao.concluidas++;
    /* A contagem de Fora de Ação é da missão: a próxima começa do zero. */
    o.missao.id = "";
    return { ok: true, eventos: eventos };
  }

  function iniciarMissao(o, missaoId) {
    o.missao.id = texto(missaoId, 80);
    return { ok: true, eventos: [evento("missao", { id: o.missao.id })] };
  }

  /* Escolher habilidade (progressão ou permissão da mesa). */
  function adquirirHabilidade(o, chave, param, origem) {
    var h = C.habilidade[chave];
    if (!h || chave === "sobrecarga") return { ok: false, motivo: "Habilidade desconhecida.", eventos: [] };
    if (h.papel && h.papel !== o.papel && origem !== "aprenderComAPratica" && origem !== "mesa") return { ok: false, motivo: h.nome + " é de " + C.papel[h.papel].nome + ".", eventos: [] };
    if (!h.repetivel && temHabilidade(o, chave) && !o.efeitos.some(function (e) { return e.tipo === "copia" && e.habilidade === chave; })) return { ok: false, motivo: "Já tem " + h.nome + ".", eventos: [] };
    var p = param || {};
    if (chave === "caoVelho" && !C.mazela[p.mazela]) return { ok: false, motivo: "Escolha a Mazela.", eventos: [] };
    if (chave === "saberEPoder" && !C.conhecimento[p.conhecimento]) return { ok: false, motivo: "Escolha o Conhecimento.", eventos: [] };
    if (chave === "saberEPoder" && o.especializacoes.some(function (s) { return s.conhecimento === p.conhecimento; })) return { ok: false, motivo: "Já é especializado nesse Conhecimento.", eventos: [] };
    if (chave === "aumentoDeAtributo") {
      var soma = 0;
      var erros = [];
      C.ATRIBUTOS.forEach(function (a) {
        var v = inteiro(p[a.chave], 0, 3, 0);
        soma += v;
        var max = o.maximos[a.chave] !== undefined ? o.maximos[a.chave] : C.CRIACAO.maximo;
        if (o.atributos[a.chave] + v > max) erros.push(a.nome + " passaria de " + max + ".");
      });
      if (soma !== 3) erros.push("Distribua exatamente 3 pontos.");
      if (erros.length) return { ok: false, motivo: erros.join(" "), eventos: [] };
    }
    var eventos = [];
    o.habilidades.push({ id: novoId("hb"), chave: chave, origem: origem || "progressao", ref: texto(p.ref, 80), param: copiar(p) });
    eventos.push(evento("habilidade", { chave: chave }));
    if (chave === "saberEPoder") o.especializacoes.push({ id: novoId("es"), conhecimento: p.conhecimento, origem: "habilidade", ref: "saberEPoder" });
    if (chave === "aumentoDeAtributo") C.ATRIBUTOS.forEach(function (a) {
      var v = inteiro(p[a.chave], 0, 3, 0);
      if (v) { o.atributos[a.chave] += v; eventos.push(evento("atributo", { atributo: a.chave, valor: v })); }
    });
    var pend = o.escolhasPendentes.filter(function (x) { return x.tipo === "habilidades"; })[0];
    if (pend && origem === "progressao") {
      pend.quantas--;
      if (pend.quantas <= 0) o.escolhasPendentes = o.escolhasPendentes.filter(function (x) { return x !== pend; });
    }
    if (distribuicao(o).falta !== 0) eventos.push(evento("redistribuir", { falta: distribuicao(o).falta }));
    return { ok: true, eventos: eventos };
  }

  /* ---------------------------------------------------------------
     MOMENTOS — o tempo de jogo andando (chamados pela mesa ou pela
     ficha avulsa quando a pessoa avança o turno/rodada/cena)
     --------------------------------------------------------------- */

  /* Fim do turno DESTA Persona. */
  function fimDoTurno(o, ctx, rolador) {
    var eventos = [];
    o.efeitos = o.efeitos.filter(function (e) {
      /* Acelerar vale até o fim do PRÓXIMO turno: o primeiro fim de
         turno só marca. */
      if (e.expira === "fimDoProximoTurno" && !e.umTurno) { e.umTurno = true; return true; }
      var sai = e.expira === "fimDoTurnoOuProximaAcao" || e.expira === "fimDoTurno" || e.expira === "fimDoProximoTurno";
      if (sai) eventos.push(evento("efeitoExpirou", { tipo: e.tipo }));
      return !sai;
    });
    if (temMazela(o, "botandoParaFora")) eventos = eventos.concat(receberEstresse(o, 1, { regiao: "torso", origem: { tipo: "mazela", ref: "botandoParaFora" }, semFerida: true }).eventos);
    var sf = mazelaDe(o, "semFolego");
    if (sf) {
      sf.param.turnos = inteiro(sf.param.turnos, 0, 99, 0) + 1;
      if (sf.param.turnos >= inteiro(sf.param.maximo, 1, 99, 1)) {
        o.mazelas = o.mazelas.filter(function (m) { return m !== sf; });
        eventos.push(evento("mazelaRemovida", { chave: "semFolego", meio: "tempo" }));
        eventos.push(evento("atingiuLimite", { motivo: "semFolego" }));
      }
    }
    var sr = mazelaDe(o, "semReacao");
    if (sr && !(sr.origem && sr.origem.tipo === "foraDeAcao")) {
      sr.param.turnos = inteiro(sr.param.turnos, 0, 9, 0) + 1;
      if (sr.param.turnos >= 2) { o.mazelas = o.mazelas.filter(function (m) { return m !== sr; }); eventos.push(evento("mazelaRemovida", { chave: "semReacao", meio: "doisTurnos" })); }
      else eventos.push(evento("podeTestar", { mazela: "semReacao", conhecimento: "rastro" }));
    }
    return { ok: true, eventos: eventos };
  }

  /* Fim da rodada: Ferida, Pegando Fogo, Pavor; a volta da 1ª vez Fora
     de Ação; efeitos de rodada. */
  function fimDaRodada(o, ctx, rolador) {
    var eventos = [];
    var c = ctx || {};
    var fe = mazelaDe(o, "ferida");
    if (fe && !o.morte) eventos = eventos.concat(receberEstresse(o, inteiro(fe.param.dano, 0, 999, 0), { regiao: "torso", origem: { tipo: "mazela", ref: "ferida" }, semFerida: true }).eventos);
    var fogo = mazelaDe(o, "pegandoFogo");
    if (fogo && !o.morte) {
      var dano = inteiro(fogo.param.proximo, 0, 999, 0);
      if (dano > 0) {
        eventos = eventos.concat(receberEstresse(o, dano, { regiao: "torso", origem: { tipo: "mazela", ref: "pegandoFogo" }, semFerida: true }).eventos);
        fogo.param.sofrido = inteiro(fogo.param.sofrido, 0, 999, 0) + dano;
        fogo.param.proximo = dano - 1;
        if (fogo.param.sofrido > 5 && !temMazela(o, "ferida")) eventos = eventos.concat(aplicarMazela(o, "ferida", { dano: dano }, { tipo: "pegandoFogo" }).eventos);
      }
      if (inteiro(fogo.param.proximo, 0, 999, 0) <= 0) {
        o.mazelas = o.mazelas.filter(function (m) { return m !== fogo; });
        eventos.push(evento("mazelaRemovida", { chave: "pegandoFogo", meio: "danoZerado" }));
      }
    }
    if (temMazela(o, "pavor") && !o.morte) {
      if (o.coragem > 0) { o.coragem -= 1; eventos.push(evento("coragem", { valor: -1, motivo: "Pavor" })); }
      else if (atributosEfetivos(o).determinacao > 0) { o.perdas.determinacao++; eventos.push(evento("atributo", { atributo: "determinacao", valor: -1, motivo: "Pavor" })); }
      else eventos.push(evento("testeObrigatorio", { conhecimento: "esforco", falha: "foraDeAcao", motivo: "Pavor sem Coragem nem Determinação" }));
    }
    if (o.foraDeAcao.ativo && o.foraDeAcao.retorno && o.foraDeAcao.retorno.saida === "fimDaProximaRodada") {
      var r = o.foraDeAcao.retorno;
      if (!r.rodadaDeSaida) r.rodadaDeSaida = inteiro(r.rodada, 0, 9999, 0) + 1;
      if (inteiro(c.rodada, 0, 9999, 0) >= r.rodadaDeSaida || c.forcarRetorno) eventos = eventos.concat(retornarDeForaDeAcao(o, c).eventos);
    }
    o.efeitos = o.efeitos.filter(function (e) {
      if (e.expira !== "rodadas") return true;
      e.restam = inteiro(e.restam, 0, 99, 0) - 1;
      if (e.restam <= 0) { eventos.push(evento("efeitoExpirou", { tipo: e.tipo })); return false; }
      return true;
    });
    if (deveFicarForaDeAcao(o)) eventos.push(evento("atingiuLimite", { motivo: "mazela" }));
    return { ok: true, eventos: eventos };
  }

  /* Uma cena nova: cura temporária do Kit acaba, a volta da 2ª vez Fora
     de Ação acontece, contadores de cena zeram (pela marca). */
  function inicioDaCena(o, ctx) {
    var eventos = [];
    regioesPresentes(o).forEach(function (r) {
      if (r.curaTemporaria > 0) {
        var volta = r.curaTemporaria;
        r.curaTemporaria = 0;
        eventos = eventos.concat(receberEstresse(o, volta, { regiao: r.chave, origem: { tipo: "curaTemporaria" }, semFerida: true }).eventos);
      }
    });
    if (o.foraDeAcao.ativo && o.foraDeAcao.retorno) eventos = eventos.concat(retornarDeForaDeAcao(o, ctx).eventos);
    o.efeitos = o.efeitos.filter(function (e) {
      var sai = e.expira === "fimDaCena" || e.tipo === "copia" || e.tipo === "analisado" || e.tipo === "acelerar";
      if (sai) eventos.push(evento("efeitoExpirou", { tipo: e.tipo }));
      return !sai;
    });
    o.mazelas = o.mazelas.filter(function (m) {
      if (m.param && m.param.ate === "fimDaCena") { eventos.push(evento("mazelaRemovida", { chave: m.chave, meio: "fimDaCena" })); return false; }
      return true;
    });
    o.reservas.abrirFeridas = 0;
    return { ok: true, eventos: eventos };
  }

  /* ---------------------------------------------------------------
     OPERAÇÕES COM IDENTIFICAÇÃO — contra clique repetido e reenvio
     --------------------------------------------------------------- */

  /* Aplica `fn(o)` uma vez por opId. Uma segunda chegada do mesmo id é
     reconhecida e não muda nada (devolve repetida: true). */
  function aplicarOperacao(o, opId, fn) {
    var id = texto(opId, 120);
    if (!id) return { ok: false, motivo: "Operação sem identificação.", eventos: [] };
    if (o.operacoes.indexOf(id) >= 0) return { ok: true, repetida: true, eventos: [] };
    var r = fn(o) || { ok: true, eventos: [] };
    if (r.ok !== false) {
      o.operacoes.push(id);
      if (o.operacoes.length > LIMITE_OPERACOES) o.operacoes = o.operacoes.slice(-LIMITE_OPERACOES);
    }
    return r;
  }

  /* Um resumo pequeno para a mesa (vai junto da gravação, como o
     resumoRecursos de Ordem): sem expor nada privado. */
  function resumoParaMesa(o) {
    var c = calcular(o);
    return {
      v: 1, papel: o.papel,
      estresse: c.estresseTotal, limite: c.limite.total,
      regioes: c.regioes.map(function (r) { return { chave: r.chave, estado: r.estado, estresse: r.estresse, limite: r.limite }; }),
      coragem: o.coragem, protecao: c.mutaveis.protecao.total, velocidade: c.mutaveis.velocidade.total, dano: c.mutaveis.dano.total,
      folego: c.mutaveis.folego.total,
      mazelas: o.mazelas.map(function (m) { return m.chave; }),
      estado: c.estado, foraDeAcao: c.foraDeAcaoNaMissao,
    };
  }

  global.RAMAOblivio = {
    VERSAO_BLOCO: VERSAO_BLOCO, AJUSTES_PADRAO: AJUSTES_PADRAO,
    ajustesDe: ajustesDe, fichaVazia: fichaVazia, normalizar: normalizar, normalizarItem: normalizarItem,
    inteiro: inteiro, metade: metade, metadeMin1: metadeMin1, novoId: novoId, evento: evento, copiar: copiar,
    analisarDados: analisarDados, rolarExpressao: rolarExpressao, maximoDaExpressao: maximoDaExpressao,
    temHabilidade: temHabilidade, temMazela: temMazela, mazelaDe: mazelaDe, temFardo: temFardo, imune: imune,
    regiao: regiao, regioesPresentes: regioesPresentes, esgotada: esgotada, temMod: temMod, contarMod: contarMod,
    atributosEfetivos: atributosEfetivos, limiteTotal: limiteTotal, protecaoCompleta: protecaoCompleta,
    calcularMutaveis: calcularMutaveis, espacosDeInventario: espacosDeInventario, espacosDoItem: espacosDoItem,
    distribuicao: distribuicao, especializacoesEsperadas: especializacoesEsperadas, bonusDeEspecializacao: bonusDeEspecializacao,
    pendencias: pendencias, estadoDaPersona: estadoDaPersona, calcular: calcular,
    validarCriacao: validarCriacao, sugerirDistribuicao: sugerirDistribuicao, concluirCriacao: concluirCriacao, sincronizarAprimorar: sincronizarAprimorar,
    marcaDoEscopo: marcaDoEscopo, usosFeitos: usosFeitos, podeUsar: podeUsar, registrarUso: registrarUso,
    ganharCoragem: ganharCoragem, perderCoragem: perderCoragem, gastarCoragem: gastarCoragem,
    aplicarMazela: aplicarMazela, removerMazela: removerMazela,
    receberEstresse: receberEstresse, recuperarEstresse: recuperarEstresse, deveFicarForaDeAcao: deveFicarForaDeAcao,
    ocorrenciasNaMissao: ocorrenciasNaMissao, entrarForaDeAcao: entrarForaDeAcao, retornarDeForaDeAcao: retornarDeForaDeAcao,
    rolarFardo: rolarFardo, aplicarFardo: aplicarFardo, perderRegiao: perderRegiao, definirLimites: definirLimites,
    limiteDoItem: limiteDoItem, pesoDoItem: pesoDoItem, regioesMinimas: regioesMinimas, requisitosDoItem: requisitosDoItem,
    adicionarItem: adicionarItem, equipar: equipar, guardar: guardar, derrubar: derrubar, consumir: consumir, contarRecursos: contarRecursos,
    repararItem: repararItem, aceitaModificacao: aceitaModificacao, aplicarModificacao: aplicarModificacao, alcanceDoItem: alcanceDoItem,
    custoDeFabricacao: custoDeFabricacao, fabricar: fabricar, itensEquipados: itensEquipados,
    descansar: descansar, comerRacao: comerRacao, concluirMissao: concluirMissao, iniciarMissao: iniciarMissao, adquirirHabilidade: adquirirHabilidade,
    fimDoTurno: fimDoTurno, fimDaRodada: fimDaRodada, inicioDaCena: inicioDaCena,
    aplicarOperacao: aplicarOperacao, resumoParaMesa: resumoParaMesa,
  };
})(typeof window !== "undefined" ? window : globalThis);
/* <<< js/oblivio/regras.js */

/* >>> js/oblivio/combate.js */
/* =====================================================================
   R.A.M.A. — Oblívio · testes, ataques, Proteção e dano
   =====================================================================
   O fluxo de um teste ou ataque tem FASES, e só a última muda saldos:

     1. preparar   — o que foi declarado: regiões (cada dado já preso a
                     uma região ANTES de rolar), arma, dificuldade,
                     modificadores conhecidos. Recusa o que a regra não
                     permite (região esgotada, região repetida sem
                     Sobrecarga, mais de 5 dados…).
     2. rolar      — os dados, cada um com a sua região.
     3. escolhas   — enquanto alguma escolha ainda pode mudar o resultado
                     (Comprar Sucesso, Aumentar Extremo, Dar uma Mãozinha,
                     Empunhadura, Corte Relâmpago), a resolução fica
                     PENDENTE. Nada foi aplicado ainda.
     4. concluir   — aplica de uma vez: Coragem gasta, Estresse das
                     falhas nas regiões dos dados, sucessos contados
                     (Extremo vale 2). Uma vez por ataque (`concluido`).

   A comparação com a Proteção é UMA função (aplicarSucessos), usada pela
   ficha, pela mesa e pelas Ameaças: acerta quando o total de sucessos
   acumulados contra o alvo é IGUAL OU MAIOR que a Proteção (C1).

   Interpretações: docs/OBLIVIO.md (C1–C9, D1–D9).
   ===================================================================== */

(function (global) {
  "use strict";

  var C = global.RAMAOblivioCatalogo;
  var R = global.RAMAOblivio;

  var ORDEM_RESULTADO = ["falhaExtrema", "falhaRegular", "sucessoRegular", "sucessoExtremo"];
  var ORDEM_DIFICULDADE = ["reduzida", "normal", "aumentada"];

  /* ---------------------------------------------------------------
     ZONA DE ACERTO
     --------------------------------------------------------------- */

  /* Combina mudanças de dificuldade: cada redução e cada aumento andam
     um passo, presos às três dificuldades do livro. */
  function combinarDificuldade(base, passos) {
    var i = ORDEM_DIFICULDADE.indexOf(base);
    if (i < 0) i = 1;
    (passos || []).forEach(function (p) { i += p; });
    return ORDEM_DIFICULDADE[Math.max(0, Math.min(2, i))];
  }

  /* O mínimo do Sucesso Extremo: 20, menos o que a Coragem reduziu —
     nunca abaixo do mínimo do Sucesso Regular daquela dificuldade (C7). */
  function minimoDoExtremo(dificuldade, reducao) {
    var reg = C.ZONA_D20[dificuldade].sucessoRegular;
    return Math.max(reg, C.ZONA_D20.sucessoExtremo - (reducao || 0));
  }

  /* D20: compara o TOTAL (dado + bônus) com a tabela (p. 48). Total 1 ou
     menos é Falha Extrema; do mínimo do Extremo para cima, Extremo (C6). */
  function classificarD20(total, dificuldade, reducaoExtremo) {
    if (total <= C.ZONA_D20.falhaExtrema) return "falhaExtrema";
    if (total >= minimoDoExtremo(dificuldade, reducaoExtremo)) return "sucessoExtremo";
    if (total >= C.ZONA_D20[dificuldade].sucessoRegular) return "sucessoRegular";
    return "falhaRegular";
  }

  /* As tabelas da ficha (alternativas, D5): só o resultado bruto. */
  function classificarFicha(zona, bruto, dificuldade) {
    var z = C.ZONAS_DA_FICHA[zona][dificuldade];
    var achado = "falhaRegular";
    Object.keys(z).forEach(function (k) { if (bruto >= z[k][0] && bruto <= z[k][1]) achado = k; });
    return achado;
  }

  function rolarZona(zona, rolador) {
    if (zona === "2d6") { var a = rolador(6), b = rolador(6); return { faces: [a, b], bruto: a + b }; }
    if (zona === "d6") { var c = rolador(6); return { faces: [c], bruto: c }; }
    var d = rolador(20);
    return { faces: [d], bruto: d };
  }

  function sucessosDe(resultado) {
    return resultado === "sucessoExtremo" ? 2 : resultado === "sucessoRegular" ? 1 : 0;
  }

  /* ---------------------------------------------------------------
     TESTE DE CONHECIMENTO (p. 48)
     --------------------------------------------------------------- */

  /* opcoes:
       dificuldade   reduzida | normal | aumentada (o pedido da Testemunha)
       ajudas        quantas Personas usam Ajudar (+1 cada)
       bonus         [{ fonte, valor }] — Repertório, Ajudar, etc.
       reduzir       [fonte] — Utensílio, Plano de Contingência…
       aumentar      [fonte] — Bomba de Fumaça, Distrair…
       susto         true: Emocional para evitar susto (Covardia)
       recuperarSemReacao  true: o Rastro que tira Sem Reação
       zona          d20 | d6 | 2d6 (ajuste da mesa)
     Devolve a montagem — ainda sem rolar. */
  function montarTeste(o, conhecimento, opcoes) {
    var op = opcoes || {};
    var con = C.conhecimento[conhecimento];
    if (!con) return { ok: false, motivo: "Conhecimento desconhecido." };
    if (R.estadoDaPersona(o) !== "ativa") return { ok: false, motivo: "A Persona não pode agir agora." };
    var passos = [];
    var motivos = [];
    (op.reduzir || []).forEach(function (f) { passos.push(-1); motivos.push({ fonte: f, efeito: "reduz" }); });
    (op.aumentar || []).forEach(function (f) { passos.push(+1); motivos.push({ fonte: f, efeito: "aumenta" }); });
    R.itensEquipados(o).forEach(function (i) {
      (i.modificacoes || []).forEach(function (m) {
        if (m.chave === "versatil" && m.param && m.param.conhecimento === conhecimento) { passos.push(-1); motivos.push({ fonte: i.nome + " (Versátil)", efeito: "reduz" }); }
      });
    });
    if (R.temMazela(o, "lentidao") && (conhecimento === "bandidagem" || conhecimento === "reflexos")) { passos.push(+1); motivos.push({ fonte: "Lentidão", efeito: "aumenta" }); }
    if (op.susto && conhecimento === "emocional" && R.temFardo(o, "covardia")) { passos.push(+1); motivos.push({ fonte: "Covardia", efeito: "aumenta" }); }
    var dificuldade = combinarDificuldade(op.dificuldade || "normal", passos);
    var bonus = [];
    var esp = R.bonusDeEspecializacao(o, conhecimento);
    if (esp) bonus.push({ fonte: "Especialização", valor: esp });
    if (op.ajudas) bonus.push({ fonte: "Ajudar (" + op.ajudas + ")", valor: R.inteiro(op.ajudas, 0, 20, 0) });
    (op.bonus || []).forEach(function (b) { bonus.push({ fonte: b.fonte, valor: R.inteiro(b.valor, -99, 99, 0) }); });
    /* Pavor: os bônus SUBTRAEM (p. 93). */
    var pavor = R.temMazela(o, "pavor");
    if (pavor) bonus = bonus.map(function (b) { return { fonte: b.fonte + " (Pavor: subtrai)", valor: -Math.abs(b.valor) }; });
    var reducao = (o.efeitos.filter(function (e) { return e.tipo === "reduzirExtremo"; })[0] || {}).valor || 0;
    var autoFalha = R.temMazela(o, "semReacao") && !(conhecimento === "rastro" && op.recuperarSemReacao);
    return {
      ok: true, conhecimento: conhecimento, dificuldade: dificuldade, dificuldadePedida: op.dificuldade || "normal",
      motivos: motivos, bonus: bonus, reducaoExtremo: reducao, zona: op.zona || (o.ajustes && o.ajustes.zona) || "d20",
      autoFalha: autoFalha, pavor: pavor,
    };
  }

  /* Rola uma montagem; consome o Reduzir Extremo preparado (uma vez). */
  function rolarTeste(o, montagem, rolador) {
    if (!montagem || !montagem.ok) return { ok: false, motivo: montagem ? montagem.motivo : "Sem montagem." };
    var z = rolarZona(montagem.zona, rolador);
    var somaBonus = montagem.zona === "d20" ? montagem.bonus.reduce(function (s, b) { return s + b.valor; }, 0) : 0;
    var total = z.bruto + somaBonus;
    var resultado;
    if (montagem.autoFalha) resultado = "falhaRegular";
    else if (montagem.zona === "d20") resultado = classificarD20(total, montagem.dificuldade, montagem.reducaoExtremo);
    else resultado = classificarFicha(montagem.zona, z.bruto, montagem.dificuldade);
    if (montagem.reducaoExtremo) o.efeitos = o.efeitos.filter(function (e) { return e.tipo !== "reduzirExtremo"; });
    return {
      ok: true, faces: z.faces, bruto: z.bruto, bonus: montagem.bonus, somaBonus: somaBonus, total: total,
      dificuldade: montagem.dificuldade, resultado: resultado, nome: C.RESULTADOS[resultado].nome,
      sucesso: C.RESULTADOS[resultado].sucesso, autoFalha: montagem.autoFalha, zona: montagem.zona,
      minimoExtremo: minimoDoExtremo(montagem.dificuldade, montagem.reducaoExtremo),
      conhecimento: montagem.conhecimento,
    };
  }

  /* Um teste simples (Ameaça, teste sem ficha): bônus e dificuldade. */
  function testeSimples(bonus, dificuldade, rolador, zona) {
    var z = rolarZona(zona || "d20", rolador);
    var total = z.bruto + (zona && zona !== "d20" ? 0 : (bonus || 0));
    var resultado = zona && zona !== "d20" ? classificarFicha(zona, z.bruto, dificuldade || "normal") : classificarD20(total, dificuldade || "normal", 0);
    return { faces: z.faces, bruto: z.bruto, total: total, resultado: resultado, nome: C.RESULTADOS[resultado].nome, sucesso: C.RESULTADOS[resultado].sucesso };
  }

  /* Disputa (p. 49): sucesso vence falha; Extremo vence Regular; Falha
     Regular vence Extrema; mesma categoria, maior total. Empate fica
     para a Testemunha decidir ou mandar rolar de novo. */
  function compararDisputa(a, b) {
    var ia = ORDEM_RESULTADO.indexOf(a.resultado), ib = ORDEM_RESULTADO.indexOf(b.resultado);
    if (ia !== ib) return ia > ib ? "a" : "b";
    if (a.total !== b.total) return a.total > b.total ? "a" : "b";
    return "empate";
  }

  /* Dar uma Mãozinha (p. 61): numa falha, 1D6 — 4 a 6 vira sucesso;
     1 a 3 continua falha e Quem Resolve sofre o grau da falha. */
  function darUmaMaozinha(resultadoFalho, rolador) {
    var d = rolador(6);
    if (d >= 4) return { d6: d, virou: "sucessoRegular", estresseEmQuemResolve: 0 };
    return { d6: d, virou: resultadoFalho, estresseEmQuemResolve: C.RESULTADOS[resultadoFalho].grau };
  }

  /* Confusão (p. 91): 1D6 antes de agir sem ajuda; 1–3 a ação sai ao
     contrário. */
  function confusao(o, rolador, comAjuda) {
    if (!R.temMazela(o, "confusao") || comAjuda) return { aplica: false };
    var d = rolador(6);
    return { aplica: true, d6: d, funciona: d >= 4 };
  }

  /* ---------------------------------------------------------------
     ATAQUE DA PERSONA (pp. 50–51, 89)
     --------------------------------------------------------------- */

  /* declaracao:
       regioes     ["bracoD", "torso", …] — um dado por entrada, a
                   região fixada antes de rolar. Repetir só com
                   Sobrecarga (Ir Além). 1 a 5.
       arma        id do item empunhado (vazio: desarmado)
       alvo        { id, noChao, juraDeMortePorEsta, dificuldadeContra:
                     "aumentada"|…, bonusCombateContra, alcance (casa),
                     fragilidade, mirouAntes }
       mirar       { regiao, capacidade } — Mirar (Ação Completa)
       dificuldade a pedida pela Testemunha
       bonus       [{ fonte, valor, aplicacao: "cadaDado"|"umDado" }]
       semRegioes  true: alvo com Proteção zerada (só Ação Regular) */
  function prepararAtaque(o, declaracao) {
    var d = declaracao || {};
    var erros = [];
    if (R.estadoDaPersona(o) !== "ativa") return { ok: false, erros: ["A Persona não pode agir agora."] };
    var item = d.arma ? o.inventario.itens.filter(function (i) { return i.id === d.arma; })[0] : null;
    if (d.arma && (!item || item.estado !== "carregado")) erros.push("A arma precisa estar empunhada.");
    var cat = item ? C.equipamento[item.chave] : null;
    if (item && cat && cat.classe !== "arma" && !(cat.classe === "escudo" && R.temMod(item, "belica"))) erros.push(item.nome + " não é arma.");
    if (item && cat && cat.recargaApos && item.ataques >= cat.recargaApos) erros.push(item.nome + " precisa ser recarregada.");
    if (item && cat && cat.especial === "arremesso" && item.estado === "arremessado") erros.push(item.nome + " foi arremessada.");
    var alcance = item ? R.alcanceDoItem(item) : { casa: 1, chave: "adjacente", opcoes: ["adjacente"] };
    if (d.alvo && d.alvo.alcance && d.alvo.alcance > alcance.casa) erros.push("Fora do alcance (" + C.ALCANCES[Math.min(4, d.alvo.alcance - 1)].nome + "; a arma vai até " + C.ALCANCES[alcance.casa - 1].nome + ").");
    if (d.semRegioes) {
      return erros.length ? { ok: false, erros: erros } : { ok: true, semRegioes: true, arma: item ? item.id : "", armaValida: !!item, dados: [], alcance: alcance };
    }
    var regs = Array.isArray(d.regioes) ? d.regioes.slice() : [];
    if (!regs.length) erros.push("Arrisque pelo menos uma região.");
    if (regs.length > C.MAXIMO_DADOS_ATAQUE) erros.push("No máximo 5 rolagens por ataque.");
    var sobrecarga = R.temHabilidade(o, "sobrecarga");
    var vistas = {};
    regs.forEach(function (k) {
      var r = R.regiao(o, k);
      if (!r || r.estado === "ausente") erros.push("Região inexistente: " + k + ".");
      else if (R.esgotada(r)) erros.push(C.regiao[k].nome + " está esgotada e não pode ser arriscada.");
      if (vistas[k] && !sobrecarga) erros.push(C.regiao[k].nome + " repetida: só com Sobrecarga (Ir Além).");
      vistas[k] = true;
    });
    var distintas = Object.keys(vistas).length;
    /* Dano da arma: a região que a empunha no ataque e o mínimo de
       regiões DISTINTAS arriscadas (C5). Sem isso, só o atributo. */
    var armaValida = false, motivoSemArma = "";
    if (item) {
      var minimo = R.regioesMinimas(item);
      if (!R.temMod(item, "bandoleira") && item.regiao && !vistas[item.regiao]) motivoSemArma = "a região que empunha " + item.nome + " não foi arriscada";
      else if (distintas < minimo) motivoSemArma = item.nome + " pede " + minimo + " regiões arriscadas";
      else armaValida = true;
      var req = R.requisitosDoItem(o, item);
      if (!req.ok) { armaValida = false; motivoSemArma = item.nome + " " + req.motivo; }
    }
    var alvo = d.alvo || {};
    var passos = [];
    if (alvo.dificuldadeContra === "aumentada") passos.push(+1);
    if (alvo.dificuldadeContra === "reduzida" || alvo.juraDeMorte) passos.push(-1);
    (d.reduzir || []).forEach(function () { passos.push(-1); });
    (d.aumentar || []).forEach(function () { passos.push(+1); });
    var dificuldade = combinarDificuldade(d.dificuldade || "normal", passos);
    var rolarDuasPior = R.temMazela(o, "noChao") || R.temMazela(o, "noEscuro");
    var rolarDuasMelhor = !!alvo.noChao;
    var bonus = (d.bonus || []).map(function (b) { return { fonte: b.fonte, valor: R.inteiro(b.valor, -99, 99, 0), aplicacao: b.aplicacao === "umDado" ? "umDado" : "cadaDado" }; });
    if (alvo.bonusCombateContra) bonus.push({ fonte: "Contra o alvo", valor: R.inteiro(alvo.bonusCombateContra, -99, 99, 0), aplicacao: "cadaDado" });
    if (R.temMazela(o, "pavor")) bonus = bonus.map(function (b) { return Object.assign({}, b, { valor: -Math.abs(b.valor) }); });
    if (erros.length) return { ok: false, erros: erros };
    return {
      ok: true, id: R.novoId("at"), regioes: regs, arma: item ? item.id : "", armaValida: armaValida, motivoSemArma: motivoSemArma,
      dificuldade: dificuldade, rolarDuasPior: rolarDuasPior, rolarDuasMelhor: rolarDuasMelhor,
      empunhadura: !!(item && R.temMod(item, "empunhadura")), bonus: bonus, alcance: alcance,
      mirar: d.mirar && d.mirar.regiao ? { regiao: d.mirar.regiao, capacidade: R.inteiro(d.mirar.capacidade, 0, 999, 0) } : null,
      reducaoExtremo: (o.efeitos.filter(function (e) { return e.tipo === "reduzirExtremo"; })[0] || {}).valor || 0,
      alvo: { id: alvo.id || "" },
    };
  }

  /* Um dado de combate: rola (duas vezes se a mazela mandar), soma os
     bônus "cadaDado" e classifica. */
  function rolarDado(prep, regiaoChave, rolador, extra) {
    var faces = [rolador(20)];
    var usado = faces[0];
    if (prep.rolarDuasPior && prep.rolarDuasMelhor) { /* se anulam */ }
    else if (prep.rolarDuasPior) { faces.push(rolador(20)); usado = Math.min(faces[0], faces[1]); }
    else if (prep.rolarDuasMelhor) { faces.push(rolador(20)); usado = Math.max(faces[0], faces[1]); }
    var soma = prep.bonus.filter(function (b) { return b.aplicacao === "cadaDado"; }).reduce(function (s, b) { return s + b.valor; }, 0);
    var total = usado + soma;
    var resultado = classificarD20(total, prep.dificuldade, prep.reducaoExtremo);
    return Object.assign({ id: R.novoId("dd"), regiao: regiaoChave, faces: faces, usado: usado, bonus: soma, total: total, resultado: resultado, original: resultado, sucessos: sucessosDe(resultado) }, extra || {});
  }

  function rolarAtaque(o, prep, rolador) {
    if (!prep || !prep.ok) return { ok: false, motivo: "Ataque não preparado." };
    var ataque = { id: prep.id, fase: "escolhas", prep: prep, dados: [], escolhas: [], custoCoragem: 0, concluido: false };
    if (prep.semRegioes) { ataque.fase = "resolvido"; ataque.semRegioes = true; return { ok: true, ataque: ataque }; }
    prep.regioes.forEach(function (k) { ataque.dados.push(rolarDado(prep, k, rolador)); });
    /* O bônus "umDado" vai no dado em que faz diferença, se houver. */
    var umDado = prep.bonus.filter(function (b) { return b.aplicacao === "umDado"; });
    umDado.forEach(function (b) {
      var melhor = null;
      ataque.dados.forEach(function (dd) {
        var novo = classificarD20(dd.total + b.valor, prep.dificuldade, prep.reducaoExtremo);
        if (sucessosDe(novo) > sucessosDe(dd.resultado) && (!melhor || dd.total > melhor.total)) melhor = dd;
      });
      var alvo = melhor || ataque.dados[0];
      if (!alvo) return;
      alvo.total += b.valor; alvo.bonus += b.valor;
      alvo.resultado = classificarD20(alvo.total, prep.dificuldade, prep.reducaoExtremo);
      alvo.original = alvo.resultado;
      alvo.sucessos = sucessosDe(alvo.resultado);
      alvo.bonusUmDado = b.fonte;
    });
    if (prep.reducaoExtremo) o.efeitos = o.efeitos.filter(function (e) { return e.tipo !== "reduzirExtremo"; });
    return { ok: true, ataque: ataque, opcoes: opcoesDoAtaque(o, ataque) };
  }

  /* O que ainda pode mudar o resultado, para a tela oferecer. */
  function opcoesDoAtaque(o, ataque, grupo) {
    var op = [];
    if (ataque.fase !== "escolhas") return op;
    var coragemLivre = o.coragem - ataque.custoCoragem;
    ataque.dados.forEach(function (dd) {
      if (dd.comprado || dd.maozinha) return;
      if (dd.resultado === "falhaRegular" && coragemLivre >= 1) op.push({ tipo: "comprarSucesso", dado: dd.id, custo: 1 });
      if (dd.resultado === "falhaExtrema" && coragemLivre >= 2) op.push({ tipo: "comprarSucesso", dado: dd.id, custo: 2 });
      if (dd.resultado === "sucessoExtremo" && !dd.aumentado && coragemLivre >= 1) op.push({ tipo: "aumentarExtremo", dado: dd.id, custo: 1 });
      if (!C.RESULTADOS[dd.resultado].sucesso && (grupo || []).some(function (g) { return g.darUmaMaozinha; })) op.push({ tipo: "darUmaMaozinha", dado: dd.id });
    });
    if (ataque.prep.empunhadura && !ataque.empunhaduraUsada && ataque.dados.length) op.push({ tipo: "empunhadura" });
    var item = ataque.prep.arma ? o.inventario.itens.filter(function (i) { return i.id === ataque.prep.arma; })[0] : null;
    if (item && item.chave === "laminaCurta" && item.regiao) {
      var ultimo = ataque.dados.filter(function (dd) { return dd.regiao === item.regiao; }).pop();
      var reg = R.regiao(o, item.regiao);
      if (ultimo && C.RESULTADOS[ultimo.resultado].sucesso && !ataque.corteEncerrado && reg && !R.esgotada(reg)) op.push({ tipo: "corteRelampago", regiao: item.regiao });
    }
    return op;
  }

  /* Aplica UMA escolha enquanto o ataque está pendente. */
  function escolherNoAtaque(o, ataque, escolha, rolador) {
    if (!ataque || ataque.fase !== "escolhas") return { ok: false, motivo: "O ataque já foi resolvido." };
    var e = escolha || {};
    var dd = e.dado ? ataque.dados.filter(function (x) { return x.id === e.dado; })[0] : null;
    if (e.tipo === "comprarSucesso") {
      if (!dd || C.RESULTADOS[dd.resultado].sucesso) return { ok: false, motivo: "Só se compra sucesso de uma falha." };
      var custo = dd.resultado === "falhaExtrema" ? 2 : 1;
      if (o.coragem - ataque.custoCoragem < custo) return { ok: false, motivo: "Coragem insuficiente." };
      ataque.custoCoragem += custo;
      dd.comprado = custo; dd.resultado = "sucessoRegular"; dd.sucessos = 1;
      ataque.escolhas.push({ tipo: "comprarSucesso", dado: dd.id, custo: custo });
      return { ok: true };
    }
    if (e.tipo === "aumentarExtremo") {
      if (!dd || dd.resultado !== "sucessoExtremo" || dd.aumentado) return { ok: false, motivo: "Só depois de um Sucesso Extremo, uma vez por dado." };
      if (o.coragem - ataque.custoCoragem < 1) return { ok: false, motivo: "Coragem insuficiente." };
      ataque.custoCoragem += 1; dd.aumentado = true; dd.sucessos += 1;
      ataque.escolhas.push({ tipo: "aumentarExtremo", dado: dd.id, custo: 1 });
      return { ok: true };
    }
    if (e.tipo === "darUmaMaozinha") {
      if (!dd || C.RESULTADOS[dd.resultado].sucesso || dd.maozinha) return { ok: false, motivo: "Só numa falha, uma vez." };
      var m = darUmaMaozinha(dd.resultado, rolador);
      dd.maozinha = m;
      if (m.virou === "sucessoRegular") { dd.resultado = "sucessoRegular"; dd.sucessos = 1; }
      ataque.escolhas.push({ tipo: "darUmaMaozinha", dado: dd.id, d6: m.d6, quem: e.quem || "", estresse: m.estresseEmQuemResolve });
      return { ok: true, maozinha: m };
    }
    if (e.tipo === "empunhadura") {
      if (!ataque.prep.empunhadura || ataque.empunhaduraUsada) return { ok: false, motivo: "Empunhadura já usada neste teste." };
      var alvo = dd || ataque.dados.slice().sort(function (a, b) { return a.total - b.total; })[0];
      var novo = rolarDado(ataque.prep, alvo.regiao, rolador);
      ataque.empunhaduraUsada = true;
      if (novo.total > alvo.total) {
        Object.assign(alvo, { faces: alvo.faces.concat(novo.faces), usado: novo.usado, total: novo.total, resultado: novo.resultado, original: novo.resultado, sucessos: novo.sucessos });
      } else alvo.faces = alvo.faces.concat(novo.faces);
      ataque.escolhas.push({ tipo: "empunhadura", dado: alvo.id });
      return { ok: true };
    }
    if (e.tipo === "corteRelampago") {
      var item = o.inventario.itens.filter(function (i) { return i.id === ataque.prep.arma; })[0];
      if (!item || item.chave !== "laminaCurta") return { ok: false, motivo: "Corte Relâmpago é da Lâmina Curta." };
      var reg = R.regiao(o, item.regiao);
      if (!reg || R.esgotada(reg)) return { ok: false, motivo: "A região está esgotada." };
      /* O custo é imediato: 1 de Estresse na região (p. 72). */
      var custoR = R.receberEstresse(o, 1, { regiao: item.regiao, origem: { tipo: "corteRelampago" }, semFerida: true });
      var novoDado = rolarDado(ataque.prep, item.regiao, rolador, { corte: true });
      ataque.dados.push(novoDado);
      if (!C.RESULTADOS[novoDado.resultado].sucesso) ataque.corteEncerrado = true;
      ataque.escolhas.push({ tipo: "corteRelampago", dado: novoDado.id });
      return { ok: true, eventos: custoR.eventos };
    }
    return { ok: false, motivo: "Escolha desconhecida." };
  }

  /* Conclui o ataque: gasta a Coragem, põe o Estresse de cada falha na
     região DO DADO (1, ou 2 na Extrema), conta Falhas Extremas de
     próteses e soma os sucessos. Uma vez só. */
  function concluirAtaque(o, ataque) {
    if (!ataque) return { ok: false, motivo: "Sem ataque." };
    if (ataque.concluido) return { ok: true, repetida: true, sucessos: ataque.sucessos, eventos: [] };
    var eventos = [];
    if (ataque.custoCoragem) {
      o.coragem = Math.max(0, o.coragem - ataque.custoCoragem);
      eventos.push(R.evento("coragem", { valor: -ataque.custoCoragem, motivo: "Coragem no ataque" }));
    }
    var porRegiao = {};
    ataque.dados.forEach(function (dd) {
      var falhou = !C.RESULTADOS[dd.resultado].sucesso;
      if (falhou) porRegiao[dd.regiao] = (porRegiao[dd.regiao] || 0) + C.RESULTADOS[dd.resultado].grau;
      var reg = R.regiao(o, dd.regiao);
      /* A prótese conta as Falhas Extremas de fato roladas (p. 43). */
      if (reg && reg.estado === "protese" && dd.original === "falhaExtrema") {
        reg.falhasExtremas++;
        if (reg.falhasExtremas > R.metade(o.atributos.carne)) {
          eventos.push(R.evento("proteseDestruida", { regiao: dd.regiao }));
          eventos = eventos.concat(R.perderRegiao(o, dd.regiao, "proteseDestruida").eventos);
        }
      }
    });
    Object.keys(porRegiao).forEach(function (k) {
      var reg = R.regiao(o, k);
      if (!reg || reg.estado === "ausente") return;
      eventos = eventos.concat(R.receberEstresse(o, porRegiao[k], { regiao: k, origem: { tipo: "falhaDeCombate" }, semFerida: true }).eventos);
    });
    var sucessos = ataque.dados.reduce(function (s, dd) { return s + dd.sucessos; }, 0);
    ataque.sucessos = sucessos;
    ataque.extremos = ataque.dados.filter(function (dd) { return dd.original === "sucessoExtremo"; }).length;
    ataque.fase = "resolvido";
    ataque.concluido = true;
    var item = ataque.prep.arma ? o.inventario.itens.filter(function (i) { return i.id === ataque.prep.arma; })[0] : null;
    if (item && C.equipamento[item.chave] && C.equipamento[item.chave].recargaApos) item.ataques++;
    o.efeitos = o.efeitos.filter(function (e) { return e.expira !== "fimDoTurnoOuProximaAcao"; });
    return { ok: true, sucessos: sucessos, extremos: ataque.extremos, eventos: eventos };
  }

  /* Recarga (p. 72–74): Ação Regular, ou Extra/Movimento com Suporte
     de Carregador; gasta um uso de Munição. */
  function recarregar(o, armaId, municaoId) {
    var item = o.inventario.itens.filter(function (i) { return i.id === armaId; })[0];
    if (!item || !C.equipamento[item.chave] || !C.equipamento[item.chave].disparo) return { ok: false, motivo: "Não é Arma de Disparo.", eventos: [] };
    var mun = o.inventario.itens.filter(function (i) { return i.id === municaoId && i.chave === "municao"; })[0];
    if (!mun) return { ok: false, motivo: "Sem Munição.", eventos: [] };
    var r = R.consumir(o, mun.id, 1);
    if (!r.ok) return r;
    item.ataques = 0;
    return { ok: true, acao: R.temMod(item, "suporteDeCarregador") ? "extra|movimento" : "regular", eventos: r.eventos.concat([R.evento("recarga", { item: item.id, nome: item.nome })]) };
  }

  /* ---------------------------------------------------------------
     PROTEÇÃO DO ALVO — completa e restante, separadas (C1–C3)
     --------------------------------------------------------------- */

  /* O estado de Proteção de um alvo numa cena. `completa` vem do cálculo
     da ficha (ou do valor publicado da Ameaça) e PODE mudar; `restante`
     é um saldo — recalcular a completa nunca o devolve ao cheio. */
  function novoEstadoDeProtecao(completa) {
    return { completa: R.inteiro(completa, 0, 999, 0), restante: R.inteiro(completa, 0, 999, 0), desgastes: [], zerada: null, persistente: 0 };
  }

  /* A completa mudou (equipamento, efeito): o restante acompanha só o
     que o desgaste permite — nunca sobe por causa do recálculo. */
  function atualizarCompleta(estado, completa) {
    var c = R.inteiro(completa, 0, 999, 0);
    var desgastado = estado.desgastes.reduce(function (s, x) { return s + x.valor; }, 0);
    estado.completa = c;
    if (!estado.zerada) estado.restante = Math.max(0, c - desgastado);
    return estado;
  }

  /* Soma os sucessos de UM ataque. Acerta quando o desgaste acumulado
     (de quantos atacantes for) leva o restante a zero — total ≥
     Proteção (C1). Com Mirar, o ataque precisa sozinho de restante +
     capacidade da região mirada; errando, desgasta normalmente (C4).
     `persistente`: bônus que não zera (Feedback Defensivo). */
  function aplicarSucessos(estado, sucessos, atacanteId, opcoes) {
    var op = opcoes || {};
    var s = R.inteiro(sucessos, 0, 999, 0);
    var antes = estado.restante;
    var persist = R.inteiro(estado.persistente, 0, 99, 0);
    if (estado.zerada && !persist) return { acertou: true, jaZerada: true, restanteAntes: 0, restanteDepois: 0, necessario: 0 };
    if (op.mirar) {
      var nec = antes + persist + R.inteiro(op.mirar.capacidade, 0, 999, 0);
      if (s >= nec) {
        estado.desgastes.push({ id: R.novoId("dg"), atacante: atacanteId, valor: antes, mirar: true });
        estado.restante = 0;
        estado.zerada = { atacante: atacanteId };
        return { acertou: true, restanteAntes: antes, restanteDepois: 0, necessario: nec, mirar: true };
      }
      /* Errou a mira: os sucessos desgastam a Proteção como os de um
         ataque comum, mas ESTE ataque não causa dano (C4). */
      var g = Math.min(antes, s);
      if (g) estado.desgastes.push({ id: R.novoId("dg"), atacante: atacanteId, valor: g, mirar: true });
      estado.restante = antes - g;
      if (estado.restante <= 0 && !persist) estado.zerada = { atacante: atacanteId };
      return { acertou: false, restanteAntes: antes, restanteDepois: estado.restante, necessario: nec, mirar: true, faltam: nec - s };
    }
    var efetivo = Math.max(0, s - (estado.zerada ? 0 : 0));
    var necessario = antes + persist;
    var gasto = Math.min(antes, efetivo);
    if (gasto) estado.desgastes.push({ id: R.novoId("dg"), atacante: atacanteId, valor: gasto });
    estado.restante = antes - gasto;
    if (efetivo >= necessario) {
      estado.restante = 0;
      estado.zerada = { atacante: atacanteId };
      return { acertou: true, restanteAntes: antes, restanteDepois: 0, necessario: necessario };
    }
    return { acertou: false, restanteAntes: antes, restanteDepois: estado.restante, necessario: necessario, faltam: necessario - efetivo };
  }

  /* Depois do acerto, zerada até o início do próximo turno de quem
     acertou; aí volta CHEIA (p. 50). Desgaste parcial: até o fim da
     cena (padrão) ou o início do turno do próprio alvo (ajuste C3). */
  function inicioDoTurno(estado, quemComeca, alvoId, ajustes) {
    var eventos = [];
    if (estado.zerada && estado.zerada.atacante === quemComeca) {
      estado.zerada = null; estado.restante = estado.completa; estado.desgastes = [];
      eventos.push(R.evento("protecaoRestaurada", { motivo: "início do turno de quem acertou" }));
    } else if (!estado.zerada && ajustes && ajustes.desgasteParcial === "turnoDoAlvo" && quemComeca === alvoId && estado.desgastes.length) {
      estado.restante = estado.completa; estado.desgastes = [];
      eventos.push(R.evento("protecaoRestaurada", { motivo: "início do turno do alvo (ajuste da mesa)" }));
    }
    return eventos;
  }

  function fimDaCena(estado) {
    estado.zerada = null; estado.restante = estado.completa; estado.desgastes = [];
    return estado;
  }

  /* ---------------------------------------------------------------
     DANO (pp. 36, 50, 71–76)
     --------------------------------------------------------------- */

  /* A composição do dano de um ataque que ACERTOU. contexto:
       alvoId, alvoFragilidade, tiroCerteiro (Mirar antes no mesmo alvo),
       primeiroAcertoNoAlvo (Voracidade), casasAvancadas (Estocada),
       pontoFraco (+), reservaAbrirFeridas (usar?), arqueado (máximo)
     Devolve a fórmula — rolarDano rola. */
  function composicaoDoDano(o, ataque, contexto) {
    var cx = contexto || {};
    var mut = R.calcularMutaveis(o);
    var item = ataque.prep.arma ? o.inventario.itens.filter(function (i) { return i.id === ataque.prep.arma; })[0] : null;
    var cat = item ? C.equipamento[item.chave] : null;
    var expr = "", extras = 0, multiplicaDados = 1;
    var somas = [];
    var meleeLike = true;
    if (item && ataque.prep.armaValida) {
      expr = cat.classe === "escudo" && R.temMod(item, "belica") ? "1d6" : cat.dano;
      extras += R.contarMod(item, "mortal");
      if (cat.especial === "tiroCerteiro" && cx.tiroCerteiro) multiplicaDados = 2;
      meleeLike = ["adjacente", "curto"].indexOf(R.alcanceDoItem(item).chave) >= 0 && !(cat.especial === "arremesso" && cx.arremessada);
    }
    if (cx.alvoFragilidade) extras += 1;
    var danoAttr = mut.dano.total;
    var vorac = R.temHabilidade(o, "voracidade") && cx.primeiroAcertoNoAlvo;
    somas.push({ fonte: vorac ? "Dano × 2 (Voracidade)" : "Atributo de Dano", valor: vorac ? danoAttr * 2 : danoAttr });
    if (R.temHabilidade(o, "pesoPesado") && meleeLike) somas.push({ fonte: "Peso Pesado", valor: R.metade(o.atributos.carne) });
    if (cx.casasAvancadas) somas.push({ fonte: "Estocada", valor: R.inteiro(cx.casasAvancadas, 0, 99, 0) });
    if (cx.pontoFraco) somas.push({ fonte: "Ponto Fraco", valor: R.inteiro(cx.pontoFraco, 0, 99, 0) });
    if (cx.usarAbrirFeridas && o.reservas.abrirFeridas) somas.push({ fonte: "Abrir Feridas", valor: R.metade(o.reservas.abrirFeridas) });
    (cx.somas || []).forEach(function (s) { somas.push(s); });
    var a = expr ? R.analisarDados(expr) : null;
    var qtd = a ? (a.qtd + extras) * multiplicaDados : extras;
    var faces = a ? a.faces : (extras ? 4 : 0);
    return {
      arma: item ? item.nome : "", expressaoArma: qtd ? qtd + "d" + faces + (a && a.mais ? "+" + a.mais : "") : "",
      dados: { qtd: qtd, faces: faces, mais: a ? a.mais : 0 }, somas: somas,
      metade: !!(item && item.fabricado && item.fabricado.metade), maximo: !!cx.arqueado, corpoACorpo: meleeLike,
    };
  }

  function rolarDano(comp, rolador) {
    var faces = [];
    for (var i = 0; i < comp.dados.qtd; i++) faces.push(comp.maximo ? comp.dados.faces : rolador(comp.dados.faces));
    var daArma = faces.reduce(function (s, x) { return s + x; }, 0) + (comp.dados.mais || 0);
    if (comp.metade) daArma = R.metade(daArma);
    var total = daArma + comp.somas.reduce(function (s, x) { return s + x.valor; }, 0);
    return { total: Math.max(0, total), daArma: daArma, faces: faces, somas: comp.somas };
  }

  /* Reduções que a PERSONA alvo aplica ao dano recebido (p. 76). */
  function reducaoNaPersona(o, opcoes) {
    var op = opcoes || {};
    var red = [];
    var atr = R.atributosEfetivos(o);
    var valorEscolha = R.metade(o.escolhas.protecaoContra === "fuga" ? atr.fuga : atr.carne);
    R.itensEquipados(o).forEach(function (i) {
      var cat = C.equipamento[i.chave];
      if (!cat) return;
      if (cat.especial === "protecaoMaximizada") red.push({ fonte: i.nome + " (Proteção Maximizada)", valor: valorEscolha });
      if (cat.especial === "protecaoElevada" && op.aDistancia) red.push({ fonte: i.nome + " (Proteção Elevada)", valor: valorEscolha });
    });
    return red;
  }

  global.RAMAOblivioCombate = {
    ORDEM_RESULTADO: ORDEM_RESULTADO, ORDEM_DIFICULDADE: ORDEM_DIFICULDADE,
    combinarDificuldade: combinarDificuldade, minimoDoExtremo: minimoDoExtremo,
    classificarD20: classificarD20, classificarFicha: classificarFicha, sucessosDe: sucessosDe,
    montarTeste: montarTeste, rolarTeste: rolarTeste, testeSimples: testeSimples, compararDisputa: compararDisputa,
    darUmaMaozinha: darUmaMaozinha, confusao: confusao,
    prepararAtaque: prepararAtaque, rolarAtaque: rolarAtaque, opcoesDoAtaque: opcoesDoAtaque,
    escolherNoAtaque: escolherNoAtaque, concluirAtaque: concluirAtaque, recarregar: recarregar,
    novoEstadoDeProtecao: novoEstadoDeProtecao, atualizarCompleta: atualizarCompleta, aplicarSucessos: aplicarSucessos,
    inicioDoTurno: inicioDoTurno, fimDaCena: fimDaCena,
    composicaoDoDano: composicaoDoDano, rolarDano: rolarDano, reducaoNaPersona: reducaoNaPersona,
  };
})(typeof window !== "undefined" ? window : globalThis);
/* <<< js/oblivio/combate.js */

/* >>> js/oblivio/ameacas.js */
/* =====================================================================
   R.A.M.A. — Oblívio · motor das Ameaças
   =====================================================================
   Uma INSTÂNCIA de encontro é independente do catálogo: guarda os
   valores publicados no momento em que entrou e tudo o que aconteceu
   com ela (Estresse, regiões perdidas ou ganhas, Mutações, benefícios,
   marcas). O catálogo nunca é alterado.

   Valores publicados não são recalculados pelas fórmulas da Persona:
   Proteção, Dano, Velocidade e limite vêm da página (A1).

   Como na Persona, nada aqui sorteia sozinho nem anda com o relógio:
   as funções recebem o rolador e são chamadas pelos MOMENTOS da mesa.
   ===================================================================== */

(function (global) {
  "use strict";

  var D = global.RAMAOblivioAmeacas;
  var R = global.RAMAOblivio;
  var K = global.RAMAOblivioCombate;

  function ev(tipo, dados) { return R.evento(tipo, dados); }
  function hab(inst, chave) { return inst.habilidades.indexOf(chave) >= 0; }

  /* Regiões de uma Ameaça: o limite total dividido igualmente; a sobra
     vai para a primeira (A7). Só importa para Mirar e para perdas. */
  function dividirRegioes(limite, n, origem) {
    var lista = [];
    var cada = Math.max(1, Math.floor(limite / Math.max(1, n)));
    for (var i = 0; i < n; i++) lista.push({ id: R.novoId("rg"), limite: cada, estresse: 0, origem: origem || "base" });
    if (lista.length) lista[0].limite += Math.max(0, limite - cada * n);
    return lista;
  }

  /* criarInstancia(chave, rolador, opcoes) — opcoes.golfosExtras para a
     Amálgama formada por mais de 3 Golfos; opcoes.atributoExtra para
     onde vão os pontos (Carne/Força, preferencialmente). */
  function criarInstancia(chave, rolador, opcoes) {
    var cat = D.ameaca[chave];
    if (!cat) return null;
    var op = opcoes || {};
    var nRegioes = typeof cat.regioes === "number" ? cat.regioes : cat.regioes.base + R.rolarExpressao(cat.regioes.dado, rolador).total;
    var inst = {
      id: R.novoId("am"), chave: chave, nome: cat.nome, grau: cat.grau,
      atributos: R.copiar(cat.atributos), dano: cat.dano, protecao: cat.protecao, velocidade: cat.velocidade,
      limite: cat.limiteEstresse, estresse: 0,
      regioes: dividirRegioes(cat.limiteEstresse, nRegioes),
      habilidades: cat.habilidades.map(function (h) { return h.chave; }),
      especializacoes: cat.especializacoes.slice(),
      casas: Array.isArray(cat.casas) ? cat.casas[0] : cat.casas,
      estado: "ativa", mazelas: [], marcas: {}, usos: [], efeitos: [],
      mutacao: { pontos: 0, gastos: [] }, beneficios: [], derrotas: 0,
      danosNaRodada: 0, danosNaUltimaRodada: 0, cenaDeEntrada: op.cena || "",
      notas: [],
    };
    if (chave === "forca") {
      var corpos = nRegioes - 2;
      inst.corpos = [];
      for (var i = 0; i < corpos; i++) inst.corpos.push({ id: R.novoId("cp"), limite: cat.corpo.limiteEstresse, estresse: 0, protecao: cat.corpo.protecao });
      inst.regioes = dividirRegioes(cat.limiteEstresse, 2);
    }
    if (chave === "amalgamaGolfada" && op.golfosExtras) {
      var extra = R.inteiro(op.golfosExtras, 0, 99, 0);
      var bonus = cat.formacao.porAdicional;
      inst.limite += bonus.limiteEstresse * extra;
      for (var g = 0; g < extra; g++) {
        var atr = (op.atributosExtras && op.atributosExtras[g]) || bonus.atributosPreferidos[g % bonus.atributosPreferidos.length];
        inst.atributos[atr] = (inst.atributos[atr] || 0) + bonus.atributo;
        inst.regioes.push({ id: R.novoId("rg"), limite: bonus.limiteEstresse, estresse: 0, origem: "golfo" });
      }
      inst.notas.push("Formada por " + (3 + extra) + " Golfos.");
    }
    return inst;
  }

  /* Proteção completa da instância: publicada + corpos da Forca +
     benefícios do Coletor + Proteção Variável do Errante − reduções
     (Destruir Barreiras, Ponto Fraco). */
  function protecaoCompleta(inst, ctx) {
    var c = ctx || {};
    var partes = [{ fonte: "Publicada", valor: inst.protecao }];
    if (inst.corpos) partes.push({ fonte: "Corpos enforcados", valor: inst.corpos.filter(function (x) { return x.estresse < x.limite; }).length });
    inst.beneficios.forEach(function (b) { if (b.chave === "protecao") partes.push({ fonte: "Apropriação (+Proteção)", valor: b.valor }); });
    if (hab(inst, "protecaoVariavel")) {
      var n = R.inteiro(c.personasNaCena, 0, 99, 0);
      var modo = (c.ajustes && c.ajustes.errante) || "metade";
      var valor = n > 3 ? n : modo === "metade" ? R.metade(n) : modo === "zero" ? 0 : R.inteiro(c.bonusErranteTestemunha, 0, 99, 0);
      partes.push({ fonte: "Proteção Variável" + (n <= 3 ? " (3 ou menos: " + modo + ")" : ""), valor: valor });
    }
    inst.efeitos.forEach(function (e) { if (e.tipo === "protecao") partes.push({ fonte: e.fonte, valor: e.valor }); });
    if (inst.efeitos.some(function (e) { return e.tipo === "protecaoMetade"; })) {
      var t0 = partes.reduce(function (s, x) { return s + x.valor; }, 0);
      partes.push({ fonte: "Proteção pela metade (Golpe do Carrasco)", valor: -Math.ceil(t0 / 2) });
    }
    var total = partes.reduce(function (s, x) { return s + x.valor; }, 0);
    return { total: Math.max(0, total), partes: partes };
  }

  function danoAtual(inst) {
    var d = inst.dano;
    inst.beneficios.forEach(function (b) { if (b.chave === "dano") d += b.valor; });
    return d;
  }
  function velocidadeAtual(inst) {
    var v = inst.velocidade;
    inst.beneficios.forEach(function (b) { if (b.chave === "velocidade") v += b.valor; });
    return v;
  }
  function regioesVivas(inst) { return inst.regioes.filter(function (r) { return r.estresse < r.limite; }); }
  function folego(inst) { return R.metade(inst.atributos.carne + inst.atributos.determinacao); }

  /* ---------------------------------------------------------------
     SOFRER DANO
     opcoes: classe ("bomba"), corrompido, regiao (Mirar), pontoFraco
             (região analisada do Apogeu), muralha (Coletor: quantas
             regiões perder para reduzir), corpoACorpo, deCura (Patógeno)
     --------------------------------------------------------------- */

  function sofrerDano(inst, valor, opcoes, rolador) {
    var op = opcoes || {};
    var eventos = [];
    if (inst.estado !== "ativa") return { ok: false, motivo: inst.nome + " não está em combate.", eventos: [] };
    var v = R.inteiro(valor, 0, 9999, 0);
    if (hab(inst, "alemTumulo") && !op.corrompido) return { ok: true, valor: 0, eventos: [ev("imuneAoDano", { ameaca: inst.id, motivo: "Mortalha: só Equipamentos Corrompidos" })] };
    if (hab(inst, "forcaImparavel")) {
      if (op.classe === "bomba") { v *= 2; eventos.push(ev("multiplicado", { fonte: "Força Imparável (bomba)", x: 2 })); }
      else { v = Math.max(0, v - 5); eventos.push(ev("reduzido", { fonte: "Força Imparável", valor: 5 })); }
    }
    if (hab(inst, "couracaImpenetravel")) {
      if (op.regiao && op.pontoFraco && op.regiao === op.pontoFraco) { v *= 2; eventos.push(ev("multiplicado", { fonte: "Ponto fraco revelado", x: 2 })); }
      else { v = Math.floor(v / 2); eventos.push(ev("reduzido", { fonte: "Couraça Impenetrável", metade: true })); }
    }
    if (hab(inst, "muralhaDeCarne") && op.muralha) {
      var n = Math.min(R.inteiro(op.muralha, 0, 99, 0), regioesVivas(inst).length - 1);
      for (var i = 0; i < n; i++) { inst.regioes.pop(); v = Math.max(0, v - 7); }
      if (n) eventos.push(ev("muralha", { regioes: n, reduziu: 7 * n }));
    }
    if (!op.deCura) { inst.danosNaRodada++; }
    inst.estresse = Math.min(inst.limite, inst.estresse + v);
    if (op.regiao) {
      var reg = inst.regioes.filter(function (r) { return r.id === op.regiao; })[0];
      if (reg) reg.estresse = Math.min(reg.limite, reg.estresse + v);
    }
    eventos.push(ev("danoNaAmeaca", { ameaca: inst.id, valor: v, total: inst.estresse, limite: inst.limite }));
    /* Enxame e Horda perdem regiões com dano grande de uma vez (A8). */
    var cat = D.ameaca[inst.chave];
    if (cat.perdeRegioes && v > cat.perdeRegioes.acimaDe) {
      for (var j = 0; j < cat.perdeRegioes.perde && inst.regioes.length; j++) inst.regioes.pop();
      eventos.push(ev("ameacaPerdeRegiao", { ameaca: inst.id, perdeu: cat.perdeRegioes.perde, restam: inst.regioes.length }));
    }
    if (hab(inst, "apiceDaEvolucao") && op.ferida) inst.efeitos.push({ tipo: "semRegeneracao", ate: "fimDaPartida" });
    /* Mutação: algo que vise derrotá-lo rola 1D6 (4–6 = 1 ponto). */
    if (hab(inst, "mutacao") && rolador && v > 0) {
      var d = rolador(6);
      if (d >= 4) { inst.mutacao.pontos++; eventos.push(ev("mutacao", { ameaca: inst.id, d6: d, pontos: inst.mutacao.pontos })); }
      else eventos.push(ev("mutacaoFalhou", { ameaca: inst.id, d6: d }));
    }
    if (inst.estresse >= inst.limite || (cat.perdeRegioes && !inst.regioes.length)) eventos = eventos.concat(derrotar(inst, op).eventos);
    return { ok: true, valor: v, eventos: eventos };
  }

  /* Toque Corrosivo: quem acerta a Amálgama corpo a corpo sofre 4. */
  function reflexoDoAcerto(inst, opcoes) {
    var op = opcoes || {};
    if (hab(inst, "toqueCorrosivo") && op.corpoACorpo) return { dano: 4, fonte: "Toque Corrosivo" };
    return null;
  }

  /* ---------------------------------------------------------------
     DERROTA E RETORNOS
     --------------------------------------------------------------- */

  function derrotar(inst, opcoes) {
    var op = opcoes || {};
    var eventos = [];
    inst.derrotas++;
    if (inst.chave === "reiDosRatos" && inst.derrotas === 1 && !inst.virouEnxame) {
      /* Vida Longa ao Rei: vira Enxame; 3 rodadas para derrotá-lo. */
      inst.virouEnxame = { rodadas: 3, estresseAntes: inst.estresse };
      var enx = D.ameaca.enxame;
      inst.forma = "enxame";
      inst.limite = enx.limiteEstresse; inst.estresse = 0; inst.protecao = enx.protecao; inst.dano = enx.dano;
      inst.regioes = dividirRegioes(enx.limiteEstresse, enx.regioes);
      inst.habilidades = enx.habilidades.map(function (h) { return h.chave; }).concat(["vidaLongaAoRei"]);
      eventos.push(ev("transformacao", { ameaca: inst.id, em: "enxame", rodadas: 3 }));
      return { ok: true, eventos: eventos };
    }
    if (inst.virouEnxame) {
      inst.estado = "derrotada";
      eventos.push(ev("derrotada", { ameaca: inst.id, nome: inst.nome + " (Enxame do Rei)" }));
      return { ok: true, eventos: eventos };
    }
    inst.estado = "derrotada";
    eventos.push(ev("derrotada", { ameaca: inst.id, nome: inst.nome }));
    if (hab(inst, "regeneracaoMaldita")) {
      inst.retorno = { quando: "fimDaProximaCena", recupera: "metade", impedido: false };
      eventos.push(ev("retornoPendente", { ameaca: inst.id, impedirCom: ["combustivel", "bombaIncendiaria"] }));
    }
    if (hab(inst, "alemTumulo")) {
      inst.retorno = { quando: "fimDaProximaCena", recupera: "tudo", impedido: false };
      eventos.push(ev("retornoPendente", { ameaca: inst.id, impedirCom: ["vinculoCessado"] }));
    }
    if (hab(inst, "fimDeTodasAsCoisas")) {
      inst.retorno = { quando: "personaForaDeAcao", recupera: "tudo", impedido: false };
      eventos.push(ev("retornoPendente", { ameaca: inst.id, quando: "personaForaDeAcao" }));
    }
    if (hab(inst, "estrondoFinal")) {
      inst.explosao = { rodadas: 3 };
      eventos.push(ev("explosaoIminente", { ameaca: inst.id, rodadas: 3, tensao: { sucessos: 12, falha: "1d20+10" } }));
    }
    return { ok: true, eventos: eventos };
  }

  /* Impedir o retorno (destruir os restos com fogo, cessar o vínculo). */
  function impedirRetorno(inst, meio) {
    if (!inst.retorno) return { ok: false, motivo: "Nada a impedir." };
    var cat = D.ameaca[inst.chave];
    var h = cat.habilidades.filter(function (x) { return x.efeito && x.efeito.tipo === "retorno"; })[0];
    if (h && h.efeito.impedidoPor && h.efeito.impedidoPor.indexOf(meio) < 0 && !(meio === "fogo" && h.efeito.impedidoPor.indexOf("fogo") >= 0)) {
      return { ok: false, motivo: "Isso não impede o retorno de " + inst.nome + "." };
    }
    inst.retorno.impedido = true;
    return { ok: true, eventos: [ev("retornoImpedido", { ameaca: inst.id, meio: meio })] };
  }

  /* Fim de uma cena: as que deviam voltar "no fim da próxima cena"
     contam esta cena; na segunda, voltam (se não impedidas). */
  function fimDaCena(inst) {
    var eventos = [];
    if (inst.estado !== "derrotada" || !inst.retorno || inst.retorno.quando !== "fimDaProximaCena") return { eventos: eventos };
    if (inst.retorno.impedido) { inst.retorno = null; inst.estado = "destruida"; return { eventos: [ev("destruida", { ameaca: inst.id })] }; }
    if (!inst.retorno.cenasPassadas) { inst.retorno.cenasPassadas = 1; return { eventos: eventos }; }
    var rec = inst.retorno.recupera === "metade" ? R.metade(inst.limite) : inst.limite;
    inst.estresse = Math.max(0, inst.limite - rec);
    inst.estado = "ativa"; inst.retorno = null;
    eventos.push(ev("retornou", { ameaca: inst.id, estresse: inst.estresse }));
    return { eventos: eventos };
  }

  /* Uma Persona ficou Fora de Ação: a Forca volta. */
  function aoPersonaForaDeAcao(inst) {
    if (inst.estado === "derrotada" && inst.retorno && inst.retorno.quando === "personaForaDeAcao") {
      inst.estado = "ativa"; inst.estresse = 0; inst.retorno = null;
      return { eventos: [ev("retornou", { ameaca: inst.id, motivo: "Fim de Todas as Coisas" })] };
    }
    return { eventos: [] };
  }

  /* ---------------------------------------------------------------
     MOMENTOS
     --------------------------------------------------------------- */

  function fimDaRodada(inst, ctx) {
    var eventos = [];
    inst.danosNaUltimaRodada = inst.danosNaRodada;
    inst.danosNaRodada = 0;
    inst.efeitos = inst.efeitos.filter(function (e) { return e.ate !== "fimDaRodada"; });
    if (inst.estado === "ativa") {
      var regen = 0;
      if (hab(inst, "vidaLongaAoRei") && !inst.virouEnxame) regen += 8;
      if (hab(inst, "apiceDaEvolucao") && !inst.efeitos.some(function (e) { return e.tipo === "semRegeneracao"; })) regen += 7;
      if (inst.mutacao.gastos.indexOf("regeneracao") >= 0) regen += 4;
      inst.beneficios.forEach(function (b) { if (b.chave === "regeneracao") regen += 7; });
      if (regen && inst.estresse) {
        var x = Math.min(inst.estresse, regen);
        inst.estresse -= x;
        eventos.push(ev("regeneracao", { ameaca: inst.id, valor: x }));
      }
      if (inst.virouEnxame) {
        inst.virouEnxame.rodadas--;
        if (inst.virouEnxame.rodadas <= 0) {
          var rei = D.ameaca.reiDosRatos;
          inst.forma = ""; inst.limite = rei.limiteEstresse; inst.estresse = R.metade(rei.limiteEstresse);
          inst.protecao = rei.protecao; inst.dano = rei.dano;
          inst.regioes = dividirRegioes(rei.limiteEstresse, rei.regioes);
          inst.habilidades = rei.habilidades.map(function (h) { return h.chave; });
          inst.virouEnxame = null; inst.reiVoltou = true;
          eventos.push(ev("transformacao", { ameaca: inst.id, em: "reiDosRatos", estresse: inst.estresse }));
        }
      }
      if (inst.mutacao.gastos.indexOf("evolui") >= 0 && inst.chave === "mutageno") {
        var mut = inst.mutacao;
        var pat = criarInstancia("patogeno", function () { return 1; });
        Object.assign(inst, { chave: "patogeno", nome: pat.nome, grau: pat.grau, atributos: pat.atributos, dano: pat.dano, protecao: pat.protecao,
          velocidade: pat.velocidade, limite: pat.limite, regioes: pat.regioes, habilidades: pat.habilidades, especializacoes: pat.especializacoes, casas: pat.casas });
        inst.mutacao = { pontos: mut.pontos, gastos: mut.gastos.filter(function (g) { return g !== "evolui"; }) };
        eventos.push(ev("transformacao", { ameaca: inst.id, em: "patogeno", mantemMutacoes: true }));
      }
    }
    if (inst.explosao) {
      inst.explosao.rodadas--;
      if (inst.explosao.rodadas <= 0) { eventos.push(ev("explodiu", { ameaca: inst.id, dano: "1d20+10", sucessosParaEscapar: 12 })); inst.explosao = null; inst.estado = "destruida"; }
    }
    if (inst.golfoContagem !== undefined) {
      inst.golfoContagem--;
      if (inst.golfoContagem <= 0 && inst.estado === "ativa") { inst.estado = "destruida"; eventos.push(ev("destruida", { ameaca: inst.id, motivo: "A União Faz a Força não aconteceu" })); }
    }
    return { eventos: eventos };
  }

  /* ---------------------------------------------------------------
     COMPORTAMENTOS ESPECIAIS
     --------------------------------------------------------------- */

  /* A União Faz a Força (Golfo): 3+ Golfos ativos na cena viram uma
     Amálgama Golfada; os Golfos saem do encontro. */
  function unirGolfos(instancias, rolador) {
    var golfos = instancias.filter(function (i) { return i.chave === "golfo" && i.estado === "ativa"; });
    if (golfos.length < 3) return { ok: false, motivo: "Precisa de 3 ou mais Golfos na cena." };
    golfos.forEach(function (g) { g.estado = "unida"; });
    var am = criarInstancia("amalgamaGolfada", rolador, { golfosExtras: golfos.length - 3 });
    return { ok: true, nova: am, consumidas: golfos.map(function (g) { return g.id; }), eventos: [ev("uniao", { golfos: golfos.length, ameaca: am.id })] };
  }

  /* Sem conseguir unir: todos são destruídos no fim da próxima rodada. */
  function marcarGolfosSemUniao(instancias) {
    instancias.forEach(function (i) { if (i.chave === "golfo" && i.estado === "ativa" && i.golfoContagem === undefined) i.golfoContagem = 2; });
  }

  /* Gastar pontos de Mutação (Mutágeno; o Patógeno que veio dele mantém). */
  function gastarMutacao(inst, chave, param) {
    var cat = D.ameaca.mutageno;
    var b = cat.habilidades[0].efeito.beneficios.filter(function (x) { return x.chave === chave; })[0];
    if (!b) return { ok: false, motivo: "Benefício desconhecido." };
    if (inst.mutacao.pontos < b.custo) return { ok: false, motivo: "Precisa de " + b.custo + " pontos de Mutação." };
    inst.mutacao.pontos -= b.custo;
    inst.mutacao.gastos.push(chave);
    var p = param || {};
    if (chave === "atributo" && inst.atributos[p.atributo] !== undefined) inst.atributos[p.atributo]++;
    if (chave === "regiao") inst.regioes.push({ id: R.novoId("rg"), limite: Math.max(1, Math.floor(inst.limite / Math.max(1, inst.regioes.length))), estresse: 0, origem: "mutacao" });
    if (chave === "imunidade") inst.efeitos.push({ tipo: "imunidade", habilidade: R.copiar(p.habilidade) || "", persona: p.persona || "" });
    return { ok: true, eventos: [ev("mutacaoGasta", { ameaca: inst.id, beneficio: b.texto })] };
  }

  /* Benefícios da Apropriação Forçada (Coletor), até 3 na cena. */
  function beneficioDaApropriacao(inst, chave, rolador) {
    if (inst.beneficios.length >= 3) return { ok: false, motivo: "Máximo de 3 benefícios." };
    var tab = { velocidade: "1d6", protecao: "1d4", dano: "1d2" };
    var valor = tab[chave] ? R.rolarExpressao(tab[chave], rolador).total : 1;
    inst.beneficios.push({ chave: chave, valor: valor, ate: "fimDaCena" });
    return { ok: true, valor: valor, eventos: [ev("beneficio", { ameaca: inst.id, chave: chave, valor: valor })] };
  }

  /* Muralhas de Carne e invocações por regiões (Coletor, Horda, Rei). */
  function trocarRegioesPor(inst, chaveCriada, rolador) {
    var custo = { carcaca: 2, enxame: 3 }[chaveCriada];
    if (chaveCriada === "muralha") custo = 1;
    if (!custo) return { ok: false, motivo: "Não pode criar isso." };
    if (regioesVivas(inst).length <= custo) return { ok: false, motivo: "Regiões insuficientes." };
    for (var i = 0; i < custo; i++) inst.regioes.pop();
    if (chaveCriada === "muralha") {
      var mur = { id: R.novoId("am"), chave: "muralha", nome: "Muralha de Carne", grau: 0, atributos: { carne: 0, forca: 0, fuga: 0, determinacao: 0, mente: 0 },
        dano: 0, protecao: 1, velocidade: 0, limite: 5, estresse: 0, regioes: dividirRegioes(5, 1), habilidades: [], especializacoes: [], casas: 1, estado: "ativa",
        mazelas: [], marcas: {}, usos: [], efeitos: [], mutacao: { pontos: 0, gastos: [] }, beneficios: [], derrotas: 0, danosNaRodada: 0, danosNaUltimaRodada: 0, notas: ["Do Coletor"], invocadaPor: inst.id };
      return { ok: true, nova: mur, eventos: [ev("invocada", { por: inst.id, chave: "muralha" })] };
    }
    var nova = criarInstancia(chaveCriada, rolador);
    nova.invocadaPor = inst.id;
    return { ok: true, nova: nova, eventos: [ev("invocada", { por: inst.id, chave: chaveCriada })] };
  }

  /* Incorporar regiões de uma Persona devorada (Horda, Rei, Enxame). */
  function incorporarRegioes(inst, quantas) {
    var n = R.inteiro(quantas, 0, 20, 0);
    for (var i = 0; i < n; i++) inst.regioes.push({ id: R.novoId("rg"), limite: Math.max(1, Math.floor(inst.limite / Math.max(1, inst.regioes.length))), estresse: 0, origem: "devorada" });
    return { eventos: [ev("regioesIncorporadas", { ameaca: inst.id, n: n })] };
  }

  /* Recuperar Estresse (Sede de Sangue do Errante, Amedrontar…). */
  function recuperar(inst, valor) {
    var x = Math.min(inst.estresse, R.inteiro(valor, 0, 9999, 0));
    inst.estresse -= x;
    return { eventos: [ev("regeneracao", { ameaca: inst.id, valor: x })] };
  }

  /* Quimera (p. 137): 3 Ameaças componentes e uma habilidade de cada,
     mais Decifra-me ou Te Devoro. Sem o capítulo "Ameaças de Jogo", o
     resto da ficha é a publicada (lacuna registrada). */
  function montarQuimera(componentes, rolador) {
    var lista = (componentes || []).filter(function (c) { return c && D.ameaca[c.ameaca] && c.ameaca !== "quimera"; });
    if (lista.length !== 3) return { ok: false, motivo: "Escolha 3 Ameaças e uma habilidade de cada." };
    var habs = [];
    for (var i = 0; i < 3; i++) {
      var ok = D.ameaca[lista[i].ameaca].habilidades.some(function (h) { return h.chave === lista[i].habilidade; });
      if (!ok) return { ok: false, motivo: "A habilidade escolhida não é de " + D.ameaca[lista[i].ameaca].nome + "." };
      habs.push(lista[i].habilidade);
    }
    var q = criarInstancia("quimera", rolador);
    habs.forEach(function (h) { if (q.habilidades.indexOf(h) < 0) q.habilidades.push(h); });
    q.componentes = lista.map(function (c) { return { ameaca: c.ameaca, habilidade: c.habilidade }; });
    q.notas.push("Montada de " + lista.map(function (c) { return D.ameaca[c.ameaca].nome; }).join(", ") + ". Sem o capítulo \"Ameaças de Jogo\", o resto é a ficha publicada.");
    return { ok: true, nova: q };
  }

  /* ---------------------------------------------------------------
     ATAQUE DA AMEAÇA
     --------------------------------------------------------------- */

  /* Os dados da Ameaça: uma região viva por dado, até 5 (A9). bonus:
     Guardas! (+1 por Enxame), Decreto Real contra o alvo, obstáculos. */
  function rolarAtaque(inst, opcoes, rolador) {
    var op = opcoes || {};
    var vivas = regioesVivas(inst);
    var n = Math.max(1, Math.min(5, R.inteiro(op.dados || vivas.length, 1, 5, 1), vivas.length || 1));
    var dif = K.combinarDificuldade(op.dificuldade || "normal", op.passos || []);
    var dados = [];
    for (var i = 0; i < n; i++) {
      var f = [rolador(20)];
      var usado = f[0];
      if (op.alvoNoChao) { f.push(rolador(20)); usado = Math.max(f[0], f[1]); }
      var total = usado + R.inteiro(op.bonus, -99, 99, 0);
      var res = K.classificarD20(total, dif, 0);
      dados.push({ regiao: vivas[i] ? vivas[i].id : "", faces: f, usado: usado, total: total, resultado: res, sucessos: K.sucessosDe(res) });
    }
    var sucessos = dados.reduce(function (s, d) { return s + d.sucessos; }, 0);
    /* As falhas também cansam a Ameaça (mesma regra do teste, A9). */
    var falha = dados.reduce(function (s, d) { return s + (d.sucessos ? 0 : (d.resultado === "falhaExtrema" ? 2 : 1)); }, 0);
    if (falha) inst.estresse = Math.min(inst.limite, inst.estresse + falha);
    return { dados: dados, sucessos: sucessos, extremos: dados.filter(function (d) { return d.resultado === "sucessoExtremo"; }).length, estresseDasFalhas: falha, dificuldade: dif };
  }

  function danoDaHabilidade(inst, chaveHabilidade, rolador, extras) {
    var cat = D.ameaca[inst.chave] || {};
    var h = (cat.habilidades || []).concat(Object.keys(D.ameaca).reduce(function (s, k) { return s.concat(D.ameaca[k].habilidades); }, []))
      .filter(function (x) { return x.chave === chaveHabilidade; })[0];
    if (!h || !h.dano) return { total: 0, faces: [] };
    var expr = h.dano;
    var r = R.rolarExpressao(expr, rolador);
    var total = r.total + R.inteiro(extras, -99, 999, 0);
    inst.beneficios.forEach(function (b) { if (b.chave === "dano") total += b.valor; });
    return { total: total, faces: r.faces, expressao: expr };
  }

  /* Recompensa (tabela de 1D6 da Ameaça). Item fora do catálogo vira
     escolha da Testemunha (lacuna), nunca um item inventado. */
  function recompensa(chave, rolador) {
    var cat = D.ameaca[chave];
    if (!cat) return { itens: [] };
    var d = rolador(6);
    var linha = cat.recompensa.filter(function (x) { return d >= x.de && d <= x.ate; })[0];
    return { d6: d, itens: linha ? R.copiar(linha.itens) : [] };
  }

  global.RAMAOblivioMotorAmeacas = {
    criarInstancia: criarInstancia, protecaoCompleta: protecaoCompleta, danoAtual: danoAtual, velocidadeAtual: velocidadeAtual,
    regioesVivas: regioesVivas, folego: folego, sofrerDano: sofrerDano, reflexoDoAcerto: reflexoDoAcerto,
    derrotar: derrotar, impedirRetorno: impedirRetorno, fimDaCena: fimDaCena, aoPersonaForaDeAcao: aoPersonaForaDeAcao,
    fimDaRodada: fimDaRodada, unirGolfos: unirGolfos, marcarGolfosSemUniao: marcarGolfosSemUniao,
    gastarMutacao: gastarMutacao, beneficioDaApropriacao: beneficioDaApropriacao, trocarRegioesPor: trocarRegioesPor,
    incorporarRegioes: incorporarRegioes, recuperar: recuperar, montarQuimera: montarQuimera,
    rolarAtaque: rolarAtaque, danoDaHabilidade: danoDaHabilidade, recompensa: recompensa,
  };
})(typeof window !== "undefined" ? window : globalThis);
/* <<< js/oblivio/ameacas.js */

/* >>> js/oblivio/mesa.js */
/* =====================================================================
   R.A.M.A. — Oblívio · a mesa (missão, cenas, ordem, fileiras, Farol)
   =====================================================================
   O estado COMPARTILHADO de uma campanha de Oblívio: o que pertence à
   mesa e não a uma ficha. É a FONTE DE VERDADE de: missão atual e
   histórico, cena e rodada, Ordem de Ação, fileiras, Farol, encontro
   (instâncias de Ameaças e o desgaste de Proteção de cada alvo) e o
   Buraco. A ficha guarda o que é da Persona (Estresse, Coragem,
   mazelas, inventário); a mesa nunca guarda cópia desses saldos.

   O tempo anda por EVENTOS: avancarTurno, iniciarCena, encerrarCena.
   Nada avança por relógio, recarga de página ou redesenho. Cada evento
   devolve as ações que precisam ser aplicadas às fichas (momentos), e
   quem aplica é a página (ficha avulsa) ou o servidor (campanha).

   Informação privada da Testemunha (Buraco não revelado, recompensas,
   anotações) sai por vistaDosJogadores, nunca pela vista completa.
   ===================================================================== */

(function (global) {
  "use strict";

  var C = global.RAMAOblivioCatalogo;
  var R = global.RAMAOblivio;
  var K = global.RAMAOblivioCombate;
  var AM = global.RAMAOblivioMotorAmeacas;

  function ev(tipo, dados) { return R.evento(tipo, dados); }

  function estadoVazio() {
    return {
      v: 1,
      /* Ligada em Configurações da campanha: a aba Oblívio aparece. */
      ativo: false,
      ajustes: R.ajustesDe(null),
      partida: { id: R.novoId("pt"), n: 1 },
      missao: null,
      missoes: [],
      cena: null,
      cenas: 0,
      fileiras: { personas: [], ameacas: [] },
      farol: { persona: "", item: "", aceso: false, derrubado: false, rodadas: 0, cenas: 0, apagada: null, derrubadaPor: "" },
      encontro: { ameacas: [], protecoes: {}, analisados: {}, ataquesPendentes: [] },
      buraco: null,
      registro: [],
      operacoes: [],
    };
  }

  function normalizar(bruto) {
    var b = bruto && typeof bruto === "object" ? bruto : {};
    var e = estadoVazio();
    e.ativo = b.ativo === true;
    e.ajustes = R.ajustesDe(b.ajustes);
    if (b.partida && b.partida.id) e.partida = { id: String(b.partida.id).slice(0, 80), n: R.inteiro(b.partida.n, 1, 9999, 1) };
    e.missao = b.missao && b.missao.id ? R.copiar(b.missao) : null;
    e.missoes = Array.isArray(b.missoes) ? b.missoes.slice(-50).map(R.copiar) : [];
    e.cena = b.cena && b.cena.id ? R.copiar(b.cena) : null;
    e.cenas = R.inteiro(b.cenas, 0, 99999, 0);
    var f = b.fileiras || {};
    e.fileiras = { personas: Array.isArray(f.personas) ? f.personas.map(String).slice(0, 30) : [], ameacas: Array.isArray(f.ameacas) ? f.ameacas.map(String).slice(0, 60) : [] };
    if (b.farol && typeof b.farol === "object") e.farol = Object.assign(e.farol, R.copiar(b.farol));
    var en = b.encontro || {};
    e.encontro = {
      ameacas: Array.isArray(en.ameacas) ? en.ameacas.slice(0, 60).map(R.copiar) : [],
      protecoes: en.protecoes && typeof en.protecoes === "object" ? R.copiar(en.protecoes) : {},
      analisados: en.analisados && typeof en.analisados === "object" ? R.copiar(en.analisados) : {},
      ataquesPendentes: Array.isArray(en.ataquesPendentes) ? en.ataquesPendentes.slice(-20).map(R.copiar) : [],
    };
    e.buraco = b.buraco ? R.copiar(b.buraco) : null;
    e.registro = Array.isArray(b.registro) ? b.registro.slice(-200).map(R.copiar) : [];
    e.operacoes = Array.isArray(b.operacoes) ? b.operacoes.slice(-300).map(String) : [];
    return e;
  }

  function registrar(m, tipo, dados) {
    m.registro.push(Object.assign({ tipo: tipo, cena: m.cena ? m.cena.id : "", rodada: m.cena ? m.cena.rodada : 0 }, dados || {}));
    if (m.registro.length > 200) m.registro = m.registro.slice(-200);
  }

  /* ---------------------------------------------------------------
     MISSÃO (p. 95; glossário p. 121)
     --------------------------------------------------------------- */

  function iniciarMissao(m, nome) {
    if (m.missao && !m.missao.concluida) return { ok: false, motivo: "Há uma missão em andamento." };
    m.missao = { id: R.novoId("ms"), nome: String(nome || "Missão").slice(0, 120), inicio: m.partida.id, mortos: [], concluida: false };
    registrar(m, "missao", { id: m.missao.id });
    return { ok: true, momentos: [{ tipo: "iniciarMissao", missao: m.missao.id, para: "todas" }], eventos: [ev("missaoIniciada", { nome: m.missao.nome })] };
  }

  function registrarMorte(m, personaId) {
    if (m.missao && m.missao.mortos.indexOf(personaId) < 0) m.missao.mortos.push(personaId);
  }

  /* Concluir: cada Persona VIVA recebe a progressão (uma vez — a ficha
     guarda as missões já aplicadas). */
  function concluirMissao(m) {
    if (!m.missao || m.missao.concluida) return { ok: false, motivo: "Não há missão em andamento." };
    var mis = m.missao;
    mis.concluida = true;
    m.missoes.push(mis);
    m.missao = null;
    registrar(m, "missaoConcluida", { id: mis.id, mortos: mis.mortos.length });
    return { ok: true, momentos: [{ tipo: "concluirMissao", missao: mis.id, mortos: mis.mortos.length, para: "vivas" }], eventos: [ev("missaoConcluida", { nome: mis.nome, mortos: mis.mortos.length })] };
  }

  /* ---------------------------------------------------------------
     CENAS, TURNOS, RODADAS (pp. 116–120)
     --------------------------------------------------------------- */

  /* participantes: [{ ref, tipo: "persona"|"ameaca", nome, velocidade }]
     Ordem de Ação: Velocidade, do maior ao menor; empate fica na ordem
     de entrada, e a Testemunha pode trocar (C8). */
  function ordemDeAcao(participantes) {
    return participantes.map(function (p, i) { return Object.assign({ i: i }, p); })
      .sort(function (a, b) { return (b.velocidade - a.velocidade) || (a.i - b.i); })
      .map(function (p) { return { ref: p.ref, tipo: p.tipo, nome: p.nome || "", velocidade: p.velocidade, adiado: false }; });
  }

  function iniciarCena(m, tipo, participantes, opcoes) {
    if (!C.cena[tipo]) return { ok: false, motivo: "Tipo de cena desconhecido." };
    var op = opcoes || {};
    var momentos = [];
    var eventos = [];
    if (m.cena) {
      var fim = encerrarCena(m);
      momentos = momentos.concat(fim.momentos || []);
      eventos = eventos.concat(fim.eventos || []);
    }
    m.cenas++;
    m.cena = { id: R.novoId("cn"), n: m.cenas, tipo: tipo, rodada: C.cena[tipo].rodadas ? 1 : 0, turno: 0, ordem: C.cena[tipo].rodadas ? ordemDeAcao(participantes || []) : [] };
    if (tipo === "tensao") m.cena.tensao = { rodadas: R.inteiro(op.rodadas, 0, 99, 0), meta: R.inteiro(op.sucessos, 0, 99, 0), acumulados: 0, motivo: String(op.motivo || "").slice(0, 120), aoAcabar: op.aoAcabar || null };
    registrar(m, "cena", { tipo: tipo });
    momentos.push({ tipo: "inicioDaCena", cena: m.cena.id, para: "todas" });
    /* A Fonte de Luz conta uma cena fora de combate (C10). */
    if (m.farol.aceso && tipo !== "combate" && tipo !== "tensao") eventos = eventos.concat(consumirLuz(m, "cena").eventos);
    eventos.push(ev("cenaIniciada", { tipo: tipo, n: m.cena.n }));
    return { ok: true, momentos: momentos, eventos: eventos };
  }

  function encerrarCena(m) {
    if (!m.cena) return { ok: false, momentos: [], eventos: [] };
    var eventos = [ev("cenaEncerrada", { tipo: m.cena.tipo })];
    Object.keys(m.encontro.protecoes).forEach(function (k) { K.fimDaCena(m.encontro.protecoes[k]); });
    m.encontro.analisados = {};
    m.encontro.ameacas.forEach(function (a) {
      a.beneficios = a.beneficios.filter(function (b) { return b.ate !== "fimDaCena"; });
      eventos = eventos.concat(AM.fimDaCena(a).eventos);
    });
    var tipo = m.cena.tipo;
    m.cena = null;
    return { ok: true, momentos: [{ tipo: "fimDaCena", cenaTipo: tipo, para: "todas" }], eventos: eventos };
  }

  function atual(m) { return m.cena && m.cena.ordem.length ? m.cena.ordem[m.cena.turno] || null : null; }

  /* O turno de quem está na vez termina; o próximo começa. Virando a
     rodada, o fim da rodada acontece ANTES do primeiro turno da nova.
     Devolve os momentos (fimDoTurno de uma Persona, fimDaRodada,
     início de turno para a Proteção). */
  function avancarTurno(m, rolador) {
    if (!m.cena || !m.cena.ordem.length) return { ok: false, motivo: "Sem Ordem de Ação nesta cena." };
    var momentos = [];
    var eventos = [];
    var quem = atual(m);
    if (quem && quem.tipo === "persona") momentos.push({ tipo: "fimDoTurno", persona: quem.ref });
    m.cena.turno++;
    if (m.cena.turno >= m.cena.ordem.length) {
      momentos.push({ tipo: "fimDaRodada", rodada: m.cena.rodada, para: "todas" });
      m.encontro.ameacas.forEach(function (a) { eventos = eventos.concat(AM.fimDaRodada(a, {}).eventos); });
      eventos = eventos.concat(fimDaRodadaDaMesa(m, rolador).eventos);
      m.cena.rodada++;
      m.cena.turno = 0;
      m.cena.ordem.forEach(function (o) { o.agiu = false; });
      eventos.push(ev("novaRodada", { rodada: m.cena.rodada }));
    }
    var proximo = atual(m);
    if (proximo) {
      Object.keys(m.encontro.protecoes).forEach(function (alvo) {
        eventos = eventos.concat(K.inicioDoTurno(m.encontro.protecoes[alvo], proximo.ref, alvo, m.ajustes));
      });
      eventos.push(ev("vez", { ref: proximo.ref, nome: proximo.nome, tipo: proximo.tipo }));
      if (proximo.tipo === "persona") momentos.push({ tipo: "inicioDoTurno", persona: proximo.ref });
    }
    return { ok: true, momentos: momentos, eventos: eventos };
  }

  /* Adiar (p. 117): desce na ordem até o fim da cena. */
  function adiar(m, ref, posicoes) {
    if (!m.cena) return { ok: false };
    var i = m.cena.ordem.findIndex(function (o) { return o.ref === ref; });
    if (i < 0) return { ok: false, motivo: "Não está na Ordem de Ação." };
    var n = Math.max(1, R.inteiro(posicoes, 1, 99, 1));
    var p = m.cena.ordem.splice(i, 1)[0];
    p.adiado = true;
    var destino = Math.min(m.cena.ordem.length, i + n);
    m.cena.ordem.splice(destino, 0, p);
    if (i === m.cena.turno && destino > i) { /* quem estava na vez desceu: a vez passa ao seguinte */ }
    return { ok: true, eventos: [ev("adiou", { ref: ref, para: destino })] };
  }

  /* Cena de Tensão: Personas podem trocar de posição entre si (p. 120). */
  function trocarNaTensao(m, a, b) {
    if (!m.cena || m.cena.tipo !== "tensao") return { ok: false, motivo: "Só numa Cena de Tensão." };
    var o = m.cena.ordem;
    var ia = o.findIndex(function (x) { return x.ref === a; }), ib = o.findIndex(function (x) { return x.ref === b; });
    if (ia < 0 || ib < 0 || o[ia].tipo !== "persona" || o[ib].tipo !== "persona") return { ok: false, motivo: "Escolha duas Personas." };
    var t = o[ia]; o[ia] = o[ib]; o[ib] = t;
    return { ok: true };
  }

  /* Sucessos acumulados numa Cena de Tensão (Extremo vale 2; Escapar
     como Ação Completa dobra — p. 87). */
  function somarNaTensao(m, resultado, completa) {
    if (!m.cena || !m.cena.tensao) return { ok: false };
    var s = K.sucessosDe(resultado) * (completa ? 2 : 1);
    m.cena.tensao.acumulados += s;
    var t = m.cena.tensao;
    return { ok: true, acumulados: t.acumulados, alcancou: t.meta > 0 && t.acumulados >= t.meta };
  }

  function fimDaRodadaDaMesa(m, rolador) {
    var eventos = [];
    if (m.farol.aceso && m.cena && (m.cena.tipo === "combate" || m.cena.tipo === "tensao")) eventos = eventos.concat(consumirLuz(m, "rodada").eventos);
    /* Apagou por falta de combustível: até o fim da próxima rodada para
       reacender; depois disso, a Escuridão (1D6 rodadas). */
    if (m.farol.apagada && m.farol.apagada.graca && !m.farol.aceso) {
      if (m.cena && m.cena.rodada > m.farol.apagada.rodadaApagou) {
        if (rolador) eventos = eventos.concat(escuridao(m, rolador).eventos);
        else eventos.push(ev("escuridaoPendente", { texto: "Role 1D6 para a Escuridão." }));
      }
    } else if (m.farol.apagada && m.farol.apagada.rodadas !== undefined) {
      m.farol.apagada.restam--;
      if (m.farol.apagada.restam <= 0 && !m.farol.aceso) {
        eventos.push(ev("escuridao", { texto: "A luz não voltou: todas as Personas ficam Fora de Ação e morrem (p. 81)." }));
        m.farol.apagada.consumada = true;
      }
    }
    if (m.cena && m.cena.tensao && m.cena.tensao.rodadas) {
      m.cena.tensao.rodadasPassadas = (m.cena.tensao.rodadasPassadas || 0) + 1;
      if (m.cena.tensao.rodadasPassadas >= m.cena.tensao.rodadas) eventos.push(ev("tensaoEsgotada", { meta: m.cena.tensao.meta, acumulados: m.cena.tensao.acumulados, aoAcabar: m.cena.tensao.aoAcabar }));
    }
    return { eventos: eventos };
  }

  /* ---------------------------------------------------------------
     FILEIRAS E ALCANCE (pp. 117–118)
     --------------------------------------------------------------- */

  /* Posição do alvo na fileira DELE, contando as casas que cada um
     ocupa: a primeira casa ocupada é Adjacente, a segunda Curto…, da
     quinta em diante Absoluto. Não é distância em metros (C9). */
  function casaDoAlvo(m, alvoId, casasDe) {
    var lista = m.fileiras.personas.indexOf(alvoId) >= 0 ? m.fileiras.personas : m.fileiras.ameacas;
    var casa = 0;
    for (var i = 0; i < lista.length; i++) {
      casa += 1;
      if (lista[i] === alvoId) return casa;
      casa += Math.max(1, R.inteiro(casasDe ? casasDe(lista[i]) : 1, 1, 9, 1)) - 1;
    }
    return 0;
  }
  function alcanceDe(casa) {
    if (casa <= 0) return null;
    return C.ALCANCES[Math.min(5, casa) - 1];
  }
  function noAlcance(m, alvoId, alcanceChave, casasDe) {
    var casa = casaDoAlvo(m, alvoId, casasDe);
    var max = C.alcance[alcanceChave] ? C.alcance[alcanceChave].casa : 1;
    return { ok: casa > 0 && (max >= 5 || casa <= max), casa: casa, alcance: alcanceDe(casa) };
  }
  function adjacentesNaFileira(m, personaId) {
    var l = m.fileiras.personas, i = l.indexOf(personaId);
    if (i < 0) return [];
    return [l[i - 1], l[i + 1]].filter(Boolean);
  }
  function moverNaFileira(m, ref, novaPosicao) {
    var lista = m.fileiras.personas.indexOf(ref) >= 0 ? m.fileiras.personas : m.fileiras.ameacas;
    var i = lista.indexOf(ref);
    if (i < 0) return { ok: false };
    lista.splice(i, 1);
    lista.splice(Math.max(0, Math.min(lista.length, R.inteiro(novaPosicao, 0, 99, 0))), 0, ref);
    return { ok: true, eventos: problemasDoFarol(m).map(function (p) { return ev("farolProblema", p); }) };
  }

  /* Escudo Humano (p. 59): quem está ATRÁS de uma Quem Protege com a
     habilidade recebe metade da Carne dela em Proteção — enquanto ela
     não estiver No Chão. fichas: { id: blocoOblivio }. */
  function bonusDeGrupo(m, fichas, personaId) {
    var bonus = [];
    var l = m.fileiras.personas;
    var i = l.indexOf(personaId);
    if (i < 0) return bonus;
    for (var j = 0; j < i; j++) {
      var o = fichas[l[j]];
      if (!o || !R.temHabilidade(o, "escudoHumano") || R.estadoDaPersona(o) !== "ativa") continue;
      if (R.temMazela(o, "noChao")) continue;
      bonus.push({ fonte: "Escudo Humano", valor: R.metade(R.atributosEfetivos(o).carne), de: l[j] });
      break;
    }
    return bonus;
  }

  /* Repartir a Dor: quem pode dividir o dano que esta Persona sofreu. */
  function podeRepartirADor(m, fichas, personaId) {
    var l = m.fileiras.personas, i = l.indexOf(personaId);
    for (var j = 0; j < i; j++) {
      var o = fichas[l[j]];
      if (o && R.temHabilidade(o, "escudoHumano") && R.temHabilidade(o, "repartirADor") && R.estadoDaPersona(o) === "ativa" && !R.temMazela(o, "noChao")) return l[j];
    }
    return "";
  }

  /* ---------------------------------------------------------------
     FAROL E ESCURIDÃO (pp. 80–81)
     --------------------------------------------------------------- */

  function definirFarol(m, personaId, itemId) {
    m.farol.persona = personaId; m.farol.item = itemId || "";
    return { ok: true, eventos: problemasDoFarol(m).map(function (p) { return ev("farolProblema", p); }) };
  }

  /* Acender com uma Fonte de Luz (1 cena ou 6 rodadas; metade no Buraco
     Escuro). */
  function acender(m, opcoes) {
    var op = opcoes || {};
    var mult = op.efetividade ? 2 : 1;
    var esc = m.buraco && m.buraco.regras && m.buraco.regras.luz ? m.buraco.regras.luz : 1;
    /* Uma medida só: 6 rodadas = 1 cena (p. 80). Fora de combate, cada
       cena nova gasta 6. */
    m.farol.aceso = true; m.farol.derrubado = false; m.farol.apagada = null;
    m.farol.rodadas = Math.max(1, Math.floor(6 * mult * esc));
    m.farol.cenas = Math.floor(m.farol.rodadas / 6);
    return { ok: true, eventos: [ev("luzAcesa", { rodadas: m.farol.rodadas })] };
  }

  /* Abastecer (Combustível): +1 cena ou +6 rodadas. Quem não é o Farol
     precisa estar adjacente e gasta Movimento + Regular. */
  function abastecer(m, quemId, opcoes) {
    var op = opcoes || {};
    if (quemId !== m.farol.persona && adjacentesNaFileira(m, m.farol.persona).indexOf(quemId) < 0) return { ok: false, motivo: "Para abastecer, fique adjacente ao Farol." };
    var mult = op.efetividade ? 2 : 1;
    var esc = m.buraco && m.buraco.regras && m.buraco.regras.luz ? m.buraco.regras.luz : 1;
    var eraApagada = !m.farol.aceso;
    if (eraApagada) return acender(m, op);
    m.farol.rodadas += Math.floor(6 * mult * esc);
    m.farol.cenas = Math.floor(m.farol.rodadas / 6);
    return { ok: true, acoes: quemId === m.farol.persona ? ["regular"] : ["movimento", "regular"], eventos: [ev("luzAbastecida", { rodadas: m.farol.rodadas })] };
  }

  function consumirLuz(m, unidade) {
    var eventos = [];
    if (!m.farol.aceso) return { eventos: eventos };
    m.farol.rodadas = Math.max(0, m.farol.rodadas - (unidade === "rodada" ? 1 : 6));
    m.farol.cenas = Math.floor(m.farol.rodadas / 6);
    if (m.farol.rodadas <= 0) {
      m.farol.aceso = false;
      /* Apagou: até o fim da próxima rodada para reacender (p. 80). */
      m.farol.apagada = { motivo: "combustivel", graca: true, rodadaApagou: m.cena ? m.cena.rodada : 0 };
      eventos.push(ev("luzApagando", { texto: "A chama apagou: reacendam até o fim da próxima rodada." }));
    }
    return { eventos: eventos };
  }

  /* A luz apagou de vez: Cena de Tensão e 1D6 (1–3: 1 rodada; 4–6: 2). */
  function escuridao(m, rolador) {
    var d = rolador(6);
    var rodadas = d <= 3 ? 1 : 2;
    m.farol.aceso = false;
    m.farol.apagada = { motivo: "apagou", d6: d, rodadas: rodadas, restam: rodadas };
    var r = m.cena && (m.cena.tipo === "tensao" || m.cena.tipo === "combate") ? { ok: true, momentos: [], eventos: [] } : iniciarCena(m, "tensao", [], { rodadas: rodadas, motivo: "Escuridão" });
    return { ok: true, d6: d, rodadas: rodadas, momentos: r.momentos, eventos: (r.eventos || []).concat([ev("escuridaoIminente", { rodadas: rodadas, d6: d })]) };
  }

  /* Derrubada (sem região livre, efeito): Cena de Tensão até o próximo
     turno de quem a derrubou para alguém pegar. */
  function derrubarLuz(m, quem) {
    m.farol.derrubado = true; m.farol.derrubadaPor = quem || "";
    return { ok: true, eventos: [ev("luzDerrubada", { ate: "próximo turno de " + (quem || "quem derrubou") })] };
  }
  function pegarLuz(m, quemId, mesmaZona) {
    if (!m.farol.derrubado) return { ok: false, motivo: "A luz não está no chão." };
    m.farol.derrubado = false; m.farol.persona = quemId;
    return { ok: true, acoes: mesmaZona ? ["movimento|regular"] : ["movimento", "regular"], eventos: [ev("luzRecuperada", { por: quemId })] };
  }

  /* Problemas do Farol (p. 80): extremidades da fileira deixam a Persona
     da ponta oposta No Escuro; Farol sem região livre derruba a luz. */
  function problemasDoFarol(m, fichas, luzesAcesas) {
    var p = [];
    var l = m.fileiras.personas;
    var f = m.farol.persona;
    if (!f) { p.push({ chave: "semFarol", texto: "O grupo não elegeu um Farol." }); return p; }
    var i = l.indexOf(f);
    if (l.length >= 2 && i === 0) p.push({ chave: "extremidade", noEscuro: l[l.length - 1], texto: "O Farol está no início da fileira: a última Persona fica No Escuro." });
    if (l.length >= 2 && i === l.length - 1) p.push({ chave: "extremidade", noEscuro: l[0], texto: "O Farol está no fim da fileira: a primeira Persona fica No Escuro." });
    if (l.length === 2) p.push({ chave: "doisNaFileira", texto: "Com duas Personas, o Farol sempre fica numa ponta." });
    if (fichas && fichas[f]) {
      var o = fichas[f];
      var livres = R.regioesPresentes(o).filter(function (r) { return !R.esgotada(r); });
      if (!livres.length) p.push({ chave: "semRegiao", texto: "O Farol não tem região livre para carregar a luz: ela é derrubada." });
    }
    if ((luzesAcesas || 0) > 1) p.push({ chave: "duasLuzes", gatilho: true, texto: "Mais de uma fonte de luz acesa no grupo atrai a atenção do Oblívio — a Testemunha decide a consequência." });
    if (m.farol.derrubado) p.push({ chave: "derrubada", texto: "A luz está no chão." });
    return p;
  }

  /* ---------------------------------------------------------------
     ENCONTRO — instâncias e Proteção dos alvos
     --------------------------------------------------------------- */

  function adicionarAmeaca(m, chave, rolador, opcoes) {
    var inst = AM.criarInstancia(chave, rolador, opcoes);
    if (!inst) return { ok: false, motivo: "Ameaça desconhecida." };
    m.encontro.ameacas.push(inst);
    m.fileiras.ameacas.push(inst.id);
    m.encontro.protecoes[inst.id] = K.novoEstadoDeProtecao(AM.protecaoCompleta(inst, { personasNaCena: m.fileiras.personas.length, ajustes: m.ajustes }).total);
    return { ok: true, ameaca: inst, eventos: [ev("ameacaEntrou", { nome: inst.nome, id: inst.id })] };
  }

  function instancia(m, id) { return m.encontro.ameacas.filter(function (a) { return a.id === id; })[0] || null; }

  /* O estado de Proteção de um alvo, criado com a completa atual. */
  function protecaoDoAlvo(m, alvoId, completa) {
    var p = m.encontro.protecoes[alvoId];
    if (!p) { p = K.novoEstadoDeProtecao(completa); m.encontro.protecoes[alvoId] = p; }
    else if (completa !== undefined && completa !== p.completa) K.atualizarCompleta(p, completa);
    return p;
  }

  /* Escapar (p. 87): sucessos ≥ Grau da Ameaça; várias, a maior + o
     número de Ameaças em combate. */
  function sucessosParaEscapar(m) {
    var ativas = m.encontro.ameacas.filter(function (a) { return a.estado === "ativa"; });
    if (!ativas.length) return 0;
    var maior = ativas.reduce(function (s, a) { return Math.max(s, a.grau); }, 0);
    return ativas.length === 1 ? maior : maior + ativas.length;
  }

  /* ---------------------------------------------------------------
     DESCANSO PERIGOSO (p. 119)
     --------------------------------------------------------------- */

  /* 1D6: 5–6 nada; 1–4 um Encontro e metade da cura. Cada sucesso de
     vigília (Extremo = 2) tira 1 da chance. */
  function descansoPerigoso(rolador, sucessosDeVigilia) {
    var d = rolador(6);
    var limite = Math.max(0, 4 - R.inteiro(sucessosDeVigilia, 0, 9, 0));
    var encontro = d <= limite;
    return { d6: d, limite: limite, encontro: encontro };
  }

  /* ---------------------------------------------------------------
     VISTA DOS JOGADORES — sem o que é da Testemunha
     --------------------------------------------------------------- */

  function vistaDosJogadores(m) {
    var v = R.copiar(m);
    v.registro = v.registro.filter(function (r) { return !r.privado; });
    v.encontro.ameacas = v.encontro.ameacas.map(function (a) {
      return { id: a.id, chave: a.chave, nome: a.nome, grau: a.grau, estado: a.estado, casas: a.casas,
        /* O que se vê em jogo: quanto já apanhou, não a ficha. */
        ferida: a.limite ? Math.round(100 * a.estresse / a.limite) : 0, regioes: a.regioes.length };
    });
    if (v.buraco && global.RAMAOblivioMotorBuraco) v.buraco = global.RAMAOblivioMotorBuraco.vistaDosJogadores(v.buraco);
    delete v.operacoes;
    return v;
  }

  function aplicarOperacao(m, opId, fn) {
    var id = String(opId || "").slice(0, 120);
    if (!id) return { ok: false, motivo: "Operação sem identificação." };
    if (m.operacoes.indexOf(id) >= 0) return { ok: true, repetida: true, eventos: [], momentos: [] };
    var r = fn(m) || { ok: true };
    if (r.ok !== false) { m.operacoes.push(id); if (m.operacoes.length > 300) m.operacoes = m.operacoes.slice(-300); }
    return r;
  }

  global.RAMAOblivioMesa = {
    estadoVazio: estadoVazio, normalizar: normalizar, registrar: registrar,
    iniciarMissao: iniciarMissao, registrarMorte: registrarMorte, concluirMissao: concluirMissao,
    ordemDeAcao: ordemDeAcao, iniciarCena: iniciarCena, encerrarCena: encerrarCena, atual: atual,
    avancarTurno: avancarTurno, adiar: adiar, trocarNaTensao: trocarNaTensao, somarNaTensao: somarNaTensao,
    casaDoAlvo: casaDoAlvo, alcanceDe: alcanceDe, noAlcance: noAlcance, adjacentesNaFileira: adjacentesNaFileira,
    moverNaFileira: moverNaFileira, bonusDeGrupo: bonusDeGrupo, podeRepartirADor: podeRepartirADor,
    definirFarol: definirFarol, acender: acender, abastecer: abastecer, consumirLuz: consumirLuz,
    escuridao: escuridao, derrubarLuz: derrubarLuz, pegarLuz: pegarLuz, problemasDoFarol: problemasDoFarol,
    adicionarAmeaca: adicionarAmeaca, instancia: instancia, protecaoDoAlvo: protecaoDoAlvo,
    sucessosParaEscapar: sucessosParaEscapar, descansoPerigoso: descansoPerigoso,
    vistaDosJogadores: vistaDosJogadores, aplicarOperacao: aplicarOperacao,
  };
})(typeof window !== "undefined" ? window : globalThis);
/* <<< js/oblivio/mesa.js */

/* >>> js/oblivio/buraco.js */
/* =====================================================================
   R.A.M.A. — Oblívio · motor do Buraco (pp. 98–115)
   =====================================================================
   A exploração como ferramenta da mesa, com as tabelas alternativas do
   livro no lugar do baralho físico.

   O Buraco é um grafo de CARTAS (cômodos) em andares. Cada carta guarda
   o tipo, as conexões que ainda aceita, as ligações feitas, o resultado
   da tabela dela e os EVENTOS estruturados (de js/oblivio/buraco-
   dados.js), com o estado de cada um: pendente, resolvido. Revisitar
   não repete o que já foi resolvido — só Déjà-vu e Coringa mandam.

   Privado da Testemunha: cartas ainda não reveladas e o conteúdo de
   cartas que só ela viu (vistaDosJogadores tira).
   ===================================================================== */

(function (global) {
  "use strict";

  var T = global.RAMAOblivioBuraco;
  var R = global.RAMAOblivio;
  var A = global.RAMAOblivioAmeacas;

  function ev(tipo, dados) { return R.evento(tipo, dados); }
  function naFaixa(tabela, d) { return tabela.filter(function (x) { return d >= x.de && d <= x.ate; })[0] || null; }

  /* Rola uma tabela de 1D6 e devolve a linha com os eventos copiados,
     cada um com id e estado. */
  function rolarTabela(tabela, rolador, dado) {
    var d = rolador(dado || 6);
    var linha = naFaixa(tabela, d);
    if (!linha) return { d: d, linha: null, eventos: [] };
    return { d: d, linha: linha, chave: linha.chave, nome: linha.nome, resumo: linha.resumo,
      eventos: linha.eventos.map(function (e) { return Object.assign({ id: R.novoId("bv"), estado: "pendente" }, R.copiar(e)); }) };
  }

  function dificuldadeDeEncontro(personas, missoesConcluidas) {
    var p = R.inteiro(personas, 0, 99, 0), mi = R.inteiro(missoesConcluidas, 0, 999, 0);
    function nivel(n, campo) { for (var i = 0; i < T.DIFICULDADE_DE_ENCONTRO.length; i++) if (n <= T.DIFICULDADE_DE_ENCONTRO[i][campo]) return i; return 2; }
    /* O MAIOR dos dois critérios (p. 104). */
    return T.DIFICULDADE_DE_ENCONTRO[Math.max(nivel(p, "personasAte"), nivel(mi, "missoesAte"))].chave;
  }

  /* ---------------------------------------------------------------
     FUNDAÇÃO (pp. 98–102)
     --------------------------------------------------------------- */

  function criarBuraco(rolador, opcoes) {
    var op = opcoes || {};
    var b = { v: 1, id: R.novoId("bu"), andares: [], cartas: [], atual: "", efeito: null, missao: null, regras: {},
      personas: R.inteiro(op.personas, 1, 20, 4), missoesConcluidas: R.inteiro(op.missoesConcluidas, 0, 999, 0),
      combatesVencidos: 0, cenasPassadas: 0, saidasFalsasAte: 1, dejaVu: false, encerrado: null };
    var eventos = [];
    if (!op.semEfeito) {
      var ef = rolarTabela(T.EFEITO, rolador);
      b.efeito = { d: ef.d, chave: ef.chave, nome: ef.nome, resumo: ef.resumo };
      ef.eventos.forEach(function (e) { if (e.tipo === "regraDoBuraco") aplicarRegra(b, e); });
      eventos.push(ev("efeitoDoBuraco", { nome: ef.nome, d6: ef.d }));
    }
    if (!op.semMissao) {
      var mi = rolarTabela(T.MISSAO, rolador);
      b.missao = { d: mi.d, chave: mi.chave, nome: mi.nome, resumo: mi.resumo, objetivo: mi.linha.objetivo, carta: mi.linha.carta, cumprida: false, eventos: mi.eventos };
      mi.eventos.forEach(function (e) {
        if (e.tipo === "objetivoDeMissao" && e.combates) {
          var n = Math.max(e.combates.minimo || 1, R.metade(b.personas)) + R.rolarExpressao(e.combates.mais, rolador).total;
          b.missao.combatesNecessarios = n;
        }
        if (e.tipo === "objetivoDeMissao" && e.rolarObjetivoAntes) {
          b.missao.objetivoAntes = rolarObjetivo(b, rolador);
          /* Ache a Saída: o Objetivo é rolado antes e já vale como regra. */
          b.missao.objetivoAntes.eventos.forEach(function (x) { if (x.tipo === "regraDoBuraco") { aplicarRegra(b, x); x.estado = "resolvido"; } });
        }
        if (e.tipo === "objetivoDeMissao" && e.entradaFechada) b.regras.entradaFechada = true;
      });
      eventos.push(ev("missaoDoBuraco", { nome: mi.nome, d6: mi.d }));
    }
    novoAndar(b, rolador);
    return { ok: true, buraco: b, eventos: eventos };
  }

  function aplicarRegra(b, e) {
    ["recuperacao", "perdaDeCoragem", "descansoTotal", "luz", "semDescanso", "foraDeAcao", "colapso", "saidaFalsaAte", "perseguicao"].forEach(function (k) {
      if (e[k] !== undefined) b.regras[k] = R.copiar(e[k]);
    });
    if (e.saidaFalsaAte) b.saidasFalsasAte = e.saidaFalsaAte;
  }

  function novoAndar(b, rolador) {
    var andar = { id: R.novoId("an"), n: b.andares.length + 1 };
    b.andares.push(andar);
    var d = rolador(12);
    var linha = naFaixa(T.ENTRADA, d);
    var carta = { id: R.novoId("ct"), andar: andar.id, tipo: "entrada", conexoes: linha.conexoes, ligacoes: [], revelada: true, explorada: true, d: d, resultado: null, eventos: [] };
    b.cartas.push(carta);
    if (!b.atual) b.atual = carta.id;
    return carta;
  }

  /* ---------------------------------------------------------------
     CONSTRUÇÃO (pp. 103–115)
     --------------------------------------------------------------- */

  function carta(b, id) { return b.cartas.filter(function (c) { return c.id === id; })[0] || null; }
  function livres(c) { return Math.max(0, c.conexoes - c.ligacoes.length); }

  /* Seguir por uma extremidade livre da carta atual: saca uma carta de
     Construção (1D100; 61+ rola de novo), liga as duas e resolve a
     tabela da carta nova. */
  function explorar(b, deId, rolador) {
    var de = carta(b, deId || b.atual);
    if (!de) return { ok: false, motivo: "Carta inexistente." };
    if (b.encerrado) return { ok: false, motivo: "A exploração terminou." };
    if (!livres(de)) return { ok: false, motivo: "Esta carta não tem mais conexões livres." };
    var d;
    var tentativas = [];
    do { d = rolador(100); tentativas.push(d); } while (d > T.CONSTRUCAO_REROLA_ACIMA && tentativas.length < 50);
    var linha = naFaixa(T.CONSTRUCAO, d);
    var nova = { id: R.novoId("ct"), andar: de.andar, tipo: linha.carta, conexoes: linha.conexoes, ligacoes: [de.id], revelada: true, explorada: true, d: d, rerolagens: tentativas.length - 1, resultado: null, eventos: [] };
    de.ligacoes.push(nova.id);
    b.cartas.push(nova);
    b.atual = nova.id;
    var r = resolverCarta(b, nova, rolador);
    return { ok: true, carta: nova, eventos: [ev("cartaSacada", { tipo: nova.tipo, d100: d, conexoes: nova.conexoes })].concat(r.eventos) };
  }

  /* A tabela de cada tipo de carta. */
  function resolverCarta(b, c, rolador) {
    var eventos = [];
    var tab = null;
    if (c.tipo === "armadilha") tab = rolarTabela(T.ARMADILHA, rolador);
    if (c.tipo === "encontro") {
      c.dificuldade = dificuldadeDeEncontro(b.personas, b.missoesConcluidas);
      tab = rolarTabela(T.ENCONTRO[c.dificuldade], rolador);
    }
    if (c.tipo === "infortunio") tab = rolarTabela(T.INFORTUNIO, rolador);
    if (c.tipo === "saida") {
      tab = rolarTabela(T.SAIDA, rolador);
      /* Fim da Linha: Saída Falsa com 1–3. Última Saída nunca é falsa. */
      if (b.saidasFalsasAte > 1 && tab.d <= b.saidasFalsasAte) tab = Object.assign(tab, forcarLinha(T.SAIDA, "saidaFalsa"));
    }
    if (c.tipo === "segredo") tab = rolarTabela(T.SEGREDO, rolador);
    if (c.tipo === "tesouro") tab = rolarTabela(T.TESOURO, rolador);
    if (c.tipo === "objetivo" && b.missao) tab = rolarObjetivo(b, rolador);
    if (c.tipo === "escada") {
      var andar = novoAndar(b, rolador);
      c.leva = andar.id;
      eventos.push(ev("novoAndar", { andar: andar.andar }));
    }
    if (c.tipo === "vazio") eventos.push(ev("cartaVazia", {}));
    if (tab) {
      c.resultado = { d: tab.d, chave: tab.chave, nome: tab.nome, resumo: tab.resumo };
      c.eventos = tab.eventos;
      eventos.push(ev("resultadoDaCarta", { tipo: c.tipo, nome: tab.nome, d: tab.d }));
    }
    /* A carta da Missão: Encontro/Segredo/Vazio/Tesouro aciona o
       Objetivo também (p. 102). */
    /* Ache a Saída já rolou o Objetivo antes: achar a Saída é o próprio
       objetivo (cumprido ao sair por ela). */
    if (b.missao && b.missao.carta === c.tipo && c.tipo !== "objetivo" && !b.missao.cumprida && !b.missao.objetivoAntes) {
      var obj = rolarObjetivo(b, rolador);
      c.objetivo = { nome: obj.nome, chave: obj.chave, d: obj.d, eventos: obj.eventos };
      eventos.push(ev("objetivo", { nome: obj.nome }));
    }
    if (c.tipo === "encontro") b.combatesPendentes = (b.combatesPendentes || 0) + 1;
    return { eventos: eventos };
  }

  function forcarLinha(tabela, chave) {
    var l = tabela.filter(function (x) { return x.chave === chave; })[0];
    return { linha: l, chave: l.chave, nome: l.nome, resumo: l.resumo, eventos: l.eventos.map(function (e) { return Object.assign({ id: R.novoId("bv"), estado: "pendente" }, R.copiar(e)); }) };
  }

  function rolarObjetivo(b, rolador) {
    var tabela = T.OBJETIVO[b.missao ? b.missao.objetivo : "salveODia"];
    return rolarTabela(tabela, rolador);
  }

  /* Revisitar uma carta: o que já foi resolvido não repete. Déjà-vu e a
     Armadilha Coringa mandam repetir. */
  function entrar(b, cartaId, rolador) {
    var c = carta(b, cartaId);
    if (!c) return { ok: false, motivo: "Carta inexistente." };
    var anterior = carta(b, b.atual);
    var ligada = anterior && (anterior.ligacoes.indexOf(c.id) >= 0 || c.ligacoes.indexOf(anterior.id) >= 0 || (anterior.passagem === c.id) || (c.passagem === anterior.id));
    if (anterior && anterior.id !== c.id && !ligada) return { ok: false, motivo: "Não há caminho direto até essa carta." };
    if (c.bloqueadaDe && anterior && c.bloqueadaDe === anterior.id) return { ok: false, motivo: "O caminho está bloqueado (Desmoronamento)." };
    b.atual = c.id;
    var eventos = [ev("entrou", { tipo: c.tipo })];
    var coringa = c.eventos.filter(function (e) { return e.tipo === "armadilhaArmada" && e.estado === "pendente"; })[0];
    if (coringa) {
      coringa.estado = "resolvido";
      var tab = rolarTabela(T.ARMADILHA, rolador);
      c.eventos = c.eventos.concat(tab.eventos);
      eventos.push(ev("armadilhaDisparou", { nome: tab.nome, d6: tab.d }));
    }
    if (b.dejaVu && c.explorada && c.resultado) {
      b.dejaVu = false;
      c.eventos = c.eventos.map(function (e) { return Object.assign({}, e, { id: R.novoId("bv"), estado: "pendente" }); });
      eventos.push(ev("dejaVu", { carta: c.id }));
    }
    return { ok: true, carta: c, eventos: eventos };
  }

  /* Marca um evento da carta como resolvido (depois que a mesa aplicou:
     encontro vencido, teste feito, item entregue). */
  function resolverEvento(b, cartaId, eventoId, resultado) {
    var c = carta(b, cartaId);
    var e = c ? c.eventos.concat(c.objetivo ? c.objetivo.eventos : []).filter(function (x) { return x.id === eventoId; })[0] : null;
    if (!e) return { ok: false, motivo: "Evento inexistente." };
    if (e.estado === "resolvido") return { ok: true, repetida: true };
    e.estado = "resolvido";
    e.resultado = R.copiar(resultado || {});
    var eventos = [];
    if (e.tipo === "iniciarEncontro" && resultado && resultado.vencido) {
      b.combatesVencidos++;
      if (b.missao && b.missao.combatesNecessarios && b.combatesVencidos >= b.missao.combatesNecessarios) { b.missao.cumprida = true; eventos.push(ev("missaoCumprida", {})); }
    }
    if (e.tipo === "dejaVu") b.dejaVu = true;
    if (e.tipo === "bloquearConexao") c.bloqueada = true;
    if (e.tipo === "objetivoCumprido") { b.missao.cumprida = true; eventos.push(ev("missaoCumprida", {})); }
    if (e.tipo === "passagem" && resultado && resultado.ate) c.passagem = resultado.ate;
    if (e.tipo === "regraDoBuraco") aplicarRegra(b, e);
    return { ok: true, eventos: eventos };
  }

  /* Expande um evento estruturado no que a mesa precisa fazer: as
     Ameaças a pôr em combate, os itens a entregar, os testes a pedir.
     Rola o que o evento manda rolar. */
  function expandirEvento(e, rolador, contexto) {
    var cx = contexto || {};
    var saida = { ameacas: [], itens: [], testes: [], cura: null, dano: null, tensao: null, escolhas: [], notas: [] };
    if (e.tipo === "iniciarEncontro" || e.tipo === "encontroDeObjetivo") {
      var lista = e.ameacas ? R.copiar(e.ameacas) : [];
      if (e.tipo === "encontroDeObjetivo") {
        var tab = rolarTabela(T.ENCONTRO[cx.dificuldade || "facil"], rolador);
        lista = tab.eventos[0] ? R.copiar(tab.eventos[0].ameacas) : [];
        saida.notas.push("Encontro rolado: " + tab.nome);
        if (e.multiplica) lista.forEach(function (a) { a.qtd *= e.multiplica; });
        if (e.mais) lista.push({ grau: e.mais.grau, qtd: e.mais.qtd, aleatoria: true });
        if (e.acaoExtra) saida.notas.push("Todas as Ameaças ganham uma Ação Regular a mais por turno.");
      }
      lista.forEach(function (a) {
        if (a.grau && !a.ameaca) {
          var op = A.porGrau(a.grau);
          a.ameaca = op[rolador(op.length) - 1].chave;
        }
      });
      saida.ameacas = lista;
      if (e.vinculo) {
        var dv = rolador(6);
        var sala = (e.vinculo.salas.filter(function (s) { return dv >= s[0] && dv <= s[1]; })[0] || [0, 0, 0])[2];
        saida.vinculo = { d6: dv, salasAdiante: sala, sucessos: e.vinculo.sucessos, conhecimento: e.vinculo.conhecimento, coletivo: e.vinculo.coletivo };
      }
      if (e.prazo) saida.tensao = { rodadas: e.prazo.rodadas, senao: e.prazo.senao };
    }
    if (e.tipo === "encontroPorGrau") {
      var d = rolador(6);
      var l = e.tabela.filter(function (x) { return d >= x.de && d <= x.ate; })[0];
      l.graus.forEach(function (g) { var op2 = A.porGrau(g[0]); for (var i = 0; i < g[1]; i++) saida.ameacas.push({ ameaca: op2[rolador(op2.length) - 1].chave, qtd: 1 }); });
    }
    if (e.tipo === "teste" || e.tipo === "testeOpcional") saida.testes.push({ quem: e.quem || "um", conhecimento: e.conhecimento, falha: e.falha || null, sucesso: e.sucesso || null, extremo: e.extremo || null });
    if (e.tipo === "tensao") saida.tensao = { rodadas: e.rodadas, sucessos: e.sucessos, conhecimentos: e.conhecimentos, falha: e.falha || null, porFalha: e.porFalha || null };
    if (e.tipo === "explosao") {
      var dx = rolador(6);
      var lx = e.tabela.filter(function (x) { return dx >= x.de && dx <= x.ate; })[0];
      var qtd = typeof lx.qtd === "number" ? lx.qtd : R.rolarExpressao(lx.qtd, rolador).total;
      saida.testes.push({ quem: "todos", conhecimento: e.teste, bomba: lx.bomba, qtd: qtd });
      saida.notas.push(qtd + "× " + lx.bomba);
    }
    if (e.tipo === "aposta") {
      var da = rolador(6);
      var lado = da <= 3 ? e.baixo : e.alto;
      if (lado.todos.dano) saida.dano = { todos: R.rolarExpressao(lado.todos.dano, rolador).total };
      if (lado.todos.cura) saida.cura = { todos: R.rolarExpressao(lado.todos.cura, rolador).total };
    }
    if (e.tipo === "cura") saida.cura = { todos: e.todos };
    if (e.tipo === "coragem") saida.coragem = { todos: e.todos };
    if (e.tipo === "reparo") saida.reparo = { cada: e.todos };
    if (e.tipo === "moedas") saida.moedas = { cada: e.cada };
    if (e.tipo === "itemPorD6") saida.itensPorPersona = e.tabela;
    if (e.tipo === "contrabando") {
      var dc = rolador(6);
      var armas = dc >= e.armas[0] && dc <= e.armas[1];
      var n = R.rolarExpressao(e.qtd, rolador).total;
      for (var k = 0; k < n; k++) {
        var dp = rolador(6);
        var peso = dp <= e.peso.leve[1] ? "leve" : dp <= e.peso.media[1] ? "media" : "pesada";
        saida.escolhas.push({ tipo: armas ? "arma" : "protecao", peso: peso, texto: (armas ? "Uma arma " : "Uma proteção ") + peso + " à escolha" });
      }
    }
    if (e.tipo === "escolhaDeCada") saida.escolhas.push({ tipo: "santuario", opcoes: e.opcoes });
    if (e.tipo === "modificacaoGratis") saida.escolhas.push({ tipo: "modificacaoGratis", cada: e.cada });
    if (e.tipo === "perderItem") saida.escolhas.push({ tipo: "bolsoFurado" });
    return saida;
  }

  /* Sair do Buraco por uma carta de Saída (ou pela Entrada, se o Efeito
     da Missão não a fechou). */
  function sair(b, cartaId) {
    var c = carta(b, cartaId || b.atual);
    if (!c) return { ok: false, motivo: "Carta inexistente." };
    if (c.tipo === "entrada" && b.regras.entradaFechada) return { ok: false, motivo: "Ache a Saída: a Entrada não serve mais de saída." };
    if (c.tipo !== "saida" && c.tipo !== "entrada") return { ok: false, motivo: "Só se sai por uma Saída ou pela Entrada." };
    if (c.tipo === "saida" && c.resultado && c.resultado.chave === "saidaFalsa") return { ok: false, motivo: "Era uma Saída Falsa." };
    var cura = c.resultado && c.resultado.chave === "saidaDeEmergencia";
    b.encerrado = { por: c.id, curaTotal: !!cura, volta: !(cura) };
    if (b.missao && b.missao.chave === "acheASaida" && c.tipo === "saida") b.missao.cumprida = true;
    return { ok: true, curaTotal: !!cura, eventos: [ev("saiuDoBuraco", { curaTotal: !!cura })] };
  }

  /* A vista dos Jogadores: só cartas exploradas e o que foi revelado.
     Eventos pendentes da Testemunha (vínculos, armadilhas armadas)
     aparecem só como "algo aqui". */
  function vistaDosJogadores(b) {
    var v = R.copiar(b);
    v.cartas = v.cartas.filter(function (c) { return c.revelada; }).map(function (c) {
      return { id: c.id, andar: c.andar, tipo: c.tipo, conexoes: c.conexoes, ligacoes: c.ligacoes, resultado: c.resultado ? { nome: c.resultado.nome, resumo: c.resultado.resumo } : null,
        eventos: c.eventos.filter(function (e) { return e.tipo !== "armadilhaArmada"; }).map(function (e) { return { id: e.id, tipo: e.tipo, estado: e.estado }; }), bloqueada: !!c.bloqueada };
    });
    if (v.missao) v.missao = { nome: v.missao.nome, resumo: v.missao.resumo, cumprida: v.missao.cumprida };
    return v;
  }

  global.RAMAOblivioMotorBuraco = {
    criarBuraco: criarBuraco, explorar: explorar, entrar: entrar, resolverEvento: resolverEvento, expandirEvento: expandirEvento,
    sair: sair, carta: carta, livres: livres, dificuldadeDeEncontro: dificuldadeDeEncontro, rolarTabela: rolarTabela,
    rolarObjetivo: rolarObjetivo, vistaDosJogadores: vistaDosJogadores, novoAndar: novoAndar,
  };
})(typeof window !== "undefined" ? window : globalThis);
/* <<< js/oblivio/buraco.js */

/* >>> js/oblivio/habilidades.js */
/* =====================================================================
   R.A.M.A. — Oblívio · habilidades e ações específicas
   =====================================================================
   Cada habilidade e cada ação específica do livro como uma função:

     usar(chave, contexto) → { ok, motivo?, eventos[], pendente? }

   contexto:
     fichas   { id: blocoOblivio } — as Personas ENVOLVIDAS (quem usa e
              os alvos). Na ficha avulsa, só a própria; na campanha, o
              servidor carrega as que a operação toca e confere a
              permissão de cada uma (habilidade de aliado não dá edição
              genérica da ficha dele).
     quem     id de quem usa
     alvos    [ids] de Personas alvo (quando houver)
     mesa     estado da mesa (js/oblivio/mesa.js) ou null (avulsa)
     ctx      { cena, rodada, partida, tipoDeCena, missao }
     rolador  dados
     param    o que a habilidade precisa (mazela, quantidade, escolha…)

   Os limites (por rodada, cena, Descanso, Partida) são conferidos com
   R.podeUsar e registrados SÓ quando a habilidade é de fato aplicada.
   Passivos (Voracidade, Peso Pesado, Escudo Humano, Armadura de
   Espinhos…) não passam por aqui: o motor os aplica onde a condição é
   conhecida (dano, Proteção, ataque recebido).
   ===================================================================== */

(function (global) {
  "use strict";

  var C = global.RAMAOblivioCatalogo;
  var R = global.RAMAOblivio;
  var K = global.RAMAOblivioCombate;
  var M = global.RAMAOblivioMesa;

  function ev(tipo, dados) { return R.evento(tipo, dados); }
  function falha(motivo) { return { ok: false, motivo: motivo, eventos: [] }; }
  function marcar(evs, persona) { return evs.map(function (e) { return Object.assign({ persona: persona }, e); }); }

  function base(cx, chave) {
    var o = cx.fichas && cx.fichas[cx.quem];
    if (!o) return { erro: "Persona não encontrada." };
    var pode = R.podeUsar(o, chave, cx.ctx);
    if (!pode.ok) return { erro: pode.motivo };
    return { o: o };
  }
  function adjacentes(cx, a, b) {
    if (!cx.mesa) return true; /* avulsa: a pessoa informa o contexto */
    if (a === b) return true;
    return M.adjacentesNaFileira(cx.mesa, a).indexOf(b) >= 0;
  }

  /* Cura feita por habilidades do Papel de Quem Cuida em OUTRAS
     Personas, por cena — o que Abrir Feridas usa. */
  function registrarCuraDoPapel(o, valor, ctx) {
    var cena = (ctx && ctx.cena) || "";
    if (o.reservas.curadoNaCena.cena !== cena) o.reservas.curadoNaCena = { cena: cena, valor: 0 };
    o.reservas.curadoNaCena.valor += valor;
    o.reservas.abrirFeridas = o.reservas.curadoNaCena.valor;
  }

  var USOS = {
    /* ----------------------------- Quem Cuida ------------------------ */
    ajudarOsNecessitados: function (cx) {
      var b = base(cx, "ajudarOsNecessitados"); if (b.erro) return falha(b.erro);
      var o = b.o;
      var alvos = (cx.alvos || []).slice(0, 2);
      if (!alvos.length) return falha("Escolha até duas Personas adjacentes.");
      var calma = cx.ctx && (cx.ctx.tipoDeCena === "descanso" || cx.ctx.tipoDeCena === "interacao");
      if (!calma && cx.ctx && cx.ctx.momento !== "inicioDaRodada" && !cx.param.forcar) return falha("Ajudar os Necessitados acontece no início da rodada.");
      var valor = R.metade(R.atributosEfetivos(o).mente);
      var eventos = [];
      var curadoEmOutras = 0;
      for (var i = 0; i < alvos.length; i++) {
        var alvo = cx.fichas[alvos[i]];
        if (!alvo) return falha("Persona alvo não encontrada.");
        if (!adjacentes(cx, cx.quem, alvos[i])) return falha("Só Personas adjacentes.");
        var r = R.recuperarEstresse(alvo, valor, { fonte: "ajudarOsNecessitados", distribuicao: cx.param.distribuicao && cx.param.distribuicao[alvos[i]], ctx: cx.ctx });
        eventos = eventos.concat(marcar(r.eventos, alvos[i]));
        if (alvos[i] !== cx.quem) curadoEmOutras += r.recuperado;
      }
      registrarCuraDoPapel(o, curadoEmOutras, cx.ctx);
      R.registrarUso(o, "ajudarOsNecessitados", cx.ctx, calma ? ["cenaCalma"] : ["rodada"]);
      return { ok: true, eventos: eventos };
    },
    abrirFeridas: function (cx) {
      var b = base(cx, "abrirFeridas"); if (b.erro) return falha(b.erro);
      var o = b.o;
      var cena = (cx.ctx && cx.ctx.cena) || "";
      var acumulado = o.reservas.curadoNaCena.cena === cena ? o.reservas.curadoNaCena.valor : 0;
      if (!acumulado) return falha("Nada curado em outras Personas nesta cena.");
      var extra = R.metade(acumulado);
      R.registrarUso(o, "abrirFeridas", cx.ctx);
      /* O dano extra vai no ataque desta ação (composicaoDoDano com
         usarAbrirFeridas); a reserva zera DEPOIS do acerto. */
      return { ok: true, extra: extra, eventos: [ev("abrirFeridas", { persona: cx.quem, extra: extra })] };
    },
    balsamo: function (cx) {
      var b = base(cx, "balsamo"); if (b.erro) return falha(b.erro);
      var o = b.o;
      var alvoId = (cx.alvos && cx.alvos[0]) || cx.quem;
      var alvo = cx.fichas[alvoId];
      if (!alvo) return falha("Persona alvo não encontrada.");
      if (!adjacentes(cx, cx.quem, alvoId)) return falha("Só em si ou numa Persona adjacente.");
      if (cx.param.regiao) {
        if (R.usosFeitos(o, "balsamoRegiao", "partida", cx.ctx) >= 1) return falha("Recuperar uma região: uma vez por Partida.");
        var reg = R.regiao(alvo, cx.param.regiao);
        if (!reg || reg.estado !== "ausente" || cx.param.regiao === "torso") return falha("Essa região não foi perdida.");
        var limite = R.inteiro(cx.param.limite, 1, 99, 1);
        reg.estado = "organica"; reg.limite = limite; reg.estresse = 0;
        alvo.escolhasPendentes.push({ tipo: "distribuirLimite", id: R.novoId("pe"), texto: "A região voltou: redistribua o limite." });
        var custo = R.receberEstresse(o, limite, { regiao: "torso", origem: { tipo: "balsamo" }, semFerida: true });
        R.registrarUso(o, "balsamoRegiao", cx.ctx, ["partida"]);
        return { ok: true, eventos: [ev("regiaoRecuperada", { persona: alvoId, regiao: cx.param.regiao, limite: limite })].concat(marcar(custo.eventos, cx.quem)) };
      }
      var mz = cx.param.mazela;
      if (!R.temMazela(alvo, mz)) return falha("A Persona não sofre dessa mazela.");
      var r = R.removerMazela(alvo, mz, "balsamo");
      if (!r.ok) return r;
      return { ok: true, eventos: marcar(r.eventos, alvoId) };
    },
    ultimaEsperanca: function (cx) {
      var b = base(cx, "ultimaEsperanca"); if (b.erro) return falha(b.erro);
      var o = b.o;
      o.efeitos.push({ id: R.novoId("ef"), tipo: "ultimaEsperanca", restam: 3, valor: R.metade(R.atributosEfetivos(o).mente), cena: (cx.ctx && cx.ctx.cena) || "" });
      R.registrarUso(o, "ultimaEsperanca", cx.ctx);
      return { ok: true, eventos: [ev("ultimaEsperanca", { persona: cx.quem, vezes: 3 })] };
    },

    /* ----------------------------- Quem Age -------------------------- */
    ataqueEmDupla: function (cx) {
      var b = base(cx, "ataqueEmDupla"); if (b.erro) return falha(b.erro);
      var parceiro = cx.alvos && cx.alvos[0];
      if (!parceiro || !cx.fichas[parceiro]) return falha("Escolha uma Persona adjacente para atacar junto.");
      if (!adjacentes(cx, cx.quem, parceiro)) return falha("A parceira precisa estar adjacente.");
      /* Os dois ataques são resolvidos pela mesa, um de cada vez, contra
         o mesmo alvo; cada um causa dano se acertar (H1). */
      return { ok: true, pendente: { tipo: "ataquesConjuntos", atacantes: [cx.quem, parceiro], acao: "completa" }, eventos: [ev("ataqueEmDupla", { persona: cx.quem, parceiro: parceiro })] };
    },
    estocada: function (cx) {
      var b = base(cx, "estocada"); if (b.erro) return falha(b.erro);
      var casas = R.inteiro(cx.param.casas, 0, 99, 0);
      if (casas < 1) return falha("A Estocada avança pelo menos 1 casa.");
      return { ok: true, pendente: { tipo: "ataque", casasAvancadas: casas, aoErrar: { teste: "reflexos", falha: { mazela: "noChao" } } }, eventos: [ev("estocada", { persona: cx.quem, casas: casas })] };
    },

    /* ----------------------------- Quem Resolve ---------------------- */
    animarOsAnimos: function (cx) {
      var b = base(cx, "animarOsAnimos"); if (b.erro) return falha(b.erro);
      var o = b.o;
      var alvoId = cx.alvos && cx.alvos[0];
      var alvo = alvoId && cx.fichas[alvoId];
      if (!alvo || alvoId === cx.quem) return falha("Escolha uma Persona adjacente que acabou de atingir o limite.");
      if (!adjacentes(cx, cx.quem, alvoId)) return falha("Só uma Persona adjacente.");
      if (!R.deveFicarForaDeAcao(alvo)) return falha("A Persona não atingiu o limite.");
      var valor = R.metade(R.atributosEfetivos(o).determinacao);
      var r = R.recuperarEstresse(alvo, valor, { fonte: "animarOsAnimos", ctx: cx.ctx, distribuicao: cx.param.distribuicao });
      R.registrarUso(o, "animarOsAnimos", cx.ctx);
      var ainda = R.deveFicarForaDeAcao(alvo);
      return { ok: true, impediu: !ainda, eventos: marcar(r.eventos, alvoId).concat([ev("animarOsAnimos", { persona: cx.quem, alvo: alvoId, impediu: !ainda })]) };
    },
    copiaBarata: function (cx) {
      var b = base(cx, "copiaBarata"); if (b.erro) return falha(b.erro);
      var o = b.o;
      var dono = cx.alvos && cx.alvos[0];
      var chave = cx.param.habilidade;
      var h = C.habilidade[chave];
      if (!h || h.tipo !== "unica") return falha("Escolha uma Habilidade Única.");
      var d = dono && cx.fichas[dono];
      if (!d || dono === cx.quem || !R.temHabilidade(d, chave)) return falha("Essa Persona do grupo não tem essa habilidade.");
      var maximo = R.metade(R.atributosEfetivos(o).determinacao);
      var feitas = o.efeitos.filter(function (e) { return e.tipo === "copiaUsada"; });
      if (feitas.length >= maximo) return falha("Cópias entre Descansos: no máximo " + maximo + ".");
      if (feitas.some(function (e) { return e.habilidade === chave; })) return falha("Essa habilidade já foi copiada; espere o próximo Descanso.");
      o.efeitos.push({ id: R.novoId("ef"), tipo: "copia", habilidade: chave, de: dono, expira: "fimDaCena" });
      o.efeitos.push({ id: R.novoId("ef"), tipo: "copiaUsada", habilidade: chave });
      R.registrarUso(o, "copiaBarata", cx.ctx);
      return { ok: true, eventos: [ev("copiaBarata", { persona: cx.quem, habilidade: chave, de: dono })] };
    },
    instrucaoDecisiva: function (cx) {
      var b = base(cx, "instrucaoDecisiva"); if (b.erro) return falha(b.erro);
      var alvoId = cx.alvos && cx.alvos[0];
      if (!alvoId) return falha("Escolha a Persona que vai agir.");
      var tipo = cx.param.acao || "regular";
      if (tipo === "completa") return falha("A ação concedida não pode ser Completa.");
      return { ok: true, concede: { persona: alvoId, acao: tipo, foraDoTurno: true }, eventos: [ev("acaoConcedida", { por: cx.quem, persona: alvoId, acao: tipo })] };
    },

    /* ----------------------------- Quem Sabe ------------------------- */
    repertorioDeConhecimento: function (cx) {
      var b = base(cx, "repertorioDeConhecimento"); if (b.erro) return falha(b.erro);
      var o = b.o;
      var calma = cx.ctx && (cx.ctx.tipoDeCena === "descanso" || cx.ctx.tipoDeCena === "interacao");
      R.registrarUso(o, "repertorioDeConhecimento", cx.ctx, calma ? ["cenaCalma"] : ["rodada"]);
      var bonus = R.metade(R.atributosEfetivos(o).mente);
      return { ok: true, bonus: { fonte: "Repertório de Conhecimento", valor: bonus, aplicacao: "umDado" }, eventos: [ev("repertorio", { persona: cx.quem, bonus: bonus, para: (cx.alvos && cx.alvos[0]) || cx.quem })] };
    },
    feedbackDefensivo: function (cx) {
      var b = base(cx, "feedbackDefensivo"); if (b.erro) return falha(b.erro);
      var o = b.o;
      var alvoId = (cx.alvos && cx.alvos[0]) || cx.quem;
      var alvo = cx.fichas[alvoId];
      if (!alvo) return falha("Persona alvo não encontrada.");
      if (alvo.efeitos.some(function (e) { return e.tipo === "protecao" && e.fonte === "Feedback Defensivo"; })) return falha("Essa Persona já tem um Feedback Defensivo.");
      var valor = R.metadeMin1(R.atributosEfetivos(o).mente);
      alvo.efeitos.push({ id: R.novoId("ef"), tipo: "protecao", fonte: "Feedback Defensivo", valor: valor, persistente: true, expira: "fimDaCena" });
      R.registrarUso(o, "feedbackDefensivo", cx.ctx);
      if (cx.mesa) { var p = cx.mesa.encontro.protecoes[alvoId]; if (p) p.persistente = valor; }
      return { ok: true, eventos: [ev("feedbackDefensivo", { persona: cx.quem, alvo: alvoId, valor: valor })] };
    },
    planoDeContingencia: function (cx) {
      var b = base(cx, "planoDeContingencia"); if (b.erro) return falha(b.erro);
      R.registrarUso(b.o, "planoDeContingencia", cx.ctx);
      return { ok: true, reduzir: "Plano de Contingência", eventos: [ev("planoDeContingencia", { persona: cx.quem })] };
    },
    pontoFraco: function (cx) {
      var b = base(cx, "pontoFraco"); if (b.erro) return falha(b.erro);
      var o = b.o;
      var r = cx.param.disputa;
      if (!r) return { ok: true, pendente: { tipo: "disputa", conhecimento: "saber", alcance: "medio" }, eventos: [] };
      if (r !== "venceu") return { ok: true, eventos: [ev("pontoFraco", { persona: cx.quem, venceu: false })] };
      var efeito = cx.param.efeito;
      var saida = { ok: true, eventos: [] };
      if (efeito === "dano") saida.efeitoNoAlvo = { tipo: "pontoFracoDano", valor: R.metade(R.atributosEfetivos(o).mente), ate: "fimDaCena" };
      else if (efeito === "mazela") {
        var d = cx.rolador(6);
        var mz = d <= 2 ? "botandoParaFora" : d <= 4 ? "juraDeMorte" : d === 5 ? "lentidao" : "semReacao";
        saida.efeitoNoAlvo = { tipo: "mazela", mazela: mz, d6: d };
      } else if (efeito === "protecao") saida.efeitoNoAlvo = { tipo: "protecao", valor: -1, ate: "proximoDano", fonte: "Ponto Fraco" };
      else return falha("Escolha o efeito do Ponto Fraco.");
      saida.eventos.push(ev("pontoFraco", { persona: cx.quem, efeito: efeito, detalhe: saida.efeitoNoAlvo }));
      return saida;
    },

    /* ----------------------------- Gerais ---------------------------- */
    todosPorUm: function (cx) {
      var b = base(cx, "todosPorUm"); if (b.erro) return falha(b.erro);
      var grupo = Object.keys(cx.fichas);
      var semHab = grupo.filter(function (id) { return !R.temHabilidade(cx.fichas[id], "todosPorUm"); });
      if (semHab.length) return falha("Todas as Personas do grupo precisam de Todos por Um.");
      var eleita = cx.param.eleita;
      if (!eleita || !cx.fichas[eleita]) return falha("Elejam a Persona que faz o ataque.");
      return { ok: true, pendente: { tipo: "todosPorUm", eleita: eleita, participantes: grupo, acao: "completa" }, eventos: [ev("todosPorUm", { eleita: eleita })] };
    },
  };

  function usar(chave, contexto) {
    var cx = Object.assign({ fichas: {}, alvos: [], param: {}, ctx: {} }, contexto || {});
    var f = USOS[chave];
    if (!f) return falha("Esta habilidade é passiva ou não tem ativação.");
    return f(cx);
  }

  /* ---------------------------------------------------------------
     PASSIVOS COM GATILHO CONHECIDO
     --------------------------------------------------------------- */

  /* Armadura de Espinhos (p. 59): quem acerta a Persona testa "Fuga"
     — Reflexos pelo ajuste padrão (D6) — e sofre metade da Carne (mín.
     1) se falhar. Devolve o que a mesa aplica no atacante. */
  function armaduraDeEspinhos(o, ajustes) {
    if (!R.temHabilidade(o, "armaduraDeEspinhos")) return null;
    var modo = (ajustes && ajustes.testeDeFuga) || "reflexos";
    return { teste: modo === "reflexos" ? "reflexos" : "testemunha", dano: R.metadeMin1(R.atributosEfetivos(o).carne), fonte: "Armadura de Espinhos" };
  }

  /* Sede de Sangue (p. 55): ao eliminar, recupera o dano total do
     ataque final. */
  function sedeDeSangue(o, danoFinal, ctx) {
    if (!R.temHabilidade(o, "sedeDeSangue")) return { eventos: [] };
    return R.recuperarEstresse(o, danoFinal, { fonte: "sedeDeSangue", ctx: ctx });
  }

  /* Voracidade: primeiro acerto com Estresse em cada alvo, por cena. */
  function primeiroAcertoNoAlvo(o, alvoId, ctx) {
    var cena = (ctx && ctx.cena) || "";
    return !o.efeitos.some(function (e) { return e.tipo === "acertou" && e.alvo === alvoId && e.cena === cena; });
  }
  function registrarAcerto(o, alvoId, ctx) {
    o.efeitos.push({ id: R.novoId("ef"), tipo: "acertou", alvo: alvoId, cena: (ctx && ctx.cena) || "", expira: "fimDaCena" });
  }

  /* Última Esperança: no início do turno de quem cuida, cura o grupo. */
  function ultimaEsperancaNoTurno(fichas, quem, ctx) {
    var o = fichas[quem];
    var ef = o && o.efeitos.filter(function (e) { return e.tipo === "ultimaEsperanca" && e.restam > 0; })[0];
    if (!ef) return { eventos: [] };
    var eventos = [];
    Object.keys(fichas).forEach(function (id) {
      var r = R.recuperarEstresse(fichas[id], ef.valor, { fonte: "ultimaEsperanca", ctx: ctx });
      eventos = eventos.concat(marcar(r.eventos, id));
      if (id !== quem) registrarCuraDoPapel(o, r.recuperado, ctx);
    });
    ef.restam--;
    if (ef.restam <= 0) o.efeitos = o.efeitos.filter(function (e) { return e !== ef; });
    return { eventos: eventos };
  }

  /* Repartir a Dor: quem protege fica com `quanto` do Estresse. */
  function repartirADor(protetor, protegido, total, quanto, opcoes) {
    var q = Math.max(0, Math.min(R.inteiro(total, 0, 999, 0), R.inteiro(quanto, 0, 999, 0)));
    var e1 = q ? R.receberEstresse(protetor, q, Object.assign({}, opcoes || {}, { origem: { tipo: "repartirADor" } })).eventos : [];
    var e2 = total - q ? R.receberEstresse(protegido, total - q, opcoes).eventos : [];
    return { eventos: e1.concat(e2) };
  }

  /* ---------------------------------------------------------------
     AÇÕES ESPECÍFICAS (pp. 86–90)
     --------------------------------------------------------------- */

  /* A economia do turno: uma Regular, uma Extra e uma de Movimento, ou
     uma Completa. Sem Fôlego encarece (p. 94). */
  function custoDaAcao(o, tipo) {
    if (!R.temMazela(o, "semFolego")) return tipo;
    if (tipo === "regular") return "completa";
    if (tipo === "extra") return "regular";
    if (tipo === "completa") return "completa2";
    return tipo;
  }
  function turnoVazio() { return { regular: false, extra: false, movimento: false, completa: false, extrasConcedidas: 0 }; }
  function gastarAcao(turno, tipo) {
    var t = turno || turnoVazio();
    var partes = String(tipo).split("+");
    for (var i = 0; i < partes.length; i++) {
      var p = partes[i] === "completa2" ? "completa" : partes[i];
      if (t.completa) return { ok: false, motivo: "O turno já foi usado por uma Ação Completa." };
      if (p === "completa" && (t.regular || t.extra || t.movimento)) return { ok: false, motivo: "A Ação Completa ocupa o turno inteiro." };
      if (p !== "completa" && t[p]) return { ok: false, motivo: "A Ação " + (C.TIPOS_DE_ACAO.filter(function (x) { return x.chave === p; })[0] || { nome: p }).nome + " já foi usada neste turno." };
    }
    partes.forEach(function (p) { t[p === "completa2" ? "completa" : p] = true; });
    return { ok: true, turno: t };
  }

  var ACOES = {
    acelerar: function (cx) {
      var o = cx.fichas[cx.quem];
      var folego = Math.max(0, R.calcularMutaveis(o).folego.total);
      var feitos = R.usosFeitos(o, "acelerar", "descanso", cx.ctx);
      var eventos = [];
      o.efeitos.push({ id: R.novoId("ef"), tipo: "acelerar", expira: "fimDoProximoTurno", desdeRodada: (cx.ctx && cx.ctx.rodada) || 0 });
      R.registrarUso(o, "acelerar", cx.ctx, ["descanso"]);
      if (feitos >= folego) {
        /* Acima do Fôlego: 1D4 cumulativo nas pernas (p. 86). */
        var excedente = feitos - folego + 1;
        var dano = 0;
        for (var i = 0; i < excedente; i++) dano += cx.rolador(4);
        var perna = ["pernaD", "pernaE"].filter(function (k) { var r = R.regiao(o, k); return r && r.estado !== "ausente"; })[0] || "torso";
        eventos = eventos.concat(R.receberEstresse(o, dano, { regiao: cx.param.regiao || perna, origem: { tipo: "acelerar" } }).eventos);
      }
      return { ok: true, eventos: eventos.concat([ev("acelerar", { persona: cx.quem })]) };
    },
    seguirEmFrente: function (cx) {
      var o = cx.fichas[cx.quem];
      if (!cx.param.resultado) return { ok: true, pendente: { tipo: "teste", conhecimento: "emocional" }, eventos: [] };
      if (!C.RESULTADOS[cx.param.resultado].sucesso) return { ok: true, eventos: [ev("seguirEmFrente", { persona: cx.quem, sucesso: false })] };
      o.motivacao.abandonada = true;
      var g = R.ganharCoragem(o, 1, "Seguir em Frente");
      return { ok: true, eventos: g.eventos.concat([ev("seguirEmFrente", { persona: cx.quem, sucesso: true })]) };
    },
    resgatar: function (cx) {
      var alvoId = cx.alvos && cx.alvos[0];
      var alvo = alvoId && cx.fichas[alvoId];
      if (!alvo || !R.temMazela(alvo, "pavor")) return falha("Só uma Persona em Pavor.");
      if (!cx.param.resultado) return { ok: true, pendente: { tipo: "teste", conhecimento: "emocional" }, eventos: [] };
      if (!C.RESULTADOS[cx.param.resultado].sucesso) return { ok: true, eventos: [ev("resgatar", { sucesso: false })] };
      var r = R.removerMazela(alvo, "pavor", "resgatar");
      var g = R.ganharCoragem(alvo, 1, "Resgatar");
      return { ok: true, eventos: marcar(r.eventos.concat(g.eventos), alvoId) };
    },
    sacrificar: function (cx) {
      var o = cx.fichas[cx.quem];
      var alvoId = cx.alvos && cx.alvos[0];
      if (!alvoId || !adjacentes(cx, cx.quem, alvoId)) return falha("Só por uma Persona adjacente.");
      if (R.usosFeitos(o, "sacrificar", "rodada", cx.ctx) >= 1) return falha("Uma vez por rodada.");
      var valor = R.inteiro(cx.param.valor, 0, 999, 0);
      var r = R.receberEstresse(o, valor, { regiao: cx.param.regiao, semEquipamento: true, origem: { tipo: "sacrificar", por: alvoId } });
      var g = R.ganharCoragem(o, 1, "Sacrificar");
      R.registrarUso(o, "sacrificar", cx.ctx, ["rodada"]);
      return { ok: true, eventos: r.eventos.concat(g.eventos) };
    },
    preparar: function (cx) {
      var o = cx.fichas[cx.quem];
      o.efeitos = o.efeitos.filter(function (e) { return e.tipo !== "preparada"; });
      o.efeitos.push({ id: R.novoId("ef"), tipo: "preparada", gatilho: String(cx.param.gatilho || "").slice(0, 200), acao: String(cx.param.acao || "").slice(0, 200) });
      return { ok: true, eventos: [ev("preparou", { persona: cx.quem, gatilho: cx.param.gatilho })] };
    },
    analisar: function (cx) {
      if (!cx.param.disputa) return { ok: true, pendente: { tipo: "disputa", conhecimento: "duelo", alcance: "medio" }, eventos: [] };
      var alvo = cx.param.alvoAmeaca;
      if (cx.mesa && cx.mesa.encontro.analisados[alvo]) return falha("Esse alvo já foi analisado por alguém do grupo.");
      if (cx.param.disputa !== "venceu") return { ok: true, eventos: [ev("analisar", { sucesso: false })] };
      var bonus = R.metade(R.atributosEfetivos(cx.fichas[cx.quem]).mente);
      if (cx.mesa) cx.mesa.encontro.analisados[alvo] = { por: cx.quem, bonus: bonus };
      return { ok: true, bonus: bonus, eventos: [ev("analisar", { sucesso: true, alvo: alvo, bonus: bonus })] };
    },
  };

  function agir(chave, contexto) {
    var cx = Object.assign({ fichas: {}, alvos: [], param: {}, ctx: {} }, contexto || {});
    var f = ACOES[chave];
    if (!f) return falha("Ação sem automação específica.");
    var o = cx.fichas[cx.quem];
    if (!o || R.estadoDaPersona(o) !== "ativa") return falha("A Persona não pode agir agora.");
    /* Fazer uma Ação Regular perde a ação preparada (p. 89). */
    if (chave !== "preparar" && cx.param.tipo === "regular") o.efeitos = o.efeitos.filter(function (e) { return e.tipo !== "preparada"; });
    return f(cx);
  }

  global.RAMAOblivioHabilidades = {
    usar: usar, agir: agir, temAtivacao: function (chave) { return !!USOS[chave]; }, temAcao: function (chave) { return !!ACOES[chave]; },
    armaduraDeEspinhos: armaduraDeEspinhos, sedeDeSangue: sedeDeSangue, primeiroAcertoNoAlvo: primeiroAcertoNoAlvo, registrarAcerto: registrarAcerto,
    ultimaEsperancaNoTurno: ultimaEsperancaNoTurno, repartirADor: repartirADor, registrarCuraDoPapel: registrarCuraDoPapel,
    custoDaAcao: custoDaAcao, turnoVazio: turnoVazio, gastarAcao: gastarAcao,
  };
})(typeof window !== "undefined" ? window : globalThis);
/* <<< js/oblivio/habilidades.js */

var MAX_OPS_OBLIVIO = 80;
var OPERACOES_DA_TESTEMUNHA = ['momentos', 'estresse'];
var OPERACOES_DE_JOGADOR = ['habilidade', 'acao', 'ataqueAmeaca', 'receberAtaque'];

/* O dado do servidor: o mesmo sorteio uniforme do resto do backend. */
function roladorDoServidor(faces) {
  var f = Math.max(1, Math.floor(Number(faces) || 1));
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid());
  var n = 0;
  for (var i = 0; i < 4; i++) n = n * 256 + ((bytes[i] + 256) % 256);
  return (n % f) + 1;
}

/* A mesa ligada (a aba aparece para todos)? Pela coluna leve. */
function oblivioAtivo(campanhaId) {
  try {
    var leve = lerLeves(ABAS.CAMPANHA_OBLIVIO).filter(function (r) { return String(r.campanhaId) === String(campanhaId); })[0];
    return !!leve && (leve.ativo === true || String(leve.ativo) === 'true');
  } catch (erro) {
    return false;
  }
}

function registroDoOblivio(campanhaId) {
  try { return acharPor(ABAS.CAMPANHA_OBLIVIO, 'campanhaId', String(campanhaId)); }
  catch (erro) { return null; }
}

function estadoDoOblivio(registro) {
  return RAMAOblivioMesa.normalizar(registro ? lerJson(registro.dadosJson, {}) : {});
}

function oblivioParaCliente(ctx, registro) {
  var estado = estadoDoOblivio(registro);
  var rev = registro ? Number(registro.rev) || 0 : 0;
  if (ctx.mestre) return { mestre: true, rev: rev, estado: estado };
  return { mestre: false, rev: rev, vista: RAMAOblivioMesa.vistaDosJogadores(estado) };
}

/* As Personas de Oblívio desta campanha — id e nome, o que o painel da
   mesa já mostra a todos —, para escolher um aliado como alvo de uma
   habilidade. Pela projeção guardada: nenhuma ficha é aberta. */
function personasDeOblivio(campanhaId) {
  var regs = daCampanhaLeves(ABAS.PERSONAGENS, campanhaId);
  if (!regs.length) return [];
  var textos = lerCelulas(ABAS.PERSONAGENS, regs, 'resumo');
  return regs.filter(function (r) { var p = projecaoGuardada(textos[r._linha]); return !!p && p.tipo === 'oblivio'; })
    .map(function (r) { return { id: String(r.id), nome: String(r.nome || '').slice(0, 120) }; });
}

/* O bônus de grupo de uma Persona na fileira (Escudo Humano, p. 59):
   calculado aqui, com as fichas que estão À FRENTE dela. Volta só o
   bônus (fonte e valor) — nunca a ficha de outra pessoa. */
function grupoDaPersona(campanhaId, estado, personagemId) {
  var id = String(personagemId || '');
  var i = estado.fileiras.personas.indexOf(id);
  if (i < 0) return null;
  var fichas = {};
  estado.fileiras.personas.slice(0, i).forEach(function (pid) {
    var r = fichasDeOblivio(campanhaId, [pid]);
    if (r.ok) fichas[pid] = r.fichas[pid].ficha.oblivio;
  });
  return { bonus: RAMAOblivioMesa.bonusDeGrupo(estado, fichas, id).map(function (x) { return { fonte: x.fonte, valor: x.valor }; }) };
}

function acaoLerOblivio(corpo, usuario) {
  var ctx = contextoDaCampanha(corpo.campanhaId, usuario);
  if (!ctx.ok) return ctx;
  if (ctx.papel === PAPEL_ESPECTADOR) return { ok: false, erro: 'sem_permissao' };
  var registro = registroDoOblivio(ctx.campanha.id);
  var dados = oblivioParaCliente(ctx, registro);
  dados.personas = personasDeOblivio(ctx.campanha.id);
  if (corpo.personagemId) dados.grupo = grupoDaPersona(ctx.campanha.id, estadoDoOblivio(registro), corpo.personagemId);
  return { ok: true, rev: dados.rev, dados: dados };
}

function gravarOblivio(ctx, registro, estado, revAtual, feitas) {
  var json = JSON.stringify(estado);
  var voltas = 0;
  /* O registro de eventos cede primeiro quando o estado não cabe. */
  while (json.length > MAX_CELULA && voltas < 20) {
    voltas++;
    estado.registro = estado.registro.slice(Math.ceil(estado.registro.length / 4) || 1);
    json = JSON.stringify(estado);
  }
  if (json.length > MAX_CELULA) return { ok: false, erro: 'dados_grandes' };
  var novo = {
    campanhaId: String(ctx.campanha.id), ativo: estado.ativo === true, atualizadoEm: new Date().toISOString(),
    rev: revAtual + 1, opsJson: JSON.stringify(feitas.slice(-MAX_OPS_OBLIVIO)), dadosJson: json,
  };
  var ativoAntes = !!registro && (registro.ativo === true || String(registro.ativo) === 'true');
  if (registro) atualizarLinha(ABAS.CAMPANHA_OBLIVIO, registro._linha, Object.assign({}, registro, novo));
  else inserir(ABAS.CAMPANHA_OBLIVIO, novo);
  /* Ligar ou desligar muda as abas de todos: a campanha também é avisada. */
  marcarMesa(ctx.campanha.id, ativoAntes !== novo.ativo ? ['oblivio', 'campanha'] : ['oblivio']);
  return { ok: true, rev: revAtual + 1 };
}

function acaoSalvarOblivio(corpo, usuario) {
  var opId = String(corpo.opId || '');
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(opId)) return { ok: false, erro: 'dados_invalidos' };
  if (!corpo.estado || typeof corpo.estado !== 'object' || Array.isArray(corpo.estado)) return { ok: false, erro: 'dados_invalidos' };
  var revPedida = Number(corpo.rev);
  if (!Number.isFinite(revPedida)) return { ok: false, erro: 'dados_invalidos' };
  return comTrava(function () {
    var ctx = exigirMestre(corpo.campanhaId, usuario);
    if (!ctx.ok) return ctx;
    try { aba(ABAS.CAMPANHA_OBLIVIO); }
    catch (erro) { return { ok: false, erro: 'instalacao_incompleta', detalhe: 'CAMPANHA_OBLIVIO' }; }
    var registro = registroDoOblivio(ctx.campanha.id);
    var revAtual = registro ? Number(registro.rev) || 0 : 0;
    var feitas = registro ? (lerJson(registro.opsJson, []) || []) : [];
    if (!Array.isArray(feitas)) feitas = [];
    if (feitas.indexOf(opId) >= 0) return { ok: true, repetida: true, rev: revAtual, dados: oblivioParaCliente(ctx, registro) };
    if (revPedida !== revAtual) return { ok: false, erro: 'conflito', rev: revAtual, dados: oblivioParaCliente(ctx, registro) };
    var estado = RAMAOblivioMesa.normalizar(corpo.estado);
    /* Fileiras só com Personas desta campanha. */
    var daMesa = {};
    daCampanhaLeves(ABAS.PERSONAGENS, ctx.campanha.id).forEach(function (r) { daMesa[String(r.id)] = true; });
    estado.fileiras.personas = estado.fileiras.personas.filter(function (id) { return daMesa[id]; });
    if (estado.farol.persona && !daMesa[estado.farol.persona]) estado.farol.persona = '';
    feitas.push(opId);
    var g = gravarOblivio(ctx, registro, estado, revAtual, feitas);
    if (!g.ok) return g;
    return { ok: true, rev: g.rev, dados: oblivioParaCliente(ctx, registroDoOblivio(ctx.campanha.id)) };
  });
}

/* As fichas de Oblívio de uma campanha que a operação toca: lidas,
   montadas e com o registro de cada uma, para gravar só as que mudaram. */
function fichasDeOblivio(campanhaId, ids) {
  var saida = {};
  for (var i = 0; i < ids.length; i++) {
    var reg = acharPor(ABAS.PERSONAGENS, 'id', String(ids[i]));
    if (!reg || String(reg.campanhaId || '') !== String(campanhaId)) return { ok: false, erro: 'nao_encontrado' };
    var lido = lerFichaDoPersonagem(reg);
    if (!lido.ok) return lido;
    var ficha = comVinculoDaColuna(lido.ficha, reg);
    if (String(ficha.tipoFicha || '') !== 'oblivio') return { ok: false, erro: 'dados_invalidos', detalhe: 'nao_e_oblivio' };
    ficha.oblivio = RAMAOblivio.normalizar(ficha.oblivio);
    saida[ids[i]] = { registro: reg, ficha: ficha, antes: JSON.stringify(ficha.oblivio) };
  }
  return { ok: true, fichas: saida };
}

function gravarFichasDeOblivio(fichas, opId, campanhaId) {
  var quando = new Date().toISOString();
  var gravadas = 0;
  var ids = Object.keys(fichas);
  for (var i = 0; i < ids.length; i++) {
    var f = fichas[ids[i]];
    if (JSON.stringify(f.ficha.oblivio) === f.antes) continue;
    if (f.ficha.oblivio.operacoes.indexOf(opId) < 0) f.ficha.oblivio.operacoes.push(opId);
    f.ficha.atualizadoEm = quando;
    f.registro.atualizadoEm = quando;
    f.registro.rev = (Number(f.registro.rev) || 0) + 1;
    var publicado = publicarFicha(f.registro, f.ficha, { operacao: opId });
    if (!publicado.ok) return publicado;
    gravadas++;
  }
  if (gravadas) marcarMesa(campanhaId, ['personagens']);
  return { ok: true, gravadas: gravadas };
}

function contextoDeJogo(estado) {
  var c = estado.cena;
  return { cena: c ? c.id : '', rodada: c ? c.rodada : 0, tipoDeCena: c ? c.tipo : '', partida: estado.partida.id, missao: estado.missao ? estado.missao.id : '' };
}

function acaoOblivioOperar(corpo, usuario) {
  var opId = String(corpo.opId || '');
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(opId)) return { ok: false, erro: 'dados_invalidos' };
  var op = corpo.operacao && typeof corpo.operacao === 'object' ? corpo.operacao : null;
  if (!op) return { ok: false, erro: 'dados_invalidos' };
  var tipo = String(op.tipo || '');
  if (OPERACOES_DA_TESTEMUNHA.indexOf(tipo) < 0 && OPERACOES_DE_JOGADOR.indexOf(tipo) < 0) return { ok: false, erro: 'dados_invalidos' };

  return comTrava(function () {
    var ctx = contextoDaCampanha(corpo.campanhaId, usuario);
    if (!ctx.ok) return ctx;
    if (ctx.papel === PAPEL_ESPECTADOR) return { ok: false, erro: 'sem_permissao' };
    if (OPERACOES_DA_TESTEMUNHA.indexOf(tipo) >= 0 && !ctx.mestre) return { ok: false, erro: 'sem_permissao' };
    try { aba(ABAS.CAMPANHA_OBLIVIO); }
    catch (erro) { return { ok: false, erro: 'instalacao_incompleta', detalhe: 'CAMPANHA_OBLIVIO' }; }

    var registro = registroDoOblivio(ctx.campanha.id);
    var revAtual = registro ? Number(registro.rev) || 0 : 0;
    var feitas = registro ? (lerJson(registro.opsJson, []) || []) : [];
    if (!Array.isArray(feitas)) feitas = [];
    if (feitas.indexOf(opId) >= 0) return { ok: true, repetida: true, rev: revAtual };
    var mesa = estadoDoOblivio(registro);
    var mesaAntes = JSON.stringify(mesa);
    var jogo = contextoDeJogo(mesa);

    /* Quem age por uma Persona precisa poder editá-la (dono, Editor ou
       mestre). Os alvos só precisam ser desta campanha. */
    var ids = [];
    if (tipo === 'habilidade' || tipo === 'acao' || tipo === 'ataqueAmeaca' || tipo === 'receberAtaque') {
      var quem = String(op.quem || '');
      if (!ctx.mestre) {
        var acesso = personagemAcessivel(quem, usuario, {});
        /* O padrão de personagemAcessivel exige poder EDITAR: Leitor não. */
        if (!acesso.ok) return acesso;
      }
      ids = [quem].concat((Array.isArray(op.alvos) ? op.alvos : []).map(String)).filter(function (x, i, a) { return x && a.indexOf(x) === i; }).slice(0, 12);
    } else if (tipo === 'estresse') {
      ids = [String(op.persona || '')];
    } else if (tipo === 'momentos') {
      ids = daCampanhaLeves(ABAS.PERSONAGENS, ctx.campanha.id).map(function (r) { return String(r.id); });
    }

    var carregadas = { ok: true, fichas: {} };
    if (tipo === 'momentos') {
      /* Só as de Oblívio; as outras ficam de fora sem erro. */
      ids.forEach(function (id) {
        var r = fichasDeOblivio(ctx.campanha.id, [id]);
        if (r.ok) carregadas.fichas[id] = r.fichas[id];
      });
    } else {
      carregadas = fichasDeOblivio(ctx.campanha.id, ids);
      if (!carregadas.ok) return carregadas;
    }
    var blocos = {};
    Object.keys(carregadas.fichas).forEach(function (id) { blocos[id] = carregadas.fichas[id].ficha.oblivio; });

    var resultado = { ok: true, eventos: [] };
    if (tipo === 'momentos') {
      var lista = Array.isArray(op.momentos) ? op.momentos.slice(0, 20) : [];
      lista.forEach(function (m) {
        Object.keys(blocos).forEach(function (id) {
          var o = blocos[id];
          if (o.operacoes.indexOf(opId) >= 0) return;
          if (m.persona && m.persona !== id) return;
          var r = null;
          if (m.tipo === 'fimDoTurno') r = RAMAOblivio.fimDoTurno(o, jogo, roladorDoServidor);
          if (m.tipo === 'fimDaRodada') r = RAMAOblivio.fimDaRodada(o, Object.assign({}, jogo, { rodada: Number(m.rodada) || jogo.rodada }), roladorDoServidor);
          if (m.tipo === 'inicioDaCena') r = RAMAOblivio.inicioDaCena(o, jogo);
          if (m.tipo === 'iniciarMissao') r = RAMAOblivio.iniciarMissao(o, String(m.missao || ''));
          if (m.tipo === 'concluirMissao' && !o.morte) r = RAMAOblivio.concluirMissao(o, String(m.missao || ''), Number(m.mortos) || 0);
          if (m.tipo === 'inicioDoTurno') r = RAMAOblivioHabilidades.ultimaEsperancaNoTurno(blocos, id, jogo);
          if (r && r.eventos) resultado.eventos = resultado.eventos.concat(r.eventos.map(function (e) { return Object.assign({ persona: id }, e); }));
        });
      });
    }
    if (tipo === 'estresse') {
      var o1 = blocos[ids[0]];
      if (!o1) return { ok: false, erro: 'nao_encontrado' };
      var valor = Math.max(0, Math.min(500, Math.floor(Number(op.valor) || 0)));
      resultado = RAMAOblivio.aplicarOperacao(o1, opId, function (o) { return RAMAOblivio.receberEstresse(o, valor, { regiao: op.regiao, item: op.item, origem: { tipo: 'mesa' } }); });
    }
    if (tipo === 'habilidade' || tipo === 'acao') {
      var cx = { fichas: blocos, quem: ids[0], alvos: ids.slice(1), mesa: mesa, ctx: jogo, rolador: roladorDoServidor, param: op.param && typeof op.param === 'object' ? op.param : {} };
      /* A segunda chegada: a operação já está em QUALQUER ficha que ela
         tocou (uma habilidade só no aliado não muda a ficha de quem usa). */
      if (Object.keys(blocos).some(function (id) { return blocos[id].operacoes.indexOf(opId) >= 0; })) return { ok: true, repetida: true, rev: revAtual };
      resultado = tipo === 'habilidade' ? RAMAOblivioHabilidades.usar(String(op.chave || ''), cx) : RAMAOblivioHabilidades.agir(String(op.chave || ''), cx);
      if (!resultado.ok) return { ok: false, erro: 'dados_invalidos', motivo: resultado.motivo };
    }
    if (tipo === 'ataqueAmeaca') {
      var inst = RAMAOblivioMesa.instancia(mesa, String(op.alvo || ''));
      if (!inst || inst.estado !== 'ativa') return { ok: false, erro: 'nao_encontrado' };
      var sucessos = Math.max(0, Math.min(20, Math.floor(Number(op.sucessos) || 0)));
      var prot = RAMAOblivioMesa.protecaoDoAlvo(mesa, inst.id, RAMAOblivioMotorAmeacas.protecaoCompleta(inst, { personasNaCena: mesa.fileiras.personas.length, ajustes: mesa.ajustes }).total);
      var acerto = op.semRegioes ? { acertou: !!prot.zerada || prot.restante === 0 } : RAMAOblivioCombate.aplicarSucessos(prot, sucessos, ids[0], op.mirar ? { mirar: op.mirar } : {});
      resultado = { ok: true, acerto: acerto, eventos: [] };
      if (acerto.acertou && op.dano !== undefined) {
        var dano = Math.max(0, Math.min(300, Math.floor(Number(op.dano) || 0)));
        var sofreu = RAMAOblivioMotorAmeacas.sofrerDano(inst, dano, { classe: op.classe, corrompido: op.corrompido === true, regiao: op.regiaoAlvo, corpoACorpo: op.corpoACorpo === true }, roladorDoServidor);
        resultado.eventos = sofreu.eventos;
        /* Sede de Sangue (p. 55): eliminou, recupera o dano do golpe final. */
        if (inst.estado !== 'ativa') resultado.eventos = resultado.eventos.concat(RAMAOblivioHabilidades.sedeDeSangue(blocos[ids[0]], sofreu.valor || 0, jogo).eventos || []);
        var reflexo = RAMAOblivioMotorAmeacas.reflexoDoAcerto(inst, { corpoACorpo: op.corpoACorpo === true });
        if (reflexo) {
          resultado.eventos = resultado.eventos.concat(RAMAOblivio.receberEstresse(blocos[ids[0]], reflexo.dano, { regiao: op.regiaoReflexo || 'torso', origem: { tipo: 'toqueCorrosivo' } }).eventos);
        }
      }
      RAMAOblivioMesa.registrar(mesa, 'ataque', { por: ids[0], alvo: inst.id, sucessos: sucessos, acertou: !!acerto.acertou });
    }
    /* Um acerto de Ameaça que a Testemunha registrou: quem recebe escolhe
       a região e o Durável que absorve (p. 66–67). O VALOR é o que está
       na mesa — o jogador não informa dano. */
    if (tipo === 'receberAtaque') {
      var pendId = String(op.pendente || '');
      var pend = mesa.encontro.ataquesPendentes.filter(function (x) { return x.id === pendId && x.persona === ids[0]; })[0];
      if (!pend) return { ok: false, erro: 'nao_encontrado' };
      /* Proteção Maximizada (e Elevada contra ataque à distância)
         reduzem o dano na Persona (p. 76). */
      var reducoes = RAMAOblivioCombate.reducaoNaPersona(blocos[ids[0]], { aDistancia: pend.aDistancia === true });
      var bruto = Math.max(0, Math.min(500, Math.floor(Number(pend.dano) || 0)));
      var liquido = Math.max(0, bruto - reducoes.reduce(function (t, x) { return t + x.valor; }, 0));
      resultado = RAMAOblivio.receberEstresse(blocos[ids[0]], liquido,
        { regiao: String(op.regiao || ''), item: String(op.item || ''), origem: { tipo: 'ameaca', ref: pend.ameaca } });
      if (resultado.ok === false) return { ok: false, erro: 'dados_invalidos', motivo: resultado.motivo };
      if (reducoes.length) resultado.eventos = [RAMAOblivio.evento('reducao', { de: bruto, para: liquido, fontes: reducoes })].concat(resultado.eventos);
      /* Armadura de Espinhos (p. 55): a reação vai para o registro da
         Testemunha, que pede o teste ao atacante. */
      var espinhos = pend.corpoACorpo ? RAMAOblivioHabilidades.armaduraDeEspinhos(blocos[ids[0]], mesa.ajustes) : null;
      if (espinhos) RAMAOblivioMesa.registrar(mesa, 'reacao', { persona: ids[0], ameaca: pend.ameaca, fonte: espinhos.fonte, teste: espinhos.teste, dano: espinhos.dano });
      mesa.encontro.ataquesPendentes = mesa.encontro.ataquesPendentes.filter(function (x) { return x.id !== pendId; });
      RAMAOblivioMesa.registrar(mesa, 'ataqueRecebido', { persona: ids[0], ameaca: pend.ameaca, dano: pend.dano });
    }

    var g = gravarFichasDeOblivio(carregadas.fichas, opId, ctx.campanha.id);
    if (!g.ok) return g;
    var novaRev = revAtual;
    if (JSON.stringify(mesa) !== mesaAntes) {
      feitas.push(opId);
      var gm = gravarOblivio(ctx, registro, mesa, revAtual, feitas);
      if (!gm.ok) return gm;
      novaRev = gm.rev;
    }
    return { ok: true, rev: novaRev, dados: { eventos: resultado.eventos || [], acerto: resultado.acerto || null, gravadas: g.gravadas, efeitoNoAlvo: resultado.efeitoNoAlvo || null } };
  });
}

/* O Codigo.gs pergunta por esta função ao montar as rotas (rotaDe). */
function rotasDoOblivio() {
  return {
    ler_oblivio: { publica: false, fn: acaoLerOblivio },
    salvar_oblivio: { publica: false, fn: acaoSalvarOblivio },
    oblivio_operar: { publica: false, fn: acaoOblivioOperar },
  };
}
