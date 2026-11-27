/* =====================================================================
   R.A.M.A. — Ordem Paranormal · criação guiada do Companheiro Animal (v9.25.0)
   =====================================================================
   O mesmo padrão da criação de personagem de Ordem (trilha de etapas,
   Voltar/Continuar). Tudo fica num rascunho: CANCELAR NÃO GRAVA NADA.
   Só "Criar companheiro" põe UM registro na lista de aliados do tutor —
   nada de Homebrew, personagem solto ou combatente.

   Voltar e trocar porte, origem ou INT não apaga as escolhas: elas ficam
   no rascunho por id de vaga, e o motor marca exatamente quais deixaram
   de valer (e por quê) para serem revistas.
   ===================================================================== */

(function (global) {
  "use strict";
  var U = global.RAMAUtil, UI = global.RAMAUI, el = U.el;
  function M() { return global.RAMAOrdemCompanheiro; }
  function F() { return global.RAMAOrdemCompanheiroFicha; }

  function abrir(ctx, aoCriar) {
    if (!M() || !F()) return null;
    var C = M();
    var d = C.vazio();
    var imagem = "";
    var etapa = 0;
    var criando = false;
    var corpo = el("div.pilha", {});
    var rodapeInfo = el("p.t-mini", { role: "status" });

    var voltar = el("button.r-botao.r-botao--fantasma", { type: "button", texto: "Voltar", onclick: function () { if (etapa > 0) { etapa--; pintar(); } } });
    var avancar = el("button.r-botao.r-botao--principal", { type: "button", texto: "Continuar", onclick: function () { seguir(); } });

    function calc() { return C.calcular(d); }
    function avancado() { return d.nexIndice > 0; }

    var ETAPAS = [
      { chave: "conceito", titulo: "Conceito", desenhar: etapaConceito, conferir: function () { return d.nome.trim() ? null : "Dê um nome ao companheiro."; } },
      { chave: "porte", titulo: "Porte", desenhar: etapaPorte, conferir: function () { return null; } },
      { chave: "atributos", titulo: "Atributos", desenhar: etapaAtributos, conferir: function () { var p = calc().problemasDistribuicao; return p.length ? p[0] : null; } },
      { chave: "origem", titulo: "Origem", desenhar: etapaOrigem, conferir: function () {
        if (!d.origem) return "Escolha uma origem.";
        return problemaDe(function (v) { return /^origem\./.test(v.id); });
      } },
      { chave: "especializacao", titulo: "Especialização", desenhar: etapaEspecializacao, conferir: function () { return d.especializacao ? null : "Escolha a especialização."; } },
      { chave: "pericias", titulo: "Perícias", desenhar: etapaPericias, conferir: function () { return problemaDe(function (v) { return /^esp\./.test(v.id); }); } },
      { chave: "avanco", titulo: "Avanço", desenhar: etapaAvanco, conferir: function () { return problemaDe(function (v) { return v.marco !== 5; }); }, so: avancado },
      { chave: "revisao", titulo: "Revisão", desenhar: etapaRevisao, conferir: function () {
        var r = calc();
        if (r.problemasDistribuicao.length) return "Atributos: " + r.problemasDistribuicao[0];
        return r.pendentes.length ? "Ainda há " + r.pendentes.length + " decisão(ões) pendente(s): " + r.pendentes[0].rotulo + "." : null;
      } },
    ];
    function etapas() { return ETAPAS.filter(function (e) { return !e.so || e.so(); }); }
    function problemaDe(filtro) {
      var v = calc().vagas.filter(function (x) { return x.ativa && x.problema && filtro(x); })[0];
      return v ? v.rotulo + ": " + v.problema : null;
    }

    var pintada = null;
    function pintar() {
      var lista = etapas();
      if (etapa >= lista.length) etapa = lista.length - 1;
      var e = lista[etapa];
      var miolo = e.desenhar();
      U.trocar(corpo, [
        el("ol.criacao-trilha", {}, lista.map(function (x, i) {
          return el("li.criacao-trilha__passo", { class: i === etapa ? "criacao-trilha__passo--atual" : (i < etapa ? "criacao-trilha__passo--feito" : ""), texto: x.titulo, "aria-current": i === etapa ? "step" : null });
        })),
        el("h3.t-secao", { texto: (etapa + 1) + ". " + e.titulo }),
        miolo,
      ]);
      var Mv = global.RAMAMovimento;
      if (Mv && pintada !== null && pintada !== etapa) Mv.entrar(miolo, { de: etapa > pintada ? "direita" : "esquerda" });
      pintada = etapa;
      voltar.disabled = etapa === 0;
      avancar.textContent = etapa === lista.length - 1 ? "Criar companheiro" : "Continuar";
      rodapeInfo.textContent = "";
    }
    /* Escolher uma opção redesenha sem animação. */
    function repintar() { var p = pintada; pintar(); pintada = p; }

    function seguir() {
      var lista = etapas();
      var problema = lista[etapa].conferir();
      if (problema) { rodapeInfo.textContent = problema; return; }
      if (etapa < lista.length - 1) { etapa++; pintar(); return; }
      criar();
    }

    function criar() {
      if (criando) return;
      if (!ctx.emEdicao() || (ctx.podeEditar && !ctx.podeEditar())) { UI.avisoAtencao("A ficha não está mais em edição."); return; }
      criando = true;
      var aliado = { id: U.uuid(), tipo: "companheiro", origemId: null, imagem: imagem, companheiro: C.normalizar(d) };
      if (!Array.isArray(ctx.ficha.aliados)) ctx.ficha.aliados = [];
      ctx.ficha.aliados.push(aliado);
      ctx.alterou();
      m.fechar();
      if (aoCriar) aoCriar(aliado);
    }

    /* ---------- etapas ---------- */

    function etapaConceito() {
      var previa = el("div.comp-previa", {}, [imagem ? el("img", { src: imagem, alt: "" }) : "?"]);
      function texto(chave, rotulo, area, ajuda) {
        return UI.campo({ rotulo: rotulo, valor: d[chave], tipo: area ? "area" : undefined, limite: area ? 3000 : 80, aoDigitar: true, ajuda: ajuda || "",
          aoMudar: function (v) { d[chave] = v; } });
      }
      return el("div.pilha", {}, [
        el("p", { texto: "Um animal que acompanha o agente — o tutor é o dono desta ficha (" + (ctx.ficha.nome || "o personagem") + ")." }),
        el("p.t-mini", { texto: M().FONTE + ". Regras de fã: confira com a mesa." }),
        el("div.faixa", {}, [previa,
          el("button.r-botao.r-botao--fantasma", { type: "button", texto: "Imagem", onclick: async function () {
            var img = await global.RAMAEditorImagem.escolher("aliado");
            if (!img || !img.ok) return;
            imagem = img.imagem;
            U.trocar(previa, [el("img", { src: imagem, alt: "" })]);
          } }),
        ]),
        el("div.editar-grade", {}, [texto("nome", "Nome"), texto("especie", "Espécie", false, "Livre: cão, gato, corvo, jiboia…")]),
        texto("aparencia", "Aparência", true), texto("personalidade", "Personalidade", true), texto("historico", "Histórico", true),
        UI.campo({ tipo: "selecao", rotulo: "NEX inicial", valor: String(d.nexIndice),
          opcoes: C.NEX.map(function (n, i) { return { valor: String(i), rotulo: n + "%" }; }),
          ajuda: "Acima de 5%, a etapa “Avanço” reúne as decisões de cada marco.",
          aoMudar: function (v) {
            d.nexIndice = Number(v) || 0;
            d.crescimentos = d.crescimentos.filter(function (g) { return g.marco <= d.nexIndice; });
          } }),
      ]);
    }

    function etapaPorte() {
      var r = calc();
      var ordem = C.PORTES.map(function (p) { return p.chave; });
      return el("div.pilha", {}, [
        el("p", { texto: "O porte define atributos iniciais, tetos, PV, PE, COR, carga e o dano desarmado." }),
        el("div.criacao-lista", {}, C.PORTES.map(function (p) {
          var esc = d.porteInicial === p.chave;
          return el("button.criacao-opcao", { type: "button", "aria-pressed": String(esc), class: esc ? "criacao-opcao--escolhida" : "", onclick: function () {
            d.porteInicial = p.chave;
            if (ordem.indexOf(d.portePlanejado) < ordem.indexOf(p.chave)) d.portePlanejado = p.chave;
            if (d.zerado && !p.base[d.zerado]) d.zerado = "";
            repintar();
          } }, [
            el("span.criacao-opcao__nome", { texto: p.nome }),
            el("span.criacao-opcao__meta", { texto: p.tamanho }),
            el("span.criacao-opcao__texto", { texto: "Base " + C.ATRIBUTOS.map(function (a) { return a.sigla + " " + p.base[a.chave]; }).join(" · ") }),
            el("span.criacao-opcao__texto", { texto: "Tetos " + C.ATRIBUTOS.map(function (a) { return a.sigla + " " + p.tetos[a.chave]; }).join(" · ") }),
            el("span.criacao-opcao__texto", { texto: "PV " + p.pv[0] + "+VIG (+" + p.pv[1] + "+VIG) · PE " + p.pe[0] + "+PRE (+" + p.pe[1] + "+PRE) · COR " + p.cor[0] + " (+" + p.cor[1] + ") · carga " + p.cargaFor + "/FOR · desarmado " + p.desarmado }),
          ]);
        })),
        el("p.t-mini", { texto: "No limite entre dois tamanhos, vale o porte escolhido aqui." }),
        el("h4.t-secao", { texto: "Filhote: vai crescer?" }),
        UI.campo({ tipo: "selecao", rotulo: "Porte final planejado", valor: d.portePlanejado,
          opcoes: C.PORTES.filter(function (p) { return ordem.indexOf(p.chave) >= ordem.indexOf(d.porteInicial); }).map(function (p) { return { valor: p.chave, rotulo: p.nome + (p.chave === d.porteInicial ? " (não cresce)" : "") }; }),
          ajuda: "Cada categoria de crescimento tira 1 ponto da distribuição inicial; cada crescimento de verdade (registrado num marco de NEX) devolve 1 ponto.",
          aoMudar: function (v) { d.portePlanejado = v; d.crescimentos = d.crescimentos.slice(0, Math.max(0, ordem.indexOf(v) - ordem.indexOf(d.porteInicial))); repintar(); } }),
        F().resumo(r),
      ]);
    }

    function etapaAtributos() {
      var r = calc();
      var p = C.porte(d.porteInicial);
      var ini = C.atributosIniciais(d);
      var soma = C.ATRIBUTOS.reduce(function (s, a) { return s + (d.distribuicao[a.chave] || 0); }, 0);
      var alvo = C.pontosIniciais(d);
      return el("div.pilha", {}, [
        el("p", { texto: "Distribua " + alvo + " ponto(s) sobre a base do porte " + p.nome + ". Zerar um atributo que começa positivo dá +1 ponto (só um). Os tetos são os do porte." }),
        alvo < 2 && d.portePlanejado !== d.porteInicial ? el("p.t-mini.t-aviso", { texto: "Crescimento planejado até " + C.porte(d.portePlanejado).nome + ": −" + (2 + (d.zerado ? 1 : 0) - alvo) + " ponto(s) agora." + (alvo < 0 ? " Isso passa dos pontos livres: tire " + (-alvo) + " ponto(s) da base." : "") }) : null,
        el("p.t-secao", { class: soma === alvo ? "" : "t-aviso", texto: soma === alvo ? "Pontos distribuídos." : soma < alvo ? "Faltam " + (alvo - soma) + " ponto(s)." : "Pontos demais: " + (soma - alvo) + "." }),
        el("div.criacao-atributos", {}, C.ATRIBUTOS.map(function (a) {
          var v = ini[a.chave];
          return el("div.criacao-atributo", {}, [
            el("span.criacao-atributo__sigla", { texto: a.sigla }),
            el("span.criacao-atributo__nome", { texto: a.nome }),
            UI.passo({ valor: v, minimo: 0, maximo: p.tetos[a.chave], rotulo: a.nome, aoMudar: function (novo) {
              if (novo === 0 && p.base[a.chave] > 0 && (!d.zerado || d.zerado === a.chave)) { d.zerado = a.chave; d.distribuicao[a.chave] = 0; }
              else {
                if (d.zerado === a.chave && novo > 0) d.zerado = "";
                d.distribuicao[a.chave] = novo - (d.zerado === a.chave ? 0 : p.base[a.chave]);
              }
              repintar();
            } }),
            el("span.t-mini", { texto: "base " + p.base[a.chave] + (d.zerado === a.chave ? " (zerado: +1 ponto)" : "") + " · teto " + p.tetos[a.chave] + " · " + (v === 0 ? "2d20, o pior" : v + "d20") }),
          ]);
        })),
        r.problemasDistribuicao.length ? el("ul.bib-lista-textos", {}, r.problemasDistribuicao.map(function (x) { return el("li.t-mini.t-erro", { texto: x }); })) : null,
        F().resumo(r),
      ]);
    }

    function etapaOrigem() {
      var r = calc();
      var extras = r.vagas.filter(function (v) { return /^origem\./.test(v.id); });
      return el("div.pilha", {}, [
        el("p", { texto: "De onde o animal veio: duas perícias treinadas e um benefício." }),
        el("div.criacao-lista", {}, C.ORIGENS.map(function (o) {
          var esc = d.origem === o.chave;
          return el("button.criacao-opcao", { type: "button", "aria-pressed": String(esc), class: esc ? "criacao-opcao--escolhida" : "", onclick: function () { d.origem = esc ? "" : o.chave; repintar(); } }, [
            el("span.criacao-opcao__nome", { texto: o.nome }),
            el("span.criacao-opcao__meta", { texto: o.pericias.map(function (p) { return C.pericia(p).nome; }).join(" e ") }),
            el("span.criacao-opcao__texto", { texto: o.beneficio + ". " + o.texto }),
          ]);
        })),
        extras.length ? el("div.pilha--curta", { class: "pilha" }, extras.map(function (v) { return F().controleDaVaga(v, r, function (x) { escolher(v.id, x); }); })) : null,
      ]);
    }

    function etapaEspecializacao() {
      return el("div.pilha", {}, [
        el("p", { texto: "O papel do animal. O pacote de perícias e proficiências vem agora; a primeira habilidade chega em NEX 10%." }),
        el("div.criacao-lista", {}, C.ESPECIALIZACOES.map(function (e) {
          var esc = d.especializacao === e.chave;
          var pacote = (e.fixas.length ? e.fixas.map(function (p) { return C.pericia(p).nome; }).join(", ") + (e.fixaEscolha.length ? " e " : "") : "") +
            (e.fixaEscolha.length ? e.fixaEscolha.map(function (p) { return C.pericia(p).nome; }).join(" ou ") : "") +
            (e.fixas.length || e.fixaEscolha.length ? " + " : "") + e.livres + " + INT perícias livres";
          return el("button.criacao-opcao", { type: "button", "aria-pressed": String(esc), class: esc ? "criacao-opcao--escolhida" : "", onclick: function () { d.especializacao = esc ? "" : e.chave; repintar(); } }, [
            el("span.criacao-opcao__nome", { texto: e.nome }),
            el("span.criacao-opcao__meta", { texto: pacote }),
            el("span.criacao-opcao__texto", { texto: e.resumo + " Proficiências: " + e.proficiencias.join(", ") + "." }),
            el("span.criacao-opcao__texto", { texto: e.habilidades.map(function (h) { return h.nome + " (" + h.marco + "%)"; }).join(" · ") }),
          ]);
        })),
      ]);
    }

    function escolher(id, valor) {
      if (valor === null || valor === undefined || (Array.isArray(valor) && !valor.length)) delete d.escolhas[id];
      else d.escolhas[id] = valor;
      repintar();
    }

    function etapaPericias() {
      var r = calc();
      var tc = r.vagas.filter(function (v) { return /^esp\./.test(v.id); });
      var daOrigem = r.origem ? r.origem.pericias.map(function (p) { return C.pericia(p).nome; }).join(" e ") : "—";
      return el("div.pilha", {}, [
        el("p.t-mini", { texto: "Da origem: " + daOrigem + ". Se a especialização repetir uma delas, escolha uma substituta." }),
        el("div.pilha--curta", { class: "pilha" }, tc.map(function (v) { return F().controleDaVaga(v, r, function (x) { escolher(v.id, x); }); })),
        el("p.t-mini", { texto: "Treinadas agora: " + r.pericias.filter(function (p) { return p.grau !== "destreinado"; }).map(function (p) { return p.nome; }).join(", ") + "." }),
      ]);
    }

    function etapaAvanco() {
      var r = calc();
      var ordem = C.PORTES.map(function (p) { return p.chave; });
      var maxCresc = ordem.indexOf(d.portePlanejado) - ordem.indexOf(d.porteInicial);
      var partes = [el("p", { texto: "Começando em NEX " + C.NEX[d.nexIndice] + "%: as decisões acumuladas, com o marco de cada uma." })];
      if (maxCresc > 0) {
        partes.push(el("h4.t-secao", { texto: "Crescimento (" + d.crescimentos.length + " de " + maxCresc + ")" }));
        partes.push(el("p.t-mini", { texto: "Marque os marcos em que o animal cresceu. Os ganhos seguintes usam o novo porte; a infância não é recalculada como adulto." }));
        partes.push(el("div.criacao-pericias", {}, C.NEX.slice(1, d.nexIndice + 1).map(function (n, i) {
          var k = i + 1;
          var marcado = d.crescimentos.some(function (g) { return g.marco === k; });
          var cheio = !marcado && d.crescimentos.length >= maxCresc;
          return el("button.criacao-pericia", { type: "button", "aria-pressed": String(marcado), class: marcado ? "criacao-pericia--marcada" : (cheio ? "criacao-pericia--bloqueada" : ""), onclick: function () {
            if (cheio) { UI.avisoAtencao("Já há " + maxCresc + " crescimento(s) marcados."); return; }
            d.crescimentos = marcado ? d.crescimentos.filter(function (g) { return g.marco !== k; }) : d.crescimentos.concat([{ marco: k }]);
            if (marcado) delete d.escolhas["cresc." + n];
            d.crescimentos.sort(function (a, b) { return a.marco - b.marco; });
            repintar();
          } }, [el("span.criacao-pericia__nome", { texto: n + "%" })]);
        })));
      }
      partes.push(el("div.r-campo", {}, [el("label", { texto: "Ajuste inicial de Elo (decisão da mesa)" }),
        UI.passo({ valor: d.eloBase, minimo: 0, maximo: 100, rotulo: "Elo", aoMudar: function (v) { d.eloBase = v; repintar(); } }),
        el("p.r-ajuda", { texto: "Elo total: " + r.elo + "%" + (r.origem && r.origem.chave === "longaData" ? " (com +10 de Velhos Tempos)" : "") + ". Sugestão do suplemento: +15 a cada 10% de NEX." })]));
      F().porMarco(r.vagas.filter(function (v) { return v.marco !== 5; })).forEach(function (g) {
        partes.push(el("div.comp-marco", {}, [el("h5.t-mini.comp-marco__titulo", { texto: g.titulo })].concat(g.vagas.map(function (v) {
          return F().controleDaVaga(v, r, function (x) { escolher(v.id, x); });
        }))));
      });
      partes.push(F().resumo(r));
      return el("div.pilha", {}, partes);
    }

    function etapaRevisao() {
      var r = calc();
      return el("div.pilha", {}, [
        el("p", { texto: [d.nome || "Sem nome", d.especie, r.porte.nome, "NEX " + r.nex + "%", r.origem ? r.origem.nome : "", r.especializacao ? r.especializacao.nome : ""].filter(Boolean).join(" · ") }),
        el("p.t-mini", { texto: C.ATRIBUTOS.map(function (a) { return a.sigla + " " + r.atributos[a.chave]; }).join(" · ") }),
        F().resumo(r),
        el("p.t-mini", { texto: "Treinadas: " + r.pericias.filter(function (p) { return p.grau !== "destreinado"; }).map(function (p) { return p.nome + (p.grau !== "treinado" ? " (" + p.grauNome + ")" : ""); }).join(", ") + "." }),
        r.habilidades.filter(function (h) { return h.ativa; }).length ? el("p.t-mini", { texto: "Habilidades: " + r.habilidades.filter(function (h) { return h.ativa; }).map(function (h) { return h.nome; }).join(", ") + "." }) : null,
        r.pendentes.length ? el("ul.bib-lista-textos", {}, r.pendentes.map(function (v) { return el("li.t-mini.t-erro", { texto: v.rotulo + ": " + v.problema }); })) : el("p.t-mini", { texto: "Tudo decidido. Ao criar, o companheiro entra na lista de aliados desta ficha." }),
      ]);
    }

    var m = UI.modal({
      titulo: "Novo companheiro animal", largo: true,
      conteudo: [corpo, rodapeInfo],
      botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }],
    });
    var rodape = m.janela.querySelector(".r-modal__rodape");
    rodape.appendChild(voltar);
    rodape.appendChild(avancar);
    pintar();
    return m;
  }

  global.RAMAOrdemCompanheiroCriar = { abrir: abrir };
})(window);
