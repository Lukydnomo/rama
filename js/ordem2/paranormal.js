/* =====================================================================
   R.A.M.A. — Ordem Paranormal RPG II · paranormal (v9.2)
   Experimental — regra do R.A.M.A.
   ---------------------------------------------------------------------
   O QUE O TEXTO DIZ: o Beta (p. 2) anuncia um sistema paranormal —
   rituais, poderes, objetos amaldiçoados — que NÃO está nos playtests;
   d20 só vem do paranormal (Alpha p. 16; Beta p. 8). A gruta (Beta pp.
   60–71) é o PROCEDIMENTO de uma aventura (encaixar runas acende a
   chama), não um modo geral de conjurar; o ritual de um handout e a
   classificação do compêndio também não são prova de custo.

   Por isso, três classes de entrada, sempre separadas:
     procedimento   documentado numa missão: joga-se pelo desafio da cena
                    (runas etc.), nunca pela conjuração livre
     consulta       referência sem automação (objeto, manifestação)
     experimental   criado pelo Mestre para o MÓDULO EXPERIMENTAL — este
                    sim conjurável, e só com o módulo ligado

   O MÓDULO (desligado por padrão; o Mestre liga na campanha):
     imediato    consome a ação indicada; Mente + Ocultismo/Bruxaria
     elaborado   etapas, componentes e ordem; teste na execução final
     DT e custo  rascunho ajustável: simples 7/1 PD, intermediário 10/3,
                 complexo 13/5 (campanha e ritual mudam)
     custo       cobrado UMA vez na confirmação da execução, também na
                 falha; repetir a mesma operação (opId) não cobra de novo
     efeitos     normal, crítico, falha e falha crítica separados; sem
                 efeito configurado, vai para o Mestre (nada inventado)
     forçar      opcional: antes da rolagem, 2 PV por +1 passo num dado
                 do teste, uma vez; preço e vantagem editáveis; risco de
                 pavor ou consumo de componente como ALTERNATIVA explícita
     elemento    descreve; não concede efeito sozinho
   Nada de círculo, afinidade, custo ou NEX de Ordem I.

   Desligar o módulo bloqueia conjurações novas e preserva rituais,
   histórico e efeitos ativos (o Mestre finaliza ou encerra à mão).
   Copiado para backend/Ordem2.gs (testes/gerar-ordem2-gs.js).
   ===================================================================== */

