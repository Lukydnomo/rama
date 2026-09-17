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
   nada. Desde então ele rola dano — e, com o catálogo de rituais
   (v2.14), qualquer rolagem que a versão tenha, cada uma com o próprio
   tipo e rótulo: dano, cura ou outra. Nada mais: custo de esforço,
   teste de resistência e redução de dano continuam sendo decisão da
   mesa, e o que a ficha faz é MOSTRAR o custo, não gastá-lo.

   Numa ficha de Ordem Paranormal, o botão "Da biblioteca" abre o
   catálogo oficial dos dois livros e a Homebrew da conta
   (js/paginas/ficha-rituais-biblioteca.js). O ritual trazido de lá é uma
   cópia com id próprio; editar a cópia não muda o catálogo.
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
          global.RAMABibliotecaDeRituais ? el("button.r-botao.r-botao--mini", {
            type: "button", texto: "Da biblioteca",
            onclick: function () { global.RAMABibliotecaDeRituais.abrir(ctx); },
          }) : null,
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
        acaoSecundaria: ctx.emEdicao() && global.RAMABibliotecaDeRituais
          ? { rotulo: "Da biblioteca", aoClicar: function () { global.RAMABibliotecaDeRituais.abrir(ctx); } }
          : null,
      });
    }

    /* Na ficha de Ordem, a lista segue o modo escolhido na barra
       (personalizada, de adição, A–Z, Z–A). Na universal, a guardada. */
    var org = global.RAMAOrdemOrganizacao;
    var modo = org ? org.modo(ctx, "rituais") : "personalizada";
    var lista = U.ordenarLista(rituais.itens, modo);

    return el("div.pilha--curta", { class: "pilha" }, [
      org ? org.barra(ctx, "rituais") : null,
    ].concat(lista.map(function (r) { return cartao(ctx, r, modo); })));
  }

  function cartao(ctx, ritual, modo) {
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

    /* Custo em PE: da forma básica e o TOTAL de cada versão avançada.
       É informação — a ficha não gasta PE por conta própria. */
    var custos = custosDoRitual(ritual);
    if (custos) {
      linhas.push(el("dt", { texto: "Custo" }));
      linhas.push(el("dd", { texto: custos }));
    }

    /* O que cada versão avançada muda, e o que ela exige. */
    (ritual.versoes || []).forEach(function (v) {
      var partes = [];
      if (v.requisito) partes.push("requer " + v.requisito);
      if (v.alteracoes) partes.push(v.alteracoes);
      if (!partes.length) return;
      linhas.push(el("dt", { texto: v.nome }));
      linhas.push(el("dd", { texto: partes.join(" — ") }));
    });

    var acoes = ctx.emEdicao() ? [
      UI.menu([
        { rotulo: "Editar", aoClicar: function () { editar(ctx, ritual); } },
        { rotulo: "Duplicar", aoClicar: function () { duplicar(ctx, ritual); } },
        { rotulo: "Enviar à biblioteca", aoClicar: function () { enviarParaHomebrew(ctx, ritual); } },
      ].concat(modo && modo !== "personalizada" ? [] : [
        /* Subir e Descer mexem na ordem guardada: com a tela ordenada
           por nome ou por adição, não mudariam nada visível. */
        { rotulo: "Subir", aoClicar: function () { reordenar(ctx, ritual, -1); } },
        { rotulo: "Descer", aoClicar: function () { reordenar(ctx, ritual, 1); } },
      ], [
        "separador",
        { rotulo: "Remover", perigo: true, aoClicar: function () { remover(ctx, ritual); } },
      ]), { rotulo: "Opções de " + ritual.nome, icone: "tresPontos" }),
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
    /* Cópia de trabalho: mexer aqui não mexe no ritual. As rolagens que
       não são dano (cura, PV temporários, dado de auxílio) vêm do
       catálogo e são PRESERVADAS: o editor as mostra e não as perde. */
    var trabalho = (ritual.versoes || []).map(function (v) {
      return {
        id: v.id, nome: v.nome, dano: v.dano, danoExtra: v.danoExtra || "",
        custo: v.custo ? String(v.custo) : "", requisito: v.requisito || "", alteracoes: v.alteracoes || "",
        rolagens: v.rolagens ? JSON.parse(JSON.stringify(v.rolagens)) : null,
      };
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
        trabalho[i].danoExtra = c.danoExtra.entrada.value;
        trabalho[i].custo = c.custo.entrada.value;
        trabalho[i].requisito = c.requisito.entrada.value;
        trabalho[i].alteracoes = c.alteracoes.entrada.value;
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

        var danoExtra = UI.campo({
          rotulo: "Dano extra", valor: v.danoExtra, limite: 40, dica: "3",
          ajuda: i === 0 ? "A parte fixa de um dano como 3d4+3. Nunca é multiplicada." : "",
        });

        /* O custo é o ACRÉSCIMO desta versão. A forma básica não tem: o
           custo dela é o do círculo do ritual (Tabela 5.2). */
        var custo = UI.campo({
          rotulo: i === 0 ? "Custo adicional (a básica não tem)" : "Custo adicional (PE)",
          tipo: "numero", valor: v.custo, limite: 2,
          ajuda: i === 0 ? "" : "Só o que esta versão SOMA ao custo do círculo.",
        });

        var requisito = UI.campo({
          rotulo: "Requisito", valor: v.requisito, limite: 200, dica: "3º círculo e afinidade",
        });

        var alteracoes = UI.campo({
          rotulo: "O que muda", tipo: "area", linhas: 2, valor: v.alteracoes, limite: 2000,
          ajuda: i === 0 ? "" : "Em relação à forma básica. O que não estiver aqui continua igual.",
        });

        controles.push({ nome: nome, dano: dano, danoExtra: danoExtra, custo: custo, requisito: requisito, alteracoes: alteracoes });

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

        var rolagens = (v.rolagens || []).map(function (r) {
          return r.rotulo + " " + (r.expressao || "") + (r.extra ? (r.expressao ? "+" : "") + r.extra : "");
        });

        return el("div.pilha--curta.versao-bloco", { class: "pilha" }, [
          el("div.versao", {}, [nome, dano, danoExtra, el("div.versao__acao", {}, [remover])]),
          el("div.editar-grade", {}, [custo, requisito]),
          alteracoes,
          rolagens.length ? el("p.t-mini", { texto: "Outras rolagens desta versão (preservadas): " + rolagens.join("; ") + "." }) : null,
        ]);
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

        controles.forEach(function (c) { c.nome.marcarErro(""); c.dano.marcarErro(""); c.danoExtra.marcarErro(""); });

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

          /* O dano extra aceita número (3) ou dado (1d6) — como o das
             armas. Vazio passa. */
          var extra = U.aparar(v.danoExtra);
          if (extra && !/^\d{1,4}$/.test(extra) && !V.dadoOpcional(extra).ok) {
            c.danoExtra.marcarErro("Use um número (3) ou um dado (1d6).");
            if (!primeiroRuim) primeiroRuim = c.danoExtra;
          }
        });

        if (primeiroRuim) { primeiroRuim.entrada.focus(); return null; }

        return trabalho.map(function (v) {
          var saida = { id: v.id, nome: v.nome, dano: v.dano, danoExtra: v.danoExtra };
          var custo = parseInt(v.custo, 10);
          if (custo > 0) saida.custo = custo;
          if (U.aparar(v.requisito)) saida.requisito = v.requisito;
          if (U.aparar(v.alteracoes)) saida.alteracoes = v.alteracoes;
          if (v.rolagens && v.rolagens.length) saida.rolagens = v.rolagens;
          return saida;
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
    rolar(ctx, ritual, versao, { tipo: "dano", rotulo: "Dano", expressao: versao.dano, extra: versao.danoExtra || "" });
  }

  /* Uma rolagem de uma versão: o mesmo motor de dados e o mesmo
     mostrador da ficha, com o TIPO no nome do resultado — cura não é
     dano, e o histórico da campanha precisa saber a diferença. */
  function rolar(ctx, ritual, versao, rolagem) {
    var r = D.dano({ dano: rolagem.expressao, danoExtra: rolagem.extra, nome: ritual.nome });

    if (!r.ok) {
      UI.avisoErro(
        "A rolagem “" + rolagem.rotulo + "” de " + ritual.nome + " · " + versao.nome +
        " não é uma expressão válida: “" + rolagem.expressao + "”. " +
        "Use NdX, como 6d8."
      );
      return;
    }

    global.RAMARolagens.mostrar(r, {
      nome: rolagem.rotulo + " — " + ritual.nome + " · " + versao.nome,
    });
  }

  /* O custo em PE escrito: a forma básica e o total de cada avançada. */
  function custosDoRitual(ritual) {
    var RT = global.RAMAOrdemRituais;
    if (!RT) return "";
    var base = RT.custoDaVersao(ritual, null);
    if (!base) return "";
    var partes = [base.base + " PE"];
    (ritual.versoes || []).forEach(function (v) {
      if (!v.custo) return;
      var c = RT.custoDaVersao(ritual, v);
      partes.push(v.nome + ": +" + c.adicional + " PE (total " + c.total + " PE)");
    });
    return partes.join(" · ");
  }

  /* A faixa compacta de danos do cartão: nome da versão, expressão e o
     dado para rolar. Só entram as versões com dano preenchido. */
  function faixaDeDanos(ctx, ritual) {
    var comRolagem = F.versoesComRolagem(ritual);
    if (!comRolagem.length) return null;

    var linhas = [];
    comRolagem.forEach(function (v) {
      F.rolagensDaVersao(v).forEach(function (rolagem) {
        var expressao = (rolagem.expressao || "") + (rolagem.extra ? (rolagem.expressao ? "+" : "") + rolagem.extra : "");
        if (!expressao) return;
        linhas.push(el("div.ritual-dano", { class: rolagem.tipo === "cura" ? "ritual-dano--cura" : "" }, [
          el("span.ritual-dano__versao", { texto: v.nome + (rolagem.tipo === "dano" ? "" : " · " + rolagem.rotulo) }),
          el("div.ritual-dano__linha", {}, [
            el("span.ritual-dano__expressao", { texto: expressao }),
            el("button.r-icone.ritual-dano__rolar", {
              type: "button",
              "aria-label": "Rolar " + rolagem.rotulo.toLowerCase() + " de " + ritual.nome + ", versão " + v.nome + ", " + expressao,
              title: "Rolar " + expressao,
              onclick: function (ev) {
                /* O cartão é um <details>. Sem estas duas linhas, rolar
                   fecharia o ritual que a pessoa acabou de abrir. */
                ev.preventDefault();
                ev.stopPropagation();
                rolar(ctx, ritual, v, rolagem);
              },
            }, [UI.simbolo("dado", 14)]),
          ]),
        ]));
      });
    });

    return linhas.length ? el("div.ritual-danos", {}, linhas) : null;
  }

  /* =================================================================
     CRIAR E EDITAR
     ================================================================= */

  /* Os campos de um ritual, montados uma vez e reaproveitados pelo
     editor da ficha e pelo editor da página Homebrew — para não
     existirem dois formulários de ritual no sistema.

     opcoes: { rotulos, comOrdem } */
  function camposDoRitual(atual, opcoes) {
    var o = opcoes || {};
    var rotulos = o.rotulos || F.ROTULOS_RITUAL_PADRAO;

    var nome = UI.campo({ rotulo: "Nome", valor: atual.nome, limite: 120 });

    var campos = {};
    F.CAMPOS_RITUAL.forEach(function (chave) {
      var longo = chave === F.CAMPO_LONGO_RITUAL;
      campos[chave] = UI.campo({
        /* O rótulo mostrado é o da seção; a chave gravada continua
           sendo `chave`. É aqui que os dois mundos se encontram. */
        rotulo: rotulos[chave],
        valor: atual[chave],
        tipo: longo ? "area" : "text",
        linhas: 8,
        limite: longo ? 8000 : 200,
        ajuda: chave === "alvo" ? "Alvo, Área e Efeito são campos diferentes: preencha o que o ritual usa." : "",
      });
    });

    var curtos = F.CAMPOS_RITUAL.filter(function (c) { return c !== F.CAMPO_LONGO_RITUAL; });
    var ordem = o.comOrdem ? camposDeOrdem(atual) : null;
    var versoes = editorDeVersoes(atual);

    return {
      elementos: [
        nome,
        el("div.editar-grade", {}, curtos.map(function (c) { return campos[c]; })),
        campos[F.CAMPO_LONGO_RITUAL],
        ordem ? el("hr.r-linha") : null,
        ordem ? ordem.elemento : null,
        el("hr.r-linha"),
        versoes.elemento,
      ].filter(Boolean),

      focar: function () { nome.entrada.focus(); },

      coletar: function () {
        var valor = nome.entrada.value.trim();
        if (!valor) { nome.marcarErro("Informe um nome."); nome.entrada.focus(); return null; }

        /* Nada é gravado enquanto houver expressão inválida — e nada do
           que foi digitado é apagado por causa disso. A janela continua
           aberta, com o erro no campo certo. */
        var listaDeVersoes = versoes.conferir();
        if (!listaDeVersoes) return null;

        var dados = { nome: valor, versoes: listaDeVersoes };
        F.CAMPOS_RITUAL.forEach(function (c) { dados[c] = campos[c].entrada.value; });

        /* O que o editor não mostra continua como estava: o rastro da
           origem e, quando não há bloco de Ordem na tela, o bloco que o
           ritual já tinha. */
        if (atual.origemCatalogoId) dados.origemCatalogoId = atual.origemCatalogoId;
        if (atual.origemHomebrewId) dados.origemHomebrewId = atual.origemHomebrewId;
        dados.ordem = ordem ? ordem.coletar() : (atual.ordem || null);
        if (!dados.ordem) delete dados.ordem;

        return dados;
      },
    };
  }

  /* Os números que as regras de Ordem leem num ritual: elemento,
     círculo e o custo em PE da forma básica. Em branco, o custo vem do
     círculo — a tabela do livro. */
  function camposDeOrdem(atual) {
    var RT = global.RAMAOrdemRituais;
    var d = RT ? RT.dadosDoRitual(atual) : {};

    var elemento = UI.campo({
      rotulo: "Elemento (regras de Ordem)", tipo: "selecao", valor: d.elemento || "",
      opcoes: [{ valor: "", rotulo: "Não informado" }].concat((RT ? RT.ELEMENTOS : []).map(function (e) {
        return { valor: e.chave, rotulo: e.nome };
      })),
      ajuda: "Usado pelos avisos de afinidade e pelo custo em Sanidade dos rituais de Medo.",
    });

    var circulo = UI.campo({
      rotulo: "Círculo (1 a 4)", tipo: "selecao", valor: d.circulo ? String(d.circulo) : "",
      opcoes: [{ valor: "", rotulo: "Não informado" }].concat((RT ? RT.CIRCULOS : []).map(function (n) {
        return { valor: String(n), rotulo: RT.rotuloCirculo(n) + " (" + RT.custoDoCirculo(n) + " PE)" };
      })),
    });

    var custo = UI.campo({
      rotulo: "Custo em PE da forma básica", tipo: "numero",
      valor: d.custo !== undefined && d.circulo && d.custo !== (RT ? RT.custoDoCirculo(d.circulo) : null) ? String(d.custo) : "",
      limite: 3,
      ajuda: "Em branco usa o custo do círculo (1, 3, 6 ou 10 PE).",
    });

    return {
      elemento: el("div.pilha--curta", { class: "pilha" }, [
        el("h4.t-secao", { texto: "Ordem Paranormal" }),
        el("div.editar-grade", {}, [elemento, circulo]),
        custo,
      ]),
      coletar: function () {
        var saida = {};
        if (elemento.entrada.value) saida.elemento = elemento.entrada.value;
        if (circulo.entrada.value) saida.circulo = parseInt(circulo.entrada.value, 10);
        var pe = parseInt(custo.entrada.value, 10);
        if (Number.isFinite(pe) && pe >= 0) saida.custo = pe;
        else if (saida.circulo && RT) saida.custo = RT.custoDoCirculo(saida.circulo);
        /* A referência do livro não é editável: ela é o rastro de onde o
           ritual veio, e continua como estava. */
        if (atual.ordem && atual.ordem.referencia) saida.referencia = atual.ordem.referencia;
        return Object.keys(saida).length ? saida : null;
      },
    };
  }

  function novoRitual(ctx) { editar(ctx, null); }

  function editar(ctx, ritual) {
    var criando = !ritual;
    var atual = ritual || F.criarRitual({});
    var campos = camposDoRitual(atual, {
      rotulos: ctx.ficha.rituais.rotulos,
      comOrdem: F.ehDeOrdem(ctx.ficha) && !!global.RAMAOrdemRituais,
    });

    UI.modal({
      titulo: criando ? "Novo registro" : "Editar",
      largo: true,
      conteudo: el("div.pilha", {}, campos.elementos),
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        {
          rotulo: criando ? "Criar" : "Salvar",
          classe: "r-botao--principal",
          aoClicar: function (fechar) {
            var dados = campos.coletar();
            if (!dados) return;
            var listaDeVersoes = dados.versoes;

            if (criando) {
              /* criarRitual gera ids do zero, inclusive das versões — é
                 o que se quer para um registro que está nascendo. */
              var novo = F.criarRitual(dados);
              novo.adicionadoEm = U.agoraISO();
              ctx.ficha.rituais.itens.push(novo);
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

    campos.focar();
  }

  /* Guardar o ritual na biblioteca Homebrew da conta — o mesmo caminho
     que itens e habilidades usam. A ficha continua com a cópia dela. */
  async function enviarParaHomebrew(ctx, ritual) {
    var registro = F.normalizarRitual(ritual) || {};
    registro = JSON.parse(JSON.stringify(registro));
    delete registro.id;
    delete registro.origemHomebrewId;
    registro.tipo = "ritual";

    var r = await UI.ocupar(null, function () {
      return global.RAMAApi.salvarHomebrew(registro);
    }, { rotulo: "Enviando…" });

    if (r && r.ok) UI.avisoOk(ritual.nome + " foi guardado na biblioteca Homebrew.");
    else UI.avisoErro(global.RAMAApi.frase(r).texto);
  }

  function duplicar(ctx, ritual) {
    var copia = F.criarRitual(ritual);
    copia.nome = ritual.nome + " (cópia)";
    /* A cópia é um registro novo: entrou agora. */
    copia.adicionadoEm = U.agoraISO();
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

  global.RAMASecaoRituais = {
    aba: aba,
    rotulo: rotulo,
    novoRitual: novoRitual,
    camposDoRitual: camposDoRitual,
    editorDeVersoes: editorDeVersoes,
  };
})(window);
