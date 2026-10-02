/* =====================================================================
   R.A.M.A. — Ficha de Ordem · Arquivos Secretos 2 (Hexatombe)
   =====================================================================
   A tela do que o AS2 põe numa ficha. A regra mora em
   js/ordem/arquivo2.js; aqui, só desenho, clique e gravação.

     painel(ctx)            no alto da aba Habilidades: Coroa de
                            Espinhos e poderes de Intenção, a forma
                            suprema e o Hexatombe da ficha
     controles(ctx, aq)     os botões no cartão de um poder do AS2
     precisaPerguntar /     as opções antes de um ataque com arma
     perguntarAntesDoAtaque (Especialista em Matar, Disparo da Morte)
     gastarNoAtaque         o "próximo ataque" guardado
     noDano                 o que entra na rolagem de dano (o +N
                            guardado, O Sabor do Silêncio, Pedra de
                            Amolar)
     acoesNoTeste           Palpite Confiante

   Todo gasto passa pelo mesmo caminho das ações de recurso. Nada é
   rolado sem clique, e nada narrativo é resolvido sozinho.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var el = U.el;

  function A2() { return global.RAMAOrdemArquivo2; }
  function R() { return global.RAMAOrdemRegras; }
  function P() { return global.RAMAOrdemPoderes; }
  function E() { return global.RAMAOrdemProgressao; }
  function C() { return global.RAMAOrdemCatalogo; }
  function D() { return global.RAMADados; }
  function EF() { return global.RAMAOrdemEfeitos || null; }
  function CD() { return global.RAMAOrdemCondicoes || null; }
  function I() { return global.RAMAOrdemInventario || null; }
  function OPC() { return global.RAMAOrdemOpcionais || null; }

  function ordemDe(ctx) { return ctx.ficha.ordem; }
  function calc(ctx) { return R().calcular(ordemDe(ctx), ctx.ficha.inventario); }
  function salvar(ctx) { ctx.alterou(); ctx.redesenhar(); }

  function rolar(expr) {
    var r = D() && D().total ? D().total(expr) : null;
    return r && r.ok ? r.total : 0;
  }

  function estado(o) { return E() ? E().estado(o, null) : null; }
  function aquisicoes(o, chave) {
    var est = estado(o);
    return est ? est.adquiridos.filter(function (a) { return a.chave === chave && a.valido !== false; }) : [];
  }
  function tem(o, chave) { return aquisicoes(o, chave).length > 0; }
  function comAfinidade(o, chave) { return aquisicoes(o, chave).some(function (a) { return a.afinidade; }); }

  /* Gasta PE (ou PD) pelo caminho das ações de recurso. */
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
  function sigla(o) { return R().usaDeterminacao(o) ? "PD" : "PE"; }

  /* Muda um recurso atual (cura, dano, perda), sem passar do máximo. */
  function mexerRecurso(ctx, qual, delta) {
    var o = ordemDe(ctx);
    var c = calc(ctx);
    var maximo = qual === "pv" ? c.pv.total : qual === "pe" ? c.pe.total : qual === "san" ? c.san.total : (c.pd ? c.pd.total : 0);
    var atual = c.atual[qual];
    var novo = Math.max(0, Math.min(maximo, (Number(atual) || 0) + delta));
    if (!o.recursos) o.recursos = { pv: null, pe: null, san: null, pd: null };
    o.recursos[qual] = novo;
    return { antes: atual, depois: novo, maximo: maximo };
  }

  function botao(texto, aoClicar, op) {
    var x = op || {};
    return el("button.r-botao.r-botao--mini", { type: "button", texto: texto, disabled: !!x.desligado, title: x.dica || "", onclick: aoClicar });
  }

  function efeito(ctx, nome, dados) {
    var o = ordemDe(ctx);
    if (!EF()) return null;
    var inst = EF().criarInstancia(Object.assign({
      origem: { tipo: "habilidade", nome: nome }, alvoNome: ctx.ficha.nome, cena: A2().cenaDe(o),
    }, dados));
    var av = EF().avaliarAplicacao(o.condicoes, inst);
    var r = EF().aplicar(o.condicoes, inst, av.ok && av.conflito ? "renovar" : "nova");
    if (!r.ok) { UI.avisoAtencao(r.motivo); return null; }
    return r;
  }

  function dtDe(o, atributo) {
    var t = R().trilho(o);
    return 10 + (t.passos || 0) + R().atributo(o, atributo);
  }

  /* =================================================================
     O PAINEL NO ALTO DA ABA HABILIDADES
     ================================================================= */

  function painel(ctx) {
    if (!A2()) return null;
    var o = ordemDe(ctx);
    var partes = [painelDeIntencao(ctx, o), painelDaForma(ctx, o), painelDoHexatombe(ctx, o)].filter(Boolean);
    var resumo = [];
    if (o.intencao && o.intencao.poderes.length) resumo.push(o.intencao.poderes.length + " poder(es) de Intenção");
    if (A2().formaAtiva(o)) resumo.push("forma suprema ativa");
    var lanc = A2().lancamentosValendo(o).length;
    if (lanc) resumo.push(lanc + " lançamento(s) do Hexatombe");
    return UI.recolhivel({
      titulo: "Hexatombe, Intenção e forma suprema",
      extra: resumo.join(" · ") || "Arquivos Secretos 2",
      classe: "as2-painel",
      aberto: !!(resumo.length),
      conteudo: el("div.pilha--curta", { class: "pilha" }, partes),
    });
  }

  /* ---------- Coroa de Espinhos e Intenção (p. 94-95) ---------- */

  function painelDeIntencao(ctx, o) {
    var int = o.intencao || { contato: {}, poderes: [] };
    var linhas = [el("h4.t-secao", { texto: "Intenção" })];
    if (!int.contato.registrado) {
      linhas.push(el("p.t-mini", { texto: "Poderes de Intenção pedem contato com a Coroa de Espinhos (Arquivos Secretos 2, p. 94). Registre o contato quando a história o der." }));
      linhas.push(botao("Registrar contato com a Coroa de Espinhos", function () {
        UI.pedirTexto({ titulo: "Contato com a Coroa de Espinhos", rotulo: "Como foi (nota)", valor: "", limite: 300 }).then(function (t) {
          if (t === null || t === undefined) return;
          A2().registrarContato(o, t, ctx.ficha.nome || "");
          salvar(ctx);
          UI.avisoOk("Contato registrado. Poderes de Intenção podem ser concedidos pela mesa.");
        });
      }));
      return el("div.pilha--curta", { class: "pilha" }, linhas);
    }
    linhas.push(el("p.t-mini", { texto: "Contato com a Coroa de Espinhos registrado" + (int.contato.em ? " em " + int.contato.em.slice(0, 10) : "") + (int.contato.nota ? ": " + int.contato.nota : "") + "." }));
    int.poderes.forEach(function (p) { linhas.push(cartaoDeIntencao(ctx, o, p)); });
    var faltam = (P().PODERES_INTENCAO || []).filter(function (e) { return !int.poderes.some(function (p) { return p.chave === e.chave; }); });
    if (faltam.length) {
      linhas.push(botao("Conceder poder de Intenção (mesa)…", function () { concederIntencao(ctx, o, faltam); }));
    }
    return el("div.pilha--curta", { class: "pilha" }, linhas);
  }

  function concederIntencao(ctx, o, lista) {
    var escolha = lista[0].chave;
    var nota = "";
    var corpo = el("div.pilha--curta", { class: "pilha" }, [
      el("p.t-mini", { texto: "Um poder de Intenção não vem de Transcender nem de afinidade: o suplemento o mostra nos Mascarados, e a mesa decide quem o recebe (Arquivos Secretos 2, p. 94)." }),
      el("select.r-selecao", { "aria-label": "Poder", onchange: function (ev) { escolha = ev.target.value; } },
        lista.map(function (e) { return el("option", { value: e.chave, texto: e.nome + " — " + e.intencao.gatilho }); })),
      el("input.r-entrada", { type: "text", maxlength: "300", placeholder: "Nota da mesa (opcional)", oninput: function (ev) { nota = ev.target.value; } }),
    ]);
    UI.modal({
      titulo: "Conceder poder de Intenção",
      conteudo: [corpo],
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Conceder", classe: "r-botao--principal", aoClicar: function (fechar) {
          var r = A2().concederIntencao(o, escolha, nota);
          if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
          fechar();
          salvar(ctx);
        } },
      ],
    });
  }

  function cartaoDeIntencao(ctx, o, p) {
    var st = A2().estadoDaIntencao(o, p);
    var e = st.entrada;
    if (!e) return null;
    var it = e.intencao;
    var botoes = [];
    if (!p.gatilho.atendido && !st.ativo) {
      if (it.tipo === "ferimentos") {
        botoes.push(botao("Contar ferimento (" + st.ferimentos + "/" + it.ferimentos + ")", function () {
          UI.pedirTexto({ titulo: "Ferimento", rotulo: "Dano sofrido (precisa de " + it.danoMinimo + " ou mais)", valor: "", limite: 4 }).then(function (t) {
            if (t === null || t === undefined) return;
            var r = A2().registrarFerimento(o, p.id, Number(String(t).trim()));
            if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
            salvar(ctx);
            UI.aviso(r.atendido ? e.nome + ": gatilho atendido." : "Ferimento contado: " + r.contados + " de " + it.ferimentos + ".");
          });
        }));
      } else {
        botoes.push(botao(it.tipo === "acao" ? "Gatilho cumprido (" + it.uso + ")" : "A mesa confirma o gatilho", function () {
          UI.confirmar({ titulo: e.nome, texto: "Gatilho: " + it.gatilho + " Confirmar que ele foi atendido nesta cena?", rotuloConfirmar: "Confirmar" }).then(function (ok) {
            if (!ok) return;
            A2().atenderGatilho(o, p.id, it.tipo === "acao" ? "o próprio personagem" : "mesa");
            salvar(ctx);
          });
        }));
      }
    }
    if (st.disponivel) {
      botoes.push(botao("Usar (" + it.uso + ")", function () {
        var r = A2().usarIntencao(o, p.id);
        if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
        salvar(ctx);
        UI.aviso(e.nome + (r.ativo ? ": ativo." : ": usado.") + " Para usar de novo, o gatilho precisa ser atendido de novo.", { duracao: 7000 });
      }));
    }
    if (st.ativo) {
      if (it.perdaPorTurno) {
        botoes.push(botao("Início do turno: −" + it.perdaPorTurno + " PV", function () {
          var r = mexerRecurso(ctx, "pv", -it.perdaPorTurno);
          salvar(ctx);
          UI.aviso(e.nome + ": PV " + r.antes + " → " + r.depois + ".");
        }));
      }
      botoes.push(botao("Desligar", function () { A2().encerrarIntencao(o, p.id); salvar(ctx); }));
    }
    var situacao = st.ativo ? "Ativo" : (p.gatilho.atendido ? (st.disponivel ? "Gatilho atendido: disponível" : st.motivo) : "Aguardando o gatilho");
    return el("div.as2-intencao", {}, [
      el("p", {}, [el("strong", { texto: e.nome }), el("span.t-mini", { texto: " · " + situacao })]),
      el("p.t-mini", { texto: "“" + it.lema + "” " + e.resumo }),
      (it.versoesNpc || []).length ? el("p.t-mini", { texto: "Ficha de NPC: " + it.versoesNpc.map(function (v) { return v.ficha + " — " + v.texto; }).join(" ") }) : null,
      el("div.faixa", {}, botoes),
      el("p.criacao-fonte", { texto: P().referencia(e) }),
    ]);
  }

  /* ---------- forma suprema (p. 96-97) ---------- */

  function painelDaForma(ctx, o) {
    var f = o.formaSuprema || A2().normalizarFormaSuprema(null);
    var comPd = R().usaDeterminacao(o);
    var linhas = [el("h4.t-secao", { texto: "Forma suprema (As Máscaras na Sua Mesa)" })];
    if (!f.configurada) {
      linhas.push(el("p.t-mini", { texto: "Com justificativa narrativa e o consentimento da mesa, a ficha ganha uma versão “suprema” (Arquivos Secretos 2, p. 97). A ficha-base não muda." }));
      linhas.push(botao("Configurar forma alternativa…", function () { configurarForma(ctx, o); }));
      return el("div.pilha--curta", { class: "pilha" }, linhas);
    }
    var B = A2().BENEFICIOS_DA_FORMA;
    linhas.push(el("p", {}, [el("strong", { texto: f.nome || "Forma suprema" }), el("span.t-mini", { texto: f.aprovada ? " · aprovada pela mesa" : " · aguardando aprovação da mesa" })]));
    if (f.descricao) linhas.push(el("p.t-mini", { texto: f.descricao }));
    linhas.push(el("p.t-mini", { texto: "Definido pelo livro: ação de movimento; " + B.custoInicial + " de Sanidade ao ativar e " + B.custoPorRodada + " por rodada além da primeira; +" + B.pv + " PV e +" + B.pe + " PE atuais e máximos e +" + B.defesa + " na Defesa. Desativar (ação livre) tira tudo — com menos de " + B.pv + " PV atuais, fica com 0 e morrendo. Insano na forma, o personagem vira NPC." }));
    if (f.sugestoes.length) linhas.push(el("p.t-mini", { texto: "Sugestões aprovadas (não automáticas): " + f.sugestoes.join("; ") + "." }));
    if (comPd) {
      linhas.push(el("p.t-mini.t-aviso", { texto: "Jogando sem Sanidade: " + (f.custoComPd === "pd" ? "a mesa decidiu cobrar o custo em PD." : f.custoComPd === "ignorar" ? "a mesa decidiu ignorar o custo em Sanidade (SAH p. 104)." : "a mesa ainda não decidiu como fica o custo (ignorar ou pagar em PD).") }));
    }
    var botoes = [botao("Editar", function () { configurarForma(ctx, o); })];
    if (f.ativa) {
      botoes.push(botao("Manter mais uma rodada (" + B.custoPorRodada + " " + (comPd ? "PD" : "SAN") + ")", function () {
        var r = A2().manterForma(o, comPd);
        if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
        if (r.custo && r.recurso) mexerRecurso(ctx, r.recurso, -r.custo);
        avisoDeInsanidade(ctx, o);
        salvar(ctx);
      }));
      botoes.push(botao("Desativar (ação livre)", function () {
        var c = calc(ctx);
        var r = A2().desativarForma(o, c.atual.pv, c.determinacao ? c.atual.pd : c.atual.pe);
        if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
        if (!o.recursos) o.recursos = { pv: null, pe: null, san: null, pd: null };
        o.recursos.pv = r.pv;
        o.recursos[c.determinacao ? "pd" : "pe"] = r.pe;
        if (r.morrendo && CD()) CD().ativar && CD().ativar(o.condicoes, "morrendo");
        salvar(ctx);
        UI.aviso(r.morrendo ? "Forma desativada: com menos de 20 PV, ficou com 0 e morrendo." : "Forma desativada: os benefícios saíram.", { duracao: 7000 });
      }));
    } else {
      botoes.push(botao("Ativar (ação de movimento)", function () {
        var c0 = calc(ctx);
        var plano = A2().planoDeAtivacao(o, comPd);
        if (!plano.ok) { UI.avisoAtencao(plano.motivo); return; }
        var pvAntes = c0.atual.pv;
        var peQual = c0.determinacao ? "pd" : "pe";
        var peAntes = c0.atual[peQual];
        A2().ativarForma(o, comPd);
        if (!o.recursos) o.recursos = { pv: null, pe: null, san: null, pd: null };
        if (o.recursos.pv !== null && o.recursos.pv !== undefined) o.recursos.pv = pvAntes + B.pv;
        if (o.recursos[peQual] !== null && o.recursos[peQual] !== undefined) o.recursos[peQual] = peAntes + B.pe;
        if (plano.custo && plano.recurso) mexerRecurso(ctx, plano.recurso, -plano.custo);
        avisoDeInsanidade(ctx, o);
        salvar(ctx);
      }, { desligado: !f.aprovada, dica: f.aprovada ? "" : "Falta a aprovação da mesa." }));
    }
    linhas.push(el("div.faixa", {}, botoes));
    return el("div.pilha--curta", { class: "pilha" }, linhas);
  }

  function avisoDeInsanidade(ctx, o) {
    var c = calc(ctx);
    if (!c.determinacao && c.atual.san <= 0 && A2().formaAtiva(o)) {
      UI.avisoAtencao("Sanidade zerada na forma suprema: o personagem fica insano e passa a ser um NPC controlado pela intenção assassina (Arquivos Secretos 2, p. 97). É decisão narrativa da mesa.");
    }
  }

  function configurarForma(ctx, o) {
    var f = JSON.parse(JSON.stringify(o.formaSuprema || A2().normalizarFormaSuprema(null)));
    var comPd = R().usaDeterminacao(o);
    var nome = el("input.r-entrada", { type: "text", maxlength: "80", value: f.nome, placeholder: "Mutilador Noturno, Colosso…", "aria-label": "Nome da forma" });
    var desc = el("textarea.r-entrada", { maxlength: "1500", rows: "3", "aria-label": "Justificativa e descrição" });
    desc.value = f.descricao;
    var sug = el("textarea.r-entrada", { maxlength: "1000", rows: "3", "aria-label": "Sugestões aprovadas, uma por linha" });
    sug.value = f.sugestoes.join("\n");
    var aprovada = el("input", { type: "checkbox", checked: f.aprovada });
    var custo = el("select.r-selecao", { "aria-label": "Custo com Jogando sem Sanidade" }, [
      el("option", { value: "", texto: "A mesa ainda não decidiu", selected: !f.custoComPd }),
      el("option", { value: "ignorar", texto: "Ignorar o custo em Sanidade (SAH p. 104)", selected: f.custoComPd === "ignorar" }),
      el("option", { value: "pd", texto: "Pagar o mesmo número em PD (AS2 p. 96)", selected: f.custoComPd === "pd" }),
    ]);
    UI.modal({
      titulo: "Forma alternativa",
      conteudo: [el("div.pilha--curta", { class: "pilha" }, [
        el("p.t-mini", { texto: "Primeiro, uma justificativa narrativa (um item que desumaniza, a Intenção). Segundo, uma versão da ficha feita com a mesa. Terceiro, os efeitos definidos do livro, que a ficha aplica. As sugestões (rituais avançados sem PE, +2 dados de dano, +5 em testes, +5 nas DT, habilidade nova) só entram se a mesa aprovar, e ficam como texto." }),
        el("label.r-rotulo", { texto: "Nome" }), nome,
        el("label.r-rotulo", { texto: "Justificativa e descrição" }), desc,
        el("label.r-rotulo", { texto: "Sugestões aprovadas (uma por linha)" }), sug,
        el("label.r-marca", {}, [aprovada, el("span", { texto: "A mesa aprovou esta forma." })]),
        comPd ? el("label.r-rotulo", { texto: "Jogando sem Sanidade está ligada: o custo" }) : null,
        comPd ? custo : null,
      ])],
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Guardar", classe: "r-botao--principal", aoClicar: function (fechar) {
          f.configurada = true;
          f.nome = nome.value;
          f.descricao = desc.value;
          f.sugestoes = sug.value.split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean);
          f.aprovada = aprovada.checked;
          if (comPd) f.custoComPd = custo.value;
          o.formaSuprema = A2().normalizarFormaSuprema(f);
          fechar();
          salvar(ctx);
        } },
      ],
    });
  }

  /* ---------- o Hexatombe na ficha ---------- */

  var MODELOS_DE_LANCAMENTO = [
    { chave: "sede", rotulo: "Sem água no dia (–10 PV máx.)", tipo: "pvMax", valor: -10, motivo: "Sede: sem água até a conclusão do dia (AS2 p. 20)" },
    { chave: "fome", rotulo: "Sem comida no dia (–10 PE máx.)", tipo: "peMax", valor: -10, motivo: "Fome: sem comida até a conclusão do dia (AS2 p. 20)" },
    { chave: "prazer", rotulo: "Recompensa: Prazer (+10 PV máx.)", tipo: "pvMax", valor: 10, motivo: "Intenção cumprida: Prazer, Euforia, Luxúria, Gula (AS2 p. 24)" },
    { chave: "orgulho", rotulo: "Recompensa: Orgulho (+10 PE máx.)", tipo: "peMax", valor: 10, motivo: "Intenção cumprida: Orgulho, Desprezo, Arrogância (AS2 p. 24)" },
    { chave: "obsessao", rotulo: "Recompensa: Obsessão (RD 5)", tipo: "rd", valor: 5, motivo: "Intenção cumprida: Obsessão, Servidão, Paixão (AS2 p. 24)" },
    { chave: "rancor", rotulo: "Recompensa: Rancor (+5 de dano)", tipo: "dano", valor: 5, motivo: "Intenção cumprida: Rancor, Frustração, Ansiedade, Ira (AS2 p. 24)" },
    { chave: "culpa", rotulo: "Recompensa: Culpa (um poder de quem morreu)", tipo: "nota", valor: 0, motivo: "Intenção cumprida: Culpa — o poder vem pela mesa (AS2 p. 24)" },
    { chave: "desejo", rotulo: "Recompensa: Desejo (+15 PV temporários ao cair morrendo, 1×/dia)", tipo: "nota", valor: 0, motivo: "Intenção cumprida: Desejo, Ambição, Inveja (AS2 p. 24)" },
  ];

  function painelDoHexatombe(ctx, o) {
    var h = o.hexatombe || A2().normalizarHexatombe(null);
    var linhas = [el("h4.t-secao", { texto: "Hexatombe" + (h.dia ? " · dia " + h.dia : "") })];
    var valendo = A2().lancamentosValendo(o);
    if (!h.lancamentos.length && !h.dia) {
      linhas.push(el("p.t-mini", { texto: "Para quem participa do Hexatombe: sede e fome do dia, desertor e recompensas de Intenção entram aqui, cada uma com origem. O modo Hexatombe da campanha (aba Hexatombe) também lança aqui, com origem." }));
    }
    h.lancamentos.slice(-12).reverse().forEach(function (l) {
      linhas.push(el("div.faixa.as2-lancamento", {}, [
        el("span.t-mini", { texto: (l.desfeito ? "(desfeito) " : "") + rotuloDoLancamento(l) + (l.dia ? " · dia " + l.dia : "") + " — " + (l.motivo || l.origem) }),
        l.desfeito ? null : botao("Desfazer", function () { A2().desfazerLancamento(o, l.id); salvar(ctx); }),
      ]));
    });
    linhas.push(el("div.faixa", {}, [
      botao("Lançar…", function () { lancarManual(ctx, o); }),
      botao("Virei desertor…", function () { desertor(ctx, o); }),
      botao("Recebi incenso (1d4 PE)", function () {
        var r = receberIncenso(ctx);
        if (!r) return;
        salvar(ctx);
        UI.aviso("Incenso: +" + r.n + " (" + r.r.antes + " → " + r.r.depois + ").");
      }, { desligado: incensoHoje(o), dica: incensoHoje(o) ? "Já recebido hoje." : "Uma vez por dia (o dia do Hexatombe na ficha)." }),
      botao("Novo dia (" + ((h.dia || 0) + 1) + ")", function () {
        o.hexatombe = A2().normalizarHexatombe(o.hexatombe);
        o.hexatombe.dia = (o.hexatombe.dia || 0) + 1;
        salvar(ctx);
        UI.aviso("Dia " + o.hexatombe.dia + ". Nada é resolvido sozinho: consumo, sacrifícios e intenções são lançados à parte.");
      }),
    ]));
    if (valendo.length) linhas.push(el("p.t-mini", { texto: valendo.length + " lançamento(s) valendo nas contas da ficha." }));
    return el("div.pilha--curta", { class: "pilha" }, linhas);
  }

  function rotuloDoLancamento(l) {
    var nomes = { pvMax: "PV máx.", peMax: "PE máx.", pvMetade: "PV máx. pela metade", rd: "RD", testes: "em testes", dadosTestes: "dado(s) em testes", dano: "de dano", nota: "registro" };
    if (l.tipo === "pvMetade" || l.tipo === "nota") return nomes[l.tipo];
    return (l.valor > 0 ? "+" : "") + l.valor + " " + nomes[l.tipo];
  }

  function lancarManual(ctx, o) {
    var escolha = MODELOS_DE_LANCAMENTO[0].chave;
    UI.modal({
      titulo: "Lançamento do Hexatombe",
      conteudo: [el("div.pilha--curta", { class: "pilha" }, [
        el("p.t-mini", { texto: "Recuperar os máximos perdidos exige consumir 1 unidade a mais no fim do dia seguinte (AS2 p. 20): desfaça o lançamento quando isso acontecer. As regras de fome e sede do livro básico (p. 292) continuam valendo à parte." }),
        el("select.r-selecao", { "aria-label": "O que lançar", onchange: function (ev) { escolha = ev.target.value; } },
          MODELOS_DE_LANCAMENTO.map(function (m) { return el("option", { value: m.chave, texto: m.rotulo }); })),
      ])],
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Lançar", classe: "r-botao--principal", aoClicar: function (fechar) {
          var m = MODELOS_DE_LANCAMENTO.filter(function (x) { return x.chave === escolha; })[0];
          var dia = (o.hexatombe && o.hexatombe.dia) || 0;
          A2().lancar(o, { id: "fic-" + m.chave + "-d" + dia + "-" + U.uuid().slice(0, 6), tipo: m.tipo, valor: m.valor, dia: dia, motivo: m.motivo, origem: "Hexatombe" });
          fechar();
          salvar(ctx);
        } },
      ],
    });
  }

  /* Desertor (AS2 p. 11): –1 dado em testes e PV máximos pela metade,
     permanentes. A cada sacrifício: Fortitude DT 20 (ou inconsciente) e
     –1d10 PV máx. e atuais e –1 em testes, até –6d10 e –6. */
  function desertor(ctx, o) {
    var ja = A2().lancamentosValendo(o, "pvMetade").length > 0;
    var sacrificios = A2().lancamentosValendo(o, "testes").filter(function (l) { return /desertor/i.test(l.motivo); }).length;
    var corpo = el("div.pilha--curta", { class: "pilha" }, [
      el("p.t-mini", { texto: ja
        ? "Desertor desde antes: " + sacrificios + " de 6 sacrifícios contados. Cada novo sacrifício pede Fortitude DT 20 (falhando, inconsciente até o amanhecer ou ser acordado) e tira 1d10 PV máximos e atuais e 1 em testes."
        : "Ao virar desertor: –1 dado em todos os testes e PV máximos pela metade, para sempre. Sem o sacrifício final até a meia-noite do último dia, o desertor morre sob a Lua de Sangue." }),
    ]);
    var botoes = [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }];
    if (!ja) {
      botoes.push({ rotulo: "Virar desertor", classe: "r-botao--principal", aoClicar: function (fechar) {
        var dia = (o.hexatombe && o.hexatombe.dia) || 0;
        A2().lancar(o, { id: "desertor-base", tipo: "pvMetade", valor: 0, dia: dia, motivo: "Desertor do Hexatombe (AS2 p. 11)", origem: "Desertor" });
        A2().lancar(o, { id: "desertor-dado", tipo: "dadosTestes", valor: -1, dia: dia, motivo: "Desertor do Hexatombe: –1 dado em testes (AS2 p. 11)", origem: "Desertor" });
        fechar();
        salvar(ctx);
      } });
    } else if (sacrificios < 6) {
      botoes.push({ rotulo: "Um sacrifício ocorreu (rola 1d10)", classe: "r-botao--principal", aoClicar: function (fechar) {
        var dia = (o.hexatombe && o.hexatombe.dia) || 0;
        var n = rolar("1d10");
        var idx = sacrificios + 1;
        A2().lancar(o, { id: "desertor-s" + idx, tipo: "pvMax", valor: -n, dia: dia, motivo: "Desertor: sacrifício nº " + idx + " (–1d10 = " + n + ")", origem: "Desertor" });
        A2().lancar(o, { id: "desertor-t" + idx, tipo: "testes", valor: -1, dia: dia, motivo: "Desertor: sacrifício nº " + idx + " (–1 em testes)", origem: "Desertor" });
        mexerRecurso(ctx, "pv", -n);
        fechar();
        salvar(ctx);
        UI.aviso("Desertor: –" + n + " PV máximos e atuais e –1 em testes. Faça o teste de Fortitude DT 20 (falhando, inconsciente até o amanhecer).", { duracao: 9000 });
      } });
    }
    UI.modal({ titulo: "Desertor do Hexatombe", conteudo: [corpo], botoes: botoes });
  }

  /* =================================================================
     OS BOTÕES NO CARTÃO DE UM PODER
     ================================================================= */

  var CONTROLES = {
    predadorPerfeito: function (ctx, o) {
      return [botao("Ação padrão adicional (5 " + sigla(o) + ")", function () {
        var g = gastar(ctx, 5);
        if (!g) return;
        salvar(ctx);
        UI.aviso("Predador Perfeito: uma ação padrão a mais nesta rodada, com intenção de causar dano.");
      }, { dica: "Uma vez por rodada." })];
    },
    golpesDeArena: function (ctx, o) {
      return [botao("Ataque adicional ou manobra (2 " + sigla(o) + ")", function () {
        var g = gastar(ctx, 2);
        if (!g) return;
        salvar(ctx);
        UI.aviso("Golpes de Arena: um ataque corpo a corpo adicional ou uma manobra contra o mesmo alvo.");
      }, { dica: "Depois de acertar um ataque corpo a corpo." })];
    },
    marteladas: function (ctx, o) {
      return [botao("Marteladas (3 " + sigla(o) + ", ação completa)", function () { marteladas(ctx, o); })];
    },
    estagioTerminal: function (ctx, o) {
      var machucado = R().machucado(o);
      return [botao("Ação de movimento extra (2 " + sigla(o) + ")", function () {
        var g = gastar(ctx, 2);
        if (!g) return;
        salvar(ctx);
        UI.aviso("Estágio Terminal: uma ação de movimento extra nesta rodada.");
      }, { desligado: !machucado, dica: machucado ? "Uma vez por rodada." : "Só machucado." })];
    },
    tratamentoDeEmergencia: function (ctx, o) {
      return [botao("Tratar (2 " + sigla(o) + ")", function () { tratamento(ctx, o); })];
    },
    arteDaMusicaMacabra: function (ctx, o) {
      return [botao("Tocar (2 " + sigla(o) + ")", function () { musica(ctx, o); })];
    },
    sintonizacaoMentalComArma: function (ctx, o) { return controleSintonia(ctx, o, "arma"); },
    sintonizacaoMentalComProtecao: function (ctx, o) { return controleSintonia(ctx, o, "protecao"); },
    liturgiaDeFortalecimento: function (ctx, o) {
      var feitos = (o.fortalecimentos || []).filter(function (f) { return f.interludio === A2().interludioDe(o); });
      return [
        feitos.length ? el("p.t-mini", { texto: "Fortalecidos até o próximo interlúdio: " + feitos.map(function (f) { return f.nome; }).join(", ") + " (+2 na DT)." }) : null,
        botao("Fortalecer um ritual (2 " + sigla(o) + ", interlúdio)", function () { liturgia(ctx, o); }),
      ];
    },
    predadorDeSangue: function (ctx, o) { return controleDeLista(ctx, o, "vitimas", comAfinidade(o, "predadorDeSangue") ? 3 : 1, "Memorizar uma vítima (3 " + sigla(o) + ")", 3, "Vítima (o odor memorizado)"); },
    zonaDosSussurros: function (ctx, o) { return controleDeLista(ctx, o, "zonas", 3, "Marcar uma área (3 " + sigla(o) + ")", 3, "Área marcada"); },
    pressaoAtmosferica: function (ctx, o) {
      return [botao("Pressão (3 " + sigla(o) + ")", function () {
        var g = gastar(ctx, 3);
        if (!g) return;
        salvar(ctx);
        var n = rolar("1d10");
        UI.aviso("Pressão Atmosférica: +" + n + " de dano de Energia (1d10); o alvo agarrado faz Fortitude DT " + dtDe(o, "for") + " ou fica atordoado por uma rodada" +
          (comAfinidade(o, "pressaoAtmosferica") ? ", e fica caído e sangrando de qualquer jeito" : "") + ". Um mesmo ser, uma vez por cena.", { duracao: 9000 });
      })];
    },
    engolirSangue: function (ctx, o) {
      return [botao("Engolir (ação completa)", function () {
        var cura = rolar(comAfinidade(o, "engolirSangue") ? "4d8+4" : "2d8+2");
        var san = rolar("1d4");
        var pv = mexerRecurso(ctx, "pv", cura);
        if (!R().usaDeterminacao(o)) mexerRecurso(ctx, "san", -san);
        salvar(ctx);
        UI.aviso("Engolir Sangue: +" + cura + " PV (" + pv.antes + " → " + pv.depois + ")" + (R().usaDeterminacao(o) ? "." : " e –" + san + " de Sanidade."), { duracao: 7000 });
      })];
    },
  };

  function controles(ctx, aq) {
    var f = aq && CONTROLES[aq.chave];
    if (!f || !A2()) return null;
    var partes = f(ctx, ordemDe(ctx), aq);
    return partes && partes.length ? el("div.pilha--curta.origem-controles", { class: "pilha" }, partes.filter(Boolean)) : null;
  }

  function controleDeLista(ctx, o, marca, maximo, rotulo, custo, pergunta) {
    var atuais = (o.marcas && o.marcas[marca]) || [];
    return [
      atuais.length ? el("p.t-mini", { texto: atuais.join(" · ") }) : null,
      botao(rotulo, function () {
        UI.pedirTexto({ titulo: rotulo, rotulo: pergunta, valor: "", limite: 80 }).then(function (t) {
          if (!t) return;
          var g = gastar(ctx, custo);
          if (!g) return;
          if (!o.marcas) o.marcas = {};
          var l = (o.marcas[marca] || []).concat([t]);
          o.marcas[marca] = l.slice(-maximo);
          salvar(ctx);
        });
      }),
      atuais.length ? botao("Limpar", function () { o.marcas[marca] = []; salvar(ctx); }) : null,
    ];
  }

  /* Marteladas (AS2 p. 87): três testes só para o crítico; três danos
     desarmados de Artista Marcial, somados num só. */
  function marteladas(ctx, o) {
    var g = gastar(ctx, 3);
    if (!g) return;
    salvar(ctx);
    var t = R().trilho(o);
    var dado = t.nexEquivalente >= 70 ? "1d10" : (t.nexEquivalente >= 35 ? "1d8" : "1d6");
    var atr = Math.max(R().atributo(o, "for"), R().atributo(o, "agi"));
    var expr = R().dadosDoTeste(o, "luta").expressao;
    var total = 0;
    var linhas = [];
    for (var i = 1; i <= 3; i++) {
      var teste = D().dependente({ expressao: expr, sigla: "", nome: "Marteladas", bonus: 0, modificadores: [] });
      var crit = teste && teste.ok && D().ehCritico(teste.natural, 20);
      var dano = D().dano({ nome: "Marteladas", dano: dado, critico: crit, multiplicador: 2 });
      var valor = (dano.ok ? dano.total : 0) + atr;
      total += valor;
      linhas.push("Golpe " + i + ": natural " + (teste && teste.ok ? teste.natural : "?") + (crit ? " (crítico)" : "") + " → " + valor);
    }
    global.RAMARolagens.mostrar({ ok: true, tipo: "dano", nome: "Marteladas", expressao: "3 × (" + dado + "+" + atr + ")", total: total,
      parcelas: linhas.map(function (l) { return { rotulo: l, valor: 0 }; }) }, {
      nome: "Marteladas · um dano só",
      notas: linhas.concat(["Dano desarmado de Artista Marcial (" + dado + ") + " + atr + " por golpe; os testes só decidem o crítico.", "Fortitude DT " + dtDe(o, "for") + " reduz à metade (DT For: 10 + nível de exposição + Força)."]),
    });
  }

  function tratamento(ctx, o) {
    var alvo = "";
    UI.pedirTexto({ titulo: "Tratamento de Emergência", rotulo: "Em quem? (vazio = em você)", valor: "", limite: 80 }).then(function (t) {
      if (t === null || t === undefined) return;
      alvo = String(t).trim() || "eu";
      var cena = A2().cenaDe(o);
      var marca = cena + "|" + alvo.toLowerCase();
      var feitos = (o.marcas && o.marcas.tratamentoAlvos) || [];
      if (feitos.indexOf(marca) >= 0) { UI.avisoAtencao("Esse alvo já recebeu Tratamento de Emergência nesta cena."); return; }
      var g = gastar(ctx, 2);
      if (!g) return;
      var n = rolar("2d10+10");
      if (!o.marcas) o.marcas = {};
      o.marcas.tratamentoAlvos = feitos.concat([marca]).slice(-12);
      if (alvo === "eu" && global.RAMASecaoOrigens && global.RAMASecaoOrigens.temporarioDaCena) {
        global.RAMASecaoOrigens.temporarioDaCena(o, "tratamentoDeEmergencia", "pv", n, "Tratamento de Emergência");
      }
      salvar(ctx);
      UI.aviso("Tratamento de Emergência: " + n + " PV temporários" + (alvo === "eu" ? " em você (até o fim da cena)" : " para " + alvo) + ". Quando acabarem, fica fraco até o fim da cena.", { duracao: 8000 });
    });
  }

  var EFEITOS_DA_MUSICA = [
    { chave: "dano", rotulo: "O próximo dano +5", valor: 5 },
    { chave: "margem", rotulo: "O próximo ataque +2 na margem de ameaça", valor: 2 },
    { chave: "ataque", rotulo: "O próximo teste de ataque +5", valor: 5 },
    { chave: "alcance", rotulo: "O próximo ataque ou habilidade +9 m de alcance", valor: 9 },
  ];

  function musica(ctx, o) {
    var escolha = "dano";
    var emMim = true;
    UI.modal({
      titulo: "Arte da Música Macabra",
      conteudo: [el("div.pilha--curta", { class: "pilha" }, [
        el("select.r-selecao", { "aria-label": "Efeito", onchange: function (ev) { escolha = ev.target.value; } },
          EFEITOS_DA_MUSICA.map(function (m) { return el("option", { value: m.chave, texto: m.rotulo }); })),
        el("label.r-marca", {}, [el("input", { type: "checkbox", checked: true, onchange: function (ev) { emMim = ev.target.checked; } }),
          el("span", { texto: "O alvo sou eu (o efeito fica guardado na ficha até ser gasto, nesta cena)." })]),
      ])],
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Tocar (2 " + sigla(o) + ")", classe: "r-botao--principal", aoClicar: function (fechar) {
          var g = gastar(ctx, 2);
          if (!g) return;
          var m = EFEITOS_DA_MUSICA.filter(function (x) { return x.chave === escolha; })[0];
          if (emMim) A2().guardarPendente(o, m.chave, m.valor, "Arte da Música Macabra");
          fechar();
          salvar(ctx);
          UI.aviso("Arte da Música Macabra: " + m.rotulo.toLowerCase() + (emMim ? " — guardado na ficha." : " — no alvo (registre na ficha dele)."));
        } },
      ],
    });
  }

  function controleSintonia(ctx, o, tipo) {
    var atual = A2().sintonizacaoValendo(o, tipo);
    var itens = ((ctx.ficha.inventario && ctx.ficha.inventario.itens) || []).filter(function (i) { return tipo === "arma" ? i.tipo === "arma" : i.tipo === "armadura"; });
    var item = atual ? itens.filter(function (i) { return i.id === atual.itemId; })[0] : null;
    return [
      atual ? el("p.t-mini", { texto: "Sintonizada: " + (item ? item.nome : "item fora do inventário") + " com " + nomeAtr(atual.atributo) + ", até o próximo interlúdio." }) : null,
      botao("Sintonizar (3 " + sigla(o) + ", ação de interlúdio)", function () {
        if (!itens.length) { UI.avisoAtencao(tipo === "arma" ? "Nenhuma arma no inventário." : "Nenhuma proteção no inventário."); return; }
        var escolhaItem = itens[0].id;
        var escolhaAtr = "int";
        var cena = ordemDe(ctx).condicoes && ordemDe(ctx).condicoes.cena;
        UI.modal({
          titulo: tipo === "arma" ? "Sintonização Mental com Arma" : "Sintonização Mental com Proteção",
          conteudo: [el("div.pilha--curta", { class: "pilha" }, [
            cena && cena.interludio ? null : el("p.t-mini.t-aviso", { texto: "A sintonização é feita numa cena de interlúdio. Comece uma em Condições → Novo interlúdio." }),
            el("select.r-selecao", { "aria-label": "Item", onchange: function (ev) { escolhaItem = ev.target.value; } },
              itens.map(function (i) { return el("option", { value: i.id, texto: i.nome }); })),
            el("select.r-selecao", { "aria-label": "Atributo", onchange: function (ev) { escolhaAtr = ev.target.value; } },
              C().ATRIBUTOS.map(function (a) { return el("option", { value: a.chave, texto: a.nome, selected: a.chave === "int" }); })),
            el("p.t-mini", { texto: tipo === "arma" ? "Só vale com a arma empunhada por você." : "Só vale com a proteção em uso (vestida) por você." }),
          ])],
          botoes: [
            { rotulo: "Cancelar", classe: "r-botao--fantasma" },
            { rotulo: "Sintonizar", classe: "r-botao--principal", aoClicar: function (fechar) {
              var g = gastar(ctx, 3);
              if (!g) return;
              A2().sintonizar(o, tipo, escolhaItem, escolhaAtr);
              fechar();
              salvar(ctx);
            } },
          ],
        });
      }),
    ];
  }

  function nomeAtr(k) { var a = C().ATRIBUTOS.filter(function (x) { return x.chave === k; })[0]; return a ? a.nome : k; }

  function liturgia(ctx, o) {
    var rituais = (ctx.ficha.rituais && ctx.ficha.rituais.itens) || [];
    if (!rituais.length) { UI.avisoAtencao("Nenhum ritual na ficha."); return; }
    var escolha = rituais[0].id;
    UI.modal({
      titulo: "Liturgia de Fortalecimento Ritualístico",
      conteudo: [el("div.pilha--curta", { class: "pilha" }, [
        el("select.r-selecao", { "aria-label": "Ritual", onchange: function (ev) { escolha = ev.target.value; } },
          rituais.map(function (r) { return el("option", { value: r.id, texto: r.nome }); })),
        el("p.t-mini", { texto: "A DT do ritual sobe +2 até o início da próxima cena de interlúdio (Arquivos Secretos 2, p. 93)." }),
      ])],
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Fortalecer (2 " + sigla(o) + ")", classe: "r-botao--principal", aoClicar: function (fechar) {
          var r = rituais.filter(function (x) { return x.id === escolha; })[0];
          var plano = A2().fortalecer(JSON.parse(JSON.stringify(o)), escolha, r ? r.nome : "");
          if (!plano.ok) { UI.avisoAtencao(plano.motivo); return; }
          var g = gastar(ctx, 2);
          if (!g) return;
          A2().fortalecer(o, escolha, r ? r.nome : "");
          fechar();
          salvar(ctx);
        } },
      ],
    });
  }

  /* =================================================================
     ANTES DO ATAQUE
     ================================================================= */

  function deDisparo(ef, arma) {
    var a = I() ? (I().dadosDoItem(arma).arma || {}) : {};
    return a.tipo === "fogo" || a.tipo === "disparo";
  }

  function precisaPerguntar(ctx, arma, ef) {
    var o = ordemDe(ctx);
    return tem(o, "especialistaEmMatar") || (tem(o, "disparoDaMorte") && deDisparo(ef, arma));
  }

  function perguntarAntesDoAtaque(ctx, arma, ef, continuar) {
    var o = ordemDe(ctx);
    var nex = R().exposicao ? R().trilho(o).nexEquivalente : 0;
    var maxMatar = tem(o, "especialistaEmMatar") ? A2().patamaresDeEspecialistaEmMatar(nex).length : 0;
    var temDisparo = tem(o, "disparoDaMorte") && deDisparo(ef, arma);
    var st = { ataque: 0, dano: 0, disparo: false };
    var resumo = el("p.t-mini", { role: "status" });
    function atualizar() {
      var p = A2().planoDeEspecialistaEmMatar(nex, st.ataque, st.dano);
      var custo = (p.ok ? p.custo : 0) + (st.disparo ? 3 : 0);
      resumo.textContent = (p.ok ? "" : p.motivo + " ") + "Custo: " + custo + " " + sigla(o) + ".";
    }
    function seletor(rotulo, chave) {
      var opcoes = [];
      for (var k = 0; k <= maxMatar; k++) opcoes.push(el("option", { value: String(k), texto: k ? k + " × +4" : "nenhum" }));
      return el("label.ordenacao", {}, [el("span.ordenacao__rotulo", { texto: rotulo }),
        el("select.r-selecao", { onchange: function (ev) { st[chave] = Number(ev.target.value) || 0; atualizar(); } }, opcoes)]);
    }
    var partes = [];
    if (maxMatar) {
      partes.push(el("p.t-mini", { texto: "Especialista em Matar (AS2 p. 59): até " + maxMatar + " bônus de +4 neste NEX; 2 PE pelo primeiro e +1 PE por bônus. Cada um vai para o ataque ou para o dano." }));
      partes.push(seletor("+4 no ataque", "ataque"));
      partes.push(seletor("+4 no dano", "dano"));
    }
    if (temDisparo) {
      partes.push(el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) { st.disparo = ev.target.checked; atualizar(); } }),
        el("span", { texto: "Disparo da Morte: +2 na margem de ameaça (3 " + sigla(o) + ")" + (comAfinidade(o, "disparoDaMorte") ? "; com afinidade, ignora cobertura e 10 de RD" : "") })]));
    }
    partes.push(resumo);
    atualizar();
    UI.modal({
      titulo: "Antes do ataque · " + arma.nome,
      conteudo: [el("div.pilha--curta", { class: "pilha" }, partes)],
      botoes: [
        { rotulo: "Atacar sem nada", classe: "r-botao--fantasma", aoClicar: function (fechar) { fechar(); continuar({ ataque: 0, margem: 0, dano: 0, notas: [] }); } },
        { rotulo: "Atacar", classe: "r-botao--principal", aoClicar: function (fechar) {
          var p = A2().planoDeEspecialistaEmMatar(nex, st.ataque, st.dano);
          if (!p.ok) { UI.avisoAtencao(p.motivo); return; }
          var custo = p.custo + (st.disparo ? 3 : 0);
          if (custo) { var g = gastar(ctx, custo); if (!g) return; salvar(ctx); }
          var notas = [];
          if (p.ataque || p.dano) notas.push("Especialista em Matar: +" + p.ataque + " no ataque, +" + p.dano + " no dano (" + p.custo + " PE).");
          if (st.disparo) notas.push("Disparo da Morte: +2 na margem" + (comAfinidade(o, "disparoDaMorte") ? "; ignora cobertura e 10 de RD do alvo." : "."));
          fechar();
          continuar({ ataque: p.ataque, dano: p.dano, margem: st.disparo ? 2 : 0, notas: notas, ignoraRd: st.disparo && comAfinidade(o, "disparoDaMorte") ? 10 : 0 });
        } },
      ],
    });
  }

  function gastarNoAtaque(ctx) {
    var o = ordemDe(ctx);
    var a = A2().consumirPendentes(o, "ataque");
    var m = A2().consumirPendentes(o, "margem");
    var al = A2().consumirPendentes(o, "alcance");
    var notas = [];
    if (a.soma) notas.push("+" + a.soma + " no ataque (" + a.fontes.join(", ") + ").");
    if (m.soma) notas.push("+" + m.soma + " na margem (" + m.fontes.join(", ") + ").");
    if (al.soma) notas.push("+" + al.soma + " m de alcance (" + al.fontes.join(", ") + ").");
    if (a.soma || m.soma || al.soma) ctx.alterou();
    return { ataque: a.soma, margem: m.soma, notas: notas };
  }

  /* No dano: o +N do ataque (Especialista em Matar), o "próximo dano"
     guardado, os dados de O Sabor do Silêncio e a Pedra de Amolar. */
  function noDano(ctx, arma, r, ef, extras) {
    var o = ordemDe(ctx);
    var notas = [];
    var x = extras || {};
    if (x.dano) { r.parcelas.push({ rotulo: "Especialista em Matar", valor: x.dano }); r.total += x.dano; }
    if (x.ignoraRd) notas.push("Disparo da Morte (afinidade): ignora 10 de RD e a cobertura do alvo.");
    var p = A2().consumirPendentes(o, "dano");
    if (p.soma) { r.parcelas.push({ rotulo: p.fontes.join(", "), valor: p.soma }); r.total += p.soma; ctx.alterou(); }
    (ef.danoDados || []).forEach(function (dd) {
      var n = rolar(dd.dados);
      r.parcelas.push({ rotulo: dd.fonte + " (" + dd.dados + ")", valor: n });
      r.total += n;
    });
    var d = I() ? I().dadosDoItem(arma) : {};
    if (d.amolada) {
      var cena = A2().cenaDe(o);
      if (!d.amolada.cena || d.amolada.cena === cena) {
        var n2 = rolar("1d4");
        r.parcelas.push({ rotulo: "Pedra de Amolar (1d4)", valor: n2 });
        r.total += n2;
        if (!d.amolada.cena) { arma.ordem.amolada.cena = cena; ctx.alterou(); }
        notas.push("Arma amolada: +1d4 nesta cena (a primeira em que foi usada).");
      }
    }
    if (ef.extraMultiplica) notas.push("O dano depois do “mais” multiplica no crítico — exceção escrita no item (AS2 p. 41).");
    return notas;
  }

  /* No resultado de um teste de perícia: Palpite Confiante. */
  function acoesNoTeste(ctx, o, p, r, dado, bonus, atributo) {
    var saida = [];
    if (tem(o, "palpiteConfiante") && (atributo === "int" || atributo === "pre")) {
      var usado = false;
      saida.push({
        rotulo: "Palpite Confiante: +Int (1 " + sigla(o) + ")",
        aoClicar: function (cartao, b) {
          if (usado) return;
          var g = gastar(ctx, 1);
          if (!g) return;
          usado = true;
          if (b) b.disabled = true;
          salvar(ctx);
          var n = R().atributo(o, "int");
          global.RAMARolagens.mostrar(Object.assign({}, r, { total: r.total + n, parcelas: (r.parcelas || []).concat([{ rotulo: "Palpite Confiante (Int)", valor: n }]) }),
            { nome: p.nome + " · Palpite Confiante", notas: ["Mesmo teste, +" + n + " (Intelecto). Gastou 1 " + g.qual + "."] });
        },
      });
    }
    return saida;
  }

  /* =================================================================
     ITENS DO ARQUIVOS SECRETOS 2 NO INVENTÁRIO
     ================================================================= */

  function dadosItem(item) { return I() ? I().dadosDoItem(item) : (item.ordem || {}); }
  function doCatalogo(item, id) { return item && item.origemCatalogoId === id; }
  function itensDe(ctx) { return (ctx.ficha.inventario && ctx.ficha.inventario.itens) || []; }

  /* Gasta uma unidade (a última some do inventário). */
  function gastarUnidade(ctx, item) {
    if (!item.ordem) item.ordem = {};
    var q = Math.max(1, Number(item.ordem.quantidade) || 1);
    if (q > 1) item.ordem.quantidade = q - 1;
    else ctx.ficha.inventario.itens = itensDe(ctx).filter(function (x) { return x !== item; });
  }

  function ehCortePerfuracao(item) {
    var a = dadosItem(item).arma || {};
    var t = String(a.tipoDano || "").toLowerCase();
    return a.tipo === "corpoACorpo" && /^c$|^p$|corte|perfura/.test(t);
  }

  function opcoesDoItem(ctx, item) {
    var o = ordemDe(ctx);
    var d = dadosItem(item);
    var l = [];
    if (doCatalogo(item, "as2.recurso.bandagem")) l.push({ rotulo: "Usar bandagem…", aoClicar: function () { usarBandagem(ctx, item); } });
    if (doCatalogo(item, "as2.recurso.dose-de-alcool")) l.push({ rotulo: "Usar como antisséptico", aoClicar: function () { usarAlcool(ctx, item); } });
    if (doCatalogo(item, "as2.recurso.incenso")) l.push({ rotulo: "Queimar incenso (interlúdio)", aoClicar: function () { queimarIncenso(ctx, item); } });
    if (doCatalogo(item, "as2.recurso.pedra-de-amolar")) l.push({ rotulo: "Amolar uma arma (interlúdio)…", aoClicar: function () { amolar(ctx); } });
    if (doCatalogo(item, "as2.recurso.agua") || doCatalogo(item, "as2.recurso.comida")) {
      l.push({ rotulo: "Consumir uma unidade", aoClicar: function () { gastarUnidade(ctx, item); salvar(ctx); UI.aviso(item.nome + ": uma unidade consumida."); } });
    }
    if (doCatalogo(item, "as2.amaldicoado.a-antena")) {
      l.push({ rotulo: d.empunhada ? "Soltar A Antena" : "Empunhar A Antena (+3 na DT dos rituais)", aoClicar: function () {
        if (!item.ordem) item.ordem = {};
        if (d.empunhada) delete item.ordem.empunhada; else item.ordem.empunhada = true;
        salvar(ctx);
      } });
      if (d.antena) l.push({ rotulo: "Libertar " + d.antena.nome + " (ação padrão)", aoClicar: function () { libertarAntena(ctx, item); } });
    }
    if (d.rd || doCatalogo(item, "as2.amaldicoado.elmo-do-colosso")) {
      l.push({ rotulo: d.vestida ? "Tirar " + item.nome : "Vestir " + item.nome + " (RD " + (d.rd || 5) + ")", aoClicar: function () {
        if (!item.ordem) item.ordem = {};
        if (d.vestida) delete item.ordem.vestida; else item.ordem.vestida = true;
        salvar(ctx);
      } });
    }
    if (doCatalogo(item, "as2.amaldicoado.faca-predadora")) {
      l.push({ rotulo: "Acertou: recuperar 2d10 PV (2 " + sigla(o) + ")", aoClicar: function () { facaPredadora(ctx); } });
    }
    return l.concat(opcoesDeAcoplavel(ctx, item));
  }

  function observacoesDoItem(ctx, item) {
    var o = ordemDe(ctx);
    var d = dadosItem(item);
    var l = [];
    if (d.amolada) {
      var cena = A2().cenaDe(o);
      l.push(["Amolada", !d.amolada.cena ? "+1d4 na primeira cena em que for usada." : (d.amolada.cena === cena ? "+1d4 nesta cena." : "A amolação já foi gasta (outra cena).")]);
    }
    if (d.antena) l.push(["Ritual contido", d.antena.nome + (d.antena.versao && d.antena.versao !== "Normal" ? " (" + d.antena.versao + ")" : "") + " — uma ação padrão o liberta, sem ações de conjuração nem PE."]);
    if (d.empunhada) l.push(["Empunhada", "A DT dos seus rituais sobe +3."]);
    if (d.vestida) l.push(["Vestida", "Resistência a dano " + (d.rd || 0) + "."]);
    if (d.acoplavel) {
      var par = itensDe(ctx).filter(function (x) { return x.id === d.acoplavel.par; })[0];
      if (d.acoplavel.acoplada && !d.acoplavel.principal) l.push(["Acoplada", "Unida a " + (par ? par.nome : "outra arma") + ", que ataca pelo par."]);
      else if (d.acoplavel.acoplada) l.push(["Acoplada", "Com " + (par ? par.nome : "a outra arma") + ": duas mãos, tática, categoria +I, +1 dado de dano e " + (d.acoplavel.aprimoramento === "multiplicador" ? "+1 no multiplicador" : "+1 na margem") + " (AS2 p. 71). Com Combater com Duas Armas, vale como arma de uma mão e leve."]);
      else l.push(["Acoplável", "Com " + (par ? par.nome : "outra arma") + " — separadas."]);
    }
    return l;
  }

  function usarBandagem(ctx, item) {
    var o = ordemDe(ctx);
    var alcool = itensDe(ctx).filter(function (x) { return doCatalogo(x, "as2.recurso.dose-de-alcool"); })[0];
    var st = { emMim: true, comAlcool: false };
    UI.modal({
      titulo: "Bandagem",
      conteudo: [el("div.pilha--curta", { class: "pilha" }, [
        el("p.t-mini", { texto: "Ação padrão: cura 2d4+2 PV e remove sangrando (Arquivos Secretos 2, p. 21)." }),
        el("label.r-marca", {}, [el("input", { type: "checkbox", checked: true, onchange: function (ev) { st.emMim = ev.target.checked; } }), el("span", { texto: "Em mim (desmarque para um ser adjacente)." })]),
        alcool ? el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) { st.comAlcool = ev.target.checked; } }), el("span", { texto: "Com uma dose de álcool: 2d8+2 (gasta a dose também)." })]) : null,
      ])],
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Usar", classe: "r-botao--principal", aoClicar: function (fechar) {
          var cura = rolar(st.comAlcool ? "2d8+2" : "2d4+2");
          gastarUnidade(ctx, item);
          if (st.comAlcool && alcool) gastarUnidade(ctx, alcool);
          var t = "Bandagem: " + cura + " PV" + (st.comAlcool ? " (com álcool)" : "");
          if (st.emMim) {
            var r = mexerRecurso(ctx, "pv", cura);
            t += " — PV " + r.antes + " → " + r.depois;
            if (EF()) (o.condicoes.efeitos || []).forEach(function (x) {
              if (x.modelo === "cond:sangrando" && EF().ativa(x)) EF().encerrar(o.condicoes, x.id, "manual", "Bandagem");
            });
            t += "; sangrando removido.";
          } else t += " no ser adjacente, e o sangrando dele sai.";
          fechar();
          salvar(ctx);
          UI.aviso(t, { duracao: 7000 });
        } },
      ],
    });
  }

  function usarAlcool(ctx, item) {
    gastarUnidade(ctx, item);
    efeito(ctx, "Dose de álcool", {
      modelo: "item:as2.recurso.dose-de-alcool", nome: "Antisséptico",
      descricao: "+2 em testes contra infecções e doenças transmitidas por contato (Arquivos Secretos 2, p. 21). O livro não dá a duração: encerre quando a mesa disser.",
      modificadores: [], duracao: { tipo: "especial" },
    });
    salvar(ctx);
    UI.aviso("Dose de álcool: +2 contra infecções e doenças por contato (registrado em Condições).");
  }

  function incensoHoje(o) {
    var dia = (o.hexatombe && o.hexatombe.dia) || 0;
    return !!(dia > 0 && o.marcas && o.marcas.incensoDia === dia);
  }

  function receberIncenso(ctx, silencioso) {
    var o = ordemDe(ctx);
    var dia = (o.hexatombe && o.hexatombe.dia) || 0;
    if (incensoHoje(o)) { if (!silencioso) UI.avisoAtencao("Já recebeu o incenso hoje (dia " + dia + ")."); return null; }
    var n = rolar("1d4");
    var r = mexerRecurso(ctx, R().usaDeterminacao(o) ? "pd" : "pe", n);
    if (!o.marcas) o.marcas = {};
    o.marcas.incensoDia = dia;
    return { n: n, r: r };
  }

  function queimarIncenso(ctx, item) {
    gastarUnidade(ctx, item);
    var meu = receberIncenso(ctx, true);
    salvar(ctx);
    UI.aviso("Incenso queimado: todos na mesma cena de interlúdio recuperam 1d4 PE, cada um uma vez por dia, na própria ficha." +
      (meu ? " Você: +" + meu.n + " (" + meu.r.antes + " → " + meu.r.depois + ")." : " Você já recebeu o incenso hoje."), { duracao: 8000 });
  }

  function amolar(ctx) {
    var armas = itensDe(ctx).filter(function (x) { return x.tipo === "arma" && ehCortePerfuracao(x); });
    if (!armas.length) { UI.avisoAtencao("Nenhuma arma corpo a corpo de corte ou perfuração no inventário."); return; }
    var escolha = armas[0].id;
    UI.modal({
      titulo: "Pedra de amolar",
      conteudo: [el("div.pilha--curta", { class: "pilha" }, [
        el("select.r-selecao", { "aria-label": "Arma", onchange: function (ev) { escolha = ev.target.value; } }, armas.map(function (x) { return el("option", { value: x.id, texto: x.nome }); })),
        el("p.t-mini", { texto: "+1d4 de dano do mesmo tipo na primeira cena em que a arma for usada depois de amolada (Arquivos Secretos 2, p. 21)." }),
      ])],
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Amolar", classe: "r-botao--principal", aoClicar: function (fechar) {
          var arma = armas.filter(function (x) { return x.id === escolha; })[0];
          if (!arma.ordem) arma.ordem = {};
          arma.ordem.amolada = { desde: new Date().toISOString(), cena: "" };
          fechar();
          salvar(ctx);
        } },
      ],
    });
  }

  function libertarAntena(ctx, item) {
    var d = item.ordem && item.ordem.antena;
    if (!d) return;
    UI.confirmar({ titulo: "Libertar " + d.nome + "?", texto: "Ação padrão: o efeito do ritual acontece agora, sem ações de conjuração nem PE (Arquivos Secretos 2, p. 67).", rotuloConfirmar: "Libertar" }).then(function (ok) {
      if (!ok) return;
      delete item.ordem.antena;
      salvar(ctx);
      UI.aviso(d.nome + (d.versao && d.versao !== "Normal" ? " (" + d.versao + ")" : "") + " liberto d’A Antena: resolva o efeito agora. A Antena está livre para outro ritual.", { duracao: 8000 });
    });
  }

  function facaPredadora(ctx) {
    var o = ordemDe(ctx);
    var g = gastar(ctx, 2);
    if (!g) return;
    var n = rolar("2d10");
    var c = calc(ctx);
    var falta = Math.max(0, c.pv.total - c.atual.pv);
    var cura = Math.min(n, falta);
    var excesso = n - cura;
    mexerRecurso(ctx, "pv", cura);
    if (excesso > 0 && global.RAMASecaoOrigens && global.RAMASecaoOrigens.temporarioDaCena) {
      global.RAMASecaoOrigens.temporarioDaCena(o, "facaPredadora", "pv", excesso, "Faca Predadora");
    }
    salvar(ctx);
    UI.aviso("Faca Predadora: " + n + " PV (" + cura + " curados" + (excesso ? ", " + excesso + " temporários" : "") + ").");
  }

  /* ---------- Acoplável (AS2 p. 71) ---------- */

  function podeAcoplar(item) {
    var a = dadosItem(item).arma || {};
    return item.tipo === "arma" && a.tipo === "corpoACorpo" && a.empunhadura !== "duasMaos";
  }

  function opcoesDeAcoplavel(ctx, item) {
    if (item.tipo !== "arma") return [];
    var ac = dadosItem(item).acoplavel;
    var l = [];
    if (!ac) {
      if (podeAcoplar(item) && ctx.emEdicao()) l.push({ rotulo: "Tornar acoplável com outra arma…", aoClicar: function () { tornarAcoplavel(ctx, item); } });
      return l;
    }
    var par = itensDe(ctx).filter(function (x) { return x.id === ac.par; })[0];
    if (!par) {
      l.push({ rotulo: "Desfazer o par (a outra arma sumiu)", aoClicar: function () { delete item.ordem.acoplavel; salvar(ctx); } });
      return l;
    }
    if (ac.acoplada) l.push({ rotulo: "Separar as armas (ação de movimento)", aoClicar: function () { acoplar(ctx, item, par, false); } });
    else l.push({ rotulo: "Acoplar com " + par.nome + " (ação de movimento)", aoClicar: function () { acoplar(ctx, item, par, true); } });
    if (ctx.emEdicao() && !ac.acoplada) l.push({ rotulo: "Desfazer o par acoplável", aoClicar: function () { delete item.ordem.acoplavel; delete par.ordem.acoplavel; salvar(ctx); } });
    return l;
  }

  function tornarAcoplavel(ctx, item) {
    var outras = itensDe(ctx).filter(function (x) { return x !== item && podeAcoplar(x) && !dadosItem(x).acoplavel; });
    if (!outras.length) { UI.avisoAtencao("Precisa de outra arma corpo a corpo de uma mão no inventário."); return; }
    var st = { par: outras[0].id, aprimoramento: "margem" };
    UI.modal({
      titulo: "Arma acoplável",
      conteudo: [el("div.pilha--curta", { class: "pilha" }, [
        el("p.t-mini", { texto: "Duas armas corpo a corpo de uma mão que, unidas com uma ação de movimento, viram uma arma tática de duas mãos: categoria +I, +1 dado de dano do mesmo tipo, espaços dobrados e +1 na margem OU no multiplicador de crítico — escolhido agora, na criação (Arquivos Secretos 2, p. 71)." }),
        el("select.r-selecao", { "aria-label": "A outra arma", onchange: function (ev) { st.par = ev.target.value; } }, outras.map(function (x) { return el("option", { value: x.id, texto: x.nome }); })),
        el("select.r-selecao", { "aria-label": "Aprimoramento de crítico", onchange: function (ev) { st.aprimoramento = ev.target.value; } }, [
          el("option", { value: "margem", texto: "+1 na margem de ameaça" }), el("option", { value: "multiplicador", texto: "+1 no multiplicador" })]),
      ])],
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Criar o par", classe: "r-botao--principal", aoClicar: function (fechar) {
          var par = outras.filter(function (x) { return x.id === st.par; })[0];
          if (!item.ordem) item.ordem = {};
          if (!par.ordem) par.ordem = {};
          item.ordem.acoplavel = { par: par.id, aprimoramento: st.aprimoramento, acoplada: false, principal: true };
          par.ordem.acoplavel = { par: item.id, aprimoramento: st.aprimoramento, acoplada: false, principal: false };
          fechar();
          salvar(ctx);
        } },
      ],
    });
  }

  /* Unir e separar só trocam a marca dos dois itens: nada é criado ou
     somado de novo — a arma unida é calculada na leitura. */
  function acoplar(ctx, item, par, unir) {
    var principal = item.ordem.acoplavel.principal ? item : par;
    var outra = principal === item ? par : item;
    principal.ordem.acoplavel.acoplada = unir;
    outra.ordem.acoplavel.acoplada = unir;
    principal.ordem.acoplavel.principal = true;
    outra.ordem.acoplavel.principal = false;
    salvar(ctx);
    UI.aviso(unir ? "Acopladas: " + principal.nome + " ataca pelo par." : "Separadas: cada uma volta a ser de uma mão.");
  }

  global.RAMAFichaArquivo2 = {
    opcoesDoItem: opcoesDoItem,
    observacoesDoItem: observacoesDoItem,
    receberIncenso: receberIncenso,
    painel: painel,
    controles: controles,
    precisaPerguntar: precisaPerguntar,
    perguntarAntesDoAtaque: perguntarAntesDoAtaque,
    gastarNoAtaque: gastarNoAtaque,
    noDano: noDano,
    acoesNoTeste: acoesNoTeste,
    gastar: gastar,
    mexerRecurso: mexerRecurso,
    rolar: rolar,
  };
})(window);
