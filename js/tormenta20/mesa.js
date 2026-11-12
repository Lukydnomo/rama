/* =====================================================================
   R.A.M.A. — Tormenta20 · a mesa da campanha (RAMATormenta20Mesa)
   =====================================================================
   O estado que o mestre guarda numa campanha de Tormenta20
   (CAMPANHA_TORMENTA20, uma linha por campanha). Puro: quem rola passa
   `rolar(expressao)`. O mesmo arquivo roda no servidor (Tormenta20.gs).

     regras        opções da campanha: parceiros vulneráveis, XP por
                   marcos, custo de vida, envelhecimento
     dia, cena     o tempo da campanha
     combate       participantes (personagens e ocorrências
                   INDEPENDENTES de ameaças, cada uma com PV, condições
                   e recargas próprios), iniciativa (o mestre rola uma
                   vez para os inimigos, p. 230), surpresa, rodada, vez
     encontros     encontros montados (ND do encontro, p. 282)
     desafios      desafios vencidos, empatados ou perdidos (XP, p. 326)
     tesouros      tesouros rolados (Tabela 8-1), guardados pelo id da
                   operação: repetir devolve o MESMO resultado
     distribuicoes recompensas aplicadas às fichas (por opId — uma
                   distribuição repetida não aplica de novo)
     perigos       perigos complexos em andamento (p. 320)
     notas         do mestre (nunca vão aos jogadores)
     registro      o que aconteceu (entradas privadas não vão aos jogadores)
   ===================================================================== */

