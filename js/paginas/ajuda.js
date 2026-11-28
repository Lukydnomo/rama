/* =====================================================================
   R.A.M.A. — página Ajuda
   ---------------------------------------------------------------------
   Busca por tarefa, primeiros passos (com Refazer tutorial inicial),
   guias por área, tutoriais por sistema, perguntas frequentes e o
   Feedback. O conteúdo é o de js/ajuda/artigos.js — o mesmo que o
   "Ajuda desta tela" e o tutorial inicial usam.

   Endereços: ajuda/?guia=<id> abre um artigo; ajuda/?busca=<texto>
   abre com a busca feita. A navegação dentro da página usa o histórico
   do navegador (voltar e avançar funcionam, e o link copiado abre o
   mesmo artigo).
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var el = U.el;
  function A() { return global.RAMAAjuda; }

  var raiz = null;
  var campoBusca = null;
  var areaResultados = null;

  global.RAMAApp.iniciar("ajuda", async function () {
    raiz = U.$("#painel-ajuda");
    /* Cada artigo começa do topo; voltar não herda a rolagem de outro. */
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    global.addEventListener("popstate", function () { pintarPeloEndereco(false); });
    pintarPeloEndereco(false);
  });

  function enderecoPara(params) {
    var q = Object.keys(params).filter(function (k) { return params[k]; })
      .map(function (k) { return k + "=" + encodeURIComponent(params[k]); }).join("&");
    return U.url("ajuda/" + (q ? "?" + q : ""));
  }

  function navegar(params, trocar) {
    var url = enderecoPara(params);
    if (trocar) history.replaceState(null, "", url); else history.pushState(null, "", url);
    pintarPeloEndereco(true);
  }

  function pintarPeloEndereco(focar) {
    var guia = U.parametro("guia");
    var a = guia ? A().artigo(guia) : null;
    if (guia && !a) {
      U.trocar(raiz, [cabecalho(), UI.vazio({
        titulo: "Guia não encontrado",
        texto: "O endereço aponta para um guia que não existe (ou mudou de nome). Use a busca ou as áreas abaixo.",
        acao: { rotulo: "Ir para a Ajuda", aoClicar: function () { navegar({}); } },
      })]);
      return;
    }
    if (a) pintarArtigo(a, focar);
    else pintarInicio(U.parametro("busca"), focar);
    if (!focar) global.scrollTo(0, 0);
  }

  /* ---------------- partes comuns ---------------- */

  function cabecalho() {
    return global.RAMAApp.titulo({ titulo: "Ajuda", trilha: ["Guias", A().ARTIGOS.length + " artigos", "busca por tarefa"] });
  }

  function linkDoArtigo(a, extra) {
    return el("a.ajuda-link", {
      href: enderecoPara({ guia: a.id }),
      onclick: function (ev) {
        if (ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.button !== 0) return;
        ev.preventDefault();
        navegar({ guia: a.id });
      },
    }, [el("span.ajuda-link__titulo", { texto: a.titulo })].concat(extra || []));
  }

  function etiquetas(a) {
    var area = A().AREAS.filter(function (x) { return x.chave === a.area; })[0];
    return el("span.ajuda-etiquetas", {}, [
      area ? el("span.etiqueta", { texto: area.nome }) : null,
      a.sistema ? el("span.etiqueta.etiqueta--sistema", { texto: A().SISTEMAS[a.sistema] }) : null,
    ]);
  }

  function itemDeResultado(a) {
    return el("li.ajuda-resultado", {}, [
      linkDoArtigo(a, [etiquetas(a), el("span.ajuda-link__resumo", { texto: a.resumo })]),
    ]);
  }

  function blocoFeedback() {
    return el("section.ajuda-secao.ajuda-feedback", { "aria-labelledby": "ajuda-fb" }, [
      el("h2.t-secao", { id: "ajuda-fb", texto: "Não resolveu?" }),
      el("p", { texto: "Envie um Feedback para quem administra o R.A.M.A. Diga o que aconteceu, onde e o que você esperava. Nada é enviado antes de você confirmar." }),
      global.RAMAFeedback
        ? el("button.r-botao", { type: "button", texto: "Abrir Feedback", onclick: function () { global.RAMAFeedback.abrir(); } })
        : el("p.t-mini", { texto: "O Feedback fica no menu do agente (⋯), no cabeçalho." }),
    ]);
  }

  /* ---------------- início e busca ---------------- */

  function pintarInicio(busca, focar) {
    campoBusca = el("input.r-entrada.ajuda-busca__campo", {
      type: "search", value: busca || "", id: "ajuda-busca",
      placeholder: "O que você quer fazer? Ex.: importar ficha, compartilhar com o mestre, não consigo editar",
      "aria-describedby": "ajuda-busca-dica",
      oninput: function () { pintarResultados(campoBusca.value); },
      onkeydown: function (ev) { if (ev.key === "Enter") { ev.preventDefault(); navegar({ busca: campoBusca.value.trim() }, true); } },
    });
    areaResultados = el("div.ajuda-resultados", { "aria-live": "polite" });

    U.trocar(raiz, [
      cabecalho(),
      el("section.ajuda-busca", { role: "search" }, [
        el("label.t-secao", { for: "ajuda-busca", texto: "Buscar por tarefa ou problema" }),
        el("div.r-busca", {}, [el("span.r-busca__marca", {}, [UI.simbolo("busca")]), campoBusca]),
        el("p.t-mini", { id: "ajuda-busca-dica", texto: "Vale descrever o objetivo (“adicionar ritual”), o sintoma (“não consigo editar”) ou o nome de um botão." }),
        areaResultados,
      ]),
      el("div.ajuda-indice", {}, [secaoPrimeirosPassos(), secaoAreas(), secaoSistemas(), secaoFaq(), blocoFeedback()]),
    ]);
    pintarResultados(busca || "");
    if (focar && !busca) campoBusca.focus();
  }

  function pintarResultados(q) {
    if (!areaResultados) return;
    var texto = String(q || "").trim();
    if (!texto) { U.trocar(areaResultados, []); return; }
    var lista = A().buscar(texto);
    if (lista.length) {
      U.trocar(areaResultados, [
        el("p.t-mini", { texto: lista.length + " guia(s) para “" + texto + "”" }),
        el("ul.ajuda-lista", {}, lista.map(itemDeResultado)),
      ]);
      return;
    }
    var sugestoes = ["criar personagem", "compartilhar", "mestre", "não consigo editar", "importar ficha", "rolar dados", "suplemento"];
    U.trocar(areaResultados, [
      el("div.ajuda-nada", {}, [
        el("p", { texto: "Nada encontrado para “" + texto + "”." }),
        el("p.t-mini", { texto: "Tente outras palavras, o nome do botão que você vê na tela, ou uma destas buscas:" }),
        el("div.faixa", {}, sugestoes.map(function (s) {
          return el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: s, onclick: function () { campoBusca.value = s; pintarResultados(s); } });
        })),
        el("p.t-mini", { texto: "Você também pode percorrer as áreas abaixo ou enviar um Feedback." }),
      ]),
    ]);
  }

  function secaoPrimeirosPassos() {
    var lista = A().ARTIGOS.filter(function (a) { return a.area === "primeiros-passos" && a.id !== "refazer-tutorial"; });
    return el("section.ajuda-secao", { "aria-labelledby": "ajuda-pp" }, [
      el("h2.t-secao", { id: "ajuda-pp", texto: "Primeiros passos" }),
      el("div.ajuda-tutorial", {}, [
        el("div", {}, [
          el("strong", { texto: "Tutorial inicial" }),
          el("p.t-mini", { texto: "Os controles comuns numa ficha de exemplo nova: modos, recursos, rolagem, habilidades, itens, permissões, personalização e esta Ajuda. Pode encerrar quando quiser; nada é gravado na sua conta." }),
        ]),
        el("a.r-botao.r-botao--principal", { href: U.url("ficha/?tutorial=inicial&revisao=1"), texto: "Refazer tutorial inicial" }),
      ]),
      el("ul.ajuda-lista", {}, lista.map(itemDeResultado)),
    ]);
  }

  function secaoAreas() {
    var areas = A().AREAS.filter(function (x) { return ["personagens", "campanhas", "catalogo", "homebrew", "perfil"].indexOf(x.chave) >= 0; });
    return el("section.ajuda-secao", { "aria-labelledby": "ajuda-areas" }, [
      el("h2.t-secao", { id: "ajuda-areas", texto: "Guias por área" }),
      el("div.ajuda-areas", {}, areas.map(function (ar) {
        var lista = A().ARTIGOS.filter(function (a) { return a.area === ar.chave; });
        return el("div.ajuda-area", {}, [
          el("h3.ajuda-area__titulo", { texto: ar.nome }),
          el("ul.ajuda-lista.ajuda-lista--compacta", {}, lista.map(function (a) {
            return el("li", {}, [linkDoArtigo(a, a.sistema ? [el("span.etiqueta.etiqueta--sistema", { texto: A().SISTEMAS[a.sistema] })] : [])]);
          })),
        ]);
      })),
    ]);
  }

  function secaoSistemas() {
    var lista = A().ARTIGOS.filter(function (a) { return a.area === "sistemas"; });
    var C = global.RAMACapaSistema;
    return el("section.ajuda-secao", { "aria-labelledby": "ajuda-sis" }, [
      el("h2.t-secao", { id: "ajuda-sis", texto: "Tutoriais por sistema" }),
      el("p.t-mini", { texto: "Cada percurso abre uma ficha pronta do sistema e mostra o que muda em relação aos controles comuns. Nada é gravado." }),
      el("ul.ajuda-sistemas", {}, lista.map(function (a) {
        var principal = (a.acoes || [])[0];
        return el("li.ajuda-sistema", {}, [
          C && a.sistema !== "universal" ? C.elemento(a.sistema, { tamanho: "p" }) : el("span.ajuda-sistema__sem-capa", { "aria-hidden": "true", texto: "U" }),
          el("div.ajuda-sistema__texto", {}, [
            linkDoArtigo(a),
            el("p.t-mini", { texto: a.resumo }),
            principal ? el("a.r-botao.r-botao--mini", { href: U.url(principal.href), texto: "Abrir percurso" }) : null,
          ]),
        ]);
      })),
    ]);
  }

  function secaoFaq() {
    var lista = A().ARTIGOS.filter(function (a) { return a.area === "faq"; });
    return el("section.ajuda-secao", { "aria-labelledby": "ajuda-faq" }, [
      el("h2.t-secao", { id: "ajuda-faq", texto: "Perguntas frequentes" }),
      el("ul.ajuda-lista", {}, lista.map(itemDeResultado)),
    ]);
  }

  /* ---------------- o artigo ---------------- */

  function pintarArtigo(a, focar) {
    var area = A().AREAS.filter(function (x) { return x.chave === a.area; })[0];
    var titulo = el("h1.t-titulo", { texto: a.titulo, tabindex: "-1" });
    var corpo = (a.blocos || []).map(function (b) {
      return el("section.ajuda-bloco", {}, [
        b.titulo ? el("h2.ajuda-bloco__titulo", { texto: b.titulo }) : null,
      ].concat((b.texto || []).map(function (t) { return el("p", { texto: t }); }))
        .concat(b.lista ? [el("ul.ajuda-bloco__lista", {}, b.lista.map(function (t) { return el("li", { texto: t }); }))] : [])
        .concat(b.passos ? [el("ol.ajuda-bloco__passos", {}, b.passos.map(function (t) { return el("li", { texto: t }); }))] : [])
        .concat([el("p.ajuda-fonte", { class: b.fonte && b.fonte.rama ? "ajuda-fonte--rama" : (b.fonte && (b.fonte.fa || b.fonte.interpretacao) ? "ajuda-fonte--aviso" : "") }, [
          el("span.ajuda-fonte__icone", { "aria-hidden": "true", texto: b.fonte && b.fonte.rama ? "◆" : "§" }),
          el("span", { texto: A().textoDaFonte(b.fonte) }),
        ])]));
    });
    var relacionados = (a.relacionados || []).map(function (id) { return A().artigo(id); }).filter(Boolean);
    var voltar = el("a.r-botao.r-botao--mini.r-botao--fantasma", {
      href: enderecoPara({}), texto: "← Ajuda",
      onclick: function (ev) { if (ev.button !== 0 || ev.ctrlKey || ev.metaKey) return; ev.preventDefault(); navegar({}); },
    });

    U.trocar(raiz, [
      el("nav.ajuda-trilha", { "aria-label": "Você está em" }, [voltar, area ? el("span.t-mini", { texto: area.nome }) : null]),
      el("article.ajuda-artigo", { "aria-labelledby": "ajuda-artigo-titulo" }, [
        el("header.ajuda-artigo__topo", {}, [titulo, etiquetas(a), el("p.ajuda-artigo__resumo", { texto: a.resumo })]),
        (a.acoes || []).length ? el("div.faixa.ajuda-acoes", {}, a.acoes.map(function (x) {
          return el("a.r-botao" + (x.principal ? ".r-botao--principal" : ""), { href: U.url(x.href), texto: x.rotulo });
        })) : null,
      ].concat(corpo).concat([
        relacionados.length ? el("section.ajuda-secao", { "aria-labelledby": "ajuda-rel" }, [
          el("h2.t-secao", { id: "ajuda-rel", texto: "Veja também" }),
          el("ul.ajuda-lista", {}, relacionados.map(itemDeResultado)),
        ]) : null,
        blocoFeedback(),
      ])),
    ]);
    titulo.id = "ajuda-artigo-titulo";
    document.title = a.titulo + " — Ajuda — R.A.M.A.";
    if (focar) { try { titulo.focus({ preventScroll: false }); } catch (e) { titulo.focus(); } global.scrollTo(0, 0); }
  }
})(window);
