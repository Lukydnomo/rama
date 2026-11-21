/* =====================================================================
   R.A.M.A. — movimento (v9.17)
   ---------------------------------------------------------------------
   A linguagem de movimento do Modern20, num lugar só. Pequeno de
   propósito: as telas pedem o movimento que a PESSOA provocou (trocar de
   aba, abrir um recolhível, fechar uma janela, mudar um recurso) e este
   módulo decide se ele acontece e como.

   O QUE ELE GARANTE
   - Só no Modern20 e só com movimento liberado: no Legacy, ou com
     prefers-reduced-motion (inclusive se a preferência mudar com a página
     aberta), toda função aplica o estado final na hora e devolve uma
     promessa já resolvida. O Legacy não muda em nada.
   - Interrompível: cada elemento tem CANAIS ("altura", "entrada"…). Um
     movimento novo no mesmo canal parte do estado visual de AGORA e
     cancela o anterior — nada enfileira, nada volta ao começo.
   - Nada depende de um evento que pode não vir: toda promessa resolve UMA
     vez, no fim, no cancelamento ou num prazo de segurança.
   - Apresentação, nunca dado: nenhuma função grava, pede ou decide
     sucesso. Quem chama já fez o que tinha de fazer antes de animar.

   AS DURAÇÕES E CURVAS moram em css/modern20/tokens.css (--m20-mov-*,
   --m20-curva-*); aqui elas são lidas, não repetidas.

   PONTOS DE INTEGRAÇÃO (docs/INTERFACE.md, "Movimento")
     M.entrar(el, { de })            o conteúdo que acabou de ser trocado
     M.altura(el, abrir, aoFim)      abrir/fechar com altura medida
     M.sair(el, { ... })             saída antes de remover (janela, aviso)
     M.destacar(el)                  um valor que mudou
     M.lembrar(raiz) / M.continuar(raiz, foto)
                                     barras e números que atravessam um
                                     redesenho sem recontar desde zero
     M.flip(itens, mudar)            reposicionar poucos itens
     M.apresentar(el)                a primeira apresentação de uma lista
   E, sem pedir nada à tela: o indicador e o painel das abas (.r-abas),
   os <details> que abrem com altura, e a inclinação das capas.
   ===================================================================== */