(function (global) {
  "use strict";

  var VERSAO = 1;
  var MAX_PARTICIPANTES = 60, MAX_REGISTRO = 300, MAX_TESOUROS = 80, MAX_DISTRIBUICOES = 120, MAX_DESAFIOS = 200, MAX_ENCONTROS = 60, MAX_PERIGOS = 20;

  function A() { return global.RAMATormenta20Ameacas; }
  function D() { return global.RAMATormenta20Dados; }
  function IM() { return global.RAMATormenta20ItensMagicos; }
  function R() { return global.RAMATormenta20; }

  function copiar(x) { return x === undefined ? undefined : JSON.parse(JSON.stringify(x)); }
  var contador = 0;
  function novoId(p) { contador++; return (p || "m") + "-" + Date.now().toString(36) + contador.toString(36) + Math.random().toString(36).slice(2, 6); }
  function lista(v) { return Array.isArray(v) ? v : []; }
  function objeto(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  function texto(v, max) { return typeof v === "string" ? v.slice(0, max || 200) : (typeof v === "number" ? String(v) : ""); }
  function inteiro(v, padrao) { var n = Math.floor(Number(v)); return isFinite(n) ? n : (padrao === undefined ? 0 : padrao); }
  function chaveValida(v) { return typeof v === "string" && /^[A-Za-z0-9_:-]{1,80}$/.test(v); }
  function falha(m) { return { ok: false, motivo: m }; }

  function vazio() {
    return {
      versao: VERSAO, dia: 1, cena: 1,
      regras: { parceirosVulneraveis: false, xpPorMarcos: false, custoDeVida: false, envelhecimento: false, treinoPago: false },
      combate: { ativo: false, rodada: 0, vez: 0, ordem: [], participantes: [], surpresa: [] },
      encontros: [], desafios: [], tesouros: [], distribuicoes: [], perigos: [], notas: "", registro: [],
    };
  }

  function normalizarCondicao(b) { var c = objeto(b); return { id: texto(c.id, 40), rodadas: c.rodadas === null || c.rodadas === undefined ? null : inteiro(c.rodadas), duracao: texto(c.duracao, 20) || "cena", origem: texto(c.origem, 120) }; }
  function normalizarParticipante(b) {
    var p = objeto(b);
    var tipo = p.tipo === "pc" ? "pc" : (p.tipo === "aliado" ? "aliado" : "ameaca");
    var base = {
      id: chaveValida(p.id) ? p.id : novoId("p"), tipo: tipo, nome: texto(p.nome, 120) || "Participante",
      iniciativa: p.iniciativa === null || p.iniciativa === undefined || p.iniciativa === "" ? null : inteiro(p.iniciativa),
      surpreso: !!p.surpreso, oculto: !!p.oculto, derrotado: !!p.derrotado, notas: texto(p.notas, 1000),
      condicoes: lista(p.condicoes).slice(0, 30).map(normalizarCondicao).filter(function (c) { return c.id; }),
    };
    if (tipo === "pc") { base.personagemId = texto(p.personagemId, 80); return base; }
    base.ameacaId = texto(p.ameacaId, 80);
    base.nd = texto(p.nd, 10);
    base.homebrew = p.homebrew && typeof p.homebrew === "object" ? copiar(p.homebrew) : null;
    var pv = objeto(p.pv), pm = objeto(p.pm);
    base.pv = { atual: inteiro(pv.atual), max: Math.max(1, inteiro(pv.max, 1)), temp: Math.max(0, inteiro(pv.temp)) };
    base.pm = { atual: inteiro(pm.atual), max: Math.max(0, inteiro(pm.max)) };
    ["def", "fort", "ref", "von", "ini", "per"].forEach(function (k) { base[k] = inteiro(p[k]); });
    base.rd = {};
    Object.keys(objeto(p.rd)).slice(0, 20).forEach(function (k) { base.rd[texto(k, 30)] = Math.max(0, inteiro(p.rd[k])); });
    base.imune = lista(p.imune).map(function (x) { return texto(x, 30); }).slice(0, 30);
    base.vulner = lista(p.vulner).map(function (x) { return texto(x, 30); }).slice(0, 10);
    base.recargas = {};
    Object.keys(objeto(p.recargas)).slice(0, 20).forEach(function (k) { base.recargas[texto(k, 60)] = !!p.recargas[k]; });
    base.contadores = {};
    Object.keys(objeto(p.contadores)).slice(0, 20).forEach(function (k) { base.contadores[texto(k, 60)] = inteiro(p.contadores[k]); });
    base.grupoIniciativa = texto(p.grupoIniciativa, 40);
    return base;
  }

  function normalizar(bruto) {
    var b = objeto(bruto);
    var e = vazio();
    var rg = objeto(b.regras);
    Object.keys(e.regras).forEach(function (k) { e.regras[k] = rg[k] === true; });
    e.dia = Math.max(1, inteiro(b.dia, 1));
    e.cena = Math.max(1, inteiro(b.cena, 1));
    var cb = objeto(b.combate);
    e.combate.ativo = cb.ativo === true;
    e.combate.rodada = Math.max(0, inteiro(cb.rodada));
    e.combate.participantes = lista(cb.participantes).slice(0, MAX_PARTICIPANTES).map(normalizarParticipante);
    var ids = {}; e.combate.participantes.forEach(function (p) { ids[p.id] = true; });
    e.combate.ordem = lista(cb.ordem).filter(function (id) { return ids[id]; });
    e.combate.participantes.forEach(function (p) { if (e.combate.ordem.indexOf(p.id) < 0) e.combate.ordem.push(p.id); });
    e.combate.vez = Math.max(0, Math.min(e.combate.ordem.length - 1, inteiro(cb.vez)));
    e.combate.surpresa = lista(cb.surpresa).filter(function (id) { return ids[id]; });
    e.encontros = lista(b.encontros).slice(0, MAX_ENCONTROS).map(function (x) {
      var y = objeto(x);
      return { id: chaveValida(y.id) ? y.id : novoId("enc"), nome: texto(y.nome, 120) || "Encontro", notas: texto(y.notas, 2000),
        grupos: lista(y.grupos).slice(0, 12).map(function (g) { var z = objeto(g); return { ameacaId: texto(z.ameacaId, 80), quantidade: Math.max(1, Math.min(30, inteiro(z.quantidade, 1))), homebrew: z.homebrew && typeof z.homebrew === "object" ? copiar(z.homebrew) : null }; }).filter(function (g) { return g.ameacaId || g.homebrew; }) };
    });
    e.desafios = lista(b.desafios).slice(-MAX_DESAFIOS).map(function (x) {
      var y = objeto(x);
      return { id: chaveValida(y.id) ? y.id : novoId("des"), nome: texto(y.nome, 120) || "Desafio", nd: texto(y.nd, 10) || "1", resultado: ["vencido", "empate", "derrota"].indexOf(y.resultado) >= 0 ? y.resultado : "vencido", quando: texto(y.quando, 40), distribuido: texto(y.distribuido, 80) };
    });
    e.tesouros = lista(b.tesouros).slice(-MAX_TESOUROS).map(function (x) { var y = objeto(x); return { id: chaveValida(y.id) ? y.id : novoId("tes"), nd: texto(y.nd, 10), categoria: texto(y.categoria, 20), origem: texto(y.origem, 120), resultado: copiar(objeto(y.resultado)), distribuido: texto(y.distribuido, 80) }; });
    e.distribuicoes = lista(b.distribuicoes).slice(-MAX_DISTRIBUICOES).map(function (x) { var y = objeto(x); return { id: texto(y.id, 80), quando: texto(y.quando, 40), alvos: lista(y.alvos).map(function (a) { return texto(a, 80); }).slice(0, 12), resumo: texto(y.resumo, 600), xp: copiar(objeto(y.xp)), tibar: copiar(objeto(y.tibar)), itens: copiar(lista(y.itens)).slice(0, 60) }; });
    e.perigos = lista(b.perigos).slice(-MAX_PERIGOS).map(function (x) {
      var y = objeto(x);
      return { id: chaveValida(y.id) ? y.id : novoId("per"), perigoId: texto(y.perigoId, 80), nome: texto(y.nome, 120), rodada: Math.max(0, inteiro(y.rodada)), ativo: y.ativo !== false,
        sucessos: copiar(objeto(y.sucessos)), falhas: Math.max(0, inteiro(y.falhas)), extra: copiar(objeto(y.extra)), notas: texto(y.notas, 2000), testes: lista(y.testes).slice(-60).map(function (t) { var z = objeto(t); return { quem: texto(z.quem, 80), acao: texto(z.acao, 60), total: inteiro(z.total), cd: inteiro(z.cd), sucesso: !!z.sucesso, rodada: inteiro(z.rodada) }; }) };
    });
    e.notas = texto(b.notas, 20000);
    e.registro = lista(b.registro).slice(-MAX_REGISTRO).map(function (x) { var y = objeto(x); return { quando: texto(y.quando, 40), texto: texto(y.texto, 400), privado: !!y.privado }; });
    return e;
  }

  function registrar(e, t, privado) {
    e.registro.push({ quando: new Date().toISOString(), texto: texto(t, 400), privado: !!privado });
    if (e.registro.length > MAX_REGISTRO) e.registro = e.registro.slice(-MAX_REGISTRO);
  }

  /* O que os jogadores veem: sem notas, sem participantes ocultos, sem
     os números das ameaças (só o estado aparente), sem encontros
     planejados, sem tesouros não distribuídos, sem registro privado. */
  function estadoAparente(p) {
    if (p.derrotado) return "derrotado";
    var f = p.pv.max ? p.pv.atual / p.pv.max : 1;
    if (f <= 0) return "caido";
    if (f <= 0.25) return "muito ferido";
    if (f <= 0.5) return "ferido";
    if (f < 1) return "arranhado";
    return "ileso";
  }
  function vistaDosJogadores(e) {
    var visiveis = e.combate.participantes.filter(function (p) { return !p.oculto; });
    var ids = {}; visiveis.forEach(function (p) { ids[p.id] = true; });
    return {
      versao: e.versao, dia: e.dia, cena: e.cena, regras: copiar(e.regras),
      combate: {
        ativo: e.combate.ativo, rodada: e.combate.rodada,
        vezDe: e.combate.ativo ? (function () { var id = e.combate.ordem[e.combate.vez]; return ids[id] ? id : null; })() : null,
        ordem: e.combate.ordem.filter(function (id) { return ids[id]; }),
        participantes: visiveis.map(function (p) {
          var v = { id: p.id, tipo: p.tipo, nome: p.nome, iniciativa: p.iniciativa, derrotado: p.derrotado, condicoes: copiar(p.condicoes), surpreso: p.surpreso };
          if (p.tipo === "pc") v.personagemId = p.personagemId;
          else { v.estado = estadoAparente(p); v.def = null; }
          return v;
        }),
      },
      desafios: e.desafios.filter(function (d) { return d.distribuido; }).map(function (d) { return { id: d.id, nome: d.nome, nd: d.nd, resultado: d.resultado }; }),
      distribuicoes: e.distribuicoes.map(function (d) { return { id: d.id, quando: d.quando, alvos: d.alvos, resumo: d.resumo }; }),
      perigos: e.perigos.filter(function (p) { return p.ativo; }).map(function (p) { return { id: p.id, perigoId: p.perigoId, nome: p.nome, rodada: p.rodada, sucessos: copiar(p.sucessos), falhas: p.falhas }; }),
      registro: e.registro.filter(function (r) { return !r.privado; }).slice(-80),
    };
  }

  /* ------------------------------------------------------------ combate */
  function participante(e, id) { return e.combate.participantes.filter(function (p) { return p.id === id; })[0] || null; }
  function definicaoDaAmeaca(p) { return p && (p.homebrew || (A() && A().AMEACA[p.ameacaId])) || null; }

  function adicionarAmeaca(e, ref, quantidade, opcoes) {
    var op = objeto(opcoes);
    var def = typeof ref === "string" ? (A() && A().AMEACA[ref]) : ref;
    if (!def) return falha("Ameaça desconhecida.");
    var q = Math.max(1, Math.min(30, inteiro(quantidade, 1)));
    if (e.combate.participantes.length + q > MAX_PARTICIPANTES) return falha("Participantes demais no combate.");
    var mesmos = e.combate.participantes.filter(function (p) { return p.ameacaId === def.id; }).length;
    var grupo = op.grupoIniciativa || novoId("g");
    var novos = [];
    for (var i = 0; i < q; i++) {
      var inst = A().instanciar(def, { oculto: !!op.oculto, homebrew: typeof ref === "string" ? null : copiar(def) });
      inst.id = novoId("a");
      inst.nome = (op.nome || def.nome) + (q > 1 || mesmos ? " " + (mesmos + i + 1) : "");
      inst.grupoIniciativa = grupo;
      var p = normalizarParticipante(inst);
      e.combate.participantes.push(p);
      e.combate.ordem.push(p.id);
      novos.push(p);
    }
    registrar(e, "Entrou no combate: " + q + "× " + def.nome + " (ND " + def.nd + ")", !!op.oculto);
    return { ok: true, participantes: novos };
  }
  function adicionarPC(e, pc) {
    var x = objeto(pc);
    if (!x.personagemId) return falha("Personagem sem id.");
    if (e.combate.participantes.some(function (p) { return p.tipo === "pc" && p.personagemId === x.personagemId; })) return { ok: true, repetido: true };
    var p = normalizarParticipante({ tipo: "pc", personagemId: x.personagemId, nome: x.nome, iniciativa: x.iniciativa });
    e.combate.participantes.push(p); e.combate.ordem.push(p.id);
    return { ok: true, participante: p };
  }
  function removerParticipante(e, id) {
    var antes = e.combate.participantes.length;
    e.combate.participantes = e.combate.participantes.filter(function (p) { return p.id !== id; });
    var pos = e.combate.ordem.indexOf(id);
    if (pos >= 0) { e.combate.ordem.splice(pos, 1); if (pos < e.combate.vez) e.combate.vez--; }
    e.combate.vez = Math.max(0, Math.min(e.combate.vez, e.combate.ordem.length - 1));
    return antes !== e.combate.participantes.length;
  }

  /* Iniciativa (p. 230): cada personagem rola a sua (vem da ficha); o
     mestre faz um teste só para os inimigos, com o menor bônus entre
     eles (ou um teste por grupo, se preferir). */
  function rolarIniciativaDosInimigos(e, rolar, porGrupo) {
    var inimigos = e.combate.participantes.filter(function (p) { return p.tipo !== "pc" && !p.derrotado; });
    if (!inimigos.length) return { ok: true, rolagens: [] };
    var rolagens = [];
    var grupos = {};
    inimigos.forEach(function (p) { var g = porGrupo ? p.grupoIniciativa || p.id : "todos"; (grupos[g] = grupos[g] || []).push(p); });
    Object.keys(grupos).forEach(function (g) {
      var menor = Math.min.apply(null, grupos[g].map(function (p) { return p.ini; }));
      var d = rolar("1d20");
      grupos[g].forEach(function (p) { p.iniciativa = d + menor; });
      rolagens.push({ grupo: g, d20: d, bonus: menor, total: d + menor, participantes: grupos[g].map(function (p) { return p.id; }) });
    });
    return { ok: true, rolagens: rolagens };
  }
  function definirIniciativa(e, id, valor) { var p = participante(e, id); if (!p) return falha("Participante não encontrado."); p.iniciativa = inteiro(valor); return { ok: true }; }
  function ordenar(e) {
    var pos = {}; e.combate.ordem.forEach(function (id, i) { pos[id] = i; });
    e.combate.ordem = e.combate.participantes.slice().sort(function (a, b) {
      var ia = a.iniciativa === null ? -999 : a.iniciativa, ib = b.iniciativa === null ? -999 : b.iniciativa;
      if (ib !== ia) return ib - ia;
      if ((a.tipo === "pc") !== (b.tipo === "pc")) return a.tipo === "pc" ? -1 : 1;
      return (pos[a.id] || 0) - (pos[b.id] || 0);
    }).map(function (p) { return p.id; });
  }
  /* Surpresa (p. 230): surpreendidos ficam desprevenidos e não agem na
     primeira rodada. */
  function iniciarCombate(e, surpreendidos) {
    if (!e.combate.participantes.length) return falha("Ninguém no combate.");
    ordenar(e);
    e.combate.ativo = true; e.combate.rodada = 1; e.combate.vez = 0;
    e.combate.surpresa = lista(surpreendidos).filter(function (id) { return participante(e, id); });
    e.combate.participantes.forEach(function (p) {
      p.surpreso = e.combate.surpresa.indexOf(p.id) >= 0;
      if (p.surpreso && !p.condicoes.some(function (c) { return c.id === "surpreendido"; })) p.condicoes.push({ id: "surpreendido", rodadas: 1, duracao: "rodadas", origem: "Surpresa" });
    });
    registrar(e, "Combate iniciado" + (e.combate.surpresa.length ? " (surpresa)" : ""));
    return { ok: true, vez: e.combate.ordem[0] };
  }
  /* Avança a vez. No início do turno de uma ameaça: condições com
     rodadas que terminam no turno dela e o lembrete de efeitos de início
     de turno (sangramento, chamas, sufocamento…). */
  function proximaVez(e) {
    if (!e.combate.ativo) return falha("Combate não iniciado.");
    var eventos = [];
    var n = e.combate.ordem.length;
    for (var voltas = 0; voltas < n + 1; voltas++) {
      e.combate.vez++;
      if (e.combate.vez >= n) { e.combate.vez = 0; e.combate.rodada++; eventos = eventos.concat(fimDaRodada(e)); }
      var p = participante(e, e.combate.ordem[e.combate.vez]);
      if (!p || p.derrotado) continue;
      if (p.surpreso && e.combate.rodada === 1) continue;
      eventos = eventos.concat(inicioDoTurno(e, p));
      break;
    }
    return { ok: true, vez: e.combate.ordem[e.combate.vez], rodada: e.combate.rodada, eventos: eventos };
  }
  function inicioDoTurno(e, p) {
    var ev = [];
    p.condicoes.forEach(function (c) {
      var cd = D() && D().CONDICAO[c.id];
      if (cd && cd.inicioDoTurno) ev.push({ tipo: "inicioDoTurno", participante: p.id, condicao: c.id, texto: cd.inicioDoTurno });
    });
    if (p.tipo !== "pc") {
      var def = definicaoDaAmeaca(p);
      if (def && def.curaAcelerada && !p.derrotado) {
        var bloqueada = lista(def.curaBloqueadaPor).some(function (t) { return p.contadores["bloqueio:" + t]; });
        if (!bloqueada) { var antes = p.pv.atual; p.pv.atual = Math.min(p.pv.max, p.pv.atual + def.curaAcelerada); if (p.pv.atual !== antes) ev.push({ tipo: "curaAcelerada", participante: p.id, valor: p.pv.atual - antes }); }
        lista(def.curaBloqueadaPor).forEach(function (t) { delete p.contadores["bloqueio:" + t]; });
      }
    }
    return ev;
  }
  /* Fim da rodada: condições contadas em rodadas diminuem; zeradas saem. */
  function fimDaRodada(e) {
    var ev = [];
    e.combate.participantes.forEach(function (p) {
      p.surpreso = false;
      p.condicoes = p.condicoes.filter(function (c) {
        if (c.rodadas === null) return true;
        c.rodadas--;
        if (c.rodadas <= 0) { ev.push({ tipo: "condicaoTerminou", participante: p.id, condicao: c.id }); return false; }
        return true;
      });
    });
    return ev;
  }
  /* Fim da cena (p. 394): condições de cena terminam; recargas voltam. */
  function encerrarCombate(e) {
    e.combate.ativo = false; e.combate.rodada = 0; e.combate.vez = 0; e.combate.surpresa = [];
    e.combate.participantes.forEach(function (p) {
      p.condicoes = p.condicoes.filter(function (c) { return c.duracao === "permanente" || c.duracao === "dia"; });
      if (p.recargas) Object.keys(p.recargas).forEach(function (k) { p.recargas[k] = false; });
      p.surpreso = false;
    });
    e.cena++;
    registrar(e, "Combate encerrado");
    return { ok: true };
  }
  function limparDerrotados(e) {
    var fora = e.combate.participantes.filter(function (p) { return p.tipo !== "pc" && p.derrotado; }).map(function (p) { return p.id; });
    fora.forEach(function (id) { removerParticipante(e, id); });
    return { ok: true, removidos: fora.length };
  }

  /* Dano numa ameaça (p. 226–228): imunidade; vulnerabilidade (+50%);
     RD geral e por tipo (RD x/mágico só vale contra não mágico; RD x/luz
     só contra o que não é luz); metade de dano físico (ogro, thuwarokk)
     e de fontes mundanas (dragão-rei); bando e enxame: +50% de área;
     enxame: metade de ataques com armas; PV temporários primeiro; perda
     de vida ignora RD. */
  var FISICOS = { corte: 1, impacto: 1, perfuracao: 1 };
  function danoEmAmeaca(e, id, valor, tipo, opcoes) {
    var p = participante(e, id);
    if (!p || p.tipo === "pc") return falha("Alvo inválido.");
    var op = objeto(opcoes);
    var def = definicaoDaAmeaca(p) || {};
    var v = Math.max(0, inteiro(valor));
    var notas = [];
    var t = tipo || "";
    if (t && (p.imune.indexOf(t) >= 0)) return { ok: true, dano: 0, notas: ["imune a " + t], pv: p.pv.atual };
    if (op.critico && p.imune.indexOf("critico") >= 0 && op.danoCritico) { v = Math.max(0, v - inteiro(op.danoCritico)); notas.push("imune a críticos"); }
    if (op.metade) { v = Math.floor(v / 2); notas.push("metade"); }
    if ((def.bando || def.enxame) && op.area) { v = Math.floor(v * 1.5); notas.push("+50% (área)"); }
    if (def.enxame && op.arma) { v = Math.floor(v / 2); notas.push("metade (enxame contra armas)"); }
    if ((def.metadeFisico || lista(def.habs).some(function (h) { return h.metadeFisico; })) && FISICOS[t]) { v = Math.floor(v / 2); notas.push("metade (dano físico)"); }
    if (def.metadeMundano && !op.magico) { v = Math.floor(v / 2); notas.push("metade (fonte mundana)"); }
    if (t && p.vulner.indexOf(t) >= 0) { v = Math.floor(v * 1.5); notas.push("vulnerável (+50%)"); }
    if (!op.perdaDeVida && t !== "perdaDeVida") {
      var rd = (p.rd.geral || 0) + (t ? (p.rd[t] || 0) : 0);
      if (!op.magico && p.rd.naoMagico) rd += p.rd.naoMagico;
      if (t !== "luz" && p.rd.naoLuz) rd += p.rd.naoLuz;
      if (op.ignoraRD) rd = Math.max(0, rd - inteiro(op.ignoraRD));
      if (rd) { var antes = v; v = Math.max(0, v - rd); notas.push("RD " + rd + " (–" + (antes - v) + ")"); }
    }
    if (def.curaBloqueadaPor && lista(def.curaBloqueadaPor).indexOf(t) >= 0) { p.contadores["bloqueio:" + t] = 1; notas.push("cura acelerada bloqueada por " + t); }
    var absorvido = 0;
    if (p.pv.temp > 0) { absorvido = Math.min(p.pv.temp, v); p.pv.temp -= absorvido; }
    p.pv.atual -= (v - absorvido);
    var derrotado = false;
    if (p.pv.atual <= 0 && !p.derrotado) { p.derrotado = true; derrotado = true; registrar(e, p.nome + " foi derrotado", !!p.oculto); }
    return { ok: true, dano: v, absorvido: absorvido, pv: p.pv.atual, derrotado: derrotado, notas: notas };
  }
  function curarAmeaca(e, id, valor, opcoes) {
    var p = participante(e, id);
    if (!p || p.tipo === "pc") return falha("Alvo inválido.");
    var def = definicaoDaAmeaca(p) || {};
    var op = objeto(opcoes);
    if (def.tipo === "construto" && !op.oficio) return falha("Construtos não recuperam PV com cura (use Ofício artesão).");
    if (def.tipo === "mortoVivo" && op.luz) return falha("Cura de luz fere mortos-vivos: use dano de luz.");
    var antes = p.pv.atual;
    p.pv.atual = Math.min(p.pv.max, p.pv.atual + Math.max(0, inteiro(valor)));
    if (p.pv.atual > 0) p.derrotado = false;
    return { ok: true, curado: p.pv.atual - antes, pv: p.pv.atual };
  }
  /* Condição numa ameaça: imunidade; agravamento (p. 394); a mesma não
     se repete (renova a duração). */
  function condicaoEmParticipante(e, id, condId, opcoes) {
    var p = participante(e, id);
    if (!p) return falha("Participante não encontrado.");
    var op = objeto(opcoes);
    var cd = D() && D().CONDICAO[condId];
    if (!cd) return falha("Condição desconhecida.");
    if (p.tipo !== "pc" && (p.imune.indexOf(condId) >= 0 || (cd.tipo && p.imune.indexOf(cd.tipo) >= 0))) return { ok: true, imune: true };
    var ja = p.condicoes.filter(function (c) { return c.id === condId; })[0];
    if (ja && cd.agrava) { p.condicoes = p.condicoes.filter(function (c) { return c.id !== condId; }); return condicaoEmParticipante(e, id, cd.agrava, op); }
    if (ja) { if (op.rodadas !== undefined) ja.rodadas = op.rodadas; return { ok: true, renovada: true, id: condId }; }
    p.condicoes.push(normalizarCondicao({ id: condId, rodadas: op.rodadas === undefined ? null : op.rodadas, duracao: op.duracao || (op.rodadas ? "rodadas" : "cena"), origem: op.origem }));
    return { ok: true, id: condId };
  }
  function removerCondicao(e, id, condId) { var p = participante(e, id); if (!p) return falha("Participante não encontrado."); var n = p.condicoes.length; p.condicoes = p.condicoes.filter(function (c) { return c.id !== condId; }); return { ok: true, removida: n !== p.condicoes.length }; }

  /* Ataque de uma ameaça contra uma Defesa (p. 231): compara antes do
     crítico; crítico multiplica só os dados da arma; bando: passar por 10
     dobra o dano, errar ainda causa metade. */
  function separarDano(d) {
    var s = String(d || "0").replace(/\s+/g, "");
    var m = /^(\d+d\d+)?([+-]\d+)?$/.exec(s);
    if (!m) return { dados: s, fixo: 0 };
    return { dados: m[1] || "", fixo: Number(m[2] || 0) };
  }
  function extrasDoAtaque(x) {
    if (!x) return [];
    return String(x).split(/\s*\+\s*/).map(function (parte) { var m = /^(\d+d\d+|\d+)\s*(\w*)/.exec(parte.trim()); return m ? { dados: m[1], tipo: m[2] || "", rotulo: "extra" } : null; }).filter(Boolean);
  }
  /* Bônus de manobra da ameaça (p. 234): o melhor ataque corpo a corpo
     (sem ele, Luta das perícias ou o melhor ataque), mais o tamanho;
     agarrado tira 2 como em qualquer ataque. */
  function manobraDaAmeaca(e, id) {
    var p = participante(e, id);
    var d = p && p.tipo !== "pc" ? definicaoDaAmeaca(p) : null;
    if (!d) return null;
    var corpo = lista(d.ataques).filter(function (a) { return !a.dist; });
    var pool = corpo.length ? corpo : lista(d.ataques);
    var melhor = pool.reduce(function (x, a) { return !x || a.a > x.a ? a : x; }, null);
    var luta = d.pericias && typeof d.pericias.luta === "number" ? d.pericias.luta : null;
    var base = corpo.length ? melhor.a : (luta !== null ? luta : (melhor ? melhor.a : 0));
    var tam = (D() && D().TAMANHO[d.tam]) || { manobra: 0, nome: "Médio" };
    var parcelas = [{ rotulo: corpo.length ? melhor.n : (luta !== null ? "Luta" : (melhor ? melhor.n : "Sem ataque")), valor: base }];
    if (tam.manobra) parcelas.push({ rotulo: "Tamanho (" + tam.nome + ")", valor: tam.manobra });
    var agarrado = lista(p.condicoes).some(function (c) { return c.id === "agarrado"; });
    if (agarrado) parcelas.push({ rotulo: "Agarrado", valor: -2 });
    return { total: base + (tam.manobra || 0) + (agarrado ? -2 : 0), parcelas: parcelas };
  }

  function ataqueDaAmeaca(e, id, ataqueId, defesaAlvo, rolar, opcoes) {
    var p = participante(e, id);
    if (!p || p.tipo === "pc") return falha("Atacante inválido.");
    var def = definicaoDaAmeaca(p);
    if (!def) return falha("Ficha da ameaça ausente.");
    var at = lista(def.ataques).filter(function (a) { return a.id === ataqueId; })[0] || def.ataques[0];
    if (!at) return falha("A ameaça não tem esse ataque.");
    var op = objeto(opcoes);
    var penal = 0;
    p.condicoes.forEach(function (c) { var cd = D().CONDICAO[c.id]; lista(cd && cd.efeitos).forEach(function (ef) { if (ef.alvo === "ataque" || ef.alvo === "pericias") penal = Math.min(penal, Number(ef.valor) || 0); }); });
    var partes = separarDano(at.d);
    var ataque = { ataque: at.a + penal + inteiro(op.bonusAtaque), dano: partes.dados || "0", danoFixo: partes.fixo, margem: at.m || 20, mult: at.c || 2, extras: extrasDoAtaque(at.x), tipo: at.t };
    var r = R().rolarAtaque(rolar, ataque, inteiro(defesaAlvo), {});
    var res = { ok: true, atacante: p.id, ataque: at.n, teste: r.teste, acertou: r.acertou, critico: r.critico, penalidade: penal };
    if (def.bando || at.bando) {
      if (r.acertou && r.teste.total >= inteiro(defesaAlvo) + 10 && r.dano) { r.dano.total *= 2; res.bando = "dobro"; }
      if (!r.acertou) {
        var meio = R().rolarAtaque(function (x) { return x === "1d20" ? 20 : rolar(x); }, Object.assign({}, ataque, { margem: 21 }), 0, {});
        if (meio.dano) { r.dano = meio.dano; r.dano.total = Math.floor(r.dano.total / 2); res.bando = "metade"; res.acertou = false; }
      }
    }
    res.dano = r.dano || null;
    res.efeito = at.efeito || null;
    return res;
  }
  function usarRecarga(e, id, habilidade, recarregando) { var p = participante(e, id); if (!p) return falha("Participante não encontrado."); p.recargas[texto(habilidade, 60)] = !recarregando ? true : false; return { ok: true, precisaRecarregar: p.recargas[habilidade] }; }

  /* ------------------------------------------------------- encontros */
  function salvarEncontro(e, dados) {
    var d = objeto(dados);
    var enc = normalizar({ encontros: [d] }).encontros[0];
    var idx = e.encontros.map(function (x) { return x.id; }).indexOf(enc.id);
    if (idx >= 0) e.encontros[idx] = enc; else e.encontros.push(enc);
    if (e.encontros.length > MAX_ENCONTROS) e.encontros = e.encontros.slice(-MAX_ENCONTROS);
    return { ok: true, encontro: enc, nd: ndDoEncontro(enc) };
  }
  function ndDoEncontro(enc) {
    var grupos = lista(enc.grupos).map(function (g) { var def = g.homebrew || (A() && A().AMEACA[g.ameacaId]); return def ? { nd: def.nd, quantidade: g.quantidade } : null; }).filter(Boolean);
    return A() ? A().ndDoEncontro(grupos) : { nd: 0, texto: "—" };
  }
  function iniciarEncontro(e, encontroId, opcoes) {
    var enc = e.encontros.filter(function (x) { return x.id === encontroId; })[0];
    if (!enc) return falha("Encontro não encontrado.");
    var novos = [];
    for (var i = 0; i < enc.grupos.length; i++) {
      var g = enc.grupos[i];
      var r = adicionarAmeaca(e, g.homebrew || g.ameacaId, g.quantidade, objeto(opcoes));
      if (!r.ok) return r;
      novos = novos.concat(r.participantes);
    }
    return { ok: true, participantes: novos };
  }

  /* -------------------------------------------- desafios, XP e tesouro */
  function registrarDesafio(e, dados) {
    var d = objeto(dados);
    var des = normalizar({ desafios: [Object.assign({ quando: new Date().toISOString() }, d)] }).desafios[0];
    if (e.desafios.some(function (x) { return x.id === des.id; })) return { ok: true, repetido: true, desafio: des };
    e.desafios.push(des);
    if (e.desafios.length > MAX_DESAFIOS) e.desafios = e.desafios.slice(-MAX_DESAFIOS);
    registrar(e, "Desafio: " + des.nome + " (ND " + des.nd + ", " + des.resultado + ")", true);
    return { ok: true, desafio: des };
  }
  /* Desafios dos participantes derrotados do combate atual (cada
     ameaça com seu ND, p. 282). */
  function desafiosDoCombate(e) {
    return e.combate.participantes.filter(function (p) { return p.tipo !== "pc" && p.derrotado; }).map(function (p) { return { id: "c-" + p.id, nome: p.nome, nd: p.nd || (definicaoDaAmeaca(p) || {}).nd || "1", resultado: "vencido" }; });
  }
  /* Prévia de XP para um grupo: soma de cada desafio pendente, pela
     quantidade de personagens; desafios irrelevantes não rendem. */
  function previaDeXp(e, desafioIds, personagens, nivelGrupo) {
    var ids = lista(desafioIds);
    var linhas = e.desafios.filter(function (d) { return ids.indexOf(d.id) >= 0 && !d.distribuido; }).map(function (d) {
      var x = IM().xpDoDesafio(d.nd, personagens, d.resultado, nivelGrupo);
      return { id: d.id, nome: d.nome, nd: d.nd, resultado: d.resultado, total: x.total, porPersonagem: x.porPersonagem, irrelevante: x.irrelevante };
    });
    return { linhas: linhas, porPersonagem: linhas.reduce(function (s, l) { return s + l.porPersonagem; }, 0), total: linhas.reduce(function (s, l) { return s + l.total; }, 0) };
  }
  /* Rolar tesouro: guardado pelo opId — repetir devolve o mesmo. */
  function rolarTesouro(e, opId, nd, categoria, rolar, origem) {
    var ja = e.tesouros.filter(function (t) { return t.id === opId; })[0];
    if (ja) return { ok: true, repetido: true, tesouro: ja };
    var r = IM().gerarTesouro(String(nd), categoria || "padrao", rolar);
    var t = { id: opId, nd: String(nd), categoria: categoria || "padrao", origem: texto(origem, 120), resultado: r, distribuido: "" };
    e.tesouros.push(t);
    if (e.tesouros.length > MAX_TESOUROS) e.tesouros = e.tesouros.slice(-MAX_TESOUROS);
    registrar(e, "Tesouro rolado (ND " + nd + ", " + (categoria || "padrao") + ")", true);
    return { ok: true, tesouro: t };
  }
  /* Marca uma distribuição já aplicada às fichas (o servidor só chama
     depois de gravar as fichas; o opId impede repetir). */
  function registrarDistribuicao(e, dist) {
    var d = objeto(dist);
    if (e.distribuicoes.some(function (x) { return x.id === d.id; })) return { ok: true, repetida: true };
    e.distribuicoes.push({ id: texto(d.id, 80), quando: new Date().toISOString(), alvos: lista(d.alvos).slice(0, 12), resumo: texto(d.resumo, 600), xp: copiar(objeto(d.xp)), tibar: copiar(objeto(d.tibar)), itens: copiar(lista(d.itens)).slice(0, 60) });
    lista(d.desafios).forEach(function (id) { var x = e.desafios.filter(function (y) { return y.id === id; })[0]; if (x) x.distribuido = d.id; });
    lista(d.tesouros).forEach(function (id) { var x = e.tesouros.filter(function (y) { return y.id === id; })[0]; if (x) x.distribuido = d.id; });
    if (e.distribuicoes.length > MAX_DISTRIBUICOES) e.distribuicoes = e.distribuicoes.slice(-MAX_DISTRIBUICOES);
    registrar(e, "Recompensas distribuídas: " + texto(d.resumo, 200));
    return { ok: true };
  }

  /* ------------------------------------------------- perigos complexos */
  function iniciarPerigo(e, perigoId, opcoes) {
    var def = A() && A().PERIGO[perigoId];
    if (!def || def.tipo !== "complexo") return falha("Perigo complexo desconhecido.");
    var op = objeto(opcoes);
    var p = { id: novoId("per"), perigoId: perigoId, nome: def.nome, rodada: 1, ativo: true, sucessos: {}, falhas: 0, extra: copiar(objeto(op.extra)), notas: "", testes: [] };
    e.perigos.push(p);
    if (e.perigos.length > MAX_PERIGOS) e.perigos = e.perigos.slice(-MAX_PERIGOS);
    registrar(e, "Perigo: " + def.nome + " (ND " + def.nd + ")");
    return { ok: true, perigo: p };
  }
  function testeDePerigo(e, id, quem, acao, total, cd, opcoes) {
    var p = e.perigos.filter(function (x) { return x.id === id; })[0];
    if (!p || !p.ativo) return falha("Perigo não encontrado.");
    var op = objeto(opcoes);
    var sucesso = op.natural === 20 || (op.natural !== 1 && inteiro(total) >= inteiro(cd));
    var valor = sucesso ? ((op.dobraCom10 && (inteiro(total) >= inteiro(cd) + 10 || op.natural === 20)) ? 2 : 1) : 0;
    var chave = texto(op.compartilhado ? "grupo" : quem, 80) || "grupo";
    if (sucesso) p.sucessos[chave] = (p.sucessos[chave] || 0) + valor;
    else p.falhas++;
    p.testes.push({ quem: texto(quem, 80), acao: texto(acao, 60), total: inteiro(total), cd: inteiro(cd), sucesso: sucesso, rodada: p.rodada });
    if (p.testes.length > 60) p.testes = p.testes.slice(-60);
    return { ok: true, sucesso: sucesso, valor: valor, sucessos: p.sucessos[chave] || 0, falhas: p.falhas };
  }
  function avancarPerigo(e, id) { var p = e.perigos.filter(function (x) { return x.id === id; })[0]; if (!p) return falha("Perigo não encontrado."); p.rodada++; return { ok: true, rodada: p.rodada }; }
  /* Avalanche (p. 320): zona pela soma de sucessos ao fim da 5ª rodada. */
  function resultadoDoPerigo(e, id) {
    var p = e.perigos.filter(function (x) { return x.id === id; })[0];
    if (!p) return falha("Perigo não encontrado.");
    var def = A().PERIGO[p.perigoId];
    var out = { ok: true, nome: def.nome, porPersonagem: {} };
    if (def.resultado) Object.keys(p.sucessos).forEach(function (k) { var s = p.sucessos[k]; out.porPersonagem[k] = def.resultado.filter(function (r) { return s <= r.ate; })[0]; });
    if (def.falhasMax && p.falhas >= def.falhasMax) out.tresFalhas = def.tresFalhas;
    if (def.sucessosPor && p.extra && p.extra.tamanho) { var meta = def.sucessosPor[p.extra.tamanho] || 0; out.meta = meta; out.concluido = (p.sucessos.grupo || 0) >= meta; }
    return out;
  }
  function encerrarPerigo(e, id) { var p = e.perigos.filter(function (x) { return x.id === id; })[0]; if (!p) return falha("Perigo não encontrado."); p.ativo = false; registrar(e, "Perigo encerrado: " + p.nome); return { ok: true }; }

  function novoDia(e) { e.dia++; e.cena++; registrar(e, "Dia " + e.dia); return { ok: true, dia: e.dia }; }
  function novaCena(e) { e.cena++; return { ok: true, cena: e.cena }; }

  global.RAMATormenta20Mesa = {
    VERSAO: VERSAO, vazio: vazio, normalizar: normalizar, normalizarParticipante: normalizarParticipante, vistaDosJogadores: vistaDosJogadores, registrar: registrar,
    participante: participante, definicaoDaAmeaca: definicaoDaAmeaca, adicionarAmeaca: adicionarAmeaca, adicionarPC: adicionarPC, removerParticipante: removerParticipante,
    rolarIniciativaDosInimigos: rolarIniciativaDosInimigos, definirIniciativa: definirIniciativa, ordenar: ordenar, iniciarCombate: iniciarCombate, proximaVez: proximaVez,
    fimDaRodada: fimDaRodada, encerrarCombate: encerrarCombate, limparDerrotados: limparDerrotados, estadoAparente: estadoAparente,
    danoEmAmeaca: danoEmAmeaca, curarAmeaca: curarAmeaca, condicaoEmParticipante: condicaoEmParticipante, removerCondicao: removerCondicao,
    ataqueDaAmeaca: ataqueDaAmeaca, manobraDaAmeaca: manobraDaAmeaca, usarRecarga: usarRecarga, separarDano: separarDano,
    salvarEncontro: salvarEncontro, ndDoEncontro: ndDoEncontro, iniciarEncontro: iniciarEncontro,
    registrarDesafio: registrarDesafio, desafiosDoCombate: desafiosDoCombate, previaDeXp: previaDeXp, rolarTesouro: rolarTesouro, registrarDistribuicao: registrarDistribuicao,
    iniciarPerigo: iniciarPerigo, testeDePerigo: testeDePerigo, avancarPerigo: avancarPerigo, resultadoDoPerigo: resultadoDoPerigo, encerrarPerigo: encerrarPerigo,
    novoDia: novoDia, novaCena: novaCena,
  };
})(typeof window !== "undefined" ? window : globalThis);
