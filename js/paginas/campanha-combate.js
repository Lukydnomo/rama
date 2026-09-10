/* =====================================================================
   R.A.M.A. — campanha · combate
   ---------------------------------------------------------------------
   O combate fica salvo na planilha, e não na memória da aba: recarregar
   a página, fechar o navegador ou abrir em outro computador tem de
   encontrar o combate onde ele estava.

   As criaturas entram como SNAPSHOT. Duas ocorrências do mesmo modelo
   são dois estados independentes — "Existido #1" pode estar ferido
   enquanto "Existido #2" está inteiro —, e editar o modelo na
   biblioteca depois não mexe em combate nenhum já montado.

   A iniciativa é DIGITADA, não sorteada. O sistema ordena do maior
   para o menor e mantém estável quem empata: dois participantes com 14
   não trocam de lugar a cada vez que alguém digita outro número.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var el = U.el;

  global.RAMACampanhaCombate = {
    aba: function (ctx) {
      var caixa = el("div.pilha--larga", { class: "pilha" }, [UI.carregando("Consultando combates")]);

      async function carregar() {
        var r = await global.RAMAApi.listarCombates(ctx.campanhaId);
        if (!r.ok) { U.trocar(caixa, UI.erroDeTela(r, carregar)); return; }

        U.trocar(caixa, [
          ctx.ehMestre()
            ? el("div.faixa", {}, [
                el("button.r-botao.r-botao--principal", {
                  type: "button", texto: "+ Novo combate",
                  onclick: function () { criar(ctx, carregar); },
                }),
              ])
            : null,

          r.dados.length
            ? el("div.pilha--curta", { class: "pilha" },
                r.dados.map(function (c) { return cartao(ctx, c, carregar); }))
            : UI.vazio({
                titulo: "Nenhum combate",
                texto: ctx.ehMestre()
                  ? "Monte um combate, acrescente criaturas e defina a ordem quando ele começar."
                  : "O mestre ainda não liberou nenhum combate para você.",
                acao: ctx.ehMestre()
                  ? { rotulo: "+ Novo combate", aoClicar: function () { criar(ctx, carregar); } }
                  : null,
              }),
        ]);
      }

      carregar();
      return caixa;
    },
  };

  /* =================================================================
     O CARTÃO DE UM COMBATE
     ================================================================= */

  function cartao(ctx, combate, recarregar) {
    /* A ordenação é estável: quem empata mantém a posição relativa em
       vez de pular de lugar a cada digitação. */
    var participantes = combate.participantes.slice()
      .map(function (p, i) { return { p: p, i: i }; })
      .sort(function (a, b) {
        return (U.inteiro(b.p.ordem, 0) - U.inteiro(a.p.ordem, 0)) || (a.i - b.i);
      })
      .map(function (x) { return x.p; });

    var corpo = el("div.pilha--curta", { class: "pilha" });

    function pintar() {
      U.trocar(corpo, [
        el("div.iniciativa", {}, participantes.map(function (p, posicao) {
          return linha(ctx, combate, p, posicao, pintar, recarregar);
        })),

        ctx.ehMestre() ? el("div.faixa", {}, [
          el("button.r-botao.r-botao--mini", {
            type: "button", texto: "+ Criatura",
            onclick: function () { escolherCriatura(ctx, combate, recarregar); },
          }),
          el("button.r-botao.r-botao--mini", {
            type: "button", texto: "+ Personagens da mesa",
            onclick: function () { acrescentarPersonagens(ctx, combate, recarregar); },
          }),
          combate.estado === "preparando"
            ? el("button.r-botao.r-botao--principal.r-botao--mini", {
                type: "button", texto: "Iniciar combate",
                onclick: function () { trocarEstado(ctx, combate, "ativo", recarregar); },
              })
            : null,
          combate.estado === "ativo"
            ? el("button.r-botao.r-botao--mini", {
                type: "button", texto: "Encerrar",
                onclick: function () { trocarEstado(ctx, combate, "encerrado", recarregar); },
              })
            : null,
        ]) : null,
      ]);
    }

    pintar();

    var acoes = ctx.ehMestre() ? [
      UI.menu([
        { rotulo: "Quem pode ver", aoClicar: function () { permissoes(ctx, combate, recarregar); } },
        { rotulo: "Renomear", aoClicar: function () { renomear(ctx, combate, recarregar); } },
        "separador",
        { rotulo: "Excluir combate", perigo: true, aoClicar: function () { excluir(ctx, combate, recarregar); } },
      ], { rotulo: "Opções de " + combate.nome, icone: "tresPontos" }),
    ] : null;

    var rotuloEstado = {
      preparando: "Em preparação", ativo: "Em andamento", encerrado: "Encerrado",
    }[combate.estado] || combate.estado;

    return UI.recolhivel({
      titulo: combate.nome,
      extra: rotuloEstado + " · " + participantes.length + " participante(s)",
      aberto: combate.estado === "ativo",
      conteudo: [corpo],
      acoes: acoes,
    });
  }

  function linha(ctx, combate, p, posicao, pintar, recarregar) {
    var campo = el("input.r-entrada.r-entrada--numero.iniciativa__numero", {
      type: "text", inputmode: "numeric",
      value: String(U.inteiro(p.ordem, 0)),
      "aria-label": "Iniciativa de " + p.nome,
      disabled: !ctx.ehMestre(),
    });

    /* Reordena ao SAIR do campo, e não a cada tecla: reordenar durante a
       digitação faria a linha fugir de baixo do cursor. */
    function aplicar() {
      var novo = U.inteiro(campo.value, U.inteiro(p.ordem, 0));
      if (novo === U.inteiro(p.ordem, 0)) return;
      p.ordem = novo;
      salvar(ctx, combate, recarregar, true);
      pintar();
    }

    campo.addEventListener("blur", aplicar);
    campo.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") { ev.preventDefault(); campo.blur(); }
    });

    return el("div.iniciativa__linha", { class: p.tipo === "criatura" ? "iniciativa__linha--criatura" : "" }, [
      el("span.iniciativa__posicao", { texto: String(posicao + 1) }),
      campo,
      el("span.iniciativa__nome", { texto: p.nome }),
      el("span.r-etiqueta", { texto: p.tipo === "criatura" ? "Criatura" : "Personagem" }),

      /* O snapshot só existe para o mestre: o servidor não manda a ficha
         interna da criatura para o jogador. */
      ctx.ehMestre() && p.tipo === "criatura" && p.snapshot
        ? el("button.r-botao.r-botao--mini.r-botao--fantasma", {
            type: "button", texto: "Ficha",
            onclick: function () { verCriatura(ctx, p); },
          })
        : null,

      ctx.ehMestre()
        ? el("button.r-icone", {
            type: "button", "aria-label": "Remover " + p.nome,
            onclick: function () {
              combate.participantes = combate.participantes.filter(function (x) { return x.id !== p.id; });
              salvar(ctx, combate, recarregar);
            },
          }, [UI.simbolo("x")])
        : null,
    ]);
  }

  /* =================================================================
     GRAVAÇÃO
     ================================================================= */

  var timerSalvar = null;

  function salvar(ctx, combate, recarregar, comAtraso) {
    clearTimeout(timerSalvar);

    /* Digitar iniciativa dispara muitas alterações seguidas; o atraso
       junta tudo num POST só, como o salvamento da ficha faz. */
    timerSalvar = setTimeout(async function () {
      var r = await global.RAMAApi.salvarCombate(ctx.campanhaId, {
        id: combate.id,
        nome: combate.nome,
        estado: combate.estado,
        visiveis: combate.visiveis || [],
        participantes: combate.participantes,
      }, combate.rev);

      if (r.ok) { combate.rev = U.inteiro(r.rev, combate.rev); return; }

      if (r.erro === "conflito") {
        UI.avisoAtencao("Este combate mudou em outro lugar. Recarregando.");
        recarregar();
        return;
      }

      UI.avisoDeFalha(r, "gravação do combate");
    }, comAtraso ? 500 : 0);
  }

  async function trocarEstado(ctx, combate, estado, recarregar) {
    combate.estado = estado;
    salvar(ctx, combate, recarregar);
    UI.avisoOk(estado === "ativo" ? "Combate iniciado." : "Combate encerrado.");
    setTimeout(recarregar, 700);
  }

  function criar(ctx, recarregar) {
    UI.pedirTexto({
      titulo: "Novo combate", rotulo: "Nome", valor: "Combate", limite: 120,
    }).then(async function (nome) {
      if (nome === null) return;

      var r = await global.RAMAApi.salvarCombate(ctx.campanhaId, {
        nome: nome || "Combate", estado: "preparando", visiveis: [], participantes: [],
      });

      if (!r.ok) { UI.avisoDeFalha(r, "criação do combate"); return; }
      recarregar();
    });
  }

  function renomear(ctx, combate, recarregar) {
    UI.pedirTexto({
      titulo: "Renomear combate", rotulo: "Nome", valor: combate.nome, limite: 120,
    }).then(function (nome) {
      if (nome === null) return;
      combate.nome = nome || combate.nome;
      salvar(ctx, combate, recarregar);
      setTimeout(recarregar, 400);
    });
  }

  async function excluir(ctx, combate, recarregar) {
    var certeza = await UI.confirmar({
      titulo: "Excluir " + combate.nome + "?",
      texto: "O combate e as criaturas dentro dele serão removidos.",
      detalhe: "Os modelos na biblioteca continuam intactos.",
      rotuloConfirmar: "Excluir", perigo: true,
    });
    if (!certeza) return;

    var r = await global.RAMAApi.excluirCombate(ctx.campanhaId, combate.id);
    if (!r.ok) { UI.avisoDeFalha(r, "exclusão"); return; }
    recarregar();
  }

  /* =================================================================
     PARTICIPANTES
     ================================================================= */

  function acrescentarPersonagens(ctx, combate, recarregar) {
    var jaDentro = {};
    combate.participantes.forEach(function (p) {
      if (p.tipo === "personagem") jaDentro[p.personagemId] = true;
    });

    var faltando = ctx.personagens.filter(function (p) { return !jaDentro[p.id]; });

    if (!faltando.length) {
      UI.avisoAtencao("Todos os personagens da mesa já estão no combate.");
      return;
    }

    faltando.forEach(function (p) {
      combate.participantes.push({
        id: U.uuid(), tipo: "personagem", personagemId: p.id, nome: p.nome, ordem: 0,
      });
    });

    salvar(ctx, combate, recarregar);
    setTimeout(recarregar, 400);
  }

  async function escolherCriatura(ctx, combate, recarregar) {
    var aviso = UI.aviso("Consultando criaturas…", { duracao: 30000 });

    var r = await global.RAMAApi.listarHomebrew({ escopo: "todos", tipo: "criatura" });
    aviso();

    if (!r.ok) { UI.avisoDeFalha(r, "leitura das criaturas"); return; }

    var criaturas = r.dados || [];

    if (!criaturas.length) {
      UI.modal({
        titulo: "Nenhuma criatura disponível",
        conteudo: [
          el("p", { texto: "Você ainda não criou criaturas, e nenhuma foi publicada por outras contas." }),
          el("p.t-mini", { texto: "Crie criaturas na aba Homebrew. Elas podem ser privadas (só suas) ou públicas." }),
        ],
        botoes: [
          { rotulo: "Ir para Homebrew", classe: "r-botao--principal",
            aoClicar: function () { location.href = U.url("homebrew/"); } },
          { rotulo: "Fechar", classe: "r-botao--fantasma" },
        ],
      });
      return;
    }

    var m = UI.modal({
      titulo: "Acrescentar criatura",
      largo: true,
      conteudo: [
        el("div.pilha--curta", { class: "pilha" }, criaturas.map(function (c) {
          return el("button.r-cartao", {
            type: "button",
            estilo: { textAlign: "left", width: "100%", cursor: "pointer" },
            onclick: function () { trazerCriatura(ctx, combate, c, recarregar); m.fechar(); },
          }, [
            el("div.faixa.faixa--entre", {}, [
              el("span.t-forte", { texto: c.nome }),
              el("span.r-etiqueta", { texto: c.meu ? "Sua" : "Pública" }),
            ]),
            el("p.t-mini", {
              texto: (c.status || []).map(function (s) { return s.nome + " " + s.maximo; }).join(" · ") || "Sem status",
            }),
          ]);
        })),
        el("p.t-mini", {
          texto: "A criatura entra como cópia independente. Acrescente a mesma quantas vezes precisar — cada uma terá o próprio estado.",
        }),
      ],
      botoes: [{ rotulo: "Fechar", classe: "r-botao--fantasma" }],
    });
  }

  function trazerCriatura(ctx, combate, modelo, recarregar) {
    /* Quantas dessa mesma criatura já estão aqui: a numeração continua
       de onde parou, então #1 e #2 convivem sem se confundir. */
    var quantas = combate.participantes.filter(function (p) {
      return p.tipo === "criatura" && p.origemId === modelo.id;
    }).length;

    var participante = global.RAMACriaturas.paraCombate(modelo, quantas + 1);
    combate.participantes.push(participante);

    salvar(ctx, combate, recarregar);
    setTimeout(recarregar, 400);
    UI.avisoOk(participante.nome + " entrou no combate.");
  }

  function permissoes(ctx, combate, recarregar) {
    var escolhidos = {};
    (combate.visiveis || []).forEach(function (id) { escolhidos[id] = true; });

    var eu = global.RAMAAuth.agente();
    var candidatos = ctx.membros.filter(function (m) { return m.id !== (eu && eu.id); });

    UI.modal({
      titulo: "Quem vê " + combate.nome,
      conteudo: el("div.pilha", {}, [
        candidatos.length
          ? el("div.pilha--curta", { class: "pilha" }, candidatos.map(function (m) {
              return el("label.r-marca", {}, [
                el("input", {
                  type: "checkbox", checked: !!escolhidos[m.id],
                  onchange: function (ev) {
                    if (ev.target.checked) escolhidos[m.id] = true;
                    else delete escolhidos[m.id];
                  },
                }),
                el("span", { texto: m.nome }),
              ]);
            }))
          : el("p.t-mini", { texto: "Nenhum outro participante na campanha." }),
        el("p.t-mini", {
          texto: "Quem tiver acesso vê a lista e a ordem. A ficha interna das criaturas continua só com você — o servidor não a envia.",
        }),
      ]),
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        {
          rotulo: "Salvar", classe: "r-botao--principal",
          aoClicar: function (fechar) {
            combate.visiveis = Object.keys(escolhidos);
            salvar(ctx, combate, recarregar);
            fechar();
            setTimeout(recarregar, 400);
          },
        },
      ],
    });
  }

  /* =================================================================
     FICHA DA CRIATURA NO COMBATE
     ================================================================= */

  function verCriatura(ctx, participante) {
    var c = global.RAMACriaturas.normalizar(participante.snapshot);

    var corpo = el("div.pilha", {}, [
      c.descricao ? el("p", { texto: c.descricao }) : null,

      c.status.length ? UI.painel("Status", el("div.painel-numeros", {}, c.status.map(function (s) {
        return el("div.painel-numero", {}, [
          el("span.t-rotulo", { texto: s.nome + " / " + s.maximo }),
          UI.passo({
            valor: s.atual, minimo: -9999, maximo: s.maximo > 0 ? s.maximo : 999999,
            rotulo: s.nome,
            /* O estado da criatura é do COMBATE, não do modelo: mexer
               aqui não toca na biblioteca. */
            aoMudar: function (v) {
              s.atual = v;
              participante.snapshot = c;
            },
          }),
        ]);
      }))) : null,

      c.atributos.length ? UI.painel("Atributos", el("div.atributos", {}, c.atributos.map(function (a) {
        return el("div.atributo", {}, [
          el("button.atributo__caixa", {
            type: "button",
            "aria-label": "Rolar " + a.nome,
            onclick: function () { rolarDaCriatura(ctx, participante, a.nome, a.dado); },
          }, [
            el("span.atributo__sigla", { texto: a.sigla }),
            el("span.atributo__valor", { texto: String(a.valor) }),
            el("span.atributo__dado", { texto: a.dado }),
          ]),
        ]);
      }))) : null,

      c.pericias.length ? UI.painel("Perícias", el("div.pericias", {}, c.pericias.map(function (p) {
        return el("button.pericia", {
          type: "button",
          onclick: function () {
            var r = global.RAMADados.dependente(global.RAMACriaturas.pedidoDePericia(c, p));
            mostrarRolagem(ctx, participante, p.nome, r);
          },
        }, [
          el("span.pericia__nome", { texto: p.nome }),
          el("span.pericia__bonus", { texto: U.comSinal(p.bonus + p.bonusTemporario) }),
        ]);
      }))) : null,

      c.ataques.length ? UI.painel("Ataques", el("div.pilha--curta", { class: "pilha" }, c.ataques.map(function (a) {
        return el("div.item", {}, [
          el("p.item__nome", { texto: a.nome }),
          el("dl.r-dados", {}, [
            el("dt", { texto: "Dano" }),
            el("dd", { texto: (a.dano || "—") + (a.danoExtra ? " + " + a.danoExtra : "") }),
            el("dt", { texto: "Crítico" }),
            el("dd", { texto: a.critico ? a.critico + " / x" + a.multiplicador : "—" }),
          ]),
          el("div.item__acoes", {}, [
            el("button.r-botao.r-botao--mini", {
              type: "button", texto: "Ataque",
              onclick: function () {
                var r = global.RAMADados.dependente(global.RAMACriaturas.pedidoDeAtaque(c, a));
                var critico = global.RAMADados.ehCritico(r.natural, a.critico);
                mostrarRolagem(ctx, participante, a.nome + " · Ataque", r, critico);
              },
            }),
            el("button.r-botao.r-botao--mini", {
              type: "button", texto: "Dano", disabled: !a.dano,
              onclick: function () {
                var r = global.RAMADados.dano({
                  nome: a.nome, dano: a.dano, danoExtra: a.danoExtra,
                  critico: false, multiplicador: a.multiplicador,
                });
                mostrarRolagem(ctx, participante, a.nome + " · Dano", r);
              },
            }),
          ]),
        ]);
      }))) : null,

      c.habilidades.length ? UI.painel("Habilidades",
        el("div.pilha--curta", { class: "pilha" }, c.habilidades.map(function (h) {
          return UI.recolhivel({ titulo: h.nome, extra: h.origem, conteudo: [el("p", { texto: h.texto })] });
        }))
      ) : null,
    ]);

    UI.modal({ titulo: participante.nome, largo: true, conteudo: corpo,
      botoes: [{ rotulo: "Fechar", classe: "r-botao--fantasma" }] });
  }

  function rolarDaCriatura(ctx, participante, nome, dado) {
    var r = global.RAMADados.rolar(dado);
    if (!r.ok) { UI.avisoErro("Dado inválido: " + dado); return; }
    mostrarRolagem(ctx, participante, nome, {
      tipo: "atributo", expressao: r.expressao, rolagens: r.rolagens,
      natural: r.principal, total: r.principal, parcelas: [],
    });
  }

  /* A rolagem da criatura usa o MESMO motor e o MESMO registro de
     histórico das fichas. O que muda é só o autor: ela é do mestre, e
     portanto obedece à configuração de visibilidade da campanha —
     decidida no servidor, não aqui. */
  async function mostrarRolagem(ctx, participante, nome, r, critico) {
    UI.modal({
      titulo: nome,
      conteudo: [
        el("p.rolagem__total", { texto: String(r.total !== undefined ? r.total : r.natural) }),
        el("p.t-mini", {
          texto: r.expressao + " · [" + (r.rolagens || []).join(", ") + "]" +
                 (critico ? " · CRÍTICO" : ""),
        }),
      ],
      botoes: [{ rotulo: "Fechar", classe: "r-botao--principal" }],
    });

    await global.RAMAApi.registrarRolagem(ctx.campanhaId, {
      id: "rol-" + U.uuid(),
      personagemId: "",
      tipo: "criatura",
      nome: participante.nome + " · " + nome,
      dados: {
        expressao: r.expressao || "", rolagens: r.rolagens || [],
        natural: r.natural !== undefined ? r.natural : null,
        total: r.total !== undefined ? r.total : null,
        parcelas: r.parcelas || [], critico: !!critico,
      },
    });
  }
})(window);
