/* =====================================================================
   R.A.M.A. — BRUTAL · a Mesa da Diretora (v7.0)
   ---------------------------------------------------------------------
   A ferramenta de toda campanha de BRUTAL: o THRILLER. A Diretora
   conduz; as jogadoras veem a VISTA (sem Pontos de Horror, a ficha do
   Assassino, a meta da Fuga, as decisões e o registro privado).

     Cena e sessão     Livre, Suspense; nova sessão; novo Thriller
     A Pilha dela      dados, Pontos de Horror, Descarte
     Encontro          a condição de entrada (o R.A.M.A. confere), a
                       meta da Fuga (lacuna: a Diretora escolhe),
                       Dificultar, Buh!, Sua Hora Chegou!, a Iniciativa
                       e a vez; no turno do Assassino, as ações dele
     Sobreviventes     pilhas, PT, Feridas, Sequelas, Marcadores,
                       Estilos, presença e situação
     Testes pedidos    comum, Complexo ou Susto (e ASSUSTAR), com as
                       respostas e ACIDENTAR
     Assassino         pronto (Bruto, Sangria, Rato, Profeta) ou
                       personalizado; Mudando de Planos!
     Lacunas           as decisões que o Corte Rápido deixa à mesa
     Vantagens da mesa, Intentos, decisões e registro

   Cada ação: brutal_operar (opId; `rev` nas configurações). O servidor
   rola, aplica e devolve o Thriller novo.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil, UI = global.RAMAUI, el = U.el;
  function K() { return global.RAMABrutalCatalogo; }
  function M() { return global.RAMABrutalMesa; }
  function T() { return global.RAMABrutalTela; }

  function botao(t, fn, o) { return T().botao(t, fn, o); }
  function linha(t) { return el("p.t-mini", { texto: t }); }
  function selecao(rotulo, opcoes, valor, aoMudar) { return UI.campo({ rotulo: rotulo, tipo: "selecao", valor: valor, opcoes: opcoes, aoMudar: aoMudar }); }
  function marca(rotulo, marcado, aoMudar) { return el("label.r-marca", {}, [el("input", { type: "checkbox", checked: !!marcado, onchange: function (ev) { aoMudar(ev.currentTarget.checked); } }), el("span", { texto: rotulo })]); }
  var COM_REV = ["configurarAssassino", "configurarLacunas", "vantagemDaMesa", "novoThriller"];

  function aba(ctx) {
    var alvo = el("div.pilha.brt-mesa", {}, [UI.carregando("Abrindo a Mesa da Diretora")]);
    var mem = { dados: null, ocupado: false, aba: "jogo" };

    async function carregar(segundoPlano) {
      var r = await global.RAMAApi.lerBrutal(ctx.campanhaId, { segundoPlano: !!segundoPlano });
      if (!r.ok) { if (!segundoPlano) U.trocar(alvo, UI.erroDeTela(r, function () { carregar(); })); return; }
      mem.dados = r.dados;
      pintar();
    }
    if (ctx.aoAtualizar) {
      ctx.aoAtualizar("diretora", function () { if (!mem.ocupado) carregar(true); });
      ctx.aoAtualizar("personagens", function () { if (!mem.ocupado) carregar(true); });
    }

    function estado() { return mem.dados ? (mem.dados.estado || mem.dados.vista) : null; }
    function diretora() { return !!(mem.dados && mem.dados.mestre); }

    async function operar(op) {
      if (mem.ocupado) return { ok: false };
      mem.ocupado = true;
      try {
        var id = T().novaOperacao();
        var r = await global.RAMAApi.brutalOperar(ctx.campanhaId, id, op, COM_REV.indexOf(op.tipo) >= 0 ? mem.dados.rev : undefined);
        if (!r.ok) {
          if (r.erro === "conflito" && r.dados) { mem.dados = r.dados; pintar(); UI.avisoAtencao("O Thriller mudou em outra janela. A tela foi atualizada: confira e refaça."); return r; }
          if (r.motivo) UI.avisoAtencao(r.motivo); else UI.avisoDeFalha(r, "ação na Mesa da Diretora");
          return r;
        }
        mem.dados = r.dados;
        if (r.resultado) T().narrar(r.resultado.eventos);
        if (ctx.sincronizarAgora) ctx.sincronizarAgora();
        pintar();
        return Object.assign({ ok: true }, r.resultado || {});
      } finally { mem.ocupado = false; }
    }

    function pintar() {
      var y = global.scrollY;
      var e = estado();
      U.trocar(alvo, !e ? linha("A mesa ainda não abriu.") : diretora() ? vistaDaDiretora(e) : vistaDaJogadora(e));
      if (alvo.isConnected) global.scrollTo(0, y);
    }

    function nome(e, id) { return id === "assassino" ? "Assassino" : (e.sobreviventes[id] || {}).nome || "?"; }
    function arq(s) { return (K().ARQUETIPOS[s.arquetipo] || {}).nome || "sem Arquétipo"; }
    function elenco(e) { return M().elenco(e); }
    function opcoesDe(lista) { return lista.map(function (s) { return { valor: s.id, rotulo: s.nome + " (" + s.pilha + " dados)" }; }); }

    /* =================================================================
       A DIRETORA
       ================================================================= */
    function vistaDaDiretora(e) {
      var abas = [
        { chave: "jogo", rotulo: "Jogo" },
        { chave: "assassino", rotulo: "Assassino" },
        { chave: "lacunas", rotulo: "Lacunas e Vantagens" },
        { chave: "registro", rotulo: "Registro" },
      ];
      var conteudo = { jogo: abaJogo, assassino: abaAssassino, lacunas: abaLacunas, registro: abaRegistro }[mem.aba] || abaJogo;
      return el("div.pilha", {}, [
        topoDaMesa(e),
        el("div.r-abas.brt-mesa__abas", { role: "tablist", "aria-label": "Mesa da Diretora" }, abas.map(function (a) {
          var ativa = mem.aba === a.chave;
          return el("button.r-aba", { type: "button", role: "tab", "aria-selected": String(ativa), dataset: { mesaAba: a.chave }, texto: a.rotulo, onclick: function () { mem.aba = a.chave; pintar(); } });
        })),
        conteudo(e),
      ]);
    }

    function topoDaMesa(e) {
      var a = e.assassino;
      return el("section.brt-mesa__topo", { "aria-label": "O Thriller" }, [
        el("div.brt-mesa__cena", {}, [
          el("span.brt-rotulo", { texto: "Cena" }),
          e.encontro ? el("strong.brt-mesa__encontro", { texto: "ENCONTRO · rodada " + e.encontro.rodada }) :
            el("div.faixa", { role: "radiogroup", "aria-label": "Cena" }, ["livre", "suspense"].map(function (c) {
              var sel = e.cena === c;
              return el("button.r-botao.r-botao--mini" + (sel ? ".r-botao--principal" : ""), { type: "button", role: "radio", "aria-checked": String(sel), texto: K().CENAS[c].nome, onclick: function () { if (!sel) operar({ tipo: "mudarCena", cena: c }); } });
            })),
          el("span.t-mini", { texto: "Sessão " + e.sessao }),
          botao("Nova sessão", function () { operar({ tipo: "novaSessao" }); }, { motivo: e.encontro ? "Encerre o Encontro antes." : "", dica: "Recarrega o que é por sessão (Apegos, Carência, Memória Fotográfica, Arriscar Tudo)" }),
          botao("Novo Thriller", function () { UI.confirmar({ titulo: "Novo Thriller", texto: "Todas voltam a 6 dados e 0 PT, sem Feridas, Sequelas nem Marcadores; a Pilha da Diretora volta aos dados e PH iniciais do Assassino. O Assassino, as lacunas e as Vantagens da mesa ficam.", rotuloConfirmar: "Começar" }).then(function (s) { if (s) operar({ tipo: "novoThriller" }); }); }, { classe: "r-botao--fantasma" }),
        ]),
        el("div.brt-mesa__recursos", {}, [
          contador("Pilha da Diretora", e.diretora.pilha, "pilha", true),
          contador("Pontos de Horror", e.diretora.ph, "ph"),
          contador("Descarte", e.descarte, "descarte", true),
          el("div.brt-mesa__assassino", {}, [el("span.brt-rotulo", { texto: "Assassino" }), el("strong", { texto: a.nome || "não definido" }), a.nome ? el("span.t-mini", { texto: a.acoesUnicas.map(function (k) { return K().ACOES_ASSASSINO[k].nome; }).join(", ") + (a.apavoro ? " · " + K().APAVOROS[a.apavoro].nome : "") }) : botao("Definir", function () { mem.aba = "assassino"; pintar(); })]),
        ]),
        e.pendencias && e.pendencias.length ? el("div.brt-decisoes", { role: "alert" }, e.pendencias.map(function (p) {
          return el("div.brt-decisao", {}, [el("span", { texto: p.texto }), botao("Resolvido", function () { operar({ tipo: "resolverPendencia", id: p.id }); })]);
        })) : null,
      ]);
    }

    function contador(rotulo, valor, campo, comDados) {
      return el("div.brt-mesa__contador", { dataset: { campo: campo } }, [
        el("span.brt-rotulo", { texto: rotulo }),
        comDados ? T().pilha(valor, { pequeno: true, max: 8, rotulo: rotulo, vazia: "0" }) : el("strong.brt-contador", { texto: String(valor) }),
        el("div.brt-mais-menos", {}, [
          botao("−", function () { operar({ tipo: "ajustarDiretora", campo: campo, delta: -1 }); }, { rotulo: rotulo + " −1", motivo: valor ? "" : "Já está em 0." }),
          el("strong.brt-contador--n", { texto: String(valor) }),
          botao("+", function () { operar({ tipo: "ajustarDiretora", campo: campo, delta: 1 }); }, { rotulo: rotulo + " +1" }),
        ]),
      ]);
    }

    /* ---------- aba Jogo ---------- */
    function abaJogo(e) {
      return el("div.pilha", {}, [
        e.encontro ? painelDoEncontro(e) : painelSemEncontro(e),
        painelDePedidos(e),
        UI.painel("Sobreviventes", elenco(e).length ? el("div.brt-mesa__sobreviventes", {}, elenco(e).map(function (s) { return cartaoDaSobrevivente(e, s); })) : linha("Nenhuma ficha de BRUTAL nesta campanha ainda. As jogadoras vinculam a ficha em Personagens.")),
        painelDeIntentos(e),
      ]);
    }

    function painelSemEncontro(e) {
      var vivas = M().naCena(e).filter(function (s) { return s.situacao === "viva"; });
      var mot = M().motivoDoEncontro(e, []);
      var a = e.assassino;
      return UI.painel("Encontro", el("div.pilha", {}, [
        linha("A Diretora decide quando; o R.A.M.A. confere a condição (a Pilha dela precisa superar a de alguma Sobrevivente — p. 21)."),
        botao("Iniciar Encontro", function () { abrirEncontro(e); }, { mini: false, classe: "r-botao--principal", motivo: mot }),
        T().motivo(mot),
        e.posEncontro && a.apavoro === "mudandoDePlanos" ? el("div.faixa", {}, [el("span.t-mini", { texto: "Logo após o Encontro: Mudando de Planos! (5 PH)" }), botao("Trocar uma Ação Única", function () { mem.aba = "assassino"; pintar(); }, { motivo: e.diretora.usos && e.diretora.usos.mudandoDePlanos ? "Já usado." : "" })]) : null,
        vivas.length ? null : linha("Nenhuma Sobrevivente viva na cena."),
      ]));
    }

    function abrirEncontro(e) {
      var vivas = M().naCena(e).filter(function (s) { return s.situacao === "viva"; });
      var st = { ids: vivas.map(function (s) { return s.id; }), meta: e.lacunas.ultimaMeta || "", dificultar: false, buh: false, hora: "" };
      var a = e.assassino;
      var marcadores = [];
      vivas.forEach(function (s) { s.marcadores.forEach(function (m) { marcadores.push({ valor: s.id + "|" + m.id, rotulo: s.nome + ": " + m.nome + " (" + m.valor + ")" }); }); });
      var prev = el("p.brt-previa", { role: "status" });
      function previa() {
        var mot = M().motivoDoEncontro(e, st.ids);
        var custo = (st.dificultar ? 4 : 0) + (st.buh ? 4 : 0) + (st.hora ? 3 : 0);
        prev.textContent = (mot ? mot + " " : "Condição cumprida. ") + "Custo em PH: " + custo + " (há " + e.diretora.ph + ")." + (st.meta ? " Pilha de Fuga: " + (Number(st.meta) + (st.dificultar ? 1 : 0)) + "." : " Escolha a Pilha de Fuga.");
      }
      var corpo = el("div.pilha", {}, [
        el("fieldset.brt-recursos-teste", {}, [el("legend", { texto: "Quem está no Encontro" })].concat(vivas.map(function (s) {
          return marca(s.nome + " — " + arq(s) + " (" + s.pilha + " dados)", true, function (v) { var i = st.ids.indexOf(s.id); if (v && i < 0) st.ids.push(s.id); if (!v && i >= 0) st.ids.splice(i, 1); previa(); });
        }))),
        selecao("Tamanho da Pilha de Fuga (lacuna: o Corte Rápido não traz o valor de cada Assassino)", [{ valor: "", rotulo: "Escolha (1 a 6)" }].concat([1, 2, 3, 4, 5, 6].map(function (n) { return { valor: String(n), rotulo: String(n) }; })), String(st.meta), function (v) { st.meta = v; previa(); }),
        marca("DIFICULTAR (4 PH): Pilha de Fuga +1", false, function (v) { st.dificultar = v; previa(); }),
        a.apavoro === "buh" ? marca("BUH! (4 PH): Teste de Susto em todas, sem gastar os do Encontro" + (e.diretora.usos.buh ? " — já usado" : ""), false, function (v) { st.buh = v; previa(); }) : null,
        a.apavoro === "suaHoraChegou" ? selecao("SUA HORA CHEGOU! (3 PH): +1 num Dado Marcador (não de Ferida)", [{ valor: "", rotulo: "Não usar" }].concat(marcadores), "", function (v) { st.hora = v; previa(); }) : null,
        prev,
      ]);
      previa();
      UI.modal({ titulo: "Iniciar um Encontro", classe: "brt-janela", conteudo: [corpo], botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Começar o Encontro", classe: "r-botao--principal", aoClicar: function (f) {
          var p = st.hora ? st.hora.split("|") : null;
          operar({ tipo: "iniciarEncontro", participantes: st.ids, meta: st.meta, dificultar: st.dificultar, buh: st.buh, suaHora: p ? { alvo: p[0], marcador: p[1] } : null }).then(function (r) { if (r && r.ok) f(); });
        } },
      ] });
    }

    function painelDoEncontro(e) {
      var en = e.encontro;
      var vez = M().daVez(e);
      var restantes = M().restantesNoEncontro(e);
      var vezDoAssassino = vez === "assassino";
      return UI.painel("Encontro · rodada " + en.rodada, el("div.pilha", {}, [
        el("div.brt-mesa__encontro-info", {}, [
          el("span.r-etiqueta", { texto: "Pilha de Fuga: " + en.meta }),
          el("span.r-etiqueta", { texto: "Testes de Susto restantes: " + en.sustos }),
          en.distrair ? el("span.r-etiqueta.r-etiqueta--aviso", { texto: "DISTRAIR ×" + en.distrair + ": MATAR custa +" + en.distrair + " dado(s) e +" + (3 * en.distrair) + " PH" }) : null,
          en.arriscarTudo ? el("span.r-etiqueta", { texto: "Arriscar Tudo usado (" + nome(e, en.arriscarTudo) + ")" }) : null,
        ]),
        el("ol.brt-iniciativa.brt-iniciativa--mesa", {}, en.ordem.map(function (id) {
          var s = e.sobreviventes[id];
          var sit = s ? (s.situacao === "morta" ? " ☠" : s.situacao === "fugiu" ? " 🏃 escapou" : "") : "";
          var extra = s && s.situacao === "viva" ? " · " + s.pilha + " dados · Fuga " + s.fuga + "/" + en.meta + (s.ferida ? " · Ferida " + s.ferida : "") + (s.segurada ? " · SEGURADA" : "") : "";
          return el("li" + (vez === id ? ".brt-iniciativa--vez" : ""), { texto: nome(e, id) + (s ? " (" + arq(s) + ")" : "") + sit + extra + (vez === id ? " ◀ vez" : "") });
        })),
        e.seis ? el("div.brt-decisao.brt-decisao--seis", { role: "alert" }, [
          el("strong", { texto: "6 no " + e.seis.origem + " contra " + nome(e, e.seis.alvo) + "!" }),
          botao("Morte instantânea", function () { operar({ tipo: "resolverSeis", escolha: "matar" }); }, { classe: "r-botao--principal" }),
          botao("MUTILAR (+3 Sequelas, +4 PH)", function () { operar({ tipo: "resolverSeis", escolha: "mutilar" }); }),
        ]) : null,
        vezDoAssassino ? turnoDoAssassino(e) : el("div.faixa", {}, [
          el("span.t-mini", { texto: "Vez de " + nome(e, vez) + ": ela age pela ficha (ou você, abrindo a ficha dela)." }),
          botao("Passar a vez dela", function () { operar({ tipo: "passarVez" }); }, { motivo: e.seis ? "Resolva o 6 antes." : "" }),
        ]),
        possuidasEm6(e, vez),
        en.cheiro ? el("div.faixa", {}, [el("span.t-mini", { texto: "Primeira morte do Encontro!" }), botao("SINTO CHEIRO DE SANGUE! (" + (2 * elenco(e).length) + " PH): vivas descartam 1 dado", function () { operar({ tipo: "sintoCheiro" }); })]) : null,
        el("div.faixa", {}, [
          botao("Encerrar o Encontro", function () { UI.confirmar({ titulo: "Encerrar o Encontro", texto: "Os dados das Pilhas de Fuga voltam às Pilhas Comuns, as recargas de Fim de Encontro voltam e a cena fica Livre.", rotuloConfirmar: "Encerrar" }).then(function (s) { if (s) operar({ tipo: "encerrarEncontro", motivo: "decisão da Diretora." }); }); }, { classe: "r-botao--fantasma" }),
        ]),
        restantes.length ? null : linha("Ninguém mais no Encontro."),
      ]));
    }

    function turnoDoAssassino(e) {
      var en = e.encontro;
      var mot = M().motivoDoTurnoDoAssassino(e);
      var alvos = M().restantesNoEncontro(e);
      var st = { alvo: alvos[0] ? alvos[0].id : "" };
      var a = e.assassino;
      var alvoSel = selecao("Alvo", opcoesDe(alvos), st.alvo, function (v) { st.alvo = v; });
      var ferido = en.ferido ? e.sobreviventes[en.ferido] : null;
      var podeMatar = function () { var s = e.sobreviventes[st.alvo]; return s && s.pilha < e.diretora.pilha; };
      return el("div.brt-turno", { role: "group", "aria-label": "Turno do Assassino" }, [
        el("strong", { texto: "Vez do Assassino — uma Ação." }),
        alvos.length ? alvoSel : null,
        el("div.faixa", {}, [
          botao("FERIR (gasta 1 dado)", function () { operar({ tipo: "ferir", alvo: st.alvo }); }, { motivo: mot || (e.diretora.pilha < 1 ? "Sua Pilha está vazia." : "") }),
          botao("MATAR", function () { if (!podeMatar()) { UI.avisoAtencao("MATAR exige que ela tenha menos dados que a sua Pilha (" + e.diretora.pilha + ")."); return; } operar({ tipo: "matar", alvo: st.alvo }); }, { motivo: mot }),
          botao("ASSUSTAR (Teste de Susto)", function () { operar({ tipo: "assustar" }); }, { motivo: mot || (en.sustos < 1 ? "Sem Testes de Susto restantes." : "") }),
          M().temAcao(e, "possuir") ? botao("POSSUIR", function () { operar({ tipo: "possuir", alvo: st.alvo }); }, { motivo: mot }) : null,
          M().temAcao(e, "restringir") ? botao("RESTRINGIR", function () { operar({ tipo: "restringir", alvo: st.alvo }); }, { motivo: mot }) : null,
          botao("ESCAPAR (+1 dado, encerra)", function () { operar({ tipo: "escapar" }); }, { motivo: mot }),
        ]),
        T().motivo(mot),
        ferido && ferido.situacao === "viva" && (M().temAcao(e, "incapacitar") || M().temAcao(e, "segurar")) ? el("div.faixa", {}, [
          el("span.t-mini", { texto: "Logo depois de FERIR " + ferido.nome + ":" }),
          M().temAcao(e, "incapacitar") ? el("span.faixa", {}, ferido.estilos.filter(function (k) { return ferido.incapacitados.indexOf(k) < 0; }).map(function (k) { return botao("INCAPACITAR " + T().nomeEstilo(k) + " (4 PH)", function () { operar({ tipo: "incapacitar", alvo: ferido.id, estilo: k }); }); })) : null,
          M().temAcao(e, "segurar") && !ferido.segurada ? botao("SEGURAR (5 PH)", function () { operar({ tipo: "segurar", alvo: ferido.id }); }) : null,
        ]) : null,
        botao("Fim do turno do Assassino", function () { operar({ tipo: "fimDoTurno" }); }, { classe: "r-botao--principal", motivo: e.seis ? "Resolva o 6 antes." : "" }),
      ]);
    }

    function possuidasEm6(e, vez) {
      var l = elenco(e).filter(function (s) { var m = M().marcadorDe(s, "possessao"); return m && m.valor >= 6 && s.situacao !== "morta"; });
      if (!l.length) return null;
      return el("div.pilha", {}, l.map(function (p) {
        var vitimas = elenco(e).filter(function (s) { return s.id !== p.id && s.situacao !== "morta"; });
        var st = { alvo: vitimas[0] ? vitimas[0].id : "" };
        var motv = e.encontro && M().emEncontro(e, p) && vez !== p.id ? "Num Encontro, na vez da possuída." : "";
        return el("div.brt-decisao", {}, [
          el("span", { texto: "Possessão de " + p.nome + " em 6: MATAR por meio dela." }),
          selecao("Vítima", opcoesDe(vitimas), st.alvo, function (v) { st.alvo = v; }),
          botao("Matar pela possuída", function () { operar({ tipo: "matarPorPossessao", possuida: p.id, alvo: st.alvo }); }, { motivo: motv }),
        ]);
      }));
    }

    function cartaoDaSobrevivente(e, s) {
      var mortaOuFora = s.situacao === "morta";
      function aj(campo, delta, rotulo, motivo) { return botao(rotulo, function () { operar({ tipo: "ajustar", alvo: s.id, campo: campo, delta: delta }); }, { motivo: motivo || "" }); }
      return el("article.brt-mesa__sob" + (mortaOuFora ? ".brt-mesa__sob--morta" : ""), { dataset: { sobrevivente: s.id }, style: "--brt-cor: " + ((K().ARQUETIPOS[s.arquetipo] || {}).cor || "#888") }, [
        el("header.brt-mesa__sob-topo", {}, [
          el("strong", { texto: s.nome }), el("span.t-mini", { texto: arq(s) + " · " + s.estilos.map(function (k) { return T().nomeEstilo(k) + (s.incapacitados.indexOf(k) >= 0 ? " (incap.)" : ""); }).join(", ") }),
          s.situacao !== "viva" ? el("span.r-etiqueta.r-etiqueta--aviso", { texto: s.situacao === "morta" ? "☠ morta" : "🏃 escapou" }) : null,
          !s.presente ? el("span.r-etiqueta", { texto: "fora da cena" }) : null,
        ]),
        el("dl.brt-mesa__sob-dados", {}, [
          el("dt", { texto: "Pilha" }), el("dd", {}, [aj("pilha", -1, "−", s.pilha ? "" : "0"), el("span", { texto: " " + s.pilha + "/6 " }), aj("pilha", 1, "+", s.pilha >= 6 ? "Máximo" : "")]),
          el("dt", { texto: "PT" }), el("dd", {}, [botao("−", function () { operar({ tipo: "darPt", alvo: s.id, valor: -1, motivo: "correção" }); }, { motivo: s.pt ? "" : "0" }), el("span", { texto: " " + s.pt + " " }), botao("+ Desafio", function () { darPt(s); }, { motivo: s.pt >= 10 ? "Máximo de 10." : "" })]),
          el("dt", { texto: "Ferida" }), el("dd", {}, [aj("ferida", -1, "−", s.ferida ? "" : "0"), el("span", { texto: " " + s.ferida + (s.ferida > 6 ? " (acima de 6)" : "") + " " }), aj("ferida", 1, "+")]),
          el("dt", { texto: "Sequelas" }), el("dd", {}, [aj("sequelas", -1, "−", s.sequelas ? "" : "0"), el("span", { texto: " " + s.sequelas + " " }), aj("sequelas", 1, "+")]),
          e.encontro ? el("dt", { texto: "Fuga" }) : null, e.encontro ? el("dd", { texto: s.fuga + "/" + e.encontro.meta }) : null,
        ]),
        el("div.brt-mesa__sob-marcadores", {}, s.marcadores.map(function (m) {
          return el("span.brt-marcador", {}, [T().dado(m.valor, { estado: m.tipo, pequeno: true, rotulo: m.nome + " " + m.valor }), el("span", { texto: m.nome }),
            botao("−", function () { operar({ tipo: "marcador", alvo: s.id, acao: "ajustar", marcador: m.id, valor: m.valor - 1 }); }, { rotulo: m.nome + " −1" }),
            botao("+", function () { operar({ tipo: "marcador", alvo: s.id, acao: "ajustar", marcador: m.id, valor: m.valor + 1 }); }, { rotulo: m.nome + " +1", motivo: m.valor >= 6 ? "Máximo 6." : "" }),
            botao("×", function () { operar({ tipo: "marcador", alvo: s.id, acao: "remover", marcador: m.id }); }, { rotulo: "Remover " + m.nome })]);
        }).concat([botao("+ Marcador", function () { darMarcador(s); })])),
        el("div.faixa", {}, [
          s.estilos.map(function (k) { var inc = s.incapacitados.indexOf(k) >= 0; return botao((inc ? "Recuperar " : "Incapacitar ") + T().nomeEstilo(k), function () { operar({ tipo: "estilo", alvo: s.id, estilo: k, incapacitado: !inc }); }); }),
          botao(s.presente ? "Tirar da cena" : "Pôr na cena", function () { operar({ tipo: "presenca", alvo: s.id, presente: !s.presente }); }, { motivo: e.encontro && M().emEncontro(e, s) ? "Está no Encontro." : "" }),
          s.situacao === "morta" ? botao("Voltar à vida (correção)", function () { operar({ tipo: "situacao", alvo: s.id, situacao: "viva" }); }) : botao("Matar (decisão da mesa)", function () { UI.confirmar({ titulo: "Matar " + s.nome, texto: "Uma decisão da mesa (fora das ações do Assassino).", rotuloConfirmar: "Matar" }).then(function (x) { if (x) operar({ tipo: "situacao", alvo: s.id, situacao: "morta", causa: "decisão da Diretora" }); }); }, { classe: "r-botao--fantasma" }),
        ]),
        s.recursos.length ? linha("Recursos: " + s.recursos.map(function (r) { return r.nome + " (" + r.usos + ")"; }).join(", ")) : null,
        s.teste ? linha("Teste esperando a decisão dela: " + s.teste.faces.join(", ")) : null,
      ]);
    }

    function darPt(s) {
      var st = { valor: 1, motivo: "Desafio" };
      UI.modal({ titulo: "Pontos de Tensão para " + s.nome, classe: "brt-janela", conteudo: [el("div.pilha", {}, [
        linha("Desafios: um shot, uma ação clichê arriscada (p. 5). Máximo de 10 PT."),
        UI.campo({ rotulo: "Quantos", tipo: "numero", valor: 1, aoMudar: function (v) { st.valor = U.inteiro(v, 1); } }),
        UI.campo({ rotulo: "Motivo", valor: "Desafio", limite: 80, aoMudar: function (v) { st.motivo = v; } }),
      ])], botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Dar PT", classe: "r-botao--principal", aoClicar: function (f) { f(); operar({ tipo: "darPt", alvo: s.id, valor: st.valor, motivo: st.motivo }); } }] });
    }
    function darMarcador(s) {
      var st = { nome: "", valor: 1 };
      UI.modal({ titulo: "Dado Marcador para " + s.nome, classe: "brt-janela", conteudo: [el("div.pilha", {}, [
        linha("Uma condição (infecção, possessão…). A mesma condição substitui o marcador antigo (p. 3)."),
        UI.campo({ rotulo: "Condição", limite: 60, aoMudar: function (v) { st.nome = v; } }),
        UI.campo({ rotulo: "Valor (1 a 6)", tipo: "numero", valor: 1, aoMudar: function (v) { st.valor = U.inteiro(v, 1); } }),
      ])], botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Dar", classe: "r-botao--principal", aoClicar: function (f) { f(); operar({ tipo: "marcador", alvo: s.id, nome: st.nome, valor: st.valor }); } }] });
    }

    /* ---------- testes pedidos ---------- */
    function painelDePedidos(e) {
      var candidatas = elenco(e).filter(function (s) { return s.situacao !== "morta" && (!e.encontro || M().emEncontro(e, s)); });
      var st = { tipo: "comum", rotulo: "", destino: "auto", alvos: candidatas.map(function (s) { return s.id; }) };
      var abertos = e.pedidos.filter(function (p) { return p.aberto || p.falharam.length; }).slice(-6).reverse();
      return UI.painel("Testes", el("div.pilha", {}, [
        el("div.brt-pedir", {}, [
          selecao("Tipo", [{ valor: "comum", rotulo: "Comum (1 sucesso)" }, { valor: "complexo", rotulo: "Complexo (exatamente 2)" }, { valor: "susto", rotulo: "Teste de Susto (1 dado)" }], st.tipo, function (v) { st.tipo = v; }),
          UI.campo({ rotulo: "O quê (opcional)", limite: 120, aoMudar: function (v) { st.rotulo = v; } }),
          selecao("Destino das falhas", [{ valor: "auto", rotulo: "Pela cena (" + (e.encontro ? "descartar" : "sacrificar") + "; Susto descarta)" }, { valor: "sacrificar", rotulo: "Sacrificar" }, { valor: "descartar", rotulo: "Descartar" }, { valor: "manter", rotulo: "Manter (exceção)" }], "auto", function (v) { st.destino = v; }),
          el("fieldset.brt-recursos-teste", {}, [el("legend", { texto: "Quem testa" })].concat(candidatas.map(function (s) { return marca(s.nome, true, function (v) { var i = st.alvos.indexOf(s.id); if (v && i < 0) st.alvos.push(s.id); if (!v && i >= 0) st.alvos.splice(i, 1); }); }))),
          el("div.faixa", {}, [
            botao("Pedir o teste", function () { operar({ tipo: "pedirTeste", teste: st.tipo, alvos: st.alvos, rotulo: st.rotulo, destino: st.destino }); }, { motivo: candidatas.length ? "" : "Ninguém para testar." }),
            !e.encontro ? botao("ASSUSTAR (ação do Assassino)", function () { operar({ tipo: "assustar", alvos: st.alvos }); }, { motivo: e.cena === "suspense" ? "ASSUSTAR é de Livre e Encontro (p. 13)." : "" }) : null,
          ]),
        ]),
        abertos.length ? el("div.pilha", {}, abertos.map(function (p) {
          return el("article.brt-pedido-mesa", {}, [
            el("strong", { texto: p.rotulo + (p.aberto ? "" : " (encerrado)") }),
            el("ul", {}, p.alvos.map(function (id) {
              var r = p.respostas[id];
              return el("li", { texto: nome(e, id) + ": " + (!r ? "esperando" : r.semDados ? "sem dados" : (r.superado ? "superou" : "falhou") + " (" + r.sucessos + ")") });
            })),
            p.assustar && !e.encontro && M().temAcao(e, "acidentar") && p.falharam.length ? el("div.faixa", {}, p.falharam.map(function (id) { return botao("ACIDENTAR " + nome(e, id) + " (4 PH)", function () { operar({ tipo: "acidentar", alvo: id, pedido: p.id }); }); })) : null,
            p.aberto ? botao("Encerrar", function () { operar({ tipo: "encerrarPedido", pedido: p.id }); }, { classe: "r-botao--fantasma" }) : null,
          ]);
        })) : null,
      ]));
    }

    function painelDeIntentos(e) {
      var st = { alvo: "" };
      var vivas = elenco(e).filter(function (s) { return s.situacao !== "morta"; });
      return UI.painel("Intentos e Pontos de Horror", el("div.pilha", {}, [
        linha("Os verificáveis entram sozinhos (morte no Encontro, Ferida ao sair, Choque de Realidade, falha no Susto, todas tentando fugir no 1º turno e os Intentos Únicos). Os narrativos, aqui:"),
        el("div.faixa", {}, [
          botao("Sobreviventes se beijaram (+1)", function () { operar({ tipo: "intento", chave: "beijo" }); }),
          selecao("Armadilha: quem caiu", [{ valor: "", rotulo: "—" }].concat(opcoesDe(vivas)), "", function (v) { st.alvo = v; }),
          botao("Caiu numa Armadilha (+2" + (M().temAmeaca(e, "estrategico") && e.cena === "suspense" ? " +1 Estratégico" : "") + ")", function () { operar({ tipo: "intento", chave: "armadilha", alvo: st.alvo || undefined }); }),
          botao("Suspirou de medo / nojo no Susto (+1)", function () { operar({ tipo: "intento", chave: "suspiro" }); }),
        ]),
      ]));
    }

    /* ---------- aba Assassino ---------- */
    function abaAssassino(e) {
      var a = e.assassino;
      var st = { modelo: a.modelo || "bruto", nome: a.nome, ameacas: a.ameacas.slice(), acoesUnicas: a.acoesUnicas.slice(), apavoro: a.apavoro, dados: a.dadosIniciais === null ? "" : a.dadosIniciais, ph: a.phIniciais === null ? "" : a.phIniciais, sustos: a.sustosPorEncontro === null ? "" : a.sustosPorEncontro, estigma: a.estigma, notas: a.notas, aplicarPilha: !a.nome };
      var area = el("div.pilha");
      function desenhar() {
        var pronto = K().ASSASSINOS[st.modelo];
        var ameacasDefinidas = K().AMEACAS_DEFINIDAS.map(function (k) { return { valor: k, rotulo: K().AMEACAS[k].nome }; });
        var permitidas = [];
        st.ameacas.forEach(function (m) { (K().AMEACAS[m] ? K().AMEACAS[m].acoesUnicas : []).forEach(function (x) { if (permitidas.indexOf(x) < 0) permitidas.push(x); }); });
        U.trocar(area, [
          el("div.brt-cartas.brt-cartas--assassinos", {}, K().ORDEM_ASSASSINOS.map(function (k) {
            var d = K().ASSASSINOS[k], sel = st.modelo === k;
            return el("button.brt-carta" + (sel ? ".brt-carta--escolhida" : ""), { type: "button", "aria-pressed": String(sel), style: "--brt-cor: #8b1020", onclick: function () { st.modelo = k; st.nome = d.nome; desenhar(); } }, [
              el("img.brt-carta__arte", { src: U.url("assets/brutal/assassinos/" + k + ".webp"), alt: "", loading: "lazy" }),
              el("span.brt-carta__nome", { texto: d.nome }),
            ]);
          }).concat([el("button.brt-carta.brt-carta--texto" + (st.modelo === "personalizado" ? ".brt-carta--escolhida" : ""), { type: "button", "aria-pressed": String(st.modelo === "personalizado"), onclick: function () { st.modelo = "personalizado"; desenhar(); } }, [el("span.brt-carta__nome", { texto: "Personalizado" })])])),
          pronto ? el("dl.r-dados", {}, [
            el("dt", { texto: "Ameaças" }), el("dd", { texto: pronto.ameacas.map(function (m) { return K().AMEACAS[m].nome + (K().AMEACAS[m].definida ? "" : " (sem descrição no Corte Rápido)"); }).join(" · ") }),
            el("dt", { texto: "Dados / PH / Sustos por Encontro" }), el("dd", { texto: pronto.dados + " / " + pronto.ph + " / " + pronto.sustos }),
            el("dt", { texto: "Ações Únicas" }), el("dd", { texto: pronto.acoesUnicas.map(function (x) { return K().ACOES_ASSASSINO[x].nome; }).join(", ") }),
            el("dt", { texto: "Apavoro" }), el("dd", { texto: K().APAVOROS[pronto.apavoro].nome }),
            el("dt", { texto: "Intento Único" }), el("dd", { texto: (K().INTENTOS_UNICOS[pronto.ameacas[0]] || {}).texto || "—" }),
            el("dd", { texto: pronto.resumo }),
          ]) : el("div.pilha", {}, [
            linha("Um Assassino personalizado: duas Ameaças (a primeira é a Principal), uma Ação Única de cada e um Apavoro (p. 11–15). Dados, PH e Testes de Susto ficam à mão: o Nível de Brutalidade não está no Corte Rápido."),
            selecao("Ameaça Principal", [{ valor: "", rotulo: "—" }].concat(ameacasDefinidas), st.ameacas[0] || "", function (v) { st.ameacas[0] = v; st.ameacas = st.ameacas.filter(Boolean); desenhar(); }),
            selecao("Segunda Ameaça", [{ valor: "", rotulo: "—" }].concat(ameacasDefinidas), st.ameacas[1] || "", function (v) { st.ameacas[1] = v; st.ameacas = st.ameacas.filter(Boolean); desenhar(); }),
            el("fieldset.brt-recursos-teste", {}, [el("legend", { texto: "Ações Únicas (uma por Ameaça)" })].concat(permitidas.map(function (k) { return marca(K().ACOES_ASSASSINO[k].nome, st.acoesUnicas.indexOf(k) >= 0, function (v) { var i = st.acoesUnicas.indexOf(k); if (v && i < 0) st.acoesUnicas.push(k); if (!v && i >= 0) st.acoesUnicas.splice(i, 1); }); }))),
            selecao("Apavoro", [{ valor: "", rotulo: "—" }].concat(Object.keys(K().APAVOROS).map(function (k) { return { valor: k, rotulo: K().APAVOROS[k].nome }; })), st.apavoro, function (v) { st.apavoro = v; }),
            el("div.faixa", {}, [
              UI.campo({ rotulo: "Dados iniciais", tipo: "numero", valor: st.dados, aoMudar: function (v) { st.dados = v; } }),
              UI.campo({ rotulo: "PH iniciais", tipo: "numero", valor: st.ph, aoMudar: function (v) { st.ph = v; } }),
              UI.campo({ rotulo: "Sustos por Encontro", tipo: "numero", valor: st.sustos, aoMudar: function (v) { st.sustos = v; } }),
            ]),
          ]),
          UI.campo({ rotulo: "Nome", valor: st.nome, limite: 80, aoMudar: function (v) { st.nome = v; } }),
          UI.campo({ rotulo: "Estigma (texto livre — não descrito no Corte Rápido)", tipo: "area", linhas: 2, valor: st.estigma, limite: 600, aoMudar: function (v) { st.estigma = v; } }),
          UI.campo({ rotulo: "Notas da Diretora", tipo: "area", linhas: 3, valor: st.notas, limite: 2000, aoMudar: function (v) { st.notas = v; } }),
          marca("Pôr a Pilha e os PH iniciais agora", st.aplicarPilha, function (v) { st.aplicarPilha = v; }),
          el("div.faixa", {}, [
            botao("Salvar o Assassino", function () { operar({ tipo: "configurarAssassino", modelo: st.modelo, nome: st.nome, ameacas: st.ameacas, acoesUnicas: st.acoesUnicas, apavoro: st.apavoro, dados: st.dados, ph: st.ph, sustos: st.sustos, estigma: st.estigma, notas: st.notas, aplicarPilha: st.aplicarPilha }); }, { mini: false, classe: "r-botao--principal" }),
            a.nome ? botao(a.revelado ? "Ocultar das jogadoras" : "Revelar às jogadoras", function () { operar({ tipo: "revelarAssassino", revelado: !a.revelado }); }) : null,
          ]),
        ]);
      }
      desenhar();
      var mudar = null;
      if (a.apavoro === "mudandoDePlanos") {
        var sm = { de: a.acoesUnicas[0] || "", para: "" };
        var outras = [];
        a.ameacas.forEach(function (m) { (K().AMEACAS[m] || { acoesUnicas: [] }).acoesUnicas.forEach(function (x) { if (a.acoesUnicas.indexOf(x) < 0 && outras.indexOf(x) < 0) outras.push(x); }); });
        mudar = UI.painel("Mudando de Planos! (5 PH)", el("div.pilha", {}, [
          linha("Logo após o fim de um Encontro: troca uma Ação Única por outra da mesma Ameaça."),
          selecao("Trocar", a.acoesUnicas.map(function (k) { return { valor: k, rotulo: K().ACOES_ASSASSINO[k].nome }; }), sm.de, function (v) { sm.de = v; }),
          selecao("Por", [{ valor: "", rotulo: "—" }].concat(outras.map(function (k) { return { valor: k, rotulo: K().ACOES_ASSASSINO[k].nome }; })), "", function (v) { sm.para = v; }),
          botao("Trocar", function () { operar({ tipo: "mudandoDePlanos", de: sm.de, para: sm.para }); }, { motivo: !e.posEncontro ? "Só logo após o fim de um Encontro." : e.diretora.usos.mudandoDePlanos ? "Já usado." : "" }),
        ]));
      }
      return el("div.pilha", {}, [UI.painel("O Assassino", area), mudar, UI.painel("Ações do Assassino (consulta)", el("div.pilha", {}, Object.keys(K().ACOES_ASSASSINO).map(function (k) {
        var d = K().ACOES_ASSASSINO[k];
        return el("p", {}, [el("strong", { texto: d.nome + (d.tipo === "unica" ? " (Única)" : "") + (d.custo ? " · " + d.custo + " PH" : "") + ": " }), el("span", { texto: d.texto + " " }), T().fonte(d.pagina)]);
      })))]);
    }

    /* ---------- aba Lacunas e Vantagens ---------- */
    function abaLacunas(e) {
      var l = e.lacunas;
      var nova = { nome: "", estilo: "", custo: 2, recarga: "fimEncontro", efeito: "reduzirFerida", valor: 1, texto: "" };
      return el("div.pilha", {}, [
        UI.painel("Lacunas do Corte Rápido", el("div.pilha", {}, [
          selecao("De onde vem o dado recebido (Recuperar Fôlego, Choque de Realidade…)", [{ valor: "auto", rotulo: "Do Descarte quando houver; senão, novo (leitura)" }, { valor: "descarte", rotulo: "Sempre do Descarte" }, { valor: "novo", rotulo: "Sempre um dado novo" }], l.fonteDosDados, function (v) { operar({ tipo: "configurarLacunas", fonteDosDados: v }); }),
          UI.campo({ rotulo: "Custo de Tratar Feridas (PT) — vazio: indisponível", tipo: "numero", valor: l.custoTratarFeridas === null ? "" : l.custoTratarFeridas, aoMudar: function (v) { operar({ tipo: "configurarLacunas", custoTratarFeridas: String(v).trim() === "" ? null : U.inteiro(v, 0) }); } }),
          selecao("Recarga de Planejar Fuga (o PDF diz \"6 pts\")", [{ valor: "pendente", rotulo: "Até usar o efeito no próximo Encontro (leitura)" }, { valor: "fimEncontro", rotulo: "Fim de um Encontro" }, { valor: "semRestricao", rotulo: "Sem restrição" }], l.recargaPlanejarFuga, function (v) { operar({ tipo: "configurarLacunas", recargaPlanejarFuga: v }); }),
          el("details", {}, [el("summary", { texto: "Todas as lacunas registradas" }), el("ul.brt-lacunas", {}, Object.keys(K().LACUNAS).map(function (k) { var x = K().LACUNAS[k]; return el("li", {}, [el("strong", { texto: x.titulo + ": " }), el("span", { texto: x.texto + " (" + x.onde + ")" })]); }))]),
        ])),
        UI.painel("Vantagens da mesa", el("div.pilha", {}, [
          linha("Vantagens que o Corte Rápido não traz (de outra versão de BRUTAL, ou da mesa), com custo, recarga e um efeito que o R.A.M.A. aplica."),
          e.vantagensDaMesa.length ? el("ul", {}, e.vantagensDaMesa.map(function (v) { return el("li", {}, [el("span", { texto: v.nome + " · " + (v.estilo ? T().nomeEstilo(v.estilo) : "Geral") + " · " + v.custo + " PT · " + T().nomeRecarga(v.recarga) + " · " + K().EFEITOS_DE_VANTAGEM[v.efeito].nome + (v.efeito === "reduzirFerida" ? " " + v.valor : "") + " "}), botao("Remover", function () { operar({ tipo: "vantagemDaMesa", acao: "remover", id: v.id }); }, { classe: "r-botao--fantasma" })]); })) : null,
          el("div.brt-criar__campos", {}, [
            UI.campo({ rotulo: "Nome", limite: 60, aoMudar: function (v) { nova.nome = v; } }),
            selecao("Estilo", [{ valor: "", rotulo: "Geral (todas)" }].concat(K().ORDEM_ESTILOS.map(function (k) { return { valor: k, rotulo: T().nomeEstilo(k) }; })), "", function (v) { nova.estilo = v; }),
            UI.campo({ rotulo: "Custo (PT)", tipo: "numero", valor: 2, aoMudar: function (v) { nova.custo = U.inteiro(v, 0); } }),
            selecao("Recarga", ["semRestricao", "fimEncontro", "inicioEncontro", "inicioSessao", "encontroLivre"].map(function (k) { return { valor: k, rotulo: T().nomeRecarga(k) }; }), "fimEncontro", function (v) { nova.recarga = v; }),
            selecao("Efeito", Object.keys(K().EFEITOS_DE_VANTAGEM).map(function (k) { return { valor: k, rotulo: K().EFEITOS_DE_VANTAGEM[k].nome }; }), "reduzirFerida", function (v) { nova.efeito = v; }),
            UI.campo({ rotulo: "Valor (reduzir Ferida)", tipo: "numero", valor: 1, aoMudar: function (v) { nova.valor = U.inteiro(v, 1); } }),
          ]),
          UI.campo({ rotulo: "Texto", tipo: "area", linhas: 2, limite: 400, aoMudar: function (v) { nova.texto = v; } }),
          botao("Criar a Vantagem", function () { operar({ tipo: "vantagemDaMesa", vantagem: nova }); }),
        ])),
      ]);
    }

    function abaRegistro(e) {
      return el("div.pilha", {}, [
        UI.painel("Rolagens", e.rolagens.length ? el("div.brt-rolagens__lista", {}, e.rolagens.slice(-15).reverse().map(function (r) {
          var ac = M().temAcao(e, "devorar") && r.seis && !r.devorada && r.quem !== "assassino" ? [botao("DEVORAR (+1 PH)", function () { operar({ tipo: "devorar", rolagem: r.id }); })] : [];
          return T().rolagem(r, { acoes: ac });
        })) : linha("Nenhuma.")),
        UI.painel("Registro privado (só você)", el("ol.brt-registro", {}, (e.privado || []).slice(-80).reverse().map(function (r) { return el("li", { texto: r.texto }); }))),
        UI.painel("Registro da mesa", el("ol.brt-registro", {}, e.registro.slice(-80).reverse().map(function (r) { return el("li", { texto: r.texto }); }))),
      ]);
    }

    /* =================================================================
       A JOGADORA
       ================================================================= */
    function vistaDaJogadora(v) {
      var minhas = (mem.dados.personagens || []).filter(function (p) { return p.meu; });
      var vez = M().daVez(v);
      return el("div.pilha", {}, [
        UI.painel("O Thriller", el("div.pilha", {}, [
          el("dl.r-dados", {}, [
            el("dt", { texto: "Cena" }), el("dd", { texto: v.encontro ? "ENCONTRO · rodada " + v.encontro.rodada : K().CENAS[v.cena].nome }),
            el("dt", { texto: "Sessão" }), el("dd", { texto: String(v.sessao) }),
            el("dt", { texto: "Pilha da Diretora" }), el("dd", { texto: String(v.diretora.pilha) }),
            el("dt", { texto: "Descarte" }), el("dd", { texto: String(v.descarte) }),
            v.assassino.revelado ? el("dt", { texto: "Assassino" }) : null, v.assassino.revelado ? el("dd", { texto: v.assassino.nome }) : null,
          ]),
          minhas.length ? el("div.faixa", {}, minhas.map(function (p) { return el("a.r-botao.r-botao--principal", { href: U.url("ficha/?id=" + encodeURIComponent(p.id)), texto: "Jogar com " + p.nome }); })) : linha("Você ainda não tem uma Sobrevivente nesta campanha: crie em Personagens e vincule aqui."),
        ])),
        v.encontro ? UI.painel("Iniciativa", el("ol.brt-iniciativa.brt-iniciativa--mesa", {}, v.encontro.ordem.map(function (id) {
          var s = v.sobreviventes[id];
          return el("li" + (vez === id ? ".brt-iniciativa--vez" : ""), { texto: nome(v, id) + (s && s.situacao !== "viva" ? (s.situacao === "morta" ? " ☠" : " 🏃") : "") + (vez === id ? " ◀ vez" : "") });
        }))) : null,
        UI.painel("Sobreviventes", el("div.brt-mesa__sobreviventes", {}, elenco(v).map(function (s) {
          return el("article.brt-mesa__sob", { style: "--brt-cor: " + ((K().ARQUETIPOS[s.arquetipo] || {}).cor || "#888") }, [
            el("header.brt-mesa__sob-topo", {}, [el("strong", { texto: s.nome }), el("span.t-mini", { texto: arq(s) })]),
            linha(s.situacao === "morta" ? "☠ morta" : s.pilha + " dados · " + s.pt + " PT" + (s.ferida ? " · Ferida " + s.ferida : "") + (s.sequelas ? " · " + s.sequelas + " Sequela(s)" : "") + (v.encontro && M().emEncontro(v, s) ? " · Fuga " + s.fuga : "") + (s.situacao === "fugiu" ? " · escapou" : "")),
          ]);
        }))),
        UI.painel("Rolagens", v.rolagens.length ? el("div.brt-rolagens__lista", {}, v.rolagens.slice(-8).reverse().map(function (r) { return T().rolagem(r); })) : linha("Nenhuma.")),
        UI.painel("Registro", el("ol.brt-registro", {}, v.registro.slice(-50).reverse().map(function (r) { return el("li", { texto: r.texto }); }))),
      ]);
    }

    carregar();
    return alvo;
  }

  global.RAMACampanhaBrutal = { aba: aba };
})(window);
