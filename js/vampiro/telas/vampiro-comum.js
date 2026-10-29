/* =====================================================================
   R.A.M.A. — Vampiro · o que as telas compartilham (v5.0)
   ---------------------------------------------------------------------
   A tela não tem regra própria: toda conta, validação e efeito vem do
   motor (js/vampiro/*). Aqui ficam as peças que a ficha, a criação e a
   crônica usam:

     operar(ctx, fn)        o ÚNICO caminho de uma ação até a ficha: uma
                            operação com id (R.aplicarOperacao) — clique
                            repetido ou resposta perdida não aplicam duas
                            vezes
     narrar(eventos)        os eventos do motor em frases curtas
     pontos(...)            os pontinhos (●○), com rótulo para leitor
     trilha(...)            Vitalidade e Força de Vontade: "/" para
                            Superficial, "X" para Agravado — forma e
                            texto, nunca só cor
     fome(...)              os cinco níveis de Fome
     testar(ctx, pedido)    monta a parada, rola, mostra os dados de Fome
                            e espera a pessoa: rerrolar com Força de
                            Vontade, vencer a um custo, concluir
     resultado(ctx, r, op)  a janela da rolagem pendente
     tratar(ctx, eventos)   o que o motor deixou para a MESA decidir
                            (consequência bestial, frenesi pendente) —
                            nada é decidido sozinho

   A ficha numa crônica (RAMAVampiroMesaDaFicha): lê a vista dos
   jogadores (ler_vampiro) para saber a noite e a cena, e quem está na
   campanha. Tudo que toca OUTRA ficha vai por vampiro_operar e é
   conferido no servidor.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el;
  function C() { return global.RAMAVampiroCatalogo; }
  function DS() { return global.RAMAVampiroDisciplinas; }
  function D() { return global.RAMAVampiroDados; }
  function R() { return global.RAMAVampiro; }
  function P() { return global.RAMAVampiroPoderes; }
  function UI() { return global.RAMAUI; }

  function nomeDe(mapa, chave) { return mapa && mapa[chave] ? mapa[chave].nome : chave || "—"; }
  function nomeAtr(k) { return (C().atributo(k) || {}).nome || k; }
  function nomeHab(k) { return (C().habilidade(k) || {}).nome || k; }
  function nomeDisc(k) { return nomeDe(DS().DISCIPLINAS, k); }
  function trilhaNome(t) { return t === "forcaDeVontade" ? "Força de Vontade" : "Vitalidade"; }

  /* ---------------------------------------------------------------
     EVENTOS → FRASES
     --------------------------------------------------------------- */

  var FRASES = {
    checagem: function (e) { return "Checagem de Sangue" + (e.motivo ? " (" + e.motivo + ")" : "") + ": " + (e.faces || []).join(" e ") + " — " + (e.sucesso ? "sem custo" : "a Fome sobe"); },
    fome: function (e) { return e.de === e.para ? "" : "Fome " + e.de + " → " + e.para; },
    dano: function (e) { return trilhaNome(e.trilha) + ": " + [e.superficial ? e.superficial + " Superficial" : "", e.agravado ? e.agravado + " Agravado" : ""].filter(Boolean).join(" e ") + (e.convertidos ? " (" + e.convertidos + " convertido)" : ""); },
    debilitado: function (e) { return trilhaNome(e.trilha) + " toda marcada: Debilitado"; },
    cura: function (e) { return "Curou " + e.valor + " " + (e.dano === "agravado" ? "Agravado" : "Superficial") + " (" + trilhaNome(e.trilha) + ")"; },
    gastoDeFdV: function (e) { return "Gastou " + e.valor + " de Força de Vontade" + (e.motivo ? " (" + e.motivo + ")" : ""); },
    torpor: function (e) { return "Entrou em Torpor" + (e.duracao ? " (" + e.duracao + ")" : ""); },
    despertouDoTorpor: function () { return "Despertou do Torpor"; },
    morteFinal: function (e) { return "Morte Final: " + (e.causa || ""); },
    estacado: function () { return "Estacado"; },
    estacaRemovida: function () { return "A estaca foi removida"; },
    frenesiPendente: function (e) { return "Teste de frenesi (" + nomeDe(C().FRENESI, e.frenesi) + ", Dif. " + e.dificuldade + ") — " + (e.motivo || ""); },
    frenesi: function (e) { return "Frenesi de " + nomeDe(C().FRENESI, e.frenesi) + (e.curtindo ? " (Curtindo a Onda)" : ""); },
    frenesiResistido: function () { return "Resistiu ao frenesi"; },
    frenesiEncerrado: function () { return "O frenesi passou"; },
    compulsao: function (e) { return "Compulsão: " + (e.nome || e.chave) + (e.penalidade ? " (−" + e.penalidade + ")" : ""); },
    compulsaoEncerrada: function () { return "A Compulsão terminou"; },
    maculas: function (e) { return "Máculas " + e.de + " → " + e.para; },
    maculaMitigada: function () { return "A Convicção mitigou uma Mácula"; },
    degeneracao: function () { return "Degeneração: Máculas além dos espaços"; },
    remorso: function (e) { return "Remorso: " + e.sucessos + " sucesso(s) em " + e.dados + " dado(s)"; },
    humanidade: function (e) { return "Humanidade " + e.de + " → " + e.para; },
    humanidadeMantida: function () { return "A Humanidade se manteve"; },
    humanidadeZero: function () { return "Humanidade 0: a Besta tomou conta"; },
    alimentacao: function (e) { return "Alimentou-se: Fome " + e.de + " → " + e.para; },
    ressonancia: function (e) { return e.para ? "Ressonância " + nomeDe(C().RESSONANCIAS, e.para) + (e.temperamento ? " (" + C().TEMPERAMENTOS[e.temperamento] + ")" : "") : "A Ressonância passou"; },
    criticoBestial: function () { return "Crítico bestial: escolha a consequência"; },
    falhaBestial: function () { return "Falha bestial: escolha a consequência"; },
    perdicao: function (e) { return "Perdição " + nomeDe(C().CLAS, e.cla); },
    efeito: function (e) { return (e.nome || e.chave) + " ativo"; },
    efeitoExpirou: function (e) { return (e.nome || e.chave) + " terminou"; },
    efeitoEncerrado: function (e) { return (e.nome || e.chave) + " encerrado"; },
    poder: function (e) { return "Usou " + e.nome + (e.checagens ? " (" + e.checagens + " Checagem" + (e.checagens > 1 ? "s" : "") + ")" : ""); },
    ritual: function (e) { return "Ritual: " + e.nome; },
    xp: function (e) { return (e.valor >= 0 ? "+" : "") + e.valor + " XP" + (e.motivo ? " (" + e.motivo + ")" : ""); },
    compra: function (e) { return "Compra: " + e.custo + " XP"; },
    novaNoite: function () { return "Nova noite"; },
    desejo: function () { return "Desejo cumprido: 1 Superficial de FdV recuperado"; },
    ambicao: function () { return "Ambição: Força de Vontade recuperada"; },
    sol: function () { return "Luz do sol"; },
    discrasia: function (e) { return e.texto || "Discrasia"; },
    laco: function (e) { return e.imune ? "Imune ao Laço" : "Laço de Sangue: nível " + (e.nivel || ""); },
    quebraDaMascara: function () { return "A Máscara foi ameaçada"; },
  };

  function narrar(eventos, opcoes) {
    var frases = (eventos || []).map(function (e) { var f = FRASES[e.tipo]; try { return f ? f(e) : ""; } catch (x) { return ""; } }).filter(Boolean);
    if (frases.length && !(opcoes && opcoes.silencioso)) {
      var grave = (eventos || []).some(function (e) { return ["torpor", "morteFinal", "frenesi", "frenesiPendente", "criticoBestial", "falhaBestial", "humanidadeZero", "debilitado"].indexOf(e.tipo) >= 0; });
      UI().aviso(frases.slice(0, 4).join(" · ") + (frases.length > 4 ? " …" : ""), { tipo: grave ? "atencao" : "info" });
    }
    return frases;
  }

  /* ---------------------------------------------------------------
     OPERAR
     --------------------------------------------------------------- */

  function rolador(faces) { return global.RAMADados.rolar("1d" + faces).rolagens[0]; }
  function novaOperacao() { return global.RAMAApi ? global.RAMAApi.novaOperacao() : "op-" + U.uuid(); }

  /* fn(o) → { ok, motivo?, eventos } ; aplicada uma vez por id. */
  function operar(ctx, fn, opcoes) {
    var op = opcoes || {};
    if (!ctx.podeEditar()) { UI().avisoAtencao("Esta ficha está em modo de leitura."); return { ok: false }; }
    var o = ctx.ficha.vampiro;
    var r = R().aplicarOperacao(o, op.opId || novaOperacao(), fn);
    if (r.ok === false) { if (r.motivo) UI().avisoAtencao(r.motivo); return r; }
    if (!op.silencioso) narrar(r.eventos);
    ctx.alterou();
    ctx.atualizar(op.regioes || ["bloco", "conteudo"]);
    if (!op.semPendencias) tratar(ctx, r.eventos || []);
    return r;
  }

  /* ---------------------------------------------------------------
     PONTOS, TRILHAS, FOME
     --------------------------------------------------------------- */

  /* pontos({ valor, maximo, rotulo, aoMudar, minimo }) — sem aoMudar é
     só leitura. Clicar no ponto marcado mais alto o desmarca. */
  function pontos(opcoes) {
    var o = opcoes || {};
    var max = o.maximo || 5, v = Math.max(0, Math.min(max, o.valor || 0));
    var texto = (o.rotulo ? o.rotulo + ": " : "") + v + " de " + max;
    if (!o.aoMudar) {
      return el("span.vamp-pontos", { role: "img", "aria-label": texto, title: o.dica || texto }, Array.from({ length: max }, function (_, i) {
        return el("span.vamp-ponto", { class: i < v ? "vamp-ponto--cheio" : "", "aria-hidden": "true" });
      }));
    }
    var minimo = o.minimo || 0;
    return el("span.vamp-pontos.vamp-pontos--editavel", { role: "group", "aria-label": o.rotulo || "Pontos" }, Array.from({ length: max }, function (_, i) {
      var n = i + 1;
      var novo = n === v ? n - 1 : n;
      return el("button.vamp-ponto", {
        type: "button", class: i < v ? "vamp-ponto--cheio" : "",
        "aria-label": (o.rotulo || "") + " " + n + (n <= v ? " (marcado)" : ""),
        "aria-pressed": n <= v ? "true" : "false",
        disabled: novo < minimo,
        onclick: function () { o.aoMudar(novo); },
      });
    }));
  }

  /* A trilha: caixas da esquerda para a direita, Agravado primeiro. */
  function trilha(t, rotulo) {
    var caixas = [];
    for (var i = 0; i < t.max; i++) {
      var tipo = i < t.agravado ? "agravado" : i < t.agravado + t.superficial ? "superficial" : "";
      caixas.push(el("span.vamp-caixa", { class: tipo ? "vamp-caixa--" + tipo : "", "aria-hidden": "true", texto: tipo === "agravado" ? "X" : tipo === "superficial" ? "/" : "" }));
    }
    var leitura = rotulo + ": " + t.max + " espaços, " + t.superficial + " Superficial, " + t.agravado + " Agravado, " + t.livre + " livre" + (t.debilitado ? " — Debilitado" : "");
    return el("span.vamp-trilha", { role: "img", "aria-label": leitura, title: leitura, dataset: { debilitado: t.debilitado ? "1" : "" } }, caixas);
  }

  function fome(valor) {
    var v = Math.max(0, Math.min(5, valor || 0));
    return el("span.vamp-fome", { role: "img", "aria-label": "Fome " + v + " de 5", title: "Fome " + v + " de 5" }, Array.from({ length: 5 }, function (_, i) {
      return el("span.vamp-fome__nivel", { class: i < v ? "vamp-fome__nivel--cheio" : "", "aria-hidden": "true" });
    }));
  }

  /* ---------------------------------------------------------------
     ROLAGEM: dados, histórico
     --------------------------------------------------------------- */

  function rotuloDoResultado(cl) {
    if (!cl.julgado) return cl.sucessos + " sucesso(s)";
    if (cl.vitoriaACusto) return "Vitória a um custo";
    if (cl.criticoBestial) return "Crítico bestial";
    if (cl.vitoriaCritica) return "Vitória crítica";
    if (cl.vitoria) return "Vitória" + (cl.margem ? " (margem " + cl.margem + ")" : "");
    if (cl.falhaBestial) return "Falha bestial";
    if (cl.falhaTotal) return "Falha total";
    return "Falha (faltou " + cl.faltam + ")";
  }

  /* Pelo funil de sempre: cartão + histórico da campanha, com as marcas
     dos dados de Fome. */
  function mostrarRolagem(r) {
    if (!global.RAMARolagens) return;
    var cl = r.classificacao;
    global.RAMARolagens.mostrar({
      tipo: "vampiro", nome: (r.rotulo || "Teste") + " · " + rotuloDoResultado(cl),
      expressao: r.parada + " dado" + (r.parada > 1 ? "s" : "") + (r.fome ? " (" + r.fome + " de Fome)" : "") + (r.dificuldade !== null ? " · Dif. " + r.dificuldade : r.oposicao !== null ? " · contra " + r.oposicao : ""),
      rolagens: r.dados.map(function (d) { return d.face; }),
      marcas: r.dados.map(function (d) { return d.fome ? "fome" : ""; }),
      total: cl.sucessos,
      parcelas: (r.composicao || []).map(function (p) { return { rotulo: p.fonte, valor: p.valor }; }),
    }, {
      nome: (r.rotulo || "Teste") + " · " + rotuloDoResultado(cl),
      critico: !!cl.vitoriaCritica,
      notas: [r.rerrolagem ? "Rerrolou " + r.rerrolagem.indices.length + " dado(s) com Força de Vontade." : ""].filter(Boolean),
    });
  }

  function dadoVisual(d, i, selecionavel, marcado, aoAlternar) {
    var classe = ["vamp-dado", d.fome ? "vamp-dado--fome" : "", d.face >= 6 ? "vamp-dado--sucesso" : "", d.face === 10 ? "vamp-dado--dez" : "", d.fome && d.face === 1 ? "vamp-dado--bestial" : "", d.rerrolado ? "vamp-dado--rerrolado" : "", marcado ? "vamp-dado--marcado" : ""].filter(Boolean).join(" ");
    var simbolo = d.fome ? (d.face === 10 ? "☠" : d.face === 1 ? "✶" : "◆") : (d.face === 10 ? "★" : "");
    var conteudo = [el("span.vamp-dado__face", { texto: String(d.face) }), simbolo ? el("span.vamp-dado__simbolo", { "aria-hidden": "true", texto: simbolo }) : null];
    var rotulo = D().rotuloDoDado(d);
    if (!selecionavel) return el("span", { class: classe, role: "img", "aria-label": rotulo, title: rotulo }, conteudo);
    return el("button", { type: "button", class: classe, "aria-pressed": marcado ? "true" : "false", "aria-label": rotulo + (marcado ? " — escolhido para rerrolar" : ""), title: rotulo, onclick: function () { aoAlternar(i); } }, conteudo);
  }

  /* A janela da rolagem pendente. `op`:
       concluir(o, r, { vencerACusto }) → { ok, eventos }  (padrão: R.concluirTeste)
       aoConcluir(r, eventos)  depois de concluir
     Fechar a janela CONCLUI a rolagem: não há como desistir de um dado
     e rolar de novo. */
  function resultado(ctx, r, opcoes) {
    var op = opcoes || {};
    var escolhidos = [];
    var concluida = false;
    var area = el("div.vamp-resultado");
    var dificuldade = UI().campo({ rotulo: "Dificuldade (se veio depois)", tipo: "numero", valor: r.dificuldade !== null ? r.dificuldade : "" });

    function desenhar() {
      var cl = r.classificacao;
      var pode = D().podeRerrolar(r).ok && ctx.podeEditar() && !ctx.ficha.vampiro.estado.frenesi;
      U.trocar(area, [
        el("p.vamp-resultado__parada", { texto: r.parada + " dado(s)" + (r.fome ? ", " + r.fome + " de Fome" : "") + " · " + (r.composicao || []).map(function (p) { return p.fonte + " " + (p.valor >= 0 ? "+" : "") + p.valor; }).join(" ") }),
        el("div.vamp-dados", { role: "group", "aria-label": "Dados rolados" }, r.dados.map(function (d, i) {
          return dadoVisual(d, i, pode && !d.fome, escolhidos.indexOf(i) >= 0, function (k) {
            var at = escolhidos.indexOf(k);
            if (at >= 0) escolhidos.splice(at, 1);
            else if (escolhidos.length < D().MAX_RERROLAGEM) escolhidos.push(k);
            desenhar();
          });
        })),
        el("p.vamp-legenda.t-mini", { texto: "◆ dado de Fome · ☠ 10 de Fome · ✶ 1 de Fome · ★ 10 comum. Sucesso em 6 ou mais; cada par de 10 vale 4." }),
        el("p.vamp-resultado__total", { role: "status", texto: cl.sucessos + " sucesso(s) — " + (cl.julgado ? rotuloDoResultado(cl) : "sem Dificuldade ainda") }),
        r.rerrolagem ? el("p.t-mini", { texto: "Força de Vontade já usada nesta rolagem (era " + r.rerrolagem.antes.sucessos + " sucesso(s))." }) : null,
        pode ? el("div.faixa", {}, [
          el("span.t-mini", { texto: "Escolha até 3 dados comuns (" + escolhidos.length + "/3)." }),
          el("button.r-botao.r-botao--mini", { type: "button", texto: "Rerrolar com Força de Vontade (1 Superficial)", disabled: !escolhidos.length, onclick: function () {
            operar(ctx, function (o) { return R().rerrolarComFdV(o, r, escolhidos.slice(), rolador); }, { regioes: ["bloco"] });
            escolhidos = [];
            desenhar();
          } }),
        ]) : null,
        !cl.julgado ? el("div.faixa", {}, [dificuldade, el("button.r-botao.r-botao--mini", { type: "button", texto: "Julgar", onclick: function () {
          var v = dificuldade.entrada.value.trim();
          if (v === "") return;
          D().julgar(r, { dificuldade: U.inteiro(v, 0) });
          desenhar();
        } })]) : null,
        cl.podeVencerACusto ? el("button.r-botao.r-botao--mini", { type: "button", texto: "Vencer a um custo (o Narrador aceita)", onclick: function () { concluir({ vencerACusto: true }); } }) : null,
      ]);
    }

    function concluir(extra) {
      if (concluida) return;
      var fn = op.concluir || function (o, res, x) { return R().concluirTeste(o, res, x); };
      var x = Object.assign({ semJulgamento: !r.classificacao.julgado }, extra || {});
      var rr;
      if (ctx.podeEditar()) {
        rr = operar(ctx, function (o) { return fn(o, r, x); });
        if (rr.ok === false) return;
      } else {
        D().concluir(r, x);
        rr = { ok: true, eventos: [] };
      }
      concluida = true;
      mostrarRolagem(r);
      m.fechar();
      if (op.aoConcluir) op.aoConcluir(r, rr.eventos || []);
    }

    var m = UI().modal({
      titulo: r.rotulo || "Teste",
      classe: "vamp-janela-rolagem",
      conteudo: [area],
      podeFechar: function () { if (!concluida) concluir(); return concluida; },
      botoes: [{ rotulo: "Concluir", classe: "r-botao--principal", aoClicar: function () { concluir(); } }],
    });
    desenhar();
    return m;
  }

  /* ---------------------------------------------------------------
     O PEDIDO DE TESTE
     --------------------------------------------------------------- */

  /* testar(ctx, { atributo, habilidade, disciplina, rotulo, dificuldade,
     contexto, fixo }) — abre a janela de montagem com o que já veio. */
  function testar(ctx, inicial) {
    var o = ctx.ficha.vampiro;
    var p = Object.assign({ atributo: "", habilidade: "", disciplina: "", atributo2: "", especializacao: "", dificuldade: "", modificadores: [], surto: false, contexto: [] }, inicial || {});
    var previa = el("p.vamp-previa", { role: "status" });
    var mod = UI().passo({ valor: 0, minimo: -10, maximo: 10, rotulo: "Modificador da mesa", aoMudar: function () { atualizar(); } });
    function opcoesAtributo(vazio) { return [{ valor: "", rotulo: vazio }].concat(C().ATRIBUTOS.map(function (a) { return { valor: a.chave, rotulo: a.nome + " (" + R().valorDeAtributo(o, a.chave) + ")" }; })); }
    var atr = UI().campo({ rotulo: "Atributo", tipo: "selecao", valor: p.atributo, opcoes: opcoesAtributo("Escolha…"), aoMudar: function (v) { p.atributo = v; atualizar(); } });
    var calc = R().calcular(o);
    var segundo = UI().campo({ rotulo: "Habilidade ou Disciplina", tipo: "selecao", valor: p.habilidade ? "h:" + p.habilidade : p.disciplina ? "d:" + p.disciplina : p.atributo2 ? "a:" + p.atributo2 : "",
      opcoes: [{ valor: "", rotulo: "Nenhuma (Atributo + Atributo abaixo)" }]
        .concat(C().HABILIDADES.map(function (h) { return { valor: "h:" + h.chave, rotulo: h.nome + " (" + R().valorDeHabilidade(o, h.chave) + ")" }; }))
        .concat(Object.keys(calc.disciplinas).map(function (k) { return { valor: "d:" + k, rotulo: nomeDisc(k) + " (" + calc.disciplinas[k].valor + ")" }; }))
        .concat(C().ATRIBUTOS.map(function (a) { return { valor: "a:" + a.chave, rotulo: "Atributo: " + a.nome + " (" + R().valorDeAtributo(o, a.chave) + ")" }; })),
      aoMudar: function (v) {
        p.habilidade = v.indexOf("h:") === 0 ? v.slice(2) : ""; p.disciplina = v.indexOf("d:") === 0 ? v.slice(2) : ""; p.atributo2 = v.indexOf("a:") === 0 ? v.slice(2) : "";
        p.especializacao = ""; desenharEsp(); atualizar();
      } });
    var espCaixa = el("div");
    function desenharEsp() {
      var esps = R().especializacoesDaFicha(o).filter(function (e) { return e.habilidade === p.habilidade; });
      U.trocar(espCaixa, esps.length ? [UI().campo({ rotulo: "Especialização (+1)", tipo: "selecao", valor: p.especializacao,
        opcoes: [{ valor: "", rotulo: "Nenhuma" }].concat(esps.map(function (e) { return { valor: e.id, rotulo: e.nome }; })), aoMudar: function (v) { p.especializacao = v; atualizar(); } })] : []);
    }
    var dif = UI().campo({ rotulo: "Dificuldade (vazia: o Narrador diz depois)", tipo: "selecao", valor: String(p.dificuldade),
      opcoes: [{ valor: "", rotulo: "—" }].concat(C().DIFICULDADES.map(function (d) { return { valor: String(d.valor), rotulo: d.valor + " — " + d.nome }; })), aoMudar: function (v) { p.dificuldade = v; } });
    var surto = el("label.r-marca", {}, [el("input", { type: "checkbox", checked: !!p.surto, disabled: o.natureza !== "vampiro", onchange: function (ev) { p.surto = ev.currentTarget.checked; atualizar(); } }),
      el("span", { texto: "Surto de Sangue (+" + C().potencia(calc.potencia).surto + " dados; uma Checagem antes)" })]);

    function pedido() {
      var mods = mod.valor() ? [{ fonte: "Mesa", valor: mod.valor() }] : [];
      return { atributo: p.atributo, habilidade: p.habilidade, disciplina: p.disciplina, atributo2: p.atributo2, especializacao: p.especializacao, modificadores: mods, surto: p.surto, contexto: p.contexto,
        dificuldade: p.dificuldade === "" ? undefined : U.inteiro(p.dificuldade, 0), rotulo: p.rotulo || [p.atributo && nomeAtr(p.atributo), p.habilidade && nomeHab(p.habilidade), p.disciplina && nomeDisc(p.disciplina), p.atributo2 && nomeAtr(p.atributo2)].filter(Boolean).join(" + ") };
    }
    function atualizar() {
      if (!p.atributo) { previa.textContent = "Escolha o Atributo."; return; }
      var par = R().montarParada(o, pedido());
      var nFome = o.natureza === "vampiro" ? D().dadosDeFome(par.total, o.fome, false) : 0;
      previa.textContent = "Parada: " + par.total + " dado(s)" + (nFome ? ", " + nFome + " de Fome" : "") + " — " + par.composicao.map(function (c) { return c.fonte + " " + (c.valor >= 0 ? "+" : "") + c.valor; }).join(" · ");
    }
    desenharEsp(); atualizar();
    UI().modal({
      titulo: "Teste",
      classe: "vamp-janela-teste",
      conteudo: [el("div.editar-grade", {}, [atr, segundo]), espCaixa, el("div.editar-grade", {}, [dif, el("div.r-campo", {}, [el("span.t-rotulo", { texto: "Modificador da mesa" }), mod])]), o.natureza === "vampiro" ? surto : null, previa],
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Rolar", classe: "r-botao--principal", aoClicar: function (fechar) {
          if (!p.atributo) { UI().avisoAtencao("Escolha o Atributo."); return; }
          var res = null;
          var r = operar(ctx, function (b) { var x = R().rolarTeste(b, pedido(), rolador); if (x.ok) res = x.resultado; return x; }, { regioes: ["bloco"] });
          if (r.ok === false || !res) return;
          fechar();
          resultado(ctx, res, inicial && inicial.aoConcluir ? { aoConcluir: inicial.aoConcluir } : {});
        } },
      ],
    });
  }

  /* ---------------------------------------------------------------
     O QUE A MESA DECIDE
     --------------------------------------------------------------- */

  var CONSEQUENCIAS = {
    compulsao: "Compulsão (tabela ou escolhida)",
    maculas: "Máculas (Humanidade em risco)",
    mascara: "Ameaça à Máscara",
    vantagem: "Perder ou arranhar uma Vantagem",
    dano: "Dano Agravado",
    fome: "+1 de Fome",
  };

  function tratar(ctx, eventos) {
    var lista = (eventos || []).filter(function (e) { return e.tipo === "criticoBestial" || e.tipo === "falhaBestial" || e.tipo === "frenesiPendente"; });
    if (!lista.length || !ctx.podeEditar()) return;
    var e = lista[0];
    if (e.tipo === "frenesiPendente") return pedirFrenesi(ctx, e);
    escolherConsequencia(ctx, e);
  }

  function escolherConsequencia(ctx, e) {
    var grupo = "vamp-cons-" + U.uuid().slice(0, 6);
    var escolha = { tipo: e.opcoes[0] };
    var extra = el("div");
    function desenharExtra() {
      var t = escolha.tipo;
      if (t === "compulsao") U.trocar(extra, [UI().campo({ rotulo: "Compulsão", tipo: "selecao", valor: escolha.compulsao || "aleatoria",
        opcoes: [{ valor: "aleatoria", rotulo: "Rolar na tabela (1d10)" }].concat(Object.keys(C().COMPULSOES).map(function (k) { return { valor: k, rotulo: C().COMPULSOES[k].nome }; })).concat(C().CLAS[ctx.ficha.vampiro.cla] && C().CLAS[ctx.ficha.vampiro.cla].compulsao ? [{ valor: "cla", rotulo: "Do clã: " + C().CLAS[ctx.ficha.vampiro.cla].compulsao.nome }] : []),
        aoMudar: function (v) { escolha.compulsao = v; } })]);
      else if (t === "maculas" || t === "dano") U.trocar(extra, [UI().campo({ rotulo: t === "dano" ? "Agravado" : "Máculas", tipo: "numero", valor: escolha.valor || 1, aoMudar: function (v) { escolha.valor = U.inteiro(v, 1); } })]);
      else if (t === "mascara" || t === "vantagem") U.trocar(extra, [UI().campo({ rotulo: "Nota", valor: escolha.nota || "", limite: 200, aoMudar: function (v) { escolha.nota = v; } })]);
      else U.limpar(extra);
    }
    var opcoes = e.opcoes.map(function (k) {
      return el("label.r-marca", {}, [el("input", { type: "radio", name: grupo, checked: escolha.tipo === k, onchange: function () { escolha = { tipo: k }; desenharExtra(); } }), el("span", { texto: CONSEQUENCIAS[k] })]);
    });
    desenharExtra();
    UI().modal({
      titulo: e.tipo === "criticoBestial" ? "Crítico bestial" : "Falha bestial",
      exigeDecisao: true,
      conteudo: [el("p", { texto: e.tipo === "criticoBestial" ? "A Besta venceu por você. O Narrador escolhe UMA consequência (p. 207)." : "A Besta se manifesta na falha. O Narrador escolhe UMA consequência (p. 207)." }),
        el("div.pilha.pilha--curta", { role: "radiogroup" }, opcoes), extra],
      botoes: [{ rotulo: "Aplicar", classe: "r-botao--principal", aoClicar: function (fechar) {
        fechar();
        operar(ctx, function (o) { return R().consequenciaBestial(o, escolha, rolador); });
      } }],
    });
  }

  function pedirFrenesi(ctx, e) {
    var o = ctx.ficha.vampiro;
    var par = R().paradaDeFrenesi(o, e.frenesi);
    UI().modal({
      titulo: "Frenesi de " + nomeDe(C().FRENESI, e.frenesi),
      exigeDecisao: true,
      conteudo: [el("p", { texto: (e.motivo || "A Besta quer sair.") + " Dificuldade " + e.dificuldade + "." }),
        el("p.t-mini", { texto: "Parada: " + par.composicao.map(function (c) { return c.fonte + " " + c.valor; }).join(" + ") + " = " + par.total + " (sem dados de Fome)." })],
      botoes: [
        { rotulo: "Curtir a Onda (sucumbir)", classe: "r-botao--fantasma", aoClicar: function (fechar) { fechar(); operar(ctx, function (b) { return R().testarFrenesi(b, { tipo: e.frenesi, dificuldade: e.dificuldade, curtir: true }, rolador); }); } },
        { rotulo: "Resistir", classe: "r-botao--principal", aoClicar: function (fechar) { fechar(); operar(ctx, function (b) { return R().testarFrenesi(b, { tipo: e.frenesi, dificuldade: e.dificuldade }, rolador); }); } },
      ],
    });
  }

  /* ---------------------------------------------------------------
     A FICHA NUMA CRÔNICA
     --------------------------------------------------------------- */

  var lido = { campanhaId: "", dados: null, erro: "", tentado: false, carregando: null };

  function campanhaDe(ctx) { return ctx && ctx.ficha && ctx.ficha.campanhaId ? String(ctx.ficha.campanhaId) : ""; }

  function carregar(ctx, forcar) {
    var cid = campanhaDe(ctx);
    if (!cid || !global.RAMAApi || !global.RAMAApi.lerVampiro) return Promise.resolve(null);
    if (lido.carregando && lido.campanhaId === cid) return lido.carregando;
    if (!forcar && lido.tentado && lido.campanhaId === cid) return Promise.resolve(lido.dados);
    lido.campanhaId = cid; lido.tentado = true;
    lido.carregando = global.RAMAApi.lerVampiro(cid, { segundoPlano: true }).then(function (r) {
      lido.carregando = null;
      if (!r || !r.ok) { lido.dados = null; lido.erro = (r && r.erro) || "falha"; return null; }
      lido.dados = r.dados; lido.erro = "";
      ctx.atualizar(["bloco", "conteudo"]);
      return lido.dados;
    }, function () { lido.carregando = null; lido.dados = null; lido.erro = "sem_conexao"; return null; });
    return lido.carregando;
  }

  /* Na crônica: a campanha da ficha é de Vampiro e respondeu. */
  function naCronica(ctx) {
    var cid = campanhaDe(ctx);
    if (!cid) return false;
    if (!lido.tentado || lido.campanhaId !== cid) carregar(ctx);
    return !!(lido.dados && lido.campanhaId === cid);
  }

  function dadosDaCronica(ctx) { return naCronica(ctx) ? lido.dados : null; }

  /* Outro personagem da crônica (beber de um vampiro, Direto da Fonte):
     o servidor confere a permissão nas DUAS fichas. */
  function operarNaCronica(ctx, operacao) {
    var cid = campanhaDe(ctx);
    if (!cid) return Promise.resolve({ ok: false });
    var id = novaOperacao();
    return global.RAMAApi.vampiroOperar(cid, id, operacao).then(function (r) {
      if (!r.ok) { UI().avisoDeFalha(r, "operação da crônica"); return r; }
      narrar((r.dados && r.dados.eventos) || []);
      UI().avisoOk("Feito. A ficha recarrega com o resultado.");
      setTimeout(function () { location.reload(); }, 900);
      return r;
    });
  }

  global.RAMAVampiroTela = {
    operar: operar, narrar: narrar, rolador: rolador, novaOperacao: novaOperacao,
    pontos: pontos, trilha: trilha, fome: fome,
    testar: testar, resultado: resultado, tratar: tratar, mostrarRolagem: mostrarRolagem, rotuloDoResultado: rotuloDoResultado,
    nomeAtr: nomeAtr, nomeHab: nomeHab, nomeDisc: nomeDisc, nomeDe: nomeDe,
    CONSEQUENCIAS: CONSEQUENCIAS,
  };
  global.RAMAVampiroMesaDaFicha = { carregar: carregar, naCronica: naCronica, dados: dadosDaCronica, operar: operarNaCronica };
})(window);
