/* =====================================================================
   R.A.M.A. — Malditos Goblins · a ficha (v6.0)
   ---------------------------------------------------------------------
   As seções da ficha. Nenhuma regra mora aqui: o motor
   (js/goblins/regras.js) calcula, valida e aplica; cada ação vira UMA
   operação com id (RAMAGoblinsTela.operar).

     RAMASecaoGoblins             bloco superior + aba "Goblin" — a cara
                                  da ficha oficial (p. 44): nome, nível,
                                  ocupação, característica, os quatro
                                  atributos, equipamento e ferimentos
     RAMASecaoGoblinsCombate      batalha e turno, atacar, receber
                                  ataque (esquiva, bloqueio, Sorte),
                                  recarga, efeitos, manobras (p. 17)
     RAMASecaoGoblinsTecnicas     técnicas por nível e usos do dia,
                                  escolhas, magias e a conjuração
     RAMASecaoGoblinsEquipamento  armas, proteções, itens mágicos e o
                                  resto, com munição e durabilidade
     RAMASecaoGoblinsAdaptacoes   regras opcionais e as cinco adaptações
     RAMASecaoGoblinsDiario       dia, linhagem, situação, histórico,
                                  regras para consulta e inconsistências

   Numa campanha, ataques contra um inimigo do Covil, magias com alvo e
   técnicas que tocam aliados vão ao servidor (RAMAGoblinsMesaDaFicha),
   que rola e aplica nas duas pontas.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el;
  function C() { return global.RAMAGoblinsCatalogo; }
  function D() { return global.RAMAGoblinsDados; }
  function R() { return global.RAMAGoblins; }
  function T() { return global.RAMAGoblinsTela; }
  function M() { return global.RAMAGoblinsMesaDaFicha; }
  function UI() { return global.RAMAUI; }

  function op(ctx, fn, x) { return T().operar(ctx, fn, x); }
  function botao(texto, aoClicar, opcoes) { return T().botao(texto, aoClicar, opcoes); }
  function ok() { return { ok: true, eventos: [] }; }
  function painel(titulo, conteudo, acoes) { return UI().painel(titulo, conteudo, { acoes: acoes }); }
  function linha(t) { return el("p.t-mini", { texto: t }); }
  function selecao(rotulo, opcoes, valor, aoMudar) { return UI().campo({ rotulo: rotulo, tipo: "selecao", valor: valor, opcoes: opcoes, aoMudar: aoMudar }); }
  function marcaCaixa(rotulo, marcado, aoMudar, dica) { return el("label.r-marca", { title: dica || "" }, [el("input", { type: "checkbox", checked: !!marcado, onchange: function (ev) { aoMudar(ev.currentTarget.checked); } }), el("span", { texto: rotulo })]); }
  function numero(rotulo, valor) { return UI().campo({ rotulo: rotulo, tipo: "numero", valor: valor === undefined ? "" : valor }); }
  function lerNumero(campo, padrao) { var v = String(campo.entrada.value).trim(); return v === "" ? padrao : U.inteiro(v, padrao); }
  function pode(ctx) { return ctx.podeEditar() && R().ativo(ctx.ficha.goblins); }
  var DIFICULDADES = [{ valor: "", rotulo: "Normal" }, { valor: "facil", rotulo: "Fácil (+1 dado)" }, { valor: "dificil", rotulo: "Difícil (−1 dado)" }];
  var SITUACAO_ICONE = { ativo: "", morto: "☠", explodiu: "💥", explodiuDeAlegria: "🎉", louco: "🌀", sumiu: "⌛", mortoVivo: "💀" };

  function nomeItem(k) { var c = C().itemDoCatalogo(k); return c ? c.def.nome : k; }

  /* ---------------------------------------------------------------
     FERIMENTOS: caixas iguais à Vitalidade; o que passa dela, além
     --------------------------------------------------------------- */
  function trilhaDeFerimentos(vit, fer) {
    var total = Math.max(vit, fer, 0);
    var caixas = [];
    for (var i = 0; i < total; i++) {
      var marcada = i < fer;
      var alem = i >= vit;
      caixas.push(el("span.gob-caixa", { class: [marcada ? "gob-caixa--ferida" : "", alem ? "gob-caixa--alem" : ""].join(" "), "aria-hidden": "true", texto: marcada ? (alem ? "✖" : "/") : "" }));
    }
    var leitura = "Ferimentos " + fer + " de Vitalidade " + vit + (fer > vit ? " — passou do limite" : fer === vit ? " — no limite: mais um e morre" : "");
    return el("span.gob-trilha", { role: "img", "aria-label": leitura, title: leitura }, caixas.length ? caixas : [el("span.t-mini", { texto: "Vitalidade 0" })]);
  }

  function etiquetas(o, c) {
    var e = [];
    if (o.estado.situacao !== "ativo") e.push({ t: (SITUACAO_ICONE[o.estado.situacao] || "") + " " + R().SITUACOES[o.estado.situacao], aviso: true });
    if (c.noLimite && R().ativo(o)) e.push({ t: "No limite: mais um ferimento e morre", aviso: true });
    if (o.tempo.batalha) e.push({ t: "Em batalha · turno " + o.tempo.turno });
    o.efeitos.forEach(function (x) { e.push({ t: x.nome + (x.ate === "turnos" ? " (" + x.turnos + " turno" + (x.turnos === 1 ? "" : "s") + ")" : "") }); });
    if (o.opcoes.vozGoblin) e.push({ t: o.estado.vozGoblin === "ativa" ? "Voz Goblin valendo" : o.estado.vozGoblin === "perdida" ? "Voz Goblin perdida" : "Voz Goblin não declarada" });
    if (o.estado.pendenteEpico) e.push({ t: "Nível 4: escolha a ocupação épica", aviso: true });
    return e;
  }

  /* ---------------------------------------------------------------
     BLOCO SUPERIOR
     --------------------------------------------------------------- */
  function blocoSuperior(ctx) {
    var o = ctx.ficha.goblins;
    if (!o || !R()) return el("p", { texto: "O motor de Malditos Goblins não está carregado nesta página." });
    /* Numa campanha, o Covil começa a carregar já (os alvos do ataque). */
    M().naMesa(ctx);
    var c = R().calcular(o);
    var geral = global.RAMASecaoGeral;
    var oc = R().nomeDaOcupacao(o);
    var de = C().DESCRITORES[o.descritor];
    var nivel = "Nível " + o.nivel + o.epicas.map(function (x) { return " · " + R().nomeDaOcupacao(o, x.ocupacao) + " " + x.nivel; }).join("");
    var carac = o.caracteristicas.map(function (x) { return C().CARACTERISTICAS[x.chave].nome + (x.quantidade ? " (" + x.quantidade + ")" : ""); }).join(", ");
    var pend = R().pendencias(o);
    return el("div.gob-bloco", { dataset: { situacao: o.estado.situacao } }, [
      el("div.gob-bloco__identidade", {}, [
        global.RAMACapaSistema ? global.RAMACapaSistema.elemento("goblins", { tamanho: "p" }) : null,
        geral && geral.foto ? geral.foto(ctx) : null,
        el("div.gob-bloco__textos", {}, [
          geral && geral.campoNome ? geral.campoNome(ctx) : el("h1.t-titulo", { texto: ctx.ficha.nome }),
          el("p.gob-bloco__linha", { texto: [oc || "sem ocupação", de ? de.nome : "", nivel].filter(Boolean).join(" · ") + (o.nomeDeFamilia ? " · família " + o.nomeDeFamilia : "") }),
          carac ? el("p.t-mini", { texto: "Característica: " + carac }) : null,
          el("p.gob-bloco__estado", { role: "status" }, etiquetas(o, c).map(function (x) { return el("span.r-etiqueta" + (x.aviso ? ".r-etiqueta--aviso" : ""), { texto: x.t }); })),
        ]),
      ]),
      el("dl.gob-bloco__atributos", {}, C().ATRIBUTOS.map(function (a) {
        var x = c.atributos[a.chave];
        return el("div.gob-atr", { title: T().composicaoTexto(x.composicao) }, [
          el("dt", { texto: a.nome }),
          el("dd", {}, [el("span.gob-atr__valor", { texto: String(x.valor) }), x.valor !== x.permanente ? el("span.gob-atr__delta", { texto: "(" + x.permanente + ")", title: "Sem equipamento e efeitos" }) : null]),
        ]);
      })),
      el("div.gob-bloco__ferimentos", {}, [
        el("span.t-rotulo", { texto: "Ferimentos " + o.ferimentos + "/" + c.vitalidade }),
        trilhaDeFerimentos(c.vitalidade, o.ferimentos),
        pode(ctx) ? botao("+1", function () { op(ctx, function (b) { return R().sofrer(b, { ferimentos: 1, fonte: "Manual" }); }); }, { rotulo: "Mais um ferimento" }) : null,
        ctx.podeEditar() ? botao("−1", function () { op(ctx, function (b) { return R().curar(b, 1, "Manual"); }); }, { rotulo: "Menos um ferimento", motivo: o.ferimentos ? "" : "Sem ferimentos." }) : null,
      ]),
      el("div.faixa.gob-bloco__acoes", {}, [
        pode(ctx) ? botao("Teste", function () { abrirTeste(ctx, {}); }) : null,
        pode(ctx) ? botao("Atacar", function () { abrirAtaque(ctx, {}); }) : null,
        pode(ctx) ? botao("Receber ataque", function () { abrirAtaqueRecebido(ctx); }) : null,
        ctx.podeEditar() ? botao("Novo dia", function () { abrirNovoDia(ctx); }, { dica: "A noite de descanso tira 1 ferimento e devolve os usos do dia (p. 5)" }) : null,
        T().regra("teste"),
      ]),
      !o.criacao.concluida ? el("div.gob-pendencias", { role: "status" }, [
        el("p", { texto: "A criação ainda tem pendências" + (pend.length ? ": " + pend[0] : ".") }),
        ctx.podeEditar() && global.RAMAGoblinsCriar ? botao("Continuar a criação", function () { global.RAMAGoblinsCriar.abrir({ ctx: ctx }); }) : null,
      ]) : null,
      o.estado.pendenteEpico && ctx.podeEditar() ? painelEpico(ctx) : null,
    ]);
  }

  function painelEpico(ctx) {
    var o = ctx.ficha.goblins;
    var livres = R().ocupacoesLivres(o);
    var esc = selecao("Ocupação épica", livres.map(function (k) { return { valor: k, rotulo: C().OCUPACOES[k].nome }; }), livres[0]);
    return el("div.gob-pendencias", { role: "status" }, [
      el("p", { texto: "Nível 4! Níveis Épicos (p. 16): se os outros jogadores acreditarem, escolha outra ocupação." }),
      esc,
      el("div.faixa", {}, [
        botao("Acreditaram: começar a ocupação", function () { op(ctx, function (b) { return R().escolherOcupacaoEpica(b, esc.entrada.value, true); }); }),
        botao("Ninguém acreditou (explode de alegria)", function () { op(ctx, function (b) { return R().escolherOcupacaoEpica(b, "", false); }); }, { classe: "r-botao--fantasma" }),
        T().regra("niveisEpicos"),
      ]),
    ]);
  }

  /* ---------------------------------------------------------------
     TESTE
     --------------------------------------------------------------- */
  function abrirTeste(ctx, pedido) {
    var o = ctx.ficha.goblins;
    var p = pedido || {};
    var at = selecao("Atributo", [{ valor: "habilidade", rotulo: "Habilidade (ação física fora de combate)" }, { valor: "nocao", rotulo: "Noção (saber de algo)" }, { valor: "combate", rotulo: "Combate" }], p.atributo || "habilidade");
    var dif = selecao("Dificuldade", DIFICULDADES, p.dificuldade || "");
    var nec = numero("Hits necessários (vazio: a escala de sempre)", p.necessarios);
    var rot = UI().campo({ rotulo: "O que está tentando (opcional)", valor: p.rotulo || "" });
    var escalar = false;
    var temCorda = o.itens.some(function (i) { return R().disponivel(i) && i.chave === "cordaEGancho"; });
    var investigar = false;
    var previa = el("p.t-mini", { role: "status" });
    function pedidoAtual() { return { atributo: at.entrada.value, dificuldade: dif.entrada.value, necessarios: lerNumero(nec, null), rotulo: rot.entrada.value.trim(), escalar: escalar, interpretacao: investigar ? "investigacao" : "" }; }
    function atualizar() { var m = R().montarTeste(o, pedidoAtual()); previa.textContent = m.parada + " dado(s): " + T().composicaoTexto(m.composicao); }
    [at, dif].forEach(function (x) { x.entrada.addEventListener("change", atualizar); });
    var m = UI().modal({
      titulo: "Teste",
      conteudo: [at, dif, nec, rot,
        temCorda ? marcaCaixa("Escalando com Corda e Gancho (+2 dados)", false, function (v) { escalar = v; atualizar(); }) : null,
        o.opcoes.adaptacoes.cthulin ? marcaCaixa("Investigação (Chamado de Cthulin, p. 32)", false, function (v) { investigar = v; }) : null,
        previa, el("div.faixa", {}, [T().regra("teste"), T().regra("dificuldade"), T().regra("explosaoDeDado")])],
      botoes: [{ rotulo: "Rolar", classe: "r-botao--principal", aoClicar: function (f) {
        var x = pedidoAtual();
        f();
        T().rolagem(ctx, function (b, seZero) { return R().testar(b, Object.assign({ seZero: seZero }, x), T().rolador); }, {
          notas: function (res) { return res.investigacao ? ["Investigação: " + res.investigacao] : []; },
          acoes: function (res) { return res.podeDeuRuim ? [botao("Mas deu ruim…", function (ev) { ev.currentTarget.disabled = true; op(ctx, function (b) { return R().deuRuim(b, T().rolador); }); }), T().regra("deuRuim")] : []; },
        });
      } }],
    });
    atualizar();
    return m;
  }

  function abrirNovoDia(ctx) {
    var o = ctx.ficha.goblins;
    var naMesa = M().naMesa(ctx);
    UI().modal({
      titulo: "Dia " + (o.tempo.dia + 1),
      conteudo: [
        el("p", { texto: "A noite de descanso remove 1 ferimento (p. 5). Os usos “1 vez por dia” voltam e os efeitos “até o fim do dia” acabam." }),
        naMesa ? linha("Numa campanha, quem costuma avançar o dia de todos é o mestre, no Covil.") : null,
        o.marcas.dia.peteca ? linha("Hoje teve peteca: o dado do fim do dia será rolado.") : null,
      ],
      botoes: [
        { rotulo: "Dia sem descanso", classe: "r-botao--fantasma", aoClicar: function (f) { f(); op(ctx, function (b) { return R().novoDia(b, { descansou: false }, T().rolador); }); } },
        { rotulo: "Descansou a noite", classe: "r-botao--principal", aoClicar: function (f) { f(); op(ctx, function (b) { return R().novoDia(b, { descansou: true }, T().rolador); }); } },
      ],
    });
  }

  /* ---------------------------------------------------------------
     ABA GOBLIN — a ficha oficial
     --------------------------------------------------------------- */
  function abaGoblin(ctx) {
    var o = ctx.ficha.goblins;
    var c = R().calcular(o);
    var edicao = ctx.emEdicao() && ctx.podeEditar();
    var atributos = el("div.gob-atributos", {}, C().ATRIBUTOS.map(function (a) {
      var x = c.atributos[a.chave];
      var nome = a.chave !== "vitalidade" && pode(ctx) && !edicao
        ? el("button.gob-atributo__nome.r-link", { type: "button", texto: a.nome, onclick: function () { if (a.chave === "combate") abrirAtaque(ctx, {}); else abrirTeste(ctx, { atributo: a.chave }); }, title: a.chave === "combate" ? "Atacar" : "Testar " + a.nome })
        : el("span.gob-atributo__nome", { texto: a.nome });
      return el("div.gob-atributo", {}, [
        nome,
        el("span.gob-atributo__valor", { texto: String(x.valor) }),
        el("span.t-mini.gob-atributo__texto", { texto: a.texto }),
        el("details.gob-composicao", {}, [el("summary", { texto: "De onde vem" }), el("ul", {}, x.composicao.map(function (k) { return el("li", { texto: k.fonte + " " + (k.valor >= 0 ? "+" : "") + k.valor + " · " + { base: "base", permanente: "permanente", equipamento: "equipamento", temporario: "temporário" }[k.camada] }); }))]),
        edicao && o.criacao.concluida ? el("div.faixa", {}, [
          botao("+1", function () { ajustar(ctx, a.chave, 1); }, { rotulo: "Ajuste permanente +1 em " + a.nome }),
          botao("−1", function () { ajustar(ctx, a.chave, -1); }, { rotulo: "Ajuste permanente −1 em " + a.nome }),
        ]) : null,
      ]);
    }));
    var armas = c.armas.map(function (i) { var d = R().defDoItem(i).arma; return el("li", { texto: i.nome + " (+" + (d.bonus || 0) + "d" + (i.municao ? ", munição " + i.municao.atual + "/" + i.municao.max : "") + (i.precisaRecarregar ? ", recarregar" : "") + ")" }); });
    var prot = c.protecoes.filter(function (i) { return i.equipado; }).map(function (i) { return el("li", { texto: i.nome + (i.durabilidade ? " (durabilidade " + i.durabilidade.atual + "/" + i.durabilidade.original + ")" : "") }); });
    var outros = o.itens.filter(function (i) { return R().disponivel(i) && !R().defDoItem(i).arma && !R().defDoItem(i).protecao; }).map(function (i) { return el("li", { texto: i.nome + (i.quantidade > 1 ? " ×" + i.quantidade : "") }); });
    return el("div.gob-aba.pilha", {}, [
      painel("Atributos", [atributos, linha(edicao ? "Modo Edição: os botões fazem um ajuste PERMANENTE registrado (o histórico guarda). Ocupação e descritor mudam na criação." : "Clique no nome para testar (Combate abre o ataque). “De onde vem” mostra cada camada.")], [T().regra("teste")]),
      painel("Identidade", [identidade(ctx, edicao)]),
      painel("Equipamento", [
        armas.length ? el("ul.gob-lista", { "aria-label": "Armas em mãos" }, armas) : linha("Nenhuma arma em mãos."),
        prot.length ? el("ul.gob-lista", { "aria-label": "Proteções vestidas" }, prot) : null,
        outros.length ? el("ul.gob-lista.gob-lista--compacta", { "aria-label": "Outros itens" }, outros) : null,
        botao("Abrir o equipamento", function () { ctx.irParaAba("inventario"); }, { classe: "r-botao--fantasma" }),
      ]),
      painel("Nível", [nivel(ctx)], [T().regra("niveis")]),
      painel("Campanha", [edicao && global.RAMASecaoGeral && global.RAMASecaoGeral.campoCampanha
        ? global.RAMASecaoGeral.campoCampanha(ctx)
        : el("p", { texto: (ctx.nomeDaCampanha() || "Sem campanha (ficha avulsa)") + (ctx.emEdicao() ? "" : " — troque no modo Edição.") })]),
    ]);
  }

  function ajustar(ctx, atributo, valor) {
    UI().pedirTexto({ titulo: "Ajuste permanente", rotulo: "Motivo (fica no histórico)", valor: "Correção", rotuloConfirmar: "Ajustar" }).then(function (motivo) {
      if (motivo === null) return;
      op(ctx, function (b) { b.ajustes.push({ id: R().novoId("aj"), atributo: atributo, valor: valor, motivo: motivo || "Correção", dia: b.tempo.dia }); R().registrar(b, "ajuste", T().nomeAtr(atributo) + " " + (valor > 0 ? "+" : "") + valor + " (" + (motivo || "Correção") + ")"); R().verificarFim(b, []); return ok(); });
    });
  }

  function identidade(ctx, edicao) {
    var o = ctx.ficha.goblins;
    var oc = C().OCUPACOES[o.ocupacao];
    var de = C().DESCRITORES[o.descritor];
    return el("div.pilha.pilha--curta", {}, [
      el("p", {}, [el("strong", { texto: "Ocupação: " }), el("span", { texto: R().nomeDaOcupacao(o) || "—" }), oc ? T().fonte(oc.pagina) : null]),
      oc && oc.mod ? linha(Object.keys(oc.mod).map(function (k) { return T().nomeAtr(k) + " " + (oc.mod[k] > 0 ? "+" : "") + oc.mod[k]; }).join(", ")) : null,
      el("p", {}, [el("strong", { texto: "Descritor: " }), el("span", { texto: de ? de.nome + (o.descritor === "supimpa" && o.supimpa ? " (+1 em " + T().nomeAtr(o.supimpa) + ")" : "") : "—" }), T().fonte(5)]),
      el("div", {}, [el("strong", { texto: "Característica" + (o.caracteristicas.length > 1 ? "s" : "") + ":" })].concat(o.caracteristicas.map(function (x) {
        var d = C().CARACTERISTICAS[x.chave];
        return el("p.gob-caracteristica", {}, [el("span.gob-caracteristica__nome", { texto: d.nome + (x.quantidade ? " (" + x.quantidade + " " + (d.unidade || "") + ")" : "") }), el("span.t-mini", { texto: " — " + d.texto }), T().fonte(6)]);
      }))),
      edicao ? UI().campo({ rotulo: "Nome de família (opcional, p. 4)", valor: o.nomeDeFamilia, limite: 60, aoMudar: function (v) { op(ctx, function (b) { b.nomeDeFamilia = String(v).slice(0, 60); return ok(); }, { silencioso: true, regioes: ["bloco"] }); } }) : (o.nomeDeFamilia ? linha("Família: " + o.nomeDeFamilia) : null),
      edicao && !o.criacao.concluida && global.RAMAGoblinsCriar ? botao("Abrir a criação", function () { global.RAMAGoblinsCriar.abrir({ ctx: ctx }); }) : null,
      o.caracteristicas.some(function (x) { return x.chave === "bombaRelogio"; }) && pode(ctx)
        ? botao("Alguém falou de fogo ou explosão (Bomba-relógio)", function () { op(ctx, function (b) { return R().bombaRelogio(b, T().rolador); }); }) : null,
    ]);
  }

  function nivel(ctx) {
    var o = ctx.ficha.goblins;
    var linhas = R().ocupacoesDe(o).map(function (oc) {
      return el("li", {}, [el("strong", { texto: R().nomeDaOcupacao(o, oc.ocupacao) + " — nível " + oc.nivel + (oc.epica ? " (épica)" : "") }),
        el("ul", {}, C().OCUPACOES[oc.ocupacao].tecnicas.map(function (t) { return el("li", { class: t.nivel <= oc.nivel ? "" : "gob-bloqueada", texto: "N" + t.nivel + " " + t.nome + (t.nivel <= oc.nivel ? "" : " (bloqueada)") }); }))]);
    });
    return el("div.pilha.pilha--curta", {}, [
      el("ul.gob-lista", {}, linhas),
      linha("Ao derrotar um oponente, role 1 dado: com 6, sobe um nível. No nível 4 o goblin explode de alegria" + (o.opcoes.niveisEpicos ? " — ou, com Níveis Épicos, escolhe outra ocupação." : ".")),
      pode(ctx) && !o.estado.pendenteEpico ? botao("Derrotei um oponente", function () {
        UI().pedirTexto({ titulo: "Derrotou quem?", rotulo: "Oponente (opcional)", valor: "", rotuloConfirmar: "Rolar 1 dado" }).then(function (nome) {
          if (nome === null) return;
          var r = op(ctx, function (b) { return R().derrotouOponente(b, { oponente: nome }, T().rolador); }, { silencioso: true });
          if (r && r.ok !== false && global.RAMARolagens) global.RAMARolagens.mostrar({ tipo: "goblins", expressao: "1d6", rolagens: r.dados, total: r.dados[0], parcelas: [] }, { nome: "Progressão" + (nome ? " (" + nome + ")" : "") + (r.subiu ? " · subiu de nível!" : " · não foi dessa vez"), critico: r.subiu });
          if (r && r.ok !== false) T().narrar(r.eventos);
        });
      }) : null,
    ]);
  }

  /* ---------------------------------------------------------------
     ATAQUE
     --------------------------------------------------------------- */
  function abrirAtaque(ctx, inicial) {
    var o = ctx.ficha.goblins;
    var c = R().calcular(o);
    var p0 = inicial || {};
    var alvosMesa = M().alvos(ctx);
    var armas = [{ valor: "", rotulo: "Desarmado (só Combate)" }].concat(o.itens.filter(function (i) { return R().disponivel(i) && R().defDoItem(i).arma && !i.arremessado; }).map(function (i) {
      var d = R().defDoItem(i).arma;
      return { valor: i.id, rotulo: i.nome + " (+" + (d.bonus || 0) + "d, " + (d.ataque === "corporal" ? "corporal" : "distância") + (i.equipado ? "" : ", guardada") + ")" };
    }));
    var armaPadrao = p0.armaId !== undefined ? p0.armaId : (c.armas[0] ? c.armas[0].id : "");
    var arma = selecao("Arma", armas, armaPadrao);
    var modo = selecao("Ataque", [{ valor: "", rotulo: "O da arma" }, { valor: "corporal", rotulo: "Corporal" }, { valor: "distancia", rotulo: "À distância" }, { valor: "arremesso", rotulo: "Arremessar (Arremesso)" }], p0.modo || "");
    var dif = selecao("Dificuldade", DIFICULDADES, "");
    var alvoMesa = alvosMesa.length ? selecao("Alvo no Covil (o servidor rola e aplica)", [{ valor: "", rotulo: "— nenhum: só rolar —" }].concat(alvosMesa.map(function (p) { return { valor: p.id, rotulo: p.nome + (p.vitalidade !== null ? " (" + p.ferimentos + "/" + p.vitalidade + ")" : "") }; })), p0.alvoMesa || "") : null;
    var alvoNome = UI().campo({ rotulo: "Alvo (nome)", valor: "" });
    var alvoEspecie = UI().campo({ rotulo: "Espécie do alvo", valor: "", dica: o.escolhas.especieInimiga || "ex.: lobo" });
    var flags = { goblin: false, naoHumano: false, praga: false, furtivo: false, brutal: false, tiroCerteiro: false, duasArmas: false, cacunda: false, giratorio: !!p0.giratorio };
    var previa = el("p.t-mini", { role: "status" });
    function pedido() {
      return {
        armaId: arma.entrada.value, modo: modo.entrada.value, dificuldade: dif.entrada.value,
        alvo: { nome: alvoNome.entrada.value.trim(), especie: alvoEspecie.entrada.value.trim(), goblin: flags.goblin, humano: flags.naoHumano ? false : undefined, praga: flags.praga },
        furtivo: flags.furtivo, brutal: flags.brutal, tiroCerteiro: flags.tiroCerteiro, duasArmas: flags.duasArmas, cacunda: flags.cacunda, giratorio: flags.giratorio,
      };
    }
    function atualizar() {
      var m = R().montarAtaque(o, pedido());
      previa.textContent = m.ok ? m.parada + " dado(s): " + T().composicaoTexto(m.composicao) + (m.avisos.length ? " — " + m.avisos.join(" ") : "") : m.motivo;
    }
    [arma, modo, dif].forEach(function (x) { x.entrada.addEventListener("change", atualizar); });
    [alvoNome, alvoEspecie].forEach(function (x) { x.entrada.addEventListener("input", atualizar); });
    function caixa(chave, rotulo, dica, condicao) { return condicao === false ? null : marcaCaixa(rotulo, flags[chave], function (v) { flags[chave] = v; atualizar(); }, dica); }
    var tem = function (k) { return R().temTecnica(o, k); };
    var m = UI().modal({
      titulo: flags.giratorio ? "Ataque Giratório" : "Atacar",
      conteudo: [arma, modo, dif, alvoMesa, alvoNome, alvoEspecie,
        el("fieldset.gob-flags", {}, [el("legend", { texto: "O alvo e a situação" }),
          caixa("goblin", "O alvo é um goblin"), caixa("naoHumano", "O alvo não é humano"), caixa("praga", "O alvo é uma peste de fazenda", "", tem("matadorDePragas")),
          caixa("furtivo", "O alvo não sabe onde estou (Ataque Furtivo +2)", "", tem("ataqueFurtivo")),
          caixa("brutal", "Ataque Brutal (dobro de dados, 1×/dia)", "", tem("ataqueBrutal") && !R().usoDiario(o, "ataqueBrutal")),
          caixa("tiroCerteiro", "Tiro Certeiro (dobro de dados, 1×/dia)", "", tem("tiroCerteiro") && !R().usoDiario(o, "tiroCerteiro")),
          caixa("duasArmas", "Ataque com duas armas (−1 dado; alvos diferentes)", C().MANOBRAS.duasArmas.texto),
          caixa("cacunda", "Na Cacunda, em cima (+1 dado)", C().MANOBRAS.cacunda.texto),
        ]),
        previa, el("div.faixa", {}, [T().regra("ataque"), T().regra("equipamento"), T().regra("manobras")])],
      botoes: [{ rotulo: "Atacar", classe: "r-botao--principal", aoClicar: function (f) {
        var x = pedido();
        var alvoId = alvoMesa ? alvoMesa.entrada.value : "";
        var pre = R().montarAtaque(o, x);
        if (!pre.ok) { UI().avisoAtencao(pre.motivo); return; }
        f();
        if (alvoId) {
          M().operar(ctx, { tipo: "atacarInimigo", quem: ctx.personagemId, alvo: alvoId, pedido: x }).then(function (r) {
            var res = r && r.ok && r.dados.resultado;
            if (res) UI().aviso(res.ferimentos + " ferimento(s) em " + (alvosMesa.filter(function (p) { return p.id === alvoId; })[0] || {}).nome + (res.derrotado ? " — derrotado!" : ""), { tipo: res.derrotado ? "atencao" : "info" });
            if (res && res.giratorio) UI().confirmar({ titulo: "Ataque Giratório", texto: "Causou dano com arma corporal: pode atacar outro inimigo ao alcance.", rotuloConfirmar: "Atacar outro" }).then(function (s) { if (s) abrirAtaque(ctx, { armaId: x.armaId, giratorio: true }); });
          });
          return;
        }
        T().rolagem(ctx, function (b, seZero) { return R().atacar(b, Object.assign({ seZero: seZero }, x), T().rolador); }, {
          notas: function (res) { return (res.notas || []).concat([res.ferimentos + " ferimento(s) no alvo" + (res.fogo ? " (fogo)" : res.armaDeFogo ? " (arma de fogo)" : "")]); },
          acoes: function (res, janela) { return res.giratorio ? [botao("Ataque Giratório: atacar outro inimigo", function () { janela.fechar(); abrirAtaque(ctx, { armaId: x.armaId, giratorio: true }); })] : []; },
        });
      } }],
    });
    atualizar();
    return m;
  }

  /* ---------------------------------------------------------------
     ATAQUE RECEBIDO: esquiva, bloqueio, Sorte
     --------------------------------------------------------------- */
  function abrirAtaqueRecebido(ctx) {
    var o = ctx.ficha.goblins;
    var c = R().calcular(o);
    var acertos = numero("Hits do atacante", 1);
    var fonte = UI().campo({ rotulo: "Quem atacou (opcional)", valor: "" });
    var origem = selecao("Ataque", [{ valor: "corporal", rotulo: "Corporal" }, { valor: "distancia", rotulo: "À distância" }], "corporal");
    var tipo = selecao("Tipo", [{ valor: "", rotulo: "Comum" }, { valor: "fogo", rotulo: "Fogo" }, { valor: "armaDeFogo", rotulo: "Tiro de arma de fogo" }, { valor: "etereo", rotulo: "Etéreo (ignora proteção)" }, { valor: "automatico", rotulo: "Automático (sem esquiva)" }], "");
    var vestidas = c.protecoes.filter(function (i) { return i.equipado; });
    var reacoes = [{ valor: "", rotulo: "Nenhuma: só recebo" }, { valor: "esquiva", rotulo: "Esquivar (teste de Combate; não ataco no próximo turno)" }]
      .concat(vestidas.filter(function (i) { return i.durabilidade && i.durabilidade.atual > 0; }).map(function (i) { return { valor: "bloquear:" + i.id, rotulo: "Bloquear com " + i.nome + " (" + i.durabilidade.atual + "/" + i.durabilidade.original + ")" }; }))
      .concat(vestidas.filter(function (i) { var d = R().defDoItem(i).protecao; return d.sorte && d.uso === "cabeca"; }).map(function (i) { return { valor: "sorte:" + i.id, rotulo: "Sorte: destruir " + i.nome + " e ignorar o dano (só à distância)" }; }));
    var reacao = selecao("Reação", reacoes, "");
    var bloquearDepois = selecao("E bloquear o que sobrar da esquiva com", [{ valor: "", rotulo: "— não —" }].concat(vestidas.filter(function (i) { return i.durabilidade && i.durabilidade.atual > 0; }).map(function (i) { return { valor: i.id, rotulo: i.nome }; })), "");
    var parceiro = o.efeitos.some(function (e) { return e.chave === "cacundaEmCima" || e.chave === "cacundaEmbaixo"; }) ? numero("Ferimentos passados ao parceiro da Cacunda", 0) : null;
    UI().modal({
      titulo: "Receber ataque",
      conteudo: [acertos, fonte, origem, tipo, reacao, bloquearDepois, parceiro, el("div.faixa", {}, [T().regra("esquiva"), T().regra("bloqueio"), T().regra("combate")])],
      botoes: [{ rotulo: "Aplicar", classe: "r-botao--principal", aoClicar: function (f) {
        var t = tipo.entrada.value;
        var ped = { acertos: lerNumero(acertos, 0), fonte: fonte.entrada.value.trim(), distancia: origem.entrada.value === "distancia", fogo: t === "fogo", armaDeFogo: t === "armaDeFogo", etereo: t === "etereo", automatico: t === "automatico", paraParceiro: parceiro ? lerNumero(parceiro, 0) : 0 };
        var rv = reacao.entrada.value;
        if (bloquearDepois.entrada.value) ped.protecaoId = bloquearDepois.entrada.value;
        if (rv.indexOf("bloquear:") === 0) ped.protecaoId = rv.slice(9);
        if (rv.indexOf("sorte:") === 0) ped.sorteId = rv.slice(6);
        f();
        if (rv === "esquiva") {
          T().rolagem(ctx, function (b, seZero) { return R().esquivar(b, { seZero: seZero }, T().rolador); }, {
            titulo: "Esquiva",
            notas: function (res) { return ["Cada hit tira um hit do atacante."]; },
            depois: function (res) { op(ctx, function (b) { return R().receberAtaque(b, Object.assign({ esquiva: res.rolagem.classificacao.hits }, ped)); }); },
          });
          return;
        }
        op(ctx, function (b) { return R().receberAtaque(b, ped); });
      } }],
    });
  }

  /* ---------------------------------------------------------------
     ABA COMBATE
     --------------------------------------------------------------- */
  function abaCombate(ctx) {
    var o = ctx.ficha.goblins;
    var c = R().calcular(o);
    var p = pode(ctx);
    var mesa = M().naMesa(ctx);
    var recarregar = o.itens.filter(function (i) { return R().disponivel(i) && i.precisaRecarregar; });
    var semMunicao = o.itens.filter(function (i) { return R().disponivel(i) && i.municao && i.municao.atual < i.municao.max; });
    var acesas = o.itens.filter(function (i) { return R().disponivel(i) && i.aceso; });
    var arremessadas = o.itens.filter(function (i) { return R().disponivel(i) && i.arremessado; });
    return el("div.gob-aba.pilha", {}, [
      painel("Batalha", [
        el("p", { texto: o.tempo.batalha ? "Em batalha — turno " + o.tempo.turno + "." : "Fora de batalha." }),
        mesa ? linha("Numa campanha, o mestre conduz a ordem no Covil e marca o fim do seu turno; os botões daqui servem para a ficha avulsa ou para corrigir.") : null,
        el("div.faixa", {}, [
          p && !o.tempo.batalha ? botao("Começar batalha", function () { op(ctx, function (b) { return R().iniciarBatalha(b); }); }) : null,
          ctx.podeEditar() && o.tempo.batalha ? botao("Fim do meu turno", function () { op(ctx, function (b) { return R().fimDoTurno(b); }); }, { dica: "Conta os efeitos “por turnos” e o pavio das galinhas" }) : null,
          ctx.podeEditar() && o.tempo.batalha ? botao("Fim da batalha", function () { op(ctx, function (b) { return R().fimDaBatalha(b); }); }, { classe: "r-botao--fantasma" }) : null,
          T().regra("combate"),
        ]),
      ]),
      painel("Ações", [el("div.faixa", {}, [
        p ? botao("Atacar", function () { abrirAtaque(ctx, {}); }) : null,
        p ? botao("Receber ataque", function () { abrirAtaqueRecebido(ctx); }) : null,
        p ? botao("Só esquivar (rolar)", function () { T().rolagem(ctx, function (b, z) { return R().esquivar(b, { seZero: z }, T().rolador); }, { titulo: "Esquiva" }); }) : null,
        T().regra("ataque"), T().regra("esquiva"), T().regra("bloqueio"),
      ])]),
      recarregar.length || semMunicao.length || arremessadas.length ? painel("Armas", [el("ul.gob-lista", {}, recarregar.map(function (i) {
        return el("li", {}, [el("span", { texto: i.nome + ": precisa recarregar (gasta o turno) " }), ctx.podeEditar() ? botao("Recarregar", function () { op(ctx, function (b) { return R().recarregar(b, i.id); }); }) : null]);
      }).concat(semMunicao.map(function (i) {
        return el("li", {}, [el("span", { texto: i.nome + ": munição " + i.municao.atual + "/" + i.municao.max + " " }), ctx.podeEditar() ? botao("Reabastecer", function () { op(ctx, function (b) { return R().reabastecer(b, i.id); }); }) : null]);
      })).concat(arremessadas.map(function (i) {
        return el("li", {}, [el("span", { texto: i.nome + ": arremessada " }), ctx.podeEditar() ? botao("Pegar de volta", function () { op(ctx, function (b) { return R().pegarDeVolta(b, i.id); }); }) : null]);
      })))]) : null,
      painel("Efeitos", [efeitos(ctx)]),
      acesas.length ? painel("Ações demoradas", [el("ul.gob-lista", {}, acesas.map(function (i) { return el("li", { texto: i.nome + ": explode em " + i.aceso.turnos + " turno(s) (3 ferimentos em todos em volta)" }); }))]) : null,
      o.efeitos.some(function (e) { return e.porMinuto; }) ? painel("Veneno", [linha("1 ferimento por minuto (p. 13)."), ctx.podeEditar() ? botao("Passou 1 minuto", function () { op(ctx, function (b) { return R().passarMinuto(b); }); }) : null]) : null,
      painel("Manobras", [manobras(ctx)], [T().regra("manobras")]),
    ]);
  }

  function efeitos(ctx) {
    var o = ctx.ficha.goblins;
    var lista = o.efeitos.map(function (e) {
      var mods = Object.keys(e.mods).map(function (k) { return T().nomeAtr(k) + " " + (e.mods[k] > 0 ? "+" : "") + e.mods[k]; });
      return el("li", {}, [
        el("span", { texto: e.nome + " — " + (e.ate === "turnos" ? e.turnos + " turno(s)" : R().DURACOES[e.ate]) + (mods.length ? " · " + mods.join(", ") : "") + (e.fonte ? " · " + e.fonte : "") }),
        ctx.podeEditar() ? el("button.r-icone", { type: "button", "aria-label": "Encerrar " + e.nome, onclick: function () { op(ctx, function (b) { return R().removerEfeito(b, e.id); }); } }, [UI().simbolo("x")]) : null,
      ]);
    });
    return el("div.pilha.pilha--curta", {}, [
      lista.length ? el("ul.gob-lista", {}, lista) : linha("Nenhum efeito ativo."),
      linha("Cada efeito dura até um MARCO do jogo (próximo ataque, próxima rolagem, turnos, fim da batalha, fim do dia), nunca por relógio."),
      ctx.podeEditar() ? botao("Adicionar efeito", function () { novoEfeito(ctx); }, { classe: "r-botao--fantasma" }) : null,
    ]);
  }

  function novoEfeito(ctx) {
    var nome = UI().campo({ rotulo: "Nome", valor: "" });
    var ate = selecao("Dura", Object.keys(R().DURACOES).filter(function (k) { return k !== "permanente"; }).map(function (k) { return { valor: k, rotulo: R().DURACOES[k] }; }), "fimDaBatalha");
    var turnos = numero("Turnos (se “por turnos”)", 1);
    var at = selecao("Muda o atributo", [{ valor: "", rotulo: "Nenhum" }].concat(C().ATRIBUTOS.map(function (a) { return { valor: a.chave, rotulo: a.nome }; })), "");
    var valor = numero("Em quanto", 1);
    UI().modal({
      titulo: "Novo efeito",
      conteudo: [nome, ate, turnos, at, valor],
      botoes: [{ rotulo: "Adicionar", classe: "r-botao--principal", aoClicar: function (f) {
        var n = nome.entrada.value.trim();
        if (!n) { nome.marcarErro("Dê um nome."); return; }
        var mods = {}; if (at.entrada.value) mods[at.entrada.value] = lerNumero(valor, 0);
        f();
        op(ctx, function (b) { return R().receberEfeito(b, { chave: "manual-" + R().novoId("x"), nome: n, ate: ate.entrada.value, turnos: lerNumero(turnos, 1), mods: mods, fonte: "Manual" }); });
      } }],
    });
  }

  function manobras(ctx) {
    var o = ctx.ficha.goblins;
    var p = pode(ctx);
    var K = C().MANOBRAS;
    function item(chave, acoes) {
      return el("li.gob-manobra", {}, [el("strong", { texto: K[chave].nome }), el("span.t-mini", { texto: " — " + K[chave].texto }), T().fonte(17), acoes && p ? el("div.faixa", {}, acoes) : null]);
    }
    var emCima = R().temEfeito(o, "cacundaEmCima"), embaixo = R().temEfeito(o, "cacundaEmbaixo");
    return el("ul.gob-lista.gob-manobras", {}, [
      item("catapulta", [botao("Pular na catapulta", function () {
        T().rolagem(ctx, function (b, z) { return R().testar(b, { atributo: "habilidade", rotulo: "Catapultando Goblins", seZero: z }, T().rolador); }, {
          acoes: function (res) { return res.rolagem.classificacao.hits ? [] : [botao("Espatifou: rolar 1d6 ferimentos", function (ev) { ev.currentTarget.disabled = true; var q = D().quantidade("1d6", T().rolador); op(ctx, function (b) { return R().sofrer(b, { ferimentos: q.total, fonte: "Catapulta (1d6 = " + q.total + ")" }); }); })]; },
        });
      })]),
      item("pendurar", [botao("Pular no inimigo", function () {
        UI().pedirTexto({ titulo: "Pendurar no Inimigo", rotulo: "Em quem?", valor: "", rotuloConfirmar: "Testar Habilidade" }).then(function (alvo) {
          if (alvo === null) return;
          T().rolagem(ctx, function (b, z) {
            var r = R().testar(b, { atributo: "habilidade", rotulo: "Pendurar no Inimigo", seZero: z }, T().rolador);
            if (r.ok && r.rolagem && r.rolagem.classificacao.hits >= 1) R().receberEfeito(b, { chave: "pendurado", nome: "Pendurado em " + (alvo || "inimigo") + ": +1 dado contra ele", alvo: alvo, ate: "manual", fonte: "Pendurar no Inimigo", pagina: 17 });
            return r;
          });
        });
      })]),
      item("duasArmas", null),
      item("cacunda", [
        botao(emCima ? "Descer da Cacunda" : "Subir na Cacunda (em cima)", function () { op(ctx, function (b) { if (emCima) { b.efeitos = b.efeitos.filter(function (e) { return e.chave !== "cacundaEmCima"; }); return ok(); } return R().receberEfeito(b, { chave: "cacundaEmCima", nome: "Cacunda, em cima: +1 dado no ataque, sem esquiva", ate: "manual", semEsquiva: true, ataque: 1, fonte: "Cacunda!", pagina: 17 }); }); }, { motivo: embaixo ? "Você está embaixo." : "" }),
        botao(embaixo ? "Sair de baixo" : "Carregar alguém (embaixo)", function () { op(ctx, function (b) { if (embaixo) { b.efeitos = b.efeitos.filter(function (e) { return e.chave !== "cacundaEmbaixo"; }); return ok(); } return R().receberEfeito(b, { chave: "cacundaEmbaixo", nome: "Cacunda, embaixo: sem esquiva", ate: "manual", semEsquiva: true, fonte: "Cacunda!", pagina: 17 }); }); }, { motivo: emCima ? "Você está em cima." : "" }),
      ]),
      item("sincronizado", null),
      item("derrubar", [botao("Empurrar", function () {
        T().rolagem(ctx, function (b, z) { return R().testar(b, { atributo: "habilidade", rotulo: "Derrubar Inimigo", seZero: z }, T().rolador); }, {
          notas: function (res) { var h = res.rolagem.classificacao.hits; return [h >= 2 ? "2+ hits: o alvo cai e perde o próximo turno." : h === 1 ? "1 hit: o alvo pode testar Habilidade para ficar de pé." : "Não derrubou."]; },
        });
      })]),
      item("ciranda", null),
      item("tralha", [botao("Registrar a Tralha do Poder", function () {
        UI().pedirTexto({ titulo: "Tralha do Poder", rotulo: "Que objeto (dez goblins acharam bonito)?", valor: "", rotuloConfirmar: "Registrar" }).then(function (t) {
          if (!t) return;
          op(ctx, function (b) { R().registrar(b, "tralha", "Tralha do Poder: " + t + " — um goblin seguidor (vai tentar roubá-la)"); return R().receberEfeito(b, { chave: "tralha", nome: "Tralha do Poder: " + t + " (seguidor)", ate: "manual", fonte: "Tralha do Poder", pagina: 17 }); });
        });
      })]),
    ]);
  }

  /* ---------------------------------------------------------------
     ABA TÉCNICAS E MAGIA
     --------------------------------------------------------------- */
  function abaTecnicas(ctx) {
    var o = ctx.ficha.goblins;
    var p = pode(ctx);
    var mesa = M().naMesa(ctx);
    var cards = R().ocupacoesDe(o).map(function (oc) {
      var def = C().OCUPACOES[oc.ocupacao];
      return el("div.gob-ocupacao", {}, [
        el("h3.t-rotulo", { texto: R().nomeDaOcupacao(o, oc.ocupacao) + " — nível " + oc.nivel + (oc.epica ? " (épica)" : "") }),
        el("ul.gob-lista", {}, def.tecnicas.map(function (t) {
          var liberada = t.nivel <= oc.nivel;
          var usada = t.uso === "dia" && R().usoDiario(o, t.chave);
          return el("li.gob-tecnica", { class: liberada ? "" : "gob-bloqueada" }, [
            el("strong", { texto: "N" + t.nivel + " · " + t.nome }),
            t.uso === "dia" ? el("span.r-etiqueta" + (usada ? ".r-etiqueta--aviso" : ""), { texto: usada ? "usada hoje" : "1×/dia" }) : null,
            T().fonte(def.pagina),
            el("p.t-mini", { texto: t.texto }),
            liberada && p ? acaoDaTecnica(ctx, t, usada, mesa) : null,
          ]);
        })),
      ]);
    });
    return el("div.gob-aba.pilha", {}, [
      painel("Técnicas", cards.length ? cards : [linha("Escolha a ocupação na criação.")], [T().regra("niveis")]),
      painel("Escolhas", [escolhas(ctx)]),
      painel("Magias", [magias(ctx)], [T().regra("magia")]),
    ]);
  }

  function acaoDaTecnica(ctx, t, usada, mesa) {
    var o = ctx.ficha.goblins;
    var motivo = usada ? "Já usada hoje." : "";
    if (t.chave === "gritoDeGuerra") return botao("Dar o grito", function () {
      if (mesa) { M().operar(ctx, { tipo: "gritoDeGuerra", quem: ctx.personagemId }).then(function (r) { if (r.ok) UI().aviso(r.dados.resultado.sucesso ? "Os aliados ganharam Combate +1 até o fim da batalha." : "Ninguém se animou.", {}); }); return; }
      T().rolagem(ctx, function (b, z) { return R().usarTecnica(b, "gritoDeGuerra", { seZero: z }, T().rolador); }, { notas: function (res) { return [res.paraAliados ? "1 hit: todos os seus aliados ficam com Combate +1 até o fim da batalha (na ficha de cada um, ou pelo Covil)." : "Sem hit: o grito não pegou."]; } });
    }, { motivo: motivo });
    if (t.chave === "humilhacao") return botao("Humilhar um aliado", function () {
      var aliados = M().aliados(ctx);
      if (mesa && aliados.length) {
        var s = selecao("Aliado", aliados.map(function (a) { return { valor: a.id, rotulo: a.nome }; }), aliados[0].id);
        UI().modal({ titulo: "Humilhação", conteudo: [s, linha("Ele elimina todos os ferimentos (p. 9).")], botoes: [{ rotulo: "Gritar e xingar", classe: "r-botao--principal", aoClicar: function (f) { f(); M().operar(ctx, { tipo: "humilhacao", quem: ctx.personagemId, aliados: [s.entrada.value] }); } }] });
        return;
      }
      UI().pedirTexto({ titulo: "Humilhação", rotulo: "Qual aliado? (ele remove todos os ferimentos na ficha dele)", valor: "", rotuloConfirmar: "Usar" }).then(function (al) { if (al !== null) op(ctx, function (b) { return R().usarTecnica(b, "humilhacao", { alvo: al }, T().rolador); }); });
    }, { motivo: motivo });
    if (t.chave === "esconder") return botao("Esconder (sem teste)", function () { op(ctx, function (b) { return R().usarTecnica(b, "esconder", {}, T().rolador); }); }, { motivo: motivo || (R().temEfeito(o, "escondido") ? "Já está escondido." : "") });
    if (t.chave === "delirio") return botao("Explodi ou queimei uma casa (ou maior)", function () {
      UI().pedirTexto({ titulo: "Delírio", rotulo: "O que foi pelos ares?", valor: "", rotuloConfirmar: "Livrar-se dos ferimentos" }).then(function (q) { if (q !== null) op(ctx, function (b) { return R().usarTecnica(b, "delirio", { confirmado: true, oque: q }, T().rolador); }); });
    }, { motivo: o.ferimentos ? "" : "Sem ferimentos." });
    if (t.chave === "roubar") return botao("Roubar (teste de Habilidade)", function () { T().rolagem(ctx, function (b, z) { return R().usarTecnica(b, "roubar", { seZero: z }, T().rolador); }, { notas: function (res) { return [res.rolagem.classificacao.sucesso ? "Roubou sem que percebessem." : "Não conseguiu."]; } }); });
    if (t.chave === "rastrear") return botao("Rastrear", function () { UI().pedirTexto({ titulo: "Rastrear", rotulo: "Que pegadas?", valor: "", rotuloConfirmar: "Anotar" }).then(function (q) { if (q !== null) op(ctx, function (b) { return R().usarTecnica(b, "rastrear", { alvo: q }, T().rolador); }); }); });
    if (t.chave === "ataqueBrutal" || t.chave === "tiroCerteiro") return botao(t.nome, function () { abrirAtaque(ctx, {}); }, { motivo: motivo, dica: "Marque a opção na janela de ataque" });
    if (t.chave === "implacavel") return botao("Conjurar escolhendo o resultado", function () { abrirConjurar(ctx, null, { implacavel: true }); }, { motivo: motivo });
    return null;
  }

  function escolhas(ctx) {
    var o = ctx.ficha.goblins;
    var oc = C().OCUPACOES[o.ocupacao];
    var muda = ctx.podeEditar() && (ctx.emEdicao() || !o.criacao.concluida);
    var partes = [];
    var todas = R().ocupacoesDe(o).map(function (x) { return C().OCUPACOES[x.ocupacao]; });
    var precisa = function (k) { return todas.some(function (d) { return d.escolhas.indexOf(k) >= 0; }); };
    if (precisa("armaFavorita")) partes.push(muda
      ? selecao("Arma favorita (Mestre de Armas)", [{ valor: "", rotulo: "—" }].concat(Object.keys(C().ARMAS).filter(function (k) { var a = C().ARMAS[k]; return !a.adaptacao || o.opcoes.adaptacoes[a.adaptacao]; }).map(function (k) { return { valor: k, rotulo: C().ARMAS[k].nome }; })), o.escolhas.armaFavorita, function (v) { op(ctx, function (b) { b.escolhas.armaFavorita = v; R().registrar(b, "escolha", "Arma favorita: " + (C().ARMAS[v] ? C().ARMAS[v].nome : "—")); return ok(); }, { silencioso: true }); })
      : linha("Arma favorita: " + (C().ARMAS[o.escolhas.armaFavorita] ? C().ARMAS[o.escolhas.armaFavorita].nome : "—")));
    if (precisa("especieInimiga")) partes.push(muda
      ? UI().campo({ rotulo: "Espécie inimiga (Inimigo)", valor: o.escolhas.especieInimiga, limite: 60, aoMudar: function (v) { op(ctx, function (b) { b.escolhas.especieInimiga = String(v).slice(0, 60); return ok(); }, { silencioso: true }); } })
      : linha("Espécie inimiga: " + (o.escolhas.especieInimiga || "—")));
    if (precisa("magias")) partes.push(muda
      ? el("fieldset.gob-flags", {}, [el("legend", { texto: "Magias do Bruxo (escolha 3)" })].concat(C().MAGIAS_DO_BRUXO.map(function (k) {
        var marcada = o.escolhas.magias.indexOf(k) >= 0;
        return marcaCaixa(C().MAGIAS[k].nome, marcada, function (v) {
          op(ctx, function (b) {
            var l = b.escolhas.magias.filter(function (x) { return x !== k; });
            if (v) { if (l.length >= 3) return { ok: false, motivo: "São 3 magias." }; l.push(k); }
            b.escolhas.magias = l; return ok();
          }, { silencioso: true });
        });
      })))
      : linha("Magias: " + (o.escolhas.magias.map(function (k) { return C().MAGIAS[k].nome; }).join(", ") || "—")));
    if (!partes.length) partes.push(linha("Esta ocupação não pede escolhas" + (oc ? "" : " (sem ocupação ainda)") + "."));
    return el("div.pilha.pilha--curta", {}, partes);
  }

  function magias(ctx) {
    var o = ctx.ficha.goblins;
    var lista = R().magiasDisponiveis(o);
    if (!lista.length) return linha("Só o Bruxo conjura (ou quem tem o Necronomicon, um Livro Estranho de magia ou, no Cthulin, um Livro Especial).");
    return el("ul.gob-lista", {}, lista.map(function (x) {
      var def = C().MAGIAS[x.magia];
      return el("li.gob-magia", {}, [
        el("strong", { texto: def.nome }), el("span.t-mini", { texto: " (" + x.rotulo + ")" }), T().fonte(def.pagina),
        el("details.gob-composicao", {}, [el("summary", { texto: "Resultados" }), el("ol.gob-resultados", { start: 0 }, def.resultados.map(function (r, i) { return el("li", { texto: (i === 3 ? "3+" : i) + " hit(s): " + r.texto }); }))]),
        pode(ctx) ? botao("Conjurar", function () { abrirConjurar(ctx, x, {}); }) : null,
      ]);
    }));
  }

  function abrirConjurar(ctx, escolha, opcoes) {
    var o = ctx.ficha.goblins;
    var x0 = opcoes || {};
    var lista = R().magiasDisponiveis(o);
    var mag = selecao("Magia", lista.map(function (x, i) { return { valor: String(i), rotulo: C().MAGIAS[x.magia].nome + " (" + x.rotulo + ")" }; }), String(Math.max(0, escolha ? lista.findIndex(function (x) { return x.magia === escolha.magia && x.fonte === escolha.fonte; }) : 0)));
    var condutores = o.itens.filter(function (i) { var d = R().vestido(i) && R().defDoItem(i).arma; return d && (d.condutor || d.varinha); });
    var cond = selecao("Conjurar por", [{ valor: "", rotulo: "Sem condutor" }].concat(condutores.map(function (i) { return { valor: i.id, rotulo: i.nome + (R().temTecnica(o, "condutorMagico") ? " (+1 dado)" : "") }; })), condutores[0] ? condutores[0].id : "");
    var dif = selecao("Dificuldade", DIFICULDADES, "");
    var ciranda = numero("Amigos na Ciranda Mágica (2 ou mais: +1 dado cada)", 0);
    var podeImp = R().temTecnica(o, "implacavel") && !R().usoDiario(o, "implacavel");
    var imp = podeImp ? selecao("Implacável (1×/dia): escolher o resultado sem rolar", [{ valor: "", rotulo: "Não: rolar" }, { valor: "0", rotulo: "0" }, { valor: "1", rotulo: "1" }, { valor: "2", rotulo: "2" }, { valor: "3", rotulo: "3+" }], x0.implacavel ? "2" : "") : null;
    var horrores = C().CTHULIN.horrores.filter(function (k) { return C().INIMIGOS[k].invocacao; });
    var horror = o.opcoes.adaptacoes.cthulin ? selecao("Horror a invocar (Invocação)", [{ valor: "", rotulo: "Outro (sem redução)" }].concat(horrores.map(function (k) { return { valor: k, rotulo: C().INIMIGOS[k].nome + " (" + C().INIMIGOS[k].invocacao + " dado)" }; })), "") : null;
    var aliados = M().aliados(ctx), inimigos = M().alvos(ctx);
    var alvosAl = [], alvosIn = [];
    var blocoAlvos = M().naMesa(ctx) && (aliados.length || inimigos.length) ? el("fieldset.gob-flags", {}, [el("legend", { texto: "Alvos no Covil (o servidor rola e aplica)" })]
      .concat(aliados.map(function (a) { return marcaCaixa("Aliado: " + a.nome, false, function (v) { alvosAl = v ? alvosAl.concat([a.id]) : alvosAl.filter(function (z) { return z !== a.id; }); }); }))
      .concat(inimigos.map(function (p) { return marcaCaixa("Inimigo: " + p.nome, false, function (v) { alvosIn = v ? alvosIn.concat([p.id]) : alvosIn.filter(function (z) { return z !== p.id; }); }); }))) : null;
    var previa = el("p.t-mini", { role: "status" });
    function pedido() {
      var esc = lista[U.inteiro(mag.entrada.value, 0)] || lista[0];
      return { magia: esc.magia, fonte: esc.fonte, condutorId: cond.entrada.value, dificuldade: dif.entrada.value, ciranda: lerNumero(ciranda, 0), implacavel: imp && imp.entrada.value !== "" ? U.inteiro(imp.entrada.value, 0) : undefined, horror: horror ? horror.entrada.value : "" };
    }
    function atualizar() { var m = R().montarConjuracao(o, pedido()); previa.textContent = m.ok ? m.parada + " dado(s): " + T().composicaoTexto(m.composicao) : m.motivo; }
    [mag, cond, dif, imp, horror].filter(Boolean).forEach(function (x) { x.entrada.addEventListener("change", atualizar); });
    ciranda.entrada.addEventListener("input", atualizar);
    UI().modal({
      titulo: "Conjurar",
      conteudo: [mag, cond, dif, ciranda, imp, horror, blocoAlvos, previa, el("div.faixa", {}, [T().regra("magia"), T().regra("manobras", "Ciranda")])],
      botoes: [{ rotulo: "Conjurar", classe: "r-botao--principal", aoClicar: function (f) {
        var x = pedido();
        var pre = R().montarConjuracao(o, x);
        if (!pre.ok) { UI().avisoAtencao(pre.motivo); return; }
        f();
        if (alvosAl.length || alvosIn.length) {
          M().operar(ctx, Object.assign({ tipo: "conjurar", quem: ctx.personagemId, aliados: alvosAl, inimigos: alvosIn }, x)).then(function (r) {
            if (r && r.ok && r.dados.resultado.efeito) UI().aviso(C().MAGIAS[x.magia].nome + " " + (r.dados.resultado.resultado === 3 ? "3+" : r.dados.resultado.resultado) + ": " + r.dados.resultado.efeito.texto, { duracao: 10000 });
          });
          return;
        }
        T().rolagem(ctx, function (b, z) { return R().conjurar(b, Object.assign({ seZero: z }, x), T().rolador); }, {
          titulo: "Magia: " + C().MAGIAS[x.magia].nome,
          depois: function (res) { if (!res.rolagem) mostrarMagia(res); },
          notas: function (res) { return notasDaMagia(res); },
        });
      } }],
    });
    atualizar();
  }

  function notasDaMagia(res) {
    var n = ["Resultado " + (res.resultado === 3 ? "3+" : res.resultado) + ": " + res.efeito.texto];
    (res.aplicado || []).forEach(function (a) { n.push("Aplicado: " + a); });
    var al = res.efeito.alvos;
    if (al) n.push("Nos alvos: " + (al.ferimentos ? al.ferimentos + " ferimento(s)" + (al.fogo ? " de fogo" : "") + (al.automatico ? " automáticos" : "") : al.curar ? (al.curar === "todos" ? "remove todos os ferimentos" : "remove " + al.curar + " ferimento") : al.efeito ? al.efeito.nome : "") + " — aplique na ficha de cada um ou pelo Covil.");
    if (res.efeito.mesa) n.push("Na mesa: " + (res.efeito.mesa.nome || (res.efeito.mesa.aliado ? "um esqueleto luta por você " + (res.efeito.mesa.turnos ? "por " + res.efeito.mesa.turnos + " turnos" : "até o fim da batalha") : "um Horror é invocado")) + (res.efeito.mesa.texto ? " (" + res.efeito.mesa.texto + ")" : ""));
    return n;
  }
  function mostrarMagia(res) {
    UI().modal({ titulo: "Magia: " + res.nome + " (Implacável)", fundoFecha: true, conteudo: notasDaMagia(res).map(function (t) { return el("p", { texto: t }); }) });
  }

  /* ---------------------------------------------------------------
     ABA EQUIPAMENTO
     --------------------------------------------------------------- */
  var ACOES_DE_ITEM = {
    pocao: [{ acao: "beber", rotulo: "Beber" }], macaCheirosa: [{ acao: "comer", rotulo: "Comer" }], macaMalcheirosa: [{ acao: "arremessar", rotulo: "Arremessar" }],
    barrilDePolvora: [{ acao: "acender", rotulo: "Acender" }, { acao: "municao", rotulo: "Completar munição" }], galinhaExplosiva: [{ acao: "soltar", rotulo: "Soltar" }, { acao: "arremessar", rotulo: "Arremessar" }],
    veneno: [{ acao: "envenenar", rotulo: "Pôr na bebida" }], aljava: [{ acao: "usar", rotulo: "Encher um arco/besta" }], livroEstranho: [{ acao: "ler", rotulo: "Tentar ler" }],
    livroEspecial: [{ acao: "queimar", rotulo: "Queimar (elimina o Medo)" }], tortaDeliciosa: [{ acao: "comer", rotulo: "Tentar comer" }], relogioTicPloc: [{ acao: "derrubar", rotulo: "Deixou cair…" }],
    espadaJusticeira: [{ acao: "gritar", rotulo: "Erguer e gritar “Hooooo”" }], espadaDestruidora: [{ acao: "fim", rotulo: "Alguém disse “FIM”" }], estatuetaSerpente: [{ acao: "apontar", rotulo: "Apontar para…" }],
    peteca: [{ acao: "brincar", rotulo: "Brincar hoje" }],
  };

  function usar(ctx, i, a) {
    var o = ctx.ficha.goblins;
    var precisaRolar = ["livroEstranho", "tortaDeliciosa"].indexOf(i.chave) >= 0;
    function fazer(extra) {
      if (precisaRolar) { T().rolagem(ctx, function (b, z) { return R().usarItem(b, i.id, a.acao, Object.assign({ seZero: z }, extra), T().rolador); }, { notas: function (res) { return res.magia ? ["É um livro de magia: " + C().MAGIAS[res.magia].nome + "!"] : res.chance ? ["Leu: não é de magia (" + res.chance.dados[0] + ")."] : []; } }); return; }
      var r = op(ctx, function (b) { return R().usarItem(b, i.id, a.acao, extra, T().rolador); });
      if (r && r.ok !== false && r.area) UI().aviso("Explosão: " + r.area.map(function (x) { return x.ferimentos + " ferimento(s) em todos " + x.alcance; }).join("; ") + ". Aplique em quem estava lá (Receber ataque, ou pelo Covil).", { tipo: "atencao", duracao: 12000 });
    }
    if (i.chave === "pocao" && i.magico.cor === 6) {
      var s = selecao("Atributo (+1 permanente)", C().ATRIBUTOS.map(function (x) { return { valor: x.chave, rotulo: x.nome }; }), "combate");
      UI().modal({ titulo: "Poção Verde", conteudo: [s, linha("O livro não diz qual atributo: a escolha é sua (ver inconsistências).")], botoes: [{ rotulo: "Beber", classe: "r-botao--principal", aoClicar: function (f) { f(); fazer({ atributo: s.entrada.value }); } }] });
      return;
    }
    if (i.chave === "aljava") {
      var arcos = o.itens.filter(function (x) { var d = R().defDoItem(x).arma; return R().disponivel(x) && d && d.arco; });
      if (!arcos.length) { UI().avisoAtencao("Nenhum arco ou besta."); return; }
      var s2 = selecao("Arco ou besta", arcos.map(function (x) { return { valor: x.id, rotulo: x.nome }; }), arcos[0].id);
      UI().modal({ titulo: "Aljava", conteudo: [s2], botoes: [{ rotulo: "Encher", classe: "r-botao--principal", aoClicar: function (f) { f(); fazer({ armaId: s2.entrada.value }); } }] });
      return;
    }
    if (i.chave === "barrilDePolvora" && a.acao === "municao") {
      var armas = o.itens.filter(function (x) { var d = R().defDoItem(x).arma; return R().disponivel(x) && d && d.fogo && x.municao; });
      var marcadas = [];
      UI().modal({ titulo: "Completar munição (até 3 armas de fogo)", conteudo: armas.length ? armas.map(function (x) { return marcaCaixa(x.nome + " (" + x.municao.atual + "/" + x.municao.max + ")", false, function (v) { marcadas = v ? marcadas.concat([x.id]) : marcadas.filter(function (z) { return z !== x.id; }); }); }) : [linha("Nenhuma arma de fogo com munição.")], botoes: [{ rotulo: "Completar", classe: "r-botao--principal", aoClicar: function (f) { f(); fazer({ armas: marcadas.slice(0, 3) }); } }] });
      return;
    }
    if (["veneno", "estatuetaSerpente"].indexOf(i.chave) >= 0) {
      UI().pedirTexto({ titulo: i.nome, rotulo: "Em quem?", valor: "", rotuloConfirmar: a.rotulo }).then(function (alvo) { if (alvo !== null) fazer({ alvo: alvo }); });
      return;
    }
    if (["relogioTicPloc", "espadaJusticeira"].indexOf(i.chave) >= 0) {
      UI().confirmar({ titulo: i.nome, texto: C().ITENS_MAGICOS[i.chave].texto, rotuloConfirmar: "Aconteceu", perigo: true }).then(function (s) { if (s) fazer({}); });
      return;
    }
    fazer({});
  }

  function linhaDeItem(ctx, i) {
    var d = R().defDoItem(i);
    var partes = [];
    if (d.arma) partes.push("+" + (d.arma.bonus || 0) + "d · " + (d.arma.maos === 2 ? "duas mãos" : "uma mão") + " · " + (d.arma.ataque === "corporal" ? "corporal" : "distância") + [d.arma.arremesso ? "Arremesso" : "", d.arma.condutor ? "Condutor Mágico" : "", d.arma.recarga ? "Recarga" : "", d.arma.municao ? "Munição [" + d.arma.municao + "]" : "", d.arma.alcance ? "alcance " + d.arma.alcance : ""].filter(Boolean).map(function (s) { return " · " + s; }).join(""));
    if (d.protecao) partes.push((C().USOS_DE_PROTECAO[d.protecao.uso] || d.protecao.uso) + " · durabilidade " + (i.durabilidade ? i.durabilidade.atual + "/" + i.durabilidade.original : d.protecao.durabilidade) + (d.protecao.arcano ? " · Arcano" : "") + (d.protecao.sorte ? " · Sorte" : ""));
    if (d.mods) partes.push(Object.keys(d.mods).map(function (k) { return T().nomeAtr(k) + " " + (d.mods[k] > 0 ? "+" : "") + d.mods[k]; }).join(", ") + " vestido");
    if (i.municao) partes.push("munição " + i.municao.atual + "/" + i.municao.max);
    if (i.precisaRecarregar) partes.push("precisa recarregar");
    if (i.arremessado) partes.push("arremessada");
    if (i.aceso) partes.push("explode em " + i.aceso.turnos + " turno(s)");
    var cat = C().itemDoCatalogo(i.chave);
    var texto = cat && cat.def.texto ? cat.def.texto : "";
    var pagina = cat ? cat.def.pagina : null;
    var edita = ctx.podeEditar();
    var restricao = R().restricaoDeUso(ctx.ficha.goblins, i);
    var equipavel = (d.arma || d.protecao || (cat && cat.def.vestivel)) && R().disponivel(i);
    var acoes = (ACOES_DE_ITEM[i.chave] || []).filter(function () { return R().disponivel(i); }).map(function (a) { return botao(a.rotulo, function () { usar(ctx, i, a); }, { motivo: i.chave === "galinhaExplosiva" && i.aceso ? "Já está andando." : "" }); });
    return el("li.gob-item", { class: R().disponivel(i) ? "" : "gob-item--fora" }, [
      el("div.gob-item__topo", {}, [
        el("strong.gob-item__nome", { texto: i.nome + (i.quantidade > 1 ? " ×" + i.quantidade : "") }),
        i.destruido ? el("span.r-etiqueta.r-etiqueta--aviso", { texto: "destruído" }) : null,
        i.consumido ? el("span.r-etiqueta", { texto: "gasto" }) : null,
        i.equipado ? el("span.r-etiqueta", { texto: d.arma ? "em mãos" : "vestido" }) : null,
        pagina ? T().fonte(pagina) : null,
      ]),
      partes.length ? el("p.t-mini", { texto: partes.join(" · ") }) : null,
      texto ? el("p.t-mini.gob-item__texto", { texto: texto }) : null,
      i.chave === "pocao" && i.magico.cor ? linha("Cor: " + C().POCAO_D6[i.magico.cor - 1].cor) : null,
      i.chave === "anelMagico" && i.magico.anel ? linha("Último efeito: " + C().ANEL_D6[i.magico.anel - 1].texto) : null,
      i.nota ? el("p.t-mini", { texto: i.nota }) : null,
      edita ? el("div.faixa.gob-item__acoes", {}, [
        equipavel ? botao(i.equipado ? (d.arma ? "Guardar" : "Tirar") : (d.arma ? "Empunhar" : "Vestir"), function () { var r = op(ctx, function (b) { return R().equipar(b, i.id, !i.equipado, T().rolador); }); if (r && r.avisos && r.avisos.length) UI().avisoAtencao(r.avisos.join(" ")); }, { motivo: !i.equipado && restricao ? restricao : "" }) : null,
        i.municao && i.municao.atual < i.municao.max && R().disponivel(i) ? botao("Reabastecer", function () { op(ctx, function (b) { return R().reabastecer(b, i.id); }); }) : null,
        i.precisaRecarregar ? botao("Recarregar", function () { op(ctx, function (b) { return R().recarregar(b, i.id); }); }) : null,
        i.arremessado ? botao("Pegar de volta", function () { op(ctx, function (b) { return R().pegarDeVolta(b, i.id); }); }) : null,
        acoes,
        (d.arma || d.protecao) && !i.consumido ? botao(i.destruido ? "Recuperar" : "Destruído", function () { op(ctx, function (b) { return R().marcarDestruido(b, i.id, !i.destruido); }); }, { classe: "r-botao--fantasma" }) : null,
        ctx.emEdicao() && i.durabilidade ? botao("Durabilidade…", function () { corrigirDurabilidade(ctx, i); }, { classe: "r-botao--fantasma" }) : null,
        ctx.emEdicao() ? botao("Remover", function () { UI().confirmar({ titulo: "Remover " + i.nome + "?", texto: "Sai da ficha (o histórico registra). Para um item que quebrou, use “Destruído”.", rotuloConfirmar: "Remover", perigo: true }).then(function (s) { if (s) op(ctx, function (b) { return R().removerItem(b, i.id, "removido no modo Edição"); }); }); }, { classe: "r-botao--fantasma" }) : null,
      ]) : null,
    ]);
  }

  function corrigirDurabilidade(ctx, i) {
    var at = numero("Atual", i.durabilidade.atual), orig = numero("Original", i.durabilidade.original);
    UI().modal({ titulo: "Durabilidade de " + i.nome, conteudo: [at, orig, linha("O livro não traz conserto: é uma correção da mesa.")], botoes: [{ rotulo: "Salvar", classe: "r-botao--principal", aoClicar: function (f) {
      var a = Math.max(0, lerNumero(at, 0)), o2 = Math.max(0, lerNumero(orig, 0));
      f();
      op(ctx, function (b) { var x = b.itens.filter(function (y) { return y.id === i.id; })[0]; x.durabilidade = { atual: Math.min(a, o2), original: o2 }; R().registrar(b, "correcao", x.nome + ": durabilidade " + x.durabilidade.atual + "/" + o2); return ok(); });
    } }] });
  }

  function abaEquipamento(ctx) {
    var o = ctx.ficha.goblins;
    var grupos = [
      { t: "Armas", f: function (i) { return R().disponivel(i) && R().defDoItem(i).arma; } },
      { t: "Proteções", f: function (i) { return R().disponivel(i) && !R().defDoItem(i).arma && R().defDoItem(i).protecao; } },
      { t: "Itens mágicos", f: function (i) { var d = R().defDoItem(i); return R().disponivel(i) && i.categoria === "magico" && !d.arma && !d.protecao; } },
      { t: "Equipamento e outros", f: function (i) { var d = R().defDoItem(i); return R().disponivel(i) && i.categoria !== "magico" && !d.arma && !d.protecao; } },
    ];
    var fora = o.itens.filter(function (i) { return !R().disponivel(i); });
    return el("div.gob-aba.pilha", {}, grupos.map(function (g) {
      var l = o.itens.filter(g.f);
      return l.length ? painel(g.t, [el("ul.gob-lista.gob-itens", {}, l.map(function (i) { return linhaDeItem(ctx, i); }))]) : null;
    }).concat([
      !o.itens.some(function (i) { return R().disponivel(i); }) ? painel("Equipamento", [linha("Nenhum item. O equipamento inicial entra ao concluir a criação.")]) : null,
      ctx.podeEditar() ? painel("Ganhar item", [ganharItem(ctx)], [T().regra("equipamento"), T().regra("itensMagicos")]) : null,
      fora.length ? UI().recolhivel({ titulo: "Destruídos e gastos (" + fora.length + ")", conteudo: [el("ul.gob-lista.gob-itens", {}, fora.map(function (i) { return linhaDeItem(ctx, i); }))] }) : null,
    ]));
  }

  function ganharItem(ctx) {
    var o = ctx.ficha.goblins;
    var ad = o.opcoes.adaptacoes;
    function grupo(rotulo, mapa, prefixo) {
      return Object.keys(mapa).filter(function (k) { return !mapa[k].adaptacao || ad[mapa[k].adaptacao]; }).map(function (k) { return { valor: k, rotulo: rotulo + ": " + mapa[k].nome }; });
    }
    var opcoes = grupo("Arma", C().ARMAS).concat(grupo("Proteção", C().PROTECOES)).concat(grupo("Equipamento", C().EQUIPAMENTOS)).concat(grupo("Item mágico", C().ITENS_MAGICOS));
    var s = selecao("Do livro", opcoes, opcoes[0].valor);
    return el("div.pilha.pilha--curta", {}, [
      s,
      el("div.faixa", {}, [
        botao("Adicionar", function () { op(ctx, function (b) { return R().adicionarItem(b, s.entrada.value, {}, T().rolador); }); }),
        botao("Sortear item mágico", function () { sortearMagico(ctx); }, { dica: "Tipo (1d6) e item (1d6), p. 24" }),
        botao("Item sem tabela…", function () { itemPersonalizado(ctx); }, { classe: "r-botao--fantasma" }),
      ]),
    ]);
  }

  function sortearMagico(ctx) {
    var st = D().sortear({ id: "tipoMagico", nome: "Tipo de Item Mágico", pagina: 24, dados: "1d6", entradas: C().TIPO_MAGICO_D6 }, T().rolador);
    var si = D().sortear({ id: "itemMagico", nome: C().NOMES_TIPO_MAGICO[st.resultado], pagina: 24, dados: "1d6", entradas: C().MAGICOS_D6[st.resultado] }, T().rolador);
    var def = C().ITENS_MAGICOS[si.resultado];
    if (global.RAMARolagens) global.RAMARolagens.mostrar({ tipo: "goblins", expressao: "1d6 + 1d6", rolagens: st.dados.concat(si.dados), total: si.dados[0], parcelas: [] }, { nome: "Item mágico: " + C().NOMES_TIPO_MAGICO[st.resultado] + " · " + def.nome, notas: ["Sorteio em tabela (p. 24)."] });
    UI().modal({
      titulo: "Item mágico: " + def.nome,
      fundoFecha: true,
      conteudo: [el("p", { texto: C().NOMES_TIPO_MAGICO[st.resultado] + " (" + st.dados[0] + "), item " + si.dados[0] + "." }), el("p.t-mini", { texto: def.texto + " (" + C().referencia(def.pagina) + ")" })],
      botoes: [{ rotulo: "Guardar na ficha", classe: "r-botao--principal", aoClicar: function (f) { f(); op(ctx, function (b) { return R().adicionarItem(b, si.resultado, {}, T().rolador); }); } }],
    });
  }

  function itemPersonalizado(ctx) {
    var nome = UI().campo({ rotulo: "Nome", valor: "" });
    var tipo = selecao("Tipo", [{ valor: "outro", rotulo: "Item sem regra" }, { valor: "arma", rotulo: "Arma" }, { valor: "protecao", rotulo: "Proteção" }], "outro");
    var bonus = numero("Bônus de dados (arma)", 0), maos = selecao("Mãos", [{ valor: "1", rotulo: "Uma mão" }, { valor: "2", rotulo: "Duas mãos" }], "1");
    var ataque = selecao("Ataque", [{ valor: "corporal", rotulo: "Corporal" }, { valor: "distancia", rotulo: "Distância" }], "corporal");
    var municao = numero("Munição (vazio: sem limite)", "");
    var recarga = false;
    var dur = numero("Durabilidade (proteção)", 1), uso = selecao("Uso (proteção)", Object.keys(C().USOS_DE_PROTECAO).map(function (k) { return { valor: k, rotulo: C().USOS_DE_PROTECAO[k] }; }), "tronco");
    var nota = UI().campo({ rotulo: "Nota", valor: "", tipo: "area", linhas: 2, limite: 600 });
    UI().modal({
      titulo: "Item sem tabela",
      conteudo: [nome, tipo, bonus, maos, ataque, municao, marcaCaixa("Recarga", false, function (v) { recarga = v; }), dur, uso, nota, linha("Para o que o livro não tabela (Medalhas de Guerra, uma coroa roubada…). Nada é inventado: os números são os que você puser.")],
      botoes: [{ rotulo: "Adicionar", classe: "r-botao--principal", aoClicar: function (f) {
        var n = nome.entrada.value.trim();
        if (!n) { nome.marcarErro("Dê um nome."); return; }
        var t = tipo.entrada.value, pers = null;
        var mun = lerNumero(municao, null);
        if (t === "arma") pers = { arma: { nome: n, bonus: lerNumero(bonus, 0), maos: U.inteiro(maos.entrada.value, 1), ataque: ataque.entrada.value, recarga: recarga, municao: mun && mun > 0 ? mun : null } };
        if (t === "protecao") pers = { protecao: { nome: n, durabilidade: Math.max(0, lerNumero(dur, 0)), uso: uso.entrada.value } };
        f();
        op(ctx, function (b) { return R().adicionarItem(b, "", { nome: n, categoria: t, personalizado: pers, nota: nota.entrada.value.trim() }); });
      } }],
    });
  }

  /* ---------------------------------------------------------------
     ABA ADAPTAÇÕES (e as regras opcionais)
     --------------------------------------------------------------- */
  function abaAdaptacoes(ctx) {
    var o = ctx.ficha.goblins;
    var ad = o.opcoes.adaptacoes;
    var edita = ctx.podeEditar();
    var regras = el("div.pilha.pilha--curta", {}, [
      marcaCaixa("Voz Goblin", o.opcoes.vozGoblin, function (v) { op(ctx, function (b) { b.opcoes.vozGoblin = v; if (v && !b.estado.vozGoblin) b.estado.vozGoblin = "ativa"; return ok(); }); }, C().REGRAS.vozGoblin.texto),
      o.opcoes.vozGoblin ? el("div.faixa", {}, [
        el("span.t-mini", { texto: o.estado.vozGoblin === "ativa" ? "Fazendo a voz: dados todos em 1 não explodem." : o.estado.vozGoblin === "perdida" ? "Perdeu a vantagem até o fim do jogo." : "Ainda não declarou." }),
        edita && o.estado.vozGoblin !== "ativa" ? botao("Estou fazendo a voz", function () { op(ctx, function (b) { b.estado.vozGoblin = "ativa"; R().registrar(b, "regras", "Voz Goblin declarada"); return ok(); }); }) : null,
        edita && o.estado.vozGoblin === "ativa" ? botao("Falei sem a voz", function () { op(ctx, function (b) { b.estado.vozGoblin = "perdida"; R().registrar(b, "regras", "Falou sem a Voz Goblin: perdeu a vantagem até o fim do jogo"); return ok(); }); }, { classe: "r-botao--fantasma" }) : null,
      ]) : null,
      marcaCaixa("Mas deu ruim…", o.opcoes.deuRuim, function (v) { op(ctx, function (b) { b.opcoes.deuRuim = v; return ok(); }); }, C().REGRAS.deuRuim.texto),
      marcaCaixa("Níveis Épicos", o.opcoes.niveisEpicos, function (v) { op(ctx, function (b) { b.opcoes.niveisEpicos = v; return ok(); }); }, C().REGRAS.niveisEpicos.texto),
      marcaCaixa("Rolar as explosões uma a uma (“pode rolar”)", o.opcoes.explosoesManuais, function (v) { op(ctx, function (b) { b.opcoes.explosoesManuais = v; return ok(); }); }, "Sem marcar, cada 6 rola o dado extra sozinho, em cadeia."),
      el("div.faixa", {}, [T().regra("vozGoblin"), T().regra("deuRuim"), T().regra("niveisEpicos"), T().regra("explosaoDeDado")]),
    ]);
    var liga = el("div.pilha.pilha--curta", {}, Object.keys(C().ADAPTACOES).map(function (k) {
      return el("div.faixa", {}, [marcaCaixa(C().ADAPTACOES[k].nome, ad[k], function (v) { op(ctx, function (b) { b.opcoes.adaptacoes[k] = v; R().registrar(b, "regras", C().ADAPTACOES[k].nome + (v ? " ligada" : " desligada (os dados ficam)")); return ok(); }); }), T().regra(k)]);
    }).concat([linha("Desligar uma adaptação esconde as ferramentas dela, mas não apaga nada: ligar de novo traz tudo de volta.")]));
    if (!edita) { [regras, liga].forEach(function (x) { U.$$("input", x).forEach(function (i) { i.disabled = true; }); }); }
    return el("div.gob-aba.pilha", {}, [
      painel("Regras opcionais (p. 16)", [regras]),
      painel("Adaptações (p. 32–41)", [liga]),
      ad.cthulin ? painel("Chamado de Cthulin", [cthulin(ctx)], [T().regra("cthulin")]) : null,
      ad.pokepragas ? painel("PokéPragas", [pokepragas(ctx)], [T().regra("pokepragas")]) : null,
      ad.wargoblin ? painel("WarGoblin 40k", [wargoblin(ctx)], [T().regra("wargoblin")]) : null,
      ad.goblinHigh || ad.vale ? painel(ad.goblinHigh ? "Goblin High" : "Vilarejo do Vale", [goblinHigh(ctx)], [T().regra("goblinHigh")]) : null,
      ad.vale ? painel("Vale dos Goblins", [vale(ctx)], [T().regra("vale")]) : null,
    ]);
  }

  function cthulin(ctx) {
    var o = ctx.ficha.goblins;
    var c = R().calcular(o);
    var p = pode(ctx);
    var medo = o.adaptacoes.cthulin.medo, noc = c.atributos.nocao.valor;
    var horror = selecao("Horror que apareceu", C().CTHULIN.horrores.filter(function (k) { return C().INIMIGOS[k].terror; }).map(function (k) { return { valor: k, rotulo: C().INIMIGOS[k].nome + " (" + C().INIMIGOS[k].terror + " Medo)" }; }), "criaShub");
    return el("div.pilha.pilha--curta", {}, [
      el("p", { texto: "Medo " + medo + " · Noção " + noc + (medo === noc ? " — no limite: mais Medo que Noção é a loucura." : "") }),
      el("div.faixa", {}, [
        p ? botao("+1 Medo", function () { op(ctx, function (b) { return R().receberMedo(b, 1, "Manual"); }); }) : null,
        ctx.podeEditar() ? botao("−1 Medo", function () { op(ctx, function (b) { b.adaptacoes.cthulin.medo = Math.max(0, b.adaptacoes.cthulin.medo - 1); return ok(); }); }, { motivo: medo ? "" : "Sem Medo." }) : null,
        p ? botao("Descansar num lugar sagrado", function () { op(ctx, function (b) { return R().descansarEmLugarSagrado(b); }); }) : null,
        p ? botao("Investigação (Noção)", function () { abrirTeste(ctx, { atributo: "nocao", rotulo: "Investigação" }); }) : null,
      ]),
      p ? el("div.faixa", {}, [horror, botao("Viu o Horror: rolar o Terror", function () { var r = op(ctx, function (b) { return R().verHorror(b, horror.entrada.value, T().rolador); }); if (r && r.quantidade) UI().aviso("Terror: " + r.quantidade.dados.join("+") + " = " + r.quantidade.total + " Medo"); })]) : null,
      linha("Todo teste com 3 hits rola um Evento Sobrenatural sozinho. Queimar um Livro Especial (Equipamento) elimina todo o Medo."),
    ]);
  }

  function pokepragas(ctx) {
    var o = ctx.ficha.goblins;
    var pk = o.adaptacoes.pokepragas;
    var p = pode(ctx);
    var lista = pk.pragas.map(function (pr) {
      var st = R().statsDaPraga(pr);
      return el("li.gob-praga", { class: pr.desmaiada ? "gob-item--fora" : "" }, [
        el("strong", { texto: pr.nome }), el("span.t-mini", { texto: " — " + C().POKE.ficha[pr.bicho][0] + " " + C().POKE.raridades[pr.raridade].nome.toLowerCase() + " · " + pr.elementos.map(function (e) { return C().POKE.elementos[e].nome; }).join("/") + (pr.evolucoes ? " · evoluiu " + pr.evolucoes + "×" : "") }),
        el("p.t-mini", { texto: "Com " + st.combate + " · Hab " + st.habilidade + " · Noç " + st.nocao + " · Vit " + st.vitalidade + " · ferimentos " + pr.ferimentos + (pr.desmaiada ? " (desmaiada)" : "") + " · fraqueza: " + (C().POKE.elementos[st.fraqueza] ? C().POKE.elementos[st.fraqueza].nome : "—") }),
        p ? el("div.faixa", {}, [
          botao("Atacar", function () { ataqueDePraga(ctx, pr); }, { motivo: pr.desmaiada ? "Desmaiada." : "" }),
          botao("+1 ferimento", function () { op(ctx, function (b) { return R().ferirPraga(b, pr.id, 1); }); }),
          botao("−1", function () { op(ctx, function (b) { return R().ferirPraga(b, pr.id, -1); }); }, { motivo: pr.ferimentos ? "" : "Sem ferimentos." }),
          botao("Venceu uma PokéBatalha (evolução)", function () { var r = op(ctx, function (b) { return R().verificarEvolucao(b, pr.id, T().rolador); }); if (r && r.dados) UI().aviso("Evolução: " + r.dados.join(", ") + (r.evoluiu ? " — evoluiu!" : " — não foi dessa vez")); }),
        ]) : null,
      ]);
    });
    return el("div.pilha.pilha--curta", {}, [
      el("div.faixa", {}, [
        el("span", { texto: "PokéPedras: " + pk.pokepedras }),
        ctx.podeEditar() ? botao("+1", function () { op(ctx, function (b) { b.adaptacoes.pokepragas.pokepedras++; return ok(); }); }) : null,
        ctx.podeEditar() ? botao("−1", function () { op(ctx, function (b) { b.adaptacoes.pokepragas.pokepedras = Math.max(0, b.adaptacoes.pokepragas.pokepedras - 1); return ok(); }); }, { motivo: pk.pokepedras ? "" : "Nenhuma." }) : null,
      ]),
      lista.length ? el("ul.gob-lista", {}, lista) : linha("Nenhuma PokéPraga."),
      pk.encontrada ? el("div.gob-pendencias", {}, [
        el("p", { texto: "À vista: " + pk.encontrada.nome + " (" + C().POKE.raridades[pk.encontrada.raridade].nome + ", " + pk.encontrada.elementos.map(function (e) { return C().POKE.elementos[e].nome; }).join("/") + "). Captura com " + C().POKE.raridades[pk.encontrada.raridade].captura + " hit(s) de Habilidade." }),
        p ? botao("Arremessar uma PokéPedra", function () {
          UI().pedirTexto({ titulo: "Capturar", rotulo: "Nome da criatura (se pegar)", valor: pk.encontrada.nome, rotuloConfirmar: "Arremessar" }).then(function (n) {
            if (n === null) return;
            T().rolagem(ctx, function (b, z) { return R().capturarPraga(b, n, { seZero: z }, T().rolador); }, { notas: function (res) { return [res.capturou ? "Capturou!" : "Escapou da pedra."]; } });
          });
        }, { motivo: pk.pokepedras ? "" : "Sem PokéPedras." }) : null,
        ctx.podeEditar() ? botao("Deixar ir", function () { op(ctx, function (b) { b.adaptacoes.pokepragas.encontrada = null; return ok(); }); }, { classe: "r-botao--fantasma" }) : null,
      ]) : null,
      p ? botao("Procurar na grama alta (o dia todo)", function () {
        var r = op(ctx, function (b) { return R().procurarPraga(b, T().rolador); });
        if (r && r.sorteio && global.RAMARolagens) global.RAMARolagens.mostrar({ tipo: "goblins", expressao: "1d6", rolagens: r.sorteio.dados, total: r.sorteio.dados[0], parcelas: [] }, { nome: "Procurando PokéPraga · " + (r.praga ? r.praga.nome : "nada"), notas: ["Sorteio em tabela (p. 35)."] });
      }, { motivo: o.marcas.dia.procurouPraga ? "Já procurou hoje." : "" }) : null,
      linha("Em combate, quem tem mais Noção ataca primeiro. Mais ferimentos que Vitalidade: desmaia e volta à pedra."),
    ]);
  }

  function ataqueDePraga(ctx, pr) {
    var el_ = selecao("Ataque", [{ valor: "", rotulo: "Normal (Combate, sem elemento)" }].concat(pr.elementos.map(function (e) { return { valor: e, rotulo: "Elemental: " + C().POKE.elementos[e].nome + " (Habilidade)" }; })), "");
    var fraq = selecao("Fraqueza do alvo", [{ valor: "", rotulo: "Não sei / nenhuma" }].concat(Object.keys(C().POKE.elementos).map(function (e) { return { valor: e, rotulo: C().POKE.elementos[e].nome }; })), "");
    UI().modal({ titulo: "Ataque de " + pr.nome, conteudo: [el_, fraq, linha("Elemental que causar dano e for a fraqueza do alvo: +1 ferimento (p. 35).")], botoes: [{ rotulo: "Atacar", classe: "r-botao--principal", aoClicar: function (f) {
      var x = { elemento: el_.entrada.value, fraquezaDoAlvo: fraq.entrada.value };
      f();
      T().rolagem(ctx, function (b, z) { return R().ataqueDePraga(b, pr.id, Object.assign({ seZero: z }, x), T().rolador); }, { notas: function (res) { return (res.notas || []).concat([res.ferimentos + " ferimento(s) no alvo"]); } });
    } }] });
  }

  function wargoblin(ctx) {
    var o = ctx.ficha.goblins;
    var g = C().WARGOBLIN.grupos[o.escolhas.grupoWar];
    return el("div.pilha.pilha--curta", {}, [
      el("p", { texto: g ? g.nome + " (igual ao " + C().OCUPACOES[g.ocupacao].nome + ")" : "Sem turminha: escolha na criação." }),
      linha("Equipamento inicial (dois): " + (o.escolhas.equipamentoWar.map(nomeItem).join(", ") || "—") + ". As armas e proteções do futuro aparecem em “Ganhar item”."),
    ]);
  }

  function goblinHigh(ctx) {
    var o = ctx.ficha.goblins;
    var gh = o.adaptacoes.goblinHigh;
    var GH = C().GOBLIN_HIGH;
    var p = pode(ctx);
    var lista = gh.estudantes.map(function (e) {
      var info = ["assunto", "gosto", "materia", "segredo"].filter(function (k) { return e.revelado[k]; }).map(function (k) { return { assunto: "Assunto", gosto: "Gosto", materia: "Matéria", segredo: "Segredo" }[k] + ": " + GH[k][e[k] - 1]; });
      return el("li.gob-estudante", {}, [
        el("strong", { texto: e.nome }), el("span.r-etiqueta" + (["hostil", "inimigo"].indexOf(e.reacao) >= 0 ? ".r-etiqueta--aviso" : ""), { texto: GH.nomes[e.reacao] }),
        e.romance ? el("span.r-etiqueta", { texto: "Romance" + (e.romance.meses ? " (" + e.romance.meses + " mês(es))" : "") }) : null,
        info.length ? el("p.t-mini", { texto: info.join(" · ") }) : linha("Nada descoberto ainda."),
        p ? el("div.faixa", {}, [
          botao("Conversar", function () { T().rolagem(ctx, function (b, z) { return R().conversar(b, e.id, { seZero: z }, T().rolador); }, { notas: function (res) { return [res.conversa ? res.conversa.resultado.texto : res.hostil ? "Te agrediu e foi embora." : "Não deu papo."]; } }); }, { motivo: ["desconfiado", "inimigo"].indexOf(e.reacao) >= 0 ? "Só com Neutro, Amigável ou Amigo." : "" }),
          botao("Agradar (falar)", function () { T().rolagem(ctx, function (b, z) { return R().agradar(b, e.id, { seZero: z }, T().rolador); }); }, { motivo: o.marcas.dia["agradou:" + e.id] ? "Já agradou hoje." : "" }),
          botao("Fiz algo que ele gosta", function () { op(ctx, function (b) { return R().agradar(b, e.id, { gosto: true }, T().rolador); }); }, { motivo: o.marcas.dia["agradou:" + e.id] ? "Já agradou hoje." : "" }),
          e.reacao === "amigo" && !e.revelado.segredo ? botao("Perguntar o segredo", function () { op(ctx, function (b) { return R().perguntarSegredo(b, e.id); }); }) : null,
          !e.romance ? botao("Tentar romance", function () { T().rolagem(ctx, function (b, z) { return R().tentarRomance(b, e.id, { seZero: z }, T().rolador); }, { depois: function () {} }); }) : null,
          botao("−1 (errou com ele)", function () { op(ctx, function (b) { return R().mudarReacao(b, e.id, -1, "Fez algo que ele não gosta"); }); }, { classe: "r-botao--fantasma" }),
          botao("+1 (presente/ajuda)", function () { op(ctx, function (b) { return R().mudarReacao(b, e.id, 1, "Presente ou ajuda"); }); }, { classe: "r-botao--fantasma" }),
        ]) : null,
      ]);
    });
    return el("div.pilha.pilha--curta", {}, [
      lista.length ? el("ul.gob-lista", {}, lista) : linha("Nenhum estudante (ou vizinho) ainda."),
      gh.briga ? el("div.gob-pendencias", { role: "status" }, [
        el("p", { texto: gh.briga.estudante + " começou uma Briga com " + gh.briga.amigosDele + " amigo(s) dele! Seus Amigos lutam do seu lado; um romance fica com Combate +1." }),
        ctx.podeEditar() ? el("div.faixa", {}, [botao("Vencemos", function () { op(ctx, function (b) { return R().resolverBriga(b, true); }); }), botao("Perdemos", function () { op(ctx, function (b) { return R().resolverBriga(b, false); }); }, { classe: "r-botao--fantasma" })]) : null,
      ]) : null,
      gh.popular ? linha("Popular na escola.") : null,
      gh.humilhado ? linha("Já foi humilhado na escola.") : null,
      ctx.podeEditar() ? botao("Novo estudante (sorteia reação e segredos)", function () { UI().pedirTexto({ titulo: "Novo estudante", rotulo: "Nome", valor: "", rotuloConfirmar: "Criar" }).then(function (n) { if (n) op(ctx, function (b) { return R().adicionarEstudante(b, n, T().rolador); }); }); }) : null,
      linha("Inimigos rolam “Te pego na saída” no fim de cada dia (Novo dia)." + (o.opcoes.adaptacoes.vale ? " No vilarejo, os assuntos são de fazenda: o livro não dá tabela própria, então valem as mesmas." : "")),
    ]);
  }

  function vale(ctx) {
    var o = ctx.ficha.goblins;
    var v = o.adaptacoes.vale;
    var p = pode(ctx);
    var tem = function (k) { return o.itens.some(function (i) { return R().disponivel(i) && i.chave === k; }); };
    function contador(rot, chave) {
      return el("span.gob-contador", {}, [el("span", { texto: rot + ": " + v[chave] + " " }), ctx.podeEditar() ? botao("+", function () { op(ctx, function (b) { b.adaptacoes.vale[chave]++; return ok(); }); }, { rotulo: rot + " +1" }) : null, ctx.podeEditar() ? botao("−", function () { op(ctx, function (b) { b.adaptacoes.vale[chave] = Math.max(0, b.adaptacoes.vale[chave] - 1); return ok(); }); }, { rotulo: rot + " −1" }) : null]);
    }
    var planta = selecao("Plantar", C().VALE.plantas.map(function (x) { return { valor: x, rotulo: x }; }), "Batata");
    var receitas = Object.keys(C().VALE.receitas);
    var receita = selecao("Receita", receitas.map(function (k) { var r = C().VALE.receitas[k]; return { valor: k, rotulo: r.nome + " (" + r.hits + " hit" + (r.hits > 1 ? "s" : "") + ")" }; }), receitas[0]);
    var peixe = selecao("Peixe", [{ valor: "", rotulo: "—" }].concat(v.peixes.map(function (x) { return { valor: x.id, rotulo: x.nome + " " + x.gramas + " g" }; })), v.peixes[0] ? v.peixes[0].id : "");
    var constr = selecao("Construir", Object.keys(C().VALE.construcoes).map(function (k) { var d = C().VALE.construcoes[k]; return { valor: k, rotulo: d.nome + " (" + Object.keys(d.custo).map(function (c) { return d.custo[c] + " " + c; }).join(", ") + ")" }; }), "varaDePesca");
    var alimentos = Object.keys(v.alimentos).map(function (k) { return k + " " + v.alimentos[k]; });
    var pratos = Object.keys(v.pratos).map(function (k) { return C().VALE.receitas[k].nome + " " + v.pratos[k]; });
    return el("div.pilha.pilha--curta", {}, [
      el("p", { texto: v.fazenda ? "Fazenda" + (v.construcoes.length ? " · " + v.construcoes.map(function (k) { return C().VALE.construcoes[k].nome; }).join(", ") : "") : "Sem fazenda (o Fazendeiro herda uma)." }),
      el("div.faixa", {}, [contador("Galinhas", "galinhas"), contador("Vacas", "vacas"), contador("Minas", "minas"), contador("Bosques", "bosques")]),
      linha("Recursos: " + v.recursos.ovo + " ovo(s), " + v.recursos.leite + " L de leite, " + v.recursos.pedra + " pedra(s), " + v.recursos.madeira + " madeira(s)" + (alimentos.length ? " · " + alimentos.join(", ") : "") + (v.peixes.length ? " · peixes: " + v.peixes.map(function (x) { return x.nome + " " + x.gramas + " g"; }).join(", ") : "") + (pratos.length ? " · pratos: " + pratos.join(", ") : "")),
      p ? el("div.faixa", {}, [
        botao("Coletar ovos e leite", function () { serie(ctx, function (b) { return R().coletar(b, "animais", T().rolador); }, function (r) { return r.ovos + " ovo(s), " + r.leite + " litro(s) de leite"; }); }, { motivo: o.marcas.dia["coleta:animais"] ? "Já coletou hoje." : !v.galinhas && !v.vacas ? "Sem animais." : "" }),
        botao("Minerar", function () { serie(ctx, function (b) { return R().coletar(b, "pedra", T().rolador); }, function (r) { return r.total + " bloco(s) de pedra"; }); }, { motivo: !tem("picareta") ? "Precisa de uma Picareta." : o.marcas.dia["coleta:pedra"] ? "Já minerou hoje." : "" }),
        botao("Cortar madeira", function () { serie(ctx, function (b) { return R().coletar(b, "madeira", T().rolador); }, function (r) { return r.total + " tábua(s) de madeira"; }); }, { motivo: !tem("machado") ? "Precisa de um Machado." : o.marcas.dia["coleta:madeira"] ? "Já cortou hoje." : "" }),
      ]) : null,
      p ? el("div.faixa", {}, [planta, botao("Plantar", function () { var x = planta.entrada.value; T().rolagem(ctx, function (b, z) { return R().plantar(b, x, T().rolador); }, { notas: function (res) { return [res.m2 + " m² de " + x + (res.dias ? ": colhe em " + res.dias.total + " dia(s)" : "")]; } }); }, { motivo: !tem("enxada") ? "Precisa de uma Enxada." : o.marcas.dia.plantou ? "Já plantou hoje." : "" })]) : null,
      v.hortas.filter(function (h) { return !h.colhida; }).length ? el("ul.gob-lista", {}, v.hortas.filter(function (h) { return !h.colhida; }).map(function (h) {
        return el("li", {}, [el("span", { texto: h.planta + " " + h.m2 + " m² — colhe no dia " + h.colheitaEm + " " }), p ? botao("Colher", function () { serie(ctx, function (b) { return R().colher(b, h.id, T().rolador); }, function (r) { return "Colheu " + r.total + " " + h.planta; }); }, { motivo: o.tempo.dia < h.colheitaEm ? "Ainda não." : "" }) : null]);
      })) : null,
      p ? el("div.faixa", {}, [botao("Pescar no rio", function () { pescaria(ctx, "rio"); }, { motivo: tem("varaDePesca") ? "" : "Precisa de uma Vara de Pesca." }), botao("Pescar no lago", function () { pescaria(ctx, "lago"); }, { motivo: tem("varaDePesca") ? "" : "Precisa de uma Vara de Pesca." })]) : null,
      p ? el("div.faixa", {}, [receita, peixe, botao("Cozinhar", function () { var k = receita.entrada.value, px = peixe.entrada.value; T().rolagem(ctx, function (b, z) { return R().cozinhar(b, k, { peixeId: px }, T().rolador); }, { notas: function (res) { return [res.cozinhou ? "Ficou pronto!" : "Desandou: os ingredientes foram à toa."]; } }); })]) : null,
      p ? el("div.faixa", {}, [constr, botao("Construir (2 hits de Noção)", function () { var k = constr.entrada.value; T().rolagem(ctx, function (b, z) { return R().construir(b, k, T().rolador); }, { notas: function (res) { return [res.construiu ? "Construído!" : "Não saiu (os recursos ficam)."]; } }); })]) : null,
      ctx.podeEditar() ? botao("Ajustar alimento (Tomate, compras…)", function () { ajustarAlimento(ctx); }, { classe: "r-botao--fantasma" }) : null,
    ]);
  }

  /* Um teste por animal, m², mina ou bosque: cada rolagem vai para o
     histórico, e o total aparece no fim. */
  function serie(ctx, fn, resumo) {
    var r = op(ctx, fn, { silencioso: true });
    if (!r || r.ok === false) return;
    (r.rolagens || []).forEach(function (x) { T().mostrarRolagem(x); });
    T().narrar(r.eventos, { silencioso: true });
    UI().aviso(resumo(r) + " (" + (r.rolagens || []).length + " teste(s)).", { duracao: 8000 });
  }

  function ajustarAlimento(ctx) {
    var nome = UI().campo({ rotulo: "Alimento", valor: "Tomate" }), q = numero("Quantidade (+ ou −)", 1);
    UI().modal({ titulo: "Alimentos", conteudo: [nome, q, linha("O Tomate da Salada Mista não está na lista de plantas (ver inconsistências).")], botoes: [{ rotulo: "Aplicar", classe: "r-botao--principal", aoClicar: function (f) {
      var n = nome.entrada.value.trim().slice(0, 40), v = lerNumero(q, 0);
      if (!n || !v) return;
      f();
      op(ctx, function (b) { var a = b.adaptacoes.vale.alimentos; a[n] = Math.max(0, (a[n] || 0) + v); if (!a[n]) delete a[n]; R().registrar(b, "vale", n + " " + (v > 0 ? "+" : "") + v); return ok(); });
    } }] });
  }

  /* O minijogo (p. 41): 5 dados; escolha os que rerrolar, até duas vezes. */
  function pescaria(ctx, local) {
    var p = D().pescar(T().rolador, local);
    var marcados = [];
    var area = el("div.gob-pescaria");
    var escolha = null;
    function desenhar() {
      var cs = D().combinacoes(p.dados);
      var maior = cs[0] ? cs[0].iguais : 0;
      var empatadas = cs.filter(function (c) { return c.iguais === maior; });
      U.trocar(area, [
        el("div.gob-dados", { role: "group", "aria-label": "Dados da pescaria" }, p.dados.map(function (f, i) {
          var m = marcados.indexOf(i) >= 0;
          return el("button.gob-dado", { type: "button", class: m ? "gob-dado--marcado" : "", "aria-pressed": m ? "true" : "false", "aria-label": "Dado " + (i + 1) + ": " + f + (m ? " (vai rerrolar)" : ""), disabled: p.rerrolagens >= 2, onclick: function () { if (m) marcados = marcados.filter(function (x) { return x !== i; }); else marcados.push(i); desenhar(); } }, [el("span.gob-dado__face", { texto: String(f) })]);
        })),
        el("p.t-mini", { texto: "Rerrolagens: " + p.rerrolagens + "/2. " + (cs.length ? "Combinação: " + cs.map(function (c) { return c.iguais + "× " + c.valor; }).join(", ") : "Nenhuma combinação ainda.") }),
        empatadas.length > 1 ? selecao("Duas combinações do mesmo tamanho: qual vale?", empatadas.map(function (c) { return { valor: String(c.valor), rotulo: C().VALE.peixes[local][c.valor - 1] + " (" + c.iguais + "× " + c.valor + ")" }; }), String(empatadas[0].valor), function (v) { escolha = U.inteiro(v, null); }) : null,
        el("div.faixa", {}, [botao("Rerrolar marcados", function () { var r = D().rerrolarPescaria(p, marcados, T().rolador); if (!r.ok) UI().avisoAtencao(r.motivo); marcados = []; desenhar(); }, { motivo: p.rerrolagens >= 2 ? "Já rerrolou duas vezes." : !marcados.length ? "Marque de 1 a 5 dados." : "" })]),
      ]);
    }
    var m = UI().modal({ titulo: "Pescaria no " + local, classe: "gob-janela-rolagem", conteudo: [area, el("p.t-mini", { texto: "Valor do dado = peixe; quantos iguais = peso (2: 400 g · 3: 600 g · 4: 1 kg · 5: 3 kg)." })], botoes: [{ rotulo: "Recolher a linha", classe: "r-botao--principal", aoClicar: function (f) {
      D().concluirPescaria(p, C().VALE.pesos, C().VALE.peixes, escolha);
      f();
      if (global.RAMARolagens) global.RAMARolagens.mostrar({ tipo: "goblins", expressao: "5d6 (pescaria)", rolagens: p.dados, total: p.peixe ? p.peixe.iguais : 0, parcelas: [] }, { nome: "Pescaria · " + (p.peixe ? p.peixe.nome + " " + p.peixe.gramas + " g" : "nada"), notas: ["Minijogo (p. 41): " + p.rerrolagens + " rerrolagem(ns)."] });
      op(ctx, function (b) { return R().guardarPeixe(b, p); });
    } }] });
    desenhar();
    return m;
  }

  /* ---------------------------------------------------------------
     ABA DIÁRIO
     --------------------------------------------------------------- */
  function abaDiario(ctx) {
    var o = ctx.ficha.goblins;
    var fimDeJogo = R().FIM.indexOf(o.estado.situacao) >= 0;
    var hist = o.historico.slice().reverse().slice(0, 80);
    var sorteios = (o.criacao.sorteios || []).filter(function (s) { return s.nome; });
    return el("div.gob-aba.pilha", {}, [
      painel("Tempo", [el("p", { texto: "Dia " + o.tempo.dia + (o.tempo.batalha ? " · em batalha (turno " + o.tempo.turno + ")" : "") }), ctx.podeEditar() ? botao("Novo dia", function () { abrirNovoDia(ctx); }) : null], [T().regra("ferimentos")]),
      painel("Situação", [
        el("p", { texto: R().SITUACOES[o.estado.situacao] + (o.estado.causa ? " — " + o.estado.causa : "") }),
        o.estado.marcas.length ? linha("Marcas: " + o.estado.marcas.join(", ")) : null,
        fimDeJogo ? linha("A ficha fica como está, com tudo o que aconteceu. Um parente chega para vingar em minutos (p. 5).") : null,
        fimDeJogo && ctx.ehDono() && ctx.podeEditar() && !o.linhagem.seguinte ? botao("Fazer o próximo goblin (nível 1)", function () { novoParente(ctx); }) : null,
        o.estado.situacao === "morto" && o.itens.some(function (i) { return R().disponivel(i) && i.chave === "necronomicon"; }) && ctx.podeEditar() ? botao("Voltar como morto-vivo (Necronomicon)", function () { op(ctx, function (b) { return R().voltarComoMortoVivo(b); }); }) : null,
        ctx.emEdicao() && ctx.podeEditar() ? el("div.faixa", {}, [selecao("Corrigir a situação", Object.keys(R().SITUACOES).map(function (k) { return { valor: k, rotulo: R().SITUACOES[k] }; }), o.estado.situacao, function (v) { op(ctx, function (b) { return R().corrigirSituacao(b, v, "Correção no modo Edição"); }); })]) : null,
      ]),
      o.linhagem.anterior || o.linhagem.seguinte ? painel("Família", [
        o.linhagem.anterior ? el("p", {}, [el("span", { texto: "Veio vingar: " }), el("a", { href: U.url("ficha/?id=" + encodeURIComponent(o.linhagem.anterior.id)), texto: o.linhagem.anterior.nome || "o goblin anterior" })]) : null,
        o.linhagem.seguinte ? el("p", {}, [el("span", { texto: "Quem veio depois: " }), el("a", { href: U.url("ficha/?id=" + encodeURIComponent(o.linhagem.seguinte.id)), texto: o.linhagem.seguinte.nome || "o próximo goblin" })]) : null,
      ]) : null,
      painel("Histórico", [hist.length ? el("ol.gob-historico", { reversed: true }, hist.map(function (h) { return el("li", {}, [el("span.t-mini", { texto: "Dia " + h.dia + " · " }), el("span", { texto: h.texto })]); })) : linha("Nada ainda.")]),
      sorteios.length ? UI().recolhivel({ titulo: "Sorteios da criação (" + sorteios.length + ")", conteudo: [el("ul.gob-lista", {}, sorteios.map(function (s) { return el("li", { texto: s.nome + ": " + (s.dados || []).join(" e ") + " → " + (typeof s.resultado === "string" ? (C().CARACTERISTICAS[s.resultado] ? C().CARACTERISTICAS[s.resultado].nome : C().OCUPACOES[s.resultado] ? C().OCUPACOES[s.resultado].nome : C().DESCRITORES[s.resultado] ? C().DESCRITORES[s.resultado].nome : s.resultado === "rolarDuasVezes" ? "[Role 2 vezes]" : s.resultado) : s.total !== undefined ? s.total : s.resultado && s.resultado.texto ? s.resultado.texto : "") + (s.pagina ? " (p. " + s.pagina + ")" : "") }); }))] }) : null,
      painel("Regras para consulta", [el("ul.gob-lista.gob-regras", {}, Object.keys(C().REGRAS).map(function (k) { var rg = C().REGRAS[k]; return el("li", {}, [T().regra(k, rg.nome), el("span.t-mini", { texto: " " + { basica: "básica", opcional: "opcional", adaptacao: "adaptação" }[rg.tipo] })]); }))]),
      UI().recolhivel({ titulo: "O que o livro deixa em aberto (" + C().INCONSISTENCIAS.length + ")", conteudo: [el("ul.gob-lista", {}, C().INCONSISTENCIAS.map(function (x) { return el("li", { texto: x.texto + " (p. " + x.pagina + ")" }); }))] }),
    ]);
  }

  /* Morreu, explodiu, enlouqueceu: um parente de nível 1, com as mesmas
     regras ligadas, na mesma campanha. A ficha antiga não muda (só ganha
     o apontamento para o novo). */
  function novoParente(ctx) {
    var o = ctx.ficha.goblins;
    var bloco = R().novoParente(o, { id: ctx.personagemId, nome: ctx.ficha.nome }, T().rolador);
    var F = global.RAMAFicha;
    var nova = F.criarFicha({ nome: bloco.criacao.nomeSugerido || "Novo goblin", tipoFicha: "goblins", campanhaId: ctx.ficha.campanhaId || null, goblins: bloco });
    UI().confirmar({ titulo: "O próximo goblin", texto: "Um parente de " + ctx.ficha.nome + " chega: " + (bloco.criacao.nomeSugerido || "(nome a escolher)") + ", " + R().nomeDaOcupacao(bloco) + " " + C().DESCRITORES[bloco.descritor].nome.toLowerCase() + ". A criação continua na ficha nova (equipamento e escolhas).", rotuloConfirmar: "Criar a ficha nova" }).then(function (s) {
      if (!s) return;
      global.RAMAApi.criarPersonagem(nova).then(function (r) {
        if (!r.ok) { UI().avisoDeFalha(r, "criação do próximo goblin"); return; }
        op(ctx, function (b) { b.linhagem.seguinte = { id: r.dados.id, nome: nova.nome }; R().registrar(b, "linhagem", "Veio vingar: " + nova.nome); return ok(); });
        var salvar = global.RAMAFichaPainel && global.RAMAFichaPainel.salvarAgora ? global.RAMAFichaPainel.salvarAgora() : Promise.resolve();
        Promise.resolve(salvar).then(function () { location.href = U.url("ficha/?id=" + encodeURIComponent(r.dados.id)); });
      });
    });
  }

  global.RAMASecaoGoblins = { blocoSuperior: blocoSuperior, aba: abaGoblin };
  global.RAMASecaoGoblinsCombate = { aba: abaCombate };
  global.RAMASecaoGoblinsTecnicas = { aba: abaTecnicas };
  global.RAMASecaoGoblinsEquipamento = { aba: abaEquipamento };
  global.RAMASecaoGoblinsAdaptacoes = { aba: abaAdaptacoes };
  global.RAMASecaoGoblinsDiario = { aba: abaDiario };
  global.RAMAGoblinsFicha = { abrirTeste: abrirTeste, abrirAtaque: abrirAtaque, abrirAtaqueRecebido: abrirAtaqueRecebido, abrirConjurar: abrirConjurar, pescaria: pescaria };
})(window);
