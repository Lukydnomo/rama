/* =====================================================================
   R.A.M.A. — Ordem Paranormal RPG II (Experimental) · o motor (v9.0)
   ---------------------------------------------------------------------
   Puro: quem rola passa o rolador. Roda igual no navegador (ficha sem
   campanha) e no servidor (campanha, backend/Ordem2.gs).

   O TESTE (Alpha pp. 18–20; Beta pp. 10–12)
     montar(b, pedido, ctx)   os dados de teste (atributo + perícia +
                              bônus), os passos com a fonte, o pavor
                              separado, custos e modificador numérico
     rolar(m, rolador)        as faces
     resolver(m, rolagem, p)  pós-rolagem (Análise ±1, rerrolagens,
                              Mentoria, escolha dos três somados) →
                              anulados pelo pavor, soma, RA, RB, crítico
                              e falha crítica pelos SOBREVIVENTES

   A FICHA DEPOIS DO TESTE
     aposTeste      Ímpeto na falha, pavor que termina no 1, lobo ferido
     aplicarDano    físico/emocional, não letal anotado, armadura (−10,
                    uma por ocorrência), gatilhos de lesão e trauma
     resolverPendente  a máquina de lesão (Beta p. 21–22) e de trauma
                    (p. 23); no Alpha fiel, os testes da p. 26
     fimDeRodada / fimDeCena / inicioDeCena / novaMissao

   Decisões de implementação: RAMAOrdem2Catalogo.DECISOES.
   Copiado para backend/Ordem2.gs (testes/gerar-ordem2-gs.js).
   ===================================================================== */

