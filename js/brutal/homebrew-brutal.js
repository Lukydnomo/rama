/* =====================================================================
   R.A.M.A. — BRUTAL · Homebrew na ficha (v9.18)
   ---------------------------------------------------------------------
   O lado da página do ARQUÉTIPO e do ESTILO Homebrew. Definição, chave e
   registro moram no catálogo (js/brutal/catalogo.js); a cópia na ficha,
   em regras.js; a cópia na mesa, em mesa.js (o servidor roda os três).
   Aqui: carregarBiblioteca, deRegistro, prévias e versões.
   ===================================================================== */

(function (global) {
  "use strict";

  function K() { return global.RAMABrutalCatalogo; }
  function R() { return global.RAMABrutal; }
  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  function nomeEstilo(k) { return (K().ESTILOS[k] || { nome: k }).nome; }

  function previaArquetipo(d) {
    return [
      (d.adjetivos ? d.adjetivos + " · " : "") + "Iniciativa " + d.iniciativa + "º.",
      "Estilos: " + (d.estilos.map(nomeEstilo).join(" e ") || "nenhum") + " (usar um Estilo seu reduz a Dificuldade em 1).",
      "Habilidade: " + d.habilidade.nome + " (" + d.habilidade.cena + "; recarga: " + ((K().RECARGAS[d.habilidade.recarga] || {}).nome || d.habilidade.recarga) + ")" + (d.habilidade.texto ? " — " + d.habilidade.texto.replace(/\.$/, "") : "") + ".",
    ];
  }
  function previaEstilo(d) { return [d.nome + (d.texto ? ": " + d.texto : "") + " Usar o Estilo reduz a Dificuldade em 1 (como os do livro)."]; }

  function deRegistro(reg) {
    var m = obj(obj(reg).modelo);
    if (m.sistema !== "brutal" || m.grupo !== "estrutural" || !K() || !K().normalizarArquetipoHomebrew) return null;
    var base = Object.assign({}, obj(m.def), { chave: "", nome: reg.nome, homebrewId: reg.id });
    if (m.subtipo === "arquetipo") return { tipo: "arquetipo", def: K().normalizarArquetipoHomebrew(Object.assign(base, { resumo: reg.descricao || obj(m.def).resumo || "" })) };
    if (m.subtipo === "estilo") return { tipo: "estilo", def: K().normalizarEstiloHomebrew(Object.assign(base, { texto: obj(m.def).texto || reg.descricao || "" })) };
    return null;
  }

  var biblioteca = null, carga = null;
  function carregarBiblioteca(forcar) {
    if (biblioteca && !forcar) return Promise.resolve(biblioteca);
    if (carga && !forcar) return carga;
    var API = global.RAMAApi, VAZIA = { arquetipos: [], estilos: [] };
    if (!API || !API.listarHomebrew || !K()) return Promise.resolve(VAZIA);
    carga = API.listarHomebrew({ escopo: "todos", tipos: ["arquetipo", "estilo"] }).then(function (r) {
      carga = null;
      var saida = { arquetipos: [], estilos: [] };
      var regs = (r && r.ok && r.dados) || [];
      /* Os Estilos primeiro: um Arquétipo pode usar um Estilo Homebrew. */
      regs.map(deRegistro).filter(function (x) { return x && x.tipo === "estilo"; }).forEach(function (x) { K().registrarEstiloHomebrew(x.def); saida.estilos.push(x.def); });
      regs.map(deRegistro).filter(function (x) { return x && x.tipo === "arquetipo"; }).forEach(function (x) { K().registrarArquetipoHomebrew(x.def); saida.arquetipos.push(x.def); });
      biblioteca = saida;
      return saida;
    }, function () { carga = null; return VAZIA; });
    return carga;
  }

  /* Versões: a cópia do Arquétipo (e dos Estilos dele) na ficha. */
  function copiasDaFicha(b) {
    var hb = obj(obj(b).homebrew), out = [];
    Object.keys(obj(hb.arquetipos)).forEach(function (k) { var d = hb.arquetipos[k]; out.push({ campo: "arquetipos", tipo: "arquetipo", chave: k, nome: d.nome || k, homebrewId: d.homebrewId || "" }); });
    return out;
  }
  function versoesNovas(b, bib) {
    return copiasDaFicha(b).map(function (cp) {
      var nova = (obj(bib).arquetipos || []).filter(function (d) { return cp.homebrewId && d.homebrewId === cp.homebrewId && d.chave !== cp.chave; })[0];
      return nova ? Object.assign({}, cp, { def: nova }) : null;
    }).filter(Boolean);
  }
  function atualizarVersao(b, item) {
    K().registrarArquetipoHomebrew(item.def);
    b.arquetipo = item.def.chave;
    var bloco = R().blocoDoArquetipo(item.def.chave);
    if (bloco) b.homebrew = bloco;
    return true;
  }

  global.RAMABrutalHomebrew = { previaArquetipo: previaArquetipo, previaEstilo: previaEstilo, deRegistro: deRegistro, carregarBiblioteca: carregarBiblioteca,
    copiasDaFicha: copiasDaFicha, versoesNovas: versoesNovas, atualizarVersao: atualizarVersao };
})(typeof window !== "undefined" ? window : globalThis);
