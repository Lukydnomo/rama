/* =====================================================================
   R.A.M.A. — Ordem Paranormal RPG II · Homebrew na ficha (v9.21)
   ---------------------------------------------------------------------
   O lado da página de PERFIL e OCUPAÇÃO Homebrew (experimental, como a
   edição). Definição e registro: js/ordem2/catalogo.js; a cópia na
   ficha: regras.js (o servidor roda os dois). Aqui: carregarBiblioteca,
   deRegistro, prévias e versões.
   ===================================================================== */

(function (global) {
  "use strict";

  function K() { return global.RAMAOrdem2Catalogo; }
  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  function nomeHab(k) { return k && K().HABILIDADES[k] ? K().HABILIDADES[k].nome : "nenhuma"; }

  function previa(tipo, d) {
    if (tipo === "perfil") return [d.texto || "(sem texto)", "Habilidade de perfil: " + nomeHab(d.habilidade) + "."];
    return [d.texto || "(sem texto)", "Sugerida em: " + d.ambientacoes.map(function (a) { return (K().AMBIENTACOES[a] || {}).nome || a; }).join(", ") + ".", "Habilidade de ocupação: " + nomeHab(d.habilidade) + "."];
  }

  function deRegistro(reg) {
    var m = obj(obj(reg).modelo);
    if (m.sistema !== "ordem2" || m.grupo !== "estrutural" || ["perfil", "ocupacao"].indexOf(m.subtipo) < 0 || !K() || !K().normalizarHomebrew) return null;
    var base = Object.assign({}, obj(m.def), { chave: "", id: "", nome: reg.nome, homebrewId: reg.id });
    if (!base.texto) base.texto = reg.descricao || "";
    return { tipo: m.subtipo, def: K().normalizarHomebrew(m.subtipo, base) };
  }

  var biblioteca = null, carga = null;
  function carregarBiblioteca(forcar) {
    if (biblioteca && !forcar) return Promise.resolve(biblioteca);
    if (carga && !forcar) return carga;
    var API = global.RAMAApi, VAZIA = { perfis: [], ocupacoes: [] };
    if (!API || !API.listarHomebrew || !K()) return Promise.resolve(VAZIA);
    carga = API.listarHomebrew({ escopo: "todos", tipos: ["perfil", "ocupacao"] }).then(function (r) {
      carga = null;
      var saida = { perfis: [], ocupacoes: [] };
      ((r && r.ok && r.dados) || []).forEach(function (reg) {
        var x = deRegistro(reg);
        if (!x || !x.def) return;
        K().registrarHomebrew(x.tipo, x.def);
        saida[x.tipo === "perfil" ? "perfis" : "ocupacoes"].push(x.def);
      });
      biblioteca = saida;
      return saida;
    }, function () { carga = null; return VAZIA; });
    return carga;
  }

  function copiasDaFicha(o) {
    var hb = obj(obj(o).homebrew), out = [];
    Object.keys(obj(hb.perfis)).forEach(function (k) { out.push({ campo: "perfis", tipo: "perfil", chave: k, nome: hb.perfis[k].nome, homebrewId: hb.perfis[k].homebrewId || "" }); });
    Object.keys(obj(hb.ocupacoes)).forEach(function (k) { out.push({ campo: "ocupacoes", tipo: "ocupacao", chave: k, nome: hb.ocupacoes[k].nome, homebrewId: hb.ocupacoes[k].homebrewId || "" }); });
    return out;
  }
  function versoesNovas(o, bib) {
    return copiasDaFicha(o).map(function (cp) {
      var nova = (obj(bib)[cp.campo] || []).filter(function (d) { return cp.homebrewId && d.homebrewId === cp.homebrewId && (d.chave || d.id) !== cp.chave; })[0];
      return nova ? Object.assign({}, cp, { def: nova }) : null;
    }).filter(Boolean);
  }
  function atualizarVersao(o, item) {
    var def = JSON.parse(JSON.stringify(item.def)), nova = def.chave || def.id;
    var novo = JSON.parse(JSON.stringify(o).split(item.chave).join(nova));
    Object.keys(o).forEach(function (k) { delete o[k]; });
    Object.keys(novo).forEach(function (k) { o[k] = novo[k]; });
    o.homebrew = o.homebrew || { versao: 1 };
    o.homebrew[item.campo] = o.homebrew[item.campo] || {};
    o.homebrew[item.campo][nova] = def;
    if (item.tipo === "ocupacao" && o.ocupacao) o.ocupacao.nome = def.nome;
    K().registrarHomebrew(item.tipo, def);
    return true;
  }

  global.RAMAOrdem2Homebrew = { previa: previa, deRegistro: deRegistro, carregarBiblioteca: carregarBiblioteca, copiasDaFicha: copiasDaFicha, versoesNovas: versoesNovas, atualizarVersao: atualizarVersao };
})(typeof window !== "undefined" ? window : globalThis);
