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

  /* v9.32: modelos de mesa (Ameaça, Apavoro, Assassino) e a Vantagem
     (tipo Habilidade), no formato das Vantagens da mesa. */
  var ROT_RECARGA = function (k) { return ((K().RECARGAS[k] || {}).nome || k); };
  function nomeAcao(k) { return (K().ACOES_ASSASSINO[k] || { nome: k }).nome; }
  function previaAmeaca(d) {
    return [(d.adjetivos ? d.adjetivos + ". " : "") + (d.texto || ""), "Ações Únicas: " + (d.acoesUnicas.map(nomeAcao).join(", ") || "nenhuma") + ".", d.intentoTexto ? "Intento Único: " + d.intentoTexto.replace(/\.$/, "") + " (+" + d.intentoPh + " PH; a Diretora marca)." : "Sem Intento Único."];
  }
  function previaApavoro(d) { return [d.nome + " · cena " + d.cena + " · recarga: " + ROT_RECARGA(d.recarga) + " · " + d.custo + " PH.", d.texto || "(sem texto)"]; }
  function previaAssassino(d) {
    return [(d.ameacas.map(function (k) { return (K().AMEACAS[k] || { nome: k }).nome; }).join(" · ") || "sem Ameaças") + ".", "Dados " + d.dados + " · PH " + d.ph + " · Testes de Susto por Encontro " + d.sustos + ".",
      "Ações Únicas: " + (d.acoesUnicas.map(nomeAcao).join(", ") || "nenhuma") + ". Apavoro: " + (d.apavoro ? (K().APAVOROS[d.apavoro] || { nome: d.apavoro }).nome : "nenhum") + ".", d.resumo || ""].filter(Boolean);
  }
  function vantagemDoRegistro(reg, m) {
    var v = obj(m.def);
    var efeito = K().EFEITOS_DE_VANTAGEM[v.efeito] ? v.efeito : "manual";
    var antigo = [v.janela ? "Janela: " + v.janela + "." : "", v.tensao && !v.efeito ? "Tensão: " + v.tensao + "." : ""].filter(Boolean).join(" ");
    var custo = v.custo !== undefined ? Number(v.custo) : parseInt(v.tensao, 10);
    return { nome: String(reg.nome || "Vantagem").slice(0, 60), estilo: K().ESTILOS[v.estilo] ? v.estilo : null, custo: Math.max(0, Math.min(10, isFinite(custo) ? Math.round(custo) : 0)),
      recarga: K().RECARGAS[v.recarga] && v.recarga !== "planejarFuga" ? v.recarga : "semRestricao", efeito: efeito, valor: Math.max(1, Math.min(6, Math.round(Number(v.valor) || 1))),
      texto: [String(reg.descricao || "").slice(0, 300), antigo].filter(Boolean).join(" ").slice(0, 400), homebrewId: reg.id || "" };
  }
  function previaVantagem(d) { return [(d.estilo ? nomeEstilo(d.estilo) : "Geral") + " · " + d.custo + " PT · recarga: " + ROT_RECARGA(d.recarga) + " · " + K().EFEITOS_DE_VANTAGEM[d.efeito].nome + (d.efeito === "reduzirFerida" ? " (" + d.valor + ")" : "") + ".", d.texto || "(sem texto)"]; }

  function deRegistro(reg) {
    var m = obj(obj(reg).modelo);
    if (m.sistema === "brutal" && m.grupo === "habilidade" && m.subtipo === "vantagem" && K()) return { tipo: "vantagem", def: vantagemDoRegistro(reg, m) };
    if (m.sistema === "brutal" && m.grupo === "estrutural" && K() && K().normalizarAmeacaHomebrew) {
      var bm = Object.assign({}, obj(m.def), { chave: "", nome: reg.nome, homebrewId: reg.id });
      if (m.subtipo === "ameaca") return { tipo: "ameaca", def: K().normalizarAmeacaHomebrew(Object.assign(bm, { texto: obj(m.def).texto || reg.descricao || "" })) };
      if (m.subtipo === "apavoro") return { tipo: "apavoro", def: K().normalizarApavoroHomebrew(Object.assign(bm, { texto: obj(m.def).texto || reg.descricao || "" })) };
      if (m.subtipo === "assassino") return { tipo: "assassino", def: K().normalizarAssassinoHomebrew(Object.assign(bm, { resumo: obj(m.def).resumo || reg.descricao || "" })) };
    }
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
    var API = global.RAMAApi, VAZIA = { arquetipos: [], estilos: [], ameacas: [], apavoros: [], assassinos: [], vantagens: [] };
    if (!API || !API.listarHomebrew || !K()) return Promise.resolve(VAZIA);
    carga = API.listarHomebrew({ escopo: "todos", tipos: ["arquetipo", "estilo", "ameaca", "apavoro", "assassino", "habilidade"] }).then(function (r) {
      carga = null;
      var saida = { arquetipos: [], estilos: [], ameacas: [], apavoros: [], assassinos: [], vantagens: [] };
      var regs = (r && r.ok && r.dados) || [];
      /* Ameaças e Apavoros antes dos Assassinos (que apontam para eles). */
      var xs = regs.map(deRegistro).filter(function (x) { return x && x.def; });
      xs.filter(function (x) { return x.tipo === "ameaca"; }).forEach(function (x) { K().registrarAmeacaHomebrew(x.def); saida.ameacas.push(x.def); });
      xs.filter(function (x) { return x.tipo === "apavoro"; }).forEach(function (x) { K().registrarApavoroHomebrew(x.def); saida.apavoros.push(x.def); });
      xs.filter(function (x) { return x.tipo === "assassino"; }).forEach(function (x) { K().registrarAssassinoHomebrew(x.def); saida.assassinos.push(x.def); });
      xs.filter(function (x) { return x.tipo === "vantagem"; }).forEach(function (x) { saida.vantagens.push(x.def); });
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

  global.RAMABrutalHomebrew = { previaAmeaca: previaAmeaca, previaApavoro: previaApavoro, previaAssassino: previaAssassino, previaVantagem: previaVantagem,
    vantagensDaBiblioteca: function () { return biblioteca && biblioteca.vantagens ? biblioteca.vantagens : []; },
    previaArquetipo: previaArquetipo, previaEstilo: previaEstilo, deRegistro: deRegistro, carregarBiblioteca: carregarBiblioteca,
    copiasDaFicha: copiasDaFicha, versoesNovas: versoesNovas, atualizarVersao: atualizarVersao };
})(typeof window !== "undefined" ? window : globalThis);
