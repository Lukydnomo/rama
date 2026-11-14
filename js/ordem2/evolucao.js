/* =====================================================================
   R.A.M.A. — Ordem Paranormal RPG II · evolução (v9.2)
   Experimental — regra do R.A.M.A.
   ---------------------------------------------------------------------
   O QUE O TEXTO DIZ (Alpha pp. 15–16; Beta p. 8): nível de 1 a 10; a
   ficha começa com duas habilidades (perfil e ocupação/vocação) e
   "recebe novas habilidades à medida que subir de nível ou treinar";
   d20 só com influência paranormal. NÃO HÁ tabela de evolução.

   O QUE ESTE MÓDULO PROPÕE (configurável pela campanha, nunca chamado
   de regra publicada):
     livre       o Mestre define nível e mudanças (edita a ficha); nada é
                 automático
     marcos      o Mestre confirma subir UM nível; quem joga escolhe UMA
                 melhoria: +1 passo num atributo ou perícia (até d12, sem
                 d20), +2 PV máximos, +2 PD máximos, ou uma habilidade
                 que o Mestre aprova
   Nada é inferido dos presets (nem ganho, nem patamar, nem promoção).
   As melhorias ficam em REGISTROS separados dos valores impressos
   (`base` nunca muda): os dados efetivos somam os passos dos registros
   vivos. Aumentar o máximo preserva os pontos atuais (recuperar é outra
   ação); desfazer tira só os ganhos daquele registro — se um registro
   posterior depende dele, pede para desfazer esse antes — e nunca
   devolve dano antigo. Perícias são referidas pela CHAVE (os ids mudam
   ao importar), habilidades pela marca `origemEvolucao`.

   Copiado para backend/Ordem2.gs (testes/gerar-ordem2-gs.js).
   ===================================================================== */

