/* =====================================================================
   R.A.M.A. — Malditos Goblins · o motor de dados (d6)
   =====================================================================
   Livro p. 14–15. Puro: quem rola passa um `rolador(faces)` (na
   página, o de js/dados.js; nos testes, uma fila). Nada aqui toca a
   ficha — regras.js monta a parada e aplica as consequências.

     · a parada é o atributo + bônus (arma, técnica, item…); fácil +1
       dado, difícil −1;
     · cada dado de 4 a 6 é 1 HIT;
     · cada 6 EXPLODE: além do hit, rola mais um dado, que também
       explode no 6 — em cadeia, sem limite (o livro diz
       "infinitamente"). Por padrão as explosões se resolvem sozinhas;
       com `explosoes: "manual"` cada uma espera a pessoa ("pode rolar
       mais um dado") e ela pode parar;
     · EXPLOSÃO DE GOBLIN: todos os dados caíram em 1 → o goblin
       explode. Só na rolagem de um goblin de jogador
       (`podeExplodirGoblin`), e nunca com a Voz Goblin declarada (regra
       opcional, p. 16);
     · TESTE: 0 hits Falhou! · 1 Conseguiu, mas deu ruim… · 2
       Conseguiu! · 3+ Conseguiu e foi épico! (o rótulo para em 3; os
       hits, não);
     · ATAQUE: os hits são os ferimentos — sem teto;
     · ESQUIVA: cada hit tira um hit do atacante;
     · CONJURAR: o resultado da magia é min(hits, 3).

   Parada de 0 dados (atributo 0, teste difícil com 1 dado…): o livro
   não diz. Com `seZero` ausente a rolagem volta `lacuna: true` e
   ninguém decide por ela; "falha" conta como 0 hits sem rolar (e sem
   explosão de goblin); "umDado" rola 1 dado (regra da casa, marcada).

   Também aqui: sorteios em tabela (1d6, 2d6 somados, 2d6 coluna e
   linha), rolagens de quantidade (1d6−2, 3d6…) e o minijogo da
   pescaria (Vale dos Goblins, p. 41). Nenhum deles explode nem conta
   hit — são outra coisa, e o histórico diz qual.
   ===================================================================== */

