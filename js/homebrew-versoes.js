/* =====================================================================
   R.A.M.A. — Homebrew · versões das cópias na ficha (v9.15)
   ---------------------------------------------------------------------
   A ficha guarda a CÓPIA de cada definição Homebrew que usa (chave
   versionada: <prefixo>-<id>-<hash do conteúdo>). Editar na biblioteca
   cria outra versão e NÃO muda o personagem em jogo. Este painel mostra
   as cópias da ficha e, quando a biblioteca tem uma versão mais nova do
   mesmo registro (mesmo homebrewId, outra chave), oferece ATUALIZAR — de
   propósito, com confirmação.

   Atualizar troca a chave antiga pela nova em todo o bloco da ficha (as
   escolhas que apontam para ela, e as chaves derivadas, como
   "<divindade>-p1" ou "<trilha>-p10") e grava a cópia nova.

     trocarChave(bloco, antiga, nova)   o bloco com a chave trocada
     painel({ copias, carregar, novas, aplicar, podeEditar })
   ===================================================================== */

(function (global) {
  "use strict";

  /* Troca toda ocorrência da chave (as chaves versionadas são únicas o
     bastante para não aparecer dentro de outro texto). Muda o objeto no
     lugar, para quem guarda a referência. */
  function trocarChave(bloco, antiga, nova) {
    if (!antiga || !nova || antiga === nova) return bloco;
    var t = JSON.stringify(bloco).split(antiga).join(nova);
    var novo = JSON.parse(t);
    Object.keys(bloco).forEach(function (k) { delete bloco[k]; });
    Object.keys(novo).forEach(function (k) { bloco[k] = novo[k]; });
    return bloco;
  }

  var ROTULOS = { classe: "Classe", origem: "Origem", trilha: "Trilha", raca: "Raça", divindade: "Divindade", magia: "Magia", poder: "Poder",
    ocupacao: "Ocupação", descritor: "Descritor", arquetipo: "Arquétipo", papel: "Papel", motivacao: "Motivação", mazela: "Mazela", fardo: "Fardo",
    cla: "Clã", predador: "Predador", disciplina: "Disciplina", vantagem: "Vantagem", perfil: "Perfil" };

  /* O painel: as cópias e, depois de consultar a biblioteca, as versões
     novas. `aplicar(item)` muda a ficha (o chamador grava). */
  function painel(op) {
    var U = global.RAMAUtil, UI = global.RAMAUI, el = U.el;
    var o = op || {};
    var caixa = el("div.pilha--curta.hb-versoes", { class: "pilha" });
    var estado = { novas: null, consultando: false, falhou: false };
    function pintar() {
      var copias = o.copias();
      if (!copias.length) { U.trocar(caixa, []); return; }
      var linhas = copias.map(function (cp) {
        var nova = (estado.novas || []).filter(function (n) { return n.chave === cp.chave; })[0];
        return el("li.hb-versoes__item", {}, [
          el("span", {}, [el("strong", { texto: cp.nome }), el("span.t-mini", { texto: " · " + (ROTULOS[cp.tipo] || cp.tipo) + " Homebrew · versão " + cp.chave.split("-").pop() })]),
          nova ? el("span.hb-versoes__nova", {}, [
            el("span.t-mini", { texto: " — há uma versão nova na biblioteca" + (nova.def.nome !== cp.nome ? " (“" + nova.def.nome + "”)" : "") + "." }),
            o.podeEditar ? el("button.r-botao.r-botao--mini", { type: "button", texto: "Atualizar", "aria-label": "Atualizar " + cp.nome + " para a versão da biblioteca", onclick: function () { confirmar(cp, nova); } }) : null,
          ]) : null,
        ]);
      });
      var rodape = estado.novas === null
        ? el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: estado.consultando ? "Consultando…" : "Procurar versões novas", disabled: estado.consultando || null, onclick: consultar })
        : el("p.t-mini", { texto: estado.falhou ? "Não deu para consultar a biblioteca agora." : (estado.novas.length ? "" : "Todas as cópias estão na versão da biblioteca (ou o registro não está mais nela).") });
      U.trocar(caixa, [
        el("p.t-mini", { texto: "A ficha guarda a própria cópia do que é Homebrew: mudar a biblioteca não muda este personagem. Para trazer uma versão nova, atualize aqui." }),
        el("ul.bib-lista-textos.hb-versoes__lista", {}, linhas),
        rodape,
      ]);
    }
    function consultar() {
      estado.consultando = true; pintar();
      Promise.resolve(o.carregar()).then(function (bib) {
        estado.consultando = false; estado.novas = o.novas(bib) || []; pintar();
      }, function () { estado.consultando = false; estado.falhou = true; estado.novas = []; pintar(); });
    }
    function confirmar(cp, nova) {
      UI.confirmar({
        titulo: "Atualizar " + cp.nome + "?",
        texto: "A ficha passa a usar a versão atual da biblioteca. Os números podem mudar (PV, perícias, habilidades); escolhas que não existirem mais ficam sem efeito. Dá para desfazer só refazendo à mão.",
        rotuloConfirmar: "Atualizar",
      }).then(function (sim) {
        if (!sim) return;
        o.aplicar(nova);
        estado.novas = (estado.novas || []).filter(function (n) { return n !== nova; });
        pintar();
        UI.avisoOk(cp.nome + " atualizado para a versão da biblioteca.");
      });
    }
    pintar();
    return caixa;
  }

  /* v9.22: o painel na aba de uma ficha dos outros sistemas (Goblins,
     BRUTAL, Oblívio, Vampiro, Ordem II). `bloco` é a chave do bloco na
     ficha; H, o módulo de Homebrew do sistema; normalizar, o do motor.
     Atualizar muda o bloco, renormaliza (tira a cópia antiga) e grava
     pelo caminho de sempre da ficha (ctx.alterou). */
  function secaoNaFicha(no, ctx, bloco, H, normalizar) {
    var U = global.RAMAUtil, el = U.el;
    if (!no || !no.appendChild || !H || !H.copiasDaFicha || !ctx || !ctx.ficha || !ctx.ficha[bloco]) return no;
    if (!H.copiasDaFicha(ctx.ficha[bloco]).length) return no;
    no.appendChild(el("section.pilha--curta.hb-versoes-secao", { class: "pilha", "aria-label": "Homebrew desta ficha" }, [
      el("h3.t-secao", { texto: "Homebrew desta ficha" }),
      painel({
        copias: function () { return H.copiasDaFicha(ctx.ficha[bloco]); },
        carregar: function () { return H.carregarBiblioteca(true); },
        novas: function (bib) { return H.versoesNovas(ctx.ficha[bloco], bib); },
        aplicar: function (item) {
          var b = ctx.ficha[bloco];
          H.atualizarVersao(b, item);
          if (normalizar) { var n = normalizar(b); Object.keys(b).forEach(function (k) { delete b[k]; }); Object.keys(n).forEach(function (k) { b[k] = n[k]; }); }
          if (ctx.alterou) ctx.alterou();
          if (ctx.redesenhar) ctx.redesenhar();
        },
        podeEditar: !ctx.podeEditar || !!ctx.podeEditar(),
      }),
    ]));
    return no;
  }
  function comPainel(fn, bloco, modulo, motor) {
    return function (ctx) {
      var no = fn.apply(this, arguments);
      var M = global[motor];
      secaoNaFicha(no, ctx, bloco, global[modulo], M && M.normalizar ? function (b) { return M.normalizar(b); } : null);
      /* v9.35: as Ações Homebrew (Universal) da ficha, no mesmo lugar. */
      if (global.RAMAHomebrewFicha && global.RAMAHomebrewFicha.secaoAcoes) global.RAMAHomebrewFicha.secaoAcoes(no, ctx);
      return no;
    };
  }

  global.RAMAHomebrewVersoes = { trocarChave: trocarChave, painel: painel, ROTULOS: ROTULOS, secaoNaFicha: secaoNaFicha, comPainel: comPainel };
})(typeof window !== "undefined" ? window : globalThis);
