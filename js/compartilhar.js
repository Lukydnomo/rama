/* =====================================================================
   R.A.M.A. — compartilhar uma ficha (v2.44)
   ---------------------------------------------------------------------
   A janela do dono. Abre sobre um RASCUNHO: buscar pessoas, marcar
   várias, escolher Editor ou Leitor, trocar o papel de quem já tem
   acesso ou retirar — e nada disso existe até "Salvar". Cancelar (ou
   fechar) deixa os acessos como estavam.

     Editor  altera a ficha original, pelo mesmo salvamento do dono
     Leitor  consulta; os dois podem copiar para a própria biblioteca

   Quem é quem sai da lista de contas que o site já usa (listar_usuarios):
   nome de exibição e nome de usuário, e o que vai ao servidor é sempre o
   ID — dois "Ana" diferentes nunca se confundem. O servidor confere de
   novo: conta que existe, nunca o dono, nunca repetida, papel conhecido,
   e a versão da lista que esta janela leu (outra janela pode ter mudado
   a lista nesse meio-tempo).

   O mestre da campanha da ficha continua alcançando-a por lá. A janela
   avisa, para ninguém achar que retirar o compartilhamento trancou a
   ficha para essa pessoa.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var el = U.el;

  var PAPEIS = [
    { valor: "editor", rotulo: "Editor" },
    { valor: "leitor", rotulo: "Leitor" },
  ];
  var MAX_RESULTADOS = 40;

  function rotuloDoPapel(p) { return p === "editor" ? "Editor" : "Leitor"; }

  function seletorDePapel(valor, rotulo, aoMudar, foco) {
    return el("select.r-selecao.compartilhar__papel", {
      "aria-label": rotulo,
      dataset: foco ? { foco: foco } : {},
      onchange: function (ev) { aoMudar(ev.target.value); },
    }, PAPEIS.map(function (p) {
      return el("option", { value: p.valor, texto: p.rotulo, selected: p.valor === valor });
    }));
  }

  /* abrir({ personagemId, nome, aoSalvar(dados), focoAoFechar() })
     focoAoFechar: o controle que recebe o foco quando a janela fecha —
     o item de menu que a abriu já não existe nessa hora. */
  function abrir(opcoes) {
    var o = opcoes || {};
    var eu = global.RAMAAuth && global.RAMAAuth.agente ? global.RAMAAuth.agente() : null;
    var caixa = el("div.compartilhar.pilha", { "aria-busy": "true" }, [UI.carregando("Carregando acessos")]);

    var st = {
      carregado: false,
      versao: "",
      contas: [],          // as contas do site, menos o dono
      rascunho: [],        // [{ userId, nome, usuario, papel, viaMestre }]
      original: "",        // o rascunho como veio, para saber se mudou
      mestres: {},
      busca: "",
      marcados: {},
      papelNovo: "leitor",
      recado: null,        // { tipo, texto }
      salvando: false,
    };

    var janela = UI.modal({
      titulo: "Compartilhar “" + (o.nome || "ficha") + "”",
      largo: true,
      conteudo: [caixa],
      podeFechar: function () { return !st.salvando; },
      aoFechar: function () {
        var alvo = o.focoAoFechar ? o.focoAoFechar() : null;
        if (alvo && alvo.isConnected) setTimeout(function () { alvo.focus(); }, 0);
      },
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Salvar", classe: "r-botao--principal", rotuloOcupado: "Salvando…", aoClicar: salvar },
      ],
    });

    carregar();

    async function carregar() {
      caixa.setAttribute("aria-busy", "true");
      U.trocar(caixa, UI.carregando("Carregando acessos"));
      var rs = await Promise.all([
        global.RAMAApi.listarCompartilhamentos(o.personagemId),
        global.RAMAApi.listarUsuarios(),
      ]);
      caixa.removeAttribute("aria-busy");
      var ra = rs[0], ru = rs[1];
      if (!ra.ok) { U.trocar(caixa, UI.erroDeTela(ra, carregar)); return; }
      if (!ru.ok) { U.trocar(caixa, UI.erroDeTela(ru, carregar)); return; }

      var dono = eu ? String(eu.id) : "";
      st.contas = (ru.dados || []).filter(function (u) { return String(u.id) !== dono; });
      aplicarDoServidor(ra.dados);
      st.carregado = true;
      desenhar();
      var busca = caixa.querySelector('[data-foco="compartilhar-busca"]');
      if (busca) busca.focus();
    }

    function aplicarDoServidor(d) {
      st.versao = d.versao || "";
      st.mestres = {};
      (d.mestres || []).forEach(function (id) { st.mestres[String(id)] = true; });
      st.rascunho = (d.acessos || []).map(function (a) {
        return { userId: String(a.userId), nome: a.nome, usuario: a.usuario, papel: a.papel, viaMestre: !!a.viaMestre };
      });
      st.original = assinatura();
      st.marcados = {};
    }

    function assinatura() {
      return st.rascunho.map(function (a) { return a.userId + ":" + a.papel; }).sort().join("|");
    }

    function noRascunho(id) {
      return st.rascunho.some(function (a) { return a.userId === String(id); });
    }

    function contaPorId(id) {
      for (var i = 0; i < st.contas.length; i++) if (String(st.contas[i].id) === String(id)) return st.contas[i];
      return null;
    }

    /* ---------- desenho ---------- */

    function desenhar() {
      if (!st.carregado) return;
      var ativo = document.activeElement;
      var foco = ativo && caixa.contains(ativo) && ativo.dataset ? ativo.dataset.foco : "";
      var cursor = null;
      try { cursor = foco && ativo.selectionStart !== undefined ? ativo.selectionStart : null; } catch (e) { cursor = null; }

      U.trocar(caixa, [
        el("p.t-mini", {
          texto: "Editor altera a ficha original — a mesma que você vê. Leitor só consulta. Os dois podem copiar a ficha para a própria biblioteca. " +
                 "Compartilhar não muda o dono, não leva ninguém para a campanha e não dá acesso a ela.",
        }),
        st.recado ? el("p.compartilhar__recado", {
          role: st.recado.tipo === "erro" ? "alert" : "status",
          class: "compartilhar__recado--" + st.recado.tipo,
          texto: st.recado.texto,
        }) : null,
        secaoAdicionar(),
        secaoComAcesso(),
        assinatura() !== st.original
          ? el("p.t-mini.compartilhar__pendente", { role: "status", texto: "Alterações ainda não salvas — use “Salvar” para confirmar, ou “Cancelar” para descartar." })
          : null,
      ]);

      if (foco) {
        var novo = caixa.querySelector('[data-foco="' + foco + '"]');
        if (novo) {
          novo.focus();
          if (cursor !== null) { try { novo.setSelectionRange(cursor, cursor); } catch (e) { /* não é texto */ } }
        }
      }
    }

    function secaoAdicionar() {
      var chave = U.chaveDeBusca(st.busca);
      var candidatas = st.contas.filter(function (u) {
        if (noRascunho(u.id)) return false;
        if (!chave) return true;
        return U.chaveDeBusca(u.nome + " " + u.usuario).indexOf(chave) >= 0;
      });
      var mostradas = candidatas.slice(0, MAX_RESULTADOS);
      var nMarcados = Object.keys(st.marcados).filter(function (id) { return st.marcados[id] && !noRascunho(id); }).length;

      var lista;
      if (!st.contas.length) {
        lista = el("p.t-mini", { texto: "Nenhuma outra conta cadastrada no R.A.M.A." });
      } else if (!candidatas.length) {
        lista = el("p.t-mini", { role: "status", texto: chave ? "Ninguém encontrado para “" + st.busca.trim() + "”." : "Todas as contas já têm acesso." });
      } else {
        lista = el("ul.compartilhar__resultados", { "aria-label": "Contas encontradas" }, mostradas.map(function (u) {
          var id = String(u.id);
          return el("li", {}, [
            el("label.r-marca.compartilhar__conta", {}, [
              el("input", {
                type: "checkbox",
                checked: !!st.marcados[id],
                dataset: { foco: "marcar-" + id },
                onchange: function (ev) { st.marcados[id] = ev.target.checked; desenhar(); },
              }),
              el("span.compartilhar__quem", {}, [
                el("span.t-forte", { texto: u.nome || u.usuario }),
                el("span.t-mini", { texto: " @" + u.usuario }),
              ]),
            ]),
          ]);
        }));
      }

      return el("section.compartilhar__secao", { "aria-labelledby": "compartilhar-add" }, [
        el("h3.r-rotulo", { id: "compartilhar-add", texto: "Adicionar pessoas" }),
        el("div.r-busca", {}, [
          el("span.r-busca__marca", {}, [UI.simbolo("busca")]),
          el("input.r-entrada", {
            type: "search",
            value: st.busca,
            placeholder: "Buscar por nome ou usuário",
            "aria-label": "Buscar contas para compartilhar",
            dataset: { foco: "compartilhar-busca" },
            oninput: function (ev) { st.busca = ev.target.value; desenhar(); },
          }),
        ]),
        lista,
        candidatas.length > mostradas.length
          ? el("p.t-mini", { texto: "Mostrando " + mostradas.length + " de " + candidatas.length + " — refine a busca para achar outras." })
          : null,
        el("div.faixa.compartilhar__adicionar", {}, [
          el("label.compartilhar__como", {}, [
            el("span.r-rotulo", { texto: "Adicionar como" }),
            seletorDePapel(st.papelNovo, "Papel de quem for adicionado", function (v) { st.papelNovo = v; }, "papel-novo"),
          ]),
          el("button.r-botao", {
            type: "button",
            disabled: !nMarcados,
            dataset: { foco: "adicionar-marcados" },
            texto: nMarcados ? "Adicionar " + nMarcados + " selecionado(s)" : "Adicionar selecionados",
            onclick: adicionarMarcados,
          }),
        ]),
      ]);
    }

    function secaoComAcesso() {
      return el("section.compartilhar__secao", { "aria-labelledby": "compartilhar-lista" }, [
        el("h3.r-rotulo", { id: "compartilhar-lista", texto: "Com acesso (" + st.rascunho.length + ")" }),
        st.rascunho.length
          ? el("ul.compartilhar__acessos", { "aria-label": "Quem tem acesso" }, st.rascunho.map(linhaDeAcesso))
          : el("p.t-mini", { texto: "Ninguém além de você. Busque e marque as contas acima para compartilhar." }),
      ]);
    }

    function linhaDeAcesso(a) {
      var conta = contaPorId(a.userId);
      var nome = a.nome || (conta && conta.nome) || "Conta";
      var usuario = a.usuario || (conta && conta.usuario) || "";
      var mestre = a.viaMestre || st.mestres[a.userId];
      return el("li.compartilhar__acesso", {}, [
        el("span.r-avatar", { "aria-hidden": "true", texto: U.iniciais(nome) }),
        el("span.compartilhar__quem", {}, [
          el("span.t-forte", { texto: nome }),
          usuario ? el("span.t-mini", { texto: " @" + usuario }) : null,
          mestre ? el("span.t-mini.compartilhar__nota", {
            texto: "Mestre da campanha desta ficha: continua com acesso por lá, mesmo sem o compartilhamento.",
          }) : null,
        ]),
        seletorDePapel(a.papel, "Papel de " + nome, function (v) { a.papel = v; desenhar(); }, "papel-" + a.userId),
        el("button.r-botao.r-botao--mini.r-botao--perigo", {
          type: "button",
          texto: "Remover",
          "aria-label": "Remover o acesso de " + nome,
          dataset: { foco: "remover-" + a.userId },
          onclick: function () { remover(a.userId); },
        }),
      ]);
    }

    /* ---------- o rascunho ---------- */

    function adicionarMarcados() {
      var n = 0;
      Object.keys(st.marcados).forEach(function (id) {
        if (!st.marcados[id] || noRascunho(id)) return;
        var u = contaPorId(id);
        if (!u) return;
        st.rascunho.push({ userId: String(u.id), nome: u.nome, usuario: u.usuario, papel: st.papelNovo, viaMestre: !!st.mestres[String(u.id)] });
        n++;
      });
      st.marcados = {};
      st.recado = n ? { tipo: "ok", texto: n + " conta(s) adicionada(s) como " + rotuloDoPapel(st.papelNovo) + ". Salve para confirmar." } : null;
      desenhar();
      var b = caixa.querySelector('[data-foco="compartilhar-busca"]');
      if (b) b.focus();
    }

    function remover(userId) {
      var antes = st.rascunho.length;
      var removido = st.rascunho.filter(function (a) { return a.userId === userId; })[0];
      st.rascunho = st.rascunho.filter(function (a) { return a.userId !== userId; });
      if (st.rascunho.length !== antes && removido) {
        var mestre = removido.viaMestre || st.mestres[userId];
        st.recado = {
          tipo: mestre ? "atencao" : "ok",
          texto: (removido.nome || "A conta") + " sai da lista ao salvar." +
            (mestre ? " Atenção: como mestre da campanha desta ficha, essa pessoa continua com acesso por lá." : ""),
        };
      }
      desenhar();
      var b = caixa.querySelector('[data-foco="compartilhar-busca"]');
      if (b) b.focus();
    }

    /* ---------- salvar ---------- */

    async function salvar(fechar) {
      if (!st.carregado || st.salvando) return;
      if (assinatura() === st.original) { fechar(); return; }
      st.salvando = true;
      var r;
      try {
        r = await global.RAMAApi.salvarCompartilhamentos(o.personagemId, st.versao,
          st.rascunho.map(function (a) { return { userId: a.userId, papel: a.papel }; }));
      } finally {
        st.salvando = false;
      }

      if (r && r.ok) {
        var d = r.dados || {};
        fechar();
        UI.avisoOk((d.acessos || []).length
          ? "Compartilhamento salvo: " + d.acessos.length + " conta(s) com acesso."
          : "Compartilhamento salvo: ninguém além de você tem acesso direto.");
        if (o.aoSalvar) o.aoSalvar(d);
        return;
      }

      if (r && r.erro === "conflito" && r.dados) {
        /* Outra janela mudou a lista. Nada é sobrescrito: a lista atual
           entra no lugar do rascunho, e quem salva confere de novo. */
        aplicarDoServidor(r.dados);
        st.recado = { tipo: "atencao", texto: "Os acessos desta ficha foram alterados em outra janela. A lista abaixo é a atual — revise e salve de novo." };
        desenhar();
        return;
      }

      var f = global.RAMAApi.frase(r || {});
      var detalhe = r && r.motivo === "conta" ? "Uma das contas escolhidas não existe mais ou foi desativada." :
        (r && r.motivo === "repetido" ? "A mesma conta apareceu duas vezes." :
        (r && r.motivo === "dono" ? "O dono da ficha não entra na lista." : f.texto));
      st.recado = { tipo: "erro", texto: "Não foi possível salvar: " + detalhe + " Nada mudou nos acessos." };
      desenhar();
    }

    return janela;
  }

  global.RAMACompartilhar = { abrir: abrir };
})(window);
