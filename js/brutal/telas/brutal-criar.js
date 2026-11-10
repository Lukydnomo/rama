/* =====================================================================
   R.A.M.A. — BRUTAL · criar uma Sobrevivente (v7.0)
   ---------------------------------------------------------------------
   "Quem é você?": os oito Arquétipos em cartas com a arte e a cor de
   cada um. A carta escolhida mostra o que o Corte Rápido dá a ela —
   Estilos, Habilidade, a Vantagem de cada Estilo e a Iniciativa — e o
   resto (nome, pronomes, intérprete, Apegos, campanha) vem embaixo.
   Nenhum valor é sorteado: tudo do Arquétipo é fixo (p. 9–12).
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el;
  function K() { return global.RAMABrutalCatalogo; }
  function B() { return global.RAMABrutal; }
  function UI() { return global.RAMAUI; }
  function T() { return global.RAMABrutalTela; }

  function imagem(chave) { return U.url("assets/brutal/arquetipos/" + chave + ".webp"); }

  /* A grade de cartas (também usada na troca de Arquétipo da ficha). */
  function cartas(escolhido, aoEscolher) {
    return el("div.brt-cartas", { role: "radiogroup", "aria-label": "Arquétipo" }, K().ORDEM_ARQUETIPOS.map(function (k) {
      var a = K().ARQUETIPOS[k];
      var sel = escolhido === k;
      return el("button.brt-carta" + (sel ? ".brt-carta--escolhida" : ""), {
        type: "button", role: "radio", "aria-checked": String(sel), dataset: { arquetipo: k }, style: "--brt-cor: " + a.cor,
        onclick: function () { aoEscolher(k); },
      }, [
        el("img.brt-carta__arte", { src: imagem(k), alt: "", loading: "lazy" }),
        el("span.brt-carta__nome", { texto: a.nome }),
        sel ? el("span.brt-carta__marca", { "aria-hidden": "true", texto: "✓" }) : null,
      ]);
    }));
  }

  /* O que o Arquétipo dá (p. 6, 8, 9–12, 21). */
  function detalhe(k) {
    var a = K().ARQUETIPOS[k];
    if (!a) return el("p.t-mini", { texto: "Escolha uma carta para ver o Arquétipo." });
    var vant = a.estilos.map(function (e) { var v = Object.keys(K().VANTAGENS).map(function (x) { return K().VANTAGENS[x]; }).filter(function (v) { return v.estilo === e; })[0]; return v ? v.nome + " (" + T().nomeEstilo(e) + ")" : ""; }).filter(Boolean);
    return el("div.brt-arquetipo-detalhe", { style: "--brt-cor: " + a.cor }, [
      el("h3.brt-arquetipo-detalhe__nome", { texto: a.nome }),
      el("p.t-mini", { texto: a.adjetivos.toUpperCase() }),
      el("p", { texto: a.resumo }),
      el("dl.r-dados", {}, [
        el("dt", { texto: "Estilos" }), el("dd", { texto: a.estilos.map(T().nomeEstilo).join(" e ") }),
        el("dt", { texto: "Habilidade" }), el("dd", { texto: a.habilidade.nome + " — " + a.habilidade.texto }),
        el("dt", { texto: "Vantagens de Estilo" }), el("dd", { texto: vant.join(" · ") }),
        el("dt", { texto: "Iniciativa" }), el("dd", { texto: a.iniciativa + "º no Encontro (o Assassino é sempre o último)" }),
        el("dt", { texto: "Começa com" }), el("dd", { texto: "6 dados na Pilha Comum e 0 Pontos de Tensão (em cada Thriller)" }),
      ]),
      T().fonte(a.pagina),
    ]);
  }

  function abrir(opcoes) {
    var o = opcoes || {};
    var campanhas = (o.campanhas || []).filter(function (c) { return !c.sistema || c.sistema === "brutal"; });
    var info = { arquetipo: "", nome: "", pronomes: "", interprete: "", campanhaId: "", item: "", itemTexto: "", relacao: "", relacaoTexto: "", desejo: "" };
    var corpo = el("div.pilha.brt-criar");

    function campo(rotulo, chave, extra) {
      return UI().campo(Object.assign({ rotulo: rotulo, valor: info[chave], aoDigitar: true, aoMudar: function (v) { info[chave] = v; } }, extra || {}));
    }

    function desenhar() {
      var y = corpo.parentNode ? corpo.parentNode.scrollTop : 0;
      U.trocar(corpo, [
        el("h3.brt-criar__pergunta", { texto: "Quem é você?" }),
        cartas(info.arquetipo, function (k) { info.arquetipo = k; desenhar(); }),
        detalhe(info.arquetipo),
        el("div.brt-criar__campos", {}, [
          campo("Nome", "nome", { limite: 120 }),
          campo("Pronomes", "pronomes", { limite: 40, dica: "ela/dela" }),
          campo("Intérprete", "interprete", { limite: 80, dica: "quem joga" }),
        ]),
        el("h4.t-secao", { texto: "Apegos (p. 7)" }),
        el("p.t-mini", { texto: "Usá-los no Thriller rende Pontos de Tensão: Item Icônico +2 e Relação Afetiva +2 (uma vez por sessão), Desejo Obscuro +3 (uma vez só, para sempre)." }),
        el("div.brt-criar__campos", {}, [
          campo("Item Icônico", "item", { limite: 80 }),
          campo("Relação Afetiva", "relacao", { limite: 80 }),
        ]),
        campo("Desejo Obscuro (segredo)", "desejo", { tipo: "area", linhas: 2, limite: 600 }),
        UI().campo({ rotulo: "Campanha", tipo: "selecao", valor: info.campanhaId, opcoes: [{ valor: "", rotulo: "Sem campanha (treino na ficha)" }].concat(campanhas.map(function (c) { return { valor: c.id, rotulo: c.nome }; })), aoMudar: function (v) { info.campanhaId = v; } }),
      ]);
      if (corpo.parentNode) corpo.parentNode.scrollTop = y;
    }

    async function concluir(fechar) {
      if (!info.arquetipo) { UI().avisoAtencao("Escolha o Arquétipo."); return; }
      if (!info.nome.trim()) { UI().avisoAtencao("Dê um nome à Sobrevivente."); return; }
      var bloco = B().normalizar({
        arquetipo: info.arquetipo, pronomes: info.pronomes, interprete: info.interprete,
        apegos: { item: { nome: info.item }, relacao: { nome: info.relacao }, desejo: { texto: info.desejo } },
      });
      var ficha = global.RAMAFicha.criarFicha({ nome: info.nome.trim(), tipoFicha: "brutal", campanhaId: info.campanhaId || null, brutal: bloco });
      var res = await global.RAMAApi.criarPersonagem(ficha, global.RAMAApi.novaOperacao());
      if (!res.ok) { UI().avisoDeFalha(res, "criação da Sobrevivente"); return; }
      fechar();
      location.href = U.url("ficha/?id=" + encodeURIComponent(res.dados.id));
    }

    var m = UI().modal({
      titulo: "Nova Sobrevivente — BRUTAL",
      classe: "brt-janela-criar",
      largo: true,
      conteudo: [corpo],
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Criar a ficha", classe: "r-botao--principal", aoClicar: function (f) { return concluir(f); } },
      ],
    });
    desenhar();
    return m;
  }

  global.RAMABrutalCriar = { abrir: abrir, cartas: cartas, detalhe: detalhe, imagem: imagem };
})(window);
