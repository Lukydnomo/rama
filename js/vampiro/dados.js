/* =====================================================================
   R.A.M.A. — Vampiro: A Máscara (V5) · o motor de dados
   =====================================================================
   Paradas de d10, Livro Básico p. 117–125 e 205–207. Puro: quem rola
   passa um `rolador(faces)` (na página, o de js/dados.js; nos testes,
   uma fila). Nada aqui toca a ficha — a ficha (regras.js) monta a
   parada, cobra os custos e aplica as consequências.

     · cada dado de 6 a 9 é um sucesso; o 10 também;
     · cada PAR de 10 vale 4 sucessos (2 a mais que os dois 10 sozinhos):
       três 10 = 5 sucessos, quatro 10 = 8;
     · a Dificuldade é o número de sucessos necessários — o limiar de
       cada dado continua 6;
     · dados de Fome SUBSTITUEM dados comuns (a parada não cresce): tantos
       quanto a Fome, nunca mais que a parada; Checagens e testes de
       trilha (Força de Vontade, Humanidade) não têm dado de Fome;
     · crítico bestial: vitória CRÍTICA com um 10 num dado de Fome;
       falha bestial: teste FRACASSADO com um 1 num dado de Fome; um 1
       de Fome numa vitória não é nada, um 10 de Fome sozinho não é
       crítico;
     · Força de Vontade rerrola até 3 dados COMUNS, uma vez por rolagem,
       nunca dados de Fome, nunca Checagens, trilhas ou conflito de
       rolagem única; os resultados novos valem, mesmo piores.

   A rolagem nasce PENDENTE: enquanto houver uma decisão que pode mudar
   a classificação (rerrolar com FdV), a ficha não aplica consequências.
   Quem conclui é concluir(); depois disso nada muda.
   ===================================================================== */

