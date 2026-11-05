/* =====================================================================
   R.A.M.A. — Criaturas (v6.6)
   ---------------------------------------------------------------------
   Os catálogos oficiais de criaturas e os geradores, por sistema. Um
   seletor de sistema vale para as duas seções:

     Catálogo    Ordem: a MESMA biblioteca do combate e dos aliados
                 (js/paginas/criaturas-biblioteca.js), embutida, com
                 Fonte (Todas as fontes / Livro básico / suplementos com
                 criaturas), VD, elementos, natureza e "Copiar para o
                 Homebrew". Oblívio, Vampiro e Goblins: os catálogos
                 nativos (ameacas-dados, antagonistas-dados, catalogo
                 dos Goblins), lidos daqui sem cópia de dado nenhum.
     Geradores   js/geradores-criaturas.js — os mesmos que a mesa usa.

   Só consulta: nada aqui muda os suplementos de fichas ou campanhas
   (a página não define contexto de suplemento — tudo liberado). As
   criaturas personalizadas continuam no Homebrew.

   O sistema e a seção escolhidos ficam no endereço (?sistema=&secao=),
   não no aparelho.
   ===================================================================== */
(function (global) {
  "use strict";
  var U = global.RAMAUtil, UI = global.RAMAUI, el = U.el;
  function S() { return global.RAMASistemas; }
  function G() { return global.RAMAGeradoresCriaturas; }

  var painel = null;
  var estado = { sistema: "ordem", secao: "catalogo" };
  var bibliotecaAtual = null;
  var nativo = { busca: "", fonte: "", filtro: "", abertos: {}, limite: 60 };

  global.RAMAApp.iniciar("criaturas", async function () {
    painel = U.$("#painel-criaturas");
    var q = new URLSearchParams(location.search);
    var s = q.get("sistema");
    if (s && S().conhecido(s)) estado.sistema = S().de(s).id;
    if (q.get("secao") === "geradores") estado.secao = "geradores";
    desenhar();
  });

  function guardarNoEndereco() {
    try {
      var q = new URLSearchParams(location.search);
      q.set("sistema", estado.sistema);
      q.set("secao", estado.secao);
      history.replaceState(null, "", location.pathname + "?" + q.toString());
    } catch (e) { /* segue */ }
  }

  function nomeDoSistema(id) { var s = S().de(id); return s ? s.nome : id; }

  /* ---------------- cabeçalho, seletor e seções ---------------- */

  function seletorDeSistema() {
    var idc = "criaturas-sistema";
    return el("div.bib-filtro.criaturas-sistema", {}, [
      el("label.t-mini", { for: idc, texto: "Sistema" }),
      el("select.r-selecao", {
        id: idc,
        onchange: function (ev) {
          estado.sistema = ev.target.value;
          nativo = { busca: "", fonte: "", filtro: "", abertos: {}, limite: 60 };
          desenhar();
        },
      }, S().lista().map(function (s) {
        return el("option", { value: s.id, texto: s.nome, selected: s.id === estado.sistema });
      })),
    ]);
  }

  function abasDeSecao() {
    return el("div.r-abas.criaturas-secoes", { role: "tablist", "aria-label": "Seção" }, [["catalogo", "Catálogo"], ["geradores", "Geradores"]].map(function (a) {
      var ativa = estado.secao === a[0];
      return el("button.r-aba", {
        type: "button", role: "tab", id: "aba-" + a[0], "aria-selected": String(ativa), "aria-pressed": String(ativa),
        "aria-controls": "criaturas-corpo", texto: a[1],
        onclick: function () { estado.secao = a[0]; desenhar(); },
      });
    }));
  }

  function desenhar() {
    guardarNoEndereco();
    if (bibliotecaAtual && bibliotecaAtual.desmontar) bibliotecaAtual.desmontar();
    bibliotecaAtual = null;
    var corpo = el("div.pilha.criaturas-corpo", { id: "criaturas-corpo", role: "tabpanel", "aria-labelledby": "aba-" + estado.secao });
    U.trocar(painel, [
      global.RAMAApp.titulo({
        titulo: "Criaturas",
        trilha: [nomeDoSistema(estado.sistema), estado.secao === "catalogo" ? "Catálogo" : "Geradores"],
      }),
      el("div.criaturas-controles", {}, [seletorDeSistema(), abasDeSecao()]),
      corpo,
    ]);
    if (estado.secao === "geradores") geradores(corpo);
    else catalogo(corpo);
  }

  /* ---------------- geradores ---------------- */

  function geradores(corpo) {
    var lista = G() ? G().doSistema(estado.sistema) : [];
    if (!lista.length) {
      U.trocar(corpo, UI.vazio({
        titulo: "Sem geradores de criaturas",
        texto: nomeDoSistema(estado.sistema) + " não tem gerador de criaturas no R.A.M.A. O catálogo, ao lado, continua disponível.",
      }));
      return;
    }
    U.trocar(corpo, [
      el("p.t-mini", { texto: "Só narrativa: sortear não cria ficha nem grava nada. São os mesmos geradores da mesa." }),
      el("div.pilha.geradores", {}, lista.map(function (g) { return G().cartao(g); })),
    ]);
  }

  /* ---------------- catálogo ---------------- */

  function catalogo(corpo) {
    if (estado.sistema === "ordem") {
      bibliotecaAtual = global.RAMABibliotecaCriaturas.abrir({
        embutido: corpo,
        aba: "oficial",
        homebrew: false,
        geradores: false,
        acoes: [],
        ajuda: "Consulta dos livros. O filtro de fonte só muda o que aparece aqui — não liga nem desliga suplementos em fichas ou campanhas. Para ajustar uma ficha, copie para o seu Homebrew e edite a cópia.",
      });
      return;
    }
    var def = NATIVOS[estado.sistema];
    if (!def || !def.disponivel()) {
      U.trocar(corpo, UI.vazio({
        titulo: "Sem catálogo de criaturas",
        texto: nomeDoSistema(estado.sistema) + " não tem criaturas oficiais cadastradas. As suas ficam no Homebrew.",
      }));
      return;
    }
    catalogoNativo(corpo, def);
  }

  /* Um catálogo de sistema que não é Ordem: mesma aparência da
     biblioteca (bib-item), com busca, Fonte e o filtro próprio. */
  function catalogoNativo(corpo, def) {
    var entradas = def.entradas();
    var lista = el("div.bib-itens.bib-criaturas");
    var status = el("p.t-mini.bib-status", { role: "status" });

    function visiveis() {
      var chave = U.chaveDeBusca(nativo.busca);
      return entradas.filter(function (x) {
        if (chave && x.chave.indexOf(chave) < 0) return false;
        if (nativo.fonte && x.fonte !== nativo.fonte) return false;
        if (nativo.filtro && x.filtro !== nativo.filtro) return false;
        return true;
      });
    }

    function pintarLista() {
      var v = visiveis();
      status.textContent = v.length + (v.length === 1 ? " criatura" : " criaturas") + ".";
      if (!v.length) {
        U.trocar(lista, el("div.r-vazio.bib-nada", {}, [
          el("p.r-vazio__titulo", { texto: "Nenhuma criatura encontrada" }),
          el("p.r-vazio__texto", { texto: "Tente outro nome, ou limpe a busca e os filtros." }),
        ]));
        return;
      }
      U.trocar(lista, v.slice(0, nativo.limite).map(linha).concat(v.length > nativo.limite ? [
        el("button.r-botao.r-botao--fantasma", { type: "button", texto: "Mostrar mais (" + (v.length - nativo.limite) + ")",
          onclick: function () { nativo.limite += 60; pintarLista(); } }),
      ] : []));
    }

    function linha(x) {
      var idDet = "nat-" + estado.sistema + "-" + String(x.id).replace(/[^a-z0-9]+/gi, "-");
      var aberto = !!nativo.abertos[x.id];
      var detalhes = el("div.bib-item__detalhes", { id: idDet, hidden: !aberto }, aberto ? [x.detalhes()] : []);
      var botao = el("button.bib-item__abrir", {
        type: "button", "aria-expanded": String(aberto), "aria-controls": idDet, "aria-label": "Consultar " + x.nome,
        onclick: function () {
          var abrir = detalhes.hidden;
          nativo.abertos[x.id] = abrir;
          detalhes.hidden = !abrir;
          botao.setAttribute("aria-expanded", String(abrir));
          if (abrir && !detalhes.firstChild) detalhes.appendChild(x.detalhes());
        },
      }, [
        el("span.bib-item__seta", { "aria-hidden": "true" }),
        el("span.bib-item__texto", {}, [el("span.bib-item__nome", { texto: x.nome }), el("span.bib-item__classe", { texto: x.linha })]),
      ]);
      return el("article.bib-item", {}, [
        el("div.bib-item__topo", {}, [botao, el("span.bib-item__marcas", {}, (x.marcas || []).map(function (m) {
          return el("span.r-etiqueta", { texto: m });
        }).concat([el("span.r-etiqueta.bib-fonte", { texto: x.referencia, title: def.nomeDoLivro })]))]),
        detalhes,
      ]);
    }

    var idBusca = "nat-busca", idFonte = "nat-fonte", idFiltro = "nat-filtro";
    var busca = el("input.r-entrada", { id: idBusca, type: "search", placeholder: "Buscar por nome", "aria-label": "Buscar criatura", value: nativo.busca,
      oninput: function (ev) { nativo.busca = ev.target.value; pintarLista(); } });
    var fontes = [{ valor: "", rotulo: "Todas as fontes" }].concat(def.fontes());
    var filtros = el("div.bib-filtros", {}, [
      el("div.bib-filtro", {}, [
        el("label.t-mini", { for: idFonte, texto: "Fonte" }),
        el("select.r-selecao", { id: idFonte, onchange: function (ev) { nativo.fonte = ev.target.value; pintarLista(); } },
          fontes.map(function (f) { return el("option", { value: f.valor, texto: f.rotulo, selected: nativo.fonte === f.valor }); })),
      ]),
      def.filtro ? el("div.bib-filtro", {}, [
        el("label.t-mini", { for: idFiltro, texto: def.filtro.rotulo }),
        el("select.r-selecao", { id: idFiltro, onchange: function (ev) { nativo.filtro = ev.target.value; pintarLista(); } },
          [{ valor: "", rotulo: def.filtro.todos }].concat(def.filtro.opcoes()).map(function (f) {
            return el("option", { value: f.valor, texto: f.rotulo, selected: nativo.filtro === f.valor });
          })),
      ]) : null,
    ]);
    pintarLista();
    U.trocar(corpo, el("div.pilha.bib", {}, [
      el("p.t-mini", { texto: def.ajuda }),
      el("div.r-busca", {}, [el("span.r-busca__marca", {}, [UI.simbolo("busca")]), busca]),
      filtros, status, lista,
    ]));
  }

  /* ---------------- fichas nativas (só leitura) ---------------- */

  function humanizar(k) {
    return String(k || "").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, function (c) { return c.toUpperCase(); });
  }
  function nomeEm(listaOuMapa, chave) {
    if (!listaOuMapa) return humanizar(chave);
    if (Array.isArray(listaOuMapa)) { var x = listaOuMapa.filter(function (i) { return i.chave === chave; })[0]; return x ? x.nome : humanizar(chave); }
    var y = listaOuMapa[chave]; return y && y.nome ? y.nome : humanizar(chave);
  }
  function numeros(pares) {
    return el("div.editar-grade", {}, pares.filter(function (p) { return p[1] !== undefined && p[1] !== null && p[1] !== ""; }).map(function (p) {
      return el("div.painel-numero", {}, [el("span.t-rotulo", { texto: p[0] }), el("span.t-forte", { texto: String(p[1]) })]);
    }));
  }
  function mapaEmTexto(mapa, nomes) {
    return Object.keys(mapa || {}).map(function (k) { return nomeEm(nomes, k) + " " + mapa[k]; }).join(", ");
  }
  function ficha(partes) { return el("div.pilha--curta.criaturas-ficha", { class: "pilha" }, partes.filter(Boolean)); }
  function texto(rotulo, t) { return t ? el("p.t-mini", {}, [el("strong", { texto: rotulo + ": " }), document.createTextNode(t)]) : null; }

  var NATIVOS = {
    oblivio: {
      disponivel: function () { return !!global.RAMAOblivioAmeacas; },
      nomeDoLivro: "Oblívio RPG",
      ajuda: "As Ameaças do livro, com os valores publicados. Para jogar, a mesa da Testemunha (campanha) acrescenta a Ameaça ao encontro.",
      fontes: function () { return [{ valor: "LB", rotulo: "Livro básico" }]; },
      filtro: { rotulo: "Grau", todos: "Todos os graus", opcoes: function () { return [1, 2, 3, 4, 5, 6].map(function (g) { return { valor: String(g), rotulo: "Grau " + g }; }); } },
      entradas: function () {
        var OC = global.RAMAOblivioCatalogo || {};
        return global.RAMAOblivioAmeacas.AMEACAS.map(function (a) {
          return {
            id: a.chave, nome: a.nome, fonte: "LB", filtro: String(a.grau), referencia: "Livro básico, p. " + a.pag,
            chave: U.chaveDeBusca(a.nome), marcas: ["Grau " + a.grau],
            linha: ["Dano " + a.dano, "Proteção " + a.protecao, "Estresse " + a.limiteEstresse, a.tamanho].filter(Boolean).join(" · "),
            detalhes: function () {
              return ficha([
                numeros((OC.ATRIBUTOS || []).map(function (at) { return [at.nome, a.atributos[at.chave]]; })),
                numeros([["Dano", a.dano], ["Proteção", a.protecao], ["Velocidade", a.velocidade], ["Limite de Estresse", a.limiteEstresse], ["Regiões", a.regioes]]),
                texto("Tamanho", a.tamanho),
                texto("Especializações", (a.especializacoes || []).map(function (k) { return nomeEm(OC.CONHECIMENTOS, k); }).join(", ")),
                (a.habilidades || []).length ? el("ul.bib-lista-textos", {}, a.habilidades.map(function (h) {
                  return el("li.t-mini", {}, [el("strong", { texto: h.nome + (h.acao ? " (" + humanizar(h.acao) + ")" : "") + ": " }), document.createTextNode(h.resumo || "")]);
                })) : null,
              ]);
            },
          };
        });
      },
    },
    vampiro: {
      disponivel: function () { return !!global.RAMAVampiroAntagonistas; },
      nomeDoLivro: "Vampiro: A Máscara, Livro Básico",
      ajuda: "Os antagonistas do Livro Básico (p. 369–377). Na crônica, o Narrador cria um PN a partir deles.",
      fontes: function () { return [{ valor: "LB", rotulo: "Livro básico" }]; },
      filtro: { rotulo: "Natureza", todos: "Todas", opcoes: function () {
        return [["mortal", "Mortais"], ["carnical", "Carniçais"], ["animal", "Animais"], ["vampiro", "Vampiros"], ["criatura", "Criaturas de horror"]].map(function (n) { return { valor: n[0], rotulo: n[1] }; });
      } },
      entradas: function () {
        var VC = global.RAMAVampiroCatalogo || {};
        var VD = global.RAMAVampiroDisciplinas || {};
        var NAT = { mortal: "Mortal", carnical: "Carniçal", animal: "Animal", vampiro: "Vampiro", criatura: "Criatura de horror" };
        return global.RAMAVampiroAntagonistas.LISTA.map(function (a) {
          return {
            id: a.chave, nome: a.nome, fonte: "LB", filtro: a.natureza, referencia: "Livro básico, p. " + a.pagina,
            chave: U.chaveDeBusca(a.nome + " " + (NAT[a.natureza] || "")), marcas: [NAT[a.natureza] || a.natureza],
            linha: ["Vitalidade " + a.vitalidade, "Força de Vontade " + a.forcaDeVontade].join(" · "),
            detalhes: function () {
              return ficha([
                a.paradas ? numeros([["Físico", a.paradas.fisico], ["Social", a.paradas.social], ["Mental", a.paradas.mental]]) : null,
                a.atributos ? numeros(Object.keys(a.atributos).map(function (k) { return [nomeEm(VC.ATRIBUTOS, k), a.atributos[k]]; })) : null,
                numeros([["Vitalidade", a.vitalidade], ["Força de Vontade", a.forcaDeVontade], ["Humanidade", a.humanidade], ["Potência do Sangue", a.potencia], ["Dano extra", a.danoExtra]]),
                texto("Paradas excepcionais", mapaEmTexto(a.excepcionais, VC.HABILIDADES)),
                texto("Habilidades", mapaEmTexto(a.habilidades, VC.HABILIDADES)),
                typeof a.disciplinas === "object" ? texto("Disciplinas", mapaEmTexto(a.disciplinas, VD.DISCIPLINAS)) : texto("Disciplinas", a.disciplinas ? String(a.disciplinas) : ""),
                a.semFome ? texto("Fome", "Não tem: o que seria Checagem vira 1 de dano Superficial (p. 376).") : null,
                texto("Especial", a.especial),
              ]);
            },
          };
        });
      },
    },
    goblins: {
      disponivel: function () { return !!(global.RAMAGoblinsCatalogo && global.RAMAGoblinsCatalogo.INIMIGOS); },
      nomeDoLivro: "Malditos Goblins (3ª edição)",
      ajuda: "Os inimigos do livro. No Covil da campanha, o mestre os põe em combate.",
      fontes: function () { return [{ valor: "LB", rotulo: "Livro básico" }]; },
      filtro: { rotulo: "Adaptação", todos: "Todas", opcoes: function () {
        var A = global.RAMAGoblinsCatalogo.ADAPTACOES;
        return [{ valor: "-", rotulo: "Sem adaptação" }].concat(Object.keys(A).map(function (k) { return { valor: k, rotulo: A[k].nome }; }));
      } },
      entradas: function () {
        var K = global.RAMAGoblinsCatalogo;
        function num(v) { return v === null || v === undefined ? "—" : v; }
        return Object.keys(K.INIMIGOS).map(function (k) {
          var d = K.INIMIGOS[k];
          var ad = d.adaptacao && K.ADAPTACOES[d.adaptacao];
          return {
            id: k, nome: d.nome, fonte: "LB", filtro: d.adaptacao || "-", referencia: "Livro básico, p. " + d.pagina,
            chave: U.chaveDeBusca(d.nome + " " + (d.especie || "") + " " + (ad ? ad.nome : "")),
            marcas: [ad ? ad.nome : null, d.especie ? humanizar(d.especie) : null].filter(Boolean),
            linha: ["Combate " + num(d.combate) + (d.bonusCombate ? " (+" + d.bonusCombate + ")" : ""), "Vitalidade " + num(d.vitalidade)].join(" · "),
            detalhes: function () {
              return ficha([
                numeros([["Combate", num(d.combate)], ["Bônus de combate", d.bonusCombate || 0], ["Noção", num(d.nocao)], ["Habilidade", num(d.habilidade)], ["Vitalidade", d.semVitalidade ? "—" : num(d.vitalidade)], ["Proteção", d.protecao || 0]]),
                texto("Equipamento", d.equip),
                texto("Terror", d.terror),
                (d.habilidades || []).length ? el("ul.bib-lista-textos", {}, d.habilidades.map(function (h) {
                  return el("li.t-mini", {}, [el("strong", { texto: h.nome + ": " }), document.createTextNode(h.texto || "")]);
                })) : null,
                texto("Nota", d.nota),
                d.indescritivel ? texto("Indescritível", "Sem números: a mesa decide.") : null,
              ]);
            },
          };
        });
      },
    },
  };

  global.RAMAPaginaCriaturas = { NATIVOS: NATIVOS };
})(window);
