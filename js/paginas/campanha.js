/* =====================================================================
   R.A.M.A. — campanha
   ---------------------------------------------------------------------
   A tela de uma campanha, em abas. Este arquivo é a casca: carrega,
   descobre o papel de quem abriu e entrega o contexto às seções.

   O QUE APARECE DEPENDE DO PAPEL — e não por CSS.

   Uma aba de mestre não é renderizada desabilitada para o jogador: ela
   simplesmente não entra na lista. Isso é conveniência visual; a
   recusa de verdade está no servidor, que responde 'sem_permissao' a
   quem tentar por fora. As duas camadas existem porque a de cima
   deixaria a tela confusa e a de baixo é a que protege.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var el = U.el;

  var estado = {
    campanhaId: "",
    campanha: null,
    rev: 0,
    papel: "",
    mestre: false,
    aba: "visao",
    membros: [],
    personagens: [],
  };

  var ctx = null;

  var ABAS = [
    { chave: "visao",       rotulo: "Visão geral", secao: "RAMACampanhaVisao" },
    { chave: "personagens", rotulo: "Personagens", secao: "RAMACampanhaPersonagens" },
    { chave: "rolagens",    rotulo: "Rolagens",    secao: "RAMACampanhaRolagens" },
    { chave: "documentos",  rotulo: "Documentos",  secao: "RAMACampanhaDocumentos" },
    { chave: "combate",     rotulo: "Combate",     secao: "RAMACampanhaCombate" },
    { chave: "notas",       rotulo: "Notas",       secao: "RAMACampanhaNotas", soMestre: true },
    { chave: "config",      rotulo: "Configurações", secao: "RAMACampanhaConfig", soMestre: true },
  ];

  global.RAMAApp.iniciar("campanhas", async function () {
    estado.campanhaId = U.parametro("id");
    var alvo = U.$("#painel-campanha");

    if (!estado.campanhaId) {
      U.trocar(alvo, UI.vazio({
        titulo: "Campanha não informada",
        texto: "O endereço desta página precisa do identificador da campanha.",
        acao: { rotulo: "Ver campanhas", aoClicar: function () { location.href = U.url("campanhas/"); } },
      }));
      return;
    }

    U.trocar(alvo, UI.carregando("Acessando campanha"));
    await carregar();
  });

  async function carregar() {
    var alvo = U.$("#painel-campanha");

    var r = await global.RAMAApi.lerCampanha(estado.campanhaId);
    if (!r.ok) {
      U.trocar(alvo, UI.erroDeTela(r, carregar));
      return;
    }

    estado.campanha = r.dados;
    estado.rev = U.inteiro(r.rev, 0);
    estado.papel = r.dados.papel;
    estado.mestre = !!r.dados.mestre;
    estado.membros = r.dados.membros || [];

    /* Espectador de campanha pública entra só para olhar: não há mesa,
       não há histórico, não há nada além da existência da campanha. */
    if (estado.papel === "espectador") {
      desenharEspectador();
      return;
    }

    var rp = await global.RAMAApi.listarPersonagensCampanha(estado.campanhaId);
    estado.personagens = (rp.ok && rp.dados) || [];

    montarContexto();
    desenhar();
  }

  function montarContexto() {
    ctx = {
      get campanhaId() { return estado.campanhaId; },
      get campanha() { return estado.campanha; },
      get membros() { return estado.membros; },
      get personagens() { return estado.personagens; },
      get rev() { return estado.rev; },

      ehMestre: function () { return estado.mestre; },
      papel: function () { return estado.papel; },

      definirRev: function (rev) { estado.rev = U.inteiro(rev, estado.rev); },
      recarregar: carregar,
      redesenhar: desenhar,

      atualizarPersonagens: async function () {
        var rp = await global.RAMAApi.listarPersonagensCampanha(estado.campanhaId);
        if (rp.ok) estado.personagens = rp.dados || [];
        desenhar();
      },

      nomeDoMembro: function (userId) {
        var m = estado.membros.filter(function (x) { return x.id === userId; })[0];
        return m ? m.nome : "";
      },
    };
  }

  function abasVisiveis() {
    return ABAS.filter(function (a) { return !a.soMestre || estado.mestre; });
  }

  function desenhar() {
    var alvo = U.$("#painel-campanha");
    var visiveis = abasVisiveis();
    var secao = visiveis.filter(function (a) { return a.chave === estado.aba; })[0] || visiveis[0];
    estado.aba = secao.chave;

    U.trocar(alvo, [
      global.RAMAApp.titulo({
        titulo: estado.campanha.nome,
        trilha: [
          estado.mestre ? "Mestre" : "Jogador",
          estado.campanha.visibilidade === "publico" ? "Pública" : "Privada",
          "Linha // " + U.codigoCurto(estado.campanhaId),
        ],
        acoes: [
          el("a.r-botao.r-botao--fantasma", { href: U.url("campanhas/"), texto: "Todas as campanhas" }),
        ],
      }),

      estado.campanha.descricao
        ? el("p.t-fraco", { texto: estado.campanha.descricao })
        : null,

      el("div.r-abas", { role: "tablist", "aria-label": "Seções da campanha" },
        visiveis.map(function (a) {
          var ativa = a.chave === estado.aba;
          return el("button.r-aba", {
            type: "button",
            id: "aba-c-" + a.chave,
            role: "tab",
            "aria-selected": String(ativa),
            tabindex: ativa ? "0" : "-1",
            texto: a.rotulo,
            onclick: function () { estado.aba = a.chave; desenhar(); },
            onkeydown: function (ev) { navegar(ev, visiveis); },
          });
        })
      ),

      el("div", { role: "tabpanel", "aria-labelledby": "aba-c-" + secao.chave },
        [global[secao.secao].aba(ctx)]),
    ]);
  }

  function navegar(ev, visiveis) {
    if (ev.key !== "ArrowRight" && ev.key !== "ArrowLeft") return;
    ev.preventDefault();
    var i = visiveis.findIndex(function (a) { return a.chave === estado.aba; });
    var proximo = ev.key === "ArrowRight" ? i + 1 : i - 1;
    if (proximo < 0) proximo = visiveis.length - 1;
    if (proximo >= visiveis.length) proximo = 0;
    estado.aba = visiveis[proximo].chave;
    desenhar();
    var botao = U.$("#aba-c-" + estado.aba);
    if (botao) botao.focus();
  }

  function desenharEspectador() {
    U.trocar(U.$("#painel-campanha"), [
      global.RAMAApp.titulo({
        titulo: estado.campanha.nome,
        trilha: ["Campanha pública", "Você não participa"],
        acoes: [el("a.r-botao.r-botao--fantasma", { href: U.url("campanhas/"), texto: "Todas as campanhas" })],
      }),

      UI.painel("Campanha pública", el("div.pilha", {}, [
        estado.campanha.descricao
          ? el("p", { texto: estado.campanha.descricao })
          : el("p.t-fraco", { texto: "Esta campanha não tem descrição." }),
        el("p.t-mini", {
          texto: "Ser pública quer dizer que ela pode ser encontrada — não que o conteúdo dela seja público. " +
                 "Personagens, rolagens, documentos e combates continuam com o mestre e com quem ele escolher.",
        }),
      ])),
    ]);
  }

  /* =================================================================
     ABA: VISÃO GERAL
     ================================================================= */

  global.RAMACampanhaVisao = {
    aba: function (ctx) {
      var mestres = ctx.membros.filter(function (m) { return m.papel === "mestre"; });
      var jogadores = ctx.membros.filter(function (m) { return m.papel !== "mestre"; });

      return el("div.pilha--larga", { class: "pilha" }, [
        UI.painel("Panorama", el("div.resumo", {}, [
          bloco("Participantes", ctx.membros.length),
          bloco("Personagens", ctx.personagens.length),
          bloco("Visibilidade", ctx.campanha.visibilidade === "publico" ? "Pública" : "Privada"),
        ])),

        UI.painel("Mesa", el("div.pilha--curta", { class: "pilha" }, [
          el("p.t-rotulo", { texto: mestres.length > 1 ? "Mestres" : "Mestre" }),
          el("div.membros", {}, mestres.map(cartaoDeMembro)),
          jogadores.length ? el("p.t-rotulo", { texto: "Jogadores" }) : null,
          jogadores.length
            ? el("div.membros", {}, jogadores.map(cartaoDeMembro))
            : el("p.t-mini", { texto: "Nenhum jogador convidado ainda." }),
        ])),

        /* O aviso de rolagens ocultas aparece para TODO MUNDO, de
           propósito: o jogador precisa saber que existem rolagens que
           ele não vê, senão o histórico parece estar quebrado. */
        ctx.campanha.rolagensMestreOcultas
          ? UI.painel("Rolagens do mestre", el("p", {
              texto: "As rolagens do mestre estão OCULTAS nesta campanha. Elas não aparecem no histórico dos jogadores.",
            }))
          : null,
      ]);
    },
  };

  function bloco(rotulo, valor) {
    return el("div.resumo__item", {}, [
      el("span.t-rotulo", { texto: rotulo }),
      el("span.resumo__valor", { texto: String(valor) }),
    ]);
  }

  function cartaoDeMembro(m) {
    var avatar = el("span.r-avatar", { "aria-hidden": "true" });
    if (m.avatar) avatar.appendChild(el("img", { src: m.avatar, alt: "" }));
    else avatar.textContent = U.iniciais(m.nome);

    return el("div.membro", {}, [
      avatar,
      el("div", {}, [
        el("p.t-forte", { texto: m.nome }),
        el("p.t-mini", { texto: "@" + m.usuario + (m.criador ? " · criador" : "") }),
      ]),
    ]);
  }

  /* =================================================================
     ABA: CONFIGURAÇÕES (só mestre)
     ================================================================= */

  global.RAMACampanhaConfig = {
    aba: function (ctx) {
      var nome = UI.campo({ rotulo: "Nome", valor: ctx.campanha.nome, limite: 120 });
      var descricao = UI.campo({
        rotulo: "Descrição", tipo: "area", valor: ctx.campanha.descricao, linhas: 3, limite: 4000,
      });

      var visibilidade = ctx.campanha.visibilidade;
      var ocultas = !!ctx.campanha.rolagensMestreOcultas;

      var seletorVis = el("div.filtros__grupo", { role: "group", "aria-label": "Visibilidade" },
        [{ v: "privado", r: "Privada" }, { v: "publico", r: "Pública" }].map(function (op) {
          return el("button.filtro", {
            type: "button",
            "aria-pressed": String(visibilidade === op.v),
            texto: op.r,
            onclick: function (ev) {
              visibilidade = op.v;
              U.$$(".filtro", ev.target.parentNode).forEach(function (b) {
                b.setAttribute("aria-pressed", String(b === ev.target));
              });
            },
          });
        })
      );

      var seletorRolagens = el("div.filtros__grupo", { role: "group", "aria-label": "Rolagens do mestre" },
        [{ v: false, r: "Visíveis" }, { v: true, r: "Ocultas" }].map(function (op) {
          return el("button.filtro", {
            type: "button",
            "aria-pressed": String(ocultas === op.v),
            texto: op.r,
            onclick: function (ev) {
              ocultas = op.v;
              U.$$(".filtro", ev.target.parentNode).forEach(function (b) {
                b.setAttribute("aria-pressed", String(b === ev.target));
              });
            },
          });
        })
      );

      return el("div.pilha--larga", { class: "pilha" }, [
        UI.painel("Campanha", el("div.pilha", {}, [
          nome,
          descricao,
          el("div.r-campo", {}, [
            el("span.r-rotulo", { texto: "Visibilidade" }),
            seletorVis,
            el("p.r-ajuda", {
              texto: "Pública: qualquer agente autenticado encontra a campanha. Isso não abre o conteúdo — documentos, rolagens e combates continuam restritos a quem você escolher.",
            }),
          ]),
          el("div.r-campo", {}, [
            el("span.r-rotulo", { texto: "Rolagens do mestre" }),
            seletorRolagens,
            el("p.r-ajuda", {
              texto: "Ocultas: as suas rolagens não chegam ao navegador dos jogadores — não é só esconder na tela. Elas continuam no seu histórico.",
            }),
          ]),
          el("button.r-botao.r-botao--principal", {
            type: "button", texto: "Salvar campanha",
            onclick: async function () {
              var r = await global.RAMAApi.salvarCampanha(ctx.campanhaId, ctx.rev, {
                nome: nome.entrada.value.trim(),
                descricao: descricao.entrada.value,
                visibilidade: visibilidade,
                rolagensMestreOcultas: ocultas,
              });
              if (!r.ok) { UI.avisoDeFalha(r, "gravação da campanha"); return; }
              UI.avisoOk("Campanha atualizada.");
              await ctx.recarregar();
            },
          }),
        ])),

        UI.painel("Participantes", participantes(ctx)),

        UI.painel("Zona de risco", el("div.pilha--curta", { class: "pilha" }, [
          el("p.t-mini", { texto: "Excluir a campanha remove participantes, rolagens, documentos, notas e combates. As fichas dos jogadores continuam intactas, apenas sem campanha." }),
          el("button.r-botao.r-botao--perigo", {
            type: "button", texto: "Excluir campanha",
            onclick: function () { excluirCampanha(ctx); },
          }),
        ])),
      ]);
    },
  };

  function participantes(ctx) {
    var caixa = el("div.pilha--curta", { class: "pilha" }, [
      el("p.t-mini", { texto: "Carregando agentes…" }),
    ]);

    global.RAMAApi.listarUsuarios().then(function (r) {
      if (!r.ok) { U.trocar(caixa, UI.erroDeTela(r)); return; }

      var escolhidos = {};
      ctx.membros.forEach(function (m) { if (!m.criador) escolhidos[m.id] = m.papel; });

      var eu = global.RAMAAuth.agente();

      var linhas = r.dados
        .filter(function (u) { return u.id !== (eu && eu.id); })
        .map(function (u) {
          return el("label.r-marca", {}, [
            el("input", {
              type: "checkbox",
              checked: !!escolhidos[u.id],
              onchange: function (ev) {
                if (ev.target.checked) escolhidos[u.id] = "jogador";
                else delete escolhidos[u.id];
              },
            }),
            el("span", {}, [
              el("span.t-forte", { texto: u.nome }),
              el("span.t-mini", { texto: " @" + u.usuario }),
            ]),
          ]);
        });

      U.trocar(caixa, [
        el("p.t-mini", { texto: "Quem estiver marcado participa desta campanha e pode vincular personagens a ela." }),
        linhas.length ? el("div.pilha--curta", { class: "pilha" }, linhas)
                      : el("p.t-mini", { texto: "Nenhuma outra conta cadastrada." }),
        el("button.r-botao", {
          type: "button", texto: "Salvar participantes",
          onclick: async function () {
            var membros = Object.keys(escolhidos).map(function (id) {
              return { userId: id, papel: escolhidos[id] };
            });
            var s = await global.RAMAApi.salvarParticipantes(ctx.campanhaId, membros);
            if (!s.ok) { UI.avisoDeFalha(s, "gravação dos participantes"); return; }
            UI.avisoOk("Participantes atualizados.");
            await ctx.recarregar();
          },
        }),
        el("p.t-mini", {
          texto: "Ao tirar alguém da campanha, os personagens dessa pessoa saem da mesa junto.",
        }),
      ]);
    });

    return caixa;
  }

  async function excluirCampanha(ctx) {
    var certeza = await UI.confirmar({
      titulo: "Excluir " + ctx.campanha.nome + "?",
      texto: "Participantes, rolagens, documentos, notas e combates desta campanha serão removidos.",
      detalhe: "As fichas dos jogadores continuam intactas — elas apenas ficam sem campanha. Esta ação não pode ser desfeita.",
      rotuloConfirmar: "Excluir", perigo: true,
    });
    if (!certeza) return;

    var r = await global.RAMAApi.excluirCampanha(ctx.campanhaId);
    if (!r.ok) { UI.avisoDeFalha(r, "exclusão"); return; }

    location.href = U.url("campanhas/");
  }
})(window);
