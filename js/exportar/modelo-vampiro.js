/* =====================================================================
   R.A.M.A. — exportação: Vampiro: A Máscara (V5)
   ---------------------------------------------------------------------
   Papel claro, linhas finas, tipografia sóbria e simetria. Identificação
   no topo; atributos e habilidades em três grupos, com bolinhas; trilhas
   de Vitalidade e Força de Vontade (superficial "/", agravado "X");
   Disciplinas com os poderes; Ressonância, Fome e Humanidade (com as
   Máculas) no rodapé. A continuação traz pilares e convicções, perdição
   do clã, vantagens e defeitos, potência de sangue, experiência,
   aparência e história. Os valores vêm de RAMAVampiro.calcular().
   ===================================================================== */

(function (global) {
  "use strict";

  var X = global.RAMAExportar;
  var txt = X.txt;
  var TINTA = "#1b1b1b", FINO = "#555", VERMELHO = "#8b1a1a", SUAVE = "#7a7a7a";
  var M = 26;

  function tentar(fn, padrao) { try { var v = fn(); return v === undefined ? padrao : v; } catch (e) { return padrao; } }

  function dadosVampiro(ficha) {
    var R = global.RAMAVampiro, C = global.RAMAVampiroCatalogo, DS = global.RAMAVampiroDisciplinas;
    var o = tentar(function () { return R.normalizar(ficha.vampiro); }, ficha.vampiro || {});
    var c = tentar(function () { return R.calcular(o); }, null) || {};
    var vm = { nome: ficha.nome, natureza: o.natureza };
    var cla = c.cla, pred = c.predador;
    vm.ident = [
      ["Nome", ficha.nome], ["Conceito", o.conceito], ["Predador", pred ? pred.nome : ""],
      ["Crônica", ""], ["Ambição", o.ambicao], ["Clã", cla ? cla.nome : (o.natureza === "vampiro" ? "" : ({ sangueRalo: "Sangue-Ralo", mortal: "Mortal" })[o.natureza] || "")],
      ["Senhor", o.senhor], ["Desejo", o.desejo], ["Geração", o.geracao ? o.geracao + "ª" : ""],
    ];
    vm.atributos = { fisico: [], social: [], mental: [] };
    (C.ATRIBUTOS || []).forEach(function (a) { vm.atributos[a.categoria].push({ nome: a.nome, valor: tentar(function () { return c.atributos[a.chave].valor; }, 0) }); });
    var esp = {};
    (c.especializacoes || []).forEach(function (e) { (esp[e.habilidade] = esp[e.habilidade] || []).push(e.nome); });
    vm.habilidades = { fisico: [], social: [], mental: [] };
    (C.HABILIDADES || []).forEach(function (h) { vm.habilidades[h.categoria].push({ nome: h.nome, valor: tentar(function () { return c.habilidades[h.chave].valor; }, 0) || 0, esp: (esp[h.chave] || []).join(", ") }); });
    vm.vitalidade = c.vitalidade || { max: 0, superficial: 0, agravado: 0 };
    vm.fdv = c.forcaDeVontade || { max: 0, superficial: 0, agravado: 0 };
    var poderes = (c.poderes || []).map(function (p) { var d = tentar(function () { return DS.poder(p.chave); }, null); return d ? Object.assign({ origem: p.origem }, d) : null; }).filter(Boolean);
    vm.disciplinas = Object.keys(c.disciplinas || {}).map(function (k) {
      var d = DS.DISCIPLINAS[k] || { nome: k };
      return {
        nome: d.nome, valor: c.disciplinas[k].valor,
        poderes: poderes.filter(function (p) { return p.disciplina === k; }).sort(function (a, b) { return a.nivel - b.nivel; })
          .map(function (p) { return { titulo: "• " + p.nome, direita: "nv. " + p.nivel, texto: p.efeito || "" }; }),
      };
    });
    /* Poderes de disciplinas que a ficha não tem pontuada (concessões). */
    poderes.forEach(function (p) {
      if (vm.disciplinas.some(function (d) { return d.nome === (DS.DISCIPLINAS[p.disciplina] || {}).nome; })) return;
      vm.disciplinas.push({ nome: (DS.DISCIPLINAS[p.disciplina] || { nome: p.disciplina }).nome, valor: 0, poderes: [{ titulo: "• " + p.nome, direita: "nv. " + p.nivel, texto: p.efeito || "" }] });
    });
    vm.rituais = (o.rituais || []).map(function (r) { var d = tentar(function () { return DS.ritual(r.chave); }, null) || {}; return { titulo: d.nome || r.chave, direita: d.nivel ? "nv. " + d.nivel : "", meta: d.ingredientes ? "Ingredientes: " + d.ingredientes : "", texto: d.efeito || "" }; });
    vm.formulas = (o.formulas || []).map(function (r) { var d = tentar(function () { return DS.poder(r.chave); }, null) || {}; return { titulo: d.nome || r.chave, direita: d.nivel ? "nv. " + d.nivel : "", texto: d.efeito || "" }; });
    vm.ressonancia = o.ressonancia ? tentar(function () { return C.RESSONANCIAS[o.ressonancia.tipo].nome + (o.ressonancia.temperamento ? " · " + (C.TEMPERAMENTOS[o.ressonancia.temperamento] || {}).nome : ""); }, "") : "";
    vm.fome = c.fome !== undefined ? c.fome : o.fome;
    vm.humanidade = c.humanidade !== undefined ? c.humanidade : o.humanidadeBase;
    vm.maculas = o.maculas || 0;
    vm.potencia = c.potencia || 0;
    vm.tabelaPotencia = c.tabelaPotencia || null;
    vm.perdicao = cla && cla.perdicao ? { texto: cla.perdicao.texto, gravidade: c.gravidadePerdicao } : null;
    vm.compulsao = cla && cla.compulsao ? cla.compulsao : null;
    vm.xp = c.xp || { total: 0, gasto: 0, disponivel: 0 };
    vm.idade = [
      o.idadeVerdadeira ? "Idade verdadeira: " + o.idadeVerdadeira : "", o.idadeAparente ? "Idade aparente: " + o.idadeAparente : "",
      o.abraco && o.abraco.data ? "Data do Abraço: " + o.abraco.data : "", o.abraco && o.abraco.local ? "Local: " + o.abraco.local : "",
      tentar(function () { return C.IDADES[o.idade].nome; }, ""),
    ].filter(Boolean).join(" · ");
    vm.circunstancias = o.abraco && o.abraco.circunstancias;
    vm.vantagens = (c.vantagens || []).map(function (v) {
      var d = C.VANTAGENS[v.chave] || { nome: v.chave };
      return { tipo: d.tipo, titulo: d.nome + (v.nota ? " (" + v.nota + ")" : ""), pontos: v.pontos || 0, meta: [d.tipo === "defeito" ? "Defeito" : "Vantagem", d.grupo, v.origem && v.origem !== "criacao" ? "de " + v.origem : ""].filter(Boolean).join(" · "), texto: d.texto || "" };
    });
    vm.convicoes = (o.convicoes || []).map(function (cv) {
      var pil = (o.pilares || []).filter(function (p) { return p.convicaoId === cv.id; }).map(function (p) { return p.nome + (p.estado !== "vivo" ? " (" + p.estado + ")" : ""); });
      return { titulo: cv.texto + (cv.perdida ? " (perdida)" : ""), texto: pil.length ? "Pilar: " + pil.join(", ") : "" };
    });
    (o.pilares || []).filter(function (p) { return !p.convicaoId || !(o.convicoes || []).some(function (c2) { return c2.id === p.convicaoId; }); })
      .forEach(function (p) { vm.convicoes.push({ titulo: "Pilar: " + p.nome + (p.estado !== "vivo" ? " (" + p.estado + ")" : "") }); });
    vm.equipamento = (o.equipamento || []).map(function (e) {
      var arma = e.arma ? C.ARMAS[e.arma] : null, arm = e.armadura ? C.ARMADURAS[e.armadura] : null;
      return { titulo: e.nome || (arma && arma.nome) || (arm && arm.nome) || "Item", meta: [arma ? "Arma" + (e.dano !== null && e.dano !== undefined ? " · dano +" + e.dano : (arma.dano !== undefined ? " · dano +" + arma.dano : "")) : "", arm ? "Armadura " + (arm.valor || arm.nome || "") : ""].filter(Boolean).join(" · "), texto: e.notas };
    });
    vm.lacos = (o.lacos || []).map(function (l) { return { titulo: "Laço de Sangue: " + (l.reinante || "?"), direita: "força " + l.forca }; });
    vm.efeitos = (o.efeitos || []).map(function (e) { return { titulo: e.nome || e.chave, meta: e.duracao || "" }; });
    vm.notas = o.notas ? [{ texto: o.notas }] : [];
    vm.anotacoes = X.itensDasAnotacoes(ficha);
    vm.aliados = X.itensDosAliados(ficha);
    return vm;
  }

  function titulo(P, s, x, y, w) {
    P.texto(s.toUpperCase(), x + w / 2, y, { fam: "classica", tam: 10, peso: "bold", cor: TINTA, alinhar: "center", espacamento: 2 });
    var tw = P.medir(s.toUpperCase(), { fam: "classica", tam: 10, peso: "bold" }) + s.length * 2;
    P.linha(x, y - 3.5, x + w / 2 - tw / 2 - 8, y - 3.5, { cor: FINO, linha: 0.5 });
    P.linha(x + w / 2 + tw / 2 + 8, y - 3.5, x + w, y - 3.5, { cor: FINO, linha: 0.5 });
  }

  function linhaComBolas(P, nome, valor, x, y, w, op) {
    var o = op || {};
    P.texto(nome, x, y, { fam: "classica", tam: o.tam || 9.6, cor: TINTA, max: w - 64 });
    if (o.sub) P.texto(o.sub, x, y + 7, { fam: "classica", tam: 5.8, italico: true, cor: SUAVE, max: w - 64 });
    var n = Math.max(5, valor);
    P.bolinhas(x + w - n * 8.4, y - 3, n, valor, { raio: 3.1, passo: 8.4, cor: TINTA });
  }

  function trilha(P, rotulo, t, x, y) {
    P.texto(rotulo, x, y, { fam: "sans", tam: 8, peso: "bold", cor: TINTA });
    var marcas = [];
    for (var i = 0; i < t.max; i++) marcas.push(i < t.agravado ? "x" : (i < t.agravado + t.superficial ? "/" : ""));
    P.caixinhas(x, y + 4, marcas, { lado: 7, passo: 9, grupo: 5, vao: 4, cor: TINTA, marca: VERMELHO });
  }

  var ESTILO = { fam: "classica", famTitulo: "classica", tamTitulo: 8.8, tamTexto: 7.7, tamMeta: 6.7, cor: TINTA, corMeta: SUAVE, corDireita: VERMELHO };

  function moldura(pg) {
    var P = pg.P;
    P.retangulo(14, 14, pg.largura - 28, pg.altura - 28, { borda: TINTA, linha: 1.2, raio: 10 });
    P.retangulo(18, 18, pg.largura - 36, pg.altura - 36, { borda: FINO, linha: 0.4, raio: 8 });
  }

  function cabecalhoDeSecao(P, secao, rect, cont) {
    titulo(P, secao.titulo + (cont ? " (cont.)" : ""), rect.x, rect.y + 10, rect.w);
    return 18;
  }

  function desenharVampiro(doc, ficha, ctx) {
    var vm = dadosVampiro(ficha);
    vm.ident[3][1] = ctx.campanha || "";
    var pg = doc.pagina("retrato"), P = pg.P, W = pg.largura, H = pg.altura;
    moldura(pg);
    var natureza = vm.natureza === "mortal" ? "MORTAL" : "A MÁSCARA";
    P.texto("VAMPIRO", W / 2, 54, { fam: "classica", tam: 30, cor: TINTA, alinhar: "center", espacamento: 4 });
    P.texto(natureza, W / 2, 66, { fam: "classica", tam: 7, cor: TINTA, alinhar: "center", espacamento: 5 });
    P.linha(W / 2 - 46, 63.5, W / 2 - 110, 63.5, { cor: VERMELHO, linha: 0.8 }); P.linha(W / 2 + 46, 63.5, W / 2 + 110, 63.5, { cor: VERMELHO, linha: 0.8 });

    /* identificação 3×3 */
    var gx = M + 10, gw = W - 2 * M - 20, cw = gw / 3, gy = 78;
    P.retangulo(gx, gy, gw, 66, { borda: FINO, linha: 0.5 });
    vm.ident.forEach(function (c, i) {
      var cx = gx + (i % 3) * cw, cy = gy + Math.floor(i / 3) * 22;
      if (i % 3) P.linha(cx, gy, cx, gy + 66, { cor: FINO, linha: 0.4 });
      if (i >= 3 && i % 3 === 0) P.linha(gx, cy, gx + gw, cy, { cor: FINO, linha: 0.4 });
      P.texto(c[0], cx + 5, cy + 13.5, { fam: "classica", tam: 7, cor: SUAVE });
      P.texto(c[1] || "", cx + 5 + P.medir(c[0], { fam: "classica", tam: 7 }) + 6, cy + 14, { fam: "classica", tam: 8.6, cor: TINTA, max: cw - 16 - P.medir(c[0], { fam: "classica", tam: 7 }) });
    });

    /* atributos */
    var y = 162;
    titulo(P, "Atributos", gx, y, gw);
    var grupos = [["fisico", "Físicos"], ["social", "Sociais"], ["mental", "Mentais"]];
    grupos.forEach(function (g, i) {
      var x = gx + i * cw + 8;
      P.texto(g[1], x + cw / 2 - 8, y + 14, { fam: "classica", tam: 8.6, italico: true, cor: TINTA, alinhar: "center" });
      vm.atributos[g[0]].forEach(function (a, k) { linhaComBolas(P, a.nome, a.valor, x, y + 30 + k * 15, cw - 22, { tam: 10.5 }); });
    });
    y += 86;
    trilha(P, "Vitalidade", vm.vitalidade, gx + cw * 0.35, y);
    trilha(P, "Força de Vontade", vm.fdv, gx + cw * 1.55, y);
    y += 30;

    /* habilidades */
    titulo(P, "Habilidades", gx, y, gw);
    var maxLinhas = Math.max(vm.habilidades.fisico.length, vm.habilidades.social.length, vm.habilidades.mental.length);
    var passoH = 17;
    grupos.forEach(function (g, i) {
      var x = gx + i * cw + 4;
      vm.habilidades[g[0]].forEach(function (h, k) { linhaComBolas(P, h.nome, h.valor, x, y + 18 + k * passoH, cw - 12, { tam: 8, sub: h.esp }); });
    });
    y += 22 + maxLinhas * passoH;

    /* disciplinas: 3 × 2 caixas */
    titulo(P, "Disciplinas", gx, y, gw);
    y += 8;
    var resumoH = 34, dy = y, dh = (H - 34 - resumoH - dy) / 2;
    var sobraDisc = [];
    for (var i = 0; i < 6; i++) {
      var bx = gx + (i % 3) * cw, by = dy + Math.floor(i / 3) * dh;
      P.retangulo(bx, by, cw, dh, { borda: FINO, linha: 0.5 });
      var d = vm.disciplinas[i];
      P.linha(bx + 4, by + 16, bx + cw - 4, by + 16, { cor: FINO, linha: 0.4 });
      P.bolinhas(bx + cw - 50, by + 9, 5, d ? Math.min(5, d.valor) : 0, { raio: 3, passo: 8.4, cor: TINTA });
      if (!d) continue;
      P.texto(d.nome, bx + 5, by + 12, { fam: "classica", tam: 9, peso: "bold", cor: TINTA, max: cw - 62 });
      var r = X.encaixar(P, d.poderes, { x: bx + 5, y: by + 20, w: cw - 10, h: dh - 24 }, Object.assign({}, ESTILO, { tamTitulo: 7.6, tamTexto: 6.6, entre: 2 }));
      if (r.sobra.length) sobraDisc.push({ titulo: d.nome + " (continuação)", itens: r.sobra });
    }
    vm.disciplinas.slice(6).forEach(function (d) { sobraDisc.push({ titulo: d.nome + " · " + d.valor, itens: d.poderes.length ? d.poderes : [{ texto: "—" }] }); });

    /* rodapé: ressonância, fome, humanidade */
    var fy = H - 34 - resumoH + 16;
    P.texto("Ressonância", gx, fy, { fam: "sans", tam: 8, peso: "bold", cor: TINTA });
    P.texto(vm.ressonancia || "", gx + 56, fy, { fam: "classica", tam: 8.4, cor: TINTA, max: 120 });
    P.texto("Fome", gx + gw * 0.40, fy, { fam: "sans", tam: 8, peso: "bold", cor: TINTA });
    var fome = []; for (var f = 0; f < 5; f++) fome.push(f < vm.fome ? "cheia" : "");
    P.caixinhas(gx + gw * 0.40 + 26, fy - 7, fome, { lado: 7, passo: 9, cor: TINTA });
    P.texto("Humanidade", gx + gw * 0.64, fy, { fam: "sans", tam: 8, peso: "bold", cor: TINTA });
    var hum = []; for (var h = 0; h < 10; h++) hum.push(h < vm.humanidade ? "cheia" : (h >= 10 - vm.maculas ? "/" : ""));
    P.caixinhas(gx + gw * 0.64 + 52, fy - 7, hum, { lado: 7, passo: 9, grupo: 5, vao: 3, cor: TINTA, marca: VERMELHO });
    P.texto("Exportado do R.A.M.A. · quadrado cheio = ponto; “/” = superficial ou Mácula; “X” = agravado", W / 2, H - 22, { fam: "sans", tam: 5.6, cor: SUAVE, alinhar: "center" });

    /* --- página 2: o resto da ficha, no mesmo papel --- */
    var secoes = sobraDisc.concat([
      { titulo: "Pilares e Convicções", itens: vm.convicoes, mostrarVazia: true, vazio: "Nenhuma Convicção registrada." },
      { titulo: "Perdição do Clã", itens: vm.perdicao ? [{ titulo: "Gravidade da Perdição: " + vm.perdicao.gravidade, texto: vm.perdicao.texto }].concat(vm.compulsao ? [{ titulo: "Compulsão: " + vm.compulsao.nome, texto: vm.compulsao.termina ? "Termina ao: " + vm.compulsao.termina : "" }] : []) : [] },
      { titulo: "Vantagens e Defeitos", itens: vm.vantagens.map(function (v) { return { titulo: v.titulo, direita: "●".repeat(Math.min(5, v.pontos)) + "○".repeat(Math.max(0, 5 - v.pontos)), meta: v.meta, texto: v.texto }; }) },
      { titulo: "Rituais", itens: vm.rituais },
      { titulo: "Fórmulas", itens: vm.formulas },
      { titulo: "Laços e efeitos", itens: vm.lacos.concat(vm.efeitos) },
      { titulo: "Equipamento", itens: vm.equipamento },
      { titulo: "Aparência e história", itens: [vm.idade ? { titulo: "Idade", texto: vm.idade } : null, vm.circunstancias ? { titulo: "O Abraço", texto: vm.circunstancias } : null].filter(Boolean).concat(vm.notas) },
      { titulo: "Anotações", itens: vm.anotacoes },
      { titulo: "Aliados", itens: vm.aliados },
    ]);
    var primeira = true;
    X.fluir(doc, secoes, {
      caixas: [],
      novaPagina: function (d) {
        var p = d.pagina("retrato"), Q = p.P;
        moldura(p);
        var topo = 40;
        Q.texto((vm.nome || "") + " · Vampiro: A Máscara · página " + p.n, p.largura / 2, 32, { fam: "classica", tam: 7.5, italico: true, cor: SUAVE, alinhar: "center" });
        if (primeira) {
          primeira = false;
          /* Potência de Sangue e Experiência no alto da 2ª página. */
          var x0 = M + 10, w0 = p.largura - 2 * M - 20;
          titulo(Q, "Potência de Sangue", x0, topo + 10, w0 * 0.58);
          Q.bolinhas(x0 + 6, topo + 26, 10, vm.potencia, { raio: 3.4, passo: 9.5, cor: TINTA });
          var tp = vm.tabelaPotencia;
          if (tp) {
            [["Surto de Sangue", "+" + tp.surto + " dados"], ["Dano curado", tp.recupera + " superficial"], ["Bônus de Poder", "+" + tp.bonusPoder], ["Rerrolagem de Checagem", "nível " + tp.rerrolagem], ["Gravidade da Perdição", String(vm.perdicao ? vm.perdicao.gravidade : tp.perdicao)]].forEach(function (l, i) {
              var lx = x0 + 6 + (i % 2) * (w0 * 0.29), ly = topo + 44 + Math.floor(i / 2) * 12;
              Q.texto(l[0] + ":", lx, ly, { fam: "classica", tam: 7.4, cor: SUAVE });
              Q.texto(l[1], lx + Q.medir(l[0] + ":", { fam: "classica", tam: 7.4 }) + 4, ly, { fam: "classica", tam: 7.6, peso: "bold", cor: TINTA });
            });
          }
          var xx = x0 + w0 * 0.62;
          titulo(Q, "Experiência", xx, topo + 10, w0 * 0.38);
          [["Total", vm.xp.total], ["Gasta", vm.xp.gasto], ["Disponível", vm.xp.disponivel]].forEach(function (l, i) {
            Q.texto(l[0], xx + 8 + i * (w0 * 0.12), topo + 28, { fam: "classica", tam: 7, cor: SUAVE });
            Q.texto(String(l[1]), xx + 8 + i * (w0 * 0.12), topo + 44, { fam: "classica", tam: 16, cor: TINTA });
          });
          topo += 86;
        }
        var meio = p.largura / 2;
        return [{ x: M + 8, y: topo, w: meio - M - 16, h: p.altura - 34 - topo }, { x: meio + 8, y: topo, w: p.largura - M - meio - 16, h: p.altura - 34 - topo }];
      },
      cabecalho: cabecalhoDeSecao, estilo: ESTILO, alturaCabecalho: 18, entreSecoes: 10,
    });
  }

  X.registrar("vampiro", { orientacao: "retrato", desenhar: desenharVampiro, dados: dadosVampiro });
})(typeof window !== "undefined" ? window : globalThis);
