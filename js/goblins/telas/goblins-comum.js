/* =====================================================================
   R.A.M.A. — Malditos Goblins · o que as telas compartilham (v6.0)
   ---------------------------------------------------------------------
   A tela não tem regra própria: toda conta, validação e efeito vem do
   motor (js/goblins/*). Aqui ficam as peças que a ficha, a criação e o
   Covil usam:

     operar(ctx, fn)        o ÚNICO caminho de uma ação até a ficha: uma
                            operação com id (R.aplicarOperacao) — clique
                            repetido não aplica duas vezes, e uma falha
                            no meio não deixa rastro
     rolagem(ctx, fazer)    roda uma ação que rola: pergunta o que fazer
                            com uma parada de 0 dados (o livro não diz),
                            mostra os dados, as explosões, a composição e
                            a interpretação, e — com explosões manuais —
                            espera a pessoa rolar cada uma ("pode rolar")
     dados(r)               os dados, com forma e texto (nunca só cor):
                            ★ no 6, ✦ no dado de explosão
     regra(chave)           o botão "p. X" ao lado da ação, que abre a
                            regra com fonte e página
     narrar(eventos)        os eventos do motor em frases curtas

   A ficha numa campanha (RAMAGoblinsMesaDaFicha): lê o Covil (para os
   alvos) e manda ao servidor as ações que tocam OUTRA ficha ou a mesa.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el;
  function C() { return global.RAMAGoblinsCatalogo; }
  function D() { return global.RAMAGoblinsDados; }
  function R() { return global.RAMAGoblins; }
  function UI() { return global.RAMAUI; }

  function nomeAtr(k) { return (C().ATRIBUTOS.filter(function (a) { return a.chave === k; })[0] || {}).nome || k; }
  function botao(texto, aoClicar, opcoes) {
    var o = opcoes || {};
    return el("button.r-botao.r-botao--mini" + (o.classe ? "." + o.classe : ""), { type: "button", texto: texto, disabled: !!o.motivo, title: o.motivo || o.dica || "", "aria-label": o.rotulo || null, onclick: aoClicar });
  }

  /* ---------------------------------------------------------------
     EVENTOS → FRASES
     --------------------------------------------------------------- */
  var FRASES = {
    ferimentos: function (e) { return e.valor + " ferimento(s)" + (e.notas && e.notas.length ? " (" + e.notas.join("; ") + ")" : ""); },
    cura: function (e) { return e.valor ? "−" + e.valor + " ferimento(s)" + (e.motivo ? " (" + e.motivo + ")" : "") : ""; },
    fim: function (e) { return R().SITUACOES[e.situacao] + (e.causa ? ": " + e.causa : ""); },
    efeito: function (e) { return e.nome; },
    efeitoExpirou: function (e) { return e.nome + " acabou"; },
    efeitoEncerrado: function (e) { return e.nome + " encerrado"; },
    nivel: function (e) { return "Nível " + e.nivel + (e.tecnica ? ": " + e.tecnica : ""); },
    progressao: function (e) { return "Progressão: rolou " + (e.dados || []).join(", ") + (e.subiu ? " — subiu!" : ""); },
    epicoPendente: function () { return "Nível 4! Níveis Épicos: escolha outra ocupação"; },
    medo: function (e) { return "Medo " + e.de + " → " + e.para; },
    sobrenatural: function (e) { return "Evento sobrenatural: " + (e.resultado && e.resultado.texto); },
    vozSalvou: function () { return "Todos os dados em 1 — a Voz Goblin salvou!"; },
    bloqueio: function (e) { return e.item + " absorveu " + e.absorveu; },
    sorte: function (e) { return "Sorte: " + e.item + " destruído, dano ignorado"; },
    explosaoDeArea: function (e) { return e.item + " explodiu: " + e.aneis.map(function (a) { return a.ferimentos + " em " + a.alcance; }).join(", "); },
    sorteio: function (e) { return e.nome + ": " + (typeof e.resultado === "string" ? e.resultado : JSON.stringify(e.resultado)); },
    tePego: function (e) { return e.estudante + ": " + e.resultado; },
    hortaPronta: function (e) { return "Horta de " + e.planta + " pronta para colher"; },
    peteca: function (e) { return "Peteca: " + e.dados.join("") + (e.saiu ? " — Habilidade +1 hoje!" : ""); },
    novoDia: function (e) { return "Dia " + e.dia; },
    acesa: function (e) { return e.item + ": explode em " + e.turnos + " turnos"; },
    necronomicon: function (e) { return e.texto; },
    narrativo: function (e) { return e.texto; },
    recarga: function (e) { return "Recarregou " + e.item; },
    municao: function (e) { return e.item + ": munição " + e.atual; },
    desmaiou: function (e) { return e.nome + " desmaiou"; },
    bombaRelogio: function (e) { return "Bomba-relógio: " + e.dados.join("") + (e.explodiu ? " — BUM!" : ""); },
    pocao: function (e) { return "Poção " + e.cor + ": " + e.texto; },
    romance: function (e) { return "Romance com " + e.nome; },
    peixe: function (e) { return "Pescou " + e.nome; },
  };
  var GRAVES = ["fim", "epicoPendente", "explosaoDeArea", "sobrenatural"];

  function narrar(eventos, opcoes) {
    var frases = (eventos || []).map(function (e) { var f = FRASES[e.tipo]; try { return f ? f(e) : ""; } catch (x) { return ""; } }).filter(Boolean);
    if (frases.length && !(opcoes && opcoes.silencioso)) {
      var grave = (eventos || []).some(function (e) { return GRAVES.indexOf(e.tipo) >= 0; });
      UI().aviso(frases.slice(0, 4).join(" · ") + (frases.length > 4 ? " …" : ""), { tipo: grave ? "atencao" : "info" });
    }
    return frases;
  }

  /* ---------------------------------------------------------------
     OPERAR
     --------------------------------------------------------------- */
  function rolador(faces) { return global.RAMADados.rolar("1d" + faces).rolagens[0]; }
  function novaOperacao() { return global.RAMAApi ? global.RAMAApi.novaOperacao() : "op-" + U.uuid(); }

  /* fn(o) → { ok, motivo?, eventos } ; aplicada uma vez por id. */
  function operar(ctx, fn, opcoes) {
    var op = opcoes || {};
    if (!ctx.podeEditar()) { UI().avisoAtencao("Esta ficha está em modo de leitura."); return { ok: false }; }
    var o = ctx.ficha.goblins;
    var r = R().aplicarOperacao(o, op.opId || novaOperacao(), fn);
    if (r.ok === false) { if (r.motivo) UI().avisoAtencao(r.motivo); return r; }
    if (!op.silencioso) narrar(r.eventos);
    ctx.alterou();
    ctx.atualizar(op.regioes || ["bloco", "conteudo"]);
    return r;
  }

  /* ---------------------------------------------------------------
     DADOS NA TELA
     --------------------------------------------------------------- */
  function dadoVisual(d) {
    var hit = d.face >= D().LIMIAR;
    var classe = ["gob-dado", hit ? "gob-dado--hit" : "", d.face === 6 ? "gob-dado--seis" : "", d.face === 1 ? "gob-dado--um" : "", d.origem === "explosao" ? "gob-dado--explosao" : ""].filter(Boolean).join(" ");
    var simbolo = d.face === 6 ? "★" : d.origem === "explosao" ? "✦" : "";
    var rot = D().rotuloDoDado(d);
    return el("span", { class: classe, role: "img", "aria-label": rot, title: rot }, [
      el("span.gob-dado__face", { texto: String(d.face) }),
      simbolo ? el("span.gob-dado__simbolo", { "aria-hidden": "true", texto: simbolo }) : null,
    ]);
  }

  function dados(r) {
    if (!r || !r.dados.length) return el("p.t-mini", { texto: r && r.zeroComoFalha ? "Nenhum dado rolado (parada sem dados, contada como falha)." : "Nenhum dado." });
    return el("div.gob-dados", { role: "group", "aria-label": "Dados rolados" }, r.dados.map(dadoVisual));
  }

  function composicaoTexto(comp) { return (comp || []).map(function (c) { return c.fonte + " " + (c.valor >= 0 ? "+" : "") + c.valor; }).join(" · "); }

  function rotuloDaRolagem(r) {
    var c = r.classificacao;
    if (r.necessarios !== null && r.necessarios !== undefined && c.rotuloNecessarios) return c.rotuloNecessarios;
    return c.rotulo;
  }

  /* Pelo funil de sempre: cartão + histórico da campanha. */
  function mostrarRolagem(r, extra) {
    if (!global.RAMARolagens || !r || r.lacuna) return;
    var c = r.classificacao;
    var notas = [];
    if (c.explosoes) notas.push(c.explosoes + " dado(s) de explosão (✦).");
    if (r.explosoesRecusadas) notas.push(r.explosoesRecusadas + " explosão(ões) não rolada(s), por escolha.");
    if (c.goblinExplode) notas.push("Todos os dados em 1: o goblin EXPLODIU.");
    if (c.vozSalvou) notas.push("Todos os dados em 1, mas a Voz Goblin salvou.");
    if (r.casaUmDado) notas.push("Parada sem dados: rolou 1 dado por regra da casa.");
    (extra && extra.notas || []).forEach(function (n) { notas.push(n); });
    global.RAMARolagens.mostrar(D().paraCartao(r), { nome: (r.rotulo || "Teste") + " · " + rotuloDaRolagem(r), critico: c.hits >= 3 && r.tipo === "teste", notas: notas });
  }

  /* ---------------------------------------------------------------
     A ROLAGEM: lacuna, explosões manuais, resultado
     --------------------------------------------------------------- */

  /* fazer(o, seZero) → resultado do motor (com .rolagem). Chama a
     operação; numa parada de 0 dados, pergunta e refaz. Depois abre o
     resultado. opcoes: { titulo, depois(res), acoes(res) → botões,
     notas(res) → textos } */
  function rolagem(ctx, fazer, opcoes) {
    var op = opcoes || {};
    function executar(seZero) {
      var res = operar(ctx, function (o) { return fazer(o, seZero); }, { silencioso: true });
      if (!res || res.ok === false) return;
      if (res.lacuna) { perguntarZero(executar); return; }
      narrar(res.eventos);
      if (res.rolagem) janelaDoResultado(ctx, res, op);
      else if (op.depois) op.depois(res);
    }
    executar(undefined);
  }

  function perguntarZero(continuar) {
    var m = UI().modal({
      titulo: "Parada sem dados",
      conteudo: [
        el("p", { texto: "Com os modificadores, esta rolagem ficou com 0 dados. O livro não diz o que acontece." }),
        el("p.t-mini", { texto: "Decida com a mesa. Nenhuma das opções explode o goblin." }),
      ],
      botoes: [
        { rotulo: "Contar como falha", classe: "r-botao--fantasma", aoClicar: function (f) { f(); continuar("falha"); } },
        { rotulo: "Rolar 1 dado (regra da casa)", classe: "r-botao--principal", aoClicar: function (f) { f(); continuar("umDado"); } },
      ],
    });
    return m;
  }

  function janelaDoResultado(ctx, res, op) {
    var r = res.rolagem;
    var area = el("div.gob-resultado");
    var mostrada = false;
    function concluir() {
      if (!r.concluida) operar(ctx, function (o) { return R().continuarRolagem(o, r, "parar", rolador); });
      if (!mostrada) { mostrada = true; mostrarRolagem(r, { notas: op.notas ? op.notas(res) : [] }); }
      if (op.depois) op.depois(res);
    }
    function desenhar() {
      var c = r.classificacao;
      var extras = op.acoes ? op.acoes(res, m) : [];
      U.trocar(area, [
        el("p.gob-resultado__parada", { texto: r.parada + " dado(s)" + (r.composicao && r.composicao.length ? " · " + composicaoTexto(r.composicao) : "") }),
        dados(r),
        el("p.gob-legenda.t-mini", { texto: "Hit em 4, 5 ou 6. ★ é um 6: além do hit, rola mais um dado. ✦ é um dado de explosão." }),
        el("p.gob-resultado__total", { role: "status" }, [
          el("strong", { texto: c.hits + " hit(s)" }),
          el("span", { texto: " — " + rotuloDaRolagem(r) }),
        ]),
        c.goblinExplode ? el("p.gob-alerta", { role: "alert", texto: "Todos os dados caíram em 1: o goblin explodiu em milhões de pedacinhos!" }) : null,
        c.vozSalvou ? el("p.gob-aviso", { texto: "Todos os dados em 1 — mas a Voz Goblin está valendo: nada de explosão." }) : null,
        r.explosoesPendentes ? el("div.faixa", {}, [
          el("span.t-mini", { texto: r.explosoesPendentes + " seis esperando: pode rolar mais um dado." }),
          botao("Rolar mais um dado", function () { operar(ctx, function (o) { return R().continuarRolagem(o, r, "explodir", rolador); }); desenhar(); }),
          botao("Parar aqui", function () { operar(ctx, function (o) { return R().continuarRolagem(o, r, "parar", rolador); }); desenhar(); }, { classe: "r-botao--fantasma" }),
        ]) : null,
        (op.notas ? op.notas(res) : []).length ? el("ul.gob-notas", {}, op.notas(res).map(function (n) { return el("li", { texto: n }); })) : null,
        r.concluida && extras.length ? el("div.faixa.gob-resultado__acoes", {}, extras) : null,
      ]);
    }
    var m = UI().modal({
      titulo: op.titulo || r.rotulo || "Rolagem",
      classe: "gob-janela-rolagem",
      conteudo: [area],
      aoFechar: concluir,
      fundoFecha: true,
      botoes: [{ rotulo: "Fechar", classe: "r-botao--principal" }],
    });
    desenhar();
    return m;
  }

  /* ---------------------------------------------------------------
     REGRAS PARA CONSULTA
     --------------------------------------------------------------- */
  var TIPOS = { basica: "Regra básica", opcional: "Regra opcional", adaptacao: "Adaptação" };

  function consulta(chave) {
    var rg = C().REGRAS[chave];
    if (!rg) return null;
    return UI().modal({
      titulo: rg.nome,
      classe: "gob-consulta",
      fundoFecha: true,
      conteudo: [
        el("p.t-mini", { texto: TIPOS[rg.tipo] + " · " + C().referencia(rg.pagina) }),
        el("p", { texto: rg.texto }),
      ],
    });
  }

  /* O botão pequeno ao lado da ação: "p. 15". */
  function regra(chave, rotulo) {
    var rg = C().REGRAS[chave];
    if (!rg) return null;
    return el("button.gob-regra", { type: "button", texto: (rotulo ? rotulo + " · " : "") + "p. " + rg.pagina, title: "Regra: " + rg.nome + " (" + C().referencia(rg.pagina) + ")", "aria-label": "Consultar a regra " + rg.nome + ", página " + rg.pagina, onclick: function () { consulta(chave); } });
  }

  function fonte(pagina, texto) { return el("span.gob-fonte", { texto: (texto ? texto + " · " : "") + "p. " + pagina, title: C().referencia(pagina) }); }

  /* ---------------------------------------------------------------
     A FICHA NUMA CAMPANHA
     --------------------------------------------------------------- */
  var lido = { campanhaId: "", dados: null, erro: "", tentado: false, carregando: null };
  function campanhaDe(ctx) { return ctx && ctx.ficha && ctx.ficha.campanhaId ? String(ctx.ficha.campanhaId) : ""; }

  function carregar(ctx, forcar) {
    var cid = campanhaDe(ctx);
    if (!cid || !global.RAMAApi || !global.RAMAApi.lerGoblins) return Promise.resolve(null);
    if (lido.carregando && lido.campanhaId === cid) return lido.carregando;
    if (!forcar && lido.tentado && lido.campanhaId === cid) return Promise.resolve(lido.dados);
    lido.campanhaId = cid; lido.tentado = true;
    lido.carregando = global.RAMAApi.lerGoblins(cid, { segundoPlano: true }).then(function (r) {
      lido.carregando = null;
      if (!r || !r.ok) { lido.dados = null; lido.erro = (r && r.erro) || "falha"; return null; }
      lido.dados = r.dados; lido.erro = "";
      ctx.atualizar(["bloco", "conteudo"]);
      return lido.dados;
    }, function () { lido.carregando = null; lido.dados = null; lido.erro = "sem_conexao"; return null; });
    return lido.carregando;
  }

  function naMesa(ctx) {
    var cid = campanhaDe(ctx);
    if (!cid) return false;
    if (!lido.tentado || lido.campanhaId !== cid) carregar(ctx);
    return !!(lido.dados && lido.campanhaId === cid);
  }
  function dadosDaMesa(ctx) { return naMesa(ctx) ? lido.dados : null; }
  function estadoDaMesa(ctx) { var d = dadosDaMesa(ctx); return d ? (d.estado || d.vista) : null; }

  /* Os inimigos de pé no combate do Covil (para escolher o alvo). */
  function alvosDaMesa(ctx) {
    var e = estadoDaMesa(ctx);
    if (!e || !e.combate) return [];
    return e.combate.participantes.filter(function (p) { return p.tipo !== "pc" && !p.derrotado; });
  }
  /* Os outros goblins da campanha (aliados). */
  function aliadosDaMesa(ctx) {
    var d = dadosDaMesa(ctx);
    if (!d) return [];
    return (d.personagens || []).filter(function (p) { return p.id !== ctx.personagemId; });
  }

  /* Uma ação que toca outra ficha ou o Covil: o servidor rola e aplica;
     a ficha salva o que estiver pendente antes e recarrega depois. */
  function operarNaMesa(ctx, operacao) {
    var cid = campanhaDe(ctx);
    if (!cid) return Promise.resolve({ ok: false });
    var id = novaOperacao();
    var antes = global.RAMAFichaPainel && global.RAMAFichaPainel.salvarAgora ? global.RAMAFichaPainel.salvarAgora() : Promise.resolve();
    return Promise.resolve(antes).then(function () { return global.RAMAApi.goblinsOperar(cid, id, operacao); }).then(function (r) {
      if (!r.ok) { UI().avisoDeFalha(r, "ação na mesa"); return r; }
      narrar((r.dados && r.dados.eventos) || []);
      var res = (r.dados && r.dados.resultado) || {};
      if (res.rolagem && global.RAMARolagens) {
        var cartao = D().paraCartao({ dados: res.rolagem.dados, composicao: res.rolagem.composicao, classificacao: res.rolagem.classificacao, lacuna: res.rolagem.lacuna, zeroComoFalha: res.rolagem.zeroComoFalha });
        /* Já está no histórico (o servidor registrou): só aparece. */
        global.RAMARolagens.exibir(cartao, { nome: res.rolagem.rotulo + " · " + (res.rolagem.classificacao.rotulo || "") });
      }
      carregar(ctx, true);
      if (global.RAMAFichaPainel && global.RAMAFichaPainel.recarregarSeLivre) global.RAMAFichaPainel.recarregarSeLivre();
      return r;
    });
  }

  global.RAMAGoblinsTela = {
    operar: operar, narrar: narrar, rolador: rolador, novaOperacao: novaOperacao, botao: botao,
    dados: dados, dadoVisual: dadoVisual, composicaoTexto: composicaoTexto, rotuloDaRolagem: rotuloDaRolagem, mostrarRolagem: mostrarRolagem,
    rolagem: rolagem, perguntarZero: perguntarZero, janelaDoResultado: janelaDoResultado,
    consulta: consulta, regra: regra, fonte: fonte, nomeAtr: nomeAtr,
  };
  global.RAMAGoblinsMesaDaFicha = { carregar: carregar, naMesa: naMesa, dados: dadosDaMesa, estado: estadoDaMesa, alvos: alvosDaMesa, aliados: aliadosDaMesa, operar: operarNaMesa };
})(window);
