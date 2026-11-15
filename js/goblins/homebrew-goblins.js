/* =====================================================================
   R.A.M.A. — Malditos Goblins · Homebrew na ficha (v9.17)
   ---------------------------------------------------------------------
   O lado da página da OCUPAÇÃO e do DESCRITOR Homebrew. A definição, a
   chave versionada e o registro moram no catálogo (js/goblins/catalogo.js),
   que o servidor também roda; a cópia na ficha, em regras.js. Aqui:
   carregarBiblioteca (as da conta entram no catálogo: a criação as
   lista), deRegistro, as prévias e a atualização de versão.
   ===================================================================== */

(function (global) {
  "use strict";

  function C() { return global.RAMAGoblinsCatalogo; }
  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  var NOMES = { combate: "Combate", habilidade: "Habilidade", nocao: "Noção", vitalidade: "Vitalidade" };
  function textoMods(m) { var l = Object.keys(obj(m)).map(function (a) { return NOMES[a] + " " + (m[a] > 0 ? "+" : "") + m[a]; }); return l.join(", "); }

  function previaOcupacao(d) {
    var l = ["Atributos: " + (textoMods(d.mod) || "nenhum ajuste") + "."];
    l.push("Equipamento inicial (uma opção): " + (d.equipamento.map(function (e) { return e.rotulo; }).join(" · ") || "nenhum") + ".");
    d.tecnicas.forEach(function (t) { l.push("Nível " + t.nivel + " · " + t.nome + (t.uso === "dia" ? " (1 vez por dia)" : "") + (t.texto ? ": " + t.texto : "")); });
    return l;
  }
  function previaDescritor(d) {
    return [(textoMods(d.mod) || "Sem modificador fixo") + (d.escolha ? "; quem joga escolhe um atributo para +1" : "") + "." + (d.texto ? " " + d.texto : "")];
  }

  function deRegistro(reg) {
    var m = obj(obj(reg).modelo);
    if (m.sistema !== "goblins" || m.grupo !== "estrutural" || !C()) return null;
    var base = Object.assign({}, obj(m.def), { chave: "", nome: reg.nome, homebrewId: reg.id });
    if (m.subtipo === "ocupacao") return { tipo: "ocupacao", def: C().normalizarOcupacaoHomebrew(Object.assign(base, { descricao: reg.descricao || "" })) };
    if (m.subtipo === "descritor") return { tipo: "descritor", def: C().normalizarDescritorHomebrew(Object.assign(base, { texto: obj(m.def).texto || reg.descricao || "" })) };
    return null;
  }

  var biblioteca = null, carga = null;
  function carregarBiblioteca(forcar) {
    if (biblioteca && !forcar) return Promise.resolve(biblioteca);
    if (carga && !forcar) return carga;
    var API = global.RAMAApi, VAZIA = { ocupacoes: [], descritores: [] };
    if (!API || !API.listarHomebrew || !C()) return Promise.resolve(VAZIA);
    carga = API.listarHomebrew({ escopo: "todos", tipos: ["ocupacao", "descritor"] }).then(function (r) {
      carga = null;
      var saida = { ocupacoes: [], descritores: [] };
      ((r && r.ok && r.dados) || []).forEach(function (reg) {
        var x = deRegistro(reg);
        if (!x || !x.def) return;
        if (x.tipo === "ocupacao") { C().registrarOcupacaoHomebrew(x.def); saida.ocupacoes.push(x.def); }
        else { C().registrarDescritorHomebrew(x.def); saida.descritores.push(x.def); }
      });
      biblioteca = saida;
      return saida;
    }, function () { carga = null; return VAZIA; });
    return carga;
  }

  /* As cópias da ficha e as versões novas (o painel de js/homebrew-versoes.js). */
  var CAMPOS = [["ocupacoes", "ocupacoes", "ocupacao"], ["descritores", "descritores", "descritor"]];
  function copiasDaFicha(o) {
    var hb = obj(obj(o).homebrew), out = [];
    CAMPOS.forEach(function (c) { Object.keys(obj(hb[c[0]])).forEach(function (k) { var d = hb[c[0]][k]; out.push({ campo: c[0], tipo: c[2], chave: k, nome: d.nome || k, homebrewId: d.homebrewId || "" }); }); });
    return out;
  }
  function versoesNovas(o, bib) {
    var b = obj(bib);
    return copiasDaFicha(o).map(function (cp) {
      var nova = (b[cp.campo] || []).filter(function (d) { return cp.homebrewId && d.homebrewId === cp.homebrewId && d.chave !== cp.chave; })[0];
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
    if (item.tipo === "ocupacao") C().registrarOcupacaoHomebrew(def); else C().registrarDescritorHomebrew(def);
    return true;
  }

  global.RAMAGoblinsHomebrew = { previaOcupacao: previaOcupacao, previaDescritor: previaDescritor, textoMods: textoMods, deRegistro: deRegistro, carregarBiblioteca: carregarBiblioteca,
    copiasDaFicha: copiasDaFicha, versoesNovas: versoesNovas, atualizarVersao: atualizarVersao };
})(typeof window !== "undefined" ? window : globalThis);
