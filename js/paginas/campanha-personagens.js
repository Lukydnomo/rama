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

      if (ctx.falhaPersonagens) {
        return UI.erroDeTela(ctx.falhaPersonagens, function () { return ctx.atualizarPersonagens(); });
      }

      if (!ctx.personagens.length) {
        return UI.vazio({
          titulo: "Nenhum personagem na mesa",
          texto: ctx.ehMestre()
            ? "Os jogadores vinculam as fichas deles pela própria ficha."
            : "Vincule o seu personagem a esta campanha pela ficha dele.",
          acao: {
            rotulo: "Ver meus personagens",
            aoClicar: function () { location.href = U.url("personagens/"); },
          },
        });
      }

      painel.grade = el("div.mesa-grade", { role: "list", "aria-label": "Personagens da campanha" });
      ctx.personagens.forEach(function (p) { acrescentarCartao(ctx, p); });

      var contagem = painel.contagem = el("span.t-mini", { "aria-live": "polite" });
      contar();

      return el("div.pilha", {}, [
        el("div.mesa-barra", {}, [
          contagem,
          el("button.r-botao.r-botao--mini.r-botao--fantasma", {
            type: "button",
            texto: "Atualizar",
            "aria-label": "Buscar os números mais recentes das fichas",
            onclick: async function (ev) {
              var botao = ev.currentTarget;
              botao.disabled = true;
              await buscarEAtualizar(ctx, true);
              botao.disabled = false;
            },
          }),
        ]),
        painel.grade,
      ]);
    },
  };

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

    var podeAdministrar = ctx.ehMestre() && !r.souDono;

    U.trocar(cartao.raiz, [
      el("div.mesa-cartao__topo", {}, [
        foto(r),
        el("div.mesa-cartao__id", {}, [
          el("h3.mesa-cartao__nome", { title: r.nome, texto: r.nome }),
          r.linhas.length ? el("p.mesa-cartao__linha", { texto: r.linhas.join(" · ") }) : null,
          el("p.mesa-cartao__linha", { texto: r.souDono ? "Seu personagem" : (r.dono ? "Jogador: " + r.dono : "") }),
          r.progressao ? el("p.mesa-cartao__linha.mesa-cartao__progressao", { texto: r.progressao }) : null,
        ]),
        podeAdministrar
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

      recursos.length
        ? el("div.mesa-recursos", {}, recursos)
        : (r.tipo === "ordem" && !r.detalhado
            ? el("p.t-mini.mesa-cartao__reservado", { texto: "Recursos e estatísticas ficam visíveis para o mestre e para quem joga com este personagem." })
            : (r.tipo === "universal" ? el("p.t-mini", { texto: "Esta ficha não tem status configurados." }) : null)),

      r.estatisticas.length
        ? el("dl.mesa-estatisticas", {}, r.estatisticas.map(function (s) {
            return el("div.mesa-estatistica", {}, [
              el("dt", { texto: s.rotulo }),
              el("dd", { texto: s.valor }),
            ]);
          }))
        : null,

      el("div.mesa-cartao__rodape", {}, [
        el("a.r-botao.r-botao--mini", {
          href: U.url("ficha/?id=" + encodeURIComponent(r.id)),
          texto: "Abrir ficha",
          "aria-label": "Abrir ficha de " + r.nome,
        }),
        cartao.estado,
      ]),
    ]);
  }

  function foto(r) {
    var caixa = el("span.r-avatar.mesa-cartao__foto", { "aria-hidden": "true" });
    if (r.foto) caixa.appendChild(el("img", { src: r.foto, alt: "" }));
    else caixa.textContent = U.iniciais(r.nome);
    return caixa;
  }

  /* =================================================================
     RECURSO: BARRA, [−], [+] E EDIÇÃO DIRETA
     ================================================================= */

  function controleDeRecurso(ctx, cartao, recurso, p) {
    var pode = ctx.ehMestre() || p.souDono;
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
        return global.RAMAApi.ajustarPersonagem(
          a.personagem.id, a.personagem.rev, a.alvo, a.itemId, a.campo, a.valor, painel.ctx.campanhaId
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
    var certeza = await UI.confirmar({
      titulo: "Tirar " + nome + " da campanha?",
      texto: "A ficha continua existindo, com o mesmo dono. Ela só deixa de aparecer nesta mesa.",
      detalhe: "Nada é apagado. O dono pode vincular a ficha de novo depois.",
      rotuloConfirmar: "Tirar da campanha",
      perigo: true,
    });
    if (!certeza) return;

    var r = await global.RAMAApi.vincularPersonagem(ctx.campanhaId, cartao.personagem.id, false);
    if (!r.ok) { UI.avisoDeFalha(r, "desvínculo"); return; }

    UI.avisoOk(nome + " saiu da campanha.");
    await buscarEAtualizar(ctx, true);
  }
})(window);
