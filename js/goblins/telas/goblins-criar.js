/* =====================================================================
   R.A.M.A. — Malditos Goblins · a criação (v6.0)
   ---------------------------------------------------------------------
   As 3 etapas do livro (p. 4–6) — nome, ocupação e descritor,
   característica — e o que vem com a ocupação: equipamento e escolhas.

     guiada     uma etapa por vez, com o botão de rolar de cada tabela
     manual     tudo numa página, escolhendo nas listas
     aleatória  rola tudo o que o livro manda rolar de uma vez; o que é
                ESCOLHA (Supimpa, equipamento, arma favorita, espécie
                inimiga, magias…) fica para a pessoa

   Cada sorteio mostra a tabela, os dados e o resultado, e fica guardado
   na ficha (criacao.sorteios). Rolar de novo é um sorteio novo,
   registrado — nada é reaplicado por conta própria.

     RAMAGoblinsCriar.abrir({ campanhas })  ficha nova
     RAMAGoblinsCriar.abrir({ ctx })        continuar a criação da ficha
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el;
  function C() { return global.RAMAGoblinsCatalogo; }
  function D() { return global.RAMAGoblinsDados; }
  function R() { return global.RAMAGoblins; }
  function T() { return global.RAMAGoblinsTela; }
  function UI() { return global.RAMAUI; }

  function botao(t, f, o) { return T().botao(t, f, o); }
  function linha(t) { return el("p.t-mini", { texto: t }); }
  function selecao(rotulo, opcoes, valor, aoMudar) { return UI().campo({ rotulo: rotulo, tipo: "selecao", valor: valor, opcoes: opcoes, aoMudar: aoMudar }); }
  function marca(rotulo, marcado, aoMudar) { return el("label.r-marca", {}, [el("input", { type: "checkbox", checked: !!marcado, onchange: function (ev) { aoMudar(ev.currentTarget.checked); } }), el("span", { texto: rotulo })]); }

  var ETAPAS = [
    { chave: "regras", nome: "Regras" },
    { chave: "nome", nome: "Nome" },
    { chave: "ocupacao", nome: "Ocupação" },
    { chave: "caracteristica", nome: "Característica" },
    { chave: "equipamento", nome: "Equipamento" },
    { chave: "resumo", nome: "Resumo" },
  ];

  function abrir(opcoes) {
    var op = opcoes || {};
    var ctx = op.ctx || null;
    var o = ctx ? R().normalizar(R().copiar(ctx.ficha.goblins)) : R().fichaVazia();
    var info = { nome: ctx ? ctx.ficha.nome : "", campanhaId: ctx ? (ctx.ficha.campanhaId || "") : "", modo: o.criacao.modo || "guiada", etapa: ctx ? 1 : 0 };
    var campanhas = op.campanhas || [];
    var corpo = el("div.gob-criar");
    var ultimoSorteio = el("div.gob-sorteio", { role: "status", "aria-live": "polite" });

    function guardarSorteio(s) {
      o.criacao.sorteios.push(s);
      o.criacao.sorteios = o.criacao.sorteios.slice(-40);
      mostrarSorteio(s);
    }
    function mostrarSorteio(s) {
      var res = typeof s.resultado === "string" ? (C().CARACTERISTICAS[s.resultado] ? C().CARACTERISTICAS[s.resultado].nome : C().OCUPACOES[s.resultado] ? C().OCUPACOES[s.resultado].nome : C().DESCRITORES[s.resultado] ? C().DESCRITORES[s.resultado].nome : s.resultado === "rolarDuasVezes" ? "[Role 2 vezes]" : s.resultado) : s.resultado && s.resultado.texto ? s.resultado.texto : s.total !== undefined ? String(s.total) : "";
      U.trocar(ultimoSorteio, [
        el("span.t-mini", { texto: (s.nome || "Sorteio") + (s.pagina ? " (p. " + s.pagina + ")" : "") + ": " }),
        el("span.gob-dados.gob-dados--linha", {}, (s.dados || []).map(function (f) { return el("span.gob-dado", { role: "img", "aria-label": "dado " + f }, [el("span.gob-dado__face", { texto: String(f) })]); })),
        s.indice && s.indice.coluna ? el("span.t-mini", { texto: " coluna " + s.indice.coluna + ", linha " + s.indice.linha }) : null,
        el("strong", { texto: " → " + res }),
      ]);
    }
    function sortear(id, nome, pagina, dados, entradas) {
      var s = D().sortear({ id: id, nome: nome, pagina: pagina, dados: dados, entradas: entradas }, T().rolador);
      guardarSorteio(s);
      return s;
    }

    function rolarNome() {
      var s = R().sorteioDeNome(T().rolador);
      guardarSorteio(s);
      if (typeof s.resultado === "string") { info.nome = s.resultado; o.criacao.pendenciaDeNome = ""; }
      else { o.criacao.pendenciaDeNome = s.resultado.especial; info.nome = ""; }
      o.criacao.nomeSugerido = typeof s.resultado === "string" ? s.resultado : "";
    }
    function rolarOcupacao() {
      var s = sortear("ocupacao", "Ocupação", 4, "1d6", C().OCUPACAO_D6);
      o.ocupacao = s.resultado; o.equipamentoInicial = null;
      var d = sortear("descritor", "Descritor", 4, "1d6", C().DESCRITOR_D6);
      o.descritor = d.resultado;
    }
    function rolarCaracteristica() {
      var sc = R().sortearCaracteristicas(T().rolador);
      o.caracteristicas = sc.caracteristicas;
      sc.sorteios.forEach(function (s) { o.criacao.sorteios.push(s); });
      o.criacao.sorteios = o.criacao.sorteios.slice(-40);
      if (sc.sorteios.length) mostrarSorteio(sc.sorteios.filter(function (s) { return s.tabela === "caracteristica"; }).slice(-1)[0] || sc.sorteios[0]);
    }
    function rolarTudo() {
      rolarNome();
      if (!o.opcoes.adaptacoes.pokepragas) rolarOcupacao();
      else { o.ocupacao = "treinador"; var d = sortear("descritor", "Descritor", 4, "1d6", C().DESCRITOR_D6); o.descritor = d.resultado; }
      rolarCaracteristica();
      o.criacao.modo = "aleatoria";
      info.etapa = ETAPAS.length - 2;
    }

    /* ---- etapas ---- */
    function etapaRegras() {
      var ad = o.opcoes.adaptacoes;
      return el("div.pilha", {}, [
        el("p", { texto: "Como criar? E com quais regras? (Dá para mudar depois, na aba Adaptações.)" }),
        el("div.faixa", { role: "radiogroup", "aria-label": "Modo de criação" }, [["guiada", "Guiada (uma etapa por vez, rolando)"], ["manual", "Manual (escolher tudo)"], ["aleatoria", "Aleatória (rolar tudo)"]].map(function (m) {
          return el("label.r-marca", {}, [el("input", { type: "radio", name: "gob-modo", checked: info.modo === m[0], onchange: function () { info.modo = m[0]; o.criacao.modo = m[0]; desenhar(); } }), el("span", { texto: m[1] })]);
        })),
        el("fieldset.gob-flags", {}, [el("legend", { texto: "Regras opcionais (p. 16)" }),
          marca("Voz Goblin", o.opcoes.vozGoblin, function (v) { o.opcoes.vozGoblin = v; if (v) o.estado.vozGoblin = "ativa"; }),
          marca("Mas deu ruim…", o.opcoes.deuRuim, function (v) { o.opcoes.deuRuim = v; }),
          marca("Níveis Épicos", o.opcoes.niveisEpicos, function (v) { o.opcoes.niveisEpicos = v; }),
        ]),
        el("fieldset.gob-flags", {}, [el("legend", { texto: "Adaptações (p. 32–41)" })].concat(Object.keys(C().ADAPTACOES).map(function (k) {
          return marca(C().ADAPTACOES[k].nome + " (p. " + C().ADAPTACOES[k].pagina + ")", ad[k], function (v) { ad[k] = v; if (k === "pokepragas" && v && !o.ocupacao) o.ocupacao = "treinador"; });
        }))),
        ad.pokepragas ? linha("PokéPragas: não se rola a ocupação — todo mundo começa Treinador (p. 34).") : null,
      ]);
    }

    function etapaNome() {
      var campo = UI().campo({ rotulo: "Nome", valor: info.nome, limite: 80, aoDigitar: true, aoMudar: function (v) { info.nome = v; if (v.trim()) o.criacao.pendenciaDeNome = ""; } });
      return el("div.pilha", {}, [
        campo,
        info.modo !== "manual" ? el("div.faixa", {}, [botao("Rolar 2 dados na tabela", function () { rolarNome(); desenhar(); }), T().fonte(4, "1º dado coluna, 2º linha")]) : null,
        o.criacao.pendenciaDeNome ? el("p.gob-aviso", { texto: o.criacao.pendenciaDeNome === "comida" ? "Saiu “[Última coisa que comeu]”: o nome é a última coisa que VOCÊ comeu." : "Saiu “[Inverta seu nome]”: escreva o SEU nome de trás para frente." }) : null,
        UI().campo({ rotulo: "Segundo nome, de família (opcional)", valor: o.nomeDeFamilia, limite: 60, aoMudar: function (v) { o.nomeDeFamilia = v; } }),
      ]);
    }

    function etapaOcupacao() {
      var ad = o.opcoes.adaptacoes;
      var ocs = Object.keys(C().OCUPACOES).filter(function (k) { var d = C().OCUPACOES[k]; return !d.adaptacao || ad[d.adaptacao]; });
      var partes = [];
      if (ad.wargoblin) {
        partes.push(selecao("Turminha (WarGoblin 40k, p. 36)", [{ valor: "", rotulo: "—" }].concat(Object.keys(C().WARGOBLIN.grupos).map(function (k) { var g = C().WARGOBLIN.grupos[k]; return { valor: k, rotulo: g.nome + " (igual ao " + C().OCUPACOES[g.ocupacao].nome + ")" }; })), o.escolhas.grupoWar, function (v) { o.escolhas.grupoWar = v; if (v) o.ocupacao = C().WARGOBLIN.grupos[v].ocupacao; desenhar(); }));
      }
      partes.push(selecao("Ocupação", [{ valor: "", rotulo: "—" }].concat(ocs.map(function (k) { var d = C().OCUPACOES[k]; var mods = d.mod ? Object.keys(d.mod).map(function (a) { return T().nomeAtr(a) + " +" + d.mod[a]; }).join(", ") : "Habilidade ou Noção +1"; return { valor: k, rotulo: (ad.cthulin && C().CTHULIN.nomes[k] ? C().CTHULIN.nomes[k] + " = " : "") + d.nome + " (" + mods + ")" }; })), o.ocupacao, function (v) { o.ocupacao = v; o.equipamentoInicial = null; desenhar(); }));
      partes.push(selecao("Descritor", [{ valor: "", rotulo: "—" }].concat(C().DESCRITOR_D6.map(function (k) { var d = C().DESCRITORES[k]; return { valor: k, rotulo: d.nome + (d.escolha ? " (escolha um atributo +1)" : Object.keys(d.mod).length ? " (" + Object.keys(d.mod).map(function (a) { return T().nomeAtr(a) + " " + d.mod[a]; }).join("") + ")" : " (nada muda)") }; })), o.descritor, function (v) { o.descritor = v; desenhar(); }));
      if (info.modo !== "manual" && !ad.pokepragas) partes.push(el("div.faixa", {}, [botao("Rolar ocupação e descritor (1d6 cada)", function () { rolarOcupacao(); desenhar(); }), T().fonte(4)]));
      if (info.modo !== "manual" && ad.pokepragas) partes.push(el("div.faixa", {}, [botao("Rolar descritor (1d6)", function () { var d = sortear("descritor", "Descritor", 4, "1d6", C().DESCRITOR_D6); o.descritor = d.resultado; desenhar(); })]));
      if (o.descritor === "supimpa") partes.push(selecao("Supimpa: +1 em", [{ valor: "", rotulo: "—" }].concat(C().ATRIBUTOS.map(function (a) { return { valor: a.chave, rotulo: a.nome }; })), o.supimpa, function (v) { o.supimpa = v; desenhar(); }));
      var oc = C().OCUPACOES[o.ocupacao];
      if (oc && oc.modEscolha) partes.push(selecao(oc.nome + ": +1 em", [{ valor: "", rotulo: "—" }].concat(oc.modEscolha.map(function (a) { return { valor: a, rotulo: T().nomeAtr(a) }; })), o.modEscolhido, function (v) { o.modEscolhido = v; desenhar(); }));
      if (oc) partes.push(el("div.gob-ocupacao", {}, [el("strong", { texto: "Técnicas de " + oc.nome }), el("ul.gob-lista", {}, oc.tecnicas.map(function (t) { return el("li", { texto: "N" + t.nivel + " " + t.nome + ": " + t.texto }); })), T().fonte(oc.pagina)]));
      partes.push(atributosAgora());
      return el("div.pilha", {}, partes);
    }

    function atributosAgora() {
      var c = R().calcular(o);
      return el("dl.gob-bloco__atributos", {}, C().ATRIBUTOS.map(function (a) {
        var x = c.atributos[a.chave];
        return el("div.gob-atr", { title: T().composicaoTexto(x.composicao) }, [el("dt", { texto: a.nome }), el("dd", {}, [el("span.gob-atr__valor", { texto: String(x.valor) }), el("span.so-leitor", { texto: " (" + T().composicaoTexto(x.composicao) + ")" })])]);
      }));
    }

    function etapaCaracteristica() {
      var todas = Object.keys(C().CARACTERISTICAS).sort(function (a, b) { return C().CARACTERISTICAS[a].nome.localeCompare(C().CARACTERISTICAS[b].nome); });
      var add = selecao("Escolher da lista", todas.map(function (k) { return { valor: k, rotulo: C().CARACTERISTICAS[k].nome }; }), todas[0]);
      return el("div.pilha", {}, [
        o.caracteristicas.length ? el("ul.gob-lista", {}, o.caracteristicas.map(function (x) {
          var d = C().CARACTERISTICAS[x.chave];
          return el("li", {}, [
            el("strong", { texto: d.nome }), el("span.t-mini", { texto: " — " + d.texto }),
            d.quantidade ? UI().campo({ rotulo: "Quantos " + (d.unidade || ""), tipo: "numero", valor: x.quantidade === null ? "" : x.quantidade, aoMudar: function (v) { x.quantidade = U.inteiro(v, 0); } }) : null,
            el("button.r-icone", { type: "button", "aria-label": "Tirar " + d.nome, onclick: function () { o.caracteristicas = o.caracteristicas.filter(function (y) { return y !== x; }); desenhar(); } }, [UI().simbolo("x")]),
          ]);
        })) : linha("Nenhuma característica ainda."),
        info.modo !== "manual" ? el("div.faixa", {}, [botao("Rolar 2 dados na tabela", function () { rolarCaracteristica(); desenhar(); }), T().fonte(4, "1º dado coluna, 2º linha; “Role 2 vezes” rola duas")]) : null,
        el("div.faixa", {}, [add, botao("Adicionar", function () { var k = add.entrada.value; var d = C().CARACTERISTICAS[k]; var q = null; if (d.quantidade && info.modo !== "manual") { var r = D().quantidade(d.quantidade, T().rolador); q = r.total; guardarSorteio(Object.assign({ nome: d.nome }, r)); } o.caracteristicas.push({ id: R().novoId("ca"), chave: k, quantidade: q }); desenhar(); })]),
      ]);
    }

    function etapaEquipamento() {
      var oc = C().OCUPACOES[o.ocupacao];
      if (!oc) return linha("Escolha a ocupação antes.");
      var ad = o.opcoes.adaptacoes;
      var partes = [];
      if (ad.wargoblin) {
        partes.push(el("fieldset.gob-flags", {}, [el("legend", { texto: "WarGoblin: escolha dois equipamentos (p. 36)" })].concat(C().WARGOBLIN.equipamento.map(function (k) {
          var marcado = o.escolhas.equipamentoWar.indexOf(k) >= 0;
          return marca(C().itemDoCatalogo(k).def.nome + (k === "armaduraEspacial" ? " (recomendado)" : ""), marcado, function (v) {
            var l = o.escolhas.equipamentoWar.filter(function (x) { return x !== k; });
            if (v) { if (l.length >= 2) { UI().avisoAtencao("São dois."); desenhar(); return; } l.push(k); }
            o.escolhas.equipamentoWar = l; desenhar();
          });
        }))));
      } else if (oc.equipamento.length > 1) {
        partes.push(el("fieldset.gob-flags", { role: "radiogroup" }, [el("legend", { texto: "Equipamento (escolha um)" })].concat(oc.equipamento.map(function (e, i) {
          return el("label.r-marca", {}, [el("input", { type: "radio", name: "gob-eq", checked: o.equipamentoInicial === i, onchange: function () { o.equipamentoInicial = i; } }), el("span", { texto: e.rotulo + (e.nota ? " — " + e.nota : "") })]);
        }))));
      } else partes.push(linha("Equipamento: " + oc.equipamento[0].rotulo + "."));
      if (ad.cthulin) partes.push(selecao("Cthulin: comece com", [{ valor: "", rotulo: "—" }, { valor: "chapeu", rotulo: "Chapéu" }, { valor: "livroEspecial", rotulo: "Livro Especial" }], o.escolhas.inicialCthulin, function (v) { o.escolhas.inicialCthulin = v; }));
      if (oc.escolhas.indexOf("armaFavorita") >= 0) partes.push(selecao("Arma favorita (Mestre de Armas)", [{ valor: "", rotulo: "—" }].concat(Object.keys(C().ARMAS).filter(function (k) { var a = C().ARMAS[k]; return !a.adaptacao || ad[a.adaptacao]; }).map(function (k) { return { valor: k, rotulo: C().ARMAS[k].nome }; })), o.escolhas.armaFavorita, function (v) { o.escolhas.armaFavorita = v; }));
      if (oc.escolhas.indexOf("especieInimiga") >= 0) partes.push(UI().campo({ rotulo: "Espécie inimiga (Inimigo): +1 dado contra ela", valor: o.escolhas.especieInimiga, limite: 60, dica: "ex.: lobo, humano, goblin", aoMudar: function (v) { o.escolhas.especieInimiga = v; } }));
      if (oc.escolhas.indexOf("magias") >= 0) partes.push(el("fieldset.gob-flags", {}, [el("legend", { texto: "Magias (escolha 3, p. 10–11)" })].concat(C().MAGIAS_DO_BRUXO.map(function (k) {
        return marca(C().MAGIAS[k].nome, o.escolhas.magias.indexOf(k) >= 0, function (v) {
          var l = o.escolhas.magias.filter(function (x) { return x !== k; });
          if (v) { if (l.length >= 3) { UI().avisoAtencao("São 3 magias."); desenhar(); return; } l.push(k); }
          o.escolhas.magias = l;
        });
      }))));
      return el("div.pilha", {}, partes);
    }

    function etapaResumo() {
      var pend = R().pendencias(o).filter(function (p) { return p.indexOf("Nome:") !== 0; });
      if (!info.nome.trim()) pend.unshift("Dê um nome ao goblin.");
      return el("div.pilha", {}, [
        el("p", {}, [el("strong", { texto: info.nome || "(sem nome)" }), el("span", { texto: " · " + (R().nomeDaOcupacao(o) || "—") + " " + (C().DESCRITORES[o.descritor] ? C().DESCRITORES[o.descritor].nome.toLowerCase() : "") + " · " + o.caracteristicas.map(function (x) { return C().CARACTERISTICAS[x.chave].nome; }).join(", ") })]),
        atributosAgora(),
        pend.length ? el("ul.gob-lista.gob-pendencias", { role: "status" }, pend.map(function (p) { return el("li", { texto: p }); })) : el("p.gob-ok", { texto: "Tudo certo: o equipamento entra ao concluir." }),
        !ctx ? UI().campo({ rotulo: "Campanha", tipo: "selecao", valor: info.campanhaId, opcoes: [{ valor: "", rotulo: "Sem campanha (ficha avulsa)" }].concat(campanhas.map(function (c) { return { valor: c.id, rotulo: c.nome + (c.sistema && c.sistema !== "goblins" ? " (" + c.sistema + ")" : "") }; })), aoMudar: function (v) { info.campanhaId = v; } }) : null,
      ]);
    }

    var CONTEUDO = { regras: etapaRegras, nome: etapaNome, ocupacao: etapaOcupacao, caracteristica: etapaCaracteristica, equipamento: etapaEquipamento, resumo: etapaResumo };

    function desenhar() {
      var rolador_ = corpo.parentNode;
      var y = rolador_ && info.etapaDesenhada === info.etapa ? rolador_.scrollTop : 0;
      info.etapaDesenhada = info.etapa;
      var manual = info.modo === "manual";
      var etapas = manual && info.etapa > 0 ? ETAPAS.slice(1) : [ETAPAS[info.etapa]];
      U.trocar(corpo, [
        el("ol.gob-etapas", { "aria-label": "Etapas" }, ETAPAS.map(function (e, i) { return el("li", { class: i === info.etapa || (manual && info.etapa > 0 && i > 0) ? "gob-etapa--atual" : i < info.etapa ? "gob-etapa--feita" : "" }, [el("button.r-link", { type: "button", texto: (i + 1) + ". " + e.nome, onclick: function () { info.etapa = i; desenhar(); } })]); })),
        ultimoSorteio,
      ].concat(etapas.map(function (e) { return el("section.gob-criar__etapa", {}, [el("h3.t-secao", { texto: e.nome }), CONTEUDO[e.chave]()]); })).concat([
        el("div.faixa.gob-criar__navegacao", {}, [
          info.etapa > 0 ? botao("Voltar", function () { info.etapa = Math.max(0, info.etapa - 1); desenhar(); }, { classe: "r-botao--fantasma" }) : null,
          info.etapa === 0 && info.modo === "aleatoria" ? botao("Rolar tudo", function () { rolarTudo(); desenhar(); }) : null,
          info.etapa < ETAPAS.length - 1 ? botao(manual && info.etapa > 0 ? "Ver o resumo" : "Próximo", function () { info.etapa = manual && info.etapa > 0 ? ETAPAS.length - 1 : info.etapa + 1; desenhar(); }) : null,
        ]),
      ]));
      if (rolador_) rolador_.scrollTop = y;
    }

    async function concluir(fechar, terminar) {
      if (!info.nome.trim()) { UI().avisoAtencao("Dê um nome ao goblin."); info.etapa = 1; desenhar(); return; }
      if (terminar) {
        var r0 = R().concluirCriacao(R().normalizar(R().copiar(o)), T().rolador);
        if (!r0.ok) { UI().avisoAtencao(r0.motivo); return; }
      }
      if (ctx) {
        var base = R().copiar(o);
        T().operar(ctx, function (b) {
          ["criacao", "nomeDeFamilia", "ocupacao", "descritor", "supimpa", "modEscolhido", "caracteristicas", "equipamentoInicial", "escolhas", "opcoes"].forEach(function (k) { b[k] = R().copiar(base[k]); });
          if (base.estado.vozGoblin && !b.estado.vozGoblin) b.estado.vozGoblin = base.estado.vozGoblin;
          if (terminar) return R().concluirCriacao(b, T().rolador);
          R().registrar(b, "criacao", "Criação salva (em andamento)");
          return { ok: true, eventos: [] };
        });
        if (info.nome.trim() && info.nome.trim() !== ctx.ficha.nome) { ctx.ficha.nome = info.nome.trim().slice(0, 120); ctx.alterou(); if (ctx.atualizarTitulo) ctx.atualizarTitulo(); }
        fechar();
        return;
      }
      var bloco = R().normalizar(R().copiar(o));
      if (terminar) { var r = R().concluirCriacao(bloco, T().rolador); if (!r.ok) { UI().avisoAtencao(r.motivo); return; } }
      else R().registrar(bloco, "criacao", "Criação salva (em andamento)");
      var ficha = global.RAMAFicha.criarFicha({ nome: info.nome.trim(), tipoFicha: "goblins", campanhaId: info.campanhaId || null, goblins: bloco });
      var res = await global.RAMAApi.criarPersonagem(ficha, global.RAMAApi.novaOperacao());
      if (!res.ok) { UI().avisoDeFalha(res, "criação do goblin"); return; }
      fechar();
      location.href = U.url("ficha/?id=" + encodeURIComponent(res.dados.id));
    }

    var m = UI().modal({
      titulo: ctx ? "Continuar a criação" : "Novo goblin — Malditos Goblins",
      classe: "gob-janela-criar",
      largo: true,
      conteudo: [corpo],
      botoes: [
        { rotulo: "Salvar sem concluir", classe: "r-botao--fantasma", aoClicar: function (f) { return concluir(f, false); } },
        { rotulo: "Concluir a criação", classe: "r-botao--principal", aoClicar: function (f) { return concluir(f, true); } },
      ],
    });
    desenhar();
    return m;
  }

  global.RAMAGoblinsCriar = { abrir: abrir };
})(window);
