/* =====================================================================
   R.A.M.A. — motor dos tutoriais (tutorial inicial e percursos por sistema)
   ---------------------------------------------------------------------
   Um cartão de etapas que acompanha a ficha de DEMONSTRAÇÃO
   (js/paginas/ficha.js, ?tutorial=inicial ou ?demo=<sistema>). Ele não
   tem controles próprios de ficha: aponta para os controles de verdade,
   destaca o alvo e observa a ação acontecer (eventos "rama:demo" que a
   ficha de demonstração emite).

   O CONTEÚDO não mora aqui: js/ajuda/tutorial-inicial.js e
   js/ajuda/tutoriais-sistemas.js descrevem as etapas, carregados sob
   demanda. Cada etapa:

     { id, titulo, texto: [parágrafos], tarefa: "o que fazer",
       alvo: function () → elemento a destacar,
       esperar: function (api) { ...; api.feito(); } → limpeza opcional,
       conteudo: function (api) → elemento extra no cartão,
       aoEntrar(api), aoSair(api), final: true }

   OBRIGATÓRIO × REVISÃO. O tutorial inicial de uma conta sem conclusão
   gravada é obrigatório: sem "Encerrar", sem Escape, sem clique de fora,
   e os links que levariam a outra página são segurados. Sair da conta
   continua no menu do agente. Na revisão (Ajuda → Refazer) e nos
   percursos por sistema, "Encerrar" volta à Ajuda a qualquer momento e
   nada é gravado na conta.

   Nada aqui guarda progresso: recarregar recomeça da primeira etapa,
   com a demonstração refeita.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el;
  function UI() { return global.RAMAUI; }

  /* ---------------- scripts sob demanda ---------------- */

  var carregados = {};
  function carregarUm(caminho) {
    if (carregados[caminho]) return carregados[caminho];
    carregados[caminho] = new Promise(function (ok, falha) {
      var s = document.createElement("script");
      s.src = U.url(caminho) + (global.RAMAVersion ? "?v=" + encodeURIComponent(global.RAMAVersion.numero) : "");
      s.async = false;
      s.onload = function () { ok(); };
      s.onerror = function () { delete carregados[caminho]; falha(new Error("não carregou: " + caminho)); };
      document.head.appendChild(s);
    });
    return carregados[caminho];
  }
  function carregar(lista) {
    return (lista || []).reduce(function (p, c) { return p.then(function () { return carregarUm(c); }); }, Promise.resolve());
  }

  /* ---------------- o cartão ---------------- */

  function rodar(config) {
    var c = config || {};
    var passos = c.passos || [];
    var obrigatorio = !!c.obrigatorio;
    var indice = 0;
    var feitos = {};
    var limpezas = [];
    var alvoAtual = null;
    var encerrado = false;
    var recolhido = false;

    var etapa = el("span.tut__etapa");
    var trilha = el("ol.tut__trilha", { "aria-hidden": "true" }, passos.map(function () { return el("li"); }));
    var titulo = el("h2.tut__titulo", { id: "tut-titulo", tabindex: "-1" });
    var texto = el("div.tut__texto");
    var conteudo = el("div.tut__conteudo");
    var tarefa = el("p.tut__tarefa", { role: "status", "aria-live": "polite" });
    var bVoltar = el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Voltar", onclick: function () { ir(indice - 1); } });
    var bAlvo = el("button.r-botao.r-botao--mini", { type: "button", texto: "Ir para o controle", onclick: irParaAlvo });
    var bProximo = el("button.r-botao.r-botao--mini.r-botao--principal", { type: "button", texto: "Próximo", onclick: function () { ir(indice + 1); } });
    var bRecolher = el("button.r-botao.r-botao--mini.r-botao--fantasma.tut__recolher", {
      type: "button", "aria-expanded": "true", texto: "Recolher",
      onclick: function () { definirRecolhido(!recolhido); },
    });
    var bEncerrar = obrigatorio ? null : el("button.r-botao.r-botao--mini.r-botao--fantasma", {
      type: "button", texto: "Encerrar", "aria-label": "Encerrar " + (c.nome || "o tutorial"),
      onclick: function () { encerrar(); },
    });

    var cartao = el("section.tut", {
      role: "dialog", "aria-modal": "false", "aria-labelledby": "tut-titulo",
      dataset: { obrigatorio: obrigatorio ? "sim" : "nao" },
    }, [
      el("div.tut__topo", {}, [el("span.tut__nome", { texto: c.nome || "Tutorial" }), etapa, el("span.tut__espaco"), bRecolher, bEncerrar]),
      trilha,
      titulo,
      el("div.tut__corpo", {}, [texto, conteudo]),
      tarefa,
      el("div.tut__botoes", {}, [bVoltar, bAlvo, el("span.tut__espaco"), bProximo]),
    ]);

    /* Teclado: um atalho no topo da página leva ao cartão a qualquer hora. */
    var atalho = el("a.pular-para.tut__atalho", { href: "#tut-titulo", texto: "Ir para o tutorial",
      onclick: function (ev) { ev.preventDefault(); definirRecolhido(false); titulo.focus(); } });

    document.body.appendChild(cartao);
    document.body.insertBefore(atalho, document.body.firstChild);
    document.body.classList.add("com-tutorial");

    function definirRecolhido(v) {
      recolhido = !!v;
      cartao.classList.toggle("tut--recolhido", recolhido);
      bRecolher.textContent = recolhido ? "Mostrar" : "Recolher";
      bRecolher.setAttribute("aria-expanded", String(!recolhido));
    }

    /* Uma janela de verdade aberta (o teste, um detalhe) ganha a frente:
       o cartão vai para baixo do véu dela e volta quando ela fecha — nunca
       cobre o botão que a etapa pede. */
    var estreito = global.matchMedia ? global.matchMedia("(max-width: 760px)") : null;
    var vigiaJanelas = new MutationObserver(function () {
      cartao.classList.toggle("tut--sob-janela", !!document.querySelector(".r-fundo:not(.r-fundo--saindo)"));
    });
    vigiaJanelas.observe(document.body, { childList: true });

    /* O alvo pode ser redesenhado a qualquer momento (a ficha troca
       regiões inteiras): o destaque é reaplicado ao novo elemento. */
    var pendenteDestaque = false;
    var vigiaAlvo = new MutationObserver(function () {
      if (pendenteDestaque) return;
      pendenteDestaque = true;
      requestAnimationFrame(function () { pendenteDestaque = false; destacar(false); });
    });
    var raizDaFicha = document.getElementById("ficha") || document.body;
    vigiaAlvo.observe(raizDaFicha, { childList: true, subtree: true });

    function alvoDoPasso() {
      var p = passos[indice];
      if (!p || !p.alvo) return null;
      try { return p.alvo() || null; } catch (e) { return null; }
    }

    function destacar(rolar) {
      var novo = alvoDoPasso();
      if (alvoAtual && alvoAtual !== novo) alvoAtual.classList.remove("tut-alvo");
      alvoAtual = novo;
      bAlvo.hidden = !novo;
      if (!novo) return;
      novo.classList.add("tut-alvo");
      if (rolar) rolarAte(novo);
      ajustarLado(novo);
    }

    /* No computador o cartão fica num canto de baixo; se ele cobriria o
       controle da etapa, troca de canto (e o dado vai para o outro). */
    function ajustarLado(n) {
      if (!n || (estreito && estreito.matches)) { document.body.classList.remove("tut-cartao-esquerda"); return; }
      var r = n.getBoundingClientRect();
      var esquerda = document.body.classList.contains("tut-cartao-esquerda");
      var largura = cartao.offsetWidth + 32;
      var topoCartao = global.innerHeight - cartao.offsetHeight - 32;
      if (r.bottom < topoCartao) return;
      var cobreDireita = r.right > global.innerWidth - largura;
      var cobreEsquerda = r.left < largura;
      if (!esquerda && cobreDireita && !cobreEsquerda) document.body.classList.add("tut-cartao-esquerda");
      else if (esquerda && cobreEsquerda && !cobreDireita) document.body.classList.remove("tut-cartao-esquerda");
    }
    global.addEventListener("resize", function () { if (!encerrado) ajustarLado(alvoAtual); });

    function rolarAte(n) {
      var r = n.getBoundingClientRect();
      var alturaCartao = estreito && estreito.matches && !recolhido ? cartao.offsetHeight : 0;
      var fundoUtil = global.innerHeight - alturaCartao;
      if (r.top < 70 || r.bottom > fundoUtil - 8) {
        /* Centro da parte da tela que o cartão não cobre. */
        var alvoTopo = Math.max(70, (fundoUtil - Math.min(r.height, fundoUtil - 80)) / 2);
        global.scrollBy({ top: r.top - alvoTopo, behavior: "auto" });
      }
    }

    function irParaAlvo() {
      var n = alvoDoPasso();
      if (!n) return;
      if (estreito && estreito.matches) definirRecolhido(true);
      rolarAte(n);
      var focavel = n.matches("button, a[href], input, select, textarea, summary, [tabindex]") ? n
        : n.querySelector("button, a[href], input, select, textarea, summary, [tabindex]");
      if (focavel) { try { focavel.focus({ preventScroll: true }); } catch (e) { focavel.focus(); } }
    }

    var api = {
      el: el, UI: UI(), U: U,
      obrigatorio: obrigatorio,
      ficha: function () { return global.RAMAFichaDemo; },
      cartao: cartao,
      feito: function () { marcarFeito(indice); },
      proximo: function () { ir(indice + 1); },
      ir: function (i) { ir(i); },
      encerrar: function () { encerrar(); },
      redesenhar: function () { pintar(false); },
      destacar: function () { destacar(true); },
      recolher: function (v) { definirRecolhido(v); },
      /* Ouve "rama:demo" (tipo, detalhe) enquanto a etapa estiver aberta. */
      ouvir: function (tipo, fn) {
        function h(ev) { var d = ev.detail || {}; if (!tipo || d.tipo === tipo) fn(d); }
        document.addEventListener("rama:demo", h);
        limpezas.push(function () { document.removeEventListener("rama:demo", h); });
      },
      aoSair: function (fn) { limpezas.push(fn); },
    };

    function marcarFeito(i) {
      if (feitos[i]) return;
      feitos[i] = true;
      if (i === indice) pintarTarefa();
    }

    function pintarTarefa() {
      var p = passos[indice];
      var pratica = !!(p && p.tarefa);
      var feito = !pratica || !!feitos[indice];
      tarefa.hidden = !pratica;
      if (pratica) {
        tarefa.className = "tut__tarefa" + (feito ? " tut__tarefa--feita" : "");
        U.trocar(tarefa, feito
          ? [el("span", { "aria-hidden": "true", texto: "✓ " }), el("span", { texto: "Feito! " + (p.feitoTexto || "Pode seguir para a próxima etapa.") })]
          : [el("span.tut__tarefa-rotulo", { texto: "Para avançar: " }), el("span", { texto: p.tarefa })]);
      }
      bProximo.disabled = !feito;
      bProximo.hidden = !!(p && p.final);
      if (p && p.rotuloProximo) bProximo.textContent = p.rotuloProximo; else bProximo.textContent = "Próximo";
    }

    function limpar() {
      limpezas.splice(0).forEach(function (fn) { try { fn(); } catch (e) { /* segue */ } });
      if (alvoAtual) { alvoAtual.classList.remove("tut-alvo"); alvoAtual = null; }
    }

    function pintar(focar) {
      var p = passos[indice];
      etapa.textContent = "Etapa " + (indice + 1) + " de " + passos.length;
      U.$$("li", trilha).forEach(function (li, i) {
        li.className = i < indice ? "tut__ponto--feito" : (i === indice ? "tut__ponto--atual" : "");
      });
      titulo.textContent = p.titulo;
      U.trocar(texto, (p.texto || []).map(function (t) { return typeof t === "string" ? el("p", { texto: t }) : t; }));
      var extra = null;
      if (p.conteudo) { try { extra = p.conteudo(api); } catch (e) { console.error("[R.A.M.A. · tutorial] conteúdo da etapa", e); } }
      U.trocar(conteudo, extra ? [extra] : []);
      bVoltar.disabled = indice === 0;
      pintarTarefa();
      destacar(true);
      if (focar) { definirRecolhido(false); try { titulo.focus({ preventScroll: true }); } catch (e) { titulo.focus(); } }
    }

    function ir(i) {
      if (encerrado || i < 0 || i >= passos.length) return;
      var atual = passos[indice];
      if (i > indice && atual && atual.tarefa && !feitos[indice]) return;
      if (atual && atual.aoSair) { try { atual.aoSair(api); } catch (e) { /* segue */ } }
      limpar();
      indice = i;
      var p = passos[indice];
      if (p.aoEntrar) { try { p.aoEntrar(api); } catch (e) { console.error("[R.A.M.A. · tutorial] ao entrar na etapa", e); } }
      if (p.esperar) {
        try {
          var l = p.esperar(api);
          if (typeof l === "function") limpezas.push(l);
        } catch (e) { console.error("[R.A.M.A. · tutorial] esperar", e); }
      }
      pintar(true);
    }

    /* Obrigatório: links para outras páginas ficam para depois. */
    function segurarLinks(ev) {
      var a = ev.target && ev.target.closest ? ev.target.closest("a[href]") : null;
      if (!a || cartao.contains(a) || a === atalho) return;
      var href = a.getAttribute("href") || "";
      if (!href || href.charAt(0) === "#" || a.target === "_blank" || a.hasAttribute("download")) return;
      ev.preventDefault();
      ev.stopPropagation();
      UI().avisoAtencao("Termine o tutorial para ir a outra página. No fim aparecem atalhos para as suas tarefas. Para sair da conta, use o menu do agente (⋯).");
    }
    if (obrigatorio) document.addEventListener("click", segurarLinks, true);

    function encerrar(semVoltar) {
      if (encerrado) return;
      var atual = passos[indice];
      if (atual && atual.aoSair) { try { atual.aoSair(api); } catch (e) { /* segue */ } }
      limpar();
      encerrado = true;
      vigiaAlvo.disconnect();
      vigiaJanelas.disconnect();
      document.removeEventListener("click", segurarLinks, true);
      document.body.classList.remove("com-tutorial", "tut-cartao-esquerda");
      if (cartao.parentNode) cartao.parentNode.removeChild(cartao);
      if (atalho.parentNode) atalho.parentNode.removeChild(atalho);
      if (c.aoEncerrar && !semVoltar) c.aoEncerrar();
    }

    ir(0);
    return { ir: ir, encerrar: encerrar, api: api, cartao: cartao };
  }

  /* ---------------- entrada pela ficha de demonstração ---------------- */

  async function iniciarNaFicha(o) {
    var Auth = global.RAMAAuth;
    if (o.tipo === "inicial") {
      await carregar(["js/ajuda/artigos.js", "js/ajuda/tutorial-inicial.js"]);
      var revisao = U.parametro("revisao") === "1" || !(Auth && Auth.tutorialPendente && Auth.tutorialPendente());
      var T = global.RAMAAjudaTutorialInicial;
      /* Outra aba da mesma conta concluiu: esta não prende mais ninguém. */
      if (!revisao && Auth.aoConcluirTutorialEmOutraAba) {
        Auth.aoConcluirTutorialEmOutraAba(function () {
          var d = T.destino ? T.destino() : "";
          UI().aviso("O tutorial foi concluído em outra aba. Você já pode usar o R.A.M.A. normalmente.", {
            duracao: 600000,
            acao: { rotulo: "Continuar", aoClicar: function () { location.href = U.url(d || "personagens/"); } },
          });
        });
      }
      return rodar({
        nome: revisao ? "Tutorial inicial (revisão)" : "Tutorial inicial",
        obrigatorio: !revisao,
        passos: T.passos({ revisao: revisao }),
        aoEncerrar: function () { location.href = U.url("ajuda/"); },
      });
    }
    await carregar(["js/ajuda/artigos.js", "js/ajuda/tutoriais-sistemas.js"]);
    var S = global.RAMAAjudaTutoriaisSistemas;
    var percurso = S.percurso(o.sistema);
    if (!percurso) throw new Error("sem percurso para " + o.sistema);
    return rodar({
      nome: percurso.nome,
      obrigatorio: false,
      passos: percurso.passos,
      aoEncerrar: function () { location.href = U.url("ajuda/?guia=" + encodeURIComponent("tutorial-" + o.sistema)); },
    });
  }

  global.RAMATutorial = { carregar: carregar, rodar: rodar, iniciarNaFicha: iniciarNaFicha };
})(window);
