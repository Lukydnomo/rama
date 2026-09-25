/* =====================================================================
   R.A.M.A. — Ordem Paranormal · condições que se contam por turno
   =====================================================================
   Morrendo e enlouquecendo (Ordem Paranormal RPG, p. 88), e os
   contadores que a MESA pode criar para exaustão e desmaio. Sem tela e
   sem rede: a ficha desenha, o painel da campanha mostra, e o servidor
   repete só a parte da contagem por turno de combate
   (backend/Campanhas.gs, "Condições e turnos"). Os testes rodam os mesmos
   casos nas duas implementações.

   ---------------------------------------------------------------------
   TRÊS COISAS SEPARADAS, E NENHUMA DEDUZIDA DAS OUTRAS
   ---------------------------------------------------------------------

     valor do recurso   o que sobrou de PV, SAN ou PD — em `ordem.recursos`
     condição ativa     um fato registrado: "está morrendo". Não é "PV é 0":
                        curar 1 PV não encerra morrendo, e uma ficha aberta
                        com PV 0 não passa a morrer sozinha
     contagem na cena   quantas vezes o personagem INICIOU um turno com a
                        condição, nesta cena. Não precisam ser seguidas

   Encerrar uma condição para a contagem, mas não apaga os turnos que já
   aconteceram naquela cena: se ela voltar, a conta continua de onde
   estava. Só "Nova cena" começa do zero.

   ---------------------------------------------------------------------
   CADA INÍCIO DE TURNO É UM EVENTO COM ID
   ---------------------------------------------------------------------

   O +1 manual ganha um id próprio. O que vem do combate tem o id do
   próprio turno — `cb:<combate>:<rodada>:<participante>` —, e é isso que
   impede a contagem dupla: o mestre avançando o turno, a ficha aberta em
   outra aba, uma recarga, uma resposta repetida — todos apontam para o
   MESMO evento, e um evento conta uma vez. Um evento de combate tirado à
   mão ("corrigir −1") fica em `descartados`, para o mesmo turno não
   voltar a contar numa sincronização. "Voltar turno" retira o evento do
   turno desfeito, e só ele: correções manuais feitas depois ficam.

   ---------------------------------------------------------------------
   O QUE É DA MESA NÃO É REGRA
   ---------------------------------------------------------------------

   O livro não liga exaustão nem desmaio a PD ou PE chegando a 0, e não
   dá prazo em turnos para nenhum dos dois. Os contadores da mesa começam
   DESLIGADOS, sem limite e com ativação manual; o limite, a ativação e o
   texto da consequência são da mesa, e chegar ao limite só mostra o que
   a mesa escreveu — nada é aplicado sozinho.
   ===================================================================== */

