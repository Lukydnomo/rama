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
    { chave: "aliados",      rotulo: "Aliados",     secao: "RAMASecaoAliados" },
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
    { chave: "aliados",      rotulo: "Aliados",     secao: "RAMASecaoAliados" },
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
    if (!estado.ficha) return ABAS_UNIVERSAL;
    if (!F.ehDeOrdem(estado.ficha)) return ABAS_UNIVERSAL.filter(function (a) {
      return a.chave === "geral" || F.moduloAtivo(estado.ficha, a.chave);
    });
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
    /* v2.44: o que esta conta pode fazer com a ficha, como o servidor
       disse ao entregá-la; e por qual porta entrou. */
    capacidades: { ler: true, editar: true, copiar: true, gerenciar: true, dono: true },
    acesso: null,
    /* Sem salvador (leitor), a revisão e a ficha que vieram do servidor. */
    revLeitura: 0,
    baseLeitura: null,
    revogado: false,
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

    /* O aviso que o servidor v2.15 deixa no lugar da ficha, quando a
       ficha está em blocos. Só chega aqui se o Apps Script implantado for
       ANTERIOR à v2.15 — ele não sabe montar os blocos e entrega o aviso
       como se fosse a ficha. Abrir para edição e salvar por cima seria
       gravar o aviso; a página para e diz o que fazer. */
    if (rFicha.dados && rFicha.dados._armazenamento) {
      U.trocar(alvo, UI.vazio({
        titulo: "O servidor precisa ser atualizado",
        texto: "Esta ficha está guardada em blocos (R.A.M.A. v2.15), e o Apps Script em uso é de uma versão anterior, " +
               "que não sabe montá-la. Nada foi perdido. Quem administra o R.A.M.A. precisa implantar a versão atual do " +
               "Apps Script; depois disso, recarregue esta página.",
        acao: { rotulo: "Recarregar", aoClicar: function () { location.reload(); } },
      }));
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
    estado.capacidades = capacidadesDe(rFicha);
    estado.acesso = rFicha.acesso || null;

    montarContexto();
    /* Leitor: nenhum salvador — nada nesta página consegue gravar. */
    if (estado.capacidades.editar) {
      montarSalvador(U.inteiro(rFicha.rev, 0));
    } else {
      estado.revLeitura = U.inteiro(rFicha.rev, 0);
      estado.baseLeitura = U.copiar(estado.ficha);
      estado.indicador = UI.indicador(null);
    }

    /* O histórico se liga aqui, uma vez. Daqui em diante toda rolagem
       que passar por RAMARolagens.mostrar() sobe para a campanha
       sozinha — nenhuma seção da ficha precisa saber disso. Só para quem
       fala pelo personagem na mesa — o dono ou o mestre (v2.44): quem
       recebeu a ficha compartilhada rola aqui, mas não no histórico. */
    var naMesa = estado.capacidades.dono || !!rFicha.mestre;
    if (global.RAMAHistorico && naMesa) {
      global.RAMAHistorico.configurar({
        campanhaId: estado.ficha.campanhaId || null,
        personagemId: estado.personagemId,
      });
    }

    /* O tema de dados do personagem (v2.40): cada rolagem desta ficha
       leva a escolha DESTE momento. Lido na hora, para valer o que
       acabou de ser aplicado no editor. */
    if (global.RAMAAparenciaRolagem) {
      global.RAMAAparenciaRolagem.fonte(function () {
        var d = estado.ficha && estado.ficha.aparencia && estado.ficha.aparencia.dados;
        return d && d.id ? d.id : null;
      });
    }

    /* Quem abriu como mestre precisa saber: a ficha é de outra pessoa. */
    estado.comoMestre = !!rFicha.mestre && !rFicha.dono;
    estado.dono = !!rFicha.dono;

    desenhar();
    ligarVigia();

    /* Uma única vez por abertura: se o personagem de Ordem chegou a NEX
       50% sem afinidade e ninguém adiou a decisão, a escolha abre.
       Redesenhar ou salvar nunca chama isto de novo. No painel do
       combate, não: o mestre abriu para consultar, não para decidir a
       progressão do jogador. Nem para quem só lê (v2.44). */
    if (!PAINEL && !somenteLeitura() && abasDaFicha() === ABAS_ORDEM && global.RAMASecaoOrdemProgressao && global.RAMASecaoOrdemProgressao.verificarAfinidade) {
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
      /* Quem abriu a ficha pode alterá-la? (v2.44) Vem das capacidades que
         o servidor devolveu — dono, mestre e Editor podem; o Leitor não, e
         nem quem perdeu o acesso com a ficha aberta. O servidor confere de
         novo a cada gravação. */
      podeEditar: function () { return !!estado.ficha && !somenteLeitura(); },
      /* As capacidades e o acesso, para quem precisar do rótulo. */
      capacidades: function () { return Object.assign({}, estado.capacidades); },
      /* Rótulo, não permissão: o servidor já decidiu quem é dono. Serve
         para esconder o que só o dono muda — a campanha da ficha. */
      ehDono: function () { return estado.dono; },
      revisao: function () { return revisaoAtual(); },

      alterou: function () {
        /* Leitor (ou acesso perdido): nada sobe, e a tela volta ao que
           veio do servidor (v2.44). */
        if (somenteLeitura()) { desfazerNaLeitura(); return; }
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

      enviar: function (dados, revisao, operacaoId) {
        return global.RAMAApi.salvarPersonagem(estado.personagemId, revisao, comResumo(dados), operacaoId);
      },

      /* Um erro que tentar de novo sozinho não resolve (a ficha passou do
         limite total, ou a versão guardada não se monta). Nada do que está
         na tela se perde; o aviso diz o motivo e oferece a cópia. Sem
         permissão (v2.44): a vigia confere o acesso na hora. */
      aoErroPermanente: function (r) {
        if (r && (r.erro === "sem_permissao" || r.erro === "nao_encontrado")) {
          if (!vigia.ativa) {
            vigia.ativa = true;
            document.addEventListener("visibilitychange", aoMudarVisibilidade);
          }
          consultarAcesso(true);
          return;
        }
        avisarErroPermanente(r);
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

  /* O aviso fica até a pessoa fechar, com a saída à mão: exportar o que
     está na tela. Exportar não substitui salvar — é a garantia de que,
     enquanto o servidor não aceita, a versão local não depende de a aba
     continuar aberta. */
  function avisarErroPermanente(resposta) {
    var f = global.RAMAApi.frase(resposta);
    UI.aviso(f.titulo + " — " + f.texto, {
      tipo: "erro",
      duracao: 600000,
      acao: { rotulo: "Exportar ficha", aoClicar: exportar },
    });
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
    /* Um arraste em andamento é edição: redesenhar agora tiraria o item
       da mão de quem arrasta (v2.19). */
    if (global.RAMAArrastar && global.RAMAArrastar.arrastando()) return true;
    var ativo = document.activeElement;
    if (!ativo || ativo === document.body) return false;
    return /^(INPUT|TEXTAREA|SELECT)$/.test(ativo.tagName) || ativo.isContentEditable;
  }

  /* Traz a versão do servidor, se ela for mais nova e se não houver nada
     desta ficha esperando para subir nem um campo sendo editado. Nunca
     por cima de trabalho local. */
  async function recarregarSeLivre() {
    if (!estado.ficha || estado.revogado) return { ok: false, motivo: "carregando" };
    var s = estado.salvador;
    function ocupado() { return !!(s && (s.temPendencia() || s.emConflito())); }
    if (ocupado()) return { ok: false, motivo: "pendente" };
    if (editandoAlgo()) return { ok: false, motivo: "editando" };

    var r = await global.RAMAApi.post({ acao: "ler_personagem", personagemId: estado.personagemId }, { segundoPlano: true });
    if (!r.ok) return r;
    if (U.inteiro(r.rev, 0) <= revisaoAtual()) return { ok: true, mudou: false };
    if (U.inteiro(r.dados && r.dados.schemaVersion, 0) > F.VERSAO_SCHEMA) return { ok: false, motivo: "versao" };
    if (ocupado() || editandoAlgo()) return { ok: false, motivo: "pendente" };

    var rolagem = global.scrollY;
    estado.ficha = F.normalizarFicha(r.dados);
    if (r.acesso) estado.acesso = r.acesso;
    if (s && !somenteLeitura()) s.definirBase(estado.ficha, U.inteiro(r.rev, 0));
    else { estado.revLeitura = U.inteiro(r.rev, 0); estado.baseLeitura = U.copiar(estado.ficha); }
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
    sincronizarTema();
    var alvo = U.$("#ficha");
    var lista = abasDaFicha();
    var secao = lista.find(function (a) { return a.chave === estado.aba; }) || lista[0];
    /* A aba guardada pode não existir neste tipo de ficha (Progressão
       numa universal). A que aparece passa a ser a marcada. */
    estado.aba = secao.chave;

    if (somenteLeitura()) estado.modo = "normal";
    estado.raiz = el("div.ficha", { dataset: { modo: estado.modo }, class: somenteLeitura() ? "ficha--leitura" : "" }, [
      cabecalho(),
      avisoDeAcesso(),
      estado.comoMestre && !somenteLeitura() ? avisoDeMestre() : null,
      estado.modo === "edicao" ? avisoDeEdicao() : null,
      blocoSuperiorDaFicha(),
      abas(),
      el("div", { id: "aba-conteudo", role: "tabpanel", "aria-labelledby": "aba-" + secao.chave },
        [global[secao.secao].aba(ctx)]),
    ]);

    U.trocar(alvo, estado.raiz);
    aplicarLeitura(estado.raiz);
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
          botaoDeTema(),
          estado.modo === "edicao" && !F.ehDeOrdem(estado.ficha)
            ? el("button.r-botao.r-botao--mini", { type: "button", texto: "Configurar módulos", onclick: configurarModulos }) : null,
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
          ].concat(estado.salvador && !somenteLeitura() ? [
            { rotulo: "Salvar agora", aoClicar: function () { estado.salvador.agora(); } },
          ] : []).concat(!PAINEL && estado.capacidades.gerenciar && !estado.revogado ? [
            { rotulo: "Compartilhar…", aoClicar: function () { abrirCompartilhamento(); } },
          ] : []).concat(!PAINEL && estado.capacidades.copiar && !estado.capacidades.dono && !estado.revogado ? [
            { rotulo: "Copiar para minha biblioteca", aoClicar: copiarParaBiblioteca },
          ] : []).concat(PAINEL ? [] : [
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

  function configurarModulos() {
    if (!ctx.emEdicao() || F.ehDeOrdem(ctx.ficha)) return;
    var escolhas = F.normalizarModulos(ctx.ficha.modulos);
    UI.modal({
      titulo: "Configurar módulos",
      conteudo: el("div.pilha", {}, [
        el("p", { texto: "Desativar esconde a seção e seus atalhos. Os dados continuam guardados e reaparecem ao reativar." }),
        el("p.r-ajuda", { texto: "Perícias e ataques continuam usando seus atributos e vínculos, mesmo com Atributos ou Perícias ocultos. Esconder não altera cálculos nem permissões." }),
        el("p.r-ajuda", { texto: "Armaduras continuam contribuindo para a Defesa mesmo com Inventário oculto. Ocultar Status não impede gastos de recursos por ações que os utilizem." }),
        el("div.pilha", {}, Object.keys(F.MODULOS).map(function (chave) {
          return el("label.faixa", {}, [
            el("input", { type: "checkbox", checked: escolhas[chave], onchange: function (ev) { escolhas[chave] = ev.target.checked; } }),
            el("span", { texto: F.MODULOS[chave] }),
          ]);
        })),
      ]),
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Aplicar", classe: "r-botao--principal", aoClicar: function (fechar) {
          ctx.ficha.modulos = escolhas;
          ctx.alterou(); fechar(); desenhar();
        } },
      ],
    });
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
    /* Quem só lê não tem modo Edição para escolher (v2.44). */
    if (somenteLeitura()) {
      return el("span.etiqueta.ficha-topo__leitura", { texto: "Somente leitura", title: "Esta ficha está aberta só para consulta" });
    }
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

  /* =================================================================
     TEMA DA FICHA (v2.36)
     -----------------------------------------------------------------
     O lápis ao lado de Normal/Edição abre o editor no contexto da
     ficha. O tema vale só nesta ficha; "usar o tema da conta" é o
     padrão e usa a conta de quem está vendo. Aplicar não redesenha a
     página (o que estiver sendo digitado fica): troca o bloco
     `aparencia`, pinta e entra na fila de gravação, e o aviso diz se
     o servidor guardou, se ficou pendente ou se falhou.
     ================================================================= */

  var temaPintado = null;

  /* A página diz ao tema qual ficha está aberta, e com que aparência —
     a cada desenho, mas só repinta quando o bloco mudou (carga,
     conciliação, versão nova trazida pela sincronização). */
  function sincronizarTema() {
    if (!global.RAMATema || !estado.ficha) return;
    var a = JSON.stringify(estado.ficha.aparencia || null);
    if (a === temaPintado) return;
    temaPintado = a;
    global.RAMATema.definirFicha(estado.personagemId, estado.ficha.aparencia);
  }

  function botaoDeTema() {
    if (!global.RAMATemaEditor || !ctx.podeEditar()) return null;
    var proprio = estado.ficha.aparencia && estado.ficha.aparencia.modo !== "conta";
    return el("button.r-icone.r-icone--contorno.ficha-topo__tema", {
      type: "button",
      "aria-label": "Personalizar tema desta ficha" + (proprio ? " (tema próprio)" : ""),
      title: "Personalizar tema desta ficha",
      dataset: { proprio: proprio ? "sim" : "nao" },
      onclick: abrirTema,
    }, [UI.simbolo("lapis")]);
  }

  function abrirTema() {
    global.RAMATemaEditor.abrir({
      contexto: "ficha",
      nomeFicha: estado.ficha.nome,
      aparencia: estado.ficha.aparencia,
      podeSalvar: ctx.podeEditar(),
      /* O tema dos dados (v2.40) vem da coleção da conta DONA: só ela o
         troca. Para o mestre, a escolha aparece e fica como está. */
      podeEscolherDados: ctx.podeEditar() && !!estado.dono,
      /* As cores de um sistema (elementos e graus de Ordem) só existem no
         tema de uma ficha dele. */
      sistema: F.ehDeOrdem(estado.ficha) ? "ordem" : "universal",
      aplicar: aplicarTema,
    });
  }

  function aplicarTema(aparencia) {
    if (!estado.salvador) return Promise.resolve({ ok: false });
    estado.ficha.aparencia = aparencia;
    ctx.alterou();
    sincronizarTema();
    var botao = U.$(".ficha-topo__tema");
    if (botao) {
      var proprio = aparencia.modo !== "conta";
      botao.dataset.proprio = proprio ? "sim" : "nao";
      botao.setAttribute("aria-label", "Personalizar tema desta ficha" + (proprio ? " (tema próprio)" : ""));
    }
    return esperarGravacao();
  }

  /* Pede a gravação agora e acompanha o salvador: gravou, ficou
     pendente (sem conexão, conflito a resolver) ou parou com erro. */
  function esperarGravacao() {
    var s = estado.salvador;
    var inicio = Date.now();
    s.agora();
    return new Promise(function (resolver) {
      (function olhar() {
        if (s.bloqueio()) return resolver({ ok: false, texto: "o servidor recusou a gravação" });
        if (s.emConflito()) return resolver({ ok: false, pendente: true });
        if (!s.temPendencia()) return resolver({ ok: true });
        if (Date.now() - inicio > 20000) return resolver({ ok: false, pendente: true });
        setTimeout(olhar, 200);
      })();
    });
  }

  function trocarModo(novo) {
    if (estado.modo === novo) return;
    if (novo === "edicao" && somenteLeitura()) return;
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
     ACESSO E COMPARTILHAMENTO (v2.44)
     -----------------------------------------------------------------
     O servidor diz, ao entregar a ficha, o que esta conta pode fazer
     (`capacidades`) e por qual porta entrou (`acesso`: dono, mestre,
     editor ou leitor). A tela se orienta por isso; quem decide é o
     servidor, de novo, a cada gravação.

     LEITOR. Não há salvador: nada desta página grava. Os campos ficam
     só de leitura e o modo Edição não aparece; e, como rede para
     qualquer controle que mude a ficha fora do modo Edição, ctx.alterou()
     DESFAZ — a ficha volta ao que veio do servidor e um aviso explica.
     Nenhuma rolagem sobe para a campanha em nome do personagem.

     A VIGIA. Com a ficha compartilhada (ou aberta por quem não é dono),
     a página pergunta de tempos em tempos — e ao voltar a ficar visível
     — a revisão e o acesso atuais (acesso_personagem, só colunas leves):
       · revisão nova e nada pendente aqui: traz a versão nova;
       · Editor rebaixado a Leitor: o salvador para; o que não subiu fica
         na tela (e pode ser exportado), mas não vai para a original;
       · acesso retirado ou ficha excluída: a vigia para, nada grava, e a
         tela diz o que houve.
     ================================================================= */

  var VIGIA_MS = 25000;
  var vigia = { timer: null, ativa: false, consultando: false };

  /* Servidor anterior à v2.44 não manda capacidades: valem as duas
     portas de sempre (dono ou mestre), que podiam editar. */
  function capacidadesDe(r) {
    if (r && r.capacidades && typeof r.capacidades === "object") {
      var c = r.capacidades;
      return { ler: !!c.ler, editar: !!c.editar, copiar: !!c.copiar, gerenciar: !!c.gerenciar, dono: !!c.dono };
    }
    var dono = !!(r && r.dono);
    return { ler: true, editar: true, copiar: dono, gerenciar: false, dono: dono };
  }

  function somenteLeitura() { return !estado.capacidades.editar || estado.revogado; }

  var ROTULO_DO_PAPEL = { editor: "Editor", leitor: "Leitor", mestre: "Mestre da campanha", dono: "Dono" };

  /* A faixa que diz de quem é a ficha e com que acesso ela está aberta. */
  function avisoDeAcesso() {
    if (estado.revogado) {
      return el("div.ficha__aviso-acesso.ficha__aviso-acesso--perdido", { role: "status" }, [
        el("span", { texto: "Você não tem mais acesso a esta ficha. O que está na tela não é salvo — exporte se precisar guardar." }),
      ]);
    }
    var a = estado.acesso;
    if (!a || !a.compartilhada || estado.capacidades.dono) return null;
    var dono = a.dono && (a.dono.nome || a.dono.usuario) ? (a.dono.nome || a.dono.usuario) + (a.dono.usuario ? " (@" + a.dono.usuario + ")" : "") : "outra conta";
    var leitura = !estado.capacidades.editar;
    return el("div.ficha__aviso-acesso", { role: "status", class: leitura ? "ficha__aviso-acesso--leitura" : "" }, [
      el("span", {}, [
        el("span", { texto: "Ficha compartilhada por " }),
        el("strong", { texto: dono }),
        el("span", { texto: " · seu acesso: " }),
        el("strong", { texto: estado.capacidades.editar ? (a.papel === "editor" ? "Editor" : ROTULO_DO_PAPEL[a.papel] || "Editor") : "Leitor" }),
        el("span", { texto: leitura
          ? " — consulta. Para mexer, copie para a sua biblioteca."
          : " — você altera a ficha original, e o dono vê o que mudar." }),
      ]),
      estado.capacidades.copiar
        ? el("button.r-botao.r-botao--mini", { type: "button", texto: "Copiar para minha biblioteca", onclick: copiarParaBiblioteca })
        : null,
    ]);
  }

  /* Leitor: os campos que aparecem fora do modo Edição ficam só de
     leitura — o texto continua selecionável e copiável. */
  function aplicarLeitura(raiz) {
    if (!somenteLeitura() || !raiz) return;
    U.$$("input, textarea, select", raiz).forEach(function (c) {
      if (c.closest && c.closest(".r-abas")) return;
      var tipo = String(c.type || "").toLowerCase();
      if (c.tagName === "SELECT" || tipo === "checkbox" || tipo === "radio" || tipo === "range" || tipo === "file" || tipo === "color") c.disabled = true;
      else if (tipo !== "search") c.readOnly = true;
      c.setAttribute("aria-readonly", "true");
    });
    U.$$("[contenteditable]", raiz).forEach(function (c) { c.setAttribute("contenteditable", "false"); });
  }

  /* A rede do leitor: qualquer mudança feita na tela volta atrás. */
  var avisoDeLeituraEm = 0;
  function desfazerNaLeitura() {
    estado.ficha = F.normalizarFicha(U.copiar(estado.baseLeitura));
    setTimeout(function () { desenhar(); }, 0);
    if (Date.now() - avisoDeLeituraEm > 4000) {
      avisoDeLeituraEm = Date.now();
      UI.avisoAtencao(estado.revogado
        ? "Sem acesso a esta ficha: nada foi alterado."
        : "Esta ficha está aberta só para leitura — nada foi alterado. Copie para a sua biblioteca para editar.");
    }
  }

  /* ---------- a vigia ---------- */

  function precisaDeVigia() {
    if (PAINEL || estado.revogado) return false;
    var a = estado.acesso;
    return !estado.capacidades.dono || !!(a && a.compartilhamentos > 0);
  }

  function ligarVigia() {
    if (vigia.ativa || !precisaDeVigia()) return;
    vigia.ativa = true;
    agendarVigia();
    document.addEventListener("visibilitychange", aoMudarVisibilidade);
  }

  function pararVigia() {
    vigia.ativa = false;
    clearTimeout(vigia.timer);
    document.removeEventListener("visibilitychange", aoMudarVisibilidade);
  }

  function agendarVigia(ms) {
    clearTimeout(vigia.timer);
    if (!vigia.ativa) return;
    vigia.timer = setTimeout(consultarAcesso, ms === undefined ? VIGIA_MS : ms);
  }

  function aoMudarVisibilidade() {
    if (document.visibilityState === "visible") agendarVigia(300);
  }

  /* `forcar`: pergunta mesmo com a página escondida (uma gravação acabou
     de ser recusada por permissão). */
  async function consultarAcesso(forcar) {
    if (!vigia.ativa || vigia.consultando) return;
    if (document.visibilityState === "hidden" && forcar !== true) return;
    vigia.consultando = true;
    var r;
    try {
      r = await global.RAMAApi.acessoPersonagem(estado.personagemId);
    } finally {
      vigia.consultando = false;
    }
    if (!vigia.ativa) return;

    if (!r || !r.ok) {
      if (r && (r.erro === "nao_encontrado" || r.erro === "sem_permissao")) { perderAcesso(); return; }
      /* Servidor antigo (ação desconhecida): a vigia não existe lá. */
      if (r && r.erro === "acao_desconhecida") { pararVigia(); return; }
      agendarVigia(VIGIA_MS * 2);
      return;
    }

    var novas = capacidadesDe(r.dados);
    var antes = estado.capacidades;
    if (r.dados && r.dados.acesso) estado.acesso = r.dados.acesso;

    if (antes.editar && !novas.editar) {
      rebaixar(novas);
    } else if (!antes.editar && novas.editar) {
      estado.capacidades = novas;
      UI.aviso("Seu acesso a esta ficha agora é de Editor. Recarregue a página para editar.", {
        tipo: "atencao", duracao: 600000, acao: { rotulo: "Recarregar", aoClicar: function () { location.reload(); } },
      });
      desenhar();
    } else {
      var mudouAlgo = JSON.stringify(antes) !== JSON.stringify(novas);
      estado.capacidades = novas;
      if (mudouAlgo) desenhar();
    }

    if (U.inteiro(r.rev, 0) > revisaoAtual()) await recarregarSeLivre();
    agendarVigia();
  }

  function revisaoAtual() { return estado.salvador ? estado.salvador.revisao() : estado.revLeitura; }

  /* Editor que virou Leitor: nada mais sobe. O que estava pendente fica
     na tela — sem ir para a original e sem sumir. */
  function rebaixar(novas) {
    var pendente = !!(estado.salvador && (estado.salvador.temPendencia() || estado.salvador.emConflito()));
    if (estado.salvador) {
      estado.revLeitura = estado.salvador.revisao();
      estado.salvador.travar();
    }
    estado.capacidades = novas;
    estado.baseLeitura = U.copiar(estado.ficha);
    estado.modo = "normal";
    desenhar();
    UI.aviso(pendente
      ? "Seu acesso mudou para Leitor. As alterações que ainda não tinham subido ficaram só nesta tela e não vão para a ficha original — exporte se quiser guardá-las."
      : "Seu acesso a esta ficha mudou para Leitor: ela agora está aberta só para consulta.", {
      tipo: "atencao", duracao: 600000, acao: { rotulo: "Exportar ficha", aoClicar: exportar },
    });
  }

  function perderAcesso() {
    if (estado.revogado) return;
    pararVigia();
    var pendente = !!(estado.salvador && (estado.salvador.temPendencia() || estado.salvador.emConflito()));
    if (estado.salvador) estado.salvador.travar();
    estado.revogado = true;
    estado.baseLeitura = U.copiar(estado.ficha);
    estado.modo = "normal";
    desenhar();
    UI.aviso("Você não tem mais acesso a esta ficha (o compartilhamento foi retirado ou ela foi excluída)." +
      (pendente ? " O que não tinha subido ficou só nesta tela — exporte se quiser guardar." : ""), {
      tipo: "erro", duracao: 600000, acao: { rotulo: "Exportar ficha", aoClicar: exportar },
    });
  }

  /* ---------- gerenciar (só o dono) ---------- */

  function abrirCompartilhamento() {
    if (!global.RAMACompartilhar || !estado.capacidades.gerenciar) return;
    global.RAMACompartilhar.abrir({
      personagemId: estado.personagemId,
      nome: estado.ficha.nome,
      focoAoFechar: function () { return U.$('.ficha-topo [aria-label="Opções da ficha"]'); },
      aoSalvar: function (dados) {
        if (!estado.acesso) estado.acesso = {};
        estado.acesso.compartilhamentos = (dados && dados.acessos ? dados.acessos.length : 0);
        /* Com alguém editando junto, a página passa a perguntar pela
           versão nova; sem ninguém, para. */
        if (precisaDeVigia()) ligarVigia(); else pararVigia();
      },
    });
  }

  /* ---------- copiar para a própria biblioteca ---------- */

  /* Um id por intenção: tentar de novo depois de uma falha de rede manda
     o MESMO, e o servidor devolve a cópia que já tinha feito — nunca
     duas. Uma recusa de verdade descarta o id. */
  var copiaEmCurso = false;
  var operacaoDaCopia = null;
  async function copiarParaBiblioteca() {
    if (copiaEmCurso) return;
    copiaEmCurso = true;
    if (!operacaoDaCopia) operacaoDaCopia = global.RAMAApi.novaOperacao();
    var fim = UI.aviso("Copiando " + (estado.ficha.nome || "a ficha") + " para a sua biblioteca…", { duracao: 30000 });
    var r;
    try {
      r = await global.RAMAApi.copiarPersonagem(estado.personagemId, operacaoDaCopia);
    } finally {
      fim();
      copiaEmCurso = false;
    }
    if (!r || !r.ok) {
      var deRede = !r || r.erro === "sem_conexao" || r.erro === "prazo" || r.erro === "servidor_falhou";
      if (!deRede) operacaoDaCopia = null;
      UI.avisoDeFalha(r || {}, "cópia", { tentarDeNovo: copiarParaBiblioteca });
      return;
    }
    operacaoDaCopia = null;
    (r.avisos || []).forEach(function (t) { UI.avisoAtencao(t); });
    UI.aviso("Cópia criada na sua biblioteca. Ela é independente: mudar uma não muda a outra.", {
      tipo: "ok", duracao: 12000,
      acao: { rotulo: "Abrir a cópia", aoClicar: function () { location.href = U.url("ficha/?id=" + encodeURIComponent(r.dados.id)); } },
    });
  }

  /* =================================================================
     EXPORTAR
     ================================================================= */

  /* O nome do arquivo baixado: o nome da ficha, sem o que um sistema de
     arquivos recusaria. */
  function nomeDoArquivo() {
    var base = String(estado.ficha.nome || "ficha").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9 _-]+/g, "").trim().replace(/\s+/g, "-").slice(0, 60) || "ficha";
    return base + ".rama.json";
  }

  /* Uma ficha grande em uma caixa de texto é difícil de copiar inteira;
     o arquivo vem pronto. É também a cópia de segurança quando o servidor
     não aceita a gravação. */
  function baixar(texto) {
    try {
      var blob = new Blob([texto], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = nomeDoArquivo();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
      UI.avisoOk("Arquivo gerado: " + a.download);
    } catch (e) {
      UI.avisoAtencao("Não foi possível gerar o arquivo neste navegador — copie o texto da caixa.");
    }
  }

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
          rotulo: "Baixar arquivo",
          classe: "r-botao--principal",
          aoClicar: function () { baixar(texto); },
        },
        {
          rotulo: "Copiar",
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
