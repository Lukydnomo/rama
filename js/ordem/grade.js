/* =====================================================================
   R.A.M.A. — Ordem Paranormal · Inventário em grade (v9.23.0)
   =====================================================================
   Regra opcional dos Extras ("inventarioGrade"). Desligada, nada deste
   arquivo é usado: a lista e a carga de sempre valem.

   UMA COLEÇÃO SÓ. Os itens continuam em `inventario.itens`; aqui se
   descreve só ONDE cada UNIDADE está, no próprio item:

     item.ordem.grade.unidades[i]   (uma entrada por unidade, i < quantidade)
       { local: "grade", recipiente: "principal" | <id da mochila>,
         x, y, forma: [[dx, dy], …], meia: [dx, dy] }   guardada
       { local: "corpo", slot: <id do slot> | "maos" }  vestida/segurada
       { local: "pendente" }                            sem lugar ainda

   e, na ficha (ordem.inventarioGrade), o corpo e as grades:
       { slotsExtras: [{ id, parte }], colunas: { <recipiente>: n } }

   Espaços por unidade: os EFETIVOS (modificações, meio espaço…), vindos
   de quem chama. n = parte inteira = células cheias, numa FORMA ligada
   pelas laterais escolhida por quem joga (qualquer n); o resto (0 < r < 1)
   ocupa uma fração de uma célula vizinha ("meia"), que outra fração pode
   completar até 1. Espaço 0: a faixa do recipiente, sem célula.

   Corpo: seis slots-base (cabeça, peitoral, mão esquerda, mão direita,
   pernas, pés) e os extras que quem joga criar em cada parte, para
   sobrepor peças. Um slot guarda uma unidade. As duas mãos-BASE seguram
   (a unidade segurada não conta na carga); "maos" é a arma de duas mãos
   ocupando as duas com uma unidade só. Slot extra numa mão é acessório:
   veste, não segura.

   Este arquivo é puro: não desenha, não grava, não calcula carga. A tela
   (ficha-ordem.js) valida a carga com RAMAOrdemRegras.capacidade.
   ===================================================================== */

