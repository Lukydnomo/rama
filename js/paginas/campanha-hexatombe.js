/* =====================================================================
   R.A.M.A. — aba Hexatombe da campanha (v2.30, Arquivos Secretos 2)
   ---------------------------------------------------------------------
   O mestre conduz o Hexatombe por aqui: dia e fase, equipes e
   participantes, sacrifícios e estigmas, desertores, base e melhorias,
   estoques, consumo, jornada, procura de recursos, encontros, intenções
   e a Lua de Sangue. As regras moram em js/ordem/hexatombe.js; esta tela
   só aplica UMA operação por vez sobre uma cópia, manda os lançamentos
   às fichas vinculadas e grava o estado (rev + opId).

   O jogador vê a vista que o servidor monta para ele: a própria equipe,
   o que é público (dia, sacrifícios realizados, intenções desbloqueadas,
   mapa) e o diário público ou da equipe. Nada aqui decide permissão: o
   servidor confere tudo de novo.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil, UI = global.RAMAUI, el = U.el;
  function H() { return global.RAMAHexatombe; }

  function rotuloEstigma(k) { var e = H().POR_ESTIGMA[k]; return e ? e.nome : "—"; }

  function opcoes(lista, valor, rotulo) {
    return lista.map(function (x) { return { valor: valor(x), rotulo: rotulo(x) }; });
  }

  /* Um formulário em janela: os campos são UI.campo; `aoConfirmar`
     recebe os valores e devolve true para fechar. */
  function formulario(titulo, campos, aoConfirmar, rotuloConfirmar) {
    UI.modal({
      titulo: titulo,
      conteudo: [el("div.pilha--curta", { class: "pilha" }, campos.filter(Boolean))],
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: rotuloConfirmar || "Confirmar", classe: "r-botao--principal", aoClicar: function (fechar) {
          var valores = {};
          campos.forEach(function (c) { if (c && c.chave) valores[c.chave] = c.entrada ? (c.entrada.type === "checkbox" ? c.entrada.checked : c.entrada.value) : null; });
          Promise.resolve(aoConfirmar(valores)).then(function (ok) { if (ok !== false) fechar(); });
        } },
      ],
    });
  }

  function campo(chave, o) { var c = UI.campo(o); c.chave = chave; return c; }
  function marcaCheck(chave, rotulo, marcado) {
    var entrada = el("input", { type: "checkbox", checked: !!marcado });
    var raiz = el("label.r-marca", {}, [entrada, el("span", { texto: rotulo })]);
    raiz.entrada = entrada;
    raiz.chave = chave;
    return raiz;
  }

  /* =================================================================
     A ABA
     ================================================================= */

  function aba(ctx) {
    var alvo = el("div.pilha", {}, [UI.carregando("Consultando o Hexatombe")]);
    var memoria = { estado: null, rev: 0, vista: null, mestre: ctx.ehMestre(), ocupado: false };

    async function carregar(segundoPlano) {
      var r = await global.RAMAApi.lerHexatombe(ctx.campanhaId, { segundoPlano: !!segundoPlano });
      if (!r.ok) { if (!segundoPlano) U.trocar(alvo, UI.erroDeTela(r, function () { carregar(); })); return; }
      receber(r);
      pintar();
    }

    function receber(r) {
      memoria.rev = U.inteiro(r.rev, 0);
      memoria.mestre = !!(r.dados && r.dados.mestre);
      memoria.estado = memoria.mestre ? H().normalizar(r.dados.estado) : null;
      memoria.vista = memoria.mestre ? null : r.dados.vista;
    }

    ctx.aoAtualizar("hexatombe", function () { if (!memoria.ocupado) carregar(true); });
    ctx.aoAtualizar("personagens", function () { if (memoria.mestre && !memoria.ocupado) pintar(); });

    /* Uma operação: cópia → regra → lançamentos nas fichas → gravação. */
    async function operar(fn, sucesso) {
      if (memoria.ocupado) return false;
      var copia = H().normalizar(U.copiar(memoria.estado));
      var r = fn(copia);
      if (!r || !r.ok) { UI.avisoAtencao((r && r.motivo) || "Não deu para aplicar."); return false; }
      memoria.ocupado = true;
      try {
        H().guardarPendentes(copia, r);
        await enviarPendentes(copia);
        var g = await global.RAMAApi.salvarHexatombe(ctx.campanhaId, memoria.rev, "hx-" + U.uuid().replace(/-/g, "").slice(0, 20), copia);
        if (!g.ok) {
          if (g.erro === "conflito" && g.dados) {
            receber(g);
            pintar();
            UI.avisoAtencao("Outra janela mudou o Hexatombe antes. A tela foi atualizada: confira e refaça.");
            return false;
          }
          UI.avisoDeFalha(g, "gravação do Hexatombe");
          return false;
        }
        receber(g);
        (r.avisos || []).forEach(function (a) { UI.aviso(a, { duracao: 9000 }); });
        if (sucesso) sucesso(r);
        pintar();
        return true;
      } finally {
        memoria.ocupado = false;
      }
    }

    /* Manda os lançamentos pendentes, uma ficha por pedido. O que não
       chegou fica pendente no estado (id estável: reenviar não duplica). */
    async function enviarPendentes(estado) {
      var porPersonagem = {};
      estado.pendentes.forEach(function (x) {
        (porPersonagem[x.personagemId] = porPersonagem[x.personagemId] || []).push(x);
      });
      var ids = Object.keys(porPersonagem);
      for (var i = 0; i < ids.length; i++) {
        var pid = ids[i];
        var itens = porPersonagem[pid].slice(0, 30);
        var r = await global.RAMAApi.lancarHexatombe(ctx.campanhaId, pid, "hxl-" + U.uuid().replace(/-/g, "").slice(0, 20), estado.dia,
          itens.map(function (x) { return { desfazer: x.desfazer, lancamento: x.lancamento }; }));
        if (r.ok) {
          var recusados = (r.dados && r.dados.recusados) || [];
          itens.forEach(function (x) {
            if (!x.desfazer && recusados.indexOf(x.lancamento.id) >= 0) H().marcarPendente(estado, pid, x.lancamento.id, r.dados.motivo);
            else H().tirarPendente(estado, pid, x.lancamento.id, x.desfazer);
          });
          if (recusados.length) UI.avisoAtencao("A ficha de " + nomeDoPersonagem(pid) + " não liga a regra Participação no Hexatombe: " + recusados.length + " lançamento(s) ficam pendentes até ela ligar.");
        } else UI.avisoAtencao("A ficha de " + nomeDoPersonagem(pid) + " não recebeu os lançamentos agora; eles ficam pendentes.");
      }
    }

    function nomeDoPersonagem(id) {
      var p = ctx.personagens.filter(function (x) { return x.id === id; })[0];
      return p ? p.nome : "um personagem";
    }

    /* =================================================================
       DESENHO
       ================================================================= */

    function pintar() {
      if (memoria.mestre) U.trocar(alvo, vistaDoMestre(memoria.estado));
      else U.trocar(alvo, vistaDoJogador(memoria.vista));
    }

    /* ---------------- jogador ---------------- */

    function vistaDoJogador(v) {
      if (!v || !v.ativo) return [UI.vazio({ titulo: "Sem Hexatombe", texto: "O mestre não ativou o Hexatombe nesta campanha." })];
      var minhas = v.equipes.filter(function (e) { return !e.rival; });
      var partes = [
        UI.painel(v.nome, el("div.pilha--curta", { class: "pilha" }, [
          el("p.t-forte", { texto: "Dia " + v.dia + " de " + H().DIAS + " · " + H().NOMES_FASE[v.fase] }),
          v.faseNota ? el("p.t-mini", { texto: v.faseNota }) : null,
          v.fracassou ? el("span.r-etiqueta.r-etiqueta--aviso", { texto: "O Hexatombe fracassou" }) : null,
          el("p.t-mini", { texto: "Sacrifícios realizados: " + (v.sacrificios.length ? v.sacrificios.map(function (s) { return "dia " + s.dia + " (" + rotuloEstigma(s.estigma) + ")"; }).join(", ") : "nenhum") + "." }),
        ])),
      ];
      minhas.forEach(function (e) {
        var gente = v.participantes.filter(function (p) { return p.equipeId === e.id; });
        partes.push(UI.painel("Equipe " + e.nome, el("div.pilha--curta", { class: "pilha" }, [
          el("p.t-mini", { texto: "Base: " + (e.base.melhorias.length ? e.base.melhorias.map(function (k) { return H().POR_MELHORIA[k].nome; }).join(", ") : "sem melhorias") + " · descanso " + e.descanso + "." }),
          (e.obras || []).length ? el("p.t-mini", { texto: "Em obra: " + e.obras.map(function (ob) { return H().POR_MELHORIA[ob.melhoria].nome + " (pronta no dia " + (ob.inicio + ob.dias) + ")"; }).join(", ") + "." }) : null,
          (v.trocas || []).filter(function (t) { return t.equipeId === e.id; }).length ? el("ul.bib-lista-textos", {}, v.trocas.filter(function (t) { return t.equipeId === e.id; }).map(function (t) {
            return el("li.t-mini", { texto: "Dia " + t.dia + " · " + (t.tipo === "segredo" ? "Segredo" : "Informação") + (t.sobre ? " sobre " + t.sobre : "") + (t.conteudo ? ": " + t.conteudo : "") });
          })) : null,
          el("p.t-mini", { texto: "Estoque: " + textoDoEstoque(e.estoque) + "." }),
          el("ul.bib-lista-textos", {}, gente.map(function (p) {
            return el("li.t-mini", { texto: p.nome + chipsDoParticipante(p) + (p.meu ? " · você" : "") });
          })),
        ])));
      });
      var meus = v.participantes.filter(function (p) { return p.meu; });
      partes.push(UI.painel("Intenções", el("div.pilha--curta", { class: "pilha" }, v.intencoes.length ? v.intencoes.map(function (x) {
        var e = H().POR_ESTIGMA[x.estigma];
        var feitos = meus.filter(function (p) { return p.intencoes && p.intencoes[x.estigma]; }).map(function (p) { return p.nome; });
        return el("div.pilha--curta", { class: "pilha" }, [
          el("p.t-forte", { texto: e.nome + " (dia " + x.dia + ")" + (feitos.length ? " · cumprida por " + feitos.join(", ") : "") }),
          el("p.t-mini", { texto: "Missão: " + e.missao + " Recompensa: " + e.recompensa }),
        ]);
      }) : [el("p.t-mini", { texto: "Nenhuma intenção desbloqueada: cada sacrifício realizado desbloqueia a do estigma dele." })])));
      meus.forEach(function (p) {
        var linhas = [];
        if (p.sede) linhas.push(p.sede + " dia(s) de sede em aberto (−10 PV máx. cada; 1 água a mais no fim de um dia recupera).");
        if (p.fome) linhas.push(p.fome + " dia(s) de fome em aberto (−10 PE máx. cada; 1 comida a mais recupera).");
        if (p.desertor) linhas.push("Desertor: castigos sofridos " + p.castigos + " de " + H().MAX_CASTIGOS + ".");
        if (p.alternativas && p.alternativas.length) linhas.push("Perícias alternativas já usadas em jornada: " + p.alternativas.join(", ") + ".");
        if (linhas.length) partes.push(UI.painel(p.nome, el("ul.bib-lista-textos", {}, linhas.map(function (t) { return el("li.t-mini", { texto: t }); }))));
      });
      partes.push(painelDoMapa(v, false));
      partes.push(painelDoDiario(v.registro, false));
      return partes;
    }

    function textoDoEstoque(es) {
      var base = es.agua + " água(s), " + es.comida + " comida(s), " + es.sucata + " sucata(s)";
      return es.itens.length ? base + ", " + es.itens.map(function (i) { return i.qtd + "× " + i.nome; }).join(", ") : base;
    }

    function chipsDoParticipante(p) {
      var c = [];
      if (p.sacrificio) c.push("sacrifício (" + rotuloEstigma(p.estigma) + ")");
      if (!p.vivo) c.push("morto");
      if (p.desertor) c.push("desertor");
      return c.length ? " · " + c.join(" · ") : "";
    }

    /* ---------------- mestre ---------------- */

    function vistaDoMestre(e) {
      var partes = [painelDoTopo(e)];
      if (!e.ativo) {
        partes.push(UI.vazio({ titulo: "Hexatombe desligado", texto: "Ative para conduzir o ritual nesta campanha. Os jogadores só veem a aba com o modo ativo, e só o que é deles." }));
        return partes;
      }
      if (e.pendencias.length) partes.push(painelDePendencias(e));
      if (e.pendentes.length) partes.push(painelDePendentes(e));
      partes.push(painelDeEquipes(e));
      partes.push(painelAs3(e));
      partes.push(painelDeIntencoes(e));
      partes.push(painelDoMapa(e, true));
      partes.push(painelDeEncontros(e));
      partes.push(painelDoFinal(e));
      partes.push(painelDoDiario(e.registro, true));
      return partes;
    }

    function botao(texto, fn, extra) {
      var x = extra || {};
      return el("button.r-botao.r-botao--mini" + (x.perigo ? ".r-botao--perigo" : ""), { type: "button", texto: texto, disabled: !!x.desligado, title: x.dica || "", onclick: fn });
    }

    function painelDoTopo(e) {
      var faseSel = el("select.r-selecao", { "aria-label": "Fase do dia", disabled: !e.ativo,
        onchange: function (ev) { operar(function (c) { return H().definirFase(c, ev.target.value, c.faseNota); }); } },
        H().FASES.map(function (f) { return el("option", { value: f, texto: H().NOMES_FASE[f], selected: f === e.fase }); }));
      return UI.painel("Hexatombe", el("div.pilha--curta", { class: "pilha" }, [
        el("p.t-mini", { texto: "Arquivos Secretos 2, p. 4–24. Seis dias, seis equipes, um sacrifício por noite. As fases são sugestões: ajuste o ritmo com a mesa." }),
        e.ativo ? el("p.t-forte", { texto: "Dia " + e.dia + " de " + H().DIAS + (e.fracassou ? " · fracassou" : "") }) : null,
        e.ativo ? el("div.faixa", {}, [
          faseSel,
          botao("Nota da fase", function () {
            UI.pedirTexto({ titulo: "Nota da fase", rotulo: "Visível aos jogadores", valor: e.faseNota, limite: 200 }).then(function (t) {
              if (t === null) return;
              operar(function (c) { return H().definirFase(c, c.fase, t); });
            });
          }),
          botao(e.dia ? "Avançar para o dia " + (e.dia + 1) : "Começar (dia 1)", function () {
            UI.confirmar({ titulo: "Avançar o dia?", texto: "Só o dia, a fase e a produção da base mudam.",
              detalhe: "Mortes, consumo, encontros e intenções não são resolvidos sozinhos: registre cada um na sua hora.", rotuloConfirmar: "Avançar" })
              .then(function (sim) { if (sim) operar(function (c) { return H().avancarDia(c); }); });
          }, { desligado: e.dia >= H().DIAS }),
        ]) : null,
        el("div.faixa", {}, [
          botao(e.ativo ? "Desativar o modo" : "Ativar o Hexatombe", function () {
            UI.confirmar({ titulo: e.ativo ? "Desativar o Hexatombe?" : "Ativar o Hexatombe?",
              texto: e.ativo ? "Nada é apagado; os jogadores deixam de ver a aba." : "Os jogadores da campanha passam a ver a aba Hexatombe, só com o que é deles.",
              rotuloConfirmar: e.ativo ? "Desativar" : "Ativar" })
              .then(function (sim) { if (sim) operar(function (c) { return H().ligar(c, !c.ativo); }); });
          }),
          e.ativo ? el("label.ordenacao", {}, [
            el("span.ordenacao__rotulo", { texto: "Tabela de recursos" }),
            el("select.r-selecao", { onchange: function (ev) { operar(function (c) { c.leituraDeRecursos = ev.target.value; return { ok: true, avisos: [], lancamentos: [], desfazer: [] }; }); } }, [
              el("option", { value: "coluna", texto: "Uma rolagem na maior coluna alcançada", selected: e.leituraDeRecursos === "coluna" }),
              el("option", { value: "cumulativa", texto: "Uma rolagem em cada coluna alcançada", selected: e.leituraDeRecursos === "cumulativa" }),
            ]),
          ]) : null,
        ]),
      ]));
    }

    function painelDePendencias(e) {
      return UI.painel("A Coroa escolhe", el("div.pilha--curta", { class: "pilha" }, e.pendencias.map(function (pd) {
        var candidatos = H().vivos(e).filter(function (p) { return !p.sacrificio; });
        return el("div.faixa", {}, [
          el("span.t-mini", { texto: "Estigma de " + rotuloEstigma(pd.estigma) + " sem portador (dia " + pd.dia + "). " + pd.motivo }),
          el("select.r-selecao", { "aria-label": "Herdeiro do estigma", onchange: function (ev) {
            if (!ev.target.value) return;
            operar(function (c) { return H().escolherHerdeiro(c, pd.id, ev.target.value); });
          } }, [el("option", { value: "", texto: "Escolher herdeiro…" })].concat(candidatos.map(function (p) { return el("option", { value: p.id, texto: p.nome }); }))),
        ]);
      })));
    }

    function painelDePendentes(e) {
      return UI.painel("Lançamentos pendentes", el("div.pilha--curta", { class: "pilha" }, [
        el("p.t-mini", { texto: e.pendentes.length + " lançamento(s) ainda não chegaram às fichas. Reenviar não duplica: cada um tem id estável." }),
        el("ul.bib-lista-textos", {}, e.pendentes.slice(-12).map(function (x) {
          return el("li.t-mini", { texto: nomeDoPersonagem(x.personagemId) + " · " + (x.desfazer ? "desfazer " + x.lancamento.id : (x.lancamento.motivo || x.lancamento.id)) +
            (x.motivo === "participacao_desligada" ? " — suspenso: a ficha não liga Participação no Hexatombe" : " — aguardando envio") });
        })),
        botao("Reenviar agora", function () { operar(function () { return { ok: true, avisos: [], lancamentos: [], desfazer: [] }; }); }),
      ]));
    }

    /* ---------------- equipes e participantes ---------------- */

    function painelDeEquipes(e) {
      var cartoes = e.equipes.map(function (q) { return cartaoDeEquipe(e, q); });
      var semEquipe = e.participantes.filter(function (p) { return !p.equipeId; });
      if (semEquipe.length) cartoes.push(UI.recolhivel({ titulo: "Sem equipe", extra: semEquipe.length + "", aberto: true,
        conteudo: [el("div.pilha--curta", { class: "pilha" }, semEquipe.map(function (p) { return linhaDoParticipante(e, p); }))] }));
      return UI.painel("Equipes", el("div.pilha--curta", { class: "pilha" }, cartoes.length ? cartoes : [el("p.t-mini", { texto: "Nenhuma equipe ainda. Crie as seis equipes e ponha os participantes." })]), {
        acoes: [
          botao("+ Equipe", function () { editarEquipe(e, null); }),
          botao("+ Participante", function () { editarParticipante(e, null); }),
        ],
      });
    }

    /* Arquivos Secretos 3 (p. 121): Trocas de Recursos e Tempo de
       Construção de Base, regras de campanha desligadas por padrão. */
    function painelAs3(e) {
      var r = e.regrasAs3 || { trocas: false, construcao: false };
      var partes = [
        el("p.t-mini", { texto: "Regras opcionais do Arquivos Secretos 3 para o Hexatombe desta campanha. Desligadas, os registros ficam guardados." }),
        el("label.r-marca", {}, [el("input", { type: "checkbox", checked: r.trocas, onchange: function (ev) {
          var v = ev.target.checked;
          operar(function (c) { return H().definirRegrasAs3(c, { trocas: v, construcao: (c.regrasAs3 || {}).construcao }); });
        } }), el("span", { texto: "Trocas de Recursos: informação (1 recurso) e segredo (3) com um NPC" })]),
        el("label.r-marca", {}, [el("input", { type: "checkbox", checked: r.construcao, onchange: function (ev) {
          var v = ev.target.checked;
          operar(function (c) { return H().definirRegrasAs3(c, { trocas: (c.regrasAs3 || {}).trocas, construcao: v }); });
        } }), el("span", { texto: "Tempo de Construção de Base: 7 dias para uma pessoa, −1 por pessoa a mais (mínimo 3); as melhorias improvisadas continuam" })]),
      ];
      if (r.construcao && e.equipes.length) partes.push(botao("Começar uma obra…", function () { iniciarObra(e); }));
      if (r.trocas && e.equipes.length) partes.push(botao("Registrar troca…", function () { registrarTroca(e); }));
      if (e.trocas.length) {
        partes.push(el("ul.bib-lista-textos", {}, e.trocas.slice(-10).reverse().map(function (t) {
          var eq = H().equipe(e, t.equipeId);
          var pg = ["agua", "comida", "sucata"].filter(function (k) { return t.pagamento[k]; }).map(function (k) { return t.pagamento[k] + " " + k; }).join(", ");
          return el("li.t-mini", { texto: "Dia " + t.dia + " · " + (eq ? eq.nome : "?") + " · " + (t.tipo === "segredo" ? "segredo" : "informação") + (t.sobre ? " sobre " + t.sobre : "") + (t.npc ? " (" + t.npc + ")" : "") + " · pago: " + pg + (t.conteudo ? " — " + t.conteudo : "") });
        })));
      }
      return UI.painel("Arquivos Secretos 3: trocas e obras", el("div.pilha--curta", { class: "pilha" }, partes));
    }

    function iniciarObra(e) {
      var eqs = opcoes(e.equipes, function (q) { return q.id; }, function (q) { return q.nome; });
      var mels = opcoes(H().MELHORIAS.filter(function (m) { return !m.recurso; }), function (m) { return m.chave; }, function (m) { return m.nome + " (" + m.custo + " sucata)"; });
      formulario("Começar uma obra", [
        campo("equipe", { rotulo: "Equipe", tipo: "selecao", opcoes: eqs, valor: eqs[0].valor }),
        campo("melhoria", { rotulo: "Melhoria", tipo: "selecao", opcoes: mels, valor: mels[0].valor }),
        campo("pessoas", { rotulo: "Pessoas trabalhando", tipo: "numero", valor: 1, ajuda: "7 dias para uma; −1 por pessoa a mais, até 3." }),
        campo("nota", { rotulo: "Nota", valor: "", limite: 200 }),
      ], function (v) {
        return operar(function (c) { return H().iniciarObra(c, v.equipe, v.melhoria, Number(v.pessoas) || 1, v.nota); });
      }, "Começar");
    }

    function registrarTroca(e) {
      var eqs = opcoes(e.equipes, function (q) { return q.id; }, function (q) { return q.nome; });
      formulario("Troca de recursos", [
        campo("equipe", { rotulo: "Equipe que paga", tipo: "selecao", opcoes: eqs, valor: eqs[0].valor }),
        campo("tipo", { rotulo: "O que compra", tipo: "selecao", valor: "informacao", opcoes: [
          { valor: "informacao", rotulo: "Informação — uma pista pequena (1 recurso)" }, { valor: "segredo", rotulo: "Segredo — uma pista importante (3 recursos)" }] }),
        campo("agua", { rotulo: "Água", tipo: "numero", valor: 0 }),
        campo("comida", { rotulo: "Comida", tipo: "numero", valor: 0 }),
        campo("sucata", { rotulo: "Sucata", tipo: "numero", valor: 1 }),
        campo("npc", { rotulo: "Com quem (NPC)", valor: "", limite: 60 }),
        campo("sobre", { rotulo: "Sobre quem ou que equipe", valor: "", limite: 80 }),
        campo("conteudo", { rotulo: "O que foi revelado (só a equipe e a mesa veem)", tipo: "area", valor: "", limite: 600 }),
      ], function (v) {
        return operar(function (c) {
          return H().registrarTroca(c, { equipeId: v.equipe, tipo: v.tipo, pagamento: { agua: Number(v.agua) || 0, comida: Number(v.comida) || 0, sucata: Number(v.sucata) || 0 },
            npc: v.npc, sobre: v.sobre, conteudo: v.conteudo });
        });
      }, "Registrar");
    }

    function cartaoDeEquipe(e, q) {
      var gente = H().membros(e, q.id);
      var vivos = gente.filter(function (p) { return p.vivo; }).length;
      return UI.recolhivel({
        titulo: q.nome, extra: vivos + "/" + gente.length + " vivos" + (H().equipeDesertora(e, q.id) ? " · desertora" : ""),
        conteudo: [el("div.pilha--curta", { class: "pilha" }, [
          el("p.t-mini", { texto: "Estoque: " + textoDoEstoque(q.estoque) + ". Descanso " + H().condicaoDeDescanso(e, q.id) + "." }),
          el("div.faixa", {}, [
            botao("Ajustar estoque", function () { ajustarEstoque(e, q); }),
            botao("Base e melhorias", function () { abrirBase(e, q); }),
            botao("Editar", function () { editarEquipe(e, q); }),
            botao("Remover", function () {
              UI.confirmar({ titulo: "Remover " + q.nome + "?", texto: "Só equipes sem participantes podem sair.", rotuloConfirmar: "Remover", perigo: true })
                .then(function (sim) { if (sim) operar(function (c) { return H().removerEquipe(c, q.id); }); });
            }, { perigo: true }),
          ]),
          q.notas ? el("p.t-mini", { texto: "Notas do mestre: " + q.notas }) : null,
          (q.obras || []).length ? el("div.pilha--curta", { class: "pilha" }, q.obras.map(function (ob) {
            var pronta = ob.inicio + ob.dias;
            return el("div.faixa", {}, [
              el("span.t-mini", { texto: "Obra: " + H().POR_MELHORIA[ob.melhoria].nome + " — " + ob.pessoas + " pessoa(s), " + ob.dias + " dias (pronta no dia " + pronta + ")" + (ob.nota ? " · " + ob.nota : "") }),
              botao("Concluir", function () {
                if (e.dia < pronta) {
                  UI.confirmar({ titulo: "Concluir antes do dia " + pronta + "?", texto: "Pela regra, a obra fica pronta no dia " + pronta + ". Concluir agora é decisão da mesa.", rotuloConfirmar: "Concluir mesmo assim" })
                    .then(function (sim) { if (sim) operar(function (c) { return H().concluirObra(c, q.id, ob.id, true); }); });
                  return;
                }
                operar(function (c) { return H().concluirObra(c, q.id, ob.id); });
              }),
              botao("Abandonar", function () { operar(function (c) { return H().cancelarObra(c, q.id, ob.id); }); }),
            ]);
          })) : null,
          el("div.pilha--curta", { class: "pilha" }, gente.map(function (p) { return linhaDoParticipante(e, p); })),
        ])],
      });
    }

    function linhaDoParticipante(e, p) {
      var itens = [
        { rotulo: "Editar", aoClicar: function () { editarParticipante(e, p); } },
      ];
      if (p.vivo) {
        itens.push({ rotulo: "Consumo do dia", aoClicar: function () { consumo(e, p); } });
        itens.push({ rotulo: "Cumprir intenção", aoClicar: function () { cumprir(e, p); } });
        itens.push({ rotulo: "Procurar recursos", aoClicar: function () { procurar(e, p); } });
        if (!p.desertor) itens.push({ rotulo: "Saiu da arena (desertor)", aoClicar: function () { operar(function (c) { return H().marcarDesertor(c, p.id, "saiu"); }); } });
        if (p.desertor && p.desertor.motivo === "saiu") itens.push({ rotulo: "Voltou à arena", aoClicar: function () { operar(function (c) { return H().retornarDaArena(c, p.id); }); } });
        itens.push("separador");
        itens.push({ rotulo: "Registrar morte", perigo: true, aoClicar: function () { morte(e, p); } });
      }
      var dias = Object.keys(p.consumo).map(Number);
      if (dias.length) itens.push({ rotulo: "Desfazer consumo de um dia", aoClicar: function () { desfazerConsumo(e, p); } });
      var cumpridas = Object.keys(p.intencoes);
      if (cumpridas.length) itens.push({ rotulo: "Desfazer intenção", aoClicar: function () { desfazerIntencao(e, p); } });
      itens.push("separador");
      itens.push({ rotulo: "Remover participante", perigo: true, aoClicar: function () {
        UI.confirmar({ titulo: "Remover " + p.nome + "?", texto: "Os lançamentos já feitos na ficha continuam lá (desfaça na ficha, se for o caso).", rotuloConfirmar: "Remover", perigo: true })
          .then(function (sim) { if (sim) operar(function (c) { return H().removerParticipante(c, p.id); }); });
      } });
      var detalhe = [];
      if (p.personagemId) detalhe.push("ficha: " + nomeDoPersonagem(p.personagemId));
      if (p.sede) detalhe.push("sede " + p.sede);
      if (p.fome) detalhe.push("fome " + p.fome);
      if (p.desertor) detalhe.push("castigos " + p.castigos + "/" + H().MAX_CASTIGOS + (p.desertor.motivo === "saiu" ? " (fora da arena)" : ""));
      if (cumpridas.length) detalhe.push("intenções: " + cumpridas.map(rotuloEstigma).join(", "));
      if (p.consumo[e.dia]) detalhe.push("consumo hoje: " + p.consumo[e.dia].agua + " água, " + p.consumo[e.dia].comida + " comida");
      return el("div.faixa.hx-participante", {}, [
        el("div.pilha--curta", { class: "pilha" }, [
          el("span.t-forte", { texto: p.nome + chipsDoParticipante({ sacrificio: p.sacrificio, estigma: p.estigma, vivo: p.vivo, desertor: !!p.desertor }) + (p.original ? " · eleito na origem" : "") }),
          detalhe.length ? el("span.t-mini", { texto: detalhe.join(" · ") }) : null,
        ]),
        UI.menu(itens, { rotulo: "Ações de " + p.nome, icone: "tresPontos" }),
      ]);
    }

    function editarEquipe(e, q) {
      var nome = campo("nome", { rotulo: "Nome", valor: q ? q.nome : "", limite: 60 });
      var notas = campo("notas", { rotulo: "Notas do mestre (privadas)", tipo: "area", linhas: 3, valor: q ? q.notas : "", limite: 1000 });
      formulario(q ? "Editar equipe" : "Nova equipe", [nome, notas], function (v) {
        return operar(function (c) { return H().salvarEquipe(c, { id: q ? q.id : undefined, nome: v.nome, notas: v.notas }); });
      }, "Salvar");
    }

    function editarParticipante(e, p) {
      var personagens = ctx.personagens;
      var nome = campo("nome", { rotulo: "Nome", valor: p ? p.nome : "", limite: 80 });
      var equipeSel = campo("equipeId", { rotulo: "Equipe", tipo: "selecao", valor: p ? p.equipeId : (e.equipes[0] ? e.equipes[0].id : ""),
        opcoes: [{ valor: "", rotulo: "Sem equipe" }].concat(opcoes(e.equipes, function (x) { return x.id; }, function (x) { return x.nome; })) });
      var ficha = campo("personagemId", { rotulo: "Ficha vinculada (recebe os lançamentos)", tipo: "selecao", valor: p ? p.personagemId : "",
        opcoes: [{ valor: "", rotulo: "Nenhuma (NPC)" }].concat(opcoes(personagens, function (x) { return x.id; }, function (x) { return x.nome; })) });
      var sac = marcaCheck("sacrificio", "É sacrifício (porta um estigma da Coroa)", p && p.sacrificio);
      var estigma = campo("estigma", { rotulo: "Estigma", tipo: "selecao", valor: p ? p.estigma : "",
        opcoes: [{ valor: "", rotulo: "—" }].concat(opcoes(H().ESTIGMAS, function (x) { return x.chave; }, function (x) { return x.nome + " (" + x.sentimentos + ")"; })) });
      var original = marcaCheck("original", "Eleito sacrifício na origem (regra VI)", p ? p.original : true);
      var notas = campo("notas", { rotulo: "Notas do mestre (privadas)", tipo: "area", linhas: 2, valor: p ? p.notas : "", limite: 600 });
      if (!personagens.length && ctx.buscarPersonagens) ctx.buscarPersonagens().then(function () { /* a próxima abertura já lista */ });
      formulario(p ? "Editar participante" : "Novo participante", [nome, equipeSel, ficha, sac, estigma, original, notas], function (v) {
        return operar(function (c) {
          return H().salvarParticipante(c, { id: p ? p.id : undefined, nome: v.nome, equipeId: v.equipeId, personagemId: v.personagemId,
            sacrificio: v.sacrificio, estigma: v.estigma, original: v.sacrificio && v.original, notas: v.notas });
        });
      }, "Salvar");
    }

    function ajustarEstoque(e, q) {
      var agua = campo("agua", { rotulo: "Água", tipo: "numero", valor: q.estoque.agua });
      var comida = campo("comida", { rotulo: "Comida", tipo: "numero", valor: q.estoque.comida });
      var sucata = campo("sucata", { rotulo: "Sucata", tipo: "numero", valor: q.estoque.sucata });
      var itens = campo("itens", { rotulo: "Outros itens (um por linha: “2 Bandagem”)", tipo: "area", linhas: 4, limite: 2000,
        valor: q.estoque.itens.map(function (i) { return i.qtd + " " + i.nome; }).join("\n") });
      formulario("Estoque de " + q.nome, [agua, comida, sucata, itens], function (v) {
        var lista = String(v.itens || "").split(/\n+/).map(function (l) {
          var m = /^\s*(\d+)\s*[x×]?\s+(.+)$/.exec(l);
          return m ? { qtd: Number(m[1]), nome: m[2].trim() } : (l.trim() ? { qtd: 1, nome: l.trim() } : null);
        }).filter(Boolean);
        return operar(function (c) {
          return H().salvarEquipe(c, { id: q.id, estoque: { agua: v.agua, comida: v.comida, sucata: v.sucata, itens: lista } });
        });
      }, "Salvar");
    }

    function abrirBase(e, q) {
      var linhas = H().MELHORIAS.map(function (m) {
        var tem = q.base.melhorias.indexOf(m.chave) >= 0;
        var custo = m.recurso ? "recurso: " + m.recurso : m.custo + " sucata";
        return el("div.faixa", {}, [
          el("div.pilha--curta", { class: "pilha" }, [
            el("span.t-forte", { texto: m.nome + (tem ? " ✓" : "") + (m.especialDaTransmissao ? " *" : "") }),
            el("span.t-mini", { texto: custo + " · " + m.beneficio }),
          ]),
          tem ? botao("Perdeu", function () { fechar(); operar(function (c) { return H().removerMelhoria(c, q.id, m.chave); }); })
            : m.recurso ? botao("Instalar", function () { fechar(); operar(function (c) { return H().instalarMelhoriaEspecial(c, q.id, m.chave); }); })
              : botao("Tentar (teste DT " + H().DT_MELHORIA + ")", function () {
                fechar();
                UI.pedirTexto({ titulo: m.nome, rotulo: "Resultado do teste da perícia escolhida (DT " + H().DT_MELHORIA + ")", valor: "", limite: 4 }).then(function (t) {
                  if (t === null) return;
                  operar(function (c) { return H().tentarMelhoria(c, q.id, m.chave, t); });
                });
              }),
        ]);
      });
      var janela = UI.modal({
        titulo: "Base de " + q.nome, largo: true,
        conteudo: [el("div.pilha--curta", { class: "pilha" }, [
          el("p.t-mini", { texto: "Sucata disponível: " + q.estoque.sucata + ". Passou, a melhoria fica e a sucata é gasta; falhou, nada; falhou por 5 ou mais, a sucata é gasta sem a melhoria (p. 16). * Ligadas às equipes da transmissão: adapte à sua mesa." }),
          el("p.t-mini", { texto: "Descansar na base: uma ação de interlúdio só, entre " + H().ACOES_DE_DESCANSO.join(", ") + ". Condição: " + H().condicaoDeDescanso(e, q.id) + "." }),
        ].concat(linhas))],
        botoes: [{ rotulo: "Fechar" }],
      });
      function fechar() { if (janela && janela.fechar) janela.fechar(); }
    }

    function consumo(e, p) {
      var agua = campo("agua", { rotulo: "Água consumida", tipo: "numero", valor: 1 });
      var comida = campo("comida", { rotulo: "Comida consumida", tipo: "numero", valor: 1 });
      formulario("Consumo de " + p.nome + " · dia " + e.dia, [
        el("p.t-mini", { texto: "Sai do estoque da equipe. Menos de 1: −10 PV (água) ou PE (comida) máximos a partir do dia seguinte. 2 ou mais recupera um déficit antigo. As regras de fome e sede do livro básico (p. 292) continuam valendo." }),
        agua, comida,
      ], function (v) { return operar(function (c) { return H().consumir(c, p.id, v.agua, v.comida); }); }, "Registrar");
    }

    function desfazerConsumo(e, p) {
      var dias = Object.keys(p.consumo).map(Number).sort();
      var dia = campo("dia", { rotulo: "Dia", tipo: "selecao", valor: String(dias[dias.length - 1]),
        opcoes: dias.map(function (d) { return { valor: String(d), rotulo: "Dia " + d + " (" + p.consumo[d].agua + " água, " + p.consumo[d].comida + " comida)" }; }) });
      formulario("Desfazer consumo de " + p.nome, [dia], function (v) { return operar(function (c) { return H().desfazerConsumo(c, p.id, v.dia); }); }, "Desfazer");
    }

    function cumprir(e, p) {
      var abertas = e.intencoes.filter(function (x) { return !p.intencoes[x.estigma]; });
      if (!abertas.length) { UI.avisoAtencao("Nenhuma intenção desbloqueada em aberto para " + p.nome + "."); return; }
      var sel = campo("estigma", { rotulo: "Intenção", tipo: "selecao", valor: abertas[0].estigma,
        opcoes: abertas.map(function (x) { var k = H().POR_ESTIGMA[x.estigma]; return { valor: x.estigma, rotulo: k.nome + " — " + k.missao }; }) });
      formulario("Intenção cumprida por " + p.nome, [
        el("p.t-mini", { texto: "Confirme que a missão foi mesmo cumprida: a recompensa vira lançamento na ficha vinculada." }), sel,
      ], function (v) { return operar(function (c) { return H().cumprirIntencao(c, p.id, v.estigma); }); }, "Confirmar");
    }

    function desfazerIntencao(e, p) {
      var feitas = Object.keys(p.intencoes);
      var sel = campo("estigma", { rotulo: "Intenção", tipo: "selecao", valor: feitas[0], opcoes: feitas.map(function (k) { return { valor: k, rotulo: rotuloEstigma(k) }; }) });
      formulario("Desfazer intenção de " + p.nome, [sel], function (v) { return operar(function (c) { return H().desfazerIntencao(c, p.id, v.estigma); }); }, "Desfazer");
    }

    function morte(e, p) {
      var outros = H().vivos(e).filter(function (x) { return x.id !== p.id; });
      var por = campo("por", { rotulo: "Quem matou", tipo: "selecao", valor: "",
        opcoes: [{ valor: "", rotulo: "Ninguém do Hexatombe / desconhecido" }].concat(opcoes(outros, function (x) { return x.id; }, function (x) { return x.nome; })) });
      var momento = campo("momento", { rotulo: "Quando", tipo: "selecao", valor: "noite",
        opcoes: [{ valor: "noite", rotulo: "À noite (perante a lua)" }, { valor: "dia", rotulo: "De dia" }] });
      var causa = campo("causa", { rotulo: "Como", tipo: "selecao", valor: "morto",
        opcoes: [{ valor: "morto", rotulo: "Morto por alguém" }, { valor: "suicidio", rotulo: "Tirou a própria vida" }, { valor: "acidente", rotulo: "Acidente" }] });
      var aviso = p.sacrificio
        ? "Sacrifício: o primeiro da noite toca o sino (desbloqueia a intenção de " + rotuloEstigma(p.estigma) + " e castiga os desertores); um segundo na mesma noite, ou de dia, passa o estigma a quem matou. A equipe que perde o sacrifício deserta."
        : "Não é sacrifício: só a morte é registrada.";
      formulario("Morte de " + p.nome, [el("p.t-mini", { texto: aviso }), por, momento, causa], function (v) {
        return operar(function (c) { return H().registrarMorte(c, { participanteId: p.id, por: v.por, momento: v.momento, causa: v.causa }); });
      }, "Registrar a morte");
    }

    function procurar(e, p) {
      if (!e.areas.length) { UI.avisoAtencao("Crie as áreas do mapa primeiro."); return; }
      var area = campo("areaId", { rotulo: "Onde", tipo: "selecao", valor: e.areas[0].id, opcoes: opcoes(e.areas, function (a) { return a.id; }, function (a) { return a.nome; }) });
      var total = campo("total", { rotulo: "Resultado do teste (Investigação ou perícia justificada)", tipo: "numero", valor: "" });
      formulario("Procurar recursos: " + p.nome, [
        el("p.t-mini", { texto: "Um teste por personagem em cada local. 15+, 20+ e 25+ abrem as colunas da tabela (1d12). Leitura atual: " + (e.leituraDeRecursos === "cumulativa" ? "uma rolagem em cada coluna alcançada." : "uma rolagem na maior coluna alcançada.") }),
        area, total,
      ], function (v) {
        return operar(function (c) { return H().procurarRecursos(c, { participanteId: p.id, areaId: v.areaId, total: v.total }); }, function (r) {
          UI.aviso(r.achados.length ? "Encontrado: " + r.achados.map(function (a) { return a.nome + " (" + a.coluna + "+, d12 " + a.d12 + ")"; }).join(", ") + ". Foi para o estoque da equipe." : "Nada encontrado (menos de 15).", { duracao: 9000 });
        });
      }, "Rolar e guardar");
    }

    /* ---------------- intenções ---------------- */

    function painelDeIntencoes(e) {
      return UI.painel("Intenções", el("div.pilha--curta", { class: "pilha" }, H().ESTIGMAS.map(function (k) {
        var aberta = e.intencoes.filter(function (x) { return x.estigma === k.chave; })[0];
        var portador = e.participantes.filter(function (p) { return p.sacrificio && p.estigma === k.chave && p.vivo; })[0];
        var feitos = e.participantes.filter(function (p) { return p.intencoes[k.chave]; }).map(function (p) { return p.nome; });
        return el("div.pilha--curta", { class: "pilha" }, [
          el("p.t-forte", { texto: k.nome + " · " + (aberta ? "desbloqueada no dia " + aberta.dia : "bloqueada") + (portador ? " · portador: " + portador.nome : "") }),
          el("p.t-mini", { texto: k.sentimentos + ". Missão: " + k.missao + " Recompensa: " + k.recompensa + (feitos.length ? " Cumprida por: " + feitos.join(", ") + "." : "") }),
        ]);
      })));
    }

    /* ---------------- mapa ---------------- */

    function painelDoMapa(e, mestre) {
      var linhas = e.areas.map(function (a) {
        var vizinhas = e.rotas.filter(function (r) { return r.de === a.id || r.para === a.id; }).map(function (r) {
          var outra = r.de === a.id ? r.para : r.de;
          var x = e.areas.filter(function (z) { return z.id === outra; })[0];
          return x ? x.nome : "?";
        });
        return el("li.t-mini", { texto: a.nome + (a.explorada ? " · explorada" : " · não explorada") + (vizinhas.length ? " · caminhos conhecidos: " + vizinhas.join(", ") : "") });
      });
      var conteudo = [
        el("p.t-mini", { texto: "Point crawl: indo a uma área por caminho ainda não percorrido, o grupo faz o teste de jornada (um testa, os outros ajudam). Falhar não impede de chegar. Caminho já percorrido dispensa o teste." }),
        linhas.length ? el("ul.bib-lista-textos", {}, linhas) : el("p.t-mini", { texto: "Nenhuma área no mapa." }),
      ];
      return UI.painel("Mapa e exploração", el("div.pilha--curta", { class: "pilha" }, conteudo), mestre ? {
        acoes: [
          botao("+ Área", function () {
            UI.pedirTexto({ titulo: "Nova área", rotulo: "Nome", valor: "", limite: 60 }).then(function (t) {
              if (t) operar(function (c) { return H().salvarArea(c, { nome: t, explorada: !c.areas.length }); });
            });
          }),
          botao("Jornada", function () { jornada(e); }, { desligado: !e.areas.length }),
        ],
      } : undefined);
    }

    function jornada(e) {
      var de = campo("de", { rotulo: "De", tipo: "selecao", valor: "", opcoes: [{ valor: "", rotulo: "— (base ou fora do mapa)" }].concat(opcoes(e.areas, function (a) { return a.id; }, function (a) { return a.nome; })) });
      var para = campo("para", { rotulo: "Para", tipo: "selecao", valor: e.areas[0].id, opcoes: opcoes(e.areas, function (a) { return a.id; }, function (a) { return a.nome; }) });
      var testador = campo("testadorId", { rotulo: "Quem fez o teste", tipo: "selecao", valor: "",
        opcoes: [{ valor: "", rotulo: "—" }].concat(opcoes(H().vivos(e), function (p) { return p.id; }, function (p) { return p.nome + (p.alternativas.length ? " (já usou: " + p.alternativas.join(", ") + ")" : ""); })) });
      var pericia = campo("pericia", { rotulo: "Perícia (outra que não Sobrevivência: uma vez no Hexatombe)", valor: "Sobrevivência", limite: 40 });
      var passou = campo("passou", { rotulo: "Resultado", tipo: "selecao", valor: "sim", opcoes: [{ valor: "sim", rotulo: "Passou" }, { valor: "nao", rotulo: "Falhou (rola a consequência)" }] });
      formulario("Teste de jornada", [
        el("p.t-mini", { texto: "O livro não fixa a DT: a mesa decide e informa o resultado. Com um NPC que conhece a arena, o mestre pode dar bônus ou dispensar o teste." }),
        de, para, testador, pericia, passou,
      ], function (v) {
        return operar(function (c) {
          return H().registrarJornada(c, { de: v.de, para: v.para, testadorId: v.testadorId, pericia: v.pericia, passou: v.passou === "sim" });
        });
      }, "Registrar");
    }

    /* ---------------- encontros ---------------- */

    function painelDeEncontros(e) {
      var saida = el("p.t-mini", { texto: "Escolha ou role. O resultado vai para o diário (só do mestre)." });
      return UI.painel("Encontros", el("div.pilha--curta", { class: "pilha" }, [
        el("div.faixa", {}, Object.keys(H().ENCONTROS).map(function (k) {
          var t = H().ENCONTROS[k];
          return botao(t.nome + " (1d" + t.dado + ")", function () {
            operar(function (c) { var r = H().rolarEncontro(c, k); return r; }, function (r) {
              saida.textContent = r.encontro.nome + " (" + r.encontro.valor + "): " + r.encontro.texto;
            });
          });
        })),
        saida,
      ]));
    }

    /* ---------------- final ---------------- */

    function painelDoFinal(e) {
      var vivos = H().vivos(e).length;
      return UI.painel("Lua de Sangue", el("div.pilha--curta", { class: "pilha" }, [
        el("p.t-mini", { texto: vivos + " participante(s) vivo(s). No fim do sexto dia devem restar seis; com menos de seis no sacrifício final, o Hexatombe fracassa. Sem o sacrifício final até a meia-noite, os desertores definham." }),
        el("div.faixa", {}, [
          botao("Sacrifício final realizado", function () {
            UI.confirmar({ titulo: "Sacrifício final?", texto: "Registra o sacrifício final sob a Lua de Sangue.", rotuloConfirmar: "Registrar" })
              .then(function (sim) { if (sim) operar(function (c) { return H().luaDeSangue(c, true); }); });
          }, { desligado: e.dia < H().DIAS }),
          botao("Meia-noite sem o sacrifício", function () {
            UI.confirmar({ titulo: "Desertores definham?", texto: "Todos os desertores vivos morrem sob a Lua de Sangue.", rotuloConfirmar: "Confirmar", perigo: true })
              .then(function (sim) { if (sim) operar(function (c) { return H().luaDeSangue(c, false); }); });
          }, { desligado: e.dia < H().DIAS, perigo: true }),
          botao(e.fracassou ? "Desmarcar fracasso" : "Marcar fracasso", function () {
            operar(function (c) { return H().marcarFracasso(c, !c.fracassou); });
          }),
        ]),
      ]));
    }

    /* ---------------- diário ---------------- */

    function painelDoDiario(registro, mestre) {
      var lista = registro.slice().reverse().map(function (r) {
        return el("li.t-mini", { texto: "Dia " + r.dia + " · " + r.texto + (mestre && r.visivel !== "todos" ? (r.visivel === "mestre" ? " (só mestre)" : " (só a equipe)") : "") });
      });
      return UI.painel("Diário", lista.length ? el("ul.bib-lista-textos", {}, lista) : el("p.t-mini", { texto: "Nada registrado ainda." }), mestre ? {
        acoes: [botao("+ Anotação", function () {
          var txt = campo("texto", { rotulo: "Texto", tipo: "area", linhas: 3, limite: 400 });
          var vis = campo("visivel", { rotulo: "Quem vê", tipo: "selecao", valor: "mestre",
            opcoes: [{ valor: "mestre", rotulo: "Só o mestre" }, { valor: "todos", rotulo: "Todos" }].concat(opcoes(memoria.estado.equipes, function (q) { return q.id; }, function (q) { return "Equipe " + q.nome; })) });
          formulario("Anotação no diário", [txt, vis], function (v) { return operar(function (c) { return H().anotar(c, v.texto, v.visivel); }); }, "Anotar");
        })],
      } : undefined);
    }

    carregar();
    return alvo;
  }

  global.RAMACampanhaHexatombe = { aba: aba };
})(window);
