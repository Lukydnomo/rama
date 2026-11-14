/* =====================================================================
   R.A.M.A. — Ordem Paranormal RPG II · criar uma ficha (v9.3)
   ---------------------------------------------------------------------
   Um assistente que mostra só o que se decide agora.

     "Como você quer criar?"   três opções visíveis (nenhuma escolhida
                               por padrão; a guiada em destaque para quem
                               está começando)
     Criação guiada            Identidade → Atributos → Perícias →
       (experimental)          Habilidades e recursos → Revisão
     Ficha pronta              Escolher ficha → Revisão
     Criação livre             Identidade → Dados e recursos → Revisão

   Cada modo tem o PRÓPRIO rascunho enquanto o assistente está aberto:
   trocar de modo não apaga nada. "Passo X de Y", Voltar e Continuar no
   rodapé; Criar/Copiar só na revisão, que tem "Editar" por seção (e
   volta para a revisão). Sair com alterações pergunta. O envio bloqueia
   o clique duplo, guarda o rascunho se falhar e repete com o MESMO id de
   operação (criarPersonagem devolve a ficha que a primeira tentativa
   criou). As regras são as de js/ordem2/regras.js: dePreset(),
   conferirGuiada(), deGuiada() e normalizar().
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
  /* v9.4: uma regra só. A ambientação muda sugestões (ocupações,
     especializações); o playtest de origem é FONTE (filtro dos presets). */
  var AMB = { contemporaneo: "Contemporâneo", vigilia: "Contos da Vigília" };
  var FONTE = { "alpha-contemporaneo": "Playtest Alpha", "beta-vigilia": "Playtest Beta" };
  var ETAPAS = {
    guiada: [["identidade", "Identidade"], ["atributos", "Atributos"], ["pericias", "Perícias"], ["habilidades", "Habilidades e recursos"], ["revisao", "Revisão"]],
    pronta: [["escolher", "Escolher ficha"], ["revisao", "Revisão"]],
    livre: [["identidade", "Identidade"], ["dados", "Dados e recursos"], ["revisao", "Revisão"]],
  };
  var MODOS = {
    guiada: { titulo: "Criação guiada", texto: "Monte um personagem do zero, uma escolha por vez.", selo: "Experimental", destaque: "Bom para começar" },
    pronta: { titulo: "Ficha pronta", texto: "Escolha um personagem do playtest e comece com a ficha preenchida." },
    livre: { titulo: "Criação livre", texto: "Use os valores combinados com a sua mesa." },
  };

  function opcoesDeDado(lista) { return (lista || DADOS).map(function (f) { return { valor: String(f), rotulo: "d" + f }; }); }
  function linhaPar(rotulo, valor) { return el("div", {}, [el("dt", { texto: rotulo }), el("dd", { texto: valor })]); }
  function passo(f, n) { var i = DADOS.indexOf(f) + n; return DADOS[Math.max(0, Math.min(DADOS.length - 1, i))]; }
  function passosEntre(de, ate) { return DADOS.indexOf(ate) - DADOS.indexOf(de); }
  function termo() { return "Ocupação"; }
  /* Um botão que pode receber o foco de volta depois de redesenhar. */
  function bt(texto, fn, o, foco) { var b = T().botao(texto, fn, o); if (foco) b.dataset.foco = foco; return b; }

  /* A prévia de um preset: o resumo primeiro; o resto em detalhes. */
  function previaDoPreset(p) {
    var b = R().dePreset(p.id, "prévia");
    var impressos = p.atributosImpressos || {};
    return el("div.pilha.o2-previa", {}, [
      el("div.o2-previa__topo", {}, [
        el("h3.o2-previa__nome", { texto: p.nomeCompleto || p.nome }),
        el("p.t-mini", { texto: K().PERFIS[p.perfil].nome + " · " + p.ocupacao + " · nível " + p.nivel + " · " + AMB[b.ambientacao] + " · fonte: " + FONTE[p.perfilRegras] }),
      ]),
      el("dl.o2-pares.o2-pares--linha", {}, [
        linhaPar("Físico", "d" + p.atributos.fisico), linhaPar("Mente", "d" + p.atributos.mente), linhaPar("Emoção", "d" + p.atributos.emocao),
        linhaPar("PV", String(p.pv)), linhaPar("PD", String(p.pd)), p.idade ? linhaPar("Idade", String(p.idade)) : null,
      ]),
      p.resumo ? el("p", { texto: p.resumo }) : null,
      el("details.o2-previa__bloco", {}, [el("summary", { texto: "Perícias (" + b.base.pericias.length + ")" }),
        el("ul.o2-previa__pericias", {}, b.base.pericias.map(function (x) {
          var notas = [];
          if (x.rotuloImpresso) notas.push("na ficha: " + x.rotuloImpresso);
          if (impressos[x.chave]) notas.push("atributo impresso: " + impressos[x.chave] + " (o motor usa " + K().ATRIBUTOS[R().atributoBase(b, x.chave)].nome + ")");
          return el("li", {}, [el("span", { texto: R().nomeDaPericia(b, x) + " d" + x.dado }), notas.length ? el("span.o2-aviso-mini", { texto: " ⚠ " + notas.join("; ") }) : null]);
        }))]),
      el("details.o2-previa__bloco", {}, [el("summary", { texto: "Habilidades (" + b.habilidades.length + ")" }),
        el("ul.pilha.pilha--curta", {}, b.habilidades.map(function (h) { var m = R().motorDe(h); return el("li", {}, [el("strong", { texto: h.nome }), el("span.t-mini", { texto: (m && (m.pd || m.faces) ? " (" + [m.pd ? m.pd + " PD" : "", m.faces ? "d" + m.faces : ""].filter(Boolean).join(", ") + ")" : "") }), el("p.t-mini", { texto: h.texto })]); }))]),
      b.itens.length ? el("details.o2-previa__bloco", {}, [el("summary", { texto: "Equipamento (" + b.itens.length + ")" }), el("ul", {}, b.itens.map(function (i) { return el("li", { texto: i.nome + (i.tipo === "arma" ? " — " + (i.alcance === "distancia" ? "à distância" : "corpo a corpo") + ", dano RA" + (i.dano >= 0 ? "+" : "") + i.dano : "") + (i.armadura ? " — " + i.armadura + " ponto(s) de armadura" : "") + (i.especial ? " · " + i.especial : "") + (i.quantidade !== null ? " ×" + i.quantidade : "") }); }))]) : null,
      b.relacoes.length ? el("details.o2-previa__bloco", {}, [el("summary", { texto: "Relações (" + b.relacoes.length + ")" }), el("ul", {}, b.relacoes.map(function (r) { return el("li", { texto: r.nome + ": " + r.rotulo + (r.grau ? " (grau " + r.grau + " — " + K().GRAUS_RELACAO[r.grau].nome + ")" : " (sem grau: o rótulo da ficha não define grau)") + " — " + r.descricao }); }))]) : null,
      el("details.o2-previa__bloco", {}, [el("summary", { texto: "Procedência" }), el("div.pilha.pilha--curta", {}, [
        el("p.t-mini", {}, [el("span", { texto: "Copiada de " + (p.nomeCompleto || p.nome) + " · " }), T().fonte(p.fonte, p.pagina), el("span", { texto: " · os valores do playtest, com ids próprios na cópia. As habilidades mostram o efeito atual (regras unificadas)." })]),
        b.procedencia.habilidadesOriginais.length ? el("ul.pilha.pilha--curta", {}, b.procedencia.habilidadesOriginais.map(function (o) { return el("li.t-mini", { texto: "Original — " + o.nome + ": " + o.texto }); })) : null,
      ])]),
    ]);
  }

  function abrir(opcoes) {
    var o = opcoes || {};
    var campanhas = (o.campanhas || []).filter(function (c) { return !c.sistema || c.sistema === "ordem2"; });
    var st = {
      modo: null, alterado: false, ocupado: false, descartar: false, envio: null, focarTitulo: false, revisar: false,
      etapa: { guiada: 0, pronta: 0, livre: 0 }, alcancada: { guiada: 0, pronta: 0, livre: 0 },
      ambDaCampanha: {},
      r: {
        guiada: { nome: "", campanhaId: "", ambientacao: "contemporaneo", ambManual: false, perfil: "", ocupacaoId: "", ocupacaoNome: "", propria: false, atributos: { fisico: 6, mente: 6, emocao: 6 }, pericias: {}, habilidadeOcupacao: "", pv: 16, pd: 12, sobraOk: false, busca: "", soMelhoradas: false, grupoAberto: "" },
        pronta: { nome: "", nomeDoPreset: "", campanhaId: "", preset: "", filtro: "" },
        livre: { nome: "", campanhaId: "", ambientacao: "contemporaneo", ambManual: false, perfil: "", ocupacao: "", nivel: 1, atributos: { fisico: 6, mente: 6, emocao: 6 }, pv: 16, pd: 12 },
      },
    };
    var raiz = el("div.o2-assist");
    var m;

    function D() { return st.r[st.modo]; }
    function etapas() { return ETAPAS[st.modo]; }
    function chaveEtapa() { return etapas()[st.etapa[st.modo]][0]; }
    function mudou() { st.alterado = true; st.envio = null; }
    function ir(i) {
      st.etapa[st.modo] = i;
      st.alcancada[st.modo] = Math.max(st.alcancada[st.modo], i);
      st.focarTitulo = true;
      desenhar(true);
    }

    /* A ambientação da campanha (lida da mesa; null = sem mesa). Só uma
       SUGESTÃO: as regras são as mesmas em qualquer ambientação. */
    function ambDaCampanha(cid) {
      if (!cid) return null;
      if (st.ambDaCampanha[cid] === undefined) {
        st.ambDaCampanha[cid] = "carregando";
        Promise.resolve(global.RAMAApi && global.RAMAApi.lerOrdem2 ? global.RAMAApi.lerOrdem2(cid, { segundoPlano: true }) : { ok: false }).then(function (r) {
          var e = r && r.ok && r.dados ? (r.dados.estado || r.dados.vista) : null;
          st.ambDaCampanha[cid] = e ? K().ambientacaoValida(e.ambientacao || e.perfil) : null;
          /* Sem escolha manual, a ficha acompanha a ambientação da campanha. */
          var d = st.modo && st.modo !== "pronta" ? D() : null;
          if (d && d.campanhaId === cid && !d.ambManual && st.ambDaCampanha[cid]) d.ambientacao = st.ambDaCampanha[cid];
          desenhar();
        }, function () { st.ambDaCampanha[cid] = null; desenhar(); });
      }
      return st.ambDaCampanha[cid];
    }
    function nomeCampanha(cid) { var c = campanhas.filter(function (x) { return x.id === cid; })[0]; return c ? c.nome : ""; }
    function campoCampanha(d) {
      var a = d.campanhaId ? ambDaCampanha(d.campanhaId) : null;
      return el("div.pilha.pilha--curta", {}, [
        UI().campo({ rotulo: "Campanha (opcional)", tipo: "selecao", valor: d.campanhaId, opcoes: [{ valor: "", rotulo: "Sem campanha (jogo local na ficha)" }].concat(campanhas.map(function (c) { return { valor: c.id, rotulo: c.nome }; })), aoMudar: function (v) { d.campanhaId = v; mudou(); desenhar(); } }),
        a && a !== "carregando" ? el("p.t-mini", { texto: "A campanha " + nomeCampanha(d.campanhaId) + " está em " + AMB[a] + " (da configuração da mesa)." }) : null,
      ]);
    }
    /* Ambientação: muda sugestões, nunca a regra. */
    function seletorDeAmbientacao(d) {
      var a = d.campanhaId ? ambDaCampanha(d.campanhaId) : null;
      return el("fieldset.o2-assist__opcoes", {}, [el("legend", { texto: "Ambientação" })].concat(K().ORDEM_AMBIENTACOES.map(function (k) {
        return el("label.o2-assist__radio", {}, [el("input", { type: "radio", name: "o2-amb-" + st.modo, checked: d.ambientacao === k, onchange: function () { d.ambientacao = k; d.ambManual = true; mudou(); desenhar(); } }), el("span", {}, [el("strong", { texto: AMB[k] }), a === k ? el("span.t-mini", { texto: " — a da campanha" }) : null])]);
      })).concat([el("p.t-mini", { texto: "Muda a ambientação e as sugestões; as regras são as mesmas." })]));
    }
    function campoNome(d, aviso) {
      return UI().campo({ rotulo: "Nome do personagem", valor: d.nome, limite: 120, aoDigitar: true, ajuda: aviso || "", aoMudar: function (v) { d.nome = v; mudou(); atualizarResumo(); } });
    }

    function seletorDePerfil(d) {
      return el("fieldset.o2-assist__opcoes", {}, [el("legend", { texto: "Perfil do personagem" })].concat(K().ORDEM_PERFIS.map(function (k) {
        var h = K().HABILIDADE_DE_PERFIL[k];
        return el("label.o2-assist__radio.o2-assist__radio--cartao", {}, [el("input", { type: "radio", name: "o2-perfil-" + st.modo, checked: d.perfil === k, onchange: function () { d.perfil = k; mudou(); desenhar(); } }), el("span", {}, [el("strong", { texto: K().PERFIS[k].nome }), el("span.t-mini", { texto: " — " + K().PERFIS[k].texto }), h ? el("span.t-mini.o2-assist__concede", { texto: " Concede: " + K().HABILIDADES[h].nome + "." }) : null])]);
      })));
    }

    /* ---------------- A PRIMEIRA TELA ---------------- */
    function telaDeModo() {
      return el("div.pilha", {}, [
        el("h3.o2-assist__titulo", { tabindex: "-1", texto: "Como você quer criar?" }),
        el("div.o2-assist__modos", {}, ["guiada", "pronta", "livre"].map(function (k) {
          var x = MODOS[k];
          var tem = k === "guiada" ? st.alcancada.guiada > 0 || st.r.guiada.perfil : k === "pronta" ? st.r.pronta.preset : st.r.livre.perfil || st.r.livre.nome;
          return el("button.o2-assist__modo" + (k === "guiada" ? ".o2-assist__modo--destaque" : ""), { type: "button", onclick: function () { st.modo = k; st.focarTitulo = true; desenhar(true); } }, [
            el("span.o2-assist__modo-titulo", { texto: x.titulo }),
            x.selo ? el("span.r-etiqueta", { texto: x.selo }) : null,
            x.destaque ? el("span.r-etiqueta.o2-assist__destaque", { texto: x.destaque }) : null,
            el("span.o2-assist__modo-texto", { texto: x.texto }),
            el("span.t-mini", { texto: ETAPAS[k].map(function (e) { return e[1]; }).join(" → ") }),
            tem ? el("span.t-mini.o2-assist__rascunho", { texto: "Rascunho guardado: continua de onde parou." }) : null,
          ]);
        })),
      ]);
    }

    /* ---------------- GUIADA ---------------- */
    function montarGuiada() {
      var G = st.r.guiada;
      var pericias = K().listaDePericias().map(function (p) {
        var chave = p.chave + (p.chave === "aptidao" ? ":" : "");
        var v = G.pericias[chave] || { dado: 4, esp: "" };
        return { chave: p.chave, especializacao: v.esp || "", dado: v.dado };
      });
      return { ambientacao: G.ambientacao, perfil: G.perfil, ocupacaoId: G.ocupacaoId, ocupacaoNome: G.ocupacaoNome, atributos: G.atributos, pericias: pericias, habilidadeOcupacao: G.habilidadeOcupacao, pv: G.pv, pd: G.pd };
    }
    /* Ocupação: um catálogo; as sugeridas para a ambientação primeiro, as
       outras pesquisáveis, e a personalizada. */
    function campoOcupacao(d, aoEscolher) {
      var sug = K().ocupacoes(d.ambientacao).filter(function (o) { return o.ambientacoes.indexOf(d.ambientacao) >= 0; });
      var outras = K().ocupacoes(d.ambientacao).filter(function (o) { return o.ambientacoes.indexOf(d.ambientacao) < 0; });
      return UI().campo({ rotulo: "Ocupação", tipo: "selecao", valor: d.ocupacaoId || (d.propria ? "__propria" : ""), ajuda: "Sugeridas para " + AMB[d.ambientacao] + " primeiro; as outras também valem.",
        opcoes: [{ valor: "", rotulo: "Escolha…" }].concat(sug.map(function (x) { return { valor: x.id, rotulo: x.nome }; })).concat(outras.length ? [{ valor: "__sep", rotulo: "— de outras ambientações —" }] : []).concat(outras.map(function (x) { return { valor: x.id, rotulo: x.nome + " (" + x.ambientacoes.map(function (a) { return AMB[a]; }).join(", ") + ")" }; })).concat([{ valor: "__propria", rotulo: "Personalizada…" }]),
        aoMudar: function (v) { if (v === "__sep") { desenhar(); return; } aoEscolher(v); mudou(); desenhar(); } });
    }
    function gIdentidade() {
      var G = st.r.guiada;
      return el("div.pilha", {}, [
        campoNome(G),
        campoCampanha(G),
        seletorDeAmbientacao(G),
        seletorDePerfil(G),
        campoOcupacao(G, function (v) {
          if (v === "__propria") { G.ocupacaoId = ""; G.propria = true; G.habilidadeOcupacao = ""; }
          else { G.propria = false; G.ocupacaoId = v; var x = K().ocupacao(v); G.ocupacaoNome = x ? x.nome : ""; G.habilidadeOcupacao = x && x.habilidade ? x.habilidade : ""; }
        }),
        G.propria ? UI().campo({ rotulo: "Nome da ocupação", valor: G.ocupacaoNome, limite: 80, aoDigitar: true, aoMudar: function (v) { G.ocupacaoNome = v; mudou(); atualizarResumo(); } }) : null,
      ]);
    }
    function gAtributos() {
      var G = st.r.guiada, c = R().conferirGuiada(montarGuiada());
      var resta = R().GUIADA.passosAtributo - c.passosAtributo;
      return el("div.pilha", {}, [
        el("p", { texto: "Um passo muda o tamanho do dado: d6 → d8. Todos começam em d6; o teto é d10." }),
        el("p.o2-contador.o2-assist__contador", { role: "status", "aria-live": "polite", texto: resta + " de " + R().GUIADA.passosAtributo + " passos disponíveis" }),
        el("div.o2-assist__atributos", {}, K().ORDEM_ATRIBUTOS.map(function (k) {
          var f = G.atributos[k], nome = K().ATRIBUTOS[k].nome;
          var podeMais = f < R().GUIADA.tetoAtributo && resta > 0, podeMenos = f > 6;
          return el("div.o2-assist__atributo", { role: "group", "aria-label": nome + " d" + f }, [
            el("span.o2-assist__atributo-nome", { texto: nome }),
            T().dado(f, { rotulo: nome + " d" + f }),
            bt("−", function () { G.atributos[k] = passo(f, -1); mudou(); desenhar(false, "atr-menos-" + k); }, { rotulo: "Diminuir " + nome, motivo: podeMenos ? "" : "Não fica abaixo de d6." }, "atr-menos-" + k),
            bt("+", function () { G.atributos[k] = passo(f, 1); mudou(); desenhar(false, "atr-mais-" + k); }, { rotulo: "Aumentar " + nome, motivo: podeMais ? "" : f >= R().GUIADA.tetoAtributo ? "No teto (d10)." : "Sem passos disponíveis." }, "atr-mais-" + k),
            el("span.t-mini", { texto: podeMais ? "próximo: d" + passo(f, 1) : f >= R().GUIADA.tetoAtributo ? "no teto (d10)" : "sem passos disponíveis" }),
          ]);
        })),
      ]);
    }
    function gPericias() {
      var G = st.r.guiada;
      var c = R().conferirGuiada(montarGuiada());
      var resta = R().GUIADA.passosPericia - c.passosPericia;
      var lista = el("div.pilha.o2-assist__grupos");
      var contador = el("p.o2-contador.o2-assist__contador.o2-assist__contador--preso", { role: "status", "aria-live": "polite", texto: resta + " de " + R().GUIADA.passosPericia + " passos disponíveis · d4 em todas; teto d8" });
      function pintarLista() {
        var busca = String(G.busca || "").trim().toLowerCase();
        var celular = global.matchMedia && global.matchMedia("(max-width: 760px)").matches;
        var grupos = K().ORDEM_ATRIBUTOS.map(function (a) {
          var itens = K().listaDePericias().filter(function (p) { return p.atributo === a; }).filter(function (p) {
            var chave = p.chave + (p.chave === "aptidao" ? ":" : ""), v = G.pericias[chave] || { dado: 4 };
            return (!busca || K().nomeDaPericia(null, p.chave).toLowerCase().indexOf(busca) >= 0) && (!G.soMelhoradas || v.dado > 4);
          });
          if (!itens.length) return null;
          var aberto = busca || G.soMelhoradas || !celular || G.grupoAberto === a || (!G.grupoAberto && a === "fisico");
          return el("details.o2-assist__grupo", { open: !!aberto, ontoggle: function (ev) { if (ev.currentTarget.open && celular) { G.grupoAberto = a; U.$$(".o2-assist__grupo", lista).forEach(function (d) { if (d !== ev.currentTarget) d.open = false; }); } } }, [
            el("summary", { texto: K().ATRIBUTOS[a].nome + " (" + itens.length + ")" }),
            el("ul.o2-assist__pericias", {}, itens.map(function (p) {
              var chave = p.chave + (p.chave === "aptidao" ? ":" : "");
              var v = G.pericias[chave] || { dado: 4, esp: "" };
              var nome = K().nomeDaPericia(null, p.chave);
              var podeMais = v.dado < R().GUIADA.tetoPericia && resta > 0;
              var id = "per-" + p.chave;
              return el("li.o2-assist__pericia" + (v.dado > 4 ? ".o2-assist__pericia--melhorada" : ""), {}, [
                el("span.o2-assist__pericia-nome", { texto: (v.dado > 4 ? "● " : "○ ") + nome }),
                T().dado(v.dado, { rotulo: nome + " d" + v.dado }),
                bt("−", function () { G.pericias[chave] = { dado: passo(v.dado, -1), esp: v.esp }; mudou(); repintar(id + "-menos"); }, { rotulo: "Diminuir " + nome, motivo: v.dado > 4 ? "" : "Já está em d4." }, id + "-menos"),
                bt("+", function () { G.pericias[chave] = { dado: passo(v.dado, 1), esp: v.esp }; mudou(); repintar(id + "-mais"); }, { rotulo: "Aumentar " + nome, motivo: podeMais ? "" : v.dado >= R().GUIADA.tetoPericia ? "No teto (d8)." : "Sem passos disponíveis." }, id + "-mais"),
                el("span.t-mini.o2-assist__proximo", { texto: podeMais ? "→ d" + passo(v.dado, 1) : v.dado >= R().GUIADA.tetoPericia ? "no teto (d8)" : "sem passos" }),
                p.chave === "aptidao" ? UI().campo({ rotulo: "Especialização", tipo: "selecao", valor: v.esp, opcoes: [{ valor: "", rotulo: "—" }].concat(K().especializacoes(G.ambientacao).map(function (e) { return { valor: e, rotulo: e }; })), aoMudar: function (x) { G.pericias[chave] = { dado: (G.pericias[chave] || v).dado, esp: x }; mudou(); atualizarResumo(); } }) : null,
              ]);
            })),
          ]);
        }).filter(Boolean);
        U.trocar(lista, grupos.length ? grupos : [el("p.t-mini", { texto: G.soMelhoradas ? "Nenhuma perícia melhorada ainda." : "Nenhuma perícia com esse nome." })]);
      }
      /* Mexer num dado repinta só a lista e o contador: a busca mantém o foco. */
      function repintar(foco) {
        c = R().conferirGuiada(montarGuiada());
        resta = R().GUIADA.passosPericia - c.passosPericia;
        contador.textContent = resta + " de " + R().GUIADA.passosPericia + " passos disponíveis · d4 em todas; teto d8";
        pintarLista(); atualizarResumo();
        if (foco) { var b = lista.querySelector('[data-foco="' + foco + '"]'); if (b && !b.disabled) b.focus(); else if (b) { var irmao = b.parentNode.querySelector("button:not([disabled])"); if (irmao) irmao.focus(); } }
      }
      pintarLista();
      return el("div.pilha", {}, [
        el("p", { texto: "Um passo muda o dado: d4 → d6 → d8. Agrupadas pelo atributo-base (a lista é a mesma em qualquer ambientação)." }),
        contador,
        el("div.o2-criar__campos", {}, [
          UI().campo({ rotulo: "Buscar perícia", valor: G.busca, limite: 40, aoDigitar: true, aoMudar: function (v) { G.busca = v; pintarLista(); } }),
          el("label.r-marca", {}, [el("input", { type: "checkbox", checked: G.soMelhoradas, onchange: function (ev) { G.soMelhoradas = ev.currentTarget.checked; pintarLista(); } }), el("span", { texto: "Ver só as melhoradas" })]),
        ]),
        lista,
      ]);
    }
    function gHabilidades() {
      var G = st.r.guiada;
      var oc = K().ocupacao(G.ocupacaoId);
      var dePerfil = G.perfil ? K().HABILIDADE_DE_PERFIL[G.perfil] : "";
      var t = "ocupação";
      return el("div.pilha", {}, [
        dePerfil ? el("div.o2-assist__habilidade.o2-assist__habilidade--perfil", {}, [el("span.o2-tag-titulo", { texto: K().HABILIDADES[dePerfil].nome }), el("span.t-mini", { texto: " Concedida pelo perfil " + K().PERFIS[G.perfil].nome + "." }), el("p.t-mini", { texto: K().HABILIDADES[dePerfil].texto })])
          : el("p.o2-motivo", { texto: "Escolha o perfil na Identidade para ver a habilidade dele." }),
        oc && oc.habilidade ? el("div.o2-assist__habilidade", {}, [el("strong", { texto: "De " + t + " (documentada): " + K().HABILIDADES[oc.habilidade].nome + ". " }), el("p.t-mini", { texto: K().HABILIDADES[oc.habilidade].texto })])
          : oc ? UI().campo({ rotulo: "Habilidade de " + t, tipo: "selecao", valor: G.habilidadeOcupacao, ajuda: "O playtest não diz qual é: escolha uma das vistas nas fichas desta ocupação ou defina depois, na ficha.", opcoes: [{ valor: "", rotulo: "Definir depois" }].concat(oc.vistas.filter(function (h) { return h !== dePerfil; }).map(function (h) { return { valor: h, rotulo: K().HABILIDADES[h].nome }; })), aoMudar: function (v) { G.habilidadeOcupacao = v; mudou(); desenhar(); } })
          : el("p.t-mini", { texto: G.propria ? "Ocupação personalizada: a habilidade dela entra depois, na ficha." : "Escolha a " + t + " na Identidade." }),
        G.habilidadeOcupacao && oc && !oc.habilidade ? el("p.t-mini", { texto: K().HABILIDADES[G.habilidadeOcupacao].texto }) : null,
        el("h4.t-secao", { texto: "Recursos" }),
        el("p.t-mini", { texto: "PV (pontos de vida) medem o corpo: dano físico tira PV. PD (pontos de determinação) medem a mente: dano emocional e o custo de algumas habilidades tiram PD. 16 PV / 12 PD é uma referência experimental de mesa — ajuste se quiser." }),
        el("div.o2-criar__campos", {}, [
          UI().campo({ rotulo: "PV", tipo: "numero", valor: String(G.pv), aoDigitar: true, aoMudar: function (v) { G.pv = U.inteiro(v, 16); mudou(); atualizarResumo(); } }),
          UI().campo({ rotulo: "PD", tipo: "numero", valor: String(G.pd), aoDigitar: true, aoMudar: function (v) { G.pd = U.inteiro(v, 12); mudou(); atualizarResumo(); } }),
        ]),
      ]);
    }
    function errosGuiada() {
      var G = st.r.guiada, c = R().conferirGuiada(montarGuiada()), l = [];
      if (!String(G.nome).trim()) l.push(["identidade", "Dê um nome ao personagem."]);
      c.erros.forEach(function (e) { l.push([/Atributo|Físico|Mente|Emoção/.test(e) ? "atributos" : /Perícia/.test(e) ? "pericias" : "identidade", e]); });
      return l;
    }

    /* ---------------- PRONTA ---------------- */
    function pEscolher() {
      var P = st.r.pronta, p = K().preset(P.preset);
      var grupos = [["alpha-contemporaneo", FONTE["alpha-contemporaneo"] + " (contemporâneo)"], ["beta-vigilia", FONTE["beta-vigilia"] + " (Contos da Vigília)"]].filter(function (g) { return !P.filtro || P.filtro === g[0]; });
      return el("div.pilha", {}, [
        el("fieldset.o2-assist__opcoes.o2-assist__opcoes--linha", {}, [el("legend", { texto: "Fonte" })].concat([["", "Todas"], ["alpha-contemporaneo", "Alpha"], ["beta-vigilia", "Beta"]].map(function (f) {
          return el("label.o2-assist__radio", {}, [el("input", { type: "radio", name: "o2-filtro", checked: P.filtro === f[0], onchange: function () { P.filtro = f[0]; desenhar(); } }), el("span", { texto: f[1] })]);
        }))),
        el("div.o2-presets", {}, grupos.map(function (g) {
          return el("section.o2-presets__grupo", { "aria-label": g[1] }, [
            el("h4.o2-presets__titulo", { texto: g[1] }),
            el("div.o2-presets__lista", { role: "radiogroup", "aria-label": g[1] }, K().PRESETS.filter(function (x) { return x.perfilRegras === g[0]; }).map(function (x) {
              var sel = P.preset === x.id;
              return el("button.o2-preset" + (sel ? ".o2-preset--escolhido" : ""), { type: "button", role: "radio", "aria-checked": String(sel), onclick: function () { escolherPreset(x); } }, [
                el("span.o2-preset__nome", { texto: x.nome }),
                el("span.o2-preset__sub", { texto: K().PERFIS[x.perfil].nome + " · nível " + x.nivel }),
                el("span.o2-preset__rec", { texto: "PV " + x.pv + " · PD " + x.pd }),
                sel ? el("span.o2-preset__marca", { texto: "✓ escolhida" }) : null,
              ]);
            })),
          ]);
        })),
        p ? el("div.pilha", {}, [
          previaDoPreset(p),
          campoNome(P, P.nome && P.nome !== P.nomeDoPreset ? "Nome editado: fica o seu, mesmo trocando de ficha." : "Pode usar o nome original ou editar antes de copiar."),
          P.nome && P.nome !== (p.nomeCompleto || p.nome) && P.nome !== P.nomeDoPreset ? T().botao("Usar o nome original (" + (p.nomeCompleto || p.nome) + ")", function () { P.nome = p.nomeCompleto || p.nome; P.nomeDoPreset = P.nome; mudou(); desenhar(); }) : null,
          campoCampanha(P),
          linha("Uma ficha pronta entra em qualquer campanha de Ordem II: as regras são as mesmas; nada é convertido."),
        ]) : el("p.t-mini", { texto: "Escolha um personagem para ver a prévia." }),
      ]);
    }
    function escolherPreset(x) {
      var P = st.r.pronta;
      var original = x.nomeCompleto || x.nome;
      /* Nome digitado à mão não é sobrescrito sem aviso. */
      if (!P.nome || P.nome === P.nomeDoPreset) { P.nome = original; P.nomeDoPreset = original; }
      P.preset = x.id; mudou(); desenhar();
    }

    /* ---------------- LIVRE ---------------- */
    function lIdentidade() {
      var L = st.r.livre;
      var ocs = K().ocupacoes(L.ambientacao).map(function (x) { return x.nome; });
      return el("div.pilha", {}, [
        campoNome(L),
        campoCampanha(L),
        seletorDeAmbientacao(L),
        seletorDePerfil(L),
        UI().campo({ rotulo: "Ocupação", valor: L.ocupacao, limite: 80, ajuda: "Do catálogo (" + ocs.join(", ") + ") ou outra.", aoDigitar: true, aoMudar: function (v) { L.ocupacao = v; mudou(); atualizarResumo(); } }),
        UI().campo({ rotulo: "Nível inicial (1–10)", tipo: "selecao", valor: String(L.nivel), ajuda: "Informar um nível maior não concede melhorias dos níveis anteriores: a ficha começa com os valores que você der.", opcoes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (n) { return { valor: String(n), rotulo: String(n) }; }), aoMudar: function (v) { L.nivel = Number(v); mudou(); atualizarResumo(); } }),
      ]);
    }
    function lDados() {
      var L = st.r.livre;
      return el("div.pilha", {}, [
        el("p.t-mini", { texto: "Começam com o padrão: d6 nos atributos e 16 PV / 12 PD. Perícias começam em d4; perícias, habilidades, armas, relações e a narrativa se preenchem depois, na ficha." }),
        el("div.o2-criar__campos", {}, K().ORDEM_ATRIBUTOS.map(function (k) {
          return UI().campo({ rotulo: K().ATRIBUTOS[k].nome, tipo: "selecao", valor: String(L.atributos[k]), opcoes: opcoesDeDado(DADOS.concat([20])), ajuda: L.atributos[k] === 20 ? "d20 só com efeito paranormal." : "", aoMudar: function (v) { L.atributos[k] = Number(v); mudou(); desenhar(); } });
        })),
        el("div.o2-criar__campos", {}, [
          UI().campo({ rotulo: "PV", tipo: "numero", valor: String(L.pv), aoDigitar: true, aoMudar: function (v) { L.pv = U.inteiro(v, 16); mudou(); atualizarResumo(); } }),
          UI().campo({ rotulo: "PD", tipo: "numero", valor: String(L.pd), aoDigitar: true, aoMudar: function (v) { L.pd = U.inteiro(v, 12); mudou(); atualizarResumo(); } }),
        ]),
      ]);
    }
    function errosLivre() {
      var L = st.r.livre, l = [];
      if (!String(L.nome).trim()) l.push(["identidade", "Dê um nome ao personagem."]);
      if (!L.perfil) l.push(["identidade", "Escolha o perfil."]);
      if (!(L.pv >= 1) || !(L.pd >= 1)) l.push(["dados", "PV e PD precisam ser pelo menos 1."]);
      return l;
    }
    function errosPronta() {
      var P = st.r.pronta, l = [];
      if (!P.preset) l.push(["escolher", "Escolha a ficha pronta."]);
      if (!String(P.nome).trim()) l.push(["escolher", "Dê um nome ao personagem."]);
      return l;
    }

    /* ---------------- REVISÃO ---------------- */
    function secao(titulo, etapa, linhas) {
      var i = etapas().map(function (e) { return e[0]; }).indexOf(etapa);
      return el("section.o2-assist__secao", {}, [
        el("div.o2-assist__secao-topo", {}, [el("h4", { texto: titulo }), T().botao("Editar", function () { st.revisar = true; ir(i); }, { rotulo: "Editar " + titulo })]),
        el("dl.o2-pares", {}, linhas.filter(Boolean).map(function (l) { return linhaPar(l[0], l[1]); })),
      ]);
    }
    function revisao() {
      var d = D(), partes = [], erros = [], pr;
      if (st.modo === "guiada") {
        var G = d, c = R().conferirGuiada(montarGuiada());
        erros = errosGuiada();
        var melhoradas = montarGuiada().pericias.filter(function (p) { return p.dado > 4; }).map(function (p) { return K().nomeDaPericia(null, p.chave) + (p.especializacao ? " (" + p.especializacao + ")" : "") + " d" + p.dado; });
        var dePerfil = G.perfil ? K().HABILIDADE_DE_PERFIL[G.perfil] : "";
        partes.push(secao("Identidade", "identidade", [["Nome", G.nome || "—"], ["Ambientação", AMB[G.ambientacao]], ["Campanha", G.campanhaId ? nomeCampanha(G.campanhaId) : "Sem campanha"], ["Perfil", G.perfil ? K().PERFIS[G.perfil].nome : "—"], ["Ocupação", G.ocupacaoNome || "—"], ["Nível inicial", "1"]]));
        partes.push(secao("Atributos", "atributos", K().ORDEM_ATRIBUTOS.map(function (k) { return [K().ATRIBUTOS[k].nome, "d" + G.atributos[k]]; })));
        partes.push(secao("Perícias", "pericias", [["Melhoradas", melhoradas.join(", ") || "nenhuma (todas em d4)"], ["Passos usados", c.passosPericia + " de " + R().GUIADA.passosPericia]]));
        partes.push(secao("Habilidades e recursos", "habilidades", [["Habilidades", [dePerfil ? K().HABILIDADES[dePerfil].nome : "", G.habilidadeOcupacao ? K().HABILIDADES[G.habilidadeOcupacao].nome : "a de ocupação: definir depois"].filter(Boolean).join(", ")], ["PV / PD", G.pv + " / " + G.pd + (G.pv !== 16 || G.pd !== 12 ? " (editados)" : " (referência experimental)")]]));
        var sobraA = R().GUIADA.passosAtributo - c.passosAtributo, sobraP = R().GUIADA.passosPericia - c.passosPericia;
        if ((sobraA > 0 || sobraP > 0) && !erros.length) partes.push(el("div.o2-aviso", { role: "status" }, [
          el("p", { texto: "Passos sem uso: " + [sobraA ? sobraA + " de atributo" : "", sobraP ? sobraP + " de perícia" : ""].filter(Boolean).join(" e ") + "." }),
          el("label.r-marca", {}, [el("input", { type: "checkbox", checked: G.sobraOk, onchange: function (ev) { G.sobraOk = ev.currentTarget.checked; desenhar(); } }), el("span", { texto: "Deixar sem uso e criar assim" })]),
        ]));
      } else if (st.modo === "pronta") {
        var p = K().preset(d.preset); erros = errosPronta();
        partes.push(secao("Ficha", "escolher", [["Personagem", p ? (p.nomeCompleto || p.nome) : "—"], ["Nome da cópia", d.nome || "—"], ["Fonte", p ? FONTE[p.perfilRegras] : "—"], ["Campanha", d.campanhaId ? nomeCampanha(d.campanhaId) : "Sem campanha"], p ? ["Perfil", K().PERFIS[p.perfil].nome + " · " + p.ocupacao + " · nível " + p.nivel] : null, p ? ["Dados", "Físico d" + p.atributos.fisico + " · Mente d" + p.atributos.mente + " · Emoção d" + p.atributos.emocao] : null, p ? ["PV / PD", p.pv + " / " + p.pd + " (os do playtest)"] : null, p ? ["Habilidades (efeito atual)", p.habilidades.map(function (h) { return (K().HABILIDADES[K().refDeHabilidade(h.id)] || {}).nome || h.id; }).join(", ")] : null]));
      } else {
        erros = errosLivre();
        partes.push(secao("Identidade", "identidade", [["Nome", d.nome || "—"], ["Ambientação", AMB[d.ambientacao]], ["Campanha", d.campanhaId ? nomeCampanha(d.campanhaId) : "Sem campanha"], ["Perfil", d.perfil ? K().PERFIS[d.perfil].nome : "—"], ["Ocupação", d.ocupacao || "a preencher na ficha"], ["Nível inicial", String(d.nivel)]]));
        partes.push(secao("Dados e recursos", "dados", K().ORDEM_ATRIBUTOS.map(function (k) { return [K().ATRIBUTOS[k].nome, "d" + d.atributos[k]]; }).concat([["PV / PD", d.pv + " / " + d.pd], ["Perícias", "d4 em todas (ajuste na ficha)"]])));
      }
      return el("div.pilha", {}, [
        erros.length ? el("div.o2-erros-revisao", { role: "alert" }, [el("p", {}, [el("strong", { texto: "Falta resolver antes de criar:" })]), el("ul", {}, erros.map(function (e) { var i = etapas().map(function (x) { return x[0]; }).indexOf(e[0]); return el("li", {}, [el("span", { texto: e[1] + " " }), T().botao("Corrigir", function () { st.revisar = true; ir(i); })]); }))]) : null,
      ].concat(partes).concat([linha("Resumo, história e aparência são opcionais: dá para preencher depois, na ficha.")]));
    }
    function linha(t) { return el("p.t-mini", { texto: t }); }

    /* ---------------- O RESUMO LATERAL ---------------- */
    var resumoAlvo = el("div.o2-assist__resumo-corpo");
    function atualizarResumo() {
      if (!st.modo) return;
      var d = D(), l = [];
      if (st.modo === "pronta") {
        var p = K().preset(d.preset);
        l = [["Nome", d.nome || "—"], ["Ficha", p ? p.nome : "—"], ["Fonte", p ? FONTE[p.perfilRegras] : "—"], p ? ["PV / PD", p.pv + " / " + p.pd] : null];
      } else {
        l = [["Nome", d.nome || "—"], ["Ambientação", AMB[d.ambientacao]], ["Perfil", d.perfil ? K().PERFIS[d.perfil].nome : "—"], ["Ocupação", (st.modo === "guiada" ? d.ocupacaoNome : d.ocupacao) || "—"], ["Dados", K().ORDEM_ATRIBUTOS.map(function (k) { return K().ATRIBUTOS[k].curto + " d" + d.atributos[k]; }).join(" · ")], ["PV / PD", d.pv + " / " + d.pd]];
        if (st.modo === "guiada") { var c = R().conferirGuiada(montarGuiada()); l.push(["Passos livres", "atributos " + (R().GUIADA.passosAtributo - c.passosAtributo) + " · perícias " + (R().GUIADA.passosPericia - c.passosPericia)]); }
      }
      U.trocar(resumoAlvo, [el("dl.o2-pares", {}, l.filter(Boolean).map(function (x) { return linhaPar(x[0], x[1]); }))]);
    }

    /* ---------------- A MOLDURA ---------------- */
    function conteudoDaEtapa() {
      var k = chaveEtapa();
      if (k === "revisao") return revisao();
      if (st.modo === "guiada") return { identidade: gIdentidade, atributos: gAtributos, pericias: gPericias, habilidades: gHabilidades }[k]();
      if (st.modo === "pronta") return pEscolher();
      return { identidade: lIdentidade, dados: lDados }[k]();
    }
    function desenhar(navegou, foco) {
      var rolador = raiz.closest(".r-modal__corpo");
      var y = rolador ? rolador.scrollTop : 0;
      if (!st.modo) { U.trocar(raiz, [telaDeModo()]); focarTitulo(); return; }
      var l = etapas(), i = st.etapa[st.modo], ultimo = i === l.length - 1;
      var titulo = el("h3.o2-assist__titulo", { tabindex: "-1", texto: l[i][1] });
      U.trocar(raiz, [
        el("div.o2-assist__cabeca", {}, [
          T().botao("← Trocar o modo", function () { st.modo = null; st.focarTitulo = true; desenhar(true); }, { classe: "r-botao--fantasma" }),
          el("p.o2-assist__modo-atual", {}, [el("strong", { texto: MODOS[st.modo].titulo }), MODOS[st.modo].selo ? el("span.r-etiqueta", { texto: MODOS[st.modo].selo }) : null]),
        ]),
        el("ol.o2-assist__passos", { "aria-label": "Etapas" }, l.map(function (e, j) {
          var estado = j === i ? "atual" : j <= st.alcancada[st.modo] ? "visitada" : "futura";
          var rot = (j === i ? "▶ " : j < i || j <= st.alcancada[st.modo] ? "✓ " : "") + (j + 1) + ". " + e[1];
          return el("li.o2-assist__passo.o2-assist__passo--" + estado, { "aria-current": j === i ? "step" : null }, [
            estado === "visitada" ? el("button.o2-assist__passo-botao", { type: "button", onclick: function () { ir(j); } }, [el("span", { texto: rot })]) : el("span", { texto: rot + (estado === "futura" ? " (a seguir)" : "") }),
          ]);
        })),
        el("p.o2-assist__contagem", { texto: "Passo " + (i + 1) + " de " + l.length + " · " + l[i][1] }),
        titulo,
        el("div.o2-assist__grade", {}, [
          el("div.o2-assist__etapa", {}, [conteudoDaEtapa()]),
          el("aside.o2-assist__resumo", { "aria-label": "Resumo" }, [el("details", { open: !(global.matchMedia && global.matchMedia("(max-width: 760px)").matches) }, [el("summary", { texto: "Resumo" }), resumoAlvo])]),
        ]),
        rodape(i, ultimo),
      ]);
      atualizarResumo();
      if (rolador) rolador.scrollTop = navegou ? 0 : y;
      if (foco) { var b = raiz.querySelector('[data-foco="' + foco + '"]'); if (b && !b.disabled) b.focus(); else if (b) { var irmao = b.parentNode.querySelector("button:not([disabled])"); if (irmao) irmao.focus(); } }
      focarTitulo();
    }
    function focarTitulo() { if (!st.focarTitulo) return; st.focarTitulo = false; var t = raiz.querySelector(".o2-assist__titulo"); if (t) t.focus(); }
    function rodape(i, ultimo) {
      var acao = st.modo === "pronta" ? "Copiar ficha" : "Criar ficha";
      return el("div.o2-assist__rodape", {}, [
        T().botao("Voltar", function () { if (i === 0) { st.modo = null; st.focarTitulo = true; desenhar(true); } else ir(i - 1); }, { grande: true, classe: "r-botao--fantasma" }),
        st.revisar && !ultimo ? T().botao("Voltar à revisão", function () { st.revisar = false; ir(etapas().length - 1); }, { grande: true }) : null,
        ultimo ? el("button.r-botao.r-botao--principal.o2-assist__criar", { type: "button", disabled: st.ocupado, "aria-busy": st.ocupado ? "true" : "false", onclick: function () { concluir(); } }, [el("span", { texto: st.ocupado ? "Enviando…" : acao })])
          : T().botao("Continuar", function () { ir(i + 1); }, { grande: true, classe: "r-botao--principal" }),
      ]);
    }
    /* ---------------- O ENVIO ---------------- */
    function montarFicha() {
      var d = D(), bloco;
      if (st.modo === "pronta") bloco = R().dePreset(d.preset);
      else if (st.modo === "livre") bloco = R().normalizar({ versaoRegras: K().REGRAS.versao, ambientacao: d.ambientacao, modoCriacao: "livre", perfil: d.perfil, ocupacao: { nome: d.ocupacao, personalizada: true }, nivel: d.nivel, base: { atributos: d.atributos }, recursos: { pv: { max: d.pv, atual: d.pv }, pd: { max: d.pd, atual: d.pd } } });
      else { var g = R().deGuiada(montarGuiada()); if (!g.ok) return { ok: false, erro: g.erros[0] }; bloco = g.bloco; }
      return { ok: true, ficha: global.RAMAFicha.criarFicha({ nome: String(d.nome).trim(), tipoFicha: "ordem2", campanhaId: d.campanhaId || null, ordem2: bloco }) };
    }
    async function concluir() {
      if (st.ocupado) return;
      var erros = st.modo === "guiada" ? errosGuiada() : st.modo === "pronta" ? errosPronta() : errosLivre();
      if (erros.length) { UI().avisoAtencao(erros[0][1]); return; }
      if (st.modo === "guiada") {
        var c = R().conferirGuiada(montarGuiada());
        if ((c.passosAtributo < R().GUIADA.passosAtributo || c.passosPericia < R().GUIADA.passosPericia) && !st.r.guiada.sobraOk) { UI().avisoAtencao("Há passos sem uso: confirme na revisão para criar assim."); return; }
      }
      /* O mesmo envio (nada mudou desde a última tentativa) repete a mesma
         ficha com o MESMO id de operação: uma resposta perdida não vira
         duas fichas. */
      var assinatura = JSON.stringify([st.modo, D()]);
      if (!st.envio || st.envio.assinatura !== assinatura) {
        var f = montarFicha();
        if (!f.ok) { UI().avisoAtencao(f.erro); return; }
        st.envio = { assinatura: assinatura, ficha: f.ficha, opId: global.RAMAApi.novaOperacao() };
      }
      st.ocupado = true; desenhar();
      var res;
      try { res = await global.RAMAApi.criarPersonagem(st.envio.ficha, st.envio.opId); }
      catch (erro) { res = { ok: false, erro: "sem_conexao" }; }
      if (!res.ok) {
        st.ocupado = false; desenhar();
        UI().avisoDeFalha(res, "criação da ficha de Ordem II (o rascunho continua aqui; tentar de novo não cria duas)");
        return;
      }
      st.descartar = true;
      m.fechar();
      location.href = U.url("ficha/?id=" + encodeURIComponent(res.dados.id));
    }

    m = UI().modal({
      titulo: "Nova ficha — Ordem Paranormal RPG II (Experimental)", classe: "o2-janela o2-janela-criar", largo: true, conteudo: [raiz], fundoFecha: true,
      podeFechar: function () {
        if (st.ocupado) { UI().avisoAtencao("Enviando a ficha: espere terminar."); return false; }
        if (!st.alterado || st.descartar) return true;
        UI().modal({ titulo: "Sair da criação?", classe: "o2-janela", exigeDecisao: true, conteudo: [el("p", { texto: "As escolhas feitas aqui ainda não viraram uma ficha." })], botoes: [
          { rotulo: "Continuar no formulário", classe: "r-botao--principal" },
          { rotulo: "Descartar", classe: "r-botao--perigo", aoClicar: function (f) { f(); st.descartar = true; m.fechar(); } },
        ] });
        return false;
      },
    });
    st.focarTitulo = true;
    desenhar(true);
    return m;
  }

  global.RAMAOrdem2Criar = { abrir: abrir, previaDoPreset: previaDoPreset, AMB: AMB };
})(window);
