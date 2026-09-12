/* =====================================================================
   R.A.M.A. — ficha de Ordem Paranormal
   =====================================================================
   As seções que só a ficha de Ordem tem: Geral, Perícias, Progressão e
   Regras — e os complementos de Ordem do inventário (carga e
   capacidade) e das habilidades (poderes e habilidades das regras).

   Habilidades, Rituais, Inventário e Anotações são as MESMAS da ficha
   universal. Um ritual é um ritual; duplicar a seção só para trocar o
   cabeçalho seria manter dois códigos iguais e corrigir bug em um só.
   O inventário recebe daqui só o que é de Ordem: espaços, quantidade,
   categoria e a carga.

   ---------------------------------------------------------------------
   CALCULADO, ESCOLHIDO E AJUSTADO SÃO VISUALMENTE DIFERENTES
   ---------------------------------------------------------------------

     valor calculado   tem o símbolo de conta ao lado e abre a
                       composição no clique
     ajuste manual     aparece na composição com o motivo e a marca de
                       ajuste da mesa
     recurso atual     é editável, porque é o que a pessoa gastou

   ---------------------------------------------------------------------
   O QUE ESTA TELA NUNCA FAZ
   ---------------------------------------------------------------------

   Escolher sozinha. Uma pendência aparece com o botão que abre a
   escolha certa, e espera. Uma escolha que deixou de cumprir requisito
   não é apagada: é marcada, com o motivo, e quem joga decide.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var C = global.RAMAOrdemCatalogo;
  var R = global.RAMAOrdemRegras;
  var OP = global.RAMAOrdemOpcionais;
  var E = global.RAMAOrdemProgressao;
  var P = global.RAMAOrdemPoderes;
  var I = global.RAMAOrdemInventario;
  var ES = global.RAMAOrdemEscolhas;
  var D = global.RAMADados;
  var el = U.el;

  function ordemDe(ctx) {
    if (!ctx.ficha.ordem) ctx.ficha.ordem = R.fichaVazia();
    return ctx.ficha.ordem;
  }

  function contextoDe(ctx) {
    return { inventario: ctx.ficha.inventario };
  }

  function rituaisDe(ctx) {
    return (ctx.ficha.rituais && ctx.ficha.rituais.itens) || [];
  }

  function calculo(ctx) {
    return R.calcular(ordemDe(ctx), ctx.ficha.inventario);
  }

  function estadoDe(ctx) {
    return E.estado(ordemDe(ctx), contextoDe(ctx));
  }

  /* =================================================================
     O NÚMERO CALCULADO, COM A CONTA ATRÁS
     ================================================================= */

  function valorCalculado(rotulo, conta, extra) {
    return el("button.calculado", {
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
  }

  function linhasDaComposicao(conta) {
    return conta.parcelas.map(function (p) {
      return el("div.composicao__linha", {
        class: p.origem === "ajuste da mesa" ? "composicao__linha--manual" : "",
      }, [
        el("span.composicao__rotulo", { texto: p.rotulo }),
        el("span.composicao__origem", { texto: p.origem || "" }),
        el("span.composicao__valor", { texto: U.comSinal(p.valor) }),
      ]);
    });
  }

  function abrirComposicao(rotulo, conta, extra) {
    UI.modal({
      titulo: rotulo,
      conteudo: [
        el("p.t-mini", { texto: "De onde vem cada parte deste número." }),
        el("div.composicao", {}, linhasDaComposicao(conta)),
        el("div.composicao__total", {}, [
          el("span", { texto: "Total" }),
          el("span", { texto: String(conta.total) }),
        ]),
        extra || null,
      ],
      botoes: [{ rotulo: "Fechar", classe: "r-botao--principal" }],
    });
  }

  /* =================================================================
     GERAL
     ================================================================= */

  var SecaoGeral = {
    /* O que fica sempre à vista, acima das abas: a foto, os atributos
       que se rolam e os recursos que se gastam. */
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
          avisoDePendencias(ctx, c),
          UI.painel("Atributos", painelAtributosCorpo(ctx, o)),
          UI.painel("Recursos", painelRecursosCorpo(ctx, o, c)),
          UI.painel("Defesa e movimento", painelDerivadosCorpo(ctx, o, c)),
        ]),
      ]);
    },

    /* A aba Geral: quem o personagem é nas regras, as proficiências e
       resistências, e os ajustes da mesa. Os poderes ficam na aba
       Habilidades e a carga na aba Inventário, junto do que eles
       descrevem. */
    aba: function (ctx) {
      var o = ordemDe(ctx);
      var c = calculo(ctx);

      return el("div.pilha--larga", { class: "pilha" }, [
        painelIdentidade(ctx, o, c),
        painelResistencias(ctx, o, c),
        UI.painel("Ajustes da mesa", botaoAjuste(ctx, o, true)),
      ]);
    },
  };

  /* Uma faixa curta, acima dos atributos, quando há decisão esperando.
     Leva direto para a aba onde ela se resolve. */
  function avisoDePendencias(ctx, c) {
    var est = c.estado;
    if (!est) return null;
    var n = est.pendencias.length;
    if (!n) return null;
    return el("div.ordem-aviso-pendencias", { role: "status" }, [
      el("span", { texto: n === 1 ? "1 escolha de progressão esperando decisão." : n + " escolhas de progressão esperando decisão." }),
      el("button.r-botao.r-botao--mini", {
        type: "button", texto: "Ver na Progressão",
        onclick: function () { if (ctx.irParaAba) ctx.irParaAba("progressao"); },
      }),
    ]);
  }

  function identidadeCurta(ctx, o, c) {
    var classe = C.classe(o.classe);
    var origem = C.origem(o.origem);

    return el("dl.r-dados.ficha-identidade__dados", {}, [
      el("dt", { texto: "Classe" }), el("dd", { texto: classe ? classe.nome : "—" }),
      el("dt", { texto: "Origem" }), el("dd", { texto: origem ? origem.nome : "—" }),
      el("dt", { texto: c.trilho.separado ? "Nível" : "NEX" }), el("dd", { texto: c.trilho.curto }),
      el("dt", { texto: "Patente" }), el("dd", { texto: c.patente.aplicada ? c.patente.patente.nome : "não aplicada" }),
    ]);
  }

  function painelIdentidade(ctx, o, c) {
    var classe = C.classe(o.classe);
    var origem = C.origem(o.origem);
    var trilha = C.trilha(o.trilha);
    var est = c.estado;

    var linhas = [
      ["Classe", classe ? classe.nome : "—"],
      ["Origem", origem ? origem.nome : "—"],
      ["Trilha", trilha ? trilha.nome : "—"],
      [c.trilho.separado ? "Nível de experiência" : "NEX", c.trilho.rotulo],
    ];

    if (c.trilho.separado) linhas.push(["NEX por exposição", c.exposicao + "%"]);

    if (est && est.afinidade.gatilho) {
      linhas.push(["Afinidade", textoAfinidade(est.afinidade)]);
    }

    if (c.patente.aplicada) {
      linhas.push(["Patente", c.patente.patente.nome]);
      linhas.push(["Limite de crédito", c.patente.credito + (c.patente.creditoElevado ? " (elevado)" : "")]);
    } else {
      linhas.push(["Patente", "Regra de patente desligada"]);
    }

    var poderDaOrigem = origem
      ? el("div.pilha--curta", { class: "pilha" }, [
          el("p.t-secao", { texto: origem.poder }),
          el("p.t-mini", { texto: origem.resumo }),
          ES.etiquetaAutomacao(origem.automacao),
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

  function textoAfinidade(af) {
    if (!af.escolhida) return af.adiada ? "a decidir (adiada)" : "a decidir";
    var nome = af.homebrew ? af.nomeOutro + " (Homebrew)" : ((C.elemento(af.elemento) || {}).nome || af.elemento);
    return nome + (af.ativa ? " — afinidade desenvolvida" : " — conexão; a afinidade vem ao transcender");
  }

  /* =================================================================
     PODERES E HABILIDADES
     -----------------------------------------------------------------
     Tudo o que o personagem já recebeu: as automáticas da classe, os
     poderes da trilha, os escolhidos. Cada um diz de onde veio, se está
     completo e o que o sistema faz com ele. A lista não tem painel
     próprio: entra na aba Habilidades, na mesma lista das habilidades
     criadas à mão.
     ================================================================= */

  function poderesDasRegras(ctx, o, c) {
    var est = c.estado;
    if (!est || !C.classe(o.classe)) {
      return { itens: [], aviso: "Escolha uma classe na aba Geral para ver as habilidades das regras." };
    }

    var itens = [];

    E.automaticas(o).forEach(function (a) {
      itens.push(itemDePoder({
        nome: a.entrada.nome + (a.estagio ? " · " + a.estagio : ""),
        resumo: a.entrada.resumo,
        origem: "Automática da classe",
        automacao: a.entrada.automacao,
        referencia: P.referencia(a.entrada),
        situacao: "ok",
      }));
    });

    est.adquiridos.forEach(function (a) {
      if (a.tipo === "escolhaPerito") {
        itens.push(itemDePoder({ nome: a.nome, resumo: "As perícias escolhidas para usar com Perito.", origem: "Escolha · " + a.rotuloEtapa, automacao: "informacao", situacao: "ok" }));
        return;
      }
      var e = a.entrada;
      if (!e) {
        itens.push(itemDePoder({ nome: a.nome, resumo: a.resumo || "", origem: "Escolha · " + (a.rotuloEtapa || ""), automacao: a.automacao || "informacao", referencia: a.fonteRef || "", situacao: "ok" }));
        return;
      }
      var situacao = !a.valido ? "suspensa" : (a.completo === false ? "incompleta" : "ok");
      itens.push(itemDePoder({
        nome: a.nome,
        resumo: e.resumo,
        afinidade: a.afinidade && e.afinidade ? e.afinidade : "",
        origem: rotuloDaVia(a) + (a.rotuloEtapa ? " · " + a.rotuloEtapa : ""),
        automacao: e.automacao,
        nota: e.nota,
        referencia: P.referencia(e, o.classe),
        situacao: situacao,
        motivos: a.motivos,
      }));
    });

    return {
      itens: itens,
      aviso: itens.length
        ? "“Entra na conta”: o efeito já está nos números da ficha. “Parte na conta”: uma parte está, o resto é aplicado na cena. “Anotação”: o efeito depende da cena ou de gasto de PE. As que vêm das regras mudam pela aba Progressão."
        : "",
    };
  }

  function rotuloDaVia(a) {
    if (a.via === "trilha") return "Trilha";
    if (a.via === "opcoesBeneficio") return "Trilha";
    if (a.via === "poderClasse") return "Poder de classe";
    if (a.via === "versatilidade") return "Versatilidade";
    if (a.via === "transcenderExposicao") return "Transcender";
    if (a.via === "poderOrigem") return "Origem";
    if (a.via === "alteracao") return "Alteração por NEX";
    return "Escolha";
  }

  function itemDePoder(d) {
    return UI.recolhivel({
      titulo: d.nome,
      extra: d.situacao === "suspensa" ? "suspenso" : (d.situacao === "incompleta" ? "incompleto" : d.origem),
      classe: "ordem-poder ordem-poder--" + d.situacao,
      conteudo: el("div.pilha--curta", { class: "pilha" }, [
        el("p.t-mini", { texto: d.origem }),
        d.resumo ? el("p", { texto: d.resumo }) : null,
        d.afinidade ? el("p.t-mini", { texto: "Com afinidade: " + d.afinidade }) : null,
        ES.etiquetaAutomacao(d.automacao),
        d.nota ? el("p.t-mini", { texto: d.nota }) : null,
        d.situacao === "suspensa" ? el("p.t-mini.t-erro", { texto: "Efeitos suspensos: " + (d.motivos || []).join(" ") }) : null,
        d.situacao === "incompleta" ? el("p.t-mini.t-aviso", { texto: "Incompleto: resolva a opção na aba Progressão. Os efeitos entram depois disso." }) : null,
        d.referencia ? el("p.criacao-fonte", { texto: d.referencia }) : null,
      ]),
    });
  }

  function painelResistencias(ctx, o, c) {
    var r = c.resistencias;
    var linhas = [];
    r.dano.forEach(function (d) {
      linhas.push(el("dt", { texto: "Resistência a " + d.rotulo.toLowerCase() }));
      linhas.push(el("dd", {}, [valorCalculado(d.rotulo, d.conta)]));
    });
    if (r.testes.total) {
      linhas.push(el("dt", { texto: "Testes de resistência" }));
      linhas.push(el("dd", {}, [valorCalculado("Testes de resistência", r.testes)]));
    }
    if (r.testesParanormal.total) {
      linhas.push(el("dt", { texto: "Contra efeitos paranormais" }));
      linhas.push(el("dd", {}, [valorCalculado("Resistência paranormal", r.testesParanormal)]));
    }

    return UI.painel("Proficiências e resistências", el("div.pilha", {}, [
      el("dl.r-dados", {}, [
        el("dt", { texto: "Proficiências" }),
        el("dd", { texto: c.proficiencias.map(function (p) { return p.texto; }).join(", ") || "—" }),
      ].concat(linhas)),
      r.testes.total
        ? el("p.t-mini", { texto: "O bônus em testes de resistência vale quando Fortitude, Reflexos ou Vontade são usados para resistir; por isso não entra no bônus geral dessas perícias." })
        : null,
    ]));
  }

  function painelAtributosCorpo(ctx, o) {
    var grade = el("div.ordem-atributos", {}, C.ATRIBUTOS.map(function (a) {
      var efetivo = R.atributo(o, a.chave);
      var base = R.atributoBase(o, a.chave);
      var expressao = efetivo <= 0 ? "-2d20" : efetivo + "d20";
      var composicao = R.composicaoDoAtributo(o, a.chave);
      var alterado = efetivo !== base;

      return el("div.ordem-atributo", {}, [
        el("span.ordem-atributo__sigla", { texto: a.sigla }),
        ctx.emEdicao()
          ? UI.passo({
              valor: base, minimo: 0, maximo: 5, rotulo: a.nome + " (valor da ficha)",
              aoMudar: function (v) {
                o.atributos[a.chave] = v;
                aoMudarOrdem(ctx);
              },
            })
          : el("button.ordem-atributo__valor", {
              type: "button",
              "aria-label": "Rolar " + a.nome + ", " + expressao,
              title: "Rolar " + expressao,
              texto: String(efetivo),
              onclick: function () { rolarAtributo(ctx, a, expressao); },
            }),
        el("span.ordem-atributo__dado", { texto: ctx.emEdicao() && alterado ? "efetivo " + efetivo : expressao }),
        alterado
          ? el("button.ordem-atributo__conta", {
              type: "button", texto: "conta", "aria-label": "Como " + a.nome + " foi calculado",
              onclick: function () { abrirComposicao(a.nome, composicao); },
            })
          : el("span.ordem-atributo__nome", { texto: a.nome }),
      ]);
    }));

    return el("div.pilha", {}, [
      grade,
      el("p.t-mini", {
        texto: ctx.emEdicao()
          ? "Aqui se edita o valor da ficha (criação e ajustes à mão). Aumentos de atributo escolhidos na Progressão somam por cima, e aparecem em “conta”."
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

  /* Os recursos: o que sobrou. */
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
        el("span", { texto: I.rotuloEspacos(carga.ocupado) + " / " + carga.final + " espaços" }),
        carga.temporario ? el("span.t-mini", { texto: "(" + carga.calculada + " " + U.comSinal(carga.temporario) + " temporário)" }) : null,
        carga.sobrecarregado
          ? el("span.t-erro.t-mini", {
              texto: carga.acimaDoMaximo
                ? "Acima do máximo de " + carga.maximo + " espaços."
                : "Sobrecarregado: −5 Defesa, −5 nas perícias de carga, −3m de deslocamento.",
            })
          : null,
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
     CARGA E CAPACIDADE
     -----------------------------------------------------------------
     "Capacidade calculada + ajuste temporário = capacidade final",
     escrito assim, na tela. O ajuste é um número com sinal que fica
     até alguém mudá-lo ou tirá-lo: nenhuma duração é inventada.
     ================================================================= */

  function painelCarga(ctx, o, c) {
    var carga = c.carga;

    var equacao = el("div.ordem-equacao", { "aria-label": "Composição da capacidade" }, [
      el("span.ordem-equacao__termo", {}, [
        el("span.t-mini", { texto: "Capacidade calculada" }),
        el("button.calculado__valor.ordem-equacao__valor", {
          type: "button", texto: String(carga.calculada), title: "Ver a composição",
          "aria-label": "Capacidade calculada: " + carga.calculada + ". Ver a composição.",
          onclick: function () { abrirComposicao("Capacidade calculada", carga.composicao); },
        }),
      ]),
      el("span.ordem-equacao__sinal", { "aria-hidden": "true", texto: "+" }),
      el("span.ordem-equacao__termo", {}, [
        el("span.t-mini", { texto: "Ajuste temporário" }),
        el("span.ordem-equacao__valor", { texto: U.comSinal(carga.temporario) }),
      ]),
      el("span.ordem-equacao__sinal", { "aria-hidden": "true", texto: "=" }),
      el("span.ordem-equacao__termo", {}, [
        el("span.t-mini", { texto: "Capacidade final" }),
        el("span.ordem-equacao__valor", { texto: String(carga.final) }),
      ]),
    ]);

    var controle = null;
    if (ctx.emEdicao()) {
      var campo = UI.campo({
        rotulo: "Bônus temporário de capacidade (espaços)",
        valor: carga.temporario ? U.comSinal(carga.temporario) : "0",
        limite: 4,
        ajuda: "Com sinal: +5 aumenta, -2 reduz, 0 mantém a calculada. Não mexe na carga dos itens, na Força nem nos limites por categoria.",
        aoMudar: function (v) {
          var r = I.validarAjusteTemporario(v);
          if (!r.ok) { campo.marcarErro(r.mensagem); return; }
          campo.marcarErro("");
          if (!o.temporarios) o.temporarios = { pv: 0, pe: 0, san: 0, defesa: 0, capacidade: 0 };
          o.temporarios.capacidade = r.valor;
          aoMudarOrdem(ctx);
        },
      });
      controle = campo;
    }

    var remover = carga.temporario
      ? el("button.r-botao.r-botao--mini", {
          type: "button", texto: "Remover ajuste temporário",
          onclick: function () {
            o.temporarios.capacidade = 0;
            aoMudarOrdem(ctx);
            UI.aviso("Ajuste temporário removido. A capacidade voltou a " + carga.calculada + ".");
          },
        })
      : null;

    var uso = c.categorias;
    var cats = [0, 1, 2, 3, 4].map(function (n) { return uso.categorias[n]; });

    return UI.painel("Carga e capacidade", el("div.pilha", {}, [
      equacao,
      carga.abaixoDeZero
        ? el("p.t-mini.t-aviso", { texto: "O ajuste temporário levaria a capacidade a " + (carga.calculada + carga.temporario) + ". A capacidade final fica em 0." })
        : null,
      el("div.faixa", {}, [controle, remover]),
      el("dl.r-dados", {}, [
        el("dt", { texto: "Ocupado" }), el("dd", { texto: I.rotuloEspacos(carga.ocupado) + " espaços" }),
        el("dt", { texto: "Sem penalidade até" }), el("dd", { texto: carga.final + " espaços" }),
        el("dt", { texto: "Máximo absoluto" }), el("dd", { texto: carga.maximo + " espaços (o dobro)" }),
      ]),
      carga.sobrecarregado
        ? el("p.t-mini.t-erro", {
            texto: carga.acimaDoMaximo
              ? "Acima do máximo: o personagem não consegue carregar tudo isto (OPRPG p.53)."
              : "Sobrecarregado: −5 Defesa, −5 nas perícias afetadas por carga e −3m de deslocamento (OPRPG p.53).",
          })
        : null,
      el("h4.t-secao", { texto: "Itens por categoria" }),
      el("p.t-mini", {
        texto: uso.aplicada
          ? "Limites da patente. Categoria 0 não tem limite. Cada unidade conta como um item."
          : "Limites definidos pela mesa (a regra de patente está desligada). Cada unidade conta como um item.",
      }),
      el("div.ordem-categorias", {}, cats.map(function (cat) {
        return el("div.ordem-categoria", { class: cat.excedido ? "ordem-categoria--excedida" : "" }, [
          el("span.ordem-categoria__rotulo", { texto: "Cat. " + cat.rotulo }),
          el("span.ordem-categoria__valor", { texto: cat.usados + " / " + (cat.limite === null ? "sem limite" : cat.limite) }),
          cat.excedido ? el("span.t-mini.t-erro", { texto: "acima do limite" }) : null,
        ]);
      })),
      uso.semCategoria.length
        ? el("p.t-mini.t-aviso", { texto: "Sem categoria informada (não contam em nenhum limite): " + uso.semCategoria.map(function (i) { return i.nome; }).join(", ") + "." })
        : null,
      el("p.t-mini", { texto: "Espaços, quantidade e categoria de cada item são editados no próprio item, na lista abaixo." }),
    ]));
  }

  /* =================================================================
     AJUSTE MANUAL
     ================================================================= */

  var ALVOS_DE_AJUSTE = [
    { valor: "pv", rotulo: "Pontos de vida (máximo)" },
    { valor: "pe", rotulo: "Pontos de esforço (máximo)" },
    { valor: "san", rotulo: "Sanidade (máximo)" },
    { valor: "defesa", rotulo: "Defesa" },
    { valor: "deslocamento", rotulo: "Deslocamento" },
    { valor: "limitePe", rotulo: "Limite de PE por turno" },
    { valor: "capacidade", rotulo: "Capacidade de carga (espaços)" },
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
              ctx.emEdicao()
                ? el("button.r-botao.r-botao--mini.r-botao--fantasma", {
                    type: "button", texto: "Remover",
                    onclick: function () {
                      o.ajustes = o.ajustes.filter(function (x) { return x.id !== a.id; });
                      aoMudarOrdem(ctx);
                    },
                  })
                : null,
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
          ctx.emEdicao()
            ? el("p.t-mini", {
                texto: "No modo edição, o seletor muda o grau da ficha (o da criação). Graus ganhos por escolhas de progressão — Grau de Treinamento, Treinamento em Perícia, poderes — somam por cima e aparecem ao lado.",
              })
            : null,
        ])),
      ]);
    },
  };

  function linhaDePericia(ctx, o, p) {
    var bonus = R.bonusDePericia(o, p.chave, ctx.ficha.inventario);
    var dado = R.dadoDePericia(o, p.chave);
    var g = R.grauDaPericia(o, p.chave);
    var base = R.grauBaseDaPericia(o, p.chave);
    var fontes = R.fontesDoGrau(o, p.chave);
    var destreinada = g === "destreinado";
    var atributo = R.atributoDaPericia(o, p.chave);

    var controle = ctx.emEdicao()
      ? el("div.pilha--curta", { class: "pilha" }, [
          UI.campo({
            rotulo: "", tipo: "selecao", valor: base,
            opcoes: C.GRAUS.map(function (x) { return { valor: x.chave, rotulo: x.nome + (x.chave === base ? " (ficha)" : "") }; }),
            aoMudar: function (v) {
              if (v === "destreinado") delete o.pericias[p.chave];
              else o.pericias[p.chave] = v;
              aoMudarOrdem(ctx);
            },
          }),
          fontes.length ? el("span.t-mini", { texto: "efetivo: " + C.grau(g).nome }) : null,
        ])
      : el("span.ordem-pericia__grau", {
          texto: C.grau(g).nome,
          title: fontes.length ? fontes.map(function (f) { return f.fonte + " (" + f.detalhe + ")"; }).join("; ") : "",
        });

    var podeRolar = !(p.treinada && destreinada);

    return el("div.ordem-pericia", {
      class: destreinada ? "ordem-pericia--destreinada" : "",
    }, [
      el("span.ordem-pericia__nome", { texto: p.nome }),
      el("span.ordem-pericia__atrib", { texto: siglaDe(atributo), title: atributo !== p.atributo ? "Atributo trocado por um poder." : "" }),
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
            onclick: function () { rolarPericia(ctx, o, p, dado, bonus, atributo); },
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

  /* A rolagem de perícia usa o motor central — o mesmo `dependente` da
     ficha universal — e o mesmo mostrador, que sobe para o histórico. */
  function rolarPericia(ctx, o, p, dado, bonus, atributo) {
    var r = D.dependente({
      expressao: dado,
      sigla: siglaDe(atributo),
      nome: p.nome,
      bonus: bonus.total,
      modificadores: [],
    });

    if (!r || !r.ok) { UI.avisoErro("Expressão de dado inválida para " + p.nome + "."); return; }

    /* As parcelas do bônus aparecem abertas no resultado: grau, poder,
       penalidade de carga — em vez de um "+15" sem explicação. */
    r.parcelas = [r.parcelas[0]].concat(bonus.parcelas.map(function (x) { return { rotulo: x.rotulo, valor: x.valor }; }));
    global.RAMARolagens.mostrar(Object.assign(r, { tipo: "pericia", nome: p.nome }), { nome: p.nome });
  }

  /* =================================================================
     PROGRESSÃO
     ================================================================= */

  var SecaoProgressao = {
    aba: function (ctx) {
      var o = ordemDe(ctx);
      var c = calculo(ctx);
      var est = estadoDe(ctx);

      return el("div.pilha--larga", { class: "pilha" }, [
        painelNivel(ctx, o, c),
        painelPendencias(ctx, o, c, est),
        painelAfinidade(ctx, o, c, est),
        painelEscolhas(ctx, o, c, est),
        painelForaDaProgressao(ctx, o, est),
        painelLegado(ctx, o, est),
        painelDegraus(ctx, o, c),
      ]);
    },

    /* Chamado uma vez depois de abrir a ficha. Se o personagem chegou a
       NEX 50% e ainda não tem afinidade — e ninguém adiou —, a escolha
       abre sozinha. Nunca a cada recálculo, nunca a cada salvamento. */
    verificarAfinidade: function (ctx) {
      var o = ordemDe(ctx);
      var est = estadoDe(ctx);
      if (!est || !est.afinidade.gatilho || est.afinidade.escolhida || est.afinidade.adiada) return false;
      ES.abrirAfinidade({
        ordem: o,
        contexto: contextoDe(ctx),
        aoConfirmar: function () { aoMudarOrdem(ctx); UI.avisoOk("Afinidade registrada."); },
        aoAdiar: function () { aoMudarOrdem(ctx); UI.aviso("Afinidade adiada. Ela fica na aba Progressão até você decidir."); },
        aoFecharSemDecidir: function () {
          if (!o.afinidade) o.afinidade = { elemento: "", nomeOutro: "", adiada: false };
          o.afinidade.adiada = true;
          aoMudarOrdem(ctx);
        },
      });
      return true;
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
      ajuda: c.patente.aplicada ? "A patente vem daqui. Perder PP rebaixa." : "Guardado. A regra de patente está desligada.",
      aoMudar: function (v) { o.prestigio = Math.max(0, U.inteiro(v, 0)); aoMudarOrdem(ctx); },
    }));

    return UI.painel(separado ? "Nível e exposição" : "Exposição paranormal", el("div.pilha", {}, [
      separado
        ? el("p.t-mini", {
            texto: "A regra “NEX & Experiência” está ligada: nível e NEX andam separados. " +
                   "O nível manda na progressão; o NEX mede o contato com o Outro Lado.",
          })
        : null,
      el("p.t-mini", { texto: "Baixar o NEX não apaga escolha nenhuma: as das etapas acima ficam guardadas, sem efeito, e voltam a valer se o personagem chegar lá de novo." }),
      el("div.editar-grade", {}, campos),
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

  function resolver(ctx, p) {
    var o = ordemDe(ctx);
    ES.abrir({
      ordem: o,
      contexto: contextoDe(ctx),
      rituais: rituaisDe(ctx),
      vagaId: p.id,
      aoRegistrar: function () { aoMudarOrdem(ctx); UI.avisoOk("Escolha registrada."); },
      aoConfirmar: function () { aoMudarOrdem(ctx); UI.avisoOk("Afinidade registrada."); },
      aoAdiar: function () { aoMudarOrdem(ctx); },
    });
  }

  /* As escolhas em aberto, cada uma com o botão que abre a escolha certa.
     Resolver não exige o modo edição: decidir um poder é jogar, não
     mexer na estrutura da ficha. */
  function painelPendencias(ctx, o, c, est) {
    if (!est) return null;
    var lista = est.pendencias;

    if (!C.classe(o.classe)) {
      return UI.painel("Escolhas pendentes", el("p.t-mini", { texto: "Escolha uma classe para ver a progressão." }));
    }

    if (!lista.length) {
      return UI.painel("Escolhas pendentes",
        el("p.t-mini", { texto: "Nenhuma. Tudo o que " + c.trilho.rotulo + " abre já foi decidido." }));
    }

    return UI.painel("Escolhas pendentes (" + lista.length + ")", el("div.pilha", {}, [
      el("p.t-mini", {
        texto: "O R.A.M.A. não decide isto por você. Cada item abre a escolha certa, mostra só as opções que cabem e explica as que não cabem.",
      }),
      el("div.pilha--curta", { class: "pilha" }, lista.map(function (p) {
        return ES.cartaoDePendencia(p, function () { resolver(ctx, p); });
      })),
    ]));
  }

  function painelAfinidade(ctx, o, c, est) {
    if (!est || !est.afinidade.gatilho) return null;
    var af = est.afinidade;

    var linhas = [
      el("p", { texto: textoAfinidade(af) }),
      el("p.t-mini", {
        texto: c.trilho.separado
          ? "Com NEX & Experiência, a afinidade olha o NEX de exposição, não o nível (Sobrevivendo ao Horror, p. 98)."
          : "A conexão acontece em NEX 50%. A afinidade — e os benefícios dela — vêm na primeira vez que o personagem transcende a partir daí (Ordem Paranormal RPG, p. 110 e 114).",
      }),
    ];
    if (af.homebrew) linhas.push(el("p.t-mini", { texto: "Elemento Homebrew: nenhum efeito mecânico é aplicado automaticamente." }));
    if (af.conflito) linhas.push(el("p.t-mini.t-aviso", { texto: af.conflito }));

    if (af.escolhida && ctx.emEdicao()) {
      linhas.push(el("button.r-botao.r-botao--mini", {
        type: "button", texto: "Revisar afinidade",
        onclick: function () {
          ES.abrirAfinidade({
            ordem: o, contexto: contextoDe(ctx),
            aoConfirmar: function () { aoMudarOrdem(ctx); UI.avisoOk("Afinidade atualizada."); },
          });
        },
      }));
    } else if (af.escolhida) {
      linhas.push(el("p.t-mini", { texto: "Para revisar, entre no modo edição." }));
    }

    return UI.painel("Afinidade elemental", el("div.pilha--curta", { class: "pilha" }, linhas));
  }

  /* As escolhas feitas, na ordem das etapas. No modo edição, cada uma
     pode ser revisada; as que perderam requisito mostram o motivo e
     deixam a mesa manter mesmo assim. */
  function painelEscolhas(ctx, o, c, est) {
    if (!est) return null;
    var vagas = est.vagas;
    var registros = (o.escolhas || []).filter(function (r) {
      var a = est.avaliacoes[r.id];
      return a && a.vaga;
    }).sort(function (a, b) {
      return est.avaliacoes[a.id].vaga.ordem - est.avaliacoes[b.id].vaga.ordem;
    });

    var trilha = C.trilha(o.trilha);
    var vagaTrilha = vagas.filter(function (v) { return v.tipo === "trilha"; })[0];

    var itens = [];

    /* A trilha não é um registro — ela mora em `ordem.trilha` —, mas é
       uma escolha feita, e entra na lista na posição da etapa dela. */
    if (trilha && vagaTrilha) {
      itens.push({ ordem: vagaTrilha.ordem, elemento: linhaDeEscolha({
        etapa: vagaTrilha.rotuloEtapa,
        rotulo: "Trilha",
        descricao: trilha.nome,
        situacao: est.pendencias.some(function (p) { return p.id === vagaTrilha.id; }) ? "invalida" : "ok",
        motivos: (est.pendencias.filter(function (p) { return p.id === vagaTrilha.id; })[0] || {}).motivos || [],
        acoes: ctx.emEdicao() ? [botaoRevisar("Revisar", function () { resolver(ctx, { id: vagaTrilha.id }); }, false, "Trilha, " + vagaTrilha.rotuloEtapa)] : [],
      }) });
    }

    registros.forEach(function (r) {
      var a = est.avaliacoes[r.id];
      var v = a.vaga;
      var situacao = a.mantidaPelaMesa ? "mantida" : (!a.valido ? "invalida" : (!a.completo ? "incompleta" : "ok"));
      var acoes = [];
      var contextoAria = v.rotulo + ", " + v.rotuloEtapa;
      if (ctx.emEdicao()) {
        acoes.push(botaoRevisar("Revisar", function () { resolver(ctx, { id: v.id }); }, false, contextoAria));
        if (situacao === "invalida" && a.completo) {
          acoes.push(botaoRevisar("Manter mesmo assim", function () {
            E.definirIgnorarRequisitos(o, r.id, true);
            aoMudarOrdem(ctx);
            UI.aviso("A escolha vale por decisão da mesa. Os problemas continuam listados.");
          }));
        }
        if (situacao === "mantida") {
          acoes.push(botaoRevisar("Voltar a exigir os requisitos", function () {
            E.definirIgnorarRequisitos(o, r.id, false);
            aoMudarOrdem(ctx);
          }));
        }
        acoes.push(botaoRevisar("Desfazer", function () { desfazer(ctx, o, r, v); }, true, contextoAria));
      }
      itens.push({ ordem: v.ordem, elemento: linhaDeEscolha({
        etapa: v.rotuloEtapa,
        rotulo: v.rotulo,
        descricao: E.descrever(o, r) || r.nome || "—",
        situacao: situacao,
        motivos: a.motivos,
        faltam: a.faltam,
        acoes: acoes,
      }) });
    });

    itens.sort(function (a, b) { return a.ordem - b.ordem; });

    return UI.painel("Escolhas feitas", el("div.pilha", {}, [
      itens.length
        ? el("div.pilha--curta", { class: "pilha" }, itens.map(function (x) { return x.elemento; }))
        : el("p.t-mini", { texto: "Nenhuma escolha registrada ainda." }),
      ctx.emEdicao()
        ? el("p.t-mini", { texto: "Revisar troca só esta escolha: os efeitos dela saem, os da nova entram, e os ajustes da mesa ficam. A tela mostra antes o que muda." })
        : el("p.t-mini", { texto: "Para revisar uma escolha feita, entre no modo edição." }),
    ]));
  }

  function botaoRevisar(rotulo, aoClicar, perigo, contexto) {
    return el("button.r-botao.r-botao--mini", {
      type: "button", texto: rotulo, class: perigo ? "r-botao--fantasma" : "", onclick: aoClicar,
      "aria-label": contexto ? rotulo + ": " + contexto : null,
    });
  }

  function linhaDeEscolha(d) {
    var rotuloSituacao = {
      ok: "", incompleta: "incompleta", invalida: "requisito não cumprido", mantida: "mantida pela mesa",
    }[d.situacao];
    return el("div.ordem-escolha", { dataset: { situacao: d.situacao } }, [
      el("span.ordem-pendencia__nex", { texto: d.etapa }),
      el("div.ordem-pendencia__corpo", {}, [
        el("span.ordem-escolha__rotulo", { texto: d.rotulo + ": " + d.descricao }),
        rotuloSituacao ? el("span.etiqueta", { texto: rotuloSituacao }) : null,
        (d.motivos && d.motivos.length) ? el("span.t-mini" + (d.situacao === "mantida" ? "" : ".t-erro"), { texto: d.motivos.join(" ") }) : null,
        (d.faltam && d.faltam.length) ? el("span.t-mini.t-aviso", { texto: "Falta: " + d.faltam.join("; ") + "." }) : null,
      ]),
      d.acoes && d.acoes.length ? el("div.faixa", {}, d.acoes) : null,
    ]);
  }

  async function desfazer(ctx, o, r, v) {
    var antes = E.estado(o, contextoDe(ctx));
    var copia = JSON.parse(JSON.stringify(o));
    E.remover(copia, r.id);
    var depois = E.estado(copia, contextoDe(ctx));
    var afetados = [];
    Object.keys(depois.avaliacoes).forEach(function (id) {
      var a = antes.avaliacoes[id];
      var d = depois.avaliacoes[id];
      if (a && a.valido && d && !d.valido) {
        var x = (o.escolhas || []).filter(function (e) { return e.id === id; })[0];
        afetados.push(x ? x.nome : "uma escolha");
      }
    });

    var certeza = await UI.confirmar({
      titulo: "Desfazer esta escolha?",
      texto: v.rotulo + " em " + v.rotuloEtapa + " volta a ficar pendente, e só os efeitos dela saem da ficha.",
      detalhe: afetados.length
        ? "Isto faz outras escolhas deixarem de cumprir requisito: " + afetados.join(", ") + ". Elas não são apagadas; ficam marcadas."
        : "Nenhuma outra escolha é afetada.",
      rotuloConfirmar: "Desfazer",
    });
    if (!certeza) return;

    E.remover(o, r.id);
    aoMudarOrdem(ctx);
  }

  /* Escolhas guardadas de etapas que o personagem não alcança mais. */
  function painelForaDaProgressao(ctx, o, est) {
    if (!est || !est.fora.length) return null;
    return UI.painel("Escolhas guardadas fora da progressão atual", el("div.pilha--curta", { class: "pilha" }, [
      el("p.t-mini", { texto: "Nada aqui tem efeito agora. Nada foi apagado." }),
    ].concat(est.fora.map(function (f) {
      return linhaDeEscolha({
        etapa: f.registro.etapa,
        rotulo: f.registro.nome || f.registro.tipo,
        descricao: "",
        situacao: "invalida",
        motivos: f.motivos,
        acoes: ctx.emEdicao() ? [botaoRevisar("Descartar", async function () {
          var ok = await UI.confirmar({
            titulo: "Descartar esta escolha guardada?",
            texto: "Ela sai da ficha de vez. Hoje ela não tem efeito nenhum.",
            rotuloConfirmar: "Descartar",
            perigo: true,
          });
          if (!ok) return;
          E.remover(o, f.registro.id);
          aoMudarOrdem(ctx);
        }, true)] : [],
      });
    }))));
  }

  /* Os registros de texto livre da v2.3. Contam como decisão tomada — a
     pessoa escreveu o que decidiu — e podem ser trocados por uma
     escolha do catálogo quando ela quiser. */
  function painelLegado(ctx, o, est) {
    if (!est || !est.legado.length) return null;
    return UI.painel("Registros escritos à mão", el("div.pilha--curta", { class: "pilha" }, [
      el("p.t-mini", {
        texto: "Anotações de versões anteriores do R.A.M.A., quando o catálogo de poderes ainda não existia. Elas contam como escolha feita, mas não têm efeito na conta. Escolher pelo catálogo substitui a anotação para os cálculos; o texto continua guardado.",
      }),
    ].concat(est.legado.map(function (l) {
      return linhaDeEscolha({
        etapa: "NEX " + l.nex + "%",
        rotulo: l.rotulo,
        descricao: "“" + l.texto + "”",
        situacao: "ok",
        acoes: [botaoRevisar("Escolher pelo catálogo", function () { resolver(ctx, { id: l.id }); })],
      });
    }))));
  }

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
            texto: c.trilho.separado ? "Nv " + E.degrauDoNex(degrau.nex) : degrau.nex + "%",
          }),
          el("span.ordem-degrau__texto", { texto: degrau.rotulos.join(" · ") }),
        ]);
      })),
      el("p.t-mini", {
        texto: c.trilho.separado
          ? "Com nível e NEX separados, os degraus são lidos em nível: 1 nível equivale a 5% de NEX."
          : "Os degraus em destaque são os que este NEX já alcançou. As habilidades de trilha chegam sozinhas; só a trilha em si é escolhida.",
      }),
    ]));
  }

  /* =================================================================
     REGRAS
     ================================================================= */

  var SecaoRegras = {
    aba: function (ctx) {
      var o = ordemDe(ctx);

      var afetam = OP.REGRAS.filter(function (r) { return r.afetaFicha; });
      var naoAfetam = OP.REGRAS.filter(function (r) { return !r.afetaFicha; });

      return el("div.pilha--larga", { class: "pilha" }, [
        painelConfiguracao(ctx, o),

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

  /* A chave "Aplicar regras de patente" e, com ela desligada, os
     limites manuais por categoria. */
  function painelConfiguracao(ctx, o) {
    var aplicada = R.regraDePatente(o);
    var pat = R.patente(o);

    var chave = el("button.r-interruptor", {
      type: "button",
      role: "switch",
      "aria-checked": String(aplicada),
      "aria-label": (aplicada ? "Desligar" : "Ligar") + " as regras de patente",
      class: aplicada ? "r-interruptor--ligado" : "",
      onclick: function () { alternarPatente(ctx, o, !aplicada); },
    }, [el("span.r-interruptor__bola", { "aria-hidden": "true" })]);

    var corpo = [
      el("p.t-mini", {
        texto: "Ligada, a patente sai dos pontos de prestígio e controla o limite de crédito e o limite de itens por categoria (Ordem Paranormal RPG, p. 51-53). Desligada, nenhum dos três é calculado: os limites por categoria passam a ser os que a mesa definir.",
      }),
      el("p.t-mini", { texto: "Alternar a chave não apaga item nenhum e não perde os limites manuais, que ficam guardados para a próxima vez." }),
    ];

    var cats = [0, 1, 2, 3, 4];

    if (aplicada) {
      corpo.push(el("dl.r-dados", {}, [
        el("dt", { texto: "Patente" }), el("dd", { texto: pat.patente.nome + " (" + pat.prestigio + " PP)" }),
        el("dt", { texto: "Limite de crédito" }), el("dd", { texto: pat.credito + (pat.creditoElevado ? " (elevado)" : "") }),
        el("dt", { texto: "Itens por categoria" }),
        el("dd", { texto: cats.map(function (n) {
          var l = pat.limites[n].limite;
          return C.CATEGORIAS_ITEM[n].rotulo + ": " + (l === null ? "sem limite" : l);
        }).join(" · ") }),
        el("dt", { texto: "Origem dos limites" }), el("dd", { texto: "Tabela 3.1, " + pat.patente.nome + " — Ordem Paranormal RPG, p. 52" }),
      ]));
    } else {
      var limites = pat.limites;
      if (ctx.emEdicao()) {
        corpo.push(el("div.ordem-limites", {}, cats.map(function (n) {
          return controleDeLimite(ctx, o, n, limites[n].limite);
        })));
        corpo.push(el("p.t-mini", { texto: "“Sem limite” é diferente de 0: 0 quer dizer que nenhum item daquela categoria é permitido." }));
      } else {
        corpo.push(el("dl.r-dados", {}, [
          el("dt", { texto: "Itens por categoria (definidos pela mesa)" }),
          el("dd", { texto: cats.map(function (n) {
            var l = limites[n].limite;
            return C.CATEGORIAS_ITEM[n].rotulo + ": " + (l === null ? "sem limite" : l);
          }).join(" · ") }),
        ]));
        corpo.push(el("p.t-mini", { texto: "Entre no modo edição para mudar os limites." }));
      }
    }

    return UI.painel("Configuração da ficha", el("div.ordem-regra" + (aplicada ? ".ordem-regra--ligada" : ""), {}, [
      el("div.ordem-regra__topo", {}, [
        el("span.ordem-regra__nome", { texto: "Aplicar regras de patente" }),
        chave,
      ]),
      el("div.pilha--curta", { class: "pilha" }, corpo),
    ]));
  }

  function controleDeLimite(ctx, o, n, atual) {
    var rotulo = "Categoria " + C.CATEGORIAS_ITEM[n].rotulo;
    var semLimite = atual === null;
    var campo = UI.campo({
      rotulo: rotulo, tipo: "numero", valor: semLimite ? "" : String(atual), limite: 2,
      desabilitado: semLimite,
      aoMudar: function (v) {
        var r = I.validarLimite(v, false);
        if (!r.ok) { campo.marcarErro(r.mensagem); return; }
        campo.marcarErro("");
        gravarLimite(ctx, o, n, r.valor);
      },
    });
    var marca = el("label.r-marca", {}, [
      el("input", {
        type: "checkbox", checked: semLimite,
        onchange: function (ev) { gravarLimite(ctx, o, n, ev.target.checked ? null : 0); },
      }),
      el("span", { texto: "sem limite" }),
    ]);
    return el("div.ordem-limite", {}, [campo, marca]);
  }

  function gravarLimite(ctx, o, n, valor) {
    if (!o.patente) o.patente = { aplicar: false, limites: null };
    if (!o.patente.limites) o.patente.limites = R.limitesDaTabela(o);
    o.patente.limites[String(n)] = valor;
    aoMudarOrdem(ctx);
  }

  async function alternarPatente(ctx, o, aplicar) {
    var certeza = await UI.confirmar({
      titulo: (aplicar ? "Ligar" : "Desligar") + " as regras de patente?",
      texto: aplicar
        ? "A patente volta a sair dos pontos de prestígio, com o limite de crédito e os limites de itens da Tabela 3.1."
        : "A patente, o limite de crédito e os limites da Tabela 3.1 deixam de ser calculados. Os limites por categoria passam a ser os definidos pela mesa.",
      detalhe: "Nenhum item é apagado. " + (aplicar
        ? "Os limites manuais ficam guardados para quando a regra for desligada de novo."
        : (o.patente && o.patente.limites ? "Os limites manuais guardados antes voltam a valer." : "Os limites manuais começam iguais aos da patente atual.")),
      rotuloConfirmar: aplicar ? "Ligar" : "Desligar",
    });
    if (!certeza) return;
    var r = R.definirRegraDePatente(o, aplicar);
    if (r.aviso) UI.aviso(r.aviso);
    aoMudarOrdem(ctx);
  }

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
      ES.etiquetaAutomacao(r.automacao),
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
     INVENTÁRIO — o complemento de Ordem
     -----------------------------------------------------------------
     A seção de inventário é a universal. Numa ficha de Ordem ela pede a
     este objeto o que é de Ordem: o cabeçalho de carga, os campos de
     espaços, quantidade, categoria e grupo, e as linhas de detalhe.
     ================================================================= */

  var SecaoInventarioOrdem = {
    /* No lugar do peso, o painel inteiro de carga e capacidade: a conta,
       o ajuste temporário e os itens por categoria, logo acima dos itens
       que eles contam. */
    cabecalho: function (ctx) {
      return painelCarga(ctx, ordemDe(ctx), calculo(ctx));
    },

    /* Mochila é peso; Ordem não usa peso. Uma mochila de verdade em
       Ordem é um item com "aumenta a capacidade". */
    tiposPermitidos: ["item", "arma", "armadura"],

    resumoDoCartao: function (item) {
      var d = I.dadosDoItem(item);
      var e = I.espacosDoItem(item);
      var partes = [];
      partes.push(I.rotuloEspacos(e.unitario) + " esp." + (e.padrao ? " (padrão)" : ""));
      if (d.quantidade > 1) partes.push("×" + d.quantidade);
      partes.push("cat. " + I.rotuloCategoria(d.categoria));
      return partes.join(" · ");
    },

    detalhes: function (ctx, item) {
      var o = ordemDe(ctx);
      var d = I.dadosDoItem(item);
      var e = I.espacosDoItem(item);
      var ocupacao = R.ocupacaoDoInventario(o, ctx.ficha.inventario).itens.filter(function (x) { return x.id === item.id; })[0];
      var uso = R.usoPorCategoria(o, ctx.ficha.inventario);
      var naCategoria = null;
      [0, 1, 2, 3, 4].forEach(function (n) {
        uso.categorias[n].itens.forEach(function (x) { if (x.id === item.id) naCategoria = x; });
      });

      var linhas = [
        ["Espaços por unidade", I.rotuloEspacos(e.unitario) + (e.padrao ? " (padrão do livro)" : "")],
        ["Quantidade", String(d.quantidade)],
        ["Ocupa no total", ocupacao ? I.rotuloEspacos(ocupacao.total) + (ocupacao.notas.length ? " — " + ocupacao.notas.join("; ") : "") : "—"],
        ["Categoria", I.rotuloCategoria(d.categoria) +
          (naCategoria && naCategoria.efetiva !== naCategoria.base
            ? " → " + I.rotuloCategoria(naCategoria.efetiva) + " (" + naCategoria.reducoes.map(function (r) { return r.fonte; }).join(", ") + ")"
            : "")],
        ["Grupo", (I.GRUPOS.filter(function (g) { return g.valor === d.grupo; })[0] || {}).rotulo || d.grupo],
      ];
      if (d.capacidade) linhas.push(["Aumenta a capacidade", "+" + d.capacidade + " espaços"]);
      return linhas;
    },

    campos: function (ctx, atual) {
      var d = I.dadosDoItem(atual);

      var espacos = UI.campo({
        rotulo: "Espaços por unidade", valor: d.espacos === null ? "" : String(d.espacos).replace(".", ","), limite: 5,
        dica: String(I.espacosPadrao(atual.tipo)),
        ajuda: "Vazio usa o padrão do livro: 1 espaço. Duas mãos e proteção leve: 2. Proteção pesada: 5. Aceita 0,5.",
      });
      var quantidade = UI.campo({
        rotulo: "Quantidade", valor: String(d.quantidade), limite: 3,
        ajuda: "Unidades deste item. Cada unidade conta contra o limite da categoria.",
      });
      var categoria = UI.campo({
        rotulo: "Categoria (0 a IV)", tipo: "selecao", valor: d.categoria === null ? "" : String(d.categoria),
        opcoes: [{ valor: "", rotulo: "Não informada" }].concat(C.CATEGORIAS_ITEM.map(function (c) {
          return { valor: String(c.valor), rotulo: "Categoria " + c.rotulo };
        })),
        ajuda: "A categoria do livro, antes de qualquer redução por habilidade.",
      });
      var grupo = UI.campo({
        rotulo: "Grupo", tipo: "selecao", valor: d.grupo,
        opcoes: I.GRUPOS.map(function (g) { return { valor: g.valor, rotulo: g.rotulo }; }),
        ajuda: "Usado por habilidades como Remendão (equipamento geral) e Ferramentas Paranormais (item paranormal).",
      });
      var capacidade = UI.campo({
        rotulo: "Aumenta a capacidade em (espaços)", valor: String(d.capacidade || 0), limite: 2,
        ajuda: "Para itens como a Mochila Militar (+2). Conta uma vez por item.",
      });

      return {
        elementos: [
          el("h4.t-secao", { texto: "Ordem Paranormal" }),
          el("div.editar-grade", {}, [espacos, quantidade]),
          el("div.editar-grade", {}, [categoria, grupo]),
          capacidade,
        ],
        coletar: function () {
          var ok = true;
          var rE = I.validarEspacos(espacos.entrada.value);
          espacos.marcarErro(rE.ok ? "" : rE.mensagem); if (!rE.ok) ok = false;
          var rQ = I.validarQuantidade(quantidade.entrada.value);
          quantidade.marcarErro(rQ.ok ? "" : rQ.mensagem); if (!rQ.ok) ok = false;
          var rC = I.validarCapacidadeItem(capacidade.entrada.value);
          capacidade.marcarErro(rC.ok ? "" : rC.mensagem); if (!rC.ok) ok = false;
          if (!ok) return null;
          return {
            espacos: rE.valor,
            quantidade: rQ.valor,
            categoria: categoria.entrada.value === "" ? null : parseInt(categoria.entrada.value, 10),
            grupo: grupo.entrada.value,
            capacidade: rC.valor,
          };
        },
      };
    },
  };

  /* =================================================================
     HABILIDADES — o complemento de Ordem
     -----------------------------------------------------------------
     A aba Habilidades é a universal, com a árvore de habilidades que a
     mesa cria à mão. Numa ficha de Ordem a MESMA lista abre com o que as
     regras entregaram: habilidades automáticas, poderes da trilha e
     poderes escolhidos na Progressão. Um painel só, sem separar.
     ================================================================= */

  var SecaoHabilidadesOrdem = {
    aba: function (ctx) {
      return global.RAMASecaoHabilidades.aba(ctx, poderesDasRegras(ctx, ordemDe(ctx), calculo(ctx)));
    },
  };

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

  function siglaDe(chave) {
    var a = C.ATRIBUTOS.filter(function (x) { return x.chave === chave; })[0];
    return a ? a.sigla : chave;
  }

  global.RAMASecaoOrdemGeral = SecaoGeral;
  global.RAMASecaoOrdemPericias = SecaoPericias;
  global.RAMASecaoOrdemProgressao = SecaoProgressao;
  global.RAMASecaoOrdemRegras = SecaoRegras;
  global.RAMASecaoOrdemInventario = SecaoInventarioOrdem;
  global.RAMASecaoOrdemHabilidades = SecaoHabilidadesOrdem;
})(window);
