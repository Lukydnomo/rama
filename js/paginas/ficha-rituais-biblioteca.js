/* =====================================================================
   R.A.M.A. — ficha · rituais · "Da biblioteca"
   ---------------------------------------------------------------------
   A janela que traz rituais para a ficha sem cadastrá-los à mão. É a
   mesma janela da aba Habilidades e do inventário, com duas origens:

     Ordem Paranormal   o catálogo oficial dos dois livros, filtrado por
                        elemento, círculo e livro
     Homebrew           os rituais da biblioteca que esta conta pode
                        ver, filtrados no servidor

   Na ficha universal, só a Homebrew — o R.A.M.A. não impõe regra de
   Ordem a quem não joga Ordem.

   ---------------------------------------------------------------------
   O QUE A JANELA PROMETE
   ---------------------------------------------------------------------

   · Cada resultado aparece compacto; os detalhes só são montados quando
     alguém abre. O catálogo carrega sob demanda, na primeira abertura.
   · Adicionar cria uma CÓPIA independente, com id próprio, ids de
     versão próprios e rastro da origem. A janela continua aberta, com a
     mesma busca, os mesmos filtros e a mesma posição da lista.
   · Um clique duplo não vira dois rituais; clicar de novo depois, de
     propósito, vira — e a janela diz quantas cópias já existem.
   · ADICIONAR NÃO É CONJURAR: nenhum PE é gasto, nenhum dado é rolado e
     nenhum efeito é aplicado. Os custos aparecem escritos.
   · Registrar um ritual não resolve pendência de progressão nenhuma:
     aprender vem da escolha (Aprender Ritual, habilidades de ocultista)
     e continua na aba Progressão.

   ---------------------------------------------------------------------
   A MESMA JANELA, NO CONTEXTO DE UMA CONCESSÃO
   ---------------------------------------------------------------------

   Com `opcoes.aprendizado`, esta janela abre PRESA a uma concessão de
   aprendizado (os três rituais iniciais, o ritual daquele NEX, o
   grimório de Graduado, Aprender Ritual). Muda o que ela promete:

   · a busca, os filtros, a prévia, as fontes e as versões são as
     mesmas — nada foi duplicado para isto;
   · o topo mostra de onde o benefício veio, em que etapa, quantos
     rituais ele dá, quantos já foram escolhidos e quantos faltam;
   · cada ritual do catálogo diz se é elegível NAQUELA concessão, e o
     que não é continua à vista, com o motivo;
   · o botão prende o ritual à concessão além de trazer a cópia — e é
     esse vínculo, não a cópia, que resolve a pendência;
   · um ritual que já está na ficha sem concessão pode ocupar a vaga
     sem virar uma segunda cópia;
   · escolher menos do que a concessão dá é permitido: a pendência fica
     aberta, com o que falta, e a janela pode ser fechada.

   Sem `aprendizado`, a janela continua exatamente como era: trazer uma
   cópia para a ficha, sem tocar em progressão nenhuma.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var F = global.RAMAFicha;
  var el = U.el;

  function RT() { return global.RAMAOrdemRituais; }
  function R() { return global.RAMAOrdemRegras; }
  function E() { return global.RAMAOrdemProgressao; }
  function AP() { return global.RAMAOrdemAprendizado; }

  /* O único tipo de Homebrew que é ritual. Habilidades, itens e
     criaturas moram na mesma biblioteca e não entram aqui. */
  var TIPOS_DE_RITUAL = ["ritual"];

  var lembrado = { origem: "oficial" };
  var contador = 0;

  function deOrdem(ctx) {
    return !!(ctx && F.ehDeOrdem(ctx.ficha) && RT());
  }

  function ordemDe(ctx) { return ctx.ficha.ordem; }

  function rituaisDaFicha(ctx) {
    return (ctx.ficha.rituais && ctx.ficha.rituais.itens) || [];
  }

  function rotulosDaFicha(ctx) {
    return (ctx.ficha.rituais && ctx.ficha.rituais.rotulos) || F.ROTULOS_RITUAL_PADRAO;
  }

  /* =================================================================
     ABRIR
     ================================================================= */

  function abrir(ctx, opcoes) {
    var o = opcoes || {};
    var ordem = deOrdem(ctx);
    var id = "bibr-" + (++contador);

    /* A concessão que está sendo resolvida, quando há uma. Ela não é
       guardada: é relida do motor a cada desenho, para a janela nunca
       mostrar uma contagem que a ficha já não tem. */
    var vagaId = (ordem && o.aprendizado && E() && AP()) ? String(o.aprendizado.vagaId || "") : "";
    var aoMudarAprendizado = (o.aprendizado && o.aprendizado.aoMudar) || null;
    var inicial = vagaId ? concessaoAtual() : null;

    var estado = {
      origem: ordem ? (o.origem || lembrado.origem) : "homebrew",
      busca: "", elemento: o.elemento || "", circulo: o.circulo || "", fonte: "",
      abertos: {},
      catalogo: null, carregandoCatalogo: false, falhaCatalogo: null,
      homebrew: null,
      hb: { busca: "", escopo: "" },
    };

    /* Os filtros já abrem onde a concessão manda: um círculo só, ou o
       elemento exigido. Não é trava — a lista continua inteira com
       "Todos", e o que não cabe aparece com o motivo. */
    if (inicial) {
      if (inicial.circulos.length === 1) estado.circulo = inicial.circulos[0];
      if (inicial.elemento) estado.elemento = inicial.elemento;
      if (inicial.fixo) estado.busca = inicial.fixo.nome;
    }

    var janela = el("div.pilha.biblioteca.bib", { id: id });
    var cabecalho = el("div.pilha--curta.bib-aprendizado", { class: "pilha", hidden: !vagaId });
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
      if (vagaId) partes.push(cabecalho);
      if (ordem) {
        partes.push(el("div.biblioteca-origens", { role: "group", "aria-label": "Origem dos rituais" }, [
          botaoOrigem("oficial", "Ordem Paranormal"),
          botaoOrigem("homebrew", "Homebrew"),
        ]));
      }
      partes.push(corpo, anuncio);
      U.trocar(janela, partes);
      if (vagaId) pintarCabecalho();
      pintarOrigem();
    }

    /* ---------------------------------------------------------------
       A CONCESSÃO
       --------------------------------------------------------------- */

    function contextoDaFicha() {
      return { inventario: ctx.ficha.inventario, rituais: rituaisDaFicha(ctx) };
    }

    function concessaoAtual() {
      if (!vagaId || !E() || !ordem) return null;
      var est = E().estado(ordemDe(ctx), contextoDaFicha());
      if (!est || !est.rituais) return null;
      return est.rituais.concessoes.filter(function (c) { return c.id === vagaId; })[0] || null;
    }

    /* O que se sabe de uma entrada do catálogo para conferir a
       elegibilidade. O elemento de um ritual que pede escolha (Amaldiçoar
       Arma) só é decidido ao adicionar, então os quatro entram. */
    function dadosDaEntrada(e, elementoEscolhido) {
      return {
        circulo: e.circulo,
        elemento: elementoEscolhido || e.elemento,
        elementos: elementoEscolhido ? [elementoEscolhido] : e.elementos,
        catalogo: e.id,
      };
    }

    function elegivel(c, e, elementoEscolhido) {
      if (!c || !AP()) return { ok: true, motivo: "" };
      if (c.restantes <= 0) {
        return { ok: false, motivo: "Esta concessão já está completa: solte um ritual antes de prender outro." };
      }
      return AP().elegibilidade(c.concessao, dadosDaEntrada(e, elementoEscolhido));
    }

    function pintarCabecalho() {
      var c = concessaoAtual();
      if (!c) {
        U.trocar(cabecalho, el("p.t-mini.t-aviso", {
          texto: "Esta concessão de rituais não faz mais parte da progressão do personagem. " +
                 "A janela continua funcionando como biblioteca: o que for adicionado entra como registro, sem vínculo.",
        }));
        return;
      }

      var escolhidos = c.escolhidos.map(function (a) {
        return el("li.bib-aprendizado__item", {}, [
          el("span", { texto: a.nome || "(ritual sem nome)" }),
          a.excecao ? el("span.r-etiqueta.etiqueta--parcial", { texto: "exceção da mesa" }) : null,
          el("button.r-botao.r-botao--mini.r-botao--fantasma", {
            type: "button", texto: "Soltar",
            "aria-label": "Soltar " + (a.nome || "este ritual") + " desta concessão",
            onclick: function () { soltar(a); },
          }),
        ]);
      });

      var soltos = (function () {
        var est = E().estado(ordemDe(ctx), contextoDaFicha());
        if (!est.rituais.temFicha) return [];
        return est.rituais.semOrigem.filter(function (d) {
          return c.restantes > 0 && AP().elegibilidade(c.concessao, d).ok;
        });
      })();

      U.trocar(cabecalho, [
        el("p.bib-aprendizado__titulo", {}, [
          el("strong", { texto: c.rotulo }),
          el("span.t-mini", { texto: " · " + c.rotuloEtapa + " · " + (c.origem === "trilha" ? "Trilha" : "Classe") + ": " + c.nomePoder }),
        ]),
        el("p.bib-aprendizado__conta", {
          role: "status",
          texto: "Escolhidos: " + c.escolhidos.length + " de " + c.quantidade +
                 (c.restantes ? " · faltam " + c.restantes : " · concessão completa"),
        }),
        el("p.t-mini", { texto: c.explicacao }),
        el("p.criacao-fonte", { texto: (c.fonte === "SAH" ? "Sobrevivendo ao Horror" : "Ordem Paranormal RPG") + ", p. " + c.pagina }),
        escolhidos.length ? el("ul.bib-aprendizado__lista", {}, escolhidos) : null,
        c.fixo ? botaoDoRitualFixo(c) : null,
        soltos.length ? el("div.pilha--curta", { class: "pilha" }, [
          el("p.t-mini", { texto: "Já na ficha, sem concessão — prender um destes não cria outra cópia:" }),
          el("div.faixa", {}, soltos.map(function (d) {
            return el("button.r-botao.r-botao--mini", {
              type: "button", texto: "Usar " + (d.nome || "ritual"),
              onclick: function () { prender(d.id, d.nome); },
            });
          })),
        ]) : null,
        el("p.t-mini", { texto: "Dá para escolher menos agora e voltar depois: a pendência continua na Progressão com o que falta. Aprender não gasta PE nem rola dado." }),
      ]);
    }

    /* Concessão automática: a trilha já disse qual é o ritual. O
       R.A.M.A. não o insere sozinho — escrever na ficha é decisão de
       quem joga —, mas o caminho é um botão. */
    function botaoDoRitualFixo(c) {
      if (c.escolhidos.length) return null;
      var entrada = estado.catalogo ? estado.catalogo.porId[c.fixo.id] : null;
      var aviso = el("p.t-mini.bib-item__status", { role: "status" });
      /* Amaldiçoar Arma pertence a quatro elementos e pede o elemento ao
         entrar na ficha — mesmo vindo por concessão automática. */
      var escolhaFixa = entrada ? campoDeEscolha(entrada) : null;
      return el("div.pilha--curta", { class: "pilha" }, [
        el("p.t-mini", { texto: "Concessão automática: não há o que escolher, só trazer a cópia de " + c.fixo.nome + "." }),
        c.concessao.nota ? el("p.t-mini.t-aviso", { texto: c.concessao.nota }) : null,
        escolhaFixa ? escolhaFixa.caixa : null,
        el("button.r-botao.r-botao--principal.r-botao--mini", {
          type: "button",
          texto: entrada ? "Trazer " + c.fixo.nome + " para a ficha" : "Abrindo o catálogo…",
          disabled: !entrada,
          onclick: function () {
            if (!entrada) return;
            aprenderDoCatalogo(entrada, escolhaFixa, aviso, null, null);
          },
        }),
        aviso,
      ]);
    }

    function prender(ritualId, nome) {
      var ritual = rituaisDaFicha(ctx).filter(function (x) { return x && x.id === ritualId; })[0];
      if (!ritual) return;
      E().adicionarRitual(ordemDe(ctx), vagaId, ritual);
      avisarMudanca((nome || ritual.nome) + " passou a ocupar esta concessão. Nenhuma cópia foi criada.");
    }

    function soltar(aprendizado) {
      E().removerRitual(ordemDe(ctx), vagaId, aprendizado.ritualId);
      avisarMudanca((aprendizado.nome || "O ritual") + " saiu da concessão. Ele continua na aba Rituais.");
    }

    function avisarMudanca(texto) {
      ctx.alterou();
      ctx.redesenhar();
      pintarCabecalho();
      pintarOrigem();
      anunciar(texto);
      if (aoMudarAprendizado) aoMudarAprendizado();
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

    function carregarCatalogo(focar) {
      estado.carregandoCatalogo = true;
      estado.falhaCatalogo = null;
      if (estado.origem === "oficial") U.trocar(corpo, UI.carregando("Abrindo o catálogo de rituais"));
      RT().carregar().then(function (catalogo) {
        estado.catalogo = catalogo;
        estado.carregandoCatalogo = false;
        /* O botão da concessão automática depende do catálogo: enquanto
           ele não chega, o cabeçalho mostra "abrindo". */
        if (aberta && vagaId) pintarCabecalho();
        if (aberta && estado.origem === "oficial") { pintarOficial(); if (focar) focarEm("input[type=search]"); }
      }, function (erro) {
        console.error("[R.A.M.A. · rituais] o catálogo não carregou", erro);
        estado.falhaCatalogo = erro || new Error("falha");
        estado.carregandoCatalogo = false;
        if (aberta && estado.origem === "oficial") { pintarOficial(); if (focar) focarEm("button"); }
      });
    }

    function focarEm(seletor) {
      var alvo = corpo.querySelector(seletor);
      if (alvo) alvo.focus();
    }

    function pintarOficial() {
      if (!estado.catalogo) {
        if (estado.falhaCatalogo) {
          U.trocar(corpo, el("div.r-vazio", {}, [
            el("p.r-vazio__titulo.t-erro", { texto: "Não foi possível abrir o catálogo" }),
            el("p.r-vazio__texto", { texto: "O arquivo do catálogo de rituais não carregou. Confira a conexão e tente de novo — nada foi alterado na ficha." }),
            el("button.r-botao", { type: "button", texto: "Tentar novamente", onclick: function () { carregarCatalogo(true); } }),
          ]));
          return;
        }
        U.trocar(corpo, UI.carregando("Abrindo o catálogo de rituais"));
        if (!estado.carregandoCatalogo) carregarCatalogo();
        return;
      }

      if (!estado.catalogo.rituais.length) {
        U.trocar(corpo, UI.vazio({ titulo: "Catálogo vazio", texto: "O arquivo do catálogo carregou sem nenhum ritual." }));
        return;
      }

      var lista = el("div.biblioteca-lista.bib-lista", { "aria-live": "off" });
      var status = el("p.t-mini.bib-status", { role: "status" });
      var filtroElemento = el("div.r-abas.biblioteca-abas", { role: "group", "aria-label": "Elemento" });
      var filtroCirculo = el("div.faixa.bib-chips", { role: "group", "aria-label": "Círculo" });
      var filtroFonte = el("div.bib-filtros");

      var busca = el("input.r-entrada", {
        type: "search", placeholder: "Buscar por nome", "aria-label": "Buscar ritual no catálogo",
        value: estado.busca,
        oninput: function (ev) { estado.busca = ev.target.value; pintarFiltros(); pintarLista(); },
      });

      function chip(rotulo, ativo, aoClicar, contagem, classe) {
        return el("button.r-aba" + (classe ? "." + classe : ""), {
          type: "button",
          "aria-pressed": String(ativo),
          texto: rotulo + (contagem === null || contagem === undefined ? "" : " (" + contagem + ")"),
          onclick: aoClicar,
        });
      }

      function pintarFiltros() {
        var c = RT().contagens(estado.catalogo, estado);

        U.trocar(filtroElemento, [
          chip("Todos", !estado.elemento, function () { estado.elemento = ""; pintarFiltros(); pintarLista(); }, c.todosElementos),
        ].concat(RT().ELEMENTOS.map(function (e) {
          return chip(e.nome, estado.elemento === e.chave, function () {
            estado.elemento = estado.elemento === e.chave ? "" : e.chave;
            pintarFiltros(); pintarLista();
          }, c.elementos[e.chave], "bib-elemento--" + e.chave);
        })));

        U.trocar(filtroCirculo, [
          chip("Todos", !estado.circulo, function () { estado.circulo = ""; pintarFiltros(); pintarLista(); }, c.todosCirculos),
        ].concat(RT().CIRCULOS.map(function (n) {
          return chip(RT().rotuloCirculo(n), String(estado.circulo) === String(n), function () {
            estado.circulo = String(estado.circulo) === String(n) ? "" : n;
            pintarFiltros(); pintarLista();
          }, c.circulos[n]);
        })));

        /* O filtro de livro só aparece quando há mais de uma fonte no
           catálogo — um seletor com uma opção é ruído. */
        var fontes = RT().fontesDoCatalogo(estado.catalogo);
        var ativos = !!(estado.busca || estado.elemento || estado.circulo || estado.fonte);
        var idFonte = id + "-fonte";
        U.trocar(filtroFonte, [
          fontes.length > 1 ? el("div.bib-filtro", {}, [
            el("label.t-mini", { for: idFonte, texto: "Livro" }),
            el("select.r-selecao", {
              id: idFonte,
              onchange: function (ev) { estado.fonte = ev.target.value; pintarFiltros(); pintarLista(); },
            }, [el("option", { value: "", texto: "Todos" })].concat(fontes.map(function (k) {
              return el("option", { value: k, texto: RT().ROTULO_FONTE[k] + " (" + c.fontes[k] + ")", selected: estado.fonte === k });
            }))),
          ]) : null,
          ativos ? el("button.r-botao.r-botao--mini.r-botao--fantasma.bib-limpar", {
            type: "button", texto: "Limpar busca e filtros",
            onclick: function () {
              estado.busca = ""; estado.elemento = ""; estado.circulo = ""; estado.fonte = "";
              busca.value = "";
              pintarFiltros(); pintarLista();
              busca.focus();
            },
          }) : null,
        ]);
      }

      function pintarLista() {
        var entradas = RT().filtrar(estado.catalogo, estado);
        if (!entradas.length) {
          status.textContent = "Nenhum resultado.";
          U.trocar(lista, el("div.r-vazio.bib-nada", {}, [
            el("p.r-vazio__titulo", { texto: "Nenhum ritual encontrado" }),
            el("p.r-vazio__texto", { texto: "Tente outro nome, ou limpe a busca e os filtros." }),
          ]));
          return;
        }
        status.textContent = entradas.length + (entradas.length === 1 ? " ritual." : " rituais.");
        U.trocar(lista, RT().porCirculo(entradas).map(function (g) {
          return el("section.biblioteca-secao", { "aria-label": g.titulo }, [
            el("h3.t-rotulo", { texto: g.titulo + " (" + g.entradas.length + ") · " + g.custo + " PE" }),
            el("div.bib-itens", {}, g.entradas.map(linhaOficial)),
          ]);
        }));
      }

      pintarFiltros();
      pintarLista();

      U.trocar(corpo, [
        filtroElemento,
        filtroCirculo,
        el("div.r-busca", {}, [el("span.r-busca__marca", {}, [UI.simbolo("busca")]), busca]),
        filtroFonte,
        status,
        lista,
        el("p.t-mini", {
          texto: "Cada ritual entra na ficha como cópia: editar a cópia não muda o catálogo, e o catálogo não muda a cópia. " +
                 "Adicionar não conjura — nenhum PE é gasto e nenhum dado é rolado.",
        }),
      ]);
    }

    /* Uma entrada do catálogo, compacta; os detalhes nascem ao abrir. */
    function linhaOficial(e) {
      var idDet = id + "-" + e.id.replace(/[^a-z0-9]+/gi, "-");
      var aberto = !!estado.abertos[e.id];
      var detalhes = el("div.bib-item__detalhes", { id: idDet, hidden: !aberto });
      var naFicha = el("span.r-etiqueta.bib-item__na-ficha", { hidden: true });

      function atualizarNaFicha() {
        var n = RT().quantasNaFicha(e, rituaisDaFicha(ctx));
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
          if (abrirAgora && !detalhes.firstChild) montarDetalhes(e, detalhes, atualizarNaFicha);
        },
      }, [
        el("span.bib-item__seta", { "aria-hidden": "true" }),
        el("span.bib-item__texto", {}, [
          el("span.bib-item__nome", { texto: e.nome }),
          el("span.bib-item__classe", { texto: e.classificacao }),
          dadosCompactos(RT().resumoCompacto(e)),
        ]),
      ]);

      var marcas = el("span.bib-item__marcas", {}, e.elementos.map(function (chave) {
        return el("span.r-etiqueta.bib-elemento.bib-elemento--" + chave, { texto: RT().nomeDoElemento(chave) });
      }).concat([
        el("span.r-etiqueta.bib-fonte", { texto: RT().SIGLA_FONTE[e.fonte] + " p. " + e.pagina, title: RT().referencia(e) }),
        naFicha,
      ]));

      if (aberto) montarDetalhes(e, detalhes, atualizarNaFicha);

      return el("article.bib-item", {}, [
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

    /* As versões, com o custo ADICIONAL e o TOTAL lado a lado. */
    function blocoDeVersoes(e) {
      return el("div.pilha--curta", { class: "pilha" }, [
        el("h4.t-rotulo", { texto: "Versões" }),
        el("div.bib-versoes", {}, e.versoes.map(function (v) {
          var linhas = [];
          if (v.requisito) linhas.push("Requer " + v.requisito + ".");
          if (v.alteracoes) linhas.push(v.alteracoes);
          var rolagens = [];
          if (v.dano) rolagens.push("dano " + v.dano + (v.danoExtra ? "+" + v.danoExtra : ""));
          v.rolagens.forEach(function (r) {
            rolagens.push(r.rotulo.toLowerCase() + " " + (r.expressao || "") + (r.extra ? (r.expressao ? "+" : "") + r.extra : ""));
          });
          if (rolagens.length) linhas.push("Rolagens: " + rolagens.join(", ") + ".");
          return el("div.bib-versao", {}, [
            el("p.bib-versao__topo", {}, [
              el("strong", { texto: v.nome }),
              el("span.t-mini", {
                texto: v.basica
                  ? " · " + v.custoTotal + " PE"
                  : " · +" + v.custo + " PE (total " + v.custoTotal + " PE)",
              }),
            ]),
            linhas.length ? el("p.t-mini", { texto: linhas.join(" ") }) : null,
          ]);
        })),
      ]);
    }

    function montarDetalhes(e, caixa, aoAdicionar) {
      var automacao = RT().naFicha(e);
      var conferencias = deOrdem(ctx) ? RT().conferencias(e, ordemDe(ctx)) : [];

      U.trocar(caixa, [
        el("p.bib-item__resumo", { texto: e.resumo }),
        el("dl.r-dados.bib-item__pares", {}, RT().detalhes(e).reduce(function (saida, p) {
          saida.push(el("dt", { texto: p[0] }));
          saida.push(el("dd", { texto: p[1] }));
          return saida;
        }, [])),
        e.efeitos.length ? el("h4.t-rotulo", { texto: "Efeitos" }) : null,
        listaDeTextos(e.efeitos),
        blocoDeVersoes(e),
        el("h4.t-rotulo", { texto: "Requisitos" }),
        listaDeTextos(RT().requisitos(e), "t-mini"),
        el("h4.t-rotulo", { texto: "Regras que acompanham" }),
        listaDeTextos(RT().regrasGerais(e), "t-mini"),
        conferencias.length ? el("h4.t-rotulo", { texto: "Nesta ficha" }) : null,
        listaDeTextos(conferencias, "t-mini.t-aviso"),
        marcaDeElegibilidade(e),
        el("p.t-mini.bib-automacao", {}, [
          el("span.r-etiqueta", {
            class: automacao.automacao === "calculo" ? "etiqueta--calculo" : "",
            texto: { calculo: "Automatizado", parcial: "Parcial", texto: "Controle manual" }[automacao.automacao],
          }),
          el("span", { texto: " " + automacao.texto }),
        ]),
        e.notas.length ? listaDeTextos(e.notas.map(function (n) { return "Nota: " + n; }), "t-mini.t-aviso") : null,
        acaoAdicionar(e, aoAdicionar),
      ]);
    }

    /* "Elegível" ou o motivo de não ser, dentro da concessão aberta. */
    function marcaDeElegibilidade(e) {
      if (!vagaId) return null;
      var c = concessaoAtual();
      if (!c) return null;
      var teste = elegivel(c, e, "");
      return el("p.t-mini", {
        class: teste.ok ? "t-ok" : "t-aviso",
        texto: teste.ok
          ? "Elegível para " + c.rotulo + " (" + c.rotuloEtapa + ")."
          : teste.motivo,
      });
    }

    function campoDeEscolha(e) {
      if (!e.escolha) return null;
      var idCampo = id + "-esc-" + e.id.replace(/[^a-z0-9]+/gi, "-");
      var entrada = el("select.r-selecao", { id: idCampo }, [
        el("option", { value: "", texto: "Escolha…" }),
      ].concat(RT().opcoesDaEscolha(e.escolha).map(function (op) {
        return el("option", { value: op.valor, texto: op.rotulo });
      })));
      return {
        caixa: el("div.r-campo.bib-campo", {}, [el("label.r-rotulo", { for: idCampo, texto: e.escolha.rotulo }), entrada]),
        entrada: entrada,
      };
    }

    function acaoAdicionar(e, aoAdicionar) {
      var escolha = campoDeEscolha(e);
      var status = el("p.t-mini.bib-item__status", { role: "status" });
      var c = vagaId ? concessaoAtual() : null;
      var teste = c ? elegivel(c, e, escolha ? escolha.entrada.value : "") : { ok: true, motivo: "" };

      var botao = el("button.r-botao.r-botao--principal.bib-item__adicionar", {
        type: "button",
        texto: c ? "Aprender este ritual" : "Adicionar à ficha",
        "aria-label": (c ? "Aprender " + e.nome + " nesta concessão" : "Adicionar " + e.nome + " à ficha"),
        onkeydown: function (ev) { if (ev.key === "Enter" && ev.repeat) ev.preventDefault(); },
        onclick: function (ev) {
          /* O segundo clique de um clique duplo não é outra intenção. */
          if (ev.detail > 1) return;
          aprenderDoCatalogo(e, escolha, status, aoAdicionar, botao);
        },
      });

      return el("div.bib-item__acao", {}, [
        escolha ? escolha.caixa : null,
        /* Um ritual que não cabe nesta concessão continua visível e
           continua podendo entrar na ficha como registro — o que ele não
           faz é ocupar a vaga. O motivo já está escrito logo acima, em
           marcaDeElegibilidade; aqui fica só a saída. */
        botao,
        (c && !teste.ok) ? el("button.r-botao.r-botao--mini.r-botao--fantasma", {
          type: "button", texto: "Só registrar na ficha, sem concessão",
          onclick: function (ev) {
            if (ev.detail > 1) return;
            aprenderDoCatalogo(e, escolha, status, aoAdicionar, null, true);
          },
        }) : null,
        status,
      ]);
    }

    /* Traz a cópia e, quando há concessão, PRENDE o ritual a ela. As
       duas coisas na mesma ação porque é uma decisão só: quem clica em
       "Aprender este ritual" está resolvendo a pendência.

       `soRegistrar` é a saída para o que não cabe na concessão: a cópia
       entra, o vínculo não. */
    function aprenderDoCatalogo(e, escolha, status, aoAdicionar, botao, soRegistrar) {
      if (botao && botao.getAttribute("aria-busy") === "true") return;
      status.classList.remove("t-erro");

      var elementoEscolhido = escolha ? escolha.entrada.value : "";
      var c = (vagaId && !soRegistrar) ? concessaoAtual() : null;

      if (c) {
        var teste = elegivel(c, e, elementoEscolhido);
        if (!teste.ok) {
          status.textContent = teste.motivo;
          status.classList.add("t-erro");
          return;
        }
      }

      var montado = RT().paraFicha(e, { escolha: escolha ? elementoEscolhido : undefined });
      if (!montado.ok) {
        status.textContent = montado.mensagem;
        status.classList.add("t-erro");
        if (escolha) escolha.entrada.focus();
        return;
      }

      var jaTinha = RT().quantasNaFicha(e, rituaisDaFicha(ctx));

      if (botao) { botao.setAttribute("aria-busy", "true"); botao.disabled = true; }
      var ritual;
      try {
        ritual = F.criarRitual(montado.dados);
        ritual.adicionadoEm = U.agoraISO();
        ctx.ficha.rituais.itens.push(ritual);
        if (c) E().adicionarRitual(ordemDe(ctx), vagaId, ritual);
        ctx.alterou();
        ctx.redesenhar();
      } finally {
        if (botao) { botao.removeAttribute("aria-busy"); botao.disabled = false; }
      }

      if (aoAdicionar) aoAdicionar();
      if (o.aoAdicionarRitual) o.aoAdicionarRitual(ritual);
      if (vagaId) { pintarCabecalho(); if (aoMudarAprendizado) aoMudarAprendizado(); }

      var texto = ritual.nome + " entrou na ficha" + (jaTinha ? " (" + (jaTinha + 1) + " cópias)" : "") +
        (c ? " e ocupa " + c.rotulo + " (" + c.rotuloEtapa + ")" : "") +
        ". Nenhum PE foi gasto: aprender e conjurar continuam com você.";
      status.textContent = texto;
      anunciar(texto);
      if (botao) botao.focus();
    }

    /* ---------------------------------------------------------------
       HOMEBREW
       --------------------------------------------------------------- */

    function carregarHomebrew(focar) {
      estado.homebrew = { carregando: true };
      if (estado.origem === "homebrew") U.trocar(corpo, UI.carregando("Consultando a biblioteca Homebrew"));
      global.RAMAApi.listarHomebrew({ escopo: "todos", tipos: TIPOS_DE_RITUAL }).then(function (r) {
        if (!r || !r.ok) {
          estado.homebrew = { falha: r || { ok: false, erro: "sem_resposta" } };
        } else {
          /* Um servidor anterior a esta versão ignora `tipos`: filtrar
             de novo aqui garante que item e criatura não virem ritual. */
          estado.homebrew = {
            registros: (r.dados || []).filter(function (h) { return h && h.tipo === "ritual"; }),
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
            titulo: "Nenhum ritual na Homebrew",
            texto: "Você ainda não guardou rituais na sua biblioteca, e nenhuma conta publicou rituais. " +
                   "Crie um ritual agora — ele pode ir para a Homebrew ao mesmo tempo.",
            acao: {
              rotulo: "Criar ritual",
              aoClicar: function () {
                m.fechar();
                if (global.RAMASecaoRituais && global.RAMASecaoRituais.novoRitual) global.RAMASecaoRituais.novoRitual(ctx);
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
      var idEscopo = id + "-hb-escopo";

      var busca = el("input.r-entrada", {
        type: "search", placeholder: "Buscar por nome", "aria-label": "Buscar ritual na Homebrew", value: hb.busca,
        oninput: function (ev) { hb.busca = ev.target.value; pintarListaHb(); },
      });

      var filtros = el("div.bib-filtros", {}, [
        el("div.bib-filtro", {}, [
          el("label.t-mini", { for: idEscopo, texto: "Escopo" }),
          el("select.r-selecao", {
            id: idEscopo,
            onchange: function (ev) { hb.escopo = ev.target.value; pintarListaHb(); },
          }, [
            el("option", { value: "", texto: "Todos" }),
            el("option", { value: "meu", texto: "Meus", selected: hb.escopo === "meu" }),
            el("option", { value: "publico", texto: "Públicos de outras contas", selected: hb.escopo === "publico" }),
          ]),
        ]),
      ]);

      function pintarListaHb() {
        var termo = U.chaveDeBusca(hb.busca);
        var visiveis = registros.filter(function (h) {
          if (hb.escopo === "meu" && !h.meu) return false;
          if (hb.escopo === "publico" && h.meu) return false;
          return !termo || U.chaveDeBusca(h.nome).indexOf(termo) >= 0;
        }).sort(function (a, b) { return String(a.nome).localeCompare(String(b.nome), "pt-BR"); });

        if (!visiveis.length) {
          status.textContent = "Nenhum resultado.";
          U.trocar(lista, el("div.r-vazio.bib-nada", {}, [
            el("p.r-vazio__titulo", { texto: "Nenhum ritual encontrado" }),
            el("button.r-botao.r-botao--mini", {
              type: "button", texto: "Limpar busca e filtros",
              onclick: function () { hb.busca = ""; hb.escopo = ""; pintarHomebrew(); },
            }),
          ]));
          return;
        }
        status.textContent = visiveis.length + (visiveis.length === 1 ? " ritual." : " rituais.");
        U.trocar(lista, el("div.bib-itens", {}, visiveis.map(linhaHomebrew)));
      }

      pintarListaHb();
      U.trocar(corpo, [
        el("div.r-busca", {}, [el("span.r-busca__marca", {}, [UI.simbolo("busca")]), busca]),
        filtros,
        status,
        lista,
        el("p.t-mini", { texto: "O ritual entra na ficha como cópia. Editá-lo aqui não muda o modelo da biblioteca, e editar o modelo não muda esta ficha." }),
      ]);
    }

    function paresHomebrew(h) {
      var rotulos = rotulosDaFicha(ctx);
      var pares = [];
      F.CAMPOS_RITUAL.forEach(function (campo) {
        if (campo === F.CAMPO_LONGO_RITUAL) return;
        var valor = U.aparar(h[campo]);
        if (valor) pares.push([rotulos[campo], valor]);
      });
      var comRolagem = F.versoesComRolagem(h);
      if (comRolagem.length) pares.push(["Versões", comRolagem.map(function (v) { return v.nome; }).join(", ")]);
      return pares.slice(0, 4);
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
          el("span.bib-item__classe", { texto: "Ritual Homebrew" }),
          dadosCompactos(paresHomebrew(h)),
        ]),
      ]);

      if (aberto) montarDetalhesHb(h, detalhes);

      return el("article.bib-item", {}, [
        el("div.bib-item__topo", {}, [
          botaoAbrir,
          el("span.bib-item__marcas", {}, [
            el("span.r-etiqueta", { texto: h.meu ? "Meu" : "Público" }),
            h.atualizadoEm ? el("span.r-etiqueta.bib-fonte", { texto: U.dataCurta(h.atualizadoEm) }) : null,
          ]),
        ]),
        detalhes,
      ]);
    }

    function montarDetalhesHb(h, caixa) {
      var rotulos = rotulosDaFicha(ctx);
      var status = el("p.t-mini.bib-item__status", { role: "status" });
      var botao = el("button.r-botao.r-botao--principal.bib-item__adicionar", {
        type: "button", texto: "Adicionar à ficha", "aria-label": "Adicionar " + h.nome + " à ficha",
        onkeydown: function (ev) { if (ev.key === "Enter" && ev.repeat) ev.preventDefault(); },
        onclick: function (ev) {
          if (ev.detail > 1) return;
          adicionarHomebrew(h, botao, status);
        },
      });

      var pares = [];
      F.CAMPOS_RITUAL.forEach(function (campo) {
        if (campo === F.CAMPO_LONGO_RITUAL) return;
        var valor = U.aparar(h[campo]);
        if (!valor) return;
        pares.push(el("dt", { texto: rotulos[campo] }));
        pares.push(el("dd", { texto: valor }));
      });

      U.trocar(caixa, [
        pares.length ? el("dl.r-dados.bib-item__pares", {}, pares) : null,
        U.aparar(h[F.CAMPO_LONGO_RITUAL])
          ? el("p.bib-item__resumo", { texto: h[F.CAMPO_LONGO_RITUAL], estilo: { whiteSpace: "pre-wrap" } })
          : el("p.t-mini", { texto: "Sem descrição." }),
        (h.versoes || []).length
          ? el("p.t-mini", { texto: "Versões: " + h.versoes.map(function (v) {
              return v.nome + (v.dano ? " (" + v.dano + (v.danoExtra ? "+" + v.danoExtra : "") + ")" : "");
            }).join(", ") + "." })
          : null,
        el("div.bib-item__acao", {}, [botao, status]),
      ]);
    }

    function adicionarHomebrew(h, botao, status) {
      if (botao.getAttribute("aria-busy") === "true") return;
      status.classList.remove("t-erro");

      /* Um ritual Homebrew também pode ocupar uma concessão — desde
         que informe o círculo, que é por onde a regra confere. Quando
         não informa, a cópia entra e o vínculo não, com o motivo
         escrito. */
      var c = vagaId ? concessaoAtual() : null;
      var dados = RT() ? RT().dadosDoRitual(h) : {};
      var teste = c ? elegivel(c, { circulo: dados.circulo || 0, elemento: dados.elemento || "", elementos: [], id: "" }, "") : { ok: true, motivo: "" };

      botao.setAttribute("aria-busy", "true");
      botao.disabled = true;
      var copia;
      try {
        /* criarRitual gera ids novos, inclusive das versões: a cópia é
           outro registro, e editá-la não mexe no modelo. */
        copia = F.criarRitual(F.normalizarRitual(h) || {});
        copia.origemHomebrewId = h.id;
        delete copia.origemCatalogoId;
        copia.adicionadoEm = U.agoraISO();
        ctx.ficha.rituais.itens.push(copia);
        if (c && teste.ok) E().adicionarRitual(ordemDe(ctx), vagaId, copia);
        ctx.alterou();
        ctx.redesenhar();
      } finally {
        botao.removeAttribute("aria-busy");
        botao.disabled = false;
      }

      var presa = (c && teste.ok) ? (c.rotulo + " (" + c.rotuloEtapa + ")") : "";
      if (o.aoAdicionarRitual) o.aoAdicionarRitual(copia);
      if (vagaId) { pintarCabecalho(); if (aoMudarAprendizado) aoMudarAprendizado(); }
      if (c && !teste.ok) {
        status.classList.add("t-erro");
        status.textContent = copia.nome + " entrou na ficha como registro, sem ocupar a concessão: " + teste.motivo;
        anunciar(status.textContent);
        botao.focus();
        return;
      }

      var texto = copia.nome + " entrou na ficha" + (presa ? " e ocupa " + presa + "." : ".");
      status.textContent = texto;
      anunciar(texto);
      botao.focus();
    }

    /* --------------------------------------------------------------- */

    pintar();

    var m = UI.modal({
      titulo: inicial ? (inicial.fixo ? ("Trazer " + inicial.fixo.nome) : ("Escolher rituais — " + inicial.rotulo)) : "Da biblioteca",
      largo: true,
      classe: "r-modal--biblioteca",
      conteudo: janela,
      botoes: [{ rotulo: "Fechar", classe: "r-botao--fantasma" }],
      aoFechar: function () { aberta = false; },
    });

    return m;
  }

  global.RAMABibliotecaDeRituais = { abrir: abrir, TIPOS_DE_RITUAL: TIPOS_DE_RITUAL };
})(window);
