/* =====================================================================
   R.A.M.A. — Ordem Paranormal RPG II (Experimental) · a ficha (v9.0)
   ---------------------------------------------------------------------
   O bloco `ficha.ordem2`. Separado de propósito:

     base        os DADOS-BASE: atributos e perícias como estão na ficha
     efeitos     o que muda temporariamente (passos de Ímpeto, falha
                 crítica, contusão…), com expiração — nunca reescreve a base
     recursos    PV e PD (máximo impresso/decidido e atual), dano não letal
                 anotado à parte, pontos de armadura gastos
     estado      condições, lesões, traumas, pavor, contadores de cena,
                 testes pendentes, reservas de dados, usos
     procedencia de onde a ficha veio (preset, página, versão dos dados)
     escolhas    o que a criação guiada distribuiu

   PV e PD de uma ficha pronta são os IMPRESSOS; nada é calculado por
   fórmula. A guiada sugere 16/12, editáveis (decisão de mesa, não regra).

   v9.4: UMA regra (K().REGRAS, gravada em `regras`/`versaoRegras`); a
   ambientação (contemporâneo | vigília) só muda sugestões. Fichas antigas
   com `perfilRegras` migram aqui (normalizar), de forma repetível.
   (Histórico:) O perfil de regras (`alpha-contemporaneo` | `beta-vigilia`) era fixo
   na ficha; a campanha tem o dela, e a tela avisa quando divergem.

   Copiado para backend/Ordem2.gs (testes/gerar-ordem2-gs.js).
   ===================================================================== */

