/* =====================================================================
   R.A.M.A. — Personagens
   ---------------------------------------------------------------------
   A lista de quem existe no arquivo desta conta, com pastas, busca,
   filtro e agrupamento por sistema, criação e as ações de cada registro.

   Duas decisões de desenho que vieram das referências mas mudaram:

   · O X permanente em cada linha virou um menu [ ... ]. Um botão de
     apagar do tamanho de um dedo, ao lado do nome, na tela em que se
     abre a ficha com pressa no meio de uma sessão, é um acidente
     esperando acontecer. Abrir, mover, duplicar e excluir moram no
     menu, e excluir ainda pede confirmação.

   · A lista carrega só o cabeçalho de cada personagem. A ficha inteira
     vem quando ela for aberta. Trinta fichas completas para desenhar
     trinta nomes seria megabytes por tela. O sistema e a pasta (v2.26)
     vêm junto, do índice leve do servidor.

   PASTAS E SISTEMAS (v2.26)
   ---------------------------------------------------------------------
   Duas organizações independentes. A pasta escolhe a SELEÇÃO (Todos,
   Sem pasta ou uma pasta); busca e sistema filtram dentro dela; agrupar
   só arruma o resultado. A conta disso mora em
   js/personagens-organizacao.js, e os nomes dos sistemas em
   js/sistemas.js — esta tela não testa "ordem" nem "universal".

   Mover é do servidor: o cartão fica "Movendo…" até a resposta, e só
   então muda de lugar. Uma operação por personagem e por pasta de cada
   vez. Arrastar sai da alça (⠿), que fica fora do link do cartão; tocar
   na alça, ou "Mover para pasta…" no menu, abre a escolha por lista —
   o caminho do teclado e do celular.

   EXIBIÇÃO: ABAS OU ÍCONES (v2.35)
   ---------------------------------------------------------------------
   Preferência da conta (preferencias.js, `exibicaoPastas`), não estado
   de navegação: pasta aberta, busca, sistema e agrupamento continuam no
   endereço, e trocar a exibição não mexe neles.

   · Abas: a faixa de pastas e a lista da seleção, como sempre.
   · Ícones: uma grade de pastas compactas, como as de aplicativos no
     celular. Tocar num ícone escolhe a pasta e a abre num painel por
     cima (UI.modal), com os personagens da seleção que passam pela
     busca e pelo sistema. Quem não está em pasta continua na página, em
     lista, um embaixo do outro — como os aplicativos soltos da tela do
     celular —, sob o título "Sem pasta", que também recebe arraste para
     retirar da pasta. Com "Agrupar por sistema", os grupos da seleção
     viram ícones (só prévia), e abrem só os daquele sistema.

   As duas usam a MESMA conta (personagens-organizacao.js): a pasta
   aberta, os filtros, as contagens e os grupos saem de O.montar, e a
   lista dentro do painel é a mesma função `resultado` das abas. A
   página não desenha a lista atrás do painel — o personagem existe em
   um lugar interativo de cada vez.

   Arrastar de dentro do painel: o painel sai da frente enquanto o
   gesto dura (aoIniciar/aoTerminar de arrastar.js) e os ícones das
   pastas pessoais recebem o personagem. Grupos de sistema não são
   destino: o sistema de uma ficha não muda por arraste.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var el = U.el;
  var O = global.RAMAOrganizacaoPersonagens;

  var registros = [];
  var pastas = [];
  /* suportada: o servidor manda a organização (v2.26).
     disponivel: as abas existem na planilha (setupRama rodou). */
  var organizacao = { suportada: false, disponivel: false };
  var estado = { pasta: O.TODOS, busca: "", sistema: "", agrupar: false };
  var ocupados = {};
  var painel = null;
  var arrasteLigado = false;
  /* A pasta aberta no modo Ícones: { tipo: "pasta"|"sistema", chave,
     modal, corpo, acoes, resumo, foco } ou null. */
  var expansao = null;
  var avisouPreferenciaLocal = false;
  var MAX_PREVIA = 4;
  /* A exibição do último desenho, e se a lista já chegou: a sessão pode
     confirmar a preferência antes da listagem, e redesenhar sem dados
     mostraria "nenhum personagem" por engano. */
  var exibicaoDesenhada = null;
  var carregado = false;
  /* Sem preferencias.js (página que não o carrega), a escolha vale só
     nesta tela. */
  var exibicaoLocal = "abas";

  global.RAMAApp.iniciar("personagens", async function () {
    painel = U.$("#painel-personagens");
    lerEstadoDaUrl();
    ouvirPreferencias();
    await carregar();

    /* A Home manda para cá com ?novo=1 quando o arquivo está vazio. */
    if (U.parametro("novo")) abrirEscolhaDeTipo();
  });

  /* A pasta aberta, o filtro e o agrupamento ficam no endereço: recarregar
     volta ao mesmo lugar. */
  function lerEstadoDaUrl() {
    estado.pasta = U.parametro("pasta") || O.TODOS;
    estado.sistema = U.parametro("sistema") || "";
    estado.agrupar = U.parametro("agrupar") === "1";
  }

  function gravarEstadoNaUrl() {
    if (!global.history || !global.history.replaceState) return;
    try {
      var p = new URLSearchParams(location.search);
      if (estado.pasta && estado.pasta !== O.TODOS) p.set("pasta", estado.pasta); else p.delete("pasta");
      if (estado.sistema) p.set("sistema", estado.sistema); else p.delete("sistema");
      if (estado.agrupar) p.set("agrupar", "1"); else p.delete("agrupar");
      var q = p.toString();
      global.history.replaceState(null, "", location.pathname + (q ? "?" + q : "") + location.hash);
    } catch (e) { /* sem histórico: só não lembra */ }
  }

  async function carregar() {
    U.trocar(painel, [cabecalho(), UI.carregando("Consultando arquivo")]);

    var r = await global.RAMAApi.listarPersonagens();
    if (!r.ok) {
      U.trocar(painel, [cabecalho(), UI.erroDeTela(r, carregar)]);
      return;
    }

    registros = r.dados || [];
    carregado = true;
    var org = r.organizacao;
    organizacao = { suportada: !!org, disponivel: !!(org && org.disponivel) };
    pastas = (org && Array.isArray(org.pastas)) ? org.pastas.slice() : [];
    ordenarPastas();
    ligarArraste();
    desenhar();
  }

  function ordenarPastas() {
    pastas.sort(function (a, b) { return String(a.nome).localeCompare(String(b.nome), "pt-BR", { sensitivity: "base" }); });
  }

  function pastaPorId(id) {
    for (var i = 0; i < pastas.length; i++) if (pastas[i].id === id) return pastas[i];
    return null;
  }

  function registroPorId(id) {
    for (var i = 0; i < registros.length; i++) if (registros[i].id === id) return registros[i];
    return null;
  }

  function nomeDoLugar(pastaId) {
    if (!pastaId) return "Sem pasta";
    var p = pastaPorId(pastaId);
    return p ? p.nome : "pasta";
  }

  function cabecalho() {
    return global.RAMAApp.titulo({
      titulo: "Personagens",
      trilha: ["Arquivo // " + registros.length + " registro(s)"],
      acoes: [
        el("button.r-botao.r-botao--principal", {
          type: "button", texto: "+ Adicionar personagem", onclick: abrirEscolhaDeTipo,
        }),
      ],
    });
  }

  /* =================================================================
     DESENHO
     ================================================================= */

  function desenhar() {
    /* O foco volta ao mesmo controle depois de redesenhar: digitar na
       busca, trocar o sistema ou abrir uma pasta não perde o lugar. */
    var ativo = document.activeElement;
    var foco = ativo && painel.contains(ativo) && ativo.dataset ? ativo.dataset.foco : "";
    var cursor = null;
    try { cursor = foco && ativo.selectionStart !== undefined ? ativo.selectionStart : null; } catch (e) { cursor = null; }

    var m = O.montar(registros, organizacao.disponivel ? pastas : [], estado);
    if (m.pasta !== estado.pasta) { estado.pasta = m.pasta; }
    gravarEstadoNaUrl();

    var icones = modoIcones();
    exibicaoDesenhada = exibicao();
    U.trocar(painel, [
      cabecalho(),
      !icones && (registros.length || pastas.length) ? barraDePastas(m) : null,
      icones ? gradeDePastas(m) : null,
      avisoDeOrganizacao(),
      !icones && m.pasta !== O.TODOS && m.pasta !== O.SEM_PASTA ? pastaAberta(m) : null,
      registros.length || (organizacao.suportada && pastas.length) ? filtros(m) : null,
      el("div.lista-personagens", { "aria-live": "polite" }, [icones ? resultadoEmIcones(m) : resultado(m)]),
    ]);

    if (foco) {
      var novo = painel.querySelector('[data-foco="' + foco + '"]');
      if (novo) {
        novo.focus();
        if (cursor !== null) { try { novo.setSelectionRange(cursor, cursor); } catch (e) { /* não é texto */ } }
      }
    }
    atualizarExpansao();
  }

  function avisoDeOrganizacao() {
    if (!registros.length) return null;
    if (!organizacao.suportada) {
      return el("p.t-mini.aviso-organizacao", {
        texto: "Pastas e separação por sistema dependem da atualização do servidor (Apps Script) para a v2.26. A lista continua completa.",
      });
    }
    if (!organizacao.disponivel) {
      return el("p.t-mini.aviso-organizacao", {
        texto: "As pastas ainda não estão disponíveis: falta preparar a planilha (setupRama no Apps Script). A lista continua completa.",
      });
    }
    return null;
  }

  /* As pastas: Todos, Sem pasta e as da conta. Sem pasta e as pastas são
     também destinos de arraste (data-arrastar-pasta). */
  function barraDePastas(m) {
    if (!organizacao.disponivel) return null;
    var c = m.contagens;

    function botao(id, nome, n, alvo) {
      var ocupada = !!ocupados["pasta:" + id];
      return el("button.pasta", {
        type: "button",
        "aria-pressed": String(m.pasta === id),
        "aria-label": nome + ", " + n + " personagem(ns)" + (ocupada ? ", ocupada" : ""),
        dataset: Object.assign({ foco: "pasta-" + id, pasta: id }, alvo ? { arrastarPasta: id } : {}),
        class: ocupada ? "pasta--ocupada" : "",
        onclick: function () { abrirPasta(id); },
      }, [
        el("span.pasta__nome", { texto: nome }),
        el("span.pasta__n", { texto: String(n) }),
      ]);
    }

    return el("nav.pastas", { "aria-label": "Pastas" }, [
      el("div.pastas__lista", {}, [
        botao(O.TODOS, "Todos os personagens", c.todos, false),
        botao(O.SEM_PASTA, "Sem pasta", c.semPasta, true),
      ].concat(pastas.map(function (p) {
        return botao(p.id, p.nome, c.porPasta[p.id] || 0, true);
      })).concat([
        el("button.pasta.pasta--nova", {
          type: "button", texto: "+ Nova pasta", dataset: { foco: "nova-pasta" },
          onclick: function () { novaPasta(); },
        }),
      ])),
      registros.length && pastas.length
        ? el("p.t-mini.pastas__dica", { texto: "Para mover: arraste o personagem pela alça (⠿) até uma pasta, ou use “Mover para pasta…” no menu dele." })
        : null,
    ]);
  }

  function abrirPasta(id) {
    estado.pasta = id;
    desenhar();
  }

  /* O cabeçalho da pasta aberta: nome, quantos e as ações dela. */
  function pastaAberta(m) {
    var p = pastaPorId(m.pasta);
    if (!p) return null;
    var ocupada = !!ocupados["pasta:" + p.id];
    return el("div.pasta-aberta", {}, [
      el("div.pasta-aberta__titulo", {}, [
        el("span.r-rotulo", { texto: "Pasta" }),
        el("h2.t-secao", { texto: p.nome }),
        el("span.t-mini", { texto: (m.contagens.porPasta[p.id] || 0) + " personagem(ns)" }),
      ]),
      el("div.faixa", {}, [
        el("button.r-botao.r-botao--mini", {
          type: "button", texto: "Renomear", disabled: ocupada, dataset: { foco: "renomear-pasta" },
          onclick: function () { renomearPasta(p); },
        }),
        el("button.r-botao.r-botao--mini.r-botao--perigo", {
          type: "button", texto: ocupada ? "Excluindo…" : "Excluir pasta", disabled: ocupada, dataset: { foco: "excluir-pasta" },
          onclick: function () { excluirPasta(p); },
        }),
      ]),
    ]);
  }

  function filtros(m) {
    var temSistema = organizacao.suportada && registros.length;
    return el("div.filtros.filtros--personagens", {}, [
      !registros.length ? null : el("div.r-busca", {}, [
        el("span.r-busca__marca", {}, [UI.simbolo("busca")]),
        el("input.r-entrada", {
          type: "search",
          value: estado.busca,
          placeholder: "Buscar por nome, campanha, classe ou origem",
          "aria-label": "Buscar personagem",
          dataset: { foco: "busca" },
          oninput: function (ev) { estado.busca = ev.target.value; desenhar(); },
        }),
      ]),
      temSistema ? el("label.filtro-sistema", {}, [
        el("span.r-rotulo", { texto: "Sistema" }),
        el("select.r-selecao", {
          "aria-label": "Filtrar por sistema",
          dataset: { foco: "sistema" },
          onchange: function (ev) { estado.sistema = ev.target.value; desenhar(); },
        }, [el("option", { value: "", texto: "Todos", selected: !estado.sistema })].concat(
          opcoesDeSistema(m).map(function (o) {
            return el("option", { value: o.sistema.id, texto: o.sistema.nome + " (" + o.n + ")", selected: estado.sistema === o.sistema.id });
          })
        )),
      ]) : null,
      temSistema ? el("label.r-marca", {}, [
        el("input", {
          type: "checkbox", checked: estado.agrupar, dataset: { foco: "agrupar" },
          onchange: function (ev) { estado.agrupar = ev.target.checked; desenhar(); },
        }),
        el("span", { texto: "Agrupar por sistema" }),
      ]) : null,
      organizacao.suportada ? controleDeExibicao() : null,
    ]);
  }

  /* As opções do filtro: os sistemas conhecidos sempre, e qualquer outro
     presente na seleção — inclusive o escolhido, se ele não estiver mais
     nela (para o filtro não sumir do controle). */
  function opcoesDeSistema(m) {
    var lista = m.sistemas.slice();
    if (estado.sistema && !lista.some(function (o) { return o.sistema.id === estado.sistema; })) {
      lista.push({ sistema: estado.sistema === "?" ? O.sistemaDe({ sistema: null }) : global.RAMASistemas.de(estado.sistema), n: 0 });
    }
    return lista;
  }

  function limparFiltros() {
    estado.busca = "";
    estado.sistema = "";
    desenhar();
  }

  /* `verTodos` (opcional): o que "Ver todos os personagens" faz — nas
     abas, abre a pasta Todos; no painel dos ícones, troca o painel. */
  function resultado(m, verTodos) {
    var irParaTodos = verTodos || function () { abrirPasta(O.TODOS); };
    if (m.vazio === "nenhum") return nenhumRegistro();
    if (m.vazio === "pasta") {
      return UI.vazio({
        titulo: "Pasta vazia",
        texto: "Nenhum personagem nesta pasta ainda. " + (modoIcones()
          ? "Arraste um personagem pela alça (⠿) até o ícone dela, ou use “Mover para pasta…” no menu dele."
          : "Arraste um personagem até ela ou use “Mover para pasta…” no menu dele."),
        acao: { rotulo: "Ver todos os personagens", aoClicar: irParaTodos },
      });
    }
    if (m.vazio === "sem-pasta") {
      return UI.vazio({
        titulo: "Todos estão em pastas",
        texto: "Nenhum personagem fora de pasta.",
        acao: { rotulo: "Ver todos os personagens", aoClicar: irParaTodos },
      });
    }
    if (m.vazio === "filtros") {
      var partes = [];
      if (String(estado.busca).trim()) partes.push("à busca “" + estado.busca.trim() + "”");
      if (estado.sistema) partes.push("ao sistema escolhido");
      return UI.vazio({
        titulo: "Nada encontrado",
        texto: "Nenhum personagem " + (m.pasta === O.TODOS ? "" : "desta seleção ") + "corresponde " + partes.join(" e ") + ".",
        acao: { rotulo: "Limpar filtros", aoClicar: limparFiltros },
      });
    }

    if (m.grupos) {
      return el("div.grupos-sistema", {}, m.grupos.map(function (g) {
        return el("section.grupo-sistema", { "aria-label": g.sistema.nome }, [
          el("h3.grupo-sistema__titulo", {}, [
            el("span", { texto: g.sistema.nome }),
            el("span.t-mini", { texto: g.itens.length + " personagem(ns)" }),
          ]),
          el("div.registros", { dataset: { arrastarLista: "grupo-" + g.sistema.id } }, g.itens.map(linha)),
        ]);
      }));
    }
    return el("div.registros", { dataset: { arrastarLista: "personagens" } }, m.visiveis.map(linha));
  }

  function nenhumRegistro() {
    return UI.vazio({
      titulo: "Nenhum personagem arquivado",
      texto: "Crie seu primeiro registro para começar.",
      acao: { rotulo: "+ Adicionar personagem", aoClicar: abrirEscolhaDeTipo },
    });
  }

  function linha(p) {
    var abrir = function () { location.href = U.url("ficha/?id=" + encodeURIComponent(p.id)); };
    var organizavel = organizacao.disponivel;
    var movendo = !!ocupados["p:" + p.id];
    var sistema = O.sistemaDe(p);

    var itensDoMenu = [{ rotulo: "Abrir", aoClicar: abrir }];
    if (organizavel) {
      itensDoMenu.push({ rotulo: "Mover para pasta…", aoClicar: function () { escolherPasta(p); } });
      if (p.pastaId) itensDoMenu.push({ rotulo: "Retirar da pasta", aoClicar: function () { mover(p.id, null); } });
    }
    itensDoMenu.push(
      { rotulo: "Duplicar", aoClicar: function () { duplicar(p); } },
      "separador",
      { rotulo: "Excluir", perigo: true, aoClicar: function () { excluir(p); } }
    );

    return el("div.r-cartao.registro", {
      class: [organizavel ? "registro--organizavel" : "", movendo ? "registro--movendo" : ""].join(" ").trim(),
      estilo: { position: "relative" },
      "aria-busy": movendo ? "true" : null,
      dataset: { arrastarItem: p.id, arrastarRotulo: p.nome || "Personagem", personagem: p.id },
    }, [
      /* O cartão inteiro é o alvo de abertura; a alça e o menu ficam por
         cima dele, com z-index maior, para não abrir a ficha. */
      el("a.registro__link", {
        href: U.url("ficha/?id=" + encodeURIComponent(p.id)),
        "aria-label": "Abrir ficha de " + (p.nome || "personagem"),
      }),

      organizavel ? el("button.arrastar-alca", {
        type: "button",
        "aria-label": "Mover " + (p.nome || "personagem") + " para uma pasta. Arraste até uma pasta, ou pressione para escolher da lista.",
        title: movendo ? "Movendo…" : "Arraste até uma pasta · toque ou Enter para escolher da lista",
        "aria-disabled": movendo ? "true" : null,
        dataset: { arrastarAlca: p.id, foco: "alca-" + p.id },
        onclick: function () {
          if (global.RAMAArrastar && global.RAMAArrastar.arrastando()) return;
          escolherPasta(p);
        },
      }, [UI.simbolo("alca", 14)]) : null,

      avatar(p),

      el("div.registro__corpo", {}, [
        el("span.registro__nome", { texto: p.nome || "Sem nome" }),
        el("span.registro__sub", { texto: subtitulo(p) }),
        organizacao.suportada || movendo ? el("span.registro__marcas", {}, [
          organizacao.suportada ? el("span.etiqueta.etiqueta--sistema", {
            class: sistema.conhecido ? "" : "etiqueta--desconhecida",
            title: sistema.nome + (sistema.antigo ? " (ficha anterior à identificação de sistema)" : ""),
            texto: sistema.curto,
          }) : null,
          organizavel && p.pastaId && estado.pasta === O.TODOS
            ? el("span.registro__pasta", { texto: "Pasta: " + nomeDoLugar(p.pastaId) })
            : null,
          movendo ? el("span.registro__estado", { role: "status", texto: "Movendo…" }) : null,
        ]) : null,
      ]),

      el("span.registro__data", {}, [
        el("span", { texto: U.dataCurta(p.criadoEm) }),
        el("br"),
        el("span.t-mini", { texto: "Registro // " + U.codigoCurto(p.id) }),
      ]),

      menuDoRegistro(p, itensDoMenu),
    ]);
  }

  /* O gatilho do menu ganha âncora de foco: depois de mover ou duplicar,
     o redesenho devolve o foco ao mesmo lugar (na página e no painel). */
  function menuDoRegistro(p, itens) {
    var menu = UI.menu(itens, { rotulo: "Opções de " + (p.nome || "personagem"), icone: "tresPontos" });
    var gatilho = menu.querySelector("button");
    if (gatilho) gatilho.dataset.foco = "menu-" + p.id;
    return menu;
  }

  /* A listagem traz a VERSÃO da foto, não a foto (v2.16). A imagem
     entra quando chegar — do que já está guardado no aparelho, quase
     sempre sem viagem nenhuma. */
  function avatar(p) {
    var caixa = el("span.r-avatar", { "aria-hidden": "true", texto: U.iniciais(p.nome) });
    if (p.fotoVersao && global.RAMAImagens) {
      global.RAMAImagens.aplicar(caixa, { tipo: "foto", id: p.id, versao: p.fotoVersao });
    }
    return caixa;
  }

  function subtitulo(p) {
    var partes = [];
    if (p.campanha) partes.push(p.campanha);
    if (p.classe) partes.push(p.classe);
    if (p.origem) partes.push(p.origem);
    return partes.length ? partes.join(" · ") : "Sem campanha";
  }

  /* =================================================================
     EXIBIÇÃO — ABAS OU ÍCONES (v2.35)
     ================================================================= */

  function exibicao() {
    var P = global.RAMAPreferencias;
    return P ? P.valor("exibicaoPastas") : exibicaoLocal;
  }

  /* Ícones só fazem sentido com organização: sem ela não há pastas nem
     grupos para mostrar como ícone. */
  function modoIcones() { return organizacao.suportada && exibicao() === "icones"; }

  function ouvirPreferencias() {
    var P = global.RAMAPreferencias;
    if (!P) return;
    P.aoMudar(function (info) {
      if (info.chave !== "exibicaoPastas") return;
      if (info.estado === "local" && !avisouPreferenciaLocal) {
        avisouPreferenciaLocal = true;
        UI.avisoAtencao("A exibição ficou guardada só neste aparelho: o servidor ainda não grava essa preferência. Atualize o Apps Script (Codigo.gs) para ela valer na conta.");
      } else if (info.estado === "erro") {
        UI.avisoErro("Não foi possível salvar a exibição na conta. Ela vale nesta tela até recarregar.");
      }
      /* Só redesenha quando a exibição mudou de fato (outra aba, a
         sessão confirmando outro valor): o resto é estado do salvamento. */
      if (info.valor !== "icones") fecharExpansao(true);
      if (carregado && painel && info.valor !== exibicaoDesenhada) desenhar();
    });
  }

  function controleDeExibicao() {
    var atual = exibicao();
    function opcao(valor, rotulo, simbolo) {
      return el("button.exibicao__opcao", {
        type: "button",
        "aria-pressed": String(atual === valor),
        dataset: { foco: "exibicao-" + valor },
        onclick: function () { if (exibicao() !== valor) trocarExibicao(valor); },
      }, [UI.simbolo(simbolo, 14), el("span", { texto: rotulo })]);
    }
    return el("div.exibicao", { role: "group", "aria-labelledby": "rotulo-exibicao" }, [
      el("span.r-rotulo", { id: "rotulo-exibicao", texto: "Exibição" }),
      el("div.exibicao__opcoes", {}, [opcao("abas", "Abas", "abas"), opcao("icones", "Ícones", "grade")]),
    ]);
  }

  /* A troca é imediata: pasta, busca, sistema e agrupamento ficam. */
  function trocarExibicao(valor) {
    if (valor !== "icones") fecharExpansao(true);
    if (global.RAMAPreferencias) global.RAMAPreferencias.salvar("exibicaoPastas", valor);
    else exibicaoLocal = valor;
    if (exibicao() !== exibicaoDesenhada) desenhar();
  }

  function nomeDaSelecao(pastaId) {
    if (pastaId === O.TODOS) return "Todos os personagens";
    if (pastaId === O.SEM_PASTA) return "Sem pasta";
    var p = pastaPorId(pastaId);
    return p ? p.nome : "pasta";
  }

  /* Os personagens de uma pasta como a lista os mostraria: a mesma
     seleção e o mesmo filtro. */
  function listaDaPasta(pastaId) {
    return O.filtrar(O.daSelecao(registros, pastaId), { busca: estado.busca, sistema: estado.sistema });
  }

  function textoDeContagem(n, total, filtrando) {
    return filtrando ? n + " de " + total : String(total);
  }

  function rotuloDeContagem(n, total, filtrando) {
    return filtrando
      ? n + " de " + total + " personagem(ns) passam pela busca e pelo filtro"
      : total + " personagem(ns)";
  }

  /* A grade das pastas pessoais: Todos, Sem pasta, as da conta e Nova
     pasta. Sem pasta e as pastas da conta são destinos de arraste. */
  function gradeDePastas(m) {
    if (!organizacao.disponivel) return null;
    var c = m.contagens;
    var f = m.filtradas;
    function pessoal(id, nome, total, filtrado, alvo, marca) {
      return iconeDePasta({
        tipo: "pasta", chave: id, nome: nome, foco: "pasta-" + id,
        lista: listaDaPasta(id), total: total, filtrado: f ? filtrado : null,
        selecionada: m.pasta === id, alvo: alvo ? id : null,
        ocupada: !!ocupados["pasta:" + id], marca: marca,
        aoAbrir: function (botao) { abrirPastaEmIcone(id, botao); },
      });
    }
    /* "Sem pasta" não vira ícone: quem está fora de pasta fica na lista
       da página, abaixo da grade. */
    var icones = [
      pessoal(O.TODOS, "Todos os personagens", c.todos, f && f.todos, false, "grade"),
    ].concat(pastas.map(function (p) {
      return pessoal(p.id, p.nome, c.porPasta[p.id] || 0, f && f.porPasta[p.id], true, "pasta");
    })).concat([
      el("button.pasta-icone.pasta-icone--nova", {
        type: "button", dataset: { foco: "nova-pasta" }, "aria-label": "Nova pasta", title: "Nova pasta",
        onclick: function () { novaPasta(); },
      }, [
        el("span.pasta-icone__caixa", { "aria-hidden": "true" }, [UI.simbolo("mais", 28)]),
        el("span.pasta-icone__nome", { "aria-hidden": "true", texto: "Nova pasta" }),
        el("span.pasta-icone__n", { "aria-hidden": "true", texto: " " }),
      ]),
    ]);
    return el("section.pastas-icones", { "aria-label": "Pastas" }, [
      el("ul.grade-pastas", {}, icones.map(function (i) { return el("li", {}, [i]); })),
      el("p.t-mini.pastas__dica", {
        texto: "Toque numa pasta para abrir; quem não está em pasta fica na lista abaixo." + (registros.length
          ? " Para mover: arraste o personagem pela alça (⠿) até o ícone de uma pasta — ou até “Sem pasta” para retirar —, ou use “Mover para pasta…” no menu dele."
          : "") + (m.filtrando ? " Com busca ou sistema, a contagem mostra quantos passam de quantos a pasta tem." : ""),
      }),
    ]);
  }

  /* O ícone compartilhado por pastas pessoais e grupos de sistema. */
  function iconeDePasta(o) {
    var amostra = O.previa(o.lista, MAX_PREVIA);
    var minis = amostra.itens.map(miniatura);
    if (amostra.resto && minis.length === MAX_PREVIA) {
      minis[MAX_PREVIA - 1] = el("span.pasta-icone__mais", { texto: "+" + (amostra.resto + 1) });
    }
    var filtrando = o.filtrado !== null && o.filtrado !== undefined;
    var n = filtrando ? o.filtrado : o.total;
    var rotulo = (o.tipo === "sistema" ? "Sistema " : "Pasta ") + o.nome + ", " + rotuloDeContagem(n, o.total, filtrando) +
      (o.selecionada ? ", pasta escolhida" : "") + (o.ocupada ? ", sendo alterada" : "") + ". Abrir.";
    var botao = el("button.pasta-icone", {
      type: "button",
      title: o.nome,
      "aria-label": rotulo,
      "aria-haspopup": "dialog",
      "aria-current": o.selecionada ? "true" : null,
      class: [o.tipo === "sistema" ? "pasta-icone--sistema" : "", o.ocupada ? "pasta-icone--ocupada" : "",
        o.desconhecido ? "pasta-icone--desconhecido" : ""].join(" ").trim(),
      dataset: Object.assign({ foco: o.foco }, o.tipo === "pasta" ? { pasta: o.chave } : { grupoSistema: o.chave },
        o.alvo ? { arrastarPasta: o.alvo } : {}),
    }, [
      el("span.pasta-icone__caixa", { "aria-hidden": "true" }, minis.length
        ? [el("span.pasta-icone__minis", { class: "pasta-icone__minis--" + minis.length }, minis)]
        : [o.marcaTexto ? el("span.pasta-icone__marca-texto", { texto: o.marcaTexto }) : UI.simbolo(o.marca || "pasta", 28)]),
      el("span.pasta-icone__nome", { "aria-hidden": "true", texto: o.nome }),
      el("span.pasta-icone__n", { "aria-hidden": "true", texto: textoDeContagem(n, o.total, filtrando) }),
    ]);
    botao.addEventListener("click", function () {
      /* O clique que o navegador manda no fim de um arraste não abre. */
      if (global.RAMAArrastar && global.RAMAArrastar.arrastando()) return;
      o.aoAbrir(botao);
    });
    return botao;
  }

  /* A miniatura: a foto que a listagem já indica (versão) ou as
     iniciais. Nada de ler a ficha para isso. */
  function miniatura(p) {
    var caixa = el("span.r-avatar.r-avatar--quadrado.pasta-icone__mini", { texto: U.iniciais(p.nome) });
    if (p.fotoVersao && global.RAMAImagens) {
      global.RAMAImagens.aplicar(caixa, { tipo: "foto", id: p.id, versao: p.fotoVersao });
    }
    return caixa;
  }

  /* Abaixo da grade: com o agrupamento, os grupos de sistema da seleção
     como ícones; e sempre a lista dos que estão fora de pasta. */
  function resultadoEmIcones(m) {
    if (m.vazio === "nenhum") return nenhumRegistro();
    return el("div.icones-resultado", {}, [
      estado.agrupar ? gruposEmIcones(m) : null,
      soltos(),
    ]);
  }

  function gruposEmIcones(m) {
    var nomeSel = nomeDaSelecao(m.pasta);
    var cabecalhoGrupos = el("h2.grupo-sistema__titulo", {}, [
      el("span", { texto: "Por sistema" }),
      el("span.t-mini", { texto: (organizacao.disponivel ? "em “" + nomeSel + "”" : "") + (m.filtrando ? (organizacao.disponivel ? ", " : "") + "com a busca e o filtro" : "") }),
    ]);
    if (m.vazio) {
      return el("section.sistemas-icones", { "aria-label": "Sistemas" }, [cabecalhoGrupos,
        el("p.t-mini.pastas__selecao", { texto: m.vazio === "filtros"
          ? "Nenhum personagem de “" + nomeSel + "” passa pela busca e pelo filtro."
          : "“" + nomeSel + "” não tem personagens." })]);
    }
    var grupos = O.agrupar(m.visiveis);
    return el("section.sistemas-icones", { "aria-label": "Sistemas em " + nomeSel }, [
      cabecalhoGrupos,
      el("ul.grade-pastas", {}, grupos.map(function (g) {
        return el("li", {}, [iconeDePasta({
          tipo: "sistema", chave: g.sistema.id, nome: g.sistema.nome, foco: "sistema-" + g.sistema.id,
          lista: g.itens, total: g.itens.length, filtrado: null, selecionada: false, alvo: null,
          desconhecido: !g.sistema.conhecido, marcaTexto: g.sistema.curto,
          aoAbrir: function (botao) { abrirExpansao({ tipo: "sistema", chave: g.sistema.id }, botao); },
        })]);
      })),
      el("p.t-mini.pastas__dica", { texto: "Os grupos só arrumam a seleção: ninguém muda de pasta nem de sistema por eles." }),
    ]);
  }

  /* Os que estão fora de pasta, na página e em lista: a mesma seleção
     "Sem pasta" das abas, com a busca, o sistema e o agrupamento. O título
     recebe arraste (retirar da pasta). */
  function soltos() {
    var pastasDisp = organizacao.disponivel ? pastas : [];
    var ms = O.montar(registros, pastasDisp, Object.assign({}, estado, { pasta: O.SEM_PASTA }));
    var corpo;
    if (ms.vazio === "sem-pasta") {
      corpo = el("p.t-mini.pastas__selecao", { texto: "Todos os personagens estão em pastas." });
    } else {
      corpo = resultado(ms, function () { abrirPastaEmIcone(O.TODOS, null); });
    }
    if (!organizacao.disponivel) return el("section.soltos", { "aria-label": "Personagens" }, [corpo]);
    return el("section.soltos", { "aria-labelledby": "soltos-titulo" }, [
      el("h2.soltos__titulo", {
        id: "soltos-titulo",
        dataset: { pasta: O.SEM_PASTA, arrastarPasta: O.SEM_PASTA },
      }, [
        el("span", { texto: "Sem pasta" }),
        el("span.t-mini", { texto: rotuloDeContagem(ms.visiveis.length, ms.base.length, ms.filtrando) }),
        el("span.t-mini.soltos__soltar", { "aria-hidden": "true", texto: "Solte aqui para retirar da pasta" }),
      ]),
      corpo,
    ]);
  }

  function abrirPastaEmIcone(id, botao) {
    estado.pasta = id;
    desenhar();
    var origem = botao && botao.isConnected ? botao : painel.querySelector('[data-foco="pasta-' + id + '"]');
    abrirExpansao({ tipo: "pasta", chave: id }, origem);
  }

  /* O painel por cima: o modal compartilhado (foco preso, Esc, fundo),
     com fechamento direto pelo fundo e saída curta. Uma pasta aberta de
     cada vez. */
  function abrirExpansao(alvo, origem) {
    fecharExpansao(true);
    var resumo = el("p.t-mini.pasta-expansao__resumo", { role: "status" });
    var acoes = el("div.faixa.pasta-expansao__acoes");
    var corpo = el("div.pasta-expansao__corpo");
    var focoOrigem = origem && origem.dataset ? origem.dataset.foco : "";
    var registro = { tipo: alvo.tipo, chave: alvo.chave, resumo: resumo, acoes: acoes, corpo: corpo, foco: focoOrigem, silencioso: false };
    var m = UI.modal({
      titulo: " ",
      classe: "r-modal--pasta",
      largo: true,
      conteudo: [resumo, acoes, corpo],
      botoes: [{ rotulo: "Fechar", classe: "r-botao--fantasma" }],
      fundoFecha: true,
      saida: 160,
      aoFechar: function () {
        if (expansao === registro) expansao = null;
        if (registro.silencioso) return;
        var volta = registro.foco ? painel.querySelector('[data-foco="' + registro.foco + '"]') : null;
        if (!volta) volta = painel.querySelector('.pasta-icone[aria-current="true"]') || painel.querySelector(".pasta-icone");
        if (volta) volta.focus();
      },
    });
    registro.modal = m;
    expansao = registro;
    /* O último ponto de foco dentro do painel: uma janela empilhada (Mover
       para pasta, confirmar exclusão) devolve o foco para um elemento que
       o redesenho pode ter trocado. */
    m.janela.addEventListener("focusin", function (ev) {
      var t = ev.target;
      var ancora = t.closest ? t.closest("[data-foco]") : null;
      if (!ancora && t.closest && t.closest(".registro")) ancora = t.closest(".registro").querySelector('[data-foco^="menu-"]');
      if (ancora && ancora.dataset.foco) registro.ultimoFoco = ancora.dataset.foco;
    });
    /* A pasta cresce a partir do ícone que a abriu. */
    if (origem && origem.getBoundingClientRect) {
      var r = origem.getBoundingClientRect(), j = m.janela.getBoundingClientRect();
      m.janela.style.transformOrigin = Math.round(r.left + r.width / 2 - j.left) + "px " + Math.round(r.top + r.height / 2 - j.top) + "px";
    }
    preencherExpansao();
    var fechar = m.janela.querySelector('.r-modal__topo button[aria-label="Fechar"]');
    if (fechar) fechar.focus();
  }

  function fecharExpansao(silencioso) {
    if (!expansao) return;
    var e = expansao;
    e.silencioso = !!silencioso;
    expansao = null;
    e.modal.fechar();
  }

  /* O conteúdo do painel, sempre a partir do estado atual: mover,
     duplicar, excluir e renomear redesenham a página e o painel junto. */
  function preencherExpansao() {
    var e = expansao;
    if (!e) return;
    var pastasDisp = organizacao.disponivel ? pastas : [];
    var titulo = "", resumo = "", acoes = [], conteudo;
    if (e.tipo === "pasta") {
      var mm = O.montar(registros, pastasDisp, Object.assign({}, estado, { pasta: e.chave }));
      if (mm.pasta !== e.chave) {
        /* A pasta deixou de existir: o painel fecha e a seleção volta a
           uma que existe (O.montar já trocou). */
        e.foco = "pasta-" + estado.pasta;
        fecharExpansao(false);
        return;
      }
      titulo = nomeDaSelecao(e.chave);
      resumo = (e.chave === O.TODOS || e.chave === O.SEM_PASTA ? "" : "Pasta · ") + rotuloDeContagem(mm.visiveis.length, mm.base.length, mm.filtrando) +
        (mm.filtrando ? ". Limpe a busca e o sistema para ver todos." : ".");
      var p = pastaPorId(e.chave);
      if (p) {
        var ocupada = !!ocupados["pasta:" + p.id];
        acoes = [
          el("button.r-botao.r-botao--mini", {
            type: "button", texto: "Renomear", disabled: ocupada, dataset: { foco: "renomear-pasta" },
            onclick: function () { renomearPasta(p); },
          }),
          el("button.r-botao.r-botao--mini.r-botao--perigo", {
            type: "button", texto: ocupada ? "Excluindo…" : "Excluir pasta", disabled: ocupada, dataset: { foco: "excluir-pasta" },
            onclick: function () { excluirPasta(p); },
          }),
        ];
      }
      conteudo = resultado(mm, function () { e.chave = O.TODOS; e.foco = "pasta-" + O.TODOS; estado.pasta = O.TODOS; desenhar(); });
    } else {
      var ms = O.montar(registros, pastasDisp, estado);
      var grupo = O.agrupar(ms.visiveis).filter(function (g) { return g.sistema.id === e.chave; })[0];
      var sistema = grupo ? grupo.sistema : (e.chave === "?" ? O.sistemaDe({ sistema: null }) : global.RAMASistemas.de(e.chave));
      var nomeSel = nomeDaSelecao(ms.pasta);
      titulo = sistema.nome;
      resumo = "Sistema · " + (grupo ? grupo.itens.length : 0) + " personagem(ns)" + (organizacao.disponivel ? " em “" + nomeSel + "”" : "") +
        (ms.filtrando ? ", com a busca e o filtro" : "") + (sistema.antigo ? ". Fichas anteriores à identificação de sistema contam como Universal." : ".") +
        (sistema.pendente ? " O servidor ainda não identificou o sistema destas fichas." : "");
      conteudo = grupo
        ? el("div.registros", { dataset: { arrastarLista: "grupo-" + sistema.id } }, grupo.itens.map(linha))
        : UI.vazio({ titulo: "Ninguém deste sistema aqui", texto: "Nenhum personagem de " + sistema.nome + " na seleção atual com a busca e o filtro." });
    }
    var janela = e.modal.janela;
    var ativo = document.activeElement;
    var dentro = ativo && janela.contains(ativo);
    var foco = dentro && ativo.dataset ? ativo.dataset.foco : "";
    var h = janela.querySelector(".r-modal__topo h2");
    if (h) h.textContent = titulo;
    janela.setAttribute("aria-describedby", "pasta-expansao-resumo");
    e.resumo.id = "pasta-expansao-resumo";
    e.resumo.textContent = resumo;
    U.trocar(e.acoes, acoes);
    e.acoes.hidden = !acoes.length;
    U.trocar(e.corpo, [conteudo]);
    /* O foco volta ao mesmo ponto do painel; se ele sumiu (o personagem
       saiu desta pasta), vai para "Fechar". */
    var perdido = !ativo || ativo === document.body || (dentro && !ativo.isConnected);
    if (perdido) {
      var chave = foco || e.ultimoFoco;
      var novo = chave ? janela.querySelector('[data-foco="' + chave + '"]') : null;
      (novo || janela.querySelector('.r-modal__topo button[aria-label="Fechar"]')).focus();
    }
  }

  function atualizarExpansao() {
    if (!expansao) return;
    if (!modoIcones()) { fecharExpansao(true); return; }
    preencherExpansao();
  }

  /* =================================================================
     MOVER — arrastar, a lista e o "Retirar da pasta"
     ================================================================= */

  function ligarArraste() {
    if (arrasteLigado || !global.RAMAArrastar || !painel) return;
    arrasteLigado = true;
    /* No documento, e não só na página: no modo Ícones o personagem sai
       do painel aberto (anexado ao body) para um ícone da página. */
    global.RAMAArrastar.ligar(document.body, {
      aoIniciar: function () {
        if (expansao && expansao.modal.janela.parentNode) expansao.modal.janela.parentNode.classList.add("pasta-expansao--arrastando");
      },
      aoTerminar: function () {
        if (expansao && expansao.modal.janela.parentNode) expansao.modal.janela.parentNode.classList.remove("pasta-expansao--arrastando");
      },
      podeSoltar: function (item, destino) {
        var p = registroPorId(item.id);
        if (!p) return { ok: false, motivo: "Personagem não encontrado." };
        if (!destino.dentro) return { ok: false, motivo: "Solte sobre uma pasta." };
        if (ocupados["p:" + p.id]) return { ok: false, motivo: "Este personagem já está sendo movido." };
        var alvo = destino.lista === O.SEM_PASTA ? null : destino.lista;
        if (alvo && !pastaPorId(alvo)) return { ok: false, motivo: "Esta pasta não está disponível." };
        if (alvo && ocupados["pasta:" + alvo]) return { ok: false, motivo: "Esta pasta está sendo alterada." };
        if ((p.pastaId || null) === alvo) return { ok: false, motivo: "Já está em “" + nomeDoLugar(alvo) + "”." };
        return { ok: true };
      },
      aoSoltar: function (item, destino) {
        mover(item.id, destino.lista === O.SEM_PASTA ? null : destino.lista);
      },
    });
  }

  /* Move UM personagem. A tela só muda quando o servidor confirma. */
  async function mover(personagemId, pastaId) {
    var p = registroPorId(personagemId);
    if (!p || ocupados["p:" + p.id]) return;
    var destino = pastaId || null;
    if ((p.pastaId || null) === destino) {
      UI.aviso((p.nome || "O personagem") + " já está em “" + nomeDoLugar(destino) + "”.");
      return;
    }
    if (destino && !pastaPorId(destino)) { UI.avisoAtencao("Esta pasta não está mais disponível."); return; }

    ocupados["p:" + p.id] = true;
    desenhar();
    var r = await global.RAMAApi.moverPersonagem(p.id, destino);
    delete ocupados["p:" + p.id];

    if (!r.ok) {
      falhou(r, (p.nome || "O personagem") + " não foi movido", function () { mover(personagemId, pastaId); });
      if (r.erro === "pasta_nao_encontrada" || r.erro === "nao_encontrado") { await carregar(); return; }
      desenhar();
      return;
    }

    var atual = registroPorId(personagemId);
    if (atual) atual.pastaId = (r.dados && r.dados.pastaId) || null;
    desenhar();
    destacar(destino || O.SEM_PASTA, personagemId);
    UI.avisoOk((p.nome || "Personagem") + (destino ? " movido para “" + nomeDoLugar(destino) + "”." : " retirado da pasta: agora em “Sem pasta”."));
  }

  /* Uma operação de organização que não deu certo. Nada foi aplicado na
     tela; a falha de rede diz isso em vez de prometer reenvio — mover e
     excluir pasta não se repetem sozinhos, a pessoa decide. */
  function falhou(r, oQue, tentar) {
    var erro = r && r.erro;
    var passageira = !erro || erro === "sem_conexao" || erro === "prazo" ||
      erro === "servidor_falhou" || erro === "ocupado" || erro === "sem_resposta";
    if (!passageira) { UI.avisoDeFalha(r, oQue); return; }
    var f = global.RAMAApi.frase(r);
    UI.avisoErro(oQue + " — " + f.titulo + ". Nada mudou.", tentar
      ? { acao: { rotulo: "Tentar de novo", aoClicar: tentar }, duracao: 12000 }
      : null);
  }

  /* A confirmação visual: a pasta que recebeu pisca, e o cartão também,
     se continuar à vista. */
  function destacar(pastaId, personagemId) {
    var alvos = [
      painel.querySelector('[data-pasta="' + pastaId + '"]'),
      painel.querySelector('[data-personagem="' + personagemId + '"]'),
    ].filter(Boolean);
    alvos.forEach(function (a) { a.classList.add("organizacao-recebeu"); });
    setTimeout(function () { alvos.forEach(function (a) { a.classList.remove("organizacao-recebeu"); }); }, 1400);
  }

  /* A escolha por lista: o caminho do teclado e do celular. */
  function escolherPasta(p) {
    if (!organizacao.disponivel) return;
    if (ocupados["p:" + p.id]) { UI.aviso("Este personagem já está sendo movido."); return; }
    var atual = p.pastaId || null;

    var m;
    function opcao(id, nome) {
      var aqui = (atual || null) === (id || null);
      return el("button.pasta-opcao", {
        type: "button",
        disabled: aqui,
        "aria-current": aqui ? "true" : null,
        onclick: function () { m.fechar(); mover(p.id, id); },
      }, [
        el("span", { texto: nome }),
        aqui ? el("span.t-mini", { texto: "atual" }) : null,
      ]);
    }

    m = UI.modal({
      titulo: "Mover para pasta",
      conteudo: [
        el("p", { texto: "Para onde vai " + (p.nome || "este personagem") + "?" }),
        el("div.pasta-opcoes", { role: "group", "aria-label": "Pastas" },
          [opcao(null, "Sem pasta")].concat(pastas.map(function (x) { return opcao(x.id, x.nome); }))),
        pastas.length ? null : el("p.t-mini", { texto: "Você ainda não tem pastas. Crie uma e o personagem vai direto para ela." }),
      ],
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "+ Nova pasta", aoClicar: function (fechar) {
          fechar();
          novaPasta(function (nova) { mover(p.id, nova.id); });
        } },
      ],
    });
    var primeira = m && m.janela ? m.janela.querySelector(".pasta-opcao:not([disabled])") : null;
    if (primeira) primeira.focus();
  }

  /* =================================================================
     PASTAS — criar, renomear, excluir
     ================================================================= */

  function dialogoDeNome(o) {
    var campo = UI.campo({ rotulo: "Nome da pasta", limite: 60, valor: o.valor || "", dica: "Até 60 caracteres" });
    UI.modal({
      titulo: o.titulo,
      conteudo: [campo, o.texto ? el("p.t-mini", { texto: o.texto }) : null],
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        {
          rotulo: o.rotulo,
          classe: "r-botao--principal",
          rotuloOcupado: o.rotuloOcupado,
          aoClicar: async function (fechar) {
            var nome = campo.entrada.value.replace(/\s+/g, " ").trim();
            if (!nome) { campo.marcarErro("Dê um nome à pasta."); campo.entrada.focus(); return; }
            var r = await o.enviar(nome);
            if (!r.ok) {
              if (r.erro === "pasta_repetida" || r.erro === "dados_invalidos") {
                campo.marcarErro(global.RAMAApi.frase(r).texto);
                campo.entrada.focus();
              } else {
                UI.avisoDeFalha(r, o.contexto);
              }
              return;
            }
            fechar();
            o.depois(r.dados);
          },
        },
      ],
    });
    campo.entrada.focus();
    campo.entrada.addEventListener("keydown", function (ev) {
      if (ev.key !== "Enter") return;
      ev.preventDefault();
      var b = campo.entrada.closest(".r-modal").querySelector(".r-modal__rodape .r-botao--principal");
      if (b) b.click();
    });
  }

  function novaPasta(depois) {
    if (!organizacao.disponivel) return;
    dialogoDeNome({
      titulo: "Nova pasta",
      rotulo: "Criar pasta",
      rotuloOcupado: "Criando…",
      contexto: "criação de pasta",
      texto: "Uma pasta guarda personagens de qualquer sistema. Excluir a pasta não exclui os personagens.",
      enviar: function (nome) { return global.RAMAApi.criarPasta(nome); },
      depois: function (pasta) {
        if (!pastaPorId(pasta.id)) pastas.push(pasta);
        ordenarPastas();
        desenhar();
        destacar(pasta.id, "");
        UI.avisoOk("Pasta “" + pasta.nome + "” criada.");
        if (depois) depois(pasta);
      },
    });
  }

  function renomearPasta(p) {
    if (ocupados["pasta:" + p.id]) return;
    dialogoDeNome({
      titulo: "Renomear pasta",
      rotulo: "Renomear",
      rotuloOcupado: "Renomeando…",
      contexto: "renomear pasta",
      valor: p.nome,
      enviar: async function (nome) {
        ocupados["pasta:" + p.id] = true;
        try { return await global.RAMAApi.renomearPasta(p.id, nome); }
        finally { delete ocupados["pasta:" + p.id]; }
      },
      depois: function (pasta) {
        var atual = pastaPorId(pasta.id);
        if (atual) atual.nome = pasta.nome;
        ordenarPastas();
        desenhar();
        UI.avisoOk("Pasta renomeada para “" + pasta.nome + "”.");
      },
    });
  }

  async function excluirPasta(p) {
    if (ocupados["pasta:" + p.id]) return;
    var n = registros.filter(function (x) { return x.pastaId === p.id; }).length;
    var certeza = await UI.confirmar({
      titulo: "Excluir a pasta “" + p.nome + "”?",
      texto: n
        ? "Os " + n + " personagem(ns) desta pasta vão para “Sem pasta”. Nenhum personagem é excluído."
        : "A pasta está vazia. Nenhum personagem é afetado.",
      detalhe: "Para excluir um personagem, use “Excluir” no menu dele.",
      rotuloConfirmar: "Excluir pasta",
      perigo: true,
    });
    if (!certeza) return;

    ocupados["pasta:" + p.id] = true;
    desenhar();
    var r = await global.RAMAApi.excluirPasta(p.id);
    delete ocupados["pasta:" + p.id];

    if (!r.ok) {
      falhou(r, "A pasta “" + p.nome + "” não foi excluída", null);
      if (r.erro === "nao_encontrado") { await carregar(); return; }
      desenhar();
      return;
    }

    pastas = pastas.filter(function (x) { return x.id !== p.id; });
    registros.forEach(function (x) { if (x.pastaId === p.id) x.pastaId = null; });
    if (estado.pasta === p.id) estado.pasta = O.SEM_PASTA;
    desenhar();
    var liberados = (r.dados && r.dados.liberados) || 0;
    UI.avisoOk("Pasta “" + p.nome + "” excluída." + (liberados ? " " + liberados + " personagem(ns) agora em “Sem pasta”." : ""));
  }

  /* =================================================================
     CRIAÇÃO — A ESCOLHA DO MODELO
     -----------------------------------------------------------------
     Antes de qualquer campo, uma pergunta: que ficha é esta?

     A escolha vem primeiro porque ela muda tudo o que vem depois. Uma
     ficha de Ordem tem criação guiada, cálculo automático e catálogo;
     uma universal tem campos livres. Perguntar no fim, depois de a
     pessoa já ter preenchido nome e classe, seria perguntar tarde.

     O tipo é gravado num campo e não muda depois — ver o bloco de tipo
     em js/ficha.js. Por isso a tela diz isso aqui, antes, e não depois
     de já ser tarde. */
  function abrirEscolhaDeTipo() {
    function cartao(o) {
      return el("button.tipo-ficha", {
        type: "button",
        onclick: function () { if (o.aoEscolher) o.aoEscolher(); },
      }, [
        el("span.tipo-ficha__nome", { texto: o.nome }),
        el("span.tipo-ficha__resumo", { texto: o.resumo }),
        el("ul.tipo-ficha__lista", {}, o.pontos.map(function (t) {
          return el("li", { texto: t });
        })),
      ]);
    }

    var m = UI.modal({
      titulo: "Que tipo de ficha?",
      largo: true,
      conteudo: [
        el("div.tipos-ficha", {}, [
          cartao({
            nome: "Ordem Paranormal",
            resumo: "A ficha do sistema, com as regras dos livros.",
            pontos: [
              "Criação guiada passo a passo",
              "PV, PE, Sanidade, Defesa e carga calculados",
              "Catálogo de origens, classes e trilhas com página do livro",
              "Regras opcionais do Sobrevivendo ao Horror",
            ],
            aoEscolher: function () { m.fechar(); abrirCriacaoOrdem(); },
          }),
          cartao({
            nome: "Universal",
            resumo: "O modelo flexível do R.A.M.A., para qualquer sistema.",
            pontos: [
              "Atributos, perícias e status que você define",
              "Seções e rótulos com o nome da sua mesa",
              "Nenhuma regra imposta",
              "É o que toda ficha criada até hoje usa",
            ],
            aoEscolher: function () { m.fechar(); abrirCriacao(); },
          }),
        ]),
        el("p.t-mini", {
          texto: "A escolha fica gravada na ficha e não muda depois. Não existe conversão " +
                 "automática entre os dois modelos: ela teria de adivinhar o que vira o quê, " +
                 "e adivinhar aqui é perder dado em silêncio.",
        }),
      ],
      botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }],
    });

    return m;
  }

  /* Abre a criação guiada de Ordem, se o módulo dela estiver carregado.
     Sem ele, a tela diz o que falta em vez de não fazer nada. */
  async function abrirCriacaoOrdem() {
    if (!global.RAMAOrdemCriar) {
      UI.avisoErro("A criação de Ordem Paranormal não está disponível nesta página.");
      return;
    }
    var campanhas = [];
    var r = await global.RAMAApi.listarCampanhas();
    if (r.ok) campanhas = r.dados || [];
    global.RAMAOrdemCriar.abrir({ campanhas: campanhas });
  }

  /* =================================================================
     CRIAÇÃO UNIVERSAL
     -----------------------------------------------------------------
     Só o nome é obrigatório. Classe, origem, campanha e foto podem
     esperar — quem cria um personagem no meio de uma sessão não quer
     preencher formulário, quer a ficha aberta.
     ================================================================= */

  async function abrirCriacao() {
    var campanhas = [];
    var r = await global.RAMAApi.listarCampanhas();
    if (r.ok) campanhas = r.dados || [];

    var nome = UI.campo({ rotulo: "Nome", limite: 80, dica: "Como o personagem é chamado" });
    var classe = UI.campo({ rotulo: "Classe", limite: 60, dica: "opcional" });
    var origem = UI.campo({ rotulo: "Origem", limite: 60, dica: "opcional" });

    var campanha = UI.campo({
      rotulo: "Campanha",
      tipo: "selecao",
      opcoes: [{ valor: "", rotulo: "Sem campanha" }].concat(
        campanhas.map(function (c) { return { valor: c.id, rotulo: c.nome }; })
      ),
    });

    var fotoPreparada = "";
    var previa = el("span.r-avatar.r-avatar--g", { "aria-hidden": "true", texto: "?" });

    var botaoFoto = el("button.r-botao.r-botao--fantasma", {
      type: "button", texto: "Escolher foto",
      onclick: async function () {
        /* O recorte vira rascunho da criação: nada sobe antes de "Criar
           registro", e cancelar o editor não mexe no formulário. */
        botaoFoto.disabled = true;
        var img;
        try { img = await global.RAMAEditorImagem.escolher("retrato"); }
        finally { botaoFoto.disabled = false; }
        if (!img.ok) return;
        fotoPreparada = img.imagem;
        U.trocar(previa, [el("img", { src: img.imagem, alt: "" })]);
      },
    });

    var criando = false;

    UI.modal({
      titulo: "Novo personagem",
      conteudo: [
        el("div.faixa", {}, [previa, botaoFoto]),
        nome,
        el("div.editar-grade", {}, [classe, origem]),
        campanha,
        el("p.t-mini", { texto: "A ficha padrão é criada automaticamente: cinco atributos, PV, PE, Sanidade e as 28 perícias. Tudo pode ser mudado no modo edição." }),
      ],
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        {
          rotulo: "Criar registro",
          classe: "r-botao--principal",
          aoClicar: async function (fechar) {
            if (criando) return;

            var valor = nome.entrada.value.trim();
            if (!valor) {
              nome.marcarErro("Informe um nome para o personagem.");
              nome.entrada.focus();
              return;
            }

            criando = true;
            var ficha = global.RAMAFicha.criarFicha({
              nome: valor,
              tipoFicha: "universal",
              classe: classe.entrada.value.trim(),
              origem: origem.entrada.value.trim(),
              campanhaId: campanha.entrada.value || null,
            });

            var r = await global.RAMAApi.criarPersonagem(ficha);
            criando = false;

            if (!r.ok) { UI.avisoDeFalha(r, "criação de personagem"); return; }

            /* A foto vai numa gravação própria: ela não faz parte do
               JSON da ficha e a ficha não deve esperar por ela. */
            if (fotoPreparada && r.dados && r.dados.id) {
              var f = await global.RAMAApi.salvarFoto(r.dados.id, fotoPreparada);
              if (!f.ok) UI.avisoAtencao("O personagem foi criado, mas a foto não subiu. Você pode tentar de novo na ficha.");
            }

            fechar();
            location.href = U.url("ficha/?id=" + encodeURIComponent(r.dados.id));
          },
        },
      ],
    });

    nome.entrada.focus();
  }

  /* =================================================================
     DUPLICAR E EXCLUIR
     ================================================================= */

  /* A cópia fica na mesma pasta e no mesmo sistema da original — quem
     cuida disso é o servidor. Uma duplicação de cada vez por ficha. */
  async function duplicar(p) {
    if (ocupados["dup:" + p.id]) return;
    ocupados["dup:" + p.id] = true;
    var aviso = UI.aviso("Duplicando " + (p.nome || "personagem") + "…", { duracao: 30000 });
    var r = await global.RAMAApi.duplicarPersonagem(p.id);
    aviso();
    delete ocupados["dup:" + p.id];

    if (!r.ok) { UI.avisoDeFalha(r, "duplicação"); return; }

    UI.avisoOk("Cópia criada" + (p.pastaId ? " na pasta “" + nomeDoLugar(p.pastaId) + "”." : "."));
    await carregar();
  }

  async function excluir(p) {
    var certeza = await UI.confirmar({
      titulo: "Excluir personagem?",
      texto: (p.nome || "Este personagem") + " será removido do seu arquivo.",
      detalhe: "Esta ação não pode ser desfeita. A ficha, a foto e as anotações somem junto.",
      rotuloConfirmar: "Excluir",
      perigo: true,
    });

    if (!certeza) return;

    var r = await global.RAMAApi.excluirPersonagem(p.id);
    if (!r.ok) { UI.avisoDeFalha(r, "exclusão"); return; }

    registros = registros.filter(function (x) { return x.id !== p.id; });
    desenhar();
    UI.avisoOk((p.nome || "O personagem") + " foi removido do arquivo.");
  }
})(window);
