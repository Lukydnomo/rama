/* =====================================================================
   R.A.M.A. — tema-editor.js
   O editor de temas (v2.36), o mesmo para os dois contextos:

   - "conta": o tema do site, aberto pelo lápis do Perfil. Escolhe entre
     Seguir o aparelho, Claro, Escuro e os temas da conta; cria, edita,
     duplica e exclui temas. Salvar grava preferência, tema ativo e lista
     (RAMATema.salvarConta).
   - "ficha": o tema de UMA ficha, aberto pelo lápis ao lado de
     Normal/Edição. Além das opções acima, "Usar o tema da conta"; um
     tema da conta entra na ficha como CÓPIA independente. Aplicar entra
     na fila de gravação da ficha (quem abriu decide como, em `aplicar`).

   RASCUNHO: nada vai ao servidor antes de Salvar/Aplicar. Enquanto o
   editor está aberto, a página atrás mostra o rascunho
   (RAMATema.definirPrevia) e a caixa de prévia também; a JANELA do
   editor fica num tema pronto (o do aparelho), legível mesmo que o
   rascunho não esteja — "Desfazer alterações" e "Cancelar" estão
   sempre ao alcance. Cancelar, Esc e o X descartam e devolvem a página
   ao que era.

   As cores entram por seletor ou digitadas; o que não é cor válida é
   apontado e o último valor bom continua valendo. Os valores são DADOS
   (js/tema-modelo.js); o CSS sai do resolvedor, nunca do que se digita.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var el = U.el;

  function M() { return global.RAMATemaModelo; }
  function T() { return global.RAMATema; }
  function clonar(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }

  var NOMES = { sistema: "Seguir o aparelho", claro: "Claro", escuro: "Escuro", conta: "Usar o tema da conta" };
  var aberto = null;

  /* ---- pequenas peças ---- */

  function nomeDoEfetivo(ef) { return ef === "escuro" ? "escuro" : "claro"; }

  /* Cinco amostras de um tema (fundo, cartão, texto, botão, destaque). */
  function amostras(tema) {
    var res = M().valoresResolvidos(tema);
    return el("span.tema-amostras", { "aria-hidden": "true" }, ["fundo", "superficie", "texto", "botao", "paranormal"].map(function (k) {
      var s = el("span.tema-amostras__cor");
      s.style.setProperty("background", res[k].preenchimento);
      return s;
    }));
  }
  function temaDoModo(modo) {
    if (modo === "claro" || modo === "escuro") return { base: modo, valores: {} };
    var escuro = T().resolver("sistema", sistemaEscuro()) === "escuro";
    return { base: escuro ? "escuro" : "claro", valores: {} };
  }
  function sistemaEscuro() {
    try { return !!(global.matchMedia && global.matchMedia("(prefers-color-scheme: dark)").matches); } catch (e) { return false; }
  }
  function textoCor(v) {
    if (!v) return "";
    return v.alfa !== undefined && v.alfa < 1 ? M().cssCor(v.cor, v.alfa) : v.cor;
  }
  /* Um tom vizinho, para o segundo ponto de um gradiente novo. */
  function vizinha(hex) {
    var n = parseInt(hex.slice(1), 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    var escuro = 0.299 * r + 0.587 * g + 0.114 * b < 128;
    function mov(c) { return Math.round(escuro ? c + (255 - c) * 0.25 : c * 0.75); }
    var h = ((1 << 24) + (mov(r) << 16) + (mov(g) << 8) + mov(b)).toString(16).slice(1);
    return "#" + h;
  }
  var seq = 0;
  function uid(p) { seq += 1; return "tema-" + p + "-" + seq; }

  /* =================================================================
     ABRIR
     o.contexto     "conta" | "ficha"
     o.preferencias (conta) { tema, temaAtivo, temas } como o servidor tem
     o.nomeFicha    (ficha) o nome, para o título
     o.aparencia    (ficha) o bloco atual da ficha
     o.podeSalvar   (ficha) false: só ver
     o.aplicar      (ficha) function(aparencia) → Promise<{ ok, pendente, erro }>
     o.aoSalvar     (conta) function(preferencias gravadas)
     ================================================================= */

  function abrir(o) {
    if (!M() || !T()) { UI.avisoAtencao("O editor de temas não carregou. Recarregue a página."); return null; }
    if (aberto) return aberto;
    o = o || {};
    var ehFicha = o.contexto === "ficha";
    var podeSalvar = ehFicha ? o.podeSalvar !== false : true;

    /* ---- o rascunho ---- */
    var prefs = o.preferencias || {};
    var temas = M().normalizarTemas(ehFicha ? [] : prefs.temas);
    var temasDaConta = null;     // ficha: os temas da conta, para copiar (carregados ao abrir)
    var fichaTema = null;        // ficha: o tema próprio (cópia, sem id)
    var sel;
    if (ehFicha) {
      var ap = M().normalizarAparencia(o.aparencia);
      fichaTema = ap.tema ? clonar(ap.tema) : null;
      sel = { modo: ap.modo, id: null };
    } else {
      var modo = T().PREFERENCIAS_CONTA.indexOf(prefs.tema) >= 0 ? prefs.tema : T().preferencia();
      sel = { modo: modo, id: modo === "personalizado" ? prefs.temaAtivo || null : null };
      if (modo === "personalizado" && !temas.some(function (t) { return t.id === sel.id; })) sel = { modo: "sistema", id: null };
    }
    var inicial = foto();
    var salvando = false;
    var abertas = {};            // categorias abertas no editor
    var linhas = {};             // chave → elemento da linha

    function foto() { return JSON.stringify({ sel: sel, temas: temas, fichaTema: fichaTema }); }
    function alterado() { return foto() !== inicial; }

    function temaSelecionado() {
      if (sel.modo !== "personalizado") return null;
      if (ehFicha) return fichaTema;
      for (var i = 0; i < temas.length; i++) if (temas[i].id === sel.id) return temas[i];
      return null;
    }
    function escolhaDaConta() {
      var p = T().personalizado();
      return { modo: T().preferencia(), tema: p ? p.tema : null };
    }
    function escolhaDoRascunho() {
      if (sel.modo === "conta") return escolhaDaConta();
      if (sel.modo === "personalizado") {
        var t = temaSelecionado();
        return t ? { modo: "personalizado", tema: t } : { modo: "sistema" };
      }
      return { modo: sel.modo };
    }
    /* O tema (dados) por trás de uma escolha: para amostras e contraste. */
    function temaDaEscolha(e) {
      return e.modo === "personalizado" && e.tema ? e.tema : temaDoModo(e.modo);
    }
    function nomeDaConta() {
      var p = T().preferencia();
      if (p === "personalizado" && T().personalizado()) return T().personalizado().tema.nome;
      if (p === "personalizado" || p === "sistema") return "Seguir o aparelho (agora " + nomeDoEfetivo(T().resolver("sistema", sistemaEscuro())) + ")";
      return NOMES[p];
    }

    /* ---- a estrutura da janela ---- */
    var grupoNome = uid("escolha");
    var areaEscolhas = el("div.tema-escolhas");
    var areaEditor = el("section.tema-personalizar", { "aria-label": "Personalizar o tema" });
    var caixa = el("div.tema-previa", { "aria-hidden": "true", inert: "" });
    montarPrevia(caixa);
    var areaContraste = el("div.tema-contraste", { role: "status", "aria-live": "polite" });
    var erroSalvar = el("p.r-ajuda.t-erro", { role: "alert", hidden: true });

    var contextoTexto = ehFicha
      ? "Tema desta ficha" + (o.nomeFicha ? " (" + o.nomeFicha + ")" : "") + ": vale só nela, para quem a abrir. O tema da sua conta não muda."
      : "Tema da conta: vale em todas as páginas do site, em qualquer aparelho em que você entrar.";

    var emUso = el("p.t-mini.tema-editor__emuso");
    pintarEmUso();

    var conteudo = el("div.tema-editor", {}, [
      el("p.tema-editor__contexto", { texto: contextoTexto }),
      emUso,
      !podeSalvar ? el("p.r-ajuda", { texto: "Você pode ver as opções, mas não alterar o tema desta ficha." }) : null,
      el("div.tema-editor__grade", {}, [
        el("div.tema-editor__coluna", {}, [areaEscolhas, areaEditor]),
        el("div.tema-editor__coluna.tema-editor__lateral", {}, [
          el("h3.t-rotulo", { texto: "Prévia" }),
          caixa,
          areaContraste,
        ]),
      ]),
      erroSalvar,
    ]);

    var botoes = [
      { rotulo: "Desfazer alterações", classe: "r-botao--fantasma tema-editor__desfazer", aoClicar: function () { desfazer(); } },
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
    ];
    if (podeSalvar) botoes.push({
      rotulo: ehFicha ? "Aplicar à ficha" : "Salvar tema",
      rotuloOcupado: ehFicha ? "Aplicando…" : "Salvando…",
      classe: "r-botao--principal",
      aoClicar: function (fechar) { return ehFicha ? aplicarFicha(fechar) : salvarConta(fechar); },
    });

    var desfazerJanela = function () {};
    var desfazerCaixa = function () {};
    var m = UI.modal({
      titulo: ehFicha ? "Tema desta ficha" : "Tema do site",
      largo: true,
      classe: "tema-editor__janela",
      conteudo: conteudo,
      botoes: botoes,
      podeFechar: function () { return !salvando; },
      aoFechar: function (resultado) {
        if (vigia) vigia.disconnect();
        T().definirPrevia(null);
        desfazerCaixa();
        desfazerJanela();
        aberto = null;
        if (o.aoFechar) o.aoFechar(resultado || null);
      },
    });
    /* A janela num tema pronto, o do aparelho: legível seja qual for o
       rascunho. */
    desfazerJanela = T().aplicarEm(m.janela, { modo: "sistema" });
    /* As janelas que abrem por cima do editor (confirmar exclusão,
       escolher o substituto, "Fechar janela?") ganham o mesmo tema
       legível: o rascunho fica só na página e na caixa de prévia. */
    var vigia = null;
    if (global.MutationObserver && document.body) {
      vigia = new MutationObserver(function (mudancas) {
        mudancas.forEach(function (mu) {
          Array.prototype.forEach.call(mu.addedNodes, function (no) {
            if (!no.classList || !no.classList.contains("r-fundo")) return;
            var janela = no.querySelector(".r-modal");
            if (janela && janela !== m.janela) T().aplicarEm(janela, { modo: "sistema" });
          });
        });
      });
      vigia.observe(document.body, { childList: true });
    }
    var botaoDesfazer = m.janela.querySelector(".tema-editor__desfazer");

    aberto = { fechar: m.fechar, janela: m.janela };
    desenharEscolhas();
    desenharEditor();
    atualizar();
    if (ehFicha) carregarTemasDaConta();

    /* ---- prévia ao vivo, um quadro por vez ---- */
    var agendado = false;
    function atualizar() {
      if (agendado) return;
      agendado = true;
      var quadro = global.requestAnimationFrame || function (fn) { return setTimeout(fn, 16); };
      quadro(function () {
        agendado = false;
        if (!aberto) return;
        var e = escolhaDoRascunho();
        T().definirPrevia(e);
        desfazerCaixa();
        desfazerCaixa = T().aplicarEm(caixa, e);
        desenharContraste();
        if (botaoDesfazer) botaoDesfazer.disabled = !alterado();
      });
    }

    function pintarEmUso() {
      if (ehFicha) {
        var a = M().normalizarAparencia(o.aparencia);
        emUso.textContent = a.modo === "conta"
          ? "Em uso agora: herdado da sua conta — " + nomeDaConta() + "."
          : "Em uso agora: tema próprio desta ficha — " + (a.modo === "personalizado" ? a.tema.nome : NOMES[a.modo]) + ".";
      } else {
        emUso.textContent = "Em uso agora: " + nomeDaConta() + ".";
      }
    }

    /* =================================================================
       ESCOLHAS
       ================================================================= */

    function opcao(valor, nome, descricao, tema, acoes) {
      var marcada = sel.modo === valor.modo && (valor.modo !== "personalizado" || ehFicha || sel.id === valor.id);
      var entrada = el("input", {
        type: "radio", name: grupoNome, checked: marcada,
        onchange: function () {
          if (!entrada.checked) return;
          sel = { modo: valor.modo, id: valor.id || null };
          desenharEscolhas();
          desenharEditor();
          atualizar();
          var nova = areaEscolhas.querySelector('input[name="' + grupoNome + '"]:checked');
          if (nova) nova.focus();
        },
      });
      return el("div.tema-opcao", { class: marcada ? "tema-opcao--marcada" : "" }, [
        el("label.tema-opcao__escolha", {}, [
          entrada,
          tema ? amostras(tema) : null,
          el("span.tema-opcao__textos", {}, [
            el("span.tema-opcao__nome", { texto: nome }),
            descricao ? el("span.tema-opcao__descricao", { texto: descricao }) : null,
          ]),
        ]),
        acoes && acoes.length ? el("span.tema-opcao__acoes", {}, acoes) : null,
      ]);
    }
    function botaoMini(texto, rotulo, aoClicar, desligado) {
      return el("button.r-botao.r-botao--mini.r-botao--fantasma", {
        type: "button", texto: texto, "aria-label": rotulo, title: rotulo, disabled: !!desligado || !podeSalvar,
        onclick: aoClicar,
      });
    }
    function cheio() { return !ehFicha && temas.length >= M().MAX_TEMAS; }

    function desenharEscolhas() {
      var blocos = [];
      var lista = [];

      if (ehFicha) {
        var conta = escolhaDaConta();
        lista.push(opcao({ modo: "conta" }, NOMES.conta, "Agora: " + nomeDaConta() + ". Cada pessoa vê a ficha com o tema da própria conta.", temaDaEscolha(conta)));
      }
      lista.push(opcao({ modo: "sistema" }, NOMES.sistema, "Claro ou escuro conforme o aparelho, mudando junto com ele.", temaDoModo("sistema")));
      blocos.push(el("fieldset.tema-grupo", {}, [el("legend.t-rotulo", { texto: ehFicha ? "Herdar" : "Automático" })].concat(lista)));

      blocos.push(el("fieldset.tema-grupo", {}, [el("legend.t-rotulo", { texto: "Temas prontos" })].concat(["claro", "escuro"].map(function (b) {
        return opcao({ modo: b }, NOMES[b], b === "claro" ? "Papel claro, tinta escura." : "Fundo escuro, texto claro.", temaDoModo(b), [
          botaoMini("Personalizar", "Criar um tema a partir do " + NOMES[b], function () { criarDe({ base: b, valores: {} }, null); }, cheio()),
        ]);
      }))));

      if (ehFicha) {
        var proprio = fichaTema
          ? [opcao({ modo: "personalizado" }, fichaTema.nome, "Tema próprio desta ficha (cópia independente).", fichaTema, [
              botaoMini("Duplicar", "Começar outro tema a partir deste", function () { criarDe(fichaTema, fichaTema.nome + " (cópia)"); }),
            ])]
          : [el("p.r-ajuda", { texto: "Esta ficha ainda não tem um tema próprio. Use “Personalizar” num tema pronto ou copie um tema da sua conta." })];
        blocos.push(el("fieldset.tema-grupo", {}, [el("legend.t-rotulo", { texto: "Tema próprio desta ficha" })].concat(proprio)));
        blocos.push(blocoDaConta());
      } else {
        var seus = temas.map(function (t) {
          return opcao({ modo: "personalizado", id: t.id }, t.nome, "Baseado no " + M().NOMES_BASE[t.base].toLowerCase() + ".", t, [
            botaoMini("Duplicar", "Duplicar " + t.nome, function () { criarDe(t, t.nome + " (cópia)"); }, cheio()),
            botaoMini("Excluir", "Excluir " + t.nome, function () { excluir(t); }),
          ]);
        });
        if (!seus.length) seus = [el("p.r-ajuda", { texto: "Nenhum tema seu ainda. Use “Personalizar” num tema pronto para começar." })];
        if (cheio()) seus.push(el("p.r-ajuda", { texto: "Limite de " + M().MAX_TEMAS + " temas por conta: exclua um para criar outro." }));
        blocos.push(el("fieldset.tema-grupo", {}, [el("legend.t-rotulo", { texto: "Seus temas" })].concat(seus)));
      }
      U.trocar(areaEscolhas, blocos);
    }

    /* Ficha: os temas da conta entram como cópia. */
    function blocoDaConta() {
      var corpo;
      if (temasDaConta === null) corpo = [el("p.r-ajuda", { texto: "Consultando os temas da sua conta…" })];
      else if (temasDaConta === false) corpo = [el("p.r-ajuda", { texto: "Não foi possível consultar os temas da sua conta agora. Os temas prontos continuam disponíveis." })];
      else if (!temasDaConta.length) corpo = [el("p.r-ajuda", { texto: "Sua conta não tem temas personalizados." })];
      else corpo = temasDaConta.map(function (t) {
        return el("div.tema-opcao", {}, [
          el("span.tema-opcao__escolha", {}, [amostras(t), el("span.tema-opcao__textos", {}, [el("span.tema-opcao__nome", { texto: t.nome })])]),
          el("span.tema-opcao__acoes", {}, [
            botaoMini("Usar uma cópia", "Usar nesta ficha uma cópia de " + t.nome, function () { criarDe(t, t.nome); }),
          ]),
        ]);
      });
      return el("fieldset.tema-grupo", {}, [el("legend.t-rotulo", { texto: "Copiar da sua conta" })].concat(corpo));
    }

    function carregarTemasDaConta() {
      var api = global.RAMAApi;
      if (!api || !api.lerPerfil) { temasDaConta = false; desenharEscolhas(); return; }
      Promise.resolve().then(function () { return api.lerPerfil(); }).then(function (r) {
        if (!aberto) return;
        temasDaConta = r && r.ok ? M().normalizarTemas(((r.dados || {}).preferencias || {}).temas) : false;
        desenharEscolhas();
      }, function () {
        if (!aberto) return;
        temasDaConta = false;
        desenharEscolhas();
      });
    }

    /* Um tema novo a partir de outro (pronto, da conta ou próprio). */
    async function criarDe(origem, nome) {
      if (ehFicha) {
        if (fichaTema && sel.modo === "personalizado") {
          var ok = await UI.confirmar({
            titulo: "Trocar o tema próprio?",
            texto: "Esta ficha só guarda um tema próprio. O atual (" + fichaTema.nome + ") será substituído no rascunho — nada é salvo antes de Aplicar.",
            rotuloConfirmar: "Substituir",
          });
          if (!ok || !aberto) return;
        }
        var copia = M().novoTema(origem, nome);
        delete copia.id;
        fichaTema = copia;
        sel = { modo: "personalizado", id: null };
      } else {
        if (cheio()) return;
        var novo = M().novoTema(origem, nome);
        temas.push(novo);
        sel = { modo: "personalizado", id: novo.id };
      }
      desenharEscolhas();
      desenharEditor();
      atualizar();
      var titulo = areaEditor.querySelector(".tema-personalizar__titulo");
      if (titulo) titulo.focus();
    }

    /* Excluir: o tema ativo precisa de um substituto, escolhido aqui. */
    async function excluir(t) {
      var ativoSalvo = prefs.tema === "personalizado" && prefs.temaAtivo === t.id;
      var selecionado = sel.modo === "personalizado" && sel.id === t.id;
      if (!ativoSalvo && !selecionado) {
        var ok = await UI.confirmar({
          titulo: "Excluir “" + t.nome + "”?",
          texto: "O tema sai da lista quando você salvar. Fichas que usam uma cópia dele não mudam.",
          rotuloConfirmar: "Excluir", perigo: true,
        });
        if (!ok || !aberto) return;
        temas = temas.filter(function (x) { return x.id !== t.id; });
      } else {
        var subst = await escolherSubstituto(t);
        if (!subst || !aberto) return;
        temas = temas.filter(function (x) { return x.id !== t.id; });
        sel = subst;
      }
      desenharEscolhas();
      desenharEditor();
      atualizar();
      var foco = areaEscolhas.querySelector('input[name="' + grupoNome + '"]:checked');
      if (foco) foco.focus();
    }

    function escolherSubstituto(t) {
      return new Promise(function (resolver) {
        var nome = uid("subst");
        var opcoes = [{ modo: "sistema", rotulo: NOMES.sistema }, { modo: "claro", rotulo: "Claro" }, { modo: "escuro", rotulo: "Escuro" }]
          .concat(temas.filter(function (x) { return x.id !== t.id; }).map(function (x) { return { modo: "personalizado", id: x.id, rotulo: x.nome }; }));
        var escolhida = 0;
        var decidido = false;
        UI.modal({
          titulo: "Excluir o tema em uso?",
          conteudo: el("div.pilha", {}, [
            el("p", { texto: "“" + t.nome + "” é o tema em uso. Escolha o que a conta passa a usar no lugar dele:" }),
            el("div.pilha.pilha--curta", { role: "radiogroup", "aria-label": "Tema que fica no lugar" }, opcoes.map(function (op, i) {
              return el("label.faixa", {}, [
                el("input", { type: "radio", name: nome, checked: i === 0, onchange: function () { escolhida = i; } }),
                el("span", { texto: op.rotulo }),
              ]);
            })),
            el("p.r-ajuda", { texto: "Nada é salvo antes de você salvar o editor." }),
          ]),
          botoes: [
            { rotulo: "Cancelar", classe: "r-botao--fantasma", aoClicar: function (f) { decidido = true; f(); resolver(null); } },
            { rotulo: "Excluir e usar este", classe: "r-botao--perigo", aoClicar: function (f) {
              decidido = true; f();
              var op = opcoes[escolhida];
              resolver({ modo: op.modo, id: op.id || null });
            } },
          ],
          aoFechar: function () { if (!decidido) resolver(null); },
        });
      });
    }

    /* =================================================================
       PERSONALIZAR
       ================================================================= */

    function desenharEditor() {
      linhas = {};
      var tema = temaSelecionado();
      if (!tema) {
        U.trocar(areaEditor, sel.modo === "personalizado" ? [] : [
          el("p.r-ajuda", { texto: "Para mudar cores, use “Personalizar” num tema pronto" + (ehFicha ? " ou copie um tema da sua conta." : " ou escolha um dos seus temas.") }),
        ]);
        return;
      }
      var idNome = uid("nome"), idBase = uid("base");
      var entradaNome = el("input.r-entrada", {
        id: idNome, type: "text", maxlength: M().MAX_NOME, value: tema.nome, disabled: !podeSalvar,
        oninput: function () {
          var limpo = entradaNome.value.replace(/[\u0000-\u001F\u007F<>]/g, "").slice(0, M().MAX_NOME);
          tema.nome = limpo.trim() || "Tema personalizado";
          var titulo = areaEditor.querySelector(".tema-personalizar__titulo");
          if (titulo) titulo.textContent = "Personalizar “" + tema.nome + "”";
          atualizar();
        },
        onchange: function () { desenharEscolhas(); },
      });
      var base = el("select.r-selecao", {
        id: idBase, disabled: !podeSalvar,
        onchange: function () { tema.base = base.value === "escuro" ? "escuro" : "claro"; desenharEditor(); atualizar(); },
      }, ["claro", "escuro"].map(function (b) { return el("option", { value: b, texto: M().NOMES_BASE[b], selected: tema.base === b }); }));

      var categorias = M().CATEGORIAS.map(function (cat) { return categoria(tema, cat); });

      U.trocar(areaEditor, [
        el("h3.t-secao.tema-personalizar__titulo", { tabindex: "-1", texto: "Personalizar “" + tema.nome + "”" }),
        el("div.tema-personalizar__topo", {}, [
          el("div.r-campo", {}, [el("label", { for: idNome, texto: "Nome do tema" }), entradaNome]),
          el("div.r-campo", {}, [
            el("label", { for: idBase, texto: "Base" }), base,
            el("p.r-ajuda", { texto: "O que você não mudar segue a base." }),
          ]),
        ]),
        el("div.tema-categorias", {}, categorias),
      ]);
    }

    function categoria(tema, cat) {
      var tokens = M().TOKENS.filter(function (t) { return t.cat === cat.chave; });
      var simples = tokens.filter(function (t) { return !t.avancado; });
      var avancados = tokens.filter(function (t) { return t.avancado; });
      var proprios = tokens.filter(function (t) { return tema.valores[t.chave]; }).length;
      var corpo = [el("p.r-ajuda", { texto: cat.ajuda })].concat(simples.map(function (t) { return linha(tema, t); }));
      if (avancados.length) {
        corpo.push(UI.recolhivel({
          titulo: "Mais opções",
          aberto: !!abertas[cat.chave + ":avancado"],
          aoAlternar: function (v) { abertas[cat.chave + ":avancado"] = v; },
          conteudo: avancados.map(function (t) { return linha(tema, t); }),
        }));
      }
      if (podeSalvar) corpo.push(el("button.r-botao.r-botao--mini.r-botao--fantasma", {
        type: "button", texto: "Restaurar esta categoria", disabled: !proprios,
        "aria-label": "Restaurar " + cat.rotulo + " para a base",
        onclick: function () {
          tokens.forEach(function (t) { delete tema.valores[t.chave]; });
          desenharEditor();
          atualizar();
        },
      }));
      return UI.recolhivel({
        titulo: cat.rotulo,
        extra: proprios ? proprios + (proprios === 1 ? " mudança" : " mudanças") : "",
        aberto: !!abertas[cat.chave],
        aoAlternar: function (v) { abertas[cat.chave] = v; },
        classe: "tema-categoria",
        conteudo: corpo,
      });
    }

    /* Uma propriedade. Mudanças de valor atualizam a prévia sem refazer
       a linha (o foco e o arraste ficam); mudanças de forma (tipo,
       pontos, restaurar) refazem só esta linha. */
    function linha(tema, token) {
      var res = M().valoresResolvidos(tema)[token.chave];
      var proprio = tema.valores[token.chave];
      var idPrincipal = uid("prop");
      var amostra = el("span.tema-prop__amostra", { "aria-hidden": "true" });
      var erro = el("p.r-ajuda.t-erro.tema-prop__erro", { role: "alert", hidden: true });

      function pintarAmostra() {
        var r = M().valoresResolvidos(tema)[token.chave];
        if (token.num) amostra.style.setProperty("opacity", String(r.num));
        amostra.style.setProperty("background", token.num ? "var(--cor-vida)" : r.preenchimento);
      }
      function refazer() {
        var antiga = linhas[token.chave];
        var nova = linha(tema, token);
        if (antiga && antiga.parentNode) antiga.parentNode.replaceChild(nova, antiga);
        var cat = nova.closest(".tema-categoria");
        if (cat) atualizarContagem(cat, token.cat, tema);
        atualizar();
      }
      function mudou() { pintarAmostra(); atualizar(); }
      /* O valor próprio, criado a partir do herdado na primeira mudança. */
      function proprioOuNovo() {
        if (!tema.valores[token.chave]) tema.valores[token.chave] = clonar(res.valor);
        return tema.valores[token.chave];
      }

      var controles;
      var tipoAtual = (proprio || res.valor).tipo;
      if (token.num) {
        var saida = el("output.t-mini", { texto: Math.round(res.num * 100) + "%" });
        controles = el("div.tema-prop__controles", {}, [
          el("input.tema-prop__faixa", {
            id: idPrincipal, type: "range", min: token.num[0], max: token.num[1], step: token.num[2], value: res.num, disabled: !podeSalvar,
            oninput: function (ev) {
              var v = proprioOuNovo();
              v.tipo = "num";
              v.valor = Number(ev.target.value);
              saida.textContent = Math.round(v.valor * 100) + "%";
              marcarProprio();
              mudou();
            },
          }),
          saida,
        ]);
      } else if (tipoAtual === "linear" || tipoAtual === "radial") {
        controles = editorDeGradiente(proprio || res.valor, idPrincipal, function () { marcarProprio(); mudou(); }, refazer, proprioOuNovo);
      } else {
        controles = editorDeCor(proprio || res.valor, token.alfa, idPrincipal, token.rotulo, erro, function (cor, alfa) {
          var v = proprioOuNovo();
          v.tipo = "cor"; v.cor = cor; v.alfa = token.alfa ? alfa : 1;
          delete v.pontos; delete v.angulo; delete v.forma; delete v.x; delete v.y;
          marcarProprio();
          mudou();
        });
      }

      var seletorTipo = null;
      if (token.gradiente) {
        seletorTipo = el("select.r-selecao.tema-prop__tipo", {
          "aria-label": "Preenchimento: " + token.rotulo, disabled: !podeSalvar,
          onchange: function () { converter(seletorTipo.value); refazer(); },
        }, [["cor", "Cor sólida"], ["linear", "Gradiente linear"], ["radial", "Gradiente radial"]].map(function (p) {
          return el("option", { value: p[0], texto: p[1], selected: tipoAtual === p[0] });
        }));
      }
      function converter(para) {
        var atual = tema.valores[token.chave] || clonar(res.valor);
        var novo;
        if (para === "cor") {
          var media = atual.pontos ? M().mediaDoGradiente(atual.pontos) : { cor: atual.cor, alfa: atual.alfa };
          novo = { tipo: "cor", cor: media.cor, alfa: media.alfa };
        } else {
          var pontos = atual.pontos ? clonar(atual.pontos)
            : [{ cor: atual.cor, alfa: atual.alfa === undefined ? 1 : atual.alfa, pos: 0 }, { cor: vizinha(atual.cor), alfa: atual.alfa === undefined ? 1 : atual.alfa, pos: 100 }];
          novo = para === "linear" ? { tipo: "linear", angulo: atual.angulo === undefined ? 180 : atual.angulo, pontos: pontos }
            : { tipo: "radial", forma: atual.forma || "elipse", x: atual.x === undefined ? 50 : atual.x, y: atual.y === undefined ? 50 : atual.y, pontos: pontos };
        }
        tema.valores[token.chave] = novo;
      }

      var herdadoTexto = el("span.t-mini.tema-prop__origem", { texto: proprio ? "" : "da base" });
      var restaurar = podeSalvar ? el("button.r-botao.r-botao--mini.r-botao--fantasma", {
        type: "button", texto: "Restaurar", hidden: !proprio,
        "aria-label": "Restaurar " + token.rotulo + " para a base",
        onclick: function () { delete tema.valores[token.chave]; refazer(); },
      }) : null;
      function marcarProprio() {
        herdadoTexto.textContent = "";
        if (restaurar) restaurar.hidden = false;
      }

      var no = el("div.tema-prop", { dataset: { chave: token.chave } }, [
        el("div.tema-prop__topo", {}, [
          amostra,
          el("label.tema-prop__rotulo", { for: idPrincipal, texto: token.rotulo }),
          herdadoTexto,
          seletorTipo,
          restaurar,
        ]),
        controles,
        erro,
      ]);
      pintarAmostra();
      linhas[token.chave] = no;
      return no;
    }

    function atualizarContagem(caixaCat, chaveCat, tema) {
      var n = M().TOKENS.filter(function (t) { return t.cat === chaveCat && tema.valores[t.chave]; }).length;
      var extra = caixaCat.querySelector(".recolhivel__extra");
      if (extra) extra.textContent = n ? n + (n === 1 ? " mudança" : " mudanças") : "";
    }

    /* Seletor visual + texto (#rgb, #rrggbb, rgb(), rgba()) + opacidade. */
    function editorDeCor(valor, comAlfa, id, rotulo, erro, aoMudar) {
      var cor = valor.cor, alfa = valor.alfa === undefined ? 1 : valor.alfa;
      var visual = el("input.tema-cor__visual", {
        type: "color", value: cor, "aria-label": "Escolher a cor: " + rotulo, disabled: !podeSalvar,
        oninput: function () {
          cor = visual.value.toLowerCase();
          texto.value = textoCor({ cor: cor, alfa: alfa });
          limpar();
          aoMudar(cor, alfa);
        },
      });
      var texto = el("input.r-entrada.tema-cor__texto", {
        id: id, type: "text", value: textoCor({ cor: cor, alfa: alfa }), maxlength: 32, spellcheck: "false", autocomplete: "off",
        "aria-describedby": erro.id || (erro.id = uid("erro")), disabled: !podeSalvar,
        oninput: function () {
          var lido = M().lerCorDigitada(texto.value);
          if (!lido) {
            texto.setAttribute("aria-invalid", "true");
            texto.classList.add("r-entrada--erro");
            erro.textContent = "Cor não reconhecida. Use #RRGGBB, #RGB ou rgb(…). A cor anterior continua valendo.";
            erro.hidden = false;
            return;
          }
          limpar();
          cor = lido.cor;
          if (comAlfa) { alfa = lido.alfa; if (faixa) { faixa.value = Math.round(alfa * 100); saida.textContent = Math.round(alfa * 100) + "%"; } }
          visual.value = cor;
          aoMudar(cor, alfa);
        },
        onchange: function () { if (texto.getAttribute("aria-invalid") !== "true") texto.value = textoCor({ cor: cor, alfa: alfa }); },
      });
      function limpar() {
        texto.removeAttribute("aria-invalid");
        texto.classList.remove("r-entrada--erro");
        erro.hidden = true;
      }
      var faixa = null, saida = null;
      if (comAlfa) {
        saida = el("output.t-mini", { texto: Math.round(alfa * 100) + "%" });
        faixa = el("input.tema-prop__faixa", {
          type: "range", min: 0, max: 100, step: 1, value: Math.round(alfa * 100), disabled: !podeSalvar,
          "aria-label": "Opacidade: " + rotulo,
          oninput: function () {
            alfa = Number(faixa.value) / 100;
            saida.textContent = faixa.value + "%";
            texto.value = textoCor({ cor: cor, alfa: alfa });
            limpar();
            aoMudar(cor, alfa);
          },
        });
      }
      return el("div.tema-prop__controles", {}, [visual, texto, faixa ? el("span.tema-cor__alfa", {}, [el("span.t-mini", { texto: "Opacidade" }), faixa, saida]) : null]);
    }

    /* Gradiente: tipo, ângulo ou centro e forma, e os pontos. */
    function editorDeGradiente(valor, id, aoMudar, refazer, proprioOuNovo) {
      var barra = el("div.tema-grad__barra", { "aria-hidden": "true" });
      function v() { return proprioOuNovo(); }
      function pintarBarra() {
        var atual = v();
        var limpo = M().normalizarValor({ gradiente: true, alfa: true }, atual);
        if (limpo) barra.style.setProperty("background", M().cssGradiente(Object.assign({}, limpo, { tipo: "linear", angulo: 90 })));
      }
      function mudou() { pintarBarra(); aoMudar(); }
      var partes = [barra];

      if (valor.tipo === "linear") {
        var saidaAng = el("output.t-mini", { texto: (valor.angulo === undefined ? 180 : valor.angulo) + "°" });
        partes.push(el("label.tema-grad__campo", {}, [
          el("span.t-mini", { texto: "Ângulo" }),
          el("input.tema-prop__faixa", {
            id: id, type: "range", min: 0, max: 360, step: 1, value: valor.angulo === undefined ? 180 : valor.angulo, disabled: !podeSalvar,
            oninput: function (ev) { v().angulo = Number(ev.target.value); saidaAng.textContent = ev.target.value + "°"; mudou(); },
          }),
          saidaAng,
        ]));
      } else {
        partes.push(el("label.tema-grad__campo", {}, [
          el("span.t-mini", { texto: "Forma" }),
          el("select.r-selecao", {
            id: id, disabled: !podeSalvar,
            onchange: function (ev) { v().forma = ev.target.value === "circulo" ? "circulo" : "elipse"; mudou(); },
          }, [["elipse", "Elipse"], ["circulo", "Círculo"]].map(function (p) { return el("option", { value: p[0], texto: p[1], selected: (valor.forma || "elipse") === p[0] }); })),
        ]));
        [["x", "Centro na horizontal"], ["y", "Centro na vertical"]].forEach(function (eixo) {
          var atual = valor[eixo[0]] === undefined ? 50 : valor[eixo[0]];
          var saida = el("output.t-mini", { texto: atual + "%" });
          partes.push(el("label.tema-grad__campo", {}, [
            el("span.t-mini", { texto: eixo[1] }),
            el("input.tema-prop__faixa", {
              type: "range", min: 0, max: 100, step: 1, value: atual, disabled: !podeSalvar,
              oninput: function (ev) { v()[eixo[0]] = Number(ev.target.value); saida.textContent = ev.target.value + "%"; mudou(); },
            }),
            saida,
          ]));
        });
      }

      var pontos = el("ol.tema-grad__pontos");
      valor.pontos.forEach(function (p, i) {
        var erro = el("p.r-ajuda.t-erro", { role: "alert", hidden: true });
        var rotulo = "ponto " + (i + 1);
        var saidaPos = el("output.t-mini", { texto: p.pos + "%" });
        pontos.appendChild(el("li.tema-grad__ponto", {}, [
          el("span.t-mini.tema-grad__nome", { texto: "Ponto " + (i + 1) }),
          editorDeCor(p, true, uid("ponto"), rotulo, erro, function (cor, alfa) {
            var alvo = v().pontos[i];
            alvo.cor = cor; alvo.alfa = alfa;
            mudou();
          }),
          el("span.tema-cor__alfa", {}, [
            el("span.t-mini", { texto: "Posição" }),
            el("input.tema-prop__faixa", {
              type: "range", min: 0, max: 100, step: 1, value: p.pos, "aria-label": "Posição do " + rotulo, disabled: !podeSalvar,
              oninput: function (ev) { v().pontos[i].pos = Number(ev.target.value); saidaPos.textContent = ev.target.value + "%"; mudou(); },
            }),
            saidaPos,
          ]),
          podeSalvar ? el("button.r-botao.r-botao--mini.r-botao--fantasma", {
            type: "button", texto: "Remover", "aria-label": "Remover o " + rotulo, disabled: valor.pontos.length <= 2,
            onclick: function () { v().pontos.splice(i, 1); refazer(); },
          }) : null,
          erro,
        ]));
      });
      partes.push(pontos);

      if (podeSalvar) partes.push(el("button.r-botao.r-botao--mini", {
        type: "button", texto: "Adicionar ponto", disabled: valor.pontos.length >= M().MAX_PONTOS,
        title: valor.pontos.length >= M().MAX_PONTOS ? "No máximo " + M().MAX_PONTOS + " pontos" : "",
        onclick: function () {
          var lista = v().pontos.slice().sort(function (a, b) { return a.pos - b.pos; });
          /* No meio do maior vão, com a cor do ponto anterior. */
          var melhor = 0, vao = -1;
          for (var k = 0; k < lista.length - 1; k++) {
            if (lista[k + 1].pos - lista[k].pos > vao) { vao = lista[k + 1].pos - lista[k].pos; melhor = k; }
          }
          var a = lista[melhor], b = lista[melhor + 1] || a;
          v().pontos.push({ cor: a.cor, alfa: a.alfa, pos: Math.round((a.pos + b.pos) / 2) });
          v().pontos.sort(function (x, y) { return x.pos - y.pos; });
          refazer();
        },
      }));

      var caixaGrad = el("div.tema-prop__controles.tema-grad", {}, partes);
      pintarBarra();
      return caixaGrad;
    }

    /* =================================================================
       CONTRASTE
       ================================================================= */

    function desenharContraste() {
      var e = escolhaDoRascunho();
      var tema = temaDaEscolha(e);
      var personal = e.modo === "personalizado" && !!e.tema;
      var lista = M().avaliarContraste(tema);
      var falhas = lista.filter(function (p) { return !p.ok; });
      var itens = [el("h3.t-rotulo", { texto: "Leitura" })];
      itens.push(el("p.t-mini", { texto: (lista.length - falhas.length) + " de " + lista.length + " combinações conferidas passam no contraste mínimo." }));
      if (falhas.length) {
        itens.push(el("ul.tema-contraste__lista", {}, falhas.map(function (p) {
          var tokFrente = M().token(p.frente);
          var onde = p.regioes > 1 ? " (na parte em " + p.onde + " do gradiente)" : "";
          var podeSugerir = personal && p.sugestao && podeSalvar && temaSelecionado() === e.tema;
          var amostraSug = null;
          if (podeSugerir) { amostraSug = el("span.tema-amostras__cor", { "aria-hidden": "true" }); amostraSug.style.setProperty("background", p.sugestao); }
          return el("li", {}, [
            el("span", { texto: p.rotulo + ": " + String(p.razao).replace(".", ",") + ":1, mínimo " + String(p.minimo).replace(".", ",") + ":1" + onde + "." }),
            podeSugerir ? el("button.r-botao.r-botao--mini", {
              type: "button",
              "aria-label": "Usar a sugestão " + p.sugestao + " em " + tokFrente.rotulo,
              onclick: function () {
                var t = temaSelecionado();
                if (!t) return;
                t.valores[p.frente] = { tipo: "cor", cor: p.sugestao, alfa: 1 };
                var antiga = linhas[p.frente];
                if (antiga && antiga.parentNode) antiga.parentNode.replaceChild(linha(t, tokFrente), antiga);
                atualizar();
              },
            }, [amostraSug, el("span", { texto: "Usar sugestão " + p.sugestao })])
              : (personal && !p.sugestao && p.regioes > 1 ? el("span.t-mini", { texto: "Nenhuma cor única se lê em todas as partes deste gradiente: aproxime as cores dele." }) : null),
          ]);
        })));
        itens.push(el("p.r-ajuda", { texto: "As sugestões só entram se você clicar. Contraste baixo não impede salvar." }));
      }
      U.trocar(areaContraste, itens);
    }

    /* =================================================================
       DESFAZER, SALVAR, APLICAR
       ================================================================= */

    function desfazer() {
      var f = JSON.parse(inicial);
      sel = f.sel; temas = f.temas; fichaTema = f.fichaTema;
      erroSalvar.hidden = true;
      desenharEscolhas();
      desenharEditor();
      atualizar();
      var foco = areaEscolhas.querySelector('input[name="' + grupoNome + '"]:checked');
      if (foco) foco.focus();
    }

    function mostrarErro(texto) {
      erroSalvar.textContent = texto;
      erroSalvar.hidden = false;
    }

    function salvarConta(fechar) {
      if (salvando) return null;
      var lista = M().normalizarTemas(temas);
      var modo = sel.modo, ativo = null;
      if (modo === "personalizado") {
        ativo = sel.id;
        if (!lista.some(function (t) { return t.id === ativo; })) { modo = "sistema"; ativo = null; }
      }
      salvando = true;
      erroSalvar.hidden = true;
      return T().salvarConta({ tema: modo, temaAtivo: ativo, temas: lista }).then(function (r) {
        salvando = false;
        if (!r || !r.ok) {
          var f = global.RAMAApi && global.RAMAApi.frase ? global.RAMAApi.frase(r || {}) : null;
          mostrarErro("O tema não foi salvo" + (f ? ": " + f.titulo + " — " + f.texto : ".") + " A conta continua com o tema anterior; o rascunho segue aberto.");
          return;
        }
        inicial = foto();
        fechar({ ok: true, preferencias: r.preferencias });
        UI.avisoOk("Tema salvo na conta.");
        if (o.aoSalvar) o.aoSalvar(r.preferencias);
      });
    }

    function aplicarFicha(fechar) {
      if (salvando || !o.aplicar) return null;
      var aparencia = sel.modo === "personalizado" && fichaTema
        ? M().normalizarAparencia({ v: 1, modo: "personalizado", tema: fichaTema })
        : M().normalizarAparencia({ v: 1, modo: sel.modo === "personalizado" ? "conta" : sel.modo });
      salvando = true;
      erroSalvar.hidden = true;
      return Promise.resolve().then(function () { return o.aplicar(aparencia); }).then(function (r) {
        salvando = false;
        r = r || {};
        inicial = foto();
        fechar({ ok: !!r.ok, pendente: !!r.pendente });
        if (r.ok) UI.avisoOk("Tema da ficha salvo.");
        else if (r.pendente) UI.avisoAtencao("Tema aplicado nesta ficha, mas ainda não salvo no servidor. O salvamento automático continua tentando — acompanhe o indicador da ficha.", { duracao: 9000 });
        else UI.avisoErro("Tema aplicado nesta página, mas não foi salvo" + (r.texto ? ": " + r.texto : ".") + " Veja o aviso de gravação da ficha.");
      }, function () {
        salvando = false;
        mostrarErro("Não foi possível aplicar o tema. Nada foi alterado.");
      });
    }

    return aberto;
  }

  /* A caixa de prévia: um pedaço de cada coisa que o tema pinta. Só para
     ver (inert): nada aqui recebe clique ou foco. */
  function montarPrevia(caixa) {
    function barra(nome, cor, pct) {
      var b = el("div.tema-previa__barra");
      b.style.setProperty("--previa-cor", "var(" + cor + ")");
      var p = el("span.tema-previa__barra-cheia");
      p.style.setProperty("width", pct + "%");
      b.appendChild(p);
      b.appendChild(el("span.tema-previa__barra-texto", { texto: nome + " " + pct + "/100" }));
      return b;
    }
    function marca(nome, cor) {
      var s = el("span.tema-previa__elemento", { texto: nome });
      s.style.setProperty("border-left-color", "var(" + cor + ")");
      return s;
    }
    U.anexar(caixa, [
      el("div.tema-previa__topo", {}, [
        el("strong", { texto: "R.A.M.A." }),
        el("span.tema-previa__nav", {}, [
          el("a", { href: "#", tabindex: "-1", texto: "Link" }),
          el("span.tema-previa__aba", { texto: "Selecionado" }),
        ]),
      ]),
      el("div.tema-previa__cartao", {}, [
        el("strong.tema-previa__titulo", { texto: "Agente de exemplo" }),
        el("p.tema-previa__corpo", { texto: "Texto do corpo da ficha." }),
        el("p.tema-previa__apoio", { texto: "Texto de apoio · Registro 0000" }),
        el("input.r-entrada", { type: "text", tabindex: "-1", placeholder: "Dica em campo vazio" }),
        el("div.tema-previa__botoes", {}, [
          el("button.r-botao.r-botao--principal", { type: "button", tabindex: "-1", texto: "Principal" }),
          el("button.r-botao", { type: "button", tabindex: "-1", texto: "Comum" }),
          el("button.r-botao", { type: "button", tabindex: "-1", disabled: true, texto: "Desligado" }),
          el("span.tema-previa__foco", { texto: "Foco" }),
        ]),
        barra("PV", "--cor-vida", 70),
        barra("PE", "--cor-esforco", 45),
        barra("SAN", "--cor-sanidade", 90),
        el("div.tema-previa__estados", {}, [
          el("span.tema-previa__estado", { dataset: { tipo: "ok" }, texto: "Salvo" }),
          el("span.tema-previa__estado", { dataset: { tipo: "aviso" }, texto: "Aviso" }),
          el("span.tema-previa__estado", { dataset: { tipo: "erro" }, texto: "Erro" }),
          el("span.tema-previa__estado", { dataset: { tipo: "paranormal" }, texto: "Paranormal" }),
        ]),
        el("div.tema-previa__elementos", {}, [
          marca("Sangue", "--cor-elemento-sangue"), marca("Morte", "--cor-elemento-morte"),
          marca("Conhecimento", "--cor-elemento-conhecimento"), marca("Energia", "--cor-elemento-energia"),
          marca("Medo", "--cor-elemento-medo"),
          el("span.tema-previa__grau", { texto: "Treinado" }),
        ]),
      ]),
      el("div.tema-previa__secundaria", { texto: "Área secundária" }),
    ]);
  }

  global.RAMATemaEditor = { abrir: abrir, aberto: function () { return !!aberto; } };
})(window);
