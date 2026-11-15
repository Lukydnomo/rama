/* =====================================================================
   R.A.M.A. — Homebrew · criar por sistema (v9.7)
   ---------------------------------------------------------------------
   + Criar abre primeiro o SISTEMA (pelas capas; Universal como opção de
   primeira classe) e depois os TIPOS daquele sistema em cartões. O
   editor é guiado pelo adaptador (js/homebrew-adaptadores.js):

     Nome · Tipo de item (ou de habilidade) · os campos essenciais
     Opções avançadas (recolhidas)
     Universal: campos próprios e ações (Adicionar campo / ação) sob
     demanda — o Básico basta para guardar descrição e rolagem

   Tudo num RASCUNHO: trocar o tipo não apaga o que já foi preenchido
   (mas só os campos do tipo escolhido são gravados), um erro ao salvar
   não fecha a janela, e fechar com mudanças pede confirmação. O resumo
   ao lado mostra o que entra na ficha e o que fica Manual.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var el = U.el;
  function A() { return global.RAMAHomebrewAdaptadores; }
  function S() { return global.RAMASistemas; }

  var AJUDA_UNIVERSAL = "Crie com campos e regras da sua mesa";

  /* =================================================================
     1. O SISTEMA, 2. O TIPO
     ================================================================= */
  function criar(opcoes) {
    var o = opcoes || {};
    var corpo = el("div.pilha.hbe-criar");
    var janela = UI.modal({ titulo: "Criar na biblioteca", largo: true, conteudo: corpo });
    var sistema = null;

    function sistemas() {
      var lista = S().lista().filter(function (s) { return A().adaptador(s.id); });
      var uni = lista.filter(function (s) { return s.id === "universal"; });
      return uni.concat(lista.filter(function (s) { return s.id !== "universal"; }));
    }
    function passoSistema() {
      var Capa = global.RAMACapaSistema;
      U.trocar(corpo, [
        el("p.t-mini", { texto: "Primeiro, o sistema: cada um tem os campos e as regras que as fichas dele usam." }),
        o.sistemaSugerido && A().adaptador(o.sistemaSugerido) ? el("p.t-mini", { texto: "Sugerido pelo filtro da biblioteca: " + nome(o.sistemaSugerido) + ". Dá para escolher outro." }) : null,
        el("div.hb-sistemas", { role: "list", "aria-label": "Sistema" }, sistemas().map(function (s) {
          var universal = s.id === "universal";
          return el("button.hb-sistemas__opcao.hbe-sistema", {
            type: "button", role: "listitem", dataset: { sistema: s.id, sugerido: o.sistemaSugerido === s.id ? "sim" : "nao" },
            onclick: function () { sistema = s.id; passoTipo(); },
          }, [
            Capa ? Capa.elemento(s, { tamanho: "p" }) : null,
            el("span.hb-sistemas__textos", {}, [
              el("span.hb-sistemas__nome", { texto: s.nome }),
              el("span.t-mini", { texto: universal ? AJUDA_UNIVERSAL + ": campos próprios, ações, rolagens e recursos — para jogos com regras próprias e conteúdo que circula entre sistemas." : resumoDosTipos(s.id) }),
            ]),
          ]);
        })),
      ]);
      var foco = corpo.querySelector('[data-sugerido="sim"]') || corpo.querySelector(".hbe-sistema");
      if (foco) foco.focus();
    }
    function resumoDosTipos(id) { return A().adaptador(id).tipos.map(function (t) { return t.rotulo; }).join(" · "); }

    function passoTipo() {
      var ad = A().adaptador(sistema);
      var cartoes = [];
      ad.tipos.forEach(function (t) {
        /* v9.14: Tormenta20 — Magia (o editor de campos), Poder (editor próprio) e habilidade de texto. */
        if (t.chave === "habilidade" && sistema === "tormenta20") {
          cartoes.push(cartao("Habilidade → Magia", "Círculo, escola, execução, alcance e, se quiser, dano, cura e resistência. A ficha aprende e lança.", function () { janela.fechar(); editor({ sistema: sistema, grupo: "habilidade", subtipo: "magia", aoSalvar: o.aoSalvar }); }));
          cartoes.push(cartao("Habilidade → Poder", "Poder geral ou da Tormenta, com efeitos, ativação (PM) e nível mínimo. Entra ao subir de nível e como poder avulso.", function () { janela.fechar(); if (global.RAMAHomebrewT20Estruturais) global.RAMAHomebrewT20Estruturais.poder({ aoSalvar: o.aoSalvar }); }));
          cartoes.push(cartao("Habilidade (só texto)", "Para consulta e anotações.", function () { janela.fechar(); editor({ sistema: sistema, grupo: "habilidade", subtipo: "habilidade", aoSalvar: o.aoSalvar }); }));
          return;
        }
        if (t.chave === "habilidade" && sistema === "ordem") {
          cartoes.push(cartao("Habilidade / poder", "Poderes e habilidades, com cor e origem.", function () { janela.fechar(); if (o.editarHabilidadeLegada) o.editarHabilidadeLegada(); }));
          cartoes.push(cartao("Habilidade → Ritual", "O editor de rituais: círculo, elemento(s), conjuração e versões. Na ficha, entra na aba Rituais.", function () { janela.fechar(); if (o.editarRitual) o.editarRitual(); }));
          return;
        }
        cartoes.push(cartao(t.rotulo, t.ajuda, function () {
          janela.fechar();
          if (t.chave === "criatura") { if (o.editarCriatura) o.editarCriatura(sistema); return; }
          if (t.chave === "classe" && sistema === "tormenta20") { if (global.RAMAHomebrewClasseT20) global.RAMAHomebrewClasseT20.editor({ aoSalvar: o.aoSalvar }); return; }
          if (t.chave === "classe") { if (global.RAMAHomebrewClasse) global.RAMAHomebrewClasse.editor({ aoSalvar: o.aoSalvar }); return; }
          if (t.chave === "elemento") { editor({ sistema: sistema, grupo: "estrutural", subtipo: "elemento", aoSalvar: o.aoSalvar }); return; }
          if (sistema === "ordem2" && (t.chave === "perfil" || t.chave === "ocupacao") && global.RAMAHomebrewOrdem2) { global.RAMAHomebrewOrdem2[t.chave]({ aoSalvar: o.aoSalvar }); return; }
          if (sistema === "vampiro" && ["cla", "predador", "disciplina", "vantagem", "defeito", "conhecimento"].indexOf(t.chave) >= 0 && global.RAMAHomebrewVampiro) { global.RAMAHomebrewVampiro[t.chave]({ aoSalvar: o.aoSalvar }); return; }
          if (sistema === "oblivio" && ["papel", "motivacao", "mazela", "fardo"].indexOf(t.chave) >= 0 && global.RAMAHomebrewOblivio) { global.RAMAHomebrewOblivio[t.chave]({ aoSalvar: o.aoSalvar }); return; }
          if (sistema === "brutal" && (t.chave === "arquetipo" || t.chave === "estilo") && global.RAMAHomebrewBrutal) { global.RAMAHomebrewBrutal[t.chave]({ aoSalvar: o.aoSalvar }); return; }
          if (sistema === "goblins" && (t.chave === "ocupacao" || t.chave === "descritor") && global.RAMAHomebrewGoblins) { global.RAMAHomebrewGoblins[t.chave]({ aoSalvar: o.aoSalvar }); return; }
          if (sistema === "tormenta20" && (t.chave === "origem" || t.chave === "divindade") && global.RAMAHomebrewT20Estruturais) { global.RAMAHomebrewT20Estruturais[t.chave]({ aoSalvar: o.aoSalvar }); return; }
          if (sistema === "ordem" && (t.chave === "origem" || t.chave === "trilha") && global.RAMAHomebrewOrigemTrilha) { global.RAMAHomebrewOrigemTrilha[t.chave]({ aoSalvar: o.aoSalvar }); return; }
          if (t.chave === "raca" && global.RAMAHomebrewRacaT20) { global.RAMAHomebrewRacaT20.editor({ aoSalvar: o.aoSalvar }); return; }
          if (t.chave === "ritual") { if (o.editarRitual) o.editarRitual(); return; }
          editor({ sistema: sistema, grupo: t.chave, aoSalvar: o.aoSalvar });
        }));
      });
      if (sistema === "universal") {
        A().MODELOS_UNIVERSAIS.filter(function (m) { return ["arquetipo", "elemento", "branco"].indexOf(m.chave) >= 0; }).forEach(function (m) {
          cartoes.push(cartao(m.rotulo, m.ajuda, function () {
            janela.fechar();
            var campos = (m.campos || []).map(function (c) { return { rotulo: c[1], tipo: c[2], chave: c[0] }; });
            editor({ sistema: "universal", grupo: m.grupo, aoSalvar: o.aoSalvar, universal: { rotuloTipo: m.chave === "branco" ? "" : m.rotulo.split(" (")[0], campos: campos, valores: {}, acoes: [] }, avancadoAberto: m.chave === "branco" });
          }));
        });
      }
      U.trocar(corpo, [
        el("div.faixa", {}, [
          el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "← Trocar o sistema", onclick: passoSistema }),
          el("span.t-rotulo", { texto: nome(sistema) }),
        ]),
        el("div.hbe-tipos", { role: "list", "aria-label": "Tipos de " + nome(sistema) }, cartoes),
        sistema !== "universal" && sistema !== "tormenta20" && sistema !== "ordem" ? el("p.t-mini", { texto: "Os tipos estruturais deste sistema (clã, papel, arquétipo…) chegam numa próxima etapa do Homebrew por sistema." }) : null,
      ]);
      var b = corpo.querySelector(".hbe-tipo"); if (b) b.focus();
    }
    function cartao(rotulo, ajuda, aoClicar) {
      return el("button.r-botao.r-botao--bloco.hbe-tipo", { type: "button", role: "listitem", onclick: aoClicar }, [el("span.t-secao", { texto: rotulo }), el("span.t-mini", { texto: ajuda })]);
    }
    passoSistema();
    return janela;
  }
  function nome(id) { var s = S().lista().filter(function (x) { return x.id === id; })[0]; return s ? s.nome : id; }

  /* =================================================================
     O EDITOR
     ================================================================= */
  function editor(opcoes) {
    var o = opcoes || {};
    var reg = o.registro || null;
    var sistema = reg ? A().sistemaDe(reg) : o.sistema;
    var grupo = reg ? A().grupoDe(reg) : o.grupo;
    var subs = A().subtipos(sistema, grupo);
    /* Tipos estruturais não se trocam entre si (Elemento não vira Classe). */
    if (grupo === "estrutural") { var fixo = reg ? A().subtipoDe(reg) : o.subtipo; subs = subs.filter(function (s) { return s.chave === fixo; }); }
    else if (grupo === "habilidade" && o.subtipo && !reg) subs = subs.filter(function (s) { return s.chave === o.subtipo; });
    if (!subs.length) { UI.avisoErro("Este tipo não tem editor neste sistema."); return null; }
    var r = {
      nome: reg ? reg.nome : "",
      descricao: reg ? (reg.descricao || reg.texto || "") : "",
      origem: reg ? (reg.origem || "") : "",
      visibilidade: reg ? (reg.visibilidade || "privado") : "privado",
      subtipo: reg ? A().subtipoDe(reg) : (o.subtipo || subs[0].chave),
      valores: reg && reg.modelo ? JSON.parse(JSON.stringify(reg.modelo.def || {})) : {},
      universal: sistema === "universal" ? JSON.parse(JSON.stringify((reg && reg.universal) || o.universal || { campos: [], valores: {}, acoes: [] })) : null,
      avancado: !!o.avancadoAberto, erros: {}, sujo: false,
      /* O que a PESSOA preencheu (os padrões de um tipo não contam no
         aviso de "campos de outro tipo"). */
      tocados: {},
    };
    if (reg && reg.modelo) Object.keys(reg.modelo.def || {}).forEach(function (k) { r.tocados[k] = true; });
    if (!subs.some(function (s) { return s.chave === r.subtipo; })) r.subtipo = subs[0].chave;
    /* Os padrões do subtipo entram uma vez, sem sobrescrever. */
    function aplicarPadroes() {
      var spec = A().especDoSubtipo(sistema, grupo, r.subtipo);
      (spec.campos || []).concat(spec.avancado || []).forEach(function (c) { if (r.valores[c.chave] === undefined && c.padrao !== undefined) r.valores[c.chave] = c.padrao; });
    }
    aplicarPadroes();

    var form = el("div.hbe-form");
    var lado = el("aside.hbe-lado", { "aria-label": "Resumo" });
    var titulo = (reg ? "Editar " : "Novo · ") + (grupo === "item" ? "item" : grupo === "estrutural" ? subs[0].rotulo.toLowerCase() : "habilidade") + " · " + nome(sistema);
    var janela = UI.modal({
      titulo: titulo, largo: true, classe: "hbe-janela",
      conteudo: el("div.hbe-grade", {}, [form, lado]),
      podeFechar: function () {
        if (!r.sujo) return true;
        UI.confirmar({ titulo: "Descartar o rascunho?", texto: "As mudanças ainda não foram salvas.", rotuloConfirmar: "Descartar", perigo: true }).then(function (s) { if (s) { r.sujo = false; janela.fechar(); } });
        return false;
      },
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: reg ? "Salvar" : "Criar", classe: "r-botao--principal", aoClicar: salvar },
      ],
    });

    function mudou(repintar) { r.sujo = true; if (repintar) pintar(); else pintarLado(); }

    function pintar() {
      var foco = document.activeElement && form.contains(document.activeElement) ? document.activeElement.id : "";
      var spec = A().especDoSubtipo(sistema, grupo, r.subtipo);
      var idNome = "hbe-nome";
      var nomeEl = el("input.r-entrada", { id: idNome, value: r.nome, maxlength: 120, oninput: function (ev) { r.nome = ev.target.value; delete r.erros.nome; mudou(); } });
      var subSel = el("select.r-selecao", { id: "hbe-subtipo", onchange: function (ev) { r.subtipo = ev.target.value; aplicarPadroes(); mudou(true); } },
        subs.map(function (s) { return el("option", { value: s.chave, texto: s.rotulo, selected: s.chave === r.subtipo }); }));
      U.trocar(form, [
        el("div.faixa.hbe-sistema-sel", {}, [global.RAMACapaSistema ? global.RAMACapaSistema.elemento(sistema, { tamanho: "p" }) : null, el("span", { texto: nome(sistema) })]),
        el("div.r-campo", {}, [el("label", { for: idNome, texto: "Nome" }), nomeEl, erro("nome")]),
        subs.length > 1 ? el("div.r-campo", {}, [el("label", { for: "hbe-subtipo", texto: grupo === "item" ? "Tipo de item" : "Tipo de habilidade" }), subSel,
          el("p.r-ajuda", { texto: grupo === "item" ? "O tipo decide os campos. Trocar não apaga o que você já preencheu; só o tipo escolhido é gravado." : "Cada sistema usa o próprio nome (Magia, Disciplina, Vantagem…)." })]) : null,
        el("div.hbe-campos", {}, (spec.campos || []).map(controle)),
        (spec.avancado || []).length ? el("details.hbe-avancado", { open: r.avancado || null, ontoggle: function (ev) { r.avancado = ev.target.open; } }, [
          el("summary", { texto: "Opções avançadas" }), el("div.hbe-campos", {}, spec.avancado.map(controle)),
        ]) : null,
        grupo === "habilidade" && (sistema === "universal") ? el("div.r-campo", {}, [el("label", { for: "hbe-origem", texto: "Origem" }), el("input.r-entrada", { id: "hbe-origem", value: r.origem, maxlength: 60, oninput: function (ev) { r.origem = ev.target.value; mudou(); } })]) : null,
        el("div.r-campo", {}, [el("label", { for: "hbe-desc", texto: grupo === "habilidade" ? "Texto" : (sistema === "brutal" ? "O que este item significa" : "Descrição") }),
          (function () { var t = el("textarea.r-area", { id: "hbe-desc", rows: 4, maxlength: 2000, oninput: function (ev) { r.descricao = ev.target.value; mudou(); } }); t.value = r.descricao; return t; })()]),
        r.universal ? blocoUniversal() : null,
        el("div.r-campo", {}, [el("span.r-rotulo", { texto: "Visibilidade" }), el("div.filtros__grupo", { role: "group", "aria-label": "Visibilidade" }, [["privado", "Privado"], ["publico", "Público"]].map(function (x) {
          return el("button.filtro", { type: "button", id: "hbe-vis-" + x[0], "aria-pressed": String(r.visibilidade === x[0]), texto: x[1], onclick: function () { r.visibilidade = x[0]; mudou(true); } });
        })), el("p.r-ajuda", { texto: "Público: outras contas acham e copiam. Publicar não coloca nada nas fichas de ninguém." })]),
      ]);
      pintarLado();
      if (foco) { var f = document.getElementById(foco); if (f) f.focus(); }
    }
    function erro(chave) { return r.erros[chave] ? el("p.r-ajuda.r-ajuda--erro", { role: "alert", texto: r.erros[chave] }) : null; }
    function ajudaDe(c) { return [c.unidade ? "em " + c.unidade : "", c.exemplo ? "ex.: " + c.exemplo : "", c.ajuda || ""].filter(Boolean).join(" · "); }
    function controle(c) {
      var id = "hbe-c-" + c.chave, v = r.valores[c.chave];
      var entrada;
      var ao = function (valor) { r.valores[c.chave] = valor; r.tocados[c.chave] = true; delete r.erros[c.chave]; mudou(); };
      var EL = global.RAMAOrdemElementos;
      if (c.tipo === "cor") {
        entrada = el("input.r-entrada.hbe-cor", { id: id, type: "color", value: /^#[0-9a-f]{6}$/i.test(String(v || "")) ? v : "#5c7c8a", oninput: function (ev) { ao(ev.target.value); } });
      } else if (c.tipo === "elemento") {
        var opsEl = (EL ? EL.paraSelecao() : []).concat([{ chave: "varia", nome: "Varia" }]);
        entrada = el("select.r-selecao", { id: id, onchange: function (ev) { ao(ev.target.value); } }, [el("option", { value: "", texto: "—" })].concat(opsEl.map(function (e) { return el("option", { value: e.chave, texto: e.nome + (e.oficial === false ? " (Homebrew)" : ""), selected: e.chave === v }); })));
      } else if (c.tipo === "elementos") {
        var marcados = Array.isArray(v) ? v : [];
        var proprio = r.valores && r.valores.chave;
        return el("fieldset.r-campo.hbe-elementos", {}, [el("legend.r-rotulo", { texto: c.rotulo })].concat((EL ? EL.paraSelecao() : []).filter(function (e) { return e.chave !== proprio; }).map(function (e) {
          return el("label.r-marca", {}, [el("input", { type: "checkbox", checked: marcados.indexOf(e.chave) >= 0, onchange: function (ev) { var l = (Array.isArray(r.valores[c.chave]) ? r.valores[c.chave] : []).filter(function (k) { return k !== e.chave; }); if (ev.target.checked) l.push(e.chave); ao(l); } }), el("span", { texto: e.nome })]);
        })).concat([c.ajuda ? el("p.r-ajuda", { texto: c.ajuda }) : null]));
      } else if (c.tipo === "selecao") {
        entrada = el("select.r-selecao", { id: id, onchange: function (ev) { var op = c.opcoes.filter(function (x) { return String(x.valor) === ev.target.value; })[0]; ao(op ? op.valor : ev.target.value); } },
          (c.obrigatorio && v === undefined ? [el("option", { value: "", texto: "Escolha…" })] : []).concat(c.opcoes.map(function (op) { return el("option", { value: String(op.valor), texto: op.rotulo, selected: String(op.valor) === String(v) }); })));
      } else if (c.tipo === "booleano") {
        return el("label.r-marca.hbe-bool", {}, [el("input", { type: "checkbox", id: id, checked: v === true, onchange: function (ev) { ao(ev.target.checked); } }), el("span", { texto: c.rotulo })]);
      } else if (c.tipo === "area") {
        entrada = el("textarea.r-area", { id: id, rows: 3, maxlength: c.limite || 2000, oninput: function (ev) { ao(ev.target.value); } }); entrada.value = v || "";
      } else {
        entrada = el("input.r-entrada" + (c.tipo === "numero" ? ".r-entrada--numero" : ""), {
          id: id, value: v === undefined || v === null ? "" : String(v), inputmode: c.tipo === "numero" ? "decimal" : null,
          maxlength: c.tipo === "numero" ? 10 : (c.limite || 120), placeholder: c.exemplo || null,
          oninput: function (ev) { var t = ev.target.value; ao(c.tipo === "numero" ? (t === "" ? "" : t.replace(",", ".")) : t); },
        });
      }
      var aj = ajudaDe(c);
      return el("div.r-campo", {}, [el("label", { for: id, texto: c.rotulo + (c.obrigatorio ? " *" : "") }), entrada, aj ? el("p.r-ajuda", { texto: aj }) : null, erro(c.chave)]);
    }

    /* ---------- Universal: campos e ações sob demanda ---------- */
    function blocoUniversal() {
      var u = r.universal;
      return el("section.hbe-universal", { "aria-label": "Modelo Universal" }, [
        el("div.r-campo", {}, [el("label", { for: "hbe-rotulo-tipo", texto: "Rótulo do tipo (opcional)" }), el("input.r-entrada", { id: "hbe-rotulo-tipo", value: u.rotuloTipo || "", maxlength: 40, placeholder: "ex.: Poção, Talento, Implante", oninput: function (ev) { u.rotuloTipo = ev.target.value; mudou(); } })]),
        el("h3.t-rotulo", { texto: "Campos próprios" }),
        u.campos.length ? el("ul.hbe-lista", {}, u.campos.map(linhaCampo)) : el("p.t-mini", { texto: "Nenhum campo próprio. O básico (nome, tipo, descrição) já basta para guardar." }),
        el("button.r-botao.r-botao--mini", { type: "button", id: "hbe-add-campo", texto: "+ Adicionar campo", onclick: function () { formCampo(null); } }),
        el("h3.t-rotulo", { texto: "Ações e automação" }),
        u.acoes.length ? el("ul.hbe-lista", {}, u.acoes.map(linhaAcao)) : el("p.t-mini", { texto: "Nenhuma ação. Adicione uma para usar o item na ficha Universal: usos, custo, teste e efeito." }),
        el("button.r-botao.r-botao--mini", { type: "button", id: "hbe-add-acao", texto: "+ Adicionar ação", onclick: function () { formAcao(null); } }),
      ]);
    }
    function linhaCampo(c, i) {
      var u = r.universal;
      var tipoNome = (A().TIPOS_CAMPO.filter(function (t) { return t.valor === c.tipo; })[0] || {}).rotulo;
      return el("li.hbe-item", {}, [
        el("div.hbe-item__corpo", {}, [el("strong", { texto: c.rotulo }), el("span.t-mini", { texto: " · " + tipoNome + " · chave " + c.chave }), valorDoCampo(c)]),
        el("div.faixa", {}, [
          el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "↑", "aria-label": "Subir " + c.rotulo, disabled: i === 0, onclick: function () { mover(u.campos, i, -1); } }),
          el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "↓", "aria-label": "Descer " + c.rotulo, disabled: i === u.campos.length - 1, onclick: function () { mover(u.campos, i, 1); } }),
          el("button.r-botao.r-botao--mini", { type: "button", texto: "Renomear", "aria-label": "Renomear " + c.rotulo, onclick: function () { UI.pedirTexto({ titulo: "Renomear campo", rotulo: "Nome do campo", valor: c.rotulo, limite: 60, ajuda: "A chave (" + c.chave + ") não muda: o que já usa o campo continua apontando para ele." }).then(function (n) { if (n) { c.rotulo = n; mudou(true); } }); } }),
          el("button.r-botao.r-botao--mini", { type: "button", texto: "Duplicar", onclick: function () { var usadas = {}; u.campos.forEach(function (x) { usadas[x.chave] = true; }); var d = JSON.parse(JSON.stringify(c)); d.rotulo = c.rotulo + " (cópia)"; d.chave = A().chaveDe(d.rotulo, usadas); u.campos.splice(i + 1, 0, d); mudou(true); } }),
          el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Remover", "aria-label": "Remover " + c.rotulo, onclick: function () { UI.confirmar({ titulo: "Remover o campo " + c.rotulo + "?", texto: "O valor preenchido sai junto.", rotuloConfirmar: "Remover", perigo: true }).then(function (s) { if (s) { u.campos.splice(i, 1); delete u.valores[c.chave]; mudou(true); } }); } }),
        ]),
      ]);
    }
    function valorDoCampo(c) {
      var u = r.universal, v = u.valores[c.chave], id = "hbe-u-" + c.chave;
      var ao = function (x) { u.valores[c.chave] = x; mudou(); };
      var rot = el("label.t-mini", { for: id, texto: "Valor" });
      if (c.tipo === "booleano") return el("label.r-marca", {}, [el("input", { type: "checkbox", id: id, checked: v === true, onchange: function (ev) { ao(ev.target.checked); } }), el("span", { texto: "Sim" })]);
      if (c.tipo === "opcoes") return el("div.r-campo", {}, [rot, el("select.r-selecao", { id: id, onchange: function (ev) { ao(ev.target.value); } }, [el("option", { value: "", texto: "—" })].concat((c.opcoes || []).map(function (op) { return el("option", { value: op, texto: op, selected: op === v }); })))]);
      if (c.tipo === "referencias") return el("div.hbe-refs", { role: "group", "aria-label": c.rotulo }, (c.opcoes || []).map(function (op, k) { var sel = Array.isArray(v) && v.indexOf(op) >= 0; return el("label.r-marca", {}, [el("input", { type: "checkbox", checked: sel, onchange: function (ev) { var l = Array.isArray(u.valores[c.chave]) ? u.valores[c.chave].slice() : []; if (ev.target.checked) l.push(op); else l = l.filter(function (x) { return x !== op; }); ao(l); } }), el("span", { texto: op })]); }));
      if (c.tipo === "recurso") { var rv = v && typeof v === "object" ? v : { atual: 0, max: 0 }; return el("div.faixa", {}, [el("label.t-mini", { for: id + "-max", texto: "Máximo" }), el("input.r-entrada.r-entrada--numero", { id: id + "-max", value: String(rv.max), inputmode: "numeric", maxlength: 4, oninput: function (ev) { ao({ atual: rv.atual, max: Number(ev.target.value) || 0 }); } })]); }
      if (c.tipo === "area") { var t = el("textarea.r-area", { id: id, rows: 2, oninput: function (ev) { ao(ev.target.value); } }); t.value = v || ""; return el("div.r-campo", {}, [rot, t]); }
      return el("div.r-campo", {}, [rot, el("input.r-entrada", { id: id, value: v === undefined ? "" : String(v), placeholder: c.tipo === "dado" ? "ex.: 2d6+1" : (c.unidade ? c.unidade : ""), oninput: function (ev) { ao(c.tipo === "numero" ? ev.target.value.replace(",", ".") : ev.target.value); } })]);
    }
    function mover(l, i, d) { var x = l.splice(i, 1)[0]; l.splice(i + d, 0, x); mudou(true); }
    function formCampo() {
      var rot = UI.campo({ rotulo: "Nome do campo", limite: 60, dica: "ex.: Raridade" });
      var tipo = UI.campo({ rotulo: "Tipo", tipo: "selecao", opcoes: A().TIPOS_CAMPO, valor: "texto" });
      var ops = UI.campo({ rotulo: "Opções (separadas por vírgula)", limite: 600, dica: "comum, rara, lendária", ajuda: "Para Lista de opções e Lista de referências." });
      var faixa = UI.campo({ rotulo: "Faixa e unidade (números)", limite: 40, dica: "0-10 kg", ajuda: "Opcional: mínimo-máximo e a unidade." });
      UI.modal({ titulo: "Adicionar campo", conteudo: el("div.pilha", {}, [rot, tipo, ops, faixa]), botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Adicionar", classe: "r-botao--principal", aoClicar: function (f) {
          var n = rot.entrada.value.trim(); if (!n) { rot.marcarErro("Dê um nome ao campo."); return; }
          var u = r.universal, usadas = {}; u.campos.forEach(function (x) { usadas[x.chave] = true; });
          var c = { rotulo: n, tipo: tipo.entrada.value, chave: A().chaveDe(n, usadas) };
          if (c.tipo === "opcoes" || c.tipo === "referencias") c.opcoes = ops.entrada.value.split(",").map(function (x) { return x.trim(); }).filter(Boolean);
          var m = /^\s*(-?\d+(?:[.,]\d+)?)\s*-\s*(-?\d+(?:[.,]\d+)?)\s*(.*)$/.exec(faixa.entrada.value);
          if (c.tipo === "numero" && m) { c.min = Number(m[1].replace(",", ".")); c.max = Number(m[2].replace(",", ".")); if (m[3]) c.unidade = m[3].trim(); }
          u.campos.push(c); f(); mudou(true);
          var b = document.getElementById("hbe-add-campo"); if (b) b.focus();
        } },
      ] });
      rot.entrada.focus();
    }
    function linhaAcao(a, i) {
      var u = r.universal;
      return el("li.hbe-item", {}, [
        el("div.hbe-item__corpo", {}, [el("span", { texto: A().previaDaAcao(a) })]),
        el("div.faixa", {}, [
          el("button.r-botao.r-botao--mini", { type: "button", texto: "Editar", "aria-label": "Editar a ação " + a.nome, onclick: function () { formAcao(i); } }),
          el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Remover", "aria-label": "Remover a ação " + a.nome, onclick: function () { u.acoes.splice(i, 1); mudou(true); } }),
        ]),
      ]);
    }
    function formAcao(indice) {
      var u = r.universal;
      var a = indice === null ? { nome: "Usar", usos: null, custo: null, teste: "", efeito: { tipo: "recuperar", recurso: "", expressao: "", texto: "" }, alvo: "proprio" } : JSON.parse(JSON.stringify(u.acoes[indice]));
      var nomeA = UI.campo({ rotulo: "Nome da ação", valor: a.nome, limite: 60 });
      var usos = UI.campo({ rotulo: "Usos / cargas (vazio = sem limite)", valor: a.usos ? String(a.usos.max) : "", tipo: "numero", dica: "2" });
      var rec = UI.campo({ rotulo: "Os usos voltam", tipo: "selecao", opcoes: A().RECUPERACOES, valor: a.usos ? a.usos.recuperacao : "manual", ajuda: "Na ficha Universal há um botão para recuperar; por cena ou descanso, quando a ficha tiver o gatilho." });
      var custoR = UI.campo({ rotulo: "Custo: recurso (vazio = sem custo)", valor: a.custo ? a.custo.recurso : "", limite: 60, dica: "Esforço" });
      var custoQ = UI.campo({ rotulo: "Custo: quantidade", valor: a.custo ? String(a.custo.quantidade) : "1", tipo: "numero" });
      var teste = UI.campo({ rotulo: "Teste (fórmula de dado, opcional)", valor: a.teste, limite: 40, dica: "1d20+3", ajuda: "O rolador soma dados e números (ex.: 2d6+1). Nada de código." });
      var efTipo = UI.campo({ rotulo: "Efeito", tipo: "selecao", opcoes: A().EFEITOS, valor: a.efeito.tipo });
      var efRec = UI.campo({ rotulo: "Recurso do efeito", valor: a.efeito.recurso, limite: 60, dica: "Vida", ajuda: "Na ficha, escolhido pelo nome exato; se não existir, a ficha pergunta (nunca adivinha)." });
      var efExp = UI.campo({ rotulo: "Quanto (fórmula de dado)", valor: a.efeito.expressao, limite: 40, dica: "1d6" });
      var efTxt = UI.campo({ rotulo: "Descrição do efeito", valor: a.efeito.texto, tipo: "area", limite: 400 });
      var alvo = UI.campo({ rotulo: "Alvo", tipo: "selecao", opcoes: A().ALVOS, valor: a.alvo });
      var previa = el("p.t-mini.hbe-previa", { role: "status" });
      function coletar() {
        var n = Number(usos.entrada.value);
        return { chave: a.chave, nome: nomeA.entrada.value.trim() || "Usar", usos: n > 0 ? { max: n, recuperacao: rec.entrada.value } : null,
          custo: custoR.entrada.value.trim() ? { recurso: custoR.entrada.value.trim(), quantidade: Number(custoQ.entrada.value) || 1 } : null,
          teste: teste.entrada.value.trim(), efeito: { tipo: efTipo.entrada.value, recurso: efRec.entrada.value.trim(), expressao: efExp.entrada.value.trim(), texto: efTxt.entrada.value.trim() }, alvo: alvo.entrada.value };
      }
      function atualizarPrevia() {
        var b = coletar(), x = A().normalizarAcao(b);
        teste.marcarErro(b.teste && !x.teste ? "Fórmula inválida. Use dados e números, como 1d20+3." : "");
        efExp.marcarErro(b.efeito.expressao && !x.efeito.expressao ? "Fórmula inválida. Use dados e números, como 1d6." : "");
        var exemplo = "";
        if ((x.efeito.tipo === "recuperar" || x.efeito.tipo === "gastar") && x.efeito.recurso) {
          var ficha = { status: [{ id: "ex", nome: x.efeito.recurso, atual: 3, maximo: 10 }].concat(x.custo && x.custo.recurso !== x.efeito.recurso ? [{ id: "ec", nome: x.custo.recurso, atual: 5, maximo: 5 }] : []) };
          var res = A().executarAcao({ acoes: [x] }, x.chave, ficha, function (e) { var t = global.RAMADados.total(e); return { ok: t.ok, total: t.total }; });
          if (res.ok) exemplo = " Exemplo: " + res.rolagens.map(function (q) { return q.expressao + " = " + q.total; }).join(", ") + (res.mudancas.length ? "; " + res.mudancas.map(function (m) { return m.nome + " " + m.de + " → " + m.para; }).join(", ") : "") + ".";
        }
        previa.textContent = "Prévia: " + A().previaDaAcao(x) + exemplo;
      }
      [nomeA, usos, rec, custoR, custoQ, teste, efTipo, efRec, efExp, efTxt, alvo].forEach(function (c) { c.entrada.addEventListener("input", atualizarPrevia); c.entrada.addEventListener("change", atualizarPrevia); });
      UI.modal({ titulo: indice === null ? "Adicionar ação" : "Editar ação", largo: true, conteudo: el("div.pilha", {}, [nomeA, el("div.editar-grade", {}, [usos, rec]), el("div.editar-grade", {}, [custoR, custoQ]), teste, el("div.editar-grade", {}, [efTipo, alvo]), el("div.editar-grade", {}, [efRec, efExp]), efTxt, previa]), botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: indice === null ? "Adicionar" : "Salvar ação", classe: "r-botao--principal", aoClicar: function (f) {
          var b = coletar(), x = A().normalizarAcao(b);
          if ((b.teste && !x.teste) || (b.efeito.expressao && !x.efeito.expressao)) { atualizarPrevia(); return; }
          if (indice === null) u.acoes.push(x); else u.acoes[indice] = x;
          f(); mudou(true);
          var bt = document.getElementById("hbe-add-acao"); if (bt) bt.focus();
        } },
      ] });
      atualizarPrevia();
      nomeA.entrada.focus();
    }

    /* ---------- o resumo ao lado ---------- */
    function previaDoRegistro() {
      var g = A().guardar(sistema, grupo, r.subtipo, { nome: r.nome || "Sem nome", descricao: r.descricao, origem: r.origem, valores: r.valores, universal: r.universal });
      return g.ok ? g.registro : null;
    }
    function pintarLado() {
      var prev = previaDoRegistro();
      var spec = A().especDoSubtipo(sistema, grupo, r.subtipo);
      var proprios = {}; (spec.campos || []).concat(spec.avancado || []).forEach(function (c) { proprios[c.chave] = true; });
      var deOutroTipo = Object.keys(r.valores).filter(function (k) { return r.tocados[k] && !proprios[k] && r.valores[k] !== "" && r.valores[k] !== undefined && r.valores[k] !== null; });
      var destino = prev ? A().destinoNaFicha(prev, sistema) : null;
      var automatico = [], manual = [];
      if (destino && destino.modo === "nativo") automatico.push(destino.texto); else if (destino) manual.push(destino.texto);
      if (r.universal) r.universal.acoes.forEach(function (a) { var x = A().normalizarAcao(a); (x.efeito.tipo === "manual" || x.alvo === "escolher" ? manual : automatico).push(A().previaDaAcao(x)); });
      U.trocar(lado, [
        el("p.t-rotulo", { texto: "Revisão" }),
        el("p.t-secao", { texto: r.nome || "Sem nome" }),
        el("p.t-mini", { texto: nome(sistema) + " · " + (r.universal && r.universal.rotuloTipo ? r.universal.rotuloTipo : (spec ? spec.rotulo : "")) }),
        prev ? el("p", { texto: A().resumo(prev) }) : el("p.t-mini.t-aviso", { texto: "Confira os campos obrigatórios." }),
        automatico.length ? el("div", {}, [el("p.t-rotulo", { texto: "Automático" }), el("ul.hbe-mini", {}, automatico.map(function (x) { return el("li", { texto: x }); }))]) : null,
        manual.length ? el("div", {}, [el("p.t-rotulo", { texto: "Manual / decisão da mesa" }), el("ul.hbe-mini", {}, manual.map(function (x) { return el("li", { texto: x }); }))]) : null,
        deOutroTipo.length ? el("p.t-mini.t-aviso", { texto: deOutroTipo.length + " campo(s) preenchido(s) de outro tipo ficam só no rascunho e não valem para " + spec.rotulo + "." }) : null,
      ]);
    }

    async function salvar(fechar) {
      var g = A().guardar(sistema, grupo, r.subtipo, { id: reg ? reg.id : undefined, nome: r.nome, descricao: r.descricao, origem: r.origem, valores: r.valores, universal: r.universal, visibilidade: r.visibilidade, etiqueta: reg ? reg.etiqueta : undefined, modeloAnterior: reg ? reg.modelo : null });
      if (!g.ok) { r.erros = g.campos || {}; pintar(); var p = form.querySelector(".r-ajuda--erro"); if (p && p.previousElementSibling) (p.parentNode.querySelector("input, select, textarea") || p).focus(); UI.avisoErro(g.erro); return; }
      var resp = await global.RAMAApi.salvarHomebrew(g.registro);
      /* Falhou: o rascunho continua aberto, igual. */
      if (!resp.ok) { UI.avisoDeFalha(resp, "gravação na biblioteca"); return; }
      r.sujo = false;
      /* Um elemento novo já vale nos seletores desta página. */
      if (grupo === "estrutural" && r.subtipo === "elemento" && global.RAMAOrdemElementos) global.RAMAOrdemElementos.registrar(Object.assign({}, g.registro.modelo.def, { nome: g.registro.nome, descricao: g.registro.descricao, homebrewId: resp.dados && resp.dados.id }));
      fechar();
      UI.avisoOk(reg ? "Registro atualizado." : "Criado em Minhas criações.");
      if (o.aoSalvar) o.aoSalvar(resp.dados && resp.dados.id);
    }

    pintar();
    var primeiro = document.getElementById("hbe-nome"); if (primeiro) primeiro.focus();
    return janela;
  }

  /* =================================================================
     CONSULTA de um registro com modelo
     ================================================================= */
  function consulta(reg) {
    var s = A().sistemaDe(reg), g = A().grupoDe(reg), st = A().subtipoDe(reg);
    var spec = A().especDoSubtipo(s, g, st);
    var d = (reg.modelo && reg.modelo.def) || {};
    var pares = [];
    if (spec) (spec.campos || []).concat(spec.avancado || []).forEach(function (c) {
      var v = d[c.chave]; if (v === undefined || v === "" || v === false) return;
      if (c.tipo === "selecao") { var op = c.opcoes.filter(function (x) { return String(x.valor) === String(v); })[0]; v = op ? op.rotulo : v; }
      if (v === true) v = "Sim";
      pares.push([c.rotulo, String(v) + (c.unidade && typeof v !== "string" ? " " + c.unidade : "")]);
    });
    /* Classe Homebrew de Ordem: a prévia e o que falta, pelo módulo da ficha. */
    if (s === "ordem" && st === "classe" && global.RAMAOrdemHomebrew) {
      var HOx = global.RAMAOrdemHomebrew;
      var defC = HOx.normalizarClasse(Object.assign({}, d, { nome: reg.nome, homebrewId: reg.id }));
      HOx.previa(defC, { agi: 2, for: 2, int: 2, pre: 2, vig: 2 }).forEach(function (t, i) { pares.push(["Prévia " + (i + 1), t]); });
      pares.push(["Trilhos", (defC.progressao ? "NEX e nível" : "sem NEX/nível") + " · " + (defC.patentes ? "Patentes" : "sem Patentes")]);
      pares.push(["Poderes e trilhas", (defC.poderesDe || "só gerais") + " · " + (defC.trilhasDe || "sem trilhas")]);
    }
    /* Origem e Trilha Homebrew de Ordem (v9.9): a prévia pelo módulo da ficha. */
    if (s === "ordem" && (st === "origem" || st === "trilha") && global.RAMAOrdemHomebrew) {
      var HOy = global.RAMAOrdemHomebrew;
      var x = HOy.deRegistro(reg);
      if (x && x.def) (st === "origem" ? HOy.previaOrigem(x.def) : HOy.previaTrilha(x.def)).forEach(function (t, i) { pares.push([i ? "" : "Regras", t]); });
      if (x && x.def && st === "trilha") x.def.poderes.forEach(function (p) { if (p.resumo) pares.push(["NEX " + p.nex + "% · " + p.nome, p.resumo]); });
    }
    /* Raça Homebrew de Tormenta20 (v9.10): a prévia e o texto das habilidades. */
    if (s === "ordem2" && (st === "perfil" || st === "ocupacao") && global.RAMAOrdem2Homebrew) {
      var HO3 = global.RAMAOrdem2Homebrew, xo3 = HO3.deRegistro(reg);
      if (xo3 && xo3.def) HO3.previa(st, xo3.def).forEach(function (t, i) { pares.push([i ? "" : "Regras", t]); });
    }
    if (s === "vampiro" && ["cla", "predador", "disciplina", "vantagem", "conhecimento"].indexOf(st) >= 0 && global.RAMAVampiroHomebrew) {
      var HV = global.RAMAVampiroHomebrew, xv = HV.deRegistro(reg);
      if (xv && xv.def) HV.previa(st, xv.def).forEach(function (t, i) { pares.push([i ? "" : "Regras", t]); });
    }
    if (s === "oblivio" && ["papel", "motivacao", "mazela", "fardo"].indexOf(st) >= 0 && global.RAMAOblivioHomebrew) {
      var HO2 = global.RAMAOblivioHomebrew, xo2 = HO2.deRegistro(reg);
      if (xo2 && xo2.def) HO2.previa(st, xo2.def).forEach(function (t, i) { pares.push([i ? "" : "Regras", t]); });
    }
    if (s === "brutal" && (st === "arquetipo" || st === "estilo") && global.RAMABrutalHomebrew) {
      var HBr = global.RAMABrutalHomebrew, xb = HBr.deRegistro(reg);
      if (xb && xb.def) (st === "arquetipo" ? HBr.previaArquetipo(xb.def) : HBr.previaEstilo(xb.def)).forEach(function (t, i) { pares.push([i ? "" : "Regras", t]); });
    }
    if (s === "goblins" && (st === "ocupacao" || st === "descritor") && global.RAMAGoblinsHomebrew) {
      var HG = global.RAMAGoblinsHomebrew, xg = HG.deRegistro(reg);
      if (xg && xg.def) (st === "ocupacao" ? HG.previaOcupacao(xg.def) : HG.previaDescritor(xg.def)).forEach(function (t, i) { pares.push([i ? "" : "Regras", t]); });
    }
    if (s === "tormenta20" && (st === "magia" || st === "poder") && global.RAMATormenta20Homebrew) {
      var HT4 = global.RAMATormenta20Homebrew, xm = HT4.deRegistro(reg);
      if (xm && xm.def) (st === "magia" ? HT4.previaMagia(xm.def) : HT4.previaPoder(xm.def)).forEach(function (t, i) { pares.push([i ? "" : "Na ficha", t]); });
    }
    if (s === "tormenta20" && st === "classe" && global.RAMATormenta20Homebrew) {
      var HT3 = global.RAMATormenta20Homebrew, xc = HT3.deRegistro(reg);
      if (xc && xc.def) {
        HT3.previaClasse(xc.def).forEach(function (t, i) { pares.push([i ? "" : "Regras", t]); });
        xc.def.habilidadesDaTabela.concat(xc.def.poderesProprios).forEach(function (h) { if (h.resumo) pares.push([h.nome, h.resumo]); });
      }
    }
    if (s === "tormenta20" && (st === "origem" || st === "divindade") && global.RAMATormenta20Homebrew) {
      var HT2 = global.RAMATormenta20Homebrew, xo = HT2.deRegistro(reg);
      if (xo && xo.def) {
        (st === "origem" ? HT2.previaOrigem(xo.def) : HT2.previaDeus(xo.def)).forEach(function (t, i) { pares.push([i ? "" : "Regras", t]); });
        if (st === "origem" && xo.def.unico.resumo) pares.push([xo.def.unico.nome, xo.def.unico.resumo]);
        if (st === "divindade") xo.def.poderesProprios.forEach(function (p) { if (p.resumo) pares.push([p.nome, p.resumo]); });
      }
    }
    if (s === "tormenta20" && st === "raca" && global.RAMATormenta20Homebrew) {
      var HT = global.RAMATormenta20Homebrew, xr = HT.deRegistro(reg);
      if (xr && xr.def) {
        HT.previaRaca(xr.def).forEach(function (t, i) { pares.push([i ? "" : "Regras", t]); });
        xr.def.habilidades.forEach(function (h) { if (h.resumo && h.id !== "corpo") pares.push([h.nome, h.resumo]); });
      }
    }
    if (s === "ordem" && st === "elemento") {
      if (d.forteContra && d.forteContra.length) pares.push(["Forte contra", d.forteContra.map(function (k) { return global.RAMAOrdemElementos ? global.RAMAOrdemElementos.nome(k) : k; }).join(", ")]);
      if (d.fracoContra && d.fracoContra.length) pares.push(["Fraco contra", d.fracoContra.map(function (k) { return global.RAMAOrdemElementos ? global.RAMAOrdemElementos.nome(k) : k; }).join(", ")]);
    }
    var u = reg.universal;
    if (u) (u.campos || []).forEach(function (c) { var v = (u.valores || {})[c.chave]; if (v === undefined) return; if (v && typeof v === "object" && !Array.isArray(v)) v = v.max ? "máximo " + v.max : ""; if (Array.isArray(v)) v = v.join(", "); if (v === true) v = "Sim"; pares.push([c.rotulo, String(v)]); });
    return el("div.pilha--curta", { class: "pilha" }, [
      el("div.faixa", {}, [global.RAMACapaSistema ? global.RAMACapaSistema.elemento(s, { tamanho: "p" }) : null, el("span", { texto: nome(s) + " · " + (u && u.rotuloTipo ? u.rotuloTipo : A().rotuloDoSubtipo(reg)) })]),
      pares.length ? el("dl.r-dados", {}, pares.reduce(function (o, p) { o.push(el("dt", { texto: p[0] })); o.push(el("dd", { texto: p[1] })); return o; }, [])) : null,
      u && (u.acoes || []).length ? el("div", {}, [el("p.t-rotulo", { texto: "Ações" }), el("ul", {}, u.acoes.map(function (a) { return el("li", { texto: A().previaDaAcao(a) }); }))]) : null,
      reg.descricao || reg.texto ? el("p.item__descricao", { texto: reg.descricao || reg.texto, estilo: { whiteSpace: "pre-wrap" } }) : null,
    ]);
  }

  global.RAMAHomebrewEditor = { criar: criar, editor: editor, consulta: consulta };
})(window);
