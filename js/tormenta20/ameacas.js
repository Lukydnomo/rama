/* =====================================================================
   R.A.M.A. — Tormenta20 · ameaças (registro, ND de encontro, instância)
   ---------------------------------------------------------------------
   Os arquivos ameacas-1.js … chamam
     RAMATormenta20Ameacas.def(id, nome, nd, grupo, página, ficha, resumo)
   ficha = {
     tipo, sub, tam, papel (solo | lacaio | especial),
     ini, per, sentidos: [], def, fort, ref, von,
     imune: [], rd: { geral, fogo… }, vulner: [], defesasTexto,
     pv, desl (metros), mov: { voo, escalar, natacao, escavar }, pm,
     atr: [for, des, con, int, sab, car] (null = atributo nulo),
     ataques: [{ n, a, d, x, m, c, t, alc, q, dist, grupo }]
        n nome, a bônus, d dano da arma (dados + fixo), x dano extra
        (texto "1d4 acido"), m margem, c multiplicador, t tipo, alc
        alcance, q quantidade, dist à distância, grupo: ataques do mesmo
        grupo vão juntos numa ação ("e"); grupos diferentes são "ou"
     habs: [{ n, acao, pm, r (resumo), cd, res, dano, tipoDano, recarga }]
     magias: { como, cd, lista: [{ id, acao, pm, r }] }
     pericias: { chave: total }, equip, tesouro, recursos
   }
   O papel de combate vem do ícone do livro; nas fichas em que o texto
   extraído não o mostra, o RAMA o registrou pela descrição da p. 283.
   Textos são resumos do RAMA, com a página impressa do Livro Básico.
   ===================================================================== */

