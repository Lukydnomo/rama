/* =====================================================================
   R.A.M.A. — imagem opcional das criações do Homebrew (v9.14)
   ---------------------------------------------------------------------
   Toda criação pode ter UMA imagem da criação inteira — retrato,
   ilustração ou símbolo, conforme o sistema, o tipo e o subtipo
   (RAMAHomebrewAdaptadores.imagemDe). Ela não é campo de regra: custo,
   efeito e o resto continuam onde estão, e a ficha não muda por ela.

   ONDE MORA
     CRIATURAS_IMAGENS (o nome ficou por compatibilidade), pela id do
     registro: a imagem e a MINIATURA que as listas pedem em lote. Um
     retrato antigo sem miniatura serve a imagem inteira — nada precisa
     ser enviado de novo. Num pacote, a cópia guardada na entrada.

   O QUE ESTE MÓDULO DÁ
     campo(opcoes)        o bloco do editor: prévia, Adicionar / Trocar /
                          Remover, o editor do R.A.M.A. Rascunho até
                          salvarEm(id): cancelar ou falhar mantém a
                          imagem anterior
     miniatura(reg, op)   a miniatura da lista, sob demanda (só as linhas
                          que aparecem na tela, em lotes de até 40)
     grande(reg, op)      a imagem maior da consulta
     fonteGrande(reg, op) → () → Promise<dataURL> (o painel de criatura)
     copiar(de, para)     a imagem vai junto na duplicação
     paraFicha(id)        a miniatura de uma criação usada numa ficha
                          (o símbolo de um ritual Homebrew)

   Permissão: o servidor confere o registro a cada pedido (o dono ou o
   público; num pacote, a porta do pacote). Este cache é da página.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el;
  function UI() { return global.RAMAUI; }
  function AD() { return global.RAMAHomebrewAdaptadores; }
  function API() { return global.RAMAApi; }

  var LOTE = 40;
  var LADO_MINIATURA = 128;
  var LIMITE_MINIATURA = 14000;

  /* id → { mini, versao } | null (pedida e sem imagem) */
  var miniaturas = {};
  var grandes = {};
  var naFila = {};
  var esperando = {};
  var fila = [];
  var temporizador = null;
  var servidorSemLote = false;

  /* ---------- capacidade ---------- */

  function capacidade(registro, extra) {
    if (!AD()) return null;
    if (registro) return AD().imagemDoRegistro(Object.assign({}, registro, extra || {}));
    var x = extra || {};
    return AD().imagemDe(x.sistema, x.grupo, x.subtipo, { modeloUniversal: x.modeloUniversal, imagemForma: x.imagemForma });
  }
  function destinoDoEditor(efetiva) { return efetiva === "retrato" ? "criatura" : efetiva === "simbolo" ? "simbolo" : "ilustracao"; }

  /* ---------- miniatura gerada no navegador ---------- */

  function carregarImagem(src) {
    return new Promise(function (ok, falha) {
      var img = new Image();
      img.onload = function () { ok(img); };
      img.onerror = falha;
      img.src = src;
    });
  }
  /* A imagem inteira cabendo em 128 px (sem cortar: símbolo e ilustração
     mantêm a proporção), com o mesmo codificador da foto — transparência
     preservada. */
  async function gerarMiniatura(src) {
    try {
      var img = await carregarImagem(src);
      var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
      if (!w || !h) return "";
      var escala = Math.min(1, LADO_MINIATURA / Math.max(w, h));
      var tela = document.createElement("canvas");
      tela.width = Math.max(1, Math.round(w * escala));
      tela.height = Math.max(1, Math.round(h * escala));
      var c = tela.getContext("2d");
      c.imageSmoothingEnabled = true;
      c.imageSmoothingQuality = "high";
      c.drawImage(img, 0, 0, tela.width, tela.height);
      var r = global.RAMAImagem && global.RAMAImagem.codificar ? global.RAMAImagem.codificar(tela, { limite: LIMITE_MINIATURA }) : { ok: true, imagem: tela.toDataURL("image/webp", 0.8) };
      return r.ok && r.imagem.length <= LIMITE_MINIATURA ? r.imagem : "";
    } catch (e) { return ""; }
  }

  /* ---------- gravar ---------- */

  async function enviar(id, imagem) {
    var mini = imagem ? await gerarMiniatura(imagem) : "";
    var r = await API().salvarImagemCriatura(id, imagem || "", mini || undefined);
    if (r && r.ok) {
      if (imagem) { miniaturas[id] = { mini: mini || imagem, versao: (r.dados && r.dados.atualizadoEm) || String(Date.now()) }; grandes[id] = imagem; }
      else { miniaturas[id] = null; delete grandes[id]; }
      pintarSlotsDe(id);
    }
    return r;
  }

  /* Duplicar: a imagem da original vai para a cópia (outro arquivo,
     porque a cópia é independente). Sem imagem, nada. */
  async function copiar(deId, paraId) {
    if (!deId || !paraId) return { ok: true };
    var r = await API().lerImagemCriatura(deId);
    if (!r.ok) return r;
    var img = r.dados && r.dados.imagem;
    if (!img) return { ok: true };
    return enviar(paraId, img);
  }

  /* ---------- o campo do editor ---------- */

  /* opcoes: { registro, sistema, grupo, subtipo, modeloUniversal,
     imagemForma, aoMudar } — sem registro, uma criação nova. */
  function campo(opcoes) {
    var o = opcoes || {};
    var reg = o.registro || null;
    var forma = reg && reg.imagemForma ? reg.imagemForma : (o.imagemForma || "ilustracao");
    var st = { atual: "", nova: "", removida: false, carregando: !!(reg && reg.id), ocupado: false };
    var raiz = el("div.r-campo.hb-imagem-campo");

    function cap() {
      return capacidade(reg ? Object.assign({}, reg, { imagemForma: forma }) : null,
        reg ? null : { sistema: o.sistema, grupo: o.grupo, subtipo: o.subtipo, modeloUniversal: o.modeloUniversal, imagemForma: forma });
    }
    function visivel() { return st.removida ? "" : (st.nova || st.atual); }

    function pintar() {
      var c = cap();
      if (!c) { U.trocar(raiz, []); return; }
      var src = visivel();
      var rot = c.rotulo;
      var minusc = rot.toLowerCase();
      U.trocar(raiz, [
        el("span.r-rotulo", { texto: rot + " (opcional)" }),
        c.forma === "escolha" ? el("div.filtros__grupo", { role: "group", "aria-label": "Forma da imagem" }, [["ilustracao", "Ilustração"], ["icone", "Ícone"]].map(function (x) {
          return el("button.filtro", { type: "button", "aria-pressed": String(forma === x[0]), texto: x[1], onclick: function () { if (forma !== x[0]) { forma = x[0]; mudou(); pintar(); } } });
        })) : null,
        el("div.hb-imagem-campo__linha", {}, [
          el("div.hb-imagem-campo__previa" + (c.efetiva === "simbolo" ? ".hb-imagem--simbolo" : ""), { "aria-live": "polite" },
            st.carregando ? [UI().carregando("Carregando a imagem", { forma: "imagem", legado: function () { return el("span.t-mini", { texto: "Carregando…" }); } })]
              : src ? [el("img", { src: src, alt: "Prévia: " + minusc })] : [el("span.t-mini", { texto: "Sem " + minusc })]),
          el("div.faixa.hb-imagem-campo__acoes", {}, [
            el("button.r-botao.r-botao--mini", { type: "button", disabled: st.carregando || st.ocupado, texto: src ? "Trocar" : "Adicionar " + minusc,
              "aria-label": (src ? "Trocar " : "Adicionar ") + minusc, onclick: escolher }),
            src ? el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", disabled: st.ocupado, texto: "Remover", "aria-label": "Remover " + minusc,
              onclick: function () { st.nova = ""; st.removida = !!st.atual; mudou(); pintar(); } }) : null,
            (st.nova || st.removida) ? el("span.t-mini", { texto: st.removida ? "Sai ao salvar." : "Entra ao salvar." }) : null,
          ]),
        ]),
        c.efetiva === "simbolo" ? el("p.t-mini", { texto: "O desenho vai inteiro, com o fundo transparente preservado." }) : null,
      ]);
    }
    function mudou() { if (o.aoMudar) o.aoMudar(); }

    async function escolher() {
      var c = cap();
      if (!c || !global.RAMAEditorImagem) return;
      st.ocupado = true; pintar();
      var r;
      try { r = await global.RAMAEditorImagem.escolher(destinoDoEditor(c.efetiva), { titulo: c.rotulo + " · " + ((reg && reg.nome) || "nova criação") }); }
      finally { st.ocupado = false; }
      /* Cancelou ou o arquivo não abriu: fica a imagem que estava. */
      if (r && r.ok && r.imagem) { st.nova = r.imagem; st.removida = false; mudou(); }
      pintar();
    }

    if (reg && reg.id) {
      var ja = grandes[reg.id];
      if (ja !== undefined) { st.atual = ja; st.carregando = false; }
      else API().lerImagemCriatura(reg.id).then(function (r) {
        st.carregando = false;
        st.atual = (r && r.ok && r.dados && r.dados.imagem) || "";
        if (r && r.ok) grandes[reg.id] = st.atual;
        pintar();
      }, function () { st.carregando = false; pintar(); });
    }
    pintar();

    return {
      el: raiz,
      pintar: pintar,
      mudou: function () { return !!(st.nova || st.removida); },
      imagemForma: function () { return cap() && cap().forma === "escolha" ? forma : undefined; },
      /* Depois que o registro foi gravado: sobe (ou remove) a imagem. Uma
         falha mantém a anterior no servidor e o rascunho aqui. */
      salvarEm: async function (id) {
        if (!id || !(st.nova || st.removida)) return { ok: true, nada: true };
        var r = await enviar(id, st.removida ? "" : st.nova);
        if (r && r.ok) { st.atual = st.removida ? "" : st.nova; st.nova = ""; st.removida = false; }
        else UI().avisoAtencao("A criação foi salva, mas a imagem não " + (st.removida ? "foi removida" : "subiu") + ": a anterior continua. Abra o editor e tente de novo.", { duracao: 9000 });
        return r;
      },
    };
  }

  /* ---------- miniaturas da lista (sob demanda, em lote) ---------- */

  var slots = {};   /* id → [elementos] */
  var observador = null;

  function chaveDe(fonte) { return fonte.pacote ? "pc:" + fonte.pacote.id + ":" + fonte.entradaId : fonte.id; }

  function pintarSlot(no) {
    var chave = no.dataset.hbImagem;
    var m = miniaturas[chave];
    if (m === undefined) return;
    var reserva = no._reserva;
    if (m && m.mini) {
      U.trocar(no, [el("img", { src: m.mini, alt: "", loading: "lazy", decoding: "async", draggable: "false" })]);
      no.hidden = false;
      no.classList.add("hb-miniatura--propria");
    } else if (reserva) {
      U.trocar(no, [reserva]);
      no.hidden = false;
    } else {
      no.hidden = true;
    }
    if (no._aoPintar) no._aoPintar(!no.hidden);
  }
  function pintarSlotsDe(chave) {
    (slots[chave] || []).forEach(function (no) { if (no.isConnected) pintarSlot(no); });
    slots[chave] = (slots[chave] || []).filter(function (no) { return no.isConnected; });
  }

  function agendar() {
    clearTimeout(temporizador);
    temporizador = setTimeout(descarregar, 40);
  }
  async function descarregar() {
    var porPacote = {}, ids = [];
    fila.splice(0).forEach(function (f) {
      var k = chaveDe(f);
      delete naFila[k];
      if (miniaturas[k] !== undefined) { pintarSlotsDe(k); return; }
      if (f.pacote) {
        var p = porPacote[f.pacote.id] || (porPacote[f.pacote.id] = { pacote: f.pacote, entradas: [] });
        p.entradas.push(f.entradaId);
      } else ids.push(f.id);
    });
    for (var i = 0; i < ids.length; i += LOTE) await lote(ids.slice(i, i + LOTE));
    for (var pid in porPacote) {
      var p = porPacote[pid];
      for (var j = 0; j < p.entradas.length; j += LOTE) await lotePacote(p.pacote, p.entradas.slice(j, j + LOTE));
    }
  }
  async function lote(ids) {
    if (servidorSemLote || !API().lerMiniaturasHomebrew) { ids.forEach(function (id) { miniaturas[id] = null; pintarSlotsDe(id); }); return; }
    var r = await API().lerMiniaturasHomebrew(ids);
    if (!r || !r.ok) {
      if (r && r.erro === "acao_desconhecida") servidorSemLote = true;
      ids.forEach(function (id) { pintarSlotsDe(id); });
      return;
    }
    ids.forEach(function (id) { var x = r.dados[id]; miniaturas[id] = x ? { mini: x.miniatura, versao: x.versao } : null; pintarSlotsDe(id); });
  }
  async function lotePacote(pacote, entradas) {
    var r = API().lerImagensPacote ? await API().lerImagensPacote(pacote.id, pacote.codigo, entradas, false) : null;
    entradas.forEach(function (e) {
      var k = "pc:" + pacote.id + ":" + e;
      if (r && r.ok) miniaturas[k] = r.dados[e] ? { mini: r.dados[e] } : null;
      pintarSlotsDe(k);
    });
  }

  function pedir(fonte) {
    var k = chaveDe(fonte);
    if (miniaturas[k] !== undefined) { pintarSlotsDe(k); return; }
    if (naFila[k]) return;
    naFila[k] = true;
    fila.push(fonte);
    agendar();
  }

  var pendentes = [];
  var rolagemLigada = false;
  var quadro = 0;
  function conferirPendentes() {
    quadro = 0;
    var altura = global.innerHeight || 800;
    pendentes = pendentes.filter(function (alvo) {
      if (!alvo._fontes || !alvo._fontes.length || !alvo.isConnected) return false;
      var r = alvo.getBoundingClientRect();
      if (r.bottom > -200 && r.top < altura + 200) {
        if (observador) observador.unobserve(alvo);
        alvo._fontes.splice(0).forEach(pedir);
        return false;
      }
      return true;
    });
  }
  function ligarRolagem() {
    if (rolagemLigada) return;
    rolagemLigada = true;
    var agendarConferencia = function () { if (!quadro) quadro = setTimeout(conferirPendentes, 150); };
    global.addEventListener("scroll", agendarConferencia, { passive: true, capture: true });
    global.addEventListener("resize", agendarConferencia, { passive: true });
  }

  function observar(no, fonte) {
    /* Sem observador (ou com a aba em segundo plano, onde ele não dispara),
       pede direto — ainda em lote. */
    if (typeof IntersectionObserver === "undefined" || document.hidden) { pedir(fonte); return; }
    if (!observador) {
      observador = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (en) {
          if (!en.isIntersecting) return;
          observador.unobserve(en.target);
          (en.target._fontes || []).splice(0).forEach(pedir);
        });
      }, { rootMargin: "200px 0px" });
    }
    /* Um espaço oculto não tem tamanho e nunca "aparece": observa-se a
       linha que o contém (a do Homebrew, a entrada do pacote). */
    setTimeout(function () {
      var alvo = (no.closest && no.closest(".hb-linha, .pc-entrada, li, article")) || no.parentNode;
      if (!alvo || !no.isConnected) { pedir(fonte); return; }
      (alvo._fontes || (alvo._fontes = [])).push(fonte);
      observador.observe(alvo);
      /* Reserva: se o observador não disparar (navegador que adia o
         cálculo), a posição na tela decide — um instante depois e a cada
         rolagem (com folga de quadro). */
      pendentes.push(alvo);
      setTimeout(conferirPendentes, 1200);
      ligarRolagem();
    }, 0);
  }

  /* A miniatura ao lado do nome. opcoes: { fonte (pacote), reserva (o
     símbolo oficial/provisório de um ritual), classe }. Sem imagem e sem
     reserva, o espaço some. */
  function miniatura(registro, opcoes) {
    var o = opcoes || {};
    var c = capacidade(registro);
    if (!c) return o.reserva || null;
    var fonte = o.fonte || { id: registro.id };
    if (!fonte.id && !fonte.pacote) return o.reserva || null;
    var k = chaveDe(fonte);
    var no = el("span.hb-miniatura" + (c.efetiva === "simbolo" ? ".hb-imagem--simbolo" : "") + (o.classe ? "." + o.classe : ""), { "aria-hidden": "true", dataset: { hbImagem: k } });
    no._reserva = o.reserva || null;
    no._aoPintar = o.aoPintar || null;
    (slots[k] || (slots[k] = [])).push(no);
    if (miniaturas[k] !== undefined) pintarSlot(no);
    else {
      if (o.reserva) U.trocar(no, [o.reserva]); else no.hidden = true;
      if (no._aoPintar) setTimeout(function () { no._aoPintar(!no.hidden); }, 0);
      observar(no, fonte);
    }
    return no;
  }

  /* ---------- a imagem maior (consulta) ---------- */

  async function obterGrande(registro, fonte) {
    if (fonte && fonte.pacote) {
      var kp = chaveDe(fonte);
      if (grandes[kp] !== undefined) return grandes[kp];
      var rp = API().lerImagensPacote ? await API().lerImagensPacote(fonte.pacote.id, fonte.pacote.codigo, [fonte.entradaId], true) : null;
      var vp = rp && rp.ok ? (rp.dados[fonte.entradaId] || "") : "";
      if (rp && rp.ok) grandes[kp] = vp;
      return vp;
    }
    var id = registro && registro.id;
    if (!id) return "";
    if (grandes[id] !== undefined) return grandes[id];
    if (miniaturas[id] === null) return "";
    var r = await API().lerImagemCriatura(id);
    var v = r && r.ok ? (r.dados.imagem || "") : "";
    if (r && r.ok) grandes[id] = v;
    return v;
  }
  function fonteGrande(registro, opcoes) {
    var o = opcoes || {};
    if (!capacidade(registro)) return null;
    return function () { return obterGrande(registro, o.fonte); };
  }

  function ampliar(src, titulo, simbolo) {
    UI().modal({ titulo: titulo || "Imagem", largo: true, fundoFecha: true, classe: "r-modal--imagem",
      conteudo: [el("div.hb-imagem-grande__ampliada" + (simbolo ? ".hb-imagem--simbolo" : ""), {}, [el("img", { src: src, alt: titulo || "" })])] });
  }

  /* A figura da consulta: aparece quando há imagem (personalizada ou a
     reserva oficial); some quando não há nenhuma. */
  function grande(registro, opcoes) {
    var o = opcoes || {};
    var c = capacidade(registro);
    if (!c) return o.reserva || null;
    var fig = el("figure.hb-imagem-grande" + (c.efetiva === "simbolo" ? ".hb-imagem--simbolo" : ""), { hidden: !o.reserva });
    if (o.reserva) fig.appendChild(o.reserva);
    obterGrande(registro, o.fonte).then(function (src) {
      if (!src) return;
      U.trocar(fig, [el("button.hb-imagem-grande__botao", { type: "button", "aria-label": "Ampliar " + c.rotulo.toLowerCase() + " de " + (registro.nome || ""),
        onclick: function () { ampliar(src, registro.nome, c.efetiva === "simbolo"); } }, [el("img", { src: src, alt: c.rotulo + " de " + (registro.nome || "") })]),
        el("figcaption.t-mini", { texto: c.rotulo })]);
      fig.hidden = false;
    });
    return fig;
  }

  /* ---------- numa ficha (o símbolo do ritual Homebrew) ---------- */

  /* A miniatura de uma criação pela id, se a conta a alcançar. */
  function paraFicha(id) {
    return new Promise(function (ok) {
      if (!id) { ok(""); return; }
      if (miniaturas[id] !== undefined) { ok(miniaturas[id] ? miniaturas[id].mini : ""); return; }
      (esperando[id] || (esperando[id] = [])).push(ok);
      pedir({ id: id });
      var antes = slots[id] || (slots[id] = []);
      var vigia = { isConnected: true, dataset: { hbImagem: id } };
      vigia._resolver = true;
      antes.push(vigia);
    });
  }
  var pintarOriginal = pintarSlot;
  pintarSlot = function (no) {
    if (no._resolver) {
      var k = no.dataset.hbImagem;
      if (miniaturas[k] === undefined) return;
      no.isConnected = false;
      (esperando[k] || []).splice(0).forEach(function (f) { f(miniaturas[k] ? miniaturas[k].mini : ""); });
      return;
    }
    pintarOriginal(no);
  };

  global.RAMAHomebrewImagem = {
    capacidade: capacidade,
    campo: campo,
    miniatura: miniatura,
    grande: grande,
    fonteGrande: fonteGrande,
    ampliar: ampliar,
    copiar: copiar,
    enviar: enviar,
    paraFicha: paraFicha,
    gerarMiniatura: gerarMiniatura,
    destinoDoEditor: destinoDoEditor,
  };
})(window);
