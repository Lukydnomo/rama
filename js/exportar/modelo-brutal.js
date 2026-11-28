/* =====================================================================
   R.A.M.A. — exportação: BRUTAL (Corte Rápido)
   ---------------------------------------------------------------------
   Vertical, título vermelho de pincel, marca d'água vermelha suave e
   caixas pretas de traço irregular. Nome, Arquétipo, pronomes e quem
   interpreta; a linha dos cinco Estilos do Corte Rápido (os dois do
   Arquétipo marcados); Habilidade, Pilha de Dados, Pontos de Tensão e
   Iniciativa; os Apegos (Item Icônico, Relação Afetiva, Desejo Obscuro);
   Dados de Fuga, Sequelas e o Dado Marcado nas seis faces de um d6.
   O estado de jogo (pilha, PT, fuga, marcadores) é o do Thriller de
   treino guardado na ficha, quando há; numa campanha ele mora na mesa
   da Diretora, e aqui ficam os limites para preencher à mão.
   ===================================================================== */

(function (global) {
  "use strict";

  var X = global.RAMAExportar;
  var txt = X.txt;
  var PRETO = "#141414", VERMELHO = "#c0182c", ROSA = "rgba(205, 30, 50, 0.10)", SUAVE = "#666";
  var M = 22;

  function tentar(fn, padrao) { try { var v = fn(); return v === undefined ? padrao : v; } catch (e) { return padrao; } }

  function dadosBrutal(ficha) {
    var B = global.RAMABrutal, K = global.RAMABrutalCatalogo, MS = global.RAMABrutalMesa;
    var b = tentar(function () { return B.normalizar(ficha.brutal); }, ficha.brutal || {});
    var a = tentar(function () { return B.arquetipo(b); }, null);
    var vm = { nome: ficha.nome, pronomes: b.pronomes, interprete: b.interprete };
    vm.arquetipo = a ? a.nome + (a.adjetivos ? " — " + a.adjetivos : "") : "";
    vm.iniciativa = a ? a.iniciativa : "";
    var meus = a ? a.estilos : [];
    var s = null;
    if (b.treino && b.treino.sobreviventes) {
      var ids = Object.keys(b.treino.sobreviventes);
      s = b.treino.sobreviventes[ids[0]] || null;
    }
    vm.temTreino = !!s;
    var incap = s ? s.incapacitados || [] : [];
    vm.estilos = (K.ORDEM_ESTILOS || Object.keys(K.ESTILOS || {})).map(function (k) {
      var e = K.ESTILOS[k] || { nome: k };
      return { nome: e.nome, texto: e.texto, meu: meus.indexOf(k) >= 0, incapacitado: incap.indexOf(k) >= 0 };
    });
    vm.habilidade = a && a.habilidade ? { titulo: a.habilidade.nome, meta: [a.habilidade.cena, a.habilidade.recarga && K.RECARGAS[a.habilidade.recarga] ? "Recarga: " + K.RECARGAS[a.habilidade.recarga].nome : ""].filter(Boolean).join(" · "), texto: a.habilidade.texto } : null;
    vm.limites = K.LIMITES || { pilha: 6, pt: 10 };
    vm.pilha = s ? s.pilha : null;
    vm.pt = s ? s.pt : null;
    vm.fuga = s ? s.fuga : null;
    vm.ferida = s ? s.ferida : null;
    vm.sequelas = s ? s.sequelas : null;
    vm.marcadores = s ? s.marcadores || [] : [];
    vm.recursos = s ? (s.recursos || []).map(function (r) { return { titulo: r.nome, direita: r.usos + " uso(s)" }; }) : [];
    vm.situacao = s && s.situacao !== "viva" ? s.situacao : "";
    var ap = b.apegos || {};
    vm.item = ap.item || {};
    vm.relacao = ap.relacao || {};
    vm.desejo = ap.desejo || {};
    vm.detalhes = b.detalhes || {};
    vm.anotacoes = X.itensDasAnotacoes(ficha);
    vm.aliados = X.itensDosAliados(ficha);
    void MS;
    return vm;
  }

  function tituloPincel(P, s, x, y, tam, r) {
    for (var i = 0; i < 4; i++) {
      P.ctx.save();
      P.ctx.globalAlpha = i ? 0.35 : 1;
      P.texto(s, x + (r() - 0.5) * 2.4, y + (r() - 0.5) * 2.4, { fam: "pesada", tam: tam, cor: VERMELHO, alinhar: "center", espacamento: 2 });
      P.ctx.restore();
    }
    for (var k = 0; k < 40; k++) {
      var w = P.medir(s, { fam: "pesada", tam: tam }) + s.length * 2;
      P.circulo(x - w / 2 + r() * w, y - tam * 0.9 + r() * tam * 1.1, r() * 1.4 + 0.3, { fundo: VERMELHO, borda: false });
    }
  }

  /* Marca d'água: três rasgos de pincel, em rosa. */
  function marcaDagua(P, W, H, r) {
    var c = P.ctx;
    c.save();
    c.strokeStyle = ROSA; c.lineCap = "round";
    for (var i = 0; i < 3; i++) {
      var x0 = W * 0.28 + i * 70, y0 = H * 0.22;
      for (var p = 0; p < 6; p++) {
        c.lineWidth = 34 - p * 4 + r() * 4;
        c.beginPath();
        c.moveTo(x0 + (r() - 0.5) * 6, y0 + (r() - 0.5) * 6);
        c.quadraticCurveTo(x0 + 40 + (r() - 0.5) * 10, H * 0.48, x0 + 10 + (r() - 0.5) * 8, H * 0.78);
        c.stroke();
      }
    }
    c.restore();
  }

  var ESTILO = { fam: "sans", famTitulo: "pesada", tamTitulo: 9, pesoTitulo: "normal", tamTexto: 7.8, tamMeta: 6.8, cor: PRETO, corMeta: SUAVE };

  function caixa(P, r, x, y, w, h, titulo, op) {
    var o = op || {};
    P.rabisco(x, y, w, h, { sorteio: r, linha: 2.4, borda: PRETO, fundo: o.fundo || "rgba(255,255,255,0.55)" });
    if (titulo) {
      P.texto(titulo, o.centro ? x + w / 2 : x + 7, y + (o.tam || 11) + 3, { fam: "pesada", tam: o.tam || 11, cor: PRETO, alinhar: o.centro ? "center" : "left", max: w - 12 });
      if (o.sub) P.texto(o.sub, x + w / 2, y + (o.tam || 11) + 12, { fam: "pesada", tam: 6.5, cor: "#999", alinhar: "center" });
      if (o.linha !== false) P.linha(x + 3, y + (o.tam || 11) + 8 + (o.sub ? 9 : 0), x + w - 3, y + (o.tam || 11) + 8 + (o.sub ? 9 : 0), { cor: PRETO, linha: 1.6 });
    }
    return y + (titulo ? (o.tam || 11) + 12 + (o.sub ? 9 : 0) : 6);
  }

  /* Um d6 desenhado com os pontos da face. */
  function d6(P, x, y, l, face, marcado) {
    P.retangulo(x, y, l, l, { raio: l * 0.18, fundo: marcado ? VERMELHO : "#fff", borda: PRETO, linha: 1.6 });
    var pos = { 1: [[0.5, 0.5]], 2: [[0.28, 0.28], [0.72, 0.72]], 3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]], 4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]], 5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]], 6: [[0.28, 0.22], [0.72, 0.22], [0.28, 0.5], [0.72, 0.5], [0.28, 0.78], [0.72, 0.78]] };
    (pos[face] || []).forEach(function (p) { P.circulo(x + p[0] * l, y + p[1] * l, l * 0.08, { fundo: marcado ? "#fff" : PRETO, borda: false }); });
  }

  function desenharBrutal(doc, ficha, ctx) {
    var vm = dadosBrutal(ficha);
    var pg = doc.pagina("retrato"), P = pg.P, W = pg.largura, H = pg.altura;
    var r = X.semente("brutal" + vm.nome);
    marcaDagua(P, W, H, r);
    tituloPincel(P, "BRUTAL", W / 2, 78, 64, r);
    P.texto("CORTE RÁPIDO · FICHA DE SOBREVIVENTE", W / 2, 92, { fam: "pesada", tam: 7.5, cor: PRETO, alinhar: "center", espacamento: 1.5 });

    /* identificação */
    var y = 104;
    caixa(P, r, M, y, 330, 24, "");
    P.texto("NOME:", M + 7, y + 15, { fam: "pesada", tam: 9.5, cor: PRETO });
    P.texto(vm.nome || "", M + 46, y + 16, { fam: "sans", tam: 11, peso: "bold", cor: PRETO, max: 275 });
    caixa(P, r, M, y + 24, 330, 24, "");
    P.texto("ARQUÉTIPO:", M + 7, y + 39, { fam: "pesada", tam: 9.5, cor: PRETO });
    P.texto(vm.arquetipo, M + 72, y + 40, { fam: "sans", tam: 9.5, peso: "bold", cor: PRETO, max: 250 });
    caixa(P, r, M + 340, y, 70, 48, "PRONOMES", { centro: true, tam: 8 });
    P.texto(vm.pronomes || "", M + 375, y + 36, { fam: "sans", tam: 9, cor: PRETO, alinhar: "center", max: 62 });
    caixa(P, r, M + 418, y, W - 2 * M - 418, 48, "JOGADOR(A)", { centro: true, tam: 8 });
    P.texto(vm.interprete || "", M + 418 + (W - 2 * M - 418) / 2, y + 36, { fam: "sans", tam: 9, cor: PRETO, alinhar: "center", max: W - 2 * M - 428 });
    y += 60;

    /* estilos */
    var ew = 82, eg = 12, ex0 = (W - (5 * ew + 4 * eg)) / 2;
    vm.estilos.forEach(function (e, i) {
      var x = ex0 + i * (ew + eg);
      caixa(P, r, x, y, ew, 48, e.nome.toUpperCase(), { centro: true, tam: 8.5 });
      if (e.meu) {
        P.texto("✕", x + ew / 2, y + 40, { fam: "pesada", tam: 18, cor: VERMELHO, alinhar: "center" });
      }
      if (e.incapacitado) P.texto("INCAPACITADO", x + ew / 2, y + 45, { fam: "pesada", tam: 5.5, cor: PRETO, alinhar: "center" });
    });
    y += 60;

    /* habilidades (esquerda) e pilhas (direita) */
    var lw = 268, rx = M + lw + 16, rw = W - M - rx;
    var hy = caixa(P, r, M, y, lw, 196, "HABILIDADES:", { centro: true, tam: 13 });
    var habs = [vm.habilidade].filter(Boolean).concat(vm.estilos.filter(function (e) { return e.meu; }).map(function (e) { return { titulo: "Estilo " + e.nome, texto: e.texto }; }));
    var rh = X.encaixar(P, habs, { x: M + 8, y: hy, w: lw - 16, h: y + 196 - hy - 6 }, ESTILO);

    var py = caixa(P, r, rx, y, rw, 62, "PILHA DE DADOS:", { centro: true, tam: 10, sub: "(LIMITE " + vm.limites.pilha + ")", linha: false });
    for (var i = 0; i < vm.limites.pilha; i++) d6(P, rx + 14 + i * 24, py + 2, 18, 6, false), (vm.pilha !== null && i >= vm.pilha) && P.linha(rx + 12 + i * 24, py + 22, rx + 34 + i * 24, py, { cor: VERMELHO, linha: 1.6 });
    var ty = caixa(P, r, rx, y + 62, rw, 62, "PONTOS DE TENSÃO:", { centro: true, tam: 10, sub: "(LIMITE " + vm.limites.pt + ")", linha: false });
    var marcas = []; for (var t = 0; t < vm.limites.pt; t++) marcas.push(vm.pt !== null && t < vm.pt ? "cheia" : "");
    P.caixinhas(rx + 14, ty + 4, marcas, { lado: 12, passo: 15.5, cor: PRETO });
    caixa(P, r, rx, y + 124, rw, 72, "INICIATIVA:", { centro: true, tam: 10, linha: false });
    P.texto(txt(vm.iniciativa), rx + rw / 2, y + 176, { fam: "pesada", tam: 26, cor: PRETO, alinhar: "center" });
    P.texto("ordem do Arquétipo (o Assassino age por último)", rx + rw / 2, y + 190, { fam: "sans", tam: 5.8, cor: SUAVE, alinhar: "center" });
    y += 208;

    /* inventário (esquerda) e apegos (direita) */
    var iy = caixa(P, r, M, y, lw, 150, "INVENTÁRIO:", { centro: true, tam: 13 });
    var ri = X.encaixar(P, vm.recursos.length ? vm.recursos : [], { x: M + 8, y: iy, w: lw - 16, h: y + 150 - iy - 6 }, ESTILO);
    if (!vm.recursos.length) P.texto(vm.temTreino ? "Sem recursos no Thriller de treino." : "Recursos do Thriller ficam na mesa da Diretora.", M + lw / 2, iy + 16, { fam: "sans", tam: 6.8, italico: true, cor: SUAVE, alinhar: "center" });
    var aw = rw - 36;
    var apegos = [
      ["ITENS ICÔNICOS:", vm.item.nome ? { titulo: vm.item.nome, texto: vm.item.texto } : null],
      ["RELAÇÕES AFETIVAS:", vm.relacao.nome ? { titulo: vm.relacao.nome, texto: vm.relacao.texto } : null],
      ["DESEJOS OBSCUROS:", vm.desejo.texto ? { titulo: vm.desejo.revelado ? "Revelado" : "Não revelado (segredo)", texto: vm.desejo.texto } : null],
    ];
    var sobraApegos = [];
    var ah = 130 / 3 + 10;
    P.rabisco(rx, y - 2, aw, ah * 3 + 4, { sorteio: r, linha: 2.4, borda: PRETO, fundo: "rgba(255,255,255,0.55)" });
    apegos.forEach(function (ap, k) {
      var by = y - 2 + k * ah;
      if (k) P.linha(rx + 2, by, rx + aw - 2, by, { cor: PRETO, linha: 2 });
      P.texto(ap[0], rx + 6, by + 14, { fam: "pesada", tam: 11, cor: PRETO });
      if (ap[1]) {
        var ra = X.encaixar(P, [ap[1]], { x: rx + 6, y: by + 18, w: aw - 12, h: ah - 20 }, Object.assign({}, ESTILO, { tamTitulo: 7.8, tamTexto: 6.9 }));
        if (ra.sobra.length) sobraApegos.push({ titulo: ap[0].replace(":", "") + " (continuação)", itens: ra.sobra });
      }
    });
    P.ctx.save();
    P.ctx.translate(rx + aw + 26, y + 70);
    P.ctx.rotate(Math.PI / 2);
    P.texto("APEGOS:", 0, 0, { fam: "pesada", tam: 26, cor: PRETO, alinhar: "center", base: "middle", espacamento: 2 });
    P.ctx.restore();
    y += 162;

    /* fuga e sequelas (esquerda), dado marcado (direita) */
    var bh = H - 30 - y;
    caixa(P, r, M, y, lw, bh / 2, "DADOS DE FUGA:", { centro: true, tam: 13 });
    if (vm.fuga !== null) for (var f = 0; f < vm.fuga; f++) d6(P, M + 16 + f * 24, y + 32, 18, 6, false);
    else P.texto("—", M + lw / 2, y + 44, { fam: "pesada", tam: 12, cor: SUAVE, alinhar: "center" });
    caixa(P, r, M, y + bh / 2, lw, bh / 2, "SEQUELAS:", { centro: true, tam: 13 });
    P.texto(vm.sequelas !== null ? vm.sequelas + (vm.ferida ? " · Ferida " + vm.ferida : "") + (vm.situacao ? " · " + vm.situacao : "") : "", M + lw / 2, y + bh / 2 + 44, { fam: "pesada", tam: 13, cor: PRETO, alinhar: "center" });
    var my = caixa(P, r, rx, y + 8, rw, bh - 8, "DADO MARCADO:", { centro: true, tam: 13 });
    var marcadas = {};
    vm.marcadores.forEach(function (m) { marcadas[m.valor] = (marcadas[m.valor] || []).concat(m.nome); });
    for (var face = 1; face <= 6; face++) {
      var dx = rx + 22 + ((face - 1) % 3) * ((rw - 44) / 3), dy = my + 6 + Math.floor((face - 1) / 3) * ((bh - 60) / 2);
      var l = Math.min(36, (bh - 70) / 2.2);
      d6(P, dx + 6, dy, l, face, !!marcadas[face]);
      P.texto(String(face), dx, dy + 10, { fam: "pesada", tam: 9, cor: PRETO });
    }

    var secoes = sobraApegos.concat([
      rh.sobra.length ? { titulo: "Habilidades (continuação)", itens: rh.sobra } : null,
      ri.sobra.length ? { titulo: "Inventário (continuação)", itens: ri.sobra } : null,
      { titulo: "Marcadores", itens: vm.marcadores.map(function (m) { return { titulo: m.nome, direita: "face " + m.valor, meta: m.tipo }; }) },
      { titulo: "Aparência", itens: vm.detalhes.aparencia ? [{ texto: vm.detalhes.aparencia }] : [] },
      { titulo: "História", itens: vm.detalhes.historia ? [{ texto: vm.detalhes.historia }] : [] },
      { titulo: "Notas", itens: vm.detalhes.notas ? [{ texto: vm.detalhes.notas }] : [] },
      { titulo: "Anotações", itens: vm.anotacoes },
      { titulo: "Aliados", itens: vm.aliados },
    ]);
    X.fluir(doc, secoes, {
      caixas: [],
      novaPagina: function (d) {
        var p = d.pagina("retrato"), Q = p.P, rr = X.semente("brutal" + p.n);
        marcaDagua(Q, p.largura, p.altura, rr);
        tituloPincel(Q, "BRUTAL", 110, 54, 34, rr);
        Q.texto((vm.nome || "") + " · continuação · página " + p.n, p.largura - M, 48, { fam: "pesada", tam: 9, cor: PRETO, alinhar: "right", max: 300 });
        Q.rabisco(M, 66, p.largura - 2 * M, p.altura - 96, { sorteio: rr, linha: 2.4, borda: PRETO });
        return [{ x: M + 12, y: 76, w: p.largura - 2 * M - 24, h: p.altura - 116 }];
      },
      cabecalho: function (Q, s, rect, cont) {
        Q.texto((s.titulo + (cont ? " (cont.)" : "")).toUpperCase() + ":", rect.x, rect.y + 13, { fam: "pesada", tam: 13, cor: PRETO });
        Q.linha(rect.x, rect.y + 17, rect.x + rect.w, rect.y + 17, { cor: PRETO, linha: 1.6 });
        return 23;
      },
      estilo: ESTILO, alturaCabecalho: 23, entreSecoes: 10,
    });
  }

  X.registrar("brutal", { orientacao: "retrato", desenhar: desenharBrutal, dados: dadosBrutal });
})(typeof window !== "undefined" ? window : globalThis);
