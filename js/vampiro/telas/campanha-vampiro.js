/* =====================================================================
   R.A.M.A. — aba Crônica da campanha de Vampiro (v5.0)
   ---------------------------------------------------------------------
   A ferramenta de toda campanha de Vampiro. O Narrador (mestre)
   conduz; os jogadores veem a VISTA DOS JOGADORES — calculada no
   servidor: sem PNs ocultos, sem notas privadas, sem relações que
   revelem quem está escondido, sem o registro privado.

     Tempo          história, sessão, noite, cena e turno — cada um gera
                    os MOMENTOS certos nas fichas (vampiro_operar): a
                    sessão não é uma noite; a noite traz a Checagem do
                    despertar; o fim da sessão, Ambição, XP e Remorso
     Fichas         XP, Máculas, dano, Diablerie — decididos aqui e
                    aplicados pelo servidor
     Princípios     da Crônica
     Coterie        tipo, membros, Domínio (Chasse, Lien, Portillon),
                    a parada da coterie
     Personagens    PNs e antagonistas (modelos do livro, copiados),
                    visíveis ou ocultos, notas públicas e privadas
     Relações       o Mapa de Relacionamentos: liga ids (PC ou PN)
     Conflitos, testes estendidos, Memoriam, Favores, Registro

   Cada ação: cópia do estado → regra (js/vampiro/cronica.js) →
   salvar_vampiro (rev + opId) → momentos nas fichas (opId próprio).
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil, UI = global.RAMAUI, el = U.el;
  function C() { return global.RAMAVampiroCatalogo; }
  function CR() { return global.RAMAVampiroCronica; }
  function AN() { return global.RAMAVampiroAntagonistas; }
  function D() { return global.RAMAVampiroDados; }

  function opId() { return "vp-" + U.uuid().replace(/-/g, "").slice(0, 24); }
  function mini(texto, aoClicar, op) {
    var x = op || {};
    return el("button.r-botao.r-botao--mini" + (x.classe ? "." + x.classe : ""), { type: "button", texto: texto, disabled: !!x.desligado, title: x.dica || "", onclick: aoClicar });
  }
  function linha(t) { return el("p.t-mini", { texto: t }); }
  function campo(rotulo, valor, op) { return UI.campo(Object.assign({ rotulo: rotulo, valor: valor === undefined ? "" : valor }, op || {})); }
  function selecao(rotulo, opcoes, valor) { return UI.campo({ rotulo: rotulo, tipo: "selecao", valor: valor, opcoes: opcoes }); }
  function marca(rotulo, marcado, aoMudar) { return el("label.r-marca", {}, [el("input", { type: "checkbox", checked: !!marcado, onchange: function (ev) { aoMudar(ev.currentTarget.checked); } }), el("span", { texto: rotulo })]); }

  var FRASES = {
    checagem: function (e) { return "Checagem " + (e.sucesso ? "sem custo" : "— a Fome sobe"); },
    fome: function (e) { return e.de !== e.para ? "Fome " + e.de + "→" + e.para : ""; },
    torpor: function () { return "entrou em Torpor"; },
    remorso: function (e) { return "Remorso: " + e.sucessos + " sucesso(s)"; },
    humanidade: function (e) { return "Humanidade " + e.de + "→" + e.para; },
    maculas: function (e) { return "Máculas " + e.de + "→" + e.para; },
    xp: function (e) { return (e.valor >= 0 ? "+" : "") + e.valor + " XP"; },
    frenesiPendente: function () { return "teste de frenesi pendente (na ficha)"; },
    morteFinal: function () { return "Morte Final"; },
    dano: function (e) { return (e.superficial ? e.superficial + " Sup. " : "") + (e.agravado ? e.agravado + " Agr." : ""); },
  };

  function aba(ctx) {
    var alvo = el("div.pilha.vamp-cronica", {}, [UI.carregando("Abrindo a crônica")]);
    var mem = { estado: null, vista: null, mestre: ctx.ehMestre(), rev: 0, ocupado: false, personagens: [] };

    async function carregar(segundoPlano) {
      var r = await global.RAMAApi.lerVampiro(ctx.campanhaId, { segundoPlano: !!segundoPlano });
      if (!r.ok) { if (!segundoPlano) U.trocar(alvo, UI.erroDeTela(r, function () { carregar(); })); return; }
      receber(r);
      pintar();
    }
    function receber(r) {
      mem.rev = U.inteiro(r.rev, 0);
      mem.mestre = !!(r.dados && r.dados.mestre);
      mem.estado = mem.mestre ? CR().normalizar(r.dados.estado) : null;
      mem.vista = mem.mestre ? null : r.dados.vista;
      if (r.dados && Array.isArray(r.dados.personagens)) mem.personagens = r.dados.personagens;
    }

    if (ctx.aoAtualizar) {
      ctx.aoAtualizar("cronica", function () { if (!mem.ocupado) carregar(true); });
      ctx.aoAtualizar("personagens", function () { if (!mem.ocupado) pintar(); });
    }

    /* Os PCs de Vampiro: os que o servidor listou (pela projeção). */
    function pcs() { return mem.personagens.length ? mem.personagens : ctx.personagens.filter(function (p) { return p.tipoFicha === "vampiro"; }).map(function (p) { return { id: p.id, nome: p.nome }; }); }
    function nomeDe(id) {
      var pc = pcs().filter(function (p) { return p.id === id; })[0];
      if (pc) return pc.nome;
      var e = mem.estado || mem.vista;
      var pn = e ? e.personagens.filter(function (p) { return p.id === id; })[0] : null;
      return pn ? pn.nome : "—";
    }
    function pessoas() {
      var e = mem.estado || mem.vista;
      return pcs().map(function (p) { return { valor: p.id, rotulo: p.nome + " (PC)" }; }).concat(e ? e.personagens.map(function (p) { return { valor: p.id, rotulo: p.nome + (p.visivel === false ? " (oculto)" : "") }; }) : []);
    }

    /* Uma operação na crônica: cópia → regra → gravação → momentos. */
    async function operar(fn) {
      if (mem.ocupado) return false;
      var copia = CR().normalizar(U.copiar(mem.estado));
      var r = fn(copia) || { ok: true };
      if (r.ok === false) { UI.avisoAtencao(r.motivo || "Não deu para aplicar."); return false; }
      mem.ocupado = true;
      var id = opId();
      try {
        var g = await global.RAMAApi.salvarVampiro(ctx.campanhaId, mem.rev, id, copia);
        if (!g.ok) {
          if (g.erro === "conflito" && g.dados) { receber(g); pintar(); UI.avisoAtencao("Outra janela mudou a crônica antes. A tela foi atualizada: confira e refaça."); return false; }
          UI.avisoDeFalha(g, "gravação da crônica");
          return false;
        }
        receber(g);
        if (r.momentos && r.momentos.length) await operarFichas(id + "-m", { tipo: "momentos", momentos: r.momentos });
        pintar();
        return true;
      } finally { mem.ocupado = false; }
    }

    /* Nas fichas (momentos, XP, Máculas, dano, Diablerie): o servidor
       aplica, uma vez por id. */
    async function operarFichas(id, operacao) {
      var r = await global.RAMAApi.vampiroOperar(ctx.campanhaId, id, operacao);
      if (!r.ok) { UI.avisoDeFalha(r, "aplicar nas fichas", { tentarDeNovo: function () { operarFichas(id, operacao); } }); return r; }
      var evs = (r.dados && r.dados.eventos) || [];
      var porPc = {};
      evs.forEach(function (e) { var f = FRASES[e.tipo]; var t = f ? f(e) : ""; if (!t) return; (porPc[e.personagem] = porPc[e.personagem] || []).push(t); });
      var frases = Object.keys(porPc).map(function (k) { return nomeDe(k) + ": " + porPc[k].slice(0, 3).join(", "); });
      if (frases.length) UI.aviso(frases.slice(0, 4).join(" · ") + (frases.length > 4 ? " …" : ""), { duracao: 10000 });
      if (r.dados && r.dados.gravadas && ctx.sincronizarAgora) ctx.sincronizarAgora();
      return r;
    }

    function pintar() {
      var y = global.scrollY;
      U.trocar(alvo, mem.mestre ? vistaDoNarrador(mem.estado) : vistaDoJogador(mem.vista));
      if (alvo.isConnected) global.scrollTo(0, y);
    }

    /* =================================================================
       JOGADOR
       ================================================================= */

    function vistaDoJogador(v) {
      if (!v) return [UI.vazio({ titulo: "Crônica", texto: "A crônica ainda não chegou. Recarregue a página." })];
      return [
        UI.painel("Agora", [resumoDoTempo(v)]),
        v.principios.length ? UI.painel("Princípios da Crônica", [el("ul.vamp-lista", {}, v.principios.map(function (p) { return el("li", { texto: p.texto }); }))]) : null,
        v.coterie && (v.coterie.nome || v.coterie.membros.length) ? UI.painel("Coterie", [coterieLeitura(v.coterie)]) : null,
        v.personagens.length ? UI.painel("Personagens conhecidos", [el("ul.vamp-lista", {}, v.personagens.map(function (p) { return el("li", {}, [el("strong", { texto: p.nome }), p.notasPublicas ? el("p.t-mini", { texto: p.notasPublicas }) : null]); }))]) : null,
        v.relacoes.length ? UI.painel("Mapa de Relacionamentos", [mapa(v)]) : null,
        v.conflitos.length ? UI.painel("Conflitos", v.conflitos.map(function (c) { return linha(c.nome + " · " + (c.tipo === "social" ? "social" : "físico") + " · rodada " + c.rodada + " · " + c.participantes.map(function (p) { return p.nome || nomeDe(p.ref); }).join(", ")); })) : null,
        v.testesEstendidos.length ? UI.painel("Testes estendidos", v.testesEstendidos.map(function (t) { return linha(t.nome + ": " + t.total + "/" + t.alvo + (t.encerrado ? " (encerrado)" : "")); })) : null,
        v.memoriams.length ? UI.painel("Memoriam", v.memoriams.map(function (m) { return linha(nomeDe(m.personagemId) + ": " + m.objetivo + (m.resultado ? " — " + m.resultado : "")); })) : null,
        v.favores.length ? UI.painel("Favores", v.favores.map(function (f) { return linha(nomeDe(f.de) + " deve a " + nomeDe(f.para) + " um favor " + C().FAVORES[f.nivel].nome.toLowerCase() + (f.pago ? " (pago)" : "") + (f.descricao ? ": " + f.descricao : "")); })) : null,
        registro(v.registro),
      ];
    }

    function resumoDoTempo(v) {
      return el("div.pilha.pilha--curta", {}, [
        el("p", { texto: [v.historia && v.historia.nome ? "História: " + v.historia.nome : "", "Sessão " + v.sessao + (v.sessaoAberta ? " (aberta)" : ""), "Noite " + v.noite, v.cena ? CR().TIPOS_DE_CENA[v.cena.tipo] + (v.cena.nome ? " — " + v.cena.nome : "") + (v.cena.turno ? ", turno " + v.cena.turno : "") : "sem cena aberta"].filter(Boolean).join(" · ") }),
        v.epoca ? linha("Época: " + v.epoca) : null,
      ]);
    }

    function coterieLeitura(co) {
      var t = C().COTERIES[co.tipo];
      return el("div.pilha.pilha--curta", {}, [
        el("p", { texto: (co.nome || "Coterie") + (t ? " · " + t.nome : "") }),
        linha("Membros: " + (co.membros.map(nomeDe).join(", ") || "—")),
        el("dl.vamp-dl", {}, ["chasse", "lien", "portillon"].reduce(function (l, k) { return l.concat([el("dt", { texto: C().DOMINIO[k].nome + " " + co.dominio[k] }), el("dd", { texto: C().DOMINIO[k].texto })]); }, [])),
        co.dominio.chasse ? linha("Caçar no domínio: Dificuldade " + C().dificuldadeDeCacaDoChasse(co.dominio.chasse) + ".") : null,
        co.antecedentes.length ? linha("Antecedentes: " + co.antecedentes.map(function (a) { return C().VANTAGENS[a.chave].nome + " " + a.pontos; }).join(", ")) : null,
        co.defeitos.length ? linha("Defeitos: " + co.defeitos.map(function (a) { return C().VANTAGENS[a.chave].nome + " " + a.pontos; }).join(", ")) : null,
      ]);
    }

    /* O mapa: cada pessoa e as ligações que saem dela. Uma lista é
       legível por leitor de tela e no celular; nada depende de cor. */
    function mapa(e) {
      var porDe = {};
      e.relacoes.forEach(function (r) { (porDe[r.de] = porDe[r.de] || []).push(r); });
      return el("ul.vamp-mapa", {}, Object.keys(porDe).map(function (de) {
        return el("li", {}, [el("strong", { texto: nomeDe(de) }), el("ul", {}, porDe[de].map(function (r) {
          return el("li", {}, [el("span", { texto: (r.direcao === "dupla" ? "⇄ " : "→ ") + nomeDe(r.para) + " · " + r.tipo + (r.descricao ? " — " + r.descricao : "") + (r.visivel === false ? " (privada)" : "") }),
            mem.mestre ? mini("Tirar", function () { operar(function (x) { x.relacoes = x.relacoes.filter(function (y) { return y.id !== r.id; }); return { ok: true }; }); }) : null]);
        }))]);
      }));
    }

    function registro(lista) {
      if (!lista || !lista.length) return null;
      return UI.painel("Registro", [el("ol.vamp-registro", { reversed: true }, lista.slice(-40).reverse().map(function (r) { return el("li", { texto: "S" + r.sessao + " N" + r.noite + " · " + r.texto + (r.privado ? " (privado)" : "") }); }))]);
    }

    /* =================================================================
       NARRADOR
       ================================================================= */

    function vistaDoNarrador(e) {
      return [
        UI.painel("Tempo da crônica", [resumoDoTempo(e), painelDoTempo(e)]),
        UI.painel("Nas fichas", [painelFichas(e)]),
        UI.painel("Princípios da Crônica", [painelPrincipios(e)]),
        UI.painel("Coterie e Domínio", [painelCoterie(e)]),
        UI.painel("Personagens do Narrador", [painelPNs(e)]),
        UI.painel("Mapa de Relacionamentos", [e.relacoes.length ? mapa(e) : linha("Nenhuma relação."), novaRelacao(e)]),
        UI.painel("Conflitos", [painelConflitos(e)]),
        UI.painel("Testes estendidos", [painelEstendidos(e)]),
        UI.painel("Memoriam", [painelMemoriam(e)]),
        UI.painel("Favores (Prestação)", [painelFavores(e)]),
        UI.painel("Anotar no registro", [painelAnotar()]),
        registro(e.registro),
      ];
    }

    function painelDoTempo(e) {
      var hist = campo("Nova história", "", { limite: 120 });
      var cenaNome = campo("Nome da cena", "", { limite: 120 });
      var cenaTipo = selecao("Tipo", Object.keys(CR().TIPOS_DE_CENA).map(function (k) { return { valor: k, rotulo: CR().TIPOS_DE_CENA[k] }; }), "destaque");
      var cenaModo = selecao("Modo", Object.keys(CR().MODOS_DE_JOGO).map(function (k) { return { valor: k, rotulo: CR().MODOS_DE_JOGO[k] }; }), "dados");
      var continua = false;
      var epoca = campo("Época da crônica", e.epoca, { limite: 120, aoMudar: function (v) { operar(function (x) { x.epoca = v; return { ok: true }; }); } });
      return el("div.pilha", {}, [
        epoca,
        el("div.faixa", {}, [hist, mini("Iniciar história", function () { if (hist.entrada.value.trim()) operar(function (x) { return CR().iniciarHistoria(x, hist.entrada.value.trim()); }); })]),
        el("div.faixa", {}, e.sessaoAberta ? [mini("Encerrar sessão", function () { encerrarSessao(e); })] : [
          marca("A sessão anterior parou no meio de uma cena de ação", false, function (v) { continua = v; }),
          mini("Iniciar sessão", function () { operar(function (x) { return CR().iniciarSessao(x, { continuaCena: continua }); }); }, { dica: "Recupera a FdV das fichas. Não é noite nova." }),
        ]),
        el("div.faixa", {}, [mini("Nova noite (despertar)", function () { operar(function (x) { return CR().novaNoite(x); }); }, { dica: "Cada vampiro faz a Checagem do despertar; efeitos da noite expiram." })]),
        el("div.editar-grade", {}, [cenaNome, cenaTipo, cenaModo]),
        el("div.faixa", {}, [
          mini(e.cena ? "Nova cena (encerra a atual)" : "Abrir cena", function () { operar(function (x) { return CR().novaCena(x, { nome: cenaNome.entrada.value, tipo: cenaTipo.entrada.value, modo: cenaModo.entrada.value }); }); }),
          e.cena ? mini("Encerrar cena", function () { operar(function (x) { return CR().encerrarCena(x); }); }) : null,
          e.cena ? mini("Próximo turno", function () { operar(function (x) { return CR().proximoTurno(x); }); }) : null,
        ]),
      ]);
    }

    function encerrarSessao(e) {
      var amb = {};
      var xp = UI.campo({ rotulo: "XP da sessão", tipo: "numero", valor: 1 });
      var fim = false;
      UI.modal({
        titulo: "Encerrar a sessão",
        conteudo: [
          linha("Quem trabalhou a Ambição recupera 1 Agravado de FdV. Quem tem Máculas rola o Remorso agora."),
          el("div.pilha.pilha--curta", {}, pcs().map(function (p) { return marca(p.nome + ": trabalhou a Ambição", false, function (v) { amb[p.id] = v; }); })),
          xp, marca("Fim da história (+1 XP)", false, function (v) { fim = v; }),
        ],
        botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Encerrar", classe: "r-botao--principal", aoClicar: function (f) {
          f(); operar(function (x) { return CR().encerrarSessao(x, { ambicao: amb, xp: U.inteiro(xp.entrada.value, 0), fimDaHistoria: fim }); });
        } }],
      });
    }

    function painelFichas(e) {
      var lista = pcs();
      if (!lista.length) return linha("Nenhuma ficha de Vampiro nesta campanha ainda.");
      var opcoesPc = lista.map(function (p) { return { valor: p.id, rotulo: p.nome }; });
      var xpPara = {};
      var xpValor = UI.campo({ rotulo: "XP", tipo: "numero", valor: 1 });
      var xpMotivo = campo("Motivo", "", { limite: 200 });
      var macPc = selecao("Personagem", opcoesPc, lista[0].id), macN = UI.campo({ rotulo: "Máculas", tipo: "numero", valor: 1 }), macMotivo = campo("Motivo (Princípio violado…)", "", { limite: 200 });
      var danoPc = selecao("Personagem", opcoesPc, lista[0].id);
      var danoTrilha = selecao("Trilha", [{ valor: "vitalidade", rotulo: "Vitalidade" }, { valor: "forcaDeVontade", rotulo: "Força de Vontade" }], "vitalidade");
      var danoTipo = selecao("Tipo", [{ valor: "superficial", rotulo: "Superficial" }, { valor: "agravado", rotulo: "Agravado" }], "superficial");
      var danoN = UI.campo({ rotulo: "Quanto", tipo: "numero", valor: 1 });
      var danoFonte = selecao("Fonte", [{ valor: "fisico", rotulo: "Física" }, { valor: "social", rotulo: "Social" }, { valor: "fogo", rotulo: "Fogo" }, { valor: "sol", rotulo: "Sol" }], "fisico");
      var checPc = selecao("Pedir Checagem de", opcoesPc, lista[0].id), checMotivo = campo("Motivo", "", { limite: 80 });
      var diaQuem = selecao("Diabolista", opcoesPc, lista[0].id), diaVit = selecao("Vítima (PC)", opcoesPc, lista[lista.length - 1].id);
      return el("div.pilha", {}, [
        el("h4.t-rotulo", { texto: "Conceder XP" }),
        el("div.vamp-criar__checks", {}, lista.map(function (p) { return marca(p.nome, false, function (v) { xpPara[p.id] = v; }); })),
        el("div.editar-grade", {}, [xpValor, xpMotivo, mini("Conceder", function () {
          var ids = Object.keys(xpPara).filter(function (k) { return xpPara[k]; });
          if (!ids.length) { UI.avisoAtencao("Marque quem recebe."); return; }
          operarFichas(opId(), { tipo: "xp", personagens: ids, valor: U.inteiro(xpValor.entrada.value, 0), motivo: xpMotivo.entrada.value || "Narrador" });
        })]),
        el("h4.t-rotulo", { texto: "Máculas" }),
        el("div.editar-grade", {}, [macPc, macN, macMotivo, mini("Aplicar", function () { operarFichas(opId(), { tipo: "maculas", persona: macPc.entrada.value, valor: U.inteiro(macN.entrada.value, 1), motivo: macMotivo.entrada.value }); })]),
        el("h4.t-rotulo", { texto: "Dano" }),
        el("div.editar-grade", {}, [danoPc, danoTrilha, danoTipo, danoN, danoFonte, mini("Aplicar", function () { operarFichas(opId(), { tipo: "dano", persona: danoPc.entrada.value, trilha: danoTrilha.entrada.value, tipoDeDano: danoTipo.entrada.value, valor: U.inteiro(danoN.entrada.value, 1), fonte: danoFonte.entrada.value }); })]),
        el("h4.t-rotulo", { texto: "Checagem de Sangue" }),
        el("div.editar-grade", {}, [checPc, checMotivo, mini("Rolar no servidor", function () { operarFichas(opId(), { tipo: "momentos", momentos: [{ tipo: "checagem", personagemId: checPc.entrada.value, motivo: checMotivo.entrada.value || "Narrador" }] }); })]),
        el("h4.t-rotulo", { texto: "Diablerie consumada" }),
        linha("As etapas por turno (Força + Determinação, Dif. 3) são roladas na ficha do diabolista. Aqui se registra o fim: a vítima sofre a Morte Final; o diabolista recebe o processo do livro."),
        el("div.editar-grade", {}, [diaQuem, diaVit, mini("Consumar", function () {
          if (diaQuem.entrada.value === diaVit.entrada.value) return;
          UI.confirmar({ titulo: "Diablerie", texto: nomeDe(diaQuem.entrada.value) + " consome " + nomeDe(diaVit.entrada.value) + ". A vítima sofre a Morte Final (a ficha fica).", rotuloConfirmar: "Consumar", perigo: true }).then(function (sim) {
            if (sim) operarFichas(opId(), { tipo: "diablerie", quem: diaQuem.entrada.value, vitima: diaVit.entrada.value });
          });
        })]),
      ]);
    }

    function painelPrincipios(e) {
      var novo = campo("Novo Princípio", "", { limite: 300 });
      return el("div.pilha.pilha--curta", {}, [
        e.principios.length ? el("ul.vamp-lista", {}, e.principios.map(function (p) { return el("li.faixa", {}, [el("span", { texto: p.texto }), mini("Tirar", function () { operar(function (x) { x.principios = x.principios.filter(function (y) { return y.id !== p.id; }); return { ok: true }; }); })]); })) : linha("Nenhum. Violar um Princípio gera Máculas (p. 172)."),
        el("div.faixa", {}, [novo, mini("Adicionar", function () { var t = novo.entrada.value.trim(); if (t) operar(function (x) { CR().adicionarPrincipio(x, t); return { ok: true }; }); }, { desligado: e.principios.length >= 10 })]),
      ]);
    }

    function painelCoterie(e) {
      var co = e.coterie;
      var par = CR().parada(e);
      var nome = campo("Nome", co.nome, { limite: 120, aoMudar: function (v) { operar(function (x) { return CR().definirCoterie(x, { nome: v }); }); } });
      var tipo = selecao("Tipo de coterie", [{ valor: "", rotulo: "Sem tipo" }].concat(Object.keys(C().COTERIES).map(function (k) { return { valor: k, rotulo: C().COTERIES[k].nome }; })), co.tipo);
      tipo.entrada.addEventListener("change", function () { operar(function (x) { return CR().definirCoterie(x, { tipo: tipo.entrada.value }); }); });
      var membros = el("div.vamp-criar__checks", {}, pcs().map(function (p) {
        return marca(p.nome, co.membros.indexOf(p.id) >= 0, function (v) { operar(function (x) { var m = x.coterie.membros.filter(function (y) { return y !== p.id; }); if (v) m.push(p.id); return CR().definirCoterie(x, { membros: m }); }); });
      }));
      var dominio = el("div.editar-grade", {}, ["chasse", "lien", "portillon"].map(function (k) {
        return el("div.r-campo", {}, [el("span.t-rotulo", { texto: C().DOMINIO[k].nome }), UI.passo({ valor: co.dominio[k], minimo: 0, maximo: 5, rotulo: C().DOMINIO[k].nome, aoMudar: function (v) { operar(function (x) { x.coterie.dominio[k] = v; return { ok: true }; }); } })]);
      }));
      var t = C().COTERIES[co.tipo];
      return el("div.pilha", {}, [
        el("div.editar-grade", {}, [nome, tipo]),
        t ? linha(t.nome + ": " + (t.extras ? "também pode comprar " + t.extras.join(", ") + "." : "")) : null,
        el("h4.t-rotulo", { texto: "Membros" }), membros,
        marca("Até 3 jogadores: 2 pontos por membro (a critério)", co.pontosExtras > 0, function (v) { operar(function (x) { x.coterie.pontosExtras = v ? 1 : 0; return { ok: true }; }); }),
        el("p.vamp-criar__contador", { role: "status", texto: "Parada da coterie: " + par.total + " · gasto " + par.gasto + " · livre " + par.livre }),
        el("h4.t-rotulo", { texto: "Domínio" }), dominio,
        co.dominio.chasse ? linha("Caçar no domínio: Dificuldade " + C().dificuldadeDeCacaDoChasse(co.dominio.chasse) + ".") : null,
        co.antecedentes.length ? linha("Antecedentes: " + co.antecedentes.map(function (a) { return C().VANTAGENS[a.chave].nome + " " + a.pontos + (a.origem === "tipo" ? " (do tipo)" : ""); }).join(", ")) : null,
        co.defeitos.length ? linha("Defeitos: " + co.defeitos.map(function (a) { return C().VANTAGENS[a.chave].nome + " " + a.pontos + (a.origem === "tipo" ? " (do tipo)" : ""); }).join(", ")) : null,
      ]);
    }

    function painelPNs(e) {
      var modelo = selecao("Modelo do livro", [{ valor: "", rotulo: "Em branco" }].concat(AN().LISTA.map(function (a) { return { valor: a.chave, rotulo: a.nome + " (" + a.natureza + ", p. " + a.pagina + ")" }; })), "");
      var nome = campo("Nome", "", { limite: 120 });
      var visivel = false;
      var lista = e.personagens.map(function (p) {
        var d = p.dados || {};
        var resumo = d.paradas ? "Físico " + d.paradas.fisico + " · Social " + d.paradas.social + " · Mental " + d.paradas.mental + (d.vitalidade ? " · Vitalidade " + d.vitalidade : "") + (d.forcaDeVontade ? " · FdV " + d.forcaDeVontade : "") : d.dificuldade ? "Dificuldade " + d.dificuldade : "";
        return el("li.vamp-pn", { dataset: { visivel: p.visivel ? "1" : "" } }, [
          el("div.faixa", {}, [el("strong", { texto: p.nome }), el("span.r-etiqueta", { texto: p.visivel ? "Visível" : "Oculto" }), p.modelo ? el("span.t-mini", { texto: "modelo: " + (AN().porChave(p.modelo) || {}).nome + (p.personalizado ? " (editado)" : "") }) : null]),
          resumo ? linha(resumo) : null,
          d.excepcionais ? linha("Excepcionais: " + Object.keys(d.excepcionais).map(function (k) { return ((C().habilidade(k) || {}).nome || k) + " " + d.excepcionais[k]; }).join(", ")) : null,
          d.especial ? linha(d.especial) : null,
          UI.recolhivel({ titulo: "Notas e visibilidade", conteudo: [
            campo("Notas públicas (os jogadores veem se visível)", p.notasPublicas, { tipo: "area", linhas: 2, limite: 4000, aoMudar: function (v) { operar(function (x) { return CR().editarPN(x, p.id, { notasPublicas: v }); }); } }),
            campo("Notas privadas (só o Narrador)", p.notasPrivadas, { tipo: "area", linhas: 2, limite: 8000, aoMudar: function (v) { operar(function (x) { return CR().editarPN(x, p.id, { notasPrivadas: v }); }); } }),
            el("div.faixa", {}, [
              mini(p.visivel ? "Ocultar dos jogadores" : "Mostrar aos jogadores", function () { operar(function (x) { return CR().editarPN(x, p.id, { visivel: !p.visivel }); }); }),
              mini("Tirar", function () { operar(function (x) { x.personagens = x.personagens.filter(function (y) { return y.id !== p.id; }); x.relacoes = x.relacoes.filter(function (r) { return r.de !== p.id && r.para !== p.id; }); return { ok: true }; }); }),
            ]),
          ] }),
        ]);
      });
      return el("div.pilha", {}, [
        lista.length ? el("ul.vamp-pns", {}, lista) : linha("Nenhum PN ainda."),
        el("div.editar-grade", {}, [modelo, nome]),
        marca("Visível aos jogadores", false, function (v) { visivel = v; }),
        mini("Adicionar PN", function () { operar(function (x) { CR().adicionarPN(x, { modelo: modelo.entrada.value, nome: nome.entrada.value, visivel: visivel }); return { ok: true }; }); }),
        linha("O modelo é copiado: editar este PN não muda o livro nem outros PNs."),
      ]);
    }

    function novaRelacao(e) {
      var ops = pessoas();
      if (ops.length < 2) return linha("Adicione PCs ou PNs para ligá-los.");
      var de = selecao("De", ops, ops[0].valor), para = selecao("Para", ops, ops[1].valor);
      var tipo = campo("Tipo (Senhor, Pilar, Aliado, Inimigo…)", "", { limite: 60 });
      var desc = campo("Descrição", "", { limite: 600 });
      var dupla = false, visivel = false;
      return el("div.pilha.pilha--curta", {}, [
        el("div.editar-grade", {}, [de, para, tipo, desc]),
        marca("Nos dois sentidos", false, function (v) { dupla = v; }),
        marca("Visível aos jogadores (só se as duas pontas também forem)", false, function (v) { visivel = v; }),
        mini("Ligar", function () { if (de.entrada.value === para.entrada.value || !tipo.entrada.value.trim()) return; operar(function (x) { CR().adicionarRelacao(x, { de: de.entrada.value, para: para.entrada.value, tipo: tipo.entrada.value, descricao: desc.entrada.value, direcao: dupla ? "dupla" : "mao", visivel: visivel }); return { ok: true }; }); }),
      ]);
    }

    function painelConflitos(e) {
      var nome = campo("Nome", "", { limite: 120 });
      var tipo = selecao("Tipo", [{ valor: "fisico", rotulo: "Físico" }, { valor: "social", rotulo: "Social" }], "fisico");
      var escolhidos = {};
      var ativos = e.conflitos.filter(function (c) { return c.ativo; });
      return el("div.pilha", {}, [
        ativos.length ? el("ul.vamp-lista", {}, ativos.map(function (c) {
          return el("li", {}, [el("strong", { texto: c.nome + " · " + (c.tipo === "social" ? "social" : "físico") + " · rodada " + c.rodada }),
            linha(c.participantes.map(function (p) { return (p.nome || nomeDe(p.ref)) + (p.lado ? " (" + p.lado + ")" : ""); }).join(", ")),
            mini("Encerrar", function () { operar(function (x) { var y = x.conflitos.filter(function (z) { return z.id === c.id; })[0]; if (y) y.ativo = false; return { ok: true }; }); })]);
        })) : linha("Nenhum conflito ativo. Ordem: quem age declara; violência física e social seguem p. 123–131."),
        el("div.editar-grade", {}, [nome, tipo]),
        el("div.vamp-criar__checks", {}, pessoas().map(function (p) { return marca(p.rotulo, false, function (v) { escolhidos[p.valor] = v; }); })),
        mini("Novo conflito", function () {
          var parts = Object.keys(escolhidos).filter(function (k) { return escolhidos[k]; }).map(function (k) { return { ref: k, nome: nomeDe(k) }; });
          operar(function (x) { CR().novoConflito(x, { nome: nome.entrada.value || "Conflito", tipo: tipo.entrada.value, participantes: parts }); return { ok: true }; });
        }),
      ]);
    }

    function painelEstendidos(e) {
      var nome = campo("Nome", "", { limite: 120 });
      var variante = selecao("Variante", [{ valor: "padrao", rotulo: "Padrão (soma sucessos)" }, { valor: "dificil", rotulo: "Difícil (soma margens)" }, { valor: "cascata", rotulo: "Em cascata (a margem vira bônus)" }, { valor: "disputa", rotulo: "Disputa" }], "padrao");
      var alvoN = UI.campo({ rotulo: "Sucessos necessários", tipo: "numero", valor: 10 });
      var visivel = true;
      return el("div.pilha", {}, [
        e.testesEstendidos.length ? el("ul.vamp-lista", {}, e.testesEstendidos.map(function (t) {
          var suc = UI.campo({ rotulo: "Sucessos da rolagem", tipo: "numero", valor: "" });
          var dif = UI.campo({ rotulo: "Dificuldade", tipo: "numero", valor: "" });
          return el("li", {}, [el("strong", { texto: t.nome + ": " + t.total + "/" + t.alvo + " em " + t.rolagens + " rolagem(ns)" + (t.encerrado ? " — encerrado" : "") + (t.falhaTotal ? " (falha total zerou)" : "") + (t.bonusProxima ? " · +" + t.bonusProxima + " na próxima" : "") }),
            t.encerrado ? null : el("div.faixa", {}, [suc, dif, mini("Somar", function () {
              var s = U.inteiro(suc.entrada.value, 0), d = dif.entrada.value.trim() === "" ? 0 : U.inteiro(dif.entrada.value, 0);
              var cl = { sucessos: s, julgado: true, vitoria: s >= d, margem: Math.max(0, s - d), falhaTotal: s === 0 };
              operar(function (x) { var r = CR().registrarNoEstendido(x, t.id, { classificacao: cl }); return r.ok ? { ok: true } : r; });
            })])]);
        })) : linha("Nenhum teste estendido."),
        el("div.editar-grade", {}, [nome, variante, alvoN]),
        marca("Visível aos jogadores", true, function (v) { visivel = v; }),
        mini("Novo teste estendido", function () { operar(function (x) { CR().novoTesteEstendido(x, { nome: nome.entrada.value || "Teste", variante: variante.entrada.value, alvo: U.inteiro(alvoN.entrada.value, 10), visivel: visivel }); return { ok: true }; }); }),
      ]);
    }

    function painelMemoriam(e) {
      var lista = pcs();
      if (!lista.length) return linha("Sem fichas na campanha.");
      var pc = selecao("Personagem", lista.map(function (p) { return { valor: p.id, rotulo: p.nome }; }), lista[0].id);
      var quando = campo("Quando (memória)", "", { limite: 200 }), objetivo = campo("Objetivo", "", { limite: 400 });
      var pontos = selecao("Pontos do objetivo", [1, 2, 3].map(function (n) { return { valor: String(n), rotulo: String(n) }; }), "1");
      var noLocal = false, artefato = false;
      return el("div.pilha", {}, [
        e.memoriams.length ? el("ul.vamp-lista", {}, e.memoriams.map(function (m) {
          return el("li.faixa", {}, [el("span", { texto: nomeDe(m.personagemId) + " · " + m.objetivo + " (" + m.pontos + " pt, +" + m.dadosExtras + " dados)" + (m.resultado ? " — " + m.resultado : "") }),
            !m.resultado ? mini("Sucesso", function () { operar(function (x) { var y = x.memoriams.filter(function (z) { return z.id === m.id; })[0]; y.resultado = "sucesso"; return { ok: true }; }); }) : null,
            !m.resultado ? mini("Falha", function () { operar(function (x) { var y = x.memoriams.filter(function (z) { return z.id === m.id; })[0]; y.resultado = "falha"; return { ok: true }; }); }) : null]);
        })) : linha("Uma Memoriam por história e por personagem (p. 311). Entrar custa uma Checagem, rolada no servidor."),
        el("div.editar-grade", {}, [pc, quando, objetivo, pontos]),
        marca("No local da memória (+2)", false, function (v) { noLocal = v; }),
        marca("Com um artefato da época (+3)", false, function (v) { artefato = v; }),
        mini("Entrar em Memoriam", function () { operar(function (x) { return CR().iniciarMemoriam(x, { personagemId: pc.entrada.value, quando: quando.entrada.value, objetivo: objetivo.entrada.value, pontos: U.inteiro(pontos.entrada.value, 1), noLocal: noLocal, artefato: artefato }); }); }),
      ]);
    }

    function painelFavores(e) {
      var ops = pessoas();
      if (ops.length < 2) return linha("Adicione PCs ou PNs.");
      var de = selecao("Quem deve", ops, ops[0].valor), para = selecao("A quem", ops, ops[1].valor);
      var nivel = selecao("Favor", Object.keys(C().FAVORES).map(function (k) { return { valor: k, rotulo: C().FAVORES[k].nome + " — " + C().FAVORES[k].texto }; }), "trivial");
      var desc = campo("Descrição", "", { limite: 400 });
      var visivel = false;
      return el("div.pilha", {}, [
        e.favores.length ? el("ul.vamp-lista", {}, e.favores.map(function (f) {
          return el("li.faixa", {}, [el("span", { texto: nomeDe(f.de) + " deve a " + nomeDe(f.para) + " · " + C().FAVORES[f.nivel].nome + (f.descricao ? " — " + f.descricao : "") + (f.pago ? " (pago)" : "") + (f.visivel ? "" : " (privado)") }),
            !f.pago ? mini("Pago", function () { operar(function (x) { var y = x.favores.filter(function (z) { return z.id === f.id; })[0]; y.pago = true; return { ok: true }; }); }) : null]);
        })) : linha("Nenhum favor registrado."),
        el("div.editar-grade", {}, [de, para, nivel, desc]),
        marca("Visível a todos (as partes sempre veem)", false, function (v) { visivel = v; }),
        mini("Registrar favor", function () { operar(function (x) { x.favores.push({ id: "fv-" + U.uuid(), de: de.entrada.value, para: para.entrada.value, nivel: nivel.entrada.value, descricao: desc.entrada.value, pago: false, visivel: visivel }); return { ok: true }; }); }),
      ]);
    }

    function painelAnotar() {
      var t = campo("Texto", "", { tipo: "area", linhas: 2, limite: 600 });
      var privado = true;
      return el("div.pilha.pilha--curta", {}, [t, marca("Privado (só o Narrador)", true, function (v) { privado = v; }), mini("Anotar", function () { var s = t.entrada.value.trim(); if (s) operar(function (x) { CR().registrar(x, "nota", s, privado); return { ok: true }; }); })]);
    }

    carregar();
    return alvo;
  }

  global.RAMACampanhaVampiro = { aba: aba };
})(window);
