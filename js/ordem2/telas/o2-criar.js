/* =====================================================================
   R.A.M.A. — Ordem Paranormal RPG II · criar uma ficha (v9.0)
   ---------------------------------------------------------------------
   Três caminhos, na ordem de quem quer jogar já:

     Ficha pronta      os 14 personagens dos playtests (Alan, os cinco do
                       Ato II e os oito do Beta). A prévia mostra TUDO
                       antes de copiar — atributos, perícias (com rótulo e
                       atributo impressos quando divergem), habilidades,
                       itens, relações, idade e a fonte —; só "Copiar" cria
                       a ficha, com ids próprios. PV e PD são os impressos.
     Criação livre     dados e recursos direto (níveis 1–10).
     Criação guiada    experimental: d6 nos três atributos com 2 passos
                       livres (teto d10), perícias d4 com 8 passos (teto
                       d8 por entrada), perfil e ocupação/vocação, a
                       habilidade de perfil e — se documentada ou escolhida
                       — a de ocupação; 16 PV e 12 PD de referência de mesa
                       (editáveis; não é regra do livro).
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el;
  function K() { return global.RAMAOrdem2Catalogo; }
  function R() { return global.RAMAOrdem2; }
  function UI() { return global.RAMAUI; }
  function T() { return global.RAMAOrdem2Tela; }

  var DADOS = [4, 6, 8, 10, 12];

  function opcoesDeDado(lista) { return (lista || DADOS).map(function (f) { return { valor: String(f), rotulo: "d" + f }; }); }
  function linhaPar(rotulo, valor) { return el("div", {}, [el("dt", { texto: rotulo }), el("dd", { texto: valor })]); }

  /* A prévia de um preset (também serve de conferência). */
  function previaDoPreset(p) {
    var b = R().dePreset(p.id, "prévia");
    var pr = K().PERFIS_REGRAS[p.perfilRegras];
    var impressos = p.atributosImpressos || {};
    return el("div.pilha.o2-previa", {}, [
      el("div.o2-previa__topo", {}, [
        el("h3.o2-previa__nome", { texto: p.nomeCompleto || p.nome }),
        el("p.t-mini", { texto: K().PERFIS[p.perfil].nome + " · " + p.ocupacao + " · nível " + p.nivel + " · " + pr.nome }),
        T().fonte(p.fonte, p.pagina),
      ]),
      el("dl.o2-pares.o2-pares--linha", {}, [
        linhaPar("Físico", "d" + p.atributos.fisico), linhaPar("Mente", "d" + p.atributos.mente), linhaPar("Emoção", "d" + p.atributos.emocao),
        linhaPar("PV", String(p.pv)), linhaPar("PD", String(p.pd)), p.idade ? linhaPar("Idade", String(p.idade)) : null,
      ]),
      p.resumo ? el("p", { texto: p.resumo }) : null,
      el("details.o2-previa__bloco", { open: true }, [el("summary", { texto: "Perícias (" + b.base.pericias.length + ")" }),
        el("ul.o2-previa__pericias", {}, b.base.pericias.map(function (x) {
          var notas = [];
          if (x.rotuloImpresso) notas.push("na ficha: " + x.rotuloImpresso);
          if (impressos[x.chave]) notas.push("atributo impresso: " + impressos[x.chave] + " (o motor usa " + K().ATRIBUTOS[R().atributoBase(b, x.chave)].nome + ")");
          return el("li", {}, [el("span", { texto: R().nomeDaPericia(b, x) + " d" + x.dado }), notas.length ? el("span.o2-aviso-mini", { texto: " ⚠ " + notas.join("; ") }) : null]);
        }))]),
      el("details.o2-previa__bloco", { open: true }, [el("summary", { texto: "Habilidades e efeitos" }),
        el("ul.pilha.pilha--curta", {}, b.habilidades.map(function (h) { var m = R().motorDe(h); return el("li", {}, [el("strong", { texto: h.nome }), el("span.t-mini", { texto: (m && (m.pd || m.faces) ? " (" + [m.pd ? m.pd + " PD" : "", m.faces ? "d" + m.faces : ""].filter(Boolean).join(", ") + ")" : "") }), el("p.t-mini", { texto: h.texto })]); }))]),
      b.itens.length ? el("details.o2-previa__bloco", {}, [el("summary", { texto: "Equipamento" }), el("ul", {}, b.itens.map(function (i) { return el("li", { texto: i.nome + (i.tipo === "arma" ? " — " + (i.alcance === "distancia" ? "à distância" : "corpo a corpo") + ", dano RA" + (i.dano >= 0 ? "+" : "") + i.dano : "") + (i.armadura ? " — " + i.armadura + " ponto(s) de armadura" : "") + (i.especial ? " · " + i.especial : "") + (i.quantidade !== null ? " ×" + i.quantidade : "") }); }))]) : null,
      b.relacoes.length ? el("details.o2-previa__bloco", {}, [el("summary", { texto: "Relações (" + b.relacoes.length + ")" }), el("ul", {}, b.relacoes.map(function (r) { return el("li", { texto: r.nome + ": " + r.rotulo + (r.grau ? " (grau " + r.grau + " — " + K().GRAUS_RELACAO[r.grau].nome + ")" : " (sem grau: o rótulo da ficha não define grau)") + " — " + r.descricao }); }))]) : null,
    ]);
  }

  function abrir(opcoes) {
    var o = opcoes || {};
    var campanhas = (o.campanhas || []).filter(function (c) { return !c.sistema || c.sistema === "ordem2"; });
    var st = {
      modo: "pronta", preset: "", campanhaId: "", nome: "",
      livre: { perfilRegras: "beta-vigilia", perfil: "executor", ocupacao: "", nivel: 1, atributos: { fisico: 6, mente: 6, emocao: 6 }, pv: 16, pd: 12 },
      guiada: { perfilRegras: "beta-vigilia", perfil: "", ocupacaoId: "", ocupacaoNome: "", atributos: { fisico: 6, mente: 6, emocao: 6 }, pericias: {}, habilidadeOcupacao: "", pv: 16, pd: 12 },
    };
    var corpo = el("div.pilha.o2-criar");

    function campoCampanha() {
      return UI().campo({ rotulo: "Campanha", tipo: "selecao", valor: st.campanhaId, opcoes: [{ valor: "", rotulo: "Sem campanha (jogo local na ficha)" }].concat(campanhas.map(function (c) { return { valor: c.id, rotulo: c.nome }; })), aoMudar: function (v) { st.campanhaId = v; } });
    }
    function abasDeModo() {
      var modos = [["pronta", "Ficha pronta"], ["livre", "Criação livre"], ["guiada", "Criação guiada — experimental"]];
      return el("div.r-abas.o2-criar__modos", { role: "tablist", "aria-label": "Como criar" }, modos.map(function (m) {
        var sel = st.modo === m[0];
        return el("button.r-aba", { type: "button", role: "tab", "aria-selected": String(sel), texto: m[1], onclick: function () { st.modo = m[0]; desenhar(); } });
      }));
    }

    function pronta() {
      var grupos = [["alpha-contemporaneo", "Alpha · contemporâneo"], ["beta-vigilia", "Beta · Vigília (nível 3)"]];
      var p = K().preset(st.preset);
      return el("div.o2-criar__pronta", {}, [
        el("div.o2-presets", {}, grupos.map(function (g) {
          return el("section.o2-presets__grupo", { "aria-label": g[1] }, [
            el("h4.o2-presets__titulo", { texto: g[1] }),
            el("div.o2-presets__lista", { role: "radiogroup", "aria-label": g[1] }, K().PRESETS.filter(function (x) { return x.perfilRegras === g[0]; }).map(function (x) {
              var sel = st.preset === x.id;
              return el("button.o2-preset" + (sel ? ".o2-preset--escolhido" : ""), { type: "button", role: "radio", "aria-checked": String(sel), onclick: function () { st.preset = x.id; st.nome = x.nomeCompleto || x.nome; desenhar(); } }, [
                el("span.o2-preset__nome", { texto: x.nome }),
                el("span.o2-preset__sub", { texto: K().PERFIS[x.perfil].nome + " · " + x.ocupacao + " · nv " + x.nivel }),
                el("span.o2-preset__rec", { texto: "PV " + x.pv + " · PD " + x.pd }),
                sel ? el("span.o2-preset__marca", { "aria-hidden": "true", texto: "✓" }) : null,
              ]);
            })),
          ]);
        })),
        p ? previaDoPreset(p) : el("p.t-mini", { texto: "Escolha um personagem para conferir a ficha inteira antes de copiar." }),
      ]);
    }

    function livre() {
      var L = st.livre;
      if (!K().PERFIS_REGRAS[L.perfilRegras]) L.perfilRegras = "beta-vigilia";
      var ocs = (K().OCUPACOES[L.perfilRegras] || []).map(function (x) { return x.nome; });
      return el("div.pilha", {}, [
        el("p.t-mini", { texto: "Tudo direto: os dados e os recursos que a mesa decidir. Perícias começam em d4 e se ajustam na ficha; habilidades, armas, relações e anotações também (dá para preencher a narrativa depois)." }),
        el("div.o2-criar__campos", {}, [
          UI().campo({ rotulo: "Perfil de regras", tipo: "selecao", valor: L.perfilRegras, opcoes: K().ORDEM_PERFIS_REGRAS.map(function (k) { return { valor: k, rotulo: K().PERFIS_REGRAS[k].nome }; }), aoMudar: function (v) { L.perfilRegras = v; desenhar(); } }),
          UI().campo({ rotulo: "Perfil", tipo: "selecao", valor: L.perfil, opcoes: K().ORDEM_PERFIS.map(function (k) { return { valor: k, rotulo: K().PERFIS[k].nome }; }), aoMudar: function (v) { L.perfil = v; } }),
          UI().campo({ rotulo: K().PERFIS_REGRAS[L.perfilRegras].termoOcupacao, valor: L.ocupacao, limite: 80, dica: ocs.join(", "), aoDigitar: true, aoMudar: function (v) { L.ocupacao = v; } }),
          UI().campo({ rotulo: "Nível (1–10)", tipo: "selecao", valor: String(L.nivel), opcoes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (n) { return { valor: String(n), rotulo: String(n) }; }), aoMudar: function (v) { L.nivel = Number(v); } }),
        ]),
        el("div.o2-criar__campos", {}, K().ORDEM_ATRIBUTOS.map(function (k) {
          return UI().campo({ rotulo: K().ATRIBUTOS[k].nome, tipo: "selecao", valor: String(L.atributos[k]), opcoes: opcoesDeDado(DADOS.concat([20])), ajuda: L.atributos[k] === 20 ? "d20 só com efeito paranormal." : "", aoMudar: function (v) { L.atributos[k] = Number(v); desenhar(); } });
        }).concat([
          UI().campo({ rotulo: "PV", tipo: "numero", valor: String(L.pv), aoDigitar: true, aoMudar: function (v) { L.pv = U.inteiro(v, 16); } }),
          UI().campo({ rotulo: "PD", tipo: "numero", valor: String(L.pd), aoDigitar: true, aoMudar: function (v) { L.pd = U.inteiro(v, 12); } }),
        ])),
      ]);
    }

    function guiada() {
      var G = st.guiada;
      if (!K().PERFIS_REGRAS[G.perfilRegras]) G.perfilRegras = "beta-vigilia";
      var pr = G.perfilRegras;
      var lista = K().listaDePericias(pr);
      var c = R().conferirGuiada(montarGuiada());
      var ocs = K().OCUPACOES[pr] || [];
      var oc = ocs.filter(function (x) { return x.id === G.ocupacaoId; })[0];
      var dePerfil = G.perfil ? K().HABILIDADE_DE_PERFIL[pr][G.perfil] : "";
      function contador(usado, total, rot) { return el("p.o2-contador" + (usado > total ? ".o2-contador--erro" : ""), { role: "status", texto: rot + ": " + usado + " de " + total + " passos" + (usado > total ? " — passou do limite" : "") }); }
      return el("div.pilha", {}, [
        el("p.o2-experimental", { texto: "Experimental: os playtests não trazem regras de criação. Esta é uma proposta de mesa para teste, registrada em docs/ORDEM2.md." }),
        el("div.o2-criar__campos", {}, [
          UI().campo({ rotulo: "Perfil de regras", tipo: "selecao", valor: pr, opcoes: K().ORDEM_PERFIS_REGRAS.map(function (k) { return { valor: k, rotulo: K().PERFIS_REGRAS[k].nome }; }), aoMudar: function (v) { G.perfilRegras = v; G.pericias = {}; G.ocupacaoId = ""; G.habilidadeOcupacao = ""; desenhar(); } }),
          UI().campo({ rotulo: "Perfil", tipo: "selecao", valor: G.perfil, opcoes: [{ valor: "", rotulo: "Escolha…" }].concat(K().ORDEM_PERFIS.map(function (k) { return { valor: k, rotulo: K().PERFIS[k].nome + " — " + K().PERFIS[k].texto }; })), aoMudar: function (v) { G.perfil = v; desenhar(); } }),
          UI().campo({ rotulo: K().PERFIS_REGRAS[pr].termoOcupacao, tipo: "selecao", valor: G.ocupacaoId || (G.ocupacaoNome ? "__propria" : ""), opcoes: [{ valor: "", rotulo: "Escolha…" }].concat(ocs.map(function (x) { return { valor: x.id, rotulo: x.nome }; })).concat([{ valor: "__propria", rotulo: "Personalizada…" }]), aoMudar: function (v) { if (v === "__propria") { G.ocupacaoId = ""; G.ocupacaoNome = G.ocupacaoNome || ""; } else { G.ocupacaoId = v; var x = ocs.filter(function (y) { return y.id === v; })[0]; G.ocupacaoNome = x ? x.nome : ""; G.habilidadeOcupacao = x && x.habilidade ? x.habilidade : ""; } desenhar(); } }),
          !G.ocupacaoId ? UI().campo({ rotulo: "Nome da " + K().PERFIS_REGRAS[pr].termoOcupacao.toLowerCase(), valor: G.ocupacaoNome, limite: 80, aoDigitar: true, aoMudar: function (v) { G.ocupacaoNome = v; } }) : null,
        ]),
        el("h4.t-secao", { texto: "Atributos" }),
        contador(c.passosAtributo, R().GUIADA.passosAtributo, "Atributos (d6 em cada; teto d10)"),
        el("div.o2-criar__campos", {}, K().ORDEM_ATRIBUTOS.map(function (k) {
          return UI().campo({ rotulo: K().ATRIBUTOS[k].nome, tipo: "selecao", valor: String(G.atributos[k]), opcoes: opcoesDeDado([6, 8, 10]), aoMudar: function (v) { G.atributos[k] = Number(v); desenhar(); } });
        })),
        el("h4.t-secao", { texto: "Perícias" }),
        contador(c.passosPericia, R().GUIADA.passosPericia, "Perícias (d4 em cada; teto d8)"),
        el("div.o2-criar__pericias", {}, lista.map(function (p) {
          var chave = p.chave + (p.chave === "aptidao" ? ":" : "");
          var v = G.pericias[chave] || { dado: 4, esp: "" };
          return el("div.o2-criar__pericia", {}, [
            el("span.o2-criar__pericia-nome", { texto: K().nomeDaPericia(pr, p.chave) + " (" + K().ATRIBUTOS[p.atributo].curto + ")" }),
            p.chave === "aptidao" ? UI().campo({ rotulo: "Especialização", tipo: "selecao", valor: v.esp, opcoes: [{ valor: "", rotulo: "—" }].concat(K().ESPECIALIZACOES[pr].map(function (e) { return { valor: e, rotulo: e }; })), aoMudar: function (x) { G.pericias[chave] = { dado: v.dado, esp: x }; } }) : null,
            UI().campo({ rotulo: "Dado", tipo: "selecao", valor: String(v.dado), opcoes: opcoesDeDado([4, 6, 8]), aoMudar: function (x) { G.pericias[chave] = { dado: Number(x), esp: v.esp }; desenhar(); } }),
          ]);
        })),
        el("h4.t-secao", { texto: "Habilidades" }),
        dePerfil ? el("p", {}, [el("strong", { texto: "De perfil: " + K().HABILIDADES[dePerfil].nome + ". " }), el("span.t-mini", { texto: K().HABILIDADES[dePerfil].texto })]) : el("p.t-mini", { texto: "Escolha o perfil para ver a habilidade dele." }),
        oc && oc.habilidade ? el("p", {}, [el("strong", { texto: "De " + K().PERFIS_REGRAS[pr].termoOcupacao.toLowerCase() + " (documentada): " + K().HABILIDADES[oc.habilidade].nome + ". " }), el("span.t-mini", { texto: oc.nota || "" })])
          : oc ? UI().campo({ rotulo: "Habilidade de " + K().PERFIS_REGRAS[pr].termoOcupacao.toLowerCase() + " (os playtests não dizem qual é; escolha explicitamente ou deixe sem)", tipo: "selecao", valor: G.habilidadeOcupacao, opcoes: [{ valor: "", rotulo: "Sem habilidade de " + K().PERFIS_REGRAS[pr].termoOcupacao.toLowerCase() }].concat(oc.vistas.map(function (h) { return { valor: h, rotulo: K().HABILIDADES[h].nome + " (vista em ficha desta " + K().PERFIS_REGRAS[pr].termoOcupacao.toLowerCase() + ")" }; })), aoMudar: function (v) { G.habilidadeOcupacao = v; } })
          : el("p.t-mini", { texto: "Ocupação personalizada: a habilidade dela entra depois, na ficha." }),
        el("h4.t-secao", { texto: "Recursos" }),
        el("p.t-mini", { texto: "16 PV e 12 PD: referência inicial de mesa para teste, valores novos — não uma dedução do livro. Ajuste à vontade." }),
        el("div.o2-criar__campos", {}, [
          UI().campo({ rotulo: "PV", tipo: "numero", valor: String(G.pv), aoDigitar: true, aoMudar: function (v) { G.pv = U.inteiro(v, 16); } }),
          UI().campo({ rotulo: "PD", tipo: "numero", valor: String(G.pd), aoDigitar: true, aoMudar: function (v) { G.pd = U.inteiro(v, 12); } }),
        ]),
        c.erros.length ? el("ul.o2-erros", { role: "alert" }, c.erros.map(function (e) { return el("li", { texto: e }); })) : el("p.o2-ok", { role: "status", texto: "✓ Distribuição dentro das regras da guiada." }),
      ]);
    }
    function montarGuiada() {
      var G = st.guiada;
      var pericias = K().listaDePericias(G.perfilRegras).map(function (p) {
        var chave = p.chave + (p.chave === "aptidao" ? ":" : "");
        var v = G.pericias[chave] || { dado: 4, esp: "" };
        return { chave: p.chave, especializacao: v.esp || "", dado: v.dado };
      });
      return { perfilRegras: G.perfilRegras, perfil: G.perfil, ocupacaoId: G.ocupacaoId, ocupacaoNome: G.ocupacaoNome, atributos: G.atributos, pericias: pericias, habilidadeOcupacao: G.habilidadeOcupacao, pv: G.pv, pd: G.pd };
    }

    function desenhar() {
      var y = corpo.parentNode ? corpo.parentNode.scrollTop : 0;
      U.trocar(corpo, [
        abasDeModo(),
        st.modo === "pronta" ? pronta() : st.modo === "livre" ? livre() : guiada(),
        el("div.o2-criar__campos", {}, [
          UI().campo({ rotulo: "Nome do personagem", valor: st.nome, limite: 120, aoDigitar: true, aoMudar: function (v) { st.nome = v; } }),
          campoCampanha(),
        ]),
      ]);
      if (corpo.parentNode) corpo.parentNode.scrollTop = y;
    }

    async function concluir(fechar) {
      var bloco = null;
      if (st.modo === "pronta") {
        if (!st.preset) { UI().avisoAtencao("Escolha a ficha pronta."); return; }
        bloco = R().dePreset(st.preset);
      } else if (st.modo === "livre") {
        var L = st.livre;
        bloco = R().normalizar({ perfilRegras: L.perfilRegras, modoCriacao: "livre", perfil: L.perfil, ocupacao: { nome: L.ocupacao, personalizada: true }, nivel: L.nivel, base: { atributos: L.atributos }, recursos: { pv: { max: L.pv }, pd: { max: L.pd } } });
      } else {
        var g = R().deGuiada(montarGuiada());
        if (!g.ok) { UI().avisoAtencao(g.erros[0]); return; }
        bloco = g.bloco;
      }
      var nome = String(st.nome || "").trim();
      if (!nome) { UI().avisoAtencao("Dê um nome ao personagem."); return; }
      var ficha = global.RAMAFicha.criarFicha({ nome: nome, tipoFicha: "ordem2", campanhaId: st.campanhaId || null, ordem2: bloco });
      var res = await global.RAMAApi.criarPersonagem(ficha, global.RAMAApi.novaOperacao());
      if (!res.ok) { UI().avisoDeFalha(res, "criação da ficha de Ordem II"); return; }
      fechar();
      location.href = U.url("ficha/?id=" + encodeURIComponent(res.dados.id));
    }

    var m = UI().modal({
      titulo: "Nova ficha — Ordem Paranormal RPG II (Experimental)", classe: "o2-janela o2-janela-criar", largo: true, conteudo: [corpo],
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Criar a ficha", classe: "r-botao--principal", aoClicar: function (f) { return concluir(f); } },
      ],
    });
    desenhar();
    return m;
  }

  global.RAMAOrdem2Criar = { abrir: abrir, previaDoPreset: previaDoPreset };
})(window);