(function (global) {
  "use strict";

  var A = global.RAMATormenta20Ameacas = global.RAMATormenta20Ameacas || { AMEACAS: [], AMEACA: {}, NPCS: [], PERIGOS: [], PERIGO: {} };
  var TIPOS = { animal: "Animal", construto: "Construto", espirito: "Espírito", humanoide: "Humanoide", monstro: "Monstro", mortoVivo: "Morto-vivo" };
  var GRUPOS = { masmorras: "Masmorras", ermos: "Ermos", puristas: "Puristas", reinoDosMortos: "Reino dos Mortos", duyshidakk: "Duyshidakk", sszzaazitas: "Sszzaazitas", trollsNobres: "Trolls nobres", dragoes: "Dragões", tormenta: "Tormenta", npcs: "Fichas de NPCs" };

  function ndNumero(nd) {
    var s = String(nd === undefined || nd === null ? "" : nd).trim();
    var m = /^(\d+)\s*\/\s*(\d+)$/.exec(s);
    if (m) return Number(m[1]) / Number(m[2]);
    var n = Number(s);
    return isFinite(n) ? n : 0;
  }
  function ndTexto(n) {
    if (n >= 1) return String(Math.round(n * 100) / 100);
    var frac = [[1 / 8, "1/8"], [1 / 4, "1/4"], [1 / 3, "1/3"], [1 / 2, "1/2"], [3 / 4, "3/4"]];
    for (var i = 0; i < frac.length; i++) if (Math.abs(frac[i][0] - n) < 0.01) return frac[i][1];
    return String(Math.round(n * 100) / 100);
  }

  /* Monta a ficha normalizada sem registrar (cópias do Homebrew). */
  A.montar = function (id, nome, nd, grupo, pagina, f, resumo) {
    var x = f || {};
    return {
      id: id, nome: nome, nd: String(nd), ndNum: ndNumero(nd), grupo: grupo, grupoNome: GRUPOS[grupo] || grupo, pagina: pagina,
      tipo: x.tipo || "monstro", tipoNome: TIPOS[x.tipo] || x.tipo, sub: x.sub || "", tam: x.tam || "medio", papel: x.papel || "solo",
      ini: x.ini || 0, per: x.per || 0, sentidos: x.sentidos || [], def: x.def || 10, fort: x.fort || 0, ref: x.ref || 0, von: x.von || 0,
      imune: x.imune || [], rd: x.rd || {}, vulner: x.vulner || [], defesasTexto: x.defesasTexto || "",
      pv: x.pv || 1, desl: x.desl === undefined ? 9 : x.desl, mov: x.mov || {}, pm: x.pm || 0,
      atr: x.atr || [0, 0, 0, 0, 0, 0], ataques: (x.ataques || []).map(function (t, i) { return Object.assign({ m: 20, c: 2, q: 1, grupo: t.dist ? "dist" : "corpo", id: "a" + i }, t); }),
      habs: x.habs || [], magias: x.magias || null, pericias: x.pericias || {}, equip: x.equip || "", tesouro: x.tesouro || "nenhum", recursos: x.recursos || "",
      resumo: resumo || "", fonte: { livro: "Tormenta20 — Jogo do Ano", pagina: pagina }, npc: !!x.npc,
      curaAcelerada: x.curaAcelerada || 0, curaBloqueadaPor: x.curaBloqueadaPor || null, bando: !!x.bando, enxame: !!x.enxame,
      metadeFisico: !!x.metadeFisico, metadeMundano: !!x.metadeMundano, resistenciaMagia: x.resistenciaMagia || 0, incorporeo: !!x.incorporeo,
    };
  };
  A.def = function (id, nome, nd, grupo, pagina, f, resumo) {
    var a = A.montar(id, nome, nd, grupo, pagina, f, resumo);
    if (A.AMEACA[id]) A.AMEACAS = A.AMEACAS.filter(function (z) { return z.id !== id; });
    A.AMEACAS.push(a);
    A.AMEACA[id] = a;
    return a;
  };

  /* Perigos (armadilhas p. 317–318) e perigos complexos (p. 319–321). */
  A.perigo = function (id, nome, nd, pagina, f, resumo) {
    var p = Object.assign({ id: id, nome: nome, nd: String(nd), ndNum: ndNumero(nd), pagina: pagina, resumo: resumo || "", fonte: { livro: "Tormenta20 — Jogo do Ano", pagina: pagina } }, f || {});
    if (A.PERIGO[id]) A.PERIGOS = A.PERIGOS.filter(function (z) { return z.id !== id; });
    A.PERIGOS.push(p);
    A.PERIGO[id] = p;
    return p;
  };

  /* Uma ficha vinda de fora (Homebrew): os mesmos campos, limitados. */
  A.daFicha = function (f) {
    var x = f && typeof f === "object" ? f : {};
    var copia = JSON.parse(JSON.stringify(x));
    return A.montar(String(x.id || "homebrew").slice(0, 80), String(x.nome || "Ameaça").slice(0, 120), String(x.nd || "1").slice(0, 6), String(x.grupo || "homebrew").slice(0, 40), Number(x.pagina) || 0, copia, String(x.resumo || "").slice(0, 600));
  };
  A.ndNumero = ndNumero;
  A.ndTexto = ndTexto;
  A.TIPOS = TIPOS;
  A.GRUPOS = GRUPOS;

  /* ND de um grupo de criaturas iguais (p. 282): abaixo de 1, ND ×
     quantidade; de 1 em diante, +2 a cada vez que a quantidade dobra. */
  function ndDeGrupoIgual(nd, qtd) {
    var n = ndNumero(nd), q = Math.max(1, Math.floor(Number(qtd) || 1));
    if (n < 1) return n * q;
    return n + 2 * Math.log(q) / Math.LN2;
  }
  /* Encontro: [{ nd, quantidade }]. Grupos iguais seguem o livro. Com
     criaturas diferentes o livro não dá fórmula; o RAMA soma as menores
     que 1 como no livro e junta os grupos pela mesma regra de dobra
     (cada +2 de ND vale o dobro de criaturas). O resultado avisa. */
  A.ndDoEncontro = function (grupos) {
    var gs = (grupos || []).filter(function (g) { return g && Number(g.quantidade) > 0; });
    if (!gs.length) return { nd: 0, texto: "—", aproximado: false, partes: [] };
    var partes = gs.map(function (g) { return { nd: g.nd, quantidade: Math.floor(Number(g.quantidade)), ndGrupo: ndDeGrupoIgual(g.nd, g.quantidade) }; });
    var aproximado = partes.length > 1;
    var menores = partes.filter(function (p) { return ndNumero(p.nd) < 1; }).reduce(function (s, p) { return s + p.ndGrupo; }, 0);
    var valores = partes.filter(function (p) { return ndNumero(p.nd) >= 1; }).map(function (p) { return p.ndGrupo; });
    if (menores > 0) valores.push(menores);
    var nd;
    if (valores.length === 1) nd = valores[0];
    else {
      var maior = Math.max.apply(null, valores);
      if (maior < 1) nd = valores.reduce(function (s, v) { return s + v; }, 0);
      else {
        var soma = valores.reduce(function (s, v) { return s + Math.pow(2, (v - maior) / 2); }, 0);
        nd = maior + 2 * Math.log(soma) / Math.LN2;
      }
    }
    var arred = nd >= 1 ? Math.round(nd) : nd;
    return { nd: arred, ndExato: nd, texto: ndTexto(arred), aproximado: aproximado, partes: partes };
  };
  /* Dificuldade para um grupo: compara o ND do encontro com o nível
     médio, ajustando pelo tamanho do grupo (o ND supõe quatro). */
  A.dificuldade = function (ndEncontro, nivelMedio, jogadores) {
    var j = Math.max(1, Math.floor(Number(jogadores) || 4));
    var nivelEf = Number(nivelMedio) + 2 * Math.log(j / 4) / Math.LN2;
    var d = ndEncontro - nivelEf;
    if (d <= -4) return { chave: "trivial", nome: "Trivial", diferenca: d };
    if (d <= -2) return { chave: "facil", nome: "Fácil", diferenca: d };
    if (d < 2) return { chave: "equilibrado", nome: "Equilibrado", diferenca: d };
    if (d < 4) return { chave: "dificil", nome: "Difícil", diferenca: d };
    return { chave: "mortal", nome: "Muito perigoso", diferenca: d };
  };

  /* Uma ocorrência independente da ameaça para a mesa: PV próprios,
     condições próprias; a ficha do catálogo não muda. */
  A.instanciar = function (ameaca, extra) {
    var a = typeof ameaca === "string" ? A.AMEACA[ameaca] : ameaca;
    if (!a) return null;
    var e = extra || {};
    return {
      tipo: "ameaca", ameacaId: a.id, nome: e.nome || a.nome, nd: a.nd,
      pv: { atual: a.pv, max: a.pv, temp: 0 }, pm: { atual: a.pm, max: a.pm },
      def: a.def, fort: a.fort, ref: a.ref, von: a.von, ini: a.ini, per: a.per,
      rd: JSON.parse(JSON.stringify(a.rd)), imune: a.imune.slice(), vulner: a.vulner.slice(),
      condicoes: [], recargas: {}, notas: "", oculto: !!e.oculto, homebrew: e.homebrew || null,
    };
  };

  A.atributo = function (a, i) { var v = a.atr[i]; return v === null || v === undefined ? null : v; };

  A.listar = function (filtro) {
    var f = filtro || {};
    return A.AMEACAS.filter(function (a) {
      if (f.grupo && a.grupo !== f.grupo) return false;
      if (f.tipo && a.tipo !== f.tipo) return false;
      if (f.ndMax !== undefined && a.ndNum > f.ndMax) return false;
      if (f.ndMin !== undefined && a.ndNum < f.ndMin) return false;
      if (f.busca && (a.nome + " " + a.resumo).toLowerCase().indexOf(String(f.busca).toLowerCase()) < 0) return false;
      return true;
    }).sort(function (x, y) { return x.ndNum - y.ndNum || x.nome.localeCompare(y.nome); });
  };
})(typeof window !== "undefined" ? window : globalThis);
