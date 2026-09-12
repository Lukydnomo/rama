/* =====================================================================
   R.A.M.A. — Home
   ---------------------------------------------------------------------
   A apresentação do sistema: o que o R.A.M.A. faz, para quem, e por
   onde começar.

   Até a v2.4.0 esta tela era um painel com contagens e últimos
   registros. Ela passou a EXPLICAR o site, porque as próprias abas já
   mostram o que existe arquivado — a Home é o lugar de dizer o que dá
   para fazer com cada uma.

   ---------------------------------------------------------------------
   AS ILUSTRAÇÕES SÃO HTML, NÃO IMAGENS
   ---------------------------------------------------------------------

   Cada seção vem com uma miniatura montada com os mesmos traços da
   interface. Três motivos: não pesa nada, acompanha a escala de texto
   escolhida no Perfil, e não envelhece quando a tela de verdade muda de
   cor. Elas são decorativas (aria-hidden): o texto ao lado diz tudo o
   que a miniatura mostra.

   Nada aqui consulta o servidor. A sessão é conferida pela casca, como
   em toda página; o resto é conteúdo fixo.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el;

  global.RAMAApp.iniciar("home", function (agente) {
    var painel = U.$("#painel-home");

    U.trocar(painel, [
      abertura(agente),
      secao({
        marca: "01",
        titulo: "Fichas que fazem a conta",
        destaque: "Fichas",
        texto: [
          "Tudo o que o personagem é, num lugar só: atributos, perícias, recursos, habilidades, rituais, inventário e anotações.",
          "Um clique rola o atributo, a perícia, o ataque ou o dano. O resultado aparece com cada parcela aberta, e a matemática fica com o sistema.",
          "Existem dois modelos. A ficha Universal é livre para qualquer sistema. A ficha de Ordem Paranormal segue as regras dos livros.",
        ],
        lista: [
          "Modo normal para jogar e modo edição para mudar a estrutura",
          "Rituais com versões de dano, como Normal, Discente e Verdadeiro",
          "Exportar e importar a ficha em arquivo",
        ],
        acao: { rotulo: "Criar personagem", href: "personagens/?novo=1" },
        ilustracao: ilustracaoFicha(),
      }),
      secao({
        marca: "02",
        titulo: "Ordem Paranormal pelas regras",
        destaque: "Ordem Paranormal",
        lado: "invertido",
        texto: [
          "A criação guiada segue a ordem do livro: conceito, atributos, origem, classe e perícias. Dá para começar em NEX 5% ou já adiantado.",
          "PV, PE, Sanidade, Defesa e carga são calculados, e cada número abre a conta que o produziu.",
          "Cada etapa da progressão vira uma escolha com botão. A tela mostra só as opções que cabem e explica por que as outras não cabem.",
        ],
        lista: [
          "Poderes de classe, gerais, paranormais e de trilha, com livro e página",
          "Afinidade, patente e ajustes da mesa registrados na ficha",
          "Regras opcionais do Sobrevivendo ao Horror, uma chave para cada",
        ],
        ilustracao: ilustracaoOrdem(),
      }),
      secao({
        marca: "03",
        titulo: "Campanhas para a mesa inteira",
        destaque: "Campanhas",
        texto: [
          "Crie a campanha, convide os jogadores e vincule os personagens. Cada rolagem feita numa ficha vinculada entra no histórico da campanha.",
          "O mestre acompanha a ficha de todo mundo, ajusta vida e esforço sem abrir cada uma e conduz o combate com a ordem de iniciativa.",
        ],
        lista: [
          "Documentos e imagens liberados para quem o mestre escolher",
          "Rolagens ocultas e notas privadas do mestre",
          "Criaturas da biblioteca entram no combate como cópia",
        ],
        acao: { rotulo: "Abrir campanhas", href: "campanhas/" },
        ilustracao: ilustracaoCampanha(),
      }),
      secao({
        marca: "04",
        titulo: "Homebrew guardado para sempre",
        destaque: "Homebrew",
        lado: "invertido",
        texto: [
          "Itens, armas, proteções, habilidades e criaturas que a sua mesa inventou ficam numa biblioteca própria.",
          "Trazer algo da biblioteca para a ficha cria uma cópia. Editar o modelo depois não muda nenhuma ficha que já o usa.",
        ],
        lista: [
          "Registro privado ou público, à sua escolha",
          "Tudo o que é criado no inventário também pode entrar na biblioteca",
        ],
        acao: { rotulo: "Abrir Homebrew", href: "homebrew/" },
        ilustracao: ilustracaoHomebrew(),
      }),
      secao({
        marca: "05",
        titulo: "Salvo sozinho, e só seu",
        destaque: "Salvo",
        texto: [
          "A ficha salva enquanto você mexe. Se dois aparelhos alterarem a mesma ficha, o sistema junta o que dá e pergunta só o que realmente conflita.",
          "Os dados vivem na planilha do arquivo, e cada leitura e gravação é conferida no servidor. O que é de outra conta não chega até você.",
        ],
        ilustracao: ilustracaoSalvamento(),
      }),
      comoComecar(),
      aviso(),
    ]);
  });

  /* =================================================================
     ABERTURA
     ================================================================= */

  function abertura(agente) {
    return el("section.home-abertura", { "aria-labelledby": "home-titulo" }, [
      el("p.trilha", {}, [
        el("span.t-no", { texto: "Nó" }),
        el("span", { texto: " ativo · " + (agente && agente.nome ? agente.nome : "Agente") }),
      ]),
      /* O nome por extenso já está no cabeçalho de toda página. Aqui o
         título diz o que o sistema é. */
      el("h1.home-abertura__titulo", { id: "home-titulo" }, tituloComDestaque("O arquivo da sua mesa de RPG", "arquivo")),
      el("p.home-abertura__texto", {
        texto: "Personagens, campanhas e tudo o que a sua mesa inventa, num lugar só. Fichas digitais que rolam os dados, fazem as contas e ficam guardadas para a próxima sessão.",
      }),
      el("div.faixa", {}, [
        el("a.r-botao.r-botao--principal", { href: U.url("personagens/?novo=1"), texto: "+ Criar personagem" }),
        el("a.r-botao", { href: U.url("personagens/"), texto: "Ver meus personagens" }),
      ]),
    ]);
  }

  /* =================================================================
     SEÇÃO: texto de um lado, miniatura do outro
     ================================================================= */

  function secao(d) {
    var id = "home-secao-" + d.marca;

    return el("section.home-secao", {
      class: d.lado === "invertido" ? "home-secao--invertida" : "",
      "aria-labelledby": id,
    }, [
      el("div.home-secao__texto", {}, [
        el("span.home-secao__marca", { "aria-hidden": "true", texto: d.marca }),
        el("h2.home-secao__titulo", { id: id }, tituloComDestaque(d.titulo, d.destaque)),
        el("div.pilha--curta", { class: "pilha" }, d.texto.map(function (p) {
          return el("p.home-secao__paragrafo", { texto: p });
        })),
        d.lista
          ? el("ul.home-lista", {}, d.lista.map(function (item) { return el("li", { texto: item }); }))
          : null,
        d.acao
          ? el("div.faixa", {}, [el("a.r-botao", { href: U.url(d.acao.href), texto: d.acao.rotulo })])
          : null,
      ]),
      el("div.home-secao__ilustracao", { "aria-hidden": "true" }, [d.ilustracao]),
    ]);
  }

  /* O trecho em destaque ganha a cor paranormal e o sublinhado. É
     detalhe de identidade: a frase continua inteira para leitor de
     tela. */
  function tituloComDestaque(titulo, destaque) {
    var i = destaque ? titulo.indexOf(destaque) : -1;
    if (i < 0) return titulo;
    return [
      titulo.slice(0, i),
      el("span.home-destaque", { texto: destaque }),
      titulo.slice(i + destaque.length),
    ];
  }

  /* =================================================================
     ILUSTRAÇÕES
     -----------------------------------------------------------------
     Miniaturas com dados de exemplo. Nenhum nome aqui é de personagem
     real do arquivo.
     ================================================================= */

  function janela(rotulo, conteudo) {
    return el("div.home-mock", {}, [
      el("div.home-mock__topo", {}, [
        el("span.home-mock__pontos", {}, [el("span"), el("span"), el("span")]),
        el("span.t-rotulo", { texto: rotulo }),
      ]),
      el("div.home-mock__corpo", {}, conteudo),
    ]);
  }

  function ilustracaoFicha() {
    var atributos = [["AGI", 2], ["FOR", 1], ["INT", 3], ["PRE", 3], ["VIG", 1]];
    return janela("Ficha // Bianca", [
      el("div.home-mock__linha", {}, [
        el("span.home-mock__avatar", { texto: "BI" }),
        el("div.pilha--curta", { class: "pilha" }, [
          el("span.t-secao", { texto: "Bianca" }),
          el("span.t-mini", { texto: "Especialista · Investigadora · NEX 5%" }),
        ]),
      ]),
      el("div.home-mock__atributos", {}, atributos.map(function (a) {
        return el("div.home-mock__atributo", {}, [
          el("span.t-rotulo", { texto: a[0] }),
          el("span.home-mock__numero", { texto: String(a[1]) }),
        ]);
      })),
      el("div.home-mock__rolagem", {}, [
        el("span.t-rotulo", { texto: "Investigação · 3d20 +5" }),
        el("div.home-mock__resultado", {}, [
          el("span.home-mock__dados", { texto: "[7] [18] [11]" }),
          el("span.home-mock__total", { texto: "23" }),
        ]),
        el("span.t-mini", { texto: "maior dado 18 + treinado 5" }),
      ]),
    ]);
  }

  function ilustracaoOrdem() {
    var parcelas = [["Base", "+10"], ["Agilidade", "+2"], ["Reflexos Defensivos", "+2"]];
    return janela("Progressão", [
      el("div.home-mock__pendencia", {}, [
        el("div.pilha--curta", { class: "pilha" }, [
          el("span.t-rotulo", { texto: "NEX 15%" }),
          el("span.t-secao", { texto: "Poder de classe" }),
        ]),
        el("span.home-mock__botao", { texto: "Escolher poder" }),
      ]),
      el("div.home-mock__pendencia.home-mock__pendencia--feita", {}, [
        el("div.pilha--curta", { class: "pilha" }, [
          el("span.t-rotulo", { texto: "NEX 20%" }),
          el("span.t-secao", { texto: "Aumento de atributo" }),
        ]),
        el("span.etiqueta.etiqueta--calculo", { texto: "+1 em Agilidade" }),
      ]),
      el("div.home-mock__conta", {}, [
        el("span.t-rotulo", { texto: "Defesa" }),
      ].concat(parcelas.map(function (p) {
        return el("div.home-mock__parcela", {}, [el("span", { texto: p[0] }), el("span", { texto: p[1] })]);
      })).concat([
        el("div.home-mock__parcela.home-mock__parcela--total", {}, [el("span", { texto: "Total" }), el("span", { texto: "14" })]),
      ])),
    ]);
  }

  function ilustracaoCampanha() {
    var rolagens = [
      ["Otávio", "Luta", "21"],
      ["Marta", "Percepção", "17"],
      ["Mestre", "Rolagem oculta", "—"],
    ];
    var iniciativa = [["Marta", "19"], ["Criatura", "15"], ["Otávio", "8"]];
    return janela("Campanha // O Membro do Arquivo", [
      el("span.t-rotulo", { texto: "Histórico de rolagens" }),
      el("div.home-mock__lista", {}, rolagens.map(function (r) {
        return el("div.home-mock__item", {}, [
          el("span.home-mock__avatar.home-mock__avatar--mini", { texto: r[0].slice(0, 2).toUpperCase() }),
          el("span", { texto: r[0] + " · " + r[1] }),
          el("span.home-mock__valor", { texto: r[2] }),
        ]);
      })),
      el("span.t-rotulo", { texto: "Combate · rodada 2" }),
      el("div.home-mock__lista", {}, iniciativa.map(function (r, i) {
        return el("div.home-mock__item", { class: i === 0 ? "home-mock__item--vez" : "" }, [
          el("span.t-mini", { texto: String(i + 1) }),
          el("span", { texto: r[0] }),
          el("span.home-mock__valor", { texto: r[1] }),
        ]);
      })),
    ]);
  }

  function ilustracaoHomebrew() {
    var registros = [
      ["Faca de cerâmica", "Arma · 1d4", "público"],
      ["Sussurro de estática", "Habilidade", "privado"],
      ["Existido", "Criatura", "privado"],
    ];
    return janela("Biblioteca Homebrew", [
      el("div.home-mock__lista", {}, registros.map(function (r) {
        return el("div.home-mock__item", {}, [
          el("span.home-mock__avatar.home-mock__avatar--mini", { texto: r[0].slice(0, 2).toUpperCase() }),
          el("div.pilha--curta", { class: "pilha" }, [
            el("span", { texto: r[0] }),
            el("span.t-mini", { texto: r[1] }),
          ]),
          el("span.etiqueta", { texto: r[2] }),
        ]);
      })),
      el("div.home-mock__seta", {}, [
        el("span.t-mini", { texto: "cópia" }),
        el("span.home-mock__traco"),
        el("span.t-secao", { texto: "Inventário da ficha" }),
      ]),
    ]);
  }

  function ilustracaoSalvamento() {
    return janela("Sincronização", [
      el("div.home-mock__estado", {}, [
        el("span.home-mock__luz"),
        el("span.t-secao", { texto: "Salvo agora" }),
      ]),
      el("div.home-mock__aparelhos", {}, [
        aparelho("Computador", "mudou a Defesa"),
        el("span.home-mock__junta", { texto: "+" }),
        aparelho("Celular", "mudou o inventário"),
      ]),
      el("div.home-mock__parcela.home-mock__parcela--total", {}, [
        el("span", { texto: "As duas mudanças ficam" }),
        el("span", { texto: "rev 12" }),
      ]),
    ]);
  }

  function aparelho(nome, mudanca) {
    return el("div.home-mock__aparelho", {}, [
      el("span.t-rotulo", { texto: nome }),
      el("span.t-mini", { texto: mudanca }),
    ]);
  }

  /* =================================================================
     COMO COMEÇAR
     ================================================================= */

  function comoComecar() {
    var passos = [
      ["Crie um personagem", "Escolha entre a ficha Universal e a de Ordem Paranormal.", "personagens/?novo=1"],
      ["Monte a campanha", "Convide os jogadores e vincule os personagens da mesa.", "campanhas/"],
      ["Ajuste o seu perfil", "Avatar, escala do texto e importação de fichas em arquivo.", "perfil/"],
    ];

    return el("section.home-passos", { "aria-labelledby": "home-passos-titulo" }, [
      el("h2.home-secao__titulo", { id: "home-passos-titulo" }, tituloComDestaque("Por onde começar", "começar")),
      el("ol.home-passos__lista", {}, passos.map(function (p, i) {
        return el("li.home-passo", {}, [
          el("span.home-passo__numero", { "aria-hidden": "true", texto: String(i + 1).padStart(2, "0") }),
          el("a.home-passo__link", { href: U.url(p[2]) }, [
            el("span.t-secao", { texto: p[0] }),
            el("span.t-mini", { texto: p[1] }),
          ]),
        ]);
      })),
    ]);
  }

  /* =================================================================
     AVISO
     ================================================================= */

  function aviso() {
    return el("section.home-aviso", { "aria-label": "Sobre o conteúdo de Ordem Paranormal" }, [
      el("p.t-mini", {
        texto: "Ordem Paranormal RPG é um produto da Jambô Editora e de seus criadores. O R.A.M.A. é um projeto independente de fã, sem vínculo oficial com a editora.",
      }),
      el("p.t-mini", {
        texto: "Os resumos de regras servem para consulta durante o jogo e não substituem os livros. Para jogar, tenha o Livro de Regras e os suplementos.",
      }),
    ]);
  }
})(window);
