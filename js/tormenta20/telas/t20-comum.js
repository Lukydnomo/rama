/* =====================================================================
   R.A.M.A. — Tormenta20 · peças comuns das telas (v8.0)
   ---------------------------------------------------------------------
     operar(ctx, fn)          o ÚNICO caminho de uma ação até a ficha:
                              uma operação com id, aplicada uma vez
     rolar(expr)              o dado do site (RAMADados)
     teste(...)               1d20 + modificador, com as parcelas, no
                              cartão de rolagem e no histórico
     ataque(...)              ataque contra uma Defesa e o dano, com o
                              crítico multiplicando só os dados da arma
     valor(...)               um número que abre as parcelas ao tocar
     mesa da ficha            numa campanha: ler a mesa e operar nela
                              (o servidor rola, aplica e registra)
   Nenhuma regra mora aqui: tudo vem do motor (js/tormenta20/regras.js).
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el;
  function R() { return global.RAMATormenta20; }
  function D() { return global.RAMATormenta20Dados; }
  function UI() { return global.RAMAUI; }

  var REF = "Tormenta20 — Jogo do Ano";
  function referencia(p) { return REF + (p ? ", p. " + p : ""); }
  function fonte(p, texto) { return el("span.t20-fonte", { texto: (texto ? texto + " · " : "") + "p. " + p, title: referencia(p) }); }
  function sinal(n) { n = Number(n) || 0; return (n >= 0 ? "+" : "−") + Math.abs(n); }
  function nomeAtr(k) { var a = D().ATRIBUTOS.filter(function (x) { return x.chave === k; })[0]; return a ? a.nome : k; }
  function siglaAtr(k) { return { "for": "For", des: "Des", con: "Con", "int": "Int", sab: "Sab", car: "Car" }[k] || k; }
  function botao(texto, aoClicar, opcoes) {
    var o = opcoes || {};
    return el("button.r-botao.r-botao--mini" + (o.classe ? "." + o.classe : ""), { type: "button", texto: texto, disabled: !!o.motivo, title: o.motivo || o.dica || "", "aria-label": o.rotulo || null, onclick: aoClicar });
  }
  function novaOperacao() { return global.RAMAApi && global.RAMAApi.novaOperacao ? global.RAMAApi.novaOperacao() : "op-" + U.uuid(); }

  /* O dado do site. rolar("1d20") → número. */
  function rolar(expr) {
    var m = /^1d(\d+)$/.exec(String(expr));
    var faces = m ? Number(m[1]) : 20;
    var r = global.RAMADados ? global.RAMADados.rolar("1d" + faces) : null;
    return r && r.ok ? r.rolagens[0] : 1 + Math.floor(Math.random() * faces);
  }

  /* fn(bloco) → { ok, motivo?, ... }; uma vez por id; recursos
     acompanham o máximo; a ficha marca alterada e se redesenha. */
  function operar(ctx, fn, opcoes) {
    var op = opcoes || {};
    if (!ctx.podeEditar()) { UI().avisoAtencao("Esta ficha está em modo de leitura."); return { ok: false }; }
    var b = ctx.ficha.tormenta20;
    var r = R().aplicarOperacao(b, op.opId || novaOperacao(), fn);
    if (r && r.ok === false) { var m = r.motivo || (r.erros || []).join(" "); if (m) UI().avisoAtencao(m); return r; }
    try { R().sincronizarRecursos(b); } catch (e) { /* o cálculo mostra */ }
    ctx.alterou();
    ctx.atualizar(op.regioes || ["bloco", "conteudo"]);
    return r || { ok: true };
  }

  /* -------------------------------------------- rolagens no cartão */
  function parcelasDeTexto(parcelas) {
    return (parcelas || []).filter(function (p) { return p && !p.situacional && p.valor !== 0 && p.valor !== undefined; }).map(function (p) { return { rotulo: p.rotulo, valor: typeof p.valor === "number" ? p.valor : String(p.valor) }; });
  }
  function mostrar(nome, res, extra) {
    if (!global.RAMARolagens) return;
    global.RAMARolagens.mostrar(Object.assign({ tipo: "tormenta20" }, res), Object.assign({ nome: nome }, extra || {}));
  }
  /* Teste de 1d20 + modificador (p. 220): 20 natural sempre passa, 1
     natural sempre falha quando há CD. */
  function teste(nome, modificador, parcelas, opcoes) {
    var op = opcoes || {};
    var t = R().teste(rolar, modificador, op.cd === undefined || op.cd === "" ? null : Number(op.cd), { bonus: op.bonus, vantagem: op.vantagem });
    var marcas = [];
    if (t.natural20) marcas.push("20 natural");
    if (t.natural1) marcas.push("1 natural");
    if (t.cd !== undefined) marcas.push(t.sucesso ? "sucesso" : "falha");
    mostrar(nome + (t.cd !== undefined ? " (CD " + t.cd + ")" : ""), {
      expressao: (op.vantagem ? "2d20" : "1d20") + sinal(t.modificador), rolagens: t.rolagens, natural: t.d20, selecao: op.vantagem ? "maior" : null,
      total: t.total, parcelas: parcelasDeTexto(parcelas).concat(op.bonus ? [{ rotulo: "Bônus do momento", valor: op.bonus }] : []), marcas: marcas, critico: t.natural20,
    });
    return t;
  }
  /* Mostra um teste já rolado pelo motor (engenhocas, fabricação). */
  function mostrarTeste(nome, t, parcelas) {
    var marcas = [];
    if (t.natural20) marcas.push("20 natural");
    if (t.natural1) marcas.push("1 natural");
    if (t.cd !== undefined) marcas.push(t.sucesso ? "sucesso" : "falha");
    mostrar(nome + (t.cd !== undefined ? " (CD " + t.cd + ")" : ""), { expressao: "1d20" + sinal(t.modificador), rolagens: t.rolagens, natural: t.d20, total: t.total, parcelas: parcelasDeTexto(parcelas), marcas: marcas, critico: t.natural20 });
    return t;
  }
  /* Ataque (p. 231): compara com a Defesa, depois o crítico; o dano
     sai num segundo cartão com dados da arma, fixos e extras. */
  function ataque(nome, atq, defesa, opcoes) {
    var op = opcoes || {};
    var r = R().rolarAtaque(rolar, atq, defesa === undefined || defesa === "" || defesa === null ? -999 : Number(defesa), { bonusAtaque: op.bonusAtaque, bonusDano: op.bonusDano, extras: op.extras, imuneCritico: op.imuneCritico });
    var semDefesa = defesa === undefined || defesa === "" || defesa === null;
    var marcas = [];
    if (r.teste.d20 >= atq.margem) marcas.push("ameaça de crítico");
    if (!semDefesa) marcas.push(r.acertou ? (r.critico ? "crítico" : "acertou") : "errou");
    mostrar(nome + (semDefesa ? "" : " contra Defesa " + defesa), { expressao: "1d20" + sinal(atq.ataque + (Number(op.bonusAtaque) || 0)), rolagens: r.teste.rolagens, natural: r.teste.d20, total: r.teste.total, parcelas: parcelasDeTexto(atq.parcelasAtaque), marcas: marcas, critico: r.critico });
    var dano = r.dano;
    if (semDefesa && !dano) {
      /* Sem Defesa informada, o dano sai como se acertasse; crítico se
         o dado alcançou a margem. */
      var rr = R().rolarAtaque(function (x) { return x === "1d20" ? r.teste.d20 : rolar(x); }, Object.assign({}, atq, {}), -999, { bonusDano: op.bonusDano, extras: op.extras });
      dano = rr.dano; r.critico = rr.critico;
    }
    if (dano) {
      var partes = [{ rotulo: "Dados da arma" + (dano.multiplicador > 1 ? " ×" + dano.multiplicador + " (crítico)" : ""), valor: dano.arma }, { rotulo: "Fixos (não multiplicam)", valor: dano.fixo }].concat(dano.extras.map(function (e) { return { rotulo: (e.rotulo || "Extra") + (e.tipo ? " (" + e.tipo + ")" : ""), valor: e.total }; }));
      mostrar(nome + " · dano", { tipo: "dano", expressao: atq.dano + (dano.multiplicador > 1 ? " ×" + dano.multiplicador : "") + sinal(atq.danoFixo + (Number(op.bonusDano) || 0)), rolagens: dano.dadosArma, total: dano.total, parcelas: partes, marcas: r.critico ? ["crítico"] : [] });
    }
    return { resultado: r, dano: dano };
  }
  function rolarExpressao(nome, expr, tipo) {
    var r = R().rolarExpressao(rolar, expr);
    mostrar(nome, { tipo: tipo || "dano", expressao: expr, rolagens: [], total: r.total, parcelas: [{ rotulo: r.detalhe, valor: r.total }] });
    return r;
  }

  /* ------------------------------------- número com as parcelas */
  /* Um valor que, ao ser tocado, mostra de onde veio cada parcela (o
     detalhe é um <details>, acessível por teclado). */
  function valor(rotulo, total, parcelas, opcoes) {
    var op = opcoes || {};
    var lista = (parcelas || []).map(function (p) {
      var v = typeof p.valor === "number" ? sinal(p.valor) : String(p.valor);
      return el("li" + (p.situacional ? ".t20-parcela--situacional" : ""), {}, [el("span", { texto: p.rotulo + (p.situacional ? " (quando valer)" : "") }), el("span.t20-parcela__valor", { texto: v })]);
    });
    return el("details.t20-valor" + (op.classe ? "." + op.classe : ""), {}, [
      el("summary", { "aria-label": rotulo + ": " + total + ". Abrir as parcelas." }, [el("span.t20-valor__rotulo", { texto: rotulo }), el("span.t20-valor__total", { texto: String(op.formato ? op.formato(total) : total) })]),
      lista.length ? el("ul.t20-parcelas", {}, lista) : el("p.t-mini", { texto: "Sem parcelas." }),
    ]);
  }
  /* O número que rola: o valor é o botão (clicar rola ou abre a ação) e
     as parcelas abrem num balão ao lado, sem empurrar a tela. */
  function rolavel(rotulo, total, parcelas, aoClicar, opcoes) {
    var op = opcoes || {};
    var lista = (parcelas || []).filter(function (p) { return p && p.valor !== 0 && p.valor !== undefined && p.valor !== ""; }).map(function (p) {
      var v = typeof p.valor === "number" ? sinal(p.valor) : String(p.valor);
      return el("li" + (p.situacional ? ".t20-parcela--situacional" : ""), {}, [el("span", { texto: p.rotulo + (p.situacional ? " (quando valer)" : "") }), el("span.t20-parcela__valor", { texto: v })]);
    });
    var texto = String(op.formato ? op.formato(total) : total);
    return el("span.t20-rol" + (op.classe ? "." + op.classe : ""), {}, [
      el("button.t20-rol__valor", { type: "button", texto: texto, disabled: !!op.desabilitado, title: op.dica || "", "aria-label": (op.acao || "Rolar") + " " + rotulo + " (" + texto + ")", onclick: aoClicar }),
      lista.length ? el("details.t20-rol__det", {}, [
        el("summary", { "aria-label": "Ver as parcelas de " + rotulo, title: "De onde vem" }, [el("span", { "aria-hidden": "true", texto: "i" })]),
        el("ul.t20-parcelas", {}, lista),
      ]) : null,
    ]);
  }
  /* Painel com a faixa de título, como os quadros da ficha oficial. */
  var contadorSecao = 0;
  function secao(titulo, conteudo, opcoes) {
    var op = opcoes || {};
    var id = "t20-secao-" + (++contadorSecao);
    return el("section.t20-painel" + (op.classe ? "." + op.classe : ""), { "aria-labelledby": id }, [
      el("header.t20-painel__topo", {}, [el("h3.t20-painel__titulo", { id: id, texto: titulo }), op.info ? el("span.t20-painel__info", { texto: op.info }) : null, op.acoes ? el("span.t20-painel__acoes", {}, [].concat(op.acoes).filter(Boolean)) : null]),
      el("div.t20-painel__corpo", {}, [].concat(conteudo).filter(Boolean)),
    ]);
  }
  function etiqueta(texto, aviso) { return el("span.r-etiqueta" + (aviso ? ".r-etiqueta--aviso" : ""), { texto: texto }); }
  function selecao(rotulo, opcoes, valorAtual, aoMudar, extra) { return UI().campo(Object.assign({ rotulo: rotulo, tipo: "selecao", valor: valorAtual, opcoes: opcoes, aoMudar: aoMudar }, extra || {})); }
  function numero(rotulo, v, extra) { return UI().campo(Object.assign({ rotulo: rotulo, tipo: "numero", valor: v === undefined || v === null ? "" : v }, extra || {})); }
  function lerNumero(campo, padrao) { var v = String(campo.entrada.value).trim().replace("−", "-"); if (v === "") return padrao; var n = Math.floor(Number(v)); return isFinite(n) ? n : padrao; }
  function painel(titulo, conteudo, acoes) { return UI().painel(titulo, conteudo, { acoes: acoes }); }

  /* Consulta rápida de uma regra com página. */
  function consulta(titulo, textoRegra, pagina) {
    return UI().modal({ titulo: titulo, fundoFecha: true, conteudo: [el("p.t-mini", { texto: referencia(pagina) }), el("p", { texto: textoRegra })] });
  }

  /* ------------------------------------------ a ficha numa campanha */
  var lido = { campanhaId: "", dados: null, erro: "", tentado: false, carregando: null };
  function campanhaDe(ctx) { return ctx && ctx.ficha && ctx.ficha.campanhaId ? String(ctx.ficha.campanhaId) : ""; }
  function carregar(ctx, forcar) {
    var cid = campanhaDe(ctx);
    if (!cid || !global.RAMAApi || !global.RAMAApi.lerTormenta20) return Promise.resolve(null);
    if (lido.carregando && lido.campanhaId === cid) return lido.carregando;
    if (!forcar && lido.tentado && lido.campanhaId === cid) return Promise.resolve(lido.dados);
    lido.campanhaId = cid; lido.tentado = true;
    lido.carregando = global.RAMAApi.lerTormenta20(cid, { segundoPlano: true }).then(function (r) {
      lido.carregando = null;
      if (!r || !r.ok) { lido.dados = null; lido.erro = (r && r.erro) || "falha"; return null; }
      lido.dados = r.dados; lido.erro = "";
      if (ctx.atualizar) ctx.atualizar(["bloco", "conteudo"]);
      return lido.dados;
    }, function () { lido.carregando = null; lido.dados = null; lido.erro = "sem_conexao"; return null; });
    return lido.carregando;
  }
  function naMesa(ctx) {
    var cid = campanhaDe(ctx);
    if (!cid) return false;
    if (!lido.tentado || lido.campanhaId !== cid) carregar(ctx);
    return !!(lido.dados && lido.campanhaId === cid);
  }
  function estadoDaMesa(ctx) { if (!naMesa(ctx)) return null; return lido.dados.estado || lido.dados.vista; }
  function alvosDaMesa(ctx) {
    var e = estadoDaMesa(ctx);
    if (!e || !e.combate) return [];
    return e.combate.participantes.filter(function (p) { return p.tipo !== "pc" && !p.derrotado; });
  }
  /* Ação que toca a mesa (e outra ficha): o servidor rola e aplica; a
     ficha salva o pendente antes e recarrega depois. */
  var naMesaEmAndamento = {};
  function operarNaMesa(ctx, operacao) {
    var cid = campanhaDe(ctx);
    if (!cid) return Promise.resolve({ ok: false });
    /* Um segundo clique antes da resposta não manda outra operação. */
    var chave = JSON.stringify(operacao);
    if (naMesaEmAndamento[chave]) return Promise.resolve({ ok: false, ocupado: true });
    naMesaEmAndamento[chave] = true;
    var soltar = function (r) { delete naMesaEmAndamento[chave]; return r; };
    var id = novaOperacao();
    var antes = global.RAMAFichaPainel && global.RAMAFichaPainel.salvarAgora ? global.RAMAFichaPainel.salvarAgora() : Promise.resolve();
    return Promise.resolve(antes).then(function () { return global.RAMAApi.tormenta20Operar(cid, id, Object.assign({ quem: ctx.personagemId }, operacao)); }).then(function (r) {
      if (!r.ok) { UI().avisoDeFalha(r, "ação na mesa"); return r; }
      carregar(ctx, true);
      if (global.RAMAFichaPainel && global.RAMAFichaPainel.recarregarSeLivre) global.RAMAFichaPainel.recarregarSeLivre();
      return r;
    }).then(soltar, function (e) { soltar(); throw e; });
  }

  global.RAMATormenta20Tela = {
    referencia: referencia, fonte: fonte, sinal: sinal, nomeAtr: nomeAtr, siglaAtr: siglaAtr, botao: botao, novaOperacao: novaOperacao,
    rolar: rolar, operar: operar, mostrar: mostrar, teste: teste, mostrarTeste: mostrarTeste, ataque: ataque, rolarExpressao: rolarExpressao,
    valor: valor, rolavel: rolavel, secao: secao, etiqueta: etiqueta, selecao: selecao, numero: numero, lerNumero: lerNumero, painel: painel, consulta: consulta,
  };
  global.RAMATormenta20MesaDaFicha = { carregar: carregar, naMesa: naMesa, estado: estadoDaMesa, alvos: alvosDaMesa, operar: operarNaMesa, dados: function () { return lido.dados; } };
})(window);
