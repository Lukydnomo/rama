/* =====================================================================
   R.A.M.A. — casca da aplicação
   ---------------------------------------------------------------------
   Cabeçalho, navegação, menu do agente, rodapé e as preferências de
   exibição. Uma vez só, para as cinco telas.

   POR QUE A CASCA É MONTADA AQUI, E NÃO REPETIDA NOS HTML

   Ela é idêntica em toda página e depende de duas coisas que o HTML
   estático não tem: quem está na sessão (que só o servidor confirma) e
   qual item da navegação está ativo. Copiada em cinco arquivos, ela
   divergiria no primeiro ajuste — e a primeira divergência de uma
   barra de navegação é um link que só existe em três das cinco telas.

   O que é estrutura DA PÁGINA continua no .html de cada uma. E nada
   aqui é montado com string de HTML: tudo passa pelo construtor de
   elementos, que escapa texto por natureza.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el;

  var SECOES = [
    { chave: "home",         rotulo: "Home",        caminho: "" },
    { chave: "personagens",  rotulo: "Personagens", caminho: "personagens/" },
    { chave: "campanhas",    rotulo: "Campanhas",   caminho: "campanhas/" },
    { chave: "homebrew",     rotulo: "Homebrew",    caminho: "homebrew/" },
    { chave: "perfil",       rotulo: "Perfil",      caminho: "perfil/" },
  ];

  var CHAVE_EFEITOS = "rama.pref.efeitos";
  var CHAVE_ESCALA = "rama.pref.escala";

  /* =================================================================
     PREFERÊNCIAS DE EXIBIÇÃO
     -----------------------------------------------------------------
     Ficam só neste aparelho, de propósito: elas descrevem a tela em
     que a pessoa está, não a conta dela. O celular pode querer letra
     maior sem o desktop mudar junto.

     Aplicadas o mais cedo possível — antes da primeira pintura — para
     a página não abrir num tamanho e pular para outro.
     ================================================================= */

  function lerPref(chave, padrao) {
    try { return localStorage.getItem(chave) || padrao; } catch (e) { return padrao; }
  }

  function gravarPref(chave, valor) {
    try { localStorage.setItem(chave, valor); } catch (e) { /* segue sem guardar */ }
  }

  function aplicarPreferencias() {
    var efeitos = lerPref(CHAVE_EFEITOS, "on");
    document.documentElement.dataset.efeitos = efeitos === "off" ? "off" : "on";

    var escala = parseFloat(lerPref(CHAVE_ESCALA, "1")) || 1;
    escala = U.limitar(escala, 1, 2);
    document.documentElement.style.setProperty("--escala", String(escala));
  }

  function definirEfeitos(ligado) {
    gravarPref(CHAVE_EFEITOS, ligado ? "on" : "off");
    aplicarPreferencias();
  }

  function definirEscala(valor) {
    gravarPref(CHAVE_ESCALA, String(valor));
    aplicarPreferencias();
  }

  function preferencias() {
    return {
      efeitos: lerPref(CHAVE_EFEITOS, "on") !== "off",
      escala: parseFloat(lerPref(CHAVE_ESCALA, "1")) || 1,
    };
  }

  aplicarPreferencias();

  /* =================================================================
     A CASCA
     ================================================================= */

  /* montar({ secao, agente }) → coloca cabeçalho e rodapé em volta do
     <main id="conteudo"> que cada página já traz. */
  function montar(opcoes) {
    var o = opcoes || {};
    var agente = o.agente || global.RAMAAuth.agente() || { nome: "Agente" };

    var conteudo = U.$("#conteudo");
    if (!conteudo) {
      console.error("[R.A.M.A.] a página não tem <main id=\"conteudo\">");
      return;
    }

    var lista = el("ul.app-nav__lista", { id: "nav-lista" });

    SECOES.forEach(function (s) {
      var ativo = s.chave === o.secao;
      lista.appendChild(el("li", {}, [
        el("a.app-nav__link", {
          href: U.url(s.caminho),
          texto: s.rotulo,
          "aria-current": ativo ? "page" : null,
        }),
      ]));
    });

    /* No celular este botão é o primeiro item da barra de cima, e não
       uma linha própria embaixo dela: [ ☰ ] R.A.M.A. ... [ agente ].
       Uma linha inteira só para um botão é altura roubada da tela onde
       ela é mais escassa. */
    var alternar = el("button.r-icone.app-nav__alternar", {
      type: "button",
      "aria-label": "Abrir navegação",
      "aria-expanded": "false",
      "aria-controls": "nav-lista",
      onclick: function () {
        var fechado = lista.hidden;
        lista.hidden = !fechado;
        alternar.setAttribute("aria-expanded", String(fechado));
        alternar.setAttribute("aria-label", fechado ? "Fechar navegação" : "Abrir navegação");
      },
    }, [global.RAMAUI.simbolo("menu")]);

    /* No celular a lista começa fechada; no desktop ela é a barra. O
       corte é o mesmo do CSS — mantê-los juntos evita o menu abrir
       fechado numa largura em que deveria estar sempre visível. */
    var estreito = global.matchMedia && global.matchMedia("(max-width: 760px)").matches;
    lista.hidden = !!estreito;

    var menuAgente = global.RAMAUI.menu([
      { rotulo: "Perfil", aoClicar: function () { location.href = U.url("perfil/"); } },
      { rotulo: preferencias().efeitos ? "Desligar efeitos" : "Ligar efeitos",
        aoClicar: function () { definirEfeitos(!preferencias().efeitos); location.reload(); } },
      "separador",
      { rotulo: "Sair", perigo: true, aoClicar: confirmarSaida },
    ], { rotulo: "Opções do agente", icone: "tresPontos" });

    var cabecalho = el("header.app-topo", {}, [
      el("div.app-topo__faixa", {}, [
        alternar,
        el("a.marca", { href: U.url(""), "aria-label": "R.A.M.A. — início" }, [
          el("span.marca__simbolo", {}, [global.RAMAUI.marca(28)]),
          el("span.marca__texto", {}, [
            el("span.marca__nome", { texto: "R.A.M.A." }),
            el("span.marca__extenso", { texto: "Rede de Arquivamento Multiversal de Agentes" }),
          ]),
        ]),
        el("div.app-topo__espaco"),
        el("div.agente", {}, [
          avatarDoAgente(agente),
          el("span.agente__nome", { texto: agente.nome || "Agente" }),
        ]),
        menuAgente,
      ]),
      el("nav.app-nav", { "aria-label": "Seções do sistema" }, [lista]),
    ]);

    var rodape = el("footer.app-rodape", {}, [
      el("div.app-rodape__faixa", {}, [
        el("span.t-no", { texto: "Nó" }),
        el("span", { texto: "Os dados vivem na sua planilha" }),
        /* A versão vem do topo do CHANGELOG, nunca de uma constante
           escrita à mão aqui. Uma vez só, na casca compartilhada, para
           não existir uma cópia por página que possa divergir. */
        versaoNoRodape(),
      ]),
    ]);

    document.body.insertBefore(cabecalho, conteudo);
    document.body.insertBefore(el("a.pular-para", { href: "#conteudo", texto: "Pular para o conteúdo" }), cabecalho);
    document.body.appendChild(rodape);

    if (!U.$(".veu")) {
      document.body.insertBefore(el("div.veu", { "aria-hidden": "true" }), document.body.firstChild);
    }

    return { cabecalho: cabecalho, conteudo: conteudo };
  }

  function avatarDoAgente(agente) {
    var caixa = el("span.r-avatar.r-avatar--p", { "aria-hidden": "true" });
    if (agente && agente.avatar) caixa.appendChild(el("img", { src: agente.avatar, alt: "" }));
    else caixa.textContent = U.iniciais(agente && agente.nome);
    return caixa;
  }

  async function confirmarSaida() {
    var certeza = await global.RAMAUI.confirmar({
      titulo: "Sair do R.A.M.A.?",
      texto: "A sessão deste aparelho será encerrada.",
      detalhe: "Seus personagens continuam guardados no arquivo.",
      rotuloConfirmar: "Sair",
    });
    if (certeza) global.RAMAAuth.sair();
  }

  /* =================================================================
     VERSÃO E HISTÓRICO
     -----------------------------------------------------------------
     A única leitura de versão da interface inteira. Se outra tela
     precisar mostrá-la, ela chama daqui — não recria a constante.
     ================================================================= */

  function versaoNoRodape() {
    var V = global.RAMAVersion;
    if (!V) return null;

    return el("button.versao", {
      type: "button",
      title: "Ver o histórico de versões",
      texto: "R.A.M.A. · " + V.rotulo,
      onclick: abrirChangelog,
    });
  }

  function abrirChangelog() {
    var V = global.RAMAVersion;
    if (!V) return;

    var registros = V.changelog.map(function (r, i) {
      var secoes = [];

      /* Categoria vazia não aparece: uma lista de títulos sem conteúdo
         faria o changelog parecer maior do que é. */
      V.categorias.forEach(function (categoria) {
        var itens = (r.mudancas && r.mudancas[categoria]) || [];
        if (!itens.length) return;

        secoes.push(el("div.versao-secao", {}, [
          el("p.t-rotulo.t-rotulo-forte", { texto: categoria }),
          el("ul.versao-lista", {}, itens.map(function (texto) {
            return el("li", { texto: texto });
          })),
        ]));
      });

      return global.RAMAUI.recolhivel({
        titulo: "v" + r.versao + " — " + r.codinome,
        extra: r.data,
        /* A mais recente abre; as anteriores ficam recolhidas. */
        aberto: i === 0,
        conteudo: secoes.length ? secoes : [el("p.t-mini", { texto: "Sem mudanças registradas." })],
      });
    });

    global.RAMAUI.modal({
      titulo: "Histórico de versões",
      largo: true,
      conteudo: [
        el("p.t-mini", { texto: "A versão que aparece no rodapé é sempre a do topo desta lista." }),
        el("div.pilha--curta", { class: "pilha" }, registros),
      ],
      botoes: [{ rotulo: "Fechar", classe: "r-botao--principal" }],
    });
  }

  /* =================================================================
     CABEÇALHO DE PÁGINA
     -----------------------------------------------------------------
     titulo({ titulo, trilha: [...], acoes: [...] })
     A trilha é a linha fina de metadados: ARQUIVO // 04 REGISTROS.
     ================================================================= */

  function titulo(opcoes) {
    var o = opcoes || {};

    var trilha = el("div.trilha");
    (o.trilha || []).forEach(function (parte, i) {
      if (i) trilha.appendChild(el("span.trilha__sep", { texto: "·" }));
      trilha.appendChild(el("span", { texto: parte }));
    });

    return el("div.pagina-topo", {}, [
      el("div.pagina-topo__texto", {}, [
        el("h1.t-titulo", { texto: o.titulo || "" }),
        (o.trilha || []).length ? trilha : null,
      ]),
      (o.acoes || []).length ? el("div.pagina-topo__acoes", {}, o.acoes) : null,
    ]);
  }

  /* =================================================================
     INÍCIO DE UMA PÁGINA
     -----------------------------------------------------------------
     iniciar("personagens", async function (agente, casca) { ... })

     Confere a sessão, monta a casca e só então entrega a página. Uma
     tela nunca desenha antes de o servidor dizer quem está do outro
     lado — e essa ordem é o que impede conteúdo de uma conta piscar
     na tela de outra.

     O TERCEIRO ARGUMENTO
     -----------------------------------------------------------------
     Uma página pode declarar o que vai precisar ANTES de o servidor
     responder quem ela é:

       iniciar("ficha", aoPronto, {
         pedidos: function () { return [{ acao: "ler_personagem", ... }]; },
       })

     A conferência da sessão e essas leituras viajam juntas, e as
     respostas chegam no terceiro argumento de aoPronto, na mesma ordem
     em que foram pedidas.

     Isso troca duas ondas de rede por uma. Não troca nada da ordem de
     segurança: quem valida a sessão antes das leituras é o servidor, e
     ele faz isso na entrada, antes de olhar o que foi pedido.

     `pedidos` roda cedo, antes de existir sessão confirmada — então só
     pode olhar para o endereço da página, nunca para dados do agente. */

  function iniciar(secao, aoPronto, opcoes) {
    var o = opcoes || {};

    document.addEventListener("DOMContentLoaded", function () {
      var pedidos = [];
      if (o.pedidos) {
        try { pedidos = o.pedidos() || []; }
        catch (e) { pedidos = []; }
      }

      global.RAMAAuth.exigirSessao(async function (agente, respostas) {
        /* semCasca: a página vai morar dentro de outra (a ficha no painel
           lateral do combate). Cabeçalho, navegação e rodapé ficam com a
           página de fora; a sessão é conferida do mesmo jeito. */
        var casca = o.semCasca
          ? { cabecalho: null, conteudo: U.$("#conteudo") }
          : montar({ secao: secao, agente: agente });
        try {
          await aoPronto(agente, casca, respostas || []);
        } catch (e) {
          console.error("[R.A.M.A.] a página falhou ao montar", e);
          var conteudo = U.$("#conteudo");
          if (conteudo) {
            U.trocar(conteudo, global.RAMAUI.erroDeTela(
              { erro: "servidor_falhou" },
              function () { location.reload(); }
            ));
          }
        }
      }, pedidos);
    });
  }

  global.RAMAApp = {
    SECOES: SECOES,
    montar: montar,
    titulo: titulo,
    iniciar: iniciar,
    preferencias: preferencias,
    abrirChangelog: abrirChangelog,
    definirEfeitos: definirEfeitos,
    definirEscala: definirEscala,
    aplicarPreferencias: aplicarPreferencias,
  };
})(window);
