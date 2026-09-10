/* =====================================================================
   R.A.M.A. — ficha · rituais
   ---------------------------------------------------------------------
   Rituais, magias, técnicas, poderes — o NOME da seção é da mesa, e a
   estrutura é a mesma.

   Duas coisas que esta seção faz e que valem a explicação:

   1. O nome da seção e os rótulos dos cinco campos são configuráveis,
      mas as CHAVES internas não mudam nunca. Trocar "Círculo" por
      "Nível" reescreve o que a tela mostra, não o que está gravado —
      então nenhum ritual precisa ser migrado, e nada se perde.

   2. Os rótulos pertencem à SEÇÃO. Um ritual não carrega os próprios
      nomes de campo: se carregasse, dois rituais da mesma ficha
      poderiam chamar a mesma coisa de dois jeitos.

   Ritual é informação, como habilidade: no modo normal ele abre e
   fecha, e não rola nada.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var F = global.RAMAFicha;
  var el = U.el;

  function rotulo(ctx) {
    return ctx.ficha.rituais.rotuloSecao || "Rituais";
  }

  function aba(ctx) {
    var rituais = ctx.ficha.rituais;

    return el("div.pilha--larga", { class: "pilha" }, [
      UI.painel(rotulo(ctx), corpo(ctx), {
        acoes: ctx.emEdicao() ? [
          el("button.r-botao.r-botao--mini", {
            type: "button", texto: "+ Novo", onclick: function () { editar(ctx, null); },
          }),
          el("button.r-botao.r-botao--mini", {
            type: "button", texto: "Rótulos", onclick: function () { configurar(ctx); },
          }),
        ] : null,
      }),
    ]);
  }

  function corpo(ctx) {
    var rituais = ctx.ficha.rituais;

    if (!rituais.itens.length) {
      return UI.vazio({
        titulo: "Nenhum registro em " + rotulo(ctx).toLowerCase(),
        texto: ctx.emEdicao()
          ? "Acrescente o primeiro. Se a sua mesa chama isto de outra coisa, o nome da seção e o de cada campo podem ser trocados em Rótulos."
          : "Entre no modo edição para acrescentar.",
        acao: ctx.emEdicao()
          ? { rotulo: "+ Novo", aoClicar: function () { editar(ctx, null); } }
          : null,
      });
    }

    return el("div.pilha--curta", { class: "pilha" },
      rituais.itens.map(function (r) { return cartao(ctx, r); }));
  }

  function cartao(ctx, ritual) {
    var rotulos = ctx.ficha.rituais.rotulos;

    /* Só campo preenchido aparece: uma lista de cinco rótulos com
       travessão do lado é ruído, não informação. */
    var linhas = [];
    F.CAMPOS_RITUAL.forEach(function (campo) {
      var valor = U.texto(ritual[campo]).trim();
      if (!valor) return;
      linhas.push(el("dt", { texto: rotulos[campo] }));
      linhas.push(el("dd", { texto: valor }));
    });

    var acoes = ctx.emEdicao() ? [
      UI.menu([
        { rotulo: "Editar", aoClicar: function () { editar(ctx, ritual); } },
        { rotulo: "Duplicar", aoClicar: function () { duplicar(ctx, ritual); } },
        { rotulo: "Subir", aoClicar: function () { reordenar(ctx, ritual, -1); } },
        { rotulo: "Descer", aoClicar: function () { reordenar(ctx, ritual, 1); } },
        "separador",
        { rotulo: "Remover", perigo: true, aoClicar: function () { remover(ctx, ritual); } },
      ], { rotulo: "Opções de " + ritual.nome, icone: "tresPontos" }),
    ] : null;

    return UI.recolhivel({
      titulo: ritual.nome,
      /* O primeiro campo vira a pista do resumo fechado: numa lista de
         vinte rituais, "3" ao lado do nome já orienta. */
      extra: U.texto(ritual[F.CAMPOS_RITUAL[0]]).trim(),
      conteudo: linhas.length
        ? [el("dl.r-dados", {}, linhas)]
        : [el("p.t-mini", { texto: "Sem informações preenchidas." })],
      acoes: acoes,
    });
  }

  /* =================================================================
     CRIAR E EDITAR
     ================================================================= */

  function editar(ctx, ritual) {
    var criando = !ritual;
    var atual = ritual || F.criarRitual({});
    var rotulos = ctx.ficha.rituais.rotulos;

    var nome = UI.campo({ rotulo: "Nome", valor: atual.nome, limite: 120 });

    var campos = {};
    F.CAMPOS_RITUAL.forEach(function (chave) {
      campos[chave] = UI.campo({
        /* O rótulo mostrado é o da seção; a chave gravada continua
           sendo `chave`. É aqui que os dois mundos se encontram. */
        rotulo: rotulos[chave],
        valor: atual[chave],
        tipo: chave === "efeito" ? "area" : "text",
        linhas: 5,
        limite: chave === "efeito" ? 8000 : 200,
      });
    });

    var curtos = F.CAMPOS_RITUAL.filter(function (c) { return c !== "efeito"; });

    UI.modal({
      titulo: criando ? "Novo registro" : "Editar",
      largo: true,
      conteudo: el("div.pilha", {}, [
        nome,
        el("div.editar-grade", {}, curtos.map(function (c) { return campos[c]; })),
        campos.efeito,
      ]),
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        {
          rotulo: criando ? "Criar" : "Salvar",
          classe: "r-botao--principal",
          aoClicar: function (fechar) {
            var valor = nome.entrada.value.trim();
            if (!valor) { nome.marcarErro("Informe um nome."); nome.entrada.focus(); return; }

            var dados = { nome: valor };
            F.CAMPOS_RITUAL.forEach(function (c) { dados[c] = campos[c].entrada.value; });

            if (criando) {
              ctx.ficha.rituais.itens.push(F.criarRitual(dados));
            } else {
              Object.assign(ritual, F.criarRitual(dados), { id: ritual.id });
            }

            ctx.alterou();
            fechar();
            ctx.redesenhar();
          },
        },
      ],
    });

    nome.entrada.focus();
  }

  function duplicar(ctx, ritual) {
    var copia = F.criarRitual(ritual);
    copia.nome = ritual.nome + " (cópia)";
    ctx.ficha.rituais.itens.push(copia);
    ctx.alterou();
    ctx.redesenhar();
  }

  function reordenar(ctx, ritual, direcao) {
    var itens = ctx.ficha.rituais.itens;
    var i = U.indiceDe(itens, ritual.id);
    var destino = i + direcao;
    if (i < 0 || destino < 0 || destino >= itens.length) return;

    var movido = itens.splice(i, 1)[0];
    itens.splice(destino, 0, movido);
    ctx.alterou();
    ctx.redesenhar();
  }

  async function remover(ctx, ritual) {
    var certeza = await UI.confirmar({
      titulo: "Remover " + ritual.nome + "?",
      texto: "O registro sai desta ficha.",
      detalhe: "Esta ação não pode ser desfeita.",
      rotuloConfirmar: "Remover", perigo: true,
    });
    if (!certeza) return;

    ctx.ficha.rituais.itens = ctx.ficha.rituais.itens.filter(function (r) { return r.id !== ritual.id; });
    ctx.alterou();
    ctx.redesenhar();
  }

  /* =================================================================
     RÓTULOS DA SEÇÃO
     -----------------------------------------------------------------
     Uma janela só, porque a configuração é UMA e vale para todos os
     registros da ficha.
     ================================================================= */

  function configurar(ctx) {
    var rituais = ctx.ficha.rituais;

    var secao = UI.campo({
      rotulo: "Nome da seção", valor: rituais.rotuloSecao, limite: 40,
      ajuda: "Rituais, Magias, Técnicas, Poderes… A aba passa a usar este nome.",
    });

    var campos = {};
    F.CAMPOS_RITUAL.forEach(function (chave) {
      campos[chave] = UI.campo({
        rotulo: F.ROTULOS_RITUAL_PADRAO[chave],
        valor: rituais.rotulos[chave],
        limite: 40,
      });
    });

    UI.modal({
      titulo: "Rótulos da seção",
      largo: true,
      conteudo: el("div.pilha", {}, [
        secao,
        el("hr.r-linha"),
        el("p.t-mini", {
          texto: "Estes nomes valem para TODOS os registros desta ficha — não existe rótulo por registro. " +
                 "Trocar um nome muda só o que aparece na tela: nada do que já foi escrito se perde.",
        }),
        el("div.editar-grade", {}, F.CAMPOS_RITUAL.map(function (c) { return campos[c]; })),
      ]),
      botoes: [
        {
          rotulo: "Voltar ao padrão", classe: "r-botao--fantasma",
          aoClicar: function (fechar) {
            rituais.rotuloSecao = "Rituais";
            rituais.rotulos = Object.assign({}, F.ROTULOS_RITUAL_PADRAO);
            ctx.alterou();
            fechar();
            ctx.redesenhar();
          },
        },
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        {
          rotulo: "Salvar", classe: "r-botao--principal",
          aoClicar: function (fechar) {
            rituais.rotuloSecao = U.aparar(secao.entrada.value, 40) || "Rituais";
            F.CAMPOS_RITUAL.forEach(function (c) {
              rituais.rotulos[c] = U.aparar(campos[c].entrada.value, 40) || F.ROTULOS_RITUAL_PADRAO[c];
            });
            ctx.alterou();
            fechar();
            /* A aba precisa se redesenhar inteira: o nome dela mudou. */
            ctx.redesenhar();
          },
        },
      ],
    });

    secao.entrada.focus();
  }

  global.RAMASecaoRituais = { aba: aba, rotulo: rotulo };
})(window);
