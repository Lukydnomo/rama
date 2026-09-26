/* =====================================================================
   R.A.M.A. — Ordem Paranormal · condições e efeitos aplicados
   =====================================================================
   A biblioteca de condições do livro e as APLICAÇÕES delas numa ficha:
   cada aplicação é uma instância própria, com origem, descrição,
   modificadores, duração e quem aplicou. Sem tela e sem rede — a ficha
   desenha, o combate aplica pelo servidor, e as contas de regras.js
   perguntam daqui quanto cada efeito soma.

   ---------------------------------------------------------------------
   O QUE MORA ONDE
   ---------------------------------------------------------------------

     catálogo      as condições de Ordem Paranormal RPG (p. 88 e o
                   apêndice, p. 310-311), com o texto em palavras
                   nossas, a página, os efeitos que entram na conta e as
                   condições que cada uma traz junto
     instância     `ordem.condicoes.efeitos[]`: uma aplicação. Copia do
                   modelo o que ela usa; mexer nela nunca muda o catálogo
     rastreador    morrendo, enlouquecendo, inconsciente e perturbado
                   continuam em js/ordem/condicoes.js, com a regra
                   própria de cada um. A biblioteca os mostra, e aplicar
                   um deles liga o rastreador — nunca vira efeito
                   genérico que some depois de três turnos

   ---------------------------------------------------------------------
   OS MODIFICADORES SÃO DADOS, NUNCA CÓDIGO
   ---------------------------------------------------------------------

   Um modificador é { alvo, tipo, valor } de uma lista fechada: bônus
   numérico, dados a mais ou a menos, e uma operação de deslocamento.
   Texto livre é texto — nada escrito numa descrição é interpretado,
   avaliado ou somado. Restrições ("não pode fazer ações") são avisos.

   Alvos contextuais (ataque corpo a corpo, Defesa contra ataques à
   distância) só entram na conta que tem aquele contexto: o ataque com
   arma corpo a corpo, e nada mais. A Defesa contextual aparece como
   observação ao lado da Defesa — ela depende de quem ataca.

   ---------------------------------------------------------------------
   ACÚMULO (Ordem Paranormal RPG, p. 312-313)
   ---------------------------------------------------------------------

     · bônus de fontes diferentes acumulam; da mesma fonte, não. O mesmo
       vale para penalidades, e bônus e penalidades se somam entre si;
     · efeitos de rituais não acumulam entre si; nem os de itens, nem os
       de aliados — vale o maior bônus e a maior penalidade de cada fonte;
     · habilidades diferentes acumulam, exceto a mesma habilidade;
     · condições com o mesmo efeito não acumulam: vale a mais severa
       ("desprevenido e vulnerável sofre −5 na Defesa");
     · a mesma aplicação repetida (o mesmo modelo, ou o mesmo nome num
       efeito da mesa) conta uma vez.

   Uma condição que traz outras (exausto: debilitado, lento e
   vulnerável) não as grava: elas são DERIVADAS a cada leitura. Por isso
   tirar a fonte tira a derivada — a menos que outra fonte ainda a cause.
   ===================================================================== */

