/* =====================================================================
   R.A.M.A. — ficha · habilidades
   ---------------------------------------------------------------------
   A árvore de pastas e as habilidades dentro dela.

   Habilidade é INFORMAÇÃO: clicar nela abre o texto, não rola dado
   nenhum. Quem quiser rolar algo tem atributos, perícias e armas — e
   misturar as duas naturezas faria a ficha disparar dados por engano no
   meio de uma leitura.

   A árvore é desenhada por recursão, do mesmo jeito que é modelada.
   Desenhar dois níveis fixos aqui desmentiria o modelo na primeira
   subpasta de subpasta.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var H = global.RAMAHabilidades;
  var el = U.el;

  function aba(ctx) {
    var arvore = ctx.ficha.habilidades;
    var total = H.contar(arvore);

    return el("div.pilha--larga", { class: "pilha" }, [
      UI.painel("Habilidades", corpo(ctx, arvore), {
        acoes: ctx.emEdicao() ? [
          el("button.r-botao.r-botao--mini", {
            type: "button", texto: "+ Pasta", onclick: function () { novaPasta(ctx, null); },
          }),
          el("button.r-botao.r-botao--mini", {
            type: "button", texto: "+ Habilidade", onclick: function () { editar(ctx, null, null); },
          }),
          el("button.r-botao.r-botao--mini", {
            type: "button", texto: "Da biblioteca", onclick: function () { daBiblioteca(ctx, null); },
          }),
        ] : null,
      }),

      total.habilidades
        ? el("p.t-mini", {
            texto: total.habilidades + " habilidade(s) em " + total.pastas + " pasta(s).",
          })
        : null,
    ]);
  }

  function corpo(ctx, arvore) {
    if (!arvore.filhos.length) {
      return UI.vazio({
        titulo: "Nenhuma habilidade",
        texto: ctx.emEdicao()
          ? "Crie uma habilidade, ou traga uma da sua biblioteca. Pastas podem conter outras pastas, quantas forem necessárias."
          : "Entre no modo edição para acrescentar habilidades.",
        acao: ctx.emEdicao()
          ? { rotulo: "+ Habilidade", aoClicar: function () { editar(ctx, null, null); } }
          : null,
      });
    }

    return el("div.arvore-hab", {}, ramos(ctx, arvore.filhos, 0));
  }

  /* A recursão. Cada nível devolve os próprios filhos e chama a si
     mesmo para as pastas — sem limite escrito aqui, porque o limite é
     do modelo e já foi aplicado na normalização. */
  function ramos(ctx, filhos, profundidade) {
    return (filhos || []).map(function (no) {
      return no.tipo === H.TIPO_PASTA
        ? pasta(ctx, no, profundidade)
        : habilidade(ctx, no, profundidade);
    });
  }

  function pasta(ctx, no, profundidade) {
    var conteudo = H.conteudoDaPasta(no);

    var acoes = ctx.emEdicao() ? [
      UI.menu([
        { rotulo: "Nova habilidade aqui", aoClicar: function () { editar(ctx, null, no.id); } },
        { rotulo: "Da biblioteca", aoClicar: function () { daBiblioteca(ctx, no.id); } },
        { rotulo: "Nova subpasta", aoClicar: function () { novaPasta(ctx, no.id); } },
        "separador",
        { rotulo: "Renomear", aoClicar: function () { renomear(ctx, no); } },
        { rotulo: "Mover", aoClicar: function () { mover(ctx, no); } },
        { rotulo: "Subir", aoClicar: function () { reordenar(ctx, no.id, -1); } },
        { rotulo: "Descer", aoClicar: function () { reordenar(ctx, no.id, 1); } },
        "separador",
        { rotulo: "Excluir pasta", perigo: true, aoClicar: function () { excluirPasta(ctx, no); } },
      ], { rotulo: "Opções da pasta " + no.nome, icone: "tresPontos" }),
    ] : null;

    var dentro = no.filhos.length
      ? ramos(ctx, no.filhos, profundidade + 1)
      : [el("p.t-mini", { texto: "Pasta vazia." })];

    var caixa = UI.recolhivel({
      titulo: no.nome,
      extra: conteudo.habilidades + (conteudo.pastas ? " · " + conteudo.pastas + " pasta(s)" : ""),
      aberto: no.aberta !== false,
      classe: "recolhivel--pasta",
      conteudo: dentro,
      acoes: acoes,
      /* O estado aberto/fechado é da ficha, e sobe junto: quem organizou
         a árvore em pastas fechadas não quer encontrá-las abertas no
         outro aparelho. */
      aoAlternar: function (aberta) {
        if (no.aberta === aberta) return;
        no.aberta = aberta;
        ctx.alterou();
      },
    });

    return caixa;
  }

  function habilidade(ctx, no, profundidade) {
    var acoes = ctx.emEdicao() ? [
      UI.menu([
        { rotulo: "Editar", aoClicar: function () { editar(ctx, no, null); } },
        { rotulo: "Mover", aoClicar: function () { mover(ctx, no); } },
        { rotulo: "Subir", aoClicar: function () { reordenar(ctx, no.id, -1); } },
        { rotulo: "Descer", aoClicar: function () { reordenar(ctx, no.id, 1); } },
        { rotulo: "Enviar à biblioteca", aoClicar: function () { paraBiblioteca(ctx, no); } },
        "separador",
        { rotulo: "Remover", perigo: true, aoClicar: function () { remover(ctx, no); } },
      ], { rotulo: "Opções de " + no.nome, icone: "tresPontos" }),
    ] : null;

    var texto = el("p.habilidade__texto", {
      class: no.negrito ? "habilidade__texto--negrito" : "",
      texto: no.texto || "Sem descrição.",
    });

    var caixa = UI.recolhivel({
      titulo: no.nome,
      extra: no.origem || "",
      conteudo: [texto],
      acoes: acoes,
    });

    /* A cor é aplicada como VALOR de propriedade, nunca concatenada
       numa string de CSS — e já veio validada como hexadecimal pelo
       modelo. É o que impede um texto vindo de importação de virar
       declaração de estilo. */
    if (no.cor) {
      caixa.dataset.cor = "sim";
      caixa.style.setProperty("border-left-color", no.cor);
    }

    return caixa;
  }

  /* =================================================================
     PASTAS
     ================================================================= */

  async function novaPasta(ctx, paiId) {
    var nome = await UI.pedirTexto({
      titulo: "Nova pasta", rotulo: "Nome da pasta", valor: "", limite: 80,
    });
    if (nome === null) return;

    H.inserir(ctx.ficha.habilidades, H.criarPasta(nome || "Nova pasta"), paiId);
    ctx.alterou();
    ctx.redesenhar();
  }

  async function renomear(ctx, no) {
    var nome = await UI.pedirTexto({
      titulo: "Renomear", rotulo: "Nome", valor: no.nome, limite: 80,
    });
    if (nome === null) return;
    no.nome = U.aparar(nome, 80) || no.nome;
    ctx.alterou();
    ctx.redesenhar();
  }

  /* Excluir pasta com conteúdo NÃO apaga em silêncio. A janela diz
     quantas habilidades estão lá dentro e oferece manter. */
  async function excluirPasta(ctx, no) {
    var conteudo = H.conteudoDaPasta(no);

    if (!conteudo.habilidades && !conteudo.pastas) {
      var vazia = await UI.confirmar({
        titulo: "Excluir " + no.nome + "?",
        texto: "A pasta está vazia e será removida.",
        rotuloConfirmar: "Excluir", perigo: true,
      });
      if (!vazia) return;
      H.remover(ctx.ficha.habilidades, no.id);
      ctx.alterou();
      ctx.redesenhar();
      return;
    }

    UI.modal({
      titulo: "Excluir " + no.nome + "?",
      conteudo: [
        el("p", {
          texto: "Esta pasta tem " + conteudo.habilidades + " habilidade(s)" +
                 (conteudo.pastas ? " e " + conteudo.pastas + " subpasta(s)" : "") + ".",
        }),
        el("p.t-mini", { texto: "Você pode manter o conteúdo, que sobe um nível, ou apagar tudo junto." }),
      ],
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        {
          rotulo: "Apagar tudo", classe: "r-botao--perigo",
          aoClicar: function (fechar) {
            H.remover(ctx.ficha.habilidades, no.id);
            fechar(); ctx.alterou(); ctx.redesenhar();
          },
        },
        {
          rotulo: "Manter conteúdo", classe: "r-botao--principal",
          aoClicar: function (fechar) {
            H.esvaziarPara(ctx.ficha.habilidades, no.id);
            fechar(); ctx.alterou(); ctx.redesenhar();
          },
        },
      ],
    });
  }

  /* =================================================================
     MOVER E REORDENAR
     ================================================================= */

  function mover(ctx, no) {
    var destinos = H.destinosPossiveis(ctx.ficha.habilidades, no.id);
    var escolhido = "";

    var seletor = UI.campo({
      rotulo: "Mover para",
      tipo: "selecao",
      valor: "",
      opcoes: destinos.map(function (d) {
        return { valor: d.id || "", rotulo: d.caminho };
      }),
      aoMudar: function (v) { escolhido = v; },
    });

    UI.modal({
      titulo: "Mover " + no.nome,
      conteudo: [
        seletor,
        el("p.t-mini", {
          texto: "Uma pasta não aparece na lista se for ela mesma ou algo dentro dela — mover para lá desligaria o ramo da árvore.",
        }),
      ],
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        {
          rotulo: "Mover", classe: "r-botao--principal",
          aoClicar: function (fechar) {
            var destino = escolhido || seletor.entrada.value;
            if (!H.mover(ctx.ficha.habilidades, no.id, destino || null)) {
              UI.avisoErro("Não foi possível mover para lá.");
              return;
            }
            fechar(); ctx.alterou(); ctx.redesenhar();
          },
        },
      ],
    });
  }

  function reordenar(ctx, id, direcao) {
    if (!H.reordenar(ctx.ficha.habilidades, id, direcao)) return;
    ctx.alterou();
    ctx.redesenhar();
  }

  /* =================================================================
     CRIAR E EDITAR
     ================================================================= */

  function editar(ctx, no, pastaId) {
    var criando = !no;
    var atual = no || H.criarHabilidade({});
    var cor = atual.cor;
    var negrito = !!atual.negrito;

    var nome = UI.campo({ rotulo: "Nome", valor: atual.nome, limite: 120 });
    var origem = UI.campo({
      rotulo: "Origem", valor: atual.origem, limite: 60,
      ajuda: "De onde ela vem: classe, trilha, item, ritual… Texto livre.",
    });
    var texto = UI.campo({
      rotulo: "Texto", tipo: "area", valor: atual.texto, linhas: 6, limite: 8000,
    });

    var seletorCor = UI.seletorDeCor({
      rotulo: "Cor de identificação",
      valor: cor,
      aoMudar: function (v) { cor = v; },
    });

    var marcaNegrito = el("label.r-marca", {}, [
      el("input", {
        type: "checkbox", checked: negrito,
        onchange: function (ev) { negrito = ev.target.checked; },
      }),
      el("span", { texto: "Texto em negrito" }),
    ]);

    var guardarNaBiblioteca = criando;
    var marcaBiblioteca = criando ? el("label.r-marca", {}, [
      el("input", {
        type: "checkbox", checked: true,
        onchange: function (ev) { guardarNaBiblioteca = ev.target.checked; },
      }),
      el("span", { texto: "Guardar também na biblioteca Homebrew" }),
    ]) : null;

    UI.modal({
      titulo: criando ? "Nova habilidade" : "Editar habilidade",
      largo: true,
      conteudo: el("div.pilha", {}, [
        nome,
        origem,
        texto,
        marcaNegrito,
        seletorCor,
        el("p.t-mini", {
          texto: "A cor é um detalhe de contorno. Ela nunca é a única forma de identificar a habilidade — nome e origem continuam valendo.",
        }),
        marcaBiblioteca,
      ]),
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        {
          rotulo: criando ? "Criar" : "Salvar",
          classe: "r-botao--principal",
          aoClicar: async function (fechar) {
            var valor = nome.entrada.value.trim();
            if (!valor) { nome.marcarErro("Informe um nome."); nome.entrada.focus(); return; }

            var montada = {
              nome: valor,
              origem: origem.entrada.value.trim(),
              texto: texto.entrada.value,
              cor: cor,
              negrito: negrito,
              origemHabilidadeId: atual.origemHabilidadeId || null,
            };

            if (criando) {
              var nova = H.criarHabilidade(montada);
              H.inserir(ctx.ficha.habilidades, nova, pastaId);
              ctx.alterou();
              fechar();
              ctx.redesenhar();
              if (guardarNaBiblioteca) await paraBiblioteca(ctx, nova, true);
              return;
            }

            Object.assign(no, H.criarHabilidade(montada), { id: no.id });
            ctx.alterou();
            fechar();
            ctx.redesenhar();
          },
        },
      ],
    });

    nome.entrada.focus();
  }

  async function remover(ctx, no) {
    var certeza = await UI.confirmar({
      titulo: "Remover " + no.nome + "?",
      texto: "A habilidade sai desta ficha.",
      detalhe: "A cópia guardada na biblioteca, se houver, continua lá.",
      rotuloConfirmar: "Remover", perigo: true,
    });
    if (!certeza) return;

    H.remover(ctx.ficha.habilidades, no.id);
    ctx.alterou();
    ctx.redesenhar();
  }

  /* =================================================================
     BIBLIOTECA
     -----------------------------------------------------------------
     Mesma relação que já vale para o inventário: MODELO e CÓPIA. O que
     entra na ficha tem id próprio e guarda só o rastro de onde veio.
     ================================================================= */

  async function paraBiblioteca(ctx, no, silencioso) {
    var registro = H.normalizarHabilidade(no);
    registro.tipo = "habilidade";
    registro.id = no.origemHabilidadeId || U.uuid();

    var r = await global.RAMAApi.salvarHomebrew(registro);
    if (!r.ok) {
      if (!silencioso) UI.avisoDeFalha(r, "envio para a biblioteca");
      return;
    }

    var id = (r.dados && r.dados.id) || registro.id;
    if (no.origemHabilidadeId !== id) {
      no.origemHabilidadeId = id;
      ctx.alterou();
    }

    if (!silencioso) UI.avisoOk(no.nome + " foi guardada na biblioteca.");
  }

  async function daBiblioteca(ctx, pastaId) {
    var aviso = UI.aviso("Consultando biblioteca…", { duracao: 30000 });

    var [minhas, publicas] = await Promise.all([
      global.RAMAApi.listarHomebrew({ escopo: "meus", tipo: "habilidade" }),
      global.RAMAApi.listarHomebrew({ escopo: "publicos", tipo: "habilidade" }),
    ]);
    aviso();

    if (!minhas.ok) { UI.avisoDeFalha(minhas, "leitura da biblioteca"); return; }

    var registros = (minhas.dados || []).map(function (h) { return Object.assign({ escopo: "minha" }, h); })
      .concat(((publicas.ok && publicas.dados) || []).map(function (h) { return Object.assign({ escopo: "geral" }, h); }));

    if (!registros.length) {
      UI.modal({
        titulo: "Nenhuma habilidade disponível",
        conteudo: [
          el("p", { texto: "Você ainda não guardou habilidades na biblioteca, e nenhuma foi publicada." }),
          el("p.t-mini", {
            texto: "As habilidades GERAIS são as que outras contas publicaram. O R.A.M.A. não traz nenhuma pronta — o catálogo é o que vocês criarem.",
          }),
        ],
        botoes: [{ rotulo: "Entendi", classe: "r-botao--principal" }],
      });
      return;
    }

    var filtro = "";
    var escopo = "";
    var lista = el("div.pilha--curta", { class: "pilha" });

    function pintar() {
      var chave = U.chaveDeBusca(filtro);
      var visiveis = registros.filter(function (h) {
        if (escopo && h.escopo !== escopo) return false;
        if (!chave) return true;
        return U.chaveDeBusca(h.nome + " " + (h.origem || "")).indexOf(chave) >= 0;
      });

      U.trocar(lista, visiveis.length
        ? visiveis.map(function (h) {
            return el("button.r-cartao", {
              type: "button",
              estilo: { textAlign: "left", width: "100%", cursor: "pointer" },
              onclick: function () { trazer(ctx, h, pastaId); m.fechar(); },
            }, [
              el("div.faixa.faixa--entre", {}, [
                el("span.t-forte", { texto: h.nome }),
                el("span.r-etiqueta", { texto: h.escopo === "geral" ? "Geral" : "Minha" }),
              ]),
              h.origem ? el("p.t-mini", { texto: h.origem }) : null,
              h.texto ? el("p.t-mini", { texto: String(h.texto).slice(0, 160) }) : null,
            ]);
          })
        : el("p.t-mini", { texto: "Nada corresponde à busca." })
      );
    }

    var m = UI.modal({
      titulo: "Trazer da biblioteca",
      largo: true,
      conteudo: [
        el("div.filtros", {}, [
          el("div.r-busca", {}, [
            el("span.r-busca__marca", {}, [UI.simbolo("busca")]),
            el("input.r-entrada", {
              type: "search", placeholder: "Buscar habilidade", "aria-label": "Buscar habilidade",
              oninput: function (ev) { filtro = ev.target.value; pintar(); },
            }),
          ]),
          el("div.filtros__grupo", { role: "group", "aria-label": "Escopo" },
            [{ v: "", r: "Todas" }, { v: "minha", r: "Minhas" }, { v: "geral", r: "Gerais" }].map(function (op) {
              return el("button.filtro", {
                type: "button",
                "aria-pressed": String(escopo === op.v),
                texto: op.r,
                onclick: function (ev) {
                  escopo = op.v;
                  U.$$(".filtro", ev.target.parentNode).forEach(function (b) {
                    b.setAttribute("aria-pressed", String(b === ev.target));
                  });
                  pintar();
                },
              });
            })
          ),
        ]),
        lista,
        el("p.t-mini", {
          texto: "A habilidade entra na ficha como cópia. Editá-la aqui não muda o modelo, e editar o modelo não muda esta ficha.",
        }),
      ],
      botoes: [{ rotulo: "Fechar", classe: "r-botao--fantasma" }],
    });

    pintar();
  }

  function trazer(ctx, registro, pastaId) {
    var copia = H.copiarParaFicha(registro);
    if (!copia) { UI.avisoErro("Esta habilidade não pôde ser lida."); return; }

    H.inserir(ctx.ficha.habilidades, copia, pastaId);
    ctx.alterou();
    ctx.redesenhar();
    UI.avisoOk(copia.nome + " entrou na ficha.");
  }

  global.RAMASecaoHabilidades = { aba: aba };
})(window);
