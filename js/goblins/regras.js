/* =====================================================================
   R.A.M.A. — Malditos Goblins (3ª edição) · o motor da ficha
   =====================================================================
   Tudo o que muda a ficha passa por aqui — a tela só pergunta e
   mostra. O mesmo arquivo roda no servidor (backend/Goblins.gs, cópia
   entre marcadores), então nada aqui toca a página.

   O BLOCO `goblins` (VERSAO_BLOCO 1):
     criacao       modo, concluída, os sorteios feitos, se o equipamento
                   inicial já entrou (entra UMA vez)
     ocupacao, descritor, supimpa, modEscolhido (Fazendeiro)
     caracteristicas [{ id, chave, quantidade }]
     equipamentoInicial (índice da opção), escolhas (arma favorita,
                   espécie inimiga, 3 magias, turminha e itens do
                   WarGoblin, Chapéu ou Livro do Cthulin)
     nivel, epicas [{ ocupacao, nivel }] (Níveis Épicos, opcional)
     ajustes       permanentes, com motivo (Morte 0, Poção Verde…)
     ferimentos
     itens         armas, proteções, equipamento, itens mágicos: cada um
                   com munição, recarga, durabilidade atual/original,
                   destruído/consumido — nada some
     efeitos       temporários, com DURAÇÃO POR MARCO (próximo ataque,
                   próximo teste, N turnos, fim da batalha, fim do dia,
                   manual) — nunca por relógio de verdade
     marcas        usos por dia, por batalha e por turno
     tempo         dia, batalha em curso, turno
     estado        situação (ativo, morto, explodiu, explodiu de
                   alegria, louco, sumiu, morto-vivo), causa, marcas
     opcoes        regras opcionais e adaptações LIGADAS; desligar não
                   apaga os dados da adaptação
     adaptacoes    Cthulin (Medo), PokéPragas, Goblin High, Vale
     linhagem      o goblin anterior e o seguinte (morreu? o parente
                   novo aponta para ele — a ficha antiga fica)
     historico, operacoes (ids aplicados: repetir não aplica duas vezes)

   VALORES EM CAMADAS. Atributo = base 2 + ocupação + descritor (+1 do
   Supimpa) + ajustes permanentes (a BASE) + equipamento vestido +
   efeitos temporários. calcular() devolve cada camada e a composição;
   nada disso é gravado de volta na base — abrir e salvar não somam
   bônus de novo.
   ===================================================================== */

