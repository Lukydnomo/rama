/* =====================================================================
   R.A.M.A. — exportação: Ordem Paranormal (1ª edição) e Ordem II
   ---------------------------------------------------------------------
   Ordem I: ficha vertical em preto e branco, faixas pretas, textura
   gasta, os cinco atributos em volta de um núcleo, recursos, defesa e
   ataques na primeira página e as perícias numa coluna à direita. As
   páginas seguintes levam habilidades, rituais, inventário e descrição.
   Os números vêm do motor de regras (RAMAOrdemRegras), com a forma de
   progressão e as regras opcionais da própria ficha.

   Ordem II (Experimental): a mesma família, na versão das fichas dos
   playtests — horizontal, escura, com moldura azul, atributos e dados
   de perícia em losangos e PV/PD em quadradinhos.
   ===================================================================== */

(function (global) {
  "use strict";

  var X = global.RAMAExportar;
  var txt = X.txt, sinal = X.sinal;

  function tentar(fn, padrao) { try { var v = fn(); return v === undefined ? padrao : v; } catch (e) { return padrao; } }

  /* =================================================================
     ORDEM I — DADOS
     ================================================================= */

  function dadosOrdem(ficha) {
    var R = global.RAMAOrdemRegras, C = global.RAMAOrdemCatalogo;
    var o = ficha.ordem || (R ? R.fichaVazia() : {});
    var inv = ficha.inventario || { itens: [] };
    var c = tentar(function () { return R.calcular(o, inv); }, null);
    var vm = { nome: ficha.nome, sistema: "ordem" };
    var classe = tentar(function () { return C.classe(o.classe); }, null);
    var origem = tentar(function () { return C.origem(o.origem); }, null);
    var trilha = tentar(function () { return C.trilha(o.trilha); }, null);
    vm.classe = classe ? classe.nome : txt(ficha.classe);
    vm.origem = origem ? origem.nome : txt(ficha.origem);
    vm.trilha = trilha ? trilha.nome : "";
    var t = c && c.trilho;
    vm.progressao = t ? t.rotulo + (t.separado && !t.comum ? " · exposição " + c.exposicao + "%" : "") : "";
    if (t && t.comum && t.perfil === "sobrevivente") vm.progressao = "Estágio " + t.estagio + " · " + t.rotulo;
    vm.formaProgressao = tentar(function () {
      if (R.porPatente(o)) return "Evolução por Patentes";
      if (R.separaNivelENex(o)) return "Nível + NEX";
      return "Somente NEX";
    }, "");
    var pat = c && c.patente;
    vm.patente = pat && !pat.semPatente && pat.patente ? pat.patente.nome + " · " + pat.prestigio + " PP · crédito " + txt(pat.credito) : "";
    var af = o.afinidade || {};
    vm.afinidade = af.elemento ? (af.elemento === "outro" ? (af.nomeOutro || "Outro") : tentar(function () { return C.elemento(af.elemento).nome; }, af.elemento)) : "";

    vm.atributos = (C ? C.ATRIBUTOS : []).map(function (a) {
      return { chave: a.chave, sigla: a.sigla, nome: a.nome, valor: tentar(function () { return R.atributo(o, a.chave); }, (o.atributos || {})[a.chave] || 0) };
    });

    vm.recursos = [];
    if (c) {
      vm.recursos.push({ sigla: "PV", nome: "Pontos de Vida", atual: c.atual.pv, max: c.pv.total });
      if (c.determinacao) vm.recursos.push({ sigla: "PD", nome: "Pontos de Determinação", atual: c.atual.pd, max: c.pd.total });
      else {
        vm.recursos.push({ sigla: "PE", nome: "Pontos de Esforço", atual: c.atual.pe, max: c.pe.total });
        vm.recursos.push({ sigla: "SAN", nome: "Sanidade", atual: c.atual.san, max: c.san.total });
      }
      vm.defesa = c.defesa.total;
      vm.bloqueio = c.bloqueio.total;
      vm.esquiva = c.esquiva.total;
      vm.deslocamento = c.deslocamento.total;
      vm.limitePe = tentar(function () { return c.limitePe.total !== undefined ? c.limitePe.total : c.limitePe; }, "");
      vm.carga = c.carga ? c.carga.ocupado + " / " + c.carga.limite : "";
      vm.resistencias = tentar(function () {
        return Object.keys(c.resistencias || {}).map(function (k) {
          var r = c.resistencias[k];
          var v = r && (r.total !== undefined ? r.total : (r.conta ? r.conta.total : r));
          return typeof v === "number" && v ? (tentar(function () { return C.elemento(k).nome; }, k) + " " + v) : "";
        }).filter(Boolean).join(", ");
      }, "");
      vm.proficiencias = (c.proficiencias || []).map(function (p) { return p.texto; }).join(", ");
      vm.condicoes = tentar(function () {
        var ef = c.efeitos;
        if (!ef) return [];
        return (ef.automaticas || []).map(function (a) { return { titulo: a.nome, meta: a.motivo }; })
          .concat((ef.condicoes || []).map(function (x) { return { titulo: x.nome || x.chave, meta: x.duracao || x.motivo || "", texto: x.resumo || x.texto || "" }; }));
      }, []);
    }

    vm.pericias = (C ? C.PERICIAS : []).map(function (p) {
      var g = tentar(function () { return C.grau(R.grauDaPericia(o, p.chave)); }, { nome: "Destreinado", bonus: 0 });
      var atr = tentar(function () { return R.atributoDaPericia(o, p.chave); }, p.atributo);
      var total = tentar(function () { return R.bonusDePericia(o, p.chave, inv).total; }, g.bonus);
      var dados = tentar(function () { return R.dadoDePericia(o, p.chave); }, "");
      return {
        nome: p.nome, sigla: tentar(function () { return C.ATRIBUTOS.filter(function (a) { return a.chave === atr; })[0].sigla; }, atr).toUpperCase(),
        grau: g.nome, nivel: Math.round((g.bonus || 0) / 5), total: total, dados: typeof dados === "object" ? "" : txt(dados),
        treinada: !!p.treinada, carga: !!p.carga,
      };
    });
    vm.especialidades = (o.especialidades || []).map(function (e) { return typeof e === "string" ? e : (e && (e.nome || e.texto)) || ""; }).filter(Boolean).join(", ");

    var IT = global.RAMAOrdemItens, I = global.RAMAOrdemInventario;
    vm.ataques = (inv.itens || []).filter(function (i) { return i && i.tipo === "arma"; }).map(function (item) {
      var ef = tentar(function () { return R.armaEfetiva(o, inv, item, ficha.pericias); }, null);
      if (!ef) return { arma: item.nome, teste: "—", dano: txt(item.dano) || "—", critico: "", alcance: "" };
      var dano = ef.dano ? ef.dano + (ef.extra && ef.extra.total ? sinal(ef.extra.total) : "") + (ef.danoExtraManual ? " " + ef.danoExtraManual : "") : (ef.tabelaD6 ? "1d6: " + ef.tabelaD6.join("/") : "—");
      return {
        arma: item.nome,
        teste: ef.pericia ? ef.periciaNome + " " + ef.dado + " " + sinal(ef.ataque.total) : "—",
        dano: dano + (ef.tipoDano ? " " + ef.tipoDano : ""),
        critico: ef.margem ? (ef.margem >= 20 ? "x" : ef.margem + "/x") + ef.multiplicador : "—",
        alcance: ef.alcance ? ((IT && IT.ROTULO_ALCANCE && IT.ROTULO_ALCANCE[ef.alcance]) || ef.alcance).replace(/\s*\(.*\)/, "") : "—",
      };
    });

    /* Habilidades das regras (a lista da aba) e as criadas à mão. */
    var regras = tentar(function () { return global.RAMAOrdemHabilidadesDaFicha ? global.RAMAOrdemHabilidadesDaFicha(o, inv) : []; }, []);
    vm.habilidades = regras.map(function (x) {
      var aq = x.aq, pz = x.pz;
      return {
        titulo: pz ? pz.nome : aq.nome + (aq.estagio ? " · " + aq.estagio : ""),
        meta: [aq.origem, aq.referencia, aq.situacao === "suspensa" ? "suspensa" : (aq.situacao === "incompleta" ? "incompleta" : "")].filter(Boolean).join(" · "),
        texto: X.semHtml(pz && pz.texto ? pz.texto : [aq.resumo, aq.nota].filter(Boolean).join("\n")),
      };
    }).concat(X.itensDaArvore(ficha.habilidades));

    vm.rituais = X.itensDosRituais(ficha.rituais);
    vm.rotuloRituais = (ficha.rituais && ficha.rituais.rotuloSecao) || "Rituais";

    vm.inventario = (inv.itens || []).filter(Boolean).map(function (item) {
      var d = tentar(function () { return I.dadosDoItem(item); }, {});
      var esp = tentar(function () { return I.espacosDoItem(item); }, null);
      var meta = [
        item.tipo && item.tipo !== "item" ? ({ arma: "Arma", armadura: "Proteção", mochila: "Mochila" })[item.tipo] || "" : "",
        d && d.categoria !== null && d.categoria !== undefined ? "Categoria " + I.rotuloCategoria(d.categoria) : "",
        esp ? I.rotuloEspacos(esp.unitario) + " esp." : "",
        d && d.quantidade > 1 ? "×" + d.quantidade : "",
        item.categoria || "",
        item.tipo === "armadura" && item.defesa ? "Defesa " + sinal(item.defesa) : "",
      ].filter(Boolean).join(" · ");
      return { titulo: item.nome, meta: meta, texto: X.semHtml(item.descricao) };
    });
    vm.carregando = vm.carga;

    vm.extras = [];
    var OP = global.RAMAOrdemOpcionais;
    var opc = tentar(function () { return OP.REGRAS.filter(function (r) { return OP.ligada(o, r.chave); }).map(function (r) { return r.nome; }); }, []);
    if (opc.length) vm.extras.push({ titulo: "Regras opcionais ligadas", texto: opc.join(", ") });
    if (vm.formaProgressao) vm.extras.push({ titulo: "Forma de progressão", texto: vm.formaProgressao });
    var sup = suplementosDe(ficha);
    if (sup) vm.extras.push({ titulo: "Suplementos da ficha", texto: sup });
    if (vm.especialidades) vm.extras.push({ titulo: "Especialidades (Profissão)", texto: vm.especialidades });
    vm.descricao = X.itensDosCampos(ficha.camposCustomizados).concat(X.itensDosCampos(o.camposPersonalizados));
    vm.anotacoes = X.itensDasAnotacoes(ficha);
    vm.aliados = X.itensDosAliados(ficha);
    return vm;
  }

  function suplementosDe(ficha) {
    var S = global.RAMASuplementos;
    if (!S || !Array.isArray(ficha.suplementos)) return "";
    return ficha.suplementos.map(function (id) {
      var d = tentar(function () { return S.de(id); }, null);
      return d && d.nome ? d.nome : id;
    }).join(", ");
  }

  /* =================================================================
     ORDEM I — DESENHO
     ================================================================= */

  var PRETO = "#151515", CINZA = "#6e6e6e", CLARO = "#d9d9d9";
  var M = 22;

  function textura(P, w, h, r) {
    var c = P.ctx;
    c.save();
    for (var i = 0; i < 1400; i++) {
      c.globalAlpha = 0.04 + r() * 0.06;
      c.fillStyle = r() < 0.7 ? "#000" : "#555";
      var s = r() * 1.3 + 0.2;
      c.fillRect(r() * w, r() * h, s, s);
    }
    c.globalAlpha = 0.05;
    for (var k = 0; k < 18; k++) {
      var x = r() * w, y = r() * h;
      P.linha(x, y, x + (r() - 0.5) * 60, y + (r() - 0.5) * 8, { cor: "#000", linha: 0.3 });
    }
    c.restore();
  }

  function faixa(P, x, y, w, h, texto, op) {
    var o = op || {};
    P.retangulo(x, y, w, h, { fundo: PRETO, borda: false });
    P.texto(texto, x + (o.centro ? w / 2 : 6), y + h / 2 + 0.5, { fam: "pesada", tam: o.tam || h * 0.62, cor: "#fff", base: "middle", alinhar: o.centro ? "center" : "left", espacamento: 0.6, max: w - 10 });
  }

  function campo(P, x, y, w, rotulo, valor, op) {
    var o = op || {};
    P.texto(rotulo.toUpperCase(), x, y + 6, { fam: "pesada", tam: 6.4, cor: CINZA, espacamento: 0.4 });
    P.texto(valor || "", x + 1, y + 6 + (o.tam || 10.5) + 2, { fam: o.fam || "sans", tam: o.tam || 10.5, peso: o.peso || "bold", cor: PRETO, max: w - 2 });
    P.linha(x, y + (o.altura || 22), x + w, y + (o.altura || 22), { cor: PRETO, linha: 0.9 });
  }

  function cabecalhoOrdem(pg, vm, continuacao) {
    var P = pg.P, w = pg.largura;
    P.retangulo(M, 18, w - 2 * M, continuacao ? 24 : 34, { fundo: PRETO, borda: false });
    if (continuacao) {
      P.texto("ORDEM PARANORMAL", M + 8, 34.5, { fam: "pesada", tam: 13, cor: "#fff", espacamento: 1 });
      P.texto((vm.nome || "") + " · continuação · página " + pg.n, w - M - 8, 33.5, { fam: "sans", tam: 7.5, cor: "#fff", alinhar: "right", max: 260 });
      return 52;
    }
    P.texto("ORDEM PARANORMAL", M + 10, 43, { fam: "pesada", tam: 22, cor: "#fff", espacamento: 1.5 });
    P.texto("FICHA DE AGENTE", w - M - 10, 33, { fam: "pesada", tam: 9, cor: "#fff", alinhar: "right", espacamento: 1 });
    P.texto("R.A.M.A. · " + (vm.sistema === "ordem" ? "1ª edição" : ""), w - M - 10, 44, { fam: "sans", tam: 6.5, cor: "#bbb", alinhar: "right" });
    return 62;
  }

  var ESTILO_ORDEM = { fam: "sans", famTitulo: "sans", tamTitulo: 8.4, tamTexto: 7.5, tamMeta: 6.6, corMeta: "#555" };

  function paginaDeContinuacaoOrdem(vm) {
    return function (doc) {
      var pg = doc.pagina();
      textura(pg.P, pg.largura, pg.altura, X.semente(vm.nome + pg.n));
      var topo = cabecalhoOrdem(pg, vm, true);
      var meio = pg.largura / 2;
      P_linhaVertical(pg.P, meio, topo, pg.altura - 30);
      rodape(pg, vm);
      return [
        { x: M, y: topo, w: meio - M - 10, h: pg.altura - 30 - topo },
        { x: meio + 10, y: topo, w: pg.largura - M - meio - 10, h: pg.altura - 30 - topo },
      ];
    };
  }

  function P_linhaVertical(P, x, y1, y2) { P.linha(x, y1, x, y2, { cor: CLARO, linha: 0.6 }); }

  function rodape(pg, vm) {
    pg.P.texto("Exportado do R.A.M.A. · regras e cálculos da ficha no momento da exportação", M, pg.altura - 14, { fam: "sans", tam: 5.8, cor: "#888" });
    pg.P.texto(String(pg.n), pg.largura - M, pg.altura - 14, { fam: "pesada", tam: 8, cor: "#888", alinhar: "right" });
  }

  function cabecalhoDeSecaoOrdem(P, secao, rect, cont) {
    faixa(P, rect.x, rect.y, rect.w, 13, (secao.titulo + (cont ? " (continuação)" : "")).toUpperCase(), { tam: 8.2 });
    return 18;
  }

  function desenharOrdem(doc, ficha, ctx) {
    var vm = dadosOrdem(ficha);
    var pg = doc.pagina("retrato");
    var P = pg.P, W = pg.largura, H = pg.altura;
    textura(P, W, H, X.semente(vm.nome));
    var y = cabecalhoOrdem(pg, vm, false);
    var esq = M, larg = 338, dir = M + larg + 12, largDir = W - M - dir;

    /* --- identificação --- */
    campo(P, esq, y, larg, "Personagem", vm.nome, { tam: 15, altura: 26, fam: "pesada", peso: "normal" });
    y += 32;
    campo(P, esq, y, larg / 2 - 6, "Origem", vm.origem);
    campo(P, esq + larg / 2 + 6, y, larg / 2 - 6, "Classe", vm.classe);
    y += 28;
    campo(P, esq, y, larg / 2 - 6, "Trilha", vm.trilha || "—");
    campo(P, esq + larg / 2 + 6, y, larg / 2 - 6, vm.formaProgressao === "Evolução por Patentes" ? "Patente e exposição" : (vm.formaProgressao === "Nível + NEX" ? "Nível e exposição" : "Progressão"), vm.progressao, { tam: 9.5 });
    y += 28;
    var linhaInfo = [vm.patente ? "Patente: " + vm.patente : "", vm.afinidade ? "Afinidade: " + vm.afinidade : "", ctx.campanha ? "Campanha: " + ctx.campanha : ""].filter(Boolean).join("   ·   ");
    P.texto(linhaInfo || " ", esq, y + 8, { fam: "sans", tam: 7.4, cor: PRETO, max: larg });
    y += 16;

    /* --- atributos em volta do núcleo --- */
    var cx = esq + 92, cy = y + 88;
    var pos = { agi: [0, -66], "for": [-64, -20], "int": [64, -20], pre: [-40, 56], vig: [40, 56] };
    vm.atributos.forEach(function (a) {
      var p = pos[a.chave] || [0, 0];
      P.linha(cx, cy, cx + p[0], cy + p[1], { cor: PRETO, linha: 1.6 });
    });
    P.circulo(cx, cy, 33, { fundo: PRETO, borda: false });
    P.circulo(cx, cy, 29, { borda: "#fff", linha: 0.6 });
    P.texto("ATRIBUTOS", cx, cy + 1, { fam: "pesada", tam: 8.2, cor: "#fff", alinhar: "center", base: "middle", espacamento: 0.6 });
    vm.atributos.forEach(function (a) {
      var p = pos[a.chave] || [0, 0];
      var ax = cx + p[0], ay = cy + p[1];
      P.circulo(ax, ay, 22, { fundo: "#fff", borda: PRETO, linha: 2.2 });
      P.circulo(ax, ay, 18, { borda: PRETO, linha: 0.5 });
      P.texto(String(a.valor), ax, ay + 1, { fam: "pesada", tam: 18, cor: PRETO, alinhar: "center", base: "middle" });
      P.retangulo(ax - 15, ay + 16, 30, 10, { fundo: PRETO, borda: false });
      P.texto(a.sigla, ax, ay + 21.5, { fam: "pesada", tam: 7, cor: "#fff", alinhar: "center", base: "middle", espacamento: 0.5 });
    });

    /* --- recursos --- */
    var rx = esq + 196, rw = larg - 196, ry = y;
    vm.recursos.forEach(function (r, i) {
      var by = ry + i * 56;
      P.retangulo(rx, by, rw, 50, { borda: PRETO, linha: 1.4, fundo: "rgba(255,255,255,0.85)" });
      P.retangulo(rx, by, 36, 50, { fundo: PRETO, borda: false });
      P.texto(r.sigla, rx + 18, by + 25, { fam: "pesada", tam: r.sigla.length > 2 ? 11 : 15, cor: "#fff", alinhar: "center", base: "middle" });
      P.texto(r.nome.toUpperCase(), rx + 42, by + 10, { fam: "pesada", tam: 6, cor: CINZA, espacamento: 0.3 });
      P.texto(String(r.atual), rx + 42, by + 37, { fam: "pesada", tam: 22, cor: PRETO });
      var wA = P.medir(String(r.atual), { fam: "pesada", tam: 22 });
      P.texto("/ " + r.max, rx + 46 + wA, by + 37, { fam: "pesada", tam: 13, cor: CINZA });
      /* barra do atual sobre o máximo */
      var bw = rw - 50, frac = r.max > 0 ? Math.max(0, Math.min(1, r.atual / r.max)) : 0;
      P.retangulo(rx + 42, by + 42, bw, 3.5, { borda: PRETO, linha: 0.4 });
      if (frac) P.retangulo(rx + 42, by + 42, bw * frac, 3.5, { fundo: PRETO, borda: false });
    });
    y = Math.max(cy + 90, ry + vm.recursos.length * 56) + 4;

    /* --- defesa e companhia --- */
    var sx = esq, sy = y;
    P.poligono([[sx, sy], [sx + 62, sy], [sx + 62, sy + 30], [sx + 31, sy + 46], [sx, sy + 30]], { fundo: PRETO });
    P.texto("DEFESA", sx + 31, sy + 9, { fam: "pesada", tam: 6.6, cor: "#fff", alinhar: "center", base: "middle", espacamento: 0.5 });
    P.texto(txt(vm.defesa), sx + 31, sy + 26, { fam: "pesada", tam: 19, cor: "#fff", alinhar: "center", base: "middle" });
    var mini = [["Bloqueio", vm.bloqueio], ["Esquiva", vm.esquiva], ["Deslocamento", vm.deslocamento !== undefined ? vm.deslocamento + " m" : ""], ["PE por rodada", vm.limitePe]];
    if (vm.recursos.some(function (r) { return r.sigla === "PD"; })) mini[3] = ["PD por rodada", vm.limitePe];
    var mw = (larg - 70) / mini.length;
    mini.forEach(function (m, i) {
      var mx = esq + 70 + i * mw;
      P.retangulo(mx, sy, mw - 6, 40, { borda: PRETO, linha: 1.1, fundo: "rgba(255,255,255,0.85)" });
      P.texto(m[0].toUpperCase(), mx + (mw - 6) / 2, sy + 9, { fam: "pesada", tam: 6, cor: CINZA, alinhar: "center", espacamento: 0.3, max: mw - 10 });
      P.texto(txt(m[1]) || "—", mx + (mw - 6) / 2, sy + 29, { fam: "pesada", tam: 15, cor: PRETO, alinhar: "center", max: mw - 10 });
    });
    y = sy + 52;

    /* --- resistências, proficiências, carga, condições --- */
    var linhas = [];
    linhas.push({ titulo: "Proficiências", texto: vm.proficiencias || "—" });
    if (vm.resistencias) linhas.push({ titulo: "Resistências a dano", texto: vm.resistencias });
    if (vm.carga) linhas.push({ titulo: "Carga (espaços)", direita: vm.carga });
    var resto = X.encaixar(P, linhas, { x: esq, y: y, w: larg, h: 64 }, Object.assign({}, ESTILO_ORDEM, { entre: 2.5 }));
    y = Math.max(resto.y, y) + 4;
    var sobras = [];
    if (resto.sobra.length) sobras.push({ titulo: "Proficiências e resistências", itens: resto.sobra });

    /* --- ataques --- */
    faixa(P, esq, y, larg, 14, "ATAQUES", { tam: 9 });
    y += 18;
    var colunas = [["Arma", 104], ["Teste", 84], ["Dano", 78], ["Crítico", 36], ["Alcance", 36]];
    var cxs = [], acc = esq;
    colunas.forEach(function (col) { cxs.push(acc); acc += col[1]; });
    colunas.forEach(function (col, i) { P.texto(col[0].toUpperCase(), cxs[i] + 2, y + 6, { fam: "pesada", tam: 6.2, cor: CINZA, espacamento: 0.3 }); });
    y += 10;
    var linhaH = 15, fimAtaques = H - 34;
    var cabem = Math.floor((fimAtaques - y) / linhaH);
    for (var i = 0; i < cabem; i++) {
      var ly = y + i * linhaH;
      P.linha(esq, ly + linhaH, esq + larg, ly + linhaH, { cor: "#999", linha: 0.5 });
      var at = vm.ataques[i];
      if (!at) continue;
      [at.arma, at.teste, at.dano, at.critico, at.alcance].forEach(function (v, k) {
        P.texto(v, cxs[k] + 2, ly + 10.5, { fam: "sans", tam: k === 0 ? 7.8 : 7.2, peso: k === 0 ? "bold" : "normal", cor: PRETO, max: colunas[k][1] - 4 });
      });
    }
    if (vm.ataques.length > cabem) {
      sobras.push({ titulo: "Ataques", itens: vm.ataques.slice(cabem).map(function (a) { return { titulo: a.arma, texto: ["Teste " + a.teste, "dano " + a.dano, "crítico " + a.critico, "alcance " + a.alcance].join(" · ") }; }) });
    }

    /* --- perícias, à direita --- */
    faixa(P, dir, 62, largDir, 16, "PERÍCIAS", { tam: 10 });
    var py = 84, fimP = H - 70;
    P.texto("GRAU", dir + 2, py + 5, { fam: "pesada", tam: 5.6, cor: CINZA });
    P.texto("TOTAL", dir + largDir - 2, py + 5, { fam: "pesada", tam: 5.6, cor: CINZA, alinhar: "right" });
    py += 9;
    var rowH = Math.min(22, (fimP - py) / Math.max(1, vm.pericias.length));
    vm.pericias.forEach(function (p, i) {
      var ly = py + i * rowH, meio = ly + rowH / 2;
      for (var g = 0; g < 3; g++) P.circulo(dir + 4 + g * 7, meio, 2.6, { fundo: g < p.nivel ? PRETO : "#fff", borda: PRETO, linha: 0.6 });
      P.texto(p.nome + (p.treinada ? "*" : "") + (p.carga ? "+" : ""), dir + 26, meio + 3, { fam: "sans", tam: Math.min(8.4, rowH * 0.42), peso: p.nivel ? "bold" : "normal", cor: PRETO, max: largDir - 80 });
      P.texto("(" + p.sigla + ")", dir + largDir - 34, meio + 3, { fam: "sans", tam: 6.4, cor: CINZA, alinhar: "right" });
      P.retangulo(dir + largDir - 28, meio - rowH * 0.36, 26, rowH * 0.72, { borda: PRETO, linha: 0.9, fundo: "#fff" });
      P.texto(sinal(p.total), dir + largDir - 15, meio + 3.2, { fam: "pesada", tam: Math.min(10, rowH * 0.5), cor: PRETO, alinhar: "center" });
      P.linha(dir + 24, ly + rowH, dir + largDir - 32, ly + rowH, { cor: "#c8c8c8", linha: 0.4 });
    });
    var ly2 = py + vm.pericias.length * rowH + 6;
    P.texto("● treinado  ●● veterano  ●●● expert", dir, ly2 + 6, { fam: "sans", tam: 6, cor: CINZA });
    P.texto("* só treinada   + penalidade de carga", dir, ly2 + 14, { fam: "sans", tam: 6, cor: CINZA });
    rodape(pg, vm);

    /* --- continuação: habilidades, rituais, inventário, descrição --- */
    var secoes = sobras.concat([
      { titulo: "Habilidades e poderes", itens: vm.habilidades },
      { titulo: vm.rotuloRituais, itens: vm.rituais },
      { titulo: "Inventário", itens: vm.inventario },
      { titulo: "Condições e efeitos", itens: vm.condicoes || [] },
      { titulo: "Configuração da ficha", itens: vm.extras },
      { titulo: "Descrição e campos personalizados", itens: vm.descricao },
      { titulo: "Anotações", itens: vm.anotacoes },
      { titulo: "Aliados", itens: vm.aliados },
    ]);
    X.fluir(doc, secoes, {
      caixas: [], novaPagina: paginaDeContinuacaoOrdem(vm), cabecalho: cabecalhoDeSecaoOrdem,
      estilo: ESTILO_ORDEM, alturaCabecalho: 18, entreSecoes: 8,
    });
  }

  /* =================================================================
     ORDEM II — DADOS
     ================================================================= */

  function dadosOrdem2(ficha) {
    var R = global.RAMAOrdem2, K = global.RAMAOrdem2Catalogo;
    var b = tentar(function () { return R.normalizar(ficha.ordem2); }, ficha.ordem2 || {});
    var vm = { nome: ficha.nome };
    vm.perfil = tentar(function () { return K.PERFIS[b.perfil].nome; }, "") || "";
    vm.ocupacao = (b.ocupacao && b.ocupacao.nome) || "";
    vm.nivel = b.nivel;
    vm.ambientacao = tentar(function () { return K.AMBIENTACOES[b.ambientacao].nome; }, b.ambientacao || "");
    vm.atributos = (K ? K.ORDEM_ATRIBUTOS : ["fisico", "mente", "emocao"]).map(function (k) {
      return { chave: k, nome: tentar(function () { return K.ATRIBUTOS[k].nome; }, k), dado: tentar(function () { return R.dadoDoAtributo(b, k); }, 6) };
    });
    var dadoAtr = {};
    vm.atributos.forEach(function (a) { dadoAtr[a.chave] = a; });
    vm.pericias = ((b.base && b.base.pericias) || []).map(function (p) {
      var atr = p.atributoImpresso || tentar(function () { return R.atributoBase(b, p.chave); }, "mente");
      var a = dadoAtr[atr] || { nome: atr, dado: 6 };
      return { nome: p.rotuloImpresso || tentar(function () { return R.nomeDaPericia(b, p); }, p.chave), dado: tentar(function () { return R.dadoDaPericia(b, p); }, p.dado), atributo: a.nome, dadoAtributo: a.dado };
    });
    vm.pv = { atual: tentar(function () { return b.recursos.pv.atual; }, 0), max: tentar(function () { return R.pvMax(b); }, 0), naoLetal: tentar(function () { return b.recursos.naoLetal; }, 0) };
    vm.pd = { atual: tentar(function () { return b.recursos.pd.atual; }, 0), max: tentar(function () { return R.pdMax(b); }, 0) };
    vm.armadura = { atual: tentar(function () { return R.armaduraAtual(b); }, 0), max: tentar(function () { return R.armaduraMax(b); }, 0) };
    vm.habilidades = (b.habilidades || []).map(function (h) {
      var meta = [h.origemEvolucao ? "Evolução: " + h.origemEvolucao : "", h.personalizada ? "personalizada" : "", h.estado && h.estado.indisponivel ? "indisponível" : ""].filter(Boolean).join(" · ");
      return { titulo: h.nome, meta: meta, texto: X.semHtml(h.texto) };
    });
    vm.itens = (b.itens || []).map(function (i) {
      var meta = [i.tipo === "arma" ? "Arma " + (i.alcance === "distancia" ? "à distância" : "corpo a corpo") + (i.dano ? " · dano " + i.dano : "") : "", i.armadura ? "Armadura " + i.armadura + (i.vestido ? " (vestida)" : "") : "", i.categoria, i.quantidade !== null && i.quantidade !== undefined ? "×" + i.quantidade : "", i.consumivel].filter(Boolean).join(" · ");
      return { titulo: i.nome, meta: meta, texto: [i.especial, i.descricao].filter(Boolean).join("\n") };
    });
    vm.relacoes = (b.relacoes || []).map(function (r) {
      return { titulo: r.nome || "Relação", direita: "grau " + r.grau, meta: r.rotulo, texto: r.descricao };
    });
    var est = b.estado || {};
    vm.estado = [];
    if (est.pavor) vm.estado.push({ titulo: "Pavor", direita: String(est.pavor) });
    function linhaDe(tabela, ref) { return tentar(function () { return tabela.filter(function (x) { return x.id === ref; })[0]; }, null) || {}; }
    (est.lesoes || []).forEach(function (l) { var d = linhaDe(K.LESOES, l.ref); vm.estado.push({ titulo: "Lesão: " + (l.nome || d.nome || l.ref), meta: l.curado ? "curada" : "", texto: d.texto || "" }); });
    (est.traumas || []).forEach(function (l) { var d = linhaDe(K.TRAUMAS, l.ref); vm.estado.push({ titulo: "Trauma: " + (l.nome || d.nome || l.ref), meta: l.curado ? "curado" : "", texto: d.texto || "" }); });
    ["inconsciente", "moribundo", "caido", "morto", "colapso"].forEach(function (k) { if (est[k]) vm.estado.push({ titulo: k.charAt(0).toUpperCase() + k.slice(1) }); });
    vm.rituais = tentar(function () {
      return (b.paranormal.rituais || []).map(function (r) { var nome = typeof r === "string" ? r : (r.nome || r.ref || r.chave || ""); return { titulo: nome, texto: typeof r === "object" ? (r.texto || r.descricao || "") : "" }; });
    }, []);
    vm.narrativa = [
      b.idade ? { titulo: "Idade", texto: b.idade } : null,
      b.resumo ? { titulo: "Resumo", texto: b.resumo } : null,
      b.aparencia ? { titulo: "Aparência", texto: b.aparencia } : null,
      b.historia ? { titulo: "História", texto: b.historia } : null,
    ].filter(Boolean);
    vm.evolucao = tentar(function () { return (b.evolucao.registros || []).map(function (r) { return { titulo: r.titulo || r.nome || ("Nível " + (r.nivel || "")), texto: r.texto || r.descricao || "" }; }); }, []);
    vm.anotacoes = X.itensDasAnotacoes(ficha);
    vm.aliados = X.itensDosAliados(ficha);
    return vm;
  }

  /* =================================================================
     ORDEM II — DESENHO
     ================================================================= */

  var FUNDO2 = "#0e1015", AZUL = "#3f7fd6", AZUL_CLARO = "#8db7f0", BRANCO = "#f2f2f2", CINZA2 = "#9aa3b2";

  function fundoOrdem2(pg) {
    var P = pg.P, W = pg.largura, H = pg.altura;
    P.retangulo(0, 0, W, H, { fundo: FUNDO2, borda: false });
    var r = X.semente("o2" + pg.n);
    var c = P.ctx;
    c.save();
    for (var i = 0; i < 900; i++) { c.globalAlpha = 0.05 + r() * 0.07; c.fillStyle = "#fff"; var s = r() * 1.1 + 0.2; c.fillRect(r() * W, r() * H, s, s); }
    c.restore();
    /* moldura dupla com dentes nos cantos */
    P.retangulo(16, 16, W - 32, H - 32, { borda: AZUL, linha: 1.3 });
    P.retangulo(22, 22, W - 44, H - 44, { borda: AZUL, linha: 0.6 });
    [[16, 16], [W - 16, 16], [16, H - 16], [W - 16, H - 16]].forEach(function (p, i) {
      var sx = i % 2 ? -1 : 1, sy = i < 2 ? 1 : -1;
      P.linha(p[0] - sx * 6, p[1] + sy * 10, p[0] + sx * 10, p[1] + sy * 10, { cor: AZUL, linha: 1 });
      P.linha(p[0] + sx * 10, p[1] - sy * 6, p[0] + sx * 10, p[1] + sy * 10, { cor: AZUL, linha: 1 });
    });
  }

  function aba(P, x, y, texto, tam) {
    var t = tam || 11;
    var w = P.medir(texto, { fam: "pesada", tam: t }) + 16;
    P.poligono([[x, y + 2], [x + w + 4, y], [x + w, y + t + 9], [x - 2, y + t + 8]], { fundo: AZUL });
    P.texto(texto, x + 7, y + t + 3, { fam: "pesada", tam: t, cor: BRANCO, espacamento: 0.6 });
    return w;
  }

  /* O dado como figura: d4 triângulo, d6 quadrado, d8 losango, d10/d12/d20 pentágono. */
  function figuraDoDado(P, cx, cy, r, faces, op) {
    var o = op || {}, pts, forma = o.forma || faces;
    if (forma <= 4) pts = [[cx, cy - r], [cx + r * 0.95, cy + r * 0.7], [cx - r * 0.95, cy + r * 0.7]];
    else if (forma <= 6) pts = [[cx - r * 0.8, cy - r * 0.8], [cx + r * 0.8, cy - r * 0.8], [cx + r * 0.8, cy + r * 0.8], [cx - r * 0.8, cy + r * 0.8]];
    else if (forma <= 8) pts = [[cx, cy - r], [cx + r, cy], [cx, cy + r], [cx - r, cy]];
    else { pts = []; for (var i = 0; i < 5; i++) { var a = -Math.PI / 2 + i * 2 * Math.PI / 5; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } }
    P.poligono(pts, { fundo: o.fundo || AZUL, borda: o.borda || null, linha: 0.8 });
    P.texto(String(faces), cx, cy + (forma <= 4 ? r * 0.22 : 0.5), { fam: "pesada", tam: o.tam || r * 0.95, cor: o.cor || BRANCO, alinhar: "center", base: "middle" });
  }

  /* Quadradinhos de PV/PD: os gastos ficam vazios, como na ficha. */
  function quadradinhos(P, x, y, max, atual, largura) {
    var lado = 7, passo = 9.2, porLinha = Math.max(1, Math.floor(largura / passo));
    for (var i = 0; i < max; i++) {
      var qx = x + (i % porLinha) * passo, qy = y + Math.floor(i / porLinha) * passo;
      P.retangulo(qx, qy, lado, lado, { fundo: i < atual ? BRANCO : null, borda: BRANCO, linha: 0.6 });
    }
    return Math.ceil(max / porLinha) * passo;
  }

  var ESTILO_O2 = { fam: "sans", famTitulo: "pesada", tamTitulo: 9.5, pesoTitulo: "normal", tamTexto: 7.8, tamMeta: 6.6, cor: BRANCO, corTitulo: AZUL_CLARO, corMeta: CINZA2, corDireita: AZUL_CLARO };

  function cabecalhoDeSecaoO2(P, secao, rect, cont) {
    aba(P, rect.x, rect.y, (secao.titulo + (cont ? " (cont.)" : "")).toUpperCase(), 9);
    P.linha(rect.x, rect.y + 18.5, rect.x + rect.w, rect.y + 18.5, { cor: AZUL, linha: 0.6 });
    return 24;
  }

  function paginaDeContinuacaoO2(vm) {
    return function (doc) {
      var pg = doc.pagina("paisagem");
      fundoOrdem2(pg);
      var P = pg.P, W = pg.largura, H = pg.altura;
      P.texto((vm.nome || "").toUpperCase(), 40, 56, { fam: "pesada", tam: 22, cor: AZUL, espacamento: 1, max: W / 2 });
      P.texto("ORDEM PARANORMAL RPG II · EXPERIMENTAL · continuação · página " + pg.n, W - 40, 52, { fam: "sans", tam: 7, cor: CINZA2, alinhar: "right" });
      P.linha(40, 64, W - 40, 64, { cor: AZUL, linha: 0.8 });
      var cw = (W - 80 - 40) / 3;
      return [0, 1, 2].map(function (i) { return { x: 40 + i * (cw + 20), y: 74, w: cw, h: H - 74 - 40 }; });
    };
  }

  function desenharOrdem2(doc, ficha, ctx) {
    var vm = dadosOrdem2(ficha);
    var pg = doc.pagina("paisagem");
    fundoOrdem2(pg);
    var P = pg.P, W = pg.largura, H = pg.altura;

    /* retrato ao centro, quando a ficha tem um */
    var fx = W * 0.39, fw = W * 0.22;
    if (ctx.foto) {
      P.imagem(ctx.foto, fx, 70, fw, H - 110, {});
      var c = P.ctx, g = c.createLinearGradient(0, H - 140, 0, H - 40);
      g.addColorStop(0, "rgba(14,16,21,0)"); g.addColorStop(1, "rgba(14,16,21,1)");
      c.fillStyle = g; c.fillRect(fx, H - 140, fw, 100);
    } else {
      /* sem retrato: uma silhueta discreta no lugar da arte */
      var sx = fx + fw / 2, c2 = P.ctx;
      c2.save();
      c2.fillStyle = "rgba(63,127,214,0.10)";
      c2.beginPath(); c2.ellipse(sx, 190, 34, 42, 0, 0, Math.PI * 2); c2.fill();
      c2.beginPath(); c2.moveTo(sx - 30, 236); c2.quadraticCurveTo(sx - 92, 250, sx - 96, 340); c2.lineTo(sx - 100, H - 40); c2.lineTo(sx + 100, H - 40); c2.lineTo(sx + 96, 340); c2.quadraticCurveTo(sx + 92, 250, sx + 30, 236); c2.closePath(); c2.fill();
      c2.restore();
    }

    /* nome e identificação */
    P.texto((vm.nome || "").toUpperCase(), fx + 4, 78, { fam: "pesada", tam: 34, cor: AZUL, alinhar: "right", max: fx - 50, espacamento: 1 });
    P.linha(60, 88, fx + 10, 88, { cor: AZUL, linha: 0.8 });
    var ix = fx + fw - 4;
    var wPerfil = vm.perfil ? aba(P, ix, 50, vm.perfil.toUpperCase(), 12) : 0;
    var tx = ix + wPerfil + 14;
    P.texto(((vm.ocupacao ? "• " + vm.ocupacao.toUpperCase() + "  " : "") + "• NÍVEL"), tx, 66, { fam: "sans", tam: 8.5, peso: "bold", cor: BRANCO, max: W - 60 - tx - 30 });
    P.retangulo(W - 66, 48, 26, 26, { fundo: AZUL, borda: false });
    P.texto(String(vm.nivel || 1), W - 53, 62, { fam: "pesada", tam: 17, cor: BRANCO, alinhar: "center", base: "middle" });
    P.linha(ix, 88, W - 40, 88, { cor: AZUL, linha: 0.8 });
    P.texto("ORDEM PARANORMAL RPG II · EDIÇÃO EXPERIMENTAL" + (vm.ambientacao ? " · " + vm.ambientacao.toUpperCase() : ""), 42, 40, { fam: "sans", tam: 6.4, cor: CINZA2, espacamento: 0.6 });

    /* atributos */
    aba(P, 48, 100, "ATRIBUTOS", 11);
    vm.atributos.forEach(function (a, i) {
      var ay = 112 + i * 26, ax = 230 - i * 12;
      P.texto(a.nome.toUpperCase(), ax - 22, ay + 9, { fam: "pesada", tam: 18, cor: BRANCO, alinhar: "right" });
      figuraDoDado(P, ax, ay + 2, 11, a.dado, { tam: 9.5, forma: 8 });
    });

    /* perícias */
    var py = 190;
    aba(P, 48, py, "PERÍCIAS", 11);
    py += 24;
    var fimPer = H - 34;
    var rowH = Math.min(17, (fimPer - py) / Math.max(1, vm.pericias.length));
    vm.pericias.forEach(function (p, i) {
      var ly = py + i * rowH + rowH / 2;
      P.texto(p.nome.toUpperCase(), 168, ly + 2.8, { fam: "mono", tam: Math.min(8.4, rowH * 0.58), peso: "bold", cor: BRANCO, alinhar: "right", max: 128 });
      figuraDoDado(P, 179, ly, Math.min(6.8, rowH * 0.44), p.dado, { tam: Math.min(6.4, rowH * 0.42) });
      P.texto("+", 191, ly + 2.8, { fam: "sans", tam: 9, cor: AZUL_CLARO, alinhar: "center" });
      figuraDoDado(P, 202, ly, Math.min(5.6, rowH * 0.36), p.dadoAtributo, { tam: Math.min(5.2, rowH * 0.34), forma: 8 });
      P.texto(p.atributo.toUpperCase(), 211, ly + 2.6, { fam: "sans", tam: 6.4, cor: AZUL_CLARO, max: 60 });
    });

    /* PV e PD */
    var rx = fx + fw + 10, rw = (W - 40 - rx) / 2 - 8;
    [["PV", vm.pv], ["PD", vm.pd]].forEach(function (par, i) {
      var bx = rx + i * (rw + 16), by = 100;
      aba(P, bx, by, par[0], 12);
      P.texto(String(par[1].max), bx + 42, by + 17, { fam: "pesada", tam: 15, cor: BRANCO });
      P.texto("atual " + par[1].atual, bx + 42, by + 27, { fam: "sans", tam: 6.2, cor: CINZA2 });
      quadradinhos(P, bx + 78, by + 2, par[1].max, par[1].atual, rw - 80);
    });
    var extras = [];
    if (vm.armadura.max) extras.push("Armadura " + vm.armadura.atual + "/" + vm.armadura.max);
    if (vm.pv.naoLetal) extras.push("Dano não letal " + vm.pv.naoLetal);
    if (extras.length) P.texto(extras.join("   ·   "), rx, 176, { fam: "sans", tam: 7, cor: AZUL_CLARO });

    /* habilidades à direita e o que mais couber */
    var secoes = [
      { titulo: "Habilidades", itens: vm.habilidades },
      { titulo: "Itens", itens: vm.itens },
      { titulo: "Paranormal", itens: vm.rituais },
      { titulo: "Lesões, traumas e pavor", itens: vm.estado },
      { titulo: "Relações", itens: vm.relacoes },
      { titulo: "Evolução", itens: vm.evolucao },
      { titulo: "A personagem", itens: vm.narrativa },
      { titulo: "Anotações", itens: vm.anotacoes },
      { titulo: "Aliados", itens: vm.aliados },
    ];
    X.fluir(doc, secoes, {
      caixas: [{ x: rx, y: 188, w: W - 40 - rx, h: H - 40 - 188 }],
      novaPagina: paginaDeContinuacaoO2(vm), cabecalho: cabecalhoDeSecaoO2,
      estilo: ESTILO_O2, alturaCabecalho: 24, entreSecoes: 8,
    });
  }

  X.registrar("ordem", { orientacao: "retrato", desenhar: desenharOrdem, dados: dadosOrdem });
  X.registrar("ordem2", { orientacao: "paisagem", desenhar: desenharOrdem2, dados: dadosOrdem2 });
})(typeof window !== "undefined" ? window : globalThis);
