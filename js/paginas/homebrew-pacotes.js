/* =====================================================================
   R.A.M.A. — Homebrew · Pacotes (v9.6)
   ---------------------------------------------------------------------
   A terceira aba do Homebrew. Um pacote é um livrinho da mesa: várias
   criações de um sistema, com nome, descrição e capa, para compartilhar
   e deixar outra pessoa escolher o que copiar para a própria biblioteca.

     Meus pacotes / Pacotes públicos   lista com busca, filtro por
                                       sistema, vazio, carregando, erro
     + Criar pacote                    sistema, nome, descrição, capa 2:3
                                       (RAMAEditorImagem, destino
                                       "pacote"), seleção da biblioteca e
                                       a revisão antes de salvar
     Abrir com código                  colar o código: prévia, consulta e
                                       importar tudo ou parte

   O CÓDIGO vive só na memória desta página (`codigos`), nunca no
   endereço nem no armazenamento do navegador; vai no corpo de cada
   leitura e importação, e o servidor confere toda vez. As capas dos
   cartões vêm em lote, só das visíveis.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var el = U.el;
  function P() { return global.RAMAPacotesHomebrew; }
  function API() { return global.RAMAApi; }

  var sub = "meus";                       // "meus" | "publicos"
  var listas = { meus: null, publicos: null };
  var estados = { meus: "carregando", publicos: "carregando" };
  var falhas = {};
  var busca = "", sistemaFiltro = "";
  var capas = {};                         // pacoteId → data URL ("" = sem)
  var codigos = {};                       // pacoteId → código (memória)
  var selecoes = {};                      // pacoteId → { entradaId: true }
  var opsDeImportacao = {};               // pacoteId → { chave, opId } p/ reenvio
  var raiz = null, grade = null, contagem = null, opcoes = {};
  var observador = null, pendentesCapa = {}, esperaCapa = null;

  /* =================================================================
     A ABA (montada pelo homebrew.js)
     ================================================================= */
  function painel(o) {
    opcoes = o || {};
    raiz = el("div.pc-raiz");
    pintar();
    if (listas[sub] === null) carregar();
    return raiz;
  }

  /* No título da página, nada: as duas ações ficam em destaque dentro da
     aba (uma vez só). */
  function acoesDoCabecalho() { return []; }
  function acoesDaAba() {
    return [
      el("button.r-botao", { type: "button", texto: "Abrir com código", onclick: abrirComCodigo }),
      el("button.r-botao.r-botao--principal", { type: "button", texto: "+ Criar pacote", onclick: function () { editar(null); } }),
    ];
  }
  function total() { return listas[sub] ? listas[sub].length : null; }

  async function carregar() {
    var qual = sub;
    estados[qual] = "carregando";
    pintar();
    var r = await API().listarPacotes(qual);
    if (!r.ok) { estados[qual] = "erro"; falhas[qual] = r; listas[qual] = null; pintar(); return; }
    listas[qual] = r.dados || [];
    estados[qual] = "pronto";
    pintar();
    if (opcoes.aoContar) opcoes.aoContar();
  }
  function recarregarTudo() { listas.meus = null; listas.publicos = null; carregar(); }

  function pintar() {
    if (!raiz) return;
    var focado = document.activeElement && raiz.contains(document.activeElement) && document.activeElement.dataset ? document.activeElement.dataset.foco : "";
    var lista = listas[sub];
    var corpo;
    if (estados[sub] === "carregando") corpo = UI.carregando(sub === "meus" ? "Abrindo seus pacotes" : "Consultando pacotes públicos");
    else if (estados[sub] === "erro") corpo = falhas[sub] && falhas[sub].erro === "instalacao_incompleta"
      ? el("div.r-vazio", {}, [el("p.r-vazio__titulo", { texto: "Pacotes ainda não instalados no servidor" }), el("p.r-vazio__texto", { texto: "Quem administra o R.A.M.A. precisa publicar HomebrewPacotes.gs e rodar setupRama()." })])
      : UI.erroDeTela(falhas[sub], carregar);
    else if (!lista.length) corpo = vazio();
    else corpo = el("div.pc-conteudo", {}, [barra(), grade = el("div.pc-grade", { role: "list", id: "pc-grade" })]);

    U.trocar(raiz, [
      el("div.pc-destaque", {}, [
        el("div.pc-destaque__texto", {}, [
          el("p.t-secao", { texto: "Pacotes de Homebrew" }),
          el("p.t-mini", { texto: "Reúna criações de um sistema num livrinho com capa, compartilhe por código ou publique, e escolha o que copiar dos pacotes dos outros." }),
        ]),
        el("div.faixa", {}, acoesDaAba()),
      ]),
      el("div.r-abas.abas-contexto.pc-sub", { role: "tablist", "aria-label": "Pacotes" }, [["meus", "Meus pacotes"], ["publicos", "Pacotes públicos"]].map(function (x) {
        var ativo = sub === x[0];
        var n = listas[x[0]] ? listas[x[0]].length : null;
        return el("button.r-aba", {
          type: "button", role: "tab", "aria-selected": String(ativo), tabindex: ativo ? "0" : "-1", dataset: { foco: "pc-sub-" + x[0] },
          onclick: function () { if (sub !== x[0]) { sub = x[0]; busca = ""; sistemaFiltro = ""; if (listas[sub] === null) carregar(); else pintar(); } },
          onkeydown: function (ev) {
            if (ev.key !== "ArrowRight" && ev.key !== "ArrowLeft") return;
            ev.preventDefault();
            sub = sub === "meus" ? "publicos" : "meus";
            if (listas[sub] === null) carregar(); else pintar();
            var b = raiz.querySelector('[data-foco="pc-sub-' + sub + '"]'); if (b) b.focus();
          },
        }, [el("span", { texto: x[1] }), typeof n === "number" ? el("span.abas-contexto__n", { texto: " (" + n + ")" }) : null]);
      })),
      el("section.pc-painel", { role: "tabpanel", "aria-label": sub === "meus" ? "Meus pacotes" : "Pacotes públicos" }, [corpo]),
    ]);
    if (grade) pintarGrade();
    if (focado) { var a = raiz.querySelector('[data-foco="' + focado + '"]'); if (a) a.focus(); }
    if (opcoes.aoMudar) opcoes.aoMudar();
  }

  function vazio() {
    if (sub === "publicos") return UI.vazio({ titulo: "Nenhum pacote público ainda", texto: "Quando alguém publicar um pacote, ele aparece aqui. Pacotes privados só abrem com o código de quem compartilhou.", acao: { rotulo: "Abrir com código", aoClicar: abrirComCodigo } });
    return UI.vazio({ titulo: "Nenhum pacote ainda", texto: "Um pacote reúne criações da sua biblioteca — criaturas, armas, itens, rituais — de um sistema, com capa. Ele nasce privado.", acao: { rotulo: "+ Criar pacote", aoClicar: function () { editar(null); } }, acaoSecundaria: { rotulo: "Abrir com código", aoClicar: abrirComCodigo } });
  }

  function barra() {
    var sistemas = {};
    listas[sub].forEach(function (p) { sistemas[p.sistema] = true; });
    var campo = el("input.r-entrada", {
      type: "search", value: busca, placeholder: "Buscar por nome", "aria-label": "Buscar pacotes por nome", "aria-controls": "pc-grade", dataset: { foco: "pc-busca" },
      oninput: function (ev) { busca = ev.target.value; pintarGrade(); },
    });
    var seletor = el("select.r-selecao.pc-barra__sistema", {
      "aria-label": "Filtrar por sistema", dataset: { foco: "pc-sistema" },
      onchange: function (ev) { sistemaFiltro = ev.target.value; pintarGrade(); },
    }, [el("option", { value: "", texto: "Todos os sistemas" })].concat(Object.keys(sistemas).sort().map(function (s) {
      return el("option", { value: s, texto: P().nomeDoSistema(s), selected: s === sistemaFiltro });
    })));
    contagem = el("p.hb-barra__contagem", { role: "status", "aria-live": "polite" });
    return el("div.hb-barra.pc-barra", {}, [
      el("div.r-busca.hb-barra__busca", {}, [el("span.r-busca__marca", {}, [UI.simbolo("busca")]), campo]),
      seletor, contagem,
    ]);
  }

  function filtrados() {
    var chave = U.chaveDeBusca(busca);
    return (listas[sub] || []).filter(function (p) {
      if (sistemaFiltro && p.sistema !== sistemaFiltro) return false;
      return !chave || U.chaveDeBusca(p.nome).indexOf(chave) >= 0;
    });
  }

  function pintarGrade() {
    if (!grade) return;
    var v = filtrados();
    var n = (listas[sub] || []).length;
    contagem.textContent = (v.length === n ? n : v.length + " de " + n) + (n === 1 ? " pacote" : " pacotes");
    if (observador) observador.disconnect();
    U.trocar(grade, v.length ? v.map(cartao) : [el("div.r-vazio", { role: "listitem" }, [
      el("p.r-vazio__titulo", { texto: "Nenhum pacote para esses filtros" }),
      el("button.r-botao", { type: "button", texto: "Limpar filtros", onclick: function () { busca = ""; sistemaFiltro = ""; pintar(); } }),
    ])]);
    observarCapas();
  }

  /* -----------------------------------------------------------------
     O CARTÃO: um livro (capa 2:3 ou lombada neutra)
     ----------------------------------------------------------------- */
  function volume(p, tamanho) {
    var img = capas[p.id];
    var classe = "pc-volume pc-volume--" + (tamanho || "m");
    if (img) return el("span", { class: classe, "aria-hidden": "true" }, [el("img.pc-volume__imagem", { src: img, alt: "", width: 320, height: 480, decoding: "async" })]);
    return el("span", { class: classe + " pc-volume--lombada", "aria-hidden": "true", dataset: { capa: p.temCapa ? "carregando" : "sem" } }, [
      el("span.pc-volume__titulo", { texto: p.nome }),
      el("span.pc-volume__sistema", { texto: P().nomeDoSistema(p.sistema) }),
    ]);
  }
  function etiquetas(p) {
    return [
      p.meu ? el("span.r-etiqueta", { texto: p.visibilidade === "publico" ? "Público" : "Privado" }) : null,
      p.meu && p.temCodigo ? el("span.r-etiqueta", { texto: "Código ativo" }) : null,
      p.meu && p.estado !== "pronto" ? el("span.r-etiqueta.t-aviso", { texto: "Incompleto — salve de novo" }) : null,
      !p.meu && p.via === "codigo" ? el("span.r-etiqueta.r-etiqueta--para", { texto: "Aberto com código" }) : null,
    ].filter(Boolean);
  }
  function cartao(p) {
    return el("article.pc-cartao", { role: "listitem", dataset: { pacote: p.id } }, [
      el("button.pc-cartao__abrir", {
        type: "button", dataset: { foco: "pc-cartao-" + p.id },
        "aria-label": p.nome + " — " + P().nomeDoSistema(p.sistema) + ", " + p.qtd + (p.qtd === 1 ? " criação" : " criações"),
        onclick: function () { ver(p); },
      }, [
        volume(p, "m"),
        el("span.pc-cartao__nome", { texto: p.nome }),
        el("span.pc-cartao__meta", { texto: P().nomeDoSistema(p.sistema) + " · " + p.qtd + (p.qtd === 1 ? " criação" : " criações") }),
        el("span.pc-cartao__tipos.t-mini", { texto: P().resumoDosTipos(p.tipos) }),
      ]),
      el("div.pc-cartao__marcas", {}, etiquetas(p)),
    ]);
  }

  /* As capas chegam em lote, só das visíveis. */
  function observarCapas() {
    var alvos = U.$$(".pc-cartao", grade);
    if (!global.IntersectionObserver) { alvos.forEach(function (c) { pedirCapa(c.dataset.pacote); }); return; }
    observador = new IntersectionObserver(function (vistos) {
      vistos.forEach(function (v) { if (v.isIntersecting) { pedirCapa(v.target.dataset.pacote); observador.unobserve(v.target); } });
    }, { rootMargin: "200px" });
    alvos.forEach(function (c) { observador.observe(c); });
  }
  function pedirCapa(id) {
    var p = (listas[sub] || []).filter(function (x) { return x.id === id; })[0];
    if (!p || !p.temCapa || capas[id] !== undefined) return;
    pendentesCapa[id] = true;
    clearTimeout(esperaCapa);
    esperaCapa = setTimeout(buscarCapas, 120);
  }
  async function buscarCapas(ids, codigo) {
    var lote = ids || Object.keys(pendentesCapa).slice(0, 24);
    lote.forEach(function (id) { delete pendentesCapa[id]; capas[id] = capas[id] || null; });
    if (!lote.length) return;
    var r = await API().lerCapasPacotes(lote, codigo);
    if (!r.ok) { lote.forEach(function (id) { if (capas[id] === null) delete capas[id]; }); return; }
    lote.forEach(function (id) { capas[id] = (r.dados && r.dados[id]) || ""; });
    lote.forEach(function (id) {
      U.$$('[data-pacote="' + id + '"] .pc-volume', document).forEach(function (v) {
        var p = acharResumo(id);
        if (p) v.replaceWith(volume(p, v.classList.contains("pc-volume--g") ? "g" : "m"));
      });
    });
    if (Object.keys(pendentesCapa).length) buscarCapas();
  }
  function acharResumo(id) {
    return (listas.meus || []).concat(listas.publicos || []).filter(function (x) { return x.id === id; })[0] || abertos[id] || null;
  }

  /* =================================================================
     VER UM PACOTE (dono ou quem recebeu)
     ================================================================= */
  var abertos = {};   // pacoteId → dados completos da última leitura

  async function ver(resumo, pronto) {
    var codigo = codigos[resumo.id];
    var r = pronto || await API().lerPacote(resumo.id, codigo);
    if (!r.ok) {
      if (r.erro === "nao_encontrado") UI.avisoErro("Pacote não encontrado. Se você recebeu um código, use Abrir com código.");
      else UI.avisoDeFalha(r, "leitura do pacote");
      return;
    }
    abertos[r.dados.id] = r.dados;
    janelaDoPacote(r.dados);
  }

  function janelaDoPacote(p) {
    var corpo = el("div.pc-detalhe");
    var janela = UI.modal({ titulo: p.nome, largo: true, classe: "pc-janela", conteudo: corpo, botoes: [{ rotulo: "Fechar", classe: "r-botao--fantasma" }] });
    if (p.temCapa && capas[p.id] === undefined) buscarCapas([p.id], codigos[p.id]).then(function () { pintarDetalhe(); });
    var codigoRecemGerado = "";

    function pintarDetalhe() {
      var foco = document.activeElement && corpo.contains(document.activeElement) && document.activeElement.dataset ? document.activeElement.dataset.foco : "";
      U.trocar(corpo, [
        el("div.pc-detalhe__topo", { dataset: { pacote: p.id } }, [
          volume(p, "g"),
          el("div.pc-detalhe__info", {}, [
            el("div.faixa.pc-detalhe__sistema", {}, [global.RAMACapaSistema ? global.RAMACapaSistema.elemento(p.sistema, { tamanho: "p" }) : null, el("span", { texto: P().nomeDoSistema(p.sistema) })]),
            el("p.pc-detalhe__qtd", { texto: p.qtd + (p.qtd === 1 ? " criação" : " criações") + (P().resumoDosTipos(p.tipos) ? " — " + P().resumoDosTipos(p.tipos) : "") }),
            p.descricao ? el("p.pc-detalhe__descricao", { texto: p.descricao }) : el("p.t-mini", { texto: "Sem descrição." }),
            el("div.faixa", {}, etiquetas(p)),
            p.meu ? null : el("p.t-mini", { texto: "Importar cria cópias PRIVADAS e editáveis na sua biblioteca. Elas não mudam se o pacote mudar, for revogado ou excluído." }),
          ]),
        ]),
        p.meu ? acoesDoDono() : null,
        conteudoDoPacote(),
      ]);
      if (foco) { var a = corpo.querySelector('[data-foco="' + foco + '"]'); if (a) a.focus(); }
    }

    /* ---------- o dono: editar, compartilhar, excluir ---------- */
    function acoesDoDono() {
      var linhas = [];
      if (p.estado !== "pronto") linhas.push(el("p.t-mini.t-aviso", { role: "status", texto: "A última gravação não terminou: o pacote não abre para ninguém além de você até ser salvo de novo." }));
      linhas.push(el("p.t-mini", { texto: p.visibilidade === "publico"
        ? "Público: contas do R.A.M.A. acham este pacote na galeria, abrem pelo link e importam. Só você edita."
        : "Privado: só você, ou quem receber o código, abre e importa. Saber o endereço não basta." }));
      if (codigoRecemGerado) {
        linhas.push(el("div.pc-codigo", { role: "status" }, [
          el("span.t-rotulo", { texto: "Código de acesso" }),
          el("code.pc-codigo__valor", { texto: codigoRecemGerado }),
          el("button.r-botao.r-botao--mini", { type: "button", texto: "Copiar", dataset: { foco: "pc-copiar" }, onclick: function () { copiar(codigoRecemGerado, "Código copiado."); } }),
          el("p.t-mini", { texto: "O código aparece só agora: o servidor guarda apenas uma impressão irreversível (hash) dele, não o código. Se perder, gere outro (o anterior deixa de valer)." }),
        ]));
      } else if (p.temCodigo) {
        linhas.push(el("p.t-mini", { texto: "Há um código ativo" + (p.codigoEm ? " desde " + U.dataCurta(p.codigoEm) : "") + ". Ele não pode ser mostrado de novo; gere outro se precisar." }));
      }
      var botoes = [
        el("button.r-botao.r-botao--mini.r-botao--principal", { type: "button", texto: "Editar", dataset: { foco: "pc-editar" }, onclick: function () { janela.fechar(); editar(p); } }),
        el("button.r-botao.r-botao--mini", { type: "button", texto: p.temCodigo || codigoRecemGerado ? "Gerar novo código" : "Gerar código", dataset: { foco: "pc-gerar" }, onclick: function () { gerarCodigo(); } }),
        p.temCodigo || codigoRecemGerado ? el("button.r-botao.r-botao--mini", { type: "button", texto: "Revogar acesso por código", dataset: { foco: "pc-revogar" }, onclick: revogar }) : null,
        p.visibilidade === "publico" ? el("button.r-botao.r-botao--mini", { type: "button", texto: "Copiar link", onclick: function () { copiar(location.origin + location.pathname.replace(/[^/]*$/, "") + "?pacote=" + encodeURIComponent(p.id), "Link copiado. Ele abre o pacote para contas do R.A.M.A. enquanto for público."); } }) : null,
        el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Excluir pacote", onclick: excluir }),
      ];
      return el("section.pc-dono", { "aria-label": "Compartilhar e gerenciar" }, [el("h3.t-rotulo", { texto: "Compartilhar" })].concat(linhas, [el("div.faixa", {}, botoes)]));
    }
    async function gerarCodigo() {
      if (p.temCodigo || codigoRecemGerado) {
        var sim = await UI.confirmar({ titulo: "Gerar novo código?", texto: "O código atual deixa de abrir o pacote. Quem já importou continua com as cópias.", rotuloConfirmar: "Gerar novo código" });
        if (!sim) return;
      }
      var r = await API().codigoPacote(p.id, "gerar");
      if (!r.ok) { UI.avisoDeFalha(r, "geração do código"); return; }
      codigoRecemGerado = r.dados.codigo;
      p.temCodigo = true; p.codigoEm = r.dados.codigoEm;
      /* O código em claro fica só nesta janela; a lista não o guarda. */
      var semCodigo = Object.assign({}, r.dados); delete semCodigo.codigo;
      atualizarResumo(semCodigo);
      pintarDetalhe();
      var b = corpo.querySelector('[data-foco="pc-copiar"]'); if (b) b.focus();
    }
    async function revogar() {
      var sim = await UI.confirmar({ titulo: "Revogar o acesso por código?", texto: "O código para de abrir o pacote agora. As cópias que já foram importadas continuam com quem importou.", rotuloConfirmar: "Revogar", perigo: true });
      if (!sim) return;
      var r = await API().codigoPacote(p.id, "revogar");
      if (!r.ok) { UI.avisoDeFalha(r, "revogação"); return; }
      codigoRecemGerado = ""; p.temCodigo = false;
      atualizarResumo(r.dados);
      pintarDetalhe();
      UI.avisoOk("Acesso por código revogado.");
    }
    async function excluir() {
      var sim = await UI.confirmar({
        titulo: "Excluir o pacote " + p.nome + "?",
        texto: "O pacote, a capa e as cópias que estão nele saem. As criações originais da sua biblioteca não mudam.",
        detalhe: "Quem já importou continua com as cópias que fez. O código e o link deixam de abrir.",
        rotuloConfirmar: "Excluir", perigo: true,
      });
      if (!sim) return;
      var r = await API().excluirPacote(p.id);
      if (!r.ok) { UI.avisoDeFalha(r, "exclusão do pacote"); return; }
      janela.fechar();
      delete capas[p.id];
      recarregarTudo();
      UI.avisoOk("Pacote excluído.");
    }

    /* ---------- o conteúdo (com a seleção de quem importa) ---------- */
    function conteudoDoPacote() {
      var sel = selecoes[p.id] = selecoes[p.id] || {};
      Object.keys(sel).forEach(function (id) { if (!p.entradas.some(function (e) { return e.id === id && !e.importada; })) delete sel[id]; });
      var disponiveis = p.entradas.filter(function (e) { return !e.importada; });
      var nSel = Object.keys(sel).length;
      var grupos = P().agrupar(p.entradas).map(function (g) {
        return el("section.pc-grupo", { "aria-label": g.rotulo }, [
          el("h3.t-rotulo", { texto: g.rotulo + " (" + g.itens.length + ")" }),
          el("ul.pc-entradas", {}, g.itens.map(function (e) {
            var id = "pc-sel-" + e.id;
            return el("li.pc-entrada", { dataset: { importada: e.importada ? "sim" : "nao" } }, [
              p.meu ? null : el("input", {
                type: "checkbox", id: id, checked: !!sel[e.id], disabled: e.importada, dataset: { foco: id },
                onchange: function (ev) { if (ev.target.checked) sel[e.id] = true; else delete sel[e.id]; pintarDetalhe(); },
              }),
              /* v9.14: a miniatura guardada NESTA versão do pacote. */
              global.RAMAHomebrewImagem && e.temImagem ? global.RAMAHomebrewImagem.miniatura(Object.assign({}, e.dados || {}, { tipo: e.tipo, nome: e.nome }),
                { fonte: { pacote: { id: p.id, codigo: codigos[p.id] }, entradaId: e.id }, classe: "pc-entrada__imagem" }) : null,
              el(p.meu ? "span.pc-entrada__nome" : "label.pc-entrada__nome", p.meu ? { texto: e.nome } : { for: id, texto: e.nome }),
              el("span.t-mini.pc-entrada__resumo", { texto: resumoDaEntrada(e) }),
              e.importada ? el("span.r-etiqueta", { texto: "Já na sua biblioteca" }) : null,
              p.meu && e.origemMudou ? el("span.r-etiqueta.t-aviso", { texto: "Original mudou" }) : null,
              p.meu && !e.origemExiste ? el("span.r-etiqueta", { texto: "Original apagado" }) : null,
              el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Consultar", "aria-label": "Consultar " + e.nome, onclick: function () { consultar(e, p); } }),
            ]);
          })),
        ]);
      });
      /* v9.34: uma entrada escolhida que usa outra do pacote (ainda não
         escolhida nem importada): oferece incluir. */
      var faltam = [];
      Object.keys(sel).forEach(function (id) {
        var e = p.entradas.filter(function (x) { return x.id === id; })[0];
        (e && e.depende || []).forEach(function (d) {
          var de = p.entradas.filter(function (x) { return x.id === d; })[0];
          if (de && !de.importada && !sel[d] && !faltam.some(function (f) { return f.de.id === d; })) faltam.push({ por: e, de: de });
        });
      });
      var avisoDep = !p.meu && faltam.length ? el("div.pc-alerta", { role: "status" }, [
        el("p", { texto: "Algumas escolhidas usam outras criações deste pacote. Sem elas, o que depende delas fica sem efeito na sua biblioteca:" }),
        el("ul", {}, faltam.map(function (f) { return el("li", { texto: f.por.nome + " usa " + f.de.nome + " (" + P().tipo(f.de.tipo).um + ")." }); })),
        el("button.r-botao.r-botao--mini", { type: "button", texto: "Selecionar também", onclick: function () { faltam.forEach(function (f) { sel[f.de.id] = true; }); pintarDetalhe(); } }),
      ]) : null;
      var importar = p.meu ? null : el("div.pc-importar", {}, [
        avisoDep,
        el("p.t-mini", { role: "status", texto: disponiveis.length
          ? nSel + " de " + disponiveis.length + " selecionada(s)" + (p.entradas.length > disponiveis.length ? " · " + (p.entradas.length - disponiveis.length) + " já na sua biblioteca" : "")
          : "Tudo deste pacote já está na sua biblioteca." }),
        el("div.faixa", {}, [
          el("button.r-botao", { type: "button", texto: "Importar tudo", disabled: !disponiveis.length, dataset: { foco: "pc-tudo" }, onclick: function (ev) { importarEntradas(disponiveis.map(function (e) { return e.id; }), ev.currentTarget); } }),
          el("button.r-botao.r-botao--principal", { type: "button", texto: "Importar selecionadas" + (nSel ? " (" + nSel + ")" : ""), disabled: !nSel, dataset: { foco: "pc-sel" }, onclick: function (ev) { importarEntradas(Object.keys(sel), ev.currentTarget); } }),
        ]),
      ]);
      return el("div.pc-conteudo-pacote", {}, [importar, grupos]);
    }

    async function importarEntradas(ids, botao) {
      if (!ids.length) return;
      /* O mesmo opId enquanto o pedido for o mesmo: uma resposta perdida
         reenviada não duplica (o servidor reconhece pelos recibos). */
      var chave = p.rev + "|" + ids.slice().sort().join(",");
      var mem = opsDeImportacao[p.id];
      if (!mem || mem.chave !== chave) mem = opsDeImportacao[p.id] = { chave: chave, opId: "imp-" + U.uuid().replace(/[^A-Za-z0-9]/g, "").slice(0, 28) };
      var r = await UI.ocupar(botao, function () {
        return API().importarPacote({ pacoteId: p.id, codigo: codigos[p.id], rev: p.rev, opId: mem.opId, entradas: ids });
      }, { rotulo: "Importando…" });
      if (!r) return;
      if (!r.ok && r.erro === "pacote_mudou") {
        var novo = await API().lerPacote(p.id, codigos[p.id]);
        if (!novo.ok) { UI.avisoDeFalha(novo, "leitura do pacote"); return; }
        p = abertos[p.id] = novo.dados;
        pintarDetalhe();
        UI.avisoAtencao("O pacote mudou desde a prévia. Revise o conteúdo novo e confirme de novo — nada foi importado.");
        return;
      }
      if (!r.ok) {
        if (r.erro === "nao_encontrado") { janela.fechar(); UI.avisoErro("O pacote não está mais disponível para você (o código pode ter sido revogado). Nada foi importado."); return; }
        UI.avisoDeFalha(r, "importação");   // a seleção continua
        return;
      }
      delete opsDeImportacao[p.id];
      var d = r.dados;
      d.copiados.concat(d.existentes).forEach(function (x) {
        var e = p.entradas.filter(function (y) { return y.id === x.entradaId; })[0];
        if (e) e.importada = true;
        delete selecoes[p.id][x.entradaId];
      });
      pintarDetalhe();
      resultadoDaImportacao(d);
    }

    pintarDetalhe();
    return janela;
  }

  function resumoDaEntrada(e) {
    var d = e.dados || {};
    var t = P().tipo(e.tipo).um;
    if (e.tipo === "criatura") return t + " · " + P().nomeDoSistema(P().sistemaNativo(d));
    if (e.tipo === "arma") return t + (d.dano ? " · dano " + d.dano : "");
    if (e.tipo === "armadura") return t + (d.defesa ? " · Defesa " + d.defesa : "");
    if (e.tipo === "ritual") return t + [d.circulo, d.elemento].filter(Boolean).map(function (x) { return " · " + x; }).join("");
    return t;
  }
  function consultar(e, p) {
    var dados = Object.assign({}, e.dados || {}, { id: e.id, tipo: e.tipo, nome: e.nome, meu: false, visibilidade: "privado" });
    /* v9.14: a imagem é a da entrada (a cópia do pacote), nunca a original. */
    var imagemPacote = p && e.temImagem ? { pacote: { id: p.id, codigo: codigos[p.id] }, entradaId: e.id } : null;
    if (global.RAMAHomebrew && global.RAMAHomebrew.consultar) global.RAMAHomebrew.consultar(dados, { semRegistro: true, imagemPacote: imagemPacote });
  }

  function resultadoDaImportacao(d) {
    var linhas = [];
    if (d.copiados.length) linhas.push(el("p", { texto: d.copiados.length + (d.copiados.length === 1 ? " criação copiada" : " criações copiadas") + " para Minhas criações: " + d.copiados.map(function (x) { return x.nome; }).join(", ") + "." }));
    if (d.existentes.length) linhas.push(el("p", { texto: d.existentes.length + (d.existentes.length === 1 ? " já estava" : " já estavam") + " na sua biblioteca (nada foi duplicado)." }));
    if (d.falhas.length) linhas.push(el("div.pilha--curta", { class: "pilha" }, [
      el("p.t-erro", { texto: d.falhas.length + " não " + (d.falhas.length === 1 ? "entrou" : "entraram") + ":" }),
      el("ul", {}, d.falhas.map(function (f) { return el("li", { texto: (f.nome || "Entrada") + " — " + f.motivo }); })),
      el("p.t-mini", { texto: "O que entrou fica. Selecione o restante e importe de novo para retomar." }),
    ]));
    UI.modal({
      titulo: "Importação concluída",
      conteudo: el("div.pilha--curta", { class: "pilha" }, linhas.concat([el("p.t-mini", { texto: "As cópias são privadas e editáveis. Mudar ou excluir o pacote não muda o que você copiou." })])),
      botoes: [
        { rotulo: "Continuar no pacote", classe: "r-botao--fantasma" },
        { rotulo: "Ver Minhas criações", classe: "r-botao--principal", aoClicar: function (fechar) { fechar(); fecharJanelasDePacote(); if (opcoes.irParaMinhas) opcoes.irParaMinhas(); } },
      ],
    });
  }
  function fecharJanelasDePacote() {
    U.$$(".r-fundo").forEach(function (f) { if (f.querySelector(".pc-janela")) { var x = f.querySelector(".r-modal__topo .r-icone"); if (x) x.click(); } });
  }

  function atualizarResumo(d) {
    ["meus", "publicos"].forEach(function (k) {
      (listas[k] || []).forEach(function (x, i) { if (x.id === d.id) listas[k][i] = Object.assign({}, x, d); });
    });
    pintar();
  }
  async function copiar(texto, aviso) {
    try { await navigator.clipboard.writeText(texto); UI.avisoOk(aviso); }
    catch (e) { UI.pedirTexto({ titulo: "Copiar", rotulo: "Selecione e copie (Ctrl+C)", valor: texto, rotuloConfirmar: "Fechar" }); }
  }

  /* =================================================================
     ABRIR COM CÓDIGO
     ================================================================= */
  function abrirComCodigo() {
    var campo = UI.campo({ rotulo: "Código do pacote", dica: "XXXX-XXXX-XXXX-XXXX", limite: 30, autocomplete: "off",
      ajuda: "Cole o código que recebeu. Ele não fica salvo neste navegador." });
    campo.entrada.setAttribute("spellcheck", "false");
    campo.entrada.setAttribute("autocapitalize", "characters");
    UI.modal({
      titulo: "Abrir pacote com código",
      conteudo: el("div.pilha", {}, [campo]),
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Abrir", classe: "r-botao--principal", aoClicar: async function (fechar) {
          var codigo = P().formatarCodigo(campo.entrada.value);
          if (!P().codigoValido(codigo)) { campo.marcarErro("O código tem 16 letras e números (sem 0, 1, I e O)."); campo.entrada.focus(); return; }
          var r = await API().abrirPacoteComCodigo(codigo);
          if (!r.ok) {
            if (r.erro === "codigo_invalido") { campo.marcarErro("Código inválido ou sem acesso. Confira com quem compartilhou — ele pode ter sido trocado ou revogado."); campo.entrada.focus(); return; }
            UI.avisoDeFalha(r, "abertura do pacote");
            return;
          }
          codigos[r.dados.id] = codigo;
          fechar();
          abertos[r.dados.id] = r.dados;
          ver(r.dados, r);
        } },
      ],
    });
    campo.entrada.addEventListener("keydown", function (ev) {
      if (ev.key !== "Enter") return;
      ev.preventDefault();
      var b = U.$$(".r-modal__rodape .r-botao--principal").pop(); if (b) b.click();
    });
    campo.entrada.focus();
  }

  /* =================================================================
     CRIAR / EDITAR
     ================================================================= */
  async function editar(existente) {
    var bib = await API().listarHomebrew({ escopo: "meus", resumo: true });
    if (!bib.ok) { UI.avisoDeFalha(bib, "leitura da biblioteca"); return; }
    var completo = null;
    if (existente) {
      var lido = abertos[existente.id] && abertos[existente.id].entradas ? { ok: true, dados: abertos[existente.id] } : await API().lerPacote(existente.id);
      if (!lido.ok) { UI.avisoDeFalha(lido, "leitura do pacote"); return; }
      completo = lido.dados;
    }
    var biblioteca = bib.dados || [];
    var L = P().LIMITES;
    var r = {
      sistema: completo ? completo.sistema : "",
      nome: completo ? completo.nome : "",
      descricao: completo ? completo.descricao || "" : "",
      visibilidade: completo ? completo.visibilidade : "privado",
      manter: completo ? completo.entradas.map(function (e) { return e.id; }) : [],
      atualizar: {}, adicionar: {}, capaNova: null, removerCapa: false,
      passo: completo ? 3 : 1, buscaBib: "", tipoBib: "", opId: null, sujo: false,
    };
    var porEntrada = {}; (completo ? completo.entradas : []).forEach(function (e) { porEntrada[e.id] = e; });
    var corpo = el("div.pc-editor");
    var janela = UI.modal({
      titulo: completo ? "Editar pacote" : "Criar pacote",
      largo: true, classe: "pc-janela-editor", conteudo: corpo,
      podeFechar: function () {
        if (!r.sujo) return true;
        UI.confirmar({ titulo: "Descartar o rascunho?", texto: "As mudanças neste pacote ainda não foram salvas.", rotuloConfirmar: "Descartar", perigo: true })
          .then(function (sim) { if (sim) { r.sujo = false; janela.fechar(); } });
        return false;
      },
    });

    function mudou() { r.sujo = true; r.opId = null; pintarEditor(); }
    function capaAtual() {
      if (r.capaNova) return r.capaNova;
      if (r.removerCapa || !completo) return "";
      return capas[completo.id] || "";
    }
    function entradasFinais() {
      var mantidas = r.manter.map(function (id) { return { chave: "e:" + id, entrada: porEntrada[id], tipo: porEntrada[id].tipo, nome: porEntrada[id].nome }; });
      var origens = {}; r.manter.forEach(function (id) { if (porEntrada[id].origemId) origens[porEntrada[id].origemId] = true; });
      var novas = biblioteca.filter(function (h) { return r.adicionar[h.id] && !origens[h.id]; }).map(function (h) { return { chave: "h:" + h.id, registro: h, tipo: h.tipo, nome: h.nome }; });
      return mantidas.concat(novas);
    }
    function problemasDeCompatibilidade() {
      if (!r.sistema) return [];
      return entradasFinais().map(function (x) {
        var reg = x.registro || Object.assign({ tipo: x.tipo }, x.entrada.dados);
        var c = P().compatibilidade(reg, r.sistema);
        return c.ok ? null : { nome: x.nome, motivo: c.motivo };
      }).filter(Boolean);
    }

    function pintarEditor() {
      var foco = document.activeElement && corpo.contains(document.activeElement) && document.activeElement.dataset ? document.activeElement.dataset.foco : "";
      var passos = [[1, "Sistema e capa"], [2, "Conteúdo"], [3, "Revisão"]];
      U.trocar(corpo, [
        el("ol.pc-passos", { "aria-label": "Etapas" }, passos.map(function (x) {
          return el("li", {}, [el("button.pc-passo", {
            type: "button", "aria-current": r.passo === x[0] ? "step" : null, dataset: { foco: "pc-passo-" + x[0] },
            disabled: x[0] > 1 && !r.sistema,
            onclick: function () { if (x[0] > 1 && !validarPasso1()) return; r.passo = x[0]; pintarEditor(); },
          }, [el("span.pc-passo__n", { texto: String(x[0]) }), el("span", { texto: x[1] })])]);
        })),
        r.passo === 1 ? passo1() : r.passo === 2 ? passo2() : passo3(),
        el("div.faixa.pc-editor__rodape", {}, [
          r.passo > 1 ? el("button.r-botao.r-botao--fantasma", { type: "button", texto: "Voltar", dataset: { foco: "pc-voltar" }, onclick: function () { r.passo--; pintarEditor(); } }) : null,
          r.passo < 3 ? el("button.r-botao.r-botao--principal", { type: "button", texto: "Continuar", dataset: { foco: "pc-continuar" }, onclick: function () { if (r.passo === 1 && !validarPasso1()) return; r.passo++; pintarEditor(); } }) : null,
          r.passo === 3 ? el("button.r-botao.r-botao--principal", { type: "button", texto: r.visibilidade === "publico" ? "Salvar e publicar" : "Salvar pacote", dataset: { foco: "pc-salvar" }, onclick: function (ev) { salvar(ev.currentTarget); } }) : null,
        ]),
      ]);
      if (foco) { var a = corpo.querySelector('[data-foco="' + foco + '"]'); if (a) a.focus(); }
    }
    var avisoPasso1 = "";
    function validarPasso1() {
      if (!r.sistema) { avisoPasso1 = "Escolha o sistema do pacote."; r.passo = 1; pintarEditor(); return false; }
      if (!U.aparar(r.nome)) { avisoPasso1 = "Dê um nome ao pacote."; r.passo = 1; pintarEditor(); var n = corpo.querySelector("#pc-nome"); if (n) n.focus(); return false; }
      avisoPasso1 = "";
      return true;
    }

    /* ---------- 1. sistema, nome, descrição e capa ---------- */
    function passo1() {
      var Capa = global.RAMACapaSistema;
      var sistemas = global.RAMASistemas.lista();
      var nome = el("input.r-entrada", { id: "pc-nome", value: r.nome, maxlength: L.nome, dataset: { foco: "pc-nome" }, oninput: function (ev) { r.nome = ev.target.value; r.sujo = true; r.opId = null; contNome.textContent = r.nome.length + "/" + L.nome; } });
      var contNome = el("span.t-mini", { texto: r.nome.length + "/" + L.nome });
      var desc = el("textarea.r-area", { id: "pc-desc", rows: 4, maxlength: L.descricao, dataset: { foco: "pc-desc" }, oninput: function (ev) { r.descricao = ev.target.value; r.sujo = true; r.opId = null; contDesc.textContent = r.descricao.length + "/" + L.descricao; } });
      desc.value = r.descricao;
      var contDesc = el("span.t-mini", { texto: r.descricao.length + "/" + L.descricao });
      var img = capaAtual();
      return el("div.pc-editor__passo", {}, [
        avisoPasso1 ? el("p.t-erro", { role: "alert", texto: avisoPasso1 }) : null,
        el("fieldset.pc-sistemas", {}, [
          el("legend.t-rotulo", { texto: "Sistema" }),
          el("div.hb-sistemas", { role: "radiogroup", "aria-label": "Sistema do pacote" }, sistemas.map(function (s) {
            return el("button.hb-sistemas__opcao.pc-sistema", {
              type: "button", role: "radio", "aria-checked": String(r.sistema === s.id), dataset: { sistema: s.id, foco: "pc-sis-" + s.id },
              onclick: function () { r.sistema = s.id; mudou(); },
            }, [Capa ? Capa.elemento(s, { tamanho: "p" }) : null, el("span.hb-sistemas__textos", {}, [el("span.hb-sistemas__nome", { texto: s.nome })])]);
          })),
          completo && r.sistema !== completo.sistema ? el("p.t-mini.t-aviso", { texto: "Trocar o sistema confere de novo cada entrada: o que não couber no sistema novo precisa sair antes de salvar." }) : null,
        ]),
        el("div.r-campo", {}, [el("label", { for: "pc-nome", texto: "Nome do pacote" }), nome, contNome]),
        el("div.r-campo", {}, [el("label", { for: "pc-desc", texto: "Descrição" }), desc, contDesc]),
        el("div.pc-capa-editor", {}, [
          el("span.t-rotulo", { texto: "Capa (opcional)" }),
          el("div.pc-capa-editor__corpo", {}, [
            img ? el("span.pc-volume.pc-volume--m", {}, [el("img.pc-volume__imagem", { src: img, alt: "Capa escolhida", width: 320, height: 480 })])
              : el("span.pc-volume.pc-volume--m.pc-volume--lombada", { "aria-label": "Sem capa: lombada com nome e sistema" }, [el("span.pc-volume__titulo", { texto: r.nome || "Sem nome" }), el("span.pc-volume__sistema", { texto: r.sistema ? P().nomeDoSistema(r.sistema) : "Sistema" })]),
            el("div.pilha--curta", { class: "pilha" }, [
              el("p.t-mini", { texto: "A moldura é a mesma das capas dos sistemas (2:3). A capa é recortada e gravada com 320 × 480 px; sem capa, o pacote aparece como uma lombada com o nome e o sistema." }),
              el("div.faixa", {}, [
                el("button.r-botao.r-botao--mini", { type: "button", texto: img ? "Trocar capa" : "Adicionar capa", dataset: { foco: "pc-capa" }, onclick: escolherCapa }),
                img ? el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Remover capa", dataset: { foco: "pc-capa-remover" }, onclick: function () { r.capaNova = null; r.removerCapa = true; mudou(); var b = corpo.querySelector('[data-foco="pc-capa"]'); if (b) b.focus(); } }) : null,
              ]),
            ]),
          ]),
        ]),
      ]);
    }
    async function escolherCapa() {
      var res = await global.RAMAEditorImagem.escolher("pacote");
      /* Cancelar o recorte não mexe no rascunho nem na capa anterior. */
      if (!res || !res.ok) return;
      r.capaNova = res.imagem; r.removerCapa = false;
      mudou();
      /* O formulário foi redesenhado: o foco volta ao botão da capa. */
      var b = corpo.querySelector('[data-foco="pc-capa"]'); if (b) b.focus();
    }

    /* ---------- 2. conteúdo: o que já está + a biblioteca ---------- */
    function passo2() {
      var finais = entradasFinais();
      var origens = {}; r.manter.forEach(function (id) { if (porEntrada[id].origemId) origens[porEntrada[id].origemId] = true; });
      var tiposPresentes = {}; biblioteca.forEach(function (h) { tiposPresentes[h.tipo] = true; });
      var campoBusca = el("input.r-entrada", { type: "search", value: r.buscaBib, placeholder: "Buscar na sua biblioteca", "aria-label": "Buscar na sua biblioteca", dataset: { foco: "pc-bib-busca" },
        oninput: function (ev) { r.buscaBib = ev.target.value; pintarLista(); } });
      var lista = el("ul.pc-bib", { "aria-label": "Sua biblioteca" });
      function pintarLista() {
        var ch = U.chaveDeBusca(r.buscaBib);
        var vis = biblioteca.filter(function (h) { return (!r.tipoBib || h.tipo === r.tipoBib) && (!ch || U.chaveDeBusca(h.nome).indexOf(ch) >= 0); });
        U.trocar(lista, vis.length ? vis.map(linhaBib) : [el("li.t-mini", { texto: biblioteca.length ? "Nada com esse filtro." : "Sua biblioteca está vazia: crie algo em Minhas criações primeiro." })]);
      }
      function linhaBib(h) {
        var c = r.sistema ? P().compatibilidade(h, r.sistema) : { ok: true };
        var noPacote = !!origens[h.id];
        var id = "pc-bib-" + h.id;
        var cheio = finais.length >= L.entradas && !r.adicionar[h.id];
        return el("li.pc-bib__item", { dataset: { estado: !c.ok ? "indisponivel" : noPacote ? "no-pacote" : r.adicionar[h.id] ? "selecionado" : "livre" } }, [
          el("input", { type: "checkbox", id: id, checked: noPacote || !!r.adicionar[h.id], disabled: !c.ok || noPacote || cheio, dataset: { foco: id },
            onchange: function (ev) { if (ev.target.checked) r.adicionar[h.id] = true; else delete r.adicionar[h.id]; mudou(); } }),
          el("label.pc-bib__nome", { for: id, texto: h.nome }),
          el("span.t-mini", { texto: P().tipo(h.tipo).um + (h.tipo === "criatura" ? " · " + P().nomeDoSistema(P().sistemaNativo(h)) : "") + (h.visibilidade === "publico" ? " · pública" : " · privada") }),
          noPacote ? el("span.r-etiqueta", { texto: "Já no pacote" }) : null,
          !c.ok ? el("span.t-mini.pc-bib__motivo", { texto: "Indisponível: " + c.motivo }) : null,
        ]);
      }
      pintarLista();
      /* v9.34: o que entra no pacote e usa outra criação sua que não entra. */
      var noPacote = finais.map(function (x) { return x.registro || null; }).filter(Boolean);
      var idsNoPacote = {}; noPacote.forEach(function (h) { idsNoPacote[h.id] = true; }); Object.keys(origens).forEach(function (k) { idsNoPacote[k] = true; });
      var faltamDep = [];
      noPacote.forEach(function (h) {
        P().dependencias(h, biblioteca).forEach(function (d) {
          if (!idsNoPacote[d.id] && !faltamDep.some(function (f) { return f.de.id === d.id; })) faltamDep.push({ por: h, de: d });
        });
      });
      var avisoDep = faltamDep.length ? el("div.pc-alerta", { role: "status" }, [
        el("p", { texto: "Estas criações usam outras suas que não estão no pacote. Quem importar fica sem elas (o que depende delas fica sem efeito):" }),
        el("ul", {}, faltamDep.map(function (f) { return el("li", { texto: f.por.nome + " usa " + f.de.nome + " (" + P().tipo(f.de.tipo).um + ")" + (r.sistema && !P().compatibilidade(f.de, r.sistema).ok ? " — não cabe neste pacote" : "") + "." }); })),
        el("button.r-botao.r-botao--mini", { type: "button", texto: "Incluir as que faltam", onclick: function () { faltamDep.forEach(function (f) { if (!r.sistema || P().compatibilidade(f.de, r.sistema).ok) r.adicionar[f.de.id] = true; }); mudou(); } }),
      ]) : null;
      return el("div.pc-editor__passo.pc-editor__conteudo", {}, [
        avisoDep,
        el("p.t-mini", { texto: "Cada criação entra como CÓPIA de agora: editar ou apagar o original depois não muda o pacote. Até " + L.entradas + " criações por pacote." }),
        el("p.pc-contador", { role: "status", texto: finais.length + " de " + L.entradas + " no pacote" + (Object.keys(r.adicionar).length ? " · " + Object.keys(r.adicionar).length + " nova(s) selecionada(s)" : "") }),
        r.manter.length ? el("section.pc-grupo", { "aria-label": "Já no pacote" }, [
          el("h3.t-rotulo", { texto: "Já no pacote" }),
          el("ul.pc-entradas", {}, r.manter.map(function (id) {
            var e = porEntrada[id];
            return el("li.pc-entrada", {}, [
              el("span.pc-entrada__nome", { texto: e.nome }),
              el("span.t-mini", { texto: resumoDaEntrada(e) }),
              e.origemMudou ? el("label.r-marca.pc-atualizar", {}, [el("input", { type: "checkbox", checked: !!r.atualizar[id], onchange: function (ev) { if (ev.target.checked) r.atualizar[id] = true; else delete r.atualizar[id]; mudou(); } }), el("span", { texto: "Atualizar pela criação original" })]) : null,
              !e.origemExiste ? el("span.t-mini", { texto: "Original apagado: fica a cópia de " + U.dataCurta(e.copiadoEm) + "." }) : null,
              el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Remover", "aria-label": "Remover " + e.nome + " do pacote", onclick: function () { r.manter = r.manter.filter(function (x) { return x !== id; }); delete r.atualizar[id]; mudou(); } }),
            ]);
          })),
        ]) : null,
        el("section.pc-grupo", { "aria-label": "Adicionar da biblioteca" }, [
          el("h3.t-rotulo", { texto: "Adicionar da sua biblioteca" }),
          el("div.hb-barra", {}, [
            el("div.r-busca.hb-barra__busca", {}, [el("span.r-busca__marca", {}, [UI.simbolo("busca")]), campoBusca]),
            el("div.filtros__grupo", { role: "group", "aria-label": "Filtrar por tipo" }, [{ chave: "", rotulo: "Tudo" }].concat(P().TIPOS.filter(function (t) { return tiposPresentes[t.chave]; })).map(function (t) {
              return el("button.filtro", { type: "button", "aria-pressed": String(r.tipoBib === t.chave), texto: t.rotulo, dataset: { foco: "pc-tipo-" + t.chave }, onclick: function () { r.tipoBib = t.chave; pintarEditor(); } });
            })),
          ]),
          lista,
        ]),
      ]);
    }

    /* ---------- 3. revisão: a prévia, a visibilidade e salvar ---------- */
    function passo3() {
      var finais = entradasFinais();
      var problemas = problemasDeCompatibilidade();
      var img = capaAtual();
      var previa = { id: completo ? completo.id : "novo", nome: r.nome || "Sem nome", sistema: r.sistema, temCapa: !!img };
      return el("div.pc-editor__passo", {}, [
        el("div.pc-detalhe__topo.pc-previa", {}, [
          img ? el("span.pc-volume.pc-volume--g", {}, [el("img.pc-volume__imagem", { src: img, alt: "Capa do pacote", width: 320, height: 480 })]) : volume(previa, "g"),
          el("div.pc-detalhe__info", {}, [
            el("p.t-rotulo", { texto: "Prévia" }),
            el("p.t-secao", { texto: r.nome || "Sem nome" }),
            el("div.faixa.pc-detalhe__sistema", {}, [global.RAMACapaSistema && r.sistema ? global.RAMACapaSistema.elemento(r.sistema, { tamanho: "p" }) : null, el("span", { texto: r.sistema ? P().nomeDoSistema(r.sistema) : "Sem sistema" })]),
            r.descricao ? el("p.pc-detalhe__descricao", { texto: r.descricao }) : el("p.t-mini", { texto: "Sem descrição." }),
            el("p.t-mini", { texto: finais.length + " de " + L.entradas + " criações" }),
          ]),
        ]),
        problemas.length ? el("div.pc-alerta", { role: "alert" }, [
          el("p", { texto: "Estas entradas não cabem num pacote de " + P().nomeDoSistema(r.sistema) + ". Remova-as ou troque o sistema:" }),
          el("ul", {}, problemas.map(function (x) { return el("li", { texto: x.nome + " — " + x.motivo }); })),
        ]) : null,
        P().agrupar(finais).map(function (g) {
          return el("section.pc-grupo", { "aria-label": g.rotulo }, [
            el("h3.t-rotulo", { texto: g.rotulo + " (" + g.itens.length + ")" }),
            el("ul.pc-entradas", {}, g.itens.map(function (x) {
              return el("li.pc-entrada", {}, [
                el("span.pc-entrada__nome", { texto: x.nome }),
                x.entrada && r.atualizar[x.entrada.id] ? el("span.r-etiqueta", { texto: "será atualizada" }) : null,
                x.registro ? el("span.r-etiqueta", { texto: "nova" }) : null,
                el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Remover", "aria-label": "Remover " + x.nome, onclick: function () {
                  if (x.entrada) { r.manter = r.manter.filter(function (id) { return id !== x.entrada.id; }); delete r.atualizar[x.entrada.id]; }
                  else delete r.adicionar[x.registro.id];
                  mudou();
                } }),
              ]);
            })),
          ]);
        }),
        !finais.length ? el("p.t-erro", { texto: "Um pacote precisa de ao menos uma criação. Volte a Conteúdo." }) : null,
        el("fieldset.pc-visibilidade", {}, [
          el("legend.t-rotulo", { texto: "Visibilidade" }),
          el("div.filtros__grupo", { role: "radiogroup", "aria-label": "Visibilidade" }, [["privado", "Privado"], ["publico", "Público"]].map(function (x) {
            return el("button.filtro", { type: "button", role: "radio", "aria-checked": String(r.visibilidade === x[0]), "aria-pressed": String(r.visibilidade === x[0]), texto: x[1], dataset: { foco: "pc-vis-" + x[0] }, onclick: function () { r.visibilidade = x[0]; mudou(); } });
          })),
          el("p.t-mini", { texto: r.visibilidade === "publico"
            ? "Público: contas do R.A.M.A. acham o pacote na galeria, abrem pelo link e importam. Só você edita, muda a visibilidade ou exclui."
            : "Privado: só você, ou quem receber o código que você gerar, abre e importa." + (completo && completo.visibilidade === "publico" ? " Voltar a privado fecha o link e invalida o código antigo." : "") }),
          el("p.t-mini.pc-aviso-copias", { texto: "Atenção: colocar uma criação no pacote não muda a visibilidade dela na sua biblioteca, mas quem puder abrir o pacote verá e poderá importar a cópia de tudo o que está nele — inclusive de criações que são privadas na biblioteca." }),
        ]),
        el("p.t-mini", { texto: "Limites: até " + L.entradas + " criações por pacote e " + L.pacotes + " pacotes por conta; nome até " + L.nome + " caracteres, descrição até " + L.descricao + "." }),
      ]);
    }

    async function salvar(botao) {
      if (!validarPasso1()) return;
      var finais = entradasFinais();
      if (!finais.length) { UI.avisoErro("Um pacote precisa de ao menos uma criação."); r.passo = 2; pintarEditor(); return; }
      if (problemasDeCompatibilidade().length) { UI.avisoErro("Há entradas que não cabem no sistema escolhido."); return; }
      if (!r.opId) r.opId = "pac-" + U.uuid().replace(/[^A-Za-z0-9]/g, "").slice(0, 28);
      var corpoPedido = {
        pacoteId: completo ? completo.id : undefined, rev: completo ? completo.rev : 0, opId: r.opId,
        dados: { sistema: r.sistema, nome: U.aparar(r.nome), descricao: r.descricao, visibilidade: r.visibilidade },
        conteudo: { manter: r.manter.slice(), adicionar: Object.keys(r.adicionar), atualizar: Object.keys(r.atualizar).filter(function (id) { return r.manter.indexOf(id) >= 0; }) },
      };
      if (r.capaNova) corpoPedido.capa = { acao: "trocar", imagem: r.capaNova };
      else if (r.removerCapa) corpoPedido.capa = { acao: "remover" };
      var resp = await UI.ocupar(botao, function () { return API().salvarPacote(corpoPedido); }, { rotulo: "Salvando…" });
      if (!resp) return;
      if (!resp.ok) {
        /* O rascunho continua aberto, com o mesmo opId (um reenvio não duplica). */
        if (resp.erro === "conflito") { r.opId = null; UI.avisoErro("Este pacote foi salvo em outra aba depois que você abriu o editor. Feche, abra de novo e refaça a mudança."); return; }
        if (resp.erro === "incompativel") { r.opId = null; UI.avisoErro("Não cabem no sistema: " + (resp.itens || []).map(function (x) { return x.nome; }).join(", ") + "."); return; }
        if (resp.erro === "limite") { r.opId = null; UI.avisoErro(resp.detalhe === "entradas" ? "Até " + L.entradas + " criações por pacote." : "Você chegou ao limite de " + L.pacotes + " pacotes. Exclua um para criar outro."); return; }
        if (resp.erro === "nao_encontrado") { r.opId = null; UI.avisoErro("Uma criação escolhida não está mais na sua biblioteca. Revise o conteúdo."); return; }
        UI.avisoDeFalha(resp, "gravação do pacote");
        return;
      }
      r.sujo = false;
      if (r.capaNova) capas[resp.dados.id] = r.capaNova;
      else if (r.removerCapa) capas[resp.dados.id] = "";
      janela.fechar();
      sub = "meus"; recarregarTudo();
      UI.avisoOk(completo ? "Pacote atualizado." : "Pacote criado — privado. Gere um código para compartilhar.");
      var lido = await API().lerPacote(resp.dados.id);
      if (lido.ok) { abertos[lido.dados.id] = lido.dados; janelaDoPacote(lido.dados); }
    }

    pintarEditor();
    var primeiro = corpo.querySelector(r.passo === 1 ? ".pc-sistema" : ".pc-passo");
    if (primeiro) primeiro.focus();
  }

  /* O link direto (?pacote=id): abre se a conta alcança; senão, a mesma
     mensagem de "não encontrado" — um privado não se revela. */
  function abrirPorLink(id) {
    if (!id) return;
    ver({ id: id });
  }

  global.RAMAHomebrewPacotes = {
    painel: painel, acoesDoCabecalho: acoesDoCabecalho, total: total, abrirPorLink: abrirPorLink,
    recarregar: recarregarTudo, abrirComCodigo: abrirComCodigo, criar: function () { editar(null); },
  };
})(window);