(function (global) {
  "use strict";

  var OPRPG = "OPRPG";
  var SAH = "SAH";

  /* Guardar mais do que isto por condição não serve para nada: a cena
     muda e a contagem recomeça. É teto contra arquivo adulterado. */
  var MAX_EVENTOS = 60;
  var MAX_DESCARTADOS = 60;
  var MAX_LIMITE_DA_MESA = 20;
  var LIMITE_SEM_TETO = 99;

  var OFICIAIS = {
    morrendo: {
      chave: "morrendo",
      nome: "Morrendo",
      recurso: "pv",
      limite: 3,
      fonte: OPRPG, pagina: 88,
      resultado: "Iniciou três turnos morrendo nesta cena: pela regra, o personagem morre (Ordem Paranormal RPG, p. 88). " +
        "A ficha continua como está — nada é apagado.",
      encerra: "Morrendo termina com um teste de Medicina (DT 20) ou com um efeito específico (Ordem Paranormal RPG, p. 88). " +
        "Curar PV encerra a inconsciência, não isto.",
    },
    enlouquecendo: {
      chave: "enlouquecendo",
      nome: "Enlouquecendo",
      recurso: "san",
      limite: 3,
      fonte: OPRPG, pagina: 88,
      resultado: "Iniciou três turnos enlouquecendo nesta cena: pela regra, a mente sucumbe e o personagem fica insano — " +
        "vira um NPC sob controle do mestre (Ordem Paranormal RPG, p. 88). A ficha continua de quem é; com a regra opcional " +
        "Loucura Não Letal (p. 175), o jogador continua com ele e rola um efeito de insanidade.",
      encerra: "Enlouquecendo termina com Diplomacia (DT 20) ou com qualquer efeito que cure pelo menos 1 de Sanidade " +
        "(Ordem Paranormal RPG, p. 88).",
      encerraComPd: "Enlouquecendo termina com Diplomacia (DT 20, Ordem Paranormal RPG, p. 88) ou recuperando pelo menos " +
        "1 PD (Sobrevivendo ao Horror, p. 105).",
    },
  };

  var DA_MESA = {
    exaustao: {
      chave: "exaustao",
      nome: "Exaustão",
      explicacao: "Contador da mesa, não regra do livro. “Exausto” é uma condição de fadiga (debilitado, lento e " +
        "vulnerável — Ordem Paranormal RPG, p. 310), mas o livro não a liga a PD ou PE chegando a 0 nem dá prazo em turnos.",
    },
    desmaio: {
      chave: "desmaio",
      nome: "Desmaio",
      explicacao: "Contador da mesa, não regra do livro. O livro não tem uma condição chamada desmaio; a mais próxima é " +
        "inconsciente (Ordem Paranormal RPG, p. 310), que vem de 0 PV ou de ficar debilitado de novo.",
    },
  };

  var CHAVES_CONTADAS = ["morrendo", "enlouquecendo"];
  var CHAVES_DA_MESA = ["exaustao", "desmaio"];

  /* Como um contador da mesa pode ficar ativo. Só o que tem origem
     conhecida conta como "chegar a 0": gastar e dano. Um número digitado
     à mão não diz de onde veio, e não ativa nada. */
  var ATIVACOES = [
    { chave: "manual", nome: "Só à mão" },
    { chave: "recursoZero", nome: "Quando os pontos de esforço (ou de determinação) chegarem a 0 por gasto ou dano" },
  ];

  function uuid() {
    if (global.RAMAUtil && global.RAMAUtil.uuid) return global.RAMAUtil.uuid();
    return "x" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function agora() { return new Date().toISOString(); }

  function texto(v, limite) { return String(v === undefined || v === null ? "" : v).slice(0, limite || 120); }

  function carimbo(v) {
    if (typeof v !== "string" || !v) return "";
    var d = new Date(v);
    return isNaN(d.getTime()) ? "" : v.slice(0, 40);
  }

  function idValido(v) {
    var s = texto(v, 160);
    return /^[A-Za-z0-9_.:|#-]{1,160}$/.test(s) ? s : "";
  }

  /* =================================================================
     NORMALIZAÇÃO
     ================================================================= */

  function normalizarEvento(bruto) {
    if (!bruto || typeof bruto !== "object") return null;
    var id = idValido(bruto.id);
    if (!id) return null;
    var e = {
      id: id,
      origem: bruto.origem === "combate" ? "combate" : "manual",
      cena: idValido(bruto.cena),
      em: carimbo(bruto.em),
    };
    if (e.origem === "combate") {
      var r = Math.round(Number(bruto.rodada));
      if (r >= 1 && r <= 99999) e.rodada = r;
      var c = idValido(bruto.combate);
      if (c) e.combate = c;
    }
    return e;
  }

  function normalizarEventos(lista) {
    var vistos = {};
    return (Array.isArray(lista) ? lista : []).map(normalizarEvento).filter(function (e) {
      if (!e || vistos[e.id]) return false;
      vistos[e.id] = true;
      return true;
    }).slice(-MAX_EVENTOS);
  }

  function normalizarDescartados(lista) {
    var vistos = {};
    return (Array.isArray(lista) ? lista : []).map(idValido).filter(function (id) {
      if (!id || vistos[id]) return false;
      vistos[id] = true;
      return true;
    }).slice(-MAX_DESCARTADOS);
  }

  function normalizarContada(bruto) {
    var b = (bruto && typeof bruto === "object") ? bruto : {};
    return {
      ativa: b.ativa === true,
      desde: carimbo(b.desde),
      eventos: normalizarEventos(b.eventos),
      descartados: normalizarDescartados(b.descartados),
    };
  }

  function normalizarSimples(bruto) {
    var b = (bruto && typeof bruto === "object") ? bruto : {};
    return { ativa: b.ativa === true, desde: carimbo(b.desde) };
  }

  function limiteDaMesa(v) {
    if (v === null || v === undefined || v === "") return null;
    var n = Math.round(Number(v));
    return n >= 1 && n <= MAX_LIMITE_DA_MESA ? n : null;
  }

  function normalizarDaMesa(bruto) {
    var b = (bruto && typeof bruto === "object") ? bruto : {};
    var base = normalizarContada(b);
    base.usar = b.usar === true;
    base.limite = limiteDaMesa(b.limite);
    base.ativacao = b.ativacao === "recursoZero" ? "recursoZero" : "manual";
    base.consequencia = texto(b.consequencia, 200).trim();
    return base;
  }

  function vazio() {
    return normalizar(null);
  }

  /* A cena começa sem id: uma ficha antiga lida duas vezes não pode
     ganhar duas cenas diferentes. O primeiro "Nova cena" cria o id. */
  function normalizar(bruto) {
    var b = (bruto && typeof bruto === "object") ? bruto : {};
    var cena = (b.cena && typeof b.cena === "object") ? b.cena : {};
    var mesa = (b.mesa && typeof b.mesa === "object") ? b.mesa : {};
    return {
      cena: { id: idValido(cena.id), iniciadaEm: carimbo(cena.iniciadaEm) },
      integrarCombate: b.integrarCombate !== false,
      morrendo: normalizarContada(b.morrendo),
      inconsciente: normalizarSimples(b.inconsciente),
      enlouquecendo: normalizarContada(b.enlouquecendo),
      perturbado: normalizarSimples(b.perturbado),
      mesa: {
        exaustao: normalizarDaMesa(mesa.exaustao),
        desmaio: normalizarDaMesa(mesa.desmaio),
      },
    };
  }

  /* =================================================================
     LEITURA
     ================================================================= */

  function rastreador(cond, chave) {
    if (!cond) return null;
    if (CHAVES_CONTADAS.indexOf(chave) >= 0) return cond[chave] || null;
    if (CHAVES_DA_MESA.indexOf(chave) >= 0) return cond.mesa ? cond.mesa[chave] || null : null;
    return null;
  }

  function limiteDe(cond, chave) {
    if (OFICIAIS[chave]) return OFICIAIS[chave].limite;
    var r = rastreador(cond, chave);
    return r && r.limite ? r.limite : null;
  }

  function eventosDaCena(cond, chave) {
    var r = rastreador(cond, chave);
    if (!r) return [];
    var cena = cond.cena ? cond.cena.id : "";
    return r.eventos.filter(function (e) { return (e.cena || "") === (cena || ""); });
  }

  function contagem(cond, chave) {
    return eventosDaCena(cond, chave).length;
  }

  /* O que a tela precisa de uma condição, pronto. */
  function estado(cond, chave, opcoes) {
    var o = opcoes || {};
    var r = rastreador(cond, chave);
    if (!r) return null;
    var limite = limiteDe(cond, chave);
    var n = contagem(cond, chave);
    var eventos = eventosDaCena(cond, chave);
    var def = OFICIAIS[chave] || DA_MESA[chave];
    return {
      chave: chave,
      nome: def.nome,
      oficial: !!OFICIAIS[chave],
      usar: OFICIAIS[chave] ? true : !!r.usar,
      ativa: !!r.ativa,
      desde: r.desde,
      contagem: n,
      limite: limite,
      atingiu: limite !== null && n >= limite,
      doCombate: eventos.filter(function (e) { return e.origem === "combate"; }).length,
      manuais: eventos.filter(function (e) { return e.origem !== "combate"; }).length,
      eventos: eventos,
      resultado: OFICIAIS[chave] ? OFICIAIS[chave].resultado : (r.consequencia || ""),
      encerra: chave === "enlouquecendo" && o.pd ? OFICIAIS.enlouquecendo.encerraComPd
        : (OFICIAIS[chave] ? OFICIAIS[chave].encerra : ""),
      fonte: OFICIAIS[chave] ? OFICIAIS[chave].fonte : "",
      pagina: OFICIAIS[chave] ? OFICIAIS[chave].pagina : 0,
      ativacao: r.ativacao || "",
      consequencia: r.consequencia || "",
      explicacao: DA_MESA[chave] ? DA_MESA[chave].explicacao : "",
    };
  }

  /* O resumo que o painel da campanha mostra a quem pode ver o status:
     só o que está ativo ou já tem turnos nesta cena. */
  function resumoPublico(cond) {
    var c = cond ? normalizar(cond) : null;
    if (!c) return [];
    var saida = [];
    CHAVES_CONTADAS.concat(CHAVES_DA_MESA).forEach(function (chave) {
      var e = estado(c, chave);
      if (!e || !e.usar) return;
      if (!e.ativa && !e.contagem) return;
      saida.push({ chave: chave, nome: e.nome, oficial: e.oficial, ativa: e.ativa, contagem: e.contagem, limite: e.limite, atingiu: e.atingiu });
    });
    if (c.inconsciente.ativa) saida.push({ chave: "inconsciente", nome: "Inconsciente", oficial: true, ativa: true, contagem: 0, limite: null, atingiu: false });
    if (c.perturbado.ativa) saida.push({ chave: "perturbado", nome: "Perturbado", oficial: true, ativa: true, contagem: 0, limite: null, atingiu: false });
    return saida;
  }

  /* =================================================================
     AÇÕES — cada uma devolve { mudou, mensagem }
     ================================================================= */

  function ativar(cond, chave, quando) {
    var r = rastreador(cond, chave);
    if (!r) return { mudou: false, mensagem: "" };
    if (DA_MESA[chave] && !r.usar) return { mudou: false, mensagem: "Este contador da mesa está desligado." };
    var mudou = !r.ativa;
    r.ativa = true;
    if (mudou) r.desde = quando || agora();
    /* "Um personagem morrendo fica inconsciente" (OPRPG p.311), e ser
       reduzido a 0 PV traz as duas (p.88). */
    if (chave === "morrendo" && !cond.inconsciente.ativa) {
      cond.inconsciente.ativa = true;
      cond.inconsciente.desde = quando || agora();
      mudou = true;
    }
    return { mudou: mudou, mensagem: "" };
  }

  function encerrar(cond, chave) {
    var r = chave === "inconsciente" || chave === "perturbado" ? cond[chave] : rastreador(cond, chave);
    if (!r || !r.ativa) return { mudou: false, mensagem: "" };
    r.ativa = false;
    return { mudou: true, mensagem: "" };
  }

  function marcar(cond, chave, ligar, quando) {
    if (chave !== "inconsciente" && chave !== "perturbado") return { mudou: false };
    var r = cond[chave];
    if (!!r.ativa === !!ligar) return { mudou: false };
    r.ativa = !!ligar;
    if (ligar) r.desde = quando || agora();
    return { mudou: true };
  }

  /* +1 à mão: um início de turno que a mesa registra sem o combate. */
  function somarInicio(cond, chave, quando) {
    var r = rastreador(cond, chave);
    if (!r) return { mudou: false, mensagem: "" };
    /* Só conta quem INICIA o turno com a condição — a mesma regra do
       combate. Para corrigir uma contagem antiga, ative antes. */
    if (!r.ativa) return { mudou: false, mensagem: "A condição não está ativa: um início de turno só conta com ela." };
    var limite = limiteDe(cond, chave);
    var teto = limite === null ? LIMITE_SEM_TETO : limite;
    if (contagem(cond, chave) >= teto) return { mudou: false, mensagem: "A contagem já chegou ao limite." };
    r.eventos.push({ id: "m-" + uuid(), origem: "manual", cena: cond.cena.id || "", em: quando || agora() });
    if (r.eventos.length > MAX_EVENTOS) r.eventos = r.eventos.slice(-MAX_EVENTOS);
    return { mudou: true, mensagem: "" };
  }

  /* −1: tira o último início desta cena. Se era do combate, o id fica
     descartado — o mesmo turno não volta a contar. */
  function corrigirMenos(cond, chave) {
    var r = rastreador(cond, chave);
    if (!r) return { mudou: false };
    var cena = cond.cena.id || "";
    for (var i = r.eventos.length - 1; i >= 0; i--) {
      if ((r.eventos[i].cena || "") !== cena) continue;
      var tirado = r.eventos.splice(i, 1)[0];
      if (tirado.origem === "combate" && r.descartados.indexOf(tirado.id) < 0) {
        r.descartados.push(tirado.id);
        if (r.descartados.length > MAX_DESCARTADOS) r.descartados = r.descartados.slice(-MAX_DESCARTADOS);
      }
      return { mudou: true };
    }
    return { mudou: false };
  }

  /* Uma cena nova zera as contagens. As condições ativas continuam
     ativas — morrendo não termina com a cena (OPRPG p.88). */
  function novaCena(cond, quando) {
    cond.cena = { id: "cena-" + uuid(), iniciadaEm: quando || agora() };
    CHAVES_CONTADAS.concat(CHAVES_DA_MESA).forEach(function (chave) {
      var r = rastreador(cond, chave);
      r.eventos = [];
      r.descartados = [];
    });
    return { mudou: true };
  }

  function configurarDaMesa(cond, chave, config) {
    var r = rastreador(cond, chave);
    if (!r || !DA_MESA[chave]) return { mudou: false };
    var c = config || {};
    var antes = JSON.stringify([r.usar, r.limite, r.ativacao, r.consequencia]);
    if (c.usar !== undefined) r.usar = c.usar === true;
    if (c.limite !== undefined) r.limite = limiteDaMesa(c.limite);
    if (c.ativacao !== undefined) r.ativacao = c.ativacao === "recursoZero" ? "recursoZero" : "manual";
    if (c.consequencia !== undefined) r.consequencia = texto(c.consequencia, 200).trim();
    /* Desligar o contador não apaga os turnos: ele só para de valer. */
    if (!r.usar) r.ativa = false;
    return { mudou: antes !== JSON.stringify([r.usar, r.limite, r.ativacao, r.consequencia]) };
  }

  /* =================================================================
     O COMBATE
     -----------------------------------------------------------------
     evento = { id, combate, rodada, em }
     Conta em toda condição ATIVA (e contador da mesa ligado) que ainda
     não tem o evento nem o descartou. Devolve as chaves que contaram.
     ================================================================= */

  function registrarInicioDeTurno(cond, evento) {
    var ev = normalizarEvento({ id: evento && evento.id, origem: "combate", cena: cond.cena.id,
      em: evento && evento.em, rodada: evento && evento.rodada, combate: evento && evento.combate });
    if (!ev || !cond.integrarCombate) return [];
    ev.cena = cond.cena.id || "";
    if (!ev.em) ev.em = agora();
    var contou = [];
    CHAVES_CONTADAS.concat(CHAVES_DA_MESA).forEach(function (chave) {
      var r = rastreador(cond, chave);
      if (!r.ativa) return;
      if (DA_MESA[chave] && !r.usar) return;
      if (r.eventos.some(function (e) { return e.id === ev.id; })) return;
      if (r.descartados.indexOf(ev.id) >= 0) return;
      var limite = limiteDe(cond, chave);
      if (contagem(cond, chave) >= (limite === null ? LIMITE_SEM_TETO : limite)) return;
      r.eventos.push(Object.assign({}, ev));
      if (r.eventos.length > MAX_EVENTOS) r.eventos = r.eventos.slice(-MAX_EVENTOS);
      contou.push(chave);
    });
    return contou;
  }

  function retirarInicioDeTurno(cond, id) {
    var alvo = idValido(id);
    if (!alvo) return [];
    var tirou = [];
    CHAVES_CONTADAS.concat(CHAVES_DA_MESA).forEach(function (chave) {
      var r = rastreador(cond, chave);
      var antes = r.eventos.length;
      r.eventos = r.eventos.filter(function (e) { return !(e.id === alvo && e.origem === "combate"); });
      if (r.eventos.length !== antes) tirou.push(chave);
    });
    return tirou;
  }

  function idDoTurno(combateId, rodada, participanteId) {
    return idValido("cb:" + texto(combateId, 60) + ":" + Math.round(Number(rodada)) + ":" + texto(participanteId, 60));
  }

  /* =================================================================
     AÇÕES NOS RECURSOS — COM ORIGEM
     -----------------------------------------------------------------
     O número digitado no recurso é AJUSTE MANUAL: muda o valor e nada
     mais. As ações daqui dizem de onde veio a mudança, e só elas aplicam
     as consequências que o livro liga a ela:

       PV   dano      reduzido a 0 → inconsciente e morrendo (OPRPG p.88)
            cura      curar 1 PV ou mais encerra a inconsciência; morrendo
                      continua (p.88)
       SAN  dano mental  reduzida a 0 → enlouquecendo (p.88)
            recuperar    curar 1 ou mais encerra enlouquecendo (p.88)
       PD   gastar       paga custos. NÃO causa perturbado nem enlouquecendo
                         (SAH p.105)
            dano mental  maior que os PD atuais → enlouquecendo; os PD que
                         sobram abaixo da metade → perturbado (SAH p.104-105)
            recuperar    1 PD ou mais encerra enlouquecendo (SAH p.105)
       PE   gastar / recuperar

     `ctx` = { atual, maximo, valor, cond, pd (regra ligada), quando }.
     Devolve { ok, valor, mensagens, mudouCondicao } ou { ok:false, motivo }.
     ================================================================= */

  var ACOES = {
    pv: ["dano", "cura"],
    san: ["danoMental", "recuperar"],
    pd: ["gastar", "danoMental", "recuperar"],
    pe: ["gastar", "recuperar"],
  };

  function inteiroPositivo(v) {
    var n = Math.round(Number(v));
    return Number.isFinite(n) && n >= 1 && n <= 9999 ? n : 0;
  }

  function aplicarAcao(recurso, acao, ctx) {
    var c = ctx || {};
    var cond = c.cond;
    if (!ACOES[recurso] || ACOES[recurso].indexOf(acao) < 0) return { ok: false, motivo: "Ação desconhecida." };
    var v = inteiroPositivo(c.valor);
    if (!v) return { ok: false, motivo: "Informe um valor inteiro de 1 a 9999." };
    var atual = Math.round(Number(c.atual)) || 0;
    var maximo = Math.max(0, Math.round(Number(c.maximo)) || 0);
    var quando = c.quando || agora();
    var mensagens = [];
    var mudouCondicao = false;
    var novo = atual;

    function ligar(chave, frase) {
      if (!cond) return;
      var r = ativar(cond, chave, quando);
      if (r.mudou) { mudouCondicao = true; mensagens.push(frase); }
    }
    function desligar(chave, frase) {
      if (!cond) return;
      var r = chave === "inconsciente" || chave === "perturbado" ? marcar(cond, chave, false) : encerrar(cond, chave);
      if (r.mudou) { mudouCondicao = true; mensagens.push(frase); }
    }
    function contadoresDaMesaNoZero() {
      if (!cond) return;
      CHAVES_DA_MESA.forEach(function (chave) {
        var r = cond.mesa[chave];
        if (!r.usar || r.ativacao !== "recursoZero" || r.ativa) return;
        ativar(cond, chave, quando);
        mudouCondicao = true;
        mensagens.push(DA_MESA[chave].nome + " (contador da mesa) ativado: os pontos chegaram a 0.");
      });
    }

    if (acao === "gastar") {
      if (v > atual) return { ok: false, motivo: "Não há " + (recurso === "pd" ? "PD" : "PE") + " suficientes: sobram " + atual + "." };
      novo = atual - v;
      if (novo === 0 && atual > 0) contadoresDaMesaNoZero();
      return { ok: true, valor: novo, mensagens: mensagens, mudouCondicao: mudouCondicao };
    }

    if (acao === "cura" || acao === "recuperar") {
      novo = Math.min(maximo, atual + v);
      if (novo < atual) novo = atual;
      if (recurso === "pv") {
        desligar("inconsciente", "Curou pelo menos 1 PV: a inconsciência termina. Morrendo continua até Medicina (DT 20) ou um efeito específico (OPRPG p. 88).");
      }
      if (recurso === "san") {
        desligar("enlouquecendo", "Curou pelo menos 1 de Sanidade: enlouquecendo termina (OPRPG p. 88).");
      }
      if (recurso === "pd") {
        desligar("enlouquecendo", "Recuperou pelo menos 1 PD: enlouquecendo termina (SAH p. 105).");
        if (novo * 2 >= maximo) desligar("perturbado", "Os PD voltaram à metade ou mais: perturbado termina.");
      }
      return { ok: true, valor: novo, mensagens: mensagens, mudouCondicao: mudouCondicao };
    }

    if (acao === "dano") {
      novo = Math.max(0, atual - v);
      if (atual > 0 && novo === 0) {
        ligar("morrendo", "Reduzido a 0 PV: inconsciente e morrendo (OPRPG p. 88).");
      }
      return { ok: true, valor: novo, mensagens: mensagens, mudouCondicao: mudouCondicao };
    }

    /* dano mental */
    novo = Math.max(0, atual - v);
    if (recurso === "san") {
      if (atual > 0 && novo === 0) ligar("enlouquecendo", "Sanidade reduzida a 0: enlouquecendo (OPRPG p. 88).");
    } else {
      if (v > atual) ligar("enlouquecendo", "Dano mental maior que os PD atuais: enlouquecendo (SAH p. 105).");
      if (novo * 2 < maximo && cond && !cond.perturbado.ativa) {
        marcar(cond, "perturbado", true, quando);
        mudouCondicao = true;
        mensagens.push("Depois do dano mental, os PD ficaram abaixo da metade: perturbado (SAH p. 104).");
      }
      if (atual > 0 && novo === 0) contadoresDaMesaNoZero();
    }
    return { ok: true, valor: novo, mensagens: mensagens, mudouCondicao: mudouCondicao };
  }

  global.RAMAOrdemCondicoes = {
    OFICIAIS: OFICIAIS,
    DA_MESA: DA_MESA,
    CHAVES_CONTADAS: CHAVES_CONTADAS,
    CHAVES_DA_MESA: CHAVES_DA_MESA,
    ATIVACOES: ATIVACOES,
    ACOES: ACOES,
    MAX_EVENTOS: MAX_EVENTOS,
    MAX_LIMITE_DA_MESA: MAX_LIMITE_DA_MESA,

    vazio: vazio,
    normalizar: normalizar,
    estado: estado,
    contagem: contagem,
    resumoPublico: resumoPublico,

    ativar: ativar,
    encerrar: encerrar,
    marcar: marcar,
    somarInicio: somarInicio,
    corrigirMenos: corrigirMenos,
    novaCena: novaCena,
    configurarDaMesa: configurarDaMesa,

    idDoTurno: idDoTurno,
    registrarInicioDeTurno: registrarInicioDeTurno,
    retirarInicioDeTurno: retirarInicioDeTurno,

    aplicarAcao: aplicarAcao,
  };
})(typeof window !== "undefined" ? window : globalThis);
