/* =====================================================================
   R.A.M.A. — tema-modelo.js
   O modelo dos temas personalizáveis (v2.36): o que pode ser
   personalizado, as paletas de base, a validação e o ÚNICO resolvedor
   que transforma uma configuração em propriedades de CSS.

   Carregado no <head>, antes de tema.js e das folhas de estilo: a
   página pinta com o tema certo desde o primeiro quadro. Sem DOM, sem
   rede; testado em testes/executar-tema.js.

   O QUE ENTRA E O QUE NUNCA ENTRA
   - Um tema é DADO estruturado e versionado: cores em hexadecimal,
     transparência, tipo de preenchimento e os parâmetros do gradiente.
     Nada de CSS livre, HTML, url() ou folha de estilo. As propriedades
     são geradas aqui, a partir do que passou na validação, e aplicadas
     por style.setProperty (valor, nunca declaração).
   - Cada propriedade tem DUAS variáveis quando aceita gradiente: a cor
     sólida de referência (--cor-*, que vai para texto, borda, sombra e
     color-mix) e o preenchimento (--fundo-*, que só vai para
     `background`). Um gradiente nunca cai numa variável lida como cor:
     para ela vai a média das cores do gradiente.
   ===================================================================== */

(function (global) {
  "use strict";

  var VERSAO = 1;
  var MAX_PONTOS = 8;
  var MAX_TEMAS = 12;
  var MAX_NOME = 40;

  /* ---- O que pode ser personalizado ----
     cor:      a variável da cor sólida (sempre)
     fundo:    a variável de preenchimento (só quem aceita gradiente)
     alfa:     aceita transparência na cor sólida
     num:      [min, max, passo] — um número (opacidade das barras)
     avancado: fica nas opções avançadas da categoria */
  var CATEGORIAS = [
    { chave: "fundos", rotulo: "Fundo e superfícies", ajuda: "O fundo da página e as caixas em que o conteúdo mora." },
    { chave: "navegacao", rotulo: "Cabeçalho, abas e seleções", ajuda: "O topo do site e o que fica marcado: aba, filtro ou item escolhido." },
    { chave: "texto", rotulo: "Texto", ajuda: "Títulos, corpo, textos de apoio, links e dicas de campos vazios." },
    { chave: "botoes", rotulo: "Botões", ajuda: "O botão da ação principal e os botões comuns." },
    { chave: "campos", rotulo: "Campos, bordas e foco", ajuda: "Campos de texto, contornos, divisórias e o anel que mostra onde está o teclado." },
    { chave: "recursos", rotulo: "Barras de recursos", ajuda: "As barras de PV, PE, Sanidade e dos status da mesa. O nome de cada recurso continua escrito." },
    { chave: "estados", rotulo: "Mensagens e destaques", ajuda: "Sucesso, aviso, erro e o destaque paranormal." },
    { chave: "elementos", rotulo: "Elementos e graus", ajuda: "As marcas dos elementos do Outro Lado e dos graus de treinamento." },
    { chave: "efeitos", rotulo: "Sombras e efeitos", ajuda: "Sombras, o véu atrás das janelas e o efeito de tela antiga." },
  ];

  var TOKENS = [
    { chave: "fundo", rotulo: "Fundo da página", cat: "fundos", cor: "--cor-fundo", fundo: "--fundo-pagina" },
    { chave: "superficie", rotulo: "Cartões, painéis e janelas", cat: "fundos", cor: "--cor-superficie", fundo: "--fundo-superficie" },
    { chave: "superficie2", rotulo: "Áreas secundárias", cat: "fundos", cor: "--cor-superficie-2", fundo: "--fundo-superficie-2" },
    { chave: "superficie3", rotulo: "Realces de área", cat: "fundos", cor: "--cor-superficie-3", avancado: true },

    { chave: "cabecalho", rotulo: "Cabeçalho do site", cat: "navegacao", cor: "--cor-cabecalho", fundo: "--fundo-cabecalho" },
    { chave: "selecao", rotulo: "Item selecionado (abas, filtros, menus)", cat: "navegacao", cor: "--cor-selecao", fundo: "--fundo-selecao" },
    { chave: "selecaoTexto", rotulo: "Texto do item selecionado", cat: "navegacao", cor: "--cor-selecao-texto" },

    { chave: "texto", rotulo: "Títulos e texto forte", cat: "texto", cor: "--cor-texto" },
    { chave: "texto2", rotulo: "Texto do corpo", cat: "texto", cor: "--cor-texto-2" },
    { chave: "texto3", rotulo: "Texto de apoio", cat: "texto", cor: "--cor-texto-3" },
    { chave: "link", rotulo: "Links", cat: "texto", cor: "--cor-link" },
    { chave: "textoDica", rotulo: "Dica em campo vazio", cat: "texto", cor: "--cor-texto-dica", avancado: true },

    { chave: "botao", rotulo: "Botão principal", cat: "botoes", cor: "--cor-botao", fundo: "--fundo-botao" },
    { chave: "botaoTexto", rotulo: "Texto do botão principal", cat: "botoes", cor: "--cor-botao-texto" },
    { chave: "botaoHover", rotulo: "Botão principal sob o ponteiro", cat: "botoes", cor: "--cor-botao-hover", fundo: "--fundo-botao-hover", avancado: true },
    { chave: "botaoComum", rotulo: "Botão comum", cat: "botoes", cor: "--cor-botao-comum", fundo: "--fundo-botao-comum", avancado: true },

    { chave: "campo", rotulo: "Fundo dos campos", cat: "campos", cor: "--cor-campo" },
    { chave: "tracoMedia", rotulo: "Bordas", cat: "campos", cor: "--cor-traco-media" },
    { chave: "tracoFraca", rotulo: "Divisórias", cat: "campos", cor: "--cor-traco-fraca" },
    { chave: "tracoForte", rotulo: "Borda do que está ativo", cat: "campos", cor: "--cor-traco-forte" },
    { chave: "foco", rotulo: "Anel de foco do teclado", cat: "campos", cor: "--cor-foco" },

    { chave: "vida", rotulo: "Pontos de Vida", cat: "recursos", cor: "--cor-vida" },
    { chave: "esforco", rotulo: "Pontos de Esforço", cat: "recursos", cor: "--cor-esforco" },
    { chave: "sanidade", rotulo: "Sanidade", cat: "recursos", cor: "--cor-sanidade" },
    { chave: "azul", rotulo: "Status universal azul", cat: "recursos", cor: "--cor-azul", avancado: true },
    { chave: "verde", rotulo: "Status universal verde", cat: "recursos", cor: "--cor-verde", avancado: true },
    { chave: "cinza", rotulo: "Status universal cinza", cat: "recursos", cor: "--cor-cinza", avancado: true },
    { chave: "opacidadeBarra", rotulo: "Força do preenchimento das barras", cat: "recursos", num: [0.1, 1, 0.05], cssNum: "--opacidade-barra" },

    { chave: "ok", rotulo: "Sucesso", cat: "estados", cor: "--cor-ok" },
    { chave: "aviso", rotulo: "Aviso", cat: "estados", cor: "--cor-aviso" },
    { chave: "erro", rotulo: "Erro e perigo", cat: "estados", cor: "--cor-erro" },
    { chave: "paranormal", rotulo: "Destaque paranormal", cat: "estados", cor: "--cor-paranormal" },

    { chave: "grau", rotulo: "Graus de treinamento", cat: "elementos", cor: "--cor-grau" },
    { chave: "elementoSangue", rotulo: "Sangue", cat: "elementos", cor: "--cor-elemento-sangue" },
    { chave: "elementoMorte", rotulo: "Morte", cat: "elementos", cor: "--cor-elemento-morte" },
    { chave: "elementoConhecimento", rotulo: "Conhecimento", cat: "elementos", cor: "--cor-elemento-conhecimento" },
    { chave: "elementoEnergia", rotulo: "Energia", cat: "elementos", cor: "--cor-elemento-energia" },
    { chave: "elementoMedo", rotulo: "Medo", cat: "elementos", cor: "--cor-elemento-medo" },

    { chave: "sombra", rotulo: "Sombras", cat: "efeitos", cor: "--cor-sombra", alfa: true },
    { chave: "veuModal", rotulo: "Véu atrás das janelas", cat: "efeitos", cor: "--cor-veu-modal", alfa: true },
    { chave: "vinheta", rotulo: "Vinheta da tela antiga", cat: "efeitos", cor: "--cor-vinheta", alfa: true, avancado: true },
    { chave: "scanline", rotulo: "Linhas da tela antiga", cat: "efeitos", cor: "--cor-scanline", alfa: true, avancado: true },
    { chave: "veuRecorte", rotulo: "Fora do recorte (editor de imagem)", cat: "efeitos", cor: "--cor-veu-recorte", alfa: true, avancado: true },
    { chave: "contornoCor", rotulo: "Contorno de amostras de cor", cat: "efeitos", cor: "--cor-contorno-cor", alfa: true, avancado: true },
  ];
  var POR_CHAVE = {};
  TOKENS.forEach(function (t) {
    t.gradiente = !!t.fundo;
    /* Preenchimentos aceitam transparência; texto e bordas, não — uma
       letra meio transparente é uma letra que some. */
    if (t.gradiente) t.alfa = true;
    POR_CHAVE[t.chave] = t;
  });

  /* ---- As paletas de base: os mesmos valores de css/tokens.css ----
     (testes/executar-tema.js confere que não divergem). `ref` aponta para
     outra propriedade da mesma paleta: o padrão das propriedades novas é
     exatamente o que o CSS usava antes delas existirem. */
  function c(hex, a) { return { cor: hex.toLowerCase(), alfa: a === undefined ? 1 : a }; }
  function r(chave) { return { ref: chave }; }
  var REFS = {
    cabecalho: r("fundo"), selecao: r("texto"), selecaoTexto: r("fundo"), link: r("texto"),
    botao: r("texto"), botaoTexto: r("fundo"), botaoHover: r("texto2"), botaoComum: r("superficie"),
    campo: r("fundo"), foco: r("tracoForte"),
    elementoConhecimento: r("aviso"), elementoEnergia: r("paranormal"), elementoMedo: r("texto"),
  };
  function paleta(valores) { return Object.assign({}, REFS, valores); }
  var PALETAS = {
    claro: paleta({
      fundo: c("#F4F4F1"), superficie: c("#FFFFFF"), superficie2: c("#ECECE8"), superficie3: c("#E0E0DB"),
      texto: c("#111114"), texto2: c("#33333A"), texto3: c("#5C5C64"), textoDica: c("#7A7A82"),
      tracoForte: c("#111114"), tracoMedia: c("#6E6E76"), tracoFraca: c("#BCBCB5"),
      ok: c("#2E7A3C"), aviso: c("#8A6500"), erro: c("#B3362B"), paranormal: c("#5A469E"), grau: c("#4B3A9A"),
      vida: c("#A8362D"), esforco: c("#A85A10"), sanidade: c("#5A469E"), azul: c("#2F5F94"), verde: c("#3F7A3B"), cinza: c("#5E5E66"),
      opacidadeBarra: { num: 0.45 },
      elementoSangue: c("#A33838"), elementoMorte: c("#6E6E6E"),
      scanline: c("#000000", 0.03), vinheta: c("#000000", 0.1), veuModal: c("#18181C", 0.5),
      veuRecorte: c("#F4F4F1", 0.74), sombra: c("#141418", 0.25), contornoCor: c("#000000", 0.22),
    }),
    escuro: paleta({
      fundo: c("#08080A"), superficie: c("#101012"), superficie2: c("#18181B"), superficie3: c("#222225"),
      texto: c("#FFFFFF"), texto2: c("#DEDEDE"), texto3: c("#A0A0A0"), textoDica: c("#4A4A4A"),
      tracoForte: c("#FFFFFF"), tracoMedia: c("#AAAAAA"), tracoFraca: c("#4A4A4A"),
      ok: c("#6FB07A"), aviso: c("#C9A227"), erro: c("#C6564B"), paranormal: c("#7E6BB5"), grau: c("#9F91DD"),
      vida: c("#B8433A"), esforco: c("#C9772A"), sanidade: c("#7E6BB5"), azul: c("#3B6EA3"), verde: c("#4F8A4B"), cinza: c("#6B6B73"),
      opacidadeBarra: { num: 0.8 },
      elementoSangue: c("#B64A4A"), elementoMorte: c("#8C8C8C"),
      scanline: c("#FFFFFF", 0.022), vinheta: c("#000000", 0.45), veuModal: c("#08080A", 0.86),
      veuRecorte: c("#08080A", 0.68), sombra: c("#000000"), contornoCor: c("#FFFFFF", 0.16),
    }),
  };
  var NOMES_BASE = { claro: "Claro", escuro: "Escuro" };

  /* =================================================================
     VALIDAÇÃO
     ================================================================= */

  var HEX = /^#[0-9a-f]{6}$/;
  function corValida(v) {
    if (typeof v !== "string") return null;
    var s = v.trim().toLowerCase();
    if (/^#[0-9a-f]{3}$/.test(s)) s = "#" + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
    return HEX.test(s) ? s : null;
  }
  function numeroEntre(v, min, max) {
    var n = typeof v === "number" ? v : (typeof v === "string" && v.trim() !== "" ? Number(v) : NaN);
    if (!isFinite(n)) return null;
    return Math.min(max, Math.max(min, n));
  }
  function arred(n, casas) { var f = Math.pow(10, casas); return Math.round(n * f) / f; }

  function normalizarPonto(p) {
    if (!p || typeof p !== "object") return null;
    var cor = corValida(p.cor);
    var pos = numeroEntre(p.pos, 0, 100);
    if (!cor || pos === null) return null;
    var alfa = p.alfa === undefined ? 1 : numeroEntre(p.alfa, 0, 1);
    if (alfa === null) return null;
    return { cor: cor, alfa: arred(alfa, 2), pos: arred(pos, 1) };
  }

  /* Um valor de uma propriedade, conferido contra o que ela aceita.
     Devolve o valor limpo ou null (não entra). */
  function normalizarValor(token, v) {
    if (!token || !v || typeof v !== "object" || Array.isArray(v)) return null;
    if (token.num) {
      if (v.tipo !== "num") return null;
      var n = numeroEntre(v.valor, token.num[0], token.num[1]);
      return n === null ? null : { tipo: "num", valor: arred(n, 2) };
    }
    if (v.tipo === "cor") {
      var cor = corValida(v.cor);
      if (!cor) return null;
      var alfa = v.alfa === undefined ? 1 : numeroEntre(v.alfa, 0, 1);
      if (alfa === null) return null;
      return { tipo: "cor", cor: cor, alfa: token.alfa ? arred(alfa, 2) : 1 };
    }
    if ((v.tipo === "linear" || v.tipo === "radial") && token.gradiente) {
      if (!Array.isArray(v.pontos) || v.pontos.length < 2 || v.pontos.length > MAX_PONTOS) return null;
      var pontos = [];
      for (var i = 0; i < v.pontos.length; i++) {
        var p = normalizarPonto(v.pontos[i]);
        if (!p) return null;
        pontos.push(p);
      }
      pontos.sort(function (a, b) { return a.pos - b.pos; });
      if (v.tipo === "linear") {
        var ang = numeroEntre(v.angulo === undefined ? 180 : v.angulo, 0, 360);
        if (ang === null) return null;
        return { tipo: "linear", angulo: Math.round(ang), pontos: pontos };
      }
      var forma = v.forma === "circulo" ? "circulo" : (v.forma === undefined || v.forma === "elipse" ? "elipse" : null);
      var x = numeroEntre(v.x === undefined ? 50 : v.x, 0, 100);
      var y = numeroEntre(v.y === undefined ? 50 : v.y, 0, 100);
      if (!forma || x === null || y === null) return null;
      return { tipo: "radial", forma: forma, x: Math.round(x), y: Math.round(y), pontos: pontos };
    }
    return null;
  }

  function nomeValido(v, padrao) {
    var s = typeof v === "string" ? v.replace(/[\u0000-\u001F\u007F<>]/g, "").replace(/\s+/g, " ").trim().slice(0, MAX_NOME) : "";
    return s || padrao;
  }
  function idValido(v) { return typeof v === "string" && /^[a-z0-9-]{1,40}$/.test(v) ? v : null; }

  /* Um tema inteiro. `comId`: os temas da conta têm id; a cópia que vai
     para uma ficha não precisa. Devolve null quando não dá para salvar. */
  function normalizarTema(bruto, comId) {
    if (!bruto || typeof bruto !== "object" || Array.isArray(bruto)) return null;
    var base = bruto.base === "escuro" ? "escuro" : (bruto.base === undefined || bruto.base === "claro" ? "claro" : null);
    if (!base) return null;
    var tema = { v: VERSAO, nome: nomeValido(bruto.nome, "Tema personalizado"), base: base, valores: {} };
    if (comId) {
      var id = idValido(bruto.id);
      if (!id) return null;
      tema.id = id;
    }
    var valores = bruto.valores && typeof bruto.valores === "object" && !Array.isArray(bruto.valores) ? bruto.valores : {};
    Object.keys(valores).forEach(function (k) {
      if (!Object.prototype.hasOwnProperty.call(POR_CHAVE, k)) return;
      var limpo = normalizarValor(POR_CHAVE[k], valores[k]);
      if (limpo) tema.valores[k] = limpo;
    });
    return tema;
  }

  /* A lista de temas da conta: ids únicos, no máximo MAX_TEMAS. */
  function normalizarTemas(lista) {
    var vistos = {};
    var saida = [];
    (Array.isArray(lista) ? lista : []).forEach(function (t) {
      if (saida.length >= MAX_TEMAS) return;
      var limpo = normalizarTema(t, true);
      if (!limpo || vistos[limpo.id]) return;
      vistos[limpo.id] = true;
      saida.push(limpo);
    });
    return saida;
  }

  var MODOS_FICHA = ["conta", "sistema", "claro", "escuro", "personalizado"];

  /* O bloco de apresentação de uma ficha (compartilhado por Ordem e
     Universal). Sem bloco, ou bloco inválido: herda o tema da conta. */
  function normalizarAparencia(bruto) {
    var a = bruto && typeof bruto === "object" && !Array.isArray(bruto) ? bruto : {};
    var modo = MODOS_FICHA.indexOf(a.modo) >= 0 ? a.modo : "conta";
    var saida = { v: VERSAO, modo: modo };
    if (modo === "personalizado") {
      var tema = normalizarTema(a.tema, false);
      if (!tema) return { v: VERSAO, modo: "conta" };
      saida.tema = tema;
    }
    return saida;
  }

  /* =================================================================
     O RESOLVEDOR
     ================================================================= */

  function hexParaRgb(hex) {
    var h = corValida(hex) || "#000000";
    return { r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16) };
  }
  function rgbParaHex(rgb) {
    function p(n) { var s = Math.max(0, Math.min(255, Math.round(n))).toString(16); return s.length < 2 ? "0" + s : s; }
    return "#" + p(rgb.r) + p(rgb.g) + p(rgb.b);
  }
  function cssCor(cor, alfa) {
    if (alfa === undefined || alfa >= 1) return cor;
    var rgb = hexParaRgb(cor);
    return "rgba(" + rgb.r + ", " + rgb.g + ", " + rgb.b + ", " + arred(alfa, 3) + ")";
  }

  /* A cor sólida que representa um gradiente: a média das cores,
     pesada pela faixa que cada ponto ocupa. É ela que vai para texto,
     borda e color-mix. */
  function mediaDoGradiente(pontos) {
    var soma = { r: 0, g: 0, b: 0, a: 0 }, peso = 0;
    pontos.forEach(function (p, i) {
      var antes = i === 0 ? p.pos : (p.pos - pontos[i - 1].pos) / 2;
      var depois = i === pontos.length - 1 ? 100 - p.pos : (pontos[i + 1].pos - p.pos) / 2;
      var w = Math.max(0.5, antes + depois);
      var rgb = hexParaRgb(p.cor);
      soma.r += rgb.r * w; soma.g += rgb.g * w; soma.b += rgb.b * w; soma.a += p.alfa * w;
      peso += w;
    });
    return { cor: rgbParaHex({ r: soma.r / peso, g: soma.g / peso, b: soma.b / peso }), alfa: arred(soma.a / peso, 2) };
  }

  function cssGradiente(v) {
    var paradas = v.pontos.map(function (p) { return cssCor(p.cor, p.alfa) + " " + p.pos + "%"; }).join(", ");
    if (v.tipo === "linear") return "linear-gradient(" + v.angulo + "deg, " + paradas + ")";
    return "radial-gradient(" + (v.forma === "circulo" ? "circle" : "ellipse") + " at " + v.x + "% " + v.y + "%, " + paradas + ")";
  }

  /* O valor final de cada propriedade num tema: { solida: {cor, alfa},
     valor: o que o editor mostra, preenchimento: CSS de background }. */
  function valoresResolvidos(tema) {
    var base = PALETAS[tema && tema.base === "escuro" ? "escuro" : "claro"];
    var proprios = (tema && tema.valores) || {};
    var saida = {};
    function resolver(chave, pilha) {
      if (saida[chave]) return saida[chave];
      var token = POR_CHAVE[chave];
      var v = proprios[chave];
      var r;
      if (token.num) {
        var n = v && v.tipo === "num" ? v.valor : base[chave].num;
        r = { num: n, valor: { tipo: "num", valor: n }, herdado: !v };
      } else if (v && v.tipo === "cor") {
        r = { solida: { cor: v.cor, alfa: v.alfa }, valor: v, preenchimento: cssCor(v.cor, v.alfa), herdado: false };
      } else if (v && (v.tipo === "linear" || v.tipo === "radial")) {
        r = { solida: mediaDoGradiente(v.pontos), valor: v, preenchimento: cssGradiente(v), herdado: false };
      } else {
        var padrao = base[chave];
        if (padrao.ref && (pilha || []).indexOf(padrao.ref) < 0) {
          /* Quem segue outra propriedade herda a COR dela: um gradiente
             vira a sua média (o cabeçalho não repete o gradiente da
             página espremido numa faixa, o texto não herda gradiente), e
             quem não aceita transparência fica opaco. */
          var alvo = resolver(padrao.ref, (pilha || []).concat([chave]));
          var sol = { cor: alvo.solida.cor, alfa: token.alfa ? alvo.solida.alfa : 1 };
          r = { solida: sol, valor: { tipo: "cor", cor: sol.cor, alfa: sol.alfa }, preenchimento: cssCor(sol.cor, sol.alfa), herdado: true, ref: padrao.ref };
        } else {
          var cor = padrao.cor || "#000000", alfa = padrao.alfa === undefined ? 1 : padrao.alfa;
          r = { solida: { cor: cor, alfa: alfa }, valor: { tipo: "cor", cor: cor, alfa: alfa }, preenchimento: cssCor(cor, alfa), herdado: true };
        }
      }
      saida[chave] = r;
      return r;
    }
    TOKENS.forEach(function (t) { resolver(t.chave, []); });
    return saida;
  }

  function luminancia(hex) {
    var rgb = hexParaRgb(hex);
    function canal(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
    return 0.2126 * canal(rgb.r) + 0.7152 * canal(rgb.g) + 0.0722 * canal(rgb.b);
  }

  /* Configuração → propriedades de CSS. Toda a lista, sempre: aplicada
     num contexto fechado (o painel da ficha, a prévia do editor), ela não
     depende de nenhuma variável herdada de fora. */
  function resolver(tema) {
    var t = normalizarTema(tema, false) || { v: VERSAO, base: "claro", valores: {}, nome: "" };
    var res = valoresResolvidos(t);
    var vars = {};
    TOKENS.forEach(function (tok) {
      var r = res[tok.chave];
      if (tok.num) { vars[tok.cssNum] = String(r.num); return; }
      vars[tok.cor] = cssCor(r.solida.cor, r.solida.alfa);
      if (tok.fundo) vars[tok.fundo] = r.preenchimento;
    });
    var fundo = res.fundo.solida.cor;
    var escuro = luminancia(fundo) < 0.2;
    return { vars: vars, base: t.base, esquema: escuro ? "dark" : "light", barra: fundo, efetivo: escuro ? "escuro" : "claro" };
  }

  /* =================================================================
     CONTRASTE
     ================================================================= */

  function compor(frente, alfa, fundo) {
    var f = hexParaRgb(frente), b = hexParaRgb(fundo);
    return rgbParaHex({ r: f.r * alfa + b.r * (1 - alfa), g: f.g * alfa + b.g * (1 - alfa), b: f.b * alfa + b.b * (1 - alfa) });
  }
  function contraste(a, b) {
    var la = luminancia(a), lb = luminancia(b);
    return arred((Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05), 2);
  }

  /* As cores que um preenchimento mostra, já compostas sobre o que está
     embaixo: num gradiente, cada ponto é uma região a conferir — a média
     sozinha não diz se o texto se lê em todas. */
  function regioes(r, embaixo) {
    if (r.valor && (r.valor.tipo === "linear" || r.valor.tipo === "radial")) {
      return r.valor.pontos.map(function (p) { return { cor: compor(p.cor, p.alfa, embaixo), onde: p.pos + "%" }; });
    }
    return [{ cor: compor(r.solida.cor, r.solida.alfa, embaixo), onde: "" }];
  }

  var PARES = [
    { frente: "texto", fundo: "fundo", rotulo: "Títulos sobre o fundo da página", minimo: 4.5 },
    { frente: "texto2", fundo: "superficie", rotulo: "Texto do corpo nos cartões", minimo: 4.5 },
    { frente: "texto3", fundo: "superficie", rotulo: "Texto de apoio nos cartões", minimo: 3 },
    { frente: "texto2", fundo: "superficie2", rotulo: "Texto nas áreas secundárias", minimo: 4.5 },
    { frente: "texto", fundo: "cabecalho", rotulo: "Nome do site no cabeçalho", minimo: 4.5 },
    { frente: "selecaoTexto", fundo: "selecao", rotulo: "Texto do item selecionado", minimo: 4.5 },
    { frente: "botaoTexto", fundo: "botao", rotulo: "Texto do botão principal", minimo: 4.5 },
    { frente: "texto2", fundo: "botaoComum", rotulo: "Texto do botão comum", minimo: 4.5 },
    { frente: "link", fundo: "superficie", rotulo: "Links nos cartões", minimo: 4.5 },
    { frente: "texto", fundo: "campo", rotulo: "Texto digitado nos campos", minimo: 4.5 },
    /* A dica some quando se digita e todo campo tem rótulo próprio: o
       mínimo dela é o do tema escuro de sempre, não o de texto. */
    { frente: "textoDica", fundo: "campo", rotulo: "Dica em campo vazio", minimo: 2 },
    { frente: "erro", fundo: "superficie", rotulo: "Mensagens de erro", minimo: 3 },
    { frente: "aviso", fundo: "superficie", rotulo: "Avisos", minimo: 3 },
    { frente: "ok", fundo: "superficie", rotulo: "Confirmações", minimo: 3 },
    { frente: "foco", fundo: "fundo", rotulo: "Anel de foco sobre o fundo", minimo: 3 },
  ];
  /* O que fica embaixo de cada preenchimento (para compor transparência). */
  var EMBAIXO = { fundo: null, cabecalho: "fundo", superficie: "fundo", superficie2: "fundo", selecao: "superficie", botao: "superficie", botaoComum: "superficie", campo: "superficie" };

  /* Uma cor parecida que passa no mínimo: escurece ou clareia aos
     poucos, na direção que mais ajuda. Só SUGESTÃO — quem decide é a
     pessoa. */
  function sugerir(frente, fundos, minimo) {
    var rgb = hexParaRgb(frente);
    var alvos = [{ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }];
    var melhor = null;
    alvos.forEach(function (alvo) {
      for (var i = 1; i <= 20; i++) {
        var f = i / 20;
        var cand = rgbParaHex({ r: rgb.r + (alvo.r - rgb.r) * f, g: rgb.g + (alvo.g - rgb.g) * f, b: rgb.b + (alvo.b - rgb.b) * f });
        var pior = Math.min.apply(null, fundos.map(function (b) { return contraste(cand, b); }));
        if (pior >= minimo) { if (!melhor || f < melhor.f) melhor = { cor: cand, f: f }; break; }
      }
    });
    return melhor ? melhor.cor : null;
  }

  function avaliarContraste(tema) {
    var t = normalizarTema(tema, false) || { base: "claro", valores: {} };
    var res = valoresResolvidos(t);
    var branco = t.base === "escuro" ? "#000000" : "#ffffff";
    function solidaSobre(chave) {
      var r = res[chave];
      var baixo = EMBAIXO[chave] ? solidaSobre(EMBAIXO[chave]) : branco;
      return compor(r.solida.cor, r.solida.alfa, baixo);
    }
    return PARES.map(function (par) {
      var baixo = EMBAIXO[par.fundo] ? solidaSobre(EMBAIXO[par.fundo]) : branco;
      var regs = regioes(res[par.fundo], baixo);
      var frente = res[par.frente].solida.cor;
      var valores = regs.map(function (rg) { return { onde: rg.onde, razao: contraste(frente, rg.cor) }; });
      var pior = valores.reduce(function (m, v) { return v.razao < m.razao ? v : m; }, valores[0]);
      var ok = pior.razao >= par.minimo;
      return {
        frente: par.frente, fundo: par.fundo, rotulo: par.rotulo, minimo: par.minimo,
        razao: pior.razao, onde: pior.onde, regioes: valores.length, ok: ok,
        sugestao: ok ? null : sugerir(frente, regs.map(function (rg) { return rg.cor; }), par.minimo),
      };
    });
  }

  /* =================================================================
     UTILIDADES PARA O EDITOR
     ================================================================= */

  function novoId() {
    var s = "";
    for (var i = 0; i < 10; i++) s += "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)];
    return "t-" + s;
  }

  /* Um tema novo a partir de uma base (claro, escuro ou outro tema). */
  function novoTema(origem, nome) {
    var o = origem && typeof origem === "object" ? origem : { base: origem === "escuro" ? "escuro" : "claro", valores: {} };
    var copia = normalizarTema(JSON.parse(JSON.stringify({ base: o.base, valores: o.valores || {}, nome: nome || o.nome })), false);
    copia.nome = nomeValido(nome, o.nome ? o.nome + " (cópia)" : "Tema " + NOMES_BASE[copia.base].toLowerCase() + " personalizado");
    copia.id = novoId();
    return copia;
  }

  /* Interpreta o que a pessoa digitou numa caixa de cor: #rgb, #rrggbb
     ou rgb()/rgba() com números. Devolve { cor, alfa } ou null. */
  function lerCorDigitada(texto) {
    var s = String(texto || "").trim().toLowerCase();
    var hex = corValida(s);
    if (hex) return { cor: hex, alfa: 1 };
    var m = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(0|1|0?\.\d+|1\.0+))?\s*\)$/.exec(s);
    if (!m) return null;
    var nums = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (nums.some(function (n) { return n > 255; })) return null;
    return { cor: rgbParaHex({ r: nums[0], g: nums[1], b: nums[2] }), alfa: m[4] === undefined ? 1 : Number(m[4]) };
  }

  global.RAMATemaModelo = {
    VERSAO: VERSAO,
    MAX_PONTOS: MAX_PONTOS,
    MAX_TEMAS: MAX_TEMAS,
    MAX_NOME: MAX_NOME,
    CATEGORIAS: CATEGORIAS,
    TOKENS: TOKENS,
    PALETAS: PALETAS,
    NOMES_BASE: NOMES_BASE,
    MODOS_FICHA: MODOS_FICHA,
    token: function (chave) { return POR_CHAVE[chave] || null; },
    corValida: corValida,
    lerCorDigitada: lerCorDigitada,
    normalizarValor: normalizarValor,
    normalizarTema: normalizarTema,
    normalizarTemas: normalizarTemas,
    normalizarAparencia: normalizarAparencia,
    valoresResolvidos: valoresResolvidos,
    resolver: resolver,
    cssCor: cssCor,
    cssGradiente: cssGradiente,
    mediaDoGradiente: mediaDoGradiente,
    contraste: contraste,
    avaliarContraste: avaliarContraste,
    novoTema: novoTema,
    novoId: novoId,
  };
})(typeof window !== "undefined" ? window : globalThis);
