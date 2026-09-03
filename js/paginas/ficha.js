/* =====================================================================
   R.A.M.A. — ficha · orquestração
   ---------------------------------------------------------------------
   Carrega o registro, monta o contexto que as seções compartilham,
   cuida do modo e liga o salvamento.

   O CONTEXTO é o contrato entre este arquivo e as quatro seções. Elas
   não conhecem a API, o salvador nem a revisão: recebem `ctx`, leem
   `ctx.ficha`, chamam `ctx.alterou()` quando mudam alguma coisa e
   `ctx.redesenhar()` quando a estrutura da tela mudou. Todo o resto —
   debounce, fila, conflito, revisão — acontece longe delas.

   Sobre os dois modos: eles são o mesmo desenho com um traço
   diferente, e não duas telas. Quem entra em edição no meio de uma
   sessão precisa continuar reconhecendo onde as coisas estão.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var F = global.RAMAFicha;
  var el = U.el;

  var ABAS = [
    { chave: "geral",      rotulo: "Geral",      secao: "RAMASecaoGeral" },
    { chave: "pericias",   rotulo: "Perícias",   secao: "RAMASecaoPericias" },
    { chave: "inventario", rotulo: "Inventário", secao: "RAMASecaoInventario" },
    { chave: "anotacoes",  rotulo: "Anotações",  secao: "RAMASecaoAnotacoes" },
  ];

  var CHAVE_ABA = "rama.ficha.aba";

  var estado = {
    personagemId: "",
    ficha: null,
    foto: "",
    campanhas: [],
    modo: "normal",
    aba: "geral",
    salvador: null,
    indicador: null,
    raiz: null,
  };

  var ctx = null;

  global.RAMAApp.iniciar("personagens", async function () {
    document.body.classList.add("pagina-ficha");

    estado.personagemId = U.parametro("id");
    estado.aba = lerAbaGuardada();

    var alvo = U.$("#ficha");

    if (!estado.personagemId) {
      U.trocar(alvo, UI.vazio({
        titulo: "Registro não informado",
        texto: "O endereço desta página precisa do identificador do personagem.",
        acao: { rotulo: "Ver personagens", aoClicar: function () { location.href = U.url("personagens/"); } },
      }));
      return;
    }

    U.trocar(alvo, UI.carregando("Acessando registro"));

    /* Ficha, foto e campanhas em paralelo: são três leituras
       independentes, e o Apps Script é lento o bastante para a
       diferença aparecer. */
    var [rFicha, rFoto, rCampanhas] = await Promise.all([
      global.RAMAApi.lerPersonagem(estado.personagemId),
      global.RAMAApi.lerFoto(estado.personagemId),
      global.RAMAApi.listarCampanhas(),
    ]);

    if (!rFicha.ok) {
      U.trocar(alvo, UI.erroDeTela(rFicha, function () { location.reload(); }));
      return;
    }

    estado.ficha = F.normalizarFicha(rFicha.dados);
    estado.foto = (rFoto.ok && rFoto.dados && rFoto.dados.imagem) || "";
    estado.campanhas = (rCampanhas.ok && rCampanhas.dados) || [];

    montarContexto();
    montarSalvador(U.inteiro(rFicha.rev, 0));
    desenhar();
  });

  /* =================================================================
     CONTEXTO
     ================================================================= */

  function montarContexto() {
    ctx = {
      get ficha() { return estado.ficha; },
      get foto() { return estado.foto; },
      get campanhas() { return estado.campanhas; },
      get personagemId() { return estado.personagemId; },

      emEdicao: function () { return estado.modo === "edicao"; },
      revisao: function () { return estado.salvador ? estado.salvador.revisao() : 0; },

      alterou: function () {
        estado.ficha.atualizadoEm = U.agoraISO();
        if (estado.salvador) estado.salvador.alterou();
      },

      redesenhar: desenhar,
      atualizarTitulo: atualizarTitulo,

      definirFoto: function (imagem) {
        estado.foto = imagem;
        desenhar();
      },

      nomeDaCampanha: function () {
        var c = U.porId(estado.campanhas, estado.ficha.campanhaId);
        return c ? c.nome : "";
      },
    };
  }

  function montarSalvador(rev) {
    estado.indicador = UI.indicador(null);

    estado.salvador = global.RAMASalvador.criar({
      indicador: estado.indicador,
      esquema: global.RAMASync.ESQUEMA_FICHA,

      instantaneo: function () { return estado.ficha; },

      enviar: function (dados, revisao) {
        return global.RAMAApi.salvarPersonagem(estado.personagemId, revisao, dados);
      },

      aplicar: function (conciliada) {
        estado.ficha = F.normalizarFicha(conciliada);
        desenhar();
      },
    });

    estado.salvador.definirBase(estado.ficha, rev);
    estado.indicador.salvoAgora();
  }

  /* =================================================================
     DESENHO
     ================================================================= */

  function desenhar() {
    var alvo = U.$("#ficha");
    var secao = ABAS.find(function (a) { return a.chave === estado.aba; }) || ABAS[0];

    estado.raiz = el("div.ficha", { dataset: { modo: estado.modo } }, [
      cabecalho(),
      estado.modo === "edicao" ? avisoDeEdicao() : null,
      global.RAMASecaoGeral.blocoSuperior(ctx),
      abas(),
      el("div", { id: "aba-conteudo", role: "tabpanel", "aria-labelledby": "aba-" + secao.chave },
        [global[secao.secao].aba(ctx)]),
    ]);

    U.trocar(alvo, estado.raiz);
    manterNaTela();
  }

  /* Trocar o conteúdo inteiro pode deixar a página mais curta do que a
     rolagem atual — e aí a pessoa fica encarando espaço vazio abaixo do
     fim do documento. O navegador não corrige isso sozinho quando o DOM
     é substituído, então corrigimos aqui. */
  function manterNaTela() {
    var excedente = window.scrollY + window.innerHeight - document.documentElement.scrollHeight;
    if (excedente > 0) {
      window.scrollTo({ top: Math.max(0, window.scrollY - excedente), behavior: "auto" });
    }
  }

  function cabecalho() {
    /* O elemento nasce de novo a cada desenho; o objeto que cuida dele
       continua sendo o mesmo, porque é ele que o salvador segura. */
    var indicador = el("span.r-estado", { "aria-live": "polite" });
    estado.indicador.apontar(indicador);

    return el("header.ficha-topo", {}, [
      el("div.ficha-topo__faixa", {}, [
        el("a.r-icone", {
          href: U.url("personagens/"), "aria-label": "Voltar para personagens",
        }, [UI.simbolo("voltar")]),

        el("div.ficha-topo__identidade", {}, [
          el("h1.ficha-topo__nome", { id: "ficha-nome", texto: estado.ficha.nome }),
          el("p.ficha-topo__meta", { id: "ficha-meta", texto: metaTexto() }),
        ]),

        el("div.ficha-topo__ferramentas", {}, [
          indicador,
          modoSeletor(),
          UI.menu([
            { rotulo: "Exportar ficha", aoClicar: exportar },
            { rotulo: "Salvar agora", aoClicar: function () { estado.salvador.agora(); } },
            "separador",
            { rotulo: "Ver personagens", aoClicar: function () { location.href = U.url("personagens/"); } },
          ], { rotulo: "Opções da ficha", icone: "tresPontos" }),
        ]),
      ]),
    ]);
  }

  function metaTexto() {
    var partes = [];
    var campanha = ctx.nomeDaCampanha();
    if (campanha) partes.push(campanha);
    if (estado.ficha.classe) partes.push(estado.ficha.classe);
    if (estado.ficha.origem) partes.push(estado.ficha.origem);
    partes.push("Registro // " + U.codigoCurto(estado.personagemId));
    return partes.join(" · ");
  }

  function atualizarTitulo() {
    var nome = U.$("#ficha-nome");
    var meta = U.$("#ficha-meta");
    if (nome) nome.textContent = estado.ficha.nome;
    if (meta) meta.textContent = metaTexto();
    document.title = estado.ficha.nome + " — R.A.M.A.";
  }

  /* =================================================================
     MODO
     -----------------------------------------------------------------
     Entrar em edição é explícito e visível: o seletor inverte, a ficha
     inteira ganha contorno âmbar e uma faixa diz o que está solto.
     Editar sem perceber custa estrutura, não um número.
     ================================================================= */

  function modoSeletor() {
    return el("div.modo", { role: "group", "aria-label": "Modo da ficha" }, [
      el("button.modo__opcao", {
        type: "button",
        texto: "Normal",
        "aria-pressed": String(estado.modo === "normal"),
        onclick: function () { trocarModo("normal"); },
      }),
      el("button.modo__opcao.modo__opcao--edicao", {
        type: "button",
        texto: "Edição",
        "aria-pressed": String(estado.modo === "edicao"),
        onclick: function () { trocarModo("edicao"); },
      }),
    ]);
  }

  function trocarModo(novo) {
    if (estado.modo === novo) return;
    estado.modo = novo;
    desenhar();
    UI.aviso(novo === "edicao"
      ? "Modo edição ativo. A estrutura da ficha está destravada."
      : "Modo normal. A estrutura está travada de novo.");
  }

  function avisoDeEdicao() {
    return el("div.ficha__aviso-edicao", { role: "status" }, [
      el("span", { texto: "Modo edição ativo — a estrutura da ficha pode ser alterada" }),
      el("button.r-botao.r-botao--mini", {
        type: "button", texto: "Sair da edição",
        onclick: function () { trocarModo("normal"); },
      }),
    ]);
  }

  /* =================================================================
     ABAS
     ================================================================= */

  function abas() {
    return el("div.r-abas", { role: "tablist", "aria-label": "Seções da ficha" },
      ABAS.map(function (a) {
        var ativa = a.chave === estado.aba;
        return el("button.r-aba", {
          type: "button",
          id: "aba-" + a.chave,
          role: "tab",
          "aria-selected": String(ativa),
          tabindex: ativa ? "0" : "-1",
          texto: a.rotulo,
          onclick: function () { trocarAba(a.chave); },
          onkeydown: function (ev) { navegarAbas(ev); },
        });
      })
    );
  }

  function trocarAba(chave) {
    estado.aba = chave;
    guardarAba(chave);
    desenhar();

    /* Se a pessoa já estava lendo abaixo da tira de abas, a aba nova
       precisa começar visível. Se ela estava olhando os atributos, lá
       em cima, trocar de aba não pode arrancá-la de onde estava. */
    var tira = U.$(".r-abas");
    var topoFixo = U.$(".ficha-topo");
    if (!tira) return;

    var posicaoDaTira = tira.getBoundingClientRect().top + window.scrollY;
    var alturaFixa = topoFixo ? topoFixo.offsetHeight : 0;

    if (window.scrollY > posicaoDaTira - alturaFixa) {
      window.scrollTo({ top: Math.max(0, posicaoDaTira - alturaFixa - 8), behavior: "auto" });
    }
  }

  /* Seta esquerda e direita andam entre abas, como manda o padrão de
     tablist — quem navega por teclado não deveria precisar de Tab
     quatro vezes para chegar em Anotações. */
  function navegarAbas(ev) {
    if (ev.key !== "ArrowRight" && ev.key !== "ArrowLeft") return;
    ev.preventDefault();
    var i = ABAS.findIndex(function (a) { return a.chave === estado.aba; });
    var proximo = ev.key === "ArrowRight" ? i + 1 : i - 1;
    if (proximo < 0) proximo = ABAS.length - 1;
    if (proximo >= ABAS.length) proximo = 0;
    trocarAba(ABAS[proximo].chave);
    var botao = U.$("#aba-" + ABAS[proximo].chave);
    if (botao) botao.focus();
  }

  function lerAbaGuardada() {
    try {
      var v = localStorage.getItem(CHAVE_ABA) || "geral";
      return ABAS.some(function (a) { return a.chave === v; }) ? v : "geral";
    } catch (e) { return "geral"; }
  }

  function guardarAba(chave) {
    try { localStorage.setItem(CHAVE_ABA, chave); } catch (e) { /* preferência é dispensável */ }
  }

  /* =================================================================
     EXPORTAR
     ================================================================= */

  function exportar() {
    var pacote = global.RAMAValidacao.exportar("personagem", estado.ficha);
    var texto = JSON.stringify(pacote, null, 2);

    var area = el("textarea.r-area", { rows: 10, readonly: true, "aria-label": "Ficha em JSON" });
    area.value = texto;

    UI.modal({
      titulo: "Exportar ficha",
      largo: true,
      conteudo: [
        el("p", { texto: "Copie o conteúdo abaixo e guarde num arquivo .json. Ele pode ser importado no Perfil, aqui ou em outra conta." }),
        area,
        el("p.t-mini", { texto: "Dono, identificadores e revisão ficam de fora do arquivo de propósito: quem importa recebe um registro novo, da própria conta." }),
      ],
      botoes: [
        {
          rotulo: "Copiar",
          classe: "r-botao--principal",
          aoClicar: async function () {
            try {
              await navigator.clipboard.writeText(texto);
              UI.avisoOk("Copiado.");
            } catch (e) {
              area.select();
              UI.avisoAtencao("Não foi possível copiar sozinho — o texto está selecionado, use Ctrl+C.");
            }
          },
        },
        { rotulo: "Fechar", classe: "r-botao--fantasma" },
      ],
    });
  }
})(window);
