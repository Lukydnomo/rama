/* =====================================================================
   R.A.M.A. — ficha · anotações
   ---------------------------------------------------------------------
   Pastas, notas soltas e um editor ao lado.

   Esta é a única seção que continua editável no MODO NORMAL, e por um
   motivo prático: anotar acontece durante a sessão, não antes dela.
   Obrigar a entrar no modo edição para escrever "o teatro tem uma
   porta atrás do palco" seria pedir que a pessoa destrave a estrutura
   inteira da ficha para escrever uma frase — e depois esquecer de
   travar de volta.

   Cada nota tem id próprio. Renomear pasta, mover nota e reordenar
   nunca quebram referência.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var F = global.RAMAFicha;
  var el = U.el;

  /* Qual nota está aberta. Vive só nesta aba: é estado de tela, não de
     ficha, e não tem por que subir para a planilha. */
  var notaAberta = null;

  function aba(ctx) {
    var anotacoes = ctx.ficha.anotacoes;
    var todas = F.todasAsNotas(anotacoes);

    if (notaAberta && !todas.some(function (r) { return r.nota.id === notaAberta; })) {
      notaAberta = null;
    }
    if (!notaAberta && todas.length) notaAberta = todas[0].nota.id;

    return el("div.anotacoes", {}, [
      UI.painel("Arquivo", arvore(ctx, anotacoes), {
        acoes: [
          el("button.r-botao.r-botao--mini", {
            type: "button", texto: "+ Pasta", onclick: function () { novaPasta(ctx); },
          }),
          el("button.r-botao.r-botao--mini", {
            type: "button", texto: "+ Nota", onclick: function () { novaNota(ctx, null); },
          }),
        ],
      }),
      editor(ctx),
    ]);
  }

  /* =================================================================
     ÁRVORE
     ================================================================= */

  /* Organizar as notas é parte de anotar: arrastar funciona também no
     modo normal, para quem pode editar a ficha. Pastas são de um nível
     só — uma pasta não entra em outra. */
  function podeOrganizar(ctx) {
    return !!(ctx.podeEditar && ctx.podeEditar() && global.RAMAArrastar && global.RAMAOrganizar);
  }

  function arvore(ctx, anotacoes) {
    var pastas = anotacoes.pastas || [];
    var soltas = anotacoes.soltas || [];

    if (!pastas.length && !soltas.length) {
      return el("p.t-mini", { texto: "Nenhuma anotação. Crie uma pasta ou uma nota solta." });
    }

    var organizar = podeOrganizar(ctx);
    var raiz = el("div.arvore", {}, [
      el("div.arvore__pastas", { dataset: { arrastarLista: "pastas" } },
        pastas.map(function (pasta) { return ramoDePasta(ctx, pasta, organizar); })),
      (soltas.length || (organizar && pastas.length))
        ? el("div.arvore__notas.arvore__soltas", { estilo: { paddingLeft: "0" }, dataset: { arrastarLista: "soltas" } },
            soltas.length
              ? soltas.map(function (nota) { return itemDeNota(ctx, nota, null, organizar); })
              : [el("p.t-mini.arvore__vazia", { texto: "Solte aqui para tirar uma nota da pasta." })])
        : null,
    ]);
    return organizar ? ligarArraste(ctx, raiz) : raiz;
  }

  function ramoDePasta(ctx, pasta, organizar) {
    var caixa = el("details.arvore__pasta", { open: true }, [
      el("summary", { dataset: { arrastarPasta: "notas:" + pasta.id } }, [
        organizar ? global.RAMAArrastar.alca({ id: pasta.id, rotulo: "a pasta " + pasta.nome }) : null,
        el("span", { texto: pasta.nome, estilo: { flex: "1", minWidth: "0", overflow: "hidden", textOverflow: "ellipsis" } }),
        el("span.t-mini", { texto: String((pasta.notas || []).length) }),
        UI.menu([
          { rotulo: "Nova nota", aoClicar: function () { novaNota(ctx, pasta.id); } },
          { rotulo: "Renomear", aoClicar: function () { renomearPasta(ctx, pasta); } },
          "separador",
          { rotulo: "Excluir pasta", perigo: true, aoClicar: function () { excluirPasta(ctx, pasta); } },
        ], { rotulo: "Opções da pasta " + pasta.nome, icone: "tresPontos" }),
      ]),
      el("div.arvore__notas", { dataset: { arrastarLista: "notas:" + pasta.id } }, (pasta.notas || []).length
        ? (pasta.notas || []).map(function (n) { return itemDeNota(ctx, n, pasta.id, organizar); })
        : [el("p.t-mini.arvore__vazia", { texto: "Pasta vazia", estilo: { padding: "var(--e1) var(--e2)" } })]
      ),
    ]);
    caixa.dataset.arrastarItem = pasta.id;
    caixa.dataset.arrastarTipo = "pasta";
    caixa.dataset.arrastarRotulo = pasta.nome;
    return caixa;
  }

  /* A linha da nota: a alça e o botão que abre são irmãos — um botão não
     fica dentro do outro. */
  function itemDeNota(ctx, nota, pastaId, organizar) {
    var abrir = el("button.arvore__nota", {
      type: "button",
      "aria-current": notaAberta === nota.id ? "true" : null,
      dataset: { pasta: pastaId || "" },
      texto: nota.titulo,
      onclick: function () { notaAberta = nota.id; ctx.redesenhar(); },
    });
    if (!organizar) return abrir;
    return el("div.arvore__item", {
      dataset: { arrastarItem: nota.id, arrastarTipo: "nota", arrastarRotulo: nota.titulo },
    }, [global.RAMAArrastar.alca({ id: nota.id, rotulo: nota.titulo }), abrir]);
  }

  /* =================================================================
     ARRASTAR
     -----------------------------------------------------------------
     Uma nota vai para outra pasta (soltando no nome dela ou entre as
     notas de lá), sai da pasta (soltando em "sem pasta") ou muda de
     lugar entre as vizinhas. Uma pasta só muda de lugar entre as pastas.
     É sempre o MESMO objeto: título, conteúdo e datas vão junto.
     ================================================================= */

  function pastaDaLista(chave) {
    return chave && chave.indexOf("notas:") === 0 ? chave.slice(6) : null;
  }

  function ligarArraste(ctx, raiz) {
    var O = global.RAMAOrganizar;
    var an = function () { return ctx.ficha.anotacoes; };
    function feito(mudou) {
      if (!mudou) return false;
      ctx.alterou();
      ctx.redesenhar();
      return true;
    }
    return global.RAMAArrastar.ligar(raiz, {
      podeSoltar: function (item, destino) {
        if (item.tipo === "pasta") {
          return destino.lista === "pastas" ? { ok: true }
            : { ok: false, motivo: "Pastas de anotação não ficam dentro de outras pastas: arraste entre as pastas." };
        }
        if (destino.lista === "pastas") return { ok: false, motivo: "Solte a nota dentro de uma pasta, ou em “sem pasta”." };
        return { ok: true };
      },
      aoSoltar: function (item, destino) {
        if (item.tipo === "pasta") { feito(O.reposicionar(an().pastas, item.id, destino.indice)); return; }
        var r = O.moverNota(an(), item.id, pastaDaLista(destino.lista), destino.indice);
        if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
        feito(true);
      },
      aoTeclado: function (item, direcao) {
        if (item.tipo === "pasta") {
          return feito(O.passo(an().pastas, item.id, direcao)) ? { ok: true } : { ok: false, motivo: "Não há mais para onde mover." };
        }
        var achado = O.acharNotaEm(an(), item.id);
        if (!achado || !feito(O.passo(achado.lista, item.id, direcao))) return { ok: false, motivo: "Não há mais para onde mover nesta pasta." };
        return { ok: true };
      },
    });
  }

  /* =================================================================
     EDITOR
     ================================================================= */

  function editor(ctx) {
    if (!notaAberta) {
      return UI.vazio({
        titulo: "Nenhuma anotação aberta",
        texto: "Crie uma nota para começar. Anotações podem ser escritas também no modo normal, durante a sessão.",
        acao: { rotulo: "+ Nova nota", aoClicar: function () { novaNota(ctx, null); } },
      });
    }

    var achado = F.acharNota(ctx.ficha.anotacoes, notaAberta);
    if (!achado) return el("div");

    var nota = achado.nota;

    var titulo = UI.campo({
      rotulo: "Título", valor: nota.titulo, limite: 120,
      aoDigitar: true,
      aoMudar: function (v) {
        nota.titulo = U.aparar(v, 120) || "Anotação";
        nota.atualizadoEm = U.agoraISO();
        ctx.alterou();
        /* Só o rótulo na árvore precisa acompanhar; redesenhar a aba
           inteira tiraria o foco do campo no meio da digitação. */
        var botao = U.$('.arvore__nota[aria-current="true"]');
        if (botao) botao.textContent = nota.titulo;
      },
    });

    var corpo = UI.campo({
      rotulo: "Conteúdo", tipo: "area", valor: nota.conteudo, linhas: 16, limite: 20000,
      aoDigitar: true,
      aoMudar: function (v) {
        nota.conteudo = v;
        nota.atualizadoEm = U.agoraISO();
        ctx.alterou();
      },
    });
    corpo.entrada.classList.add("nota-editor__corpo");

    return el("div.nota-editor", {}, [
      el("div.faixa.faixa--entre", {}, [
        el("span.t-mini", {
          texto: (achado.pastaNome ? achado.pastaNome + " · " : "Sem pasta · ") +
                 "Atualizada " + U.dataHora(nota.atualizadoEm),
        }),
        UI.menu(opcoesDaNota(ctx, nota, achado.pastaId), { rotulo: "Opções da nota", icone: "tresPontos" }),
      ]),
      titulo,
      corpo,
    ]);
  }

  function opcoesDaNota(ctx, nota, pastaId) {
    var pastas = ctx.ficha.anotacoes.pastas || [];

    var mover = pastas
      .filter(function (p) { return p.id !== pastaId; })
      .map(function (p) {
        return { rotulo: "Mover para " + p.nome, aoClicar: function () { moverNota(ctx, nota.id, pastaId, p.id); } };
      });

    if (pastaId) {
      mover.push({ rotulo: "Tirar da pasta", aoClicar: function () { moverNota(ctx, nota.id, pastaId, null); } });
    }

    return [{ rotulo: "Renomear", aoClicar: function () { renomearNota(ctx, nota); } }]
      .concat(mover.length ? ["separador"].concat(mover) : [])
      .concat(["separador", { rotulo: "Excluir nota", perigo: true, aoClicar: function () { excluirNota(ctx, nota, pastaId); } }]);
  }

  /* =================================================================
     OPERAÇÕES
     ================================================================= */

  async function novaPasta(ctx) {
    var nome = await UI.pedirTexto({
      titulo: "Nova pasta", rotulo: "Nome da pasta", valor: "", limite: 60,
    });
    if (nome === null) return;

    ctx.ficha.anotacoes.pastas.push(F.criarPasta(nome || "Nova pasta"));
    ctx.alterou();
    ctx.redesenhar();
  }

  function novaNota(ctx, pastaId) {
    var nota = F.criarNota("Nova anotação");

    if (pastaId) {
      var pasta = U.porId(ctx.ficha.anotacoes.pastas, pastaId);
      if (!pasta) return;
      pasta.notas.push(nota);
    } else {
      ctx.ficha.anotacoes.soltas.push(nota);
    }

    notaAberta = nota.id;
    ctx.alterou();
    ctx.redesenhar();

    var campo = U.$(".nota-editor .r-entrada");
    if (campo) { campo.focus(); campo.select(); }
  }

  async function renomearPasta(ctx, pasta) {
    var nome = await UI.pedirTexto({
      titulo: "Renomear pasta", rotulo: "Nome", valor: pasta.nome, limite: 60,
    });
    if (nome === null) return;
    pasta.nome = U.aparar(nome, 60) || pasta.nome;
    ctx.alterou();
    ctx.redesenhar();
  }

  async function renomearNota(ctx, nota) {
    var titulo = await UI.pedirTexto({
      titulo: "Renomear anotação", rotulo: "Título", valor: nota.titulo, limite: 120,
    });
    if (titulo === null) return;
    nota.titulo = U.aparar(titulo, 120) || nota.titulo;
    nota.atualizadoEm = U.agoraISO();
    ctx.alterou();
    ctx.redesenhar();
  }

  /* Excluir a pasta não pode levar as notas junto sem avisar. A opção
     de manter é a primeira, e é a que o botão principal faz. */
  async function excluirPasta(ctx, pasta) {
    var quantas = (pasta.notas || []).length;

    if (!quantas) {
      var vazio = await UI.confirmar({
        titulo: "Excluir " + pasta.nome + "?",
        texto: "A pasta está vazia e será removida.",
        rotuloConfirmar: "Excluir", perigo: true,
      });
      if (!vazio) return;
      remover(ctx, pasta.id);
      return;
    }

    var escolha = null;
    UI.modal({
      titulo: "Excluir " + pasta.nome + "?",
      conteudo: [
        el("p", { texto: "Esta pasta tem " + quantas + " anotação(ões)." }),
        el("p.t-mini", { texto: "Você pode manter as anotações fora da pasta ou apagar tudo junto." }),
      ],
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        {
          rotulo: "Apagar tudo", classe: "r-botao--perigo",
          aoClicar: function (fechar) { escolha = "tudo"; fechar(); aplicar(); },
        },
        {
          rotulo: "Manter anotações", classe: "r-botao--principal",
          aoClicar: function (fechar) { escolha = "manter"; fechar(); aplicar(); },
        },
      ],
    });

    function aplicar() {
      if (escolha === "manter") {
        ctx.ficha.anotacoes.soltas = ctx.ficha.anotacoes.soltas.concat(pasta.notas || []);
      }
      remover(ctx, pasta.id);
    }
  }

  function remover(ctx, pastaId) {
    ctx.ficha.anotacoes.pastas = ctx.ficha.anotacoes.pastas.filter(function (p) { return p.id !== pastaId; });
    ctx.alterou();
    ctx.redesenhar();
  }

  async function excluirNota(ctx, nota, pastaId) {
    var certeza = await UI.confirmar({
      titulo: "Excluir " + nota.titulo + "?",
      texto: "A anotação será removida da ficha.",
      detalhe: "Esta ação não pode ser desfeita.",
      rotuloConfirmar: "Excluir", perigo: true,
    });
    if (!certeza) return;

    if (pastaId) {
      var pasta = U.porId(ctx.ficha.anotacoes.pastas, pastaId);
      if (pasta) pasta.notas = pasta.notas.filter(function (n) { return n.id !== nota.id; });
    } else {
      ctx.ficha.anotacoes.soltas = ctx.ficha.anotacoes.soltas.filter(function (n) { return n.id !== nota.id; });
    }

    if (notaAberta === nota.id) notaAberta = null;
    ctx.alterou();
    ctx.redesenhar();
  }

  function moverNota(ctx, notaId, deId, paraId) {
    var achado = F.acharNota(ctx.ficha.anotacoes, notaId);
    if (!achado) return;

    if (deId) {
      var origem = U.porId(ctx.ficha.anotacoes.pastas, deId);
      if (origem) origem.notas = origem.notas.filter(function (n) { return n.id !== notaId; });
    } else {
      ctx.ficha.anotacoes.soltas = ctx.ficha.anotacoes.soltas.filter(function (n) { return n.id !== notaId; });
    }

    if (paraId) {
      var destino = U.porId(ctx.ficha.anotacoes.pastas, paraId);
      if (destino) destino.notas.push(achado.nota);
    } else {
      ctx.ficha.anotacoes.soltas.push(achado.nota);
    }

    ctx.alterou();
    ctx.redesenhar();
  }

  global.RAMASecaoAnotacoes = { aba: aba };
})(window);
