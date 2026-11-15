/* =====================================================================
   R.A.M.A. — Homebrew · Raça de Tormenta20 (v9.10)
   ---------------------------------------------------------------------
   Editor por etapas (Identidade → Atributos e habilidades → Revisão),
   no modelo dos editores de Classe, Origem e Trilha de Ordem:

     Identidade   nome, descrição, tamanho e deslocamento
     Regras       atributos (fixos e à escolha) e até 6 habilidades, cada
                  uma com texto, efeitos que o motor já soma e, se quiser,
                  UMA escolha de perícias (treinadas ou com bônus)
     Revisão      o que é automático, o que quem joga escolhe e o que
                  fica com a mesa, e a prévia

   A definição passa pelo normalizador do MOTOR (js/tormenta20/racas.js)
   antes de ser gravada; a ficha guarda a sua cópia ao escolher a raça.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var el = U.el;
  function RA() { return global.RAMATormenta20Racas; }
  function D() { return global.RAMATormenta20Dados; }
  function H() { return global.RAMATormenta20Homebrew; }
  function A() { return global.RAMAHomebrewAdaptadores; }

  var ATRS = ["for", "des", "con", "int", "sab", "car"];
  function vazia() { return { tamanho: "medio", deslocamento: 9, atributos: { fixo: {}, escolha: null }, habilidades: [{ nome: "", resumo: "", efeitos: [], escolhas: [] }] }; }
  function copia(x) { return JSON.parse(JSON.stringify(x)); }

  function editor(opcoes) {
    var o = opcoes || {};
    var reg = o.registro || null;
    var d = reg && reg.modelo && reg.modelo.def ? copia(reg.modelo.def) : vazia();
    d.atributos = d.atributos || { fixo: {} };
    d.atributos.fixo = d.atributos.fixo || {};
    /* As habilidades guardam o id (h1, h2…) para as variantes apontarem. */
    d.habilidades = (d.habilidades || []).filter(function (h) { return h && h.id !== "corpo"; }).map(function (h) { return { nome: h.nome || "", resumo: h.resumo || "", efeitos: h.efeitos || [], escolhas: h.escolhas || [], acao: h.acao || null }; });
    d.variantes = (d.variantes || []).map(function (v) { return { nome: v.nome || "", atributos: v.atributos || { fixo: {} }, habilidades: (v.habilidades || []).filter(function (k) { return k !== "corpo"; }) }; });
    if (!d.habilidades.length) d.habilidades.push({ nome: "", resumo: "", efeitos: [], escolhas: [] });
    var r = { nome: reg ? reg.nome : "", descricao: reg ? reg.descricao || "" : "", visibilidade: reg ? reg.visibilidade || "privado" : "privado", passo: 1, sujo: false };
    var form = el("div.hbe-form"), lado = el("aside.hbe-lado", { "aria-label": "Revisão" });
    var janela = UI.modal({
      titulo: (reg ? "Editar raça" : "Nova raça") + " · Tormenta20", largo: true, classe: "hbe-janela hbc-janela",
      conteudo: el("div.hbe-grade", {}, [form, lado]),
      podeFechar: function () {
        if (!r.sujo) return true;
        UI.confirmar({ titulo: "Descartar o rascunho?", texto: "A raça ainda não foi salva.", rotuloConfirmar: "Descartar", perigo: true }).then(function (s) { if (s) { r.sujo = false; janela.fechar(); } });
        return false;
      },
      botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: reg ? "Salvar raça" : "Criar raça", classe: "r-botao--principal", aoClicar: salvar }],
    });
    function mudou(repintar) { r.sujo = true; if (repintar) pintar(); else pintarLado(); }

    var PASSOS = ["Identidade", "Atributos e habilidades", "Revisão"];
    function pintar() {
      var foco = document.activeElement && form.contains(document.activeElement) ? document.activeElement.id : "";
      U.trocar(form, [
        el("ol.pc-passos", { "aria-label": "Etapas" }, PASSOS.map(function (p, i) {
          return el("li", {}, [el("button.pc-passo", { type: "button", id: "hbr-passo-" + (i + 1), "aria-current": r.passo === i + 1 ? "step" : null, onclick: function () { r.passo = i + 1; pintar(); } }, [el("span.pc-passo__n", { texto: String(i + 1) }), el("span", { texto: p })])]);
        })),
        [passo1, passo2, passoRevisao][r.passo - 1](),
        el("div.faixa.pc-editor__rodape", {}, [
          r.passo > 1 ? el("button.r-botao.r-botao--fantasma", { type: "button", id: "hbr-voltar", texto: "Voltar", onclick: function () { r.passo--; pintar(); } }) : null,
          r.passo < PASSOS.length ? el("button.r-botao", { type: "button", id: "hbr-continuar", texto: "Continuar", onclick: function () { r.passo++; pintar(); } }) : null,
        ]),
      ]);
      pintarLado();
      if (foco) { var f = document.getElementById(foco); if (f) f.focus(); }
    }

    /* ---------- controles ---------- */
    function pericias() { return D().PERICIAS.filter(function (p) { return p.chave !== "oficio"; }).map(function (p) { return [p.chave, p.nome]; }); }
    function sel(id, rot, pares, valor, ao, ajuda) {
      return el("div.r-campo", {}, [el("label", { for: id, texto: rot }), el("select.r-selecao", { id: id, onchange: function (ev) { ao(ev.target.value); mudou(true); } }, pares.map(function (p) { return el("option", { value: p[0], texto: p[1], selected: String(p[0]) === String(valor === undefined || valor === null ? "" : valor) }); })), ajuda ? el("p.r-ajuda", { texto: ajuda }) : null]);
    }
    function txt(id, rot, valor, ao, max, ajuda, area) {
      var c = area ? el("textarea.r-area", { id: id, rows: 3, maxlength: max, oninput: function (ev) { ao(ev.target.value); mudou(); } }) : el("input.r-entrada", { id: id, value: valor || "", maxlength: max, oninput: function (ev) { ao(ev.target.value); mudou(); } });
      if (area) c.value = valor || "";
      return el("div.r-campo", {}, [el("label", { for: id, texto: rot }), c, ajuda ? el("p.r-ajuda", { texto: ajuda }) : null]);
    }
    function num(id, rot, valor, ao, ajuda) {
      return el("div.r-campo", {}, [el("label", { for: id, texto: rot }), el("input.r-entrada.r-entrada--numero", { id: id, inputmode: "numeric", maxlength: 3, value: String(valor || 0), oninput: function (ev) { ao(Number(String(ev.target.value).replace(",", ".")) || 0); mudou(); }, onchange: function () { pintar(); } }), ajuda ? el("p.r-ajuda", { texto: ajuda }) : null]);
    }

    /* ---------- 1. identidade ---------- */
    function passo1() {
      return el("div.pc-editor__passo", {}, [
        txt("hbr-nome", "Nome da raça", r.nome, function (v) { r.nome = v; }, 60),
        txt("hbr-desc", "Descrição", r.descricao, function (v) { r.descricao = v; }, 1200, "Como é o povo, em poucas linhas. Aparece na criação de personagem.", true),
        el("div.editar-grade", {}, [
          sel("hbr-tam", "Tamanho", RA().TAMANHOS_HB.map(function (k) { return [k, D().TAMANHO[k].nome]; }), d.tamanho || "medio", function (v) { d.tamanho = v; }, "Pequeno: +2 em Furtividade e –2 em manobras (Tabela 1-21)."),
          sel("hbr-desl", "Deslocamento", [[6, "6m"], [9, "9m (o comum)"], [12, "12m"]], d.deslocamento || 9, function (v) { d.deslocamento = Number(v); }, "Anões, golens e hynne têm 6m; elfos, 12m."),
        ]),
      ]);
    }

    /* ---------- 2. atributos e habilidades ---------- */
    function passo2() {
      var at = d.atributos;
      var esc = at.escolha || { quantidade: 0, valor: 1 };
      var partes = [
        el("p.t-mini", { texto: "No livro, cada raça soma cerca de +3 em atributos (ex.: Con +2, Sab +1, Des –1) ou +1 em três à escolha (Humano)." }),
        el("fieldset.r-campo.hbr-atributos", {}, [el("legend.r-rotulo", { texto: "Atributos fixos" })].concat(ATRS.map(function (a) {
          return sel("hbr-atr-" + a, H().NOMES_ATR[a], [[-2, "–2"], [-1, "–1"], [0, "0"], [1, "+1"], [2, "+2"]], at.fixo[a] || 0, function (v) { var n = Number(v); if (n) at.fixo[a] = n; else delete at.fixo[a]; });
        }))),
        el("div.editar-grade", {}, [
          sel("hbr-esc-q", "Atributos à escolha", [[0, "Nenhum"], [1, "1"], [2, "2"], [3, "3 (como o Humano)"]], esc.quantidade || 0, function (v) { var n = Number(v); at.escolha = n ? { quantidade: n, valor: esc.valor || 1 } : null; }),
          esc.quantidade ? sel("hbr-esc-v", "Valor de cada um", [[1, "+1"], [2, "+2"]], esc.valor || 1, function (v) { at.escolha.valor = Number(v); }, "Os fixos não podem ser escolhidos de novo.") : null,
        ]),
        el("p.t-rotulo", { texto: "Habilidades" }),
      ];
      d.habilidades.forEach(function (h, i) { partes.push(blocoHabilidade(h, i)); });
      if (d.habilidades.length < 6) partes.push(el("button.r-botao.r-botao--mini", { type: "button", id: "hbr-mais-hab", texto: "+ Habilidade", onclick: function () { d.habilidades.push({ nome: "", resumo: "", efeitos: [], escolhas: [] }); mudou(true); } }));
      partes.push(blocoVariantes());
      return el("div.pc-editor__passo", {}, partes);
    }
    /* v9.13: variantes (como o Suraggel: Aggelus ou Sulfure). */
    function blocoVariantes() {
      var C3 = global.RAMAHomebrewT20Estruturais.ferramentas.controles(mudou);
      var habs = d.habilidades.map(function (h, i) { return ["h" + (i + 1), h.nome || "Habilidade " + (i + 1)]; });
      return el("fieldset.r-campo.hbr-hab", {}, [el("legend.r-rotulo", { texto: "Variantes (opcional)" }),
        el("p.r-ajuda", { texto: "Com duas ou mais, quem joga escolhe a variante na criação: cada uma tem os seus atributos e as habilidades marcadas (os atributos acima deixam de valer)." })].concat(d.variantes.map(function (v, i) {
        return el("div.pilha.hbr-variante", {}, [
          txtVar(v, i),
          el("div.hbr-atributos", {}, ["for", "des", "con", "int", "sab", "car"].map(function (a) {
            return sel("hbr-v" + i + "-atr-" + a, H().NOMES_ATR[a], [[-2, "–2"], [-1, "–1"], [0, "0"], [1, "+1"], [2, "+2"]], (v.atributos.fixo || {})[a] || 0, function (x) { var n = Number(x); v.atributos.fixo = v.atributos.fixo || {}; if (n) v.atributos.fixo[a] = n; else delete v.atributos.fixo[a]; });
          })),
          C3.marcas("hbr-v" + i + "-habs", "Habilidades desta variante", habs, v.habilidades, function (k, on) { var j = v.habilidades.indexOf(k); if (on && j < 0) v.habilidades.push(k); if (!on && j >= 0) v.habilidades.splice(j, 1); }),
          el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Remover variante", onclick: function () { d.variantes.splice(i, 1); mudou(true); } }),
        ]);
      })).concat([d.variantes.length < 3 ? el("button.r-botao.r-botao--mini", { type: "button", id: "hbr-mais-variante", texto: "+ Variante", onclick: function () { d.variantes.push({ nome: "", atributos: { fixo: {} }, habilidades: d.habilidades.map(function (h, j) { return "h" + (j + 1); }) }); mudou(true); } }) : null]));
    }
    function txtVar(v, i) {
      return txt("hbr-v" + i + "-nome", "Nome da variante " + (i + 1), v.nome, function (x) { v.nome = x; }, 40);
    }
    function blocoHabilidade(h, i) {
      var id = "hbr-h" + i;
      var e = h.escolhas[0] || null;
      var modoEsc = !e ? "" : (e.tipo === "magia" ? "magia" : e.tipo === "poderGeral" ? "poderGeral" : e.efeito && e.efeito.t === "bonus" ? "bonus" : "treino");
      var C2 = global.RAMAHomebrewT20Estruturais.ferramentas.controles(mudou);
      return el("fieldset.r-campo.hbr-hab", {}, [
        el("legend.r-rotulo", { texto: "Habilidade " + (i + 1) }),
        txt(id + "-nome", "Nome", h.nome, function (v) { h.nome = v; }, 60),
        txt(id + "-texto", "Texto", h.resumo, function (v) { h.resumo = v; }, 600, "Como aparece na ficha (Raça e origem).", true),
        blocoEfeitos(h, id + "-ef"),
        el("div.editar-grade", {}, [
          sel(id + "-esc", "Escolha (opcional)", [["", "Nenhuma"], ["treino", "Perícias treinadas (como Híbrido)"], ["bonus", "Perícias com bônus (como Deformidade)"], ["magia", "Uma magia (como Tatuagem Mística)"], ["poderGeral", "Um poder geral (como Propósito de Criação)"]], modoEsc, function (v) {
            h.escolhas = v === "poderGeral" ? [{ tipo: "poderGeral" }] : v === "magia" ? [{ tipo: "magia", circulo: 1, efeito: { t: "magia", atributo: "car" } }] : v ? [{ tipo: "pericia", quantidade: e && e.quantidade ? e.quantidade : 1, efeito: v === "bonus" ? { t: "bonus", valor: 2 } : { t: "treino" } }] : [];
          }, "Quem joga escolhe na criação; o efeito entra na conta."),
          e && modoEsc === "magia" ? sel(id + "-esc-atr", "Atributo da magia", [["int", "Inteligência"], ["sab", "Sabedoria"], ["car", "Carisma"]], e.efeito.atributo || "car", function (v) { e.efeito.atributo = v; }) : null,
          e && modoEsc === "magia" ? sel(id + "-esc-circ", "Círculo", [[1, "1º"], [2, "até o 2º"]], e.circulo || 1, function (v) { e.circulo = Number(v); }) : null,
          e && modoEsc !== "magia" && modoEsc !== "poderGeral" ? sel(id + "-esc-q", "Quantas", [[1, "1"], [2, "2"], [3, "3"]], e.quantidade || 1, function (v) { e.quantidade = Number(v); }) : null,
          e && modoEsc === "bonus" ? sel(id + "-esc-v", "Bônus", [[1, "+1"], [2, "+2"], [3, "+3"], [4, "+4"], [5, "+5"]], e.efeito.valor || 2, function (v) { e.efeito.valor = Number(v); }) : null,
        ]),
        C2.ativada(h, id + "-at"),
        d.habilidades.length > 1 ? el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", id: id + "-remover", texto: "Remover habilidade", onclick: function () { d.habilidades.splice(i, 1); mudou(true); } }) : null,
      ]);
    }
    /* Os efeitos de uma habilidade (só os que o motor já soma). */
    function blocoEfeitos(h, id) {
      var tipos = H().efeitosPara(false).map(function (x) { return [x.chave, x.rotulo]; });
      return el("fieldset.r-campo.hbo-efeitos", {}, [el("legend.r-rotulo", { texto: "Efeito na conta da ficha (opcional)" })].concat(h.efeitos.map(function (ef, j) {
        var k = H().chaveDoEfeito(ef);
        var campos = [sel(id + "-t" + j, "Efeito", tipos, k, function (v) { h.efeitos[j] = copia(H().EFEITOS.filter(function (x) { return x.chave === v; })[0].modelo); })];
        if (k === "defesa") campos.push(num(id + "-v" + j, "Valor", ef.valor, function (v) { ef.valor = v; }));
        if (k === "pericia") campos.push(sel(id + "-p" + j, "Perícia", pericias(), String(ef.alvo).slice(8), function (v) { ef.alvo = "pericia." + v; }), num(id + "-v" + j, "Valor", ef.valor, function (v) { ef.valor = v; }));
        if (k === "treino") campos.push(sel(id + "-p" + j, "Perícia", pericias(), ef.pericia, function (v) { ef.pericia = v; }));
        if (k === "pv") campos.push(num(id + "-i" + j, "No 1º nível", ef.inicial, function (v) { ef.inicial = v; }), num(id + "-v" + j, "Por nível seguinte", ef.valor, function (v) { ef.valor = v; }));
        if (k === "pm") campos.push(sel(id + "-v" + j, "Por nível", [[1, "+1"], [2, "+2"], [3, "+3"]], ef.valor, function (v) { ef.valor = Number(v); }));
        if (k === "sentido") campos.push(sel(id + "-s" + j, "Sentido", Object.keys(H().SENTIDOS).map(function (x) { return [x, H().SENTIDOS[x]]; }), ef.valor, function (v) { ef.valor = v; }));
        if (k === "rd") campos.push(sel(id + "-d" + j, "Tipo de dano", D().TIPOS_DANO.map(function (x) { return [x[0], x[1]]; }), (ef.tipos || [])[0], function (v) { ef.tipos = [v]; }), num(id + "-v" + j, "Redução", ef.valor, function (v) { ef.valor = v; }));
        if (k === "prof") campos.push(sel(id + "-q" + j, "Proficiência", Object.keys(H().PROFS).map(function (x) { return [x, H().PROFS[x]]; }), ef.qual, function (v) { ef.qual = v; }));
        campos.push(el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Remover", "aria-label": "Remover o efeito " + (j + 1), onclick: function () { h.efeitos.splice(j, 1); mudou(true); } }));
        return el("div.faixa.hbc-par", {}, campos);
      })).concat([
        h.efeitos.length < 4 ? el("button.r-botao.r-botao--mini", { type: "button", id: id + "-mais", texto: "+ Efeito", onclick: function () { h.efeitos.push(copia(H().EFEITOS[0].modelo)); mudou(true); } }) : null,
        el("p.r-ajuda", { texto: "Ex.: " + H().EFEITOS.slice(0, 4).map(function (x) { return x.exemplo; }).join("; ") + ". Sem efeito, a habilidade é informativa: a ficha mostra o texto e a mesa aplica." }),
      ]));
    }

    /* ---------- 3. revisão ---------- */
    function definicao() {
      var x = copia(d);
      x.nome = r.nome || "Raça Homebrew";
      x.descricao = r.descricao;
      x.homebrewId = reg ? reg.id : "rascunho";
      x.id = "";
      return RA().normalizarRacaHomebrew(x);
    }
    function lista(rotulo, itens) {
      return itens.length ? [el("p.t-rotulo", { texto: rotulo }), el("ul.hbe-mini", {}, itens.map(function (t) { return el("li", { texto: t }); }))] : [];
    }
    function passoRevisao() {
      var def = definicao();
      var au = H().automacao(def);
      return el("div.pc-editor__passo", {}, [].concat(
        lista("Prévia", H().previaRaca(def)),
        lista("Automático", au.automatico),
        lista("Escolha de quem joga", au.escolha),
        lista("Decisão da mesa", au.mesa),
        [el("div.r-campo", {}, [el("span.r-rotulo", { texto: "Visibilidade" }), el("div.filtros__grupo", { role: "group", "aria-label": "Visibilidade" }, [["privado", "Privada"], ["publico", "Pública"]].map(function (x) {
          return el("button.filtro", { type: "button", "aria-pressed": String(r.visibilidade === x[0]), texto: x[1], onclick: function () { r.visibilidade = x[0]; mudou(true); } });
        }))])]
      ));
    }
    function pintarLado() {
      var def = definicao();
      U.trocar(lado, [
        el("p.t-rotulo", { texto: "Revisão" }),
        el("p.t-secao", { texto: r.nome || "Sem nome" }),
        el("ul.hbe-mini", {}, H().previaRaca(def).map(function (t) { return el("li", { texto: t }); })),
      ]);
    }

    async function salvar(fechar) {
      if (!U.aparar(r.nome)) { r.passo = 1; pintar(); UI.avisoErro("Dê um nome à raça."); var n = document.getElementById("hbr-nome"); if (n) n.focus(); return; }
      var def = definicao();
      ["id", "homebrewId", "homebrew", "fonte", "pagina", "nome", "descricao"].forEach(function (k) { delete def[k]; });
      def.habilidades = def.habilidades.filter(function (h) { return h.id !== "corpo"; });
      var g = A().guardar("tormenta20", "estrutural", "raca", { id: reg ? reg.id : undefined, nome: r.nome, descricao: r.descricao, valores: {}, def: def, visibilidade: r.visibilidade, modeloAnterior: reg ? reg.modelo : null });
      if (!g.ok) { UI.avisoErro(g.erro); return; }
      var resp = await global.RAMAApi.salvarHomebrew(g.registro);
      if (!resp.ok) { UI.avisoDeFalha(resp, "gravação da raça"); return; }
      r.sujo = false;
      fechar();
      if (H()) H().carregarBiblioteca(true);
      UI.avisoOk(reg ? "Raça atualizada. As fichas que já a usam continuam com a versão delas." : "Raça criada. Ela aparece na criação de personagem de Tormenta20, depois das raças do livro.");
      if (o.aoSalvar) o.aoSalvar(resp.dados && resp.dados.id);
    }

    pintar();
    return janela;
  }

  global.RAMAHomebrewRacaT20 = { editor: editor };
})(typeof window !== "undefined" ? window : globalThis);
