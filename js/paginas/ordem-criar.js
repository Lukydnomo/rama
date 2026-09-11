/* =====================================================================
   R.A.M.A. — Ordem Paranormal · criação guiada
   =====================================================================
   O passo a passo do livro (OPRPG p.13), em uma janela com etapas.

   ---------------------------------------------------------------------
   A ORDEM DOS PASSOS É A DO LIVRO, E ISSO IMPORTA
   ---------------------------------------------------------------------

     1. conceito    quem é essa pessoa
     2. atributos   4 pontos, teto 3, um pode ir a 0 por +1
     3. origem      duas perícias treinadas e um poder
     4. classe      PV, PE, Sanidade, perícias e proficiências
     5. perícias    o que sobrou para escolher
     6. revisão     o que ficou, e o que ainda falta decidir

   Perícias vêm depois de origem e classe porque o NÚMERO delas depende
   das duas, e quais já estão escolhidas depende da origem. Perguntar
   antes seria perguntar sem ter como responder.

   ---------------------------------------------------------------------
   O QUE ESTA TELA NÃO FAZ
   ---------------------------------------------------------------------

   Escolher pela pessoa. Quando uma etapa tem pendência — um poder de
   classe a definir, um aumento de atributo a distribuir — ela aparece
   listada como pendência, e a ficha nasce com ela em aberto. Preencher
   sozinho seria decidir o personagem de alguém.

   ---------------------------------------------------------------------
   COMEÇAR ADIANTADO
   ---------------------------------------------------------------------

   Dá para criar um personagem já em NEX 50%. A tela reúne o que aquele
   NEX acumulou — trilha, aumentos de atributo, graus de treinamento,
   poderes — numa lista só, sem obrigar ninguém a salvar uma ficha por
   etapa anterior. O que a tela sabe resolver, ela resolve; o que
   depende de catálogo que ainda não existe, ela registra como pendente
   em vez de fingir que resolveu.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var F = global.RAMAFicha;
  var C = global.RAMAOrdemCatalogo;
  var R = global.RAMAOrdemRegras;
  var el = U.el;

  function abrir(opcoes) {
    var o = opcoes || {};
    var campanhas = o.campanhas || [];

    /* O rascunho. Nada é gravado até a última etapa. */
    var d = {
      nome: "",
      conceito: "",
      campanhaId: "",
      nex: 5,
      atributos: { agi: 1, "for": 1, int: 1, pre: 1, vig: 1 },
      origem: "",
      /* Amnésico deixa as duas perícias à escolha do mestre; a tela
         precisa de um lugar para guardá-las. */
      periciasDaOrigem: [],
      classe: "",
      /* Para o combatente, uma de cada par. */
      escolhasDeClasse: [],
      periciasEscolhidas: [],
      trilha: "",
    };

    var etapa = 0;
    var corpo = el("div.pilha", {});
    var rodapeInfo = el("p.t-mini", {});

    var voltar = el("button.r-botao.r-botao--fantasma", {
      type: "button", texto: "Voltar",
      onclick: function () { if (etapa > 0) { etapa--; pintar(); } },
    });

    var avancar = el("button.r-botao.r-botao--principal", {
      type: "button", texto: "Continuar",
      onclick: function () { seguir(); },
    });

    var criando = false;

    /* =================================================================
       ETAPAS
       ================================================================= */

    var ETAPAS = [
      { chave: "conceito", titulo: "Conceito", desenhar: etapaConceito, conferir: conferirConceito },
      { chave: "atributos", titulo: "Atributos", desenhar: etapaAtributos, conferir: conferirAtributos },
      { chave: "origem", titulo: "Origem", desenhar: etapaOrigem, conferir: conferirOrigem },
      { chave: "classe", titulo: "Classe", desenhar: etapaClasse, conferir: conferirClasse },
      { chave: "pericias", titulo: "Perícias", desenhar: etapaPericias, conferir: conferirPericias },
      { chave: "revisao", titulo: "Revisão", desenhar: etapaRevisao, conferir: function () { return null; } },
    ];

    function pintar() {
      var e = ETAPAS[etapa];
      U.trocar(corpo, [
        trilhaDeEtapas(),
        el("h3.t-secao", { texto: (etapa + 1) + ". " + e.titulo }),
        e.desenhar(),
      ]);
      voltar.disabled = etapa === 0;
      avancar.textContent = etapa === ETAPAS.length - 1 ? "Criar personagem" : "Continuar";
      rodapeInfo.textContent = "";
    }

    function trilhaDeEtapas() {
      return el("ol.criacao-trilha", {}, ETAPAS.map(function (e, i) {
        return el("li.criacao-trilha__passo", {
          class: i === etapa ? "criacao-trilha__passo--atual" : (i < etapa ? "criacao-trilha__passo--feito" : ""),
          texto: e.titulo,
          "aria-current": i === etapa ? "step" : null,
        });
      }));
    }

    async function seguir() {
      var e = ETAPAS[etapa];
      var problema = e.conferir();
      if (problema) { rodapeInfo.textContent = problema; return; }

      if (etapa < ETAPAS.length - 1) { etapa++; pintar(); return; }

      if (criando) return;
      criando = true;
      avancar.disabled = true;
      avancar.textContent = "Criando…";
      await gravar();
      criando = false;
      avancar.disabled = false;
    }

    /* =================================================================
       1. CONCEITO — OPRPG p.14
       ================================================================= */

    var campoNome, campoConceito, campoCampanha, campoNex;

    function etapaConceito() {
      campoNome = UI.campo({ rotulo: "Nome do agente", valor: d.nome, limite: 80 });
      campoConceito = UI.campo({
        rotulo: "Conceito", valor: d.conceito, tipo: "area", linhas: 3, limite: 400,
        ajuda: "Uma frase. O que essa pessoa fazia antes do paranormal, e o que faz agora.",
      });

      campoCampanha = UI.campo({
        rotulo: "Campanha", tipo: "selecao", valor: d.campanhaId,
        opcoes: [{ valor: "", rotulo: "Sem campanha" }].concat(campanhas.map(function (c) {
          return { valor: c.id, rotulo: c.nome };
        })),
      });

      campoNex = UI.campo({
        rotulo: "NEX inicial", tipo: "selecao", valor: String(d.nex),
        opcoes: nivelDeExposicaoOpcoes(),
        ajuda: "Um agente novato começa em NEX 5%. Se a sua mesa começa adiantada, escolha aqui — " +
               "a revisão reúne tudo o que esse NEX acumula.",
      });

      return el("div.pilha", {}, [
        el("p", { texto: "Comece pelo que dá vontade de jogar. O resto se encaixa depois." }),
        campoNome,
        campoConceito,
        el("div.editar-grade", {}, [campoCampanha, campoNex]),
      ]);
    }

    function nivelDeExposicaoOpcoes() {
      var lista = [];
      for (var n = C.REGRAS.nexMinimo; n <= 95; n += C.REGRAS.passoNex) {
        lista.push({ valor: String(n), rotulo: "NEX " + n + "%" });
      }
      lista.push({ valor: "99", rotulo: "NEX 99%" });
      return lista;
    }

    function conferirConceito() {
      d.nome = campoNome.entrada.value.trim();
      d.conceito = campoConceito.entrada.value.trim();
      d.campanhaId = campoCampanha.entrada.value || "";
      d.nex = parseInt(campoNex.entrada.value, 10) || 5;

      if (!d.nome) { campoNome.marcarErro("Informe um nome."); campoNome.entrada.focus(); return "O agente precisa de um nome."; }
      campoNome.marcarErro("");
      return null;
    }

    /* =================================================================
       2. ATRIBUTOS — OPRPG p.14
       -----------------------------------------------------------------
       "Você começa com cada atributo em 1 e tem 4 pontos para distribuir
       entre eles como quiser. Você pode reduzir um de seus atributos
       para 0 para receber 1 ponto adicional. Porém, o valor máximo
       inicial de cada atributo é 3."
       ================================================================= */

    function saldoDeAtributos() {
      var g = C.GERACAO_ATRIBUTOS;
      var gastos = 0;
      var reducoes = 0;

      C.ATRIBUTOS.forEach(function (a) {
        var v = d.atributos[a.chave];
        if (v < g.inicial) reducoes += (g.inicial - v);
        else gastos += (v - g.inicial);
      });

      return {
        disponivel: g.pontos + Math.min(reducoes, g.reducoesPermitidas) * g.pontoPorReducao,
        gastos: gastos,
        reducoes: reducoes,
        reducoesDemais: reducoes > g.reducoesPermitidas,
      };
    }

    function etapaAtributos() {
      var g = C.GERACAO_ATRIBUTOS;
      var resumo = el("p.t-secao", {});
      var aviso = el("p.t-mini", {});

      var linhas = el("div.criacao-atributos", {});

      function atualizar() {
        var s = saldoDeAtributos();
        var sobra = s.disponivel - s.gastos;

        resumo.textContent = sobra === 0
          ? "Pontos distribuídos."
          : (sobra > 0 ? "Faltam " + sobra + " ponto(s) para distribuir."
                       : "Você gastou " + (-sobra) + " ponto(s) a mais.");
        resumo.className = "t-secao " + (sobra === 0 ? "" : "t-aviso");

        aviso.textContent = s.reducoesDemais
          ? "Só um atributo pode ir a 0 para dar um ponto extra. Os outros que estiverem em 0 não rendem ponto."
          : "";
        aviso.className = "t-mini " + (s.reducoesDemais ? "t-erro" : "");

        U.trocar(linhas, C.ATRIBUTOS.map(function (a) {
          var valor = d.atributos[a.chave];
          return el("div.criacao-atributo", {}, [
            el("span.criacao-atributo__sigla", { texto: a.sigla }),
            el("span.criacao-atributo__nome", { texto: a.nome }),
            UI.passo({
              valor: valor, minimo: 0, maximo: g.maximoInicial,
              rotulo: a.nome,
              aoMudar: function (v) { d.atributos[a.chave] = v; atualizar(); },
            }),
            el("span.t-mini", { texto: valor === 0 ? "rola 2d20 e pega o pior" : valor + "d20" }),
          ]);
        }));
      }

      atualizar();

      return el("div.pilha", {}, [
        el("p", {
          texto: "Todo atributo começa em 1. Você tem " + g.pontos + " pontos para distribuir, e o " +
                 "máximo inicial é " + g.maximoInicial + ". Baixar um atributo para 0 devolve 1 ponto — " +
                 "mas só um deles.",
        }),
        resumo,
        linhas,
        aviso,
        referencia("Ordem Paranormal RPG, p. 14"),
      ]);
    }

    function conferirAtributos() {
      var s = saldoDeAtributos();
      if (s.reducoesDemais) return "Só um atributo pode ir a 0 para render um ponto extra.";
      if (s.gastos > s.disponivel) return "Você gastou mais pontos do que tem.";
      if (s.gastos < s.disponivel) return "Ainda faltam pontos para distribuir.";
      return null;
    }

    /* =================================================================
       3. ORIGEM — OPRPG p.16-21
       ================================================================= */

    var buscaOrigem;

    function etapaOrigem() {
      buscaOrigem = UI.campo({ rotulo: "Buscar origem", valor: "", limite: 40, dica: "nome da origem" });
      var lista = el("div.criacao-lista", {});

      function pintarLista() {
        var termo = U.chaveDeBusca(buscaOrigem.entrada.value);
        U.trocar(lista, C.ORIGENS.filter(function (org) {
          return !termo || U.chaveDeBusca(org.nome).indexOf(termo) >= 0;
        }).map(cartaoDeOrigem));
      }

      buscaOrigem.entrada.addEventListener("input", pintarLista);
      pintarLista();

      return el("div.pilha", {}, [
        el("p", { texto: "A origem diz o que você fazia antes da Ordem. Ela dá duas perícias treinadas e um poder." }),
        buscaOrigem,
        lista,
        referencia("Ordem Paranormal RPG, p. 16-21"),
      ]);
    }

    function cartaoDeOrigem(org) {
      var escolhida = d.origem === org.chave;

      var pericias = org.pericias.length
        ? org.pericias.map(function (p) { return C.pericia(p).nome; }).join(" e ")
        : (org.periciasObservacao || "à escolha");

      return el("button.criacao-opcao", {
        type: "button",
        "aria-pressed": String(escolhida),
        class: escolhida ? "criacao-opcao--escolhida" : "",
        onclick: function () {
          d.origem = escolhida ? "" : org.chave;
          d.periciasDaOrigem = [];
          pintar();
        },
      }, [
        el("span.criacao-opcao__nome", { texto: org.nome }),
        el("span.criacao-opcao__meta", { texto: pericias }),
        el("span.criacao-opcao__texto", { texto: org.poder + ". " + org.resumo }),
        etiquetaDeAutomacao(org.automacao),
        el("span.criacao-opcao__fonte", { texto: C.referencia(org) }),
      ]);
    }

    function conferirOrigem() {
      if (!d.origem) return "Escolha uma origem.";
      return null;
    }

    /* =================================================================
       4. CLASSE — OPRPG p.24-35
       ================================================================= */

    function etapaClasse() {
      var lista = el("div.criacao-lista", {}, C.CLASSES.map(cartaoDeClasse));

      var extra = [];
      var classe = C.classe(d.classe);

      if (classe && classe.periciasEscolhaObrigatoria.length) {
        extra.push(el("h4.t-secao", { texto: "Perícias da classe" }));
        extra.push(el("p.t-mini", { texto: "O combatente escolhe uma de cada par." }));

        classe.periciasEscolhaObrigatoria.forEach(function (par, i) {
          var atual = d.escolhasDeClasse[i] || "";
          extra.push(el("div.faixa", {}, par.entre.map(function (chave) {
            var p = C.pericia(chave);
            return el("button.r-botao.r-botao--mini", {
              type: "button",
              class: atual === chave ? "r-botao--principal" : "r-botao--fantasma",
              texto: p.nome,
              onclick: function () { d.escolhasDeClasse[i] = chave; pintar(); },
            });
          })));
        });
      }

      if (classe) {
        var previa = R.calcular(rascunhoParaRegras(), { itens: [] });
        extra.push(el("h4.t-secao", { texto: "Como a ficha fica" }));
        extra.push(el("dl.r-dados", {}, [
          el("dt", { texto: "Pontos de vida" }), el("dd", { texto: String(previa.pv.total) }),
          el("dt", { texto: "Pontos de esforço" }), el("dd", { texto: String(previa.pe.total) }),
          el("dt", { texto: "Sanidade" }), el("dd", { texto: String(previa.san.total) }),
          el("dt", { texto: "Defesa" }), el("dd", { texto: String(previa.defesa.total) }),
        ]));
      }

      return el("div.pilha", {}, [
        el("p", { texto: "A classe é o treinamento que você recebeu dentro da Ordem." }),
        lista,
      ].concat(extra).concat([referencia("Ordem Paranormal RPG, p. 22-35")]));
    }

    function cartaoDeClasse(cl) {
      var escolhida = d.classe === cl.chave;
      var pericias = cl.periciasLivres.base + " + Intelecto perícias à escolha";

      return el("button.criacao-opcao", {
        type: "button",
        "aria-pressed": String(escolhida),
        class: escolhida ? "criacao-opcao--escolhida" : "",
        onclick: function () {
          d.classe = escolhida ? "" : cl.chave;
          d.escolhasDeClasse = [];
          d.periciasEscolhidas = [];
          d.trilha = "";
          pintar();
        },
      }, [
        el("span.criacao-opcao__nome", { texto: cl.nome }),
        el("span.criacao-opcao__meta", {
          texto: "PV " + cl.pvInicial.base + "+Vig · PE " + cl.peInicial.base + "+Pre · SAN " + cl.sanInicial.base,
        }),
        el("span.criacao-opcao__texto", { texto: cl.resumo }),
        el("span.criacao-opcao__texto", { texto: pericias + ". Proficiências: " + cl.proficiencias.join(", ") + "." }),
        el("span.criacao-opcao__fonte", { texto: C.referencia(cl) }),
      ]);
    }

    function conferirClasse() {
      if (!d.classe) return "Escolha uma classe.";
      var classe = C.classe(d.classe);
      var faltando = classe.periciasEscolhaObrigatoria.some(function (par, i) {
        return !d.escolhasDeClasse[i];
      });
      if (faltando) return "Escolha uma perícia de cada par da classe.";
      return null;
    }

    /* =================================================================
       5. PERÍCIAS — OPRPG p.22, p.39
       -----------------------------------------------------------------
       "Se receber uma perícia que já havia recebido pela origem, escolha
       outra." A conta de quantas faltam já desconta as repetidas.
       ================================================================= */

    function periciasJaTreinadas() {
      var org = C.origem(d.origem);
      var conjunto = {};

      (org && org.pericias.length ? org.pericias : d.periciasDaOrigem).forEach(function (p) {
        if (p) conjunto[p] = "Origem";
      });

      (C.classe(d.classe) ? C.classe(d.classe).periciasFixas : []).forEach(function (p) {
        if (!conjunto[p]) conjunto[p] = "Classe";
      });

      d.escolhasDeClasse.forEach(function (p) {
        if (p && !conjunto[p]) conjunto[p] = "Classe";
      });

      return conjunto;
    }

    function quantasLivres() {
      var classe = C.classe(d.classe);
      if (!classe) return 0;
      return classe.periciasLivres.base + (d.atributos[classe.periciasLivres.atributo] || 0);
    }

    function etapaPericias() {
      var jaTem = periciasJaTreinadas();
      var alvo = quantasLivres();
      var resumo = el("p.t-secao", {});
      var lista = el("div.criacao-pericias", {});

      function atualizar() {
        var faltam = alvo - d.periciasEscolhidas.length;
        resumo.textContent = faltam === 0
          ? "Perícias escolhidas."
          : (faltam > 0 ? "Escolha mais " + faltam + " perícia(s)." : "Você escolheu " + (-faltam) + " a mais.");
        resumo.className = "t-secao " + (faltam === 0 ? "" : "t-aviso");

        U.trocar(lista, C.PERICIAS.map(function (p) {
          var origemDela = jaTem[p.chave];
          var escolhida = d.periciasEscolhidas.indexOf(p.chave) >= 0;
          var cheio = !escolhida && d.periciasEscolhidas.length >= alvo;

          /* Quando uma opção não pode ser escolhida, a tela diz por quê
             em vez de só desabilitar. */
          var motivo = origemDela
            ? "já treinada pela " + origemDela.toLowerCase()
            : (cheio ? "não há mais escolhas" : "");

          return el("button.criacao-pericia", {
            type: "button",
            disabled: !!origemDela || cheio,
            "aria-pressed": String(escolhida || !!origemDela),
            class: (escolhida || origemDela) ? "criacao-pericia--marcada" : "",
            title: motivo,
            onclick: function () {
              var i = d.periciasEscolhidas.indexOf(p.chave);
              if (i >= 0) d.periciasEscolhidas.splice(i, 1);
              else d.periciasEscolhidas.push(p.chave);
              atualizar();
            },
          }, [
            el("span.criacao-pericia__nome", { texto: p.nome }),
            el("span.criacao-pericia__atrib", { texto: siglaDe(p.atributo) }),
            motivo ? el("span.criacao-pericia__motivo", { texto: motivo }) : null,
          ]);
        }));
      }

      atualizar();

      return el("div.pilha", {}, [
        el("p", {
          texto: "A origem já treinou o que aparece marcado. Sua classe dá " + alvo +
                 " perícia(s) a mais — " + (C.classe(d.classe) ? C.classe(d.classe).periciasLivres.base : 0) +
                 " da classe mais " + (d.atributos.int || 0) + " do Intelecto.",
        }),
        resumo,
        lista,
        referencia("Ordem Paranormal RPG, p. 39"),
      ]);
    }

    function conferirPericias() {
      var alvo = quantasLivres();
      if (d.periciasEscolhidas.length !== alvo) {
        return "Escolha exatamente " + alvo + " perícia(s).";
      }
      return null;
    }

    /* =================================================================
       6. REVISÃO
       -----------------------------------------------------------------
       O que ficou, e — o ponto desta etapa — o que AINDA FALTA decidir.
       ================================================================= */

    function pendencias() {
      var lista = [];
      var progressao = C.progressaoDaClasse(d.classe);

      progressao.forEach(function (degrau) {
        if (degrau.nex > d.nex) return;

        degrau.escolhas.forEach(function (tipo) {
          if (tipo === "trilha" && d.trilha) return;
          lista.push({
            nex: degrau.nex,
            tipo: tipo,
            rotulo: rotuloDeEscolha(tipo),
          });
        });
      });

      return lista;
    }

    function rotuloDeEscolha(tipo) {
      var mapa = {
        trilha: "Escolher a trilha",
        poderTrilha: "Poder da trilha",
        poderClasse: "Poder de classe",
        atributo: "Aumento de atributo",
        grauTreinamento: "Grau de treinamento",
        versatilidade: "Versatilidade",
        perito: "Perito: escolher duas perícias",
      };
      return mapa[tipo] || tipo;
    }

    function etapaRevisao() {
      var previa = R.calcular(rascunhoParaRegras(), { itens: [] });
      var org = C.origem(d.origem);
      var cl = C.classe(d.classe);
      var jaTem = periciasJaTreinadas();

      var todasPericias = Object.keys(jaTem).concat(d.periciasEscolhidas);

      var trilhas = C.trilhasDaClasse(d.classe);
      var escolhaTrilha = d.nex >= 10 && trilhas.length
        ? el("div.pilha--curta", { class: "pilha" }, [
            el("h4.t-secao", { texto: "Trilha" }),
            el("p.t-mini", { texto: "A partir de NEX 10% você escolhe uma trilha da sua classe." }),
            el("div.faixa", {}, trilhas.map(function (tr) {
              return el("button.r-botao.r-botao--mini", {
                type: "button",
                class: d.trilha === tr.chave ? "r-botao--principal" : "r-botao--fantasma",
                texto: tr.nome,
                title: tr.resumo,
                onclick: function () { d.trilha = d.trilha === tr.chave ? "" : tr.chave; pintar(); },
              });
            })),
          ])
        : null;

      var pend = pendencias();

      return el("div.pilha", {}, [
        el("dl.r-dados", {}, [
          el("dt", { texto: "Nome" }), el("dd", { texto: d.nome }),
          el("dt", { texto: "Origem" }), el("dd", { texto: org ? org.nome : "—" }),
          el("dt", { texto: "Classe" }), el("dd", { texto: cl ? cl.nome : "—" }),
          el("dt", { texto: "NEX" }), el("dd", { texto: d.nex + "%" }),
          el("dt", { texto: "Atributos" }), el("dd", {
            texto: C.ATRIBUTOS.map(function (a) { return a.sigla + " " + d.atributos[a.chave]; }).join(" · "),
          }),
          el("dt", { texto: "Pontos de vida" }), el("dd", { texto: String(previa.pv.total) }),
          el("dt", { texto: "Pontos de esforço" }), el("dd", { texto: String(previa.pe.total) }),
          el("dt", { texto: "Sanidade" }), el("dd", { texto: String(previa.san.total) }),
          el("dt", { texto: "Defesa" }), el("dd", { texto: String(previa.defesa.total) }),
          el("dt", { texto: "Perícias treinadas" }), el("dd", {
            texto: todasPericias.map(function (p) { return C.pericia(p).nome; }).sort().join(", ") || "—",
          }),
          el("dt", { texto: "Proficiências" }), el("dd", { texto: cl ? cl.proficiencias.join(", ") : "—" }),
        ]),

        escolhaTrilha,

        pend.length
          ? el("div.pilha--curta", { class: "pilha" }, [
              el("h4.t-secao.t-aviso", { texto: "Falta decidir (" + pend.length + ")" }),
              el("p.t-mini", {
                texto: "O R.A.M.A. não escolhe isso por você. A ficha nasce com estas pendências " +
                       "em aberto, e você resolve na aba Progressão quando quiser.",
              }),
              el("ul.pilha--curta", { class: "pilha" }, pend.map(function (p) {
                return el("li.t-mini", { texto: "NEX " + p.nex + "% — " + p.rotulo });
              })),
            ])
          : el("p.t-mini", { texto: "Nada pendente: a ficha nasce completa para este NEX." }),
      ]);
    }

    /* =================================================================
       GRAVAR
       ================================================================= */

    function rascunhoParaRegras() {
      var ordem = R.fichaVazia();
      ordem.nex = d.nex;
      ordem.classe = d.classe;
      ordem.origem = d.origem;
      ordem.trilha = d.trilha;
      ordem.atributos = Object.assign({}, d.atributos);

      var jaTem = periciasJaTreinadas();
      Object.keys(jaTem).forEach(function (p) { ordem.pericias[p] = "treinado"; });
      d.periciasEscolhidas.forEach(function (p) { ordem.pericias[p] = "treinado"; });

      return ordem;
    }

    async function gravar() {
      var ordem = rascunhoParaRegras();

      /* As pendências entram na ficha como escolhas EM ABERTO, e não
         como escolhas feitas. É a diferença entre "você ainda precisa
         decidir isto" e "decidimos por você". */
      pendencias().forEach(function (p) {
        ordem.progressao.push({
          id: U.uuid(),
          nex: p.nex,
          tipo: p.tipo,
          valor: "",
          rotulo: p.rotulo,
        });
      });

      var cl = C.classe(d.classe);
      var org = C.origem(d.origem);

      var ficha = F.criarFicha({
        nome: d.nome,
        tipoFicha: "ordem",
        classe: cl ? cl.nome : "",
        origem: org ? org.nome : "",
        campanhaId: d.campanhaId || null,
      });

      ficha.ordem = ordem;

      /* O conceito é do personagem, não das regras: vai para as
         anotações, que é onde ele fica à mão durante o jogo. */
      if (d.conceito) {
        ficha.anotacoes.soltas.push({
          id: U.uuid(),
          titulo: "Conceito",
          conteudo: d.conceito,
        });
      }

      var r = await global.RAMAApi.criarPersonagem(ficha);
      if (!r.ok) { UI.avisoDeFalha(r, "criação de personagem"); return; }

      m.fechar();
      location.href = U.url("ficha/?id=" + encodeURIComponent(r.dados.id));
    }

    /* =================================================================
       AUXILIARES DE TELA
       ================================================================= */

    function referencia(texto) {
      return el("p.criacao-fonte", { texto: texto });
    }

    function etiquetaDeAutomacao(automacao) {
      if (automacao === "calculo") {
        return el("span.etiqueta.etiqueta--calculo", { texto: "entra na conta" });
      }
      if (automacao === "parcial") {
        return el("span.etiqueta.etiqueta--parcial", { texto: "parte na conta" });
      }
      return el("span.etiqueta", { texto: "anotação" });
    }

    function siglaDe(chave) {
      var a = C.ATRIBUTOS.filter(function (x) { return x.chave === chave; })[0];
      return a ? a.sigla : chave;
    }

    /* =================================================================
       A JANELA
       ================================================================= */

    var m = UI.modal({
      titulo: "Novo agente da Ordem",
      largo: true,
      conteudo: [corpo, rodapeInfo],
      botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }],
    });

    var rodape = m.janela.querySelector(".r-modal__rodape");
    rodape.appendChild(voltar);
    rodape.appendChild(avancar);

    pintar();
    return m;
  }

  global.RAMAOrdemCriar = { abrir: abrir };
})(window);
