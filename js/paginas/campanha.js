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

   A MESA SE ATUALIZA SOZINHA
   ---------------------------------------------------------------------
   Com a campanha aberta, js/sincronia.js pergunta de tempos em tempos
   se alguma parte mudou (ver o cabeçalho de lá para o ritmo e a
   latência). Quando muda, esta casca busca a parte de novo em segundo
   plano e avisa a aba aberta por ctx.aoAtualizar(parte, fn). Cada aba
   decide como aplicar sem interromper quem está digitando; nenhuma
   recarrega a página.

   Perder o acesso (tirado da campanha, campanha excluída) troca a tela
   por um aviso e joga fora o que estava na memória: a sincronização não
   devolve dado que deixou de ser permitido.
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
    /* A resposta de erro quando a lista de personagens não veio. Sem
       isto, uma falha de rede aparecia como "nenhum personagem". */
    falhaPersonagens: null,
    /* A imagem da capa, por data de atualização: trocar de aba não a
       baixa de novo. Vive só na memória da página. */
    capa: { atualizadoEm: "", imagem: "", carregando: false, erro: null },
    sincronia: null,
    ouvintes: {},
    semAcesso: false,
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

  global.RAMAApp.iniciar("campanhas", async function (agente, casca, prontas) {
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

    /* A primeira carga usa o que veio junto com a sessão; recarregar
       depois volta a buscar do jeito normal. */
    await carregar(prontas);
  }, {
    pedidos: function () {
      var id = U.parametro("id");
      if (!id) return [];
      return [
        { acao: "ler_campanha", campanhaId: id },
        { acao: "listar_personagens_campanha", campanhaId: id },
        /* A capa vem junto: a Visão geral é a primeira aba, e sem isto
           ela abriria e pediria a imagem numa segunda viagem. */
        { acao: "ler_capa_campanha", campanhaId: id },
      ];
    },
  });

  async function carregar(prontas) {
    var alvo = U.$("#painel-campanha");
    var prontasValidas = prontas && prontas.length >= 2 ? prontas : null;

    var r = prontasValidas ? prontasValidas[0] : await global.RAMAApi.lerCampanha(estado.campanhaId);
    if (!r.ok) {
      U.trocar(alvo, UI.erroDeTela(r, function () { return carregar(); }));
      return;
    }

    aplicarCampanha(r);

    /* Espectador de campanha pública entra só para olhar: não há mesa,
       não há histórico, não há nada além da existência da campanha. */
    if (estado.papel === "espectador") {
      montarContexto();
      if (prontasValidas && prontasValidas[2]) guardarCapa(prontasValidas[2]);
      desenharEspectador();
      return;
    }

    var rp = prontasValidas
      ? prontasValidas[1]
      : await global.RAMAApi.listarPersonagensCampanha(estado.campanhaId);

    estado.personagens = (rp.ok && rp.dados) || [];
    estado.falhaPersonagens = rp.ok ? null : rp;

    if (prontasValidas && prontasValidas[2]) guardarCapa(prontasValidas[2]);

    montarContexto();
    configurarHistorico();
    desenhar();
    iniciarSincronia(r.dados.marcas, r.dados.papel);
  }

  function aplicarCampanha(r) {
    estado.campanha = r.dados;
    estado.rev = U.inteiro(r.rev, 0);
    estado.papel = r.dados.papel;
    estado.mestre = !!r.dados.mestre;
    estado.membros = r.dados.membros || [];
  }

  /* A capa guardada na memória, se a resposta for da versão que a campanha
     diz ter. */
  function guardarCapa(resposta) {
    var meta = estado.campanha && estado.campanha.capa;
    if (!resposta || !resposta.ok || !resposta.dados || !meta || !meta.existe) return;
    if (resposta.dados.atualizadoEm !== meta.atualizadoEm) return;
    estado.capa = { atualizadoEm: meta.atualizadoEm, imagem: resposta.dados.imagem || "", carregando: false, erro: null };
  }

  /* As rolagens feitas nesta página (pelas criaturas do combate) sobem
     para o histórico desta campanha, pelo mesmo funil das fichas. */
  function configurarHistorico() {
    if (global.RAMAHistorico) {
      global.RAMAHistorico.configurar({ campanhaId: estado.campanhaId, personagemId: null });
    }
  }

  function montarContexto() {
    ctx = {
      get campanhaId() { return estado.campanhaId; },
      get campanha() { return estado.campanha; },
      get membros() { return estado.membros; },
      get personagens() { return estado.personagens; },
      get falhaPersonagens() { return estado.falhaPersonagens; },
      get rev() { return estado.rev; },

      ehMestre: function () { return estado.mestre; },
      papel: function () { return estado.papel; },
      eu: function () {
        var agente = global.RAMAAuth && global.RAMAAuth.agente();
        return agente ? agente.id : null;
      },
      abaAtual: function () { return estado.aba; },

      definirRev: function (rev) { estado.rev = U.inteiro(rev, estado.rev); },
      /* Mistura campos novos da campanha (e a revisão nova) sem recarregar. */
      definirCampanha: function (campos, rev) {
        Object.assign(estado.campanha, campos || {});
        if (rev !== undefined) estado.rev = U.inteiro(rev, estado.rev);
        pintarTopo();
      },
      /* Sem argumento: recarregar sempre vai ao servidor. Repassar a
         pré-carga aqui devolveria a tela ao estado de quando a página
         abriu, que é o contrário de recarregar. */
      recarregar: function () { return carregar(); },
      redesenhar: desenhar,

      atualizarPersonagens: async function () {
        var rp = await global.RAMAApi.listarPersonagensCampanha(estado.campanhaId);
        if (rp.ok) estado.personagens = rp.dados || [];
        estado.falhaPersonagens = rp.ok ? null : rp;
        desenhar();
      },

      /* Busca a lista sem redesenhar a tela: quem chamou decide o que
         atualizar (o painel da mesa atualiza cartão por cartão). */
      buscarPersonagens: async function (opcoes) {
        var rp = await global.RAMAApi.listarPersonagensCampanha(estado.campanhaId, opcoes);
        if (rp.ok) {
          estado.personagens = rp.dados || [];
          estado.falhaPersonagens = null;
        }
        return rp;
      },

      nomeDoMembro: function (userId) {
        var m = estado.membros.filter(function (x) { return x.id === userId; })[0];
        return m ? m.nome : "";
      },

      /* ---- capa ---- */
      capa: function () { return estado.capa; },
      carregarCapa: carregarCapa,
      definirCapa: function (meta, imagem) {
        estado.campanha.capa = meta && meta.existe
          ? { existe: true, atualizadoEm: meta.atualizadoEm, largura: meta.largura, altura: meta.altura }
          : { existe: false };
        estado.capa = { atualizadoEm: meta && meta.existe ? meta.atualizadoEm : "", imagem: imagem || "", carregando: false, erro: null };
        notificar("campanha");
      },

      /* ---- sincronização ---- */
      /* A aba aberta diz o que quer saber. Os ouvintes duram até a aba ser
         desenhada de novo. */
      aoAtualizar: function (parte, fn) {
        if (!estado.ouvintes[parte]) estado.ouvintes[parte] = [];
        estado.ouvintes[parte].push(fn);
      },
      sincronizarAgora: function () { if (estado.sincronia) estado.sincronia.agora(); },
    };
  }

  async function carregarCapa() {
    var meta = estado.campanha && estado.campanha.capa;
    if (!meta || !meta.existe) return { ok: true, imagem: "" };
    if (estado.capa.imagem && estado.capa.atualizadoEm === meta.atualizadoEm) return { ok: true, imagem: estado.capa.imagem };
    if (estado.capa.carregando) return { ok: false, carregando: true };

    estado.capa = { atualizadoEm: meta.atualizadoEm, imagem: "", carregando: true, erro: null };
    var r = await global.RAMAApi.lerCapaCampanha(estado.campanhaId);
    if (!r.ok) {
      estado.capa = { atualizadoEm: meta.atualizadoEm, imagem: "", carregando: false, erro: r };
      return r;
    }
    estado.capa = { atualizadoEm: r.dados.atualizadoEm || meta.atualizadoEm, imagem: r.dados.imagem || "", carregando: false, erro: null };
    return { ok: true, imagem: estado.capa.imagem };
  }

  function notificar(parte, dado) {
    (estado.ouvintes[parte] || []).slice().forEach(function (fn) {
      try { fn(dado); } catch (e) { console.error("[R.A.M.A. · campanha] ouvinte de " + parte + " falhou", e); }
    });
  }

  /* =================================================================
     SINCRONIZAÇÃO
     ================================================================= */

  function iniciarSincronia(marcas, papel) {
    if (estado.sincronia) estado.sincronia.parar();
    if (!global.RAMASincronia || !marcas) return;

    estado.sincronia = global.RAMASincronia.criar({
      consultar: function () { return global.RAMAApi.sincronizarCampanha(estado.campanhaId); },
      marcas: marcas,
      papel: papel,
      intervalo: function () {
        return estado.aba === "personagens" || estado.aba === "combate"
          ? global.RAMASincronia.INTERVALO_ATIVO
          : global.RAMASincronia.INTERVALO_CALMO;
      },
      visivel: function () { return document.visibilityState !== "hidden"; },
      aoMudar: aoMudarNaMesa,
      aoPerderAcesso: perderAcesso,
    });
    estado.sincronia.iniciar();

    global.addEventListener("pagehide", function () { if (estado.sincronia) estado.sincronia.parar(); });
  }

  async function aoMudarNaMesa(partes) {
    if (estado.semAcesso) return;
    var tem = function (p) { return partes.indexOf(p) >= 0; };

    if (tem("papel") || tem("membros") || tem("campanha")) {
      var r = await global.RAMAApi.lerCampanha(estado.campanhaId, { segundoPlano: true });
      if (!r.ok) {
        if (r.erro === "nao_encontrado" || r.erro === "sem_permissao") perderAcesso(r);
        return;
      }
      var papelAntes = estado.papel;
      aplicarCampanha(r);

      if (estado.papel === "espectador") {
        /* Tirado da mesa de uma campanha pública: vira espectador. O que
           era da mesa sai da memória. */
        estado.personagens = [];
        if (estado.sincronia) estado.sincronia.parar();
        desenharEspectador();
        UI.avisoAtencao("Você não participa mais desta campanha.");
        return;
      }

      if (papelAntes !== estado.papel) {
        await buscarPersonagensEmSegundoPlano();
        UI.avisoAtencao(estado.mestre ? "Você agora é mestre desta campanha." : "Você agora é jogador nesta campanha.");
        desenhar();
        return;
      }

      pintarTopo();
      notificar("campanha");
      if (tem("membros")) notificar("membros");
    }

    if (tem("personagens") || tem("membros")) {
      await buscarPersonagensEmSegundoPlano();
      notificar("personagens");
    }

    if (tem("combates")) notificar("combates");
    if (tem("documentos")) notificar("documentos");
    if (tem("rolagens")) notificar("rolagens");
  }

  async function buscarPersonagensEmSegundoPlano() {
    var rp = await global.RAMAApi.listarPersonagensCampanha(estado.campanhaId, { segundoPlano: true });
    if (rp.ok) {
      estado.personagens = rp.dados || [];
      estado.falhaPersonagens = null;
    } else if (rp.erro === "nao_encontrado" || rp.erro === "sem_permissao") {
      perderAcesso(rp);
    }
    return rp;
  }

  function perderAcesso() {
    if (estado.semAcesso) return;
    estado.semAcesso = true;
    if (estado.sincronia) estado.sincronia.parar();
    if (global.RAMACampanhaCombate && global.RAMACampanhaCombate.descartarTudo) {
      global.RAMACampanhaCombate.descartarTudo();
    }

    /* O que era desta campanha sai da memória da página. */
    estado.personagens = [];
    estado.membros = [];
    estado.capa = { atualizadoEm: "", imagem: "", carregando: false, erro: null };
    estado.ouvintes = {};

    U.trocar(U.$("#painel-campanha"), UI.vazio({
      titulo: "Sem acesso a esta campanha",
      texto: "Ela foi excluída, ou você não participa mais dela. O que estava na tela foi retirado.",
      acao: { rotulo: "Ver campanhas", aoClicar: function () { location.href = U.url("campanhas/"); } },
    }));
  }

  /* =================================================================
     DESENHO
     ================================================================= */

  function abasVisiveis() {
    return ABAS.filter(function (a) { return !a.soMestre || estado.mestre; });
  }

  function topo() {
    return [
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
    ];
  }

  function pintarTopo() {
    var caixa = U.$("#campanha-topo");
    if (caixa) U.trocar(caixa, topo());
  }

  function desenhar() {
    if (estado.semAcesso) return;
    var alvo = U.$("#painel-campanha");
    var visiveis = abasVisiveis();
    var secao = visiveis.filter(function (a) { return a.chave === estado.aba; })[0] || visiveis[0];
    estado.aba = secao.chave;

    /* Os ouvintes são da aba que estava desenhada. */
    estado.ouvintes = {};

    U.trocar(alvo, [
      el("div", { id: "campanha-topo" }, topo()),

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
            onclick: function () { trocarAba(a.chave); },
            onkeydown: function (ev) { navegar(ev, visiveis); },
          });
        })
      ),

      el("div", { role: "tabpanel", "aria-labelledby": "aba-c-" + secao.chave },
        [global[secao.secao].aba(ctx)]),
    ]);
  }

  function trocarAba(chave) {
    if (chave === estado.aba) return;
    var anterior = ABAS.filter(function (a) { return a.chave === estado.aba; })[0];
    var secaoAnterior = anterior && global[anterior.secao];
    /* A aba que sai sobe o que estiver pendente (as iniciativas do
       combate, por exemplo) antes de sumir da tela. */
    if (secaoAnterior && secaoAnterior.aoSair) secaoAnterior.aoSair(ctx);
    estado.aba = chave;
    desenhar();
    if (estado.sincronia) estado.sincronia.agora();
  }

  function navegar(ev, visiveis) {
    if (ev.key !== "ArrowRight" && ev.key !== "ArrowLeft") return;
    ev.preventDefault();
    var i = visiveis.findIndex(function (a) { return a.chave === estado.aba; });
    var proximo = ev.key === "ArrowRight" ? i + 1 : i - 1;
    if (proximo < 0) proximo = visiveis.length - 1;
    if (proximo >= visiveis.length) proximo = 0;
    trocarAba(visiveis[proximo].chave);
    var botao = U.$("#aba-c-" + estado.aba);
    if (botao) botao.focus();
  }

  function desenharEspectador() {
    var caixaCapa = el("div.campanha-capa-caixa");
    U.trocar(U.$("#painel-campanha"), [
      global.RAMAApp.titulo({
        titulo: estado.campanha.nome,
        trilha: ["Campanha pública", "Você não participa"],
        acoes: [el("a.r-botao.r-botao--fantasma", { href: U.url("campanhas/"), texto: "Todas as campanhas" })],
      }),

      caixaCapa,

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
    if (ctx) pintarCapa(ctx, caixaCapa);
  }

  /* =================================================================
     ABA: VISÃO GERAL
     -----------------------------------------------------------------
     A capa da campanha, com a identificação, e a mesa. O antigo bloco
     "Panorama" (contagens) saiu: a identificação e os participantes já
     dizem o que ele dizia.
     ================================================================= */

  global.RAMACampanhaVisao = {
    aba: function (ctx) {
      var caixaCapa = el("div.campanha-capa-caixa");
      var caixaMesa = el("div");
      var caixaAvisos = el("div.pilha--curta", { class: "pilha" });

      function pintarTudo() {
        pintarCapa(ctx, caixaCapa);
        U.trocar(caixaMesa, painelDaMesa(ctx));
        U.trocar(caixaAvisos, avisosDaMesa(ctx));
      }

      pintarTudo();
      ctx.aoAtualizar("campanha", pintarTudo);
      ctx.aoAtualizar("membros", pintarTudo);

      return el("div.pilha--larga", { class: "pilha" }, [caixaCapa, caixaMesa, caixaAvisos]);
    },
  };

  function painelDaMesa(ctx) {
    var mestres = ctx.membros.filter(function (m) { return m.papel === "mestre"; });
    var jogadores = ctx.membros.filter(function (m) { return m.papel !== "mestre"; });

    return UI.painel("Mesa", el("div.pilha--curta", { class: "pilha" }, [
      el("p.t-rotulo", { texto: mestres.length > 1 ? "Mestres" : "Mestre" }),
      el("div.membros", {}, mestres.map(cartaoDeMembro)),
      jogadores.length ? el("p.t-rotulo", { texto: "Jogadores" }) : null,
      jogadores.length
        ? el("div.membros", {}, jogadores.map(cartaoDeMembro))
        : el("p.t-mini", { texto: "Nenhum jogador convidado ainda." }),
    ]));
  }

  function avisosDaMesa(ctx) {
    return [
      /* O aviso de rolagens ocultas aparece para TODO MUNDO, de
         propósito: o jogador precisa saber que existem rolagens que ele
         não vê, senão o histórico parece estar quebrado. */
      ctx.campanha.rolagensMestreOcultas
        ? UI.painel("Rolagens do mestre", el("p", {
            texto: "As rolagens do mestre estão OCULTAS nesta campanha. Elas não aparecem no histórico dos jogadores.",
          }))
        : null,
      ctx.campanha.ocultarStatusJogadores
        ? UI.painel("Status dos personagens", el("p", {
            texto: ctx.ehMestre()
              ? "Status escondidos: cada jogador vê os recursos só dos próprios personagens. A chave fica na aba Personagens."
              : "O mestre escondeu os status dos jogadores: você vê os recursos só dos seus personagens.",
          }))
        : null,
    ];
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
     CAPA
     -----------------------------------------------------------------
     Uma faixa 3:1 no topo da Visão geral, com o nome da campanha. A
     imagem já chega recortada nessa proporção, então ela ocupa a faixa
     inteira sem distorcer e sem cortar nada que o mestre não tenha
     visto na prévia.

     Só o mestre vê os botões — e só o mestre passa pelo servidor.
     ================================================================= */

  function pintarCapa(ctx, caixa) {
    var meta = ctx.campanha.capa || { existe: false };
    var mestre = ctx.ehMestre();

    if (!meta.existe) {
      U.trocar(caixa, mestre
        ? el("figure.campanha-capa.campanha-capa--vazia", {}, [
            el("div.campanha-capa__vazio", {}, [
              el("p.t-secao", { texto: ctx.campanha.nome }),
              el("p.t-mini", { texto: "Esta campanha ainda não tem capa." }),
              el("button.r-botao.r-botao--mini", {
                type: "button", texto: "+ Adicionar capa",
                onclick: function () { escolherCapa(ctx); },
              }),
            ]),
          ])
        : null);
      return;
    }

    var imagem = el("div.campanha-capa__imagem", { "aria-busy": "true" });
    var legenda = el("figcaption.campanha-capa__legenda", {}, [
      el("span.campanha-capa__nome", { texto: ctx.campanha.nome }),
      el("span.campanha-capa__trilha", {
        texto: [ctx.ehMestre() ? "Mestre" : "Jogador", ctx.campanha.visibilidade === "publico" ? "Pública" : "Privada"].join(" · "),
      }),
    ]);

    U.trocar(caixa, el("figure.campanha-capa", {}, [
      imagem,
      legenda,
      mestre
        ? el("div.campanha-capa__acoes", {}, [
            el("button.r-botao.r-botao--mini", {
              type: "button", texto: "Trocar capa",
              onclick: function () { escolherCapa(ctx); },
            }),
            el("button.r-botao.r-botao--mini.r-botao--fantasma", {
              type: "button", texto: "Remover",
              onclick: function (ev) { removerCapa(ctx, ev.currentTarget); },
            }),
          ])
        : null,
    ]));

    function mostrar(dataUrl) {
      imagem.removeAttribute("aria-busy");
      U.trocar(imagem, el("img", {
        src: dataUrl,
        alt: "Capa da campanha " + ctx.campanha.nome,
        width: meta.largura || null,
        height: meta.altura || null,
      }));
    }

    var guardada = ctx.capa();
    if (guardada.imagem && guardada.atualizadoEm === meta.atualizadoEm) { mostrar(guardada.imagem); return; }

    U.trocar(imagem, el("span.campanha-capa__carregando", { texto: "Carregando capa…" }));
    ctx.carregarCapa().then(function (r) {
      if (!document.body.contains(imagem)) return;
      if (r && r.ok && r.imagem) { mostrar(r.imagem); return; }
      if (r && r.carregando) return;
      imagem.removeAttribute("aria-busy");
      U.trocar(imagem, el("div.campanha-capa__falha", {}, [
        el("span.t-mini", { texto: "Não foi possível carregar a capa." }),
        el("button.r-botao.r-botao--mini", {
          type: "button", texto: "Tentar de novo",
          onclick: function () { pintarCapa(ctx, caixa); },
        }),
      ]));
    });
  }

  async function escolherCapa(ctx) {
    var escolha = await global.RAMAImagem.escolherArquivo();
    if (!escolha.ok) return;

    var aviso = UI.aviso("Abrindo imagem…", { duracao: 30000 });
    var aberta = await global.RAMAImagem.decodificar(escolha.arquivo);
    aviso();

    if (!aberta.ok) { UI.avisoErro(aberta.mensagem || "Não foi possível usar esta imagem."); return; }
    enquadrarCapa(ctx, aberta);
  }

  /* O ENQUADRAMENTO
     -----------------------------------------------------------------
     A faixa é 3:1. A prévia mostra exatamente o que vai ser gravado, e a
     pessoa move o recorte com três controles (aproximação, horizontal,
     vertical) — ou arrastando a prévia. Nada é salvo antes de "Salvar
     capa", e a imagem original nunca sobe: só o recorte, reduzido e
     comprimido para caber no arquivo. */
  var PROPORCAO_DA_CAPA = 3;
  var LARGURA_DA_CAPA = 1500;

  function enquadrarCapa(ctx, aberta) {
    var origem = aberta.origem;
    var larguraOrigem = aberta.largura;
    var alturaOrigem = aberta.altura;
    var enquadre = { zoom: 100, x: 50, y: 50 };

    var previa = el("canvas.capa-editor__previa", {
      width: 900, height: 300,
      role: "img",
      "aria-label": "Prévia da capa, como ela vai aparecer",
      tabindex: "0",
    });
    var info = el("p.t-mini", { "aria-live": "polite" });

    function retangulo() {
      var baseLargura, baseAltura;
      if (larguraOrigem / alturaOrigem > PROPORCAO_DA_CAPA) {
        baseAltura = alturaOrigem;
        baseLargura = alturaOrigem * PROPORCAO_DA_CAPA;
      } else {
        baseLargura = larguraOrigem;
        baseAltura = larguraOrigem / PROPORCAO_DA_CAPA;
      }
      var fator = enquadre.zoom / 100;
      var largura = baseLargura / fator;
      var altura = baseAltura / fator;
      return {
        x: (larguraOrigem - largura) * enquadre.x / 100,
        y: (alturaOrigem - altura) * enquadre.y / 100,
        largura: largura,
        altura: altura,
      };
    }

    function desenharPrevia() {
      var r = retangulo();
      var c = previa.getContext("2d");
      c.imageSmoothingEnabled = true;
      c.imageSmoothingQuality = "high";
      c.clearRect(0, 0, previa.width, previa.height);
      c.drawImage(origem, r.x, r.y, r.largura, r.altura, 0, 0, previa.width, previa.height);
      var larguraFinal = Math.round(Math.min(LARGURA_DA_CAPA, r.largura));
      info.textContent = "Recorte de " + Math.round(r.largura) + " × " + Math.round(r.altura) + " px da imagem; " +
        "gravado com até " + larguraFinal + " × " + Math.round(larguraFinal / PROPORCAO_DA_CAPA) + " px." +
        (r.largura < 600 ? " A área escolhida é pequena e pode ficar borrada na tela larga." : "");
    }

    function controle(rotulo, chave, minimo, maximo, ajuda) {
      var id = "capa-" + chave;
      var entrada = el("input.capa-editor__faixa", {
        id: id, type: "range", min: String(minimo), max: String(maximo), step: "1",
        value: String(enquadre[chave]),
        oninput: function (ev) { enquadre[chave] = Number(ev.target.value); desenharPrevia(); },
      });
      return el("div.r-campo", {}, [
        el("label", { for: id, texto: rotulo }),
        entrada,
        ajuda ? el("p.r-ajuda", { texto: ajuda }) : null,
      ]);
    }

    /* Arrastar a prévia move o recorte na direção do arraste. */
    var arraste = null;
    previa.addEventListener("pointerdown", function (ev) {
      arraste = { x: ev.clientX, y: ev.clientY, inicio: Object.assign({}, enquadre) };
      previa.setPointerCapture(ev.pointerId);
    });
    previa.addEventListener("pointermove", function (ev) {
      if (!arraste) return;
      var r = retangulo();
      var larguraTela = previa.getBoundingClientRect().width || 1;
      var escala = r.largura / larguraTela;
      var folgaX = larguraOrigem - r.largura;
      var folgaY = alturaOrigem - r.altura;
      if (folgaX > 0) enquadre.x = U.limitar(arraste.inicio.x - ((ev.clientX - arraste.x) * escala / folgaX) * 100, 0, 100);
      if (folgaY > 0) enquadre.y = U.limitar(arraste.inicio.y - ((ev.clientY - arraste.y) * escala / folgaY) * 100, 0, 100);
      sincronizarFaixas();
      desenharPrevia();
    });
    previa.addEventListener("pointerup", function () { arraste = null; });
    previa.addEventListener("pointercancel", function () { arraste = null; });

    /* Setas no teclado com a prévia em foco fazem o mesmo. */
    previa.addEventListener("keydown", function (ev) {
      var passo = ev.shiftKey ? 10 : 2;
      if (ev.key === "ArrowLeft") enquadre.x = U.limitar(enquadre.x - passo, 0, 100);
      else if (ev.key === "ArrowRight") enquadre.x = U.limitar(enquadre.x + passo, 0, 100);
      else if (ev.key === "ArrowUp") enquadre.y = U.limitar(enquadre.y - passo, 0, 100);
      else if (ev.key === "ArrowDown") enquadre.y = U.limitar(enquadre.y + passo, 0, 100);
      else return;
      ev.preventDefault();
      sincronizarFaixas();
      desenharPrevia();
    });

    var faixas = el("div.editar-grade", {}, [
      controle("Aproximação", "zoom", 100, 300, "100 = a maior faixa que cabe na imagem."),
      controle("Posição horizontal", "x", 0, 100),
      controle("Posição vertical", "y", 0, 100),
    ]);

    function sincronizarFaixas() {
      ["zoom", "x", "y"].forEach(function (k) {
        var f = U.$("#capa-" + k, faixas);
        if (f) f.value = String(Math.round(enquadre[k]));
      });
    }

    var janela = UI.modal({
      titulo: "Capa da campanha",
      largo: true,
      conteudo: [
        el("p.t-mini", { texto: "A capa aparece numa faixa 3:1 no topo da Visão geral. Ajuste o recorte — arraste a prévia ou use os controles. É exatamente isto que vai ser salvo." }),
        el("div.capa-editor__moldura", {}, [previa]),
        info,
        faixas,
      ],
      botoes: [
        { rotulo: "Escolher outra", classe: "r-botao--fantasma", aoClicar: function (fechar) { fechar(); escolherCapa(ctx); } },
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        {
          rotulo: "Salvar capa", classe: "r-botao--principal",
          aoClicar: function () { salvarCapa(ctx, janela, retangulo()); },
        },
      ],
      aoFechar: function () { if (origem && origem.close) origem.close(); },
    });

    desenharPrevia();

    async function salvarCapa(ctx, janela, r) {
      var botao = U.$$(".r-modal__rodape .r-botao", janela.janela).filter(function (b) {
        return b.textContent.trim().toLowerCase() === "salvar capa";
      })[0];

      var resultado = await UI.ocupar(botao, async function () {
        var largura = Math.min(LARGURA_DA_CAPA, r.largura);
        var tela = global.RAMAImagem.recortar(origem, r, largura, largura / PROPORCAO_DA_CAPA);
        var comprimida = global.RAMAImagem.comprimirTela(tela);
        if (!comprimida.ok) return comprimida;
        var resposta = await global.RAMAApi.salvarCapaCampanha(ctx.campanhaId, comprimida.imagem, comprimida.largura, comprimida.altura);
        resposta.imagem = comprimida.imagem;
        return resposta;
      }, { rotulo: "Enviando imagem…" });

      if (!resultado || resultado.ignorado) return;
      if (resultado.erro === "grande" && resultado.mensagem) { UI.avisoErro(resultado.mensagem); return; }
      if (!resultado.ok) {
        UI.avisoDeFalha(resultado, "envio da capa", { tentarDeNovo: function () { salvarCapa(ctx, janela, r); } });
        return;
      }

      ctx.definirCapa(resultado.dados, resultado.imagem);
      janela.fechar();
      UI.avisoOk("Capa salva.");
    }
  }

  async function removerCapa(ctx, botao) {
    var certeza = await UI.confirmar({
      titulo: "Remover a capa?",
      texto: "A imagem sai da campanha para todos.",
      detalhe: "Dá para adicionar outra depois.",
      rotuloConfirmar: "Remover", perigo: true,
    });
    if (!certeza) return;

    var r = await UI.ocupar(botao, function () {
      return global.RAMAApi.salvarCapaCampanha(ctx.campanhaId, "");
    }, { rotulo: "Removendo…" });

    if (!r || r.ignorado) return;
    if (!r.ok) { UI.avisoDeFalha(r, "remoção da capa", { tentarDeNovo: function () { removerCapa(ctx, botao); } }); return; }
    ctx.definirCapa({ existe: false }, "");
    UI.avisoOk("Capa removida.");
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

      /* Mudança feita em outro lugar enquanto este formulário está
         aberto: avisa em vez de apagar o que a pessoa digitou. */
      var avisoExterno = el("p.t-mini.t-aviso", { hidden: true, role: "status" });
      ctx.aoAtualizar("campanha", function () {
        avisoExterno.hidden = false;
        avisoExterno.textContent = "A campanha foi alterada em outro lugar. Ao salvar, o que está neste formulário substitui nome, descrição e visibilidade.";
      });

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
          avisoExterno,
          el("button.r-botao.r-botao--principal", {
            type: "button", texto: "Salvar campanha",
            onclick: function (ev) { salvarConfig(ctx, ev.currentTarget, nome, descricao, visibilidade, ocultas); },
          }),
        ])),

        UI.painel("Participantes", participantes(ctx)),

        UI.painel("Zona de risco", el("div.pilha--curta", { class: "pilha" }, [
          el("p.t-mini", { texto: "Excluir a campanha remove participantes, rolagens, documentos, notas, combates e a capa. As fichas dos jogadores continuam intactas, apenas sem campanha." }),
          el("button.r-botao.r-botao--perigo", {
            type: "button", texto: "Excluir campanha",
            onclick: function (ev) { excluirCampanha(ctx, ev.currentTarget); },
          }),
        ])),
      ]);
    },
  };

  async function salvarConfig(ctx, botao, nome, descricao, visibilidade, ocultas) {
    var r = await UI.ocupar(botao, function () {
      return global.RAMAApi.salvarCampanha(ctx.campanhaId, ctx.rev, {
        nome: nome.entrada.value.trim(),
        descricao: descricao.entrada.value,
        visibilidade: visibilidade,
        rolagensMestreOcultas: ocultas,
      });
    }, { rotulo: "Salvando…" });

    if (!r || r.ignorado) return;
    if (!r.ok) {
      if (r.erro === "conflito") {
        UI.avisoAtencao("A campanha foi alterada em outro lugar desde que esta tela abriu. Recarregando para você conferir antes de salvar.");
        await ctx.recarregar();
        return;
      }
      UI.avisoDeFalha(r, "gravação da campanha", { tentarDeNovo: function () { salvarConfig(ctx, botao, nome, descricao, visibilidade, ocultas); } });
      return;
    }
    UI.avisoOk("Campanha atualizada.");
    await ctx.recarregar();
  }

  function participantes(ctx) {
    var caixa = el("div.pilha--curta", { class: "pilha", "aria-busy": "true" }, [
      UI.carregando("Carregando agentes"),
    ]);

    function carregar() {
      caixa.setAttribute("aria-busy", "true");
      U.trocar(caixa, UI.carregando("Carregando agentes"));
      global.RAMAApi.listarUsuarios().then(montar);
    }

    function montar(r) {
      caixa.removeAttribute("aria-busy");
      if (!r.ok) { U.trocar(caixa, UI.erroDeTela(r, carregar)); return; }

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
          onclick: function (ev) { salvar(ev.currentTarget); },
        }),
        el("p.t-mini", {
          texto: "Ao tirar alguém da campanha, os personagens dessa pessoa saem da mesa junto.",
        }),
      ]);

      async function salvar(botao) {
        var membros = Object.keys(escolhidos).map(function (id) {
          return { userId: id, papel: escolhidos[id] };
        });
        var s = await UI.ocupar(botao, function () {
          return global.RAMAApi.salvarParticipantes(ctx.campanhaId, membros);
        }, { rotulo: "Salvando…" });
        if (!s || s.ignorado) return;
        if (!s.ok) { UI.avisoDeFalha(s, "gravação dos participantes", { tentarDeNovo: function () { salvar(botao); } }); return; }
        UI.avisoOk("Participantes atualizados.");
        await ctx.recarregar();
      }
    }

    carregar();
    return caixa;
  }

  async function excluirCampanha(ctx, botao) {
    var certeza = await UI.confirmar({
      titulo: "Excluir " + ctx.campanha.nome + "?",
      texto: "Participantes, rolagens, documentos, notas, combates e a capa desta campanha serão removidos.",
      detalhe: "As fichas dos jogadores continuam intactas — elas apenas ficam sem campanha. Esta ação não pode ser desfeita.",
      rotuloConfirmar: "Excluir", perigo: true,
    });
    if (!certeza) return;

    var r = await UI.ocupar(botao, function () {
      return global.RAMAApi.excluirCampanha(ctx.campanhaId);
    }, { rotulo: "Excluindo…" });
    if (!r || r.ignorado) return;
    if (!r.ok) { UI.avisoDeFalha(r, "exclusão"); return; }

    if (estado.sincronia) estado.sincronia.parar();
    location.href = U.url("campanhas/");
  }
})(window);
