/* Skeleton Loading exclusivo do Modern20 (v9.19.0): usa o DOM e as
   folhas reais. Abra esqueleto.html no navegador. Não depende do backend.

   O que está sob teste:
     · Legacy (e interface não identificada): a MESMA estrutura de antes,
       com ou sem opções — nenhum esqueleto, atributo ou classe a mais;
     · Modern20: esqueleto acessível (role=status, aria-busy, uma mensagem
       curta, desenhos ocultos e sem foco), limitado e da forma pedida;
     · trocar de estilo com a tela carregando: o mesmo nó troca de
       apresentação, sem duplicar nada; o placeholder próprio é trocado no
       lugar; nós fora do documento não são tocados;
     · concorrência: trocar o conteúdo de uma região não mexe na outra;
     · transição: só quando o esqueleto chegou a aparecer, e só no Modern20. */
(function () {
  "use strict";
  var U = window.RAMAUtil;
  var UI = window.RAMAUI;
  var raiz = document.documentElement;
  var resultados = [];

  function registrar(nome, passou) {
    resultados.push({ nome: nome, passou: !!passou });
    document.querySelector("#saida").appendChild(U.el("li", { texto: (passou ? "OK — " : "FALHOU — ") + nome }));
  }
  function estilo(e) {
    if (e === null) raiz.removeAttribute("data-interface");
    else raiz.setAttribute("data-interface", e);
  }
  /* O carregando de antes da v9.19.0, escrito à mão para comparar. */
  function original(mensagem) {
    return U.el("div.r-carregando", { role: "status" }, [
      U.el("span.r-carregando__marca", { "aria-hidden": "true" }, [UI.marca(32, { animada: true })]),
      U.el("p.r-carregando__rotulo", { texto: mensagem || "Consultando arquivo" }),
      U.el("div.r-barra", { "aria-hidden": "true" }, [U.el("div.r-barra__preenche")]),
    ]);
  }
  function focaveis(no) {
    return no.querySelectorAll("a, button, input, select, textarea, [tabindex]").length;
  }

  function executar() {
    resultados = [];
    document.querySelector("#saida").textContent = "";
    var palco = U.el("div");
    document.body.appendChild(palco);

    /* ---------- Legacy intacto ---------- */
    estilo("legacy");
    var a = UI.carregando("Consultando arquivo");
    registrar("[Legacy] a estrutura é a de antes", a.outerHTML === original("Consultando arquivo").outerHTML);
    var b = UI.carregando("Consultando arquivo", { forma: "lista", quantidade: 5, retrato: true });
    registrar("[Legacy] com opções de esqueleto, a mesma estrutura (as opções são ignoradas)", b.outerHTML === original("Consultando arquivo").outerHTML);
    registrar("[Legacy] nenhum esqueleto, aria-busy ou data-forma", !b.querySelector(".r-esq") && !b.hasAttribute("aria-busy") && !b.hasAttribute("data-forma"));
    var proprio = UI.carregando("Carregando capa", { forma: "imagem", legado: function () { return U.el("span.campanha-capa__carregando", { texto: "Carregando capa…" }); } });
    registrar("[Legacy] o placeholder próprio da tela continua o dela (só a classe-marcador)", proprio.tagName === "SPAN" && proprio.textContent === "Carregando capa…" && proprio.className === "campanha-capa__carregando r-pendente");
    estilo(null);
    var c = UI.carregando("Consultando arquivo", { forma: "cartoes" });
    registrar("[Sem interface identificada] vale o comportamento padrão (o de antes)", c.outerHTML === original("Consultando arquivo").outerHTML);

    /* ---------- Modern20 ---------- */
    estilo("modern20");
    var m = UI.carregando("Consultando arquivo", { forma: "lista", quantidade: 400, etiquetas: 1 });
    registrar("[Modern20] esqueleto com role=status e aria-busy", m.classList.contains("r-carregando--esqueleto") && m.getAttribute("role") === "status" && m.getAttribute("aria-busy") === "true");
    registrar("[Modern20] uma mensagem curta, só para leitor de tela", m.querySelectorAll(".so-leitor").length === 1 && m.querySelector(".so-leitor").textContent === "Consultando arquivo");
    registrar("[Modern20] os desenhos ficam ocultos e inertes, sem nada focável", m.querySelector(".r-esq").getAttribute("aria-hidden") === "true" && m.querySelector(".r-esq").hasAttribute("inert") && focaveis(m) === 0);
    registrar("[Modern20] coleção grande não vira centenas de cartões (no máximo 12)", m.querySelectorAll(".r-esq__fila").length === 12);
    registrar("[Modern20] nenhum texto ou número decorativo nos desenhos", m.querySelector(".r-esq").textContent.trim() === "");
    registrar("[Modern20] a forma vem da opção, não da mensagem", UI.carregando("Consultando lista de cartões").getAttribute("data-forma") === "blocos");
    var formasOk = UI.esqueleto.formas.every(function (f) { var n = UI.carregando("x", { forma: f }); var d = n.querySelector(".r-esq--" + f); return n.getAttribute("data-forma") === f && d && d.children.length > 0 && d.textContent.trim() === "" && d.querySelector(".r-esq__b"); });
    registrar("[Modern20] todas as formas montam só com desenhos, sem texto (" + UI.esqueleto.formas.join(", ") + ")", formasOk);
    var neutra = UI.carregando("x", { forma: "ficha" });
    registrar("[Modern20] ficha sem sistema conhecido é neutra (sem recursos nem atributos)", !neutra.querySelector(".r-esq__recursos") && !neutra.querySelector(".r-esq__atributos"));
    var ordem = UI.carregando("x", { forma: "ficha", sistema: "ordem" });
    var vampiro = UI.carregando("x", { forma: "ficha", sistema: "vampiro" });
    registrar("[Modern20] ficha de Ordem: 3 recursos e 5 atributos; de Vampiro: 9 atributos",
      ordem.querySelectorAll(".r-esq__recurso").length === 3 && ordem.querySelectorAll(".r-esq__atributos > *").length === 5 && vampiro.querySelectorAll(".r-esq__atributos > *").length === 9);
    registrar("[Modern20] os sistemas implementados têm forma de ficha", ["ordem", "ordem2", "oblivio", "vampiro", "goblins", "brutal", "tormenta20", "universal"].every(function (s) { return !!UI.esqueleto.ficha[s]; }));
    var prop = UI.carregando("Carregando capa", { forma: "imagem", legado: function () { return U.el("span", { texto: "Carregando capa…" }); } });
    registrar("[Modern20] com placeholder próprio, o esqueleto da imagem", prop.classList.contains("r-carregando--esqueleto") && prop.getAttribute("data-forma") === "imagem");

    /* ---------- trocar de estilo carregando ---------- */
    var regiao = U.el("section", {}, [U.el("h2", { texto: "Antes" })]);
    var vivo = UI.carregando("Consultando arquivo", { forma: "cartoes" });
    var capa = U.el("div.capa", {}, [UI.carregando("Carregando capa", { forma: "imagem", legado: function () { return U.el("span.campanha-capa__carregando", { texto: "Carregando capa…" }); } })]);
    regiao.appendChild(vivo);
    regiao.appendChild(capa);
    palco.appendChild(regiao);
    var solto = UI.carregando("Fora do documento", { forma: "lista" });
    estilo("legacy");
    var n1 = UI.readaptarCarregamentos();
    registrar("[Troca] o MESMO nó vira a apresentação do Legacy (a consulta não recomeça)", regiao.contains(vivo) && vivo.outerHTML === original("Consultando arquivo").outerHTML);
    registrar("[Troca] o placeholder próprio volta no lugar, sem duplicar", capa.children.length === 1 && capa.firstElementChild.classList.contains("campanha-capa__carregando"));
    registrar("[Troca] o que está fora do documento não é tocado", solto.classList.contains("r-carregando--esqueleto"));
    var n2 = UI.readaptarCarregamentos();
    registrar("[Troca] readaptar de novo não refaz nada", n1 >= 2 && n2 === 0 && vivo.children.length === 3);
    estilo("modern20");
    UI.readaptarCarregamentos();
    registrar("[Troca] e volta ao esqueleto, sem filhos repetidos", vivo.classList.contains("r-carregando--esqueleto") && vivo.querySelectorAll(".r-esq").length === 1 && vivo.querySelectorAll(".so-leitor").length === 1 && capa.querySelectorAll(".r-carregando").length === 1);

    /* ---------- concorrência e limpeza ---------- */
    var r1 = U.el("div", {}, [UI.carregando("Um", { forma: "lista" })]);
    var r2 = U.el("div", {}, [UI.carregando("Dois", { forma: "cartoes" })]);
    palco.appendChild(r1); palco.appendChild(r2);
    U.trocar(r1, U.el("p", { texto: "Conteúdo um" }));
    registrar("[Concorrência] trocar uma região não remove o carregamento da outra", !r1.querySelector(".r-carregando") && r2.querySelectorAll(".r-carregando").length === 1);
    U.trocar(r2, UI.vazio({ titulo: "Nada aqui" }));
    registrar("[Estados] vazio e erro substituem o esqueleto (nada fica rodando)", !r2.querySelector(".r-carregando, .r-esq"));

    /* ---------- transição ---------- */
    var Mv = window.RAMAMovimento;
    var r3 = U.el("div", {}, [UI.carregando("Rápido", { forma: "lista" })]);
    palco.appendChild(r3);
    U.trocar(r3, U.el("p", { texto: "Chegou rápido" }));
    registrar("[Transição] resposta rápida (esqueleto nem apareceu): nada anima", r3.firstElementChild.getAnimations().length === 0);
    var r4 = U.el("div", {}, [U.el("h3", { texto: "Cabeçalho" }), UI.carregando("Lento", { forma: "lista" })]);
    palco.appendChild(r4);
    r4.lastElementChild._rCarregando.desde -= 1000;
    U.trocar(r4, [U.el("h3", { texto: "Cabeçalho" }), U.el("p", { texto: "Chegou depois" })]);
    var anima = Mv && Mv.ativo();
    registrar("[Transição] depois do esqueleto à vista: só o que entrou no lugar dele aparece com transição" + (anima ? "" : " (movimento desligado: nenhuma)"),
      anima ? (r4.children[1].getAnimations().length === 1 && r4.children[0].getAnimations().length === 0) : r4.children[1].getAnimations().length === 0);
    registrar("[Transição] o conteúdo e os controles já estão no lugar na hora (síncrono)", r4.children[1].textContent === "Chegou depois");
    estilo("legacy");
    var r5 = U.el("div", {}, [UI.carregando("Legacy", { forma: "lista" })]);
    palco.appendChild(r5);
    r5.firstElementChild._rCarregando.desde -= 1000;
    U.trocar(r5, U.el("p", { texto: "Chegou" }));
    registrar("[Transição] no Legacy nada muda na chegada", r5.firstElementChild.getAnimations().length === 0);

    palco.remove();
    estilo("modern20");
    UI.readaptarCarregamentos();
    galeria();
    var falhas = resultados.filter(function (r) { return !r.passou; }).length;
    document.querySelector("#placar").textContent = (resultados.length - falhas) + " de " + resultados.length + " OK" + (falhas ? " — " + falhas + " falha(s)" : "");
    window.__resultadoEsqueleto = { total: resultados.length, falhas: falhas, lista: resultados };
    estilo("modern20");
  }

  /* A galeria, para conferir a aparência de cada forma no tema atual. */
  function galeria() {
    var g = document.querySelector("#galeria");
    var opcoes = {
      lista: { forma: "lista", faixa: 6, filtros: true, etiquetas: 1, tamanho: "curto" },
      lateral: { forma: "lista", lateral: 8, filtros: true, etiquetas: 1, tamanho: "curto" },
      plana: { forma: "lista", plana: true, retrato: "quadrado", etiquetas: 2, tamanho: "curto" },
      cartoes: { forma: "cartoes", capa: true },
      icones: { forma: "icones" },
      ficha: { forma: "ficha", sistema: "ordem" },
      fichaNeutra: { forma: "ficha" },
      painel: { forma: "painel", abas: 6, secoes: 2 },
      mesa: { forma: "mesa", recursos: 3, tamanho: "curto" },
      retratos: { forma: "retratos" },
      relatorio: { forma: "relatorio", cabeca: true, tamanho: "curto" },
    };
    U.trocar(g, Object.keys(opcoes).map(function (k) {
      return U.el("section.pilha", {}, [U.el("h3.t-mini", { texto: k }), UI.carregando("Galeria: " + k, opcoes[k])]);
    }));
  }

  document.querySelector("#executar").addEventListener("click", executar);
  executar();
})();
