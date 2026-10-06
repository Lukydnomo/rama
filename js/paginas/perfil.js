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
    /* A leitura do perfil é a mais nova: o tema salvo vale sobre o cache. */
    if (global.RAMATema && perfil.preferencias) {
      global.RAMATema.sincronizarDaConta(perfil.id, perfil.preferencias.tema, { temaPersonalizado: temaAtivoDe(perfil.preferencias) });
    }
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
      UI.painel("Recompensas", recompensas()),
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
          el("div.faixa.faixa--curta", {}, [
            el("button.r-botao.r-botao--fantasma", {
              type: "button", texto: perfil.avatar ? "Trocar avatar" : "Adicionar avatar",
              onclick: trocarAvatar,
            }),
            /* O tema do site (v2.36): o lápis abre o editor da conta. */
            el("button.r-icone.r-icone--contorno", {
              type: "button", "aria-label": "Personalizar tema do site", title: "Personalizar tema do site",
              onclick: abrirTema,
            }, [UI.simbolo("lapis")]),
          ]),
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

  /* O editor de recorte (v2.27): o avatar só é enviado em "Usar
     imagem", com o editor aberto; falhou, o enquadramento continua lá. */
  async function trocarAvatar() {
    var r = await global.RAMAEditorImagem.escolher("avatar", {
      contexto: "gravação do avatar",
      aoUsar: function (img) { return global.RAMAApi.salvarPerfil({ avatar: img.imagem }); },
    });
    if (!r.ok) return;
    perfil.avatar = r.imagem;
    UI.avisoOk("Avatar atualizado.");
    desenhar();
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
      campoTema(),

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

      el("p.t-mini", { texto: "O tema fica salvo na sua conta e vale em qualquer aparelho. Tamanho e efeito de tela valem só neste aparelho." }),
    ]);
  }

  /* Tema (v2.25, v2.36): "Sistema" fica aqui, à mão — um clique e a
  conta volta a seguir o aparelho. Claro, Escuro e os temas próprios
  moram no editor (o lápis ao lado do avatar, ou "Outros temas"). A
  troca é na hora e não redesenha a página; a linha de situação diz se
  a planilha guardou ou não. */
  var pararTema = null;

  function temaAtivoDe(prefs) {
    var p = prefs || {};
    var lista = global.RAMATemaModelo ? global.RAMATemaModelo.normalizarTemas(p.temas) : [];
    for (var i = 0; i < lista.length; i++) if (lista[i].id === p.temaAtivo) return lista[i];
    return null;
  }

  function nomeDoTema(info) {
    var T = global.RAMATema;
    if (info.preferencia === "personalizado" && T.personalizado()) return "“" + T.personalizado().tema.nome + "”";
    if (info.preferencia === "claro") return "Claro";
    if (info.preferencia === "escuro") return "Escuro";
    return "Sistema";
  }

  function abrirTema() {
    if (!global.RAMATemaEditor) { UI.avisoAtencao("O editor de temas não carregou. Recarregue a página."); return; }
    var prefs = Object.assign({}, perfil.preferencias || {});
    /* O que está na tela agora (um clique em Sistema já salvo) vale. */
    prefs.tema = global.RAMATema.preferencia();
    global.RAMATemaEditor.abrir({
      contexto: "conta",
      preferencias: prefs,
      aoSalvar: function (gravadas) { perfil.preferencias = gravadas || perfil.preferencias; },
    });
  }

  function campoTema() {
    var T = global.RAMATema;
    if (pararTema) { pararTema(); pararTema = null; }
    if (!T) return null;

    var sistema = el("button.filtro", {
      type: "button", texto: "Sistema",
      onclick: function () { T.salvar("sistema"); },
    });
    var outros = el("button.r-botao.r-botao--mini", {
      type: "button", texto: "Outros temas…", onclick: abrirTema,
      "aria-label": "Escolher ou personalizar o tema do site",
    });
    var situacao = el("p.r-ajuda", { role: "status", "aria-live": "polite" });
    var tentar = el("button.r-botao.r-botao--mini", {
      type: "button", texto: "Tentar de novo", hidden: true,
      onclick: function () { T.tentarDeNovo(); },
    });

    function pintar(info) {
      sistema.setAttribute("aria-pressed", String(info.preferencia === "sistema"));
      var base = info.preferencia === "sistema"
        ? "Acompanha o tema do aparelho (agora: " + info.efetivo + ")."
        : "Tema da conta: " + nomeDoTema(info) + " — não muda com o aparelho.";
      var fala = {
        salvando: "Salvando na conta…",
        salvo: "Salvo na conta.",
        erro: "Não foi possível salvar na conta: o tema vale nesta página até recarregar.",
      }[info.estado] || "";
      situacao.textContent = base + (fala ? " " + fala : "");
      situacao.classList.toggle("t-erro", info.estado === "erro");
      tentar.hidden = info.estado !== "erro";
    }

    pararTema = T.aoMudar(pintar);
    pintar({ preferencia: T.preferencia(), efetivo: T.efetivo(), estado: T.estado() });

    return el("div.r-campo", {}, [
      el("span.r-rotulo", { texto: "Tema" }),
      el("div.faixa.faixa--curta", { role: "group", "aria-label": "Tema" }, [sistema, outros]),
      situacao,
      tentar,
    ]);
  }

  /* =================================================================
     IMPORTAR
     ================================================================= */

  function importacoes() {
    return el("div.pilha", {}, [
      el("p", { texto: "Traga uma ficha ou um item vindos de outro arquivo do R.A.M.A., ou uma ficha pública do CRIS pelo link. Nada é gravado antes de você conferir a prévia." }),

      el("div.faixa", {}, [
        el("button.r-botao", {
          type: "button", texto: "Importar ficha", onclick: importarFicha,
        }),
        el("button.r-botao", {
          type: "button", texto: "Importar item", onclick: importarItem,
        }),
        el("button.r-botao", {
          type: "button", texto: "Importar do CRIS", onclick: importarDoCris,
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
        /* O desbloqueio é da conta: um tema de dados que esta conta não
           tem fica de fora, e a ficha usa o dado padrão. */
        if ((r.avisos || []).indexOf("tema_dados_indisponivel") >= 0) {
          UI.avisoAtencao("O tema de dados desta ficha não está desbloqueado nesta conta: ela usa o dado padrão. As cores do tema da ficha continuam.", { duracao: 9000 });
        }

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

  /* =================================================================
     RECOMPENSAS (v2.40) — temas de dados desbloqueados por código
     -----------------------------------------------------------------
     A coleção é da CONTA e vem do servidor: só o resgate concede. Aqui
     se resgata e se vê o que já está desbloqueado; quem escolhe o tema
     de cada personagem é o editor de tema da ficha.
     ================================================================= */

  var colecao = { lista: null, erro: false, carregando: false };

  function TD() { return global.RAMATemasDados || null; }
  function AR() { return global.RAMAAparenciaRolagem || null; }

  function carregarColecao() {
    if (colecao.carregando) return;
    colecao.carregando = true;
    global.RAMAApi.listarDesbloqueios({ segundoPlano: true }).then(function (r) {
      colecao.carregando = false;
      colecao.erro = !(r && r.ok);
      colecao.lista = r && r.ok ? ((r.dados || {}).temasDados || []) : null;
      pintarColecao();
    }, function () { colecao.carregando = false; colecao.erro = true; pintarColecao(); });
  }

  var areaColecao = null;
  function pintarColecao() {
    if (!areaColecao) return;
    var corpo;
    if (colecao.lista === null) {
      corpo = [el("p.t-mini", { texto: colecao.erro ? "Não foi possível consultar a sua coleção agora." : "Consultando a sua coleção…" })];
    } else if (!colecao.lista.length) {
      corpo = [el("p.t-mini", { texto: "Nenhum tema de dados desbloqueado ainda. O dado padrão acompanha o tema de cada ficha e está sempre disponível." })];
    } else {
      corpo = [el("ul.recompensas-lista", {}, colecao.lista.map(function (d) {
        var t = TD() ? TD().tema(d.id) : null;
        var ap = t ? { v: 1, tema: TD().atual(d.id) } : null;
        return el("li.recompensas-item", {}, [
          AR() ? AR().icone(ap, "linha") : null,
          el("span.recompensas-item__textos", {}, [
            el("span.t-forte", { texto: t ? t.nome : d.id }),
            el("span.t-mini", { texto: t ? t.descricao : "Tema que este site ainda não conhece — continua na sua conta." }),
          ]),
        ]);
      }))];
    }
    U.trocar(areaColecao, corpo);
  }

  function recompensas() {
    areaColecao = el("div.pilha--curta", { class: "pilha", "aria-live": "polite" });
    pintarColecao();
    if (colecao.lista === null && !colecao.carregando) carregarColecao();
    return el("div.pilha", {}, [
      el("p.t-mini", { texto: "Temas de dados mudam o dado e o fundo das notificações de rolagem. Um tema desbloqueado vale para todas as fichas desta conta; cada personagem escolhe o seu no editor de tema da ficha." }),
      el("div.faixa", {}, [
        el("button.r-botao", { type: "button", texto: "Resgatar código", onclick: resgatar }),
      ]),
      el("h3.t-rotulo", { texto: "Temas de dados desbloqueados" }),
      areaColecao,
    ]);
  }

  /* Um exemplo de notificação para a prévia (nada é rolado). */
  var EXEMPLO = { tipo: "pericia", expressao: "3d20+5", rolagens: [20, 13, 12], natural: 20, total: 25,
    parcelas: [{ rotulo: "Dado (AGI)", valor: 20 }, { rotulo: "Treinado", valor: 5 }] };

  function previaDaRecompensa(id) {
    var t = TD() ? TD().tema(id) : null;
    var ap = t ? { v: 1, tema: TD().atual(id) } : null;
    var cartao = global.RAMARolagens && global.RAMARolagens.cartao
      ? global.RAMARolagens.cartao(EXEMPLO, { nome: "Acrobacia" }, ap) : null;
    return el("div.recompensa-previa", { "aria-hidden": "true", inert: "" }, [
      AR() ? AR().icone(ap, "previa") : null,
      cartao,
    ]);
  }

  function resgatar() {
    var campo = UI.campo({ rotulo: "Código", limite: 60, autocomplete: "off",
      ajuda: "Espaços, hífens e maiúsculas não importam." });
    campo.entrada.setAttribute("spellcheck", "false");
    campo.entrada.setAttribute("autocapitalize", "characters");
    var saida = el("div.pilha--curta", { class: "pilha", role: "status", "aria-live": "polite" });
    var erro = el("p.r-ajuda.t-erro", { role: "alert", hidden: true });
    /* A mesma intenção leva a mesma operação: tentar de novo depois de
       uma falha de rede reconhece a concessão já feita no servidor. */
    var intencao = { codigo: "", operacao: "" };
    var concluido = false;

    function mostrarErro(texto) { erro.textContent = texto; erro.hidden = false; }

    function confirmar() {
      if (concluido) return null;
      var bruto = campo.entrada.value;
      var normal = TD() ? TD().normalizarCodigo(bruto) : String(bruto || "").trim();
      erro.hidden = true;
      U.limpar(saida);
      if (!normal) { campo.marcarErro("Use de 4 a 40 letras e números."); campo.entrada.focus(); return null; }
      campo.marcarErro("");
      if (intencao.codigo !== normal) intencao = { codigo: normal, operacao: global.RAMAApi.novaOperacao() };
      return global.RAMAApi.resgatarCodigo(normal, intencao.operacao).then(function (r) {
        if (r && r.ok) {
          concluido = true;
          var rec = ((r.dados || {}).recompensas || []);
          colecao.lista = (r.dados || {}).desbloqueios || colecao.lista;
          pintarColecao();
          U.trocar(saida, [
            el("p.t-forte", { texto: rec.length === 1 ? "Desbloqueado: " + rec[0].nome + "." : "Desbloqueados: " + rec.map(function (x) { return x.nome; }).join(", ") + "." }),
            rec.some(function (x) { return !x.novo; }) ? el("p.t-mini", { texto: "O que você já tinha continua igual — a coleção não duplica." }) : null,
          ].concat(rec.slice(0, 2).map(function (x) { return previaDaRecompensa(x.id); }), [
            el("p.t-mini", { texto: "Para usar, abra uma ficha, toque no lápis de “Personalizar tema desta ficha” e escolha em “Tema dos dados”." }),
          ]));
          var botao = m.janela.querySelector(".r-modal__rodape .r-botao--principal");
          if (botao) botao.hidden = true;
          return;
        }
        var codigo = r && r.erro;
        if (codigo === "ja_resgatado") {
          var ja = ((r.dados || {}).recompensas || []);
          mostrarErro("Este código já foi usado nesta conta" + (ja.length ? " — " + ja.map(function (x) { return x.nome; }).join(", ") + " já está na sua coleção." : "."));
          return;
        }
        if (codigo === "codigo_invalido") { mostrarErro("Código não reconhecido. Confira e tente de novo."); return; }
        if (codigo === "codigo_desativado") { mostrarErro("Este código não aceita mais resgates."); return; }
        if (codigo === "muitas_tentativas") { mostrarErro("Muitas tentativas erradas. Espere alguns minutos antes de tentar de novo."); return; }
        var f = global.RAMAApi.frase ? global.RAMAApi.frase(r || {}) : null;
        mostrarErro((f ? f.titulo + " — " + f.texto : "Não foi possível falar com o servidor.") + " Tentar de novo usa o mesmo pedido: nada é concedido duas vezes.");
      }, function () {
        mostrarErro("Falha de conexão. Tentar de novo usa o mesmo pedido: nada é concedido duas vezes.");
      });
    }

    campo.entrada.addEventListener("keydown", function (ev) {
      if (ev.key !== "Enter") return;
      ev.preventDefault();
      var botao = m.janela.querySelector(".r-modal__rodape .r-botao--principal");
      if (botao && !botao.hidden && botao.getAttribute("aria-busy") !== "true") botao.click();
    });

    var m = UI.modal({
      titulo: "Resgatar código",
      conteudo: [el("div.pilha--curta", { class: "pilha" }, [
        el("p.t-mini", { texto: "Códigos liberam temas de dados para a sua conta. Cada código vale uma vez por conta." }),
        campo, erro, saida,
      ])],
      botoes: [
        { rotulo: "Fechar", classe: "r-botao--fantasma" },
        { rotulo: "Resgatar", rotuloOcupado: "Resgatando…", classe: "r-botao--principal", aoClicar: function () { return confirmar(); } },
      ],
    });
  }

  /* Ficha pública do CRIS por link (v2.34). A janela consulta, converte,
     mostra a revisão e só cria no clique de "Criar ficha". */
  function importarDoCris() {
    if (!global.RAMAImportarCrisTela || !global.RAMAImportarCris) {
      UI.avisoAtencao("O importador do CRIS não carregou. Recarregue a página.");
      return;
    }
    global.RAMAImportarCrisTela.abrir({});
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
