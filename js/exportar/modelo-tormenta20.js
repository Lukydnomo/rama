/* =====================================================================
   R.A.M.A. — exportação: Tormenta20 (Jogo do Ano)
   ---------------------------------------------------------------------
   Vertical, papel claro, detalhes vermelhos e molduras de fantasia.
   Personagem, jogador, raça, origem, classe e nível, divindade no alto;
   os seis atributos em destaque; PV, PM, ataques e Defesa na área
   principal; perícias numa coluna lateral; equipamento embaixo. A
   continuação traz descrição, habilidades de raça e origem, de classe,
   poderes, magias e anotações. Números de RAMATormenta20.calcular().
   ===================================================================== */

(function (global) {
  "use strict";

  var X = global.RAMAExportar;
  var txt = X.txt, sinal = X.sinal;
  var TINTA = "#1f1a17", VERMELHO = "#a3161b", ESCURO = "#6e0f12", PAPEL = "#fbf8f2", SUAVE = "#7b726a";
  var M = 22;

  function tentar(fn, padrao) { try { var v = fn(); return v === undefined ? padrao : v; } catch (e) { return padrao; } }

  function dadosT20(ficha) {
    var R = global.RAMATormenta20, D = global.RAMATormenta20Dados, RA = global.RAMATormenta20Racas, CL = global.RAMATormenta20Classes,
      OR = global.RAMATormenta20Origens, DE = global.RAMATormenta20Deuses, MG = global.RAMATormenta20Magias;
    var t = tentar(function () { return R.normalizar(ficha.tormenta20); }, ficha.tormenta20 || {});
    var c = tentar(function () { return R.calcular(t); }, null) || {};
    var vm = { nome: ficha.nome };
    vm.raca = tentar(function () { return RA.RACA[t.raca.id].nome; }, "");
    vm.origem = tentar(function () { return t.origem.propria ? (t.origem.propria.nome || "Origem própria") : OR.ORIGEM[t.origem.id].nome; }, "");
    vm.classe = tentar(function () { return Object.keys(c.niveisClasse || {}).map(function (k) { return (CL.CLASSE[k] || { nome: k }).nome + " " + c.niveisClasse[k]; }).join(" / "); }, "");
    vm.nivel = c.nivel || 1;
    vm.divindade = tentar(function () { return DE.DEUS[t.divindade.id].nome; }, "");
    vm.atributos = (D ? D.ATRIBUTOS : []).map(function (a) { return { sigla: a.curto.toUpperCase(), valor: tentar(function () { return c.atributos[a.chave].total; }, 0) }; });
    vm.pv = c.pv || { max: 0, atual: 0 };
    vm.pm = c.pm || { max: 0, atual: 0 };
    vm.defesa = tentar(function () { return c.defesa.total; }, 10);
    vm.defesaParcelas = tentar(function () { return c.defesa.parcelas.map(function (p) { return p.rotulo + " " + sinal(p.valor); }).join(", "); }, "");
    vm.penalidade = tentar(function () { return c.penalidadeArmadura.total; }, 0);
    vm.deslocamento = tentar(function () { return c.deslocamento.terrestre + "m" + (c.deslocamento.outros && c.deslocamento.outros.length ? " · " + c.deslocamento.outros.map(function (o) { return (o.nome || o.tipo) + " " + o.valor + "m"; }).join(", ") : ""); }, "");
    vm.tamanho = tentar(function () { return c.tamanho.nome; }, "");
    vm.xp = t.xp || 0;
    vm.proximoXp = c.proximoNivelXp;
    vm.carga = c.carga ? c.carga.usada + " / " + c.carga.limite + " (máx. " + c.carga.maximo + ")" : "";
    vm.tibar = tentar(function () { return t.inventario.tibar; }, 0);
    var prof = c.proficiencias || {};
    var nomesProf = { simples: "Armas simples", marciais: "Armas marciais", marciaisCorpo: "Marciais corpo a corpo", marciaisDistancia: "Marciais à distância", exoticas: "Armas exóticas", fogo: "Armas de fogo", leves: "Armaduras leves", pesadas: "Armaduras pesadas", escudos: "Escudos" };
    vm.proficiencias = Object.keys(prof).filter(function (k) { return prof[k]; }).map(function (k) { return nomesProf[k] || k; }).join(", ");
    vm.defesasExtras = [c.rd && Object.keys(c.rd).length ? "RD: " + Object.keys(c.rd).map(function (k) { return k + " " + c.rd[k]; }).join(", ") : "", (c.resistencias || []).length ? "Resistências: " + c.resistencias.map(function (r) { return r.nome || r; }).join(", ") : "", (c.imunidades || []).length ? "Imunidades: " + c.imunidades.join(", ") : "", (c.sentidos || []).length ? "Sentidos: " + c.sentidos.map(function (s) { return s.nome || s; }).join(", ") : ""].filter(Boolean).join(" · ");
    var pers = c.pericias || {};
    vm.pericias = Object.keys(pers).map(function (k) { return pers[k]; }).sort(function (a, b) { return a.nome.localeCompare(b.nome, "pt"); }).map(function (p) {
      return { nome: p.nome, total: p.total, atributo: tentar(function () { return D.ATRIBUTOS.filter(function (a) { return a.chave === p.atributo; })[0].curto; }, p.atributo), treinado: p.treinado, somenteTreinada: p.somenteTreinada, armadura: p.armadura };
    });
    vm.ataques = (c.ataques || []).map(function (a) {
      return { nome: a.nome, teste: sinal(a.ataque), dano: txt(a.dano) + (a.extras && a.extras.length ? " + " + a.extras.map(function (e) { return e.dados + (e.tipo ? " " + e.tipo : ""); }).join(" + ") : ""), critico: (a.margem && a.margem < 20 ? a.margem + "/" : "") + "x" + (a.mult || 2), tipo: a.tipo || "", alcance: a.alcance || "—" };
    });
    vm.equipamento = tentar(function () { return t.inventario.itens; }, []).map(function (it) {
      var nome = tentar(function () { return R.nomeDoItem(it); }, it.nome) || it.nome || it.ref;
      var esp = tentar(function () { return R.espacosDoItem(it); }, "");
      return { nome: nome + (it.quantidade > 1 ? " ×" + it.quantidade : ""), espacos: esp, estado: it.estado, notas: it.notas };
    });
    var fontes = c.fontes || [];
    function itemDaFonte(f) {
      var a = f.def && (f.def.acao || f.def.reacao);
      return { titulo: f.nome, meta: [f.origem, a && a.custo ? a.custo + " PM" : "", f.def && f.def.fonte && f.def.fonte.pagina ? "p. " + f.def.fonte.pagina : (f.def && f.def.pagina ? "p. " + f.def.pagina : "")].filter(Boolean).join(" · "), texto: (f.def && (f.def.resumo || f.def.texto)) || "" };
    }
    function ehPoder(f) { return f.categoria === "poder" || !!f.poderId || f.tipoFonte === "deus"; }
    vm.racaOrigem = fontes.filter(function (f) { return (f.tipoFonte === "raca" || f.tipoFonte === "origem") && !ehPoder(f); }).map(itemDaFonte);
    vm.classeHab = fontes.filter(function (f) { return f.tipoFonte === "classe" && !ehPoder(f); }).map(itemDaFonte);
    vm.poderes = fontes.filter(ehPoder).map(itemDaFonte);
    vm.outras = fontes.filter(function (f) { return !ehPoder(f) && ["raca", "origem", "classe"].indexOf(f.tipoFonte) < 0; }).map(itemDaFonte);
    vm.magias = (t.magias || []).map(function (m) {
      var d = MG && MG.MAGIA ? MG.MAGIA[m.id] : null;
      if (!d) return { titulo: m.id };
      var b = d.base || {};
      return {
        titulo: d.nome, direita: d.circulo + "º círculo",
        meta: [d.tipo, d.escola, b.ex ? "Execução " + b.ex : "", b.al ? "Alcance " + b.al : "", b.alvo ? "Alvo " + b.alvo : "", b.area ? "Área " + b.area : "", b.du ? "Duração " + b.du : "", b.res ? "Resistência " + b.res : "", m.memorizada ? "memorizada" : ""].filter(Boolean).join(" · "),
        texto: [d.resumo].concat((d.aprimoramentos || []).map(function (a) { return (a.tipo === "T" ? "Truque" : "+" + a.custo + " PM") + ": " + a.texto; })).filter(Boolean).join("\n"),
      };
    });
    vm.condicoes = (c.condicoes || []).map(function (x) { return { titulo: x.nome, meta: x.duracao || "" }; });
    vm.descricao = [t.idade ? { titulo: "Idade", texto: String(t.idade) } : null, t.alinhamento ? { titulo: "Alinhamento", texto: t.alinhamento } : null].filter(Boolean);
    vm.parceiros = (t.parceiros || []).map(function (p) { return { titulo: p.nome || p.tipo || "Parceiro", meta: [p.tipo, p.patamar].filter(Boolean).join(" · "), texto: p.notas || "" }; });
    vm.itensDetalhes = vm.equipamento.filter(function (e) { return e.notas; }).map(function (e) { return { titulo: e.nome, texto: e.notas }; });
    vm.anotacoes = X.itensDasAnotacoes(ficha);
    vm.aliados = X.itensDosAliados(ficha);
    return vm;
  }

  /* Moldura de fantasia: borda dupla com cantos chanfrados em vermelho. */
  function moldura(P, x, y, w, h, op) {
    var o = op || {}, k = o.canto || 6;
    var pts = [[x + k, y], [x + w - k, y], [x + w, y + k], [x + w, y + h - k], [x + w - k, y + h], [x + k, y + h], [x, y + h - k], [x, y + k]];
    P.poligono(pts, { fundo: o.fundo || "#fff", borda: o.borda || TINTA, linha: o.linha || 0.9 });
    if (o.vermelho) {
      [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].forEach(function (p, i) {
        var sx = i % 2 ? -1 : 1, sy = i < 2 ? 1 : -1;
        P.poligono([[p[0], p[1] + sy * k * 2.2], [p[0], p[1]], [p[0] + sx * k * 2.2, p[1]], [p[0] + sx * k, p[1] + sy * k]], { fundo: VERMELHO });
      });
    }
  }

  function rotulo(P, s, x, y, op) {
    P.texto(String(s).toUpperCase(), x, y, Object.assign({ fam: "classica", tam: 6.4, peso: "bold", cor: SUAVE, espacamento: 0.5 }, op || {}));
  }

  function faixaVermelha(P, x, y, w, texto) {
    P.poligono([[x, y], [x + w, y], [x + w - 6, y + 13], [x + 6, y + 13]], { fundo: VERMELHO });
    P.texto(texto.toUpperCase(), x + w / 2, y + 9.6, { fam: "classica", tam: 8, peso: "bold", cor: "#fff", alinhar: "center", espacamento: 1.2 });
  }

  var ESTILO = { fam: "classica", famTitulo: "classica", tamTitulo: 8.8, tamTexto: 7.6, tamMeta: 6.6, cor: TINTA, corTitulo: ESCURO, corMeta: SUAVE, corDireita: VERMELHO };

  function fundo(pg) {
    pg.P.retangulo(0, 0, pg.largura, pg.altura, { fundo: PAPEL, borda: false });
    pg.P.retangulo(10, 10, pg.largura - 20, pg.altura - 20, { borda: VERMELHO, linha: 2 });
    pg.P.retangulo(14, 14, pg.largura - 28, pg.altura - 28, { borda: TINTA, linha: 0.5 });
  }

  function desenharT20(doc, ficha, ctx) {
    var vm = dadosT20(ficha);
    var pg = doc.pagina("retrato"), P = pg.P, W = pg.largura, H = pg.altura;
    fundo(pg);

    /* identificação */
    P.texto("TORMENTA", W - M - 46, 46, { fam: "classica", tam: 26, peso: "bold", cor: VERMELHO, alinhar: "right", espacamento: 1 });
    P.texto("20", W - M - 6, 46, { fam: "classica", tam: 26, peso: "bold", cor: TINTA, alinhar: "right" });
    P.texto("JOGO DO ANO", W - M - 6, 56, { fam: "classica", tam: 6.5, cor: SUAVE, alinhar: "right", espacamento: 2 });
    moldura(P, M + 4, 24, 300, 30, { vermelho: true });
    rotulo(P, "Personagem", M + 12, 34);
    P.texto(vm.nome || "", M + 12, 49, { fam: "classica", tam: 14, peso: "bold", cor: TINTA, max: 282 });
    var linha = [["Raça", vm.raca], ["Origem", vm.origem], ["Classe & nível", vm.classe || "Nível " + vm.nivel], ["Divindade", vm.divindade || "—"]];
    var lw = (W - 2 * M - 8) / 4;
    linha.forEach(function (l, i) {
      var x = M + 4 + i * lw;
      P.texto(l[1] || "", x + 4, 74, { fam: "classica", tam: 9.4, peso: "bold", cor: TINTA, max: lw - 12 });
      P.linha(x + 2, 78, x + lw - 6, 78, { cor: TINTA, linha: 0.6 });
      rotulo(P, l[0], x + 4, 86);
    });
    if (ctx.campanha) rotulo(P, "Campanha: " + ctx.campanha, W - M - 6, 64, { tam: 5.6, alinhar: "right", max: 220 });

    /* atributos */
    var ay = 96, aw = 60, ag = (W - 2 * M - 8 - 6 * aw) / 5;
    vm.atributos.forEach(function (a, i) {
      var x = M + 4 + i * (aw + ag);
      moldura(P, x, ay + 8, aw, 48, { vermelho: true, linha: 1.2 });
      P.retangulo(x + aw / 2 - 18, ay, 36, 13, { fundo: TINTA, borda: false, raio: 3 });
      P.texto(a.sigla, x + aw / 2, ay + 9.8, { fam: "classica", tam: 8.6, peso: "bold", cor: "#fff", alinhar: "center" });
      P.texto(sinal(a.valor).replace("+0", "0"), x + aw / 2, ay + 40, { fam: "classica", tam: 24, peso: "bold", cor: TINTA, alinhar: "center", base: "middle" });
    });

    var esq = M + 4, larg = 370, dir = esq + larg + 10, largDir = W - M - 4 - dir;
    var y = 166;
    /* PV e PM */
    [["Pontos de Vida", vm.pv], ["Pontos de Mana", vm.pm]].forEach(function (r, i) {
      var x = esq + i * (larg / 2 + 2), w = larg / 2 - 4;
      moldura(P, x, y, w, 58, { vermelho: true });
      faixaVermelha(P, x + w / 2 - 50, y - 6, 100, r[0]);
      P.texto(String(r[1].atual), x + w * 0.3, y + 38, { fam: "classica", tam: 22, peso: "bold", cor: TINTA, alinhar: "center" });
      P.texto(String(r[1].max), x + w * 0.72, y + 38, { fam: "classica", tam: 16, cor: TINTA, alinhar: "center" });
      rotulo(P, "Atuais", x + w * 0.3, y + 51, { alinhar: "center" });
      rotulo(P, "Máximos" + (r[1].temp ? " · temp. " + r[1].temp : ""), x + w * 0.72, y + 51, { alinhar: "center" });
    });
    y += 70;

    /* ataques */
    var linhas = Math.max(6, Math.min(10, vm.ataques.length));
    var ah = 22 + linhas * 13;
    moldura(P, esq, y, larg, ah, {});
    faixaVermelha(P, esq + 8, y - 6, 80, "Ataques");
    var cols = [["Ataque", 0], ["Teste", 0.36], ["Dano", 0.48], ["Crítico", 0.70], ["Tipo", 0.81], ["Alcance", 0.89]];
    cols.forEach(function (cc) { rotulo(P, cc[0], esq + 8 + cc[1] * (larg - 16), y + 16, { tam: 5.8 }); });
    for (var i = 0; i < linhas; i++) {
      var ly = y + 20 + i * 13;
      P.linha(esq + 6, ly + 11, esq + larg - 6, ly + 11, { cor: "#cfc5b8", linha: 0.5 });
      var a = vm.ataques[i];
      if (!a) continue;
      [a.nome, a.teste, a.dano, a.critico, a.tipo, a.alcance].forEach(function (v, k) {
        var x0 = esq + 8 + cols[k][1] * (larg - 16), x1 = k < 5 ? esq + 8 + cols[k + 1][1] * (larg - 16) : esq + larg - 6;
        P.texto(v, x0, ly + 9, { fam: "classica", tam: 7.2, peso: k === 0 ? "bold" : "normal", cor: TINTA, max: x1 - x0 - 4 });
      });
    }
    var sobras = [];
    if (vm.ataques.length > linhas) sobras.push({ titulo: "Ataques", itens: vm.ataques.slice(linhas).map(function (x) { return { titulo: x.nome, texto: [x.teste, x.dano, x.critico, x.tipo, x.alcance].join(" · ") }; }) });
    y += ah + 12;

    /* defesa, proficiências, tamanho/deslocamento */
    moldura(P, esq, y, 92, 80, { vermelho: true, linha: 1.4 });
    faixaVermelha(P, esq + 6, y - 6, 80, "Defesa");
    P.texto(String(vm.defesa), esq + 46, y + 46, { fam: "classica", tam: 30, peso: "bold", cor: TINTA, alinhar: "center", base: "middle" });
    rotulo(P, vm.penalidade ? "Penalidade " + vm.penalidade : "", esq + 46, y + 74, { alinhar: "center", tam: 5.6 });
    var px = esq + 100, pw = larg - 100;
    moldura(P, px, y, pw, 80, {});
    faixaVermelha(P, px + 8, y - 6, 100, "Proficiências");
    var rp = X.encaixar(P, [
      { texto: vm.proficiencias || "—" },
      vm.defesaParcelas ? { meta: "Defesa: " + vm.defesaParcelas } : null,
      vm.defesasExtras ? { meta: vm.defesasExtras } : null,
    ], { x: px + 8, y: y + 12, w: pw - 16, h: 64 }, Object.assign({}, ESTILO, { entre: 2 }));
    if (rp.sobra.length) sobras.push({ titulo: "Proficiências e defesas", itens: rp.sobra });
    y += 92;
    var mini = [["Tamanho", vm.tamanho], ["Deslocamento", vm.deslocamento], ["Experiência", vm.xp + (vm.proximoXp ? " / " + vm.proximoXp : "")]];
    var mw = (larg - 12) / 3;
    mini.forEach(function (m, i) {
      var x = esq + i * (mw + 6);
      moldura(P, x, y, mw, 34, {});
      rotulo(P, m[0], x + 7, y + 10);
      P.texto(m[1] || "—", x + mw / 2, y + 27, { fam: "classica", tam: 10.5, peso: "bold", cor: TINTA, alinhar: "center", max: mw - 12 });
    });
    y += 46;

    /* perícias à direita */
    moldura(P, dir, 166, largDir, y - 166 - 10, {});
    faixaVermelha(P, dir + 8, 160, largDir - 16, "Perícias");
    var py = 182, n = Math.max(1, vm.pericias.length);
    var rh = Math.min(13, (y - 10 - py - 14) / n);
    rotulo(P, "Total", dir + largDir - 10, py - 2, { alinhar: "right", tam: 5.4 });
    vm.pericias.forEach(function (p, i) {
      var ly = py + i * rh + rh / 2;
      P.circulo(dir + 9, ly, 2.4, { fundo: p.treinado ? VERMELHO : null, borda: TINTA, linha: 0.5 });
      P.texto(p.nome + (p.somenteTreinada ? "*" : "") + (p.armadura ? "+" : ""), dir + 15, ly + 2.4, { fam: "classica", tam: Math.min(7.2, rh * 0.62), cor: TINTA, max: largDir - 66 });
      P.texto(p.atributo, dir + largDir - 34, ly + 2.2, { fam: "classica", tam: 5.8, cor: SUAVE, alinhar: "right" });
      P.retangulo(dir + largDir - 30, ly - rh * 0.4, 22, rh * 0.8, { borda: TINTA, linha: 0.6, fundo: "#fff" });
      P.texto(sinal(p.total), dir + largDir - 19, ly + 2.4, { fam: "classica", tam: Math.min(7.6, rh * 0.62), peso: "bold", cor: TINTA, alinhar: "center" });
    });
    rotulo(P, "● treinado · * só treinado · + armadura", dir + 8, y - 14, { tam: 5, max: largDir - 14 });

    /* equipamento */
    var eh = H - 30 - y;
    moldura(P, esq, y, W - 2 * M - 8, eh, {});
    faixaVermelha(P, W / 2 - 60, y - 6, 120, "Equipamento");
    var ew = (W - 2 * M - 8 - 24) / 2;
    var porColuna = Math.floor((eh - 40) / 12);
    for (var k = 0; k < porColuna * 2; k++) {
      var cx = esq + 8 + Math.floor(k / porColuna) * (ew + 8), cy = y + 14 + (k % porColuna) * 12;
      P.linha(cx, cy + 10, cx + ew, cy + 10, { cor: "#cfc5b8", linha: 0.4 });
      var it = vm.equipamento[k];
      if (!it) continue;
      P.texto(it.nome, cx, cy + 8, { fam: "classica", tam: 7.2, cor: TINTA, max: ew - 40 });
      P.texto(txt(it.espacos), cx + ew, cy + 8, { fam: "classica", tam: 7, cor: SUAVE, alinhar: "right" });
    }
    rotulo(P, "Carga: " + vm.carga + "   ·   T$ " + vm.tibar, esq + 8, y + eh - 8, { tam: 6.4, cor: TINTA });
    if (vm.equipamento.length > porColuna * 2) sobras.push({ titulo: "Equipamento", itens: vm.equipamento.slice(porColuna * 2).map(function (e) { return { titulo: e.nome, direita: txt(e.espacos) }; }) });

    var secoes = sobras.concat([
      { titulo: "Descrição", itens: vm.descricao },
      { titulo: "Habilidades de raça e origem", itens: vm.racaOrigem },
      { titulo: "Habilidades de classe", itens: vm.classeHab },
      { titulo: "Poderes", itens: vm.poderes },
      { titulo: "Outras habilidades", itens: vm.outras },
      { titulo: "Magias", itens: vm.magias },
      { titulo: "Condições", itens: vm.condicoes },
      { titulo: "Notas dos itens", itens: vm.itensDetalhes },
      { titulo: "Parceiros", itens: vm.parceiros },
      { titulo: "Anotações", itens: vm.anotacoes },
      { titulo: "Aliados", itens: vm.aliados },
    ]);
    X.fluir(doc, secoes, {
      caixas: [],
      novaPagina: function (d) {
        var p = d.pagina("retrato"), Q = p.P;
        fundo(p);
        Q.texto(vm.nome || "", M + 6, 44, { fam: "classica", tam: 16, peso: "bold", cor: TINTA, max: 330 });
        Q.texto("TORMENTA20 · continuação · página " + p.n, p.largura - M - 6, 42, { fam: "classica", tam: 7.5, cor: VERMELHO, alinhar: "right", espacamento: 1 });
        Q.linha(M + 4, 52, p.largura - M - 4, 52, { cor: VERMELHO, linha: 1 });
        var meio = p.largura / 2;
        return [{ x: M + 8, y: 62, w: meio - M - 16, h: p.altura - 96 }, { x: meio + 8, y: 62, w: p.largura - M - meio - 16, h: p.altura - 96 }];
      },
      cabecalho: function (Q, s, rect, cont) { faixaVermelha(Q, rect.x, rect.y, rect.w, s.titulo + (cont ? " (cont.)" : "")); return 19; },
      estilo: ESTILO, alturaCabecalho: 19, entreSecoes: 8,
    });
  }

  X.registrar("tormenta20", { orientacao: "retrato", desenhar: desenharT20, dados: dadosT20 });
})(typeof window !== "undefined" ? window : globalThis);
