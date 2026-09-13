/* =====================================================================
   R.A.M.A. — campanha · seções
   ---------------------------------------------------------------------
   Rolagens, documentos e notas do mestre (Personagens tem arquivo
   próprio: js/paginas/campanha-personagens.js). Cada uma recebe
   o mesmo `ctx` da casca e não conhece nem API nem permissão: quando
   `ctx.ehMestre()` é falso, os controles administrativos simplesmente
   não são montados — e o servidor recusa de qualquer forma.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var el = U.el;

  /* A aba Personagens mora em js/paginas/campanha-personagens.js. */

  /* =================================================================
     ROLAGENS
     ================================================================= */

  global.RAMACampanhaRolagens = {
    aba: function (ctx) {
      var lista = el("div.pilha--curta", { class: "pilha" }, [UI.carregando("Consultando histórico")]);
      var estado = { pulo: 0, total: 0, fim: false, linhas: [] };

      async function carregar(maisUma) {
        if (!maisUma) { estado.pulo = 0; estado.linhas = []; }

        var r = await global.RAMAApi.listarRolagens(ctx.campanhaId, { pulo: estado.pulo, limite: 25 });
        if (!r.ok) { U.trocar(lista, UI.erroDeTela(r, function () { carregar(false); })); return; }

        estado.linhas = estado.linhas.concat(r.dados.rolagens);
        estado.total = r.dados.total;
        estado.fim = r.dados.fim;
        estado.pulo = estado.linhas.length;

        pintar();
      }

      function pintar() {
        U.trocar(lista, [
          estado.linhas.length
            ? el("div.pilha--curta", { class: "pilha" }, estado.linhas.map(linhaDeRolagem))
            : UI.vazio({
                titulo: "Nenhuma rolagem ainda",
                texto: "As rolagens feitas nas fichas vinculadas a esta campanha aparecem aqui.",
              }),

          /* Nada de baixar milhares de linhas de uma vez: o histórico
             cresce sem teto e a tela pede mais quando precisar. */
          !estado.fim
            ? el("button.r-botao.r-botao--bloco", {
                type: "button",
                texto: "Carregar mais (" + (estado.total - estado.linhas.length) + " restantes)",
                onclick: function () { carregar(true); },
              })
            : null,
        ]);
      }

      carregar(false);

      return el("div.pilha--larga", { class: "pilha" }, [
        ctx.ehMestre() ? rolagemLivre(ctx, function () { carregar(false); }) : null,

        UI.painel("Histórico", lista, {
          acoes: ctx.ehMestre() ? [
            el("button.r-botao.r-botao--mini.r-botao--perigo", {
              type: "button", texto: "Limpar",
              onclick: async function () {
                var certeza = await UI.confirmar({
                  titulo: "Limpar o histórico?",
                  texto: "Todas as rolagens desta campanha serão apagadas.",
                  detalhe: "Só desta campanha. Esta ação não pode ser desfeita.",
                  rotuloConfirmar: "Limpar", perigo: true,
                });
                if (!certeza) return;
                var r = await global.RAMAApi.limparRolagens(ctx.campanhaId);
                if (!r.ok) { UI.avisoDeFalha(r, "limpeza"); return; }
                UI.avisoOk("Histórico limpo.");
                carregar(false);
              },
            }),
          ] : null,
        }),

        !ctx.ehMestre() && ctx.campanha.rolagensMestreOcultas
          ? el("p.t-mini", { texto: "O mestre está rolando em segredo nesta campanha. As rolagens dele não aparecem aqui." })
          : null,
      ]);
    },
  };

  function linhaDeRolagem(r) {
    var res = r.resultado || {};
    var faces = (res.rolagens || []).join(", ");

    return el("div.rolagem-linha", { class: r.oculta ? "rolagem-linha--oculta" : "" }, [
      el("div.rolagem-linha__topo", {}, [
        el("span.t-forte", { texto: r.nome || "Rolagem" }),
        el("span.rolagem-linha__total", { texto: String(res.total !== null && res.total !== undefined ? res.total : "—") }),
      ]),
      el("p.t-mini", {
        texto: [r.autor, res.expressao, faces ? "[" + faces + "]" : "", U.horaCurta(r.criadoEm)]
          .filter(Boolean).join(" · "),
      }),
      r.oculta ? el("span.r-etiqueta.r-etiqueta--para", { texto: "Oculta" }) : null,
    ]);
  }

  /* A rolagem livre usa EXATAMENTE o mesmo motor da ficha. Não existe
     um segundo interpretador de expressão no sistema. */
  function rolagemLivre(ctx, aoRolar) {
    var campo = UI.campo({
      rotulo: "Expressão", valor: "1d20", limite: 12,
      ajuda: "Qualquer coisa que o motor aceite: 1d20, 2d20, -2d20, 3d6…",
    });

    var saida = el("div.rolagem-livre__saida");

    async function rolar() {
      var v = global.RAMAValidacao.dado(campo.entrada.value);
      if (!v.ok) { campo.marcarErro(v.mensagem); return; }
      campo.marcarErro("");

      var r = global.RAMADados.rolar(v.valor);

      U.trocar(saida, [
        el("p.rolagem-livre__total", { texto: String(r.principal) }),
        el("p.t-mini", { texto: r.expressao + " · [" + r.rolagens.join(", ") + "]" }),
      ]);

      /* Registrada UMA vez, com o resultado que já apareceu na tela.
         Se a gravação falhar, o histórico central repete o ENVIO — nunca
         o sorteio. */
      var id = "rol-" + U.uuid();
      var g = await global.RAMAApi.registrarRolagem(ctx.campanhaId, {
        id: id, personagemId: "", tipo: "livre", nome: "Rolagem livre",
        dados: {
          expressao: r.expressao, rolagens: r.rolagens,
          natural: r.principal, total: r.principal, selecao: r.selecao, parcelas: [],
        },
      });

      if (!g.ok) UI.avisoAtencao("A rolagem saiu, mas não entrou no histórico.");
      else if (aoRolar) aoRolar();
    }

    campo.entrada.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") { ev.preventDefault(); rolar(); }
    });

    return UI.painel("Rolagem livre", el("div.pilha--curta", { class: "pilha" }, [
      el("div.faixa", {}, [
        el("div", { estilo: { flex: "1", minWidth: "140px" } }, [campo]),
        el("button.r-botao.r-botao--principal", { type: "button", texto: "Rolar", onclick: rolar }),
      ]),
      saida,
      ctx.campanha.rolagensMestreOcultas
        ? el("p.t-mini.t-aviso", { texto: "Modo oculto: esta rolagem não chegará aos jogadores." })
        : el("p.t-mini", { texto: "Modo visível: esta rolagem aparecerá no histórico dos jogadores." }),
    ]));
  }

  /* =================================================================
     DOCUMENTOS
     ================================================================= */

  global.RAMACampanhaDocumentos = {
    aba: function (ctx) {
      var lista = el("div.pilha--curta", { class: "pilha" }, [UI.carregando("Consultando documentos")]);

      async function carregar() {
        var r = await global.RAMAApi.listarDocumentos(ctx.campanhaId);
        if (!r.ok) { U.trocar(lista, UI.erroDeTela(r, carregar)); return; }

        U.trocar(lista, r.dados.length
          ? r.dados.map(function (d) { return cartaoDeDocumento(ctx, d, carregar); })
          : UI.vazio({
              titulo: "Nenhum documento",
              texto: ctx.ehMestre()
                ? "Crie documentos e escolha exatamente quem pode vê-los."
                : "O mestre ainda não liberou nenhum documento para você.",
            })
        );
      }

      carregar();

      return UI.painel("Documentos", lista, {
        acoes: ctx.ehMestre() ? [
          el("button.r-botao.r-botao--mini", {
            type: "button", texto: "+ Documento",
            onclick: function () { editarDocumento(ctx, null, carregar); },
          }),
        ] : null,
      });
    },
  };

  function cartaoDeDocumento(ctx, d, recarregar) {
    var corpo = el("div.pilha--curta", { class: "pilha" }, [
      d.descricao ? el("p", { texto: d.descricao, estilo: { whiteSpace: "pre-wrap" } }) : null,
      el("div.documento__imagem", {}, [el("p.t-mini", { texto: "Carregando imagem…" })]),
    ]);

    var imagemCaixa = U.$(".documento__imagem", corpo);

    global.RAMAApi.lerImagemDocumento(ctx.campanhaId, d.id).then(function (r) {
      if (!r.ok || !r.dados.imagem) { U.trocar(imagemCaixa, []); return; }
      U.trocar(imagemCaixa, el("img", {
        src: r.dados.imagem,
        alt: "Imagem de " + d.nome,
        estilo: { maxWidth: "100%", border: "1px solid var(--cor-traco-fraca)" },
      }));
    });

    var acoes = ctx.ehMestre() ? [
      UI.menu([
        { rotulo: "Editar", aoClicar: function () { editarDocumento(ctx, d, recarregar); } },
        { rotulo: "Trocar imagem", aoClicar: function () { trocarImagem(ctx, d, recarregar); } },
        "separador",
        { rotulo: "Excluir", perigo: true, aoClicar: async function () {
          var certeza = await UI.confirmar({
            titulo: "Excluir " + d.nome + "?",
            texto: "O documento e a imagem dele serão removidos.",
            rotuloConfirmar: "Excluir", perigo: true,
          });
          if (!certeza) return;
          var r = await global.RAMAApi.excluirDocumento(ctx.campanhaId, d.id);
          if (!r.ok) { UI.avisoDeFalha(r, "exclusão"); return; }
          recarregar();
        } },
      ], { rotulo: "Opções de " + d.nome, icone: "tresPontos" }),
    ] : null;

    return UI.recolhivel({
      titulo: d.nome,
      extra: ctx.ehMestre()
        ? ((d.visiveis || []).length ? (d.visiveis || []).length + " com acesso" : "só você")
        : "",
      conteudo: [corpo],
      acoes: acoes,
    });
  }

  function editarDocumento(ctx, documento, recarregar) {
    var criando = !documento;
    var nome = UI.campo({ rotulo: "Nome", valor: criando ? "" : documento.nome, limite: 120 });
    var descricao = UI.campo({
      rotulo: "Descrição", tipo: "area", linhas: 6, limite: 8000,
      valor: criando ? "" : documento.descricao,
    });

    var escolhidos = {};
    ((!criando && documento.visiveis) || []).forEach(function (id) { escolhidos[id] = true; });

    var eu = global.RAMAAuth.agente();
    var candidatos = ctx.membros.filter(function (m) { return m.id !== (eu && eu.id); });

    var permissoes = candidatos.length
      ? candidatos.map(function (m) {
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
        })
      : [el("p.t-mini", { texto: "Nenhum outro participante na campanha." })];

    UI.modal({
      titulo: criando ? "Novo documento" : "Editar documento",
      largo: true,
      conteudo: el("div.pilha", {}, [
        nome,
        descricao,
        el("div.r-campo", {}, [
          el("span.r-rotulo", { texto: "Quem pode ver" }),
          el("div.pilha--curta", { class: "pilha" }, permissoes),
          el("p.r-ajuda", {
            texto: "Ninguém marcado quer dizer NINGUÉM além de você. Quem não estiver marcado não recebe título, descrição nem imagem — a resposta do servidor nem inclui o documento.",
          }),
        ]),
      ]),
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        {
          rotulo: criando ? "Criar" : "Salvar", classe: "r-botao--principal",
          aoClicar: async function (fechar) {
            var valor = nome.entrada.value.trim();
            if (!valor) { nome.marcarErro("Informe um nome."); return; }

            var r = await global.RAMAApi.salvarDocumento(ctx.campanhaId, {
              id: criando ? null : documento.id,
              nome: valor,
              descricao: descricao.entrada.value,
              visiveis: Object.keys(escolhidos),
            }, criando ? null : documento.rev);

            if (!r.ok) { UI.avisoDeFalha(r, "gravação do documento"); return; }
            fechar();
            recarregar();
          },
        },
      ],
    });

    nome.entrada.focus();
  }

  async function trocarImagem(ctx, documento, recarregar) {
    var img = await global.RAMAImagem.escolher({ lado: 1024, quadrado: false });
    if (!img.ok) {
      if (img.erro !== "cancelado") UI.avisoErro(img.mensagem || "Não foi possível usar esta imagem.");
      return;
    }

    var aviso = UI.aviso("Enviando imagem…", { duracao: 30000 });
    var r = await global.RAMAApi.salvarImagemDocumento(ctx.campanhaId, documento.id, img.imagem);
    aviso();

    if (!r.ok) { UI.avisoDeFalha(r, "envio da imagem"); return; }
    UI.avisoOk("Imagem atualizada.");
    recarregar();
  }

  /* =================================================================
     NOTAS DO MESTRE
     -----------------------------------------------------------------
     Esta aba só é montada para o mestre — e o servidor recusa a ação a
     qualquer outro papel, de modo que o conteúdo nunca sai da planilha
     para o navegador errado.
     ================================================================= */

  global.RAMACampanhaNotas = {
    aba: function (ctx) {
      var lista = el("div.pilha--curta", { class: "pilha" }, [UI.carregando("Consultando notas")]);

      async function carregar() {
        var r = await global.RAMAApi.listarNotasMestre(ctx.campanhaId);
        if (!r.ok) { U.trocar(lista, UI.erroDeTela(r, carregar)); return; }

        var gerais = r.dados.filter(function (n) { return !n.personagemId; });
        var porPersonagem = r.dados.filter(function (n) { return n.personagemId; });

        U.trocar(lista, [
          el("p.t-rotulo", { texto: "Gerais da campanha" }),
          gerais.length
            ? el("div.pilha--curta", { class: "pilha" }, gerais.map(function (n) { return cartaoDeNota(ctx, n, carregar); }))
            : el("p.t-mini", { texto: "Nenhuma nota geral." }),

          el("p.t-rotulo", { texto: "Sobre personagens" }),
          porPersonagem.length
            ? el("div.pilha--curta", { class: "pilha" }, porPersonagem.map(function (n) { return cartaoDeNota(ctx, n, carregar); }))
            : el("p.t-mini", { texto: "Nenhuma nota ligada a personagem." }),
        ]);
      }

      carregar();

      return UI.painel("Notas do mestre", el("div.pilha--curta", { class: "pilha" }, [
        el("p.t-mini", {
          texto: "Privadas. Nenhum jogador consegue listar, abrir, buscar ou descobrir a existência destas notas.",
        }),
        lista,
      ]), {
        acoes: [
          el("button.r-botao.r-botao--mini", {
            type: "button", texto: "+ Nota",
            onclick: function () { editarNota(ctx, null, carregar); },
          }),
        ],
      });
    },
  };

  function cartaoDeNota(ctx, n, recarregar) {
    var personagem = ctx.personagens.filter(function (p) { return p.id === n.personagemId; })[0];

    return UI.recolhivel({
      titulo: n.titulo,
      extra: personagem ? personagem.nome : (n.pasta || ""),
      conteudo: [
        el("p", { texto: n.conteudo || "Sem conteúdo.", estilo: { whiteSpace: "pre-wrap" } }),
        el("p.t-mini", { texto: "Atualizada " + U.dataHora(n.atualizadoEm) }),
      ],
      acoes: [
        UI.menu([
          { rotulo: "Editar", aoClicar: function () { editarNota(ctx, n, recarregar); } },
          "separador",
          { rotulo: "Excluir", perigo: true, aoClicar: async function () {
            var certeza = await UI.confirmar({
              titulo: "Excluir " + n.titulo + "?",
              texto: "A nota será removida.",
              rotuloConfirmar: "Excluir", perigo: true,
            });
            if (!certeza) return;
            var r = await global.RAMAApi.excluirNotaMestre(ctx.campanhaId, n.id);
            if (!r.ok) { UI.avisoDeFalha(r, "exclusão"); return; }
            recarregar();
          } },
        ], { rotulo: "Opções da nota", icone: "tresPontos" }),
      ],
    });
  }

  function editarNota(ctx, nota, recarregar) {
    var criando = !nota;

    var titulo = UI.campo({ rotulo: "Título", valor: criando ? "" : nota.titulo, limite: 160 });
    var pasta = UI.campo({
      rotulo: "Pasta", valor: criando ? "" : nota.pasta, limite: 80,
      ajuda: "Opcional, para agrupar.",
    });
    var conteudo = UI.campo({
      rotulo: "Conteúdo", tipo: "area", linhas: 10, limite: 20000,
      valor: criando ? "" : nota.conteudo,
    });

    var personagem = UI.campo({
      rotulo: "Sobre o personagem",
      tipo: "selecao",
      valor: criando ? "" : (nota.personagemId || ""),
      opcoes: [{ valor: "", rotulo: "Nota geral da campanha" }].concat(
        ctx.personagens.map(function (p) { return { valor: p.id, rotulo: p.nome }; })
      ),
    });

    UI.modal({
      titulo: criando ? "Nova nota" : "Editar nota",
      largo: true,
      conteudo: el("div.pilha", {}, [
        titulo,
        el("div.editar-grade", {}, [personagem, pasta]),
        conteudo,
      ]),
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        {
          rotulo: criando ? "Criar" : "Salvar", classe: "r-botao--principal",
          aoClicar: async function (fechar) {
            var valor = titulo.entrada.value.trim();
            if (!valor) { titulo.marcarErro("Informe um título."); return; }

            var r = await global.RAMAApi.salvarNotaMestre(ctx.campanhaId, {
              id: criando ? null : nota.id,
              titulo: valor,
              pasta: pasta.entrada.value.trim(),
              conteudo: conteudo.entrada.value,
              personagemId: personagem.entrada.value || "",
            });

            if (!r.ok) { UI.avisoDeFalha(r, "gravação da nota"); return; }
            fechar();
            recarregar();
          },
        },
      ],
    });

    titulo.entrada.focus();
  }
})(window);
