/* =====================================================================
   R.A.M.A. — Personagens
   ---------------------------------------------------------------------
   A lista de quem existe no arquivo desta conta, com busca, criação e
   as ações de cada registro.

   Duas decisões de desenho que vieram das referências mas mudaram:

   · O X permanente em cada linha virou um menu [ ... ]. Um botão de
     apagar do tamanho de um dedo, ao lado do nome, na tela em que se
     abre a ficha com pressa no meio de uma sessão, é um acidente
     esperando acontecer. Abrir, duplicar e excluir moram no menu, e
     excluir ainda pede confirmação.

   · A lista carrega só o cabeçalho de cada personagem. A ficha inteira
     vem quando ela for aberta. Trinta fichas completas para desenhar
     trinta nomes seria megabytes por tela.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var el = U.el;

  var registros = [];
  var busca = "";
  var painel = null;

  global.RAMAApp.iniciar("personagens", async function () {
    painel = U.$("#painel-personagens");
    await carregar();

    /* A Home manda para cá com ?novo=1 quando o arquivo está vazio. */
    if (U.parametro("novo")) abrirEscolhaDeTipo();
  });

  async function carregar() {
    U.trocar(painel, [cabecalho(), UI.carregando("Consultando arquivo")]);

    var r = await global.RAMAApi.listarPersonagens();
    if (!r.ok) {
      U.trocar(painel, [cabecalho(), UI.erroDeTela(r, carregar)]);
      return;
    }

    registros = r.dados || [];
    desenhar();
  }

  function cabecalho() {
    return global.RAMAApp.titulo({
      titulo: "Personagens",
      trilha: ["Arquivo // " + registros.length + " registro(s)"],
      acoes: [
        el("button.r-botao.r-botao--principal", {
          type: "button", texto: "+ Adicionar personagem", onclick: abrirEscolhaDeTipo,
        }),
      ],
    });
  }

  function desenhar() {
    var visiveis = filtrar();

    U.trocar(painel, [
      cabecalho(),

      registros.length > 4 ? el("div.filtros", {}, [
        el("div.r-busca", {}, [
          el("span.r-busca__marca", {}, [UI.simbolo("busca")]),
          el("input.r-entrada", {
            type: "search",
            value: busca,
            placeholder: "Buscar por nome, campanha, classe ou origem",
            "aria-label": "Buscar personagem",
            oninput: function (ev) { busca = ev.target.value; desenhar(); },
          }),
        ]),
      ]) : null,

      visiveis.length
        ? el("div.registros", {}, visiveis.map(linha))
        : (registros.length ? nadaEncontrado() : nenhumRegistro()),
    ]);
  }

  function filtrar() {
    var chave = U.chaveDeBusca(busca);
    if (!chave) return registros;
    return registros.filter(function (p) {
      return U.chaveDeBusca(
        [p.nome, p.campanha, p.classe, p.origem].join(" ")
      ).indexOf(chave) >= 0;
    });
  }

  function nenhumRegistro() {
    return UI.vazio({
      titulo: "Nenhum personagem arquivado",
      texto: "Crie seu primeiro registro para começar.",
      acao: { rotulo: "+ Adicionar personagem", aoClicar: abrirEscolhaDeTipo },
    });
  }

  function nadaEncontrado() {
    return UI.vazio({
      titulo: "Nada encontrado",
      texto: "Nenhum personagem corresponde a “" + busca + "”.",
      acao: { rotulo: "Limpar busca", aoClicar: function () { busca = ""; desenhar(); } },
    });
  }

  function linha(p) {
    var abrir = function () { location.href = U.url("ficha/?id=" + encodeURIComponent(p.id)); };

    return el("div.r-cartao.registro", { estilo: { position: "relative" } }, [
      /* O cartão inteiro é o alvo de abertura; o menu fica por cima
         dele, com z-index maior, para não abrir a ficha ao clicar em
         "Excluir". */
      el("a.registro__link", {
        href: U.url("ficha/?id=" + encodeURIComponent(p.id)),
        "aria-label": "Abrir ficha de " + (p.nome || "personagem"),
      }),

      avatar(p),

      el("div.registro__corpo", {}, [
        el("span.registro__nome", { texto: p.nome || "Sem nome" }),
        el("span.registro__sub", { texto: subtitulo(p) }),
      ]),

      el("span.registro__data", {}, [
        el("span", { texto: U.dataCurta(p.criadoEm) }),
        el("br"),
        el("span.t-mini", { texto: "Registro // " + U.codigoCurto(p.id) }),
      ]),

      UI.menu([
        { rotulo: "Abrir", aoClicar: abrir },
        { rotulo: "Duplicar", aoClicar: function () { duplicar(p); } },
        "separador",
        { rotulo: "Excluir", perigo: true, aoClicar: function () { excluir(p); } },
      ], { rotulo: "Opções de " + (p.nome || "personagem"), icone: "tresPontos" }),
    ]);
  }

  function avatar(p) {
    var caixa = el("span.r-avatar", { "aria-hidden": "true" });
    if (p.foto) caixa.appendChild(el("img", { src: p.foto, alt: "" }));
    else caixa.textContent = U.iniciais(p.nome);
    return caixa;
  }

  function subtitulo(p) {
    var partes = [];
    if (p.campanha) partes.push(p.campanha);
    if (p.classe) partes.push(p.classe);
    if (p.origem) partes.push(p.origem);
    return partes.length ? partes.join(" · ") : "Sem campanha";
  }

  /* =================================================================
     CRIAÇÃO — A ESCOLHA DO MODELO
     -----------------------------------------------------------------
     Antes de qualquer campo, uma pergunta: que ficha é esta?

     A escolha vem primeiro porque ela muda tudo o que vem depois. Uma
     ficha de Ordem tem criação guiada, cálculo automático e catálogo;
     uma universal tem campos livres. Perguntar no fim, depois de a
     pessoa já ter preenchido nome e classe, seria perguntar tarde.

     O tipo é gravado num campo e não muda depois — ver o bloco de tipo
     em js/ficha.js. Por isso a tela diz isso aqui, antes, e não depois
     de já ser tarde. */
  function abrirEscolhaDeTipo() {
    function cartao(o) {
      return el("button.tipo-ficha", {
        type: "button",
        onclick: function () { if (o.aoEscolher) o.aoEscolher(); },
      }, [
        el("span.tipo-ficha__nome", { texto: o.nome }),
        el("span.tipo-ficha__resumo", { texto: o.resumo }),
        el("ul.tipo-ficha__lista", {}, o.pontos.map(function (t) {
          return el("li", { texto: t });
        })),
      ]);
    }

    var m = UI.modal({
      titulo: "Que tipo de ficha?",
      largo: true,
      conteudo: [
        el("div.tipos-ficha", {}, [
          cartao({
            nome: "Ordem Paranormal",
            resumo: "A ficha do sistema, com as regras dos livros.",
            pontos: [
              "Criação guiada passo a passo",
              "PV, PE, Sanidade, Defesa e carga calculados",
              "Catálogo de origens, classes e trilhas com página do livro",
              "Regras opcionais do Sobrevivendo ao Horror",
            ],
            aoEscolher: function () { m.fechar(); abrirCriacaoOrdem(); },
          }),
          cartao({
            nome: "Universal",
            resumo: "O modelo flexível do R.A.M.A., para qualquer sistema.",
            pontos: [
              "Atributos, perícias e status que você define",
              "Seções e rótulos com o nome da sua mesa",
              "Nenhuma regra imposta",
              "É o que toda ficha criada até hoje usa",
            ],
            aoEscolher: function () { m.fechar(); abrirCriacao(); },
          }),
        ]),
        el("p.t-mini", {
          texto: "A escolha fica gravada na ficha e não muda depois. Não existe conversão " +
                 "automática entre os dois modelos: ela teria de adivinhar o que vira o quê, " +
                 "e adivinhar aqui é perder dado em silêncio.",
        }),
      ],
      botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }],
    });

    return m;
  }

  /* Abre a criação guiada de Ordem, se o módulo dela estiver carregado.
     Sem ele, a tela diz o que falta em vez de não fazer nada. */
  async function abrirCriacaoOrdem() {
    if (!global.RAMAOrdemCriar) {
      UI.avisoErro("A criação de Ordem Paranormal não está disponível nesta página.");
      return;
    }
    var campanhas = [];
    var r = await global.RAMAApi.listarCampanhas();
    if (r.ok) campanhas = r.dados || [];
    global.RAMAOrdemCriar.abrir({ campanhas: campanhas });
  }

  /* =================================================================
     CRIAÇÃO UNIVERSAL
     -----------------------------------------------------------------
     Só o nome é obrigatório. Classe, origem, campanha e foto podem
     esperar — quem cria um personagem no meio de uma sessão não quer
     preencher formulário, quer a ficha aberta.
     ================================================================= */

  async function abrirCriacao() {
    var campanhas = [];
    var r = await global.RAMAApi.listarCampanhas();
    if (r.ok) campanhas = r.dados || [];

    var nome = UI.campo({ rotulo: "Nome", limite: 80, dica: "Como o personagem é chamado" });
    var classe = UI.campo({ rotulo: "Classe", limite: 60, dica: "opcional" });
    var origem = UI.campo({ rotulo: "Origem", limite: 60, dica: "opcional" });

    var campanha = UI.campo({
      rotulo: "Campanha",
      tipo: "selecao",
      opcoes: [{ valor: "", rotulo: "Sem campanha" }].concat(
        campanhas.map(function (c) { return { valor: c.id, rotulo: c.nome }; })
      ),
    });

    var fotoPreparada = "";
    var previa = el("span.r-avatar.r-avatar--g", { "aria-hidden": "true", texto: "?" });

    var botaoFoto = el("button.r-botao.r-botao--fantasma", {
      type: "button", texto: "Escolher foto",
      onclick: async function () {
        botaoFoto.disabled = true;
        var img = await global.RAMAImagem.escolher();
        botaoFoto.disabled = false;
        if (!img.ok) {
          if (img.erro !== "cancelado") UI.avisoErro(img.mensagem || "Não foi possível usar esta imagem.");
          return;
        }
        fotoPreparada = img.imagem;
        U.trocar(previa, [el("img", { src: img.imagem, alt: "" })]);
      },
    });

    var criando = false;

    UI.modal({
      titulo: "Novo personagem",
      conteudo: [
        el("div.faixa", {}, [previa, botaoFoto]),
        nome,
        el("div.editar-grade", {}, [classe, origem]),
        campanha,
        el("p.t-mini", { texto: "A ficha padrão é criada automaticamente: cinco atributos, PV, PE, Sanidade e as 28 perícias. Tudo pode ser mudado no modo edição." }),
      ],
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        {
          rotulo: "Criar registro",
          classe: "r-botao--principal",
          aoClicar: async function (fechar) {
            if (criando) return;

            var valor = nome.entrada.value.trim();
            if (!valor) {
              nome.marcarErro("Informe um nome para o personagem.");
              nome.entrada.focus();
              return;
            }

            criando = true;
            var ficha = global.RAMAFicha.criarFicha({
              nome: valor,
              tipoFicha: "universal",
              classe: classe.entrada.value.trim(),
              origem: origem.entrada.value.trim(),
              campanhaId: campanha.entrada.value || null,
            });

            var r = await global.RAMAApi.criarPersonagem(ficha);
            criando = false;

            if (!r.ok) { UI.avisoDeFalha(r, "criação de personagem"); return; }

            /* A foto vai numa gravação própria: ela não faz parte do
               JSON da ficha e a ficha não deve esperar por ela. */
            if (fotoPreparada && r.dados && r.dados.id) {
              var f = await global.RAMAApi.salvarFoto(r.dados.id, fotoPreparada);
              if (!f.ok) UI.avisoAtencao("O personagem foi criado, mas a foto não subiu. Você pode tentar de novo na ficha.");
            }

            fechar();
            location.href = U.url("ficha/?id=" + encodeURIComponent(r.dados.id));
          },
        },
      ],
    });

    nome.entrada.focus();
  }

  /* =================================================================
     DUPLICAR E EXCLUIR
     ================================================================= */

  async function duplicar(p) {
    var aviso = UI.aviso("Duplicando " + (p.nome || "personagem") + "…", { duracao: 30000 });
    var r = await global.RAMAApi.duplicarPersonagem(p.id);
    aviso();

    if (!r.ok) { UI.avisoDeFalha(r, "duplicação"); return; }

    UI.avisoOk("Cópia criada.");
    await carregar();
  }

  async function excluir(p) {
    var certeza = await UI.confirmar({
      titulo: "Excluir personagem?",
      texto: (p.nome || "Este personagem") + " será removido do seu arquivo.",
      detalhe: "Esta ação não pode ser desfeita. A ficha, a foto e as anotações somem junto.",
      rotuloConfirmar: "Excluir",
      perigo: true,
    });

    if (!certeza) return;

    var r = await global.RAMAApi.excluirPersonagem(p.id);
    if (!r.ok) { UI.avisoDeFalha(r, "exclusão"); return; }

    registros = registros.filter(function (x) { return x.id !== p.id; });
    desenhar();
    UI.avisoOk((p.nome || "O personagem") + " foi removido do arquivo.");
  }
})(window);
