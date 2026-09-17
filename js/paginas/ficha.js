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

   MODO PAINEL (?painel=1)
   A MESMA ficha, dentro do painel lateral da aba Combate da campanha.
   Não é outra implementação: são estes arquivos, este salvador e este
   histórico, sem a casca do site em volta. A página de fora conversa
   com ela por RAMAFichaPainel (mesma origem): pergunta se há alteração
   por salvar antes de trocar de participante, pede para salvar agora e
   pede para recarregar quando a sincronização da campanha traz uma
   versão nova — o que só acontece se não houver nada pendente nem um
   campo sendo editado. A permissão é a de sempre: ler_personagem só
   entrega a ficha a quem é dono ou mestre da campanha dela.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var F = global.RAMAFicha;
  var el = U.el;

  var PAINEL = U.parametro("painel") === "1";

  /* A ordem é a do projeto: Habilidades logo depois de Perícias, e a
     seção de rituais em seguida.

     O rótulo de rituais é uma FUNÇÃO porque o nome dela é configurável
     — quem trocar "Rituais" por "Magias" vê a aba mudar junto, sem que
     nada da estrutura interna se mexa. */
  /* As abas dependem do TIPO da ficha.

     A universal tem as de sempre. A de Ordem troca Geral e Perícias
     por versões que calculam pelas regras, e acrescenta Progressão e
     Regras opcionais. Habilidades, Rituais, Inventário e Anotações são
     as MESMAS nos dois: um ritual é um ritual, e duplicar a seção só
     para mudar o cabeçalho seria manter dois códigos iguais. Na de
     Ordem, Habilidades recebe na mesma lista o que as regras entregam,
     e Inventário abre com carga e capacidade. */
  var ABAS_UNIVERSAL = [
    { chave: "geral",        rotulo: "Geral",       secao: "RAMASecaoGeral" },
    { chave: "pericias",     rotulo: "Perícias",    secao: "RAMASecaoPericias" },
    { chave: "habilidades",  rotulo: "Habilidades", secao: "RAMASecaoHabilidades" },
    { chave: "rituais",      secao: "RAMASecaoRituais",
      rotulo: function () { return global.RAMASecaoRituais.rotulo(ctx); } },
    { chave: "inventario",   rotulo: "Inventário",  secao: "RAMASecaoInventario" },
    { chave: "anotacoes",    rotulo: "Anotações",   secao: "RAMASecaoAnotacoes" },
  ];

  var ABAS_ORDEM = [
    { chave: "geral",        rotulo: "Geral",       secao: "RAMASecaoOrdemGeral" },
    { chave: "pericias",     rotulo: "Perícias",    secao: "RAMASecaoOrdemPericias" },
    { chave: "progressao",   rotulo: "Progressão",  secao: "RAMASecaoOrdemProgressao" },
    { chave: "habilidades",  rotulo: "Habilidades", secao: "RAMASecaoOrdemHabilidades" },
    { chave: "rituais",      secao: "RAMASecaoRituais",
      rotulo: function () { return global.RAMASecaoRituais.rotulo(ctx); } },
    { chave: "inventario",   rotulo: "Inventário",  secao: "RAMASecaoInventario" },
    { chave: "anotacoes",    rotulo: "Anotações",   secao: "RAMASecaoAnotacoes" },
    { chave: "regras",       rotulo: "Regras",      secao: "RAMASecaoOrdemRegras" },
  ];

  /* Lida do TIPO gravado, nunca deduzida do conteúdo. E com uma rede:
     se os módulos de Ordem não estiverem carregados, a ficha abre no
     modelo universal em vez de abrir quebrada. */
  /* O bloco que fica sempre à vista, acima das abas. Ele também depende
     do tipo: numa ficha de Ordem, os atributos e os recursos são os
     calculados pelas regras, não os campos livres do modelo universal. */
  function blocoSuperiorDaFicha() {
    var secao = abasDaFicha() === ABAS_ORDEM
      ? global.RAMASecaoOrdemGeral
      : global.RAMASecaoGeral;
    return secao.blocoSuperior(ctx);
  }

  function abasDaFicha() {
    if (!estado.ficha || !F.ehDeOrdem(estado.ficha)) return ABAS_UNIVERSAL;
    if (!global.RAMASecaoOrdemGeral) return ABAS_UNIVERSAL;
    return ABAS_ORDEM;
  }

  function rotuloDaAba(a) {
    return typeof a.rotulo === "function" ? a.rotulo() : a.rotulo;
  }

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
    comoMestre: false,
    dono: true,
  };

  var ctx = null;

  global.RAMAApp.iniciar("personagens", async function (agente, casca, prontas) {
    document.body.classList.add("pagina-ficha");
    if (PAINEL) document.body.classList.add("pagina-ficha--painel");

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

    /* Ficha, foto e campanhas já vieram junto com a conferência da
       sessão, numa requisição só — ver o `pedidos` no fim do arquivo.

       Antes eram quatro chamadas em duas ondas: a sessão primeiro, e só
       depois as três leituras em paralelo. Paralelo ajuda, mas cada uma
       ainda pagava a partida do Apps Script por conta própria, e a
       segunda onda só começava quando a primeira terminava.

       O `Promise.all` continua aqui como rede de segurança: se a página
       for aberta sem a pré-carga — outro caminho de entrada, um erro no
       lote — ela busca por conta própria em vez de ficar em branco. */
    var [rFicha, rFoto, rCampanhas] = prontas && prontas.length === 3
      ? prontas
      : await Promise.all([
          global.RAMAApi.lerPersonagem(estado.personagemId),
          global.RAMAApi.lerFoto(estado.personagemId),
          global.RAMAApi.listarCampanhas(),
        ]);

    if (!rFicha.ok) {
      U.trocar(alvo, UI.erroDeTela(rFicha, function () { location.reload(); }));
      return;
    }

    /* Uma ficha gravada por uma versão MAIS NOVA do R.A.M.A. — outra aba,
       outro aparelho, já atualizado — pode ter campos que este código
       não conhece. Normalizar e gravar aqui os descartaria. A página
       para e pede para recarregar, em vez de salvar por cima. */
    if (U.inteiro(rFicha.dados && rFicha.dados.schemaVersion, 0) > F.VERSAO_SCHEMA) {
      U.trocar(alvo, UI.vazio({
        titulo: "Esta ficha é de uma versão mais nova",
        texto: "Ela foi salva por uma versão do R.A.M.A. mais recente do que a desta página. Recarregue a página para abrir a versão atual — assim nada do que foi salvo se perde.",
        acao: { rotulo: "Recarregar", aoClicar: function () { location.reload(); } },
      }));
      return;
    }

    estado.ficha = F.normalizarFicha(rFicha.dados);
    estado.foto = (rFoto.ok && rFoto.dados && rFoto.dados.imagem) || "";
    estado.campanhas = (rCampanhas.ok && rCampanhas.dados) || [];

    montarContexto();
    montarSalvador(U.inteiro(rFicha.rev, 0));

    /* O histórico se liga aqui, uma vez. Daqui em diante toda rolagem
       que passar por RAMARolagens.mostrar() sobe para a campanha
       sozinha — nenhuma seção da ficha precisa saber disso. */
    if (global.RAMAHistorico) {
      global.RAMAHistorico.configurar({
        campanhaId: estado.ficha.campanhaId || null,
        personagemId: estado.personagemId,
      });
    }

    /* Quem abriu como mestre precisa saber: a ficha é de outra pessoa. */
    estado.comoMestre = !!rFicha.mestre && !rFicha.dono;
    estado.dono = !!rFicha.dono;

    desenhar();

    /* Uma única vez por abertura: se o personagem de Ordem chegou a NEX
       50% sem afinidade e ninguém adiou a decisão, a escolha abre.
       Redesenhar ou salvar nunca chama isto de novo. No painel do
       combate, não: o mestre abriu para consultar, não para decidir a
       progressão do jogador. */
    if (!PAINEL && abasDaFicha() === ABAS_ORDEM && global.RAMASecaoOrdemProgressao && global.RAMASecaoOrdemProgressao.verificarAfinidade) {
      global.RAMASecaoOrdemProgressao.verificarAfinidade(ctx);
    }
  }, {
    /* Roda antes de a sessão ser confirmada, então só pode olhar para o
       endereço da página. O servidor confere a permissão de cada uma
       destas leituras do mesmo jeito que conferiria se viessem
       sozinhas — e confere a sessão antes de todas elas. */
    pedidos: function () {
      var id = U.parametro("id");
      if (!id) return [];
      return [
        { acao: "ler_personagem", personagemId: id },
        { acao: "ler_foto", personagemId: id },
        { acao: "listar_campanhas" },
      ];
    },
    semCasca: PAINEL,
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
      /* Quem abriu a ficha pode alterá-la? O servidor só entrega a ficha a
         quem pode editar (dono ou mestre da campanha) e confere de novo a
         cada gravação; esta pergunta existe para os controles que ficam
         fora do modo edição (bônus extra de Defesa, Bloqueio e Esquiva)
         mostrarem só o valor quando um dia houver acesso de leitura. */
      podeEditar: function () { return !!estado.ficha; },
      /* Rótulo, não permissão: o servidor já decidiu quem é dono. Serve
         para esconder o que só o dono muda — a campanha da ficha. */
      ehDono: function () { return estado.dono; },
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

      irParaAba: function (chave) { trocarAba(chave); },

      nomeDaCampanha: function () {
        var c = U.porId(estado.campanhas, estado.ficha.campanhaId);
        return c ? c.nome : "";
      },

      /* Trocar de campanha é um campo da ficha como outro qualquer: vai
         na próxima gravação, e o servidor confere se o dono é mestre ou
         jogador da campanha escolhida. As rolagens passam a subir para
         ela a partir daqui. */
      definirCampanha: function (id) {
        estado.ficha.campanhaId = id || null;
        if (global.RAMAHistorico) {
          global.RAMAHistorico.configurar({
            campanhaId: estado.ficha.campanhaId,
            personagemId: estado.personagemId,
          });
        }
        ctx.alterou();
        atualizarTitulo();
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
        return global.RAMAApi.salvarPersonagem(estado.personagemId, revisao, comResumo(dados));
      },

      aplicar: function (conciliada) {
        estado.ficha = F.normalizarFicha(conciliada);
        desenhar();
      },

      aoSalvar: function (rev) { avisarPaginaDeFora("rama:ficha-salva", { rev: rev }); },
    });

    estado.salvador.definirBase(estado.ficha, rev);
    estado.indicador.salvoAgora();
  }

  /* O máximo de PV, PE e Sanidade vai junto de toda gravação de ficha
     de Ordem, para a mesa ver sem receber a ficha. Uma CÓPIA: o estado
     da tela e a base do salvador não ganham o campo. */
  function comResumo(dados) {
    var R = global.RAMAOrdemRegras;
    if (!dados || dados.tipoFicha !== "ordem" || !dados.ordem || !R || !R.resumoDeRecursos) return dados;
    try {
      return Object.assign({}, dados, { resumoRecursos: R.resumoDeRecursos(dados.ordem) });
    } catch (e) {
      console.warn("[R.A.M.A. · ficha] resumo de recursos não calculado", e);
      return dados;
    }
  }

  /* =================================================================
     PAINEL DO COMBATE
     ================================================================= */

  function avisarPaginaDeFora(tipo, extra) {
    if (!PAINEL || global.parent === global) return;
    try {
      global.parent.postMessage(Object.assign({ tipo: tipo, personagemId: estado.personagemId }, extra || {}), location.origin);
    } catch (e) { /* a página de fora foi embora */ }
  }

  function editandoAlgo() {
    var ativo = document.activeElement;
    if (!ativo || ativo === document.body) return false;
    return /^(INPUT|TEXTAREA|SELECT)$/.test(ativo.tagName) || ativo.isContentEditable;
  }

  /* Traz a versão do servidor, se ela for mais nova e se não houver nada
     desta ficha esperando para subir nem um campo sendo editado. Nunca
     por cima de trabalho local. */
  async function recarregarSeLivre() {
    if (!estado.salvador || !estado.ficha) return { ok: false, motivo: "carregando" };
    if (estado.salvador.temPendencia() || estado.salvador.emConflito()) return { ok: false, motivo: "pendente" };
    if (editandoAlgo()) return { ok: false, motivo: "editando" };

    var r = await global.RAMAApi.post({ acao: "ler_personagem", personagemId: estado.personagemId }, { segundoPlano: true });
    if (!r.ok) return r;
    if (U.inteiro(r.rev, 0) <= estado.salvador.revisao()) return { ok: true, mudou: false };
    if (U.inteiro(r.dados && r.dados.schemaVersion, 0) > F.VERSAO_SCHEMA) return { ok: false, motivo: "versao" };
    if (estado.salvador.temPendencia() || estado.salvador.emConflito() || editandoAlgo()) return { ok: false, motivo: "pendente" };

    var rolagem = global.scrollY;
    estado.ficha = F.normalizarFicha(r.dados);
    estado.salvador.definirBase(estado.ficha, U.inteiro(r.rev, 0));
    desenhar();
    global.scrollTo(0, rolagem);
    return { ok: true, mudou: true };
  }

  global.RAMAFichaPainel = {
    ativo: PAINEL,
    personagemId: function () { return estado.personagemId; },
    temPendencia: function () { return !!(estado.salvador && (estado.salvador.temPendencia() || estado.salvador.emConflito())); },
    salvarAgora: function () { return estado.salvador ? estado.salvador.agora() : Promise.resolve(); },
    recarregarSeLivre: recarregarSeLivre,
  };

  /* =================================================================
     DESENHO
     ================================================================= */

  function desenhar() {
    var alvo = U.$("#ficha");
    var lista = abasDaFicha();
    var secao = lista.find(function (a) { return a.chave === estado.aba; }) || lista[0];
    /* A aba guardada pode não existir neste tipo de ficha (Progressão
       numa universal). A que aparece passa a ser a marcada. */
    estado.aba = secao.chave;

    estado.raiz = el("div.ficha", { dataset: { modo: estado.modo } }, [
      cabecalho(),
      estado.comoMestre ? avisoDeMestre() : null,
      estado.modo === "edicao" ? avisoDeEdicao() : null,
      blocoSuperiorDaFicha(),
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
        PAINEL
          ? null
          : el("a.r-icone", {
              href: U.url("personagens/"), "aria-label": "Voltar para personagens",
            }, [UI.simbolo("voltar")]),

        el("div.ficha-topo__identidade", {}, [
          el("h1.ficha-topo__nome", { id: "ficha-nome", texto: estado.ficha.nome }),
          el("p.ficha-topo__meta", { id: "ficha-meta", texto: metaTexto() }),
        ]),

        el("div.ficha-topo__ferramentas", {}, [
          indicador,
          modoSeletor(),
          PAINEL
            ? el("a.r-botao.r-botao--mini.r-botao--fantasma", {
                href: U.url("ficha/?id=" + encodeURIComponent(estado.personagemId)),
                target: "_blank", rel: "noopener",
                texto: "Página inteira",
                "aria-label": "Abrir a ficha de " + estado.ficha.nome + " em página inteira, numa nova aba",
              })
            : null,
          UI.menu([
            { rotulo: "Exportar ficha", aoClicar: exportar },
            { rotulo: "Salvar agora", aoClicar: function () { estado.salvador.agora(); } },
          ].concat(PAINEL ? [] : [
            "separador",
            { rotulo: "Ver personagens", aoClicar: function () { location.href = U.url("personagens/"); } },
          ]), { rotulo: "Opções da ficha", icone: "tresPontos" }),
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

  /* Editar a ficha de outra pessoa tem de ser evidente o tempo todo.
     Sem este aviso, um mestre com várias fichas abertas mexe na errada
     sem perceber. */
  function avisoDeMestre() {
    return el("div.ficha__aviso-mestre", { role: "status" }, [
      el("span", { texto: "Você está editando como MESTRE da campanha — esta ficha é de outro agente." }),
    ]);
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
      abasDaFicha().map(function (a) {
        var ativa = a.chave === estado.aba;
        return el("button.r-aba", {
          type: "button",
          id: "aba-" + a.chave,
          role: "tab",
          "aria-selected": String(ativa),
          tabindex: ativa ? "0" : "-1",
          texto: rotuloDaAba(a),
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
    var lista = abasDaFicha();
    var i = lista.findIndex(function (a) { return a.chave === estado.aba; });
    var proximo = ev.key === "ArrowRight" ? i + 1 : i - 1;
    if (proximo < 0) proximo = lista.length - 1;
    if (proximo >= lista.length) proximo = 0;
    trocarAba(lista[proximo].chave);
    var botao = U.$("#aba-" + lista[proximo].chave);
    if (botao) botao.focus();
  }

  function lerAbaGuardada() {
    try {
      var v = localStorage.getItem(CHAVE_ABA) || "geral";
      /* A aba é lida antes de a ficha chegar, quando ainda não se sabe o
         tipo dela: vale qualquer aba conhecida. Se ela não existir no
         tipo da ficha, o desenho cai na primeira. */
      return ABAS_UNIVERSAL.concat(ABAS_ORDEM).some(function (a) { return a.chave === v; }) ? v : "geral";
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
