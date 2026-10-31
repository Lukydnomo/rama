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
   em toda página; o resto é conteúdo fixo — menos a ESTANTE (v6.2), que
   lê o registro de sistemas (js/sistemas.js) e os suplementos
   (js/suplementos.js): um sistema novo aparece aqui sem mexer na Home.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el;

  global.RAMAApp.iniciar("home", function (agente) {
    var painel = U.$("#painel-home");

    U.trocar(painel, [
      abertura(agente),
      estante(),
      secao({
        marca: "02",
        titulo: "Fichas que fazem a conta",
        destaque: "Fichas",
        texto: [
          "Tudo o que o personagem é, num lugar só: atributos, recursos, habilidades, rituais ou magias, equipamento e anotações.",
          "Cada sistema rola do jeito dele — d20 com o maior dado em Ordem, dados de Fome em Vampiro, seis que explodem em Malditos Goblins. O resultado aparece com cada parcela aberta, e a matemática fica com o R.A.M.A.",
          "A criação guiada segue a ordem do livro, e cada número da ficha abre a conta que o produziu. Na Universal, nada é imposto: você monta a ficha da sua mesa.",
        ],
        lista: [
          "Modo normal para jogar e modo edição para corrigir, sempre com registro",
          "O que é de cada regra mostra o livro e a página",
          "Exportar, importar, duplicar e compartilhar a ficha",
        ],
        acao: { rotulo: "Criar personagem", href: "personagens/?novo=1" },
        ilustracao: ilustracaoFicha(),
      }),
      secao({
        marca: "03",
        titulo: "As regras do livro, sem decorar o livro",
        destaque: "regras",
        lado: "invertido",
        texto: [
          "A progressão vira escolhas com botão: a tela mostra o que cabe e explica por que o resto não cabe — requisito, uso do dia, suplemento desligado.",
          "Suplementos são habilitáveis: em Ordem Paranormal, ligue só os livros que a sua mesa usa. O que a ficha já tem continua valendo, e regra opcional só liga quando alguém liga.",
        ],
        lista: [
          "Poderes, técnicas e Disciplinas com custo, duração e efeito",
          "Efeitos que acabam no marco certo: turno, cena, batalha, dia",
          "Regras opcionais, uma chave para cada",
        ],
        ilustracao: ilustracaoOrdem(),
      }),
      secao({
        marca: "04",
        titulo: "Campanhas para a mesa inteira",
        destaque: "Campanhas",
        texto: [
          "Crie a campanha, escolha o sistema, convide os jogadores e vincule os personagens. Cada rolagem feita numa ficha vinculada entra no histórico da mesa.",
          "Cada sistema traz a sua ferramenta de mestre: o combate de Ordem e da Universal, a mesa da Testemunha em Oblívio, a crônica do Narrador em Vampiro, o Covil em Malditos Goblins.",
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
        marca: "05",
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
        marca: "06",
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

  function sistemasComCapa() {
    var S = global.RAMASistemas;
    return S ? S.lista().filter(function (s) { return !!s.capa; }) : [];
  }

  /* A abertura: o que o R.A.M.A. é, com os livros dos sistemas em leque
     ao lado (decorativos — a estante logo abaixo diz o nome de cada um). */
  function abertura(agente) {
    var nome = agente && agente.nome ? agente.nome : "Agente";
    var sistemas = global.RAMASistemas ? global.RAMASistemas.lista() : [];
    var capas = sistemasComCapa();
    var SUP = global.RAMASuplementos;
    var nSup = SUP ? SUP.SUPLEMENTOS.length : 0;
    return el("section.home-abertura", { "aria-labelledby": "home-titulo" }, [
      el("div.home-abertura__texto-grupo", {}, [
        el("p.trilha", {}, [
          el("span.t-no", { texto: "Nó" }),
          el("span", { texto: " ativo · " + nome }),
        ]),
        el("p.home-abertura__sigla", { texto: "Rede de Arquivamento Multiversal de Agentes" }),
        /* O nome por extenso também está no cabeçalho de toda página. Aqui
           o título diz o que o sistema é. */
        el("h1.home-abertura__titulo", { id: "home-titulo" }, tituloComDestaque("O arquivo da sua mesa de RPG", "arquivo")),
        el("p.home-abertura__texto", {
          texto: "Fichas que rolam os dados e fazem as contas pelas regras de cada livro, campanhas com a ferramenta certa para quem conduz, e tudo o que a sua mesa inventa — guardado para a próxima sessão.",
        }),
        el("ul.home-abertura__numeros", { "aria-label": "O R.A.M.A. em números" }, [
          numero(String(sistemas.length), sistemas.length === 1 ? "sistema" : "sistemas"),
          nSup ? numero(String(nSup), "suplementos habilitáveis") : null,
          numero("1", "arquivo para a mesa inteira"),
        ]),
        el("div.faixa", {}, [
          el("a.r-botao.r-botao--principal", { href: U.url("personagens/?novo=1"), texto: "+ Criar personagem" }),
          el("a.r-botao", { href: U.url("personagens/"), texto: "Ver meus personagens" }),
        ]),
      ]),
      capas.length ? el("div.home-leque", { "aria-hidden": "true", style: "--n:" + capas.length }, capas.map(function (s, i) {
        return el("span.home-leque__livro", { style: "--i:" + i }, [
          global.RAMACapaSistema ? global.RAMACapaSistema.elemento(s.id, { tamanho: "g" }) : null,
        ]);
      })) : null,
    ]);
  }

  function numero(valor, rotulo) {
    return el("li.home-numero", {}, [el("span.home-numero__valor", { texto: valor }), el("span.home-numero__rotulo", { texto: rotulo })]);
  }

  /* =================================================================
     ESTANTE: os sistemas do registro, com capa e o que cada um traz
     ================================================================= */

  function estante() {
    var S = global.RAMASistemas;
    var SUP = global.RAMASuplementos;
    if (!S) return null;
    var lista = S.lista();
    return el("section.home-estante", { "aria-labelledby": "home-secao-01" }, [
      el("div.home-estante__cabeca", {}, [
        el("span.home-secao__marca", { "aria-hidden": "true", texto: "01" }),
        el("h2.home-secao__titulo", { id: "home-secao-01" }, tituloComDestaque("Uma estante de sistemas", "estante")),
        el("p.home-secao__paragrafo", { texto: "Cada sistema é um módulo completo: a ficha dele, o dado dele, a criação dele e a ferramenta de mesa dele. A escolha fica gravada na ficha e na campanha." }),
      ]),
      el("ul.home-estante__lista", {}, lista.map(function (s) {
        var sups = SUP ? SUP.doSistema(s.id) : [];
        return el("li.home-sistema", { dataset: { sistema: s.id } }, [
          global.RAMACapaSistema ? global.RAMACapaSistema.elemento(s.id, { tamanho: "m" }) : null,
          el("div.home-sistema__textos", {}, [
            el("h3.home-sistema__nome", { texto: s.nome + (s.edicao ? " · " + s.edicao : "") }),
            el("p.home-sistema__resumo", { texto: s.resumo }),
            (s.ficha.pontos || []).length ? el("ul.home-lista.home-lista--mini", {}, s.ficha.pontos.slice(0, 3).map(function (p) { return el("li", { texto: p }); })) : null,
            sups.length ? el("p.home-sistema__suplementos", {}, [
              el("span.home-sistema__volumes", { "aria-hidden": "true" }, sups.slice(0, 8).map(function (x) {
                return el("img", { src: U.url(x.capa.replace(/\.webp$/, "-pequena.webp")), alt: "", loading: "lazy", decoding: "async", width: 160, height: 215 });
              })),
              el("span.t-mini", { texto: sups.length + " suplementos habilitáveis: " + sups.map(function (x) { return x.curto; }).join(", ") }),
            ]) : null,
          ]),
        ]);
      })),
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
      ["Crie um personagem", "Escolha o sistema (e, em Ordem, os suplementos) e siga a criação guiada.", "personagens/?novo=1"],
      ["Monte a campanha", "Escolha o sistema da mesa, convide os jogadores e vincule os personagens.", "campanhas/"],
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
    return el("section.home-aviso", { "aria-label": "Sobre os sistemas e o conteúdo dos livros" }, [
      el("p.t-mini", {
        texto: "Os sistemas da estante e as capas dos livros pertencem a seus autores e editoras — Ordem Paranormal RPG, por exemplo, é um produto da Jambô Editora e de seus criadores. O R.A.M.A. é um projeto independente de fã, sem vínculo oficial com nenhuma editora.",
      }),
      el("p.t-mini", {
        texto: "Os resumos de regras servem para consulta durante o jogo e não substituem os livros. Para jogar, tenha os livros de regras e os suplementos.",
      }),
    ]);
  }
})(window);
