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

   GERAL × SISTEMA (v2.37)
   - O tema da CONTA é do site inteiro: só propriedades que existem em
     qualquer página e em qualquer sistema (fundo, texto, botões, campos,
     mensagens, destaque, efeitos). Nada de Ordem Paranormal nele.
   - O que é de um sistema (os elementos e os graus de Ordem) só existe
     no tema de uma FICHA daquele sistema, marcado com `sistema`. Fora
     dela, segue a paleta de base. As cores que só aparecem na mesa da
     campanha (barras de PV, PE, SAN e dos status universais) não são
     personalizáveis: seguem a base, como antes.
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
     avancado: fica nas opções avançadas da categoria
     sistema:  só no tema de uma ficha deste sistema ("ordem") */
  var CATEGORIAS = [
    { chave: "fundos", rotulo: "Fundo e superfícies", ajuda: "O fundo da página e as caixas em que o conteúdo mora." },
    { chave: "navegacao", rotulo: "Cabeçalho, abas e seleções", ajuda: "O topo do site e o que fica marcado: aba, filtro ou item escolhido." },
    { chave: "texto", rotulo: "Texto", ajuda: "Títulos, corpo, textos de apoio, links e dicas de campos vazios." },
    { chave: "botoes", rotulo: "Botões", ajuda: "O botão da ação principal e os botões comuns." },
    { chave: "campos", rotulo: "Campos, bordas e foco", ajuda: "Campos de texto, contornos, divisórias e o anel que mostra onde está o teclado." },
    { chave: "estados", rotulo: "Mensagens e destaque", ajuda: "Sucesso, aviso e erro, e a cor de destaque: item ativo, interruptor ligado, alvo de arraste." },
    { chave: "efeitos", rotulo: "Sombras e efeitos", ajuda: "Sombras, o véu atrás das janelas e o efeito de tela antiga." },
    { chave: "ordem", sistema: "ordem", rotulo: "Ordem Paranormal: elementos e graus", ajuda: "Só nesta ficha de Ordem: as marcas dos elementos do Outro Lado (rituais, itens) e a cor dos graus de treinamento das perícias." },
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

    { chave: "ok", rotulo: "Sucesso", cat: "estados", cor: "--cor-ok" },
    { chave: "aviso", rotulo: "Aviso", cat: "estados", cor: "--cor-aviso" },
    { chave: "erro", rotulo: "Erro e perigo", cat: "estados", cor: "--cor-erro" },
    /* A cor de ênfase do site inteiro (a variável guarda o nome antigo). */
    { chave: "paranormal", rotulo: "Destaque", cat: "estados", cor: "--cor-paranormal" },

    { chave: "sombra", rotulo: "Sombras", cat: "efeitos", cor: "--cor-sombra", alfa: true },
    { chave: "veuModal", rotulo: "Véu atrás das janelas", cat: "efeitos", cor: "--cor-veu-modal", alfa: true },
    { chave: "vinheta", rotulo: "Vinheta da tela antiga", cat: "efeitos", cor: "--cor-vinheta", alfa: true, avancado: true },
    { chave: "scanline", rotulo: "Linhas da tela antiga", cat: "efeitos", cor: "--cor-scanline", alfa: true, avancado: true },
    { chave: "veuRecorte", rotulo: "Fora do recorte (editor de imagem)", cat: "efeitos", cor: "--cor-veu-recorte", alfa: true, avancado: true },
    { chave: "contornoCor", rotulo: "Contorno de amostras de cor", cat: "efeitos", cor: "--cor-contorno-cor", alfa: true, avancado: true },

    { chave: "grau", rotulo: "Graus de treinamento", cat: "ordem", sistema: "ordem", cor: "--cor-grau" },
    { chave: "elementoSangue", rotulo: "Sangue", cat: "ordem", sistema: "ordem", cor: "--cor-elemento-sangue" },
    { chave: "elementoMorte", rotulo: "Morte", cat: "ordem", sistema: "ordem", cor: "--cor-elemento-morte" },
    { chave: "elementoConhecimento", rotulo: "Conhecimento", cat: "ordem", sistema: "ordem", cor: "--cor-elemento-conhecimento" },
    { chave: "elementoEnergia", rotulo: "Energia", cat: "ordem", sistema: "ordem", cor: "--cor-elemento-energia" },
    { chave: "elementoMedo", rotulo: "Medo", cat: "ordem", sistema: "ordem", cor: "--cor-elemento-medo" },
  ];
  var POR_CHAVE = {};
  TOKENS.forEach(function (t) {
    t.gradiente = !!t.fundo;
    /* Preenchimentos aceitam transparência; texto e bordas, não — uma
       letra meio transparente é uma letra que some. */
    if (t.gradiente) t.alfa = true;
    POR_CHAVE[t.chave] = t;
  });

  /* Que propriedades valem num contexto: "geral" (o tema da conta),
     "ordem" ou "universal" (o tema de uma ficha desse sistema). Sem
     contexto, todas — para resolver o que já foi conferido antes. */
  var TODOS = "*";
  function aceita(tok, sistema) {
    if (!tok.sistema || sistema === undefined || sistema === TODOS) return true;
    return tok.sistema === sistema;
  }
  function tokensDe(sistema) { return TOKENS.filter(function (t) { return aceita(t, sistema); }); }
  function categoriasDe(sistema) {
    return CATEGORIAS.filter(function (c) {
      return (!c.sistema || c.sistema === sistema) && TOKENS.some(function (t) { return t.cat === c.chave && aceita(t, sistema); });
    });
  }

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
      elementoSangue: c("#A33838"), elementoMorte: c("#6E6E6E"),
      scanline: c("#000000", 0.03), vinheta: c("#000000", 0.1), veuModal: c("#18181C", 0.5),
      veuRecorte: c("#F4F4F1", 0.74), sombra: c("#141418", 0.25), contornoCor: c("#000000", 0.22),
    }),
    escuro: paleta({
      fundo: c("#08080A"), superficie: c("#101012"), superficie2: c("#18181B"), superficie3: c("#222225"),
      texto: c("#FFFFFF"), texto2: c("#DEDEDE"), texto3: c("#A0A0A0"), textoDica: c("#4A4A4A"),
      tracoForte: c("#FFFFFF"), tracoMedia: c("#AAAAAA"), tracoFraca: c("#4A4A4A"),
      ok: c("#6FB07A"), aviso: c("#C9A227"), erro: c("#C6564B"), paranormal: c("#7E6BB5"), grau: c("#9F91DD"),
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
     para uma ficha não precisa. `sistema`: "geral" (conta), "ordem" ou
     "universal" (ficha) — propriedades de outro sistema ficam de fora.
     Devolve null quando não dá para salvar. */
  function normalizarTema(bruto, comId, sistema) {
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
      if (!Object.prototype.hasOwnProperty.call(POR_CHAVE, k) || !aceita(POR_CHAVE[k], sistema)) return;
      var limpo = normalizarValor(POR_CHAVE[k], valores[k]);
      if (limpo) tema.valores[k] = limpo;
    });
    return tema;
  }

  /* A lista de temas da conta: ids únicos, no máximo MAX_TEMAS, só com
     propriedades gerais. */
  function normalizarTemas(lista) {
    var vistos = {};
    var saida = [];
    (Array.isArray(lista) ? lista : []).forEach(function (t) {
      if (saida.length >= MAX_TEMAS) return;
      var limpo = normalizarTema(t, true, "geral");
      if (!limpo || vistos[limpo.id]) return;
      vistos[limpo.id] = true;
      saida.push(limpo);
    });
    return saida;
  }

  var MODOS_FICHA = ["conta", "sistema", "claro", "escuro", "personalizado"];

  /* O bloco de apresentação de uma ficha (compartilhado por Ordem e
     Universal). Sem bloco, ou bloco inválido: herda o tema da conta.
     `sistema` é o da ficha ("ordem" | "universal"). */
  /* `dados` (v2.40) é o tema de dados do personagem: { id }. É outra
     escolha, independente das cores — normalizar as cores nunca a apaga,
     e um id fora do catálogo deste navegador também não (a tela usa a
     reserva e diz isso). */
  var ID_DADOS = /^[a-z0-9][a-z0-9-]{0,39}$/;
  function normalizarAparencia(bruto, sistema) {
    var a = bruto && typeof bruto === "object" && !Array.isArray(bruto) ? bruto : {};
    var modo = MODOS_FICHA.indexOf(a.modo) >= 0 ? a.modo : "conta";
    var saida = { v: VERSAO, modo: modo };
    if (modo === "personalizado") {
      var tema = normalizarTema(a.tema, false, sistema);
      if (tema) saida.tema = tema;
      else saida.modo = "conta";
    }
    var d = a.dados && typeof a.dados === "object" && !Array.isArray(a.dados) ? a.dados : null;
    if (d && ID_DADOS.test(String(d.id || ""))) saida.dados = { id: String(d.id) };
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
      if (v && v.tipo === "cor") {
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
    var t = normalizarTema(tema, false, TODOS) || { v: VERSAO, base: "claro", valores: {}, nome: "" };
    var res = valoresResolvidos(t);
    var vars = {};
    TOKENS.forEach(function (tok) {
      var r = res[tok.chave];
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
    var t = normalizarTema(tema, false, TODOS) || { base: "claro", valores: {} };
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

  /* Um tema novo a partir de uma base (claro, escuro ou outro tema), para
     um contexto (`sistema`, como em normalizarTema). */
  function novoTema(origem, nome, sistema) {
    var o = origem && typeof origem === "object" ? origem : { base: origem === "escuro" ? "escuro" : "claro", valores: {} };
    var copia = normalizarTema(JSON.parse(JSON.stringify({ base: o.base, valores: o.valores || {}, nome: nome || o.nome })), false, sistema);
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

  /* =================================================================
     ARQUIVO DE TEMA (.json)
     -----------------------------------------------------------------
     Um tema viaja como pacote do R.A.M.A., no mesmo molde dos outros
     arquivos de exportação: { rama: true, tipo: "tema", versaoTema,
     geradoEm, sistema, dados: { nome, base, valores } }. Sem id: quem
     importa recebe um tema novo, da própria conta ou ficha. Na entrada,
     passa pela MESMA normalização de tudo o mais — nada do arquivo vira
     CSS, e o que não serve fica de fora com aviso.
     ================================================================= */

  var MAX_ARQUIVO = 200 * 1024;
  var NOMES_SISTEMA = { ordem: "Ordem Paranormal", universal: "ficha universal" };

  function exportarTema(tema, sistema) {
    var t = normalizarTema(tema, false, sistema) || { base: "claro", valores: {}, nome: "Tema" };
    return {
      rama: true,
      tipo: "tema",
      versaoTema: VERSAO,
      geradoEm: new Date().toISOString(),
      sistema: sistema === "ordem" || sistema === "universal" ? sistema : "geral",
      dados: { nome: t.nome, base: t.base, valores: t.valores },
    };
  }

  /* Texto ou objeto → { ok, tema, avisos } ou { ok: false, problemas }.
     `sistema` é para onde vai: "geral" (conta), "ordem", "universal". */
  function importarTema(entrada, sistema) {
    function ruim(texto) { return { ok: false, problemas: [texto] }; }
    var pacote = entrada;
    if (typeof entrada === "string") {
      if (entrada.length > MAX_ARQUIVO) return ruim("O arquivo passa de 200 KB: isso não parece um tema do R.A.M.A.");
      var bruto = entrada.trim();
      if (!bruto) return ruim("Nada para importar.");
      try { pacote = JSON.parse(bruto); } catch (e) { return ruim("O conteúdo não é um JSON válido. Confira se copiou o arquivo inteiro."); }
    }
    if (!pacote || typeof pacote !== "object" || Array.isArray(pacote)) return ruim("O arquivo não contém um objeto JSON.");
    if (pacote.rama !== true) return ruim("Este arquivo não foi gerado pelo R.A.M.A.");
    if (pacote.tipo !== "tema") return ruim("Este arquivo não é um tema (é do tipo “" + String(pacote.tipo || "(vazio)").slice(0, 40) + "”).");
    var versao = Number(pacote.versaoTema);
    if (!(versao >= 1)) return ruim("O arquivo não informa a versão do tema.");
    if (versao > VERSAO) return ruim("O tema foi gerado por uma versão mais nova do R.A.M.A. Atualize a página e tente de novo.");
    var dados = pacote.dados;
    if (!dados || typeof dados !== "object" || Array.isArray(dados)) return ruim("O arquivo não traz o tema.");
    var tema = normalizarTema(dados, false, sistema);
    if (!tema) return ruim("O tema não pôde ser lido: a base precisa ser “claro” ou “escuro”.");

    var avisos = [];
    var valores = dados.valores && typeof dados.valores === "object" && !Array.isArray(dados.valores) ? dados.valores : {};
    var deSistema = {}, invalidos = 0, desconhecidos = 0;
    Object.keys(valores).forEach(function (k) {
      var tok = Object.prototype.hasOwnProperty.call(POR_CHAVE, k) ? POR_CHAVE[k] : null;
      if (!tok) { desconhecidos++; return; }
      if (!aceita(tok, sistema)) { deSistema[tok.sistema] = (deSistema[tok.sistema] || 0) + 1; return; }
      if (!tema.valores[k]) invalidos++;
    });
    Object.keys(deSistema).forEach(function (s) {
      var n = deSistema[s];
      avisos.push(n + (n === 1 ? " cor é" : " cores são") + " de " + (NOMES_SISTEMA[s] || s) + " e só " + (n === 1 ? "vale" : "valem") +
        " no tema de uma ficha desse sistema: " + (n === 1 ? "ficou" : "ficaram") + " de fora.");
    });
    if (invalidos) avisos.push(invalidos + (invalidos === 1 ? " valor inválido ficou" : " valores inválidos ficaram") + " de fora e " + (invalidos === 1 ? "volta" : "voltam") + " à base.");
    if (desconhecidos) avisos.push(desconhecidos + (desconhecidos === 1 ? " propriedade desconhecida foi ignorada." : " propriedades desconhecidas foram ignoradas."));
    if (typeof dados.nome === "string" && dados.nome.trim() && nomeValido(dados.nome, "") !== dados.nome.trim()) avisos.push("O nome foi ajustado (até " + MAX_NOME + " caracteres, sem < >).");
    return { ok: true, tema: tema, avisos: avisos };
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
    tokensDe: tokensDe,
    categoriasDe: categoriasDe,
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
    exportarTema: exportarTema,
    importarTema: importarTema,
  };
})(typeof window !== "undefined" ? window : globalThis);
