/* =====================================================================
   R.A.M.A. — Homebrew · Origem e Trilha de Ordem Paranormal (v9.9)
   ---------------------------------------------------------------------
   Dois editores por etapas (Identidade → Regras → Revisão), no mesmo
   modelo do editor de Classe:

     Origem  perícias fixas e à escolha, o poder (nome e texto) e os
             efeitos opcionais que o motor já calcula
     Trilha  a classe a que serve, um requisito opcional e os quatro
             poderes (NEX 10%, 40%, 65%, 99%), cada um com efeitos opcionais

   A definição passa pelo normalizador do motor (js/ordem/homebrew-ordem.js)
   antes de ser gravada; a ficha guarda a sua própria cópia ao escolher.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var el = U.el;
  function H() { return global.RAMAOrdemHomebrew; }
  function C() { return global.RAMAOrdemCatalogo; }
  function A() { return global.RAMAHomebrewAdaptadores; }

  function vaziaOrigem() { return { pericias: [], periciasAEscolher: 0, periciasOpcoes: [], periciasObservacao: "", poder: "", resumo: "", efeitos: [] }; }
  function vaziaTrilha() { return { classe: "combatente", resumo: "", requisitos: [], poderes: [10, 40, 65, 99].map(function (n) { return { nex: n, nome: "", resumo: "", efeitos: [] }; }) }; }

  function editor(tipo, opcoes) {
    var o = opcoes || {};
    var reg = o.registro || null;
    var ehOrigem = tipo === "origem";
    var d = reg && reg.modelo && reg.modelo.def ? JSON.parse(JSON.stringify(reg.modelo.def)) : (ehOrigem ? vaziaOrigem() : vaziaTrilha());
    if (ehOrigem && !Array.isArray(d.periciasOpcoes)) d.periciasOpcoes = [];
    if (!ehOrigem) d.poderes = H().normalizarTrilha(d).poderes.map(function (p, i) { var x = (d.poderes || [])[i] || {}; return { nex: p.nex, nome: x.nome || "", resumo: x.resumo || "", efeitos: x.efeitos || [] }; });
    var rotulo = ehOrigem ? "origem" : "trilha";
    var r = { nome: reg ? reg.nome : "", descricao: reg ? reg.descricao || "" : (d.resumo && !ehOrigem ? d.resumo : ""), visibilidade: reg ? reg.visibilidade || "privado" : "privado", passo: 1, sujo: false };
    var pref = ehOrigem ? "hbo" : "hbt";
    var form = el("div.hbe-form"), lado = el("aside.hbe-lado", { "aria-label": "Revisão" });
    var janela = UI.modal({
      titulo: (reg ? "Editar " : "Nova ") + rotulo + " · Ordem Paranormal", largo: true, classe: "hbe-janela hbc-janela",
      conteudo: el("div.hbe-grade", {}, [form, lado]),
      podeFechar: function () {
        if (!r.sujo) return true;
        UI.confirmar({ titulo: "Descartar o rascunho?", texto: "A " + rotulo + " ainda não foi salva.", rotuloConfirmar: "Descartar", perigo: true }).then(function (s) { if (s) { r.sujo = false; janela.fechar(); } });
        return false;
      },
      botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: reg ? "Salvar " + rotulo : "Criar " + rotulo, classe: "r-botao--principal", aoClicar: salvar }],
    });
    function mudou(repintar) { r.sujo = true; if (repintar) pintar(); else pintarLado(); }

    var PASSOS = ["Identidade", ehOrigem ? "Perícias e poder" : "Poderes", "Revisão"];
    function pintar() {
      var foco = document.activeElement && form.contains(document.activeElement) ? document.activeElement.id : "";
      U.trocar(form, [
        el("ol.pc-passos", { "aria-label": "Etapas" }, PASSOS.map(function (p, i) {
          return el("li", {}, [el("button.pc-passo", { type: "button", id: pref + "-passo-" + (i + 1), "aria-current": r.passo === i + 1 ? "step" : null, onclick: function () { r.passo = i + 1; pintar(); } }, [el("span.pc-passo__n", { texto: String(i + 1) }), el("span", { texto: p })])]);
        })),
        [passo1, ehOrigem ? passoOrigem : passoTrilha, passoRevisao][r.passo - 1](),
        el("div.faixa.pc-editor__rodape", {}, [
          r.passo > 1 ? el("button.r-botao.r-botao--fantasma", { type: "button", id: pref + "-voltar", texto: "Voltar", onclick: function () { r.passo--; pintar(); } }) : null,
          r.passo < PASSOS.length ? el("button.r-botao", { type: "button", id: pref + "-continuar", texto: "Continuar", onclick: function () { r.passo++; pintar(); } }) : null,
        ]),
      ]);
      pintarLado();
      if (foco) { var f = document.getElementById(foco); if (f) f.focus(); }
    }

    /* ---------- controles ---------- */
    function pericias(vazio) { return (vazio ? [["", vazio]] : []).concat(C().PERICIAS.map(function (p) { return [p.chave, p.nome]; })); }
    function sel(id, rot, pares, valor, ao, ajuda) {
      return el("div.r-campo", {}, [el("label", { for: id, texto: rot }), el("select.r-selecao", { id: id, onchange: function (ev) { ao(ev.target.value); mudou(true); } }, pares.map(function (p) { return el("option", { value: p[0], texto: p[1], selected: String(p[0]) === String(valor === undefined || valor === null ? "" : valor) }); })), ajuda ? el("p.r-ajuda", { texto: ajuda }) : null]);
    }
    function txt(id, rot, valor, ao, max, ajuda, area) {
      var c = area ? el("textarea.r-area", { id: id, rows: 3, maxlength: max, oninput: function (ev) { ao(ev.target.value); mudou(); } }) : el("input.r-entrada", { id: id, value: valor || "", maxlength: max, oninput: function (ev) { ao(ev.target.value); mudou(); } });
      if (area) c.value = valor || "";
      return el("div.r-campo", {}, [el("label", { for: id, texto: rot }), c, ajuda ? el("p.r-ajuda", { texto: ajuda }) : null]);
    }
    function num(id, rot, valor, ao, ajuda) {
      return el("div.r-campo", {}, [el("label", { for: id, texto: rot }), el("input.r-entrada.r-entrada--numero", { id: id, inputmode: "numeric", maxlength: 3, value: String(valor || 0), oninput: function (ev) { ao(Number(ev.target.value) || 0); mudou(); }, onchange: function () { pintar(); } }), ajuda ? el("p.r-ajuda", { texto: ajuda }) : null]);
    }
    /* Os efeitos (só os que o motor já calcula). */
    function blocoEfeitos(dono, id) {
      dono.efeitos = dono.efeitos || [];
      var tipos = H().EFEITOS.map(function (e) { return [e.chave, e.rotulo]; });
      return el("fieldset.r-campo.hbo-efeitos", {}, [el("legend.r-rotulo", { texto: "Efeito na conta da ficha (opcional)" })].concat(dono.efeitos.map(function (ef, i) {
        var spec = H().EFEITOS.filter(function (e) { return e.chave === ef.tipo; })[0] || H().EFEITOS[0];
        return el("div.faixa.hbc-par", {}, [
          sel(id + "-t" + i, "Efeito", tipos, ef.tipo, function (v) { ef.tipo = v; if (v === "bonusPericia" && !ef.pericias) ef.pericias = ["atletismo"]; }),
          num(id + "-v" + i, "Valor", ef.valor, function (v) { ef.valor = v; }),
          spec.pericia ? sel(id + "-p" + i, "Perícia", pericias(), (ef.pericias || [])[0], function (v) { ef.pericias = [v]; }) : null,
          el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Remover", onclick: function () { dono.efeitos.splice(i, 1); mudou(true); } }),
        ]);
      })).concat([
        dono.efeitos.length < 4 ? el("button.r-botao.r-botao--mini", { type: "button", id: id + "-mais", texto: "+ Efeito", onclick: function () { dono.efeitos.push({ tipo: "defesa", valor: 1 }); mudou(true); } }) : null,
        el("p.r-ajuda", { texto: "Ex.: " + H().EFEITOS.map(function (e) { return e.exemplo; }).slice(0, 3).join("; ") + ". Sem efeito, o poder é informativo: a ficha mostra o texto e a mesa aplica." }),
      ]));
    }

    /* ---------- 1. identidade ---------- */
    function passo1() {
      var partes = [
        txt(pref + "-nome", "Nome da " + rotulo, r.nome, function (v) { r.nome = v; }, 60),
        txt(pref + "-desc", "Descrição", r.descricao, function (v) { r.descricao = v; }, 1200, ehOrigem ? "O que a pessoa fazia antes da Ordem." : "O estilo da trilha, em poucas linhas.", true),
      ];
      if (!ehOrigem) {
        partes.push(sel("hbt-classe", "Classe", H().OFICIAIS.map(function (k) { return [k, C().classe(k).nome]; }), d.classe, function (v) { d.classe = v; }, "Serve a essa classe e às Classes Homebrew que usam as trilhas dela."));
        partes.push(sel("hbt-req", "Requisito (opcional)", pericias("Nenhum"), d.requisitos && d.requisitos[0] ? d.requisitos[0].pericia : "", function (v) { d.requisitos = v ? [{ tipo: "treinado", pericia: v }] : []; }, "Ser treinado nessa perícia para escolher a trilha (como Médico de Campo pede Medicina)."));
      }
      return el("div.pc-editor__passo", {}, partes);
    }
    /* ---------- 2. origem ---------- */
    function passoOrigem() {
      var fixas = d.pericias || [];
      var partes = [
        el("p.t-mini", { texto: "No livro, cada origem dá duas perícias treinadas e um poder." }),
        el("div.editar-grade", {}, [0, 1].map(function (i) {
          return sel("hbo-per" + i, "Perícia treinada " + (i + 1), pericias("—"), fixas[i] || "", function (v) { var l = (d.pericias || []).slice(); l[i] = v; d.pericias = l.filter(function (k, j, ll) { return k && ll.indexOf(k) === j; }); });
        })),
        num("hbo-escolher", "Perícias à escolha", d.periciasAEscolher, function (v) { d.periciasAEscolher = Math.max(0, Math.min(4, v)); }, "Além das fixas (como o Amnésico, que tem duas à escolha)."),
      ];
      if (d.periciasAEscolher > 0) {
        partes.push(el("fieldset.r-campo.hbc-pericias", {}, [el("legend.r-rotulo", { texto: "Escolhidas entre (opcional; vazio = qualquer perícia)" })].concat(C().PERICIAS.filter(function (p) { return fixas.indexOf(p.chave) < 0; }).map(function (p) {
          return el("label.r-marca", {}, [el("input", { type: "checkbox", checked: d.periciasOpcoes.indexOf(p.chave) >= 0, onchange: function (ev) { d.periciasOpcoes = d.periciasOpcoes.filter(function (k) { return k !== p.chave; }); if (ev.target.checked) d.periciasOpcoes.push(p.chave); mudou(); } }), el("span", { texto: p.nome })]);
        }))));
        partes.push(txt("hbo-obs", "Observação sobre as perícias", d.periciasObservacao, function (v) { d.periciasObservacao = v; }, 160, "Ex.: \"Duas à escolha do mestre.\""));
      }
      partes.push(txt("hbo-poder", "Nome do poder", d.poder, function (v) { d.poder = v; }, 60));
      partes.push(txt("hbo-texto", "Texto do poder", d.resumo, function (v) { d.resumo = v; }, 1200, "O que o poder faz, como aparece em Habilidades.", true));
      partes.push(blocoEfeitos(d, "hbo-ef"));
      return el("div.pc-editor__passo", {}, partes);
    }
    /* ---------- 2. trilha ---------- */
    function passoTrilha() {
      return el("div.pc-editor__passo", {}, [el("p.t-mini", { texto: "Os poderes chegam sozinhos no marco (NEX 10%, 40%, 65% e 99%; nível e Patentes seguem a mesma regra das trilhas do livro)." })].concat(d.poderes.map(function (p, i) {
        return el("fieldset.r-campo.hbt-poder", {}, [
          el("legend.r-rotulo", { texto: "NEX " + p.nex + "%" }),
          txt("hbt-p" + i + "-nome", "Nome", p.nome, function (v) { p.nome = v; }, 60),
          txt("hbt-p" + i + "-texto", "Texto", p.resumo, function (v) { p.resumo = v; }, 1200, null, true),
          blocoEfeitos(p, "hbt-p" + i + "-ef"),
        ]);
      })));
    }
    /* ---------- 3. revisão ---------- */
    function definicao() {
      var x = JSON.parse(JSON.stringify(d));
      x.nome = r.nome || (ehOrigem ? "Origem Homebrew" : "Trilha Homebrew");
      x.homebrewId = reg ? reg.id : "rascunho";
      if (ehOrigem) x.descricao = r.descricao; else x.resumo = r.descricao;
      return ehOrigem ? H().normalizarOrigem(x) : H().normalizarTrilha(x);
    }
    function previa(def) { return ehOrigem ? H().previaOrigem(def) : H().previaTrilha(def); }
    function passoRevisao() {
      var def = definicao();
      var auto = ehOrigem
        ? ["As perícias fixas entram treinadas na criação e na troca de origem.", def.efeitos.length ? "Os efeitos entram na conta (" + def.efeitos.map(H().textoEfeito).join(", ") + ")." : "Sem efeito na conta."]
        : ["A trilha aparece na vaga de Trilha para " + C().classe(def.classe).nome + " (e para as Classes Homebrew que usam as trilhas dela).", "Cada poder chega no seu marco; os efeitos configurados entram na conta."];
      var manual = ehOrigem
        ? [def.periciasAEscolher ? "As " + def.periciasAEscolher + " perícias à escolha são escolhidas por quem joga." : null, "O que o texto do poder descreve além dos efeitos é aplicado pela mesa."]
        : ["O que o texto de cada poder descreve além dos efeitos é aplicado pela mesa."];
      return el("div.pc-editor__passo", {}, [
        el("p.t-rotulo", { texto: "Prévia" }),
        el("ul.hbe-mini", {}, previa(def).map(function (t) { return el("li", { texto: t }); })),
        el("p.t-rotulo", { texto: "Automático" }),
        el("ul.hbe-mini", {}, auto.map(function (t) { return el("li", { texto: t }); })),
        el("p.t-rotulo", { texto: "Decisão de quem joga / da mesa" }),
        el("ul.hbe-mini", {}, manual.filter(Boolean).map(function (t) { return el("li", { texto: t }); })),
        el("div.r-campo", {}, [el("span.r-rotulo", { texto: "Visibilidade" }), el("div.filtros__grupo", { role: "group", "aria-label": "Visibilidade" }, [["privado", "Privada"], ["publico", "Pública"]].map(function (x) {
          return el("button.filtro", { type: "button", "aria-pressed": String(r.visibilidade === x[0]), texto: x[1], onclick: function () { r.visibilidade = x[0]; mudou(true); } });
        }))]),
      ]);
    }
    function pintarLado() {
      var def = definicao();
      U.trocar(lado, [
        el("p.t-rotulo", { texto: "Revisão" }),
        el("p.t-secao", { texto: r.nome || "Sem nome" }),
        el("ul.hbe-mini", {}, previa(def).map(function (t) { return el("li", { texto: t }); })),
      ]);
    }

    async function salvar(fechar) {
      if (!U.aparar(r.nome)) { r.passo = 1; pintar(); UI.avisoErro("Dê um nome à " + rotulo + "."); var n = document.getElementById(pref + "-nome"); if (n) n.focus(); return; }
      var def = definicao();
      ["chave", "homebrewId", "homebrew", "fonte", "pagina", "nome", "descricao"].forEach(function (k) { delete def[k]; });
      if (!ehOrigem) delete def.resumo;
      var g = A().guardar("ordem", "estrutural", tipo, { id: reg ? reg.id : undefined, nome: r.nome, descricao: r.descricao, valores: {}, def: def, visibilidade: r.visibilidade, modeloAnterior: reg ? reg.modelo : null });
      if (!g.ok) { UI.avisoErro(g.erro); return; }
      var resp = await global.RAMAApi.salvarHomebrew(g.registro);
      if (!resp.ok) { UI.avisoDeFalha(resp, "gravação da " + rotulo); return; }
      r.sujo = false;
      fechar();
      if (H()) H().carregarBiblioteca(true);
      UI.avisoOk(ehOrigem
        ? (reg ? "Origem atualizada. As fichas que já a usam continuam com a versão delas." : "Origem criada. Ela aparece na criação de agentes de Ordem (aba Homebrew) e na troca de origem.")
        : (reg ? "Trilha atualizada. As fichas que já a usam continuam com a versão delas." : "Trilha criada. Ela aparece na vaga de Trilha da progressão para a classe dela."));
      if (o.aoSalvar) o.aoSalvar(resp.dados && resp.dados.id);
    }

    pintar();
    var p = document.getElementById(pref + "-nome"); if (p) p.focus();
    return janela;
  }

  global.RAMAHomebrewOrigemTrilha = {
    origem: function (o) { return editor("origem", o); },
    trilha: function (o) { return editor("trilha", o); },
  };
})(window);