(function (global) {
  "use strict";

  function K() { return global.RAMAOrdem2Catalogo; }
  function R() { return global.RAMAOrdem2; }
  function ME() { return global.RAMAOrdem2Mesa; }
  function lista(v) { return Array.isArray(v) ? v : []; }
  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  function texto(v, n) { return String(v === undefined || v === null ? "" : v).slice(0, n || 200); }
  function inteiro(v, a, b, p) { var n = Math.floor(Number(v)); if (!Number.isFinite(n)) return p === undefined ? a : p; return Math.max(a, Math.min(b, n)); }
  function copiar(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
  function id() { return R().novoId(); }

  var MODOS = { livre: "Livre (o Mestre atribui)", marcos: "Por marcos — Experimental (regra do R.A.M.A.)" };
  var TIPOS = {
    atributo: "+1 passo num atributo (até d12)",
    pericia: "+1 passo numa perícia (até d12)",
    pv: "+2 PV máximos",
    pd: "+2 PD máximos",
    habilidade: "Uma habilidade (aprovada pelo Mestre)",
  };
  var PADRAO = { modo: "livre", pvPorEscolha: 2, pdPorEscolha: 2, teto: 12 };

  function normalizarConfig(x) {
    var c = obj(x);
    return { modo: MODOS[c.modo] ? c.modo : "livre", pvPorEscolha: inteiro(c.pvPorEscolha, 1, 10, 2), pdPorEscolha: inteiro(c.pdPorEscolha, 1, 10, 2), teto: [8, 10, 12].indexOf(Number(c.teto)) >= 0 ? Number(c.teto) : 12 };
  }
  function normalizarGanho(x) {
    var g = obj(x);
    if (!TIPOS[g.tipo]) return null;
    return { tipo: g.tipo, chave: texto(g.chave, 60), n: inteiro(g.n, -4, 10, 1), de: texto(g.de, 20), para: texto(g.para, 20), habilidade: g.habilidade ? copiar(obj(g.habilidade)) : null };
  }
  function normalizar(x) {
    var e = obj(x);
    return {
      nex: texto(e.nex, 20),
      pendente: e.pendente && typeof e.pendente === "object" ? {
        id: texto(e.pendente.id, 80) || id(), nivelDepois: inteiro(e.pendente.nivelDepois, 1, 10, 1), nivelAntes: inteiro(e.pendente.nivelAntes, 1, 10, 1),
        aprovadoEm: texto(e.pendente.aprovadoEm, 40), proposta: e.pendente.proposta ? copiar(obj(e.pendente.proposta)) : null, config: normalizarConfig(e.pendente.config),
      } : null,
      registros: lista(e.registros).map(function (r) {
        var o = obj(r);
        return {
          id: texto(o.id, 80) || id(), quando: texto(o.quando, 40), opId: texto(o.opId, 80), modo: MODOS[o.modo] ? o.modo : "livre",
          nivelAntes: inteiro(o.nivelAntes, 1, 10, 1), nivelDepois: inteiro(o.nivelDepois, 1, 10, 1),
          ganhos: lista(o.ganhos).map(normalizarGanho).filter(Boolean).slice(0, 6), nota: texto(o.nota, 300),
          desfeito: o.desfeito === true, desfeitoEm: texto(o.desfeitoEm, 40), procedencia: texto(o.procedencia, 120),
        };
      }).slice(-60),
    };
  }
  function bloco(b) { if (!b.evolucao || !b.evolucao.registros) b.evolucao = normalizar(b.evolucao); return b.evolucao; }
  function vivos(b) { return lista(bloco(b).registros).filter(function (r) { return !r.desfeito; }); }
  function chaveDaPericia(p) { return p.chave + (p.especializacao ? ":" + String(p.especializacao).toLowerCase() : ""); }

  /* Somas dos registros vivos (os dados impressos ficam em `base`). */
  function passosAtributo(b, chave) { var n = 0; vivos(b).forEach(function (r) { r.ganhos.forEach(function (g) { if (g.tipo === "atributo" && g.chave === chave) n += g.n; }); }); return n; }
  function passosPericia(b, p) { var k = chaveDaPericia(p), n = 0; vivos(b).forEach(function (r) { r.ganhos.forEach(function (g) { if (g.tipo === "pericia" && g.chave === k) n += g.n; }); }); return n; }
  function extra(b, tipo) { var n = 0; vivos(b).forEach(function (r) { r.ganhos.forEach(function (g) { if (g.tipo === tipo) n += g.n; }); }); return n; }

  /* O valor SEM efeitos temporários (o que a melhoria mexe). */
  function permanenteAtributo(b, chave) { return R().passoDado(b.base.atributos[chave] || 6, passosAtributo(b, chave), false); }
  function permanentePericia(b, p) { return R().passoDado(p.dado, passosPericia(b, p), false); }

  /* A prévia de uma escolha: antes/depois, ou o motivo de não caber. */
  function previa(b, escolha, config) {
    var cfg = normalizarConfig(config);
    var e = obj(escolha);
    if (!TIPOS[e.tipo]) return { ok: false, motivo: "Escolha o tipo de melhoria." };
    if (e.tipo === "atributo") {
      if (!K().ATRIBUTOS[e.chave]) return { ok: false, motivo: "Escolha o atributo." };
      var a = permanenteAtributo(b, e.chave);
      if (b.base.atributos[e.chave] === 20 || a >= cfg.teto) return { ok: false, motivo: K().ATRIBUTOS[e.chave].nome + " já está em d" + a + " (teto d" + cfg.teto + "; d20 só com efeito paranormal)." };
      return { ok: true, ganho: { tipo: "atributo", chave: e.chave, n: 1, de: "d" + a, para: "d" + R().passoDado(a, 1, false) }, rotulo: K().ATRIBUTOS[e.chave].nome + ": d" + a + " → d" + R().passoDado(a, 1, false) };
    }
    if (e.tipo === "pericia") {
      var p = lista(b.base.pericias).filter(function (q) { return q.id === e.chave || chaveDaPericia(q) === e.chave; })[0];
      if (!p) return { ok: false, motivo: "Escolha a perícia." };
      var d = permanentePericia(b, p);
      if (p.dado === 20 || d >= cfg.teto) return { ok: false, motivo: R().nomeDaPericia(b, p) + " já está em d" + d + " (teto d" + cfg.teto + "; sem d20)." };
      return { ok: true, ganho: { tipo: "pericia", chave: chaveDaPericia(p), n: 1, de: "d" + d, para: "d" + R().passoDado(d, 1, false) }, rotulo: R().nomeDaPericia(b, p) + ": d" + d + " → d" + R().passoDado(d, 1, false) };
    }
    if (e.tipo === "pv" || e.tipo === "pd") {
      var n = e.tipo === "pv" ? cfg.pvPorEscolha : cfg.pdPorEscolha;
      var max = e.tipo === "pv" ? R().pvMax(b) : R().pdMax(b);
      var atual = e.tipo === "pv" ? b.recursos.pv.atual : b.recursos.pd.atual;
      return { ok: true, ganho: { tipo: e.tipo, chave: "", n: n, de: String(max), para: String(max + n) }, rotulo: (e.tipo === "pv" ? "PV" : "PD") + " máx. " + max + " → " + (max + n) + "; " + (e.tipo === "pv" ? "PV" : "PD") + " atuais continuam " + atual };
    }
    var h = obj(e.habilidade);
    var nome = texto(h.nome || (K().HABILIDADES[h.ref] || {}).nome, 80);
    if (!nome) return { ok: false, motivo: "Descreva a habilidade (nome e efeito)." };
    if (!h.ref && !texto(h.texto, 1200).trim()) return { ok: false, motivo: "Escreva o efeito da habilidade personalizada." };
    return { ok: true, ganho: { tipo: "habilidade", chave: texto(h.ref, 60), n: 1, de: "", para: nome, habilidade: { ref: texto(h.ref, 60), nome: nome, texto: texto(h.texto || (K().HABILIDADES[h.ref] || {}).texto, 1200) } }, rotulo: "Nova habilidade: " + nome, precisaAprovar: true };
  }

  /* Aplica um registro (o nível sobe aqui). Não mexe em `base`. */
  function registrar(b, meta, ganhos) {
    var ev = bloco(b);
    var r = { id: id(), quando: meta.quando || new Date().toISOString(), opId: texto(meta.opId, 80), modo: meta.modo || "marcos", nivelAntes: b.nivel, nivelDepois: inteiro(meta.nivelDepois, 1, 10, b.nivel), ganhos: lista(ganhos).map(normalizarGanho).filter(Boolean), nota: texto(meta.nota, 300), desfeito: false, desfeitoEm: "", procedencia: texto(meta.procedencia, 120) };
    r.ganhos.forEach(function (g) {
      if (g.tipo === "habilidade" && g.habilidade) {
        var h = R().normalizarHabilidade(g.habilidade);
        h.origemEvolucao = r.id;
        b.habilidades.push(h);
      }
    });
    b.nivel = r.nivelDepois;
    ev.registros.push(r);
    ev.registros = ev.registros.slice(-60);
    return r;
  }

  /* Desfazer: só os ganhos daquele registro; dependências primeiro. */
  function dependentes(b, reg) {
    var todos = lista(bloco(b).registros), i = todos.indexOf(reg);
    var depois = todos.slice(i + 1).filter(function (r) { return !r.desfeito; });
    return depois.filter(function (r) {
      return r.ganhos.some(function (g) { return reg.ganhos.some(function (h) { return (g.tipo === h.tipo && g.chave === h.chave && (g.tipo === "atributo" || g.tipo === "pericia")); }); }) || r.nivelAntes >= reg.nivelDepois;
    });
  }
  function desfazer(b, regId) {
    var reg = lista(bloco(b).registros).filter(function (r) { return r.id === regId; })[0];
    if (!reg || reg.desfeito) return { ok: false, motivo: "Registro não encontrado (ou já desfeito)." };
    var dep = dependentes(b, reg);
    if (dep.length) return { ok: false, motivo: "Antes, desfaça o(s) registro(s) posterior(es) que dependem deste: " + dep.map(function (r) { return "nível " + r.nivelAntes + " → " + r.nivelDepois; }).join(", ") + ".", dependentes: dep.map(function (r) { return r.id; }) };
    reg.desfeito = true;
    reg.desfeitoEm = new Date().toISOString();
    b.habilidades = b.habilidades.filter(function (h) { return h.origemEvolucao !== reg.id; });
    if (b.nivel === reg.nivelDepois) b.nivel = reg.nivelAntes;
    /* Máximo menor: o atual não passa dele (dano antigo não volta). */
    b.recursos.pv.atual = Math.min(b.recursos.pv.atual, R().pvMax(b));
    b.recursos.pd.atual = Math.min(b.recursos.pd.atual, R().pdMax(b));
    return { ok: true, registro: reg };
  }

  /* A trilha 1–10 (só leitura; nada aqui muda a ficha). Patamar é
     SUGESTÃO de mesa: nunca é aplicado a partir do nível. */
  var PATAMAR_SUGERIDO = { 1: "iniciante", 2: "iniciante", 3: "iniciante", 4: "veterano", 5: "veterano", 6: "veterano", 7: "elite", 8: "elite", 9: "elite", 10: "lenda" };
  function trilha(b) {
    var evo = bloco(b), vivosL = vivos(b), l = [];
    for (var n = 1; n <= 10; n++) {
      var reg = vivosL.filter(function (r) { return r.nivelDepois === n && r.nivelAntes < n; }).slice(-1)[0] || null;
      var estado = n < b.nivel ? "passado" : n === b.nivel ? "atual" : evo.pendente && evo.pendente.nivelDepois === n ? "pendente" : "futuro";
      l.push({ nivel: n, estado: estado, registro: reg, patamarSugerido: PATAMAR_SUGERIDO[n] });
    }
    return l;
  }
  /* O registro que dá para desfazer agora: o vivo mais recente sem
     dependentes (e nenhum marco pendente). */
  function desfazivel(b) {
    var v = vivos(b);
    for (var i = v.length - 1; i >= 0; i--) { if (!dependentes(b, v[i]).length) return v[i]; }
    return null;
  }

  /* O rótulo de um ganho já registrado (histórico e resumo da mesa). */
  function rotuloGanho(g, b) {
    if (g.tipo === "atributo") return (K().ATRIBUTOS[g.chave] ? K().ATRIBUTOS[g.chave].nome : g.chave) + " " + g.de + " → " + g.para;
    if (g.tipo === "pericia") { var c = String(g.chave).split(":"); return K().nomeDaPericia(b ? b.perfilRegras : "alpha-contemporaneo", c[0], b ? b.ambientacao : "") + (c[1] ? " (" + c[1] + ")" : "") + " " + g.de + " → " + g.para; }
    if (g.tipo === "pv" || g.tipo === "pd") return g.tipo.toUpperCase() + " máx. " + g.de + " → " + g.para;
    return "Habilidade: " + g.para;
  }
  /* O que a mesa do Mestre vê de cada ficha (vai no resumo). */
  function resumo(b) {
    var e = bloco(b);
    return {
      nex: e.nex,
      pendente: e.pendente ? { id: e.pendente.id, nivelAntes: e.pendente.nivelAntes, nivelDepois: e.pendente.nivelDepois, proposta: e.pendente.proposta ? texto(e.pendente.proposta.rotulo, 120) : "" } : null,
      desfazivel: (desfazivel(b) || {}).id || "",
      registros: e.registros.slice(-6).map(function (r) { return { id: r.id, nivelAntes: r.nivelAntes, nivelDepois: r.nivelDepois, modo: r.modo, desfeito: r.desfeito, quando: r.quando.slice(0, 10), ganhos: r.ganhos.map(function (g) { return rotuloGanho(g, b); }).join("; ") || r.nota }; }),
    };
  }

  /* ---------------------------------------------------------------
     A CONFIGURAÇÃO DA CAMPANHA (e.modulos.evolucao) e as operações
     --------------------------------------------------------------- */
  function configDaMesa(e) { return normalizarConfig(e.modulos && e.modulos.evolucao); }
  function ev(s, t, privado) { s.eventos.push({ texto: String(t), privado: !!privado }); }
  function log(e, t) { ME().log(e, t); }
  function fichaDe(fichas, pid) { return fichas[pid] ? fichas[pid].bloco : null; }
  function nome(fichas, pid) { return fichas[pid] ? fichas[pid].nome : "?"; }

  if (ME()) {
    ME().gancho("normalizar", function (v, b) {
      var m = obj(b.modulos);
      v.modulos = { evolucao: normalizarConfig(m.evolucao), paranormal: m.paranormal ? copiar(m.paranormal) : null };
    });
    ME().registrarOperacao("evolucaoConfigurar", function (e, fichas, o, papel, rolar, s) {
      e.modulos = e.modulos || {};
      e.modulos.evolucao = normalizarConfig(Object.assign({}, configDaMesa(e), obj(o.config)));
      ev(s, "Evolução: " + MODOS[e.modulos.evolucao.modo] + ".");
      log(e, "Evolução da campanha: " + MODOS[e.modulos.evolucao.modo] + ".");
    }, { mestre: true, semFicha: true, rev: true });
    /* Livre: o Mestre põe o nível (e registra a mudança, sem ganhos). */
    ME().registrarOperacao("definirNivel", function (e, fichas, o, papel, rolar, s) {
      var b = fichaDe(fichas, o.personagem);
      if (!b) return { ok: false, motivo: "Personagem não encontrado." };
      var n = inteiro(o.nivel, 1, 10, b.nivel);
      if (n === b.nivel) return { ok: false, motivo: "O nível já é " + n + "." };
      if (bloco(b).pendente) return { ok: false, motivo: "Há um marco pendente: escolha a melhoria ou cancele o marco antes de mudar o nível." };
      registrar(b, { modo: "livre", nivelDepois: n, opId: o.opId, nota: texto(o.nota, 300) || "Nível definido pelo Mestre (modo livre)." }, []);
      ev(s, nome(fichas, o.personagem) + ": nível " + n + " (o Mestre define as mudanças na ficha).");
      log(e, nome(fichas, o.personagem) + " vai ao nível " + n + ".");
    }, { mestre: true });
    /* Marcos: o Mestre confirma subir um nível; fica a escolha pendente. */
    ME().registrarOperacao("subirNivel", function (e, fichas, o, papel, rolar, s) {
      var b = fichaDe(fichas, o.personagem);
      if (!b) return { ok: false, motivo: "Personagem não encontrado." };
      var cfg = configDaMesa(e);
      /* Sem atalho vindo do navegador: a ficha avulsa liga "por marcos"
         na própria mesa local (evolucaoConfigurar), como a campanha. */
      if (cfg.modo !== "marcos") return { ok: false, motivo: "O modo é livre: o nível muda por \"definir nível\"." };
      if (b.nivel >= 10) return { ok: false, motivo: "Nível 10 é o máximo (Alpha p. 15; Beta p. 8)." };
      var evo = bloco(b);
      if (o.nivelAntes !== undefined && Number(o.nivelAntes) !== b.nivel) return { ok: false, motivo: "O nível mudou desde que a tela abriu: confira e tente de novo." };
      if (evo.pendente) return { ok: false, motivo: "Já há uma subida de nível esperando a escolha." };
      evo.pendente = { id: id(), nivelAntes: b.nivel, nivelDepois: b.nivel + 1, aprovadoEm: new Date().toISOString(), proposta: null, config: cfg };
      ev(s, nome(fichas, o.personagem) + " pode subir ao nível " + (b.nivel + 1) + ": escolha a melhoria.");
      log(e, "O Mestre confirma: " + nome(fichas, o.personagem) + " sobe ao nível " + (b.nivel + 1) + " (escolha pendente).");
    }, { mestre: true });
    ME().registrarOperacao("escolherMelhoria", function (e, fichas, o, papel, rolar, s) {
      var pid = String(o.quem || ""), b = fichaDe(fichas, pid);
      if (!b || !ME().podeAgir(papel, pid)) return { ok: false, motivo: "Você não conduz este personagem." };
      var evo = bloco(b);
      if (!evo.pendente) return { ok: false, motivo: "Não há subida de nível pendente." };
      if (o.pendente && o.pendente !== evo.pendente.id) return { ok: false, motivo: "Este marco mudou (foi cancelado ou refeito): a tela foi atualizada." };
      if (evo.pendente.proposta && !papel.mestre) return { ok: false, motivo: "Já há uma habilidade aguardando a aprovação do Mestre." };
      var pv = previa(b, o.escolha, evo.pendente.config);
      if (!pv.ok) return pv;
      if (pv.precisaAprovar && !papel.mestre) {
        evo.pendente.proposta = { escolha: copiar(o.escolha), rotulo: pv.rotulo };
        ev(s, nome(fichas, pid) + " propõe: " + pv.rotulo + " — aguardando o Mestre.");
        log(e, nome(fichas, pid) + " propõe uma habilidade para o nível " + evo.pendente.nivelDepois + ".");
        return;
      }
      var r = registrar(b, { modo: evo.pendente.config.modo, nivelDepois: evo.pendente.nivelDepois, opId: o.opId, procedencia: "marcos" }, [pv.ganho]);
      evo.pendente = null;
      ev(s, nome(fichas, pid) + " sobe ao nível " + r.nivelDepois + ": " + pv.rotulo + ".");
      log(e, nome(fichas, pid) + " sobe ao nível " + r.nivelDepois + ": " + pv.rotulo + ".");
      s.resultado.registro = r.id;
    });
    ME().registrarOperacao("aprovarHabilidade", function (e, fichas, o, papel, rolar, s) {
      var b = fichaDe(fichas, o.personagem);
      if (!b) return { ok: false, motivo: "Personagem não encontrado." };
      var evo = bloco(b);
      if (!evo.pendente || !evo.pendente.proposta) return { ok: false, motivo: "Não há habilidade proposta." };
      if (o.pendente && o.pendente !== evo.pendente.id) return { ok: false, motivo: "Este marco mudou: a tela foi atualizada." };
      if (o.aprovar === false) { evo.pendente.proposta = null; ev(s, "O Mestre não aprovou a habilidade: escolha outra melhoria."); return; }
      var pv = previa(b, evo.pendente.proposta.escolha, evo.pendente.config);
      if (!pv.ok) return pv;
      var r = registrar(b, { modo: evo.pendente.config.modo, nivelDepois: evo.pendente.nivelDepois, procedencia: "marcos (aprovada pelo Mestre)" }, [pv.ganho]);
      evo.pendente = null;
      ev(s, nome(fichas, o.personagem) + " sobe ao nível " + r.nivelDepois + ": " + pv.rotulo + " (aprovada).");
      log(e, nome(fichas, o.personagem) + " sobe ao nível " + r.nivelDepois + ": " + pv.rotulo + ".");
    }, { mestre: true });
    ME().registrarOperacao("cancelarSubida", function (e, fichas, o, papel, rolar, s) {
      var b = fichaDe(fichas, o.personagem);
      if (!b || !bloco(b).pendente) return { ok: false, motivo: "Nada pendente." };
      if (o.pendente && o.pendente !== bloco(b).pendente.id) return { ok: false, motivo: "Este marco mudou: a tela foi atualizada." };
      bloco(b).pendente = null;
      ev(s, "Subida de nível cancelada.");
    }, { mestre: true });
    ME().registrarOperacao("desfazerEvolucao", function (e, fichas, o, papel, rolar, s) {
      var b = fichaDe(fichas, o.personagem);
      if (!b) return { ok: false, motivo: "Personagem não encontrado." };
      if (bloco(b).pendente) return { ok: false, motivo: "Há um marco pendente: resolva ou cancele antes de desfazer." };
      var r = desfazer(b, o.registro);
      if (!r.ok) return r;
      ev(s, nome(fichas, o.personagem) + ": desfeito o nível " + r.registro.nivelAntes + " → " + r.registro.nivelDepois + " (só os ganhos dele; dano antigo não volta).");
      log(e, nome(fichas, o.personagem) + ": evolução desfeita (" + r.registro.nivelAntes + " → " + r.registro.nivelDepois + ").");
    }, { mestre: true });
    ME().registrarOperacao("nex", function (e, fichas, o, papel, rolar, s) {
      var pid = String(o.quem || o.personagem || ""), b = fichaDe(fichas, pid);
      if (!b || !ME().podeAgir(papel, pid)) return { ok: false, motivo: "Sem permissão." };
      bloco(b).nex = texto(o.valor, 20);
      ev(s, "NEX anotado (só metadado; sem efeito nas regras).");
    });
  }

  /* Atualizar a ficha para outra versão do preset: só com prévia e
     confirmação; registros de evolução e o histórico ficam. */
  function previaAtualizacao(b) {
    if (!b.procedencia || !b.procedencia.preset) return { ok: false, motivo: "Esta ficha não veio de uma ficha pronta." };
    var novo = R().dePreset(b.procedencia.preset);
    if (!novo) return { ok: false, motivo: "Preset não encontrado." };
    var dif = [];
    K().ORDEM_ATRIBUTOS.forEach(function (k) { if (novo.base.atributos[k] !== b.base.atributos[k]) dif.push(K().ATRIBUTOS[k].nome + ": d" + b.base.atributos[k] + " → d" + novo.base.atributos[k]); });
    novo.base.pericias.forEach(function (p) { var q = lista(b.base.pericias).filter(function (x) { return chaveDaPericia(x) === chaveDaPericia(p); })[0]; if (!q || q.dado !== p.dado) dif.push(R().nomeDaPericia(novo, p) + ": " + (q ? "d" + q.dado : "—") + " → d" + p.dado); });
    if (novo.recursos.pv.max !== b.recursos.pv.max) dif.push("PV impressos: " + b.recursos.pv.max + " → " + novo.recursos.pv.max);
    if (novo.recursos.pd.max !== b.recursos.pd.max) dif.push("PD impressos: " + b.recursos.pd.max + " → " + novo.recursos.pd.max);
    return { ok: true, diferencas: dif, versaoAntes: b.procedencia.versaoDados, versaoDepois: K().VERSAO_DADOS, novo: novo };
  }
  function aplicarAtualizacao(b, confirmar) {
    var p = previaAtualizacao(b);
    if (!p.ok) return p;
    if (confirmar !== true) return Object.assign({}, p, { ok: false, motivo: "Confirme depois de ver a prévia." });
    var antiga = copiar(b.procedencia);
    b.base = copiar(p.novo.base);
    b.recursos.pv.max = p.novo.recursos.pv.max;
    b.recursos.pd.max = p.novo.recursos.pd.max;
    b.procedencia = Object.assign({}, p.novo.procedencia);
    b.historico.push({ quando: new Date().toISOString(), tipo: "preset", texto: "Atualizada do preset " + antiga.preset + " (dados v" + antiga.versaoDados + " → v" + b.procedencia.versaoDados + "): " + (p.diferencas.join("; ") || "sem diferenças nos números") + ". Registros de evolução preservados.", corrigido: false });
    b.recursos.pv.atual = Math.min(b.recursos.pv.atual, R().pvMax(b));
    b.recursos.pd.atual = Math.min(b.recursos.pd.atual, R().pdMax(b));
    return { ok: true, diferencas: p.diferencas };
  }

  global.RAMAOrdem2Evolucao = {
    MODOS: MODOS, TIPOS: TIPOS, PADRAO: PADRAO,
    normalizar: normalizar, normalizarConfig: normalizarConfig, configDaMesa: configDaMesa,
    passosAtributo: passosAtributo, passosPericia: passosPericia, extra: extra, chaveDaPericia: chaveDaPericia,
    permanenteAtributo: permanenteAtributo, permanentePericia: permanentePericia,
    previa: previa, registrar: registrar, desfazer: desfazer, dependentes: dependentes, vivos: vivos,
    previaAtualizacao: previaAtualizacao, aplicarAtualizacao: aplicarAtualizacao,
    rotuloGanho: rotuloGanho, resumo: resumo, trilha: trilha, desfazivel: desfazivel, PATAMAR_SUGERIDO: PATAMAR_SUGERIDO,
  };
})(typeof window !== "undefined" ? window : globalThis);
