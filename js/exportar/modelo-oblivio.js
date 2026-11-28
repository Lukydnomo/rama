/* =====================================================================
   R.A.M.A. — exportação: Oblívio
   ---------------------------------------------------------------------
   Horizontal, moldura ornamental fina, três áreas. À esquerda, os
   Conhecimentos (marcados os especializados) e os estados de Fora de
   Ação. No centro, o nome, o retrato e a silhueta do corpo com atual e
   máximo de cada região, e embaixo os círculos de Carne, Força, Fuga,
   Determinação, Mente, Fôlego, Dano, Coragem, Proteção e Velocidade.
   À direita, Motivação, Papel, Habilidade Principal, Únicas e Gerais.
   Inventário, Mazelas e Fardos continuam na página seguinte. Valores
   de RAMAOblivio.calcular().
   ===================================================================== */

(function (global) {
  "use strict";

  var X = global.RAMAExportar;
  var txt = X.txt;
  var TINTA = "#151515", SUAVE = "#6a6a6a", FINO = "#2b2b2b";
  var ESCRITA = "'Palatino Linotype', 'Book Antiqua', Georgia, serif";

  function tentar(fn, padrao) { try { var v = fn(); return v === undefined ? padrao : v; } catch (e) { return padrao; } }

  function dadosOblivio(ficha) {
    var R = global.RAMAOblivio, C = global.RAMAOblivioCatalogo;
    var o = tentar(function () { return R.normalizar(ficha.oblivio); }, ficha.oblivio || {});
    var c = tentar(function () { return R.calcular(o, {}); }, null) || {};
    var vm = { nome: ficha.nome };
    var esp = {};
    (o.especializacoes || []).forEach(function (s) { esp[s.conhecimento] = s; });
    var bonus = tentar(function () { return o.ajustes.bonusEspecializacao; }, 2);
    vm.conhecimentos = (C.CONHECIMENTOS || []).slice().sort(function (a, b) { return a.nome.localeCompare(b.nome, "pt"); }).map(function (k) {
      return { nome: k.nome, resumo: k.resumo, marcado: !!esp[k.chave], bonus: esp[k.chave] ? bonus : 0 };
    });
    vm.foraDeAcao = c.foraDeAcaoNaMissao || 0;
    vm.foraAtivo = !!(o.foraDeAcao && o.foraDeAcao.ativo);
    vm.regioes = {};
    (c.regioes || []).forEach(function (r) { vm.regioes[r.chave] = { atual: r.estado === "ausente" ? 0 : r.restante, max: r.limite, estado: r.estado, estresse: r.estresse }; });
    var at = c.atributos || o.atributos || {};
    var mu = c.mutaveis || {};
    vm.circulos = [
      ["Carne", at.carne], ["Força", at.forca], ["Fuga", at.fuga], ["Determinação", at.determinacao], ["Mente", at.mente],
      ["Fôlego", tentar(function () { return mu.folego.total; }, "")], ["Dano", tentar(function () { return mu.dano.total; }, "")],
      ["Coragem", tentar(function () { return mu.coragem.total; }, o.coragem)], ["Proteção", tentar(function () { return mu.protecao.total; }, "")],
      ["Velocidade", tentar(function () { return mu.velocidade.total; }, "")],
    ];
    var papel = tentar(function () { return C.papel[o.papel]; }, null);
    vm.papel = papel ? papel.nome : "";
    vm.papelResumo = papel ? papel.resumo : "";
    var mot = tentar(function () { return C.motivacao[o.motivacao.chave]; }, null);
    vm.motivacao = [mot ? mot.nome : "", o.motivacao && o.motivacao.texto, o.motivacao && o.motivacao.abandonada ? "(abandonada)" : ""].filter(Boolean).join(" — ");
    var habs = (o.habilidades || []).map(function (h) { var d = C.habilidade[h.chave] || { nome: h.chave }; return { tipo: d.tipo, item: { titulo: d.nome, meta: [d.acao ? "ação " + d.acao : "", d.pag ? "p. " + d.pag : ""].filter(Boolean).join(" · "), texto: d.resumo || "" } }; });
    vm.principal = habs.filter(function (h) { return h.tipo === "principal"; }).map(function (h) { return h.item; });
    vm.unicas = habs.filter(function (h) { return h.tipo === "unica"; }).map(function (h) { return h.item; });
    vm.gerais = habs.filter(function (h) { return h.tipo !== "principal" && h.tipo !== "unica"; }).map(function (h) { return h.item; });
    var nomeRegiao = {};
    (C.REGIOES || []).forEach(function (r) { nomeRegiao[r.chave] = r.nome; });
    vm.inventario = tentar(function () { return o.inventario.itens; }, []).map(function (i) {
      return { titulo: i.nome + (i.qtd > 1 ? " ×" + i.qtd : ""), meta: [i.estado, i.regiao ? nomeRegiao[i.regiao] : "", i.usos !== null && i.usos !== undefined ? i.usos + " uso(s)" : "", i.estresse ? "estresse " + i.estresse : "", (i.modificacoes || []).length ? (i.modificacoes.length + " modificação(ões)") : ""].filter(Boolean).join(" · "), texto: i.nota };
    });
    vm.moedas = tentar(function () { return o.inventario.moedas; }, 0);
    vm.espacos = tentar(function () { return c.espacos.usados + " / " + c.espacos.total; }, "");
    vm.mazelas = (o.mazelas || []).map(function (m) { var d = C.mazela[m.chave] || { nome: m.chave }; return { titulo: d.nome, texto: d.resumo || d.texto || "" }; });
    vm.fardos = (o.fardos || []).map(function (f) { var d = C.fardo[f.chave] || { nome: f.chave }; return { titulo: d.nome, texto: d.resumo || d.texto || "" }; });
    vm.regioesEstado = (c.regioes || []).filter(function (r) { return r.estado !== "organica"; }).map(function (r) { return { titulo: r.nome, meta: r.estado === "protese" ? "prótese" : "ausente" }; });
    vm.anotacoes = X.itensDasAnotacoes(ficha);
    vm.aliados = X.itensDosAliados(ficha);
    return vm;
  }

  function cabecalho(P, s, x, y, tam) {
    P.texto(s, x, y, { fam: ESCRITA, tam: tam || 13, peso: "bold", italico: true, cor: TINTA });
  }

  /* Moldura fina com volutas nos cantos e no meio de cada lado. */
  function moldura(pg) {
    var P = pg.P, W = pg.largura, H = pg.altura, c = P.ctx;
    P.retangulo(18, 18, W - 36, H - 36, { borda: FINO, linha: 0.8 });
    P.retangulo(22, 22, W - 44, H - 44, { borda: FINO, linha: 0.3 });
    function voluta(x, y, sx, sy) {
      c.beginPath();
      c.moveTo(x, y + sy * 26);
      c.bezierCurveTo(x, y + sy * 8, x + sx * 8, y, x + sx * 26, y);
      c.moveTo(x + sx * 6, y + sy * 18);
      c.bezierCurveTo(x + sx * 6, y + sy * 8, x + sx * 10, y + sy * 6, x + sx * 18, y + sy * 6);
      c.strokeStyle = FINO; c.lineWidth = 0.9; c.stroke();
      P.circulo(x + sx * 12, y + sy * 12, 2.2, { borda: FINO, linha: 0.7 });
    }
    voluta(12, 12, 1, 1); voluta(W - 12, 12, -1, 1); voluta(12, H - 12, 1, -1); voluta(W - 12, H - 12, -1, -1);
  }

  var ESTILO = { fam: "sans", famTitulo: ESCRITA, tamTitulo: 8.8, tamTexto: 7.2, tamMeta: 6.3, cor: TINTA, corMeta: SUAVE };

  function caixaRegiao(P, x, y, w, nome, r) {
    P.retangulo(x, y, w, 30, { fundo: "#fff", borda: FINO, linha: 0.8 });
    P.linha(x + w / 2, y, x + w / 2, y + 22, { cor: FINO, linha: 0.5 });
    P.linha(x, y + 22, x + w, y + 22, { cor: FINO, linha: 0.5 });
    P.texto("ATUAL", x + w / 4, y + 6.5, { fam: "sans", tam: 4.6, peso: "bold", cor: SUAVE, alinhar: "center" });
    P.texto("MÁXIMO", x + 3 * w / 4, y + 6.5, { fam: "sans", tam: 4.6, peso: "bold", cor: SUAVE, alinhar: "center" });
    if (r) {
      P.texto(r.estado === "ausente" ? "—" : String(r.atual), x + w / 4, y + 18, { fam: ESCRITA, tam: 11, peso: "bold", cor: TINTA, alinhar: "center" });
      P.texto(String(r.max), x + 3 * w / 4, y + 18, { fam: ESCRITA, tam: 11, peso: "bold", cor: TINTA, alinhar: "center" });
    }
    P.texto(nome.toUpperCase() + (r && r.estado === "protese" ? " (PRÓTESE)" : (r && r.estado === "ausente" ? " (AUSENTE)" : "")), x + w / 2, y + 28, { fam: "sans", tam: 4.8, peso: "bold", cor: TINTA, alinhar: "center", max: w - 4 });
  }

  function silhueta(P, cx, top, esc) {
    var k = esc || 1, c = P.ctx;
    c.save();
    c.fillStyle = TINTA;
    c.beginPath(); c.ellipse(cx, top + 14 * k, 10 * k, 13 * k, 0, 0, Math.PI * 2); c.fill();
    P.retangulo(cx - 5 * k, top + 25 * k, 10 * k, 8 * k, { fundo: TINTA, borda: false });
    P.poligono([[cx - 24 * k, top + 34 * k], [cx + 24 * k, top + 34 * k], [cx + 18 * k, top + 96 * k], [cx - 18 * k, top + 96 * k]], { fundo: TINTA });
    P.poligono([[cx - 24 * k, top + 34 * k], [cx - 32 * k, top + 36 * k], [cx - 40 * k, top + 104 * k], [cx - 32 * k, top + 106 * k], [cx - 22 * k, top + 50 * k]], { fundo: TINTA });
    P.poligono([[cx + 24 * k, top + 34 * k], [cx + 32 * k, top + 36 * k], [cx + 40 * k, top + 104 * k], [cx + 32 * k, top + 106 * k], [cx + 22 * k, top + 50 * k]], { fundo: TINTA });
    P.poligono([[cx - 18 * k, top + 94 * k], [cx - 1 * k, top + 94 * k], [cx - 4 * k, top + 170 * k], [cx - 16 * k, top + 170 * k]], { fundo: TINTA });
    P.poligono([[cx + 1 * k, top + 94 * k], [cx + 18 * k, top + 94 * k], [cx + 16 * k, top + 170 * k], [cx + 4 * k, top + 170 * k]], { fundo: TINTA });
    c.restore();
  }

  function circulo(P, cx, cy, r, nome, valor) {
    P.circulo(cx, cy, r, { borda: FINO, linha: 0.9, fundo: "#fff" });
    P.linha(cx - r, cy, cx + r, cy, { cor: "#bbb", linha: 0.3 });
    P.texto(txt(valor), cx, cy + 4, { fam: ESCRITA, tam: r * 0.7, peso: "bold", cor: TINTA, alinhar: "center" });
    /* o nome em arco por cima do círculo */
    var c = P.ctx, s = nome.toUpperCase();
    c.save();
    P.fonte({ fam: "sans", tam: 5.2, peso: "bold" });
    var total = c.measureText(s).width + s.length * 0.4;
    var ang = -Math.PI / 2 - total / (2 * (r + 4));
    s.split("").forEach(function (ch) {
      var w = c.measureText(ch).width + 0.4;
      var a = ang + w / (2 * (r + 4));
      c.save();
      c.translate(cx + (r + 4) * Math.cos(a), cy + (r + 4) * Math.sin(a));
      c.rotate(a + Math.PI / 2);
      c.fillStyle = TINTA; c.textAlign = "center"; c.textBaseline = "alphabetic";
      c.fillText(ch, 0, 0);
      c.restore();
      ang += w / (r + 4);
    });
    c.restore();
  }

  function desenharOblivio(doc, ficha, ctx) {
    var vm = dadosOblivio(ficha);
    var pg = doc.pagina("paisagem"), P = pg.P, W = pg.largura, H = pg.altura;
    moldura(pg);
    var sobras = [];

    /* esquerda: conhecimentos e fora de ação */
    var lx = 34, lw = 214, y = 50;
    cabecalho(P, "Conhecimentos", lx, y, 14);
    y += 8;
    vm.conhecimentos.forEach(function (k) {
      P.retangulo(lx, y + 3, 8, 8, { borda: FINO, linha: 0.7 });
      if (k.marcado) { P.linha(lx + 1.5, y + 7, lx + 3.5, y + 10, { cor: TINTA, linha: 1.2 }); P.linha(lx + 3.5, y + 10, lx + 7, y + 4, { cor: TINTA, linha: 1.2 }); }
      P.texto(k.nome + (k.bonus ? "  +" + k.bonus : ""), lx + 13, y + 9, { fam: ESCRITA, tam: 8.6, peso: "bold", cor: TINTA });
      var ls = P.quebrar(k.resumo, lw - 14, { fam: "sans", tam: 5.8 });
      ls.slice(0, 2).forEach(function (l, i) { P.texto(l.t, lx + 13, y + 16 + i * 6.8, { fam: "sans", tam: 5.8, cor: SUAVE }); });
      y += 18 + Math.min(2, ls.length) * 6.8 - 6;
    });
    y += 10;
    cabecalho(P, "Fora de Ação", lx, y, 13);
    y += 6;
    [["Primeira Vez", "Mazelas No Chão e Sem Reação; sai no fim da próxima rodada e recupera metade do limite de Estresse."], ["Segunda Vez", "Mazelas No Chão e Sem Reação; sai no início da próxima cena e recupera o Fôlego."], ["Terceira Vez", "A Persona morre."]].forEach(function (f, i) {
      P.retangulo(lx, y + 3, 8, 8, { borda: FINO, linha: 0.7, fundo: i < vm.foraDeAcao ? TINTA : null });
      P.texto(f[0], lx + 13, y + 10, { fam: ESCRITA, tam: 8.4, peso: "bold", cor: TINTA });
      var ls = P.quebrar(f[1], lw - 14, { fam: "sans", tam: 5.8 });
      ls.forEach(function (l, j) { P.texto(l.t, lx + 13, y + 17 + j * 6.8, { fam: "sans", tam: 5.8, cor: SUAVE }); });
      y += 16 + ls.length * 6.8;
    });
    if (vm.foraAtivo) P.texto("Fora de Ação agora.", lx, y + 6, { fam: ESCRITA, tam: 8, italico: true, cor: TINTA });

    /* centro: nome, retrato, corpo, círculos */
    var cx0 = 260, cw = 300, mid = cx0 + cw / 2;
    P.texto("NOME DA PERSONA", mid, 30, { fam: "sans", tam: 5.6, peso: "bold", cor: TINTA, alinhar: "center", espacamento: 0.6 });
    P.retangulo(mid - 92, 33, 184, 26, { borda: FINO, linha: 0.9 });
    P.texto(vm.nome || "", mid, 51, { fam: ESCRITA, tam: 13, peso: "bold", cor: TINTA, alinhar: "center", max: 176 });
    P.retangulo(mid - 92, 64, 184, 96, { borda: FINO, linha: 0.9 });
    if (ctx.foto) P.imagem(ctx.foto, mid - 91, 65, 182, 94, {});
    P.texto("RETRATO DA PERSONA", mid, 168, { fam: "sans", tam: 5.2, peso: "bold", cor: TINTA, alinhar: "center" });
    silhueta(P, mid, 172, 1.1);
    caixaRegiao(P, mid - 30, 222, 60, "Torso", vm.regioes.torso);
    caixaRegiao(P, cx0 + 4, 214, 70, "Braço direito", vm.regioes.bracoD);
    caixaRegiao(P, cx0 + cw - 74, 214, 70, "Braço esquerdo", vm.regioes.bracoE);
    caixaRegiao(P, cx0 + 4, 300, 70, "Perna direita", vm.regioes.pernaD);
    caixaRegiao(P, cx0 + cw - 74, 300, 70, "Perna esquerda", vm.regioes.pernaE);
    vm.circulos.forEach(function (cc, i) {
      var r = 20, gx = cx0 + 30 + (i % 5) * 60, gy = 400 + Math.floor(i / 5) * 62;
      circulo(P, gx, gy, r, cc[0], cc[1]);
    });

    /* direita: motivação, papel e habilidades */
    var rx = 572, rw = W - 34 - rx, ry = 36;
    function bloco(titulo, itens, altura, vazio) {
      cabecalho(P, titulo, rx, ry + 12, 13);
      P.linha(rx, ry + 16, rx + rw, ry + 16, { cor: FINO, linha: 0.5 });
      for (var l = ry + 28; l < ry + altura - 2; l += 11) P.linha(rx, l, rx + rw, l, { cor: "#d0d0d0", linha: 0.35 });
      var r = X.encaixar(P, itens.length ? itens : (vazio ? [{ texto: vazio }] : []), { x: rx + 2, y: ry + 19, w: rw - 4, h: altura - 22 }, ESTILO);
      if (r.sobra.length && itens.length) sobras.push({ titulo: titulo.replace(":", ""), itens: r.sobra });
      ry += altura;
    }
    bloco("Motivação:", vm.motivacao ? [{ texto: vm.motivacao }] : [], 70);
    bloco("Papel de Persona:", vm.papel ? [{ titulo: vm.papel, texto: vm.papelResumo }] : [], 58);
    bloco("Habilidade Principal:", vm.principal, 110);
    bloco("Habilidades Únicas:", vm.unicas, 150);
    bloco("Habilidades Gerais:", vm.gerais, H - 34 - ry);

    var secoes = sobras.concat([
      { titulo: "Inventário" + (vm.espacos ? " · espaços " + vm.espacos : "") + (vm.moedas ? " · " + vm.moedas + " moedas" : ""), itens: vm.inventario, mostrarVazia: true, vazio: "Sem equipamento." },
      { titulo: "Mazelas", itens: vm.mazelas },
      { titulo: "Fardos", itens: vm.fardos },
      { titulo: "Corpo", itens: vm.regioesEstado },
      { titulo: "Anotações", itens: vm.anotacoes },
      { titulo: "Aliados", itens: vm.aliados },
    ]);
    X.fluir(doc, secoes, {
      caixas: [],
      novaPagina: function (d) {
        var p = d.pagina("paisagem");
        moldura(p);
        cabecalho(p.P, vm.nome || "", 40, 50, 16);
        p.P.texto("Oblívio · Ficha de Persona · continuação · página " + p.n, p.largura - 40, 48, { fam: ESCRITA, tam: 8, italico: true, cor: SUAVE, alinhar: "right" });
        var w3 = (p.largura - 80 - 40) / 3;
        return [0, 1, 2].map(function (i) { return { x: 40 + i * (w3 + 20), y: 62, w: w3, h: p.altura - 62 - 40 }; });
      },
      cabecalho: function (Q, s, rect, cont) {
        cabecalho(Q, s.titulo + (cont ? " (cont.)" : ""), rect.x, rect.y + 13, 12.5);
        Q.linha(rect.x, rect.y + 17, rect.x + rect.w, rect.y + 17, { cor: FINO, linha: 0.5 });
        return 22;
      },
      estilo: ESTILO, alturaCabecalho: 22, entreSecoes: 10,
    });
  }

  X.registrar("oblivio", { orientacao: "paisagem", desenhar: desenharOblivio, dados: dadosOblivio });
})(typeof window !== "undefined" ? window : globalThis);