(function (global) {
  "use strict";

  var LIMIAR = 4;
  var EXPLODE = 6;
  /* Guarda contra um rolador quebrado (sempre 6). Dado de verdade não
     chega perto: 500 seis seguidos. A cadeia não é cortada por regra. */
  var GUARDA_DE_CADEIA = 500;

  var RESULTADOS = ["Falhou!", "Conseguiu, mas deu ruim…", "Conseguiu!", "Conseguiu e foi épico!"];

  function inteiro(v, padrao) {
    var n = Math.floor(Number(v));
    return isFinite(n) ? n : (padrao === undefined ? 0 : padrao);
  }

  function face(rolador, faces) {
    var f = faces || 6;
    var n = Math.floor(Number(rolador(f)));
    return n >= 1 && n <= f ? n : 1;
  }

  /* Ajuste de dificuldade (p. 14). */
  function ajusteDeDificuldade(d) { return d === "facil" ? 1 : d === "dificil" ? -1 : 0; }

  /* Monta a parada: base + parcelas + dificuldade. A composição fica
     com cada parcela (fonte, valor) para a tela e o histórico. */
  function montarParada(base, parcelas, dificuldade, opcoes) {
    var comp = [{ fonte: base.fonte, valor: inteiro(base.valor) }];
    (parcelas || []).forEach(function (p) { if (p && inteiro(p.valor)) comp.push({ fonte: p.fonte, valor: inteiro(p.valor) }); });
    var aj = ajusteDeDificuldade(dificuldade);
    if (aj) comp.push({ fonte: aj > 0 ? "Teste fácil" : "Teste difícil", valor: aj });
    var total = comp.reduce(function (s, c) { return s + c.valor; }, 0);
    /* Dobrar (Ataque Brutal, Tiro Certeiro): o dobro da parada já
       montada — todos os dados, não só o atributo. */
    if (opcoes && opcoes.dobrar && total > 0) { comp.push({ fonte: opcoes.dobrar, valor: total }); total = total * 2; }
    return { parada: total, composicao: comp };
  }

  /* Rola uma parada. `o`:
       parada            dados (já com tudo)
       tipo              "teste" | "ataque" | "esquiva" | "conjurar" | "oposto"
       rotulo, id, composicao
       necessarios       hits exigidos (captura, Livro Estranho, cozinha…)
       explosoes         "auto" (padrão) | "manual"
       podeExplodirGoblin  padrão true (goblin de jogador)
       vozGoblin         a regra opcional, declarada por quem joga
       seZero            "falha" | "umDado" (ver o cabeçalho) */
  function rolar(o, rolador) {
    var tipo = o.tipo || "teste";
    var parada = inteiro(o.parada, 0);
    var r = {
      id: o.id || "", tipo: tipo, rotulo: o.rotulo || "",
      composicao: Array.isArray(o.composicao) ? o.composicao.slice() : [],
      paradaPedida: parada, parada: Math.max(0, parada),
      necessarios: o.necessarios === undefined || o.necessarios === null ? null : Math.max(0, inteiro(o.necessarios)),
      modoExplosao: o.explosoes === "manual" ? "manual" : "auto",
      podeExplodirGoblin: o.podeExplodirGoblin !== false,
      vozGoblin: !!o.vozGoblin,
      dados: [], explosoesPendentes: 0, explosoesRecusadas: 0,
      lacuna: false, casaUmDado: false, zeroComoFalha: false, cortada: false,
      concluida: false,
    };
    if (r.parada <= 0) {
      if (o.seZero === "umDado") { r.parada = 1; r.casaUmDado = true; }
      else if (o.seZero === "falha") { r.zeroComoFalha = true; r.concluida = true; r.classificacao = classificar(r); return r; }
      else { r.lacuna = true; r.classificacao = classificar(r); return r; }
    }
    for (var i = 0; i < r.parada; i++) {
      var f = face(rolador);
      r.dados.push({ face: f, origem: "inicial", de: null });
      if (f === EXPLODE) r.explosoesPendentes++;
    }
    if (r.modoExplosao === "auto") resolverTodas(r, rolador);
    r.classificacao = classificar(r);
    if (!r.explosoesPendentes) r.concluida = true;
    return r;
  }

  /* Uma explosão: o dado novo vem DO último 6 ainda não seguido. */
  function explodir(r, rolador) {
    if (!r.explosoesPendentes) return { ok: false, motivo: "Nenhum 6 esperando." };
    if (r.dados.length >= GUARDA_DE_CADEIA) { r.cortada = true; r.explosoesPendentes = 0; r.classificacao = classificar(r); r.concluida = true; return { ok: false, motivo: "Rolador sem fim (500 dados)." }; }
    var seguidos = {};
    r.dados.forEach(function (d) { if (d.de !== null) seguidos[d.de] = true; });
    var pai = -1;
    for (var i = 0; i < r.dados.length; i++) if (r.dados[i].face === EXPLODE && !seguidos[i]) { pai = i; break; }
    var f = face(rolador);
    r.dados.push({ face: f, origem: "explosao", de: pai });
    r.explosoesPendentes--;
    if (f === EXPLODE) r.explosoesPendentes++;
    r.classificacao = classificar(r);
    if (!r.explosoesPendentes) r.concluida = true;
    return { ok: true, face: f };
  }

  function resolverTodas(r, rolador) {
    while (r.explosoesPendentes > 0) {
      if (!explodir(r, rolador).ok) break;
    }
  }

  /* "Pode rolar" — a pessoa decidiu não rolar as que faltam. */
  function recusarExplosoes(r) {
    r.explosoesRecusadas += r.explosoesPendentes;
    r.explosoesPendentes = 0;
    r.classificacao = classificar(r);
    r.concluida = true;
    return { ok: true };
  }

  function contarHits(dados) { return dados.filter(function (d) { return d.face >= LIMIAR; }).length; }

  function classificar(r) {
    var iniciais = r.dados.filter(function (d) { return d.origem === "inicial"; });
    var hits = contarHits(r.dados);
    var todosUm = iniciais.length > 0 && r.dados.every(function (d) { return d.face === 1; });
    var c = {
      hits: hits,
      explosoes: r.dados.filter(function (d) { return d.origem === "explosao"; }).length,
      todosUm: todosUm,
      goblinExplode: todosUm && r.podeExplodirGoblin && !r.vozGoblin && !r.casaUmDado,
      vozSalvou: todosUm && r.podeExplodirGoblin && r.vozGoblin,
      lacuna: !!r.lacuna,
    };
    var nivel = Math.min(hits, 3);
    c.nivel = nivel;
    if (r.tipo === "ataque") { c.ferimentos = hits; c.rotulo = hits + " ferimento(s)"; }
    else if (r.tipo === "esquiva") { c.reduz = hits; c.rotulo = "Esquiva: −" + hits + " hit(s) do atacante"; }
    else if (r.tipo === "conjurar") { c.resultado = nivel; c.rotulo = hits + " hit(s) — resultado " + (nivel === 3 ? "3+" : nivel); }
    else if (r.tipo === "oposto") { c.rotulo = hits + " hit(s)"; }
    else { c.resultado = nivel; c.rotulo = RESULTADOS[nivel]; }
    if (r.necessarios !== null && r.necessarios !== undefined) {
      c.sucesso = hits >= r.necessarios;
      c.rotuloNecessarios = (c.sucesso ? "Conseguiu" : "Não conseguiu") + " (" + hits + " de " + r.necessarios + " hit(s))";
    } else {
      c.sucesso = hits >= 1;
    }
    if (r.lacuna) c.rotulo = "Parada sem dados — o livro não diz o que fazer";
    if (r.zeroComoFalha) c.rotulo = (r.tipo === "teste" ? RESULTADOS[0] : "0 hits") + " (parada sem dados, contada como falha)";
    return c;
  }

  /* Disputa (negociação, p. 18; ou qualquer teste oposto). */
  function disputa(hitsA, hitsB) {
    var a = inteiro(hitsA), b = inteiro(hitsB);
    return { a: a, b: b, vence: a > b ? "a" : b > a ? "b" : "empate" };
  }

  /* ---------------------------------------------------------------
     SORTEIOS EM TABELA, QUANTIDADES
     --------------------------------------------------------------- */

  /* tabela: { id, nome, pagina, dados: "1d6"|"2d6"|"colunaLinha"|"d7",
     entradas } — 1d6: lista de 6; 2d6: { 2..12 }; colunaLinha: [col][lin].
     Devolve o sorteio inteiro (dados, índice, resultado). */
  function sortear(tabela, rolador) {
    var dados = [], indice, resultado;
    if (tabela.dados === "2d6") {
      dados = [face(rolador), face(rolador)];
      indice = dados[0] + dados[1];
      resultado = tabela.entradas[indice];
    } else if (tabela.dados === "colunaLinha") {
      dados = [face(rolador), face(rolador)];
      indice = { coluna: dados[0], linha: dados[1] };
      resultado = tabela.entradas[dados[0] - 1][dados[1] - 1];
    } else if (/^d\d+$/.test(tabela.dados || "")) {
      var n = inteiro(tabela.dados.slice(1), 6);
      dados = [face(rolador, n)];
      indice = dados[0];
      resultado = tabela.entradas[dados[0] - 1];
    } else {
      dados = [face(rolador)];
      indice = dados[0];
      resultado = tabela.entradas[dados[0] - 1];
    }
    return { tipo: "sorteio", tabela: tabela.id || "", nome: tabela.nome || "", pagina: tabela.pagina || null, dados: dados, indice: indice, resultado: resultado === undefined ? null : JSON.parse(JSON.stringify(resultado)) };
  }

  /* "1d6", "2d6", "1d6-2", "1d6+5", "3d6", "1d2", "4" — mínimo 0. */
  var EXPRESSAO = /^\s*(\d*)d(\d+)\s*([+-]\s*\d+)?\s*$/i;
  function quantidade(expr, rolador) {
    var texto = String(expr === undefined || expr === null ? "" : expr).replace(/−/g, "-");
    if (/^\s*\d+\s*$/.test(texto)) return { tipo: "quantidade", expressao: texto.trim(), dados: [], total: inteiro(texto), bruto: inteiro(texto) };
    var m = EXPRESSAO.exec(texto);
    if (!m) return { tipo: "quantidade", expressao: texto, dados: [], total: 0, bruto: 0, invalida: true };
    var n = m[1] ? inteiro(m[1], 1) : 1, faces = inteiro(m[2], 6), soma = m[3] ? inteiro(m[3].replace(/\s/g, "")) : 0;
    var dados = [];
    for (var i = 0; i < n; i++) dados.push(face(rolador, faces));
    var bruto = dados.reduce(function (s, d) { return s + d; }, 0) + soma;
    return { tipo: "quantidade", expressao: texto.trim(), dados: dados, total: Math.max(0, bruto), bruto: bruto, minimoZero: bruto < 0 };
  }

  /* "1 chance em 6" (sai no 6) ou 50% (4–6). */
  function chance(tipo, rolador) {
    var f = face(rolador);
    return { tipo: "chance", chance: tipo, dados: [f], saiu: tipo === "50%" ? f >= 4 : f === 6 };
  }

  /* ---------------------------------------------------------------
     PESCARIA (Vale dos Goblins, p. 41)
     5 dados; rerrola de 1 a 5 escolhidos, no máximo duas vezes; a
     combinação (dados iguais) dá o peso, o valor do dado o peixe.
     --------------------------------------------------------------- */
  function pescar(rolador, local) {
    var dados = [];
    for (var i = 0; i < 5; i++) dados.push(face(rolador));
    return { tipo: "pescaria", local: local === "lago" ? "lago" : "rio", dados: dados, historico: [dados.slice()], rerrolagens: 0, concluida: false };
  }

  function rerrolarPescaria(p, indices, rolador) {
    if (p.concluida) return { ok: false, motivo: "A pescaria já terminou." };
    if (p.rerrolagens >= 2) return { ok: false, motivo: "Só dá para rerrolar duas vezes." };
    var lista = (Array.isArray(indices) ? indices : []).map(Number).filter(function (i, k, t) { return i >= 0 && i < 5 && t.indexOf(i) === k; });
    if (!lista.length) return { ok: false, motivo: "Escolha de 1 a 5 dados." };
    lista.forEach(function (i) { p.dados[i] = face(rolador); });
    p.rerrolagens++;
    p.historico.push(p.dados.slice());
    return { ok: true };
  }

  /* As combinações possíveis: [{ valor, iguais }], maior primeiro. */
  function combinacoes(dados) {
    var cont = {};
    dados.forEach(function (d) { cont[d] = (cont[d] || 0) + 1; });
    return Object.keys(cont).map(Number).filter(function (v) { return cont[v] >= 2; })
      .map(function (v) { return { valor: v, iguais: cont[v] }; })
      .sort(function (a, b) { return b.iguais - a.iguais || b.valor - a.valor; });
  }

  /* Fecha: `escolha` (o valor do dado) desempata combinações do mesmo
     tamanho; sem ela, vale a maior (e, no empate, o maior valor). */
  function concluirPescaria(p, pesos, peixes, escolha) {
    if (p.concluida) return { ok: true, repetida: true, peixe: p.peixe };
    var cs = combinacoes(p.dados);
    p.concluida = true;
    if (!cs.length) { p.peixe = null; return { ok: true, peixe: null }; }
    var maior = cs[0].iguais;
    var empatadas = cs.filter(function (c) { return c.iguais === maior; });
    var c = empatadas[0];
    if (escolha !== undefined && escolha !== null) {
      var e = empatadas.filter(function (x) { return x.valor === inteiro(escolha); })[0];
      if (e) c = e;
    }
    p.peixe = { valor: c.valor, iguais: c.iguais, nome: peixes[p.local][c.valor - 1], gramas: pesos[c.iguais], empate: empatadas.length > 1 };
    return { ok: true, peixe: p.peixe };
  }

  /* ---------------------------------------------------------------
     PARA A TELA E O HISTÓRICO
     --------------------------------------------------------------- */

  function rotuloDoDado(d) {
    var leitura = d.face === EXPLODE ? "6, hit e explode" : d.face >= LIMIAR ? d.face + ", hit" : d.face + ", sem hit";
    return (d.origem === "explosao" ? "dado de explosão: " : "dado: ") + leitura;
  }

  /* O resultado no formato do mostrador de rolagens (js/paginas/
     ficha-rolagens.js): faces, marcas ("explosao" no dado que veio de
     um 6), total = hits, e as parcelas da parada. */
  function paraCartao(r) {
    var c = r.classificacao || classificar(r);
    var nIni = r.dados.filter(function (d) { return d.origem === "inicial"; }).length;
    var nExp = r.dados.length - nIni;
    return {
      tipo: "goblins",
      expressao: (r.lacuna || r.zeroComoFalha ? "0 dados" : nIni + " dado" + (nIni === 1 ? "" : "s")) + (nExp ? " + " + nExp + " de explosão" : ""),
      rolagens: r.dados.map(function (d) { return d.face; }),
      marcas: r.dados.map(function (d) { return d.origem === "explosao" ? "explosao" : ""; }),
      total: c.hits,
      parcelas: (r.composicao || []).map(function (p) { return { rotulo: p.fonte, valor: p.valor }; }),
    };
  }

  function paraHistorico(r) {
    return {
      v: 1, sistema: "goblins", tipo: r.tipo, rotulo: r.rotulo, parada: r.parada, composicao: r.composicao,
      dados: r.dados.map(function (d) { return { face: d.face, origem: d.origem, de: d.de }; }),
      necessarios: r.necessarios, classificacao: r.classificacao, explosoesRecusadas: r.explosoesRecusadas,
      lacuna: r.lacuna, casaUmDado: r.casaUmDado, zeroComoFalha: r.zeroComoFalha, vozGoblin: r.vozGoblin,
    };
  }

  global.RAMAGoblinsDados = {
    LIMIAR: LIMIAR, EXPLODE: EXPLODE, RESULTADOS: RESULTADOS,
    ajusteDeDificuldade: ajusteDeDificuldade, montarParada: montarParada,
    rolar: rolar, explodir: explodir, recusarExplosoes: recusarExplosoes, classificar: classificar, contarHits: contarHits, disputa: disputa,
    sortear: sortear, quantidade: quantidade, chance: chance,
    pescar: pescar, rerrolarPescaria: rerrolarPescaria, combinacoes: combinacoes, concluirPescaria: concluirPescaria,
    rotuloDoDado: rotuloDoDado, paraCartao: paraCartao, paraHistorico: paraHistorico,
  };
})(typeof window !== "undefined" ? window : globalThis);
