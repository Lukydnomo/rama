/* =====================================================================
   R.A.M.A. — BRUTAL · o que as telas compartilham (v7.0)
   ---------------------------------------------------------------------
   Nenhuma regra mora aqui: o motor (js/brutal/mesa.js) valida e aplica.

     RAMABrutalTela      botões com motivo, dados (d6 com a face e o
                         texto, nunca só cor), uma rolagem com sucesso e
                         falha marcados, as frases dos eventos e a
                         consulta das regras com página
     RAMABrutalThriller  o Thriller de uma FICHA: numa campanha de
                         BRUTAL, o da Mesa da Diretora (lido do servidor,
                         operado pelo servidor — brutal_operar com opId —
                         e acompanhado pela sincronia da campanha); sem
                         campanha, o TREINO guardado na própria ficha,
                         operado aqui com o mesmo motor
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el;
  function K() { return global.RAMABrutalCatalogo; }
  function M() { return global.RAMABrutalMesa; }
  function B() { return global.RAMABrutal; }
  function UI() { return global.RAMAUI; }

  function botao(texto, aoClicar, opcoes) {
    var o = opcoes || {};
    return el("button.r-botao" + (o.mini === false ? "" : ".r-botao--mini") + (o.classe ? "." + o.classe : ""), {
      type: "button", texto: texto, disabled: !!o.motivo, title: o.motivo || o.dica || "",
      "aria-label": o.rotulo || null, dataset: o.dataset || null,
      onclick: function (ev) { if (!o.motivo) aoClicar(ev); },
    });
  }
  /* O motivo de uma ação indisponível, ao lado do botão (não só no
     título: no celular não há passar o mouse). */
  function motivo(t) { return t ? el("p.brt-motivo", { texto: t }) : null; }

  function rolador(faces) {
    if (global.RAMADados && global.RAMADados.rolar) return global.RAMADados.rolar("1d" + (faces || 6)).rolagens[0];
    return 1 + Math.floor(Math.random() * (faces || 6));
  }
  function novaOperacao() { return global.RAMAApi && global.RAMAApi.novaOperacao ? global.RAMAApi.novaOperacao() : "op-" + U.uuid(); }

  /* ---------------------------------------------------------------
     DADOS NA TELA
     --------------------------------------------------------------- */
  function dado(face, opcoes) {
    var o = opcoes || {};
    var classes = ["brt-dado"];
    if (o.estado) classes.push("brt-dado--" + o.estado);
    if (o.pequeno) classes.push("brt-dado--p");
    var rot = o.rotulo || (face ? "dado " + face : "dado");
    return el("span", { class: classes.join(" "), role: "img", "aria-label": rot, title: rot }, [
      el("span.brt-dado__face", { texto: face ? String(face) : "" }),
      o.marca ? el("span.brt-dado__marca", { "aria-hidden": "true", texto: o.marca }) : null,
    ]);
  }
  /* Uma pilha: n dados (até mostrar `max` e um "+N"). */
  function pilha(n, opcoes) {
    var o = opcoes || {};
    var max = o.max || 12;
    var lista = [];
    for (var i = 0; i < Math.min(n, max); i++) lista.push(dado(o.face === undefined ? 6 : o.face, { estado: o.estado, pequeno: o.pequeno, rotulo: o.rotuloDado || "dado" }));
    if (n > max) lista.push(el("span.brt-pilha__mais", { texto: "+" + (n - max) }));
    return el("div.brt-pilha", { role: "img", "aria-label": (o.rotulo || "Pilha") + ": " + n + " dado" + (n === 1 ? "" : "s") }, lista.length ? lista : [el("span.brt-pilha__vazia", { texto: o.vazia || "vazia" })]);
  }

  /* Uma rolagem do motor: cada face com sucesso (✓) ou falha (✗). */
  function rolagem(r, opcoes) {
    if (!r) return null;
    var o = opcoes || {};
    var faces = (r.faces || []).map(function (f, i) {
      if (r.dificuldade === null || r.dificuldade === undefined) return dado(f, { estado: f === 6 ? "seis" : "neutro", rotulo: "dado " + f });
      var ok = f >= r.dificuldade;
      var trocado = r.substituido && r.substituido.indice === i;
      return dado(f, { estado: ok ? (f === 6 ? "seis" : "sucesso") : "falha", marca: trocado ? "↺" : ok ? "✓" : "✗", rotulo: "dado " + f + (ok ? ", sucesso" : ", falha") + (trocado ? ", trocado pelo marcador" : "") });
    });
    var res = r.dificuldade === null || r.dificuldade === undefined
      ? (r.faces[0] === 6 ? "6!" : "Ferida " + r.faces[0])
      : (r.superado ? "Superado" : "Falhou") + " · " + r.sucessos + " sucesso" + (r.sucessos === 1 ? "" : "s") + (r.garantidos ? " (1 garantido)" : "");
    return el("article.brt-rolagem" + (r.superado ? ".brt-rolagem--ok" : r.superado === false ? ".brt-rolagem--falha" : ""), { dataset: { rolagem: r.id } }, [
      el("header.brt-rolagem__topo", {}, [
        el("strong", { texto: (o.semNome ? "" : (r.nome || "") + " · ") + (r.rotulo || "Teste") }),
        r.dificuldade ? el("span.t-mini", { texto: "sucesso em " + r.dificuldade + "+" + (r.complexo ? " · Complexo (exatamente 2)" : "") }) : null,
      ]),
      el("div.brt-rolagem__dados", {}, faces),
      el("p.brt-rolagem__resultado", { texto: res + (r.destino && r.dificuldade && r.sucessos < r.faces.length + (r.garantidos || 0) ? " · falhas: " + ({ sacrificar: "sacrificadas", descartar: "descartadas", manter: "ficam" })[r.destino] : "") + (r.devorada ? " · esperança DEVORADA" : "") }),
      o.acoes && o.acoes.length ? el("div.faixa", {}, o.acoes) : null,
    ]);
  }

  /* Os eventos do motor (textos), num aviso curto. */
  function narrar(eventos, opcoes) {
    var frases = (eventos || []).map(function (e) { return typeof e === "string" ? e : e && e.texto; }).filter(Boolean);
    if (!frases.length || (opcoes && opcoes.silencioso)) return frases;
    var grave = frases.some(function (f) { return /☠|ENCONTRO|ESCAPOU|6!/.test(f); });
    UI().aviso(frases.slice(-4).join(" · "), { tipo: grave ? "atencao" : "info", duracao: grave ? 9000 : 6000 });
    return frases;
  }

  /* A consulta de uma regra, com a página do Corte Rápido. */
  function consulta(titulo, texto, pagina) {
    return UI().modal({ titulo: titulo, classe: "brt-consulta", fundoFecha: true, conteudo: [el("p.t-mini", { texto: K().referencia(pagina) }), el("p", { texto: texto })] });
  }
  function fonte(pagina) { return el("span.brt-fonte", { texto: "p. " + pagina, title: K().referencia(pagina) }); }

  function nomeEstilo(k) { return K().ESTILOS[k] ? K().ESTILOS[k].nome : k; }
  function nomeRecarga(k) { return (K().RECARGAS[k] || {}).nome || k; }

  /* =================================================================
     O THRILLER DE UMA FICHA
     ================================================================= */
  var lido = { campanhaId: "", dados: null, erro: "", tentado: false, carregando: null, sincronia: null, ocupado: false };
  function campanhaDe(ctx) { return ctx && ctx.ficha && ctx.ficha.campanhaId ? String(ctx.ficha.campanhaId) : ""; }

  function carregar(ctx, forcar) {
    var cid = campanhaDe(ctx);
    if (!cid || !global.RAMAApi || !global.RAMAApi.lerBrutal) return Promise.resolve(null);
    if (lido.carregando && lido.campanhaId === cid) return lido.carregando;
    if (!forcar && lido.tentado && lido.campanhaId === cid) return Promise.resolve(lido.dados);
    if (lido.campanhaId !== cid) pararSincronia();
    lido.campanhaId = cid; lido.tentado = true;
    lido.carregando = global.RAMAApi.lerBrutal(cid, { segundoPlano: true }).then(function (r) {
      lido.carregando = null;
      if (!r || !r.ok) { lido.dados = null; lido.erro = (r && r.erro) || "falha"; ctx.atualizar(["bloco", "conteudo"]); return null; }
      lido.dados = r.dados; lido.erro = "";
      iniciarSincronia(ctx, cid);
      ctx.atualizar(["bloco", "conteudo"]);
      return lido.dados;
    }, function () { lido.carregando = null; lido.dados = null; lido.erro = "sem_conexao"; return null; });
    return lido.carregando;
  }

  /* A ficha numa campanha acompanha a mesa pela sincronia da campanha
     (as mesmas marcas leves): mudou o Thriller, busca de novo. */
  function iniciarSincronia(ctx, cid) {
    if (lido.sincronia || !global.RAMASincronia || !global.RAMAApi.sincronizarCampanha) return;
    lido.sincronia = global.RAMASincronia.criar({
      consultar: function () { return global.RAMAApi.sincronizarCampanha(cid); },
      chave: "sinc:" + cid,
      intervalo: function () { return global.RAMASincronia.INTERVALO_ATIVO; },
      visivel: function () { return typeof document === "undefined" || document.visibilityState !== "hidden"; },
      aoMudar: function (partes) {
        if (partes.indexOf("brutal") >= 0 || partes.indexOf("personagens") >= 0) {
          if (!lido.ocupado) return carregar(ctx, true);
        }
      },
    });
    lido.sincronia.iniciar();
  }
  function pararSincronia() { if (lido.sincronia) { lido.sincronia.parar(); lido.sincronia = null; } }

  /* Em que modo a ficha joga: "campanha" (Thriller da Mesa da
     Diretora), "carregando", "outra" (campanha de outro sistema ou sem
     acesso — vale o treino) ou "treino". */
  function modo(ctx) {
    var cid = campanhaDe(ctx);
    if (!cid) return "treino";
    if (!lido.tentado || lido.campanhaId !== cid) { carregar(ctx); return "carregando"; }
    if (lido.carregando && !lido.dados) return "carregando";
    if (lido.dados && lido.campanhaId === cid) return "campanha";
    return "outra";
  }
  function erroDaCampanha() { return lido.erro; }

  /* O estado do Thriller (Diretora: inteiro; jogadora: a vista). */
  function estado(ctx) {
    var m = modo(ctx);
    if (m === "campanha") return lido.dados.estado || lido.dados.vista;
    if (m === "carregando") return null;
    return treinoDe(ctx);
  }
  function ehDiretora(ctx) { var m = modo(ctx); return m === "campanha" ? !!lido.dados.mestre : m !== "carregando"; }
  function quem(ctx) { return modo(ctx) === "campanha" ? String(ctx.personagemId) : "eu"; }
  function dados(ctx) { return modo(ctx) === "campanha" ? lido.dados : null; }
  function papel(ctx) {
    if (modo(ctx) === "campanha") return { diretora: !!lido.dados.mestre, pode: lido.dados.pode || [] };
    return { diretora: true, pode: ["eu"] };
  }

  function treinoDe(ctx) {
    var b = ctx.ficha.brutal;
    var e = b.treino ? M().normalizar(b.treino) : M().treino(b, "eu");
    var s = e.sobreviventes.eu || (e.sobreviventes.eu = M().sobreviventeVazio("eu", ctx.ficha.nome));
    s.nome = ctx.ficha.nome || "Sobrevivente";
    if (K().ARQUETIPOS[b.arquetipo]) { s.arquetipo = b.arquetipo; s.estilos = K().ARQUETIPOS[b.arquetipo].estilos.slice(); }
    if (b.apegos && b.apegos.desejo && b.apegos.desejo.revelado) s.desejoRevelado = true;
    return e;
  }

  /* A ÚNICA porta de uma ação da ficha. */
  function operar(ctx, op, opcoes) {
    var o = opcoes || {};
    if (!ctx.podeEditar() && !(modo(ctx) === "campanha" && lido.dados && lido.dados.mestre)) { UI().avisoAtencao("Esta ficha está em modo de leitura."); return Promise.resolve({ ok: false }); }
    var m = modo(ctx);
    if (m === "carregando") { UI().avisoAtencao("O Thriller ainda está carregando."); return Promise.resolve({ ok: false }); }
    var pedido = Object.assign({ quem: quem(ctx) }, op);
    if (m !== "campanha") {
      var e = treinoDe(ctx);
      var r = M().aplicar(e, pedido, papel(ctx), rolador);
      if (!r.ok) { if (r.motivo) UI().avisoAtencao(r.motivo); return Promise.resolve(r); }
      ctx.ficha.brutal.treino = M().normalizar(e);
      (r.fichas || []).forEach(function (f) { if (f.desejoRevelado) { ctx.ficha.brutal.apegos.desejo.revelado = true; ctx.ficha.brutal.apegos.desejo.reveladoEm = new Date().toISOString(); } });
      ctx.alterou();
      if (!o.silencioso) narrar(r.eventos);
      ctx.atualizar(["bloco", "conteudo"]);
      return Promise.resolve(r);
    }
    if (lido.ocupado) return Promise.resolve({ ok: false });
    lido.ocupado = true;
    var id = novaOperacao();
    return global.RAMAApi.brutalOperar(lido.campanhaId, id, pedido).then(function (r) {
      lido.ocupado = false;
      if (!r.ok) {
        if (r.motivo) UI().avisoAtencao(r.motivo);
        else UI().avisoDeFalha(r, "ação no Thriller");
        if (r.dados) { lido.dados = r.dados; ctx.atualizar(["bloco", "conteudo"]); }
        return r;
      }
      lido.dados = r.dados;
      if (!o.silencioso && r.resultado) narrar(r.resultado.eventos);
      ctx.atualizar(["bloco", "conteudo"]);
      return Object.assign({ ok: true }, r.resultado || {});
    }, function (erro) { lido.ocupado = false; UI().avisoErro("Falha de conexão: tente de novo (a ação não é aplicada duas vezes)."); return { ok: false, erro: erro }; });
  }

  /* Recomeçar o treino da ficha (sem campanha). */
  function zerarTreino(ctx) {
    ctx.ficha.brutal.treino = null;
    ctx.alterou();
    ctx.atualizar(["bloco", "conteudo"]);
  }

  global.RAMABrutalTela = {
    botao: botao, motivo: motivo, rolador: rolador, novaOperacao: novaOperacao,
    dado: dado, pilha: pilha, rolagem: rolagem, narrar: narrar, consulta: consulta, fonte: fonte,
    nomeEstilo: nomeEstilo, nomeRecarga: nomeRecarga,
  };
  global.RAMABrutalThriller = {
    carregar: carregar, modo: modo, estado: estado, ehDiretora: ehDiretora, quem: quem, dados: dados, papel: papel,
    operar: operar, zerarTreino: zerarTreino, erro: erroDaCampanha, parar: pararSincronia,
  };
})(window);