(function (global) {
  "use strict";

  function K() { return global.RAMAOrdem2Catalogo; }

  var VERSAO = 1;
  var MAX_OPS = 120;

  function texto(v, max) { return String(v === undefined || v === null ? "" : v).slice(0, max || 400); }
  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  function lista(v) { return Array.isArray(v) ? v : []; }
  function inteiro(v, min, max, padrao) {
    var n = Math.floor(Number(v));
    if (!isFinite(n)) n = padrao === undefined ? 0 : padrao;
    if (min !== undefined && n < min) n = min;
    if (max !== undefined && n > max) n = max;
    return n;
  }
  function copiar(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }

  /* Ids: o mesmo bloco roda no navegador e no Apps Script. */
  function novoId() {
    if (global.RAMAUtil && global.RAMAUtil.uuid) return global.RAMAUtil.uuid();
    if (typeof Utilities !== "undefined" && Utilities.getUuid) return Utilities.getUuid();
    return "o2-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e9).toString(36);
  }

  var FACES = [4, 6, 8, 10, 12, 20];
  function faces(v, padrao) {
    var n = inteiro(v, 0, 20, padrao || 4);
    return FACES.indexOf(n) >= 0 ? n : (padrao || 4);
  }
  /* v9.4: a ambientação (ou um perfil antigo, que vira a ambientação dele). */
  function ambValida(a) { return K().ambientacaoValida(a); }

  /* ---------------------------------------------------------------
     O VAZIO E A NORMALIZAÇÃO
     --------------------------------------------------------------- */
  function periciasBase() {
    return K().listaDePericias().map(function (p) { return { id: novoId(), chave: p.chave, especializacao: "", dado: 4, rotuloImpresso: "", atributoImpresso: "", origens: [] }; });
  }

  /* `ambientacao`: "contemporaneo" (padrão) ou "vigilia"; um perfil antigo
     ("alpha-contemporaneo"/"beta-vigilia") é aceito e vira a ambientação
     dele. A REGRA é uma só (K().REGRAS), registrada na ficha. */
  function fichaVazia(ambientacao) {
    var amb = ambValida(ambientacao);
    return {
      versao: VERSAO,
      regras: K().REGRAS.id, versaoRegras: K().REGRAS.versao,
      ambientacao: amb,
      migracao: null,
      modoCriacao: "livre",
      procedencia: null,
      escolhas: null,
      perfil: "",
      ocupacao: { id: "", nome: "", personalizada: false },
      nivel: 1,
      patamar: "",
      idade: "",
      resumo: "",
      historia: "",
      aparencia: "",
      base: { atributos: { fisico: 6, mente: 6, emocao: 6 }, pericias: periciasBase() },
      recursos: { pv: { max: 16, atual: 16 }, pd: { max: 12, atual: 12 }, naoLetal: 0, armaduraGasta: 0 },
      habilidades: [],
      itens: [],
      relacoes: [],
      efeitos: [],
      estado: estadoVazio(),
      historico: [],
      local: null,
      operacoes: [],
      /* v9.2: registros de evolução (separados dos impressos) e o bloco
         paranormal experimental (rituais conhecidos, em andamento, ativos). */
      evolucao: { nex: "", pendente: null, registros: [] },
      paranormal: { rituais: [], emAndamento: null, ativos: [], historico: [] },
    };
  }

  function estadoVazio() {
    return {
      inconsciente: false, moribundo: false, caido: false, morto: false, colapso: false,
      morteLenta: false, morteLentaRodada: null,
      lesoes: [], traumas: [],
      pavor: 0,
      testesLesao: 0, testesTrauma: 0,
      pendentes: [],
      reservas: [],
      acaoExtra: 0, perdeAcao: 0, /* 2: perde na próxima rodada; 1: nesta */
      usos: {},
      missaoLocal: 1,
    };
  }

  /* Aliases (v9.4): Bruxaria → Ocultismo, Inspecionar → Pesquisar,
     Ofício → `metalurgia`. Quando a chave muda por alias, a de origem
     fica em `origens` — os ganhos de evolução antigos apontam para ela.
     `origens[0]` é o caminho principal (o dado dele é `dado`); os outros
     guardam o próprio dado impresso (ficha que tinha Pesquisar E
     Inspecionar: uma perícia só, com as duas origens). */
  var ROTULO_DE_ALIAS = { inspecionar: "Inspecionar", bruxaria: "Bruxaria", oficio: "Ofício", "ofício": "Ofício" };
  function normalizarPericia(x) {
    var p = obj(x);
    var original = texto(p.chave, 40).toLowerCase();
    var chave = K().chaveDePericia(original);
    if (!chave) return null;
    var dado = faces(p.dado, 4);
    var origens = lista(p.origens).map(function (o) { var q = obj(o); var c = texto(q.chave, 40).toLowerCase(); return c ? { chave: c, dado: faces(q.dado, 4) } : null; }).filter(Boolean).slice(0, 4);
    if (!origens.length && original !== chave) origens = [{ chave: original, dado: dado }];
    if (origens.length) origens[0].dado = dado;
    return {
      id: texto(p.id, 80) || novoId(),
      chave: chave,
      especializacao: texto(p.especializacao, 40),
      dado: dado,
      rotuloImpresso: texto(p.rotuloImpresso, 60) || (original !== chave && ROTULO_DE_ALIAS[original] ? ROTULO_DE_ALIAS[original] : ""),
      atributoImpresso: texto(p.atributoImpresso, 20),
      origens: origens,
    };
  }
  /* Junta as perícias de uma ficha num caminho só: aliases que colidem
     viram UMA perícia (o maior dado impresso é o principal; as origens
     ficam), sem somar passos. Toda perícia da lista única existe (as que
     faltam entram destreinadas, d4, com id fixo — sem reabrir a criação). */
  function unirPericias(brutas, avisos) {
    var l = [], porChave = {};
    lista(brutas).forEach(function (x) {
      var q = normalizarPericia(x);
      if (!q) return;
      var k = q.chave + (q.chave === "aptidao" ? ":" + q.especializacao.toLowerCase() : "");
      var ja = porChave[k];
      if (avisos && q.origens.length && q.origens[0].chave !== q.chave && (ROTULO_DE_ALIAS[q.origens[0].chave] || q.origens[0].chave) !== K().nomeDaPericia(null, q.chave)) { var t = (ROTULO_DE_ALIAS[q.origens[0].chave] || q.origens[0].chave) + " agora se chama " + K().nomeDaPericia(null, q.chave) + " (a mesma perícia; o valor e os ganhos ficam)."; if (avisos.indexOf(t) < 0) avisos.push(t); }
      if (!ja) { porChave[k] = q; l.push(q); return; }
      /* colisão por alias (ex.: Pesquisar + Inspecionar) */
      var oa = ja.origens.length ? ja.origens : [{ chave: ja.chave, dado: ja.dado }];
      var ob = q.origens.length ? q.origens : [{ chave: q.chave, dado: q.dado }];
      var todas = oa.concat(ob.filter(function (o) { return !oa.some(function (z) { return z.chave === o.chave; }); }));
      todas.sort(function (a, b) { return b.dado - a.dado; });
      ja.origens = todas.slice(0, 4);
      ja.dado = ja.origens[0].dado;
      if (!ja.rotuloImpresso && q.rotuloImpresso) ja.rotuloImpresso = q.rotuloImpresso;
      if (avisos) avisos.push(K().nomeDaPericia(null, ja.chave) + ": as entradas " + ja.origens.map(function (o) { return o.chave; }).join(" e ") + " viraram uma só (vale o melhor valor; nada somado).");
    });
    var faltam = [];
    K().listaDePericias().forEach(function (d) {
      if (l.some(function (q) { return q.chave === d.chave; })) return;
      l.push({ id: "o2p-" + d.chave, chave: d.chave, especializacao: "", dado: 4, rotuloImpresso: "", atributoImpresso: "", origens: [] });
      faltam.push(d.nome);
    });
    if (avisos && faltam.length && brutas && brutas.length) avisos.push("Perícias da lista única acrescentadas como destreinadas (d4): " + faltam.join(", ") + ".");
    return l.slice(0, 60);
  }

  function normalizarHabilidade(x) {
    var h = obj(x);
    var ref = texto(h.ref, 60);
    var cat = K().HABILIDADES[ref];
    var e = obj(h.estado);
    return {
      id: texto(h.id, 80) || novoId(),
      ref: cat ? ref : "",
      nome: texto(h.nome || (cat ? cat.nome : ""), 80),
      texto: texto(h.texto || (cat ? cat.texto : ""), 1200),
      param: obj(copiar(h.param)),
      personalizada: !cat,
      origemEvolucao: texto(h.origemEvolucao, 80),
      estado: {
        espacos: inteiro(e.espacos, 0, 20),
        marcadores: inteiro(e.marcadores, 0, 20),
        reserva: lista(e.reserva).map(function (r) { var o = obj(r); return { id: texto(o.id, 80) || novoId(), faces: faces(o.faces, 4), alvo: texto(o.alvo, 120) }; }).slice(0, 8),
        indisponivel: e.indisponivel === true,
      },
    };
  }

  function normalizarItem(x) {
    var i = obj(x);
    var passos = {};
    /* Alias no modificador do item; dois aliases do mesmo bônus não somam. */
    Object.keys(obj(i.passos)).forEach(function (k) { var c = K().chaveDePericia(texto(k, 40)); if (passos[c] === undefined) passos[c] = inteiro(i.passos[k], -4, 4); });
    return {
      id: texto(i.id, 80) || novoId(),
      nome: texto(i.nome, 120) || "Item",
      tipo: i.tipo === "arma" ? "arma" : "item",
      alcance: i.alcance === "distancia" ? "distancia" : "corpo",
      dano: inteiro(i.dano, -10, 50),
      categoria: texto(i.categoria, 30),
      armadura: inteiro(i.armadura, 0, 20),
      passos: passos,
      vestido: i.vestido === true,
      quantidade: i.quantidade === undefined || i.quantidade === null ? null : inteiro(i.quantidade, 0, 999),
      consumivel: texto(i.consumivel, 30),
      efeitos: lista(i.efeitos).map(function (s) { return texto(s, 40); }).filter(Boolean).slice(0, 8),
      especial: texto(i.especial, 600),
      descricao: texto(i.descricao, 1200),
    };
  }

  function normalizarRelacao(x) {
    var r = obj(x);
    return {
      id: texto(r.id, 80) || novoId(),
      nome: texto(r.nome, 80),
      alvoPersonagemId: texto(r.alvoPersonagemId, 80),
      rotulo: texto(r.rotulo, 60),
      descricao: texto(r.descricao, 600),
      grau: [0, 1, 2, 3].indexOf(Number(r.grau)) >= 0 ? Number(r.grau) : 0,
      usadaEm: texto(r.usadaEm, 80),
    };
  }

  var TIPOS_EFEITO = ["passoAtributo", "passoPericia", "passoTodos", "dado", "acaoExtra"];
  var EXPIRA = ["teste", "rodada", "cena", "missao", "permanente"];
  function normalizarEfeito(x) {
    var e = obj(x);
    if (TIPOS_EFEITO.indexOf(e.tipo) < 0) return null;
    return {
      id: texto(e.id, 80) || novoId(),
      tipo: e.tipo,
      alvo: e.tipo === "passoPericia" ? K().chaveDePericia(texto(e.alvo, 40)) : texto(e.alvo, 40),
      n: inteiro(e.n, -4, 4),
      faces: e.faces ? faces(e.faces, 4) : 0,
      expira: EXPIRA.indexOf(e.expira) >= 0 ? e.expira : "cena",
      fonte: texto(e.fonte, 80),
      d20: e.d20 === true,
    };
  }

  function normalizarEstado(x) {
    var s = obj(x);
    var v = estadoVazio();
    ["inconsciente", "moribundo", "caido", "morto", "colapso", "morteLenta"].forEach(function (k) { v[k] = s[k] === true; });
    v.perdeAcao = s.perdeAcao === true ? 2 : inteiro(s.perdeAcao, 0, 2);
    v.morteLentaRodada = s.morteLentaRodada === null || s.morteLentaRodada === undefined ? null : inteiro(s.morteLentaRodada, 0, 100000);
    v.lesoes = lista(s.lesoes).map(function (l) { var o = obj(l); return { id: texto(o.id, 80) || novoId(), ref: texto(o.ref, 40), nome: texto(o.nome, 80), quando: texto(o.quando, 40) }; }).slice(0, 40);
    v.traumas = lista(s.traumas).map(function (l) { var o = obj(l); return { id: texto(o.id, 80) || novoId(), ref: texto(o.ref, 40), nome: texto(o.nome, 80), curado: o.curado === true, quando: texto(o.quando, 40) }; }).slice(0, 40);
    v.pavor = s.pavor ? faces(s.pavor, 6) : 0;
    v.testesLesao = inteiro(s.testesLesao, 0, 50);
    v.testesTrauma = inteiro(s.testesTrauma, 0, 50);
    v.pendentes = lista(s.pendentes).map(function (p) {
      var o = obj(p);
      if (["lesao", "trauma", "vigorAlpha", "disciplinaAlpha"].indexOf(o.tipo) < 0) return null;
      return { id: texto(o.id, 80) || novoId(), tipo: o.tipo, dt: inteiro(o.dt, 0, 99, 7), naoLetal: o.naoLetal === true, motivo: texto(o.motivo, 120) };
    }).filter(Boolean).slice(0, 10);
    v.reservas = lista(s.reservas).map(function (r) { var o = obj(r); return { id: texto(o.id, 80) || novoId(), faces: faces(o.faces, 6), fonte: texto(o.fonte, 80), expira: EXPIRA.indexOf(o.expira) >= 0 ? o.expira : "cena", alvo: texto(o.alvo, 120) }; }).slice(0, 16);
    v.acaoExtra = inteiro(s.acaoExtra, 0, 5);
    v.usos = {};
    Object.keys(obj(s.usos)).forEach(function (k) { v.usos[texto(k, 60)] = copiar(s.usos[k]); });
    v.missaoLocal = inteiro(s.missaoLocal, 1, 100000, 1);
    return v;
  }

  function normalizarMigracao(x) {
    if (!x || typeof x !== "object") return null;
    return { versao: inteiro(x.versao, 0, 99), de: texto(x.de, 40), quando: texto(x.quando, 40), avisos: lista(x.avisos).map(function (t) { return texto(t, 400); }).slice(0, 20), visto: x.visto === true };
  }
  /* A habilidade de perfil antiga vira a unificada: mesmo id de instância,
     nome e texto personalizados preservados; reservas incompatíveis
     expiram (sem reembolso); barra compatível não passa do novo limite. */
  function migrarHabilidade(x, avisos, originais) {
    var h = obj(x);
    var leg = K().HABILIDADES_LEGADAS[texto(h.ref, 60)];
    if (!leg) return normalizarHabilidade(h);
    var nova = K().HABILIDADES[leg.nova];
    var m = copiar(h);
    m.ref = leg.nova;
    if (!m.nome || m.nome === leg.nome) m.nome = nova.nome;
    if (!m.texto || m.texto === leg.texto) m.texto = nova.texto;
    var e = obj(m.estado);
    var notas = [];
    if (lista(e.reserva).length) { notas.push(lista(e.reserva).length + " dado(s) de Avaliação guardado(s) pela regra antiga expiraram"); e.reserva = []; }
    if (nova.motor.tipo === "impeto" && Number(e.espacos) > nova.motor.espacos) { e.espacos = nova.motor.espacos; notas.push("barra limitada a " + nova.motor.espacos); }
    if (nova.motor.tipo === "analise" && Number(e.marcadores) > nova.motor.maximo) e.marcadores = nova.motor.maximo;
    m.estado = e;
    if (originais && !originais.some(function (o) { return o.ref === h.ref; })) originais.push({ ref: h.ref, nome: leg.nome, texto: leg.texto, fonte: leg.fonte });
    if (avisos) avisos.push(nova.nome + (leg.nome !== nova.nome ? " (antes " + leg.nome + ")" : "") + ": agora com o efeito unificado — " + nova.texto + (notas.length ? " (" + notas.join("; ") + ".)" : ""));
    return normalizarHabilidade(m);
  }

  function normalizarProcedencia(x) {
    if (!x || typeof x !== "object") return null;
    var p = obj(x);
    var impressos = {};
    Object.keys(obj(p.atributosImpressos)).forEach(function (k) { impressos[texto(k, 40)] = texto(p.atributosImpressos[k], 30); });
    return {
      preset: texto(p.preset, 40), nome: texto(p.nome, 120), fonte: texto(p.fonte, 40), pagina: p.pagina ? inteiro(p.pagina, 1, 999) : null,
      versaoDados: inteiro(p.versaoDados, 0, 9999), copiadoEm: texto(p.copiadoEm, 40), atributosImpressos: impressos,
      /* v9.4: o playtest de origem (Fonte) e o texto ORIGINAL das
         habilidades que mudaram para o efeito unificado. */
      origem: p.origem === "alpha" || p.origem === "beta" ? p.origem : "",
      habilidadesOriginais: lista(p.habilidadesOriginais).map(function (h) { var o = obj(h); return { ref: texto(o.ref, 60), nome: texto(o.nome, 80), texto: texto(o.texto, 1200), fonte: texto(o.fonte, 40) }; }).slice(0, 12),
    };
  }

  /* A normalização é também a MIGRAÇÃO (v9.4), repetível: uma ficha sem
     `versaoRegras` (v9.0–9.3, com `perfilRegras`) passa ao caminho único
     — a ambientação e a procedência ficam; o perfil antigo vai para
     `migracao.de`. Um pedido que traga o perfil antigo não muda regra
     nenhuma: o campo é só lido como legado. */
  function normalizar(bruto) {
    var b = obj(bruto);
    var legada = !(Number(b.versaoRegras) >= K().REGRAS.versao);
    var de = K().PERFIS_REGRAS[b.perfilRegras] ? b.perfilRegras : "";
    var v = fichaVazia(K().AMBIENTACOES[b.ambientacao] ? b.ambientacao : (de || "contemporaneo"));
    var avisos = [], originais = [];
    v.modoCriacao = ["pronta", "livre", "guiada"].indexOf(b.modoCriacao) >= 0 ? b.modoCriacao : "livre";
    v.procedencia = normalizarProcedencia(b.procedencia);
    v.escolhas = b.escolhas && typeof b.escolhas === "object" ? copiar(b.escolhas) : null;
    v.perfil = K().PERFIS[b.perfil] ? b.perfil : "";
    var oc = obj(b.ocupacao);
    v.ocupacao = { id: texto(oc.id, 40), nome: texto(oc.nome, 80), personalizada: oc.personalizada === true };
    v.nivel = inteiro(b.nivel, 1, 10, 1);
    v.patamar = K().PATAMARES[b.patamar] ? b.patamar : "";
    v.idade = texto(b.idade, 20);
    v.resumo = texto(b.resumo, 600);
    v.historia = texto(b.historia, 6000);
    v.aparencia = texto(b.aparencia, 2000);
    var base = obj(b.base);
    var at = obj(base.atributos);
    v.base.atributos = { fisico: faces(at.fisico, 6), mente: faces(at.mente, 6), emocao: faces(at.emocao, 6) };
    v.base.pericias = unirPericias(Array.isArray(base.pericias) ? base.pericias : [], legada ? avisos : null);
    var r = obj(b.recursos);
    var pv = obj(r.pv), pd = obj(r.pd);
    v.recursos.pv.max = inteiro(pv.max, 1, 999, 16);
    v.recursos.pv.atual = inteiro(pv.atual === undefined ? v.recursos.pv.max : pv.atual, 0, 999);
    v.recursos.pd.max = inteiro(pd.max, 1, 999, 12);
    v.recursos.pd.atual = inteiro(pd.atual === undefined ? v.recursos.pd.max : pd.atual, 0, 999);
    v.recursos.naoLetal = inteiro(r.naoLetal, 0, 999);
    v.recursos.armaduraGasta = inteiro(r.armaduraGasta, 0, 99);
    v.habilidades = lista(b.habilidades).map(function (h) { return migrarHabilidade(h, avisos, originais); }).slice(0, 40);
    v.itens = lista(b.itens).map(normalizarItem).slice(0, 80);
    v.relacoes = lista(b.relacoes).map(normalizarRelacao).slice(0, 24);
    /* Dois aliases do mesmo efeito não aplicam duas vezes. */
    var chavesEf = {};
    v.efeitos = lista(b.efeitos).map(normalizarEfeito).filter(Boolean).filter(function (e) { var k = [e.tipo, e.alvo, e.n, e.expira, e.fonte].join("|"); if (chavesEf[k]) return false; chavesEf[k] = true; return true; }).slice(0, 40);
    v.estado = normalizarEstado(b.estado);
    v.historico = lista(b.historico).map(function (h) { var o = obj(h); return { quando: texto(o.quando, 40), tipo: texto(o.tipo, 30), texto: texto(o.texto, 400), corrigido: o.corrigido === true }; }).slice(-80);
    v.local = b.local && typeof b.local === "object" ? (global.RAMAOrdem2Mesa ? global.RAMAOrdem2Mesa.normalizar(b.local) : copiar(b.local)) : null;
    v.operacoes = lista(b.operacoes).map(function (x) { return texto(x, 80); }).filter(Boolean).slice(-MAX_OPS);
    v.evolucao = global.RAMAOrdem2Evolucao ? global.RAMAOrdem2Evolucao.normalizar(b.evolucao) : (b.evolucao && typeof b.evolucao === "object" ? copiar(b.evolucao) : v.evolucao);
    v.paranormal = global.RAMAOrdem2Paranormal ? global.RAMAOrdem2Paranormal.normalizarBloco(b.paranormal) : (b.paranormal && typeof b.paranormal === "object" ? copiar(b.paranormal) : v.paranormal);
    if (originais.length) {
      if (!v.procedencia) v.procedencia = normalizarProcedencia({ nome: "", origem: de === "alpha-contemporaneo" ? "alpha" : de === "beta-vigilia" ? "beta" : "" });
      originais.forEach(function (o) { if (!v.procedencia.habilidadesOriginais.some(function (x) { return x.ref === o.ref; })) v.procedencia.habilidadesOriginais.push(o); });
    }
    if (v.procedencia && !v.procedencia.origem && de) v.procedencia.origem = de === "alpha-contemporaneo" ? "alpha" : "beta";
    v.migracao = legada
      ? { versao: K().REGRAS.versao, de: de, quando: new Date().toISOString(), avisos: avisos.slice(0, 20), visto: !avisos.length }
      : normalizarMigracao(b.migracao);
    /* Atual nunca acima do máximo efetivo. */
    v.recursos.pv.atual = Math.min(v.recursos.pv.atual, pvMax(v));
    v.recursos.pd.atual = Math.min(v.recursos.pd.atual, pdMax(v));
    return v;
  }

  /* ---------------------------------------------------------------
     O QUE A FICHA É AGORA (base + efeitos + itens + estado)
     --------------------------------------------------------------- */
  function habilidadePorRef(b, ref) { return lista(b.habilidades).filter(function (h) { return h.ref === ref; })[0] || null; }
  function temHabilidade(b, ref) { return !!habilidadePorRef(b, ref); }
  /* O motor de uma habilidade, com os parâmetros próprios da ficha
     (Foco Mental de Alan: 2 PD/+d4; de Amanda: 4 PD/+d8). */
  function motorDe(h) {
    var cat = K().HABILIDADES[h.ref];
    if (!cat || !cat.motor) return null;
    var m = copiar(cat.motor);
    Object.keys(obj(h.param)).forEach(function (k) { m[k] = h.param[k]; });
    return m;
  }
  function habilidadesDoTipo(b, tipo) {
    return lista(b.habilidades).filter(function (h) { var m = motorDe(h); return m && m.tipo === tipo; });
  }

  /* Por id, pela chave ou por um alias (inspecionar, bruxaria, ofício). */
  function pericia(b, idOuChave) {
    var l = lista(b.base.pericias);
    var c = K().chaveDePericia(idOuChave);
    return l.filter(function (p) { return p.id === idOuChave; })[0] ||
      l.filter(function (p) { return p.chave === c; })[0] || null;
  }
  function atributoBase(b, chave) {
    var p = K().pericia(null, chave);
    return p ? p.atributo : "mente";
  }
  function nomeDaPericia(b, p) {
    var n = K().nomeDaPericia(null, p.chave);
    return p.especializacao && p.chave === "aptidao" ? n + " (" + p.especializacao + ")" : n;
  }

  function passoDado(f, n, permitir20) {
    var D = [4, 6, 8, 10, 12];
    if (f === 20) return n < 0 ? passoDado(12, n + 1, permitir20) : 20;
    var i = D.indexOf(f);
    if (i < 0) i = 0;
    var j = i + n;
    if (j < 0) j = 0;
    if (j > 4) return permitir20 ? 20 : 12;
    return D[j];
  }

  /* Passos permanentes de itens vestidos (cota: Furtividade −1; elmo:
     Percepção −1). */
  function passosDeItens(b, periciaChave) {
    var n = 0;
    lista(b.itens).forEach(function (i) { if (i.vestido && i.passos && i.passos[periciaChave]) n += i.passos[periciaChave]; });
    return n;
  }
  function passosDeEfeitos(b, tipo, alvo) {
    var n = 0, d20 = false;
    lista(b.efeitos).forEach(function (e) {
      if (e.tipo === tipo && (e.alvo === alvo || !alvo)) { n += e.n; if (e.d20) d20 = true; }
    });
    return { n: n, d20: d20 };
  }
  /* Evolução (v9.2): os passos dos registros vivos entram como passos
     permanentes — o valor impresso em `base` não muda. */
  function EV() { return global.RAMAOrdem2Evolucao; }
  function dadoDoAtributo(b, chave) {
    var e = passosDeEfeitos(b, "passoAtributo", chave);
    var base = b.evolucao && EV() ? EV().permanenteAtributo(b, chave) : (b.base.atributos[chave] || 6);
    if (b.base.atributos[chave] === 20) base = 20;
    return passoDado(base, e.n, e.d20);
  }
  function dadoDaPericia(b, p) {
    if (!p) return 4;
    var e = passosDeEfeitos(b, "passoPericia", p.chave);
    var base = b.evolucao && EV() && p.dado !== 20 ? EV().permanentePericia(b, p) : p.dado;
    return passoDado(base, e.n + passosDeItens(b, p.chave), e.d20);
  }

  /* Modificadores NUMÉRICOS de lesões e traumas (ver DIVERGENCIAS). */
  function modificadorNumerico(b, periciaChave, atributo) {
    var n = 0, partes = [];
    lista(b.estado.lesoes).forEach(function (l) {
      var t = K().LESOES.filter(function (x) { return x.id === l.ref; })[0];
      if (t && t.efeito && t.efeito.tipo === "modPericia" && t.efeito.pericias[periciaChave]) { n += t.efeito.pericias[periciaChave]; partes.push(t.nome); }
    });
    lista(b.estado.traumas).forEach(function (l) {
      if (l.curado) return;
      var t = K().TRAUMAS.filter(function (x) { return x.id === l.ref; })[0];
      if (!t || !t.efeito) return;
      if (t.efeito.tipo === "modPericia" && t.efeito.pericias[periciaChave]) { n += t.efeito.pericias[periciaChave]; partes.push(t.nome); }
      if (t.efeito.tipo === "modAtributo" && t.efeito.atributo === atributo) { n += t.efeito.valor; partes.push(t.nome); }
    });
    return { valor: n, fontes: partes };
  }

  function pvMax(b) {
    var n = b.recursos.pv.max + (b.evolucao && EV() ? EV().extra(b, "pv") : 0);
    lista(b.estado && b.estado.lesoes).forEach(function (l) { if (l.ref === "laceracao") n -= 2; });
    return Math.max(1, n);
  }
  function pdMax(b) {
    var n = b.recursos.pd.max + (b.evolucao && EV() ? EV().extra(b, "pd") : 0);
    lista(b.estado && b.estado.traumas).forEach(function (l) { if (l.ref === "chaga" && !l.curado) n -= 2; });
    return Math.max(1, n);
  }
  /* Pontos de armadura: os dos itens vestidos (+1 com Segredo do Aço). */
  function armaduraMax(b) {
    var n = 0, vestindo = false;
    lista(b.itens).forEach(function (i) { if (i.vestido && i.armadura > 0) { n += i.armadura; vestindo = true; } });
    if (vestindo) habilidadesDoTipo(b, "armaduraExtra").forEach(function (h) { n += Number(motorDe(h).valor) || 1; });
    return n;
  }
  function armaduraAtual(b) { return Math.max(0, armaduraMax(b) - b.recursos.armaduraGasta); }

  function condicoes(b) {
    var s = b.estado, l = [];
    if (s.morto) l.push("morto");
    if (s.colapso) l.push("colapso");
    if (s.morteLenta) l.push("morteLenta");
    if (s.moribundo) l.push("moribundo");
    if (s.inconsciente) l.push("inconsciente");
    if (s.caido) l.push("caido");
    if (s.pavor) l.push("pavor");
    if (s.perdeAcao) l.push("perdeAcao");
    return l;
  }
  var NOMES_CONDICAO = { morto: "Morto", colapso: "Colapso total", morteLenta: "Morte lenta", moribundo: "Moribundo", inconsciente: "Inconsciente", caido: "Caído", pavor: "Pavor", perdeAcao: "Perde a próxima ação" };

  /* ---------------------------------------------------------------
     CRIAÇÃO
     --------------------------------------------------------------- */
  function habilidadeDoCatalogo(ref, param) {
    var cat = K().HABILIDADES[ref];
    return normalizarHabilidade({ id: novoId(), ref: ref, nome: cat ? cat.nome : ref, texto: cat ? cat.texto : "", param: param || {} });
  }

  /* Uma CÓPIA de um preset: ids próprios, procedência e os números
     impressos. Nada é recalculado. */
  function dePreset(id, agora) {
    var p = K().preset(id);
    if (!p) return null;
    var v = fichaVazia(K().PERFIS_REGRAS[p.perfilRegras].ambientacao);
    v.modoCriacao = "pronta";
    var originais = p.habilidades.filter(function (h) { return K().HABILIDADES_LEGADAS[h.id]; }).map(function (h) { var l = K().HABILIDADES_LEGADAS[h.id]; return { ref: h.id, nome: l.nome, texto: l.texto, fonte: l.fonte }; });
    v.procedencia = { preset: p.id, nome: p.nome, fonte: p.fonte, pagina: p.pagina || null, versaoDados: K().VERSAO_DADOS, copiadoEm: agora || new Date().toISOString(), atributosImpressos: copiar(p.atributosImpressos || {}), origem: K().PERFIS_REGRAS[p.perfilRegras].fonte, habilidadesOriginais: originais };
    v.perfil = p.perfil;
    var oc = K().OCUPACOES.filter(function (o) { return o.nome === p.ocupacao; })[0];
    v.ocupacao = { id: oc ? oc.id : "", nome: p.ocupacao, personalizada: !oc };
    v.nivel = p.nivel;
    v.idade = p.idade ? String(p.idade) : "";
    v.resumo = p.resumo || "";
    v.base.atributos = copiar(p.atributos);
    /* A chave já entra unificada (a cópia não precisa de "origens"); o
       rótulo impresso (Inspecionar, Ofício…) fica. */
    v.base.pericias = unirPericias(p.pericias.map(function (x) {
      var ch = K().chaveDePericia(x.chave);
      var e = normalizarPericia(Object.assign({ id: novoId() }, x, { chave: ch, rotuloImpresso: x.rotuloImpresso || (ch !== x.chave && ROTULO_DE_ALIAS[x.chave] ? ROTULO_DE_ALIAS[x.chave] : "") }));
      if (p.atributosImpressos && p.atributosImpressos[x.chave]) e.atributoImpresso = p.atributosImpressos[x.chave];
      return e;
    }), null);
    v.recursos = { pv: { max: p.pv, atual: p.pv }, pd: { max: p.pd, atual: p.pd }, naoLetal: 0, armaduraGasta: 0 };
    v.habilidades = p.habilidades.map(function (h) { return habilidadeDoCatalogo(K().refDeHabilidade(h.id), h.param); });
    v.itens = p.itens.map(function (i) { return normalizarItem(Object.assign({ id: novoId() }, i)); });
    v.relacoes = p.relacoes.map(function (r) { return normalizarRelacao(Object.assign({ id: novoId() }, r)); });
    return normalizar(v);
  }

  /* A criação guiada (experimental): confere a distribuição. */
  var GUIADA = { nivel: 1, atributoInicial: 6, passosAtributo: 2, tetoAtributo: 10, periciaInicial: 4, passosPericia: 8, tetoPericia: 8, pv: 16, pd: 12 };
  function passosEntre(de, ate) { var D = [4, 6, 8, 10, 12]; return D.indexOf(ate) - D.indexOf(de); }
  function conferirGuiada(o) {
    var erros = [];
    var at = obj(o.atributos);
    var gastosA = 0;
    K().ORDEM_ATRIBUTOS.forEach(function (k) {
      var f = faces(at[k], 6);
      if (f === 20) erros.push("d20 não é permitido na criação guiada.");
      var n = passosEntre(GUIADA.atributoInicial, f);
      if (n < 0) erros.push(K().ATRIBUTOS[k].nome + " não pode ficar abaixo de d6 na guiada.");
      if (f > GUIADA.tetoAtributo) erros.push(K().ATRIBUTOS[k].nome + ": o teto da guiada é d10.");
      gastosA += Math.max(0, n);
    });
    if (gastosA > GUIADA.passosAtributo) erros.push("Atributos: " + gastosA + " passos usados de " + GUIADA.passosAtributo + ".");
    var gastosP = 0;
    lista(o.pericias).forEach(function (p) {
      var f = faces(p.dado, 4);
      if (f === 20) erros.push("d20 não é permitido na criação guiada.");
      if (f > GUIADA.tetoPericia) erros.push("Perícias: o teto da guiada é d8 por entrada.");
      gastosP += Math.max(0, passosEntre(GUIADA.periciaInicial, f));
    });
    if (gastosP > GUIADA.passosPericia) erros.push("Perícias: " + gastosP + " passos usados de " + GUIADA.passosPericia + ".");
    if (!K().PERFIS[o.perfil]) erros.push("Escolha o perfil.");
    if (!texto(o.ocupacaoNome).trim()) erros.push("Escolha ou escreva a ocupação.");
    return { ok: !erros.length, erros: erros.filter(function (e, i, t) { return t.indexOf(e) === i; }), passosAtributo: gastosA, passosPericia: gastosP };
  }
  function deGuiada(o) {
    var c = conferirGuiada(o);
    if (!c.ok) return { ok: false, erros: c.erros };
    var v = fichaVazia(o.ambientacao || o.perfilRegras);
    v.modoCriacao = "guiada";
    v.perfil = o.perfil;
    var oc = K().ocupacao(o.ocupacaoId);
    v.ocupacao = { id: oc ? oc.id : "", nome: texto(o.ocupacaoNome, 80), personalizada: !oc };
    v.nivel = GUIADA.nivel;
    v.base.atributos = { fisico: faces(o.atributos.fisico, 6), mente: faces(o.atributos.mente, 6), emocao: faces(o.atributos.emocao, 6) };
    v.base.pericias = unirPericias(lista(o.pericias), null);
    var pv = inteiro(o.pv, 1, 999, GUIADA.pv), pd = inteiro(o.pd, 1, 999, GUIADA.pd);
    v.recursos = { pv: { max: pv, atual: pv }, pd: { max: pd, atual: pd }, naoLetal: 0, armaduraGasta: 0 };
    var habs = [];
    var dePerfil = K().HABILIDADE_DE_PERFIL[o.perfil];
    if (dePerfil) habs.push(habilidadeDoCatalogo(dePerfil));
    var daOc = K().refDeHabilidade(texto(o.habilidadeOcupacao, 60));
    if (daOc && K().HABILIDADES[daOc] && daOc !== dePerfil) habs.push(habilidadeDoCatalogo(daOc));
    v.habilidades = habs;
    v.escolhas = { passosAtributo: c.passosAtributo, passosPericia: c.passosPericia, pvPdReferencia: { pv: GUIADA.pv, pd: GUIADA.pd, editados: pv !== GUIADA.pv || pd !== GUIADA.pd }, habilidadeOcupacao: daOc || "", habilidadeOcupacaoDocumentada: !!(oc && oc.habilidade && oc.habilidade === daOc) };
    v.nivel = 1;
    return { ok: true, bloco: normalizar(v) };
  }

  /* ---------------------------------------------------------------
     O RESUMO QUE A MESA LÊ
     --------------------------------------------------------------- */
  function resumoParaMesa(bruto) {
    var b = normalizar(bruto);
    return {
      ambientacao: b.ambientacao,
      perfil: b.perfil, perfilNome: b.perfil ? K().PERFIS[b.perfil].nome : "",
      ocupacao: b.ocupacao.nome, nivel: b.nivel,
      atributos: { fisico: dadoDoAtributo(b, "fisico"), mente: dadoDoAtributo(b, "mente"), emocao: dadoDoAtributo(b, "emocao") },
      pv: { atual: b.recursos.pv.atual, max: pvMax(b), naoLetal: b.recursos.naoLetal },
      pd: { atual: b.recursos.pd.atual, max: pdMax(b) },
      armadura: { atual: armaduraAtual(b), max: armaduraMax(b) },
      pavor: b.estado.pavor,
      condicoes: condicoes(b),
      lesoes: b.estado.lesoes.length,
      traumas: b.estado.traumas.filter(function (t) { return !t.curado; }).length,
      preset: b.procedencia ? b.procedencia.preset : "",
      evolucao: global.RAMAOrdem2Evolucao ? global.RAMAOrdem2Evolucao.resumo(b) : null,
      paranormal: global.RAMAOrdem2Paranormal ? global.RAMAOrdem2Paranormal.resumo(b) : null,
    };
  }

  /* Uma alteração com id: repetir o mesmo id não aplica de novo. */
  function aplicarOperacao(b, opId, fn) {
    if (opId && b.operacoes.indexOf(opId) >= 0) return { ok: true, repetida: true, eventos: [] };
    var copia = copiar(b);
    var r = fn(copia) || { ok: true };
    if (r.ok === false) return r;
    Object.keys(copia).forEach(function (k) { b[k] = copia[k]; });
    if (opId) { b.operacoes.push(opId); b.operacoes = b.operacoes.slice(-MAX_OPS); }
    return r;
  }

  /* O preset mudou desde a cópia? Só para AVISAR — a ficha não muda. */
  function presetDesatualizado(b) {
    return !!(b.procedencia && b.procedencia.preset && b.procedencia.versaoDados && b.procedencia.versaoDados !== K().VERSAO_DADOS);
  }

  global.RAMAOrdem2 = {
    VERSAO: VERSAO,
    fichaVazia: fichaVazia,
    normalizar: normalizar,
    estadoVazio: estadoVazio,
    normalizarItem: normalizarItem, normalizarRelacao: normalizarRelacao, normalizarHabilidade: normalizarHabilidade, normalizarEfeito: normalizarEfeito, normalizarPericia: normalizarPericia,
    novoId: novoId, copiar: copiar, inteiro: inteiro, texto: texto, faces: faces,
    pericia: pericia, atributoBase: atributoBase, nomeDaPericia: nomeDaPericia,
    passoDado: passoDado, dadoDoAtributo: dadoDoAtributo, dadoDaPericia: dadoDaPericia,
    modificadorNumerico: modificadorNumerico,
    pvMax: pvMax, pdMax: pdMax, armaduraMax: armaduraMax, armaduraAtual: armaduraAtual,
    condicoes: condicoes, NOMES_CONDICAO: NOMES_CONDICAO,
    habilidadePorRef: habilidadePorRef, temHabilidade: temHabilidade, motorDe: motorDe, habilidadesDoTipo: habilidadesDoTipo,
    habilidadeDoCatalogo: habilidadeDoCatalogo,
    dePreset: dePreset, GUIADA: GUIADA, conferirGuiada: conferirGuiada, deGuiada: deGuiada,
    resumoParaMesa: resumoParaMesa, aplicarOperacao: aplicarOperacao, presetDesatualizado: presetDesatualizado,
  };
})(typeof window !== "undefined" ? window : globalThis);
