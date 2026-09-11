/* =====================================================================
   R.A.M.A. — ficha de Ordem Paranormal
   =====================================================================
   As quatro seções que só a ficha de Ordem tem: Geral, Perícias,
   Progressão e Regras opcionais.

   Habilidades, Rituais, Inventário e Anotações são as MESMAS da ficha
   universal. Um ritual é um ritual; duplicar a seção só para trocar o
   cabeçalho seria manter dois códigos iguais e corrigir bug em um só.

   ---------------------------------------------------------------------
   CALCULADO, ESCOLHIDO E AJUSTADO SÃO VISUALMENTE DIFERENTES
   ---------------------------------------------------------------------

   Um número que o sistema calculou e um que a mesa digitou não podem
   parecer a mesma coisa. Aqui:

     valor calculado   tem o símbolo de conta ao lado e abre a
                       composição no clique
     ajuste manual     aparece na composição com o motivo e a marca de
                       ajuste da mesa
     recurso atual     é editável, porque é o que a pessoa gastou

   ---------------------------------------------------------------------
   O QUE ESTA TELA NUNCA FAZ
   ---------------------------------------------------------------------

   Escolher. Pendência aparece como pendência, com o que falta escrito,
   e espera. Nada é preenchido por conta própria, e nada que deixou de
   cumprir um requisito é apagado em silêncio — é marcado, e quem joga
   decide.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var C = global.RAMAOrdemCatalogo;
  var R = global.RAMAOrdemRegras;
  var OP = global.RAMAOrdemOpcionais;
  var D = global.RAMADados;
  var el = U.el;

  function ordemDe(ctx) {
    if (!ctx.ficha.ordem) ctx.ficha.ordem = R.fichaVazia();
    return ctx.ficha.ordem;
  }

  function calculo(ctx) {
    return R.calcular(ordemDe(ctx), ctx.ficha.inventario);
  }

  /* =================================================================
     O NÚMERO CALCULADO, COM A CONTA ATRÁS
     ================================================================= */

  function valorCalculado(rotulo, conta, extra) {
    var botao = el("button.calculado", {
      type: "button",
      "aria-label": "Como " + rotulo + " foi calculado",
      title: "Ver a composição",
      onclick: function () { abrirComposicao(rotulo, conta); },
    }, [
      el("span.calculado__rotulo", { texto: rotulo }),
      el("span.calculado__valor", { texto: String(conta.total) }),
      extra ? el("span.calculado__extra", { texto: extra }) : null,
      el("span.calculado__marca", { "aria-hidden": "true", texto: "=" }),
    ]);

    return botao;
  }

  function abrirComposicao(rotulo, conta) {
    UI.modal({
      titulo: rotulo,
      conteudo: [
        el("p.t-mini", { texto: "De onde vem cada parte deste número." }),
        el("div.composicao", {}, conta.parcelas.map(function (p) {
          return el("div.composicao__linha", {
            class: p.origem === "ajuste da mesa" ? "composicao__linha--manual" : "",
          }, [
            el("span.composicao__rotulo", { texto: p.rotulo }),
            el("span.composicao__origem", { texto: p.origem || "" }),
            el("span.composicao__valor", { texto: U.comSinal(p.valor) }),
          ]);
        })),
        el("div.composicao__total", {}, [
          el("span", { texto: "Total" }),
          el("span", { texto: String(conta.total) }),
        ]),
      ],
      botoes: [{ rotulo: "Fechar", classe: "r-botao--principal" }],
    });
  }

  /* =================================================================
     GERAL
     ================================================================= */

  var SecaoGeral = {
    /* O que fica sempre à vista, acima das abas: a foto, os atributos
       que se rolam e os recursos que se gastam. É o que a mão procura
       no meio de uma cena. */
    blocoSuperior: function (ctx) {
      var o = ordemDe(ctx);
      var c = calculo(ctx);

      return el("div.ficha-geral", {}, [
        el("div.ficha-identidade", {}, [
          global.RAMASecaoGeral.foto
            ? global.RAMASecaoGeral.foto(ctx)
            : el("div.ficha-foto", {}, [el("div.ficha-foto__vazio", {}, [UI.marca(48)])]),
          identidadeCurta(ctx, o, c),
        ]),
        el("div.pilha--larga", { class: "pilha" }, [
          UI.painel("Atributos", painelAtributosCorpo(ctx, o)),
          UI.painel("Recursos", painelRecursosCorpo(ctx, o, c)),
          UI.painel("Defesa e movimento", painelDerivadosCorpo(ctx, o, c)),
        ]),
      ]);
    },

    /* A aba Geral fica com o que não precisa estar à vista o tempo
       todo: quem é o personagem nas regras, e os ajustes da mesa. */
    aba: function (ctx) {
      var o = ordemDe(ctx);
      var c = calculo(ctx);

      return el("div.pilha--larga", { class: "pilha" }, [
        painelIdentidade(ctx, o, c),
        UI.painel("Ajustes da mesa", botaoAjuste(ctx, o, true)),
      ]);
    },
  };

  /* A coluna de identidade do bloco fixo: o essencial, curto. */
  function identidadeCurta(ctx, o, c) {
    var classe = C.classe(o.classe);
    var origem = C.origem(o.origem);

    return el("dl.r-dados.ficha-identidade__dados", {}, [
      el("dt", { texto: "Classe" }), el("dd", { texto: classe ? classe.nome : "—" }),
      el("dt", { texto: "Origem" }), el("dd", { texto: origem ? origem.nome : "—" }),
      el("dt", { texto: c.trilho.separado ? "Nível" : "NEX" }), el("dd", { texto: c.trilho.curto }),
      el("dt", { texto: "Patente" }), el("dd", { texto: c.patente.patente.nome }),
    ]);
  }

  function painelIdentidade(ctx, o, c) {
    var classe = C.classe(o.classe);
    var origem = C.origem(o.origem);
    var trilha = C.trilha(o.trilha);

    var linhas = [
      ["Classe", classe ? classe.nome : "—"],
      ["Origem", origem ? origem.nome : "—"],
      ["Trilha", trilha ? trilha.nome : "—"],
      [c.trilho.separado ? "Nível de experiência" : "NEX", c.trilho.rotulo],
    ];

    if (c.trilho.separado) {
      linhas.push(["NEX por exposição", c.exposicao + "%"]);
    }

    linhas.push(["Patente", c.patente.patente.nome]);
    linhas.push(["Limite de crédito", c.patente.credito + (c.patente.creditoElevado ? " (elevado)" : "")]);
    linhas.push(["Proficiências", classe ? classe.proficiencias.join(", ") : "—"]);

    var poderDaOrigem = origem
      ? el("div.pilha--curta", { class: "pilha" }, [
          el("p.t-secao", { texto: origem.poder }),
          el("p.t-mini", { texto: origem.resumo }),
          etiqueta(origem.automacao),
          el("p.criacao-fonte", { texto: C.referencia(origem) }),
        ])
      : null;

    return UI.painel("Identidade", el("div.pilha", {}, [
      el("dl.r-dados", {}, linhas.reduce(function (saida, par) {
        return saida.concat([el("dt", { texto: par[0] }), el("dd", { texto: par[1] })]);
      }, [])),
      poderDaOrigem,
    ]));
  }

  function painelAtributosCorpo(ctx, o) {
    var grade = el("div.ordem-atributos", {}, C.ATRIBUTOS.map(function (a) {
      var valor = o.atributos[a.chave] || 0;
      var expressao = valor <= 0 ? "-2d20" : valor + "d20";

      var caixa = el("div.ordem-atributo", {}, [
        el("span.ordem-atributo__sigla", { texto: a.sigla }),
        ctx.emEdicao()
          ? UI.passo({
              valor: valor, minimo: 0, maximo: 5, rotulo: a.nome,
              aoMudar: function (v) {
                o.atributos[a.chave] = v;
                aoMudarOrdem(ctx);
              },
            })
          : el("button.ordem-atributo__valor", {
              type: "button",
              "aria-label": "Rolar " + a.nome + ", " + expressao,
              title: "Rolar " + expressao,
              texto: String(valor),
              onclick: function () { rolarAtributo(ctx, a, expressao); },
            }),
        el("span.ordem-atributo__dado", { texto: expressao }),
        el("span.ordem-atributo__nome", { texto: a.nome }),
      ]);

      return caixa;
    }));

    return el("div.pilha", {}, [
      grade,
      el("p.t-mini", {
        texto: ctx.emEdicao()
          ? "O teto de 5 é do Aumento de Atributo (livro, p. 26). Atributo 0 rola 2d20 e usa o pior."
          : "Clique no número para rolar.",
      }),
    ]);
  }

  function rolarAtributo(ctx, a, expressao) {
    var r = D.rolar(expressao);
    if (!r.ok) { UI.avisoErro("Expressão de dado inválida para " + a.nome + "."); return; }

    global.RAMARolagens.mostrar({
      tipo: "atributo",
      nome: a.nome,
      expressao: r.expressao,
      rolagens: r.rolagens,
      natural: r.principal,
      total: r.principal,
      parcelas: [],
    }, { nome: a.nome });
  }

  /* Os recursos: o que sobrou. São os únicos números editáveis fora do
     modo edição, porque são os únicos que mudam durante uma sessão. */
  function painelRecursosCorpo(ctx, o, c) {
    var semSanidade = OP && OP.ligada(o, "semSanidade");

    var itens = [
      { chave: "pv", nome: "Pontos de vida", conta: c.pv, atual: c.atual.pv },
      { chave: "pe", nome: "Pontos de esforço", conta: c.pe, atual: c.atual.pe },
    ];

    if (!semSanidade) {
      itens.push({ chave: "san", nome: "Sanidade", conta: c.san, atual: c.atual.san });
    }

    return el("div.pilha", {}, [
      el("div.ordem-recursos", {}, itens.map(function (item) {
        return el("div.ordem-recurso", {}, [
          el("div.ordem-recurso__topo", {}, [
            el("span.ordem-recurso__nome", { texto: item.nome }),
            valorCalculado("Máximo de " + item.nome.toLowerCase(), item.conta),
          ]),
          UI.passo({
            valor: item.atual, minimo: -99, maximo: item.conta.total,
            rotulo: item.nome + " atual",
            aoMudar: function (v) {
              if (!o.recursos) o.recursos = { pv: null, pe: null, san: null };
              o.recursos[item.chave] = v;
              ctx.alterou();
            },
          }),
        ]);
      })),
      semSanidade
        ? el("p.t-mini", { texto: "A Sanidade está escondida pela regra opcional “Jogando sem Sanidade”. O valor continua gravado." })
        : null,
      el("p.t-mini", { texto: "Os máximos são calculados. O número editável é o que sobrou depois do gasto." }),
    ]);
  }

  function painelDerivadosCorpo(ctx, o, c) {
    var carga = c.carga;

    return el("div.pilha", {}, [
      el("div.ordem-derivados", {}, [
        valorCalculado("Defesa", c.defesa),
        valorCalculado("Deslocamento", c.deslocamento, "metros"),
        valorCalculado("Limite de PE por turno", c.limitePe),
      ]),

      el("div.ordem-carga", {}, [
        el("span.t-rotulo", { texto: "Carga" }),
        el("span", { texto: carga.ocupado + " / " + carga.limite + " espaços" }),
        carga.sobrecarregado
          ? el("span.t-erro.t-mini", {
              texto: carga.acimaDoMaximo
                ? "Acima do máximo de " + carga.maximo + " espaços."
                : "Sobrecarregado: −5 Defesa, −5 nas perícias de carga, −3m de deslocamento.",
            })
          : el("span.t-mini", { texto: "Força " + carga.forca + " carrega " + carga.limite + " espaços." }),
      ]),

      c.rituais.circuloMaximo
        ? el("p.t-mini", {
            texto: "Conjura rituais até o " + c.rituais.circuloMaximo + "º círculo. " +
                   "Pode aprender até " + c.rituais.limitePorIntelecto + " ritual(is) pelo poder Aprender Ritual.",
          })
        : null,

    ]);
  }

  /* =================================================================
     AJUSTE MANUAL
     -----------------------------------------------------------------
     A mesa decide coisas que o livro não prevê. Uma validação rígida
     que impedisse isso tornaria impossível representar uma exceção
     legítima — então o ajuste existe, é explícito, tem motivo e aparece
     marcado na composição.
     ================================================================= */

  var ALVOS_DE_AJUSTE = [
    { valor: "pv", rotulo: "Pontos de vida (máximo)" },
    { valor: "pe", rotulo: "Pontos de esforço (máximo)" },
    { valor: "san", rotulo: "Sanidade (máximo)" },
    { valor: "defesa", rotulo: "Defesa" },
    { valor: "deslocamento", rotulo: "Deslocamento" },
    { valor: "limitePe", rotulo: "Limite de PE por turno" },
  ];

  function botaoAjuste(ctx, o, semTitulo) {
    var lista = (o.ajustes || []);

    return el("div.pilha--curta", { class: "pilha" }, [
      semTitulo ? null : el("h4.t-secao", { texto: "Ajustes da mesa" }),
      lista.length
        ? el("div.pilha--curta", { class: "pilha" }, lista.map(function (a) {
            var alvo = ALVOS_DE_AJUSTE.filter(function (x) { return x.valor === a.alvo; })[0];
            return el("div.faixa", {}, [
              el("span.t-mini", {
                texto: (alvo ? alvo.rotulo : a.alvo) + ": " + U.comSinal(a.valor) +
                       (a.motivo ? " — " + a.motivo : ""),
              }),
              el("button.r-botao.r-botao--mini.r-botao--fantasma", {
                type: "button", texto: "Remover",
                onclick: function () {
                  o.ajustes = o.ajustes.filter(function (x) { return x.id !== a.id; });
                  aoMudarOrdem(ctx);
                },
              }),
            ]);
          }))
        : el("p.t-mini", { texto: "Nenhum ajuste. Os números vêm todos das regras." }),

      ctx.emEdicao()
        ? el("button.r-botao.r-botao--mini", {
            type: "button", texto: "+ Ajuste manual",
            onclick: function () { abrirAjuste(ctx, o); },
          })
        : el("p.t-mini", { texto: "Entre no modo edição para acrescentar um ajuste." }),
    ]);
  }

  function abrirAjuste(ctx, o) {
    var alvo = UI.campo({
      rotulo: "O que ajustar", tipo: "selecao", valor: "defesa",
      opcoes: ALVOS_DE_AJUSTE.map(function (a) { return { valor: a.valor, rotulo: a.rotulo }; }),
    });
    var valor = UI.campo({ rotulo: "Quanto", tipo: "numero", valor: "0", limite: 6 });
    var motivo = UI.campo({
      rotulo: "Motivo", valor: "", limite: 120,
      ajuda: "Por que a mesa decidiu isto. Aparece na composição do número.",
    });

    UI.modal({
      titulo: "Ajuste manual",
      conteudo: el("div.pilha", {}, [
        el("p.t-mini", {
          texto: "Um ajuste sobrevive a qualquer recálculo e aparece marcado como decisão da mesa, " +
                 "separado do que as regras produziram.",
        }),
        alvo, valor, motivo,
      ]),
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        {
          rotulo: "Acrescentar", classe: "r-botao--principal",
          aoClicar: function (fechar) {
            var n = U.inteiro(valor.entrada.value, 0);
            if (!n) { valor.marcarErro("Informe um valor diferente de zero."); return; }
            if (!motivo.entrada.value.trim()) {
              motivo.marcarErro("Escreva o motivo. Um ajuste sem motivo vira mistério na próxima sessão.");
              return;
            }
            o.ajustes.push(R.criarAjuste(alvo.entrada.value, n, motivo.entrada.value.trim()));
            aoMudarOrdem(ctx);
            fechar();
          },
        },
      ],
    });
  }

  /* =================================================================
     PERÍCIAS
     ================================================================= */

  var SecaoPericias = {
    aba: function (ctx) {
      var o = ordemDe(ctx);
      var linhas = C.PERICIAS.map(function (p) { return linhaDePericia(ctx, o, p); });

      return el("div.pilha--larga", { class: "pilha" }, [
        UI.painel("Perícias", el("div.pilha", {}, [
          el("div.ordem-pericias", {}, linhas),
          el("p.t-mini", {
            texto: "Destreinado 0 · Treinado +5 · Veterano +10 · Expert +15. " +
                   "Perícia marcada com “treinada” só pode ser usada por quem é treinado nela.",
          }),
        ])),
      ]);
    },
  };

  function linhaDePericia(ctx, o, p) {
    var bonus = R.bonusDePericia(o, p.chave, ctx.ficha.inventario);
    var dado = R.dadoDePericia(o, p.chave);
    var g = R.grauDaPericia(o, p.chave);
    var destreinada = g === "destreinado";

    var controle = ctx.emEdicao()
      ? UI.campo({
          rotulo: "", tipo: "selecao", valor: g,
          opcoes: C.GRAUS.map(function (x) { return { valor: x.chave, rotulo: x.nome }; }),
          aoMudar: function (v) {
            if (v === "destreinado") delete o.pericias[p.chave];
            else o.pericias[p.chave] = v;
            aoMudarOrdem(ctx);
          },
        })
      : el("span.ordem-pericia__grau", { texto: C.grau(g).nome });

    /* Perícia só-treinada e destreinada não rola: o livro diz que a
       pessoa não tem o conhecimento, não que ela rola com penalidade. */
    var podeRolar = !(p.treinada && destreinada);

    return el("div.ordem-pericia", {
      class: destreinada ? "ordem-pericia--destreinada" : "",
    }, [
      el("span.ordem-pericia__nome", { texto: p.nome }),
      el("span.ordem-pericia__atrib", { texto: siglaDe(p.atributo) }),
      controle,
      el("button.ordem-pericia__bonus", {
        type: "button",
        "aria-label": "Como o bônus de " + p.nome + " foi calculado",
        title: "Ver a composição",
        texto: U.comSinal(bonus.total),
        onclick: function () { abrirComposicao("Bônus de " + p.nome, bonus); },
      }),
      podeRolar
        ? el("button.r-icone.ordem-pericia__rolar", {
            type: "button",
            "aria-label": "Rolar " + p.nome + ", " + dado + " " + U.comSinal(bonus.total),
            title: "Rolar " + dado + " " + U.comSinal(bonus.total),
            onclick: function () { rolarPericia(ctx, o, p, dado, bonus); },
          }, [UI.simbolo("dado", 14)])
        : el("span.ordem-pericia__travada", {
            texto: "só treinada",
            title: "Esta perícia exige treinamento para ser usada.",
          }),
      el("span.ordem-pericia__marcas", {
        texto: [p.carga ? "carga" : "", p.kit ? "kit" : ""].filter(Boolean).join(" · "),
      }),
    ]);
  }

  function rolarPericia(ctx, o, p, dado, bonus) {
    var r = D.dependente({
      dado: dado,
      bonus: bonus.total,
      extras: [],
    });

    if (!r || !r.ok) {
      /* Sem o caminho dependente, o teste é o dado mais o bônus. */
      var simples = D.rolar(dado);
      if (!simples.ok) { UI.avisoErro("Expressão de dado inválida para " + p.nome + "."); return; }
      r = {
        ok: true,
        tipo: "pericia",
        expressao: simples.expressao,
        rolagens: simples.rolagens,
        natural: simples.principal,
        total: simples.principal + bonus.total,
        parcelas: [{ rotulo: "Dado", valor: simples.principal }]
          .concat(bonus.parcelas.map(function (x) { return { rotulo: x.rotulo, valor: x.valor }; })),
      };
    }

    global.RAMARolagens.mostrar(Object.assign({ tipo: "pericia", nome: p.nome }, r), { nome: p.nome });
  }

  /* =================================================================
     PROGRESSÃO
     ================================================================= */

  var SecaoProgressao = {
    aba: function (ctx) {
      var o = ordemDe(ctx);
      var c = calculo(ctx);

      return el("div.pilha--larga", { class: "pilha" }, [
        painelNivel(ctx, o, c),
        painelPendencias(ctx, o, c),
        painelDegraus(ctx, o, c),
      ]);
    },
  };

  function painelNivel(ctx, o, c) {
    var separado = c.trilho.separado;

    var campos = [];

    if (separado) {
      campos.push(UI.campo({
        rotulo: "Nível de experiência", tipo: "numero", valor: String(o.nivel), limite: 2,
        ajuda: "Manda na progressão: PV, PE, Sanidade e habilidades de classe.",
        aoMudar: function (v) {
          o.nivel = Math.max(1, Math.min(20, U.inteiro(v, 1)));
          aoMudarOrdem(ctx);
        },
      }));
      campos.push(UI.campo({
        rotulo: "NEX por exposição (%)", tipo: "numero", valor: String(o.nex), limite: 2,
        ajuda: "Mede só a exposição ao Outro Lado. Vale para poderes paranormais e afinidade elemental.",
        aoMudar: function (v) {
          o.nex = R.nexValido(v);
          aoMudarOrdem(ctx);
        },
      }));
    } else {
      campos.push(UI.campo({
        rotulo: "NEX (%)", tipo: "selecao", valor: String(o.nex),
        opcoes: opcoesDeNex(),
        aoMudar: function (v) { o.nex = R.nexValido(v); aoMudarOrdem(ctx); },
      }));
    }

    campos.push(UI.campo({
      rotulo: "Pontos de prestígio", tipo: "numero", valor: String(o.prestigio), limite: 4,
      ajuda: "A patente vem daqui. Perder PP rebaixa.",
      aoMudar: function (v) { o.prestigio = Math.max(0, U.inteiro(v, 0)); aoMudarOrdem(ctx); },
    }));

    return UI.painel(separado ? "Nível e exposição" : "Exposição paranormal", el("div.pilha", {}, [
      separado
        ? el("p.t-mini", {
            texto: "A regra “NEX & Experiência” está ligada: nível e NEX andam separados. " +
                   "O nível manda na progressão; o NEX mede o contato com o Outro Lado.",
          })
        : null,
      el("div.editar-grade", {}, campos),
      el("dl.r-dados", {}, [
        el("dt", { texto: "Patente" }), el("dd", { texto: c.patente.patente.nome }),
        el("dt", { texto: "Itens por categoria" }),
        el("dd", {
          texto: ["I", "II", "III", "IV"].map(function (cat) {
            return cat + ": " + (c.patente.itens[cat] || 0);
          }).join(" · "),
        }),
      ]),
    ]));
  }

  function opcoesDeNex() {
    var lista = [];
    for (var n = C.REGRAS.nexMinimo; n <= 95; n += C.REGRAS.passoNex) {
      lista.push({ valor: String(n), rotulo: n + "%" });
    }
    lista.push({ valor: "99", rotulo: "99%" });
    return lista;
  }

  /* As escolhas ainda em aberto. Elas NÃO são preenchidas sozinhas e
     não somem sozinhas: ficam aqui até alguém decidir. */
  function painelPendencias(ctx, o, c) {
    var abertas = (o.progressao || []).filter(function (e) { return !e.valor; });

    if (!abertas.length) {
      return UI.painel("Escolhas pendentes",
        el("p.t-mini", { texto: "Nenhuma. Tudo o que este " + c.trilho.rotulo + " abre já foi decidido." }));
    }

    return UI.painel("Escolhas pendentes (" + abertas.length + ")", el("div.pilha", {}, [
      el("p.t-mini", {
        texto: "O R.A.M.A. não decide isto por você. Cada item abaixo é uma escolha que a sua " +
               "progressão abriu e que continua esperando.",
      }),
      el("div.pilha--curta", { class: "pilha" }, abertas.map(function (e) {
        return el("div.ordem-pendencia", {}, [
          el("span.ordem-pendencia__nex", { texto: "NEX " + e.nex + "%" }),
          el("span.ordem-pendencia__rotulo", { texto: e.rotulo || e.tipo }),
          ctx.emEdicao()
            ? el("button.r-botao.r-botao--mini", {
                type: "button", texto: "Resolver",
                onclick: function () { resolverPendencia(ctx, o, e); },
              })
            : null,
        ]);
      })),
    ]));
  }

  function resolverPendencia(ctx, o, e) {
    /* A trilha o sistema sabe resolver: o catálogo tem as cinco de cada
       classe. O resto depende de catálogo de poderes que esta entrega
       ainda não traz — e nesse caso a tela oferece registrar a escolha
       por escrito em vez de fingir uma lista que não existe. */
    if (e.tipo === "trilha") {
      var trilhas = C.trilhasDaClasse(o.classe);
      var m = UI.modal({
        titulo: "Escolher a trilha",
        largo: true,
        conteudo: el("div.criacao-lista", {}, trilhas.map(function (tr) {
          return el("button.criacao-opcao", {
            type: "button",
            onclick: function () {
              o.trilha = tr.chave;
              e.valor = tr.chave;
              aoMudarOrdem(ctx);
              m.fechar();
            },
          }, [
            el("span.criacao-opcao__nome", { texto: tr.nome }),
            el("span.criacao-opcao__texto", { texto: tr.resumo }),
            el("span.criacao-opcao__texto", {
              texto: tr.poderes.map(function (p) { return "NEX " + p.nex + "% " + p.nome; }).join(" · "),
            }),
            el("span.criacao-opcao__fonte", { texto: C.referencia(tr) }),
          ]);
        })),
        botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }],
      });
      return;
    }

    var campo = UI.campo({
      rotulo: e.rotulo || e.tipo, valor: e.valor || "", limite: 120,
      ajuda: "O catálogo de poderes desta escolha ainda não está no R.A.M.A. " +
             "Escreva o que a sua mesa decidiu; a anotação fica registrada na ficha.",
    });

    UI.modal({
      titulo: "Resolver escolha",
      conteudo: el("div.pilha", {}, [
        el("p.t-mini", { texto: "NEX " + e.nex + "% — " + (e.rotulo || e.tipo) }),
        campo,
      ]),
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        {
          rotulo: "Registrar", classe: "r-botao--principal",
          aoClicar: function (fechar) {
            var v = campo.entrada.value.trim();
            if (!v) { campo.marcarErro("Escreva a escolha."); return; }
            e.valor = v;
            aoMudarOrdem(ctx);
            fechar();
          },
        },
      ],
    });
  }

  /* O que cada degrau de progressão entrega, do começo até onde o
     personagem está — e o que vem a seguir. */
  function painelDegraus(ctx, o, c) {
    var progressao = C.progressaoDaClasse(o.classe);
    if (!progressao.length) {
      return UI.painel("Progressão", el("p.t-mini", { texto: "Escolha uma classe para ver a progressão." }));
    }

    return UI.painel("Progressão da classe", el("div.pilha", {}, [
      el("div.ordem-degraus", {}, progressao.map(function (degrau) {
        var alcancado = degrau.nex <= c.trilho.nexEquivalente;
        return el("div.ordem-degrau", {
          class: alcancado ? "ordem-degrau--alcancado" : "",
        }, [
          el("span.ordem-degrau__nex", {
            texto: c.trilho.separado ? "Nv " + (degrau.nex / 5) : degrau.nex + "%",
          }),
          el("span.ordem-degrau__texto", { texto: degrau.rotulos.join(" · ") }),
        ]);
      })),
      el("p.t-mini", {
        texto: c.trilho.separado
          ? "Com nível e NEX separados, os degraus são lidos em nível: 1 nível equivale a 5% de NEX."
          : "Os degraus em destaque são os que este NEX já alcançou.",
      }),
    ]));
  }

  /* =================================================================
     REGRAS OPCIONAIS
     ================================================================= */

  var SecaoRegras = {
    aba: function (ctx) {
      var o = ordemDe(ctx);

      var afetam = OP.REGRAS.filter(function (r) { return r.afetaFicha; });
      var naoAfetam = OP.REGRAS.filter(function (r) { return !r.afetaFicha; });

      return el("div.pilha--larga", { class: "pilha" }, [
        UI.painel("Regras opcionais", el("div.pilha", {}, [
          el("p.t-mini", {
            texto: "Todas do Sobrevivendo ao Horror, e todas começam desligadas — é o que o " +
                   "próprio livro pede. O Livro de Regras continua sendo a versão padrão do jogo.",
          }),
          el("div.pilha--curta", { class: "pilha" }, afetam.map(function (r) {
            return cartaoDeRegra(ctx, o, r);
          })),
        ])),

        UI.painel("Regras de mesa", el("div.pilha", {}, [
          el("p.t-mini", {
            texto: "Estas não mudam campo nem conta da ficha. Ligá-las serve para a mesa " +
                   "registrar que as usa.",
          }),
          el("div.pilha--curta", { class: "pilha" }, naoAfetam.map(function (r) {
            return cartaoDeRegra(ctx, o, r);
          })),
        ])),
      ]);
    },
  };

  function cartaoDeRegra(ctx, o, r) {
    var ligada = OP.ligada(o, r.chave);
    var problemas = OP.conflitos(o, r.chave, true);
    var bloqueada = !ligada && problemas.length > 0;

    var chave = el("button.r-interruptor", {
      type: "button",
      role: "switch",
      "aria-checked": String(ligada),
      "aria-label": (ligada ? "Desligar" : "Ligar") + " " + r.nome,
      disabled: bloqueada,
      class: ligada ? "r-interruptor--ligado" : "",
      onclick: function () { alternarRegra(ctx, o, r, !ligada); },
    }, [el("span.r-interruptor__bola", { "aria-hidden": "true" })]);

    var corpo = [
      el("p.t-mini", { texto: r.resumo }),
      el("p.t-mini", { texto: r.efeito }),
      etiqueta(r.automacao),
      el("p.criacao-fonte", {
        texto: (r.fonte === "SAH" ? "Sobrevivendo ao Horror" : "Ordem Paranormal RPG") + ", p. " + r.pagina,
      }),
    ];

    if (bloqueada) {
      corpo.push(el("p.t-mini.t-erro", { texto: problemas.map(function (p) { return p.texto; }).join(" ") }));
    }

    if (ligada && r.parametros.length) {
      corpo.push(el("div.editar-grade", {}, r.parametros.map(function (par) {
        return UI.campo({
          rotulo: par.rotulo,
          tipo: "numero",
          valor: String(o[par.chave] !== undefined ? o[par.chave] : ""),
          limite: 3,
          ajuda: par.ajuda,
          aoMudar: function (v) {
            var n = U.inteiro(v, par.minimo);
            o[par.chave] = Math.max(par.minimo, Math.min(par.maximo, n));
            aoMudarOrdem(ctx);
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

  async function alternarRegra(ctx, o, r, ligar) {
    var consequencias = OP.consequenciasDe(o, r.chave, ligar);

    /* Nada muda antes de a pessoa ver o que vai mudar. */
    if (consequencias.length) {
      var certeza = await UI.confirmar({
        titulo: (ligar ? "Ligar" : "Desligar") + " “" + r.nome + "”?",
        texto: consequencias[0],
        detalhe: consequencias.slice(1).join(" "),
        rotuloConfirmar: ligar ? "Ligar" : "Desligar",
      });
      if (!certeza) return;
    }

    var resultado = OP.definir(o, r.chave, ligar);

    if (!resultado.ok) {
      UI.avisoErro((resultado.problemas || []).map(function (p) { return p.texto; }).join(" ") ||
        "Não foi possível mudar esta regra.");
      return;
    }

    if (resultado.aviso) UI.aviso(resultado.aviso);
    aoMudarOrdem(ctx);
  }

  /* =================================================================
     AUXILIARES
     ================================================================= */

  /* Uma mudança nas escolhas muda os máximos. Os recursos gastos são
     aparados para baixo quando o máximo cai — e NUNCA repostos quando
     ele sobe. */
  function aoMudarOrdem(ctx) {
    var o = ordemDe(ctx);
    R.aparar(o, {
      pv: R.pontosDeVida(o).total,
      pe: R.pontosDeEsforco(o).total,
      san: R.sanidade(o).total,
    });
    ctx.alterou();
    ctx.redesenhar();
  }

  function etiqueta(automacao) {
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

  global.RAMASecaoOrdemGeral = SecaoGeral;
  global.RAMASecaoOrdemPericias = SecaoPericias;
  global.RAMASecaoOrdemProgressao = SecaoProgressao;
  global.RAMASecaoOrdemRegras = SecaoRegras;
})(window);
