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

  /* v9.30: Magia e Técnica Homebrew (tipo Habilidade). */
  var ROT_EFEITO = { proprio1: "1 ferimento em quem conjurou", inimigo1: "1 ferimento num inimigo", inimigo2: "2 ferimentos num inimigo", inimigo3: "3 ferimentos num inimigo", aliado1: "remove 1 ferimento de um aliado", aliadoTodos: "remove todos os ferimentos de um aliado" };
  function previaMagia(d) {
    return d.resultados.map(function (r, i) { return (i === 3 ? "3+ hits" : i + (i === 1 ? " hit" : " hits")) + ": " + (r.texto || "(sem texto)") + (r.efeito ? " [a ficha aplica: " + ROT_EFEITO[r.efeito] + "]" : ""); });
  }
  function previaTecnica(d) { return [(d.uso === "dia" ? "1 vez por dia (a ficha marca o uso). " : "") + (d.texto || "(sem texto)")]; }
  /* v9.33: PokéPraga e Receita (opções das variantes). */
  var ING = { cenoura: "Cenoura", batata: "Batata", alface: "Alface", brocolis: "Brócolis", morango: "Morango", banana: "Banana", arroz: "Arroz", trigo: "Trigo", milho: "Milho", tomate: "Tomate", ovo: "Ovo", leite: "Leite", fruta: "Fruta" };
  function previaPraga(d) { return [d.nome + " · " + C().POKE.raridades[d.raridade].nome + " (captura " + C().POKE.raridades[d.raridade].captura + " hit" + (C().POKE.raridades[d.raridade].captura > 1 ? "s" : "") + ") · Com " + d.combate + " · Hab " + d.habilidade + " · Noç " + d.nocao + " · Vit " + d.vitalidade + " · " + (d.elemento ? "elemento " + C().POKE.elementos[d.elemento].nome : "elemento rolado") + "."]; }
  function previaReceita(d) { return [d.nome + " · " + d.hits + " hit(s) no teste de Noção · " + (Object.keys(d.ingredientes).map(function (k) { return d.ingredientes[k] + " " + k; }).join(", ") || "sem ingredientes") + (d.peixe ? " · peixe de " + d.peixe.gramas + " g" : "") + "."]; }
  function deRegistro(reg) {
    var m = obj(obj(reg).modelo);
    if (m.sistema === "goblins" && m.grupo === "estrutural" && C() && C().normalizarPragaHomebrew && (m.subtipo === "pokepraga" || m.subtipo === "receita")) {
      var v = obj(m.def);
      if (m.subtipo === "pokepraga") return { tipo: "pokepraga", def: C().normalizarPragaHomebrew(Object.assign({}, v, { chave: "", nome: reg.nome, homebrewId: reg.id })) };
      var ing = {}; Object.keys(ING).forEach(function (k) { if (v["i_" + k]) ing[ING[k]] = v["i_" + k]; });
      var dr = C().normalizarReceitaHomebrew({ chave: "", nome: reg.nome, homebrewId: reg.id, hits: v.hits, ingredientes: ing, peixe: v.peixe ? { gramas: Number(v.peixe) } : null });
      return dr ? { tipo: "receita", def: dr } : null;
    }
    if (m.sistema === "goblins" && m.grupo === "habilidade" && C() && C().normalizarMagiaHomebrew) {
      var v = obj(m.def);
      if (m.subtipo === "magia") {
        var dm = C().normalizarMagiaHomebrew({ chave: "", nome: reg.nome, homebrewId: reg.id, resultados: [0, 1, 2, 3].map(function (i) { return { texto: v["r" + i], efeito: v["e" + i] }; }) });
        return dm ? { tipo: "magia", def: dm } : null;
      }
      if (m.subtipo === "tecnica") return { tipo: "tecnica", def: C().normalizarTecnicaHomebrew({ chave: "", nome: reg.nome, homebrewId: reg.id, texto: reg.descricao || "", uso: v.uso }) };
      return null;
    }
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
    var API = global.RAMAApi, VAZIA = { ocupacoes: [], descritores: [], magias: [], tecnicas: [], pragas: [], receitas: [] };
    if (!API || !API.listarHomebrew || !C()) return Promise.resolve(VAZIA);
    carga = API.listarHomebrew({ escopo: "todos", tipos: ["ocupacao", "descritor", "habilidade", "pokepraga", "receita"] }).then(function (r) {
      carga = null;
      var saida = { ocupacoes: [], descritores: [], magias: [], tecnicas: [], pragas: [], receitas: [] };
      ((r && r.ok && r.dados) || []).forEach(function (reg) {
        var x = deRegistro(reg);
        if (!x || !x.def) return;
        registrar(x.tipo, x.def);
        saida[CAMPO[x.tipo]].push(x.def);
      });
      biblioteca = saida;
      return saida;
    }, function () { carga = null; return VAZIA; });
    return carga;
  }

  /* As cópias da ficha e as versões novas (o painel de js/homebrew-versoes.js). */
  var CAMPOS = [["ocupacoes", "ocupacoes", "ocupacao"], ["descritores", "descritores", "descritor"], ["magias", "magias", "magia"], ["tecnicas", "tecnicas", "tecnica"], ["pragas", "pragas", "pokepraga"], ["receitas", "receitas", "receita"]];
  var CAMPO = { ocupacao: "ocupacoes", descritor: "descritores", magia: "magias", tecnica: "tecnicas", pokepraga: "pragas", receita: "receitas" };
  function registrar(tipo, def) {
    if (tipo === "ocupacao") C().registrarOcupacaoHomebrew(def);
    else if (tipo === "descritor") C().registrarDescritorHomebrew(def);
    else if (tipo === "magia") C().registrarMagiaHomebrew(def);
    else if (tipo === "tecnica") C().registrarTecnicaHomebrew(def);
    else if (tipo === "pokepraga") C().registrarPragaHomebrew(def);
    else if (tipo === "receita") C().registrarReceitaHomebrew(def);
  }
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
    registrar(item.tipo, def);
    return true;
  }

  global.RAMAGoblinsHomebrew = { previaPraga: previaPraga, previaReceita: previaReceita, previaMagia: previaMagia, previaTecnica: previaTecnica, previaOcupacao: previaOcupacao, previaDescritor: previaDescritor, textoMods: textoMods, deRegistro: deRegistro, carregarBiblioteca: carregarBiblioteca,
    copiasDaFicha: copiasDaFicha, versoesNovas: versoesNovas, atualizarVersao: atualizarVersao };
})(typeof window !== "undefined" ? window : globalThis);
