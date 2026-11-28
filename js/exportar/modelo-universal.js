/* =====================================================================
   R.A.M.A. — exportação: ficha Universal
   ---------------------------------------------------------------------
   Universal não tem ficha oficial. O modelo é neutro e flexível, na
   organização das fichas de D&D: identificação no alto, atributos e
   perícias à esquerda, recursos e combate ao centro, equipamento à
   direita; habilidades, rituais e o que for narrativo nas páginas
   seguintes. Os nomes são os da ficha (atributos, status, rótulo dos
   rituais), e só entram os módulos ligados nela.
   ===================================================================== */

(function (global) {
  "use strict";

  var X = global.RAMAExportar;
  var txt = X.txt, sinal = X.sinal;

  var TINTA = "#1d1d1f", LINHA = "#3a3a3c", SUAVE = "#8a8a8e", CAIXA = "#f3f3f1";
  var M = 24;

  function ligado(ficha, chave) { return !ficha.modulos || ficha.modulos[chave] !== false; }

  function dadosUniversal(ficha) {
    var porId = {};
    (ficha.atributos || []).forEach(function (a) { porId[a.id] = a; });
    var vm = { nome: ficha.nome, classe: ficha.classe, origem: ficha.origem };
    vm.atributos = (ficha.atributos || []).map(function (a) { return { nome: a.nome, sigla: a.sigla, valor: a.valor, dado: a.formula || a.dado }; });
    vm.status = (ficha.status || []).map(function (s) { return { nome: s.nome, atual: s.atual, max: s.maximo }; });
    vm.pericias = (ficha.pericias || []).map(function (p) {
      var a = porId[p.atributoId];
      var bonus = (Number(p.bonus) || 0) + (Number(p.bonusTemporario) || 0);
      var extras = (p.dadosExtras || []).map(function (d) { return d && (d.dado || d.expressao) ? (d.quantidade ? d.quantidade + "x" : "") + (d.dado || d.expressao) : ""; }).filter(Boolean).join("+");
      return { nome: p.nome, atributo: a ? a.sigla : "", rolagem: p.formula || ((a ? (a.formula || a.dado) : "") + (extras ? "+" + extras : "")), bonus: bonus };
    });
    if (ficha.organizacao && ficha.organizacao.pericias && ficha.organizacao.pericias.modo === "az") vm.pericias.sort(function (a, b) { return a.nome.localeCompare(b.nome, "pt"); });
    var d = ficha.defesa || {}, ocultos = d.ocultos || [];
    vm.defesa = [["dt", "DT"], ["esquiva", "Esquiva"], ["bloqueio", "Bloqueio"], ["resistencia", "Resistência"]]
      .filter(function (k) { return ocultos.indexOf(k[0]) < 0; }).map(function (k) { return { nome: k[1], valor: d[k[0]] || 0 }; })
      .concat((d.campos || []).map(function (c) { return { nome: c.nome, valor: c.valor }; }));
    var itens = (ficha.inventario && ficha.inventario.itens) || [];
    var perPorId = {};
    (ficha.pericias || []).forEach(function (p) { perPorId[p.id] = p.nome; });
    vm.ataques = itens.filter(function (i) { return i && i.tipo === "arma"; }).map(function (i) {
      return { nome: i.nome, pericia: perPorId[i.periciaId] || "", dano: (i.dano || "") + (i.danoExtra ? " " + i.danoExtra : ""), critico: i.critico ? i.critico + "/x" + (i.multiplicador || 2) : "x" + (i.multiplicador || 2) };
    });
    vm.inventario = itens.filter(Boolean).map(function (i) {
      var meta = [({ arma: "Arma", armadura: "Armadura", mochila: "Mochila" })[i.tipo] || "", i.categoria, i.quantidade > 1 ? "×" + i.quantidade : "", i.peso ? i.peso + " kg" : "", i.tipo === "armadura" && i.defesa ? "Defesa " + sinal(i.defesa) : "", i.tipo === "arma" && i.dano ? "Dano " + i.dano : ""].filter(Boolean).join(" · ");
      return { titulo: i.nome, meta: meta, texto: X.semHtml(i.descricao) };
    });
    vm.limite = ficha.inventario && ficha.inventario.limite;
    vm.habilidades = X.itensDaArvore(ficha.habilidades);
    vm.rituais = X.itensDosRituais(ficha.rituais);
    vm.rotuloRituais = (ficha.rituais && ficha.rituais.rotuloSecao) || "Rituais";
    vm.campos = X.itensDosCampos(ficha.camposCustomizados);
    vm.anotacoes = X.itensDasAnotacoes(ficha);
    vm.aliados = X.itensDosAliados(ficha);
    return vm;
  }

  function rotulo(P, s, x, y, op) {
    P.texto(String(s).toUpperCase(), x, y, Object.assign({ fam: "estreita", tam: 5.8, peso: "bold", cor: SUAVE, espacamento: 0.4 }, op || {}));
  }

  function caixa(P, x, y, w, h, titulo) {
    P.retangulo(x, y, w, h, { borda: LINHA, linha: 0.9, raio: 6 });
    if (titulo) {
      var tw = P.medir(titulo.toUpperCase(), { fam: "estreita", tam: 6.4, peso: "bold" }) + 14;
      P.retangulo(x + w / 2 - tw / 2, y + h - 6, tw, 11, { fundo: "#fff", borda: LINHA, linha: 0.7, raio: 5 });
      rotulo(P, titulo, x + w / 2, y + h + 1.8, { alinhar: "center", tam: 6.4, cor: TINTA });
    }
  }

  var ESTILO = { fam: "sans", famTitulo: "sans", tamTitulo: 8.4, tamTexto: 7.5, tamMeta: 6.5, cor: TINTA, corMeta: SUAVE };

  function cabecalhoDeSecao(P, secao, rect, cont) {
    P.retangulo(rect.x, rect.y, rect.w, 14, { fundo: CAIXA, borda: LINHA, linha: 0.7, raio: 4 });
    rotulo(P, secao.titulo + (cont ? " (continuação)" : ""), rect.x + 7, rect.y + 9.8, { tam: 7.2, cor: TINTA });
    return 19;
  }

  function topoDeContinuacao(pg, vm) {
    var P = pg.P;
    P.texto(vm.nome || "", M, 40, { fam: "serif", tam: 16, peso: "bold", cor: TINTA, max: 300 });
    rotulo(P, "Ficha Universal · R.A.M.A. · continuação · página " + pg.n, pg.largura - M, 38, { alinhar: "right" });
    P.linha(M, 48, pg.largura - M, 48, { cor: LINHA, linha: 0.8 });
    return 58;
  }

  function desenharUniversal(doc, ficha, ctx) {
    var vm = dadosUniversal(ficha);
    var pg = doc.pagina("retrato"), P = pg.P, W = pg.largura, H = pg.altura;

    /* --- identificação --- */
    P.retangulo(M, 20, 214, 50, { borda: LINHA, linha: 1, raio: 8 });
    P.texto(vm.nome || "", M + 10, 47, { fam: "serif", tam: 17, peso: "bold", cor: TINTA, max: 196 });
    P.linha(M + 10, 53, M + 204, 53, { cor: LINHA, linha: 0.6 });
    rotulo(P, "Nome do personagem", M + 10, 62);
    var gx = M + 224, gw = W - M - gx;
    P.retangulo(gx, 20, gw, 50, { borda: LINHA, linha: 1, raio: 8 });
    var campos = [["Classe", vm.classe], ["Origem", vm.origem], ["Campanha", ctx.campanha || ""], ["Sistema", "Universal (R.A.M.A.)"]];
    campos.forEach(function (c, i) {
      var cx = gx + 10 + (i % 2) * (gw / 2), cy = 22 + Math.floor(i / 2) * 23;
      P.texto(c[1] || "", cx, cy + 11, { fam: "sans", tam: 8.6, peso: "bold", cor: TINTA, max: gw / 2 - 20 });
      P.linha(cx, cy + 13.5, cx + gw / 2 - 20, cy + 13.5, { cor: LINHA, linha: 0.5 });
      rotulo(P, c[0], cx, cy + 20);
    });

    var topo = 84, base = H - 30;
    var colA = { x: M, w: 74 }, colB = { x: M + 82, w: 150 }, colC = { x: M + 240, w: W - M - (M + 240) };
    var sobras = [];

    /* --- atributos (coluna estreita) --- */
    if (ligado(ficha, "atributos")) {
      var n = Math.max(1, vm.atributos.length), ah = Math.min(78, (base - topo) / n - 6);
      vm.atributos.forEach(function (a, i) {
        var y = topo + i * (ah + 6);
        P.retangulo(colA.x, y, colA.w, ah, { borda: LINHA, linha: 1, raio: 8 });
        rotulo(P, a.nome, colA.x + colA.w / 2, y + 10, { alinhar: "center", cor: TINTA, tam: 6.2, max: colA.w - 8 });
        P.texto(String(a.valor), colA.x + colA.w / 2, y + ah * 0.58, { fam: "sans", tam: Math.min(24, ah * 0.38), peso: "bold", cor: TINTA, alinhar: "center", base: "middle" });
        P.retangulo(colA.x + 12, y + ah - 16, colA.w - 24, 12, { fundo: "#fff", borda: LINHA, linha: 0.7, raio: 6 });
        P.texto(txt(a.dado), colA.x + colA.w / 2, y + ah - 7.5, { fam: "sans", tam: 7, cor: TINTA, alinhar: "center", max: colA.w - 28 });
      });
    }

    /* --- perícias --- */
    var yB = topo;
    if (ligado(ficha, "pericias")) {
      var alturaP = base - yB - 12;
      P.retangulo(colB.x, yB, colB.w, alturaP, { borda: LINHA, linha: 0.9, raio: 6 });
      var lh = Math.min(15, (alturaP - 14) / Math.max(1, vm.pericias.length));
      var cabem = Math.floor((alturaP - 14) / Math.max(lh, 9));
      vm.pericias.slice(0, cabem).forEach(function (p, i) {
        var y = yB + 8 + i * lh + lh / 2;
        P.circulo(colB.x + 9, y, 3, { borda: LINHA, linha: 0.6, fundo: p.bonus ? TINTA : null });
        P.texto(sinal(p.bonus), colB.x + 26, y + 2.6, { fam: "sans", tam: 7, peso: "bold", cor: TINTA, alinhar: "right" });
        P.linha(colB.x + 15, y + 4, colB.x + 28, y + 4, { cor: SUAVE, linha: 0.4 });
        P.texto(p.nome, colB.x + 32, y + 2.6, { fam: "sans", tam: Math.min(7.4, lh * 0.55), cor: TINTA, max: colB.w - 74 });
        P.texto((p.atributo ? "(" + p.atributo + ") " : "") + (p.rolagem || ""), colB.x + colB.w - 6, y + 2.4, { fam: "sans", tam: 5.8, cor: SUAVE, alinhar: "right", max: 40 });
      });
      if (!vm.pericias.length) P.texto("Nenhuma perícia na ficha.", colB.x + colB.w / 2, yB + 24, { fam: "sans", tam: 7, italico: true, cor: SUAVE, alinhar: "center" });
      caixa(P, colB.x, yB, colB.w, alturaP, "Perícias");
      if (vm.pericias.length > cabem) sobras.push({ titulo: "Perícias", itens: vm.pericias.slice(cabem).map(function (p) { return { titulo: p.nome, direita: sinal(p.bonus), meta: [p.atributo, p.rolagem].filter(Boolean).join(" · ") }; }) });
    }

    /* --- recursos e defesa --- */
    var yC = topo;
    if (ligado(ficha, "status") && vm.status.length) {
      var porLinha = vm.status.length <= 3 ? vm.status.length : 3;
      var sw = (colC.w - (porLinha - 1) * 6) / porLinha;
      vm.status.forEach(function (s, i) {
        var x = colC.x + (i % porLinha) * (sw + 6), y = yC + Math.floor(i / porLinha) * 58;
        P.retangulo(x, y, sw, 48, { borda: LINHA, linha: 1, raio: 6, fundo: CAIXA });
        rotulo(P, "Máximo: " + txt(s.max), x + 6, y + 9, { max: sw - 12 });
        P.texto(txt(s.atual), x + sw / 2, y + 30, { fam: "sans", tam: 18, peso: "bold", cor: TINTA, alinhar: "center", base: "middle", max: sw - 10 });
        caixa(P, x, y, sw, 48, s.nome);
      });
      yC += Math.ceil(vm.status.length / porLinha) * 58 + 4;
    }
    if (ligado(ficha, "defesa") && vm.defesa.length) {
      var dn = Math.min(5, vm.defesa.length), dw = (colC.w - (dn - 1) * 6) / dn;
      vm.defesa.forEach(function (d, i) {
        var x = colC.x + (i % dn) * (dw + 6), y = yC + Math.floor(i / dn) * 50;
        P.poligono([[x, y], [x + dw, y], [x + dw, y + 26], [x + dw / 2, y + 38], [x, y + 26]], { borda: LINHA, linha: 1 });
        P.texto(txt(d.valor), x + dw / 2, y + 19, { fam: "sans", tam: 14, peso: "bold", cor: TINTA, alinhar: "center", base: "middle" });
        rotulo(P, d.nome, x + dw / 2, y + 46, { alinhar: "center", max: dw, cor: TINTA });
      });
      yC += Math.ceil(vm.defesa.length / dn) * 50 + 6;
    }

    /* --- ataques --- */
    if (ligado(ficha, "inventario")) {
      var ah2 = Math.min(150, 22 + Math.max(4, vm.ataques.length) * 13);
      P.retangulo(colC.x, yC, colC.w, ah2, { borda: LINHA, linha: 0.9, raio: 6 });
      rotulo(P, "Nome", colC.x + 8, yC + 10); rotulo(P, "Perícia", colC.x + colC.w * 0.42, yC + 10); rotulo(P, "Dano", colC.x + colC.w * 0.66, yC + 10); rotulo(P, "Crít.", colC.x + colC.w - 8, yC + 10, { alinhar: "right" });
      var lin = Math.floor((ah2 - 22) / 13);
      for (var k = 0; k < lin; k++) {
        var ly = yC + 16 + k * 13;
        P.linha(colC.x + 6, ly + 11, colC.x + colC.w - 6, ly + 11, { cor: "#c9c9c9", linha: 0.4 });
        var a = vm.ataques[k];
        if (!a) continue;
        P.texto(a.nome, colC.x + 8, ly + 9, { fam: "sans", tam: 7.2, peso: "bold", cor: TINTA, max: colC.w * 0.4 - 10 });
        P.texto(a.pericia, colC.x + colC.w * 0.42, ly + 9, { fam: "sans", tam: 6.8, cor: TINTA, max: colC.w * 0.23 });
        P.texto(a.dano, colC.x + colC.w * 0.66, ly + 9, { fam: "sans", tam: 6.8, cor: TINTA, max: colC.w * 0.22 });
        P.texto(a.critico, colC.x + colC.w - 8, ly + 9, { fam: "sans", tam: 6.8, cor: TINTA, alinhar: "right" });
      }
      caixa(P, colC.x, yC, colC.w, ah2, "Ataques");
      if (vm.ataques.length > lin) sobras.push({ titulo: "Ataques", itens: vm.ataques.slice(lin).map(function (a) { return { titulo: a.nome, texto: [a.pericia, a.dano, a.critico].filter(Boolean).join(" · ") }; }) });
      yC += ah2 + 14;
      /* equipamento na caixa que sobra da coluna */
      var eh = base - yC - 12;
      var r = { y: yC, sobra: vm.inventario };
      if (eh > 40) {
        P.retangulo(colC.x, yC, colC.w, eh, { borda: LINHA, linha: 0.9, raio: 6 });
        r = X.encaixar(P, vm.inventario.length ? vm.inventario : [{ texto: " " }], { x: colC.x + 8, y: yC + 7, w: colC.w - 16, h: eh - 16 }, ESTILO);
        caixa(P, colC.x, yC, colC.w, eh, "Equipamento" + (vm.limite ? " · limite " + vm.limite : ""));
      }
      if (r.sobra.length && vm.inventario.length) sobras.push({ titulo: "Equipamento", itens: r.sobra });
    }

    var secoes = sobras.concat([
      ligado(ficha, "habilidades") ? { titulo: "Habilidades", itens: vm.habilidades } : null,
      ligado(ficha, "rituais") ? { titulo: vm.rotuloRituais, itens: vm.rituais } : null,
      { titulo: "Campos personalizados", itens: vm.campos },
      ligado(ficha, "anotacoes") ? { titulo: "Anotações", itens: vm.anotacoes } : null,
      ligado(ficha, "aliados") ? { titulo: "Aliados", itens: vm.aliados } : null,
    ]);
    X.fluir(doc, secoes, {
      caixas: [],
      novaPagina: function (d) {
        var p = d.pagina("retrato");
        var t = topoDeContinuacao(p, vm);
        var meio = p.largura / 2;
        return [{ x: M, y: t, w: meio - M - 8, h: p.altura - 30 - t }, { x: meio + 8, y: t, w: p.largura - M - meio - 8, h: p.altura - 30 - t }];
      },
      cabecalho: cabecalhoDeSecao, estilo: ESTILO, alturaCabecalho: 19, entreSecoes: 8,
    });
  }

  X.registrar("universal", { orientacao: "retrato", desenhar: desenharUniversal, dados: dadosUniversal });
})(typeof window !== "undefined" ? window : globalThis);
