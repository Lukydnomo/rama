/* =====================================================================
   R.A.M.A. — Campanhas
   ---------------------------------------------------------------------
   A base, e só a base.

   Não existe ainda especificação para o lado do mestre — iniciativa,
   combate, monstros, convites, permissões. Inventar tudo isso agora
   significaria construir um sistema inteiro que depois teria de ser
   desfeito para caber no que a mesa realmente usa.

   O que existe aqui é o suficiente para o resto do sistema funcionar:
   uma campanha tem nome, descrição, data e os personagens que estão
   nela. A estrutura guarda `dadosJson`, então acrescentar sessões,
   NPCs ou o que vier não vai exigir mexer na planilha.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var el = U.el;

  var campanhas = [];
  var personagens = [];
  var painel = null;

  global.RAMAApp.iniciar("campanhas", async function () {
    painel = U.$("#painel-campanhas");
    await carregar();
  });

  async function carregar() {
    U.trocar(painel, [cabecalho(), UI.carregando("Consultando arquivo")]);

    var [rc, rp] = await Promise.all([
      global.RAMAApi.listarCampanhas(),
      global.RAMAApi.listarPersonagens(),
    ]);

    if (!rc.ok) { U.trocar(painel, [cabecalho(), UI.erroDeTela(rc, carregar)]); return; }

    campanhas = rc.dados || [];
    personagens = (rp.ok && rp.dados) || [];
    desenhar();
  }

  function cabecalho() {
    return global.RAMAApp.titulo({
      titulo: "Campanhas",
      trilha: ["Arquivo // " + campanhas.length + " registro(s)"],
      acoes: [
        el("button.r-botao.r-botao--principal", {
          type: "button", texto: "+ Nova campanha", onclick: function () { editar(null); },
        }),
      ],
    });
  }

  function desenhar() {
    U.trocar(painel, [
      cabecalho(),
      campanhas.length
        ? el("div.registros", {}, campanhas.map(cartao))
        : UI.vazio({
            titulo: "Nenhuma campanha",
            texto: "Crie uma campanha para reunir personagens, guardar documentos, acompanhar as rolagens da mesa e montar combates.",
            acao: { rotulo: "+ Nova campanha", aoClicar: function () { editar(null); } },
          }),
    ]);
  }

  function cartao(c) {
    var doGrupo = personagens.filter(function (p) { return p.campanhaId === c.id; });
    var destino = U.url("campanha/?id=" + encodeURIComponent(c.id));

    /* A capa da campanha no lugar das iniciais, quando ela existe. A
       listagem manda só a VERSÃO da imagem; quem desenha pede em lote e
       reaproveita o que o aparelho já tem — ver js/imagens.js. */
    function capaOuIniciais(campanha) {
      var caixa = el("span.r-avatar.r-avatar--quadrado", {
        "aria-hidden": "true", texto: U.iniciais(campanha.nome),
      });
      if (campanha.capaVersao && global.RAMAImagens) {
        global.RAMAImagens.aplicar(caixa, { tipo: "capa", id: campanha.id, versao: campanha.capaVersao });
      }
      return caixa;
    }

    /* Papel e visibilidade ficam à vista na lista: saber de cara se
       você é o mestre de uma mesa ou só um jogador nela evita abrir a
       campanha errada. */
    /* O sistema da campanha (v4.0), pelo registro: quem conduz tem o nome
       que o sistema dá (Mestre, Testemunha). */
    var doSistema = global.RAMASistemas.daCampanha(c).sistema;
    var etiquetas = [
      el("span.r-etiqueta", { texto: doSistema.curto }),
      el("span.r-etiqueta", {
        class: c.mestre ? "r-etiqueta--forte" : "",
        texto: c.papel === "mestre" ? doSistema.campanha.mestre : (c.papel === "jogador" ? "Jogador" : "Pública"),
      }),
      c.visibilidade === "publico"
        ? el("span.r-etiqueta", { texto: "Pública" })
        : null,
    ];

    return el("div.r-cartao.registro", { estilo: { position: "relative" } }, [
      el("a.registro__link", { href: destino, "aria-label": "Abrir " + c.nome }),

      capaOuIniciais(c),

      el("div.registro__corpo", {}, [
        el("span.registro__nome", { texto: c.nome }),
        el("span.registro__sub", {
          texto: c.papel === "espectador"
            ? "Campanha pública · você não participa"
            : (doGrupo.length
                ? doGrupo.length + " personagem(ns) seu(s) nesta campanha"
                : "Nenhum personagem seu vinculado"),
        }),
        c.descricao ? el("span.t-mini", { texto: c.descricao }) : null,
        el("div.faixa", { estilo: { gap: "var(--e1)" } }, etiquetas),
      ]),

      el("span.registro__data", {}, [
        el("span", { texto: U.dataCurta(c.criadoEm) }),
        el("br"),
        el("span.t-mini", { texto: "Linha // " + U.codigoCurto(c.id) }),
      ]),

      c.mestre
        ? UI.menu([
            { rotulo: "Abrir", aoClicar: function () { location.href = destino; } },
            { rotulo: "Renomear", aoClicar: function () { editar(c); } },
            "separador",
            { rotulo: "Excluir", perigo: true, aoClicar: function () { excluir(c); } },
          ], { rotulo: "Opções de " + c.nome, icone: "tresPontos" })
        : null,
    ]);
  }

  /* =================================================================
     CRIAR E EDITAR
     ================================================================= */

  function editar(campanha) {
    var criando = !campanha;

    var nome = UI.campo({ rotulo: "Nome", valor: criando ? "" : campanha.nome, limite: 120 });
    var descricao = UI.campo({
      rotulo: "Descrição", tipo: "area", linhas: 3, limite: 4000,
      valor: criando ? "" : (campanha.descricao || ""),
      ajuda: "Opcional.",
    });

    var visibilidade = criando ? "privado" : campanha.visibilidade;
    /* O sistema é escolhido na criação, nunca suposto (v4.0). Trocar
       depois é em Configurações da campanha, com os impactos explicados. */
    var escolha = criando ? escolhaDeSistema() : null;

    var seletor = el("div.filtros__grupo", { role: "group", "aria-label": "Visibilidade" },
      [{ v: "privado", r: "Privada" }, { v: "publico", r: "Pública" }].map(function (op) {
        return el("button.filtro", {
          type: "button",
          "aria-pressed": String(visibilidade === op.v),
          texto: op.r,
          onclick: function (ev) {
            visibilidade = op.v;
            U.$$(".filtro", ev.target.parentNode).forEach(function (b) {
              b.setAttribute("aria-pressed", String(b === ev.target));
            });
          },
        });
      })
    );

    UI.modal({
      titulo: criando ? "Nova campanha" : "Editar campanha",
      largo: criando,
      conteudo: el("div.pilha", {}, [
        nome,
        escolha ? escolha.elemento : null,
        descricao,
        el("div.r-campo", {}, [
          el("span.r-rotulo", { texto: "Visibilidade" }),
          seletor,
          el("p.r-ajuda", {
            texto: "Privada: só você e quem convidar. Pública: qualquer agente encontra a campanha — mas documentos, rolagens e combates continuam restritos a quem você escolher.",
          }),
        ]),
      ]),
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        {
          rotulo: criando ? "Criar" : "Salvar",
          classe: "r-botao--principal",
          aoClicar: async function (fechar) {
            var valor = nome.entrada.value.trim();
            if (!valor) { nome.marcarErro("Informe um nome."); nome.entrada.focus(); return; }
            if (escolha && !escolha.valor()) { escolha.marcarErro(); return; }

            var dados = {
              nome: valor,
              descricao: descricao.entrada.value.trim(),
              visibilidade: visibilidade,
            };
            if (escolha) dados.sistema = escolha.valor();

            var r = criando
              ? await global.RAMAApi.criarCampanha(dados)
              : await global.RAMAApi.salvarCampanha(campanha.id, campanha.rev, dados);

            if (!r.ok) { UI.avisoDeFalha(r, criando ? "criação de campanha" : "gravação"); return; }

            fechar();

            /* Campanha nova abre direto: o passo seguinte é sempre
               convidar gente, e ele mora lá dentro. */
            if (criando && r.dados && r.dados.id) {
              location.href = U.url("campanha/?id=" + encodeURIComponent(r.dados.id));
              return;
            }

            await carregar();
            UI.avisoOk("Campanha atualizada.");
          },
        },
      ],
    });

    nome.entrada.focus();
  }

  /* O grupo de escolha do sistema: um rádio por sistema do registro,
     com a capa e o que a campanha dele oferece. Nenhum vem marcado. */
  function escolhaDeSistema() {
    var erro = el("p.r-ajuda.r-ajuda--erro", { hidden: true, role: "alert", texto: "Escolha o sistema da campanha." });
    var opcoes = global.RAMASistemas.lista().map(function (s) {
      return el("label.escolha-sistema__opcao", { dataset: { sistema: s.id } }, [
        el("input.escolha-sistema__radio", {
          type: "radio", name: "sistema-da-campanha", value: s.id,
          onchange: function () { erro.hidden = true; },
        }),
        global.RAMACapaSistema ? global.RAMACapaSistema.elemento(s, { tamanho: "p" }) : null,
        el("span.escolha-sistema__textos", {}, [
          el("span.escolha-sistema__nome", { texto: s.nome }),
          el("span.escolha-sistema__resumo", { texto: s.campanha.descricao }),
        ]),
      ]);
    });
    var grupo = el("fieldset.r-campo.escolha-sistema", {}, [
      el("legend.r-rotulo", { texto: "Sistema de RPG" }),
      el("div.escolha-sistema__opcoes", {}, opcoes),
      el("p.r-ajuda", { texto: "Decide as ferramentas e as regras da mesa. Dá para trocar depois, em Configurações: nada é apagado nem convertido." }),
      erro,
    ]);
    return {
      elemento: grupo,
      valor: function () {
        var marcado = grupo.querySelector("input:checked");
        return marcado ? marcado.value : "";
      },
      marcarErro: function () {
        erro.hidden = false;
        var primeiro = grupo.querySelector("input");
        if (primeiro) primeiro.focus();
      },
    };
  }

  /* =================================================================
     EXCLUIR
     ================================================================= */

  async function excluir(c) {
    var doGrupo = personagens.filter(function (p) { return p.campanhaId === c.id; });

    var certeza = await UI.confirmar({
      titulo: "Excluir " + c.nome + "?",
      texto: doGrupo.length
        ? doGrupo.length + " personagem(ns) ficarão sem campanha. As fichas continuam intactas."
        : "A campanha será removida do arquivo.",
      detalhe: "Esta ação não pode ser desfeita.",
      rotuloConfirmar: "Excluir",
      perigo: true,
    });

    if (!certeza) return;

    var r = await global.RAMAApi.excluirCampanha(c.id);
    if (!r.ok) { UI.avisoDeFalha(r, "exclusão"); return; }

    UI.avisoOk(c.nome + " foi removida.");
    await carregar();
  }
})(window);
