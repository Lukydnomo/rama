/* =====================================================================
   R.A.M.A. — BRUTAL · Corte Rápido · catálogo (v7.0)
   ---------------------------------------------------------------------
   Os dados do Fast Play "BRUTAL: Corte Rápido" (25 páginas), na forma
   que a ficha, a Mesa da Diretora, o servidor e o Catálogo leem — sem
   cópia. Os textos são resumos das regras, com a página do PDF.

   Só o que o PDF define entra como regra. O que ele deixa em aberto
   (a meta da Pilha de Fuga de cada Assassino, o custo de Tratar
   Feridas, o fim da habilidade da Valentona, o Estigma, o Nível de
   Brutalidade…) está em LACUNAS, e a mesa decide no ponto de uso —
   nunca com um número inventado.

   Este arquivo é copiado para backend/Brutal.gs
   (testes/gerar-brutal-gs.js); não use nada do navegador aqui.
   ===================================================================== */

(function (global) {
  "use strict";

  var FONTE = { sigla: "CR", nome: "BRUTAL — Corte Rápido", curto: "Corte Rápido" };
  function referencia(pagina) { return FONTE.nome + (pagina ? ", p. " + pagina : ""); }

  /* p. 3 e 5: limites. */
  var LIMITES = {
    pilha: 6,          // a Pilha Comum de uma Sobrevivente nunca passa de 6 (p. 3)
    pt: 10,            // Pontos de Tensão: começa em 0 e acumula até 10 (p. 5)
    dificuldade: 4,    // sucesso em 4 ou mais (p. 4)
    fugaMaxima: 6,     // a Pilha de Fuga nunca é maior que 6 (p. 22)
  };

  var CENAS = {
    livre:    { nome: "Livre",    falhas: "sacrificar", texto: "O perigo ainda não se revelou: dados que falham são SACRIFICADOS (vão para a Pilha da Diretora).", pagina: 4 },
    suspense: { nome: "Suspense", falhas: "sacrificar", texto: "Ainda sem o perigo revelado: dados que falham são SACRIFICADOS.", pagina: 4 },
    encontro: { nome: "Encontro", falhas: "descartar",  texto: "O perigo se revelou: dados que falham são DESCARTADOS (vão para a Pilha de Descarte).", pagina: 21 },
  };

  /* ---------------------------------------------------------------
     ESTILOS (p. 6) — usar um estilo seu reduz a Dificuldade em 1
     --------------------------------------------------------------- */
  var ESTILOS = {
    desenrolado: { nome: "Desenrolado", texto: "Reagir à surpresa, encarar situações incômodas e colaborar com os colegas no meio do caos.", pagina: 6 },
    firme:       { nome: "Firme",       texto: "Resistir a eventos danosos, manter-se estável sob tensão e impor a própria vontade.", pagina: 6 },
    ligeiro:     { nome: "Ligeiro",     texto: "Acrobacias, passar despercebida e enganar — em situações sociais ou numa fuga.", pagina: 6 },
    potente:     { nome: "Potente",     texto: "Manobras brutais, intimidar e quebrar barreiras, sociais e físicas, com os punhos.", pagina: 6 },
    sagaz:       { nome: "Sagaz",       texto: "Resolver problemas mirabolantes, desatar complexidades e persuadir em conflitos sociais.", pagina: 6 },
  };
  var ORDEM_ESTILOS = ["desenrolado", "firme", "ligeiro", "potente", "sagaz"];

  /* ---------------------------------------------------------------
     RECARGAS — quando uma Vantagem ou Habilidade volta a valer
     --------------------------------------------------------------- */
  var RECARGAS = {
    semRestricao:   { nome: "Sem restrição" },
    fimEncontro:    { nome: "Fim de um Encontro" },
    inicioEncontro: { nome: "Início de um Encontro" },
    inicioSessao:   { nome: "Início de uma sessão" },
    /* "Encontro, Livre" (Choque de Realidade): volta quando um Encontro
       acaba ou uma cena Livre começa — leitura registrada em LACUNAS. */
    encontroLivre:  { nome: "Encontro, Livre" },
    /* Buh! "Recarga: Livre": volta quando uma cena Livre começa. */
    livre:          { nome: "Livre" },
    /* Planejar Fuga: o campo traz "6 pts" (lacuna) — vale até o efeito
       pendente ser usado, ou o que a Diretora configurar. */
    planejarFuga:   { nome: "Confira a lacuna (o PDF diz \"6 pts\")" },
  };

  /* ---------------------------------------------------------------
     ARQUÉTIPOS (p. 6, 9–12) e INICIATIVA (p. 21)
     --------------------------------------------------------------- */
  var ARQUETIPOS = {
    atleta: {
      nome: "Atleta", adjetivos: "Energética · Esportista · Motivada", cor: "#5b5fc7", iniciativa: 2, pagina: 9,
      resumo: "Cresceu ouvindo que perder é para os fracos; a pressão que ninguém vê é o que talvez a mantenha viva.",
      estilos: ["potente", "ligeiro"],
      habilidade: { chave: "resiliencia", nome: "Resiliência", cena: "Sem restrição", recarga: "fimEncontro",
        texto: "Uma vez a cada Encontro, substitua o resultado de uma rolagem sua pelo valor de um dos seus Dados Marcadores." },
    },
    cetica: {
      nome: "Cética", adjetivos: "Centrada · Inquisitiva · Sensata", cor: "#6b6b70", iniciativa: 8, pagina: 9,
      resumo: "Para ela, toda anormalidade tem explicação lógica — o que pode ser o seu fim ou o que a mantém viva.",
      estilos: ["firme", "sagaz"],
      habilidade: { chave: "beneficioDaDuvida", nome: "Benefício da Dúvida", cena: "Sem restrição", recarga: "semRestricao",
        texto: "Pode repetir cada Teste de Susto ao menos uma vez." },
    },
    esbelta: {
      nome: "Esbelta", adjetivos: "Deslumbrante · Diva · Egocêntrica", cor: "#9b3fa3", iniciativa: 4, pagina: 10,
      resumo: "Beleza, riqueza e poder; as fofocas chegam primeiro a ela, e há quem se sacrificaria por ela.",
      estilos: ["desenrolado", "firme"],
      habilidade: { chave: "egocentrica", nome: "Egocêntrica", cena: "Sem restrição", recarga: "semRestricao",
        texto: "Recebe 1 Ponto de Tensão para cada 6 obtido numa rolagem." },
    },
    heroina: {
      nome: "Heroína", adjetivos: "Altruísta · Confiante · Valente", cor: "#c9a227", iniciativa: 1, pagina: 10,
      resumo: "Nunca pediu para ser heroína, mas é para ela que todos olham quando a matança começa.",
      estilos: ["potente", "sagaz"],
      habilidade: { chave: "ateOFim", nome: "Até o Fim", cena: "Encontro", recarga: "semRestricao",
        texto: "Num Encontro, ao Arriscar Tudo para se salvar, pode manter um único dado na Pilha Comum em vez de perder todos." },
    },
    inocente: {
      nome: "Inocente", adjetivos: "Ingênua · Passiva · Pura", cor: "#2c9c8f", iniciativa: 5, pagina: 11,
      resumo: "Confiável e bondosa; sua empatia amolece até os mais indiferentes, que estarão lá para protegê-la.",
      estilos: ["desenrolado", "sagaz"],
      habilidade: { chave: "carencia", nome: "Carência", cena: "Encontro", recarga: "inicioSessao",
        texto: "Uma vez por sessão, ao ser alvo de Ajudar Alguém num Encontro, quem ajuda não perde os dados doados: eles saem da Pilha de Descarte." },
    },
    nerd: {
      nome: "Nerd", adjetivos: "Engenhosa · Inteligente · Patética", cor: "#7a4fb0", iniciativa: 6, pagina: 11,
      resumo: "Sempre com a cabeça nos livros; agora saber demais é dádiva e maldição ao mesmo tempo.",
      estilos: ["ligeiro", "sagaz"],
      habilidade: { chave: "memoriaFotografica", nome: "Memória Fotográfica", cena: "Encontro", recarga: "inicioSessao",
        texto: "Uma vez por sessão, num Encontro, descobre quantos dados faltam para completar a sua Pilha de Fuga." },
    },
    relaxada: {
      nome: "Relaxada", adjetivos: "Chapada · Criativa · Tonta", cor: "#3a9a45", iniciativa: 7, pagina: 12,
      resumo: "Sempre de boa com a vida, cabeça na lua — o que pode fazer dela a primeira vítima.",
      estilos: ["desenrolado", "ligeiro"],
      habilidade: { chave: "ole", nome: "Olé", cena: "Sem restrição", recarga: "fimEncontro",
        texto: "Uma vez a cada Encontro, ao sofrer uma Ferida, rola o Dado Marcador de novo e fica com o novo resultado." },
    },
    valentona: {
      nome: "Valentona", adjetivos: "Briguenta · Insensível · Rebelde", cor: "#c0392b", iniciativa: 3, pagina: 12,
      resumo: "Nunca seguiu regras nem respeitou autoridade; a mesma brutalidade que a torna babaca a faz lutar até o fim.",
      estilos: ["firme", "potente"],
      habilidade: { chave: "caraLavada", nome: "Cara Lavada", cena: "Encontro", recarga: "inicioEncontro", lacuna: "caraLavada",
        texto: "Uma vez durante um Encontro, pode descartar um dado da sua Pilha de Fuga… (o texto termina aqui na p. 12 do Corte Rápido)." },
    },
  };
  /* A ordem das fichas do PDF (p. 9–12). */
  var ORDEM_ARQUETIPOS = ["atleta", "cetica", "esbelta", "heroina", "inocente", "nerd", "relaxada", "valentona"];
  /* A ordem de Iniciativa (p. 21): o Assassino é sempre o último. */
  var INICIATIVA = ["heroina", "atleta", "valentona", "esbelta", "inocente", "nerd", "relaxada", "cetica"];

  /* ---------------------------------------------------------------
     APEGOS (p. 7)
     --------------------------------------------------------------- */
  var APEGOS = {
    item:    { nome: "Item Icônico",    pt: 2, limite: "sessao", pagina: 7, texto: "Objeto que acompanha a Sobrevivente; não some nem quebra (a não ser que ela queira) e não serve como Recurso. Usá-lo numa ação: +2 PT, uma vez por sessão, só pela dona." },
    relacao: { nome: "Relação Afetiva", pt: 2, limite: "sessao", pagina: 7, texto: "Uma pessoa ou animal que é porto seguro. Passar tempo com ela numa sessão: +2 PT, uma vez por sessão." },
    desejo:  { nome: "Desejo Obscuro",  pt: 3, limite: "unico",  pagina: 7, texto: "Vontade, impulso ou segredo guardado a sete chaves. Revelá-lo num Thriller: +3 PT; revelado, não pode ser usado de novo." },
  };

  /* ---------------------------------------------------------------
     VANTAGENS (p. 8) — fora de Encontro; custo em PT e recarga
     efeito: o que o motor aplica (js/brutal/mesa.js)
     --------------------------------------------------------------- */
  var VANTAGENS = {
    choqueDeRealidade: { nome: "Choque de Realidade", estilo: null, custo: 6, recarga: "encontroLivre", efeito: "dado", pagina: 8,
      texto: "Você recebe um dado adicional para a sua Pilha Comum." },
    tomarJeito: { nome: "Tomar Jeito", estilo: null, custo: 3, recarga: "semRestricao", efeito: "recuperarEstilo", pagina: 8,
      texto: "Você recupera um Estilo Incapacitado seu ou de outra Sobrevivente." },
    tratarFeridas: { nome: "Tratar Feridas", estilo: null, custo: null, custoTexto: "Confira a descrição", recarga: "fimEncontro", efeito: "dado", pagina: 8, lacuna: "tratarFeridas",
      texto: "Você recebe um dado adicional para a sua Pilha Comum. (O PDF manda conferir o custo na descrição, que não o informa.)" },
    cacarRecursos: { nome: "Caçar Recursos", estilo: "sagaz", custo: 3, recarga: "semRestricao", efeito: "recurso", pagina: 8, lacuna: "cacarRecursos",
      texto: "A seu critério, recebe um Recurso que não estava na cena nem com você, desde que faça sentido na narrativa. Recursos têm um uso e reduzem a dificuldade de um teste em 1." },
    compartilharForcas: { nome: "Compartilhar Forças", estilo: "desenrolado", custo: null, custoTexto: "Os PT transferidos", recarga: "fimEncontro", efeito: "transferirPt", pagina: 8,
      texto: "Transfere quantos Pontos de Tensão quiser para outra Sobrevivente." },
    planejarFuga: { nome: "Planejar Fuga", estilo: "ligeiro", custo: 3, recarga: "planejarFuga", efeito: "fugaNoEncontro", pagina: 8, lacuna: "planejarFuga",
      texto: "No começo do próximo Encontro, pode mover um dado da Pilha Comum para a Pilha de Fuga." },
    resistirADor: { nome: "Resistir à Dor", estilo: "firme", custo: 2, recarga: "fimEncontro", efeito: "dado", pagina: 8,
      texto: "Você recebe um dado adicional para a sua Pilha Comum." },
    surpreender: { nome: "Surpreender", estilo: "potente", custo: 3, recarga: "fimEncontro", efeito: "sucessoPartir", pagina: 8,
      texto: "Garante um sucesso no seu próximo teste de Partir Para Cima." },
  };
  var ORDEM_VANTAGENS = ["choqueDeRealidade", "tomarJeito", "tratarFeridas", "cacarRecursos", "compartilharForcas", "planejarFuga", "resistirADor", "surpreender"];

  /* Os efeitos que uma Vantagem da mesa pode ter (a Diretora cria). */
  var EFEITOS_DE_VANTAGEM = {
    dado:            { nome: "+1 dado na Pilha Comum" },
    reduzirFerida:   { nome: "Reduz a próxima Ferida", valor: true },
    sucessoPartir:   { nome: "Um sucesso garantido no próximo Partir Para Cima" },
    fugaNoEncontro:  { nome: "Mover 1 dado para a Pilha de Fuga no próximo Encontro" },
    recurso:         { nome: "Recebe um Recurso (1 uso)" },
    recuperarEstilo: { nome: "Recupera um Estilo Incapacitado" },
    transferirPt:    { nome: "Transfere PT para outra Sobrevivente" },
    manual:          { nome: "Só registra (a mesa resolve)" },
  };

  /* ---------------------------------------------------------------
     AÇÕES DE ENCONTRO (p. 22–23)
     --------------------------------------------------------------- */
  var ACOES_ENCONTRO = {
    ajudarAlguem:     { nome: "Ajudar Alguém", estilo: "livre", teste: "contagem", pagina: 22,
      texto: "Teste num Estilo apropriado. Os dados que derem sucesso são doados a uma Sobrevivente à sua escolha; os que falharem não são descartados." },
    arriscarTudo:     { nome: "Arriscar Tudo", estilo: null, teste: null, pagina: 22,
      texto: "Escolha uma Sobrevivente (pode ser você) para escapar do Encontro na hora; você descarta todos os seus dados. Uma Sobrevivente por Encontro, um uso por sessão, e nunca se você for a última na cena." },
    distrair:         { nome: "Distrair", estilo: "desenrolado", teste: "complexo", pagina: 22,
      texto: "Teste Complexo Desenrolado. Superado, a Diretora precisa gastar 1 dado comum e 3 Pontos de Horror para MATAR na vez dela. Acumula." },
    partirParaCima:   { nome: "Partir Para Cima", estilo: "potente", teste: "comum", pagina: 23,
      texto: "Teste Potente. Com ao menos um sucesso, a Diretora descarta um dado." },
    recuperarFolego:  { nome: "Recuperar Fôlego", estilo: null, teste: null, pagina: 23,
      texto: "Você recebe +1 dado comum na sua Pilha." },
    vazarDali:        { nome: "Vazar Dali", estilo: "ligeiro", teste: "contagem", pagina: 23,
      texto: "Teste Ligeiro. Cada sucesso vai para a Pilha de Fuga; cada 6 puxa mais um dado da Pilha Comum (ou, sem dados nela, da Pilha de Descarte) para a Fuga." },
  };
  var ORDEM_ACOES_ENCONTRO = ["ajudarAlguem", "arriscarTudo", "distrair", "partirParaCima", "recuperarFolego", "vazarDali"];

  /* ---------------------------------------------------------------
     AÇÕES DO ASSASSINO (p. 13–14) e APAVOROS (p. 15)
     --------------------------------------------------------------- */
  var ACOES_ASSASSINO = {
    assustar:  { nome: "Assustar",  tipo: "geral", cena: ["encontro", "livre"], custo: 0, pagina: 13,
      texto: "Força um Teste de Susto nas Sobreviventes, até o número de Testes de Susto por Encontro do Assassino. Se alguém suspirar de medo ou se contorcer de nojo, +1 PH." },
    dificultar:{ nome: "Dificultar", tipo: "geral", cena: ["encontro"], custo: 4, pagina: 13,
      texto: "No início de um Encontro, aumenta a Pilha de Fuga em 1." },
    escapar:   { nome: "Escapar",   tipo: "geral", cena: ["encontro"], custo: 0, pagina: 13,
      texto: "Na sua vez, retira-se do Encontro, encerrando a cena, e recebe 1 dado na Pilha." },
    ferir:     { nome: "Ferir",     tipo: "geral", cena: ["encontro"], custo: 0, pagina: 13,
      texto: "Escolha uma Sobrevivente e role um dado: 6 a mata na hora; 1 a 5 vira o Dado Marcador da Ferida (somado à Ferida que ela já tiver). Cada FERIR dá 1 Sequela; a Ferida não pode ser reduzida abaixo das Sequelas. O dado rolado é descartado." },
    matar:     { nome: "Matar",     tipo: "geral", cena: ["encontro", "livre"], custo: 0, pagina: 13,
      texto: "Num Encontro, mata uma Sobrevivente com menos dados que a sua Pilha. Em qualquer cena, pode matar pela ação POSSUIR." },
    mutilar:   { nome: "Mutilar",   tipo: "geral", cena: ["encontro", "livre"], custo: 0, pagina: 13,
      texto: "Ao tirar 6 num FERIR, descarta o dado e deixa o alvo vivo com mais 3 Sequelas e uma última chance de correr. Recebe 4 PH." },
    acidentar: { nome: "Acidentar", tipo: "unica", cena: ["livre"], custo: 4, pagina: 14,
      texto: "Ao ASSUSTAR o grupo fora de um Encontro, pode FERIR uma Sobrevivente que falhou no teste." },
    devorar:   { nome: "Devorar",   tipo: "unica", cena: ["encontro", "livre"], custo: 0, pagina: 14,
      texto: "Quando uma Sobrevivente anunciar um 6 num teste, recebe 1 PH; ela mantém o sucesso." },
    incapacitar:{ nome: "Incapacitar", tipo: "unica", cena: ["encontro"], custo: 4, pagina: 14,
      texto: "Ao FERIR uma Sobrevivente num Encontro, incapacita um dos Estilos dela (e a Vantagem desse Estilo)." },
    possuir:   { nome: "Possuir",   tipo: "unica", cena: ["encontro"], custo: 0, pagina: 14,
      texto: "Dá à Sobrevivente um Dado Marcador 1, que sobe 1 a cada dado falho que ela rolar. No 6, em qualquer cena, você pode MATAR uma Sobrevivente por meio da possuída, sem as condições do MATAR; num Encontro, isso acontece na vez da possuída, que perde a vez. O marcador é descartado." },
    segurar:   { nome: "Segurar",   tipo: "unica", cena: ["encontro"], custo: 5, pagina: 14,
      texto: "Ao FERIR sem matar, imobiliza a Sobrevivente: ela não move dados para a Pilha de Fuga e a Ferida sobe 1 no começo de cada turno dela. As outras podem fazer Testes Complexos para livrá-la." },
    restringir:{ nome: "Restringir", tipo: "unica", cena: ["encontro"], custo: 0, pagina: 14,
      texto: "Dá um Dado Marcador 3: enquanto existir, todos os testes da Sobrevivente são Complexos. Testes Ligeiros ou Sagazes o reduzem em 1 por sucesso; falhar aumenta em 1 e dá Feridas iguais ao valor. Some ao zerar." },
  };

  var APAVOROS = {
    buh:               { nome: "Buh!", cena: "Livre", recarga: "livre", custo: 4, pagina: 15,
      texto: "No início de um Encontro, provoca um Teste de Susto em todas as Sobreviventes da cena, sem gastar os Testes de Susto do Encontro." },
    mudandoDePlanos:   { nome: "Mudando de Planos!", cena: "Livre", recarga: "fimEncontro", custo: 5, pagina: 15,
      texto: "Logo após o fim de um Encontro, troca uma Ação Única por outra da mesma Ameaça." },
    sintoCheiroDeSangue: { nome: "Sinto Cheiro de Sangue!", cena: "Encontro", recarga: "inicioEncontro", custo: null, custoPorInterprete: 2, pagina: 15,
      texto: "Ao MATAR uma Sobrevivente pela primeira vez num Encontro, força as vivas a descartar 1 dado. Custa 2 PH por Intérprete do grupo." },
    suaHoraChegou:     { nome: "Sua Hora Chegou!", cena: "Encontro", recarga: "fimEncontro", custo: 3, pagina: 15,
      texto: "No início de um Encontro, aumenta em 1 um Dado Marcador da mesa, menos os de Ferida." },
  };

  /* ---------------------------------------------------------------
     AMEAÇAS (p. 11, 16) — as quatro descritas no Corte Rápido; as
     outras só aparecem pelo nome nas fichas prontas (definida: false)
     --------------------------------------------------------------- */
  var AMEACAS = {
    assombracao: { nome: "Assombração", adjetivos: "Etérea · Macabra · Nefasta", representante: "sangria", definida: true, pagina: 16,
      acoesUnicas: ["acidentar", "incapacitar", "possuir"], intento: "assombracao",
      texto: "Caminha entre os mortos e os vivos, presa a este plano por vingança, proteção ou rancor." },
    brutamontes: { nome: "Brutamontes", adjetivos: "Amedrontador · Brutal · Resiliente", representante: "bruto", definida: true, pagina: 16,
      acoesUnicas: ["incapacitar", "segurar"], intento: "brutamontes",
      texto: "Forte, grande e resistente; um predador nato que raramente poupa esforço." },
    estrategico: { nome: "Estratégico", adjetivos: "Calculista · Cruel · Frio", representante: "rato", definida: true, pagina: 16,
      acoesUnicas: ["acidentar", "devorar", "incapacitar", "restringir"], intento: "estrategico",
      texto: "Sabe o que quer, quando e como; paciente, ardiloso e sádico." },
    mestre:      { nome: "Mestre", adjetivos: "Influente · Líder · Manipulador", representante: "profeta", definida: true, pagina: 16,
      acoesUnicas: ["segurar", "possuir", "devorar", "incapacitar"], intento: "mestre",
      texto: "Tema o que os seguidores dele são capazes de fazer: um culto, um político, uma histeria coletiva, um vírus." },
    carniceiro:  { nome: "Carniceiro", definida: false, pagina: 17, acoesUnicas: [], intento: "",
      texto: "Citada nas fichas do Bruto e do Profeta; não é descrita no Corte Rápido." },
    amaldicoada: { nome: "Amaldiçoada", definida: false, pagina: 18, acoesUnicas: [], intento: "",
      texto: "Citada na ficha da Sangria; não é descrita no Corte Rápido." },
    perseguidor: { nome: "Perseguidor", definida: false, pagina: 19, acoesUnicas: [], intento: "",
      texto: "Citada na ficha do Rato; não é descrita no Corte Rápido." },
  };
  var AMEACAS_DEFINIDAS = ["assombracao", "brutamontes", "estrategico", "mestre"];

  /* ---------------------------------------------------------------
     INTENTOS (p. 12, 16) — PH ganhos. auto: o motor verifica sozinho
     --------------------------------------------------------------- */
  var INTENTOS_HORRIVEIS = {
    beijo:          { texto: "Sobreviventes se beijam.", ph: 1, auto: false },
    morteEncontro:  { texto: "Sobrevivente morre durante um Encontro.", ph: 1, auto: true },
    feridaEncontro: { texto: "Sobrevivente sai com uma Ferida de um Encontro.", ph: 1, auto: true },
    choque:         { texto: "Sobrevivente usa a Vantagem Choque de Realidade.", ph: 1, auto: true },
    sustoFalha:     { texto: "Sobrevivente falha num Teste de Susto.", ph: 1, auto: true },
    armadilha:      { texto: "Sobrevivente cai numa Armadilha.", ph: 2, auto: false },
    primeiroTurno:  { texto: "Todas as Sobreviventes tentam escapar de um Encontro no primeiro turno.", ph: 4, auto: true },
  };
  var ORDEM_INTENTOS = ["beijo", "morteEncontro", "feridaEncontro", "choque", "sustoFalha", "armadilha", "primeiroTurno"];
  var INTENTOS_UNICOS = {
    assombracao: { texto: "Ao impor um Teste de Susto, recebe PH igual ao número de Sobreviventes que falharem.", auto: true },
    brutamontes: { texto: "Quando uma Sobrevivente falha num teste de Partir Para Cima, recebe 2 PH.", auto: true },
    estrategico: { texto: "Recebe 1 PH por Armadilha ativada num Suspense.", auto: true },
    mestre:      { texto: "Recebe 1 PH toda vez que uma Intérprete obtém a primeira Sequela na sessão.", auto: true },
  };

  /* ---------------------------------------------------------------
     ASSASSINOS PRONTOS (p. 17–20)
     --------------------------------------------------------------- */
  var ASSASSINOS = {
    bruto:   { nome: "Bruto", ameacas: ["brutamontes", "carniceiro"], dados: 6, ph: 3, sustos: 1, acoesUnicas: ["incapacitar", "segurar"], apavoro: "sintoCheiroDeSangue", pagina: 17,
      resumo: "Um gigante recluso numa mansão de campo; o martelo enferrujado do pai serve para acabar com quem invade o seu exílio." },
    sangria: { nome: "Sangria", ameacas: ["assombracao", "amaldicoada"], dados: 4, ph: 2, sustos: 3, acoesUnicas: ["acidentar", "possuir"], apavoro: "buh", pagina: 18,
      resumo: "A assombração invocada diante do espelho: responde a qualquer pergunta, mas cobra um preço carmesim." },
    rato:    { nome: "Rato", ameacas: ["estrategico", "perseguidor"], dados: 3, ph: 1, sustos: 4, acoesUnicas: ["acidentar", "restringir"], apavoro: "mudandoDePlanos", pagina: 19,
      resumo: "Uma lenda de fóruns que monta a cena perfeita de slasher, sempre um passo à frente das vítimas." },
    profeta: { nome: "Profeta", ameacas: ["mestre", "carniceiro"], dados: 3, ph: 1, sustos: 3, acoesUnicas: ["devorar", "possuir"], apavoro: "suaHoraChegou", pagina: 20,
      resumo: "Líder de uma igreja de sangue numa cabana na floresta; manipula os seguidores e pratica hemomancia." },
  };
  var ORDEM_ASSASSINOS = ["bruto", "sangria", "rato", "profeta"];

  /* ---------------------------------------------------------------
     LACUNAS — o que o Corte Rápido não define. Cada uma diz onde a
     mesa decide. As "leituras" são as que o R.A.M.A. usa enquanto a
     Diretora não muda (Mesa da Diretora → Lacunas do Corte Rápido).
     --------------------------------------------------------------- */
  var LACUNAS = {
    metaFuga: { titulo: "Tamanho da Pilha de Fuga", onde: "Ao iniciar cada Encontro",
      texto: "Cada Assassino muda o tamanho da Pilha de Fuga \"de uma maneira descrita em sua ficha\" (p. 22), mas as fichas prontas não trazem o valor. A Diretora escolhe de 1 a 6 ao iniciar o Encontro (Dificultar soma 1, até 6)." },
    tratarFeridas: { titulo: "Custo de Tratar Feridas", onde: "Lacunas da mesa",
      texto: "O custo é \"Confira a descrição\", e a descrição não diz (p. 8; o efeito repete o de Choque de Realidade). Até a Diretora definir o custo, a Vantagem fica indisponível, com o motivo." },
    cacarRecursos: { titulo: "Caçar Recursos: custo e recarga trocados", onde: "Vantagem",
      texto: "A ficha traz \"Recarga: 3 pts\" e \"Custo: Sem restrição\" (p. 8). Leitura: custo 3 PT, recarga sem restrição." },
    planejarFuga: { titulo: "Planejar Fuga: \"Recarga: 6 pts\"", onde: "Lacunas da mesa",
      texto: "A recarga traz um valor em pontos (p. 8). Leitura: vale até o efeito pendente ser usado no próximo Encontro; a Diretora pode trocar para \"Fim de um Encontro\" ou \"Sem restrição\"." },
    caraLavada: { titulo: "Cara Lavada (Valentona)", onde: "Na hora do uso",
      texto: "O texto termina em \"descartar um dado da sua Pilha de Fuga\" (p. 12). O R.A.M.A. descarta o dado e abre uma decisão para a Diretora resolver o resto." },
    fonteDosDados: { titulo: "De onde vem o dado recebido", onde: "Lacunas da mesa",
      texto: "Recuperar Fôlego, Choque de Realidade, Resistir à Dor e Tratar Feridas dão \"um dado\" sem dizer de onde. Leitura: da Pilha de Descarte quando houver; senão, um dado novo. A Diretora pode escolher \"sempre do Descarte\" ou \"sempre novo\"." },
    ferir: { titulo: "De quem é o dado do FERIR", onde: "Ação FERIR",
      texto: "\"Rolar um de seus dados\" (p. 13). Leitura: um dado da Pilha da Diretora, gasto e descartado (o turno do Assassino \"gasta dados da sua Pilha\", p. 23)." },
    feridaAlem: { titulo: "Ferida acima de 6", onde: "Decisão da Diretora",
      texto: "Feridas se somam, mas o Corte Rápido não diz o que acontece quando passam do valor de um dado. O R.A.M.A. avisa a Diretora e não mata ninguém sozinho." },
    entradaEncontro: { titulo: "Condição do Encontro", onde: "Ao iniciar",
      texto: "\"Quando a sua Pilha superar em quantidade a de qualquer Intérprete\" (p. 21). Leitura: maior que a Pilha Comum de pelo menos uma Sobrevivente presente." },
    sustosForaDoEncontro: { titulo: "Testes de Susto fora do Encontro", onde: "Ação ASSUSTAR",
      texto: "O limite das fichas é \"por Encontro\" (p. 17–20). Fora dele, o R.A.M.A. não conta limite." },
    estilosIncapacitados: { titulo: "Estilo Incapacitado nos testes", onde: "Testes",
      texto: "O PDF diz que o Estilo Incapacitado impede a Vantagem dele (p. 8, 14). Leitura: ele também deixa de reduzir a Dificuldade enquanto estiver incapacitado." },
    recursosPorTeste: { titulo: "Recursos por teste", onde: "Testes",
      texto: "Cada Recurso reduz a Dificuldade em 1 (p. 8). O PDF não limita quantos num teste; o R.A.M.A. aceita vários, com Dificuldade mínima 2 (um 1 nunca é sucesso)." },
    excessoDeDados: { titulo: "Dados além do limite de 6", onde: "Doações e fim do Encontro",
      texto: "A Pilha Comum nunca passa de 6 (p. 3). O que passaria (uma doação, a Fuga voltando) fica com quem doou ou vai para a Pilha de Descarte." },
    morteDados: { titulo: "Os dados de quem morre", onde: "Morte",
      texto: "O PDF não diz. Os dados da Pilha Comum de uma Sobrevivente morta saem de jogo (ficam com ela)." },
    distrair: { titulo: "Duração do Distrair", onde: "Encontro",
      texto: "\"Durante sua vez\" e \"cumulativa\" (p. 22). Leitura: vale para a próxima vez do Assassino e zera depois dela." },
    estigma: { titulo: "Estigma e Nível de Brutalidade", onde: "Ficha do Assassino",
      texto: "O Corte Rápido cita o Estigma (da Ameaça Principal) e o Nível de Brutalidade, mas não os descreve. Ficam como texto livre; um Assassino personalizado recebe dados, PH e Testes de Susto à mão." },
    carniceiro: { titulo: "Ameaças sem descrição", onde: "Assassinos prontos",
      texto: "Carniceiro, Amaldiçoada e Perseguidor aparecem só pelo nome; não trazem Ações nem Intentos." },
    vantagensDoPrint: { titulo: "Vantagens fora do Corte Rápido", onde: "Vantagens da mesa",
      texto: "Vantagens de outras versões de BRUTAL não estão no PDF. A Diretora pode criá-las como Vantagens da mesa, com custo, recarga e um efeito automático." },
  };

  global.RAMABrutalCatalogo = {
    FONTE: FONTE, referencia: referencia, LIMITES: LIMITES, CENAS: CENAS,
    ESTILOS: ESTILOS, ORDEM_ESTILOS: ORDEM_ESTILOS, RECARGAS: RECARGAS,
    ARQUETIPOS: ARQUETIPOS, ORDEM_ARQUETIPOS: ORDEM_ARQUETIPOS, INICIATIVA: INICIATIVA,
    APEGOS: APEGOS, VANTAGENS: VANTAGENS, ORDEM_VANTAGENS: ORDEM_VANTAGENS, EFEITOS_DE_VANTAGEM: EFEITOS_DE_VANTAGEM,
    ACOES_ENCONTRO: ACOES_ENCONTRO, ORDEM_ACOES_ENCONTRO: ORDEM_ACOES_ENCONTRO,
    ACOES_ASSASSINO: ACOES_ASSASSINO, APAVOROS: APAVOROS,
    AMEACAS: AMEACAS, AMEACAS_DEFINIDAS: AMEACAS_DEFINIDAS,
    INTENTOS_HORRIVEIS: INTENTOS_HORRIVEIS, ORDEM_INTENTOS: ORDEM_INTENTOS, INTENTOS_UNICOS: INTENTOS_UNICOS,
    ASSASSINOS: ASSASSINOS, ORDEM_ASSASSINOS: ORDEM_ASSASSINOS,
    LACUNAS: LACUNAS,
  };
})(typeof window !== "undefined" ? window : globalThis);
