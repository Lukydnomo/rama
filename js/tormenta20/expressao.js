/* =====================================================================
   R.A.M.A. — Tormenta20 · expressões dos dados
   ---------------------------------------------------------------------
   Os catálogos escrevem valores como "1 + floor((nc - 3) / 6)",
   "min(atr.car, nivel)" ou "tem.peleDeAco ? 8 : 4". Isto avalia essas
   expressões SEM eval: um analisador pequeno, com números, textos entre
   aspas, nomes com ponto, + − × ÷, comparações, &&, ||, !, ?: e as
   funções floor, ceil, min, max, abs. Nome desconhecido vale 0.
   ===================================================================== */

(function (global) {
  "use strict";

  var FUNCOES = {
    floor: Math.floor, ceil: Math.ceil, abs: Math.abs, round: Math.round,
    min: function () { return Math.min.apply(null, arguments); },
    max: function () { return Math.max.apply(null, arguments); },
  };

  function tokens(s) {
    var out = [], i = 0;
    while (i < s.length) {
      var c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (/[0-9.]/.test(c)) { var j = i; while (j < s.length && /[0-9.]/.test(s[j])) j++; out.push({ t: "n", v: Number(s.slice(i, j)) }); i = j; continue; }
      if (/[A-Za-z_]/.test(c)) { var k = i; while (k < s.length && /[A-Za-z0-9_.:]/.test(s[k])) k++; out.push({ t: "id", v: s.slice(i, k) }); i = k; continue; }
      if (c === "'" || c === '"') { var f = s.indexOf(c, i + 1); if (f < 0) throw new Error("texto sem fim"); out.push({ t: "s", v: s.slice(i + 1, f) }); i = f + 1; continue; }
      var dois = s.slice(i, i + 2);
      if (["&&", "||", ">=", "<=", "==", "!="].indexOf(dois) >= 0) { out.push({ t: "op", v: dois }); i += 2; continue; }
      if ("+-*/()?:,<>!".indexOf(c) >= 0) { out.push({ t: "op", v: c }); i++; continue; }
      throw new Error("caractere inválido: " + c);
    }
    return out;
  }

  function avaliar(expr, ctx) {
    if (typeof expr === "number") return expr;
    if (expr === null || expr === undefined || expr === "") return 0;
    if (typeof expr === "boolean") return expr ? 1 : 0;
    var tk;
    try { tk = tokens(String(expr)); } catch (e) { return 0; }
    var p = 0;
    function olha() { return tk[p]; }
    function e(op) { if (tk[p] && tk[p].t === "op" && tk[p].v === op) { p++; return true; } return false; }
    function valorDe(nome) {
      var v = typeof ctx === "function" ? ctx(nome) : (ctx ? ctx[nome] : undefined);
      if (v === undefined && ctx && typeof ctx !== "function" && nome.indexOf(".") > 0) {
        var partes = nome.split("."), o = ctx;
        for (var q = 0; q < partes.length && o !== undefined && o !== null; q++) o = o[partes[q]];
        v = o;
      }
      if (v === undefined || v === null) return 0;
      if (typeof v === "boolean") return v ? 1 : 0;
      return v;
    }
    function primario() {
      var t = olha();
      if (!t) return 0;
      if (e("(")) { var v = ternario(); e(")"); return v; }
      if (e("-")) return -num(primario());
      if (e("!")) return verdade(primario()) ? 0 : 1;
      p++;
      if (t.t === "n") return t.v;
      if (t.t === "s") return t.v;
      if (t.t === "id") {
        if (t.v === "true") return 1;
        if (t.v === "false") return 0;
        if (FUNCOES[t.v] && olha() && olha().v === "(") {
          p++;
          var args = [];
          if (!e(")")) { do { args.push(num(ternario())); } while (e(",")); e(")"); }
          return FUNCOES[t.v].apply(null, args);
        }
        return valorDe(t.v);
      }
      return 0;
    }
    function num(v) { return typeof v === "number" ? v : (isFinite(Number(v)) ? Number(v) : 0); }
    function verdade(v) { return typeof v === "string" ? v !== "" && v !== "0" : !!v; }
    function mult() { var v = primario(); for (;;) { if (e("*")) v = num(v) * num(primario()); else if (e("/")) { var d = num(primario()); v = d ? num(v) / d : 0; } else return v; } }
    function soma() { var v = mult(); for (;;) { if (e("+")) { var b = mult(); v = (typeof v === "string" || typeof b === "string") ? String(v) + String(b) : v + b; } else if (e("-")) v = num(v) - num(mult()); else return v; } }
    function comp() {
      var v = soma();
      for (;;) {
        if (e(">=")) v = num(v) >= num(soma()) ? 1 : 0;
        else if (e("<=")) v = num(v) <= num(soma()) ? 1 : 0;
        else if (e(">")) v = num(v) > num(soma()) ? 1 : 0;
        else if (e("<")) v = num(v) < num(soma()) ? 1 : 0;
        else if (e("==")) v = String(v) === String(soma()) ? 1 : 0;
        else if (e("!=")) v = String(v) !== String(soma()) ? 1 : 0;
        else return v;
      }
    }
    function e_() { var v = comp(); while (e("&&")) { var b = comp(); v = verdade(v) && verdade(b) ? (verdade(b) ? b : 1) : 0; } return v; }
    function ou() { var v = e_(); while (e("||")) { var b = e_(); v = verdade(v) ? v : b; } return v; }
    function ternario() { var c = ou(); if (e("?")) { var a = ternario(); e(":"); var b = ternario(); return verdade(c) ? a : b; } return c; }
    var r = ternario();
    return r;
  }
  function numero(expr, ctx) { var v = avaliar(expr, ctx); return typeof v === "number" && isFinite(v) ? v : (isFinite(Number(v)) ? Number(v) : 0); }
  function texto(expr, ctx) { var v = avaliar(expr, ctx); return v === 0 && typeof expr === "string" && !/[a-z]/i.test(expr) ? "0" : String(v); }

  /* "(1 + x)d12", "(2 + 2 * x)d6", "2d6 + 1": resolve as partes entre
     parênteses antes do "d" e devolve uma expressão de dado simples. */
  function dados(expr, ctx) {
    if (expr === null || expr === undefined) return "";
    var s = String(expr);
    s = s.replace(/\(([^()]*)\)\s*d(\d+)/g, function (m, dentro, faces) { return Math.max(0, Math.floor(numero(dentro, ctx))) + "d" + faces; });
    s = s.replace(/\b([a-z][A-Za-z0-9_.]*)\s*d(\d+)/g, function (m, nome, faces) { return Math.max(0, Math.floor(numero(nome, ctx))) + "d" + faces; });
    s = s.replace(/\(([^()]*)\)/g, function (m, dentro) { return /\d+d\d+/.test(dentro) ? m : String(Math.floor(numero(dentro, ctx))); });
    s = s.replace(/(^|[^A-Za-z0-9_.])([a-z][A-Za-z0-9_.]*)/g, function (m, antes, nome) { return /^d\d+$/.test(nome) ? m : antes + Math.floor(numero(nome, ctx)); });
    s = s.replace(/\s+/g, "").replace(/\+-/g, "-").replace(/-\+/g, "-").replace(/\+0(?![\d.d])/g, "");
    return s;
  }

  /* Expressão que vira dado: com aspas ou ?: avalia antes (o resultado é
     o texto do dado); sem isso, resolve direto as partes do dado. */
  function rolavel(expr, ctx) {
    if (expr === null || expr === undefined || expr === "") return "";
    if (typeof expr === "number") return String(expr);
    var s = String(expr);
    if (/['"?]/.test(s)) return dados(texto(s, ctx), ctx);
    return dados(s, ctx);
  }

  global.RAMATormenta20Expressao = { avaliar: avaliar, numero: numero, texto: texto, dados: dados, rolavel: rolavel };
})(typeof window !== "undefined" ? window : globalThis);
