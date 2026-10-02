/* =====================================================================
   R.A.M.A. — biblioteca de criaturas
   ---------------------------------------------------------------------
   UMA janela para escolher criatura, usada pelo combate, pelos aliados
   e pelo Homebrew. Duas abas, a mesma lista e os mesmos filtros:

     Ordem Paranormal   o catálogo oficial dos livros (js/ordem/
                        criaturas.js), carregado só quando a aba abre
     Homebrew           as suas criaturas e as públicas de outras contas
                        — o servidor decide o que entra, e manda só um
                        resumo; a ficha inteira é lida ao escolher, com
                        a permissão conferida de novo

   Cada linha abre para CONSULTA antes de qualquer escolha. Escolher não
   é aqui: quem abriu a janela diz quais botões existem (acoes) e o que
   cada um faz com a cópia que recebe.

   abrir({ titulo, ajuda, acoes: [{ rotulo, principal, fechar,
           aoEscolher(criatura, origem) }], aba, homebrew })

     origem = { tipo: "catalogo", id } | { tipo: "homebrew", id, meu }

   O modelo oficial é imutável: "Copiar para o Homebrew" cria um registro
   novo, privado, com o rastro de onde veio.
   ===================================================================== */
(function (global) {
  "use strict";
  var U = global.RAMAUtil, UI = global.RAMAUI, el = U.el;
  function OC() { return global.RAMAOrdemCriaturas; }
  function C() { return global.RAMACriaturas; }

  var ELEMENTOS = ["sangue", "morte", "conhecimento", "energia", "medo"];
  var NOMES_ELEMENTO = { sangue: "Sangue", morte: "Morte", conhecimento: "Conhecimento", energia: "Energia", medo: "Medo" };
  var NATUREZAS = [{ v: "", r: "Todas" }, { v: "paranormal", r: "Paranormais" }, { v: "humana", r: "Pessoas" }, { v: "animal", r: "Animais" }];

  var lembrado = { aba: "oficial" };
  var contador = 0;

  function abrir(opcoes) {
    var o = opcoes || {};
    var id = "bibc-" + (++contador);
    var comHomebrew = o.homebrew !== false;
    var estado = {
      aba: o.aba || (comHomebrew ? lembrado.aba : "oficial"),
      busca: "", livro: "", natureza: "", elementos: [], modo: "qualquer", vdMin: "", vdMax: "",
      catalogo: null, falhaCatalogo: null, carregando: false,
      homebrew: null, falhaHomebrew: null, carregandoHb: false,
      abertos: {},
    };
    var aberta = true;
    var corpo = el("div.pilha");
    var abas = el("div.r-abas", { role: "tablist", "aria-label": "Origem das criaturas" });

    function trocarAba(aba) {
      estado.aba = aba;
      lembrado.aba = aba;
      pintar();
    }

    function pintarAbas() {
      if (!comHomebrew) { U.trocar(abas, []); return; }
      U.trocar(abas, [["oficial", "Ordem Paranormal"], ["homebrew", "Homebrew"]].map(function (a) {
        return el("button.r-aba", {
          type: "button", role: "tab", "aria-selected": String(estado.aba === a[0]), "aria-pressed": String(estado.aba === a[0]),
          texto: a[1], onclick: function () { trocarAba(a[0]); },
        });
      }));
    }

    /* ---------- carga ---------- */

    function carregarCatalogo() {
      estado.carregando = true;
      estado.falhaCatalogo = null;
      OC().carregar().then(function (c) {
        estado.catalogo = c;
        estado.carregando = false;
        if (aberta) pintar();
      }, function (erro) {
        estado.falhaCatalogo = erro;
        estado.carregando = false;
        if (aberta) pintar();
      });
    }

    function carregarHomebrew() {
      estado.carregandoHb = true;
      estado.falhaHomebrew = null;
      global.RAMAApi.listarHomebrew({ escopo: "todos", tipo: "criatura", resumo: true }).then(function (r) {
        estado.carregandoHb = false;
        if (!r || !r.ok) { estado.falhaHomebrew = r || { ok: false }; if (aberta) pintar(); return; }
        estado.homebrew = (r.dados || []).filter(function (h) { return h.tipo === "criatura"; }).map(indiceDoHomebrew);
        if (aberta) pintar();
      });
    }

    /* O resumo do Homebrew na mesma forma do índice do catálogo, para os
       filtros serem os mesmos. Uma resposta de servidor antigo (sem
       resumo) também serve: o resumo sai da ficha que veio. */
    function indiceDoHomebrew(h) {
      var r = h.resumo || C().resumo(h);
      return {
        id: h.id, nome: h.nome, meu: !!h.meu, visibilidade: h.visibilidade,
        chave: U.chaveDeBusca(h.nome + " " + (r.categoria || "")),
        sistema: r.sistema, natureza: r.natureza || "", vd: typeof r.vd === "number" ? r.vd : null, nivel: r.nivel || "",
        elementos: r.elementos || [], tamanho: r.tamanho || "", tipo: r.tipo || "", pv: r.pv, livro: "",
        categoria: r.categoria || "",
      };
    }

    /* ---------- filtros ---------- */

    function filtros(total, visiveis, comLivro) {
      var busca = el("input.r-entrada", {
        type: "search", placeholder: "Buscar por nome", "aria-label": "Buscar criatura", value: estado.busca,
        oninput: function (ev) { estado.busca = ev.target.value; pintarLista(); },
      });

      function chip(rotulo, ativo, aoClicar, classe) {
        return el("button.r-aba" + (classe ? "." + classe : ""), { type: "button", "aria-pressed": String(ativo), texto: rotulo, onclick: aoClicar });
      }

      var grupoElementos = el("div.r-abas.biblioteca-abas", { role: "group", "aria-label": "Elementos" }, ELEMENTOS.map(function (e) {
        return chip(NOMES_ELEMENTO[e], estado.elementos.indexOf(e) >= 0, function () {
          var i = estado.elementos.indexOf(e);
          if (i >= 0) estado.elementos.splice(i, 1); else estado.elementos.push(e);
          pintar();
        }, "bib-elemento.bib-elemento--" + e);
      }).concat(estado.elementos.length > 1 ? [
        chip(estado.modo === "todos" ? "Com todos os marcados" : "Com qualquer um dos marcados", estado.modo === "todos", function () {
          estado.modo = estado.modo === "todos" ? "qualquer" : "todos";
          pintar();
        }),
      ] : []));

      var grupoNatureza = el("div.r-abas", { role: "group", "aria-label": "Natureza" }, NATUREZAS.map(function (n) {
        return chip(n.r, estado.natureza === n.v, function () { estado.natureza = n.v; pintar(); });
      }));

      var idLivro = id + "-livro", idMin = id + "-vdmin", idMax = id + "-vdmax";
      var outros = el("div.bib-filtros", {}, [
        comLivro ? el("div.bib-filtro", {}, [
          el("label.t-mini", { for: idLivro, texto: "Livro" }),
          el("select.r-selecao", { id: idLivro, onchange: function (ev) { estado.livro = ev.target.value; pintarLista(); } },
            [el("option", { value: "", texto: "Todos" })].concat(Object.keys(OC().FONTES).map(function (k) {
              return el("option", { value: k, texto: OC().FONTES[k].nome, selected: estado.livro === k });
            }))),
        ]) : null,
        el("div.bib-filtro", {}, [
          el("label.t-mini", { for: idMin, texto: "VD mínimo" }),
          el("input.r-entrada.r-entrada--numero", { id: idMin, inputmode: "numeric", value: estado.vdMin, maxlength: 4,
            onchange: function (ev) { estado.vdMin = ev.target.value.replace(/\D/g, ""); ev.target.value = estado.vdMin; pintarLista(); } }),
        ]),
        el("div.bib-filtro", {}, [
          el("label.t-mini", { for: idMax, texto: "VD máximo" }),
          el("input.r-entrada.r-entrada--numero", { id: idMax, inputmode: "numeric", value: estado.vdMax, maxlength: 4,
            onchange: function (ev) { estado.vdMax = ev.target.value.replace(/\D/g, ""); ev.target.value = estado.vdMax; pintarLista(); } }),
        ]),
        algumFiltro() ? el("button.r-botao.r-botao--mini.r-botao--fantasma", {
          type: "button", texto: "Limpar busca e filtros",
          onclick: function () {
            estado.busca = ""; estado.livro = ""; estado.natureza = ""; estado.elementos = []; estado.modo = "qualquer";
            estado.vdMin = ""; estado.vdMax = "";
            pintar();
          },
        }) : null,
      ]);

      return { busca: busca, nos: [grupoNatureza, grupoElementos, el("div.r-busca", {}, [el("span.r-busca__marca", {}, [UI.simbolo("busca")]), busca]), outros] };
    }

    /* Ferramentas do mestre que acompanham o catálogo (AS1 p. 23). */
    function ferramentas() {
      if (!OC().gerarTranstornado) return null;
      return el("div.faixa", {}, [
        el("button.r-botao.r-botao--mini.r-botao--fantasma", {
          type: "button", texto: "Gerador de Transtornados",
          title: "Perfil, traços e aparência de um Transtornado (Arquivos Secretos 1, p. 23)",
          onclick: function () { gerador(); },
        }),
      ]);
    }

    function gerador() {
      var D = global.RAMADados;
      var rolar = function (faces) { var r = D && D.total ? D.total("1d" + faces) : null; return r && r.ok ? r.total : 1 + Math.floor(Math.random() * faces); };
      var saida = el("div.pilha--curta", { class: "pilha", role: "status", "aria-live": "polite" });
      function sortear() {
        var g = OC().gerarTranstornado(rolar);
        U.trocar(saida, [
          el("p", { texto: "Perfil: " + g.perfil + " (1d10: " + g.dados.perfil + ")" }),
          el("p", { texto: "Traços: " + g.tracos.join("; ") + " (2d6: " + g.dados.tracos.join(" e ") + ")" }),
          el("p", { texto: "Aparência: " + g.aparencia.join("; ") + " (d20: " + g.dados.aparencia.join(" e ") + ")" }),
          el("p.criacao-fonte", { texto: g.referencia + ". A ficha de jogo vem do catálogo: Assecla, Investido ou Apóstolo do Sangue." }),
        ]);
      }
      sortear();
      UI.modal({
        titulo: "Gerador de Transtornados",
        conteudo: [saida],
        botoes: [
          { rotulo: "Fechar", classe: "r-botao--fantasma" },
          { rotulo: "Sortear de novo", classe: "r-botao--principal", aoClicar: function () { sortear(); } },
        ],
      });
    }

    function algumFiltro() {
      return !!(estado.busca || estado.livro || estado.natureza || estado.elementos.length || estado.vdMin || estado.vdMax);
    }

    function filtrados(indice) {
      return OC().filtrar(indice, {
        busca: estado.busca, livro: estado.livro, natureza: estado.natureza,
        elementos: estado.elementos, modoElementos: estado.modo, vdMin: estado.vdMin, vdMax: estado.vdMax,
      });
    }

    /* ---------- lista ---------- */

    var lista = el("div.bib-itens.bib-criaturas");
    var status = el("p.t-mini.bib-status", { role: "status" });
    var indiceAtual = [];

    function pintarLista() {
      var itens = filtrados(indiceAtual);
      status.textContent = itens.length + (itens.length === 1 ? " criatura" : " criaturas") + (algumFiltro() ? " com estes filtros." : ".");
      if (!itens.length) {
        U.trocar(lista, el("div.r-vazio.bib-nada", {}, [
          el("p.r-vazio__titulo", { texto: "Nenhuma criatura encontrada" }),
          el("p.r-vazio__texto", { texto: indiceAtual.length ? "Tente outro nome, ou limpe a busca e os filtros." : (estado.aba === "homebrew"
            ? "Você ainda não tem criaturas no Homebrew, e nenhuma foi publicada por outras contas." : "O catálogo está vazio.") }),
        ]));
        return;
      }
      /* Desenhar centenas de cartões de uma vez travaria um celular: a
         lista mostra os primeiros e cresce sob pedido. */
      var limite = estado.limite || 60;
      U.trocar(lista, itens.slice(0, limite).map(linha).concat(itens.length > limite ? [
        el("button.r-botao.r-botao--fantasma", {
          type: "button", texto: "Mostrar mais (" + (itens.length - limite) + ")",
          onclick: function () { estado.limite = limite + 60; pintarLista(); },
        }),
      ] : []));
    }

    /* O retrato 1:1 do catálogo, pequeno e só quando a linha aparece. */
    function miniatura(x) {
      var imagens = estado.aba === "oficial" ? C().imagensDoCatalogo(x.id) : null;
      if (!imagens) return null;
      var img = el("img.bib-criatura__retrato", { src: imagens.retrato, alt: "", loading: "lazy", width: 40, height: 40, "aria-hidden": "true" });
      img.addEventListener("error", function () { img.hidden = true; });
      return img;
    }

    function textoDaLinha(x) {
      var partes = [];
      if (typeof x.vd === "number") partes.push("VD " + x.vd);
      if (x.nivel) partes.push(x.nivel);
      if (x.tipo) partes.push(x.tipo);
      if (x.tamanho) partes.push(x.tamanho);
      if (x.pv) partes.push(x.pv + " PV");
      if (x.sistema === "universal") partes.push("ficha universal");
      return partes.join(" · ");
    }

    function linha(x) {
      var chave = estado.aba + ":" + x.id;
      var idDet = id + "-" + String(x.id).replace(/[^a-z0-9]+/gi, "-");
      var aberto = !!estado.abertos[chave];
      var detalhes = el("div.bib-item__detalhes", { id: idDet, hidden: !aberto });

      var botaoAbrir = el("button.bib-item__abrir", {
        type: "button", "aria-expanded": String(aberto), "aria-controls": idDet, "aria-label": "Consultar " + x.nome,
        onclick: function () {
          var abrirAgora = detalhes.hidden;
          estado.abertos[chave] = abrirAgora;
          detalhes.hidden = !abrirAgora;
          botaoAbrir.setAttribute("aria-expanded", String(abrirAgora));
          if (abrirAgora && !detalhes.firstChild) montarDetalhes(x, detalhes);
        },
      }, [
        el("span.bib-item__seta", { "aria-hidden": "true" }),
        miniatura(x),
        el("span.bib-item__texto", {}, [
          el("span.bib-item__nome", { texto: x.nome }),
          el("span.bib-item__classe", { texto: textoDaLinha(x) }),
        ]),
      ]);

      var marcas = el("span.bib-item__marcas", {}, (x.elementos || []).map(function (e) {
        return el("span.r-etiqueta.bib-elemento.bib-elemento--" + e, { texto: NOMES_ELEMENTO[e] });
      }).concat([
        x.livro ? el("span.r-etiqueta.bib-fonte", { texto: OC().referencia(x.livro, x.pagina), title: OC().FONTES[x.livro].nome }) : null,
        estado.aba === "homebrew" ? el("span.r-etiqueta", { texto: x.meu ? (x.visibilidade === "publico" ? "Sua · pública" : "Sua") : "Pública" }) : null,
      ]));

      if (aberto) montarDetalhes(x, detalhes);

      return el("article.bib-item", {}, [
        el("div.bib-item__topo", {}, [botaoAbrir, marcas]),
        el("div.faixa.bib-criatura__acoes", {}, botoesDaLinha(x)),
        detalhes,
      ]);
    }

    /* A ficha inteira de uma linha: do catálogo, uma cópia nova; do
       Homebrew, lida de novo no servidor — uma permissão pode ter mudado
       desde a lista. */
    async function fichaDe(x) {
      if (estado.aba === "oficial") return { ok: true, criatura: OC().criatura(x.id), origem: { tipo: "catalogo", id: x.id } };
      var r = await global.RAMAApi.lerHomebrew(x.id);
      if (!r.ok) return r;
      if (!r.dados || r.dados.tipo !== "criatura") return { ok: false, erro: "nao_encontrado" };
      return { ok: true, criatura: r.dados, origem: { tipo: "homebrew", id: x.id, meu: !!r.dados.meu } };
    }

    async function montarDetalhes(x, caixa) {
      U.trocar(caixa, UI.carregando("Abrindo a ficha"));
      var f = await fichaDe(x);
      if (!f.ok) { U.trocar(caixa, el("p.t-mini.t-erro", { texto: "Não foi possível abrir esta criatura. Ela pode ter sido apagada ou deixado de ser pública." })); return; }
      var painel = global.RAMACriaturaPainel.criar(f.criatura, { consulta: true, rotulo: estado.aba === "oficial" ? "Catálogo" : "Homebrew" });
      U.trocar(caixa, [painel.raiz]);
    }

    function botoesDaLinha(x) {
      var botoes = (o.acoes || []).map(function (a) {
        return el("button.r-botao.r-botao--mini" + (a.principal ? ".r-botao--principal" : ""), {
          type: "button", texto: a.rotulo,
          onclick: async function (ev) {
            var botao = ev.currentTarget;
            await UI.ocupar(botao, async function () {
              var f = await fichaDe(x);
              if (!f.ok) { UI.avisoDeFalha(f, "leitura da criatura"); return; }
              if (!aberta) return;
              var fechar = await a.aoEscolher(f.criatura, f.origem);
              if (fechar === true || (a.fechar && fechar !== false)) janela.fechar();
            });
          },
        });
      });
      if (estado.aba === "oficial" && o.copiarParaHomebrew !== false) {
        botoes.push(el("button.r-botao.r-botao--mini.r-botao--fantasma", {
          type: "button", texto: "Copiar para o Homebrew",
          onclick: function (ev) { copiarParaHomebrew(x, ev.currentTarget); },
        }));
      }
      return botoes;
    }

    async function copiarParaHomebrew(x, botao) {
      var copia = OC().copiaParaHomebrew(x.id);
      if (!copia) return;
      var r = await UI.ocupar(botao, function () { return global.RAMAApi.salvarHomebrew(copia); }, { rotulo: "Copiando…" });
      if (!r || r.ignorado) return;
      if (!r.ok) { UI.avisoDeFalha(r, "cópia para o Homebrew"); return; }
      UI.avisoOk(x.nome + " foi copiada para o seu Homebrew, como privada. O catálogo não muda.");
      estado.homebrew = null;
      if (o.aoCopiar) o.aoCopiar(r.dados && r.dados.id);
    }

    /* ---------- abas ---------- */

    function pintar() {
      pintarAbas();
      var oficial = estado.aba === "oficial";
      if (oficial && !estado.catalogo) {
        if (estado.falhaCatalogo) {
          U.trocar(corpo, el("div.r-vazio", {}, [
            el("p.r-vazio__titulo.t-erro", { texto: "Não foi possível abrir o catálogo" }),
            el("p.r-vazio__texto", { texto: "O arquivo do catálogo de criaturas não carregou. Confira a conexão e tente de novo." }),
            el("button.r-botao", { type: "button", texto: "Tentar novamente", onclick: carregarCatalogo }),
          ]));
          return;
        }
        U.trocar(corpo, UI.carregando("Abrindo o catálogo de criaturas"));
        if (!estado.carregando) carregarCatalogo();
        return;
      }
      if (!oficial && !estado.homebrew) {
        if (estado.falhaHomebrew) {
          U.trocar(corpo, el("div.r-vazio", {}, [
            el("p.r-vazio__titulo.t-erro", { texto: "Não foi possível ler o Homebrew" }),
            el("button.r-botao", { type: "button", texto: "Tentar novamente", onclick: carregarHomebrew }),
          ]));
          return;
        }
        U.trocar(corpo, UI.carregando("Lendo as criaturas do Homebrew"));
        if (!estado.carregandoHb) carregarHomebrew();
        return;
      }

      indiceAtual = oficial ? estado.catalogo.indice : estado.homebrew;
      var f = filtros(indiceAtual.length, 0, oficial);
      pintarLista();
      U.trocar(corpo, f.nos.concat([oficial ? ferramentas() : null, status, lista]));
    }

    var janela = UI.modal({
      titulo: o.titulo || "Biblioteca de criaturas",
      largo: true,
      conteudo: [
        el("div.pilha.bib.bib-criaturas-janela", {}, [
          o.ajuda ? el("p.t-mini", { texto: o.ajuda }) : null,
          abas,
          corpo,
          el("p.t-mini", {
            texto: "Consultar não muda nada. Cada escolha leva uma CÓPIA independente: ela não muda o catálogo nem o modelo do Homebrew, e eles não a mudam depois. " +
              "As fichas oficiais não são editáveis — copie para o Homebrew ou edite a ocorrência.",
          }),
        ]),
      ],
      botoes: [{ rotulo: "Fechar", classe: "r-botao--fantasma" }],
      aoFechar: function () { aberta = false; },
    });
    pintar();
    return janela;
  }

  global.RAMABibliotecaCriaturas = { abrir: abrir };
})(window);
