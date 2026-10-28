/* =====================================================================
   R.A.M.A. — Ficha de Ordem · Arquivos Secretos 4
   =====================================================================
   A tela do que o AS4 põe numa ficha. A regra mora em
   js/ordem/arquivo4.js; aqui, só desenho, clique e gravação.

     painel(ctx)                no alto da aba Habilidades, só com o que
                                se aplica: missão e dia, ritual guardado
                                (Influencer, Terrores Noturnos),
                                sinestesia, chamariz do Backup,
                                temporizadores e explosões recentes
     controles(ctx, aq)         os botões no cartão de um poder do AS4
     controlesDeOrigem(ctx,org) Influencer Paranormal e Caçador de
                                Recompensas
     acoesNoTeste               Caçador (+2, falha, +1d20), Influencer
                                (+5 contra presença perturbadora),
                                exercício (+1d8), Ruído Branco (+1d6)
     antesDoDano(ctx, arma, f)  Chuva de Balas: pacotes antes de rolar
     acoesNoDano                exercício (+1d8) no dano
     opcoesDoItem               explosivos, lança-granadas, Foco
     interceptaAtaque           o "Atacar" do lança-granadas
     ajusteDoRitual             Explorador da Névoa (−1 PE)
     aoNovoInterludio           tira as modificações do Quase Novo

   Nada é rolado sem clique, nenhum dano é aplicado a ninguém sozinho e
   nada narrativo é resolvido pela ficha: a mesa confirma.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var el = U.el;

  function A4() { return global.RAMAOrdemArquivo4; }
  function A3() { return global.RAMAOrdemArquivo3 || null; }
  function R() { return global.RAMAOrdemRegras; }
  function C() { return global.RAMAOrdemCatalogo; }
  function D() { return global.RAMADados; }
  function CD() { return global.RAMAOrdemCondicoes || null; }
  function EF() { return global.RAMAOrdemEfeitos || null; }
  function I() { return global.RAMAOrdemInventario || null; }
  function IT() { return global.RAMAOrdemItens || null; }
  function RT() { return global.RAMAOrdemRituais || null; }
  function CS() { return global.RAMAOrdemConsumo || null; }
  function PO() { return global.RAMAOrdemPoderes || null; }
  function F() { return global.RAMAFicha; }

  function ordemDe(ctx) { return ctx.ficha.ordem; }
  function calc(ctx) { return R().calcular(ordemDe(ctx), ctx.ficha.inventario); }
  function salvar(ctx) { ctx.alterou(); ctx.redesenhar(); }
  function permitido(ctx) { return !ctx.podeEditar || ctx.podeEditar(); }
  function tem(o, k) { return !!(A4() && A4().temPoder(o, k)); }
  function comAfinidade(o, k) { return !!(A4() && A4().comAfinidade(o, k)); }
  function sigla(o) { return R().usaDeterminacao(o) ? "PD" : "PE"; }
  function opId(prefixo) { return prefixo + "-" + String(U.uuid()).replace(/[^A-Za-z0-9]/g, "").slice(0, 20); }

  function somar(expr) {
    var r = D() && D().somar ? D().somar(expr) : null;
    return r && r.ok !== false ? r : { total: 0, rolagens: [] };
  }
  function rolar(expr) { return somar(expr).total; }

  function gastar(ctx, quanto) {
    var o = ordemDe(ctx);
    var c = calc(ctx);
    var qual = c.determinacao ? "pd" : "pe";
    var maximo = qual === "pd" ? c.pd.total : c.pe.total;
    var atual = c.atual[qual];
    var r = CD() ? CD().aplicarAcao(qual, "gastar", { cond: o.condicoes, atual: atual, maximo: maximo, valor: quanto, pd: c.determinacao }) : null;
    if (!r || !r.ok) { UI.avisoAtencao((r && r.motivo) || "Sem " + qual.toUpperCase() + " suficientes."); return null; }
    if (!o.recursos) o.recursos = { pv: null, pe: null, san: null, pd: null };
    o.recursos[qual] = r.valor;
    return { qual: qual.toUpperCase(), antes: atual, depois: r.valor };
  }
  function mexerRecurso(ctx, qual, delta) {
    var o = ordemDe(ctx);
    var c = calc(ctx);
    var maximo = qual === "pv" ? c.pv.total : qual === "pe" ? c.pe.total : qual === "san" ? c.san.total : (c.pd ? c.pd.total : 0);
    var atual = c.atual[qual];
    var novo = Math.max(0, Math.min(maximo, (Number(atual) || 0) + delta));
    if (!o.recursos) o.recursos = { pv: null, pe: null, san: null, pd: null };
    o.recursos[qual] = novo;
    return { antes: atual, depois: novo, maximo: maximo };
  }
  /* Perda de Sanidade: com Jogando sem Sanidade, a ficha não tem SAN —
     o aviso diz, e nada é tirado de outro lugar. */
  function perderSan(ctx, n) {
    if (!n) return null;
    if (R().usaDeterminacao(ordemDe(ctx))) { UI.aviso("Jogando sem Sanidade: a perda de " + n + " SAN não se aplica (SAH p. 104)."); return null; }
    return mexerRecurso(ctx, "san", -n);
  }

  function botao(texto, aoClicar, op) {
    var x = op || {};
    return el("button.r-botao.r-botao--mini", { type: "button", texto: texto, disabled: !!x.desligado || !permitidoGlobal, title: x.dica || "", onclick: aoClicar });
  }
  var permitidoGlobal = true;
  function linha(texto, classe) { return el("p.t-mini" + (classe ? "." + classe : ""), { texto: texto }); }
  function titulo(texto) { return el("h4.t-secao", { texto: texto }); }
  function bloco(partes) { return el("div.pilha--curta", { class: "pilha" }, partes.filter(Boolean)); }
  function mostrar(r, nome, notas, acoes) { global.RAMARolagens.mostrar(r, { nome: nome, notas: notas || [], acoes: acoes || [] }); }

  function rolagemDe(nome, expr, tipo) {
    var s = somar(expr);
    return { ok: true, tipo: tipo || "soma", nome: nome, expressao: expr, total: s.total, rolagens: s.rolagens || [],
      parcelas: [{ rotulo: expr, valor: s.total }] };
  }

  function nexExposicao(o) { return R().exposicao ? R().exposicao(o) : (R().trilho(o).nexEquivalente || 0); }
  function nexTrilho(o) { return R().trilho(o).nexEquivalente || 0; }
  function cronologiaTexto(o) {
    var cr = A4().cronologia(o);
    return "missão " + cr.missao + " · dia " + cr.dia;
  }

  function select(opcoes, valor, aoMudar, rotulo) {
    return el("select.r-selecao", { "aria-label": rotulo || "", onchange: aoMudar ? function (ev) { aoMudar(ev.target.value); } : null },
      opcoes.map(function (op) { return el("option", { value: op.valor, texto: op.rotulo, selected: op.valor === valor }); }));
  }
  function campoTexto(rotulo, valor, limite) {
    var id = "a4-" + String(U.uuid()).slice(0, 8);
    var entrada = el("input.r-entrada", { id: id, type: "text", value: valor || "", maxlength: limite || 80 });
    return { caixa: el("div.r-campo", {}, [el("label.r-rotulo", { for: id, texto: rotulo }), entrada]), entrada: entrada };
  }
  function itens(ctx) { return (ctx.ficha.inventario && ctx.ficha.inventario.itens) || []; }
  function dadosDoItem(item) { return I() ? I().dadosDoItem(item) : (item.ordem || {}); }

  function gastarUnidade(ctx, item) {
    if (!item.ordem) item.ordem = {};
    var q = Math.max(1, Number(item.ordem.quantidade) || 1);
    if (q > 1) item.ordem.quantidade = q - 1;
    else ctx.ficha.inventario.itens = ctx.ficha.inventario.itens.filter(function (x) { return x !== item; });
  }

  /* =================================================================
     CATÁLOGOS (sob demanda)
     ================================================================= */

  function comItens(fn) {
    if (!IT()) { UI.avisoAtencao("O catálogo de itens não carregou."); return; }
    Promise.resolve(IT().carregar()).then(function (cat) {
      var c = cat && cat.itens ? cat : IT().catalogoPronto();
      if (!c) { UI.avisoAtencao("Não foi possível carregar o catálogo de itens."); return; }
      fn(c);
    }, function () { UI.avisoAtencao("Não foi possível carregar o catálogo de itens."); });
  }
  function comRituais(fn) {
    if (!RT()) { UI.avisoAtencao("O catálogo de rituais não carregou."); return; }
    Promise.resolve(RT().carregar()).then(function (cat) {
      var c = cat && cat.rituais ? cat : RT().catalogoPronto();
      if (!c) { UI.avisoAtencao("Não foi possível carregar o catálogo de rituais."); return; }
      fn(c);
    }, function () { UI.avisoAtencao("Não foi possível carregar o catálogo de rituais."); });
  }
  function retratoDoRitual(e) {
    var p = RT().paraFicha(e, {});
    return p.ok ? p.dados : null;
  }
  /* Os explosivos mundanos do catálogo (para Meus Bebês e O Calor do
     Momento): itens com dados de explosão, sem os amaldiçoados. */
  function explosivosMundanos(cat) {
    return cat.itens.filter(function (e) { return e.natureza === "item" && e.explosivo && e.aba !== "amaldicoados"; })
      .sort(function (a, b) { return a.nome.localeCompare(b.nome, "pt-BR"); });
  }

  /* =================================================================
     PAINEL (aba Habilidades)
     ================================================================= */

  function painel(ctx) {
    if (!A4()) return null;
    permitidoGlobal = permitido(ctx);
    var o = ordemDe(ctx);
    var a = A4().dados(o);
    var partes = [];

    var usaMissao = ["profissaoPerigo", "treinamentoMilitarizado", "sinestesiaParanormal", "meusBebes"].some(function (k) { return tem(o, k); });
    if (usaMissao && A3()) {
      partes.push(bloco([
        titulo("Missão e dia da campanha"),
        linha("Agora: " + cronologiaTexto(o) + ". É por estes contadores que a ficha mede “uma vez por missão” e “no dia seguinte” — nunca pelo relógio."),
        el("div.faixa", {}, [
          botao("Nova missão", function () { A3().avancar(o, "missao"); salvar(ctx); UI.aviso("Nova missão: " + cronologiaTexto(o) + "."); }),
          botao("Novo dia", function () { A3().avancar(o, "dia"); salvar(ctx); UI.aviso("Novo dia: " + cronologiaTexto(o) + "."); }),
        ]),
      ]));
    }

    var mem = A4().memorizadoValendo(o);
    if (mem) {
      partes.push(bloco([
        titulo("Ritual memorizado (Registrar o Paranormal)"),
        linha(mem.ritual.nome + " — conjurável como se você o conhecesse até a próxima cena de interlúdio. Não é um ritual aprendido."),
        botao("Conjurar " + mem.ritual.nome + "…", function () { conjurarGuardado(ctx, mem.ritual, "memorizado"); }),
      ]));
    }
    var terror = A4().terrorValendo(o);
    if (terror) {
      partes.push(bloco([
        titulo("Terrores Noturnos: uso único"),
        linha(terror.escolha.nome + " (" + (terror.escolha.tipo === "ritual" ? "ritual" : "poder paranormal") + ") — uma vez, até o início da próxima cena de interlúdio."),
        botao(terror.escolha.tipo === "ritual" ? "Conjurar (uso único)…" : "Usar o poder (uso único)", function () { usarTerror(ctx); }),
      ]));
    }

    if (a.sinestesia.ativa) {
      partes.push(bloco([
        titulo("Sinestesia Paranormal"),
        linha(a.sinestesia.pares.map(function (p) { return nomePericia(p[0]) + " ↔ " + nomePericia(p[1]); }).join(" · ") +
          ". Cada perícia rola com o atributo da outra do par; treino e vínculos ficam como estão."),
        botao("Encerrar (saiu da área)", function () { A4().encerrarSinestesia(o); salvar(ctx); UI.aviso("Sinestesia encerrada: os atributos voltaram ao normal."); }),
      ]));
    }

    var bk = A4().backupAtivo(o);
    if (bk) partes.push(painelDoBackup(ctx, o, bk));

    var timers = a.timers.filter(function (t) { return !t.resolvido; });
    if (timers.length) {
      partes.push(bloco([titulo("Granadas programadas")].concat(timers.map(function (t) {
        return el("div.faixa", {}, [
          el("span.t-mini", { texto: t.nome + ": " + (t.restantes ? t.restantes + " de " + t.turnos + " turno(s) para explodir" : "pronta para explodir") }),
          t.restantes ? botao("Passou um turno", function () { A4().avancarTimer(o, t.id); salvar(ctx); }) : null,
          botao("Explodiu — rolar", function () { explodirTimer(ctx, t); }),
          botao("Desarmada", function () { A4().resolverTimer(o, t.id, "desarmada/sem explosão"); salvar(ctx); }),
        ]);
      }))));
    }

    if (a.explosoes.length && ["meusBebes", "fogoAmigo", "oCalorDoMomento", "memoriaMuscular"].some(function (k) { return tem(o, k); })) {
      partes.push(UI.recolhivel({ titulo: "Explosivos usados (últimos)", conteudo: [el("ul.pilha--curta", { class: "pilha" },
        a.explosoes.slice(-8).reverse().map(function (e) { return el("li.t-mini", { texto: e.texto }); }))] }));
    }

    if (!partes.length) return null;
    return UI.recolhivel({
      titulo: "Arquivos Secretos 4",
      extra: [mem ? "ritual memorizado" : "", terror ? "terror noturno" : "", a.sinestesia.ativa ? "sinestesia" : "", bk ? "chamariz" : "", timers.length ? timers.length + " granada(s) programada(s)" : ""].filter(Boolean).join(" · ") || "missão, explosivos e efeitos do AS4",
      classe: "as4-painel",
      aberto: !!(mem || terror || a.sinestesia.ativa || bk || timers.length),
      conteudo: bloco(partes),
    });
  }

  function nomePericia(k) { var p = C().pericia(k); return p ? p.nome : k; }

  /* Um ritual guardado (memorizado ou de Terrores) entra em "Usar
     ritual" como um ritual qualquer, sem estar na aba Rituais. */
  function conjurarGuardado(ctx, retrato, tipo) {
    if (!global.RAMASecaoConsumo || !global.RAMASecaoConsumo.usarRitual) { UI.avisoAtencao("“Usar ritual” não está disponível nesta página."); return; }
    var ritual = Object.assign({ id: "as4-" + tipo }, JSON.parse(JSON.stringify(retrato)));
    global.RAMASecaoConsumo.usarRitual(ctx, ritual);
  }

  function usarTerror(ctx) {
    var o = ordemDe(ctx);
    var t = A4().terrorValendo(o);
    if (!t) return;
    UI.confirmar({ titulo: "Terrores Noturnos", texto: "Gastar o uso único de " + t.escolha.nome + "? Ele vale uma vez até o início da próxima cena de interlúdio.", rotuloConfirmar: "Usar" })
      .then(function (ok) {
        if (!ok) return;
        var r = A4().usarTerror(o);
        if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
        salvar(ctx);
        if (r.escolha.tipo === "ritual" && r.escolha.ritual) conjurarGuardado(ctx, r.escolha.ritual, "terrores");
        else UI.aviso(r.escolha.nome + ": use o poder seguindo as regras dele (custo e ação). O uso único foi marcado.", { duracao: 8000 });
      });
  }

  /* =================================================================
     BACKUP (ritual, p. 68)
     ================================================================= */

  function painelDoBackup(ctx, o, bk) {
    var nomes = { normal: "normal", discente: "discente", verdadeiro: "verdadeiro" };
    var partes = [
      titulo("Backup: chamariz ativo (" + nomes[bk.versao] + ")"),
      linha((bk.versao === "normal" ? "Dura 24 horas (criado no dia " + bk.dia + " da campanha): encerre quando passar." : "Duração permanente.") +
        " Conexão de 50 km a partir do chamariz; qualquer dano na cópia, ou você sair da área, dissipa o ritual."),
      bk.frase ? linha("Frase: “" + bk.frase + "”") : null,
      bk.aparencia ? linha("Aparência: " + bk.aparencia) : null,
      bk.sentidos ? linha("Sentidos na cópia: você está cego, surdo e pasmo no seu corpo.", "t-aviso") : null,
    ];
    var acoes = [
      botao("Trocar de lugar (reação, 2d4 SAN)", function () { trocarComChamariz(ctx, false); }),
    ];
    if (bk.versao !== "normal") {
      acoes.push(botao(bk.sentidos ? "Descobrir olhos e ouvidos" : "Sentidos na cópia (ação padrão)", function () { alternarSentidos(ctx); }));
    }
    if (bk.versao === "verdadeiro") acoes.push(botao("Trocar e dissipar com dano (6d6)", function () { trocarComChamariz(ctx, true); }));
    acoes.push(botao("Dissipar…", function () { dissiparBackup(ctx); }));
    partes.push(el("div.faixa", {}, acoes));
    if (bk.historico.length) partes.push(UI.recolhivel({ titulo: "Histórico do chamariz", conteudo: [el("ul.pilha--curta", { class: "pilha" }, bk.historico.slice(-6).reverse().map(function (h) { return el("li.t-mini", { texto: h.texto }); }))] }));
    return bloco(partes);
  }

  function criarBackup(ctx) {
    var o = ordemDe(ctx);
    var versao = "normal";
    var frase = campoTexto("A frase que a cópia repete", "", 200);
    var aparencia = campoTexto("Aparência (versão verdadeira: alguém que já viu e sabe descrever)", "", 200);
    var corpo = bloco([
      linha("Registra o chamariz depois de conjurar Backup em “Usar ritual” (o custo e a conjuração são de lá)."),
      el("div.r-campo", {}, [el("span.r-rotulo", { texto: "Versão conjurada" }),
        select([{ valor: "normal", rotulo: "Normal (24 horas)" }, { valor: "discente", rotulo: "Discente (+2 PE, permanente; requer 2º círculo)" }, { valor: "verdadeiro", rotulo: "Verdadeiro (+5 PE; requer 3º círculo)" }],
          versao, function (v) { versao = v; })]),
      frase.caixa, aparencia.caixa,
    ]);
    UI.modal({ titulo: "Backup: o chamariz", conteudo: corpo, botoes: [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Registrar chamariz", classe: "r-botao--principal", aoClicar: function (fechar) {
        var r = A4().conjurarBackup(o, versao, frase.entrada.value, aparencia.entrada.value);
        if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
        fechar(); salvar(ctx);
      } },
    ] });
  }

  function trocarComChamariz(ctx, comDano) {
    var o = ordemDe(ctx);
    var bk = A4().backupAtivo(o);
    if (!bk) return;
    UI.confirmar({ titulo: "Trocar de lugar com o chamariz", texto: "Reação: você e a cópia trocam de lugar e você perde 2d4 de Sanidade." + (comDano ? " Depois o ritual se dissipa, com 6d6 de dano de Energia (Reflexos reduz à metade) em todos os seres em alcance curto de onde seu corpo saiu e de onde ele aparece." : ""), rotuloConfirmar: "Trocar" })
      .then(function (ok) {
        if (!ok) return;
        var san = rolar("2d4");
        var s = perderSan(ctx, san);
        A4().historicoDoBackup(o, "Trocou de lugar: −" + san + " SAN.");
        var notas = ["2d4 = " + san + " de Sanidade perdida" + (s ? " (" + s.antes + " → " + s.depois + ")" : "") + "."];
        if (comDano) {
          var r = A4().dissiparBackup(o, "trocou de lugar e dissipou com dano");
          tirarEfeitosDoBackup(o, r.efeitos || []);
          var dano = rolagemDe("Backup (verdadeiro): dissipação", "6d6", "dano");
          salvar(ctx);
          mostrar(dano, "Backup · dissipação (6d6 Energia)", notas.concat(["A mesma rolagem vale para os seres em alcance curto das DUAS áreas: de onde o corpo saiu e de onde aparece (Reflexos reduz à metade).", "Nada é aplicado sozinho: a mesa aplica em quem estava nas áreas."]));
          return;
        }
        salvar(ctx);
        UI.aviso(notas[0]);
      });
  }

  function alternarSentidos(ctx) {
    var o = ordemDe(ctx);
    var bk = A4().backupAtivo(o);
    if (!bk || bk.versao === "normal") return;
    if (!bk.sentidos) {
      /* Cego, surdo e pasmo enquanto os sentidos estão na cópia: as
         condições entram em Condições, até descobrir olhos e ouvidos. */
      var ids = [];
      ["cego", "surdo", "pasmo"].forEach(function (k) {
        if (!EF() || !EF().condicao(k)) return;
        var inst = EF().criarInstancia({ modelo: "cond:" + k, origem: { tipo: "ritual", nome: "Backup" }, alvoNome: ctx.ficha.nome,
          duracao: { tipo: "ateRemover" }, cena: A4().cenaDe(o) });
        var r = EF().aplicar(o.condicoes, inst, "nova");
        if (r && r.ok) ids.push(inst.id);
      });
      bk.sentidos = true;
      bk.efeitos = ids;
      A4().historicoDoBackup(o, "Cobriu olhos e ouvidos: sentidos na cópia.");
      salvar(ctx);
      UI.aviso("Você vê e ouve pela cópia" + (bk.versao === "verdadeiro" ? " e pode falar por ela" : "") + ". Cego, surdo e pasmo no seu corpo (em Condições).");
      return;
    }
    tirarEfeitosDoBackup(o, bk.efeitos);
    bk.sentidos = false;
    bk.efeitos = [];
    A4().historicoDoBackup(o, "Descobriu olhos e ouvidos.");
    salvar(ctx);
  }

  function tirarEfeitosDoBackup(o, ids) {
    if (!EF() || !ids || !ids.length) return;
    ids.forEach(function (id) { EF().encerrar(o.condicoes, id, "manual", "Backup"); });
  }

  function dissiparBackup(ctx) {
    var o = ordemDe(ctx);
    var motivo = "dano na cópia";
    UI.modal({ titulo: "Dissipar o chamariz", conteudo: bloco([
      el("div.r-campo", {}, [el("span.r-rotulo", { texto: "Por quê" }), select([
        { valor: "dano na cópia", rotulo: "A cópia sofreu dano" },
        { valor: "saiu da área de conexão (50 km)", rotulo: "Você saiu da área de conexão (50 km)" },
        { valor: "24 horas se passaram", rotulo: "24 horas se passaram (versão normal)" },
        { valor: "por escolha", rotulo: "Outro motivo" },
      ], motivo, function (v) { motivo = v; })]),
    ]), botoes: [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Dissipar", classe: "r-botao--perigo", aoClicar: function (fechar) {
        var r = A4().dissiparBackup(o, motivo);
        if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
        tirarEfeitosDoBackup(o, r.efeitos);
        fechar(); salvar(ctx);
      } },
    ] });
  }

  /* =================================================================
     CONTROLES DOS CARTÕES DOS PODERES
     ================================================================= */

  var CONTROLES = {
    chuvaDeBalas: function (ctx, o) {
      var com = CS() && CS().ligada(o, "contagemMunicao");
      return [linha(com ? "Contagem de munição ligada: cada pacote de balas tem +10. No dano de uma arma de fogo, a ficha pergunta quantos pacotes sacrificar."
        : "Sem a contagem de munição, cada pacote dura o dobro de cenas. No dano de uma arma de fogo, a ficha pergunta quantos pacotes sacrificar.")];
    },
    treinamentoMilitarizado: function (ctx, o) {
      var vig = R().atributo(o, "vig");
      var n = A4().bonusDeExercicio(o);
      return [
        linha("Bônus de exercício guardados: " + n + " de " + vig + " (até o fim da missão — " + cronologiaTexto(o) + "). Cada um é +1d8 num teste de Agilidade, Força ou Vigor, ou numa rolagem de dano; um por rolagem."),
        botao("Exercitar-se (ação de interlúdio)", function () {
          var r = A4().exercitar(o, vig);
          if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
          salvar(ctx);
          UI.aviso("Exercício registrado: " + r.bonus + " bônus de +1d8 guardado(s).");
        }),
      ];
    },
    analiseConturbada: function (ctx, o) {
      return [botao("Expor a análise (ação padrão)…", function () { analiseConturbada(ctx); })];
    },
    profissaoPerigo: function (ctx, o) {
      var livre = A4().profissaoDisponivel(o);
      var p = A4().dados(o).profissao;
      return [
        livre ? null : linha("Já usada nesta missão" + (p.de ? ": " + p.de + " → " + p.para : "") + "."),
        botao("Desmontar e construir (ação completa, 4 " + sigla(o) + ")…", function () { profissaoPerigo(ctx); }, { desligado: !livre }),
      ];
    },
    quaseNovo: function (ctx, o) {
      return [botao("Manutenção com Quase Novo (interlúdio)…", function () { quaseNovo(ctx); })];
    },
    exploradorDaNevoa: function (ctx, o) {
      var e = A4().dados(o).explorador;
      var nesta = e && e.cena === A4().cenaDe(o);
      return [
        nesta ? linha("Nesta cena: Membrana " + (A4().ESTADOS_DA_MEMBRANA.filter(function (m) { return m.chave === e.membrana; })[0] || {}).nome + (e.reduz ? " — rituais custam 1 PE a menos nesta cena." : ".")) : null,
        botao("Distinguir a Membrana (2 " + sigla(o) + ")…", function () { exploradorDaNevoa(ctx); }, { desligado: nesta }),
      ];
    },
    sinestesiaParanormal: function (ctx, o) {
      var s = A4().dados(o).sinestesia;
      if (s.ativa) return [botao("Encerrar a sinestesia", function () { A4().encerrarSinestesia(o); salvar(ctx); })];
      return [
        A4().sinestesiaDisponivel(o) ? null : linha("Já aceita hoje: só no dia seguinte da campanha (" + cronologiaTexto(o) + ")."),
        botao("Membrana danificada: aceitar a sinestesia…", function () { sinestesia(ctx); }, { desligado: !A4().sinestesiaDisponivel(o) }),
      ];
    },
    terroresNoturnos: function (ctx, o) {
      var t = A4().dados(o).terrores;
      var deste = t && t.interludio === A4().interludioDe(o);
      var partes = [];
      if (deste) {
        partes.push(linha("Neste interlúdio: 1d100 = " + t.d100 + (t.pesadelo ? " — pesadelos (descanso precário, −" + t.san + " SAN)." : " — bons sonhos.")));
        if (t.pesadelo && !t.escolha) partes.push(botao("Escolher poder ou ritual…", function () { escolherTerror(ctx); }));
        if (t.escolha) partes.push(linha("Escolhido: " + t.escolha.nome + (t.usado ? " (já usado)." : " — use no painel do Arquivos Secretos 4.")));
      } else {
        partes.push(botao("Dormir (rolar 1d100)", function () { dormirTerrores(ctx); }));
      }
      return partes;
    },
    gororoba: function (ctx, o) {
      var usado = A4().dados(o).gororoba.interludio === A4().interludioDe(o) && A4().emInterludio(o);
      return [botao(usado ? "Gororoba: usada neste interlúdio" : "Alimentar-se sem ação (Gororoba)", function () {
        var r = A4().usarGororoba(o);
        if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
        salvar(ctx);
        UI.aviso("Gororoba: alimentou-se sem gastar ação nem precisar de refeição. Os efeitos da refeição são os da ação alimentar-se (OPRPG p. 93).");
      }, { desligado: usado })];
    },
    ruidoBranco: function (ctx, o) {
      var usado = A4().dados(o).ruido.cena === A4().cenaDe(o);
      return [
        linha("+1d6 em Investigação e Percepção num ambiente movimentado: aparece no resultado desses testes."),
        botao(usado ? "Ouviu as vozes nesta cena" : "Ouvir entre as vozes (1 " + sigla(o) + ")", function () {
          if (!gastar(ctx, 1)) return;
          var r = A4().usarRuido(o);
          if (!r.ok) { mexerRecurso(ctx, R().usaDeterminacao(o) ? "pd" : "pe", 1); UI.avisoAtencao(r.motivo); return; }
          salvar(ctx);
          UI.aviso("Ruído Branco: 1 " + sigla(o) + " gasto. A informação útil é decisão do mestre.");
        }, { desligado: usado }),
      ];
    },
    umaUltimaOlhada: function (ctx, o) {
      var usado = A4().dados(o).olhada.cena === A4().cenaDe(o);
      return [botao(usado ? "Rodada extra já usada nesta cena" : "Na última rodada: +1 rodada (2 " + sigla(o) + ")", function () {
        if (!gastar(ctx, 2)) return;
        var r = A4().usarOlhada(o);
        if (!r.ok) { mexerRecurso(ctx, R().usaDeterminacao(o) ? "pd" : "pe", 2); UI.avisoAtencao(r.motivo); return; }
        salvar(ctx);
        UI.aviso("Uma Última Olhada: a investigação tem +1 rodada (a mesa conta as rodadas).");
      }, { desligado: usado })];
    },
    focoGravitacional: function (ctx, o) {
      var max = comAfinidade(o, "focoGravitacional") ? 3 : 1;
      var ids = A4().itensDoFoco(o, ctx.ficha.inventario);
      var faltou = A4().dados(o).foco.itens.length > ids.length;
      var nomes = itens(ctx).filter(function (i) { return ids.indexOf(i.id) >= 0; }).map(function (i) { return i.nome + (dadosDoItem(i).empunhada ? " (empunhado)" : ""); });
      return [
        linha(nomes.length ? "Equipamento(s): " + nomes.join(", ") + ". Guardado, ocupa 0 espaços; “Empunhar” no menu do item rola o 1d100." : "Nenhum equipamento escolhido."),
        faltou ? linha("Um equipamento do Foco saiu do inventário (destruído ou consumido): escolha outro.", "t-aviso") : null,
        botao("Escolher equipamento" + (max > 1 ? "s (até 3)" : "") + "…", function () { escolherFoco(ctx, max); }),
      ];
    },
    sobreporImprevisivel: function (ctx, o) {
      return [botao("Início da rodada: sobrepor (2 " + sigla(o) + ")…", function () { sobrepor(ctx); })];
    },
    tracoDeInconsistencia: function (ctx, o) {
      if (comAfinidade(o, "tracoDeInconsistencia")) return [linha("Com afinidade: imagens digitais nunca capturam você, e sua voz sai distorcida em gravações — sempre, sem gasto.")];
      return [botao("Esconder a identidade (reação, 2 " + sigla(o) + ")", function () {
        if (!gastar(ctx, 2)) return;
        salvar(ctx);
        UI.aviso("Traço de Inconsistência: sua identidade não aparece nas imagens digitais deste momento. Nenhum arquivo é alterado — é efeito da história.");
      })];
    },
    meusBebes: function (ctx, o) {
      var n = A4().explosivosDaMissao(nexTrilho(o));
      var dado = A4().explosivosEntregues(o);
      return [
        linha("Explosivos autorais no início da missão: " + n + ". Não contam no limite de itens, mas ocupam espaço."),
        botao(dado ? "Já entregues nesta missão" : "Receber os explosivos da missão…", function () { meusBebes(ctx, n); }, { desligado: dado }),
      ];
    },
    fogoAmigo: function (ctx, o) {
      var intel = R().atributo(o, "int");
      var dobrado = tem(o, "peritoEmExplosivos");
      return [linha("Perito em Explosivos: +" + (dobrado ? 2 * intel + " (Intelecto ×2)" : intel + " (Intelecto)") + " na DT dos seus explosivos; exclui até " +
        A4().alvosExcluidos(intel, true, dobrado) + " alvo(s). Área dos seus explosivos +6 m." + (dobrado ? "" : " Adquira Perito em Explosivos na progressão para dobrar."))];
    },
    oCalorDoMomento: function (ctx, o) {
      return [botao("Fabricar às pressas (ação completa, 4 " + sigla(o) + ")…", function () { calorDoMomento(ctx); })];
    },
    memoriaMuscular: function (ctx, o) {
      return [linha("Seus explosivos autorais: dobro dos dados de dano. “Usar explosivo” oferece a ação de movimento por 4 " + sigla(o) + ".")];
    },
  };

  function controles(ctx, aq) {
    if (!A4() || !aq) return null;
    permitidoGlobal = permitido(ctx);
    var f = CONTROLES[aq.chave];
    if (!f) return null;
    var partes = (f(ctx, ordemDe(ctx), aq) || []).filter(Boolean);
    return partes.length ? el("div.pilha--curta.origem-controles", { class: "pilha" }, partes) : null;
  }

  /* --- Análise Conturbada --- */
  function analiseConturbada(ctx) {
    var o = ordemDe(ctx);
    var euAceito = true;
    var outros = el("textarea.r-area", { rows: 3, "aria-label": "Outros agentes que aceitaram (um por linha)" });
    UI.modal({ titulo: "Análise Conturbada", conteudo: bloco([
      linha("Numa cena de investigação, ação padrão. Quem aceitar rola 1d6: recebe o resultado em bônus em testes de Intelecto e Presença até o fim da cena e perde o mesmo valor em Sanidade."),
      el("label.r-marca", {}, [el("input", { type: "checkbox", checked: true, onchange: function (ev) { euAceito = ev.target.checked; } }), el("span", { texto: "Você aceita (" + ctx.ficha.nome + ")" })]),
      el("div.r-campo", {}, [el("span.r-rotulo", { texto: "Outros agentes voluntários (um por linha)" }), outros]),
    ]), botoes: [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Rolar 1d6 de cada", classe: "r-botao--principal", aoClicar: function (fechar) {
        var nomes = outros.value.split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 11);
        var participantes = (euAceito ? [{ nome: ctx.ficha.nome, voce: true }] : []).concat(nomes.map(function (n) { return { nome: n }; }));
        participantes.forEach(function (p) { p.valor = rolar("1d6"); });
        var r = A4().registrarAnalise(o, participantes);
        if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
        var notas = [];
        var eu = participantes.filter(function (p) { return p.voce; })[0];
        if (eu && EF()) {
          var inst = EF().criarInstancia({ nome: "Análise Conturbada (+" + eu.valor + ")", origem: { tipo: "habilidade", nome: "Análise Conturbada" }, alvoNome: ctx.ficha.nome,
            descricao: "+" + eu.valor + " em testes baseados em Intelecto e Presença até o fim da cena (AS4 p. 65).",
            modificadores: [{ alvo: "atributo:int", tipo: "bonus", valor: eu.valor }, { alvo: "atributo:pre", tipo: "bonus", valor: eu.valor }],
            duracao: { tipo: "cena" }, cena: A4().cenaDe(o) });
          var ap = EF().aplicar(o.condicoes, inst, "nova");
          if (!ap.ok) notas.push(ap.motivo);
          var s = perderSan(ctx, eu.valor);
          notas.push("Você: +" + eu.valor + " (efeito de cena em Condições)" + (s ? " e −" + eu.valor + " SAN (" + s.antes + " → " + s.depois + ")" : "") + ".");
        }
        participantes.filter(function (p) { return !p.voce; }).forEach(function (p) {
          notas.push(p.nome + ": 1d6 = " + p.valor + " — +" + p.valor + " em testes de Intelecto e Presença até o fim da cena e −" + p.valor + " SAN (registra na própria ficha).");
        });
        fechar(); salvar(ctx);
        mostrar({ ok: true, tipo: "soma", nome: "Análise Conturbada", expressao: participantes.length + "×1d6", total: participantes.reduce(function (s, p) { return s + p.valor; }, 0),
          parcelas: participantes.map(function (p) { return { rotulo: p.nome, valor: p.valor }; }) }, "Análise Conturbada", notas);
      } },
    ] });
  }

  /* --- Profissão Perigo --- */
  function profissaoPerigo(ctx) {
    var o = ordemDe(ctx);
    if (!A4().profissaoDisponivel(o)) { UI.avisoAtencao("Uma vez por missão — já usada nesta missão."); return; }
    comItens(function (cat) {
      var lista = itens(ctx).filter(function (i) { return dadosDoItem(i).categoria !== null; });
      if (!lista.length) { UI.avisoAtencao("Nenhum item com categoria no inventário para desmontar."); return; }
      var escolhaVelho = lista[0].id;
      var escolhaNovo = "";
      var area = el("div.pilha--curta", { class: "pilha" });
      function opcoesNovas() {
        var velho = lista.filter(function (i) { return i.id === escolhaVelho; })[0];
        var dv = dadosDoItem(velho);
        var esp = I() ? I().espacosDoItem(velho).unitario : (dv.espacos || 1);
        return cat.itens.filter(function (e) {
          return e.natureza === "item" && e.aba !== "amaldicoados" && e.secao !== "paranormais" &&
            A4().trocaCabe({ categoria: dv.categoria, espacos: esp }, { categoria: e.categoria, espacos: e.espacos }).ok;
        }).sort(function (a, b) { return a.nome.localeCompare(b.nome, "pt-BR"); });
      }
      function pintar() {
        var novos = opcoesNovas();
        if (!novos.some(function (e) { return e.id === escolhaNovo; })) escolhaNovo = novos.length ? novos[0].id : "";
        U.trocar(area, [
          el("div.r-campo", {}, [el("span.r-rotulo", { texto: "Item a desmontar" }), select(lista.map(function (i) {
            var d = dadosDoItem(i);
            return { valor: i.id, rotulo: i.nome + " (cat. " + (I() ? I().rotuloCategoria(d.categoria) : d.categoria) + ")" };
          }), escolhaVelho, function (v) { escolhaVelho = v; pintar(); })]),
          el("div.r-campo", {}, [el("span.r-rotulo", { texto: "Novo item operacional (cabe na categoria e nos espaços)" }),
            novos.length ? select(novos.map(function (e) { return { valor: e.id, rotulo: e.nome + " (cat. " + IT().rotuloCategoria(e.categoria) + ", " + (e.espacos === null ? "1" : e.espacos) + " esp.)" }; }), escolhaNovo, function (v) { escolhaNovo = v; })
              : linha("Nada do catálogo cabe na categoria e nos espaços deste item.", "t-aviso")]),
        ]);
      }
      pintar();
      UI.modal({ titulo: "Profissão Perigo", largo: true, conteudo: bloco([linha("Ação completa e 4 " + sigla(o) + ". Uma vez por missão (" + cronologiaTexto(o) + "). O item sai e o novo entra na mesma gravação."), area]), botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Desmontar e construir", classe: "r-botao--principal", aoClicar: function (fechar) {
          var velho = itens(ctx).filter(function (i) { return i.id === escolhaVelho; })[0];
          var e = cat.porId[escolhaNovo];
          if (!velho || !e) { UI.avisoAtencao("Escolha os dois itens."); return; }
          var dv = dadosDoItem(velho);
          var cabe = A4().trocaCabe({ categoria: dv.categoria, espacos: I() ? I().espacosDoItem(velho).unitario : dv.espacos }, { categoria: e.categoria, espacos: e.espacos });
          if (!cabe.ok) { UI.avisoAtencao(cabe.motivo); return; }
          var montado = IT().paraInventario(e, { quantidade: 1, catalogo: cat });
          if (!montado.ok) { UI.avisoAtencao(montado.mensagem); return; }
          if (!A4().profissaoDisponivel(o)) { UI.avisoAtencao("Uma vez por missão — já usada nesta missão."); return; }
          if (!gastar(ctx, 4)) return;
          A4().registrarProfissao(o, velho.nome, e.nome);
          gastarUnidade(ctx, velho);
          var novo = F().criarItem(montado.tipo, montado.dados);
          novo.adicionadoEm = U.agoraISO();
          ctx.ficha.inventario.itens.push(novo);
          fechar(); salvar(ctx);
          UI.avisoOk("Profissão Perigo: " + velho.nome + " virou " + novo.nome + ".");
        } },
      ] });
    });
  }

  /* --- Quase Novo --- */
  function quaseNovo(ctx) {
    var o = ordemDe(ctx);
    if (!A4().emInterludio(o)) { UI.avisoAtencao("A manutenção é uma ação de interlúdio: comece um em Condições → Novo interlúdio."); return; }
    comItens(function (cat) {
      var lista = itens(ctx);
      if (!lista.length) { UI.avisoAtencao("O inventário está vazio."); return; }
      var alvoId = lista[0].id;
      var modId = "";
      var area = el("div.pilha--curta", { class: "pilha" });
      function mods() {
        var item = lista.filter(function (i) { return i.id === alvoId; })[0];
        return cat.itens.filter(function (e) { return e.natureza === "modificacao" && item && IT().podeAplicar(e, item).ok; })
          .sort(function (a, b) { return a.nome.localeCompare(b.nome, "pt-BR"); });
      }
      function pintar() {
        var m = mods();
        if (modId && !m.some(function (e) { return e.id === modId; })) modId = "";
        U.trocar(area, [
          el("div.r-campo", {}, [el("span.r-rotulo", { texto: "Item reparado" }), select(lista.map(function (i) { return { valor: i.id, rotulo: i.nome }; }), alvoId, function (v) { alvoId = v; pintar(); })]),
          el("div.r-campo", {}, [el("span.r-rotulo", { texto: "Modificação temporária (até o próximo interlúdio; opcional)" }),
            select([{ valor: "", rotulo: "Nenhuma" }].concat(m.map(function (e) { return { valor: e.id, rotulo: e.nome }; })), modId, function (v) { modId = v; })]),
          linha("A categoria da modificação precisa ser uma que você possa acessar (patente): confira na mesa."),
        ]);
      }
      pintar();
      UI.modal({ titulo: "Quase Novo", conteudo: bloco([linha("Manutenção (Fabricação em Campo, SaH p. 94) numa cena de interlúdio: o item reparado recebe +10 PV adicionais."), area]), botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Registrar manutenção", classe: "r-botao--principal", aoClicar: function (fechar) {
          var item = itens(ctx).filter(function (i) { return i.id === alvoId; })[0];
          if (!item) return;
          if (!item.ordem) item.ordem = I() ? I().normalizarDados(null, item.tipo) : {};
          item.ordem.quaseNovo = { pvExtra: 10, interludio: A4().interludioDe(o) };
          var nota = "Quase Novo: " + item.nome + " recebeu +10 PV adicionais.";
          if (modId) {
            var e = cat.porId[modId];
            var r = IT().aplicar(e, item, {});
            if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
            r.registro.temporaria = "interludio";
            r.registro.interludio = A4().interludioDe(o);
            nota += " " + e.nome + " até o início do próximo interlúdio.";
          }
          fechar(); salvar(ctx);
          UI.avisoOk(nota);
        } },
      ] });
    });
  }

  /* --- Explorador da Névoa --- */
  function exploradorDaNevoa(ctx) {
    var o = ordemDe(ctx);
    var estado = "danificada";
    UI.modal({ titulo: "Explorador da Névoa", conteudo: bloco([
      linha("Uma vez por cena, 2 " + sigla(o) + ". O mestre informa o estado da Membrana deste ambiente."),
      el("div.r-campo", {}, [el("span.r-rotulo", { texto: "Estado da Membrana" }), select(A4().ESTADOS_DA_MEMBRANA.map(function (m) { return { valor: m.chave, rotulo: m.nome }; }), estado, function (v) { estado = v; })]),
    ]), botoes: [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Gastar 2 " + sigla(o), classe: "r-botao--principal", aoClicar: function (fechar) {
        if (!gastar(ctx, 2)) return;
        var r = A4().usarExplorador(o, estado);
        if (!r.ok) { mexerRecurso(ctx, R().usaDeterminacao(o) ? "pd" : "pe", 2); UI.avisoAtencao(r.motivo); return; }
        var s = r.perdeSan ? perderSan(ctx, 1) : null;
        fechar(); salvar(ctx);
        UI.aviso(r.reduz ? "Membrana danificada ou pior: −1 SAN" + (s ? " (" + s.antes + " → " + s.depois + ")" : "") + " e todos os seus rituais custam 1 PE a menos nesta cena." : "Membrana estável: nada muda.");
      } },
    ] });
  }

  /* --- Sinestesia Paranormal --- */
  function sinestesia(ctx) {
    var o = ordemDe(ctx);
    var pericias = C().PERICIAS.slice();
    var escolha = ["atletismo", "percepcao", "investigacao", "reflexos"];
    function podeUsar(k) {
      var p = C().pericia(k);
      return !!p && (!p.treinada || R().grauDaPericia(o, k) !== "destreinado");
    }
    var permitidas = pericias.filter(function (p) { return podeUsar(p.chave); }).map(function (p) { return { valor: p.chave, rotulo: p.nome + " (" + p.atributo.toUpperCase() + ")" }; });
    escolha = escolha.map(function (k, i) { return permitidas.some(function (x) { return x.valor === k; }) ? k : (permitidas[i] || {}).valor; });
    function sel(i) { return select(permitidas, escolha[i], function (v) { escolha[i] = v; }); }
    UI.modal({ titulo: "Sinestesia Paranormal", largo: true, conteudo: bloco([
      linha("Aceitar: perde 1d6 de Sanidade e troca os atributos de dois pares de perícias. Termina ao sair da área afetada; só pode ser aceita de novo no dia seguinte. Perícias que exigem treinamento só entram se você for treinado."),
      el("div.faixa", {}, [el("span.t-mini", { texto: "Par 1:" }), sel(0), el("span", { texto: "↔" }), sel(1)]),
      el("div.faixa", {}, [el("span.t-mini", { texto: "Par 2:" }), sel(2), el("span", { texto: "↔" }), sel(3)]),
    ]), botoes: [
      { rotulo: "Resistir (nada acontece)", classe: "r-botao--fantasma" },
      { rotulo: "Aceitar (1d6 SAN)", classe: "r-botao--principal", aoClicar: function (fechar) {
        var san = rolar("1d6");
        var r = A4().aceitarSinestesia(o, [[escolha[0], escolha[1]], [escolha[2], escolha[3]]], san, podeUsar);
        if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
        var s = perderSan(ctx, san);
        fechar(); salvar(ctx);
        UI.aviso("Sinestesia aceita: 1d6 = " + san + " de Sanidade perdida" + (s ? " (" + s.antes + " → " + s.depois + ")" : "") + ". As perícias trocadas já rolam com o atributo novo.", { duracao: 8000 });
      } },
    ] });
  }

  /* --- Terrores Noturnos --- */
  function dormirTerrores(ctx) {
    var o = ordemDe(ctx);
    var d100 = rolar("1d100");
    var san = d100 <= 50 ? rolar("1d4") : 0;
    var r = A4().rolarTerrores(o, d100, san);
    if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
    var s = r.pesadelo ? perderSan(ctx, san) : null;
    salvar(ctx);
    mostrar({ ok: true, tipo: "soma", nome: "Terrores Noturnos", expressao: "1d100", total: d100, parcelas: [{ rotulo: "1d100", valor: d100 }] }, "Terrores Noturnos",
      r.pesadelo ? ["50 ou menos: pesadelos paranormais. O descanso deste interlúdio vira precário (a mesa aplica na recuperação).",
        "1d4 = " + san + " de Sanidade perdida" + (s ? " (" + s.antes + " → " + s.depois + ")" : "") + ".",
        "Escolha um poder paranormal ou ritual cujos pré-requisitos você cumpra: uso único até o próximo interlúdio (no cartão do poder)."]
        : ["51 ou mais: nada acontece, bons sonhos."]);
  }

  function escolherTerror(ctx) {
    var o = ordemDe(ctx);
    var tipo = "poder";
    var area = el("div.pilha--curta", { class: "pilha" });
    var escolhaPoder = "";
    var escolhaRitual = "";
    comRituais(function (catR) {
      var maxCirc = A4().circuloMaximoPorNex(nexExposicao(o));
      var poderes = (PO() ? PO().PODERES_PARANORMAIS : []).filter(function (p) { return p.chave !== "aprenderRitual"; })
        .sort(function (a, b) { return a.nome.localeCompare(b.nome, "pt-BR"); });
      var rituais = catR.rituais.filter(function (e) { return e.circulo <= Math.max(1, maxCirc); }).sort(function (a, b) { return a.nome.localeCompare(b.nome, "pt-BR"); });
      escolhaPoder = poderes.length ? poderes[0].chave : "";
      escolhaRitual = rituais.length ? rituais[0].id : "";
      function pintar() {
        U.trocar(area, tipo === "poder"
          ? [el("div.r-campo", {}, [el("span.r-rotulo", { texto: "Poder paranormal" }), select(poderes.map(function (p) { return { valor: p.chave, rotulo: p.nome + " (" + (p.elemento || "—") + ")" }; }), escolhaPoder, function (v) { escolhaPoder = v; })]),
             linha("Os pré-requisitos do poder (elemento, círculo…) são conferidos pela mesa.")]
          : [el("div.r-campo", {}, [el("span.r-rotulo", { texto: "Ritual (até o " + Math.max(1, maxCirc) + "º círculo pelo seu NEX)" }), select(rituais.map(function (e) { return { valor: e.id, rotulo: e.nome + " (" + e.circulo + "º)" }; }), escolhaRitual, function (v) { escolhaRitual = v; })])]);
      }
      pintar();
      UI.modal({ titulo: "Terrores Noturnos: a escolha", conteudo: bloco([
        el("div.r-campo", {}, [el("span.r-rotulo", { texto: "Tipo" }), select([{ valor: "poder", rotulo: "Poder paranormal" }, { valor: "ritual", rotulo: "Ritual" }], tipo, function (v) { tipo = v; pintar(); })]),
        area,
      ]), botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Guardar escolha", classe: "r-botao--principal", aoClicar: function (fechar) {
          var esc;
          if (tipo === "poder") {
            var p = poderes.filter(function (x) { return x.chave === escolhaPoder; })[0];
            if (!p) return;
            esc = { tipo: "poder", chave: p.chave, nome: p.nome };
          } else {
            var e = catR.rituais.filter(function (x) { return x.id === escolhaRitual; })[0];
            if (!e) return;
            esc = { tipo: "ritual", chave: e.id, nome: e.nome, ritual: retratoDoRitual(e) };
          }
          var r = A4().escolherTerror(o, esc);
          if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
          fechar(); salvar(ctx);
        } },
      ] });
    });
  }

  /* --- Foco Gravitacional --- */
  function escolherFoco(ctx, max) {
    var o = ordemDe(ctx);
    var marcados = A4().itensDoFoco(o, ctx.ficha.inventario).slice();
    var lista = itens(ctx);
    if (!lista.length) { UI.avisoAtencao("O inventário está vazio."); return; }
    UI.modal({ titulo: "Foco Gravitacional", conteudo: bloco([
      linha("Escolha até " + max + " equipamento(s). Guardado com você, ocupa 0 espaços (uma unidade); empunhado, tem 25% de chance de sair voando."),
      el("div.pilha--curta", { class: "pilha" }, lista.map(function (i) {
        return el("label.r-marca", {}, [el("input", { type: "checkbox", checked: marcados.indexOf(i.id) >= 0, onchange: function (ev) {
          if (ev.target.checked) marcados.push(i.id); else marcados = marcados.filter(function (x) { return x !== i.id; });
        } }), el("span", { texto: i.nome })]);
      })),
    ]), botoes: [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Salvar", classe: "r-botao--principal", aoClicar: function (fechar) {
        var r = A4().definirFoco(o, marcados, max);
        if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
        fechar(); salvar(ctx);
      } },
    ] });
  }

  /* --- Sobrepor Imprevisível --- */
  function sobrepor(ctx) {
    var o = ordemDe(ctx);
    var af = comAfinidade(o, "sobreporImprevisivel");
    var ini = campoTexto("Sua iniciativa atual (o resultado no combate)", "", 4);
    UI.modal({ titulo: "Sobrepor Imprevisível", conteudo: bloco([
      linha("Uma vez por rodada, só no início dela, 2 " + sigla(o) + ". Par: soma à iniciativa; ímpar: subtrai." + (af ? " Com afinidade, rola 2d20 e você escolhe." : "")),
      ini.caixa,
      linha("Mudar a ordem não dá um turno de novo a quem já agiu nesta rodada nem desfaz ações: o mestre reposiciona no combate."),
    ]), botoes: [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Gastar 2 " + sigla(o) + " e rolar", classe: "r-botao--principal", aoClicar: function (fechar) {
        var antes = Number(String(ini.entrada.value).replace(",", "."));
        if (!isFinite(antes)) { UI.avisoAtencao("Informe a iniciativa atual."); return; }
        if (!gastar(ctx, 2)) return;
        var d1 = rolar("1d20");
        var d2 = af ? rolar("1d20") : null;
        fechar();
        function concluir(escolhido) {
          var r = A4().registrarSobrepor(o, af ? [d1, d2] : [d1], escolhido, antes);
          salvar(ctx);
          var delta = A4().deltaDoSobrepor(escolhido);
          mostrar({ ok: true, tipo: "soma", nome: "Sobrepor Imprevisível", expressao: "1d20", total: r.registro.iniciativaDepois,
            parcelas: [{ rotulo: "Iniciativa antes", valor: antes }, { rotulo: "d20 " + escolhido + (delta >= 0 ? " (par)" : " (ímpar)"), valor: delta }] },
            "Sobrepor Imprevisível", ["Nova iniciativa: " + r.registro.iniciativaDepois + ". O mestre reposiciona na ordem de turnos."]);
        }
        if (!af) { concluir(d1); return; }
        UI.modal({ titulo: "Afinidade: escolha um dado", exigeDecisao: true, conteudo: linha("Rolou " + d1 + " e " + d2 + ". Par soma; ímpar subtrai."), botoes: [
          { rotulo: "Usar " + d1, aoClicar: function (f) { f(); concluir(d1); } },
          { rotulo: "Usar " + d2, classe: "r-botao--principal", aoClicar: function (f) { f(); concluir(d2); } },
        ] });
      } },
    ] });
  }

  /* --- Granadeiro Blaster --- */
  function autoria(ctx) {
    var o = ordemDe(ctx);
    return { autor: ctx.ficha.nome, autorId: ctx.personagemId || "", dobro: tem(o, "memoriaMuscular") };
  }

  function criarExplosivo(ctx, cat, e, extras) {
    var montado = IT().paraInventario(e, { quantidade: 1, catalogo: cat });
    if (!montado.ok) return null;
    var aut = autoria(ctx);
    montado.dados.ordem.autoral = { autor: aut.autor, autorId: aut.autorId, missao: A4().cronologia(ordemDe(ctx)).missao };
    if (extras && extras.apressado) montado.dados.ordem.autoral.apressado = true;
    if (extras && extras.foraDoLimite) montado.dados.ordem.foraDoLimite = true;
    montado.dados.nome = (e.nome + " (autoral" + (extras && extras.apressado ? ", às pressas" : "") + ")").slice(0, 80);
    var item = F().criarItem(montado.tipo, montado.dados);
    item.adicionadoEm = U.agoraISO();
    return item;
  }

  function meusBebes(ctx, n) {
    var o = ordemDe(ctx);
    if (A4().explosivosEntregues(o)) { UI.avisoAtencao("Os explosivos desta missão já foram entregues."); return; }
    comItens(function (cat) {
      var lista = explosivosMundanos(cat);
      var escolhas = [];
      for (var i = 0; i < n; i++) escolhas.push(lista.length ? lista[0].id : "");
      UI.modal({ titulo: "Meus Bebês: explosivos da missão", conteudo: bloco([
        linha(n + " explosivo(s) autoral(is) para o início desta missão (" + cronologiaTexto(o) + "). Ficam fora do limite de itens e ocupam os espaços deles. Recarregar a ficha não entrega de novo."),
      ].concat(escolhas.map(function (_, k) {
        return el("div.r-campo", {}, [el("span.r-rotulo", { texto: "Explosivo " + (k + 1) }), select(lista.map(function (e) { return { valor: e.id, rotulo: e.nome }; }), escolhas[k], function (v) { escolhas[k] = v; })]);
      }))), botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Receber", classe: "r-botao--principal", aoClicar: function (fechar) {
          var m = A4().marcarEntrega(o);
          if (!m.ok) { UI.avisoAtencao(m.motivo); return; }
          var criados = escolhas.map(function (id) { return cat.porId[id] ? criarExplosivo(ctx, cat, cat.porId[id], { foraDoLimite: true }) : null; }).filter(Boolean);
          criados.forEach(function (it) { ctx.ficha.inventario.itens.push(it); });
          fechar(); salvar(ctx);
          UI.avisoOk("Meus Bebês: " + criados.map(function (x) { return x.nome; }).join(", ") + ".");
        } },
      ] });
    });
  }

  function calorDoMomento(ctx) {
    var o = ordemDe(ctx);
    comItens(function (cat) {
      var lista = explosivosMundanos(cat);
      var escolha = lista.length ? lista[0].id : "";
      UI.modal({ titulo: "O Calor do Momento", conteudo: bloco([
        linha("Ação completa e 4 " + sigla(o) + ": um explosivo autoral às pressas, com todos os bônus de um autoral — e 25% de chance de explodir na sua mão quando for usado (mesmo num lança-granadas)."),
        el("div.r-campo", {}, [el("span.r-rotulo", { texto: "Explosivo" }), select(lista.map(function (e) { return { valor: e.id, rotulo: e.nome }; }), escolha, function (v) { escolha = v; })]),
      ]), botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Fabricar (4 " + sigla(o) + ")", classe: "r-botao--principal", aoClicar: function (fechar) {
          var e = cat.porId[escolha];
          if (!e) return;
          if (!gastar(ctx, 4)) return;
          var item = criarExplosivo(ctx, cat, e, { apressado: true });
          if (!item) return;
          ctx.ficha.inventario.itens.push(item);
          fechar(); salvar(ctx);
          UI.avisoOk(item.nome + " fabricado. A chance de explodir na mão é rolada ao usar.");
        } },
      ] });
    });
  }

  /* =================================================================
     ORIGENS (p. 64)
     ================================================================= */

  function controlesDeOrigem(ctx, org) {
    if (!A4() || !org) return null;
    permitidoGlobal = permitido(ctx);
    var o = ordemDe(ctx);
    var partes = [];
    if (org.chave === "influencerParanormal") {
      var inf = A4().dados(o).influencer;
      var nestaCena = inf.cena === A4().cenaDe(o);
      partes.push(botao(nestaCena ? "Já registrou nesta cena" : "Registrar o Paranormal (ação padrão, 2 " + sigla(o) + ")…", function () { registrarParanormal(ctx); }, { desligado: nestaCena }));
      var regs = inf.registros.slice(-12).reverse();
      if (regs.length) partes.push(el("ul.pilha--curta", { class: "pilha" }, regs.map(function (r) {
        return el("li.faixa", {}, [
          el("span.t-mini", { texto: (r.tipo === "criatura" ? "Criatura: " : "Ritual: ") + r.nome }),
          r.tipo === "ritual" ? botao("Memorizar (interlúdio)", function () { memorizarRitual(ctx, r); }, { desligado: !A4().emInterludio(o), dica: A4().emInterludio(o) ? "" : "Só numa cena de interlúdio." }) : null,
        ]);
      })));
      var mem = A4().memorizadoValendo(o);
      if (mem) partes.push(linha("Memorizado: " + mem.ritual.nome + " (até a próxima cena de interlúdio) — conjure pelo painel do Arquivos Secretos 4."));
    }
    if (org.chave === "cacadorDeRecompensas") {
      partes.push(linha(A4().bonusDoCacador(o) ? "+1d20 guardado para o próximo teste desta cena." : "Nenhum +1d20 guardado. Falhando num teste contra condição mental ou de medo, marque no resultado."));
    }
    return partes.length ? el("div.pilha--curta.origem-controles", { class: "pilha" }, partes) : null;
  }

  function registrarParanormal(ctx) {
    var o = ordemDe(ctx);
    var tipo = "criatura";
    var nome = campoTexto("O que foi registrado (nome da criatura ou do ritual)", "", 120);
    var area = el("div");
    var ritualId = "";
    function pintar(catR) {
      if (tipo !== "ritual" || !catR) { U.limpar(area); return; }
      var rs = catR.rituais.slice().sort(function (a, b) { return a.nome.localeCompare(b.nome, "pt-BR"); });
      ritualId = ritualId || (rs[0] && rs[0].id) || "";
      U.trocar(area, el("div.r-campo", {}, [el("span.r-rotulo", { texto: "Ritual da biblioteca (para poder memorizá-lo)" }),
        select([{ valor: "", rotulo: "Outro (fora da biblioteca)" }].concat(rs.map(function (e) { return { valor: e.id, rotulo: e.nome + " (" + e.circulo + "º)" }; })), ritualId, function (v) {
          ritualId = v; var e = catR.rituais.filter(function (x) { return x.id === v; })[0]; if (e) nome.entrada.value = e.nome;
        })]));
    }
    var catR = null;
    UI.modal({ titulo: "Registrar o Paranormal", conteudo: bloco([
      linha("Uma vez por cena, ação padrão e 2 " + sigla(o) + ": uma foto, um vídeo ou outro registro de uma criatura paranormal ou de um ritual conjurado nesta cena."),
      el("div.r-campo", {}, [el("span.r-rotulo", { texto: "Tipo" }), select([{ valor: "criatura", rotulo: "Criatura paranormal" }, { valor: "ritual", rotulo: "Ritual conjurado nesta cena" }], tipo, function (v) {
        tipo = v;
        if (tipo === "ritual" && !catR) comRituais(function (c) { catR = c; pintar(catR); }); else pintar(catR);
      })]),
      nome.caixa, area,
    ]), botoes: [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Registrar (2 " + sigla(o) + ")", classe: "r-botao--principal", aoClicar: function (fechar) {
        if (!String(nome.entrada.value).trim()) { UI.avisoAtencao("Diga o que foi registrado."); return; }
        if (!gastar(ctx, 2)) return;
        var e = tipo === "ritual" && catR && ritualId ? catR.rituais.filter(function (x) { return x.id === ritualId; })[0] : null;
        var r = A4().registrarParanormal(o, { tipo: tipo, nome: nome.entrada.value, catalogoId: e ? e.id : "", circulo: e ? e.circulo : 0 });
        if (!r.ok) { mexerRecurso(ctx, R().usaDeterminacao(o) ? "pd" : "pe", 2); UI.avisoAtencao(r.motivo); return; }
        fechar(); salvar(ctx);
        UI.aviso("Registrado: " + r.registro.nome + (r.registro.tipo === "criatura" ? ". +5 contra a presença perturbadora dela (no teste de Vontade)." : "."));
      } },
    ] });
  }

  function memorizarRitual(ctx, reg) {
    var o = ordemDe(ctx);
    if (!reg.catalogoId) { UI.avisoAtencao("Este ritual não foi ligado a uma entrada da biblioteca: registre-o escolhendo o ritual, para poder conjurá-lo."); return; }
    comRituais(function (catR) {
      var e = catR.rituais.filter(function (x) { return x.id === reg.catalogoId; })[0];
      if (!e) { UI.avisoAtencao("O ritual não está mais na biblioteca."); return; }
      var r = A4().memorizar(o, reg.id, retratoDoRitual(e), nexExposicao(o));
      if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
      salvar(ctx);
      UI.aviso(e.nome + " memorizado: conjurável até a próxima cena de interlúdio. Não entra nos rituais aprendidos.");
    });
  }

  /* =================================================================
     NO RESULTADO DE UM TESTE
     ================================================================= */

  var RESISTENCIAS = ["fortitude", "reflexos", "vontade"];

  function comMaisDados(r, n, rotulo) {
    var sel = r.selecao || "maior";
    if (sel !== "maior" && (r.rolagens || []).length > 1) return null;
    var novos = [];
    for (var i = 0; i < n; i++) novos.push(rolar("1d20"));
    var todos = (r.rolagens || []).concat(novos);
    var natural = Math.max.apply(null, todos);
    return Object.assign({}, r, { rolagens: todos, natural: natural, total: r.total - (r.natural || 0) + natural,
      parcelas: [{ rotulo: "Dado (" + todos.join(", ") + ")", valor: natural }].concat((r.parcelas || []).slice(1)),
      notaExtra: rotulo + ": +" + n + "d20 (" + novos.join(", ") + ")." });
  }

  function acoesNoTeste(ctx, o, p, r, dado, bonus, atributo) {
    if (!A4() || !permitido(ctx)) return [];
    var saida = [];
    var unico = function (rotulo, f, dica) {
      var usado = false;
      saida.push({ rotulo: rotulo, dica: dica || "", aoClicar: function (cartao, b) { if (usado) return; if (f() !== false) { usado = true; if (b) b.disabled = true; } } });
    };
    var mostrarT = function (novo, nome, notas) { global.RAMARolagens.mostrar(novo, { nome: p.nome + " · " + nome, notas: notas }); };
    var somarAoTeste = function (valor, rot) {
      return Object.assign({}, r, { total: r.total + valor, parcelas: (r.parcelas || []).concat([{ rotulo: rot, valor: valor }]) });
    };
    var org = C().origem(o.origem);
    var ehCacador = org && org.chave === "cacadorDeRecompensas";

    if (ehCacador && RESISTENCIAS.indexOf(p.chave) >= 0) {
      unico("Quem Não Arrisca: +2 contra condição mental ou de medo", function () {
        mostrarT(somarAoTeste(2, "Quem Não Arrisca"), "contra condição mental/medo", ["Só para resistir a condições mentais e de medo (AS4 p. 64)."]);
      });
      unico("Falhei contra condição mental/medo: guardar +1d20", function () {
        var m = A4().marcarFalhaDoCacador(o);
        salvar(ctx);
        UI.aviso(m.jaTinha ? "Já havia um +1d20 guardado nesta cena: o bônus não acumula com ele mesmo." : "+1d20 guardado para o próximo teste, até o fim da cena.");
      });
    }
    if (ehCacador && A4().bonusDoCacador(o)) {
      unico("Quem Não Arrisca: +1d20 guardado", function () {
        var c = A4().consumirCacador(o);
        if (!c.ok) { UI.avisoAtencao(c.motivo); return false; }
        salvar(ctx);
        var novo = comMaisDados(r, 1, "Quem Não Arrisca");
        if (novo) { mostrarT(novo, "+1d20", [novo.notaExtra]); return; }
        var mais = EF() ? EF().expressaoDeDados(R().dadosDoTeste(o, p.chave).quantos + 1) : "";
        var re = D().dependente({ expressao: mais || dado, sigla: "", nome: p.nome, bonus: bonus.total, modificadores: [] });
        mostrarT(re, "+1d20", ["O teste tinha penalidade de dados: rolado de novo com +1d20 (" + (mais || "") + ")."]);
      });
    }

    if (org && org.chave === "influencerParanormal" && p.chave === "vontade") {
      var cr = A4().criaturasRegistradas(o);
      if (cr.length) unico("Registrar o Paranormal: +5 contra presença perturbadora…", function () {
        var escolha = cr[cr.length - 1].id;
        UI.modal({ titulo: "Contra qual criatura registrada?", conteudo: select(cr.map(function (c) { return { valor: c.id, rotulo: c.nome }; }), escolha, function (v) { escolha = v; }), botoes: [
          { rotulo: "Cancelar", classe: "r-botao--fantasma" },
          { rotulo: "+5", classe: "r-botao--principal", aoClicar: function (f) {
            var c = cr.filter(function (x) { return x.id === escolha; })[0];
            f();
            mostrarT(somarAoTeste(5, "Registrar o Paranormal"), "contra " + (c ? c.nome : "criatura registrada"), ["Só contra a presença perturbadora de " + (c ? c.nome : "uma criatura registrada") + " (AS4 p. 64)."]);
          } },
        ] });
      });
    }

    if (tem(o, "treinamentoMilitarizado") && ["agi", "for", "vig"].indexOf(atributo) >= 0 && A4().bonusDeExercicio(o) > 0) {
      unico("Exercício: +1d8 (" + A4().bonusDeExercicio(o) + " guardado[s])", function () {
        var u = A4().usarExercicio(o, r.id || "");
        if (!u.ok) { UI.avisoAtencao(u.motivo); return false; }
        var v = rolar("1d8");
        salvar(ctx);
        mostrarT(somarAoTeste(v, "Exercício (1d8)"), "exercício", ["+1d8 = " + v + ". Restam " + u.restam + " bônus (Treinamento Militarizado; um por rolagem)."]);
      });
    }

    if (tem(o, "ruidoBranco") && (p.chave === "investigacao" || p.chave === "percepcao")) {
      unico("Ruído Branco: +1d6 (ambiente movimentado)", function () {
        var v = rolar("1d6");
        mostrarT(somarAoTeste(v, "Ruído Branco (1d6)"), "Ruído Branco", ["+1d6 = " + v + ". Só num ambiente movimentado ou com muitas conversas paralelas (AS4 p. 66)."]);
      });
    }
    return saida;
  }

  /* =================================================================
     DANO DE ARMA
     ================================================================= */

  function ehArmaDeFogo(arma) {
    var a = dadosDoItem(arma).arma || {};
    return a.tipo === "fogo";
  }

  /* Chuva de Balas: antes de rolar o dano de uma arma de fogo, quantos
     pacotes sacrificar. Sem o poder (ou sem munição), segue direto. */
  function antesDoDano(ctx, arma, continuar) {
    var o = ordemDe(ctx);
    if (!A4() || !permitido(ctx) || !tem(o, "chuvaDeBalas") || !ehArmaDeFogo(arma) || !CS()) { continuar(0, []); return; }
    var com = CS().ligada(o, "contagemMunicao");
    var achada = CS().municaoDaArma(ctx.ficha.inventario, arma);
    var mun = achada.item;
    var pode = mun ? CS().pacotesSacrificaveis(mun, o, com) : 0;
    if (!pode) { continuar(0, []); return; }
    var n = 0;
    var opId2 = opId("chuva");
    UI.modal({ titulo: "Chuva de Balas", conteudo: bloco([
      linha("Antes de rolar o dano: sacrifique por completo pacotes de " + mun.nome + " para +2 dados de dano por pacote. Pacotes inteiros disponíveis: " + pode + "."),
      el("div.r-campo", {}, [el("span.r-rotulo", { texto: "Pacotes a sacrificar" }), select(Array.apply(null, { length: pode + 1 }).map(function (_, i) {
        return { valor: String(i), rotulo: i ? i + " (+" + (2 * i) + " dados)" : "Nenhum" };
      }), "0", function (v) { n = Number(v) || 0; })]),
    ]), botoes: [
      { rotulo: "Rolar sem sacrificar", classe: "r-botao--fantasma", aoClicar: function (f) { f(); continuar(0, []); } },
      { rotulo: "Sacrificar e rolar", classe: "r-botao--principal", aoClicar: function (f) {
        if (!n) { f(); continuar(0, []); return; }
        var r = CS().sacrificarPacotes(o, ctx.ficha.inventario, mun, n, com, opId2);
        if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
        f();
        ctx.alterou();
        continuar(r.repetido ? 0 : r.dados, ["Chuva de Balas: " + n + " pacote(s) de " + mun.nome + " sacrificado(s) — +" + (2 * n) + " dados de dano (AS4 p. 65)."]);
        ctx.redesenhar();
      } },
    ] });
  }

  function acoesNoDano(ctx, arma, r) {
    var o = ordemDe(ctx);
    if (!A4() || !permitido(ctx) || !tem(o, "treinamentoMilitarizado") || A4().bonusDeExercicio(o) <= 0) return [];
    var usado = false;
    return [{ rotulo: "Exercício: +1d8 no dano", aoClicar: function (cartao, b) {
      if (usado) return;
      var u = A4().usarExercicio(o, r.id || "");
      if (!u.ok) { UI.avisoAtencao(u.motivo); return; }
      usado = true; if (b) b.disabled = true;
      var v = rolar("1d8");
      salvar(ctx);
      global.RAMARolagens.mostrar(Object.assign({}, r, { total: r.total + v, parcelas: (r.parcelas || []).concat([{ rotulo: "Exercício (1d8)", valor: v }]) }),
        { nome: arma.nome + " · dano + exercício", notas: ["+1d8 = " + v + ". Restam " + u.restam + " bônus (Treinamento Militarizado; um por rolagem)."] });
    } }];
  }

  /* =================================================================
     EXPLOSIVOS, GRANADAS E O LANÇA-GRANADAS (p. 69-71)
     ================================================================= */

  function ehLancador(item) { return !!(item && item.tipo === "arma" && dadosDoItem(item).lancador); }
  function ehGranada(item) {
    var d = dadosDoItem(item);
    return (d.marcadores || []).indexOf("granada") >= 0 || /(^|\.)granada-/.test(String(item.origemCatalogoId || ""));
  }

  /* O que a ficha sabe do explosivo: do catálogo (pelo id) ou nada. */
  function explosivoDoCatalogo(cat, item) {
    var e = item && item.origemCatalogoId ? cat.porId[item.origemCatalogoId] : null;
    return e && e.explosivo ? e : null;
  }

  /* O contexto do uso: quem usa (Perito, Fogo Amigo) e o que pertence
     ao explosivo (autoria, às pressas, dobro dos dados). */
  function contextoDoUso(ctx, item) {
    var o = ordemDe(ctx);
    var d = dadosDoItem(item);
    var au = d.autoral || null;
    var meu = !!(au && au.autorId && au.autorId === ctx.personagemId);
    var perito = tem(o, "peritoEmExplosivos") || tem(o, "fogoAmigo");
    var fogo = tem(o, "fogoAmigo");
    return {
      autoral: au, meu: meu, apressado: !!(au && au.apressado),
      dobro: !!(au && (meu ? tem(o, "memoriaMuscular") : au.dobro)),
      perito: perito, fogo: fogo, dobrado: fogo && tem(o, "peritoEmExplosivos"),
      intelecto: R().atributo(o, "int"), passos: R().trilho(o).passos || 0,
    };
  }

  function carga(e, item, ctxUso, o) {
    var ex = e.explosivo;
    var dt = ex.dt ? A4().dtDoExplosivo(ex, { passos: ctxUso.passos, atributo: ex.dt.atributo ? R().atributo(o, ex.dt.atributo) : 0,
      perito: ctxUso.perito, intelecto: ctxUso.intelecto, dobrado: ctxUso.dobrado }) : { dt: null, partes: [] };
    var partes = (ex.partes || []).map(function (p) { return ctxUso.dobro ? A4().dobrarDados(p) : p; });
    return {
      nome: item ? item.nome : e.nome,
      partes: partes, dt: dt.dt, dtPartes: dt.partes,
      area: A4().areaDoExplosivo(ex, ctxUso.fogo),
      resistencia: ex.resistencia || "", efeito: ex.efeito || "",
      ctrlC: !!e.ctrlC,
      excluidos: A4().alvosExcluidos(ctxUso.intelecto, ctxUso.perito, ctxUso.dobrado),
    };
  }

  /* Rola as partes de dano de uma carga: { total, linhas }. */
  function rolarCarga(c) {
    var total = 0;
    var linhas = c.partes.map(function (p) {
      var m = /^(\S+)\s*(.*)$/.exec(p);
      var expr = m ? m[1] : p;
      var tipo = m ? m[2] : "";
      var v = rolar(expr);
      total += v;
      return { rotulo: expr + (tipo ? " " + tipo : ""), valor: v };
    });
    return { total: total, linhas: linhas };
  }

  function notasDaCarga(c, ctxUso) {
    var n = ["Área: " + c.area.texto + "."];
    if (c.dt !== null && c.dt !== undefined) n.push("Resistência: " + (c.resistencia || "veja o item") + " — DT " + c.dt + " (" + c.dtPartes.map(function (x) { return x.rotulo + " " + x.valor; }).join(" + ") + ").");
    if (c.efeito) n.push(c.efeito);
    if (c.excluidos) n.push("Perito em Explosivos: pode excluir até " + c.excluidos + " alvo(s) dos efeitos.");
    if (ctxUso.dobro) n.push("Memória Muscular: dobro dos dados de dano do explosivo autoral (números fixos não dobram).");
    n.push("Nada é aplicado sozinho: a mesa escolhe quem estava na área e aplica.");
    return n;
  }

  /* Uso de um explosivo (arremessar, detonar ou disparar). `via`:
     "maos" | "lancador". `alvo`: "ponto" | "ser". */
  function usarExplosivo(ctx, item, opcoes) {
    var o = ordemDe(ctx);
    var op = opcoes || {};
    comItens(function (cat) {
      var e = op.entrada || explosivoDoCatalogo(cat, item);
      if (!e) { UI.avisoAtencao(item.nome + " não tem dados de explosão no catálogo: use a descrição do item e role à mão."); return; }
      var d = op.dados || dadosDoItem(item);
      var mods = (d.modificacoes || []).map(function (m) { return m.catalogoId; });
      var ctxUso = op.ctxUso || contextoDoUso(ctx, item);
      var c = carga(e, item, ctxUso, o);
      var id = opId("expl");
      var adesiva = mods.indexOf("as4.mod.granada.adesiva") >= 0;
      var programada = mods.indexOf("as4.mod.granada.programada") >= 0;
      var dupla = (d.modificacoes || []).filter(function (m) { return m.catalogoId === "as4.mod.granada.dupla"; })[0];
      var segunda = dupla && dupla.escolhaId && cat.porId[dupla.escolhaId] && cat.porId[dupla.escolhaId].explosivo ? carga(cat.porId[dupla.escolhaId], null, ctxUso, o) : null;
      var acao = "padrao";
      var turnos = "1";
      var alvo = op.alvo || "ponto";
      var podeMovimento = ctxUso.meu && tem(o, "memoriaMuscular") && !!ctxUso.autoral;

      var partes = [
        linha(c.nome + " · " + c.area.texto + (c.dt !== null && c.dt !== undefined ? " · DT " + c.dt : "") + (op.via === "lancador" ? " · disparada pelo lança-granadas" : "")),
        ctxUso.apressado ? linha("Fabricado às pressas: 25% (1 a 25 em 1d100) de explodir na sua mão ao usar.", "t-aviso") : null,
        segunda ? linha("Dupla: o efeito de " + cat.porId[dupla.escolhaId].nome + " se ativa junto.") : null,
      ];
      if (op.via !== "lancador") {
        partes.push(el("div.r-campo", {}, [el("span.r-rotulo", { texto: "Ação" }), select([{ valor: "padrao", rotulo: "Ação padrão" }].concat(podeMovimento ? [{ valor: "movimento", rotulo: "Ação de movimento (Memória Muscular, 4 " + sigla(o) + ")" }] : []), acao, function (v) { acao = v; })]));
      }
      if (adesiva && op.via !== "lancador") {
        partes.push(el("div.r-campo", {}, [el("span.r-rotulo", { texto: "Adesiva: contra" }), select([{ valor: "ponto", rotulo: "Um ponto" }, { valor: "ser", rotulo: "Um ser (teste de ataque à distância)" }], alvo, function (v) { alvo = v; })]));
      }
      var turnosCampo = null;
      if (programada) { turnosCampo = campoTexto("Programada: explode em quantos turnos", "1", 2); partes.push(turnosCampo.caixa); }

      UI.modal({ titulo: (op.via === "lancador" ? "Disparar: " : "Usar explosivo: ") + c.nome, conteudo: bloco(partes), botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: op.via === "lancador" ? "Disparar" : "Usar", classe: "r-botao--principal", aoClicar: function (fechar) {
          if (acao === "movimento" && !gastar(ctx, 4)) return;
          fechar();
          /* A granada sai antes de qualquer rolagem: o uso é um só. */
          if (op.consumir) op.consumir(); else gastarUnidade(ctx, item);
          if (ctxUso.apressado) {
            var d100 = rolar("1d100");
            if (A4().explodiuNaMao(d100)) {
              var r0 = rolarCarga(c);
              A4().registrarExplosao(o, id, c.nome + ": explodiu na mão (1d100 = " + d100 + ").");
              salvar(ctx);
              mostrar({ ok: true, tipo: "dano", nome: c.nome, expressao: c.partes.join(" + "), total: r0.total, parcelas: r0.linhas },
                c.nome + " · explodiu na mão!", ["O Calor do Momento: 1d100 = " + d100 + " (1 a 25). A explosão é no seu espaço."].concat(notasDaCarga(c, ctxUso)));
              return;
            }
          }
          if (programada) {
            var t = Math.max(1, Math.min(99, parseInt(turnosCampo.entrada.value, 10) || 1));
            var tm = A4().criarTimer(o, c.nome + " (" + c.area.texto + ")", t);
            tm.timer.nota = JSON.stringify({ partes: c.partes, dt: c.dt, area: c.area.texto, resistencia: c.resistencia, efeito: c.efeito, ctrlC: c.ctrlC }).slice(0, 300);
            A4().registrarExplosao(o, id, c.nome + ": programada para " + t + " turno(s).");
            salvar(ctx);
            UI.aviso(c.nome + " programada: explode em " + t + " turno(s). Acompanhe no painel do Arquivos Secretos 4 (aba Habilidades).", { duracao: 8000 });
            return;
          }
          if (alvo === "ser" && adesiva) {
            if (global.RAMAOrdemRolarPericia) global.RAMAOrdemRolarPericia(ctx, "pontaria", "Ataque com granada adesiva");
            UI.modal({ titulo: "Adesiva: o ataque", exigeDecisao: true, conteudo: linha("Compare o teste de Pontaria com a Defesa do alvo."), botoes: [
              { rotulo: "Errou (gruda no espaço)", aoClicar: function (f) { f(); explodir(c, segunda, ["Adesiva: errou — a granada gruda no espaço onde o ser está."]); } },
              { rotulo: "Acertou (gruda no ser)", classe: "r-botao--principal", aoClicar: function (f) { f(); explodir(c, segunda, ["Adesiva: acertou — gruda no ser, que falha automaticamente em qualquer teste de resistência contra a granada.", "Efeito não instantâneo: a granada se move com o alvo até ele gastar uma ação padrão para removê-la."]); } },
            ] });
            return;
          }
          explodir(c, segunda, op.notas || []);
        } },
      ] });

      function explodir(carga1, carga2, notas) {
        var linhas = [];
        var total = 0;
        var cadeia = [];
        var r1 = rolarCarga(carga1);
        total += r1.total;
        linhas = linhas.concat(r1.linhas.map(function (x) { return { rotulo: "Explosão 1 · " + x.rotulo, valor: x.valor }; }));
        if (carga1.ctrlC) {
          /* Ctrl+C Ctrl+V: d4 depois de cada explosão; par gera outra
             (dano próprio), até a quarta ou o primeiro ímpar. */
          var n = 1;
          while (n < 4) {
            var d4 = rolar("1d4");
            cadeia.push(d4);
            if (d4 % 2 !== 0) break;
            n += 1;
            var rx = rolarCarga(carga1);
            linhas = linhas.concat(rx.linhas.map(function (x) { return { rotulo: "Explosão " + n + " · " + x.rotulo, valor: x.valor }; }));
          }
        }
        var extras = [];
        if (carga2) {
          var r2 = rolarCarga(carga2);
          linhas = linhas.concat(r2.linhas.map(function (x) { return { rotulo: "Dupla · " + x.rotulo, valor: x.valor }; }));
          extras = ["Dupla — " + carga2.nome + ": " + (carga2.resistencia || "") + (carga2.dt ? " (DT " + carga2.dt + ")" : "") + (carga2.efeito ? ". " + carga2.efeito : "")];
        }
        var notasCtrl = carga1.ctrlC ? ["Ctrl+C Ctrl+V: d4 = " + (cadeia.join(", ") || "—") + " → " + (cadeia.length ? (cadeia[cadeia.length - 1] % 2 !== 0 ? "ímpar, parou" : "quarta explosão") : "") + ". Cada explosão nova é em outro espaço à sua escolha dentro da área da original; cada uma tem o próprio dano (por explosão, não somado) e as cópias não são itens."] : [];
        A4().registrarExplosao(o, id, carga1.nome + ": " + (carga1.ctrlC ? (1 + cadeia.filter(function (v, i) { return v % 2 === 0 && i < 3; }).length) + " explosão(ões)" : "explodiu") + (carga2 ? " + efeito duplo" : "") + ".");
        salvar(ctx);
        mostrar({ ok: true, tipo: "dano", nome: carga1.nome, expressao: carga1.partes.join(" + ") || "efeito", total: carga1.ctrlC ? r1.total : linhas.reduce(function (s, x) { return s + x.valor; }, 0), parcelas: linhas.length ? linhas : [{ rotulo: "sem dano", valor: 0 }] },
          carga1.nome + (op.via === "lancador" ? " · disparo" : " · explosão"), notas.concat(notasCtrl, notasDaCarga(carga1, ctxUso), extras));
      }
    });
  }

  function explodirTimer(ctx, t) {
    var o = ordemDe(ctx);
    var info = {};
    try { info = JSON.parse(t.nota || "{}"); } catch (e) { info = {}; }
    var partes = Array.isArray(info.partes) ? info.partes : [];
    var r = rolarCarga({ partes: partes });
    A4().resolverTimer(o, t.id, "explodiu");
    salvar(ctx);
    mostrar({ ok: true, tipo: "dano", nome: t.nome, expressao: partes.join(" + ") || "efeito", total: r.total, parcelas: r.linhas.length ? r.linhas : [{ rotulo: "sem dano", valor: 0 }] },
      t.nome + " · explodiu (programada)", ["Área: " + (info.area || "veja o item") + ".", info.dt ? "DT " + info.dt + " — " + (info.resistencia || "") : "", info.efeito || "",
        info.ctrlC ? "Ctrl+C Ctrl+V: role a cadeia de d4 na mesa (o temporizador guardou só a primeira explosão)." : "", "Nada é aplicado sozinho."].filter(Boolean));
  }

  /* --- lança-granadas --- */
  function carregar(ctx, lancador) {
    var o = ordemDe(ctx);
    var d = dadosDoItem(lancador);
    var lan = d.lancador;
    if (lan.carregadas.length >= lan.capacidade) { UI.avisoAtencao("O lançador já está cheio (" + lan.capacidade + ")."); return; }
    var granadas = itens(ctx).filter(function (i) { return i !== lancador && ehGranada(i); });
    var de40 = granadas.filter(function (i) { return dadosDoItem(i).modeloGranada === "40mm"; });
    if (!de40.length) { UI.avisoAtencao(granadas.length ? "Só granadas de modelo 40 mm entram no lançador (as arremessáveis não). Adicione o modelo 40 mm pela biblioteca." : "Não há granadas no inventário."); return; }
    var escolha = de40[0].id;
    UI.modal({ titulo: "Recarregar o lançador", conteudo: bloco([
      linha("Uma granada 40 mm por ação de movimento. Carregadas: " + lan.carregadas.length + " de " + lan.capacidade + "."),
      select(de40.map(function (i) { return { valor: i.id, rotulo: i.nome + " ×" + (dadosDoItem(i).quantidade || 1) }; }), escolha, function (v) { escolha = v; }),
    ]), botoes: [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Carregar 1", classe: "r-botao--principal", aoClicar: function (fechar) {
        var g = itens(ctx).filter(function (i) { return i.id === escolha; })[0];
        if (!g) return;
        var dg = dadosDoItem(g);
        if (!lancador.ordem.lancador) lancador.ordem.lancador = { capacidade: lan.capacidade, carregadas: [] };
        var alvo = lancador.ordem.lancador;
        if (alvo.carregadas.length >= alvo.capacidade) { UI.avisoAtencao("O lançador já está cheio."); return; }
        alvo.carregadas.push({
          id: "g-" + String(U.uuid()).replace(/[^A-Za-z0-9]/g, "").slice(0, 16), nome: g.nome,
          origemCatalogoId: g.origemCatalogoId || undefined, espacos: I() ? I().espacosDoItem(g).unitario : 1,
          modificacoes: JSON.parse(JSON.stringify(dg.modificacoes || [])), autoral: dg.autoral ? JSON.parse(JSON.stringify(dg.autoral)) : undefined,
        });
        gastarUnidade(ctx, g);
        fechar(); salvar(ctx);
        UI.aviso(g.nome + " carregada (" + alvo.carregadas.length + " de " + alvo.capacidade + "). Ação de movimento.");
      } },
    ] });
  }

  function descarregar(ctx, lancador) {
    var lan = lancador.ordem && lancador.ordem.lancador;
    if (!lan || !lan.carregadas.length) return;
    var g = lan.carregadas.pop();
    var item = F().criarItem("item", { nome: g.nome, origemCatalogoId: g.origemCatalogoId || "", categoria: "Geral",
      ordem: { quantidade: 1, espacos: g.espacos, modeloGranada: "40mm", marcadores: ["granada"], modificacoes: g.modificacoes || [], autoral: g.autoral } });
    item.adicionadoEm = U.agoraISO();
    ctx.ficha.inventario.itens.push(item);
    salvar(ctx);
    UI.aviso(g.nome + " tirada do lançador e devolvida ao inventário.");
  }

  /* O "Atacar" do lança-granadas: escolhe a granada carregada e se o
     disparo é contra um ser (ataque contra a Defesa; o alvo atingido
     não faz teste de resistência) ou contra um ponto (sem ataque). */
  function dispararLancador(ctx, lancador) {
    var o = ordemDe(ctx);
    var lan = dadosDoItem(lancador).lancador;
    if (!lan.carregadas.length) { UI.avisoAtencao("O lançador está descarregado: recarregue (ação de movimento)."); return; }
    var escolha = lan.carregadas[lan.carregadas.length - 1].id;
    var alvo = "ser";
    UI.modal({ titulo: "Disparar o lança-granadas", conteudo: bloco([
      el("div.r-campo", {}, [el("span.r-rotulo", { texto: "Granada carregada" }), select(lan.carregadas.map(function (g) { return { valor: g.id, rotulo: g.nome + ((g.modificacoes || []).length ? " (" + g.modificacoes.map(function (m) { return m.nome; }).join(", ") + ")" : "") }; }), escolha, function (v) { escolha = v; })]),
      el("div.r-campo", {}, [el("span.r-rotulo", { texto: "Contra" }), select([{ valor: "ser", rotulo: "Um ser (ataque contra a Defesa)" }, { valor: "ponto", rotulo: "Um ponto em alcance longo (sem ataque)" }], alvo, function (v) { alvo = v; })]),
    ]), botoes: [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Continuar", classe: "r-botao--principal", aoClicar: function (fechar) {
        fechar();
        var g = lancador.ordem.lancador.carregadas.filter(function (x) { return x.id === escolha; })[0];
        if (!g) return;
        var falso = { id: g.id, nome: g.nome, tipo: "item", origemCatalogoId: g.origemCatalogoId, ordem: { modificacoes: g.modificacoes || [], autoral: g.autoral, modeloGranada: "40mm" } };
        var consumir = function () { lancador.ordem.lancador.carregadas = lancador.ordem.lancador.carregadas.filter(function (x) { return x.id !== g.id; }); };
        if (alvo === "ponto") {
          usarExplosivo(ctx, falso, { via: "lancador", consumir: consumir, notas: ["Contra um ponto: sem teste de ataque e sem chance de errar; ninguém é atingido diretamente — todos na área fazem o teste de resistência."] });
          return;
        }
        var ef = R().armaEfetiva(o, ctx.ficha.inventario, lancador, ctx.ficha.pericias);
        if (!ef.pericia) { UI.avisoErro(ef.avisos[0] || "Escolha a perícia de ataque do lançador no modo edição."); return; }
        var r = D().dependente({ expressao: ef.dado, sigla: "", nome: lancador.nome, bonus: ef.ataque.total, modificadores: [] });
        if (!r || !r.ok) { UI.avisoErro("O teste de ataque do lançador não é válido."); return; }
        global.RAMARolagens.mostrar(r, { nome: lancador.nome + " · ataque (" + g.nome + ")", notas: ["Contra a Defesa do alvo. Acertando, o alvo atingido diretamente NÃO faz teste de resistência; os outros seres no raio fazem."].concat(ef.proficiencia && ef.proficiencia.proficiente === false ? [ef.proficiencia.texto] : []),
          acoes: [
            { rotulo: "Acertou: rolar " + g.nome, aoClicar: function (c2, b) { if (b) b.disabled = true; usarExplosivo(ctx, falso, { via: "lancador", consumir: consumir, notas: ["Acertou: o alvo atingido sofre o dano sem teste de resistência; os demais no raio fazem o teste."] }); } },
            { rotulo: "Errou", aoClicar: function (c2, b) { if (b) b.disabled = true; consumir(); salvar(ctx); UI.aviso("A granada foi disparada e errou o alvo. O livro não diz onde ela cai: o mestre decide."); } },
          ] });
      } },
    ] });
  }

  function interceptaAtaque(ctx, arma) {
    if (!A4() || !ehLancador(arma)) return false;
    if (!permitido(ctx)) return true;
    dispararLancador(ctx, arma);
    return true;
  }

  function opcoesDoItem(ctx, item) {
    if (!A4() || !permitido(ctx)) return [];
    var o = ordemDe(ctx);
    var l = [];
    var d = dadosDoItem(item);
    if (ehLancador(item)) {
      l.push({ rotulo: "Disparar (" + d.lancador.carregadas.length + " de " + d.lancador.capacidade + " carregadas)…", aoClicar: function () { dispararLancador(ctx, item); } });
      l.push({ rotulo: "Recarregar 1 granada 40 mm (movimento)…", aoClicar: function () { carregar(ctx, item); } });
      if (d.lancador.carregadas.length) l.push({ rotulo: "Tirar a última granada", aoClicar: function () { descarregar(ctx, item); } });
    }
    var explosivo = ehGranada(item) || /\.(geral|amaldicoado)\.(dinamite|explosivo-plastico|galao-vermelho|mina-antipessoal)/.test(String(item.origemCatalogoId || "")) || !!d.autoral;
    if (explosivo) {
      if (d.modeloGranada === "40mm") l.push({ rotulo: "Granada 40 mm: só pelo lança-granadas", aoClicar: function () { UI.aviso("Granadas 40 mm não funcionam arremessadas — carregue num lança-granadas (AS4 p. 71)."); } });
      else l.push({ rotulo: "Usar explosivo (arremessar / detonar)…", aoClicar: function () { usarExplosivo(ctx, item, { via: "maos" }); } });
    }
    var focos = A4().dados(o).foco.itens;
    if (focos.indexOf(item.id) >= 0) {
      if (d.empunhada) l.push({ rotulo: "Guardar (Foco Gravitacional: 0 espaços)", aoClicar: function () { delete item.ordem.empunhada; salvar(ctx); } });
      else l.push({ rotulo: "Empunhar (Foco Gravitacional: 1d100)", aoClicar: function () {
        var v = rolar("1d100");
        if (A4().focoVoou(v)) {
          salvar(ctx);
          UI.avisoAtencao("1d100 = " + v + ": " + item.nome + " sai voando descontroladamente e para num espaço em alcance curto à escolha do mestre.", { duracao: 9000 });
          return;
        }
        if (!item.ordem) item.ordem = {};
        item.ordem.empunhada = true;
        salvar(ctx);
        UI.aviso("1d100 = " + v + ": " + item.nome + " empunhado (volta a ocupar espaço).");
      } });
    }
    if (tem(o, "memoriaMuscular") && d.autoral && d.autoral.autorId === ctx.personagemId) {
      l.push({ rotulo: "Memória Muscular: qualquer pessoa empunha este explosivo como ação livre", aoClicar: function () { UI.aviso("Explosivo autoral seu: qualquer pessoa pode empunhá-lo como ação livre (AS4 p. 69)."); } });
    }
    return l;
  }

  /* O que o AS4 guarda no item, nos detalhes dele. */
  function observacoesDoItem(ctx, item) {
    if (!A4()) return [];
    var o = ordemDe(ctx);
    var d = dadosDoItem(item);
    var l = [];
    if (d.modeloGranada === "40mm") l.push(["Modelo", "40 mm: só funciona disparada por um lança-granadas (AS4 p. 71)."]);
    if (d.autoral) l.push(["Autoral", "Feito por " + (d.autoral.autor || "um granadeiro") + (d.autoral.missao ? " (missão " + d.autoral.missao + ")" : "") +
      (d.autoral.apressado ? " — às pressas: 25% de explodir na mão ao usar." : ".")]);
    if (d.foraDoLimite) l.push(["Limite de itens", "Não conta (Meus Bebês); ocupa espaço normalmente."]);
    if (d.lancador) l.push(["Carregadas", d.lancador.carregadas.length + " de " + d.lancador.capacidade +
      (d.lancador.carregadas.length ? ": " + d.lancador.carregadas.map(function (g) { return g.nome; }).join(", ") : "") + "."]);
    if (d.quaseNovo) l.push(["Quase Novo", "+" + d.quaseNovo.pvExtra + " PV adicionais (manutenção no interlúdio " + d.quaseNovo.interludio + ")."]);
    (d.modificacoes || []).forEach(function (m) {
      if (m.temporaria === "interludio") l.push(["Temporária", m.nome + ": até o início do próximo interlúdio (Quase Novo)."]);
    });
    if (A4().dados(o).foco.itens.indexOf(item.id) >= 0) l.push(["Foco Gravitacional", d.empunhada ? "Empunhado: ocupa espaço." : "Guardado: ocupa 0 espaços (uma unidade)."]);
    return l;
  }

  /* =================================================================
     RITUAL E INTERLÚDIO
     ================================================================= */

  function ajusteDoRitual(ctx, elemento) {
    if (!A4()) return { menosPe: 0, notas: [] };
    var o = ordemDe(ctx);
    var n = tem(o, "exploradorDaNevoa") ? A4().reducaoDoExplorador(o) : 0;
    return { menosPe: n, notas: n ? ["Explorador da Névoa: Membrana danificada ou pior nesta cena — 1 PE a menos (AS4 p. 66)."] : [] };
  }

  /* Chamado dentro da gravação do "Novo interlúdio": devolve o que saiu. */
  function aoNovoInterludio(ctx) {
    if (!A4()) return [];
    return A4().tirarVencidas(ordemDe(ctx), ctx.ficha.inventario) || [];
  }

  /* O ritual Backup: o cartão do ritual ganha o registro do chamariz. */
  function controlesDoRitual(ctx, ritual) {
    if (!A4() || !ritual || ritual.origemCatalogoId !== "as4.ritual.backup" || !permitido(ctx)) return null;
    permitidoGlobal = true;
    var bk = A4().backupAtivo(ordemDe(ctx));
    return bk ? linha("Chamariz ativo: controles no painel do Arquivos Secretos 4 (aba Habilidades).") : botao("Registrar o chamariz (depois de conjurar)…", function () { criarBackup(ctx); });
  }

  global.RAMAFichaArquivo4 = {
    painel: painel,
    controles: controles,
    controlesDeOrigem: controlesDeOrigem,
    controlesDoRitual: controlesDoRitual,
    acoesNoTeste: acoesNoTeste,
    antesDoDano: antesDoDano,
    acoesNoDano: acoesNoDano,
    opcoesDoItem: opcoesDoItem,
    observacoesDoItem: observacoesDoItem,
    interceptaAtaque: interceptaAtaque,
    ajusteDoRitual: ajusteDoRitual,
    aoNovoInterludio: aoNovoInterludio,
    usarExplosivo: usarExplosivo,
  };
})(window);