(function (global) {
  "use strict";

  function K() { return global.RAMAOrdem2Catalogo; }
  function R() { return global.RAMAOrdem2; }
  function lista(v) { return Array.isArray(v) ? v : []; }
  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }

  var MAX_DADOS_ROLADOS = 4;
  var MAX_DADOS_SOMADOS = 3;
  var DT_PADRAO = 7;

  function ehBeta(b) { return b.perfilRegras === "beta-vigilia"; }

  /* ---------------------------------------------------------------
     MONTAR
     --------------------------------------------------------------- */
  function montar(b, pedido, ctx) {
    var p = obj(pedido), c = obj(ctx);
    var usar = obj(p.usar);
    var fontes = [];
    var per = p.pericia ? R().pericia(b, p.pericia) : null;
    if (p.pericia && !per) return { ok: false, motivo: "Perícia não encontrada nesta ficha." };
    var atributo = K().ATRIBUTOS[p.atributo] ? p.atributo : (per ? R().atributoBase(b, per.chave) : "");
    if (!atributo) return { ok: false, motivo: "Escolha o atributo do teste." };
    var atributoBase = per ? R().atributoBase(b, per.chave) : atributo;

    var permitir20 = c.permitir20 === true;
    var dAt = R().dadoDoAtributo(b, atributo);
    var dPe = per ? R().dadoDaPericia(b, per) : 0;
    var passosA = 0, passosP = 0;
    function passo(alvo, n, fonte) {
      if (!n) return;
      if (alvo === "atributo" || !per) passosA += n; else passosP += n;
      fontes.push({ tipo: "passo", alvo: alvo === "atributo" || !per ? "atributo" : "pericia", n: n, fonte: fonte });
    }
    lista(p.passos).forEach(function (x) { var o = obj(x); passo(o.alvo, Math.max(-4, Math.min(4, Math.floor(Number(o.n) || 0))), String(o.fonte || "Mestre").slice(0, 60)); });
    /* Passos sem alvo prescrito: a tela pergunta; padrão, a perícia. */
    var alvoSemPrescricao = p.alvoDosPassos === "atributo" ? "atributo" : "pericia";
    lista(b.efeitos).forEach(function (e) { if (e.tipo === "passoTodos") passo(alvoSemPrescricao, e.n, e.fonte || "efeito"); });
    if (b.estado.caido && atributo === "fisico" && ehBeta(b)) passo("atributo", -1, "Caído (Beta p. 21)");
    R().habilidadesDoTipo(b, "passoComPvBaixo").forEach(function () {
      if (b.recursos.pv.atual <= Math.floor(R().pvMax(b) / 2)) passo(alvoSemPrescricao, 1, "Instinto de Sobrevivência");
    });
    dAt = R().passoDado(dAt, passosA, permitir20);
    if (per) dPe = R().passoDado(dPe, passosP, permitir20);

    var dados = [{ faces: dAt, fonte: K().ATRIBUTOS[atributo].nome, tipo: "atributo" }];
    if (per) dados.push({ faces: dPe, fonte: R().nomeDaPericia(b, per), tipo: "pericia" });

    var custos = { pd: 0, pv: 0, espacos: {}, reservas: [] };
    function bonus(faces, fonte, extra) { dados.push(Object.assign({ faces: faces, fonte: fonte, tipo: "bonus" }, extra || {})); }
    lista(p.bonus).forEach(function (x) { var o = obj(x); bonus(R().faces(o.faces, 6), String(o.fonte || "bônus").slice(0, 60)); });

    /* Habilidades ANTES da rolagem. */
    if (usar.impeto !== undefined && usar.impeto !== null) {
      var hi = R().habilidadesDoTipo(b, "impeto")[0];
      if (!hi) return { ok: false, motivo: "Esta ficha não tem Ímpeto." };
      var mi = R().motorDe(hi), op = mi.opcoes[Number(usar.impeto)];
      if (!op || op.efeito !== "dado") return { ok: false, motivo: "Opção de Ímpeto inválida para um teste." };
      if (hi.estado.espacos < op.custo) return { ok: false, motivo: "Ímpeto: faltam espaços (" + hi.estado.espacos + "/" + op.custo + ")." };
      custos.espacos[hi.id] = (custos.espacos[hi.id] || 0) + op.custo;
      bonus(op.faces, "Ímpeto (" + op.custo + " espaço" + (op.custo > 1 ? "s" : "") + ")");
    }
    if (usar.focoMental) {
      var hf = R().habilidadesDoTipo(b, "dadoPorPd").filter(function (h) { var m = R().motorDe(h); return m.atributo; })[0];
      if (!hf) return { ok: false, motivo: "Esta ficha não tem Foco Mental." };
      var mf = R().motorDe(hf);
      if (atributo !== mf.atributo) return { ok: false, motivo: "Foco Mental é para testes mentais (com Mente)." };
      custos.pd += mf.pd; bonus(mf.faces, hf.nome + " (" + mf.pd + " PD)");
    }
    if (usar.sorrateiro) {
      var hs = R().habilidadesDoTipo(b, "dadoPorPd").filter(function (h) { var m = R().motorDe(h); return m.pericias; })[0];
      if (!hs) return { ok: false, motivo: "Esta ficha não tem Sorrateiro." };
      var ms = R().motorDe(hs);
      if (!per || ms.pericias.indexOf(per.chave) < 0) return { ok: false, motivo: hs.nome + " vale só em " + ms.pericias.join(" e ") + "." };
      custos.pd += ms.pd; bonus(ms.faces, hs.nome + " (" + ms.pd + " PD)");
    }
    var arma = p.arma ? lista(b.itens).filter(function (i) { return i.id === p.arma; })[0] : null;
    if (usar.linhaDeTiro) {
      var hl = R().habilidadesDoTipo(b, "dadoEmAtaque")[0];
      if (!hl) return { ok: false, motivo: "Esta ficha não tem Linha de Tiro." };
      var ml = R().motorDe(hl);
      if (!arma || arma.categoria !== ml.categoria) return { ok: false, motivo: hl.nome + " vale em ataques com arma de fogo." };
      custos.pd += ml.pd; bonus(ml.faces, hl.nome + " (" + ml.pd + " PD)");
    }
    /* O lobo (Espectro): +d6 nos ataques corpo a corpo, se não estiver ferido. */
    if (p.tipo === "ataque" && p.alcance === "corpo" && usar.parceiro !== false) {
      R().habilidadesDoTipo(b, "parceiro").forEach(function (h) {
        if (!h.estado.indisponivel) bonus(R().motorDe(h).faces, h.nome, { parceiro: h.id });
      });
    }
    lista(usar.reservas).forEach(function (rid) {
      var achou = null, hab = null;
      lista(b.estado.reservas).forEach(function (r) { if (r.id === rid) achou = r; });
      if (!achou) lista(b.habilidades).forEach(function (h) { lista(h.estado.reserva).forEach(function (r) { if (r.id === rid) { achou = r; hab = h; } }); });
      if (!achou) return;
      custos.reservas.push({ id: rid, hab: hab ? hab.id : "" });
      bonus(achou.faces, (achou.fonte || (hab ? hab.nome : "Reserva")) + (achou.alvo ? " · " + achou.alvo : ""));
    });

    /* Pavor (Beta p. 24): controlar (1 PD por passo, piso d4) ou abraçar
       (5 PD: vira dado bônus SÓ neste teste). */
    var pavor = b.estado.pavor || 0;
    var pv = obj(usar.pavor);
    var reduzir = Math.max(0, Math.min(5, Math.floor(Number(pv.controlar) || 0)));
    if (pavor && reduzir) {
      custos.pd += reduzir;
      for (var i = 0; i < reduzir; i++) pavor = R().passoDado(pavor, -1, false);
      fontes.push({ tipo: "pavor", texto: "Pavor controlado: −" + reduzir + " passo(s) (piso d4)" });
    }
    var abracado = false;
    if (pavor && pv.abracar) {
      custos.pd += 5;
      bonus(pavor, "Pavor abraçado (5 PD)");
      abracado = true;
      pavor = 0;
    }
    if (!b.estado.pavor && (reduzir || pv.abracar)) return { ok: false, motivo: "Sem dado de pavor." };

    if (dados.length > MAX_DADOS_ROLADOS) return { ok: false, motivo: "No máximo quatro dados por teste (Alpha p. 20; Beta p. 12). Tire " + (dados.length - MAX_DADOS_ROLADOS) + "." };
    if (custos.pd > b.recursos.pd.atual) return { ok: false, motivo: "PD insuficiente (" + b.recursos.pd.atual + "/" + custos.pd + ")." };

    var mod = R().modificadorNumerico(b, per ? per.chave : "", atributo);
    var modificador = Math.floor(Number(p.modificador) || 0) + mod.valor;
    var criticoMin = 6;
    if (p.tipo === "ataque" && arma && arma.efeitos.indexOf("critico5") >= 0) criticoMin = 5;
    /* Examinar (e qualquer teste marcado semDt) não tem DT: o resultado é
       comparado com as linhas do quadro, não com 7; sem DT, não há
       "falha" para o Ímpeto. */
    var dt = p.semDt === true ? null : p.dt === null || p.dt === undefined || p.dt === "" ? (p.tipo === "oposto" ? null : DT_PADRAO) : Math.max(0, Math.floor(Number(p.dt)));

    return {
      ok: true,
      montagem: {
        rotulo: String(p.rotulo || (per ? R().nomeDaPericia(b, per) : K().ATRIBUTOS[atributo].nome)).slice(0, 120),
        tipo: ["simples", "oposto", "estendido", "ataque", "lesao", "trauma"].indexOf(p.tipo) >= 0 ? p.tipo : "simples",
        atributo: atributo, atributoBase: atributoBase, atributoTrocado: atributo !== atributoBase,
        pericia: per ? per.id : "", periciaChave: per ? per.chave : "",
        dados: dados, pavor: pavor, pavorAbracado: abracado,
        dt: dt, modificador: modificador, fontesModificador: mod.fontes.concat(Number(p.modificador) ? ["Mestre (" + (p.modificador > 0 ? "+" : "") + p.modificador + ")"] : []),
        fontes: fontes, custos: custos, criticoMin: criticoMin,
        arma: arma ? arma.id : "", alcance: p.alcance === "distancia" ? "distancia" : (p.alcance === "corpo" ? "corpo" : ""),
        examinar: p.examinar === true, beta: ehBeta(b),
      },
    };
  }

  /* ---------------------------------------------------------------
     ROLAR E RESOLVER
     --------------------------------------------------------------- */
  function rolar(m, rolador) {
    return { faces: m.dados.map(function (d) { return rolador(d.faces); }), pavor: m.pavor ? rolador(m.pavor) : 0 };
  }

  /* Pós-rolagem: `pos` = { ajustes: [{indice, delta}], trocas: [{indice,
     valor, fonte}], soma: [indices] }. Trocas e ajustes valem antes do
     pavor; a escolha dos três mexe só na soma. */
  function resolver(m, rolagem, pos) {
    var q = obj(pos);
    var faces = rolagem.faces.slice();
    var marcas = faces.map(function () { return []; });
    lista(q.trocas).forEach(function (t) {
      var i = Number(t.indice);
      if (i >= 0 && i < faces.length) { faces[i] = Math.max(1, Math.min(m.dados[i].faces, Math.floor(Number(t.valor) || 1))); marcas[i].push(t.fonte || "trocado"); }
    });
    lista(q.ajustes).forEach(function (a) {
      var i = Number(a.indice), d = Math.floor(Number(a.delta) || 0);
      if (i >= 0 && i < faces.length && d) { faces[i] = Math.max(1, Math.min(m.dados[i].faces, faces[i] + d)); marcas[i].push((d > 0 ? "+" : "") + d + " Análise"); }
    });
    var pavorValor = rolagem.pavor || 0;
    var dados = faces.map(function (v, i) { return { faces: m.dados[i].faces, valor: v, fonte: m.dados[i].fonte, tipo: m.dados[i].tipo, parceiro: m.dados[i].parceiro || "", anulado: !!(pavorValor && v < pavorValor), somado: false, marcas: marcas[i] }; });
    var vivos = dados.map(function (d, i) { return d.anulado ? -1 : i; }).filter(function (i) { return i >= 0; });
    var semSobreviventes = !vivos.length;

    /* Os somados: a escolha, ou os três maiores sobreviventes. */
    var escolhidos = lista(q.soma).map(Number).filter(function (i, k, t) { return vivos.indexOf(i) >= 0 && t.indexOf(i) === k; }).slice(0, MAX_DADOS_SOMADOS);
    var escolheu = escolhidos.length > 0;
    if (!escolheu) escolhidos = vivos.slice().sort(function (a, b) { return dados[b].valor - dados[a].valor || a - b; }).slice(0, MAX_DADOS_SOMADOS);
    escolhidos.forEach(function (i) { dados[i].somado = true; });
    var soma = escolhidos.reduce(function (s, i) { return s + dados[i].valor; }, 0);

    var valoresVivos = vivos.map(function (i) { return dados[i].valor; });
    var ra = valoresVivos.length ? Math.max.apply(null, valoresVivos) : 0;
    var rb = valoresVivos.length ? Math.min.apply(null, valoresVivos) : 0;
    var ordenados = valoresVivos.slice().sort(function (a, b) { return b - a; });
    var duasMaiores = (ordenados[0] || 0) + (ordenados[1] || 0);

    /* Crítico: dois ou mais sobreviventes iguais, valor ≥ 6 (5 com a
       espada de Cormac). Falha crítica: todos os sobreviventes em 1, ou
       nenhum sobrevivente. */
    var cont = {};
    valoresVivos.forEach(function (v) { cont[v] = (cont[v] || 0) + 1; });
    var critico = Object.keys(cont).some(function (v) { return Number(v) >= m.criticoMin && cont[v] >= 2; });
    var falhaCritica = semSobreviventes || (valoresVivos.length > 0 && valoresVivos.every(function (v) { return v === 1; }));
    if (falhaCritica) critico = false;
    var total = soma + (m.modificador || 0);
    var sucesso = null;
    if (critico) sucesso = true;
    else if (falhaCritica) sucesso = false;
    else if (m.dt !== null && m.dt !== undefined) sucesso = total >= m.dt;

    return {
      dados: dados, pavor: m.pavor ? { faces: m.pavor, valor: pavorValor, terminou: pavorValor === 1 } : null,
      soma: soma, modificador: m.modificador || 0, total: total,
      ra: ra, rb: rb, duasMaiores: duasMaiores,
      critico: critico, falhaCritica: falhaCritica, semSobreviventes: semSobreviventes,
      sucesso: sucesso, dt: m.dt, somaEscolhida: escolheu, quatroDados: m.dados.length === 4,
    };
  }

  /* Pontuação de um teste estendido / dano de ataque: RA, ou as duas
     maiores no crítico do Beta (p. 11). */
  function pontuacao(res, beta) { return res.critico && beta ? res.duasMaiores : res.ra; }

  /* Oposto (Alpha/Beta p. 19/11): crítico vence o que não é; empate
     genérico fica para a cena. */
  function opor(a, b) {
    if (a.critico && !b.critico) return "a";
    if (b.critico && !a.critico) return "b";
    if (a.falhaCritica && !b.falhaCritica) return "b";
    if (b.falhaCritica && !a.falhaCritica) return "a";
    if (a.total > b.total) return "a";
    if (b.total > a.total) return "b";
    return "empate";
  }
  /* Ataque mútuo corpo a corpo (Beta p. 20): o maior acerta; empate,
     os dois acertam — sempre se atingirem a DT básica. */
  function ataqueMutuo(a, b, dtA, dtB) {
    var alcanca = function (r, dt) { return r.critico || (!r.falhaCritica && r.total >= dt); };
    var v = opor(a, b);
    return {
      acertaA: (v === "a" || v === "empate") && alcanca(a, dtA === undefined ? DT_PADRAO : dtA),
      acertaB: (v === "b" || v === "empate") && alcanca(b, dtB === undefined ? DT_PADRAO : dtB),
      vencedor: v,
    };
  }

  /* DT e passos de um ataque (Beta pp. 20–21). */
  function modificadoresDeAtaque(o) {
    var x = obj(o);
    var dt = DT_PADRAO, passos = 0, partes = [];
    if (x.alcance === "longo") { dt += 3; partes.push("alcance longo +3 DT"); }
    if (x.cobertura === "leve") { dt += 3; partes.push("cobertura leve +3 DT"); }
    if (x.cobertura === "total") return { ok: false, motivo: "Cobertura total: o alvo não pode ser atacado." };
    if (x.alvoCaido && x.distancia) { dt += 3; partes.push("alvo caído, à distância +3 DT"); }
    if (x.alvoCaido && !x.distancia) { passos += 1; partes.push("alvo caído, corpo a corpo +1 passo"); }
    if (x.vantagemTatica) { passos += 1; partes.push("vantagem tática +1 passo"); }
    if (x.ocultacao === "leve") { passos -= 1; partes.push("ocultação leve −1 passo"); }
    if (x.ocultacao === "total") { passos -= 2; partes.push("ocultação total −2 passos"); }
    if (x.atirandoEmCorpo && x.distancia && !x.aceitarDesvio) { passos -= 2; partes.push("atirando em corpo a corpo −2 passos"); }
    if (x.fintado) { passos += 2; partes.push("finta +2 passos"); }
    return { ok: true, dt: dt, passos: passos, partes: partes, rolarDesvio: !!(x.atirandoEmCorpo && x.distancia && x.aceitarDesvio) };
  }

  function dano(res, arma, extras, beta) {
    var base = pontuacao(res, beta);
    var bonusArma = arma ? arma.dano : 0;
    var extra = lista(extras).reduce(function (s, e) { return s + (Number(e.valor) || 0); }, 0);
    return { valor: Math.max(0, base + bonusArma + extra), base: base, arma: bonusArma, extras: lista(extras) };
  }

  /* ---------------------------------------------------------------
     A FICHA DEPOIS DO TESTE
     --------------------------------------------------------------- */
  function evento(t, privado) { return { texto: t, privado: !!privado }; }

  function pagarCustos(b, custos) {
    var c = obj(custos);
    if ((c.pd || 0) > b.recursos.pd.atual) return { ok: false, motivo: "PD insuficiente." };
    if ((c.pv || 0) > b.recursos.pv.atual) return { ok: false, motivo: "PV insuficiente." };
    b.recursos.pd.atual -= c.pd || 0;
    b.recursos.pv.atual -= c.pv || 0;
    Object.keys(obj(c.espacos)).forEach(function (hid) {
      var h = lista(b.habilidades).filter(function (x) { return x.id === hid; })[0];
      if (h) h.estado.espacos = Math.max(0, h.estado.espacos - c.espacos[hid]);
    });
    lista(c.reservas).forEach(function (r) {
      b.estado.reservas = b.estado.reservas.filter(function (x) { return x.id !== r.id; });
      lista(b.habilidades).forEach(function (h) { h.estado.reserva = h.estado.reserva.filter(function (x) { return x.id !== r.id; }); });
    });
    return { ok: true };
  }

  function aposTeste(b, m, res) {
    var ev = [];
    /* Ímpeto: cada teste falho preenche um espaço (até o máximo). */
    if (res.sucesso === false) {
      R().habilidadesDoTipo(b, "impeto").forEach(function (h) {
        var mx = R().motorDe(h).espacos;
        if (h.estado.espacos < mx) { h.estado.espacos++; ev.push(evento("Ímpeto: " + h.estado.espacos + "/" + mx + ".")); }
      });
    }
    if (res.pavor && res.pavor.terminou && b.estado.pavor) { b.estado.pavor = 0; ev.push(evento("O pavor rolou 1: o efeito de medo termina.")); }
    res.dados.forEach(function (d) {
      if (d.parceiro && d.valor === 1) {
        var h = lista(b.habilidades).filter(function (x) { return x.id === d.parceiro; })[0];
        if (h && !h.estado.indisponivel) { h.estado.indisponivel = true; ev.push(evento(h.nome + ": o dado deu 1 — o parceiro se machucou e não ajuda até o fim da cena.")); }
      }
    });
    b.efeitos = b.efeitos.filter(function (e) { return e.expira !== "teste"; });
    return ev;
  }

  function registrar(b, tipo, t) {
    b.historico.push({ quando: new Date().toISOString(), tipo: tipo, texto: String(t).slice(0, 400), corrigido: false });
    b.historico = b.historico.slice(-80);
  }

  /* Dano físico ou emocional. `externo`: efeito de fora (o gasto
     voluntário de PD não dispara trauma). */
  function aplicarDano(b, o) {
    var x = obj(o);
    var ev = [];
    var valor = Math.max(0, Math.floor(Number(x.valor) || 0));
    var tipo = x.tipo === "emocional" ? "emocional" : "fisico";
    var beta = ehBeta(b);
    if (tipo === "fisico" && x.armadura && R().armaduraAtual(b) > 0 && valor > 0) {
      b.recursos.armaduraGasta++;
      var reduz = Math.min(10, valor);
      valor -= reduz;
      ev.push(evento("Armadura: 1 ponto gasto, −" + reduz + " de dano (restam " + R().armaduraAtual(b) + ")."));
    }
    if (tipo === "emocional") {
      b.estado.traumas.forEach(function (t) { if (t.ref === "tept" && !t.curado) { valor += 1; ev.push(evento("Estresse Pós-Traumático: +1 de dano emocional.")); } });
      var antesPd = b.recursos.pd.atual;
      b.recursos.pd.atual = Math.max(0, antesPd - valor);
      ev.push(evento(valor + " de dano emocional (PD " + b.recursos.pd.atual + "/" + R().pdMax(b) + ")."));
      if (x.externo !== false && (b.recursos.pd.atual === 0) && (antesPd > 0 || valor > 0)) {
        var dtT = 7 + 3 * b.estado.testesTrauma;
        b.estado.pendentes.push({ id: R().novoId(), tipo: beta ? "trauma" : "disciplinaAlpha", dt: dtT, naoLetal: false, motivo: antesPd > 0 ? "Reduzido a 0 PD" : "Dano emocional com 0 PD" });
        ev.push(evento((beta ? "Teste de trauma" : "Teste de Disciplina") + " pendente (DT " + dtT + ")."));
      }
      return ev;
    }
    var antes = b.recursos.pv.atual;
    var perdido = Math.min(antes, valor);
    b.recursos.pv.atual = antes - perdido;
    if (x.naoLetal) b.recursos.naoLetal = Math.min(R().pvMax(b), b.recursos.naoLetal + perdido);
    ev.push(evento(valor + " de dano" + (x.naoLetal ? " não letal" : "") + " (PV " + b.recursos.pv.atual + "/" + R().pvMax(b) + ")."));
    if (b.recursos.pv.atual === 0 && (antes > 0 || valor > 0)) {
      var dt = 7 + 3 * b.estado.testesLesao;
      var naoLetal = b.recursos.naoLetal > 0;
      b.estado.pendentes.push({ id: R().novoId(), tipo: beta ? "lesao" : "vigorAlpha", dt: dt, naoLetal: beta && naoLetal, motivo: antes > 0 ? "Reduzido a 0 PV" : "Perdeu PV com 0 PV" });
      ev.push(evento((beta ? "Teste de lesão" : "Teste de Vigor") + " pendente (DT " + dt + ")."));
    }
    return ev;
  }

  function curar(b, recurso, valor) {
    var n = Math.max(0, Math.floor(Number(valor) || 0));
    if (recurso === "pd") {
      b.recursos.pd.atual = Math.min(R().pdMax(b), b.recursos.pd.atual + n);
      return n;
    }
    var antes = b.recursos.pv.atual;
    b.recursos.pv.atual = Math.min(R().pvMax(b), antes + n);
    b.recursos.naoLetal = Math.max(0, b.recursos.naoLetal - (b.recursos.pv.atual - antes));
    if (b.recursos.pv.atual > 0 && b.estado.inconsciente && !b.estado.moribundo) b.estado.inconsciente = false;
    return b.recursos.pv.atual - antes;
  }

  /* O teste que um pendente pede (atributo + perícia). */
  function pedidoDoPendente(b, pend) {
    if (pend.tipo === "lesao" || pend.tipo === "vigorAlpha") return { atributo: "fisico", pericia: "vigor", dt: pend.dt, tipo: "lesao", rotulo: pend.tipo === "lesao" ? "Teste de lesão" : "Teste de Vigor (0 PV)", bonus: pend.naoLetal ? [{ faces: 6, fonte: "Dano não letal (Beta p. 23)" }] : [] };
    var bonus = [];
    if (pend.tipo === "trauma") R().habilidadesDoTipo(b, "estoico").forEach(function (h) { bonus.push({ faces: R().motorDe(h).faces, fonte: h.nome }); });
    return { atributo: "emocao", pericia: "disciplina", dt: pend.dt, tipo: "trauma", rotulo: pend.tipo === "trauma" ? "Teste de trauma" : "Teste de Disciplina (0 PD)", bonus: bonus };
  }

  function rolarNaTabela(tabela, b, naoLetal, rolador) {
    var bonus = (K().PATAMARES[b.patamar] || { bonus: 0 }).bonus;
    var d1 = rolador(20), d2 = naoLetal ? rolador(20) : null;
    var d = d2 !== null ? Math.max(d1, d2) : d1;
    return { rolagens: d2 !== null ? [d1, d2] : [d1], valor: d + bonus, bonus: bonus, linha: K().daTabela(tabela, d + bonus) };
  }

  /* A máquina de estados: resolve o pendente com o resultado do teste. */
  function resolverPendente(b, pendId, res, rolador, rodadaAtual) {
    var pend = b.estado.pendentes.filter(function (p) { return p.id === pendId; })[0];
    if (!pend) return { ok: false, motivo: "Não há esse teste pendente." };
    b.estado.pendentes = b.estado.pendentes.filter(function (p) { return p.id !== pendId; });
    var ev = [];
    var extra = {};

    if (pend.tipo === "vigorAlpha" || pend.tipo === "disciplinaAlpha") {
      /* Alpha p. 26: passou, segue agindo; falhou, morre (ou colapsa). */
      if (pend.tipo === "vigorAlpha") b.estado.testesLesao++; else b.estado.testesTrauma++;
      if (res.sucesso) ev.push(evento("Passou (DT " + pend.dt + "): continua agindo."));
      else if (pend.tipo === "vigorAlpha") { b.estado.morto = true; ev.push(evento("Falhou no teste de Vigor: morre.")); registrar(b, "morte", "Morreu ao falhar no teste de Vigor (Alpha p. 26)."); }
      else { b.estado.colapso = true; b.estado.morto = true; ev.push(evento("Falhou no teste de Disciplina: colapso mental (Alpha p. 26).")); registrar(b, "colapso", "Colapso mental ao falhar no teste de Disciplina (Alpha p. 26)."); }
      return { ok: true, eventos: ev, pendente: pend };
    }

    if (pend.tipo === "trauma") {
      b.estado.testesTrauma++;
      R().habilidadesDoTipo(b, "estoico").forEach(function (h) {
        if (!b.estado.usos["estoico:" + h.id]) { b.estado.usos["estoico:" + h.id] = true; curar(b, "pd", R().motorDe(h).pd); ev.push(evento(h.nome + ": recupera " + R().motorDe(h).pd + " PD (primeiro teste de trauma da cena).")); }
      });
      if (res.sucesso) { ev.push(evento("Passou no teste de trauma: sem efeito.")); return { ok: true, eventos: ev, pendente: pend }; }
      var t = rolarTraumaSemRepetir(b, rolador);
      extra.tabela = t;
      aplicarLinha(b, t.linha, "trauma", ev, rodadaAtual, rolador);
      return { ok: true, eventos: ev, pendente: pend, tabela: t };
    }

    /* Lesão (Beta p. 21). */
    b.estado.testesLesao++;
    if (res.critico) {
      curar(b, "pv", 1);
      b.estado.inconsciente = false; b.estado.moribundo = false;
      ev.push(evento("Sucesso crítico no teste de lesão: recupera 1 PV e sai de inconsciente/moribundo."));
    } else if (res.falhaCritica) {
      b.estado.morto = true;
      ev.push(evento("Falha crítica no teste de lesão: morre."));
      registrar(b, "morte", "Morreu: falha crítica no teste de lesão.");
    } else if (res.sucesso) {
      b.estado.inconsciente = true; b.estado.moribundo = true;
      b.estado.usos.moribundoDesde = rodadaAtual === undefined ? null : rodadaAtual;
      ev.push(evento("Passou no teste de lesão: inconsciente e moribundo."));
    } else {
      var l = rolarLesaoSemRepetir(b, pend.naoLetal, rolador);
      extra.tabela = l;
      aplicarLinha(b, l.linha, "lesao", ev, rodadaAtual, rolador);
      if (!b.estado.morto && !b.estado.morteLenta && b.estado.moribundo) { b.estado.moribundo = false; ev.push(evento("Sobreviveu à lesão: deixa de estar moribundo.")); }
    }
    return { ok: true, eventos: ev, pendente: pend, tabela: extra.tabela || null };
  }

  /* Duplicatas: rola de novo (exceto Laceração Profunda). */
  function rolarLesaoSemRepetir(b, naoLetal, rolador) {
    var tentativas = [];
    for (var i = 0; i < 12; i++) {
      var r = rolarNaTabela(K().LESOES, b, naoLetal, rolador);
      tentativas.push(r.valor);
      var ja = b.estado.lesoes.some(function (l) { return l.ref === r.linha.id; });
      if (!r.linha.perm || r.linha.acumula || !ja) { r.tentativas = tentativas; return r; }
    }
    r.tentativas = tentativas;
    return r;
  }
  function rolarTraumaSemRepetir(b, rolador) {
    var tentativas = [];
    for (var i = 0; i < 12; i++) {
      var r = rolarNaTabela(K().TRAUMAS, b, false, rolador);
      tentativas.push(r.valor);
      var ja = b.estado.traumas.some(function (t) { return t.ref === r.linha.id && !t.curado; });
      if (!r.linha.cura || !ja) { r.tentativas = tentativas; return r; }
    }
    r.tentativas = tentativas;
    return r;
  }

  function aplicarLinha(b, linha, tipo, ev, rodadaAtual, rolador) {
    var e = linha.efeito || {};
    var quando = new Date().toISOString();
    ev.push(evento((tipo === "lesao" ? "Lesão" : "Trauma") + ": " + linha.nome + " — " + linha.texto));
    if (tipo === "lesao" && linha.perm) b.estado.lesoes.push({ id: R().novoId(), ref: linha.id, nome: linha.nome, quando: quando });
    if (tipo === "trauma" && linha.cura) b.estado.traumas.push({ id: R().novoId(), ref: linha.id, nome: linha.nome, curado: false, quando: quando });
    if (e.tipo === "morte") { b.estado.morto = true; registrar(b, "morte", "Morte súbita (tabela de lesões)."); }
    if (e.tipo === "colapso") { b.estado.colapso = true; registrar(b, "colapso", "Colapso total (tabela de traumas)."); }
    if (e.tipo === "morteLenta") {
      curar(b, "pv", 1);
      b.estado.inconsciente = false; b.estado.moribundo = false; b.estado.morteLenta = true;
      b.estado.morteLentaRodada = rodadaAtual === undefined || rodadaAtual === null ? null : rodadaAtual + 1;
      registrar(b, "morteLenta", "Morte lenta: age uma última vez.");
    }
    if (e.tipo === "passoAtributo") b.efeitos.push({ id: R().novoId(), tipo: "passoAtributo", alvo: e.alvo, n: e.n, faces: 0, expira: e.expira || "cena", fonte: linha.nome, d20: false });
    if (e.tipo === "recupera") curar(b, e.recurso, e.valor);
    if (e.tipo === "pvMax" || e.tipo === "pdMax") {
      b.recursos.pv.atual = Math.min(b.recursos.pv.atual, R().pvMax(b));
      b.recursos.pd.atual = Math.min(b.recursos.pd.atual, R().pdMax(b));
    }
    if (e.tipo === "pavor") ev.push.apply(ev, darPavor(b));
    if (e.tipo === "perdeAcao") b.estado.perdeAcao = 2;
    if (linha.perm || linha.cura || e.tipo === "morte" || e.tipo === "colapso" || e.tipo === "morteLenta") registrar(b, tipo, linha.nome + ": " + linha.texto);
  }

  /* Dado de pavor (Beta p. 24): novo d6, ou +1 passo se já tem. */
  function darPavor(b) {
    if (!b.estado.pavor) { b.estado.pavor = 6; return [evento("Recebe um dado de pavor (d6).")]; }
    b.estado.pavor = R().passoDado(b.estado.pavor, 1, false);
    return [evento("O dado de pavor aumenta para d" + b.estado.pavor + ".")];
  }

  /* ---------------------------------------------------------------
     O TEMPO
     --------------------------------------------------------------- */
  function fimDeRodada(b, rodada) {
    var ev = [];
    if (b.estado.morteLenta && !b.estado.morto && (b.estado.morteLentaRodada === null || rodada >= b.estado.morteLentaRodada)) {
      b.estado.morto = true; b.estado.morteLenta = false;
      ev.push(evento("Morte lenta: o fim da rodada chega — morre."));
      registrar(b, "morte", "Morreu ao fim da rodada (morte lenta).");
    }
    /* Moribundo: teste no fim de cada rodada, exceto a em que ficou. */
    if (b.estado.moribundo && !b.estado.morto && ehBeta(b)) {
      var desde = b.estado.usos.moribundoDesde;
      if (desde === null || desde === undefined || rodada > desde) {
        var dt = 7 + 3 * b.estado.testesLesao;
        if (!b.estado.pendentes.some(function (p) { return p.tipo === "lesao"; })) {
          b.estado.pendentes.push({ id: R().novoId(), tipo: "lesao", dt: dt, naoLetal: b.recursos.naoLetal > 0, motivo: "Moribundo: fim da rodada" });
          ev.push(evento("Moribundo: teste de lesão pendente (DT " + dt + ")."));
        }
      }
    }
    b.estado.perdeAcao = b.estado.perdeAcao === 2 ? 1 : 0;
    b.estado.acaoExtra = 0;
    b.efeitos = b.efeitos.filter(function (e) { return e.expira !== "rodada"; });
    Object.keys(b.estado.usos).forEach(function (k) { if (/^rodada:/.test(k)) delete b.estado.usos[k]; });
    return ev;
  }

  function fimDeCena(b) {
    var ev = [];
    var beta = ehBeta(b);
    lista(b.habilidades).forEach(function (h) {
      var m = R().motorDe(h);
      if (!m) return;
      if (m.tipo === "analise" && m.zeraFimCena && h.estado.marcadores) { h.estado.marcadores = 0; ev.push(evento(h.nome + ": marcadores perdidos no fim da cena.")); }
      if (m.tipo === "impeto" && m.zeraFimCena && h.estado.espacos) { h.estado.espacos = 0; ev.push(evento(h.nome + ": a barra esvazia no fim da cena.")); }
      if (m.tipo === "parceiro") h.estado.indisponivel = false;
      if (m.tipo === "avaliacao") h.estado.reserva = [];
    });
    b.estado.reservas = b.estado.reservas.filter(function (r) { return r.expira !== "cena"; });
    var antes = b.efeitos.length;
    b.efeitos = b.efeitos.filter(function (e) { return ["teste", "rodada", "cena"].indexOf(e.expira) < 0; });
    if (antes !== b.efeitos.length) ev.push(evento("Efeitos de cena terminam."));
    if (beta) { b.estado.testesLesao = 0; b.estado.testesTrauma = 0; }
    /* Beta p. 22: sobreviveu à cena com 0 PV → 1 PV. */
    if (beta && b.recursos.pv.atual === 0 && !b.estado.morto) { curar(b, "pv", 1); ev.push(evento("Fim da cena com 0 PV: recupera 1 PV.")); }
    Object.keys(b.estado.usos).forEach(function (k) { if (/^(cena|rodada|estoico):/.test(k) || k === "moribundoDesde") delete b.estado.usos[k]; });
    b.estado.perdeAcao = 0; b.estado.acaoExtra = 0;
    return ev;
  }

  function inicioDeCena(b) {
    var ev = [];
    R().habilidadesDoTipo(b, "impetoInicioCena").forEach(function (hf) {
      var hi = R().habilidadesDoTipo(b, "impeto")[0];
      if (!hi) return;
      var mx = R().motorDe(hi).espacos;
      if (hi.estado.espacos < mx) { hi.estado.espacos = Math.min(mx, hi.estado.espacos + (R().motorDe(hf).espacos || 1)); ev.push(evento(hf.nome + ": +1 espaço de ímpeto (" + hi.estado.espacos + "/" + mx + ").")); }
    });
    return ev;
  }

  /* ---------------------------------------------------------------
     MINIJOGOS
     --------------------------------------------------------------- */
  function tentativasDeDestrancar(crimeFaces) { return Math.max(1, [4, 6, 8, 10, 12].indexOf(crimeFaces) + 1); }
  function respostaDaFechadura(senha, tentativa) {
    return lista(senha).map(function (v, i) { var t = Number(tentativa[i]); return t === v ? "exato" : t < v ? "baixo" : "alto"; });
  }
  function dadosDeEquilibrio(acrobaciaFaces) { return Math.max(1, Math.floor(acrobaciaFaces / 2)); }
  function equilibrado(a, b) { return Math.abs(a - b) <= 1; }

  global.RAMAOrdem2Motor = {
    MAX_DADOS_ROLADOS: MAX_DADOS_ROLADOS, MAX_DADOS_SOMADOS: MAX_DADOS_SOMADOS, DT_PADRAO: DT_PADRAO,
    montar: montar, rolar: rolar, resolver: resolver, pontuacao: pontuacao, opor: opor, ataqueMutuo: ataqueMutuo,
    modificadoresDeAtaque: modificadoresDeAtaque, dano: dano,
    pagarCustos: pagarCustos, aposTeste: aposTeste, aplicarDano: aplicarDano, curar: curar,
    pedidoDoPendente: pedidoDoPendente, resolverPendente: resolverPendente, rolarNaTabela: rolarNaTabela, darPavor: darPavor,
    fimDeRodada: fimDeRodada, fimDeCena: fimDeCena, inicioDeCena: inicioDeCena, registrar: registrar,
    tentativasDeDestrancar: tentativasDeDestrancar, respostaDaFechadura: respostaDaFechadura, dadosDeEquilibrio: dadosDeEquilibrio, equilibrado: equilibrado,
  };
})(typeof window !== "undefined" ? window : globalThis);
