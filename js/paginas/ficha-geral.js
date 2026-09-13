/* =====================================================================
   R.A.M.A. — ficha · bloco superior e aba Geral
   ---------------------------------------------------------------------
   Foto, atributos, status e defesa ficam sempre à vista, acima das
   abas. É o que a mesa consulta e mexe a cada turno: esconder PV atrás
   de uma aba custaria um clique em toda perda de vida.

   A separação entre os dois modos aparece inteira aqui:

     normal  — clicar num atributo ROLA. O valor e o dado são leitura.
               Nos status, só o ATUAL se mexe.
     edição  — nada rola. Tudo vira campo: valor, dado, nome, máximo, e
               atributos e status podem nascer e morrer.

   O valor e o dado de um atributo são informações DIFERENTES. Vigor 2
   não quer dizer 2d20 — pode ser um Vigor 2 que rola 3d20. Por isso
   são dois campos, e não um só derivando do outro.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var F = global.RAMAFicha;
  var V = global.RAMAValidacao;
  var el = U.el;

  /* =================================================================
     BLOCO SUPERIOR
     ================================================================= */

  function blocoSuperior(ctx) {
    return el("div.ficha-geral", {}, [
      el("div.ficha-identidade", {}, [foto(ctx), identidade(ctx)]),
      el("div.pilha--larga", { class: "pilha" }, [
        UI.painel("Atributos", atributos(ctx), { acoes: ctx.emEdicao() ? [
          el("button.r-botao.r-botao--mini", {
            type: "button", texto: "+ Atributo", onclick: function () { novoAtributo(ctx); },
          }),
        ] : null }),
        UI.painel("Status", status(ctx), { acoes: ctx.emEdicao() ? [
          el("button.r-botao.r-botao--mini", {
            type: "button", texto: "+ Status", onclick: function () { novoStatus(ctx); },
          }),
        ] : null }),
        UI.painel("Defesa", defesa(ctx)),
      ]),
    ]);
  }

  /* =================================================================
     FOTO
     ================================================================= */

  function foto(ctx) {
    var caixa = el("div.ficha-foto");

    if (ctx.foto) {
      caixa.appendChild(el("img", { src: ctx.foto, alt: "Foto de " + ctx.ficha.nome }));
    } else {
      caixa.appendChild(el("div.ficha-foto__vazio", {}, [UI.marca(48)]));
    }

    if (ctx.emEdicao()) {
      caixa.appendChild(el("button.ficha-foto__trocar", {
        type: "button",
        texto: ctx.foto ? "Trocar foto" : "Adicionar foto",
        onclick: function () { trocarFoto(ctx); },
      }));
    }

    return caixa;
  }

  async function trocarFoto(ctx) {
    var img = await global.RAMAImagem.escolher();
    if (!img.ok) {
      if (img.erro !== "cancelado") UI.avisoErro(img.mensagem || "Não foi possível usar esta imagem.");
      return;
    }

    var aviso = UI.aviso("Enviando foto…", { duracao: 30000 });
    var r = await global.RAMAApi.salvarFoto(ctx.personagemId, img.imagem);
    aviso();

    if (!r.ok) { UI.avisoDeFalha(r, "envio da foto"); return; }

    ctx.definirFoto(img.imagem);
    UI.avisoOk("Foto atualizada.");
  }

  /* =================================================================
     IDENTIDADE
     ================================================================= */

  function identidade(ctx) {
    if (!ctx.emEdicao()) {
      return el("dl.r-dados", {}, [
        el("dt", { texto: "Classe" }),
        el("dd", { texto: ctx.ficha.classe || "—" }),
        el("dt", { texto: "Origem" }),
        el("dd", { texto: ctx.ficha.origem || "—" }),
        el("dt", { texto: "Campanha" }),
        el("dd", { texto: ctx.nomeDaCampanha() || "—" }),
      ]);
    }

    return el("div.pilha--curta", { class: "pilha" }, [
      UI.campo({
        rotulo: "Nome", valor: ctx.ficha.nome, limite: 80,
        aoMudar: function (v) {
          ctx.ficha.nome = U.aparar(v, 80) || "Sem nome";
          ctx.alterou();
          ctx.atualizarTitulo();
        },
      }),
      UI.campo({
        rotulo: "Classe", valor: ctx.ficha.classe, limite: 60,
        aoMudar: function (v) { ctx.ficha.classe = U.aparar(v, 60); ctx.alterou(); ctx.atualizarTitulo(); },
      }),
      UI.campo({
        rotulo: "Origem", valor: ctx.ficha.origem, limite: 60,
        aoMudar: function (v) { ctx.ficha.origem = U.aparar(v, 60); ctx.alterou(); ctx.atualizarTitulo(); },
      }),
      campoCampanha(ctx),
    ]);
  }

  /* =================================================================
     CAMPANHA
     -----------------------------------------------------------------
     O mesmo controle nas fichas universal e de Ordem.

     Só entram as campanhas em que a conta é mestre ou jogadora — é o
     que o servidor aceita. Oferecer uma campanha que a pessoa só
     observa faria a escolha sumir em silêncio na gravação.

     Quem abriu como mestre vê a campanha, mas não troca: para onde o
     personagem vai é decisão do dono. O servidor mantém a campanha de
     uma ficha salva por quem não é dono, com ou sem este controle.
     ================================================================= */

  function campoCampanha(ctx) {
    var atual = ctx.ficha.campanhaId || "";

    if (ctx.ehDono && !ctx.ehDono()) {
      return UI.campo({
        rotulo: "Campanha",
        valor: ctx.nomeDaCampanha() || (atual ? "Campanha atual" : "Sem campanha"),
        desabilitado: true,
        ajuda: "Só o dono do personagem troca a campanha da ficha.",
      });
    }

    var opcoes = [{ valor: "", rotulo: "Sem campanha" }];
    var achouAtual = !atual;
    ctx.campanhas.forEach(function (c) {
      var joga = c.papel === "mestre" || c.papel === "jogador";
      if (!joga && c.id !== atual) return;
      if (c.id === atual) achouAtual = true;
      opcoes.push({ valor: c.id, rotulo: c.nome });
    });
    /* Uma campanha que não está mais na lista (a pessoa saiu dela) não
       some do seletor: mostrar "Sem campanha" ali seria dizer uma coisa
       e gravar outra. */
    if (!achouAtual) opcoes.push({ valor: atual, rotulo: "Campanha fora do seu alcance" });

    return UI.campo({
      rotulo: "Campanha",
      tipo: "selecao",
      valor: atual,
      opcoes: opcoes,
      ajuda: "Aparecem as campanhas em que você é mestre ou jogador. Também dá para adicionar pela aba Personagens da campanha.",
      aoMudar: function (v) {
        if (ctx.definirCampanha) ctx.definirCampanha(v);
        else { ctx.ficha.campanhaId = v || null; ctx.alterou(); ctx.atualizarTitulo(); }
      },
    });
  }

  /* =================================================================
     ATRIBUTOS
     ================================================================= */

  function atributos(ctx) {
    if (!ctx.ficha.atributos.length) {
      return el("p.t-mini", { texto: "Nenhum atributo. Acrescente um no modo edição." });
    }

    return el("div.atributos", {}, ctx.ficha.atributos.map(function (a) {
      return ctx.emEdicao() ? atributoEmEdicao(ctx, a) : atributoNormal(ctx, a);
    }));
  }

  function atributoNormal(ctx, a) {
    return el("div.atributo", {}, [
      el("button.atributo__caixa", {
        type: "button",
        "aria-label": "Rolar " + a.nome + ", " + a.dado,
        title: "Rolar " + a.dado,
        onclick: function () { rolarAtributo(a); },
      }, [
        el("span.atributo__sigla", { texto: a.sigla }),
        el("span.atributo__valor", { texto: String(a.valor) }),
        el("span.atributo__dado", { texto: a.dado }),
      ]),
      el("span.t-mini", { texto: a.nome, estilo: { textAlign: "center" } }),
    ]);
  }

  function rolarAtributo(a) {
    var r = global.RAMADados.rolar(a.dado);
    if (!r.ok) {
      UI.avisoErro("O dado de " + a.nome + " (" + a.dado + ") não é uma expressão válida.");
      return;
    }
    global.RAMARolagens.mostrar({
      tipo: "atributo",
      nome: a.nome,
      expressao: r.expressao,
      rolagens: r.rolagens,
      natural: r.principal,
      total: r.principal,
      parcelas: [],
    }, { nome: a.nome });
  }

  function atributoEmEdicao(ctx, a) {
    return el("div.atributo", {}, [
      el("div.atributo__edicao", {}, [
        UI.campo({
          rotulo: "Nome", valor: a.nome, limite: 40,
          aoMudar: function (v) { a.nome = U.aparar(v, 40) || a.nome; ctx.alterou(); ctx.redesenhar(); },
        }),
        UI.campo({
          rotulo: "Sigla", valor: a.sigla, limite: 6,
          aoMudar: function (v) { a.sigla = (U.aparar(v, 6) || a.sigla).toUpperCase(); ctx.alterou(); ctx.redesenhar(); },
        }),
        UI.campo({
          rotulo: "Valor", tipo: "numero", valor: a.valor,
          aoMudar: function (v, entrada) {
            var r = V.valorDeAtributo(v);
            if (!r.ok) { entrada.value = String(a.valor); UI.avisoErro(r.mensagem); return; }
            a.valor = r.valor; ctx.alterou();
          },
        }),
        UI.campo({
          rotulo: "Dado", valor: a.dado, limite: 12, ajuda: "NdX, ex. 2d20 ou -2d20",
          aoMudar: function (v, entrada) {
            var r = V.dado(v);
            if (!r.ok) { entrada.value = a.dado; UI.avisoErro(r.mensagem); return; }
            a.dado = r.valor; entrada.value = r.valor; ctx.alterou();
          },
        }),
        el("button.r-botao.r-botao--mini.r-botao--perigo", {
          type: "button", texto: "Remover",
          onclick: function () { removerAtributo(ctx, a); },
        }),
      ]),
    ]);
  }

  function novoAtributo(ctx) {
    ctx.ficha.atributos.push({
      id: U.uuid(),
      natureza: F.NATUREZA.ROLAVEL,
      nome: "Novo atributo",
      sigla: "NOV",
      valor: 0,
      dado: F.DADO_PADRAO,
    });
    ctx.alterou();
    ctx.redesenhar();
  }

  async function removerAtributo(ctx, a) {
    /* Uma perícia sem atributo rola no vazio. Melhor dizer quantas
       serão afetadas antes, do que consertar 28 vínculos depois. */
    var dependentes = ctx.ficha.pericias.filter(function (p) { return p.atributoId === a.id; });

    if (ctx.ficha.atributos.length <= 1) {
      UI.avisoErro("A ficha precisa de pelo menos um atributo.");
      return;
    }

    var certeza = await UI.confirmar({
      titulo: "Remover " + a.nome + "?",
      texto: dependentes.length
        ? dependentes.length + " perícia(s) usam este atributo e passarão a usar o primeiro da lista."
        : "O atributo será removido da ficha.",
      detalhe: "Esta ação não pode ser desfeita.",
      rotuloConfirmar: "Remover",
      perigo: true,
    });

    if (!certeza) return;

    ctx.ficha.atributos = ctx.ficha.atributos.filter(function (x) { return x.id !== a.id; });
    var primeiro = ctx.ficha.atributos[0].id;

    ctx.ficha.pericias.forEach(function (p) {
      if (p.atributoId === a.id) p.atributoId = primeiro;
      if (p.atributosPermitidos) {
        p.atributosPermitidos = p.atributosPermitidos.filter(function (id) { return id !== a.id; });
        if (p.atributosPermitidos.length < 2) delete p.atributosPermitidos;
      }
    });

    ctx.alterou();
    ctx.redesenhar();
  }

  /* =================================================================
     STATUS
     ================================================================= */

  function status(ctx) {
    if (!ctx.ficha.status.length) {
      return el("p.t-mini", { texto: "Nenhum status. Acrescente um no modo edição." });
    }
    return el("div.status-lista", {}, ctx.ficha.status.map(function (s) {
      return ctx.emEdicao() ? statusEmEdicao(ctx, s) : statusNormal(ctx, s);
    }));
  }

  function statusNormal(ctx, s) {
    var resumo = F.resumoDeStatus(s);

    var caixa = el("div.status", { dataset: { nivel: resumo.nivel } }, [
      el("div.status__topo", {}, [
        el("span.status__nome", { texto: s.nome }),
        el("span.status__maximo", { texto: "/ " + s.maximo }),
      ]),
      UI.passo({
        valor: s.atual,
        minimo: -9999,
        maximo: s.maximo > 0 ? s.maximo : 999999,
        rotulo: s.nome,
        aoMudar: function (v) {
          s.atual = v;
          ctx.alterou();
          /* A barra e o nível acompanham sem redesenhar a ficha
             inteira: redesenhar tiraria o foco de quem está digitando
             no campo ao lado. */
          var novo = F.resumoDeStatus(s);
          caixa.dataset.nivel = novo.nivel;
          var barra = U.$(".status__preenche", caixa);
          if (barra) barra.style.width = novo.porcentagem + "%";
        },
      }),
      el("div.status__barra", { "aria-hidden": "true" }, [
        el("div.status__preenche", { estilo: { width: resumo.porcentagem + "%" } }),
      ]),
    ]);

    return caixa;
  }

  function statusEmEdicao(ctx, s) {
    return el("div.status", {}, [
      UI.campo({
        rotulo: "Nome", valor: s.nome, limite: 40,
        aoMudar: function (v) { s.nome = U.aparar(v, 40) || s.nome; ctx.alterou(); ctx.redesenhar(); },
      }),
      el("div.editar-grade", {}, [
        UI.campo({
          rotulo: "Atual", tipo: "numero", valor: s.atual,
          aoMudar: function (v, entrada) {
            var r = V.valorDeStatus(v);
            if (!r.ok) { entrada.value = String(s.atual); UI.avisoErro(r.mensagem); return; }
            s.atual = r.valor; ctx.alterou();
          },
        }),
        UI.campo({
          rotulo: "Máximo", tipo: "numero", valor: s.maximo,
          aoMudar: function (v, entrada) {
            var r = V.valorDeStatus(v);
            if (!r.ok || r.valor < 0) { entrada.value = String(s.maximo); UI.avisoErro(r.mensagem || "O máximo não pode ser negativo."); return; }
            s.maximo = r.valor; ctx.alterou();
          },
        }),
      ]),
      el("button.r-botao.r-botao--mini.r-botao--perigo", {
        type: "button", texto: "Remover",
        onclick: function () { removerStatus(ctx, s); },
      }),
    ]);
  }

  function novoStatus(ctx) {
    ctx.ficha.status.push({ id: U.uuid(), nome: "Novo status", atual: 0, maximo: 0 });
    ctx.alterou();
    ctx.redesenhar();
  }

  async function removerStatus(ctx, s) {
    var certeza = await UI.confirmar({
      titulo: "Remover " + s.nome + "?",
      texto: "O status será removido desta ficha.",
      detalhe: "Esta ação não pode ser desfeita.",
      rotuloConfirmar: "Remover",
      perigo: true,
    });
    if (!certeza) return;
    ctx.ficha.status = ctx.ficha.status.filter(function (x) { return x.id !== s.id; });
    ctx.alterou();
    ctx.redesenhar();
  }

  /* =================================================================
     DEFESA
     -----------------------------------------------------------------
     Valores configuráveis, sem fórmula automática. Cada mesa calcula
     defesa de um jeito, e um número calculado sozinho que não bate com
     a mesa é pior do que um número digitado à mão.
     ================================================================= */

  var CAMPOS_DEFESA = [
    { chave: "dt", rotulo: "DT" },
    { chave: "esquiva", rotulo: "Esquiva" },
    { chave: "bloqueio", rotulo: "Bloqueio" },
    { chave: "resistencia", rotulo: "Resistência" },
  ];

  function defesa(ctx) {
    var armaduras = F.defesaDeArmaduras(ctx.ficha.inventario);

    return el("div.pilha--curta", { class: "pilha" }, [
      el("div.defesa", {}, CAMPOS_DEFESA.map(function (c) {
        if (!ctx.emEdicao()) {
          return el("div.defesa__item", {}, [
            el("span.t-rotulo", { texto: c.rotulo }),
            el("span.defesa__valor", { texto: String(ctx.ficha.defesa[c.chave]) }),
          ]);
        }
        return el("div.defesa__item", {}, [
          UI.campo({
            rotulo: c.rotulo, tipo: "numero", valor: ctx.ficha.defesa[c.chave],
            aoMudar: function (v, entrada) {
              var r = V.inteiroEntre(v, -999, 999, c.rotulo);
              if (!r.ok) { entrada.value = String(ctx.ficha.defesa[c.chave]); UI.avisoErro(r.mensagem); return; }
              ctx.ficha.defesa[c.chave] = r.valor; ctx.alterou();
            },
          }),
        ]);
      })),

      /* As armaduras somam um número, mas ele não entra na defesa
         sozinho: quem decide como a armadura conta é a mesa. Fica como
         informação ao lado. */
      armaduras ? el("p.t-mini", {
        texto: "As armaduras no inventário somam " + armaduras + " de defesa. " +
               "Some onde a sua mesa usa — o R.A.M.A. não calcula isso sozinho.",
      }) : null,
    ]);
  }

  /* =================================================================
     ABA GERAL — campos personalizados
     ================================================================= */

  function aba(ctx) {
    return el("div.pilha--larga", { class: "pilha" }, [
      UI.painel("Registro", el("dl.r-dados", {}, [
        el("dt", { texto: "Registro" }),
        el("dd", { texto: U.codigoCurto(ctx.personagemId) }),
        el("dt", { texto: "Criado em" }),
        el("dd", { texto: U.dataHora(ctx.ficha.criadoEm) }),
        el("dt", { texto: "Atualizado" }),
        el("dd", { texto: U.dataHora(ctx.ficha.atualizadoEm) }),
        el("dt", { texto: "Revisão" }),
        el("dd", { texto: String(ctx.revisao()) }),
      ])),

      UI.painel("Campos personalizados", camposPersonalizados(ctx), {
        acoes: ctx.emEdicao() ? [
          el("button.r-botao.r-botao--mini", {
            type: "button", texto: "+ Informação",
            onclick: function () { novoCampo(ctx, F.NATUREZA.INFORMACAO); },
          }),
          el("button.r-botao.r-botao--mini", {
            type: "button", texto: "+ Rolável",
            onclick: function () { novoCampo(ctx, F.NATUREZA.ROLAVEL); },
          }),
        ] : null,
      }),
    ]);
  }

  function camposPersonalizados(ctx) {
    var campos = ctx.ficha.camposCustomizados || [];

    if (!campos.length) {
      return el("p.t-mini", {
        texto: ctx.emEdicao()
          ? "Nenhum campo ainda. Um campo de informação guarda texto; um rolável guarda um valor e um dado próprio."
          : "Nenhum campo personalizado nesta ficha.",
      });
    }

    return el("div.editar-grade", {}, campos.map(function (c) {
      return ctx.emEdicao() ? campoEmEdicao(ctx, c) : campoNormal(ctx, c);
    }));
  }

  function campoNormal(ctx, c) {
    if (c.natureza === F.NATUREZA.ROLAVEL) {
      return el("div.atributo", {}, [
        el("button.atributo__caixa", {
          type: "button",
          "aria-label": "Rolar " + c.nome + ", " + c.dado,
          onclick: function () { rolarAtributo({ nome: c.nome, dado: c.dado }); },
        }, [
          el("span.atributo__sigla", { texto: c.nome }),
          el("span.atributo__valor", { texto: String(c.valor) }),
          el("span.atributo__dado", { texto: c.dado }),
        ]),
      ]);
    }
    return el("div.defesa__item", {}, [
      el("span.t-rotulo", { texto: c.nome }),
      el("span", { texto: U.texto(c.valor) || "—" }),
    ]);
  }

  function campoEmEdicao(ctx, c) {
    return el("div.linha-editavel", { estilo: { gridTemplateColumns: "1fr" } }, [
      el("div.pilha--curta", { class: "pilha" }, [
        UI.campo({
          rotulo: "Nome do campo", valor: c.nome, limite: 60,
          aoMudar: function (v) { c.nome = U.aparar(v, 60) || c.nome; ctx.alterou(); },
        }),
        c.natureza === F.NATUREZA.ROLAVEL
          ? el("div.editar-grade", {}, [
              UI.campo({
                rotulo: "Valor", tipo: "numero", valor: c.valor,
                aoMudar: function (v, entrada) {
                  var r = V.inteiroEntre(v, -9999, 999999, "O valor");
                  if (!r.ok) { entrada.value = String(c.valor); UI.avisoErro(r.mensagem); return; }
                  c.valor = r.valor; ctx.alterou();
                },
              }),
              UI.campo({
                rotulo: "Dado", valor: c.dado, limite: 12,
                aoMudar: function (v, entrada) {
                  var r = V.dado(v);
                  if (!r.ok) { entrada.value = c.dado; UI.avisoErro(r.mensagem); return; }
                  c.dado = r.valor; entrada.value = r.valor; ctx.alterou();
                },
              }),
            ])
          : UI.campo({
              rotulo: "Conteúdo", tipo: "area", valor: c.valor, linhas: 3, limite: 2000,
              aoMudar: function (v) { c.valor = U.aparar(v, 2000); ctx.alterou(); },
            }),
        el("button.r-botao.r-botao--mini.r-botao--perigo", {
          type: "button", texto: "Remover campo",
          onclick: function () {
            ctx.ficha.camposCustomizados = ctx.ficha.camposCustomizados.filter(function (x) { return x.id !== c.id; });
            ctx.alterou();
            ctx.redesenhar();
          },
        }),
      ]),
    ]);
  }

  function novoCampo(ctx, natureza) {
    if (!Array.isArray(ctx.ficha.camposCustomizados)) ctx.ficha.camposCustomizados = [];
    ctx.ficha.camposCustomizados.push(F.criarCampo(natureza));
    ctx.alterou();
    ctx.redesenhar();
  }

  global.RAMASecaoGeral = { blocoSuperior: blocoSuperior, aba: aba, foto: foto, campoCampanha: campoCampanha };
})(window);