(function (global) {
  "use strict";

  var LIMIAR = 6;
  var MAX_RERROLAGEM = 3;

  function inteiro(v, min, padrao) {
    var n = Math.floor(Number(v));
    if (!isFinite(n)) n = padrao === undefined ? 0 : padrao;
    return min !== undefined && n < min ? min : n;
  }

  function face(rolador) {
    var f = Math.floor(Number(rolador(10)));
    return f >= 1 && f <= 10 ? f : 1;
  }

  /* Conta sucessos de uma lista de faces (ou de dados {face}). */
  function contar(dados) {
    var faces = dados.map(function (d) { return typeof d === "number" ? d : d.face; });
    var simples = faces.filter(function (f) { return f >= LIMIAR; }).length;
    var dezes = faces.filter(function (f) { return f === 10; }).length;
    var pares = Math.floor(dezes / 2);
    return { sucessos: simples + pares * 2, dezes: dezes, pares: pares, critico: pares > 0 };
  }

  /* Quantos dos dados de uma parada são de Fome (p. 205). */
  function dadosDeFome(parada, fome, semFome) {
    if (semFome) return 0;
    return Math.max(0, Math.min(inteiro(parada, 0), inteiro(fome, 0)));
  }

  /* Rola uma parada. `o`:
       parada     número de dados (mínimo 1, salvo checagem)
       fome       Fome atual (ignorada com semFome)
       tipo       "teste" | "trilha" | "checagem" | "rolagemUnica"
       dificuldade, oposicao (sucessos do oponente), agente (quem age vence o empate)
       composicao [{ fonte, valor }] — guardada no histórico
       rotulo, id
     Devolve um RESULTADO, pendente até concluir(). */
  function rolar(o, rolador) {
    var tipo = o.tipo || "teste";
    var semFome = tipo !== "teste" || !!o.semFome;
    var parada = Math.max(1, inteiro(o.parada, 1));
    var nFome = dadosDeFome(parada, o.fome, semFome);
    var dados = [];
    for (var i = 0; i < parada; i++) {
      var f = face(rolador);
      /* Os de Fome são os ÚLTIMOS da parada: os comuns vêm antes. */
      dados.push({ i: i, face: f, original: f, fome: i >= parada - nFome, rerrolado: false });
    }
    var r = {
      id: o.id || "",
      rotulo: o.rotulo || "",
      tipo: tipo,
      parada: parada,
      fome: nFome,
      composicao: Array.isArray(o.composicao) ? o.composicao.slice() : [],
      dificuldade: o.dificuldade === undefined || o.dificuldade === null || o.dificuldade === "" ? null : Math.max(0, inteiro(o.dificuldade, 0)),
      oposicao: o.oposicao === undefined || o.oposicao === null ? null : Math.max(0, inteiro(o.oposicao, 0)),
      agente: o.agente !== false,
      dados: dados,
      rerrolagem: null,
      pendente: true,
      surto: !!o.surto,
      custos: Array.isArray(o.custos) ? o.custos.slice() : [],
    };
    r.classificacao = classificar(r);
    return r;
  }

  /* A classificação de um resultado com o que se sabe: SEM Dificuldade
     nem oposição, não há vitória a anunciar — só os sucessos. */
  function classificar(r) {
    var c = contar(r.dados);
    var fomeDez = r.dados.some(function (d) { return d.fome && d.face === 10; });
    var fomeUm = r.dados.some(function (d) { return d.fome && d.face === 1; });
    var alvo = r.oposicao !== null && r.oposicao !== undefined ? r.oposicao : r.dificuldade;
    var julgado = alvo !== null && alvo !== undefined;
    var out = { sucessos: c.sucessos, dezes: c.dezes, pares: c.pares, critico: c.critico, julgado: julgado };
    if (!julgado) return out;
    /* Disputa: quem age vence o empate (p. 123). */
    var vitoria = r.oposicao !== null && r.oposicao !== undefined
      ? (r.agente ? c.sucessos >= r.oposicao : c.sucessos > r.oposicao)
      : c.sucessos >= r.dificuldade;
    out.vitoria = vitoria;
    out.margem = vitoria ? c.sucessos - alvo : 0;
    out.faltam = vitoria ? 0 : alvo - c.sucessos;
    out.vitoriaCritica = vitoria && c.critico;
    /* Bestiais só em testes com Fome (p. 207). */
    out.criticoBestial = r.tipo === "teste" && out.vitoriaCritica && fomeDez;
    out.falhaBestial = r.tipo === "teste" && !vitoria && fomeUm;
    out.falhaTotal = c.sucessos === 0;
    /* Vencer a um custo (p. 121): algum sucesso, mas não o bastante. */
    out.podeVencerACusto = !vitoria && c.sucessos > 0 && r.tipo !== "checagem";
    return out;
  }

  /* Julgar depois: a Dificuldade ou a oposição chegou. */
  function julgar(r, criterio) {
    if (!r.pendente) return { ok: false, motivo: "A rolagem já foi concluída." };
    if (criterio.dificuldade !== undefined) r.dificuldade = Math.max(0, inteiro(criterio.dificuldade, 0));
    if (criterio.oposicao !== undefined) r.oposicao = Math.max(0, inteiro(criterio.oposicao, 0));
    if (criterio.agente !== undefined) r.agente = !!criterio.agente;
    r.classificacao = classificar(r);
    return { ok: true };
  }

  /* Pode rerrolar? E quais dados (índices). */
  function podeRerrolar(r) {
    if (!r.pendente) return { ok: false, motivo: "A rolagem já foi concluída." };
    if (r.tipo !== "teste") return { ok: false, motivo: "Força de Vontade não rerrola Checagens, testes de trilha nem conflito de rolagem única." };
    if (r.rerrolagem) return { ok: false, motivo: "Esta rolagem já usou Força de Vontade." };
    if (!r.dados.some(function (d) { return !d.fome; })) return { ok: false, motivo: "Não há dados comuns para rerrolar." };
    return { ok: true };
  }

  /* Rerrola até 3 dados comuns escolhidos (índices). O custo (1 dano
     Superficial à FdV, sem dividir) é cobrado pela ficha. */
  function rerrolar(r, indices, rolador) {
    var pode = podeRerrolar(r);
    if (!pode.ok) return pode;
    var lista = (Array.isArray(indices) ? indices : []).map(Number).filter(function (i, k, todos) { return todos.indexOf(i) === k; });
    if (!lista.length) return { ok: false, motivo: "Escolha ao menos um dado." };
    if (lista.length > MAX_RERROLAGEM) return { ok: false, motivo: "Até três dados." };
    for (var k = 0; k < lista.length; k++) {
      var d = r.dados[lista[k]];
      if (!d) return { ok: false, motivo: "Dado inexistente." };
      if (d.fome) return { ok: false, motivo: "Dados de Fome não podem ser rerrolados com Força de Vontade." };
    }
    var antes = r.classificacao;
    lista.forEach(function (i) {
      var d = r.dados[i];
      d.face = face(rolador);
      d.rerrolado = true;
    });
    r.rerrolagem = { indices: lista, antes: { sucessos: antes.sucessos, criticoBestial: !!antes.criticoBestial, falhaBestial: !!antes.falhaBestial } };
    r.classificacao = classificar(r);
    return { ok: true };
  }

  /* Fecha a rolagem: a classificação não muda mais. `vencerACusto`:
     o Narrador aceitou (só quando possível). */
  function concluir(r, opcoes) {
    var o = opcoes || {};
    if (!r.pendente) return { ok: true, repetida: true };
    if (o.vencerACusto) {
      if (!r.classificacao.podeVencerACusto) return { ok: false, motivo: "Só quando a rolagem teve algum sucesso e falhou." };
      r.classificacao.vitoriaACusto = true;
    }
    r.pendente = false;
    return { ok: true };
  }

  /* Checagem (p. 122): 1 dado, sucesso em 6+; `dados: 2` rola dois e
     fica com o melhor (Potência do Sangue, Humanidade 8 no Rubor). */
  function checagem(rolador, opcoes) {
    var n = opcoes && opcoes.dados === 2 ? 2 : 1;
    var faces = [];
    for (var i = 0; i < n; i++) faces.push(face(rolador));
    var melhor = Math.max.apply(null, faces);
    return { faces: faces, face: melhor, sucesso: melhor >= LIMIAR, dois: n === 2 };
  }

  /* Vitória automática (p. 120): parada ≥ 2 × Dificuldade, margem 0.
     Nunca em checagens. */
  function vitoriaAutomatica(parada, dificuldade) {
    var d = inteiro(dificuldade, 0);
    return d > 0 && inteiro(parada, 0) >= 2 * d;
  }

  /* Pegar a metade (p. 123): metade da parada, arredondada para baixo. */
  function pegarAMetade(parada) { return Math.floor(inteiro(parada, 0) / 2); }

  /* Disputa entre dois resultados já rolados: vence quem tem mais
     sucessos; empate favorece quem age (p. 123). */
  function disputa(agente, oponente) {
    var a = contar(agente.dados).sucessos, b = contar(oponente.dados).sucessos;
    return { agente: a, oponente: b, vence: a >= b ? "agente" : "oponente", margem: Math.abs(a - b) };
  }

  /* Conflito (p. 125): o vencedor subtrai os sucessos do perdedor e
     aplica o resto como dano, somado ao modificador da arma. Empate
     bilateral: os dois causam dano como se vencessem por 1. */
  function resolverConflito(a, b, opcoes) {
    var o = opcoes || {};
    var sa = typeof a === "number" ? a : contar(a.dados).sucessos;
    var sb = typeof b === "number" ? b : contar(b.dados).sucessos;
    if (sa === sb) {
      if (o.bilateral) return { empate: true, danoEmB: 1 + (o.armaA || 0), danoEmA: 1 + (o.armaB || 0) };
      return { empate: true, danoEmB: 0, danoEmA: 0 };
    }
    if (sa > sb) return { vence: "a", margem: sa - sb, danoEmB: sa - sb + (o.armaA || 0), danoEmA: 0 };
    return { vence: "b", margem: sb - sa, danoEmA: o.bilateral ? sb - sa + (o.armaB || 0) : 0, danoEmB: 0, defendeu: !o.bilateral };
  }

  /* Conflito de rolagem única (p. 298): dano = dobro da Dificuldade −
     sucessos, sem dividir, sem armadura, sem FdV nem Surto. */
  function danoDeRolagemUnica(sucessos, dificuldade) {
    return Math.max(0, 2 * inteiro(dificuldade, 0) - inteiro(sucessos, 0));
  }

  /* Teste estendido (p. 293–294): acumula sucessos por rolagem. */
  function testeEstendido(estado, resultado, variante) {
    var e = estado || { total: 0, rolagens: 0, encerrado: false };
    if (e.encerrado) return e;
    var c = resultado.classificacao || classificar(resultado);
    e.rolagens++;
    if (c.falhaTotal) { e.total = 0; e.falhaTotal = true; if (variante === "cascata") e.encerrado = true; return e; }
    if (variante === "dificil") e.total += c.vitoria ? c.margem : 0;
    else if (variante === "cascata") { if (!c.vitoria) { e.encerrado = true; return e; } e.total += 1; e.bonusProxima = c.margem; }
    else e.total += c.sucessos;
    return e;
  }

  /* O que vai para o histórico: tudo o que a rolagem foi. */
  function paraHistorico(r) {
    return {
      v: 1, sistema: "vampiro", tipo: r.tipo, rotulo: r.rotulo, parada: r.parada, fome: r.fome,
      composicao: r.composicao, dificuldade: r.dificuldade, oposicao: r.oposicao,
      dados: r.dados.map(function (d) { return { face: d.face, original: d.original, fome: d.fome, rerrolado: d.rerrolado }; }),
      rerrolagem: r.rerrolagem, classificacao: r.classificacao, surto: r.surto, custos: r.custos,
      consequencias: r.consequencias || [],
    };
  }

  /* Texto acessível de um dado: nunca só a cor. */
  function rotuloDoDado(d) {
    var tipo = d.fome ? "dado de Fome" : "dado comum";
    var leitura = d.face === 10 ? (d.fome ? "10, crítico de Fome" : "10, crítico")
      : d.face >= LIMIAR ? d.face + ", sucesso"
      : d.face === 1 && d.fome ? "1, bestial" : d.face + ", falha";
    return tipo + ": " + leitura + (d.rerrolado ? " (rerrolado, era " + d.original + ")" : "");
  }

  global.RAMAVampiroDados = {
    LIMIAR: LIMIAR, MAX_RERROLAGEM: MAX_RERROLAGEM,
    contar: contar, dadosDeFome: dadosDeFome, rolar: rolar, classificar: classificar, julgar: julgar,
    podeRerrolar: podeRerrolar, rerrolar: rerrolar, concluir: concluir, checagem: checagem,
    vitoriaAutomatica: vitoriaAutomatica, pegarAMetade: pegarAMetade, disputa: disputa,
    resolverConflito: resolverConflito, danoDeRolagemUnica: danoDeRolagemUnica, testeEstendido: testeEstendido,
    paraHistorico: paraHistorico, rotuloDoDado: rotuloDoDado,
  };
})(typeof window !== "undefined" ? window : globalThis);
