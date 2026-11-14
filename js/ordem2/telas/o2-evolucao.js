/* =====================================================================
   R.A.M.A. — Ordem Paranormal RPG II · progressão (v9.3)
   Progressão experimental do RAMA
   ---------------------------------------------------------------------
   Um caminho só para o nível mudar depois da criação: as operações da
   mesa (js/ordem2/evolucao.js). Nada aqui escreve em `nivel`.

     no topo da ficha   ao lado do NÍVEL: "Ver progressão" ou a ação
                        pendente ("Escolher melhoria para o nível 4")
     aba Evolução       nível atual e próximo, o estado e UMA ação
                        principal; a escolha com prévia específica
                        ("Mente d8 → d10", "PV máx. 16 → 18; PV atuais
                        continuam 9"); a trilha 1–10 em lista; o
                        histórico com desfazer (o último aplicável); o
                        modo (ficha avulsa) e o NEX em detalhes
     na mesa do Mestre  liberar o marco, aprovar/recusar a habilidade,
                        cancelar o marco, definir nível (livre), desfazer;
                        e a configuração da campanha

   Quem não pode agir vê o estado, sem controles. Ficha vinculada a uma
   campanha que ainda carrega (ou que não abriu a mesa de Ordem II) não
   ganha controles locais.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el;
  function UI() { return global.RAMAUI; }
  function K() { return global.RAMAOrdem2Catalogo; }
  function R() { return global.RAMAOrdem2; }
  function T() { return global.RAMAOrdem2Tela; }
  function J() { return global.RAMAOrdem2Jogo; }
  function EV() { return global.RAMAOrdem2Evolucao; }
  function botao(t, fn, o) { return T().botao(t, fn, o); }
  function linha(t) { return el("p.t-mini", { texto: t }); }
  function data(q) { return String(q || "").slice(0, 10).split("-").reverse().join("/"); }
  var SELO = "Progressão experimental do RAMA";

  /* =================================================================
     O CONTEXTO: quem pode o quê nesta ficha, agora
     ================================================================= */
  function contexto(ctx) {
    var x = ctx.ficha.ordem2;
    var m = J().modo(ctx);
    var vinculada = !!(ctx.ficha.campanhaId);
    var bloqueado = vinculada && (m === "carregando" || m === "outra");
    var e = m === "carregando" ? null : J().estado(ctx);
    var cfg = EV().configDaMesa(e || {});
    var mestre = m === "campanha" && J().ehMestre(ctx);
    var local = m === "local";
    var dono = ctx.podeEditar();
    return {
      x: x, evo: x.evolucao, cfg: cfg, modo: m, bloqueado: bloqueado, local: local, campanha: m === "campanha",
      mestre: mestre,
      /* quem conduz o marco (subir, definir, cancelar, desfazer) */
      conduz: !bloqueado && (local ? dono : mestre),
      /* quem escolhe a melhoria */
      escolhe: !bloqueado && (dono || mestre),
    };
  }
  function pid(ctx) { return J().pid(ctx); }
  /* Uma ação de progressão. Um rádio ou campo desta aba com foco faz a
     ficha achar que há edição em curso e não recarregar a versão do
     servidor: o foco sai dele antes e vai para o estado depois. */
  function operar(ctx, op, opcoes) {
    var a = document.activeElement;
    if (a && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName) && a.closest(".o2-evolucao")) a.blur();
    return J().operar(ctx, op, opcoes).then(function (r) {
      setTimeout(function () { var e = document.querySelector(".o2-evo-topo__estado"); if (e && r && r.ok !== false) e.focus(); }, 400);
      return r;
    });
  }
  function irParaAba(ctx) { if (ctx.irParaAba) ctx.irParaAba("evolucao"); }

  /* O estado em uma frase, e a ação principal. */
  function situacao(c) {
    var x = c.x, p = c.evo.pendente;
    if (c.bloqueado) return { texto: c.modo === "carregando" ? "Abrindo a mesa da campanha…" : "A campanha desta ficha não abriu a mesa de Ordem II: a progressão fica parada até ela abrir.", acao: null };
    if (p && p.proposta) return { texto: "Nível " + p.nivelAntes + " → " + p.nivelDepois + " · Aguardando aprovação do Mestre (" + p.proposta.rotulo + ").", acao: null, pendente: true };
    if (p) return { texto: "Nível " + p.nivelAntes + " → " + p.nivelDepois + " · Escolher uma melhoria.", acao: c.escolhe ? "Escolher melhoria para o nível " + p.nivelDepois : null, pendente: true };
    if (x.nivel >= 10) return { texto: "Nível máximo atingido.", acao: null };
    if (c.cfg.modo === "livre") return { texto: c.local ? "Modo livre: você define o nível (fica registrado, sem ganhos automáticos)." : "Modo livre: o Mestre define o nível.", acao: null };
    if (c.local) return { texto: "Por marcos: quando a história pedir, suba de nível e escolha uma melhoria.", acao: c.conduz ? "Subir de nível" : null };
    return { texto: c.mestre ? "Por marcos: libere o marco quando a história pedir." : "Aguardando o próximo marco do Mestre.", acao: c.mestre ? "Liberar o marco (nível " + x.nivel + " → " + (x.nivel + 1) + ")" : null };
  }

  /* =================================================================
     NO TOPO E NA ABA FICHA
     ================================================================= */
  function acaoNoTopo(ctx) {
    var c = contexto(ctx), s = situacao(c);
    var rot = s.pendente && s.acao ? s.acao : "Ver progressão";
    return el("button.o2-nivel__acao" + (s.pendente ? ".o2-nivel__acao--pendente" : ""), { type: "button", onclick: function () { irParaAba(ctx); } }, [el("span", { texto: rot })]);
  }
  function cartao(ctx) {
    var c = contexto(ctx), s = situacao(c), x = c.x;
    return el("section.o2-evo-cartao", { "aria-label": "Nível e progressão" }, [
      el("p.o2-evo-cartao__niveis", {}, [el("strong", { texto: "Nível " + x.nivel }), el("span", { texto: x.nivel < 10 ? " · próximo: " + (x.nivel + 1) : " · máximo" })]),
      el("p.t-mini", { texto: s.texto }),
      botao(s.pendente && s.acao ? s.acao : "Ver progressão", function () { irParaAba(ctx); }, { classe: s.pendente ? "r-botao--principal" : "" }),
    ]);
  }

  /* =================================================================
     A ABA EVOLUÇÃO
     ================================================================= */
  function aba(ctx) {
    var c = contexto(ctx);
    if (c.modo === "carregando" && ctx.ficha.campanhaId) return UI().carregando("Abrindo a mesa");
    var x = c.x, s = situacao(c);
    var partes = [];
    partes.push(el("section.o2-evo-topo", { "aria-label": "Situação" }, [
      el("div.o2-evo-topo__niveis", {}, [
        el("div.o2-evo-nivel", {}, [el("span.o2-evo-nivel__rotulo", { texto: "Nível atual" }), el("span.o2-evo-nivel__valor", { texto: String(x.nivel) })]),
        el("div.o2-evo-nivel", {}, [el("span.o2-evo-nivel__rotulo", { texto: "Próximo" }), el("span.o2-evo-nivel__valor", { texto: x.nivel < 10 ? String(x.nivel + 1) : "—" })]),
      ]),
      el("p.o2-evo-topo__estado", { role: "status", tabindex: "-1", texto: s.texto }),
      acaoPrincipal(ctx, c, s),
    ]));
    if (c.evo.pendente && !c.evo.pendente.proposta && c.escolhe && !c.bloqueado) partes.push(escolha(ctx, c));
    if (c.evo.pendente && c.mestre) partes.push(el("div.faixa", {}, [
      c.evo.pendente.proposta ? botao("Aprovar a habilidade", function () { operar(ctx, { tipo: "aprovarHabilidade", personagem: pid(ctx), pendente: c.evo.pendente.id }); }, { classe: "r-botao--principal" }) : null,
      c.evo.pendente.proposta ? botao("Recusar (volta para a escolha)", function () { operar(ctx, { tipo: "aprovarHabilidade", personagem: pid(ctx), pendente: c.evo.pendente.id, aprovar: false }); }) : null,
      botao("Cancelar o marco", function () { cancelar(ctx, c); }),
    ]));
    if (c.evo.pendente && c.local && c.conduz) partes.push(el("div.faixa", {}, [botao("Cancelar o marco (volta ao nível " + c.evo.pendente.nivelAntes + ", sem ganhos)", function () { cancelar(ctx, c); })]));
    if (R().presetDesatualizado(x) && ctx.podeEditar() && !c.bloqueado) partes.push(el("div.o2-aviso", {}, [el("span", { texto: "Os dados da ficha pronta mudaram depois da cópia. " }), botao("Ver a atualização…", function () { abrirAtualizacao(ctx); })]));
    partes.push(trilha(ctx, c));
    partes.push(historico(ctx, c));
    partes.push(modo(ctx, c));
    partes.push(UI().recolhivel({ titulo: "NEX e patamar (anotações)", conteudo: el("div.pilha", {}, [
      linha("NEX não existe nos playtests: fica como anotação, sem efeito nas regras. O patamar é um campo à parte (Identidade, na aba Ficha) e nunca muda pelo nível."),
      UI().campo({ rotulo: "NEX (anotação)", valor: c.evo.nex, limite: 20, desabilitado: !(ctx.podeEditar() || c.mestre) || c.bloqueado, aoMudar: function (v) { operar(ctx, { tipo: "nex", valor: v }, { silencioso: true }); } }),
      el("p.t-mini", { texto: "Patamar registrado: " + K().PATAMARES[x.patamar || ""].nome + "." }),
    ]) }));
    return el("div.o2-aba.o2-evolucao", {}, partes);
  }

  /* Atualizar da ficha pronta: só com prévia e confirmação; os registros
     de evolução ficam (v9.2). */
  function abrirAtualizacao(ctx) {
    var x = ctx.ficha.ordem2;
    var p = EV().previaAtualizacao(x);
    if (!p.ok) { UI().avisoAtencao(p.motivo); return; }
    UI().modal({ titulo: "Atualizar da ficha pronta", classe: "o2-janela", conteudo: [el("div.pilha", {}, [
      linha("Os valores impressos passam para a versão nova. Registros de evolução, histórico, dano, lesões e itens ficam como estão; a mudança vai para o histórico."),
      p.diferencas.length ? el("ul", {}, p.diferencas.map(function (t) { return el("li", { texto: t }); })) : linha("Sem diferenças nos números."),
    ])], botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Atualizar", classe: "r-botao--principal", aoClicar: function (f) { var r = EV().aplicarAtualizacao(x, true); f(); if (!r.ok) { UI().avisoAtencao(r.motivo); return; } ctx.alterou(); ctx.redesenhar(); UI().avisoOk("Ficha atualizada; registros preservados."); } }] });
  }

  function acaoPrincipal(ctx, c, s) {
    var x = c.x;
    if (!s.acao || c.bloqueado) return null;
    if (c.evo.pendente) return botao(s.acao, function () { var alvo = document.getElementById("o2-evo-escolha"); if (alvo) { alvo.scrollIntoView({ block: "start" }); var f = alvo.querySelector("input, select, button"); if (f) f.focus(); } }, { classe: "r-botao--principal", grande: true });
    return botao(s.acao, function () {
      UI().confirmar({ titulo: s.acao, texto: "Nível " + x.nivel + " → " + (x.nivel + 1) + ". O nível só muda quando a melhoria for escolhida e confirmada; cancelar o marco não concede nada.", rotuloConfirmar: c.local ? "Subir" : "Liberar" }).then(function (ok) { if (ok) operar(ctx, { tipo: "subirNivel", personagem: pid(ctx), nivelAntes: x.nivel }); });
    }, { classe: "r-botao--principal", grande: true });
  }
  function cancelar(ctx, c) {
    UI().confirmar({ titulo: "Cancelar o marco", texto: "Volta ao estado anterior, sem conceder nada.", rotuloConfirmar: "Cancelar o marco" }).then(function (ok) { if (ok) operar(ctx, { tipo: "cancelarSubida", personagem: pid(ctx), pendente: c.evo.pendente.id }); });
  }

  /* A escolha: opções legíveis, prévia específica, indisponível com o
     motivo escrito na própria opção. */
  function escolha(ctx, c) {
    var x = c.x, pend = c.evo.pendente, cfg = pend.config;
    var versao = x.perfilRegras === "beta-vigilia" ? "beta" : "alpha";
    var st = { tipo: "", chave: "", habilidade: { ref: "", nome: "", texto: "" } };
    var area = el("div.pilha");
    var raiz = el("section.o2-evo-escolha", { id: "o2-evo-escolha", "aria-label": "Escolher uma melhoria" }, [area]);
    function opcao(tipo, chave, rotulo, desc) {
      var pv = EV().previa(x, { tipo: tipo, chave: chave, habilidade: st.habilidade }, cfg);
      var marcado = st.tipo === tipo && (st.chave === chave || tipo === "pv" || tipo === "pd");
      var id = "o2-op-" + tipo + "-" + String(chave).replace(/[^a-z0-9]/gi, "");
      return el("label.o2-evo-opcao" + (pv.ok ? "" : ".o2-evo-opcao--indisponivel"), { for: id }, [
        el("input", { type: "radio", name: "o2-evo-op", id: id, checked: marcado, disabled: !pv.ok, onchange: function () { st.tipo = tipo; st.chave = chave; desenhar(id); } }),
        el("span.o2-evo-opcao__texto", {}, [el("strong", { texto: rotulo }), el("span.t-mini", { texto: pv.ok ? " — " + pv.rotulo : " — indisponível: " + pv.motivo }), desc ? el("span.t-mini", { texto: " " + desc }) : null]),
      ]);
    }
    function desenhar(foco) {
      var pv = st.tipo ? EV().previa(x, st, cfg) : null;
      var pericias = x.base.pericias.map(function (p) { var k = EV().chaveDaPericia(p); var q = EV().previa(x, { tipo: "pericia", chave: k }, cfg); return { valor: k, rotulo: R().nomeDaPericia(x, p) + (q.ok ? ": " + q.rotulo.split(": ").slice(1).join(": ") : " d" + EV().permanentePericia(x, p) + " — no teto (d" + cfg.teto + ")"), ok: q.ok }; });
      U.trocar(area, [
        el("h3.o2-tag-titulo", { texto: "Nível " + pend.nivelAntes + " → " + pend.nivelDepois + " · Escolher uma melhoria" }),
        linha(SELO + ": uma melhoria por marco. Os passos param no teto d" + cfg.teto + " (o valor permanente, sem bônus temporários) e nunca chegam a d20; aumentar um máximo não recupera os pontos atuais."),
        el("fieldset.o2-evo-grupo", {}, [el("legend", { texto: "Atributo (+1 passo)" })].concat(K().ORDEM_ATRIBUTOS.map(function (k) { return opcao("atributo", k, K().ATRIBUTOS[k].nome); }))),
        el("fieldset.o2-evo-grupo", {}, [
          el("legend", { texto: "Perícia (+1 passo)" }),
          UI().campo({ rotulo: "Perícia", tipo: "selecao", valor: st.tipo === "pericia" ? st.chave : "", opcoes: [{ valor: "", rotulo: "Escolha uma perícia…" }].concat(pericias.map(function (p) { return { valor: p.valor, rotulo: p.rotulo }; })), aoMudar: function (v) { var p = pericias.filter(function (q) { return q.valor === v; })[0]; if (p && !p.ok) { UI().avisoAtencao("Essa perícia já está no teto."); return; } st.tipo = v ? "pericia" : ""; st.chave = v; desenhar(); } }),
        ]),
        el("fieldset.o2-evo-grupo", {}, [el("legend", { texto: "Recursos" }), opcao("pv", "", "+" + cfg.pvPorEscolha + " PV máximos"), opcao("pd", "", "+" + cfg.pdPorEscolha + " PD máximos")]),
        el("fieldset.o2-evo-grupo", {}, [
          el("legend", { texto: "Habilidade" + (c.local || c.mestre ? "" : " (o Mestre aprova)") }),
          el("label.r-marca", {}, [el("input", { type: "radio", name: "o2-evo-op", checked: st.tipo === "habilidade", onchange: function () { st.tipo = "habilidade"; st.chave = ""; desenhar(); } }), el("span", { texto: "Uma habilidade nova" })]),
          st.tipo === "habilidade" ? el("div.o2-criar__campos", {}, [
            UI().campo({ rotulo: "Do catálogo (" + (versao === "beta" ? "Beta" : "Alpha") + ")", tipo: "selecao", valor: st.habilidade.ref, opcoes: [{ valor: "", rotulo: "Uma personalizada…" }].concat(Object.keys(K().HABILIDADES).filter(function (k) { var h = K().HABILIDADES[k]; return (h.versao === versao || h.versao === "ambas") && !x.habilidades.some(function (y) { return y.ref === k; }); }).map(function (k) { return { valor: k, rotulo: K().HABILIDADES[k].nome }; })), aoMudar: function (v) { st.habilidade.ref = v; desenhar(); } }),
            !st.habilidade.ref ? UI().campo({ rotulo: "Nome", valor: st.habilidade.nome, limite: 80, aoDigitar: true, aoMudar: function (v) { st.habilidade.nome = v; } }) : null,
            !st.habilidade.ref ? UI().campo({ rotulo: "Efeito", tipo: "area", linhas: 2, valor: st.habilidade.texto, limite: 1200, aoDigitar: true, aoMudar: function (v) { st.habilidade.texto = v; } }) : null,
            st.habilidade.ref ? linha(K().HABILIDADES[st.habilidade.ref].texto + (R().motorDe({ ref: st.habilidade.ref }) ? " (com automação)" : "")) : linha("Uma personalizada só automatiza o que estiver estruturado; o resto é narrativo."),
          ]) : null,
        ]),
        pv ? (pv.ok ? el("p.o2-antes-depois", { role: "status", texto: "Prévia: " + pv.rotulo + (pv.precisaAprovar && !(c.local || c.mestre) ? " — vai para a aprovação do Mestre" : "") }) : el("p.o2-motivo", { role: "status", texto: pv.motivo })) : linha("Escolha uma opção para ver a prévia."),
        botao(st.tipo === "habilidade" && !(c.local || c.mestre) ? "Propor ao Mestre" : "Confirmar a melhoria", function () {
          var v = EV().previa(x, st, cfg);
          if (!v.ok) { UI().avisoAtencao(v.motivo); return; }
          operar(ctx, { tipo: "escolherMelhoria", pendente: pend.id, escolha: { tipo: st.tipo, chave: st.chave, habilidade: st.habilidade } });
        }, { classe: "r-botao--principal", motivo: !st.tipo ? "Escolha uma opção." : "" }),
      ]);
      if (foco) { var f = document.getElementById(foco); if (f) f.focus(); }
    }
    desenhar();
    return raiz;
  }

  /* A trilha 1–10, um nível por linha (sem rolagem lateral). */
  function trilha(ctx, c) {
    var x = c.x;
    var itens = EV().trilha(x).map(function (t) {
      var txt;
      if (t.registro) txt = t.registro.ganhos.length ? t.registro.ganhos.map(function (g) { return EV().rotuloGanho(g, x); }).join("; ") : (t.registro.nota || "nível definido (sem ganhos automáticos)");
      else if (t.estado === "passado" || t.estado === "atual") txt = t.nivel === 1 ? "Nível inicial, com as habilidades iniciais" : "Já na ficha antes dos registros (valores impressos ou da criação)";
      else if (t.estado === "pendente") txt = "Marco liberado: escolher uma melhoria";
      else txt = c.cfg.modo === "marcos" ? (t.nivel === 10 ? "Última melhoria à escolha; nível máximo" : "Uma melhoria à escolha") : "O Mestre define (modo livre)";
      var marca = { passado: "✓", atual: "▶", pendente: "…", futuro: "○" }[t.estado];
      var nome = { passado: "concluído", atual: "atual", pendente: "pendente", futuro: "a seguir" }[t.estado];
      return el("li.o2-trilha-nivel.o2-trilha-nivel--" + t.estado, { "aria-current": t.estado === "atual" ? "step" : null }, [
        el("span.o2-trilha-nivel__n", { "aria-hidden": "true", texto: marca + " " + t.nivel }),
        el("span.o2-trilha-nivel__txt", {}, [el("strong", { texto: "Nível " + t.nivel + " (" + nome + "): " }), el("span", { texto: txt })]),
      ]);
    });
    return UI().painel(SELO, el("div.pilha", {}, [
      linha("Os playtests não trazem uma tabela de evolução. " + (c.cfg.modo === "marcos" ? "Por marcos: de 2 a 10, cada subida dá uma melhoria à escolha — +1 passo num atributo, +1 passo numa perícia, +" + c.cfg.pvPorEscolha + " PV máx., +" + c.cfg.pdPorEscolha + " PD máx. ou uma habilidade aprovada." : "Modo livre: as mudanças de nível são explícitas e registradas, sem ganhos automáticos.")),
      el("ol.o2-trilha-niveis", {}, itens),
      UI().recolhivel({ titulo: "Sugestão de patamar para a mesa (experimental, não aplicada)", conteudo: el("div.pilha", {}, [
        el("ul.pilha.pilha--curta", {}, [["1 a 3", "Iniciante"], ["4 a 6", "Veterano"], ["7 a 9", "Elite"], ["10", "Lenda"]].map(function (l) { return el("li.t-mini", { texto: "Níveis " + l[0] + ": " + l[1] }); })),
        linha("Só o patamar registrado na ficha vale para lesão e trauma; o nível não o muda."),
      ]) }),
    ]));
  }

  function historico(ctx, c) {
    var x = c.x, regs = c.evo.registros.slice().reverse();
    var alvo = c.evo.pendente ? null : EV().desfazivel(x);
    return UI().painel("Histórico", regs.length ? el("ol.o2-registros", {}, regs.map(function (r) {
      var origem = r.modo === "marcos" ? "por marcos" + (r.procedencia && r.procedencia !== "marcos" ? " (" + r.procedencia + ")" : "") : "modo livre";
      return el("li.o2-registro" + (r.desfeito ? ".o2-registro--desfeito" : ""), {}, [
        el("strong", { texto: "Nível " + r.nivelAntes + " → " + r.nivelDepois + (r.desfeito ? " (desfeito em " + data(r.desfeitoEm) + ")" : "") }),
        el("span", { texto: " · " + (r.ganhos.map(function (g) { return EV().rotuloGanho(g, x); }).join("; ") || r.nota || "sem ganhos") }),
        el("span.t-mini", { texto: " · " + data(r.quando) + " · " + origem }),
        c.conduz && alvo && alvo.id === r.id ? botao("Desfazer…", function () { desfazer(ctx, c, r); }) : null,
      ]);
    })) : linha("Nenhuma mudança de nível registrada ainda."));
  }
  function desfazer(ctx, c, r) {
    var x = c.x;
    var linhas = r.ganhos.map(function (g) {
      if (g.tipo === "pv" || g.tipo === "pd") { var atual = x.recursos[g.tipo].atual, max = Number(g.de); return g.tipo.toUpperCase() + " máx. " + g.para + " → " + g.de + (atual > max ? "; atuais " + atual + " → " + max : "; atuais continuam " + atual); }
      if (g.tipo === "habilidade") return "Sai a habilidade " + g.para;
      return EV().rotuloGanho(g, x).replace(/(d\d+) → (d\d+)/, "$2 → $1");
    });
    UI().modal({ titulo: "Desfazer nível " + r.nivelAntes + " → " + r.nivelDepois, classe: "o2-janela", conteudo: [el("div.pilha", {}, [
      el("ul", {}, (linhas.length ? linhas : ["Só o nível"]).map(function (t) { return el("li", { texto: t }); }).concat([el("li", { texto: "Nível " + r.nivelDepois + " → " + r.nivelAntes })])),
      linha("Desfazer tira só os ganhos deste registro. Não recupera dano, PD gastos nem estados antigos."),
    ])], botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Desfazer", classe: "r-botao--perigo", aoClicar: function (f) { f(); operar(ctx, { tipo: "desfazerEvolucao", personagem: pid(ctx), registro: r.id }); } }] });
  }

  function modo(ctx, c) {
    var x = c.x;
    if (!c.local) return UI().painel("Modo de evolução", el("div.pilha", {}, [
      linha((c.cfg.modo === "marcos" ? "Por marcos" : "Livre") + " — definido pelo Mestre na configuração da campanha." + (c.cfg.modo === "livre" ? " O Mestre pode ativar \"por marcos\" ali (recomendado para campanhas novas)." : "")),
      c.mestre && c.cfg.modo === "livre" ? nivelLivre(ctx, c) : null,
    ]));
    var pode = c.conduz;
    return UI().painel("Modo de evolução (ficha sem campanha)", el("div.pilha", {}, [
      c.cfg.modo === "livre" ? el("p.o2-selo", {}, [el("strong", { texto: "Recomendado: Por marcos" }), el("span", { texto: " — uma melhoria à escolha em cada subida, com prévia e histórico. " })]) : null,
      pode ? el("div.faixa", {}, [
        c.cfg.modo === "livre" ? botao("Ativar \"por marcos\"", function () { operar(ctx, { tipo: "evolucaoConfigurar", config: { modo: "marcos" } }); }, { classe: "r-botao--principal" })
          : botao("Voltar ao modo livre", function () { operar(ctx, { tipo: "evolucaoConfigurar", config: { modo: "livre" } }); }, { motivo: c.evo.pendente ? "Há um marco pendente: resolva ou cancele antes." : "" }),
      ]) : linha("Modo: " + (c.cfg.modo === "marcos" ? "por marcos" : "livre") + "."),
      c.cfg.modo === "livre" && pode ? nivelLivre(ctx, c) : null,
      linha("Mudar o modo não mexe num marco pendente: ele segue a configuração do momento em que foi liberado."),
    ]));
  }
  function nivelLivre(ctx, c) {
    var x = c.x, st = { n: x.nivel, nota: "" };
    return el("div.o2-criar__campos", {}, [
      UI().campo({ rotulo: "Definir o nível (registrado, sem ganhos)", tipo: "selecao", valor: String(x.nivel), opcoes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (n) { return { valor: String(n), rotulo: String(n) }; }), aoMudar: function (v) { st.n = Number(v); } }),
      UI().campo({ rotulo: "Nota (o que muda na ficha)", limite: 300, aoDigitar: true, aoMudar: function (v) { st.nota = v; } }),
      botao("Definir", function () { if (st.n === x.nivel) { UI().avisoAtencao("O nível já é " + x.nivel + "."); return; } operar(ctx, { tipo: "definirNivel", personagem: pid(ctx), nivel: st.n, nota: st.nota }); }, { motivo: c.evo.pendente ? "Há um marco pendente: resolva ou cancele antes." : "" }),
    ]);
  }

  /* =================================================================
     NA MESA DO MESTRE   m = { estado, mestre, pcs, operar }
     ================================================================= */
  function mestrePersonagem(m, p) {
    var x = p.resumo || {};
    var evo = x.evolucao || { registros: [] };
    var cfg = EV().configDaMesa(m.estado);
    var pend = evo.pendente;
    var nivel = x.nivel || 1;
    var partes = [];
    var estado = pend ? (pend.proposta ? "Nível " + pend.nivelAntes + " → " + pend.nivelDepois + " · habilidade proposta: " + pend.proposta : "Nível " + pend.nivelAntes + " → " + pend.nivelDepois + " · aguardando a escolha de quem joga")
      : nivel >= 10 ? "Nível máximo atingido." : cfg.modo === "marcos" ? "Nível " + nivel + " · sem marco pendente." : "Nível " + nivel + " · modo livre.";
    partes.push(el("p.t-mini.o2-mesa__evo-estado", { role: "status", texto: "Progressão: " + estado }));
    partes.push(el("div.faixa", {}, [
      !pend && cfg.modo === "marcos" && nivel < 10 ? botao("Liberar o marco (" + nivel + " → " + (nivel + 1) + ")", function () { m.operar({ tipo: "subirNivel", personagem: p.id, nivelAntes: nivel }); }) : null,
      !pend && cfg.modo === "livre" ? botao("Definir nível…", function () { definirNivel(m, p, nivel); }) : null,
      pend && pend.proposta ? botao("Aprovar", function () { m.operar({ tipo: "aprovarHabilidade", personagem: p.id, pendente: pend.id }); }, { classe: "r-botao--principal" }) : null,
      pend && pend.proposta ? botao("Recusar", function () { m.operar({ tipo: "aprovarHabilidade", personagem: p.id, pendente: pend.id, aprovar: false }); }) : null,
      pend ? botao("Cancelar o marco", function () { UI().confirmar({ titulo: "Cancelar o marco de " + p.nome, texto: "Volta ao estado anterior, sem conceder nada.", rotuloConfirmar: "Cancelar o marco" }).then(function (ok) { if (ok) m.operar({ tipo: "cancelarSubida", personagem: p.id, pendente: pend.id }); }); }) : null,
    ]));
    var regs = (evo.registros || []).slice().reverse();
    if (regs.length) partes.push(UI().recolhivel({ titulo: "Histórico de evolução (" + regs.length + ")", conteudo: el("ul.pilha.pilha--curta", {}, regs.map(function (r) {
      return el("li", {}, [el("span", { texto: "Nível " + r.nivelAntes + " → " + r.nivelDepois + (r.desfeito ? " (desfeito)" : "") + ": " + (r.ganhos || "—") + " · " + data(r.quando) + " " }),
        !pend && evo.desfazivel === r.id ? botao("Desfazer…", function () { UI().confirmar({ titulo: "Desfazer nível " + r.nivelAntes + " → " + r.nivelDepois, texto: "Tira só os ganhos deste registro (" + (r.ganhos || "nenhum") + "). PV/PD atuais param no novo máximo; dano e PD gastos não voltam.", rotuloConfirmar: "Desfazer", perigo: true }).then(function (ok) { if (ok) m.operar({ tipo: "desfazerEvolucao", personagem: p.id, registro: r.id }); }); }) : null]);
    })) }));
    return el("div.pilha.pilha--curta.o2-mesa__evolucao", {}, partes);
  }
  function definirNivel(m, p, atual) {
    var st = { n: atual, nota: "" };
    UI().modal({ titulo: "Nível de " + p.nome + " (modo livre)", classe: "o2-janela", conteudo: [el("div.pilha", {}, [
      UI().campo({ rotulo: "Nível", tipo: "selecao", valor: String(atual), opcoes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (n) { return { valor: String(n), rotulo: String(n) }; }), aoMudar: function (v) { st.n = Number(v); } }),
      UI().campo({ rotulo: "Nota (o que muda na ficha)", limite: 300, aoDigitar: true, aoMudar: function (v) { st.nota = v; } }),
      linha("Modo livre: só o nível e a nota ficam registrados; as mudanças na ficha são feitas à mão."),
    ])], botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Definir", classe: "r-botao--principal", aoClicar: function (f) { f(); m.operar({ tipo: "definirNivel", personagem: p.id, nivel: st.n, nota: st.nota }); } }] });
  }
  function mestreConfig(m) {
    var cfg = EV().configDaMesa(m.estado);
    var st = JSON.parse(JSON.stringify(cfg));
    return UI().painel("Evolução", el("div.pilha", {}, [
      linha("Nível 1 a 10; patamar é campo à parte da ficha e NEX é só anotação. Os playtests não trazem tabela de evolução."),
      cfg.modo === "livre" ? el("div.o2-selo", {}, [el("strong", { texto: "Recomendado: Por marcos" }), el("span", { texto: " — você libera o marco e quem joga escolhe uma melhoria, com prévia e histórico. " }), botao("Ativar \"por marcos\"", function () { m.operar({ tipo: "evolucaoConfigurar", config: Object.assign({}, cfg, { modo: "marcos" }) }); }, { classe: "r-botao--principal" })]) : null,
      el("div.o2-criar__campos", {}, [
        UI().campo({ rotulo: "Modo", tipo: "selecao", valor: st.modo, opcoes: Object.keys(EV().MODOS).map(function (k) { return { valor: k, rotulo: EV().MODOS[k] }; }), aoMudar: function (v) { st.modo = v; } }),
        UI().campo({ rotulo: "PV por escolha", tipo: "numero", valor: String(st.pvPorEscolha), aoDigitar: true, aoMudar: function (v) { st.pvPorEscolha = U.inteiro(v, 2); } }),
        UI().campo({ rotulo: "PD por escolha", tipo: "numero", valor: String(st.pdPorEscolha), aoDigitar: true, aoMudar: function (v) { st.pdPorEscolha = U.inteiro(v, 2); } }),
        UI().campo({ rotulo: "Teto do passo", tipo: "selecao", valor: String(st.teto), opcoes: [8, 10, 12].map(function (n) { return { valor: String(n), rotulo: "d" + n }; }), aoMudar: function (v) { st.teto = Number(v); } }),
      ]),
      linha(SELO + ". Mudar a configuração não mexe nos marcos já liberados: cada um segue a configuração do momento em que foi liberado."),
      botao("Salvar evolução", function () { m.operar({ tipo: "evolucaoConfigurar", config: st }); }),
    ]));
  }

  global.RAMAOrdem2EvolucaoTela = {
    contexto: contexto, situacao: situacao,
    ficha: { aba: aba, acaoNoTopo: acaoNoTopo, cartao: cartao },
    mestre: { personagem: mestrePersonagem, config: mestreConfig },
  };
  global.RAMASecaoOrdem2Evolucao = { aba: aba };
})(window);
