/* =====================================================================
   R.A.M.A. — suplementos (v6.1)
   =====================================================================
   Os conteúdos adicionais de um sistema (os "DLCs"), num lugar só. Três
   coisas separadas, de propósito:

     o CADASTRO     SUPLEMENTOS, abaixo: o que o R.A.M.A. conhece — id
                    estável, sistema, nome, descrição, capa e as FONTES de
                    conteúdo que o suplemento traz (as siglas que os
                    catálogos já usam: SAH, AS1…). O mesmo cadastro está
                    em backend/Sistemas.gs (testes/sistemas-backend.js
                    confere).
     a FICHA        `ficha.suplementos`: lista de ids ligados. AUSENTE
                    (ficha anterior à v6.1) = todos ligados, como era;
                    lista VAZIA = só o livro básico. Nunca confundir.
     a CAMPANHA     `dados.suplementos[sistema]`: o que a mesa permite,
                    guardado por sistema (trocar o sistema da campanha não
                    apaga a escolha do outro). Ausente = todos.

   O que vale numa tela é a interseção: ficha ∩ campanha. Fonte que
   nenhum suplemento traz (o livro básico, EXTRA, Homebrew, conteúdo sem
   fonte) está sempre liberada — nada é atribuído a um suplemento por
   aproximação.

   Disponibilidade, não posse: um suplemento desligado só sai das NOVAS
   escolhas. O que a ficha já tem continua lá, funcionando, com a fonte e
   o aviso. E ligar um suplemento não liga regra opcional nenhuma.

     RAMASuplementos.definirContexto({ sistema, ficha, campanha })
     RAMASuplementos.fonteLiberada(sistema, fonte, contexto?)
     RAMASuplementos.painel({ sistema, selecao, aoMudar, … })   o componente
     RAMASuplementos.abrir({ sistema, selecao, aoSalvar, … })   a janela
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  function el() { return U.el.apply(U, arguments); }

  var SUPLEMENTOS = [
    { id: "ordem.sah", sistema: "ordem", fontes: ["SAH"], nome: "Sobrevivendo ao Horror", curto: "SAH",
      descricao: "Novas opções de personagens, equipamentos e regras para sobrevivência, investigação e horror.",
      capa: "assets/sistemas/ordem-sah-capa.webp", capaAlt: "Capa de Sobrevivendo ao Horror: três personagens num corredor escuro, com o título em branco embaixo" },
    { id: "ordem.as1", sistema: "ordem", fontes: ["AS1"], nome: "Arquivos Secretos 1: Agatha", curto: "AS1",
      descricao: "Opções ligadas a Agatha, aos Transtornados e aos mistérios do Sangue.",
      capa: "assets/sistemas/ordem-as1-capa.webp", capaAlt: "Capa de Arquivos Secretos 1: uma jovem sorridente de jaqueta segurando um livro, sobre fundo vermelho" },
    { id: "ordem.as2", sistema: "ordem", fontes: ["AS2"], nome: "Arquivos Secretos 2: Hexatombe", curto: "AS2",
      descricao: "Conteúdos e regras do Hexatombe, incluindo Intenção, personagens, poderes e equipamentos.",
      capa: "assets/sistemas/ordem-as2-capa.webp", capaAlt: "Capa de Arquivos Secretos 2: uma figura encapuzada sobre fundo vermelho" },
    { id: "ordem.as3", sistema: "ordem", fontes: ["AS3"], nome: "Arquivos Secretos 3: Hexatombe — Parte II", curto: "AS3",
      descricao: "Expansão do Hexatombe com equipes, estigmas, poderes de Sacrifício e novas opções de jogo.",
      capa: "assets/sistemas/ordem-as3-capa.webp", capaAlt: "Capa de Arquivos Secretos 3: uma guerreira de armadura sentada, sobre fundo vermelho" },
    { id: "ordem.as4", sistema: "ordem", fontes: ["AS4"], nome: "Arquivos Secretos 4: Os Jogos do Anfitrião", curto: "AS4",
      descricao: "Conteúdos do Anfitrião e sua Produção, com opções de Energia e regras de Hacking.",
      capa: "assets/sistemas/ordem-as4-capa.webp", capaAlt: "Capa de Arquivos Secretos 4: uma figura de máscara sentada sobre um monte de corpos, em tons de roxo e azul" },
    { id: "ordem.as5", sistema: "ordem", fontes: ["AS5"], nome: "Arquivos Secretos 5: Alheios", curto: "AS5",
      descricao: "Conteúdos dos Alheios, Transmissão, equipamentos e perigos complexos.",
      capa: "assets/sistemas/ordem-as5-capa.webp", capaAlt: "Capa de Arquivos Secretos 5: uma criatura de olhos brilhantes estendendo as garras, em tons de verde" },
    { id: "ordem.as6", sistema: "ordem", fontes: ["AS6"], nome: "Arquivos Secretos 6: Panacea", curto: "AS6",
      descricao: "Conteúdos das Indústrias Panacea, com novas opções, medicamentos, doenças e venenos.",
      capa: "assets/sistemas/ordem-as6-capa.webp", capaAlt: "Capa de Arquivos Secretos 6: três pessoas diante de um tanque de líquido verde num laboratório" },
  ];

  /* As ferramentas e mecânicas de campanha que pertencem a um
     suplemento: ligar o suplemento NÃO as liga (cada uma continua com o
     próprio interruptor); desligar impede iniciá-las e novas operações. */
  var FERRAMENTAS = {
    ordem: { hexatombe: "ordem.as2", hacking: "ordem.as4", perigos: "ordem.as5", sincronia: "ordem.as5" },
  };

  /* ---------------------------------------------------------------
     CADASTRO
     --------------------------------------------------------------- */

  function doSistema(sistema) { return SUPLEMENTOS.filter(function (s) { return s.sistema === sistema; }); }
  function temSuplementos(sistema) { return doSistema(sistema).length > 0; }
  function de(id) { return SUPLEMENTOS.filter(function (s) { return s.id === id; })[0] || null; }
  function daFonte(sistema, fonte) {
    var f = String(fonte || "").toUpperCase();
    if (!f) return null;
    return doSistema(sistema).filter(function (s) { return s.fontes.indexOf(f) >= 0; })[0] || null;
  }
  function daFerramenta(sistema, chave) { var m = FERRAMENTAS[sistema] || {}; return m[chave] ? de(m[chave]) : null; }
  function ids(sistema) { return doSistema(sistema).map(function (s) { return s.id; }); }

  /* null (ausente: todos ligados) ou a lista de ids conhecidos, sem
     repetição. Uma lista vazia continua vazia: só o livro básico. */
  function normalizarSelecao(sistema, valor) {
    if (!Array.isArray(valor)) return null;
    var validos = ids(sistema);
    return valor.filter(function (v, i, t) { return typeof v === "string" && validos.indexOf(v) >= 0 && t.indexOf(v) === i; });
  }

  function ativos(sistema, selecao) { return selecao === null || selecao === undefined ? ids(sistema) : normalizarSelecao(sistema, selecao); }
  function ligado(selecao, id) { return selecao === null || selecao === undefined || selecao.indexOf(id) >= 0; }

  /* A seleção da campanha para um sistema, do mapa por sistema. */
  function daCampanha(mapa, sistema) {
    if (!mapa || typeof mapa !== "object" || Array.isArray(mapa)) return null;
    return Object.prototype.hasOwnProperty.call(mapa, sistema) ? normalizarSelecao(sistema, mapa[sistema]) : null;
  }

  /* ---------------------------------------------------------------
     CONTEXTO: o que vale nesta tela agora
     --------------------------------------------------------------- */

  var contexto = { sistema: "", ficha: null, campanha: null };
  var ouvintes = [];

  function definirContexto(c) {
    var x = c || {};
    contexto = {
      sistema: x.sistema || "",
      ficha: x.ficha === undefined ? null : normalizarSelecao(x.sistema, x.ficha),
      campanha: x.campanha === undefined ? null : normalizarSelecao(x.sistema, x.campanha),
    };
    ouvintes.forEach(function (f) { try { f(contexto); } catch (e) { /* uma tela não derruba a outra */ } });
    return contexto;
  }
  function contextoAtual() { return { sistema: contexto.sistema, ficha: contexto.ficha, campanha: contexto.campanha }; }
  function aoMudarContexto(fn) { ouvintes.push(fn); }

  /* A fonte vale para NOVAS escolhas neste contexto? */
  function fonteLiberada(sistema, fonte, ctx) {
    var c = ctx || contexto;
    var s = daFonte(sistema, fonte);
    if (!s) return true;
    if (c.sistema && c.sistema !== sistema) return true;
    return ligado(c.ficha, s.id) && ligado(c.campanha, s.id);
  }

  /* Por que não: "desligado nesta ficha" / "a campanha não permite". */
  function motivo(sistema, fonte, ctx) {
    var c = ctx || contexto;
    var s = daFonte(sistema, fonte);
    if (!s || fonteLiberada(sistema, fonte, c)) return "";
    if (!ligado(c.campanha, s.id)) return s.nome + " não está permitido nesta campanha.";
    return s.nome + " está desligado nesta ficha.";
  }

  function ferramentaLiberada(sistema, chave, selecaoDaCampanha) {
    var s = daFerramenta(sistema, chave);
    return !s || ligado(selecaoDaCampanha, s.id);
  }

  /* ---------------------------------------------------------------
     O COMPONENTE: os volumes que saem de trás do livro
     --------------------------------------------------------------- */

  function movimentoReduzido() {
    try { return !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; }
  }

  function capa(s, tamanho) {
    var src = U.url(tamanho === "p" ? s.capa.replace(/\.webp$/, "-pequena.webp") : s.capa);
    return el("span.capa-sistema.capa-sistema--" + (tamanho || "m") + ".suplemento__capa", { "aria-hidden": "true" }, [
      el("img.capa-sistema__imagem", { src: src, alt: "", loading: "lazy", decoding: "async", width: tamanho === "p" ? 160 : 320, height: tamanho === "p" ? 215 : 430 }),
    ]);
  }

  /* painel({ sistema, selecao (null | ids), aoMudar(ids), somenteLeitura,
     campanha (ids | null: o que a mesa permite), emUso ({ id: texto }),
     animar, capaPrincipal (true: o livro do sistema à esquerda) })
     Devolve o elemento, com .selecao() e .animar(). */
  function painel(opcoes) {
    var o = opcoes || {};
    var lista = doSistema(o.sistema);
    var sel = ativos(o.sistema, o.selecao).slice();
    var raiz = el("div.suplementos", { dataset: { sistema: o.sistema } });
    var volumes = el("ul.suplementos__volumes", { "aria-label": "Suplementos" });
    var resumo = el("p.suplementos__resumo.t-mini", { role: "status", "aria-live": "polite" });
    var principal = o.capaPrincipal !== false && global.RAMACapaSistema
      ? el("div.suplementos__principal", {}, [global.RAMACapaSistema.elemento(o.sistema, { tamanho: "g" }), el("span.suplementos__basico.t-mini", { texto: "Livro básico · sempre ligado" })])
      : null;

    function avisar() {
      resumo.textContent = sel.length === lista.length ? "Todos os " + lista.length + " suplementos ligados."
        : !sel.length ? "Só o livro básico." : sel.length + " de " + lista.length + " suplementos ligados.";
      if (o.aoMudar) o.aoMudar(sel.slice());
    }

    function alternar(id, valor) {
      if (o.somenteLeitura) return;
      var ligadoAgora = sel.indexOf(id) >= 0;
      var quer = valor === undefined ? !ligadoAgora : !!valor;
      if (quer === ligadoAgora) return;
      sel = quer ? sel.concat([id]) : sel.filter(function (x) { return x !== id; });
      /* Na ordem do cadastro, para a lista gravada ser estável. */
      sel = lista.map(function (s) { return s.id; }).filter(function (x) { return sel.indexOf(x) >= 0; });
      desenhar();
      avisar();
    }

    function volume(s, i) {
      var on = sel.indexOf(s.id) >= 0;
      var bloqueadoMesa = o.campanha !== undefined && o.campanha !== null && o.campanha.indexOf(s.id) < 0;
      var uso = o.emUso && o.emUso[s.id];
      var idNome = "sup-" + s.id.replace(/\W/g, "-") + "-" + i;
      var chave = el("button.suplemento__switch", {
        type: "button", role: "switch", "aria-checked": String(on), "aria-labelledby": idNome,
        disabled: !!o.somenteLeitura,
        onclick: function (ev) { ev.stopPropagation(); alternar(s.id); },
      }, [el("span.suplemento__trilho", { "aria-hidden": "true" }, [el("span.suplemento__botao")]), el("span.suplemento__estado", { texto: on ? "Ligado" : "Desligado" })]);
      return el("li.suplemento", {
        class: [on ? "suplemento--ligado" : "", o.somenteLeitura ? "" : "suplemento--clicavel"].join(" "),
        style: "--i:" + i,
        dataset: { id: s.id },
        /* O volume inteiro é área de toque; o controle é só o switch
           (nenhum interativo dentro de outro). */
        onclick: function (ev) { if (ev.target.closest && ev.target.closest(".suplemento__switch")) return; alternar(s.id); },
      }, [
        capa(s, "p"),
        el("div.suplemento__textos", {}, [
          el("span.suplemento__nome", { id: idNome, texto: s.nome }),
          el("span.suplemento__descricao", { texto: s.descricao }),
          bloqueadoMesa ? el("span.suplemento__nota", { texto: "A campanha não permite este suplemento: ele não vale nas escolhas feitas nela." }) : null,
          uso ? el("span.suplemento__nota", { texto: uso }) : null,
        ]),
        chave,
      ]);
    }

    function desenhar() {
      var foco = document.activeElement && document.activeElement.closest ? document.activeElement.closest(".suplemento") : null;
      var idFoco = foco && raiz.contains(foco) ? foco.dataset.id : "";
      U.trocar(volumes, lista.map(volume));
      if (idFoco) { var b = volumes.querySelector('[data-id="' + idFoco + '"] .suplemento__switch'); if (b) b.focus(); }
    }

    desenhar();
    U.trocar(raiz, [
      el("div.suplementos__corpo", {}, [principal, el("div.suplementos__lista", {}, [
        volumes,
        o.somenteLeitura ? null : el("div.faixa.suplementos__atalhos", {}, [
          el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Ligar todos", onclick: function () { sel = lista.map(function (s) { return s.id; }); desenhar(); avisar(); } }),
          el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Só o livro básico", onclick: function () { sel = []; desenhar(); avisar(); } }),
        ]),
        resumo,
      ])]),
    ]);
    resumo.textContent = sel.length === lista.length ? "Todos os " + lista.length + " suplementos ligados." : !sel.length ? "Só o livro básico." : sel.length + " de " + lista.length + " suplementos ligados.";

    /* A animação: cada volume parte da posição do livro principal (como
       se estivesse guardado atrás dele) e desliza até o lugar dele. Com
       movimento reduzido, aparece sem deslocamento. */
    raiz.animar = function (origem) {
      var alvo = origem || (principal && principal.querySelector(".capa-sistema"));
      if (!alvo || movimentoReduzido() || !raiz.isConnected) { raiz.classList.add("suplementos--abertos"); return; }
      var ra = alvo.getBoundingClientRect();
      U.$$(".suplemento", volumes).forEach(function (v) {
        var c = v.querySelector(".suplemento__capa") || v;
        var rv = c.getBoundingClientRect();
        v.style.setProperty("--de-x", Math.round(ra.left + ra.width / 2 - (rv.left + rv.width / 2)) + "px");
        v.style.setProperty("--de-y", Math.round(ra.top + ra.height / 2 - (rv.top + rv.height / 2)) + "px");
      });
      raiz.classList.add("suplementos--guardados");
      /* força o estilo inicial antes de soltar */
      void raiz.offsetWidth;
      global.requestAnimationFrame(function () {
        raiz.classList.remove("suplementos--guardados");
        raiz.classList.add("suplementos--abrindo", "suplementos--abertos");
        setTimeout(function () { raiz.classList.remove("suplementos--abrindo"); }, 900);
      });
    };
    raiz.selecao = function () { return sel.slice(); };
    return raiz;
  }

  /* A janela "Suplementos" (ficha, campanha). aoSalvar(ids) pode devolver
     uma promessa; a janela fecha quando ela termina bem. */
  function abrir(opcoes) {
    var o = opcoes || {};
    var atual = ativos(o.sistema, o.selecao);
    var p = painel(Object.assign({}, o, { selecao: atual, aoMudar: function (s) { atual = s; } }));
    var m = global.RAMAUI.modal({
      titulo: o.titulo || "Suplementos",
      classe: "suplementos-janela",
      largo: true,
      conteudo: [
        o.texto ? el("p", { texto: o.texto }) : null,
        p,
        el("p.t-mini", { texto: "Desligar tira o suplemento das NOVAS escolhas. O que já está em uso continua funcionando e aparece com a fonte. Ligar um suplemento não liga nenhuma regra opcional." }),
      ],
      botoes: o.somenteLeitura ? [{ rotulo: "Fechar", classe: "r-botao--principal" }] : [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Salvar", classe: "r-botao--principal", aoClicar: function (fechar) {
          var r = o.aoSalvar ? o.aoSalvar(atual.slice()) : null;
          if (r && typeof r.then === "function") return r.then(function (x) { if (x !== false) fechar(); });
          if (r !== false) fechar();
          return null;
        } },
      ],
    });
    setTimeout(function () { p.animar(); }, 30);
    return m;
  }

  /* Etiqueta curta para conteúdo em uso cuja fonte está desligada. */
  function etiquetaDesligada(sistema, fonte, ctx) {
    var t = motivo(sistema, fonte, ctx);
    if (!t) return null;
    return el("span.r-etiqueta.r-etiqueta--aviso.suplemento-desligado", { texto: "Suplemento desligado", title: t + " Já em uso: continua valendo." });
  }

  global.RAMASuplementos = {
    SUPLEMENTOS: SUPLEMENTOS, FERRAMENTAS: FERRAMENTAS,
    doSistema: doSistema, temSuplementos: temSuplementos, de: de, daFonte: daFonte, daFerramenta: daFerramenta, ids: ids,
    normalizarSelecao: normalizarSelecao, ativos: ativos, ligado: ligado, daCampanha: daCampanha,
    definirContexto: definirContexto, contexto: contextoAtual, aoMudarContexto: aoMudarContexto,
    fonteLiberada: fonteLiberada, motivo: motivo, ferramentaLiberada: ferramentaLiberada,
    painel: painel, abrir: abrir, etiquetaDesligada: etiquetaDesligada,
  };
})(typeof window !== "undefined" ? window : globalThis);
