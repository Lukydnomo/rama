/* =====================================================================
   R.A.M.A. — Ficha de Ordem · Arquivos Secretos 6
   =====================================================================
   A tela do que o AS6 põe numa ficha. A regra mora em
   js/ordem/arquivo6.js; aqui, só desenho, clique e gravação.

     painel(ctx)                no alto da aba Habilidades, só com o que
                                se aplica: a rodada, a marca do Salto de
                                Dados, os Grilhões da cena, Hesitação
                                Forçada sobre esta ficha, o recebido de
                                Grão-Mestre e o rebote do Aplicador
     controles(ctx, aq)         os botões no cartão de um poder (e nos
                                de Paramédico e Equipe de Trauma)
     controlesDeOrigem(ctx,org) Cobaia Sobrevivente
     acoesNoTeste               Análise Combativa, Doutor em Emergências,
                                Resgatar da Morte, tratamento guardado e
                                a rolagem de novo da Hesitação Forçada
     condicoes(ctx)             doenças e venenos, na seção Condições
     botoesDeCondicoes(ctx)     registrar doença, veneno ou o recebido
     aoTrocarDeCena             a imunidade da cena que sai, o rebote
     opcoesNoRitual,            Grão-Mestre em Elemento em "Usar ritual"
     aplicarNoRitual
     notasDoDano                Dominador de Elemento na rolagem de dano
     opcoesDoItem,              medicamentos (aplicar), Anel Invertido,
     observacoesDoItem          arma envelhecida, kit de medicina
     corpoDaRegra               Evolução Modular: associar escolhas e
                                reclassificar os ambíguos

   Nada é rolado sem clique, nenhum dano é aplicado a outra ficha daqui
   e nada narrativo é resolvido pela ficha: a mesa confirma.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var el = U.el;

  function A6() { return global.RAMAOrdemArquivo6; }
  function A5() { return global.RAMAOrdemArquivo5 || null; }
  function R() { return global.RAMAOrdemRegras; }
  function C() { return global.RAMAOrdemCatalogo; }
  function D() { return global.RAMADados; }
  function CD() { return global.RAMAOrdemCondicoes || null; }
  function EF() { return global.RAMAOrdemEfeitos || null; }
  function I() { return global.RAMAOrdemInventario || null; }
  function IT() { return global.RAMAOrdemItens || null; }
  function E() { return global.RAMAOrdemProgressao || null; }
  function P() { return global.RAMAOrdemPoderes || null; }
  function F() { return global.RAMAFicha; }

  function ordemDe(ctx) { return ctx.ficha.ordem; }
  function calc(ctx) { return R().calcular(ordemDe(ctx), ctx.ficha.inventario); }
  function salvar(ctx) { ctx.alterou(); ctx.redesenhar(); }
  function permitido(ctx) { return !ctx.podeEditar || ctx.podeEditar(); }
  function tem(o, k) { return !!(A6() && A6().temPoder(o, k)); }
  function sigla(o) { return R().usaDeterminacao(o) ? "PD" : "PE"; }
  function opId(prefixo) { return prefixo + "-" + String(U.uuid()).replace(/[^A-Za-z0-9]/g, "").slice(0, 20); }
  function dadosDoItem(item) { return I() ? I().dadosDoItem(item) : ((item && item.ordem) || {}); }
  function itens(ctx) { return (ctx.ficha.inventario && ctx.ficha.inventario.itens) || []; }
  function nomeDaFicha(ctx) { return String(ctx.ficha.nome || "Personagem").slice(0, 80); }
  function cenaAtual(o) { return (o.condicoes && o.condicoes.cena && o.condicoes.cena.id) || "inicial"; }

  function somar(expr) {
    var r = D() && D().total ? D().total(expr) : (D() && D().somar ? D().somar(expr) : null);
    return r && r.ok !== false ? r : { total: 0, rolagens: [] };
  }
  function rolar(expr) { return somar(expr).total; }

  function gastar(ctx, quanto) {
    var o = ordemDe(ctx);
    var c = calc(ctx);
    var qual = c.determinacao ? "pd" : "pe";
    var maximo = qual === "pd" ? c.pd.total : c.pe.total;
    var atual = c.atual[qual];
    var r = CD() ? CD().aplicarAcao(qual, "gastar", { cond: o.condicoes, atual: atual, maximo: maximo, valor: quanto, pd: c.determinacao }) : null;
    if (!r || !r.ok) { UI.avisoAtencao((r && r.motivo) || "Sem " + qual.toUpperCase() + " suficientes."); return null; }
    if (!o.recursos) o.recursos = { pv: null, pe: null, san: null, pd: null };
    o.recursos[qual] = r.valor;
    return { qual: qual.toUpperCase(), antes: atual, depois: r.valor };
  }
  function recuperar(ctx, qual, n) {
    var o = ordemDe(ctx);
    var c = calc(ctx);
    if (qual === "pe" && c.determinacao) qual = "pd";
    var maximo = qual === "pv" ? c.pv.total : qual === "pe" ? c.pe.total : qual === "pd" ? (c.pd ? c.pd.total : 0) : c.san.total;
    var atual = c.atual[qual];
    var novo = Math.max(0, Math.min(maximo, (Number(atual) || 0) + n));
    if (!o.recursos) o.recursos = { pv: null, pe: null, san: null, pd: null };
    o.recursos[qual] = novo;
    return { qual: qual.toUpperCase(), antes: atual, depois: novo, maximo: maximo };
  }
  /* Perda de PV (veneno, maldição): não é dano — RD não reduz. */
  function perderPv(ctx, n) {
    var o = ordemDe(ctx);
    var c = calc(ctx);
    var atual = Number(c.atual.pv) || 0;
    var novo = Math.max(0, atual - Math.max(0, n));
    if (!o.recursos) o.recursos = { pv: null, pe: null, san: null, pd: null };
    o.recursos.pv = novo;
    return { antes: atual, depois: novo };
  }
  /* PV temporários da cena: a mesma fonte não se soma a si mesma. */
  function temporarioDaCena(o, chave, valor, fonte) {
    if (!Array.isArray(o.temporariosDeCena)) o.temporariosDeCena = [];
    var cena = cenaAtual(o);
    var antigo = o.temporariosDeCena.filter(function (x) { return x.chave === chave && x.recurso === "pv"; })[0];
    var antes = antigo && antigo.cena === cena ? antigo.valor : 0;
    o.temporariosDeCena = o.temporariosDeCena.filter(function (x) { return !(x.chave === chave && x.recurso === "pv"); });
    o.temporariosDeCena.push({ chave: chave, recurso: "pv", valor: valor, cena: cena, fonte: fonte });
    if (o.recursos && o.recursos.pv !== null && o.recursos.pv !== undefined) o.recursos.pv += Math.max(0, valor - antes);
  }
  function agente(ctx) {
    var ag = global.RAMAAuth && global.RAMAAuth.agente ? global.RAMAAuth.agente() : null;
    return { id: ag ? ag.id : "", nome: ag ? (ag.nome || ag.usuario || "") : "", papel: ctx.ehDono && !ctx.ehDono() ? "mestre" : "jogador" };
  }
  function efeitoEmMim(ctx, dados) {
    var o = ordemDe(ctx);
    if (!EF()) return null;
    var inst = EF().criarInstancia(Object.assign({ alvoNome: ctx.ficha.nome, cena: cenaAtual(o), aplicadoPor: agente(ctx), duracao: { tipo: "cena" } }, dados));
    var r = EF().aplicar(o.condicoes, inst, "nova");
    return r && r.ok ? r.instancia : null;
  }

  var permitidoGlobal = true;
  function botao(texto, aoClicar, op) {
    var x = op || {};
    return el("button.r-botao.r-botao--mini", { type: "button", texto: texto, disabled: !!x.desligado || !permitidoGlobal, title: x.dica || "", onclick: aoClicar });
  }
  function linha(texto, classe) { return el("p.t-mini" + (classe ? "." + classe : ""), { texto: texto }); }
  function titulo(texto) { return el("h4.t-secao", { texto: texto }); }
  function bloco(partes) { return el("div.pilha--curta", { class: "pilha" }, partes.filter(Boolean)); }
  function mostrar(r, nome, notas, acoes) { global.RAMARolagens.mostrar(r, { nome: nome, notas: notas || [], acoes: acoes || [] }); }
  function select(opcoes, valor, aoMudar, rotulo) {
    return el("select.r-selecao", { "aria-label": rotulo || "", onchange: aoMudar ? function (ev) { aoMudar(ev.target.value); } : null },
      opcoes.map(function (op) { return el("option", { value: op.valor, texto: op.rotulo, selected: op.valor === valor }); }));
  }
  function rotulado(rotulo, controle) { return el("label.r-campo", {}, [el("span.r-rotulo", { texto: rotulo }), controle]); }
  function marca(texto, aoMudar, ligada) {
    return el("label.r-marca", {}, [el("input", { type: "checkbox", checked: !!ligada, onchange: function (ev) { aoMudar(ev.target.checked); } }), el("span", { texto: texto })]);
  }
  function rolagemDe(nome, expr) {
    var s = somar(expr);
    return { ok: true, tipo: "soma", nome: nome, expressao: expr, total: s.total, rolagens: s.rolagens || [], parcelas: [{ rotulo: expr, valor: s.total }] };
  }
  function rotuloCat(c) { return IT() && IT().rotuloCategoria ? IT().rotuloCategoria(c) : String(c === undefined || c === null ? "0" : c); }
  function nomeElemento(e) { return { sangue: "Sangue", morte: "Morte", conhecimento: "Conhecimento", energia: "Energia", medo: "Medo" }[e] || e; }
  var ROMANOS = ["—", "I", "II", "III", "IV"];

  /* =================================================================
     O PAINEL (aba Habilidades)
     ================================================================= */

  function painel(ctx) {
    if (!A6() || !F().ehDeOrdem(ctx.ficha)) return null;
    var o = ordemDe(ctx);
    A6().dados(o);
    permitidoGlobal = permitido(ctx);
    var partes = [
      secaoRodada(ctx, o),
      secaoSalto(ctx, o),
      secaoGrilhoes(ctx, o),
      secaoHesitacao(ctx, o),
      secaoRecebidos(ctx, o),
      secaoRebotes(ctx, o),
    ].filter(Boolean);
    if (!partes.length) return null;
    return el("section.as3-painel.as6-painel", { "aria-label": "Arquivos Secretos 6" }, [titulo("Arquivos Secretos 6")].concat(partes));
  }

  /* A rodada da ficha é a do Arquivos Secretos 5: aparece aqui só quando
     o painel do AS5 não a mostra. */
  function precisaDeRodada(o) {
    return (tem(o, "escudoEspiralTemporal") && !A6().comAfinidade(o, "escudoEspiralTemporal")) || tem(o, "medicoDaSalvacao");
  }
  function secaoRodada(ctx, o) {
    if (!A5() || !precisaDeRodada(o)) return null;
    var F5 = global.RAMAFichaArquivo5;
    if (F5 && F5.precisaDeRodada && F5.precisaDeRodada(ctx, o)) return null;
    return el("div.faixa", {}, [
      linha("Rodada " + A5().rodada(o) + " desta cena (conta o “uma vez por rodada” do Escudo Espiral Temporal e do Médico da Salvação)."),
      botao("Próxima rodada", function () { A5().proximaRodada(o); salvar(ctx); }),
    ]);
  }

  function secaoSalto(ctx, o) {
    var m = A6().dados(o).salto.marca;
    if (!m && !tem(o, "saltoDeDados")) return null;
    if (!m) return null;
    var v = A6().validadeDaMarca(o);
    var r = m.retrato.recursos;
    return bloco([
      titulo("Salto de Dados"),
      linha("Marca feita " + (m.dia ? "no dia " + m.dia + " da cronologia" : "nesta campanha") + " — dura " + (m.afinidade ? "1 ano" : "1 dia") + " ou até ser consumida." +
        " Retrato: PV " + (r.pv === null ? "cheio" : r.pv) + ", " + (r.pd !== null && R().usaDeterminacao(o) ? "PD " + r.pd : "PE " + (r.pe === null ? "cheio" : r.pe)) + ", " + m.retrato.efeitos.filter(function (x) { return !x.encerrado; }).length + " efeito(s) ativo(s)."),
      v.valida ? null : linha(v.motivo, "t-aviso"),
      el("div.faixa", {}, [
        v.valida ? botao("Voltar à marca (reação, 3 " + sigla(o) + ")…", function () { voltarAoSalto(ctx); }) : null,
        botao(v.valida ? "Descartar a marca" : "Encerrar a marca vencida", function () { A6().encerrarMarca(o); salvar(ctx); }),
      ]),
    ]);
  }

  function secaoGrilhoes(ctx, o) {
    var g = A6().grilhoesNaCena(o);
    if (!g) return null;
    var pl = A6().planoDosGrilhoes(o);
    return bloco([
      titulo("Grilhões de Lodo (até o fim da cena)"),
      linha("Área de 9 m de raio a partir de você: " + pl.dano + " de Morte e " + pl.condicao + " (Fortitude DT " + g.dt + " reduz à metade e evita a condição por 1 rodada). Você e criaturas de Morte não são afetados. Resolvida " + g.resolucoes + " vez(es)."),
      botao("Resolver de novo (a mesa decide)", function () { resolverGrilhoes(ctx); }),
    ]);
  }

  function secaoHesitacao(ctx, o) {
    var ativas = A6().hesitacoesAtivas(o);
    if (!ativas.length) return null;
    return bloco([titulo("Hesitação Forçada sobre você")].concat(ativas.map(function (inst) {
      var v = A6().versaoDaHesitacao(inst);
      var reg = A6().dados(o).hesitacao.filter(function (h) { return h.efeitoId === inst.id; })[0] || { seguidos: 0, falhouNoTurno: false };
      var texto = v === "Verdadeiro"
        ? "Verdadeira: role de novo o MENOR dado de qualquer teste, mantendo o novo. Um aliado adjacente atacado: gaste a reação para virar o alvo. Involuntário, teste de Vontade no início do turno — passou, o efeito acaba."
        : "Teste de Vontade no início de cada turno. Falhou: até o fim do turno, role de novo o MAIOR dado de qualquer teste (fica o novo). Dois sucessos seguidos encerram." +
          (v === "Discente" ? " Discente: sem ações hostis contra quem conjurou." : "") +
          " Sucessos seguidos: " + reg.seguidos + "." + (reg.falhouNoTurno ? " Neste turno: rolar de novo o maior dado." : "");
      return el("div.faixa", {}, [
        linha(inst.nome + " (" + v + ")" + (inst.origem && inst.origem.nome ? "" : "") + ". " + texto),
        botao("Vontade (início do turno)", function () { global.RAMAOrdemRolarPericia && global.RAMAOrdemRolarPericia(ctx, "vontade", "Vontade · Hesitação Forçada (início do turno)"); }),
        botao("Passou", function () { testeHesitacao(ctx, inst.id, true); }),
        botao("Falhou", function () { testeHesitacao(ctx, inst.id, false); }),
        reg.falhouNoTurno ? botao("Fim do turno", function () { A6().fimDoTurnoDaHesitacao(o, inst.id); salvar(ctx); }) : null,
      ]);
    })));
  }
  function testeHesitacao(ctx, id, passou) {
    var r = A6().testeDaHesitacao(ordemDe(ctx), id, passou);
    if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
    salvar(ctx);
    if (r.encerrou) UI.avisoOk("Hesitação Forçada terminou" + (r.versao === "Verdadeiro" ? " (Vontade anula)." : " (dois sucessos seguidos)."));
    else if (!passou && r.versao !== "Verdadeiro") UI.aviso("Até o fim do turno, os testes oferecem “rolar de novo o maior dado”.");
  }

  function secaoRecebidos(ctx, o) {
    var l = A6().recebidosNaCena(o);
    if (!l.length) return null;
    return bloco([titulo("Recebido de Grão-Mestre em Elemento")].concat(l.map(function (r) {
      var gm = A6().GRAO_MESTRE[r.elemento];
      return linha(nomeElemento(r.elemento) + ", de " + (r.de || "outro personagem") + " — " + (r.papel === "aliado" ? gm.aliado : gm.inimigo + " por 1 rodada (ignora imunidades)") + ".");
    })));
  }

  function secaoRebotes(ctx, o) {
    var l = A6().rebotesPendentes(o);
    if (!l.length) return null;
    return bloco([titulo("Aplicador de Adrenalina: rebote")].concat(l.map(function (r) {
      return el("div.faixa", {}, [
        linha("O efeito acabou: o ser fica fatigado por uma cena."),
        botao("Aplicar fatigado (esta cena)", function () {
          efeitoEmMim(ctx, { modelo: "cond:fatigado", origem: { tipo: "item", nome: "Aplicador de Adrenalina (rebote)" } });
          A6().resolverRebote(o, r.id);
          salvar(ctx);
        }),
        botao("Dispensar", function () { A6().resolverRebote(o, r.id); salvar(ctx); }),
      ]);
    })));
  }

  /* =================================================================
     CONTROLES DOS PODERES
     ================================================================= */

  var CONTROLES = {
    farmaceuticoDeCampo: function (ctx, o) {
      return [botao("Fabricar (interlúdio)…", function () { fabricar(ctx); }, { desligado: !A6().emInterludio(o), dica: A6().emInterludio(o) ? "" : "Só numa cena de interlúdio." })];
    },
    paramedico: function (ctx, o) {
      if (!tem(o, "medicoDaSalvacao")) return [botao("Curar (ação padrão)…", function () { paramedico(ctx, false); })];
      return [
        botao("Curar (ação padrão, d12)…", function () { paramedico(ctx, false); }),
        botao("Curar como movimento (+3 " + sigla(o) + ")…", function () { paramedico(ctx, true); }, { desligado: A6().salvacaoNaRodada(o), dica: A6().salvacaoNaRodada(o) ? "Já usado nesta rodada." : "" }),
      ];
    },
    equipeDeTrauma: function (ctx, o) {
      return [botao("Remover condição" + (A6().limiteDaEquipe(o) > 1 ? "ões (até 3)" : "") + " (2 " + sigla(o) + ")…", function () { equipeDeTrauma(ctx); })];
    },
    resgatarDaMorte: function (ctx, o) {
      var cena = A6().cenaDe(o);
      var l = A6().dados(o).resgates.filter(function (r) { return r.cena === cena; });
      return [linha(l.length ? "Já resgatados nesta cena: " + l.map(function (r) { return r.alvo; }).join(", ") + "." : "No resultado de um teste de Medicina (primeiros socorros), o botão “Resgatar da Morte” dá o sucesso automático.")];
    },
    muitoSorrateiro: function (ctx) {
      return [botao("Início de cena furtiva: rolar 1d4", function () {
        mostrar(rolagemDe("Muito Sorrateiro", "1d4"), "Muito Sorrateiro", ["Subtraia o resultado da sua visibilidade inicial (pode ficar negativa)."]);
      })];
    },
    escudoEspiralTemporal: function (ctx, o) {
      var p = A6().podeEscudo(o);
      return [botao("Usar (reação, 2 " + sigla(o) + ")…", function () { escudo(ctx); }, { desligado: !p.ok, dica: p.ok ? "" : p.motivo }),
        A6().comAfinidade(o, "escudoEspiralTemporal") ? null : linha("Usos nesta rodada: " + A6().usosDoEscudoNaRodada(o) + " de 1.")];
    },
    grilhoesDeLodo: function (ctx, o) {
      var g = A6().grilhoesNaCena(o);
      return [g ? botao("Resolver de novo (a mesa decide)", function () { resolverGrilhoes(ctx); }) : botao("Criar a área (2 " + sigla(o) + ")", function () { grilhoes(ctx); })];
    },
    saltoDeDados: function (ctx, o) {
      var m = A6().dados(o).salto.marca;
      var v = A6().validadeDaMarca(o);
      if (m && v.valida) return [botao("Voltar à marca (reação, 3 " + sigla(o) + ")…", function () { voltarAoSalto(ctx); })];
      return [botao("Marcar o símbolo (2 " + sigla(o) + ")", function () { marcarSalto(ctx); })];
    },
  };

  function controles(ctx, aq) {
    if (!A6() || !aq) return null;
    permitidoGlobal = permitido(ctx);
    var f = CONTROLES[aq.chave];
    if (!f) return null;
    var partes = (f(ctx, ordemDe(ctx), aq) || []).filter(Boolean);
    return partes.length ? el("div.pilha--curta.origem-controles", { class: "pilha" }, partes) : null;
  }

  /* --- Paramédico (com Médico da Salvação) --- */
  function paramedico(ctx, comoMovimento) {
    var o = ordemDe(ctx);
    var extras = 0;
    var emMim = false;
    var conta = el("p.t-mini");
    function plano() { return A6().planoDoParamedico(o, extras); }
    function pintar() {
      var p = plano();
      conta.textContent = p.expressao + " PV por " + (p.custo + (comoMovimento ? 3 : 0)) + " " + sigla(o) + (p.maximo > 2 ? " (até " + p.maximo + " dados no seu NEX)" : "") + ".";
    }
    pintar();
    var max = plano().maximo;
    UI.modal({ titulo: "Paramédico" + (comoMovimento ? " como ação de movimento" : ""), conteudo: bloco([
      linha("Cura um aliado adjacente — ou você mesmo. " + (tem(o, "medicoDaSalvacao") ? "Médico da Salvação: dados de d12. " : "") + (comoMovimento ? "Como movimento: +3 " + sigla(o) + ", uma vez por rodada." : "")),
      max > 2 ? rotulado("Dados extras (+1 " + sigla(o) + " cada)", select([0, 1, 2, 3].filter(function (n) { return n <= max - 2; }).map(function (n) { return { valor: String(n), rotulo: "+" + n }; }), "0", function (v) { extras = Number(v) || 0; pintar(); })) : null,
      marca("Em mim (os PV entram nesta ficha)", function (v) { emMim = v; }),
      conta,
    ]), botoes: [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Curar", classe: "r-botao--principal", aoClicar: function (f) {
        var p = plano();
        if (comoMovimento) {
          var reg = A6().registrarSalvacao(o);
          if (!reg.ok) { UI.avisoAtencao(reg.motivo); return; }
        }
        var g = gastar(ctx, p.custo + (comoMovimento ? 3 : 0));
        if (!g) return;
        var r = rolagemDe("Paramédico", p.expressao);
        var notas = [g.qual + " " + g.antes + " → " + g.depois + "."];
        if (emMim) { var m = recuperar(ctx, "pv", r.total); notas.push("PV " + m.antes + " → " + m.depois + "."); }
        else notas.push("O aliado recupera " + r.total + " PV (ele registra na ficha dele).");
        f(); salvar(ctx);
        mostrar(r, "Paramédico" + (comoMovimento ? " (movimento)" : ""), notas);
      } },
    ] });
  }

  /* --- Equipe de Trauma (com o Veterano) --- */
  function equipeDeTrauma(ctx) {
    var o = ordemDe(ctx);
    var limite = A6().limiteDaEquipe(o);
    var ativas = EF() ? (o.condicoes.efeitos || []).filter(function (x) { return EF().ativa(x) && x.tipo === "condicao" && x.modelo !== "cond:morrendo"; }) : [];
    var escolhidas = {};
    var emMim = ativas.length > 0;
    UI.modal({ titulo: "Equipe de Trauma", conteudo: bloco([
      linha("Ação padrão e 2 " + sigla(o) + ": remove " + (limite > 1 ? "até três condições negativas (Veterano da Equipe de Trauma)" : "uma condição negativa") + ", exceto morrendo, de um aliado adjacente."),
      ativas.length ? marca("Em mim (escolha abaixo)", function (v) { emMim = v; }, true) : linha("Nesta ficha não há condição ativa: num aliado, ele encerra na ficha dele."),
      ativas.length ? el("div.pilha--curta", { class: "pilha" }, ativas.map(function (x) { return marca(x.nome, function (v) { escolhidas[x.id] = v; }); })) : null,
    ]), botoes: [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Usar", classe: "r-botao--principal", aoClicar: function (f) {
        var ids = Object.keys(escolhidas).filter(function (k) { return escolhidas[k]; });
        if (emMim && ativas.length && !ids.length) { UI.avisoAtencao("Escolha a condição."); return; }
        if (emMim && ids.length > limite) { UI.avisoAtencao("No máximo " + limite + "."); return; }
        var g = gastar(ctx, 2);
        if (!g) return;
        if (emMim) ids.forEach(function (id) { EF().encerrar(o.condicoes, id, "manual", "Equipe de Trauma"); });
        f(); salvar(ctx);
        UI.avisoOk("Equipe de Trauma: " + (emMim && ids.length ? ids.length + " condição(ões) encerrada(s)." : "o aliado encerra " + (limite > 1 ? "até três condições" : "uma condição") + " na ficha dele.") + " " + g.qual + " " + g.antes + " → " + g.depois + ".");
      } },
    ] });
  }

  /* --- Farmacêutico de Campo --- */
  function fabricar(ctx) {
    var o = ordemDe(ctx);
    if (!IT()) return;
    IT().carregar().then(function (cat) {
      var medicamentos = cat.itens.filter(function (x) {
        return x.natureza === "item" && x.aba !== "amaldicoados" && (x.medicamento || x.id === "op.geral.cicatrizante");
      });
      var kits = itens(ctx).filter(A6().ehKitDeMedicina);
      var escolha = medicamentos[0] ? medicamentos[0].id : "";
      var kit = kits[0] ? kits[0].id : "";
      var conta = el("p.t-mini");
      function pintar() {
        var e = cat.porId[escolha];
        var k = kits.filter(function (x) { return x.id === kit; })[0];
        conta.textContent = e ? "Custo: " + A6().custoDaFabricacao(e.categoria) + " " + sigla(o) + " (2 + 2 × categoria " + rotuloCat(e.categoria) + ")." +
          (k ? " Kit: " + A6().usosDoKit(k) + " de " + A6().USOS_DO_KIT + " usos por esta habilidade." : "") : "";
      }
      pintar();
      UI.modal({ titulo: "Farmacêutico de Campo", conteudo: bloco([
        linha("Ação de interlúdio, um uso do kit de medicina e o custo em " + sigla(o) + ": o item entra no inventário. O kit é consumido no 3º uso por esta habilidade."),
        rotulado("Cicatrizante ou medicamento", select(medicamentos.map(function (x) { return { valor: x.id, rotulo: x.nome + " (categoria " + rotuloCat(x.categoria) + ")" }; }), escolha, function (v) { escolha = v; pintar(); })),
        kits.length ? rotulado("Kit de medicina", select(kits.map(function (x) { return { valor: x.id, rotulo: x.nome + " — " + A6().usosDoKit(x) + "/" + A6().USOS_DO_KIT }; }), kit, function (v) { kit = v; pintar(); }))
          : linha("Não há kit de medicina no inventário (um “Kit de perícia (Medicina)” ou um item com “kit” e “medicina” no nome).", "t-aviso"),
        conta,
      ]), botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Fabricar", classe: "r-botao--principal", aoClicar: function (f) {
          var e = cat.porId[escolha];
          var k = itens(ctx).filter(function (x) { return x.id === kit; })[0];
          if (!e || !k) { UI.avisoAtencao("Escolha o item e o kit de medicina."); return; }
          if (!A6().emInterludio(o)) { UI.avisoAtencao("Só numa cena de interlúdio."); return; }
          var op = opId("fab");
          var custo = A6().custoDaFabricacao(e.categoria);
          var montado = IT().paraInventario(e, { quantidade: 1, catalogo: cat });
          if (!montado.ok) { UI.avisoAtencao(montado.mensagem); return; }
          var g = gastar(ctx, custo);
          if (!g) return;
          var item = F().criarItem(montado.tipo, montado.dados);
          item.adicionadoEm = U.agoraISO();
          var reg = A6().registrarFabricacao(o, op, item, e.id, k.id, custo);
          if (!reg.ok) { recuperar(ctx, "pe", custo); UI.avisoAtencao(reg.motivo); return; }
          ctx.ficha.inventario.itens.push(item);
          var usos = A6().usosDoKit(k) + 1;
          var gasto = "";
          if (usos >= A6().USOS_DO_KIT) {
            var q = (k.ordem && k.ordem.quantidade) || 1;
            if (q > 1) { k.ordem.quantidade = q - 1; delete k.ordem.usosFarmaceutico; }
            else ctx.ficha.inventario.itens = itens(ctx).filter(function (x) { return x.id !== k.id; });
            gasto = " O kit de medicina foi consumido (3º uso).";
          } else {
            if (!k.ordem) k.ordem = {};
            k.ordem.usosFarmaceutico = usos;
            gasto = " Kit: " + usos + " de " + A6().USOS_DO_KIT + ".";
          }
          f(); salvar(ctx);
          UI.avisoOk(item.nome + " entrou no inventário. " + g.qual + " " + g.antes + " → " + g.depois + "." + gasto, { duracao: 8000 });
        } },
      ] });
    }, function () { UI.avisoAtencao("Não foi possível carregar a biblioteca de itens."); });
  }

  /* --- Escudo Espiral Temporal --- */
  function escudo(ctx) {
    var o = ordemDe(ctx);
    var tipo = "municao";
    var energia = false;
    UI.modal({ titulo: "Escudo Espiral Temporal", conteudo: bloco([
      linha("Reação e 2 " + sigla(o) + ", contra a arma ou munição que vai te causar dano. Munição: RD 20 e o projétil vira cinzas. Arma corpo a corpo: RD 10 e a arma envelhece (−1 dado no ataque; de novo, quebrada). A RD não vale contra dano de Energia."),
      rotulado("O dano vem de", select([{ valor: "municao", rotulo: "uma munição" }, { valor: "arma", rotulo: "uma arma corpo a corpo" }], tipo, function (v) { tipo = v; })),
      marca("O dano é de Energia (a RD não funciona)", function (v) { energia = v; }),
    ]), botoes: [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Usar", classe: "r-botao--principal", aoClicar: function (f) {
        var p = A6().podeEscudo(o);
        if (!p.ok) { UI.avisoAtencao(p.motivo); return; }
        var g = gastar(ctx, 2);
        if (!g) return;
        var r = A6().registrarEscudo(o, tipo, energia);
        f(); salvar(ctx);
        UI.aviso("Escudo Espiral Temporal: " + (r.rd ? "RD " + r.rd + " contra este dano" : "a RD não vale contra dano de Energia") + ". " +
          (tipo === "municao" ? "O projétil vira cinzas." : "A arma do atacante envelhece — numa ficha, pelo menu do item (“Envelhecer”).") + " " + g.qual + " " + g.antes + " → " + g.depois + ".", { duracao: 9000 });
      } },
    ] });
  }

  /* --- Grilhões de Lodo --- */
  function grilhoes(ctx) {
    var o = ordemDe(ctx);
    var g = gastar(ctx, 2);
    if (!g) return;
    var dt = A6().dtDosGrilhoes(o, ctx.ficha.inventario);
    var r = A6().criarGrilhoes(o, dt);
    if (!r.ok) { recuperar(ctx, "pe", 2); UI.avisoAtencao(r.motivo); return; }
    salvar(ctx);
    rolarGrilhoes(o, r.area, [g.qual + " " + g.antes + " → " + g.depois + "."]);
  }
  function resolverGrilhoes(ctx) {
    var o = ordemDe(ctx);
    var r = A6().resolverGrilhoes(o);
    if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
    salvar(ctx);
    rolarGrilhoes(o, r.area, ["Resolvido de novo por decisão da mesa (o livro não diz se o dano se repete)."]);
  }
  function rolarGrilhoes(o, area, notas) {
    var pl = A6().planoDosGrilhoes(o);
    var r = rolagemDe("Grilhões de Lodo", pl.dano);
    mostrar(r, "Grilhões de Lodo (Morte)", ["Seres na área (exceto você e criaturas de Morte): " + r.total + " de dano de Morte e " + pl.condicao +
      ". Fortitude DT " + area.dt + " (10 + limite de PE + atributo mais alto) reduz à metade e evita a condição por 1 rodada."].concat(notas || []));
  }

  /* --- Salto de Dados --- */
  function marcarSalto(ctx) {
    var o = ordemDe(ctx);
    var op = opId("sd");
    var g = gastar(ctx, 2);
    if (!g) return;
    /* Os 2 PE já saíram: o retrato é DEPOIS do custo. */
    var r = A6().marcar(o, op);
    if (!r.ok) { recuperar(ctx, "pe", 2); UI.avisoAtencao(r.motivo); return; }
    salvar(ctx);
    UI.avisoOk("Símbolo marcado (dura " + (r.marca && r.marca.afinidade ? "1 ano" : "1 dia") + "). O retrato guarda PV, " + g.qual + ", Sanidade, temporários, condições e efeitos de agora.", { duracao: 8000 });
  }
  function voltarAoSalto(ctx) {
    var o = ordemDe(ctx);
    var m = A6().dados(o).salto.marca;
    if (!m) return;
    var op = opId("sv");
    UI.confirmar({ titulo: "Voltar à marca?", texto: "Reação e 3 " + sigla(o) + ": PV, " + sigla(o) + ", Sanidade, temporários, condições e efeitos voltam ao retrato da marca — inclusive os " + sigla(o) + " gastos agora. Você perde a memória desde a marca e fica frustrado até o fim da cena. Identidade, progressão, inventário e rituais não mudam.", rotuloConfirmar: "Voltar" }).then(function (sim) {
      if (!sim) return;
      var g = gastar(ctx, 3);
      if (!g) return;
      var r = A6().voltar(o, op);
      if (!r.ok) { recuperar(ctx, "pe", 3); UI.avisoAtencao(r.motivo); return; }
      if (r.repetido) { salvar(ctx); return; }
      efeitoEmMim(ctx, { modelo: "cond:frustrado", origem: { tipo: "habilidade", nome: "Salto de Dados" },
        descricao: "Frustrado até o fim da cena: a memória do que viveu desde a marca se perdeu (AS6 p. 71)." });
      salvar(ctx);
      UI.avisoOk("Salto de Dados: o estado voltou ao da marca, e a marca foi consumida. Frustrado até o fim da cena.", { duracao: 8000 });
    });
  }

  /* =================================================================
     ORIGEM: COBAIA SOBREVIVENTE
     ================================================================= */

  function controlesDeOrigem(ctx, org) {
    if (!A6() || !org || org.chave !== "cobaiaSobrevivente") return null;
    permitidoGlobal = permitido(ctx);
    var o = ordemDe(ctx);
    var oc = A6().ocorrenciaDaCena(o);
    var partes = [];
    if (A6().imuneAMedoNaCena(o)) partes.push(linha("Imune a efeitos de medo até o fim da cena (Forças para Enfrentar)."));
    else if (oc) {
      partes.push(linha("O trauma apareceu nesta cena: abalado (em Condições)."));
      partes.push(botao("Forças para Enfrentar (2 " + sigla(o) + "): imunidade a medo na cena", function () {
        var g = gastar(ctx, 2);
        if (!g) return;
        var r = A6().comprarImunidade(o, oc.id);
        if (!r.ok) { recuperar(ctx, "pe", 2); UI.avisoAtencao(r.motivo); return; }
        salvar(ctx);
        UI.avisoOk("Imune a efeitos de medo até o fim da cena; o abalado do trauma saiu." + (r.outrasDeMedo && r.outrasDeMedo.length ? " Outras condições de medo ativas (" + r.outrasDeMedo.join(", ") + ") também não valem mais: encerre-as em Condições." : ""), { duracao: 9000 });
      }));
    } else {
      partes.push(botao("O mestre indicou algo ligado ao trauma (fica abalado)", function () {
        var inst = efeitoEmMim(ctx, { modelo: "cond:abalado", origem: { tipo: "habilidade", nome: "Forças para Enfrentar (trauma)" },
          descricao: "Abalado: algo nesta cena se relaciona ao seu trauma de cobaia (AS6 p. 66)." });
        if (!inst) UI.avisoAtencao("O abalado não entrou (imunidade?). A ocorrência fica registrada.");
        var r = A6().registrarOcorrencia(o, inst ? inst.id : "", ctx.ficha.campanhaId && ctx.comoMestre && ctx.comoMestre() ? "mestre" : "mesa");
        if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
        salvar(ctx);
      }));
    }
    return el("div.pilha--curta.origem-controles", { class: "pilha" }, partes);
  }

  /* =================================================================
     O TESTE: no resultado
     ================================================================= */

  var RESISTENCIAS = ["fortitude", "reflexos", "vontade"];

  function acoesNoTeste(ctx, o, p, r) {
    if (!A6() || !permitido(ctx)) return [];
    var saida = [];
    var unico = function (rotulo, f, dica) {
      var usado = false;
      saida.push({ rotulo: rotulo, dica: dica || "", aoClicar: function (cartao, b) { if (usado) return; if (f() !== false) { usado = true; if (b) b.disabled = true; } } });
    };
    var mostrarT = function (novo, nome, notas) { global.RAMARolagens.mostrar(novo, { nome: p.nome + " · " + nome, notas: notas }); };
    var somarAoTeste = function (valor, rot) {
      return Object.assign({}, r, { total: r.total + valor, parcelas: (r.parcelas || []).concat([{ rotulo: rot, valor: valor }]) });
    };

    /* Análise Combativa: Luta ou Pontaria no lugar, treinado nela. */
    if (tem(o, "analiseCombativa") && p.chave !== "luta" && p.chave !== "pontaria" && RESISTENCIAS.indexOf(p.chave) < 0 && p.chave !== "iniciativa") {
      ["luta", "pontaria"].forEach(function (k) {
        if (!treinado(o, k)) return;
        var nomeK = (C().pericia(k) || {}).nome || k;
        unico("Análise Combativa: usar " + nomeK + " (2 " + sigla(o) + ")", function () {
          UI.confirmar({ titulo: "Análise Combativa", texto: "Só para investigar uma ação violenta, a critério do mestre. Gastar 2 " + sigla(o) + " e rolar " + nomeK + " no lugar de " + p.nome + "?", rotuloConfirmar: "Rolar " + nomeK }).then(function (ok) {
            if (!ok) return;
            var g = gastar(ctx, 2);
            if (!g) return;
            salvar(ctx);
            if (global.RAMAOrdemRolarPericia) global.RAMAOrdemRolarPericia(ctx, k, nomeK + " · Análise Combativa (no lugar de " + p.nome + ")");
          });
        });
      });
    }

    if (p.chave === "medicina") {
      if (tem(o, "doutorEmEmergencias")) {
        unico("Doutor em Emergências: +5 (aplicar tratamento)", function () { mostrarT(somarAoTeste(5, "Doutor em Emergências"), "tratamento", ["Só para aplicar tratamento (OPRPG p. 46). Passando, o paciente recebe +10 no próximo teste de Fortitude contra a doença ou o veneno."]); });
      }
      if (tem(o, "doutorEmEmergencias") || A6().afeccoesAtivas(o).length) {
        unico("Tratamento passou: guardar o bônus do paciente", function () { tratamento(ctx); });
      }
      if (tem(o, "resgatarDaMorte")) unico("Resgatar da Morte (2 " + sigla(o) + "): sucesso automático em primeiros socorros", function () { resgatar(ctx, p, r); return false; });
    }

    /* O bônus de tratamento guardado numa afecção: um teste de Fortitude
       (ou Vontade, na crise hipertensiva) contra ela. */
    if (RESISTENCIAS.indexOf(p.chave) >= 0) {
      A6().afeccoesAtivas(o).forEach(function (af) {
        if (!af.tratamento) return;
        unico("Tratamento: +" + af.tratamento + " contra " + A6().nomeDaAfeccao(af), function () {
          var v = A6().gastarTratamento(o, af.id);
          salvar(ctx);
          mostrarT(somarAoTeste(v, "Tratamento"), "tratamento", ["Só contra " + A6().nomeDaAfeccao(af) + "; o bônus foi gasto."]);
        });
      });
    }

    /* Hesitação Forçada: o dado rolado de novo, aceitando o novo. */
    var hes = A6().rolagemDaHesitacao(o);
    if (hes && (r.rolagens || []).length) {
      unico("Hesitação Forçada: rolar de novo o " + (hes.dado === "maior" ? "maior" : "menor") + " dado", function () {
        var novo = rolarDeNovo(r, hes.dado);
        mostrarT(novo, "Hesitação Forçada (" + hes.versao + ")", [novo.notaExtra, hes.dado === "maior" ? "Obrigatório enquanto o efeito valer neste turno: fica o novo valor." : "Verdadeira: o menor dado é rolado de novo, mantendo o novo resultado."]);
      });
    }
    return saida;
  }

  function treinado(o, k) {
    var est = E() ? E().estado(o, null) : null;
    return !!(est && est.graus && est.graus[k] && est.graus[k] !== "destreinado");
  }

  /* Troca UM dado do teste (o maior ou o menor) por um novo, e refaz o
     natural pela regra do teste (o maior, ou o menor com dados de
     menos). */
  function rolarDeNovo(r, qual) {
    var l = (r.rolagens || []).slice();
    if (!l.length) return r;
    var alvo = qual === "maior" ? Math.max.apply(null, l) : Math.min.apply(null, l);
    var i = l.indexOf(alvo);
    var novo = rolar("1d20");
    l[i] = novo;
    var pior = r.selecao === "menor";
    var natural = pior ? Math.min.apply(null, l) : Math.max.apply(null, l);
    return Object.assign({}, r, { rolagens: l, natural: natural, total: r.total - (r.natural || 0) + natural,
      parcelas: [{ rotulo: "Dado (" + l.join(", ") + ")", valor: natural }].concat((r.parcelas || []).slice(1)),
      notaExtra: "O " + qual + " dado (" + alvo + ") foi rolado de novo: " + novo + "." });
  }

  function tratamento(ctx) {
    var o = ordemDe(ctx);
    var valor = tem(o, "doutorEmEmergencias") ? 10 : 5;
    var afs = A6().afeccoesAtivas(o);
    var alvo = afs[0] ? afs[0].id : "";
    UI.modal({ titulo: "Tratamento (+" + valor + ")", conteudo: bloco([
      linha("Passou no teste de Medicina para aplicar tratamento: o paciente recebe +" + valor + " no próximo teste de Fortitude contra a doença ou o veneno" + (valor === 10 ? " (Doutor em Emergências)." : ".")),
      afs.length ? rotulado("Nesta ficha (paciente: você)", select([{ valor: "", rotulo: "outro paciente (ele anota na ficha dele)" }].concat(afs.map(function (a) { return { valor: a.id, rotulo: A6().nomeDaAfeccao(a) }; })), alvo, function (v) { alvo = v; }))
        : linha("O paciente anota o +" + valor + " na ficha dele."),
    ]), botoes: [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Guardar", classe: "r-botao--principal", aoClicar: function (f) {
        if (alvo) { var r = A6().guardarTratamento(o, alvo, valor); if (!r.ok) { UI.avisoAtencao(r.motivo); return; } salvar(ctx); }
        f();
        UI.avisoOk(alvo ? "Bônus guardado: aparece no próximo teste de resistência." : "Anote +" + valor + " na ficha do paciente.");
      } },
    ] });
  }

  function resgatar(ctx, p, r) {
    var o = ordemDe(ctx);
    var campo = UI.campo({ rotulo: "Quem é socorrido", limite: 80 });
    UI.modal({ titulo: "Resgatar da Morte", conteudo: bloco([
      linha("2 " + sigla(o) + ": sucesso automático neste teste de primeiros socorros (OPRPG p. 46). Uma vez por cena no mesmo ser."),
      campo,
    ]), botoes: [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Resgatar", classe: "r-botao--principal", aoClicar: function (f) {
        var nome = campo.entrada.value.trim();
        if (!nome) { UI.avisoAtencao("Diga quem é."); return; }
        if (A6().resgateNaCena(o, nome)) { UI.avisoAtencao("Já usado em " + nome + " nesta cena."); return; }
        var g = gastar(ctx, 2);
        if (!g) return;
        var reg = A6().registrarResgate(o, nome);
        if (!reg.ok) { recuperar(ctx, "pe", 2); UI.avisoAtencao(reg.motivo); return; }
        f(); salvar(ctx);
        global.RAMARolagens.mostrar(Object.assign({}, r, { sucessoAutomatico: true }), { nome: p.nome + " · Resgatar da Morte", notas: ["Sucesso automático em primeiros socorros em " + nome + " (AS6 p. 68). " + g.qual + " " + g.antes + " → " + g.depois + "."] });
      } },
    ] });
  }

  /* =================================================================
     DOENÇAS E VENENOS (seção Condições)
     ================================================================= */

  function botoesDeCondicoes(ctx) {
    if (!A6() || !F().ehDeOrdem(ctx.ficha) || !permitido(ctx)) return [];
    return [
      el("button.r-botao.r-botao--mini", { type: "button", texto: "Doença ou veneno…", dataset: { foco: "as6-afeccao" }, onclick: function () { registrarAfeccao(ctx); } }),
      el("button.r-botao.r-botao--mini", { type: "button", texto: "Recebido de Grão-Mestre…", dataset: { foco: "as6-grao-mestre" }, onclick: function () { registrarRecebido(ctx); } }),
    ];
  }

  function condicoes(ctx) {
    if (!A6() || !F().ehDeOrdem(ctx.ficha)) return null;
    var o = ordemDe(ctx);
    var l = A6().afeccoesAtivas(o);
    if (!l.length) return null;
    permitidoGlobal = permitido(ctx);
    return el("div.pilha--curta.as6-afeccoes", { class: "pilha", "aria-label": "Doenças e venenos" }, [el("p.t-rotulo", { texto: "Doenças e venenos (Arquivos Secretos 6)" })].concat(l.map(function (af) {
      return cartaoDaAfeccao(ctx, o, af);
    })));
  }

  function cartaoDaAfeccao(ctx, o, af) {
    var m = af.tipo === "veneno" ? A6().VENENOS.filter(function (v) { return v.chave === af.chave; })[0] : A6().DOENCAS.filter(function (d) { return d.chave === af.chave; })[0];
    var ef = A6().efeitoAtual(af);
    var partes = [
      el("strong", { texto: A6().nomeDaAfeccao(af) }),
      linha((ef ? ef.texto : "") + (af.origem ? " Origem: " + af.origem + "." : "") + (af.tratamento ? " Tratamento guardado: +" + af.tratamento + "." : "")),
    ];
    if (ef && ef.fatal) partes.push(linha("Pela regra, o personagem morre. A ficha não faz isso sozinha: a mesa confirma.", "t-aviso"));
    if (ef && ef.textos) ef.textos.forEach(function (t) { partes.push(linha(t)); });
    var acoes = [];
    if (af.tipo === "doenca") {
      if (m.resistencia) acoes.push(botao("Teste (" + (m.resistencia === "fortitude" ? "Fortitude" : "Vontade") + " DT " + m.dt + ")", function () {
        global.RAMAOrdemRolarPericia && global.RAMAOrdemRolarPericia(ctx, m.resistencia, (m.resistencia === "fortitude" ? "Fortitude" : "Vontade") + " (DT " + m.dt + ") · " + m.nome);
      }));
      acoes.push(botao("Avançar estágio", function () { mudarEstagio(ctx, af, af.estagio + 1); }, { desligado: af.estagio >= 4 }));
      acoes.push(botao("Reduzir estágio", function () { mudarEstagio(ctx, af, af.estagio - 1); }));
      if (temNeruda(ctx)) acoes.push(botao("Imunologista (Dr. Neruda, interlúdio, 3 " + sigla(o) + "): −1 estágio", function () {
        if (!A6().emInterludio(o)) { UI.avisoAtencao("Só como ação de interlúdio."); return; }
        var g = gastar(ctx, 3);
        if (!g) return;
        mudarEstagio(ctx, af, af.estagio - 1, "Imunologista (Dr. Neruda)");
      }));
      if (ef && ef.medicamentos) acoes.push(botao("Usar os medicamentos do grupo (sem efeito) e perder 2d12 PV…", function () { hipocondria(ctx, af); }));
    } else {
      if (af.chave === "ricina") acoes.push(botao("Rodada: perder " + ef.perdaPorRodada + " PV", function () { ricina(ctx, af); }));
      acoes.push(botao("Curado / encerrar", function () { encerrarAfeccao(ctx, af, "Curado (antídoto ou tratamento)."); }));
    }
    if (af.tipo === "doenca") acoes.push(botao("Encerrar", function () { encerrarAfeccao(ctx, af, "Encerrada pela mesa."); }));
    partes.push(el("div.faixa", {}, acoes));
    var ult = af.historico.slice(-3).reverse();
    if (ult.length) partes.push(linha("Histórico: " + ult.map(function (h) { return h.acao; }).join(" · ")));
    return el("div.as3-cartao.as6-afeccao", {}, partes);
  }

  function temNeruda(ctx) {
    return (ctx.ficha.aliados || []).some(function (a) {
      var c = a && a.criatura;
      var org = (c && c.origem) || {};
      return (org.catalogoId || org.copiadoDe) === "as6.criatura.dr-neruda-aliado";
    });
  }

  function mudarEstagio(ctx, af, para, por) {
    var o = ordemDe(ctx);
    var r = A6().mudarEstagio(o, af.id, para, por || "", ctx.ficha.nome);
    if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
    salvar(ctx);
    var notas = r.notas || [];
    UI.aviso(para <= 0 ? A6().nomeDaAfeccao(r.afeccao).replace(/ \(estágio.*$/, "") + ": curada." : A6().nomeDaAfeccao(r.afeccao) + ": " + (r.efeito ? r.efeito.texto : "") + (notas.length ? " " + notas.join(" ") : ""), { duracao: 9000 });
  }
  function encerrarAfeccao(ctx, af, motivo) {
    var r = A6().encerrarAfeccao(ordemDe(ctx), af.id, "", motivo);
    if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
    salvar(ctx);
  }

  function registrarAfeccao(ctx) {
    var o = ordemDe(ctx);
    var tipo = "doenca";
    var chave = A6().DOENCAS[0].chave;
    var estagio = "1";
    var resistiu = false;
    var origem = UI.campo({ rotulo: "Origem (de onde veio — opcional)", limite: 120 });
    var corpo = el("div.pilha--curta", { class: "pilha" });
    function opcoes() {
      return (tipo === "veneno" ? A6().VENENOS : A6().DOENCAS).map(function (x) {
        return { valor: x.chave, rotulo: x.nome + (tipo === "veneno" ? " (" + x.via + ", Fortitude DT " + x.dt + ")" : (x.resistencia ? " (" + (x.resistencia === "fortitude" ? "Fortitude" : "Vontade") + " DT " + x.dt + ")" : " (sem teste no livro)")) + " — AS6 p. " + x.pagina };
      });
    }
    function pintar() {
      U.trocar(corpo, [
        rotulado("Tipo", select([{ valor: "doenca", rotulo: "Doença" }, { valor: "veneno", rotulo: "Veneno" }], tipo, function (v) { tipo = v; chave = (v === "veneno" ? A6().VENENOS : A6().DOENCAS)[0].chave; pintar(); })),
        rotulado(tipo === "veneno" ? "Veneno" : "Doença", select(opcoes(), chave, function (v) { chave = v; })),
        tipo === "doenca" ? rotulado("Estágio", select([1, 2, 3, 4].map(function (n) { return { valor: String(n), rotulo: ROMANOS[n] + (n === 4 ? " ou superior" : "") }; }), estagio, function (v) { estagio = v; }))
          : marca("Passou no teste de Fortitude (o efeito entre parênteses)", function (v) { resistiu = v; }, resistiu),
        origem,
        linha("Os efeitos do estágio (ou do veneno) entram em Condições, com a origem. Nada avança sozinho: cada mudança é um clique."),
      ]);
    }
    pintar();
    UI.modal({ titulo: "Doença ou veneno (Arquivos Secretos 6)", conteudo: corpo, botoes: [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Registrar", classe: "r-botao--principal", aoClicar: function (f) {
        var rodadas = 0;
        var v = tipo === "veneno" ? A6().VENENOS.filter(function (x) { return x.chave === chave; })[0] : null;
        var lado = v ? (resistiu ? v.resistiu : v.falha) : null;
        if (lado && lado.rodadas) rodadas = rolar(lado.rodadas);
        var r = A6().registrarAfeccao(o, tipo, chave, { estagio: Number(estagio) || 1, resistiu: resistiu, rodadas: rodadas, origem: origem.entrada.value, alvoNome: ctx.ficha.nome });
        if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
        var notas = (r.notas || []).slice();
        if (lado && lado.zeraPv) {
          var c = calc(ctx);
          perderPv(ctx, Number(c.atual.pv) || 0);
          if (CD()) CD().ativar(o.condicoes, "morrendo");
          notas.push("PV a 0 e morrendo (contador de Condições).");
        }
        if (lado && lado.metadeDosPv) {
          var atual = Number(calc(ctx).atual.pv) || 0;
          var m = perderPv(ctx, Math.floor(atual / 2));
          notas.push("Perdeu metade dos PV atuais: " + m.antes + " → " + m.depois + " (perda, não dano).");
        }
        if (rodadas) notas.push("Ricina resistida: " + rodadas + " rodada(s) de perda (1d4+1).");
        f(); salvar(ctx);
        UI.aviso(A6().nomeDaAfeccao(r.afeccao) + ": " + (r.efeito ? r.efeito.texto : "") + (notas.length ? " " + notas.join(" ") : ""), { duracao: 10000 });
      } },
    ] });
  }

  function ricina(ctx, af) {
    var o = ordemDe(ctx);
    var r = A6().rodadaDeRicina(o, af.id);
    if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
    var rol = rolagemDe("Ricina", r.expressao);
    var m = perderPv(ctx, rol.total);
    salvar(ctx);
    mostrar(rol, "Ricina: perda de PV", ["PV " + m.antes + " → " + m.depois + " (perda, não dano: RD não reduz)." + (r.acabou ? " As rodadas acabaram." : "")]);
  }

  /* Crise Hipocondríaca, estágio III: os medicamentos DESTA ficha saem
     (com a lista à vista e a confirmação); os dos outros do grupo, cada
     um tira da própria ficha. */
  function hipocondria(ctx, af) {
    var o = ordemDe(ctx);
    var meds = itens(ctx).filter(function (i) {
      var d = dadosDoItem(i);
      return (d.marcadores || []).indexOf("medicamento") >= 0 || /^sah\.medicamento\.|^op\.geral\.cicatrizante$|^as6\.geral\.aplicador-de-adrenalina$/.test(i.origemCatalogoId || "");
    });
    UI.confirmar({ titulo: "Crise Hipocondríaca (estágio III)", texto: "Usar todos os medicamentos, sem efeito positivo nenhum, e perder 2d12 PV?",
      detalhe: (meds.length ? "Desta ficha saem: " + meds.map(function (i) { return i.nome + " ×" + ((i.ordem && i.ordem.quantidade) || 1); }).join(", ") + ". " : "Esta ficha não tem medicamento. ") + "Os medicamentos dos outros personagens do grupo saem das fichas deles — por eles.",
      rotuloConfirmar: "Usar e perder PV" }).then(function (sim) {
      if (!sim) return;
      var op = "hipo-" + af.id;
      if (!A6().registrarUso(o, op, "hipocondria")) { UI.avisoAtencao("Já feito para esta crise."); return; }
      var ids = meds.map(function (i) { return i.id; });
      ctx.ficha.inventario.itens = itens(ctx).filter(function (i) { return ids.indexOf(i.id) < 0; });
      var rol = rolagemDe("Crise Hipocondríaca", "2d12");
      var m = perderPv(ctx, rol.total);
      salvar(ctx);
      mostrar(rol, "Crise Hipocondríaca: perda de PV", [meds.length + " medicamento(s) desta ficha usados sem efeito.", "PV " + m.antes + " → " + m.depois + " (perda, não dano)."]);
    });
  }

  /* --- o que outra ficha deu a esta: Grão-Mestre em Elemento --- */
  function registrarRecebido(ctx) {
    var o = ordemDe(ctx);
    var elemento = "sangue";
    var papel = "aliado";
    var de = UI.campo({ rotulo: "Quem conjurou", limite: 80 });
    var desc = el("p.t-mini");
    function pintar() {
      var gm = A6().GRAO_MESTRE[elemento];
      desc.textContent = papel === "aliado" ? gm.aliado : gm.inimigo.charAt(0).toUpperCase() + gm.inimigo.slice(1) + " por 1 rodada — ignora imunidades.";
    }
    pintar();
    UI.modal({ titulo: "Recebido de Grão-Mestre em Elemento", conteudo: bloco([
      linha("O efeito do poder de outro personagem (AS6 p. 69), registrado nesta ficha com quem deu. Afeta só um alvo e dura até o fim da cena, salvo o “por 1 rodada”."),
      de,
      rotulado("Elemento", select(["sangue", "morte", "conhecimento", "energia"].map(function (k) { return { valor: k, rotulo: nomeElemento(k) }; }), elemento, function (v) { elemento = v; pintar(); })),
      rotulado("Você era", select([{ valor: "aliado", rotulo: "aliado de quem conjurou" }, { valor: "inimigo", rotulo: "inimigo de quem conjurou" }], papel, function (v) { papel = v; pintar(); })),
      desc,
    ]), botoes: [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Registrar", classe: "r-botao--principal", aoClicar: function (f) {
        var quem = de.entrada.value.trim() || "outro personagem";
        var inst = aplicarGraoMestre(ctx, elemento, papel, "Grão-Mestre em Elemento (" + quem + ")");
        A6().registrarRecebido(o, elemento, papel, quem, inst ? inst.id : "");
        f(); salvar(ctx);
      } },
    ] });
  }

  /* Põe o efeito nesta ficha. A condição de inimigo ignora imunidades:
     entra como efeito com os modificadores da condição (sem o modelo,
     que a ficha recusaria por imunidade). */
  function aplicarGraoMestre(ctx, elemento, papel, origemNome) {
    var o = ordemDe(ctx);
    var gm = A6().GRAO_MESTRE[elemento];
    if (papel === "inimigo") {
      var c = EF() ? EF().condicao(gm.inimigo) : null;
      if (!c) return null;
      return efeitoEmMim(ctx, { nome: c.nome + " (Grão-Mestre)", origem: { tipo: "habilidade", nome: origemNome },
        descricao: c.texto + " Por 1 rodada; ignora imunidades (AS6 p. 69).", modificadores: JSON.parse(JSON.stringify(c.modificadores)),
        restricoes: c.restricoes.slice(), duracao: { tipo: "turnos", turnos: 1, momento: "inicio" } });
    }
    if (gm.pvTemporarios) {
      var v = rolar(gm.pvTemporarios);
      temporarioDaCena(o, "graoMestreMorte", v, origemNome);
      UI.aviso("Grão-Mestre (Morte): " + v + " PV temporários até o fim da cena.");
    }
    return efeitoEmMim(ctx, { nome: "Grão-Mestre em Elemento: " + gm.rotuloAliado, origem: { tipo: "habilidade", nome: origemNome },
      descricao: gm.aliado + (elemento === "sangue" ? " Some 2d4 de Sangue a cada rolagem de dano." : ""),
      modificadores: JSON.parse(JSON.stringify(gm.modificadores || [])) });
  }

  /* =================================================================
     USAR RITUAL: Grão-Mestre em Elemento (+1 PE)
     ================================================================= */

  function opcoesNoRitual(ctx, estado, ritual, pintar) {
    if (!A6()) return [];
    var o = ordemDe(ctx);
    var els = A6().graoMestreNoRitual(o, ritual);
    if (!els.length) return [];
    if (!estado.elemento) estado.elemento = els[0];
    var partes = [marca("Grão-Mestre em Elemento: +1 " + sigla(o) + " para um efeito em 1 alvo, até o fim da cena", function (v) { estado.ligado = v; estado.maisPe = v ? 1 : 0; pintar(); }, estado.ligado)];
    if (estado.ligado) {
      if (els.length > 1) partes.push(rotulado("Elemento", select(els.map(function (k) { return { valor: k, rotulo: nomeElemento(k) }; }), estado.elemento, function (v) { estado.elemento = v; pintar(); })));
      partes.push(rotulado("O alvo", select([
        { valor: "eu", rotulo: "você (o efeito de aliado entra nesta ficha)" },
        { valor: "aliado", rotulo: "um aliado (ele registra na ficha dele)" },
        { valor: "inimigo", rotulo: "um inimigo (condição por 1 rodada, ignora imunidades)" },
      ], estado.alvo || "aliado", function (v) { estado.alvo = v; pintar(); })));
      var gm = A6().GRAO_MESTRE[estado.elemento];
      partes.push(linha((estado.alvo === "inimigo" ? gm.inimigo + " por 1 rodada (ignora imunidades)" : gm.aliado)));
    }
    return partes;
  }

  function aplicarNoRitual(ctx, estado, ritual) {
    if (!A6() || !estado || !estado.ligado) return "";
    var gm = A6().GRAO_MESTRE[estado.elemento];
    var alvo = estado.alvo || "aliado";
    if (alvo === "eu") {
      aplicarGraoMestre(ctx, estado.elemento, "aliado", "Grão-Mestre em Elemento (" + ritual.nome + ")");
      return "Grão-Mestre (" + nomeElemento(estado.elemento) + "): " + gm.rotuloAliado + " nesta ficha.";
    }
    if (alvo === "inimigo") return "Grão-Mestre (" + nomeElemento(estado.elemento) + "): o inimigo fica " + gm.inimigo + " por 1 rodada, ignorando imunidades (a mesa aplica).";
    return "Grão-Mestre (" + nomeElemento(estado.elemento) + "): o aliado registra “" + gm.rotuloAliado + "” na ficha dele (Condições → Recebido de Grão-Mestre).";
  }

  /* =================================================================
     ROLAGEM DE DANO DE RITUAL: Dominador de Elemento
     ================================================================= */

  function notasDoDano(ctx, ritual) {
    if (!A6() || !F().ehDeOrdem(ctx.ficha)) return [];
    var els = A6().dominadorNoRitual(ordemDe(ctx), ritual);
    if (!els.length) return [];
    return ["Dominador de Elemento: você pode mudar o tipo deste dano para " + els.map(nomeElemento).join(" ou ") + " (o ritual do catálogo não muda)."];
  }

  /* =================================================================
     ITENS
     ================================================================= */

  var ID = {
    cicatrizante: "op.geral.cicatrizante",
    antiInflamatorio: "sah.medicamento.anti-inflamatorio",
    aplicador: "as6.geral.aplicador-de-adrenalina",
    anel: "as6.amaldicoado.anel-invertido",
    antiemetico: "sah.medicamento.antiemetico",
    potencializador: "as6.mod.medicamento.potencializador-quimico",
    emulsificante: "as6.mod.medicamento.emulsificante-quimico",
    aceleracao: "as6.maldicao.medicamento.aceleracao-espiral",
    esforco: "as6.maldicao.medicamento.esforco-espiral",
  };
  function ehMedicamento(item) {
    var d = dadosDoItem(item);
    return (d.marcadores || []).indexOf("medicamento") >= 0 || /^sah\.medicamento\.|^op\.geral\.cicatrizante$|^as6\.geral\.aplicador-de-adrenalina$/.test(item.origemCatalogoId || "");
  }
  function modsDe(item) { return dadosDoItem(item).modificacoes || []; }
  function temMod(item, id) { return modsDe(item).some(function (m) { return m.catalogoId === id; }); }
  function melhoriaDoPotencializador(item) {
    var m = modsDe(item).filter(function (x) { return x.catalogoId === ID.potencializador; })[0];
    if (!m) return "";
    var t = String(m.escolha || m.nome || "");
    if (/tempor/i.test(t)) return "pvTemporarios";
    if (/recupera/i.test(t)) return "cura";
    if (/duas vezes/i.test(t)) return "usos";
    if (/b[oô]nus/i.test(t)) return "bonus";
    return "";
  }

  /* O que o medicamento rola: cura ou PV temporários (os outros são texto). */
  function baseDoMedicamento(id) {
    if (id === ID.cicatrizante) return { cura: "2d8+2" };
    if (id === ID.antiInflamatorio) return { temporarios: "1d8+2" };
    if (id === ID.aplicador) return { temporarios: "2d8+2" };
    return {};
  }

  function opcoesDoItem(ctx, item) {
    if (!A6() || !permitido(ctx)) return [];
    var o = ordemDe(ctx);
    var d = dadosDoItem(item);
    var l = [];
    if (ehMedicamento(item)) l.push({ rotulo: "Aplicar (ação padrão)…", aoClicar: function () { aplicarMedicamento(ctx, item); } });
    if (item.origemCatalogoId === ID.anel) {
      l.push({ rotulo: d.vestida ? "Tirar o anel" : "Usar o anel", aoClicar: function () {
        if (!item.ordem) item.ordem = {};
        if (d.vestida) delete item.ordem.vestida; else item.ordem.vestida = true;
        salvar(ctx);
      } });
      if (d.vestida) l.push({ rotulo: "Reação: RD 4d10 contra dano de nidere (2 " + sigla(o) + ")", aoClicar: function () {
        UI.confirmar({ titulo: "Anel Invertido", texto: "Só contra dano causado por um nidere (a mesa confirma). Gastar 2 " + sigla(o) + "?", rotuloConfirmar: "Usar" }).then(function (ok) {
          if (!ok) return;
          var g = gastar(ctx, 2);
          if (!g) return;
          salvar(ctx);
          mostrar(rolagemDe("Anel Invertido", "4d10"), "Anel Invertido: RD contra este dano", [g.qual + " " + g.antes + " → " + g.depois + ".", "Desconte a RD só deste dano de nidere."]);
        });
      } });
    }
    if (item.tipo === "arma" && d.arma && d.arma.tipo === "corpoACorpo") {
      if ((d.envelhecida || 0) < 2) l.push({ rotulo: d.envelhecida ? "Envelhecer de novo (Escudo Espiral): fica quebrada" : "Envelhecer (Escudo Espiral Temporal): −1 dado no ataque", aoClicar: function () {
        A6().envelhecer(item);
        salvar(ctx);
      } });
      if (d.envelhecida) l.push({ rotulo: "Desfazer o envelhecimento (a mesa)", aoClicar: function () { delete item.ordem.envelhecida; salvar(ctx); } });
    }
    return l;
  }

  function observacoesDoItem(ctx, item) {
    if (!A6()) return [];
    var d = dadosDoItem(item);
    var l = [];
    if (d.envelhecida === 1) l.push(["Envelhecida", "−1 dado nos testes de ataque (Escudo Espiral Temporal); envelhecer de novo a quebra"]);
    if (d.envelhecida === 2) l.push(["Envelhecida", "quebrada (Escudo Espiral Temporal, AS6 p. 71)"]);
    if (A6().ehKitDeMedicina(item) && d.usosFarmaceutico) l.push(["Farmacêutico de Campo", d.usosFarmaceutico + " de " + A6().USOS_DO_KIT + " usos — no 3º, o kit é consumido"]);
    if (item.origemCatalogoId === ID.anel) l.push(["Em uso", d.vestida ? "sim" : "não — guardado, o anel não protege"]);
    return l;
  }

  function aplicarMedicamento(ctx, item) {
    var o = ordemDe(ctx);
    var emMim = true;
    var op = opId("med");
    var id = item.origemCatalogoId || "";
    var base = baseDoMedicamento(id);
    var doutor = tem(o, "doutorEmEmergencias");
    var melhoria = melhoriaDoPotencializador(item);
    var emul = modsDe(item).filter(function (m) { return m.catalogoId === ID.emulsificante; })[0];
    var acel = temMod(item, ID.aceleracao);
    var esf = temMod(item, ID.esforco);
    var linhas = [];
    if (base.cura) linhas.push("Cura " + base.cura + (doutor ? " + 1d8 (Doutor em Emergências)" : "") + (melhoria === "cura" ? " + 2d8 (Potencializador)" : "") + " PV.");
    if (base.temporarios) linhas.push(base.temporarios + (doutor ? " + 1d8 (Doutor)" : "") + (melhoria === "pvTemporarios" ? " + 2d8 (Potencializador)" : "") + " PV temporários.");
    if (!base.cura && !base.temporarios) linhas.push(item.descricao || "Efeito do medicamento: aplicado na cena.");
    if (melhoria === "bonus") linhas.push("Potencializador: o bônus em testes do medicamento aumenta em +5.");
    if (melhoria === "usos") linhas.push("Potencializador: funciona duas vezes por cena (em vez de uma).");
    if (emul) linhas.push("Emulsificante: também o efeito de " + String(emul.escolha || "outro medicamento") + ".");
    if (acel) linhas.push("Aceleração Espiral: 3 " + sigla(o) + " por uma ação padrão adicional (não para rituais). Teste de Fortitude DT 20: falhando, perde 2d8 PV.");
    if (esf) linhas.push("Esforço Espiral: recupera 1d8+1 " + sigla(o) + ". Teste de Fortitude DT 20: falhando, envelhece 1 ano e fica frustrado até o fim da cena.");
    if (id === ID.aplicador) linhas.push("+3 m de deslocamento e +2 em testes de Força, Agilidade e Vigor até o fim da cena; depois, rebote (fatigado por uma cena).");
    UI.modal({ titulo: "Aplicar " + item.nome, conteudo: bloco(linhas.map(function (t) { return linha(t); }).concat([
      marca("Em mim (os efeitos entram nesta ficha)", function (v) { emMim = v; }, true),
      linha("Num ser adjacente: as rolagens aparecem e ele registra na ficha dele. O item é consumido nos dois casos."),
    ])), botoes: [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Aplicar", classe: "r-botao--principal", aoClicar: function (f) {
        if (!A6().registrarUso(o, op, "medicamento")) { f(); return; }
        var notas = [];
        var rolagens = [];
        if (base.cura) {
          var exprC = base.cura + (doutor ? "+1d8" : "") + (melhoria === "cura" ? "+2d8" : "");
          var rc = rolagemDe("Cura", exprC);
          rolagens.push(rc);
          if (emMim) { var m = recuperar(ctx, "pv", rc.total); notas.push("PV " + m.antes + " → " + m.depois + "."); }
          else notas.push("Cura " + rc.total + " PV (" + exprC + ").");
        }
        if (base.temporarios) {
          var exprT = base.temporarios + (doutor ? "+1d8" : "") + (melhoria === "pvTemporarios" ? "+2d8" : "");
          var rt = rolagemDe("PV temporários", exprT);
          rolagens.push(rt);
          if (emMim) { temporarioDaCena(o, id === ID.aplicador ? "medAplicador" : "medTemporarios", rt.total, item.nome); notas.push(rt.total + " PV temporários até o fim da cena."); }
          else notas.push(rt.total + " PV temporários (" + exprT + ").");
        }
        if (id === ID.aplicador && emMim) {
          var inst = efeitoEmMim(ctx, { nome: "Aplicador de Adrenalina", origem: { tipo: "item", nome: item.nome },
            descricao: "+3 m de deslocamento e +2 em testes de Força, Agilidade e Vigor até o fim da cena. Depois, rebote: fatigado por uma cena (AS6 p. 73).",
            modificadores: [{ alvo: "deslocamento", tipo: "deslocamento", valor: 3, operacao: "soma" }, { alvo: "atributo:for", tipo: "bonus", valor: 2 },
              { alvo: "atributo:agi", tipo: "bonus", valor: 2 }, { alvo: "atributo:vig", tipo: "bonus", valor: 2 }] });
          if (inst) A6().registrarRebote(o, inst.id);
        }
        if (id === ID.antiemetico && emMim && EF()) {
          (o.condicoes.efeitos || []).filter(function (x) { return EF().ativa(x) && x.modelo === "cond:enjoado"; }).forEach(function (x) { EF().encerrar(o.condicoes, x.id, "manual", item.nome); });
          notas.push("Enjoado removido; +5 para evitá-lo até o fim da cena.");
        }
        if (esf) {
          var re = rolagemDe("Esforço Espiral", "1d8+1");
          rolagens.push(re);
          if (emMim) { var mp = recuperar(ctx, "pe", re.total); notas.push("Esforço Espiral: " + mp.qual + " " + mp.antes + " → " + mp.depois + "."); }
          else notas.push("Esforço Espiral: recupera " + re.total + " PE.");
        }
        if (acel && emMim) {
          efeitoEmMim(ctx, { nome: "Aceleração Espiral", origem: { tipo: "item", nome: item.nome },
            descricao: "Pode gastar 3 PE para uma única ação padrão adicional (não para conjurar rituais). Termina ao fazê-la ou no fim da cena (AS6 p. 74)." });
          notas.push("Aceleração Espiral: o efeito entrou em Condições.");
        }
        var q = (item.ordem && item.ordem.quantidade) || 1;
        if (q > 1) item.ordem.quantidade = q - 1; else ctx.ficha.inventario.itens = itens(ctx).filter(function (i) { return i.id !== item.id; });
        f(); salvar(ctx);
        /* O cartão mostra a rolagem principal (cura ou PV temporários);
           as outras (PE do Esforço Espiral) vão nas notas — PV e PE não
           se somam num total só. */
        var principal = rolagens[0] || null;
        var acoes = [];
        if (acel || esf) {
          acoes.push({ rotulo: "Fortitude (DT 20) contra a maldição", aoClicar: function () { if (global.RAMAOrdemRolarPericia) global.RAMAOrdemRolarPericia(ctx, "fortitude", "Fortitude (DT 20) · maldição do medicamento"); } });
          if (acel) acoes.push({ rotulo: "Falhou (Aceleração): perder 2d8 PV", aoClicar: function (c, b) {
            if (b) b.disabled = true;
            var rp = rolagemDe("Aceleração Espiral", "2d8");
            var mm = emMim ? perderPv(ctx, rp.total) : null;
            salvar(ctx);
            mostrar(rp, "Aceleração Espiral: um órgão envelhece", [mm ? "PV " + mm.antes + " → " + mm.depois + " (perda)." : "O ser perde " + rp.total + " PV."]);
          } });
          if (esf) acoes.push({ rotulo: "Falhou (Esforço): envelhece 1 ano e frustrado", aoClicar: function (c, b) {
            if (b) b.disabled = true;
            if (emMim) efeitoEmMim(ctx, { modelo: "cond:frustrado", origem: { tipo: "item", nome: "Esforço Espiral" }, descricao: "Envelheceu 1 ano; frustrado até o fim da cena (AS6 p. 74)." });
            salvar(ctx);
            UI.aviso("Esforço Espiral: envelhece 1 ano (anote na ficha) e fica frustrado até o fim da cena.");
          } });
        }
        mostrar(principal ? Object.assign({}, principal, { nome: item.nome }) : { ok: true, tipo: "soma", nome: item.nome, expressao: "—", total: 0, rolagens: [], parcelas: [] },
          item.nome + (emMim ? " em " + nomeDaFicha(ctx) : " num ser adjacente"), notas, acoes);
      } },
    ] });
  }

  /* =================================================================
     A CENA ACABOU
     ================================================================= */

  function aoTrocarDeCena(ctx, cenaQueAcabou) {
    if (!A6()) return [];
    var o = ordemDe(ctx);
    if (!o.arquivo6) return [];
    var r = A6().aoTrocarDeCena(o, cenaQueAcabou);
    var avisos = [];
    if (r.imunidadeRetirada) avisos.push("Forças para Enfrentar: a imunidade a medo da cena acabou.");
    if (A6().rebotesPendentes(o).length) avisos.push("Aplicador de Adrenalina: o efeito acabou — aplique o rebote (fatigado) no painel do Arquivos Secretos 6.");
    return avisos;
  }

  /* =================================================================
     REGRA: EVOLUÇÃO MODULAR (aba Regras)
     ================================================================= */

  function corpoDaRegra(ctx, o, r) {
    if (!r || r.chave !== "evolucaoModular" || !E() || !P()) return null;
    permitidoGlobal = permitido(ctx);
    var partes = [linha(r.fa ? r.fa.aviso + " Autor: " + r.fa.autor + "." : "", "t-aviso")];
    if (E().modularLigada(o)) {
      var lista = E().associacoesModulares(o);
      if (lista.length) {
        partes.push(titulo("Escolhas de “Poder de classe” guardadas"));
        partes.push(linha("Elas não valem enquanto a regra estiver ligada. Associe cada uma a uma vaga de combate ou de utilidade que caiba — o registro original fica guardado e volta ao desligar."));
        var sugeridas = lista.filter(function (x) { return x.sugerida; });
        if (sugeridas.length > 1) partes.push(botao("Associar todas as sugeridas (" + sugeridas.length + ")", function () {
          var feitas = 0;
          sugeridas.forEach(function (x) { if (E().associarModular(o, x.registro.id, x.sugerida.id).ok) feitas++; });
          salvar(ctx);
          UI.avisoOk(feitas + " escolha(s) associada(s).");
        }));
        lista.forEach(function (x) {
          var nome = x.poder ? x.poder.nome : x.registro.nome;
          var alvo = x.sugerida ? x.sugerida.id : "";
          partes.push(el("div.faixa", {}, [
            linha(nome + " — " + (x.grupo === "geral" ? "poder geral (cabe em qualquer vaga)" : "poder de " + x.grupo) + " · escolhido em " + E().rotuloDoDegrau(parseInt(x.registro.etapa.slice(1), 10), R().trilho(o).separado) + "."),
            x.livres.length ? select(x.livres.map(function (v) { return { valor: v.id, rotulo: v.rotulo.replace(" (Evolução Modular)", "") + " · " + v.rotuloEtapa }; }), alvo, function (v) { alvo = v; }, "Vaga") : linha("Nenhuma vaga livre do grupo dele.", "t-aviso"),
            x.livres.length ? botao("Associar", function () {
              var res = E().associarModular(o, x.registro.id, alvo || x.livres[0].id);
              if (!res.ok) { UI.avisoAtencao(res.motivo); return; }
              salvar(ctx);
            }) : null,
          ]));
        });
      }
    }
    var amb = P().AMBIGUOS_MODULARES;
    var daClasse = P().PODERES_CLASSE.filter(function (p) { return amb[p.chave] && p.classes.indexOf(o.classe) >= 0; });
    if (daClasse.length) {
      var ajustes = (A6().dados(o).modular.grupos) || {};
      partes.push(el("details.as6-ambiguos", {}, [el("summary", { texto: "Poderes ambíguos da sua classe (" + daClasse.length + ") — a mesa pode reclassificar" }),
        el("div.pilha--curta", { class: "pilha" }, daClasse.map(function (p) {
          var atual = P().grupoModular(p, ajustes);
          return el("div.faixa", {}, [
            linha(p.nome + ": " + amb[p.chave]),
            select([{ valor: "", rotulo: "padrão (" + P().grupoModular(p, {}) + ")" }, { valor: "combate", rotulo: "combate" }, { valor: "utilidade", rotulo: "utilidade" }],
              ajustes[p.chave] || "", function (v) { A6().ajustarGrupo(o, p.chave, v); salvar(ctx); }, "Grupo de " + p.nome),
            ajustes[p.chave] ? linha("Ajuste da mesa: " + atual + ".") : null,
          ]);
        }))]));
    }
    return bloco(partes);
  }

  global.RAMAFichaArquivo6 = {
    painel: painel,
    controles: controles,
    controlesDeOrigem: controlesDeOrigem,
    acoesNoTeste: acoesNoTeste,
    condicoes: condicoes,
    botoesDeCondicoes: botoesDeCondicoes,
    aoTrocarDeCena: aoTrocarDeCena,
    opcoesNoRitual: opcoesNoRitual,
    aplicarNoRitual: aplicarNoRitual,
    notasDoDano: notasDoDano,
    opcoesDoItem: opcoesDoItem,
    observacoesDoItem: observacoesDoItem,
    corpoDaRegra: corpoDaRegra,
    rolarDeNovo: rolarDeNovo,
  };
})(window);
