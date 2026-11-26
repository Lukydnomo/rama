/* =====================================================================
   R.A.M.A. — Ordem Paranormal · a TELA do Inventário em grade (v9.23.0)
   =====================================================================
   O painel que aparece no inventário da ficha de Ordem com a regra
   "Inventário em grade" (Extras) ligada. A lógica (formas, encaixe,
   corpo) mora em js/ordem/grade.js; a carga, em RAMAOrdemRegras.

   COMO SE MOVE — sempre para o lugar EXATO que a pessoa apontar; nada
   de primeira célula livre no movimento comum:

     computador  segurar o botão esquerdo numa peça, arrastar e soltar.
                 Durante o arraste, a sombra da peça inteira aparece nas
                 células que ela ocuparia: verde cabe, vermelho não.
     celular     tocar na peça (seleciona, destacada), tocar na célula
                 de destino. A célula pela qual a peça foi pega é o
                 ponto de referência: ela cai na célula tocada e o resto
                 acompanha a orientação. Tocar na própria peça cancela;
                 destino inválido diz o porquê e a peça CONTINUA
                 selecionada para tentar outra célula.
     teclado     as células são botões: Enter/Espaço fazem o mesmo que
                 o toque; R gira e E espelha a peça selecionada.

   Com uma peça selecionada (ou sendo arrastada), a barra de forma muda a
   forma e a orientação: formas prontas, girar, espelhar, trocar o lado
   da fração e o editor livre (qualquer forma ligada pelas laterais).

   Slots do corpo: clique direito (computador) e toque prolongado
   (celular) abrem "Adicionar slot extra" e, nos extras, "Excluir slot".
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var el = U.el;
  function G() { return global.RAMAOrdemGrade; }
  function R() { return global.RAMAOrdemRegras; }
  function I() { return global.RAMAOrdemInventario; }

  /* Estado de TELA (atravessa redesenhos; nunca vai para a planilha). */
  var sel = null;          /* { uid, forma, meia, grab: [gx, gy] } */
  var mensagem = null;     /* { texto, erro } — mostrada uma vez */
  var arraste = null;      /* { uid, x0, y0, ativo, pointerId } */
  var suprimirClique = false;
  var pressao = null;      /* toque prolongado num slot */

  /* ---------------- montar ---------------- */

  function espacosDe(efetivos, item) {
    var ef = efetivos.porId ? efetivos.porId[item.id] : null;
    return ef ? ef.espacos.unitarioEfetivo : I().espacosDoItem(item).unitario;
  }

  function duasMaos(item) {
    var d = I().dadosDoItem(item);
    return item.tipo === "arma" && !!(d.arma && d.arma.empunhadura === "duasMaos");
  }

  function montar(o, inventario) {
    var cap = R().capacidade(o, inventario);
    var ef = R().itensEfetivos(o, inventario);
    var est = G().montar({
      itens: inventario.itens || [], config: o.inventarioGrade,
      principal: cap.grade ? cap.grade.principal : 0,
      recipientes: cap.grade ? cap.grade.recipientes : [],
      espacosDe: function (it) { return espacosDe(ef, it); },
      quantidadeDe: function (it) { return I().dadosDoItem(it).quantidade; },
      duasMaos: duasMaos,
    });
    est.capacidade = cap;
    return est;
  }

  /* O que chegou sem lugar (a primeira vez que a regra é ligada, um item
     novo de fora da tela) é organizado UMA vez e gravado. O que tinha
     lugar e deixou de caber fica pendente SEM perder a posição gravada:
     se a capacidade voltar, ele volta. */
  function reconciliar(ctx, api, o, est) {
    var mudou = false;
    if (!o.inventarioGrade) o.inventarioGrade = { slotsExtras: [], colunas: {} };
    if (!o.inventarioGrade.colunas) o.inventarioGrade.colunas = {};
    Object.keys(est.grades).forEach(function (k) {
      var g = est.grades[k];
      if (g.celulas && !o.inventarioGrade.colunas[k]) { o.inventarioGrade.colunas[k] = g.colunas; mudou = true; }
    });
    if (est.faltando.length) {
      var novos = est.faltando.slice();
      G().organizar(est, novos);
      novos.forEach(function (ref) { G().gravarUnidade(ref); G().sincronizar(ref.item); });
      mudou = true;
    }
    if (mudou) api.aoMudar();
    return mudou;
  }

  function refDe(est, uid) { return est.unidades.filter(function (u) { return u.uid === uid; })[0] || null; }

  /* ---------------- seleção e forma ---------------- */

  function selecionar(est, ref, celula) {
    var esp = ref.espacos;
    var l = ref.lugar;
    var forma, meia, grab = [0, 0];
    if (l && l.local === "grade" && (l.forma || []).length === esp.n && (!!l.meia === !!esp.meia)) {
      forma = l.forma.map(function (c) { return c.slice(); });
      meia = l.meia ? l.meia.slice() : null;
      if (celula) grab = [celula[0] - l.x, celula[1] - l.y];
    } else {
      var cols = est.grades[G().PRINCIPAL] ? est.grades[G().PRINCIPAL].colunas : 5;
      forma = G().formaPadrao(esp.n, cols);
      meia = esp.meia ? (esp.n ? G().meiaPadrao(forma) : [0, 0]) : null;
      grab = forma.length ? forma[0].slice() : [0, 0];
    }
    sel = { uid: ref.uid, forma: forma, meia: meia, grab: grab };
  }

  /* Gira ou espelha forma, fração e o ponto de referência juntos. */
  function transformar(fn) {
    if (!sel) return;
    var pts = sel.forma.concat(sel.meia ? [sel.meia] : []);
    if (!pts.length) return;
    var maxX = Math.max.apply(null, pts.map(function (c) { return c[0]; }));
    var maxY = Math.max.apply(null, pts.map(function (c) { return c[1]; }));
    var map = function (c) { return fn(c, maxX, maxY); };
    var forma = sel.forma.map(map), meia = sel.meia ? map(sel.meia) : null, grab = map(sel.grab);
    var todos = forma.concat(meia ? [meia] : []);
    var mx = Math.min.apply(null, todos.map(function (c) { return c[0]; }));
    var my = Math.min.apply(null, todos.map(function (c) { return c[1]; }));
    var sub = function (c) { return [c[0] - mx, c[1] - my]; };
    sel.forma = forma.map(sub);
    sel.meia = meia ? sub(meia) : null;
    sel.grab = sub(grab);
  }
  function girar() { transformar(function (c, mx, my) { return [my - c[1], c[0]]; }); }
  function espelhar() { transformar(function (c, mx) { return [mx - c[0], c[1]]; }); }

  function usarForma(forma, est) {
    var ref = refDe(est, sel.uid);
    sel.forma = G().normalizarForma(forma);
    sel.meia = ref && ref.espacos.meia ? (sel.forma.length ? G().meiaPadrao(sel.forma) : [0, 0]) : null;
    sel.grab = sel.forma.length ? sel.forma[0].slice() : [0, 0];
  }

  function trocarLadoDaFracao() {
    if (!sel || !sel.meia || !sel.forma.length) return;
    var viz = G().vizinhas(sel.forma).sort(function (a, b) { return a[1] - b[1] || a[0] - b[0]; });
    var i = viz.findIndex(function (c) { return c[0] === sel.meia[0] && c[1] === sel.meia[1]; });
    var prox = viz[(i + 1) % viz.length];
    /* posições com coordenada negativa: desloca tudo para começar em 0 */
    var todos = sel.forma.concat([prox]);
    var mx = Math.min.apply(null, todos.map(function (c) { return c[0]; }));
    var my = Math.min.apply(null, todos.map(function (c) { return c[1]; }));
    var sub = function (c) { return [c[0] - mx, c[1] - my]; };
    sel.forma = sel.forma.map(sub); sel.meia = sub(prox); sel.grab = sub(sel.grab);
  }

  /* ---------------- destino a partir do alvo ---------------- */

  function destinoDoAlvo(est, ref, alvo) {
    if (!alvo) return null;
    var tipo = alvo.dataset.alvo;
    var esp = ref.espacos;
    var zero = esp.n === 0 && !esp.meia;
    if (tipo === "slot") {
      var slot = alvo.dataset.slot;
      if (ref.duasMaos && G().MAOS.indexOf(slot) >= 0) slot = G().DUAS_MAOS;
      return { local: "corpo", slot: slot };
    }
    if (tipo === "faixa") {
      if (!zero) return { erro: "Só itens de espaço 0 ficam nesta faixa. Solte numa célula." };
      return { local: "grade", recipiente: alvo.dataset.rec, x: 0, y: 0, forma: [] };
    }
    if (tipo === "celula") {
      var rec = alvo.dataset.rec;
      if (zero) return { local: "grade", recipiente: rec, x: 0, y: 0, forma: [] };
      var tx = parseInt(alvo.dataset.x, 10), ty = parseInt(alvo.dataset.y, 10);
      var ox = tx - sel.grab[0], oy = ty - sel.grab[1];
      if (ox < 0 || oy < 0) return { erro: "A peça sai da grade nessa posição: aponte mais para dentro." };
      return { local: "grade", recipiente: rec, x: ox, y: oy, forma: sel.forma, meia: sel.meia };
    }
    return null;
  }

  /* Move de verdade: encaixe local primeiro (G.mover não mexe em nada se
     não couber), depois a carga total. Recusado, a peça fica na origem. */
  function tentarMover(ctx, api, o, est, ref, destino) {
    if (!destino) return false;
    if (destino.erro) { mensagem = { texto: destino.erro, erro: true }; return false; }
    var item = ref.item;
    var antesGrade = JSON.stringify(item.ordem && item.ordem.grade || null);
    var antesEstado = { emUso: item.ordem && item.ordem.emUso, empunhada: item.ordem && item.ordem.empunhada, vestida: item.ordem && item.ordem.vestida };
    var ocupadoAntes = est.capacidade.ocupado;
    var r = G().mover(est, ref, destino);
    if (!r.ok) { mensagem = { texto: r.motivo, erro: true }; return false; }
    G().sincronizar(item);
    var depois = R().capacidade(o, ctx.ficha.inventario);
    if (depois.acimaDoMaximo && depois.ocupado > ocupadoAntes + 1e-9) {
      item.ordem.grade = antesGrade === "null" ? undefined : JSON.parse(antesGrade);
      ["emUso", "empunhada", "vestida"].forEach(function (k) { if (antesEstado[k]) item.ordem[k] = true; else delete item.ordem[k]; });
      mensagem = { texto: "A carga passaria do máximo (" + I().rotuloEspacos(depois.ocupado) + " de " + depois.maximo + " espaços). " + (item.nome || "O item") + " ficou onde estava.", erro: true };
      return false;
    }
    mensagem = { texto: (item.nome || "Item") + ": " + descreverLugar(o, ref.lugar) + ".", erro: false };
    sel = null;
    api.aoMudar();
    return true;
  }

  function descreverLugar(o, l) {
    if (!l || l.local === "pendente") return "a organizar";
    if (l.local === "corpo") return (G().MAOS.indexOf(l.slot) >= 0 || l.slot === G().DUAS_MAOS ? "segurado: " : "vestido: ") + G().nomeDoSlot(o.inventarioGrade, l.slot);
    return "guardado em " + (l.recipiente === G().PRINCIPAL ? "Inventário" : nomeDoRecipiente(l.recipiente));
  }
  var nomesDeRecipiente = {};
  function nomeDoRecipiente(id) { return nomesDeRecipiente[id] || "mochila"; }

  /* ---------------- desenho ---------------- */

  function corDe(id) {
    var h = 0;
    for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
    return h;
  }
  function sigla(nome) {
    var p = String(nome || "?").trim().split(/\s+/);
    return (p.length > 1 ? p[0].charAt(0) + p[1].charAt(0) : String(nome || "?").slice(0, 2)).toUpperCase();
  }

  function desenharGrade(est, g, o) {
    var cel = [];
    for (var k = 0; k < g.celulas; k++) {
      var x = k % g.colunas, y = Math.floor(k / g.colunas);
      var dono = g.cheia[k];
      var fr = g.fracoes[k];
      var comum = { "data-alvo": "celula", "data-rec": g.id, "data-x": String(x), "data-y": String(y) };
      if (dono) {
        var ref = refDe(est, dono);
        var lados = ["cima", "dir", "baixo", "esq"].filter(function (lado, i) {
          var d = [[0, -1], [1, 0], [0, 1], [-1, 0]][i];
          var nx = x + d[0], ny = y + d[1];
          if (nx < 0 || ny < 0 || nx >= g.colunas) return true;
          var nk = ny * g.colunas + nx;
          return nk >= g.celulas || g.cheia[nk] !== dono;
        });
        var primeira = ref && ref.lugar && ref.lugar.forma && ref.lugar.forma.length && (ref.lugar.x + ref.lugar.forma[0][0]) === x && (ref.lugar.y + ref.lugar.forma[0][1]) === y;
        cel.push(el("button.inv-cel.inv-cel--cheia", Object.assign({
          type: "button", dataset: { uid: dono },
          class: lados.map(function (l) { return "inv-cel--borda-" + l; }).join(" ") + (sel && sel.uid === dono ? " inv-cel--selecionada" : ""),
          style: "--inv-matiz: " + corDe(ref ? ref.item.id : dono),
          title: (ref ? ref.item.nome : "Item") + " — clique ou toque para pegar; arraste para mover",
          "aria-label": (ref ? ref.item.nome : "Item") + ", linha " + (y + 1) + ", coluna " + (x + 1) + (sel && sel.uid === dono ? ", selecionado" : ""),
        }, comum), [primeira ? el("span.inv-cel__sigla", { "aria-hidden": "true", texto: sigla(ref && ref.item.nome) }) : null]));
        continue;
      }
      if (fr.length) {
        var soma = g.somaFracao[k];
        cel.push(el("div.inv-cel.inv-cel--fracao", Object.assign({ role: "group", "aria-label": "Linha " + (y + 1) + ", coluna " + (x + 1) + ": dividida" }, comum),
          fr.map(function (f) {
            var r = refDe(est, f.uid);
            return el("button.inv-cel__fracao", {
              type: "button", dataset: { uid: f.uid },
              class: sel && sel.uid === f.uid ? "inv-cel--selecionada" : "",
              style: "flex-grow: " + f.r + "; --inv-matiz: " + corDe(r ? r.item.id : f.uid),
              title: (r ? r.item.nome : "Item") + " (" + String(f.r).replace(".", ",") + " de célula)",
              "aria-label": (r ? r.item.nome : "Item") + ", " + String(f.r).replace(".", ",") + " de célula",
            });
          }).concat(soma < 1 - 1e-9 ? [el("span.inv-cel__livre", { style: "flex-grow: " + (1 - soma), "aria-hidden": "true" })] : [])));
        continue;
      }
      cel.push(el("button.inv-cel.inv-cel--livre", Object.assign({ type: "button", "aria-label": "Linha " + (y + 1) + ", coluna " + (x + 1) + ", livre" }, comum)));
    }
    var ocupadas = g.cheia.filter(Boolean).length + g.somaFracao.reduce(function (s, v) { return s + v; }, 0);
    return el("section.inv-recipiente", { "aria-label": g.nome }, [
      el("header.inv-recipiente__topo", {}, [
        el("h4.inv-recipiente__nome", { texto: g.nome }),
        el("span.t-mini", { texto: I().rotuloEspacos(ocupadas) + " de " + g.celulas + " células" }),
      ]),
      g.celulas
        ? el("div.inv-grade", { style: "--inv-colunas: " + g.colunas, role: "group", "aria-label": "Grade de " + g.nome + ", " + g.colunas + " colunas" }, cel)
        : el("p.t-mini", { texto: "Sem células: a capacidade normal está em 0." }),
      el("div.inv-faixa", { "data-alvo": "faixa", "data-rec": g.id, role: "group", "aria-label": "Itens de espaço 0 em " + g.nome }, [
        el("span.t-mini.inv-faixa__rotulo", { texto: "Espaço 0:" }),
      ].concat(g.zero.map(function (r) { return chip(r); }), g.zero.length ? [] : [el("span.t-mini.inv-faixa__vazia", { texto: "nada" })])),
    ]);
  }

  function chip(ref, motivo) {
    return el("button.inv-chip", {
      type: "button", dataset: { uid: ref.uid },
      class: sel && sel.uid === ref.uid ? "inv-cel--selecionada" : "",
      style: "--inv-matiz: " + corDe(ref.item.id),
      title: motivo || ref.item.nome,
      "aria-label": ref.item.nome + (ref.espacos.total ? ", " + I().rotuloEspacos(ref.espacos.total) + " espaço(s)" : "") + (sel && sel.uid === ref.uid ? ", selecionado" : ""),
    }, [el("span", { texto: ref.item.nome || "Item" }), ref.espacos.total ? el("span.t-mini", { texto: " " + I().rotuloEspacos(ref.espacos.total) }) : null]);
  }

  function desenharCorpo(est, o) {
    return el("section.inv-corpo", { "aria-label": "Corpo" }, [
      el("h4.inv-recipiente__nome", { texto: "Corpo" }),
      el("div.inv-corpo__figura", {}, G().PARTES.map(function (p) {
        var slots = G().slotsDaParte(o.inventarioGrade, p.chave);
        return el("div.inv-parte.inv-parte--" + p.chave, {}, [
          el("span.inv-parte__nome.t-mini", { texto: p.nome }),
        ].concat(slots.map(function (s) {
          var ref = est.corpo[s.id];
          return el("button.inv-slot", {
            type: "button", "data-alvo": "slot", "data-slot": s.id,
            dataset: ref ? { uid: ref.uid } : {},
            class: [ref ? "inv-slot--ocupado" : "", s.base ? "" : "inv-slot--extra", ref && sel && sel.uid === ref.uid ? "inv-cel--selecionada" : ""].join(" ").trim(),
            style: ref ? "--inv-matiz: " + corDe(ref.item.id) : null,
            title: G().nomeDoSlot(o.inventarioGrade, s.id) + (ref ? ": " + ref.item.nome : ": vazio") + " — clique direito ou toque prolongado: slots extras",
            "aria-label": G().nomeDoSlot(o.inventarioGrade, s.id) + (ref ? ", " + ref.item.nome + (ref.lugar.slot === G().DUAS_MAOS ? " (duas mãos)" : "") : ", vazio") + ". Menu de contexto: slots extras.",
          }, [el("span", { texto: ref ? ref.item.nome : (s.base ? "—" : "extra") })]);
        })));
      })),
    ]);
  }

  function barraDeForma(ctx, api, o, est) {
    if (!sel) return null;
    var ref = refDe(est, sel.uid);
    if (!ref) { sel = null; return null; }
    var esp = ref.espacos;
    var g0 = est.grades[G().PRINCIPAL];
    var presets = esp.n >= 2 ? G().presets(esp.n, g0 ? g0.colunas : 5) : [];
    function redesenhar() { api.redesenhar(); }
    return el("div.inv-barra", { role: "toolbar", "aria-label": "Forma de " + ref.item.nome }, [
      el("span.inv-barra__item", { texto: ref.item.nome + " · " + I().rotuloEspacos(esp.total) + " espaço(s)" }),
      miniForma(sel.forma, sel.meia, sel.grab),
      presets.length ? el("div.inv-barra__formas", {}, presets.map(function (p) {
        return el("button.r-botao.r-botao--mini", { type: "button", title: p.nome, "aria-label": "Forma: " + p.nome, onclick: function () { usarForma(p.forma, est); redesenhar(); } }, [miniForma(p.forma, null, null)]);
      })) : null,
      esp.n >= 2 || (esp.n >= 1 && esp.meia) ? el("button.r-botao.r-botao--mini", { type: "button", texto: "Girar (R)", onclick: function () { girar(); redesenhar(); } }) : null,
      esp.n >= 2 || (esp.n >= 1 && esp.meia) ? el("button.r-botao.r-botao--mini", { type: "button", texto: "Espelhar (E)", onclick: function () { espelhar(); redesenhar(); } }) : null,
      esp.meia && esp.n ? el("button.r-botao.r-botao--mini", { type: "button", texto: "Trocar lado da fração", onclick: function () { trocarLadoDaFracao(); redesenhar(); } }) : null,
      esp.n >= 2 ? el("button.r-botao.r-botao--mini", { type: "button", texto: "Desenhar forma", onclick: function () { editorDeForma(esp.n, function (f) { usarForma(f, est); redesenhar(); }); } }) : null,
      ref.lugar && ref.lugar.local === "grade" && esp.n ? el("button.r-botao.r-botao--mini", {
        type: "button", texto: "Aplicar aqui", title: "Usa a forma nova no mesmo lugar (a célula de referência fica onde está)",
        onclick: function () {
          var l = ref.lugar;
          var refCel = [l.x + (l.forma[0] ? l.forma[0][0] : 0), l.y + (l.forma[0] ? l.forma[0][1] : 0)];
          var d = { local: "grade", recipiente: l.recipiente, x: refCel[0] - sel.grab[0], y: refCel[1] - sel.grab[1], forma: sel.forma, meia: sel.meia };
          if (d.x < 0 || d.y < 0) { mensagem = { texto: "Nessa orientação a peça sai da grade aqui.", erro: true }; redesenhar(); return; }
          tentarMover(ctx, api, o, est, ref, d); redesenhar();
        },
      }) : null,
      el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Cancelar", onclick: function () { sel = null; redesenhar(); } }),
      el("p.t-mini.inv-barra__dica", { texto: "Toque (ou clique) na célula onde a parte destacada deve cair. No computador, dá para arrastar." }),
    ]);
  }

  function miniForma(forma, meia, grab) {
    var pts = forma.concat(meia ? [meia] : []);
    var w = Math.max(1, Math.max.apply(null, pts.map(function (c) { return c[0]; }).concat([0])) + 1);
    var h = Math.max(1, Math.max.apply(null, pts.map(function (c) { return c[1]; }).concat([0])) + 1);
    var cells = [];
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var cheia = forma.some(function (c) { return c[0] === x && c[1] === y; });
      var ehMeia = meia && meia[0] === x && meia[1] === y;
      var ehGrab = grab && grab[0] === x && grab[1] === y;
      cells.push(el("span.inv-mini__c", { class: (cheia ? "inv-mini__c--cheia" : ehMeia ? "inv-mini__c--meia" : "") + (ehGrab ? " inv-mini__c--ref" : "") }));
    }
    return el("span.inv-mini", { "aria-hidden": "true", style: "--inv-mini-cols: " + w }, cells);
  }

  /* O editor livre: qualquer forma de n células ligadas pelas laterais. */
  function editorDeForma(n, aoUsar) {
    var lado = Math.min(10, Math.max(3, n));
    var marcadas = {};
    var f0 = G().formaPadrao(n, Math.min(lado, n));
    f0.forEach(function (c) { marcadas[c[0] + "," + c[1]] = true; });
    var info = el("p.t-mini", { role: "status" });
    var pad = el("div.inv-editor", { style: "--inv-colunas: " + lado });
    var botaoUsar;
    function forma() { return Object.keys(marcadas).map(function (k) { return k.split(",").map(Number); }); }
    function pintar() {
      U.limpar(pad);
      for (var y = 0; y < lado; y++) for (var x = 0; x < lado; x++) {
        (function (x, y) {
          var k = x + "," + y;
          pad.appendChild(el("button.inv-cel", {
            type: "button", class: marcadas[k] ? "inv-cel--cheia" : "inv-cel--livre", style: "--inv-matiz: 210",
            "aria-pressed": String(!!marcadas[k]), "aria-label": "Linha " + (y + 1) + ", coluna " + (x + 1),
            onclick: function () { if (marcadas[k]) delete marcadas[k]; else marcadas[k] = true; pintar(); },
          }));
        })(x, y);
      }
      var f = forma();
      var ok = f.length === n && G().conectada(G().normalizarForma(f));
      info.textContent = f.length + " de " + n + " células" + (f.length === n && !ok ? " — precisam estar ligadas pelas laterais." : "");
      if (botaoUsar) botaoUsar.disabled = !ok;
    }
    var m = UI.modal({
      titulo: "Desenhar a forma (" + n + " células)",
      conteudo: el("div.pilha", {}, [el("p.t-mini", { texto: "Marque exatamente " + n + " células, todas ligadas pelas laterais." }), pad, info]),
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Usar esta forma", classe: "r-botao--principal", aoClicar: function (fechar) {
          var f = forma();
          if (f.length !== n || !G().conectada(G().normalizarForma(f))) return;
          fechar(); aoUsar(f);
        } },
      ],
    });
    botaoUsar = m && m.janela ? Array.prototype.filter.call(m.janela.querySelectorAll("button"), function (b) { return b.textContent === "Usar esta forma"; })[0] : null;
    pintar();
  }

  /* ---------------- slots: menu de contexto ---------------- */

  function menuDoSlot(ctx, api, o, slotId) {
    var est = montar(o, ctx.ficha.inventario);
    var config = o.inventarioGrade;
    var s = G().slots(config).filter(function (x) { return x.id === slotId; })[0];
    if (!s) return;
    var botoes = [{ rotulo: "Fechar", classe: "r-botao--fantasma" }];
    botoes.push({ rotulo: "Adicionar slot extra", classe: "r-botao--principal", aoClicar: function (fechar) {
      var novo = G().adicionarSlot(config, s.parte);
      fechar();
      mensagem = novo ? { texto: "Slot extra criado em " + G().nomeDoSlot(config, novo.id) + ".", erro: false } : { texto: "Limite de slots extras atingido.", erro: true };
      api.aoMudar(); api.redesenhar();
    } });
    if (!s.base) {
      botoes.push({ rotulo: "Excluir slot", classe: "r-botao--perigo", aoClicar: function (fechar) {
        fechar();
        var ref = est.corpo[slotId];
        if (!ref) { G().removerSlot(config, slotId); mensagem = { texto: "Slot excluído.", erro: false }; api.aoMudar(); api.redesenhar(); return; }
        escolherDestinoAoExcluir(ctx, api, o, est, ref, slotId);
      } });
    }
    UI.modal({ titulo: G().nomeDoSlot(config, slotId), conteudo: el("p.t-mini", { texto: s.base ? "Slot-base (permanente). Um slot extra nesta parte permite sobrepor peças, como camisa e casaco." : "Slot extra de " + (G().PARTES.filter(function (p) { return p.chave === s.parte; })[0].nome) + "." }), botoes: botoes });
  }

  /* Excluir um slot ocupado: a peça vai para um destino escolhido, ou nada muda. */
  function escolherDestinoAoExcluir(ctx, api, o, est, ref, slotId) {
    var config = o.inventarioGrade;
    var opcoes = [];
    G().slots(config).forEach(function (s) {
      if (s.id === slotId || est.corpo[s.id]) return;
      if (ref.duasMaos && G().MAOS.indexOf(s.id) >= 0) return;
      opcoes.push({ rotulo: "Vestir em " + G().nomeDoSlot(config, s.id), destino: { local: "corpo", slot: s.id } });
    });
    Object.keys(est.grades).forEach(function (k) {
      var g = est.grades[k];
      var d = G().primeiroEncaixe(est, ref, [k]);
      if (d) opcoes.push({ rotulo: "Guardar em " + g.nome + " (no primeiro lugar que couber)", destino: d });
    });
    var escolhido = null;
    var lista = el("div.pilha--curta", { class: "pilha", role: "radiogroup", "aria-label": "Destino de " + ref.item.nome },
      opcoes.length ? opcoes.map(function (op, i) {
        var idr = "inv-dest-" + i;
        return el("label.r-marca", { for: idr }, [el("input", { id: idr, type: "radio", name: "inv-destino", onchange: function () { escolhido = op; } }), el("span", { texto: op.rotulo })]);
      }) : [el("p.t-mini.t-aviso", { texto: "Não há outro lugar livre para esta peça agora. Libere espaço antes de excluir o slot." })]);
    UI.modal({
      titulo: "Excluir slot ocupado",
      conteudo: el("div.pilha", {}, [el("p", { texto: G().nomeDoSlot(config, slotId) + " tem " + ref.item.nome + ". Para onde ela vai?" }), lista]),
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Mover e excluir", classe: "r-botao--perigo", aoClicar: function (fechar) {
          if (!escolhido) { UI.avisoAtencao("Escolha um destino, ou cancele."); return; }
          var est2 = montar(o, ctx.ficha.inventario);
          var r2 = refDe(est2, ref.uid);
          if (!r2 || !tentarMover(ctx, api, o, est2, r2, escolhido.destino)) { fechar(); api.redesenhar(); return; }
          G().removerSlot(config, slotId);
          mensagem = { texto: ref.item.nome + " mudou de lugar e o slot foi excluído.", erro: false };
          fechar(); api.aoMudar(); api.redesenhar();
        } },
      ],
    });
  }

  /* ---------------- interação ---------------- */

  function ligarInteracao(raiz, ctx, api, o, est) {
    function alvoEm(x, y) {
      var e = document.elementFromPoint(x, y);
      return e && e.closest ? e.closest("[data-alvo]") : null;
    }
    function limparSombra() {
      Array.prototype.forEach.call(raiz.querySelectorAll(".inv-cel--sombra-ok, .inv-cel--sombra-nao, .inv-slot--sombra-ok, .inv-slot--sombra-nao"), function (c) {
        c.classList.remove("inv-cel--sombra-ok", "inv-cel--sombra-nao", "inv-slot--sombra-ok", "inv-slot--sombra-nao");
      });
    }
    /* A sombra da peça inteira onde ela cairia, verde ou vermelha. */
    function sombra(alvo) {
      limparSombra();
      if (!sel || !alvo || !raiz.contains(alvo)) return;
      var ref = refDe(est, sel.uid);
      if (!ref) return;
      var d = destinoDoAlvo(est, ref, alvo);
      if (!d) return;
      var ok = !d.erro && G().cabe(est, ref, d).ok;
      if (alvo.dataset.alvo === "slot" || alvo.dataset.alvo === "faixa") { alvo.classList.add(ok ? "inv-slot--sombra-ok" : "inv-slot--sombra-nao"); return; }
      var rec = alvo.dataset.rec;
      var pts;
      if (d.erro || !d.forma) {
        pts = [[parseInt(alvo.dataset.x, 10), parseInt(alvo.dataset.y, 10)]];
      } else {
        var cel = G().celulasDe(d);
        pts = cel.cheias.concat(cel.meia ? [cel.meia] : []);
        if (!pts.length) pts = [[parseInt(alvo.dataset.x, 10), parseInt(alvo.dataset.y, 10)]];
      }
      pts.forEach(function (c) {
        var e = raiz.querySelector('[data-alvo="celula"][data-rec="' + CSS.escape(rec) + '"][data-x="' + c[0] + '"][data-y="' + c[1] + '"]');
        if (e) e.classList.add(ok ? "inv-cel--sombra-ok" : "inv-cel--sombra-nao");
      });
    }

    function pegar(peca, alvo) {
      var ref = refDe(est, peca.dataset.uid);
      if (!ref) return null;
      var cel = alvo && alvo.dataset.alvo === "celula" ? [parseInt(alvo.dataset.x, 10), parseInt(alvo.dataset.y, 10)] : null;
      if (!sel || sel.uid !== ref.uid) selecionar(est, ref, cel);
      else if (cel && ref.lugar && ref.lugar.local === "grade") sel.grab = [cel[0] - ref.lugar.x, cel[1] - ref.lugar.y];
      return ref;
    }

    raiz.addEventListener("click", function (ev) {
      if (suprimirClique) { suprimirClique = false; return; }
      if (ev.target.closest("[data-uid], [data-alvo]")) mensagem = null;
      var peca = ev.target.closest("[data-uid]");
      var alvo = ev.target.closest("[data-alvo]");
      if (sel) {
        /* tocar na própria peça cancela */
        if (peca && peca.dataset.uid === sel.uid) { sel = null; api.redesenhar(); return; }
        if (alvo && raiz.contains(alvo)) {
          var ref = refDe(est, sel.uid);
          if (!ref) { sel = null; api.redesenhar(); return; }
          tentarMover(ctx, api, o, est, ref, destinoDoAlvo(est, ref, alvo));
          api.redesenhar();
          return;
        }
        if (peca) { sel = null; pegar(peca, alvo); api.redesenhar(); }
        return;
      }
      if (peca) { pegar(peca, alvo); api.redesenhar(); }
    });

    /* Computador: segurar, arrastar e soltar. */
    raiz.addEventListener("pointerdown", function (ev) {
      if (ev.pointerType !== "mouse" || ev.button !== 0) return;
      var peca = ev.target.closest("[data-uid]");
      if (!peca) return;
      mensagem = null;
      arraste = { peca: peca, alvo: ev.target.closest("[data-alvo]"), x0: ev.clientX, y0: ev.clientY, ativo: false, id: ev.pointerId };
    });
    raiz.addEventListener("pointermove", function (ev) {
      if (ev.pointerType !== "mouse") return;
      if (arraste && !arraste.ativo && Math.hypot(ev.clientX - arraste.x0, ev.clientY - arraste.y0) > 5) {
        arraste.ativo = true;
        var ref = pegar(arraste.peca, arraste.alvo);
        if (!ref) { arraste = null; return; }
        try { raiz.setPointerCapture(arraste.id); } catch (e) { /* segue sem captura */ }
        raiz.classList.add("inv--arrastando");
        Array.prototype.forEach.call(raiz.querySelectorAll('[data-uid="' + CSS.escape(ref.uid) + '"]'), function (c) { c.classList.add("inv-cel--selecionada"); });
      }
      if ((arraste && arraste.ativo) || (sel && !arraste)) sombra(alvoEm(ev.clientX, ev.clientY));
    });
    raiz.addEventListener("pointerup", function (ev) {
      if (!arraste) return;
      var a = arraste;
      arraste = null;
      raiz.classList.remove("inv--arrastando");
      if (!a.ativo) return;   /* foi um clique: o click cuida */
      suprimirClique = true;
      setTimeout(function () { suprimirClique = false; }, 0);
      var alvo = alvoEm(ev.clientX, ev.clientY);
      var ref = sel && refDe(est, sel.uid);
      if (!ref || !alvo || !raiz.contains(alvo)) { sel = null; api.redesenhar(); return; }
      if (!tentarMover(ctx, api, o, est, ref, destinoDoAlvo(est, ref, alvo))) sel = null;  /* no arraste, recusado volta para a origem */
      api.redesenhar();
    });
    raiz.addEventListener("pointerleave", function () { if (!arraste) limparSombra(); });

    /* Slots: clique direito e toque prolongado. */
    raiz.addEventListener("contextmenu", function (ev) {
      var slot = ev.target.closest('[data-alvo="slot"]');
      if (!slot) return;
      ev.preventDefault();
      if (pressao && pressao.abriu) return;
      menuDoSlot(ctx, api, o, slot.dataset.slot);
    });
    raiz.addEventListener("pointerdown", function (ev) {
      if (ev.pointerType === "mouse") return;
      var slot = ev.target.closest('[data-alvo="slot"]');
      if (!slot) return;
      pressao = { x: ev.clientX, y: ev.clientY, abriu: false, relogio: setTimeout(function () {
        if (!pressao) return;
        pressao.abriu = true;
        suprimirClique = true;
        menuDoSlot(ctx, api, o, slot.dataset.slot);
      }, 550) };
    });
    function soltarPressao(ev) {
      if (!pressao) return;
      if (ev && ev.type === "pointermove" && Math.hypot(ev.clientX - pressao.x, ev.clientY - pressao.y) < 10) return;
      clearTimeout(pressao.relogio);
      var abriu = pressao.abriu;
      pressao = null;
      if (abriu) setTimeout(function () { suprimirClique = false; }, 400);
    }
    raiz.addEventListener("pointerup", soltarPressao);
    raiz.addEventListener("pointercancel", soltarPressao);
    raiz.addEventListener("pointermove", function (ev) { if (ev.pointerType !== "mouse") soltarPressao(ev); });

    raiz.addEventListener("keydown", function (ev) {
      if (!sel) return;
      if (ev.key === "r" || ev.key === "R") { ev.preventDefault(); girar(); api.redesenhar(); }
      else if (ev.key === "e" || ev.key === "E") { ev.preventDefault(); espelhar(); api.redesenhar(); }
      else if (ev.key === "Escape") { sel = null; api.redesenhar(); }
    });
  }

  /* ---------------- o painel ---------------- */

  function painel(ctx, api) {
    var o = api.o;
    var inv = ctx.ficha.inventario;
    if (!G() || !R()) return null;
    var est = montar(o, inv);
    if (reconciliar(ctx, api, o, est)) est = montar(o, inv);
    nomesDeRecipiente = {};
    Object.keys(est.grades).forEach(function (k) { nomesDeRecipiente[k] = est.grades[k].nome; });
    if (sel && !refDe(est, sel.uid)) sel = null;
    var cap = est.capacidade;
    var g = cap.grade || { B: 0, S: 0, segurado: 0 };
    /* A mensagem fica até o próximo gesto (um redesenho a mais não a apaga). */
    var msg = mensagem;

    var pendentes = est.pendentes;
    var raiz = el("div.inv-em-grade", { class: sel ? "inv--com-selecao" : "" }, [
      el("p.inv-resumo", {}, [
        el("strong", { texto: "Carga efetiva " + I().rotuloEspacos(cap.ocupado) }),
        el("span", { texto: " · sem penalidade até " + cap.limite + " · máximo " + cap.maximo + " espaços" }),
        g.segurado ? el("span.t-mini", { texto: " (" + I().rotuloEspacos(g.segurado) + " seguro(s) nas mãos não conta)" }) : null,
        el("span.t-mini.inv-resumo__conta", { texto: "B " + g.B + " · grade principal 2 × B = " + g.principal + (g.somaMochilas ? " · mochilas +" + g.S + (g.S !== g.somaMochilas ? " (de " + g.somaMochilas + ")" : "") : "") }),
      ]),
      cap.sobrecarregado ? el("p.t-mini.t-aviso", { role: "status", texto: cap.acimaDoMaximo ? "Acima do máximo: tire peso antes de guardar mais." : "Sobrecarregado: as penalidades de carga valem." }) : null,
      msg ? el("p.inv-mensagem", { role: msg.erro ? "alert" : "status", class: msg.erro ? "inv-mensagem--erro" : "", texto: msg.texto }) : el("p.inv-mensagem.so-leitor", { role: "status" }),
      barraDeForma(ctx, api, o, est),
      el("div.inv-area", {}, [
        desenharCorpo(est, o),
        el("div.inv-recipientes", {}, Object.keys(est.grades).map(function (k) { return desenharGrade(est, est.grades[k], o); })),
      ]),
      pendentes.length ? el("section.inv-pendentes", { "aria-label": "A organizar" }, [
        el("h4.inv-recipiente__nome", { texto: "A organizar (" + pendentes.length + ")" }),
        el("p.t-mini", { texto: "Sem lugar agora (contam na carga). Pegue cada um e escolha uma célula ou um slot. Aqui não se guarda nada novo." }),
        el("div.inv-faixa", {}, pendentes.map(function (r) { return chip(r, r.motivo); })),
        el("button.r-botao.r-botao--mini", { type: "button", texto: "Tentar encaixar sozinho", onclick: function () {
          var e2 = montar(o, inv);
          var lista = e2.pendentes.slice();
          var n = G().organizar(e2, lista, { corpoPrimeiro: false });
          lista.forEach(function (r) { if (r.lugar && r.lugar.local !== "pendente") { G().gravarUnidade(r); G().sincronizar(r.item); } });
          mensagem = { texto: n ? n + " item(ns) encaixado(s)." : "Nenhum coube: libere espaço ou mude formas.", erro: !n };
          api.aoMudar(); api.redesenhar();
        } }),
      ]) : null,
    ]);
    ligarInteracao(raiz, ctx, api, o, est);
    return UI.painel("Inventário em grade", raiz, { classe: "ordem-painel-grade" });
  }

  /* Pode entrar um item novo (criar, biblioteca, duplicar)? Cabe em
     algum lugar e não leva a carga acima do máximo — a pendência não é
     depósito. Devolve null (pode) ou o motivo. */
  function motivoParaRecusar(ctx, o, novo) {
    if (!novo || !R() || !R().gradeLigada(o)) return null;
    var inv = ctx.ficha.inventario;
    var teste = { itens: (inv.itens || []).concat([novo]) };
    var cap = R().capacidade(o, teste);
    if (cap.acimaDoMaximo && cap.ocupado > R().capacidade(o, inv).ocupado) return "A carga passaria do máximo (" + I().rotuloEspacos(cap.ocupado) + " de " + cap.maximo + " espaços). Tire peso antes de adicionar.";
    var est = montar(o, teste);
    var refs = est.unidades.filter(function (u) { return u.item === novo; });
    var faltou = refs.filter(function (r) { return G().organizar(est, [r], { corpoPrimeiro: false }) === 0; });
    if (faltou.length) return "Não há lugar na grade para " + (novo.nome || "o item") + " (" + faltou.length + " de " + refs.length + " unidade(s)). Abra espaço ou reorganize antes de adicionar.";
    return null;
  }

  function lugarDoItem(ctx, o, item) {
    if (!R() || !R().gradeLigada(o) || !G()) return "";
    var us = item.ordem && item.ordem.grade && item.ordem.grade.unidades || [];
    if (!us.length) return "";
    var est = montar(o, ctx.ficha.inventario);
    nomesDeRecipiente = {};
    Object.keys(est.grades).forEach(function (k) { nomesDeRecipiente[k] = est.grades[k].nome; });
    var textos = est.unidades.filter(function (u) { return u.item === item; }).map(function (u) { return descreverLugar(o, u.lugar); });
    var cont = {};
    textos.forEach(function (t) { cont[t] = (cont[t] || 0) + 1; });
    return Object.keys(cont).map(function (t) { return (cont[t] > 1 ? cont[t] + "× " : "") + t; }).join("; ");
  }

  global.RAMAFichaGrade = {
    painel: painel,
    motivoParaRecusar: motivoParaRecusar,
    lugarDoItem: lugarDoItem,
    montar: montar,
    /* para os testes */
    _sel: function () { return sel; },
    _limpar: function () { sel = null; mensagem = null; arraste = null; },
  };
})(window);
