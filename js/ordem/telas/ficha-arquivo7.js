/* =====================================================================
   R.A.M.A. — Ficha de Ordem · Arquivos Secretos 7
   =====================================================================
   A tela do que o AS7 põe numa ficha. A regra mora em
   js/ordem/arquivo7.js; aqui, só desenho, clique e gravação. Cada coisa
   aparece no contexto em que se usa (a reorganização da v6.4):

     controles(ctx, aq)          no cartão de cada poder das variantes de
                                 Monstruoso (aba Habilidades): o
                                 procedimento do dia, o sacrifício, os
                                 braços, os rituais marcados na pele e os
                                 de 4º círculo
     controlesDeOrigem(ctx,org)  Exorcizado (o contato da cena)
     acoesNoTeste                Terço Maculado (+2d10), Vasos do Olfato,
                                 o braço de Energia e o tamanho em manobras
     modificadoresDoTeste,       os dados que entram na rolagem (+1d6 de
     depoisDoTeste               Ser Testado, +1d8 do braço, +1d4 do Pé de
                                 Coelho) e o acidente do d4 ímpar
     danoExtraDoAtaque           +1d6/1d8 de Sangue (Ser Testado)
     condicoes, botoesDeCondicoes debaixo d'água (com a Pressão) e a
                                 infecção da Apóstata, em Condições
     alertasDoResumo             o procedimento de hoje, o teste da
                                 infecção e "submerso", no bloco de cima
     aoTrocarDeCena              os corpos do Vampirismo e os PV
                                 temporários de Ser Testado (Morte)
     painelDeRituais             na aba Rituais: o Vampirismo (refeições)
                                 e os rituais que a trilha deixa usar hoje
     ajusteDoRitual,             "Usar ritual": –1 PE (Tatuagem, Cajado,
     opcoesNoRitual,             Cicatrização), o corpo do Vampirismo e
     aplicarNoRitual             as ações de Ser Rasgado
     dtExtraDoRitual,            a DT e o dado de dano a mais
     expressaoDoDano
     opcoesDoItem,               Carranca, Cajado, Pé de Coelho, Sal e
     observacoesDoItem           Terço
     painelDeProgressao          exposição em dobro (NEX & Experiência)

   Nada é rolado sem clique, nenhum dano é aplicado a outra ficha daqui
   e nada narrativo é resolvido pela ficha: a mesa confirma.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var el = U.el;

  function A7() { return global.RAMAOrdemArquivo7 || null; }
  function A3() { return global.RAMAOrdemArquivo3 || null; }
  function R() { return global.RAMAOrdemRegras; }
  function C() { return global.RAMAOrdemCatalogo; }
  function D() { return global.RAMADados; }
  function CD() { return global.RAMAOrdemCondicoes || null; }
  function EF() { return global.RAMAOrdemEfeitos || null; }
  function I() { return global.RAMAOrdemInventario || null; }
  function RT() { return global.RAMAOrdemRituais || null; }
  function OP() { return global.RAMAOrdemOpcionais || null; }

  function ordemDe(ctx) { return ctx.ficha.ordem; }
  function calc(ctx) { return R().calcular(ordemDe(ctx), ctx.ficha.inventario); }
  function salvar(ctx) { ctx.alterou(); ctx.redesenhar(); }
  function permitido(ctx) { return !ctx.podeEditar || ctx.podeEditar(); }
  function sigla(o) { return R().usaDeterminacao(o) ? "PD" : "PE"; }
  function novoOp(prefixo) { return prefixo + "-" + String(U.uuid()).replace(/[^A-Za-z0-9]/g, "").slice(0, 20); }
  function dadosDoItem(item) { return I() ? I().dadosDoItem(item) : ((item && item.ordem) || {}); }
  function rituaisDaFicha(ctx) { return (ctx.ficha.rituais && ctx.ficha.rituais.itens) || []; }
  function liberado() { var Cat = C(); return !Cat || !Cat.fonteLiberada || Cat.fonteLiberada("AS7"); }

  var permitidoGlobal = true;
  function botao(texto, aoClicar, op) {
    var x = op || {};
    return el("button.r-botao.r-botao--mini", {
      type: "button", texto: texto, disabled: !!x.desligado || !permitidoGlobal, title: x.dica || "",
      class: x.classe || "", dataset: x.foco ? { foco: x.foco } : {}, onclick: aoClicar,
    });
  }
  function linha(texto, classe) { return el("p.t-mini" + (classe ? "." + classe : ""), { texto: texto }); }
  function titulo(texto) { return el("h4.t-secao", { texto: texto }); }
  function bloco(partes) { return el("div.pilha--curta", { class: "pilha" }, partes.filter(Boolean)); }
  function selecao(opcoes, valor, aoMudar, rotulo) {
    return el("label.ordenacao", {}, [
      el("span.ordenacao__rotulo", { texto: rotulo }),
      el("select.r-selecao", { onchange: function (ev) { aoMudar(ev.target.value); } },
        opcoes.map(function (op) { return el("option", { value: op.valor, texto: op.rotulo, selected: String(op.valor) === String(valor) }); })),
    ]);
  }
  function campoTexto(rotulo, valor, limite) {
    var entrada = el("input.r-entrada", { type: "text", maxlength: limite || 120, value: valor || "" });
    return { no: el("label.r-campo", {}, [el("span.t-mini", { texto: rotulo }), entrada]), valor: function () { return entrada.value.trim(); } };
  }
  function rolarSoma(expr) {
    var r = D().dano({ nome: "", dano: expr, danoExtra: "", critico: false });
    return r && r.ok ? r : null;
  }
  function mostrar(r, nome, notas, acoes) { global.RAMARolagens.mostrar(r, { nome: nome, notas: notas || [], acoes: acoes || [] }); }

  /* Recursos: pelo mesmo caminho das ações de recurso. */
  function maximoDe(c, qual) { return qual === "pv" ? c.pv.total : qual === "pe" ? c.pe.total : qual === "san" ? c.san.total : (c.pd ? c.pd.total : 0); }
  function gastar(ctx, quanto) {
    var o = ordemDe(ctx);
    var c = calc(ctx);
    var qual = c.determinacao ? "pd" : "pe";
    var r = CD() ? CD().aplicarAcao(qual, "gastar", { cond: o.condicoes, atual: c.atual[qual], maximo: maximoDe(c, qual), valor: quanto, pd: c.determinacao }) : null;
    if (!r || !r.ok) { UI.avisoAtencao((r && r.motivo) || "Sem " + qual.toUpperCase() + " suficientes."); return null; }
    if (!o.recursos) o.recursos = { pv: null, pe: null, san: null, pd: null };
    var antes = c.atual[qual];
    o.recursos[qual] = r.valor;
    return { qual: qual.toUpperCase(), antes: antes, depois: r.valor };
  }
  function danoEmMim(ctx, valor) {
    var o = ordemDe(ctx);
    var c = calc(ctx);
    var r = CD().aplicarAcao("pv", "dano", { cond: o.condicoes, atual: c.atual.pv, maximo: c.pv.total, valor: Math.max(1, valor) });
    if (!r.ok) return null;
    if (!o.recursos) o.recursos = { pv: null, pe: null, san: null, pd: null };
    var antes = c.atual.pv;
    o.recursos.pv = r.valor;
    if (r.mensagens.length) UI.avisoAtencao(r.mensagens.join(" "), { duracao: 9000 });
    return { antes: antes, depois: r.valor };
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
  /* Perda de Sanidade: com Jogando sem Sanidade, a ficha não tem SAN — o
     aviso diz, e nada é tirado de outro lugar (o mesmo contrato do AS4). */
  function perderSan(ctx, n) {
    var o = ordemDe(ctx);
    if (R().usaDeterminacao(o)) { UI.aviso("Jogando sem Sanidade: a perda de " + n + " SAN não se aplica (SAH p. 104)."); return null; }
    var c = calc(ctx);
    var r = CD().aplicarAcao("san", "danoMental", { cond: o.condicoes, atual: c.atual.san, maximo: c.san.total, valor: n });
    if (!r.ok) return null;
    if (!o.recursos) o.recursos = { pv: null, pe: null, san: null, pd: null };
    var antes = c.atual.san;
    o.recursos.san = r.valor;
    if (r.mensagens.length) UI.avisoAtencao(r.mensagens.join(" "), { duracao: 9000 });
    return { antes: antes, depois: r.valor };
  }
  function temporarioDaCena(o, chave, valor, fonte) {
    if (!Array.isArray(o.temporariosDeCena)) o.temporariosDeCena = [];
    var cena = A7().cenaDe(o);
    var antigo = o.temporariosDeCena.filter(function (x) { return x.chave === chave && x.recurso === "pv"; })[0];
    var antes = antigo && antigo.cena === cena ? antigo.valor : 0;
    o.temporariosDeCena = o.temporariosDeCena.filter(function (x) { return !(x.chave === chave && x.recurso === "pv"); });
    var novo = Math.max(antes, valor);
    o.temporariosDeCena.push({ chave: chave, recurso: "pv", valor: novo, cena: cena, fonte: fonte });
    if (o.recursos && o.recursos.pv !== null && o.recursos.pv !== undefined) o.recursos.pv += Math.max(0, novo - antes);
    return novo;
  }
  function agente(ctx) {
    var ag = global.RAMAAuth && global.RAMAAuth.agente ? global.RAMAAuth.agente() : null;
    return { id: ag ? ag.id : "", nome: ag ? (ag.nome || ag.usuario || "") : "", papel: ctx.ehDono && !ctx.ehDono() ? "mestre" : "jogador" };
  }
  /* Um efeito aplicado nesta ficha (Condições), com a cena atual. */
  function efeitoEmMim(ctx, dados) {
    var o = ordemDe(ctx);
    if (!EF()) return null;
    var inst = EF().criarInstancia(Object.assign({ alvoNome: ctx.ficha.nome, cena: A7().cenaDe(o), aplicadoPor: agente(ctx), duracao: { tipo: "cena" } }, dados));
    var r = EF().aplicar(o.condicoes, inst, "nova");
    return r && r.ok ? r.instancia : null;
  }
  function encerrarEfeito(o, id) {
    if (!id || !EF() || !o.condicoes) return;
    var inst = (o.condicoes.efeitos || []).filter(function (x) { return x.id === id; })[0];
    if (inst && EF().ativa(inst)) EF().encerrar(o.condicoes, id, "manual", "");
  }

  /* Abre "Usar ritual" com um ritual do catálogo que a ficha NÃO aprendeu
     (concessão do dia, da cena). Não entra na lista de rituais. */
  function conjurarDoCatalogo(ctx, idCatalogo, fonte) {
    if (!global.RAMASecaoConsumo || !global.RAMASecaoConsumo.usarRitual || !RT()) { UI.avisoAtencao("“Usar ritual” não está disponível nesta página."); return; }
    RT().carregar().then(function (cat) {
      var e = cat.porId[idCatalogo];
      if (!e) { UI.avisoAtencao("O ritual não está no catálogo."); return; }
      var r = RT().paraFicha ? RT().paraFicha(e) : JSON.parse(JSON.stringify(e));
      r.id = "as7-" + String(idCatalogo).replace(/[^A-Za-z0-9]/g, "");
      r.origemCatalogoId = idCatalogo;
      global.RAMASecaoConsumo.usarRitual(ctx, r);
      if (fonte) UI.aviso(e.nome + ": conjurável por " + fonte + " — não é ritual aprendido.");
    }).catch(function () { UI.avisoErro("Não foi possível carregar o catálogo de rituais."); });
  }
  function nomeDoRitualDoCatalogo(id, aoTer) {
    if (!RT()) return;
    RT().carregar().then(function (cat) { var e = cat.porId[id]; if (e) aoTer(e.nome, e); }).catch(function () {});
  }

  /* =================================================================
     O PROCEDIMENTO DO DIA (Ser Experimentado / Ser Escarificado)
     ================================================================= */

  function nomeDoProcedimento(v) { return v.especialista ? "experimento" : "escarificação"; }

  function textoDosEfeitosDoDia(o, v, reg) {
    var at = A7().ATRIBUTO_DO_ELEMENTO[v.elemento];
    var nomeAt = A7().NOME_DO_ATRIBUTO[at];
    var l = [];
    if (v.especialista) {
      var ap = v.marco >= 99;
      var base = {
        sangue: (ap ? "Enorme (+5 em manobras, –5 em Furtividade)" : "Grande (+2 em manobras, –2 em Furtividade)"),
        morte: (ap ? "4d6 PV temporários e duas ações padrão adicionais por cena" : "2d6 PV temporários e uma ação padrão adicional por cena"),
        conhecimento: (ap ? "expert nas três perícias escolhidas" : "considerado treinado nas duas perícias escolhidas"),
        energia: (ap ? "três itens sacados como ação livre por rodada e +12 m de deslocamento" : "um item sacado como ação livre por rodada e +6 m de deslocamento"),
      }[v.elemento];
      l.push((ap ? "Ser Apavorante (substitui Ser Experimentado): " : "Ser Experimentado: ") + base + "; soma " + nomeAt + " nos testes baseados nele; PE por " + nomeAt + " em vez de Presença" + (ap ? "; +1 em " + nomeAt + "." : "."));
      if (v.marco >= 40) {
        var n = reg ? reg.sacrificio.pontos : 0;
        var testado = {
          conhecimento: "+" + (1 + n) + "d6 em testes baseados em Intelecto",
          energia: "+" + (1 + n) + "d6 em ataques e +" + (2 + 2 * n) + " na Defesa",
          sangue: "ataques causam +" + (1 + n) + (v.marco >= 65 ? "d8" : "d6") + " de Sangue e RD " + (2 + 2 * n),
          morte: "+" + (1 + n) + " turno(s) morrendo e " + (2 * (1 + n)) + "d8 PV temporários no início de cada cena",
        }[v.elemento];
        l.push("Ser Testado: " + testado + (n ? " (com " + n + " ponto(s) de " + A7().NOME_DO_ATRIBUTO[A7().SACRIFICIO[v.elemento].atributo] + " sacrificados — não mudam PV, PE, SAN nem perícias treinadas)" : "") + ".");
      }
      if (v.marco >= 65) {
        var braco = {
          sangue: "+1 em Força, +1d8 em ataques corpo a corpo e, uma vez por rodada, 1 PE para um ataque desarmado com o braço",
          morte: "+1 em Vigor; tocar um item pela primeira vez: 3 PE para envelhecê-lo (50 de dano de Morte) ou ver o passado dele",
          conhecimento: "+1 em Intelecto; ação completa e 3 PE para tocar uma cabeça (a sua: Detecção de Ameaças discente; outra: Mergulho Mental por 3 rodadas)",
          energia: "+1 em Agilidade; movimento e 2 PE para manipular a corporeidade até o fim da cena (+5 com uso criativo, a critério do mestre); acoplar um item numa ação de interlúdio",
        }[v.elemento];
        l.push("Ser Expurgado (o braço): " + braco + ".");
      }
    } else {
      l.push("Ser Escarificado: PE e DT dos rituais por " + nomeAt + " em vez de Presença; +1 em " + nomeAt + ".");
      if (v.marco >= 40) l.push("Ser Perfurado: Tatuagem Ritualística nos rituais de " + A7().NOME_DO_ELEMENTO[v.elemento] + " marcados na pele; uma conjuração como reação por cena " + A7().REACAO_DO_ELEMENTO[v.elemento].texto + "; +5 em concentração com eles.");
      if (v.marco >= 65) l.push("Ser Rasgado: +2 na DT dos marcados e a ação de " + A7().NOME_DO_ELEMENTO[v.elemento] + " depois de conjurar um ritual do elemento (em “Usar ritual”).");
      if (v.marco >= 99) l.push("Ser Mutilado: +1 em " + nomeAt + ", marcados sem fala, gestos nem componentes, e os dois rituais de 4º círculo.");
    }
    return l;
  }

  function blocoDoProcedimento(ctx, o, v) {
    var reg = A7().registroDeHoje(o);
    var dia = A7().diaDe(o);
    var nome = nomeDoProcedimento(v);
    var partes = [titulo((v.especialista ? "Experimento" : "Escarificação") + " · dia " + dia + " da cronologia")];
    if (!v.elemento) {
      partes.push(linha("Escolha o elemento na Progressão para começar.", "t-aviso"));
      return bloco(partes);
    }
    partes.push(linha("Elemento: " + A7().NOME_DO_ELEMENTO[v.elemento] + ". Uma vez por dia, ação completa, consome um componente ritualístico do elemento e recupera " +
      A7().recuperacao(o).expressao + " " + (A7().recuperacao(o).recurso === "pe" ? sigla(o) : "PV") + ". É o dia da cronologia da campanha que conta — recarregar a página não refaz nada."));
    if (reg) {
      partes.push(linha("Feito hoje: recuperou " + reg.cura.valor + " " + reg.cura.recurso.toUpperCase() + " (" + reg.cura.antes + " → " + reg.cura.depois + "), consumiu " + reg.componente.nome + ".", "t-ok"));
      textoDosEfeitosDoDia(o, v, reg).forEach(function (t) { partes.push(linha(t)); });
    } else if (A7().semProcedimentoHoje(o)) {
      partes.push(linha("Hoje sem " + nome + ": efeitos parecidos com fome e sede (OPRPG p. 292) — a mesa aplica." + (v.especialista && v.marco >= 65 ? " A parte paranormal (o braço) fica inutilizada." : ""), "t-aviso"));
    } else {
      partes.push(linha("Ainda não feito hoje. Sem ele, o dia traz efeitos parecidos com fome e sede (OPRPG p. 292)" + (v.especialista && v.marco >= 65 ? " e o braço fica inutilizado" : "") + ".", "t-aviso"));
    }
    var botoes = [];
    if (!reg) botoes.push(botao((v.especialista ? "Fazer o experimento" : "Fazer a escarificação") + " (ação completa)…", function () { fazerProcedimento(ctx); }, { classe: "r-botao--principal", foco: "as7-procedimento" }));
    if (!reg && !A7().semProcedimentoHoje(o)) botoes.push(botao("Hoje não houve " + nome, function () {
      var r = A7().marcarSemProcedimento(o);
      if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
      salvar(ctx);
      UI.aviso("Dia sem " + nome + ": efeitos parecidos com fome e sede (OPRPG p. 292), aplicados pela mesa.");
    }, { classe: "r-botao--fantasma" }));
    if (A3()) botoes.push(botao("Novo dia (" + (dia + 1) + ")", function () {
      UI.confirmar({ titulo: "Começar um novo dia?", texto: "A cronologia da campanha avança um dia. Os efeitos do " + nome + " de hoje acabam.", rotuloConfirmar: "Novo dia" }).then(function (sim) {
        if (!sim) return;
        A3().avancar(o, "dia");
        A7().aoMudarDia(o);
        salvar(ctx);
        UI.aviso("Dia " + A7().diaDe(o) + " da cronologia.");
      });
    }, { classe: "r-botao--fantasma" }));
    partes.push(el("div.faixa", {}, botoes));
    /* Morte · ação padrão adicional por cena. */
    if (reg && v.especialista && v.elemento === "morte") {
      var usados = A7().usosNoPeriodo(o, "acaoPadraoExtra");
      var max = A7().quantosPorPeriodo(o, "acaoPadraoExtra");
      partes.push(el("div.faixa", {}, [
        linha("Ação padrão adicional nesta cena: " + usados + " de " + max + "."),
        botao("Usar a ação adicional", function () {
          var r = A7().registrarUsoLimitado(o, "acaoPadraoExtra", novoOp("ap"));
          if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
          salvar(ctx);
        }, { desligado: usados >= max }),
      ]));
    }
    return bloco(partes);
  }

  function fazerProcedimento(ctx) {
    var o = ordemDe(ctx);
    var v = A7().variante(o);
    if (!v) return;
    var comps = A7().componentesDisponiveis(o, ctx.ficha.inventario, v.elemento);
    var estado = { comp: comps[0] ? comps[0].modo + "|" + comps[0].id : "", pontos: 0 };
    var limite = A7().limiteDoSacrificio(o);
    var corpo = el("div.pilha--curta", { class: "pilha" });
    var op = novoOp("pr");
    var janela = UI.modal({ titulo: v.especialista ? "Experimento do dia" : "Escarificação do dia", conteudo: [corpo] });
    function pintar() {
      var rec = A7().recuperacao(o);
      var partes = [
        linha("Ação completa. Consome um componente ritualístico de " + A7().NOME_DO_ELEMENTO[v.elemento] + " e recupera " + rec.expressao + " " + (rec.recurso === "pe" ? sigla(o) : "PV") + " (até o máximo). Os efeitos valem até o fim do dia " + A7().diaDe(o) + "."),
      ];
      if (!comps.length) partes.push(linha("Nenhum componente de " + A7().NOME_DO_ELEMENTO[v.elemento] + " no inventário (nem no saldo da regra de componentes). Sem ele, não há procedimento.", "t-erro"));
      else partes.push(selecao(comps.map(function (c) { return { valor: c.modo + "|" + c.id, rotulo: c.nome + (c.modo === "item" && c.quantidade > 1 ? " (" + c.quantidade + ")" : "") }; }), estado.comp, function (x) { estado.comp = x; }, "Componente"));
      if (v.especialista && v.marco >= 40 && A7().SACRIFICIO[v.elemento]) {
        var s = A7().SACRIFICIO[v.elemento];
        var opcoes = [];
        for (var i = 0; i <= limite; i++) opcoes.push({ valor: String(i), rotulo: i === 0 ? "Nenhum" : i + " ponto(s)" });
        partes.push(selecao(opcoes, String(estado.pontos), function (x) { estado.pontos = Number(x) || 0; }, "Ser Testado: " + s.verbo + " " + A7().NOME_DO_ATRIBUTO[s.atributo]));
        partes.push(linha("Só pontos seus (até 0), sem os de itens ou rituais. O sacrifício vale até o fim do dia e não muda PV, PE, SAN nem a quantidade de perícias treinadas (AS7 p. 82)."));
      }
      partes.push(el("div.faixa", {}, [
        el("button.r-botao.r-botao--principal", { type: "button", texto: "Fazer", disabled: !comps.length, onclick: concluir }),
        el("button.r-botao.r-botao--fantasma", { type: "button", texto: "Cancelar", onclick: function () { janela.fechar(); } }),
      ]));
      U.trocar(corpo, partes);
    }
    function concluir() {
      var rec = A7().recuperacao(o);
      var rolada = rolarSoma(rec.expressao);
      if (!rolada) return;
      var c = calc(ctx);
      var recurso = rec.recurso === "pe" && c.determinacao ? "pd" : rec.recurso;
      var partesComp = estado.comp.split("|");
      var r = A7().fazerProcedimento(o, ctx.ficha.inventario, {
        opId: op, componente: { modo: partesComp[0], id: partesComp.slice(1).join("|") }, sacrificio: estado.pontos,
        rolagem: rolada.total, atual: c.atual[recurso], maximo: maximoDe(c, recurso),
      });
      if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
      janela.fechar();
      if (r.repetido) return;
      var notas = ["Recuperou " + r.registro.cura.valor + " " + recurso.toUpperCase() + " (" + r.registro.cura.antes + " → " + r.registro.cura.depois + "). Consumiu: " + r.registro.componente.nome + "."];
      /* Morte · Ser Experimentado: os PV temporários do experimento. */
      var temp = A7().temporariosDoExperimento(o);
      if (temp) {
        var t = rolarSoma(temp);
        if (t) { temporarioDaCena(o, "as7.experimento", t.total, v.marco >= 99 ? "Ser Apavorante" : "Ser Experimentado"); notas.push(temp + " = " + t.total + " PV temporários."); }
      }
      /* Morte · Ser Testado: os da cena, se for a primeira vez nela. */
      var tc = A7().temporariosDaCena(o);
      if (tc && !tc.jaRecebido) {
        var t2 = rolarSoma(tc.expressao);
        if (t2 && A7().registrarUsoLimitado(o, "pvDaCena", novoOp("pc")).ok) { temporarioDaCena(o, "as7.testado", t2.total, "Ser Testado"); notas.push("Ser Testado: " + tc.expressao + " = " + t2.total + " PV temporários nesta cena."); }
      }
      salvar(ctx);
      mostrar(rolada, (v.especialista ? "Experimento" : "Escarificação") + " · recuperação", notas);
    }
    pintar();
  }

  /* --- Ser Testado: o lembrete das regras (o sacrifício é escolhido no
     experimento) --- */
  function blocoDeSerTestado(ctx, o, v) {
    if (!v.especialista) return null;
    var reg = A7().registroDeHoje(o);
    var s = A7().SACRIFICIO[v.elemento];
    if (!s) return null;
    return bloco([
      linha(reg ? (reg.sacrificio.pontos ? "Hoje: " + reg.sacrificio.pontos + " ponto(s) de " + A7().NOME_DO_ATRIBUTO[s.atributo] + " sacrificados (" + s.verbo + ")." : "Hoje: sem sacrifício.")
        : "O sacrifício de " + A7().NOME_DO_ATRIBUTO[s.atributo] + " é escolhido no experimento do dia (até " + A7().limiteDoSacrificio(o) + " ponto(s))."),
    ]);
  }

  /* --- Ser Expurgado: o braço --- */
  function blocoDoBraco(ctx, o, v) {
    if (!v.especialista) return null;
    if (!A7().ativoHoje(o)) return bloco([linha("Sem o experimento de hoje, o braço está inutilizado (como um membro inutilizado).", "t-aviso")]);
    var p = [];
    if (v.elemento === "sangue") {
      var usado = A7().usosNoPeriodo(o, "bracoSangue") >= 1;
      p.push(el("div.faixa", {}, [
        linha("Ao atacar com outra arma, uma vez por rodada: 1 " + sigla(o) + " para um ataque desarmado com o braço."),
        botao("Ataque com o braço (1 " + sigla(o) + ")", function () {
          var r = A7().registrarUsoLimitado(o, "bracoSangue", novoOp("bs"));
          if (!r.ok) { UI.avisoAtencao("Uma vez por rodada."); return; }
          var g = gastar(ctx, 1);
          if (!g) return;
          salvar(ctx);
          if (global.RAMAOrdemRolarPericia) global.RAMAOrdemRolarPericia(ctx, "luta", "Ataque desarmado (braço de Sangue)");
        }, { desligado: usado }),
      ]));
    }
    if (v.elemento === "morte") {
      p.push(el("div.faixa", {}, [
        linha("Tocar um item pela primeira vez com o braço: 3 " + sigla(o) + " para envelhecê-lo ou ver o passado dele."),
        botao("Tocar um item (3 " + sigla(o) + ")…", function () { tocarItem(ctx); }),
      ]));
      var tocados = A7().dados(o).procedimento.tocados;
      if (tocados.length) p.push(linha("Já tocados: " + tocados.map(function (t) { return t.nome; }).join(", ") + "."));
    }
    if (v.elemento === "conhecimento") {
      p.push(el("div.faixa", {}, [
        linha("Ação completa e 3 " + sigla(o) + ": tocar uma cabeça."),
        botao("Tocar a própria cabeça", function () {
          var g = gastar(ctx, 3);
          if (!g) return;
          efeitoEmMim(ctx, { nome: "Detecção de Ameaças (discente)", origem: { tipo: "habilidade", nome: "Ser Expurgado" }, modificadores: [],
            descricao: "Pelo braço de Conhecimento (AS7 p. 83): sob efeito do ritual Detecção de Ameaças discente até o fim da cena." });
          salvar(ctx);
          UI.aviso("Detecção de Ameaças discente até o fim da cena (em Condições). Gastou 3 " + g.qual + ".");
        }),
        botao("Tocar a cabeça de outro ser…", function () {
          var c = campoTexto("Quem (seres sem cabeça não são afetados; quem resiste pede ataque corpo a corpo)", "", 80);
          UI.modal({ titulo: "Mergulho Mental (braço de Conhecimento)", conteudo: [c.no, linha("O alvo fica sob Mergulho Mental por 3 rodadas, sem teste de resistência e sem sustentar PE; não dá para aumentar a duração, e perder o contato encerra.")],
            botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Tocar (3 " + sigla(o) + ")", classe: "r-botao--principal", aoClicar: function (fechar) {
              if (!c.valor()) return;
              var g = gastar(ctx, 3);
              if (!g) return;
              fechar(); salvar(ctx);
              UI.aviso(c.valor() + ": Mergulho Mental por 3 rodadas. Gastou 3 " + g.qual + ".", { duracao: 8000 });
            } }] });
        }),
      ]));
    }
    if (v.elemento === "energia") {
      var pr = A7().dados(o).procedimento;
      var ativa = pr.corporeidade === A7().cenaDe(o);
      p.push(el("div.faixa", {}, [
        linha(ativa ? "Corporeidade manipulada até o fim da cena: o resultado de um teste oferece +5 quando o braço for usado criativamente (a critério do mestre)." : "Movimento e 2 " + sigla(o) + ": manipular a corporeidade do braço até o fim da cena."),
        ativa ? null : botao("Manipular (2 " + sigla(o) + ")", function () {
          var g = gastar(ctx, 2);
          if (!g) return;
          A7().definirEscolha(o, "corporeidade", true);
          salvar(ctx);
        }),
      ]));
      var acoplado = campoTexto("Item de uma mão acoplado ao braço (ação de interlúdio)", pr.acoplado, 120);
      p.push(el("div.faixa", {}, [acoplado.no, botao("Guardar", function () { A7().definirEscolha(o, "acoplado", acoplado.valor()); salvar(ctx); })]));
    }
    return bloco(p);
  }

  function tocarItem(ctx) {
    var o = ordemDe(ctx);
    var c = campoTexto("Qual item (tocar um item portado por quem resiste exige vencer a manobra quebrar)", "", 120);
    var escolha = "envelhecer";
    UI.modal({ titulo: "Braço de Morte", conteudo: [c.no,
      selecao([{ valor: "envelhecer", rotulo: "Envelhecer: 50 de dano de Morte no item" }, { valor: "passado", rotulo: "Interagir com o passado: visão de 1 minuto da última pessoa que o pegou" }], escolha, function (x) { escolha = x; }, "Efeito")],
      botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Tocar (3 " + sigla(o) + ")", classe: "r-botao--principal", aoClicar: function (fechar) {
        var nome = c.valor();
        if (!nome) return;
        if (A7().itemJaTocado(o, nome)) { UI.avisoAtencao("Este item já foi tocado pelo braço: o efeito é só na primeira vez."); return; }
        var g = gastar(ctx, 3);
        if (!g) return;
        var r = A7().registrarToque(o, novoOp("tq"), nome, escolha);
        if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
        fechar(); salvar(ctx);
        UI.aviso(escolha === "passado" ? nome + ": visão nebulosa da última pessoa que o pegou (1 minuto)." : nome + " sofre 50 de dano de Morte.", { duracao: 8000 });
      } }] });
  }

  /* --- escolhas de perícias (Conhecimento) --- */
  function escolherPericias(ctx, campo, quantas, rotulo) {
    var o = ordemDe(ctx);
    var atuais = A7().dados(o).procedimento[campo].slice();
    var caixas = C().PERICIAS.map(function (p) {
      var cb = el("input", { type: "checkbox", checked: atuais.indexOf(p.chave) >= 0, value: p.chave });
      return { cb: cb, no: el("label.r-marca", {}, [cb, el("span", { texto: p.nome })]) };
    });
    UI.modal({ titulo: rotulo, conteudo: [linha("Escolha " + quantas + "."), el("div.efeitos-imunidades", {}, caixas.map(function (x) { return x.no; }))],
      botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Guardar", classe: "r-botao--principal", aoClicar: function (fechar) {
        var sel = caixas.filter(function (x) { return x.cb.checked; }).map(function (x) { return x.cb.value; });
        if (sel.length !== quantas) { UI.avisoAtencao("Escolha exatamente " + quantas + "."); return; }
        A7().definirEscolha(o, campo, sel);
        fechar(); salvar(ctx);
      } }] });
  }
  function nomesDasPericias(lista) { return lista.map(function (k) { var p = C().pericia(k); return p ? p.nome : k; }).join(", "); }

  /* --- Ocultista: rituais marcados na pele, a reação e o 4º círculo --- */
  function blocoDosMarcados(ctx, o, v) {
    var marcados = A7().dados(o).procedimento.rituaisMarcados;
    var doElemento = rituaisDaFicha(ctx).filter(function (r) { return A7().elementosDoRitual(r).indexOf(v.elemento) >= 0; });
    var partes = [linha(doElemento.length
      ? "Marcados na pele (" + A7().NOME_DO_ELEMENTO[v.elemento] + "): " + (doElemento.filter(function (r) { return marcados.indexOf(A7().chaveDoRitual(r)) >= 0; }).map(function (r) { return r.nome; }).join(", ") || "nenhum ainda") + "."
      : "Nenhum ritual de " + A7().NOME_DO_ELEMENTO[v.elemento] + " na ficha para marcar.")];
    if (doElemento.length) partes.push(el("div.faixa", {}, [botao("Escolher os marcados…", function () {
      var caixas = doElemento.map(function (r) {
        var k = A7().chaveDoRitual(r);
        var cb = el("input", { type: "checkbox", checked: marcados.indexOf(k) >= 0, value: k });
        return { cb: cb, no: el("label.r-marca", {}, [cb, el("span", { texto: r.nome })]) };
      });
      UI.modal({ titulo: "Rituais marcados na pele", conteudo: [linha("Os marcados recebem a Tatuagem Ritualística ampliada (Ser Perfurado), o +2 na DT (Ser Rasgado) e, em Ser Mutilado, dispensam fala, gestos e componentes — sempre no dia da escarificação."), el("div.pilha--curta", { class: "pilha" }, caixas.map(function (x) { return x.no; }))],
        botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Guardar", classe: "r-botao--principal", aoClicar: function (fechar) {
          var outros = marcados.filter(function (k) { return !caixas.some(function (x) { return x.cb.value === k; }); });
          A7().definirEscolha(o, "rituaisMarcados", outros.concat(caixas.filter(function (x) { return x.cb.checked; }).map(function (x) { return x.cb.value; })));
          fechar(); salvar(ctx);
        } }] });
    })]));
    if (v.marco >= 40) {
      var situacao = situacaoDaFicha(ctx);
      var pode = A7().podeReacao(o, situacao);
      partes.push(el("div.faixa", {}, [
        linha("Reação, uma vez por cena, " + A7().REACAO_DO_ELEMENTO[v.elemento].texto + ": conjurar um ritual marcado." + (pode.ok ? "" : " (" + pode.motivo + ")")),
        botao("Conjurar como reação…", function () { conjurarComoReacao(ctx, doElemento.filter(function (r) { return A7().ritualMarcado(o, r); })); }, { desligado: !pode.ok }),
      ]));
    }
    return bloco(partes);
  }
  function situacaoDaFicha(ctx) {
    var o = ordemDe(ctx);
    var cats = [];
    if (EF() && o.condicoes) EF().condicoesEfetivas(o.condicoes).forEach(function (x) {
      if (x.imune) return;
      var def = EF().condicao(x.chave);
      if (def && def.categoria && cats.indexOf(def.categoria) < 0) cats.push(def.categoria);
    });
    return { categorias: cats, machucado: R().machucado ? R().machucado(o) : false, morrendo: !!(o.condicoes && o.condicoes.morrendo && o.condicoes.morrendo.ativa) };
  }
  function conjurarComoReacao(ctx, marcados) {
    var o = ordemDe(ctx);
    if (!marcados.length) { UI.avisoAtencao("Nenhum ritual marcado na pele."); return; }
    var escolhido = marcados[0].id;
    UI.modal({ titulo: "Ser Perfurado: conjurar como reação", conteudo: [selecao(marcados.map(function (r) { return { valor: r.id, rotulo: r.nome }; }), escolhido, function (x) { escolhido = x; }, "Ritual")],
      botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Conjurar", classe: "r-botao--principal", aoClicar: function (fechar) {
        var r = A7().registrarUsoLimitado(o, "reacaoPerfurado", novoOp("rp"));
        if (!r.ok) { UI.avisoAtencao("Uma vez por cena — já usada."); return; }
        fechar(); ctx.alterou();
        var ritual = marcados.filter(function (x) { return x.id === escolhido; })[0];
        if (global.RAMASecaoConsumo && ritual) global.RAMASecaoConsumo.usarRitual(ctx, ritual);
      } }] });
  }
  function blocoDoQuartoCirculo(ctx, o, v) {
    var r99 = A7().dados(o).procedimento.rituais99;
    var partes = [];
    var lista = el("p.t-mini", { texto: "Escolhidos: " + (r99.elemento || "—") + " · " + (r99.medo || "—") + "." });
    partes.push(lista);
    if (RT()) RT().carregar().then(function (cat) {
      var n1 = r99.elemento && cat.porId[r99.elemento] ? cat.porId[r99.elemento].nome : "nenhum";
      var n2 = r99.medo && cat.porId[r99.medo] ? cat.porId[r99.medo].nome : "nenhum";
      lista.textContent = "Escolhidos: " + n1 + " (" + A7().NOME_DO_ELEMENTO[v.elemento] + ") · " + n2 + " (Medo, conta como de " + A7().NOME_DO_ELEMENTO[v.elemento] + ").";
    }).catch(function () {});
    partes.push(botao("Escolher os dois rituais de 4º círculo…", function () { escolherQuartoCirculo(ctx, v); }));
    if (A7().ativoHoje(o)) {
      if (r99.elemento) partes.push(botao("Conjurar o de " + A7().NOME_DO_ELEMENTO[v.elemento] + " (hoje)", function () { conjurarDoCatalogo(ctx, r99.elemento, "Ser Mutilado"); }));
      if (r99.medo) partes.push(botao("Conjurar o de Medo (hoje)", function () { conjurarDoCatalogo(ctx, r99.medo, "Ser Mutilado"); }));
    } else partes.push(linha("Conjuráveis só no dia da escarificação."));
    return bloco(partes);
  }
  function escolherQuartoCirculo(ctx, v) {
    var o = ordemDe(ctx);
    RT().carregar().then(function (cat) {
      function opcoes(el2) {
        return cat.rituais.filter(function (e) {
          var els = Array.isArray(e.elemento) ? e.elemento : [e.elemento];
          return e.circulo === 4 && els.indexOf(el2) >= 0 && (!C().fonteLiberada || C().fonteLiberada(e.fonte || "OPRPG"));
        }).map(function (e) { return { valor: e.id, rotulo: e.nome }; });
      }
      var r99 = A7().dados(o).procedimento.rituais99;
      var a = r99.elemento, b = r99.medo;
      var oe = [{ valor: "", rotulo: "—" }].concat(opcoes(v.elemento));
      var om = [{ valor: "", rotulo: "—" }].concat(opcoes("medo"));
      UI.modal({ titulo: "Ser Mutilado: rituais de 4º círculo", conteudo: [
        selecao(oe, a, function (x) { a = x; }, A7().NOME_DO_ELEMENTO[v.elemento]),
        selecao(om, b, function (x) { b = x; }, "Medo"),
        linha("Conjuráveis no dia da escarificação, sem virar rituais aprendidos. O de Medo recebe os benefícios da trilha como se fosse de " + A7().NOME_DO_ELEMENTO[v.elemento] + " — o catálogo não muda."),
      ], botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Guardar", classe: "r-botao--principal", aoClicar: function (fechar) {
        A7().definirEscolha(o, "ritual99elemento", a);
        A7().definirEscolha(o, "ritual99medo", b);
        fechar(); salvar(ctx);
      } }] });
    }).catch(function () { UI.avisoErro("Não foi possível carregar o catálogo de rituais."); });
  }

  var CONTROLES = {
    serExperimentado: function (ctx, o, v) {
      var partes = [blocoDoProcedimento(ctx, o, v)];
      if (v.elemento === "conhecimento" && v.marco < 99) {
        var esc = A7().dados(o).procedimento.periciasConhecimento;
        partes.push(el("div.faixa", {}, [linha("Consideradas treinadas no dia do experimento: " + (esc.length ? nomesDasPericias(esc) : "escolha duas") + "."),
          botao("Escolher as duas perícias…", function () { escolherPericias(ctx, "periciasConhecimento", 2, "Ser Experimentado (Conhecimento)"); })]));
      }
      return partes;
    },
    serTestado: function (ctx, o, v) { return [blocoDeSerTestado(ctx, o, v)]; },
    serExpurgado: function (ctx, o, v) { return [blocoDoBraco(ctx, o, v)]; },
    serApavorante: function (ctx, o, v) {
      var partes = [];
      var id = A7().RITUAL_APAVORANTE[v.elemento];
      if (id) {
        var l = linha("Ritual da forma apavorante: conjurável no dia do experimento, sem virar ritual aprendido.");
        nomeDoRitualDoCatalogo(id, function (nome) { l.textContent = nome + ": conjurável no dia do experimento, sem virar ritual aprendido."; });
        partes.push(el("div.faixa", {}, [l, A7().ativoHoje(o) ? botao("Conjurar (hoje)", function () { conjurarDoCatalogo(ctx, id, "Ser Apavorante"); }) : null]));
      }
      if (v.elemento === "conhecimento") {
        var esc = A7().dados(o).procedimento.periciasApavorante;
        partes.push(el("div.faixa", {}, [linha("Expert no dia do experimento: " + (esc.length ? nomesDasPericias(esc) : "escolha três") + "."),
          botao("Escolher as três perícias…", function () { escolherPericias(ctx, "periciasApavorante", 3, "Ser Apavorante (Conhecimento)"); })]));
      }
      return partes;
    },
    serEscarificado: function (ctx, o, v) { return [blocoDoProcedimento(ctx, o, v)]; },
    serPerfurado: function (ctx, o, v) { return [blocoDosMarcados(ctx, o, v)]; },
    serRasgado: function (ctx, o, v) {
      var t = { sangue: "Depois de conjurar um ritual de Sangue: movimento e 2d8+2 PV para servir o sangue a um aliado adjacente (+1 dado em Agilidade, Força e Vigor até o fim da cena, se ele aceitar como reação).",
        morte: "Aprende Cicatrização (já conhecendo, –1 PE nela); depois de conjurar outro ritual de Morte, Cicatrização como ação de movimento.",
        conhecimento: "Depois de conjurar um ritual de Conhecimento: movimento e 2 PE para cinco perguntas de sim ou não sobre o alvo — ou, sendo você o alvo, ver o incorpóreo, o invisível e o oculto até o fim da cena.",
        energia: "Depois de conjurar um ritual de Energia: movimento e 3 PE para se teletransportar 3 m e receber, por 1 rodada, Defesa igual aos PE gastos no ritual." }[v.elemento];
      return [linha((t || "") + " Aparece em “Usar ritual” com a escarificação de hoje.")];
    },
    serMutilado: function (ctx, o, v) { return [blocoDoQuartoCirculo(ctx, o, v)]; },
  };

  function controles(ctx, aq) {
    if (!A7() || !aq || !CONTROLES[aq.chave]) return null;
    permitidoGlobal = permitido(ctx);
    var o = ordemDe(ctx);
    var v = A7().variante(o);
    if (!v) return null;
    var partes = (CONTROLES[aq.chave](ctx, o, v) || []).filter(Boolean);
    return partes.length ? el("div.pilha--curta.origem-controles", { class: "pilha" }, partes) : null;
  }

  /* =================================================================
     ORIGEM: Exorcizado
     ================================================================= */

  function controlesDeOrigem(ctx, org) {
    if (!A7() || !org || org.chave !== "exorcizado") return null;
    permitidoGlobal = permitido(ctx);
    var o = ordemDe(ctx);
    var el2 = A7().elementoDoExorcizado(o);
    var ct = A7().contatoNaCena(o);
    var nomeEl = el2 ? A7().NOME_DO_ELEMENTO[el2] : "o elemento escolhido";
    /* Jogando sem Sanidade (SAH p. 104): a perda não se aplica — o
       registro da cena continua, para a mesa saber que já houve. */
    var semSan = R().usaDeterminacao(o);
    return bloco([
      linha(ct ? "Contato com " + nomeEl + " nesta cena: registrado" + (ct.perdeu ? " (perdeu " + ct.perdeu + " SAN)" : " (Jogando sem Sanidade: sem perda)") + ". Até a próxima cena, outro contato não tira Sanidade."
        : "Primeiro contato com " + nomeEl + " nesta cena (rituais, itens amaldiçoados, criaturas ou poderes paranormais): " + (semSan ? "com Jogando sem Sanidade, a perda de 2 SAN não se aplica (SAH p. 104)" : "perde 2 SAN") + ". Quem diz que houve contato é a mesa."),
      ct ? null : botao(semSan ? "Registrar o contato desta cena (sem perda: Jogando sem Sanidade)" : "Registrar o contato desta cena (–2 SAN)", function () {
        UI.confirmar({ titulo: "Contato com " + nomeEl, texto: "Primeira vez nesta cena em contato com " + nomeEl + ". " + (semSan ? "Registrar o contato? Com Jogando sem Sanidade, nada é perdido." : "Perder 2 de Sanidade?"), rotuloConfirmar: semSan ? "Registrar" : "Perder 2 SAN" }).then(function (sim) {
          if (!sim) return;
          var s = perderSan(ctx, 2);
          var r = A7().registrarContato(o, novoOp("ct"), el2, s ? s.antes - s.depois : 0);
          if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
          salvar(ctx);
          if (s) UI.aviso("O Que Restou: SAN " + s.antes + " → " + s.depois + ".");
        });
      }, { foco: "as7-contato" }),
    ]);
  }

  /* =================================================================
     NO TESTE
     ================================================================= */

  function modificadoresDoTeste(ctx, o, contexto) {
    if (!A7()) return [];
    return A7().dadosExtras(o, ctx.ficha.inventario, contexto).map(function (x, i) {
      return { id: x.peDeCoelho ? "as7-pe-de-coelho" : "as7-" + i, dado: x.dado, operacao: "+", rotulo: x.rotulo };
    });
  }
  /* As parcelas dos dados extras (a rolagem de perícia monta as próprias
     parcelas de novo) e o acidente do Pé de Coelho: d4 do bônus ímpar →
     OUTRO 1d4 de perda de PV, aplicado uma vez, nesta rolagem. */
  function depoisDoTeste(ctx, r, mods) {
    var notas = [];
    if (!r || !Array.isArray(r.extras)) return notas;
    r.extras.forEach(function (x) {
      var m = (mods || []).filter(function (y) { return y.id === x.id; })[0];
      if (m && !(r.parcelas || []).some(function (p) { return p.dadoExtraId === x.id; })) r.parcelas.push({ rotulo: m.rotulo + " (" + x.expressao + ")", valor: x.valor, dadoExtraId: x.id });
      if (x.id === "as7-pe-de-coelho" && x.total % 2 === 1) {
        var perda = rolarSoma("1d4");
        if (perda) {
          var d = danoEmMim(ctx, perda.total);
          if (d) { ctx.alterou(); notas.push("Pé de Coelho: o d4 saiu " + x.total + " (ímpar) — acidente no pé: outro 1d4 = " + perda.total + " PV perdidos (" + d.antes + " → " + d.depois + ")."); }
        }
      }
    });
    if (notas.length) setTimeout(function () { ctx.redesenhar(); }, 0);
    return notas;
  }

  function danoExtraDoAtaque(ctx, o) {
    return A7() ? A7().danoExtra(o) : null;
  }

  function acoesNoTeste(ctx, o, p, r) {
    if (!A7() || !permitido(ctx)) return [];
    var saida = [];
    function unico(rotulo, f, dica) {
      var usado = false;
      saida.push({ rotulo: rotulo, dica: dica || "", aoClicar: function (cartao, b) { if (usado) return; if (f(b) !== false) { usado = true; if (b) b.disabled = true; } } });
    }
    function somar(valor, rot, notas) {
      global.RAMARolagens.mostrar(Object.assign({}, r, { total: r.total + valor, parcelas: (r.parcelas || []).concat([{ rotulo: rot, valor: valor }]) }), { nome: p.nome + " · " + rot, notas: notas || [] });
    }
    A7().tercosAtivos(ctx.ficha.inventario).forEach(function (item) {
      var s = dadosDoItem(item).as7 || {};
      unico("Terço Maculado: +2d10 (a favor da súplica)", function () {
        UI.confirmar({ titulo: "Terço Maculado", texto: "Este teste é uma ação a favor da súplica: “" + s.suplica + "”?", rotuloConfirmar: "Sim, +2d10" }).then(function (sim) {
          if (!sim) return;
          var d = rolarSoma("2d10");
          if (d) somar(d.total, "Terço Maculado (2d10 = " + d.total + ")", ["A favor da súplica: " + s.suplica + "."]);
        });
      });
    });
    var cena = A7().cenaDe(o);
    if (p.chave === "sobrevivencia") {
      A7().consumosDaCena(o, true).filter(function (c) { return c.vaso === "olfato"; }).forEach(function (c) {
        unico("Vasos do Olfato: +" + A7().BONUS_DA_FORMA[c.forma] + " (rastrear " + c.escolha + ")", function () {
          somar(A7().BONUS_DA_FORMA[c.forma], "Vasos do Olfato", ["Só para rastrear " + c.escolha + ", até o fim da cena."]);
        });
      });
    }
    var pr = A7().dados(o).procedimento;
    var v = A7().variante(o);
    if (v && v.especialista && v.elemento === "energia" && pr.corporeidade === cena && A7().ativoHoje(o)) {
      unico("Braço de Energia: +5 (uso criativo, a critério do mestre)", function () { somar(5, "Braço de Energia"); });
    }
    if (v && v.especialista && v.elemento === "sangue" && A7().ativoHoje(o) && p.chave === "luta") {
      var b = v.marco >= 99 ? 5 : 2;
      unico((v.marco >= 99 ? "Enorme" : "Grande") + ": +" + b + " numa manobra", function () { somar(b, (v.marco >= 99 ? "Enorme" : "Grande") + " (manobra)"); });
    }
    return saida;
  }

  /* =================================================================
     CONDIÇÕES: debaixo d'água e a infecção da Apóstata
     ================================================================= */

  function botoesDeCondicoes(ctx) {
    if (!A7() || !permitido(ctx)) return [];
    permitidoGlobal = true;
    var o = ordemDe(ctx);
    var l = [];
    if (A7().regraSubaquatica(o) && !A7().dados(o).submerso.ativo) l.push(el("button.r-botao.r-botao--mini", { type: "button", texto: "Entrar na água…", onclick: function () { entrarNaAgua(ctx); } }));
    if (liberado() && !A7().dados(o).infeccao.ativa) l.push(el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Infectado pela Apóstata…", onclick: function () { infectar(ctx); } }));
    return l;
  }

  function entrarNaAgua(ctx) {
    var o = ordemDe(ctx);
    var prof = campoTexto("Profundidade (metros)", "0", 5);
    var est = { natacao: false, oxigenio: false };
    function marca(rot, k) {
      var cb = el("input", { type: "checkbox", onchange: function (ev) { est[k] = ev.target.checked; } });
      return el("label.r-marca", {}, [cb, el("span", { texto: rot })]);
    }
    UI.modal({ titulo: "Debaixo d'água", conteudo: [
      linha("Regras da Dragão Brasil #206 (AS7 p. 92–93): não oficiais e não canônicas."),
      prof.no, marca("Tem deslocamento de natação (sem –5 nos ataques)", "natacao"), marca("Tem fonte de oxigênio", "oxigenio"),
    ], botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Entrar", classe: "r-botao--principal", aoClicar: function (fechar) {
      var r = A7().entrarNaAgua(o, { profundidade: parseInt(prof.valor(), 10) || 0, natacao: est.natacao, oxigenio: est.oxigenio });
      if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
      var inst = efeitoEmMim(ctx, { nome: "Submerso", origem: { tipo: "manual", nome: "Regras debaixo d'água (AS7, não oficial)" },
        modificadores: A7().modificadoresSubmerso(o), restricoes: A7().restricoesSubmerso(o), duracao: { tipo: "ateRemover" },
        descricao: "Debaixo d'água (regras não oficiais da Dragão Brasil #206, AS7 p. 92–93). Sai ao marcar que saiu da água." });
      if (inst) A7().dados(o).submerso.efeitoId = inst.id;
      fechar(); salvar(ctx);
    } }] });
  }

  function condicoes(ctx) {
    if (!A7()) return null;
    permitidoGlobal = permitido(ctx);
    var o = ordemDe(ctx);
    var partes = [];
    var s = A7().dados(o).submerso;
    if (s.ativo) {
      var d = A7().dtDaPressao(o);
      var f = A7().faixaDePressao(s.profundidade);
      partes.push(bloco([
        titulo("Debaixo d'água · " + s.profundidade + " m"),
        linha("Percepção –10" + (s.natacao ? "" : ", –5 em ataques") + " (em Condições, “Submerso”). Regras não oficiais (AS7 p. 92–93)."),
        d ? linha("Pressão (" + f.rotulo + "): Fortitude DT " + d.dt + " " + f.momento + "." + (f.chave === "ferimentos" ? " Perde 1d6 PV (metade passando)." : f.chave === "extrema" ? " Falhando: inconsciente e 1d6 PV por rodada." : " Falhando: fatigado."), "t-aviso") : null,
        el("div.faixa", {}, [
          d ? botao("Teste de Pressão (Fortitude DT " + d.dt + ")", function () { testeDePressao(ctx); }) : null,
          botao("Mudar a profundidade…", function () {
            var c = campoTexto("Profundidade (metros)", String(s.profundidade), 5);
            UI.modal({ titulo: "Profundidade", conteudo: [c.no], botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Guardar", classe: "r-botao--principal", aoClicar: function (fechar) {
              A7().mudarProfundidade(o, parseInt(c.valor(), 10) || 0); fechar(); salvar(ctx);
            } }] });
          }, { classe: "r-botao--fantasma" }),
          botao("Saiu da água", function () {
            var r = A7().sairDaAgua(o);
            encerrarEfeito(o, r.efeitoId);
            salvar(ctx);
            UI.aviso("Fora d'água: as penalidades saíram.");
          }),
        ]),
      ]));
    }
    var inf = A7().dados(o).infeccao;
    if (inf.ativa) {
      var hoje = A7().testeDeHoje(o);
      var est = ["", "I", "II", "III", "IV"][inf.estagio];
      partes.push(bloco([
        titulo("Mentem Corrumpere · estágio " + est),
        linha("Infectado desde o dia " + inf.desde + " (" + A7().diasInfectado(o) + " dia(s)). Teste diário: Vontade DT " + A7().dtDaInfeccao(o) + ". Falhas seguidas: " + inf.falhasSeguidas + "." +
          (inf.estagio >= 3 ? " Sem ter falhado hoje, não consegue atacar a apóstata até ser atacado por ela." : "") + (inf.estagio >= 2 ? " Começa toda cena desprevenido por uma rodada." : ""), "t-aviso"),
        hoje ? linha("Hoje: " + hoje.total + " contra DT " + hoje.dt + " — " + (hoje.passou ? "passou." : "falhou: não consegue se afastar mais de 90 m dela.")) : null,
        el("div.faixa", {}, [
          hoje ? null : botao("Teste do dia (Vontade DT " + A7().dtDaInfeccao(o) + ")", function () { testeDaInfeccao(ctx); }, { classe: "r-botao--principal" }),
          inf.estagio < 4 ? botao("Um rito foi concluído → estágio " + ["", "I", "II", "III", "IV"][inf.estagio + 1], function () {
            var r = A7().avancarInfeccao(o, inf.estagio + 1);
            if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
            aplicarCondicoesDoEstagio(ctx);
            salvar(ctx);
          }, { classe: "r-botao--fantasma" }) : null,
          botao("A apóstata morreu: curado", function () {
            var r = A7().curarInfeccao(o);
            if (!r.ok) return;
            r.efeitos.forEach(function (id) { encerrarEfeito(o, id); });
            salvar(ctx);
            UI.aviso("Mentem Corrumpere curada.");
          }, { classe: "r-botao--fantasma" }),
        ]),
      ]));
    }
    return partes.length ? bloco(partes) : null;
  }

  function testeDePressao(ctx) {
    var o = ordemDe(ctx);
    var bonus = R().bonusDePericia(o, "fortitude", ctx.ficha.inventario);
    var r = D().dependente({ expressao: R().dadoDePericia(o, "fortitude"), sigla: "VIG", nome: "Fortitude", bonus: bonus.total, modificadores: [] });
    if (!r || !r.ok) return;
    var res = A7().resolverPressao(o, novoOp("ps"), r.total);
    if (!res.ok) { UI.avisoAtencao(res.motivo); return; }
    var notas = ["DT " + res.dt + ": " + (res.passou ? "passou." : "falhou.")];
    if (res.perdaPv) {
      var p = rolarSoma(res.perdaPv);
      if (p) {
        var valor = res.metade ? Math.floor(p.total / 2) : p.total;
        if (valor > 0) { var d = danoEmMim(ctx, valor); if (d) notas.push("Perdeu " + valor + " PV" + (res.metade ? " (metade de " + p.total + ")" : "") + " — " + d.antes + " → " + d.depois + "."); }
      }
    }
    if (res.condicao === "inconsciente") {
      if (CD()) CD().marcar(o.condicoes, "inconsciente", true);
      notas.push("Inconsciente.");
    } else if (res.condicao) {
      efeitoEmMim(ctx, { modelo: "cond:" + res.condicao, origem: { tipo: "manual", nome: "Pressão (AS7, não oficial)" } });
      notas.push(res.condicao === "fatigado" ? "Fatigado." : "Exausto.");
    }
    salvar(ctx);
    global.RAMARolagens.mostrar(Object.assign(r, { tipo: "pericia", nome: "Fortitude" }), { nome: "Fortitude · Pressão", notas: notas });
  }

  function infectar(ctx) {
    var o = ordemDe(ctx);
    var estagio = "1";
    UI.modal({ titulo: "Mentem Corrumpere (a Apóstata)", conteudo: [
      linha("A apóstata escolheu contaminar a mente em vez de causar dano mental (AS7 p. 70). É uma doença (OPRPG p. 291) sem teste para pegar; só a morte da criatura cura."),
      selecao([{ valor: "1", rotulo: "Estágio I" }, { valor: "2", rotulo: "Estágio II (depois do primeiro rito)" }, { valor: "3", rotulo: "Estágio III (depois do segundo)" }, { valor: "4", rotulo: "Estágio IV (depois do terceiro)" }], estagio, function (x) { estagio = x; }, "Começa no"),
    ], botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Registrar", classe: "r-botao--principal", aoClicar: function (fechar) {
      /* Já treinado em Religião: o estágio I dá +2 em vez do treino. */
      var r = A7().infectar(o, novoOp("inf"), Number(estagio), R().grauDaPericia(o, "religiao") !== "destreinado");
      if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
      aplicarCondicoesDoEstagio(ctx);
      fechar(); salvar(ctx);
    } }] });
  }
  function aplicarCondicoesDoEstagio(ctx) {
    var o = ordemDe(ctx);
    var inf = A7().dados(o).infeccao;
    var ativas = inf.efeitos.map(function (id) { return (o.condicoes.efeitos || []).filter(function (x) { return x.id === id; })[0]; }).filter(Boolean);
    A7().condicoesDoEstagio(inf.estagio).forEach(function (k) {
      if (ativas.some(function (x) { return x.modelo === "cond:" + k && EF().ativa(x); })) return;
      var inst = efeitoEmMim(ctx, { modelo: "cond:" + k, origem: { tipo: "criatura", nome: "Mentem Corrumpere (Apóstata)" }, duracao: { tipo: "ateRemover" } });
      if (inst) inf.efeitos.push(inst.id);
    });
  }
  function testeDaInfeccao(ctx) {
    var o = ordemDe(ctx);
    var bonus = R().bonusDePericia(o, "vontade", ctx.ficha.inventario);
    var r = D().dependente({ expressao: R().dadoDePericia(o, "vontade"), sigla: "PRE", nome: "Vontade", bonus: bonus.total, modificadores: [] });
    if (!r || !r.ok) return;
    var res = A7().registrarTesteDiario(o, novoOp("ti"), r.total);
    if (!res.ok) { UI.avisoAtencao(res.motivo); return; }
    var notas = ["DT " + res.dt + ": " + (res.passou ? "passou." : "falhou — não consegue se afastar mais de 90 m da apóstata."), "Falhas seguidas: " + res.falhasSeguidas + "."];
    if (res.obrigaRito) notas.push(["", "Dois", "Três", "Quatro"][res.obrigaRito] + " dias seguidos de falha: obrigado a iniciar o " + ["", "primeiro", "segundo", "último"][res.obrigaRito] + " rito da apóstata.");
    salvar(ctx);
    global.RAMARolagens.mostrar(Object.assign(r, { tipo: "pericia", nome: "Vontade" }), { nome: "Vontade · Mentem Corrumpere", notas: notas });
  }

  /* No bloco de cima (resumo da sessão): só o que pede ação hoje. */
  function alertasDoResumo(ctx) {
    if (!A7()) return [];
    var o = ordemDe(ctx);
    var saida = [];
    var v = A7().variante(o);
    if (v && v.elemento && !A7().ativoHoje(o) && !A7().semProcedimentoHoje(o)) {
      saida.push({ texto: (v.especialista ? "Experimento" : "Escarificação") + " de hoje pendente", aba: "habilidades", foco: "as7-procedimento" });
    }
    var inf = A7().dados(o).infeccao;
    if (inf.ativa && !A7().testeDeHoje(o)) saida.push({ texto: "Teste da infecção pendente", aba: "geral", foco: "" });
    if (A7().dados(o).submerso.ativo) saida.push({ texto: "Submerso · " + A7().dados(o).submerso.profundidade + " m", aba: "geral", foco: "" });
    return saida;
  }

  /* A cena acabou: os corpos encerram; com o experimento de Morte ativo,
     os PV temporários da nova cena são rolados (uma vez por cena). */
  function aoTrocarDeCena(ctx, cenaQueAcabou) {
    if (!A7()) return [];
    var o = ordemDe(ctx);
    var avisos = [];
    var r = A7().aoTrocarDeCena(o, cenaQueAcabou);
    if (r.corposEncerrados.length) avisos.push("Vampirismo: a refeição acabou com a cena (" + r.corposEncerrados.join(", ") + ") — esses corpos não podem ser alvo de novo.");
    var tc = A7().temporariosDaCena(o);
    if (tc && !tc.jaRecebido) {
      var t = rolarSoma(tc.expressao);
      if (t && A7().registrarUsoLimitado(o, "pvDaCena", novoOp("pc")).ok) {
        temporarioDaCena(o, "as7.testado", t.total, "Ser Testado");
        avisos.push("Ser Testado: " + tc.expressao + " = " + t.total + " PV temporários nesta cena.");
      }
    }
    return avisos;
  }

  /* =================================================================
     RITUAIS: Vampirismo e os rituais do dia
     ================================================================= */

  function painelDeRituais(ctx) {
    if (!A7() || !ctx.ficha.ordem) return null;
    permitidoGlobal = permitido(ctx);
    var o = ordemDe(ctx);
    var partes = [];
    var corpos = A7().corposDaCena(o);
    var consumos = A7().consumosDaCena(o, false);
    var temVampirismo = rituaisDaFicha(ctx).some(function (r) { return r.origemCatalogoId === A7().ID_VAMPIRISMO; });
    if (corpos.length || consumos.length || temVampirismo) {
      var linhas = [titulo("Vampirismo · refeições desta cena")];
      if (!corpos.length) linhas.push(linha("Nenhum corpo preparado nesta cena. “Usar ritual” em Vampirismo pede o corpo; um corpo preparado por outra pessoa também pode ser registrado aqui."));
      corpos.forEach(function (c) {
        var ja = A7().vasosConsumidos(o, c.id);
        linhas.push(el("div.faixa", {}, [
          linha(c.alvo + " (" + c.forma + (c.porMim ? "" : ", preparado por outra pessoa") + ") — vasos já consumidos: " + (ja.length ? ja.map(function (x) { return A7().NOMES_DOS_VASOS[x]; }).join(", ") : "nenhum") + "."),
          ja.length < A7().VASOS.length ? botao("Comer (1 minuto)…", function () { comer(ctx, c); }) : null,
        ]));
      });
      consumos.filter(function (c) { return c.paraMim; }).forEach(function (c) {
        if (c.vaso === "audicao") linhas.push(el("div.faixa", {}, [linha("Vasos da Audição: " + c.escolha + " conjurável até o fim da cena (não é ritual aprendido)."),
          botao("Conjurar", function () { conjurarDoCatalogo(ctx, c.escolha, "Vasos da Audição"); })]));
        if (c.vaso === "olfato") linhas.push(linha("Vasos do Olfato: +" + A7().BONUS_DA_FORMA[c.forma] + " para rastrear " + c.escolha + " (no resultado de Sobrevivência)."));
        if (c.vaso === "tato") linhas.push(linha("Vasos do Tato: " + (C().pericia(c.escolha) || {}).nome + " — " + (c.modo === "grau" ? A7().GRAU_DO_TATO[c.forma] : "+2") + " até o fim da cena."));
      });
      linhas.push(el("div.faixa", {}, [botao("Registrar um corpo preparado por outra pessoa…", function () { registrarCorpoDeOutro(ctx); }, { classe: "r-botao--fantasma" })]));
      partes.push(bloco(linhas));
    }
    var doDia = A7().rituaisDoDia(o, rituaisDaFicha(ctx));
    if (doDia.length) {
      var l2 = [titulo("Rituais da trilha, só hoje")];
      doDia.forEach(function (x) {
        var t = linha(x.fonte + ": " + x.id);
        nomeDoRitualDoCatalogo(x.id, function (nome) { t.textContent = nome + " — " + x.fonte + ". Não é ritual aprendido."; });
        l2.push(el("div.faixa", {}, [t, botao("Conjurar", function () { conjurarDoCatalogo(ctx, x.id, x.fonte); })]));
      });
      partes.push(bloco(l2));
    }
    return partes.length ? UI.painel("Arquivos Secretos 7", bloco(partes)) : null;
  }

  function registrarCorpoDeOutro(ctx) {
    var o = ordemDe(ctx);
    var c = campoTexto("De quem é o corpo", "", 120);
    var forma = "normal";
    UI.modal({ titulo: "Corpo preparado por outra pessoa", conteudo: [c.no, selecao([{ valor: "normal", rotulo: "Normal" }, { valor: "discente", rotulo: "Discente" }, { valor: "verdadeiro", rotulo: "Verdadeiro" }], forma, function (x) { forma = x; }, "Forma do ritual"),
      linha("Esta ficha não sabe que vasos outras pessoas já comeram: confira com a mesa.")],
      botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Registrar", classe: "r-botao--principal", aoClicar: function (fechar) {
        var r = A7().registrarCorpo(o, novoOp("cp"), c.valor(), forma, false);
        if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
        fechar(); salvar(ctx);
      } }] });
  }

  function comer(ctx, corpo) {
    var o = ordemDe(ctx);
    var ja = A7().vasosConsumidos(o, corpo.id);
    var marcados = {};
    var esc = { audicao: "", olfato: "", tato: "" };
    var paraMim = true;
    var quem = campoTexto("Quem come (se não for este personagem)", "", 80);
    var corpoModal = el("div.pilha--curta", { class: "pilha" });
    var op = novoOp("vs");
    var janela = UI.modal({ titulo: "Comer de " + corpo.alvo + " (1 minuto)", conteudo: [corpoModal] });
    var circulo = A7().CIRCULO_DA_AUDICAO[corpo.forma];
    var opcoesRituais = [{ valor: "", rotulo: "—" }];
    if (RT()) RT().carregar().then(function (cat) {
      cat.rituais.filter(function (e) { return e.circulo === circulo; }).forEach(function (e) { opcoesRituais.push({ valor: e.id, rotulo: e.nome }); });
      pintar();
    }).catch(function () {});
    function pintar() {
      var p = [linha("Escolha os vasos. Cada vaso, uma vez por corpo. Os efeitos duram até o fim da cena — comer é o que concede, não conjurar.")];
      A7().VASOS.forEach(function (vaso) {
        var cb = el("input", { type: "checkbox", checked: !!marcados[vaso], disabled: ja.indexOf(vaso) >= 0, onchange: function (ev) { marcados[vaso] = ev.target.checked; pintar(); } });
        var desc = { visao: "+" + A7().BONUS_DA_FORMA[corpo.forma] + " em ataques", audicao: "um ritual de " + circulo + "º círculo que a pessoa conjurava", paladar: "recupera " + A7().CURA_DA_FORMA[corpo.forma] + " PV",
          olfato: "+" + A7().BONUS_DA_FORMA[corpo.forma] + " para rastrear um ser ligado à pessoa", tato: A7().GRAU_DO_TATO[corpo.forma] + " numa perícia em que a pessoa era (já sendo: +2)" }[vaso];
        p.push(el("label.r-marca", {}, [cb, el("span", { texto: A7().NOMES_DOS_VASOS[vaso] + " — " + desc + (ja.indexOf(vaso) >= 0 ? " (já consumido)" : "") })]));
        if (marcados[vaso] && vaso === "audicao") p.push(selecao(opcoesRituais, esc.audicao, function (x) { esc.audicao = x; }, "Ritual"));
        if (marcados[vaso] && vaso === "olfato") { var co = campoTexto("Ser a rastrear", esc.olfato, 120); co.no.querySelector("input").addEventListener("change", function (ev) { esc.olfato = ev.target.value; }); p.push(co.no); }
        if (marcados[vaso] && vaso === "tato") p.push(selecao([{ valor: "", rotulo: "—" }].concat(C().PERICIAS.map(function (x) { return { valor: x.chave, rotulo: x.nome }; })), esc.tato, function (x) { esc.tato = x; }, "Perícia"));
      });
      var cbMim = el("input", { type: "checkbox", checked: paraMim, onchange: function (ev) { paraMim = ev.target.checked; pintar(); } });
      p.push(el("label.r-marca", {}, [cbMim, el("span", { texto: "Quem come é este personagem (os efeitos entram nesta ficha)" })]));
      if (!paraMim) p.push(quem.no);
      p.push(el("div.faixa", {}, [
        el("button.r-botao.r-botao--principal", { type: "button", texto: "Comer", onclick: concluir }),
        el("button.r-botao.r-botao--fantasma", { type: "button", texto: "Cancelar", onclick: function () { janela.fechar(); } }),
      ]));
      U.trocar(corpoModal, p);
    }
    function concluir() {
      var vasos = A7().VASOS.filter(function (x) { return marcados[x]; });
      var paladar = vasos.indexOf("paladar") >= 0 ? rolarSoma(A7().CURA_DA_FORMA[corpo.forma]) : null;
      var graus = {};
      if (esc.tato) graus[esc.tato] = R().grauDaPericia(o, esc.tato);
      var r = A7().consumir(o, { opId: op, corpoId: corpo.id, vasos: vasos, paraMim: paraMim, beneficiario: paraMim ? ctx.ficha.nome : quem.valor(),
        escolhas: esc, paladar: paladar ? paladar.total : 0, grauAtual: graus });
      if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
      janela.fechar();
      if (r.repetido) return;
      var notas = [];
      r.feitos.forEach(function (f) {
        if (!paraMim) return;
        if (f.vaso === "visao") {
          var inst = efeitoEmMim(ctx, { nome: "Vasos da Visão", origem: { tipo: "ritual", nome: "Vampirismo" }, versao: corpo.forma === "normal" ? "" : corpo.forma,
            modificadores: [{ alvo: "ataques", tipo: "bonus", valor: A7().BONUS_DA_FORMA[corpo.forma] }], descricao: "Flashes da pessoa lutando pela vida: +" + A7().BONUS_DA_FORMA[corpo.forma] + " em testes de ataque até o fim da cena (AS7 p. 77)." });
          if (inst) A7().ligarEfeitoAoConsumo(o, f.id, inst.id);
          notas.push("+" + A7().BONUS_DA_FORMA[corpo.forma] + " em ataques até o fim da cena (em Condições).");
        }
        if (f.vaso === "paladar" && paladar) {
          var cu = curaEmMim(ctx, paladar.total);
          notas.push("Vasos do Paladar: " + A7().CURA_DA_FORMA[corpo.forma] + " = " + paladar.total + " PV" + (cu ? " (" + cu.antes + " → " + cu.depois + ")" : "") + ".");
        }
      });
      if (!paraMim) notas.push((quem.valor() || "Outra pessoa") + " comeu: os efeitos são registrados na ficha dela.");
      salvar(ctx);
      UI.aviso("Refeição de " + corpo.alvo + ": " + r.feitos.map(function (f) { return A7().NOMES_DOS_VASOS[f.vaso]; }).join(", ") + ". " + notas.join(" "), { duracao: 9000 });
    }
    pintar();
  }

  /* =================================================================
     "USAR RITUAL"
     ================================================================= */

  function ajusteDoRitual(ctx, elemento, ritual) {
    if (!A7()) return { menosPe: 0, notas: [] };
    return A7().menosPeDoRitual(ordemDe(ctx), ritual, ctx.ficha.inventario, rituaisDaFicha(ctx));
  }

  function opcoesNoRitual(ctx, estado7, ritual, pintar) {
    if (!A7()) return [];
    var o = ordemDe(ctx);
    var partes = [];
    if (ritual && ritual.origemCatalogoId === A7().ID_VAMPIRISMO) {
      var c = campoTexto("Corpo (pessoa viva ou morta) que vira refeição até o fim da cena", estado7.alvo || "", 120);
      c.no.querySelector("input").addEventListener("change", function (ev) { estado7.alvo = ev.target.value.trim(); });
      partes.push(c.no);
      partes.push(linha("Os acréscimos de +5 PE (Discente) e +10 PE (Verdadeiro) somam-se aos 3 PE do 2º círculo. Conjurar prepara a refeição; os efeitos vêm de comer (aba Rituais, painel do Arquivos Secretos 7)."));
    }
    var v = A7().variante(o);
    if (v && !v.especialista && v.marco >= 65 && A7().ativoHoje(o) && A7().ritualDoElementoDaTrilha(o, ritual)) {
      var acao = { sangue: "servir o sangue a um aliado adjacente (movimento e 2d8+2 PV)", conhecimento: "obter revelações sobre o alvo (movimento e 2 PE)",
        energia: "teletransportar 3 m e Defesa igual aos PE do ritual por 1 rodada (movimento e 3 PE)", morte: "conjurar Cicatrização como ação de movimento" }[v.elemento];
      if (!(v.elemento === "morte" && ritual.origemCatalogoId === "op.ritual.cicatrizacao")) {
        partes.push(el("label.r-marca", {}, [
          el("input", { type: "checkbox", checked: !!estado7.rasgado, onchange: function (ev) { estado7.rasgado = ev.target.checked; } }),
          el("span", { texto: "Ser Rasgado, depois de conjurar: " + acao }),
        ]));
      }
    }
    if (A7().dados(o).submerso.ativo && A7().conjuraSubmerso(o, ritual)) partes.push(linha("Submerso: Ser Mutilado dispensa fala e gestos neste ritual marcado — dá para conjurá-lo debaixo d'água."));
    else if (A7().dados(o).submerso.ativo) partes.push(linha("Submerso: só conjura quem dispensa fala e gestos (regras não oficiais, AS7 p. 92).", "t-aviso"));
    return partes;
  }

  /* Depois do uso confirmado (uma vez, pelo opId do uso): registra o corpo
     do Vampirismo e faz a ação de Ser Rasgado. Devolve o texto do aviso. */
  function aplicarNoRitual(ctx, estado7, ritual, versao, peGastos) {
    if (!A7()) return "";
    var o = ordemDe(ctx);
    var textos = [];
    if (ritual && ritual.origemCatalogoId === A7().ID_VAMPIRISMO) {
      if (estado7.alvo) {
        var r = A7().registrarCorpo(o, novoOp("cp"), estado7.alvo, A7().formaDaVersao(versao), true);
        textos.push(r.ok ? "O corpo de " + estado7.alvo + " é uma refeição até o fim da cena." : r.motivo);
      } else textos.push("Diga o corpo no painel do Arquivos Secretos 7 (aba Rituais) para registrar a refeição.");
    }
    if (estado7.rasgado) {
      var v = A7().variante(o);
      if (v.elemento === "sangue") {
        var d = rolarSoma("2d8+2");
        var dm = d ? danoEmMim(ctx, d.total) : null;
        textos.push("Ser Rasgado: serviu " + (d ? d.total : "?") + " PV de sangue" + (dm ? " (PV " + dm.antes + " → " + dm.depois + ")" : "") + "; o aliado que aceitar, como reação, recebe +1 dado em Agilidade, Força e Vigor até o fim da cena.");
      } else if (v.elemento === "conhecimento") {
        var g = gastar(ctx, 2);
        textos.push(g ? "Ser Rasgado: 5 perguntas de sim ou não ao mestre sobre o alvo (ou, sendo você o alvo, ver o incorpóreo, o invisível e o oculto até o fim da cena). Gastou 2 " + g.qual + "." : "");
      } else if (v.elemento === "energia") {
        var g2 = gastar(ctx, 3);
        if (g2) {
          var pe = Math.max(0, peGastos || 0);
          efeitoEmMim(ctx, { nome: "Ser Rasgado (teletransporte)", origem: { tipo: "habilidade", nome: "Ser Rasgado" }, modificadores: pe ? [{ alvo: "defesa", tipo: "bonus", valor: pe }] : [],
            duracao: { tipo: "turnos", turnos: 1, contador: "alvo", momento: "inicio" }, descricao: "Teletransportou 3 m; Defesa +" + pe + " (os PE do ritual) por 1 rodada." });
          textos.push("Ser Rasgado: teletransporte de 3 m e +" + pe + " na Defesa por 1 rodada. Gastou 3 " + g2.qual + ".");
        }
      } else if (v.elemento === "morte") {
        textos.push("Ser Rasgado: Cicatrização como ação de movimento agora.");
        setTimeout(function () { conjurarDoCatalogo(ctx, "op.ritual.cicatrizacao", ""); }, 50);
      }
    }
    return textos.filter(Boolean).join(" ");
  }

  function dtExtraDoRitual(ctx, ritual) {
    if (!A7() || !ctx.ficha.ordem) return { valor: 0, partes: [] };
    return A7().dtExtraDoRitual(ordemDe(ctx), ritual, ctx.ficha.inventario, rituaisDaFicha(ctx));
  }

  /* Cajado da Cruz de Sangue: +1 dado do mesmo tipo no dano de rituais
     de Sangue. */
  function expressaoDoDano(ctx, ritual, expressao) {
    if (!A7() || !ctx.ficha.ordem) return { expressao: expressao, notas: [] };
    var o = ordemDe(ctx);
    if (!A7().cajadoAtivo(o, ctx.ficha.inventario, rituaisDaFicha(ctx)) || A7().elementosDoRitual(ritual).indexOf("sangue") < 0) return { expressao: expressao, notas: [] };
    var m = /^(\d+)d(\d+)(.*)$/.exec(String(expressao || "").trim());
    if (!m) return { expressao: expressao, notas: [] };
    return { expressao: (Number(m[1]) + 1) + "d" + m[2] + m[3], notas: ["Cajado da Cruz de Sangue: +1 dado (" + m[1] + "d" + m[2] + " → " + (Number(m[1]) + 1) + "d" + m[2] + ")."] };
  }

  /* =================================================================
     ITENS
     ================================================================= */

  function opcoesDoItem(ctx, item) {
    if (!A7() || !item || !permitido(ctx)) return [];
    var o = ordemDe(ctx);
    var cena = A7().cenaDe(o);
    var d = dadosDoItem(item);
    var s = d.as7 || {};
    var l = [];
    var id = item.origemCatalogoId;
    function feito(msg) { salvar(ctx); if (msg) UI.aviso(msg, { duracao: 7000 }); }
    if (id === A7().ID_CARRANCA) {
      var guiando = (s.guiadas || []).filter(function (g) { return !g.terminado; })[0];
      if (guiando) l.push({ rotulo: "Os 10 minutos passaram (" + guiando.criatura + ")", aoClicar: function () { var r = A7().carrancaTerminar(item); if (r.ok) feito("A carranca consumiu o material de " + r.criatura + ": nunca mais guia até ela."); } });
      else l.push({ rotulo: "Guiar até uma criatura…", aoClicar: function () {
        var c = campoTexto("A criatura ligada ao material", "", 120);
        UI.modal({ titulo: "Carranca Caçadora", conteudo: [c.no, linha("Os olhos apontam o caminho até a criatura (ou o último lugar onde esteve). O caminho é sempre o mais perigoso — quem o determina é o mestre. Dura 10 minutos.")],
          botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Guiar", classe: "r-botao--principal", aoClicar: function (fechar) {
            var r = A7().carrancaGuiar(item, novoOp("cg"), c.valor(), cena);
            if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
            fechar(); feito("A carranca guia até " + c.valor() + " por 10 minutos.");
          } }] });
      } });
    }
    if (id === A7().ID_CAJADO) {
      l.push({ rotulo: d.empunhada ? "Soltar o cajado" : "Empunhar o cajado", aoClicar: function () {
        if (!item.ordem) item.ordem = {};
        if (d.empunhada) delete item.ordem.empunhada; else item.ordem.empunhada = true;
        feito(d.empunhada ? "" : (A7().cajadoAtivo(o, ctx.ficha.inventario, rituaisDaFicha(ctx)) ? "Cajado empunhado: rituais de Sangue –1 PE, DT +1 e +1 dado de dano." : "Cajado empunhado. Os poderes de conjurador pedem um ocultista que conheça um ritual de Sangue."));
      } });
    }
    if (id === A7().ID_PE) {
      l.push({ rotulo: d.vestida ? "Tirar o Pé de Coelho" : "Vestir o Pé de Coelho", aoClicar: function () {
        if (!item.ordem) item.ordem = {};
        if (d.vestida) delete item.ordem.vestida; else item.ordem.vestida = true;
        feito("");
      } });
      if (d.vestida) l.push({ rotulo: s.ativadoCena === cena ? "Pé de Coelho: ativo nesta cena" : "Esfregar e soprar (movimento, uma vez por cena)", aoClicar: function () {
        var r = A7().peAtivar(item, cena);
        if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
        feito("Pé de Coelho: +1d4 em todos os testes até o fim da cena. d4 ímpar num teste: acidente no pé (outro 1d4 de PV).");
      } });
    }
    if (id === A7().ID_SAL && (s.usados || 0) < 3) {
      ["linha", "circulo"].forEach(function (forma) {
        l.push({ rotulo: forma === "linha" ? "Fazer uma linha (porta ou janela, 1 de 3 usos)…" : "Fazer um círculo (esvazia o saleiro)…", aoClicar: function () {
          var c = campoTexto("Onde", "", 120);
          UI.modal({ titulo: "Sal Dourado", conteudo: [c.no, linha("Criatura de Sangue com VD 80 ou menos que tente cruzar faz Vontade (DT 20): passando, frustrada até o fim da cena, mas cruza; falhando, frustrada e não atravessa até o fim da cena.")],
            botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Fazer", classe: "r-botao--principal", aoClicar: function (fechar) {
              var r = A7().salUsar(item, forma, c.valor(), cena);
              if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
              fechar(); feito(r.vazio ? "Sal Dourado: o saleiro esvaziou." : "Sal Dourado: linha feita.");
            } }] });
        } });
      });
    }
    if (id === A7().ID_TERCO) {
      if (!s.preso && !s.fim) l.push({ rotulo: "Vestir (herda a súplica)…", aoClicar: function () {
        var c = campoTexto("A súplica (definida pelo mestre)", "", 300);
        UI.modal({ titulo: "Terço Maculado", conteudo: [c.no, linha("Vestido, não sai mais enquanto você viver.")],
          botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Vestir", classe: "r-botao--principal", aoClicar: function (fechar) {
            var r = A7().tercoVestir(item, c.valor());
            if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
            fechar(); feito("Terço Maculado vestido. Súplica: " + c.valor());
          } }] });
      } });
      if (A7().tercoAtivo(item)) {
        l.push({ rotulo: "Tentar tirar (falha e perde 2d10 PV)", aoClicar: function () { perdaDoTerco(ctx, "Tentou tirar o terço: falha automática."); } });
        l.push({ rotulo: "Agiu contra a súplica (o mestre decide: 2d10 PV)", aoClicar: function () { perdaDoTerco(ctx, "Agiu diretamente contra a súplica."); } });
        l.push({ rotulo: "Outra pessoa decepou a parte do corpo", aoClicar: function () { var r = A7().tercoEncerrar(item, "decepado"); if (r.ok) feito("O terço saiu com a parte decepada."); } });
        l.push({ rotulo: "A súplica foi cumprida", aoClicar: function () { var r = A7().tercoEncerrar(item, "cumprido"); if (r.ok) feito("Súplica cumprida: o terço virou um item mundano, sem efeito paranormal."); } });
      }
    }
    return l;
  }
  function perdaDoTerco(ctx, motivo) {
    var p = rolarSoma("2d10");
    if (!p) return;
    var d = danoEmMim(ctx, p.total);
    salvar(ctx);
    mostrar(p, "Terço Maculado · perda de PV", [motivo + (d ? " PV " + d.antes + " → " + d.depois + "." : "")]);
  }

  function observacoesDoItem(ctx, item) {
    if (!A7() || !item) return [];
    var d = dadosDoItem(item);
    var s = d.as7 || {};
    var o = ordemDe(ctx);
    var l = [];
    var id = item.origemCatalogoId;
    if (id === A7().ID_CARRANCA && (s.guiadas || []).length) {
      var g = s.guiadas.filter(function (x) { return !x.terminado; })[0];
      if (g) l.push(["Guiando", g.criatura + " (10 minutos)"]);
      var usadas = s.guiadas.filter(function (x) { return x.terminado; }).map(function (x) { return x.criatura; });
      if (usadas.length) l.push(["Não guia mais até", usadas.join(", ")]);
    }
    if (id === A7().ID_CAJADO) l.push(["Conjurador", A7().cajadoAtivo(o, ctx.ficha.inventario, rituaisDaFicha(ctx)) ? "Ativo: rituais de Sangue –1 PE, DT +1, +1 dado de dano." : (d.empunhada ? "Empunhado, mas só vale para um ocultista que conheça um ritual de Sangue." : "Guardado.")]);
    if (id === A7().ID_PE && s.ativadoCena === A7().cenaDe(o) && d.vestida) l.push(["Nesta cena", "+1d4 em todos os testes; d4 ímpar: 1d4 de PV."]);
    if (id === A7().ID_SAL) {
      l.push(["Usos", (3 - (s.usados || 0)) + " de 3" + ((s.usados || 0) >= 3 ? " (vazio)" : "")]);
      (s.barreiras || []).slice(-3).forEach(function (b) { l.push([b.forma === "circulo" ? "Círculo" : "Linha", b.local || "—"]); });
    }
    if (id === A7().ID_TERCO) {
      if (s.suplica) l.push(["Súplica", s.suplica]);
      if (s.fim) l.push(["Encerrado", s.fim === "cumprido" ? "súplica cumprida: item mundano" : "decepado"]);
    }
    return l;
  }

  /* =================================================================
     PROGRESSÃO: exposição em dobro
     ================================================================= */

  function painelDeProgressao(ctx) {
    if (!A7()) return null;
    var o = ordemDe(ctx);
    if (!(OP() && OP().ligada(o, "nexExperiencia"))) return null;
    var tr = o.trilha ? C().trilha(o.trilha) : null;
    if (!tr || !tr.exposicaoEmDobro) return null;
    permitidoGlobal = permitido(ctx);
    var dobro = A7().exposicaoEmDobro(o);
    return UI.painel("Exposição ao paranormal", bloco([
      linha("NEX de exposição: " + (o.nex || 0) + "%. " + (dobro ? "Monstruoso (AS7): cada exposição conta em dobro." : "A trilha não serve à classe agora: a exposição conta normal.")),
      el("div.faixa", {}, Object.keys(A7().EXPOSICOES).map(function (t) {
        var v = A7().EXPOSICOES[t] * (dobro ? 2 : 1);
        return botao(t.charAt(0).toUpperCase() + t.slice(1) + " (+" + v + "%)", function () {
          var r = A7().registrarExposicao(o, novoOp("ex"), t);
          if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
          salvar(ctx);
          UI.aviso("Exposição " + t + ": NEX " + r.antes + "% → " + r.depois + "%" + (r.dobro ? " (em dobro)" : "") + ".");
        });
      })),
    ]));
  }

  global.RAMAFichaArquivo7 = {
    controles: controles,
    controlesDeOrigem: controlesDeOrigem,
    acoesNoTeste: acoesNoTeste,
    modificadoresDoTeste: modificadoresDoTeste,
    depoisDoTeste: depoisDoTeste,
    danoExtraDoAtaque: danoExtraDoAtaque,
    condicoes: condicoes,
    botoesDeCondicoes: botoesDeCondicoes,
    alertasDoResumo: alertasDoResumo,
    aoTrocarDeCena: aoTrocarDeCena,
    painelDeRituais: painelDeRituais,
    ajusteDoRitual: ajusteDoRitual,
    opcoesNoRitual: opcoesNoRitual,
    aplicarNoRitual: aplicarNoRitual,
    dtExtraDoRitual: dtExtraDoRitual,
    expressaoDoDano: expressaoDoDano,
    opcoesDoItem: opcoesDoItem,
    observacoesDoItem: observacoesDoItem,
    painelDeProgressao: painelDeProgressao,
    perderSan: perderSan,
  };
})(window);
