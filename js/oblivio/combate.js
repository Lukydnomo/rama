/* =====================================================================
   R.A.M.A. — Oblívio · testes, ataques, Proteção e dano
   =====================================================================
   O fluxo de um teste ou ataque tem FASES, e só a última muda saldos:

     1. preparar   — o que foi declarado: regiões (cada dado já preso a
                     uma região ANTES de rolar), arma, dificuldade,
                     modificadores conhecidos. Recusa o que a regra não
                     permite (região esgotada, região repetida sem
                     Sobrecarga, mais de 5 dados…).
     2. rolar      — os dados, cada um com a sua região.
     3. escolhas   — enquanto alguma escolha ainda pode mudar o resultado
                     (Comprar Sucesso, Aumentar Extremo, Dar uma Mãozinha,
                     Empunhadura, Corte Relâmpago), a resolução fica
                     PENDENTE. Nada foi aplicado ainda.
     4. concluir   — aplica de uma vez: Coragem gasta, Estresse das
                     falhas nas regiões dos dados, sucessos contados
                     (Extremo vale 2). Uma vez por ataque (`concluido`).

   A comparação com a Proteção é UMA função (aplicarSucessos), usada pela
   ficha, pela mesa e pelas Ameaças: acerta quando o total de sucessos
   acumulados contra o alvo é IGUAL OU MAIOR que a Proteção (C1).

   Interpretações: docs/OBLIVIO.md (C1–C9, D1–D9).
   ===================================================================== */

