/* =====================================================================
   R.A.M.A. — exportação: Malditos Goblins (3ª edição)
   ---------------------------------------------------------------------
   Um cartão por goblin: cabeçalho preto "Ficha do Goblin", nome e
   nível, ocupação e características no alto; Combate, Habilidade,
   Noção e Vitalidade de um lado e Equipamento do outro; Ferimentos
   embaixo. A folha impressa traz seis cartões; aqui é um só, grande e
   legível. Técnicas, magias, adaptações e o diário seguem em cartões de
   continuação. Valores de RAMAGoblins.calcular().
   ===================================================================== */

(function (global) {
  "use strict";

  var X = global.RAMAExportar;
  var txt = X.txt;
  var PRETO = "#1e1e1e", BORDA = "#2a2a2a", SUAVE = "#666";
  var LUDICA = "'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', 'Segoe Print', cursive";

  function tentar(fn, padrao) { try { var v = fn(); return v === undefined ? padrao : v; } catch (e) { return padrao; } }

  function dadosGoblins(ficha) {
    var G = global.RAMAGoblins, C = global.RAMAGoblinsCatalogo;
    var o = tentar(function () { return G.normalizar(ficha.goblins); }, ficha.goblins || {});
    var c = tentar(function () { return G.calcular(o); }, null) || { atributos: {} };
    var vm = { nome: ficha.nome + (o.nomeDeFamilia ? " " + o.nomeDeFamilia : ""), nivel: o.nivel };
    vm.ocupacao = tentar(function () { return G.nomeDaOcupacao(o); }, o.ocupacao) || "";
    (o.epicas || []).forEach(function (e) { vm.ocupacao += " · " + tentar(function () { return G.nomeDaOcupacao(o, e.ocupacao); }, e.ocupacao) + " " + e.nivel; });
    var desc = tentar(function () { return C.DESCRITORES[o.descritor].nome; }, "");
    vm.caracteristicas = [desc].concat((o.caracteristicas || []).map(function (x) { return tentar(function () { return C.CARACTERISTICAS[x.chave].nome; }, x.chave) + (x.quantidade ? " (" + x.quantidade + ")" : ""); })).filter(Boolean).join(", ");
    vm.caracteristicasTexto = (o.caracteristicas || []).map(function (x) { var d = C.CARACTERISTICAS[x.chave]; return d ? { titulo: d.nome, texto: d.texto } : null; }).filter(Boolean);
    vm.atributos = (C.ATRIBUTOS || []).map(function (a) { return { nome: a.nome, valor: tentar(function () { return c.atributos[a.chave].valor; }, 0) }; });
    vm.vitalidade = c.vitalidade || 0;
    vm.ferimentos = o.ferimentos || 0;
    vm.situacao = o.estado && o.estado.situacao !== "ativo" ? o.estado.situacao : "";
    vm.equipamento = (o.itens || []).filter(function (i) { return !i.destruido && !i.consumido; }).map(function (i) {
      var d = tentar(function () { return G.defDoItem(i); }, {});
      var meta = [
        i.equipado ? "equipado" : "",
        d.arma && d.arma.bonus ? "+" + d.arma.bonus + " dado(s)" : "",
        i.quantidade > 1 ? "×" + i.quantidade : "",
        i.municao ? "munição " + i.municao.atual + "/" + i.municao.max : "",
        i.durabilidade ? "durabilidade " + i.durabilidade.atual + "/" + i.durabilidade.original : "",
        i.precisaRecarregar ? "recarregar" : "",
      ].filter(Boolean).join(" · ");
      return { titulo: i.nome, meta: meta, texto: i.nota };
    });
    vm.perdidos = (o.itens || []).filter(function (i) { return i.destruido || i.consumido; }).map(function (i) { return { titulo: i.nome, meta: i.destruido ? "destruído" : "consumido" }; });
    vm.tecnicas = (c.tecnicas || []).map(function (t) { return { titulo: t.nome, direita: t.nivel ? "nível " + t.nivel : "", meta: t.uso === "dia" ? "uma vez por dia" + (tentar(function () { return G.usoDiario(o, t.chave); }, false) ? " · já usada hoje" : "") : "", texto: t.texto }; });
    vm.magias = (c.magias || []).map(function (m) { var d = C.MAGIAS[m.magia] || { nome: m.magia }; return { titulo: d.nome, meta: m.rotulo }; });
    vm.efeitos = (o.efeitos || []).map(function (e) { return { titulo: e.nome, meta: e.turnos ? e.turnos + " turno(s)" : (e.ate || "") }; });
    var ad = o.opcoes && o.opcoes.adaptacoes ? Object.keys(o.opcoes.adaptacoes).filter(function (k) { return o.opcoes.adaptacoes[k]; }) : [];
    var nomesAd = { cthulin: "Cthulin", pokepragas: "Pokepragas", wargoblin: "Wargoblin", goblinHigh: "Goblin High", vale: "O Vale" };
    vm.opcoes = [];
    if (ad.length) vm.opcoes.push({ titulo: "Adaptações", texto: ad.map(function (k) { return nomesAd[k] || k; }).join(", ") });
    var regras = [o.opcoes && o.opcoes.vozGoblin ? "Voz Goblin" : "", o.opcoes && o.opcoes.deuRuim ? "Deu Ruim" : "", o.opcoes && o.opcoes.niveisEpicos ? "Níveis épicos" : ""].filter(Boolean);
    if (regras.length) vm.opcoes.push({ titulo: "Regras opcionais", texto: regras.join(", ") });
    if (o.opcoes && o.opcoes.adaptacoes && o.opcoes.adaptacoes.cthulin && o.adaptacoes && o.adaptacoes.cthulin) vm.opcoes.push({ titulo: "Medo (Cthulin)", direita: txt(o.adaptacoes.cthulin.medo) });
    vm.diario = (o.historico || []).slice(-60).map(function (h) { return typeof h === "string" ? { texto: h } : { titulo: h.titulo || h.tipo || "", meta: h.quando || h.dia ? "dia " + (h.dia || h.quando) : "", texto: h.texto || h.resumo || "" }; }).filter(function (x) { return x.titulo || x.texto; });
    vm.anotacoes = X.itensDasAnotacoes(ficha);
    vm.aliados = X.itensDosAliados(ficha);
    return vm;
  }

  var ESTILO = { fam: "sans", famTitulo: "sans", tamTitulo: 9, tamTexto: 8, tamMeta: 7, cor: PRETO, corMeta: SUAVE };

  function faixa(P, x, y, w, h, texto) {
    P.retangulo(x, y, w, h, { fundo: PRETO, borda: false });
    P.texto(texto, x + w / 2, y + h / 2 + 0.5, { fam: "sans", tam: h * 0.55, peso: "bold", cor: "#fff", alinhar: "center", base: "middle", espacamento: 0.5 });
  }

  function celula(P, x, y, w, h, rotulo, valor, op) {
    var o = op || {};
    P.retangulo(x, y, w, h, { borda: BORDA, linha: 0.9 });
    P.texto(rotulo, x + 5, y + 12, { fam: "sans", tam: 9, peso: "bold", cor: PRETO });
    if (valor !== undefined) P.texto(txt(valor), x + 5 + P.medir(rotulo, { fam: "sans", tam: 9, peso: "bold" }) + 6, y + (o.grande ? h * 0.66 : 12), { fam: "sans", tam: o.grande ? 15 : 10, cor: PRETO, max: w - 12 - P.medir(rotulo, { fam: "sans", tam: 9, peso: "bold" }) });
  }

  function desenharGoblins(doc, ficha, ctx) {
    var vm = dadosGoblins(ficha);
    var pg = doc.pagina("retrato"), P = pg.P, W = pg.largura, H = pg.altura;
    P.texto("Ficha do Goblin", W / 2, 58, { fam: LUDICA, tam: 26, peso: "bold", cor: PRETO, alinhar: "center" });
    P.texto("Malditos Goblins · 3ª edição · exportado do R.A.M.A.", W / 2, 72, { fam: "sans", tam: 7, italico: true, cor: SUAVE, alinhar: "center" });

    var x = 50, w = W - 100, y = 92, lh = 26;
    P.retangulo(x, y, w, H - y - 60, { borda: BORDA, linha: 1.6 });
    faixa(P, x, y, w, 24, "FICHA DO GOBLIN");
    y += 24;
    celula(P, x, y, w - 110, lh, "Nome:", vm.nome);
    celula(P, x + w - 110, y, 110, lh, "Nível:", vm.nivel);
    y += lh;
    celula(P, x, y, w, lh, "Ocupação:", vm.ocupacao);
    y += lh;
    celula(P, x, y, w, lh, "Característica:", vm.caracteristicas);
    y += lh;

    /* atributos à esquerda, equipamento à direita */
    var la = 96, va = 64, corpoH = 300;
    faixa(P, x + la + va, y, w - la - va, 20, "Equipamento");
    vm.atributos.forEach(function (a, i) {
      var ay = y + i * (corpoH / 4);
      P.retangulo(x, ay, la, corpoH / 4, { fundo: PRETO, borda: BORDA, linha: 0.9 });
      P.texto(a.nome, x + 8, ay + corpoH / 8 + 4, { fam: "sans", tam: 12, peso: "bold", cor: "#fff" });
      P.retangulo(x + la, ay, va, corpoH / 4, { borda: BORDA, linha: 0.9 });
      P.texto(String(a.valor), x + la + va / 2, ay + corpoH / 8 + 1, { fam: "sans", tam: 26, peso: "bold", cor: PRETO, alinhar: "center", base: "middle" });
    });
    var ex = x + la + va, ew = w - la - va;
    P.retangulo(ex, y, ew, corpoH, { borda: BORDA, linha: 0.9 });
    var r = X.encaixar(P, vm.equipamento, { x: ex + 8, y: y + 26, w: ew - 16, h: corpoH - 32 }, ESTILO);
    y += corpoH;

    /* ferimentos */
    var fh = 70;
    P.retangulo(x, y, w, fh, { borda: BORDA, linha: 0.9 });
    P.texto("Ferimentos:", x + 6, y + 14, { fam: "sans", tam: 10, peso: "bold", cor: PRETO });
    P.texto(vm.ferimentos + " de " + vm.vitalidade + " (morre com mais ferimentos que a Vitalidade)" + (vm.situacao ? " · " + vm.situacao : ""), x + 76, y + 14, { fam: "sans", tam: 8, cor: SUAVE, max: w - 84 });
    var total = Math.max(vm.vitalidade + 1, vm.ferimentos, 1);
    for (var i = 0; i < total; i++) {
      var fx = x + 10 + i * 22, fy = y + 26;
      if (fx + 18 > x + w) break;
      P.retangulo(fx, fy, 18, 18, { borda: i === vm.vitalidade ? "#a11" : BORDA, linha: i === vm.vitalidade ? 1.4 : 0.9 });
      if (i < vm.ferimentos) { P.linha(fx + 3, fy + 3, fx + 15, fy + 15, { cor: PRETO, linha: 1.6 }); P.linha(fx + 15, fy + 3, fx + 3, fy + 15, { cor: PRETO, linha: 1.6 }); }
    }
    P.texto("Casa em vermelho: o ferimento além da Vitalidade (morte).", x + 10, y + 60, { fam: "sans", tam: 6.5, cor: SUAVE });
    y += fh;

    /* técnicas, o que sobrar no cartão */
    var resto = H - 60 - y;
    var sobraTec = vm.tecnicas;
    if (resto > 50) {
      faixa(P, x, y, w, 18, "Técnicas e magias");
      var rr = X.encaixar(P, vm.tecnicas.concat(vm.magias.map(function (m) { return Object.assign({}, m, { titulo: "Magia: " + m.titulo }); })), { x: x + 8, y: y + 24, w: w - 16, h: resto - 30 }, ESTILO);
      sobraTec = rr.sobra;
    } else sobraTec = vm.tecnicas.concat(vm.magias);

    var secoes = [
      r.sobra.length ? { titulo: "Equipamento (continuação)", itens: r.sobra } : null,
      sobraTec.length ? { titulo: "Técnicas e magias (continuação)", itens: sobraTec } : null,
      { titulo: "Características", itens: vm.caracteristicasTexto },
      { titulo: "Efeitos", itens: vm.efeitos },
      { titulo: "Itens perdidos", itens: vm.perdidos },
      { titulo: "Adaptações e opções", itens: vm.opcoes },
      { titulo: "Diário", itens: vm.diario },
      { titulo: "Anotações", itens: vm.anotacoes },
      { titulo: "Aliados", itens: vm.aliados },
    ];
    X.fluir(doc, secoes, {
      caixas: [],
      novaPagina: function (d) {
        var p = d.pagina("retrato"), Q = p.P;
        Q.texto("Ficha do Goblin — " + (vm.nome || "") + " (continuação)", p.largura / 2, 48, { fam: LUDICA, tam: 15, peso: "bold", cor: PRETO, alinhar: "center", max: p.largura - 100 });
        Q.retangulo(50, 62, p.largura - 100, p.altura - 110, { borda: BORDA, linha: 1.6 });
        Q.texto("página " + p.n, p.largura - 54, p.altura - 36, { fam: "sans", tam: 7, cor: SUAVE, alinhar: "right" });
        return [{ x: 60, y: 70, w: p.largura - 120, h: p.altura - 126 }];
      },
      cabecalho: function (Q, s, rect, cont) { faixa(Q, rect.x - 10, rect.y, rect.w + 20, 18, s.titulo + (cont ? " (cont.)" : "")); return 24; },
      estilo: ESTILO, alturaCabecalho: 24, entreSecoes: 8,
    });
  }

  X.registrar("goblins", { orientacao: "retrato", desenhar: desenharGoblins, dados: dadosGoblins });
})(typeof window !== "undefined" ? window : globalThis);
