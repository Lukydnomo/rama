/* =====================================================================
   R.A.M.A. — Ficha de Ordem · itens do Arquivos Secretos 1
   =====================================================================
   O menu de um item do inventário ganha, quando cabe:

     · Rubra (AS1 p. 54) — usar uma dose: gasta a dose, põe o +5 e os
       PV temporários, conta os usos e mostra a DT de Vontade
     · Maledictólogo (AS1 p. 45) — transferir maldições para outro item
       ou para uma tatuagem (Compreensão de Maldições), memorizar e
       aplicar maldições (Reproduzir Maldição / Maldição Suprema)

   E o cartão do item ganha as observações: item que virou mundano em
   Transcender com Itens, tatuagem, maldição reproduzida até o fim da
   missão. A regra está em js/ordem/maldicoes.js; aqui, só tela e
   gravação. Testes, PE e Sanidade da mesa são perguntados, nunca
   rolados sem clique.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var el = U.el;

  function M() { return global.RAMAOrdemMaldicoes; }
  function R() { return global.RAMAOrdemRegras; }
  function C() { return global.RAMAOrdemCatalogo; }
  function E() { return global.RAMAOrdemProgressao; }
  function EF() { return global.RAMAOrdemEfeitos || null; }
  function I() { return global.RAMAOrdemInventario || null; }

  function dados(item) { return I() ? I().dadosDoItem(item) : ((item && item.ordem) || {}); }
  function cena(o) { return R().cenaDe ? R().cenaDe(o) : "inicial"; }

  /* O NEX que conta para a trilha Maledictólogo, ou 0 sem ela. */
  function nexDaTrilha(o) {
    var tr = C() ? C().trilha("maledictologo") : null;
    if (!tr || o.trilha !== "maledictologo" || tr.classe !== o.classe) return 0;
    return R().trilho(o).nexEquivalente;
  }

  function temSuprema(o) { return nexDaTrilha(o) >= 99; }

  function salvar(ctx, aviso) {
    ctx.alterou();
    ctx.redesenhar();
    if (aviso) UI.avisoOk(aviso, { duracao: 7000 });
  }

  function tirarItem(ctx, item) {
    ctx.ficha.inventario.itens = ctx.ficha.inventario.itens.filter(function (x) { return x !== item && x.id !== item.id; });
  }

  /* =================================================================
     O QUE APARECE NO CARTÃO DO ITEM
     ================================================================= */

  function observacoes(ctx, item) {
    var o = ctx.ficha.ordem;
    var linhas = [];
    var d = dados(item);
    var mundanos = E() && E().itensTranscendidos ? E().itensTranscendidos(o) : {};
    if (mundanos[item.id]) {
      linhas.push(["Mundano", "Usado em Transcender com Itens" + (mundanos[item.id].poder ? " (" + mundanos[item.id].poder + ")" : "") +
        ": perdeu os efeitos (Arquivos Secretos 1, p. 57)."]);
    }
    if (d.tatuagem) linhas.push(["Tatuagem", "Maldições marcadas no corpo: valem como se o item fosse usado. Uma por pessoa."]);
    var temporarias = M() ? M().temporariasDe(item) : [];
    if (temporarias.length) {
      linhas.push(["Até o fim da missão", temporarias.map(function (m) { return m.nome; }).join(", ") + " (Reproduzir Maldição)."]);
    }
    return linhas;
  }

  /* =================================================================
     O MENU DO ITEM
     ================================================================= */

  function opcoes(ctx, item) {
    if (!M()) return [];
    var o = ctx.ficha.ordem;
    var d = dados(item);
    var lista = [];
    var nex = nexDaTrilha(o);
    var maldicoes = M().maldicoesDe(item);

    if (item.origemCatalogoId === "as1.paranormal.rubra") {
      lista.push({ rotulo: "Usar uma dose de rubra…", aoClicar: function () { usarRubra(ctx, item); } });
    }
    if (d.tatuagem) {
      lista.push({ rotulo: "Destruir a tatuagem (interlúdio)…", aoClicar: function () { destruirTatuagem(ctx, item); } });
    }
    if (nex >= 40 && maldicoes.length && !d.tatuagem) {
      lista.push({ rotulo: "Compreensão de Maldições: transferir…", aoClicar: function () { transferir(ctx, item); } });
    }
    if (nex >= 65 && maldicoes.length) {
      lista.push({ rotulo: "Reproduzir Maldição: memorizar…", aoClicar: function () { memorizar(ctx, item); } });
    }
    if (nex >= 65 && (o.maldicoesMemorizadas || []).length && !d.tatuagem) {
      lista.push({ rotulo: "Reproduzir Maldição: aplicar aqui…", aoClicar: function () { aplicarMemorizada(ctx, item); } });
    }
    if (M().temporariasDe(item).length) {
      lista.push({ rotulo: "Fim da missão: tirar as maldições reproduzidas", aoClicar: function () {
        var n = M().encerrarMissao(ctx.ficha.inventario);
        salvar(ctx, n + " maldição(ões) reproduzida(s) saíram dos itens: a missão acabou.");
      } });
    }
    return lista;
  }

  /* =================================================================
     RUBRA (AS1 p. 54)
     ================================================================= */

  function usarRubra(ctx, item) {
    var o = ctx.ficha.ordem;
    var c = R().calcular(o, ctx.ficha.inventario);
    var anteriores = (o.contadores && o.contadores.rubra) || 0;
    var dt = 15 + 2 * anteriores;
    var ferido = c.atual.pv < c.pv.total;
    UI.confirmar({
      titulo: "Usar rubra",
      texto: (ferido ? "" : "A rubra precisa de uma ferida aberta (pelo menos 1 ponto de dano) — a ficha está com os PV cheios. ") +
        "Ação de movimento: a dose é gasta, +5 em testes de Força, Agilidade e Vigor e 10 PV temporários até o fim da cena. " +
        "Teste de Vontade DT " + dt + (anteriores ? " (15 + 2 × " + anteriores + " uso(s) anterior(es))" : "") + ".",
      rotuloConfirmar: "Usar a dose",
    }).then(function (ok) {
      if (!ok) return;
      var d = item.ordem || {};
      var qtd = Math.max(1, Number(d.quantidade) || 1);
      if (qtd > 1) d.quantidade = qtd - 1; else tirarItem(ctx, item);
      if (!o.contadores || typeof o.contadores !== "object") o.contadores = {};
      o.contadores.rubra = anteriores + 1;
      if (global.RAMASecaoOrigens && global.RAMASecaoOrigens.temporarioDaCena) {
        global.RAMASecaoOrigens.temporarioDaCena(o, "rubra", "pv", 10, "Rubra");
      }
      if (EF()) {
        var inst = EF().criarInstancia({
          modelo: "item:as1.paranormal.rubra", nome: "Rubra",
          descricao: "+5 em testes de Força, Agilidade e Vigor até o fim da cena. No fim da cena, sem outra dose, perde 1d3 pontos de atributos físicos (1d6 por ponto: 1–2 For, 3–4 Agi, 5–6 Vig), que voltam depois de dormir num interlúdio (Arquivos Secretos 1, p. 54).",
          origem: { tipo: "item", nome: "Rubra" },
          modificadores: [
            { alvo: "atributo:for", tipo: "bonus", valor: 5 },
            { alvo: "atributo:agi", tipo: "bonus", valor: 5 },
            { alvo: "atributo:vig", tipo: "bonus", valor: 5 },
          ],
          duracao: { tipo: "cena" }, alvoNome: ctx.ficha.nome, cena: cena(o),
        });
        var av = EF().avaliarAplicacao(o.condicoes, inst);
        EF().aplicar(o.condicoes, inst, av.ok && av.conflito ? "renovar" : "nova");
      }
      salvar(ctx);
      mostrarDepoisDaRubra(ctx, dt);
    });
  }

  function mostrarDepoisDaRubra(ctx, dt) {
    var janela = UI.modal({
      titulo: "Rubra: o teste e o fim da cena",
      conteudo: [el("div.pilha--curta", { class: "pilha" }, [
        el("p.t-mini", { texto: "Vontade DT " + dt + ". Falhando, fica insano por 1d3 rodadas, atacando os seres mais próximos; falhando por 10 ou mais, a mente é destruída pela droga." }),
        el("p.t-mini", { texto: "No fim da cena, sem outra dose: perde 1d3 pontos de atributos físicos (1d6 por ponto: 1–2 Força, 3–4 Agilidade, 5–6 Vigor), que voltam depois de dormir num interlúdio. Registre a perda como ajuste da mesa nos atributos." }),
        el("div.faixa", {}, [
          el("button.r-botao.r-botao--mini", { type: "button", texto: "Rolar Vontade",
            onclick: function () { if (global.RAMAOrdemRolarPericia) global.RAMAOrdemRolarPericia(ctx, "vontade", "Vontade · rubra (DT " + dt + ")"); } }),
          el("button.r-botao.r-botao--mini", { type: "button", texto: "Rolar a perda (1d3)",
            onclick: function () { rolarPerda(); } }),
        ]),
      ])],
      botoes: [{ rotulo: "Fechar", classe: "r-botao--principal" }],
    });
    return janela;
  }

  function rolarPerda() {
    var D = global.RAMADados;
    var n = D && D.total ? D.total("1d3") : null;
    var pontos = n && n.ok ? n.total : 1;
    var nomes = [];
    for (var i = 0; i < pontos; i++) {
      var r = D && D.total ? D.total("1d6") : null;
      var v = r && r.ok ? r.total : 1;
      nomes.push(v <= 2 ? "Força" : (v <= 4 ? "Agilidade" : "Vigor"));
    }
    UI.aviso("Rubra: perde " + pontos + " ponto(s) — " + nomes.join(", ") + ". Voltam depois de dormir numa cena de interlúdio.", { duracao: 9000 });
  }

  /* =================================================================
     COMPREENSÃO DE MALDIÇÕES — transferir (AS1 p. 45)
     ================================================================= */

  function transferir(ctx, item) {
    var o = ctx.ficha.ordem;
    /* Maldição de arma vai para arma, de proteção para proteção: só o
       mesmo tipo de item aparece (a tatuagem aceita qualquer uma). */
    var outros = ctx.ficha.inventario.itens.filter(function (x) { return x && x !== item && x.tipo === item.tipo && !dados(x).tatuagem; });
    var escolha = { destino: "tatuagem", passou: false };
    var dt = M().dtDoItem(item);
    var corpo = el("div.pilha--curta", { class: "pilha" });
    var aviso = el("p.t-erro", { hidden: true, role: "alert" });

    function pintar() {
      var nomes = M().maldicoesDe(item).map(function (m) { return m.nome; }).join(", ");
      U.trocar(corpo, [
        el("p.t-mini", { texto: "Ação de interlúdio e 3 PE de leituras e rituais de identificação. Ocultismo DT " + dt + " (10 + 5 por categoria). " +
          "Passando: perde 1d4+1 de Sanidade, as maldições (" + nomes + ") vão para outro item ou para uma tatuagem, e " + item.nome + " é consumido. " +
          "Falhando: perde 2d4+2 de Sanidade e não pode tentar de novo com este item." }),
        el("label.ordenacao", {}, [
          el("span.ordenacao__rotulo", { texto: "Para onde" }),
          el("select.r-selecao", { onchange: function (ev) { escolha.destino = ev.target.value; } },
            [el("option", { value: "tatuagem", texto: "Tatuagem no meu corpo", selected: escolha.destino === "tatuagem" })].concat(outros.map(function (x) {
              return el("option", { value: x.id, texto: x.nome, selected: escolha.destino === x.id });
            }))),
        ]),
        el("p.t-mini", { texto: "Numa tatuagem de um aliado adjacente, a transferência é feita na ficha dele." }),
        el("label.r-marca", {}, [
          el("input", { type: "checkbox", checked: escolha.passou, onchange: function (ev) { escolha.passou = ev.target.checked; } }),
          el("span", { texto: "O teste de Ocultismo passou (os 3 PE e a Sanidade são aplicados nos recursos)." }),
        ]),
        el("div.faixa", {}, [
          el("button.r-botao.r-botao--mini", { type: "button", texto: "Rolar Ocultismo",
            onclick: function () { if (global.RAMAOrdemRolarPericia) global.RAMAOrdemRolarPericia(ctx, "ocultismo", "Ocultismo · Compreensão de Maldições (DT " + dt + ")"); } }),
        ]),
        aviso,
      ]);
    }
    pintar();

    UI.modal({
      titulo: "Transferir as maldições de " + item.nome,
      conteudo: [corpo],
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Transferir", classe: "r-botao--principal", aoClicar: function (fechar) {
          if (!escolha.passou) { aviso.hidden = false; aviso.textContent = "Falta confirmar que o teste passou. Falhando, nada é transferido."; return; }
          var r;
          if (escolha.destino === "tatuagem") {
            r = M().tatuagem(item, ctx.ficha.inventario);
            if (r.ok) {
              var nova = global.RAMAFicha.criarItem("item", r.item);
              nova.adicionadoEm = U.agoraISO();
              ctx.ficha.inventario.itens.push(nova);
            }
          } else {
            var destino = outros.filter(function (x) { return x.id === escolha.destino; })[0];
            r = M().transferir(item, destino);
          }
          if (!r.ok) { aviso.hidden = false; aviso.textContent = r.motivo; return; }
          tirarItem(ctx, item);
          fechar();
          salvar(ctx, "Maldições transferidas; " + item.nome + " foi consumido. Lembre de aplicar os 3 PE e a perda de 1d4+1 de Sanidade.");
        } },
      ],
    });
  }

  function destruirTatuagem(ctx, item) {
    UI.confirmar({
      titulo: "Destruir a tatuagem?",
      texto: "Uma ação de interlúdio destrói o símbolo, e as maldições dele somem (Arquivos Secretos 1, p. 45).",
      rotuloConfirmar: "Destruir",
    }).then(function (ok) {
      if (!ok) return;
      tirarItem(ctx, item);
      salvar(ctx, "Tatuagem destruída.");
    });
  }

  /* =================================================================
     REPRODUZIR MALDIÇÃO (AS1 p. 45)
     ================================================================= */

  function memorizar(ctx, item) {
    var o = ctx.ficha.ordem;
    var lista = M().maldicoesDe(item);
    var escolhida = lista[0] ? lista[0].id : "";
    var aviso = el("p.t-erro", { hidden: true, role: "alert" });
    UI.modal({
      titulo: "Memorizar uma maldição de " + item.nome,
      conteudo: [el("div.pilha--curta", { class: "pilha" }, [
        el("p.t-mini", { texto: "Ação de interlúdio e 3 PE para memorizar uma maldição com que já lidou (Reproduzir Maldição, Arquivos Secretos 1, p. 45)." }),
        el("select.r-selecao", { "aria-label": "Maldição", onchange: function (ev) { escolhida = ev.target.value; } },
          lista.map(function (m) { return el("option", { value: m.id, texto: m.nome }); })),
        aviso,
      ])],
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Memorizar", classe: "r-botao--principal", aoClicar: function (fechar) {
          var r = M().memorizar(o, item, escolhida);
          if (!r.ok) { aviso.hidden = false; aviso.textContent = r.motivo; return; }
          fechar();
          salvar(ctx, r.registro.nome + " memorizada. Lembre de gastar os 3 PE.");
        } },
      ],
    });
  }

  function aplicarMemorizada(ctx, item) {
    var o = ctx.ficha.ordem;
    var lista = o.maldicoesMemorizadas || [];
    var estado = { id: lista[0] ? lista[0].id : "", passou: false };
    var suprema = temSuprema(o);
    var corpo = el("div.pilha--curta", { class: "pilha" });
    var aviso = el("p.t-erro", { hidden: true, role: "alert" });

    function pintar() {
      var mem = lista.filter(function (x) { return x.id === estado.id; })[0];
      var plano = M().planoDeReproducao(item, mem, suprema);
      U.trocar(corpo, [
        el("p.t-mini", { texto: "Ação de interlúdio e 3 PE. Passando, perde 1d8+1 de Sanidade e o item recebe a maldição até o fim da missão; falhando, perde 2d8+2 de Sanidade." +
          (suprema ? " Maldição Suprema: o item conta três categorias a menos." : "") }),
        el("select.r-selecao", { "aria-label": "Maldição memorizada", onchange: function (ev) { estado.id = ev.target.value; pintar(); } },
          lista.map(function (m) { return el("option", { value: m.id, texto: m.nome, selected: m.id === estado.id }); })),
        plano.ok
          ? el("p.t-mini", { texto: "Ocultismo DT " + plano.dt + ". Categoria do item: " + plano.antes + " → " + plano.depois + (suprema ? " (efetiva " + plano.efetiva + ")" : "") + "." })
          : el("p.t-mini.t-aviso", { texto: plano.motivo }),
        el("label.r-marca", {}, [
          el("input", { type: "checkbox", checked: estado.passou, onchange: function (ev) { estado.passou = ev.target.checked; } }),
          el("span", { texto: "O teste de Ocultismo passou (os 3 PE e a Sanidade são aplicados nos recursos)." }),
        ]),
        el("div.faixa", {}, [
          el("button.r-botao.r-botao--mini", { type: "button", texto: "Rolar Ocultismo",
            onclick: function () { if (global.RAMAOrdemRolarPericia) global.RAMAOrdemRolarPericia(ctx, "ocultismo", "Ocultismo · Reproduzir Maldição" + (plano.ok ? " (DT " + plano.dt + ")" : "")); } }),
        ]),
        aviso,
      ]);
    }
    pintar();

    UI.modal({
      titulo: "Reproduzir maldição em " + item.nome,
      conteudo: [corpo],
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Aplicar", classe: "r-botao--principal", aoClicar: function (fechar) {
          if (!estado.passou) { aviso.hidden = false; aviso.textContent = "Falta confirmar que o teste passou. Falhando, a maldição não é aplicada."; return; }
          var mem = lista.filter(function (x) { return x.id === estado.id; })[0];
          var r = M().reproduzir(item, mem, suprema);
          if (!r.ok) { aviso.hidden = false; aviso.textContent = r.motivo; return; }
          fechar();
          salvar(ctx, mem.nome + " aplicada em " + item.nome + " até o fim da missão. Lembre de aplicar os 3 PE e a perda de 1d8+1 de Sanidade.");
        } },
      ],
    });
  }

  global.RAMAMaldicoesDaFicha = {
    opcoes: opcoes,
    observacoes: observacoes,
  };
})(window);
