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
