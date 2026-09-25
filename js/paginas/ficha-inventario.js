/* =====================================================================
   R.A.M.A. — ficha · inventário
   ---------------------------------------------------------------------
   Itens, armas, armaduras e mochilas, mais o peso e os dois botões que
   a mesa mais aperta: ATAQUE e DANO.

   O peso é CALCULADO, sempre: soma do que se carrega menos o que as
   mochilas aliviam, nunca abaixo de zero. Não existe campo para
   digitá-lo — um peso escrito à mão para de bater com o inventário na
   primeira troca de item, e aí ninguém sabe qual dos dois está certo.

   Sobre o crítico, e isto é regra deste projeto e não de outro
   sistema: o crítico é conferido pelo resultado NATURAL PRINCIPAL do
   ataque, antes de qualquer bônus. E no dano crítico multiplica-se a
   QUANTIDADE de dados-base — 2d10 x2 vira 4d10 —, nunca o resultado
   somado. O dano extra fica de fora da multiplicação.

   Todo item criado à mão aqui também nasce na biblioteca Homebrew. E
   todo item trazido da biblioteca entra como CÓPIA: editar o modelo
   depois não muda as fichas que já o usam. A janela "Da biblioteca"
   mora em js/paginas/ficha-inventario-biblioteca.js: na ficha de Ordem,
   com o catálogo oficial dos livros e a Homebrew; na universal, só a
   Homebrew.

   Numa ficha de Ordem Paranormal, o inventário não mede peso: mede
   espaços. O que muda — o cabeçalho de carga, os campos de espaços,
   quantidade e categoria — vem de RAMASecaoOrdemInventario, e é pedido
   por perfilDe(). A ficha universal nunca passa por esse caminho.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var F = global.RAMAFicha;
  var V = global.RAMAValidacao;
  var D = global.RAMADados;
  var el = U.el;

  /* Filtro de categoria escolhido. Estado de TELA: não sobe para a
     planilha, porque não é do personagem — é do momento. */
  var categoriaAtiva = "";

  /* O complemento de Ordem, quando a ficha é de Ordem. */
  function perfilDe(ctx) {
    return F.ehDeOrdem(ctx.ficha) && global.RAMASecaoOrdemInventario ? global.RAMASecaoOrdemInventario : null;
  }

  function aba(ctx) {
    var perfil = perfilDe(ctx);
    if (perfil) {
      return el("div.pilha--larga", { class: "pilha" }, [
        perfil.cabecalho(ctx),
        painelDoInventario(ctx),
      ]);
    }

    var inventario = ctx.ficha.inventario;
    var peso = F.pesoAtual(inventario);
    var limite = U.numero(inventario.limite, 0);
    var excedeu = limite > 0 && peso > limite;

    return el("div.pilha--larga", { class: "pilha" }, [
      el("div.inventario__peso", { class: excedeu ? "inventario__peso--excedido" : "" }, [
        el("span.t-rotulo", { texto: "Peso" }),
        el("span.inventario__peso-valor", { texto: formatarPeso(peso) }),
        el("span.t-fraco", { texto: "/" }),
        ctx.emEdicao()
          ? el("span", { estilo: { width: "90px" } }, [
              UI.campo({
                rotulo: "Limite", tipo: "numero", valor: limite,
                aoMudar: function (v, entrada) {
                  var r = V.peso(v);
                  if (!r.ok) { entrada.value = String(limite); UI.avisoErro(r.mensagem); return; }
                  inventario.limite = r.valor; ctx.alterou(); ctx.redesenhar();
                },
              }),
            ])
          : el("span.inventario__peso-valor", { texto: limite > 0 ? formatarPeso(limite) : "—" }),
        excedeu ? el("span.r-etiqueta.r-etiqueta--aviso", { texto: "Sobrecarga" }) : null,
      ]),

      painelDoInventario(ctx),
    ]);
  }

  function painelDoInventario(ctx) {
    return UI.painel("Inventário", corpo(ctx), {
      acoes: [
        el("button.r-botao.r-botao--mini", {
          type: "button", texto: "+ Adicionar", onclick: function (ev) { menuAdicionar(ctx, ev); },
        }),
        el("button.r-botao.r-botao--mini", {
          type: "button", texto: "Da biblioteca", onclick: function () { daBiblioteca(ctx); },
        }),
      ],
    });
  }

  function formatarPeso(n) {
    var v = U.peso(n);
    return Number.isInteger(v) ? String(v) : v.toFixed(2).replace(".", ",").replace(/,?0+$/, "");
  }

  function corpo(ctx) {
    var itens = ctx.ficha.inventario.itens || [];

    if (!itens.length) {
      categoriaAtiva = "";
      return UI.vazio({
        titulo: "Mochila vazia",
        texto: perfilDe(ctx)
          ? "Traga itens prontos em “Da biblioteca” — do catálogo oficial de Ordem Paranormal ou da Homebrew — ou crie os seus em “+ Adicionar”."
          : "Acrescente itens, armas, armaduras e mochilas. Tudo o que você criar aqui também entra na sua biblioteca Homebrew.",
        acao: { rotulo: "+ Adicionar", aoClicar: function () { escolherTipo(ctx); } },
      });
    }

    var categorias = F.categoriasDe(ctx.ficha.inventario);

    /* Se a categoria filtrada deixou de existir — o último item dela foi
       removido —, o filtro volta sozinho para "todas". Sem isso a tela
       ficaria vazia sem explicação nenhuma. */
    if (categoriaAtiva && !categorias.some(function (c) { return c.chave === categoriaAtiva; })) {
      categoriaAtiva = "";
    }

    var filtrados = itens.filter(function (i) { return F.itemNaCategoria(i, categoriaAtiva); });
    var org = perfilDe(ctx) ? global.RAMAOrdemOrganizacao : null;
    var modo = org ? org.modo(ctx, "inventario") : "";

    var visiveis;
    if (org) {
      /* Ficha de Ordem: o modo escolhido na barra — personalizada, de
         adição, A–Z ou Z–A. */
      visiveis = U.ordenarLista(filtrados, modo);
    } else {
      /* Ficha universal: armas primeiro. São as que se usam durante o
         combate, e é nelas que se clica com pressa. */
      var ordem = { arma: 0, armadura: 1, item: 2, mochila: 3 };
      visiveis = filtrados.sort(function (a, b) {
        return (ordem[a.tipo] - ordem[b.tipo]) ||
               U.chaveDeBusca(a.nome).localeCompare(U.chaveDeBusca(b.nome), "pt-BR");
      });
    }

    /* Categoria e espaços efetivos de todos os itens, calculados uma vez
       e usados por cabeçalho e detalhes de cada cartão. */
    var efetivos = perfilDe(ctx) && perfilDe(ctx).preparar ? perfilDe(ctx).preparar(ctx) : null;

    /* Arrastar existe onde existe ordem personalizada: na ficha de Ordem,
       no modo edição. A universal continua com armas primeiro. Com uma
       categoria filtrada, o item muda de lugar entre os VISÍVEIS, e os
       outros não saem da ordem em que estavam. */
    var arrastar = !!(org && org.podeArrastar(ctx, "inventario") && global.RAMAArrastar && global.RAMAOrganizar);
    var ids = visiveis.map(function (i) { return i.id; });

    var raiz = el("div.pilha--curta", { class: "pilha" }, [
      org ? org.barra(ctx, "inventario") : null,

      /* O filtro só aparece quando há mais de uma gaveta: um seletor com
         uma opção só é ruído. */
      categorias.length > 1 ? filtro(ctx, categorias, itens.length) : null,
      arrastar && categoriaAtiva
        ? el("p.t-mini", { texto: "Com o filtro, arrastar muda a posição entre os itens mostrados; os outros continuam onde estavam." })
        : null,

      visiveis.length
        ? el("div.itens", { dataset: { arrastarLista: "inventario" } }, visiveis.map(function (i) {
            var c = cartao(ctx, i, modo === "personalizada" ? visiveis : null, efetivos, arrastar);
            c.dataset.arrastarItem = i.id;
            c.dataset.arrastarRotulo = i.nome || "Item";
            return c;
          }))
        : el("p.t-mini", { texto: "Nenhum item nesta categoria." }),
    ]);

    if (!arrastar) return raiz;
    var O = global.RAMAOrganizar;
    return global.RAMAArrastar.ligar(raiz, {
      podeSoltar: function () { return { ok: true }; },
      aoSoltar: function (item, destino) {
        if (!O.reposicionar(ctx.ficha.inventario.itens, item.id, destino.indice, ids)) return;
        ctx.alterou();
        ctx.redesenhar();
      },
      aoTeclado: function (item, direcao) {
        if (!O.passo(ctx.ficha.inventario.itens, item.id, direcao, ids)) {
          return { ok: false, motivo: direcao < 0 ? "Já é o primeiro." : "Já é o último." };
        }
        ctx.alterou();
        ctx.redesenhar();
        return { ok: true };
      },
    });
  }

  /* O filtro casa pela CATEGORIA do item, e não por texto solto na
     descrição: "Consumível" escrito no meio de uma descrição não faz o
     item entrar na gaveta de consumíveis. */
  function filtro(ctx, categorias, total) {
    return el("div.filtros", {}, [
      el("div.filtros__grupo", { role: "group", "aria-label": "Filtrar por categoria" },
        [{ chave: "", rotulo: "Todas", quantidade: total }].concat(categorias).map(function (c) {
          return el("button.filtro", {
            type: "button",
            "aria-pressed": String(categoriaAtiva === c.chave),
            texto: c.rotulo + " (" + c.quantidade + ")",
            onclick: function () { categoriaAtiva = c.chave; ctx.redesenhar(); },
          });
        })
      ),
    ]);
  }

  /* =================================================================
     CARTÃO DE ITEM
     ================================================================= */

  /* Fechado, cada item mostra só o nome, o tipo e a categoria. Vinte
     itens abertos ao mesmo tempo viram uma parede em que ninguém acha
     nada — e no celular a lista não terminava mais.

     As armas são a exceção: os botões de Ataque e Dano continuam à
     vista mesmo com o item fechado, porque são a ação mais repetida
     durante um combate e não podem custar um clique a mais. */
  /* `visiveis` só vem na ordem personalizada da ficha de Ordem: é a
     lista na tela, para Subir e Descer trocarem com o vizinho visível. */
  function cartao(ctx, item, visiveis, efetivos, arrastar) {
    var arma = item.tipo === "arma" && !ctx.emEdicao();

    var perfil = perfilDe(ctx);
    var caixa = UI.recolhivel({
      titulo: item.nome || "Sem nome",
      subtitulo: resumoDoCartao(ctx, item, perfil, efetivos),
      classe: item.tipo === "arma" ? "recolhivel--arma" : "",
      conteudo: [
        detalhes(ctx, item, efetivos),
        item.descricao ? el("p.item__descricao", { texto: item.descricao }) : null,
      ],
      acoes: [UI.menu(opcoesDoItem(ctx, item, visiveis), { rotulo: "Opções de " + item.nome, icone: "tresPontos" })],
      alca: arrastar ? global.RAMAArrastar.alca({ id: item.id, rotulo: item.nome || "item" }) : null,
      /* Ataque e Dano precisam estar à vista com o item FECHADO. Até a
         v2.2 eles eram pendurados dentro do <details> depois da
         montagem, e um <details> fechado não pinta nada além do
         <summary> — então eles só apareciam depois de abrir a arma,
         que é exatamente o contrário do que o comentário ali embaixo
         promete. A `faixa` do recolhível resolve para os dois casos. */
      faixa: arma
        ? (perfil && perfil.botoesDaArma ? perfil.botoesDaArma(ctx, item) : botoesDeArma(ctx, item))
        : (perfil && perfil.faixaDoItem ? perfil.faixaDoItem(ctx, item) : null),
    });

    return caixa;
  }

  /* A linha abaixo do nome: o que se consulta sem abrir o item, como
     rótulo e valor ("Categoria: 0  Espaços: 1"), e o tipo e a gaveta por
     último, mais apagados. Na ficha de Ordem os pares vêm do perfil. */
  function resumoDoCartao(ctx, item, perfil, efetivos) {
    /* Na ficha de Ordem, dano e Defesa vêm do perfil com os valores
       efetivos (atributo, modificações); na universal, os cadastrados. */
    var pares = perfil ? perfil.resumoDoCartao(item, efetivos, ctx) : [];

    if (!perfil) {
      if (item.tipo === "mochila") pares.push(["Reduz", formatarPeso(item.reducaoPeso)]);
      else pares.push(["Peso", formatarPeso(item.peso)]);
      if (item.tipo === "arma" && item.dano) pares.push(["Dano", item.dano + (item.danoExtra ? " + " + item.danoExtra : "")]);
      if (item.tipo === "armadura") pares.push(["Defesa", String(U.inteiro(item.defesa, 0))]);
    }

    var tipo = item.tipo === "armadura" && perfil ? "Proteção" : F.rotuloDoTipo(item.tipo);

    return [
      UI.etiquetaColorida(item.etiqueta),
      el("span.item-dados", {}, pares.map(function (par) {
        return el("span.item-dados__par", {}, [
          el("span.item-dados__rotulo", { texto: par[0] + ":" }),
          el("span.item-dados__valor", { texto: par[1] }),
        ]);
      })),
      el("span.item-dados__tipo", { texto: [tipo, item.categoria].filter(Boolean).join(" · ") }),
    ];
  }

  function detalhes(ctx, item, efetivos) {
    var linhas = [];
    var perfil = perfilDe(ctx);

    /* Na ficha de Ordem, "Categoria" é a de 0 a IV do livro; a gaveta
       do inventário ganha outro nome para as duas não se confundirem. */
    if (!perfil) linhas.push(["Categoria", item.categoria || "Sem categoria"]);
    else if (item.categoria) linhas.push(["Classificação", item.categoria]);

    if (perfil) {
      /* Arma e proteção de Ordem: o perfil traz ataque, dano, crítico e
         Defesa efetivos, com o que as modificações somam. */
      linhas = linhas.concat(perfil.detalhes(ctx, item, efetivos));
    } else {
      if (item.tipo === "mochila") linhas.push(["Reduz", formatarPeso(item.reducaoPeso) + " de peso"]);
      else linhas.push(["Peso", formatarPeso(item.peso)]);

      if (item.tipo === "arma") {
        linhas.push(["Dano", (item.dano || "—") + (item.danoExtra ? " + " + item.danoExtra : "")]);
        linhas.push(["Crítico", item.critico ? item.critico + " / x" + item.multiplicador : "—"]);
      }

      if (item.tipo === "armadura") {
        linhas.push(["Defesa", String(item.defesa)]);
      }
    }

    return el("dl.r-dados", {}, linhas.reduce(function (saida, par) {
      saida.push(el("dt", { texto: par[0] }));
      saida.push(el("dd", { texto: par[1] }));
      return saida;
    }, []));
  }

  function opcoesDoItem(ctx, item, visiveis) {
    var ordem = visiveis && ctx.emEdicao() ? [
      { rotulo: "Subir", aoClicar: function () { moverItem(ctx, visiveis, item, -1); } },
      { rotulo: "Descer", aoClicar: function () { moverItem(ctx, visiveis, item, 1); } },
    ] : [];
    /* Modificações e maldições são da ficha de Ordem: aplicadas a este
       item, pela biblioteca. */
    var modificar = perfilDe(ctx) && global.RAMABibliotecaDeItens ? [
      { rotulo: "Modificações e maldições…", aoClicar: function () { global.RAMABibliotecaDeItens.abrirParaModificar(ctx, item); } },
    ] : [];
    return [
      { rotulo: "Editar", aoClicar: function () { editar(ctx, item); } },
      { rotulo: "Duplicar", aoClicar: function () {
          var copia = F.normalizarItem(item);
          copia.id = U.uuid();
          copia.nome = item.nome + " (cópia)";
          /* A cópia é um item novo: entrou agora, e guardada — só uma
             proteção fica em uso. Mantém modificações, etiqueta e o
             rastro da origem, cada modificação com id próprio. */
          copia.adicionadoEm = U.agoraISO();
          if (copia.ordem) {
            delete copia.ordem.emUso;
            (copia.ordem.modificacoes || []).forEach(function (m) { m.id = U.uuid(); });
          }
          ctx.ficha.inventario.itens.push(copia);
          ctx.alterou();
          ctx.redesenhar();
        } },
    ].concat(modificar, ordem, [
      { rotulo: "Enviar à biblioteca", aoClicar: function () { paraHomebrew(ctx, item); } },
      "separador",
      { rotulo: "Remover", perigo: true, aoClicar: function () { remover(ctx, item); } },
    ]);
  }

  /* Com um filtro de categoria ligado, o vizinho de cima pode estar
     longe na lista guardada: troca-se com o vizinho VISÍVEL. */
  function moverItem(ctx, visiveis, item, direcao) {
    if (!U.moverEntreVisiveis(ctx.ficha.inventario.itens, visiveis, item, direcao)) return;
    ctx.alterou();
    ctx.redesenhar();
  }

  /* =================================================================
     ATAQUE E DANO
     -----------------------------------------------------------------
     Um clique cada, sem confirmação e sem janela. É a ação mais
     repetida do sistema durante uma sessão.
     ================================================================= */

  function botoesDeArma(ctx, arma) {
    return el("div.item__acoes.item__acoes--fora", {}, [
      el("button.r-botao", {
        type: "button", texto: "Ataque",
        onclick: function () { atacar(ctx, arma); },
      }),
      el("button.r-botao", {
        type: "button", texto: "Dano",
        disabled: !arma.dano,
        title: arma.dano ? "Rolar " + arma.dano : "Configure o dano no modo edição",
        onclick: function () { rolarDano(ctx, arma, false); },
      }),
    ]);
  }

  function atacar(ctx, arma) {
    var pericia = U.porId(ctx.ficha.pericias, arma.periciaId);

    if (!pericia) {
      UI.avisoErro("Escolha a perícia de ataque de " + arma.nome + " no modo edição.");
      return;
    }

    var atributo = F.atributoDaPericia(ctx.ficha, pericia);
    if (!atributo) {
      UI.avisoErro(pericia.nome + " não tem atributo vinculado.");
      return;
    }

    var r = D.dependente(F.pedidoDeRolagem(ctx.ficha, pericia));
    if (!r.ok) { UI.avisoErro("O dado de " + atributo.nome + " não é válido."); return; }

    /* O crítico olha o natural principal, não o total. Um bônus de +5
       não pode transformar um 13 em crítico. */
    var critico = D.ehCritico(r.natural, arma.critico);

    global.RAMARolagens.mostrar(r, {
      nome: arma.nome + " · Ataque",
      critico: critico,
      acao: arma.dano
        ? {
            rotulo: critico ? "Rolar dano crítico" : "Rolar dano",
            aoClicar: function () { rolarDano(ctx, arma, critico); },
          }
        : null,
    });
  }

  function rolarDano(ctx, arma, critico) {
    if (!arma.dano) {
      UI.avisoErro(arma.nome + " não tem dano configurado.");
      return;
    }

    var r = D.dano({
      nome: arma.nome,
      dano: arma.dano,
      danoExtra: arma.danoExtra,
      critico: !!critico,
      multiplicador: arma.multiplicador,
    });

    if (!r.ok) { UI.avisoErro("O dano de " + arma.nome + " (" + arma.dano + ") não é válido."); return; }

    global.RAMARolagens.mostrar(r, {
      nome: arma.nome + (critico ? " · Dano crítico" : " · Dano"),
      critico: !!critico,
    });
  }

  /* =================================================================
     ADICIONAR
     ================================================================= */

  function menuAdicionar(ctx, ev) {
    ev.preventDefault();
    escolherTipo(ctx);
  }

  function escolherTipo(ctx) {
    var perfil = perfilDe(ctx);
    var m = UI.modal({
      titulo: "Adicionar ao inventário",
      conteudo: el("div.pilha--curta", { class: "pilha" }, [
        botaoTipo("Item", perfil ? "Qualquer coisa com nome, espaços, categoria e descrição." : "Qualquer coisa com nome, peso e descrição.", function () { m.fechar(); editar(ctx, null, "item"); }),
        botaoTipo("Arma", "Com perícia de ataque, dano, crítico e multiplicador.", function () { m.fechar(); editar(ctx, null, "arma"); }),
        botaoTipo(perfil ? "Proteção" : "Armadura", "Com um valor de defesa.", function () { m.fechar(); editar(ctx, null, "armadura"); }),
        perfil
          ? null
          : botaoTipo("Mochila", "Reduz o peso total carregado.", function () { m.fechar(); editar(ctx, null, "mochila"); }),
        el("hr.r-linha"),
        botaoTipo("Da biblioteca",
          perfil ? "Itens oficiais de Ordem Paranormal, com os campos preenchidos, ou da sua Homebrew." : "Traz uma cópia de algo da biblioteca Homebrew.",
          function () { m.fechar(); daBiblioteca(ctx); }),
      ]),
    });
  }

  function botaoTipo(rotulo, ajuda, aoClicar) {
    return el("button.r-botao.r-botao--bloco", {
      type: "button",
      onclick: aoClicar,
      estilo: { flexDirection: "column", alignItems: "flex-start", gap: "2px", textTransform: "none", padding: "var(--e3)" },
    }, [
      el("span.t-secao", { texto: rotulo }),
      el("span.t-mini", { texto: ajuda }),
    ]);
  }

  /* =================================================================
     FORMULÁRIO DE ITEM
     -----------------------------------------------------------------
     Um formulário só para criar e editar. Dois formulários iguais
     seriam duas listas de campos para manter em sincronia.
     ================================================================= */

  function editar(ctx, item, tipoNovo) {
    var criando = !item;
    var tipo = item ? item.tipo : tipoNovo;
    var atual = item || F.criarItem(tipo, {});

    var nome = UI.campo({ rotulo: "Nome", valor: atual.nome, limite: 80 });
    var descricao = UI.campo({ rotulo: "Descrição", tipo: "area", valor: atual.descricao, linhas: 3, limite: 2000 });

    var perfilDoEditor = perfilDe(ctx);
    var categoria = UI.campo({
      rotulo: perfilDoEditor ? "Classificação" : "Categoria", valor: atual.categoria, limite: 60,
      ajuda: perfilDoEditor
        ? "Livre: Armas, Consumível, Investigação… Serve para filtrar a lista. Não é a categoria de 0 a IV, que fica abaixo."
        : "Livre: Consumível, Corpo a corpo, Investigação… Serve para filtrar.",
    });

    var etiqueta = U.normalizarEtiqueta(atual.etiqueta);
    var campoEtiqueta = UI.campoEtiqueta({ valor: etiqueta, aoMudar: function (v) { etiqueta = v; } });

    var campos = [nome, campoEtiqueta, categoria];
    var extras = { categoria: categoria, etiqueta: function () { return etiqueta; } };
    var perfil = perfilDe(ctx);

    /* Numa ficha de Ordem, espaços no lugar de peso. O peso que o item
       já tinha fica guardado como estava. */
    if (perfil) {
      extras.ordem = perfil.campos(ctx, atual);
    } else if (tipo === "mochila") {
      extras.reducao = UI.campo({
        rotulo: "Redução de peso", tipo: "numero", valor: atual.reducaoPeso,
        ajuda: "Quanto esta mochila tira do peso total.",
      });
      campos.push(extras.reducao);
    } else {
      extras.peso = UI.campo({ rotulo: "Peso", tipo: "numero", valor: atual.peso });
      campos.push(extras.peso);
    }

    if (tipo === "arma") {
      /* Na ficha de Ordem a perícia de ataque é uma perícia de Ordem, e
         o campo fica com o perfil. */
      extras.pericia = perfil ? null : UI.campo({
        rotulo: "Perícia de ataque",
        tipo: "selecao",
        valor: atual.periciaId || "",
        opcoes: [{ valor: "", rotulo: "Nenhuma" }].concat(
          (ctx.ficha.pericias || []).map(function (p) { return { valor: p.id, rotulo: p.nome }; })
        ),
      });
      extras.dano = UI.campo({ rotulo: "Dano", valor: atual.dano, limite: 12, ajuda: "NdX, ex. 2d10" });
      extras.danoExtra = UI.campo({
        rotulo: "Dano extra", valor: atual.danoExtra, limite: 20,
        ajuda: "Um número (4) ou um dado (1d6). Nunca é multiplicado no crítico.",
      });
      extras.critico = UI.campo({
        rotulo: "Crítico", tipo: "numero", valor: atual.critico,
        ajuda: "A face a partir da qual o ataque é crítico. 0 desliga.",
      });
      extras.multiplicador = UI.campo({
        rotulo: "Multiplicador", tipo: "numero", valor: atual.multiplicador,
        ajuda: "Multiplica a quantidade de dados-base: 2d10 x2 vira 4d10.",
      });

      if (extras.pericia) campos.push(extras.pericia);
      campos.push(el("div.editar-grade", {}, [extras.dano, extras.danoExtra]));
      campos.push(el("div.editar-grade", {}, [extras.critico, extras.multiplicador]));
    }

    if (tipo === "armadura") {
      extras.defesa = UI.campo({ rotulo: "Defesa", tipo: "numero", valor: atual.defesa });
      campos.push(extras.defesa);
    }

    if (extras.ordem) campos = campos.concat(extras.ordem.elementos);

    campos.push(descricao);

    var naBiblioteca = criando;
    if (criando) {
      campos.push(el("label.r-marca", {}, [
        el("input", {
          type: "checkbox", checked: true,
          onchange: function (ev) { naBiblioteca = ev.target.checked; },
        }),
        el("span", { texto: "Guardar também na biblioteca Homebrew" }),
      ]));
    }

    UI.modal({
      titulo: (criando ? "Novo " : "Editar ") + F.rotuloDoTipo(tipo).toLowerCase(),
      conteudo: el("div.pilha", {}, campos),
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        {
          rotulo: criando ? "Adicionar" : "Salvar",
          classe: "r-botao--principal",
          aoClicar: async function (fechar) {
            var montado = coletar(tipo, atual, nome, descricao, extras);
            if (!montado) return;

            if (criando) {
              montado.adicionadoEm = U.agoraISO();
              ctx.ficha.inventario.itens.push(montado);
            } else {
              /* Tirar a etiqueta precisa apagar o campo: o item montado
                 simplesmente não o tem, e Object.assign não apaga nada. */
              delete item.etiqueta;
              Object.assign(item, montado, { id: item.id });
            }

            ctx.alterou();
            fechar();
            ctx.redesenhar();

            if (criando && naBiblioteca) await paraHomebrew(ctx, montado, true);
          },
        },
      ],
    });

    nome.entrada.focus();
  }

  /* Lê os campos, valida e devolve o item pronto — ou null, deixando
     os erros marcados na tela. */
  function coletar(tipo, base, nome, descricao, extras) {
    var dados = {
      nome: nome.entrada.value.trim(),
      categoria: extras.categoria ? extras.categoria.entrada.value.trim() : (base.categoria || ""),
      descricao: descricao.entrada.value,
      origemHomebrewId: base.origemHomebrewId || null,
      origemCatalogoId: base.origemCatalogoId || null,
      etiqueta: extras.etiqueta ? extras.etiqueta() : base.etiqueta,
    };

    nome.marcarErro("");
    if (!dados.nome) { nome.marcarErro("Informe um nome."); nome.entrada.focus(); return null; }

    if (extras.ordem) {
      var ordem = extras.ordem.coletar();
      if (!ordem) return null;
      dados.ordem = ordem;
      dados.peso = base.peso;
      dados.reducaoPeso = base.reducaoPeso;
    } else if (tipo === "mochila") {
      var red = V.peso(extras.reducao.entrada.value);
      extras.reducao.marcarErro(red.ok ? "" : red.mensagem);
      if (!red.ok) return null;
      dados.reducaoPeso = red.valor;
    } else {
      var p = V.peso(extras.peso.entrada.value);
      extras.peso.marcarErro(p.ok ? "" : p.mensagem);
      if (!p.ok) return null;
      dados.peso = p.valor;
    }

    if (tipo === "arma") {
      var d = V.dadoOpcional(extras.dano.entrada.value);
      extras.dano.marcarErro(d.ok ? "" : d.mensagem);
      if (!d.ok) return null;

      var c = V.critico(extras.critico.entrada.value);
      extras.critico.marcarErro(c.ok ? "" : c.mensagem);
      if (!c.ok) return null;

      var m = V.multiplicador(extras.multiplicador.entrada.value);
      extras.multiplicador.marcarErro(m.ok ? "" : m.mensagem);
      if (!m.ok) return null;

      var extra = extras.danoExtra.entrada.value.trim();
      if (extra && !/^[+-]?\d+$/.test(extra) && !D.valida(extra)) {
        extras.danoExtra.marcarErro("Use um número (4) ou uma expressão de dado (1d6).");
        return null;
      }
      extras.danoExtra.marcarErro("");

      dados.periciaId = extras.pericia ? (extras.pericia.entrada.value || null) : (base.periciaId || null);
      dados.dano = d.valor;
      dados.danoExtra = extra;
      dados.critico = c.valor;
      dados.multiplicador = m.valor;
    }

    if (tipo === "armadura") {
      var def = V.inteiroEntre(extras.defesa.entrada.value, -999, 999, "A defesa");
      extras.defesa.marcarErro(def.ok ? "" : def.mensagem);
      if (!def.ok) return null;
      dados.defesa = def.valor;
    }

    var item = F.criarItem(tipo, dados);
    if (base.id) item.id = base.id;
    return item;
  }

  async function remover(ctx, item) {
    var certeza = await UI.confirmar({
      titulo: "Remover " + item.nome + "?",
      texto: "O item sai desta ficha.",
      detalhe: "A cópia guardada na biblioteca Homebrew, se houver, continua lá.",
      rotuloConfirmar: "Remover",
      perigo: true,
    });
    if (!certeza) return;

    ctx.ficha.inventario.itens = ctx.ficha.inventario.itens.filter(function (x) { return x.id !== item.id; });
    ctx.alterou();
    ctx.redesenhar();
  }

  /* =================================================================
     BIBLIOTECA HOMEBREW
     -----------------------------------------------------------------
     A ida guarda um modelo. A volta traz uma CÓPIA — e é isso que
     impede "editar a espada na biblioteca" de mudar retroativamente
     todas as fichas que já usavam aquela espada. O rastro de onde veio
     fica em origemHomebrewId, que é informação, não vínculo vivo.
     ================================================================= */

  async function paraHomebrew(ctx, item, silencioso) {
    var registro = F.normalizarItem(item);
    registro.id = item.origemHomebrewId || U.uuid();
    delete registro.origemHomebrewId;

    var r = await global.RAMAApi.salvarHomebrew(registro);
    if (!r.ok) {
      if (!silencioso) UI.avisoDeFalha(r, "envio para a biblioteca");
      return;
    }

    /* Guarda de onde veio, para a próxima ida atualizar o mesmo
       registro em vez de criar um segundo igual. */
    var id = (r.dados && r.dados.id) || registro.id;
    var naFicha = U.porId(ctx.ficha.inventario.itens, item.id);
    if (naFicha && naFicha.origemHomebrewId !== id) {
      naFicha.origemHomebrewId = id;
      ctx.alterou();
    }

    if (!silencioso) UI.avisoOk(item.nome + " foi guardado na biblioteca.");
  }

  /* A janela "Da biblioteca". Sem o módulo (página sem o arquivo), cai na
     Homebrew simples de antes — nada quebra. */
  function daBiblioteca(ctx) {
    if (global.RAMABibliotecaDeItens) {
      global.RAMABibliotecaDeItens.abrir(ctx);
      return;
    }
    UI.avisoErro("A biblioteca de itens não carregou nesta página. Recarregue a ficha e tente de novo.");
  }

  global.RAMASecaoInventario = {
    aba: aba,
    atacar: atacar,
    rolarDano: rolarDano,
    /* Para a biblioteca vazia oferecer "Criar item". */
    novoItem: function (ctx) { escolherTipo(ctx); },
  };
})(window);