(function (global) {
  "use strict";

  var PARTES = [
    { chave: "cabeca", nome: "Cabeça" },
    { chave: "maoEsquerda", nome: "Mão esquerda" },
    { chave: "peitoral", nome: "Peitoral" },
    { chave: "maoDireita", nome: "Mão direita" },
    { chave: "pernas", nome: "Pernas" },
    { chave: "pes", nome: "Pés" },
  ];
  var CHAVES_PARTE = PARTES.map(function (p) { return p.chave; });
  var MAOS = ["maoEsquerda", "maoDireita"];
  var DUAS_MAOS = "maos";
  var PRINCIPAL = "principal";
  var MAX_EXTRAS = 24;
  var MAX_CELULAS = 400;
  var EPS = 1e-9;

  function arred(n) { return Math.round(n * 100) / 100; }
  function inteiro(v, p) { var n = parseInt(v, 10); return Number.isFinite(n) ? n : p; }
  function id() { return global.RAMAUtil && global.RAMAUtil.uuid ? global.RAMAUtil.uuid() : "s" + Math.random().toString(36).slice(2, 10); }

  /* ---------------- configuração da ficha ---------------- */

  function normalizarConfig(bruto) {
    var b = bruto && typeof bruto === "object" ? bruto : {};
    var vistos = {};
    var extras = (Array.isArray(b.slotsExtras) ? b.slotsExtras : []).filter(function (s) {
      if (!s || CHAVES_PARTE.indexOf(s.parte) < 0) return false;
      var i = String(s.id || "").slice(0, 60);
      if (!i || vistos[i] || CHAVES_PARTE.indexOf(i) >= 0 || i === DUAS_MAOS) return false;
      vistos[i] = true;
      return true;
    }).slice(0, MAX_EXTRAS).map(function (s) { return { id: String(s.id).slice(0, 60), parte: s.parte }; });
    var colunas = {};
    if (b.colunas && typeof b.colunas === "object") {
      Object.keys(b.colunas).slice(0, 60).forEach(function (k) {
        var n = inteiro(b.colunas[k], 0);
        if (n >= 1 && n <= 20) colunas[String(k).slice(0, 80)] = n;
      });
    }
    return { slotsExtras: extras, colunas: colunas };
  }

  function slots(config) {
    var c = normalizarConfig(config);
    return PARTES.map(function (p) { return { id: p.chave, parte: p.chave, base: true }; })
      .concat(c.slotsExtras.map(function (s) { return { id: s.id, parte: s.parte, base: false }; }));
  }

  function slotsDaParte(config, parte) { return slots(config).filter(function (s) { return s.parte === parte; }); }

  function adicionarSlot(config, parte) {
    if (CHAVES_PARTE.indexOf(parte) < 0) return null;
    if (!Array.isArray(config.slotsExtras)) config.slotsExtras = [];
    if (config.slotsExtras.length >= MAX_EXTRAS) return null;
    var s = { id: "x-" + id(), parte: parte };
    config.slotsExtras.push(s);
    return s;
  }

  function removerSlot(config, slotId) {
    var lista = Array.isArray(config.slotsExtras) ? config.slotsExtras : [];
    var i = lista.findIndex(function (s) { return s.id === slotId; });
    if (i < 0) return false;
    lista.splice(i, 1);
    return true;
  }

  /* Colunas de uma grade de N células: 20 → 5 × 4, 10 → 4 + 4 + 2,
     5 → 3 + 2, 4 → 2 × 2. Gravadas na primeira vez (config.colunas):
     mudar a capacidade depois não embaralha o que já foi organizado. */
  function colunasPadrao(n) {
    if (n <= 1) return 1;
    if (n <= 4) return 2;
    if (n <= 6) return 3;
    if (n <= 12) return 4;
    if (n <= 20) return 5;
    if (n <= 30) return 6;
    if (n <= 42) return 7;
    if (n <= 64) return 8;
    return 10;
  }

  /* ---------------- formas ---------------- */

  function normalizarForma(f) {
    var lista = (Array.isArray(f) ? f : []).filter(function (c) { return Array.isArray(c) && c.length === 2; })
      .map(function (c) { return [inteiro(c[0], 0), inteiro(c[1], 0)]; });
    if (!lista.length) return [];
    var mx = Math.min.apply(null, lista.map(function (c) { return c[0]; }));
    var my = Math.min.apply(null, lista.map(function (c) { return c[1]; }));
    var vistos = {};
    return lista.map(function (c) { return [c[0] - mx, c[1] - my]; })
      .filter(function (c) { var k = c[0] + "," + c[1]; if (vistos[k]) return false; vistos[k] = true; return true; })
      .sort(function (a, b) { return a[1] - b[1] || a[0] - b[0]; });
  }

  function conectada(f) {
    if (!f.length) return true;
    var conj = {};
    f.forEach(function (c) { conj[c[0] + "," + c[1]] = true; });
    var vistos = {}, fila = [f[0]];
    vistos[f[0][0] + "," + f[0][1]] = true;
    while (fila.length) {
      var c = fila.shift();
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        var k = (c[0] + d[0]) + "," + (c[1] + d[1]);
        if (conj[k] && !vistos[k]) { vistos[k] = true; fila.push([c[0] + d[0], c[1] + d[1]]); }
      });
    }
    return Object.keys(vistos).length === f.length;
  }

  function formaValida(f, n) {
    var g = normalizarForma(f);
    return g.length === n && conectada(g);
  }

  /* Girar 90° no sentido horário e espelhar. A meia célula gira junto. */
  function girarComMeia(f, meia) {
    var todos = f.concat(meia ? [meia] : []);
    var maxY = Math.max.apply(null, todos.map(function (c) { return c[1]; }).concat([0]));
    var g = function (c) { return [maxY - c[1], c[0]]; };
    return ajustarComMeia(f.map(g), meia ? g(meia) : null);
  }
  function espelharComMeia(f, meia) {
    var todos = f.concat(meia ? [meia] : []);
    var maxX = Math.max.apply(null, todos.map(function (c) { return c[0]; }).concat([0]));
    var g = function (c) { return [maxX - c[0], c[1]]; };
    return ajustarComMeia(f.map(g), meia ? g(meia) : null);
  }
  function ajustarComMeia(f, meia) {
    var todos = f.concat(meia ? [meia] : []);
    if (!todos.length) return { forma: [], meia: meia };
    var mx = Math.min.apply(null, todos.map(function (c) { return c[0]; }));
    var my = Math.min.apply(null, todos.map(function (c) { return c[1]; }));
    return {
      forma: f.map(function (c) { return [c[0] - mx, c[1] - my]; }).sort(function (a, b) { return a[1] - b[1] || a[0] - b[0]; }),
      meia: meia ? [meia[0] - mx, meia[1] - my] : null,
    };
  }

  /* As células vizinhas (pelas laterais) de uma forma, onde a meia pode ir. */
  function vizinhas(f) {
    var conj = {};
    f.forEach(function (c) { conj[c[0] + "," + c[1]] = true; });
    var saida = [], vistos = {};
    f.forEach(function (c) {
      [[1, 0], [0, 1], [-1, 0], [0, -1]].forEach(function (d) {
        var x = c[0] + d[0], y = c[1] + d[1], k = x + "," + y;
        if (!conj[k] && !vistos[k]) { vistos[k] = true; saida.push([x, y]); }
      });
    });
    return saida;
  }

  /* Formas prontas para n células, sem cortar na largura da grade: barra
     (deitada e em pé), blocos compactos, L e T. A forma livre (editor)
     cobre qualquer outra. */
  function presets(n, colunas) {
    var lista = [];
    function add(nome, f) {
      var g = normalizarForma(f);
      if (g.length !== n || !conectada(g)) return;
      var chave = JSON.stringify(g);
      if (lista.some(function (p) { return JSON.stringify(p.forma) === chave; })) return;
      lista.push({ nome: nome, forma: g });
    }
    var i;
    if (n <= 0) return [{ nome: "Sem célula", forma: [] }];
    var barraH = [], barraV = [];
    for (i = 0; i < n; i++) { barraH.push([i, 0]); barraV.push([0, i]); }
    add("Barra deitada", barraH);
    add("Barra em pé", barraV);
    /* blocos compactos: largura w, linhas cheias e a última parcial */
    var larguras = [2, 3, Math.ceil(Math.sqrt(n)), colunas || 0].filter(function (w, k, l) { return w >= 2 && w < n && l.indexOf(w) === k; });
    larguras.forEach(function (w) {
      var f = [];
      for (var k = 0; k < n; k++) f.push([k % w, Math.floor(k / w)]);
      add("Bloco de " + w + " de largura", f);
    });
    if (n >= 3) {
      var L = [];
      for (i = 0; i < n - 1; i++) L.push([0, i]);
      L.push([1, n - 2]);
      add("L", L);
    }
    if (n >= 4) {
      var T = [];
      for (i = 0; i < n - 1; i++) T.push([i, 0]);
      T.push([Math.floor((n - 1) / 2), 1]);
      add("T", T);
    }
    return lista;
  }

  /* n cheias e r de meia célula, a partir dos espaços efetivos. */
  function decompor(espacos) {
    var e = Math.max(0, arred(Number(espacos) || 0));
    var n = Math.floor(e + EPS);
    var r = arred(e - n);
    return { n: n, meia: r > EPS ? r : 0, total: e };
  }

  /* A forma padrão de quem ainda não escolheu: a barra deitada, ou um
     bloco da largura da grade quando a barra não cabe. */
  function formaPadrao(n, colunas) {
    var w = Math.max(1, Math.min(n, colunas || n));
    var f = [];
    for (var k = 0; k < n; k++) f.push([k % w, Math.floor(k / w)]);
    return normalizarForma(f);
  }

  function meiaPadrao(forma) {
    if (!forma.length) return [0, 0];
    var v = vizinhas(forma);
    v.sort(function (a, b) { return a[1] - b[1] || a[0] - b[0]; });
    /* depois da última célula, na mesma linha, de preferência */
    var ult = forma[forma.length - 1];
    var dir = v.filter(function (c) { return c[0] === ult[0] + 1 && c[1] === ult[1]; })[0];
    return dir || v[0];
  }

  /* ---------------- dados de um item ---------------- */

  function normalizarUnidade(u) {
    if (!u || typeof u !== "object") return { local: "pendente" };
    if (u.local === "corpo") {
      var s = String(u.slot || "").slice(0, 60);
      return s ? { local: "corpo", slot: s } : { local: "pendente" };
    }
    if (u.local === "grade") {
      var r = String(u.recipiente || "").slice(0, 80);
      if (!r) return { local: "pendente" };
      var saida = { local: "grade", recipiente: r, x: Math.max(0, inteiro(u.x, 0)), y: Math.max(0, inteiro(u.y, 0)), forma: normalizarForma(u.forma).slice(0, 99) };
      if (Array.isArray(u.meia) && u.meia.length === 2) saida.meia = [inteiro(u.meia[0], 0), inteiro(u.meia[1], 0)];
      return saida;
    }
    return { local: "pendente" };
  }

  /* O bloco `grade` de um item, como vem da planilha: só o que tem
     forma de dado. Se a quantidade mudou, sobra ou falta — quem monta
     (montar) decide: o que falta fica pendente. */
  function normalizarDadosDoItem(bruto, quantidade) {
    if (!bruto || typeof bruto !== "object" || !Array.isArray(bruto.unidades)) return null;
    var q = Math.max(1, inteiro(quantidade, 1));
    return { unidades: bruto.unidades.slice(0, q).map(normalizarUnidade) };
  }

  function dadosGrade(item) {
    if (!item.ordem || typeof item.ordem !== "object") item.ordem = {};
    if (!item.ordem.grade || !Array.isArray(item.ordem.grade.unidades)) item.ordem.grade = { unidades: [] };
    return item.ordem.grade;
  }

  /* ---------------- montar a disposição ---------------- */

  /* opcoes = {
       itens, config, recipientes: [{ id, nome, celulas }],
       espacosDe(item) → espaços efetivos de UMA unidade,
       quantidadeDe(item), duasMaos(item) → bool, principal: N
     } */
  function montar(opcoes) {
    var o = opcoes || {};
    var config = normalizarConfig(o.config);
    var grades = {};
    function grade(idG, nome, celulas, item) {
      var n = Math.max(0, Math.min(MAX_CELULAS, inteiro(celulas, 0)));
      var cols = config.colunas[idG] || colunasPadrao(n);
      grades[idG] = {
        id: idG, nome: nome, item: item || null, celulas: n, colunas: cols, linhas: Math.ceil(n / cols) || 0,
        cheia: new Array(n).fill(null), fracoes: [], somaFracao: new Array(n).fill(0), zero: [], pecas: [],
      };
      for (var i = 0; i < n; i++) grades[idG].fracoes.push([]);
    }
    grade(PRINCIPAL, "Inventário", o.principal || 0, null);
    (o.recipientes || []).forEach(function (r) { grade(r.id, r.nome || "Mochila", r.celulas, r.item); });

    var listaSlots = slots(config);
    var corpo = {};
    listaSlots.forEach(function (s) { corpo[s.id] = null; });

    var unidades = [], pendentes = [], faltando = [];
    var porId = {};
    (o.itens || []).forEach(function (item) {
      if (!item || !item.id) return;
      porId[item.id] = item;
      var q = Math.max(1, inteiro(o.quantidadeDe ? o.quantidadeDe(item) : 1, 1));
      var esp = decompor(o.espacosDe ? o.espacosDe(item) : 1);
      var dados = item.ordem && item.ordem.grade && Array.isArray(item.ordem.grade.unidades) ? item.ordem.grade.unidades : [];
      for (var i = 0; i < q; i++) {
        var ref = { item: item, indice: i, uid: item.id + "#" + i, espacos: esp, duasMaos: !!(o.duasMaos && o.duasMaos(item)), salvo: dados[i] ? normalizarUnidade(dados[i]) : null };
        unidades.push(ref);
      }
    });

    var estado = { grades: grades, corpo: corpo, slots: listaSlots, unidades: unidades, pendentes: pendentes, faltando: faltando, porId: porId, config: config };

    /* Primeiro o corpo (é o que a pessoa escolheu por último e com mais
       intenção), depois as grades: quem colide fica pendente. */
    unidades.forEach(function (ref) {
      if (ref.salvo && ref.salvo.local === "corpo") {
        var c = cabeNoCorpo(estado, ref, ref.salvo.slot);
        if (c.ok) ocuparCorpo(estado, ref, ref.salvo.slot);
        else { ref.lugar = { local: "pendente" }; ref.motivo = c.motivo; pendentes.push(ref); }
      }
    });
    unidades.forEach(function (ref) {
      if (ref.lugar) return;
      if (!ref.salvo) { faltando.push(ref); return; }
      if (ref.salvo.local === "grade") {
        var c = cabeNaGrade(estado, ref, ref.salvo);
        if (c.ok) { ocuparGrade(estado, ref, ref.salvo); return; }
        ref.motivo = c.motivo;
      }
      ref.lugar = { local: "pendente" };
      pendentes.push(ref);
    });
    return estado;
  }

  function celulaExiste(g, x, y) {
    return x >= 0 && y >= 0 && x < g.colunas && (y * g.colunas + x) < g.celulas;
  }

  /* As células que um lugar ocupa: cheias e a meia, já absolutas. */
  function celulasDe(lugar) {
    var cheias = (lugar.forma || []).map(function (c) { return [lugar.x + c[0], lugar.y + c[1]]; });
    var meia = lugar.meia ? [lugar.x + lugar.meia[0], lugar.y + lugar.meia[1]] : null;
    return { cheias: cheias, meia: meia };
  }

  /* Um recipiente dentro de outro: a mochila M não pode ir para a grade
     de K se K já está (direta ou indiretamente) dentro de M. */
  function dentroDe(estado, recipienteId, mochilaId, profundidade) {
    if ((profundidade || 0) > 20) return true;
    if (recipienteId === mochilaId) return true;
    if (recipienteId === PRINCIPAL) return false;
    return estado.unidades.some(function (u) {
      return u.item.id === recipienteId && u.lugar && u.lugar.local === "grade" && dentroDe(estado, u.lugar.recipiente, mochilaId, (profundidade || 0) + 1);
    });
  }

  function cabeNaGrade(estado, ref, destino, ignorarProprio) {
    var g = estado.grades[destino.recipiente];
    if (!g) return { ok: false, motivo: "Essa mochila não está mais no inventário." };
    if (estado.grades[ref.item.id] && dentroDe(estado, destino.recipiente, ref.item.id)) {
      return { ok: false, motivo: destino.recipiente === ref.item.id ? "Uma mochila não pode ser guardada dentro dela mesma." : "Essa mochila está dentro desta; uma não pode guardar a outra." };
    }
    var esp = ref.espacos;
    if (esp.n === 0 && !esp.meia) return { ok: true };   /* faixa de espaço zero */
    var forma = normalizarForma(destino.forma);
    if (forma.length !== esp.n || !conectada(forma)) return { ok: false, motivo: "A forma precisa ter " + esp.n + " célula(s) ligadas pelas laterais." };
    var lugar = { x: destino.x, y: destino.y, forma: forma, meia: esp.meia ? (destino.meia || (esp.n ? null : [0, 0])) : null };
    if (esp.meia && !lugar.meia) return { ok: false, motivo: "Escolha onde fica a fração de célula." };
    if (esp.meia && esp.n && !vizinhas(forma).some(function (c) { return c[0] === lugar.meia[0] && c[1] === lugar.meia[1]; })) {
      return { ok: false, motivo: "A fração precisa ficar ao lado da peça." };
    }
    var cel = celulasDe(lugar);
    var proprio = ignorarProprio ? ref.uid : null;
    for (var i = 0; i < cel.cheias.length; i++) {
      var c = cel.cheias[i];
      if (!celulaExiste(g, c[0], c[1])) return { ok: false, motivo: "A peça não cabe inteira em " + g.nome + " nessa posição." };
      var k = c[1] * g.colunas + c[0];
      if (g.cheia[k] && g.cheia[k] !== proprio) return { ok: false, motivo: "Não há espaço contíguo para essa forma aí: uma célula já está ocupada." };
      var frac = g.fracoes[k].filter(function (f) { return f.uid !== proprio; });
      if (frac.length) return { ok: false, motivo: "Uma das células já tem uma fração de outro item." };
    }
    if (cel.meia) {
      if (!celulaExiste(g, cel.meia[0], cel.meia[1])) return { ok: false, motivo: "A fração de célula fica fora de " + g.nome + "." };
      var km = cel.meia[1] * g.colunas + cel.meia[0];
      if (g.cheia[km] && g.cheia[km] !== proprio) return { ok: false, motivo: "A célula da fração está ocupada." };
      var soma = g.fracoes[km].filter(function (f) { return f.uid !== proprio; }).reduce(function (s, f) { return s + f.r; }, 0);
      if (soma + esp.meia > 1 + EPS) return { ok: false, motivo: "A célula da fração já tem " + String(arred(soma)).replace(".", ",") + " ocupado; não cabe mais " + String(esp.meia).replace(".", ",") + "." };
    }
    return { ok: true };
  }

  function ocuparGrade(estado, ref, destino) {
    var g = estado.grades[destino.recipiente];
    var esp = ref.espacos;
    var lugar = { local: "grade", recipiente: destino.recipiente, x: destino.x, y: destino.y, forma: normalizarForma(destino.forma) };
    if (esp.meia) lugar.meia = destino.meia ? destino.meia.slice() : [0, 0];
    ref.lugar = lugar;
    if (esp.n === 0 && !esp.meia) { g.zero.push(ref); return; }
    var cel = celulasDe(lugar);
    cel.cheias.forEach(function (c) { g.cheia[c[1] * g.colunas + c[0]] = ref.uid; });
    if (cel.meia) {
      var km = cel.meia[1] * g.colunas + cel.meia[0];
      g.fracoes[km].push({ uid: ref.uid, r: esp.meia });
      g.somaFracao[km] = arred(g.somaFracao[km] + esp.meia);
    }
    g.pecas.push(ref);
  }

  function liberar(estado, ref) {
    var l = ref.lugar;
    if (!l) return;
    if (l.local === "corpo") {
      Object.keys(estado.corpo).forEach(function (s) { if (estado.corpo[s] === ref) estado.corpo[s] = null; });
    } else if (l.local === "grade" && estado.grades[l.recipiente]) {
      var g = estado.grades[l.recipiente];
      g.cheia = g.cheia.map(function (u) { return u === ref.uid ? null : u; });
      g.fracoes = g.fracoes.map(function (lista, k) {
        var resto = lista.filter(function (f) { return f.uid !== ref.uid; });
        g.somaFracao[k] = arred(resto.reduce(function (s, f) { return s + f.r; }, 0));
        return resto;
      });
      g.zero = g.zero.filter(function (u) { return u !== ref; });
      g.pecas = g.pecas.filter(function (u) { return u !== ref; });
    }
    estado.pendentes = estado.pendentes.filter(function (u) { return u !== ref; });
    ref.lugar = null;
  }

  function cabeNoCorpo(estado, ref, slotId) {
    if (slotId === DUAS_MAOS) {
      if (!ref.duasMaos) return { ok: false, motivo: "Só uma arma de duas mãos ocupa as duas mãos de uma vez." };
      var ocupadas = MAOS.filter(function (m) { return estado.corpo[m] && estado.corpo[m] !== ref; });
      return ocupadas.length ? { ok: false, motivo: "As duas mãos precisam estar livres para empunhar " + (ref.item.nome || "a arma") + "." } : { ok: true };
    }
    if (!(slotId in estado.corpo)) return { ok: false, motivo: "Esse slot do corpo não existe mais." };
    if (ref.duasMaos && MAOS.indexOf(slotId) >= 0) return { ok: false, motivo: (ref.item.nome || "A arma") + " é de duas mãos: ocupa as duas." };
    if (estado.corpo[slotId] && estado.corpo[slotId] !== ref) return { ok: false, motivo: "Esse slot já tem " + (estado.corpo[slotId].item.nome || "um item") + ". Crie um slot extra para sobrepor." };
    return { ok: true };
  }

  function ocuparCorpo(estado, ref, slotId) {
    ref.lugar = { local: "corpo", slot: slotId };
    if (slotId === DUAS_MAOS) MAOS.forEach(function (m) { estado.corpo[m] = ref; });
    else estado.corpo[slotId] = ref;
  }

  function cabe(estado, ref, destino) {
    if (destino.local === "corpo") return cabeNoCorpo(estado, ref, destino.slot);
    if (destino.local === "grade") return cabeNaGrade(estado, ref, destino, true);
    return { ok: false, motivo: "Destino desconhecido." };
  }

  /* Move uma unidade (no estado e no item). Devolve { ok, motivo }. A
     origem só é liberada se o destino couber: recusado, nada muda. */
  function mover(estado, ref, destino) {
    var c = cabe(estado, ref, destino);
    if (!c.ok) return c;
    liberar(estado, ref);
    if (destino.local === "corpo") ocuparCorpo(estado, ref, destino.slot);
    else ocuparGrade(estado, ref, destino);
    gravarUnidade(ref);
    return { ok: true };
  }

  function gravarUnidade(ref) {
    var g = dadosGrade(ref.item);
    while (g.unidades.length <= ref.indice) g.unidades.push({ local: "pendente" });
    g.unidades[ref.indice] = JSON.parse(JSON.stringify(ref.lugar || { local: "pendente" }));
  }

  /* Grava a disposição INTEIRA nos itens (o que a montagem deixou
     pendente vira pendente gravado; o que sobrou acima da quantidade sai). */
  function gravarTudo(estado) {
    var porItem = {};
    estado.unidades.forEach(function (ref) { (porItem[ref.item.id] = porItem[ref.item.id] || []).push(ref); });
    Object.keys(porItem).forEach(function (k) {
      var lista = porItem[k];
      var item = lista[0].item;
      var antes = JSON.stringify(item.ordem && item.ordem.grade || null);
      var g = dadosGrade(item);
      g.unidades = lista.map(function (ref) { return JSON.parse(JSON.stringify(ref.lugar || { local: "pendente" })); });
      lista[0].mudou = antes !== JSON.stringify(g);
    });
  }

  /* ---------------- organizar sozinho ---------------- */

  function primeiroEncaixe(estado, ref, recipientes) {
    var esp = ref.espacos;
    var ordem = recipientes || [PRINCIPAL].concat(Object.keys(estado.grades).filter(function (k) { return k !== PRINCIPAL; }));
    for (var r = 0; r < ordem.length; r++) {
      var g = estado.grades[ordem[r]];
      if (!g) continue;
      if (estado.grades[ref.item.id] && dentroDe(estado, g.id, ref.item.id)) continue;
      if (esp.n === 0 && !esp.meia) return { local: "grade", recipiente: g.id, x: 0, y: 0, forma: [] };
      var formas = esp.n ? presets(esp.n, g.colunas).map(function (p) { return p.forma; }) : [[]];
      for (var f = 0; f < formas.length; f++) {
        var forma = formas[f];
        var meias = esp.meia ? (forma.length ? vizinhas(forma).sort(function (a, b) { return a[1] - b[1] || a[0] - b[0]; }) : [[0, 0]]) : [null];
        for (var y = 0; y < g.linhas; y++) {
          for (var x = 0; x < g.colunas; x++) {
            for (var m = 0; m < meias.length; m++) {
              var d = { local: "grade", recipiente: g.id, x: x, y: y, forma: forma, meia: meias[m] };
              /* a meia não pode puxar a origem para trás do (0, 0) */
              if (meias[m] && (x + meias[m][0] < 0 || y + meias[m][1] < 0)) continue;
              if (cabeNaGrade(estado, ref, d, true).ok) return d;
            }
          }
        }
      }
    }
    return null;
  }

  /* A primeira vez (ou o que chegou sem lugar): o que estava em uso vai
     para o corpo; o resto, do maior para o menor, no primeiro encaixe.
     Quem não couber fica pendente — visível, contado na carga. */
  function organizar(estado, refs, opcoes) {
    var o = opcoes || {};
    var lista = (refs || estado.faltando).slice();
    var colocados = 0;
    if (o.corpoPrimeiro !== false) {
      lista = lista.filter(function (ref) {
        var d = ref.item.ordem || {};
        var slotsTentar = [];
        if (ref.item.tipo === "armadura" && d.emUso) slotsTentar = d.protecao && d.protecao.tipo === "escudo" ? ["maoEsquerda", "maoDireita"] : ["peitoral"];
        else if (d.empunhada) slotsTentar = ref.duasMaos ? [DUAS_MAOS] : ["maoDireita", "maoEsquerda"];
        else if (d.vestida) slotsTentar = ["peitoral"];
        if (ref.indice > 0) slotsTentar = [];   /* só a primeira unidade estava "em uso" */
        for (var s = 0; s < slotsTentar.length; s++) {
          if (cabeNoCorpo(estado, ref, slotsTentar[s]).ok) { liberar(estado, ref); ocuparCorpo(estado, ref, slotsTentar[s]); colocados++; return false; }
        }
        return true;
      });
    }
    lista.sort(function (a, b) { return b.espacos.total - a.espacos.total; });
    lista.forEach(function (ref) {
      var d = primeiroEncaixe(estado, ref);
      liberar(estado, ref);
      if (d) { ocuparGrade(estado, ref, d); colocados++; }
      else { ref.lugar = { local: "pendente" }; estado.pendentes.push(ref); }
    });
    estado.faltando = estado.faltando.filter(function (r) { return !r.lugar; });
    return colocados;
  }

  /* ---------------- carga e estados ---------------- */

  /* Quantas unidades deste item estão SEGURADAS (mãos-base ou as duas). */
  function seguradas(item) {
    var g = item && item.ordem && item.ordem.grade;
    if (!g || !Array.isArray(g.unidades)) return 0;
    var q = Math.max(1, inteiro(item.ordem.quantidade, 1));
    return g.unidades.slice(0, q).filter(function (u) { return u && u.local === "corpo" && (MAOS.indexOf(u.slot) >= 0 || u.slot === DUAS_MAOS); }).length;
  }

  /* Os estados que o motor já reconhece, a partir de onde as unidades
     estão: proteção no corpo = em uso; na mão-base = empunhada;
     vestimenta (ou peça com RD) no corpo = vestida. */
  function sincronizar(item) {
    if (!item || !item.ordem) return;
    var g = item.ordem.grade;
    var us = g && Array.isArray(g.unidades) ? g.unidades : [];
    var noCorpo = us.some(function (u) { return u && u.local === "corpo"; });
    var naMao = us.some(function (u) { return u && u.local === "corpo" && (MAOS.indexOf(u.slot) >= 0 || u.slot === DUAS_MAOS); });
    var vestido = us.some(function (u) { return u && u.local === "corpo" && MAOS.indexOf(u.slot) < 0 && u.slot !== DUAS_MAOS; });
    if (item.tipo === "armadura") { if (noCorpo) item.ordem.emUso = true; else delete item.ordem.emUso; }
    if (naMao) item.ordem.empunhada = true; else delete item.ordem.empunhada;
    var vestimenta = (item.ordem.marcadores || []).indexOf("vestimenta") >= 0 || !!item.ordem.rd;
    if (vestimenta) { if (vestido) item.ordem.vestida = true; else delete item.ordem.vestida; }
  }

  function nomeDoSlot(config, slotId) {
    if (slotId === DUAS_MAOS) return "Duas mãos";
    var s = slots(config).filter(function (x) { return x.id === slotId; })[0];
    if (!s) return "Slot";
    var parte = PARTES.filter(function (p) { return p.chave === s.parte; })[0];
    if (s.base) return parte.nome;
    var extras = slotsDaParte(config, s.parte).filter(function (x) { return !x.base; });
    return parte.nome + " (extra " + (extras.findIndex(function (x) { return x.id === slotId; }) + 1) + ")";
  }

  global.RAMAOrdemGrade = {
    PARTES: PARTES,
    MAOS: MAOS,
    DUAS_MAOS: DUAS_MAOS,
    PRINCIPAL: PRINCIPAL,
    normalizarConfig: normalizarConfig,
    slots: slots,
    slotsDaParte: slotsDaParte,
    adicionarSlot: adicionarSlot,
    removerSlot: removerSlot,
    nomeDoSlot: nomeDoSlot,
    colunasPadrao: colunasPadrao,
    normalizarForma: normalizarForma,
    conectada: conectada,
    formaValida: formaValida,
    girarComMeia: girarComMeia,
    espelharComMeia: espelharComMeia,
    vizinhas: vizinhas,
    presets: presets,
    decompor: decompor,
    formaPadrao: formaPadrao,
    meiaPadrao: meiaPadrao,
    normalizarDadosDoItem: normalizarDadosDoItem,
    montar: montar,
    cabe: cabe,
    mover: mover,
    liberar: liberar,
    gravarUnidade: gravarUnidade,
    gravarTudo: gravarTudo,
    primeiroEncaixe: primeiroEncaixe,
    organizar: organizar,
    seguradas: seguradas,
    sincronizar: sincronizar,
    celulasDe: celulasDe,
  };
})(typeof window !== "undefined" ? window : globalThis);
