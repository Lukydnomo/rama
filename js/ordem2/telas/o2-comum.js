/* =====================================================================
   R.A.M.A. — Ordem Paranormal RPG II · o que as telas compartilham (v9.0)
   ---------------------------------------------------------------------
   Nenhuma regra mora aqui: o motor (js/ordem2/motor.js) e a mesa
   (js/ordem2/mesa.js) validam e aplicam.

     RAMAOrdem2Tela   botões com motivo, dados com forma E número (nunca
                      só cor), um resultado de teste com anulados, somados,
                      pavor, RA/RB e crítico escritos; o diálogo de teste
                      (atributo, perícia, DT, passos com alvo, dados bônus
                      das habilidades, pavor) e o de escolhas pós-rolagem
                      (Análise, Prontidão, Olhar Infalível, Mentoria,
                      os três somados)
     RAMAOrdem2Jogo   o jogo de uma FICHA: numa campanha de Ordem II, a
                      mesa do servidor (ordem2_operar com opId; a ficha
                      salva o pendente antes e recarrega depois); sem
                      campanha, um estado local no próprio bloco, operado
                      aqui pelo mesmo motor
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el;
  function K() { return global.RAMAOrdem2Catalogo; }
  function R() { return global.RAMAOrdem2; }
  function MO() { return global.RAMAOrdem2Motor; }
  function ME() { return global.RAMAOrdem2Mesa; }
  function UI() { return global.RAMAUI; }

  function botao(texto, aoClicar, opcoes) {
    var o = opcoes || {};
    return el("button.r-botao" + (o.grande ? "" : ".r-botao--mini") + (o.classe ? "." + o.classe : ""), {
      type: "button", texto: texto, disabled: !!o.motivo, title: o.motivo || o.dica || "",
      "aria-label": o.rotulo || null, dataset: o.dataset || null,
      onclick: function (ev) { if (!o.motivo) aoClicar(ev); },
    });
  }
  function motivo(t) { return t ? el("p.o2-motivo", { texto: t }) : null; }
  function fonte(fonteId, pagina) { return el("span.o2-fonte", { texto: K().referencia(fonteId, pagina), title: (K().FONTES[fonteId] || {}).nome || "" }); }
  function rolador(faces) {
    if (global.RAMADados && global.RAMADados.rolar) return global.RAMADados.rolar("1d" + (faces || 6)).rolagens[0];
    return 1 + Math.floor(Math.random() * (faces || 6));
  }
  function novaOperacao() { return global.RAMAApi && global.RAMAApi.novaOperacao ? global.RAMAApi.novaOperacao() : "op-" + U.uuid(); }

  /* Um dado: a FORMA diz o tipo (triângulo d4, quadrado d6, losango d8,
     pentágono d10, hexágono d12, estrela d20) e o número está escrito. */
  function dado(faces, opcoes) {
    var o = opcoes || {};
    var rot = o.rotulo || ("d" + faces + (o.valor !== undefined ? ", resultado " + o.valor : ""));
    return el("span.o2-dado.o2-dado--d" + faces + (o.estado ? ".o2-dado--" + o.estado : ""), { role: "img", "aria-label": rot, title: rot }, [
      el("span.o2-dado__face", { texto: o.valor !== undefined ? String(o.valor) : String(faces) }),
      o.marca ? el("span.o2-dado__marca", { "aria-hidden": "true", texto: o.marca }) : null,
    ]);
  }
  function nomeDado(f) { return "d" + f; }

  /* Um resultado do motor, escrito: cada dado (anulado ~, fora da soma
     *), pavor, soma, RA/RB e a conclusão. */
  function resultado(res, opcoes) {
    if (!res) return null;
    var o = opcoes || {};
    var dados = res.dados.map(function (d, i) {
      var estado = d.anulado ? "anulado" : !d.somado ? "fora" : null;
      var marca = d.anulado ? "∅" : !d.somado ? "−" : (d.marcas && d.marcas.length ? "↺" : "");
      var rot = d.fonte + ": d" + d.faces + " = " + d.valor + (d.anulado ? ", anulado pelo pavor" : !d.somado ? ", fora da soma" : "") + (d.marcas && d.marcas.length ? " (" + d.marcas.join(", ") + ")" : "");
      return el("span.o2-resultado__dado", {}, [dado(d.faces, { valor: d.valor, estado: estado, marca: marca, rotulo: rot }), el("span.o2-resultado__fonte", { texto: d.fonte })]);
    });
    var concl = res.critico ? "CRÍTICO — sucesso automático" : res.falhaCritica ? "FALHA CRÍTICA" + (res.semSobreviventes ? " (o pavor anulou todos os dados)" : "") : res.sucesso === true ? "Sucesso" : res.sucesso === false ? "Falha" : "Resultado";
    return el("div.o2-resultado" + (res.critico ? ".o2-resultado--critico" : res.falhaCritica ? ".o2-resultado--falha-critica" : res.sucesso === true ? ".o2-resultado--sucesso" : res.sucesso === false ? ".o2-resultado--falha" : ""), {}, [
      o.titulo ? el("strong.o2-resultado__titulo", { texto: o.titulo }) : null,
      el("div.o2-resultado__dados", {}, dados.concat(res.pavor ? [el("span.o2-resultado__dado.o2-resultado__dado--pavor", {}, [dado(res.pavor.faces, { valor: res.pavor.valor, estado: "pavor", marca: "☠", rotulo: "Dado de pavor d" + res.pavor.faces + " = " + res.pavor.valor + " (não soma; anula os menores)" }), el("span.o2-resultado__fonte", { texto: "Pavor" })])] : [])),
      el("p.o2-resultado__linha", {}, [
        el("strong", { texto: concl }),
        el("span", { texto: " · total " + res.total + (res.modificador ? " (" + (res.modificador > 0 ? "+" : "") + res.modificador + ")" : "") + (res.dt !== null && res.dt !== undefined ? " vs DT " + res.dt : "") + " · RA " + res.ra + " · RB " + res.rb }),
      ]),
      res.pavor && res.pavor.terminou ? el("p.t-mini", { texto: "O pavor rolou 1: o efeito de medo termina." }) : null,
      res.quatroDados ? el("p.t-mini", { texto: res.somaEscolhida ? "Quatro dados: os três escolhidos somam." : "Quatro dados: somam os três maiores (sugestão; dá para escolher outros três)." }) : null,
    ]);
  }

  /* ---------------------------------------------------------------
     O JOGO DE UMA FICHA
     --------------------------------------------------------------- */
  var lido = { campanhaId: "", dados: null, erro: "", tentado: false, carregando: null, sincronia: null, ocupado: false };
  function campanhaDe(ctx) { return ctx && ctx.ficha && ctx.ficha.campanhaId ? String(ctx.ficha.campanhaId) : ""; }

  function carregar(ctx, forcar) {
    var cid = campanhaDe(ctx);
    if (!cid || !global.RAMAApi || !global.RAMAApi.lerOrdem2) return Promise.resolve(null);
    if (lido.carregando && lido.campanhaId === cid) return lido.carregando;
    if (!forcar && lido.tentado && lido.campanhaId === cid) return Promise.resolve(lido.dados);
    if (lido.campanhaId !== cid) pararSincronia();
    lido.campanhaId = cid; lido.tentado = true;
    lido.carregando = global.RAMAApi.lerOrdem2(cid, { segundoPlano: true }).then(function (r) {
      lido.carregando = null;
      if (!r || !r.ok) { lido.dados = null; lido.erro = (r && r.erro) || "falha"; ctx.atualizar(["bloco", "conteudo"]); return null; }
      lido.dados = r.dados; lido.erro = "";
      iniciarSincronia(ctx, cid);
      ctx.atualizar(["bloco", "conteudo"]);
      return lido.dados;
    }, function () { lido.carregando = null; lido.dados = null; lido.erro = "sem_conexao"; return null; });
    return lido.carregando;
  }
  function iniciarSincronia(ctx, cid) {
    if (lido.sincronia || !global.RAMASincronia || !global.RAMAApi.sincronizarCampanha) return;
    lido.sincronia = global.RAMASincronia.criar({
      consultar: function () { return global.RAMAApi.sincronizarCampanha(cid); },
      chave: "sinc:" + cid,
      intervalo: function () { return global.RAMASincronia.INTERVALO_ATIVO; },
      visivel: function () { return typeof document === "undefined" || document.visibilityState !== "hidden"; },
      aoMudar: function (partes) {
        if (partes.indexOf("ordem2") >= 0 || partes.indexOf("personagens") >= 0) {
          if (!lido.ocupado) carregar(ctx, true);
          if (partes.indexOf("personagens") >= 0 && global.RAMAFichaPainel && global.RAMAFichaPainel.recarregarSeLivre) global.RAMAFichaPainel.recarregarSeLivre();
        }
      },
    });
    lido.sincronia.iniciar();
  }
  function pararSincronia() { if (lido.sincronia) { lido.sincronia.parar(); lido.sincronia = null; } }

  /* "campanha" (a mesa do servidor), "carregando", "outra" (campanha de
     outro sistema ou sem acesso: vale o local) ou "local". */
  function modo(ctx) {
    var cid = campanhaDe(ctx);
    if (!cid) return "local";
    if (!lido.tentado || lido.campanhaId !== cid) { carregar(ctx); return "carregando"; }
    if (lido.carregando && !lido.dados) return "carregando";
    if (lido.dados && lido.campanhaId === cid) return "campanha";
    return "outra";
  }
  function estadoDaMesa(ctx) {
    var m = modo(ctx);
    if (m === "campanha") return lido.dados.estado || lido.dados.vista;
    if (m === "carregando") return null;
    return localDe(ctx);
  }
  function ehMestre(ctx) { return modo(ctx) === "campanha" && !!lido.dados.mestre; }
  function dadosDaCampanha() { return lido.dados; }
  function localDe(ctx) {
    var b = ctx.ficha.ordem2;
    if (!b.local) b.local = ME().local(b.ambientacao);
    return b.local;
  }
  function pid(ctx) { return String(ctx.personagemId || "eu"); }
  function papelLocal(ctx) { return { mestre: true, pode: [pid(ctx)] }; }

  /* O teste de uma ficha (no estado certo). */
  function teste(ctx, testeId) {
    var e = estadoDaMesa(ctx);
    return e ? (e.testes || []).filter(function (t) { return t.id === testeId; })[0] || null : null;
  }

  /* A ÚNICA porta de uma ação da ficha. */
  function operar(ctx, op, opcoes) {
    var o = opcoes || {};
    var m = modo(ctx);
    if (m === "carregando") { UI().avisoAtencao("A mesa ainda está carregando."); return Promise.resolve({ ok: false }); }
    if (!ctx.podeEditar() && !ehMestre(ctx)) { UI().avisoAtencao("Esta ficha está em modo de leitura."); return Promise.resolve({ ok: false }); }
    var pedido = Object.assign({}, op);
    if (pedido.quem === undefined && ME().OPS_DO_PERSONAGEM.indexOf(op.tipo) >= 0) pedido.quem = pid(ctx);
    if (m !== "campanha") {
      var e = localDe(ctx);
      var fichas = {}; fichas[pid(ctx)] = { nome: ctx.ficha.nome || "Personagem", bloco: ctx.ficha.ordem2 };
      var r = ME().aplicar(e, fichas, pedido, papelLocal(ctx), rolador, { local: ctx.ficha.ordem2.estado.missaoLocal });
      if (!r.ok) { if (r.motivo) UI().avisoAtencao(r.motivo); return Promise.resolve(r); }
      ctx.ficha.ordem2.local = ME().normalizar(e);
      ctx.alterou();
      if (!o.silencioso) narrar(r.eventos);
      ctx.atualizar(["bloco", "conteudo"]);
      return Promise.resolve(depois(ctx, r));
    }
    if (lido.ocupado) return Promise.resolve({ ok: false, ocupado: true });
    lido.ocupado = true;
    var id = novaOperacao();
    var antes = global.RAMAFichaPainel && global.RAMAFichaPainel.salvarAgora ? global.RAMAFichaPainel.salvarAgora() : Promise.resolve();
    return Promise.resolve(antes).then(function () { return global.RAMAApi.ordem2Operar(lido.campanhaId, id, pedido); }).then(function (r) {
      lido.ocupado = false;
      if (!r.ok) {
        if (r.motivo) UI().avisoAtencao(r.motivo); else UI().avisoDeFalha(r, "ação na mesa de Ordem II");
        if (r.dados) { lido.dados = r.dados; ctx.atualizar(["bloco", "conteudo"]); }
        return r;
      }
      lido.dados = r.dados;
      if (!o.silencioso && r.resultado) narrar(r.resultado.eventos);
      if (global.RAMAFichaPainel && global.RAMAFichaPainel.recarregarSeLivre) global.RAMAFichaPainel.recarregarSeLivre();
      ctx.atualizar(["bloco", "conteudo"]);
      return depois(ctx, Object.assign({ ok: true }, r.resultado || {}));
    }, function (erro) { lido.ocupado = false; UI().avisoErro("Falha de conexão: tente de novo (a ação não é aplicada duas vezes)."); return { ok: false, erro: erro }; });
  }
  /* Um teste que espera escolhas abre o diálogo pós-rolagem. */
  function depois(ctx, r) {
    var res = r.resultado || {};
    if (res.aguardando && res.teste) setTimeout(function () { abrirPosRolagem(ctx, res.teste, res.opcoes); }, 0);
    else if (res.final && res.teste) mostrarFinal(ctx, res.teste);
    return r;
  }
  function narrar(eventos) {
    var frases = (eventos || []).map(function (e) { return typeof e === "string" ? e : e && e.texto; }).filter(Boolean);
    if (!frases.length) return;
    var grave = frases.some(function (f) { return /CRÍTIC|morre|Morte|colapso|lesão|trauma/i.test(f); });
    UI().aviso(frases.slice(-4).join(" · "), { tipo: grave ? "atencao" : "info", duracao: grave ? 9000 : 6000 });
  }
  function mostrarFinal(ctx, testeId) {
    var t = teste(ctx, testeId);
    if (!t) return;
    UI().modal({ titulo: t.montagem.rotulo, classe: "o2-janela", fundoFecha: true, conteudo: [resultado(t.resultado, {})], botoes: [{ rotulo: "Fechar", classe: "r-botao--principal" }] });
  }

  /* ---------------------------------------------------------------
     O DIÁLOGO DE TESTE
     --------------------------------------------------------------- */
  /* `o`: { pericia (id), atributo, dt, rotulo, tipo, contexto, arma,
     alcance, extra (campos do op), titulo }. */
  function abrirTeste(ctx, o) {
    o = o || {};
    var b = ctx.ficha.ordem2;
    var per = o.pericia ? R().pericia(b, o.pericia) : null;
    var st = {
      atributo: o.atributo || (per ? R().atributoBase(b, per.chave) : "fisico"),
      pericia: per ? per.id : "",
      dt: o.dt === undefined ? 7 : o.dt,
      passos: 0, alvoPasso: "pericia", modificador: 0,
      usar: { impeto: null, focoMental: false, sorrateiro: false, linhaDeTiro: false, reservas: [], grupo: [], pavor: { controlar: 0, abracar: false } },
      bonus: [], aguardar: false,
    };
    var previa = el("div.o2-teste__previa", { role: "status", "aria-live": "polite" });
    var corpo = el("div.pilha.o2-teste");
    var campanha = modo(ctx) === "campanha";
    var mesa = estadoDaMesa(ctx);

    function pedido() {
      var p = { atributo: st.atributo, pericia: st.pericia, dt: st.dt === "" || st.dt === null ? null : U.inteiro(st.dt, 7), tipo: o.tipo || (st.dt === "" || st.dt === null ? "oposto" : "simples"), rotulo: o.rotulo, modificador: U.inteiro(st.modificador, 0), usar: st.usar, passos: st.passos ? [{ alvo: st.alvoPasso, n: st.passos, fonte: "Mestre / situação" }] : [], bonus: st.bonus.slice(), alvoDosPassos: st.alvoPasso, arma: o.arma, alcance: o.alcance, examinar: o.examinar };
      return p;
    }
    function atualizarPrevia() {
      var m = MO().montar(b, pedido(), {});
      if (!m.ok) { U.trocar(previa, [el("p.o2-motivo", { texto: m.motivo })]); return m; }
      var mt = m.montagem;
      U.trocar(previa, [
        el("div.o2-teste__dados", {}, mt.dados.map(function (d) { return el("span.o2-teste__dado", {}, [dado(d.faces, { rotulo: d.fonte + " d" + d.faces }), el("span.t-mini", { texto: d.fonte })]); }).concat(mt.pavor ? [el("span.o2-teste__dado", {}, [dado(mt.pavor, { estado: "pavor", rotulo: "Pavor d" + mt.pavor }), el("span.t-mini", { texto: "Pavor (separado)" })])] : [])),
        el("p.t-mini", { texto: mt.dados.length + " dado(s) de teste (máximo 4; somam até 3)" + (mt.dt !== null ? " · DT " + mt.dt : " · teste oposto") + (mt.modificador ? " · modificador " + (mt.modificador > 0 ? "+" : "") + mt.modificador + (mt.fontesModificador.length ? " (" + mt.fontesModificador.join(", ") + ")" : "") : "") + (mt.custos.pd ? " · custa " + mt.custos.pd + " PD" : "") }),
        mt.fontes.length ? el("ul.o2-teste__fontes", {}, mt.fontes.map(function (f) { return el("li.t-mini", { texto: f.texto || ((f.n > 0 ? "+" : "") + f.n + " passo(s) no dado de " + (f.alvo === "atributo" ? "atributo" : "perícia") + ": " + f.fonte) }); })) : null,
        mt.atributoTrocado ? el("p.t-mini", { texto: "Atributo trocado (o Mestre julga a abordagem): " + K().ATRIBUTOS[mt.atributo].nome + " no lugar de " + K().ATRIBUTOS[mt.atributoBase].nome + "." }) : null,
      ]);
      return m;
    }
    function caixa(rotulo, marcado, aoMudar, extra) { return el("label.r-marca", {}, [el("input", { type: "checkbox", checked: !!marcado, onchange: function (ev) { aoMudar(ev.currentTarget.checked); atualizarPrevia(); } }), el("span", { texto: rotulo }), extra || null]); }

    function desenhar() {
      var habs = [];
      var hi = R().habilidadesDoTipo(b, "impeto")[0];
      if (hi) {
        var mi = R().motorDe(hi);
        var opcoesDado = mi.opcoes.map(function (op, i) { return { op: op, i: i }; }).filter(function (x) { return x.op.efeito === "dado"; });
        habs.push(UI().campo({ rotulo: "Ímpeto (" + hi.estado.espacos + "/" + mi.espacos + " espaços)", tipo: "selecao", valor: st.usar.impeto === null ? "" : String(st.usar.impeto), opcoes: [{ valor: "", rotulo: "Não usar" }].concat(opcoesDado.map(function (x) { return { valor: String(x.i), rotulo: "+d" + x.op.faces + " (" + x.op.custo + " espaço" + (x.op.custo > 1 ? "s" : "") + ")" }; })), aoMudar: function (v) { st.usar.impeto = v === "" ? null : Number(v); atualizarPrevia(); } }));
      }
      R().habilidadesDoTipo(b, "dadoPorPd").forEach(function (h) {
        var m = R().motorDe(h);
        if (m.atributo) habs.push(caixa(h.nome + ": +d" + m.faces + " por " + m.pd + " PD (teste mental)", st.usar.focoMental, function (v) { st.usar.focoMental = v; }));
        else habs.push(caixa(h.nome + ": +d" + m.faces + " por " + m.pd + " PD (" + m.pericias.join("/") + ")", st.usar.sorrateiro, function (v) { st.usar.sorrateiro = v; }));
      });
      R().habilidadesDoTipo(b, "dadoEmAtaque").forEach(function (h) { var m = R().motorDe(h); habs.push(caixa(h.nome + ": +d" + m.faces + " por " + m.pd + " PD (arma de fogo)", st.usar.linhaDeTiro, function (v) { st.usar.linhaDeTiro = v; })); });
      var reservas = (b.estado.reservas || []).map(function (r) { return { id: r.id, faces: r.faces, rotulo: r.fonte + (r.alvo ? " — " + r.alvo : "") }; });
      R().habilidadesDoTipo(b, "avaliacao").forEach(function (h) { h.estado.reserva.forEach(function (r) { reservas.push({ id: r.id, faces: r.faces, rotulo: h.nome + " — " + r.alvo }); }); });
      reservas.forEach(function (r) { habs.push(caixa("+d" + r.faces + " · " + r.rotulo, st.usar.reservas.indexOf(r.id) >= 0, function (v) { st.usar.reservas = st.usar.reservas.filter(function (x) { return x !== r.id; }); if (v) st.usar.reservas.push(r.id); })); });
      (mesa && mesa.reservasGrupo || []).forEach(function (r) { habs.push(caixa("+d" + r.faces + " · " + r.fonte + " (do grupo)", st.usar.grupo.indexOf(r.id) >= 0, function (v) { st.usar.grupo = st.usar.grupo.filter(function (x) { return x !== r.id; }); if (v) st.usar.grupo.push(r.id); })); });
      var pavor = b.estado.pavor ? [
        UI().campo({ rotulo: "Controlar o pavor (1 PD por passo; piso d4)", tipo: "selecao", valor: String(st.usar.pavor.controlar), opcoes: [0, 1, 2, 3].map(function (n) { return { valor: String(n), rotulo: n ? "−" + n + " passo(s), " + n + " PD" : "Não" }; }), aoMudar: function (v) { st.usar.pavor.controlar = Number(v); atualizarPrevia(); } }),
        caixa("Abraçar o pavor: vira dado bônus só neste teste (5 PD)", st.usar.pavor.abracar, function (v) { st.usar.pavor.abracar = v; }),
      ] : [];
      var pericias = b.base.pericias.map(function (p) { return { valor: p.id, rotulo: R().nomeDaPericia(b, p) + " (d" + R().dadoDaPericia(b, p) + ")" }; });
      U.trocar(corpo, [
        el("div.o2-teste__campos", {}, [
          UI().campo({ rotulo: "Perícia", tipo: "selecao", valor: st.pericia, opcoes: [{ valor: "", rotulo: "— só o atributo —" }].concat(pericias), aoMudar: function (v) { st.pericia = v; var p = R().pericia(b, v); if (p) st.atributo = R().atributoBase(b, p.chave); desenhar(); } }),
          UI().campo({ rotulo: "Atributo", tipo: "selecao", valor: st.atributo, opcoes: K().ORDEM_ATRIBUTOS.map(function (k) { return { valor: k, rotulo: K().ATRIBUTOS[k].nome + " (d" + R().dadoDoAtributo(b, k) + ")" }; }), ajuda: "O Mestre pode trocar o atributo quando a abordagem justificar.", aoMudar: function (v) { st.atributo = v; atualizarPrevia(); } }),
          UI().campo({ rotulo: "DT (vazio = teste oposto)", tipo: "numero", valor: st.dt === null ? "" : String(st.dt), aoDigitar: true, aoMudar: function (v) { st.dt = String(v).trim() === "" ? null : U.inteiro(v, 7); atualizarPrevia(); } }),
        ]),
        el("div.o2-teste__campos", {}, [
          UI().campo({ rotulo: "Passos (situação, ajuda)", tipo: "selecao", valor: String(st.passos), opcoes: [-3, -2, -1, 0, 1, 2, 3].map(function (n) { return { valor: String(n), rotulo: n > 0 ? "+" + n : String(n) }; }), aoMudar: function (v) { st.passos = Number(v); atualizarPrevia(); } }),
          UI().campo({ rotulo: "Passos sem alvo vão para", tipo: "selecao", valor: st.alvoPasso, opcoes: [{ valor: "pericia", rotulo: "o dado de perícia" }, { valor: "atributo", rotulo: "o dado de atributo" }], ajuda: "Quando o efeito não diz que dado recebe o passo, o Mestre confirma.", aoMudar: function (v) { st.alvoPasso = v; atualizarPrevia(); } }),
          UI().campo({ rotulo: "Modificador numérico", tipo: "numero", valor: String(st.modificador), aoDigitar: true, aoMudar: function (v) { st.modificador = U.inteiro(v, 0); atualizarPrevia(); } }),
        ]),
        habs.length ? el("fieldset.o2-teste__habs", {}, [el("legend", { texto: "Antes de rolar" })].concat(habs)) : null,
        pavor.length ? el("fieldset.o2-teste__habs", {}, [el("legend", { texto: "Pavor d" + b.estado.pavor })].concat(pavor)) : null,
        campanha ? caixa("Esperar reações de aliados (Prontidão de outro ser em alcance curto)", st.aguardar, function (v) { st.aguardar = v; }) : null,
        previa,
      ]);
      atualizarPrevia();
    }
    desenhar();
    return UI().modal({
      titulo: o.titulo || "Teste" + (per ? " de " + R().nomeDaPericia(b, per) : ""), classe: "o2-janela", largo: true, conteudo: [corpo],
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Rolar", classe: "r-botao--principal", aoClicar: function (fechar) {
          var m = atualizarPrevia();
          if (!m.ok) return;
          fechar();
          return operar(ctx, Object.assign({ tipo: "teste", pedido: pedido(), contexto: o.contexto || {}, aguardar: st.aguardar }, o.extra || {}));
        } },
      ],
    });
  }

  /* ---------------------------------------------------------------
     AS ESCOLHAS PÓS-ROLAGEM
     --------------------------------------------------------------- */
  function abrirPosRolagem(ctx, testeId, opcoesIniciais) {
    var t = teste(ctx, testeId);
    if (!t) return;
    var b = ctx.ficha.ordem2;
    var st = { ajustes: [], soma: [], mentoria: null };
    var corpo = el("div.pilha.o2-pos");
    var janela;
    function marcadores() { var n = 0; R().habilidadesDoTipo(b, "analise").forEach(function (h) { n += h.estado.marcadores; }); return n - st.ajustes.length; }
    function previa() {
      var t2 = teste(ctx, testeId) || t;
      var pos = { ajustes: (t2.pos.ajustes || []).concat(st.ajustes), trocas: (t2.pos.trocas || []).concat(st.mentoria ? [st.mentoria] : []), soma: st.soma.length ? st.soma : t2.pos.soma };
      return MO().resolver(t2.montagem, t2.rolagem, pos);
    }
    function desenhar() {
      var t2 = teste(ctx, testeId) || t;
      var ops = opcoesIniciais || {};
      var res = previa();
      var linhas = res.dados.map(function (d, i) {
        var acoes = [];
        if (marcadores() > 0) {
          acoes.push(botao("−1", function () { st.ajustes.push({ indice: i, delta: -1 }); desenhar(); }, { rotulo: "Análise: −1 no dado " + (i + 1), motivo: d.valor <= 1 ? "Já está no mínimo." : "" }));
          acoes.push(botao("+1", function () { st.ajustes.push({ indice: i, delta: 1 }); desenhar(); }, { rotulo: "Análise: +1 no dado " + (i + 1), motivo: d.valor >= d.faces ? "Já está no máximo do dado." : "" }));
        }
        (ops.prontidao || []).forEach(function (p) {
          acoes.push(botao("Prontidão" + (p.proprio ? "" : " de " + p.nome) + " (" + p.pd + " PD)", function () { rerrolar(i, { fonte: "prontidao", por: p.por, alcanceCurto: true }); }, { motivo: d.valor === 1 ? "Não rola de novo um dado que deu 1." : "" }));
        });
        if (ops.olhar) acoes.push(botao("Olhar Infalível (" + ops.olhar.pd + " PD)", function () { rerrolar(i, { fonte: "olhar" }); }));
        if (ops.mentoria && !st.mentoria) acoes.push(botao("Trocar por " + ops.mentoria.valor + " (Mentoria)", function () { st.mentoria = { indice: i, valor: ops.mentoria.valor, fonte: "Mentoria de " + ops.mentoria.nome }; desenhar(); }));
        if (ops.escolherSoma && !d.anulado) acoes.push(el("label.r-marca", {}, [el("input", { type: "checkbox", checked: d.somado, onchange: function (ev) { var atuais = res.dados.map(function (x, k) { return x.somado ? k : -1; }).filter(function (k) { return k >= 0; }); var nova = ev.currentTarget.checked ? atuais.concat([i]) : atuais.filter(function (k) { return k !== i; }); if (nova.length > 3) { UI().avisoAtencao("Somam no máximo três."); ev.currentTarget.checked = false; return; } st.soma = nova; desenhar(); } }), el("span", { texto: "somar" })]));
        return el("li.o2-pos__linha", {}, [dado(d.faces, { valor: d.valor, estado: d.anulado ? "anulado" : !d.somado ? "fora" : null, marca: d.anulado ? "∅" : "" }), el("span.o2-pos__fonte", { texto: d.fonte + " (d" + d.faces + ")" }), el("span.faixa", {}, acoes)]);
      });
      U.trocar(corpo, [
        el("p.t-mini", { texto: "O teste ainda não valeu: escolha o que usar e confirme. Nada é aplicado antes de confirmar." }),
        marcadores() > 0 || st.ajustes.length ? el("p.t-mini", { texto: "Análise: " + marcadores() + " marcador(es) livre(s) (+1 ou −1 por marcador, dentro das faces)." }) : null,
        el("ol.o2-pos__dados", {}, linhas),
        resultado(res, { titulo: "Prévia" }),
      ]);
    }
    function rerrolar(indice, rr) {
      enviarPendentes().then(function () {
        return operar(ctx, { tipo: "resolverTeste", testeId: testeId, rerrolar: Object.assign({ indice: indice }, rr) }, { silencioso: false });
      }).then(function (r) { if (r && r.ok) { opcoesIniciais = (r.resultado && r.resultado.opcoes) || opcoesIniciais; desenhar(); } });
    }
    /* Ajustes e Mentoria acumulados vão junto da próxima chamada. */
    function enviarPendentes() {
      if (!st.ajustes.length && !st.mentoria) return Promise.resolve();
      var op = { tipo: "resolverTeste", testeId: testeId, ajustes: st.ajustes, mentoria: st.mentoria ? { indice: st.mentoria.indice } : null };
      st.ajustes = []; st.mentoria = null;
      return operar(ctx, op, { silencioso: true });
    }
    desenhar();
    janela = UI().modal({
      titulo: t.montagem.rotulo + " — escolhas pós-rolagem", classe: "o2-janela", largo: true, conteudo: [corpo],
      botoes: [
        { rotulo: "Depois", classe: "r-botao--fantasma" },
        { rotulo: "Confirmar o resultado", classe: "r-botao--principal", aoClicar: function (fechar) {
          var op = { tipo: "resolverTeste", testeId: testeId, ajustes: st.ajustes, soma: st.soma.length ? st.soma : undefined, mentoria: st.mentoria ? { indice: st.mentoria.indice } : null, confirmar: true };
          fechar();
          return operar(ctx, op);
        } },
      ],
    });
    return janela;
  }

  /* Testes desta ficha aguardando escolhas (para reabrir). */
  function aguardando(ctx) {
    var e = estadoDaMesa(ctx);
    if (!e) return [];
    return (e.testes || []).filter(function (t) { return t.quem === pid(ctx) && t.estado === "aguardando"; });
  }

  global.RAMAOrdem2Tela = {
    botao: botao, motivo: motivo, fonte: fonte, dado: dado, nomeDado: nomeDado, resultado: resultado, rolador: rolador, novaOperacao: novaOperacao, narrar: narrar,
    abrirTeste: abrirTeste, abrirPosRolagem: abrirPosRolagem,
  };
  global.RAMAOrdem2Jogo = {
    carregar: carregar, modo: modo, estado: estadoDaMesa, ehMestre: ehMestre, dados: dadosDaCampanha, operar: operar, teste: teste, aguardando: aguardando,
    pid: pid, erro: function () { return lido.erro; }, parar: pararSincronia,
  };
})(window);
