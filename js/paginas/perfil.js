/* =====================================================================
   R.A.M.A. — Perfil (v8.2)
   ---------------------------------------------------------------------
   Quem está usando o sistema, as preferências e as portas de entrada de
   dados. Um cabeçalho compacto (avatar, nome, @usuário; data da conta e
   código do agente nos detalhes) e QUATRO seções, uma por vez:

     Conta          nome, avatar, conexão e sessão
     Aparência      o editor da conta (tema, estilo, efeito de tela
                    antiga) e, à parte, o que vale só neste aparelho
     Temas de dados a coleção da conta e o resgate de código
     Importações    ficha do R.A.M.A., item para o Homebrew, ficha do CRIS

   A navegação é uma lista de abas (role=tablist): lateral no desktop,
   segmentada acima do conteúdo no celular, com setas, Home e End. A
   seção ativa tem o indicador (forma, não só cor) e aria-selected.
   Começa em Conta (ou na seção do endereço, #aparencia…), e salvar ou
   fechar um editor NUNCA redesenha a página: só o trecho afetado muda,
   e foco, rolagem e o que está sendo digitado ficam onde estavam.

   O que aparece sobre a conta é o que o SERVIDOR devolveu; o cache local
   só desenha o cabeçalho do site antes da resposta. Não existe troca de
   senha aqui: senha é assunto exclusivo do Apps Script (README).

   Movimento: 120–200 ms com as curvas do RAMA (tokens --tempo-curto e
   --curva, que valem 0 com prefers-reduced-motion). O conteúdo entra com
   fade e poucos pixels; o indicador acompanha a seleção; só o bloco que
   muda anima; nada bloqueia os controles durante a transição.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var el = U.el;

  var perfil = null;
  var painel = null;

  var SECOES = [
    { chave: "conta", rotulo: "Conta", icone: "perfil", desenhar: secaoConta },
    { chave: "aparencia", rotulo: "Aparência", icone: "tela", desenhar: secaoAparencia },
    { chave: "dados", rotulo: "Temas de dados", icone: "dado", desenhar: secaoDados },
    { chave: "importar", rotulo: "Importações", icone: "baixar", desenhar: secaoImportar },
  ];
  var estado = { secao: "conta" };
  var nav = null, indicador = null, area = null, abas = {};

  global.RAMAApp.iniciar("perfil", async function (agente) {
    painel = U.$("#painel-perfil");

    U.trocar(painel, [
      global.RAMAApp.titulo({ titulo: "Perfil", trilha: [agente.nome || "Agente"] }),
      UI.carregando("Consultando arquivo"),
    ]);

    var r = await global.RAMAApi.lerPerfil();

    if (!r.ok) {
      U.trocar(painel, [
        global.RAMAApp.titulo({ titulo: "Perfil" }),
        UI.erroDeTela(r, function () { location.reload(); }),
      ]);
      return;
    }

    perfil = r.dados || {};
    /* A leitura do perfil é a mais nova: o tema salvo vale sobre o cache. */
    if (global.RAMATema && perfil.preferencias) {
      global.RAMATema.sincronizarDaConta(perfil.id, perfil.preferencias.tema, { temaPersonalizado: temaAtivoDe(perfil.preferencias) });
    }
    /* E o estilo da interface (v2.49): chave ausente deixa o cache valer. */
    if (global.RAMAInterface && perfil.preferencias) {
      global.RAMAInterface.sincronizarDaConta(perfil.id, perfil.preferencias);
    }
    var doEndereco = String(location.hash || "").replace(/^#/, "");
    if (SECOES.some(function (s) { return s.chave === doEndereco; })) estado.secao = doEndereco;
    montar();
  });

  /* =================================================================
     A CASCA DA PÁGINA: cabeçalho, navegação e a área da seção
     ================================================================= */

  var cabecalho = null;
  function montar() {
    cabecalho = el("header.perfil-cab");
    pintarCabecalho();

    indicador = el("span.perfil-nav__indicador", { "aria-hidden": "true" });
    nav = el("div.perfil-nav", { role: "tablist", "aria-label": "Seções do perfil", "aria-orientation": "vertical" }, [indicador].concat(SECOES.map(function (s) {
      var b = el("button.perfil-nav__aba", {
        type: "button", role: "tab", id: "perfil-aba-" + s.chave,
        "aria-controls": "perfil-secao", "aria-selected": String(s.chave === estado.secao),
        tabindex: s.chave === estado.secao ? "0" : "-1",
        onclick: function () { irPara(s.chave, false); },
      }, [el("span.perfil-nav__icone", { "aria-hidden": "true" }, [UI.simbolo(s.icone)]), el("span.perfil-nav__rotulo", { texto: s.rotulo })]);
      abas[s.chave] = b;
      return b;
    })));
    nav.addEventListener("keydown", teclado);

    area = el("section.perfil-secao", { id: "perfil-secao", role: "tabpanel", tabindex: "-1" });

    U.trocar(painel, [
      el("h1.t-titulo.perfil-titulo", { texto: "Perfil" }),
      cabecalho,
      el("div.perfil", {}, [nav, area]),
    ]);
    desenharSecao(false);
    posicionarIndicador();
    global.addEventListener("resize", posicionarIndicador);
    /* A fonte pixel e a escala mudam o tamanho das abas depois da
       primeira medida: mede de novo quando elas mudam. */
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(posicionarIndicador);
    if (global.ResizeObserver) new global.ResizeObserver(function () { posicionarIndicador(); }).observe(nav);
    /* Mudar escala ou densidade muda o tamanho das abas. */
    if (global.RAMADensidade && global.RAMADensidade.aoMudar) global.RAMADensidade.aoMudar(function () { requestAnimationFrame(posicionarIndicador); });
  }

  function pintarCabecalho() {
    var codigo = U.codigoCurto(perfil.id || perfil.usuario || "rama");
    U.trocar(cabecalho, [
      avatarDe(perfil, "perfil-cab__avatar"),
      el("div.perfil-cab__textos", {}, [
        el("p.perfil-cab__nome", { texto: perfil.nome || perfil.usuario || "Agente" }),
        el("p.perfil-cab__usuario", { texto: "@" + (perfil.usuario || "") }),
        el("details.perfil-cab__detalhes", {}, [
          el("summary", { texto: "Detalhes da conta" }),
          el("dl.r-dados", {}, [
            el("dt", { texto: "Conta criada" }), el("dd", { texto: U.dataCurta(perfil.criadoEm) || "—" }),
            el("dt", { texto: "Código do agente" }), el("dd", { texto: "Agente // " + codigo }),
          ]),
        ]),
      ]),
    ]);
  }

  function avatarDe(p, tamanho) {
    var a = el("span.r-avatar." + tamanho, { "aria-hidden": "true" });
    if (p.avatar) a.appendChild(el("img", { src: p.avatar, alt: "" }));
    else a.textContent = U.iniciais(p.nome);
    return a;
  }

  /* O cabeçalho do site (nome e avatar no canto) acompanha a troca. */
  function atualizarIdentidadeNaTela() {
    pintarCabecalho();
    var nomeSite = U.$(".agente__nome");
    if (nomeSite) nomeSite.textContent = perfil.nome || "Agente";
    var avSite = U.$(".agente .r-avatar");
    if (avSite) avSite.replaceWith(avatarDe(perfil, "r-avatar--p"));
  }

  /* ------------------------------------------------------- navegação */
  function irPara(chave, focar) {
    if (chave === estado.secao) { if (focar) abas[chave].focus(); return; }
    estado.secao = chave;
    SECOES.forEach(function (s) {
      var ativa = s.chave === chave;
      abas[s.chave].setAttribute("aria-selected", String(ativa));
      abas[s.chave].tabIndex = ativa ? 0 : -1;
    });
    if (focar) abas[chave].focus();
    posicionarIndicador(true);
    if (history.replaceState) history.replaceState(null, "", "#" + chave);
    desenharSecao(true);
  }

  function teclado(ev) {
    var i = SECOES.map(function (s) { return s.chave; }).indexOf(estado.secao);
    var n = SECOES.length, alvo = null;
    if (ev.key === "ArrowDown" || ev.key === "ArrowRight") alvo = (i + 1) % n;
    else if (ev.key === "ArrowUp" || ev.key === "ArrowLeft") alvo = (i - 1 + n) % n;
    else if (ev.key === "Home") alvo = 0;
    else if (ev.key === "End") alvo = n - 1;
    if (alvo === null) return;
    ev.preventDefault();
    irPara(SECOES[alvo].chave, true);
  }

  /* O indicador mede a aba ativa: barra lateral no desktop, traço de
     baixo no celular (a lista vira horizontal pelo CSS). */
  function posicionarIndicador(animar) {
    var b = abas[estado.secao];
    if (!b || !indicador) return;
    /* Só a troca de seção anima; a primeira medida e os ajustes de
       tamanho posicionam na hora. */
    if (animar !== true) indicador.style.transition = "none";
    var lateral = getComputedStyle(nav).display !== "grid";
    nav.setAttribute("aria-orientation", lateral ? "vertical" : "horizontal");
    if (lateral) {
      indicador.style.transform = "translateY(" + b.offsetTop + "px)";
      indicador.style.height = b.offsetHeight + "px";
      indicador.style.width = "";
    } else {
      /* Grade compacta do celular: o traço corre embaixo da aba ativa. */
      indicador.style.transform = "translate(" + b.offsetLeft + "px, " + (b.offsetTop + b.offsetHeight - 3) + "px)";
      indicador.style.width = b.offsetWidth + "px";
      indicador.style.height = "";
    }
    if (animar !== true) { void indicador.offsetWidth; indicador.style.transition = ""; }
  }

  /* Troca o conteúdo segurando a altura de antes durante a entrada: a
     página não pula quando a seção nova é mais curta. */
  var soltarAltura = null;
  function desenharSecao(animar) {
    var s = SECOES.filter(function (x) { return x.chave === estado.secao; })[0];
    area.setAttribute("aria-labelledby", "perfil-aba-" + s.chave);
    if (animar) area.style.minHeight = area.offsetHeight + "px";
    U.trocar(area, [s.desenhar()]);
    if (!animar) return;
    area.classList.remove("perfil-secao--entrando");
    void area.offsetWidth;
    area.classList.add("perfil-secao--entrando");
    clearTimeout(soltarAltura);
    soltarAltura = setTimeout(function () { area.style.minHeight = ""; area.classList.remove("perfil-secao--entrando"); }, 220);
  }

  function bloco(titulo, conteudo, opcoes) {
    var o = opcoes || {};
    return el("section.perfil-bloco" + (o.classe ? "." + o.classe : ""), {}, [
      el("header.perfil-bloco__topo", {}, [
        el("h2.perfil-bloco__titulo", { texto: titulo }),
        o.etiqueta ? el("span.perfil-bloco__etiqueta", { texto: o.etiqueta }) : null,
      ]),
    ].concat(conteudo.filter(Boolean)));
  }

  /* Só o bloco que mudou anima (abrir o nome, abrir a prévia de um tema). */
  function animarBloco(no) {
    if (!no) return;
    no.classList.remove("perfil-anima");
    void no.offsetWidth;
    no.classList.add("perfil-anima");
  }

  /* =================================================================
     CONTA
     ================================================================= */

  function secaoConta() {
    return el("div.perfil-pilha", {}, [
      bloco("Identidade", [avatarDaConta(), nomeDaConta(),
        el("p.t-mini", { texto: "Para trocar a senha, use a função administrativa no editor do Apps Script. Senha nunca passa por esta tela." })]),
      bloco("Conexão e sessão", [conexao()], { classe: "perfil-bloco--sessao" }),
    ]);
  }

  /* ----- avatar: o editor de recorte (v2.27) envia só em "Usar imagem" */
  var areaAvatar = null;
  function avatarDaConta() {
    areaAvatar = el("div.perfil-avatar");
    pintarAvatar();
    return areaAvatar;
  }
  function pintarAvatar() {
    U.trocar(areaAvatar, [
      avatarDe(perfil, "r-avatar--g"),
      el("div.perfil-avatar__acoes", {}, [
        el("button.r-botao", { type: "button", texto: perfil.avatar ? "Trocar avatar" : "Adicionar avatar", onclick: trocarAvatar }),
        perfil.avatar ? el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Remover avatar", onclick: removerAvatar }) : null,
      ]),
    ]);
  }

  async function trocarAvatar() {
    var r = await global.RAMAEditorImagem.escolher("avatar", {
      contexto: "gravação do avatar",
      aoUsar: function (img) { return global.RAMAApi.salvarPerfil({ avatar: img.imagem }); },
    });
    if (!r.ok) return;
    perfil.avatar = r.imagem;
    UI.avisoOk("Avatar atualizado.");
    pintarAvatar();
    atualizarIdentidadeNaTela();
    focarNo(areaAvatar, "button");
  }

  async function removerAvatar(ev) {
    var botao = ev.currentTarget;
    var certeza = await UI.confirmar({ titulo: "Remover o avatar?", texto: "O cabeçalho volta a mostrar as suas iniciais.", rotuloConfirmar: "Remover" });
    if (!certeza) return;
    await UI.ocupar(botao, async function () {
      var r = await global.RAMAApi.salvarPerfil({ avatar: "" });
      if (!r.ok) { UI.avisoDeFalha(r, "gravação do avatar"); return; }
      perfil.avatar = "";
      UI.avisoOk("Avatar removido.");
      pintarAvatar();
      atualizarIdentidadeNaTela();
      focarNo(areaAvatar, "button");
    }, { rotulo: "Removendo…" });
  }

  function focarNo(caixa, seletor) { var x = caixa && caixa.querySelector(seletor); if (x) x.focus(); }

  /* ----- nome: o campo só abre ao editar, com Salvar e Cancelar. Falhou,
     o que foi digitado fica, e Salvar tenta de novo. */
  var areaNome = null, rascunhoNome = null;
  function nomeDaConta() {
    areaNome = el("div.perfil-nome");
    pintarNome(rascunhoNome !== null);
    return areaNome;
  }
  function pintarNome(editando) {
    if (!editando) {
      rascunhoNome = null;
      U.trocar(areaNome, [
        el("div.perfil-nome__leitura", {}, [
          el("span.perfil-nome__rotulo", { texto: "Nome de exibição" }),
          el("span.perfil-nome__valor", { texto: perfil.nome || "—" }),
        ]),
        el("button.r-botao.r-botao--fantasma", { type: "button", "aria-label": "Editar nome de exibição", onclick: function () { pintarNome(true); animarBloco(areaNome); focarNo(areaNome, "input"); } }, [UI.simbolo("lapis"), el("span", { texto: "Editar nome" })]),
      ]);
      return;
    }
    var campo = UI.campo({ rotulo: "Nome de exibição", valor: rascunhoNome !== null ? rascunhoNome : (perfil.nome || ""), limite: 60, ajuda: "É o que aparece no cabeçalho do sistema e nas campanhas." });
    campo.entrada.addEventListener("input", function () { rascunhoNome = campo.entrada.value; });
    var salvar = el("button.r-botao.r-botao--principal", { type: "button", texto: "Salvar" });
    var cancelar = el("button.r-botao.r-botao--fantasma", { type: "button", texto: "Cancelar" });
    async function gravar() {
      var valor = campo.entrada.value.trim();
      if (!valor) { campo.marcarErro("Informe um nome."); campo.entrada.focus(); return; }
      campo.marcarErro("");
      await UI.ocupar(salvar, async function () {
        var r = await global.RAMAApi.salvarPerfil({ nome: valor });
        if (!r.ok) {
          campo.marcarErro("Não foi possível salvar agora. O que você digitou continua aqui: tente de novo.");
          UI.avisoDeFalha(r, "gravação do perfil");
          return;
        }
        perfil.nome = valor;
        UI.avisoOk("Nome atualizado.");
        pintarNome(false);
        animarBloco(areaNome);
        atualizarIdentidadeNaTela();
        focarNo(areaNome, "button");
      }, { rotulo: "Salvando…" });
    }
    salvar.addEventListener("click", gravar);
    cancelar.addEventListener("click", function () { pintarNome(false); animarBloco(areaNome); focarNo(areaNome, "button"); });
    campo.entrada.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") { ev.preventDefault(); gravar(); }
      else if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); cancelar.click(); }
    });
    rascunhoNome = campo.entrada.value;
    U.trocar(areaNome, [el("div.perfil-nome__edicao", {}, [campo, el("div.faixa", {}, [salvar, cancelar])])]);
  }

  /* ----- conexão e sessão */
  var estadoConexao = null;
  function conexao() {
    estadoConexao = el("span.r-estado", { dataset: { estado: "salvo" }, texto: "Conectado" });
    return el("div.perfil-pilha.perfil-pilha--curta", {}, [
      el("dl.r-dados", {}, [
        el("dt", { texto: "Servidor" }), el("dd", { texto: resumoDoEndereco(), title: global.RAMARede.endereco() || "" }),
        el("dt", { texto: "Estado" }), el("dd", { role: "status", "aria-live": "polite" }, [estadoConexao]),
      ]),
      el("div.faixa", {}, [
        el("button.r-botao.r-botao--fantasma", { type: "button", texto: "Testar conexão", onclick: testar }),
        el("button.r-botao.r-botao--perigo", { type: "button", onclick: sair }, [UI.simbolo("sair"), el("span", { texto: "Encerrar sessão" })]),
      ]),
    ]);
  }

  /* O endereço do Apps Script não é segredo — ele viaja em toda
     requisição e está no config.js público. Mostrar só o começo evita
     uma linha enorme na tela sem fingir que é confidencial. */
  function resumoDoEndereco() {
    var url = global.RAMARede.endereco();
    if (!url) return "não configurado";
    return url.slice(0, 46) + (url.length > 46 ? "…" : "");
  }

  async function testar(ev) {
    await UI.ocupar(ev.currentTarget, async function () {
      estadoConexao.dataset.estado = "salvando";
      estadoConexao.textContent = "Falando com o servidor…";
      var inicio = Date.now();
      var r = await global.RAMAApi.ping();
      var levou = Date.now() - inicio;
      if (!r.ok) {
        estadoConexao.dataset.estado = "erro";
        estadoConexao.textContent = "Sem resposta";
        UI.avisoDeFalha(r, "teste de conexão");
        return;
      }
      estadoConexao.dataset.estado = "salvo";
      estadoConexao.textContent = "Conectado · respondeu em " + levou + " ms" + (r.dados && r.dados.planilha ? " · planilha " + r.dados.planilha : "");
    }, { rotulo: "Testando…" });
  }

  async function sair() {
    var certeza = await UI.confirmar({
      titulo: "Sair do R.A.M.A.?",
      texto: "A sessão deste aparelho será encerrada.",
      detalhe: "Seus personagens continuam guardados no arquivo.",
      rotuloConfirmar: "Sair",
    });
    if (certeza) global.RAMAAuth.sair();
  }

  /* =================================================================
     APARÊNCIA
     -----------------------------------------------------------------
     Da conta: o editor (Personalizar aparência) é o único lugar de
     tema, Legacy/Modern20 e efeito de tela antiga (v2.49.1). Aqui só se
     mostra o que está em uso.
     Neste aparelho: tamanho e densidade — o celular pode querer letra
     maior sem o computador mudar junto.
     ================================================================= */

  var areaEmUso = null;
  function secaoAparencia() {
    areaEmUso = el("dl.perfil-emuso", { "aria-live": "polite" });
    pintarEmUso();
    return el("div.perfil-pilha", {}, [
      bloco("Da conta", [
        el("p.t-mini", { texto: "Tema, estilo da interface e efeito de tela antiga ficam no editor de aparência e seguem você em qualquer aparelho." }),
        areaEmUso,
        el("div.faixa", {}, [el("button.r-botao.r-botao--principal", { type: "button", onclick: abrirTema }, [UI.simbolo("lapis"), el("span", { texto: "Personalizar aparência" })])]),
      ], { etiqueta: "conta" }),
      bloco("Neste aparelho", [tamanho(), densidade(),
        el("p.t-mini", { texto: "Valem só neste navegador. Outro aparelho guarda as próprias escolhas." })], { etiqueta: "aparelho" }),
    ]);
  }

  var NOMES_TEMA = { sistema: "Do aparelho", claro: "Claro", escuro: "Escuro", personalizado: "Personalizado" };
  function pintarEmUso() {
    if (!areaEmUso) return;
    var T = global.RAMATema, I = global.RAMAInterface;
    var pref = T ? T.preferencia() : "sistema";
    var pers = T && T.personalizado ? T.personalizado() : null;
    var temaTexto = NOMES_TEMA[pref] || pref;
    if (pref === "personalizado" && pers && pers.nome) temaTexto += ": " + pers.nome;
    if (pref === "sistema" && T && T.efetivo) temaTexto += " (agora " + (T.efetivo() === "escuro" ? "escuro" : "claro") + ")";
    var estilo = I ? (I.NOMES[I.estilo()] || I.estilo()) : "Legacy";
    var efeito = global.RAMAApp.preferencias().efeitos;
    U.trocar(areaEmUso, [
      el("div", {}, [el("dt", { texto: "Tema" }), el("dd", { texto: temaTexto })]),
      el("div", {}, [el("dt", { texto: "Estilo" }), el("dd", { texto: estilo })]),
      estilo === "Legacy" ? el("div", {}, [el("dt", { texto: "Tela antiga" }), el("dd", { texto: efeito ? "ligada" : "desligada" })]) : null,
    ]);
  }
  if (global.RAMATema && global.RAMATema.aoMudar) global.RAMATema.aoMudar(function () { pintarEmUso(); });
  if (global.RAMAInterface && global.RAMAInterface.aoMudar) global.RAMAInterface.aoMudar(function () { pintarEmUso(); });

  /* O tema da conta guardado nas preferências (v2.36). */
  function temaAtivoDe(prefs) {
    var p = prefs || {};
    var lista = global.RAMATemaModelo ? global.RAMATemaModelo.normalizarTemas(p.temas) : [];
    for (var i = 0; i < lista.length; i++) if (lista[i].id === p.temaAtivo) return lista[i];
    return null;
  }

  function abrirTema() {
    if (!global.RAMATemaEditor) { UI.avisoAtencao("O editor de temas não carregou. Recarregue a página."); return; }
    var prefs = Object.assign({}, perfil.preferencias || {});
    /* O que está na tela agora vale. */
    prefs.tema = global.RAMATema.preferencia();
    global.RAMATemaEditor.abrir({
      contexto: "conta",
      preferencias: prefs,
      aoSalvar: function (gravadas) { perfil.preferencias = gravadas || perfil.preferencias; pintarEmUso(); },
    });
  }

  /* Tamanho (a escala existe porque a PixelMplus foi desenhada em grade
     de 12 px: nítida em 100%, um pouco macia acima). Muda só o grupo. */
  function grupoDeOpcoes(rotulo, opcoes, atual, aoEscolher, ajuda) {
    var leitura = el("span.perfil-opcoes__atual", { "aria-live": "polite" });
    var botoes = opcoes.map(function (o) {
      return el("button.filtro.perfil-opcao", { type: "button", "aria-pressed": "false", texto: o.rotulo, onclick: function () { aoEscolher(o.valor); marcar(); } });
    });
    function marcar() {
      var v = atual();
      botoes.forEach(function (b, i) { b.setAttribute("aria-pressed", String(opcoes[i].valor === v || (typeof v === "number" && Math.abs(opcoes[i].valor - v) < 0.01))); });
      var o = opcoes.filter(function (x) { return x.valor === v || (typeof v === "number" && Math.abs(x.valor - v) < 0.01); })[0];
      leitura.textContent = "Em uso: " + (o ? o.rotulo : String(v));
      requestAnimationFrame(posicionarIndicador);
    }
    marcar();
    return el("div.r-campo.perfil-opcoes", {}, [
      el("div.perfil-opcoes__topo", {}, [el("span.r-rotulo", { texto: rotulo }), leitura]),
      el("div.filtros__grupo", { role: "group", "aria-label": rotulo }, botoes),
      el("p.r-ajuda", { texto: ajuda }),
    ]);
  }

  function tamanho() {
    return grupoDeOpcoes("Tamanho da interface", [1, 1.25, 1.5, 1.75].map(function (v) { return { valor: v, rotulo: Math.round(v * 100) + "%" }; }),
      function () { return global.RAMAApp.preferencias().escala; },
      function (v) { global.RAMAApp.definirEscala(v); },
      "Aumenta letras e controles da interface inteira. No estilo Legacy, a fonte pixel é mais nítida em 100%; acima disso ela cresce e fica levemente macia.");
  }

  /* Densidade (v5.2): quanto espaço sobra entre as coisas, aplicada na
     hora, sem redesenhar a página. */
  function densidade() {
    var D = global.RAMADensidade;
    if (!D) return null;
    return grupoDeOpcoes("Densidade", D.DENSIDADES.map(function (k) { return { valor: k, rotulo: D.NOMES[k] }; }),
      function () { return D.atual(); },
      function (v) { D.definir(v); },
      "Confortável é a apresentação de sempre. Compacta aproxima painéis, listas e seções, sem diminuir as letras nem esconder nada; no celular, os botões continuam fáceis de tocar.");
  }

  /* =================================================================
     TEMAS DE DADOS (v2.40) — desbloqueados por código
     -----------------------------------------------------------------
     A coleção é da CONTA e vem do servidor: só o resgate concede. Aqui
     se resgata e se vê; quem escolhe o tema de cada personagem é o
     editor de tema da ficha.
     ================================================================= */

  var colecao = { lista: null, erro: false, carregando: false, destacar: [] , aberto: null };

  function TD() { return global.RAMATemasDados || null; }
  function AR() { return global.RAMAAparenciaRolagem || null; }

  function carregarColecao() {
    if (colecao.carregando) return;
    colecao.carregando = true;
    colecao.erro = false;
    pintarColecao();
    global.RAMAApi.listarDesbloqueios({ segundoPlano: true }).then(function (r) {
      colecao.carregando = false;
      colecao.erro = !(r && r.ok);
      colecao.lista = r && r.ok ? ((r.dados || {}).temasDados || []) : null;
      pintarColecao();
    }, function () { colecao.carregando = false; colecao.erro = true; pintarColecao(); });
  }

  var areaColecao = null;
  function secaoDados() {
    areaColecao = el("div.perfil-colecao", { "aria-live": "polite" });
    pintarColecao();
    if (colecao.lista === null && !colecao.carregando && !colecao.erro) carregarColecao();
    return el("div.perfil-pilha", {}, [
      el("div.perfil-destaque", {}, [
        el("div.perfil-destaque__textos", {}, [
          el("h2.perfil-bloco__titulo", { texto: "Temas de dados" }),
          el("p.t-mini", { texto: "O desbloqueio vale para a conta inteira; o tema é escolhido em cada ficha, no editor de tema dela." }),
        ]),
        el("button.r-botao.r-botao--principal", { type: "button", onclick: resgatar }, [UI.simbolo("mais"), el("span", { texto: "Resgatar código" })]),
      ]),
      bloco("Coleção", [areaColecao]),
    ]);
  }

  function pintarColecao() {
    if (!areaColecao) return;
    var corpo;
    if (colecao.carregando && colecao.lista === null) {
      corpo = [el("ul.perfil-temas.perfil-temas--carregando", { "aria-busy": "true", "aria-label": "Consultando a sua coleção" }, [0, 1, 2].map(function () { return el("li.perfil-tema.perfil-tema--fantasma", { "aria-hidden": "true" }); })),
        el("p.t-mini", { texto: "Consultando a sua coleção…" })];
    } else if (colecao.erro && colecao.lista === null) {
      corpo = [el("div.perfil-falha", { role: "alert" }, [
        el("p", { texto: "Não foi possível consultar a sua coleção agora." }),
        el("button.r-botao", { type: "button", texto: "Tentar novamente", onclick: carregarColecao }),
      ])];
    } else if (!colecao.lista || !colecao.lista.length) {
      corpo = [el("div.perfil-vazio", {}, [
        el("span.perfil-vazio__icone", { "aria-hidden": "true" }, [UI.simbolo("dado")]),
        el("p", { texto: "Nenhum tema de dados desbloqueado ainda." }),
        el("p.t-mini", { texto: "O dado padrão acompanha o tema de cada ficha e está sempre disponível. Tem um código? Use Resgatar código." }),
      ])];
    } else {
      corpo = [el("ul.perfil-temas", {}, colecao.lista.map(itemDoTema))];
    }
    U.trocar(areaColecao, corpo);
    colecao.destacar = [];
  }

  function itemDoTema(d) {
    var t = TD() ? TD().tema(d.id) : null;
    var ap = t ? { v: 1, tema: TD().atual(d.id) } : null;
    var aberto = colecao.aberto === d.id;
    var detalhe = el("div.perfil-tema__detalhe", { id: "perfil-tema-" + d.id, hidden: !aberto });
    if (aberto) preencherDetalhe(detalhe, d, t, ap);
    var botao = el("button.perfil-tema__cabeca", {
      type: "button", "aria-expanded": String(aberto), "aria-controls": "perfil-tema-" + d.id,
      onclick: function () {
        var abrir = botao.getAttribute("aria-expanded") !== "true";
        /* Um aberto por vez, sem redesenhar a lista. */
        Array.prototype.forEach.call(areaColecao.querySelectorAll(".perfil-tema__cabeca[aria-expanded=\"true\"]"), function (b) {
          if (b === botao) return;
          b.setAttribute("aria-expanded", "false");
          var dd = document.getElementById(b.getAttribute("aria-controls")); if (dd) dd.hidden = true;
        });
        botao.setAttribute("aria-expanded", String(abrir));
        colecao.aberto = abrir ? d.id : null;
        if (abrir) { preencherDetalhe(detalhe, d, t, ap); detalhe.hidden = false; animarBloco(detalhe); }
        else detalhe.hidden = true;
      },
    }, [
      el("span.perfil-tema__miniatura", { "aria-hidden": "true" }, [AR() ? AR().icone(ap, "linha") : null]),
      el("span.perfil-tema__nome", { texto: t ? t.nome : d.id }),
      el("span.perfil-tema__seta", { "aria-hidden": "true", texto: "▸" }),
    ]);
    var li = el("li.perfil-tema" + (colecao.destacar.indexOf(d.id) >= 0 ? ".perfil-tema--novo" : ""), {}, [botao, detalhe]);
    if (colecao.destacar.indexOf(d.id) >= 0) li.addEventListener("animationend", function () { li.classList.remove("perfil-tema--novo"); }, { once: true });
    return li;
  }

  function preencherDetalhe(caixa, d, t, ap) {
    if (caixa.childNodes.length) return;
    U.trocar(caixa, [
      el("p.t-mini", { texto: t ? t.descricao : "Tema que este site ainda não conhece — continua na sua conta." }),
      t ? previaDaRecompensa(d.id) : null,
    ]);
  }

  /* Um exemplo de notificação para a prévia (nada é rolado). */
  var EXEMPLO = { tipo: "pericia", expressao: "3d20+5", rolagens: [20, 13, 12], natural: 20, total: 25,
    parcelas: [{ rotulo: "Dado (AGI)", valor: 20 }, { rotulo: "Treinado", valor: 5 }] };

  function previaDaRecompensa(id) {
    var t = TD() ? TD().tema(id) : null;
    var ap = t ? { v: 1, tema: TD().atual(id) } : null;
    var cartao = global.RAMARolagens && global.RAMARolagens.cartao
      ? global.RAMARolagens.cartao(EXEMPLO, { nome: "Acrobacia" }, ap) : null;
    return el("div.recompensa-previa", { "aria-hidden": "true", inert: "" }, [
      AR() ? AR().icone(ap, "previa") : null,
      cartao,
    ]);
  }

  function resgatar() {
    var campo = UI.campo({ rotulo: "Código", limite: 60, autocomplete: "off",
      ajuda: "Espaços, hífens e maiúsculas não importam." });
    campo.entrada.setAttribute("spellcheck", "false");
    campo.entrada.setAttribute("autocapitalize", "characters");
    var saida = el("div.pilha--curta", { class: "pilha", role: "status", "aria-live": "polite" });
    var erro = el("p.r-ajuda.t-erro", { role: "alert", hidden: true });
    /* A mesma intenção leva a mesma operação: tentar de novo depois de
       uma falha de rede reconhece a concessão já feita no servidor. */
    var intencao = { codigo: "", operacao: "" };
    var concluido = false;

    function mostrarErro(texto) { erro.textContent = texto; erro.hidden = false; }

    function confirmar() {
      if (concluido) return null;
      var bruto = campo.entrada.value;
      var normal = TD() ? TD().normalizarCodigo(bruto) : String(bruto || "").trim();
      erro.hidden = true;
      U.limpar(saida);
      if (!normal) { campo.marcarErro("Use de 4 a 40 letras e números."); campo.entrada.focus(); return null; }
      campo.marcarErro("");
      if (intencao.codigo !== normal) intencao = { codigo: normal, operacao: global.RAMAApi.novaOperacao() };
      return global.RAMAApi.resgatarCodigo(normal, intencao.operacao).then(function (r) {
        if (r && r.ok) {
          concluido = true;
          var rec = ((r.dados || {}).recompensas || []);
          colecao.lista = (r.dados || {}).desbloqueios || colecao.lista;
          colecao.erro = false;
          /* A coleção atualiza já; o tema novo pulsa uma vez quando a
             janela fecha, à vista (não atrás dela). */
          pendenteDestaque = rec.filter(function (x) { return x.novo !== false; }).map(function (x) { return x.id; });
          pintarColecao();
          U.trocar(saida, [
            el("p.t-forte", { texto: rec.length === 1 ? "Desbloqueado: " + rec[0].nome + "." : "Desbloqueados: " + rec.map(function (x) { return x.nome; }).join(", ") + "." }),
            rec.some(function (x) { return !x.novo; }) ? el("p.t-mini", { texto: "O que você já tinha continua igual — a coleção não duplica." }) : null,
          ].concat(rec.slice(0, 2).map(function (x) { return previaDaRecompensa(x.id); }), [
            el("p.t-mini", { texto: "Para usar, abra uma ficha, toque no lápis de “Personalizar tema desta ficha” e escolha em “Tema dos dados”." }),
          ]));
          var botao = m.janela.querySelector(".r-modal__rodape .r-botao--principal");
          if (botao) botao.hidden = true;
          return;
        }
        var codigo = r && r.erro;
        if (codigo === "ja_resgatado") {
          var ja = ((r.dados || {}).recompensas || []);
          mostrarErro("Este código já foi usado nesta conta" + (ja.length ? " — " + ja.map(function (x) { return x.nome; }).join(", ") + " já está na sua coleção." : "."));
          return;
        }
        if (codigo === "codigo_invalido") { mostrarErro("Código não reconhecido. Confira e tente de novo."); return; }
        if (codigo === "codigo_desativado") { mostrarErro("Este código não aceita mais resgates."); return; }
        if (codigo === "muitas_tentativas") { mostrarErro("Muitas tentativas erradas. Espere alguns minutos antes de tentar de novo."); return; }
        var f = global.RAMAApi.frase ? global.RAMAApi.frase(r || {}) : null;
        mostrarErro((f ? f.titulo + " — " + f.texto : "Não foi possível falar com o servidor.") + " Tentar de novo usa o mesmo pedido: nada é concedido duas vezes.");
      }, function () {
        mostrarErro("Falha de conexão. Tentar de novo usa o mesmo pedido: nada é concedido duas vezes.");
      });
    }

    campo.entrada.addEventListener("keydown", function (ev) {
      if (ev.key !== "Enter") return;
      ev.preventDefault();
      var botao = m.janela.querySelector(".r-modal__rodape .r-botao--principal");
      if (botao && !botao.hidden && botao.getAttribute("aria-busy") !== "true") botao.click();
    });

    var pendenteDestaque = [];
    var m = UI.modal({
      titulo: "Resgatar código",
      aoFechar: function () {
        if (!pendenteDestaque.length) return;
        colecao.destacar = pendenteDestaque;
        pintarColecao();
        var novo = areaColecao && areaColecao.querySelector(".perfil-tema--novo");
        if (novo && novo.scrollIntoView) novo.scrollIntoView({ block: "nearest" });
      },
      conteudo: [el("div.pilha--curta", { class: "pilha" }, [
        el("p.t-mini", { texto: "Códigos liberam temas de dados para a sua conta. Cada código vale uma vez por conta." }),
        campo, erro, saida,
      ])],
      botoes: [
        { rotulo: "Fechar", classe: "r-botao--fantasma" },
        { rotulo: "Resgatar", rotuloOcupado: "Resgatando…", classe: "r-botao--principal", aoClicar: function () { return confirmar(); } },
      ],
    });
  }

  /* =================================================================
     IMPORTAÇÕES
     -----------------------------------------------------------------
     Os fluxos existentes, intactos (a revisão do CRIS inclusive). Abrem
     em janela: fechar devolve a esta seção, sem redesenhar a página.
     ================================================================= */

  function secaoImportar() {
    function cartao(titulo, linha, tipo, icone, acao) {
      return el("li.perfil-import", {}, [
        el("span.perfil-import__icone", { "aria-hidden": "true" }, [UI.simbolo(icone)]),
        el("div.perfil-import__textos", {}, [
          el("h3.perfil-import__titulo", { texto: titulo }),
          el("p.t-mini", { texto: linha }),
          el("span.perfil-import__tipo", { texto: tipo }),
        ]),
        el("button.r-botao", { type: "button", texto: "Importar", "aria-label": titulo, onclick: acao }),
      ]);
    }
    return el("div.perfil-pilha", {}, [
      bloco("Importações", [
        el("p.t-mini", { texto: "Nada é gravado antes de você conferir a prévia. O que entra é sempre novo, sob a sua conta: nenhuma ficha existente é sobrescrita." }),
        el("ul.perfil-imports", {}, [
          cartao("Importar ficha do RAMA", "Uma ficha exportada por este ou outro R.A.M.A. vira um personagem novo seu.", "Recebe arquivo .json", "perfil", importarFicha),
          cartao("Importar item para o Homebrew", "Um item exportado entra na sua biblioteca do Homebrew.", "Recebe arquivo .json", "pasta", importarItem),
          cartao("Importar ficha do CRIS", "Cole o link público de uma ficha do CRIS e revise seção por seção antes de criar.", "Usa link público", "baixar", importarDoCris),
        ]),
      ]),
    ]);
  }

  function importarFicha() {
    global.RAMAImportar.abrir({
      tipo: "personagem",
      aoConfirmar: async function (ficha) {
        var r = await global.RAMAApi.criarPersonagem(ficha);
        if (!r.ok) { UI.avisoDeFalha(r, "importação de ficha"); return false; }
        /* O desbloqueio é da conta: um tema de dados que esta conta não
           tem fica de fora, e a ficha usa o dado padrão. */
        if ((r.avisos || []).indexOf("tema_dados_indisponivel") >= 0) {
          UI.avisoAtencao("O tema de dados desta ficha não está desbloqueado nesta conta: ela usa o dado padrão. As cores do tema da ficha continuam.", { duracao: 9000 });
        }

        UI.avisoOk(ficha.nome + " foi importado.", {
          acao: {
            rotulo: "Abrir ficha",
            aoClicar: function () { location.href = U.url("ficha/?id=" + encodeURIComponent(r.dados.id)); },
          },
        });
        return true;
      },
    });
  }

  /* Ficha pública do CRIS por link (v2.34). A janela consulta, converte,
     mostra a revisão e só cria no clique de "Criar ficha". */
  function importarDoCris() {
    if (!global.RAMAImportarCrisTela || !global.RAMAImportarCris) {
      UI.avisoAtencao("O importador do CRIS não carregou. Recarregue a página.");
      return;
    }
    global.RAMAImportarCrisTela.abrir({});
  }

  function importarItem() {
    global.RAMAImportar.abrir({
      tipo: "homebrew-item",
      aoConfirmar: async function (item) {
        var r = await global.RAMAApi.salvarHomebrew(item);
        if (!r.ok) { UI.avisoDeFalha(r, "importação de item"); return false; }

        UI.avisoOk(item.nome + " entrou na biblioteca.", {
          acao: { rotulo: "Ver Homebrew", aoClicar: function () { location.href = U.url("homebrew/"); } },
        });
        return true;
      },
    });
  }
})(window);
