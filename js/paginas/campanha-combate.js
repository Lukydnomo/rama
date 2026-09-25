/* =====================================================================
   R.A.M.A. — campanha · combate
   ---------------------------------------------------------------------
   O combate fica salvo na planilha, e não na memória da aba: recarregar
   a página, fechar o navegador ou abrir em outro computador tem de
   encontrar o combate onde ele estava — participantes, iniciativas,
   rodada e de quem é a vez.

   As criaturas entram como SNAPSHOT. Duas ocorrências do mesmo modelo
   são dois estados independentes — "Existido #1" pode estar ferido
   enquanto "Existido #2" está inteiro —, e editar o modelo na
   biblioteca depois não mexe em combate nenhum já montado.

   A iniciativa é DIGITADA, não sorteada. O sistema ordena do maior
   para o menor e mantém estável quem empata: dois participantes com 14
   não trocam de lugar a cada vez que alguém digita outro número.

   ---------------------------------------------------------------------
   COMO A TELA CONVERSA COM O SERVIDOR
   ---------------------------------------------------------------------

   Tudo o que muda um combate passa pela fila dele (js/combate-fila.js):

     iniciativa e vida de criatura   ficam pendentes ~5 s (~1,2 s para
                                     vida) e sobem num lote; a barra
                                     mostra "Alterações pendentes" e há
                                     "Salvar agora"
     turno, iniciar, encerrar,       sobem logo, em ordem, depois do que
     acrescentar, remover, renomear, já estiver no ar
     quem pode ver

   Enquanto houver iniciativa ou vida digitada e ainda não enviada,
   mudar o turno, iniciar, encerrar e remover ficam travados — o lote
   pendente mudaria a ordem em que eles se baseiam. O campo continua
   editável: ninguém é impedido de terminar o que está digitando.

   As mudanças de outras pessoas chegam pela sincronização da campanha
   e são aplicadas linha a linha, sem mexer no campo em foco.

   ---------------------------------------------------------------------
   TURNO E SELEÇÃO SÃO COISAS DIFERENTES
   ---------------------------------------------------------------------

   O turno é de quem o servidor diz (rodada e participante, pelo ID).
   Clicar no nome de alguém SELECIONA para consulta: a ficha dele abre
   no painel ao lado (no celular, numa gaveta). Selecionar nunca passa a
   vez; só "Próximo turno" e "Voltar turno" passam.

   ---------------------------------------------------------------------
   O PAINEL LATERAL É DO MESTRE
   ---------------------------------------------------------------------

   Personagem: a própria ficha (ficha/?painel=1), com os mesmos
   componentes, o mesmo salvamento com revisão e o mesmo histórico de
   rolagens — não uma cópia. Criatura: a instância DESTE combate; mexer
   na vida dela muda só esta ocorrência, pela fila. O jogador não tem
   painel: o servidor não manda a ele ficha de criatura nem de
   personagem alheio, e esta tela nem monta o controle.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var T = global.RAMACombateTurnos;
  var el = U.el;

  /* Os controladores sobrevivem a trocar de aba: a fila de um combate
     continua enviando o que estava pendente mesmo com a aba fechada. */
  var controladores = {};
  var campanhaAtual = null;

  var ESTREITO = "(max-width: 900px)";

  function estreito() {
    return !!(global.matchMedia && global.matchMedia(ESTREITO).matches);
  }

  global.RAMACampanhaCombate = {
    aba: function (ctx) {
      if (campanhaAtual !== ctx.campanhaId) {
        descartarTudo();
        campanhaAtual = ctx.campanhaId;
      }

      var lista = el("div.pilha--larga", { class: "pilha" });
      var carregado = false;
      var raiz = el("div.pilha--larga", { class: "pilha" }, [
        ctx.ehMestre()
          ? el("div.faixa", {}, [
              el("button.r-botao.r-botao--principal", {
                type: "button", texto: "+ Novo combate",
                onclick: function (ev) { criar(ctx, ev.currentTarget, carregar); },
              }),
            ])
          : null,
        lista,
      ]);

      async function carregar(segundoPlano) {
        if (!carregado) {
          lista.setAttribute("aria-busy", "true");
          U.trocar(lista, UI.carregando("Consultando combates"));
        }
        var r = await global.RAMAApi.listarCombates(ctx.campanhaId, segundoPlano ? { segundoPlano: true } : null);
        lista.removeAttribute("aria-busy");
        if (!document.body.contains(raiz)) return;

        if (!r.ok) {
          if (!carregado) U.trocar(lista, UI.erroDeTela(r, function () { carregar(false); }));
          else if (!segundoPlano) UI.avisoDeFalha(r, "atualização dos combates", { tentarDeNovo: function () { carregar(false); } });
          return;
        }

        carregado = true;
        aplicarCombates(ctx, lista, r.dados || [], carregar);
      }

      ctx.aoAtualizar("combates", function () { carregar(true); });
      ctx.aoAtualizar("personagens", function () { recarregarFichasAbertas(); });

      carregar(false);
      return raiz;
    },

    /* Trocar de aba não descarta nada: sobe o que estiver pendente. */
    aoSair: function () {
      Object.keys(controladores).forEach(function (id) { controladores[id].fila.salvarAgora(); });
    },

    descartarTudo: descartarTudo,
  };

  function descartarTudo() {
    Object.keys(controladores).forEach(function (id) { controladores[id].destruir(); });
    controladores = {};
  }

  /* Sair da página com alteração por subir pede confirmação. */
  global.addEventListener("beforeunload", function (ev) {
    var pendente = Object.keys(controladores).some(function (id) { return controladores[id].fila.temPendencias(); });
    if (!pendente) return;
    ev.preventDefault();
    ev.returnValue = "";
    return "";
  });

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState !== "hidden") return;
    Object.keys(controladores).forEach(function (id) { controladores[id].fila.salvarAgora(); });
  });

  /* A ficha no painel avisa quando salvou: a lista busca os números novos
     sem esperar a próxima pergunta da sincronização. */
  global.addEventListener("message", function (ev) {
    if (ev.origin !== location.origin || !ev.data || ev.data.tipo !== "rama:ficha-salva") return;
    Object.keys(controladores).forEach(function (id) {
      if (controladores[id].ctx) controladores[id].ctx.sincronizarAgora();
    });
  });

  function recarregarFichasAbertas() {
    Object.keys(controladores).forEach(function (id) { controladores[id].recarregarFicha(); });
  }

  /* =================================================================
     A LISTA DE COMBATES
     ================================================================= */

  function aplicarCombates(ctx, lista, combates, recarregar) {
    var chegaram = {};
    combates.forEach(function (c) { chegaram[c.id] = true; });

    /* Combate que sumiu — excluído, ou o acesso a ele foi retirado: sai
       da tela e da memória. */
    Object.keys(controladores).forEach(function (id) {
      if (chegaram[id]) return;
      var c = controladores[id];
      if (c.fila.temPendencias()) {
        UI.avisoAtencao("O combate \"" + c.nome() + "\" não está mais disponível. As alterações pendentes dele foram descartadas.");
      }
      c.destruir();
      delete controladores[id];
    });

    if (!combates.length) {
      U.trocar(lista, UI.vazio({
        titulo: "Nenhum combate",
        texto: ctx.ehMestre()
          ? "Monte um combate, acrescente criaturas e personagens, e digite as iniciativas."
          : "O mestre ainda não liberou nenhum combate para você.",
      }));
      return;
    }

    /* Os que já estão na tela ficam onde estão (mover um bloco com um
       campo em foco tiraria o foco dele); os novos entram no topo. */
    U.$$(":scope > .r-vazio, :scope > .r-carregando", lista).forEach(function (n) { n.parentNode.removeChild(n); });

    combates.slice().reverse().forEach(function (c) {
      var existente = controladores[c.id];
      if (existente) {
        existente.ctx = ctx;
        existente.fila.receberRemoto(c);
        if (!lista.contains(existente.raiz)) lista.insertBefore(existente.raiz, lista.firstChild);
        return;
      }
      var novo = criarControlador(ctx, c, recarregar);
      controladores[c.id] = novo;
      lista.insertBefore(novo.raiz, lista.firstChild);
    });
  }

  /* =================================================================
     UM COMBATE
     ================================================================= */

  function criarControlador(ctx, combate, recarregarLista) {
    var mestre = ctx.ehMestre();
    var c = {
      ctx: ctx,
      id: combate.id,
      selecionadoId: null,
      painel: null,
      gaveta: null,
      linhas: {},
      relogioBarra: null,
    };

    c.fila = global.RAMAFilaCombate.criar({
      combate: combate,
      enviar: function (rev, opId, ops) {
        return global.RAMAApi.atualizarCombate(c.ctx.campanhaId, combate.id, rev, opId, ops);
      },
      buscar: async function () {
        var r = await global.RAMAApi.listarCombates(c.ctx.campanhaId, { segundoPlano: true });
        if (!r.ok) return r;
        var achado = (r.dados || []).filter(function (x) { return x.id === combate.id; })[0];
        return achado ? { ok: true, dados: achado } : { ok: false, erro: "nao_encontrado" };
      },
      aoMudar: function () { pintar(); },
      aoConflito: perguntarConflito,
      aoAviso: function (texto, tipo) {
        if (tipo === "info") UI.aviso(texto); else UI.avisoAtencao(texto);
      },
      aoRecusa: function (r) {
        if (r && r.erro === "nao_encontrado") {
          UI.avisoAtencao("Este combate foi excluído em outro lugar.");
          recarregarLista(false);
          return;
        }
        if (r && global.RAMAApi.ehErroDeSessao(r.erro)) return;
        UI.avisoDeFalha(r, "alteração do combate");
      },
    });

    c.nome = function () { return c.fila.vista().nome || "Combate"; };

    /* ---------- estrutura ---------- */

    var anuncio = el("p.combate-anuncio", { role: "status", "aria-live": "polite" });
    var cabecaTurno = el("div.combate-turno");
    var barra = mestre ? el("div.combate-pendencias", { id: "pend-" + combate.id, role: "status", "aria-live": "polite" }) : null;
    var participantes = el("ol.combate-participantes", { "aria-label": "Participantes, na ordem de iniciativa" });
    var controles = mestre ? el("div.combate-controles") : null;

    var painelLateral = mestre ? el("aside.combate__painel", { "aria-label": "Ficha do participante selecionado" }) : null;

    var corpo = el("div.combate", { class: mestre ? "combate--mestre" : "" }, [
      el("section.combate__lista", { "aria-label": "Ordem de iniciativa" }, [
        cabecaTurno, anuncio, barra, participantes, controles,
      ]),
      painelLateral,
    ]);

    var botoes = {};

    if (mestre) {
      botoes.criatura = el("button.r-botao.r-botao--mini", {
        type: "button", texto: "+ Criatura",
        onclick: function (ev) { escolherCriatura(ev.currentTarget); },
      });
      botoes.personagens = el("button.r-botao.r-botao--mini", {
        type: "button", texto: "+ Personagens da mesa",
        onclick: function (ev) { acrescentarPersonagens(ev.currentTarget); },
      });
      botoes.quemVe = el("button.r-botao.r-botao--mini", {
        type: "button", texto: "Quem pode ver",
        onclick: function (ev) { permissoes(ev.currentTarget); },
      });
      botoes.iniciar = el("button.r-botao.r-botao--mini.r-botao--principal", {
        type: "button", texto: "Iniciar combate",
        onclick: function (ev) { mudarEstado(ev.currentTarget, "ativo"); },
      });
      botoes.encerrar = el("button.r-botao.r-botao--mini", {
        type: "button", texto: "Encerrar",
        onclick: function (ev) { mudarEstado(ev.currentTarget, "encerrado"); },
      });
      U.trocar(controles, [botoes.criatura, botoes.personagens, botoes.quemVe, botoes.iniciar, botoes.encerrar]);

      botoes.voltar = el("button.r-botao.r-botao--mini", {
        type: "button", texto: "Voltar turno",
        onclick: function () { c.fila.enfileirar({ tipo: "turno", direcao: "anterior" }); },
      });
      botoes.proximo = el("button.r-botao.r-botao--mini.r-botao--principal", {
        type: "button", texto: "Próximo turno",
        onclick: function () { c.fila.enfileirar({ tipo: "turno", direcao: "proximo" }); },
      });
    }

    var rotuloTurno = el("p.combate-turno__rodada");
    var rotuloVez = el("p.combate-turno__vez");
    U.trocar(cabecaTurno, [
      el("div.combate-turno__texto", {}, [rotuloTurno, rotuloVez]),
      mestre ? el("div.combate-turno__botoes", {}, [botoes.voltar, botoes.proximo]) : null,
    ]);

    /* O estado vai numa segunda linha, abaixo do nome: numa tela estreita,
       dividindo a linha, ele espremia o nome até sumir. */
    var resumoDoCombate = el("span.combate-bloco__resumo");
    var recolhivel = UI.recolhivel({
      titulo: combate.nome,
      subtitulo: [resumoDoCombate],
      aberto: combate.estado === "ativo",
      conteudo: [corpo],
      acoes: mestre ? [
        UI.menu([
          { rotulo: "Renomear", aoClicar: function () { renomear(); } },
          "separador",
          { rotulo: "Excluir combate", perigo: true, aoClicar: function () { excluir(); } },
        ], { rotulo: "Opções do combate", icone: "tresPontos" }),
      ] : null,
    });
    recolhivel.classList.add("combate-bloco");
    c.raiz = recolhivel;

    /* ---------- desenho ---------- */

    var turnoAnunciado = null;

    function pintar() {
      var v = c.fila.vista();
      var est = c.fila.estado();
      var ordem = T.ordem(v.participantes || []);

      var titulo = U.$(":scope > summary .recolhivel__titulo", recolhivel);
      if (titulo) titulo.textContent = v.nome || "Combate";
      var rotuloEstado = { preparando: "Em preparação", ativo: "Em andamento", encerrado: "Encerrado" }[v.estado] || v.estado;
      resumoDoCombate.textContent = rotuloEstado + " · " + ordem.length + " participante(s)" +
        (v.estado === "ativo" ? " · rodada " + v.turno.rodada : "");

      pintarTurno(v, ordem);
      pintarLinhas(v, ordem);
      if (mestre) {
        pintarBarra(est);
        pintarControles(v, est, ordem);
        atualizarPainel(v);
      }
    }

    function nomeDe(v, id) {
      var p = (v.participantes || []).filter(function (x) { return String(x.id) === String(id); })[0];
      return p ? p.nome : "";
    }

    function pintarTurno(v, ordem) {
      if (v.estado === "ativo") {
        rotuloTurno.textContent = "Rodada " + v.turno.rodada;
        rotuloVez.textContent = v.turno.ativoId ? "Vez de " + nomeDe(v, v.turno.ativoId) : "Sem participantes";
      } else if (v.estado === "encerrado") {
        rotuloTurno.textContent = "Combate encerrado";
        rotuloVez.textContent = v.turno.rodada ? "Terminou na rodada " + v.turno.rodada : "";
      } else {
        rotuloTurno.textContent = "Em preparação";
        rotuloVez.textContent = ordem.length ? "Digite as iniciativas e inicie o combate." : "Acrescente participantes.";
      }

      /* Leitor de tela ouve a troca de vez, uma vez por troca. */
      var chave = v.estado + "|" + v.turno.rodada + "|" + v.turno.ativoId;
      if (turnoAnunciado !== null && chave !== turnoAnunciado && v.estado === "ativo" && v.turno.ativoId) {
        anuncio.textContent = "Rodada " + v.turno.rodada + ": vez de " + nomeDe(v, v.turno.ativoId) + ".";
      }
      turnoAnunciado = chave;
    }

    function campoEmFoco() {
      var ativo = document.activeElement;
      return !!(ativo && participantes.contains(ativo) && ativo.classList.contains("combate-linha__iniciativa"));
    }

    function pintarLinhas(v, ordem) {
      var vistos = {};
      var travarOrdem = campoEmFoco();

      ordem.forEach(function (p, posicao) {
        vistos[p.id] = true;
        var linha = c.linhas[p.id] || criarLinha(p);
        c.linhas[p.id] = linha;
        atualizarLinha(linha, p, posicao, v);
      });

      Object.keys(c.linhas).forEach(function (id) {
        if (vistos[id]) return;
        var linha = c.linhas[id];
        if (linha.raiz.parentNode) linha.raiz.parentNode.removeChild(linha.raiz);
        delete c.linhas[id];
      });

      /* A ordem na tela acompanha a iniciativa — exceto enquanto alguém
         digita uma iniciativa: a linha não foge de baixo do cursor. Ela
         se acerta ao sair do campo. */
      if (!travarOrdem) {
        ordem.forEach(function (p) {
          var linha = c.linhas[p.id];
          if (linha && participantes.lastChild !== linha.raiz) participantes.appendChild(linha.raiz);
        });
      } else {
        ordem.forEach(function (p) {
          var linha = c.linhas[p.id];
          if (linha && !linha.raiz.parentNode) participantes.appendChild(linha.raiz);
        });
      }

      if (!ordem.length && !U.$(".combate-participantes__vazio", participantes)) {
        participantes.appendChild(el("li.combate-participantes__vazio.t-mini", {
          texto: mestre ? "Nenhum participante ainda. Use \"+ Criatura\" ou \"+ Personagens da mesa\"." : "Nenhum participante ainda.",
        }));
      } else if (ordem.length) {
        U.$$(".combate-participantes__vazio", participantes).forEach(function (n) { n.parentNode.removeChild(n); });
      }
    }

    function criarLinha(p) {
      var linha = { id: p.id };
      linha.posicao = el("span.combate-linha__posicao", { "aria-hidden": "true" });
      linha.marca = el("span.combate-linha__marca", { "aria-hidden": "true" });

      if (mestre) {
        linha.iniciativa = el("input.r-entrada.r-entrada--numero.combate-linha__iniciativa", {
          type: "text", inputmode: "numeric", maxlength: "5",
        });
        linha.iniciativa.addEventListener("input", function () {
          var texto = linha.iniciativa.value.trim().replace("−", "-");
          if (/^-?\d{1,4}$/.test(texto)) {
            linha.iniciativa.removeAttribute("aria-invalid");
            c.fila.definirIniciativa(p.id, parseInt(texto, 10));
          } else {
            linha.iniciativa.setAttribute("aria-invalid", texto === "" || texto === "-" ? "false" : "true");
          }
        });
        linha.iniciativa.addEventListener("keydown", function (ev) {
          if (ev.key === "Enter") { ev.preventDefault(); linha.iniciativa.blur(); }
        });
        linha.iniciativa.addEventListener("blur", function () {
          var v = c.fila.vista();
          var atual = (v.participantes || []).filter(function (x) { return x.id === p.id; })[0];
          if (atual) linha.iniciativa.value = String(Math.round(Number(atual.ordem) || 0));
          linha.iniciativa.removeAttribute("aria-invalid");
          pintar();
        });

        linha.nome = el("button.combate-linha__nome", {
          type: "button",
          onclick: function () { selecionar(p.id); },
        });
        linha.remover = el("button.r-icone.combate-linha__remover", {
          type: "button",
          onclick: function (ev) { removerParticipante(ev.currentTarget, p.id); },
        }, [UI.simbolo("x")]);
      } else {
        linha.iniciativa = el("span.combate-linha__iniciativa-valor");
        linha.nome = el("span.combate-linha__nome");
      }

      linha.tipo = el("span.r-etiqueta.combate-linha__tipo");
      linha.recursos = el("div.combate-linha__recursos");

      linha.raiz = el("li.combate-linha", { dataset: { id: p.id } }, [
        linha.marca,
        linha.posicao,
        linha.iniciativa,
        el("div.combate-linha__id", {}, [
          el("div.combate-linha__cabeca", {}, [linha.nome, linha.tipo]),
          linha.recursos,
        ]),
        linha.remover || null,
      ]);
      return linha;
    }

    function atualizarLinha(linha, p, posicao, v) {
      var daVez = v.estado === "ativo" && String(v.turno.ativoId) === String(p.id);
      var selecionada = mestre && String(c.selecionadoId) === String(p.id);
      var pendente = mestre && c.fila.campoPendente("iniciativa", p.id);

      linha.raiz.className = "combate-linha" +
        (p.tipo === "criatura" ? " combate-linha--criatura" : "") +
        (daVez ? " combate-linha--vez" : "") +
        (selecionada ? " combate-linha--selecionada" : "") +
        (pendente ? " combate-linha--pendente" : "");
      if (daVez) linha.raiz.setAttribute("aria-current", "true"); else linha.raiz.removeAttribute("aria-current");

      linha.posicao.textContent = String(posicao + 1);
      linha.marca.textContent = daVez ? "▶" : "";

      var ordemTexto = String(Math.round(Number(p.ordem) || 0));
      if (mestre) {
        if (document.activeElement !== linha.iniciativa) linha.iniciativa.value = ordemTexto;
        linha.iniciativa.setAttribute("aria-label", "Iniciativa de " + p.nome + (pendente ? " (alteração pendente)" : ""));
        linha.nome.textContent = p.nome;
        linha.nome.setAttribute("aria-pressed", String(selecionada));
        linha.nome.setAttribute("aria-label", "Ver a ficha de " + p.nome + " no painel" + (daVez ? " — é a vez dele" : ""));
        linha.remover.setAttribute("aria-label", "Remover " + p.nome + " do combate");
      } else {
        linha.iniciativa.textContent = ordemTexto;
        linha.iniciativa.setAttribute("aria-label", "Iniciativa " + ordemTexto);
        linha.nome.textContent = p.nome + (daVez ? " — vez" : "");
      }

      linha.tipo.textContent = p.tipo === "criatura" ? "Criatura" : "Personagem";
      pintarRecursosDaLinha(linha, p);
    }

    function pintarRecursosDaLinha(linha, p) {
      var itens = [];
      if (p.tipo === "personagem" && Array.isArray(p.recursos)) {
        itens = p.recursos.map(function (r) { return { rotulo: r.rotulo || String(r.chave).toUpperCase(), atual: r.atual, maximo: r.maximo, chave: r.chave }; });
      } else if (mestre && p.tipo === "criatura" && p.snapshot && Array.isArray(p.snapshot.status)) {
        itens = p.snapshot.status.map(function (s) { return { rotulo: s.nome, atual: s.atual, maximo: s.maximo, chave: s.nome }; });
      }

      /* Morrendo e enlouquecendo do personagem, com a mesma regra de quem
         vê os recursos (o servidor só manda para quem pode ver). A
         contagem por turno é feita pelo servidor, no próprio "próximo
         turno": esta tela só mostra. */
      var condicoes = p.tipo === "personagem" && global.RAMAPainelMesa && global.RAMAPainelMesa.condicoesDoCartao
        ? global.RAMAPainelMesa.condicoesDoCartao(p.condicoes)
        : [];
      var marcas = condicoes.map(function (cd) {
        return el("span.combate-condicao", {
          class: (cd.ativa ? "combate-condicao--ativa" : "") + (cd.atingiu && cd.ativa ? " combate-condicao--limite" : ""),
          title: cd.oficial ? "" : "Contador da mesa, não regra do livro",
        }, [
          el("span", { texto: cd.nome, "aria-hidden": "true" }),
          cd.texto ? el("span.combate-condicao__conta", { texto: cd.texto, "aria-hidden": "true" }) : null,
          el("span.so-leitor", { texto: cd.leitura || cd.nome }),
        ]);
      });

      if (!itens.length) {
        U.trocar(linha.recursos, (p.recursosPendentes
          ? [el("span.t-mini", { texto: "recursos a calcular" })]
          : []).concat(marcas));
        return;
      }

      U.trocar(linha.recursos, itens.map(function (r) {
        return el("span.combate-recurso", { class: "combate-recurso--" + corDoRecurso(r.chave, r.rotulo) }, [
          el("span.combate-recurso__rotulo", { texto: r.rotulo }),
          el("span.combate-recurso__valor", { texto: r.atual + " / " + r.maximo }),
        ]);
      }).concat(marcas));
    }

    function pintarBarra(est) {
      pararRelogioDaBarra();
      var partes = [];
      barra.classList.remove("combate-pendencias--erro", "combate-pendencias--ocupada");
      barra.removeAttribute("aria-busy");

      if (est.decidindo) {
        partes.push(el("span", { texto: "Outra pessoa mudou o mesmo campo — escolha o que fica." }));
      } else if (est.erro && est.erro.tipo === "rede") {
        barra.classList.add("combate-pendencias--erro");
        var segundos = est.erro.proximaTentativa ? Math.max(0, Math.ceil((est.erro.proximaTentativa - Date.now()) / 1000)) : 0;
        partes.push(el("span", {
          texto: est.erro.parado
            ? "Não foi possível salvar. As alterações estão guardadas nesta aba."
            : "Sem resposta do servidor — as alterações estão guardadas. Nova tentativa" + (segundos ? " em " + segundos + " s." : " agora."),
        }));
        partes.push(el("button.r-botao.r-botao--mini", {
          type: "button", texto: "Tentar agora",
          onclick: function () { c.fila.tentarAgora(); },
        }));
        if (!est.erro.parado) iniciarRelogioDaBarra();
      } else if (est.erro && est.erro.tipo === "instavel") {
        barra.classList.add("combate-pendencias--erro");
        partes.push(el("span", { texto: "O combate continua mudando em outro lugar. As suas alterações estão guardadas." }));
        partes.push(el("button.r-botao.r-botao--mini", {
          type: "button", texto: "Salvar agora",
          onclick: function () { c.fila.salvarAgora(); },
        }));
      } else if (est.enviando) {
        barra.classList.add("combate-pendencias--ocupada");
        barra.setAttribute("aria-busy", "true");
        partes.push(el("span", { texto: est.pendentes ? "Salvando… (" + est.pendentes + " alteração(ões) esperando o próximo envio)" : "Salvando…" }));
      } else if (est.pendentes) {
        var falta = est.programadoPara ? Math.max(0, Math.ceil((est.programadoPara - Date.now()) / 1000)) : 0;
        partes.push(el("span", {
          texto: "Alterações pendentes (" + est.pendentes + ")" + (falta ? " · salvando em " + falta + " s" : ""),
        }));
        partes.push(el("button.r-botao.r-botao--mini.r-botao--principal", {
          type: "button", texto: "Salvar agora",
          onclick: function () { c.fila.salvarAgora(); },
        }));
        if (falta) iniciarRelogioDaBarra();
      }

      barra.hidden = !partes.length;
      U.trocar(barra, partes);
    }

    function iniciarRelogioDaBarra() {
      if (c.relogioBarra) return;
      c.relogioBarra = setInterval(function () {
        if (!document.body.contains(barra)) { pararRelogioDaBarra(); return; }
        pintarBarra(c.fila.estado());
      }, 1000);
    }

    function pararRelogioDaBarra() {
      if (c.relogioBarra) { clearInterval(c.relogioBarra); c.relogioBarra = null; }
    }

    function pintarControles(v, est, ordem) {
      /* O que depende da ordem espera o lote de iniciativas pendente. */
      var travado = est.camposPendentes > 0;
      var motivo = travado ? "Salve as alterações pendentes antes (\"Salvar agora\")." : "";

      function travar(botao, desabilitar, porque) {
        botao.disabled = !!desabilitar;
        if (desabilitar && porque) {
          botao.title = porque;
          botao.setAttribute("aria-describedby", barra.id);
        } else {
          botao.removeAttribute("title");
          botao.removeAttribute("aria-describedby");
        }
      }

      var ativo = v.estado === "ativo";
      botoes.iniciar.hidden = v.estado !== "preparando";
      botoes.encerrar.hidden = !ativo;
      botoes.voltar.hidden = !ativo;
      botoes.proximo.hidden = !ativo;
      botoes.criatura.hidden = v.estado === "encerrado";
      botoes.personagens.hidden = v.estado === "encerrado";

      if (botoes.iniciar.getAttribute("aria-busy") !== "true") travar(botoes.iniciar, travado, motivo);
      if (botoes.encerrar.getAttribute("aria-busy") !== "true") travar(botoes.encerrar, travado, motivo);
      travar(botoes.proximo, travado || !ordem.length, travado ? motivo : "");
      travar(botoes.voltar, travado || !T.podeVoltar(v.turno, v.participantes || []),
        travado ? motivo : (ativo && ordem.length ? "É o primeiro turno do combate." : ""));

      Object.keys(c.linhas).forEach(function (id) {
        var botao = c.linhas[id].remover;
        if (botao && botao.getAttribute("aria-busy") !== "true") travar(botao, travado, motivo);
      });
    }

    /* ---------- ações pontuais ---------- */

    async function mudarEstado(botao, valor) {
      if (valor === "encerrado") {
        var certeza = await UI.confirmar({
          titulo: "Encerrar " + c.nome() + "?",
          texto: "A rodada fica registrada e ninguém mais tem a vez. Um combate encerrado não volta a andar.",
          rotuloConfirmar: "Encerrar",
        });
        if (!certeza) return;
      }
      var r = await UI.ocupar(botao, function () {
        return c.fila.enfileirar({ tipo: "estado", valor: valor });
      }, { rotulo: valor === "ativo" ? "Iniciando…" : "Encerrando…" });
      if (r && r.ok && !r.jaEstava) UI.avisoOk(valor === "ativo" ? "Combate iniciado: rodada 1." : "Combate encerrado.");
    }

    async function removerParticipante(botao, participanteId) {
      var v = c.fila.vista();
      var nome = nomeDe(v, participanteId);
      if (String(c.selecionadoId) === String(participanteId)) fecharPainel();
      var r = await UI.ocupar(botao, function () {
        return c.fila.enfileirar({ tipo: "remover", participanteId: participanteId });
      }, { rotulo: "Removendo…" });
      if (r && r.ok) UI.aviso(nome + " saiu do combate.");
    }

    function renomear() {
      UI.pedirTexto({
        titulo: "Renomear combate", rotulo: "Nome", valor: c.nome(), limite: 120,
      }).then(function (nome) {
        if (nome === null || !nome.trim()) return;
        c.fila.enfileirar({ tipo: "renomear", nome: nome.trim() });
      });
    }

    async function excluir() {
      var certeza = await UI.confirmar({
        titulo: "Excluir " + c.nome() + "?",
        texto: "O combate e as criaturas dentro dele serão removidos.",
        detalhe: (c.fila.temPendencias() ? "Há alterações pendentes neste combate — elas serão descartadas. " : "") +
                 "Os modelos na biblioteca continuam intactos.",
        rotuloConfirmar: "Excluir", perigo: true,
      });
      if (!certeza) return;

      var aviso = UI.aviso("Excluindo combate…", { duracao: 30000 });
      var r = await global.RAMAApi.excluirCombate(c.ctx.campanhaId, c.id);
      aviso();
      if (!r.ok) { UI.avisoDeFalha(r, "exclusão", { tentarDeNovo: excluir }); return; }
      c.destruir();
      delete controladores[c.id];
      if (c.raiz.parentNode) c.raiz.parentNode.removeChild(c.raiz);
      UI.avisoOk("Combate excluído.");
      recarregarLista(true);
    }

    async function acrescentarPersonagens(botao) {
      var v = c.fila.vista();
      var dentro = {};
      (v.participantes || []).forEach(function (p) { if (p.tipo === "personagem") dentro[p.personagemId] = true; });
      var faltando = c.ctx.personagens.filter(function (p) { return !dentro[p.id]; });

      if (!faltando.length) { UI.avisoAtencao("Todos os personagens da mesa já estão no combate."); return; }

      var r = await UI.ocupar(botao, function () {
        return c.fila.enfileirar({
          tipo: "adicionar",
          participantes: faltando.map(function (p) {
            return { id: U.uuid(), tipo: "personagem", personagemId: p.id, nome: p.nome, ordem: 0 };
          }),
        });
      }, { rotulo: "Acrescentando…" });
      if (r && r.ok) UI.avisoOk(faltando.length === 1 ? faltando[0].nome + " entrou no combate." : faltando.length + " personagens entraram no combate.");
    }

    async function escolherCriatura(botao) {
      var r = await UI.ocupar(botao, function () {
        return global.RAMAApi.listarHomebrew({ escopo: "todos", tipo: "criatura" });
      }, { rotulo: "Consultando…" });
      if (!r || r.ignorado) return;
      if (!r.ok) { UI.avisoDeFalha(r, "leitura das criaturas", { tentarDeNovo: function () { escolherCriatura(botao); } }); return; }

      var criaturas = r.dados || [];

      if (!criaturas.length) {
        UI.modal({
          titulo: "Nenhuma criatura disponível",
          conteudo: [
            el("p", { texto: "Você ainda não criou criaturas, e nenhuma foi publicada por outras contas." }),
            el("p.t-mini", { texto: "Crie criaturas na aba Homebrew. Elas podem ser privadas (só suas) ou públicas." }),
          ],
          botoes: [
            { rotulo: "Ir para Homebrew", classe: "r-botao--principal",
              aoClicar: function () { location.href = U.url("homebrew/"); } },
            { rotulo: "Fechar", classe: "r-botao--fantasma" },
          ],
        });
        return;
      }

      var m = UI.modal({
        titulo: "Acrescentar criatura",
        largo: true,
        conteudo: [
          el("div.pilha--curta", { class: "pilha" }, criaturas.map(function (modelo) {
            return el("button.r-cartao", {
              type: "button",
              estilo: { textAlign: "left", width: "100%", cursor: "pointer" },
              onclick: function () { trazerCriatura(modelo); m.fechar(); },
            }, [
              el("div.faixa.faixa--entre", {}, [
                el("span.t-forte", { texto: modelo.nome }),
                el("span.r-etiqueta", { texto: modelo.meu ? "Sua" : "Pública" }),
              ]),
              el("p.t-mini", {
                texto: (modelo.status || []).map(function (s) { return s.nome + " " + s.maximo; }).join(" · ") || "Sem status",
              }),
            ]);
          })),
          el("p.t-mini", {
            texto: "A criatura entra como cópia independente. Acrescente a mesma quantas vezes precisar — cada uma terá o próprio estado.",
          }),
        ],
        botoes: [{ rotulo: "Fechar", classe: "r-botao--fantasma" }],
      });
    }

    async function trazerCriatura(modelo) {
      /* Quantas dessa mesma criatura já estão aqui: a numeração continua
         de onde parou, então #1 e #2 convivem sem se confundir. */
      var v = c.fila.vista();
      var quantas = (v.participantes || []).filter(function (p) {
        return p.tipo === "criatura" && p.origemId === modelo.id;
      }).length;

      var participante = global.RAMACriaturas.paraCombate(modelo, quantas + 1);
      var r = await c.fila.enfileirar({ tipo: "adicionar", participantes: [participante] });
      if (r && r.ok) UI.avisoOk(participante.nome + " entrou no combate.");
    }

    function permissoes(botao) {
      var v = c.fila.vista();
      var escolhidos = {};
      (v.visiveis || []).forEach(function (id) { escolhidos[id] = true; });

      var eu = global.RAMAAuth.agente();
      var candidatos = c.ctx.membros.filter(function (m) { return m.id !== (eu && eu.id); });

      UI.modal({
        titulo: "Quem vê " + c.nome(),
        conteudo: el("div.pilha", {}, [
          candidatos.length
            ? el("div.pilha--curta", { class: "pilha" }, candidatos.map(function (m) {
                return el("label.r-marca", {}, [
                  el("input", {
                    type: "checkbox", checked: !!escolhidos[m.id],
                    onchange: function (ev) {
                      if (ev.target.checked) escolhidos[m.id] = true;
                      else delete escolhidos[m.id];
                    },
                  }),
                  el("span", { texto: m.nome }),
                ]);
              }))
            : el("p.t-mini", { texto: "Nenhum outro participante na campanha." }),
          el("p.t-mini", {
            texto: "Quem tiver acesso vê a lista, a ordem, a rodada e de quem é a vez. A ficha interna das criaturas continua só com você — o servidor não a envia. " +
                   "Os recursos dos personagens seguem a chave \"Esconder status dos jogadores\", da aba Personagens.",
          }),
        ]),
        botoes: [
          { rotulo: "Cancelar", classe: "r-botao--fantasma" },
          {
            rotulo: "Salvar", classe: "r-botao--principal",
            /* A janela mostra "Salvando…" no botão enquanto a promessa não
               termina (ver UI.modal). */
            aoClicar: async function (fechar) {
              var r = await c.fila.enfileirar({ tipo: "visiveis", lista: Object.keys(escolhidos) });
              if (r && r.ok) { fechar(); UI.avisoOk("Acesso ao combate atualizado."); }
            },
          },
        ],
      });
      if (botao) botao.blur();
    }

    /* ---------- seleção e painel ---------- */

    async function selecionar(id) {
      if (String(c.selecionadoId) === String(id) && c.painel) {
        if (estreito()) abrirGaveta();
        return;
      }
      if (c.painel && c.painel.antesDeTrocar) {
        var pode = await c.painel.antesDeTrocar();
        if (!pode) return;
      }
      fecharPainel();

      var v = c.fila.vista();
      var p = (v.participantes || []).filter(function (x) { return String(x.id) === String(id); })[0];
      if (!p) return;

      c.selecionadoId = id;
      c.painel = p.tipo === "personagem" ? painelDePersonagem(p) : painelDeCriatura(c, p);

      if (estreito()) abrirGaveta();
      else U.trocar(painelLateral, c.painel.raiz);

      pintar();
    }

    function abrirGaveta() {
      if (!c.painel) return;
      if (c.gaveta) return;
      c.gaveta = UI.modal({
        titulo: c.painel.titulo,
        classe: "r-modal--gaveta",
        conteudo: [c.painel.raiz],
        aoFechar: function () { c.gaveta = null; },
      });
    }

    function fecharPainel() {
      if (c.gaveta) { var g = c.gaveta; c.gaveta = null; g.fechar(); }
      if (c.painel && c.painel.destruir) c.painel.destruir();
      c.painel = null;
      c.selecionadoId = null;
      if (painelLateral) U.trocar(painelLateral, placeholderDoPainel());
    }

    function atualizarPainel(v) {
      if (!c.painel) {
        if (painelLateral && !painelLateral.firstChild) U.trocar(painelLateral, placeholderDoPainel());
        return;
      }
      var p = (v.participantes || []).filter(function (x) { return String(x.id) === String(c.selecionadoId); })[0];
      if (!p) {
        fecharPainel();
        if (painelLateral) U.trocar(painelLateral, el("p.t-mini.combate__painel-vazio", { texto: "Este participante saiu do combate." }));
        return;
      }
      if (c.painel.atualizar) c.painel.atualizar(p);
    }

    function placeholderDoPainel() {
      return el("div.combate__painel-vazio", {}, [
        el("p.t-secao", { texto: "Ficha do participante" }),
        el("p.t-mini", { texto: "Clique no nome de um participante para ver a ficha dele aqui. Selecionar para consulta não passa o turno." }),
      ]);
    }

    function painelDePersonagem(p) {
      var iframe = el("iframe.combate-ficha", {
        src: U.url("ficha/?id=" + encodeURIComponent(p.personagemId) + "&painel=1"),
        title: "Ficha de " + p.nome,
        loading: "lazy",
      });

      function janelaDaFicha() {
        try { return iframe.contentWindow && iframe.contentWindow.RAMAFichaPainel; }
        catch (e) { return null; }
      }

      return {
        titulo: p.nome,
        raiz: el("div.combate-ficha-caixa", {}, [iframe]),
        atualizar: function () { /* a ficha se atualiza sozinha; ver recarregarFicha */ },
        recarregar: function () {
          var f = janelaDaFicha();
          if (f && f.recarregarSeLivre) f.recarregarSeLivre();
        },
        antesDeTrocar: async function () {
          var f = janelaDaFicha();
          if (!f || !f.temPendencia()) return true;
          await f.salvarAgora();
          if (!f.temPendencia()) return true;
          return UI.confirmar({
            titulo: "A ficha de " + p.nome + " ainda não salvou",
            texto: "Há alterações que não subiram (sem conexão, ou um conflito para resolver). Trocar de participante agora pode perdê-las.",
            rotuloConfirmar: "Trocar mesmo assim",
            rotuloCancelar: "Continuar nesta ficha",
            perigo: true,
          });
        },
        destruir: function () { iframe.src = "about:blank"; },
      };
    }

    c.recarregarFicha = function () {
      if (c.painel && c.painel.recarregar) c.painel.recarregar();
    };

    c.destruir = function () {
      pararRelogioDaBarra();
      if (c.gaveta) { var g = c.gaveta; c.gaveta = null; g.fechar(); }
      if (c.painel && c.painel.destruir) c.painel.destruir();
      c.fila.parar();
    };

    pintar();
    return c;
  }

  function corDoRecurso(chave, rotulo) {
    var k = U.chaveDeBusca(String(chave || "") + " " + String(rotulo || ""));
    if (/\b(pv|vida|pontos de vida|hp|saude)\b/.test(k)) return "vida";
    if (/\b(san|sanidade)\b/.test(k)) return "sanidade";
    if (/\b(pe|esforco|pontos de esforco|energia|mana)\b/.test(k)) return "esforco";
    if (/\b(pd|determinacao|pontos de determinacao)\b/.test(k)) return "esforco";
    return "neutro";
  }

  /* =================================================================
     CONFLITO NO MESMO CAMPO
     ================================================================= */

  function perguntarConflito(conflitos) {
    return new Promise(function (resolver) {
      var escolhas = {};
      conflitos.forEach(function (c) { escolhas[c.chave] = "deles"; });

      UI.modal({
        titulo: "Outra pessoa mudou o mesmo campo",
        exigeDecisao: true,
        semFechar: true,
        conteudo: [
          el("p", { texto: "Enquanto as suas alterações esperavam para subir, alguém mudou estes campos no mesmo combate. Escolha o que fica." }),
          el("div.pilha--curta", { class: "pilha" }, conflitos.map(function (c, i) {
            var nome = "conflito-" + i + "-" + U.uuid().slice(0, 6);
            return el("fieldset.combate-conflito", {}, [
              el("legend.t-forte", { texto: c.rotulo }),
              el("p.t-mini", { texto: "Antes: " + c.antes }),
              el("label.r-marca", {}, [
                el("input", { type: "radio", name: nome, value: "minha", onchange: function () { escolhas[c.chave] = "minha"; } }),
                el("span", { texto: "Manter o meu: " + c.minha }),
              ]),
              el("label.r-marca", {}, [
                el("input", { type: "radio", name: nome, value: "deles", checked: true, onchange: function () { escolhas[c.chave] = "deles"; } }),
                el("span", { texto: "Usar o da outra pessoa: " + c.deles }),
              ]),
            ]);
          })),
        ],
        botoes: [{
          rotulo: "Aplicar escolhas", classe: "r-botao--principal",
          aoClicar: function (fechar) { fechar(); resolver(escolhas); },
        }],
      });
    });
  }

  /* =================================================================
     CRIATURA NO PAINEL
     -----------------------------------------------------------------
     A instância do combate, com o que o snapshot tem: status, atributos,
     perícias, ataques, habilidades e descrição. A vida mexe pela fila do
     combate (só esta ocorrência muda). As rolagens usam o mesmo motor e o
     mesmo mostrador das fichas, e sobem para o histórico pelo mesmo funil
     (RAMARolagens → RAMAHistorico), como rolagem do mestre.
     ================================================================= */

  function painelDeCriatura(controlador, participante) {
    var c = global.RAMACriaturas.normalizar(participante.snapshot);
    var controles = {};

    var status = c.status.length ? UI.painel("Status", el("div.painel-numeros", {}, c.status.map(function (s) {
      var passo = UI.passo({
        valor: s.atual, minimo: 0, maximo: s.maximo > 0 ? s.maximo : 999999,
        rotulo: s.nome + " de " + participante.nome,
        aoMudar: function (v) { controlador.fila.definirStatusCriatura(participante.id, s.id, v); },
      });
      controles[s.id] = passo;
      return el("div.painel-numero", {}, [
        el("span.t-rotulo", { texto: s.nome + " / " + s.maximo }),
        passo,
      ]);
    }))) : null;

    function rolar(nome, resultado, critico) {
      if (global.RAMARolagens) {
        global.RAMARolagens.mostrar(resultado, { nome: participante.nome + " · " + nome, tipo: "criatura", critico: !!critico });
      }
    }

    var corpo = el("div.pilha.criatura-painel", {}, [
      el("div.criatura-painel__topo", {}, [
        el("p.t-secao", { texto: participante.nome }),
        el("span.r-etiqueta", { texto: "Criatura deste combate" }),
      ]),
      el("p.t-mini", { texto: "Mudanças aqui valem só para esta ocorrência. O modelo na biblioteca e as outras cópias não mudam." }),

      status,

      c.atributos.length ? UI.painel("Atributos", el("div.atributos", {}, c.atributos.map(function (a) {
        return el("div.atributo", {}, [
          el("button.atributo__caixa", {
            type: "button",
            "aria-label": "Rolar " + a.nome + ", " + a.dado,
            onclick: function () {
              var r = global.RAMADados.rolar(a.dado);
              if (!r.ok) { UI.avisoErro("Dado inválido: " + a.dado); return; }
              rolar(a.nome, {
                tipo: "atributo", expressao: r.expressao, rolagens: r.rolagens,
                natural: r.principal, total: r.principal, parcelas: [],
              });
            },
          }, [
            el("span.atributo__sigla", { texto: a.sigla }),
            el("span.atributo__valor", { texto: String(a.valor) }),
            el("span.atributo__dado", { texto: a.dado }),
          ]),
        ]);
      }))) : null,

      c.pericias.length ? UI.painel("Perícias", el("div.pericias", {}, c.pericias.map(function (p) {
        return el("button.pericia", {
          type: "button",
          "aria-label": "Rolar " + p.nome,
          onclick: function () { rolar(p.nome, global.RAMADados.dependente(global.RAMACriaturas.pedidoDePericia(c, p))); },
        }, [
          el("span.pericia__nome", { texto: p.nome }),
          el("span.pericia__bonus", { texto: U.comSinal(p.bonus + p.bonusTemporario) }),
        ]);
      }))) : null,

      c.ataques.length ? UI.painel("Ataques", el("div.pilha--curta", { class: "pilha" }, c.ataques.map(function (a) {
        return el("div.item", {}, [
          el("p.item__nome", { texto: a.nome }),
          el("dl.r-dados", {}, [
            el("dt", { texto: "Dano" }),
            el("dd", { texto: (a.dano || "—") + (a.danoExtra ? " + " + a.danoExtra : "") }),
            el("dt", { texto: "Crítico" }),
            el("dd", { texto: a.critico ? a.critico + " / x" + a.multiplicador : "—" }),
          ]),
          el("div.item__acoes", {}, [
            el("button.r-botao.r-botao--mini", {
              type: "button", texto: "Ataque",
              onclick: function () {
                var r = global.RAMADados.dependente(global.RAMACriaturas.pedidoDeAtaque(c, a));
                rolar(a.nome + " · Ataque", r, global.RAMADados.ehCritico(r.natural, a.critico));
              },
            }),
            el("button.r-botao.r-botao--mini", {
              type: "button", texto: "Dano", disabled: !a.dano,
              onclick: function () {
                rolar(a.nome + " · Dano", global.RAMADados.dano({
                  nome: a.nome, dano: a.dano, danoExtra: a.danoExtra,
                  critico: false, multiplicador: a.multiplicador,
                }));
              },
            }),
          ]),
        ]);
      }))) : null,

      c.habilidades.length ? UI.painel("Habilidades",
        el("div.pilha--curta", { class: "pilha" }, c.habilidades.map(function (h) {
          return UI.recolhivel({ titulo: h.nome, extra: h.origem, conteudo: [el("p", { texto: h.texto })] });
        }))
      ) : null,

      c.descricao ? UI.painel("Descrição", el("p", { texto: c.descricao, estilo: { whiteSpace: "pre-wrap" } })) : null,
    ]);

    return {
      titulo: participante.nome,
      raiz: el("div.combate-criatura-caixa", {}, [corpo]),
      /* Mudança vinda de fora (outra aba) ou confirmada pelo servidor: o
         número acompanha, a menos que a pessoa esteja digitando nele. */
      atualizar: function (p) {
        var snap = global.RAMACriaturas.normalizar(p.snapshot);
        snap.status.forEach(function (s) {
          var passo = controles[s.id];
          if (!passo) return;
          var campo = U.$(".r-passo__valor", passo);
          if (campo && document.activeElement === campo) return;
          if (passo.valor() !== s.atual) passo.definir(s.atual);
        });
      },
    };
  }

  /* =================================================================
     NOVO COMBATE
     ================================================================= */

  function criar(ctx, botao, recarregar) {
    UI.pedirTexto({
      titulo: "Novo combate", rotulo: "Nome", valor: "Combate", limite: 120,
    }).then(async function (nome) {
      if (nome === null) return;

      var r = await UI.ocupar(botao, function () {
        return global.RAMAApi.salvarCombate(ctx.campanhaId, {
          nome: nome || "Combate", estado: "preparando", visiveis: [], participantes: [],
        });
      }, { rotulo: "Criando…" });

      if (!r || r.ignorado) return;
      if (!r.ok) { UI.avisoDeFalha(r, "criação do combate"); return; }
      UI.avisoOk("Combate criado.");
      await recarregar(false);
    });
  }
})(window);
