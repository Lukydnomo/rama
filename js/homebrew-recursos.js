/* =====================================================================
   R.A.M.A. — Homebrew · recursos e perícias NATIVOS para as ações do
   Modelo Universal (v9.35)
   ---------------------------------------------------------------------
   Uma ação Universal (custo, teste, efeito em recurso) roda em qualquer
   ficha. Este módulo traduz a ficha do sistema para a lista de recursos
   que o motor das ações conhece ({ id, nome, atual, maximo }) e grava a
   mudança pelo caminho de cada motor:

     universal   os recursos da ficha (status)
     ordem       PV, PE, SAN (e PD, com "Jogando sem Sanidade")
     ordem2      PV e PD
     tormenta20  PV e PM
     goblins     Vitalidade (o que falta são os ferimentos)
     vampiro     Vitalidade e Força de Vontade (perder vira dano
                 Superficial; recuperar tira dano Superficial)
     oblivio     — o Estresse é por região; fica com a mesa
     brutal      — os Pontos de Tensão moram na mesa da Diretora

   Nada é adivinhado: um recurso com outro nome a pessoa escolhe na lista.
   Perícias nativas (para somar ao teste): Ordem e Tormenta20.

     recursos(ficha)                [{ id, nome, atual, maximo }]
     aplicar(ficha, mudancas, opId) grava (com o opId, onde o motor tem)
     semRecursos(ficha)             o porquê, quando a lista é vazia
     pericias(ficha)                [{ id, nome, bonus }]
   ===================================================================== */

