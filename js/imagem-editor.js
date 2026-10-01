/* =====================================================================
   R.A.M.A. — imagem-editor.js
   O editor de recorte e enquadramento (v2.27), o mesmo para toda imagem
   que sobe: avatar, foto de personagem, criatura, aliado, capa da
   campanha e imagem de documento.

     RAMAEditorImagem.escolher(destino, opcoes) → Promise<resultado>

   Abre o seletor de arquivo, decodifica (js/imagem.js) e mostra o
   editor configurado pelo DESTINO — proporção, máscara, tamanho de
   saída e o que fazer com GIF. Nada é enviado nem substituído antes de
   "Usar imagem":
   - sem `aoUsar`, o resultado só volta para quem chamou (um rascunho de
     criação ou edição atualiza a prévia e grava junto com o resto);
   - com `aoUsar(resultado)`, o envio acontece com o editor aberto e o
     botão ocupado; falhou, o editor continua aberto com o enquadramento
     — dá para tentar de novo ou cancelar.

   resultado: { ok, imagem (data URL), largura, altura, bytes, gif,
   transparente, recorte } ou { ok: false, erro: "cancelado" | … }. Um
   erro de arquivo já foi mostrado aqui (`avisado: true`).

   O recorte sai da imagem ORIGINAL decodificada (com a orientação do
   celular aplicada): só depois de escolhido o retângulo é que ele é
   reduzido e codificado — a prévia é o mesmo retângulo do arquivo salvo.
   GIF animado não passa pelo canvas sem a pessoa pedir: o original vai
   inteiro, ou é convertido para imagem estática por escolha explícita,
   com a prévia do resultado.
   ===================================================================== */

