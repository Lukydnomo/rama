/* =====================================================================
   R.A.M.A. — Perfil
   ---------------------------------------------------------------------
   Quem está usando o sistema, as preferências desta tela e as duas
   portas de entrada de dados: importar ficha e importar item.

   O que aparece aqui sobre a conta é o que o SERVIDOR devolveu, não o
   que estava guardado neste navegador. O cache local existe para
   desenhar o cabeçalho antes da resposta chegar; a fonte da verdade é
   sempre a planilha.

   Não existe troca de senha nesta tela. Senha é assunto exclusivo do
   Apps Script, e uma tela de troca sem confirmação de identidade do
   lado do servidor seria pior do que não ter tela nenhuma. O README
   explica como trocar a senha pelo editor do Apps Script.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var el = U.el;

  var perfil = null;
  var painel = null;

  global.RAMAApp.iniciar("perfil", async function (agente) {
    painel = U.$("#painel-perfil");

    U.trocar(painel, [
      global.RAMAApp.titulo({ titulo: "Perfil", trilha: [agente.nome || "Agente"] }),
      UI.carregando("Consultando arquivo"),
    ]);

    var r = await global.RAMAApi.lerPerfil();

    if (!r.ok) {
      U.trocar(painel, [
        global.RAMAApp.titulo({ titulo: "Perfil" }),
        UI.erroDeTela(r, function () { location.reload(); }),
      ]);
      return;
    }

    perfil = r.dados || {};
    desenhar();
  });

  function desenhar() {
    U.trocar(painel, [
      global.RAMAApp.titulo({
        titulo: "Perfil",
        trilha: [
          "@" + (perfil.usuario || ""),
          "Agente // " + U.codigoCurto(perfil.id || perfil.usuario || "rama"),
        ],
      }),

      UI.painel("Identidade", identidade()),
      UI.painel("Exibição", exibicao()),
      UI.painel("Importar", importacoes()),
      UI.painel("Sessão", sessao()),
    ]);
  }

  /* =================================================================
     IDENTIDADE
     ================================================================= */

  function identidade() {
    var avatar = el("span.r-avatar.r-avatar--g", { "aria-hidden": "true" });
    if (perfil.avatar) avatar.appendChild(el("img", { src: perfil.avatar, alt: "" }));
    else avatar.textContent = U.iniciais(perfil.nome);

    var nome = UI.campo({
      rotulo: "Nome de exibição", valor: perfil.nome || "", limite: 60,
      ajuda: "É o que aparece no cabeçalho do sistema.",
    });

    return el("div.pilha", {}, [
      el("div.faixa", {}, [
        avatar,
        el("div.pilha--curta", { class: "pilha" }, [
          el("button.r-botao.r-botao--fantasma", {
            type: "button", texto: perfil.avatar ? "Trocar avatar" : "Adicionar avatar",
            onclick: trocarAvatar,
          }),
          perfil.avatar ? el("button.r-botao.r-botao--mini.r-botao--fantasma", {
            type: "button", texto: "Remover avatar",
            onclick: function () { gravarAvatar(""); },
          }) : null,
        ]),
      ]),

      el("dl.r-dados", {}, [
        el("dt", { texto: "Usuário" }),
        el("dd", { texto: perfil.usuario || "—" }),
        el("dt", { texto: "Conta criada" }),
        el("dd", { texto: U.dataCurta(perfil.criadoEm) }),
      ]),

      nome,

      el("button.r-botao", {
        type: "button", texto: "Salvar nome",
        onclick: async function () {
          var valor = nome.entrada.value.trim();
          if (!valor) { nome.marcarErro("Informe um nome."); return; }

          var r = await global.RAMAApi.salvarPerfil({ nome: valor });
          if (!r.ok) { UI.avisoDeFalha(r, "gravação do perfil"); return; }

          perfil.nome = valor;
          UI.avisoOk("Nome atualizado.");
          desenhar();
        },
      }),

      el("p.t-mini", {
        texto: "Para trocar a senha, use a função administrativa no editor do Apps Script. " +
               "Senha nunca passa por esta tela.",
      }),
    ]);
  }

  async function trocarAvatar() {
    var img = await global.RAMAImagem.escolher();
    if (!img.ok) {
      if (img.erro !== "cancelado") UI.avisoErro(img.mensagem || "Não foi possível usar esta imagem.");
      return;
    }
    await gravarAvatar(img.imagem);
  }

  async function gravarAvatar(imagem) {
    var aviso = UI.aviso("Enviando…", { duracao: 30000 });
    var r = await global.RAMAApi.salvarPerfil({ avatar: imagem });
    aviso();

    if (!r.ok) { UI.avisoDeFalha(r, "gravação do avatar"); return; }

    perfil.avatar = imagem;
    UI.avisoOk(imagem ? "Avatar atualizado." : "Avatar removido.");
    desenhar();
  }

  /* =================================================================
     EXIBIÇÃO
     -----------------------------------------------------------------
     Preferências deste aparelho, e não da conta: o celular pode querer
     letra maior sem o computador mudar junto.

     A escala existe porque a família PixelMplus foi desenhada em grade
     de 12 pixels. Ela fica nítida em 12 e em 24, e um pouco macia no
     meio do caminho — quem precisa de letra maior escolhe a troca.
     ================================================================= */

  function exibicao() {
    var prefs = global.RAMAApp.preferencias();

    return el("div.pilha", {}, [
      el("div.r-campo", {}, [
        el("span.r-rotulo", { texto: "Tamanho da interface" }),
        el("div.filtros__grupo", { role: "group", "aria-label": "Tamanho da interface" },
          [1, 1.25, 1.5, 1.75].map(function (v) {
            return el("button.filtro", {
              type: "button",
              "aria-pressed": String(Math.abs(prefs.escala - v) < 0.01),
              texto: Math.round(v * 100) + "%",
              onclick: function () { global.RAMAApp.definirEscala(v); desenhar(); },
            });
          })
        ),
        el("p.r-ajuda", { texto: "A fonte pixel é mais nítida em 100%. Acima disso ela cresce e fica levemente macia." }),
      ]),

      el("label.r-marca", {}, [
        el("input", {
          type: "checkbox", checked: prefs.efeitos,
          onchange: function (ev) { global.RAMAApp.definirEfeitos(ev.target.checked); },
        }),
        el("span", { texto: "Efeito de tela antiga (linhas e vinheta)" }),
      ]),

      el("p.t-mini", { texto: "Estas preferências valem só neste aparelho e não sobem para a planilha." }),
    ]);
  }

  /* =================================================================
     IMPORTAR
     ================================================================= */

  function importacoes() {
    return el("div.pilha", {}, [
      el("p", { texto: "Traga uma ficha ou um item vindos de outro arquivo do R.A.M.A. Nada é gravado antes de você conferir a prévia." }),

      el("div.faixa", {}, [
        el("button.r-botao", {
          type: "button", texto: "Importar ficha", onclick: importarFicha,
        }),
        el("button.r-botao", {
          type: "button", texto: "Importar item", onclick: importarItem,
        }),
      ]),

      el("p.t-mini", {
        texto: "O registro importado sempre entra como novo, sob a sua conta. " +
               "Nenhuma ficha existente é sobrescrita.",
      }),
    ]);
  }

  function importarFicha() {
    global.RAMAImportar.abrir({
      tipo: "personagem",
      aoConfirmar: async function (ficha) {
        var r = await global.RAMAApi.criarPersonagem(ficha);
        if (!r.ok) { UI.avisoDeFalha(r, "importação de ficha"); return false; }

        UI.avisoOk(ficha.nome + " foi importado.", {
          acao: {
            rotulo: "Abrir ficha",
            aoClicar: function () { location.href = U.url("ficha/?id=" + encodeURIComponent(r.dados.id)); },
          },
        });
        return true;
      },
    });
  }

  function importarItem() {
    global.RAMAImportar.abrir({
      tipo: "homebrew-item",
      aoConfirmar: async function (item) {
        var r = await global.RAMAApi.salvarHomebrew(item);
        if (!r.ok) { UI.avisoDeFalha(r, "importação de item"); return false; }

        UI.avisoOk(item.nome + " entrou na biblioteca.", {
          acao: { rotulo: "Ver Homebrew", aoClicar: function () { location.href = U.url("homebrew/"); } },
        });
        return true;
      },
    });
  }

  /* =================================================================
     SESSÃO
     ================================================================= */

  function sessao() {
    return el("div.pilha", {}, [
      el("dl.r-dados", {}, [
        el("dt", { texto: "Servidor" }),
        el("dd", { texto: resumoDoEndereco() }),
        el("dt", { texto: "Estado" }),
        el("dd", {}, [el("span.r-estado", { dataset: { estado: "salvo" }, texto: "Conectado" })]),
      ]),

      el("div.faixa", {}, [
        el("button.r-botao.r-botao--fantasma", {
          type: "button", texto: "Testar conexão", onclick: testar,
        }),
        el("button.r-botao.r-botao--perigo", {
          type: "button", texto: "Sair", onclick: sair,
        }),
      ]),
    ]);
  }

  /* O endereço do Apps Script não é segredo — ele viaja em toda
     requisição e está no config.js público. Mostrar só o começo evita
     uma linha enorme na tela sem fingir que é confidencial. */
  function resumoDoEndereco() {
    var url = global.RAMARede.endereco();
    if (!url) return "não configurado";
    return url.slice(0, 46) + (url.length > 46 ? "…" : "");
  }

  async function testar() {
    var aviso = UI.aviso("Falando com o servidor…", { duracao: 30000 });
    var inicio = Date.now();
    var r = await global.RAMAApi.ping();
    var levou = Date.now() - inicio;
    aviso();

    if (!r.ok) { UI.avisoDeFalha(r, "teste de conexão"); return; }

    UI.avisoOk("Servidor respondeu em " + levou + " ms" +
      (r.dados && r.dados.planilha ? " · planilha " + r.dados.planilha : "") + ".");
  }

  async function sair() {
    var certeza = await UI.confirmar({
      titulo: "Sair do R.A.M.A.?",
      texto: "A sessão deste aparelho será encerrada.",
      detalhe: "Seus personagens continuam guardados no arquivo.",
      rotuloConfirmar: "Sair",
    });
    if (certeza) global.RAMAAuth.sair();
  }
})(window);
