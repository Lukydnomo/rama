/* =====================================================================
   R.A.M.A. — gif.js (v9.20.0)
   Recortar um GIF animado SEM perder a animação, no próprio navegador,
   sem biblioteca nenhuma:

     RAMAGif.recortar(bytes, retangulo, largura, altura, opcoes)
       → Promise<{ ok, bytes: Uint8Array, quadros, largura, altura }>

   1. decodifica o arquivo quadro a quadro (LZW, paletas global e local,
      entrelaçamento, transparência, descarte 0–3, tempos e repetição);
   2. compõe cada quadro como o navegador mostraria e, na mesma passada,
      recorta o retângulo escolhido e reduz para o tamanho de saída (média
      por área, alfa pré-multiplicado) — só os quadros PEQUENOS ficam na
      memória, nunca os do arquivo original;
   3. monta UMA paleta de até 255 cores para a animação inteira (corte
      pela mediana sobre um histograma de 15 bits) e reserva um índice
      para o transparente;
   4. recodifica: sem transparência na imagem, cada quadro depois do
      primeiro leva só o retângulo do que MUDOU (o resto fica
      transparente e o quadro anterior aparece por baixo) e quadros
      idênticos viram tempo a mais no anterior; com transparência, cada
      quadro vai inteiro e limpa o anterior (descarte 2).

   Tudo puro (Uint8Array de entrada e de saída): testado no terminal por
   testes/executar-gif.js. O trabalho pesado cede a vez entre quadros
   (`opcoes.ceder`), para a janela não congelar.
   ===================================================================== */

