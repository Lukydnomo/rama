/* =====================================================================
   R.A.M.A. — Tormenta20 · a mesa do Mestre na campanha (v8.0)
   ---------------------------------------------------------------------
   RAMACampanhaTormenta20.aba(ctx). O mestre vê e grava a mesa inteira
   (salvar_tormenta20 com rev + opId); o que muda fichas vai por
   tormenta20_operar (recompensas, dano, condição, descanso, fim de cena,
   ataque de ameaça). O jogador vê a vista: ordem, vez, estado aparente
   das ameaças, perigos e recompensas recebidas, e rola a própria
   iniciativa. Uma distribuição de recompensas guarda o opId desde a
   prévia: confirmar de novo depois de uma falha de rede usa o MESMO id,
   e o servidor não aplica duas vezes.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil, UI = global.RAMAUI, el = U.el;
  function R() { return global.RAMATormenta20; }
  function D() { return global.RAMATormenta20Dados; }
  function A() { return global.RAMATormenta20Ameacas; }
  function MS() { return global.RAMATormenta20Mesa; }
  function IM() { return global.RAMATormenta20ItensMagicos; }
  function MD() { return global.RAMATormenta20MesaDados; }
  function EQ() { return global.RAMATormenta20Equipamento; }
  function T() { return global.RAMATormenta20Tela; }

  function opId(p) { return (p || "t20") + "-" + U.uuid().replace(/-/g, "").slice(0, 24); }
  function mini(texto, aoClicar, op) { var x = op || {}; return el("button.r-botao.r-botao--mini" + (x.classe ? "." + x.classe : ""), { type: "button", texto: texto, disabled: !!x.desligado, title: x.dica || "", "aria-label": x.rotulo || null, onclick: aoClicar }); }
  function linha(t) { return el("p.t-mini", { texto: t }); }
  function selecao(rotulo, opcoes, valor, aoMudar) { return UI.campo({ rotulo: rotulo, tipo: "selecao", valor: valor, opcoes: opcoes, aoMudar: aoMudar }); }
  function marca(rotulo, marcado, aoMudar) { return el("label.r-marca", {}, [el("input", { type: "checkbox", checked: !!marcado, onchange: function (ev) { aoMudar(ev.currentTarget.checked); } }), el("span", { texto: rotulo })]); }
  function numero(rotulo, v) { return UI.campo({ rotulo: rotulo, tipo: "numero", valor: v === undefined || v === null ? "" : v }); }
  function ler(c, padrao) { var v = String(c.entrada.value).trim(); if (v === "") return padrao; var n = Math.floor(Number(v)); return isFinite(n) ? n : padrao; }
  function nomeCond(id) { return D().CONDICAO[id] ? D().CONDICAO[id].nome : id; }

  function aba(ctx) {
    var alvo = el("div.pilha.t20-mesa", {}, [UI.carregando("Abrindo a mesa")]);
    var mem = { estado: null, vista: null, mestre: ctx.ehMestre(), rev: 0, ocupado: false, personagens: [], tesouroAtual: null, distribuicao: null, filtro: { busca: "", ndMax: "" } };

    async function carregar(segundoPlano) {
      var r = await global.RAMAApi.lerTormenta20(ctx.campanhaId, { segundoPlano: !!segundoPlano });
      if (!r.ok) { if (!segundoPlano) U.trocar(alvo, UI.erroDeTela(r, function () { carregar(); })); return; }
      receber(r); pintar();
    }
    function receber(r) {
      mem.rev = U.inteiro(r.rev, 0);
      mem.mestre = !!(r.dados && r.dados.mestre);
      mem.estado = mem.mestre ? MS().normalizar(r.dados.estado) : null;
      mem.vista = mem.mestre ? null : r.dados.vista;
      if (r.dados && Array.isArray(r.dados.personagens)) mem.personagens = r.dados.personagens;
    }
    if (ctx.aoAtualizar) {
      ctx.aoAtualizar("mesaT20", function () { if (!mem.ocupado) carregar(true); });
      ctx.aoAtualizar("personagens", function () { if (!mem.ocupado) carregar(true); });
    }
    function pc(id) { return mem.personagens.filter(function (p) { return p.id === id; })[0]; }

    /* Uma mudança na mesa: cópia → regra → gravação (rev + opId). */
    async function operar(fn) {
      if (mem.ocupado) return false;
      var copia = MS().normalizar(U.copiar(mem.estado));
      var r = fn(copia) || { ok: true };
      if (r.ok === false) { UI.avisoAtencao(r.motivo || "Não deu para aplicar."); return false; }
      mem.ocupado = true;
      try {
        var g = await global.RAMAApi.salvarTormenta20(ctx.campanhaId, mem.rev, opId("t20m"), copia);
        if (!g.ok) {
          if (g.erro === "conflito" && g.dados) { receber(g); pintar(); UI.avisoAtencao("A mesa mudou em outra janela (um ataque de jogador, talvez). A tela foi atualizada: confira e refaça."); return false; }
          UI.avisoDeFalha(g, "gravação da mesa"); return false;
        }
        receber(g);
        if (r.eventos && r.eventos.length) narrar(r.eventos);
        pintar();
        return r;
      } finally { mem.ocupado = false; }
    }
    /* Uma operação que toca fichas (e talvez a mesa): o servidor aplica
       uma vez por id. `id` fixo permite repetir sem duplicar. */
    /* Clique repetido enquanto o pedido não voltou: a mesma operação não
       sai de novo (cada saída teria um id novo e rolaria outra vez). */
    var emAndamento = {};
    async function operarFichas(operacao, id) {
      var chave = JSON.stringify(operacao);
      if (emAndamento[chave]) return { ok: false, ocupado: true };
      emAndamento[chave] = true;
      try {
        var r = await global.RAMAApi.tormenta20Operar(ctx.campanhaId, id || opId("t20o"), operacao);
        if (!r.ok) { UI.avisoDeFalha(r, "aplicar nas fichas"); return r; }
        if (r.repetida) UI.aviso("Essa operação já tinha sido aplicada; nada foi repetido.");
        if (ctx.sincronizarAgora) ctx.sincronizarAgora();
        await carregar(true);
        return r;
      } finally { delete emAndamento[chave]; }
    }
    function narrar(eventos) {
      var f = eventos.map(function (e) {
        if (e.tipo === "condicaoTerminou") return (MS().participante(mem.estado, e.participante) || {}).nome + ": " + nomeCond(e.condicao) + " terminou";
        if (e.tipo === "curaAcelerada") return (MS().participante(mem.estado, e.participante) || {}).nome + " regenerou " + e.valor;
        if (e.tipo === "inicioDoTurno") return (MS().participante(mem.estado, e.participante) || {}).nome + ": " + e.texto;
        return "";
      }).filter(Boolean);
      if (f.length) UI.aviso(f.slice(0, 4).join(" · "), { duracao: 9000 });
    }
    function pintar() {
      var y = global.scrollY;
      U.trocar(alvo, mem.mestre ? vistaDoMestre(mem.estado) : vistaDoJogador(mem.vista));
      if (alvo.isConnected) global.scrollTo(0, y);
    }

    /* ============================================== JOGADOR */
    function vistaDoJogador(v) {
      if (!v) return linha("A mesa ainda não abriu.");
      var meus = mem.personagens.filter(function (p) { return p.meu; });
      var vez = v.combate.vezDe ? v.combate.participantes.filter(function (p) { return p.id === v.combate.vezDe; })[0] : null;
      return el("div.pilha", {}, [
        UI.painel("Mesa", [el("p", { texto: "Dia " + v.dia + " · cena " + v.cena + (v.combate.ativo ? " · combate, rodada " + v.combate.rodada + (vez ? " · vez de " + vez.nome : "") : "") })]),
        v.combate.participantes.length ? UI.painel("Combate", [ordem(v.combate.participantes, v.combate.ordem, v.combate.vezDe, false),
          meus.length ? el("div.faixa", {}, meus.map(function (p) { return mini("Rolar iniciativa de " + p.nome, function () { operarFichas({ tipo: "iniciativa", quem: p.id }).then(function (r) { if (r.ok && r.dados) UI.aviso(p.nome + ": iniciativa " + r.dados.resultado.iniciativa); }); }); })) : null,
          linha("Ataques e magias contra as ameaças: na sua ficha, escolha o alvo da mesa.")]) : null,
        v.perigos.length ? UI.painel("Perigos", v.perigos.map(function (p) { return el("p", { texto: p.nome + " · rodada " + p.rodada + " · falhas " + p.falhas }); })) : null,
        v.distribuicoes.length ? UI.painel("Recompensas recebidas", [el("ul.t20-lista", {}, v.distribuicoes.slice().reverse().map(function (d) { return el("li", { texto: (d.quando || "").slice(0, 10) + " · " + d.resumo }); }))]) : null,
        v.registro.length ? UI.recolhivel({ titulo: "Registro (" + v.registro.length + ")", conteudo: [el("ol.t20-lista", { reversed: true }, v.registro.slice().reverse().map(function (x) { return el("li", { texto: x.texto }); }))] }) : null,
      ]);
    }
    function ordem(participantes, ordemIds, vezId, mestre) {
      var porId = {}; participantes.forEach(function (p) { porId[p.id] = p; });
      return el("ol.t20-ordem", {}, ordemIds.map(function (id) {
        var p = porId[id];
        if (!p) return null;
        var resumo = p.tipo === "pc" ? (pc(p.personagemId) || {}).resumo : null;
        return el("li" + (id === vezId ? ".t20-ordem__vez" : ""), { "aria-current": id === vezId ? "true" : null }, [
          el("span.t20-ordem__ini", { texto: p.iniciativa === null ? "—" : String(p.iniciativa) }),
          el("strong", { texto: p.nome }),
          p.tipo === "pc" && resumo ? el("span.t-mini", { texto: " PV " + resumo.pv.atual + "/" + resumo.pv.max + " · PM " + resumo.pm.atual + "/" + resumo.pm.max + " · Defesa " + resumo.defesa }) : null,
          p.tipo !== "pc" && !mestre ? el("span.t-mini", { texto: " " + p.estado }) : null,
          p.derrotado ? T().etiqueta("derrotado", true) : null,
          p.surpreso ? T().etiqueta("surpreso", true) : null,
        ].concat((p.condicoes || []).map(function (c) { return T().etiqueta(nomeCond(c.id) + (c.rodadas ? " (" + c.rodadas + ")" : "")); })));
      }));
    }

    /* ============================================== MESTRE */
    function vistaDoMestre(e) {
      if (!e) return linha("A mesa ainda não abriu.");
      return el("div.pilha", {}, [
        painelMesa(e), painelCombate(e), painelEncontros(e), painelRecompensas(e), painelPersonagens(e), painelPerigos(e), painelFerramentas(e),
        UI.painel("Notas do mestre", [(function () { var a = UI.campo({ rotulo: "Só você vê", tipo: "area", valor: e.notas, linhas: 6 }); a.entrada.addEventListener("change", function () { var v = a.entrada.value; operar(function (x) { x.notas = v; return { ok: true }; }); }); return a; })()]),
        e.registro.length ? UI.recolhivel({ titulo: "Registro (" + e.registro.length + ")", conteudo: [el("ol.t20-lista", { reversed: true }, e.registro.slice().reverse().slice(0, 120).map(function (x) { return el("li", { texto: (x.privado ? "[privado] " : "") + x.texto }); }))] }) : null,
      ]);
    }
    function painelMesa(e) {
      return UI.painel("Mesa · dia " + e.dia + " · cena " + e.cena, [
        el("div.faixa", {}, [
          mini("Novo dia", function () { operar(function (x) { return MS().novoDia(x); }); }),
          mini("Fim de cena (fichas)", function () { operarFichas({ tipo: "fimDeCena" }); }, { dica: "Condições e efeitos de cena terminam em todas as fichas; usos por cena voltam" }),
        ]),
        marca("Parceiros vulneráveis (p. 262)", e.regras.parceirosVulneraveis, function (v) { operar(function (x) { x.regras.parceirosVulneraveis = v; return { ok: true }; }); }),
        marca("Avanço por marcos, sem XP (p. 326)", e.regras.xpPorMarcos, function (v) { operar(function (x) { x.regras.xpPorMarcos = v; return { ok: true }; }); }),
        marca("Custo de vida mensal (p. 277)", e.regras.custoDeVida, function (v) { operar(function (x) { x.regras.custoDeVida = v; return { ok: true }; }); }),
      ]);
    }

    /* ------------------------------------------------ combate */
    function painelCombate(e) {
      var cb = e.combate;
      var vezId = cb.ativo ? cb.ordem[cb.vez] : null;
      var ameacas = cb.participantes.filter(function (p) { return p.tipo !== "pc"; });
      var pcsNaMesa = mem.personagens.filter(function (p) { return !cb.participantes.some(function (x) { return x.personagemId === p.id; }); });
      return UI.painel("Combate" + (cb.ativo ? " · rodada " + cb.rodada : ""), [
        el("div.faixa", {}, [
          pcsNaMesa.length ? mini("Pôr os personagens", function () { operar(function (x) { pcsNaMesa.forEach(function (p) { MS().adicionarPC(x, { personagemId: p.id, nome: p.nome }); }); return { ok: true }; }); }) : null,
          mini("Adicionar ameaça", function () { dialogoAmeaca(); }),
          mini("Do Homebrew", function () { dialogoHomebrew(); }, { classe: "r-botao--fantasma" }),
          ameacas.length ? mini("Iniciativa dos inimigos", function () { operar(function (x) { var r = MS().rolarIniciativaDosInimigos(x, T().rolar, false); UI.aviso("Inimigos: " + r.rolagens.map(function (g) { return g.d20 + " " + T().sinal(g.bonus) + " = " + g.total; }).join(", ") + " (menor bônus, p. 230)"); return r; }); }) : null,
          !cb.ativo && cb.participantes.length ? mini("Iniciar combate", function () { dialogoIniciar(e); }) : null,
          cb.ativo ? mini("Próxima vez", function () { operar(function (x) { var r = MS().proximaVez(x); return Object.assign({ ok: true }, r); }); }) : null,
          cb.ativo ? mini("Encerrar combate", function () { operar(function (x) { return MS().encerrarCombate(x); }); }, { classe: "r-botao--fantasma" }) : null,
          ameacas.some(function (p) { return p.derrotado; }) ? mini("Registrar derrotados como desafios", function () { operar(function (x) { MS().desafiosDoCombate(x).forEach(function (d) { MS().registrarDesafio(x, d); }); return { ok: true }; }); }, { classe: "r-botao--fantasma" }) : null,
          ameacas.some(function (p) { return p.derrotado; }) ? mini("Limpar derrotados", function () { operar(function (x) { return MS().limparDerrotados(x); }); }, { classe: "r-botao--fantasma" }) : null,
        ]),
        cb.participantes.length ? ordem(cb.participantes, cb.ordem, vezId, true) : linha("Ninguém no combate."),
        ameacas.length ? el("div.pilha", {}, ameacas.map(function (p) { return cartaoAmeaca(e, p); })) : null,
      ]);
    }
    function cartaoAmeaca(e, p) {
      var def = MS().definicaoDaAmeaca(p) || {};
      var pct = Math.max(0, Math.round(p.pv.atual / p.pv.max * 100));
      return el("div.t20-ameaca" + (p.derrotado ? ".t20-ameaca--derrotada" : ""), {}, [
        el("div.faixa", {}, [el("strong", { texto: p.nome }), el("span.t-mini", { texto: " ND " + p.nd + " · Defesa " + p.def + " · Fort " + T().sinal(p.fort) + " Ref " + T().sinal(p.ref) + " Von " + T().sinal(p.von) + (Object.keys(p.rd).length ? " · RD " + Object.keys(p.rd).map(function (k) { return k + " " + p.rd[k]; }).join(", ") : "") + (p.oculto ? " · oculta" : "") })]),
        el("div.t20-barra", { role: "img", "aria-label": "PV " + p.pv.atual + " de " + p.pv.max }, [el("span.t20-barra__cheio", { style: "width:" + pct + "%" })]),
        el("p.t-mini", { texto: "PV " + p.pv.atual + "/" + p.pv.max + (p.pv.temp ? " (+" + p.pv.temp + ")" : "") + (p.pm.max ? " · PM " + p.pm.atual + "/" + p.pm.max : "") + (p.imune.length ? " · imune: " + p.imune.join(", ") : "") + (p.vulner.length ? " · vulnerável: " + p.vulner.join(", ") : "") }),
        el("div.faixa", {}, [
          mini("Dano", function () { dialogoDanoAmeaca(p); }), mini("Cura", function () { var n = numero("PV"); UI.modal({ titulo: "Curar " + p.nome, conteudo: [n], botoes: [{ rotulo: "Cancelar" }, { rotulo: "Curar", classe: "r-botao--principal", aoClicar: function (f) { var v = ler(n, 0); operar(function (x) { return MS().curarAmeaca(x, p.id, v, { oficio: true }); }); f(); } }] }); }),
          mini("Condição", function () { dialogoCondicaoAmeaca(p); }),
          (def.ataques || []).length ? mini("Atacar personagem", function () { dialogoAtaqueAmeaca(p, def); }) : null,
          mini("Manobra", function () { dialogoManobraAmeaca(p); }, { classe: "r-botao--fantasma" }),
          mini(p.oculto ? "Revelar" : "Ocultar", function () { operar(function (x) { MS().participante(x, p.id).oculto = !p.oculto; return { ok: true }; }); }, { classe: "r-botao--fantasma" }),
          mini("Remover", function () { operar(function (x) { MS().removerParticipante(x, p.id); return { ok: true }; }); }, { classe: "r-botao--fantasma" }),
        ]),
        p.condicoes.length ? el("p", {}, p.condicoes.map(function (c) { return el("span.r-etiqueta", {}, [el("span", { texto: nomeCond(c.id) + (c.rodadas ? " (" + c.rodadas + ")" : "") }), el("button.r-icone", { type: "button", "aria-label": "Tirar " + nomeCond(c.id), onclick: function () { operar(function (x) { return MS().removerCondicao(x, p.id, c.id); }); } }, [UI.simbolo("x")])]); })) : null,
        UI.recolhivel({ titulo: "Ficha", conteudo: [fichaDaAmeaca(def, p, e)] }),
      ]);
    }
    function fichaDaAmeaca(def, p, e) {
      return el("div.pilha", {}, [
        def.resumo ? el("p", { texto: def.resumo }) : null,
        el("p.t-mini", { texto: [def.tipoNome, def.sub, def.tam, "Iniciativa " + T().sinal(def.ini), "Percepção " + T().sinal(def.per), (def.sentidos || []).join(", "), "Desl. " + def.desl + " m" + Object.keys(def.mov || {}).map(function (k) { return ", " + k + " " + def.mov[k] + " m"; }).join(""), def.defesasTexto].filter(Boolean).join(" · ") }),
        el("ul.t20-lista", {}, (def.ataques || []).map(function (a) { return el("li", { texto: (a.q > 1 ? a.q + "× " : "") + a.n + " " + T().sinal(a.a) + " (" + a.d + (a.x ? " + " + a.x : "") + (a.m < 20 ? ", " + a.m : "") + (a.c > 2 ? ", x" + a.c : "") + ")" + (a.efeito ? " — " + a.efeito : "") }); })),
        el("ul.t20-lista", {}, (def.habs || []).map(function (h) {
          var rec = h.recarga ? p.recargas[h.n] : false;
          return el("li", {}, [el("strong", { texto: h.n + (h.acao ? " (" + (D().NOMES_ACAO[h.acao] || h.acao) + (h.pm ? ", " + h.pm + " PM" : "") + ")" : "") }), el("span", { texto: " " + h.r }),
            h.dano ? mini("Rolar " + h.dano, function () { T().rolarExpressao(p.nome + " · " + h.n, h.dano); }) : null,
            h.recarga ? mini(rec ? "Recarregar" : "Usou", function () { operar(function (x) { return MS().usarRecarga(x, p.id, h.n, rec); }); }, { classe: "r-botao--fantasma" }) : null]);
        })),
        def.magias ? el("p.t-mini", { texto: "Magias (" + def.magias.como + ", CD " + def.magias.cd + "): " + def.magias.lista.map(function (m) { return ((global.RAMATormenta20Magias.MAGIA[m.id] || {}).nome || m.id) + (m.pm ? " " + m.pm + " PM" : "") + (m.r ? " — " + m.r : ""); }).join("; ") }) : null,
        el("p.t-mini", { texto: "For " + atr(def.atr[0]) + ", Des " + atr(def.atr[1]) + ", Con " + atr(def.atr[2]) + ", Int " + atr(def.atr[3]) + ", Sab " + atr(def.atr[4]) + ", Car " + atr(def.atr[5]) + (Object.keys(def.pericias || {}).length ? " · " + Object.keys(def.pericias).map(function (k) { return R().nomePericia(k) + " " + T().sinal(def.pericias[k]); }).join(", ") : "") + " · Tesouro: " + (IM().CATEGORIAS_TESOURO[def.tesouro] || def.tesouro) + (def.pagina ? " · p. " + def.pagina : "") }),
        el("div.faixa", {}, ["fort", "ref", "von"].map(function (k) { return mini(({ fort: "Fortitude", ref: "Reflexos", von: "Vontade" })[k], function () { T().teste(p.nome + " · " + ({ fort: "Fortitude", ref: "Reflexos", von: "Vontade" })[k], p[k], [], {}); }, { classe: "r-botao--fantasma" }); }).concat([mini("Percepção", function () { T().teste(p.nome + " · Percepção", p.per, []); }, { classe: "r-botao--fantasma" })])),
      ]);
    }
    function atr(v) { return v === null || v === undefined ? "—" : T().sinal(v); }

    function dialogoAmeaca() {
      var lista = A().listar({});
      var busca = UI.campo({ rotulo: "Buscar", valor: mem.filtro.busca, aoDigitar: true, aoMudar: function (v) { mem.filtro.busca = v; filtrar(); } });
      var ndMax = numero("ND máximo", mem.filtro.ndMax);
      ndMax.entrada.addEventListener("input", function () { mem.filtro.ndMax = ndMax.entrada.value; filtrar(); });
      var area = el("div"), sel = null;
      function filtrar() {
        var q = U.chaveDeBusca(mem.filtro.busca), m = mem.filtro.ndMax === "" ? 99 : Number(mem.filtro.ndMax);
        var vis = lista.filter(function (a) { return (!q || U.chaveDeBusca(a.nome + " " + a.grupoNome).indexOf(q) >= 0) && a.ndNum <= m; });
        sel = selecao("Ameaça", vis.map(function (a) { return { valor: a.id, rotulo: a.nome + " · ND " + a.nd + " · " + a.grupoNome + " · " + a.papel }; }), vis[0] ? vis[0].id : "");
        U.trocar(area, [sel]);
      }
      filtrar();
      var qtd = numero("Quantidade", 1), oculta = { v: false };
      UI.modal({ titulo: "Adicionar ameaça", conteudo: [busca, ndMax, area, qtd, marca("Entrar oculta (os jogadores não veem)", false, function (v) { oculta.v = v; }), linha("Cada uma é uma ocorrência independente: PV, condições e recargas próprios; a ficha do catálogo não muda.")], botoes: [{ rotulo: "Cancelar" }, { rotulo: "Adicionar", classe: "r-botao--principal", aoClicar: function (f) { if (!sel || !sel.entrada.value) return; var id = sel.entrada.value, q = ler(qtd, 1); operar(function (x) { return MS().adicionarAmeaca(x, id, q, { oculto: oculta.v }); }); f(); } }] });
    }
    async function dialogoHomebrew() {
      var r = await global.RAMAApi.listarHomebrew({ tipo: "criatura" });
      if (!r.ok) { UI.avisoDeFalha(r, "leitura do Homebrew"); return; }
      var t20 = (r.dados || []).filter(function (h) { var s = (h.resumo && h.resumo.sistema) || h.sistema; return s === "tormenta20"; });
      if (!t20.length) { UI.aviso("Nenhuma ameaça de Tormenta20 no seu Homebrew. No Catálogo, abra uma ameaça e use “Copiar para o Homebrew”."); return; }
      var sel = selecao("Ameaça do Homebrew", t20.map(function (h) { return { valor: h.id, rotulo: h.nome }; }), t20[0].id);
      var qtd = numero("Quantidade", 1);
      UI.modal({ titulo: "Do Homebrew", conteudo: [sel, qtd], botoes: [{ rotulo: "Cancelar" }, { rotulo: "Adicionar", classe: "r-botao--principal", aoClicar: function (f) {
        return global.RAMAApi.lerHomebrew(sel.entrada.value).then(function (h) {
          if (!h.ok || !h.dados || !h.dados.tormenta20) { UI.avisoAtencao("A ficha não tem o bloco de Tormenta20."); return; }
          var def = A().daFicha(Object.assign({ nome: h.dados.nome }, h.dados.tormenta20));
          var q = ler(qtd, 1);
          operar(function (x) { return MS().adicionarAmeaca(x, def, q, {}); });
          f();
        });
      } }] });
    }
    function dialogoIniciar(e) {
      var surpresos = {};
      UI.modal({ titulo: "Iniciar combate", conteudo: [linha("Quem foi surpreendido fica desprevenido e não age na primeira rodada (p. 230).")].concat(e.combate.participantes.map(function (p) { return marca(p.nome, false, function (v) { surpresos[p.id] = v; }); })), botoes: [{ rotulo: "Cancelar" }, { rotulo: "Iniciar", classe: "r-botao--principal", aoClicar: function (f) { var ids = Object.keys(surpresos).filter(function (k) { return surpresos[k]; }); operar(function (x) { return MS().iniciarCombate(x, ids); }); f(); } }] });
    }
    function dialogoDanoAmeaca(p) {
      var v = UI.campo({ rotulo: "Dano (número ou dados)", valor: "" });
      var tipo = selecao("Tipo", [{ valor: "", rotulo: "Sem tipo" }].concat(D().TIPOS_DANO.map(function (x) { return { valor: x[0], rotulo: x[1] }; })).concat([{ valor: "perdaDeVida", rotulo: "Perda de vida" }]), "");
      var op = { magico: false, area: false, metade: false, critico: false, arma: false };
      UI.modal({ titulo: "Dano em " + p.nome, conteudo: [v, tipo, marca("Fonte mágica", false, function (x) { op.magico = x; }), marca("Efeito de área", false, function (x) { op.area = x; }), marca("Ataque com arma", false, function (x) { op.arma = x; }), marca("Passou na resistência (metade)", false, function (x) { op.metade = x; }), linha("Aplica imunidade, vulnerabilidade (+50%), RD (inclusive RD x/mágico e x/luz), metade de dano físico ou mundano e +50% de área contra bandos e enxames.")], botoes: [{ rotulo: "Cancelar" }, { rotulo: "Aplicar", classe: "r-botao--principal", aoClicar: function (f) {
        var s = String(v.entrada.value).trim();
        var n = /d/.test(s) ? T().rolarExpressao("Dano em " + p.nome, s).total : Math.max(0, Math.floor(Number(s) || 0));
        operar(function (x) { var r = MS().danoEmAmeaca(x, p.id, n, tipo.entrada.value || null, op); if (r.ok) UI.aviso(p.nome + ": " + r.dano + " de dano" + (r.notas.length ? " (" + r.notas.join("; ") + ")" : "") + (r.derrotado ? " — derrotado" : "")); return r; });
        f();
      } }] });
    }
    function dialogoCondicaoAmeaca(p) {
      var sel = selecao("Condição", D().CONDICOES.map(function (c) { return { valor: c.id, rotulo: c.nome }; }), D().CONDICOES[0].id);
      var rod = numero("Rodadas (vazio = cena)");
      UI.modal({ titulo: "Condição em " + p.nome, conteudo: [sel, rod], botoes: [{ rotulo: "Cancelar" }, { rotulo: "Aplicar", classe: "r-botao--principal", aoClicar: function (f) { var r0 = ler(rod, null); operar(function (x) { var r = MS().condicaoEmParticipante(x, p.id, sel.entrada.value, { rodadas: r0 === null ? undefined : r0, origem: "Mestre" }); if (r.imune) UI.aviso(p.nome + " é imune."); return r; }); f(); } }] });
    }
    function dialogoAtaqueAmeaca(p, def) {
      var ataque = selecao("Ataque", def.ataques.map(function (a) { return { valor: a.id, rotulo: a.n + " " + T().sinal(a.a) + " (" + a.d + ")" }; }), def.ataques[0].id);
      var alvos = mem.personagens;
      if (!alvos.length) { UI.aviso("Nenhum personagem de Tormenta20 na campanha."); return; }
      var alvoSel = selecao("Personagem", alvos.map(function (x) { return { valor: x.id, rotulo: x.nome + (x.resumo ? " (Defesa " + x.resumo.defesa + ")" : "") }; }), alvos[0].id);
      var bonus = numero("Bônus do momento", 0), dist = { v: false };
      UI.modal({ titulo: p.nome + " ataca", conteudo: [ataque, alvoSel, bonus, marca("Ataque à distância (Defesa contra distância)", false, function (v) { dist.v = v; }), linha("O servidor rola contra a Defesa da ficha, resolve o crítico e aplica o dano com a RD do personagem (uma vez por operação).")], botoes: [{ rotulo: "Cancelar" }, { rotulo: "Atacar", classe: "r-botao--principal", aoClicar: function (f) {
        f();
        return operarFichas({ tipo: "ataqueAmeaca", participante: p.id, ataque: ataque.entrada.value, personagem: alvoSel.entrada.value, bonus: ler(bonus, 0), distancia: dist.v }).then(function (r) {
          if (!r.ok || !r.dados) return;
          var at = r.dados.resultado.ataque;
          UI.aviso(p.nome + ": " + at.teste.total + (at.acertou ? (at.critico ? " — crítico!" : " — acertou") : " — errou") + (r.dados.resultado.dano ? " · " + r.dados.resultado.dano.dano + " de dano (PV " + r.dados.resultado.dano.pv + ")" : ""), { duracao: 9000 });
        });
      } }] });
    }

    /* Manobra da ameaça contra um personagem (p. 234): o servidor rola o
       teste oposto com o bônus de manobra da ficha e aplica a condição. */
    function dialogoManobraAmeaca(p) {
      var alvos = mem.personagens;
      if (!alvos.length) { UI.aviso("Nenhum personagem de Tormenta20 na campanha."); return; }
      var mb = MS().manobraDaAmeaca(mem.estado, p.id) || { total: 0, parcelas: [] };
      var sel = selecao("Manobra", D().MANOBRAS.map(function (m) { return { valor: m.id, rotulo: m.nome }; }), "agarrar");
      var alvoSel = selecao("Personagem", alvos.map(function (x) { return { valor: x.id, rotulo: x.nome }; }), alvos[0].id);
      var bonus = numero("Bônus do momento", 0);
      UI.modal({ titulo: p.nome + " · manobra", conteudo: [linha("Bônus de manobra de " + p.nome + ": " + T().sinal(mb.total) + " (" + mb.parcelas.map(function (x) { return x.rotulo + " " + T().sinal(x.valor); }).join(", ") + ")."), sel, alvoSel, bonus], botoes: [{ rotulo: "Cancelar" }, { rotulo: "Rolar", classe: "r-botao--principal", aoClicar: function (f) {
        f();
        return operarFichas({ tipo: "manobraDeAmeaca", participante: p.id, personagem: alvoSel.entrada.value, manobra: sel.entrada.value, bonus: ler(bonus, 0) }).then(function (r) {
          if (!r.ok || !r.dados) return;
          var m = r.dados.resultado.manobra;
          if (m) UI.aviso(p.nome + " · " + m.nome + ": " + m.oposto.totalA + " × " + m.oposto.totalB + " — " + (m.venceu ? m.consequencia : "falhou."), { duracao: 9000 });
        });
      } }] });
    }

    /* ------------------------------------------------ encontros */
    function painelEncontros(e) {
      var nivelMedio = mem.personagens.length ? mem.personagens.reduce(function (s, p) { return s + ((p.resumo && p.resumo.nivel) || 1); }, 0) / mem.personagens.length : 1;
      return UI.painel("Encontros", [
        linha("ND do encontro (p. 282): abaixo de 1, soma; de 1 em diante, +2 a cada vez que a quantidade dobra. Grupo: " + mem.personagens.length + " personagem(ns), nível médio " + Math.round(nivelMedio * 10) / 10 + "."),
        mini("Montar encontro", function () { dialogoEncontro(null); }),
        e.encontros.length ? el("ul.t20-lista", {}, e.encontros.map(function (enc) {
          var nd = MS().ndDoEncontro(enc);
          var dif = A().dificuldade(nd.nd, nivelMedio, mem.personagens.length || 4);
          return el("li", {}, [el("strong", { texto: enc.nome }), el("span", { texto: " · ND " + nd.texto + (nd.aproximado ? " (criaturas diferentes: aproximação do RAMA)" : "") + " · " + dif.nome + " · " + enc.grupos.map(function (g) { var a = g.homebrew || A().AMEACA[g.ameacaId]; return g.quantidade + "× " + (a ? a.nome : g.ameacaId); }).join(", ") }),
            mini("Pôr no combate", function () { operar(function (x) { return MS().iniciarEncontro(x, enc.id); }); }), mini("Editar", function () { dialogoEncontro(enc); }, { classe: "r-botao--fantasma" }), mini("Apagar", function () { operar(function (x) { x.encontros = x.encontros.filter(function (y) { return y.id !== enc.id; }); return { ok: true }; }); }, { classe: "r-botao--fantasma" })]);
        })) : null,
      ]);
    }
    function dialogoEncontro(enc) {
      var grupos = enc ? U.copiar(enc.grupos) : [];
      var nome = UI.campo({ rotulo: "Nome", valor: enc ? enc.nome : "" });
      var area = el("div.pilha"), info = el("p", { role: "status" });
      var lista = A().listar({});
      function pintarG() {
        var nd = A().ndDoEncontro(grupos.map(function (g) { var a = A().AMEACA[g.ameacaId]; return { nd: a ? a.nd : "1", quantidade: g.quantidade }; }));
        info.textContent = "ND do encontro: " + nd.texto + (nd.aproximado ? " (aproximação: criaturas diferentes)" : "");
        U.trocar(area, grupos.map(function (g, i) { var a = A().AMEACA[g.ameacaId]; return el("div.faixa", {}, [el("span", { texto: g.quantidade + "× " + (a ? a.nome + " (ND " + a.nd + ")" : g.ameacaId) }), mini("−", function () { g.quantidade = Math.max(1, g.quantidade - 1); pintarG(); }), mini("+", function () { g.quantidade++; pintarG(); }), mini("Tirar", function () { grupos.splice(i, 1); pintarG(); }, { classe: "r-botao--fantasma" })]); }));
      }
      var sel = selecao("Ameaça", lista.map(function (a) { return { valor: a.id, rotulo: a.nome + " · ND " + a.nd }; }), lista[0].id);
      pintarG();
      UI.modal({ titulo: enc ? "Editar encontro" : "Montar encontro", largo: true, conteudo: [nome, el("div.faixa", {}, [sel, mini("Somar", function () { var g = grupos.filter(function (x) { return x.ameacaId === sel.entrada.value; })[0]; if (g) g.quantidade++; else grupos.push({ ameacaId: sel.entrada.value, quantidade: 1 }); pintarG(); })]), area, info], botoes: [{ rotulo: "Cancelar" }, { rotulo: "Salvar", classe: "r-botao--principal", aoClicar: function (f) { var dados = { id: enc ? enc.id : undefined, nome: nome.entrada.value || "Encontro", grupos: grupos }; operar(function (x) { return MS().salvarEncontro(x, dados); }); f(); } }] });
    }

    /* ------------------------------------------------ recompensas */
    function painelRecompensas(e) {
      var pend = e.desafios.filter(function (d) { return !d.distribuido; });
      var tes = e.tesouros.filter(function (t) { return !t.distribuido; });
      return UI.painel("Desafios, XP e tesouro", [
        el("div.faixa", {}, [mini("Registrar desafio", function () { dialogoDesafio(); }), mini("Rolar tesouro", function () { dialogoTesouro(); }), (pend.length || tes.length) ? mini("Preparar distribuição", function () { prepararDistribuicao(e); }, { classe: "r-botao--principal" }) : null]),
        pend.length ? el("ul.t20-lista", {}, pend.map(function (d) { return el("li", {}, [el("span", { texto: d.nome + " · ND " + d.nd + " · " + d.resultado }), mini("Apagar", function () { operar(function (x) { x.desafios = x.desafios.filter(function (y) { return y.id !== d.id; }); return { ok: true }; }); }, { classe: "r-botao--fantasma" })]); })) : linha("Nenhum desafio pendente."),
        tes.length ? el("ul.t20-lista", {}, tes.map(function (t) { return el("li", { texto: "Tesouro ND " + t.nd + " (" + t.categoria + (t.origem ? ", " + t.origem : "") + "): " + textoTesouro(t.resultado) }); })) : null,
        linha("XP por desafio: ND × 1.000 ÷ personagens; empate metade; derrota um quarto; ND 5 ou mais abaixo do nível do grupo não rende (p. 326). Tesouro pela Tabela 8-1 (p. 328)."),
      ]);
    }
    function textoTesouro(r) {
      var m = r.moedas || {};
      var partes = [];
      if (m.ts) partes.push("T$ " + m.ts); if (m.tc) partes.push(m.tc + " TC"); if (m.to) partes.push(m.to + " TO");
      (r.itens || []).forEach(function (i) { partes.push(i.tipo === "riqueza" ? "riqueza " + i.categoria + " (T$ " + i.valor + ")" : i.tipo === "pocao" ? i.nome : i.tipo === "magico" ? (i.nome || ((EQ().ITEM[i.base] || {}).nome || i.base) + " {" + (i.encantos || []).join(", ") + "}") + " (mágico " + i.categoria + ")" : (((EQ().ITEM[i.ref] || {}).nome || i.ref) + (i.melhorias && i.melhorias.length ? " [" + i.melhorias.join(", ") + "]" : ""))); });
      return partes.join(", ") || "nada";
    }
    function dialogoDesafio() {
      var nome = UI.campo({ rotulo: "Desafio", valor: "" }), nd = UI.campo({ rotulo: "ND (ex.: 1/2, 3)", valor: "1" });
      var res = selecao("Resultado", [{ valor: "vencido", rotulo: "Vencido (XP total)" }, { valor: "empate", rotulo: "Empate (metade)" }, { valor: "derrota", rotulo: "Derrota dos heróis (um quarto)" }], "vencido");
      UI.modal({ titulo: "Registrar desafio", conteudo: [nome, nd, res], botoes: [{ rotulo: "Cancelar" }, { rotulo: "Registrar", classe: "r-botao--principal", aoClicar: function (f) { var d = { nome: nome.entrada.value || "Desafio", nd: nd.entrada.value || "1", resultado: res.entrada.value }; operar(function (x) { return MS().registrarDesafio(x, d); }); f(); } }] });
    }
    function dialogoTesouro() {
      var nd = selecao("ND", Object.keys(IM().TESOURO).map(function (k) { return { valor: k, rotulo: "ND " + k }; }), "1");
      var cat = selecao("Categoria", Object.keys(IM().CATEGORIAS_TESOURO).map(function (k) { return { valor: k, rotulo: IM().CATEGORIAS_TESOURO[k] }; }), "padrao");
      var origem = UI.campo({ rotulo: "De quem / onde", valor: "" });
      var id = opId("tes");
      UI.modal({ titulo: "Rolar tesouro (Tabela 8-1)", conteudo: [nd, cat, origem], botoes: [{ rotulo: "Cancelar" }, { rotulo: "Rolar", classe: "r-botao--principal", aoClicar: function (f) { var a = nd.entrada.value, c = cat.entrada.value, o = origem.entrada.value; operar(function (x) { var r = MS().rolarTesouro(x, id, a, c, T().rolar, o); if (r.ok) UI.aviso("Tesouro: " + textoTesouro(r.tesouro.resultado), { duracao: 12000 }); return r; }); f(); } }] });
    }
    /* A prévia: XP por personagem, moedas e itens (o mestre ajusta), e
       só então a confirmação — com um opId fixo desde aqui. */
    function prepararDistribuicao(e) {
      var pend = e.desafios.filter(function (d) { return !d.distribuido; });
      var tes = e.tesouros.filter(function (t) { return !t.distribuido; });
      var selDes = {}, selTes = {}, alvos = {};
      pend.forEach(function (d) { selDes[d.id] = true; }); tes.forEach(function (t) { selTes[t.id] = true; }); mem.personagens.forEach(function (p) { alvos[p.id] = true; });
      var dist = mem.distribuicao && mem.distribuicao.base === JSON.stringify([pend.map(function (d) { return d.id; }), tes.map(function (t) { return t.id; })]) ? mem.distribuicao : { id: opId("rec"), base: JSON.stringify([pend.map(function (d) { return d.id; }), tes.map(function (t) { return t.id; })]) };
      mem.distribuicao = dist;
      var area = el("div.pilha");
      var campos = {};
      function calcular() {
        var ids = Object.keys(alvos).filter(function (k) { return alvos[k]; });
        var n = ids.length || 1;
        var nivel = ids.length ? ids.reduce(function (s, id) { var p = pc(id); return s + ((p && p.resumo && p.resumo.nivel) || 1); }, 0) / ids.length : 1;
        var px = MS().previaDeXp(e, Object.keys(selDes).filter(function (k) { return selDes[k]; }), n, Math.round(nivel));
        var moedas = 0, itens = [];
        tes.filter(function (t) { return selTes[t.id]; }).forEach(function (t) { var m = t.resultado.moedas || {}; moedas += (m.ts || 0) + (m.tc || 0) / 10 + (m.to || 0) * 10; (t.resultado.itens || []).forEach(function (i) { if (i.tipo === "riqueza") moedas += i.valor; else itens.push(i); }); });
        return { ids: ids, xp: e.regras.xpPorMarcos ? 0 : px.porPersonagem, linhas: px.linhas, moedas: Math.floor(moedas / n * 10) / 10, itens: itens };
      }
      function itemParaFicha(i) {
        if (i.tipo === "pocao") return { ref: "", nome: "Poção: " + i.nome, personalizado: { nome: "Poção: " + i.nome, espacos: 0.5, preco: i.preco, pocao: { magia: i.magia, aprim: i.aprim, forma: i.forma } } };
        if (i.tipo === "magico") return i.item ? (IM().ITEM[i.item].base ? { ref: IM().ITEM[i.item].base, magico: i.item } : { ref: "", magico: i.item, personalizado: IM().ITEM[i.item] }) : { ref: i.base, encantos: i.encantos || [] };
        if (i.tipo === "superior") return { ref: i.ref, melhorias: (i.melhorias || []).filter(function (m) { return m.indexOf("material:") !== 0; }), material: ((i.melhorias || []).filter(function (m) { return m.indexOf("material:") === 0; })[0] || "").slice(9) };
        return { ref: i.ref };
      }
      function desenhar() {
        var c = calcular();
        campos = {};
        U.trocar(area, [
          el("fieldset", {}, [el("legend", { texto: "Desafios" })].concat(pend.map(function (d) { return marca(d.nome + " (ND " + d.nd + ", " + d.resultado + ")", selDes[d.id], function (v) { selDes[d.id] = v; desenhar(); }); }))),
          tes.length ? el("fieldset", {}, [el("legend", { texto: "Tesouros" })].concat(tes.map(function (t) { return marca("ND " + t.nd + ": " + textoTesouro(t.resultado), selTes[t.id], function (v) { selTes[t.id] = v; desenhar(); }); }))) : null,
          el("fieldset", {}, [el("legend", { texto: "Personagens" })].concat(mem.personagens.map(function (p) { return marca(p.nome, alvos[p.id], function (v) { alvos[p.id] = v; desenhar(); }); }))),
          el("p", { texto: (e.regras.xpPorMarcos ? "Avanço por marcos: sem XP. " : "XP por personagem: " + c.xp + " (" + c.linhas.map(function (l) { return l.nome + " " + l.porPersonagem + (l.irrelevante ? " — irrelevante" : ""); }).join("; ") + "). ") + "Tibares por personagem (moedas e riquezas divididas): T$ " + c.moedas + "." }),
          el("div.pilha", {}, c.ids.map(function (id) { var p = pc(id); var x = numero(p.nome + " · XP", c.xp), tb = numero(p.nome + " · T$", c.moedas); campos[id] = { xp: x, tibar: tb }; return el("div.faixa", {}, [x, tb]); })),
          c.itens.length ? el("div.pilha", {}, c.itens.map(function (i, k) { var s = selecao("Item: " + textoTesouro({ itens: [i] }), [{ valor: "", rotulo: "Ninguém (fica na mesa)" }].concat(c.ids.map(function (id) { return { valor: id, rotulo: pc(id).nome }; })), c.ids[k % c.ids.length] || ""); campos["item" + k] = { sel: s, item: i }; return s; })) : null,
          linha("Ao confirmar, as fichas recebem XP, tibares e itens UMA vez (id " + dist.id.slice(0, 12) + "…). Confirmar de novo, depois de uma falha, não duplica."),
        ]);
      }
      desenhar();
      UI.modal({ titulo: "Distribuir recompensas", largo: true, conteudo: [area], botoes: [{ rotulo: "Cancelar" }, { rotulo: "Confirmar e aplicar", classe: "r-botao--principal", aoClicar: function (f) {
        var c = calcular();
        if (!c.ids.length) { UI.avisoAtencao("Escolha os personagens."); return; }
        var xp = {}, tibar = {}, itens = [];
        c.ids.forEach(function (id) { xp[id] = Math.max(0, ler(campos[id].xp, 0)); tibar[id] = Math.max(0, Number(String(campos[id].tibar.entrada.value).replace(",", ".")) || 0); });
        Object.keys(campos).filter(function (k) { return k.indexOf("item") === 0; }).forEach(function (k) { var v = campos[k].sel.entrada.value; if (v) itens.push({ alvo: v, item: itemParaFicha(campos[k].item) }); });
        var resumo = c.ids.map(function (id) { return pc(id).nome + ": " + xp[id] + " XP, T$ " + tibar[id]; }).join("; ") + (itens.length ? "; " + itens.length + " item(ns)" : "");
        var operacao = { tipo: "recompensa", personagens: c.ids, xp: xp, tibar: tibar, itens: itens, desafios: Object.keys(selDes).filter(function (k) { return selDes[k]; }), tesouros: Object.keys(selTes).filter(function (k) { return selTes[k]; }), resumo: resumo };
        return operarFichas(operacao, dist.id).then(function (r) { if (r.ok) { mem.distribuicao = null; UI.avisoOk("Recompensas aplicadas: " + resumo); f(); } });
      } }] });
    }

    /* ------------------------------------------------ personagens */
    function painelPersonagens(e) {
      if (!mem.personagens.length) return UI.painel("Personagens", [linha("Nenhuma ficha de Tormenta20 vinculada à campanha.")]);
      return UI.painel("Personagens", [
        el("ul.t20-lista", {}, mem.personagens.map(function (p) { var r = p.resumo || {}; return el("li", {}, [el("strong", { texto: p.nome }), el("span.t-mini", { texto: " " + [r.raca, r.classes, r.nivel ? "nível " + r.nivel : "", r.pv ? "PV " + r.pv.atual + "/" + r.pv.max : "", r.pm ? "PM " + r.pm.atual + "/" + r.pm.max : "", r.defesa ? "Defesa " + r.defesa : "", (r.condicoes || []).map(nomeCond).join(", "), r.sangrando ? "SANGRANDO" : ""].filter(Boolean).join(" · ") }),
          mini("Dano", function () { dialogoDanoPC(p); }), mini("Condição", function () { dialogoCondicaoPC([p.id]); }, { classe: "r-botao--fantasma" }), r.sangrando ? mini("Teste de sangramento", function () { operarFichas({ tipo: "sangramento", personagem: p.id }).then(function (x) { if (x.ok && x.dados) UI.aviso(p.nome + ": " + (x.dados.resultado.estabilizou ? "estabilizou" : "perdeu " + x.dados.resultado.perda + " PV")); }); }) : null]); })),
        el("div.faixa", {}, [mini("Descanso do grupo", function () { dialogoDescanso(); }), mini("Condição no grupo", function () { dialogoCondicaoPC(mem.personagens.map(function (p) { return p.id; })); }, { classe: "r-botao--fantasma" })]),
      ]);
    }
    function dialogoDanoPC(p) {
      var v = numero("Dano"), tipo = selecao("Tipo", [{ valor: "", rotulo: "Sem tipo" }].concat(D().TIPOS_DANO.map(function (x) { return { valor: x[0], rotulo: x[1] }; })), "");
      var op = { metade: false, naoLetal: false, perdaDeVida: false };
      var id = opId("dano");
      UI.modal({ titulo: "Dano em " + p.nome, conteudo: [v, tipo, marca("Metade (resistiu)", false, function (x) { op.metade = x; }), marca("Não letal", false, function (x) { op.naoLetal = x; }), marca("Perda de vida", false, function (x) { op.perdaDeVida = x; })], botoes: [{ rotulo: "Cancelar" }, { rotulo: "Aplicar", classe: "r-botao--principal", aoClicar: function (f) { f(); return operarFichas(Object.assign({ tipo: "dano", personagem: p.id, valor: ler(v, 0), tipoDano: tipo.entrada.value }, op), id).then(function (r) { if (r.ok && r.dados && r.dados.resultado) UI.aviso(p.nome + ": " + r.dados.resultado.dano + " de dano, PV " + r.dados.resultado.pv + (r.dados.resultado.estado !== "ok" ? " (" + r.dados.resultado.estado + ")" : "")); }); } }] });
    }
    function dialogoCondicaoPC(ids) {
      var sel = selecao("Condição", D().CONDICOES.map(function (c) { return { valor: c.id, rotulo: c.nome }; }), D().CONDICOES[0].id);
      var rem = { v: false };
      UI.modal({ titulo: "Condição", conteudo: [sel, marca("Remover em vez de aplicar", false, function (v) { rem.v = v; })], botoes: [{ rotulo: "Cancelar" }, { rotulo: "Aplicar", classe: "r-botao--principal", aoClicar: function (f) { f(); return operarFichas({ tipo: "condicao", personagens: ids, condicao: sel.entrada.value, remover: rem.v }); } }] });
    }
    function dialogoDescanso() {
      var cond = selecao("Condição de descanso", D().DESCANSO.map(function (d) { return { valor: d.chave, rotulo: d.nome + " (×" + d.fator + ")" }; }), "normal");
      var alvos = {}; mem.personagens.forEach(function (p) { alvos[p.id] = true; });
      UI.modal({ titulo: "Descanso", conteudo: [cond].concat(mem.personagens.map(function (p) { return marca(p.nome, true, function (v) { alvos[p.id] = v; }); })), botoes: [{ rotulo: "Cancelar" }, { rotulo: "Descansar", classe: "r-botao--principal", aoClicar: function (f) { f(); return operarFichas({ tipo: "descanso", condicao: cond.entrada.value, personagens: Object.keys(alvos).filter(function (k) { return alvos[k]; }) }); } }] });
    }

    /* ------------------------------------------------ perigos */
    function painelPerigos(e) {
      var complexos = A().PERIGOS.filter(function (p) { return p.tipo === "complexo"; });
      var armadilhas = A().PERIGOS.filter(function (p) { return p.tipo === "armadilha"; });
      return UI.painel("Perigos", [
        el("div.faixa", {}, [selecao("Perigo complexo (p. 320)", complexos.map(function (p) { return { valor: p.id, rotulo: p.nome + " · ND " + p.nd }; }), complexos[0].id, function (v) { mem.perigoEscolhido = v; }), mini("Iniciar", function () { var id = mem.perigoEscolhido || complexos[0].id; var extra = id === "jornadaPelosErmos" ? { tamanho: "media" } : {}; operar(function (x) { return MS().iniciarPerigo(x, id, { extra: extra }); }); })]),
        el("div.pilha", {}, e.perigos.filter(function (p) { return p.ativo; }).map(function (p) { return cartaoPerigo(e, p); })),
        UI.recolhivel({ titulo: "Armadilhas (p. 317–318)", conteudo: [el("ul.t20-lista", {}, armadilhas.map(function (a) { return el("li", {}, [el("strong", { texto: a.nome + " · ND " + a.nd + (a.magica ? " · mágica" : "") }), el("span", { texto: " " + a.resumo + (a.res ? " " + ({ reflexos: "Reflexos", fortitude: "Fortitude", vontade: "Vontade" })[a.res] + " CD " + a.cd + " " + a.efeitoRes + "." : "") + " Investigação CD " + a.investigacao + ", Ladinagem CD " + a.ladinagem + "." }), a.dano ? mini("Rolar " + a.dano, function () { T().rolarExpressao(a.nome, a.dano); }) : null]); }))] }),
        UI.recolhivel({ titulo: "Doenças e ambiente (p. 317–319)", conteudo: [el("ul.t20-lista", {}, A().DOENCAS.map(function (d) { return el("li", { texto: d.nome + " · " + d.via + " · CD " + d.cd + " · " + d.estagios.join(" / ") }); }).concat(A().AMBIENTE.map(function (x) { return el("li", { texto: x.nome + ": " + x.r + " (p. " + x.pagina + ")" }); })))] }),
      ]);
    }
    function cartaoPerigo(e, p) {
      var def = A().PERIGO[p.perigoId];
      var quem = selecao("Quem", mem.personagens.map(function (x) { return { valor: x.id, rotulo: x.nome }; }).concat([{ valor: "grupo", rotulo: "O grupo" }]), mem.personagens[0] ? mem.personagens[0].id : "grupo");
      var acao = selecao("Ação", (def.acoes || []).map(function (a, i) { return { valor: String(i), rotulo: a.n + (a.pericia ? " (" + a.pericia + (a.cd ? " CD " + a.cd : "") + ")" : "") }; }), "0");
      var total = numero("Total do teste"), nat = numero("d20 natural");
      var res = MS().resultadoDoPerigo(e, p.id);
      return el("div.t20-perigo", {}, [
        el("strong", { texto: def.nome + " · rodada " + p.rodada + (def.rodadas ? " de " + def.rodadas : "") }), el("p.t-mini", { texto: def.objetivo + " " + (def.efeito || "") }),
        el("p", { texto: "Sucessos: " + (Object.keys(p.sucessos).map(function (k) { var x = pc(k); return (x ? x.nome : k) + " " + p.sucessos[k]; }).join(", ") || "nenhum") + " · falhas: " + p.falhas }),
        el("div.faixa", {}, [quem, acao, total, nat, mini("Registrar teste", function () {
          var a = def.acoes[Number(acao.entrada.value)] || {};
          var cdv = a.cd || (def.cdPorTerreno ? 20 : 15);
          operar(function (x) { return MS().testeDePerigo(x, p.id, quem.entrada.value, a.n, ler(total, 0), cdv, { natural: ler(nat, null), dobraCom10: a.n === "Correr", compartilhado: !!def.sucessosPor }); });
        })]),
        el("div.faixa", {}, [mini("Próxima rodada", function () { operar(function (x) { return MS().avancarPerigo(x, p.id); }); }), mini("Resultado", function () { UI.aviso(Object.keys(res.porPersonagem).map(function (k) { var x = pc(k); return (x ? x.nome : k) + ": " + (res.porPersonagem[k] || {}).efeito; }).join(" · ") + (res.tresFalhas ? " · Três falhas: " + res.tresFalhas : "") || "Sem resultado ainda.", { duracao: 12000 }); }), mini("Encerrar", function () { operar(function (x) { return MS().encerrarPerigo(x, p.id); }); }, { classe: "r-botao--fantasma" })]),
      ]);
    }

    /* ------------------------------------------------ ferramentas */
    function painelFerramentas(e) {
      return UI.recolhivel({ titulo: "Ferramentas do mestre", conteudo: [el("div.pilha", {}, [
        el("div.faixa", {}, [
          mini("Evento de perseguição", function () { var x = MD().eventoDePerseguicao(T().rolar); UI.aviso("d20 " + x.d20 + ": " + (x.tipo === "nenhum" ? "nada" : x.tipo + " — " + R().nomePericia(x.pericia) + " CD " + x.cd + " (" + x.exemplo + ")")); }),
          mini("Desafio de busca (2d12)", function () { var x = MD().desafioDeBusca(T().rolar); UI.aviso("Busca: " + R().nomePericia(x.pericia) + " — " + x.exemplo + " (CD 20 + ½ nível)"); }),
          mini("Gerar NPC (Tabela 7-2)", function () { dialogoNPC(); }),
          mini("Viagem", function () { dialogoViagem(); }),
        ]),
        UI.recolhivel({ titulo: "Clima (p. 267)", conteudo: [el("ul.t20-lista", {}, MD().CLIMA.map(function (c) { return el("li", { texto: c.nome + ": " + c.r }); }))] }),
        UI.recolhivel({ titulo: "Terrenos (p. 268–269)", conteudo: [el("ul.t20-lista", {}, MD().TERRENOS.map(function (t) { return el("li", { texto: t.nome + ": " + t.elementos.join(" ") }); }).concat(MD().ELEMENTOS_ERMOS.map(function (x) { return el("li", { texto: x.nome + ": " + x.r }); })))] }),
        UI.recolhivel({ titulo: "Tempo entre aventuras (p. 276–279)", conteudo: [linha("Uma ação por mês: trabalho (Ofício), treinamento (três testes do atributo, CD 10 + ½ nível; dois sucessos dão um benefício do próximo nível) ou busca (três perícias, CD 20 + ½ nível). Custo de vida: pobre T$ 10 (ruim), médio T$ 50 (normal), rico T$ 100 (confortável), luxuoso T$ 200 (luxuosa)."), el("ul.t20-lista", {}, Object.keys(MD().CONSEQUENCIAS_TEXTO).map(function (k) { return el("li", { texto: k + ": " + MD().CONSEQUENCIAS_TEXTO[k] }); }))] }),
        UI.recolhivel({ titulo: "Ambientes urbanos (p. 271–275)", conteudo: [el("ul.t20-lista", {}, MD().URBANO.map(function (x) { return el("li", { texto: x.nome + ": " + x.r }); }))] }),
      ])] });
    }
    function dialogoNPC() {
      var nome = UI.campo({ rotulo: "Nome", valor: "NPC" }), nd = selecao("ND", Object.keys(A().TABELA_NPC).map(function (k) { return { valor: k, rotulo: "ND " + k }; }), "1");
      var per = UI.campo({ rotulo: "Perícias fortes (chaves separadas por vírgula)", valor: "luta, iniciativa" });
      UI.modal({ titulo: "Gerar ficha de NPC", conteudo: [nome, nd, per, linha("Estatísticas pela Tabela 7-2 (p. 323); ajuste à vontade sem mudar o ND demais.")], botoes: [{ rotulo: "Cancelar" }, { rotulo: "Pôr no combate", classe: "r-botao--principal", aoClicar: function (f) {
        var npc = A().gerarNPC({ nome: nome.entrada.value, nd: nd.entrada.value, pericias: per.entrada.value.split(",").map(function (s) { return s.trim(); }).filter(Boolean) });
        var def = A().daFicha(npc);
        operar(function (x) { return MS().adicionarAmeaca(x, def, 1, {}); });
        f();
      } }] });
    }
    function dialogoViagem() {
      var desl = numero("Deslocamento do mais lento (m)", 9);
      var op = { terrenoDificil: false, climaRuim: false, marchaForcada: false };
      var saida = el("p", { role: "status" });
      function calc() { var r = MD().viagem(ler(desl, 9), op); saida.textContent = r.porHora + " km por hora · " + r.porDia + " km por dia (8 horas)" + (op.marchaForcada ? " · Fortitude CD 15 (+1) por hora ou perde 1d6 PV" : ""); }
      desl.entrada.addEventListener("input", calc); calc();
      UI.modal({ titulo: "Viagem (Tabela 6-4)", conteudo: [desl, marca("Terreno difícil", false, function (v) { op.terrenoDificil = v; calc(); }), marca("Clima ruim", false, function (v) { op.climaRuim = v; calc(); }), marca("Marcha forçada", false, function (v) { op.marchaForcada = v; calc(); }), saida], botoes: [{ rotulo: "Fechar" }] });
    }

    carregar();
    return alvo;
  }

  global.RAMACampanhaTormenta20 = { aba: aba };
})(window);
