/* =====================================================================
   R.A.M.A. — aparência das rolagens (v2.40)
   =====================================================================
   A parte visual dos temas de dados, compartilhada por tudo que desenha
   uma rolagem: a notificação local, a recebida de outro jogador, o
   histórico da campanha e a prévia do editor. Nenhuma regra de dado
   mora aqui — só apresentação. Nada daqui rola, grava ou envia.

     capturar()              a aparência DESTE momento, para guardar com a
                             rolagem: o tema escolhido pelo personagem (id
                             e versão) e as cores efetivas da página (o
                             dado padrão)
     aplicar(el, ap)         pinta UM elemento (cartão ou linha) com essa
                             aparência — custom properties e fundo no
                             próprio elemento; a página não muda
     icone(ap, tamanho)      o dado: base, camadas e máscara (tema) ou o
                             desenho padrão, que segue as cores do cartão
     fonte(fn)               quem diz qual tema o personagem escolheu (a
                             página da ficha)

   ---------------------------------------------------------------------
   O FUNDO: ZOOM PELA ALTURA
   ---------------------------------------------------------------------
   Uma imagem inteira, escalada para a altura do elemento (topo com
   topo, base com base), na proporção dela: background-size: auto 100%.
   Sem repetir e sem cortar em cima ou embaixo. Mais larga que o cartão,
   o excedente lateral some; mais estreita, a superfície do tema aparece
   nas laterais. Quando a altura do cartão muda, o zoom acompanha — é o
   próprio CSS que recalcula.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el;
  function TD() { return global.RAMATemasDados || null; }

  /* As cores do cartão: a chave do contrato → os tokens do site que o
     cartão (e a linha do histórico) usam. Trocar estes tokens NO
     elemento pinta só ele. */
  var TOKENS = {
    superficie: ["--cor-superficie", "--cor-superficie-2", "--fundo-superficie", "--fundo-superficie-2"],
    texto: ["--cor-texto"],
    texto2: ["--cor-texto-2"],
    texto3: ["--cor-texto-3"],
    tracoForte: ["--cor-traco-forte"],
    tracoMedia: ["--cor-traco-media"],
    tracoFraca: ["--cor-traco-fraca"],
    selecao: ["--cor-selecao", "--fundo-selecao"],
    selecaoTexto: ["--cor-selecao-texto"],
    paranormal: ["--cor-paranormal"],
    erro: ["--cor-erro"],
    aviso: ["--cor-aviso"],
  };
  /* De onde cada cor do padrão é lida na página. */
  var ORIGEM_PADRAO = {
    superficie: "--cor-superficie-2", texto: "--cor-texto", texto2: "--cor-texto-2", texto3: "--cor-texto-3",
    tracoForte: "--cor-traco-forte", tracoMedia: "--cor-traco-media", tracoFraca: "--cor-traco-fraca",
    selecao: "--cor-selecao", selecaoTexto: "--cor-selecao-texto",
    paranormal: "--cor-paranormal", erro: "--cor-erro", aviso: "--cor-aviso",
  };

  var fonteDaEscolha = null;
  function fonte(fn) { fonteDaEscolha = typeof fn === "function" ? fn : null; }

  /* =================================================================
     CAPTURA
     ================================================================= */

  function paraHex(computada) {
    var s = String(computada || "").trim();
    var m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(s);
    var r, g, b;
    if (m) { r = +m[1]; g = +m[2]; b = +m[3]; }
    else {
      var c = /^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i.exec(s);
      if (!c) return "";
      r = +c[1] * 255; g = +c[2] * 255; b = +c[3] * 255;
    }
    function h(n) { var x = Math.max(0, Math.min(255, Math.round(n))).toString(16); return x.length < 2 ? "0" + x : x; }
    return "#" + h(r) + h(g) + h(b);
  }

  /* As cores efetivas onde `raiz` está: herança da conta, tema da ficha
     e modo do aparelho já resolvidos pelo navegador. Uma sonda invisível
     pede cada token como `color` e lê o resultado. */
  function coresDe(raiz) {
    var alvo = raiz || document.body || document.documentElement;
    var cores = {};
    if (!alvo || !global.getComputedStyle) return cores;
    var sonda = document.createElement("span");
    sonda.setAttribute("aria-hidden", "true");
    sonda.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none";
    alvo.appendChild(sonda);
    Object.keys(ORIGEM_PADRAO).forEach(function (k) {
      sonda.style.color = "";
      sonda.style.color = "var(" + ORIGEM_PADRAO[k] + ")";
      var hex = paraHex(global.getComputedStyle(sonda).color);
      if (hex) cores[k] = hex;
    });
    alvo.removeChild(sonda);
    return cores;
  }

  /* A aparência deste momento. O tema vai como id e versão do catálogo;
     o padrão, como as cores que o cartão usaria. */
  function capturar(opcoes) {
    var o = opcoes || {};
    var bruto = { v: 1, padrao: coresDe(o.raiz) };
    var escolha = o.temaDados !== undefined ? o.temaDados : (fonteDaEscolha ? fonteDaEscolha() : null);
    if (escolha && TD()) {
      var a = TD().atual(escolha);
      if (a) bruto.tema = a;
    }
    return TD() ? TD().normalizarAparenciaDaRolagem(bruto) : null;
  }

  /* =================================================================
     APLICAR NUM ELEMENTO
     ================================================================= */

  function rgba(hex, alfa) {
    var h = TD() ? TD().cor(hex) : "";
    if (!h) return "";
    return "rgba(" + parseInt(h.slice(1, 3), 16) + ", " + parseInt(h.slice(3, 5), 16) + ", " + parseInt(h.slice(5, 7), 16) + ", " + alfa + ")";
  }

  /* O caminho do catálogo → URL desta página. Só caminhos conferidos
     pelo catálogo chegam aqui; nada da rolagem vira endereço. */
  function url(caminho) { return U.url ? U.url(caminho) : "../" + caminho; }
  function cssUrl(caminho) { return 'url("' + encodeURI(url(caminho)).replace(/"/g, "%22") + '")'; }

  function pintarCores(elemento, cores) {
    Object.keys(TOKENS).forEach(function (k) {
      if (!cores[k]) return;
      TOKENS[k].forEach(function (token) { elemento.style.setProperty(token, cores[k]); });
    });
  }

  /* A versão do tema que a aparência pede, ou null (desconhecida aqui). */
  function versaoDoTema(ap) {
    if (!ap || !ap.tema || !TD()) return null;
    return TD().versao(ap.tema.id, ap.tema.versao);
  }

  /* Pinta `elemento` com a aparência. Sem aparência (rolagem antiga),
     nada muda: vale o tema da página, como sempre foi. */
  function aplicar(elemento, ap) {
    if (!elemento || !ap) return;
    var v = versaoDoTema(ap);
    elemento.classList.remove("com-tema-dados");
    if (v) {
      var n = v.notificacao;
      pintarCores(elemento, n.cores);
      elemento.classList.add("com-tema-dados");
      elemento.dataset.temaDados = ap.tema.id + "@" + ap.tema.versao;
      elemento.style.backgroundColor = n.cores.superficie;
      if (n.fundo) {
        var x = Math.round(n.ajusteFundo.alinhamentoHorizontal * 100) + "%";
        var camadas = [cssUrl(n.fundo)];
        var tamanhos = ["auto 100%"];
        var posicoes = [x + " 50%"];
        if (n.veu && n.veu.alfa > 0) {
          var veu = rgba(n.veu.cor, n.veu.alfa);
          camadas.unshift("linear-gradient(" + veu + ", " + veu + ")");
          tamanhos.unshift("100% 100%");
          posicoes.unshift("0 0");
        }
        elemento.style.backgroundImage = camadas.join(", ");
        elemento.style.backgroundSize = tamanhos.join(", ");
        elemento.style.backgroundPosition = posicoes.join(", ");
        elemento.style.backgroundRepeat = "no-repeat";
      }
      return;
    }
    /* Tema que este navegador não conhece (catálogo mais novo, versão
       retirada): a reserva é o padrão guardado junto. */
    if (ap.padrao) {
      pintarCores(elemento, ap.padrao);
      if (ap.padrao.superficie) elemento.style.backgroundColor = ap.padrao.superficie;
    }
  }

  /* =================================================================
     O ÍCONE DO DADO
     ================================================================= */

  var SVG = "http://www.w3.org/2000/svg";
  var HEXAGONO = "512,64 900,288 900,736 512,960 124,736 124,288";
  var FACETAS = ["512,64 512,224 270,650 124,736", "512,224 754,650 900,736", "270,650 754,650",
    "124,288 512,224 900,288", "270,650 512,960 754,650", "124,288 270,650", "900,288 754,650"];

  /* O dado padrão: a mesma silhueta da máscara, desenhado com as cores
     do cartão (que são as da ficha, ou as guardadas na rolagem). */
  function desenhoPadrao() {
    var svg = document.createElementNS(SVG, "svg");
    svg.setAttribute("viewBox", "0 0 1024 1024");
    svg.setAttribute("class", "dado-icone__padrao");
    svg.setAttribute("focusable", "false");
    var hex = document.createElementNS(SVG, "polygon");
    hex.setAttribute("points", HEXAGONO);
    hex.setAttribute("class", "dado-icone__face");
    svg.appendChild(hex);
    FACETAS.forEach(function (pts) {
      var l = document.createElementNS(SVG, "polyline");
      l.setAttribute("points", pts);
      l.setAttribute("class", "dado-icone__aresta");
      svg.appendChild(l);
    });
    return svg;
  }

  /* Cada imagem é baixada uma vez por página. Uma falha fica lembrada:
     a reserva entra e o cartão continua legível. */
  var imagens = {};
  function carregar(caminho) {
    if (imagens[caminho]) return imagens[caminho];
    imagens[caminho] = new Promise(function (resolver, recusar) {
      var img = new Image();
      img.onload = function () { resolver(true); };
      img.onerror = function () { recusar(new Error("asset " + caminho)); };
      img.src = url(caminho);
    });
    return imagens[caminho];
  }

  function camada(caminho, opacidade) {
    var img = el("img.dado-icone__camada", { src: url(caminho), alt: "", draggable: "false", decoding: "async" });
    if (opacidade !== undefined && opacidade < 1) img.style.opacity = String(opacidade);
    return img;
  }

  /* `tamanho`: "cartao" | "linha" | "previa". O espaço é reservado antes
     de qualquer imagem chegar: nada pula quando ela aparece. */
  function icone(ap, tamanho) {
    var caixa = el("span.dado-icone.dado-icone--" + (tamanho || "cartao"), { "aria-hidden": "true" });
    var reserva = desenhoPadrao();
    caixa.appendChild(reserva);
    var v = versaoDoTema(ap);
    if (!v) return caixa;

    caixa.classList.add("dado-icone--carregando");
    var d = v.dado;
    var todas = [d.base, d.mascara].concat(d.camadas.map(function (c) { return c.imagem; }));
    Promise.all(todas.map(carregar)).then(function () {
      var mascara = cssUrl(d.mascara);
      var grupo = el("span.dado-icone__recorte", {}, [camada(d.base)].concat(
        d.camadas.filter(function (c) { return c.recortar; }).map(function (c) { return camada(c.imagem, c.opacidade); })));
      ["maskImage", "webkitMaskImage"].forEach(function (p) { grupo.style[p] = mascara; });
      ["maskSize", "webkitMaskSize"].forEach(function (p) { grupo.style[p] = "100% 100%"; });
      ["maskRepeat", "webkitMaskRepeat"].forEach(function (p) { grupo.style[p] = "no-repeat"; });
      grupo.style.maskMode = "alpha";
      var livres = d.camadas.filter(function (c) { return !c.recortar; }).map(function (c) { return camada(c.imagem, c.opacidade); });
      var arte = el("span.dado-icone__arte", {}, [grupo].concat(livres));
      caixa.appendChild(arte);
      caixa.classList.remove("dado-icone--carregando");
      caixa.classList.add("dado-icone--tema");
      if (reserva.parentNode === caixa) caixa.removeChild(reserva);
    }, function () {
      caixa.classList.remove("dado-icone--carregando");
      caixa.classList.add("dado-icone--reserva");
    });
    return caixa;
  }

  /* O nome que a tela mostra para uma aparência. */
  function nome(ap) {
    var v = versaoDoTema(ap);
    if (!v) return "Padrão";
    var t = TD().tema(ap.tema.id);
    return t ? t.nome : "Padrão";
  }

  global.RAMAAparenciaRolagem = {
    fonte: fonte,
    capturar: capturar,
    coresDe: coresDe,
    aplicar: aplicar,
    icone: icone,
    nome: nome,
    paraHex: paraHex,
  };
})(window);
