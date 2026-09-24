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
   na revisão com o botão que abre a escolha certa. Dá para resolver ali
   mesmo ou criar o personagem com a pendência em aberto e resolver
   depois, na aba Progressão. Preencher sozinho seria decidir o
   personagem de alguém.

   ---------------------------------------------------------------------
   COMEÇAR ADIANTADO
   ---------------------------------------------------------------------

   Dá para criar um personagem já em NEX 50%. A tela reúne o que aquele
   NEX acumulou — trilha, aumentos de atributo, graus de treinamento,
   poderes, afinidade — numa lista só, sem obrigar ninguém a salvar uma
   ficha por etapa anterior. As escolhas usam as mesmas janelas e o
   mesmo motor de progressão da ficha: o que se decide aqui é o que a
   ficha vai mostrar.

   ---------------------------------------------------------------------
   REGRAS QUE MUDAM A PROGRESSÃO
   ---------------------------------------------------------------------

   NEX & Experiência (e Evolução por Patentes) trocam o trilho que decide
   PV, PE, Sanidade e as etapas. Por isso a revisão as mostra ANTES das
   pendências: descobrir depois de resolver tudo que a mesa separa nível
   e NEX seria refazer a progressão. A chave é a mesma da aba Regras da
   ficha (RAMAOrdemOpcionais) e vai gravada junto.

   No rascunho, ligar NEX & Experiência põe o nível no equivalente ao NEX
   escolhido (1 nível por 5%), e desligar devolve ao NEX o equivalente ao
   nível — o personagem continua no mesmo degrau. O NEX por exposição
   fica editável enquanto a regra estiver ligada.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var F = global.RAMAFicha;
  var C = global.RAMAOrdemCatalogo;
  var R = global.RAMAOrdemRegras;
  var E = global.RAMAOrdemProgressao;
  var ES = global.RAMAOrdemEscolhas;
  var OP = global.RAMAOrdemOpcionais;
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
      /* As decisões de progressão feitas na revisão, no mesmo formato
         que a ficha grava. */
      escolhas: [],
      afinidade: { elemento: "", nomeOutro: "", adiada: false },
      /* Regras opcionais ligadas na revisão e, com NEX & Experiência, o
         nível de experiência — que passa a mandar na progressão. */
      opcionais: {},
      nivel: 1,
      nivelDefinido: false,
      /* Os rituais escolhidos na revisão. A criação de um ocultista
         abre os três iniciais, e o ritual tem de ir para algum lugar
         antes de a ficha existir — aqui. Eles vão inteiros para a ficha
         em `gravar`, com o vínculo que as escolhas já guardam. */
      rituais: [],
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

    /* Redesenha e devolve o foco a um controle que nasceu de novo com o
       mesmo id — sem isto, quem usa teclado volta ao topo da janela. */
    function pintarFocando(id) {
      pintar();
      var alvo = id && document.getElementById(id);
      if (alvo) alvo.focus();
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

    var campoNome, campoConceito, campoCampanha, campoNex, campoExposicao;

    function separaNivel() {
      return !!(OP && OP.ligada(d, "nexExperiencia"));
    }

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

      if (separaNivel()) {
        campoNex = UI.campo({
          rotulo: "Nível de experiência inicial", tipo: "selecao", valor: String(d.nivel),
          opcoes: opcoesDeParametro({ chave: "nivel", minimo: 1, maximo: 20 }),
          ajuda: "A regra “NEX & Experiência” está ligada (etapa Revisão): o nível manda na progressão.",
        });
        campoExposicao = UI.campo({
          rotulo: "NEX por exposição", tipo: "selecao", valor: String(d.nex),
          opcoes: opcoesDeParametro({ chave: "nex", minimo: 0, maximo: C.REGRAS.nexMaximo }),
          ajuda: "Mede só o contato com o Outro Lado: afinidade elemental e poderes paranormais.",
        });
      } else {
        campoNex = UI.campo({
          rotulo: "NEX inicial", tipo: "selecao", valor: String(d.nex),
          opcoes: nivelDeExposicaoOpcoes(),
          ajuda: "Um agente novato começa em NEX 5%. Se a sua mesa começa adiantada, escolha aqui — " +
                 "a revisão reúne tudo o que esse NEX acumula. Se a mesa separa nível e NEX, " +
                 "ligue “NEX & Experiência” na revisão.",
        });
        campoExposicao = null;
      }

      return el("div.pilha", {}, [
        el("p", { texto: "Comece pelo que dá vontade de jogar. O resto se encaixa depois." }),
        campoNome,
        campoConceito,
        el("div.editar-grade", {}, [campoCampanha, campoNex, campoExposicao]),
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
      if (campoExposicao) {
        d.nivel = Math.max(1, Math.min(20, parseInt(campoNex.entrada.value, 10) || 1));
        d.nex = R.nexValido(campoExposicao.entrada.value);
      } else {
        d.nex = parseInt(campoNex.entrada.value, 10) || 5;
      }

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
        periciasAEscolherDaOrigem(),
        referencia("Ordem Paranormal RPG, p. 16-21"),
      ]);
    }

    /* Amnésico: "Duas à escolha do mestre" (OPRPG p.16). A tela precisa
       de um lugar para registrar a decisão da mesa. */
    function periciasAEscolherDaOrigem() {
      var org = C.origem(d.origem);
      if (!org || !org.periciasAEscolher) return null;
      var alvo = org.periciasAEscolher;

      return el("div.pilha--curta", { class: "pilha" }, [
        el("h4.t-secao", { texto: "Perícias da origem (" + d.periciasDaOrigem.length + " de " + alvo + ")" }),
        el("p.t-mini", { texto: org.periciasObservacao || "Escolha as perícias." }),
        el("div.criacao-pericias", {}, C.PERICIAS.map(function (p) {
          var marcada = d.periciasDaOrigem.indexOf(p.chave) >= 0;
          var cheia = !marcada && d.periciasDaOrigem.length >= alvo;
          return el("button.criacao-pericia", {
            type: "button",
            "aria-pressed": String(marcada),
            "aria-disabled": cheia ? "true" : null,
            class: marcada ? "criacao-pericia--marcada" : (cheia ? "criacao-pericia--bloqueada" : ""),
            title: cheia ? "Já há " + alvo + " escolhidas." : "",
            onclick: function () {
              if (cheia) { UI.avisoAtencao("Já há " + alvo + " perícias escolhidas. Desmarque uma antes."); return; }
              var i = d.periciasDaOrigem.indexOf(p.chave);
              if (i >= 0) d.periciasDaOrigem.splice(i, 1); else d.periciasDaOrigem.push(p.chave);
              d.periciasEscolhidas = d.periciasEscolhidas.filter(function (x) { return x !== p.chave; });
              pintar();
            },
          }, [
            el("span.criacao-pericia__nome", { texto: p.nome }),
            el("span.criacao-pericia__atrib", { texto: siglaDe(p.atributo) }),
          ]);
        })),
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
      var org = C.origem(d.origem);
      if (org && org.periciasAEscolher && d.periciasDaOrigem.length !== org.periciasAEscolher) {
        return "Escolha as " + org.periciasAEscolher + " perícias da origem.";
      }
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

    /* As pendências vêm do motor de progressão, calculadas sobre o
       rascunho — as mesmas que a ficha vai mostrar. */
    function pendencias() {
      return E.estado(rascunhoParaRegras(), null).pendencias;
    }

    /* Abre a escolha de uma pendência sobre o rascunho e traz o
       resultado de volta para ele. */
    function resolverNoRascunho(p) {
      var ordem = rascunhoParaRegras();
      ES.abrir({
        ordem: ordem,
        contexto: { inventario: { itens: [] }, rituais: d.rituais },
        rituais: d.rituais,
        /* A biblioteca de rituais escreve numa ficha; o rascunho ainda
           não é uma. Este objeto é a ficha que ele seria: a mesma
           janela, os mesmos botões, e nada gravado no servidor até
           alguém criar o personagem. */
        ctx: fichaDoRascunho(ordem),
        vagaId: p.id,
        aoRegistrar: function () { trazerDeVolta(ordem); pintar(); },
        aoConfirmar: function () { trazerDeVolta(ordem); pintar(); },
        aoMudarRituais: function () { trazerDeVolta(ordem); pintar(); },
        aoAdiar: function () { trazerDeVolta(ordem); pintar(); },
      });
    }

    function fichaDoRascunho(ordem) {
      var ficha = {
        tipoFicha: "ordem",
        ordem: ordem,
        inventario: { itens: [] },
        rituais: { rotuloSecao: "Rituais", rotulos: F.ROTULOS_RITUAL_PADRAO, itens: d.rituais },
      };
      return {
        ficha: ficha,
        emEdicao: function () { return true; },
        alterou: function () { trazerDeVolta(ordem); },
        redesenhar: function () { pintar(); },
      };
    }

    function trazerDeVolta(ordem) {
      d.escolhas = ordem.escolhas || [];
      d.afinidade = ordem.afinidade || d.afinidade;
      d.trilha = ordem.trilha || "";
    }

    /* Os rituais escolhidos aparecem na revisão como aparecerão na
       ficha: com a concessão que cada um ocupa. */
    function resumoDosRituais() {
      if (!d.rituais.length) return null;
      var est = E.estado(rascunhoParaRegras(), { inventario: { itens: [] }, rituais: d.rituais });
      return el("div.pilha--curta", { class: "pilha" }, [
        el("h4.t-secao", { texto: "Rituais escolhidos (" + d.rituais.length + ")" }),
        el("ul.bib-lista-textos", {}, d.rituais.map(function (r) {
          var v = est.rituais.porRitual[r.id];
          return el("li.t-mini", {
            texto: r.nome + (v ? " — " + v.nomePoder + " · " + v.rotuloEtapa +
              (v.destino === "grimorio" ? " · grimório" : "") : " — sem concessão"),
          });
        })),
      ]);
    }

    function etapaRevisao() {
      var rascunho = rascunhoParaRegras();
      var previa = R.calcular(rascunho, { itens: [] });
      var trilho = R.trilho(rascunho);
      var org = C.origem(d.origem);
      var cl = C.classe(d.classe);
      var jaTem = periciasJaTreinadas();

      var todasPericias = Object.keys(jaTem).concat(d.periciasEscolhidas);
      var trilha = C.trilha(d.trilha);
      /* A trilha abre no segundo degrau: NEX 10%, ou nível 2. */
      var semTrilha = trilho.passos >= 2 ? "a escolher" : (trilho.separado ? "a partir do nível 2" : "a partir de NEX 10%");
      var feitas = (d.escolhas || []).map(function (r) {
        var tipo = E.TIPOS[r.tipo];
        return (tipo ? tipo.rotulo + ": " : "") + (r.nome || "");
      });

      var pend = pendencias();

      return el("div.pilha", {}, [
        el("dl.r-dados", {}, [
          el("dt", { texto: "Nome" }), el("dd", { texto: d.nome }),
          el("dt", { texto: "Origem" }), el("dd", { texto: org ? org.nome : "—" }),
          el("dt", { texto: "Classe" }), el("dd", { texto: cl ? cl.nome : "—" }),
          trilho.separado ? el("dt", { texto: "Nível de experiência" }) : el("dt", { texto: "NEX" }),
          trilho.separado ? el("dd", { texto: String(d.nivel) }) : el("dd", { texto: d.nex + "%" }),
          trilho.separado ? el("dt", { texto: "NEX por exposição" }) : null,
          trilho.separado ? el("dd", { texto: d.nex + "%" }) : null,
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
          el("dt", { texto: "Trilha" }), el("dd", { texto: trilha ? trilha.nome : semTrilha }),
          feitas.length ? el("dt", { texto: "Já decidido" }) : null,
          feitas.length ? el("dd", { texto: feitas.join(" · ") }) : null,
        ]),

        regrasDeProgressao(rascunho),
        resumoDosRituais(),

        pend.length
          ? el("div.pilha--curta", { class: "pilha" }, [
              el("h4.t-secao.t-aviso", { texto: "Falta decidir (" + pend.length + ")" }),
              el("p.t-mini", {
                texto: "O R.A.M.A. não escolhe isto por você. Resolva aqui, uma a uma, ou crie o personagem " +
                       "agora: as pendências ficam na aba Progressão, com o mesmo botão.",
              }),
              el("div.pilha--curta", { class: "pilha" }, pend.map(function (p) {
                return ES.cartaoDePendencia(p, resolverNoRascunho);
              })),
            ])
          : el("p.t-mini", { texto: "Nada pendente: a ficha nasce completa para este " + (trilho.separado ? "nível." : "NEX.") }),
      ]);
    }

    /* As regras opcionais que trocam o trilho de progressão, com a mesma
       chave da aba Regras da ficha. Ficam acima das pendências porque
       mudam quais pendências existem. */
    function regrasDeProgressao(rascunho) {
      var regras = OP ? OP.deProgressao() : [];
      if (!regras.length) return null;

      return el("div.pilha--curta", { class: "pilha" }, [
        el("h4.t-secao", { texto: "Regras que mudam a progressão" }),
        el("p.t-mini", {
          texto: "Decida antes de resolver o que falta: estas regras mudam o que conta como " +
                 "progressão — e, com isso, as pendências abaixo. Todas começam desligadas, " +
                 "e as outras regras opcionais ficam na aba Regras da ficha.",
        }),
        el("div.pilha--curta", { class: "pilha" }, regras.map(function (r) {
          return cartaoDeRegra(rascunho, r);
        })),
      ]);
    }

    function cartaoDeRegra(rascunho, r) {
      var ligada = OP.ligada(rascunho, r.chave);
      var problemas = OP.conflitos(rascunho, r.chave, true);
      var bloqueada = !ligada && problemas.length > 0;

      var chave = el("button.r-interruptor", {
        type: "button",
        role: "switch",
        id: "criacao-regra-" + r.chave,
        "aria-checked": String(ligada),
        "aria-label": r.nome,
        disabled: bloqueada,
        class: ligada ? "r-interruptor--ligado" : "",
        onclick: function () { alternarRegra(r, !ligada); },
      }, [el("span.r-interruptor__bola", { "aria-hidden": "true" })]);

      var corpo = [
        el("p.t-mini", { texto: r.resumo }),
        el("p.t-mini", { texto: r.efeito }),
        ES.etiquetaAutomacao(r.automacao),
        referencia((r.fonte === "SAH" ? "Sobrevivendo ao Horror" : "Ordem Paranormal RPG") + ", p. " + r.pagina),
      ];

      /* Evolução por Patentes ainda não tem a tabela estruturada: ligar
         não muda conta nem pendência, e o cartão precisa dizer isso para
         ninguém esperar que a lista abaixo mude. */
      if (r.automacao !== "calculo") {
        corpo.push(el("p.t-mini", {
          texto: "O R.A.M.A. ainda não recalcula a progressão com esta regra: ligada, as pendências " +
                 "abaixo não mudam. Ela fica registrada na ficha, para a mesa.",
        }));
      }

      if (bloqueada) {
        corpo.push(el("p.t-mini.t-erro", { texto: problemas.map(function (p) { return p.texto; }).join(" ") }));
      }

      if (ligada && r.parametros.length) {
        corpo.push(el("div.editar-grade", {}, r.parametros.map(function (par) {
          var id = "criacao-parametro-" + par.chave;
          return UI.campo({
            id: id,
            rotulo: par.rotulo,
            tipo: "selecao",
            valor: String(d[par.chave]),
            opcoes: opcoesDeParametro(par),
            ajuda: par.ajuda,
            aoMudar: function (v) {
              d[par.chave] = Math.max(par.minimo, Math.min(par.maximo, parseInt(v, 10) || par.minimo));
              pintarFocando(id);
            },
          });
        })));
      }

      return el("div.ordem-regra", { class: ligada ? "ordem-regra--ligada" : "" }, [
        el("div.ordem-regra__topo", {}, [
          el("span.ordem-regra__nome", { texto: r.nome }),
          chave,
        ]),
        el("div.pilha--curta", { class: "pilha" }, corpo),
      ]);
    }

    /* O que muda NO RASCUNHO. Não é o texto da aba Regras da ficha:
       aqui o nível e o NEX são convertidos um no outro, para o
       personagem ficar no mesmo degrau. */
    function textoDaMudanca(r, ligar) {
      if (r.chave === "nexExperiencia") {
        var nivel = Math.max(1, Math.round((Number(d.nex) || C.REGRAS.nexMinimo) / C.REGRAS.passoNex));
        var nex = d.nivel >= 20 ? C.REGRAS.nexMaximo : Math.max(C.REGRAS.nexMinimo, d.nivel * C.REGRAS.passoNex);
        return ligar
          ? { texto: "O nível de experiência passa a mandar na progressão, começando no equivalente ao NEX escolhido (NEX " +
                     d.nex + "% → nível " + nivel + "). O NEX passa a medir só exposição e continua em " + d.nex + "%.",
              detalhe: "Podem surgir pendências por exposição, como alterações e transcender." }
          : { texto: "O NEX volta a mandar na progressão, valendo o que o nível valia (nível " + d.nivel +
                     " → NEX " + nex + "%).",
              detalhe: "O NEX por exposição definido na regra deixa de valer, e as pendências por exposição somem." };
      }
      return {
        texto: ligar ? r.efeito : "A regra deixa de ser registrada na ficha.",
        detalhe: r.automacao !== "calculo" ? "O R.A.M.A. ainda não recalcula a progressão com esta regra." : "",
      };
    }

    function opcoesDeParametro(par) {
      var lista = [];
      for (var n = par.minimo; n <= par.maximo; n++) {
        lista.push({ valor: String(n), rotulo: par.chave === "nex" ? n + "%" : String(n) });
      }
      return lista;
    }

    async function alternarRegra(r, ligar) {
      /* Com decisões já tomadas, avisa antes — como a aba Regras. Num
         rascunho sem nada decidido não há o que perder, e o cartão já
         diz o que a regra faz. */
      var decidiu = (d.escolhas || []).length > 0 || !!d.trilha ||
                    !!(d.afinidade && (d.afinidade.elemento || d.afinidade.adiada));
      if (decidiu) {
        var mudanca = textoDaMudanca(r, ligar);
        var certeza = await UI.confirmar({
          titulo: (ligar ? "Ligar" : "Desligar") + " “" + r.nome + "”?",
          texto: mudanca.texto,
          detalhe: mudanca.detalhe + " Nada do que você já decidiu nesta revisão é apagado; o que " +
                   "ficar numa etapa que o personagem não alcança fica guardado, sem efeito.",
          rotuloConfirmar: ligar ? "Ligar" : "Desligar",
        });
        if (!certeza) return;
      }

      var ordem = rascunhoParaRegras();
      /* No rascunho, o nível parte sempre do NEX escolhido agora — não de
         uma vez anterior em que a regra foi ligada e desligada. */
      if (ligar && r.chave === "nexExperiencia") ordem.nivelDefinido = false;

      var resultado = OP.definir(ordem, r.chave, ligar);
      if (!resultado.ok) {
        UI.avisoErro((resultado.problemas || []).map(function (p) { return p.texto; }).join(" ") ||
          "Não foi possível mudar esta regra.");
        return;
      }

      var aviso = null;
      if (ligar && r.chave === "nexExperiencia") {
        aviso = "O nível começou em " + ordem.nivel + ", o equivalente ao NEX " + ordem.nex +
                "% escolhido. O NEX por exposição continua " + ordem.nex + "% — ajuste os dois se a mesa combinou outros valores.";
      }
      if (!ligar && r.chave === "nexExperiencia") {
        /* O personagem continua no mesmo degrau: o NEX volta a mandar,
           valendo o que o nível valia. */
        ordem.nex = ordem.nivel >= 20 ? C.REGRAS.nexMaximo : Math.max(C.REGRAS.nexMinimo, ordem.nivel * C.REGRAS.passoNex);
        aviso = "O NEX voltou a mandar na progressão: NEX " + ordem.nex + "%, o equivalente ao nível " + ordem.nivel + ".";
      }

      d.opcionais = ordem.opcionais || {};
      d.nivel = ordem.nivel;
      d.nivelDefinido = !!ordem.nivelDefinido;
      d.nex = ordem.nex;

      pintarFocando("criacao-regra-" + r.chave);
      if (aviso) UI.aviso(aviso);
    }

    /* =================================================================
       GRAVAR
       ================================================================= */

    function rascunhoParaRegras() {
      var ordem = R.fichaVazia();
      ordem.nex = d.nex;
      ordem.nivel = d.nivel;
      ordem.nivelDefinido = d.nivelDefinido;
      ordem.opcionais = Object.assign({}, d.opcionais);
      ordem.classe = d.classe;
      ordem.origem = d.origem;
      ordem.trilha = d.trilha;
      ordem.atributos = Object.assign({}, d.atributos);
      ordem.escolhas = JSON.parse(JSON.stringify(d.escolhas || []));
      ordem.afinidade = Object.assign({}, d.afinidade);

      var jaTem = periciasJaTreinadas();
      Object.keys(jaTem).forEach(function (p) { ordem.pericias[p] = "treinado"; });
      d.periciasEscolhidas.forEach(function (p) { ordem.pericias[p] = "treinado"; });

      return ordem;
    }

    async function gravar() {
      /* As escolhas feitas na revisão vão junto. As que ficaram em
         aberto NÃO são gravadas como nada: a ficha as calcula a partir
         da classe e do NEX, e elas aparecem na Progressão esperando. */
      var ordem = rascunhoParaRegras();

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
      /* Os rituais escolhidos na revisão entram inteiros: o vínculo
         que `ordem.escolhas` guarda aponta para o id de cada um, e
         criar outra cópia aqui quebraria esse vínculo. */
      d.rituais.forEach(function (r) { ficha.rituais.itens.push(r); });
      /* A mesa já vê a vida do personagem novo — ver "Resumo de
         recursos" em backend/Campanhas.gs. */
      if (R.resumoDeRecursos) ficha.resumoRecursos = R.resumoDeRecursos(ordem);

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
