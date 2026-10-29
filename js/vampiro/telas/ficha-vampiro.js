/* =====================================================================
   R.A.M.A. — Vampiro · a ficha (v5.0)
   ---------------------------------------------------------------------
   As seções da ficha de Vampiro. Nenhuma regra mora aqui: o motor
   (js/vampiro/regras.js) calcula, valida e aplica; cada ação vira UMA
   operação com id (RAMAVampiroTela.operar).

     RAMASecaoVampiro            blocoSuperior + aba "Personagem"
     RAMASecaoVampiroSangue      Fome, Checagens, alimentação, caça,
                                 Ressonância, cura, dano, frenesi,
                                 Torpor, estaca, sol e fogo
     RAMASecaoVampiroHumanidade  Humanidade, Máculas, Remorso,
                                 Convicções, Pilares, Compulsões
     RAMASecaoVampiroVantagens   Vantagens, Defeitos, Fichas de
                                 Conhecimento, Sangue-Ralo, Laços
     RAMASecaoVampiroExperiencia XP recebida e as compras, nível a nível
     RAMASecaoVampiroEquipamento armas, armaduras e o resto
   Disciplinas, rituais e alquimia: ficha-vampiro-disciplinas.js.

   VALORES EM CAMADAS. Cada número mostra de onde vem (criação, clã,
   Predador, experiência, ajuste). Corrigir no modo Edição: antes de
   concluir a criação muda a base; depois, vira um AJUSTE com motivo —
   nada some do histórico.

   FICHA AVULSA X CRÔNICA. Avulsa, o tempo (sessão, noite, cena, turno)
   anda pelos botões desta ficha. Numa crônica, quem anda o tempo é o
   Narrador (página da campanha): a ficha mostra e recebe.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el;
  function C() { return global.RAMAVampiroCatalogo; }
  function DS() { return global.RAMAVampiroDisciplinas; }
  function R() { return global.RAMAVampiro; }
  function T() { return global.RAMAVampiroTela; }
  function M() { return global.RAMAVampiroMesaDaFicha; }
  function UI() { return global.RAMAUI; }

  function op(ctx, fn, x) { return T().operar(ctx, fn, x); }
  function ok(eventos) { return { ok: true, eventos: eventos || [] }; }
  function botao(texto, aoClicar, opcoes) {
    var o = opcoes || {};
    return el("button.r-botao.r-botao--mini", { type: "button", texto: texto, disabled: !!o.motivo, title: o.motivo || o.dica || "", class: o.classe || "", onclick: aoClicar });
  }
  function composicaoTexto(comp) { return (comp || []).map(function (c) { return c.fonte + " " + (c.valor >= 0 ? "+" : "") + c.valor + (c.motivo ? " (" + c.motivo + ")" : ""); }).join(" · ") || "—"; }

  /* Corrigir um valor no modo Edição (ver o cabeçalho). */
  function corrigir(o, tipo, alvo, novo, atual) {
    var delta = novo - atual;
    if (!delta) return ok();
    if (!o.criacao.concluida) {
      if (tipo === "atributo") o.atributos[alvo] = Math.max(0, (o.atributos[alvo] || 0) + delta);
      if (tipo === "habilidade") o.habilidades[alvo] = Math.max(0, (o.habilidades[alvo] || 0) + delta);
      if (tipo === "disciplina") o.disciplinas[alvo] = Math.max(0, (o.disciplinas[alvo] || 0) + delta);
      return ok();
    }
    o.ajustes.push({ id: R().novoId("aj"), tipo: tipo, alvo: alvo, valor: delta, origem: "ajuste", motivo: "Correção no modo Edição" });
    return ok();
  }

  function estadoTexto(c, o) {
    var e = [];
    if (c.estado === "morteFinal") e.push("Morte Final");
    if (c.estado === "torpor") e.push("Torpor");
    if (o.estado.estacado) e.push("Estacado");
    if (c.estado === "besta") e.push("Wassail");
    if (o.estado.frenesi) e.push("Frenesi (" + T().nomeDe(C().FRENESI, o.estado.frenesi.tipo) + ")");
    if (o.estado.compulsao) e.push("Compulsão: " + (o.estado.compulsao.cla ? (C().CLAS[o.cla] || {}).compulsao.nome : T().nomeDe(C().COMPULSOES, o.estado.compulsao.chave)));
    if (o.estado.degeneracao) e.push("Degeneração");
    if (c.vitalidade.debilitado) e.push("Debilitado (físico)");
    if (c.forcaDeVontade.debilitado) e.push("Debilitado (mental)");
    if (c.estado === "incapacitado") e.push("Incapacitado");
    if (c.estado === "morte") e.push("Morto");
    return e;
  }

  function trilhaDeHumanidade(hum, maculas) {
    var caixas = [];
    for (var i = 0; i < 10; i++) {
      var tipo = i < hum ? "cheio" : i >= 10 - maculas ? "macula" : "";
      caixas.push(el("span.vamp-caixa", { class: tipo === "cheio" ? "vamp-caixa--humanidade" : tipo === "macula" ? "vamp-caixa--macula" : "", "aria-hidden": "true", texto: tipo === "macula" ? "/" : "" }));
    }
    var leitura = "Humanidade " + hum + ", " + maculas + " Mácula(s), " + Math.max(0, 10 - hum - maculas) + " espaço(s) vazio(s)";
    return el("span.vamp-trilha.vamp-trilha--humanidade", { role: "img", "aria-label": leitura, title: leitura }, caixas);
  }

  /* ---------------------------------------------------------------
     BLOCO SUPERIOR
     --------------------------------------------------------------- */

  function blocoSuperior(ctx) {
    var o = ctx.ficha.vampiro;
    if (!o || !R()) return el("p", { texto: "O motor de Vampiro não está carregado nesta página." });
    var c = R().calcular(o);
    var geral = global.RAMASecaoGeral;
    var cla = C().CLAS[o.cla];
    var natureza = { vampiro: "", carnical: "Carniçal", mortal: "Mortal" }[o.natureza];
    var linha = [natureza, cla ? cla.nome : "sem clã", o.natureza === "vampiro" && !R().ehSangueRalo(o) ? o.geracao + "ª geração" : "", c.predador ? c.predador.nome : ""].filter(Boolean).join(" · ");
    var estados = estadoTexto(c, o);
    var crianca = !o.criacao.concluida && o.natureza === "vampiro";
    var cronica = M().dados(ctx);
    return el("div.vamp-bloco", { dataset: { estado: c.estado, frenesi: o.estado.frenesi ? "1" : "" } }, [
      el("div.vamp-bloco__identidade", {}, [
        global.RAMACapaSistema ? global.RAMACapaSistema.elemento("vampiro", { tamanho: "p" }) : null,
        geral && geral.foto ? geral.foto(ctx) : null,
        el("div.vamp-bloco__textos", {}, [
          geral && geral.campoNome ? geral.campoNome(ctx) : el("h1.t-titulo", { texto: ctx.ficha.nome }),
          el("p.vamp-bloco__linha", { texto: "Vampiro · " + linha }),
          o.conceito ? el("p.t-mini", { texto: o.conceito }) : null,
          el("p.vamp-bloco__estado", { role: "status" }, estados.length
            ? estados.map(function (s) { return el("span.r-etiqueta.r-etiqueta--aviso", { texto: s }); })
            : [el("span.r-etiqueta", { texto: "Ativo" })]),
        ]),
      ]),
      el("dl.vamp-bloco__trilhas", {}, [
        el("dt", { texto: "Vitalidade " + c.vitalidade.atual + "/" + c.vitalidade.max }), el("dd", {}, [T().trilha(c.vitalidade, "Vitalidade")]),
        el("dt", { texto: "Força de Vontade " + c.forcaDeVontade.atual + "/" + c.forcaDeVontade.max }), el("dd", {}, [T().trilha(c.forcaDeVontade, "Força de Vontade")]),
        o.natureza === "vampiro" ? el("dt", { texto: "Fome " + o.fome }) : null, o.natureza === "vampiro" ? el("dd", {}, [T().fome(o.fome)]) : null,
        el("dt", { texto: "Humanidade " + c.humanidade + (o.maculas ? " · " + o.maculas + " Mácula(s)" : "") }), el("dd", {}, [trilhaDeHumanidade(c.humanidade, o.maculas)]),
        o.natureza === "vampiro" ? el("dt", { texto: "Potência do Sangue " + c.potencia }) : null,
        o.natureza === "vampiro" ? el("dd", {}, [T().pontos({ valor: c.potencia, maximo: 10, rotulo: "Potência do Sangue" })]) : null,
      ]),
      el("div.faixa.vamp-bloco__acoes", {}, [
        ctx.podeEditar() ? botao("Teste", function () { T().testar(ctx, {}); }) : null,
        ctx.podeEditar() && o.natureza === "vampiro" ? botao("Checagem de Sangue", function () { checagem(ctx); }, { motivo: o.fome >= 5 ? "Com Fome 5 não se Inflama o Sangue por vontade." : "" }) : null,
        o.ressonancia ? el("span.r-etiqueta", { texto: "Ressonância " + C().RESSONANCIAS[o.ressonancia.tipo].nome + " (" + C().TEMPERAMENTOS[o.ressonancia.temperamento] + ")" }) : null,
        cronica ? el("span.t-mini", { texto: "Crônica · noite " + (cronica.estado || cronica.vista || {}).noite + ", cena " + ((cronica.estado || cronica.vista || {}).cena || 0) }) : null,
      ]),
      crianca ? el("div.vamp-pendencias", { role: "status" }, [
        el("p", { texto: "A criação ainda tem pendências." }),
        ctx.podeEditar() && global.RAMAVampiroCriar ? botao("Continuar a criação", function () { global.RAMAVampiroCriar.abrir({ ctx: ctx }); }) : null,
      ]) : null,
    ]);
  }

  function checagem(ctx) {
    UI().pedirTexto({ titulo: "Checagem de Sangue", rotulo: "Por quê? (um poder, uma ação)", valor: "", rotuloConfirmar: "Rolar" }).then(function (motivo) {
      if (motivo === null) return;
      op(ctx, function (o) { return R().checagemDeSangue(o, { motivo: motivo || "Checagem" }, T().rolador); });
    });
  }

  /* ---------------------------------------------------------------
     ABA PERSONAGEM
     --------------------------------------------------------------- */

  function abaPersonagem(ctx) {
    var o = ctx.ficha.vampiro;
    var c = R().calcular(o);
    var edicao = ctx.emEdicao() && ctx.podeEditar();
    var cats = ["fisico", "social", "mental"];
    var nomesCat = { fisico: "Físicos", social: "Sociais", mental: "Mentais" };

    var atributos = el("div.vamp-grade", {}, cats.map(function (cat) {
      return el("div.vamp-coluna", {}, [el("h3.t-rotulo", { texto: nomesCat[cat] })].concat(C().ATRIBUTOS.filter(function (a) { return a.categoria === cat; }).map(function (a) {
        var x = c.atributos[a.chave];
        return el("div.vamp-linha", { title: composicaoTexto(x.composicao) }, [
          ctx.podeEditar() && !edicao ? el("button.vamp-linha__nome.r-link", { type: "button", texto: a.nome, onclick: function () { T().testar(ctx, { atributo: a.chave }); } }) : el("span.vamp-linha__nome", { texto: a.nome }),
          T().pontos({ valor: x.valor, maximo: 5, rotulo: a.nome, aoMudar: edicao ? function (v) { op(ctx, function (b) { return corrigir(b, "atributo", a.chave, v, x.valor); }, { silencioso: true }); } : null }),
          el("span.so-leitor", { texto: "Composição: " + composicaoTexto(x.composicao) }),
        ]);
      })));
    }));

    var esps = R().especializacoesDaFicha(o);
    var habilidades = el("div.vamp-grade", {}, cats.map(function (cat) {
      return el("div.vamp-coluna", {}, [el("h3.t-rotulo", { texto: nomesCat[cat] })].concat(C().HABILIDADES.filter(function (h) { return h.categoria === cat; }).map(function (h) {
        var x = c.habilidades[h.chave] || { valor: 0, composicao: [] };
        var minhas = esps.filter(function (e) { return e.habilidade === h.chave; });
        return el("div.vamp-linha", { title: composicaoTexto(x.composicao), class: x.valor ? "" : "vamp-linha--zero" }, [
          ctx.podeEditar() && !edicao ? el("button.vamp-linha__nome.r-link", { type: "button", texto: h.nome, onclick: function () { T().testar(ctx, { habilidade: h.chave }); } }) : el("span.vamp-linha__nome", { texto: h.nome }),
          T().pontos({ valor: x.valor, maximo: 5, rotulo: h.nome, aoMudar: edicao ? function (v) { op(ctx, function (b) { return corrigir(b, "habilidade", h.chave, v, x.valor); }, { silencioso: true }); } : null }),
          minhas.length ? el("span.vamp-linha__esp", { texto: minhas.map(function (e) { return e.nome; }).join(", ") }) : null,
        ]);
      })));
    }));

    return el("div.vamp-aba.pilha", {}, [
      UI().painel("Atributos", [atributos, el("p.t-mini", { texto: edicao ? "Modo Edição: os pontos corrigem o valor (" + (o.criacao.concluida ? "como ajuste registrado" : "na base da criação") + "). Comprar com XP fica na aba Experiência." : "Clique no nome para testar. Passe o mouse para ver de onde vem o valor." })]),
      UI().painel("Habilidades", [habilidades, painelEspecializacoes(ctx, esps, edicao)]),
      UI().painel("Identidade", [painelIdentidade(ctx, edicao)]),
      UI().painel("Tempo de jogo", [painelDoTempo(ctx)]),
      UI().painel("Campanha", [edicao && global.RAMASecaoGeral && global.RAMASecaoGeral.campoCampanha
        ? global.RAMASecaoGeral.campoCampanha(ctx)
        : el("p", { texto: (ctx.nomeDaCampanha() || "Sem campanha (ficha avulsa)") + (ctx.emEdicao() ? "" : " — troque no modo Edição.") })]),
    ]);
  }

  function painelEspecializacoes(ctx, esps, edicao) {
    var lista = el("ul.vamp-lista", {}, esps.map(function (e) {
      var origem = { criacao: "criação", gratis: "gratuita", predador: "Predador", xp: "experiência" }[e.origem] || e.origem;
      return el("li", {}, [el("span", { texto: T().nomeHab(e.habilidade) + " (" + e.nome + ") — " + origem }),
        edicao && e.origem !== "predador" ? el("button.r-icone", { type: "button", "aria-label": "Tirar " + e.nome, onclick: function () { op(ctx, function (b) { b.especializacoes = b.especializacoes.filter(function (x) { return x.id !== e.id; }); return ok(); }); } }, [UI().simbolo("x")]) : null]);
    }));
    return el("div.pilha.pilha--curta", {}, [el("h3.t-rotulo", { texto: "Especializações" }), esps.length ? lista : el("p.t-mini", { texto: "Nenhuma." })]);
  }

  function painelIdentidade(ctx, edicao) {
    var o = ctx.ficha.vampiro;
    function campoTexto(rotulo, chave, limite, area) {
      return UI().campo({ rotulo: rotulo, tipo: area ? "area" : "texto", linhas: 3, valor: o[chave] || "", limite: limite || 200,
        aoMudar: function (v) { op(ctx, function (b) { b[chave] = v; return ok(); }, { silencioso: true, regioes: ["bloco"] }); } });
    }
    if (edicao) {
      return el("div.editar-grade", {}, [
        campoTexto("Conceito", "conceito", 200), campoTexto("Senhor", "senhor", 120),
        campoTexto("Ambição", "ambicao", 300), campoTexto("Desejo", "desejo", 300),
        campoTexto("Idade verdadeira", "idadeVerdadeira", 40), campoTexto("Idade aparente", "idadeAparente", 40), campoTexto("Época do Abraço", "epoca", 80),
        o.cla === "malkaviano" || o.cla === "ventrue" ? campoTexto(o.cla === "ventrue" ? "Presa preferida (Perdição Ventrue)" : "Categoria afligida (fisico, social ou mental)", "perdicaoParametro", 120) : null,
        campoTexto("Notas", "notas", 4000, true),
      ]);
    }
    var cla = C().CLAS[o.cla];
    function linha(r, v) { return v ? [el("dt", { texto: r }), el("dd", { texto: v })] : []; }
    return el("dl.vamp-dl", {}, [].concat(
      linha("Conceito", o.conceito), linha("Clã", cla ? cla.nome : ""), linha("Senhor", o.senhor),
      linha("Geração", o.natureza === "vampiro" && !R().ehSangueRalo(o) ? o.geracao + "ª" : ""), linha("Idade", (C().IDADES[o.idade] || {}).nome),
      linha("Predador", (C().PREDADORES[o.predador] || {}).nome),
      linha("Ambição", o.ambicao), linha("Desejo", o.desejo),
      linha("Perdição", cla && cla.perdicao ? cla.perdicao.texto + " (Gravidade " + R().gravidadeDaPerdicao(o) + ")" : ""),
      linha("Compulsão do clã", cla && cla.compulsao ? cla.compulsao.nome + ": " + cla.compulsao.termina : ""),
      linha("Idade verdadeira / aparente", [o.idadeVerdadeira, o.idadeAparente].filter(Boolean).join(" / ")),
      linha("Notas", o.notas)));
  }

  /* O tempo da ficha avulsa. Na crônica, o Narrador conduz. */
  function painelDoTempo(ctx) {
    var o = ctx.ficha.vampiro;
    var t = o.tempo;
    var cron = M().dados(ctx);
    var texto = "Sessão " + t.sessao + " · noite " + t.noite + " · cena " + t.cena + (t.turno ? " · turno " + t.turno : "");
    if (ctx.ficha.campanhaId && cron) return el("div.pilha.pilha--curta", {}, [
      el("p", { texto: texto + ". Na crônica, o Narrador anda o tempo: sessão, noite (com a Checagem do despertar), cena e turno chegam a esta ficha sozinhos." }),
      ctx.podeEditar() ? el("div.faixa", {}, [
        botao("Cumpri meu Desejo", function () { op(ctx, function (b) { return R().cumprirDesejo(b); }); }, { dica: "1× por sessão: recupera 1 Superficial de Força de Vontade (a mesa confirma)." }),
      ]) : null,
    ]);
    if (!ctx.podeEditar()) return el("p", { texto: texto });
    return el("div.pilha.pilha--curta", {}, [
      el("p", { texto: "Ficha avulsa — " + texto + ". O tempo só anda por estes botões." }),
      el("div.faixa", {}, [
        botao("Iniciar sessão", function () { op(ctx, function (b) { return R().inicioDaSessao(b, {}); }); }, { dica: "Recupera a Força de Vontade da sessão. Não é uma noite nova." }),
        botao("Nova noite (despertar)", function () { op(ctx, function (b) { return R().novaNoite(b, T().rolador); }); }, { dica: "Checagem do despertar; efeitos da noite expiram." }),
        botao("Nova cena", function () { op(ctx, function (b) { return R().novaCena(b); }); }),
        botao("Fim da cena", function () { op(ctx, function (b) { return R().fimDaCena(b); }); }),
        botao("Fim do turno", function () { op(ctx, function (b) { return R().fimDoTurno(b); }); }),
      ]),
      el("div.faixa", {}, [
        botao("Cumpri meu Desejo", function () { op(ctx, function (b) { return R().cumprirDesejo(b); }); }),
        botao("Encerrar sessão", function () { encerrarSessao(ctx); }, { dica: "Ambição, XP e o Remorso de quem tem Máculas." }),
      ]),
    ]);
  }

  function encerrarSessao(ctx) {
    var amb = false;
    var xp = UI().campo({ rotulo: "XP da sessão", tipo: "numero", valor: 1 });
    UI().modal({
      titulo: "Encerrar a sessão",
      conteudo: [
        el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) { amb = ev.currentTarget.checked; } }), el("span", { texto: "A Ambição foi trabalhada (recupera 1 Agravado de Força de Vontade)" })]),
        xp,
        el("p.t-mini", { texto: "Com Máculas, o Remorso é rolado agora (dados = espaços vazios, mínimo 1)." }),
      ],
      botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Encerrar", classe: "r-botao--principal", aoClicar: function (f) {
        f(); op(ctx, function (b) { return R().fimDaSessao(b, { ambicao: amb, xp: U.inteiro(xp.entrada.value, 0), motivoXP: "Sessão" }, T().rolador); });
      } }],
    });
  }

  /* ---------------------------------------------------------------
     ABA SANGUE
     --------------------------------------------------------------- */

  function abaSangue(ctx) {
    var o = ctx.ficha.vampiro;
    var c = R().calcular(o);
    var pode = ctx.podeEditar();
    var vampiro = o.natureza === "vampiro";
    var tab = c.tabelaPotencia;
    var potencia = vampiro ? el("dl.vamp-dl", {}, [
      el("dt", { texto: "Surto de Sangue" }), el("dd", { texto: "+" + tab.surto + " dado(s)" }),
      el("dt", { texto: "Cura por Checagem" }), el("dd", { texto: tab.recupera + " Superficial" }),
      el("dt", { texto: "Bônus em Disciplinas" }), el("dd", { texto: tab.bonusPoder ? "+" + tab.bonusPoder : "—" }),
      el("dt", { texto: "Rerrolar Checagem de poder" }), el("dd", { texto: tab.rerrolagem ? "nível " + tab.rerrolagem + " ou menos" : "—" }),
      el("dt", { texto: "Gravidade da Perdição" }), el("dd", { texto: String(c.gravidadePerdicao) }),
      el("dt", { texto: "Penalidade de alimentação" }), el("dd", { texto: tab.animalEnsacado === "nada" ? "Animal e ensacado não saciam" : tab.animalEnsacado === "metade" ? "Animal e ensacado saciam a metade" : tab.saciaMenos ? "Humanos saciam " + tab.saciaMenos + " a menos" : "Nenhuma" }),
      el("dt", { texto: "Limites pela geração" }), el("dd", { texto: c.limitesDePotencia[0] + " a " + c.limitesDePotencia[1] }),
    ]) : null;
    return el("div.vamp-aba.pilha", {}, [
      vampiro ? UI().painel("Fome e Checagens", [
        el("div.faixa", {}, [T().fome(o.fome), el("strong", { texto: "Fome " + o.fome + (o.fracaoDeFome ? " (meio ponto saciado)" : "") })]),
        el("p.t-mini", { texto: "Cada nível de Fome troca um dado comum por um dado de Fome. Com Fome 5, nada de Inflar o Sangue por vontade; uma Checagem forçada que falha vira teste de frenesi (p. 211)." }),
        pode ? el("div.faixa", {}, [
          botao("Checagem de Sangue", function () { checagem(ctx); }, { motivo: o.fome >= 5 ? "Fome 5." : "" }),
          botao("Rubor de Vida", function () { op(ctx, function (b) { return R().ruborDeVida(b, T().rolador); }); }, { dica: "Parecer vivo por uma noite (p. 218)." }),
          ctx.emEdicao() ? botao("Fome −1 (ajuste)", function () { op(ctx, function (b) { b.fome = Math.max(0, b.fome - 1); return ok(); }); }) : null,
          ctx.emEdicao() ? botao("Fome +1 (ajuste)", function () { op(ctx, function (b) { return ok(R().aumentarFome(b, 1, "Ajuste")); }); }) : null,
        ]) : null,
      ]) : null,
      vampiro ? UI().painel("Potência do Sangue " + c.potencia, [potencia]) : null,
      vampiro ? UI().painel("Alimentação e caça", [painelAlimentacao(ctx)]) : null,
      vampiro ? UI().painel("Ressonância", [painelRessonancia(ctx)]) : null,
      UI().painel("Dano e cura", [painelDano(ctx, c)]),
      vampiro ? UI().painel("Frenesi", [painelFrenesi(ctx)]) : null,
      vampiro ? UI().painel("Torpor, estaca, sol e fogo", [painelEstados(ctx)]) : null,
      UI().painel("Efeitos ativos", [painelEfeitos(ctx)]),
    ]);
  }

  function painelAlimentacao(ctx) {
    var o = ctx.ficha.vampiro;
    var pode = ctx.podeEditar();
    var p = { fonte: "humanoGoles", quantidade: 1, confirmarMorte: false, ressonancia: { tipo: "", temperamento: "efemero", discrasia: "" } };
    var previa = el("div.vamp-previa", { role: "status" });
    function desenharPrevia() {
      var pl = R().planejarAlimentacao(o, p);
      if (!pl.ok) { U.trocar(previa, [el("p", { texto: pl.motivo })]); return; }
      U.trocar(previa, [
        el("p", { texto: "Sacia " + pl.sacia + (pl.meio ? " (metade)" : "") + " · Fome " + pl.fomeAntes + " → " + pl.fomeFinal + (pl.minimo ? " (mínimo " + pl.minimo + " sem matar)" : "") + (pl.tempo ? " · " + pl.tempo : "") }),
        pl.avisos.length ? el("ul.vamp-lista.t-mini", {}, pl.avisos.map(function (a) { return el("li", { texto: a }); })) : null,
        pl.custos.length ? el("p.t-mini", { texto: "Custos: " + pl.custos.map(function (x) { return x.valor + " FdV (" + x.motivo + ")"; }).join(", ") }) : null,
        pl.escolhas.length ? el("ul.vamp-lista.t-mini", {}, pl.escolhas.map(function (a) { return el("li", { texto: a.texto }); })) : null,
      ]);
    }
    var fontes = Object.keys(C().FONTES_DE_SANGUE).filter(function (k) { return !C().FONTES_DE_SANGUE[k].vampiro; });
    var selFonte = UI().campo({ rotulo: "Fonte", tipo: "selecao", valor: p.fonte, opcoes: fontes.map(function (k) { return { valor: k, rotulo: C().FONTES_DE_SANGUE[k].nome + " (sacia " + C().FONTES_DE_SANGUE[k].sacia + ")" }; }), aoMudar: function (v) { p.fonte = v; desenharPrevia(); } });
    var res = UI().campo({ rotulo: "Ressonância da presa (humano)", tipo: "selecao", valor: "", opcoes: [{ valor: "", rotulo: "Sem / não sabe" }].concat(Object.keys(C().RESSONANCIAS).filter(function (k) { return k !== "animal"; }).map(function (k) { return { valor: k, rotulo: C().RESSONANCIAS[k].nome }; })), aoMudar: function (v) { p.ressonancia.tipo = v; } });
    var temp = UI().campo({ rotulo: "Temperamento", tipo: "selecao", valor: "efemero", opcoes: Object.keys(C().TEMPERAMENTOS).map(function (k) { return { valor: k, rotulo: C().TEMPERAMENTOS[k] }; }), aoMudar: function (v) { p.ressonancia.temperamento = v; } });
    var matar = el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) { p.confirmarMorte = ev.currentTarget.checked; } }), el("span", { texto: "Confirmo: drenar até a morte (só se a fonte for esta)" })]);
    desenharPrevia();
    var cron = M().dados(ctx);
    var outros = cron && cron.personagens ? cron.personagens.filter(function (x) { return x.id !== ctx.personagemId; }) : [];
    return el("div.pilha.pilha--curta", {}, [
      el("div.editar-grade", {}, [selFonte, res, temp]), matar, previa,
      pode ? el("div.faixa", {}, [botao("Alimentar-se", function () {
        var pedido = Object.assign({}, p, { ressonancia: p.ressonancia.tipo ? p.ressonancia : null });
        op(ctx, function (b) { return R().alimentar(b, pedido, T().rolador); });
      })]) : null,
      pode ? el("div.faixa", {}, [
        botao("Rolar a caçada", function () { cacada(ctx); }, { dica: "A parada do Predador contra a Dificuldade do território (p. 306)." }),
      ]) : null,
      pode && outros.length ? painelBeberDeVampiro(ctx, outros) : null,
      o.lacos.length ? el("div", {}, [el("h3.t-rotulo", { texto: "Laços de Sangue" }), el("ul.vamp-lista", {}, o.lacos.map(function (l) { return el("li", { texto: (l.reinante || "Reinante") + " — força " + l.forca + (l.ultimaNoite ? " (última vez: noite " + l.ultimaNoite + ")" : "") }); }))]) : null,
    ]);
  }

  function cacada(ctx) {
    var o = ctx.ficha.vampiro;
    var pred = C().PREDADORES[o.predador];
    var alt = 0, terr = "classeMedia", mods = [];
    var altCampo = pred && pred.parada.length > 1 ? UI().campo({ rotulo: "Parada", tipo: "selecao", valor: "0", opcoes: pred.parada.map(function (x, i) { return { valor: String(i), rotulo: x.map(function (k) { return C().atributo(k) ? T().nomeAtr(k) : C().habilidade(k) ? T().nomeHab(k) : T().nomeDe(C().VANTAGENS, k); }).join(" + ") }; }), aoMudar: function (v) { alt = U.inteiro(v, 0); } }) : null;
    var terrCampo = UI().campo({ rotulo: "Território", tipo: "selecao", valor: terr, opcoes: C().TERRITORIOS_DE_CACA.map(function (t) { return { valor: t.chave, rotulo: t.nome + " (Dif. " + t.dificuldade + ")" }; }), aoMudar: function (v) { terr = v; } });
    var modsCampo = el("div.pilha.pilha--curta", {}, C().MODIFICADORES_DE_CACA.map(function (m) { return el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) { if (ev.currentTarget.checked) mods.push(m.chave); else mods = mods.filter(function (x) { return x !== m.chave; }); } }), el("span", { texto: m.nome + " (" + (m.valor > 0 ? "+" : "") + m.valor + ")" })]); }));
    UI().modal({
      titulo: "Caçada",
      conteudo: [el("p.t-mini", { texto: pred ? "Predador: " + pred.nome + "." : "Sem Predador: Raciocínio + Manha." }), altCampo, terrCampo, modsCampo],
      botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Rolar", classe: "r-botao--principal", aoClicar: function (f) {
        f();
        var pedido = R().paradaDeCaca(o, alt);
        pedido.dificuldade = R().dificuldadeDeCaca(terr, mods);
        pedido.rotulo = "Caçada";
        var res = null;
        var r = op(ctx, function (b) { var x = R().rolarTeste(b, pedido, T().rolador); if (x.ok) res = x.resultado; return x; }, { regioes: ["bloco"] });
        if (r.ok !== false && res) T().resultado(ctx, res);
      } }],
    });
  }

  function painelBeberDeVampiro(ctx, outros) {
    var doador = outros[0].id, pontos = 1;
    return el("div.pilha.pilha--curta.vamp-cronica-acao", {}, [
      el("h3.t-rotulo", { texto: "Beber de outro vampiro da crônica" }),
      el("p.t-mini", { texto: "O servidor confere que você pode mexer nas DUAS fichas (ou pede ao Narrador). A Fome do doador sobe; pode surgir Laço de Sangue." }),
      el("div.editar-grade", {}, [
        UI().campo({ rotulo: "Doador", tipo: "selecao", valor: doador, opcoes: outros.map(function (x) { return { valor: x.id, rotulo: x.nome }; }), aoMudar: function (v) { doador = v; } }),
        UI().campo({ rotulo: "Fome que o doador perde", tipo: "numero", valor: 1, aoMudar: function (v) { pontos = U.inteiro(v, 1); } }),
      ]),
      botao("Beber", function () { M().operar(ctx, { tipo: "alimentarDeVampiro", quem: ctx.personagemId, doador: doador, fome: pontos }); }),
    ]);
  }

  function painelRessonancia(ctx) {
    var o = ctx.ficha.vampiro;
    var pode = ctx.podeEditar();
    var r = o.ressonancia;
    var atual = r ? el("div.pilha.pilha--curta", {}, [
      el("p", { texto: C().RESSONANCIAS[r.tipo].nome + " · " + C().TEMPERAMENTOS[r.temperamento] + (r.fonte ? " · de " + r.fonte : "") }),
      el("p.t-mini", { texto: "Disciplinas: " + C().RESSONANCIAS[r.tipo].disciplinas.map(T().nomeDisc).join(", ") + (r.temperamento !== "efemero" ? " (+1 dado nelas)" : "") + ". Humor: " + C().RESSONANCIAS[r.tipo].humor + "." }),
      r.discrasia ? el("p", { texto: "Discrasia: " + C().DISCRASIAS[r.discrasia].nome + " — " + C().DISCRASIAS[r.discrasia].texto }) : null,
    ]) : el("p.t-mini", { texto: "Nenhuma Ressonância ativa." });
    if (!pode) return atual;
    var n = { tipo: r ? r.tipo : "colerica", temperamento: r ? r.temperamento : "efemero", discrasia: "" };
    var disc = el("div");
    function desenharDisc() {
      if (n.temperamento !== "agudo") { U.limpar(disc); return; }
      var lista = Object.keys(C().DISCRASIAS).filter(function (k) { return C().DISCRASIAS[k].ressonancia === n.tipo; });
      U.trocar(disc, [UI().campo({ rotulo: "Discrasia", tipo: "selecao", valor: n.discrasia, opcoes: [{ valor: "", rotulo: "Escolha…" }].concat(lista.map(function (k) { return { valor: k, rotulo: C().DISCRASIAS[k].nome }; })), aoMudar: function (v) { n.discrasia = v; } })]);
    }
    desenharDisc();
    return el("div.pilha.pilha--curta", {}, [atual,
      el("div.editar-grade", {}, [
        UI().campo({ rotulo: "Ressonância", tipo: "selecao", valor: n.tipo, opcoes: Object.keys(C().RESSONANCIAS).map(function (k) { return { valor: k, rotulo: C().RESSONANCIAS[k].nome }; }), aoMudar: function (v) { n.tipo = v; desenharDisc(); } }),
        UI().campo({ rotulo: "Temperamento", tipo: "selecao", valor: n.temperamento, opcoes: Object.keys(C().TEMPERAMENTOS).map(function (k) { return { valor: k, rotulo: C().TEMPERAMENTOS[k] }; }), aoMudar: function (v) { n.temperamento = v; desenharDisc(); } }),
      ]), disc,
      el("div.faixa", {}, [
        botao("Definir", function () { op(ctx, function (b) { return ok(R().definirRessonancia(b, n)); }); }),
        botao("Sortear (tabela)", function () { op(ctx, function (b) { return ok(R().definirRessonancia(b, R().ressonanciaAleatoria(T().rolador))); }); }),
        r ? botao("Limpar", function () { op(ctx, function (b) { return ok(R().definirRessonancia(b, null)); }); }) : null,
      ]),
    ]);
  }

  function painelDano(ctx, c) {
    var o = ctx.ficha.vampiro;
    var pode = ctx.podeEditar();
    var d = { trilha: "vitalidade", tipo: "superficial", valor: 1, fonte: "fisico", naoDividir: false };
    var pen = R().penalidadesDeTrilha(o, ["fisico", "social", "mental"]);
    return el("div.pilha.pilha--curta", {}, [
      el("div.faixa", {}, [el("span", { texto: "Vitalidade" }), T().trilha(c.vitalidade, "Vitalidade")]),
      el("div.faixa", {}, [el("span", { texto: "Força de Vontade" }), T().trilha(c.forcaDeVontade, "Força de Vontade")]),
      el("p.t-mini", { texto: "/ = Superficial · X = Agravado. Superficial de vampiro é dividido por 2 (arred. para cima), exceto o que a regra diz. Sem espaço livre, Superficial vira Agravado." + (pen && pen.length ? " Penalidades: " + pen.map(function (x) { return x.fonte + " −" + Math.abs(x.valor); }).join(", ") + "." : "") }),
      pode ? el("div.editar-grade", {}, [
        UI().campo({ rotulo: "Trilha", tipo: "selecao", valor: d.trilha, opcoes: [{ valor: "vitalidade", rotulo: "Vitalidade" }, { valor: "forcaDeVontade", rotulo: "Força de Vontade" }], aoMudar: function (v) { d.trilha = v; } }),
        UI().campo({ rotulo: "Tipo", tipo: "selecao", valor: d.tipo, opcoes: [{ valor: "superficial", rotulo: "Superficial" }, { valor: "agravado", rotulo: "Agravado" }], aoMudar: function (v) { d.tipo = v; } }),
        UI().campo({ rotulo: "Quanto", tipo: "numero", valor: 1, aoMudar: function (v) { d.valor = U.inteiro(v, 1); } }),
        UI().campo({ rotulo: "Fonte", tipo: "selecao", valor: d.fonte, opcoes: [{ valor: "fisico", rotulo: "Física" }, { valor: "social", rotulo: "Social/mental" }, { valor: "fogo", rotulo: "Fogo" }, { valor: "sol", rotulo: "Sol" }, { valor: "gasto", rotulo: "Gasto voluntário" }], aoMudar: function (v) { d.fonte = v; } }),
      ]) : null,
      pode ? el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) { d.naoDividir = ev.currentTarget.checked; } }), el("span", { texto: "Não dividir (rolagem única, Armas Ferais, gasto…)" })]) : null,
      pode ? el("div.faixa", {}, [
        botao("Sofrer dano", function () { op(ctx, function (b) { return R().sofrerDano(b, d); }); }),
        botao("Gastar 1 de Força de Vontade", function () { op(ctx, function (b) { return R().gastarForcaDeVontade(b, 1, "Gasto"); }); }),
        o.natureza === "vampiro" ? botao("Curar Superficial (1 Checagem)", function () { op(ctx, function (b) { return R().curarSuperficial(b, T().rolador); }); }, { motivo: !o.vitalidade.superficial ? "Sem Superficial à Vitalidade." : "" }) : null,
        o.natureza === "vampiro" ? botao("Curar 1 Agravado (3 Checagens)", function () { op(ctx, function (b) { return R().curarAgravado(b, T().rolador); }); }, { motivo: !o.vitalidade.agravado ? "Sem Agravado à Vitalidade." : "" }) : null,
        o.natureza !== "vampiro" ? botao("Passar dias (cura mortal)", function () {
          UI().pedirTexto({ titulo: "Cura mortal", rotulo: "Quantos dias?", valor: "1" }).then(function (v) { if (v !== null) op(ctx, function (b) { return R().curarComoMortal(b, U.inteiro(v, 1)); }); });
        }) : null,
      ]) : null,
    ]);
  }

  function painelFrenesi(ctx) {
    var o = ctx.ficha.vampiro;
    var pode = ctx.podeEditar();
    var f = o.estado.frenesi;
    var tipo = "furia", gatilho = 0;
    var gat = el("div");
    function desenharGat() {
      U.trocar(gat, [UI().campo({ rotulo: "Gatilho", tipo: "selecao", valor: String(gatilho), opcoes: C().FRENESI[tipo].gatilhos.map(function (g, i) { return { valor: String(i), rotulo: g.nome + " (Dif. " + g.dificuldade + ")" }; }), aoMudar: function (v) { gatilho = U.inteiro(v, 0); } })]);
    }
    desenharGat();
    var par = R().paradaDeFrenesi(o, tipo);
    return el("div.pilha.pilha--curta", {}, [
      f ? el("p", { role: "status", texto: "Em frenesi de " + C().FRENESI[f.tipo].nome + (f.curtindo ? " (Curtindo a Onda)" : "") + ". Só Disciplinas físicas; sem Força de Vontade para rerrolar." }) : el("p.t-mini", { texto: "Resistir: Força de Vontade atual + 1/3 da Humanidade, sem Fome. Agora: " + par.total + " dado(s)." }),
      pode && !f ? el("div.editar-grade", {}, [UI().campo({ rotulo: "Tipo", tipo: "selecao", valor: tipo, opcoes: Object.keys(C().FRENESI).map(function (k) { return { valor: k, rotulo: C().FRENESI[k].nome }; }), aoMudar: function (v) { tipo = v; gatilho = 0; desenharGat(); } }), gat]) : null,
      pode ? el("div.faixa", {}, f ? [
        botao("Assumir o controle por um turno (FdV)", function () { op(ctx, function (b) { return R().assumirControle(b, "Frenesi"); }); }),
        botao("O frenesi passou", function () { op(ctx, function (b) { return R().encerrarFrenesi(b, "Fim"); }); }),
      ] : [
        botao("Testar frenesi", function () { var g = C().FRENESI[tipo].gatilhos[gatilho]; op(ctx, function (b) { return R().testarFrenesi(b, { tipo: tipo, dificuldade: g.dificuldade, gatilho: g.nome }, T().rolador); }); }),
        botao("Curtir a Onda", function () { var g = C().FRENESI[tipo].gatilhos[gatilho]; op(ctx, function (b) { return R().testarFrenesi(b, { tipo: tipo, dificuldade: g.dificuldade, gatilho: g.nome, curtir: true }, T().rolador); }); }),
      ]) : null,
    ]);
  }

  function painelEstados(ctx) {
    var o = ctx.ficha.vampiro;
    var pode = ctx.podeEditar();
    var e = o.estado;
    var linhas = [];
    if (e.torpor) linhas.push(el("p", { texto: "Em Torpor desde a noite " + e.torpor.noite + (e.torpor.motivo ? " (" + e.torpor.motivo + ")" : "") + (e.torpor.dias ? ". Pela Humanidade: " + e.torpor.dias + " noite(s)" : "") + "." }));
    if (e.estacado) linhas.push(el("p", { texto: "Estacado: paralisado até removerem a estaca." }));
    if (e.morteFinal) linhas.push(el("p", { texto: "Morte Final: " + (e.morteFinal.causa || "") + ". A ficha fica guardada." }));
    return el("div.pilha.pilha--curta", {}, linhas.concat([
      pode && !e.morteFinal ? el("div.faixa", {}, [
        !e.torpor ? botao("Entrar em Torpor", function () { op(ctx, function (b) { return R().entrarEmTorpor(b, "Voluntário"); }); }) : botao("Despertar do Torpor", function () { op(ctx, function (b) { return R().despertarDoTorpor(b, "tempo"); }); }),
        e.torpor ? botao("Despertar com sangue mais potente", function () { op(ctx, function (b) { return R().despertarDoTorpor(b, "sangue"); }); }) : null,
        !e.estacado ? botao("Estaquear", function () { op(ctx, function (b) { return R().estaquear(b); }); }) : botao("Remover a estaca", function () { op(ctx, function (b) { return R().removerEstaca(b); }); }),
        botao("Luz do sol (1 turno)", function () { op(ctx, function (b) { return R().luzDoSol(b, "direta"); }); }),
        botao("Sol obscurecido", function () { op(ctx, function (b) { return R().luzDoSol(b, "obscurecida"); }); }),
        botao("Fogo", function () { escolherFogo(ctx); }),
        botao("Despertar de dia", function () {
          UI().pedirTexto({ titulo: "Despertar de dia", rotulo: "Dificuldade (crise)", valor: "3" }).then(function (v) { if (v !== null) op(ctx, function (b) { return R().despertarDeDia(b, U.inteiro(v, 3), T().rolador); }); });
        }),
      ]) : null,
      pode && !e.morteFinal ? el("div.faixa", {}, [botao("Morte Final", function () {
        UI().confirmar({ titulo: "Morte Final", texto: "Registrar a Morte Final? A ficha fica guardada para consulta.", rotuloConfirmar: "Registrar Morte Final", perigo: true }).then(function (sim) {
          if (sim) op(ctx, function (b) { return R().morteFinal(b, "Decisão da mesa"); });
        });
      }, { classe: "r-botao--perigo" })]) : null,
    ]));
  }

  function escolherFogo(ctx) {
    UI().modal({
      titulo: "Fogo",
      conteudo: [el("p.t-mini", { texto: "Agravado por turno conforme a exposição (p. 222)." })],
      botoes: [
        { rotulo: "Uma parte do corpo (1)", aoClicar: function (f) { f(); op(ctx, function (b) { return R().fogo(b, "parte"); }); } },
        { rotulo: "Grande parte do corpo (2)", aoClicar: function (f) { f(); op(ctx, function (b) { return R().fogo(b, "corpo"); }); } },
        { rotulo: "Engolfado (3)", classe: "r-botao--principal", aoClicar: function (f) { f(); op(ctx, function (b) { return R().fogo(b, "engolfado"); }); } },
      ],
    });
  }

  function painelEfeitos(ctx) {
    var o = ctx.ficha.vampiro;
    if (!o.efeitos.length) return el("p.t-mini", { texto: "Nenhum efeito ativo." });
    var dur = { cena: "até o fim da cena", noite: "até a próxima noite", turno: "neste turno", indefinida: "até encerrar", alimentacao: "até a próxima alimentação", ateFome5: "até a Fome chegar a 5", uso: "um uso", sessao: "até o fim da sessão" };
    return el("ul.vamp-lista", {}, o.efeitos.map(function (e) {
      return el("li.faixa", {}, [el("span", { texto: (e.nome || e.chave) + " — " + (dur[e.duracao] || e.duracao) }),
        ctx.podeEditar() ? botao("Encerrar", function () { op(ctx, function (b) { R().removerEfeito(b, e.id); return ok([R().evento("efeitoEncerrado", { chave: e.chave, nome: e.nome })]); }); }) : null]);
    }));
  }

  /* ---------------------------------------------------------------
     ABA HUMANIDADE
     --------------------------------------------------------------- */

  function abaHumanidade(ctx) {
    var o = ctx.ficha.vampiro;
    var c = R().calcular(o);
    var pode = ctx.podeEditar();
    var edicao = ctx.emEdicao() && pode;
    var t = c.humanidadeTabela || {};
    var narrador = !!(M().dados(ctx) && M().dados(ctx).mestre);
    return el("div.vamp-aba.pilha", {}, [
      UI().painel("Humanidade " + c.humanidade, [
        trilhaDeHumanidade(c.humanidade, o.maculas),
        el("p.t-mini", { texto: "Máculas preenchem da direita; passar dos espaços vazios é Degeneração (Agravado de FdV e −2 nos testes até o Remorso). Composição: " + composicaoTexto(c.humanidadeComposicao) }),
        el("dl.vamp-dl", {}, [
          el("dt", { texto: "Torpor" }), el("dd", { texto: t.torpor || "—" }),
          el("dt", { texto: "Com humanos" }), el("dd", { texto: t.penalidade ? "−" + t.penalidade + " dado(s) para interagir com humanos" : "Sem penalidade" }),
          el("dt", { texto: "Frenesi" }), el("dd", { texto: "1/3 da Humanidade (" + Math.floor(c.humanidade / 3) + ") soma à resistência" }),
          t.notas ? el("dt", { texto: "Nesta Humanidade" }) : null, t.notas ? el("dd", { texto: t.notas }) : null,
        ]),
        o.estado.degeneracao ? el("p", { role: "status", texto: "Em Degeneração." }) : null,
        pode ? el("div.faixa", {}, [
          botao("Testar Remorso agora", function () { op(ctx, function (b) { return R().testarRemorso(b, T().rolador); }); }, { motivo: !o.maculas ? "Sem Máculas." : "", dica: "Normalmente no fim da sessão." }),
          o.estado.degeneracao ? botao("Aceitar a Degeneração (−1 Humanidade)", function () { op(ctx, function (b) { return R().aceitarDegeneracao(b); }); }) : null,
          !M().dados(ctx) || narrador ? botao("Adicionar Máculas", function () { adicionarMaculas(ctx); }) : null,
          edicao ? botao("Humanidade +1 (arco da mesa)", function () { op(ctx, function (b) { return R().mudarHumanidade(b, 1, "ajuste", "Arco narrativo"); }); }) : null,
          edicao ? botao("Humanidade −1", function () { op(ctx, function (b) { return R().mudarHumanidade(b, -1, "ajuste", "Decisão da mesa"); }); }) : null,
        ]) : null,
        M().dados(ctx) && !narrador ? el("p.t-mini", { texto: "Na crônica, as Máculas são dadas pelo Narrador." }) : null,
      ]),
      UI().painel("Convicções e Pilares", [painelCrencas(ctx, edicao)]),
      UI().painel("Compulsão", [painelCompulsao(ctx)]),
    ]);
  }

  function adicionarMaculas(ctx) {
    var o = ctx.ficha.vampiro;
    var n = UI().campo({ rotulo: "Máculas", tipo: "numero", valor: 1 });
    var motivo = UI().campo({ rotulo: "Motivo (Princípio, Convicção…)", valor: "", limite: 200 });
    var conv = false;
    UI().modal({
      titulo: "Máculas",
      conteudo: [n, motivo, o.convicoes.length ? el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) { conv = ev.currentTarget.checked; } }), el("span", { texto: "Agiu por uma Convicção (mitiga)" })]) : null],
      botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Aplicar", classe: "r-botao--principal", aoClicar: function (f) {
        f(); op(ctx, function (b) { return R().adicionarMaculas(b, U.inteiro(n.entrada.value, 1), motivo.entrada.value, { convicao: conv, mitigar: 1 }); });
      } }],
    });
  }

  function painelCrencas(ctx, edicao) {
    var o = ctx.ficha.vampiro;
    var pode = ctx.podeEditar();
    var itens = o.convicoes.map(function (cv) {
      var pilares = o.pilares.filter(function (p) { return p.convicaoId === cv.id; });
      return el("li.vamp-crenca", {}, [
        edicao ? UI().campo({ rotulo: "Convicção", valor: cv.texto, limite: 300, aoMudar: function (v) { op(ctx, function (b) { var x = U.porId(b.convicoes, cv.id); if (x) x.texto = v; return ok(); }, { silencioso: true }); } })
          : el("p.vamp-crenca__texto", { texto: cv.texto + (cv.perdida ? " (perdida)" : "") }),
        el("ul.vamp-lista", {}, pilares.map(function (p) {
          return el("li", {}, [
            el("span", { texto: "Pilar: " + (p.nome || "—") + (p.estado && p.estado !== "ok" ? " (" + p.estado + ")" : "") + (p.descricao ? " — " + p.descricao : "") }),
            pode ? el("div.faixa", {}, C().MACULAS_DE_PILAR.filter(function (m) { return m.chave.indexOf("pilar") === 0; }).map(function (m) {
              return botao(m.nome.replace("Um Pilar ", "") + " (" + m.maculas + ")", function () { op(ctx, function (b) { return R().eventoDePilar(b, p.id, m.chave, T().rolador); }); });
            }).concat([
              botao("Transferir", function () {
                UI().pedirTexto({ titulo: "Transferir o Pilar", rotulo: "Novo Pilar", valor: "" }).then(function (v) { if (v) op(ctx, function (b) { return R().transferirPilar(b, p.id, v, T().rolador); }); });
              }),
            ])) : null,
          ]);
        })),
        edicao ? el("div.faixa", {}, [
          botao("Novo Pilar", function () { UI().pedirTexto({ titulo: "Pilar", rotulo: "Quem (ou o quê)", valor: "" }).then(function (v) { if (v) op(ctx, function (b) { b.pilares.push({ id: R().novoId("pi"), nome: v, descricao: "", convicaoId: cv.id, estado: "ok" }); return ok(); }); }); }),
          botao("Tirar Convicção", function () { op(ctx, function (b) { b.convicoes = b.convicoes.filter(function (x) { return x.id !== cv.id; }); b.pilares = b.pilares.filter(function (x) { return x.convicaoId !== cv.id; }); return ok(); }); }),
        ]) : null,
      ]);
    });
    return el("div.pilha.pilha--curta", {}, [
      itens.length ? el("ul.vamp-crencas", {}, itens) : el("p.t-mini", { texto: "Nenhuma Convicção." }),
      el("p.t-mini", { texto: "Convicções e Pilares são privados: não aparecem no painel da mesa." }),
      edicao ? botao("Nova Convicção", function () { UI().pedirTexto({ titulo: "Convicção", rotulo: "Texto", valor: "", limite: 300 }).then(function (v) { if (v) op(ctx, function (b) { b.convicoes.push({ id: R().novoId("cv"), texto: v }); return ok(); }); }); }, { motivo: o.convicoes.length >= 3 ? "Até 3 Convicções." : "" }) : null,
    ]);
  }

  function painelCompulsao(ctx) {
    var o = ctx.ficha.vampiro;
    var pode = ctx.podeEditar();
    var cp = o.estado.compulsao;
    var cla = C().CLAS[o.cla];
    var def = cp ? (cp.cla ? cla.compulsao : C().COMPULSOES[cp.chave]) : null;
    var escolha = "aleatoria";
    return el("div.pilha.pilha--curta", {}, [
      cp && def ? el("p", { role: "status", texto: def.nome + " (−" + cp.penalidade + " em tudo que não a cumpre). Termina: " + def.termina }) : el("p.t-mini", { texto: "Nenhuma Compulsão ativa." }),
      pode ? (cp ? el("div.faixa", {}, [
        botao("Cumprida", function () { op(ctx, function (b) { return R().encerrarCompulsao(b, "Cumprida"); }); }),
        cp.cla && o.cla === "tremere" ? botao("Repetir a ação (Perfeccionismo)", function () { op(ctx, function (b) { return R().repetirAcaoPerfeccionismo(b); }); }) : null,
      ]) : el("div.faixa", {}, [
        UI().campo({ rotulo: "Compulsão", tipo: "selecao", valor: escolha, opcoes: [{ valor: "aleatoria", rotulo: "Tabela (1d10)" }].concat(Object.keys(C().COMPULSOES).map(function (k) { return { valor: k, rotulo: C().COMPULSOES[k].nome }; })).concat(cla && cla.compulsao ? [{ valor: "cla", rotulo: "Do clã: " + cla.compulsao.nome }] : []), aoMudar: function (v) { escolha = v; } }),
        botao("Iniciar", function () { op(ctx, function (b) { return R().iniciarCompulsao(b, escolha, T().rolador); }); }),
      ])) : null,
    ]);
  }

  /* ---------------------------------------------------------------
     ABA VANTAGENS
     --------------------------------------------------------------- */

  function abaVantagens(ctx) {
    var o = ctx.ficha.vampiro;
    var c = R().calcular(o);
    var edicao = ctx.emEdicao() && ctx.podeEditar();
    var V = C().VANTAGENS;
    function item(v) {
      var def = V[v.chave] || {};
      var origem = { criacao: "criação", predador: "Predador", cla: "clã", xp: "experiência", tipo: "tipo de coterie" }[v.origem] || v.origem;
      return el("li.vamp-vantagem", { dataset: { tipo: def.tipo } }, [
        el("div.faixa", {}, [
          el("span.vamp-vantagem__nome", { texto: def.nome + (v.nota ? " (" + v.nota + ")" : "") }),
          T().pontos({ valor: v.pontos, maximo: Math.max(5, v.pontos), rotulo: def.nome }),
          el("span.t-mini", { texto: origem + (def.pagina ? " · p. " + def.pagina : "") }),
          edicao && v.origem === "criacao" ? el("button.r-icone", { type: "button", "aria-label": "Tirar " + def.nome, onclick: function () { op(ctx, function (b) { b.vantagens = b.vantagens.filter(function (x) { return x.id !== v.id; }); return ok(); }); } }, [UI().simbolo("x")]) : null,
        ]),
        def.texto ? el("p.t-mini", { texto: def.texto }) : null,
      ]);
    }
    var qual = c.vantagens.filter(function (v) { return (V[v.chave] || {}).tipo !== "defeito"; });
    var defs = c.vantagens.filter(function (v) { return (V[v.chave] || {}).tipo === "defeito"; });
    var fichas = o.fichas.map(function (f) {
      var fd = C().FICHAS_DE_CONHECIMENTO[f.ficha];
      var nv = fd.niveis[f.nivel - 1];
      return el("li.vamp-vantagem", {}, [
        el("div.faixa", {}, [el("span.vamp-vantagem__nome", { texto: fd.nome + " — " + nv.nome }), T().pontos({ valor: f.nivel, maximo: 5, rotulo: fd.nome }), el("span.t-mini", { texto: (nv.uso ? { historia: "1× por história", sessao: "1× por sessão", cronica: "1× por crônica" }[nv.uso] + " · " : "") + "p. " + fd.pagina })]),
        el("p.t-mini", { texto: nv.texto }),
      ]);
    });
    var sr = R().ehSangueRalo(o) ? UI().painel("Sangue-Ralo", [
      el("h3.t-rotulo", { texto: "Qualidades" }), el("ul.vamp-lista", {}, o.sangueRalo.qualidades.map(function (k) { var q = C().SANGUE_RALO.qualidades[k]; return el("li", { texto: q.nome + " — " + q.texto }); })),
      el("h3.t-rotulo", { texto: "Defeitos" }), el("ul.vamp-lista", {}, o.sangueRalo.defeitos.map(function (k) { var q = C().SANGUE_RALO.defeitos[k]; return el("li", { texto: q.nome + " — " + q.texto }); })),
    ]) : null;
    return el("div.vamp-aba.pilha", {}, [
      UI().painel("Qualidades e Antecedentes", [qual.length ? el("ul.vamp-vantagens", {}, qual.map(item)) : el("p.t-mini", { texto: "Nenhuma." }), edicao ? adicionarVantagem(ctx, "qualidade") : null]),
      UI().painel("Defeitos", [defs.length ? el("ul.vamp-vantagens", {}, defs.map(item)) : el("p.t-mini", { texto: "Nenhum." }), edicao ? adicionarVantagem(ctx, "defeito") : null]),
      UI().painel("Fichas de Conhecimento", [fichas.length ? el("ul.vamp-vantagens", {}, fichas) : el("p.t-mini", { texto: "Nenhuma. Cada nível se compra à parte, como Antecedente (aba Experiência)." })]),
      sr,
    ]);
  }

  /* Só no modo Edição: corrigir as Vantagens da criação. Comprar com XP
     é na aba Experiência. */
  function adicionarVantagem(ctx, tipo) {
    var V = C().VANTAGENS;
    var chaves = Object.keys(V).filter(function (k) { return tipo === "defeito" ? V[k].tipo === "defeito" : V[k].tipo !== "defeito"; });
    var sel = UI().campo({ rotulo: tipo === "defeito" ? "Defeito" : "Vantagem", tipo: "selecao", valor: "", opcoes: [{ valor: "", rotulo: "Escolha…" }].concat(chaves.map(function (k) { return { valor: k, rotulo: V[k].grupo + " · " + V[k].nome + " (" + V[k].niveis.join("/") + ")" }; })) });
    var pts = UI().campo({ rotulo: "Pontos", tipo: "numero", valor: 1 });
    var nota = UI().campo({ rotulo: "Nota", valor: "", limite: 200 });
    return el("div.editar-grade", {}, [sel, pts, nota, botao("Adicionar (correção da criação)", function () {
      var k = sel.entrada.value; if (!k) return;
      op(ctx, function (b) { b.vantagens.push({ id: R().novoId("va"), chave: k, pontos: U.inteiro(pts.entrada.value, 1), nota: nota.entrada.value, parametro: "", relacaoId: "", origem: "criacao", compartilhada: false }); return ok(); });
    })]);
  }

  /* ---------------------------------------------------------------
     ABA EXPERIÊNCIA
     --------------------------------------------------------------- */

  function abaExperiencia(ctx) {
    var o = ctx.ficha.vampiro;
    var c = R().calcular(o);
    var pode = ctx.podeEditar();
    var cron = M().dados(ctx);
    var narrador = !!(cron && cron.mestre);
    var compras = el("ul.vamp-lista", {}, o.compras.slice().reverse().map(function (cp) {
      var alvo = cp.tipo === "atributo" ? T().nomeAtr(cp.alvo) : cp.tipo === "habilidade" || cp.tipo === "especializacao" ? T().nomeHab(cp.alvo) : cp.tipo === "disciplina" ? T().nomeDisc(cp.alvo) : cp.tipo === "fichaComprada" ? (C().FICHAS_DE_CONHECIMENTO[cp.alvo] || {}).nome : cp.tipo === "vantagemComprada" ? T().nomeDe(C().VANTAGENS, cp.alvo) : cp.alvo || cp.tipo;
      return el("li", { texto: alvo + (cp.para ? " " + cp.de + " → " + cp.para : "") + (cp.nome ? " (" + cp.nome + ")" : "") + " — " + cp.custo + " XP" + (cp.credito ? " + " + cp.credito + " de crédito" : "") + (cp.noite ? " · noite " + cp.noite : "") });
    }));
    var historico = el("ul.vamp-lista", {}, o.xp.historico.slice().reverse().slice(0, 30).map(function (h) { return el("li", { texto: (h.valor >= 0 ? "+" : "") + h.valor + " XP" + (h.motivo ? " — " + h.motivo : "") }); }));
    return el("div.vamp-aba.pilha", {}, [
      UI().painel("Experiência", [
        el("p.vamp-xp", { role: "status", texto: c.xp.disponivel + " disponível · " + c.xp.total + " total · " + c.xp.gasto + " gasto" }),
        el("p.t-mini", { texto: "Custo de CADA nível novo: Atributo ×5 · Habilidade ×3 · Especialização 3 · Disciplina do clã ×5, outra ×7, Caitiff ×6 · Ritual/Fórmula nível ×3 · Vantagem e Ficha de Conhecimento 3 por ponto · Potência do Sangue ×10. Força de Vontade não se compra (vem de Autocontrole + Determinação)." }),
        pode && (!cron || narrador) ? el("div.faixa", {}, [botao("Registrar XP recebida", function () {
          UI().pedirTexto({ titulo: "XP recebida", rotulo: "Quanto (negativo corrige)", valor: "1" }).then(function (v) { if (v !== null) op(ctx, function (b) { return R().receberXP(b, U.inteiro(v, 0), "Registro"); }); });
        })]) : cron ? el("p.t-mini", { texto: "Na crônica, o Narrador concede a XP (fim de sessão ou pela página da campanha)." }) : null,
      ]),
      pode ? UI().painel("Comprar", [painelCompra(ctx)]) : null,
      UI().painel("Compras", [o.compras.length ? compras : el("p.t-mini", { texto: "Nenhuma compra." })]),
      UI().painel("XP recebida", [o.xp.historico.length ? historico : el("p.t-mini", { texto: "Nada registrado." })]),
    ]);
  }

  function painelCompra(ctx) {
    var o = ctx.ficha.vampiro;
    var p = { tipo: "habilidade", alvo: "", para: 1, nome: "", poderes: [], ressonancia: false, sangueProvado: false };
    var alvoCaixa = el("div"), extra = el("div"), previa = el("p.vamp-previa", { role: "status" });
    function alvos() {
      var calc = R().calcular(o);
      if (p.tipo === "atributo") return C().ATRIBUTOS.map(function (a) { return { valor: a.chave, rotulo: a.nome + " (" + calc.atributos[a.chave].valor + ")" }; });
      if (p.tipo === "habilidade" || p.tipo === "especializacao") return C().HABILIDADES.map(function (h) { return { valor: h.chave, rotulo: h.nome + " (" + R().valorDeHabilidade(o, h.chave) + ")" }; });
      if (p.tipo === "disciplina") return Object.keys(DS().DISCIPLINAS).map(function (k) { return { valor: k, rotulo: DS().DISCIPLINAS[k].nome + " (" + R().valorDeDisciplina(o, k) + ")" }; });
      if (p.tipo === "vantagem") return Object.keys(C().VANTAGENS).filter(function (k) { return C().VANTAGENS[k].tipo !== "defeito"; }).map(function (k) { return { valor: k, rotulo: C().VANTAGENS[k].grupo + " · " + C().VANTAGENS[k].nome + " (" + R().pontosDeVantagem(o, k) + ")" }; });
      if (p.tipo === "ficha") return Object.keys(C().FICHAS_DE_CONHECIMENTO).map(function (k) { var f = C().FICHAS_DE_CONHECIMENTO[k]; return { valor: k, rotulo: f.nome + (f.cla ? " (só " + C().CLAS[f.cla].nome + ")" : "") }; });
      if (p.tipo === "ritual") return DS().RITUAIS.map(function (r) { return { valor: r.chave, rotulo: "Nível " + r.nivel + " · " + r.nome }; });
      if (p.tipo === "formula") return DS().PODERES.filter(function (x) { return x.formula; }).map(function (x) { return { valor: x.chave, rotulo: "Nível " + x.nivel + " · " + x.nome }; });
      return [];
    }
    function desenharAlvo() {
      p.alvo = ""; p.poderes = [];
      var precisaAlvo = p.tipo !== "potencia" && p.tipo !== "humanidade";
      U.trocar(alvoCaixa, precisaAlvo ? [UI().campo({ rotulo: "O quê", tipo: "selecao", valor: "", opcoes: [{ valor: "", rotulo: "Escolha…" }].concat(alvos()), aoMudar: function (v) { p.alvo = v; desenharExtra(); } })] : []);
      desenharExtra();
    }
    function desenharExtra() {
      var filhos = [];
      if (["atributo", "habilidade", "disciplina", "potencia", "humanidade", "vantagem", "ficha"].indexOf(p.tipo) >= 0) {
        filhos.push(UI().campo({ rotulo: p.tipo === "ficha" ? "Nível da Ficha" : "Novo valor", tipo: "numero", valor: p.para, aoMudar: function (v) { p.para = U.inteiro(v, 1); desenharPoderes(); conferir(); } }));
      }
      if (p.tipo === "especializacao") filhos.push(UI().campo({ rotulo: "Especialização", valor: p.nome, limite: 80, aoMudar: function (v) { p.nome = v; conferir(); } }));
      if (p.tipo === "disciplina") {
        filhos.push(el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) { p.ressonancia = ev.currentTarget.checked; conferir(); } }), el("span", { texto: "Alimentou-se da Ressonância correspondente (p. 231)" })]));
        filhos.push(el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) { p.sangueProvado = ev.currentTarget.checked; conferir(); } }), el("span", { texto: "Provou o Sangue de quem tem a Disciplina (fora do clã)" })]));
        filhos.push(caixaPoderes);
      }
      U.trocar(extra, filhos);
      desenharPoderes();
      conferir();
    }
    var caixaPoderes = el("div");
    function desenharPoderes() {
      if (p.tipo !== "disciplina" || !p.alvo) { U.limpar(caixaPoderes); return; }
      var de = R().valorDeDisciplina(o, p.alvo);
      var n = Math.max(0, p.para - de);
      p.poderes = p.poderes.slice(0, n);
      var opcoes = DS().daDisciplina(p.alvo).filter(function (x) { return !x.formula; });
      U.trocar(caixaPoderes, Array.from({ length: n }, function (_, i) {
        var nivel = de + i + 1;
        return UI().campo({ rotulo: "Poder do nível " + nivel + " (nível ≤ " + nivel + ")", tipo: "selecao", valor: p.poderes[i] || "",
          opcoes: [{ valor: "", rotulo: "Escolha…" }].concat(opcoes.filter(function (x) { return x.nivel <= nivel && !R().temPoder(o, x.chave); }).map(function (x) { return { valor: x.chave, rotulo: x.nivel + " · " + x.nome + (x.amalgama ? " (amálgama)" : "") }; })),
          aoMudar: function (v) { p.poderes[i] = v; conferir(); } });
      }));
    }
    function pedido() { return { tipo: p.tipo, alvo: p.alvo, para: p.para, nome: p.nome, poderes: p.poderes.filter(Boolean), ressonancia: p.ressonancia, sangueProvado: p.sangueProvado }; }
    function conferir() {
      var v = R().validarCompra(o, pedido());
      previa.textContent = v.ok ? "Custa " + v.custo + " XP" + (v.desconto ? " (" + v.desconto + " de crédito)" : "") + "." : v.motivo;
      previa.className = "vamp-previa" + (v.ok ? "" : " vamp-previa--erro");
    }
    var tipo = UI().campo({ rotulo: "Comprar", tipo: "selecao", valor: p.tipo, opcoes: [
      { valor: "atributo", rotulo: "Atributo" }, { valor: "habilidade", rotulo: "Habilidade" }, { valor: "especializacao", rotulo: "Especialização" },
      { valor: "disciplina", rotulo: "Disciplina" }, { valor: "ritual", rotulo: "Ritual" }, { valor: "formula", rotulo: "Fórmula de Alquimia" },
      { valor: "vantagem", rotulo: "Vantagem (Qualidade/Antecedente)" }, { valor: "ficha", rotulo: "Ficha de Conhecimento" },
      { valor: "potencia", rotulo: "Potência do Sangue" }, { valor: "humanidade", rotulo: "Humanidade (com o Narrador)" },
    ], aoMudar: function (v) { p.tipo = v; p.para = 1; desenharAlvo(); } });
    desenharAlvo();
    return el("div.pilha.pilha--curta", {}, [tipo, alvoCaixa, extra, previa, botao("Comprar", function () {
      op(ctx, function (b) { return R().comprar(b, pedido()); });
    })]);
  }

  /* ---------------------------------------------------------------
     ABA EQUIPAMENTO
     --------------------------------------------------------------- */

  function abaEquipamento(ctx) {
    var o = ctx.ficha.vampiro;
    var pode = ctx.podeEditar();
    var itens = el("ul.vamp-lista", {}, o.equipamento.map(function (i) {
      var arma = C().ARMAS[i.arma], arm = C().ARMADURAS[i.armadura];
      return el("li.faixa", {}, [
        el("span", { texto: (i.nome || (arma || arm || {}).nome || "Item") + (arma ? " — dano +" + arma.dano + (arma.agravadoEmVampiros ? " (Agravado em vampiros)" : "") + (arma.tipo ? " (" + arma.tipo + ")" : "") : "") + (arm ? " — armadura " + arm.valor : "") + (i.nota ? " · " + i.nota : "") }),
        pode ? el("button.r-icone", { type: "button", "aria-label": "Tirar " + (i.nome || "item"), onclick: function () { op(ctx, function (b) { b.equipamento = b.equipamento.filter(function (x) { return x.id !== i.id; }); return ok(); }, { silencioso: true }); } }, [UI().simbolo("x")]) : null,
      ]);
    }));
    var novo = { nome: "", arma: "", armadura: "", nota: "" };
    return el("div.vamp-aba.pilha", {}, [
      UI().painel("Equipamento", [o.equipamento.length ? itens : el("p.t-mini", { texto: "Nada carregado." }),
        pode ? el("div.editar-grade", {}, [
          UI().campo({ rotulo: "Nome", valor: "", limite: 120, aoMudar: function (v) { novo.nome = v; } }),
          UI().campo({ rotulo: "Arma", tipo: "selecao", valor: "", opcoes: [{ valor: "", rotulo: "—" }].concat(Object.keys(C().ARMAS).map(function (k) { return { valor: k, rotulo: C().ARMAS[k].nome + " (+" + C().ARMAS[k].dano + ")" }; })), aoMudar: function (v) { novo.arma = v; } }),
          UI().campo({ rotulo: "Armadura", tipo: "selecao", valor: "", opcoes: [{ valor: "", rotulo: "—" }].concat(Object.keys(C().ARMADURAS).map(function (k) { return { valor: k, rotulo: C().ARMADURAS[k].nome + " (" + C().ARMADURAS[k].valor + ")" }; })), aoMudar: function (v) { novo.armadura = v; } }),
          UI().campo({ rotulo: "Nota", valor: "", limite: 200, aoMudar: function (v) { novo.nota = v; } }),
          botao("Adicionar", function () { op(ctx, function (b) { b.equipamento.push({ id: R().novoId("eq"), nome: novo.nome, arma: novo.arma, armadura: novo.armadura, nota: novo.nota }); return ok(); }, { silencioso: true }); }),
        ]) : null]),
      UI().painel("Referência de combate", [el("ul.vamp-lista.t-mini", {}, [
        el("li", { texto: "Dano = margem do ataque + bônus da arma. Superficial de vampiro é dividido; armas de fogo e impacto contra vampiros: Superficial (p. 125–126)." }),
        el("li", { texto: "Armadura reduz o dano Superficial de cortes e balas; nada contra fogo e sol." }),
        el("li", { texto: "Estaca no coração: Dificuldade 4 com a arma de perfuração certa, e precisa de 5 sucessos ou mais de margem para varar (p. 222)." }),
      ])]),
    ]);
  }

  global.RAMASecaoVampiro = { blocoSuperior: blocoSuperior, aba: abaPersonagem };
  global.RAMASecaoVampiroSangue = { aba: abaSangue };
  global.RAMASecaoVampiroHumanidade = { aba: abaHumanidade };
  global.RAMASecaoVampiroVantagens = { aba: abaVantagens };
  global.RAMASecaoVampiroExperiencia = { aba: abaExperiencia };
  global.RAMASecaoVampiroEquipamento = { aba: abaEquipamento };
  global.RAMAVampiroFicha = { corrigir: corrigir, checagem: checagem, composicaoTexto: composicaoTexto };
})(window);