(function (global) {
  "use strict";

  function K() { return global.RAMAOrdem2Catalogo; }
  function R() { return global.RAMAOrdem2; }
  function M() { return global.RAMAOrdem2Motor; }
  function ME() { return global.RAMAOrdem2Mesa; }
  function P() { return global.RAMAOrdem2Proc; }
  function lista(v) { return Array.isArray(v) ? v : []; }
  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  function texto(v, n) { return String(v === undefined || v === null ? "" : v).slice(0, n || 200); }
  function inteiro(v, a, b, p) { var n = Math.floor(Number(v)); if (!Number.isFinite(n)) return p === undefined ? a : p; return Math.max(a, Math.min(b, n)); }
  function copiar(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
  function id() { return R().novoId(); }
  function agora() { return new Date().toISOString(); }

  var SELO = "Experimental — regra do R.A.M.A.";
  var ELEMENTOS = ["Sangue", "Morte", "Conhecimento", "Energia", "Medo"];
  var TIPOS = { ritual: "Ritual", poder: "Poder", objeto: "Objeto amaldiçoado" };
  var CLASSES = { experimental: "Experimental (conjurável com o módulo ligado)", procedimento: "Procedimento de missão (joga-se pela cena)", consulta: "Consulta (sem automação)" };
  var COMPLEXIDADES = { simples: "Simples", intermediario: "Intermediário", complexo: "Complexo" };
  var MODOS = { imediato: "Imediato", elaborado: "Elaborado" };
  var DURACOES = { instantaneo: "Instantâneo", rodada: "Até o fim da rodada", cena: "A cena", missao: "A missão", permanente: "Permanente (até encerrar)" };
  var ALVOS = { proprio: "Quem conjura", um: "Um alvo", varios: "Vários alvos", area: "Área (o Mestre escolhe)" };
  var TIPOS_EFEITO = { dano: "Dano", cura: "Cura", condicao: "Condição", passo: "Passo num dado", dado: "Dado bônus guardado", marcador: "Marcador", mestre: "Decisão do Mestre" };
  var RESULTADOS = ["normal", "critico", "falha", "falhaCritica"];
  var CONDICOES = ["caido", "perdeAcao", "inconsciente"];

  /* O rascunho da campanha (todos ajustáveis). */
  function configPadrao() {
    return {
      ativo: false,
      atributo: "mente", pericia: "ocultismo",
      dts: { simples: 7, intermediario: 10, complexo: 13 },
      custos: { simples: 1, intermediario: 3, complexo: 5 },
      forcar: { permitido: false, pv: 2, passos: 1, alternativa: "pv" }, /* pv | pavor | componente */
    };
  }
  function normalizarConfig(x) {
    var c = obj(x), v = configPadrao();
    v.ativo = c.ativo === true;
    v.atributo = K().ATRIBUTOS[c.atributo] ? c.atributo : "mente";
    v.pericia = texto(c.pericia, 40) || "ocultismo";
    var d = obj(c.dts), q = obj(c.custos), f = obj(c.forcar);
    Object.keys(v.dts).forEach(function (k) { v.dts[k] = inteiro(d[k], 0, 40, v.dts[k]); v.custos[k] = inteiro(q[k], 0, 40, v.custos[k]); });
    v.forcar = { permitido: f.permitido === true, pv: inteiro(f.pv, 0, 20, 2), passos: inteiro(f.passos, 1, 2, 1), alternativa: ["pv", "pavor", "componente"].indexOf(f.alternativa) >= 0 ? f.alternativa : "pv" };
    return v;
  }

  function normalizarEfeito(x) {
    var e = obj(x);
    if (!TIPOS_EFEITO[e.tipo]) return null;
    return {
      tipo: e.tipo, valor: texto(e.valor, 20), recurso: e.recurso === "pd" ? "pd" : "pv", danoTipo: e.danoTipo === "emocional" ? "emocional" : "fisico",
      condicao: CONDICOES.indexOf(e.condicao) >= 0 ? e.condicao : "", alvoDado: e.alvoDado === "atributo" || e.alvoDado === "todos" ? e.alvoDado : "pericia", chave: texto(e.chave, 40),
      n: inteiro(e.n, -4, 4, 1), faces: [4, 6, 8, 10, 12, 20].indexOf(Number(e.faces)) >= 0 ? Number(e.faces) : 0, d20: e.d20 === true,
      duracao: DURACOES[e.duracao] ? e.duracao : "", quem: e.quem === "proprio" ? "proprio" : "alvo", texto: texto(e.texto, 600),
    };
  }
  function normalizarEntrada(x) {
    var r = obj(x);
    var nome = texto(r.nome, 120);
    if (!nome) return null;
    var ef = obj(r.efeitos), efeitos = {};
    RESULTADOS.forEach(function (k) { efeitos[k] = lista(ef[k]).map(normalizarEfeito).filter(Boolean).slice(0, 6); });
    return {
      id: texto(r.id, 80) || id(), nome: nome, tipo: TIPOS[r.tipo] ? r.tipo : "ritual", classe: CLASSES[r.classe] ? r.classe : "experimental",
      modo: MODOS[r.modo] ? r.modo : "imediato", complexidade: COMPLEXIDADES[r.complexidade] ? r.complexidade : "simples",
      elementos: lista(r.elementos).filter(function (e) { return ELEMENTOS.indexOf(e) >= 0; }).slice(0, 5),
      escopo: texto(r.escopo, 120), tempo: texto(r.tempo, 60), acao: texto(r.acao, 60) || "uma ação", alcance: texto(r.alcance, 60),
      alvo: ALVOS[r.alvo] ? r.alvo : "um", duracao: DURACOES[r.duracao] ? r.duracao : "instantaneo", gatilho: texto(r.gatilho, 200),
      componentes: lista(r.componentes).map(function (c) { var o = obj(c); return texto(o.nome, 80) ? { nome: texto(o.nome, 80), consome: o.consome === true, etapa: inteiro(o.etapa, 0, 20, 0), item: texto(o.item, 80) } : null; }).filter(Boolean).slice(0, 10),
      etapas: lista(r.etapas).map(function (t) { var o = obj(t); return texto(o.nome, 80) ? { nome: texto(o.nome, 80), acao: texto(o.acao, 60) } : null; }).filter(Boolean).slice(0, 10),
      testePorEtapa: r.testePorEtapa === true, interrompeComDano: r.interrompeComDano !== false,
      dt: r.dt === null || r.dt === undefined || r.dt === "" ? null : inteiro(r.dt, 0, 40, 7),
      custoPd: r.custoPd === null || r.custoPd === undefined || r.custoPd === "" ? null : inteiro(r.custoPd, 0, 40, 1),
      custoPv: inteiro(r.custoPv, 0, 40, 0),
      forcar: r.forcar && typeof r.forcar === "object" ? { pv: inteiro(r.forcar.pv, 0, 20, 2), passos: inteiro(r.forcar.passos, 1, 2, 1), alternativa: ["pv", "pavor", "componente"].indexOf(r.forcar.alternativa) >= 0 ? r.forcar.alternativa : "pv" } : null,
      efeitos: efeitos,
      referencias: lista(r.referencias).map(function (f) { var o = obj(f); return texto(o.fonte, 80) ? { fonte: texto(o.fonte, 80), pagina: texto(o.pagina, 20), nota: texto(o.nota, 300) } : null; }).filter(Boolean).slice(0, 8),
      notas: texto(r.notas, 2000),
      historico: lista(r.historico).map(function (h) { return texto(h, 300); }).slice(-30),
      origem: texto(r.origem, 80), versao: inteiro(r.versao, 1, 9999, 1),
    };
  }
  /* O bloco da ficha: rituais conhecidos (cópias), em andamento, ativos. */
  function normalizarBloco(x) {
    var b = obj(x);
    var em = b.emAndamento && typeof b.emAndamento === "object" ? b.emAndamento : null;
    return {
      rituais: lista(b.rituais).map(normalizarEntrada).filter(Boolean).slice(0, 40),
      emAndamento: em ? { id: texto(em.id, 80) || id(), ritual: texto(em.ritual, 80), etapa: inteiro(em.etapa, 0, 20, 0), alvos: lista(em.alvos).map(String).slice(0, 12), iniciado: texto(em.iniciado, 40), interrompido: em.interrompido === true, motivo: texto(em.motivo, 200), consumidos: lista(em.consumidos).map(String).slice(0, 10) } : null,
      ativos: lista(b.ativos).map(function (a) { var o = obj(a); return o.id ? { id: texto(o.id, 80), ritual: texto(o.ritual, 120), alvos: lista(o.alvos).map(String).slice(0, 12), duracao: DURACOES[o.duracao] ? o.duracao : "cena", efeitos: lista(o.efeitos).map(function (z) { var q = obj(z); return { pid: texto(q.pid, 80), efeitoId: texto(q.efeitoId, 80), descricao: texto(q.descricao, 200) }; }).slice(0, 12), desde: texto(o.desde, 40) } : null; }).filter(Boolean).slice(0, 20),
      historico: lista(b.historico).map(function (h) { var o = obj(h); return { quando: texto(o.quando, 40), texto: texto(o.texto, 400) }; }).slice(-60),
    };
  }
  /* A parte da mesa: config, biblioteca do Mestre, pendências. */
  function normalizarMesa(x) {
    var p = obj(x);
    return {
      biblioteca: lista(p.biblioteca).map(normalizarEntrada).filter(Boolean).slice(0, 80),
      pendentes: lista(p.pendentes).map(function (q) { var o = obj(q); return o.id ? { id: texto(o.id, 80), quem: texto(o.quem, 80), ritual: texto(o.ritual, 120), resultado: texto(o.resultado, 20), alvos: lista(o.alvos).map(String).slice(0, 12), texto: texto(o.texto, 600), estado: o.estado === "resolvido" ? "resolvido" : "pendente", resposta: texto(o.resposta, 600) } : null; }).filter(Boolean).slice(-30),
      historico: lista(p.historico).map(function (h) { var o = obj(h); return { quando: texto(o.quando, 40), texto: texto(o.texto, 400) }; }).slice(-80),
    };
  }

  /* O que a mesa do Mestre vê de cada ficha (vai no resumo). */
  function resumo(b) {
    var p = normalizarBloco(b.paranormal);
    var em = p.emAndamento, rit = em ? p.rituais.filter(function (r) { return r.id === em.ritual; })[0] : null;
    return {
      rituais: p.rituais.slice(0, 12).map(function (r) { return { id: r.id, nome: r.nome, origem: r.origem }; }),
      emAndamento: em ? { ritual: rit ? rit.nome : "?", etapa: em.etapa, total: rit ? Math.max(1, rit.etapas.length) : 1, interrompido: em.interrompido, motivo: em.motivo } : null,
      ativos: p.ativos.map(function (a) { return { id: a.id, ritual: a.ritual, duracao: a.duracao, descricao: a.efeitos.map(function (z) { return z.descricao; }).join("; ") }; }),
    };
  }
  function configDaMesa(e) { return normalizarConfig(e.modulos && e.modulos.paranormal); }
  function dtDe(cfg, r) { return r.dt !== null ? r.dt : cfg.dts[r.complexidade]; }
  function custoDe(cfg, r) { return r.custoPd !== null ? r.custoPd : cfg.custos[r.complexidade]; }
  function forcarDe(cfg, r) { return r.forcar || (cfg.forcar.permitido ? cfg.forcar : null); }

  /* A prévia mostrada antes de confirmar. */
  function previa(e, b, ritual, opcoes) {
    var cfg = configDaMesa(e), o = obj(opcoes);
    var r = normalizarEntrada(ritual);
    var problemas = [];
    if (!cfg.ativo) problemas.push("O módulo paranormal experimental está desligado nesta campanha.");
    if (r.classe !== "experimental") problemas.push(r.classe === "procedimento" ? "É um procedimento de missão: joga-se pela cena (desafio), não pela conjuração livre." : "Entrada de consulta: sem automação.");
    var per = R().pericia(b, cfg.pericia);
    var custo = custoDe(cfg, r);
    var fz = o.forcar ? forcarDe(cfg, r) : null;
    if (o.forcar && !fz) problemas.push("Forçar a conjuração não está habilitado.");
    var pvForcar = fz && fz.alternativa === "pv" ? fz.pv : 0;
    if (custo > b.recursos.pd.atual) problemas.push("PD insuficiente (" + b.recursos.pd.atual + "/" + custo + ").");
    if (pvForcar + r.custoPv > b.recursos.pv.atual) problemas.push("PV insuficiente para o custo.");
    var faltaComp = r.componentes.filter(function (c) { return c.item && !c.etapa && !lista(b.itens).some(function (i) { return i.id === c.item || i.nome === c.item; }); }).map(function (c) { return c.nome; });
    if (faltaComp.length) problemas.push("Faltam componentes: " + faltaComp.join(", ") + ".");
    if (fz && fz.alternativa === "componente" && !r.componentes.length) problemas.push("Forçar consumindo componente exige um componente no ritual.");
    return {
      ok: !problemas.length, problemas: problemas, ritual: r,
      acao: r.modo === "elaborado" ? r.etapas.length + " etapa(s): " + r.etapas.map(function (t) { return t.nome + (t.acao ? " (" + t.acao + ")" : ""); }).join(" → ") : r.acao,
      teste: K().ATRIBUTOS[cfg.atributo].nome + " + " + (per ? R().nomeDaPericia(b, per) : K().nomeDaPericia(b.perfilRegras, cfg.pericia, b.ambientacao)),
      dt: dtDe(cfg, r), custoPd: custo, custoPv: r.custoPv + pvForcar,
      forcar: fz ? (fz.alternativa === "pv" ? "+" + fz.passos + " passo por " + fz.pv + " PV" : fz.alternativa === "pavor" ? "+" + fz.passos + " passo, com risco de pavor na falha" : "+" + fz.passos + " passo consumindo um componente") : "",
      alvo: ALVOS[r.alvo], duracao: DURACOES[r.duracao], componentes: r.componentes.map(function (c) { return c.nome + (c.consome ? " (consumido)" : ""); }),
      selo: SELO,
    };
  }

  /* ---------------------------------------------------------------
     AS OPERAÇÕES (mesma porta, mesmo opId)
     --------------------------------------------------------------- */
  function ev(s, t, privado) { s.eventos.push({ texto: String(t), privado: !!privado }); }
  function nome(fichas, pid) { return fichas[pid] ? fichas[pid].nome : "?"; }
  function fichaDe(fichas, pid) { return fichas[pid] ? fichas[pid].bloco : null; }
  function blocoP(b) { if (!b.paranormal || !b.paranormal.rituais) b.paranormal = normalizarBloco(b.paranormal); return b.paranormal; }
  function histFicha(b, t) { var p = blocoP(b); p.historico.push({ quando: agora(), texto: String(t).slice(0, 400) }); p.historico = p.historico.slice(-60); }
  function histMesa(e, t) { e.paranormal.historico.push({ quando: agora(), texto: String(t).slice(0, 400) }); e.paranormal.historico = e.paranormal.historico.slice(-80); ME().log(e, t); }
  function rolarExpr(x, rolar) { return P() ? P().rolarExpr(x, rolar) : { total: Number(x) || 0, faces: [], expr: String(x) }; }

  function garantir(e) { if (!e.paranormal || !Array.isArray(e.paranormal.biblioteca)) e.paranormal = normalizarMesa(e.paranormal); if (!e.modulos) e.modulos = {}; }
  function OP(nome, fn, o) { ME().registrarOperacao(nome, function (e) { garantir(e); return fn.apply(null, arguments); }, o); }

  if (ME()) {
    ME().gancho("normalizar", function (v, b) { v.paranormal = normalizarMesa(b.paranormal); });
    ME().gancho("vista", function (v, e, papel) {
      garantir(e);
      /* A biblioteca é do Mestre; quem joga vê a configuração e as próprias pendências. */
      v.paranormal = { biblioteca: [], historico: e.paranormal.historico.slice(-20), pendentes: e.paranormal.pendentes.filter(function (q) { return lista(papel.pode).indexOf(q.quem) >= 0; }).map(function (q) { return { id: q.id, quem: q.quem, ritual: q.ritual, estado: q.estado, resposta: q.resposta }; }) };
    });

    OP("paranormalConfigurar", function (e, fichas, o, papel, rolar, s) {
      e.modulos = e.modulos || {};
      var antes = configDaMesa(e);
      var novo = normalizarConfig(Object.assign({}, antes, obj(o.config), { dts: Object.assign({}, antes.dts, obj(obj(o.config).dts)), custos: Object.assign({}, antes.custos, obj(obj(o.config).custos)), forcar: Object.assign({}, antes.forcar, obj(obj(o.config).forcar)) }));
      e.modulos.paranormal = novo;
      var t = "Paranormal (experimental): " + (novo.ativo ? "ligado" : "desligado") + " · DT/custo " + ["simples", "intermediario", "complexo"].map(function (k) { return novo.dts[k] + "/" + novo.custos[k] + " PD"; }).join(", ") + (novo.forcar.permitido ? " · forçar: " + novo.forcar.alternativa : "") + ".";
      if (antes.ativo && !novo.ativo) t += " Conjurações novas bloqueadas; rituais, histórico e efeitos ativos ficam (encerre os ativos à mão).";
      histMesa(e, t); ev(s, t);
    }, { mestre: true, semFicha: true, rev: true });

    OP("ritualSalvar", function (e, fichas, o, papel, rolar, s) {
      var r = normalizarEntrada(o.ritual);
      if (!r) return { ok: false, motivo: "Dê um nome ao ritual." };
      var i = e.paranormal.biblioteca.map(function (x) { return x.id; }).indexOf(r.id);
      if (i >= 0) { r.versao = e.paranormal.biblioteca[i].versao + 1; r.historico = e.paranormal.biblioteca[i].historico.concat(["v" + r.versao + " salva em " + agora().slice(0, 10)]).slice(-30); e.paranormal.biblioteca[i] = r; }
      else { r.historico = ["criada em " + agora().slice(0, 10)]; e.paranormal.biblioteca.push(r); }
      ev(s, "Biblioteca: " + r.nome + " (" + CLASSES[r.classe] + ").", true);
      s.resultado.ritual = r.id;
    }, { mestre: true, semFicha: true });
    OP("ritualRemover", function (e, fichas, o, papel, rolar, s) {
      e.paranormal.biblioteca = e.paranormal.biblioteca.filter(function (x) { return x.id !== o.id; });
      ev(s, "Removido da biblioteca (as cópias nas fichas ficam).", true);
    }, { mestre: true, semFicha: true });
    /* Ensinar: uma CÓPIA vai para a ficha (exporta junto; a biblioteca pode mudar depois). */
    OP("ritualEnsinar", function (e, fichas, o, papel, rolar, s) {
      var r = e.paranormal.biblioteca.filter(function (x) { return x.id === o.ritual; })[0];
      if (!r) return { ok: false, motivo: "Ritual não encontrado na biblioteca." };
      var para = lista(o.para).map(String).filter(function (pid) { return fichas[pid]; });
      if (!para.length) return { ok: false, motivo: "Para quem?" };
      para.forEach(function (pid) {
        var p = blocoP(fichas[pid].bloco);
        var copia = normalizarEntrada(Object.assign(copiar(r), { origem: r.id }));
        p.rituais = p.rituais.filter(function (x) { return x.origem !== r.id; }).concat([copia]);
        histFicha(fichas[pid].bloco, "Aprendeu " + r.nome + " (v" + r.versao + ").");
      });
      ev(s, r.nome + " ensinado a " + para.map(function (x) { return nome(fichas, x); }).join(", ") + ".");
      histMesa(e, r.nome + " ensinado a " + para.map(function (x) { return nome(fichas, x); }).join(", ") + ".");
    }, { mestre: true });

    /* CONJURAR (imediato) ou COMEÇAR (elaborado). Sem `confirmar`: só a prévia. */
    OP("conjurar", function (e, fichas, o, papel, rolar, s, ctx) {
      var pid = String(o.quem || ""), b = fichaDe(fichas, pid);
      if (!b || !ME().podeAgir(papel, pid)) return { ok: false, motivo: "Você não conduz este personagem." };
      var p = blocoP(b);
      var r = p.rituais.filter(function (x) { return x.id === o.ritual; })[0];
      if (!r) return { ok: false, motivo: "Ritual não encontrado na ficha." };
      var pv = previa(e, b, r, { forcar: !!o.forcar });
      s.resultado.previa = pv;
      if (!pv.ok) return { ok: false, motivo: pv.problemas.join(" ") };
      if (o.confirmar !== true) { ev(s, "Prévia: " + r.nome + " — " + pv.teste + " DT " + pv.dt + ", " + pv.custoPd + " PD" + (pv.custoPv ? " e " + pv.custoPv + " PV" : "") + "."); return; }
      if (r.modo === "elaborado") {
        if (p.emAndamento && !p.emAndamento.interrompido) return { ok: false, motivo: "Já há um ritual em andamento: conclua ou interrompa." };
        p.emAndamento = { id: id(), ritual: r.id, etapa: 0, alvos: lista(o.alvos).map(String), iniciado: agora(), interrompido: false, motivo: "", consumidos: [] };
        histFicha(b, "Começa " + r.nome + " (elaborado, " + r.etapas.length + " etapa(s)).");
        ev(s, nome(fichas, pid) + " começa " + r.nome + ": etapa 1 de " + Math.max(1, r.etapas.length) + " — " + ((r.etapas[0] || {}).nome || "preparo") + ".");
        ME().log(e, nome(fichas, pid) + " começa o ritual " + r.nome + ".");
        return;
      }
      return executar(e, fichas, o, papel, rolar, s, ctx, b, pid, r, lista(o.alvos).map(String));
    });
    OP("ritualEtapa", function (e, fichas, o, papel, rolar, s, ctx) {
      var pid = String(o.quem || ""), b = fichaDe(fichas, pid);
      if (!b || !ME().podeAgir(papel, pid)) return { ok: false, motivo: "Você não conduz este personagem." };
      var p = blocoP(b), em = p.emAndamento;
      if (!em) return { ok: false, motivo: "Nenhum ritual em andamento." };
      if (em.interrompido) return { ok: false, motivo: "O ritual foi interrompido: recomece." };
      if (!configDaMesa(e).ativo) return { ok: false, motivo: "O módulo está desligado: o Mestre decide como encerrar o ritual em andamento." };
      var r = p.rituais.filter(function (x) { return x.id === em.ritual; })[0];
      if (!r) return { ok: false, motivo: "Ritual não encontrado." };
      var total = Math.max(1, r.etapas.length);
      if (o.etapa !== undefined && inteiro(o.etapa, 0, 20, -1) !== em.etapa) return { ok: false, motivo: "Fora de ordem: a etapa agora é a " + (em.etapa + 1) + "." };
      /* Componentes daquela etapa. */
      var falta = r.componentes.filter(function (c) { return c.etapa === em.etapa + 1 && c.item && !lista(b.itens).some(function (i) { return i.id === c.item || i.nome === c.item; }); });
      if (falta.length) return { ok: false, motivo: "Falta o componente: " + falta.map(function (c) { return c.nome; }).join(", ") + "." };
      r.componentes.filter(function (c) { return c.etapa === em.etapa + 1 && c.consome; }).forEach(function (c) { consumir(b, c); em.consumidos.push(c.nome); });
      if (r.testePorEtapa && em.etapa < total - 1) {
        return ME().OPERACOES.teste(e, fichas, { quem: pid, pedido: pedidoDoRitual(e, b, r, null), contexto: { proc: { tipo: "ritualEtapa", ritual: r.id, etapa: em.etapa } }, confirmar: o.confirmar }, papel, rolar, s, ctx);
      }
      if (em.etapa < total - 1) {
        em.etapa++;
        ev(s, nome(fichas, pid) + ": etapa " + em.etapa + " de " + total + " feita (" + ((r.etapas[em.etapa - 1] || {}).nome || "") + "). Próxima: " + ((r.etapas[em.etapa] || {}).nome || "a execução") + ".");
        return;
      }
      /* Última etapa: a execução, com o custo e o teste. */
      if (o.confirmar !== true) { var pv = previa(e, b, r, { forcar: !!o.forcar }); s.resultado.previa = pv; ev(s, "Prévia da execução final: DT " + pv.dt + ", " + pv.custoPd + " PD."); return; }
      p.emAndamento = null;
      return executar(e, fichas, o, papel, rolar, s, ctx, b, pid, r, em.alvos);
    });
    OP("ritualInterromper", function (e, fichas, o, papel, rolar, s) {
      var pid = String(o.quem || o.personagem || ""), b = fichaDe(fichas, pid);
      if (!b || !ME().podeAgir(papel, pid)) return { ok: false, motivo: "Sem permissão." };
      var em = blocoP(b).emAndamento;
      if (!em) return { ok: false, motivo: "Nenhum ritual em andamento." };
      interromper(b, texto(o.motivo, 200) || (papel.mestre ? "interrompido pelo Mestre" : "interrompido por quem conjura"), s, nome(fichas, pid));
      if (o.descartar) blocoP(b).emAndamento = null;
    });
    OP("efeitoRitualEncerrar", function (e, fichas, o, papel, rolar, s) {
      var pid = String(o.personagem || ""), b = fichaDe(fichas, pid);
      if (!b) return { ok: false, motivo: "Personagem não encontrado." };
      var p = blocoP(b);
      var a = p.ativos.filter(function (x) { return x.id === o.efeito; })[0];
      if (!a) return { ok: false, motivo: "Efeito não encontrado." };
      a.efeitos.forEach(function (z) { var bz = fichaDe(fichas, z.pid); if (bz) bz.efeitos = bz.efeitos.filter(function (x) { return x.id !== z.efeitoId; }); });
      p.ativos = p.ativos.filter(function (x) { return x.id !== a.id; });
      var t = a.ritual + ": efeito " + (o.como === "finalizar" ? "finalizado" : "encerrado") + " pelo Mestre.";
      histFicha(b, t); histMesa(e, nome(fichas, pid) + " · " + t); ev(s, t);
    }, { mestre: true });
    OP("pendenteRitual", function (e, fichas, o, papel, rolar, s) {
      var q = e.paranormal.pendentes.filter(function (x) { return x.id === o.id; })[0];
      if (!q || q.estado !== "pendente") return { ok: false, motivo: "Pendência não encontrada." };
      q.estado = "resolvido"; q.resposta = texto(o.resposta, 600) || "Resolvido pelo Mestre.";
      histMesa(e, "Ritual " + q.ritual + " (" + q.resultado + "): " + q.resposta);
      ev(s, "Pendência resolvida.");
    }, { mestre: true });
  }

  function consumir(b, c) {
    if (!c.item) return;
    var it = lista(b.itens).filter(function (i) { return i.id === c.item || i.nome === c.item; })[0];
    if (!it) return;
    if (it.quantidade !== null && it.quantidade > 1) it.quantidade--;
    else b.itens = b.itens.filter(function (i) { return i !== it; });
  }
  function interromper(b, motivo, s, nomePc) {
    var em = blocoP(b).emAndamento;
    if (!em || em.interrompido) return;
    em.interrompido = true; em.motivo = motivo;
    histFicha(b, "Ritual interrompido (" + motivo + "); nenhum custo de execução foi cobrado" + (em.consumidos.length ? "; componentes já gastos: " + em.consumidos.join(", ") : "") + ".");
    if (s) ev(s, (nomePc || "") + ": ritual interrompido (" + motivo + ").");
  }
  /* Dano em quem conduz um ritual elaborado que se interrompe com dano. */
  if (M()) {
    var aplicarDanoOriginal = M().aplicarDano;
    M().aplicarDano = function (b, o) {
      var r = aplicarDanoOriginal.apply(null, arguments);
      try {
        var em = b && b.paranormal && b.paranormal.emAndamento;
        if (em && !em.interrompido && Number(obj(o).valor) > 0) {
          var rit = lista(b.paranormal.rituais).filter(function (x) { return x.id === em.ritual; })[0];
          if (rit && rit.interrompeComDano) { interromper(b, "sofreu dano", null); r.push({ texto: "O ritual em andamento foi interrompido pelo dano.", privado: false }); }
        }
      } catch (erro) { /* sem ritual, nada */ }
      return r;
    };
  }

  function pedidoDoRitual(e, b, r, forcar) {
    var cfg = configDaMesa(e);
    var per = R().pericia(b, cfg.pericia);
    var passos = [];
    if (forcar) { var fz = forcarDe(cfg, r); passos.push({ alvo: forcar.dado === "atributo" ? "atributo" : "pericia", n: fz.passos, fonte: "Forçar a conjuração (" + SELO + ")" }); }
    return { atributo: cfg.atributo, pericia: per ? per.id : "", dt: dtDe(cfg, r), rotulo: r.nome + " (" + COMPLEXIDADES[r.complexidade].toLowerCase() + ")", passos: passos };
  }
  /* A execução: cobra UMA vez (também na falha) e rola; os efeitos saem
     depois do teste valer (escolhas pós-rolagem incluídas). */
  function executar(e, fichas, o, papel, rolar, s, ctx, b, pid, r, alvos) {
    var cfg = configDaMesa(e);
    var fz = o.forcar ? forcarDe(cfg, r) : null;
    var pedido = pedidoDoRitual(e, b, r, fz ? obj(o.forcar) : null);
    var mt = M().montar(b, pedido, { permitir20: false });
    if (!mt.ok) return mt;
    var custos = { pd: custoDe(cfg, r), pv: r.custoPv + (fz && fz.alternativa === "pv" ? fz.pv : 0) };
    if (custos.pd > b.recursos.pd.atual || custos.pv > b.recursos.pv.atual) return { ok: false, motivo: "Custo não pode ser pago." };
    if (fz && fz.alternativa === "componente") { var c = r.componentes[0]; if (c) consumir(b, c); }
    M().pagarCustos(b, custos);
    r.componentes.filter(function (c) { return c.consome && !c.etapa; }).forEach(function (c) { consumir(b, c); });
    var execId = id();
    histFicha(b, "Conjura " + r.nome + ": custo " + custos.pd + " PD" + (custos.pv ? " e " + custos.pv + " PV" : "") + " (cobrado na confirmação).");
    ev(s, nome(fichas, pid) + " conjura " + r.nome + " — paga " + custos.pd + " PD" + (custos.pv ? " e " + custos.pv + " PV" : "") + ".");
    return ME().OPERACOES.teste(e, fichas, { quem: pid, pedido: pedido, contexto: { proc: { tipo: "ritual", ritual: r.id, alvos: alvos, execucao: execId, pavorNaFalha: !!(fz && fz.alternativa === "pavor") } }, confirmar: o.confirmar === true && o.aguardar !== true }, papel, rolar, s, ctx);
  }

  /* O teste VALEU: os efeitos do resultado. */
  if (ME()) ME().gancho("aoFinalizar", function (e, fichas, t, res, s, rolar) {
    var cx = obj(t.contexto.proc);
    if (cx.tipo === "ritual" || cx.tipo === "ritualEtapa") garantir(e);
    var b = fichaDe(fichas, t.quem);
    if (!b) return;
    if (cx.tipo === "ritualEtapa") {
      var em = blocoP(b).emAndamento;
      if (!em) return;
      if (res.sucesso) { em.etapa++; ev(s, t.nome + ": etapa " + em.etapa + " feita."); }
      else interromper(b, "falhou na etapa " + (em.etapa + 1), s, t.nome);
      return;
    }
    if (cx.tipo !== "ritual") return;
    var r = blocoP(b).rituais.filter(function (x) { return x.id === cx.ritual; })[0];
    if (!r) return;
    var chave = res.critico ? "critico" : res.falhaCritica ? "falhaCritica" : res.sucesso ? "normal" : "falha";
    var efeitos = r.efeitos[chave];
    if (chave === "critico" && !efeitos.length) efeitos = r.efeitos.normal; /* sem crítico próprio, vale o normal — e o Mestre é avisado */
    var nomeRes = { normal: "sucesso", critico: "crítico", falha: "falha", falhaCritica: "falha crítica" }[chave];
    if (cx.pavorNaFalha && res.sucesso === false) M().darPavor(b).forEach(function (y) { ev(s, t.nome + " (forçou com risco de pavor): " + y.texto); });
    histFicha(b, r.nome + ": " + nomeRes + " (" + res.total + " vs DT " + res.dt + ").");
    if (!efeitos.length) {
      pendente(e, t.quem, r, chave, cx.alvos, "Efeito de " + nomeRes + " não configurado: o Mestre decide.");
      ev(s, r.nome + ": " + nomeRes + " — sem efeito configurado; o Mestre decide (nada é inventado).");
      return;
    }
    if (chave === "critico" && !r.efeitos.critico.length) pendente(e, t.quem, r, chave, cx.alvos, "Crítico sem efeito próprio: aplicado o efeito normal; o Mestre pode acrescentar algo.");
    var ativo = { id: id(), ritual: r.nome, alvos: cx.alvos.slice(), duracao: r.duracao, efeitos: [], desde: agora() };
    efeitos.forEach(function (ef) { aplicarEfeito(e, fichas, t.quem, r, ef, cx.alvos, rolar, s, ativo, chave); });
    if (ativo.efeitos.length && r.duracao !== "instantaneo") blocoP(b).ativos.push(ativo);
  });
  function pendente(e, quem, r, resultado, alvos, txt) {
    e.paranormal.pendentes.push({ id: id(), quem: quem, ritual: r.nome, resultado: resultado, alvos: lista(alvos).slice(), texto: txt, estado: "pendente", resposta: "" });
    e.paranormal.pendentes = e.paranormal.pendentes.slice(-30);
  }
  /* Alvos: personagens da mesa (ids) ou participantes do combate (npc-…). */
  function blocosDosAlvos(e, fichas, quem, ef, alvos) {
    if (ef.quem === "proprio" || !lista(alvos).length) return [{ pid: quem, b: fichaDe(fichas, quem), nome: nome(fichas, quem) }];
    return lista(alvos).map(function (a) {
      if (fichas[a]) return { pid: a, b: fichaDe(fichas, a), nome: nome(fichas, a) };
      var pa = ME().participante(e, a);
      return pa ? { pid: pa.tipo === "pc" ? pa.personagemId : "", b: ME().blocoDoAtor(e, fichas, pa), nome: pa.nome } : null;
    }).filter(function (x) { return x && x.b; });
  }
  var EXPIRA_DE = { instantaneo: "teste", rodada: "rodada", cena: "cena", missao: "missao", permanente: "permanente" };
  function aplicarEfeito(e, fichas, quem, r, ef, alvos, rolar, s, ativo, chave) {
    if (ef.tipo === "mestre") { pendente(e, quem, r, chave, alvos, ef.texto || "O Mestre narra o efeito."); ev(s, r.nome + ": " + (ef.texto || "efeito narrado pelo Mestre") + " — aguardando o Mestre."); return; }
    blocosDosAlvos(e, fichas, quem, ef, alvos).forEach(function (a) {
      if (ef.tipo === "dano") { var d = rolarExpr(ef.valor, rolar); M().aplicarDano(a.b, { valor: d.total, tipo: ef.danoTipo, externo: true }).forEach(function (y) { ev(s, a.nome + " (" + r.nome + ", " + (d.faces.length ? d.expr + " [" + d.faces.join(", ") + "]" : d.total) + "): " + y.texto); }); return; }
      if (ef.tipo === "cura") { var c = rolarExpr(ef.valor, rolar); var n = M().curar(a.b, ef.recurso, c.total); ev(s, a.nome + " recupera " + n + " " + ef.recurso.toUpperCase() + " (" + r.nome + ")."); return; }
      if (ef.tipo === "condicao" && ef.condicao) { if (ef.condicao === "perdeAcao") a.b.estado.perdeAcao = 2; else a.b.estado[ef.condicao] = true; ev(s, a.nome + ": " + (R().NOMES_CONDICAO[ef.condicao] || ef.condicao) + " (" + r.nome + ")."); return; }
      if (ef.tipo === "passo" || ef.tipo === "marcador") {
        var eff = R().normalizarEfeito({ tipo: ef.alvoDado === "atributo" ? "passoAtributo" : ef.alvoDado === "todos" ? "passoTodos" : "passoPericia", alvo: ef.chave, n: ef.n, expira: EXPIRA_DE[ef.duracao || r.duracao] || "cena", fonte: r.nome + " (ritual experimental)", d20: ef.d20 });
        if (eff) { a.b.efeitos.push(eff); if (ativo && a.pid) ativo.efeitos.push({ pid: a.pid, efeitoId: eff.id, descricao: (ef.n > 0 ? "+" : "") + ef.n + " passo" + (ef.chave ? " em " + ef.chave : "") + (ef.d20 ? " (pode chegar a d20)" : "") }); ev(s, a.nome + ": " + (ef.n > 0 ? "+" : "") + ef.n + " passo" + (ef.chave ? " em " + ef.chave : "") + " (" + r.nome + ")."); }
        return;
      }
      if (ef.tipo === "dado" && ef.faces) { a.b.estado.reservas.push({ id: id(), faces: ef.faces, fonte: r.nome + " (ritual)", expira: EXPIRA_DE[ef.duracao || r.duracao] || "cena", alvo: ef.texto || "" }); ev(s, a.nome + " guarda +d" + ef.faces + " (" + r.nome + ")."); }
    });
  }

  global.RAMAOrdem2Paranormal = {
    SELO: SELO, ELEMENTOS: ELEMENTOS, TIPOS: TIPOS, CLASSES: CLASSES, COMPLEXIDADES: COMPLEXIDADES, MODOS: MODOS, DURACOES: DURACOES, ALVOS: ALVOS, TIPOS_EFEITO: TIPOS_EFEITO, RESULTADOS: RESULTADOS, CONDICOES: CONDICOES,
    configPadrao: configPadrao, normalizarConfig: normalizarConfig, configDaMesa: configDaMesa,
    normalizarEntrada: normalizarEntrada, normalizarBloco: normalizarBloco, normalizarMesa: normalizarMesa, normalizarEfeito: normalizarEfeito,
    previa: previa, dtDe: dtDe, custoDe: custoDe, resumo: resumo,
  };
})(typeof window !== "undefined" ? window : globalThis);
