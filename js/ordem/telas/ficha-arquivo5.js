/* =====================================================================
   R.A.M.A. — Ficha de Ordem · Arquivos Secretos 5
   =====================================================================
   A tela do que o AS5 põe numa ficha. A regra mora em
   js/ordem/arquivo5.js; aqui, só desenho, clique e gravação.

     painel(ctx)                no alto da aba Habilidades, só com o que
                                se aplica: a rodada da ficha, o que foi
                                recebido de aliados, armas corroídas
                                esperando a confirmação, a Larva da Fúria,
                                a Transmissão (Sino e empréstimos), os
                                selos e as Faixas da Vidência
     controles(ctx, aq)         os botões no cartão de um poder do AS5
     controlesDeOrigem(ctx,org) Ufólogo e Funcionário de Beira de Estrada
     antesDoTeste               Treinado nas Telas armado e Transmissão
                                de Perícia, ANTES de rolar
     acoesNoTeste               os bônus condicionais oferecidos no
                                resultado (nunca somados sozinhos)
     etiquetaDoEfeito,          Ruído de Comunicação: inverter um efeito
     botaoDoEfeito              sobre dados, com a origem
     aoTrocarDeCena             o ácido que acaba com a cena
     ajusteDoRitual             Paralinguística Ampliada (−1 PE)
     linhasDoSelo, consumirSelo, seloDisponivel
                                o uso de um Selo Paranormal em "Usar
                                ritual"
     opcoesDoItem, observacoesDoItem
                                os itens do AS5 e os selos

   Nada é rolado sem clique, nenhum dano é aplicado a outra ficha daqui
   e nada narrativo é resolvido pela ficha: a mesa confirma. O que vai
   para outra ficha (Sincronia Conectiva) passa pelo servidor, que
   confere tudo de novo.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var el = U.el;

  function A5() { return global.RAMAOrdemArquivo5; }
  function R() { return global.RAMAOrdemRegras; }
  function C() { return global.RAMAOrdemCatalogo; }
  function D() { return global.RAMADados; }
  function CD() { return global.RAMAOrdemCondicoes || null; }
  function EF() { return global.RAMAOrdemEfeitos || null; }
  function I() { return global.RAMAOrdemInventario || null; }
  function RT() { return global.RAMAOrdemRituais || null; }
  function PO() { return global.RAMAOrdemPoderes || null; }
  function E() { return global.RAMAOrdemProgressao || null; }
  function F() { return global.RAMAFicha; }

  function ordemDe(ctx) { return ctx.ficha.ordem; }
  function calc(ctx) { return R().calcular(ordemDe(ctx), ctx.ficha.inventario); }
  function salvar(ctx) { ctx.alterou(); ctx.redesenhar(); }
  function permitido(ctx) { return !ctx.podeEditar || ctx.podeEditar(); }
  function tem(o, k) { return !!(A5() && A5().temPoder(o, k)); }
  function sigla(o) { return R().usaDeterminacao(o) ? "PD" : "PE"; }
  function opId(prefixo) { return prefixo + "-" + String(U.uuid()).replace(/[^A-Za-z0-9]/g, "").slice(0, 20); }
  function dadosDoItem(item) { return I() ? I().dadosDoItem(item) : ((item && item.ordem) || {}); }
  function itens(ctx) { return (ctx.ficha.inventario && ctx.ficha.inventario.itens) || []; }
  function nomeDaFicha(ctx) { return String(ctx.ficha.nome || "Personagem").slice(0, 80); }
  function nomePericia(k) { var p = C().pericia(k); return p ? p.nome : k; }
  /* Os rituais da ficha moram em `rituais.itens`. */
  function rituaisDaFicha(ctx) { return (ctx.ficha.rituais && Array.isArray(ctx.ficha.rituais.itens)) ? ctx.ficha.rituais.itens : []; }

  function somar(expr) {
    /* `total` lê expressões com modificador ("1d8+3"); `somar`, só dados. */
    var r = D() && D().total ? D().total(expr) : (D() && D().somar ? D().somar(expr) : null);
    return r && r.ok !== false ? r : { total: 0, rolagens: [] };
  }
  function rolar(expr) { return somar(expr).total; }

  /* Gastar PE (ou PD, com "Jogando sem Sanidade"): o mesmo caminho das
     condições, que respeita o limite e o piso. */
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
  function rolagemDe(nome, expr) {
    var s = somar(expr);
    return { ok: true, tipo: "soma", nome: nome, expressao: expr, total: s.total, rolagens: s.rolagens || [], parcelas: [{ rotulo: expr, valor: s.total }] };
  }
  function nomesDeTexto(t) {
    return String(t || "").split(/[\n,;]+/).map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 12);
  }

  /* A mesa confirma: na campanha, o mestre (abrindo esta ficha pela
     mesa); sem campanha, quem joga registra a decisão da mesa. */
  function quemConfirma(ctx) { return ctx.ficha.campanhaId ? "mestre" : "mesa"; }
  function podeConfirmar(ctx) {
    if (!permitido(ctx)) return false;
    if (!ctx.ficha.campanhaId) return true;
    return !!(ctx.comoMestre && ctx.comoMestre());
  }
  var SO_O_MESTRE = "Na campanha, quem confirma é o mestre, abrindo esta ficha pela mesa.";

  /* Os outros personagens da campanha (nome e id), para escolher
     participantes; sem campanha, os nomes são digitados. */
  function personagensDaCampanha(ctx) {
    var id = ctx.ficha.campanhaId;
    if (!id || !global.RAMAApi || !global.RAMAApi.listarPersonagensCampanha) return Promise.resolve([]);
    return global.RAMAApi.listarPersonagensCampanha(id, { segundoPlano: true }).then(function (r) {
      if (!r || !r.ok) return [];
      return (r.dados || []).filter(function (p) { return p && p.id && p.id !== ctx.personagemId; })
        .map(function (p) { return { id: String(p.id), nome: String(p.nome || "Personagem") }; });
    }, function () { return []; });
  }

  /* =================================================================
     O PAINEL (aba Habilidades)
     ================================================================= */

  function painel(ctx) {
    if (!A5() || !F().ehDeOrdem(ctx.ficha)) return null;
    var o = ordemDe(ctx);
    A5().dados(o);
    permitidoGlobal = permitido(ctx);
    var partes = [
      secaoRodada(ctx, o),
      secaoDestruir(ctx, o),
      secaoLarva(ctx, o),
      secaoDeadMan(ctx, o),
      secaoTransmissao(ctx, o),
      secaoSelos(ctx, o),
      secaoFaixas(ctx, o),
      secaoRecebidos(ctx, o),
    ].filter(Boolean);
    if (!partes.length) return null;
    return el("section.as3-painel.as5-painel", { "aria-label": "Arquivos Secretos 5" }, [titulo("Arquivos Secretos 5")].concat(partes));
  }

  /* --- a rodada da ficha --- */

  function precisaDeRodada(ctx, o) {
    var a = A5().dados(o);
    var nitro = global.RAMAOrdemArquivo3 && o.arquivo3 && (o.arquivo3.veiculos || []).some(function (v) { return global.RAMAOrdemArquivo3.temRegalia(v, "oxidoNitroso"); });
    return tem(o, "desafiarOEgo") || !!a.larva || !!nitro;
  }
  function secaoRodada(ctx, o) {
    if (!precisaDeRodada(ctx, o)) return null;
    return el("div.faixa", {}, [
      linha("Rodada " + A5().rodada(o) + " desta cena (conta “uma vez por rodada” e “por 1 rodada”)."),
      botao("Próxima rodada", function () { proximaRodada(ctx); }),
    ]);
  }
  function proximaRodada(ctx) {
    var o = ordemDe(ctx);
    var lv = A5().dados(o).larva;
    if (lv) { fimDaRodadaDaLarva(ctx, function () { A5().proximaRodada(o); salvar(ctx); }); return; }
    A5().proximaRodada(o);
    salvar(ctx);
  }

  /* --- armas corroídas pelo ácido --- */

  function secaoDestruir(ctx, o) {
    var l = A5().dados(o).destruir;
    if (!l.length) return null;
    return bloco([titulo("Destruição pendente")].concat(l.map(function (d) {
      var existe = itens(ctx).some(function (i) { return i.id === d.itemId; });
      return el("div.faixa", {}, [
        linha(d.itemNome + " — " + d.motivo + (existe ? "" : " (o item já não está no inventário)")),
        existe ? botao("Confirmar: tirar do inventário", function () {
          ctx.ficha.inventario.itens = itens(ctx).filter(function (i) { return i.id !== d.itemId; });
          A5().resolverDestruicao(o, d.itemId);
          salvar(ctx);
          UI.aviso(d.itemNome + " foi destruída pelo ácido. O modelo da biblioteca continua igual.");
        }) : null,
        botao(existe ? "A mesa manteve a arma" : "Dispensar", function () { A5().resolverDestruicao(o, d.itemId); salvar(ctx); }),
      ]);
    })));
  }

  /* --- Larva da Fúria --- */

  function secaoLarva(ctx, o) {
    var lv = A5().dados(o).larva;
    if (!lv) return null;
    var inst = (o.condicoes && o.condicoes.efeitos || []).filter(function (x) { return x.id === lv.efeitoId; })[0];
    if (!inst || !EF().ativa(inst)) return null;
    return el("div.faixa", {}, [
      linha("Larva da Fúria: em fúria até o fim da cena (+4 no ataque e no dano corpo a corpo; nada que exija calma e concentração)."),
      botao("Fim da rodada…", function () { fimDaRodadaDaLarva(ctx, function () { salvar(ctx); }); }),
    ]);
  }
  function fimDaRodadaDaLarva(ctx, depois) {
    var o = ordemDe(ctx);
    UI.modal({ titulo: "Fim da rodada — Larva da Fúria", conteudo: bloco([
      linha("Nesta rodada, você atacou ou foi alvo de um efeito hostil (ataque, habilidade…)? Se não, a fúria termina (AS5 p. 61)."),
    ]), botoes: [
      { rotulo: "Não: a fúria termina", classe: "r-botao--fantasma", aoClicar: function (f) {
        var r = A5().fimDaRodadaDaLarva(o, false);
        if (r.termina && EF()) EF().encerrar(o.condicoes, r.efeitoId, "manual", "Larva da Fúria: rodada sem hostilidade");
        f();
        depois();
        UI.aviso("A fúria da Larva terminou.");
      } },
      { rotulo: "Sim: continua", classe: "r-botao--principal", aoClicar: function (f) { A5().fimDaRodadaDaLarva(o, true); f(); depois(); } },
    ] });
  }

  /* --- Dead Man Switch: o aviso do fim --- */

  function secaoDeadMan(ctx, o) {
    var d = A5().dados(o).deadMan;
    if (!d || d.encerrado || !tem(o, "deadManSwitch")) return null;
    var machucado = R().machucado(o);
    if (A5().deadManValendo(o, machucado)) return null;
    return el("div.faixa", {}, [
      linha("Dead Man Switch: você passou da metade dos PV — o efeito terminou. Avise os alvos (" + d.alvos.join(", ") + ") para tirarem o grau recebido.", "t-aviso"),
      botao("Encerrar", function () { A5().encerrarDeadMan(o, "recuperou"); salvar(ctx); }),
    ]);
  }

  /* --- Faixas da Vidência --- */

  function secaoFaixas(ctx, o) {
    var f = A5().faixasVestidas(ctx.ficha.inventario);
    if (!f) return null;
    var def = calc(ctx).defesa.total;
    return linha("Faixas da Vidência: Defesa " + (def + 5) + " e +5 na resistência contra origem em alcance curto (até 9 m); Defesa " + (def - 5) +
      " e −5 na resistência contra origem além de 9 m. A Defesa da ficha (" + def + ") não soma nenhum dos dois — depende de cada ataque (AS5 p. 60).");
  }

  /* --- recebido de aliados --- */

  function secaoRecebidos(ctx, o) {
    if (!A5().regraLigada(o, "aliados")) return null;
    var vale = A5().recebidosValendo(o);
    var corpo = [linha("Benefícios que outro personagem dá a este (Aura de Confiança, Parede de Carne, Direção Defensiva, Gaiola de Proteção, Dead Man Switch). Quem tem o poder não recebe o próprio benefício: registre aqui só o que veio de outro.")];
    vale.forEach(function (r) {
      var q = A5().RECEBIVEIS[r.tipo];
      corpo.push(el("div.faixa", {}, [
        linha(q.nome + " — de " + r.de + (r.pericia ? ": " + nomePericia(r.pericia) + " (" + r.grau + ")" : "") + ". " + q.texto +
          (r.ate === "cena" ? " Até o fim da cena." : r.ate === "missao" ? " Até o fim da missão." : " Até tirar.")),
        botao("Tirar", function () { A5().removerRecebido(o, r.id); salvar(ctx); }),
      ]));
    });
    corpo.push(botao("Registrar um benefício recebido…", function () { registrarRecebido(ctx); }));
    return UI.recolhivel({ titulo: "Recebido de aliados", extra: vale.length ? vale.length + " valendo" : "", conteudo: bloco(corpo) });
  }

  function registrarRecebido(ctx) {
    var o = ordemDe(ctx);
    var tipo = "aura";
    var de = UI.campo({ rotulo: "De quem veio", limite: 80 });
    var pericia = "";
    var grau = "treinado";
    var ate = "remover";
    var extra = el("div.pilha--curta", { class: "pilha" });
    var pericias = (C().PERICIAS || []).map(function (p) { return { valor: p.chave, rotulo: p.nome }; });
    function pintarExtra() {
      if (tipo !== "deadMan") { U.trocar(extra, linha(A5().RECEBIVEIS[tipo].texto + " Vale até o fim da cena.")); return; }
      if (!pericia && pericias.length) pericia = pericias[0].valor;
      U.trocar(extra, [
        rotulado("Perícia", select(pericias, pericia, function (v) { pericia = v; })),
        rotulado("Grau de quem transmitiu", select([{ valor: "treinado", rotulo: "Treinado" }, { valor: "veterano", rotulo: "Veterano" }, { valor: "expert", rotulo: "Expert" }], grau, function (v) { grau = v; })),
        rotulado("Até quando", select([
          { valor: "remover", rotulo: "Enquanto quem transmitiu estiver machucado (tire quando ele se recuperar)" },
          { valor: "missao", rotulo: "Até o fim da missão (afinidade: quem transmitiu morreu)" },
        ], ate, function (v) { ate = v; })),
        linha("Vai só o GRAU de treinamento: o seu atributo e os seus bônus continuam os seus (AS5 p. 57)."),
      ]);
    }
    pintarExtra();
    UI.modal({ titulo: "Benefício recebido de outro personagem", conteudo: bloco([
      rotulado("Benefício", select(Object.keys(A5().RECEBIVEIS).map(function (k) { return { valor: k, rotulo: A5().RECEBIVEIS[k].nome + " (AS5 p. " + A5().RECEBIVEIS[k].pagina + ")" }; }), tipo, function (v) { tipo = v; pintarExtra(); })),
      de, extra,
    ]), botoes: [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Registrar", classe: "r-botao--principal", aoClicar: function (f) {
        var quem = de.entrada.value.trim();
        if (quem && quem.toLowerCase() === nomeDaFicha(ctx).toLowerCase()) { UI.avisoAtencao("O próprio personagem não recebe o benefício que ele mesmo dá."); return; }
        var r = A5().adicionarRecebido(o, tipo, quem, tipo === "deadMan" ? { pericia: pericia, grau: grau, ate: ate } : null);
        if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
        f();
        salvar(ctx);
      } },
    ] });
  }

  /* --- Transmissão --- */

  function temTransmissao(o) {
    return A5().PODERES_DE_TRANSMISSAO.some(function (k) { return tem(o, k); });
  }
  function secaoTransmissao(ctx, o) {
    if (!A5().regraLigada(o, "transmissao")) return null;
    var sino = A5().sino(o);
    if (!temTransmissao(o) && !sino.registrado) {
      return UI.recolhivel({ titulo: "Sino de Transmissão", conteudo: bloco([
        linha("Os poderes paranormais de Transmissão (AS5 p. 62) pedem a conexão com o Sino de Transmissão, registrada aqui e confirmada pela mesa."),
        botao("Registrar a conexão com o Sino…", function () { registrarSino(ctx); }),
      ]) });
    }
    var partes = [titulo("Transmissão")];
    partes.push(linha("Sino de Transmissão: " + (sino.registrado ? "conexão registrada" + (sino.nota ? " (" + sino.nota + ")" : "") + (sino.confirmado ? " e confirmada pel" + (sino.confirmadoPor === "mestre" ? "o mestre" : "a mesa") + "." : " — falta a confirmação da mesa.") : "sem conexão registrada.")));
    var acoes = [];
    if (!sino.registrado) acoes.push(botao("Registrar a conexão…", function () { registrarSino(ctx); }));
    if (sino.registrado && !sino.confirmado) acoes.push(botao("Confirmar (" + (quemConfirma(ctx) === "mestre" ? "mestre" : "mesa") + ")", function () {
      A5().confirmarSino(o, quemConfirma(ctx)); salvar(ctx);
    }, { desligado: !podeConfirmar(ctx), dica: podeConfirmar(ctx) ? "" : SO_O_MESTRE }));
    if (sino.registrado) acoes.push(botao("Desfazer o registro", function () {
      UI.confirmar({ titulo: "Desfazer a conexão com o Sino?", texto: "Os poderes de Transmissão ficam sem o pré-requisito (a progressão avisa).", rotuloConfirmar: "Desfazer", perigo: true })
        .then(function (sim) { if (sim) { A5().desfazerSino(o); salvar(ctx); } });
    }, { desligado: sino.confirmado && !podeConfirmar(ctx), dica: sino.confirmado && !podeConfirmar(ctx) ? SO_O_MESTRE : "" }));
    partes.push(el("div.faixa", {}, acoes));
    partes.push(linha("Um poder de Transmissão só funciona quando dois ou mais seres têm o mesmo poder (p. 62): marque os outros portadores no cartão de cada poder."));
    var emp = [];
    var ep = A5().periciaEmprestada ? A5().dados(o).transmissao.pericia : null;
    if (ep && ep.cena === A5().cenaDe(o)) emp.push(linha("Transmissão de Perícia: " + nomePericia(ep.pericia) + " com os valores de " + ep.de + " até o fim da cena."));
    var epd = A5().poderEmprestado(o);
    if (epd) { var pp = PO().poder(epd.chave); emp.push(linha("Transmissão de Poder: " + (pp ? pp.nome : epd.chave) + ", de " + epd.de + ", até o fim da cena." + (pp ? " " + pp.resumo : ""))); }
    var er = A5().ritualEmprestado(o);
    if (er) emp.push(el("div.faixa", {}, [linha("Transmissão de Ritual: " + er.ritual.nome + ", de " + er.de + ", até o fim da cena."),
      botao("Usar " + er.ritual.nome + "…", function () { usarRitualEmprestado(ctx); })]));
    return bloco(partes.concat(emp));
  }
  function registrarSino(ctx) {
    var nota = UI.campo({ rotulo: "Como a conexão aconteceu (opcional)", limite: 300 });
    UI.modal({ titulo: "Conexão com o Sino de Transmissão", conteudo: bloco([
      linha("Registrar a conexão é o primeiro passo; a mesa confirma (na campanha, o mestre). Só com a confirmação os poderes de Transmissão ficam disponíveis na progressão."),
      nota,
    ]), botoes: [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Registrar", classe: "r-botao--principal", aoClicar: function (f) {
        A5().registrarSino(ordemDe(ctx), nota.entrada.value);
        if (podeConfirmar(ctx) && !ctx.ficha.campanhaId) UI.aviso("Sem campanha: confirme pela mesa no painel do Arquivos Secretos 5.");
        f(); salvar(ctx);
      } },
    ] });
  }
  function usarRitualEmprestado(ctx) {
    var er = A5().ritualEmprestado(ordemDe(ctx));
    if (!er) return;
    if (!global.RAMASecaoConsumo || !global.RAMASecaoConsumo.usarRitual) { UI.avisoAtencao("“Usar ritual” não está disponível nesta página."); return; }
    global.RAMASecaoConsumo.usarRitual(ctx, Object.assign({ id: "emprestado-" + er.cena }, er.ritual));
  }

  /* --- selos --- */

  function secaoSelos(ctx, o) {
    if (!A5().temCriarSelo(o)) return null;
    var pre = R().atributo(o, "pre");
    var maximo = A5().maximoDeSelos(o, pre);
    var proprios = A5().selosProprios(o, ctx.ficha.inventario, ctx.personagemId);
    return el("div.faixa", {}, [
      linha("Selos: " + proprios + " seu(s) no inventário de " + maximo + " ao mesmo tempo" + (A5().seloDobrado(o) ? " (Criar Selo recebido de novo: o dobro da Presença)" : " (a Presença)") +
        " · " + A5().selosPorAcao(o) + " por ação de interlúdio · cada um custa o PE do ritual."),
      botao("Criar selos (ação de interlúdio)…", function () { criarSelos(ctx); }, { desligado: !A5().emInterludio(o), dica: A5().emInterludio(o) ? "" : "Só numa cena de interlúdio." }),
    ]);
  }

  /* Os rituais que a ficha CONHECE (só eles viram selo). */
  function rituaisConhecidos(ctx) {
    var o = ordemDe(ctx);
    var est = E() ? E().estado(o, { inventario: ctx.ficha.inventario }) : null;
    var porRitual = est && est.rituais ? est.rituais.porRitual : null;
    return rituaisDaFicha(ctx).filter(function (r) {
      if (!r || !r.nome) return false;
      if (!porRitual) return true;
      var v = porRitual[r.id];
      return !!(v && v.situacao !== "registro");
    });
  }
  function custoDoRitual(r) {
    var c = RT() && RT().custoDaVersao ? RT().custoDaVersao(r, (r.versoes && r.versoes[0]) || { nome: "Normal" }) : null;
    return c ? c.base : 0;
  }
  function circuloDoRitual(r) {
    var d = RT() && RT().dadosDoRitual ? RT().dadosDoRitual(r) : {};
    return Number(d.circulo) || (r.ordem && r.ordem.circulo) || 1;
  }

  function criarSelos(ctx) {
    var o = ordemDe(ctx);
    var conhecidos = rituaisConhecidos(ctx);
    if (!conhecidos.length) { UI.avisoAtencao("Selos são feitos dos rituais que você conhece — a ficha não tem nenhum conhecido."); return; }
    var porAcao = A5().selosPorAcao(o);
    var escolhas = [];
    for (var i = 0; i < porAcao; i++) escolhas.push(i === 0 ? conhecidos[0].id : "");
    var corpo = el("div.pilha--curta", { class: "pilha" });
    var id = opId("fab");
    function plano() {
      var lista = escolhas.filter(Boolean).map(function (rid) {
        var r = conhecidos.filter(function (x) { return x.id === rid; })[0];
        return r ? { ritual: r.nome, custo: custoDoRitual(r), r: r } : null;
      }).filter(Boolean);
      return { lista: lista, p: A5().planoDeFabricacao(o, ctx.ficha.inventario, R().atributo(o, "pre"), lista, ctx.personagemId) };
    }
    function pintar() {
      var pl = plano();
      U.trocar(corpo, [
        linha("Uma ação de interlúdio cria até " + porAcao + " selo(s). Cada um custa o PE do ritual (o custo do círculo). Selo de Paralinguística/Caligrafia/Supremo: os benefícios do autor ficam gravados no selo."),
      ].concat(escolhas.map(function (v, idx) {
        return rotulado("Selo " + (idx + 1), select([{ valor: "", rotulo: idx ? "— nenhum —" : "Escolha o ritual" }].concat(conhecidos.map(function (r) {
          return { valor: r.id, rotulo: r.nome + " (" + circuloDoRitual(r) + "º círculo, " + custoDoRitual(r) + " PE)" };
        })), v, function (nv) { escolhas[idx] = nv; pintar(); }));
      }), [
        pl.p.ok ? linha("Total: " + pl.p.quantidade + " selo(s), " + pl.p.custo + " " + sigla(o) + " · você terá " + (pl.p.atuais + pl.p.quantidade) + " de " + pl.p.maximo + ".") : linha(pl.p.motivo, "t-aviso"),
      ]));
    }
    pintar();
    UI.modal({ titulo: "Criar selos", conteudo: [corpo], botoes: [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Criar", classe: "r-botao--principal", aoClicar: function (f) {
        var pl = plano();
        if (!pl.p.ok) { UI.avisoAtencao(pl.p.motivo); return; }
        if (A5().dados(o).selos.fabricacoes.some(function (x) { return x.id === id; })) { f(); return; }
        if (pl.p.custo && !gastar(ctx, pl.p.custo)) return;
        A5().registrarFabricacao(o, id, pl.p);
        var autoria = A5().autoriaDe(o);
        /* Selos iguais (mesmo ritual) viram um item com quantidade. */
        var grupos = {};
        pl.lista.forEach(function (x) { grupos[x.r.id] = grupos[x.r.id] || { x: x, n: 0 }; grupos[x.r.id].n++; });
        Object.keys(grupos).forEach(function (k) {
          var g = grupos[k];
          var r = g.x.r;
          var item = F().criarItem("item", {
            nome: "Selo paranormal — " + r.nome, origemCatalogoId: "op.amaldicoado.selos-paranormais", categoria: "Amaldiçoados",
            descricao: "Selo de " + r.nome + " feito por " + nomeDaFicha(ctx) + (autoria.caligrafia || autoria.supremo ? " (Criptologista do Oculto: " + [autoria.caligrafia ? "Caligrafia Eficiente" : "", autoria.supremo ? "Selo Supremo" : ""].filter(Boolean).join(", ") + ")" : "") + ".",
            ordem: {
              quantidade: g.n, espacos: 1, categoria: Math.min(4, circuloDoRitual(r)), amaldicoado: true, grupo: "amaldicoado",
              referencia: { fonte: "OPRPG", pagina: 151 },
              selo: { ritual: r.nome, ritualId: r.origemCatalogoId || "", circulo: circuloDoRitual(r), elemento: (RT() && RT().dadosDoRitual ? RT().dadosDoRitual(r).elemento : "") || "",
                custo: custoDoRitual(r), versao: "normal", autor: { nome: nomeDaFicha(ctx), personagemId: ctx.personagemId || "" },
                autoria: autoria, fabricacao: id, criadoEm: U.agoraISO() },
            },
          });
          item.adicionadoEm = U.agoraISO();
          ctx.ficha.inventario.itens.push(item);
        });
        f();
        salvar(ctx);
        UI.avisoOk(pl.p.quantidade + " selo(s) criado(s) (" + pl.p.custo + " " + sigla(o) + "). Recarregar a ficha não fabrica de novo.");
      } },
    ] });
  }

  /* O uso de um selo: o plano (teste de uso, benefícios do autor) e o
     "Usar ritual" com o ritual do selo. */
  function usarSelo(ctx, item) {
    var o = ordemDe(ctx);
    var d = dadosDoItem(item);
    if (!d.selo) return;
    var conhecido = rituaisDaFicha(ctx).filter(function (r) {
      return (d.selo.ritualId && r.origemCatalogoId === d.selo.ritualId) || String(r.nome || "").toLowerCase() === d.selo.ritual.toLowerCase();
    })[0];
    var conhece = !!conhecido && rituaisConhecidos(ctx).indexOf(conhecido) >= 0;
    var plano = A5().planoDeUso(o, d.selo, conhece);
    if (!plano.ok) { UI.avisoAtencao(plano.motivo); return; }
    var ritual = conhecido;
    if (!ritual) {
      /* Quem não conhece o ritual usa a cópia do catálogo (se carregado) —
         o selo não vira ritual da ficha. */
      var cat = RT() && RT().catalogoPronto ? RT().catalogoPronto() : null;
      var mod = d.selo.ritualId && cat && cat.porId ? cat.porId[d.selo.ritualId] : null;
      var pf = mod && RT().paraFicha ? RT().paraFicha(mod) : null;
      ritual = pf && pf.ok ? Object.assign({ id: "selo-" + item.id }, pf.dados)
        : { id: "selo-" + item.id, nome: d.selo.ritual, ordem: { circulo: d.selo.circulo, elemento: d.selo.elemento, custo: d.selo.custo }, versoes: [{ nome: "Normal" }] };
    }
    if (!global.RAMASecaoConsumo || !global.RAMASecaoConsumo.usarRitual) { UI.avisoAtencao("“Usar ritual” não está disponível nesta página."); return; }
    var abrir = function () { global.RAMASecaoConsumo.usarRitual(ctx, ritual, { selo: { plano: plano, itemId: item.id } }); };
    if (!plano.teste) { abrir(); return; }
    /* O teste de USO vem antes: Ocultismo contra a DT do selo. */
    UI.modal({ titulo: "Usar selo — teste de uso", conteudo: bloco([
      linha(plano.teste.motivo + ": Ocultismo DT " + plano.teste.dt + "."),
      linha("Este é o teste para conseguir usar o selo — não é o do Custo do Paranormal, que continua depois."),
      botao("Rolar Ocultismo", function () { if (global.RAMAOrdemRolarPericia) global.RAMAOrdemRolarPericia(ctx, "ocultismo", "Ocultismo · usar selo (DT " + plano.teste.dt + ")"); }),
    ]), botoes: [
      { rotulo: "Falhei (o selo não é usado)", classe: "r-botao--fantasma", aoClicar: function (f) { f(); UI.aviso("O selo não foi usado — nada é consumido (o livro não diz que ele se perde na falha)."); } },
      { rotulo: "Passei: usar o selo", classe: "r-botao--principal", aoClicar: function (f) { f(); abrir(); } },
    ] });
  }

  function linhasDoSelo(ctx, plano) {
    var l = [];
    var s = plano.selo;
    l.push(linha("Selo de " + s.ritual + " feito por " + (s.autor.nome || "alguém") + ". Sem componentes (OPRPG p. 151)."));
    l.push(linha(plano.dispensaTeste || (plano.teste ? "Teste de uso: Ocultismo DT " + plano.teste.dt + " (já feito)." : "")));
    if (plano.dtMais) l.push(linha("Selo Supremo do autor: a DT de resistência do ritual aumenta em +5."));
    if (plano.dadosDeDanoMais) l.push(linha("Selo Supremo do autor: se o ritual causa dano, a rolagem ganha +3 dados do mesmo tipo."));
    l.push(linha(plano.decifrar ? "Decifrar à Distância: não precisa empunhar nem ler em voz alta — basta poder ler, com o selo em alcance curto." : "Empunhe o selo e leia em voz alta (ação padrão ou a do ritual, a maior)."));
    l.push(linha(plano.custoDoParanormal));
    return l.filter(function (x) { return x && x.textContent; });
  }
  function seloDisponivel(ctx, itemId, op) {
    if (A5().usoRegistrado(ordemDe(ctx), op)) return true;
    var item = itens(ctx).filter(function (i) { return i.id === itemId; })[0];
    return !!(item && dadosDoItem(item).selo);
  }
  /* Uma unidade do selo, uma vez por operação. */
  function consumirSelo(ctx, itemId, op, ritual) {
    var o = ordemDe(ctx);
    var reg = A5().registrarUsoDeSelo(o, op, itemId, ritual);
    if (!reg.ok) return reg;
    if (reg.repetido) return { ok: true, repetido: true };
    var item = itens(ctx).filter(function (i) { return i.id === itemId; })[0];
    if (!item) return { ok: true };
    var q = (item.ordem && item.ordem.quantidade) || 1;
    if (q > 1) item.ordem.quantidade = q - 1;
    else ctx.ficha.inventario.itens = itens(ctx).filter(function (i) { return i.id !== itemId; });
    return { ok: true };
  }

  /* =================================================================
     CONTROLES DOS PODERES
     ================================================================= */

  var CONTROLES = {
    auraDeConfianca: function (ctx, o) {
      var nomes = A5().aliadosNaCena(o, "aura");
      return [
        linha(nomes.length ? "Aliados no raio de 18 m nesta cena: " + nomes.join(", ") + ". Cada um liga o bônus na própria ficha." : "Nenhum aliado marcado nesta cena."),
        botao("Marcar aliados no raio de 18 m…", function () { marcarAliados(ctx, "aura", "Aura de Confiança — aliados num raio de 18 m"); }),
      ];
    },
    paredeDeCarne: function (ctx, o) {
      var nomes = A5().aliadosNaCena(o, "parede");
      return [
        linha(nomes.length ? "Aliados adjacentes nesta cena: " + nomes.join(", ") + ". Cada um liga a cobertura leve na própria ficha." : "Nenhum aliado adjacente marcado."),
        botao("Marcar aliados adjacentes…", function () { marcarAliados(ctx, "parede", "Parede de Carne — aliados adjacentes"); }),
      ];
    },
    folegoDeEmergencia: function (ctx, o) {
      var u = A5().folegoNaCena(o);
      return [u ? linha("Usado nesta cena: +" + u.valor + " " + u.recurso.toUpperCase() + " (" + u.rolagem + ").") : null,
        botao(u ? "Já usado nesta cena" : "Fôlego de Emergência (ação de movimento)…", function () { folego(ctx); }, { desligado: !!u })];
    },
    treinadoNasTelas: function (ctx, o) {
      var armado = A5().telasArmado(o);
      return [linha(armado ? "Armado: o próximo teste de Iniciativa ou Reflexos usa o Intelecto e cobra 2 " + sigla(o) + "." : "Escolha antes de rolar: arme e role Iniciativa ou Reflexos."),
        botao(armado ? "Desarmar" : "Armar o próximo teste (2 " + sigla(o) + " ao rolar)", function () { A5().armarTelas(o, !armado); salvar(ctx); })];
    },
    meditacaoOcultista: function (ctx, o) {
      var feita = A5().meditouNoInterludio(o);
      return [botao(feita ? "Já meditou neste interlúdio" : "Meditar (ação de interlúdio)…", function () { meditar(ctx); },
        { desligado: feita || !A5().emInterludio(o), dica: A5().emInterludio(o) ? "" : "Só numa cena de interlúdio." })];
    },
    ruidoDeComunicacao: function (ctx, o) {
      return [botao("Usar (reação, 4 " + sigla(o) + ")…", function () { ruido(ctx); }),
        linha("Na ficha do alvo, o efeito sobre dados é invertido pelo botão “Inverter (Ruído)” do próprio efeito, com o seu nome.")];
    },
    desafiarOEgo: function (ctx, o) {
      var pend = A5().dados(o).desafios.filter(function (d) { return d.resultado === "pendente"; });
      var usado = A5().desafioNaRodada(o);
      return [botao(usado ? "Já usado nesta rodada" : "Desafiar o Ego (reação, 1 " + sigla(o) + ")…", function () { desafio(ctx); }, { desligado: !!usado })]
        .concat(pend.map(function (d) {
          return el("div.faixa", {}, [
            linha("Ataque de " + d.aliado + (d.ataque ? " (" + d.ataque + ")" : "") + " — rodada " + d.rodada + ":"),
            botao("Acertou", function () {
              var r = A5().resolverDesafio(o, d.id, true, R().atributo(o, "pre"));
              if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
              salvar(ctx);
              UI.aviso(d.aliado + " causa +" + r.desafio.danoExtra + " de dano extra (a sua Presença). Quem soma é o aliado.", { duracao: 8000 });
            }),
            botao("Errou: devolver 1 " + sigla(o), function () {
              var r = A5().resolverDesafio(o, d.id, false);
              if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
              recuperar(ctx, "pe", r.devolver);
              salvar(ctx);
              UI.aviso("O ataque errou: 1 " + sigla(o) + " recuperado (uma vez).");
            }),
          ]);
        }));
    },
    direcaoDefensiva: function (ctx, o) {
      var sim = A5().dirigindo(o);
      return [botao(sim ? "Parei de dirigir" : "Dirigindo nesta cena", function () { A5().dirigir(o, !sim); salvar(ctx); }),
        linha(sim ? "+2 na Defesa e nos testes de resistência (você e os passageiros — cada um liga na própria ficha)." : "Dirigindo, você e os passageiros recebem +2 na Defesa e em testes de resistência.")];
    },
    apaixonadoPorVeiculos: function (ctx, o) {
      var vo = global.RAMAOrdemArquivo3 && global.RAMAOrdemArquivo3.regraLigada ? global.RAMAOrdemArquivo3.regraLigada(o, "veiculos") : null;
      return [linha("Com Veículos Operacionais ligada, a regalia extra (fora do limite) é escolhida em “Regalias…” do veículo, no painel do Arquivos Secretos 3." + (vo === false ? " A regra está desligada nesta ficha." : ""))];
    },
    acidoCorrosivo: function (ctx, o) {
      var ac = A5().acidoValendo(o);
      return [
        ac ? linha("Valendo nesta cena: " + (ac.alvo === "desarmado" ? "ataques desarmados" : ac.itemNome + (ac.amaldicoado ? " (amaldiçoada: não é destruída)" : " (destruída no fim da cena)")) + ".") : null,
        ac ? botao("Ataque desarmado com ácido", function () { ataqueDesarmado(ctx); }, { desligado: ac.alvo !== "desarmado" }) : null,
        ac ? botao("Encerrar o ácido", function () { A5().encerrarAcido(o); salvar(ctx); }) : botao("Expelir ácido (1 " + sigla(o) + ")…", function () { acido(ctx); }),
      ];
    },
    deadManSwitch: function (ctx, o) {
      var machucado = R().machucado(o);
      var d = A5().dados(o).deadMan;
      var vale = A5().deadManValendo(o, machucado);
      var l = [];
      if (vale) {
        l.push(linha("Transmitido a " + vale.alvos.join(", ") + ": " + vale.pericias.map(function (k) { return nomePericia(k) + " (" + vale.graus[k] + ")"; }).join(", ") + (vale.morreu ? " — você morreu: mantém até o fim da missão." : ".")));
        if (!vale.morreu) l.push(botao("Morri", function () {
          var r = A5().morrerComDeadMan(o);
          salvar(ctx);
          UI.aviso(r.mantem ? "Com afinidade, os alvos mantêm as perícias até o fim da missão." : "Sem afinidade, o efeito terminou com a morte.", { duracao: 8000 });
        }));
        l.push(botao("Encerrar", function () { A5().encerrarDeadMan(o, "manual"); salvar(ctx); }));
      } else {
        l.push(botao(machucado ? "Transmitir (Dead Man Switch)…" : "Só machucado (metade dos PV ou menos)", function () { deadMan(ctx); }, { desligado: !machucado }));
      }
      return l;
    },
    paralinguisticaAmpliada: function (ctx, o) {
      var af = A5().comAfinidade(o, "paralinguisticaAmpliada");
      var ritual = rituaisDaFicha(ctx).filter(A5().ehCompreensaoParanormal)[0];
      var reducao = ritual ? A5().reducaoDaParalinguistica(o, ritual) : 0;
      return [
        linha("+" + (af ? 10 : 5) + " oferecido no resultado de um teste para compreender uma linguagem do Outro Lado."),
        linha(!ritual ? "Compreensão Paranormal: traga-a pela concessão do poder (aba Rituais)." : reducao ? "Compreensão Paranormal já era conhecida: “Usar ritual” cobra 1 PE a menos." : "Compreensão Paranormal aprendida pelo poder."),
        af ? linha("Afinidade: sempre sob Compreensão Paranormal na forma discente — sem conjurar e sem custo.") : null,
      ];
    },
    adeptoDoEscuro: function () { return [linha("Ignora camuflagem leve e total por escuridão. O +2 de penumbra é oferecido no resultado de Investigação.")]; },
    saudosistaHiTech: function () { return [linha("O +5 é oferecido no resultado de Tecnologia (aparelho anterior aos anos 2000).")]; },
    catalogoDeCriaturasAmbulante: function () { return [linha("O +5 é oferecido no resultado de Ocultismo (identificar criatura, vista ou por vestígio).")]; },
    caligrafiaEficiente: function () { return [linha("Gravado nos selos que você cria. O +5 para identificar rituais é oferecido no resultado de Ocultismo.")]; },
    decifrarADistancia: function () { return [linha("Vale em todo selo que você usar. O +5 para compreender linguagens do Outro Lado é oferecido no resultado do teste.")]; },
    seloSupremo: function () { return [linha("Gravado nos selos que você cria: sem teste de uso, DT +5, +3 dados de dano, forma avançada sem o custo adicional.")]; },
    metodoIntuitivo: function (ctx, o) { return [linha("Criar Selo: veja o painel do Arquivos Secretos 5 (" + A5().selosPorAcao(o) + " selos por ação de interlúdio).")]; },
    conexaoComunicativa: function (ctx, o) { return controlesDeTransmissao(ctx, o, "conexaoComunicativa"); },
    sincroniaConectiva: function (ctx, o) { return controlesDeTransmissao(ctx, o, "sincroniaConectiva"); },
    transmissaoDePericia: function (ctx, o) { return controlesDeTransmissao(ctx, o, "transmissaoDePericia"); },
    transmissaoDePoder: function (ctx, o) { return controlesDeTransmissao(ctx, o, "transmissaoDePoder"); },
    transmissaoDeRitual: function (ctx, o) { return controlesDeTransmissao(ctx, o, "transmissaoDeRitual"); },
  };

  function controles(ctx, aq) {
    if (!A5() || !aq) return null;
    permitidoGlobal = permitido(ctx);
    var f = CONTROLES[aq.chave];
    if (!f) return null;
    var partes = (f(ctx, ordemDe(ctx), aq) || []).filter(Boolean);
    return partes.length ? el("div.pilha--curta.origem-controles", { class: "pilha" }, partes) : null;
  }

  function marcarAliados(ctx, qual, rotulo) {
    var o = ordemDe(ctx);
    var campo = el("textarea.r-area", { rows: 3, "aria-label": "Aliados (um por linha)" });
    campo.value = A5().aliadosNaCena(o, qual).join("\n");
    var lista = el("div.pilha--curta", { class: "pilha" }, [linha("Carregando a mesa…")]);
    personagensDaCampanha(ctx).then(function (ps) {
      U.trocar(lista, ps.length ? [linha("Da mesa:")].concat(ps.map(function (p) {
        return botao("+ " + p.nome, function () { campo.value = nomesDeTexto(campo.value + "\n" + p.nome).join("\n"); });
      })) : [linha(ctx.ficha.campanhaId ? "A mesa não respondeu: digite os nomes." : "Sem campanha: digite os nomes.")]);
    });
    UI.modal({ titulo: rotulo, conteudo: bloco([linha("Você não entra na lista: o benefício é só dos aliados."), el("div.faixa", {}, [lista]), campo]), botoes: [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Marcar", classe: "r-botao--principal", aoClicar: function (f) {
        var nomes = nomesDeTexto(campo.value).filter(function (n) { return n.toLowerCase() !== nomeDaFicha(ctx).toLowerCase(); });
        A5().marcarAliados(o, qual, nomes);
        f(); salvar(ctx);
      } },
    ] });
  }

  function folego(ctx) {
    var o = ordemDe(ctx);
    var ameaca = false;
    var qual = "pv";
    var vig = R().atributo(o, "vig");
    UI.modal({ titulo: "Fôlego de Emergência", conteudo: bloco([
      linha("Uma vez por cena, ação de movimento: recupera 1d8 + Vigor (" + vig + ") em PV ou " + sigla(o) + ", à sua escolha."),
      el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) { ameaca = ev.target.checked; } }), el("span", { texto: "Há alguma ameaça presente (o poder só funciona assim)" })]),
      rotulado("Recuperar", select([{ valor: "pv", rotulo: "Pontos de vida" }, { valor: "pe", rotulo: sigla(o) }], qual, function (v) { qual = v; })),
    ]), botoes: [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Rolar e recuperar", classe: "r-botao--principal", aoClicar: function (f) {
        if (!ameaca) { UI.avisoAtencao("Só com alguma ameaça presente (AS5 p. 55)."); return; }
        if (A5().folegoNaCena(o)) { UI.avisoAtencao("Já usado nesta cena."); f(); return; }
        var expr = "1d8+" + vig;
        var r = rolagemDe("Fôlego de Emergência", expr);
        var reg = A5().registrarFolego(o, qual === "pe" && R().usaDeterminacao(o) ? "pd" : qual, r.total, expr + " = " + r.total);
        if (!reg.ok) { UI.avisoAtencao(reg.motivo); return; }
        var m = recuperar(ctx, qual, r.total);
        f(); salvar(ctx);
        mostrar(r, "Fôlego de Emergência", [m.qual + " " + m.antes + " → " + m.depois + " (máximo " + m.maximo + ")."]);
      } },
    ] });
  }

  function meditar(ctx) {
    var o = ordemDe(ctx);
    var c = calc(ctx);
    var limite = c.limitePe ? c.limitePe.total : 0;
    var condicao = "normal";
    var conta = el("p.t-mini");
    function pintar() { conta.textContent = A5().planoDeMeditacao(limite, condicao).conta + " " + sigla(o) + "."; }
    pintar();
    UI.modal({ titulo: "Meditação (ação de interlúdio)", conteudo: bloco([
      linha("Uma vez por interlúdio. O multiplicador da condição substitui o dobro do normal — não se soma a ele."),
      rotulado("Condição de meditação", select(A5().CONDICOES_DE_MEDITACAO.map(function (x) { return { valor: x.chave, rotulo: x.nome + " — " + x.texto }; }), condicao, function (v) { condicao = v; pintar(); })),
      conta,
    ]), botoes: [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Meditar", classe: "r-botao--principal", aoClicar: function (f) {
        var pl = A5().planoDeMeditacao(limite, condicao);
        var antes = calc(ctx).atual[c.determinacao ? "pd" : "pe"];
        var m = recuperar(ctx, "pe", pl.total);
        var reg = A5().registrarMeditacao(o, pl, m.depois - antes);
        if (!reg.ok) { if (!o.recursos) o.recursos = {}; o.recursos[c.determinacao ? "pd" : "pe"] = antes; UI.avisoAtencao(reg.motivo); return; }
        f(); salvar(ctx);
        UI.avisoOk("Meditação: " + pl.conta + ". " + m.qual + " " + m.antes + " → " + m.depois + ".");
      } },
    ] });
  }

  function ruido(ctx) {
    var o = ordemDe(ctx);
    var alvo = UI.campo({ rotulo: "Alvo (em alcance curto)", limite: 80 });
    var efeito = UI.campo({ rotulo: "Efeito sobre dados (ex.: frustrado, +1d20 no ataque)", limite: 120 });
    var de = "bonus";
    UI.modal({ titulo: "Ruído de Comunicação", conteudo: bloco([
      linha("Reação e 4 " + sigla(o) + ": o bônus em dados vira penalidade, ou vice-versa, até o fim da cena. Só efeitos sobre DADOS rolados — um bônus numérico fixo não entra."),
      alvo, efeito,
      rotulado("O efeito é", select([{ valor: "bonus", rotulo: "um bônus (vira penalidade)" }, { valor: "penalidade", rotulo: "uma penalidade (vira bônus)" }], de, function (v) { de = v; })),
    ]), botoes: [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Usar (4 " + sigla(o) + ")", classe: "r-botao--principal", aoClicar: function (f) {
        if (!efeito.entrada.value.trim()) { UI.avisoAtencao("Diga qual efeito."); return; }
        var g = gastar(ctx, 4);
        if (!g) return;
        A5().registrarRuido(o, alvo.entrada.value, efeito.entrada.value, de);
        f(); salvar(ctx);
        UI.aviso("Ruído de Comunicação: na ficha de " + (alvo.entrada.value || "alvo") + ", o efeito é invertido pelo botão “Inverter (Ruído)” — com o nome " + nomeDaFicha(ctx) + ".", { duracao: 9000 });
      } },
    ] });
  }

  function desafio(ctx) {
    var o = ordemDe(ctx);
    var aliado = UI.campo({ rotulo: "Aliado que está atacando", limite: 80 });
    var ataque = UI.campo({ rotulo: "Ataque (opcional)", limite: 120 });
    UI.modal({ titulo: "Desafiar o Ego", conteudo: bloco([
      linha("Reação, 1 " + sigla(o) + ", uma vez por rodada. Acertou: +" + R().atributo(o, "pre") + " de dano (a sua Presença). Errou: o " + sigla(o) + " volta."),
      aliado, ataque,
    ]), botoes: [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Desafiar (1 " + sigla(o) + ")", classe: "r-botao--principal", aoClicar: function (f) {
        var nome = aliado.entrada.value.trim();
        if (!nome) { UI.avisoAtencao("Diga qual aliado."); return; }
        if (nome.toLowerCase() === nomeDaFicha(ctx).toLowerCase()) { UI.avisoAtencao("É o ataque de um ALIADO."); return; }
        if (A5().desafioNaRodada(o)) { UI.avisoAtencao("Já usado nesta rodada."); return; }
        if (!gastar(ctx, 1)) return;
        var r = A5().registrarDesafio(o, nome, ataque.entrada.value);
        if (!r.ok) { recuperar(ctx, "pe", 1); UI.avisoAtencao(r.motivo); return; }
        f(); salvar(ctx);
      } },
    ] });
  }

  function armasCorpoACorpo(ctx) {
    return itens(ctx).filter(function (i) {
      if (i.tipo !== "arma") return false;
      var a = dadosDoItem(i).arma || {};
      return a.tipo === "corpoACorpo" && !a.desarmado;
    });
  }
  function acido(ctx) {
    var o = ordemDe(ctx);
    var armas = armasCorpoACorpo(ctx);
    var alvo = "desarmado";
    UI.modal({ titulo: "Ácido Corrosivo", conteudo: bloco([
      linha("1 " + sigla(o) + ". Até o fim da cena: +" + (A5().comAfinidade(o, "acidoCorrosivo") ? "4 no ataque e +10 no dano" : "2 no ataque e +5 no dano") + ", dano químico."),
      rotulado("Afetar", select([{ valor: "desarmado", rotulo: "Ataques desarmados" }].concat(armas.map(function (a) {
        return { valor: a.id, rotulo: a.nome + (dadosDoItem(a).amaldicoado ? " (amaldiçoada)" : " (não amaldiçoada: destruída no fim da cena)") };
      })), alvo, function (v) { alvo = v; })),
    ]), botoes: [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Expelir (1 " + sigla(o) + ")", classe: "r-botao--principal", aoClicar: function (f) {
        var item = alvo === "desarmado" ? null : armas.filter(function (a) { return a.id === alvo; })[0];
        if (A5().acidoValendo(o)) { UI.avisoAtencao("O ácido já está valendo nesta cena."); return; }
        if (!gastar(ctx, 1)) return;
        var r = A5().ativarAcido(o, item ? "arma" : "desarmado", item, item ? !!dadosDoItem(item).amaldicoado : false);
        if (!r.ok) { recuperar(ctx, "pe", 1); UI.avisoAtencao(r.motivo); return; }
        f(); salvar(ctx);
      } },
    ] });
  }

  /* O ataque desarmado, sem item no inventário: um item virtual só para a
     conta (Luta, Força no dano). 1d3 de impacto (OPRPG p. 54); com Artista
     Marcial, 1d6, 1d8 em NEX 35% e 1d10 em NEX 70%. */
  function ataqueDesarmado(ctx) {
    var o = ordemDe(ctx);
    var nex = R().exposicao ? R().exposicao(o) : 0;
    var dado = tem(o, "artistaMarcial") ? (nex >= 70 ? "1d10" : nex >= 35 ? "1d8" : "1d6") : "1d3";
    var virtual = F().criarItem("arma", { nome: "Ataque desarmado (ácido)", dano: dado, critico: 20, multiplicador: 2,
      ordem: { pericia: "luta", arma: { tipo: "corpoACorpo", desarmado: true, atributoDano: "for", tipoDano: "Químico" } } });
    var S = global.RAMASecaoOrdemInventario;
    if (!S || !S.rolarAtaque) { UI.avisoAtencao("O ataque não está disponível nesta página."); return; }
    S.rolarAtaque(ctx, virtual);
    UI.aviso("Dano: role pelo resultado do ataque (" + dado + " + Força + ácido)." + (dado === "1d3" ? " Desarmado, sem Artista Marcial, o dano é não letal (OPRPG)." : ""), { duracao: 7000 });
  }

  function deadMan(ctx) {
    var o = ordemDe(ctx);
    var af = A5().comAfinidade(o, "deadManSwitch");
    var alvos = el("textarea.r-area", { rows: af ? 3 : 1, "aria-label": "Alvos" });
    var treinadas = (C().PERICIAS || []).filter(function (p) { return R().grauDaPericia(o, p.chave) !== "destreinado"; });
    var escolhidas = [];
    var lista = el("div.pilha--curta", { class: "pilha" }, treinadas.map(function (p) {
      return el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) {
        if (ev.target.checked) escolhidas.push(p.chave); else escolhidas = escolhidas.filter(function (k) { return k !== p.chave; });
      } }), el("span", { texto: p.nome + " (" + R().grauDaPericia(o, p.chave) + ")" })]);
    }));
    UI.modal({ titulo: "Dead Man Switch", conteudo: bloco([
      linha("Machucado: " + (af ? "até três alvos e duas perícias" : "um alvo e uma perícia") + " em que você é treinado; alvos em alcance médio. Vai o GRAU de treinamento — atributo e bônus ficam com cada um."),
      rotulado("Alvo(s) (um por linha)", alvos),
      lista,
    ]), botoes: [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Transmitir", classe: "r-botao--principal", aoClicar: function (f) {
        var r = A5().ativarDeadMan(o, nomesDeTexto(alvos.value), escolhidas, function (k) { return R().grauDaPericia(o, k); }, R().machucado(o));
        if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
        f(); salvar(ctx);
        UI.aviso("Cada alvo registra o grau na própria ficha (“Recebido de aliados”, Dead Man Switch): " + r.deadMan.pericias.map(function (k) { return nomePericia(k) + " " + r.deadMan.graus[k]; }).join(", ") + ".", { duracao: 9000 });
      } },
    ] });
  }

  /* --- poderes de Transmissão --- */

  function controlesDeTransmissao(ctx, o, chave) {
    if (!A5().regraLigada(o, "transmissao")) return [linha(A5().MOTIVOS.transmissao + " Os dados ficam guardados.", "t-aviso")];
    var port = A5().portadores(o, chave);
    var funciona = A5().funciona(o, chave);
    var l = [
      linha(port.length ? "Outros seres com este poder: " + port.join(", ") + "." : "Só funciona com outro ser que também tenha este poder — marque quem tem.", port.length ? "" : "t-aviso"),
      botao("Outros portadores…", function () { editarPortadores(ctx, chave); }),
    ];
    if (chave === "conexaoComunicativa") {
      var c = A5().dados(o).transmissao.conexao;
      var noRaio = c && c.cena === A5().cenaDe(o) ? c.presentes : [];
      l.push(linha("No raio de 90 m nesta cena: " + (noRaio.length ? noRaio.join(", ") + " — +" + A5().bonusDaConexao(o) + " contra a comunicação de Alheios." : "ninguém marcado.")));
      l.push(botao("Marcar portadores no raio…", function () { conexao(ctx); }, { desligado: !funciona }));
    }
    if (chave === "sincroniaConectiva") l = l.concat(controlesDaSincronia(ctx, o, funciona));
    if (chave === "transmissaoDePericia") {
      var ep = A5().dados(o).transmissao.pericia;
      var usado = A5().dados(o).transmissao.usos.pericia === A5().cenaDe(o);
      if (ep && ep.cena === A5().cenaDe(o)) l.push(linha("Valendo: " + nomePericia(ep.pericia) + " com os valores de " + ep.de + " (" + ep.dados + "d20, " + U.comSinal(ep.bonus) + ")."));
      l.push(botao(usado ? "Já usado nesta cena" : "Conectar-se a uma perícia (movimento, 2 " + sigla(o) + ")…", function () { emprestarPericia(ctx); }, { desligado: !funciona || usado }));
    }
    if (chave === "transmissaoDePoder") {
      var usadoP = A5().dados(o).transmissao.usos.poder === A5().cenaDe(o);
      l.push(botao(usadoP ? "Já usado nesta cena" : "Conectar-se a um poder (movimento, 3 " + sigla(o) + ")…", function () { emprestarPoder(ctx); }, { desligado: !funciona || usadoP }));
    }
    if (chave === "transmissaoDeRitual") {
      var usadoR = A5().dados(o).transmissao.usos.ritual === A5().cenaDe(o);
      l.push(botao(usadoR ? "Já usado nesta cena" : "Conectar-se a um ritual (movimento, 3 " + sigla(o) + ")…", function () { emprestarRitual(ctx); }, { desligado: !funciona || usadoR }));
    }
    return l;
  }

  function editarPortadores(ctx, chave) {
    var o = ordemDe(ctx);
    var campo = el("textarea.r-area", { rows: 3, "aria-label": "Outros portadores (um por linha)" });
    campo.value = A5().portadores(o, chave).join("\n");
    UI.modal({ titulo: "Outros seres com " + (PO().poder(chave) || {}).nome, conteudo: bloco([
      linha("Personagens ou criaturas que também têm este poder (você não entra). Sem nenhum, o poder não funciona (AS5 p. 62)."), campo,
    ]), botoes: [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Salvar", classe: "r-botao--principal", aoClicar: function (f) {
        A5().definirPortadores(o, chave, nomesDeTexto(campo.value), nomeDaFicha(ctx));
        f(); salvar(ctx);
      } },
    ] });
  }

  function conexao(ctx) {
    var o = ordemDe(ctx);
    var port = A5().portadores(o, "conexaoComunicativa");
    var marcados = {};
    var atual = A5().dados(o).transmissao.conexao;
    (atual && atual.cena === A5().cenaDe(o) ? atual.presentes : []).forEach(function (n) { marcados[n] = true; });
    UI.modal({ titulo: "Conexão Comunicativa — no raio de 90 m", conteudo: bloco([linha("+2 em resistência contra efeitos da comunicação de Alheios para cada um (exceto você).")].concat(port.map(function (n) {
      return el("label.r-marca", {}, [el("input", { type: "checkbox", checked: !!marcados[n], onchange: function (ev) { marcados[n] = ev.target.checked; } }), el("span", { texto: n })]);
    }))), botoes: [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Marcar", classe: "r-botao--principal", aoClicar: function (f) {
        A5().marcarConexao(o, Object.keys(marcados).filter(function (k) { return marcados[k]; }));
        f(); salvar(ctx);
      } },
    ] });
  }

  /* Sincronia Conectiva: entrar (pela própria ficha), a iniciativa, e as
     operações com outra ficha — pelo servidor. */
  function controlesDaSincronia(ctx, o, funciona) {
    var s = A5().sincroniaValendo(o);
    if (!s) return [botao("Entrar na sincronia (reação, 3 " + sigla(o) + ")…", function () { entrarNaSincronia(ctx); }, { desligado: !funciona })];
    var l = [linha("Sincronizado nesta cena com: " + s.participantes.map(function (p) { return p.nome; }).join(", ") + ". Até o fim da cena.")];
    if (s.iniciativa) l.push(linha("Iniciativa: " + s.iniciativa.usada + (s.iniciativa.de ? " (de " + s.iniciativa.de + ")" : " (a sua)") + " — a sua era " + s.iniciativa.propria + ". Trocar não dá turno a mais: quem já agiu na rodada não age de novo."));
    l.push(el("div.faixa", {}, [
      botao("Iniciativa de um sincronizado…", function () { iniciativaDaSincronia(ctx); }),
      botao("Usar " + sigla(o) + " de um sincronizado…", function () { operarSincronia(ctx, "pe"); }, { desligado: !ctx.ficha.campanhaId, dica: ctx.ficha.campanhaId ? "" : "Só numa campanha: a operação passa pelo servidor." }),
      botao("Assumir dano ou perda de um sincronizado…", function () { operarSincronia(ctx, "redirecionar"); }, { desligado: !ctx.ficha.campanhaId, dica: ctx.ficha.campanhaId ? "" : "Só numa campanha: a operação passa pelo servidor." }),
      botao("Sair da sincronia", function () { A5().sairDaSincronia(o); salvar(ctx); }),
    ]));
    l.push(linha("Você sabe os itens que os sincronizados carregam e o que cada um vai fazer antes de fazer — combinem na mesa; a ficha não lê a ficha dos outros."));
    if (s.operacoes.length) l.push(UI.recolhivel({ titulo: "Operações", extra: s.operacoes.length + "", conteudo: el("ul.pilha--curta", { class: "pilha" }, s.operacoes.slice(-10).reverse().map(function (op) {
      return el("li.t-mini", { texto: (op.tipo === "pe" ? (op.papel === "alvo" ? op.outro + " usou " + op.valor + " PE seus" : "Você usou " + op.valor + " PE de " + op.outro)
        : (op.papel === "alvo" ? op.outro + " assumiu " + op.valor + " de " + op.natureza + " por você" : "Você assumiu " + op.valor + " de " + op.natureza + " (" + op.recurso.toUpperCase() + ") de " + op.outro)) });
    })) }));
    return l;
  }

  function entrarNaSincronia(ctx) {
    var o = ordemDe(ctx);
    var escolhidos = {};
    var lista = el("div.pilha--curta", { class: "pilha" }, [linha("Carregando a mesa…")]);
    var digitados = el("textarea.r-area", { rows: 2, "aria-label": "Outros participantes (sem ficha na campanha)" });
    personagensDaCampanha(ctx).then(function (ps) {
      U.trocar(lista, ps.length ? ps.map(function (p) {
        return el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) { if (ev.target.checked) escolhidos[p.id] = p; else delete escolhidos[p.id]; } }), el("span", { texto: p.nome })]);
      }) : [linha(ctx.ficha.campanhaId ? "A mesa não respondeu." : "Sem campanha: só nomes (as operações entre fichas pedem uma campanha).")]);
    });
    UI.modal({ titulo: "Sincronia Conectiva", conteudo: bloco([
      linha("Reação e 3 " + sigla(o) + ", até o fim da cena. Cada participante entra pela própria ficha, marcando os outros: só quem marcou um ao outro pode usar o PE ou assumir o dano do outro."),
      lista, rotulado("Outros participantes sem ficha (um por linha)", digitados),
    ]), botoes: [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Entrar (3 " + sigla(o) + ")", classe: "r-botao--principal", aoClicar: function (f) {
        var parts = Object.keys(escolhidos).map(function (k) { return { personagemId: escolhidos[k].id, nome: escolhidos[k].nome }; })
          .concat(nomesDeTexto(digitados.value).map(function (n) { return { nome: n }; }));
        if (!parts.length) { UI.avisoAtencao("Escolha pelo menos um participante."); return; }
        if (!A5().funciona(o, "sincroniaConectiva")) { UI.avisoAtencao("O poder só funciona com outro ser que também o tenha."); return; }
        if (!gastar(ctx, 3)) return;
        var r = A5().entrarNaSincronia(o, null, parts);
        if (!r.ok) { recuperar(ctx, "pe", 3); UI.avisoAtencao(r.motivo); return; }
        f(); salvar(ctx);
      } },
    ] });
  }

  function iniciativaDaSincronia(ctx) {
    var o = ordemDe(ctx);
    var s = A5().sincroniaValendo(o);
    var propria = UI.campo({ rotulo: "A sua Iniciativa nesta rodada (o resultado do seu teste)", limite: 4 });
    var outro = UI.campo({ rotulo: "A Iniciativa de outro sincronizado que fez o mesmo teste", limite: 4 });
    var de = s.participantes[0] ? s.participantes[0].nome : "";
    UI.modal({ titulo: "Iniciativa na sincronia", conteudo: bloco([
      linha("Fica com o seu valor ou com o de outro sincronizado que fez o mesmo teste. Trocar não concede turno extra: quem já agiu na rodada não age de novo."),
      propria,
      rotulado("De quem", select(s.participantes.map(function (p) { return { valor: p.nome, rotulo: p.nome }; }), de, function (v) { de = v; })),
      outro,
    ]), botoes: [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Usar a minha", aoClicar: function (f) {
        var v = Number(propria.entrada.value);
        if (!isFinite(v)) { UI.avisoAtencao("Informe a sua Iniciativa."); return; }
        A5().escolherIniciativa(o, v, v, ""); f(); salvar(ctx);
      } },
      { rotulo: "Usar a do outro", classe: "r-botao--principal", aoClicar: function (f) {
        var v = Number(propria.entrada.value), w = Number(outro.entrada.value);
        if (!isFinite(v) || !isFinite(w)) { UI.avisoAtencao("Informe as duas Iniciativas."); return; }
        A5().escolherIniciativa(o, v, w, de); f(); salvar(ctx);
        UI.aviso("Iniciativa " + w + " (de " + de + "). No combate da campanha, o mestre reposiciona — sem turno extra.", { duracao: 8000 });
      } },
    ] });
  }

  /* As operações com OUTRA ficha passam pelo servidor, que confere a
     campanha, a sincronia dos dois lados e os recursos — e o id da
     operação: repetir não cobra duas vezes. */
  function operarSincronia(ctx, tipo) {
    var o = ordemDe(ctx);
    var s = A5().sincroniaValendo(o);
    var comFicha = s.participantes.filter(function (p) { return p.personagemId; });
    if (!comFicha.length) { UI.avisoAtencao("Nenhum sincronizado com ficha na campanha."); return; }
    var alvo = comFicha[0].personagemId;
    var valor = UI.campo({ rotulo: tipo === "pe" ? "Quantos PE usar do outro" : "Quanto de dano ou perda assumir", limite: 3 });
    var recurso = "pv";
    var natureza = "dano";
    var op = opId(tipo === "pe" ? "sinpe" : "sinrd");
    var campos = [
      linha(tipo === "pe" ? "O PE sai da ficha do outro sincronizado, para uma habilidade sua." : "Você sofre a perda ou o dano que o outro sofreria, como se fosse o alvo. Não vale para efeitos que afetam SAN (como dano mental)."),
      rotulado("Sincronizado", select(comFicha.map(function (p) { return { valor: p.personagemId, rotulo: p.nome }; }), alvo, function (v) { alvo = v; })),
      valor,
    ];
    if (tipo === "redirecionar") {
      campos.push(rotulado("Natureza", select([{ valor: "dano", rotulo: "Dano (resolva antes as suas resistências, como alvo)" }, { valor: "perda", rotulo: "Perda (sem redução)" }], natureza, function (v) { natureza = v; })));
      campos.push(rotulado("Recurso", select([{ valor: "pv", rotulo: "Pontos de vida" }, { valor: "pe", rotulo: "Pontos de esforço" }], recurso, function (v) { recurso = v; })));
    }
    UI.modal({ titulo: tipo === "pe" ? "Usar PE de um sincronizado" : "Assumir dano ou perda", conteudo: bloco(campos), botoes: [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Confirmar", classe: "r-botao--principal", aoClicar: function (f, b) {
        var n = parseInt(valor.entrada.value, 10);
        if (!(n > 0)) { UI.avisoAtencao("Informe um valor positivo."); return; }
        if (!global.RAMAApi || !global.RAMAApi.sincroniaOperar) { UI.avisoAtencao("O servidor ainda não tem esta operação (atualize o Apps Script)."); return; }
        var nome = (comFicha.filter(function (p) { return p.personagemId === alvo; })[0] || {}).nome || "";
        global.RAMAApi.sincroniaOperar({ campanhaId: ctx.ficha.campanhaId, personagemId: ctx.personagemId, alvoId: alvo, tipo: tipo, valor: n,
          recurso: recurso, natureza: natureza, opId: op }).then(function (r) {
          if (!r || !r.ok) { UI.avisoDeFalha(r, "operação da sincronia"); return; }
          A5().registrarOperacao(o, { opId: op, tipo: tipo, papel: "autor", outro: nome, valor: n, recurso: recurso, natureza: natureza });
          f();
          /* A gravação seguinte concilia com o que o servidor gravou nesta
             ficha (o dano assumido) — sem somar de novo. */
          salvar(ctx);
          UI.avisoOk(tipo === "pe" ? n + " PE de " + nome + " usados." : "Você assumiu " + n + " de " + natureza + " no lugar de " + nome + ".");
        });
      } },
    ] });
  }

  function emprestarPericia(ctx) {
    var o = ordemDe(ctx);
    var de = UI.campo({ rotulo: "Ser (em alcance curto, com este mesmo poder)", limite: 80 });
    var pericias = (C().PERICIAS || []).map(function (p) { return { valor: p.chave, rotulo: p.nome }; });
    var pericia = pericias[0] ? pericias[0].valor : "";
    var dados = UI.campo({ rotulo: "Dados do atributo dele nessa perícia (d20)", limite: 1, valor: "1" });
    var grau = "treinado";
    var bonus = UI.campo({ rotulo: "Bônus PERMANENTE dele na perícia (treino e bônus fixos, sem os temporários)", limite: 3, valor: "5" });
    UI.modal({ titulo: "Transmissão de Perícia", conteudo: bloco([
      linha("Uma vez por cena, movimento e 2 " + sigla(o) + ". Até o fim da cena, os testes dessa perícia usam os valores permanentes do outro ser — sem os bônus temporários dele (um ritual da cena, por exemplo). A sua perícia não muda."),
      de, rotulado("Perícia", select(pericias, pericia, function (v) { pericia = v; })), dados,
      rotulado("Grau dele", select([{ valor: "destreinado", rotulo: "Destreinado" }, { valor: "treinado", rotulo: "Treinado" }, { valor: "veterano", rotulo: "Veterano" }, { valor: "expert", rotulo: "Expert" }], grau, function (v) { grau = v; })),
      bonus,
    ]), botoes: [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Conectar (2 " + sigla(o) + ")", classe: "r-botao--principal", aoClicar: function (f) {
        var quem = de.entrada.value.trim();
        if (!quem) { UI.avisoAtencao("Diga de quem."); return; }
        if (A5().portadores(o, "transmissaoDePericia").map(function (n) { return n.toLowerCase(); }).indexOf(quem.toLowerCase()) < 0) { UI.avisoAtencao(quem + " não está entre os portadores deste poder."); return; }
        if (!gastar(ctx, 2)) return;
        var r = A5().usarEmprestimo(o, "pericia", { de: quem, pericia: pericia, dados: parseInt(dados.entrada.value, 10), grau: grau, bonus: parseInt(bonus.entrada.value, 10) });
        if (!r.ok) { recuperar(ctx, "pe", 2); UI.avisoAtencao(r.motivo); return; }
        f(); salvar(ctx);
      } },
    ] });
  }

  function emprestarPoder(ctx) {
    var o = ordemDe(ctx);
    var de = UI.campo({ rotulo: "Ser (em alcance curto, com este mesmo poder)", limite: 80 });
    var candidatos = PO().TODOS.filter(function (p) {
      return ["classe", "geral", "paranormal", "trilha"].indexOf(p.tipo) >= 0 && A5().PODERES_DE_TRANSMISSAO.indexOf(p.chave) < 0 && !tem(o, p.chave);
    }).sort(function (a, b) { return a.nome.localeCompare(b.nome, "pt-BR"); });
    var escolha = candidatos[0] ? candidatos[0].chave : "";
    var aviso = el("p.t-mini");
    function conferir() {
      var p = PO().poder(escolha);
      var faltam = E() && E().textosDosRequisitos ? [] : [];
      var est = E() ? E().estado(o, null) : null;
      var att = est ? est.atributos : {};
      (p && p.requisitos || []).forEach(function (rq) {
        if (rq.tipo === "atributo" && (att[rq.atributo] || 0) < rq.minimo) faltam.push(rq.atributo.toUpperCase() + " " + rq.minimo);
        if (rq.tipo === "atributoUm" && !rq.atributos.some(function (a) { return (att[a] || 0) >= rq.minimo; })) faltam.push(rq.atributos.join(" ou ").toUpperCase() + " " + rq.minimo);
        if (rq.tipo === "treinado" && R().grauDaPericia(o, rq.pericia) === "destreinado") faltam.push("treinado em " + nomePericia(rq.pericia));
        if (rq.tipo === "poder" && !tem(o, rq.poder)) faltam.push((PO().poder(rq.poder) || {}).nome || rq.poder);
        if (rq.tipo === "nex" && (R().trilho(o).nexEquivalente || 0) < rq.minimo) faltam.push("NEX " + rq.minimo + "%");
      });
      aviso.textContent = p ? (faltam.length ? "Faltam pré-requisitos: " + faltam.join(", ") + "." : p.resumo) : "";
      return faltam;
    }
    var sel = select(candidatos.map(function (p) { return { valor: p.chave, rotulo: p.nome }; }), escolha, function (v) { escolha = v; conferir(); });
    conferir();
    UI.modal({ titulo: "Transmissão de Poder", conteudo: bloco([
      linha("Uma vez por cena, movimento e 3 " + sigla(o) + ". Um poder do outro ser cujos pré-requisitos você atenda: use-o como se o tivesse até o fim da cena (custo, alcance, limite e duração do poder)."),
      de, rotulado("Poder", sel), aviso,
    ]), botoes: [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Conectar (3 " + sigla(o) + ")", classe: "r-botao--principal", aoClicar: function (f) {
        var quem = de.entrada.value.trim();
        if (!quem) { UI.avisoAtencao("Diga de quem."); return; }
        if (A5().portadores(o, "transmissaoDePoder").map(function (n) { return n.toLowerCase(); }).indexOf(quem.toLowerCase()) < 0) { UI.avisoAtencao(quem + " não está entre os portadores deste poder."); return; }
        if (conferir().length) { UI.avisoAtencao("Você não atende aos pré-requisitos deste poder."); return; }
        if (!gastar(ctx, 3)) return;
        var r = A5().usarEmprestimo(o, "poder", { de: quem, chave: escolha });
        if (!r.ok) { recuperar(ctx, "pe", 3); UI.avisoAtencao(r.motivo); return; }
        f(); salvar(ctx);
      } },
    ] });
  }

  function emprestarRitual(ctx) {
    var o = ordemDe(ctx);
    if (!RT() || !RT().carregar) { UI.avisoAtencao("O catálogo de rituais não está disponível nesta página."); return; }
    RT().carregar().then(function (cat) {
      var lista = (cat && cat.rituais) || [];
      var exposicao = R().exposicao ? R().exposicao(o) : 0;
      var maxCirculo = exposicao >= 85 ? 4 : exposicao >= 55 ? 3 : exposicao >= 25 ? 2 : exposicao >= 5 ? 1 : 0;
      var cabem = lista.filter(function (r) { return (r.circulo || 1) <= maxCirculo; }).sort(function (a, b) { return a.nome.localeCompare(b.nome, "pt-BR"); });
      if (!cabem.length) { UI.avisoAtencao("Sem NEX para conjurar rituais."); return; }
      var escolha = cabem[0].id;
      var de = UI.campo({ rotulo: "Ser (em alcance curto, com este mesmo poder)", limite: 80 });
      UI.modal({ titulo: "Transmissão de Ritual", conteudo: bloco([
        linha("Uma vez por cena, movimento e 3 " + sigla(o) + ". Um ritual do outro ser que você possa conjurar (até o " + maxCirculo + "º círculo, pelo seu NEX): use-o até o fim da cena, pagando o custo normal. Não vira ritual aprendido."),
        de, rotulado("Ritual (catálogo)", select(cabem.map(function (r) { return { valor: r.id, rotulo: r.nome + " (" + r.circulo + "º)" }; }), escolha, function (v) { escolha = v; })),
      ]), botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Conectar (3 " + sigla(o) + ")", classe: "r-botao--principal", aoClicar: function (f) {
          var quem = de.entrada.value.trim();
          if (!quem) { UI.avisoAtencao("Diga de quem."); return; }
          if (A5().portadores(o, "transmissaoDeRitual").map(function (n) { return n.toLowerCase(); }).indexOf(quem.toLowerCase()) < 0) { UI.avisoAtencao(quem + " não está entre os portadores deste poder."); return; }
          var mod = cabem.filter(function (r) { return r.id === escolha; })[0];
          var pf = RT().paraFicha ? RT().paraFicha(mod) : null;
          var retrato = pf && pf.ok ? pf.dados : { nome: mod.nome };
          if (!gastar(ctx, 3)) return;
          var r = A5().usarEmprestimo(o, "ritual", { de: quem, ritual: retrato });
          if (!r.ok) { recuperar(ctx, "pe", 3); UI.avisoAtencao(r.motivo); return; }
          f(); salvar(ctx);
        } },
      ] });
    });
  }

  /* =================================================================
     ORIGENS (p. 54)
     ================================================================= */

  function controlesDeOrigem(ctx, org) {
    if (!A5() || !org) return null;
    permitidoGlobal = permitido(ctx);
    var o = ordemDe(ctx);
    var partes = [];
    if (org.chave === "ufologo") {
      var t = A5().teoriaDaMissao(o);
      if (!t) partes.push(botao("Apresentar a teoria desta missão (10 minutos)…", function () { teoria(ctx); }));
      A5().dados(o).teorias.slice(-6).reverse().forEach(function (x) {
        var estado = x.resultado === "correta" ? "correta — +3 PE dados" : x.resultado === "incorreta" ? "incorreta" : "aguardando o mestre";
        partes.push(el("div.faixa", {}, [
          linha("Missão " + x.missao + ": “" + x.texto + "” — " + estado + (x.por ? " (" + x.por + ")" : "") + "."),
          !x.resultado ? botao("Correta: +3 PE (" + quemConfirma(ctx) + ")", function () { resolverTeoria(ctx, x.id, true); }, { desligado: !podeConfirmar(ctx), dica: podeConfirmar(ctx) ? "" : SO_O_MESTRE }) : null,
          !x.resultado ? botao("Incorreta", function () { resolverTeoria(ctx, x.id, false); }, { desligado: !podeConfirmar(ctx), dica: podeConfirmar(ctx) ? "" : SO_O_MESTRE }) : null,
        ]));
      });
      var pe = A5().peDoUfologo(o);
      if (pe) partes.push(linha("Teorias confirmadas: +" + pe + " PE máximos, na conta da ficha."));
    }
    if (org.chave === "funcionarioDeBeiraDeEstrada") {
      var usado = A5().turnoUsadoNaMissao(o);
      partes.push(botao(usado ? "Turno Invertido já usado nesta missão" : "Turno Invertido: benefícios de dormir sem a ação", function () {
        var r = A5().usarTurnoInvertido(o);
        if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
        salvar(ctx);
        UI.aviso("Turno Invertido: aplique os benefícios da ação dormir (OPRPG p. 93) — nenhuma ação de interlúdio foi gasta.", { duracao: 8000 });
      }, { desligado: usado || !A5().emInterludio(o), dica: A5().emInterludio(o) ? "" : "Só durante uma cena de interlúdio." }));
      partes.push(linha("O +2 contra efeitos que tentam deixar inconsciente é oferecido no resultado de um teste de resistência."));
    }
    return partes.length ? el("div.pilha--curta.origem-controles", { class: "pilha" }, partes) : null;
  }

  function teoria(ctx) {
    var campo = el("textarea.r-area", { rows: 3, "aria-label": "A teoria" });
    UI.modal({ titulo: "Minha Teoria Absurda", conteudo: bloco([
      linha("Uma vez por missão, antes de terem todas as respostas: a sua tese sobre as prováveis respostas da investigação. Quem diz, no fim, se ela estava correta é o mestre."),
      campo,
    ]), botoes: [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Registrar", classe: "r-botao--principal", aoClicar: function (f) {
        var r = A5().registrarTeoria(ordemDe(ctx), campo.value);
        if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
        f(); salvar(ctx);
      } },
    ] });
  }
  function resolverTeoria(ctx, id, correta) {
    if (!podeConfirmar(ctx)) { UI.avisoAtencao(SO_O_MESTRE); return; }
    var o = ordemDe(ctx);
    var r = A5().resolverTeoria(o, id, correta, quemConfirma(ctx));
    if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
    /* Os +3 máximos entram pela conta (concedido); os +3 atuais, aqui, na
       mesma gravação — nunca de novo. */
    if (r.concede) recuperar(ctx, "pe", r.concede);
    salvar(ctx);
    UI.aviso(correta ? "Teoria correta: +3 PE máximos e atuais." : "Teoria marcada como incorreta.");
  }

  /* =================================================================
     O TESTE: antes de rolar e no resultado
     ================================================================= */

  function antesDoTeste(ctx, o, p, dado, bonus, atributo) {
    if (!A5() || !o.arquivo5) return null;
    var notas = [];
    /* Transmissão de Perícia: os valores permanentes do outro ser. */
    var ep = A5().periciaEmprestada(o, p.chave);
    if (ep) {
      var dados = R().dadosDoTeste(o, p.chave, { atributo: ep.atributo }, ep.dados);
      var conta = { total: ep.bonus, parcelas: [{ rotulo: "Valores permanentes de " + ep.de + " (" + ep.grau + ")", valor: ep.bonus }] };
      notas.push("Transmissão de Perícia: valores permanentes de " + ep.de + " até o fim da cena — os bônus temporários dele não vêm (AS5 p. 63).");
      return { dado: dados.expressao, bonus: conta, atributo: ep.atributo, notas: notas };
    }
    /* Treinado nas Telas armado: Intelecto no lugar da Agilidade. */
    if ((p.chave === "iniciativa" || p.chave === "reflexos") && atributo === "agi" && A5().telasArmado(o)) {
      var g = gastar(ctx, 2);
      A5().armarTelas(o, false);
      if (!g) { ctx.alterou(); notas.push("Treinado nas Telas: sem PE para trocar — o teste usou a Agilidade."); return { dado: dado, bonus: bonus, atributo: atributo, notas: notas }; }
      ctx.alterou();
      var comInt = R().dadoDePericia(o, p.chave, { atributo: "int" });
      notas.push("Treinado nas Telas: Intelecto no lugar da Agilidade (2 " + g.qual + "; " + g.antes + " → " + g.depois + "). Os demais modificadores são os mesmos (AS5 p. 55).");
      return { dado: comInt, bonus: bonus, atributo: "int", notas: notas };
    }
    return null;
  }

  var RESISTENCIAS = ["fortitude", "reflexos", "vontade"];

  function acoesNoTeste(ctx, o, p, r, dado, bonus, atributo) {
    if (!A5() || !permitido(ctx)) return [];
    var saida = [];
    var unico = function (rotulo, f) {
      var usado = false;
      saida.push({ rotulo: rotulo, aoClicar: function (cartao, b) { if (usado) return; if (f() !== false) { usado = true; if (b) b.disabled = true; } } });
    };
    var mostrarT = function (novo, nome, notas) { global.RAMARolagens.mostrar(novo, { nome: p.nome + " · " + nome, notas: notas }); };
    var somarAoTeste = function (valor, rot) {
      return Object.assign({}, r, { total: r.total + valor, parcelas: (r.parcelas || []).concat([{ rotulo: rot, valor: valor }]) });
    };
    var oferta = function (rotulo, valor, nome, nota) {
      unico(rotulo, function () { mostrarT(somarAoTeste(valor, nome), nome, [nota]); });
    };

    if (o.origem === "funcionarioDeBeiraDeEstrada" && RESISTENCIAS.indexOf(p.chave) >= 0) {
      oferta("+2 contra efeito que tenta deixar inconsciente", 2, "Funcionário de Beira de Estrada", "Só contra efeitos que tentam deixar inconsciente (AS5 p. 54).");
    }
    if (p.chave === "vontade" && A5().recebidosValendo(o).some(function (x) { return x.tipo === "aura"; })) {
      var de = A5().recebidosValendo(o).filter(function (x) { return x.tipo === "aura"; })[0].de;
      oferta("Aura de Confiança: +5 contra presença perturbadora", 5, "Aura de Confiança (" + de + ")", "Só contra presença perturbadora; vem de " + de + " (AS5 p. 55).");
    }
    if (RESISTENCIAS.indexOf(p.chave) >= 0 && A5().bonusDaConexao(o)) {
      var b = A5().bonusDaConexao(o);
      oferta("Conexão Comunicativa: +" + b + " contra a comunicação de Alheios", b, "Conexão Comunicativa", "+2 por portador no raio de 90 m (exceto você), só contra efeitos negativos da comunicação de Alheios (AS5 p. 62).");
    }
    if (RESISTENCIAS.indexOf(p.chave) >= 0 && A5().faixasVestidas(ctx.ficha.inventario)) {
      oferta("Faixas da Vidência: origem em alcance curto (+5)", 5, "Faixas da Vidência (perto)", "Contra ataque ou habilidade com origem em alcance curto (AS5 p. 60).");
      oferta("Faixas da Vidência: origem além de 9 m (−5)", -5, "Faixas da Vidência (longe)", "Contra ataque ou habilidade com origem além de 9 m (AS5 p. 60).");
    }
    if (p.chave === "investigacao" && tem(o, "adeptoDoEscuro")) oferta("Adepto do Escuro: +2 em penumbra", 2, "Adepto do Escuro", "Só em ambiente de penumbra (AS5 p. 55).");
    if (p.chave === "tecnologia" && tem(o, "saudosistaHiTech")) oferta("Saudosista Hi-Tech: +5 (aparelho anterior a 2000)", 5, "Saudosista Hi-Tech", "Só para aparelhos eletrônicos anteriores aos anos 2000 (AS5 p. 55).");
    if (p.chave === "ocultismo" && tem(o, "catalogoDeCriaturasAmbulante")) oferta("Catálogo de Criaturas: +5 para identificar criatura", 5, "Catálogo de Criaturas Ambulante", "Para identificar criatura paranormal — vista ou por vestígio (AS5 p. 56).");
    if (p.chave === "ocultismo" && tem(o, "caligrafiaEficiente")) oferta("Caligrafia Eficiente: +5 para identificar ritual", 5, "Caligrafia Eficiente", "Para identificar rituais (AS5 p. 58).");
    var ling = (tem(o, "paralinguisticaAmpliada") ? (A5().comAfinidade(o, "paralinguisticaAmpliada") ? 10 : 5) : 0);
    if (ling) oferta("Paralinguística: +" + ling + " para compreender linguagem do Outro Lado", ling, "Paralinguística Ampliada", "Para compreender “linguagens” do Outro Lado (AS5 p. 57).");
    if (tem(o, "decifrarADistancia")) oferta("Decifrar à Distância: +5 para compreender Sigilos ou Sinais", 5, "Decifrar à Distância", "Para compreender “linguagens” do Outro Lado (AS5 p. 58).");
    if (tem(o, "apaixonadoPorVeiculos")) {
      unico("Apaixonado por Veículos: +1 dado (segurança do veículo)", function () {
        var novo = comMaisDados(r, "Apaixonado por Veículos");
        if (!novo) { UI.avisoAtencao("O teste tinha penalidade de dados: role de novo com um dado a mais."); return false; }
        mostrarT(novo, "+1 dado", [novo.notaExtra, "Só em teste para garantir a segurança do veículo, a critério do mestre (AS5 p. 56)."]);
      });
    }
    return saida;
  }

  function comMaisDados(r, rotulo) {
    var sel = r.selecao || "maior";
    if (sel !== "maior" && (r.rolagens || []).length > 1) return null;
    var novo = rolar("1d20");
    var todos = (r.rolagens || []).concat([novo]);
    var natural = Math.max.apply(null, todos);
    return Object.assign({}, r, { rolagens: todos, natural: natural, total: r.total - (r.natural || 0) + natural,
      parcelas: [{ rotulo: "Dado (" + todos.join(", ") + ")", valor: natural }].concat((r.parcelas || []).slice(1)),
      notaExtra: rotulo + ": +1d20 (" + novo + ")." });
  }

  /* =================================================================
     EFEITOS: Ruído de Comunicação
     ================================================================= */

  function etiquetaDoEfeito(ctx, o, inst) {
    if (!A5() || !inst.invertido || !A5().inversaoValendo(inst, A5().cenaDe(o))) return null;
    return el("span.r-etiqueta", { texto: "invertido", title: "Ruído de Comunicação de " + inst.invertido.por + ": bônus e penalidades em dados trocados até o fim da cena (AS5 p. 56)." });
  }
  function botaoDoEfeito(ctx, o, inst) {
    if (!A5() || !permitido(ctx) || !A5().efeitoInvertivel(inst)) return null;
    if (A5().inversaoValendo(inst, A5().cenaDe(o))) {
      return el("button.r-botao.r-botao--mini", { type: "button", texto: "Desfazer inversão", onclick: function () { A5().desfazerInversao(o, inst.id); salvar(ctx); } });
    }
    return el("button.r-botao.r-botao--mini", { type: "button", texto: "Inverter (Ruído)…", title: "Ruído de Comunicação (AS5 p. 56): bônus em dados vira penalidade e vice-versa, até o fim da cena.", onclick: function () {
      var meu = tem(o, "ruidoDeComunicacao");
      var quem = UI.campo({ rotulo: "Quem usou Ruído de Comunicação", limite: 80, valor: meu ? nomeDaFicha(ctx) : "" });
      var euMesmo = false;
      UI.modal({ titulo: "Inverter " + inst.nome, conteudo: bloco([
        linha("Só os modificadores de DADOS mudam de sinal; bônus numéricos fixos ficam. Vale até o fim desta cena, e não se aplica duas vezes."),
        quem,
        meu ? el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) { euMesmo = ev.target.checked; } }), el("span", { texto: "Fui eu, nesta ficha: cobrar a reação e os 4 " + sigla(o) })]) : null,
      ]), botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Inverter", classe: "r-botao--principal", aoClicar: function (f) {
          var nome = quem.entrada.value.trim();
          if (!nome) { UI.avisoAtencao("Diga quem usou."); return; }
          if (euMesmo && !gastar(ctx, 4)) return;
          var r = A5().inverterEfeito(o, inst.id, nome);
          if (!r.ok) { if (euMesmo) recuperar(ctx, "pe", 4); UI.avisoAtencao(r.motivo); return; }
          if (euMesmo) A5().registrarRuido(o, nomeDaFicha(ctx), inst.nome, "bonus");
          f(); salvar(ctx);
        } },
      ] });
    } });
  }

  /* =================================================================
     CENA, RITUAL E ITENS
     ================================================================= */

  function aoTrocarDeCena(ctx, cenaQueAcabou) {
    if (!A5()) return [];
    var o = ordemDe(ctx);
    if (!o.arquivo5) return [];
    var r = A5().aoTrocarDeCena(o, cenaQueAcabou);
    var avisos = [];
    if (r.destruir) avisos.push("Ácido Corrosivo: " + r.destruir.itemNome + " (não amaldiçoada) foi corroída no fim da cena — confirme a destruição no painel do Arquivos Secretos 5.");
    /* A sincronia, os empréstimos e o que foi recebido para a cena acabam
       com ela (o que dura a missão fica). */
    if (o.arquivo5.transmissao.sincronia && o.arquivo5.transmissao.sincronia.cena === (cenaQueAcabou || "inicial")) o.arquivo5.transmissao.sincronia = null;
    return avisos;
  }

  function ajusteDoRitual(ctx, elemento, ritual) {
    if (!A5() || !ritual) return { menosPe: 0, notas: [] };
    var n = A5().reducaoDaParalinguistica(ordemDe(ctx), ritual);
    return n ? { menosPe: n, notas: ["Paralinguística Ampliada: você já conhecia Compreensão Paranormal — custa 1 PE a menos (AS5 p. 57)."] } : { menosPe: 0, notas: [] };
  }

  function doCatalogo(item, chave) { return !!(item && A5() && item.origemCatalogoId === A5().IDS[chave]); }

  function opcoesDoItem(ctx, item) {
    if (!A5() || !permitido(ctx)) return [];
    var o = ordemDe(ctx);
    var d = dadosDoItem(item);
    var l = [];
    var alternar = function (campo) {
      if (!item.ordem) item.ordem = {};
      if (d[campo]) delete item.ordem[campo]; else item.ordem[campo] = true;
      salvar(ctx);
    };
    if (d.selo) l.push({ rotulo: "Usar selo (" + d.selo.ritual + ")…", aoClicar: function () { usarSelo(ctx, item); } });
    if (doCatalogo(item, "camera")) l.push({ rotulo: d.empunhada ? "Guardar a câmera" : "Empunhar a câmera (+2 Investigação e Percepção)", aoClicar: function () { alternar("empunhada"); } });
    if (doCatalogo(item, "faixas") || doCatalogo(item, "joias") || doCatalogo(item, "tenis")) {
      l.push({ rotulo: d.vestida ? "Tirar " + item.nome : "Vestir " + item.nome, aoClicar: function () { alternar("vestida"); } });
    }
    if (doCatalogo(item, "joias")) {
      var pecas = d.pecas || { piercing: false, brinco: false };
      ["piercing", "brinco"].forEach(function (k) {
        l.push({ rotulo: (pecas[k] ? "Perdi o " : "Tenho o ") + k + " (as duas peças contam juntas)", aoClicar: function () {
          if (!item.ordem) item.ordem = {};
          item.ordem.pecas = { piercing: pecas.piercing, brinco: pecas.brinco };
          item.ordem.pecas[k] = !pecas[k];
          salvar(ctx);
        } });
      });
    }
    if (doCatalogo(item, "larva")) l.push({ rotulo: "Ingerir (ação de movimento)", aoClicar: function () { ingerirLarva(ctx, item); } });
    if (doCatalogo(item, "tenis") && d.vestida) l.push({ rotulo: "Movimento sobrenatural (2 " + sigla(o) + ")", aoClicar: function () { tenis(ctx); } });
    if (doCatalogo(item, "skate")) {
      [["transporte", "Nos pés (+3 m, treinado em Acrobacia, Atletismo ou Pilotagem)"], ["escudo", "Como escudo (+5 na Defesa)"], ["arma", "Como arma improvisada"], ["", "Guardado"]].forEach(function (m) {
        if ((d.modoSkate || "") === m[0]) return;
        l.push({ rotulo: "Skate: " + m[1], aoClicar: function () {
          if (!item.ordem) item.ordem = {};
          if (m[0]) item.ordem.modoSkate = m[0]; else delete item.ordem.modoSkate;
          /* Só um modo por vez: o escudo em uso é a regra do escudo. */
          if (m[0] === "escudo") item.ordem.emUso = true; else delete item.ordem.emUso;
          salvar(ctx);
        } });
      });
      if (d.modoSkate === "arma") l.push({ rotulo: "Atacar com o skate (1d12 de impacto, x2)", aoClicar: function () { atacarComSkate(ctx, item); } });
    }
    return l;
  }

  function observacoesDoItem(ctx, item) {
    if (!A5()) return [];
    var d = dadosDoItem(item);
    var l = [];
    if (d.selo) {
      l.push(["Selo", d.selo.ritual + " (" + d.selo.circulo + "º círculo, " + d.selo.custo + " PE) · feito por " + (d.selo.autor.nome || "—") +
        (d.selo.autoria.caligrafia ? " · Caligrafia Eficiente" : "") + (d.selo.autoria.supremo ? " · Selo Supremo" : "")]);
    }
    if (doCatalogo(item, "joias")) {
      var p = d.pecas || {};
      l.push(["Peças", (p.piercing ? "piercing" : "sem o piercing") + " e " + (p.brinco ? "brinco" : "sem o brinco") + (p.piercing && p.brinco ? (d.vestida ? " — valendo" : " — não vestidas") : " — não funciona sem as duas")]);
    }
    if (doCatalogo(item, "skate")) l.push(["Modo", d.modoSkate === "transporte" ? "nos pés" : d.modoSkate === "escudo" ? "escudo (+5 na Defesa)" : d.modoSkate === "arma" ? "arma improvisada" : "guardado"]);
    if ((doCatalogo(item, "faixas") || doCatalogo(item, "tenis") || doCatalogo(item, "camera")) && !(d.vestida || d.empunhada)) l.push(["Em uso", "não — na mochila, o item não dá benefício"]);
    return l;
  }

  function ingerirLarva(ctx, item) {
    var o = ordemDe(ctx);
    if (!EF()) return;
    UI.confirmar({ titulo: "Ingerir a Larva da Fúria?", texto: "Ação de movimento. O item é consumido e você fica em fúria até o fim da cena: +4 no ataque e no dano corpo a corpo, sem ações que exijam calma e concentração.", rotuloConfirmar: "Ingerir" }).then(function (sim) {
      if (!sim) return;
      var inst = EF().criarInstancia({
        nome: "Larva da Fúria", origem: { tipo: "item", nome: "Larva da Fúria" }, alvoNome: ctx.ficha.nome,
        descricao: "Fúria até o fim da cena (AS5 p. 61). Termina se, ao fim da rodada, você não tiver atacado nem sido alvo de um efeito hostil.",
        modificadores: [{ alvo: "ataques:corpo", tipo: "bonus", valor: 4 }, { alvo: "dano:corpo", tipo: "bonus", valor: 4 }],
        restricoes: ["Não pode fazer ações que exijam calma e concentração (Furtividade, conjurar rituais…)."],
        duracao: { tipo: "cena" }, cena: A5().cenaDe(o),
      });
      if (!o.condicoes.efeitos) o.condicoes.efeitos = [];
      var ap = EF().aplicar(o.condicoes, inst, "renovar");
      if (!ap.ok) { UI.avisoAtencao(ap.motivo); return; }
      var q = (item.ordem && item.ordem.quantidade) || 1;
      if (q > 1) item.ordem.quantidade = q - 1; else ctx.ficha.inventario.itens = itens(ctx).filter(function (i) { return i.id !== item.id; });
      A5().registrarLarva(o, ap.instancia.id);
      salvar(ctx);
    });
  }

  function tenis(ctx) {
    var o = ordemDe(ctx);
    if (!gastar(ctx, 2)) return;
    if (EF()) {
      var inst = EF().criarInstancia({ nome: "Tênis Lépidos: movimento sobrenatural", origem: { tipo: "item", nome: "Tênis Lépidos" }, alvoNome: ctx.ficha.nome,
        descricao: "Até o fim do turno: ignora terreno difícil, deslocamento de escalada igual ao terrestre e imune a dano por queda de até 9 m (AS5 p. 61).",
        modificadores: [], duracao: { tipo: "turnos", turnos: 1, momento: "fim" }, cena: A5().cenaDe(o) });
      EF().aplicar(o.condicoes, inst, "renovar");
    }
    salvar(ctx);
    UI.aviso("Movimento sobrenatural até o fim do turno.");
  }

  function atacarComSkate(ctx, item) {
    var o = ordemDe(ctx);
    var dado = R().dadoDePericia(o, "luta", { ataque: "corpo" });
    var bonus = R().bonusDePericia(o, "luta", ctx.ficha.inventario, { ataque: "corpo" });
    var r = D().dependente({ expressao: dado, sigla: "", nome: "Skate Caótico", bonus: bonus.total, modificadores: [] });
    if (!r || !r.ok) return;
    var forca = R().atributo(o, "for");
    mostrar(Object.assign(r, { tipo: "ataque" }), "Ataque · Skate Caótico (arma improvisada)", [
      "Arma improvisada (OPRPG p. 57), corpo a corpo, duas mãos. A regra de arma improvisada do livro básico continua valendo, a critério da mesa.",
    ], [{ rotulo: "Dano: 1d12 + " + forca + " de impacto (x2 no crítico)", aoClicar: function () {
      mostrar(rolagemDe("Dano · Skate Caótico", "1d12+" + forca), "Dano · Skate Caótico", ["Impacto. No crítico, multiplique os dados por 2."]);
    } }]);
  }

  global.RAMAFichaArquivo5 = {
    painel: painel,
    controles: controles,
    controlesDeOrigem: controlesDeOrigem,
    antesDoTeste: antesDoTeste,
    acoesNoTeste: acoesNoTeste,
    etiquetaDoEfeito: etiquetaDoEfeito,
    botaoDoEfeito: botaoDoEfeito,
    aoTrocarDeCena: aoTrocarDeCena,
    ajusteDoRitual: ajusteDoRitual,
    linhasDoSelo: linhasDoSelo,
    consumirSelo: consumirSelo,
    seloDisponivel: seloDisponivel,
    opcoesDoItem: opcoesDoItem,
    observacoesDoItem: observacoesDoItem,
    usarSelo: usarSelo,
    /* A rodada da ficha também serve ao AS6 (Escudo, Médico da Salvação):
       o painel do AS6 só a mostra quando este não mostra. */
    precisaDeRodada: precisaDeRodada,
  };
})(window);
