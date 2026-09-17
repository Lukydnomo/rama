/* =====================================================================
   R.A.M.A. — ficha · inventário · "Da biblioteca"
   ---------------------------------------------------------------------
   A janela que traz itens para o inventário sem cadastrá-los à mão.

   Na ficha de Ordem Paranormal, duas origens — o padrão da aba
   Habilidades:

     Ordem Paranormal   o catálogo oficial dos dois livros, em abas
                        (Armas, Munições, Proteções, Geral, Itens
                        Amaldiçoados), com busca e filtros
     Homebrew           os itens da biblioteca que esta conta pode ver:
                        os próprios e os públicos, filtrados no servidor

   Na ficha universal, só a Homebrew — o R.A.M.A. não impõe regra de
   Ordem a quem não joga Ordem.

   ---------------------------------------------------------------------
   O QUE A JANELA PROMETE
   ---------------------------------------------------------------------

   · Cada resultado aparece compacto; os detalhes só são montados quando
     alguém abre aquele resultado. O catálogo carrega sob demanda, na
     primeira abertura.
   · Adicionar cria uma CÓPIA independente, com id próprio e rastro da
     origem. A janela continua aberta, com a mesma busca e os mesmos
     filtros, para escolher o próximo item. Um clique duplo não vira dois
     itens; clicar de novo depois, de propósito, vira.
   · Modificações e maldições não são itens: o botão delas é "Aplicar a
     um item", que lista o que no inventário aceita aquela melhoria.
   · Adicionar ao inventário NÃO põe em uso: proteção entra guardada, e
     nenhum efeito que dependa de uso, escolha ou condição é ligado.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var F = global.RAMAFicha;
  var el = U.el;

  function IT() { return global.RAMAOrdemItens; }
  function I() { return global.RAMAOrdemInventario; }
  function R() { return global.RAMAOrdemRegras; }

  /* Tipos de Homebrew que são itens. Habilidades e criaturas moram na
     mesma biblioteca e não entram aqui. */
  var TIPOS_DE_ITEM = ["item", "arma", "armadura", "mochila"];

  /* A aba e a origem da última abertura, só nesta página. */
  var lembrado = { origem: "oficial", aba: "armas" };

  var contador = 0;

  function deOrdem(ctx) {
    return !!(ctx && F.ehDeOrdem(ctx.ficha) && IT() && I());
  }

  function ordemDe(ctx) { return ctx.ficha.ordem; }

  function itensDaFicha(ctx) { return (ctx.ficha.inventario && ctx.ficha.inventario.itens) || []; }

  /* A quantidade só aparece onde faz sentido contar unidades. */
  function aceitaQuantidade(e) {
    return e.aba === "municoes" || !!(e.consumivel || e.granada || e.municaoAmaldicoada || e.catalisador || e.medicamento);
  }

  /* =================================================================
     ABRIR
     ================================================================= */

  /* opcoes: { origem, aba, tipo, alvoId } — `alvoId` abre a janela para
     aplicar modificações num item escolhido do inventário. */
  function abrir(ctx, opcoes) {
    var o = opcoes || {};
    var ordem = deOrdem(ctx);
    var id = "bib-" + (++contador);

    var estado = {
      origem: ordem ? (o.origem || (o.alvoId ? "oficial" : lembrado.origem)) : "homebrew",
      aba: o.aba || lembrado.aba,
      busca: "", fonte: "", tipo: o.tipo || "", categoria: "", elemento: "",
      alvoId: o.alvoId || null,
      abertos: {},
      catalogo: null, carregandoCatalogo: false, falhaCatalogo: null,
      homebrew: null,
      hb: { busca: "", escopo: "", tipo: "", categoria: "" },
    };

    var janela = el("div.pilha.biblioteca.bib", { id: id });
    var anuncio = el("p.so-leitor", { role: "status", "aria-live": "polite" });
    var corpo = el("div.pilha");
    var aberta = true;

    function anunciar(texto) {
      anuncio.textContent = "";
      setTimeout(function () { anuncio.textContent = texto; }, 30);
    }

    /* ---------------------------------------------------------------
       ORIGENS
       --------------------------------------------------------------- */

    function pintar() {
      var partes = [];
      if (ordem) {
        partes.push(el("div.biblioteca-origens", { role: "group", "aria-label": "Origem dos itens" }, [
          botaoOrigem("oficial", "Ordem Paranormal"),
          botaoOrigem("homebrew", "Homebrew"),
        ]));
      }
      if (estado.alvoId) {
        var alvo = U.porId(itensDaFicha(ctx), estado.alvoId);
        if (alvo) {
          partes.push(el("p.t-mini.bib-alvo", {}, [
            el("span", { texto: "Aplicando em: " }),
            el("strong", { texto: alvo.nome }),
            el("button.r-botao.r-botao--mini.r-botao--fantasma", {
              type: "button", texto: "Escolher item na hora",
              onclick: function () { estado.alvoId = null; pintar(); },
            }),
          ]));
        } else {
          estado.alvoId = null;
        }
      }
      partes.push(corpo, anuncio);
      U.trocar(janela, partes);
      pintarOrigem();
    }

    function botaoOrigem(chave, rotulo) {
      return el("button.biblioteca-origem", {
        type: "button",
        "aria-pressed": String(estado.origem === chave),
        texto: rotulo,
        onclick: function () {
          if (estado.origem === chave) return;
          estado.origem = chave;
          lembrado.origem = chave;
          pintar();
          var novo = U.$$(".biblioteca-origem", janela).filter(function (b) { return b.textContent === rotulo; })[0];
          if (novo) novo.focus();
        },
      });
    }

    function pintarOrigem() {
      if (estado.origem === "oficial") pintarOficial();
      else pintarHomebrew();
    }

    /* ---------------------------------------------------------------
       ORDEM PARANORMAL
       --------------------------------------------------------------- */

    function pintarOficial() {
      if (!estado.catalogo) {
        if (estado.falhaCatalogo) {
          U.trocar(corpo, el("div.r-vazio", {}, [
            el("p.r-vazio__titulo.t-erro", { texto: "Não foi possível abrir o catálogo" }),
            el("p.r-vazio__texto", { texto: "O arquivo do catálogo não carregou. Confira a conexão e tente de novo — nada foi alterado na ficha." }),
            el("button.r-botao", { type: "button", texto: "Tentar novamente", onclick: function () { carregarCatalogo(true); } }),
          ]));
          return;
        }
        U.trocar(corpo, UI.carregando("Abrindo o catálogo de itens"));
        if (!estado.carregandoCatalogo) carregarCatalogo();
        return;
      }

      if (!estado.catalogo.itens.length) {
        U.trocar(corpo, UI.vazio({ titulo: "Catálogo vazio", texto: "O arquivo do catálogo carregou sem nenhum item." }));
        return;
      }

      var lista = el("div.biblioteca-lista.bib-lista", { "aria-live": "off" });
      var status = el("p.t-mini.bib-status", { role: "status" });
      var abas = el("div.r-abas.biblioteca-abas", { role: "group", "aria-label": "Categoria do catálogo" });
      var filtros = el("div.bib-filtros");

      function pintarAbas() {
        var contagem = IT().contagemPorAba(estado.catalogo, estado);
        U.trocar(abas, IT().ABAS.map(function (a, i, todas) {
          return el("button.r-aba", {
            type: "button",
            "aria-pressed": String(a.chave === estado.aba),
            texto: a.rotulo + " (" + contagem[a.chave] + ")",
            dataset: { aba: a.chave },
            onclick: function () { trocarAba(a.chave); },
            onkeydown: function (ev) {
              if (ev.key !== "ArrowRight" && ev.key !== "ArrowLeft") return;
              ev.preventDefault();
              var j = (i + (ev.key === "ArrowRight" ? 1 : -1) + todas.length) % todas.length;
              trocarAba(todas[j].chave);
            },
          });
        }));
      }

      function trocarAba(chave) {
        if (estado.aba === chave) return;
        estado.aba = chave;
        lembrado.aba = chave;
        estado.tipo = "";
        estado.elemento = "";
        pintarFiltros();
        pintarAbas();
        pintarLista();
        var botao = U.$('[data-aba="' + chave + '"]', abas);
        if (botao) botao.focus();
      }

      var busca = el("input.r-entrada", {
        type: "search", placeholder: "Buscar por nome", "aria-label": "Buscar item no catálogo",
        value: estado.busca,
        oninput: function (ev) { estado.busca = ev.target.value; pintarAbas(); pintarLista(); },
      });

      function seletor(rotulo, chave, opcoes, todos) {
        var idSel = id + "-" + chave;
        var select = el("select.r-selecao", {
          id: idSel,
          onchange: function (ev) { estado[chave] = ev.target.value; pintarAbas(); pintarLista(); pintarFiltros(); },
        }, [el("option", { value: "", texto: todos })].concat(opcoes.map(function (op) {
          return el("option", { value: op.valor, texto: op.rotulo, selected: estado[chave] === op.valor });
        })));
        return el("div.bib-filtro", {}, [el("label.t-mini", { for: idSel, texto: rotulo }), select]);
      }

      function pintarFiltros() {
        var op = IT().opcoesDeFiltro(estado.catalogo, estado.aba);
        if (estado.tipo && !op.tipos.some(function (t) { return t.valor === estado.tipo; })) estado.tipo = "";
        var ativos = !!(estado.busca || estado.fonte || estado.tipo || estado.categoria || estado.elemento);
        U.trocar(filtros, [
          seletor("Fonte", "fonte", op.fontes, "Todas"),
          seletor("Tipo", "tipo", op.tipos, "Todos"),
          seletor("Categoria", "categoria", op.categorias, "Todas"),
          op.elementos.length ? seletor("Elemento", "elemento", op.elementos, "Todos") : null,
          ativos ? el("button.r-botao.r-botao--mini.r-botao--fantasma.bib-limpar", {
            type: "button", texto: "Limpar busca e filtros",
            onclick: function () {
              estado.busca = ""; estado.fonte = ""; estado.tipo = ""; estado.categoria = ""; estado.elemento = "";
              busca.value = "";
              pintarFiltros(); pintarAbas(); pintarLista();
              busca.focus();
            },
          }) : null,
        ]);
      }

      function pintarLista() {
        var entradas = IT().filtrar(estado.catalogo, estado);
        var secoes = IT().secoes(estado.aba, entradas);
        var total = entradas.length;

        if (!total) {
          var outras = IT().contagemPorAba(estado.catalogo, estado);
          var dicas = IT().ABAS.filter(function (a) { return a.chave !== estado.aba && outras[a.chave] > 0; });
          status.textContent = "Nenhum resultado nesta aba.";
          U.trocar(lista, el("div.r-vazio.bib-nada", {}, [
            el("p.r-vazio__titulo", { texto: "Nenhum item encontrado" }),
            el("p.r-vazio__texto", {
              texto: dicas.length ? "Mas há resultados em outras abas:" : "Tente outro nome, ou limpe os filtros.",
            }),
            dicas.length ? el("div.faixa", {}, dicas.map(function (a) {
              return el("button.r-botao.r-botao--mini", {
                type: "button", texto: a.rotulo + " (" + outras[a.chave] + ")",
                onclick: function () { trocarAba(a.chave); },
              });
            })) : null,
          ]));
          return;
        }

        status.textContent = total + (total === 1 ? " resultado" : " resultados") + (estado.busca ? " para “" + estado.busca + "”" : "") + ".";
        U.trocar(lista, secoes.map(function (s) {
          return el("section.biblioteca-secao", { "aria-label": s.titulo }, [
            el("h3.t-rotulo", { texto: s.titulo + " (" + s.entradas.length + ")" }),
            s.nota ? el("p.t-mini", { texto: s.nota }) : null,
            el("div.bib-itens", {}, s.entradas.map(linhaOficial)),
          ]);
        }));
      }

      pintarAbas();
      pintarFiltros();
      pintarLista();

      U.trocar(corpo, [
        abas,
        el("div.r-busca", {}, [el("span.r-busca__marca", {}, [UI.simbolo("busca")]), busca]),
        filtros,
        status,
        lista,
        el("p.t-mini", {
          texto: "Cada item entra na ficha como cópia: editar a cópia não muda o catálogo, e o catálogo não muda a cópia. Adicionar não põe o item em uso.",
        }),
      ]);
    }

    /* `focar`: veio do "Tentar novamente". O botão some ao carregar, e o
       foco não pode cair no vazio — vai para a busca (ou para o novo
       "Tentar novamente", se falhou de novo). */
    function carregarCatalogo(focar) {
      estado.carregandoCatalogo = true;
      estado.falhaCatalogo = null;
      if (estado.origem === "oficial") U.trocar(corpo, UI.carregando("Abrindo o catálogo de itens"));
      IT().carregar().then(function (catalogo) {
        estado.catalogo = catalogo;
        estado.carregandoCatalogo = false;
        if (aberta && estado.origem === "oficial") { pintarOficial(); if (focar) focarEm("input[type=search]"); }
      }, function (erro) {
        console.error("[R.A.M.A. · biblioteca] o catálogo não carregou", erro);
        estado.falhaCatalogo = erro || new Error("falha");
        estado.carregandoCatalogo = false;
        if (aberta && estado.origem === "oficial") { pintarOficial(); if (focar) focarEm("button"); }
      });
    }

    function focarEm(seletor) {
      var alvo = corpo.querySelector(seletor);
      if (alvo) alvo.focus();
    }

    /* Uma entrada do catálogo, compacta; os detalhes nascem ao abrir. */
    function linhaOficial(e) {
      var idDet = id + "-" + e.id.replace(/[^a-z0-9]+/gi, "-");
      var aberto = !!estado.abertos[e.id];
      var detalhes = el("div.bib-item__detalhes", { id: idDet, hidden: !aberto });
      var naFicha = el("span.r-etiqueta.bib-item__na-ficha", { hidden: true });

      function atualizarNaFicha() {
        if (e.natureza !== "item") return;
        var n = IT().quantasNaFicha(e, itensDaFicha(ctx));
        naFicha.hidden = !n;
        naFicha.textContent = "na ficha: " + n;
      }
      atualizarNaFicha();

      var botaoAbrir = el("button.bib-item__abrir", {
        type: "button",
        "aria-expanded": String(aberto),
        "aria-controls": idDet,
        onclick: function () {
          var abrirAgora = detalhes.hidden;
          estado.abertos[e.id] = abrirAgora;
          detalhes.hidden = !abrirAgora;
          botaoAbrir.setAttribute("aria-expanded", String(abrirAgora));
          if (abrirAgora && !detalhes.firstChild) montarDetalhesOficiais(e, detalhes, atualizarNaFicha);
        },
      }, [
        el("span.bib-item__seta", { "aria-hidden": "true" }),
        el("span.bib-item__texto", {}, [
          el("span.bib-item__nome", { texto: e.nome }),
          el("span.bib-item__classe", { texto: e.classificacao }),
          dadosCompactos(IT().resumoCompacto(e)),
        ]),
      ]);

      var marcas = el("span.bib-item__marcas", {}, [
        e.natureza === "item"
          ? el("span.r-etiqueta", { texto: "Cat. " + (e.categoria === null ? "—" : IT().rotuloCategoria(e.categoria)), title: "Categoria de equipamento (0 a IV)" })
          : el("span.r-etiqueta.r-etiqueta--para", { texto: e.natureza === "maldicao" ? "Maldição" : "Modificação" }),
        e.natureza === "item"
          ? el("span.r-etiqueta", { texto: (e.espacos === null ? "1*" : String(e.espacos).replace(".", ",")) + " esp.", title: e.espacos === null ? "Espaços não informados no livro: vale o padrão de 1" : "Espaços por unidade" })
          : null,
        e.elemento ? el("span.r-etiqueta.bib-elemento.bib-elemento--" + e.elemento, { texto: IT().ELEMENTOS[e.elemento] }) : null,
        el("span.r-etiqueta.bib-fonte", { texto: IT().SIGLA_FONTE[e.fonte] + " p. " + e.pagina, title: IT().referencia(e) }),
        naFicha,
      ]);

      if (aberto) montarDetalhesOficiais(e, detalhes, atualizarNaFicha);

      return el("article.bib-item", { class: e.natureza !== "item" ? "bib-item--melhoria" : "" }, [
        el("div.bib-item__topo", {}, [botaoAbrir, marcas]),
        detalhes,
      ]);
    }

    function dadosCompactos(pares) {
      if (!pares.length) return null;
      return el("span.bib-item__dados", {}, pares.map(function (p) {
        return el("span.item-dados__par", {}, [
          el("span.item-dados__rotulo", { texto: p[0] + ":" }),
          el("span.item-dados__valor", { texto: p[1] }),
        ]);
      }));
    }

    function listaDeTextos(textos, classe) {
      if (!textos.length) return null;
      return el("ul.bib-lista-textos" + (classe ? "." + classe : ""), {}, textos.map(function (t) { return el("li", { texto: t }); }));
    }

    function montarDetalhesOficiais(e, caixa, aoAdicionar) {
      var pares = IT().detalhes(e, estado.catalogo);
      var automacao = IT().naFicha(e);
      var requisitos = IT().requisitos(e).concat(conferenciasDaFicha(e));

      U.trocar(caixa, [
        el("p.bib-item__resumo", { texto: e.resumo }),
        el("dl.r-dados.bib-item__pares", {}, pares.reduce(function (saida, p) {
          saida.push(el("dt", { texto: p[0] }));
          saida.push(el("dd", { texto: p[1] }));
          return saida;
        }, [])),
        e.efeitos.length ? el("h4.t-rotulo", { texto: "Efeitos" }) : null,
        listaDeTextos(e.efeitos),
        IT().regrasGerais(e).length ? el("h4.t-rotulo", { texto: "Regras que acompanham" }) : null,
        listaDeTextos(IT().regrasGerais(e), "t-mini"),
        requisitos.length ? el("h4.t-rotulo", { texto: "Requisitos e restrições" }) : null,
        listaDeTextos(requisitos, "t-mini"),
        el("p.t-mini.bib-automacao", {}, [
          el("span.r-etiqueta", {
            class: automacao.automacao === "calculo" ? "etiqueta--calculo" : "",
            texto: { calculo: "Automatizado", parcial: "Parcial", texto: "Controle manual" }[automacao.automacao],
          }),
          el("span", { texto: " " + automacao.texto }),
        ]),
        e.notas.length ? listaDeTextos(e.notas.map(function (n) { return "Nota: " + n; }), "t-mini.t-aviso") : null,
        e.natureza === "item" ? acaoAdicionar(e, aoAdicionar) : acaoAplicar(e),
      ]);
    }

    /* O que a ficha já sabe que vale a pena dizer: proficiência e
       patente. Nada é bloqueado por isso — a decisão é da mesa. */
    function conferenciasDaFicha(e) {
      var avisos = [];
      if (!R() || !ctx.ficha.ordem) return avisos;
      var o = ordemDe(ctx);
      if (e.natureza === "item" && e.arma && e.arma.proficiencia) {
        var montado = IT().paraInventario(e, { catalogo: estado.catalogo, escolha: primeiraOpcao(e) });
        if (montado.ok) {
          var prof = R().proficienciaDaArma(o, F.criarItem(montado.tipo, montado.dados));
          if (prof.proficiente === false) avisos.push("Nesta ficha: " + prof.texto);
        }
      }
      if (e.aba === "amaldicoados" && R().regraDePatente(o)) {
        var pat = R().patente(o).patente;
        if (["recruta", "operador"].indexOf(pat.chave) >= 0) {
          avisos.push("Nesta ficha: a patente é " + pat.nome + " — itens amaldiçoados ainda não são liberados.");
        }
      }
      return avisos;
    }

    function primeiraOpcao(e) {
      if (!e.escolha || e.escolha.opcional) return undefined;
      var ops = IT().opcoesDaEscolha(e.escolha);
      return ops.length ? ops[0].valor : undefined;
    }

    function campoDeEscolha(e) {
      if (!e.escolha) return null;
      var idCampo = id + "-esc-" + e.id.replace(/[^a-z0-9]+/gi, "-");
      var entrada;
      if (e.escolha.tipo === "texto") {
        entrada = el("input.r-entrada", { id: idCampo, type: "text", maxlength: 60 });
      } else {
        entrada = el("select.r-selecao", { id: idCampo }, [
          el("option", { value: "", texto: e.escolha.opcional ? "Sem escolher agora" : "Escolha…" }),
        ].concat(IT().opcoesDaEscolha(e.escolha).map(function (op) {
          return el("option", { value: op.valor, texto: op.rotulo });
        })));
      }
      return { caixa: el("div.r-campo.bib-campo", {}, [el("label.r-rotulo", { for: idCampo, texto: e.escolha.rotulo }), entrada]), entrada: entrada };
    }

    function acaoAdicionar(e, aoAdicionar) {
      var escolha = campoDeEscolha(e);
      var quantidade = null;
      var idQtd = id + "-qtd-" + e.id.replace(/[^a-z0-9]+/gi, "-");
      if (aceitaQuantidade(e)) {
        quantidade = el("input.r-entrada.r-entrada--numero.bib-quantidade", {
          id: idQtd, type: "text", inputmode: "numeric", maxlength: 3, value: "1",
        });
      }
      var status = el("p.t-mini.bib-item__status", { role: "status" });
      var botao = el("button.r-botao.r-botao--principal.bib-item__adicionar", {
        type: "button",
        texto: "Adicionar ao inventário",
        "aria-label": "Adicionar " + e.nome + " ao inventário",
        onkeydown: function (ev) { if (ev.key === "Enter" && ev.repeat) ev.preventDefault(); },
        onclick: function (ev) {
          /* O segundo clique de um clique duplo não é outra intenção. */
          if (ev.detail > 1) return;
          adicionarOficial(e, escolha, quantidade, botao, status, aoAdicionar);
        },
      });
      return el("div.bib-item__acao", {}, [
        escolha ? escolha.caixa : null,
        quantidade ? el("div.r-campo.bib-campo", {}, [
          el("label.r-rotulo", { for: idQtd, texto: e.municao ? "Quantidade (" + (e.municao.unidade === "foguete" ? "foguetes" : e.municao.unidade + "s") + ")" : "Quantidade" }),
          quantidade,
        ]) : null,
        botao,
        status,
      ]);
    }

    function periciaUniversal(chave) {
      var alvo = chave === "luta" ? "luta" : "pontaria";
      var p = (ctx.ficha.pericias || []).filter(function (x) { return U.chaveDeBusca(x.nome) === alvo; })[0];
      return p ? p.id : null;
    }

    function adicionarOficial(e, escolha, quantidade, botao, status, aoAdicionar) {
      if (botao.getAttribute("aria-busy") === "true") return;
      status.classList.remove("t-erro");

      var qtd = 1;
      if (quantidade) {
        var rq = I().validarQuantidade(quantidade.value);
        if (!rq.ok) { status.textContent = rq.mensagem; status.classList.add("t-erro"); quantidade.focus(); return; }
        qtd = rq.valor;
      }

      var montado = IT().paraInventario(e, {
        escolha: escolha ? escolha.entrada.value : undefined,
        quantidade: qtd,
        catalogo: estado.catalogo,
        periciaUniversal: periciaUniversal,
      });
      if (!montado.ok) {
        status.textContent = montado.mensagem;
        status.classList.add("t-erro");
        if (escolha) escolha.entrada.focus();
        return;
      }

      botao.setAttribute("aria-busy", "true");
      botao.disabled = true;
      var item;
      try {
        item = F.criarItem(montado.tipo, montado.dados);
        item.adicionadoEm = U.agoraISO();
        ctx.ficha.inventario.itens.push(item);
        ctx.alterou();
        ctx.redesenhar();
      } finally {
        botao.removeAttribute("aria-busy");
        botao.disabled = false;
      }

      var n = IT().quantasNaFicha(e, itensDaFicha(ctx));
      var texto = item.nome + (qtd > 1 ? " ×" + qtd : "") + " entrou no inventário" + (n > 1 ? " (" + n + " cópias na ficha)" : "") + ".";
      status.textContent = texto;
      anunciar(texto);
      if (aoAdicionar) aoAdicionar();
      if (quantidade) quantidade.value = "1";
      botao.focus();
    }

    /* ---------------------------------------------------------------
       APLICAR MODIFICAÇÃO OU MALDIÇÃO
       --------------------------------------------------------------- */

    function acaoAplicar(e) {
      var caixa = el("div.bib-item__acao.bib-aplicar");
      var escolha = campoDeEscolha(e);
      var status = el("p.t-mini.bib-item__status", { role: "status" });
      var mostrarOutros = false;

      function pintarAlvos() {
        var itens = itensDaFicha(ctx);
        if (estado.alvoId) {
          var alvo = U.porId(itens, estado.alvoId);
          if (alvo) itens = [alvo];
        }
        var alvos = IT().alvosPara(e, itens);
        var partes = [escolha ? escolha.caixa : null];

        if (!itens.length) {
          partes.push(el("p.t-mini", { texto: "O inventário está vazio. Adicione primeiro o item que vai receber " + e.nome + "." }));
        } else if (estado.alvoId && itens.length === 1) {
          /* Um item escolhido pelo menu dele: a resposta é sobre ELE —
             o botão, o aviso ou o motivo da recusa, sem lista escondida. */
          partes.push(el("p.t-rotulo", { texto: "Aplicar em" }));
          if (alvos.compativeis.length) {
            partes.push(el("div.bib-alvos", {}, [botaoAlvo(itens[0], null)]));
          } else if (alvos.desconhecidos.length) {
            partes.push(el("div.bib-alvos", {}, [botaoAlvo(itens[0], alvos.desconhecidos[0].aviso)]));
          } else {
            partes.push(el("p.t-mini.bib-alvo-recusado", {
              texto: itens[0].nome + " não aceita " + e.nome + ": " + alvos.incompativeis[0].motivo,
            }));
          }
        } else {
          partes.push(el("p.t-rotulo", { texto: estado.alvoId ? "Aplicar em" : "Itens do inventário que aceitam " + e.nome }));
          if (!alvos.compativeis.length) {
            partes.push(el("p.t-mini", { texto: "Nenhum item compatível no inventário." }));
          }
          partes.push(el("div.bib-alvos", {}, alvos.compativeis.map(function (x) { return botaoAlvo(x.item, null); })));

          if (alvos.desconhecidos.length || alvos.incompativeis.length) {
            partes.push(el("button.r-botao.r-botao--mini.r-botao--fantasma", {
              type: "button",
              "aria-expanded": String(mostrarOutros),
              texto: mostrarOutros ? "Esconder os outros itens" : "Mostrar os outros itens (" + (alvos.desconhecidos.length + alvos.incompativeis.length) + ")",
              onclick: function () { mostrarOutros = !mostrarOutros; pintarAlvos(); },
            }));
            if (mostrarOutros) {
              partes.push(el("div.bib-alvos", {}, alvos.desconhecidos.map(function (x) { return botaoAlvo(x.item, x.aviso); })
                .concat(alvos.incompativeis.map(function (x) {
                  return el("p.t-mini.bib-alvo-recusado", { texto: x.item.nome + ": " + x.motivo });
                }))));
            }
          }
        }
        partes.push(status);
        U.trocar(caixa, partes);
      }

      /* Com aviso (compatibilidade que a ficha não consegue conferir), o
         texto fica À VISTA ao lado do botão: dica de mouse não chega a
         quem usa celular ou teclado. */
      function botaoAlvo(item, aviso) {
        var botao = el("button.r-botao.r-botao--mini" + (aviso ? "" : ".r-botao--principal"), {
          type: "button",
          texto: "Aplicar em " + item.nome,
          onclick: function (ev) {
            if (ev.detail > 1) return;
            aplicarEm(item);
          },
        });
        if (!aviso) return botao;
        return el("div.bib-alvo", {}, [botao, el("span.t-mini.t-fraco", { texto: aviso })]);
      }

      function aplicarEm(item) {
        status.classList.remove("t-erro");
        var o = ordemDe(ctx);
        var antes = R().itensEfetivos(o, ctx.ficha.inventario).porId[item.id];
        var r = IT().aplicar(e, item, { escolha: escolha ? escolha.entrada.value : undefined });
        if (!r.ok) {
          status.textContent = r.motivo;
          status.classList.add("t-erro");
          return;
        }
        ctx.alterou();
        ctx.redesenhar();
        var depois = R().itensEfetivos(o, ctx.ficha.inventario).porId[item.id];
        var cat = antes && depois && antes.categoria.efetiva !== null
          ? " Categoria " + I().rotuloCategoria(antes.categoria.efetiva) + " → " + I().rotuloCategoria(depois.categoria.efetiva) + "." : "";
        var texto = r.registro.nome + " aplicada em " + item.nome + "." + cat + (r.aviso ? " " + r.aviso : "");
        status.textContent = texto;
        anunciar(texto);
        pintarAlvos();
      }

      pintarAlvos();
      return caixa;
    }

    /* ---------------------------------------------------------------
       HOMEBREW
       --------------------------------------------------------------- */

    function carregarHomebrew(focar) {
      estado.homebrew = { carregando: true };
      if (estado.origem === "homebrew") U.trocar(corpo, UI.carregando("Consultando a biblioteca Homebrew"));
      global.RAMAApi.listarHomebrew({ escopo: "todos", tipos: TIPOS_DE_ITEM }).then(function (r) {
        if (!r || !r.ok) {
          estado.homebrew = { falha: r || { ok: false, erro: "sem_resposta" } };
        } else {
          /* Um servidor anterior a esta versão ignora `tipos`: filtrar de
             novo aqui garante que habilidade e criatura não viram item. */
          estado.homebrew = {
            registros: (r.dados || []).filter(function (h) { return h && TIPOS_DE_ITEM.indexOf(h.tipo) >= 0; }),
          };
        }
        if (aberta && estado.origem === "homebrew") {
          pintarHomebrew();
          if (focar) focarEm(estado.homebrew.falha ? "button" : "input[type=search], button");
        }
      });
    }

    function pintarHomebrew() {
      if (!estado.homebrew) { carregarHomebrew(); return; }
      if (estado.homebrew.carregando) { U.trocar(corpo, UI.carregando("Consultando a biblioteca Homebrew")); return; }
      if (estado.homebrew.falha) {
        U.trocar(corpo, UI.erroDeTela(estado.homebrew.falha, function () { carregarHomebrew(true); }));
        return;
      }

      var registros = estado.homebrew.registros;
      if (!registros.length) {
        U.trocar(corpo, el("div.pilha", {}, [
          UI.vazio({
            titulo: "Nenhum item na Homebrew",
            texto: "Você ainda não guardou itens na sua biblioteca, e nenhuma conta publicou itens. Crie um item agora — ele pode ir para a Homebrew ao mesmo tempo.",
            acao: {
              rotulo: "Criar item",
              aoClicar: function () {
                m.fechar();
                if (global.RAMASecaoInventario && global.RAMASecaoInventario.novoItem) global.RAMASecaoInventario.novoItem(ctx);
              },
            },
          }),
          el("p.t-mini", {}, [
            el("span", { texto: "Ou organize a biblioteca na página " }),
            el("a", { href: U.url("homebrew/"), target: "_blank", rel: "noopener", texto: "Homebrew (abre em outra aba)" }),
            el("span", { texto: "." }),
          ]),
        ]));
        return;
      }

      var hb = estado.hb;
      var lista = el("div.biblioteca-lista.bib-lista");
      var status = el("p.t-mini.bib-status", { role: "status" });
      var filtros = el("div.bib-filtros");

      function seletorHb(rotulo, chave, opcoes, todos) {
        var idSel = id + "-hb-" + chave;
        return el("div.bib-filtro", {}, [
          el("label.t-mini", { for: idSel, texto: rotulo }),
          el("select.r-selecao", {
            id: idSel,
            onchange: function (ev) { hb[chave] = ev.target.value; pintarListaHb(); },
          }, [el("option", { value: "", texto: todos })].concat(opcoes.map(function (op) {
            return el("option", { value: op.valor, texto: op.rotulo, selected: hb[chave] === op.valor });
          }))),
        ]);
      }

      var tiposPresentes = TIPOS_DE_ITEM.filter(function (t) { return registros.some(function (h) { return h.tipo === t; }); });
      U.trocar(filtros, [
        seletorHb("Escopo", "escopo", [{ valor: "minha", rotulo: "Minhas" }, { valor: "publica", rotulo: "Públicas de outras contas" }], "Todas"),
        seletorHb("Tipo", "tipo", tiposPresentes.map(function (t) { return { valor: t, rotulo: rotuloTipoHb(t) }; }), "Todos"),
        ordem ? seletorHb("Categoria", "categoria",
          ["0", "1", "2", "3", "4"].map(function (n) { return { valor: n, rotulo: "Categoria " + I().rotuloCategoria(parseInt(n, 10)) }; })
            .concat([{ valor: "nula", rotulo: "Não informada" }]), "Todas") : null,
      ]);

      var busca = el("input.r-entrada", {
        type: "search", placeholder: "Buscar por nome", "aria-label": "Buscar item na Homebrew", value: hb.busca,
        oninput: function (ev) { hb.busca = ev.target.value; pintarListaHb(); },
      });

      function pintarListaHb() {
        var termo = U.chaveDeBusca(hb.busca);
        var visiveis = registros.filter(function (h) {
          if (hb.escopo === "minha" && !h.meu) return false;
          if (hb.escopo === "publica" && h.meu) return false;
          if (hb.tipo && h.tipo !== hb.tipo) return false;
          if (hb.categoria) {
            var cat = h.ordem ? I().categoriaValida(h.ordem.categoria) : null;
            if (hb.categoria === "nula" ? cat !== null : cat !== parseInt(hb.categoria, 10)) return false;
          }
          return !termo || U.chaveDeBusca(h.nome).indexOf(termo) >= 0;
        }).sort(function (a, b) { return String(a.nome).localeCompare(String(b.nome), "pt-BR"); });

        if (!visiveis.length) {
          status.textContent = "Nenhum resultado.";
          U.trocar(lista, el("div.r-vazio.bib-nada", {}, [
            el("p.r-vazio__titulo", { texto: "Nenhum item encontrado" }),
            el("button.r-botao.r-botao--mini", {
              type: "button", texto: "Limpar busca e filtros",
              onclick: function () { hb.busca = ""; hb.escopo = ""; hb.tipo = ""; hb.categoria = ""; pintarHomebrew(); },
            }),
          ]));
          return;
        }
        status.textContent = visiveis.length + (visiveis.length === 1 ? " item" : " itens") + ".";
        U.trocar(lista, el("div.bib-itens", {}, visiveis.map(linhaHomebrew)));
      }

      pintarListaHb();
      U.trocar(corpo, [
        el("div.r-busca", {}, [el("span.r-busca__marca", {}, [UI.simbolo("busca")]), busca]),
        filtros,
        status,
        lista,
        el("p.t-mini", { texto: "O item entra na ficha como cópia. Editá-lo aqui não muda o modelo da biblioteca, e editar o modelo não muda esta ficha." }),
      ]);
    }

    function rotuloTipoHb(tipo) {
      if (tipo === "armadura") return ordem ? "Proteção" : "Armadura";
      return F.rotuloDoTipo(tipo);
    }

    function paresHomebrew(h) {
      var pares = [];
      if (h.tipo === "arma" && h.dano) pares.push(["Dano", h.dano + (h.danoExtra ? " + " + h.danoExtra : "")]);
      if (h.tipo === "arma" && h.critico) pares.push(["Crítico", IT() ? IT().rotuloCritico(h.critico, h.multiplicador) : String(h.critico)]);
      if (h.tipo === "armadura") pares.push(["Defesa", U.comSinal(U.inteiro(h.defesa, 0))]);
      if (ordem && h.ordem) {
        var cat = I().categoriaValida(h.ordem.categoria);
        pares.push(["Categoria", cat === null ? "—" : I().rotuloCategoria(cat)]);
        var esp = I().dadosDoItem(h).espacos;
        pares.push(["Espaços", esp === null ? "1 (padrão)" : I().rotuloEspacos(esp)]);
      }
      if (!ordem && h.tipo === "mochila") pares.push(["Reduz", String(h.reducaoPeso || 0)]);
      if (!ordem && h.tipo !== "mochila") pares.push(["Peso", String(h.peso || 0)]);
      return pares;
    }

    function linhaHomebrew(h) {
      var idDet = id + "-hb-" + String(h.id).replace(/[^a-z0-9]+/gi, "-");
      var aberto = !!estado.abertos["hb:" + h.id];
      var detalhes = el("div.bib-item__detalhes", { id: idDet, hidden: !aberto });

      var botaoAbrir = el("button.bib-item__abrir", {
        type: "button", "aria-expanded": String(aberto), "aria-controls": idDet,
        onclick: function () {
          var abrirAgora = detalhes.hidden;
          estado.abertos["hb:" + h.id] = abrirAgora;
          detalhes.hidden = !abrirAgora;
          botaoAbrir.setAttribute("aria-expanded", String(abrirAgora));
          if (abrirAgora && !detalhes.firstChild) montarDetalhesHb(h, detalhes);
        },
      }, [
        el("span.bib-item__seta", { "aria-hidden": "true" }),
        el("span.bib-item__texto", {}, [
          el("span.bib-item__nome", { texto: h.nome }),
          el("span.bib-item__classe", { texto: rotuloTipoHb(h.tipo) + (h.categoria ? " · " + h.categoria : "") }),
          dadosCompactos(paresHomebrew(h)),
        ]),
      ]);

      if (aberto) montarDetalhesHb(h, detalhes);

      return el("article.bib-item", {}, [
        el("div.bib-item__topo", {}, [
          botaoAbrir,
          el("span.bib-item__marcas", {}, [
            el("span.r-etiqueta", { texto: h.meu ? "Minha" : "Pública" }),
            h.atualizadoEm ? el("span.r-etiqueta.bib-fonte", { texto: U.dataCurta(h.atualizadoEm) }) : null,
          ]),
        ]),
        detalhes,
      ]);
    }

    function montarDetalhesHb(h, caixa) {
      var quantidade = null;
      var idQtd = id + "-hbq-" + String(h.id).replace(/[^a-z0-9]+/gi, "-");
      if (ordem) {
        quantidade = el("input.r-entrada.r-entrada--numero.bib-quantidade", { id: idQtd, type: "text", inputmode: "numeric", maxlength: 3, value: "1" });
      }
      var status = el("p.t-mini.bib-item__status", { role: "status" });
      var botao = el("button.r-botao.r-botao--principal.bib-item__adicionar", {
        type: "button", texto: "Adicionar ao inventário", "aria-label": "Adicionar " + h.nome + " ao inventário",
        onkeydown: function (ev) { if (ev.key === "Enter" && ev.repeat) ev.preventDefault(); },
        onclick: function (ev) {
          if (ev.detail > 1) return;
          adicionarHomebrew(h, quantidade, botao, status);
        },
      });

      U.trocar(caixa, [
        h.descricao ? el("p.bib-item__resumo", { texto: h.descricao, estilo: { whiteSpace: "pre-wrap" } }) : el("p.t-mini", { texto: "Sem descrição." }),
        h.tipo === "arma" && !h.dano ? el("p.t-mini.t-aviso", { texto: "Arma sem dano configurado: configure depois, no modo edição." }) : null,
        ordem && !h.ordem ? el("p.t-mini", { texto: "Este modelo não tem dados de Ordem: entra com categoria não informada e o espaço padrão de 1." }) : null,
        el("div.bib-item__acao", {}, [
          quantidade ? el("div.r-campo.bib-campo", {}, [el("label.r-rotulo", { for: idQtd, texto: "Quantidade" }), quantidade]) : null,
          botao,
          status,
        ]),
      ]);
    }

    function adicionarHomebrew(h, quantidade, botao, status) {
      if (botao.getAttribute("aria-busy") === "true") return;
      status.classList.remove("t-erro");
      var qtd = 1;
      if (quantidade) {
        var rq = I().validarQuantidade(quantidade.value);
        if (!rq.ok) { status.textContent = rq.mensagem; status.classList.add("t-erro"); quantidade.focus(); return; }
        qtd = rq.valor;
      }

      botao.setAttribute("aria-busy", "true");
      botao.disabled = true;
      var copia;
      try {
        copia = F.normalizarItem(h);
        copia.id = U.uuid();
        copia.origemHomebrewId = h.id;
        copia.adicionadoEm = U.agoraISO();
        if (ordem) {
          copia.ordem = I().normalizarDados(Object.assign({}, copia.ordem || {}, { quantidade: qtd }), copia.tipo);
          (copia.ordem.modificacoes || []).forEach(function (mod) { mod.id = U.uuid(); });
        }
        if (copia.ordem) delete copia.ordem.emUso;
        ctx.ficha.inventario.itens.push(copia);
        ctx.alterou();
        ctx.redesenhar();
      } finally {
        botao.removeAttribute("aria-busy");
        botao.disabled = false;
      }

      var texto = copia.nome + (qtd > 1 ? " ×" + qtd : "") + " entrou no inventário.";
      status.textContent = texto;
      anunciar(texto);
      if (quantidade) quantidade.value = "1";
      botao.focus();
    }

    /* --------------------------------------------------------------- */

    pintar();

    var m = UI.modal({
      titulo: estado.alvoId ? "Modificações e maldições" : "Da biblioteca",
      largo: true,
      classe: "r-modal--biblioteca",
      conteudo: janela,
      botoes: [{ rotulo: "Fechar", classe: "r-botao--fantasma" }],
      aoFechar: function () { aberta = false; },
    });

    return m;
  }

  /* Abre a biblioteca na aba das melhorias que servem ao item. */
  function abrirParaModificar(ctx, item) {
    var aba = IT() ? IT().abaParaModificar(item) : "armas";
    return abrir(ctx, { origem: "oficial", aba: aba, tipo: "modificacao", alvoId: item.id });
  }

  global.RAMABibliotecaDeItens = {
    abrir: abrir,
    abrirParaModificar: abrirParaModificar,
    TIPOS_DE_ITEM: TIPOS_DE_ITEM,
  };
})(window);
