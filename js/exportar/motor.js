/* =====================================================================
   R.A.M.A. — exportar a ficha em PDF e PNG
   ---------------------------------------------------------------------
   Cada sistema tem um MODELO próprio (js/exportar/modelo-*.js), com a
   cara da ficha que o sistema distribui: este arquivo é só a oficina
   comum a todos — páginas, primitivas de desenho, o texto que corre de
   uma caixa para a seguinte e para as páginas de continuação, e a saída
   em PNG (um arquivo por página) e em PDF (um arquivo com todas).

   As páginas são desenhadas UMA VEZ, em canvas, e os dois formatos saem
   das mesmas páginas: a página 2 do PDF é, pixel a pixel, o arquivo
   _p02.png. O PDF guarda cada página como imagem (sem perdas quando o
   navegador tem CompressionStream; senão, JPEG de alta qualidade).

   O que vai para o papel é a ficha que a página tem AGORA (estado da
   tela, inclusive o que ainda não foi gravado): nada é pedido ao
   servidor, e nada da ficha é alterado — os modelos recebem uma cópia.

   Unidades: os modelos desenham em pontos tipográficos (A4 = 595 × 842)
   e o canvas é ampliado por ESCALA (≈ 180 dpi), para o texto pequeno e
   as marcações continuarem legíveis no PNG.
   ===================================================================== */

