/* =====================================================================
   R.A.M.A. — Oblívio · Homebrew na ficha (v9.19)
   ---------------------------------------------------------------------
   O lado da página de PAPEL, MOTIVAÇÃO, MAZELA e FARDO Homebrew. A
   definição, a chave e o registro moram no catálogo (js/oblivio/
   catalogo.js); a cópia na ficha, em regras.js (o servidor roda os dois).
   Aqui: carregarBiblioteca, deRegistro, prévias e versões.
   ===================================================================== */

(function (global) {
  "use strict";

  function C() { return global.RAMAOblivioCatalogo; }
  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  var TIPOS = ["papel", "motivacao", "mazela", "fardo"];
  var CAMPO = { papel: "papeis", motivacao: "motivacoes", mazela: "mazelas", fardo: "fardos", habilidade: "habilidades" };
  /* v9.31: a Habilidade Homebrew vem do tipo Habilidade (grupo habilidade). */
  var TIPOS_COPIA = TIPOS.concat(["habilidade"]);
  var ESCOPOS = { rodada: "por rodada", cena: "por cena", cenaCalma: "por cena de Descanso ou Interação", descanso: "entre Descansos", partida: "por Partida" };
  var ACOES = { passiva: "passiva", regular: "Ação Regular", extra: "Ação Extra", completa: "Ação Completa", "regular+movimento": "Regular + Movimento" };

  function previa(tipo, d) {
    if (tipo === "papel") {
      var l = ["Limite de Estresse: " + d.estresse + " + Carne.", "Especializações: " + (d.lista.map(function (k) { return C().conhecimento[k].nome; }).join(", ") || "nenhuma") + (d.lista.length < 6 ? " (no livro, seis)" : "") + "."];
      l.push("Principal: " + d.habilidadePrincipal.nome + " (" + ACOES[d.habilidadePrincipal.acao] + ")" + (d.habilidadePrincipal.resumo ? " — " + d.habilidadePrincipal.resumo : ""));
      d.habilidadesUnicas.forEach(function (h) { l.push("Única: " + h.nome + " (" + ACOES[h.acao] + ")" + (h.resumo ? " — " + h.resumo : "")); });
      return l;
    }
    if (tipo === "mazela") return [d.resumo || "(sem texto)", "Sai com: " + (d.remocao.map(function (r) { return r === "balsamo" ? "Bálsamo" : "Kit de Primeiros Socorros"; }).join(" ou ") || "decisão da mesa") + "."];
    if (tipo === "fardo") return [d.resumo || "(sem texto)", d.acumula ? "Acumula." : "Não acumula."];
    if (tipo === "habilidade") return ["Geral · " + ACOES[d.acao] + (d.limites ? " · " + d.limites[0].vezes + "× " + ESCOPOS[d.limite] + " (a ficha conta)" : "") + ".", d.resumo];
    return [d.resumo || "(sem texto)"];
  }

  function deRegistro(reg) {
    var m = obj(obj(reg).modelo);
    if (m.sistema === "oblivio" && m.grupo === "habilidade" && m.subtipo === "habilidade" && C() && C().normalizarHomebrew) {
      return { tipo: "habilidade", def: C().normalizarHomebrew("habilidade", Object.assign({}, obj(m.def), { chave: "", nome: reg.nome, homebrewId: reg.id, texto: reg.descricao || "" })) };
    }
    if (m.sistema !== "oblivio" || m.grupo !== "estrutural" || TIPOS.indexOf(m.subtipo) < 0 || !C() || !C().normalizarHomebrew) return null;
    var base = Object.assign({}, obj(m.def), { chave: "", nome: reg.nome, homebrewId: reg.id });
    if (!base.resumo && reg.descricao) base.resumo = reg.descricao;
    return { tipo: m.subtipo, def: C().normalizarHomebrew(m.subtipo, base) };
  }

  var biblioteca = null, carga = null;
  function vazia() { return { papeis: [], motivacoes: [], mazelas: [], fardos: [], habilidades: [] }; }
  function carregarBiblioteca(forcar) {
    if (biblioteca && !forcar) return Promise.resolve(biblioteca);
    if (carga && !forcar) return carga;
    var API = global.RAMAApi;
    if (!API || !API.listarHomebrew || !C()) return Promise.resolve(vazia());
    carga = API.listarHomebrew({ escopo: "todos", tipos: TIPOS.concat(["habilidade"]) }).then(function (r) {
      carga = null;
      var saida = vazia();
      ((r && r.ok && r.dados) || []).forEach(function (reg) {
        var x = deRegistro(reg);
        if (!x || !x.def) return;
        C().registrarHomebrew(x.tipo, x.def);
        saida[CAMPO[x.tipo]].push(x.def);
      });
      biblioteca = saida;
      return saida;
    }, function () { carga = null; return vazia(); });
    return carga;
  }

  function copiasDaFicha(o) {
    var hb = obj(obj(o).homebrew), out = [];
    TIPOS_COPIA.forEach(function (t) { Object.keys(obj(hb[CAMPO[t]])).forEach(function (k) { var d = hb[CAMPO[t]][k]; out.push({ campo: CAMPO[t], tipo: t, chave: k, nome: d.nome || k, homebrewId: d.homebrewId || "" }); }); });
    return out;
  }
  function versoesNovas(o, bib) {
    return copiasDaFicha(o).map(function (cp) {
      var nova = (obj(bib)[cp.campo] || []).filter(function (d) { return cp.homebrewId && d.homebrewId === cp.homebrewId && d.chave !== cp.chave; })[0];
      return nova ? Object.assign({}, cp, { def: nova }) : null;
    }).filter(Boolean);
  }
  function atualizarVersao(o, item) {
    var def = JSON.parse(JSON.stringify(item.def));
    var novo = JSON.parse(JSON.stringify(o).split(item.chave).join(def.chave));
    Object.keys(o).forEach(function (k) { delete o[k]; });
    Object.keys(novo).forEach(function (k) { o[k] = novo[k]; });
    o.homebrew = o.homebrew || { versao: 1 };
    o.homebrew[item.campo] = o.homebrew[item.campo] || {};
    o.homebrew[item.campo][def.chave] = def;
    C().registrarHomebrew(item.tipo, def);
    return true;
  }

  global.RAMAOblivioHomebrew = { TIPOS: TIPOS, ACOES: ACOES, previa: previa, deRegistro: deRegistro, carregarBiblioteca: carregarBiblioteca,
    copiasDaFicha: copiasDaFicha, versoesNovas: versoesNovas, atualizarVersao: atualizarVersao };
})(typeof window !== "undefined" ? window : globalThis);
