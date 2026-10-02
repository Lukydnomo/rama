/* =====================================================================
   R.A.M.A. — Ordem Paranormal · modo Hexatombe da campanha
   =====================================================================
   As regras de "Jogando o Hexatombe" (Arquivos Secretos 2, p. 4–24)
   como um ESTADO de campanha e um punhado de operações puras sobre ele.
   Quem desenha é js/paginas/campanha-hexatombe.js; quem guarda e filtra
   para cada pessoa é o Apps Script (Campanhas.gs, "HEXATOMBE"), que
   normaliza com a mesma régua deste arquivo e nunca entrega ao jogador
   o que é do mestre ou de outra equipe.

   ---------------------------------------------------------------------
   O QUE O ESTADO GUARDA
   ---------------------------------------------------------------------

     ativo, nome, dia (0–6), fase, faseNota
     equipes        nome, base (melhorias, recursos especiais), estoque
                    (água, comida, sucata, outros itens), produção já
                    recebida por dia, notas do mestre
     participantes  nome, equipe, personagem vinculado (ou NPC),
                    sacrifício e estigma, vivo/morte, desertor, castigos
                    sofridos, perícias alternativas já usadas na jornada,
                    procuras de recursos, consumo por dia, déficits de
                    água e comida, intenções cumpridas, notas do mestre
     sacrificios    as mortes de sacrifício, válidas ou não, com herdeiro
     intencoes      os estigmas desbloqueados (cada sacrifício válido)
     areas, rotas   o mapa explorado (rota percorrida dispensa o teste)
     pendencias     o que só a mesa decide (a Coroa escolhe um herdeiro)
     registro       o diário do Hexatombe (os últimos 60 lançamentos)
     pendentes      lançamentos de ficha que ainda não chegaram

   ---------------------------------------------------------------------
   TRÊS DECISÕES
   ---------------------------------------------------------------------

   1. NADA SE RESOLVE SOZINHO. Avançar o dia só muda o dia, a fase e a
      produção da base; mortes, encontros, consumo e intenções são
      lançados pela mesa, cada um na sua hora (p. 14: as fases são
      sugestões, e o mestre ajusta o ritmo).

   2. A FICHA RECEBE LANÇAMENTOS COM ORIGEM. Sede, fome, desertor,
      castigo da Coroa e recompensa de intenção viram lançamentos na
      ficha vinculada (ordem.hexatombe.lancamentos, js/ordem/arquivo2.js)
      com id ESTÁVEL ("hx.<regra>.<participante>.<marca>"): repetir o
      pedido não lança duas vezes, e desfazer é marcar o lançamento.

   3. O QUE O LIVRO NÃO FIXA FICA COM A MESA. A DT do teste de jornada
      não é dada (a mesa informa se passou); a leitura da tabela de
      recursos tem duas opções (uma rolagem na maior coluna alcançada —
      o padrão — ou uma em cada coluna); melhorias de recurso especial
      são instaladas pela mesa, sem teste.
   ===================================================================== */

