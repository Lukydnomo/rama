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
            titulo: "Nenhuma campanha arquivada",
            texto: "Uma campanha serve para agrupar personagens. O resto — sessões, mestre, combate — vem quando a mesa souber o que precisa.",
            acao: { rotulo: "+ Nova campanha", aoClicar: function () { editar(null); } },
          }),
    ]);
  }

  function cartao(c) {
    var doGrupo = personagens.filter(function (p) { return p.campanhaId === c.id; });

    return el("div.r-cartao.registro", {}, [
      el("span.r-avatar.r-avatar--quadrado", { "aria-hidden": "true", texto: U.iniciais(c.nome) }),

      el("div.registro__corpo", {}, [
        el("span.registro__nome", { texto: c.nome }),
        el("span.registro__sub", {
          texto: doGrupo.length
            ? doGrupo.length + " personagem(ns) · " + doGrupo.map(function (p) { return p.nome; }).join(", ")
            : "Nenhum personagem vinculado",
        }),
        c.descricao ? el("span.t-mini", { texto: c.descricao }) : null,
      ]),

      el("span.registro__data", {}, [
        el("span", { texto: U.dataCurta(c.criadoEm) }),
        el("br"),
        el("span.t-mini", { texto: "Linha // " + U.codigoCurto(c.id) }),
      ]),

      UI.menu([
        { rotulo: "Editar", aoClicar: function () { editar(c); } },
        { rotulo: "Vincular personagens", aoClicar: function () { vincular(c); } },
        "separador",
        { rotulo: "Excluir", perigo: true, aoClicar: function () { excluir(c); } },
      ], { rotulo: "Opções de " + c.nome, icone: "tresPontos" }),
    ]);
  }

  /* =================================================================
     CRIAR E EDITAR
     ================================================================= */

  function editar(campanha) {
    var criando = !campanha;

    var nome = UI.campo({ rotulo: "Nome", valor: criando ? "" : campanha.nome, limite: 80 });
    var descricao = UI.campo({
      rotulo: "Descrição", tipo: "area", linhas: 3, limite: 2000,
      valor: criando ? "" : (campanha.descricao || ""),
      ajuda: "Opcional.",
    });

    UI.modal({
      titulo: criando ? "Nova campanha" : "Editar campanha",
      conteudo: el("div.pilha", {}, [nome, descricao]),
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        {
          rotulo: criando ? "Criar" : "Salvar",
          classe: "r-botao--principal",
          aoClicar: async function (fechar) {
            var valor = nome.entrada.value.trim();
            if (!valor) { nome.marcarErro("Informe um nome."); nome.entrada.focus(); return; }

            var dados = { nome: valor, descricao: descricao.entrada.value.trim() };

            var r = criando
              ? await global.RAMAApi.criarCampanha(dados)
              : await global.RAMAApi.salvarCampanha(campanha.id, campanha.rev, dados);

            if (!r.ok) { UI.avisoDeFalha(r, criando ? "criação de campanha" : "gravação"); return; }

            fechar();
            await carregar();
            UI.avisoOk(criando ? "Campanha criada." : "Campanha atualizada.");
          },
        },
      ],
    });

    nome.entrada.focus();
  }

  /* =================================================================
     VINCULAR PERSONAGENS
     -----------------------------------------------------------------
     O vínculo mora no personagem (campanhaId), não numa lista dentro
     da campanha. Guardar dos dois lados exigiria manter os dois em
     sincronia — e a primeira gravação que falhasse deixaria um
     personagem numa campanha que não sabe dele.

     Cada troca é uma gravação da ficha daquele personagem, com a
     revisão dele. Por isso a ficha é lida antes: gravar sem a revisão
     atual seria justamente o atropelo que o sistema de rev existe
     para impedir.
     ================================================================= */

  function vincular(campanha) {
    if (!personagens.length) {
      UI.modal({
        titulo: "Nenhum personagem",
        conteudo: el("p", { texto: "Crie personagens antes de vinculá-los a uma campanha." }),
        botoes: [{ rotulo: "Entendi", classe: "r-botao--principal" }],
      });
      return;
    }

    var escolhidos = {};
    personagens.forEach(function (p) { escolhidos[p.id] = p.campanhaId === campanha.id; });

    UI.modal({
      titulo: "Personagens em " + campanha.nome,
      conteudo: el("div.pilha--curta", { class: "pilha" }, personagens.map(function (p) {
        var outra = p.campanhaId && p.campanhaId !== campanha.id;
        return el("label.r-marca", {}, [
          el("input", {
            type: "checkbox",
            checked: escolhidos[p.id],
            onchange: function (ev) { escolhidos[p.id] = ev.target.checked; },
          }),
          el("span", {}, [
            el("span.t-forte", { texto: p.nome }),
            outra ? el("span.t-mini", { texto: " · hoje em " + (p.campanha || "outra campanha") }) : null,
          ]),
        ]);
      })),
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        {
          rotulo: "Salvar vínculos",
          classe: "r-botao--principal",
          aoClicar: async function (fechar) {
            fechar();
            await aplicarVinculos(campanha, escolhidos);
          },
        },
      ],
    });
  }

  async function aplicarVinculos(campanha, escolhidos) {
    var mudar = personagens.filter(function (p) {
      var estava = p.campanhaId === campanha.id;
      return estava !== !!escolhidos[p.id];
    });

    if (!mudar.length) return;

    var aviso = UI.aviso("Atualizando " + mudar.length + " ficha(s)…", { duracao: 60000 });
    var falhas = 0;

    for (var i = 0; i < mudar.length; i++) {
      var p = mudar[i];

      var leitura = await global.RAMAApi.lerPersonagem(p.id);
      if (!leitura.ok) { falhas++; continue; }

      var ficha = global.RAMAFicha.normalizarFicha(leitura.dados);
      ficha.campanhaId = escolhidos[p.id] ? campanha.id : null;
      ficha.atualizadoEm = U.agoraISO();

      var gravacao = await global.RAMAApi.salvarPersonagem(p.id, U.inteiro(leitura.rev, 0), ficha);
      if (!gravacao.ok) falhas++;
    }

    aviso();

    if (falhas) {
      UI.avisoErro(falhas + " ficha(s) não puderam ser atualizadas. Tente de novo.");
    } else {
      UI.avisoOk("Vínculos atualizados.");
    }

    await carregar();
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
