/* =====================================================================
   R.A.M.A. — Homebrew na ficha de um sistema (v9.7)
   ---------------------------------------------------------------------
   O seletor que cada ficha abre em "Do Homebrew". Lista o que esta conta
   alcança na biblioteca (as suas e as públicas) e mostra, antes de
   adicionar, o que entra e o que fica Manual:

     do próprio sistema   o objeto NATIVO (adaptador.paraFicha), passado
                          pela rotina de inserção da própria ficha
     Universal            num sistema cadastrado: item narrativo (nome e
                          descrição), com as regras marcadas como Manual
     de outro sistema     não aparece: o R.A.M.A. não converte

   É sempre uma CÓPIA: editar a biblioteca depois não muda a ficha.
   Habilidades que o motor do sistema ainda não aplica vão para as
   anotações da ficha (consulta), com o aviso.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var el = U.el;
  function A() { return global.RAMAHomebrewAdaptadores; }

  var TIPOS_POR_GRUPO = { item: ["item", "arma", "armadura", "mochila"], habilidade: ["habilidade", "ritual"] };

  function abrir(ctx, opcoes) {
    var o = opcoes || {};
    var sistema = o.sistema, grupo = o.grupo || "item";
    var corpo = el("div.pilha.hbf");
    var janela = UI.modal({ titulo: (grupo === "item" ? "Itens" : "Habilidades") + " do Homebrew", largo: true, conteudo: corpo, botoes: [{ rotulo: "Fechar", classe: "r-botao--fantasma" }] });
    var estado = { registros: null, busca: "" };
    U.trocar(corpo, UI.carregando("Consultando a biblioteca Homebrew", { forma: "lista", plana: true, retrato: false, linhas: 1, tamanho: "medio" }));
    global.RAMAApi.listarHomebrew({ escopo: "todos", tipos: TIPOS_POR_GRUPO[grupo] }).then(function (r) {
      if (!r || !r.ok) { U.trocar(corpo, UI.erroDeTela(r, function () { janela.fechar(); abrir(ctx, o); })); return; }
      estado.registros = (r.dados || []).filter(function (h) { return A().grupoDe(h) === grupo; });
      pintar();
    });

    function pintar() {
      var chave = U.chaveDeBusca(estado.busca);
      var vis = estado.registros.filter(function (h) { return !chave || U.chaveDeBusca(h.nome + " " + (h.descricao || "")).indexOf(chave) >= 0; });
      var nativos = vis.filter(function (h) { return A().destinoNaFicha(h, sistema).modo === "nativo" || (A().sistemaDe(h) === sistema && A().destinoNaFicha(h, sistema).modo === "manual"); });
      var universais = vis.filter(function (h) { return A().sistemaDe(h) === "universal" && sistema !== "universal" && A().destinoNaFicha(h, sistema).modo === "manual"; });
      var busca = el("input.r-entrada", { type: "search", value: estado.busca, placeholder: "Buscar por nome", "aria-label": "Buscar no Homebrew",
        oninput: function (ev) { estado.busca = ev.target.value; pintar(); var b = corpo.querySelector("input[type=search]"); if (b) { b.focus(); b.setSelectionRange(b.value.length, b.value.length); } } });
      U.trocar(corpo, [
        el("p.t-mini", { texto: "Entra uma CÓPIA: mudar a criação na biblioteca depois não muda esta ficha. Conteúdo de outro sistema não aparece — o R.A.M.A. não converte." }),
        el("div.r-busca", {}, [el("span.r-busca__marca", {}, [UI.simbolo("busca")]), busca]),
        secao("De " + nomeDoSistema(sistema), nativos, "Nada deste sistema na sua biblioteca nem nas públicas. Crie em Homebrew → + Criar → " + nomeDoSistema(sistema) + "."),
        sistema !== "universal" ? secao("Universal (entra com as regras marcadas como Manual)", universais, "Nenhum conteúdo Universal.") : null,
        el("p.t-mini", {}, [el("a", { href: U.url("homebrew/"), target: "_blank", rel: "noopener", texto: "Abrir o Homebrew em outra aba" })]),
      ]);
    }
    function secao(titulo, lista, vazio) {
      return el("section.hbf-secao", { "aria-label": titulo }, [el("h3.t-rotulo", { texto: titulo }),
        lista.length ? el("ul.hbf-lista", {}, lista.map(linha)) : el("p.t-mini", { texto: vazio })]);
    }
    function linha(h) {
      var destino = A().destinoNaFicha(h, sistema);
      return el("li.hbf-item", {}, [
        el("div.hbf-item__corpo", {}, [
          el("strong", { texto: h.nome }),
          el("span.t-mini", { texto: (h.modelo ? A().resumo(h) : (h.descricao || "").slice(0, 80)) + (h.meu === false ? " · pública" : "") }),
          el("span.t-mini" + (destino.modo === "manual" ? ".t-aviso" : ""), { texto: destino.texto }),
        ]),
        el("button.r-botao.r-botao--mini.r-botao--principal", {
          type: "button", texto: destino.modo === "manual" && grupo === "habilidade" ? "Adicionar às anotações" : (grupo === "item" ? "Adicionar ao inventário" : "Adicionar à ficha"),
          "aria-label": "Adicionar " + h.nome,
          onclick: function (ev) { if (ev.detail > 1) return; adicionar(h, destino, ev.currentTarget); },
        }),
      ]);
    }

    function adicionar(h, destino, botao) {
      if (!ctx.podeEditar || !ctx.podeEditar()) { UI.avisoAtencao("Esta ficha está só para leitura."); return; }
      /* Habilidade sem motor no sistema: uma nota de consulta. */
      if (grupo === "habilidade" && destino.modo === "manual") {
        var F = global.RAMAFicha;
        var linhas = [h.descricao || h.texto || ""];
        var d = (h.modelo && h.modelo.def) || {};
        var spec = A().especDoSubtipo(A().sistemaDe(h), "habilidade", A().subtipoDe(h));
        if (spec) (spec.campos || []).concat(spec.avancado || []).forEach(function (c) { if (d[c.chave] !== undefined && d[c.chave] !== "") linhas.push(c.rotulo + ": " + d[c.chave]); });
        if (!ctx.ficha.anotacoes) ctx.ficha.anotacoes = { pastas: [], soltas: [] };
        if (!Array.isArray(ctx.ficha.anotacoes.soltas)) ctx.ficha.anotacoes.soltas = [];
        ctx.ficha.anotacoes.soltas.push(F.normalizarNota({ titulo: h.nome + " (Homebrew · " + A().rotuloDoSubtipo(h) + ")", conteudo: linhas.filter(Boolean).join("\n") + "\n\nManual: habilidade só de texto (o motor de " + nomeDoSistema(sistema) + " aplica as que têm subtipo próprio)." }));
        ctx.alterou();
        if (ctx.redesenhar) ctx.redesenhar();
        UI.avisoOk(h.nome + " foi para as anotações da ficha (consulta).");
        return;
      }
      if (grupo === "habilidade") { if (o.aoAdicionarHabilidade) o.aoAdicionarHabilidade(h); return; }
      /* v9.35: Universal COM ações numa ficha de sistema: entra nas Ações
         Homebrew da ficha (o inventário comum), com as ações que rodam
         pelos recursos nativos. */
      if (A().sistemaDe(h) === "universal" && sistema !== "universal" && sistema !== "ordem" && h.universal && (h.universal.acoes || []).length && global.RAMAFicha) {
        if (!ctx.ficha.inventario) ctx.ficha.inventario = { limite: 0, itens: [] };
        var it = global.RAMAFicha.normalizarItem({ tipo: "item", nome: h.nome, descricao: h.descricao || "", universal: h.universal, origemHomebrewId: h.id });
        if (it) { ctx.ficha.inventario.itens.push(it); ctx.alterou(); if (ctx.redesenhar) ctx.redesenhar(); UI.avisoOk(h.nome + " entrou nas Ações Homebrew da ficha (as ações usam os recursos dela)."); }
        return;
      }
      var objeto = destino.modo === "nativo" ? A().paraFicha(h) : A().narrativoPara(h, sistema);
      if (!objeto) { UI.avisoErro("Este item não tem como entrar nesta ficha."); return; }
      objeto.origemHomebrewId = h.id;
      var feito = o.aoAdicionarItem ? o.aoAdicionarItem(objeto, h, destino.modo) : false;
      if (feito !== false) {
        if (botao) { botao.disabled = true; botao.textContent = "Adicionado"; setTimeout(function () { botao.disabled = false; botao.textContent = "Adicionar ao inventário"; }, 1500); }
        UI.avisoOk(h.nome + (destino.modo === "manual" ? " entrou como item narrativo (regras: Manual)." : " entrou no inventário."));
      }
    }
    return janela;
  }
  function nomeDoSistema(id) { var s = global.RAMASistemas.lista().filter(function (x) { return x.id === id; })[0]; return s ? s.nome : id; }

  /* =================================================================
     AÇÕES DO MODELO UNIVERSAL NA FICHA UNIVERSAL
     -----------------------------------------------------------------
     Um item com `universal.acoes`: o botão de cada ação, com os usos que
     restam. Usar ROLA pelo rolador do R.A.M.A., mostra o que vai mudar e
     só aplica depois da confirmação (rolar e desistir não gasta nada).
     Recurso que a ficha não tem pelo nome exato: a pessoa escolhe qual
     (nunca é adivinhado). Efeito manual ou alvo escolhido na hora: a
     rolagem aparece e o botão só marca o uso. A carga gasta fica no item
     e sobe com a ficha.
     ================================================================= */
  var emUso = {};
  function acoesDoItem(ctx, item) {
    var u = item && item.universal;
    if (!u || !Array.isArray(u.acoes) || !u.acoes.length) return null;
    var pode = ctx.podeEditar ? ctx.podeEditar() : true;
    var botoes = u.acoes.map(function (a) {
      var resto = A().usosRestantes(u, a);
      return el("button.r-botao.r-botao--mini.hbf-acao", {
        type: "button", disabled: !pode || resto === 0 || null,
        texto: a.nome + (resto === null ? "" : " (" + resto + "/" + a.usos.max + ")"),
        title: A().previaDaAcao(a), "aria-label": a.nome + " — " + A().previaDaAcao(a),
        onclick: function (ev) { usar(ctx, item, a, ev.currentTarget); },
      });
    });
    var temUsos = u.acoes.some(function (a) { return a.usos && A().usosRestantes(u, a) < a.usos.max; });
    if (temUsos && pode) botoes.push(el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Recuperar usos", onclick: function () { recuperar(ctx, item); } }));
    return el("div.faixa.hbf-acoes", {}, botoes);
  }
  function rolarDeVerdade(guardadas) {
    return function (expressao) {
      var r = global.RAMADados.total(expressao);
      if (r && r.ok) guardadas.push(r);
      return { ok: !!(r && r.ok), total: r ? r.total : 0 };
    };
  }
  /* v9.35: os recursos nativos da ficha (PV/PE/SAN, PM, Vitalidade…),
     por js/homebrew-recursos.js; sem o módulo, os da ficha Universal. */
  function Rc() { return global.RAMAHomebrewRecursos; }
  function recursosDe(ficha) { return Rc() ? Rc().recursos(ficha) : (ficha.status || []); }
  function usar(ctx, item, acao, botao, escolhas) {
    if (emUso[item.id]) return;
    /* Teste com perícia nativa à mão: pergunta antes de rolar (opcional). */
    var pers = Rc() && acao.teste && !(escolhas && escolhas.periciaPerguntada) ? Rc().pericias(ctx.ficha) : [];
    if (pers.length) { escolherPericia(ctx, item, acao, botao, escolhas, pers); return; }
    var guardadas = [];
    var res = A().executarAcao(item.universal, acao.chave, { status: recursosDe(ctx.ficha) }, rolarDeVerdade(guardadas), escolhas);
    if (!res.ok && res.manual) { escolherRecurso(ctx, item, acao, botao, res.motivo); return; }
    if (!res.ok) { UI.avisoAtencao(res.motivo); return; }
    emUso[item.id] = true;
    if (botao) botao.disabled = true;
    var linhas = res.rolagens.map(function (r) { return el("p", { texto: r.rotulo + ": " + r.expressao + " = " + r.total }); });
    res.mudancas.forEach(function (m) { linhas.push(el("p", { texto: m.nome + ": " + m.de + " → " + m.para })); });
    if (acao.usos) linhas.push(el("p.t-mini", { texto: "Gasta 1 uso (restam " + (A().usosRestantes(Object.assign({}, item.universal, { estado: res.estado }), acao)) + " de " + acao.usos.max + ")." }));
    if (res.manual) linhas.push(el("p.t-mini.t-aviso", { texto: "Manual: " + (res.texto || "aplique o efeito à mão") + (acao.alvo === "escolher" ? " (alvo escolhido na hora)" : "") + "." }));
    var aplicado = false;
    /* O id da operação nasce com a janela: confirmar de novo (clique
       duplo, resposta perdida) não aplica duas vezes onde o motor tem id. */
    var opId = "hbac-" + U.uuid().replace(/[^A-Za-z0-9]/g, "").slice(0, 24);
    UI.modal({
      titulo: item.nome + " · " + acao.nome,
      conteudo: el("div.pilha--curta", { class: "pilha" }, linhas.length ? linhas : [el("p", { texto: "Sem rolagem nem recurso: só o uso." })]),
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: res.manual && !res.mudancas.length ? "Marcar uso" : "Aplicar", classe: "r-botao--principal", aoClicar: function (fechar) {
          if (aplicado) return;
          aplicado = true;
          item.universal.estado = res.estado;
          if (res.mudancas.length) {
            var rApl = Rc() ? Rc().aplicar(ctx.ficha, res.mudancas, opId) : { ok: true };
            if (!Rc()) res.mudancas.forEach(function (m) { var s = (ctx.ficha.status || []).filter(function (x) { return x.id === m.statusId; })[0]; if (s) s.atual = m.para; });
            if (rApl && rApl.ok === false) UI.avisoAtencao(rApl.motivo || "O recurso não foi alterado.");
          }
          guardadas.forEach(function (r, i) { if (global.RAMARolagens) global.RAMARolagens.mostrar(r, { nome: item.nome + " · " + acao.nome + " (" + (res.rolagens[i] || {}).rotulo + ")", tipo: "item" }); });
          fechar();
          ctx.alterou();
          if (ctx.atualizar) ctx.atualizar(); else if (ctx.redesenhar) ctx.redesenhar();
        } },
      ],
      aoFechar: function () { delete emUso[item.id]; if (botao) botao.disabled = false; },
    });
  }
  function escolherPericia(ctx, item, acao, botao, escolhas, pers) {
    var campo = UI.campo({ rotulo: "Somar uma perícia da ficha ao teste (" + acao.teste + ")?", tipo: "selecao", opcoes: [{ valor: "", rotulo: "Não somar" }].concat(pers.map(function (p) { return { valor: p.id, rotulo: p.nome + " (" + (p.bonus >= 0 ? "+" : "") + p.bonus + ")" }; })), valor: "" });
    UI.modal({
      titulo: item.nome + " · " + acao.nome,
      conteudo: el("div.pilha", {}, [campo, el("p.t-mini", { texto: "O bônus é o desta ficha agora. A escolha é sua: o R.A.M.A. não liga a ação a uma perícia sozinho." })]),
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Rolar", classe: "r-botao--principal", aoClicar: function (fechar) {
          var p = pers.filter(function (x) { return x.id === campo.entrada.value; })[0];
          fechar();
          usar(ctx, item, acao, botao, Object.assign({}, escolhas || {}, { periciaPerguntada: true }, p ? { bonusTeste: p.bonus, rotuloTeste: p.nome } : {}));
        } },
      ],
    });
  }
  function escolherRecurso(ctx, item, acao, botao, motivo) {
    var status = recursosDe(ctx.ficha);
    if (!status.length) { UI.avisoAtencao(motivo + " " + (Rc() ? Rc().semRecursos(ctx.ficha) : "A ficha não tem recursos: aplique o efeito à mão.")); return; }
    var campo = UI.campo({ rotulo: "Qual recurso desta ficha?", tipo: "selecao", opcoes: status.map(function (s) { return { valor: s.id, rotulo: s.nome + " (" + s.atual + "/" + s.maximo + ")" }; }), valor: status[0].id });
    UI.modal({
      titulo: "Escolha o recurso",
      conteudo: el("div.pilha", {}, [el("p", { texto: motivo }), el("p.t-mini", { texto: "O R.A.M.A. não liga campos por nome parecido: a escolha é sua." }), campo]),
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Continuar", classe: "r-botao--principal", aoClicar: function (fechar) {
          var esc = { periciaPerguntada: true };
          if (acao.efeito && (acao.efeito.tipo === "recuperar" || acao.efeito.tipo === "gastar")) esc.recursoEfeito = campo.entrada.value;
          if (acao.custo && !status.some(function (s) { return s.nome.toLowerCase() === acao.custo.recurso.toLowerCase(); })) esc.recursoCusto = campo.entrada.value;
          fechar();
          usar(ctx, item, acao, botao, esc);
        } },
      ],
    });
  }
  function recuperar(ctx, item) {
    UI.confirmar({ titulo: "Recuperar os usos de " + item.nome + "?", texto: "Todos os usos voltam (use quando a mesa disser: cena, descanso…).", rotuloConfirmar: "Recuperar" }).then(function (sim) {
      if (!sim) return;
      item.universal.estado = A().recuperarUsos(item.universal, "tudo");
      ctx.alterou();
      if (ctx.atualizar) ctx.atualizar(); else if (ctx.redesenhar) ctx.redesenhar();
    });
  }
  /* Os campos próprios de um item Universal, para a consulta na ficha. */
  function camposDoItem(item) {
    var u = item && item.universal;
    if (!u || !Array.isArray(u.campos) || !u.campos.length) return [];
    return u.campos.map(function (c) {
      var v = (u.valores || {})[c.chave];
      if (v === undefined || v === "") return null;
      if (v && typeof v === "object" && !Array.isArray(v)) v = (v.atual !== undefined ? v.atual + "/" : "") + v.max;
      if (Array.isArray(v)) v = v.join(", ");
      if (v === true) v = "Sim"; if (v === false) v = "Não";
      return [c.rotulo, String(v) + (c.unidade ? " " + c.unidade : "")];
    }).filter(Boolean);
  }

  /* O botão "Do Homebrew" que cada ficha põe ao lado de "+ Item". */
  function botao(ctx, opcoes) {
    return el("button.r-botao.r-botao--fantasma.r-botao--mini.hbf-botao", { type: "button", texto: "Do Homebrew", onclick: function () { abrir(ctx, opcoes); } });
  }

  /* v9.35: as ações Universais numa ficha de SISTEMA (que não mostra o
     inventário comum): os itens Universais com ações, guardados em
     ficha.inventario.itens, num painel no fim da aba principal. */
  function itensComAcoes(ficha) { return ((ficha.inventario || {}).itens || []).filter(function (i) { return i.universal && Array.isArray(i.universal.acoes) && i.universal.acoes.length; }); }
  function secaoAcoes(no, ctx) {
    if (!no || !no.appendChild || !ctx || !ctx.ficha) return no;
    var itens = itensComAcoes(ctx.ficha);
    if (!itens.length) return no;
    var rec = recursosDe(ctx.ficha);
    no.appendChild(el("section.pilha--curta.hbf-acoes-secao", { class: "pilha", "aria-label": "Ações Homebrew" }, [
      el("h3.t-secao", { texto: "Ações Homebrew (Universal)" }),
      el("p.t-mini", { texto: rec.length ? "Custos e efeitos usam os recursos desta ficha: " + rec.map(function (r) { return r.nome + " " + r.atual + "/" + r.maximo; }).join(" · ") + "." : (Rc() ? Rc().semRecursos(ctx.ficha) : "") }),
      el("ul.hbf-lista", {}, itens.map(function (item) {
        return el("li.hbf-item", {}, [
          el("div.hbf-item__corpo", {}, [el("strong", { texto: item.nome }), item.descricao ? el("span.t-mini", { texto: item.descricao.slice(0, 160) }) : null, acoesDoItem(ctx, item)]),
          ctx.podeEditar && ctx.podeEditar() && ctx.emEdicao && ctx.emEdicao() ? el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Tirar", "aria-label": "Tirar " + item.nome, onclick: function () {
            ctx.ficha.inventario.itens = ctx.ficha.inventario.itens.filter(function (x) { return x !== item; });
            ctx.alterou(); if (ctx.redesenhar) ctx.redesenhar();
          } }) : null,
        ]);
      })),
    ]));
    return no;
  }

  global.RAMAHomebrewFicha = { abrir: abrir, botao: botao, acoesDoItem: acoesDoItem, camposDoItem: camposDoItem, secaoAcoes: secaoAcoes, itensComAcoes: itensComAcoes };
})(window);