(function (global) {
  "use strict";

  var doc = global.document;
  var raiz = doc && doc.documentElement;

  /* ---------- quando ---------- */

  var consultaReduzida = null;
  try { consultaReduzida = global.matchMedia ? global.matchMedia("(prefers-reduced-motion: reduce)") : null; } catch (e) { consultaReduzida = null; }
  var consultaPonteiro = null;
  try { consultaPonteiro = global.matchMedia ? global.matchMedia("(hover: hover) and (pointer: fine)") : null; } catch (e) { consultaPonteiro = null; }

  function modern20() { return !!raiz && raiz.getAttribute("data-interface") === "modern20"; }
  function reduzido() { return !!(consultaReduzida && consultaReduzida.matches); }
  /* O movimento acontece? Modern20, movimento liberado e a API disponível. */
  function ativo() { return modern20() && !reduzido() && !!(raiz && typeof raiz.animate === "function"); }

  /* ---------- tokens ---------- */

  var PADRAO = { toque: 100, estado: 150, navegar: 200, janela: 240, especial: 340, mola: 360 };
  var CURVAS = {
    sair: "cubic-bezier(0.16, 1, 0.3, 1)",
    mover: "cubic-bezier(0.3, 0, 0, 1)",
    fechar: "cubic-bezier(0.4, 0, 1, 1)",
  };

  function css(nome) {
    try { return global.getComputedStyle(raiz).getPropertyValue(nome).trim(); } catch (e) { return ""; }
  }
  function ms(nome) {
    var v = css("--m20-mov-" + nome);
    var n = parseFloat(v);
    if (!isFinite(n)) return PADRAO[nome] || 180;
    return /ms$/.test(v) ? n : (/s$/.test(v) ? n * 1000 : n);
  }
  function curva(nome) { return css("--m20-curva-" + nome) || CURVAS[nome] || CURVAS.mover; }

  /* ---------- o registro dos movimentos ---------- */

  /* elemento → { canal: { animacao, fim } }; e o conjunto do que está
     rodando, para parar tudo de uma vez (troca de estilo, movimento
     reduzido ligado no meio). */
  var porElemento = typeof WeakMap !== "undefined" ? new WeakMap() : null;
  var rodando = [];

  function canais(el) {
    if (!porElemento) return {};
    var c = porElemento.get(el);
    if (!c) { c = {}; porElemento.set(el, c); }
    return c;
  }

  function parar(el, canal) {
    var c = canais(el);
    var atual = c[canal];
    if (!atual) return;
    delete c[canal];
    try { atual.animacao.cancel(); } catch (e) { /* já terminou */ }
    atual.fim();
  }

  function pararTudo() {
    var lista = rodando.slice();
    rodando = [];
    lista.forEach(function (r) {
      try { r.animacao.cancel(); } catch (e) { /* já terminou */ }
      r.fim();
    });
  }

  /* Anima `el` no `canal`, cancelando o que estava lá. A promessa resolve
     uma vez: no fim, no cancelamento ou no prazo (duração + folga), o que
     vier primeiro. `aoFim(terminou)` roda junto, uma vez. */
  function animar(el, canal, quadros, opcoes) {
    var o = opcoes || {};
    if (!el || !ativo() || typeof el.animate !== "function") {
      if (o.aoFim) o.aoFim(false);
      return Promise.resolve(false);
    }
    parar(el, canal);
    var duracao = o.duracao || ms("navegar");
    var animacao;
    try {
      animacao = el.animate(quadros, { duration: duracao, easing: o.curva || curva("mover"), delay: o.atraso || 0, fill: o.preencher || "none" });
    } catch (e) {
      if (o.aoFim) o.aoFim(false);
      return Promise.resolve(false);
    }
    return new Promise(function (resolver) {
      var feito = false;
      var prazo = null;
      var registro = { animacao: animacao, fim: function () { terminar(false); } };
      function terminar(completo) {
        if (feito) return;
        feito = true;
        clearTimeout(prazo);
        var c = canais(el);
        if (c[canal] === registro) delete c[canal];
        var i = rodando.indexOf(registro);
        if (i >= 0) rodando.splice(i, 1);
        if (o.aoFim) { try { o.aoFim(completo); } catch (e) { /* quem chamou cuida */ } }
        resolver(completo);
      }
      canais(el)[canal] = registro;
      rodando.push(registro);
      animacao.onfinish = function () { terminar(true); };
      animacao.oncancel = function () { terminar(false); };
      prazo = setTimeout(function () { terminar(true); }, duracao + (o.atraso || 0) + 120);
    });
  }

  /* ---------- entrada do conteúdo trocado ----------
     de: "baixo" (padrão), "direita", "esquerda" ou "nada" (só a opacidade).
     Só transform e opacity. */
  function entrar(el, opcoes) {
    var o = opcoes || {};
    var d = parseFloat(css("--m20-desloc-curto")) || 4;
    var de = o.de === "direita" ? "translateX(" + d * 2 + "px)" : o.de === "esquerda" ? "translateX(" + -d * 2 + "px)" : o.de === "nada" ? "none" : "translateY(" + d + "px)";
    return animar(el, "entrada", [{ opacity: 0, transform: de }, { opacity: 1, transform: "none" }],
      { duracao: o.duracao || ms("navegar"), curva: curva("sair"), atraso: o.atraso });
  }

  /* ---------- saída antes de remover ---------- */
  function sair(el, opcoes) {
    var o = opcoes || {};
    var d = parseFloat(css("--m20-desloc-curto")) || 4;
    var para = o.para || "translateY(" + d + "px)";
    return animar(el, "saida", [{ opacity: 1, transform: "none" }, { opacity: 0, transform: para }],
      { duracao: o.duracao || ms("estado"), curva: curva("fechar"), preencher: "forwards" });
  }

  /* ---------- altura ----------
     abrir: a altura vai da ATUAL à natural; fechar: da atual a `ate` (ou
     0). Interrompível: um pedido no meio parte da altura que está na
     tela. No fim, nenhuma altura fixa fica para trás. */
  function altura(el, abrir, opcoes) {
    var o = opcoes || {};
    if (!el) return Promise.resolve(false);
    var antes = el.getBoundingClientRect().height;
    parar(el, "altura");
    if (!ativo()) { if (o.aoFim) o.aoFim(false); return Promise.resolve(false); }
    var guardado = el.style.overflow;
    if (o.preparar) o.preparar();
    var depois;
    if (abrir) {
      el.style.height = "";
      depois = el.getBoundingClientRect().height;
    } else depois = o.ate || 0;
    if (Math.abs(depois - antes) < 1) { if (o.aoFim) o.aoFim(true); return Promise.resolve(true); }
    el.style.overflow = "hidden";
    return animar(el, "altura", [{ height: antes + "px" }, { height: depois + "px" }], {
      duracao: o.duracao || ms("navegar"), curva: curva("mover"),
      aoFim: function (completo) {
        el.style.overflow = guardado;
        if (o.aoFim) o.aoFim(completo);
      },
    });
  }

  /* ---------- destaque de um valor que mudou ----------
     O número já está certo na tela; o destaque só chama o olho. */
  function destacar(el) {
    if (!el) return Promise.resolve(false);
    var cor = css("--m20-destaque-valor") || "transparent";
    return animar(el, "destaque", [
      { backgroundColor: cor },
      { backgroundColor: "transparent" },
    ], { duracao: ms("especial") * 2, curva: curva("sair") });
  }

  /* ---------- continuidade num redesenho ----------
     Antes de trocar uma região: lembrar(raiz) guarda a largura das barras
     e o texto dos valores marcados. Depois: continuar(raiz, foto) leva cada
     barra da largura antiga à nova e destaca o valor que mudou. O número
     novo já está escrito; nada conta desde zero. */
  var BARRAS = "[data-recurso] .ordem-recurso__barra > span, [data-resumo-recurso], .status__preenche";
  var VALORES = "[data-resumo-recurso] .ordem-resumo__atual";

  function chave(no, i) {
    var r = no.closest ? no.closest("[data-recurso], [data-resumo-recurso]") : null;
    if (r) return (r.dataset.recurso ? "r:" : "s:") + (r.dataset.recurso || r.dataset.resumoRecurso);
    return "i:" + i;
  }

  function lembrar(regiao) {
    if (!regiao || !ativo()) return null;
    var foto = { barras: {}, valores: {} };
    Array.prototype.forEach.call(regiao.querySelectorAll(BARRAS), function (b, i) {
      if (b.hasAttribute("data-resumo-recurso")) return;
      foto.barras[chave(b, i)] = b.style.width || "";
    });
    Array.prototype.forEach.call(regiao.querySelectorAll(VALORES), function (v, i) { foto.valores[chave(v, i)] = v.textContent; });
    return foto;
  }

  function continuar(regiao, foto) {
    if (!regiao || !foto || !ativo()) return;
    Array.prototype.forEach.call(regiao.querySelectorAll(BARRAS), function (b, i) {
      if (b.hasAttribute("data-resumo-recurso")) return;
      var k = chave(b, i);
      var antes = foto.barras[k];
      if (antes === undefined || antes === b.style.width || !b.style.width) return;
      animar(b, "barra", [{ width: antes }, { width: b.style.width }], { duracao: ms("navegar"), curva: curva("mover") });
    });
    Array.prototype.forEach.call(regiao.querySelectorAll(VALORES), function (v, i) {
      var k = chave(v, i);
      if (foto.valores[k] !== undefined && foto.valores[k] !== v.textContent) destacar(v);
    });
  }

  /* ---------- FLIP para poucos itens ----------
     mudar() faz a mudança de verdade (síncrona); depois, cada item que
     continua na tela desliza da posição antiga para a nova. */
  function flip(itens, mudar) {
    var lista = Array.prototype.slice.call(itens || []).slice(0, 40);
    var antes = ativo() ? lista.map(function (x) { return x.getBoundingClientRect(); }) : null;
    mudar();
    if (!antes) return;
    var depois = lista.map(function (x) { return x.isConnected ? x.getBoundingClientRect() : null; });
    lista.forEach(function (x, i) {
      var d = depois[i];
      if (!d) return;
      var dx = antes[i].left - d.left, dy = antes[i].top - d.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      animar(x, "flip", [{ translate: dx + "px " + dy + "px" }, { translate: "0 0" }], { duracao: ms("navegar"), curva: curva("mover") });
    });
  }

  /* ---------- primeira apresentação ----------
     Os primeiros poucos itens de uma lista entram em escada curta; o resto
     aparece junto, sem esperar. Uma vez por elemento: redesenhar a lista
     depois não repete. */
  var apresentados = typeof WeakSet !== "undefined" ? new WeakSet() : null;
  function apresentar(lista, opcoes) {
    var o = opcoes || {};
    if (!lista || !ativo() || (apresentados && apresentados.has(lista))) return;
    if (apresentados) apresentados.add(lista);
    var filhos = Array.prototype.slice.call(lista.children).slice(0, o.limite || 8);
    filhos.forEach(function (f, i) { entrar(f, { atraso: Math.min(i * 24, 160), duracao: ms("navegar") }); });
  }

  /* =================================================================
     SEM PEDIR NADA À TELA
     -----------------------------------------------------------------
     Três comportamentos por DELEGAÇÃO de evento (um ouvinte no
     documento, sem observar mutações): só reagem ao gesto da pessoa, e
     só no Modern20 com movimento liberado.
     ================================================================= */

  /* ---------- abas: o indicador corre e só o painel novo entra ----------
     No clique, guarda onde estava a aba selecionada; depois que a tela
     trocou (a lista pode ter sido redesenhada inteira), acha a lista no
     mesmo lugar e desliza um traço da posição antiga à nova. O traço
     próprio da aba nova espera o deslizamento acabar. */
  var LISTA_DE_ABAS = ".r-abas, [role='tablist']:not(.perfil-nav)";
  var deslizando = null;

  function abaSelecionada(lista) {
    return lista ? lista.querySelector(".r-aba[aria-selected='true'], .r-aba[aria-pressed='true'], [role='tab'][aria-selected='true']") : null;
  }

  function aoClicarAba(ev) {
    if (!ativo() || ev.button > 0 || ev.defaultPrevented) return;
    var aba = ev.target && ev.target.closest ? ev.target.closest(".r-aba, [role='tab']") : null;
    var lista = aba && aba.closest(LISTA_DE_ABAS);
    if (!lista || lista.closest(".perfil-nav, .pastas-laterais")) return;
    var antiga = deslizando && deslizando.isConnected ? deslizando : abaSelecionada(lista);
    if (!antiga || antiga === aba) return;
    var r0 = antiga.getBoundingClientRect();
    var rl = lista.getBoundingClientRect();
    var vertical = lista.getAttribute("aria-orientation") === "vertical";
    /* Depois do clique, quando a tela já trocou: no fim da propagação
       (window, fase de bolha) ou, se alguém parou o evento, logo depois. */
    var feito = false;
    function seguir() {
      if (feito) return;
      feito = true;
      global.removeEventListener("click", seguir, false);
      var novaLista = lista.isConnected ? lista : listaNoMesmoLugar(rl);
      var nova = abaSelecionada(novaLista);
      if (!nova || nova === antiga) return;
      deslizar(novaLista, r0, nova, vertical);
      painelDaAba(nova, r0);
    }
    aba.addEventListener("click", seguir, { once: true });
    global.addEventListener("click", seguir, false);
    setTimeout(seguir, 0);
  }

  /* A tela redesenhou a lista inteira: a nova é a que está no mesmo
     lugar (o centro mais próximo do da antiga, a poucos pixels). */
  function listaNoMesmoLugar(rl) {
    var cx = rl.left + rl.width / 2, cy = rl.top + rl.height / 2;
    var melhor = null, menor = 48;
    Array.prototype.forEach.call(doc.querySelectorAll(LISTA_DE_ABAS), function (l) {
      var r = l.getBoundingClientRect();
      var d = Math.abs(r.left + r.width / 2 - cx) + Math.abs(r.top + r.height / 2 - cy);
      if (d < menor) { menor = d; melhor = l; }
    });
    return melhor;
  }

  function deslizar(lista, r0, nova, vertical) {
    var r1 = nova.getBoundingClientRect();
    if (!r1.width || !r0.width) return;
    var traco = deslizando && deslizando.isConnected ? deslizando : null;
    var de = r0;
    if (traco) { de = traco.getBoundingClientRect(); parar(traco, "abas"); traco.remove(); }
    traco = doc.createElement("span");
    traco.className = "m20-traco-aba";
    traco.setAttribute("aria-hidden", "true");
    doc.body.appendChild(traco);
    var esp = vertical ? 0 : 2;
    var base = { top: (vertical ? r1.top : r1.bottom - esp) + global.scrollY, left: r1.left + global.scrollX };
    traco.style.top = base.top + "px";
    traco.style.left = base.left + "px";
    traco.style.width = (vertical ? 3 : r1.width) + "px";
    traco.style.height = (vertical ? r1.height : esp) + "px";
    var dx = de.left - r1.left;
    var dy = vertical ? de.top - r1.top : 0;
    var sx = vertical ? 1 : (de.width / r1.width);
    var sy = vertical ? (de.height / r1.height) : 1;
    deslizando = traco;
    nova.classList.add("m20-aba--chegando");
    animar(traco, "abas", [
      { transform: "translate(" + dx + "px, " + dy + "px) scale(" + sx + ", " + sy + ")" },
      { transform: "none" },
    ], { duracao: ms("navegar"), curva: curva("mover"), aoFim: function () {
      nova.classList.remove("m20-aba--chegando");
      if (traco.parentNode) traco.parentNode.removeChild(traco);
      if (deslizando === traco) deslizando = null;
    } });
  }

  /* Só a área substituída entra: o painel da aba (aria-controls) ou o
     painel irmão da lista. */
  function painelDaAba(nova, r0) {
    var id = nova.getAttribute("aria-controls");
    var painel = id ? doc.getElementById(id) : null;
    if (!painel) return;
    var r1 = nova.getBoundingClientRect();
    entrar(painel, { de: r1.left < r0.left ? "esquerda" : "direita", duracao: ms("navegar") });
  }

  /* ---------- <details>: abrir e fechar com altura ----------
     O clique no <summary> continua sendo o do navegador para teclado,
     leitor de tela e busca; aqui só a forma de chegar lá muda. Abrir:
     open já, e a altura cresce. Fechar: a altura encolhe e o open cai no
     fim. Clicar de novo no meio inverte a partir de onde está. O
     aria-expanded acompanha a INTENÇÃO, na hora. */
  var fechando = typeof WeakMap !== "undefined" ? new WeakMap() : null;

  function alturaFechada(det, resumo) {
    var s = global.getComputedStyle(det);
    return resumo.getBoundingClientRect().height + parseFloat(s.paddingTop) + parseFloat(s.paddingBottom) +
      parseFloat(s.borderTopWidth) + parseFloat(s.borderBottomWidth);
  }

  function aoClicarResumo(ev) {
    if (!ativo() || ev.defaultPrevented || ev.button > 0) return;
    var resumo = ev.target && ev.target.closest ? ev.target.closest("summary") : null;
    var det = resumo && resumo.parentElement;
    if (!det || det.tagName !== "DETAILS" || det.firstElementChild !== resumo || det.closest("[data-sem-movimento]")) return;
    /* Um controle dentro do resumo (link, botão sem preventDefault) segue o dele. */
    var interno = ev.target.closest("a, button, input, select, textarea, label");
    if (interno && resumo.contains(interno) && interno !== resumo) return;
    ev.preventDefault();
    var indoFechar = fechando && fechando.get(det);
    var abrir = !det.open || indoFechar;
    if (abrir) {
      if (fechando) fechando.delete(det);
      resumo.setAttribute("aria-expanded", "true");
      if (!det.open) {
        var h0 = det.getBoundingClientRect().height;
        det.style.height = h0 + "px";
        det.open = true;
      }
      altura(det, true, { aoFim: function (completo) { if (completo || !det.open) det.style.height = ""; } }).then(function () {
        if (!(fechando && fechando.get(det))) det.style.height = "";
      });
    } else {
      if (fechando) fechando.set(det, true);
      resumo.setAttribute("aria-expanded", "false");
      altura(det, false, { ate: alturaFechada(det, resumo) }).then(function (completo) {
        if (fechando && !fechando.get(det)) return;   // reaberto no meio
        if (fechando) fechando.delete(det);
        det.open = false;
        det.style.height = "";
        if (!completo && !det.isConnected) return;
      });
    }
  }

  /* ---------- capas: inclinação leve sob o mouse ----------
     Só com ponteiro fino e hover. A inclinação vai na propriedade
     `rotate` (que compõe com o `transform` que as capas já usam para
     subir) e volta ao repouso ao sair. */
  var CAPAS = ".capa-sistema";
  var inclinada = null;

  function aoMoverSobreCapa(ev) {
    if (!ativo() || !(consultaPonteiro && consultaPonteiro.matches)) return;
    var capa = ev.target && ev.target.closest ? ev.target.closest(CAPAS) : null;
    if (inclinada && inclinada !== capa) soltarCapa();
    if (!capa) return;
    var r = capa.getBoundingClientRect();
    if (!r.width || !r.height) return;
    var nx = (ev.clientX - r.left) / r.width - 0.5;
    var ny = (ev.clientY - r.top) / r.height - 0.5;
    var max = parseFloat(css("--m20-inclinacao")) || 6;
    var ang = Math.min(1, Math.sqrt(nx * nx + ny * ny) * 1.6) * max;
    inclinada = capa;
    capa.classList.add("m20-capa--inclinada");
    capa.style.rotate = (-ny).toFixed(3) + " " + nx.toFixed(3) + " 0 " + ang.toFixed(2) + "deg";
  }

  function soltarCapa() {
    if (!inclinada) return;
    inclinada.style.rotate = "";
    inclinada.classList.remove("m20-capa--inclinada");
    inclinada = null;
  }

  /* ---------- interruptores: um movimento só, contínuo ----------
     A referência é o Switch do Animate UI: a bola desliza com uma mola
     curta e estica enquanto o dedo/mouse aperta (CSS, tokens.css e
     componentes.css). O problema é que várias telas redesenham o cartão
     inteiro ao ligar uma regra — o interruptor novo é OUTRO elemento, e
     a transição recomeçaria do zero (ou pularia para o fim: o "flick").
     Então, só para o interruptor clicado e só durante o movimento: a
     cada quadro guarda onde a bola e a cor do trilho ESTÃO; quando um
     elemento novo aparece no lugar (um redesenho, ou dois), ele nasce
     exatamente nesse ponto e a MESMA transição CSS segue dali até o fim.
     Nada é animado por cima; quem anima é sempre a transição do CSS,
     que o próprio navegador interrompe e retoma sem saltos. */
  var BOLA = ".r-interruptor__bola";

  function visualDo(chave) {
    var b = chave.querySelector(BOLA);
    if (!b) return null;
    return { transform: global.getComputedStyle(b).transform, fundo: global.getComputedStyle(chave).backgroundColor };
  }

  function nascerDe(chave, v) {
    var b = chave.querySelector(BOLA);
    if (!b || !v) return;
    b.style.transition = "none";
    chave.style.transition = "none";
    b.style.transform = v.transform === "none" ? "none" : v.transform;
    chave.style.backgroundColor = v.fundo;
    void chave.offsetWidth;
    b.style.transition = "";
    chave.style.transition = "";
    b.style.transform = "";
    chave.style.backgroundColor = "";
  }

  function aoClicarInterruptor(ev) {
    if (!ativo() || ev.button > 0 || ev.defaultPrevented) return;
    var chave = ev.target && ev.target.closest ? ev.target.closest(".r-interruptor") : null;
    if (!chave || chave.disabled) return;
    var foco = chave.getAttribute("data-foco");
    var rc = chave.getBoundingClientRect();
    var atual = chave;
    var visual = visualDo(chave);
    var ate = Date.now() + Math.max(ms("janela"), ms("mola")) + 160;

    function vivo() {
      if (atual.isConnected) return atual;
      var n = foco ? doc.querySelector('.r-interruptor[data-foco="' + foco.replace(/"/g, '\\"') + '"]') : null;
      if (!n) {
        var sob = doc.elementFromPoint(rc.left + rc.width / 2, rc.top + rc.height / 2);
        n = sob && sob.closest ? sob.closest(".r-interruptor") : null;
      }
      return n;
    }
    function conferir() {
      if (!ativo()) return;
      var n = vivo();
      if (n && n !== atual) { nascerDe(n, visual); atual = n; }
      if (n) visual = visualDo(n) || visual;
    }
    function quadro() {
      conferir();
      if (Date.now() < ate) global.requestAnimationFrame(quadro);
    }
    /* No fim da propagação o redesenho síncrono já aconteceu: o novo nasce
       no ponto de partida ANTES da primeira pintura. Depois, um quadro por
       vez até o movimento acabar (redesenhos que chegam depois). */
    /* O próprio interruptor também ouve (fase do alvo, depois do clique
       da tela): um cartão que para a propagação (o cabeçalho de um
       <details>) não deixa o evento chegar à window, e esperar o
       setTimeout deixaria um quadro pintado na posição final — o
       "flick". */
    var feito = false;
    function seguir() {
      if (feito) return;
      feito = true;
      global.removeEventListener("click", seguir, false);
      chave.removeEventListener("click", seguir, false);
      conferir();
      global.requestAnimationFrame(quadro);
    }
    chave.addEventListener("click", seguir, false);
    global.addEventListener("click", seguir, false);
    setTimeout(seguir, 0);
  }

  function ligarDelegacao() {
    if (!doc || !doc.addEventListener) return;
    doc.addEventListener("click", aoClicarInterruptor, true);
    doc.addEventListener("click", aoClicarAba, true);
    doc.addEventListener("click", aoClicarResumo, false);
    doc.addEventListener("pointermove", aoMoverSobreCapa, { passive: true });
    doc.addEventListener("pointerleave", soltarCapa, true);
  }

  /* Trocar de estilo ou ligar o movimento reduzido no meio: tudo para e
     fica no estado final. */
  function aoMudarCondicao() {
    pararTudo();
    soltarCapa();
    Array.prototype.forEach.call(doc.querySelectorAll(".m20-traco-aba"), function (t) { t.remove(); });
    Array.prototype.forEach.call(doc.querySelectorAll(".m20-aba--chegando"), function (a) { a.classList.remove("m20-aba--chegando"); });
    deslizando = null;
  }
  if (consultaReduzida) {
    if (consultaReduzida.addEventListener) consultaReduzida.addEventListener("change", aoMudarCondicao);
    else if (consultaReduzida.addListener) consultaReduzida.addListener(aoMudarCondicao);
  }

  ligarDelegacao();

  global.RAMAMovimento = {
    ativo: ativo,
    reduzido: reduzido,
    ms: ms,
    curva: curva,
    animar: animar,
    parar: parar,
    pararTudo: aoMudarCondicao,
    entrar: entrar,
    sair: sair,
    altura: altura,
    destacar: destacar,
    lembrar: lembrar,
    continuar: continuar,
    flip: flip,
    apresentar: apresentar,
    /* para os testes */
    _rodando: function () { return rodando.length; },
  };
})(typeof window !== "undefined" ? window : globalThis);