(function (global) {
  "use strict";

  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  function int(v) { var n = Math.round(Number(v)); return isFinite(n) ? n : 0; }
  function tipo(ficha) { return global.RAMAFicha ? global.RAMAFicha.tipoDeFicha(obj(ficha).tipoFicha) : String(obj(ficha).tipoFicha || "universal"); }

  var SISTEMAS = {
    universal: {
      recursos: function (f) { return (f.status || []).map(function (s) { return { id: s.id, nome: s.nome, atual: int(s.atual), maximo: int(s.maximo) }; }); },
      aplicar: function (f, m) { m.forEach(function (x) { var s = (f.status || []).filter(function (y) { return y.id === x.statusId; })[0]; if (s) s.atual = x.para; }); return { ok: true }; },
    },
    ordem: {
      recursos: function (f) {
        var R = global.RAMAOrdemRegras, o = f.ordem;
        if (!R || !o) return [];
        var rec = obj(o.recursos), l = [["pv", "PV", R.pontosDeVida], ["pe", "PE", R.pontosDeEsforco], ["san", "SAN", R.sanidade]];
        if (R.usaDeterminacao && R.usaDeterminacao(o)) l.push(["pd", "PD", R.determinacao]);
        return l.map(function (x) { var max = int(x[2](o).total); return { id: x[0], nome: x[1], atual: rec[x[0]] === null || rec[x[0]] === undefined ? max : int(rec[x[0]]), maximo: max }; });
      },
      aplicar: function (f, m) { var o = f.ordem; o.recursos = o.recursos || {}; m.forEach(function (x) { o.recursos[x.statusId] = Math.max(0, int(x.para)); }); return { ok: true }; },
    },
    ordem2: {
      recursos: function (f) {
        var r = obj(obj(f.ordem2).recursos);
        return [["pv", "PV"], ["pd", "PD"]].filter(function (x) { return r[x[0]]; }).map(function (x) { return { id: x[0], nome: x[1], atual: int(r[x[0]].atual), maximo: int(r[x[0]].max) }; });
      },
      aplicar: function (f, m, opId) {
        var R = global.RAMAOrdem2, fn = function (b) { m.forEach(function (x) { b.recursos[x.statusId].atual = Math.max(0, Math.min(b.recursos[x.statusId].max, int(x.para))); }); return { ok: true }; };
        return R && R.aplicarOperacao ? R.aplicarOperacao(f.ordem2, opId, fn) : fn(f.ordem2);
      },
    },
    tormenta20: {
      recursos: function (f) {
        var R = global.RAMATormenta20, t = f.tormenta20;
        if (!R || !t) return [];
        var c = R.calcular(t);
        return [{ id: "pv", nome: "PV", atual: int(c.pv.atual), maximo: int(c.pv.max) }, { id: "pm", nome: "PM", atual: int(c.pm.atual), maximo: int(c.pm.max) }];
      },
      aplicar: function (f, m, opId) {
        var R = global.RAMATormenta20, t = f.tormenta20, c = R.calcular(t);
        var fn = function (x0) { m.forEach(function (x) { var k = x.statusId; x0.recursos[k] = Math.max(0, int(x.para)); x0.recursos[k + "Ref"] = int(c[k].max); }); return { ok: true }; };
        return R.aplicarOperacao ? R.aplicarOperacao(t, opId, fn) : fn(t);
      },
    },
    goblins: {
      recursos: function (f) {
        var R = global.RAMAGoblins, o = f.goblins;
        if (!R || !o) return [];
        var vit = int(R.calcular(o).vitalidade);
        return [{ id: "vitalidade", nome: "Vitalidade", atual: Math.max(0, vit - int(o.ferimentos)), maximo: vit }];
      },
      aplicar: function (f, m, opId) {
        var R = global.RAMAGoblins, vit = int(R.calcular(f.goblins).vitalidade);
        var fn = function (o) { m.forEach(function (x) { if (x.statusId === "vitalidade") o.ferimentos = Math.max(0, vit - int(x.para)); }); return { ok: true, eventos: [] }; };
        return R.aplicarOperacao && opId ? R.aplicarOperacao(f.goblins, opId, fn) : fn(f.goblins);
      },
    },
    vampiro: {
      recursos: function (f) {
        var R = global.RAMAVampiro, o = f.vampiro;
        if (!R || !o) return [];
        var c = R.calcular(o);
        return [["vitalidade", "Vitalidade"], ["forcaDeVontade", "Força de Vontade"]].map(function (x) { var t = c[x[0]]; return { id: x[0], nome: x[1], atual: Math.max(0, int(t.max) - int(t.superficial) - int(t.agravado)), maximo: int(t.max) }; });
      },
      aplicar: function (f, m, opId) {
        var R = global.RAMAVampiro, antes = SISTEMAS.vampiro.recursos(f);
        var fn = function (o) {
          m.forEach(function (x) {
            var a = antes.filter(function (y) { return y.id === x.statusId; })[0];
            if (!a) return;
            var d = int(x.para) - a.atual, trilha = o[x.statusId];
            if (d < 0) trilha.superficial = trilha.superficial - d;
            if (d > 0) trilha.superficial = Math.max(0, trilha.superficial - d);
          });
          return { ok: true, eventos: [] };
        };
        return R.aplicarOperacao && opId ? R.aplicarOperacao(f.vampiro, opId, fn) : fn(f.vampiro);
      },
    },
    oblivio: { recursos: function () { return []; }, sem: "Em Oblívio, o Estresse é por região do corpo: custo e efeito em recurso ficam com a mesa (o teste e os usos funcionam)." },
    brutal: { recursos: function () { return []; }, sem: "Em BRUTAL, os Pontos de Tensão moram na mesa da Diretora: custo e efeito em recurso ficam com ela (o teste e os usos funcionam)." },
  };

  function adaptador(ficha) { return SISTEMAS[tipo(ficha)] || SISTEMAS.universal; }
  function recursos(ficha) { try { return adaptador(ficha).recursos(obj(ficha)); } catch (e) { return []; } }
  function aplicar(ficha, mudancas, opId) {
    var a = adaptador(ficha);
    if (!a.aplicar) return { ok: false, motivo: a.sem || "Esta ficha não tem recursos para a ação." };
    return a.aplicar(ficha, mudancas || [], opId || "") || { ok: true };
  }
  function semRecursos(ficha) { return adaptador(ficha).sem || "A ficha não tem recursos: aplique o efeito à mão."; }

  /* As perícias nativas com o bônus de agora (para somar a um teste). */
  function pericias(ficha) {
    var f = obj(ficha), t = tipo(f);
    try {
      if (t === "ordem" && global.RAMAOrdemRegras && global.RAMAOrdemCatalogo && f.ordem) {
        return global.RAMAOrdemCatalogo.PERICIAS.map(function (p) { return { id: p.chave, nome: p.nome, bonus: int(global.RAMAOrdemRegras.bonusDePericia(f.ordem, p.chave, (f.inventario || {}).itens || []).total) }; });
      }
      if (t === "tormenta20" && global.RAMATormenta20 && global.RAMATormenta20Dados && f.tormenta20) {
        var c = global.RAMATormenta20.calcular(f.tormenta20);
        return global.RAMATormenta20Dados.PERICIAS.filter(function (p) { return c.pericias[p.chave]; }).map(function (p) { return { id: p.chave, nome: p.nome, bonus: int(c.pericias[p.chave].total) }; });
      }
    } catch (e) { return []; }
    return [];
  }

  global.RAMAHomebrewRecursos = { recursos: recursos, aplicar: aplicar, semRecursos: semRecursos, pericias: pericias, SISTEMAS: SISTEMAS };
})(typeof window !== "undefined" ? window : globalThis);