(function (global) {
  "use strict";

  var C = global.RAMAOblivioCatalogo;
  var R = global.RAMAOblivio;

  var ORDEM_RESULTADO = ["falhaExtrema", "falhaRegular", "sucessoRegular", "sucessoExtremo"];
  var ORDEM_DIFICULDADE = ["reduzida", "normal", "aumentada"];

  /* ---------------------------------------------------------------
     ZONA DE ACERTO
     --------------------------------------------------------------- */

  /* Combina mudanças de dificuldade: cada redução e cada aumento andam
     um passo, presos às três dificuldades do livro. */
  function combinarDificuldade(base, passos) {
    var i = ORDEM_DIFICULDADE.indexOf(base);
    if (i < 0) i = 1;
    (passos || []).forEach(function (p) { i += p; });
    return ORDEM_DIFICULDADE[Math.max(0, Math.min(2, i))];
  }

  /* O mínimo do Sucesso Extremo: 20, menos o que a Coragem reduziu —
     nunca abaixo do mínimo do Sucesso Regular daquela dificuldade (C7). */
  function minimoDoExtremo(dificuldade, reducao) {
    var reg = C.ZONA_D20[dificuldade].sucessoRegular;
    return Math.max(reg, C.ZONA_D20.sucessoExtremo - (reducao || 0));
  }

  /* D20: compara o TOTAL (dado + bônus) com a tabela (p. 48). Total 1 ou
     menos é Falha Extrema; do mínimo do Extremo para cima, Extremo (C6). */
  function classificarD20(total, dificuldade, reducaoExtremo) {
    if (total <= C.ZONA_D20.falhaExtrema) return "falhaExtrema";
    if (total >= minimoDoExtremo(dificuldade, reducaoExtremo)) return "sucessoExtremo";
    if (total >= C.ZONA_D20[dificuldade].sucessoRegular) return "sucessoRegular";
    return "falhaRegular";
  }

  /* As tabelas da ficha (alternativas, D5): só o resultado bruto. */
  function classificarFicha(zona, bruto, dificuldade) {
    var z = C.ZONAS_DA_FICHA[zona][dificuldade];
    var achado = "falhaRegular";
    Object.keys(z).forEach(function (k) { if (bruto >= z[k][0] && bruto <= z[k][1]) achado = k; });
    return achado;
  }

  function rolarZona(zona, rolador) {
    if (zona === "2d6") { var a = rolador(6), b = rolador(6); return { faces: [a, b], bruto: a + b }; }
    if (zona === "d6") { var c = rolador(6); return { faces: [c], bruto: c }; }
    var d = rolador(20);
    return { faces: [d], bruto: d };
  }

  function sucessosDe(resultado) {
    return resultado === "sucessoExtremo" ? 2 : resultado === "sucessoRegular" ? 1 : 0;
  }

  /* ---------------------------------------------------------------
     TESTE DE CONHECIMENTO (p. 48)
     --------------------------------------------------------------- */

  /* opcoes:
       dificuldade   reduzida | normal | aumentada (o pedido da Testemunha)
       ajudas        quantas Personas usam Ajudar (+1 cada)
       bonus         [{ fonte, valor }] — Repertório, Ajudar, etc.
       reduzir       [fonte] — Utensílio, Plano de Contingência…
       aumentar      [fonte] — Bomba de Fumaça, Distrair…
       susto         true: Emocional para evitar susto (Covardia)
       recuperarSemReacao  true: o Rastro que tira Sem Reação
       zona          d20 | d6 | 2d6 (ajuste da mesa)
     Devolve a montagem — ainda sem rolar. */
  function montarTeste(o, conhecimento, opcoes) {
    var op = opcoes || {};
    var con = C.conhecimento[conhecimento];
    if (!con) return { ok: false, motivo: "Conhecimento desconhecido." };
    if (R.estadoDaPersona(o) !== "ativa") return { ok: false, motivo: "A Persona não pode agir agora." };
    var passos = [];
    var motivos = [];
    (op.reduzir || []).forEach(function (f) { passos.push(-1); motivos.push({ fonte: f, efeito: "reduz" }); });
    (op.aumentar || []).forEach(function (f) { passos.push(+1); motivos.push({ fonte: f, efeito: "aumenta" }); });
    R.itensEquipados(o).forEach(function (i) {
      (i.modificacoes || []).forEach(function (m) {
        if (m.chave === "versatil" && m.param && m.param.conhecimento === conhecimento) { passos.push(-1); motivos.push({ fonte: i.nome + " (Versátil)", efeito: "reduz" }); }
      });
    });
    if (R.temMazela(o, "lentidao") && (conhecimento === "bandidagem" || conhecimento === "reflexos")) { passos.push(+1); motivos.push({ fonte: "Lentidão", efeito: "aumenta" }); }
    if (op.susto && conhecimento === "emocional" && R.temFardo(o, "covardia")) { passos.push(+1); motivos.push({ fonte: "Covardia", efeito: "aumenta" }); }
    var dificuldade = combinarDificuldade(op.dificuldade || "normal", passos);
    var bonus = [];
    var esp = R.bonusDeEspecializacao(o, conhecimento);
    if (esp) bonus.push({ fonte: "Especialização", valor: esp });
    if (op.ajudas) bonus.push({ fonte: "Ajudar (" + op.ajudas + ")", valor: R.inteiro(op.ajudas, 0, 20, 0) });
    (op.bonus || []).forEach(function (b) { bonus.push({ fonte: b.fonte, valor: R.inteiro(b.valor, -99, 99, 0) }); });
    /* Pavor: os bônus SUBTRAEM (p. 93). */
    var pavor = R.temMazela(o, "pavor");
    if (pavor) bonus = bonus.map(function (b) { return { fonte: b.fonte + " (Pavor: subtrai)", valor: -Math.abs(b.valor) }; });
    var reducao = (o.efeitos.filter(function (e) { return e.tipo === "reduzirExtremo"; })[0] || {}).valor || 0;
    var autoFalha = R.temMazela(o, "semReacao") && !(conhecimento === "rastro" && op.recuperarSemReacao);
    return {
      ok: true, conhecimento: conhecimento, dificuldade: dificuldade, dificuldadePedida: op.dificuldade || "normal",
      motivos: motivos, bonus: bonus, reducaoExtremo: reducao, zona: op.zona || (o.ajustes && o.ajustes.zona) || "d20",
      autoFalha: autoFalha, pavor: pavor,
    };
  }

  /* Rola uma montagem; consome o Reduzir Extremo preparado (uma vez). */
  function rolarTeste(o, montagem, rolador) {
    if (!montagem || !montagem.ok) return { ok: false, motivo: montagem ? montagem.motivo : "Sem montagem." };
    var z = rolarZona(montagem.zona, rolador);
    var somaBonus = montagem.zona === "d20" ? montagem.bonus.reduce(function (s, b) { return s + b.valor; }, 0) : 0;
    var total = z.bruto + somaBonus;
    var resultado;
    if (montagem.autoFalha) resultado = "falhaRegular";
    else if (montagem.zona === "d20") resultado = classificarD20(total, montagem.dificuldade, montagem.reducaoExtremo);
    else resultado = classificarFicha(montagem.zona, z.bruto, montagem.dificuldade);
    if (montagem.reducaoExtremo) o.efeitos = o.efeitos.filter(function (e) { return e.tipo !== "reduzirExtremo"; });
    return {
      ok: true, faces: z.faces, bruto: z.bruto, bonus: montagem.bonus, somaBonus: somaBonus, total: total,
      dificuldade: montagem.dificuldade, resultado: resultado, nome: C.RESULTADOS[resultado].nome,
      sucesso: C.RESULTADOS[resultado].sucesso, autoFalha: montagem.autoFalha, zona: montagem.zona,
      minimoExtremo: minimoDoExtremo(montagem.dificuldade, montagem.reducaoExtremo),
      conhecimento: montagem.conhecimento,
    };
  }

  /* Um teste simples (Ameaça, teste sem ficha): bônus e dificuldade. */
  function testeSimples(bonus, dificuldade, rolador, zona) {
    var z = rolarZona(zona || "d20", rolador);
    var total = z.bruto + (zona && zona !== "d20" ? 0 : (bonus || 0));
    var resultado = zona && zona !== "d20" ? classificarFicha(zona, z.bruto, dificuldade || "normal") : classificarD20(total, dificuldade || "normal", 0);
    return { faces: z.faces, bruto: z.bruto, total: total, resultado: resultado, nome: C.RESULTADOS[resultado].nome, sucesso: C.RESULTADOS[resultado].sucesso };
  }

  /* Disputa (p. 49): sucesso vence falha; Extremo vence Regular; Falha
     Regular vence Extrema; mesma categoria, maior total. Empate fica
     para a Testemunha decidir ou mandar rolar de novo. */
  function compararDisputa(a, b) {
    var ia = ORDEM_RESULTADO.indexOf(a.resultado), ib = ORDEM_RESULTADO.indexOf(b.resultado);
    if (ia !== ib) return ia > ib ? "a" : "b";
    if (a.total !== b.total) return a.total > b.total ? "a" : "b";
    return "empate";
  }

  /* Dar uma Mãozinha (p. 61): numa falha, 1D6 — 4 a 6 vira sucesso;
     1 a 3 continua falha e Quem Resolve sofre o grau da falha. */
  function darUmaMaozinha(resultadoFalho, rolador) {
    var d = rolador(6);
    if (d >= 4) return { d6: d, virou: "sucessoRegular", estresseEmQuemResolve: 0 };
    return { d6: d, virou: resultadoFalho, estresseEmQuemResolve: C.RESULTADOS[resultadoFalho].grau };
  }

  /* Confusão (p. 91): 1D6 antes de agir sem ajuda; 1–3 a ação sai ao
     contrário. */
  function confusao(o, rolador, comAjuda) {
    if (!R.temMazela(o, "confusao") || comAjuda) return { aplica: false };
    var d = rolador(6);
    return { aplica: true, d6: d, funciona: d >= 4 };
  }

  /* ---------------------------------------------------------------
     ATAQUE DA PERSONA (pp. 50–51, 89)
     --------------------------------------------------------------- */

  /* declaracao:
       regioes     ["bracoD", "torso", …] — um dado por entrada, a
                   região fixada antes de rolar. Repetir só com
                   Sobrecarga (Ir Além). 1 a 5.
       arma        id do item empunhado (vazio: desarmado)
       alvo        { id, noChao, juraDeMortePorEsta, dificuldadeContra:
                     "aumentada"|…, bonusCombateContra, alcance (casa),
                     fragilidade, mirouAntes }
       mirar       { regiao, capacidade } — Mirar (Ação Completa)
       dificuldade a pedida pela Testemunha
       bonus       [{ fonte, valor, aplicacao: "cadaDado"|"umDado" }]
       semRegioes  true: alvo com Proteção zerada (só Ação Regular) */
  function prepararAtaque(o, declaracao) {
    var d = declaracao || {};
    var erros = [];
    if (R.estadoDaPersona(o) !== "ativa") return { ok: false, erros: ["A Persona não pode agir agora."] };
    var item = d.arma ? o.inventario.itens.filter(function (i) { return i.id === d.arma; })[0] : null;
    if (d.arma && (!item || item.estado !== "carregado")) erros.push("A arma precisa estar empunhada.");
    var cat = item ? C.equipamento[item.chave] : null;
    if (item && cat && cat.classe !== "arma" && !(cat.classe === "escudo" && R.temMod(item, "belica"))) erros.push(item.nome + " não é arma.");
    if (item && cat && cat.recargaApos && item.ataques >= cat.recargaApos) erros.push(item.nome + " precisa ser recarregada.");
    if (item && cat && cat.especial === "arremesso" && item.estado === "arremessado") erros.push(item.nome + " foi arremessada.");
    var alcance = item ? R.alcanceDoItem(item) : { casa: 1, chave: "adjacente", opcoes: ["adjacente"] };
    if (d.alvo && d.alvo.alcance && d.alvo.alcance > alcance.casa) erros.push("Fora do alcance (" + C.ALCANCES[Math.min(4, d.alvo.alcance - 1)].nome + "; a arma vai até " + C.ALCANCES[alcance.casa - 1].nome + ").");
    if (d.semRegioes) {
      return erros.length ? { ok: false, erros: erros } : { ok: true, semRegioes: true, arma: item ? item.id : "", armaValida: !!item, dados: [], alcance: alcance };
    }
    var regs = Array.isArray(d.regioes) ? d.regioes.slice() : [];
    if (!regs.length) erros.push("Arrisque pelo menos uma região.");
    if (regs.length > C.MAXIMO_DADOS_ATAQUE) erros.push("No máximo 5 rolagens por ataque.");
    var sobrecarga = R.temHabilidade(o, "sobrecarga");
    var vistas = {};
    regs.forEach(function (k) {
      var r = R.regiao(o, k);
      if (!r || r.estado === "ausente") erros.push("Região inexistente: " + k + ".");
      else if (R.esgotada(r)) erros.push(C.regiao[k].nome + " está esgotada e não pode ser arriscada.");
      if (vistas[k] && !sobrecarga) erros.push(C.regiao[k].nome + " repetida: só com Sobrecarga (Ir Além).");
      vistas[k] = true;
    });
    var distintas = Object.keys(vistas).length;
    /* Dano da arma: a região que a empunha no ataque e o mínimo de
       regiões DISTINTAS arriscadas (C5). Sem isso, só o atributo. */
    var armaValida = false, motivoSemArma = "";
    if (item) {
      var minimo = R.regioesMinimas(item);
      if (!R.temMod(item, "bandoleira") && item.regiao && !vistas[item.regiao]) motivoSemArma = "a região que empunha " + item.nome + " não foi arriscada";
      else if (distintas < minimo) motivoSemArma = item.nome + " pede " + minimo + " regiões arriscadas";
      else armaValida = true;
      var req = R.requisitosDoItem(o, item);
      if (!req.ok) { armaValida = false; motivoSemArma = item.nome + " " + req.motivo; }
    }
    var alvo = d.alvo || {};
    var passos = [];
    if (alvo.dificuldadeContra === "aumentada") passos.push(+1);
    if (alvo.dificuldadeContra === "reduzida" || alvo.juraDeMorte) passos.push(-1);
    (d.reduzir || []).forEach(function () { passos.push(-1); });
    (d.aumentar || []).forEach(function () { passos.push(+1); });
    var dificuldade = combinarDificuldade(d.dificuldade || "normal", passos);
    var rolarDuasPior = R.temMazela(o, "noChao") || R.temMazela(o, "noEscuro");
    var rolarDuasMelhor = !!alvo.noChao;
    var bonus = (d.bonus || []).map(function (b) { return { fonte: b.fonte, valor: R.inteiro(b.valor, -99, 99, 0), aplicacao: b.aplicacao === "umDado" ? "umDado" : "cadaDado" }; });
    if (alvo.bonusCombateContra) bonus.push({ fonte: "Contra o alvo", valor: R.inteiro(alvo.bonusCombateContra, -99, 99, 0), aplicacao: "cadaDado" });
    if (R.temMazela(o, "pavor")) bonus = bonus.map(function (b) { return Object.assign({}, b, { valor: -Math.abs(b.valor) }); });
    if (erros.length) return { ok: false, erros: erros };
    return {
      ok: true, id: R.novoId("at"), regioes: regs, arma: item ? item.id : "", armaValida: armaValida, motivoSemArma: motivoSemArma,
      dificuldade: dificuldade, rolarDuasPior: rolarDuasPior, rolarDuasMelhor: rolarDuasMelhor,
      empunhadura: !!(item && R.temMod(item, "empunhadura")), bonus: bonus, alcance: alcance,
      mirar: d.mirar && d.mirar.regiao ? { regiao: d.mirar.regiao, capacidade: R.inteiro(d.mirar.capacidade, 0, 999, 0) } : null,
      reducaoExtremo: (o.efeitos.filter(function (e) { return e.tipo === "reduzirExtremo"; })[0] || {}).valor || 0,
      alvo: { id: alvo.id || "" },
    };
  }

  /* Um dado de combate: rola (duas vezes se a mazela mandar), soma os
     bônus "cadaDado" e classifica. */
  function rolarDado(prep, regiaoChave, rolador, extra) {
    var faces = [rolador(20)];
    var usado = faces[0];
    if (prep.rolarDuasPior && prep.rolarDuasMelhor) { /* se anulam */ }
    else if (prep.rolarDuasPior) { faces.push(rolador(20)); usado = Math.min(faces[0], faces[1]); }
    else if (prep.rolarDuasMelhor) { faces.push(rolador(20)); usado = Math.max(faces[0], faces[1]); }
    var soma = prep.bonus.filter(function (b) { return b.aplicacao === "cadaDado"; }).reduce(function (s, b) { return s + b.valor; }, 0);
    var total = usado + soma;
    var resultado = classificarD20(total, prep.dificuldade, prep.reducaoExtremo);
    return Object.assign({ id: R.novoId("dd"), regiao: regiaoChave, faces: faces, usado: usado, bonus: soma, total: total, resultado: resultado, original: resultado, sucessos: sucessosDe(resultado) }, extra || {});
  }

  function rolarAtaque(o, prep, rolador) {
    if (!prep || !prep.ok) return { ok: false, motivo: "Ataque não preparado." };
    var ataque = { id: prep.id, fase: "escolhas", prep: prep, dados: [], escolhas: [], custoCoragem: 0, concluido: false };
    if (prep.semRegioes) { ataque.fase = "resolvido"; ataque.semRegioes = true; return { ok: true, ataque: ataque }; }
    prep.regioes.forEach(function (k) { ataque.dados.push(rolarDado(prep, k, rolador)); });
    /* O bônus "umDado" vai no dado em que faz diferença, se houver. */
    var umDado = prep.bonus.filter(function (b) { return b.aplicacao === "umDado"; });
    umDado.forEach(function (b) {
      var melhor = null;
      ataque.dados.forEach(function (dd) {
        var novo = classificarD20(dd.total + b.valor, prep.dificuldade, prep.reducaoExtremo);
        if (sucessosDe(novo) > sucessosDe(dd.resultado) && (!melhor || dd.total > melhor.total)) melhor = dd;
      });
      var alvo = melhor || ataque.dados[0];
      if (!alvo) return;
      alvo.total += b.valor; alvo.bonus += b.valor;
      alvo.resultado = classificarD20(alvo.total, prep.dificuldade, prep.reducaoExtremo);
      alvo.original = alvo.resultado;
      alvo.sucessos = sucessosDe(alvo.resultado);
      alvo.bonusUmDado = b.fonte;
    });
    if (prep.reducaoExtremo) o.efeitos = o.efeitos.filter(function (e) { return e.tipo !== "reduzirExtremo"; });
    return { ok: true, ataque: ataque, opcoes: opcoesDoAtaque(o, ataque) };
  }

  /* O que ainda pode mudar o resultado, para a tela oferecer. */
  function opcoesDoAtaque(o, ataque, grupo) {
    var op = [];
    if (ataque.fase !== "escolhas") return op;
    var coragemLivre = o.coragem - ataque.custoCoragem;
    ataque.dados.forEach(function (dd) {
      if (dd.comprado || dd.maozinha) return;
      if (dd.resultado === "falhaRegular" && coragemLivre >= 1) op.push({ tipo: "comprarSucesso", dado: dd.id, custo: 1 });
      if (dd.resultado === "falhaExtrema" && coragemLivre >= 2) op.push({ tipo: "comprarSucesso", dado: dd.id, custo: 2 });
      if (dd.resultado === "sucessoExtremo" && !dd.aumentado && coragemLivre >= 1) op.push({ tipo: "aumentarExtremo", dado: dd.id, custo: 1 });
      if (!C.RESULTADOS[dd.resultado].sucesso && (grupo || []).some(function (g) { return g.darUmaMaozinha; })) op.push({ tipo: "darUmaMaozinha", dado: dd.id });
    });
    if (ataque.prep.empunhadura && !ataque.empunhaduraUsada && ataque.dados.length) op.push({ tipo: "empunhadura" });
    var item = ataque.prep.arma ? o.inventario.itens.filter(function (i) { return i.id === ataque.prep.arma; })[0] : null;
    if (item && item.chave === "laminaCurta" && item.regiao) {
      var ultimo = ataque.dados.filter(function (dd) { return dd.regiao === item.regiao; }).pop();
      var reg = R.regiao(o, item.regiao);
      if (ultimo && C.RESULTADOS[ultimo.resultado].sucesso && !ataque.corteEncerrado && reg && !R.esgotada(reg)) op.push({ tipo: "corteRelampago", regiao: item.regiao });
    }
    return op;
  }

  /* Aplica UMA escolha enquanto o ataque está pendente. */
  function escolherNoAtaque(o, ataque, escolha, rolador) {
    if (!ataque || ataque.fase !== "escolhas") return { ok: false, motivo: "O ataque já foi resolvido." };
    var e = escolha || {};
    var dd = e.dado ? ataque.dados.filter(function (x) { return x.id === e.dado; })[0] : null;
    if (e.tipo === "comprarSucesso") {
      if (!dd || C.RESULTADOS[dd.resultado].sucesso) return { ok: false, motivo: "Só se compra sucesso de uma falha." };
      var custo = dd.resultado === "falhaExtrema" ? 2 : 1;
      if (o.coragem - ataque.custoCoragem < custo) return { ok: false, motivo: "Coragem insuficiente." };
      ataque.custoCoragem += custo;
      dd.comprado = custo; dd.resultado = "sucessoRegular"; dd.sucessos = 1;
      ataque.escolhas.push({ tipo: "comprarSucesso", dado: dd.id, custo: custo });
      return { ok: true };
    }
    if (e.tipo === "aumentarExtremo") {
      if (!dd || dd.resultado !== "sucessoExtremo" || dd.aumentado) return { ok: false, motivo: "Só depois de um Sucesso Extremo, uma vez por dado." };
      if (o.coragem - ataque.custoCoragem < 1) return { ok: false, motivo: "Coragem insuficiente." };
      ataque.custoCoragem += 1; dd.aumentado = true; dd.sucessos += 1;
      ataque.escolhas.push({ tipo: "aumentarExtremo", dado: dd.id, custo: 1 });
      return { ok: true };
    }
    if (e.tipo === "darUmaMaozinha") {
      if (!dd || C.RESULTADOS[dd.resultado].sucesso || dd.maozinha) return { ok: false, motivo: "Só numa falha, uma vez." };
      var m = darUmaMaozinha(dd.resultado, rolador);
      dd.maozinha = m;
      if (m.virou === "sucessoRegular") { dd.resultado = "sucessoRegular"; dd.sucessos = 1; }
      ataque.escolhas.push({ tipo: "darUmaMaozinha", dado: dd.id, d6: m.d6, quem: e.quem || "", estresse: m.estresseEmQuemResolve });
      return { ok: true, maozinha: m };
    }
    if (e.tipo === "empunhadura") {
      if (!ataque.prep.empunhadura || ataque.empunhaduraUsada) return { ok: false, motivo: "Empunhadura já usada neste teste." };
      var alvo = dd || ataque.dados.slice().sort(function (a, b) { return a.total - b.total; })[0];
      var novo = rolarDado(ataque.prep, alvo.regiao, rolador);
      ataque.empunhaduraUsada = true;
      if (novo.total > alvo.total) {
        Object.assign(alvo, { faces: alvo.faces.concat(novo.faces), usado: novo.usado, total: novo.total, resultado: novo.resultado, original: novo.resultado, sucessos: novo.sucessos });
      } else alvo.faces = alvo.faces.concat(novo.faces);
      ataque.escolhas.push({ tipo: "empunhadura", dado: alvo.id });
      return { ok: true };
    }
    if (e.tipo === "corteRelampago") {
      var item = o.inventario.itens.filter(function (i) { return i.id === ataque.prep.arma; })[0];
      if (!item || item.chave !== "laminaCurta") return { ok: false, motivo: "Corte Relâmpago é da Lâmina Curta." };
      var reg = R.regiao(o, item.regiao);
      if (!reg || R.esgotada(reg)) return { ok: false, motivo: "A região está esgotada." };
      /* O custo é imediato: 1 de Estresse na região (p. 72). */
      var custoR = R.receberEstresse(o, 1, { regiao: item.regiao, origem: { tipo: "corteRelampago" }, semFerida: true });
      var novoDado = rolarDado(ataque.prep, item.regiao, rolador, { corte: true });
      ataque.dados.push(novoDado);
      if (!C.RESULTADOS[novoDado.resultado].sucesso) ataque.corteEncerrado = true;
      ataque.escolhas.push({ tipo: "corteRelampago", dado: novoDado.id });
      return { ok: true, eventos: custoR.eventos };
    }
    return { ok: false, motivo: "Escolha desconhecida." };
  }

  /* Conclui o ataque: gasta a Coragem, põe o Estresse de cada falha na
     região DO DADO (1, ou 2 na Extrema), conta Falhas Extremas de
     próteses e soma os sucessos. Uma vez só. */
  function concluirAtaque(o, ataque) {
    if (!ataque) return { ok: false, motivo: "Sem ataque." };
    if (ataque.concluido) return { ok: true, repetida: true, sucessos: ataque.sucessos, eventos: [] };
    var eventos = [];
    if (ataque.custoCoragem) {
      o.coragem = Math.max(0, o.coragem - ataque.custoCoragem);
      eventos.push(R.evento("coragem", { valor: -ataque.custoCoragem, motivo: "Coragem no ataque" }));
    }
    var porRegiao = {};
    ataque.dados.forEach(function (dd) {
      var falhou = !C.RESULTADOS[dd.resultado].sucesso;
      if (falhou) porRegiao[dd.regiao] = (porRegiao[dd.regiao] || 0) + C.RESULTADOS[dd.resultado].grau;
      var reg = R.regiao(o, dd.regiao);
      /* A prótese conta as Falhas Extremas de fato roladas (p. 43). */
      if (reg && reg.estado === "protese" && dd.original === "falhaExtrema") {
        reg.falhasExtremas++;
        if (reg.falhasExtremas > R.metade(o.atributos.carne)) {
          eventos.push(R.evento("proteseDestruida", { regiao: dd.regiao }));
          eventos = eventos.concat(R.perderRegiao(o, dd.regiao, "proteseDestruida").eventos);
        }
      }
    });
    Object.keys(porRegiao).forEach(function (k) {
      var reg = R.regiao(o, k);
      if (!reg || reg.estado === "ausente") return;
      eventos = eventos.concat(R.receberEstresse(o, porRegiao[k], { regiao: k, origem: { tipo: "falhaDeCombate" }, semFerida: true }).eventos);
    });
    var sucessos = ataque.dados.reduce(function (s, dd) { return s + dd.sucessos; }, 0);
    ataque.sucessos = sucessos;
    ataque.extremos = ataque.dados.filter(function (dd) { return dd.original === "sucessoExtremo"; }).length;
    ataque.fase = "resolvido";
    ataque.concluido = true;
    var item = ataque.prep.arma ? o.inventario.itens.filter(function (i) { return i.id === ataque.prep.arma; })[0] : null;
    if (item && C.equipamento[item.chave] && C.equipamento[item.chave].recargaApos) item.ataques++;
    o.efeitos = o.efeitos.filter(function (e) { return e.expira !== "fimDoTurnoOuProximaAcao"; });
    return { ok: true, sucessos: sucessos, extremos: ataque.extremos, eventos: eventos };
  }

  /* Recarga (p. 72–74): Ação Regular, ou Extra/Movimento com Suporte
     de Carregador; gasta um uso de Munição. */
  function recarregar(o, armaId, municaoId) {
    var item = o.inventario.itens.filter(function (i) { return i.id === armaId; })[0];
    if (!item || !C.equipamento[item.chave] || !C.equipamento[item.chave].disparo) return { ok: false, motivo: "Não é Arma de Disparo.", eventos: [] };
    var mun = o.inventario.itens.filter(function (i) { return i.id === municaoId && i.chave === "municao"; })[0];
    if (!mun) return { ok: false, motivo: "Sem Munição.", eventos: [] };
    var r = R.consumir(o, mun.id, 1);
    if (!r.ok) return r;
    item.ataques = 0;
    return { ok: true, acao: R.temMod(item, "suporteDeCarregador") ? "extra|movimento" : "regular", eventos: r.eventos.concat([R.evento("recarga", { item: item.id, nome: item.nome })]) };
  }

  /* ---------------------------------------------------------------
     PROTEÇÃO DO ALVO — completa e restante, separadas (C1–C3)
     --------------------------------------------------------------- */

  /* O estado de Proteção de um alvo numa cena. `completa` vem do cálculo
     da ficha (ou do valor publicado da Ameaça) e PODE mudar; `restante`
     é um saldo — recalcular a completa nunca o devolve ao cheio. */
  function novoEstadoDeProtecao(completa) {
    return { completa: R.inteiro(completa, 0, 999, 0), restante: R.inteiro(completa, 0, 999, 0), desgastes: [], zerada: null, persistente: 0 };
  }

  /* A completa mudou (equipamento, efeito): o restante acompanha só o
     que o desgaste permite — nunca sobe por causa do recálculo. */
  function atualizarCompleta(estado, completa) {
    var c = R.inteiro(completa, 0, 999, 0);
    var desgastado = estado.desgastes.reduce(function (s, x) { return s + x.valor; }, 0);
    estado.completa = c;
    if (!estado.zerada) estado.restante = Math.max(0, c - desgastado);
    return estado;
  }

  /* Soma os sucessos de UM ataque. Acerta quando o desgaste acumulado
     (de quantos atacantes for) leva o restante a zero — total ≥
     Proteção (C1). Com Mirar, o ataque precisa sozinho de restante +
     capacidade da região mirada; errando, desgasta normalmente (C4).
     `persistente`: bônus que não zera (Feedback Defensivo). */
  function aplicarSucessos(estado, sucessos, atacanteId, opcoes) {
    var op = opcoes || {};
    var s = R.inteiro(sucessos, 0, 999, 0);
    var antes = estado.restante;
    var persist = R.inteiro(estado.persistente, 0, 99, 0);
    if (estado.zerada && !persist) return { acertou: true, jaZerada: true, restanteAntes: 0, restanteDepois: 0, necessario: 0 };
    if (op.mirar) {
      var nec = antes + persist + R.inteiro(op.mirar.capacidade, 0, 999, 0);
      if (s >= nec) {
        estado.desgastes.push({ id: R.novoId("dg"), atacante: atacanteId, valor: antes, mirar: true });
        estado.restante = 0;
        estado.zerada = { atacante: atacanteId };
        return { acertou: true, restanteAntes: antes, restanteDepois: 0, necessario: nec, mirar: true };
      }
      /* Errou a mira: os sucessos desgastam a Proteção como os de um
         ataque comum, mas ESTE ataque não causa dano (C4). */
      var g = Math.min(antes, s);
      if (g) estado.desgastes.push({ id: R.novoId("dg"), atacante: atacanteId, valor: g, mirar: true });
      estado.restante = antes - g;
      if (estado.restante <= 0 && !persist) estado.zerada = { atacante: atacanteId };
      return { acertou: false, restanteAntes: antes, restanteDepois: estado.restante, necessario: nec, mirar: true, faltam: nec - s };
    }
    var efetivo = Math.max(0, s - (estado.zerada ? 0 : 0));
    var necessario = antes + persist;
    var gasto = Math.min(antes, efetivo);
    if (gasto) estado.desgastes.push({ id: R.novoId("dg"), atacante: atacanteId, valor: gasto });
    estado.restante = antes - gasto;
    if (efetivo >= necessario) {
      estado.restante = 0;
      estado.zerada = { atacante: atacanteId };
      return { acertou: true, restanteAntes: antes, restanteDepois: 0, necessario: necessario };
    }
    return { acertou: false, restanteAntes: antes, restanteDepois: estado.restante, necessario: necessario, faltam: necessario - efetivo };
  }

  /* Depois do acerto, zerada até o início do próximo turno de quem
     acertou; aí volta CHEIA (p. 50). Desgaste parcial: até o fim da
     cena (padrão) ou o início do turno do próprio alvo (ajuste C3). */
  function inicioDoTurno(estado, quemComeca, alvoId, ajustes) {
    var eventos = [];
    if (estado.zerada && estado.zerada.atacante === quemComeca) {
      estado.zerada = null; estado.restante = estado.completa; estado.desgastes = [];
      eventos.push(R.evento("protecaoRestaurada", { motivo: "início do turno de quem acertou" }));
    } else if (!estado.zerada && ajustes && ajustes.desgasteParcial === "turnoDoAlvo" && quemComeca === alvoId && estado.desgastes.length) {
      estado.restante = estado.completa; estado.desgastes = [];
      eventos.push(R.evento("protecaoRestaurada", { motivo: "início do turno do alvo (ajuste da mesa)" }));
    }
    return eventos;
  }

  function fimDaCena(estado) {
    estado.zerada = null; estado.restante = estado.completa; estado.desgastes = [];
    return estado;
  }

  /* ---------------------------------------------------------------
     DANO (pp. 36, 50, 71–76)
     --------------------------------------------------------------- */

  /* A composição do dano de um ataque que ACERTOU. contexto:
       alvoId, alvoFragilidade, tiroCerteiro (Mirar antes no mesmo alvo),
       primeiroAcertoNoAlvo (Voracidade), casasAvancadas (Estocada),
       pontoFraco (+), reservaAbrirFeridas (usar?), arqueado (máximo)
     Devolve a fórmula — rolarDano rola. */
  function composicaoDoDano(o, ataque, contexto) {
    var cx = contexto || {};
    var mut = R.calcularMutaveis(o);
    var item = ataque.prep.arma ? o.inventario.itens.filter(function (i) { return i.id === ataque.prep.arma; })[0] : null;
    var cat = item ? C.equipamento[item.chave] : null;
    var expr = "", extras = 0, multiplicaDados = 1;
    var somas = [];
    var meleeLike = true;
    if (item && ataque.prep.armaValida) {
      expr = cat.classe === "escudo" && R.temMod(item, "belica") ? "1d6" : cat.dano;
      extras += R.contarMod(item, "mortal");
      if (cat.especial === "tiroCerteiro" && cx.tiroCerteiro) multiplicaDados = 2;
      meleeLike = ["adjacente", "curto"].indexOf(R.alcanceDoItem(item).chave) >= 0 && !(cat.especial === "arremesso" && cx.arremessada);
    }
    if (cx.alvoFragilidade) extras += 1;
    var danoAttr = mut.dano.total;
    var vorac = R.temHabilidade(o, "voracidade") && cx.primeiroAcertoNoAlvo;
    somas.push({ fonte: vorac ? "Dano × 2 (Voracidade)" : "Atributo de Dano", valor: vorac ? danoAttr * 2 : danoAttr });
    if (R.temHabilidade(o, "pesoPesado") && meleeLike) somas.push({ fonte: "Peso Pesado", valor: R.metade(o.atributos.carne) });
    if (cx.casasAvancadas) somas.push({ fonte: "Estocada", valor: R.inteiro(cx.casasAvancadas, 0, 99, 0) });
    if (cx.pontoFraco) somas.push({ fonte: "Ponto Fraco", valor: R.inteiro(cx.pontoFraco, 0, 99, 0) });
    if (cx.usarAbrirFeridas && o.reservas.abrirFeridas) somas.push({ fonte: "Abrir Feridas", valor: R.metade(o.reservas.abrirFeridas) });
    (cx.somas || []).forEach(function (s) { somas.push(s); });
    var a = expr ? R.analisarDados(expr) : null;
    var qtd = a ? (a.qtd + extras) * multiplicaDados : extras;
    var faces = a ? a.faces : (extras ? 4 : 0);
    return {
      arma: item ? item.nome : "", expressaoArma: qtd ? qtd + "d" + faces + (a && a.mais ? "+" + a.mais : "") : "",
      dados: { qtd: qtd, faces: faces, mais: a ? a.mais : 0 }, somas: somas,
      metade: !!(item && item.fabricado && item.fabricado.metade), maximo: !!cx.arqueado, corpoACorpo: meleeLike,
    };
  }

  function rolarDano(comp, rolador) {
    var faces = [];
    for (var i = 0; i < comp.dados.qtd; i++) faces.push(comp.maximo ? comp.dados.faces : rolador(comp.dados.faces));
    var daArma = faces.reduce(function (s, x) { return s + x; }, 0) + (comp.dados.mais || 0);
    if (comp.metade) daArma = R.metade(daArma);
    var total = daArma + comp.somas.reduce(function (s, x) { return s + x.valor; }, 0);
    return { total: Math.max(0, total), daArma: daArma, faces: faces, somas: comp.somas };
  }

  /* Reduções que a PERSONA alvo aplica ao dano recebido (p. 76). */
  function reducaoNaPersona(o, opcoes) {
    var op = opcoes || {};
    var red = [];
    var atr = R.atributosEfetivos(o);
    var valorEscolha = R.metade(o.escolhas.protecaoContra === "fuga" ? atr.fuga : atr.carne);
    R.itensEquipados(o).forEach(function (i) {
      var cat = C.equipamento[i.chave];
      if (!cat) return;
      if (cat.especial === "protecaoMaximizada") red.push({ fonte: i.nome + " (Proteção Maximizada)", valor: valorEscolha });
      if (cat.especial === "protecaoElevada" && op.aDistancia) red.push({ fonte: i.nome + " (Proteção Elevada)", valor: valorEscolha });
    });
    return red;
  }

  global.RAMAOblivioCombate = {
    ORDEM_RESULTADO: ORDEM_RESULTADO, ORDEM_DIFICULDADE: ORDEM_DIFICULDADE,
    combinarDificuldade: combinarDificuldade, minimoDoExtremo: minimoDoExtremo,
    classificarD20: classificarD20, classificarFicha: classificarFicha, sucessosDe: sucessosDe,
    montarTeste: montarTeste, rolarTeste: rolarTeste, testeSimples: testeSimples, compararDisputa: compararDisputa,
    darUmaMaozinha: darUmaMaozinha, confusao: confusao,
    prepararAtaque: prepararAtaque, rolarAtaque: rolarAtaque, opcoesDoAtaque: opcoesDoAtaque,
    escolherNoAtaque: escolherNoAtaque, concluirAtaque: concluirAtaque, recarregar: recarregar,
    novoEstadoDeProtecao: novoEstadoDeProtecao, atualizarCompleta: atualizarCompleta, aplicarSucessos: aplicarSucessos,
    inicioDoTurno: inicioDoTurno, fimDaCena: fimDaCena,
    composicaoDoDano: composicaoDoDano, rolarDano: rolarDano, reducaoNaPersona: reducaoNaPersona,
  };
})(typeof window !== "undefined" ? window : globalThis);
