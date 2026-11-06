/* =====================================================================
   R.A.M.A. — Ficha de Ordem · Arquivos Secretos 9: Hell Hunters (v6.9)
   =====================================================================
   A tela do que o AS9 põe numa ficha. A regra mora em
   js/ordem/arquivo9.js; aqui, só desenho, clique e gravação. Cada coisa
   aparece onde se usa:

     controles(ctx, aq)          no cartão de cada poder (Municiador
                                 Ambulante, Ripostar Ousado, Tática de
                                 Abordagem, Tiro Intuitivo) e de cada
                                 habilidade das trilhas Incursor e Piloto
                                 de Drone
     controlesDeOrigem(ctx,org)  Veterano de Conflito Armado (Full Metal
                                 Jacket fica no resultado do teste)
     acoesNoTeste                Full Metal Jacket, dado de tática,
                                 Entrada Explosiva, Analisar Perigo
                                 (Tática), Alerta de Ameaça, as novas
                                 tentativas (Meu Amigo Drone, Ás dos Drones)
     acoesNoAtaque               Full Metal Jacket, Tiro Intuitivo, CQB,
                                 alvo-prioritário, Ripostar, Metralhar
                                 Tudo, dado de tática
     noDano, acoesNoDano         Metralhar Tudo (+2d8), alvo-prioritário
                                 (VD 200 ou menos), dado de tática
     condicoes                   o que está valendo (dados de tática,
                                 análise, alvo, reféns), em Condições
     aoNovoInterludio            os dados de tática que sobraram somem
     painelDeAliados             os drones do inventário, na aba Aliados
     opcoesDoItem,               drone: operar com as duas mãos, tipo,
     observacoesDoItem           perícia do Utilitário, estado,
                                 modificação da trilha

   Tudo o que é da cena (quem está engajado, se o refém está a até 3 m,
   qual inimigo é o alvo, se o teste foi feito com o drone) é perguntado
   no clique. Nada é aplicado a outra ficha daqui.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var el = U.el;

  function A9() { return global.RAMAOrdemArquivo9 || null; }
  function R() { return global.RAMAOrdemRegras; }
  function C() { return global.RAMAOrdemCatalogo; }
  function D() { return global.RAMADados; }
  function CD() { return global.RAMAOrdemCondicoes || null; }
  function EF() { return global.RAMAOrdemEfeitos || null; }
  function I() { return global.RAMAOrdemInventario || null; }
  function IT() { return global.RAMAOrdemItens || null; }
  function F() { return global.RAMAFicha; }

  function ordemDe(ctx) { return ctx.ficha.ordem; }
  function inventarioDe(ctx) { return ctx.ficha.inventario; }
  function calc(ctx) { return R().calcular(ordemDe(ctx), inventarioDe(ctx)); }
  function salvar(ctx) { ctx.alterou(); ctx.redesenhar(); }
  function permitido(ctx) { return !ctx.podeEditar || ctx.podeEditar(); }
  function sigla(o) { return R().usaDeterminacao(o) ? "PD" : "PE"; }
  function novoOp(prefixo) { return prefixo + "-" + String(U.uuid()).replace(/[^A-Za-z0-9]/g, "").slice(0, 20); }
  function dadosDoItem(item) { return I() ? I().dadosDoItem(item) : ((item && item.ordem) || {}); }
  function liberado() { return !A9() || A9().liberado(); }
  function tem(o, chave) { return !!A9() && A9().temPoder(o, chave); }

  var permitidoGlobal = true;
  function botao(texto, aoClicar, op) {
    var x = op || {};
    return el("button.r-botao.r-botao--mini", {
      type: "button", texto: texto, disabled: !!x.desligado || !permitidoGlobal, title: x.dica || "",
      class: x.classe || "", dataset: x.foco ? { foco: x.foco } : {}, onclick: aoClicar,
    });
  }
  function linha(texto, classe) { return el("p.t-mini" + (classe ? "." + classe : ""), { texto: texto }); }
  function bloco(partes) { return el("div.pilha--curta", { class: "pilha" }, partes.filter(Boolean)); }
  function selecao(opcoes, valor, rotulo) {
    var s = el("select.r-selecao", {}, opcoes.map(function (op) { return el("option", { value: op.valor, texto: op.rotulo, selected: String(op.valor) === String(valor) }); }));
    return { no: el("label.r-campo", {}, [el("span.t-mini", { texto: rotulo }), s]), valor: function () { return s.value; } };
  }
  function campoTexto(rotulo, valor, limite, tipo) {
    var entrada = el("input.r-entrada", { type: tipo || "text", maxlength: limite || 120, value: valor || "" });
    return { no: el("label.r-campo", {}, [el("span.t-mini", { texto: rotulo }), entrada]), valor: function () { return entrada.value.trim(); }, entrada: entrada };
  }
  function marca(rotulo) {
    var cb = el("input", { type: "checkbox" });
    return { no: el("label.r-marca", {}, [cb, el("span", { texto: rotulo })]), valor: function () { return cb.checked; } };
  }
  function rolarSoma(expr) {
    var r = D().dano({ nome: "", dano: expr, danoExtra: "", critico: false });
    return r && r.ok ? r : null;
  }
  function mostrar(r, nome, notas, acoes, critico) { global.RAMARolagens.mostrar(r, { nome: nome, notas: notas || [], acoes: acoes || [], critico: !!critico }); }
  function modal(titulo, conteudo, rotulo, aoConfirmar) {
    UI.modal({ titulo: titulo, conteudo: conteudo.filter(Boolean), botoes: [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: rotulo, classe: "r-botao--principal", aoClicar: function (fechar) { if (aoConfirmar() !== false) fechar(); } },
    ] });
  }

  function maximoDe(c, qual) { return qual === "pv" ? c.pv.total : qual === "pe" ? c.pe.total : (c.pd ? c.pd.total : 0); }
  /* Gasta PE (ou PD) pelo mesmo caminho das ações de recurso. */
  function gastar(ctx, quanto) {
    var o = ordemDe(ctx);
    var c = calc(ctx);
    var qual = c.determinacao ? "pd" : "pe";
    var r = CD() ? CD().aplicarAcao(qual, "gastar", { cond: o.condicoes, atual: c.atual[qual], maximo: maximoDe(c, qual), valor: quanto, pd: c.determinacao }) : null;
    if (!r || !r.ok) { UI.avisoAtencao((r && r.motivo) || "Sem " + qual.toUpperCase() + " suficientes."); return null; }
    if (!o.recursos) o.recursos = { pv: null, pe: null, san: null, pd: null };
    var antes = c.atual[qual];
    o.recursos[qual] = r.valor;
    return { qual: qual.toUpperCase(), antes: antes, depois: r.valor, texto: "Gastou " + quanto + " " + qual.toUpperCase() + " (" + antes + " → " + r.valor + ")." };
  }
  function curaEmMim(ctx, valor) {
    var o = ordemDe(ctx);
    var c = calc(ctx);
    var r = CD().aplicarAcao("pv", "cura", { cond: o.condicoes, atual: c.atual.pv, maximo: c.pv.total, valor: Math.max(1, valor) });
    if (!r.ok) return null;
    if (!o.recursos) o.recursos = { pv: null, pe: null, san: null, pd: null };
    var antes = c.atual.pv;
    o.recursos.pv = r.valor;
    return { antes: antes, depois: r.valor };
  }
  function agente(ctx) {
    var ag = global.RAMAAuth && global.RAMAAuth.agente ? global.RAMAAuth.agente() : null;
    return { id: ag ? ag.id : "", nome: ag ? (ag.nome || ag.usuario || "") : "", papel: ctx.ehDono && !ctx.ehDono() ? "mestre" : "jogador" };
  }
  function efeitoEmMim(ctx, dados) {
    var o = ordemDe(ctx);
    if (!EF()) return null;
    var inst = EF().criarInstancia(Object.assign({ alvoNome: ctx.ficha.nome, cena: A9().cenaDe(o), aplicadoPor: agente(ctx), duracao: { tipo: "cena" } }, dados));
    var r = EF().aplicar(o.condicoes, inst, "nova");
    return r && r.ok ? r.instancia : null;
  }
  /* Rola um teste de perícia da própria ficha (dados e bônus da conta). */
  function rolarTeste(ctx, chave, nome) {
    var o = ordemDe(ctx);
    var dt = R().dadosDoTeste(o, chave);
    var b = R().bonusDePericia(o, chave, inventarioDe(ctx));
    var r = D().dependente({ expressao: dt.expressao, sigla: "", nome: nome, bonus: b.total, modificadores: [] });
    if (!r || !r.ok) { UI.avisoErro("Não deu para rolar " + nome + "."); return null; }
    r.parcelas = [r.parcelas[0]].concat(b.parcelas.map(function (x) { return { rotulo: x.rotulo, valor: x.valor }; }));
    return r;
  }

  /* =================================================================
     CARTÕES DE PODER E DE HABILIDADE DE TRILHA
     ================================================================= */

  var CONTROLES = {
    municiadorAmbulante: function (ctx, o) {
      var m = A9().dados(o).municiar;
      var int = R().atributo(o, "int");
      var inter = A9().emInterludio(o);
      return [
        linha(m.pacotes ? m.pacotes + " pacote(s) de munição preparado(s) — não ocupam espaço na carga (" + A9().espacosPoupados(o, inventarioDe(ctx)) + " espaço(s) poupado(s) agora)." : "Nenhum pacote preparado."),
        botao("Municiar (interlúdio): " + Math.max(0, int) + "d6 pacotes", function () {
          if (int <= 0) { UI.avisoAtencao("Com Intelecto 0, municiar prepara 0 pacotes."); return; }
          var rolagens = [];
          for (var i = 0; i < int; i++) rolagens.push(D().rolar("1d6").principal);
          var r = A9().municiar(o, novoOp("mu"), rolagens);
          if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
          salvar(ctx);
          UI.aviso("Municiar: " + rolagens.join(" + ") + " = " + r.pacotes + " pacote(s) preparado(s). Até o próximo municiar, eles não ocupam espaço.", { duracao: 8000 });
        }, { desligado: !inter, dica: inter ? "" : "Só numa cena de interlúdio (Condições → Novo interlúdio).", foco: "as9-municiar" }),
      ];
    },
    ripostarOusado: function (ctx, o) {
      var pend = A9().ripostarPendente(o);
      return [
        pend ? linha("Contra-ataque armado: +5 no próximo ataque corpo a corpo desta rodada (aparece no resultado do ataque).") : null,
        botao("Ripostar (reação especial de defesa, 2 " + sigla(o) + ")…", function () { ripostar(ctx); }, { foco: "as9-ripostar" }),
      ];
    },
    taticaDeAbordagem: function (ctx, o) {
      var plano = A9().planoDaCena(o);
      var inter = A9().emInterludio(o);
      var planos = A9().planosComDados(o);
      return [
        planos.length ? linha("Dados de tática: " + planos.map(function (p) { return p.restantes + "d6 (" + p.ameaca + ")"; }).join("; ") + ". Somem no início da próxima cena de interlúdio.") : linha("Nenhum dado de tática guardado."),
        plano ? linha("Plano desta cena: “" + plano.ameaca + "” — Tática " + plano.total + " → " + plano.dados + " dado(s).") : null,
        botao("Planejar (interlúdio): teste de Tática DT 10…", function () { planejar(ctx); },
          { desligado: !inter || !!plano, dica: !inter ? "Só numa cena de interlúdio (Condições → Novo interlúdio)." : plano ? "Uma vez por cena." : "", foco: "as9-planejar" }),
        planos.length ? botao("Gastar dados de tática (aliado, cura ou outro)…", function () { gastarTaticaLivre(ctx); }, { foco: "as9-tatica-livre" }) : null,
      ];
    },
    tiroIntuitivo: function () {
      return [linha("No resultado de um ataque à distância sem mirar: “Tiro Intuitivo: +2 na margem (2 PE)”.")];
    },
    cqb: function (ctx, o) {
      return [linha("No resultado de um ataque de Pontaria: “CQB: anular −5 contra alvo engajado (1 " + sigla(o) + ")”.")];
    },
    entradaExplosiva: function (ctx, o) {
      return [
        linha("+5 para implantar ou usar explosivos: no resultado do teste (Tática, Pontaria ou Luta)."),
        botao("Mina ou carga com ação de movimento (1 " + sigla(o) + ")", function () {
          var g = gastar(ctx, 1);
          if (!g) return;
          salvar(ctx);
          UI.aviso("Entrada Explosiva: a mina antipessoal ou carga de arrombamento é implantada com uma ação de movimento. " + g.texto, { duracao: 7000 });
        }, { foco: "as9-entrada" }),
      ];
    },
    protegerRefens: function (ctx, o) {
      var r = A9().dados(o).refens;
      return [
        r.nomes.length ? linha("Reféns protegidos nesta rodada: " + r.nomes.join(", ") + " (" + r.nomes.length + " de 3).") : null,
        botao("Proteger um refém (reação, 2 " + sigla(o) + ")…", function () { protegerRefem(ctx); }, { foco: "as9-refem" }),
      ];
    },
    alvoPrioritario: function (ctx, o) {
      var ef = A9().efeitoDoAlvo(o);
      return [
        linha(ef ? "Alvo-prioritário: " + ef.texto : "Sem alvo-prioritário. O mestre informa o VD de quem está na sua linha de visão."),
        botao(ef ? "Trocar o alvo-prioritário (5 " + sigla(o) + ")…" : "Marcar alvo-prioritário (5 " + sigla(o) + ")…", function () { marcarAlvo(ctx); }, { foco: "as9-alvo" }),
        ef ? botao("O alvo foi eliminado", function () { A9().limparAlvo(o); salvar(ctx); }, { classe: "r-botao--fantasma" }) : null,
      ];
    },
    companheiroDrone: function (ctx, o) {
      var daTrilha = A9().dronesDaTrilha(o, inventarioDe(ctx));
      var pode = A9().dronesPermitidosPelaTrilha(o);
      return [
        linha(daTrilha.length ? "Drone(s) da trilha: " + daTrilha.map(function (d) { return d.nome + " (" + d.tipos.map(function (t) { return A9().TIPOS_DRONE[t].nome; }).join(", ") + (d.estado !== "ok" ? ", " + d.estado : "") + ")"; }).join("; ") + "." : "O drone da trilha ainda não está no inventário."),
        daTrilha.length < pode ? botao(daTrilha.length ? "Receber o segundo drone (Mestre dos Drones)…" : "Receber o drone da trilha…", function () { receberDrone(ctx, daTrilha.length > 0); }, { foco: "as9-receber-drone" }) : null,
        linha("Quebrado: consertar custa 1 ação de interlúdio (com as peças); um novo, 2 ações. O estado fica nas opções do item."),
      ];
    },
    protetorDosDrones: function (ctx, o) {
      var custo = A9().custoParaEvitar(o);
      var lim = A9().limiteDaTrilha(o);
      var daTrilha = A9().dronesDaTrilha(o, inventarioDe(ctx));
      return [
        daTrilha.length ? linha("Modificações da trilha: " + daTrilha.map(function (d) { return d.nome + " " + d.modificacoesDaTrilha + "/" + lim; }).join("; ") + " (não contam para a categoria).") : null,
        daTrilha.some(function (d) { return d.modificacoesDaTrilha < lim; }) ? botao("Aplicar modificação da trilha…", function () { modificarPelaTrilha(ctx); }, { foco: "as9-mod-trilha" }) : null,
        botao("Evitar efeito negativo no drone (" + custo + " " + sigla(o) + ")", function () {
          var g = gastar(ctx, custo);
          if (!g) return;
          salvar(ctx);
          UI.aviso("Protetor dos Drones: o drone não sofre o efeito negativo (dano ou similar). " + g.texto, { duracao: 7000 });
        }, { foco: "as9-evitar" }),
      ];
    },
    asDosDrones: function () {
      return [linha("Ao falhar num teste feito com o drone: “Ás dos Drones: tentar de novo (3 PE)” no resultado — uma vez.")];
    },
    mestreDosDrones: function (ctx, o) {
      var e = A9().dados(o).drones.escolha99;
      return [
        linha(e === "segundo" ? "Escolha: um segundo drone, com 3 modificações (e o primeiro fica com 3)." : e === "seis" ? "Escolha: 6 modificações no drone." : "Escolha: 3 modificações a mais no drone (6 no total) ou um segundo drone com 3."),
        e ? null : el("div.faixa", {}, [
          botao("6 modificações no drone", function () { var r = A9().escolher99(o, "seis"); if (!r.ok) UI.avisoAtencao(r.motivo); else salvar(ctx); }),
          botao("Um segundo drone", function () { var r = A9().escolher99(o, "segundo"); if (!r.ok) UI.avisoAtencao(r.motivo); else salvar(ctx); }),
        ]),
        linha("Evitar efeito negativo no drone custa só 1 PE."),
      ];
    },
  };

  function controles(ctx, aq) {
    if (!A9() || !aq || !CONTROLES[aq.chave]) return null;
    permitidoGlobal = permitido(ctx);
    var partes = (CONTROLES[aq.chave](ctx, ordemDe(ctx)) || []).filter(Boolean);
    return partes.length ? el("div.pilha--curta.origem-controles", { class: "pilha" }, partes) : null;
  }

  function controlesDeOrigem(ctx, org) {
    if (!A9() || !org || org.chave !== "veteranoConflitoArmado") return null;
    return bloco([linha("Full Metal Jacket: num teste de Luta ou Pontaria com penalidade, o resultado oferece “ignorar a penalidade (2 PE)”.")]);
  }

  /* --- Ações dos cartões ------------------------------------------- */

  function planejar(ctx) {
    var o = ordemDe(ctx);
    var am = campoTexto("A ameaça específica futura (combate, furtividade, perseguição…)", "", 120);
    modal("Tática de Abordagem", [am.no, linha("O teste de Tática (DT 10) é rolado com os valores da ficha: 1 dado de tática passando, +1 a cada 5 acima. Os aliados que participaram do planejamento também podem receber os dados.")], "Rolar Tática", function () {
      if (!am.valor()) { UI.avisoAtencao("Diga qual é a ameaça do plano."); return false; }
      var r = rolarTeste(ctx, "tatica", "Tática · plano de abordagem");
      if (!r) return false;
      var res = A9().planejar(o, novoOp("tt"), am.valor(), r.total);
      if (!res.ok) { UI.avisoAtencao(res.motivo); return false; }
      salvar(ctx);
      mostrar(r, "Tática · Tática de Abordagem", [res.plano.dados ? "Passou (DT 10): " + res.plano.dados + " dado(s) de tática para “" + res.plano.ameaca + "”." : "Não passou na DT 10: nenhum dado de tática."]);
    });
  }

  function escolherPlano(o) {
    var planos = A9().planosComDados(o);
    return selecao(planos.map(function (p) { return { valor: p.id, rotulo: p.ameaca + " — " + p.restantes + "d6" }; }), planos[0] ? planos[0].id : "", "Plano");
  }

  function gastarTaticaLivre(ctx) {
    var o = ordemDe(ctx);
    var pl = escolherPlano(o);
    var n = campoTexto("Quantos dados", "1", 2, "number");
    var uso = selecao([{ valor: "teste", rotulo: "+1d6 em um teste" }, { valor: "dano", rotulo: "+1d6 de dano extra" }, { valor: "cura", rotulo: "+1d6 de cura extra" }], "teste", "Para");
    var quem = campoTexto("Com quem (você ou um aliado que participou do planejamento)", ctx.ficha.nome || "", 80);
    modal("Dados de tática", [pl.no, n.no, uso.no, quem.no, linha("Como reação, quantos quiser, acumulando; a qualquer distância. Só contra a ameaça do plano.")], "Gastar e rolar", function () {
      var q = parseInt(n.valor(), 10) || 1;
      var g = A9().gastarTatica(o, novoOp("tg"), pl.valor(), q);
      if (!g.ok) { UI.avisoAtencao(g.motivo); return false; }
      var r = rolarSoma(q + "d6");
      salvar(ctx);
      if (r) mostrar(r, "Dados de tática · " + (uso.valor() === "teste" ? "teste" : uso.valor() === "dano" ? "dano extra" : "cura extra") + " · " + (quem.valor() || "aliado"), ["Plano “" + g.plano.ameaca + "”: restam " + g.plano.restantes + " dado(s)."]);
    });
  }

  function ripostar(ctx) {
    var o = ordemDe(ctx);
    var c = calc(ctx);
    modal("Ripostar Ousado", [linha("Alvo de um ataque corpo a corpo, antes de saber se foi atingido: gasta a reação especial de defesa e 2 " + sigla(o) + ". Defesa contra este ataque: " + c.defesa.total + " + 5 = " + (c.defesa.total + 5) + ".")], "Ripostar (2 " + sigla(o) + ")", function () {
      var g = gastar(ctx, 2);
      if (!g) return false;
      salvar(ctx);
      UI.confirmar({ titulo: "Ripostar Ousado", texto: "Com Defesa " + (c.defesa.total + 5) + " contra o ataque: o atacante errou?", rotuloConfirmar: "Errou: contra-atacar", rotuloCancelar: "Acertou" }).then(function (errou) {
        if (!errou) { UI.aviso(g.texto); return; }
        var r = A9().armarRipostar(o, novoOp("ri"));
        if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
        salvar(ctx);
        UI.aviso("Contra-ataque: role o ataque — o resultado oferece +5 (Ripostar Ousado). " + g.texto, { duracao: 8000 });
      });
    });
  }

  function protegerRefem(ctx) {
    var o = ordemDe(ctx);
    var nome = campoTexto("Quem é o refém", "", 80);
    var perto = marca("Estou a até 3 m dele, e ele é alvo de um efeito negativo");
    var dano = marca("O efeito é dano: gastar mais 2 " + sigla(o) + " para sofrer só a metade");
    modal("Proteger Reféns", [nome.no, perto.no, dano.no, linha("Você se torna o alvo do efeito no lugar do refém. Várias vezes por rodada, mas só com até três reféns diferentes.")], "Proteger", function () {
      if (!perto.valor()) { UI.avisoAtencao("Só a até 3 m de um refém que é alvo de um efeito negativo."); return false; }
      var custo = dano.valor() ? 4 : 2;
      var c = calc(ctx);
      var disp = c.atual[c.determinacao ? "pd" : "pe"];
      if (disp < custo) { UI.avisoAtencao("Faltam " + sigla(o) + ": precisa de " + custo + "."); return false; }
      var r = A9().protegerRefem(o, novoOp("rf"), nome.valor());
      if (!r.ok) { UI.avisoAtencao(r.motivo); return false; }
      var g = gastar(ctx, custo);
      if (!g) return false;
      salvar(ctx);
      UI.aviso("Proteger Reféns: você é o alvo no lugar de " + nome.valor() + (dano.valor() ? ", e sofre metade do dano" : "") + ". " + g.texto, { duracao: 8000 });
    });
  }

  function marcarAlvo(ctx) {
    var o = ordemDe(ctx);
    var nome = campoTexto("O inimigo (que você possa ver)", "", 80);
    var vd = campoTexto("VD informado pelo mestre", "", 4, "number");
    modal("Alvo-prioritário", [nome.no, vd.no, linha("VD 200 ou menos: qualquer dano seu nele reduz os PV dele a 0. VD 201 ou mais: +5 nas margens de ameaça contra ele. Até ele ser eliminado ou você marcar outro.")], "Marcar (5 " + sigla(o) + ")", function () {
      if (!nome.valor() || vd.valor() === "") { UI.avisoAtencao("Preencha o inimigo e o VD."); return false; }
      var c = calc(ctx);
      if (c.atual[c.determinacao ? "pd" : "pe"] < 5) { UI.avisoAtencao("Faltam " + sigla(o) + ": precisa de 5."); return false; }
      var r = A9().marcarAlvo(o, novoOp("ap"), nome.valor(), vd.valor());
      if (!r.ok) { UI.avisoAtencao(r.motivo); return false; }
      var g = gastar(ctx, 5);
      salvar(ctx);
      UI.aviso("Alvo-prioritário: " + A9().efeitoDoAlvo(o).texto + (g ? " " + g.texto : ""), { duracao: 9000 });
    });
  }

  function opcoesDeTipo(excluir) {
    return Object.keys(A9().TIPOS_DRONE).filter(function (t) { return (excluir || []).indexOf(t) < 0; })
      .map(function (t) { return { valor: t, rotulo: A9().TIPOS_DRONE[t].nome + " — " + A9().TIPOS_DRONE[t].habilidade }; });
  }

  function receberDrone(ctx, segundo) {
    if (!IT()) { UI.avisoAtencao("O catálogo de itens não está nesta página."); return; }
    var tipo = selecao(opcoesDeTipo(), "atirador", "Tipo de aliado drone");
    modal(segundo ? "Segundo drone (Mestre dos Drones)" : "Companheiro Drone", [tipo.no, linha("Um drone de combate tático (p. 44) entra no inventário como o drone da trilha. As modificações da trilha não contam para a categoria.")], "Receber", function () {
      IT().carregar().then(function (cat) {
        var e = cat.porId[A9().ID_DRONE];
        var m = e ? IT().paraInventario(e, { escolha: tipo.valor(), catalogo: cat }) : null;
        if (!m || !m.ok) { UI.avisoAtencao((m && m.mensagem) || "O drone não está no catálogo."); return; }
        var item = F().criarItem(m.tipo, m.dados);
        item.adicionadoEm = U.agoraISO();
        item.ordem.as9 = Object.assign({}, item.ordem.as9, { daTrilha: true }, segundo ? { segundo: true } : {});
        inventarioDe(ctx).itens.push(item);
        salvar(ctx);
        UI.aviso(item.nome + " no inventário, como drone da trilha Piloto de Drone.");
      });
    });
  }

  function modificarPelaTrilha(ctx, itemEscolhido) {
    var o = ordemDe(ctx);
    var lista = A9().dronesDaTrilha(o, inventarioDe(ctx)).filter(function (d) { return d.modificacoesDaTrilha < A9().limiteDaTrilha(o); });
    if (itemEscolhido) lista = lista.filter(function (d) { return d.item === itemEscolhido; });
    if (!lista.length) { UI.avisoAtencao("Nenhum drone da trilha com modificação livre."); return; }
    var qual = selecao(lista.map(function (d, i) { return { valor: String(i), rotulo: d.nome + " (" + d.modificacoesDaTrilha + "/" + A9().limiteDaTrilha(o) + ")" }; }), "0", "Drone");
    var tipo = selecao(opcoesDeTipo(), "protetor", "Modificação de drone (p. 46)");
    modal("Modificação da trilha Piloto de Drone", [qual.no, tipo.no, linha("Não conta para o limite de categoria. Um tipo que o drone já tem não se acumula.")], "Aplicar", function () {
      var d = lista[parseInt(qual.valor(), 10) || 0];
      var pode = A9().podeModificarPelaTrilha(o, inventarioDe(ctx), d.item);
      if (!pode.ok) { UI.avisoAtencao(pode.motivo); return false; }
      if (d.tipos.indexOf(tipo.valor()) >= 0) { UI.avisoAtencao(d.nome + " já tem " + A9().TIPOS_DRONE[tipo.valor()].nome + "."); return false; }
      IT().carregar().then(function (cat) {
        var e = cat.porId["as9.mod.drone." + tipo.valor()];
        var r = e ? IT().aplicar(e, d.item, { daTrilha: true }) : { ok: false, motivo: "A modificação não está no catálogo." };
        if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
        salvar(ctx);
        UI.aviso(e.nome + " aplicada em " + d.nome + " (da trilha, sem acréscimo de categoria).");
      });
    });
  }

  /* =================================================================
     NO RESULTADO DO TESTE
     ================================================================= */

  var RESISTENCIAS = ["fortitude", "reflexos", "vontade"];

  function acoesNoTeste(ctx, o, p, r, dado, bonus, atributo) {
    if (!A9() || !permitido(ctx)) return [];
    var saida = [];
    var ultimo = r;
    function unico(rotulo, f) {
      var usado = false;
      saida.push({ rotulo: rotulo, aoClicar: function (cartao, b) { if (usado) return; var x = f(); if (x !== false) { usado = true; if (b) b.disabled = true; } } });
    }
    function somar(valor, rot, notas) {
      ultimo = Object.assign({}, ultimo, { total: ultimo.total + valor, parcelas: (ultimo.parcelas || []).concat([{ rotulo: rot, valor: valor }]) });
      mostrar(ultimo, p.nome + " · " + rot, notas);
    }
    function deNovo(rot, custo, nota) {
      unico(rot, function () {
        var g = gastar(ctx, custo);
        if (!g) return false;
        salvar(ctx);
        var n = D().dependente({ expressao: dado, sigla: "", nome: p.nome, bonus: bonus.total, modificadores: [] });
        if (!n || !n.ok) return false;
        n.parcelas = [n.parcelas[0]].concat(bonus.parcelas.map(function (x) { return { rotulo: x.rotulo, valor: x.valor }; }));
        mostrar(n, p.nome + " · nova tentativa", [nota + " " + g.texto]);
      });
    }

    /* Full Metal Jacket (Veterano de Conflito Armado). */
    if ((p.chave === "luta" || p.chave === "pontaria") && C().origem && o.origem === "veteranoConflitoArmado") {
      fullMetalJacket(ctx, o, r, unico, function (novo, notas) { ultimo = novo; mostrar(novo, p.nome + " · Full Metal Jacket", notas); });
    }
    /* Dados de tática: +1d6 no teste. */
    if (A9().dadosDeTatica(o) > 0) unico("Dado de tática: +1d6…", function () { taticaNoTeste(ctx, o, function (v, rot, notas) { somar(v, rot, notas); }); });
    /* Entrada Explosiva: +5 para implantar/usar explosivos. */
    if (tem(o, "entradaExplosiva") && ["tatica", "pontaria", "luta", "tecnologia"].indexOf(p.chave) >= 0) {
      unico("Entrada Explosiva: +5 (implantar ou usar explosivos)", function () { somar(5, "Entrada Explosiva", ["Só em testes para implantar ou utilizar explosivos (C4, granadas…)."]); });
    }
    /* Analisar Perigo (Tática treinada, DT 15). */
    if (p.chave === "tatica" && liberado() && A9().grauDe(o, "tatica") >= 1 && !A9().analisarUsadoNaCena(o)) {
      unico("Usar como Analisar Perigo (ação de movimento)", function () {
        var res = A9().analisar(o, novoOp("an"), ultimo.total);
        if (!res.ok) { UI.avisoAtencao(res.motivo); return false; }
        if (res.bonus > 0) {
          var inst = efeitoEmMim(ctx, { nome: "Analisar Perigo", fonte: "Arquivos Secretos 9, p. 38", descricao: "+" + res.bonus + " em testes e na Defesa até o fim do seu próximo turno.",
            modificadores: [{ alvo: "testes", tipo: "bonus", valor: res.bonus }, { alvo: "defesa", tipo: "bonus", valor: res.bonus }],
            duracao: { tipo: "turnos", turnos: 1, momento: "fim" } });
          if (inst) A9().dados(o).analisar.efeitoId = inst.id;
        }
        salvar(ctx);
        UI.aviso(res.bonus > 0 ? "Analisar Perigo (" + ultimo.total + " contra DT 15): +" + res.bonus + " em testes e na Defesa até o fim do seu próximo turno." : "Analisar Perigo: " + ultimo.total + " não alcança a DT 15. Uso da cena gasto.", { duracao: 8000 });
      });
    }
    /* Drones. */
    var inv = inventarioDe(ctx);
    if (RESISTENCIAS.indexOf(p.chave) >= 0 && A9().temHabilidade(inv, "protetor")) {
      unico("Alerta de Ameaça: +5 (2 " + sigla(o) + ")", function () { var g = gastar(ctx, 2); if (!g) return false; salvar(ctx); somar(5, "Alerta de Ameaça", [g.texto]); });
    }
    if (p.chave === "tecnologia" && A9().temHabilidade(inv, "hacker")) {
      unico("Acelerar e Ocultar: hackear como ação completa sem a penalidade (2 " + sigla(o) + ")", function () {
        var g = gastar(ctx, 2); if (!g) return false; salvar(ctx);
        var neg = A9().penalidades(ultimo);
        var v = neg.length ? -neg.reduce(function (s, x) { return s + x.valor; }, 0) : 5;
        somar(v, "Acelerar e Ocultar", [(neg.length ? "Penalidade anulada. " : "Anula a penalidade de hackear como ação completa (OPRPG p. 49). ") + g.texto]);
      });
      deNovo("Acelerar e Ocultar: falhou hackeando, tentar de novo com a mesma informação (uma vez)", 0, "Nova tentativa com a mesma informação (Acelerar e Ocultar). Falhando por 5 ou mais, 3 PE evitam ser rastreado.");
    }
    var utilitario = A9().habilidadesDisponiveis(inv).filter(function (h) { return h.tipo === "utilitario" && h.drone.pericia === p.chave; })[0];
    if (utilitario) deNovo("Meu Amigo Drone: falhou, tentar de novo (3 " + sigla(o) + ")", 3, "Meu Amigo Drone (" + utilitario.drone.nome + "): só mais uma vez.");
    if (tem(o, "asDosDrones") && A9().drones(inv).length) {
      unico("Ás dos Drones: falhou com o drone, tentar de novo (3 " + sigla(o) + ")…", function () {
        UI.confirmar({ titulo: "Ás dos Drones", texto: "Este teste foi feito a partir do uso de um drone e falhou?", rotuloConfirmar: "Sim, 3 " + sigla(o) }).then(function (sim) {
          if (!sim) return;
          var g = gastar(ctx, 3); if (!g) return; salvar(ctx);
          var n = D().dependente({ expressao: dado, sigla: "", nome: p.nome, bonus: bonus.total, modificadores: [] });
          if (n && n.ok) mostrar(n, p.nome + " · Ás dos Drones", ["Nova tentativa — só mais uma vez. " + g.texto]);
        });
      });
    }
    return saida;
  }

  function taticaNoTeste(ctx, o, aplicar) {
    var pl = escolherPlano(o);
    var n = campoTexto("Quantos dados", "1", 2, "number");
    var ameaca = marca("Estou lidando com a ameaça deste plano");
    modal("Dado de tática", [pl.no, n.no, ameaca.no], "Gastar e somar", function () {
      if (!ameaca.valor()) { UI.avisoAtencao("Dados de tática só valem contra a ameaça do plano."); return false; }
      var q = parseInt(n.valor(), 10) || 1;
      var g = A9().gastarTatica(o, novoOp("tg"), pl.valor(), q);
      if (!g.ok) { UI.avisoAtencao(g.motivo); return false; }
      var d = rolarSoma(q + "d6");
      salvar(ctx);
      if (d) aplicar(d.total, "Tática (" + q + "d6 = " + d.total + ")", ["Plano “" + g.plano.ameaca + "”: restam " + g.plano.restantes + "."]);
    });
  }

  /* Full Metal Jacket: tira as penalidades numéricas da rolagem; outra
     penalidade (da mesa) pode ser informada. Dados a menos: anote. */
  function fullMetalJacket(ctx, o, r, unico, reexibir) {
    var neg = A9().penalidades(r);
    unico("Full Metal Jacket: ignorar a penalidade (2 " + sigla(o) + ")…", function () {
      var outra = campoTexto("Outra penalidade da mesa (número, ex.: 5)", "", 3, "number");
      modal("Full Metal Jacket", [
        linha(neg.length ? "Penalidades na rolagem: " + neg.map(function (x) { return x.rotulo + " " + x.valor; }).join("; ") + "." : "A rolagem não tem penalidade numérica."),
        outra.no,
        linha("Penalidade em dados (dados a menos): role de novo sem ela — a ficha não tira dados de uma rolagem feita."),
      ], "Ignorar (2 " + sigla(o) + ")", function () {
        var extra = Math.abs(parseInt(outra.valor(), 10) || 0);
        if (!neg.length && !extra) { UI.avisoAtencao("Não há penalidade para ignorar."); return false; }
        var g = gastar(ctx, 2);
        if (!g) return false;
        salvar(ctx);
        var soma = -neg.reduce(function (s, x) { return s + x.valor; }, 0) + extra;
        reexibir(Object.assign({}, r, { total: r.total + soma, parcelas: (r.parcelas || []).filter(function (x) { return neg.indexOf(x) < 0; }).concat(extra ? [{ rotulo: "Penalidade da mesa anulada", valor: extra }] : []) }),
          ["Full Metal Jacket: penalidade ignorada (+" + soma + "). " + g.texto]);
      });
    });
    return true;
  }

  /* =================================================================
     NO RESULTADO DO ATAQUE E NO DANO
     ================================================================= */

  /* extra: { margem, distancia, pericia, rolarDano(critico) } */
  function acoesNoAtaque(ctx, arma, r, critico, ef, extra) {
    if (!A9() || !permitido(ctx)) return { acoes: [], notas: [] };
    var o = ordemDe(ctx);
    var x = extra || {};
    var acoes = [], notas = [];
    var estado = { r: r, margem: x.margem || 20, critico: critico, rotulos: [] };
    var nome = arma.nome + " · Ataque";
    function reexibir(nota) {
      estado.critico = D().ehCritico(estado.r.natural, estado.margem);
      mostrar(estado.r, nome + " · " + estado.rotulos.join(" · "), [nota, "Margem de ameaça: " + estado.margem + "."].filter(Boolean),
        x.rolarDano ? [{ rotulo: estado.critico ? "Rolar dano crítico" : "Rolar dano", aoClicar: function () { x.rolarDano(estado.critico); } }] : [], estado.critico);
    }
    function somar(v, rot, nota) {
      estado.r = Object.assign({}, estado.r, { total: estado.r.total + v, parcelas: (estado.r.parcelas || []).concat([{ rotulo: rot, valor: v }]) });
      estado.rotulos.push(rot);
      reexibir(nota);
    }
    function margem(v, rot, nota) { estado.margem = Math.max(1, estado.margem - v); estado.rotulos.push(rot); reexibir(nota); }
    function unico(rotulo, f) {
      var usado = false;
      acoes.push({ rotulo: rotulo, aoClicar: function (cartao, b) { if (usado) return; if (f() !== false) { usado = true; if (b) b.disabled = true; } } });
    }

    if ((x.pericia === "luta" || x.pericia === "pontaria") && o.origem === "veteranoConflitoArmado") {
      fullMetalJacket(ctx, o, r, unico, function (novo, ns) { estado.r = novo; estado.rotulos.push("Full Metal Jacket"); reexibir(ns[0]); });
    }
    if (x.distancia && tem(o, "tiroIntuitivo")) {
      unico("Tiro Intuitivo: +2 na margem (2 " + sigla(o) + ")…", function () {
        UI.confirmar({ titulo: "Tiro Intuitivo", texto: "Este ataque à distância foi feito sem a ação mirar?", rotuloConfirmar: "Sim, 2 " + sigla(o) }).then(function (sim) {
          if (!sim) return;
          var g = gastar(ctx, 2); if (!g) return; salvar(ctx);
          margem(2, "Tiro Intuitivo", g.texto);
        });
      });
    }
    if (x.pericia === "pontaria" && tem(o, "cqb")) {
      unico("CQB: anular −5 contra alvo engajado (1 " + sigla(o) + ")…", function () {
        UI.confirmar({ titulo: "CQB", texto: "O alvo está engajado em combate corpo a corpo (penalidade de −5 neste ataque)?", rotuloConfirmar: "Sim, 1 " + sigla(o) }).then(function (sim) {
          if (!sim) return;
          var g = gastar(ctx, 1); if (!g) return; salvar(ctx);
          somar(5, "CQB", "Penalidade de −5 por alvo engajado anulada. " + g.texto);
        });
      });
    }
    var alvo = A9().efeitoDoAlvo(o);
    if (alvo && alvo.tipo === "margem") {
      unico("Contra o alvo-prioritário: +5 na margem", function () {
        UI.confirmar({ titulo: "Alvo-prioritário", texto: "Este ataque é contra " + A9().dados(o).alvo.nome + "?", rotuloConfirmar: "Sim" }).then(function (sim) { if (sim) margem(5, "Alvo-prioritário", alvo.texto); });
      });
    }
    if (alvo && alvo.tipo === "zerar") notas.push("Alvo-prioritário: " + alvo.texto);
    if (A9().ripostarPendente(o) && !x.distancia) {
      unico("Ripostar Ousado: +5 no contra-ataque", function () { A9().usarRipostar(o); ctx.alterou(); somar(5, "Ripostar Ousado", "Contra-ataque depois de o atacante errar."); });
    }
    if (A9().temHabilidade(inventarioDe(ctx), "atirador") && !A9().metralharPendente(o)) {
      unico("Metralhar Tudo (2 " + sigla(o) + "): +2d8 balístico se acertar", function () {
        var g = gastar(ctx, 2); if (!g) return false;
        A9().armarMetralhar(o); salvar(ctx);
        UI.aviso("Metralhar Tudo: se o ataque acertar, a rolagem de dano soma +2d8 de dano balístico. " + g.texto, { duracao: 7000 });
      });
    }
    if (A9().dadosDeTatica(o) > 0) unico("Dado de tática: +1d6…", function () { taticaNoTeste(ctx, o, function (v, rot, ns) { somar(v, rot, ns[0]); }); });
    return { acoes: acoes, notas: notas };
  }

  /* Somado à rolagem de dano sem clique: Metralhar Tudo armado. */
  function noDano(ctx, arma, r) {
    if (!A9()) return [];
    var o = ordemDe(ctx);
    var notas = [];
    if (A9().metralharPendente(o)) {
      var d = rolarSoma("2d8");
      A9().usarMetralhar(o);
      ctx.alterou();
      if (d) { r.parcelas.push({ rotulo: "Metralhar Tudo (2d8)", valor: d.total }); r.total += d.total; notas.push("Metralhar Tudo: +" + d.total + " de dano balístico (2d8)."); }
    }
    var alvo = A9().efeitoDoAlvo(o);
    if (alvo && alvo.tipo === "zerar") notas.push("Se o alvo é " + A9().dados(o).alvo.nome + " (alvo-prioritário, VD " + A9().dados(o).alvo.vd + "): qualquer dano reduz os PV dele a 0.");
    return notas;
  }
  function acoesNoDano(ctx, arma, r) {
    if (!A9() || !permitido(ctx)) return [];
    var o = ordemDe(ctx);
    if (A9().dadosDeTatica(o) <= 0) return [];
    var usado = false;
    var ultimo = r;
    return [{ rotulo: "Dado de tática: +1d6 de dano…", aoClicar: function (cartao, b) {
      if (usado) return;
      taticaNoTeste(ctx, o, function (v, rot, ns) {
        usado = true; if (b) b.disabled = true;
        ultimo = Object.assign({}, ultimo, { total: ultimo.total + v, parcelas: (ultimo.parcelas || []).concat([{ rotulo: rot, valor: v }]) });
        mostrar(ultimo, arma.nome + " · Dano · " + rot, ns);
      });
    } }];
  }

  /* =================================================================
     CONDIÇÕES E CENA
     ================================================================= */

  function condicoes(ctx) {
    if (!A9()) return null;
    var o = ordemDe(ctx);
    if (!o.arquivo9) return null;
    var partes = [];
    A9().planosComDados(o).forEach(function (p) { partes.push(linha("Dados de tática: " + p.restantes + "d6 contra “" + p.ameaca + "” (somem no próximo interlúdio).")); });
    var al = A9().efeitoDoAlvo(o);
    if (al) partes.push(linha("Alvo-prioritário: " + al.texto));
    if (A9().ripostarPendente(o)) partes.push(linha("Ripostar Ousado: +5 no contra-ataque desta rodada."));
    if (A9().metralharPendente(o)) partes.push(linha("Metralhar Tudo armado: +2d8 no próximo dano."));
    if (tem(o, "municiadorAmbulante") && A9().dados(o).municiar.pacotes) partes.push(linha("Municiador Ambulante: " + A9().dados(o).municiar.pacotes + " pacote(s) preparado(s), sem ocupar espaço."));
    return partes.length ? bloco([el("h4.t-secao", { texto: "Hell Hunters" })].concat(partes)) : null;
  }

  /* Novo interlúdio: os dados de tática não gastos somem. */
  function aoNovoInterludio(ctx) {
    if (!A9()) return [];
    var o = ordemDe(ctx);
    var cena = A9().cenaDe(o);
    var r = A9().aoComecarInterludio(o, cena);
    return r.perdidos ? ["Tática de Abordagem: " + r.perdidos + " dado(s) de tática não gasto(s) se perderam com o novo interlúdio."] : [];
  }

  /* =================================================================
     DRONES: ABA ALIADOS E INVENTÁRIO
     ================================================================= */

  function textoDoBonus(t, dr) {
    return t === "atirador" ? "+1d20 em testes de ataque" : t === "espiao" ? "+1d20 em Investigação e Percepção (com o drone); visão no escuro"
      : t === "hacker" ? "+1d20 em Tecnologia (com o drone); hackear a distância" : t === "inteligente" ? "opera por comandos de voz, sem as mãos"
      : t === "medico" ? "treinado em Medicina (já treinado: +1d20)" : t === "protetor" ? "+5 na Defesa"
      : "+1d20 em " + (dr.pericia && C().pericia(dr.pericia) ? C().pericia(dr.pericia).nome : "uma perícia a escolher");
  }

  function usarHabilidade(ctx, dr, t) {
    var o = ordemDe(ctx);
    var info = A9().TIPOS_DRONE[t];
    if (t === "medico") {
      var g = gastar(ctx, 2); if (!g) return;
      salvar(ctx);
      var r = rolarSoma("2d8+2");
      if (r) mostrar(r, "Robô ao Resgate (" + dr.nome + ")", ["Cura um alvo adjacente ao drone. " + g.texto], [{ rotulo: "Curar em mim", aoClicar: function (c, b) { var x = curaEmMim(ctx, r.total); if (x) { if (b) b.disabled = true; salvar(ctx); UI.aviso("PV " + x.antes + " → " + x.depois + "."); } } }]);
      return;
    }
    if (t === "espiao" || t === "inteligente") {
      var g2 = gastar(ctx, 2); if (!g2) return;
      efeitoEmMim(ctx, { nome: info.habilidade, fonte: "Arquivos Secretos 9, p. 45", descricao: t === "espiao" ? "Câmera com visão térmica (ignora camuflagem); testes de Tecnologia pelo drone para captar ondas de rádio." : "O drone carrega até 5 espaços e faz trabalhos manuais simples e lentos.", modificadores: [] });
      salvar(ctx);
      UI.aviso(info.habilidade + " até o fim da cena. " + g2.texto, { duracao: 7000 });
      return;
    }
    UI.aviso(info.habilidade + ": aparece no resultado do " + (t === "atirador" ? "ataque" : "teste") + ".", { duracao: 6000 });
  }

  function painelDeAliados(ctx) {
    if (!A9() || !ctx.ficha.ordem) return null;
    var lista = A9().drones(inventarioDe(ctx));
    if (!lista.length) return null;
    permitidoGlobal = permitido(ctx);
    return UI.painel("Drones", el("div.pilha", {}, lista.map(function (dr) {
      var pode = A9().podeUsarHabilidade(dr);
      return el("article.r-painel", {}, [
        el("h3.t-secao", { texto: dr.nome + (dr.daTrilha ? " · drone da trilha" : "") }),
        linha("Estado: " + (dr.estado === "ok" ? "funcionando" : dr.estado) + " · " + (dr.empunhado ? "operado com as duas mãos" : dr.maosLivres ? "comandos de voz (Inteligente)" : "guardado") + "."),
        dr.tipos.length ? el("ul.t-mini", {}, dr.tipos.map(function (t) {
          var info = A9().TIPOS_DRONE[t];
          return el("li", {}, [
            el("strong", { texto: info.nome + ". " }),
            el("span", { texto: "Bônus (passivo): " + textoDoBonus(t, dr) + ". Habilidade: " + info.habilidade + " (" + info.custo + " PE)" + (pode ? "." : " — só operando com as duas mãos.") }),
            pode && ["medico", "espiao", "inteligente"].indexOf(t) >= 0 ? botao(info.habilidade + " (" + info.custo + " PE)", function () { usarHabilidade(ctx, dr, t); }) : null,
          ]);
        })) : linha("Sem tipo: escolha o tipo nas opções do item."),
        dr.estado === "quebrado" ? linha("Quebrado: não dá bônus nem habilidades até ser consertado.", "t-erro") : null,
      ]);
    })));
  }

  function opcoesDoItem(ctx, item) {
    if (!A9() || !item || !A9().ehDrone(item) || !permitido(ctx)) return [];
    var o = ordemDe(ctx);
    var dr = A9().drone(item);
    var d = dadosDoItem(item);
    var l = [];
    l.push({ rotulo: d.empunhada ? "Parar de operar o drone" : "Operar o drone (duas mãos)", aoClicar: function () {
      if (!item.ordem) item.ordem = {};
      if (d.empunhada) delete item.ordem.empunhada; else item.ordem.empunhada = true;
      salvar(ctx);
    } });
    if (!dr.tipo) l.push({ rotulo: "Escolher o tipo do drone…", aoClicar: function () {
      var t = selecao(opcoesDeTipo(dr.tipos), "atirador", "Tipo de aliado drone");
      modal("Tipo do drone", [t.no], "Escolher", function () { var r = A9().definirDoDrone(item, "tipo", t.valor()); if (!r.ok) { UI.avisoAtencao(r.motivo); return false; } salvar(ctx); });
    } });
    if (dr.tipos.indexOf("utilitario") >= 0 && !dr.pericia) l.push({ rotulo: "Perícia do Drone Utilitário…", aoClicar: function () {
      var ops = C().PERICIAS.filter(function (p) { return A9().FORA_DO_UTILITARIO.indexOf(p.chave) < 0; }).map(function (p) { return { valor: p.chave, rotulo: p.nome }; });
      var s = selecao(ops, ops[0].valor, "Perícia (não muda depois)");
      modal("Drone Utilitário", [s.no], "Escolher", function () { var r = A9().definirDoDrone(item, "pericia", s.valor()); if (!r.ok) { UI.avisoAtencao(r.motivo); return false; } salvar(ctx); });
    } });
    ["ok", "danificado", "quebrado"].filter(function (e) { return e !== dr.estado; }).forEach(function (e) {
      l.push({ rotulo: e === "ok" ? "Drone consertado" : e === "danificado" ? "Drone danificado" : "Drone quebrado", aoClicar: function () { A9().definirDoDrone(item, "estado", e); salvar(ctx); } });
    });
    if (dr.daTrilha && A9().limiteDaTrilha(o) > dr.modificacoesDaTrilha) l.push({ rotulo: "Modificação da trilha Piloto de Drone…", aoClicar: function () { modificarPelaTrilha(ctx, item); } });
    return l;
  }

  function observacoesDoItem(ctx, item) {
    if (!A9() || !item || !A9().ehDrone(item)) return [];
    var o = ordemDe(ctx);
    var dr = A9().drone(item);
    var l = [];
    l.push(["Drone", dr.tipos.length ? dr.tipos.map(function (t) { return A9().TIPOS_DRONE[t].nome; }).join(", ") + (dr.pericia && C().pericia(dr.pericia) ? " (Utilitário: " + C().pericia(dr.pericia).nome + ")" : "") : "sem tipo escolhido"]);
    l.push(["Habilidades", A9().podeUsarHabilidade(dr) ? "disponíveis (" + (dr.empunhado ? "operado com as duas mãos" : "comandos de voz") + ")" : dr.estado === "quebrado" ? "quebrado" : "só operando com as duas mãos"]);
    if (dr.estado !== "ok") l.push(["Estado", dr.estado]);
    if (dr.daTrilha) l.push(["Da trilha", dr.modificacoesDaTrilha + "/" + A9().limiteDaTrilha(o) + " modificações (sem acréscimo de categoria)"]);
    return l;
  }

  global.RAMAFichaArquivo9 = {
    controles: controles,
    controlesDeOrigem: controlesDeOrigem,
    acoesNoTeste: acoesNoTeste,
    acoesNoAtaque: acoesNoAtaque,
    noDano: noDano,
    acoesNoDano: acoesNoDano,
    condicoes: condicoes,
    aoNovoInterludio: aoNovoInterludio,
    painelDeAliados: painelDeAliados,
    opcoesDoItem: opcoesDoItem,
    observacoesDoItem: observacoesDoItem,
  };
})(window);
