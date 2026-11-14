/* =====================================================================
   R.A.M.A. — Ordem Paranormal RPG II · a ficha (v9.0)
   ---------------------------------------------------------------------
   v9.2: a organização da ficha do livro (Val no Alpha, Rhiona no
   Beta). No topo, o NOME grande, a etiqueta do perfil · ocupação/vocação
   · a caixa de NÍVEL; logo abaixo, a FAIXA com PV e PD em quadradinhos,
   armadura e pavor (a mini-faixa fica presa no rodapé do celular).
   Depois, as seções:

     Ficha         a página do livro: ATRIBUTOS (nome grande e o dado) e
                   PERÍCIAS ("NOME [d] + [d] ATRIBUTO", a linha rola) à
                   esquerda; o retrato e "Nível e evolução" no centro;
                   HABILIDADES (título em etiqueta, números em destaque)
                   à direita. Identidade e procedência recolhidas
     Habilidades   cada uma com o estado (barra de ímpeto, marcadores,
                   reservas) e as ações que o motor automatiza
     Paranormal    o módulo experimental (telas/o2-paranormal.js)
     Investigação  pontos de interesse da mesa, descobertas e as ações
                   (Investigar, Observar, Examinar, Interagir, Recapitular,
                   Compartilhar) do perfil de regras
     Combate       estado (lesões, traumas, pavor, pendentes), armas,
                   ações por fase, ações livres e preferências
     Relações      graus, invocação por missão e vínculos com fichas
     Inventário    armas, armaduras e itens

   Toda ação de jogo é UMA operação (RAMAOrdem2Jogo.operar).
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el;
  function K() { return global.RAMAOrdem2Catalogo; }
  function R() { return global.RAMAOrdem2; }
  function MO() { return global.RAMAOrdem2Motor; }
  function ME() { return global.RAMAOrdem2Mesa; }
  function T() { return global.RAMAOrdem2Tela; }
  function J() { return global.RAMAOrdem2Jogo; }
  function UI() { return global.RAMAUI; }

  function b(ctx) { return ctx.ficha.ordem2; }
  function op(ctx, o, opcoes) { return J().operar(ctx, o, opcoes); }
  function botao(t, fn, o) { return T().botao(t, fn, o); }
  function edita(ctx) { return ctx.podeEditar() && ctx.emEdicao(); }
  /* Correções graves: o Mestre na campanha, ou quem joga sem campanha
     (a ficha local é a própria mesa). Ficam no histórico. */
  function corrigivel(ctx) { return J().modo(ctx) === "campanha" ? J().ehMestre(ctx) : ctx.podeEditar(); }
  function pode(ctx) { return ctx.podeEditar() || J().ehMestre(ctx); }
  function alterou(ctx, tudo) { ctx.alterou(); if (tudo) ctx.redesenhar(); else ctx.atualizar(["bloco", "conteudo"]); }
  function opcoesDeDado(l) { return l.map(function (f) { return { valor: String(f), rotulo: "d" + f }; }); }
  function campanha(ctx) { return J().modo(ctx) === "campanha"; }
  function personagensDaMesa(ctx) { var d = J().dados(); return d && d.personagens ? d.personagens : []; }
  function outros(ctx) { return personagensDaMesa(ctx).filter(function (p) { return p.id !== J().pid(ctx); }); }

  /* =================================================================
     O TOPO (v9.2: na hierarquia da ficha do livro)
     Nome grande; a etiqueta do perfil · ocupação/vocação · a caixa de
     NÍVEL; depois a faixa de PV e PD em quadradinhos, armadura e pavor.
     ================================================================= */
  function blocoSuperior(ctx) {
    var x = b(ctx);
    if (!x || !R() || !MO()) return el("p", { texto: "O motor de Ordem II não está carregado nesta página." });
    var geral = global.RAMASecaoGeral;
    var pr = K().PERFIS_REGRAS[x.perfilRegras];
    var m = J().modo(ctx);
    var mesa = m === "carregando" ? null : J().estado(ctx);
    var pat = x.patamar && K().PATAMARES[x.patamar] && K().PATAMARES[x.patamar].bonus ? " · patamar " + K().PATAMARES[x.patamar].nome : "";
    return el("div.o2-bloco", { dataset: { perfilRegras: x.perfilRegras } }, [
      el("header.o2-cab", {}, [
        el("div.o2-cab__textos", {}, [
          el("div.o2-cab__nome", {}, [geral && geral.campoNome ? geral.campoNome(ctx) : el("h1.t-titulo", { texto: ctx.ficha.nome })]),
          el("p.o2-cab__linha", {}, [
            el("span.o2-perfil-tag", { texto: x.perfil ? K().PERFIS[x.perfil].nome : "Sem perfil" }),
            el("span.o2-cab__ocupacao", { texto: x.ocupacao.nome || "sem " + pr.termoOcupacao.toLowerCase() }),
            el("span.o2-nivel", { role: "img", "aria-label": "Nível " + x.nivel }, [el("span.o2-nivel__rotulo", { "aria-hidden": "true", texto: "Nível" }), el("span.o2-nivel__caixa", { "aria-hidden": "true", texto: String(x.nivel) })]),
          ]),
          el("p.t-mini.o2-cab__amb", {}, [
            el("span.o2-variante", { title: pr.texto, texto: pr.nome }),
            el("span", { texto: " " + K().AMBIENTACOES[x.ambientacao].nome + pat + (x.evolucao && x.evolucao.nex ? " · NEX " + x.evolucao.nex : "") + (x.modoCriacao === "guiada" ? " · criação guiada (experimental)" : x.modoCriacao === "pronta" && x.procedencia ? " · ficha pronta: " + x.procedencia.nome : "") }),
          ]),
        ]),
        global.RAMACapaSistema ? el("span.o2-cab__marca", {}, [global.RAMACapaSistema.elemento("ordem2", { tamanho: "p" })]) : null,
      ]),
      avisos(ctx, mesa, m),
      faixa(ctx),
      acoesRapidas(ctx, mesa),
      faixaMini(ctx),
    ]);
  }

  /* No celular, a faixa grande sai de vista ao rolar as seções: uma
     mini-faixa fica presa no rodapé com o que se consulta em jogo. */
  function faixaMini(ctx) {
    var x = b(ctx);
    return el("div.o2-faixa-mini", { role: "region", "aria-label": "Recursos (atalho)" }, [
      el("span.o2-faixa-mini__item", { texto: "PV " + x.recursos.pv.atual + "/" + R().pvMax(x) }),
      el("span.o2-faixa-mini__item", { texto: "PD " + x.recursos.pd.atual + "/" + R().pdMax(x) }),
      R().armaduraMax(x) ? el("span.o2-faixa-mini__item", { texto: "Arm " + R().armaduraAtual(x) }) : null,
      x.estado.pavor ? el("span.o2-faixa-mini__item.o2-faixa-mini__item--pavor", { texto: "Pavor d" + x.estado.pavor }) : null,
      pode(ctx) ? botao("Teste", function () { T().abrirTeste(ctx, {}); }, { classe: "r-botao--principal", rotulo: "Fazer um teste" }) : null,
    ]);
  }

  function avisos(ctx, mesa, m) {
    var x = b(ctx), l = [];
    if (m === "campanha" && mesa && mesa.perfil && mesa.perfil !== x.perfilRegras) l.push(el("p.o2-aviso", { role: "status", texto: "⚠ Perfil de regras diferente da campanha: a ficha é " + K().PERFIS_REGRAS[x.perfilRegras].nome + " e a mesa usa " + K().PERFIS_REGRAS[mesa.perfil].nome + ". Habilidades seguem a ficha; cenas (combate, investigação) seguem a mesa." }));
    if (m === "outra") l.push(el("p.o2-aviso", { role: "status", texto: "A campanha desta ficha não abriu a mesa de Ordem II (" + (J().erro() || "?") + "): o jogo fica local, na ficha." }));
    if (R().presetDesatualizado(x)) l.push(el("p.o2-aviso", { role: "status", texto: "Os dados da ficha pronta mudaram depois da cópia (versão " + x.procedencia.versaoDados + " → " + K().VERSAO_DADOS + "). Nada foi alterado nesta ficha." }));
    if (x.estado.morto || x.estado.colapso) l.push(el("p.o2-aviso.o2-aviso--grave", { role: "status", texto: x.estado.colapso ? "☠ Colapso total: o personagem está perdido." : "☠ O personagem morreu." }));
    if (x.estado.morteLenta) l.push(el("p.o2-aviso.o2-aviso--grave", { role: "status", texto: "Morte lenta: uma última ação — ao fim da próxima rodada, ele morre." }));
    x.estado.pendentes.forEach(function (p) {
      var n = { lesao: "Teste de lesão", trauma: "Teste de trauma", vigorAlpha: "Teste de Vigor (0 PV)", disciplinaAlpha: "Teste de Disciplina (0 PD)" }[p.tipo];
      l.push(el("div.o2-pendente", { role: "alert" }, [el("span", { texto: n + " pendente — DT " + p.dt + " (" + p.motivo + ")" + (p.naoLetal ? " · +d6 e 2d20 (não letal)" : "") }), pode(ctx) ? botao("Rolar " + n.toLowerCase(), function () { op(ctx, { tipo: "teste", contexto: { pendente: p.id } }); }, { classe: "r-botao--principal" }) : null]));
    });
    J().aguardando(ctx).forEach(function (t) {
      l.push(el("div.o2-pendente", { role: "status" }, [el("span", { texto: t.montagem.rotulo + ": aguardando escolhas pós-rolagem." }), botao("Abrir", function () { T().abrirPosRolagem(ctx, t.id, mesa ? ME().opcoesPos(mesa, fichasLocais(ctx), t, { mestre: true, pode: [J().pid(ctx)] }) : null); })]));
    });
    if (mesa && m === "campanha") (mesa.pedidos || []).filter(function (p) { return p.aberto && p.alvos.indexOf(J().pid(ctx)) >= 0 && !p.respostas[J().pid(ctx)]; }).forEach(function (p) {
      var per = p.pericia ? R().pericia(x, p.pericia) : null;
      l.push(el("div.o2-pendente.o2-pendente--pedido", { role: "alert" }, [el("strong", { texto: "O Mestre pede: " + p.rotulo + (p.dt !== null ? " (DT " + p.dt + ")" : "") }), pode(ctx) ? botao("Responder", function () { T().abrirTeste(ctx, { pericia: per ? per.id : "", atributo: p.atributo || undefined, dt: p.dt, rotulo: p.rotulo, contexto: { pedido: p.id } }); }, { classe: "r-botao--principal" }) : null]));
    });
    return l.length ? el("div.o2-avisos", {}, l) : null;
  }
  function fichasLocais(ctx) { var f = {}; f[J().pid(ctx)] = { nome: ctx.ficha.nome, bloco: b(ctx) }; return f; }

  /* A faixa: PV e PD em quadradinhos (como na ficha do livro), com o
     número escrito; armadura, pavor e condições. */
  function trilha(atual, max, chave) {
    var n = Math.min(max, 40), l = [];
    for (var i = 0; i < n; i++) l.push(el("span.o2-caixa" + (i < atual ? ".o2-caixa--cheia" : "")));
    return el("span.o2-trilha.o2-trilha--" + chave, { "aria-hidden": "true" }, l.concat(max > 40 ? [el("span.t-mini", { texto: " …" })] : []));
  }
  function faixa(ctx) {
    var x = b(ctx);
    var podeMexer = ctx.podeEditar();
    function recurso(rotulo, chave, atual, max, extra) {
      var muda = function (d) { var r = x.recursos[chave]; r.atual = Math.max(0, Math.min(chave === "pv" ? R().pvMax(x) : R().pdMax(x), r.atual + d)); alterou(ctx); };
      return el("div.o2-recurso.o2-recurso--" + chave, { role: "group", "aria-label": rotulo + ": " + atual + " de " + max }, [
        el("span.o2-recurso__rotulo", { texto: rotulo }),
        el("span.o2-recurso__valor", {}, [el("strong", { texto: String(atual) }), el("span", { texto: "/" + max })]),
        trilha(atual, max, chave),
        podeMexer ? el("span.o2-recurso__botoes", {}, [botao("−", function () { muda(-1); }, { rotulo: "−1 " + rotulo }), botao("+", function () { muda(1); }, { rotulo: "+1 " + rotulo })]) : null,
        extra || null,
      ]);
    }
    var cond = R().condicoes(x).filter(function (c) { return c !== "pavor"; });
    return el("div.o2-faixa", { role: "region", "aria-label": "Recursos" }, [
      recurso("PV", "pv", x.recursos.pv.atual, R().pvMax(x), x.recursos.naoLetal ? el("span.o2-recurso__nota", { texto: x.recursos.naoLetal + " não letal" }) : null),
      recurso("PD", "pd", x.recursos.pd.atual, R().pdMax(x)),
      el("div.o2-recurso.o2-recurso--armadura", { role: "group", "aria-label": "Armadura: " + R().armaduraAtual(x) + " de " + R().armaduraMax(x) }, [
        el("span.o2-recurso__rotulo", { texto: "Armadura" }),
        el("span.o2-recurso__valor", {}, [el("strong", { texto: String(R().armaduraAtual(x)) }), el("span", { texto: "/" + R().armaduraMax(x) })]),
        el("span.o2-recurso__nota", { texto: "−10 por ponto; não volta" }),
      ]),
      el("div.o2-recurso.o2-recurso--pavor" + (x.estado.pavor ? ".o2-recurso--ativo" : ""), { role: "group", "aria-label": x.estado.pavor ? "Pavor d" + x.estado.pavor : "Sem pavor" }, [
        el("span.o2-recurso__rotulo", { texto: "Pavor" }),
        x.estado.pavor ? T().dado(x.estado.pavor, { estado: "pavor", rotulo: "Pavor d" + x.estado.pavor }) : el("span.o2-recurso__valor", { texto: "—" }),
      ]),
      cond.length ? el("div.o2-faixa__condicoes", { "aria-label": "Condições" }, cond.map(function (c) { return el("span.r-etiqueta.r-etiqueta--aviso", { texto: R().NOMES_CONDICAO[c] }); })) : null,
    ]);
  }

  function acoesRapidas(ctx, mesa) {
    if (!pode(ctx)) return null;
    var x = b(ctx);
    var local = !campanha(ctx);
    return el("div.o2-acoes", {}, [
      botao("Teste…", function () { T().abrirTeste(ctx, {}); }, { classe: "r-botao--principal" }),
      campanha(ctx) && outros(ctx).length ? botao("Ajudar…", function () { abrirAjuda(ctx); }) : null,
      local ? botao("Sofrer dano…", function () { abrirDano(ctx); }) : null,
      local ? botao("Fim de cena", function () { UI().confirmar({ titulo: "Encerrar a cena", texto: "Marcadores de análise e ímpeto do Beta zeram, efeitos de cena terminam e os contadores de lesão/trauma da cena voltam a zero (Beta).", rotuloConfirmar: "Encerrar" }).then(function (s) { if (s) op(ctx, { tipo: "novaCena" }); }); }) : null,
      local ? botao("Nova missão", function () { x.estado.missaoLocal++; alterou(ctx); UI().avisoOk("Missão " + x.estado.missaoLocal + ": as relações podem ser invocadas de novo."); }) : null,
    ]);
  }

  function abrirDano(ctx) {
    var st = { valor: 1, tipo: "fisico", naoLetal: false, armadura: false };
    UI().modal({ titulo: "Sofrer dano", classe: "o2-janela", conteudo: [el("div.pilha", {}, [
      UI().campo({ rotulo: "Quanto", tipo: "numero", valor: "1", aoDigitar: true, aoMudar: function (v) { st.valor = U.inteiro(v, 0); } }),
      UI().campo({ rotulo: "Tipo", tipo: "selecao", valor: "fisico", opcoes: [{ valor: "fisico", rotulo: "Físico (PV)" }, { valor: "emocional", rotulo: "Emocional (PD) — efeito externo" }], aoMudar: function (v) { st.tipo = v; } }),
      el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) { st.naoLetal = ev.currentTarget.checked; } }), el("span", { texto: "Não letal (anotado à parte)" })]),
      el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) { st.armadura = ev.currentTarget.checked; } }), el("span", { texto: "Gastar 1 ponto de armadura (−10; não volta no playtest)" })]),
    ])], botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Aplicar", classe: "r-botao--principal", aoClicar: function (f) { f(); op(ctx, { tipo: "dano", personagem: J().pid(ctx), valor: st.valor, danoTipo: st.tipo, naoLetal: st.naoLetal, armadura: st.armadura }); } }] });
  }

  function abrirAjuda(ctx) {
    var x = b(ctx);
    var st = { alvo: (outros(ctx)[0] || {}).id || "", pericia: "", alvoPasso: "pericia", relacao: "" };
    var uteis = x.base.pericias.filter(function (p) { return R().dadoDaPericia(x, p) >= 6; });
    UI().modal({ titulo: "Ajudar", classe: "o2-janela", conteudo: [el("div.pilha", {}, [
      el("p.t-mini", { texto: "Gasta a sua ação. Perícia d6/d8 dá +1 passo; d10/d12, +2 (d4 não ajuda). Com Mentoria, você testa a perícia contra DT 7." }),
      UI().campo({ rotulo: "Quem você ajuda", tipo: "selecao", valor: st.alvo, opcoes: outros(ctx).map(function (p) { return { valor: p.id, rotulo: p.nome }; }), aoMudar: function (v) { st.alvo = v; } }),
      UI().campo({ rotulo: "Perícia coerente", tipo: "selecao", valor: "", opcoes: [{ valor: "", rotulo: "Escolha…" }].concat(uteis.map(function (p) { var f = R().dadoDaPericia(x, p); return { valor: p.id, rotulo: R().nomeDaPericia(x, p) + " d" + f + " (+" + ME().passosDeAjuda(f) + ")" }; })), aoMudar: function (v) { st.pericia = v; } }),
      UI().campo({ rotulo: "O passo vai para", tipo: "selecao", valor: "pericia", opcoes: [{ valor: "pericia", rotulo: "o dado de perícia do ajudado" }, { valor: "atributo", rotulo: "o dado de atributo do ajudado" }], ajuda: "O texto não prescreve: o Mestre confirma.", aoMudar: function (v) { st.alvoPasso = v; } }),
      x.relacoes.filter(function (r) { return r.grau; }).length ? UI().campo({ rotulo: "Invocar uma relação (+dX na ajuda)", tipo: "selecao", valor: "", opcoes: [{ valor: "", rotulo: "Não" }].concat(x.relacoes.filter(function (r) { return r.grau; }).map(function (r) { return { valor: r.id, rotulo: r.nome + " (" + K().GRAUS_RELACAO[r.grau].nome + ", +d" + K().GRAUS_RELACAO[r.grau].dado + ")" }; })), aoMudar: function (v) { st.relacao = v; } }) : null,
    ])], botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Ajudar", classe: "r-botao--principal", aoClicar: function (f) { if (!st.pericia) { UI().avisoAtencao("Escolha a perícia."); return; } f(); op(ctx, { tipo: "ajudar", alvo: st.alvo, pericia: st.pericia, alvoPasso: st.alvoPasso, relacao: st.relacao || undefined }); } }] });
  }

  /* =================================================================
     A FICHA (v9.2): a página do livro — ATRIBUTOS e PERÍCIAS à
     esquerda, o retrato no centro, HABILIDADES à direita. No celular,
     uma coluna: retrato, atributos, perícias, habilidades.
     ================================================================= */
  /* Números que importam no texto (d6, 2 PD, DT 10, +1…) em destaque. */
  var RE_NUM = /(\+?\d*d\d+|\d+\s?(?:PD|PV)\b|DT\s?\d+|[+−]\d+|\b\d+\b)/g;
  var RE_NUM_TODO = /^(\+?\d*d\d+|\d+\s?(?:PD|PV)|DT\s?\d+|[+−]\d+|\d+)$/;
  function realce(texto) {
    return String(texto || "").split(RE_NUM).filter(function (t) { return t !== ""; }).map(function (t) { return RE_NUM_TODO.test(t) ? el("strong.o2-num", { texto: t }) : document.createTextNode(t); });
  }
  function tag(t) { return el("h2.o2-tag", { texto: t }); }

  function abaPericias(ctx) {
    var x = b(ctx);
    var ed = edita(ctx);
    var geral = global.RAMASecaoGeral;
    var tela = global.RAMAOrdem2ParanormalTela;
    var atributos = el("div.o2-livro-atributos", {}, K().ORDEM_ATRIBUTOS.map(function (k) {
      var f = R().dadoDoAtributo(x, k), base = x.base.atributos[k];
      var nome = K().ATRIBUTOS[k].nome;
      if (ed) return el("div.o2-livro-atr", {}, [el("span.o2-livro-atr__nome", { texto: nome }), UI().campo({ rotulo: nome + " (impresso)", tipo: "selecao", valor: String(base), opcoes: opcoesDeDado([4, 6, 8, 10, 12, 20]), aoMudar: function (v) { x.base.atributos[k] = Number(v); alterou(ctx); } })]);
      return el("button.o2-livro-atr", { type: "button", title: "Testar só " + nome, "aria-label": nome + " d" + f + (f !== base ? " (impresso d" + base + ")" : "") + ". Testar.", disabled: !pode(ctx), onclick: function () { T().abrirTeste(ctx, { atributo: k, rotulo: nome }); } }, [
        el("span.o2-livro-atr__nome", { texto: nome }),
        T().dado(f, { rotulo: "d" + f }),
        f !== base ? el("span.o2-livro-atr__base", { texto: "impresso d" + base }) : null,
      ]);
    }));
    var linhas = x.base.pericias.map(function (p) {
      var f = R().dadoDaPericia(x, p);
      var atr = R().atributoBase(x, p.chave);
      var nome = R().nomeDaPericia(x, p);
      var dA = R().dadoDoAtributo(x, atr);
      var notas = [];
      if (p.rotuloImpresso) notas.push("Na ficha: " + p.rotuloImpresso + ".");
      if (p.atributoImpresso) notas.push("Atributo impresso: " + p.atributoImpresso + "; o motor usa " + K().ATRIBUTOS[atr].nome + " (lista da perícia).");
      if (f !== p.dado) notas.push("Impresso d" + p.dado + "; agora d" + f + " (evolução, efeitos ou itens).");
      var mod = R().modificadorNumerico(x, p.chave, atr);
      if (mod.valor) notas.push((mod.valor > 0 ? "+" : "") + mod.valor + " (" + mod.fontes.join(", ") + ").");
      var nota = notas.length ? el("span.o2-pericia__nota", { role: "img", "aria-label": notas.join(" "), title: notas.join(" "), texto: "ⓘ" }) : null;
      if (ed) return el("li.o2-pericia.o2-pericia--edicao" + (f > 4 ? ".o2-pericia--treinada" : ""), { dataset: { pericia: p.chave } }, [
        el("span.o2-pericia__nome", {}, [el("span", { texto: nome }), nota]),
        UI().campo({ rotulo: "Dado de " + nome, tipo: "selecao", valor: String(p.dado), opcoes: opcoesDeDado([4, 6, 8, 10, 12, 20]), aoMudar: function (v) { p.dado = Number(v); alterou(ctx); } }),
        el("span.o2-pericia__atr", { texto: "+ " + K().ATRIBUTOS[atr].curto }),
        p.chave === "aptidao" ? UI().campo({ rotulo: "Especialização", valor: p.especializacao, limite: 40, aoMudar: function (v) { p.especializacao = String(v).slice(0, 40); alterou(ctx); } }) : null,
        p.chave === "aptidao" && x.base.pericias.filter(function (q) { return q.chave === "aptidao"; }).length > 1 ? botao("Remover", function () { x.base.pericias = x.base.pericias.filter(function (q) { return q.id !== p.id; }); alterou(ctx, true); }) : null,
      ]);
      /* A linha do livro: NOME [dado] + [dado] ATRIBUTO — a linha inteira rola. */
      return el("li.o2-pericia" + (f > 4 ? ".o2-pericia--treinada" : ""), { dataset: { pericia: p.chave } }, [
        el("button.o2-pericia__rolar", { type: "button", disabled: !pode(ctx), title: pode(ctx) ? "Testar " + nome : "Só leitura.", "aria-label": "Testar " + nome + ": d" + f + " " + nome + " + d" + dA + " " + K().ATRIBUTOS[atr].nome, onclick: function () { T().abrirTeste(ctx, { pericia: p.id }); } }, [
          el("span.o2-pericia__nome", { texto: nome }),
          T().dado(f, { rotulo: nome + " d" + f, estado: "pericia" }),
          el("span.o2-pericia__mais", { "aria-hidden": "true", texto: "+" }),
          T().dado(dA, { rotulo: K().ATRIBUTOS[atr].nome + " d" + dA }),
          el("span.o2-pericia__atr", { texto: K().ATRIBUTOS[atr].nome }),
          el("span.o2-pericia__atr-curto", { "aria-hidden": "true", texto: K().ATRIBUTOS[atr].curto }),
        ]),
        nota,
      ]);
    });
    var habs = x.habilidades.map(function (h) {
      return el("article.o2-livro-hab", {}, [el("h3.o2-tag-titulo", { texto: h.nome }), el("p.o2-livro-hab__texto", {}, realce(h.texto)), h.origemEvolucao ? el("span.t-mini", { texto: "(evolução)" }) : null]);
    });
    return el("div.o2-aba.o2-livro", {}, [
      el("div.o2-livro__grade", {}, [
        el("section.o2-livro__esq", { "aria-label": "Atributos e perícias" }, [
          tag("Atributos"), atributos,
          tag("Perícias"),
          el("p.t-mini.o2-livro__dica", { texto: "Teste = dado da perícia + dado do atributo (DT 7, salvo o que o texto disser). ● treinada (d6 ou mais). Toque na linha para rolar." }),
          el("ul.o2-pericias", {}, linhas),
          ed ? botao("+ Aptidão (outra especialização)", function () { x.base.pericias.push(R().normalizarPericia({ chave: "aptidao", dado: 4 }, x.perfilRegras)); alterou(ctx, true); }) : null,
        ]),
        el("section.o2-livro__centro", { "aria-label": "Retrato e nível" }, [
          geral && geral.foto ? el("div.o2-livro__retrato", {}, [geral.foto(ctx)]) : null,
          tela ? tela.ficha.evolucao(ctx) : null,
        ]),
        el("section.o2-livro__dir", { "aria-label": "Habilidades" }, [
          tag("Habilidades"),
          habs.length ? el("div.o2-livro-habs", {}, habs) : el("p.t-mini", { texto: "Nenhuma habilidade." }),
          habs.length ? el("p.t-mini", { texto: "Estado e ações (ímpeto, marcadores, reservas) na aba Habilidades." }) : null,
        ]),
      ]),
      identidade(ctx),
    ]);
  }

  function identidade(ctx) {
    var x = b(ctx);
    var ed = edita(ctx);
    var pr = K().PERFIS_REGRAS[x.perfilRegras];
    function texto(rotulo, chave, limite, area) { return UI().campo({ rotulo: rotulo, tipo: area ? "area" : undefined, linhas: area ? 3 : undefined, valor: x[chave], limite: limite, desabilitado: !ed, aoMudar: function (v) { x[chave] = String(v).slice(0, limite); ctx.alterou(); } }); }
    var proc = x.procedencia;
    return UI().recolhivel({ titulo: "Identidade, narrativa e procedência", aberto: false, conteudo: el("div.pilha", {}, [
      el("div.o2-criar__campos", {}, [
        UI().campo({ rotulo: "Perfil", tipo: "selecao", valor: x.perfil, desabilitado: !ed, opcoes: [{ valor: "", rotulo: "—" }].concat(K().ORDEM_PERFIS.map(function (k) { return { valor: k, rotulo: K().PERFIS[k].nome }; })), aoMudar: function (v) { x.perfil = v; alterou(ctx); } }),
        UI().campo({ rotulo: pr.termoOcupacao, valor: x.ocupacao.nome, limite: 80, desabilitado: !ed, aoMudar: function (v) { x.ocupacao.nome = String(v).slice(0, 80); alterou(ctx); } }),
        UI().campo({ rotulo: "Nível", tipo: "selecao", valor: String(x.nivel), desabilitado: !ed, opcoes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (n) { return { valor: String(n), rotulo: String(n) }; }), aoMudar: function (v) { x.nivel = Number(v); alterou(ctx); } }),
        UI().campo({ rotulo: "Patamar (bônus em lesão/trauma)", tipo: "selecao", valor: x.patamar, desabilitado: !ed, opcoes: Object.keys(K().PATAMARES).map(function (k) { return { valor: k, rotulo: K().PATAMARES[k].nome + (K().PATAMARES[k].bonus ? " (+" + K().PATAMARES[k].bonus + ")" : "") }; }), ajuda: "O playtest não define patamares: sem informar, +0.", aoMudar: function (v) { x.patamar = v; alterou(ctx); } }),
      ]),
      el("div.o2-criar__campos", {}, [
        UI().campo({ rotulo: "PV máximo", tipo: "numero", valor: String(x.recursos.pv.max), desabilitado: !ed, aoMudar: function (v) { x.recursos.pv.max = Math.max(1, U.inteiro(v, x.recursos.pv.max)); alterou(ctx); } }),
        UI().campo({ rotulo: "PD máximo", tipo: "numero", valor: String(x.recursos.pd.max), desabilitado: !ed, aoMudar: function (v) { x.recursos.pd.max = Math.max(1, U.inteiro(v, x.recursos.pd.max)); alterou(ctx); } }),
        texto("Idade", "idade", 20),
      ]),
      texto("Resumo", "resumo", 600, true), texto("História", "historia", 6000, true), texto("Aparência", "aparencia", 2000, true),
      el("dl.o2-pares", {}, [
        el("div", {}, [el("dt", { texto: "Perfil de regras" }), el("dd", { texto: pr.nome + " (fixo nesta ficha) — " + pr.texto })]),
        el("div", {}, [el("dt", { texto: "Criação" }), el("dd", { texto: { pronta: "Ficha pronta", livre: "Criação livre", guiada: "Criação guiada (experimental)" }[x.modoCriacao] })]),
        proc ? el("div", {}, [el("dt", { texto: "Procedência" }), el("dd", { texto: proc.nome + " · " + K().referencia(proc.fonte, proc.pagina) + " · dados v" + proc.versaoDados + " · copiada em " + String(proc.copiadoEm).slice(0, 10) })]) : null,
        x.escolhas && x.escolhas.pvPdReferencia ? el("div", {}, [el("dt", { texto: "PV/PD" }), el("dd", { texto: "Referência de mesa 16/12" + (x.escolhas.pvPdReferencia.editados ? " (editados na criação)" : "") + " — não é regra do livro." })]) : null,
      ]),
    ]) });
  }

  /* =================================================================
     HABILIDADES
     ================================================================= */
  function abaHabilidades(ctx) {
    var x = b(ctx);
    var ed = edita(ctx);
    var cartoes = x.habilidades.map(function (h) { return cartaoHabilidade(ctx, h, ed); });
    return el("div.o2-aba", {}, [
      el("div.o2-habilidades", {}, cartoes.length ? cartoes : [el("p.t-mini", { texto: "Nenhuma habilidade." })]),
      ed ? adicionarHabilidade(ctx) : null,
      el("p.t-mini", { texto: "Rituais, poderes e objetos: aba Paranormal (módulo experimental, desligado por padrão)." }),
    ]);
  }

  function cartaoHabilidade(ctx, h, ed) {
    var x = b(ctx);
    var m = R().motorDe(h);
    var cat = K().HABILIDADES[h.ref];
    var estado = [];
    var acoes = [];
    var p = pode(ctx) && !ed;
    if (m && m.tipo === "impeto") {
      var espacos = [];
      for (var i = 0; i < m.espacos; i++) espacos.push(el("span.o2-impeto__espaco" + (i < h.estado.espacos ? ".o2-impeto__espaco--cheio" : ""), { "aria-hidden": "true", texto: i < h.estado.espacos ? "■" : "□" }));
      estado.push(el("div.o2-impeto", { role: "img", "aria-label": "Ímpeto: " + h.estado.espacos + " de " + m.espacos + " espaços" }, espacos.concat([el("span.t-mini", { texto: " " + h.estado.espacos + "/" + m.espacos + (m.zeraFimCena ? " · esvazia no fim da cena" : "") })])));
      m.opcoes.forEach(function (o, idx) {
        if (o.efeito === "dado") { estado.push(el("p.t-mini", { texto: o.custo + " espaço(s): +d" + o.faces + " — escolha no diálogo do teste." })); return; }
        if (o.efeito === "passoAtributo" && p) acoes.push(botao("Atributo +1 passo (" + o.custo + ")", function () { escolherAtributo(function (a) { op(ctx, { tipo: "usarHabilidade", habilidade: h.id, opcao: idx, atributo: a }); }); }, { motivo: h.estado.espacos < o.custo ? "Faltam espaços." : "" }));
        if (o.efeito === "acaoExtra" && p) acoes.push(botao("Ação extra (" + o.custo + ")", function () { op(ctx, { tipo: "usarHabilidade", habilidade: h.id, opcao: idx, conflito: true }); }, { motivo: h.estado.espacos < o.custo ? "Faltam espaços." : "" }));
      });
      if (ed) acoes.push(UI().campo({ rotulo: "Espaços preenchidos", tipo: "selecao", valor: String(h.estado.espacos), opcoes: Array.from({ length: m.espacos + 1 }, function (_, k) { return { valor: String(k), rotulo: String(k) }; }), aoMudar: function (v) { h.estado.espacos = Number(v); alterou(ctx); } }));
    }
    if (m && m.tipo === "analise") {
      estado.push(el("p.o2-marcadores", { texto: "Marcadores: " + h.estado.marcadores + "/" + m.maximo + " (" + "◆".repeat(h.estado.marcadores) + "◇".repeat(Math.max(0, m.maximo - h.estado.marcadores)) + ")" }));
      if (p) acoes.push(botao("Gastar uma ação: +" + m.ganho + " marcadores", function () { op(ctx, { tipo: "usarHabilidade", habilidade: h.id }); }, { motivo: h.estado.marcadores >= m.maximo ? "Já tem o máximo." : "" }));
    }
    if (m && m.tipo === "avaliacao") {
      estado.push(el("p.t-mini", { texto: h.estado.reserva.length ? "Dados guardados: " + h.estado.reserva.map(function (r) { return "d" + r.faces + " (" + r.alvo + ")"; }).join(", ") : "Nenhum dado guardado." }));
      if (p) acoes.push(botao("Avaliar (ação + " + m.pd + " PD)", function () { pedirTexto("Avaliar", "Ser ou ambiente observado", function (t) { op(ctx, { tipo: "usarHabilidade", habilidade: h.id, alvo: t }); }); }, { motivo: h.estado.reserva.length >= m.maximo ? "Já tem " + m.maximo + " dados." : x.recursos.pd.atual < m.pd ? "PD insuficiente." : "" }));
    }
    if (m && m.tipo === "rodadaAntecipada" && p) acoes.push(botao("Usar no início do conflito (" + m.pd + " PD)", function () { op(ctx, { tipo: "usarHabilidade", habilidade: h.id }); }, { motivo: campanha(ctx) ? "" : "Vale num combate da mesa." }));
    if (m && m.tipo === "acaoExtraPorPv" && p) acoes.push(botao("Ação extra (" + m.pv + " PV, 1×/cena de conflito)", function () { op(ctx, { tipo: "usarHabilidade", habilidade: h.id, conflito: true }); }, { motivo: x.estado.usos["cena:" + h.id] ? "Já usada nesta cena." : "" }));
    if (m && m.tipo === "consumiveis") {
      x.itens.filter(function (i) { return i.consumivel; }).forEach(function (it) {
        estado.push(el("p.t-mini", { texto: it.nome + ": " + (it.quantidade === null ? "—" : it.quantidade) + (it.consumivel === "vespa" ? " (declare como ataque à distância no combate)" : "") }));
        if (p && it.consumivel !== "vespa") acoes.push(botao("Usar " + it.nome, function () { escolherAlvo(ctx, "Em quem?", function (a) { op(ctx, { tipo: "usarHabilidade", habilidade: h.id, item: it.id, alvo: a }); }); }, { motivo: it.quantidade !== null && it.quantidade <= 0 ? "Acabou." : "" }));
      });
    }
    if (m && m.tipo === "curaPorTeste" && p) acoes.push(botao("Curar (ação + " + m.pd + " PD, Medicina DT " + m.dt + ")", function () { escolherAlvo(ctx, "Quem você cura?", function (a) { op(ctx, { tipo: "usarHabilidade", habilidade: h.id, alvo: a }); }); }, { motivo: x.recursos.pd.atual < m.pd ? "PD insuficiente." : "" }));
    if (m && m.tipo === "reservaDeGrupo" && p) acoes.push(botao("Elaborar o plano (ação + " + m.pd + " PD)", function () { op(ctx, { tipo: "usarHabilidade", habilidade: h.id }); }, { motivo: x.recursos.pd.atual < m.pd ? "PD insuficiente." : "" }));
    if (m && m.tipo === "parceiro") estado.push(el("p.t-mini", { texto: h.estado.indisponivel ? "O parceiro se machucou: volta na próxima cena." : "Pronto: +d" + m.faces + " nos ataques corpo a corpo." }));
    if (m && ["passoComPvBaixo", "armaduraExtra", "danoPorCategoria", "curaExtra", "pdAoDescobrir", "duasPericias", "marcadorAoDefender", "estoico", "impetoInicioCena", "dadoPorPd", "dadoEmAtaque", "rerrolarExaminar", "mentoria", "prontidao", "esquiva", "redirecionarAtaque"].indexOf(m.tipo) >= 0) estado.push(el("p.o2-auto", { texto: "Automática na hora certa (teste, dano, investigação ou combate)." }));
    if (!m || m.tipo === "narrativa") estado.push(el("p.o2-auto", { texto: "Narrativa: descreva e confirme com o Mestre." }));
    var params = ed && m && h.ref === "foco_mental" ? el("div.o2-criar__campos", {}, [
      UI().campo({ rotulo: "Custo (PD)", tipo: "numero", valor: String(m.pd), aoMudar: function (v) { h.param.pd = Math.max(0, U.inteiro(v, m.pd)); alterou(ctx); } }),
      UI().campo({ rotulo: "Dado", tipo: "selecao", valor: String(m.faces), opcoes: opcoesDeDado([4, 6, 8, 10, 12]), aoMudar: function (v) { h.param.faces = Number(v); alterou(ctx); } }),
    ]) : null;
    return el("article.o2-habilidade", { dataset: { habilidade: h.ref || "propria" } }, [
      el("header.o2-habilidade__topo", {}, [
        el("h3.o2-habilidade__nome.o2-tag-titulo", { texto: h.nome }),
        cat ? T().fonte(cat.fonte, cat.pagina) : el("span.o2-fonte", { texto: "Personalizada" }),
      ]),
      ed && !cat ? UI().campo({ rotulo: "Texto", tipo: "area", linhas: 3, valor: h.texto, limite: 1200, aoMudar: function (v) { h.texto = String(v).slice(0, 1200); ctx.alterou(); } }) : el("p.o2-habilidade__texto", {}, realce(h.texto)),
      estado.length ? el("div.o2-habilidade__estado", {}, estado) : null,
      params,
      acoes.length ? el("div.faixa.o2-habilidade__acoes", {}, acoes) : null,
      ed ? botao("Remover habilidade", function () { UI().confirmar({ titulo: "Remover " + h.nome, texto: "Tira a habilidade desta ficha.", rotuloConfirmar: "Remover", perigo: true }).then(function (s) { if (s) { x.habilidades = x.habilidades.filter(function (y) { return y.id !== h.id; }); alterou(ctx, true); } }); }, { classe: "r-botao--perigo" }) : null,
    ]);
  }

  function adicionarHabilidade(ctx) {
    var x = b(ctx);
    var versao = x.perfilRegras === "beta-vigilia" ? "beta" : "alpha";
    var st = { ref: "", nome: "", texto: "" };
    var opcoes = Object.keys(K().HABILIDADES).filter(function (k) { var h = K().HABILIDADES[k]; return h.versao === versao || h.versao === "ambas"; }).map(function (k) { return { valor: k, rotulo: K().HABILIDADES[k].nome + (K().HABILIDADES[k].ficha ? " (" + K().HABILIDADES[k].ficha + ")" : "") }; });
    return UI().painel("Adicionar habilidade", el("div.pilha", {}, [
      el("div.o2-criar__campos", {}, [
        UI().campo({ rotulo: "Do catálogo (" + (versao === "beta" ? "Beta" : "Alpha") + ")", tipo: "selecao", valor: "", opcoes: [{ valor: "", rotulo: "Escolha…" }].concat(opcoes), aoMudar: function (v) { st.ref = v; } }),
        botao("Adicionar", function () { if (!st.ref) return; x.habilidades.push(R().habilidadeDoCatalogo(st.ref)); alterou(ctx, true); }),
      ]),
      el("div.o2-criar__campos", {}, [
        UI().campo({ rotulo: "Ou uma própria: nome", limite: 80, aoMudar: function (v) { st.nome = v; } }),
        UI().campo({ rotulo: "Texto", limite: 1200, aoMudar: function (v) { st.texto = v; } }),
        botao("Adicionar própria", function () { if (!String(st.nome).trim()) return; x.habilidades.push(R().normalizarHabilidade({ nome: st.nome, texto: st.texto })); alterou(ctx, true); }),
      ]),
    ]));
  }

  function escolherAtributo(fn) {
    var st = { a: "fisico" };
    UI().modal({ titulo: "Que atributo?", classe: "o2-janela", conteudo: [UI().campo({ rotulo: "Atributo", tipo: "selecao", valor: "fisico", opcoes: K().ORDEM_ATRIBUTOS.map(function (k) { return { valor: k, rotulo: K().ATRIBUTOS[k].nome }; }), aoMudar: function (v) { st.a = v; } })],
      botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Confirmar", classe: "r-botao--principal", aoClicar: function (f) { f(); fn(st.a); } }] });
  }
  function pedirTexto(titulo, rotulo, fn) {
    var st = { t: "" };
    UI().modal({ titulo: titulo, classe: "o2-janela", conteudo: [UI().campo({ rotulo: rotulo, limite: 120, aoDigitar: true, aoMudar: function (v) { st.t = v; } })],
      botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Confirmar", classe: "r-botao--principal", aoClicar: function (f) { f(); fn(st.t); } }] });
  }
  function escolherAlvo(ctx, titulo, fn) {
    var lista = [{ valor: J().pid(ctx), rotulo: (ctx.ficha.nome || "Este personagem") + " (você)" }].concat(outros(ctx).map(function (p) { return { valor: p.id, rotulo: p.nome }; }));
    if (lista.length === 1) { fn(lista[0].valor); return; }
    var st = { a: lista[0].valor };
    UI().modal({ titulo: titulo, classe: "o2-janela", conteudo: [UI().campo({ rotulo: "Alvo", tipo: "selecao", valor: st.a, opcoes: lista, aoMudar: function (v) { st.a = v; } })],
      botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Confirmar", classe: "r-botao--principal", aoClicar: function (f) { f(); fn(st.a); } }] });
  }

  /* =================================================================
     INVESTIGAÇÃO
     ================================================================= */
  function abaInvestigacao(ctx) {
    var x = b(ctx);
    var m = J().modo(ctx);
    if (m === "carregando") return UI().carregando("Abrindo a mesa");
    if (m !== "campanha") return el("div.o2-aba", {}, [UI().painel("Investigação", el("div.pilha", {}, [
      el("p.t-mini", { texto: "Pontos de interesse, pistas e as ações de investigação moram na mesa da campanha (o Mestre guarda as soluções). Sem campanha, use os testes da aba Ficha." }),
      referenciaInvestigacao(x.perfilRegras),
    ]))]);
    var e = J().estado(ctx);
    var eu = J().pid(ctx);
    var beta = e.perfil === "beta-vigilia";
    var meus = (e.investigacao.descobertas || {})[eu] || [];
    var pontos = e.investigacao.pontos || [];
    var solicitacoes = (e.investigacao.solicitacoes || []).filter(function (s) { return s.quem === eu || s.aliado === eu; });
    return el("div.o2-aba", {}, [
      UI().painel("Pontos de interesse", pontos.length ? el("div.o2-pontos", {}, pontos.map(function (p) {
        var pericias = p.pericias || ME().periciasDoPonto(p);
        var achadas = meus.filter(function (d) { return d.ponto === p.id; });
        return el("article.o2-ponto", {}, [
          el("h3.o2-ponto__nome", { texto: (p.numero ? p.numero + ". " : "") + p.nome }),
          el("p", { texto: p.descricao }),
          el("p.t-mini", { texto: "Perícias listadas: " + pericias.map(function (k) { var c = k.split(":"); return K().nomeDaPericia(e.perfil, c[0], e.ambientacao) + (c[1] ? " (" + c[1] + ")" : ""); }).join(", ") }),
          achadas.length ? el("ul.o2-ponto__achados", {}, achadas.map(function (d) { return el("li", {}, [el("span", { texto: d.texto }), el("span.t-mini", { texto: " — " + d.como })]); })) : null,
          pode(ctx) ? el("div.faixa", {}, [botao("Investigar…", function () { abrirInvestigar(ctx, p, pericias, beta); }, { classe: "r-botao--principal" })]) : null,
        ]);
      })) : el("p.t-mini", { texto: "O Mestre ainda não apresentou pontos de interesse nesta cena." })),
      UI().painel("Ações de investigação", el("div.pilha", {}, [
        el("div.faixa", {}, [
          botao("Recapitular…", function () { pedirTexto("Recapitular", "Interprete: o que o grupo já sabe e o seu palpite", function (t) { op(ctx, { tipo: "recapitular", descricao: t }); }); }, { motivo: !pode(ctx) ? "Só leitura." : e.investigacao.travas.recapitular ? "Já houve sucesso nesta cena." : "" }),
          botao("Compartilhar…", function () { abrirCompartilhar(ctx); }, { motivo: !pode(ctx) ? "Só leitura." : e.investigacao.travas.compartilhar ? "Já houve sucesso nesta cena." : !outros(ctx).length ? "Ninguém mais na mesa." : "" }),
        ]),
        solicitacoes.length ? el("ul.o2-solicitacoes", {}, solicitacoes.map(function (s) {
          var minha = (s.tipo === "compartilhar" ? s.aliado : s.quem) === eu;
          var texto = { recapitular: "Recapitular", compartilhar: "Compartilhar", interagir: "Interagir" }[s.tipo] + " · " + ({ pendente: "aguardando o Mestre", aprovada: "aprovada — teste de " + K().nomeDaPericia(e.perfil, s.pericia, e.ambientacao) + " (DT " + s.dt + ")", recusada: "o Mestre não aprovou", sucesso: "sucesso", falha: "falhou", resolvida: "resolvida" + (s.resposta ? ": " + s.resposta : "") }[s.estado] || s.estado);
          return el("li", {}, [el("span", { texto: texto }), s.estado === "aprovada" && minha && pode(ctx) ? botao("Rolar", function () { op(ctx, { tipo: "teste", contexto: { solicitacao: s.id } }); }, { classe: "r-botao--principal" }) : null]);
        })) : null,
        referenciaInvestigacao(e.perfil),
      ])),
      /* v9.1: desafios, ferramentas, compêndio, anexos, itens, perseguição e
         esconderijo — atalhos que disparam a ação real no quadro da mesa. */
      global.RAMAOrdem2ProcTela ? global.RAMAOrdem2ProcTela.jogador({ estado: e, mestre: false, pcs: personagensDaMesa(ctx).map(function (p) { return { id: p.id, nome: p.nome, meu: p.id === eu }; }), meus: [eu], operar: function (o) { return op(ctx, o); } }) : null,
    ]);
  }
  function referenciaInvestigacao(perfil) {
    var beta = perfil === "beta-vigilia";
    return UI().recolhivel({ titulo: "Como funciona (" + (beta ? "Beta pp. 13–15" : "Alpha pp. 21–23") + ")", conteudo: el("ul.pilha.pilha--curta", {}, (beta ? [
      "Investigar: escolha um ponto e uma perícia listada; você recebe passivamente as linhas cuja DT ≤ o seu dado (ex.: d6 → 6).",
      "Depois, Observar (outra perícia, também passiva) OU Examinar (teste da primeira perícia; sem informação nova, −1 PD).",
      "Interagir é a alternativa a Investigar: uma ação simples com o ponto; o Mestre resolve.",
      "Recapitular: Intuição DT 10 com a aprovação do Mestre; Compartilhar: o aliado testa Inspecionar DT 10 como ação livre. Um sucesso trava a ação na cena.",
    ] : [
      "Investigar: escolha um ponto e uma perícia listada; você recebe as linhas cuja DT ≤ o seu dado.",
      "Depois, Examinar (teste da perícia; sem informação nova, −1 PD) OU Interagir (descreva uma ação simples).",
      "Crítico investigando: o Mestre revela uma informação adicional (p. 19).",
      "Recapitular: Intuição DT 10; Compartilhar: o aliado testa Pesquisar DT 10 (ação livre). Um sucesso trava a ação na cena.",
    ]).map(function (t) { return el("li.t-mini", { texto: t }); })) });
  }
  function abrirInvestigar(ctx, ponto, pericias, beta) {
    var x = b(ctx);
    var minhas = x.base.pericias.filter(function (p) { return pericias.some(function (k) { var c = k.split(":"); var ch = K().ALIASES[c[0]] || c[0]; return p.chave === ch && (!c[1] || p.especializacao.toLowerCase() === c[1].toLowerCase()); }); });
    var todas = minhas.length ? minhas : x.base.pericias;
    var varredura = !beta && R().habilidadesDoTipo(x, "duasPericias").length > 0;
    var st = { pericia: (todas[0] || {}).id || "", segunda: "", modo: beta ? "observar" : "examinar", descricao: "" };
    var modos = beta ? [["observar", "Investigar e Observar (2ª perícia, passiva)"], ["examinar", "Investigar e Examinar (teste; sem novidade, −1 PD)"], ["nada", "Só a passiva"], ["interagir", "Interagir (em vez de investigar)"]]
      : [["examinar", "Investigar e Examinar (teste; sem novidade, −1 PD)"], ["interagir", "Investigar e Interagir"], ["nada", "Só a passiva"]];
    var corpo = el("div.pilha");
    function desenhar() {
      U.trocar(corpo, [
        el("p", { texto: ponto.descricao }),
        UI().campo({ rotulo: "Perícia", tipo: "selecao", valor: st.pericia, opcoes: todas.map(function (p) { return { valor: p.id, rotulo: R().nomeDaPericia(x, p) + " d" + R().dadoDaPericia(x, p) }; }), aoMudar: function (v) { st.pericia = v; } }),
        UI().campo({ rotulo: "Depois", tipo: "selecao", valor: st.modo, opcoes: modos.map(function (m) { return { valor: m[0], rotulo: m[1] }; }), aoMudar: function (v) { st.modo = v; desenhar(); } }),
        (beta && st.modo === "observar") || varredura ? UI().campo({ rotulo: varredura ? "Segunda perícia (Varredura Ampla)" : "Perícia para Observar", tipo: "selecao", valor: st.segunda, opcoes: [{ valor: "", rotulo: varredura ? "Não usar" : "Escolha…" }].concat(todas.map(function (p) { return { valor: p.id, rotulo: R().nomeDaPericia(x, p) + " d" + R().dadoDaPericia(x, p) }; })), aoMudar: function (v) { st.segunda = v; } }) : null,
        st.modo === "interagir" ? UI().campo({ rotulo: "O que você faz com o ponto", tipo: "area", linhas: 2, limite: 600, aoMudar: function (v) { st.descricao = v; } }) : null,
      ]);
    }
    desenhar();
    UI().modal({ titulo: "Investigar — " + ponto.nome, classe: "o2-janela", conteudo: [corpo], botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Investigar", classe: "r-botao--principal", aoClicar: function (f) {
      if (beta && st.modo === "observar" && !st.segunda) { UI().avisoAtencao("Escolha a perícia para Observar."); return; }
      f(); op(ctx, { tipo: "investigar", ponto: ponto.id, pericia: st.modo === "interagir" && beta ? undefined : st.pericia, segunda: st.segunda || undefined, modo: st.modo, descricao: st.descricao });
    } }] });
  }
  function abrirCompartilhar(ctx) {
    var st = { aliado: (outros(ctx)[0] || {}).id || "", texto: "" };
    UI().modal({ titulo: "Compartilhar uma pista", classe: "o2-janela", conteudo: [el("div.pilha", {}, [
      UI().campo({ rotulo: "Com quem", tipo: "selecao", valor: st.aliado, opcoes: outros(ctx).map(function (p) { return { valor: p.id, rotulo: p.nome }; }), aoMudar: function (v) { st.aliado = v; } }),
      UI().campo({ rotulo: "Interprete: explique a pista", tipo: "area", linhas: 3, limite: 1200, aoMudar: function (v) { st.texto = v; } }),
    ])], botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Compartilhar", classe: "r-botao--principal", aoClicar: function (f) { f(); op(ctx, { tipo: "compartilhar", aliado: st.aliado, descricao: st.texto }); } }] });
  }

  /* =================================================================
     COMBATE
     ================================================================= */
  function abaCombate(ctx) {
    var x = b(ctx);
    var m = J().modo(ctx);
    var e = m === "carregando" ? null : J().estado(ctx);
    var emCombate = m === "campanha" && e && e.combate && e.combate.ativo;
    var eu = emCombate ? ME().participanteDoPersonagem(e, J().pid(ctx)) : null;
    var partes = [];
    if (emCombate) partes.push(painelDoCombate(ctx, e, eu));
    partes.push(UI().painel("Armas", el("div.pilha", {}, x.itens.filter(function (i) { return i.tipo === "arma" || i.consumivel === "vespa"; }).map(function (a) {
      return el("div.o2-arma", {}, [
        el("strong", { texto: a.nome }),
        el("span.t-mini", { texto: (a.consumivel === "vespa" ? "à distância (Sobrevivência), dano RA+1, uso único" : (a.alcance === "distancia" ? "à distância" : "corpo a corpo") + ", dano RA" + (a.dano >= 0 ? "+" : "") + a.dano) + (a.especial ? " · " + a.especial : "") }),
        pode(ctx) ? (emCombate && eu ? botao("Declarar ataque", function () { abrirDeclarar(ctx, e, eu, a.alcance === "distancia" || a.consumivel === "vespa" ? "agredirDistancia" : "agredirCorpo", a); })
          : botao("Atacar (teste)", function () { T().abrirTeste(ctx, { pericia: a.consumivel === "vespa" ? "sobrevivencia" : a.alcance === "distancia" ? "pontaria" : "luta", tipo: "ataque", alcance: a.alcance, arma: a.id, rotulo: "Ataque com " + a.nome }); })) : null,
      ]);
    }).concat([el("p.t-mini", { texto: "Dano normal: RA + a arma; no crítico do Beta, as duas maiores (p. 11/21). Desarmado causa dano não letal." })]))));
    partes.push(UI().painel("Estado", estadoDoPersonagem(ctx)));
    partes.push(UI().recolhivel({ titulo: "Ações de combate (Beta pp. 18–21)", conteudo: el("ul.pilha.pilha--curta", {}, Object.keys(K().ACOES_COMBATE).map(function (k) { var a = K().ACOES_COMBATE[k]; return el("li", {}, [el("strong", { texto: a.nome + " — " + K().FASES[a.fase].nome + (a.fase4 ? " (com quatro fases: " + K().FASES[a.fase4].nome + ")" : "") + ". " }), el("span.t-mini", { texto: a.texto })]); }).concat([el("li.t-mini", { texto: "Ações livres: sacar/guardar e erguer-se (−1 passo em todos os testes da rodada), jogar-se no chão." })])) }));
    partes.push(UI().recolhivel({ titulo: "Minijogos (Alpha pp. 24–25; Beta pp. 16–17)", conteudo: minijogos(ctx) }));
    return el("div.o2-aba", {}, partes);
  }

  function estadoDoPersonagem(ctx) {
    var x = b(ctx);
    var s = x.estado;
    return el("div.pilha", {}, [
      el("dl.o2-pares.o2-pares--linha", {}, [
        el("div", {}, [el("dt", { texto: "Testes de lesão" + (x.perfilRegras === "beta-vigilia" ? " (cena)" : "") }), el("dd", { texto: String(s.testesLesao) + " → próxima DT " + (7 + 3 * s.testesLesao) })]),
        el("div", {}, [el("dt", { texto: "Testes de trauma" }), el("dd", { texto: String(s.testesTrauma) + " → próxima DT " + (7 + 3 * s.testesTrauma) })]),
        el("div", {}, [el("dt", { texto: "Ação extra" }), el("dd", { texto: String(s.acaoExtra) })]),
      ]),
      s.lesoes.length ? el("div", {}, [el("h4.t-secao", { texto: "Lesões (permanentes)" }), el("ul", {}, s.lesoes.map(function (l) { var t = K().LESOES.filter(function (y) { return y.id === l.ref; })[0]; return el("li", {}, [el("span", { texto: l.nome + (t ? " — " + t.texto : "") }), corrigivel(ctx) ? botao("Remover (correção do Mestre)", function () { op(ctx, { tipo: "corrigir", personagem: J().pid(ctx), alvo: "lesao", id: l.id }); }) : null]); }))]) : el("p.t-mini", { texto: "Sem lesões." }),
      s.traumas.length ? el("div", {}, [el("h4.t-secao", { texto: "Traumas" }), el("ul", {}, s.traumas.map(function (l) { var t = K().TRAUMAS.filter(function (y) { return y.id === l.ref; })[0]; return el("li", {}, [el("span", { texto: l.nome + (l.curado ? " (curado)" : "") + (t ? " — " + t.texto : "") }), corrigivel(ctx) && !l.curado ? botao("Curar trauma", function () { op(ctx, { tipo: "corrigir", personagem: J().pid(ctx), alvo: "trauma", id: l.id, curar: true }); }) : null]); }))]) : el("p.t-mini", { texto: "Sem traumas." }),
      x.efeitos.length ? el("div", {}, [el("h4.t-secao", { texto: "Efeitos ativos" }), el("ul", {}, x.efeitos.map(function (ef) { return el("li", { texto: ef.fonte + ": " + (ef.tipo === "passoAtributo" ? K().ATRIBUTOS[ef.alvo] ? K().ATRIBUTOS[ef.alvo].nome + " " : "" : ef.tipo === "passoTodos" ? "todos os testes " : "") + (ef.n > 0 ? "+" : "") + ef.n + " passo · até " + { teste: "o próximo teste", rodada: "o fim da rodada", cena: "o fim da cena", missao: "o fim da missão", permanente: "ser removido" }[ef.expira] }); }))]) : null,
      x.historico.length ? UI().recolhivel({ titulo: "Histórico de consequências (" + x.historico.length + ")", conteudo: el("ol.o2-historico", {}, x.historico.slice().reverse().map(function (h) { return el("li", {}, [el("span.t-mini", { texto: String(h.quando).slice(0, 16).replace("T", " ") + " · " }), el("span", { texto: h.texto + (h.corrigido ? " (correção do Mestre)" : "") })]); })) }) : null,
      pode(ctx) && J().modo(ctx) !== "campanha" ? el("div.faixa", {}, [
        botao(s.caido ? "Erguer-se (ação livre, −1 passo)" : "Jogar-se no chão", function () { op(ctx, { tipo: "acaoLivre", acao: s.caido ? "erguer" : "jogarSe" }); }),
        botao("Sacar/guardar (ação livre, −1 passo)", function () { op(ctx, { tipo: "acaoLivre", acao: "sacar" }); }),
        s.pavor ? botao("Remover pavor", function () { s.pavor = 0; alterou(ctx); }) : botao("Receber pavor", function () { op(ctx, { tipo: "pavor", personagem: J().pid(ctx), acao: "dar" }); }),
      ]) : null,
    ]);
  }

  function painelDoCombate(ctx, e, eu) {
    var c = e.combate;
    var fase = c.ordemFases[c.fase];
    var minhas = c.declaracoes.filter(function (d) { return eu && d.ator === eu.id && d.rodada === c.rodada; });
    var motivo = eu ? ME().podeDeclarar(e, fichasLocais(ctx), Object.assign({}, eu, { tipo: "pc" }), fase || c.ordemFases[c.ordemFases.length - 1]) : "Você não está no combate.";
    return UI().painel("Combate — rodada " + c.rodada + (c.rodada === 0 ? " (antecipada)" : ""), el("div.pilha", {}, [
      el("ol.o2-fases", {}, c.ordemFases.map(function (f, i) { return el("li" + (i === c.fase ? ".o2-fases__atual" : i < c.fase ? ".o2-fases__feita" : ""), { "aria-current": i === c.fase ? "step" : null, texto: (i === c.fase ? "▶ " : i < c.fase ? "✓ " : "") + K().FASES[f].nome + (i === c.fase && c.etapa === "rolada" ? " (rolada)" : "") }); })),
      minhas.length ? el("ul", {}, minhas.map(function (d) { return el("li", {}, [el("span", { texto: K().ACOES_COMBATE[d.acao].nome + " · " + K().FASES[d.fase].nome + " · " + d.estado }), d.estado === "declarada" ? botao("Cancelar", function () { op(ctx, { tipo: "cancelarDeclaracao", id: d.id }); }) : null]); })) : el("p.t-mini", { texto: "Nenhuma ação declarada nesta rodada." }),
      eu && pode(ctx) ? el("div.faixa", {}, [
        botao("Declarar ação…", function () { abrirDeclarar(ctx, e, eu, "defender", null); }, { classe: "r-botao--principal", motivo: motivo && !/fase já passou|roladas/.test(motivo) ? motivo : "" }),
        botao("Sacar/guardar", function () { op(ctx, { tipo: "acaoLivre", acao: "sacar" }); }),
        botao(b(ctx).estado.caido ? "Erguer-se" : "Jogar-se no chão", function () { op(ctx, { tipo: "acaoLivre", acao: b(ctx).estado.caido ? "erguer" : "jogarSe" }); }),
      ]) : null,
      eu && pode(ctx) ? el("div.faixa", {}, [
        el("label.r-marca", {}, [el("input", { type: "checkbox", checked: !!eu.armaduraAuto, onchange: function (ev) { op(ctx, { tipo: "configurarParticipante", armaduraAuto: ev.currentTarget.checked }); } }), el("span", { texto: "Gastar armadura ao sofrer dano" })]),
        R().habilidadesDoTipo(b(ctx), "esquiva").length ? el("label.r-marca", {}, [el("input", { type: "checkbox", checked: !!eu.esquivaAuto, onchange: function (ev) { op(ctx, { tipo: "configurarParticipante", esquivaAuto: ev.currentTarget.checked }); } }), el("span", { texto: "Usar Esquiva quando atacado (1×/rodada)" })]) : null,
      ]) : null,
      R().habilidadesDoTipo(b(ctx), "redirecionarAtaque").length && pode(ctx) ? guardia(ctx, e) : null,
    ]));
  }
  function guardia(ctx, e) {
    var ataques = e.combate.declaracoes.filter(function (d) { return d.rodada === e.combate.rodada && d.estado === "declarada" && (d.acao === "agredirCorpo" || d.acao === "agredirDistancia") && d.alvo !== "pc-" + J().pid(ctx); });
    if (!ataques.length) return null;
    return el("div.faixa", {}, [el("span.t-mini", { texto: "Guardiã (2 PD, 1×/rodada): tornar-se o alvo de" })].concat(ataques.map(function (d) { var a = ME().participante(e, d.alvo); return botao(d.nome + " → " + (a ? a.nome : "?"), function () { op(ctx, { tipo: "redirecionar", declaracao: d.id }); }); })));
  }

  function abrirDeclarar(ctx, e, eu, acaoInicial, arma) {
    var x = b(ctx);
    var c = e.combate;
    /* Inimigos primeiro: o alvo padrão nunca é um aliado. */
    var alvos = c.participantes.filter(function (p) { return p.id !== eu.id; }).sort(function (a, z) { return (a.tipo === "npc" ? 0 : 1) - (z.tipo === "npc" ? 0 : 1); });
    var temProntidao = R().habilidadesDoTipo(x, "prontidao").length > 0;
    var st = { acao: acaoInicial, alvo: (alvos[0] || {}).id || "", arma: arma ? arma.id : "", naFase: "", opcoes: { alcance: "curto", cobertura: "nenhuma", ocultacao: "nenhuma", vantagemTatica: false, aceitarDesvio: false, naoLetal: false, comLuta: false, pericia: "" }, descricao: "" };
    var corpo = el("div.pilha");
    function desenhar() {
      var a = K().ACOES_COMBATE[st.acao];
      var ataque = st.acao === "agredirCorpo" || st.acao === "agredirDistancia" || a.manobra;
      var armas = x.itens.filter(function (i) { return (i.tipo === "arma" && i.alcance === (st.acao === "agredirDistancia" ? "distancia" : "corpo")) || (st.acao === "agredirDistancia" && i.consumivel === "vespa"); });
      U.trocar(corpo, [
        UI().campo({ rotulo: "Ação", tipo: "selecao", valor: st.acao, opcoes: Object.keys(K().ACOES_COMBATE).map(function (k) { return { valor: k, rotulo: K().ACOES_COMBATE[k].nome + " (" + K().FASES[K().faseDaAcao(k, c.ordemFases)].nome + ")" }; }), aoMudar: function (v) { st.acao = v; st.arma = ""; desenhar(); } }),
        el("p.t-mini", { texto: a.texto }),
        st.acao === "escapar" ? UI().campo({ rotulo: "Perícia para escapar", tipo: "selecao", valor: st.opcoes.pericia || "acrobacia", opcoes: [{ valor: "acrobacia", rotulo: "Acrobacia" }, { valor: "luta", rotulo: "Luta" }], ajuda: "Sendo afogado(a): −1 passo. Ajudando um aliado: escolha-o como alvo, sem a redução.", aoMudar: function (v) { st.opcoes.pericia = v; } }) : null,
        ["preparar", "habilidade", "outra", "mover", "investigar", "abrigo"].indexOf(st.acao) < 0 ? UI().campo({ rotulo: st.acao === "defender" ? "Contra quem (o ataque escolhido antes da rolagem)" : "Alvo", tipo: "selecao", valor: st.alvo, opcoes: alvos.map(function (p) { return { valor: p.id, rotulo: p.nome + (p.situacao ? " (" + p.situacao + ")" : "") }; }), aoMudar: function (v) { st.alvo = v; } }) : null,
        ataque && st.acao !== "agarrar" ? UI().campo({ rotulo: "Arma", tipo: "selecao", valor: st.arma, opcoes: [{ valor: "", rotulo: "Desarmado (não letal)" }].concat(armas.map(function (i) { return { valor: i.id, rotulo: i.nome + (i.consumivel === "vespa" ? " (Sobrevivência, RA+1)" : " (RA" + (i.dano >= 0 ? "+" : "") + i.dano + ")") }; })), aoMudar: function (v) { st.arma = v; } }) : null,
        st.acao === "agredirDistancia" ? el("div.o2-criar__campos", {}, [
          UI().campo({ rotulo: "Alcance", tipo: "selecao", valor: st.opcoes.alcance, opcoes: [{ valor: "curto", rotulo: "Curto (DT 7)" }, { valor: "longo", rotulo: "Longo (+3)" }], aoMudar: function (v) { st.opcoes.alcance = v; } }),
          UI().campo({ rotulo: "Cobertura do alvo", tipo: "selecao", valor: st.opcoes.cobertura, opcoes: [{ valor: "nenhuma", rotulo: "Nenhuma" }, { valor: "leve", rotulo: "Leve (+3)" }, { valor: "total", rotulo: "Total (não pode)" }], aoMudar: function (v) { st.opcoes.cobertura = v; } }),
          el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) { st.opcoes.aceitarDesvio = ev.currentTarget.checked; } }), el("span", { texto: "Alvo em corpo a corpo: aceitar o d6 de desvio em vez de −2 passos" })]),
        ]) : null,
        ataque ? el("div.o2-criar__campos", {}, [
          UI().campo({ rotulo: "Ocultação do alvo", tipo: "selecao", valor: st.opcoes.ocultacao, opcoes: [{ valor: "nenhuma", rotulo: "Nenhuma" }, { valor: "leve", rotulo: "Leve (−1 passo)" }, { valor: "total", rotulo: "Total (−2 passos)" }], aoMudar: function (v) { st.opcoes.ocultacao = v; } }),
          el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) { st.opcoes.vantagemTatica = ev.currentTarget.checked; } }), el("span", { texto: "Vantagem tática (+1 passo)" })]),
          el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) { st.opcoes.naoLetal = ev.currentTarget.checked; } }), el("span", { texto: "Dano não letal com arma letal (−2 passos)" })]),
        ]) : null,
        st.acao === "defender" ? el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) { st.opcoes.comLuta = ev.currentTarget.checked; } }), el("span", { texto: "Contra corpo a corpo: usar Luta no lugar de Acrobacia" })]) : null,
        temProntidao ? UI().campo({ rotulo: "Prontidão: agir numa fase posterior", tipo: "selecao", valor: st.naFase, opcoes: [{ valor: "", rotulo: "Na fase da ação" }].concat(c.ordemFases.map(function (f) { return { valor: f, rotulo: K().FASES[f].nome }; })), aoMudar: function (v) { st.naFase = v; } }) : null,
        ["preparar", "habilidade", "outra"].indexOf(st.acao) >= 0 ? UI().campo({ rotulo: st.acao === "preparar" ? "A ação e o evento que a dispara" : "Descreva", tipo: "area", linhas: 2, limite: 400, aoMudar: function (v) { st.descricao = v; } }) : null,
      ]);
    }
    desenhar();
    UI().modal({ titulo: "Declarar ação — rodada " + c.rodada, classe: "o2-janela", largo: true, conteudo: [corpo], botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Declarar", classe: "r-botao--principal", aoClicar: function (f) {
      f(); op(ctx, { tipo: "declarar", acao: st.acao, alvo: st.alvo, arma: st.arma, naFase: st.naFase || undefined, opcoes: st.opcoes, descricao: st.descricao });
    } }] });
  }

  function minijogos(ctx) {
    var x = b(ctx);
    var acro = R().pericia(x, "acrobacia");
    var nDados = MO().dadosDeEquilibrio(acro ? R().dadoDaPericia(x, acro) : 4);
    var eq = { restam: nDados, a: 0, b: 0, log: [] };
    var area = el("div.pilha");
    function rolarEquilibrio() {
      eq.a = T().rolador(10); eq.b = T().rolador(10);
      eq.log.push("2d10: " + eq.a + " e " + eq.b + (MO().equilibrado(eq.a, eq.b) ? " — equilibrado." : " — caindo!"));
      desenhar();
    }
    function usarDado(qual) {
      if (eq.restam <= 0) return;
      eq.restam--;
      var d = T().rolador(4);
      if (qual === "a") eq.a += d; else eq.b += d;
      eq.log.push("Dado de equilíbrio d4 = " + d + " no " + (qual === "a" ? "primeiro" : "segundo") + " → " + eq.a + " e " + eq.b + (MO().equilibrado(eq.a, eq.b) ? " — equilibrado." : " — ainda caindo."));
      desenhar();
    }
    function desenhar() {
      U.trocar(area, [
        el("h4.t-secao", { texto: "Teste de Equilíbrio (Beta p. 17)" }),
        el("p.t-mini", { texto: "Dados de equilíbrio: " + eq.restam + " de " + nDados + " (d4; metade da Acrobacia). Iguais ou com 1 de diferença: equilibrado." }),
        el("div.faixa", {}, [
          botao("Rolar 2d10", rolarEquilibrio),
          botao("d4 no primeiro", function () { usarDado("a"); }, { motivo: !eq.a ? "Role os 2d10 primeiro." : eq.restam <= 0 ? "Acabaram os dados de equilíbrio." : "" }),
          botao("d4 no segundo", function () { usarDado("b"); }, { motivo: !eq.a ? "Role os 2d10 primeiro." : eq.restam <= 0 ? "Acabaram os dados de equilíbrio." : "" }),
          botao("Nova travessia", function () { eq.restam = nDados; eq.a = eq.b = 0; eq.log = []; desenhar(); }),
        ]),
        eq.log.length ? el("ol.o2-historico", {}, eq.log.slice(-6).map(function (t) { return el("li.t-mini", { texto: t }); })) : null,
        el("h4.t-secao", { texto: "Destrancar" }),
        el("p.t-mini", { texto: "Tentativas por rodada pelo seu Crime: " + MO().tentativasDeDestrancar(R().pericia(x, "crime") ? R().dadoDaPericia(x, R().pericia(x, "crime")) : 4) + ". " + K().MINIJOGOS.destrancar.texto }),
        el("ul.pilha.pilha--curta", {}, ["arrombar", "alcancarSeguro", "alcancarArriscado", "sustentar", "hackTecnico", "hackSocial"].map(function (k) { var mj = K().MINIJOGOS[k]; return el("li.t-mini", {}, [el("strong", { texto: mj.nome + " (" + K().referencia(mj.fonte, mj.pagina) + "). " }), el("span", { texto: mj.texto })]); })),
      ]);
    }
    desenhar();
    return area;
  }

  /* =================================================================
     RELAÇÕES
     ================================================================= */
  function abaRelacoes(ctx) {
    var x = b(ctx);
    var ed = edita(ctx);
    var m = J().modo(ctx);
    var e = m === "campanha" ? J().estado(ctx) : null;
    var chave = e ? "m" + e.missao.numero : "l" + x.estado.missaoLocal;
    var fichas = personagensDaMesa(ctx).filter(function (p) { return p.id !== J().pid(ctx); });
    return el("div.o2-aba", {}, [
      el("p.t-mini", { texto: "Invoque uma relação descrevendo o que sente e como isso o ajuda (Beta p. 24). Uma vez por relação por missão; o início de uma missão renova. " + (e ? "Missão " + e.missao.numero + "." : "Missão local " + x.estado.missaoLocal + " (o botão Nova missão fica no topo).") }),
      el("div.o2-relacoes", {}, x.relacoes.map(function (r) {
        var g = r.grau ? K().GRAUS_RELACAO[r.grau] : null;
        var usada = r.usadaEm === chave;
        var mot = !pode(ctx) ? "Só leitura." : !r.grau ? "Escolha o grau (o rótulo da ficha não define grau)." : usada ? "Já invocada nesta missão." : "";
        return el("article.o2-relacao", {}, [
          el("header.o2-relacao__topo", {}, [el("h3", { texto: r.nome || "Relação" }), r.rotulo ? el("span.r-etiqueta", { texto: r.rotulo }) : null, g ? el("span.r-etiqueta.o2-grau", { texto: "Grau " + r.grau + " · " + g.nome }) : null, usada ? el("span.r-etiqueta.r-etiqueta--aviso", { texto: "usada nesta missão" }) : null]),
          ed ? el("div.o2-criar__campos", {}, [
            UI().campo({ rotulo: "Nome", valor: r.nome, limite: 80, aoMudar: function (v) { r.nome = String(v).slice(0, 80); ctx.alterou(); } }),
            UI().campo({ rotulo: "Rótulo (da ficha)", valor: r.rotulo, limite: 60, aoMudar: function (v) { r.rotulo = String(v).slice(0, 60); ctx.alterou(); } }),
          ]) : null,
          ed ? UI().campo({ rotulo: "Descrição", tipo: "area", linhas: 2, valor: r.descricao, limite: 600, aoMudar: function (v) { r.descricao = String(v).slice(0, 600); ctx.alterou(); } }) : el("p", { texto: r.descricao }),
          el("div.o2-criar__campos", {}, [
            UI().campo({ rotulo: "Grau", tipo: "selecao", valor: String(r.grau), desabilitado: !ctx.podeEditar(), opcoes: [{ valor: "0", rotulo: "Sem grau" }, { valor: "1", rotulo: "1 · Afinidade" }, { valor: "2", rotulo: "2 · Vínculo" }, { valor: "3", rotulo: "3 · Devoção" }], aoMudar: function (v) { r.grau = Number(v); alterou(ctx); } }),
            fichas.length ? UI().campo({ rotulo: "Ficha da mesa (opcional)", tipo: "selecao", valor: r.alvoPersonagemId, desabilitado: !ctx.podeEditar(), opcoes: [{ valor: "", rotulo: "Nenhuma" }].concat(fichas.map(function (p) { return { valor: p.id, rotulo: p.nome }; })), ajuda: "Liga a relação a outra ficha (só o nome é compartilhado).", aoMudar: function (v) { r.alvoPersonagemId = v; alterou(ctx); } }) : null,
          ]),
          g ? el("div.faixa", {}, [
            botao("+d" + g.dado + " num teste ligado a " + (r.nome || "ela"), function () { op(ctx, { tipo: "invocarRelacao", relacao: r.id, beneficio: "teste" }); }, { motivo: mot }),
            g.recuperar ? botao("Motivar (ação): " + g.recuperar + " PD", function () { op(ctx, { tipo: "invocarRelacao", relacao: r.id, beneficio: "motivar" }); }, { motivo: mot }) : null,
            g.acaoExtra ? botao("Ação extra para ajudá-la em perigo", function () { op(ctx, { tipo: "invocarRelacao", relacao: r.id, beneficio: "acaoExtra" }); }, { motivo: mot }) : null,
          ]) : null,
          g ? el("p.t-mini", { texto: "Na ação Ajudar, a relação dá +d" + g.dado + " no teste dela (além do passo)." }) : null,
          ed ? botao("Remover relação", function () { x.relacoes = x.relacoes.filter(function (y) { return y.id !== r.id; }); alterou(ctx, true); }, { classe: "r-botao--perigo" }) : null,
        ]);
      })),
      ctx.podeEditar() ? botao("+ Relação", function () { x.relacoes.push(R().normalizarRelacao({ nome: "Nova relação" })); alterou(ctx, true); }) : null,
    ]);
  }

  /* =================================================================
     INVENTÁRIO
     ================================================================= */
  function abaInventario(ctx) {
    var x = b(ctx);
    var ed = edita(ctx);
    return el("div.o2-aba", {}, [
      el("p.t-mini", { texto: "Armas guardam o dano da ficha (RA + modificador); armaduras dão pontos (−10 de dano por ponto, um por ocorrência, sem recuperação neste playtest). Nada de categoria, crédito ou espaço de Ordem I." }),
      el("div.o2-itens", {}, x.itens.map(function (i) {
        return el("article.o2-item", {}, [
          ed ? el("div.o2-criar__campos", {}, [
            UI().campo({ rotulo: "Nome", valor: i.nome, limite: 120, aoMudar: function (v) { i.nome = String(v).slice(0, 120) || "Item"; ctx.alterou(); } }),
            UI().campo({ rotulo: "Tipo", tipo: "selecao", valor: i.tipo, opcoes: [{ valor: "item", rotulo: "Item" }, { valor: "arma", rotulo: "Arma" }], aoMudar: function (v) { i.tipo = v; alterou(ctx, true); } }),
            i.tipo === "arma" ? UI().campo({ rotulo: "Alcance", tipo: "selecao", valor: i.alcance, opcoes: [{ valor: "corpo", rotulo: "Corpo a corpo" }, { valor: "distancia", rotulo: "À distância" }], aoMudar: function (v) { i.alcance = v; alterou(ctx); } }) : null,
            i.tipo === "arma" ? UI().campo({ rotulo: "Dano (RA +)", tipo: "numero", valor: String(i.dano), aoMudar: function (v) { i.dano = U.inteiro(v, 0); alterou(ctx); } }) : null,
            i.tipo === "arma" ? UI().campo({ rotulo: "Categoria", tipo: "selecao", valor: i.categoria, opcoes: [{ valor: "", rotulo: "—" }, { valor: "fogo", rotulo: "Arma de fogo" }], aoMudar: function (v) { i.categoria = v; alterou(ctx); } }) : null,
            UI().campo({ rotulo: "Pontos de armadura", tipo: "numero", valor: String(i.armadura), aoMudar: function (v) { i.armadura = Math.max(0, U.inteiro(v, 0)); alterou(ctx); } }),
            i.quantidade !== null || i.consumivel ? UI().campo({ rotulo: "Quantidade", tipo: "numero", valor: String(i.quantidade || 0), aoMudar: function (v) { i.quantidade = Math.max(0, U.inteiro(v, 0)); alterou(ctx); } }) : null,
          ]) : el("header.o2-item__topo", {}, [el("strong", { texto: i.nome }), el("span.t-mini", { texto: [i.tipo === "arma" ? (i.alcance === "distancia" ? "à distância" : "corpo a corpo") + ", RA" + (i.dano >= 0 ? "+" : "") + i.dano : "", i.categoria === "fogo" ? "arma de fogo" : "", i.armadura ? i.armadura + " ponto(s) de armadura" : "", i.quantidade !== null ? "×" + i.quantidade : ""].filter(Boolean).join(" · ") })]),
          i.especial ? el("p.t-mini", { texto: i.especial }) : null,
          i.armadura || Object.keys(i.passos).length ? el("label.r-marca", {}, [el("input", { type: "checkbox", checked: i.vestido, disabled: !ctx.podeEditar(), onchange: function (ev) { i.vestido = ev.currentTarget.checked; alterou(ctx); } }), el("span", { texto: "Vestido/empunhado" + (Object.keys(i.passos).length ? " (" + Object.keys(i.passos).map(function (k) { return K().nomeDaPericia(x.perfilRegras, k, x.ambientacao) + " " + (i.passos[k] > 0 ? "+" : "") + i.passos[k] + " passo"; }).join(", ") + ")" : "") })]) : null,
          ed ? botao("Remover", function () { x.itens = x.itens.filter(function (y) { return y.id !== i.id; }); alterou(ctx, true); }, { classe: "r-botao--perigo" }) : null,
        ]);
      })),
      ctx.podeEditar() ? el("div.faixa", {}, [
        botao("+ Item", function () { x.itens.push(R().normalizarItem({ nome: "Novo item" })); alterou(ctx, true); }),
        botao("+ Arma", function () { x.itens.push(R().normalizarItem({ nome: "Nova arma", tipo: "arma", dano: 1 })); alterou(ctx, true); }),
      ]) : null,
    ]);
  }

  global.RAMASecaoOrdem2 = { blocoSuperior: blocoSuperior, aba: abaPericias };
  global.RAMASecaoOrdem2Habilidades = { aba: abaHabilidades };
  global.RAMASecaoOrdem2Investigacao = { aba: abaInvestigacao };
  global.RAMASecaoOrdem2Combate = { aba: abaCombate };
  global.RAMASecaoOrdem2Relacoes = { aba: abaRelacoes };
  global.RAMASecaoOrdem2Inventario = { aba: abaInventario };
})(window);