(function (global) {
  "use strict";

  var VERSAO_BLOCO = 1;
  var LIMITE_OPERACOES = 200;
  var LIMITE_HISTORICO = 300;
  var SITUACOES = {
    ativo: "Ativo", morto: "Morto", explodiu: "Explodiu", explodiuDeAlegria: "Explodiu de alegria",
    louco: "Perdido para a loucura", sumiu: "Sumiu da existência", mortoVivo: "Morto-vivo",
  };
  var FIM = ["morto", "explodiu", "explodiuDeAlegria", "louco", "sumiu"];
  var DURACOES = {
    proximoAtaque: "até o próximo ataque", proximoTeste: "até a próxima rolagem", turnos: "por turnos",
    fimDaBatalha: "até o fim da batalha", fimDoDia: "até o fim do dia", manual: "até ser encerrado", permanente: "permanente",
  };

  function C() { return global.RAMAGoblinsCatalogo; }
  function D() { return global.RAMAGoblinsDados; }

  function copiar(x) { return x === undefined ? undefined : JSON.parse(JSON.stringify(x)); }
  var contadorDeId = 0;
  function novoId(prefixo) {
    var U = global.RAMAUtil;
    if (U && U.uuid) return (prefixo || "g") + "-" + U.uuid().replace(/-/g, "").slice(0, 16);
    contadorDeId++;
    return (prefixo || "g") + "-" + Date.now().toString(36) + "-" + contadorDeId;
  }
  function evento(tipo, dados) { return Object.assign({}, dados || {}, { tipo: tipo }); }
  function falha(motivo, extra) { return Object.assign({ ok: false, motivo: motivo, eventos: [] }, extra || {}); }
  function ok(eventos, extra) { return Object.assign({ ok: true, eventos: eventos || [] }, extra || {}); }
  function lista(v) { return Array.isArray(v) ? v : []; }
  function objeto(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  function inteiro(v, min, padrao) {
    var n = Math.floor(Number(v));
    if (!isFinite(n)) n = padrao === undefined ? 0 : padrao;
    return min !== undefined && min !== null && n < min ? min : n;
  }
  function texto(v, max) { return typeof v === "string" ? v.slice(0, max || 200) : ""; }
  function chaveValida(v) { return typeof v === "string" && /^[A-Za-z0-9_-]{1,60}$/.test(v); }
  function bool(v) { return v === true; }
  function normalizarTexto(t) { return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim(); }

  /* ---------------------------------------------------------------
     O BLOCO
     --------------------------------------------------------------- */

  function adaptacoesVazias() {
    return {
      cthulin: { medo: 0 },
      pokepragas: { pokepedras: 0, pragas: [], encontrada: null },
      goblinHigh: { estudantes: [], popular: false, humilhado: false, briga: null },
      vale: { fazenda: false, galinhas: 0, vacas: 0, minas: 0, bosques: 0, hortas: [], construcoes: [], recursos: { ovo: 0, leite: 0, pedra: 0, madeira: 0 }, alimentos: {}, peixes: [], pratos: {} },
    };
  }

  function fichaVazia() {
    return {
      v: VERSAO_BLOCO,
      criacao: { modo: "", concluida: false, sorteios: [], equipamentoAplicado: false, nomeSugerido: "", pendenciaDeNome: "" },
      nomeDeFamilia: "",
      ocupacao: "", descritor: "", supimpa: "", modEscolhido: "",
      caracteristicas: [],
      equipamentoInicial: null,
      escolhas: { armaFavorita: "", especieInimiga: "", magias: [], grupoWar: "", equipamentoWar: [], inicialCthulin: "" },
      nivel: 1,
      epicas: [],
      ajustes: [],
      ferimentos: 0,
      itens: [],
      efeitos: [],
      marcas: { dia: {}, batalha: {}, turno: {} },
      tempo: { dia: 1, batalha: false, turno: 0 },
      estado: { situacao: "ativo", causa: "", marcas: [], vozGoblin: "", pendenteEpico: false },
      opcoes: { vozGoblin: false, deuRuim: false, niveisEpicos: false, explosoesManuais: false, adaptacoes: { cthulin: false, pokepragas: false, wargoblin: false, goblinHigh: false, vale: false } },
      adaptacoes: adaptacoesVazias(),
      linhagem: { anterior: null, seguinte: null },
      historico: [],
      operacoes: [],
      seq: 0,
    };
  }

  function normalizarItem(b) {
    var x = objeto(b);
    var i = {
      id: chaveValida(x.id) ? x.id : novoId("it"),
      chave: typeof x.chave === "string" ? x.chave.slice(0, 60) : "",
      categoria: ["arma", "protecao", "equipamento", "magico", "outro"].indexOf(x.categoria) >= 0 ? x.categoria : "outro",
      nome: texto(x.nome, 120) || "Item",
      equipado: bool(x.equipado),
      quantidade: inteiro(x.quantidade, 0, 1),
      nota: texto(x.nota, 600),
      destruido: bool(x.destruido),
      consumido: bool(x.consumido),
      arremessado: bool(x.arremessado),
      precisaRecarregar: bool(x.precisaRecarregar),
      municao: null, durabilidade: null,
      magico: objeto(x.magico),
      personalizado: x.personalizado && typeof x.personalizado === "object" ? copiar(x.personalizado) : null,
      aceso: x.aceso && typeof x.aceso === "object" ? { turnos: inteiro(x.aceso.turnos, 0) } : null,
    };
    if (x.municao && typeof x.municao === "object") i.municao = { atual: inteiro(x.municao.atual, 0), max: inteiro(x.municao.max, 0) };
    if (x.durabilidade && typeof x.durabilidade === "object") i.durabilidade = { atual: inteiro(x.durabilidade.atual, 0), original: inteiro(x.durabilidade.original, 0) };
    return i;
  }

  function normalizarEfeito(b) {
    var x = objeto(b);
    var e = {
      id: chaveValida(x.id) ? x.id : novoId("ef"),
      chave: texto(x.chave, 60) || "efeito",
      nome: texto(x.nome, 120) || "Efeito",
      ate: DURACOES[x.ate] ? x.ate : "manual",
      turnos: inteiro(x.turnos, 0),
      mods: {},
      dados: inteiro(x.dados, 0),
      fonte: texto(x.fonte, 120), pagina: x.pagina ? inteiro(x.pagina, 0) : null, texto: texto(x.texto, 400),
      item: chaveValida(x.item) ? x.item : "",
      alvo: texto(x.alvo, 120),
      imuneFogo: bool(x.imuneFogo), semAtaque: bool(x.semAtaque), semAgir: bool(x.semAgir), semEsquiva: bool(x.semEsquiva),
      ataque: inteiro(x.ataque), porMinuto: inteiro(x.porMinuto, 0),
      dia: inteiro(x.dia, 0),
    };
    Object.keys(objeto(x.mods)).forEach(function (k) { if (C().CHAVES_ATRIBUTO.indexOf(k) >= 0 && inteiro(x.mods[k])) e.mods[k] = inteiro(x.mods[k]); });
    return e;
  }

  function normalizarPraga(b) {
    var x = objeto(b);
    return {
      id: chaveValida(x.id) ? x.id : novoId("pp"),
      nome: texto(x.nome, 60) || "PokéPraga",
      bicho: chaveValida(x.bicho) ? x.bicho : "rato",
      raridade: ["comum", "incomum", "raro"].indexOf(x.raridade) >= 0 ? x.raridade : "comum",
      elementos: lista(x.elementos).filter(chaveValida).slice(0, 12),
      evolucoes: inteiro(x.evolucoes, 0),
      ferimentos: inteiro(x.ferimentos, 0),
      desmaiada: bool(x.desmaiada),
    };
  }

  function normalizarEstudante(b) {
    var x = objeto(b);
    var esc = C().GOBLIN_HIGH.escala;
    var rev = objeto(x.revelado);
    return {
      id: chaveValida(x.id) ? x.id : novoId("es"),
      nome: texto(x.nome, 60) || "Estudante",
      reacao: esc.indexOf(x.reacao) >= 0 ? x.reacao : "neutro",
      assunto: inteiro(x.assunto, 1, 1), gosto: inteiro(x.gosto, 1, 1), materia: inteiro(x.materia, 1, 1), segredo: inteiro(x.segredo, 1, 1),
      revelado: { assunto: bool(rev.assunto), gosto: bool(rev.gosto), materia: bool(rev.materia), segredo: bool(rev.segredo) },
      romance: x.romance && typeof x.romance === "object" ? { meses: inteiro(x.romance.meses, 0), desde: inteiro(x.romance.desde, 0) } : null,
      agrados3: lista(x.agrados3).map(function (n) { return inteiro(n, 0); }).slice(-4),
      nota: texto(x.nota, 400),
    };
  }

  function normalizarVale(b) {
    var x = objeto(b);
    var v = adaptacoesVazias().vale;
    v.fazenda = bool(x.fazenda);
    ["galinhas", "vacas", "minas", "bosques"].forEach(function (k) { v[k] = inteiro(x[k], 0); });
    v.hortas = lista(x.hortas).slice(0, 60).map(function (h) {
      var y = objeto(h);
      return { id: chaveValida(y.id) ? y.id : novoId("ho"), planta: texto(y.planta, 40) || "Cenoura", m2: inteiro(y.m2, 0), plantadaNoDia: inteiro(y.plantadaNoDia, 0), colheitaEm: inteiro(y.colheitaEm, 0), colhida: bool(y.colhida) };
    });
    v.construcoes = lista(x.construcoes).filter(chaveValida).slice(0, 40);
    var rec = objeto(x.recursos);
    ["ovo", "leite", "pedra", "madeira"].forEach(function (k) { v.recursos[k] = inteiro(rec[k], 0); });
    Object.keys(objeto(x.alimentos)).slice(0, 40).forEach(function (k) { var n = inteiro(x.alimentos[k], 0); if (n > 0) v.alimentos[texto(k, 40)] = n; });
    v.peixes = lista(x.peixes).slice(0, 200).map(function (p) {
      var y = objeto(p);
      return { id: chaveValida(y.id) ? y.id : novoId("px"), nome: texto(y.nome, 40) || "Peixe", local: y.local === "lago" ? "lago" : "rio", gramas: inteiro(y.gramas, 0) };
    }).filter(function (p) { return p.gramas > 0; });
    Object.keys(objeto(x.pratos)).slice(0, 40).forEach(function (k) { var n = inteiro(x.pratos[k], 0); if (n > 0 && chaveValida(k)) v.pratos[k] = n; });
    return v;
  }

  function normalizar(bruto) {
    var b = objeto(bruto);
    var o = fichaVazia();
    var cr = objeto(b.criacao);
    o.criacao = {
      modo: ["guiada", "manual", "aleatoria"].indexOf(cr.modo) >= 0 ? cr.modo : "",
      concluida: bool(cr.concluida),
      sorteios: lista(cr.sorteios).slice(-40).map(function (s) { return objeto(s); }),
      equipamentoAplicado: bool(cr.equipamentoAplicado),
      nomeSugerido: texto(cr.nomeSugerido, 80),
      pendenciaDeNome: ["", "comida", "inverter"].indexOf(cr.pendenciaDeNome) >= 0 ? cr.pendenciaDeNome : "",
    };
    o.nomeDeFamilia = texto(b.nomeDeFamilia, 60);
    o.ocupacao = C().OCUPACOES[b.ocupacao] ? b.ocupacao : "";
    o.descritor = C().DESCRITORES[b.descritor] ? b.descritor : "";
    o.supimpa = C().CHAVES_ATRIBUTO.indexOf(b.supimpa) >= 0 ? b.supimpa : "";
    o.modEscolhido = C().CHAVES_ATRIBUTO.indexOf(b.modEscolhido) >= 0 ? b.modEscolhido : "";
    o.caracteristicas = lista(b.caracteristicas).slice(0, 12).map(function (c) {
      var y = objeto(c);
      return { id: chaveValida(y.id) ? y.id : novoId("ca"), chave: C().CARACTERISTICAS[y.chave] ? y.chave : "", quantidade: y.quantidade === undefined || y.quantidade === null ? null : inteiro(y.quantidade, 0) };
    }).filter(function (c) { return c.chave; });
    o.equipamentoInicial = b.equipamentoInicial === null || b.equipamentoInicial === undefined ? null : inteiro(b.equipamentoInicial, 0);
    var es = objeto(b.escolhas);
    o.escolhas = {
      armaFavorita: C().ARMAS[es.armaFavorita] ? es.armaFavorita : "",
      especieInimiga: texto(es.especieInimiga, 60),
      magias: lista(es.magias).filter(function (m) { return C().MAGIAS_DO_BRUXO.indexOf(m) >= 0; }).filter(function (m, i, t) { return t.indexOf(m) === i; }).slice(0, 3),
      grupoWar: C().WARGOBLIN.grupos[es.grupoWar] ? es.grupoWar : "",
      equipamentoWar: lista(es.equipamentoWar).filter(function (k) { return C().WARGOBLIN.equipamento.indexOf(k) >= 0; }).slice(0, 2),
      inicialCthulin: C().CTHULIN.inicial.indexOf(es.inicialCthulin) >= 0 ? es.inicialCthulin : "",
    };
    o.nivel = Math.max(1, Math.min(4, inteiro(b.nivel, 1, 1)));
    o.epicas = lista(b.epicas).map(function (e) { var y = objeto(e); return { ocupacao: C().OCUPACOES[y.ocupacao] ? y.ocupacao : "", nivel: Math.max(1, Math.min(4, inteiro(y.nivel, 1, 1))) }; }).filter(function (e) { return e.ocupacao; }).slice(0, 8);
    o.ajustes = lista(b.ajustes).slice(0, 60).map(function (a) {
      var y = objeto(a);
      return { id: chaveValida(y.id) ? y.id : novoId("aj"), atributo: C().CHAVES_ATRIBUTO.indexOf(y.atributo) >= 0 ? y.atributo : "combate", valor: inteiro(y.valor), motivo: texto(y.motivo, 200), pagina: y.pagina ? inteiro(y.pagina, 0) : null, dia: inteiro(y.dia, 0) };
    }).filter(function (a) { return a.valor; });
    o.ferimentos = inteiro(b.ferimentos, 0);
    o.itens = lista(b.itens).slice(0, 120).map(normalizarItem);
    o.efeitos = lista(b.efeitos).slice(0, 60).map(normalizarEfeito);
    var mc = objeto(b.marcas);
    o.marcas = { dia: Object.assign({}, objeto(mc.dia)), batalha: Object.assign({}, objeto(mc.batalha)), turno: Object.assign({}, objeto(mc.turno)) };
    var tp = objeto(b.tempo);
    o.tempo = { dia: inteiro(tp.dia, 1, 1), batalha: bool(tp.batalha), turno: inteiro(tp.turno, 0) };
    var st = objeto(b.estado);
    o.estado = {
      situacao: SITUACOES[st.situacao] ? st.situacao : "ativo",
      causa: texto(st.causa, 200),
      marcas: lista(st.marcas).filter(chaveValida).slice(0, 20),
      vozGoblin: ["", "ativa", "perdida"].indexOf(st.vozGoblin) >= 0 ? st.vozGoblin : "",
      pendenteEpico: bool(st.pendenteEpico),
    };
    var op = objeto(b.opcoes), ad = objeto(op.adaptacoes);
    o.opcoes = { vozGoblin: bool(op.vozGoblin), deuRuim: bool(op.deuRuim), niveisEpicos: bool(op.niveisEpicos), explosoesManuais: bool(op.explosoesManuais), adaptacoes: {} };
    Object.keys(C().ADAPTACOES).forEach(function (k) { o.opcoes.adaptacoes[k] = bool(ad[k]); });
    var a = objeto(b.adaptacoes);
    o.adaptacoes.cthulin = { medo: inteiro(objeto(a.cthulin).medo, 0) };
    var pk = objeto(a.pokepragas);
    o.adaptacoes.pokepragas = { pokepedras: inteiro(pk.pokepedras, 0), pragas: lista(pk.pragas).slice(0, 40).map(normalizarPraga), encontrada: pk.encontrada && typeof pk.encontrada === "object" ? normalizarPraga(pk.encontrada) : null };
    var gh = objeto(a.goblinHigh);
    o.adaptacoes.goblinHigh = { estudantes: lista(gh.estudantes).slice(0, 60).map(normalizarEstudante), popular: bool(gh.popular), humilhado: bool(gh.humilhado), briga: gh.briga && typeof gh.briga === "object" ? { estudante: texto(gh.briga.estudante, 60), amigosDele: inteiro(gh.briga.amigosDele, 0), dia: inteiro(gh.briga.dia, 0) } : null };
    o.adaptacoes.vale = normalizarVale(a.vale);
    var ln = objeto(b.linhagem);
    function ref(x) { return x && typeof x === "object" && chaveValida(x.id) ? { id: x.id, nome: texto(x.nome, 120) } : null; }
    o.linhagem = { anterior: ref(ln.anterior), seguinte: ref(ln.seguinte) };
    o.historico = lista(b.historico).slice(-LIMITE_HISTORICO).map(function (h) { var y = objeto(h); return { n: inteiro(y.n, 0), dia: inteiro(y.dia, 0), tipo: texto(y.tipo, 40), texto: texto(y.texto, 400) }; });
    o.operacoes = lista(b.operacoes).filter(function (x) { return typeof x === "string"; }).slice(-LIMITE_OPERACOES);
    o.seq = inteiro(b.seq, 0);
    return o;
  }

  function registrar(o, tipo, t) {
    o.seq++;
    o.historico.push({ n: o.seq, dia: o.tempo.dia, tipo: tipo, texto: String(t).slice(0, 400) });
    if (o.historico.length > LIMITE_HISTORICO) o.historico = o.historico.slice(-LIMITE_HISTORICO);
  }

  /* ---------------------------------------------------------------
     O QUE O GOBLIN É
     --------------------------------------------------------------- */

  function ativo(o) { return o.estado.situacao === "ativo" || o.estado.situacao === "mortoVivo"; }
  function motivoInativo(o) { return ativo(o) ? "" : "Este goblin está fora de jogo (" + SITUACOES[o.estado.situacao] + ")."; }

  function nomeDaOcupacao(o, chave) {
    var k = chave || o.ocupacao;
    var def = C().OCUPACOES[k];
    if (!def) return "";
    if (o.opcoes.adaptacoes.wargoblin && o.escolhas.grupoWar && k === o.ocupacao) return C().WARGOBLIN.grupos[o.escolhas.grupoWar].nome;
    if (o.opcoes.adaptacoes.cthulin && C().CTHULIN.nomes[k]) return C().CTHULIN.nomes[k];
    return def.nome;
  }

  /* As ocupações e o nível em cada uma (a principal + as épicas). */
  function ocupacoesDe(o) {
    var r = [];
    if (o.ocupacao) r.push({ ocupacao: o.ocupacao, nivel: o.nivel, epica: false });
    o.epicas.forEach(function (e) { r.push({ ocupacao: e.ocupacao, nivel: e.nivel, epica: true }); });
    return r;
  }

  function tecnicasDe(o) {
    var r = [];
    ocupacoesDe(o).forEach(function (oc) {
      var def = C().OCUPACOES[oc.ocupacao];
      def.tecnicas.forEach(function (t) {
        if (t.nivel <= oc.nivel) r.push(Object.assign({ ocupacao: oc.ocupacao, pagina: def.pagina }, t));
      });
    });
    return r;
  }
  function temTecnica(o, chave) { return tecnicasDe(o).some(function (t) { return t.chave === chave; }); }
  function usoDiario(o, chave) { return !!o.marcas.dia["tecnica:" + chave]; }

  /* A definição efetiva de um item: o catálogo (ou o item mágico e a
     arma ou proteção que ele é), mais o personalizado. */
  function defDoItem(i) {
    var cat = C().itemDoCatalogo(i.chave);
    var def = { arma: null, protecao: null, mods: null, magico: null, equip: null };
    if (cat && cat.categoria === "arma") def.arma = cat.def;
    if (cat && cat.categoria === "protecao") { def.protecao = cat.def; if (cat.def.mods) def.mods = cat.def.mods; }
    if (cat && cat.categoria === "equipamento") def.equip = cat.def;
    if (cat && cat.categoria === "magico") {
      def.magico = cat.def;
      if (cat.def.base && C().ARMAS[cat.def.base]) def.arma = C().ARMAS[cat.def.base];
      if (cat.def.base && C().PROTECOES[cat.def.base]) def.protecao = C().PROTECOES[cat.def.base];
      if (cat.def.protecao) def.protecao = Object.assign({ nome: cat.def.nome }, cat.def.protecao);
      if (cat.def.mods) def.mods = cat.def.mods;
    }
    var p = i.personalizado;
    if (p && p.arma) def.arma = Object.assign({ nome: i.nome, maos: 1, ataque: "corporal", bonus: 0, municao: null }, p.arma);
    if (p && p.protecao) def.protecao = Object.assign({ nome: i.nome, uso: "tronco", durabilidade: 0 }, p.protecao);
    return def;
  }

  function disponivel(i) { return !i.destruido && !i.consumido; }
  function vestido(i) { return disponivel(i) && i.equipado && !i.arremessado; }

  /* Os atributos em camadas. */
  function calcular(o) {
    var At = C().CHAVES_ATRIBUTO;
    var oc = C().OCUPACOES[o.ocupacao];
    var de = C().DESCRITORES[o.descritor];
    var atributos = {};
    At.forEach(function (a) {
      var comp = [{ fonte: "Base", valor: 2, camada: "base" }];
      if (oc && oc.mod && oc.mod[a]) comp.push({ fonte: oc.nome, valor: oc.mod[a], camada: "base" });
      if (oc && oc.modEscolha && o.modEscolhido === a) comp.push({ fonte: oc.nome + " (escolha)", valor: 1, camada: "base" });
      if (de && de.mod && de.mod[a]) comp.push({ fonte: de.nome, valor: de.mod[a], camada: "base" });
      if (de && de.escolha && o.supimpa === a) comp.push({ fonte: "Supimpa", valor: 1, camada: "base" });
      o.ajustes.forEach(function (aj) { if (aj.atributo === a) comp.push({ fonte: aj.motivo || "Ajuste", valor: aj.valor, camada: "permanente" }); });
      o.itens.forEach(function (i) {
        if (!vestido(i)) return;
        var d = defDoItem(i);
        if (d.mods && d.mods[a]) comp.push({ fonte: i.nome, valor: d.mods[a], camada: "equipamento" });
      });
      o.efeitos.forEach(function (e) { if (e.mods[a]) comp.push({ fonte: e.nome, valor: e.mods[a], camada: "temporario" }); });
      var soma = function (cam) { return comp.filter(function (c) { return !cam || cam.indexOf(c.camada) >= 0; }).reduce(function (s, c) { return s + c.valor; }, 0); };
      atributos[a] = {
        base: soma(["base"]), permanente: soma(["base", "permanente"]), equipamento: soma(["equipamento"]), temporario: soma(["temporario"]),
        valor: soma(null), composicao: comp,
      };
    });
    var vit = atributos.vitalidade.valor;
    var armas = o.itens.filter(function (i) { return vestido(i) && defDoItem(i).arma; });
    var protecoes = o.itens.filter(function (i) { return disponivel(i) && defDoItem(i).protecao; });
    return {
      atributos: atributos,
      vitalidade: vit,
      ferimentos: o.ferimentos,
      /* Morre com MAIS ferimentos que a Vitalidade (p. 5). */
      passouDoLimite: o.ferimentos > vit,
      noLimite: o.ferimentos === vit && vit >= 0,
      situacao: o.estado.situacao,
      armas: armas, protecoes: protecoes,
      tecnicas: tecnicasDe(o),
      magias: magiasDisponiveis(o),
      imuneFogo: imuneAFogo(o),
    };
  }

  function valor(o, atributo) { return calcular(o).atributos[atributo].valor; }

  function imuneAFogo(o) {
    if (temTecnica(o, "imunidade")) return true;
    return o.efeitos.some(function (e) { return e.imuneFogo; });
  }

  /* Morte, loucura: o estado só muda quando o número passa do limite
     NUMA AÇÃO — curar ou o efeito acabar depois não ressuscita. */
  function verificarFim(o, eventos, causa) {
    if (!ativo(o)) return;
    var c = calcular(o);
    if (c.passouDoLimite) {
      fim(o, "morto", causa || "Mais ferimentos que Vitalidade", eventos);
      if (o.itens.some(function (i) { return disponivel(i) && i.chave === "necronomicon"; })) eventos.push(evento("necronomicon", { texto: "Morreu com o Necronomicon: pode voltar como morto-vivo (a mesa decide)." }));
      return;
    }
    if (o.opcoes.adaptacoes.cthulin && o.adaptacoes.cthulin.medo > c.atributos.nocao.valor) fim(o, "louco", "Mais Medo que Noção", eventos);
  }

  function fim(o, situacao, causa, eventos) {
    if (!ativo(o) && o.estado.situacao !== "mortoVivo") return;
    o.estado.situacao = situacao;
    o.estado.causa = causa || "";
    registrar(o, "fim", SITUACOES[situacao] + (causa ? ": " + causa : ""));
    eventos.push(evento("fim", { situacao: situacao, causa: causa || "" }));
  }

  /* ---------------------------------------------------------------
     EFEITOS E MARCOS DE TEMPO
     --------------------------------------------------------------- */

  function adicionarEfeito(o, def, eventos) {
    var e = normalizarEfeito(Object.assign({ dia: o.tempo.dia }, def));
    /* O mesmo efeito de novo (pela chave e pelo item) renova em vez de
       empilhar. */
    o.efeitos = o.efeitos.filter(function (x) { return !(x.chave === e.chave && x.item === e.item && x.alvo === e.alvo); });
    o.efeitos.push(e);
    if (eventos) eventos.push(evento("efeito", { nome: e.nome, ate: e.ate }));
    return e;
  }

  function removerEfeito(o, id) {
    var e = o.efeitos.filter(function (x) { return x.id === id; })[0];
    if (!e) return falha("Efeito não encontrado.");
    o.efeitos = o.efeitos.filter(function (x) { return x.id !== id; });
    registrar(o, "efeito", e.nome + " encerrado");
    return ok([evento("efeitoEncerrado", { nome: e.nome })]);
  }

  function temEfeito(o, chave) { return o.efeitos.some(function (e) { return e.chave === chave; }); }

  /* Expira por marco: "proximoAtaque", "proximoTeste", "turno",
     "fimDaBatalha", "fimDoDia". */
  function expirar(o, marco, eventos) {
    var ficam = [];
    o.efeitos.forEach(function (e) {
      var sai = false;
      if (marco === "proximoAtaque" && e.ate === "proximoAtaque") sai = true;
      if ((marco === "proximoTeste" || marco === "proximoAtaque") && e.ate === "proximoTeste") sai = true;
      if (marco === "turno" && e.ate === "turnos") { e.turnos--; sai = e.turnos <= 0; }
      if (marco === "fimDaBatalha" && (e.ate === "fimDaBatalha" || e.ate === "turnos" || e.ate === "proximoAtaque")) sai = true;
      if (marco === "fimDoDia" && (e.ate === "fimDoDia" || e.ate === "fimDaBatalha" || e.ate === "turnos")) sai = true;
      if (sai) { if (eventos) eventos.push(evento("efeitoExpirou", { nome: e.nome })); }
      else ficam.push(e);
    });
    o.efeitos = ficam;
  }

  /* Os dados extras que efeitos dão à próxima rolagem (Poção Roxa). */
  function dadosDeEfeitos(o) {
    return o.efeitos.filter(function (e) { return e.dados && (e.ate === "proximoTeste" || e.ate === "proximoAtaque"); })
      .map(function (e) { return { fonte: e.nome, valor: e.dados }; });
  }

  function iniciarBatalha(o) {
    if (o.tempo.batalha) return falha("Já há uma batalha em curso.");
    o.tempo.batalha = true;
    o.tempo.turno = 1;
    o.marcas.batalha = {};
    o.marcas.turno = {};
    registrar(o, "tempo", "Começou uma batalha");
    return ok([evento("batalha", { inicio: true })]);
  }

  function fimDaBatalha(o) {
    var eventos = [evento("batalha", { inicio: false })];
    expirar(o, "fimDaBatalha", eventos);
    o.tempo.batalha = false;
    o.tempo.turno = 0;
    o.marcas.batalha = {};
    o.marcas.turno = {};
    o.itens.forEach(function (i) { i.precisaRecarregar = false; });
    registrar(o, "tempo", "Fim da batalha");
    return ok(eventos);
  }

  /* O fim do turno DESTE goblin: conta os efeitos por turno e o pavio
     das galinhas acesas. */
  function fimDoTurno(o) {
    var eventos = [evento("turno", { turno: o.tempo.turno })];
    expirar(o, "turno", eventos);
    o.marcas.turno = {};
    o.tempo.turno++;
    o.itens.forEach(function (i) {
      if (!i.aceso || !disponivel(i)) return;
      i.aceso.turnos--;
      if (i.aceso.turnos <= 0) {
        i.aceso = null;
        i.consumido = true;
        i.equipado = false;
        registrar(o, "item", i.nome + " explodiu");
        eventos.push(evento("explosaoDeArea", { item: i.nome, aneis: [{ alcance: "em volta", ferimentos: 3 }], pagina: 13 }));
      }
    });
    return ok(eventos);
  }

  /* A noite de descanso e o dia novo (p. 5): −1 ferimento (se
     descansou), usos diários de volta, efeitos "até o fim do dia" acabam.
     Peteca: quem brincou rola no fim do dia. Goblin High: cada Inimigo
     rola "Te pego na saída". */
  function novoDia(o, opcoes, rolador) {
    var op = opcoes || {};
    var eventos = [];
    expirar(o, "fimDoDia", eventos);
    var brincou = !!o.marcas.dia.peteca;
    o.marcas.dia = {};
    o.marcas.batalha = {};
    o.marcas.turno = {};
    if (o.tempo.batalha) { o.tempo.batalha = false; o.tempo.turno = 0; }
    o.tempo.dia++;
    if (op.descansou !== false && ativo(o) && o.ferimentos > 0) {
      o.ferimentos--;
      eventos.push(evento("cura", { valor: 1, motivo: "Noite de descanso" }));
    }
    if (brincou && rolador) {
      var f = D().quantidade("1d6", rolador);
      eventos.push(evento("peteca", { dados: f.dados, saiu: f.total === 6 }));
      if (f.total === 6) adicionarEfeito(o, { chave: "peteca", nome: "Peteca: Habilidade +1 hoje", ate: "fimDoDia", mods: { habilidade: 1 }, fonte: "Peteca", pagina: 27 }, eventos);
    }
    if (o.opcoes.adaptacoes.goblinHigh && rolador) {
      o.adaptacoes.goblinHigh.estudantes.forEach(function (es) {
        if (es.reacao !== "inimigo") return;
        var s = D().sortear({ id: "tePego", nome: "Te pego na saída", pagina: 39, dados: "1d6", entradas: C().GOBLIN_HIGH.tePego }, rolador);
        eventos.push(evento("tePego", { estudante: es.nome, dados: s.dados, resultado: s.resultado }));
        if (s.indice === 6) o.adaptacoes.goblinHigh.briga = { estudante: es.nome, amigosDele: D().quantidade("1d6-1", rolador).total, dia: o.tempo.dia };
      });
    }
    var vale = o.adaptacoes.vale;
    vale.hortas.forEach(function (h) { if (!h.colhida && h.colheitaEm && h.colheitaEm === o.tempo.dia) eventos.push(evento("hortaPronta", { planta: h.planta, m2: h.m2 })); });
    registrar(o, "tempo", "Dia " + o.tempo.dia + (op.descansou !== false ? " (descansou)" : ""));
    eventos.unshift(evento("novoDia", { dia: o.tempo.dia }));
    return ok(eventos);
  }

  /* ---------------------------------------------------------------
     FERIMENTOS, CURA, ATAQUES RECEBIDOS
     --------------------------------------------------------------- */

  /* Ferimentos que chegam ao goblin (já depois de esquiva e bloqueio):
     a Resistência (−1 de fogo ou tiro de arma de fogo) e a Imunidade
     (fogo) do Incendiário; o anel em chamas também protege do fogo. */
  function ferimentosQueChegam(o, n, tipo) {
    var t = tipo || {};
    var valorFinal = inteiro(n, 0);
    var notas = [];
    if (t.fogo && imuneAFogo(o)) { if (valorFinal) notas.push("Imune a fogo"); return { valor: 0, notas: notas }; }
    if ((t.fogo || t.armaDeFogo) && temTecnica(o, "resistencia") && valorFinal > 0) { valorFinal--; notas.push("Resistência: −1"); }
    if (t.queda && o.itens.some(function (i) { return disponivel(i) && i.chave === "guardaChuva"; }) && valorFinal > 0) { valorFinal--; notas.push("Guarda-chuva: −1"); }
    return { valor: valorFinal, notas: notas };
  }

  function sofrer(o, pedido) {
    var p = pedido || {};
    var eventos = [];
    var r = ferimentosQueChegam(o, p.ferimentos, p);
    o.ferimentos += r.valor;
    registrar(o, "ferimentos", "+" + r.valor + " ferimento(s)" + (p.fonte ? " (" + p.fonte + ")" : "") + (r.notas.length ? " — " + r.notas.join(", ") : ""));
    eventos.push(evento("ferimentos", { valor: r.valor, pedido: inteiro(p.ferimentos, 0), notas: r.notas, fonte: p.fonte || "" }));
    verificarFim(o, eventos, p.fonte ? "Ferimentos (" + p.fonte + ")" : "");
    return ok(eventos, { recebidos: r.valor });
  }

  function curar(o, quanto, fonte) {
    var antes = o.ferimentos;
    o.ferimentos = quanto === "todos" ? 0 : Math.max(0, o.ferimentos - inteiro(quanto, 0));
    var tirou = antes - o.ferimentos;
    registrar(o, "cura", "−" + tirou + " ferimento(s)" + (fonte ? " (" + fonte + ")" : ""));
    return ok([evento("cura", { valor: tirou, motivo: fonte || "" })]);
  }

  /* Esquiva (p. 15): teste de Combate; cada hit tira um hit do
     atacante; quem se esquiva não ataca no próximo turno. */
  function esquivar(o, pedido, rolador) {
    var p = pedido || {};
    if (!ativo(o)) return falha(motivoInativo(o));
    if (o.efeitos.some(function (e) { return e.semEsquiva; }) && !o.itens.some(function (i) { return vestido(i) && i.chave === "elmoCadeira"; })) return falha("Na Cacunda não dá para se esquivar (só com o Elmo-Cadeira).");
    if (o.efeitos.some(function (e) { return e.semAgir; })) return falha("Este goblin não pode agir agora.");
    var m = D().montarParada({ fonte: "Combate", valor: valor(o, "combate") }, dadosDeEfeitos(o).concat(lista(p.extras)), p.dificuldade);
    var r = D().rolar(opcoesDeRolagem(o, { parada: m.parada, composicao: m.composicao, tipo: "esquiva", rotulo: "Esquiva", seZero: p.seZero }), rolador);
    var eventos = [];
    if (r.lacuna) return ok([], { rolagem: r, lacuna: true });
    expirar(o, "proximoTeste", eventos);
    adicionarEfeito(o, { chave: "esquivou", nome: "Esquivou: não ataca no próximo turno", ate: "turnos", turnos: 1, semAtaque: true, fonte: "Esquivar", pagina: 15 }, eventos);
    posRolagem(o, r, eventos);
    registrar(o, "rolagem", "Esquiva: " + r.classificacao.hits + " hit(s)");
    return ok(eventos, { rolagem: r });
  }

  /* Um ataque recebido. pedido:
       acertos          hits do atacante
       distancia        ataque à distância (para a Sorte)
       fogo, armaDeFogo, etereo (ignora proteção), automatico (sem
                        esquiva: dano que não vem de rolagem)
       esquiva          hits da esquiva já rolada (esquivar())
       protecaoId       bloquear com esta proteção vestida
       sorteId          destruir este chapéu/penico (Sorte)
       paraParceiro     ferimentos passados ao parceiro de Cacunda
       fonte            quem atacou */
  function receberAtaque(o, pedido) {
    var p = pedido || {};
    var eventos = [];
    var notas = [];
    var hits = inteiro(p.acertos, 0);
    if (p.sorteId) {
      var s = o.itens.filter(function (i) { return i.id === p.sorteId; })[0];
      var ds = s ? defDoItem(s).protecao : null;
      if (!s || !vestido(s) || !ds || !ds.sorte || ds.uso !== "cabeca") return falha("A Sorte só vale com o item na cabeça.");
      if (!p.distancia) return falha("A Sorte só vale contra ataque à distância.");
      s.destruido = true; s.equipado = false;
      registrar(o, "item", s.nome + " destruído (Sorte): ignorou todo o dano de " + (p.fonte || "um ataque"));
      eventos.push(evento("sorte", { item: s.nome }));
      return ok(eventos, { recebidos: 0, notas: ["Sorte: " + s.nome + " destruído, dano ignorado"] });
    }
    if (p.esquiva !== undefined && p.esquiva !== null) {
      if (p.automatico) return falha("Dano automático não é esquivado.");
      var reduz = Math.min(hits, inteiro(p.esquiva, 0));
      hits -= reduz;
      if (reduz) notas.push("Esquiva: −" + reduz);
    }
    if (p.protecaoId && hits > 0) {
      if (p.etereo) return falha("Ataque etéreo ignora a proteção: não dá para bloquear.");
      var pr = o.itens.filter(function (i) { return i.id === p.protecaoId; })[0];
      if (!pr || !vestido(pr) || !defDoItem(pr).protecao) return falha("Bloqueia só com uma proteção vestida.");
      if (!pr.durabilidade || pr.durabilidade.atual <= 0) return falha(pr.nome + " está com Durabilidade zero e não bloqueia.");
      var abs = Math.min(hits, pr.durabilidade.atual);
      pr.durabilidade.atual -= abs;
      hits -= abs;
      notas.push(pr.nome + " absorveu " + abs + " (Durabilidade " + pr.durabilidade.atual + "/" + pr.durabilidade.original + ")");
      eventos.push(evento("bloqueio", { item: pr.nome, absorveu: abs, durabilidade: pr.durabilidade.atual }));
    }
    if (p.paraParceiro) {
      var passa = Math.min(hits, inteiro(p.paraParceiro, 0));
      hits -= passa;
      if (passa) notas.push("Cacunda: " + passa + " para o parceiro");
    }
    var r = ferimentosQueChegam(o, hits, p);
    o.ferimentos += r.valor;
    notas = notas.concat(r.notas);
    registrar(o, "ataque", "Recebeu " + inteiro(p.acertos, 0) + " hit(s)" + (p.fonte ? " de " + p.fonte : "") + " → " + r.valor + " ferimento(s)" + (notas.length ? " (" + notas.join("; ") + ")" : ""));
    eventos.push(evento("ferimentos", { valor: r.valor, pedido: inteiro(p.acertos, 0), notas: notas, fonte: p.fonte || "" }));
    verificarFim(o, eventos, p.fonte ? "Atacado por " + p.fonte : "");
    return ok(eventos, { recebidos: r.valor, notas: notas });
  }

  /* ---------------------------------------------------------------
     ROLAGENS DO GOBLIN
     --------------------------------------------------------------- */

  function vozAtiva(o) { return o.opcoes.vozGoblin && o.estado.vozGoblin === "ativa"; }

  function opcoesDeRolagem(o, x) {
    return Object.assign({ podeExplodirGoblin: true, vozGoblin: vozAtiva(o), explosoes: o.opcoes.explosoesManuais ? "manual" : "auto" }, x);
  }

  /* Depois de toda rolagem do goblin: explosão de goblin e o evento
     sobrenatural do Cthulin (3 hits em qualquer teste). */
  function posRolagem(o, r, eventos, rolador) {
    var c = r.classificacao;
    if (c.goblinExplode) fim(o, "explodiu", "Todos os dados caíram em 1", eventos);
    if (c.vozSalvou) eventos.push(evento("vozSalvou", {}));
    if (o.opcoes.adaptacoes.cthulin && rolador && c.hits >= 3 && ativo(o)) {
      var s = D().sortear({ id: "eventoSobrenatural", nome: "Evento Sobrenatural", pagina: 32, dados: "1d6", entradas: C().CTHULIN.evento }, rolador);
      eventos.push(evento("sobrenatural", { dados: s.dados, resultado: s.resultado }));
      registrar(o, "cthulin", "Evento sobrenatural: " + s.resultado.texto);
      if (s.resultado.medo) receberMedoInterno(o, s.resultado.medo, "Tentáculos", eventos);
    }
  }

  /* Rolagem com explosões MANUAIS: cada uma, e o fim. A ficha não muda
     até concluir (o goblin só explode com a rolagem fechada). */
  function concluirRolagem(o, r, eventos, rolador) { if (r.concluida) posRolagem(o, r, eventos, rolador); }

  /* A pessoa rolou mais um dado de explosão ("explodir") ou parou
     ("parar"). Fechada a rolagem, valem as consequências. */
  function continuarRolagem(o, r, acao, rolador) {
    if (!r || r.concluida) return falha("A rolagem já terminou.");
    var x = acao === "parar" ? D().recusarExplosoes(r) : D().explodir(r, rolador);
    if (x.ok === false) return falha(x.motivo);
    var eventos = [];
    concluirRolagem(o, r, eventos, rolador);
    return ok(eventos, { rolagem: r });
  }

  /* Teste (p. 14). pedido: { atributo, dificuldade, rotulo, necessarios,
     escalar (Corda e Gancho), extras: [{fonte, valor}], seZero,
     interpretacao: "investigacao" } */
  function montarTeste(o, pedido) {
    var p = pedido || {};
    var at = C().CHAVES_ATRIBUTO.indexOf(p.atributo) >= 0 ? p.atributo : "habilidade";
    var nome = C().ATRIBUTOS.filter(function (a) { return a.chave === at; })[0].nome;
    var parcelas = dadosDeEfeitos(o).concat(lista(p.extras));
    if (p.escalar && at === "habilidade" && o.itens.some(function (i) { return disponivel(i) && i.chave === "cordaEGancho"; })) parcelas.push({ fonte: "Corda e Gancho", valor: 2 });
    var m = D().montarParada({ fonte: nome, valor: valor(o, at) }, parcelas, p.dificuldade);
    return { atributo: at, nomeAtributo: nome, parada: m.parada, composicao: m.composicao };
  }

  function testar(o, pedido, rolador) {
    var p = pedido || {};
    if (!ativo(o)) return falha(motivoInativo(o));
    var m = montarTeste(o, p);
    var r = D().rolar(opcoesDeRolagem(o, { parada: m.parada, composicao: m.composicao, tipo: "teste", rotulo: p.rotulo || "Teste de " + m.nomeAtributo, necessarios: p.necessarios, seZero: p.seZero }), rolador);
    var eventos = [];
    if (r.lacuna) return ok([], { rolagem: r, lacuna: true });
    expirar(o, "proximoTeste", eventos);
    concluirRolagem(o, r, eventos, rolador);
    registrar(o, "rolagem", r.rotulo + ": " + r.classificacao.hits + " hit(s) — " + (r.classificacao.rotuloNecessarios || r.classificacao.rotulo));
    var extra = { rolagem: r, atributo: m.atributo };
    if (p.interpretacao === "investigacao") extra.investigacao = C().CTHULIN.investigacao[r.classificacao.nivel];
    /* "Mas deu ruim…" fica oferecido (a regra diz "se estiver sem
       ideia"): a tela mostra o botão. */
    extra.podeDeuRuim = o.opcoes.deuRuim && m.atributo === "habilidade" && r.classificacao.hits === 1;
    return ok(eventos, extra);
  }

  function deuRuim(o, rolador) {
    if (!o.opcoes.deuRuim) return falha("A regra opcional “Mas deu ruim…” está desligada.");
    var s = D().sortear({ id: "deuRuim", nome: "Mas deu ruim…", pagina: 16, dados: "1d6", entradas: C().DEU_RUIM_D6 }, rolador);
    registrar(o, "sorteio", "Mas deu ruim…: " + s.resultado);
    return ok([evento("sorteio", { nome: s.nome, resultado: s.resultado, dados: s.dados })], { sorteio: s });
  }

  /* ---------------------------------------------------------------
     ATAQUE
     --------------------------------------------------------------- */

  /* pedido:
       armaId        "" = desarmado (só Combate)
       modo          "corporal" | "distancia" | "arremesso"
       dificuldade
       alvo          { nome, especie, goblin, humano, praga } — o que
                     liga Inimigo, Adaga Matadora, Martelo, Matador de
                     Pragas, Pendurar
       furtivo       o alvo não sabe onde você está (Ataque Furtivo)
       brutal        Ataque Brutal · tiroCerteiro  Tiro Certeiro
       duasArmas     −1 dado (manobra)
       cacunda       você é o de cima (+1 dado)
       giratorio     o ataque extra do Ataque Giratório
       extras        [{ fonte, valor }] */
  function montarAtaque(o, pedido) {
    var p = pedido || {};
    var avisos = [];
    if (!ativo(o)) return { ok: false, motivo: motivoInativo(o) };
    if (o.efeitos.some(function (e) { return e.semAgir; })) return { ok: false, motivo: "Este goblin não pode agir neste turno." };
    var sem = o.efeitos.filter(function (e) { return e.semAtaque; })[0];
    if (sem && !p.giratorio) return { ok: false, motivo: sem.nome + "." };
    var arma = null, def = null;
    if (p.armaId) {
      arma = o.itens.filter(function (i) { return i.id === p.armaId; })[0];
      if (!arma) return { ok: false, motivo: "Arma não encontrada." };
      if (!disponivel(arma)) return { ok: false, motivo: arma.nome + " não existe mais (destruída ou gasta)." };
      if (arma.arremessado) return { ok: false, motivo: arma.nome + " foi arremessada: pegue de volta primeiro." };
      def = defDoItem(arma).arma;
      if (!def) return { ok: false, motivo: arma.nome + " não é uma arma." };
      if (!arma.equipado) return { ok: false, motivo: "Empunhe " + arma.nome + " antes de atacar." };
    }
    var modo = p.modo || (def ? def.ataque : "corporal");
    if (def) {
      if (modo === "arremesso" && !def.arremesso) return { ok: false, motivo: arma.nome + " não é de arremesso." };
      if (modo === "corporal" && def.ataque !== "corporal") return { ok: false, motivo: arma.nome + " é de distância." };
      if (modo === "distancia" && def.ataque !== "distancia") return { ok: false, motivo: arma.nome + " é corporal (arremessar, se der)." };
      if (arma.municao && arma.municao.atual <= 0) return { ok: false, motivo: arma.nome + " está sem munição." };
      if (arma.precisaRecarregar) return { ok: false, motivo: arma.nome + " precisa ser recarregada (gasta um turno)." };
    }
    var distancia = modo !== "corporal";
    if (p.brutal) {
      if (!temTecnica(o, "ataqueBrutal")) return { ok: false, motivo: "Sem a técnica Ataque Brutal." };
      if (usoDiario(o, "ataqueBrutal")) return { ok: false, motivo: "Ataque Brutal já foi usado hoje." };
      if (distancia) return { ok: false, motivo: "Ataque Brutal é um ataque corporal." };
    }
    if (p.tiroCerteiro) {
      if (!temTecnica(o, "tiroCerteiro")) return { ok: false, motivo: "Sem a técnica Tiro Certeiro." };
      if (usoDiario(o, "tiroCerteiro")) return { ok: false, motivo: "Tiro Certeiro já foi usado hoje." };
      if (!distancia) return { ok: false, motivo: "Tiro Certeiro é um ataque à distância." };
    }
    var alvo = objeto(p.alvo);
    var parcelas = [];
    if (def && def.bonus) parcelas.push({ fonte: arma.nome, valor: def.bonus });
    var chaveBase = arma ? (C().ITENS_MAGICOS[arma.chave] && C().ITENS_MAGICOS[arma.chave].base) || arma.chave : "";
    if (arma && temTecnica(o, "mestreDeArmas") && o.escolhas.armaFavorita && chaveBase === o.escolhas.armaFavorita) parcelas.push({ fonte: "Mestre de Armas", valor: 1 });
    if (temTecnica(o, "inimigo") && o.escolhas.especieInimiga && alvo.especie && normalizarTexto(alvo.especie) === normalizarTexto(o.escolhas.especieInimiga)) parcelas.push({ fonte: "Inimigo (" + o.escolhas.especieInimiga + ")", valor: 1 });
    var escondido = temEfeito(o, "escondido");
    if ((p.furtivo || escondido) && temTecnica(o, "ataqueFurtivo")) parcelas.push({ fonte: "Ataque Furtivo", valor: 2 });
    if (arma && C().ITENS_MAGICOS[arma.chave] && C().ITENS_MAGICOS[arma.chave].contraGoblin && alvo.goblin) parcelas.push({ fonte: arma.nome + " (alvo goblin)", valor: C().ITENS_MAGICOS[arma.chave].contraGoblin });
    if (alvo.praga && temTecnica(o, "matadorDePragas")) parcelas.push({ fonte: "Matador de Pragas", valor: 1 });
    var pendurado = o.efeitos.filter(function (e) { return e.chave === "pendurado"; })[0];
    if (pendurado && (!pendurado.alvo || !alvo.nome || normalizarTexto(pendurado.alvo) === normalizarTexto(alvo.nome))) parcelas.push({ fonte: "Pendurado no inimigo", valor: 1 });
    if (p.cacunda || temEfeito(o, "cacundaEmCima")) parcelas.push({ fonte: "Cacunda (em cima)", valor: 1 });
    if (p.duasArmas) parcelas.push({ fonte: "Duas armas", valor: -1 });
    o.efeitos.forEach(function (e) { if (e.ataque) parcelas.push({ fonte: e.nome, valor: e.ataque }); });
    parcelas = parcelas.concat(dadosDeEfeitos(o)).concat(lista(p.extras));
    var dobro = p.brutal ? "Ataque Brutal (dobro)" : p.tiroCerteiro ? "Tiro Certeiro (dobro)" : "";
    var m = D().montarParada({ fonte: "Combate", valor: valor(o, "combate") }, parcelas, p.dificuldade, { dobrar: dobro });
    if (o.efeitos.some(function (e) { return e.chave === "bracoCongelado"; }) && def && def.maos === 2) avisos.push("Um braço está congelado: arma de duas mãos?");
    return {
      ok: true, parada: m.parada, composicao: m.composicao, arma: arma, def: def, modo: modo, distancia: distancia, avisos: avisos,
      fogo: !!(def && def.ataqueDeFogo), armaDeFogo: !!(def && def.fogo && !p.arremessar),
      automatico: arma && C().ITENS_MAGICOS[arma.chave] && C().ITENS_MAGICOS[arma.chave].automaticoNaoHumano && alvo.humano === false ? C().ITENS_MAGICOS[arma.chave].automaticoNaoHumano : 0,
    };
  }

  function atacar(o, pedido, rolador) {
    var p = pedido || {};
    var m = montarAtaque(o, p);
    if (!m.ok) return falha(m.motivo);
    var r = D().rolar(opcoesDeRolagem(o, { parada: m.parada, composicao: m.composicao, tipo: "ataque", rotulo: (p.brutal ? "Ataque Brutal" : p.tiroCerteiro ? "Tiro Certeiro" : p.giratorio ? "Ataque Giratório" : "Ataque") + (m.arma ? " · " + m.arma.nome : " desarmado") + (p.alvo && p.alvo.nome ? " → " + p.alvo.nome : ""), seZero: p.seZero }), rolador);
    var eventos = [];
    if (r.lacuna) return ok([], { rolagem: r, lacuna: true });
    var arma = m.arma;
    if (arma) {
      if (arma.municao) arma.municao.atual = Math.max(0, arma.municao.atual - 1);
      if (m.def.recarga) arma.precisaRecarregar = true;
      if (m.modo === "arremesso") { arma.arremessado = true; arma.equipado = false; }
    }
    if (p.brutal) o.marcas.dia["tecnica:ataqueBrutal"] = true;
    if (p.tiroCerteiro) o.marcas.dia["tecnica:tiroCerteiro"] = true;
    expirar(o, "proximoAtaque", eventos);
    /* Atacar faz barulho: o Esconder acaba. */
    if (temEfeito(o, "escondido")) { o.efeitos = o.efeitos.filter(function (e) { return e.chave !== "escondido"; }); eventos.push(evento("efeitoExpirou", { nome: "Escondido" })); }
    concluirRolagem(o, r, eventos, rolador);
    var ferimentos = r.classificacao.hits + (m.automatico || 0);
    var notas = [];
    if (m.automatico) notas.push("+" + m.automatico + " automático (alvo não humano)");
    if (arma && arma.municao) notas.push("Munição: " + arma.municao.atual + "/" + arma.municao.max);
    if (arma && arma.precisaRecarregar) notas.push("Precisa recarregar (um turno)");
    if (m.modo === "arremesso") notas.push(arma.nome + " ficou onde caiu");
    registrar(o, "ataque", r.rotulo + ": " + ferimentos + " ferimento(s)");
    return ok(eventos, {
      rolagem: r, ferimentos: ferimentos, notas: notas, fogo: m.fogo, armaDeFogo: m.armaDeFogo, distancia: m.distancia,
      giratorio: !p.giratorio && m.modo === "corporal" && !!arma && ferimentos > 0 && temTecnica(o, "ataqueGiratorio"),
    });
  }

  function recarregar(o, armaId) {
    var a = o.itens.filter(function (i) { return i.id === armaId; })[0];
    if (!a || !disponivel(a)) return falha("Arma não encontrada.");
    if (!a.precisaRecarregar) return falha(a.nome + " não precisa recarregar.");
    if (a.municao && a.municao.atual <= 0) return falha(a.nome + " está sem munição: recarregar não adianta.");
    a.precisaRecarregar = false;
    o.marcas.turno.recarregou = true;
    registrar(o, "item", "Recarregou " + a.nome + " (gastou o turno)");
    return ok([evento("recarga", { item: a.nome })]);
  }

  function reabastecer(o, armaId, quanto) {
    var a = o.itens.filter(function (i) { return i.id === armaId; })[0];
    if (!a || !disponivel(a) || !a.municao) return falha("Esta arma não usa munição.");
    var antes = a.municao.atual;
    a.municao.atual = quanto === undefined || quanto === null ? a.municao.max : Math.max(0, Math.min(a.municao.max, a.municao.atual + inteiro(quanto, 0)));
    registrar(o, "item", a.nome + ": munição " + antes + " → " + a.municao.atual);
    return ok([evento("municao", { item: a.nome, atual: a.municao.atual })]);
  }

  function pegarDeVolta(o, id) {
    var a = o.itens.filter(function (i) { return i.id === id; })[0];
    if (!a || !a.arremessado) return falha("Nada a pegar de volta.");
    a.arremessado = false;
    registrar(o, "item", "Pegou " + a.nome + " de volta");
    return ok();
  }

  /* ---------------------------------------------------------------
     MAGIA
     --------------------------------------------------------------- */

  /* As magias que este goblin conjura e de onde: { magia, fonte, item }. */
  function magiasDisponiveis(o) {
    var r = [];
    if (temTecnica(o, "magias")) o.escolhas.magias.forEach(function (m) { r.push({ magia: m, fonte: "tecnica", rotulo: "Bruxo" }); });
    o.itens.forEach(function (i) {
      if (!disponivel(i)) return;
      if (i.chave === "necronomicon") r.push({ magia: "morte", fonte: i.id, rotulo: "Necronomicon" });
      if (i.chave === "livroEstranho" && i.magico.lido && i.magico.magia) r.push({ magia: i.magico.magia, fonte: i.id, rotulo: i.nome });
      if (i.chave === "livroEspecial" && i.magico.magia && o.opcoes.adaptacoes.cthulin) r.push({ magia: i.magico.magia, fonte: i.id, rotulo: i.nome });
    });
    return r;
  }

  /* pedido: { magia, fonte, condutorId, ciranda (amigos na roda),
     dificuldade, implacavel (0..3: escolhe sem rolar), horror,
     extras, seZero } */
  function montarConjuracao(o, pedido) {
    var p = pedido || {};
    var def = C().MAGIAS[p.magia];
    if (!def) return { ok: false, motivo: "Magia desconhecida." };
    if (!ativo(o)) return { ok: false, motivo: motivoInativo(o) };
    if (o.efeitos.some(function (e) { return e.semAgir; })) return { ok: false, motivo: "Este goblin não pode agir neste turno." };
    var fonte = magiasDisponiveis(o).filter(function (x) { return x.magia === p.magia && (!p.fonte || x.fonte === p.fonte); })[0];
    if (!fonte) return { ok: false, motivo: "Só o Bruxo conjura (ou quem tem o livro certo)." };
    var parcelas = [];
    if (p.condutorId) {
      var c = o.itens.filter(function (i) { return i.id === p.condutorId; })[0];
      var dc = c ? defDoItem(c).arma : null;
      if (!c || !vestido(c) || !dc || !(dc.condutor || dc.varinha)) return { ok: false, motivo: "Escolha um Condutor Mágico empunhado." };
      if (temTecnica(o, "condutorMagico")) parcelas.push({ fonte: "Condutor Mágico (" + c.nome + ")", valor: 1 });
    }
    var arcano = o.itens.filter(function (i) { var d = vestido(i) ? defDoItem(i).protecao : null; return d && d.arcano; })[0];
    if (arcano) parcelas.push({ fonte: "Arcano (" + arcano.nome + ")", valor: 1 });
    var roda = inteiro(p.ciranda, 0);
    if (roda >= 2) parcelas.push({ fonte: "Ciranda Mágica (" + roda + ")", valor: roda });
    if (p.magia === "invocacao" && p.horror && C().INIMIGOS[p.horror] && C().INIMIGOS[p.horror].invocacao) parcelas.push({ fonte: "Invocar " + C().INIMIGOS[p.horror].nome, valor: C().INIMIGOS[p.horror].invocacao });
    parcelas = parcelas.concat(dadosDeEfeitos(o)).concat(lista(p.extras));
    var m = D().montarParada({ fonte: "Noção", valor: valor(o, "nocao") }, parcelas, p.dificuldade);
    return { ok: true, def: def, fonte: fonte, parada: m.parada, composicao: m.composicao };
  }

  function conjurar(o, pedido, rolador) {
    var p = pedido || {};
    var m = montarConjuracao(o, p);
    if (!m.ok) return falha(m.motivo);
    var eventos = [];
    var r, resultado;
    if (p.implacavel !== undefined && p.implacavel !== null && p.implacavel !== "") {
      if (!temTecnica(o, "implacavel")) return falha("Sem a técnica Implacável.");
      if (usoDiario(o, "implacavel")) return falha("Implacável já foi usado hoje.");
      resultado = Math.max(0, Math.min(3, inteiro(p.implacavel, 0)));
      o.marcas.dia["tecnica:implacavel"] = true;
      r = null;
    } else {
      r = D().rolar(opcoesDeRolagem(o, { parada: m.parada, composicao: m.composicao, tipo: "conjurar", rotulo: "Magia: " + m.def.nome, seZero: p.seZero }), rolador);
      if (r.lacuna) return ok([], { rolagem: r, lacuna: true });
      expirar(o, "proximoTeste", eventos);
      concluirRolagem(o, r, eventos, rolador);
      resultado = r.classificacao.resultado;
    }
    var res = m.def.resultados[resultado];
    var aplicado = [];
    if (ativo(o) && res.proprio) {
      var pr = res.proprio;
      if (pr.ferimentos) { var s = sofrer(o, { ferimentos: pr.ferimentos, fogo: pr.fogo, fonte: m.def.nome }); eventos = eventos.concat(s.eventos); aplicado.push(s.recebidos + " ferimento(s) em você"); }
      if (pr.efeito) { adicionarEfeito(o, Object.assign({ fonte: m.def.nome, pagina: m.def.pagina }, pr.efeito), eventos); aplicado.push(pr.efeito.nome); }
      if (pr.curar) { eventos = eventos.concat(curar(o, pr.curar, m.def.nome).eventos); aplicado.push("Seus ferimentos foram removidos"); }
      if (pr.permanente) {
        Object.keys(pr.permanente).forEach(function (a) { o.ajustes.push({ id: novoId("aj"), atributo: a, valor: pr.permanente[a], motivo: "Magia " + m.def.nome + " (0 hits)", pagina: m.def.pagina, dia: o.tempo.dia }); });
        aplicado.push("Permanente: " + Object.keys(pr.permanente).map(function (a) { return C().ATRIBUTOS.filter(function (x) { return x.chave === a; })[0].nome + " " + pr.permanente[a]; }).join(", "));
        verificarFim(o, eventos, "Magia " + m.def.nome);
      }
      if (pr.marca && o.estado.marcas.indexOf(pr.marca) < 0) o.estado.marcas.push(pr.marca);
      if (pr.medo) { receberMedoInterno(o, pr.medo, m.def.nome, eventos); aplicado.push("+" + pr.medo + " Medo"); }
      verificarFim(o, eventos, "Magia " + m.def.nome);
    }
    registrar(o, "magia", m.def.nome + ": resultado " + (resultado === 3 ? "3+" : resultado) + (r ? " (" + r.classificacao.hits + " hit(s))" : " (Implacável)") + " — " + res.texto);
    eventos.push(evento("magia", { magia: p.magia, resultado: resultado }));
    return ok(eventos, { rolagem: r, resultado: resultado, efeito: copiar(res), aplicado: aplicado, magia: p.magia, nome: m.def.nome, pagina: m.def.pagina });
  }

  /* ---------------------------------------------------------------
     TÉCNICAS DE USO DECLARADO
     --------------------------------------------------------------- */

  function usarTecnica(o, chave, opcoes, rolador) {
    var op = opcoes || {};
    if (!ativo(o)) return falha(motivoInativo(o));
    if (!temTecnica(o, chave)) return falha("Este goblin não tem essa técnica.");
    var t = C().tecnica(chave);
    if (t.uso === "dia" && usoDiario(o, chave)) return falha(t.nome + " já foi usada hoje.");
    var eventos = [];
    if (chave === "gritoDeGuerra") {
      var tr = testar(o, { atributo: "nocao", rotulo: "Grito de Guerra", dificuldade: op.dificuldade, seZero: op.seZero }, rolador);
      if (!tr.ok || tr.lacuna) return tr;
      o.marcas.dia["tecnica:gritoDeGuerra"] = true;
      var deu = tr.rolagem.classificacao.hits >= 1;
      registrar(o, "tecnica", "Grito de Guerra: " + (deu ? "aliados com Combate +1 até o fim da batalha" : "ninguém se animou"));
      return ok(tr.eventos.concat([evento("tecnica", { chave: chave, sucesso: deu })]), {
        rolagem: tr.rolagem,
        paraAliados: deu ? { chave: "gritoDeGuerra", nome: "Grito de Guerra: Combate +1", ate: "fimDaBatalha", mods: { combate: 1 }, fonte: "Grito de Guerra", pagina: 9 } : null,
      });
    }
    if (chave === "humilhacao") {
      o.marcas.dia["tecnica:humilhacao"] = true;
      registrar(o, "tecnica", "Humilhação" + (op.alvo ? " em " + op.alvo : ""));
      return ok([evento("tecnica", { chave: chave })], { paraAliado: { curar: "todos", fonte: "Humilhação" } });
    }
    if (chave === "esconder") {
      o.marcas.dia["tecnica:esconder"] = true;
      adicionarEfeito(o, { chave: "escondido", nome: "Escondido (até se mexer ou fazer barulho)", ate: "manual", fonte: "Esconder", pagina: 8 }, eventos);
      registrar(o, "tecnica", "Escondeu-se sem teste");
      return ok(eventos);
    }
    if (chave === "delirio") {
      if (!op.confirmado) return falha("Delírio só vale se você explodiu ou queimou completamente uma casa ou algo maior.");
      var c = curar(o, "todos", "Delírio");
      registrar(o, "tecnica", "Delírio: " + (op.oque || "uma casa ou algo maior") + " foi pelos ares");
      return ok(c.eventos.concat([evento("tecnica", { chave: chave })]));
    }
    if (chave === "roubar") {
      var rr = testar(o, { atributo: "habilidade", rotulo: "Roubar" + (op.alvo ? " de " + op.alvo : ""), dificuldade: op.dificuldade, necessarios: 1, seZero: op.seZero }, rolador);
      return rr;
    }
    if (chave === "rastrear") {
      registrar(o, "tecnica", "Rastrear" + (op.alvo ? ": " + op.alvo : ""));
      return ok([evento("tecnica", { chave: chave })]);
    }
    return falha("Esta técnica se usa na ação dela (ataque, magia) ou é sempre ativa.");
  }

  /* Efeito que um aliado manda (Grito de Guerra, Gelo, Planta…). */
  function receberEfeito(o, def) {
    var eventos = [];
    adicionarEfeito(o, def, eventos);
    registrar(o, "efeito", (def.nome || "Efeito") + (def.fonte ? " (de " + def.fonte + ")" : ""));
    return ok(eventos);
  }

  /* ---------------------------------------------------------------
     PROGRESSÃO (p. 5 e 16)
     --------------------------------------------------------------- */

  function ocupacaoEmProgresso(o) {
    if (o.epicas.length) return o.epicas[o.epicas.length - 1];
    return null;
  }

  function derrotouOponente(o, opcoes, rolador) {
    var op = opcoes || {};
    if (!ativo(o)) return falha(motivoInativo(o));
    if (o.estado.pendenteEpico) return falha("Escolha a ocupação épica antes (ou recuse).");
    var ep = ocupacaoEmProgresso(o);
    var nivelAtual = ep ? ep.nivel : o.nivel;
    if (nivelAtual >= 4) return falha("Já está no nível 4 desta ocupação.");
    var f = D().quantidade("1d6", rolador);
    var eventos = [evento("progressao", { dados: f.dados, subiu: f.total === 6, oponente: op.oponente || "" })];
    registrar(o, "nivel", "Derrotou " + (op.oponente || "um oponente") + ": rolou " + f.total + (f.total === 6 ? " — subiu de nível!" : ""));
    if (f.total !== 6) return ok(eventos, { dados: f.dados, subiu: false });
    if (ep) ep.nivel++; else o.nivel++;
    var novo = ep ? ep.nivel : o.nivel;
    var ocup = ep ? ep.ocupacao : o.ocupacao;
    var tec = C().OCUPACOES[ocup].tecnicas.filter(function (t) { return t.nivel === novo; })[0];
    eventos.push(evento("nivel", { nivel: novo, ocupacao: ocup, tecnica: tec ? tec.nome : "" }));
    registrar(o, "nivel", "Nível " + novo + " de " + nomeDaOcupacao(o, ocup) + (tec ? ": " + tec.nome : ""));
    if (novo >= 4) {
      if (o.opcoes.niveisEpicos && ocupacoesLivres(o).length) {
        o.estado.pendenteEpico = true;
        eventos.push(evento("epicoPendente", {}));
      } else {
        fim(o, "explodiuDeAlegria", "Chegou ao nível 4", eventos);
      }
    }
    return ok(eventos, { dados: f.dados, subiu: true, nivel: novo });
  }

  function ocupacoesLivres(o) {
    var usadas = ocupacoesDe(o).map(function (x) { return x.ocupacao; });
    return Object.keys(C().OCUPACOES).filter(function (k) {
      var d = C().OCUPACOES[k];
      if (usadas.indexOf(k) >= 0) return false;
      return !d.adaptacao || o.opcoes.adaptacoes[d.adaptacao];
    });
  }

  /* Níveis Épicos: "se os outros jogadores realmente acreditarem" —
     `acreditaram: false` aplica a regra básica (explode de alegria). */
  function escolherOcupacaoEpica(o, chave, acreditaram) {
    if (!o.estado.pendenteEpico) return falha("Não há nível épico a escolher.");
    var eventos = [];
    o.estado.pendenteEpico = false;
    if (acreditaram === false) { fim(o, "explodiuDeAlegria", "Chegou ao nível 4 (ninguém acreditou)", eventos); return ok(eventos); }
    if (ocupacoesLivres(o).indexOf(chave) < 0) { o.estado.pendenteEpico = true; return falha("Escolha outra ocupação."); }
    o.epicas.push({ ocupacao: chave, nivel: 1 });
    registrar(o, "nivel", "Nível épico: começou " + nomeDaOcupacao(o, chave) + " no nível 1");
    eventos.push(evento("epico", { ocupacao: chave }));
    return ok(eventos);
  }

  /* ---------------------------------------------------------------
     ITENS
     --------------------------------------------------------------- */

  /* Novo item a partir do catálogo (com munição e durabilidade
     cheias) ou personalizado ({ nome, categoria, personalizado }). */
  function novoItem(chave, extra) {
    var x = extra || {};
    var cat = C().itemDoCatalogo(chave);
    var i = normalizarItem({ chave: cat ? chave : "", categoria: cat ? cat.categoria : (x.categoria || "outro"), nome: x.nome || (cat ? cat.def.nome : "Item"), nota: x.nota || "", personalizado: x.personalizado || null, magico: x.magico || {} });
    var d = defDoItem(i);
    if (d.arma && d.arma.municao) i.municao = { atual: d.arma.municao, max: d.arma.municao };
    if (d.protecao) {
      var dur = d.protecao.durabilidade || 0;
      if (cat && cat.def.protecao && cat.def.protecao.durabilidadePar && x.par !== false) { dur = cat.def.protecao.durabilidadePar; i.magico.par = true; }
      i.durabilidade = { atual: dur, original: dur };
    }
    return i;
  }

  function adicionarItem(o, chave, extra, rolador) {
    var i = novoItem(chave, extra);
    var eventos = [];
    /* Poção: a cor é rolada quando se acha (p. 27). */
    if (i.chave === "pocao" && !i.magico.cor && rolador) {
      var s = D().sortear({ id: "pocao", nome: "Cor da Poção", pagina: 27, dados: "1d6", entradas: C().POCAO_D6 }, rolador);
      i.magico.cor = s.indice;
      i.nome = "Poção " + s.resultado.cor;
      eventos.push(evento("sorteio", { nome: s.nome, dados: s.dados, resultado: s.resultado.cor }));
    }
    if (i.chave === "banquete" && rolador) {
      var q = D().quantidade("1d6", rolador);
      i.magico.dias = q.total;
      i.nota = (i.nota ? i.nota + " " : "") + "Comida para " + q.total + " dia(s).";
      eventos.push(evento("quantidade", { nome: "Banquete", dados: q.dados, total: q.total }));
    }
    o.itens.push(i);
    registrar(o, "item", "Ganhou " + i.nome);
    return ok(eventos, { item: i });
  }

  /* Restrições de característica (p. 6): Cabeção e Minicabeça não usam
     elmos (Cabeção, nem bonés); Pés gigantes, nenhum calçado. */
  function restricaoDeUso(o, i) {
    var d = defDoItem(i).protecao;
    if (!d) return "";
    var tem = function (k) { return o.caracteristicas.some(function (c) { return c.chave === k; }); };
    if (d.elmo && (tem("cabecao") || tem("minicabeca"))) return (tem("cabecao") ? "Cabeção" : "Minicabeça") + " não pode usar elmos (p. 6).";
    if (d.calcado && tem("pesGigantes")) return "Pés gigantes não usa calçado nenhum (p. 6).";
    return "";
  }

  function equipar(o, id, equipado, rolador) {
    var i = o.itens.filter(function (x) { return x.id === id; })[0];
    if (!i) return falha("Item não encontrado.");
    if (!disponivel(i)) return falha(i.nome + " não existe mais.");
    var eventos = [];
    var avisos = [];
    if (equipado) {
      var r = restricaoDeUso(o, i);
      if (r) return falha(r);
      if (i.arremessado) return falha("Pegue " + i.nome + " de volta primeiro.");
      var d = defDoItem(i);
      var maos = function (x) { var dd = defDoItem(x); return dd.arma ? dd.arma.maos : dd.protecao && dd.protecao.uso === "umaMao" ? 1 : 0; };
      var ocupadas = o.itens.filter(function (x) { return x.id !== i.id && vestido(x); }).reduce(function (s, x) { return s + maos(x); }, 0);
      if (ocupadas + maos(i) > 2) avisos.push("Mais de duas mãos ocupadas.");
      if (d.protecao && d.protecao.uso !== "umaMao") {
        var mesmo = o.itens.filter(function (x) { return x.id !== i.id && vestido(x) && defDoItem(x).protecao && defDoItem(x).protecao.uso === d.protecao.uso; });
        if (mesmo.length) avisos.push("Já há algo em " + (C().USOS_DE_PROTECAO[d.protecao.uso] || d.protecao.uso) + ": " + mesmo.map(function (x) { return x.nome; }).join(", ") + ".");
      }
    }
    i.equipado = !!equipado;
    /* O efeito do anel acaba ao tirar; colocar rola de novo (p. 25). */
    o.efeitos = o.efeitos.filter(function (e) { return !(e.item === i.id && !i.equipado); });
    if (i.chave === "anelMagico" && i.equipado && rolador) {
      var s = D().sortear({ id: "anel", nome: "Efeito do Anel Mágico", pagina: 25, dados: "1d6", entradas: C().ANEL_D6 }, rolador);
      i.magico.anel = s.indice;
      adicionarEfeito(o, Object.assign({ item: i.id, fonte: "Anel Mágico", pagina: 25 }, s.resultado.efeito), eventos);
      eventos.push(evento("sorteio", { nome: s.nome, dados: s.dados, resultado: s.resultado.texto }));
    }
    registrar(o, "item", (i.equipado ? "Equipou " : "Guardou ") + i.nome);
    return ok(eventos, { avisos: avisos });
  }

  function removerItem(o, id, motivo) {
    var i = o.itens.filter(function (x) { return x.id === id; })[0];
    if (!i) return falha("Item não encontrado.");
    o.itens = o.itens.filter(function (x) { return x.id !== id; });
    o.efeitos = o.efeitos.filter(function (e) { return e.item !== id; });
    registrar(o, "item", "Perdeu " + i.nome + (motivo ? " (" + motivo + ")" : ""));
    return ok();
  }

  function marcarDestruido(o, id, destruido) {
    var i = o.itens.filter(function (x) { return x.id === id; })[0];
    if (!i) return falha("Item não encontrado.");
    i.destruido = !!destruido;
    if (i.destruido) i.equipado = false;
    registrar(o, "item", i.nome + (i.destruido ? " destruído" : " recuperado"));
    return ok();
  }

  function consumir(o, i) { i.consumido = true; i.equipado = false; o.efeitos = o.efeitos.filter(function (e) { return e.item !== i.id; }); }

  /* As ações dos itens (p. 13, 24–27). acao: a do catálogo; opcoes
     conforme o item. Devolve, quando o efeito é em OUTROS, `area`
     (explosões) ou `alvo` para a mesa aplicar. */
  function usarItem(o, id, acao, opcoes, rolador) {
    var op = opcoes || {};
    var i = o.itens.filter(function (x) { return x.id === id; })[0];
    if (!i || !disponivel(i)) return falha("Item não encontrado.");
    if (!ativo(o) && ["livroEspecial"].indexOf(i.chave) < 0) return falha(motivoInativo(o));
    var eventos = [];
    switch (i.chave) {
      case "pocao": {
        var cor = i.magico.cor;
        if (!cor) { var s0 = D().sortear({ id: "pocao", nome: "Cor da Poção", pagina: 27, dados: "1d6", entradas: C().POCAO_D6 }, rolador); cor = s0.indice; i.magico.cor = cor; }
        var p = C().POCAO_D6[cor - 1];
        consumir(o, i);
        registrar(o, "item", "Bebeu a poção " + p.cor + ": " + p.texto);
        eventos.push(evento("pocao", { cor: p.cor, texto: p.texto }));
        if (p.explode) fim(o, "explodiu", "Bebeu a poção amarela", eventos);
        if (p.efeito) adicionarEfeito(o, Object.assign({ fonte: "Poção " + p.cor, pagina: 27 }, p.efeito), eventos);
        if (p.curar) eventos = eventos.concat(curar(o, "todos", "Poção azul").eventos);
        if (p.atributo) {
          if (C().CHAVES_ATRIBUTO.indexOf(op.atributo) < 0) { i.consumido = false; return falha("Escolha o atributo que a poção verde aumenta."); }
          o.ajustes.push({ id: novoId("aj"), atributo: op.atributo, valor: 1, motivo: "Poção verde", pagina: 27, dia: o.tempo.dia });
        }
        return ok(eventos, { pocao: p });
      }
      case "macaCheirosa":
        consumir(o, i);
        eventos = curar(o, "todos", "Maçã Cheirosa").eventos;
        return ok(eventos);
      case "macaMalcheirosa":
        consumir(o, i);
        registrar(o, "item", "Arremessou a Maçã Malcheirosa");
        return ok([evento("explosaoDeArea", { item: i.nome, aneis: [{ alcance: "em volta", ferimentos: 1 }], pagina: 26 })], { area: [{ alcance: "em volta", ferimentos: 1 }] });
      case "barrilDePolvora":
        if (acao === "municao") {
          var alvos = lista(op.armas).slice(0, 3);
          var feitas = [];
          alvos.forEach(function (aid) {
            var a = o.itens.filter(function (x) { return x.id === aid; })[0];
            if (a && disponivel(a) && a.municao && defDoItem(a).arma && defDoItem(a).arma.fogo) { a.municao.atual = a.municao.max; feitas.push(a.nome); }
          });
          if (!feitas.length) return falha("Escolha até 3 armas de fogo com munição.");
          consumir(o, i);
          registrar(o, "item", "Barril de Pólvora: completou a munição de " + feitas.join(", "));
          return ok([evento("municao", { item: feitas.join(", ") })]);
        }
        consumir(o, i);
        registrar(o, "item", "Acendeu o Barril de Pólvora");
        return ok([evento("explosaoDeArea", { item: i.nome, aneis: [{ alcance: "em volta", ferimentos: 4 }, { alcance: "até 5 m", ferimentos: 2 }], pagina: 13 })], { area: [{ alcance: "em volta", ferimentos: 4 }, { alcance: "até 5 m", ferimentos: 2 }] });
      case "galinhaExplosiva":
        if (i.aceso) return falha("A galinha já está andando por aí.");
        i.aceso = { turnos: 2 };
        i.equipado = false;
        registrar(o, "item", (acao === "arremessar" ? "Arremessou" : "Soltou") + " a Galinha Explosiva: explode em dois turnos");
        return ok([evento("acesa", { item: i.nome, turnos: 2 })]);
      case "veneno":
        consumir(o, i);
        registrar(o, "item", "Pôs veneno na bebida" + (op.alvo ? " de " + op.alvo : ""));
        return ok([evento("veneno", { alvo: op.alvo || "" })], { alvo: { efeito: { chave: "veneno", nome: "Envenenado: 1 ferimento por minuto", ate: "manual", porMinuto: 1, fonte: "Veneno", pagina: 13 } } });
      case "aljava": {
        var arco = o.itens.filter(function (x) { return x.id === op.armaId; })[0];
        var da = arco ? defDoItem(arco).arma : null;
        if (!arco || !da || !da.arco || !arco.municao) return falha("A Aljava serve num arco ou besta.");
        if (i.magico.vinculada) return falha("Esta Aljava já está em uso.");
        var base = da.municao;
        arco.municao.max = base * 2;
        arco.municao.atual = Math.min(arco.municao.max, arco.municao.atual + base);
        i.magico.vinculada = arco.id;
        registrar(o, "item", "Aljava em " + arco.nome + ": munição " + arco.municao.atual + "/" + arco.municao.max);
        return ok([evento("municao", { item: arco.nome, atual: arco.municao.atual })]);
      }
      case "livroEstranho": {
        if (i.magico.lido) return falha("Já foi lido.");
        var t = testar(o, { atributo: "nocao", rotulo: "Ler o Livro Estranho", necessarios: 2, dificuldade: op.dificuldade, seZero: op.seZero }, rolador);
        if (!t.ok || t.lacuna) return t;
        var extra = { rolagem: t.rolagem };
        if (t.rolagem.classificacao.sucesso) {
          i.magico.lido = true;
          var ch = D().chance("1em6", rolador);
          extra.chance = ch;
          if (ch.saiu) {
            var sm = D().sortear({ id: "magiaDoLivro", nome: "Magia do livro", pagina: 13, dados: "d7", entradas: C().MAGIAS_DO_BRUXO }, rolador);
            i.magico.magia = sm.resultado;
            i.nome = "Livro de Magia (" + C().MAGIAS[sm.resultado].nome + ")";
            extra.magia = sm.resultado;
            registrar(o, "item", "O Livro Estranho é um livro de magia: " + C().MAGIAS[sm.resultado].nome);
          } else {
            i.magico.semMagia = true;
            registrar(o, "item", "Leu o Livro Estranho: não é de magia");
          }
        }
        return ok(t.eventos, extra);
      }
      case "livroEspecial":
        if (acao === "queimar") {
          consumir(o, i);
          var antes = o.adaptacoes.cthulin.medo;
          o.adaptacoes.cthulin.medo = 0;
          registrar(o, "cthulin", "Queimou um Livro Especial: Medo " + antes + " → 0");
          return ok([evento("medo", { de: antes, para: 0 })]);
        }
        return falha("Livro Especial: conjure pela aba de magias ou queime para eliminar o Medo.");
      case "anelMagico":
        return equipar(o, i.id, !i.equipado, rolador);
      case "tortaDeliciosa":
        return testar(o, { atributo: "nocao", rotulo: "Perceber que a torta é ilusão", dificuldade: op.dificuldade, seZero: op.seZero }, rolador);
      case "relogioTicPloc":
        fim(o, "sumiu", "Deixou o Relógio Tic-Ploc cair", eventos);
        return ok(eventos);
      case "espadaJusticeira":
        fim(o, "morto", "Gritou “Hooooo” com a Espada da Justiçeira erguida", eventos);
        return ok(eventos);
      case "espadaDestruidora":
        registrar(o, "item", "Alguém falou “FIM” perto da Espada Destruidora de Mundos");
        return ok([evento("narrativo", { texto: "Um vórtex se abre e absorve tudo e todos!", pagina: 26 })]);
      case "estatuetaSerpente":
        registrar(o, "item", "Apontou a Estatueta do Deus Serpente" + (op.alvo ? " para " + op.alvo : ""));
        return ok([evento("narrativo", { texto: "Uma serpente imensa devora " + (op.alvo || "o alvo") + " e some.", pagina: 26 })], { alvo: { devorado: true } });
      case "peteca":
        o.marcas.dia.peteca = true;
        registrar(o, "item", "Brincou de peteca (rola no fim do dia)");
        return ok([evento("narrativo", { texto: "No fim do dia, um dado: com 6, Habilidade +1 amanhã.", pagina: 27 })]);
      default:
        return falha("Este item não tem ação automática.");
    }
  }

  /* Veneno no próprio goblin: cada minuto, 1 ferimento. */
  function passarMinuto(o) {
    var vs = o.efeitos.filter(function (e) { return e.porMinuto; });
    if (!vs.length) return falha("Nada correndo por minuto.");
    var total = vs.reduce(function (s, e) { return s + e.porMinuto; }, 0);
    return sofrer(o, { ferimentos: total, fonte: "Veneno (1 minuto)" });
  }

  /* Bomba-relógio (p. 6): alguém falou de fogo ou explosão. */
  function bombaRelogio(o, rolador) {
    if (!o.caracteristicas.some(function (c) { return c.chave === "bombaRelogio"; })) return falha("Este goblin não é uma Bomba-relógio.");
    if (!ativo(o)) return falha(motivoInativo(o));
    var f = D().quantidade("1d6", rolador);
    var eventos = [evento("bombaRelogio", { dados: f.dados, explodiu: f.total === 1 })];
    registrar(o, "caracteristica", "Bomba-relógio: rolou " + f.total);
    if (f.total === 1) fim(o, "explodiu", "Bomba-relógio", eventos);
    return ok(eventos, { dados: f.dados });
  }

  /* ---------------------------------------------------------------
     CHAMADO DE CTHULIN (p. 32–33)
     --------------------------------------------------------------- */

  function receberMedoInterno(o, n, fonte, eventos) {
    var antes = o.adaptacoes.cthulin.medo;
    o.adaptacoes.cthulin.medo = Math.max(0, antes + inteiro(n, 0));
    registrar(o, "cthulin", "Medo " + antes + " → " + o.adaptacoes.cthulin.medo + (fonte ? " (" + fonte + ")" : ""));
    eventos.push(evento("medo", { de: antes, para: o.adaptacoes.cthulin.medo }));
    verificarFim(o, eventos, "Medo");
  }

  function receberMedo(o, n, fonte) {
    if (!o.opcoes.adaptacoes.cthulin) return falha("A adaptação Chamado de Cthulin está desligada.");
    var eventos = [];
    receberMedoInterno(o, n, fonte, eventos);
    return ok(eventos);
  }

  function verHorror(o, chave, rolador) {
    var h = C().INIMIGOS[chave];
    if (!h || !h.terror) return falha("Este Horror não causa Terror.");
    var q = D().quantidade(h.terror, rolador);
    var r = receberMedo(o, q.total, "Terror: " + h.nome);
    if (r.ok) r.quantidade = q;
    return r;
  }

  function descansarEmLugarSagrado(o) {
    var antes = o.adaptacoes.cthulin.medo;
    o.adaptacoes.cthulin.medo = 0;
    registrar(o, "cthulin", "Descansou num lugar sagrado: Medo " + antes + " → 0");
    return ok([evento("medo", { de: antes, para: 0 })]);
  }

  /* ---------------------------------------------------------------
     POKÉPRAGAS (p. 34–35)
     --------------------------------------------------------------- */

  function rolarElemento(rolador) {
    var s = D().sortear({ id: "elemento", nome: "Elemento", pagina: 34, dados: "colunaLinha", entradas: [C().POKE.elemento[0], C().POKE.elemento[0], C().POKE.elemento[0], C().POKE.elemento[0], C().POKE.elemento[1], C().POKE.elemento[1]] }, rolador);
    return s;
  }

  function gerarPraga(raridade, rolador, nome) {
    var bichos = C().POKE.bichos[raridade];
    var sb = D().sortear({ id: "bicho", nome: "Bicho (" + raridade + ")", pagina: 34, dados: "1d6", entradas: bichos }, rolador);
    var se = rolarElemento(rolador);
    var praga = normalizarPraga({ nome: nome || C().POKE.ficha[sb.resultado][0], bicho: sb.resultado, raridade: raridade, elementos: [se.resultado] });
    return { praga: praga, sorteios: [sb, se] };
  }

  function statsDaPraga(pr) {
    var f = C().POKE.ficha[pr.bicho] || ["?", 0, 0, 0, 1];
    var s = { combate: f[1], habilidade: f[2], nocao: f[3], vitalidade: f[4] };
    pr.elementos.forEach(function (e) { var d = C().POKE.elementos[e]; if (!d) return; Object.keys(d.mods).forEach(function (k) { s[k] += d.mods[k]; }); });
    s.vitalidade += pr.evolucoes;
    var primeiro = C().POKE.elementos[pr.elementos[0]];
    s.fraqueza = primeiro ? primeiro.fraqueza : "";
    return s;
  }

  function procurarPraga(o, rolador) {
    if (!o.opcoes.adaptacoes.pokepragas) return falha("A adaptação PokéPragas está desligada.");
    if (o.marcas.dia.procurouPraga) return falha("Procurar leva o dia inteiro: amanhã de novo.");
    o.marcas.dia.procurouPraga = true;
    var s = D().sortear({ id: "procurando", nome: "Procurando PokéPraga", pagina: 35, dados: "1d6", entradas: C().POKE.procurando }, rolador);
    var eventos = [evento("sorteio", { nome: s.nome, dados: s.dados, resultado: s.resultado || "nada" })];
    if (!s.resultado) { registrar(o, "poke", "Procurou o dia todo na grama alta: nada"); return ok(eventos, { sorteio: s }); }
    var g = gerarPraga(s.resultado, rolador);
    o.adaptacoes.pokepragas.encontrada = g.praga;
    registrar(o, "poke", "Encontrou uma PokéPraga " + C().POKE.raridades[s.resultado].nome.toLowerCase() + ": " + g.praga.nome);
    return ok(eventos, { sorteio: s, praga: g.praga, sorteios: g.sorteios });
  }

  function capturarPraga(o, nome, opcoes, rolador) {
    var op = opcoes || {};
    var pk = o.adaptacoes.pokepragas;
    var alvo = pk.encontrada;
    if (!alvo) return falha("Nenhuma PokéPraga à vista.");
    if (pk.pokepedras <= 0) return falha("Sem PokéPedras.");
    var precisa = C().POKE.raridades[alvo.raridade].captura;
    var t = testar(o, { atributo: "habilidade", rotulo: "Capturar " + alvo.nome, necessarios: precisa, dificuldade: op.dificuldade, seZero: op.seZero }, rolador);
    if (!t.ok || t.lacuna) return t;
    if (t.rolagem.classificacao.sucesso) {
      alvo.nome = texto(nome, 60) || alvo.nome;
      pk.pragas.push(alvo);
      pk.pokepedras--;
      pk.encontrada = null;
      registrar(o, "poke", "Capturou " + alvo.nome);
    }
    return ok(t.eventos, { rolagem: t.rolagem, capturou: t.rolagem.classificacao.sucesso });
  }

  /* Ganhou uma PokéBatalha: 1 dado (2 com Mestre da Evolução; evolui
     com 6 em qualquer um). */
  function verificarEvolucao(o, pragaId, rolador) {
    var pr = o.adaptacoes.pokepragas.pragas.filter(function (x) { return x.id === pragaId; })[0];
    if (!pr) return falha("PokéPraga não encontrada.");
    var n = temTecnica(o, "mestreDaEvolucao") ? 2 : 1;
    var q = D().quantidade(n + "d6", rolador);
    var evoluiu = q.dados.indexOf(6) >= 0;
    var eventos = [evento("evolucao", { dados: q.dados, evoluiu: evoluiu })];
    var extra = { dados: q.dados, evoluiu: evoluiu };
    if (evoluiu) {
      var novo = null, tentativas = 0, s;
      while (tentativas < 12) { s = rolarElemento(rolador); tentativas++; if (pr.elementos.indexOf(s.resultado) < 0) { novo = s.resultado; break; } }
      pr.evolucoes++;
      if (novo) pr.elementos.push(novo);
      extra.elemento = novo;
      registrar(o, "poke", pr.nome + " evoluiu: Vitalidade +1" + (novo ? " e " + C().POKE.elementos[novo].nome : ""));
    }
    return ok(eventos, extra);
  }

  function ferirPraga(o, pragaId, n) {
    var pr = o.adaptacoes.pokepragas.pragas.filter(function (x) { return x.id === pragaId; })[0];
    if (!pr) return falha("PokéPraga não encontrada.");
    pr.ferimentos = Math.max(0, pr.ferimentos + inteiro(n, 0));
    var st = statsDaPraga(pr);
    var eventos = [];
    if (pr.ferimentos > st.vitalidade && !pr.desmaiada) { pr.desmaiada = true; eventos.push(evento("desmaiou", { nome: pr.nome })); registrar(o, "poke", pr.nome + " desmaiou e voltou para a PokéPedra"); }
    if (pr.ferimentos <= st.vitalidade && pr.desmaiada && n < 0) pr.desmaiada = false;
    return ok(eventos);
  }

  /* Ataque de PokéPraga: normal com Combate, elemental com Habilidade;
     elemental que causar dano e for a fraqueza do alvo: +1 ferimento. */
  function ataqueDePraga(o, pragaId, pedido, rolador) {
    var p = pedido || {};
    var pr = o.adaptacoes.pokepragas.pragas.filter(function (x) { return x.id === pragaId; })[0];
    if (!pr) return falha("PokéPraga não encontrada.");
    if (pr.desmaiada) return falha(pr.nome + " está desmaiada.");
    var st = statsDaPraga(pr);
    var elemental = !!p.elemento;
    if (elemental && pr.elementos.indexOf(p.elemento) < 0) return falha("Elemento que ela não tem.");
    var m = D().montarParada({ fonte: elemental ? "Habilidade (" + pr.nome + ")" : "Combate (" + pr.nome + ")", valor: elemental ? st.habilidade : st.combate }, lista(p.extras), p.dificuldade);
    var r = D().rolar({ parada: m.parada, composicao: m.composicao, tipo: "ataque", rotulo: pr.nome + (elemental ? " · ataque de " + C().POKE.elementos[p.elemento].nome : " · ataque"), podeExplodirGoblin: false, seZero: p.seZero }, rolador);
    if (r.lacuna) return ok([], { rolagem: r, lacuna: true });
    var fer = r.classificacao.hits;
    var notas = [];
    if (elemental && fer > 0 && p.fraquezaDoAlvo === p.elemento) { fer++; notas.push("Fraqueza do alvo: +1"); }
    return ok([], { rolagem: r, ferimentos: fer, notas: notas });
  }

  /* ---------------------------------------------------------------
     GOBLIN HIGH (p. 38–39) — e o vilarejo do Vale (p. 41)
     --------------------------------------------------------------- */

  function gerarEstudante(nome, rolador) {
    var GH = C().GOBLIN_HIGH;
    var r = D().sortear({ id: "reacao", nome: "Reação", pagina: 38, dados: "1d6", entradas: GH.reacaoD6 }, rolador);
    var q = function () { return D().quantidade("1d6", rolador).total; };
    return normalizarEstudante({ nome: nome, reacao: r.resultado, assunto: q(), gosto: q(), materia: q(), segredo: q() });
  }

  function adicionarEstudante(o, nome, rolador) {
    var e = gerarEstudante(nome, rolador);
    o.adaptacoes.goblinHigh.estudantes.push(e);
    registrar(o, "goblinHigh", "Novo estudante: " + e.nome + " (" + C().GOBLIN_HIGH.nomes[e.reacao] + ")");
    return ok([], { estudante: e });
  }

  function moverReacao(e, delta) {
    var esc = C().GOBLIN_HIGH.escala;
    var i = esc.indexOf(e.reacao);
    var antes = e.reacao;
    e.reacao = esc[Math.max(0, Math.min(esc.length - 1, i + delta))];
    return { de: antes, para: e.reacao };
  }

  function estudante(o, id) { return o.adaptacoes.goblinHigh.estudantes.filter(function (x) { return x.id === id; })[0]; }

  function conversar(o, id, opcoes, rolador) {
    var op = opcoes || {};
    var e = estudante(o, id);
    if (!e) return falha("Estudante não encontrado.");
    var GH = C().GOBLIN_HIGH;
    if (e.reacao === "hostil") {
      registrar(o, "goblinHigh", e.nome + " (Hostil) te agrediu e foi embora");
      return ok([evento("narrativo", { texto: e.nome + " está Hostil: te agride (um ataque) e vai embora." })], { hostil: true });
    }
    if (["neutro", "amigavel", "amigo"].indexOf(e.reacao) < 0) return falha("Só se conversa com quem está Neutro ou Amigável (ou é seu Amigo).");
    var t = testar(o, { atributo: "nocao", rotulo: "Conversar com " + e.nome, dificuldade: op.dificuldade, seZero: op.seZero }, rolador);
    if (!t.ok || t.lacuna) return t;
    var eventos = t.eventos.slice();
    var extra = { rolagem: t.rolagem };
    o.marcas.dia["conversou:" + e.id] = true;
    if (t.rolagem.classificacao.hits < 1) {
      if (e.reacao !== "amigo") { var mv = moverReacao(e, -1); extra.reacao = mv; registrar(o, "goblinHigh", "Conversa com " + e.nome + " falhou: " + GH.nomes[mv.de] + " → " + GH.nomes[mv.para]); }
      return ok(eventos, extra);
    }
    var s = D().sortear({ id: "conversa", nome: "Conversa", pagina: 38, dados: "1d6", entradas: GH.conversaD6 }, rolador);
    extra.conversa = s;
    if (s.resultado.revela) { e.revelado[s.resultado.revela] = true; extra.revelou = s.resultado.revela; }
    if (s.resultado.baixa) { var mv2 = moverReacao(e, -1); extra.reacao = mv2; }
    registrar(o, "goblinHigh", "Conversou com " + e.nome + ": " + s.resultado.texto);
    return ok(eventos, extra);
  }

  /* Amigos revelam o Segredo (p. 39). */
  function perguntarSegredo(o, id) {
    var e = estudante(o, id);
    if (!e) return falha("Estudante não encontrado.");
    if (e.reacao !== "amigo") return falha("Só um Amigo conta o Segredo.");
    e.revelado.segredo = true;
    registrar(o, "goblinHigh", e.nome + " contou o Segredo: " + C().GOBLIN_HIGH.segredo[e.segredo - 1]);
    return ok([], { segredo: C().GOBLIN_HIGH.segredo[e.segredo - 1], gostaDeVoce: e.segredo === 6 });
  }

  /* Agradar: fazendo algo que ele gosta (+1, sem teste) ou falando algo
     agradável (Noção: falhou −1, mesmo Amigo; 2+ hits +1). Precisa ter
     conversado hoje (menos com Inimigo, que nem conversa: é o caminho
     para desfazer a inimizade — 3 hits em dois dias seguidos). Uma vez
     por dia por estudante. */
  function agradar(o, id, opcoes, rolador) {
    var op = opcoes || {};
    var e = estudante(o, id);
    if (!e) return falha("Estudante não encontrado.");
    var GH = C().GOBLIN_HIGH;
    if (o.marcas.dia["agradou:" + e.id]) return falha("Não dá para agradar a mesma pessoa duas vezes no mesmo dia.");
    if (e.reacao !== "inimigo" && !o.marcas.dia["conversou:" + e.id]) return falha("É preciso conversar antes.");
    o.marcas.dia["agradou:" + e.id] = true;
    if (op.gosto && e.reacao !== "inimigo") {
      var mv = moverReacao(e, 1);
      registrar(o, "goblinHigh", "Fez algo que " + e.nome + " gosta: " + GH.nomes[mv.de] + " → " + GH.nomes[mv.para]);
      return ok([], { reacao: mv });
    }
    var t = testar(o, { atributo: "nocao", rotulo: "Agradar " + e.nome, dificuldade: op.dificuldade, seZero: op.seZero }, rolador);
    if (!t.ok || t.lacuna) { o.marcas.dia["agradou:" + e.id] = false; return t; }
    var h = t.rolagem.classificacao.hits;
    var extra = { rolagem: t.rolagem };
    if (e.reacao === "inimigo") {
      if (h >= 3) {
        e.agrados3.push(o.tempo.dia);
        var n = e.agrados3.length;
        if (n >= 2 && e.agrados3[n - 1] - e.agrados3[n - 2] === 1) { e.reacao = "hostil"; e.agrados3 = []; extra.reacao = { de: "inimigo", para: "hostil" }; registrar(o, "goblinHigh", e.nome + " deixou de ser Inimigo (segue Hostil)"); }
      }
      return ok(t.eventos, extra);
    }
    if (h < 1) extra.reacao = moverReacao(e, -1);
    else if (h >= 2) extra.reacao = moverReacao(e, 1);
    if (extra.reacao) registrar(o, "goblinHigh", "Agradar " + e.nome + ": " + GH.nomes[extra.reacao.de] + " → " + GH.nomes[extra.reacao.para]);
    return ok(t.eventos, extra);
  }

  function mudarReacao(o, id, delta, motivo) {
    var e = estudante(o, id);
    if (!e) return falha("Estudante não encontrado.");
    var mv = moverReacao(e, delta > 0 ? 1 : -1);
    registrar(o, "goblinHigh", e.nome + ": " + C().GOBLIN_HIGH.nomes[mv.de] + " → " + C().GOBLIN_HIGH.nomes[mv.para] + (motivo ? " (" + motivo + ")" : ""));
    return ok([], { reacao: mv });
  }

  /* Romance (p. 39): Amigo cujo segredo é "gosta de você", ou quem
     sabe Assunto, Gostos e Segredo e vence um teste de Noção — os hits
     são os meses juntos. */
  function tentarRomance(o, id, opcoes, rolador) {
    var op = opcoes || {};
    var e = estudante(o, id);
    if (!e) return falha("Estudante não encontrado.");
    if (e.romance) return falha("Já há um romance com " + e.nome + ".");
    if (e.reacao === "amigo" && e.revelado.segredo && e.segredo === 6 && !op.teste) {
      e.romance = { meses: 0, desde: o.tempo.dia };
      registrar(o, "goblinHigh", "Começou um romance com " + e.nome);
      return ok([evento("romance", { nome: e.nome })]);
    }
    if (!(e.revelado.assunto && e.revelado.gosto && e.revelado.segredo)) return falha("É preciso conhecer o Assunto Favorito, os Gostos e o Segredo.");
    var t = testar(o, { atributo: "nocao", rotulo: "Encantar " + e.nome, dificuldade: op.dificuldade, seZero: op.seZero }, rolador);
    if (!t.ok || t.lacuna) return t;
    var h = t.rolagem.classificacao.hits;
    if (h >= 1) { e.romance = { meses: h, desde: o.tempo.dia }; registrar(o, "goblinHigh", "Romance com " + e.nome + " por " + h + " mês(es)"); }
    return ok(t.eventos, { rolagem: t.rolagem, meses: h });
  }

  function resolverBriga(o, venceu) {
    var gh = o.adaptacoes.goblinHigh;
    if (!gh.briga) return falha("Não há briga marcada.");
    var quem = gh.briga.estudante;
    gh.briga = null;
    if (venceu) { gh.popular = true; registrar(o, "goblinHigh", "Venceu a briga com " + quem + ": popular na escola"); return ok([evento("narrativo", { texto: "Popular na escola!" })]); }
    gh.humilhado = true;
    gh.estudantes.forEach(function (e) { if (e.reacao !== "amigo") moverReacao(e, -1); });
    registrar(o, "goblinHigh", "Perdeu a briga com " + quem + ": humilhado, todos (menos Amigos) −1 na Reação");
    return ok([evento("narrativo", { texto: "Humilhado: todos (menos os Amigos) reduzem a Reação." })]);
  }

  /* ---------------------------------------------------------------
     VALE DOS GOBLINS (p. 40–41)
     --------------------------------------------------------------- */

  function temFerramenta(o, chave) { return o.itens.some(function (i) { return disponivel(i) && i.chave === chave; }); }
  function exigirVale(o) { return o.opcoes.adaptacoes.vale ? "" : "A adaptação Vale dos Goblins está desligada."; }

  /* Um teste por animal / m² / mina / bosque: hits = unidades. */
  function testesEmSerie(o, n, atributo, rotulo, rolador) {
    var total = 0, rolagens = [], eventos = [];
    for (var k = 0; k < n && ativo(o); k++) {
      var t = testar(o, { atributo: atributo, rotulo: rotulo + " (" + (k + 1) + "/" + n + ")", seZero: "falha" }, rolador);
      if (!t.ok) break;
      total += t.rolagem.classificacao.hits;
      rolagens.push(t.rolagem);
      eventos = eventos.concat(t.eventos);
    }
    return { total: total, rolagens: rolagens, eventos: eventos };
  }

  function coletar(o, tipo, rolador) {
    var m = exigirVale(o); if (m) return falha(m);
    var v = o.adaptacoes.vale;
    var marca = "coleta:" + tipo;
    if (o.marcas.dia[marca]) return falha("Já coletou isso hoje.");
    var r;
    if (tipo === "animais") {
      if (!v.galinhas && !v.vacas) return falha("Nenhum animal na fazenda.");
      var g = testesEmSerie(o, v.galinhas, "habilidade", "Ovos", rolador);
      var l = testesEmSerie(o, v.vacas, "habilidade", "Leite", rolador);
      v.recursos.ovo += g.total; v.recursos.leite += l.total;
      o.marcas.dia[marca] = true;
      registrar(o, "vale", "Coleta: " + g.total + " ovo(s), " + l.total + " litro(s) de leite");
      return ok(g.eventos.concat(l.eventos), { rolagens: g.rolagens.concat(l.rolagens), ovos: g.total, leite: l.total });
    }
    if (tipo === "pedra" || tipo === "madeira") {
      var ferr = tipo === "pedra" ? "picareta" : "machado";
      if (!temFerramenta(o, ferr)) return falha("Precisa de " + (tipo === "pedra" ? "uma Picareta" : "um Machado") + ".");
      var n = tipo === "pedra" ? v.minas : v.bosques;
      if (!n) return falha(tipo === "pedra" ? "Nenhuma mina no mapa." : "Nenhum bosque no mapa.");
      r = testesEmSerie(o, n, "combate", tipo === "pedra" ? "Minerar" : "Cortar madeira", rolador);
      v.recursos[tipo] += r.total;
      o.marcas.dia[marca] = true;
      registrar(o, "vale", "Coleta: " + r.total + " " + (tipo === "pedra" ? "bloco(s) de pedra" : "tábua(s) de madeira"));
      return ok(r.eventos, { rolagens: r.rolagens, total: r.total });
    }
    return falha("Coleta desconhecida.");
  }

  function plantar(o, planta, rolador) {
    var m = exigirVale(o); if (m) return falha(m);
    if (!temFerramenta(o, "enxada")) return falha("Precisa de uma Enxada.");
    if (o.marcas.dia.plantou) return falha("Só dá para plantar uma vez ao dia.");
    var nome = C().VALE.plantas.indexOf(planta) >= 0 ? planta : "";
    if (!nome) return falha("Escolha o que plantar.");
    var t = testar(o, { atributo: "habilidade", rotulo: "Plantar " + nome, seZero: "falha" }, rolador);
    if (!t.ok) return t;
    o.marcas.dia.plantou = true;
    var m2 = t.rolagem.classificacao.hits;
    var extra = { rolagem: t.rolagem, m2: m2 };
    if (m2 > 0) {
      var dias = D().quantidade("1d6", rolador);
      o.adaptacoes.vale.hortas.push({ id: novoId("ho"), planta: nome, m2: m2, plantadaNoDia: o.tempo.dia, colheitaEm: o.tempo.dia + dias.total, colhida: false });
      extra.dias = dias;
      registrar(o, "vale", "Plantou " + m2 + " m² de " + nome + ": colhe no dia " + (o.tempo.dia + dias.total));
    }
    return ok(t.eventos, extra);
  }

  function colher(o, hortaId, rolador) {
    var m = exigirVale(o); if (m) return falha(m);
    var h = o.adaptacoes.vale.hortas.filter(function (x) { return x.id === hortaId; })[0];
    if (!h || h.colhida) return falha("Horta não encontrada.");
    if (o.tempo.dia < h.colheitaEm) return falha("Ainda não: colhe no dia " + h.colheitaEm + ".");
    var r = testesEmSerie(o, h.m2, "nocao", "Colher " + h.planta, rolador);
    var total = r.total * (temTecnica(o, "dedoVerde") ? 2 : 1);
    h.colhida = true;
    o.adaptacoes.vale.alimentos[h.planta] = (o.adaptacoes.vale.alimentos[h.planta] || 0) + total;
    registrar(o, "vale", "Colheu " + total + " " + h.planta + (temTecnica(o, "dedoVerde") ? " (Dedo Verde: dobro)" : "") + "; a horta precisa ser plantada de novo");
    return ok(r.eventos, { rolagens: r.rolagens, total: total });
  }

  /* A pescaria é jogada na tela (dados.js); aqui só guarda o peixe. */
  function guardarPeixe(o, pescaria) {
    var m = exigirVale(o); if (m) return falha(m);
    if (!temFerramenta(o, "varaDePesca")) return falha("Precisa de uma Vara de Pesca.");
    if (!pescaria || !pescaria.concluida) return falha("A pescaria não terminou.");
    if (!pescaria.peixe) { registrar(o, "vale", "Pescou e não pegou nada"); return ok([], { peixe: null }); }
    var p = pescaria.peixe;
    o.adaptacoes.vale.peixes.push({ id: novoId("px"), nome: p.nome, local: pescaria.local, gramas: p.gramas });
    registrar(o, "vale", "Pescou um " + p.nome + " de " + (p.gramas >= 1000 ? p.gramas / 1000 + " kg" : p.gramas + " g") + " no " + pescaria.local);
    return ok([evento("peixe", { nome: p.nome, gramas: p.gramas })], { peixe: p });
  }

  function construir(o, chave, rolador) {
    var m = exigirVale(o); if (m) return falha(m);
    var def = C().VALE.construcoes[chave];
    if (!def) return falha("Construção desconhecida.");
    var v = o.adaptacoes.vale;
    var falta = [];
    var espada = null;
    Object.keys(def.custo).forEach(function (k) {
      if (k === "espada") { espada = o.itens.filter(function (i) { return disponivel(i) && i.chave === "espada"; })[0]; if (!espada) falta.push("1 Espada"); }
      else if ((v.recursos[k] || 0) < def.custo[k]) falta.push(def.custo[k] + " " + k);
    });
    if (falta.length) return falha("Faltam: " + falta.join(", ") + ".");
    var t = testar(o, { atributo: "nocao", rotulo: "Construir " + def.nome, necessarios: 2, seZero: "falha" }, rolador);
    if (!t.ok) return t;
    var extra = { rolagem: t.rolagem, construiu: t.rolagem.classificacao.sucesso };
    if (extra.construiu) {
      Object.keys(def.custo).forEach(function (k) { if (k === "espada") consumir(o, espada); else v.recursos[k] -= def.custo[k]; });
      if (def.ferramenta) o.itens.push(novoItem(chave === "varaDePesca" ? "varaDePesca" : chave));
      else if (chave === "fazenda") v.fazenda = true;
      else v.construcoes.push(chave);
      registrar(o, "vale", "Construiu " + def.nome);
    }
    return ok(t.eventos, extra);
  }

  /* Cozinha: confere os ingredientes, testa Noção; falhou, perdeu os
     ingredientes (p. 41). Peixe: gasta os gramas do peixe escolhido. */
  function cozinhar(o, chave, opcoes, rolador) {
    var op = opcoes || {};
    var m = exigirVale(o); if (m) return falha(m);
    var rc = C().VALE.receitas[chave];
    if (!rc) return falha("Receita desconhecida.");
    var v = o.adaptacoes.vale;
    var falta = [];
    var usar = {};
    Object.keys(rc.ingredientes).forEach(function (k) {
      var n = rc.ingredientes[k];
      if (k === "Ovo") { if (v.recursos.ovo < n) falta.push(n + " Ovo"); else usar.ovo = n; return; }
      if (k === "Leite") { if (v.recursos.leite < n) falta.push(n + " Leite"); else usar.leite = n; return; }
      if (k === "Fruta") {
        var fr = C().VALE.frutas.filter(function (f) { return (v.alimentos[f] || 0) >= n; })[0];
        if (op.fruta && (v.alimentos[op.fruta] || 0) >= n) fr = op.fruta;
        if (!fr) falta.push("1 Fruta"); else usar["al:" + fr] = n;
        return;
      }
      if ((v.alimentos[k] || 0) < n) falta.push(n + " " + k); else usar["al:" + k] = n;
    });
    var peixe = null;
    if (rc.peixe) {
      peixe = v.peixes.filter(function (p) { return p.id === op.peixeId; })[0];
      if (!peixe) falta.push(rc.peixe.gramas + " g de peixe" + (rc.peixe.tipos ? " (" + rc.peixe.tipos.join(" ou ") + ")" : ""));
      else if (peixe.gramas < rc.peixe.gramas) falta.push(rc.peixe.gramas + " g de peixe (este tem " + peixe.gramas + " g)");
      else if (rc.peixe.tipos && rc.peixe.tipos.indexOf(peixe.nome) < 0) falta.push("peixe " + rc.peixe.tipos.join(" ou "));
    }
    if (falta.length) return falha("Faltam: " + falta.join(", ") + ".");
    var t = testar(o, { atributo: "nocao", rotulo: "Cozinhar " + rc.nome, necessarios: rc.hits, seZero: "falha" }, rolador);
    if (!t.ok) return t;
    Object.keys(usar).forEach(function (k) {
      if (k === "ovo" || k === "leite") v.recursos[k] -= usar[k];
      else { var nome = k.slice(3); v.alimentos[nome] -= usar[k]; if (v.alimentos[nome] <= 0) delete v.alimentos[nome]; }
    });
    if (peixe) { peixe.gramas -= rc.peixe.gramas; v.peixes = v.peixes.filter(function (p) { return p.gramas > 0; }); }
    var deu = t.rolagem.classificacao.sucesso;
    if (deu) v.pratos[chave] = (v.pratos[chave] || 0) + 1;
    registrar(o, "vale", (deu ? "Cozinhou " : "Estragou os ingredientes de ") + rc.nome);
    return ok(t.eventos, { rolagem: t.rolagem, cozinhou: deu });
  }

  function heranca(o) {
    var v = o.adaptacoes.vale;
    if (v.fazenda) return;
    v.fazenda = true; v.galinhas = Math.max(v.galinhas, 1); v.vacas = Math.max(v.vacas, 1);
    registrar(o, "vale", "Herança: uma fazenda com 1 galinha e 1 vaca");
  }

  /* ---------------------------------------------------------------
     CRIAÇÃO (p. 4–6)
     --------------------------------------------------------------- */

  function sorteioDeNome(rolador) {
    return D().sortear({ id: "nome", nome: "Nome", pagina: 4, dados: "colunaLinha", entradas: C().NOMES }, rolador);
  }

  /* Característica: "role 2 vezes" rola duas outras (e se cair de novo,
     rola de novo — o livro não proíbe, o R.A.M.A. só para em 6 delas).
     Olhos extras: rola a quantidade (1d6). */
  function sortearCaracteristicas(rolador) {
    var tabela = { id: "caracteristica", nome: "Característica", pagina: 4, dados: "colunaLinha", entradas: C().CARACTERISTICA_2D6 };
    var sorteios = [], saida = [], fila = 1, guarda = 0;
    while (fila > 0 && guarda < 12 && saida.length < 6) {
      guarda++; fila--;
      var s = D().sortear(tabela, rolador);
      sorteios.push(s);
      if (s.resultado === "rolarDuasVezes") { fila += 2; continue; }
      var def = C().CARACTERISTICAS[s.resultado];
      var c = { id: novoId("ca"), chave: s.resultado, quantidade: null };
      if (def.quantidade) { var q = D().quantidade(def.quantidade, rolador); c.quantidade = q.total; sorteios.push(Object.assign({ nome: def.nome }, q)); }
      saida.push(c);
    }
    return { caracteristicas: saida, sorteios: sorteios };
  }

  /* Rola tudo o que o livro manda rolar. O que é ESCOLHA (Supimpa,
     equipamento, arma favorita, espécie inimiga, magias…) fica como
     pendência — nada é escolhido pela pessoa. */
  function criarAleatoria(o, rolador, opcoes) {
    var op = opcoes || {};
    var eventos = [];
    o.criacao.modo = "aleatoria";
    var sn = sorteioDeNome(rolador);
    o.criacao.sorteios.push(sn);
    if (typeof sn.resultado === "string") { o.criacao.nomeSugerido = sn.resultado; o.criacao.pendenciaDeNome = ""; }
    else { o.criacao.nomeSugerido = ""; o.criacao.pendenciaDeNome = sn.resultado.especial; }
    if (op.ocupacao && C().OCUPACOES[op.ocupacao]) o.ocupacao = op.ocupacao;
    else {
      var so = D().sortear({ id: "ocupacao", nome: "Ocupação", pagina: 4, dados: "1d6", entradas: C().OCUPACAO_D6 }, rolador);
      o.criacao.sorteios.push(so);
      o.ocupacao = so.resultado;
    }
    var sd = D().sortear({ id: "descritor", nome: "Descritor", pagina: 4, dados: "1d6", entradas: C().DESCRITOR_D6 }, rolador);
    o.criacao.sorteios.push(sd);
    o.descritor = sd.resultado;
    var sc = sortearCaracteristicas(rolador);
    o.caracteristicas = sc.caracteristicas;
    o.criacao.sorteios = o.criacao.sorteios.concat(sc.sorteios).slice(-40);
    registrar(o, "criacao", "Criação aleatória: " + nomeDaOcupacao(o) + " " + C().DESCRITORES[o.descritor].nome.toLowerCase() + ", " + o.caracteristicas.map(function (c) { return C().CARACTERISTICAS[c.chave].nome; }).join(", "));
    return ok(eventos);
  }

  function rerrolarCaracteristica(o, rolador) {
    if (o.criacao.concluida) return falha("A criação já foi concluída.");
    var sc = sortearCaracteristicas(rolador);
    o.caracteristicas = sc.caracteristicas;
    o.criacao.sorteios = o.criacao.sorteios.concat(sc.sorteios).slice(-40);
    return ok([], { sorteios: sc.sorteios });
  }

  function pendencias(o) {
    var p = [];
    var oc = C().OCUPACOES[o.ocupacao];
    if (!oc) { p.push("Escolha (ou role) a ocupação."); return p; }
    if (!o.descritor) p.push("Escolha (ou role) o descritor.");
    if (o.descritor === "supimpa" && !o.supimpa) p.push("Supimpa: escolha o atributo que ganha +1.");
    if (oc.modEscolha && !o.modEscolhido) p.push(oc.nome + ": escolha Habilidade ou Noção (+1).");
    if (!o.caracteristicas.length) p.push("Escolha (ou role) a característica.");
    var war = o.opcoes.adaptacoes.wargoblin;
    if (war) {
      if (!o.escolhas.grupoWar) p.push("WarGoblin: escolha a turminha.");
      if (o.escolhas.equipamentoWar.length < 2) p.push("WarGoblin: escolha dois equipamentos.");
    } else if (oc.equipamento.length > 1 && (o.equipamentoInicial === null || !oc.equipamento[o.equipamentoInicial])) p.push("Escolha o equipamento inicial.");
    if (oc.escolhas.indexOf("armaFavorita") >= 0 && !o.escolhas.armaFavorita) p.push("Mestre de Armas: escolha a arma favorita.");
    if (oc.escolhas.indexOf("especieInimiga") >= 0 && !o.escolhas.especieInimiga) p.push("Inimigo: escolha a espécie de criatura.");
    if (oc.escolhas.indexOf("magias") >= 0 && o.escolhas.magias.length < 3) p.push("Magias: escolha 3 (" + o.escolhas.magias.length + "/3).");
    if (o.opcoes.adaptacoes.cthulin && !o.escolhas.inicialCthulin) p.push("Cthulin: comece com um Chapéu ou um Livro Especial.");
    if (o.criacao.pendenciaDeNome) p.push(o.criacao.pendenciaDeNome === "comida" ? "Nome: a última coisa que você comeu." : "Nome: inverta o seu nome.");
    return p;
  }

  function concluirCriacao(o, rolador) {
    var p = pendencias(o).filter(function (x) { return x.indexOf("Nome:") !== 0; });
    if (p.length) return falha(p[0], { pendencias: p });
    var eventos = [];
    if (!o.criacao.equipamentoAplicado) {
      var oc = C().OCUPACOES[o.ocupacao];
      var chaves = [];
      if (o.opcoes.adaptacoes.wargoblin) chaves = o.escolhas.equipamentoWar.slice();
      else {
        var opc = oc.equipamento[oc.equipamento.length === 1 ? 0 : o.equipamentoInicial];
        chaves = opc.itens.slice();
        if (opc.pokepedras) o.adaptacoes.pokepragas.pokepedras += opc.pokepedras;
      }
      if (o.opcoes.adaptacoes.cthulin && o.escolhas.inicialCthulin) chaves.push(o.escolhas.inicialCthulin);
      var maosLivres = 2;
      chaves.forEach(function (k) {
        var i = novoItem(k);
        var d = defDoItem(i);
        var maos = d.arma ? d.arma.maos : d.protecao && d.protecao.uso === "umaMao" ? 1 : 0;
        if ((d.arma || d.protecao) && !restricaoDeUso(o, i) && maos <= maosLivres) { i.equipado = true; maosLivres -= maos; }
        o.itens.push(i);
      });
      o.criacao.equipamentoAplicado = true;
      registrar(o, "criacao", "Equipamento inicial: " + chaves.map(function (k) { var c = C().itemDoCatalogo(k); return c ? c.def.nome : k; }).join(", "));
    }
    if (temTecnica(o, "heranca")) heranca(o);
    if (temTecnica(o, "pokepragaInicial") && !o.adaptacoes.pokepragas.pragas.length && rolador) {
      var g = gerarPraga("incomum", rolador);
      o.adaptacoes.pokepragas.pragas.push(g.praga);
      registrar(o, "poke", "PokéPraga inicial: " + g.praga.nome + " (" + g.praga.elementos.map(function (e) { return C().POKE.elementos[e].nome; }).join(", ") + ")");
      eventos.push(evento("sorteio", { nome: "PokéPraga inicial", resultado: g.praga.nome }));
    }
    o.criacao.concluida = true;
    registrar(o, "criacao", "Criação concluída");
    return ok(eventos);
  }

  /* O parente que chega para vingar (p. 5): um bloco NOVO, de nível 1,
     com as mesmas regras ligadas e o rastro do anterior. A ficha antiga
     fica como está. */
  function novoParente(anterior, refAnterior, rolador) {
    var o = fichaVazia();
    o.opcoes = copiar(anterior.opcoes);
    o.tempo.dia = anterior.tempo.dia;
    o.nomeDeFamilia = anterior.nomeDeFamilia;
    o.linhagem.anterior = refAnterior || null;
    if (rolador) criarAleatoria(o, rolador);
    registrar(o, "criacao", "Chegou para vingar " + (refAnterior ? refAnterior.nome : "o goblin anterior"));
    return o;
  }

  /* Correção no modo Edição: voltar um fim marcado por engano. Fica no
     histórico. */
  function corrigirSituacao(o, situacao, motivo) {
    if (!SITUACOES[situacao]) return falha("Situação desconhecida.");
    var antes = o.estado.situacao;
    o.estado.situacao = situacao;
    if (situacao === "ativo") o.estado.causa = "";
    registrar(o, "correcao", "Situação " + SITUACOES[antes] + " → " + SITUACOES[situacao] + (motivo ? " (" + motivo + ")" : ""));
    return ok([evento("correcao", { de: antes, para: situacao })]);
  }

  function voltarComoMortoVivo(o) {
    if (o.estado.situacao !== "morto") return falha("Só quem morreu.");
    if (!o.itens.some(function (i) { return disponivel(i) && i.chave === "necronomicon"; })) return falha("Só quem morreu com o Necronomicon em mãos.");
    o.estado.situacao = "mortoVivo";
    if (o.estado.marcas.indexOf("mortoVivo") < 0) o.estado.marcas.push("mortoVivo");
    registrar(o, "fim", "Voltou como morto-vivo (Necronomicon). Os ferimentos ficam como estavam: a mesa decide");
    return ok([evento("mortoVivo", {})]);
  }

  /* ---------------------------------------------------------------
     OPERAÇÕES, RESUMO
     --------------------------------------------------------------- */

  /* fn(copia) → { ok, motivo?, eventos }. Aplicada numa CÓPIA: falhou
     no meio, a ficha fica como estava. Uma vez por id. */
  function aplicarOperacao(o, opId, fn) {
    var id = texto(opId, 120);
    if (!id) return falha("Operação sem identificação.");
    if (o.operacoes.indexOf(id) >= 0) return { ok: true, repetida: true, eventos: [] };
    var copia = copiar(o);
    var r = fn(copia) || { ok: true, eventos: [] };
    if (r.ok === false) return r;
    Object.keys(o).forEach(function (k) { delete o[k]; });
    Object.assign(o, copia);
    o.operacoes.push(id);
    if (o.operacoes.length > LIMITE_OPERACOES) o.operacoes = o.operacoes.slice(-LIMITE_OPERACOES);
    return r;
  }

  /* O que a mesa lê sem abrir a ficha. */
  function resumoParaMesa(o) {
    var c = calcular(o);
    var a = {};
    C().CHAVES_ATRIBUTO.forEach(function (k) { a[k] = c.atributos[k].valor; });
    return {
      v: 1, ocupacao: o.ocupacao, ocupacaoNome: nomeDaOcupacao(o), descritor: o.descritor, nivel: o.nivel,
      epicas: o.epicas.map(function (e) { return { ocupacao: e.ocupacao, nivel: e.nivel }; }),
      atributos: a, ferimentos: o.ferimentos, situacao: o.estado.situacao,
      caracteristicas: o.caracteristicas.map(function (x) { return C().CARACTERISTICAS[x.chave].nome + (x.quantidade ? " (" + x.quantidade + ")" : ""); }),
      efeitos: o.efeitos.map(function (e) { return { nome: e.nome, ate: e.ate, turnos: e.turnos }; }).slice(0, 12),
      protecoes: c.protecoes.filter(function (i) { return i.equipado; }).map(function (i) { return { id: i.id, nome: i.nome, atual: i.durabilidade ? i.durabilidade.atual : 0, original: i.durabilidade ? i.durabilidade.original : 0 }; }).slice(0, 8),
      armas: c.armas.map(function (i) { return { id: i.id, nome: i.nome, bonus: defDoItem(i).arma.bonus || 0, municao: i.municao ? { atual: i.municao.atual, max: i.municao.max } : null, recarregar: i.precisaRecarregar }; }).slice(0, 8),
      melhorArma: c.armas.reduce(function (m, i) { return Math.max(m, defDoItem(i).arma.bonus || 0); }, 0),
      usos: tecnicasDe(o).filter(function (t) { return t.uso === "dia"; }).map(function (t) { return { chave: t.chave, nome: t.nome, usado: usoDiario(o, t.chave) }; }),
      medo: o.opcoes.adaptacoes.cthulin ? o.adaptacoes.cthulin.medo : null,
      dia: o.tempo.dia,
    };
  }

  global.RAMAGoblins = {
    VERSAO_BLOCO: VERSAO_BLOCO, SITUACOES: SITUACOES, FIM: FIM, DURACOES: DURACOES,
    fichaVazia: fichaVazia, normalizar: normalizar, normalizarItem: normalizarItem, inteiro: inteiro, novoId: novoId, copiar: copiar, evento: evento, registrar: registrar,
    ativo: ativo, nomeDaOcupacao: nomeDaOcupacao, ocupacoesDe: ocupacoesDe, tecnicasDe: tecnicasDe, temTecnica: temTecnica, usoDiario: usoDiario,
    defDoItem: defDoItem, disponivel: disponivel, vestido: vestido, calcular: calcular, valor: valor, imuneAFogo: imuneAFogo, verificarFim: verificarFim,
    adicionarEfeito: function (o, def) { var ev = []; adicionarEfeito(o, def, ev); return ok(ev); }, removerEfeito: removerEfeito, temEfeito: temEfeito, expirar: expirar,
    iniciarBatalha: iniciarBatalha, fimDaBatalha: fimDaBatalha, fimDoTurno: fimDoTurno, novoDia: novoDia,
    ferimentosQueChegam: ferimentosQueChegam, sofrer: sofrer, curar: curar, esquivar: esquivar, receberAtaque: receberAtaque,
    montarTeste: montarTeste, testar: testar, deuRuim: deuRuim, posRolagem: posRolagem, continuarRolagem: continuarRolagem,
    montarAtaque: montarAtaque, atacar: atacar, recarregar: recarregar, reabastecer: reabastecer, pegarDeVolta: pegarDeVolta,
    magiasDisponiveis: magiasDisponiveis, montarConjuracao: montarConjuracao, conjurar: conjurar,
    usarTecnica: usarTecnica, receberEfeito: receberEfeito,
    derrotouOponente: derrotouOponente, ocupacoesLivres: ocupacoesLivres, escolherOcupacaoEpica: escolherOcupacaoEpica,
    novoItem: novoItem, adicionarItem: adicionarItem, restricaoDeUso: restricaoDeUso, equipar: equipar, removerItem: removerItem, marcarDestruido: marcarDestruido, usarItem: usarItem,
    passarMinuto: passarMinuto, bombaRelogio: bombaRelogio,
    receberMedo: receberMedo, verHorror: verHorror, descansarEmLugarSagrado: descansarEmLugarSagrado,
    gerarPraga: gerarPraga, statsDaPraga: statsDaPraga, procurarPraga: procurarPraga, capturarPraga: capturarPraga, verificarEvolucao: verificarEvolucao, ferirPraga: ferirPraga, ataqueDePraga: ataqueDePraga,
    gerarEstudante: gerarEstudante, adicionarEstudante: adicionarEstudante, conversar: conversar, perguntarSegredo: perguntarSegredo, agradar: agradar, mudarReacao: mudarReacao, tentarRomance: tentarRomance, resolverBriga: resolverBriga,
    coletar: coletar, plantar: plantar, colher: colher, guardarPeixe: guardarPeixe, construir: construir, cozinhar: cozinhar, heranca: heranca,
    sorteioDeNome: sorteioDeNome, sortearCaracteristicas: sortearCaracteristicas, criarAleatoria: criarAleatoria, rerrolarCaracteristica: rerrolarCaracteristica,
    pendencias: pendencias, concluirCriacao: concluirCriacao, novoParente: novoParente, corrigirSituacao: corrigirSituacao, voltarComoMortoVivo: voltarComoMortoVivo,
    aplicarOperacao: aplicarOperacao, resumoParaMesa: resumoParaMesa,
  };
})(typeof window !== "undefined" ? window : globalThis);
