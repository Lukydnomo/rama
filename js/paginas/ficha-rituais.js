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

   3. Um ritual pode ser conjurado de mais de um jeito, e cada jeito
      tem o próprio dano. As VERSÕES são uma coleção com id estável, e
      não campos fixos chamados danoDiscente e danoVerdadeiro: o nome
      que aparece é conteúdo, e renomear uma versão não move o dano
      dela para lugar nenhum. Ver o bloco de versões em js/ficha.js.

   O ritual era informação pura até a v2.2: abria, fechava e não rolava
   nada. Agora ele rola dano — e só isso. Custo de esforço, teste de
   resistência e redução de dano continuam fora, porque continuam sendo
   decisão da mesa e não do R.A.M.A.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var F = global.RAMAFicha;
  var D = global.RAMADados;
  var V = global.RAMAValidacao;
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

    /* A faixa de danos continua à vista com o ritual fechado — numa
       sessão essa é a ação mais repetida, e ela não pode custar a
       abertura do cartão. Quem cuida disso é a `faixa` do recolhível;
       o comentário de lá explica por que ela não pode simplesmente ser
       pendurada dentro do <details>. */
    return UI.recolhivel({
      titulo: ritual.nome,
      /* O primeiro campo vira a pista do resumo fechado: numa lista de
         vinte rituais, "3" ao lado do nome já orienta. */
      extra: U.texto(ritual[F.CAMPOS_RITUAL[0]]).trim(),
      conteudo: linhas.length
        ? [el("dl.r-dados", {}, linhas)]
        : [el("p.t-mini", { texto: "Sem informações preenchidas." })],
      acoes: acoes,
      faixa: faixaDeDanos(ctx, ritual),
    });
  }

  /* =================================================================
     VERSÕES, NO EDITOR
     -----------------------------------------------------------------
     Uma linha por versão: nome à esquerda, dano à direita, remover no
     fim. Tudo o que é digitado aqui vive numa cópia de trabalho até
     alguém confirmar — cancelar a janela não deixa rastro na ficha.

     A cópia guarda o ID de cada versão. É ele que faz renomear
     "Discente" para "Ampliado" continuar sendo a MESMA versão, com o
     mesmo dano, em vez de virar outra.
     ================================================================= */

  function editorDeVersoes(ritual) {
    /* Cópia de trabalho: mexer aqui não mexe no ritual. */
    var trabalho = (ritual.versoes || []).map(function (v) {
      return { id: v.id, nome: v.nome, dano: v.dano };
    });
    if (!trabalho.length) trabalho = [{ id: U.uuid(), nome: F.NOME_VERSAO_PADRAO, dano: "" }];

    var lista = el("div.versoes", {});
    var controles = [];

    var acrescentar = el("button.r-botao.r-botao--mini", {
      type: "button", texto: "+ Adicionar versão",
      onclick: function () {
        colher();
        if (trabalho.length >= F.MAX_VERSOES_RITUAL) return;
        trabalho.push({ id: U.uuid(), nome: "", dano: "" });
        pintar();
        var ultimo = controles[controles.length - 1];
        if (ultimo) ultimo.nome.entrada.focus();
      },
    });

    /* Lê o que está nos campos de volta para a cópia. Chamado antes de
       qualquer redesenho: sem isto, acrescentar a terceira versão
       apagaria o que ainda não tinha sido confirmado nas duas
       primeiras. */
    function colher() {
      controles.forEach(function (c, i) {
        if (!trabalho[i]) return;
        trabalho[i].nome = c.nome.entrada.value;
        trabalho[i].dano = c.dano.entrada.value;
      });
    }

    function pintar() {
      colher();
      controles = [];

      U.trocar(lista, trabalho.map(function (v, i) {
        var nome = UI.campo({
          rotulo: "Versão", valor: v.nome, limite: 40,
          dica: i === 0 ? F.NOME_VERSAO_PADRAO : "Discente",
        });

        var dano = UI.campo({
          rotulo: "Dano", valor: v.dano, limite: 40, dica: "6d8",
          ajuda: i === 0 ? "Deixe em branco se esta versão não causa dano." : "",
        });

        controles.push({ nome: nome, dano: dano });

        /* A última versão não some: um ritual sem nenhuma não teria
           onde guardar dano quando alguém quisesse acrescentar um. */
        var remover = el("button.r-icone", {
          type: "button",
          "aria-label": "Remover a versão " + (v.nome || "sem nome"),
          title: "Remover versão",
          disabled: trabalho.length < 2,
          onclick: function () {
            colher();
            trabalho.splice(i, 1);
            pintar();
          },
        }, [UI.simbolo("lixeira", 14)]);

        return el("div.versao", {}, [nome, dano, el("div.versao__acao", {}, [remover])]);
      }));

      acrescentar.disabled = trabalho.length >= F.MAX_VERSOES_RITUAL;
    }

    pintar();

    return {
      elemento: el("div.pilha--curta", { class: "pilha" }, [
        el("p.t-secao", { texto: "Versões" }),
        el("p.t-mini", {
          texto: "Cada versão tem o próprio dano. Normal, Discente e Verdadeiro são o costume " +
                 "de Ordem Paranormal, não uma exigência: renomeie, acrescente ou remova à vontade. " +
                 "Versão sem dano não aparece na ficha.",
        }),
        lista,
        el("div.faixa", {}, [acrescentar]),
      ]),

      /* Confere e devolve as versões, ou null quando alguma expressão
         não passa. O que foi digitado NUNCA é apagado: o campo ganha a
         marca de erro e a mensagem, e continua com o texto lá. */
      conferir: function () {
        colher();

        controles.forEach(function (c) { c.nome.marcarErro(""); c.dano.marcarErro(""); });

        var primeiroRuim = null;

        trabalho.forEach(function (v, i) {
          var c = controles[i];

          if (!U.aparar(v.nome)) {
            c.nome.marcarErro("Dê um nome a esta versão.");
            if (!primeiroRuim) primeiroRuim = c.nome;
          }

          /* dadoOpcional: em branco passa, errado não. É a mesma
             conferência do dano de uma arma, com as mesmas mensagens —
             não existe segundo validador de dado neste sistema. */
          var r = V.dadoOpcional(v.dano);
          if (!r.ok) {
            c.dano.marcarErro(r.mensagem);
            if (!primeiroRuim) primeiroRuim = c.dano;
          }
        });

        if (primeiroRuim) { primeiroRuim.entrada.focus(); return null; }

        return trabalho.map(function (v) {
          return { id: v.id, nome: v.nome, dano: v.dano };
        });
      },
    };
  }

  /* =================================================================
     ROLAR O DANO
     -----------------------------------------------------------------
     Nada de novo acontece aqui. O motor de dados sorteia, o mostrador
     central exibe, e é o mostrador que entrega a rolagem ao histórico
     da campanha — com a chave de idempotência que impede uma
     retentativa de virar duas linhas.

     O sorteio acontece UMA vez, dentro de D.dano(). Se o envio ao
     histórico falhar, o que é reenviado é este mesmo resultado, e não
     um novo.

     E só isso: nada de custo de PE, teste de resistência ou redução de
     dano. O R.A.M.A. rola o que foi escrito.
     ================================================================= */

  function rolarDano(ctx, ritual, versao) {
    var r = D.dano({ dano: versao.dano, nome: ritual.nome });

    if (!r.ok) {
      UI.avisoErro(
        "O dano de " + ritual.nome + " · " + versao.nome +
        " não é uma expressão válida: “" + versao.dano + "”. " +
        "Use NdX, como 6d8."
      );
      return;
    }

    global.RAMARolagens.mostrar(r, {
      nome: "Dano — " + ritual.nome + " · " + versao.nome,
    });
  }

  /* A faixa compacta de danos do cartão: nome da versão, expressão e o
     dado para rolar. Só entram as versões com dano preenchido. */
  function faixaDeDanos(ctx, ritual) {
    var comDano = F.versoesComDano(ritual);
    if (!comDano.length) return null;

    return el("div.ritual-danos", {}, comDano.map(function (v) {
      return el("div.ritual-dano", {}, [
        el("span.ritual-dano__versao", { texto: v.nome }),
        el("div.ritual-dano__linha", {}, [
          el("span.ritual-dano__expressao", { texto: v.dano }),
          el("button.r-icone.ritual-dano__rolar", {
            type: "button",
            "aria-label": "Rolar dano de " + ritual.nome + ", versão " + v.nome + ", " + v.dano,
            title: "Rolar " + v.dano,
            onclick: function (ev) {
              /* O cartão é um <details>. Sem estas duas linhas, rolar
                 fecharia o ritual que a pessoa acabou de abrir. */
              ev.preventDefault();
              ev.stopPropagation();
              rolarDano(ctx, ritual, v);
            },
          }, [UI.simbolo("dado", 14)]),
        ]),
      ]);
    }));
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

    var versoes = editorDeVersoes(atual);

    UI.modal({
      titulo: criando ? "Novo registro" : "Editar",
      largo: true,
      conteudo: el("div.pilha", {}, [
        nome,
        el("div.editar-grade", {}, curtos.map(function (c) { return campos[c]; })),
        campos.efeito,
        el("hr.r-linha"),
        versoes.elemento,
      ]),
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        {
          rotulo: criando ? "Criar" : "Salvar",
          classe: "r-botao--principal",
          aoClicar: function (fechar) {
            var valor = nome.entrada.value.trim();
            if (!valor) { nome.marcarErro("Informe um nome."); nome.entrada.focus(); return; }

            /* Nada é gravado enquanto houver expressão inválida — e
               nada do que foi digitado é apagado por causa disso. A
               janela continua aberta, com o erro no campo certo. */
            var listaDeVersoes = versoes.conferir();
            if (!listaDeVersoes) return;

            var dados = { nome: valor };
            F.CAMPOS_RITUAL.forEach(function (c) { dados[c] = campos[c].entrada.value; });

            if (criando) {
              /* criarRitual gera ids do zero, inclusive das versões — é
                 o que se quer para um registro que está nascendo. */
              dados.versoes = listaDeVersoes;
              ctx.ficha.rituais.itens.push(F.criarRitual(dados));
            } else {
              Object.assign(ritual, F.criarRitual(dados), {
                id: ritual.id,
                /* Os ids vêm das linhas do editor, e não de criarRitual:
                   renomear uma versão não pode trocar a identidade dela
                   nem soltá-la do dano que já tinha. */
                versoes: F.normalizarVersoesRitual(listaDeVersoes),
              });
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