(function (global) {
  "use strict";

  var A4 = { largura: 595.28, altura: 841.89 };
  var ESCALA = 2.5;
  var MODELOS = {};

  /* Como cada sistema aparece no nome do arquivo. */
  var NOME_DO_SISTEMA = {
    ordem: "Ordem-I", ordem2: "Ordem-II", oblivio: "Oblivio", vampiro: "Vampiro-V5",
    goblins: "Malditos-Goblins", brutal: "BRUTAL", tormenta20: "Tormenta20", universal: "Universal",
  };

  /* =================================================================
     NOME DO ARQUIVO
     {nome}_{sistema}_{AAAA-MM-DD}_{idConta}{idFicha}[_pNN].{ext}
     ================================================================= */

  var RESERVADOS = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i;

  /* Um pedaço do nome válido no Windows: espaços viram hífen; somem os
     caracteres proibidos (< > : " / \ | ? *), os de controle e o "_"
     (que separa as partes). Acentos ficam — o Windows aceita. */
  function componente(valor, reserva) {
    var s = String(valor === undefined || valor === null ? "" : valor).normalize("NFC");
    s = s.replace(/[\u0000-\u001f\u007f<>:"\/\\|?*_]+/g, " ").trim().replace(/\s+/g, "-");
    s = s.replace(/-{2,}/g, "-").replace(/^[-.]+|[-.]+$/g, "");
    if (s.length > 60) s = s.slice(0, 60).replace(/[-.]+$/, "");
    if (!s || RESERVADOS.test(s)) s = reserva || "ficha";
    return s;
  }

  /* Identificadores: os códigos que a tela mostra (Agente // XXXXX no
     Perfil, Registro // XXXXX na ficha), passados por quem exporta; aqui
     só ficam letras, números e hífen. */
  function identificador(valor, reserva) {
    var s = String(valor || "").replace(/[^A-Za-z0-9-]+/g, "");
    return s || reserva;
  }

  function dataLocal(d) {
    var x = d instanceof Date ? d : new Date();
    function dois(n) { return (n < 10 ? "0" : "") + n; }
    return x.getFullYear() + "-" + dois(x.getMonth() + 1) + "-" + dois(x.getDate());
  }

  function nomeDoSistema(id) {
    return NOME_DO_SISTEMA[id] || componente(id, "Sistema");
  }

  /* `pagina` (1, 2…) só no PNG. */
  function nomeDoArquivo(info, extensao, pagina) {
    var base = [
      componente(info.nome, "Personagem"),
      nomeDoSistema(info.sistema),
      dataLocal(info.data),
      identificador(info.contaId, "conta") + identificador(info.fichaId, "ficha"),
    ].join("_");
    if (pagina) base += "_p" + (pagina < 10 ? "0" : "") + pagina;
    return base + "." + extensao;
  }

  /* =================================================================
     SORTEIO COM SEMENTE
     A textura gasta de Ordem, o traço irregular do BRUTAL: o mesmo
     personagem sai sempre igual (e o PDF bate com o PNG).
     ================================================================= */

  function semente(texto) {
    var h = 2166136261;
    String(texto || "").split("").forEach(function (c) { h = Math.imul(h ^ c.charCodeAt(0), 16777619); });
    var s = h >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* =================================================================
     PINTOR — primitivas sobre o contexto 2D, em pontos
     ================================================================= */

  var FAMILIAS = {
    sans: "Arial, Helvetica, 'Liberation Sans', sans-serif",
    estreita: "'Arial Narrow', 'Roboto Condensed', 'Liberation Sans Narrow', Arial, sans-serif",
    pesada: "Impact, 'Arial Black', 'Haettenschweiler', 'Franklin Gothic Heavy', sans-serif",
    serif: "Georgia, 'Times New Roman', 'Liberation Serif', serif",
    classica: "'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif",
    mono: "'Courier New', Courier, 'Liberation Mono', monospace",
    maquina: "'Courier New', Courier, monospace",
  };

  function Pintor(ctx) {
    this.ctx = ctx;
  }

  Pintor.prototype.fonte = function (o) {
    var x = o || {};
    var fam = FAMILIAS[x.fam] || x.fam || FAMILIAS.sans;
    this.ctx.font = (x.italico ? "italic " : "") + (x.peso || "normal") + " " + (x.tam || 9) + "px " + fam;
    return this;
  };

  Pintor.prototype.medir = function (s, o) {
    if (o) this.fonte(o);
    return this.ctx.measureText(String(s)).width;
  };

  /* Uma linha. Com `max`, a fonte diminui até caber (nunca abaixo de
     55% — daí em diante, corta com reticências). */
  Pintor.prototype.texto = function (s, x, y, o) {
    var c = this.ctx, op = o || {};
    var t = String(s === undefined || s === null ? "" : s);
    if (!t) return 0;
    var tam = op.tam || 9;
    this.fonte(Object.assign({}, op, { tam: tam }));
    if (op.max) {
      var w = c.measureText(t).width;
      if (w > op.max) {
        var novo = Math.max(tam * 0.55, tam * op.max / w);
        tam = novo;
        this.fonte(Object.assign({}, op, { tam: tam }));
        while (c.measureText(t).width > op.max && t.length > 1) t = t.slice(0, -2) + "…";
      }
    }
    c.fillStyle = op.cor || "#111";
    c.textAlign = op.alinhar || "left";
    c.textBaseline = op.base || "alphabetic";
    if (op.espacamento && c.letterSpacing !== undefined) c.letterSpacing = op.espacamento + "px";
    c.fillText(t, x, y);
    if (op.espacamento && c.letterSpacing !== undefined) c.letterSpacing = "0px";
    if (op.sublinhar) {
      var ww = c.measureText(t).width;
      var x0 = op.alinhar === "center" ? x - ww / 2 : (op.alinhar === "right" ? x - ww : x);
      this.linha(x0, y + 1.2, x0 + ww, y + 1.2, { cor: op.cor || "#111", linha: 0.5 });
    }
    return tam;
  };

  /* Quebra em linhas que cabem em `largura`. Cada linha sabe se termina
     um parágrafo (para o resto voltar a ser texto com as quebras). */
  Pintor.prototype.quebrar = function (s, largura, o) {
    if (o) this.fonte(o);
    var c = this.ctx, saida = [];
    String(s === undefined || s === null ? "" : s).replace(/\r/g, "").split("\n").forEach(function (par) {
      var palavras = par.split(/\s+/).filter(Boolean);
      if (!palavras.length) { saida.push({ t: "", fim: true }); return; }
      var linha = "";
      palavras.forEach(function (p) {
        var tenta = linha ? linha + " " + p : p;
        if (c.measureText(tenta).width <= largura || !linha) {
          /* Palavra maior que a linha inteira: corta em pedaços. */
          if (!linha && c.measureText(p).width > largura) {
            var pedaco = "";
            p.split("").forEach(function (ch) {
              if (c.measureText(pedaco + ch).width > largura && pedaco) { saida.push({ t: pedaco, fim: false }); pedaco = ch; }
              else pedaco += ch;
            });
            linha = pedaco;
          } else linha = tenta;
        } else {
          saida.push({ t: linha, fim: false });
          linha = p;
        }
      });
      saida.push({ t: linha, fim: true });
    });
    return saida;
  };

  function juntarLinhas(linhas) {
    return linhas.map(function (l, i) { return l.t + (i < linhas.length - 1 ? (l.fim ? "\n" : " ") : ""); }).join("");
  }

  Pintor.prototype.retangulo = function (x, y, w, h, o) {
    var c = this.ctx, op = o || {};
    c.beginPath();
    if (op.raio && c.roundRect) c.roundRect(x, y, w, h, op.raio);
    else c.rect(x, y, w, h);
    if (op.fundo) { c.fillStyle = op.fundo; c.fill(); }
    if (op.borda !== false && (op.borda || !op.fundo)) {
      c.strokeStyle = op.borda || "#111";
      c.lineWidth = op.linha || 1;
      c.setLineDash(op.tracejado || []);
      c.stroke();
      c.setLineDash([]);
    }
    return this;
  };

  /* Retângulo de traço irregular, como feito a pincel (BRUTAL). */
  Pintor.prototype.rabisco = function (x, y, w, h, o) {
    var c = this.ctx, op = o || {}, r = op.sorteio || Math.random;
    var amp = op.tremor === undefined ? 1.2 : op.tremor;
    function lado(x1, y1, x2, y2) {
      var n = Math.max(3, Math.round(Math.hypot(x2 - x1, y2 - y1) / 14));
      for (var i = 1; i <= n; i++) {
        var t = i / n;
        c.lineTo(x1 + (x2 - x1) * t + (r() - 0.5) * amp, y1 + (y2 - y1) * t + (r() - 0.5) * amp);
      }
    }
    for (var passada = 0; passada < (op.passadas || 2); passada++) {
      c.beginPath();
      c.moveTo(x + (r() - 0.5) * amp, y + (r() - 0.5) * amp);
      lado(x, y, x + w, y); lado(x + w, y, x + w, y + h); lado(x + w, y + h, x, y + h); lado(x, y + h, x, y);
      c.closePath();
      if (op.fundo && passada === 0) { c.fillStyle = op.fundo; c.fill(); }
      c.strokeStyle = op.borda || "#111";
      c.lineWidth = (op.linha || 2.2) * (passada ? 0.6 : 1);
      c.lineJoin = "round";
      c.stroke();
    }
    return this;
  };

  Pintor.prototype.linha = function (x1, y1, x2, y2, o) {
    var c = this.ctx, op = o || {};
    c.beginPath();
    c.moveTo(x1, y1); c.lineTo(x2, y2);
    c.strokeStyle = op.cor || "#111";
    c.lineWidth = op.linha || 0.6;
    c.setLineDash(op.tracejado || []);
    c.stroke();
    c.setLineDash([]);
    return this;
  };

  Pintor.prototype.circulo = function (cx, cy, r, o) {
    var c = this.ctx, op = o || {};
    c.beginPath();
    c.arc(cx, cy, r, 0, Math.PI * 2);
    if (op.fundo) { c.fillStyle = op.fundo; c.fill(); }
    if (op.borda !== false) { c.strokeStyle = op.borda || "#111"; c.lineWidth = op.linha || 0.8; c.stroke(); }
    return this;
  };

  Pintor.prototype.poligono = function (pontos, o) {
    var c = this.ctx, op = o || {};
    c.beginPath();
    pontos.forEach(function (p, i) { if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); });
    c.closePath();
    if (op.fundo) { c.fillStyle = op.fundo; c.fill(); }
    if (op.borda) { c.strokeStyle = op.borda; c.lineWidth = op.linha || 1; c.stroke(); }
    return this;
  };

  /* Bolinhas de graduação (Vampiro): `n` círculos, `cheias` preenchidas. */
  Pintor.prototype.bolinhas = function (x, y, n, cheias, o) {
    var op = o || {}, r = op.raio || 3.2, passo = op.passo || r * 2.7;
    for (var i = 0; i < n; i++) {
      this.circulo(x + r + i * passo, y, r, { fundo: i < cheias ? (op.cor || "#111") : (op.vazio || null), borda: op.borda || op.cor || "#111", linha: op.linha || 0.7 });
    }
    return x + n * passo;
  };

  /* Caixinhas de trilha: cada uma pode estar vazia, com "/" (dano
     superficial) ou com "X" (agravado). `marcas` é a lista de estados. */
  Pintor.prototype.caixinhas = function (x, y, marcas, o) {
    var op = o || {}, l = op.lado || 7, passo = op.passo || l + 2.2;
    var self = this;
    marcas.forEach(function (m, i) {
      var cx = x + i * passo + (op.grupo && i >= op.grupo ? Math.floor(i / op.grupo) * (op.vao || 4) : 0);
      self.retangulo(cx, y, l, l, { borda: op.cor || "#111", linha: op.linha || 0.7, fundo: m === "cheia" ? (op.cor || "#111") : null });
      if (m === "/" || m === "x") self.linha(cx + l, y, cx, y + l, { cor: op.marca || op.cor || "#111", linha: 1 });
      if (m === "x") self.linha(cx, y, cx + l, y + l, { cor: op.marca || op.cor || "#111", linha: 1 });
    });
    return x + marcas.length * passo;
  };

  Pintor.prototype.imagem = function (img, x, y, w, h, o) {
    if (!img) return this;
    var op = o || {}, c = this.ctx;
    var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    if (!iw || !ih) return this;
    /* Cobre a caixa sem distorcer (corte centralizado). */
    var k = op.conter ? Math.min(w / iw, h / ih) : Math.max(w / iw, h / ih);
    var dw = iw * k, dh = ih * k;
    c.save();
    c.beginPath(); c.rect(x, y, w, h); c.clip();
    if (op.alfa !== undefined) c.globalAlpha = op.alfa;
    c.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    c.restore();
    return this;
  };

  /* =================================================================
     TEXTO QUE CORRE
     Um ITEM é { titulo, direita, meta, texto }. encaixar() desenha
     itens numa caixa até ela encher e devolve o que sobrou (um item pode
     ser partido no meio do texto). fluir() leva seções inteiras por
     várias caixas e cria páginas de continuação quando elas acabam.
     ================================================================= */

  var ESTILO_PADRAO = {
    fam: "sans", famTitulo: "sans", tamTitulo: 8.6, tamTexto: 7.6, tamMeta: 6.8,
    cor: "#111", corTitulo: "#111", corMeta: "#555", corDireita: "#111",
    pesoTitulo: "bold", entrelinha: 1.28, entre: 4.5, recuoTexto: 0,
  };

  function estiloDe(e) { return Object.assign({}, ESTILO_PADRAO, e || {}); }

  /* As linhas de um item, já medidas. */
  function linhasDoItem(P, item, largura, e) {
    var linhas = [];
    if (item.titulo) {
      P.fonte({ fam: e.famTitulo, tam: e.tamTitulo, peso: e.pesoTitulo });
      var larguraTitulo = largura - (item.direita ? P.medir(item.direita, { fam: e.famTitulo, tam: e.tamTitulo, peso: "bold" }) + 6 : 0);
      P.quebrar(item.titulo, Math.max(30, larguraTitulo), { fam: e.famTitulo, tam: e.tamTitulo, peso: e.pesoTitulo }).forEach(function (l, i) {
        linhas.push({ tipo: "titulo", t: l.t, h: e.tamTitulo * e.entrelinha, direita: i === 0 ? item.direita : "" });
      });
    } else if (item.direita) {
      linhas.push({ tipo: "titulo", t: "", h: e.tamTitulo * e.entrelinha, direita: item.direita });
    }
    if (item.meta) {
      P.quebrar(item.meta, largura - e.recuoTexto, { fam: e.fam, tam: e.tamMeta, italico: true }).forEach(function (l) {
        linhas.push({ tipo: "meta", t: l.t, fim: l.fim, h: e.tamMeta * e.entrelinha });
      });
    }
    if (item.texto) {
      P.quebrar(item.texto, largura - e.recuoTexto, { fam: e.fam, tam: e.tamTexto }).forEach(function (l) {
        linhas.push({ tipo: "texto", t: l.t, fim: l.fim, h: e.tamTexto * e.entrelinha });
      });
    }
    return linhas;
  }

  function desenharLinha(P, l, x, y, largura, e) {
    if (l.tipo === "titulo") {
      if (l.t) P.texto(l.t, x, y + e.tamTitulo, { fam: e.famTitulo, tam: e.tamTitulo, peso: e.pesoTitulo, cor: e.corTitulo });
      if (l.direita) P.texto(l.direita, x + largura, y + e.tamTitulo, { fam: e.famTitulo, tam: e.tamTitulo, peso: "bold", cor: e.corDireita, alinhar: "right" });
    } else if (l.tipo === "meta") {
      P.texto(l.t, x + e.recuoTexto, y + e.tamMeta, { fam: e.fam, tam: e.tamMeta, italico: true, cor: e.corMeta });
    } else {
      P.texto(l.t, x + e.recuoTexto, y + e.tamTexto, { fam: e.fam, tam: e.tamTexto, cor: e.cor });
    }
  }

  /* O que ficou de um item partido: o resto do texto (e da linha de
     detalhes, se ela também não coube), com o título marcado. */
  function restoDoItem(item, linhas, usadas) {
    var resto = linhas.slice(usadas);
    var meta = resto.filter(function (l) { return l.tipo === "meta"; });
    var texto = resto.filter(function (l) { return l.tipo === "texto"; });
    var titulo = resto.filter(function (l) { return l.tipo === "titulo"; }).length ? item.titulo : (item.titulo ? item.titulo + " (cont.)" : "");
    return {
      titulo: titulo,
      direita: resto.some(function (l) { return l.tipo === "titulo"; }) ? item.direita : "",
      meta: meta.length ? juntarLinhas(meta) : "",
      texto: texto.length ? juntarLinhas(texto) : "",
      continuacao: true,
    };
  }

  /* Desenha `itens` em rect {x, y, w, h}. Devolve { y, sobra }. */
  function encaixar(P, itens, rect, estilo) {
    var e = estiloDe(estilo);
    var y = rect.y, fundo = rect.y + rect.h;
    var lista = (itens || []).filter(Boolean);
    for (var i = 0; i < lista.length; i++) {
      var item = lista[i];
      if (item.separador) {
        if (y + 6 > fundo) return { y: y, sobra: lista.slice(i) };
        P.linha(rect.x, y + 2.5, rect.x + rect.w, y + 2.5, { cor: e.corMeta, linha: 0.4 });
        y += 6; continue;
      }
      var linhas = linhasDoItem(P, item, rect.w, e);
      /* Título nunca fica sozinho no fim da caixa. */
      var minimo = linhas.length > 1 && linhas[0].tipo === "titulo" ? linhas[0].h + linhas[1].h : (linhas[0] ? linhas[0].h : 0);
      if (y + minimo > fundo + 0.01) {
        if (y === rect.y && rect.h < minimo) { /* caixa menor que uma linha: nada a fazer aqui */ }
        return { y: y, sobra: lista.slice(i) };
      }
      for (var k = 0; k < linhas.length; k++) {
        if (y + linhas[k].h > fundo + 0.01) {
          return { y: y, sobra: [restoDoItem(item, linhas, k)].concat(lista.slice(i + 1)) };
        }
        desenharLinha(P, linhas[k], rect.x, y, rect.w, e);
        y += linhas[k].h;
      }
      y += e.entre;
    }
    return { y: y, sobra: [] };
  }

  /* Altura que os itens ocupariam numa largura (sem desenhar). */
  function alturaDosItens(P, itens, largura, estilo) {
    var e = estiloDe(estilo), h = 0;
    (itens || []).filter(Boolean).forEach(function (item) {
      if (item.separador) { h += 6; return; }
      linhasDoItem(P, item, largura, e).forEach(function (l) { h += l.h; });
      h += e.entre;
    });
    return h;
  }

  /* Leva as seções pelas caixas da página atual e pelas de continuação.
     op.caixas: rects da página corrente (podem acabar vazias).
     op.novaPagina(doc) → rects de uma página de continuação (desenha o
     fundo e o cabeçalho dela).
     op.cabecalho(P, secao, rect, continuacao) → altura usada. */
  function fluir(doc, secoes, op) {
    var e = estiloDe(op.estilo);
    var caixas = (op.caixas || []).slice();
    var P = null, rect = null;
    function proxima() {
      if (!caixas.length) caixas = op.novaPagina(doc).slice();
      rect = Object.assign({}, caixas.shift());
      P = doc.pintorAtual();
    }
    proxima();
    var alturaCab = op.alturaCabecalho || 16;
    secoes.filter(function (s) { return s && (s.itens && s.itens.length || s.mostrarVazia); }).forEach(function (s) {
      var itens = s.itens && s.itens.length ? s.itens.slice() : [{ texto: s.vazio || "—" }];
      var continuacao = false;
      var guarda = 0;
      while (itens.length && guarda++ < 400) {
        var linhas = linhasDoItem(P, itens[0], rect.w, e);
        var precisa = alturaCab + (linhas[0] ? linhas[0].h + (linhas[1] ? linhas[1].h : 0) : 0);
        if (rect.h < precisa) { proxima(); continue; }
        var usado = op.cabecalho(P, s, rect, continuacao);
        rect.y += usado; rect.h -= usado;
        var r = encaixar(P, itens, rect, s.estilo || op.estilo);
        var gasto = r.y - rect.y;
        rect.y = r.y + (op.entreSecoes || 6); rect.h -= gasto + (op.entreSecoes || 6);
        itens = r.sobra;
        if (itens.length) { continuacao = true; proxima(); }
      }
    });
    return { rect: rect };
  }

  /* =================================================================
     DOCUMENTO — as páginas em canvas
     ================================================================= */

  function criarCanvas(w, h) {
    if (global.RAMAExportar && global.RAMAExportar._fabricaDeCanvas) return global.RAMAExportar._fabricaDeCanvas(w, h);
    var c = global.document.createElement("canvas");
    c.width = w; c.height = h;
    return c;
  }

  function Documento(op) {
    this.op = op || {};
    this.paginas = [];
    this.escala = this.op.escala || ESCALA;
  }

  /* Uma página nova (retrato ou paisagem), já com o fundo branco e a
     escala aplicada. Devolve { P, largura, altura, n }. */
  Documento.prototype.pagina = function (orientacao) {
    var paisagem = (orientacao || this.op.orientacao) === "paisagem";
    var largura = paisagem ? A4.altura : A4.largura, altura = paisagem ? A4.largura : A4.altura;
    var cv = criarCanvas(Math.round(largura * this.escala), Math.round(altura * this.escala));
    var ctx = cv.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.scale(this.escala, this.escala);
    var pg = { canvas: cv, ctx: ctx, P: new Pintor(ctx), largura: largura, altura: altura, n: this.paginas.length + 1 };
    this.paginas.push(pg);
    return pg;
  };

  Documento.prototype.atual = function () { return this.paginas[this.paginas.length - 1]; };
  Documento.prototype.pintorAtual = function () { return this.atual().P; };

  /* =================================================================
     SAÍDA
     ================================================================= */

  function blobDoCanvas(cv, tipo, qualidade) {
    return new Promise(function (ok, falha) {
      if (cv.toBlob) cv.toBlob(function (b) { if (b) ok(b); else falha(new Error("O navegador não gerou a imagem.")); }, tipo, qualidade);
      else falha(new Error("Canvas sem toBlob."));
    });
  }

  async function paginasEmPng(doc) {
    var saida = [];
    for (var i = 0; i < doc.paginas.length; i++) saida.push(await blobDoCanvas(doc.paginas[i].canvas, "image/png"));
    return saida;
  }

  /* --- PDF mínimo: uma imagem por página --- */

  var codificador = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;
  function bytes(s) { return codificador.encode(s); }

  async function comprimir(dados) {
    var fluxo = new global.CompressionStream("deflate");
    var escrita = fluxo.writable.getWriter();
    escrita.write(dados);
    escrita.close();
    var buf = await new global.Response(fluxo.readable).arrayBuffer();
    return new Uint8Array(buf);
  }

  /* Os pixels da página em RGB, comprimidos (FlateDecode); sem
     CompressionStream, um JPEG (DCTDecode). */
  async function imagemDaPagina(pg) {
    var cv = pg.canvas;
    if (typeof global.CompressionStream === "function") {
      var ctx = cv.getContext("2d");
      var px = ctx.getImageData(0, 0, cv.width, cv.height).data;
      var rgb = new Uint8Array(cv.width * cv.height * 3);
      for (var i = 0, j = 0; i < px.length; i += 4) { rgb[j++] = px[i]; rgb[j++] = px[i + 1]; rgb[j++] = px[i + 2]; }
      return { filtro: "FlateDecode", dados: await comprimir(rgb), w: cv.width, h: cv.height };
    }
    var blob = await blobDoCanvas(cv, "image/jpeg", 0.95);
    return { filtro: "DCTDecode", dados: new Uint8Array(await blob.arrayBuffer()), w: cv.width, h: cv.height };
  }

  /* Texto do dicionário Info em UTF-16BE (aceita acentos). */
  function textoPdf(s) {
    var hex = "FEFF";
    String(s || "").split("").forEach(function (c) { hex += ("000" + c.charCodeAt(0).toString(16)).slice(-4).toUpperCase(); });
    return "<" + hex + ">";
  }

  function montarPdf(imagens, paginas, info) {
    var partes = [], tamanho = 0, offsets = [];
    function por(x) { var b = typeof x === "string" ? bytes(x) : x; partes.push(b); tamanho += b.length; }
    function objeto(n, corpo, fluxo) {
      offsets[n] = tamanho;
      por(n + " 0 obj\n" + corpo);
      if (fluxo) { por("\nstream\n"); por(fluxo); por("\nendstream"); }
      por("\nendobj\n");
    }
    por("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
    var n = paginas.length;
    /* 1 catálogo, 2 páginas, 3 info; depois 3 objetos por página. */
    var kids = [];
    for (var i = 0; i < n; i++) kids.push((4 + i * 3) + " 0 R");
    objeto(1, "<< /Type /Catalog /Pages 2 0 R >>");
    objeto(2, "<< /Type /Pages /Kids [" + kids.join(" ") + "] /Count " + n + " >>");
    objeto(3, "<< /Title " + textoPdf(info.titulo) + " /Creator " + textoPdf("R.A.M.A.") + " /Producer " + textoPdf("R.A.M.A.") + " >>");
    for (var p = 0; p < n; p++) {
      var pg = paginas[p], im = imagens[p];
      var base = 4 + p * 3;
      var w = pg.largura.toFixed(2), h = pg.altura.toFixed(2);
      objeto(base, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + w + " " + h + "] /Resources << /XObject << /Im" + p + " " + (base + 2) + " 0 R >> /ProcSet [/PDF /ImageC] >> /Contents " + (base + 1) + " 0 R >>");
      var conteudo = bytes("q " + w + " 0 0 " + h + " 0 0 cm /Im" + p + " Do Q");
      objeto(base + 1, "<< /Length " + conteudo.length + " >>", conteudo);
      objeto(base + 2, "<< /Type /XObject /Subtype /Image /Width " + im.w + " /Height " + im.h + " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /" + im.filtro + " /Length " + im.dados.length + " >>", im.dados);
    }
    var total = 4 + n * 3;
    var xref = tamanho;
    var linhas = "xref\n0 " + total + "\n0000000000 65535 f \n";
    for (var k = 1; k < total; k++) linhas += ("0000000000" + offsets[k]).slice(-10) + " 00000 n \n";
    por(linhas);
    por("trailer\n<< /Size " + total + " /Root 1 0 R /Info 3 0 R >>\nstartxref\n" + xref + "\n%%EOF\n");
    return partes;
  }

  async function documentoEmPdf(doc, info) {
    var imagens = [];
    for (var i = 0; i < doc.paginas.length; i++) imagens.push(await imagemDaPagina(doc.paginas[i]));
    return new Blob(montarPdf(imagens, doc.paginas, info || {}), { type: "application/pdf" });
  }

  function baixarBlob(blob, nome) {
    var url = URL.createObjectURL(blob);
    var a = global.document.createElement("a");
    a.href = url; a.download = nome;
    global.document.body.appendChild(a);
    a.click();
    global.document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 20000);
  }

  /* =================================================================
     MODELOS
     ================================================================= */

  /* modelo = { orientacao, desenhar(doc, ficha, contexto) }. */
  function registrar(sistemaId, modelo) { MODELOS[sistemaId] = modelo; }
  function modeloDe(sistemaId) { return MODELOS[sistemaId] || MODELOS.universal || null; }
  function temModelo(sistemaId) { return !!MODELOS[sistemaId]; }

  /* Monta as páginas da ficha. `ficha` é copiada: o modelo pode
     normalizar e calcular à vontade sem tocar na ficha da página.
     contexto = { contaId, fichaId, foto (Image já carregada ou null),
     campanha (nome) }. */
  function gerar(ficha, contexto) {
    var id = (ficha && ficha.tipoFicha) || "universal";
    var modelo = modeloDe(id);
    if (!modelo) throw new Error("Não há modelo de exportação para " + id + ".");
    var copia = JSON.parse(JSON.stringify(ficha));
    var doc = new Documento({ orientacao: modelo.orientacao || "retrato" });
    modelo.desenhar(doc, copia, contexto || {});
    if (!doc.paginas.length) doc.pagina();
    doc.sistema = MODELOS[id] ? id : "universal";
    return doc;
  }

  /* A foto da ficha só entra se for uma imagem embutida (data:) — uma
     de outro endereço "sujaria" o canvas e impediria o arquivo. */
  function carregarFoto(src) {
    return new Promise(function (ok) {
      if (!src || !/^data:image\//.test(String(src)) || typeof global.Image === "undefined") { ok(null); return; }
      var img = new global.Image();
      img.onload = function () { ok(img); };
      img.onerror = function () { ok(null); };
      img.src = src;
    });
  }

  /* Exporta: "pdf" baixa um arquivo; "png", um por página. Devolve os
     nomes baixados. */
  async function exportar(ficha, formato, contexto) {
    var ctx = Object.assign({}, contexto || {});
    if (ctx.fotoSrc && !ctx.foto) ctx.foto = await carregarFoto(ctx.fotoSrc);
    var doc = gerar(ficha, ctx);
    var info = { nome: ficha.nome, sistema: ficha.tipoFicha || "universal", data: new Date(), contaId: ctx.contaId, fichaId: ctx.fichaId };
    var nomes = [];
    if (formato === "pdf") {
      var blob = await documentoEmPdf(doc, { titulo: (ficha.nome || "Ficha") + " — " + nomeDoSistema(info.sistema) });
      var nome = nomeDoArquivo(info, "pdf");
      baixarBlob(blob, nome);
      nomes.push(nome);
    } else {
      var pngs = await paginasEmPng(doc);
      for (var i = 0; i < pngs.length; i++) {
        var n = nomeDoArquivo(info, "png", i + 1);
        baixarBlob(pngs[i], n);
        nomes.push(n);
        /* Um respiro entre os downloads: alguns navegadores descartam
           cliques seguidos. */
        if (i < pngs.length - 1) await new Promise(function (r) { setTimeout(r, 350); });
      }
    }
    return { nomes: nomes, paginas: doc.paginas.length };
  }

  /* =================================================================
     AJUDAS PARA OS MODELOS
     ================================================================= */

  function txt(v) { return v === undefined || v === null ? "" : String(v); }
  function sinal(n) { var v = Number(n) || 0; return (v >= 0 ? "+" : "") + v; }
  /* Tira marcação HTML de uma anotação (as notas podem ter formatação). */
  function semHtml(s) {
    var t = txt(s);
    if (!/[<&]/.test(t)) return t;
    return t.replace(/<\s*br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|h[1-6])>/gi, "\n").replace(/<li[^>]*>/gi, "• ")
      .replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/&amp;/g, "&")
      .replace(/\n{3,}/g, "\n\n").trim();
  }

  /* As anotações da ficha (pastas e soltas) como itens. */
  function itensDasAnotacoes(ficha) {
    var an = ficha.anotacoes || {}, saida = [];
    (an.soltas || []).forEach(function (n) { if (n && (n.titulo || n.conteudo)) saida.push({ titulo: n.titulo, texto: semHtml(n.conteudo) }); });
    (an.pastas || []).forEach(function (p) {
      (p.notas || []).forEach(function (n) { if (n && (n.titulo || n.conteudo)) saida.push({ titulo: n.titulo, meta: p.nome, texto: semHtml(n.conteudo) }); });
    });
    return saida;
  }

  /* As habilidades criadas à mão (árvore com pastas). */
  function itensDaArvore(arvore, rotuloPasta) {
    var saida = [];
    function andar(nos, caminho) {
      (nos || []).forEach(function (no) {
        if (!no) return;
        if (no.tipo === "pasta" || Array.isArray(no.filhos)) andar(no.filhos, caminho.concat(no.nome || ""));
        else saida.push({ titulo: no.nome, meta: [caminho.filter(Boolean).join(" › "), no.origem, no.etiqueta && no.etiqueta.texto].filter(Boolean).join(" · "), texto: semHtml(no.texto || no.descricao) });
      });
    }
    andar(arvore && arvore.filhos, rotuloPasta ? [rotuloPasta] : []);
    return saida;
  }

  /* Rituais da ficha universal/Ordem (com rótulos configuráveis). */
  function itensDosRituais(rituais) {
    var r = rituais || {}, rot = r.rotulos || {};
    var campos = ["circulo", "elemento", "execucao", "alcance", "alvo", "area", "duracao", "resistencia"];
    return (r.itens || []).map(function (x) {
      var meta = campos.filter(function (c) { return x[c]; }).map(function (c) { return (rot[c] || c) + ": " + x[c]; }).join(" · ");
      var versoes = (x.versoes || []).filter(function (v) { return v && (v.dano || (v.rolagens && v.rolagens.length) || v.custo || v.alteracoes || v.requisito); }).map(function (v) {
        var rol = (v.rolagens || []).map(function (q) { return (q.rotulo ? q.rotulo + " " : "") + (q.expressao || "") + (q.extra ? " " + q.extra : ""); }).filter(Boolean).join(", ");
        var dano = v.dano ? v.dano + (v.danoExtra ? " " + v.danoExtra : "") : "";
        return (v.nome || "Versão") + ": " + [v.custo ? "+" + v.custo + " PE" : "", v.requisito ? "requisito " + v.requisito : "", dano, rol, v.alteracoes].filter(Boolean).join(" · ");
      });
      var texto = [x.efeito ? (rot.efeito || "Efeito") + ": " + x.efeito : "", versoes.join("\n"), semHtml(x.descricao)].filter(Boolean).join("\n");
      return { titulo: x.nome, direita: x.ordem && x.ordem.custo ? txt(x.ordem.custo) + " PE" : "", meta: meta, texto: texto };
    });
  }

  /* Campos personalizados (informação ou rolável). */
  function itensDosCampos(lista) {
    return (lista || []).filter(Boolean).map(function (c) {
      return c.natureza === "rolavel" ? { titulo: c.nome, direita: (c.valor ? sinal(c.valor) + " · " : "") + (c.dado || "") } : { titulo: c.nome, texto: txt(c.valor) };
    });
  }

  /* Aliados (companheiros) como itens. */
  function itensDosAliados(ficha) {
    return (ficha.aliados || []).filter(Boolean).map(function (a) {
      var rec = (a.recursos || a.status || []);
      var meta = Array.isArray(rec) ? rec.map(function (s) { return s && s.nome ? s.nome + " " + txt(s.atual) + (s.maximo || s.max ? "/" + txt(s.maximo || s.max) : "") : ""; }).filter(Boolean).join(" · ") : "";
      return { titulo: a.nome || "Aliado", meta: [a.tipo || a.modelo || "", meta].filter(Boolean).join(" · "), texto: semHtml(a.notas || a.descricao || "") };
    });
  }

  global.RAMAExportar = {
    A4: A4, ESCALA: ESCALA, FAMILIAS: FAMILIAS, NOME_DO_SISTEMA: NOME_DO_SISTEMA,
    componente: componente, identificador: identificador, dataLocal: dataLocal, nomeDoSistema: nomeDoSistema, nomeDoArquivo: nomeDoArquivo,
    semente: semente, Pintor: Pintor, Documento: Documento,
    encaixar: encaixar, fluir: fluir, alturaDosItens: alturaDosItens, linhasDoItem: linhasDoItem, estiloDe: estiloDe,
    registrar: registrar, modeloDe: modeloDe, temModelo: temModelo, gerar: gerar, exportar: exportar,
    paginasEmPng: paginasEmPng, documentoEmPdf: documentoEmPdf, montarPdf: montarPdf, carregarFoto: carregarFoto,
    txt: txt, sinal: sinal, semHtml: semHtml,
    itensDasAnotacoes: itensDasAnotacoes, itensDaArvore: itensDaArvore, itensDosRituais: itensDosRituais, itensDosCampos: itensDosCampos, itensDosAliados: itensDosAliados,
    _fabricaDeCanvas: null,
  };
})(typeof window !== "undefined" ? window : globalThis);
