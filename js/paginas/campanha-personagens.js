/* =====================================================================
   R.A.M.A. — campanha · aba Personagens
   =====================================================================
   O painel da mesa: uma grade de cartões compactos para o mestre
   acompanhar o grupo inteiro e ajustar PV, PE e Sanidade sem abrir
   cada ficha. O que cada cartão mostra vem de js/campanha-painel.js
   (RAMAPainelMesa); este arquivo só desenha e conversa com a fila.

   ---------------------------------------------------------------------
   AJUSTE RÁPIDO
   ---------------------------------------------------------------------

   [−], [+] e o número (que abre um campo). Cada mudança aparece na hora
   no cartão e entra na fila de gravação (js/fila.js), que junta cliques
   seguidos e manda o valor FINAL — repetir ou reenviar não desconta de
   novo. O pedido leva a revisão da ficha e a campanha; o servidor
   confere as duas e a permissão de mestre (ou de dono).

   Conflito de revisão quer dizer que a ficha mudou em outro lugar. A
   fila busca a listagem de novo e só reenvia se ESTE recurso continua
   com o valor de quando o mestre começou a mexer. Se o jogador acabou
   de gastar PE na ficha, o ajuste do mestre não passa por cima: a tela
   mostra o valor novo e avisa.

   ---------------------------------------------------------------------
   ATUALIZAÇÃO SEM REDESENHAR
   ---------------------------------------------------------------------

   Buscar a listagem de novo (botão Atualizar, ou depois de um conflito)
   atualiza cada cartão no lugar. Um recurso sendo digitado, ou com
   gravação pendente, não é tocado — o que chega de fora não apaga o que
   o mestre está fazendo. Resposta com revisão mais velha que a que o
   cartão conhece é ignorada.

   Atributos aparecem só para consulta: a edição deles é na ficha.

   ---------------------------------------------------------------------
   ADICIONAR E TIRAR
   ---------------------------------------------------------------------

   "Adicionar personagem" lista os personagens de quem abriu que ainda
   não estão nesta mesa e vincula com um clique — sem passar pela ficha.
   O mestre não vê ali as fichas dos jogadores: cada conta adiciona os
   seus. "Tirar da campanha" aparece para o mestre em qualquer cartão e
   para o dono no próprio personagem. As duas coisas usam o mesmo
   vincular_personagem, e o servidor confere dono, papel e campanha.

   ---------------------------------------------------------------------
   JOGADORES, E O QUE CADA UM VÊ
   ---------------------------------------------------------------------

   Os rótulos vêm da listagem (ver acaoListarPersonagensCampanha):

     próprio personagem   recursos com [−], [+] e edição; "Abrir ficha"
     personagem alheio    recursos atuais e máximos, só leitura; sem
                          "Abrir ficha"
     com "Esconder status dos jogadores" ligada (chave do mestre na barra
     desta aba)           o alheio aparece só com a identificação — o
                          servidor nem manda os números

   O mestre vê e ajusta tudo, e abre qualquer ficha da mesa. Quando a
   listagem de quem pode ver a ficha inteira mostra que o máximo guardado
   para a mesa ficou para trás, esta aba o regrava em segundo plano
   (atualizar_resumo_personagem), para os outros jogadores verem o número
   certo.

   A aba se atualiza sozinha pela sincronização da campanha
   (js/sincronia.js): cartão por cartão, sem tocar num recurso sendo
   digitado ou com gravação pendente.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var PM = global.RAMAPainelMesa;
  var el = U.el;

  /* Estado que sobrevive a um redesenho da aba: a fila e o que ainda não
     foi confirmado pelo servidor. */
  var painel = {
    ctx: null,
    fila: null,
    cartoes: {},
    grade: null,
    contagem: null,
    /* chave da fila → { base, valor } */
    pendentes: {},
  };

  global.RAMACampanhaPersonagens = {
    aba: function (ctx) {
      painel.ctx = ctx;
      painel.cartoes = {};
      painel.grade = null;

      /* Mudança vinda da sincronização: os dados novos já estão em
         ctx.personagens. Com a grade na tela, cartão por cartão; na tela
         de lista vazia (ou de erro), a aba se redesenha. */
      ctx.aoAtualizar("personagens", function () {
        if (painel.grade && document.body.contains(painel.grade) && ctx.personagens.length) {
          aplicarLista(ctx, ctx.personagens);
        } else {
          ctx.redesenhar();
        }
      });
      ctx.aoAtualizar("campanha", function () { pintarOcultacao(ctx); });

      if (!ctx.temPersonagens() && !ctx.falhaPersonagens) {
        return UI.carregando("Carregando a mesa");
      }

      if (ctx.falhaPersonagens) {
        return UI.erroDeTela(ctx.falhaPersonagens, function () { return ctx.atualizarPersonagens(); });
      }

      if (!ctx.personagens.length) {
        return UI.vazio({
          titulo: "Nenhum personagem na mesa",
          texto: ctx.ehMestre()
            ? "Adicione um personagem seu. Os jogadores adicionam os deles por esta mesma aba ou pela ficha."
            : "Adicione o seu personagem a esta campanha — por aqui ou pela ficha dele.",
          acao: podeAdicionar(ctx)
            ? { rotulo: "+ Adicionar personagem", aoClicar: function () { abrirAdicionar(ctx); } }
            : { rotulo: "Ver meus personagens", aoClicar: function () { location.href = U.url("personagens/"); } },
        });
      }

      painel.grade = el("div.mesa-grade", { role: "list", "aria-label": "Personagens da campanha" });
      ctx.personagens.forEach(function (p) { acrescentarCartao(ctx, p); });

      var contagem = painel.contagem = el("span.t-mini", { "aria-live": "polite" });
      contar();

      painel.ocultacao = el("div.mesa-ocultacao");
      pintarOcultacao(ctx);

      return el("div.pilha", {}, [
        el("div.mesa-barra", {}, [
          contagem,
          el("div.mesa-barra__acoes", {}, [
            el("button.r-botao.r-botao--mini.r-botao--fantasma", {
              type: "button",
              texto: "Atualizar",
              "aria-label": "Buscar os números mais recentes das fichas",
              onclick: function (ev) {
                return UI.ocupar(ev.currentTarget, function () { return buscarEAtualizar(ctx, true); },
                  { rotulo: "Atualizando…", regiao: painel.grade });
              },
            }),
            podeAdicionar(ctx)
              ? el("button.r-botao.r-botao--mini.r-botao--principal", {
                  type: "button",
                  texto: "+ Adicionar personagem",
                  onclick: function () { abrirAdicionar(ctx); },
                })
              : null,
          ]),
        ]),
        painel.ocultacao,
        painel.grade,
      ]);
    },
  };

  /* =================================================================
     ESCONDER STATUS DOS JOGADORES
     -----------------------------------------------------------------
     A chave é do mestre e vive na campanha (salvar_campanha, que só o
     mestre passa). O que ela faz acontece no SERVIDOR: com ela ligada, a
     listagem de cada jogador sai sem os recursos dos personagens dos
     outros, aqui e na lista do combate. Esta tela só mostra a chave e
     avisa o jogador de que ela está ligada.
     ================================================================= */

  function pintarOcultacao(ctx) {
    var caixa = painel.ocultacao;
    if (!caixa) return;
    var ligada = !!ctx.campanha.ocultarStatusJogadores;

    if (!ctx.ehMestre()) {
      U.trocar(caixa, ligada
        ? [el("p.t-mini.mesa-ocultacao__aviso", {
            texto: "O mestre escondeu os status dos jogadores: você vê os recursos só dos seus personagens.",
          })]
        : []);
      return;
    }

    var chave = el("button.r-interruptor", {
      type: "button",
      role: "switch",
      id: "mesa-ocultar-status",
      "aria-checked": String(ligada),
      class: ligada ? "r-interruptor--ligado" : "",
      "aria-describedby": "mesa-ocultar-status-ajuda",
      onclick: function (ev) { alternarOcultacao(ctx, ev.currentTarget, !ligada); },
    }, [el("span.r-interruptor__bola", { "aria-hidden": "true" })]);

    U.trocar(caixa, [
      el("label.mesa-ocultacao__chave", { for: "mesa-ocultar-status" }, [
        chave,
        el("span", { texto: "Esconder status dos jogadores" }),
      ]),
      el("p.t-mini", {
        id: "mesa-ocultar-status-ajuda",
        texto: ligada
          ? "Ligada: cada jogador vê os recursos só dos próprios personagens. Você continua vendo todos."
          : "Desligada: os jogadores veem os recursos de todos os personagens da mesa e editam só os próprios.",
      }),
    ]);
  }

  async function alternarOcultacao(ctx, botao, ligar) {
    var r = await UI.ocupar(botao, function () {
      return global.RAMAApi.salvarCampanha(ctx.campanhaId, undefined, { ocultarStatusJogadores: ligar });
    }, { rotulo: ligar ? "Ligando…" : "Desligando…" });

    if (!r || r.ignorado) return;
    if (!r.ok) {
      UI.avisoDeFalha(r, "configuração de status", {
        tentarDeNovo: function () { alternarOcultacao(ctx, U.$("#mesa-ocultar-status") || botao, ligar); },
      });
      return;
    }

    ctx.definirCampanha({ ocultarStatusJogadores: !!(r.dados ? r.dados.ocultarStatusJogadores : ligar) }, r.rev);
    pintarOcultacao(ctx);
    var foco = U.$("#mesa-ocultar-status");
    if (foco) foco.focus();
    UI.avisoOk(ligar
      ? "Status escondidos: os jogadores deixam de receber os recursos dos outros personagens."
      : "Status visíveis para a mesa.");
  }

  function contar() {
    if (!painel.contagem) return;
    var n = Object.keys(painel.cartoes).length;
    painel.contagem.textContent = n + (n === 1 ? " personagem" : " personagens") + " na mesa";
  }

  /* =================================================================
     CARTÃO
     ================================================================= */

  function acrescentarCartao(ctx, p) {
    var cartao = criarCartao(ctx, p);
    painel.cartoes[p.id] = cartao;
    painel.grade.appendChild(cartao.raiz);
  }

  function criarCartao(ctx, p) {
    var cartao = {
      /* O objeto que a fila segura: a revisão sobe nele a cada gravação,
         e todos os recursos do mesmo personagem enxergam a mesma. */
      personagem: { id: p.id, nome: p.nome, rev: U.inteiro(p.rev, 0) },
      resumo: null,
      recursos: {},
      raiz: el("article.mesa-cartao", { role: "listitem" }),
      estado: el("span.mesa-cartao__estado", { role: "status", "aria-live": "polite" }),
      timerEstado: null,
    };

    cartao.atualizar = function (pNovo) { pintarCartao(ctx, cartao, pNovo); };
    pintarCartao(ctx, cartao, p);
    return cartao;
  }

  function pintarCartao(ctx, cartao, p) {
    var r = PM.resumir(p);
    var editando = {};
    Object.keys(cartao.recursos).forEach(function (k) {
      if (cartao.recursos[k].editando) editando[k] = cartao.recursos[k];
    });

    /* Um recurso sendo digitado não é reconstruído: o nó dele volta para
       o cartão novo como estava. */
    cartao.resumo = r;
    cartao.personagem.nome = r.nome;
    cartao.personagem.rev = Math.max(cartao.personagem.rev, r.rev);
    cartao.raiz.setAttribute("aria-label", r.nome);
    cartao.raiz.className = "mesa-cartao mesa-cartao--" + r.tipo;

    var novos = {};
    var recursos = r.recursos.map(function (rec) {
      if (editando[rec.chave]) {
        novos[rec.chave] = editando[rec.chave];
        editando[rec.chave].definirLimites(rec);
        return editando[rec.chave].raiz;
      }
      var controle = controleDeRecurso(ctx, cartao, rec, p);
      novos[rec.chave] = controle;
      return controle.raiz;
    });
    cartao.recursos = novos;

    /* O mestre tira qualquer personagem; o dono, o próprio. */
    var podeTirar = ctx.ehMestre() || r.souDono;
    var podeAbrir = r.podeAbrirFicha !== null ? r.podeAbrirFicha : (ctx.ehMestre() || r.souDono);

    /* Quem vê a ficha inteira percebe que o máximo guardado para a mesa
       ficou para trás e o regrava. */
    if (r.resumoDesatualizado) regravarResumo(r);

    U.trocar(cartao.raiz, [
      el("div.mesa-cartao__topo", {}, [
        foto(r),
        el("div.mesa-cartao__id", {}, [
          el("h3.mesa-cartao__nome", { title: r.nome, texto: r.nome }),
          r.linhas.length ? el("p.mesa-cartao__linha", { texto: r.linhas.join(" · ") }) : null,
          el("p.mesa-cartao__linha", { texto: r.souDono ? "Seu personagem" : (r.dono ? "Jogador: " + r.dono : "") }),
          r.progressao ? el("p.mesa-cartao__linha.mesa-cartao__progressao", { texto: r.progressao }) : null,
        ]),
        podeTirar
          ? UI.menu([
              { rotulo: "Tirar da campanha", perigo: true, aoClicar: function () { desvincular(ctx, cartao); } },
            ], { rotulo: "Mais ações para " + r.nome, icone: "tresPontos" })
          : null,
      ]),

      r.atributos.length
        ? el("dl.mesa-atributos", { "aria-label": "Atributos de " + r.nome + " (só leitura)" },
            r.atributos.map(function (a) {
              return el("div.mesa-atributo", { title: a.nome }, [
                el("dt", { texto: a.sigla }),
                el("dd", { texto: String(a.valor) }),
              ]);
            }))
        : null,

      r.ilegivel
        ? el("p.t-mini.mesa-cartao__reservado", {
            texto: "A ficha deste personagem não se montou por inteiro no arquivo. Nada foi alterado; os números " +
                   "ficam escondidos até ela ser recuperada — abra a ficha para ver o motivo.",
          })
        : recursos.length
        ? el("div.mesa-recursos", {}, recursos)
        : (r.recursosOcultos
            ? el("p.t-mini.mesa-cartao__reservado", { texto: "Status ocultos pelo mestre." })
            : (r.recursosPendentes
                ? el("p.t-mini.mesa-cartao__reservado", { texto: "Os recursos aparecem quando o dono ou o mestre abrir esta aba ou salvar a ficha." })
                : (r.tipo === "ordem" && !r.detalhado
                    ? el("p.t-mini.mesa-cartao__reservado", { texto: "Recursos e estatísticas ficam visíveis para o mestre e para quem joga com este personagem." })
                    : (r.tipo === "universal" ? el("p.t-mini", { texto: "Esta ficha não tem status configurados." }) : null)))),

      r.estatisticas.length
        ? el("dl.mesa-estatisticas", {}, r.estatisticas.map(function (s) {
            return el("div.mesa-estatistica", {}, [
              el("dt", { texto: s.rotulo }),
              el("dd", { texto: s.valor }),
            ]);
          }))
        : null,

      el("div.mesa-cartao__rodape", {}, [
        podeAbrir
          ? el("a.r-botao.r-botao--mini", {
              href: U.url("ficha/?id=" + encodeURIComponent(r.id)),
              texto: "Abrir ficha",
              "aria-label": "Abrir ficha de " + r.nome,
            })
          : null,
        cartao.estado,
      ]),
    ]);
  }

  /* Um regravamento por personagem e revisão: a própria gravação muda a
     marca da mesa, a listagem volta, e aí o guardado já bate. */
  var resumosEnviados = {};

  function regravarResumo(r) {
    var calc = r.resumoCalculado;
    if (!calc) return;
    var assinatura = r.rev + "|" + calc.pv + "|" + calc.pe + "|" + calc.san;
    if (resumosEnviados[r.id] === assinatura) return;
    resumosEnviados[r.id] = assinatura;

    global.RAMAApi.atualizarResumoPersonagem(r.id, r.rev, calc).then(function (resposta) {
      /* Conflito quer dizer que a ficha mudou: a próxima listagem traz a
         revisão nova e a conta é refeita. Outra falha libera tentar de
         novo na próxima listagem. */
      if (!resposta.ok && resposta.erro !== "conflito") delete resumosEnviados[r.id];
    });
  }

  /* A foto do cartão chega depois, e só se o cartão estiver à vista —
     ver js/imagens.js. O cartão nasce com as iniciais no lugar dela,
     que é o mesmo que ele mostra quando não há foto. */
  function foto(r) {
    var caixa = el("span.r-avatar.mesa-cartao__foto", { "aria-hidden": "true", texto: U.iniciais(r.nome) });
    if (r.fotoVersao && global.RAMAImagens) {
      global.RAMAImagens.aplicar(caixa, { tipo: "foto", id: r.id, versao: r.fotoVersao });
    }
    return caixa;
  }

  /* =================================================================
     RECURSO: BARRA, [−], [+] E EDIÇÃO DIRETA
     ================================================================= */

  function controleDeRecurso(ctx, cartao, recurso, p) {
    var rotulo = cartao.resumo && cartao.resumo.podeEditar;
    var pode = rotulo === null || rotulo === undefined ? (ctx.ehMestre() || p.souDono) : rotulo;
    var nomeCompleto = recurso.nome + " de " + cartao.personagem.nome;
    var chaveFila = cartao.personagem.id + "/" + recurso.alvo + "/" + recurso.itemId + "/" + recurso.campo;

    var c = {
      recurso: recurso,
      editando: false,
      exibido: recurso.atual,
      raiz: el("div.mesa-recurso.mesa-recurso--" + recurso.cor),
    };

    /* Um valor ainda não confirmado continua na tela depois de um
       redesenho ou de uma listagem que chegou no meio da gravação. */
    if (painel.pendentes[chaveFila]) c.exibido = painel.pendentes[chaveFila].valor;

    var preenchimento = el("span.mesa-recurso__preenchimento");
    var medidor = el("span.mesa-recurso__medidor", { role: "meter", "aria-valuemin": "0" }, [preenchimento]);
    var numero = pode
      ? el("button.mesa-recurso__valor", { type: "button", onclick: function () { abrirEdicao(); } })
      : el("span.mesa-recurso__valor");
    var barra = el("div.mesa-recurso__barra", {}, [medidor, numero]);

    var menos = pode ? el("button.mesa-recurso__passo", {
      type: "button", texto: "−", "aria-label": "Diminuir " + nomeCompleto,
      onclick: function () { alterar(c.exibido - 1); },
    }) : null;
    var mais = pode ? el("button.mesa-recurso__passo", {
      type: "button", texto: "+", "aria-label": "Aumentar " + nomeCompleto,
      onclick: function () { alterar(c.exibido + 1); },
    }) : null;

    var linha = el("div.mesa-recurso__linha", {}, [menos, barra, mais]);

    c.raiz.appendChild(el("span.mesa-recurso__nome", { texto: recurso.rotulo }));
    c.raiz.appendChild(linha);

    function pintar() {
      var r = c.recurso;
      var largura = PM.preenchimento(c.exibido, r.maximo);
      preenchimento.style.width = largura + "%";
      medidor.setAttribute("aria-valuemax", String(Math.max(0, r.maximo)));
      medidor.setAttribute("aria-valuenow", String(Math.max(0, Math.min(c.exibido, Math.max(0, r.maximo)))));
      medidor.setAttribute("aria-valuetext", c.exibido + " de " + r.maximo);
      medidor.setAttribute("aria-label", nomeCompleto);
      numero.textContent = c.exibido + " / " + r.maximo;
      if (pode) numero.setAttribute("aria-label", "Editar " + nomeCompleto + ": " + c.exibido + " de " + r.maximo);
      if (menos) menos.disabled = c.exibido <= r.minimo;
      if (mais) mais.disabled = c.exibido >= r.teto;
      c.raiz.classList.toggle("mesa-recurso--pendente", !!painel.pendentes[chaveFila]);
    }

    function alterar(novo) {
      var r = c.recurso;
      var v = PM.limitar(novo, r);
      if (v === c.exibido) return;

      var pend = painel.pendentes[chaveFila];
      if (!pend) pend = painel.pendentes[chaveFila] = { base: r.cru };
      pend.valor = v;
      c.exibido = v;
      pintar();

      filaDoPainel().definir(chaveFila, {
        chave: chaveFila,
        personagem: cartao.personagem,
        alvo: r.alvo, itemId: r.itemId, campo: r.campo,
        valor: v,
        base: pend.base,
        recurso: r,
        rotulo: r.nome,
      });
    }

    function abrirEdicao() {
      if (c.editando) return;
      c.editando = true;

      var erro = el("span.mesa-recurso__erro", { role: "alert" });
      var campo = el("input.mesa-recurso__entrada", {
        type: "text", inputmode: "numeric", value: String(c.exibido),
        "aria-label": "Novo valor de " + nomeCompleto + " (Enter confirma, Esc cancela)",
      });

      function confirmar() {
        var v = PM.validarEntrada(campo.value, c.recurso);
        if (!v.ok) {
          campo.setAttribute("aria-invalid", "true");
          erro.textContent = v.mensagem;
          campo.focus();
          return;
        }
        fechar();
        alterar(v.valor);
        numero.focus();
      }

      function cancelar() {
        fechar();
        numero.focus();
      }

      function fechar() {
        c.editando = false;
        U.trocar(linha, [menos, barra, mais]);
        pintar();
      }

      campo.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter") { ev.preventDefault(); confirmar(); }
        if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); cancelar(); }
      });

      U.trocar(linha, [
        el("div.mesa-recurso__edicao", {}, [
          campo,
          el("button.mesa-recurso__passo.mesa-recurso__confirmar", {
            type: "button", texto: "✓", "aria-label": "Confirmar " + nomeCompleto, onclick: confirmar,
          }),
          el("button.mesa-recurso__passo", {
            type: "button", texto: "×", "aria-label": "Cancelar edição de " + nomeCompleto, onclick: cancelar,
          }),
        ]),
        erro,
      ]);
      campo.focus();
      campo.select();
    }

    c.pintar = pintar;
    c.chaveFila = chaveFila;

    /* Uma listagem nova: limites e máximo mudam sempre; o valor só se
       nada estiver pendente nem sendo digitado. */
    c.definirLimites = function (novo) {
      c.recurso = novo;
      if (!painel.pendentes[chaveFila] && !c.editando) c.exibido = novo.atual;
      if (!c.editando) pintar();
    };

    pintar();
    return c;
  }

  /* =================================================================
     FILA DE GRAVAÇÃO
     ================================================================= */

  function filaDoPainel() {
    if (painel.fila) return painel.fila;

    painel.fila = global.RAMAFila.criar({
      enviar: function (a) {
        /* Um id por ajuste, criado no primeiro envio e mantido nas
           repetições: é por ele que o servidor reconhece o mesmo ajuste
           chegando de novo quando a resposta se perdeu. */
        if (!a.operacaoId) a.operacaoId = global.RAMAApi.novaOperacao();
        return global.RAMAApi.ajustarPersonagem(
          a.personagem.id, a.personagem.rev, a.alvo, a.itemId, a.campo, a.valor, painel.ctx.campanhaId, a.operacaoId
        );
      },

      aoEstado: function (chave, estado, a) {
        var cartao = painel.cartoes[a.personagem.id];
        if (!cartao) return;
        if (estado === "salvando") mostrarEstado(cartao, "Salvando " + a.recurso.rotulo + "…");
        if (estado === "erro") mostrarEstado(cartao, "Sem resposta ao salvar " + a.recurso.rotulo + ". Tentando de novo…", "aviso");
      },

      /* A ficha mudou em outro lugar. Reenviar só se este recurso não
         mudou lá — ver o cabeçalho. */
      aoConflito: async function (a) {
        var lista = await buscarEAtualizar(painel.ctx, false);
        if (!lista) return null;
        var novo = lista.filter(function (x) { return x.id === a.personagem.id; })[0];
        if (!novo) { a.motivo = "saiu"; return null; }
        if (!PM.podeReenviar(novo, a.recurso, a.base)) {
          a.motivo = "mudou";
          a.valorNovo = PM.valorGuardado(novo, a.recurso);
          return null;
        }
        a.personagem.rev = Math.max(a.personagem.rev, U.inteiro(novo.rev, a.personagem.rev));
        return a;
      },

      aoConcluir: function (chave, a, r) {
        a.personagem.rev = U.inteiro(r.rev, a.personagem.rev);
        var pend = painel.pendentes[chave];
        var confirmado = r.dados && r.dados.valor !== undefined ? r.dados.valor : a.valor;
        var cartao = painel.cartoes[a.personagem.id];
        var controle = cartao && cartao.recursos[a.recurso.chave];

        if (pend && pend.valor === a.valor) {
          /* Nada mais novo esperando: a tela passa a mostrar o que o
             servidor confirmou (ele pode ter aparado no máximo). */
          delete painel.pendentes[chave];
          if (controle) {
            controle.recurso.cru = confirmado;
            if (!controle.editando) { controle.exibido = confirmado; controle.pintar(); }
          }
        } else if (pend) {
          /* Chegou clique durante o voo: o próximo envio parte daqui. */
          pend.base = confirmado;
          if (controle) controle.recurso.cru = confirmado;
        }
        if (cartao) mostrarEstado(cartao, "Salvo.", "ok", 1800);
      },

      aoFalhar: async function (chave, a, r) {
        delete painel.pendentes[chave];
        var cartao = painel.cartoes[a.personagem.id];

        if (a.motivo === "mudou") {
          mostrarEstado(cartao, a.recurso.rotulo + " mudou em outro aparelho. O seu ajuste não foi aplicado.", "erro");
          UI.avisoAtencao(a.recurso.nome + " de " + a.personagem.nome + " mudou em outro aparelho" +
            (a.valorNovo !== null && a.valorNovo !== undefined ? " (agora " + a.valorNovo + ")" : "") +
            ". O seu ajuste não foi aplicado — confira e ajuste de novo.");
        } else if (a.motivo === "saiu") {
          UI.avisoAtencao(a.personagem.nome + " não está mais nesta campanha.");
        } else if (r && r.erro === "conflito") {
          mostrarEstado(cartao, "A ficha continua mudando em outro aparelho.", "erro");
          UI.avisoAtencao("A ficha de " + a.personagem.nome + " continua sendo alterada em outro aparelho. Os números foram recarregados.");
        } else {
          mostrarEstado(cartao, "Não foi possível salvar " + a.recurso.rotulo + ".", "erro");
          UI.avisoDeFalha(r, "ajuste de " + a.recurso.nome + " de " + a.personagem.nome);
        }

        /* A tela volta a mostrar o que o servidor tem. */
        await buscarEAtualizar(painel.ctx, false);
      },
    });

    return painel.fila;
  }

  function mostrarEstado(cartao, texto, tipo, duracao) {
    if (!cartao) return;
    clearTimeout(cartao.timerEstado);
    cartao.estado.textContent = texto;
    cartao.estado.className = "mesa-cartao__estado" + (tipo ? " mesa-cartao__estado--" + tipo : "");
    if (duracao) {
      cartao.timerEstado = setTimeout(function () {
        cartao.estado.textContent = "";
        cartao.estado.className = "mesa-cartao__estado";
      }, duracao);
    }
  }

  /* =================================================================
     ATUALIZAR SEM REDESENHAR
     ================================================================= */

  async function buscarEAtualizar(ctx, avisarFalha) {
    var r = await ctx.buscarPersonagens();
    if (!r.ok) {
      if (avisarFalha) UI.avisoDeFalha(r, "atualização dos personagens");
      return null;
    }
    aplicarLista(ctx, r.dados || []);
    return r.dados || [];
  }

  function aplicarLista(ctx, lista) {
    if (!painel.grade || !document.body.contains(painel.grade)) return;

    var chegaram = {};
    lista.forEach(function (p) {
      chegaram[p.id] = true;
      var cartao = painel.cartoes[p.id];
      if (!cartao) { acrescentarCartao(ctx, p); return; }
      /* Resposta mais velha do que o cartão já sabe: ignora. */
      if (U.inteiro(p.rev, 0) < cartao.personagem.rev) return;
      cartao.atualizar(p);
    });

    Object.keys(painel.cartoes).forEach(function (id) {
      if (chegaram[id]) return;
      var cartao = painel.cartoes[id];
      if (cartao.raiz.parentNode) cartao.raiz.parentNode.removeChild(cartao.raiz);
      delete painel.cartoes[id];
    });

    contar();

    /* A mesa ficou vazia: a tela certa é a de "nenhum personagem". */
    if (!lista.length) ctx.redesenhar();
  }

  /* =================================================================
     TIRAR DA CAMPANHA
     ================================================================= */

  async function desvincular(ctx, cartao) {
    var nome = cartao.personagem.nome;
    var meu = !!(cartao.resumo && cartao.resumo.souDono);
    var certeza = await UI.confirmar({
      titulo: "Tirar " + nome + " da campanha?",
      texto: meu
        ? "A ficha continua sua, com tudo o que tem. Ela só deixa de aparecer nesta mesa."
        : "A ficha continua existindo, com o mesmo dono. Ela só deixa de aparecer nesta mesa.",
      detalhe: meu
        ? "Nada é apagado. Dá para adicioná-la de novo em “Adicionar personagem”."
        : "Nada é apagado. O dono pode adicionar a ficha de novo depois.",
      rotuloConfirmar: "Tirar da campanha",
      perigo: true,
    });
    if (!certeza) return;
    tirarDaCampanha(ctx, cartao);
  }

  async function tirarDaCampanha(ctx, cartao) {
    var nome = cartao.personagem.nome;
    if (cartao.saindo) return;
    cartao.saindo = true;
    cartao.raiz.setAttribute("aria-busy", "true");
    mostrarEstado(cartao, "Tirando da campanha…");

    var r = await global.RAMAApi.vincularPersonagem(ctx.campanhaId, cartao.personagem.id, false);

    cartao.saindo = false;
    cartao.raiz.removeAttribute("aria-busy");

    if (!r.ok) {
      mostrarEstado(cartao, "Não foi possível tirar da campanha.", "erro", 4000);
      UI.avisoDeFalha(r, "desvínculo", { tentarDeNovo: function () { tirarDaCampanha(ctx, cartao); } });
      return;
    }

    UI.avisoOk(nome + " saiu da campanha.");
    await buscarEAtualizar(ctx, true);
  }

  /* =================================================================
     ADICIONAR PERSONAGEM
     -----------------------------------------------------------------
     Os personagens de quem abriu, fora desta campanha, cada um com o
     seu botão. A lista vem de listar_personagens — que só devolve as
     fichas da própria conta — e o vínculo é o mesmo da ficha: o
     servidor confere que a conta é dona do personagem e mestre ou
     jogadora desta campanha.

     O mestre não vê aqui as fichas dos jogadores. Listar personagens de
     outra conta que ainda não estão na mesa daria a ele um alcance que
     hoje não tem.

     Um personagem que está em outra campanha pode vir: a linha avisa
     que ele sai de lá. Nada é apagado, e dá para voltar.
     ================================================================= */

  function podeAdicionar(ctx) {
    var papel = ctx.papel();
    return papel === "mestre" || papel === "jogador";
  }

  function abrirAdicionar(ctx) {
    var registros = [];
    var busca = "";
    var adicionados = {};
    var ocupados = {};

    var corpo = el("div.pilha.mesa-adicionar");
    var lista = el("div.mesa-adicionar__lista", { role: "list", "aria-label": "Seus personagens fora desta campanha" });

    var janela = UI.modal({
      titulo: "Adicionar personagem",
      conteudo: corpo,
      botoes: [{ rotulo: "Fechar", classe: "r-botao--fantasma" }],
    });

    carregar();

    async function carregar() {
      U.trocar(corpo, UI.carregando("Buscando seus personagens"));
      var r = await global.RAMAApi.listarPersonagens();
      if (!document.body.contains(corpo)) return;
      if (!r.ok) {
        U.trocar(corpo, UI.erroDeTela(r, carregar));
        return;
      }
      registros = r.dados || [];
      desenhar();
    }

    function foraDaMesa() {
      return registros.filter(function (p) {
        return adicionados[p.id] || String(p.campanhaId || "") !== String(ctx.campanhaId);
      });
    }

    function desenhar() {
      if (!registros.length) {
        U.trocar(corpo, UI.vazio({
          titulo: "Você ainda não tem personagens",
          texto: ctx.ehMestre()
            ? "Crie um personagem seu e volte aqui para trazê-lo à mesa. Os jogadores adicionam os deles por esta mesma aba."
            : "Crie um personagem e volte aqui para trazê-lo à mesa.",
          acao: { rotulo: "Ir para Personagens", aoClicar: function () { location.href = U.url("personagens/"); } },
        }));
        return;
      }

      var fora = foraDaMesa();
      if (!fora.length) {
        U.trocar(corpo, el("p", { texto: "Todos os seus personagens já estão nesta campanha." }));
        return;
      }

      U.trocar(corpo, [
        el("p.t-mini", {
          texto: ctx.ehMestre()
            ? "Aparecem os seus personagens. Os jogadores adicionam os deles por esta mesma aba."
            : "Aparecem os seus personagens que ainda não estão nesta campanha.",
        }),
        fora.length > 5 ? el("div.r-busca", {}, [
          el("span.r-busca__marca", {}, [UI.simbolo("busca")]),
          el("input.r-entrada", {
            type: "search",
            value: busca,
            placeholder: "Buscar por nome, classe ou campanha",
            "aria-label": "Buscar entre os seus personagens",
            oninput: function (ev) { busca = ev.target.value; pintarLista(); },
          }),
        ]) : null,
        lista,
      ]);
      pintarLista();
    }

    function pintarLista() {
      var chave = U.chaveDeBusca(busca);
      var visiveis = foraDaMesa().filter(function (p) {
        return !chave || U.chaveDeBusca([p.nome, p.classe, p.origem, p.campanha].join(" ")).indexOf(chave) >= 0;
      });
      U.trocar(lista, visiveis.length
        ? visiveis.map(linha)
        : [el("p.t-mini", { texto: "Nenhum personagem corresponde a “" + busca + "”." })]);
    }

    function linha(p) {
      var nome = p.nome || "Sem nome";
      var detalhes = [p.classe, p.origem].filter(Boolean).join(" · ");
      var onde = el("span.mesa-adicionar__onde");
      var botao = el("button.r-botao.r-botao--mini", { type: "button" });

      var item = el("div.mesa-adicionar__item", { role: "listitem" }, [
        avatar(p),
        el("div.mesa-adicionar__id", {}, [
          el("span.mesa-adicionar__nome", { title: nome, texto: nome }),
          detalhes ? el("span.t-mini", { texto: detalhes }) : null,
          onde,
        ]),
        botao,
      ]);

      function pintar() {
        var ja = !!adicionados[p.id];
        var outra = !ja && p.campanhaId && String(p.campanhaId) !== String(ctx.campanhaId);
        onde.textContent = ja
          ? "Nesta campanha"
          : (outra ? "Hoje em " + (p.campanha || "outra campanha") + " — sai de lá ao entrar aqui" : "Sem campanha");
        onde.className = "mesa-adicionar__onde" + (outra ? " mesa-adicionar__onde--outra" : "");
        botao.textContent = ja ? "Adicionado" : (ocupados[p.id] ? "Adicionando…" : "Adicionar");
        botao.disabled = ja || !!ocupados[p.id];
        botao.setAttribute("aria-label", ja ? nome + " já está nesta campanha" : "Adicionar " + nome + " a esta campanha");
      }

      botao.onclick = async function () {
        if (ocupados[p.id] || adicionados[p.id]) return;
        ocupados[p.id] = true;
        pintar();

        var r = await global.RAMAApi.vincularPersonagem(ctx.campanhaId, p.id, true);
        delete ocupados[p.id];

        if (!r.ok) {
          pintar();
          UI.avisoDeFalha(r, "vínculo de " + nome);
          return;
        }

        adicionados[p.id] = true;
        p.campanhaId = ctx.campanhaId;
        p.campanha = ctx.campanha ? ctx.campanha.nome : "";
        pintar();
        UI.avisoOk(nome + " entrou na campanha.");

        /* O botão desabilitado perde o foco; ele vai para o próximo
           personagem da lista, ou para Fechar. */
        var proximo = U.$$(".mesa-adicionar__item button:not([disabled])", lista)[0] ||
                      janela.janela.querySelector(".r-modal__rodape .r-botao");
        if (proximo) proximo.focus();

        atualizarMesa(ctx);
      };

      pintar();
      return item;
    }
  }

  function avatar(p) {
    var caixa = el("span.r-avatar.r-avatar--p", { "aria-hidden": "true", texto: U.iniciais(p.nome) });
    if (p.fotoVersao && global.RAMAImagens) {
      global.RAMAImagens.aplicar(caixa, { tipo: "foto", id: p.id, versao: p.fotoVersao });
    }
    return caixa;
  }

  /* A mesa com cartões atualiza no lugar; a mesa vazia precisa virar a
     grade, e isso é um redesenho da aba. */
  function atualizarMesa(ctx) {
    if (painel.grade && document.body.contains(painel.grade)) return buscarEAtualizar(ctx, true);
    return ctx.atualizarPersonagens();
  }
})(window);