(function (global) {
  "use strict";

  /* ---------------- leitura ---------------- */

  function Leitor(bytes) { this.b = bytes; this.p = 0; }
  Leitor.prototype.u8 = function () {
    if (this.p >= this.b.length) throw new Error("GIF cortado");
    return this.b[this.p++];
  };
  Leitor.prototype.u16 = function () { var a = this.u8(); return a | (this.u8() << 8); };
  Leitor.prototype.bloco = function (n) {
    if (this.p + n > this.b.length) throw new Error("GIF cortado");
    var s = this.b.subarray(this.p, this.p + n); this.p += n; return s;
  };
  /* Sub-blocos (tamanho + dados) até o 0, juntos. */
  Leitor.prototype.subblocos = function () {
    var partes = [], total = 0;
    for (;;) {
      var n = this.u8();
      if (!n) break;
      var s = this.bloco(n);
      partes.push(s); total += n;
    }
    var out = new Uint8Array(total), o = 0;
    for (var i = 0; i < partes.length; i++) { out.set(partes[i], o); o += partes[i].length; }
    return out;
  };
  Leitor.prototype.pular = function () { for (;;) { var n = this.u8(); if (!n) return; this.p += n; } };

  function lerPaleta(L, n) {
    var p = L.bloco(n * 3);
    return new Uint8Array(p);
  }

  /* LZW do GIF (o do giflib): `total` índices; dados curtos completam com 0. */
  function lzwDecodificar(minimo, dados, total) {
    var limpar = 1 << minimo, fim = limpar + 1;
    var tam = minimo + 1, mascara = (1 << tam) - 1, prox = fim + 1;
    var prefixo = new Uint16Array(4096), sufixo = new Uint8Array(4096), pilha = new Uint8Array(4097);
    var out = new Uint8Array(total), op = 0;
    var antigo = -1, primeiro = 0, bits = 0, acum = 0, i = 0, c;
    for (c = 0; c < limpar; c++) { prefixo[c] = 0; sufixo[c] = c; }
    while (op < total) {
      while (bits < tam) {
        if (i >= dados.length) return out;
        acum |= dados[i++] << bits; bits += 8;
      }
      var codigo = acum & mascara;
      acum >>>= tam; bits -= tam;
      if (codigo === limpar) { tam = minimo + 1; mascara = (1 << tam) - 1; prox = fim + 1; antigo = -1; continue; }
      if (codigo === fim) break;
      if (antigo === -1) {
        if (codigo >= limpar) return out;   /* fluxo inválido */
        out[op++] = sufixo[codigo]; antigo = codigo; primeiro = codigo;
        continue;
      }
      var entrada = codigo, sp = 0;
      if (codigo >= prox) { pilha[sp++] = primeiro; codigo = antigo; }
      while (codigo > fim) { pilha[sp++] = sufixo[codigo]; codigo = prefixo[codigo]; }
      primeiro = sufixo[codigo];
      pilha[sp++] = primeiro;
      if (prox < 4096) {
        prefixo[prox] = antigo; sufixo[prox] = primeiro; prox++;
        if ((prox & mascara) === 0 && prox < 4096) { tam++; mascara = (1 << tam) - 1; }
      }
      antigo = entrada;
      while (sp > 0 && op < total) out[op++] = pilha[--sp];
    }
    return out;
  }

  function desentrelacar(ind, w, h) {
    var out = new Uint8Array(ind.length), linha = 0;
    var passos = [[0, 8], [4, 8], [2, 4], [1, 2]];
    for (var p = 0; p < 4; p++) {
      for (var y = passos[p][0]; y < h; y += passos[p][1]) {
        out.set(ind.subarray(linha * w, linha * w + w), y * w);
        linha++;
      }
    }
    return out;
  }

  /* Percorre o GIF chamando aoQuadro(rgba, atraso) com cada quadro já
     COMPOSTO (como o navegador o mostra). O mesmo buffer é reaproveitado:
     quem recebe copia o que precisar. */
  async function percorrer(bytes, aoQuadro, ceder) {
    var L = new Leitor(bytes);
    var sig = String.fromCharCode.apply(null, L.bloco(6));
    if (sig !== "GIF87a" && sig !== "GIF89a") throw new Error("não é GIF");
    var W = L.u16(), H = L.u16();
    var emp = L.u8(); L.u8(); L.u8();
    if (!W || !H) throw new Error("GIF vazio");
    var paletaGlobal = emp & 0x80 ? lerPaleta(L, 1 << ((emp & 7) + 1)) : null;
    var tela = new Uint8ClampedArray(W * H * 4);
    var guardada = null;
    var gce = { descarte: 0, atraso: 0, transparente: -1 };
    var repeticoes = 1, quadros = 0;
    for (;;) {
      var b = L.p < bytes.length ? L.u8() : 0x3B;
      if (b === 0x3B) break;
      if (b === 0x21) {
        var rotulo = L.u8();
        if (rotulo === 0xF9) {
          var n = L.u8(); var g = L.bloco(n);
          gce = { descarte: (g[0] >> 2) & 7, atraso: g[1] | (g[2] << 8), transparente: g[0] & 1 ? g[3] : -1 };
          L.pular();
        } else if (rotulo === 0xFF) {
          var tamApp = L.u8(); var app = String.fromCharCode.apply(null, L.bloco(tamApp));
          var dadosApp = L.subblocos();
          if (/^NETSCAPE2\.0|^ANIMEXTS1\.0/.test(app) && dadosApp.length >= 3 && dadosApp[0] === 1) {
            repeticoes = dadosApp[1] | (dadosApp[2] << 8);   /* 0 = para sempre */
          }
        } else {
          L.pular();
        }
        continue;
      }
      if (b !== 0x2C) break;   /* lixo depois do fim: para aqui, sem erro */
      var x = L.u16(), y = L.u16(), w = L.u16(), h = L.u16(), ep = L.u8();
      var paleta = ep & 0x80 ? lerPaleta(L, 1 << ((ep & 7) + 1)) : paletaGlobal;
      var minimo = L.u8();
      var dados = L.subblocos();
      if (!paleta || minimo < 1 || minimo > 11) throw new Error("quadro sem paleta");
      var ind = lzwDecodificar(minimo, dados, w * h);
      if (ep & 0x40) ind = desentrelacar(ind, w, h);
      if (gce.descarte === 3) guardada = new Uint8ClampedArray(tela);
      var tr = gce.transparente, nPal = paleta.length / 3;
      for (var yy = 0; yy < h; yy++) {
        var ty = y + yy;
        if (ty >= H) break;
        for (var xx = 0; xx < w; xx++) {
          var tx = x + xx;
          if (tx >= W) break;
          var k = ind[yy * w + xx];
          if (k === tr || k >= nPal) continue;
          var o = (ty * W + tx) * 4;
          tela[o] = paleta[k * 3]; tela[o + 1] = paleta[k * 3 + 1]; tela[o + 2] = paleta[k * 3 + 2]; tela[o + 3] = 255;
        }
      }
      await aoQuadro(tela, gce.atraso, W, H);
      quadros++;
      if (ceder) await ceder(quadros);
      if (gce.descarte === 2) {
        for (var ly = y; ly < Math.min(H, y + h); ly++) tela.fill(0, (ly * W + x) * 4, (ly * W + Math.min(W, x + w)) * 4);
      } else if (gce.descarte === 3 && guardada) {
        tela.set(guardada);
      }
      gce = { descarte: 0, atraso: 0, transparente: -1 };
    }
    return { largura: W, altura: H, repeticoes: repeticoes, quadros: quadros };
  }

  /* ---------------- recorte e redução ---------------- */

  /* Pesos de um eixo: cada pixel de saída cobre [ini, ini + passo) da
     origem; a contribuição de cada pixel de origem é a parte coberta. */
  function pesos(inicio, tamanho, saida, limite) {
    var passo = tamanho / saida, lista = [];
    for (var o = 0; o < saida; o++) {
      var a = inicio + o * passo, b = a + passo, itens = [];
      for (var s = Math.max(0, Math.floor(a)); s < Math.min(limite, Math.ceil(b)); s++) {
        var p = Math.min(b, s + 1) - Math.max(a, s);
        if (p > 1e-6) itens.push(s, p);
      }
      if (!itens.length) itens.push(Math.min(limite - 1, Math.max(0, Math.floor(a))), 1);
      lista.push(itens);
    }
    return lista;
  }

  function reduzir(tela, W, R, ow, oh, px, py) {
    var out = new Uint8ClampedArray(ow * oh * 4);
    for (var oy = 0; oy < oh; oy++) {
      var py_ = py[oy];
      for (var ox = 0; ox < ow; ox++) {
        var px_ = px[ox];
        var r = 0, g = 0, b = 0, a = 0, peso = 0;
        for (var j = 0; j < py_.length; j += 2) {
          var lin = py_[j] * W, wy = py_[j + 1];
          for (var i = 0; i < px_.length; i += 2) {
            var w = wy * px_[i + 1], o = (lin + px_[i]) * 4, al = tela[o + 3] * w;
            r += tela[o] * al; g += tela[o + 1] * al; b += tela[o + 2] * al; a += al; peso += w;
          }
        }
        var d = (oy * ow + ox) * 4;
        if (a > 0) { out[d] = r / a; out[d + 1] = g / a; out[d + 2] = b / a; }
        out[d + 3] = peso ? a / peso : 0;
      }
    }
    return out;
  }

  /* ---------------- paleta ---------------- */

  function chave15(r, g, b) { return ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3); }

  /* Corte pela mediana sobre o histograma de 15 bits: até `max` cores. */
  function paletaDe(histograma, max, somas) {
    var cores = [];
    for (var k = 0; k < 32768; k++) if (histograma[k]) cores.push(k);
    if (!cores.length) return { paleta: [[0, 0, 0]], caixas: [] };
    function canal(c, n) { return n === 0 ? (c >> 10) & 31 : n === 1 ? (c >> 5) & 31 : c & 31; }
    function caixa(lista) {
      var min = [31, 31, 31], max_ = [0, 0, 0], peso = 0;
      for (var i = 0; i < lista.length; i++) {
        var c = lista[i];
        for (var n = 0; n < 3; n++) { var v = canal(c, n); if (v < min[n]) min[n] = v; if (v > max_[n]) max_[n] = v; }
        peso += histograma[c];
      }
      return { lista: lista, min: min, max: max_, peso: peso };
    }
    var caixas = [caixa(cores)];
    while (caixas.length < max) {
      var melhor = -1, nota = -1;
      for (var i = 0; i < caixas.length; i++) {
        var cx = caixas[i];
        if (cx.lista.length < 2) continue;
        var faixa = Math.max(cx.max[0] - cx.min[0], cx.max[1] - cx.min[1], cx.max[2] - cx.min[2]);
        var n_ = faixa * Math.sqrt(cx.peso);
        if (n_ > nota) { nota = n_; melhor = i; }
      }
      if (melhor < 0) break;
      var alvo = caixas[melhor];
      var eixo = 0, larg = -1;
      for (var e = 0; e < 3; e++) { var l = alvo.max[e] - alvo.min[e]; if (l > larg) { larg = l; eixo = e; } }
      var ordenada = alvo.lista.slice().sort(function (p, q) { return canal(p, eixo) - canal(q, eixo); });
      var metade = alvo.peso / 2, soma = 0, corte = 1;
      for (var m = 0; m < ordenada.length - 1; m++) { soma += histograma[ordenada[m]]; if (soma >= metade) { corte = m + 1; break; } corte = m + 1; }
      caixas.splice(melhor, 1, caixa(ordenada.slice(0, corte)), caixa(ordenada.slice(corte)));
    }
    var paleta = caixas.map(function (cx) {
      var r = 0, g = 0, b = 0;
      for (var i = 0; i < cx.lista.length; i++) {
        var c = cx.lista[i], w = histograma[c];
        /* A média das cores DE VERDADE que caíram na faixa (não o centro
           dela): vermelho puro continua 255, 0, 0. */
        r += somas[c * 3]; g += somas[c * 3 + 1]; b += somas[c * 3 + 2];
      }
      return [Math.round(r / cx.peso), Math.round(g / cx.peso), Math.round(b / cx.peso)];
    });
    return { paleta: paleta };
  }

  function mapeador(paleta) {
    var cache = new Int16Array(32768).fill(-1);
    return function (r, g, b) {
      var k = chave15(r, g, b);
      var v = cache[k];
      if (v >= 0) return v;
      var melhor = 0, dist = Infinity;
      for (var i = 0; i < paleta.length; i++) {
        var p = paleta[i], dr = p[0] - r, dg = p[1] - g, db = p[2] - b, d = dr * dr * 3 + dg * dg * 4 + db * db * 2;
        if (d < dist) { dist = d; melhor = i; }
      }
      cache[k] = melhor;
      return melhor;
    };
  }

  /* ---------------- escrita ---------------- */

  function Escritor() { this.b = new Uint8Array(1 << 16); this.n = 0; }
  Escritor.prototype.garantir = function (k) {
    if (this.n + k <= this.b.length) return;
    var novo = new Uint8Array(Math.max(this.b.length * 2, this.n + k));
    novo.set(this.b.subarray(0, this.n)); this.b = novo;
  };
  Escritor.prototype.u8 = function (v) { this.garantir(1); this.b[this.n++] = v & 255; };
  Escritor.prototype.u16 = function (v) { this.u8(v); this.u8(v >> 8); };
  Escritor.prototype.texto = function (s) { for (var i = 0; i < s.length; i++) this.u8(s.charCodeAt(i)); };
  Escritor.prototype.bytes = function () { return this.b.slice(0, this.n); };

  /* LZW do GIF, o par exato do decodificador acima. */
  function lzwCodificar(E, ind, minimo) {
    var limpar = 1 << minimo, fim = limpar + 1;
    var tam = minimo + 1, prox = fim + 1;
    var dic = new Map();
    var bloco = new Uint8Array(255), nb = 0, acum = 0, bits = 0;
    function byte(v) { bloco[nb++] = v; if (nb === 255) { E.u8(255); E.garantir(255); E.b.set(bloco, E.n); E.n += 255; nb = 0; } }
    function emitir(c) { acum |= c << bits; bits += tam; while (bits >= 8) { byte(acum & 255); acum >>>= 8; bits -= 8; } }
    E.u8(minimo);
    emitir(limpar);
    if (ind.length) {
      var prefixo = ind[0];
      for (var i = 1; i < ind.length; i++) {
        var k = ind[i], chave = prefixo * 256 + k, achado = dic.get(chave);
        if (achado !== undefined) { prefixo = achado; continue; }
        emitir(prefixo);
        if (prox < 4096) {
          dic.set(chave, prox++);
          if (prox - 1 === (1 << tam)) tam++;
        } else {
          emitir(limpar);
          dic = new Map(); prox = fim + 1; tam = minimo + 1;
        }
        prefixo = k;
      }
      emitir(prefixo);
    }
    emitir(fim);
    if (bits > 0) byte(acum & 255);
    if (nb) { E.u8(nb); for (var j = 0; j < nb; j++) E.u8(bloco[j]); }
    E.u8(0);
  }

  /* quadros: [{ ind: Uint8Array (largura × altura do quadro), x, y, w, h,
     atraso, descarte }] sobre a tela ow × oh. */
  function escrever(ow, oh, paleta, transparente, quadros, repeticoes) {
    var E = new Escritor();
    var cores = paleta.length + 1, bitsPal = 1;
    while ((1 << bitsPal) < cores) bitsPal++;
    E.texto("GIF89a"); E.u16(ow); E.u16(oh);
    E.u8(0x80 | ((bitsPal - 1) << 4) | (bitsPal - 1)); E.u8(transparente); E.u8(0);
    for (var i = 0; i < (1 << bitsPal); i++) {
      var p = paleta[i] || [0, 0, 0];
      E.u8(p[0]); E.u8(p[1]); E.u8(p[2]);
    }
    if (quadros.length > 1) {
      E.u8(0x21); E.u8(0xFF); E.u8(11); E.texto("NETSCAPE2.0");
      E.u8(3); E.u8(1); E.u16(repeticoes || 0); E.u8(0);
    }
    var minimo = Math.max(2, bitsPal);
    quadros.forEach(function (q) {
      E.u8(0x21); E.u8(0xF9); E.u8(4);
      E.u8(((q.descarte & 7) << 2) | 1); E.u16(q.atraso); E.u8(transparente); E.u8(0);
      E.u8(0x2C); E.u16(q.x); E.u16(q.y); E.u16(q.w); E.u16(q.h); E.u8(0);
      lzwCodificar(E, q.ind, minimo);
    });
    E.u8(0x3B);
    return E.bytes();
  }

  /* ---------------- o recorte ---------------- */

  function cederPadrao(n) {
    return n % 2 ? null : new Promise(function (r) { setTimeout(r, 0); });
  }

  async function recortar(bytes, R, ow, oh, opcoes) {
    var o = opcoes || {};
    var b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    ow = Math.max(1, Math.round(ow)); oh = Math.max(1, Math.round(oh));
    var maxQuadros = o.maxQuadros || 1000;
    var px = null, py = null, saidas = [], atrasos = [], temAlfa = false;
    var histograma = new Uint32Array(32768);
    var somas = new Float64Array(32768 * 3);
    var info = await percorrer(b, function (tela, atraso, W, H) {
      if (saidas.length >= maxQuadros) throw new Error("quadros demais");
      if (!px) {
        var rx = Math.max(0, Math.min(W - 1, R.x)), ry = Math.max(0, Math.min(H - 1, R.y));
        var rw = Math.max(1, Math.min(W - rx, R.w)), rh = Math.max(1, Math.min(H - ry, R.h));
        px = pesos(rx, rw, ow, W); py = pesos(ry, rh, oh, H);
      }
      var q = reduzir(tela, W, R, ow, oh, px, py);
      for (var i = 0; i < q.length; i += 4) {
        if (q[i + 3] < 128) { q[i + 3] = 0; temAlfa = true; continue; }
        q[i + 3] = 255;
        var ch = chave15(q[i], q[i + 1], q[i + 2]);
        histograma[ch]++;
        somas[ch * 3] += q[i]; somas[ch * 3 + 1] += q[i + 1]; somas[ch * 3 + 2] += q[i + 2];
      }
      saidas.push(q); atrasos.push(atraso);
    }, o.ceder === false ? null : (o.ceder || cederPadrao));
    if (!saidas.length) return { ok: false, erro: "vazio" };

    var pal = paletaDe(histograma, 255, somas).paleta;
    var transparente = pal.length;
    var mapa = mapeador(pal);
    var n = ow * oh;
    var indices = saidas.map(function (q) {
      var ind = new Uint8Array(n);
      for (var i = 0, j = 0; i < n; i++, j += 4) ind[i] = q[j + 3] ? mapa(q[j], q[j + 1], q[j + 2]) : transparente;
      return ind;
    });
    saidas = null;

    var quadros = [];
    if (temAlfa || indices.length === 1) {
      indices.forEach(function (ind, k) {
        quadros.push({ ind: ind, x: 0, y: 0, w: ow, h: oh, atraso: atrasos[k], descarte: temAlfa && indices.length > 1 ? 2 : 0 });
      });
    } else {
      quadros.push({ ind: indices[0], x: 0, y: 0, w: ow, h: oh, atraso: atrasos[0], descarte: 1 });
      var anterior = indices[0];
      for (var k = 1; k < indices.length; k++) {
        var atual = indices[k];
        var x0 = ow, y0 = oh, x1 = -1, y1 = -1;
        for (var y = 0; y < oh; y++) {
          for (var x = 0; x < ow; x++) {
            var p = y * ow + x;
            if (atual[p] !== anterior[p]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
          }
        }
        if (x1 < 0) { quadros[quadros.length - 1].atraso += atrasos[k]; continue; }
        var w = x1 - x0 + 1, h = y1 - y0 + 1, parte = new Uint8Array(w * h);
        for (var yy = 0; yy < h; yy++) {
          for (var xx = 0; xx < w; xx++) {
            var pp = (y0 + yy) * ow + x0 + xx;
            parte[yy * w + xx] = atual[pp] === anterior[pp] ? transparente : atual[pp];
          }
        }
        quadros.push({ ind: parte, x: x0, y: y0, w: w, h: h, atraso: atrasos[k], descarte: 1 });
        anterior = atual;
      }
    }
    var saida = escrever(ow, oh, pal, transparente, quadros, info.repeticoes);
    return { ok: true, bytes: saida, quadros: quadros.length, quadrosOriginais: info.quadros, largura: ow, altura: oh, transparente: temAlfa };
  }

  /* Só lê: largura, altura, quadros e repetição (testes e prévia). */
  async function examinar(bytes) {
    var b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    var tempos = [];
    var info = await percorrer(b, function (tela, atraso) { tempos.push(atraso); }, null);
    info.atrasos = tempos;
    return info;
  }

  /* Os quadros compostos inteiros (só para testes: memória é W × H × N). */
  async function quadrosDe(bytes) {
    var lista = [];
    var info = await percorrer(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), function (tela, atraso) {
      lista.push({ rgba: new Uint8ClampedArray(tela), atraso: atraso });
    }, null);
    info.lista = lista;
    return info;
  }

  function paraDataUrl(bytes) {
    var s = "";
    for (var i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return "data:image/gif;base64," + (typeof btoa === "function" ? btoa(s) : global.Buffer.from(s, "binary").toString("base64"));
  }

  global.RAMAGif = {
    recortar: recortar,
    examinar: examinar,
    quadrosDe: quadrosDe,
    paraDataUrl: paraDataUrl,
    /* para os testes */
    _lzwCodificar: lzwCodificar,
    _lzwDecodificar: lzwDecodificar,
    _escrever: escrever,
    _Escritor: Escritor,
  };
})(typeof window !== "undefined" ? window : globalThis);
