/* =====================================================================
   R.A.M.A. — aba Covil da campanha de Malditos Goblins (v6.0)
   ---------------------------------------------------------------------
   A ferramenta de toda campanha de Malditos Goblins. O mestre conduz;
   os jogadores veem a VISTA (sem notas, sem o que está oculto).

     Regras e tempo  as regras opcionais e adaptações da campanha (o
                     mestre aplica nas fichas), o dia (descanso para
                     todos)
     Combate         participantes (goblins, inimigos do livro com os
                     números exatos — null é "não tem", proteção à
                     parte —, aliados como o esqueleto animado), ordem
                     manual e surpresa (p. 15), a vez, ataques dos
                     inimigos com o alvo e a reação, ferimentos,
                     bloqueio, efeitos, ações demoradas, Combate
                     Sincronizado, Tempestade
     Sorteios        todas as tabelas do livro; cada sorteio guardado
                     com dados e página, e um encontro vira participantes
     Masmorra, Bando Rival, Negociação, Sem mestre, Notas, Registro

   Cada ação: cópia do estado → regra (js/goblins/mesa.js) →
   salvar_goblins (rev + opId) → momentos nas fichas (goblins_operar,
   opId próprio).
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil, UI = global.RAMAUI, el = U.el;
  function C() { return global.RAMAGoblinsCatalogo; }
  function D() { return global.RAMAGoblinsDados; }
  function MS() { return global.RAMAGoblinsMesa; }
  function T() { return global.RAMAGoblinsTela; }

  function opId(p) { return (p || "gb") + "-" + U.uuid().replace(/-/g, "").slice(0, 24); }
  function rolador(f) { return global.RAMADados.rolar("1d" + f).rolagens[0]; }
  function mini(texto, aoClicar, op) { var x = op || {}; return el("button.r-botao.r-botao--mini" + (x.classe ? "." + x.classe : ""), { type: "button", texto: texto, disabled: !!x.desligado, title: x.dica || "", "aria-label": x.rotulo || null, onclick: aoClicar }); }
  function linha(t) { return el("p.t-mini", { texto: t }); }
  function campo(rotulo, valor, op) { return UI.campo(Object.assign({ rotulo: rotulo, valor: valor === undefined ? "" : valor }, op || {})); }
  function selecao(rotulo, opcoes, valor, aoMudar) { return UI.campo({ rotulo: rotulo, tipo: "selecao", valor: valor, opcoes: opcoes, aoMudar: aoMudar }); }
  function marca(rotulo, marcado, aoMudar) { return el("label.r-marca", {}, [el("input", { type: "checkbox", checked: !!marcado, onchange: function (ev) { aoMudar(ev.currentTarget.checked); } }), el("span", { texto: rotulo })]); }
  function num(v) { return v === null || v === undefined ? "—" : String(v); }

  function aba(ctx) {
    var alvo = el("div.pilha.gob-covil", {}, [UI.carregando("Abrindo o Covil")]);
    var mem = { estado: null, vista: null, mestre: ctx.ehMestre(), rev: 0, ocupado: false, personagens: [] };

    async function carregar(segundoPlano) {
      var r = await global.RAMAApi.lerGoblins(ctx.campanhaId, { segundoPlano: !!segundoPlano });
      if (!r.ok) { if (!segundoPlano) U.trocar(alvo, UI.erroDeTela(r, function () { carregar(); })); return; }
      receber(r);
      pintar();
    }
    function receber(r) {
      mem.rev = U.inteiro(r.rev, 0);
      mem.mestre = !!(r.dados && r.dados.mestre);
      mem.estado = mem.mestre ? MS().normalizar(r.dados.estado) : null;
      mem.vista = mem.mestre ? null : r.dados.vista;
      if (r.dados && Array.isArray(r.dados.personagens)) mem.personagens = r.dados.personagens;
    }
    if (ctx.aoAtualizar) {
      ctx.aoAtualizar("covil", function () { if (!mem.ocupado) carregar(true); });
      ctx.aoAtualizar("personagens", function () { if (!mem.ocupado) carregar(true); });
    }

    function pc(id) { return mem.personagens.filter(function (p) { return p.id === id; })[0]; }
    function nomeDoPC(id) { var p = pc(id); return p ? p.nome : "—"; }

    /* Uma ação no Covil: cópia → regra → gravação → momentos. */
    async function operar(fn, opcoes) {
      if (mem.ocupado) return false;
      var o = opcoes || {};
      var copia = MS().normalizar(U.copiar(mem.estado));
      var r = fn(copia) || { ok: true };
      if (r.ok === false) { UI.avisoAtencao(r.motivo || "Não deu para aplicar."); return false; }
      mem.ocupado = true;
      var id = opId("gc");
      try {
        var g = await global.RAMAApi.salvarGoblins(ctx.campanhaId, mem.rev, id, copia);
        if (!g.ok) {
          if (g.erro === "conflito" && g.dados) { receber(g); pintar(); UI.avisoAtencao("O Covil mudou em outra janela (um ataque de jogador, talvez). A tela foi atualizada: confira e refaça."); return false; }
          UI.avisoDeFalha(g, "gravação do Covil");
          return false;
        }
        receber(g);
        var momentos = (r.eventos || []).filter(function (e) { return e.tipo === "momento"; }).map(function (e) { return { tipo: e.momento, personagemId: e.personagemId || "" }; });
        if (o.momentos) momentos = momentos.concat(o.momentos);
        if (momentos.length && mem.personagens.length) await operarFichas({ tipo: "momentos", momentos: momentos });
        narrarMesa(r.eventos || []);
        pintar();
        return r;
      } finally { mem.ocupado = false; }
    }

    async function operarFichas(operacao) {
      var r = await global.RAMAApi.goblinsOperar(ctx.campanhaId, opId("go"), operacao);
      if (!r.ok) { UI.avisoDeFalha(r, "aplicar nas fichas"); return r; }
      var evs = (r.dados && r.dados.eventos) || [];
      var frases = evs.map(function (e) { var f = T().narrar([e], { silencioso: true })[0]; return f ? nomeDoPC(e.personagem) + ": " + f : ""; }).filter(Boolean);
      if (frases.length) UI.aviso(frases.slice(0, 4).join(" · ") + (frases.length > 4 ? " …" : ""), { duracao: 10000 });
      if (r.dados && r.dados.gravadas && ctx.sincronizarAgora) ctx.sincronizarAgora();
      await carregar(true);
      return r;
    }

    function narrarMesa(eventos) {
      var f = eventos.map(function (e) {
        if (e.tipo === "derrotado") return e.participante + " foi derrotado (quem derrotou rola a progressão)";
        if (e.tipo === "regeneracao") return e.participante + " regenerou " + e.valor;
        if (e.tipo === "acaoDemorada") return e.nome + (e.ferimentos ? ": " + e.ferimentos + " ferimento(s) em todos em volta" : "") + (e.acao === "uivo" ? ": outro lobo apareceu" : "");
        if (e.tipo === "dispensado") return e.participante + " voltou a ser só ossos";
        if (e.tipo === "porTurno") return e.participante + ": " + e.nome + " (" + e.ferimentos + ")";
        if (e.tipo === "efeitoExpirou") return e.participante + ": " + e.nome + " acabou";
        return "";
      }).filter(Boolean);
      if (f.length) UI.aviso(f.slice(0, 4).join(" · "), { tipo: eventos.some(function (e) { return e.tipo === "derrotado" || e.tipo === "acaoDemorada"; }) ? "atencao" : "info", duracao: 9000 });
    }

    function pintar() {
      var y = global.scrollY;
      U.trocar(alvo, mem.mestre ? vistaDoMestre(mem.estado) : vistaDoJogador(mem.vista));
      if (alvo.isConnected) global.scrollTo(0, y);
    }

    /* =================================================================
       JOGADOR
       ================================================================= */
    function vistaDoJogador(v) {
      if (!v) return linha("O Covil ainda não abriu.");
      var vez = v.combate.ativo ? v.combate.participantes.filter(function (p) { return p.id === v.combate.ordem[v.combate.vez]; })[0] : null;
      return el("div.pilha", {}, [
        UI.painel("Covil", [el("p", { texto: "Dia " + v.dia + (v.combate.ativo ? " · combate, rodada " + v.combate.rodada + (vez ? " · vez de " + vez.nome : "") : "") }), regrasLigadas(v.regras)]),
        v.combate.participantes.length ? UI.painel("Combate", [listaDeParticipantes(v, false)]) : null,
        v.sorteios.length ? UI.painel("Sorteios", [listaDeSorteios(v, false)]) : null,
        v.masmorras.length ? UI.painel("Masmorras", v.masmorras.map(function (m) { return masmorra(m, false); })) : null,
        v.registro.length ? UI.painel("Registro", [registro(v)]) : null,
        linha("Ataques e magias contra os inimigos daqui saem da sua ficha (escolha o alvo no Covil): o servidor rola e aplica."),
      ]);
    }

    function regrasLigadas(rg) {
      var l = [];
      if (rg.vozGoblin) l.push("Voz Goblin"); if (rg.deuRuim) l.push("Mas deu ruim…"); if (rg.niveisEpicos) l.push("Níveis Épicos"); if (rg.explosoesManuais) l.push("explosões uma a uma");
      Object.keys(rg.adaptacoes).forEach(function (k) { if (rg.adaptacoes[k]) l.push(C().ADAPTACOES[k].nome); });
      return linha(l.length ? "Regras da campanha: " + l.join(", ") + "." : "Só as regras básicas.");
    }

    /* =================================================================
       MESTRE
       ================================================================= */
    function vistaDoMestre(e) {
      return el("div.pilha", {}, [
        painelRegras(e),
        painelCombate(e),
        painelSorteios(e),
        painelMasmorra(e),
        painelRival(e),
        painelNegociacao(e),
        UI.painel("Notas do mestre", [notas(e)]),
        e.registro.length ? UI.recolhivel({ titulo: "Registro (" + e.registro.length + ")", conteudo: [registro(e)] }) : null,
      ]);
    }

    function painelRegras(e) {
      var rg = U.copiar(e.regras);
      return UI.painel("Regras e tempo", [
        el("p", { texto: "Dia " + e.dia }),
        el("div.faixa", {}, [
          mini("Novo dia (todos descansam)", function () { operar(function (x) { return MS().novoDia(x); }); }, { dica: "−1 ferimento em cada goblin, usos do dia de volta (p. 5)" }),
          mini("Novo dia sem descanso", function () { operar(function (x) { MS().novoDia(x); return { ok: true, eventos: [] }; }, { momentos: [{ tipo: "novoDia", descansou: false }] }); }, { classe: "r-botao--fantasma" }),
          T().regra("ferimentos"),
        ]),
        el("fieldset.gob-flags", {}, [el("legend", { texto: "Regras opcionais e adaptações da campanha" }),
          marca("Voz Goblin", rg.vozGoblin, function (v) { rg.vozGoblin = v; }), marca("Mas deu ruim…", rg.deuRuim, function (v) { rg.deuRuim = v; }),
          marca("Níveis Épicos", rg.niveisEpicos, function (v) { rg.niveisEpicos = v; }), marca("Explosões uma a uma", rg.explosoesManuais, function (v) { rg.explosoesManuais = v; }),
        ].concat(Object.keys(C().ADAPTACOES).map(function (k) { return marca(C().ADAPTACOES[k].nome, rg.adaptacoes[k], function (v) { rg.adaptacoes[k] = v; }); }))),
        el("div.faixa", {}, [
          mini("Salvar e aplicar às fichas", function () { operar(function (x) { x.regras = rg; MS().registrar(x, "Regras da campanha atualizadas"); return { ok: true }; }).then(function (r) { if (r) operarFichas({ tipo: "regras", regras: rg }); }); }),
          linha("Desligar não apaga os dados de nenhuma adaptação nas fichas."),
        ]),
      ]);
    }

    /* ---------------- combate ---------------- */
    function painelCombate(e) {
      var cb = e.combate;
      var ad = e.regras.adaptacoes;
      var inimigos = Object.keys(C().INIMIGOS).filter(function (k) { var d = C().INIMIGOS[k]; return !d.adaptacao || ad[d.adaptacao]; });
      var escolha = selecao("Inimigo do livro", inimigos.map(function (k) { var d = C().INIMIGOS[k]; return { valor: k, rotulo: d.nome + " (p. " + d.pagina + ")" }; }), inimigos[0]);
      var qtd = campo("Quantos", 1, { tipo: "numero" });
      var oculto = false;
      var fora = mem.personagens.filter(function (p) { return !cb.participantes.some(function (x) { return x.personagemId === p.id; }); });
      var vez = MS().vezAtual(e);
      return UI.painel("Combate", [
        el("p", { texto: cb.ativo ? "Rodada " + cb.rodada + (vez ? " · vez de " + vez.nome : "") + (cb.surpresa === "goblins" ? " · os goblins surpreenderam" : cb.surpresa === "inimigos" ? " · os inimigos agiram primeiro" : "") : "Nenhum combate em curso." }),
        el("div.faixa", {}, cb.ativo ? [
          mini("Próxima vez", function () { operar(function (x) { return MS().proximaVez(x, rolador); }); }),
          mini("Encerrar combate", function () { operar(function (x) { return MS().encerrarCombate(x); }); }, { classe: "r-botao--fantasma" }),
          mini("Tirar os derrotados", function () { operar(function (x) { return MS().limparDerrotados(x); }); }, { classe: "r-botao--fantasma" }),
        ] : [
          mini("Começar: os goblins surpreenderam", function () { operar(function (x) { return MS().iniciarCombate(x, "goblins"); }); }, { dica: "Goblins agem primeiro (e escolhem a ordem entre si)" }),
          mini("Começar: esbarraram nos inimigos", function () { operar(function (x) { return MS().iniciarCombate(x, "inimigos"); }); }, { dica: "Inimigos agem primeiro" }),
          mini("Começar na ordem da lista", function () { operar(function (x) { return MS().iniciarCombate(x, ""); }); }, { classe: "r-botao--fantasma" }),
          T().regra("combate"),
        ]),
        cb.participantes.length ? listaDeParticipantes(e, true) : linha("Ninguém no combate."),
        el("div.faixa.gob-covil__adicionar", {}, [escolha, qtd, marca("Oculto dos jogadores", false, function (v) { oculto = v; }), mini("Pôr no combate", function () { var k = escolha.entrada.value, q = U.inteiro(qtd.entrada.value, 1); operar(function (x) { return MS().adicionarInimigos(x, k, q, { oculto: oculto }); }); })]),
        fora.length ? el("div.faixa", {}, [el("span.t-mini", { texto: "Goblins da campanha: " })].concat(fora.map(function (p) { return mini("+ " + p.nome, function () { operar(function (x) { return MS().adicionarPC(x, p); }); }); })).concat([fora.length > 1 ? mini("Todos", function () { operar(function (x) { fora.forEach(function (p) { MS().adicionarPC(x, p); }); return { ok: true }; }); }) : null])) : null,
        el("div.faixa", {}, [
          mini("Esqueleto animado (2 turnos)", function () { operar(function (x) { return MS().adicionarInimigos(x, "esqueletoHumano", 1, { lado: "goblins", turnos: 2 }); }); }, { dica: "Magia Morte, 1 hit (p. 11)" }),
          mini("Esqueleto animado (até o fim da batalha)", function () { operar(function (x) { return MS().adicionarInimigos(x, "esqueletoHumano", 1, { lado: "goblins", ateFimDaBatalha: true }); }); }, { dica: "Magia Morte, 2 hits (p. 11)" }),
          mini("Galinha Explosiva (2 rodadas)", function () { operar(function (x) { return MS().acaoDemorada(x, { nome: "Galinha Explosiva", turnos: 2, ferimentos: 3, tipo: "galinha", fonte: "p. 13" }); }); }),
          mini("Tempestade (Relâmpago 3+)", function () { operar(function (x) { return MS().efeitoDaMesa(x, { chave: "tempestade", nome: "Tempestade de relâmpagos (até o fim da batalha)", ate: "fimDaBatalha" }); }); }),
          cb.efeitosDaMesa.length ? mini("Sortear quem o raio pega", function () { var p = MS().participanteAleatorio(e, rolador); UI.aviso(p ? "O raio cai em " + p.nome + ". (O livro não diz o dano: a mesa decide.)" : "Ninguém de pé.", { duracao: 9000 }); }) : null,
        ]),
        cb.acoes.length ? el("ul.gob-lista", {}, cb.acoes.map(function (a) { return el("li", { texto: a.nome + ": em " + a.turnos + " rodada(s)" + (a.ferimentos ? " (" + a.ferimentos + " ferimentos em volta)" : "") }); })) : null,
        cb.efeitosDaMesa.length ? el("ul.gob-lista", {}, cb.efeitosDaMesa.map(function (x) { return el("li", {}, [el("span", { texto: x.nome + " " }), mini("Encerrar", function () { operar(function (y) { y.combate.efeitosDaMesa = y.combate.efeitosDaMesa.filter(function (z) { return z.id !== x.id; }); return { ok: true }; }); })]); })) : null,
      ], { acoes: [T().regra("ataque"), T().regra("bloqueio")] });
    }

    function listaDeParticipantes(e, mestre) {
      var cb = e.combate;
      return el("ol.gob-participantes", {}, cb.ordem.map(function (id, i) {
        var p = e.combate.participantes.filter(function (x) { return x.id === id; })[0];
        if (!p) return null;
        var resumo = p.tipo === "pc" && pc(p.personagemId) ? pc(p.personagemId).resumo : null;
        var atr = resumo ? resumo.atributos : p;
        var fer = resumo ? resumo.ferimentos : p.ferimentos;
        var vit = atr.vitalidade;
        var stats = p.indescritivel ? "Com ? · Noç ? · Hab ? · Vit ? — “alguma coisa acontece…”" : "Com " + num(atr.combate) + (p.bonusCombate ? " (+" + p.bonusCombate + ")" : "") + " · Noç " + num(atr.nocao) + " · Hab " + num(atr.habilidade) + " · Vit " + num(vit) + (p.protecao ? " (proteção " + p.protecao.atual + "/" + p.protecao.original + ")" : "");
        var def = C().INIMIGOS[p.chave];
        var atual = cb.ativo && i === cb.vez;
        return el("li.gob-participante", { class: [atual ? "gob-participante--vez" : "", p.derrotado ? "gob-item--fora" : "", p.lado === "goblins" ? "gob-participante--goblin" : ""].join(" ") }, [
          el("div.gob-participante__topo", {}, [
            el("strong", { texto: (atual ? "▶ " : "") + p.nome }),
            p.tipo === "pc" ? el("span.r-etiqueta", { texto: "goblin" }) : p.lado === "goblins" ? el("span.r-etiqueta", { texto: "aliado" }) : null,
            p.oculto ? el("span.r-etiqueta", { texto: "oculto" }) : null,
            p.derrotado ? el("span.r-etiqueta.r-etiqueta--aviso", { texto: "derrotado" }) : null,
            resumo && resumo.situacao !== "ativo" ? el("span.r-etiqueta.r-etiqueta--aviso", { texto: global.RAMAGoblins.SITUACOES[resumo.situacao] }) : null,
            def ? T().fonte(def.pagina) : null,
          ]),
          el("p.t-mini", { texto: stats + " · ferimentos " + fer + (vit !== null && vit !== undefined ? "/" + vit : "") + (p.turnosRestantes !== null ? " · " + p.turnosRestantes + " turno(s) restante(s)" : "") }),
          def && def.habilidades ? el("p.t-mini", { texto: def.habilidades.map(function (h) { return h.nome + ": " + h.texto; }).join(" · ") }) : null,
          def && def.nota ? el("p.t-mini", { texto: def.nota }) : null,
          p.nota ? el("p.t-mini", { texto: p.nota }) : null,
          p.efeitos.length ? el("p.t-mini", { texto: "Efeitos: " + p.efeitos.map(function (x) { return x.nome + (x.ate === "turnos" ? " (" + x.turnos + ")" : ""); }).join(", ") }) : null,
          resumo && resumo.efeitos && resumo.efeitos.length ? el("p.t-mini", { texto: "Na ficha: " + resumo.efeitos.map(function (x) { return x.nome; }).join(", ") }) : null,
          mestre ? acoesDoParticipante(e, p) : null,
        ]);
      }));
    }

    function acoesDoParticipante(e, p) {
      var a = [];
      a.push(mini("↑", function () { operar(function (x) { return MS().moverNaOrdem(x, p.id, -1); }); }, { rotulo: "Subir " + p.nome + " na ordem" }));
      a.push(mini("↓", function () { operar(function (x) { return MS().moverNaOrdem(x, p.id, 1); }); }, { rotulo: "Descer " + p.nome + " na ordem" }));
      if (p.tipo === "pc") {
        a.push(mini("Ataque nele", function () { danoEmPC(p.personagemId, null, ""); }));
        a.push(mini("Curar", function () { curarPC(p.personagemId); }));
        a.push(mini("Efeito", function () { efeitoEmPCs([p.personagemId]); }));
        a.push(mini("Derrotou um oponente", function () { operarFichas({ tipo: "progressao", personagem: p.personagemId, oponente: "" }).then(function (r) { if (r && r.ok) UI.aviso("Progressão: " + (r.dados.resultado.dados || []).join("") + (r.dados.resultado.subiu ? " — subiu de nível!" : "")); }); }));
        a.push(mini("Fim do turno dele", function () { operarFichas({ tipo: "momentos", momentos: [{ tipo: "fimDoTurno", personagemId: p.personagemId }] }); }, { classe: "r-botao--fantasma" }));
      } else {
        a.push(mini("Atacar", function () { ataqueDeParticipante(e, p); }, { desligado: p.indescritivel || p.combate === null || p.derrotado }));
        a.push(mini("Esquivar", function () { rolarParticipante(p, { tipo: "esquiva" }); }, { desligado: p.combate === null || p.derrotado }));
        a.push(mini("Teste", function () { testeDeParticipante(p); }, { desligado: p.indescritivel }));
        a.push(mini("Ferir", function () { ferirParticipante(p); }));
        a.push(mini("Curar", function () { operar(function (x) { return MS().curarParticipante(x, p.id, "todos"); }); }, { classe: "r-botao--fantasma" }));
        a.push(mini("Efeito", function () { efeitoEmParticipante(p); }));
        a.push(mini("Sincronizado", function () { operar(function (x) { return MS().combateSincronizado(x, p.id); }); }, { dica: C().MANOBRAS.sincronizado.texto }));
        var def = C().INIMIGOS[p.chave];
        if (def && (def.habilidades || []).some(function (h) { return h.uivo; })) a.push(mini("Uivar", function () { operar(function (x) { return MS().acaoDemorada(x, { nome: "Uivo de " + p.nome + ": outro lobo", turnos: 2, tipo: "uivo", inimigo: p.chave }); }); }));
      }
      p.efeitos.forEach(function (ef) { a.push(mini("× " + ef.nome, function () { operar(function (x) { return MS().removerEfeitoDeParticipante(x, p.id, ef.id); }); }, { classe: "r-botao--fantasma", rotulo: "Encerrar " + ef.nome })); });
      a.push(mini("Tirar", function () { operar(function (x) { return MS().removerParticipante(x, p.id); }); }, { classe: "r-botao--fantasma" }));
      return el("div.faixa.gob-participante__acoes", {}, a);
    }

    /* O inimigo ataca: rola aqui (mestre); o alvo é escolhido depois, e
       um goblin de jogador recebe pela ficha (com reação). */
    function ataqueDeParticipante(e, p) {
      var def = C().INIMIGOS[p.chave] || {};
      var hab = (def.habilidades || []);
      var tipos = [{ valor: "", rotulo: "Ataque comum" }];
      if (hab.some(function (h) { return h.teia; })) tipos.push({ valor: "teia", rotulo: "Teia (à distância; paralisa 1d6 turnos, sem ferimento)" });
      if (hab.some(function (h) { return h.baforada; })) tipos.push({ valor: "baforada", rotulo: "Baforada (todos são alvo; fogo)" });
      var tipo = selecao("Tipo", tipos, "");
      var dif = selecao("Dificuldade", [{ valor: "", rotulo: "Normal" }, { valor: "facil", rotulo: "Fácil (+1)" }, { valor: "dificil", rotulo: "Difícil (−1)" }], "");
      var m = MS().paradaDeInimigo(e, p.id, {});
      UI.modal({ titulo: "Ataque de " + p.nome, conteudo: [tipo, dif, linha(m.ok ? m.parada + " dado(s): " + T().composicaoTexto(m.composicao) : m.motivo)], botoes: [{ rotulo: "Rolar", classe: "r-botao--principal", aoClicar: function (f) {
        var t = tipo.entrada.value, d = dif.entrada.value;
        f();
        operar(function (x) { var r = MS().rolarPorParticipante(x, p.id, { dificuldade: d, rotulo: t === "teia" ? "Teia" : t === "baforada" ? "Baforada" : "" }, rolador); if (r.ok) mem.ultima = r.rolagem; return r; }).then(function (r) {
          if (!r || !r.rolagem) return;
          T().mostrarRolagem(r.rolagem);
          destinoDoAtaque(p, r.rolagem.classificacao.hits, t, def);
        });
      } }] });
    }

    function destinoDoAtaque(p, hits, tipo, def) {
      var e = mem.estado;
      var pcs = e.combate.participantes.filter(function (x) { return x.tipo === "pc"; });
      var outros = e.combate.participantes.filter(function (x) { return x.tipo !== "pc" && x.id !== p.id && !x.derrotado; });
      var opcoes = pcs.map(function (x) { return { valor: "pc:" + x.personagemId, rotulo: x.nome + " (goblin)" }; }).concat(outros.map(function (x) { return { valor: "pa:" + x.id, rotulo: x.nome }; }));
      if (!opcoes.length) { UI.aviso(hits + " hit(s). Ninguém para receber."); return; }
      var alvo = selecao("Em quem", opcoes, opcoes[0].valor);
      var fogo = tipo === "baforada";
      UI.modal({ titulo: p.nome + ": " + hits + " hit(s)" + (tipo === "teia" ? " (Teia)" : ""), conteudo: [alvo, tipo === "baforada" ? linha("Baforada: todos são alvo. Aplique em cada um (fogo).") : null, tipo === "teia" ? linha("Teia: se acertou (1+ hit), paralisa por 1d6 turnos, sem ferimento.") : null, def.etereo ? linha("Etéreo: ignora a proteção do goblin.") : null], botoes: [{ rotulo: "Aplicar", classe: "r-botao--principal", aoClicar: function (f) {
        var v = alvo.entrada.value;
        f();
        if (tipo === "teia") {
          if (hits < 1) { UI.aviso("A teia errou."); return; }
          var q = D().quantidade("1d6", rolador);
          var ef = { chave: "teia", nome: "Paralisado pela teia (" + q.total + " turno(s))", ate: "turnos", turnos: q.total, semAgir: true, fonte: p.nome };
          if (v.indexOf("pc:") === 0) operarFichas({ tipo: "efeito", personagens: [v.slice(3)], efeito: ef });
          else operar(function (x) { return MS().efeitoEmParticipante(x, v.slice(3), ef); });
          return;
        }
        if (v.indexOf("pc:") === 0) danoEmPC(v.slice(3), hits, p.nome, { fogo: fogo, etereo: !!def.etereo, mordida: (def.habilidades || []).some(function (h) { return h.mordida; }) ? p.id : "" });
        else ferirParticipante(mem.estado.combate.participantes.filter(function (x) { return x.id === v.slice(3); })[0], hits, { fogo: fogo });
      } }] });
    }

    function rolarParticipante(p, pedido) {
      operar(function (x) { return MS().rolarPorParticipante(x, p.id, pedido, rolador); }).then(function (r) { if (r && r.rolagem) T().mostrarRolagem(r.rolagem); });
    }

    function testeDeParticipante(p) {
      var at = selecao("Atributo", [{ valor: "habilidade", rotulo: "Habilidade" }, { valor: "nocao", rotulo: "Noção" }], "habilidade");
      UI.modal({ titulo: "Teste de " + p.nome, conteudo: [at], botoes: [{ rotulo: "Rolar", classe: "r-botao--principal", aoClicar: function (f) { var a = at.entrada.value; f(); rolarParticipante(p, { atributo: a, rotulo: "teste de " + (a === "nocao" ? "Noção" : "Habilidade") }); } }] });
    }

    function ferirParticipante(p, valor, tipo) {
      if (!p) return;
      var n = campo("Ferimentos", valor === undefined || valor === null ? 1 : valor, { tipo: "numero" });
      var t = Object.assign({ fogo: false, bloquear: false, automatico: 0 }, tipo || {});
      UI.modal({ titulo: "Ferir " + p.nome, conteudo: [n, marca("De fogo", t.fogo, function (v) { t.fogo = v; }), p.protecao && p.protecao.atual > 0 ? marca("Bloquear com a proteção (" + p.protecao.atual + ")", false, function (v) { t.bloquear = v; }) : null, linha("Proteção absorve até a durabilidade; Golem de Madeira dobra fogo; Dragão é imune.")], botoes: [{ rotulo: "Aplicar", classe: "r-botao--principal", aoClicar: function (f) { var v = U.inteiro(n.entrada.value, 0); f(); operar(function (x) { return MS().ferir(x, p.id, v, t); }); } }] });
    }

    function efeitoEmParticipante(p) {
      var nome = campo("Efeito", "");
      var ate = selecao("Dura", [{ valor: "turnos", rotulo: "Turnos" }, { valor: "fimDaBatalha", rotulo: "Até o fim da batalha" }, { valor: "proximoAtaque", rotulo: "Até o próximo ataque" }, { valor: "manual", rotulo: "Até encerrar" }], "turnos");
      var turnos = campo("Turnos", 1, { tipo: "numero" });
      var semAgir = false;
      UI.modal({ titulo: "Efeito em " + p.nome, conteudo: [nome, ate, turnos, marca("Não age (congelado, caído, paralisado)", false, function (v) { semAgir = v; })], botoes: [{ rotulo: "Aplicar", classe: "r-botao--principal", aoClicar: function (f) { var n = nome.entrada.value.trim(); if (!n) return; var d = { chave: "m-" + U.uuid().slice(0, 6), nome: n, ate: ate.entrada.value, turnos: U.inteiro(turnos.entrada.value, 1), semAgir: semAgir }; f(); operar(function (x) { return MS().efeitoEmParticipante(x, p.id, d); }); } }] });
    }

    /* Ataque num goblin de jogador: a reação é dele (esquiva rolada na
       ficha, bloqueio com a proteção, Sorte); o servidor aplica. */
    function danoEmPC(personagemId, hits, fonte, extra) {
      var x0 = extra || {};
      var r = pc(personagemId);
      var res = r && r.resumo;
      var acertos = campo("Hits do atacante", hits === null || hits === undefined ? 1 : hits, { tipo: "numero" });
      var origem = selecao("Ataque", [{ valor: "corporal", rotulo: "Corporal" }, { valor: "distancia", rotulo: "À distância" }], "corporal");
      var tipo = selecao("Tipo", [{ valor: "", rotulo: "Comum" }, { valor: "fogo", rotulo: "Fogo" }, { valor: "armaDeFogo", rotulo: "Arma de fogo" }, { valor: "etereo", rotulo: "Etéreo" }, { valor: "automatico", rotulo: "Automático" }], x0.fogo ? "fogo" : x0.etereo ? "etereo" : "");
      var esquiva = campo("Hits da esquiva (se ele se esquivou na ficha)", "", { tipo: "numero" });
      var prot = selecao("Bloquear com", [{ valor: "", rotulo: "— não bloqueia —" }].concat(((res && res.protecoes) || []).filter(function (p) { return p.atual > 0; }).map(function (p) { return { valor: p.id, rotulo: p.nome + " (" + p.atual + "/" + p.original + ")" }; })), "");
      UI.modal({ titulo: "Ataque em " + (r ? r.nome : "goblin"), conteudo: [acertos, origem, tipo, esquiva, prot, linha("A esquiva é rolada pelo jogador na ficha (Combate); o número de hits dela entra aqui. Sorte e Resistência são conferidas pela ficha.")], botoes: [{ rotulo: "Aplicar", classe: "r-botao--principal", aoClicar: function (f) {
        var t = tipo.entrada.value, esq = String(esquiva.entrada.value).trim();
        var oper = { tipo: "dano", personagem: personagemId, acertos: U.inteiro(acertos.entrada.value, 0), distancia: origem.entrada.value === "distancia", fogo: t === "fogo", armaDeFogo: t === "armaDeFogo", etereo: t === "etereo", automatico: t === "automatico", fonte: fonte || "Mestre" };
        if (esq !== "") oper.esquiva = U.inteiro(esq, 0);
        if (prot.entrada.value) oper.protecaoId = prot.entrada.value;
        f();
        operarFichas(oper).then(function (rr) {
          if (rr && rr.ok && x0.mordida && rr.dados.resultado.recebidos > 0) operar(function (x) { return MS().curarParticipante(x, x0.mordida, "todos"); }).then(function () { UI.aviso("Mordida: o Vampiro removeu os próprios ferimentos."); });
        });
      } }] });
    }

    function curarPC(personagemId) {
      var v = selecao("Remover", [{ valor: "1", rotulo: "1 ferimento" }, { valor: "todos", rotulo: "Todos" }], "1");
      UI.modal({ titulo: "Curar " + nomeDoPC(personagemId), conteudo: [v], botoes: [{ rotulo: "Curar", classe: "r-botao--principal", aoClicar: function (f) { var x = v.entrada.value; f(); operarFichas({ tipo: "curar", personagem: personagemId, valor: x === "todos" ? "todos" : 1 }); } }] });
    }

    function efeitoEmPCs(ids) {
      var nome = campo("Efeito", "");
      var ate = selecao("Dura", [{ valor: "turnos", rotulo: "Turnos" }, { valor: "fimDaBatalha", rotulo: "Até o fim da batalha" }, { valor: "fimDoDia", rotulo: "Até o fim do dia" }, { valor: "manual", rotulo: "Até encerrar" }], "turnos");
      var turnos = campo("Turnos", 1, { tipo: "numero" });
      var semAgir = false;
      UI.modal({ titulo: "Efeito", conteudo: [nome, ate, turnos, marca("Não age", false, function (v) { semAgir = v; })], botoes: [{ rotulo: "Aplicar", classe: "r-botao--principal", aoClicar: function (f) { var n = nome.entrada.value.trim(); if (!n) return; f(); operarFichas({ tipo: "efeito", personagens: ids, efeito: { chave: "mestre-" + U.uuid().slice(0, 6), nome: n, ate: ate.entrada.value, turnos: U.inteiro(turnos.entrada.value, 1), semAgir: semAgir, fonte: "Mestre" } }); } }] });
    }

    /* ---------------- sorteios ---------------- */
    function painelSorteios(e) {
      var tabs = MS().tabelas();
      var ad = e.regras.adaptacoes;
      var ids = Object.keys(tabs).filter(function (k) { return !tabs[k].adaptacao || ad[tabs[k].adaptacao]; });
      var grupos = {};
      ids.forEach(function (k) { (grupos[tabs[k].grupo] = grupos[tabs[k].grupo] || []).push(k); });
      var sel = el("select.r-selecao", { id: "gob-tabela", "aria-label": "Tabela" }, Object.keys(grupos).map(function (g) { return el("optgroup", { label: g }, grupos[g].map(function (k) { return el("option", { value: k, texto: tabs[k].nome + " (" + tabs[k].dados + ", p. " + tabs[k].pagina + ")" }); })); }));
      var oculto = false;
      return UI.painel("Sorteios", [
        el("div.faixa", {}, [el("label", { for: "gob-tabela", texto: "Tabela " }), sel, marca("Oculto", false, function (v) { oculto = v; }), mini("Sortear", function () { var k = sel.value; operar(function (x) { return MS().sortear(x, k, opId("so"), rolador, { oculto: oculto }); }); })]),
        el("div.faixa", {}, [
          el("span.t-mini", { texto: "Sem mestre (p. 16): " }),
          mini("Aventura aleatória", function () { operar(function (x) { return MS().sortear(x, "aventura", opId("so"), rolador); }); }),
          mini("Inspiração", function () { operar(function (x) { return MS().sortear(x, "inspiracao", opId("so"), rolador); }); }),
          mini("Resposta do mestre", function () { operar(function (x) { return MS().sortear(x, "resposta", opId("so"), rolador); }); }),
          T().regra("semMestre"),
        ]),
        e.sorteios.length ? listaDeSorteios(e, true) : linha("Nenhum sorteio ainda."),
      ]);
    }

    function listaDeSorteios(e, mestre) {
      return el("ol.gob-sorteios", { reversed: true }, e.sorteios.slice().reverse().slice(0, 40).map(function (s) {
        var det = (s.detalhes || []).map(function (d) {
          if (d.inimigo && d.quantidade !== undefined) return d.quantidade + "× " + (C().INIMIGOS[d.inimigo] ? C().INIMIGOS[d.inimigo].nome : d.inimigo) + (d.expressao ? " (" + d.expressao + (d.dados && d.dados.length ? ": " + d.dados.join("+") : "") + ")" : "") + (d.rotulo && !d.nome ? " — " + d.rotulo : "") + (d.criancas ? ", " + d.criancas + " criança(s)" : "") + (d.extra ? " + " + d.extra.quantidade + "× " + C().INIMIGOS[d.extra.inimigo].nome : "");
          if (d.chance) return d.rotulo + ": " + (d.saiu ? "sim" : "não") + " (" + d.chance + ", " + d.dados.join("") + ")";
          if (d.quantidade !== undefined) return d.rotulo + ": " + d.quantidade + (d.dados && d.dados.length ? " (" + d.dados.join("+") + ")" : "");
          return d.rotulo + (d.texto ? ": " + d.texto : "");
        });
        var grupo = (s.detalhes || []).filter(function (d) { return d.inimigo && d.quantidade > 0 && C().INIMIGOS[d.inimigo]; });
        return el("li.gob-sorteio-item", {}, [
          el("strong", { texto: s.nome + ": " }), el("span", { texto: s.texto }),
          el("span.t-mini", { texto: " · dados " + s.dados.join(", ") + (s.pagina ? " · p. " + s.pagina : "") + (s.oculto ? " · oculto" : "") }),
          det.length ? el("ul.gob-lista.gob-lista--compacta", {}, det.map(function (t) { return el("li", { texto: t }); })) : null,
          mestre && grupo.length ? mini("Pôr no combate", function () { operar(function (x) { grupo.forEach(function (d) { MS().adicionarInimigos(x, d.inimigo, d.quantidade, { oculto: s.oculto }); if (d.extra && d.extra.quantidade) MS().adicionarInimigos(x, d.extra.inimigo, d.extra.quantidade, { oculto: s.oculto }); }); return { ok: true }; }); }) : null,
          mestre && s.oculto ? mini("Mostrar aos jogadores", function () { operar(function (x) { var y = x.sorteios.filter(function (z) { return z.id === s.id; })[0]; if (y) y.oculto = false; return { ok: true }; }); }, { classe: "r-botao--fantasma" }) : null,
        ]);
      }));
    }

    /* ---------------- masmorra ---------------- */
    function painelMasmorra(e) {
      var tipo = selecao("Tipo", [{ valor: "", rotulo: "Sortear (1d6)" }].concat(C().MASMORRA_TIPO_D6.map(function (k) { return { valor: k, rotulo: C().MASMORRAS[k].nome }; })), "");
      return UI.painel("Gerador de masmorra", [
        el("div.faixa", {}, [tipo, mini("Gerar", function () { var t = tipo.entrada.value; operar(function (x) { return MS().gerarMasmorra(x, opId("ms"), rolador, { tipo: t }); }); })]),
        linha("Cada segmento: 1d6 + quantos segmentos há entre ele e a entrada; cada porta abre um caminho. Nasce oculta para os jogadores."),
      ].concat(e.masmorras.slice().reverse().map(function (m) { return masmorra(m, true); })), { acoes: [T().regra("masmorra")] });
    }

    function masmorra(m, mestre) {
      var def = C().MASMORRAS[m.tipo];
      return el("div.gob-masmorra", {}, [
        el("h3.t-rotulo", { texto: m.nome + (m.dadosTipo && m.dadosTipo.length ? " (tipo: " + m.dadosTipo.join("") + ")" : "") + (m.oculto ? " · oculta" : "") }),
        el("p.t-mini", { texto: def.texto }),
        el("ol.gob-segmentos", {}, m.segmentos.map(function (s) {
          return el("li", { style: "--prof:" + s.profundidade, texto: s.id.toUpperCase() + " · " + s.nome + " (" + s.medida + ", " + (s.portas ? s.portas + " porta(s)" : "sem portas") + ") — " + s.dado + "+" + s.profundidade + "=" + s.indice + (s.pai ? " · sai de " + s.pai.toUpperCase() : " · entrada") + (s.conteudo ? " · " + s.conteudo.texto : "") });
        })),
        m.cortada ? linha("Parou em 40 segmentos (para não crescer sem fim); as portas restantes ficam para a mesa.") : null,
        mestre ? mini(m.oculto ? "Mostrar aos jogadores" : "Ocultar", function () { operar(function (x) { return MS().revelarMasmorra(x, m.id, m.oculto); }); }, { classe: "r-botao--fantasma" }) : null,
      ]);
    }

    /* ---------------- bando rival ---------------- */
    function painelRival(e) {
      return UI.painel("Bando Rival (p. 23)", [
        linha("Igual ao bando dos jogadores: cada goblin ganha um gêmeo rival com uma característica rival (2d6)."),
        mini("Gerar o Bando Rival", function () { operar(function (x) { return MS().gerarBandoRival(x, mem.personagens, opId("br"), rolador); }); }, { desligado: !mem.personagens.length }),
      ].concat(e.rivais.slice().reverse().slice(0, 4).map(function (b) {
        return el("div.gob-rival", {}, [
          el("ul.gob-lista", {}, b.membros.map(function (m) { return el("li", { texto: m.nome + " — " + (m.ocupacao || "") + " · Com " + num(m.atributos.combate) + (m.bonusCombate ? " (+" + m.bonusCombate + ")" : "") + " · Hab " + num(m.atributos.habilidade) + " · Noç " + num(m.atributos.nocao) + " · Vit " + num(m.atributos.vitalidade) + " · " + m.caracteristica.texto + " (" + m.caracteristica.dados.join("+") + ")" }); })),
          mini("Pôr no combate", function () { operar(function (x) { return MS().rivaisNoCombate(x, b.id); }); }),
        ]);
      })));
    }

    /* ---------------- negociação ---------------- */
    function painelNegociacao(e) {
      var pcs = mem.personagens.filter(function (p) { return p.resumo && p.resumo.atributos; });
      if (!pcs.length) return UI.painel("Negociação (p. 18)", [linha("Sem goblins na campanha.")]);
      var neg = selecao("Negociador", pcs.map(function (p) { return { valor: p.id, rotulo: p.nome + " (Noção " + p.resumo.atributos.nocao + ")" }; }), pcs[0].id);
      var vitimas = Object.keys(C().INIMIGOS).filter(function (k) { return C().INIMIGOS[k].combate !== null; });
      var vit = selecao("Vítima", vitimas.map(function (k) { return { valor: k, rotulo: C().INIMIGOS[k].nome + " (Com " + C().INIMIGOS[k].combate + ", Noç " + num(C().INIMIGOS[k].nocao) + ")" }; }), "campones");
      var maisForte = pcs.reduce(function (m, p) { return Math.max(m, p.resumo.atributos.combate || 0); }, 0);
      return UI.painel("Negociação (p. 18)", [
        neg, vit, linha("O goblin mais forte do bando tem Combate " + maisForte + "."),
        mini("Negociar", function () {
          var p = pc(neg.entrada.value), d = C().INIMIGOS[vit.entrada.value];
          if (d.nocao === null) { UI.avisoAtencao(d.nome + " não tem Noção: não negocia."); return; }
          operar(function (x) { var r = MS().negociar(x, { negociador: { nome: p.nome, nocao: p.resumo.atributos.nocao, personagemId: p.id }, maisForte: maisForte, vitima: { nome: d.nome, combate: d.combate, nocao: d.nocao } }, opId("ng"), rolador); if (r.ok) mem.negociou = r.negociacao; return r; }).then(function (r) {
            if (!r || !r.negociacao) return;
            UI.aviso(r.negociacao.texto, { duracao: 10000, tipo: r.negociacao.goblinExplode ? "atencao" : "info" });
            if (r.negociacao.goblinExplode) operarFichas({ tipo: "explodir", personagem: p.id, causa: "Todos os dados em 1 na negociação" });
          });
        }),
      ].concat(e.negociacoes.slice().reverse().slice(0, 5).map(function (n) { return linha(n.negociador + " × " + n.vitima + (n.hits ? " (" + n.hits.goblin + " × " + n.hits.vitima + " hits)" : "") + ": " + n.texto); })), { acoes: [T().regra("negociacao")] });
    }

    function notas(e) {
      var t = campo("Só o mestre vê", e.notas, { tipo: "area", linhas: 4, limite: 8000 });
      return el("div.pilha.pilha--curta", {}, [t, mini("Salvar notas", function () { var v = t.entrada.value; operar(function (x) { x.notas = v; return { ok: true }; }); })]);
    }

    function registro(e) {
      return el("ol.gob-historico", { reversed: true }, e.registro.slice().reverse().slice(0, 60).map(function (r) { return el("li", {}, [el("span.t-mini", { texto: "Dia " + r.dia + " · " }), el("span", { texto: r.texto + (r.privado ? " (privado)" : "") })]); }));
    }

    carregar();
    return alvo;
  }

  global.RAMACampanhaGoblins = { aba: aba };
})(window);