(function (global) {
  "use strict";

  var ID = /^[A-Za-z0-9_.:|#-]{1,80}$/;
  var FASES = ["preparacao", "execucao", "conclusao"];
  var NOMES_FASE = { preparacao: "Preparação (início do dia)", execucao: "Execução (manhã e tarde)", conclusao: "Conclusão (noite)" };
  var DIAS = 6;
  var MAX_EQUIPES = 8;
  var MAX_PARTICIPANTES = 48;
  var MAX_REGISTRO = 60;
  var MAX_PENDENTES = 60;
  var MAX_CASTIGOS = 6;

  /* ---------------- estigmas e intenções (p. 9–10 e 24) ---------------- */

  var ESTIGMAS = [
    { chave: "desejo", nome: "Desejo", sentimentos: "Desejo, Ambição, Inveja",
      missao: "Chegar a morrendo e se recuperar por completo.",
      recompensa: "Na primeira vez no dia em que cair morrendo, recebe +15 PV temporários e se levanta.",
      lancamento: { tipo: "nota", valor: 0 } },
    { chave: "rancor", nome: "Rancor", sentimentos: "Rancor, Frustração, Ansiedade, Ira",
      missao: "Matar duas pessoas no mesmo dia.",
      recompensa: "Quando causa dano, causa +5 do mesmo tipo.",
      lancamento: { tipo: "dano", valor: 5 } },
    { chave: "obsessao", nome: "Obsessão", sentimentos: "Obsessão, Servidão, Paixão",
      missao: "Ser gravemente ferido por alguém da própria equipe.",
      recompensa: "Resistência a dano 5.",
      lancamento: { tipo: "rd", valor: 5 } },
    { chave: "culpa", nome: "Culpa", sentimentos: "Culpa, Vergonha, Arrependimento, Sofrimento",
      missao: "Deixar morrer um aliado que poderia ter sido salvo.",
      recompensa: "Recebe um poder de quem morreu (a mesa escolhe e registra na Progressão).",
      lancamento: { tipo: "nota", valor: 0 } },
    { chave: "prazer", nome: "Prazer", sentimentos: "Prazer, Euforia, Luxúria, Gula",
      missao: "Consumir 3 águas e 3 comidas na mesma noite.",
      recompensa: "+10 PV máximos.",
      lancamento: { tipo: "pvMax", valor: 10 } },
    { chave: "orgulho", nome: "Orgulho", sentimentos: "Orgulho, Desprezo, Arrogância",
      missao: "Matar alguém sem que essa pessoa o fira.",
      recompensa: "+10 PE máximos.",
      lancamento: { tipo: "peMax", valor: 10 } },
  ];
  var POR_ESTIGMA = {};
  ESTIGMAS.forEach(function (e) { POR_ESTIGMA[e.chave] = e; });

  /* ---------------- melhorias de base (p. 16–17) ---------------- */

  var MELHORIAS = [
    { chave: "limpeza", nome: "Limpeza da base", custo: 0, beneficio: "Obrigatória antes de qualquer outra melhoria." },
    { chave: "filtro", nome: "Filtro de água", custo: 1, beneficio: "6 águas por dia.", producao: { agua: 6 } },
    { chave: "geladeira", nome: "Geladeira", custo: 1, beneficio: "6 comidas por dia.", producao: { comida: 6 } },
    { chave: "camas", nome: "Camas", custo: 1, beneficio: "O descanso passa de precário a normal." },
    { chave: "casaNaArvore", nome: "Casa na árvore", custo: 2, beneficio: "Observatório: uma pergunta por dia sobre o estado do Hexatombe." },
    { chave: "defesas", nome: "Defesas externas", custo: 1, beneficio: "Na base: +2 em Iniciativa, Luta, Pontaria e Defesa." },
    { chave: "academia", nome: "Academia", custo: 1, beneficio: "O bônus de exercitar-se passa a +2d6." },
    { chave: "enfermaria", nome: "Enfermaria improvisada", recurso: "Materiais de enfermaria", beneficio: "Dormir sempre conta com cuidados prolongados (OPRPG p. 46)." },
    { chave: "biblioteca", nome: "Biblioteca do Pomba", recurso: "Documentos dos Pássaros (ou outros)", especialDaTransmissao: true, beneficio: "Informações novas todo dia, ou ler passa a +2d6." },
    { chave: "salaDeMusica", nome: "Sala de música", recurso: "Produtos da Psikolera", especialDaTransmissao: true, beneficio: "Dançar (ação de interlúdio): até o fim do dia, +2 em testes de Agi e Pre e −2 nos de For e Vig." },
    { chave: "adega", nome: "Adega de vinho", recurso: "Vinhos dos Vampiros", especialDaTransmissao: true, beneficio: "Beber o vinho de Sangue: até o fim do dia, +2 em testes de For e Vig e −2 nos de Int e Pre." },
    { chave: "garagem", nome: "Garagem", recurso: "Carro dos Couraças", especialDaTransmissao: true, beneficio: "Guarda o carro. Sem efeito de regra." },
  ];
  var POR_MELHORIA = {};
  MELHORIAS.forEach(function (m) { POR_MELHORIA[m.chave] = m; });
  var DT_MELHORIA = 20;

  var ACOES_DE_DESCANSO = ["Dormir", "Exercitar-se", "Ler", "Manutenção", "Relaxar"];

  /* ---------------- tabelas (p. 18–23) ---------------- */

  var CONSEQUENCIAS = [
    { n: 1, nome: "Encontro inesperado", texto: "A jornada para: role já um encontro de exploração (diurno ou noturno, conforme a hora)." },
    { n: 2, nome: "Barranco", texto: "Um personagem sorteado cai: 2d6 de dano de impacto e fatigado até o fim da próxima cena (Fortitude DT 20 reduz à metade e evita a condição)." },
    { n: 3, nome: "Animal peçonhento", texto: "Um personagem sorteado perde 1 PV e fica envenenado (enjoado) até dormir (Fortitude DT 20 evita a condição)." },
    { n: 4, nome: "Solo instável", texto: "Todos afundam e ficam agarrados; ao fim da terceira rodada, afundam de vez (asfixiado e paralisado). Escapar: Atletismo ou Acrobacia DT 20." },
    { n: 5, nome: "Espinheiro", texto: "Dois personagens sorteados sofrem 2d4 de dano de perfuração (Reflexos DT 20 reduz à metade)." },
    { n: 6, nome: "“Pacote” aéreo", texto: "Um personagem sorteado é atingido por uma ave: alquebrado e −2 em testes de Presença até se limpar." },
  ];

  var RECURSOS_ENCONTRADOS = [
    ["Comida", "Bandagem", "Bússola"],
    ["Sucata", "Incenso", "Caixa de Ferramentas"],
    ["Água", "Pedra de Amolar", "Kit de Escalada"],
    ["Bandagem", "Comida", "Catalisador Ampliador"],
    ["Incenso", "Sucata", "Catalisador Perturbador"],
    ["Dose de Álcool", "Água", "Catalisador Potencializador"],
    ["Balas Curtas", "Bússola", "Comida"],
    ["Balas Longas", "Caixa de Ferramentas", "Sucata"],
    ["Cartuchos", "Dose de Álcool", "Água"],
    ["Catalisador Ampliador", "Balas Curtas", "Pedra de Amolar"],
    ["Catalisador Perturbador", "Balas Longas", "Munição Explosiva"],
    ["Catalisador Potencializador", "Cartuchos", "Dinamite"],
  ];
  var COLUNAS_DE_RECURSO = [15, 20, 25];

  var ENCONTROS = {
    noturnoBase: { nome: "Noturno de base", dado: 6, faixas: [
      [2, "Acerto de contas", "Ao anoitecer, alguém de uma equipe rival chega cobrando uma luta de um contra um."],
      [4, "Sobrevivente", "Um grito se aproxima da base: um sobrevivente muito ferido pede ajuda — ou é uma armadilha."],
      [6, "Caçadores", "Três membros de uma equipe rival vêm atrás do sacrifício dos personagens; vão embora assim que um sacrifício for realizado."],
    ] },
    diurnoBase: { nome: "Diurno de base", dado: 8, faixas: [
      [2, "Uma ajuda extra", "Um participante forte de outra equipe propõe uma parceria pontual; aceitando, ele aparece depois para ajudar."],
      [4, "Bisbilhoteiro", "Barulhos ao redor da base: Percepção contra Furtividade revela alguém de outra equipe espiando."],
      [6, "Visita mal-intencionada", "Uma dupla de outra equipe aparece fazendo perguntas e, ao sair, deixa um “presente” adulterado na porta."],
      [8, "Invasão acanhada", "Um animal assustado invade a base. Morto, rende 3 comidas; poupado, fica abrigado até virar uma criatura sanguinária no fim do quinto dia."],
    ] },
    diurnoExploracao: { nome: "Diurno de exploração", dado: 10, faixas: [
      [2, "Fogo cruzado", "Os personagens chegam no meio de um tiroteio entre duas equipes e decidem se ajudam alguma."],
      [4, "Negociação", "Uma dupla de outra equipe vasculha o local; dá para negociar e dividir os recursos, conforme a relação entre as equipes."],
      [6, "Encontro às escondidas", "Dois participantes de equipes diferentes se encontram em segredo."],
      [8, "Pedágio", "Um participante forte de uma rival exige toda a comida e água que o grupo carrega — ou luta."],
      [10, "Armadilha", "Uma armadilha debilitante prende o grupo (testes para perceber e evitar, como a armadilha manda); três membros de uma rival aparecem para ameaçá-los."],
    ] },
    noturnoExploracao: { nome: "Noturno de exploração", dado: 8, faixas: [
      [2, "Armadilha", "Uma armadilha debilitante prende o grupo; três membros de uma rival aparecem para ameaçá-los."],
      [4, "Predador noturno", "Um animal perigoso caça o grupo: Percepção contra a Furtividade dele; quem falhar fica surpreendido na primeira rodada."],
      [6, "Criatura noturna", "Uma criatura paranormal ataca: Percepção contra a Furtividade dela; quem falhar fica surpreendido na primeira rodada."],
      [8, "Confronto antecipado", "Uma equipe a caminho de matar um sacrifício esbarra no grupo: sem sacrifício presente, há diálogo; com, combate até um sacrifício morrer."],
    ] },
  };

  /* ---------------- utilidades ---------------- */

  function uuid() {
    if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }
  function agora() { return new Date().toISOString(); }
  function lista(v) { return Array.isArray(v) ? v : []; }
  function texto(v, n) { return String(v === undefined || v === null ? "" : v).replace(/[\u0000-\u001F]/g, " ").trim().slice(0, n || 120); }
  function inteiro(v, min, max, padrao) {
    var n = Math.round(Number(v));
    if (!Number.isFinite(n)) return padrao;
    return Math.max(min, Math.min(max, n));
  }
  function idOk(v) { var s = String(v || ""); return ID.test(s) ? s : ""; }
  function carimbo(v) { var s = String(v || ""); return /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(s) ? s : ""; }
  function copiar(v) { return JSON.parse(JSON.stringify(v)); }
  function chavesValidas(lista0, validas) {
    var vistas = {};
    return lista(lista0).filter(function (k) {
      if (validas.indexOf(k) < 0 || vistas[k]) return false;
      vistas[k] = true;
      return true;
    });
  }
  var CHAVES_ESTIGMA = ESTIGMAS.map(function (e) { return e.chave; });
  var CHAVES_MELHORIA = MELHORIAS.map(function (m) { return m.chave; });

  /* =================================================================
     NORMALIZAÇÃO — a mesma régua do servidor (Campanhas.gs)
     ================================================================= */

  function normalizarEstoque(e) {
    var x = e && typeof e === "object" ? e : {};
    var vistos = {};
    return {
      agua: inteiro(x.agua, 0, 999, 0),
      comida: inteiro(x.comida, 0, 999, 0),
      sucata: inteiro(x.sucata, 0, 999, 0),
      itens: lista(x.itens).map(function (i) {
        if (!i || typeof i !== "object") return null;
        var nome = texto(i.nome, 80);
        if (!nome || vistos[nome]) return null;
        vistos[nome] = true;
        var qtd = inteiro(i.qtd, 0, 999, 0);
        return qtd ? { nome: nome, qtd: qtd } : null;
      }).filter(Boolean).slice(0, 40),
    };
  }

  function normalizarEquipe(b) {
    if (!b || typeof b !== "object") return null;
    var id = idOk(b.id);
    var nome = texto(b.nome, 60);
    if (!id || !nome) return null;
    var base = b.base && typeof b.base === "object" ? b.base : {};
    var producao = {};
    Object.keys(b.producao && typeof b.producao === "object" ? b.producao : {}).forEach(function (d) {
      var n = inteiro(d, 1, DIAS, 0);
      if (n && b.producao[d] === true) producao[n] = true;
    });
    return {
      id: id, nome: nome,
      jogadores: b.jogadores === true,
      base: { nome: texto(base.nome, 80), melhorias: chavesValidas(base.melhorias, CHAVES_MELHORIA) },
      estoque: normalizarEstoque(b.estoque),
      producao: producao,
      notas: texto(b.notas, 1000),
    };
  }

  function normalizarParticipante(b, equipes) {
    if (!b || typeof b !== "object") return null;
    var id = idOk(b.id);
    var nome = texto(b.nome, 80);
    if (!id || !nome) return null;
    var equipeId = idOk(b.equipeId);
    if (equipeId && !equipes[equipeId]) equipeId = "";
    var morte = b.morte && typeof b.morte === "object" && b.vivo === false ? {
      dia: inteiro(b.morte.dia, 0, DIAS, 0), momento: b.morte.momento === "dia" ? "dia" : "noite",
      causa: ["morto", "suicidio", "acidente", "lua"].indexOf(b.morte.causa) >= 0 ? b.morte.causa : "morto",
      por: idOk(b.morte.por),
    } : null;
    var desertor = b.desertor && typeof b.desertor === "object" ? {
      desde: inteiro(b.desertor.desde, 0, DIAS, 0), motivo: b.desertor.motivo === "saiu" ? "saiu" : "equipe",
    } : null;
    var intencoes = {};
    Object.keys(b.intencoes && typeof b.intencoes === "object" ? b.intencoes : {}).forEach(function (k) {
      if (CHAVES_ESTIGMA.indexOf(k) < 0) return;
      var v = b.intencoes[k];
      if (v && typeof v === "object") intencoes[k] = { dia: inteiro(v.dia, 0, DIAS, 0) };
    });
    var consumo = {};
    Object.keys(b.consumo && typeof b.consumo === "object" ? b.consumo : {}).forEach(function (d) {
      var n = inteiro(d, 1, DIAS, 0);
      var v = b.consumo[d];
      if (n && v && typeof v === "object") consumo[n] = { agua: inteiro(v.agua, 0, 9, 0), comida: inteiro(v.comida, 0, 9, 0) };
    });
    return {
      id: id, nome: nome, equipeId: equipeId,
      personagemId: idOk(b.personagemId),
      sacrificio: b.sacrificio === true,
      estigma: CHAVES_ESTIGMA.indexOf(b.estigma) >= 0 ? b.estigma : "",
      original: b.original === true,
      vivo: b.vivo !== false,
      morte: morte,
      desertor: desertor,
      castigos: inteiro(b.castigos, 0, MAX_CASTIGOS, 0),
      alternativas: lista(b.alternativas).map(function (p) { return texto(p, 40); }).filter(Boolean).slice(0, 20),
      procuras: lista(b.procuras).map(idOk).filter(Boolean).slice(-40),
      consumo: consumo,
      sede: inteiro(b.sede, 0, DIAS, 0),
      fome: inteiro(b.fome, 0, DIAS, 0),
      /* "sede.<dia do déficit>@<dia em que a unidade a mais o recuperou>" */
      recuperados: lista(b.recuperados).filter(function (x) { return /^(sede|fome)\.\d@\d$/.test(String(x)); }).slice(0, 24),
      intencoes: intencoes,
      notas: texto(b.notas, 600),
    };
  }

  function normalizar(bruto) {
    var b = bruto && typeof bruto === "object" ? bruto : {};
    var equipes = lista(b.equipes).map(normalizarEquipe).filter(Boolean);
    var vistasE = {};
    equipes = equipes.filter(function (e) { if (vistasE[e.id]) return false; vistasE[e.id] = true; return true; }).slice(0, MAX_EQUIPES);
    var porEquipe = {};
    equipes.forEach(function (e) { porEquipe[e.id] = true; });
    var vistosP = {};
    var participantes = lista(b.participantes).map(function (p) { return normalizarParticipante(p, porEquipe); })
      .filter(function (p) { if (!p || vistosP[p.id]) return false; vistosP[p.id] = true; return true; })
      .slice(0, MAX_PARTICIPANTES);
    var vistasA = {};
    var areas = lista(b.areas).map(function (a) {
      if (!a || typeof a !== "object") return null;
      var id = idOk(a.id);
      var nome = texto(a.nome, 60);
      if (!id || !nome || vistasA[id]) return null;
      vistasA[id] = true;
      return { id: id, nome: nome, explorada: a.explorada === true };
    }).filter(Boolean).slice(0, 40);
    var rotas = lista(b.rotas).map(function (r) {
      if (!r || typeof r !== "object") return null;
      var de = idOk(r.de), para = idOk(r.para);
      return de && para && vistasA[de] && vistasA[para] && de !== para ? { de: de, para: para } : null;
    }).filter(Boolean).slice(0, 80);
    return {
      versao: 1,
      ativo: b.ativo === true,
      nome: texto(b.nome, 60) || "Hexatombe",
      dia: inteiro(b.dia, 0, DIAS, 0),
      fase: FASES.indexOf(b.fase) >= 0 ? b.fase : "preparacao",
      faseNota: texto(b.faseNota, 200),
      leituraDeRecursos: b.leituraDeRecursos === "cumulativa" ? "cumulativa" : "coluna",
      fracassou: b.fracassou === true,
      equipes: equipes,
      participantes: participantes,
      sacrificios: lista(b.sacrificios).map(function (s) {
        if (!s || typeof s !== "object" || !idOk(s.id)) return null;
        return {
          id: idOk(s.id), dia: inteiro(s.dia, 0, DIAS, 0), participanteId: idOk(s.participanteId),
          estigma: CHAVES_ESTIGMA.indexOf(s.estigma) >= 0 ? s.estigma : "", valido: s.valido === true,
          por: idOk(s.por), herdeiro: idOk(s.herdeiro),
        };
      }).filter(Boolean).slice(-24),
      intencoes: lista(b.intencoes).map(function (x) {
        if (!x || typeof x !== "object" || CHAVES_ESTIGMA.indexOf(x.estigma) < 0) return null;
        return { estigma: x.estigma, dia: inteiro(x.dia, 0, DIAS, 0), sacrificioId: idOk(x.sacrificioId) };
      }).filter(Boolean).slice(0, 24),
      areas: areas,
      rotas: rotas,
      pendencias: lista(b.pendencias).map(function (x) {
        if (!x || typeof x !== "object" || x.tipo !== "herdeiro" || CHAVES_ESTIGMA.indexOf(x.estigma) < 0) return null;
        return { id: idOk(x.id) || ("pend-" + uuid()), tipo: "herdeiro", estigma: x.estigma, dia: inteiro(x.dia, 0, DIAS, 0), motivo: texto(x.motivo, 200) };
      }).filter(Boolean).slice(0, 12),
      registro: lista(b.registro).map(function (r) {
        if (!r || typeof r !== "object" || !idOk(r.id)) return null;
        var vis = r.visivel === "mestre" ? "mestre" : (idOk(r.visivel) && porEquipe[r.visivel] ? r.visivel : "todos");
        return { id: idOk(r.id), dia: inteiro(r.dia, 0, DIAS, 0), tipo: texto(r.tipo, 30), texto: texto(r.texto, 400), em: carimbo(r.em), visivel: vis };
      }).filter(Boolean).slice(-MAX_REGISTRO),
      pendentes: lista(b.pendentes).map(function (x) {
        if (!x || typeof x !== "object") return null;
        var pid = idOk(x.personagemId);
        var l = x.lancamento && typeof x.lancamento === "object" ? x.lancamento : null;
        if (!pid || !l || !idOk(l.id)) return null;
        return { personagemId: pid, desfazer: x.desfazer === true, lancamento: {
          id: idOk(l.id), tipo: texto(l.tipo, 20), valor: inteiro(l.valor, -999, 999, 0), dia: inteiro(l.dia, 0, DIAS, 0),
          motivo: texto(l.motivo, 200), origem: texto(l.origem, 80), atualPv: inteiro(l.atualPv, -999, 0, 0), refazer: l.refazer === true,
        } };
      }).filter(Boolean).slice(-MAX_PENDENTES),
    };
  }

  function vazio() { return normalizar({}); }

  /* =================================================================
     CONSULTAS
     ================================================================= */

  function equipe(estado, id) { return estado.equipes.filter(function (e) { return e.id === id; })[0] || null; }
  function participante(estado, id) { return estado.participantes.filter(function (p) { return p.id === id; })[0] || null; }
  function membros(estado, equipeId) { return estado.participantes.filter(function (p) { return p.equipeId === equipeId; }); }
  function vivos(estado) { return estado.participantes.filter(function (p) { return p.vivo; }); }
  function sacrificioValidoNoDia(estado, dia) { return estado.sacrificios.filter(function (s) { return s.valido && s.dia === dia; })[0] || null; }
  function desbloqueada(estado, estigma) { return estado.intencoes.some(function (x) { return x.estigma === estigma; }); }

  /* A equipe perdeu o sacrifício: algum membro dela, sacrifício, morreu
     (ou o estigma saiu dela) e ninguém da equipe o porta mais. */
  function equipeDesertora(estado, equipeId) {
    var m = membros(estado, equipeId);
    return m.some(function (p) { return p.desertor && p.desertor.motivo === "equipe"; });
  }

  function condicaoDeDescanso(estado, equipeId) {
    var e = equipe(estado, equipeId);
    return e && e.base.melhorias.indexOf("camas") >= 0 ? "normal" : "precária";
  }

  /* =================================================================
     OPERAÇÕES
     -----------------------------------------------------------------
     Todas mudam o estado recebido e devolvem
       { ok, motivo?, avisos: [], lancamentos: [{ personagemId, lancamento }],
         desfazer: [{ personagemId, id }] }
     `rolar(faces)` pode ser injetado (testes); sem ele, Math.random.
     ================================================================= */

  function resultado() { return { ok: true, avisos: [], lancamentos: [], desfazer: [] }; }
  function falha(motivo) { return { ok: false, motivo: motivo, avisos: [], lancamentos: [], desfazer: [] }; }
  function dado(rolar, faces) { return typeof rolar === "function" ? inteiro(rolar(faces), 1, faces, 1) : 1 + Math.floor(Math.random() * faces); }

  function registrar(estado, tipo, txt, visivel) {
    estado.registro.push({ id: "reg-" + uuid(), dia: estado.dia, tipo: texto(tipo, 30), texto: texto(txt, 400), em: agora(), visivel: visivel || "todos" });
    if (estado.registro.length > MAX_REGISTRO) estado.registro = estado.registro.slice(-MAX_REGISTRO);
  }

  /* O lançamento que vai para a ficha vinculada (se houver). */
  function lancar(r, p, id, tipo, valor, motivo, origem, extra) {
    if (!p || !p.personagemId) return;
    var l = Object.assign({ id: id, tipo: tipo, valor: valor, dia: 0, motivo: texto(motivo, 200), origem: texto(origem || "Hexatombe", 80) }, extra || {});
    r.lancamentos.push({ personagemId: p.personagemId, lancamento: l });
  }

  function ligar(estado, ativo) {
    estado.ativo = !!ativo;
    registrar(estado, "modo", ativo ? "O mestre ativou o Hexatombe nesta campanha." : "O mestre desativou o Hexatombe (nada foi apagado).", "mestre");
    return resultado();
  }

  function definirFase(estado, fase, nota) {
    if (FASES.indexOf(fase) < 0) return falha("Fase desconhecida.");
    estado.fase = fase;
    estado.faseNota = texto(nota, 200);
    return resultado();
  }

  /* Só muda o dia, a fase e a produção da base (p. 17). Não resolve
     mortes, encontros, consumo nem intenções. */
  function avancarDia(estado) {
    if (estado.dia >= DIAS) return falha("O sexto dia é o último: a Lua de Sangue fecha o Hexatombe.");
    var r = resultado();
    var anterior = estado.dia;
    if (anterior >= 1 && !sacrificioValidoNoDia(estado, anterior)) {
      r.avisos.push("Nenhum sacrifício válido no dia " + anterior + ": pelas regras, o Hexatombe fracassa (p. 15). Marque o fracasso se a mesa confirmar.");
    }
    if (anterior >= 1) {
      var semConsumo = vivos(estado).filter(function (p) { return !p.consumo[anterior]; }).map(function (p) { return p.nome; });
      if (semConsumo.length) r.avisos.push("Sem consumo registrado no dia " + anterior + ": " + semConsumo.join(", ") + ". Nada foi lançado por eles.");
    }
    estado.dia = anterior + 1;
    estado.fase = "preparacao";
    estado.faseNota = "";
    estado.equipes.forEach(function (e) {
      if (e.producao[estado.dia]) return;
      var agua = 0, comida = 0;
      e.base.melhorias.forEach(function (k) {
        var m = POR_MELHORIA[k];
        if (m && m.producao) { agua += m.producao.agua || 0; comida += m.producao.comida || 0; }
      });
      e.producao[estado.dia] = true;
      if (agua || comida) {
        e.estoque.agua = Math.min(999, e.estoque.agua + agua);
        e.estoque.comida = Math.min(999, e.estoque.comida + comida);
        registrar(estado, "base", e.nome + ": a base produziu " + (agua ? agua + " água(s)" : "") + (agua && comida ? " e " : "") + (comida ? comida + " comida(s)" : "") + ".", e.id);
      }
    });
    registrar(estado, "dia", "Começa o dia " + estado.dia + ".", "todos");
    return r;
  }

  function salvarEquipe(estado, dados) {
    var id = idOk(dados && dados.id) || ("eq-" + uuid());
    var atual = equipe(estado, id);
    var nova = normalizarEquipe(Object.assign({}, atual || {}, dados || {}, { id: id }));
    if (!nova) return falha("A equipe precisa de nome.");
    if (!atual && estado.equipes.length >= MAX_EQUIPES) return falha("Limite de " + MAX_EQUIPES + " equipes.");
    if (atual) estado.equipes[estado.equipes.indexOf(atual)] = nova; else estado.equipes.push(nova);
    var r = resultado();
    r.id = id;
    return r;
  }

  function removerEquipe(estado, id) {
    if (membros(estado, id).length) return falha("Tire os participantes da equipe antes.");
    estado.equipes = estado.equipes.filter(function (e) { return e.id !== id; });
    return resultado();
  }

  function salvarParticipante(estado, dados) {
    var id = idOk(dados && dados.id) || ("pt-" + uuid());
    var atual = participante(estado, id);
    var porEquipe = {};
    estado.equipes.forEach(function (e) { porEquipe[e.id] = true; });
    var novo = normalizarParticipante(Object.assign({}, atual || {}, dados || {}, { id: id }), porEquipe);
    if (!novo) return falha("O participante precisa de nome.");
    if (!atual && estado.participantes.length >= MAX_PARTICIPANTES) return falha("Limite de participantes.");
    if (novo.sacrificio && !novo.estigma) return falha("Um sacrifício porta um estigma: escolha qual.");
    if (!novo.sacrificio) novo.estigma = "";
    if (atual) estado.participantes[estado.participantes.indexOf(atual)] = novo; else estado.participantes.push(novo);
    var r = resultado();
    r.id = id;
    return r;
  }

  function removerParticipante(estado, id) {
    estado.participantes = estado.participantes.filter(function (p) { return p.id !== id; });
    return resultado();
  }

  /* Desertor (p. 11): −1 dado em testes e PV máximos pela metade. Por
     ter saído da arena é temporário (volta ao retornar); por perder o
     sacrifício, permanente. */
  function tornarDesertor(estado, r, p, motivo) {
    if (!p || !p.vivo || p.desertor) return;
    p.desertor = { desde: estado.dia, motivo: motivo === "saiu" ? "saiu" : "equipe" };
    lancar(r, p, "hx.desertor.metade." + p.id, "pvMetade", 0, "Desertor do Hexatombe: PV máximos pela metade (AS2 p. 11)", "Desertor");
    lancar(r, p, "hx.desertor.dado." + p.id, "dadosTestes", -1, "Desertor do Hexatombe: −1 dado em testes (AS2 p. 11)", "Desertor");
  }

  function marcarDesertor(estado, participanteId, motivo) {
    var p = participante(estado, participanteId);
    if (!p || !p.vivo) return falha("Participante não encontrado ou morto.");
    if (p.desertor) return falha("Já é desertor.");
    var r = resultado();
    tornarDesertor(estado, r, p, motivo);
    registrar(estado, "desertor", p.nome + (motivo === "saiu" ? " saiu da arena e virou desertor até voltar." : " virou desertor."), "mestre");
    return r;
  }

  /* Só quem saiu da arena deixa de ser desertor ao voltar. */
  function retornarDaArena(estado, participanteId) {
    var p = participante(estado, participanteId);
    if (!p || !p.desertor) return falha("Não é desertor.");
    if (p.desertor.motivo !== "saiu") return falha("Quem perdeu o sacrifício só deixa de ser desertor ficando entre os seis finais (p. 15).");
    p.desertor = null;
    var r = resultado();
    if (p.personagemId) {
      r.desfazer.push({ personagemId: p.personagemId, id: "hx.desertor.metade." + p.id });
      r.desfazer.push({ personagemId: p.personagemId, id: "hx.desertor.dado." + p.id });
    }
    registrar(estado, "desertor", p.nome + " voltou à arena.", "mestre");
    return r;
  }

  /* A morte de alguém — a regra mais carregada do Hexatombe (p. 6, 11 e
     15). opcoes: { participanteId, por, momento: "noite"|"dia",
     causa: "morto"|"suicidio"|"acidente", rolar } */
  function registrarMorte(estado, opcoes) {
    var o = opcoes || {};
    var p = participante(estado, o.participanteId);
    if (!p) return falha("Participante não encontrado.");
    if (!p.vivo) return falha(p.nome + " já está morto.");
    var momento = o.momento === "dia" ? "dia" : "noite";
    var causa = ["morto", "suicidio", "acidente"].indexOf(o.causa) >= 0 ? o.causa : "morto";
    var algoz = causa === "morto" ? participante(estado, o.por) : null;
    var r = resultado();

    p.vivo = false;
    p.morte = { dia: estado.dia, momento: momento, causa: causa, por: algoz ? algoz.id : "" };

    if (!p.sacrificio) {
      registrar(estado, "morte", p.nome + " morreu.", "mestre");
      return r;
    }

    var valido = momento === "noite" && !sacrificioValidoNoDia(estado, estado.dia);
    var sac = { id: "sac-" + uuid(), dia: estado.dia, participanteId: p.id, estigma: p.estigma, valido: valido, por: algoz ? algoz.id : "", herdeiro: "" };
    estado.sacrificios.push(sac);
    var estigma = POR_ESTIGMA[p.estigma];

    if (valido) {
      /* O sino toca: castigo dos desertores que já existiam, intenção
         desbloqueada — e só depois a equipe do sacrifício deserta. */
      estado.participantes.forEach(function (d) {
        if (!d.vivo || !d.desertor || d.castigos >= MAX_CASTIGOS) return;
        var n = dado(o.rolar, 10);
        d.castigos += 1;
        lancar(r, d, "hx.castigo.pv." + d.id + "." + sac.id, "pvMax", -n, "Castigo da Coroa ao desertor: sacrifício nº " + d.castigos + " (−1d10 = " + n + " PV máx. e atuais)", "Desertor", { atualPv: -n });
        lancar(r, d, "hx.castigo.t." + d.id + "." + sac.id, "testes", -1, "Castigo da Coroa ao desertor: sacrifício nº " + d.castigos + " (−1 em testes)", "Desertor");
        r.avisos.push(d.nome + ": −" + n + " PV máximos e atuais, −1 em testes; Fortitude DT 20 ou fica inconsciente até o amanhecer.");
      });
      if (estigma && !desbloqueada(estado, estigma.chave)) estado.intencoes.push({ estigma: estigma.chave, dia: estado.dia, sacrificioId: sac.id });
      registrar(estado, "sacrificio", "O sino tocou: um sacrifício (" + (estigma ? estigma.nome : "sem estigma") + ") foi realizado no dia " + estado.dia + ". Intenção desbloqueada.", "todos");
      if (estado.dia >= DIAS) r.avisos.push("Sacrifício na sexta noite. Confira se há seis participantes vivos para o sacrifício final (p. 6).");
    } else {
      /* Segundo sacrifício da noite, ou morto de dia: o estigma passa a
         quem matou — ou a Coroa escolhe outro digno. */
      var herda = algoz && algoz.vivo && !algoz.sacrificio && causa === "morto";
      if (herda) {
        algoz.sacrificio = true;
        algoz.estigma = p.estigma;
        algoz.original = false;
        sac.herdeiro = algoz.id;
        registrar(estado, "estigma", algoz.nome + " herdou o estigma de " + (estigma ? estigma.nome : "?") + ".", "mestre");
      } else {
        estado.pendencias.push({ id: "pend-" + uuid(), tipo: "herdeiro", estigma: p.estigma, dia: estado.dia,
          motivo: causa === "suicidio" ? "O sacrifício tirou a própria vida num dia que já teve sacrifício (regra VIII)." : "Quem matou não pode herdar (ou foi acidente)." });
        r.avisos.push("A Coroa de Espinhos escolhe outro participante digno para o estigma. Defina o herdeiro.");
      }
      registrar(estado, "morte", p.nome + " (sacrifício) morreu " + (momento === "dia" ? "de dia" : "depois do sacrifício da noite") + ": não conta como sacrifício.", "mestre");
    }

    /* A equipe que perde o sacrifício deserta (p. 11). */
    if (p.equipeId) {
      var aindaTem = membros(estado, p.equipeId).some(function (m) { return m.vivo && m.sacrificio; });
      if (!aindaTem) {
        membros(estado, p.equipeId).forEach(function (m) { tornarDesertor(estado, r, m, "equipe"); });
        var eq = equipe(estado, p.equipeId);
        registrar(estado, "desertor", (eq ? eq.nome : "A equipe") + " perdeu o sacrifício: seus membros são desertores.", "mestre");
      }
    }
    return r;
  }

  function escolherHerdeiro(estado, pendenciaId, participanteId) {
    var pend = estado.pendencias.filter(function (x) { return x.id === pendenciaId; })[0];
    if (!pend) return falha("Pendência não encontrada.");
    var h = participante(estado, participanteId);
    if (!h || !h.vivo) return falha("O herdeiro precisa estar vivo.");
    if (h.sacrificio) return falha("Quem já é sacrifício não herda outro estigma.");
    h.sacrificio = true;
    h.estigma = pend.estigma;
    h.original = false;
    estado.pendencias = estado.pendencias.filter(function (x) { return x !== pend; });
    registrar(estado, "estigma", "A Coroa escolheu " + h.nome + " para o estigma de " + POR_ESTIGMA[pend.estigma].nome + ".", "mestre");
    return resultado();
  }

  /* Consumo do dia (p. 20): ao menos 1 água e 1 comida por participante
     até a conclusão. Faltando, −10 PV (ou PE) máximos a partir do dia
     seguinte; recupera consumindo 1 unidade a mais no fim de um dia
     seguinte. Tira do estoque da equipe. */
  function consumir(estado, participanteId, agua, comida) {
    var p = participante(estado, participanteId);
    if (!p || !p.vivo) return falha("Participante não encontrado ou morto.");
    if (estado.dia < 1) return falha("O Hexatombe ainda não começou (dia 0).");
    if (p.consumo[estado.dia]) return falha(p.nome + " já tem o consumo do dia " + estado.dia + " registrado. Desfaça antes de registrar de novo.");
    var a = inteiro(agua, 0, 9, 0), c = inteiro(comida, 0, 9, 0);
    var eq = equipe(estado, p.equipeId);
    if (eq && (eq.estoque.agua < a || eq.estoque.comida < c)) return falha("O estoque da equipe não tem o suficiente.");
    if (eq) { eq.estoque.agua -= a; eq.estoque.comida -= c; }
    p.consumo[estado.dia] = { agua: a, comida: c };
    var r = resultado();
    regraDoRecurso(estado, r, p, "sede", a, "pvMax", "PV");
    regraDoRecurso(estado, r, p, "fome", c, "peMax", "PE");
    if (a >= 3 && c >= 3 && desbloqueada(estado, "prazer") && !p.intencoes.prazer) {
      r.avisos.push(p.nome + " consumiu 3 águas e 3 comidas: a intenção do Prazer pode ter sido cumprida (confirme).");
    }
    registrar(estado, "consumo", p.nome + ": " + a + " água(s), " + c + " comida(s).", eq ? eq.id : "mestre");
    return r;
  }

  function regraDoRecurso(estado, r, p, chave, qtd, tipo, sigla) {
    if (qtd < 1) {
      p[chave] += 1;
      lancar(r, p, "hx." + chave + "." + p.id + ".d" + estado.dia, tipo, -10,
        (chave === "sede" ? "Sem água" : "Sem comida") + " no dia " + estado.dia + ": −10 " + sigla + " máximos (AS2 p. 20)", "Hexatombe", { dia: estado.dia + 1 });
      return;
    }
    if (qtd >= 2 && p[chave] > 0) {
      /* A unidade a mais recupera o déficit mais antigo ainda aberto. */
      var campo = chave === "sede" ? "agua" : "comida";
      var jaRecuperados = p.recuperados.map(function (x) { return x.split("@")[0]; });
      var dia = Object.keys(p.consumo).map(Number).sort(function (x, y) { return x - y; }).filter(function (d) {
        return d < estado.dia && p.consumo[d][campo] < 1 && jaRecuperados.indexOf(chave + "." + d) < 0;
      })[0];
      p[chave] -= 1;
      if (dia) {
        p.recuperados.push(chave + "." + dia + "@" + estado.dia);
        if (p.personagemId) r.desfazer.push({ personagemId: p.personagemId, id: "hx." + chave + "." + p.id + ".d" + dia });
        r.avisos.push(p.nome + " recuperou os máximos perdidos " + (chave === "sede" ? "por sede" : "por fome") + " no dia " + dia + ".");
      }
    }
  }

  function desfazerConsumo(estado, participanteId, dia) {
    var p = participante(estado, participanteId);
    var d = inteiro(dia, 1, DIAS, 0);
    if (!p || !p.consumo[d]) return falha("Nada registrado nesse dia.");
    var c = p.consumo[d];
    var eq = equipe(estado, p.equipeId);
    if (eq) { eq.estoque.agua = Math.min(999, eq.estoque.agua + c.agua); eq.estoque.comida = Math.min(999, eq.estoque.comida + c.comida); }
    delete p.consumo[d];
    var r = resultado();
    if (c.agua < 1) { p.sede = Math.max(0, p.sede - 1); if (p.personagemId) r.desfazer.push({ personagemId: p.personagemId, id: "hx.sede." + p.id + ".d" + d }); }
    if (c.comida < 1) { p.fome = Math.max(0, p.fome - 1); if (p.personagemId) r.desfazer.push({ personagemId: p.personagemId, id: "hx.fome." + p.id + ".d" + d }); }
    /* A unidade a mais daquele dia tinha recuperado um déficit: ele volta. */
    p.recuperados = p.recuperados.filter(function (x) {
      var m = /^(sede|fome)\.(\d)@(\d)$/.exec(x);
      if (!m || Number(m[3]) !== d) return true;
      p[m[1]] += 1;
      lancar(r, p, "hx." + m[1] + "." + p.id + ".d" + m[2], m[1] === "sede" ? "pvMax" : "peMax", -10,
        (m[1] === "sede" ? "Sem água" : "Sem comida") + " no dia " + m[2] + ": −10 " + (m[1] === "sede" ? "PV" : "PE") + " máximos (AS2 p. 20)", "Hexatombe", { dia: Number(m[2]) + 1, refazer: true });
      return false;
    });
    registrar(estado, "consumo", "Consumo de " + p.nome + " no dia " + d + " desfeito (o estoque voltou).", "mestre");
    return r;
  }

  /* Fazer melhorias (p. 16): teste contra DT 20. Passa, faz e gasta;
     falha, nada; falha por 5 ou mais, gasta a sucata sem fazer. */
  function tentarMelhoria(estado, equipeId, chave, total) {
    var e = equipe(estado, equipeId);
    var m = POR_MELHORIA[chave];
    if (!e || !m) return falha("Equipe ou melhoria desconhecida.");
    if (m.recurso) return falha(m.nome + " depende de um recurso específico: instale pela mesa quando o grupo o conseguir.");
    if (e.base.melhorias.indexOf(chave) >= 0) return falha("A base já tem " + m.nome + ".");
    if (chave !== "limpeza" && e.base.melhorias.indexOf("limpeza") < 0) return falha("A limpeza da base vem antes de qualquer outra melhoria.");
    if (e.estoque.sucata < m.custo) return falha("Sucata insuficiente: precisa de " + m.custo + ".");
    var n = Math.round(Number(total));
    if (!Number.isFinite(n)) return falha("Informe o resultado do teste.");
    var r = resultado();
    if (n >= DT_MELHORIA) {
      e.estoque.sucata -= m.custo;
      e.base.melhorias.push(chave);
      r.feito = true;
      registrar(estado, "base", e.nome + " construiu " + m.nome + " (teste " + n + ").", e.id);
    } else if (n <= DT_MELHORIA - 5) {
      e.estoque.sucata -= m.custo;
      r.perdeu = true;
      registrar(estado, "base", e.nome + " falhou por 5 ou mais em " + m.nome + " (teste " + n + "): a sucata quebrou.", e.id);
    } else {
      registrar(estado, "base", e.nome + " não conseguiu fazer " + m.nome + " (teste " + n + "); a sucata ficou.", e.id);
    }
    return r;
  }

  function instalarMelhoriaEspecial(estado, equipeId, chave) {
    var e = equipe(estado, equipeId);
    var m = POR_MELHORIA[chave];
    if (!e || !m || !m.recurso) return falha("Melhoria especial desconhecida.");
    if (e.base.melhorias.indexOf(chave) >= 0) return falha("Já instalada.");
    if (e.base.melhorias.indexOf("limpeza") < 0) return falha("A limpeza da base vem antes de qualquer outra melhoria.");
    e.base.melhorias.push(chave);
    registrar(estado, "base", e.nome + " instalou " + m.nome + " (" + m.recurso + ").", e.id);
    return resultado();
  }

  function removerMelhoria(estado, equipeId, chave) {
    var e = equipe(estado, equipeId);
    if (!e || e.base.melhorias.indexOf(chave) < 0) return falha("A base não tem essa melhoria.");
    e.base.melhorias = e.base.melhorias.filter(function (k) { return k !== chave; });
    registrar(estado, "base", e.nome + " perdeu " + POR_MELHORIA[chave].nome + ".", "mestre");
    return resultado();
  }

  /* ---------------- exploração (p. 18–19) ---------------- */

  function salvarArea(estado, dados) {
    var id = idOk(dados && dados.id) || ("ar-" + uuid());
    var nome = texto(dados && dados.nome, 60);
    if (!nome) return falha("A área precisa de nome.");
    var atual = estado.areas.filter(function (a) { return a.id === id; })[0];
    if (atual) atual.nome = nome;
    else {
      if (estado.areas.length >= 40) return falha("Limite de áreas.");
      estado.areas.push({ id: id, nome: nome, explorada: !!(dados && dados.explorada) });
    }
    var r = resultado();
    r.id = id;
    return r;
  }

  function rotaPercorrida(estado, de, para) {
    return estado.rotas.some(function (x) { return (x.de === de && x.para === para) || (x.de === para && x.para === de); });
  }

  /* Teste de jornada: só para área ainda não explorada por esse caminho.
     Falhar não impede de chegar — só sorteia uma consequência ruim.
     Perícia que não Sobrevivência: uma vez no Hexatombe inteiro, por
     personagem. opcoes: { de, para, testadorId, pericia, passou, rolar } */
  function registrarJornada(estado, opcoes) {
    var o = opcoes || {};
    var de = idOk(o.de), para = idOk(o.para);
    var destino = estado.areas.filter(function (a) { return a.id === para; })[0];
    if (!destino) return falha("Escolha o destino.");
    var r = resultado();
    var origem = estado.areas.filter(function (a) { return a.id === de; })[0];
    var conhecida = origem && rotaPercorrida(estado, de, para);
    if (conhecida) {
      r.semTeste = true;
      registrar(estado, "jornada", "Jornada por caminho já percorrido (" + origem.nome + " → " + destino.nome + "): sem teste.", "todos");
      return r;
    }
    var testador = participante(estado, o.testadorId);
    var pericia = texto(o.pericia, 40) || "Sobrevivência";
    if (pericia !== "Sobrevivência") {
      if (!testador) return falha("Quem fez o teste com outra perícia?");
      if (testador.alternativas.indexOf(pericia) >= 0) return falha(testador.nome + " já usou " + pericia + " numa jornada: perícia que não Sobrevivência vale uma vez no Hexatombe.");
      testador.alternativas.push(pericia);
    }
    if (typeof o.passou !== "boolean") return falha("Informe se o teste passou.");
    if (!o.passou) {
      var n = o.d6 ? inteiro(o.d6, 1, 6, 1) : dado(o.rolar, 6);
      r.consequencia = CONSEQUENCIAS[n - 1];
      r.avisos.push("Consequência (" + n + "): " + r.consequencia.nome + " — " + r.consequencia.texto);
    }
    destino.explorada = true;
    if (origem && !rotaPercorrida(estado, de, para)) estado.rotas.push({ de: de, para: para });
    registrar(estado, "jornada", "Jornada até " + destino.nome + " (" + pericia + (o.passou ? ", passou" : ", falhou: " + r.consequencia.nome) + "). O grupo chegou.", "todos");
    return r;
  }

  /* Procurar recursos (p. 20): um teste por personagem em cada local. */
  function procurarRecursos(estado, opcoes) {
    var o = opcoes || {};
    var p = participante(estado, o.participanteId);
    var area = estado.areas.filter(function (a) { return a.id === o.areaId; })[0];
    if (!p || !p.vivo || !area) return falha("Escolha quem procura e onde.");
    if (p.procuras.indexOf(area.id) >= 0) return falha(p.nome + " já vasculhou " + area.nome + ".");
    var total = Math.round(Number(o.total));
    if (!Number.isFinite(total)) return falha("Informe o resultado do teste.");
    var alcancadas = COLUNAS_DE_RECURSO.map(function (c, i) { return total >= c ? i : -1; }).filter(function (i) { return i >= 0; });
    var colunas = !alcancadas.length ? [] : (estado.leituraDeRecursos === "cumulativa" ? alcancadas : [alcancadas[alcancadas.length - 1]]);
    var r = resultado();
    r.achados = colunas.map(function (col, i) {
      var n = o.d12 && o.d12[i] ? inteiro(o.d12[i], 1, 12, 1) : dado(o.rolar, 12);
      return { coluna: COLUNAS_DE_RECURSO[col], d12: n, nome: RECURSOS_ENCONTRADOS[n - 1][col] };
    });
    p.procuras.push(area.id);
    var eq = equipe(estado, p.equipeId);
    r.achados.forEach(function (a) {
      if (!eq) return;
      if (a.nome === "Água") eq.estoque.agua = Math.min(999, eq.estoque.agua + 1);
      else if (a.nome === "Comida") eq.estoque.comida = Math.min(999, eq.estoque.comida + 1);
      else if (a.nome === "Sucata") eq.estoque.sucata = Math.min(999, eq.estoque.sucata + 1);
      else {
        var it = eq.estoque.itens.filter(function (x) { return x.nome === a.nome; })[0];
        if (it) it.qtd = Math.min(999, it.qtd + 1);
        else if (eq.estoque.itens.length < 40) eq.estoque.itens.push({ nome: a.nome, qtd: 1 });
      }
    });
    registrar(estado, "recursos", p.nome + " procurou recursos em " + area.nome + " (teste " + total + "): " +
      (r.achados.length ? r.achados.map(function (a) { return a.nome; }).join(", ") : "nada") + ".", eq ? eq.id : "mestre");
    return r;
  }

  function rolarEncontro(estado, tipo, opcoes) {
    var t = ENCONTROS[tipo];
    if (!t) return falha("Tipo de encontro desconhecido.");
    var o = opcoes || {};
    var n = o.valor ? inteiro(o.valor, 1, t.dado, 1) : dado(o.rolar, t.dado);
    var faixa = t.faixas.filter(function (f) { return n <= f[0]; })[0];
    var r = resultado();
    r.encontro = { tipo: tipo, nome: faixa[1], texto: faixa[2], valor: n, dado: t.dado };
    registrar(estado, "encontro", "Encontro " + t.nome.toLowerCase() + " (1d" + t.dado + " = " + n + "): " + faixa[1] + ".", o.visivel || "mestre");
    return r;
  }

  /* Intenção cumprida (p. 24): só com o estigma desbloqueado, uma vez
     por participante. A recompensa vira lançamento na ficha. */
  function cumprirIntencao(estado, participanteId, estigma) {
    var p = participante(estado, participanteId);
    var e = POR_ESTIGMA[estigma];
    if (!p || !e) return falha("Participante ou estigma desconhecido.");
    if (!p.vivo) return falha(p.nome + " está morto.");
    if (!desbloqueada(estado, estigma)) return falha("A intenção de " + e.nome + " ainda não foi desbloqueada por um sacrifício.");
    if (p.intencoes[estigma]) return falha(p.nome + " já cumpriu a intenção de " + e.nome + ".");
    p.intencoes[estigma] = { dia: estado.dia };
    var r = resultado();
    lancar(r, p, "hx.intencao." + p.id + "." + estigma, e.lancamento.tipo, e.lancamento.valor,
      "Intenção cumprida: " + e.sentimentos + " — " + e.recompensa + " (AS2 p. 24)", "Intenção");
    registrar(estado, "intencao", p.nome + " cumpriu a intenção de " + e.nome + ".", p.equipeId || "mestre");
    return r;
  }

  function desfazerIntencao(estado, participanteId, estigma) {
    var p = participante(estado, participanteId);
    if (!p || !p.intencoes[estigma]) return falha("Nada a desfazer.");
    delete p.intencoes[estigma];
    var r = resultado();
    if (p.personagemId) r.desfazer.push({ personagemId: p.personagemId, id: "hx.intencao." + p.id + "." + estigma });
    registrar(estado, "intencao", "Intenção de " + POR_ESTIGMA[estigma].nome + " desfeita para " + p.nome + ".", "mestre");
    return r;
  }

  /* A meia-noite do sexto dia (p. 6 e 11): sem o sacrifício final, os
     desertores definham. A mesa confirma. */
  function luaDeSangue(estado, sacrificioFinalFeito) {
    if (estado.dia < DIAS) return falha("A Lua de Sangue é na sexta noite.");
    var r = resultado();
    var restantes = vivos(estado).length;
    if (sacrificioFinalFeito) {
      if (restantes !== 6) r.avisos.push("O sacrifício final pede exatamente seis presentes; há " + restantes + " vivos. Com menos de seis, o Hexatombe fracassa (regra X).");
      estado.participantes.forEach(function (p) {
        if (p.vivo && p.sacrificio && p.original) r.avisos.push(p.nome + " foi eleito sacrifício na origem: pela regra VI, estará morto ao fim do sexto dia.");
      });
      registrar(estado, "final", "O sacrifício final foi realizado sob a Lua de Sangue.", "todos");
      return r;
    }
    estado.participantes.forEach(function (p) {
      if (!p.vivo || !p.desertor) return;
      p.vivo = false;
      p.morte = { dia: estado.dia, momento: "noite", causa: "lua", por: "" };
      r.avisos.push(p.nome + " definhou sob a Lua de Sangue.");
    });
    registrar(estado, "final", "Meia-noite sem o sacrifício final: os desertores definharam.", "todos");
    return r;
  }

  function marcarFracasso(estado, fracassou) {
    estado.fracassou = !!fracassou;
    registrar(estado, "final", fracassou ? "O Hexatombe fracassou." : "Fracasso desmarcado pela mesa.", "todos");
    return resultado();
  }

  function anotar(estado, txt, visivel) {
    if (!texto(txt, 400)) return falha("Escreva algo.");
    registrar(estado, "nota", txt, visivel || "mestre");
    return resultado();
  }

  /* Os lançamentos que ainda não chegaram às fichas ficam pendentes no
     estado até o envio dar certo (o id estável impede a duplicação). */
  function guardarPendentes(estado, r) {
    (r.lancamentos || []).forEach(function (x) { estado.pendentes.push({ personagemId: x.personagemId, desfazer: false, lancamento: copiar(x.lancamento) }); });
    (r.desfazer || []).forEach(function (x) { estado.pendentes.push({ personagemId: x.personagemId, desfazer: true, lancamento: { id: x.id, tipo: "nota", valor: 0 } }); });
    if (estado.pendentes.length > MAX_PENDENTES) estado.pendentes = estado.pendentes.slice(-MAX_PENDENTES);
  }

  function tirarPendente(estado, personagemId, id, desfazer) {
    estado.pendentes = estado.pendentes.filter(function (x) {
      return !(x.personagemId === personagemId && x.lancamento.id === id && !!x.desfazer === !!desfazer);
    });
  }

  /* =================================================================
     A VISTA DO JOGADOR — a mesma do servidor (Campanhas.gs). Recebe os
     ids dos personagens da pessoa. Equipes rivais: só o nome. Nada de
     notas do mestre, pendências ou registro alheio.
     ================================================================= */

  function vistaDoJogador(bruto, personagemIds) {
    var e = normalizar(bruto);
    if (!e.ativo) return { ativo: false };
    var meus = {};
    lista(personagemIds).forEach(function (id) { meus[String(id)] = true; });
    var minhasEquipes = {};
    e.participantes.forEach(function (p) { if (p.personagemId && meus[p.personagemId] && p.equipeId) minhasEquipes[p.equipeId] = true; });
    return {
      ativo: true, nome: e.nome, dia: e.dia, fase: e.fase, faseNota: e.faseNota, fracassou: e.fracassou,
      equipes: e.equipes.map(function (q) {
        if (!minhasEquipes[q.id]) return { id: q.id, nome: q.nome, rival: true };
        return { id: q.id, nome: q.nome, base: q.base, estoque: q.estoque, descanso: condicaoDeDescanso(e, q.id) };
      }),
      participantes: e.participantes.filter(function (p) { return minhasEquipes[p.equipeId]; }).map(function (p) {
        var meu = !!(p.personagemId && meus[p.personagemId]);
        var x = { id: p.id, nome: p.nome, equipeId: p.equipeId, sacrificio: p.sacrificio, estigma: p.estigma, vivo: p.vivo, desertor: !!p.desertor, meu: meu };
        if (meu) { x.intencoes = p.intencoes; x.consumo = p.consumo; x.sede = p.sede; x.fome = p.fome; x.castigos = p.castigos; x.alternativas = p.alternativas; }
        return x;
      }),
      sacrificios: e.sacrificios.filter(function (s) { return s.valido; }).map(function (s) { return { dia: s.dia, estigma: s.estigma }; }),
      intencoes: e.intencoes.map(function (x) { return { estigma: x.estigma, dia: x.dia }; }),
      areas: e.areas,
      rotas: e.rotas,
      registro: e.registro.filter(function (r) { return r.visivel === "todos" || minhasEquipes[r.visivel]; }),
    };
  }

  global.RAMAHexatombe = {
    DIAS: DIAS,
    FASES: FASES,
    NOMES_FASE: NOMES_FASE,
    ESTIGMAS: ESTIGMAS,
    POR_ESTIGMA: POR_ESTIGMA,
    MELHORIAS: MELHORIAS,
    POR_MELHORIA: POR_MELHORIA,
    DT_MELHORIA: DT_MELHORIA,
    ACOES_DE_DESCANSO: ACOES_DE_DESCANSO,
    CONSEQUENCIAS: CONSEQUENCIAS,
    RECURSOS_ENCONTRADOS: RECURSOS_ENCONTRADOS,
    COLUNAS_DE_RECURSO: COLUNAS_DE_RECURSO,
    ENCONTROS: ENCONTROS,
    MAX_CASTIGOS: MAX_CASTIGOS,

    normalizar: normalizar,
    vazio: vazio,
    equipe: equipe,
    participante: participante,
    membros: membros,
    vivos: vivos,
    desbloqueada: desbloqueada,
    equipeDesertora: equipeDesertora,
    condicaoDeDescanso: condicaoDeDescanso,
    rotaPercorrida: rotaPercorrida,

    ligar: ligar,
    definirFase: definirFase,
    avancarDia: avancarDia,
    salvarEquipe: salvarEquipe,
    removerEquipe: removerEquipe,
    salvarParticipante: salvarParticipante,
    removerParticipante: removerParticipante,
    marcarDesertor: marcarDesertor,
    retornarDaArena: retornarDaArena,
    registrarMorte: registrarMorte,
    escolherHerdeiro: escolherHerdeiro,
    consumir: consumir,
    desfazerConsumo: desfazerConsumo,
    tentarMelhoria: tentarMelhoria,
    instalarMelhoriaEspecial: instalarMelhoriaEspecial,
    removerMelhoria: removerMelhoria,
    salvarArea: salvarArea,
    registrarJornada: registrarJornada,
    procurarRecursos: procurarRecursos,
    rolarEncontro: rolarEncontro,
    cumprirIntencao: cumprirIntencao,
    desfazerIntencao: desfazerIntencao,
    luaDeSangue: luaDeSangue,
    marcarFracasso: marcarFracasso,
    anotar: anotar,
    guardarPendentes: guardarPendentes,
    tirarPendente: tirarPendente,
    vistaDoJogador: vistaDoJogador,
  };
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