(function (global) {
  "use strict";

  var OP = "OPRPG";

  var MAX_INSTANCIAS = 80;
  var MAX_MODIFICADORES = 16;
  var MAX_EVENTOS = 120;
  var MAX_TURNOS = 99;
  var LIMITE_VALOR = 99;

  function U() { return global.RAMAUtil || null; }

  function uuid() {
    if (U() && U().uuid) return U().uuid();
    return "x" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function agora() { return new Date().toISOString(); }

  function texto(v, limite) {
    return String(v === undefined || v === null ? "" : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").slice(0, limite || 120);
  }

  function carimbo(v) {
    if (typeof v !== "string" || !v) return "";
    var d = new Date(v);
    return isNaN(d.getTime()) ? "" : v.slice(0, 40);
  }

  function idValido(v) {
    var s = texto(v, 160);
    return /^[A-Za-z0-9_.:|#-]{1,160}$/.test(s) ? s : "";
  }

  function inteiro(v, min, max, padrao) {
    var n = Math.round(Number(v));
    if (!isFinite(n)) return padrao;
    return Math.max(min, Math.min(max, n));
  }

  function chaveDeBusca(v) {
    var s = texto(v, 120).toLowerCase();
    if (s.normalize) s = s.normalize("NFD").replace(/[̀-ͯ]/g, "");
    return s.replace(/\s+/g, " ").trim();
  }

  function copia(x) { return JSON.parse(JSON.stringify(x)); }

  /* =================================================================
     ALVOS E TIPOS
     ================================================================= */

  var ATRIBUTOS = [
    { chave: "agi", nome: "Agilidade" },
    { chave: "for", nome: "Força" },
    { chave: "int", nome: "Intelecto" },
    { chave: "pre", nome: "Presença" },
    { chave: "vig", nome: "Vigor" },
  ];

  /* `contexto`: só vale numa conta que tem aquele contexto. */
  var ALVOS = [
    { chave: "testes", nome: "Todos os testes (perícias e atributos)", tipos: ["dados", "bonus"] },
    { chave: "pericias", nome: "Testes de perícia", tipos: ["dados", "bonus"] },
    { chave: "ataques", nome: "Testes de ataque", tipos: ["dados", "bonus"] },
    { chave: "ataques:corpo", nome: "Ataques corpo a corpo", tipos: ["dados", "bonus"], contexto: true },
    { chave: "ataques:distancia", nome: "Ataques à distância", tipos: ["dados", "bonus"], contexto: true },
    { chave: "defesa", nome: "Defesa", tipos: ["bonus"] },
    { chave: "defesa:corpo", nome: "Defesa contra ataques corpo a corpo", tipos: ["bonus"], contexto: true },
    { chave: "defesa:distancia", nome: "Defesa contra ataques à distância", tipos: ["bonus"], contexto: true },
    { chave: "dano", nome: "Rolagens de dano", tipos: ["bonus"] },
    { chave: "dano:corpo", nome: "Dano corpo a corpo", tipos: ["bonus"], contexto: true },
    { chave: "dano:distancia", nome: "Dano à distância", tipos: ["bonus"], contexto: true },
    { chave: "deslocamento", nome: "Deslocamento", tipos: ["deslocamento"] },
    { chave: "custoPe", nome: "Custo em PE de habilidades e rituais", tipos: ["bonus"], informativo: true },
    { chave: "resistenciaDano", nome: "Resistência a dano", tipos: ["bonus"], informativo: true },
  ].concat(ATRIBUTOS.map(function (a) {
    return { chave: "atributo:" + a.chave, nome: "Testes de " + a.nome + " (e perícias de " + a.nome + ")", tipos: ["dados", "bonus"] };
  }));

  var PORALVO = {};
  ALVOS.forEach(function (a) { PORALVO[a.chave] = a; });

  var TIPOS = ["bonus", "dados", "deslocamento"];
  var OPERACOES = ["soma", "metade", "zero", "fixo"];

  function alvoValido(chave) {
    var c = texto(chave, 60);
    if (PORALVO[c]) return c;
    var m = /^pericia:([a-z]{2,30})$/.exec(c);
    if (m && (!global.RAMAOrdemCatalogo || global.RAMAOrdemCatalogo.pericia(m[1]))) return c;
    return "";
  }

  function nomeDoAlvo(chave) {
    if (PORALVO[chave]) return PORALVO[chave].nome;
    var m = /^pericia:(.+)$/.exec(chave || "");
    if (m) {
      var p = global.RAMAOrdemCatalogo ? global.RAMAOrdemCatalogo.pericia(m[1]) : null;
      return "Testes de " + (p ? p.nome : m[1]);
    }
    return chave || "";
  }

  function mod(alvo, tipo, valor, extra) {
    return Object.assign({ alvo: alvo, tipo: tipo, valor: valor }, extra || {});
  }

  /* =================================================================
     O CATÁLOGO DE CONDIÇÕES
     -----------------------------------------------------------------
     Ordem Paranormal RPG, apêndice "Condições" (p. 310-311), e as de
     Insanidade & Loucura (p. 88). Os textos são resumos nossos; a
     página está em cada uma. Sobrevivendo ao Horror usa estas mesmas
     condições — não traz condição nova com nome próprio.

     "A menos que especificado o contrário, as condições terminam no fim
     da cena" (p. 310): é a duração que a biblioteca sugere.

     `dados` −1 é "−O" no livro: um dado a menos no teste. Com menos de
     um dado, rola-se dados a mais e fica-se com o pior (OPRPG p. 9;
     ver dadosDoTeste).
     ================================================================= */

  var CATEGORIAS = {
    medo: "Condição de medo",
    paralisia: "Condição de paralisia",
    mental: "Condição mental",
    sentidos: "Condição de sentidos",
    fadiga: "Condição de fadiga",
  };

  function dadosEm(atribs, valor) {
    return atribs.map(function (a) { return mod("atributo:" + a, "dados", valor); });
  }

  var CONDICOES = [
    { chave: "abalado", nome: "Abalado", categoria: "medo", pagina: 310,
      texto: "Um dado a menos em todos os testes. Ficar abalado de novo deixa apavorado.",
      modificadores: [mod("testes", "dados", -1)], repeticao: "apavorado" },
    { chave: "agarrado", nome: "Agarrado", categoria: "paralisia", pagina: 310,
      texto: "Fica desprevenido e imóvel, com um dado a menos em ataques, e só ataca com armas leves. Quem ataca à distância alguém na manobra tem 50% de chance de acertar o alvo errado.",
      modificadores: [mod("ataques", "dados", -1)], inclui: ["desprevenido", "imovel"],
      restricoes: ["Só pode atacar com armas leves.", "Ataques à distância contra quem está na manobra têm 50% de chance de acertar o alvo errado."] },
    { chave: "alquebrado", nome: "Alquebrado", categoria: "mental", pagina: 310,
      texto: "Habilidades e rituais custam +1 PE.",
      modificadores: [mod("custoPe", "bonus", 1)] },
    { chave: "apavorado", nome: "Apavorado", categoria: "medo", pagina: 310,
      texto: "Dois dados a menos em testes de perícia. Foge da fonte do medo pelo caminho mais eficiente (pode parar ao perdê-la de vista ou passar do alcance médio); sem poder fugir, age, mas não se aproxima dela por vontade própria.",
      modificadores: [mod("pericias", "dados", -2)],
      restricoes: ["Deve fugir da fonte do medo; sem poder, não se aproxima dela voluntariamente."] },
    { chave: "asfixiado", nome: "Asfixiado", pagina: 310,
      texto: "Não respira. Prende o fôlego por rodadas iguais ao Vigor, e cada dano sofrido tira uma delas; no fim do turno da última, fica morrendo.",
      restricoes: ["Conte as rodadas de fôlego (Vigor); no fim do turno da última, o personagem fica morrendo."] },
    { chave: "atordoado", nome: "Atordoado", categoria: "mental", pagina: 310,
      texto: "Fica desprevenido e não pode fazer ações.",
      inclui: ["desprevenido"], restricoes: ["Não pode fazer ações."] },
    { chave: "caido", nome: "Caído", pagina: 310,
      texto: "No chão: dois dados a menos em ataques corpo a corpo, deslocamento de 1,5m, −5 na Defesa contra corpo a corpo e +5 contra ataques à distância.",
      modificadores: [mod("ataques:corpo", "dados", -2), mod("deslocamento", "deslocamento", 1.5, { operacao: "fixo" }),
        mod("defesa:corpo", "bonus", -5), mod("defesa:distancia", "bonus", 5)] },
    { chave: "cego", nome: "Cego", categoria: "sentidos", pagina: 310,
      texto: "Fica desprevenido e lento, não faz testes de Percepção para observar e rola dois dados a menos em perícias de Agilidade ou Força. Os alvos dos seus ataques têm camuflagem total.",
      modificadores: dadosEm(["agi", "for"], -2), inclui: ["desprevenido", "lento"],
      restricoes: ["Não pode fazer testes de Percepção para observar.", "Os alvos dos seus ataques têm camuflagem total."] },
    { chave: "confuso", nome: "Confuso", categoria: "mental", pagina: 310,
      texto: "Age ao acaso: no início de cada turno, rola 1d6 — 1) move-se numa direção sorteada (1d8); 2-3) não age; 4-5) ataca o ser mais próximo (ou a si mesmo); 6) a condição termina.",
      acoes: [{ rotulo: "Rolar a confusão (1d6)", expressao: "1d6", quando: "no início de cada turno" }] },
    { chave: "debilitado", nome: "Debilitado", pagina: 310,
      texto: "Dois dados a menos em testes de Agilidade, Força e Vigor. Ficar debilitado de novo deixa inconsciente.",
      modificadores: dadosEm(["agi", "for", "vig"], -2), repeticao: "inconsciente" },
    { chave: "desprevenido", nome: "Desprevenido", pagina: 310,
      texto: "Despreparado para reagir: −5 na Defesa e um dado a menos em Reflexos. Vale contra inimigos que ele não consegue perceber.",
      modificadores: [mod("defesa", "bonus", -5), mod("pericia:reflexos", "dados", -1)] },
    { chave: "doente", nome: "Doente", pagina: 310,
      texto: "Sob efeito de uma doença; o efeito é o da doença.",
      restricoes: ["O efeito e a duração vêm da doença."] },
    { chave: "emChamas", nome: "Em chamas", pagina: 310,
      texto: "Pegando fogo: 1d6 de dano de fogo no início de cada turno. Uma ação padrão apaga as chamas com as mãos; entrar na água também.",
      acoes: [{ rotulo: "Dano do fogo (1d6)", expressao: "1d6", quando: "no início de cada turno", dano: true }],
      restricoes: ["Uma ação padrão apaga o fogo com as mãos; imersão em água também."] },
    { chave: "enjoado", nome: "Enjoado", pagina: 310,
      texto: "Só faz uma ação padrão ou uma de movimento por rodada, não as duas.",
      restricoes: ["Uma ação padrão ou de movimento por rodada, não as duas."] },
    { chave: "enredado", nome: "Enredado", categoria: "paralisia", pagina: 310,
      texto: "Fica lento e vulnerável, com um dado a menos em ataques.",
      modificadores: [mod("ataques", "dados", -1)], inclui: ["lento", "vulneravel"] },
    { chave: "envenenado", nome: "Envenenado", pagina: 311,
      texto: "O efeito é o do veneno — outra condição ou dano recorrente. Sem duração no veneno, dura a cena. Dano recorrente de envenenado sempre acumula.",
      restricoes: ["O efeito é o do veneno; registre-o como modificador ou condição a mais, se houver."] },
    { chave: "esmorecido", nome: "Esmorecido", categoria: "mental", pagina: 311,
      texto: "Dois dados a menos em testes de Intelecto e Presença.",
      modificadores: dadosEm(["int", "pre"], -2) },
    { chave: "exausto", nome: "Exausto", categoria: "fadiga", pagina: 311,
      texto: "Fica debilitado, lento e vulnerável. Ficar exausto de novo deixa inconsciente.",
      inclui: ["debilitado", "lento", "vulneravel"], repeticao: "inconsciente" },
    { chave: "fascinado", nome: "Fascinado", categoria: "mental", pagina: 311,
      texto: "Atenção presa em algo: dois dados a menos em Percepção e nenhuma ação além de observar. Qualquer ação hostil contra ele encerra a condição; sacudi-lo gasta uma ação padrão.",
      modificadores: [mod("pericia:percepcao", "dados", -2)],
      restricoes: ["Não faz ações, exceto observar o que o fascinou.", "Qualquer ação hostil contra ele encerra a condição."] },
    { chave: "fatigado", nome: "Fatigado", categoria: "fadiga", pagina: 311,
      texto: "Fica fraco e vulnerável. Ficar fatigado de novo deixa exausto.",
      inclui: ["fraco", "vulneravel"], repeticao: "exausto" },
    { chave: "fraco", nome: "Fraco", pagina: 311,
      texto: "Um dado a menos em testes de Agilidade, Força e Vigor. Ficar fraco de novo deixa debilitado.",
      modificadores: dadosEm(["agi", "for", "vig"], -1), repeticao: "debilitado" },
    { chave: "frustrado", nome: "Frustrado", categoria: "mental", pagina: 311,
      texto: "Um dado a menos em testes de Intelecto e Presença. Ficar frustrado de novo deixa esmorecido.",
      modificadores: dadosEm(["int", "pre"], -1), repeticao: "esmorecido" },
    { chave: "imovel", nome: "Imóvel", categoria: "paralisia", pagina: 311,
      texto: "Todas as formas de deslocamento caem a 0m.",
      modificadores: [mod("deslocamento", "deslocamento", 0, { operacao: "zero" })] },
    { chave: "inconsciente", nome: "Inconsciente", pagina: 311, rastreador: "inconsciente",
      texto: "Fica indefeso e não faz ações, nem reações. Acordá-lo gasta uma ação padrão.",
      inclui: ["indefeso"], restricoes: ["Não pode fazer ações, incluindo reações."] },
    { chave: "indefeso", nome: "Indefeso", pagina: 311,
      texto: "Conta como desprevenido, mas sofre −10 na Defesa, falha automaticamente em Reflexos e pode sofrer golpes de misericórdia.",
      modificadores: [mod("defesa", "bonus", -10)], inclui: ["desprevenido"],
      restricoes: ["Falha automaticamente em testes de Reflexos.", "Pode sofrer golpes de misericórdia."] },
    { chave: "lento", nome: "Lento", categoria: "paralisia", pagina: 311,
      texto: "Deslocamento pela metade (arredondado para baixo, em incrementos de 1,5m); não pode correr nem fazer investidas.",
      modificadores: [mod("deslocamento", "deslocamento", 0, { operacao: "metade" })],
      restricoes: ["Não pode correr nem fazer investidas."] },
    { chave: "machucado", nome: "Machucado", pagina: 88, automatica: "pv",
      texto: "Com menos da metade dos PV totais. Não causa penalidade; é pré-requisito de habilidades e efeitos. A ficha a mostra sozinha, pelo PV." },
    { chave: "morrendo", nome: "Morrendo", pagina: 88, rastreador: "morrendo",
      texto: "Reduzido a 0 PV: inconsciente e morrendo. Três inícios de turno morrendo na mesma cena, não necessariamente seguidos, e o personagem morre. Curar 1 PV acorda; morrendo só termina com Medicina (DT 20) ou um efeito específico. Usa o contador próprio da ficha." },
    { chave: "enlouquecendo", nome: "Enlouquecendo", pagina: 88, rastreador: "enlouquecendo",
      texto: "Sanidade (ou, com Jogando sem Sanidade, os PD) reduzida por dano mental: três inícios de turno enlouquecendo na mesma cena e a mente sucumbe. Termina com Diplomacia (DT 20) ou curando Sanidade (ou recuperando PD). Usa o contador próprio da ficha." },
    { chave: "perturbado", nome: "Perturbado", pagina: 88, automatica: "san", rastreador: "perturbado",
      texto: "Com menos da metade da Sanidade total — ou, com Jogando sem Sanidade, depois de um dano mental que deixa os PD abaixo da metade (SAH p. 104). Não causa penalidade; é pré-requisito de habilidades e efeitos." },
    { chave: "ofuscado", nome: "Ofuscado", categoria: "sentidos", pagina: 311,
      texto: "Um dado a menos em testes de ataque e de Percepção.",
      modificadores: [mod("ataques", "dados", -1), mod("pericia:percepcao", "dados", -1)] },
    { chave: "paralisado", nome: "Paralisado", categoria: "paralisia", pagina: 311,
      texto: "Fica imóvel e indefeso; só faz ações puramente mentais.",
      inclui: ["imovel", "indefeso"], restricoes: ["Só pode realizar ações puramente mentais."] },
    { chave: "pasmo", nome: "Pasmo", categoria: "mental", pagina: 311,
      texto: "Não pode fazer ações.",
      restricoes: ["Não pode fazer ações."] },
    { chave: "petrificado", nome: "Petrificado", pagina: 311,
      texto: "Fica inconsciente e recebe resistência a dano 10.",
      modificadores: [mod("resistenciaDano", "bonus", 10)], inclui: ["inconsciente"] },
    { chave: "sangrando", nome: "Sangrando", pagina: 311,
      texto: "Ferimento aberto: no início de cada turno, teste de Vigor (DT 20). Passando, estabiliza e a condição termina; falhando, perde 1d6 PV e continua sangrando.",
      acoes: [
        { rotulo: "Teste de Vigor (DT 20)", atributo: "vig", quando: "no início de cada turno" },
        { rotulo: "Perda de PV (1d6)", expressao: "1d6", quando: "se falhar no teste", dano: true },
      ] },
    { chave: "surdo", nome: "Surdo", categoria: "sentidos", pagina: 311,
      texto: "Não faz testes de Percepção para ouvir, rola dois dados a menos em Iniciativa e conta como condição ruim para lançar rituais.",
      modificadores: [mod("pericia:iniciativa", "dados", -2)],
      restricoes: ["Não pode fazer testes de Percepção para ouvir.", "Condição ruim para lançar rituais."] },
    { chave: "surpreendido", nome: "Surpreendido", pagina: 311,
      texto: "Não percebeu os inimigos: fica desprevenido e não pode fazer ações.",
      inclui: ["desprevenido"], restricoes: ["Não pode fazer ações."] },
    { chave: "vulneravel", nome: "Vulnerável", pagina: 311,
      texto: "−5 na Defesa.",
      modificadores: [mod("defesa", "bonus", -5)] },
  ];

  var PORCHAVE = {};
  CONDICOES.forEach(function (c) {
    c.fonte = OP;
    c.modificadores = c.modificadores || [];
    c.inclui = c.inclui || [];
    c.restricoes = c.restricoes || [];
    c.acoes = c.acoes || [];
    PORCHAVE[c.chave] = c;
  });

  function condicao(chave) { return PORCHAVE[chave] || null; }

  /* =================================================================
     RITUAIS COM EFEITO ESTRUTURADO
     -----------------------------------------------------------------
     Qualquer ritual do catálogo pode virar um efeito aplicado (nome,
     texto e duração vêm dele). Estes, além disso, têm o bônus que dão
     escrito como modificador — conferido na página de cada um. O resto
     do ritual (tamanho, PV temporários, resistência a dano de um tipo)
     fica no texto. Uma versão pode mudar o bônus.
     ================================================================= */

  var RITUAIS = {
    "op.ritual.coincidencia-forcada": { pagina: 126, versoes: {
      Normal: [mod("pericias", "bonus", 2)],
      Discente: [mod("pericias", "bonus", 2)],
      Verdadeiro: [mod("pericias", "bonus", 5)],
    } },
    "op.ritual.armadura-de-sangue": { pagina: 125, acumulaComRituais: true, versoes: {
      Normal: [mod("defesa", "bonus", 5)],
      Discente: [mod("defesa", "bonus", 10)],
      Verdadeiro: [mod("defesa", "bonus", 15)],
    } },
    "op.ritual.embaralhar": { pagina: 131, versoes: {
      Normal: [mod("defesa", "bonus", 6)],
      Discente: [mod("defesa", "bonus", 10)],
      Verdadeiro: [mod("defesa", "bonus", 16)],
    }, nota: "O bônus cai 2 a cada cópia destruída: ajuste o valor na aplicação." },
    "op.ritual.odio-incontrolavel": { pagina: 136, versoes: {
      Normal: [mod("ataques:corpo", "bonus", 2), mod("dano:corpo", "bonus", 2)],
    } },
    "op.ritual.forma-monstruosa": { pagina: 133, versoes: {
      Normal: [mod("ataques:corpo", "bonus", 5), mod("dano:corpo", "bonus", 5)],
    } },
  };

  function ritualComEfeito(id) { return RITUAIS[id] || null; }

  /* A duração de um ritual, na forma da aplicação. "Sustentada" é até
     alguém encerrar; "instantânea" não deixa efeito para acompanhar. */
  function duracaoDoRitual(texto) {
    var t = chaveDeBusca(texto);
    if (!t || /instant/.test(t)) return null;
    if (/^cena/.test(t)) return { tipo: "cena" };
    if (/sustentad|permanente|ate ser|ate descarregar/.test(t)) return { tipo: "ateRemover" };
    return { tipo: "especial", texto: texto };
  }

  /* =================================================================
     NORMALIZAÇÃO
     ================================================================= */

  var ORIGENS = ["ritual", "criatura", "habilidade", "item", "aliado", "condicao", "manual"];
  var NOMES_DE_ORIGEM = {
    ritual: "Ritual", criatura: "Criatura", habilidade: "Habilidade", item: "Item", aliado: "Aliado",
    condicao: "Condição", manual: "Aplicação manual",
  };
  var TIPOS_DE_DURACAO = ["cena", "turnos", "ateRemover", "especial"];

  function normalizarModificador(bruto) {
    if (!bruto || typeof bruto !== "object") return null;
    var alvo = alvoValido(bruto.alvo);
    if (!alvo) return null;
    var tipo = TIPOS.indexOf(bruto.tipo) >= 0 ? bruto.tipo : "";
    if (!tipo) return null;
    var def = PORALVO[alvo] || { tipos: ["dados", "bonus"] };
    if (def.tipos.indexOf(tipo) < 0) return null;
    if (tipo === "deslocamento") {
      var op = OPERACOES.indexOf(bruto.operacao) >= 0 ? bruto.operacao : "soma";
      var v = Math.round(Number(bruto.valor) * 10) / 10;
      if (!isFinite(v)) v = 0;
      v = Math.max(-99, Math.min(99, v));
      return { alvo: alvo, tipo: tipo, operacao: op, valor: op === "metade" || op === "zero" ? 0 : v };
    }
    var n = inteiro(bruto.valor, -LIMITE_VALOR, LIMITE_VALOR, 0);
    if (!n) return null;
    if (tipo === "dados") n = Math.max(-10, Math.min(10, n));
    return { alvo: alvo, tipo: tipo, valor: n };
  }

  function normalizarDuracao(bruto) {
    var b = (bruto && typeof bruto === "object") ? bruto : {};
    var tipo = TIPOS_DE_DURACAO.indexOf(b.tipo) >= 0 ? b.tipo : "cena";
    var d = { tipo: tipo };
    if (tipo === "turnos") {
      d.turnos = inteiro(b.turnos, 1, MAX_TURNOS, 1);
      d.contador = b.contador === "participante" ? "participante" : "alvo";
      d.momento = b.momento === "fim" ? "fim" : "inicio";
      if (d.contador === "participante") {
        var p = (b.participante && typeof b.participante === "object") ? b.participante : {};
        d.participante = { id: idValido(p.id), nome: texto(p.nome, 80), combate: idValido(p.combate) };
        if (!d.participante.id) d.contador = "alvo";
      }
    }
    if (tipo === "especial") d.texto = texto(b.texto, 120);
    return d;
  }

  function normalizarEvento(bruto) {
    if (!bruto || typeof bruto !== "object") return null;
    var id = idValido(bruto.id);
    if (!id) return null;
    return { id: id, origem: bruto.origem === "combate" ? "combate" : "manual", em: carimbo(bruto.em) };
  }

  function normalizarPessoa(bruto) {
    var b = (bruto && typeof bruto === "object") ? bruto : {};
    return { id: texto(b.id, 60), nome: texto(b.nome, 80), papel: b.papel === "mestre" ? "mestre" : "jogador" };
  }

  function normalizarInstancia(bruto) {
    if (!bruto || typeof bruto !== "object") return null;
    var id = idValido(bruto.id);
    var nome = texto(bruto.nome, 80).trim();
    if (!id || !nome) return null;
    var modelo = texto(bruto.modelo, 80);
    if (modelo && !/^(cond|ritual):[A-Za-z0-9_.-]{1,70}$/.test(modelo)) modelo = "";
    var tipo = bruto.tipo === "condicao" ? "condicao" : "efeito";
    var origem = (bruto.origem && typeof bruto.origem === "object") ? bruto.origem : {};
    var vistos = {};
    var eventos = (Array.isArray(bruto.eventos) ? bruto.eventos : []).map(normalizarEvento).filter(function (e) {
      if (!e || vistos[e.id]) return false;
      vistos[e.id] = true;
      return true;
    }).slice(-MAX_EVENTOS);
    var enc = (bruto.encerrado && typeof bruto.encerrado === "object") ? bruto.encerrado : null;
    var inclui = (Array.isArray(bruto.inclui) ? bruto.inclui : []).map(String).filter(function (k) { return !!PORCHAVE[k]; }).slice(0, 6);
    return {
      id: id,
      modelo: modelo,
      tipo: tipo,
      nome: nome,
      descricao: texto(bruto.descricao, 1000),
      versao: texto(bruto.versao, 40),
      origem: { tipo: ORIGENS.indexOf(origem.tipo) >= 0 ? origem.tipo : "manual", nome: texto(origem.nome, 80) },
      alvo: { nome: texto(bruto.alvo && bruto.alvo.nome, 80) },
      modificadores: (Array.isArray(bruto.modificadores) ? bruto.modificadores : []).map(normalizarModificador).filter(Boolean).slice(0, MAX_MODIFICADORES),
      inclui: inclui,
      restricoes: (Array.isArray(bruto.restricoes) ? bruto.restricoes : []).map(function (r) { return texto(r, 200).trim(); }).filter(Boolean).slice(0, 8),
      acumula: bruto.acumula === true,
      duracao: normalizarDuracao(bruto.duracao),
      eventos: eventos,
      descartados: (Array.isArray(bruto.descartados) ? bruto.descartados : []).map(idValido).filter(Boolean).slice(-MAX_EVENTOS),
      aplicadoEm: carimbo(bruto.aplicadoEm),
      aplicadoPor: normalizarPessoa(bruto.aplicadoPor),
      cena: idValido(bruto.cena),
      combate: idValido(bruto.combate),
      personalizado: bruto.personalizado === true,
      encerrado: enc ? {
        em: carimbo(enc.em),
        motivo: ["manual", "cena", "duracao", "repeticao"].indexOf(enc.motivo) >= 0 ? enc.motivo : "manual",
        por: texto(enc.por, 80),
      } : null,
    };
  }

  /* As encerradas ficam na lista para corrigir e reativar; as mais
     antigas saem primeiro quando a lista enche. */
  function normalizarLista(lista) {
    var vistos = {};
    var saida = (Array.isArray(lista) ? lista : []).map(normalizarInstancia).filter(function (x) {
      if (!x || vistos[x.id]) return false;
      vistos[x.id] = true;
      return true;
    });
    if (saida.length > MAX_INSTANCIAS) {
      var encerradas = saida.filter(function (x) { return x.encerrado; });
      var sobra = saida.length - MAX_INSTANCIAS;
      var tirar = {};
      encerradas.slice(0, sobra).forEach(function (x) { tirar[x.id] = true; });
      saida = saida.filter(function (x) { return !tirar[x.id]; }).slice(-MAX_INSTANCIAS);
    }
    return saida;
  }

  function normalizarImunidades(lista) {
    var vistos = {};
    return (Array.isArray(lista) ? lista : []).map(function (x) { return texto(x, 40); }).filter(function (k) {
      var ok = !!PORCHAVE[k] || /^categoria:(medo|paralisia|mental|sentidos|fadiga)$/.test(k);
      if (!ok || vistos[k]) return false;
      vistos[k] = true;
      return true;
    }).slice(0, 40);
  }

  /* =================================================================
     CRIAR UMA APLICAÇÃO
     ================================================================= */

  /* opcoes: { modelo, nome, descricao, origem, modificadores, restricoes,
     duracao, aplicadoPor, alvoNome, cena, combate, versao, quando } */
  function criarInstancia(opcoes) {
    var o = opcoes || {};
    var base = null;
    var m = /^cond:(.+)$/.exec(o.modelo || "");
    if (m) base = condicao(m[1]);
    var inst = {
      id: "ef-" + uuid(),
      modelo: o.modelo || "",
      tipo: base ? "condicao" : "efeito",
      nome: o.nome || (base ? base.nome : "Efeito"),
      descricao: o.descricao !== undefined ? o.descricao : (base ? base.texto : ""),
      versao: o.versao || "",
      origem: o.origem || { tipo: base ? "manual" : "manual", nome: "" },
      alvo: { nome: o.alvoNome || "" },
      modificadores: o.modificadores !== undefined ? o.modificadores : (base ? copia(base.modificadores) : []),
      inclui: base ? base.inclui.slice() : [],
      restricoes: o.restricoes !== undefined ? o.restricoes : (base ? base.restricoes.slice() : []),
      acumula: !!o.acumula,
      duracao: o.duracao || { tipo: "cena" },
      eventos: [],
      descartados: [],
      aplicadoEm: o.quando || agora(),
      aplicadoPor: o.aplicadoPor || {},
      cena: o.cena || "",
      combate: o.combate || "",
      personalizado: false,
      encerrado: null,
    };
    var n = normalizarInstancia(inst);
    if (n) n.personalizado = personalizada(n);
    return n;
  }

  /* Diferente do modelo? Então é um ajuste desta aplicação — marcado, e
     o modelo continua sendo a referência de origem. */
  function personalizada(inst) {
    var m = /^cond:(.+)$/.exec(inst.modelo || "");
    if (m) {
      var base = condicao(m[1]);
      if (!base) return false;
      return inst.nome !== base.nome || inst.descricao !== base.texto ||
        JSON.stringify(inst.modificadores) !== JSON.stringify(base.modificadores.map(normalizarModificador).filter(Boolean));
    }
    var r = /^ritual:(.+)$/.exec(inst.modelo || "");
    if (r) {
      var rit = RITUAIS[r[1]];
      if (!rit) return false;
      var esperado = (rit.versoes[inst.versao || "Normal"] || rit.versoes.Normal || []).map(normalizarModificador).filter(Boolean);
      return JSON.stringify(inst.modificadores) !== JSON.stringify(esperado);
    }
    return false;
  }

  /* =================================================================
     ESTADO DE UMA APLICAÇÃO
     ================================================================= */

  function turnosContados(inst) {
    return inst && inst.duracao && inst.duracao.tipo === "turnos" ? inst.eventos.length : 0;
  }

  function expirou(inst) {
    return !!(inst && inst.duracao && inst.duracao.tipo === "turnos" && inst.eventos.length >= inst.duracao.turnos);
  }

  function ativa(inst) {
    return !!(inst && !inst.encerrado && !expirou(inst));
  }

  function textoDaDuracao(inst) {
    var d = inst.duracao || {};
    if (d.tipo === "cena") return "até o fim da cena";
    if (d.tipo === "ateRemover") return "até ser removido";
    if (d.tipo === "especial") return d.texto ? d.texto + " (acompanhada à mão)" : "duração especial (acompanhada à mão)";
    var de = d.contador === "participante" ? "de " + (d.participante && d.participante.nome ? d.participante.nome : "outro participante") : "do afetado";
    var n = inst.eventos.length;
    var resta = Math.max(0, d.turnos - n);
    return d.turnos + " turno(s) " + de + ", contados no " + (d.momento === "fim" ? "fim" : "início") + " de cada turno" +
      " · " + (resta ? "restam " + resta : "terminou");
  }

  /* =================================================================
     APLICAR, REPETIR, ENCERRAR
     ================================================================= */

  function ativasDoModelo(cond, modelo) {
    if (!modelo) return [];
    return (cond.efeitos || []).filter(function (x) { return x.modelo === modelo && ativa(x); });
  }

  function imune(cond, chave) {
    var c = condicao(chave);
    var lista = (cond && cond.imunidades) || [];
    if (!c) return false;
    return lista.indexOf(chave) >= 0 || (c.categoria && lista.indexOf("categoria:" + c.categoria) >= 0);
  }

  /* O que acontece ao aplicar: `conflito` quando o mesmo modelo já está
     ativo — e aí a tela pergunta. A regra de repetição do livro ("ficar
     abalado de novo deixa apavorado") é oferecida, nunca aplicada sem
     perguntar. */
  function avaliarAplicacao(cond, inst) {
    var m = /^cond:(.+)$/.exec(inst.modelo || "");
    var chave = m ? m[1] : "";
    if (chave && imune(cond, chave)) {
      return { ok: false, motivo: inst.nome + ": o personagem tem imunidade a esta condição." };
    }
    var existentes = ativasDoModelo(cond, inst.modelo);
    if (!existentes.length) return { ok: true, conflito: null };
    var base = chave ? condicao(chave) : null;
    return {
      ok: true,
      conflito: {
        existente: existentes[0],
        repeticao: base && base.repeticao ? condicao(base.repeticao) : null,
      },
    };
  }

  /* modo: "nova" (padrão), "renovar" (reinicia a aplicação que já existe)
     ou "repetir" (aplica a regra de repetição: encerra a existente e
     aplica a condição mais grave — que, sendo inconsciente, liga o
     rastreador). Devolve { ok, acao, instancia, rastreador }. */
  function aplicar(cond, inst, modo, quando) {
    if (!cond.efeitos) cond.efeitos = [];
    var n = normalizarInstancia(inst);
    if (!n) return { ok: false, motivo: "Aplicação inválida." };
    /* Morrendo, Enlouquecendo, Inconsciente e Perturbado têm contador
       próprio na ficha: aplicar pela biblioteca liga esse contador, e
       nunca cria uma segunda contagem em paralelo. */
    var mr = /^cond:(.+)$/.exec(n.modelo || "");
    var baseR = mr ? condicao(mr[1]) : null;
    if (baseR && baseR.rastreador) return { ok: true, acao: "rastreador", rastreador: baseR.rastreador };
    var av = avaliarAplicacao(cond, n);
    if (!av.ok) return av;
    var q = quando || agora();
    if (av.conflito && modo === "renovar") {
      var ex = av.conflito.existente;
      ex.eventos = [];
      ex.descartados = [];
      ex.aplicadoEm = q;
      ex.duracao = n.duracao;
      ex.cena = n.cena || ex.cena;
      ex.combate = n.combate || ex.combate;
      return { ok: true, acao: "renovada", instancia: ex };
    }
    if (av.conflito && modo === "repetir" && av.conflito.repeticao) {
      var velho = av.conflito.existente;
      velho.encerrado = { em: q, motivo: "repeticao", por: "" };
      var nova = av.conflito.repeticao;
      if (nova.rastreador) return { ok: true, acao: "rastreador", rastreador: nova.rastreador, encerrada: velho };
      if (imune(cond, nova.chave)) return { ok: false, motivo: nova.nome + ": o personagem tem imunidade a esta condição." };
      var derivada = criarInstancia({
        modelo: "cond:" + nova.chave, origem: n.origem, duracao: n.duracao, aplicadoPor: n.aplicadoPor,
        alvoNome: n.alvo.nome, cena: n.cena, combate: n.combate, quando: q,
        descricao: nova.texto + " (Por repetição de " + velho.nome + ".)",
      });
      cond.efeitos.push(derivada);
      aparar(cond);
      return { ok: true, acao: "repetida", instancia: achar(cond, derivada.id), encerrada: velho };
    }
    cond.efeitos.push(n);
    aparar(cond);
    return { ok: true, acao: "nova", instancia: achar(cond, n.id) };
  }

  /* Normaliza a lista SEM trocar os objetos que já estavam nela: quem
     guardou uma aplicação continua apontando para a que está valendo. */
  function aparar(cond) {
    var porId = {};
    (cond.efeitos || []).forEach(function (x) { if (x && x.id) porId[x.id] = x; });
    cond.efeitos = normalizarLista(cond.efeitos).map(function (n) {
      var velho = porId[n.id];
      if (!velho || velho === n) return n;
      Object.keys(velho).forEach(function (k) { delete velho[k]; });
      return Object.assign(velho, n);
    });
  }

  function achar(cond, id) {
    return (cond.efeitos || []).filter(function (x) { return x.id === id; })[0] || null;
  }

  function encerrar(cond, id, motivo, por, quando) {
    var inst = achar(cond, id);
    if (!inst || inst.encerrado) return { mudou: false };
    inst.encerrado = { em: quando || agora(), motivo: motivo || "manual", por: por || "" };
    return { mudou: true };
  }

  function reativar(cond, id) {
    var inst = achar(cond, id);
    if (!inst || (!inst.encerrado && !expirou(inst))) return { mudou: false };
    inst.encerrado = null;
    if (expirou(inst)) return { mudou: false, mensagem: "A duração já terminou: corrija a contagem ou mude a duração para reativar." };
    return { mudou: true };
  }

  /* Tira de vez (só as encerradas ou expiradas: a ativa se encerra antes). */
  function remover(cond, id) {
    var inst = achar(cond, id);
    if (!inst || ativa(inst)) return { mudou: false };
    cond.efeitos = cond.efeitos.filter(function (x) { return x.id !== id; });
    return { mudou: true };
  }

  function editar(cond, id, campos) {
    var inst = achar(cond, id);
    if (!inst) return { mudou: false };
    var novo = normalizarInstancia(Object.assign({}, inst, campos || {}));
    if (!novo) return { mudou: false };
    var antes = JSON.stringify(inst);
    Object.keys(novo).forEach(function (k) { inst[k] = novo[k]; });
    inst.personalizado = personalizada(inst);
    return { mudou: antes !== JSON.stringify(inst) };
  }

  /* +1 à mão: um turno de duração que passou fora do combate. */
  function somarTurno(cond, id, quando) {
    var inst = achar(cond, id);
    if (!inst || inst.duracao.tipo !== "turnos" || !ativa(inst)) return { mudou: false };
    inst.eventos.push({ id: "m-" + uuid(), origem: "manual", em: quando || agora() });
    return { mudou: true };
  }

  /* −1: tira o último turno contado; se veio do combate, ele fica
     descartado para o mesmo turno não voltar a contar. */
  function corrigirTurno(cond, id) {
    var inst = achar(cond, id);
    if (!inst || !inst.eventos.length) return { mudou: false };
    var tirado = inst.eventos.pop();
    if (tirado.origem === "combate" && inst.descartados.indexOf(tirado.id) < 0) inst.descartados.push(tirado.id);
    return { mudou: true };
  }

  /* Nova cena: encerra só o que dura "até o fim da cena". */
  function novaCena(cond, quando) {
    var encerradas = [];
    (cond.efeitos || []).forEach(function (inst) {
      if (!inst.encerrado && inst.duracao.tipo === "cena") {
        inst.encerrado = { em: quando || agora(), motivo: "cena", por: "" };
        encerradas.push(inst.nome);
      }
    });
    return { mudou: encerradas.length > 0, encerradas: encerradas };
  }

  /* =================================================================
     TURNOS DO COMBATE
     -----------------------------------------------------------------
     evento = { id, tipo: "inicio" | "fim", participanteId, em, desde }
       id      `cb:` (início) ou `cf:` (fim) + combate:rodada:participante
       desde   quando o turno que TERMINA começou (só no fim)
     `meu` é o id do participante que representa ESTA ficha no combate.

     Conta numa aplicação ativa, com duração em turnos, se o turno é de
     quem ela conta (o afetado, ou o participante escolhido) e no momento
     escolhido. Aplicar durante um turno não gasta aquele mesmo turno: o
     fim de um turno que começou ANTES da aplicação não conta. O mesmo id
     conta uma vez; um id descartado à mão não volta.

     Espelho de backend/Campanhas.gs (registrarTurnoNosEfeitos).
     ================================================================= */

  function contaNoTurno(inst, ev, meu) {
    if (!ativa(inst) || inst.duracao.tipo !== "turnos") return false;
    var d = inst.duracao;
    if ((ev.tipo === "fim") !== (d.momento === "fim")) return false;
    var dono = d.contador === "participante" ? d.participante.id : meu;
    if (!dono || String(dono) !== String(ev.participanteId)) return false;
    if (inst.eventos.some(function (e) { return e.id === ev.id; })) return false;
    if (inst.descartados.indexOf(ev.id) >= 0) return false;
    if (ev.tipo === "fim" && ev.desde && inst.aplicadoEm && inst.aplicadoEm > ev.desde) return false;
    return true;
  }

  function registrarTurno(cond, ev, meu) {
    var id = idValido(ev && ev.id);
    if (!id || !cond || cond.integrarCombate === false) return [];
    var contou = [];
    (cond.efeitos || []).forEach(function (inst) {
      if (!contaNoTurno(inst, Object.assign({}, ev, { id: id }), meu)) return;
      inst.eventos.push({ id: id, origem: "combate", em: carimbo(ev.em) || agora() });
      if (inst.eventos.length > MAX_EVENTOS) inst.eventos = inst.eventos.slice(-MAX_EVENTOS);
      contou.push(inst.id);
    });
    return contou;
  }

  function retirarTurno(cond, id) {
    var alvo = idValido(id);
    if (!alvo || !cond) return [];
    var tirou = [];
    (cond.efeitos || []).forEach(function (inst) {
      var antes = inst.eventos.length;
      inst.eventos = inst.eventos.filter(function (e) { return !(e.id === alvo && e.origem === "combate"); });
      if (inst.eventos.length !== antes) tirou.push(inst.id);
    });
    return tirou;
  }

  /* A ficha precisa ser lida para este evento? (projeção do painel) */
  function precisaDoTurno(cond, ev, meu) {
    if (!cond || cond.integrarCombate === false) return false;
    return (cond.efeitos || []).some(function (inst) {
      if (ev.retirada) return inst.eventos.some(function (e) { return e.id === ev.id; });
      return contaNoTurno(normalizarInstancia(inst) || inst, ev, meu);
    });
  }

  /* =================================================================
     O QUE ESTÁ VALENDO
     -----------------------------------------------------------------
     `extra` = { morrendo, inconsciente, enlouquecendo, perturbado } do
     rastreador. Devolve as condições efetivas, cada uma com as fontes
     que a causam — diretas, derivadas e do rastreador.
     ================================================================= */

  function condicoesEfetivas(cond, extra) {
    var mapa = {};
    var ordem = [];
    function por(chave, fonte, instancia, derivada) {
      if (!PORCHAVE[chave]) return;
      if (imune(cond, chave)) {
        if (!mapa[chave]) { mapa[chave] = { chave: chave, nome: PORCHAVE[chave].nome, fontes: [], imune: true, derivada: derivada, instancias: [] }; ordem.push(chave); }
        mapa[chave].fontes.push(fonte);
        return;
      }
      var novo = !mapa[chave];
      if (novo) {
        mapa[chave] = { chave: chave, nome: PORCHAVE[chave].nome, fontes: [], imune: false, derivada: derivada, instancias: [] };
        ordem.push(chave);
      }
      var e = mapa[chave];
      if (e.fontes.indexOf(fonte) < 0) e.fontes.push(fonte);
      if (instancia) { e.instancias.push(instancia); e.derivada = false; }
      if (!derivada) e.derivada = false;
      var incluidas = instancia ? instancia.inclui : PORCHAVE[chave].inclui;
      if (novo || instancia) {
        (incluidas || []).forEach(function (k) { por(k, PORCHAVE[chave].nome, null, true); });
      }
    }
    var x = extra || {};
    ["morrendo", "inconsciente", "enlouquecendo", "perturbado"].forEach(function (k) {
      if (x[k]) por(k, "rastreador da ficha", null, false);
    });
    (cond && cond.efeitos || []).forEach(function (inst) {
      if (inst.tipo !== "condicao" || !ativa(inst)) return;
      var m = /^cond:(.+)$/.exec(inst.modelo || "");
      if (m) por(m[1], inst.nome, inst, false);
    });
    return ordem.map(function (k) { return mapa[k]; });
  }

  /* A categoria de acúmulo de uma fonte. */
  function categoriaDe(inst) {
    if (inst.tipo === "condicao") return "condicao";
    if (inst.acumula) return "propria";
    var t = inst.origem && inst.origem.tipo;
    if (t === "ritual" || t === "item" || t === "aliado") return t;
    if (t === "habilidade") return "habilidade";
    return "outro";
  }

  function identidadeDe(inst) {
    return inst.modelo || ("nome:" + chaveDeBusca(inst.nome));
  }

  /* Todos os modificadores em vigor, cada um com a fonte. */
  function modificadoresAtivos(cond, extra) {
    var saida = [];
    condicoesEfetivas(cond, extra).forEach(function (e) {
      if (e.imune) return;
      var mods;
      var nome = e.nome;
      if (e.instancias.length) {
        /* A aplicação direta manda — ela pode ter sido ajustada. Várias
           aplicações da mesma condição: vale a mais severa (abaixo). */
        e.instancias.forEach(function (inst) {
          inst.modificadores.forEach(function (m) {
            saida.push({ mod: m, fonte: { nome: inst.nome + (inst.personalizado ? " (ajustada)" : ""), categoria: "condicao", identidade: "cond:" + e.chave, instanciaId: inst.id } });
          });
        });
        return;
      }
      mods = PORCHAVE[e.chave].modificadores;
      mods.forEach(function (m) {
        saida.push({ mod: m, fonte: { nome: nome + (e.derivada ? " (por " + e.fontes.join(", ") + ")" : ""), categoria: "condicao", identidade: "cond:" + e.chave } });
      });
    });
    (cond && cond.efeitos || []).forEach(function (inst) {
      if (inst.tipo === "condicao" || !ativa(inst)) return;
      inst.modificadores.forEach(function (m) {
        saida.push({ mod: m, fonte: { nome: inst.nome + (inst.versao && inst.versao !== "Normal" ? " · " + inst.versao : "") + (inst.personalizado ? " (ajustado)" : ""), categoria: categoriaDe(inst), identidade: identidadeDe(inst), instanciaId: inst.id } });
      });
    });
    return saida;
  }

  var NOMES_DE_CATEGORIA = { condicao: "condições", ritual: "rituais", item: "itens", aliado: "aliados" };

  /* Combina os modificadores de UM número pela regra de acúmulo.
     Devolve { valor, parcelas: [{rotulo, valor, origem}], ignorados }. */
  function combinar(lista) {
    var grupos = {};
    lista.forEach(function (x) {
      var cat = x.fonte.categoria;
      var chave = (cat === "habilidade" || cat === "outro" || cat === "propria") ? cat + "|" + x.fonte.identidade : cat;
      if (!grupos[chave]) grupos[chave] = [];
      grupos[chave].push(x);
    });
    var parcelas = [];
    var ignorados = [];
    var total = 0;
    Object.keys(grupos).forEach(function (chave) {
      var g = grupos[chave];
      var cat = g[0].fonte.categoria;
      var melhor = null;
      var pior = null;
      g.forEach(function (x) {
        if (x.valor > 0 && (!melhor || x.valor > melhor.valor)) melhor = x;
        if (x.valor < 0 && (!pior || x.valor < pior.valor)) pior = x;
      });
      [melhor, pior].forEach(function (x) {
        if (!x) return;
        total += x.valor;
        parcelas.push({ rotulo: x.fonte.nome, valor: x.valor, origem: rotuloDaCategoria(cat) });
      });
      g.forEach(function (x) {
        if (x === melhor || x === pior) return;
        if (x.fonte.identidade === (melhor && melhor.fonte.identidade) && x.valor === melhor.valor) return;
        if (x.fonte.identidade === (pior && pior.fonte.identidade) && x.valor === pior.valor) return;
        ignorados.push({ rotulo: x.fonte.nome, valor: x.valor, motivo: motivoDeNaoAcumular(cat) });
      });
    });
    return { valor: total, parcelas: parcelas, ignorados: ignorados };
  }

  function rotuloDaCategoria(cat) {
    if (cat === "condicao") return "condição";
    if (cat === "ritual") return "efeito de ritual";
    if (cat === "item") return "efeito de item";
    if (cat === "aliado") return "efeito de aliado";
    if (cat === "habilidade") return "efeito de habilidade";
    return "efeito aplicado";
  }

  function motivoDeNaoAcumular(cat) {
    if (cat === "condicao") return "condições com o mesmo efeito não acumulam: vale a mais severa (OPRPG p. 313)";
    if (NOMES_DE_CATEGORIA[cat]) return "efeitos de " + NOMES_DE_CATEGORIA[cat] + " não acumulam entre si (OPRPG p. 312)";
    return "a mesma fonte não acumula (OPRPG p. 312)";
  }

  /* O teste que está sendo feito: { pericia, atributo, ataque:
     "corpo"|"distancia"|null, atributoPuro: bool }. */
  function vale(alvo, teste) {
    if (alvo === "testes") return true;
    if (alvo === "pericias") return !teste.atributoPuro;
    if (teste.pericia && alvo === "pericia:" + teste.pericia) return true;
    if (teste.atributo && alvo === "atributo:" + teste.atributo) return true;
    if (teste.ataque) {
      if (alvo === "ataques") return true;
      if (alvo === "ataques:" + teste.ataque) return true;
    }
    return false;
  }

  function doTipo(cond, extra, tipo, filtro) {
    return modificadoresAtivos(cond, extra).filter(function (x) {
      return x.mod.tipo === tipo && filtro(x.mod.alvo);
    }).map(function (x) { return { valor: x.mod.valor, fonte: x.fonte }; });
  }

  function bonusNoTeste(cond, extra, teste) {
    return combinar(doTipo(cond, extra, "bonus", function (a) { return vale(a, teste); }));
  }

  function dadosNoTeste(cond, extra, teste) {
    return combinar(doTipo(cond, extra, "dados", function (a) { return vale(a, teste); }));
  }

  /* Quantos d20 rolar: `valor` dados do atributo (ou da arma) mais os
     modificadores. Com menos de um dado, rola 2 − n e fica com o pior
     — o atributo 0 rola dois e fica com o pior (OPRPG p. 75), e cada
     dado a menos abaixo disso acrescenta um dado ao pior (p. 9). */
  function expressaoDeDados(quantos) {
    var n = Math.round(Number(quantos) || 0);
    return n >= 1 ? n + "d20" : "-" + (2 - n) + "d20";
  }

  function bonusEm(cond, extra, alvos) {
    return combinar(doTipo(cond, extra, "bonus", function (a) { return alvos.indexOf(a) >= 0; }));
  }

  /* Deslocamento: somas primeiro; depois metade; zero e fixo mandam
     (fixo vale se for o menor). OPRPG p. 312: multiplicações e divisões
     antes de somas — aqui não há multiplicação, só metade, e a metade
     de um deslocamento é sempre aplicada sobre o valor final. */
  function deslocamento(cond, extra, base) {
    var mods = modificadoresAtivos(cond, extra).filter(function (x) { return x.mod.tipo === "deslocamento"; });
    var valor = base;
    var notas = [];
    mods.filter(function (x) { return x.mod.operacao === "soma"; }).forEach(function (x) { valor += x.mod.valor; notas.push({ rotulo: x.fonte.nome, valor: x.mod.valor }); });
    var metade = mods.filter(function (x) { return x.mod.operacao === "metade"; })[0];
    if (metade) {
      var novo = Math.floor(valor / 2 / 1.5) * 1.5;
      notas.push({ rotulo: metade.fonte.nome, valor: novo - valor, texto: "metade" });
      valor = novo;
    }
    var fixos = mods.filter(function (x) { return x.mod.operacao === "fixo"; });
    fixos.forEach(function (x) {
      if (x.mod.valor < valor) { notas.push({ rotulo: x.fonte.nome, valor: x.mod.valor - valor, texto: x.mod.valor + "m" }); valor = x.mod.valor; }
    });
    var zero = mods.filter(function (x) { return x.mod.operacao === "zero"; })[0];
    if (zero && valor !== 0) { notas.push({ rotulo: zero.fonte.nome, valor: -valor, texto: "0m" }); valor = 0; }
    return { valor: Math.max(0, valor), parcelas: notas };
  }

  /* Informativos e contextuais — mostrados, não somados na conta geral. */
  function contextuais(cond, extra) {
    var saida = [];
    modificadoresAtivos(cond, extra).forEach(function (x) {
      var def = PORALVO[x.mod.alvo];
      if (!def || !(def.contexto || def.informativo)) return;
      if (/^(ataques|dano):/.test(x.mod.alvo)) return;
      saida.push({ alvo: x.mod.alvo, nome: def.nome, valor: x.mod.valor, fonte: x.fonte.nome });
    });
    return saida;
  }

  function restricoes(cond, extra) {
    var saida = [];
    condicoesEfetivas(cond, extra).forEach(function (e) {
      if (e.imune) return;
      var lista = e.instancias.length ? e.instancias[0].restricoes : PORCHAVE[e.chave].restricoes;
      lista.forEach(function (t) { saida.push({ texto: t, fonte: e.nome }); });
    });
    (cond && cond.efeitos || []).forEach(function (inst) {
      if (inst.tipo === "condicao" || !ativa(inst)) return;
      inst.restricoes.forEach(function (t) { saida.push({ texto: t, fonte: inst.nome }); });
    });
    return saida;
  }

  function acoes(cond, extra) {
    var saida = [];
    condicoesEfetivas(cond, extra).forEach(function (e) {
      if (e.imune) return;
      PORCHAVE[e.chave].acoes.forEach(function (a) { saida.push(Object.assign({ fonte: e.nome, condicao: e.chave }, a)); });
    });
    return saida;
  }

  /* =================================================================
     O QUE OUTROS JOGADORES PODEM VER
     -----------------------------------------------------------------
     Só os nomes das condições do livro que estão valendo. Efeitos da
     mesa entram contados, sem nome, origem nem descrição — o texto que
     o mestre escreveu é do dono da ficha.
     ================================================================= */

  function resumoPublico(cond) {
    var lista = normalizarLista(cond && cond.efeitos);
    var condicoesAtivas = [];
    var outros = 0;
    lista.forEach(function (inst) {
      if (!ativa(inst)) return;
      if (inst.tipo === "condicao" && /^cond:/.test(inst.modelo)) {
        var nome = condicao(inst.modelo.slice(5)).nome;
        if (condicoesAtivas.indexOf(nome) < 0) condicoesAtivas.push(nome);
      } else {
        outros++;
      }
    });
    return { condicoes: condicoesAtivas, outros: outros };
  }

  global.RAMAOrdemEfeitos = {
    CONDICOES: CONDICOES,
    CATEGORIAS: CATEGORIAS,
    ALVOS: ALVOS,
    ATRIBUTOS: ATRIBUTOS,
    ORIGENS: ORIGENS,
    NOMES_DE_ORIGEM: NOMES_DE_ORIGEM,
    TIPOS_DE_DURACAO: TIPOS_DE_DURACAO,
    RITUAIS: RITUAIS,
    MAX_INSTANCIAS: MAX_INSTANCIAS,
    MAX_TURNOS: MAX_TURNOS,

    condicao: condicao,
    ritualComEfeito: ritualComEfeito,
    duracaoDoRitual: duracaoDoRitual,
    nomeDoAlvo: nomeDoAlvo,
    alvoValido: alvoValido,

    normalizarModificador: normalizarModificador,
    normalizarInstancia: normalizarInstancia,
    normalizarLista: normalizarLista,
    normalizarImunidades: normalizarImunidades,
    normalizarDuracao: normalizarDuracao,

    criarInstancia: criarInstancia,
    personalizada: personalizada,
    avaliarAplicacao: avaliarAplicacao,
    aplicar: aplicar,
    achar: achar,
    encerrar: encerrar,
    reativar: reativar,
    remover: remover,
    editar: editar,
    somarTurno: somarTurno,
    corrigirTurno: corrigirTurno,
    novaCena: novaCena,

    ativa: ativa,
    expirou: expirou,
    turnosContados: turnosContados,
    textoDaDuracao: textoDaDuracao,
    imune: imune,

    registrarTurno: registrarTurno,
    retirarTurno: retirarTurno,
    precisaDoTurno: precisaDoTurno,

    condicoesEfetivas: condicoesEfetivas,
    modificadoresAtivos: modificadoresAtivos,
    combinar: combinar,
    bonusNoTeste: bonusNoTeste,
    dadosNoTeste: dadosNoTeste,
    bonusEm: bonusEm,
    expressaoDeDados: expressaoDeDados,
    deslocamento: deslocamento,
    contextuais: contextuais,
    restricoes: restricoes,
    acoes: acoes,
    resumoPublico: resumoPublico,
  };
})(typeof window !== "undefined" ? window : globalThis);