(function (global) {
  "use strict";

  /* =================================================================
     DESTINOS — o único lugar que diz como cada imagem é usada
     ================================================================= */

  function ladoFoto() {
    return (global.RAMAImagem && global.RAMAImagem.lado && global.RAMAImagem.lado()) || 256;
  }

  var DESTINOS = {
    /* Redondo no cabeçalho e nas campanhas. O arquivo continua quadrado. */
    avatar: {
      titulo: "Avatar da conta", proporcao: 1, mascara: "circulo", lado: ladoFoto,
      explicacao: "O avatar aparece redondo no cabeçalho e nas campanhas. O arquivo salvo é quadrado: o círculo é só a prévia.",
    },
    /* Quadrada na ficha; redonda nas listas (a linha tracejada). */
    retrato: {
      titulo: "Foto do personagem", proporcao: 1, guia: "circulo", lado: ladoFoto,
      explicacao: "Na ficha a foto aparece quadrada; nas listas e na mesa, redonda — a linha tracejada mostra esse corte.",
    },
    criatura: {
      titulo: "Imagem da criatura", proporcao: 1, guia: "circulo", lado: ladoFoto,
      explicacao: "A imagem aparece quadrada nos cartões e redonda nas miniaturas — a linha tracejada mostra esse corte.",
    },
    aliado: {
      titulo: "Imagem do aliado", proporcao: 1, guia: "circulo", lado: ladoFoto,
      explicacao: "A imagem aparece quadrada no cartão do aliado e redonda nas miniaturas — a linha tracejada mostra esse corte.",
    },
    /* A faixa 3:1 da Visão geral, gravada com até 1500 × 500. */
    capa: {
      titulo: "Capa da campanha", proporcao: 3, largura: 1500, gifMaximo: 4096,
      explicacao: "A capa aparece numa faixa 3:1 no topo da Visão geral. A área clara é exatamente o que vai ser salvo.",
    },
    /* Precisa ser legível: vai inteira por padrão; recorte livre se a
       pessoa quiser. Nunca um quadrado forçado. */
    documento: {
      titulo: "Imagem do documento", livre: true, inteiraPorPadrao: true, lado: function () { return 1024; },
      explicacao: "Por padrão a imagem vai inteira, reduzida para caber em 1024 px. Em “Recortar”, escolha a área livremente.",
    },
  };

  function configuracao(destino, opcoes) {
    var base = DESTINOS[destino];
    if (!base) throw new Error("Destino de imagem desconhecido: " + destino);
    var c = Object.assign({}, base);
    c.destino = destino;
    c.lado = typeof base.lado === "function" ? base.lado() : (base.lado || 0);
    if (opcoes && opcoes.titulo) c.titulo = opcoes.titulo;
    /* O limite do destino em caracteres de data URL (padrão: o da célula,
       RAMAImagem.MAX_SAIDA). */
    if (opcoes && opcoes.limite) c.limite = opcoes.limite;
    return c;
  }

  /* =================================================================
     GEOMETRIA — pura, sem DOM (testes/executar-editor-imagem.js)
     -----------------------------------------------------------------
     O estado é um retângulo R = { x, y, w, h } em pixels da imagem
     original (W × H). Ele nunca sai da imagem: não há zoom ou
     deslocamento que deixe espaço vazio dentro do recorte, e a proporção
     fixa nunca é deformada.
     ================================================================= */

  var G = (function () {
    function limitar(v, a, b) { return Math.min(b, Math.max(a, v)); }

    /* O maior retângulo de proporção `a` (largura/altura) dentro de W × H. */
    function base(W, H, a) {
      if (W / H > a) return { w: H * a, h: H };
      return { w: W, h: W / a };
    }

    /* O menor lado de recorte aceito: 32 px, ou a imagem inteira se ela
       for menor que isso. */
    function minimo(W, H) { return Math.min(32, W, H); }

    function zoomMaximo(W, H, a) {
      var b = base(W, H, a);
      return Math.max(1, Math.min(8, Math.min(b.w, b.h) / minimo(W, H)));
    }

    /* Mantém o retângulo dentro da imagem (tamanho e posição). */
    function prender(R, W, H) {
      var w = limitar(R.w, Math.min(minimo(W, H), W), W);
      var h = limitar(R.h, Math.min(minimo(W, H), H), H);
      return { x: limitar(R.x, 0, W - w), y: limitar(R.y, 0, H - h), w: w, h: h };
    }

    function inicial(W, H, cfg) {
      if (cfg.livre) return { x: 0, y: 0, w: W, h: H };
      var b = base(W, H, cfg.proporcao);
      return { x: (W - b.w) / 2, y: (H - b.h) / 2, w: b.w, h: b.h };
    }

    /* Zoom com a proporção `a`: z = 1 é o maior recorte possível. O ponto
       `foco` (na imagem) fica no mesmo lugar relativo do recorte — o
       centro, se não vier. */
    function comZoom(R, W, H, a, z, foco) {
      var b = base(W, H, a);
      var zz = limitar(z, 1, zoomMaximo(W, H, a));
      var w = b.w / zz, h = b.h / zz;
      var f = foco || { x: R.x + R.w / 2, y: R.y + R.h / 2 };
      /* Foco fora do recorte (o ponteiro sobre a área apagada): o zoom
         vai na direção dele, a partir da borda mais próxima. */
      var rx = R.w ? limitar((f.x - R.x) / R.w, 0, 1) : 0.5;
      var ry = R.h ? limitar((f.y - R.y) / R.h, 0, 1) : 0.5;
      var x = limitar(f.x - rx * w, 0, W - w);
      var y = limitar(f.y - ry * h, 0, H - h);
      return { x: x, y: y, w: w, h: h };
    }

    function zoomDe(R, W, H, a) { return base(W, H, a).w / R.w; }

    function mover(R, dx, dy, W, H) {
      return { x: limitar(R.x + dx, 0, W - R.w), y: limitar(R.y + dy, 0, H - R.h), w: R.w, h: R.h };
    }

    /* Posição em % da folga (0 = encostado à esquerda / ao topo); null
       quando não há folga naquele eixo. */
    function posicao(R, W, H) {
      return {
        x: W - R.w > 0.5 ? (R.x / (W - R.w)) * 100 : null,
        y: H - R.h > 0.5 ? (R.y / (H - R.h)) * 100 : null,
      };
    }

    function comPosicao(R, W, H, px, py) {
      return {
        x: px === null || px === undefined ? R.x : limitar((W - R.w) * px / 100, 0, W - R.w),
        y: py === null || py === undefined ? R.y : limitar((H - R.h) * py / 100, 0, H - R.h),
        w: R.w, h: R.h,
      };
    }

    /* Recorte livre: largura e altura em % da imagem, mantendo o centro. */
    function comTamanho(R, W, H, pw, ph) {
      var cx = R.x + R.w / 2, cy = R.y + R.h / 2;
      var w = pw === null || pw === undefined ? R.w : W * pw / 100;
      var h = ph === null || ph === undefined ? R.h : H * ph / 100;
      w = limitar(w, Math.min(minimo(W, H), W), W);
      h = limitar(h, Math.min(minimo(W, H), H), H);
      return prender({ x: cx - w / 2, y: cy - h / 2, w: w, h: h }, W, H);
    }

    /* O tamanho salvo. Nunca amplia: ampliar só entrega borrão pesando
       mais. `largura` (capa) limita a largura; `lado`, o maior lado. */
    function saida(R, cfg) {
      var e = cfg.largura ? Math.min(1, cfg.largura / R.w) : Math.min(1, cfg.lado / Math.max(R.w, R.h));
      return { largura: Math.max(1, Math.round(R.w * e)), altura: Math.max(1, Math.round(R.h * e)) };
    }

    /* Onde o recorte e a imagem ficam no palco de SW × SH: o recorte
       ocupa o maior quadro da proporção dele dentro da margem, e a imagem
       é desenhada em volta, na mesma escala. */
    function vista(R, SW, SH, margem) {
      var aw = Math.max(1, SW - 2 * margem), ah = Math.max(1, SH - 2 * margem);
      var a = R.w / R.h;
      var fw, fh;
      if (aw / ah > a) { fh = ah; fw = ah * a; } else { fw = aw; fh = aw / a; }
      var s = fw / R.w;
      var qx = (SW - fw) / 2, qy = (SH - fh) / 2;
      return {
        quadro: { x: qx, y: qy, w: fw, h: fh },
        escala: s,
        imagem: { x: qx - R.x * s, y: qy - R.y * s },
      };
    }

    return {
      limitar: limitar, base: base, minimo: minimo, zoomMaximo: zoomMaximo, prender: prender,
      inicial: inicial, comZoom: comZoom, zoomDe: zoomDe, mover: mover, posicao: posicao,
      comPosicao: comPosicao, comTamanho: comTamanho, saida: saida, vista: vista,
    };
  })();

  /* =================================================================
     O FLUXO
     ================================================================= */

  var emAndamento = false;

  /* Escolher o arquivo e abrir o editor. Um fluxo por vez: o segundo
     clique no mesmo botão não abre outro seletor. */
  async function escolher(destino, opcoes) {
    if (emAndamento) return { ok: false, erro: "ocupado_local", ignorado: true };
    emAndamento = true;
    try {
      var escolha = await global.RAMAImagem.escolherArquivo();
      if (!escolha.ok) return { ok: false, erro: "cancelado" };
      return await abrir(escolha.arquivo, destino, opcoes);
    } finally {
      emAndamento = false;
    }
  }

  /* O mesmo, com um arquivo já em mãos (arrastado, colado, ou de teste). */
  async function abrirArquivo(arquivo, destino, opcoes) {
    if (emAndamento) return { ok: false, erro: "ocupado_local", ignorado: true };
    emAndamento = true;
    try { return await abrir(arquivo, destino, opcoes); }
    finally { emAndamento = false; }
  }

  async function abrir(arquivo, destino, opcoes) {
    var o = opcoes || {};
    var cfg = configuracao(destino, o);
    var UI = global.RAMAUI;

    var fecharAviso = UI.aviso("Abrindo imagem…", { duracao: 30000 });
    var aberta;
    try {
      aberta = await global.RAMAImagem.decodificar(arquivo, { gifGrande: "aceitar" });
    } finally {
      fecharAviso();
    }
    if (!aberta.ok) {
      UI.avisoErro(aberta.mensagem || "Não foi possível usar esta imagem.");
      return { ok: false, erro: aberta.erro, mensagem: aberta.mensagem, avisado: true };
    }
    if (aberta.gif) return fluxoGif(aberta, cfg, o);
    return editor(aberta, cfg, o, {});
  }

  function liberar(aberta) {
    if (aberta && aberta.origem && aberta.origem.close) {
      try { aberta.origem.close(); } catch (e) { /* já liberado */ }
    }
    if (aberta) aberta.origem = null;
  }

  /* Envia pelo `aoUsar` de quem chamou. Falhou: avisa e devolve false — o
     editor continua aberto. */
  async function entregar(resultado, o) {
    if (!o.aoUsar) return true;
    var resposta;
    try {
      resposta = await o.aoUsar(resultado);
    } catch (e) {
      console.error("[R.A.M.A. · editor de imagem] envio falhou", e);
      resposta = { ok: false, erro: "servidor_falhou" };
    }
    if (resposta && resposta.ok) return true;
    if (resposta && !resposta.avisado) global.RAMAUI.avisoDeFalha(resposta, o.contexto || "envio da imagem");
    return false;
  }

  /* =================================================================
     GIF ANIMADO
     ================================================================= */

  function fluxoGif(aberta, cfg, o) {
    var UI = global.RAMAUI;
    var el = global.RAMAUtil.el;
    var RI = global.RAMAImagem;

    return new Promise(function (resolver) {
      var concluido = false;
      var indoParaRecorte = false;
      var ocupado = false;

      var grandeDemais = cfg.gifMaximo && (aberta.largura > cfg.gifMaximo || aberta.altura > cfg.gifMaximo);
      var podeOriginal = aberta.gifCabe && !grandeDemais;

      var motivo = !aberta.gifCabe
        ? RI.MENSAGEM_GIF_GRANDE
        : grandeDemais
          ? "Para manter a animação, a imagem precisa ter até " + cfg.gifMaximo + " pixels de largura e altura."
          : "Para manter a animação, use o GIF original: o arquivo vai inteiro, sem recorte. A exibição mostra o centro.";

      var botoes = [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        {
          rotulo: "Recortar como imagem estática",
          classe: podeOriginal ? "" : "r-botao--principal",
          aoClicar: function (fechar) {
            indoParaRecorte = true;
            fechar();
            editor(aberta, cfg, o, { deGif: true }).then(resolver);
          },
        },
      ];
      if (podeOriginal) {
        botoes.push({
          rotulo: "Usar GIF original",
          classe: "r-botao--principal",
          rotuloOcupado: o.aoUsar ? "Enviando…" : "Aguarde…",
          aoClicar: async function (fechar) {
            if (ocupado) return;
            var resultado = {
              ok: true, imagem: aberta.imagem, largura: aberta.largura, altura: aberta.altura,
              bytes: aberta.imagem.length, gif: true, transparente: false, recorte: null,
            };
            ocupado = true;
            var foi = await entregar(resultado, o);
            ocupado = false;
            if (!foi) return;
            concluido = true;
            fechar();
            resolver(resultado);
          },
        });
      }

      UI.modal({
        titulo: cfg.titulo + " — GIF animado",
        largo: true,
        classe: "editor-imagem-janela",
        podeFechar: function () { return !ocupado; },
        conteudo: el("div.pilha", {}, [
          podeOriginal || aberta.gifCabe ? el("figure.editor-imagem__gif", {}, [
            el("div.editor-imagem__gif-moldura", {
              class: cfg.mascara === "circulo" ? "editor-imagem__gif-moldura--circulo" : "",
              estilo: { aspectRatio: cfg.livre ? "auto" : String(cfg.proporcao) },
            }, [el("img", { src: aberta.imagem, alt: "Prévia da animação original" })]),
            el("figcaption.t-mini", { texto: "Prévia do GIF original, como ele aparece no destino." }),
          ]) : null,
          el("p", { texto: motivo }),
          el("p.t-mini", {
            texto: "Recortar exige converter para imagem estática: fica só o primeiro quadro e a animação se perde. " +
              "A conversão só acontece se você escolher, e o resultado aparece antes de confirmar.",
          }),
        ]),
        botoes: botoes,
        aoFechar: function () {
          if (indoParaRecorte) return;
          liberar(aberta);
          if (!concluido) resolver({ ok: false, erro: "cancelado" });
        },
      });
    });
  }

  /* =================================================================
     O EDITOR
     ================================================================= */

  var MARGEM = 24;

  function editor(aberta, cfg, o, extra) {
    var UI = global.RAMAUI;
    var U = global.RAMAUtil;
    var el = U.el;
    var RI = global.RAMAImagem;

    var origem = aberta.origem;
    var W = aberta.largura, H = aberta.altura;
    var modo = cfg.livre && cfg.inteiraPorPadrao ? "inteira" : "recorte";
    var R = G.inicial(W, H, cfg);
    var ocupado = false;
    var quadro = 0;
    var observador = null;
    var aoRedimensionar = null;
    var ponteiros = {};
    var gesto = null;
    var idBase = "editor-imagem-" + U.uuid().slice(0, 8);

    function proporcao() { return cfg.livre ? R.w / R.h : cfg.proporcao; }

    /* ---------- elementos ---------- */

    var tela = el("canvas.editor-imagem__tela", {
      role: "img",
      tabindex: "0",
      "aria-label": "Enquadramento da imagem. Arraste para mover; setas movem, + e − mudam o zoom.",
      "aria-describedby": idBase + "-info",
    });
    var palco = el("div.editor-imagem__palco", {}, [tela]);

    var mini = el("canvas.editor-imagem__miniatura", {
      class: cfg.mascara === "circulo" ? "editor-imagem__miniatura--circulo" : "",
      role: "img",
      "aria-label": "Prévia do resultado salvo",
    });
    var info = el("p.t-mini.editor-imagem__info", { id: idBase + "-info", "aria-live": "polite" });

    function faixa(rotulo, chave, min, max, aoMudar) {
      var id = idBase + "-" + chave;
      var entrada = el("input.editor-imagem__faixa", {
        id: id, type: "range", min: String(min), max: String(max), step: "1",
        oninput: function (ev) { if (!ocupado) aoMudar(Number(ev.target.value)); },
      });
      var valor = el("span.editor-imagem__valor", { "aria-hidden": "true" });
      var campo = el("div.editor-imagem__controle", {}, [
        el("label", { for: id, texto: rotulo }), entrada, valor,
      ]);
      return { campo: campo, entrada: entrada, valor: valor };
    }

    function botaoZoom(rotulo, texto, fator) {
      return el("button.r-botao.r-botao--mini.editor-imagem__passo", {
        type: "button", "aria-label": rotulo, texto: texto,
        onclick: function () { if (!ocupado) aplicarZoom(zoomAtual() * fator); },
      });
    }

    var zoom = faixa("Zoom", "zoom", 100, 800, function (v) { aplicarZoom(v / 100); });
    var largura = faixa("Largura da área", "largura", 1, 100, function (v) { R = G.comTamanho(R, W, H, v, null); mudou(); });
    var altura = faixa("Altura da área", "altura", 1, 100, function (v) { R = G.comTamanho(R, W, H, null, v); mudou(); });
    var horizontal = faixa("Posição horizontal", "x", 0, 100, function (v) { R = G.comPosicao(R, W, H, v, null); mudou(); });
    var vertical = faixa("Posição vertical", "y", 0, 100, function (v) { R = G.comPosicao(R, W, H, null, v); mudou(); });

    var linhaZoom = el("div.editor-imagem__zoom", {}, [
      botaoZoom("Diminuir zoom", "−", 1 / 1.25), zoom.campo, botaoZoom("Aumentar zoom", "+", 1.25),
    ]);

    var redefinir = el("button.r-botao.r-botao--mini", {
      type: "button", texto: "Redefinir enquadramento",
      onclick: function () {
        if (ocupado) return;
        R = G.inicial(W, H, cfg);
        if (cfg.livre && cfg.inteiraPorPadrao) modo = "inteira";
        mudou(true);
      },
    });

    var botoesDeModo = cfg.livre ? ["inteira", "recorte"].map(function (m) {
      return el("button.filtro", {
        type: "button",
        texto: m === "inteira" ? "Imagem inteira" : "Recortar",
        dataset: { modo: m },
        onclick: function () {
          if (ocupado || modo === m) return;
          modo = m;
          if (m === "inteira") R = G.inicial(W, H, cfg);
          mudou(true);
        },
      });
    }) : null;

    var controles = el("div.editor-imagem__controles", {}, [
      linhaZoom,
      cfg.livre ? largura.campo : null,
      cfg.livre ? altura.campo : null,
      horizontal.campo,
      vertical.campo,
    ]);

    /* ---------- desenho ---------- */

    function cor(nome, padrao) {
      var v = getComputedStyle(document.documentElement).getPropertyValue(nome);
      return (v && v.trim()) || padrao;
    }

    function xadrez(c, x, y, w, h, a, b) {
      c.save();
      c.beginPath(); c.rect(x, y, w, h); c.clip();
      c.fillStyle = a; c.fillRect(x, y, w, h);
      c.fillStyle = b;
      var lado = 10;
      var x0 = Math.floor(x / lado) * lado, y0 = Math.floor(y / lado) * lado;
      for (var yy = y0; yy < y + h; yy += lado) {
        for (var xx = x0 + (((yy - y0) / lado) % 2 ? lado : 0); xx < x + w; xx += lado * 2) c.fillRect(xx, yy, lado, lado);
      }
      c.restore();
    }

    function pedirPintura() {
      if (quadro) return;
      quadro = global.requestAnimationFrame(pintar);
    }

    function pintar() {
      quadro = 0;
      if (!origem) return;
      var dpr = global.devicePixelRatio || 1;
      var cw = palco.clientWidth, ch = palco.clientHeight;
      if (!cw || !ch) return;
      var pw = Math.round(cw * dpr), ph = Math.round(ch * dpr);
      if (tela.width !== pw || tela.height !== ph) { tela.width = pw; tela.height = ph; }
      var c = tela.getContext("2d");
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, cw, ch);
      c.fillStyle = cor("--cor-superficie-2", "#18181B");
      c.fillRect(0, 0, cw, ch);

      var v = G.vista(R, cw, ch, MARGEM);
      var ix = v.imagem.x, iy = v.imagem.y, iw = W * v.escala, ih = H * v.escala;
      xadrez(c, ix, iy, iw, ih, cor("--cor-superficie", "#101012"), cor("--cor-superficie-3", "#222225"));
      c.imageSmoothingEnabled = true;
      c.imageSmoothingQuality = "high";
      c.drawImage(origem, ix, iy, iw, ih);

      var q = v.quadro;
      var circulo = cfg.mascara === "circulo";
      c.save();
      c.beginPath();
      c.rect(0, 0, cw, ch);
      if (circulo) c.ellipse(q.x + q.w / 2, q.y + q.h / 2, q.w / 2, q.h / 2, 0, 0, Math.PI * 2);
      else c.rect(q.x, q.y, q.w, q.h);
      c.fillStyle = cor("--cor-veu-recorte", "rgba(8, 8, 10, 0.66)");
      c.fill("evenodd");
      c.restore();

      c.save();
      c.strokeStyle = cor("--cor-traco-forte", "#FFFFFF");
      c.lineWidth = 2;
      if (circulo) {
        c.beginPath(); c.ellipse(q.x + q.w / 2, q.y + q.h / 2, q.w / 2, q.h / 2, 0, 0, Math.PI * 2); c.stroke();
        c.setLineDash([4, 4]); c.lineWidth = 1;
        c.strokeRect(q.x + 0.5, q.y + 0.5, q.w - 1, q.h - 1);
      } else {
        c.strokeRect(q.x + 1, q.y + 1, q.w - 2, q.h - 2);
        if (cfg.guia === "circulo") {
          c.setLineDash([6, 5]); c.lineWidth = 1.5;
          c.beginPath(); c.ellipse(q.x + q.w / 2, q.y + q.h / 2, q.w / 2 - 1, q.h / 2 - 1, 0, 0, Math.PI * 2); c.stroke();
        }
      }
      c.restore();
    }

    /* A miniatura é o MESMO retângulo do arquivo salvo, na proporção do
       resultado. */
    function pintarMiniatura() {
      if (!origem) return;
      var maximo = 140;
      var a = R.w / R.h;
      var mw = a >= 1 ? maximo : Math.round(maximo * a);
      var mh = a >= 1 ? Math.round(maximo / a) : maximo;
      var dpr = global.devicePixelRatio || 1;
      mini.style.width = mw + "px";
      mini.style.height = mh + "px";
      mini.width = Math.round(mw * dpr);
      mini.height = Math.round(mh * dpr);
      var c = mini.getContext("2d");
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      xadrez(c, 0, 0, mw, mh, cor("--cor-superficie", "#101012"), cor("--cor-superficie-3", "#222225"));
      c.imageSmoothingEnabled = true;
      c.imageSmoothingQuality = "high";
      c.drawImage(origem, R.x, R.y, R.w, R.h, 0, 0, mw, mh);
    }

    /* ---------- estado → controles ---------- */

    function zoomAtual() { return G.zoomDe(R, W, H, proporcao()); }

    function aplicarZoom(z, foco) {
      R = G.comZoom(R, W, H, proporcao(), z, foco);
      mudou();
    }

    function mudou(redesenharModo) {
      var travado = modo === "inteira";
      var zMax = G.zoomMaximo(W, H, proporcao());
      zoom.entrada.max = String(Math.max(100, Math.round(zMax * 100)));
      zoom.entrada.value = String(Math.round(zoomAtual() * 100));
      zoom.valor.textContent = Math.round(zoomAtual() * 100) + "%";
      zoom.entrada.disabled = travado || zMax <= 1.001;

      var pos = G.posicao(R, W, H);
      [[horizontal, pos.x], [vertical, pos.y]].forEach(function (par) {
        var f = par[0], v = par[1];
        f.entrada.disabled = travado || v === null;
        f.entrada.value = String(Math.round(v === null ? 50 : v));
        f.valor.textContent = v === null ? "—" : Math.round(v) + "%";
      });
      if (cfg.livre) {
        largura.entrada.value = String(Math.round(R.w / W * 100));
        altura.entrada.value = String(Math.round(R.h / H * 100));
        largura.valor.textContent = Math.round(R.w / W * 100) + "%";
        altura.valor.textContent = Math.round(R.h / H * 100) + "%";
        largura.entrada.disabled = altura.entrada.disabled = travado;
      }
      U.$$(".editor-imagem__passo", linhaZoom).forEach(function (b) { b.disabled = zoom.entrada.disabled; });
      controles.hidden = travado;
      if (botoesDeModo) botoesDeModo.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.modo === modo)); });

      var s = G.saida(R, cfg);
      var pequena = !cfg.livre && (cfg.largura ? R.w < cfg.largura * 0.4 : R.w < cfg.lado * 0.5);
      info.textContent = (travado ? "Imagem inteira: " : "Área de ") + Math.round(R.w) + " × " + Math.round(R.h) +
        " px da original; salva com até " + s.largura + " × " + s.altura + " px." +
        (pequena ? " A área é pequena e pode ficar borrada." : "");
      /* A miniatura é pequena e é o que confirma o resultado: desenhada na
         hora. O palco, grande, espera o próximo quadro. */
      pintarMiniatura();
      pedirPintura();
    }

    /* ---------- gestos ---------- */

    function pontoNaImagem(clienteX, clienteY) {
      var caixa = tela.getBoundingClientRect();
      var v = G.vista(R, palco.clientWidth, palco.clientHeight, MARGEM);
      return { x: (clienteX - caixa.left - v.imagem.x) / v.escala, y: (clienteY - caixa.top - v.imagem.y) / v.escala };
    }

    function escalaAtual() { return G.vista(R, palco.clientWidth, palco.clientHeight, MARGEM).escala || 1; }

    tela.addEventListener("pointerdown", function (ev) {
      if (ocupado || modo === "inteira") return;
      ev.preventDefault();
      try { tela.setPointerCapture(ev.pointerId); } catch (e) { /* sem captura */ }
      ponteiros[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
      iniciarGesto();
    });
    tela.addEventListener("pointermove", function (ev) {
      if (!ponteiros[ev.pointerId] || !gesto) return;
      ponteiros[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
      var ids = Object.keys(ponteiros);
      if (ids.length >= 2 && gesto.pinca) {
        var a = ponteiros[ids[0]], b = ponteiros[ids[1]];
        var d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        R = gesto.R;
        aplicarZoom(gesto.z * d / gesto.d, gesto.foco);
        return;
      }
      var p = ponteiros[ids[0]];
      var s = escalaAtual();
      R = G.mover(gesto.R, -(p.x - gesto.x) / s, -(p.y - gesto.y) / s, W, H);
      mudou();
    });
    function soltar(ev) {
      delete ponteiros[ev.pointerId];
      if (Object.keys(ponteiros).length) iniciarGesto(); else gesto = null;
    }
    tela.addEventListener("pointerup", soltar);
    tela.addEventListener("pointercancel", soltar);

    function iniciarGesto() {
      var ids = Object.keys(ponteiros);
      if (ids.length >= 2) {
        var a = ponteiros[ids[0]], b = ponteiros[ids[1]];
        gesto = {
          pinca: true, R: R, z: zoomAtual(), d: Math.hypot(a.x - b.x, a.y - b.y) || 1,
          foco: pontoNaImagem((a.x + b.x) / 2, (a.y + b.y) / 2),
        };
      } else if (ids.length === 1) {
        var p = ponteiros[ids[0]];
        gesto = { pinca: false, R: R, x: p.x, y: p.y };
      }
    }

    tela.addEventListener("wheel", function (ev) {
      if (ocupado || modo === "inteira") return;
      ev.preventDefault();
      aplicarZoom(zoomAtual() * Math.exp(-ev.deltaY * 0.0015), pontoNaImagem(ev.clientX, ev.clientY));
    }, { passive: false });

    tela.addEventListener("keydown", function (ev) {
      if (ocupado || modo === "inteira") return;
      var passo = (ev.shiftKey ? 40 : 10) / escalaAtual();
      if (ev.key === "ArrowLeft") R = G.mover(R, -passo, 0, W, H);
      else if (ev.key === "ArrowRight") R = G.mover(R, passo, 0, W, H);
      else if (ev.key === "ArrowUp") R = G.mover(R, 0, -passo, W, H);
      else if (ev.key === "ArrowDown") R = G.mover(R, 0, passo, W, H);
      else if (ev.key === "+" || ev.key === "=") { ev.preventDefault(); aplicarZoom(zoomAtual() * 1.1); return; }
      else if (ev.key === "-" || ev.key === "_") { ev.preventDefault(); aplicarZoom(zoomAtual() / 1.1); return; }
      else return;
      ev.preventDefault();
      mudou();
    });

    /* ---------- a janela ---------- */

    return new Promise(function (resolver) {
      var concluido = false;
      var janela = null;

      async function usar(fechar) {
        if (ocupado) return;
        ocupado = true;
        U.$$("input, button.filtro, .editor-imagem__passo, .editor-imagem__acoes button", janela.janela)
          .forEach(function (n) { n.dataset.antes = n.disabled ? "1" : ""; n.disabled = true; });
        tela.setAttribute("aria-disabled", "true");
        try {
          /* Deixa o botão mostrar "Preparando…" antes do trabalho pesado. */
          await new Promise(function (r) { setTimeout(r, 30); });
          var tam = G.saida(R, cfg);
          var desenho = RI.recortar(origem, { x: R.x, y: R.y, largura: R.w, altura: R.h }, tam.largura, tam.altura);
          var cod = RI.codificar(desenho, { limite: cfg.limite });
          desenho.width = desenho.height = 0;
          if (!cod.ok) { UI.avisoErro(cod.mensagem); return; }
          var resultado = {
            ok: true, imagem: cod.imagem, largura: cod.largura, altura: cod.altura, bytes: cod.bytes,
            formato: cod.formato, transparente: cod.transparente, gif: false, convertidoDeGif: !!extra.deGif,
            recorte: { x: Math.round(R.x), y: Math.round(R.y), largura: Math.round(R.w), altura: Math.round(R.h) },
          };
          if (!(await entregar(resultado, o))) return;
          concluido = true;
          ocupado = false;
          fechar();
          resolver(resultado);
        } finally {
          if (!concluido) {
            ocupado = false;
            U.$$("input, button.filtro, .editor-imagem__passo, .editor-imagem__acoes button", janela.janela)
              .forEach(function (n) { n.disabled = n.dataset.antes === "1"; delete n.dataset.antes; });
            tela.removeAttribute("aria-disabled");
            mudou();
          }
        }
      }

      janela = UI.modal({
        titulo: cfg.titulo,
        largo: true,
        classe: "editor-imagem-janela",
        podeFechar: function () { return !ocupado; },
        conteudo: el("div.editor-imagem", {}, [
          el("p.t-mini", { texto: cfg.explicacao }),
          extra.deGif ? el("p.t-mini.editor-imagem__aviso", {
            texto: "Conversão para imagem estática: o resultado é o primeiro quadro do GIF, sem animação. A miniatura mostra exatamente o que vai ser salvo.",
          }) : null,
          botoesDeModo ? el("div.filtros__grupo", { role: "group", "aria-label": "Como usar a imagem" }, botoesDeModo) : null,
          el("div.editor-imagem__area", {}, [
            palco,
            el("div.editor-imagem__lado", {}, [
              el("figure.editor-imagem__resultado", {}, [
                mini,
                el("figcaption.t-mini", { texto: cfg.mascara === "circulo" ? "Resultado (exibido redondo)" : "Resultado" }),
              ]),
              info,
              el("div.editor-imagem__acoes", {}, [redefinir]),
            ]),
          ]),
          controles,
        ]),
        botoes: [
          { rotulo: "Cancelar", classe: "r-botao--fantasma" },
          {
            rotulo: "Usar imagem",
            classe: "r-botao--principal",
            rotuloOcupado: o.aoUsar ? "Enviando…" : "Preparando…",
            aoClicar: function (fechar) { return usar(fechar); },
          },
        ],
        aoFechar: function () {
          if (quadro) global.cancelAnimationFrame(quadro);
          quadro = 0;
          if (observador) observador.disconnect();
          if (aoRedimensionar) global.removeEventListener("resize", aoRedimensionar);
          ponteiros = {};
          gesto = null;
          liberar(aberta);
          origem = null;
          tela.width = tela.height = 0;
          mini.width = mini.height = 0;
          if (!concluido) resolver({ ok: false, erro: "cancelado" });
        },
      });

      if (global.ResizeObserver) {
        observador = new ResizeObserver(function () { pedirPintura(); });
        observador.observe(palco);
      } else {
        aoRedimensionar = function () { pedirPintura(); };
        global.addEventListener("resize", aoRedimensionar);
      }
      mudou(true);
      /* O foco começa no palco: as setas já enquadram. */
      tela.focus();
    });
  }

  global.RAMAEditorImagem = {
    DESTINOS: Object.keys(DESTINOS),
    configuracao: configuracao,
    escolher: escolher,
    abrirArquivo: abrirArquivo,
    geometria: G,
  };
})(typeof window !== "undefined" ? window : globalThis);
