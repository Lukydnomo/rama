/* =====================================================================
   R.A.M.A. — BRUTAL · a ficha da Sobrevivente (v7.0)
   ---------------------------------------------------------------------
   O bloco de cima é o TABULEIRO de jogo (o arranjo da ficha de
   referência): identidade, o Arquétipo com Vantagens, Habilidades,
   Ações, Iniciativa e Detalhes ao alcance; Ferida, Sequela, Marcadores,
   Recursos e Dificuldade; as Rolagens; a Pilha da Intérprete e a Pilha
   de Fuga; os Pontos de Tensão e os botões Arriscar Tudo, Descartar,
   Sacrificar e Rolar. Toda ação vira UMA operação do motor
   (RAMABrutalThriller.operar) — na campanha, o servidor rola e aplica;
   sem campanha, o treino da ficha. Quando algo não pode, o motivo
   aparece junto.

     RAMASecaoBrutal          bloco superior + aba "Sobrevivente"
                              (Arquétipo, identidade, Apegos, detalhes)
     RAMASecaoBrutalThriller  o Thriller: cena, testes pedidos, registro
                              e, no treino, os controles da mesa
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el;
  function K() { return global.RAMABrutalCatalogo; }
  function M() { return global.RAMABrutalMesa; }
  function B() { return global.RAMABrutal; }
  function T() { return global.RAMABrutalTela; }
  function TH() { return global.RAMABrutalThriller; }
  function UI() { return global.RAMAUI; }

  var ui = { aba: "vantagens", estilo: "" };
  function op(ctx, o, opcoes) { return TH().operar(ctx, o, opcoes); }
  function botao(t, fn, o) { return T().botao(t, fn, o); }
  function nomeEstilo(k) { return T().nomeEstilo(k); }

  function contexto(ctx) {
    var modo = TH().modo(ctx);
    var e = TH().estado(ctx);
    var s = e ? M().sob(e, TH().quem(ctx)) : null;
    var dir = TH().ehDiretora(ctx);
    var pode = ctx.podeEditar() || (modo === "campanha" && dir);
    return { modo: modo, e: e, s: s, diretora: dir, pode: pode, a: K().ARQUETIPOS[ctx.ficha.brutal.arquetipo] || null };
  }

  /* ---------------------------------------------------------------
     O TABULEIRO
     --------------------------------------------------------------- */
  function blocoSuperior(ctx) {
    var b = ctx.ficha.brutal;
    if (!b || !M()) return el("p", { texto: "O motor de BRUTAL não está carregado nesta página." });
    var x = contexto(ctx);
    var cor = x.a ? x.a.cor : "#c0392b";
    if (x.modo === "carregando") return el("div.brt-ficha.brt-ficha--carregando", { style: "--brt-cor: " + cor }, [UI().carregando("Abrindo o Thriller da campanha")]);
    if (!x.s) {
      return el("div.brt-ficha", { style: "--brt-cor: " + cor }, [el("div.brt-aviso", { role: "status" }, [
        el("p", { texto: "Esta Sobrevivente ainda não aparece no Thriller da campanha. Salve a ficha e recarregue; se continuar, confira se ela está vinculada à campanha." }),
        botao("Recarregar o Thriller", function () { TH().carregar(ctx, true); }),
      ])]);
    }
    return el("div.brt-tabuleiro", { style: "--brt-cor: " + cor, dataset: { situacao: x.s.situacao } }, [
      faixaDoThriller(ctx, x),
      testePendente(ctx, x),
      pedidosAbertos(ctx, x),
      el("div.brt-ficha", {}, [
        el("div.brt-col.brt-col--esq", {}, [identidade(ctx, x), cartaoDoArquetipo(ctx, x)]),
        el("div.brt-col.brt-col--meio", {}, [
          el("div.brt-linha", {}, [feridaESequela(ctx, x), marcadores(ctx, x)]),
          el("div.brt-linha", {}, [recursos(ctx, x), dificuldade(ctx, x)]),
          rolagens(ctx, x),
          el("div.brt-linha", {}, [pilhaComum(ctx, x), pilhaDeFuga(ctx, x)]),
        ]),
        el("div.brt-col.brt-col--dir", {}, [pontosDeTensao(ctx, x), grandesBotoes(ctx, x)]),
      ]),
    ]);
  }

  function faixaDoThriller(ctx, x) {
    var e = x.e, s = x.s;
    var partes = [];
    if (x.modo === "campanha") partes.push("Thriller da campanha" + (ctx.nomeDaCampanha && ctx.nomeDaCampanha() ? " " + ctx.nomeDaCampanha() : ""));
    else partes.push(x.modo === "outra" ? "Treino (a campanha desta ficha não abriu a Mesa da Diretora)" : "Treino — sem campanha");
    partes.push("Sessão " + e.sessao);
    partes.push("Cena " + K().CENAS[e.cena].nome);
    var vez = "";
    if (e.encontro) {
      var d = M().daVez(e);
      vez = d === "assassino" ? "vez do Assassino" : d === s.id ? "É A SUA VEZ" : "vez de " + ((e.sobreviventes[d] || {}).nome || "?");
      partes.push("Rodada " + e.encontro.rodada + " · " + vez);
    }
    var sit = s.situacao === "morta" ? "☠ Morta" : s.situacao === "fugiu" ? "🏃 Escapou do Encontro" : "";
    return el("div.brt-faixa" + (e.encontro ? ".brt-faixa--encontro" : ""), { role: "status" }, [
      el("span.brt-faixa__texto", { texto: partes.join(" · ") }),
      sit ? el("span.r-etiqueta.r-etiqueta--aviso", { texto: sit }) : null,
      s.segurada ? el("span.r-etiqueta.r-etiqueta--aviso", { texto: "SEGURADA" }) : null,
      e.encontro && e.encontro.faltam && e.encontro.faltam[s.id] !== undefined ? el("span.r-etiqueta", { texto: "Faltam " + e.encontro.faltam[s.id] + " para fugir" }) : null,
      e.encontro && e.diretora.pilha !== undefined ? el("span.r-etiqueta", { texto: "Pilha do Assassino: " + e.diretora.pilha }) : null,
      s.planejarNoEncontro && x.pode ? botao("Planejar Fuga: mover 1 dado", function () { op(ctx, { tipo: "usarPlanejarFuga" }); }, { motivo: s.pilha < 1 ? "A Pilha Comum está vazia." : s.segurada ? "Ela está SEGURADA." : "" }) : null,
    ]);
  }

  /* O teste que espera uma decisão (Resiliência, Benefício da Dúvida). */
  function testePendente(ctx, x) {
    var s = x.s, t = s.teste;
    if (!t) return null;
    var reativas = M().opcoesReativas(x.e, s, t);
    var escolha = { indice: -1, marcador: "" };
    var marc = M().marcadoresDaAtleta(s);
    var area = el("div.brt-pendente", { role: "alert" });
    function desenhar() {
      U.trocar(area, [
        el("p", {}, [el("strong", { texto: (t.rotulo || "Teste") + ": " }), el("span", { texto: "rolou " + t.faces.join(", ") + " (sucesso em " + t.dificuldade + "+). Decida antes de seguir." })]),
        el("div.brt-rolagem__dados", {}, t.faces.map(function (f, i) {
          var b0 = el("button.brt-dado-botao" + (escolha.indice === i ? ".brt-dado-botao--sel" : ""), { type: "button", "aria-pressed": String(escolha.indice === i), onclick: function () { escolha.indice = i; desenhar(); } }, [T().dado(f, { estado: f >= t.dificuldade ? "sucesso" : "falha", marca: f >= t.dificuldade ? "✓" : "✗" })]);
          return reativas.indexOf("resiliencia") >= 0 ? b0 : T().dado(f, { estado: f >= t.dificuldade ? "sucesso" : "falha" });
        })),
        reativas.indexOf("resiliencia") >= 0 ? el("div.faixa", {}, [
          el("span.t-mini", { texto: "Resiliência (uma vez por Encontro): toque num dado e troque pelo valor de um Dado Marcador seu." }),
          UI().campo({ rotulo: "Marcador", tipo: "selecao", valor: escolha.marcador, opcoes: [{ valor: "", rotulo: "—" }].concat(marc.map(function (m) { return { valor: m.id, rotulo: m.nome + " (" + m.valor + ")" }; })), aoMudar: function (v) { escolha.marcador = v; } }),
          botao("Trocar e confirmar", function () { op(ctx, { tipo: "confirmarTeste", substituir: { indice: escolha.indice, marcador: escolha.marcador } }); }, { motivo: escolha.indice < 0 ? "Toque no dado que vai trocar." : "" }),
        ]) : null,
        el("div.faixa", {}, [
          reativas.indexOf("beneficioDaDuvida") >= 0 ? botao("Repetir o Teste de Susto (Benefício da Dúvida)", function () { op(ctx, { tipo: "repetirSusto" }); }) : null,
          botao("Confirmar o resultado", function () { op(ctx, { tipo: "confirmarTeste" }); }, { classe: "r-botao--principal" }),
        ]),
      ]);
    }
    desenhar();
    return x.pode ? area : el("p.brt-pendente", { texto: "Teste esperando a decisão da jogadora." });
  }

  function pedidosAbertos(ctx, x) {
    var meus = x.e.pedidos.filter(function (p) { return p.aberto && p.alvos.indexOf(x.s.id) >= 0 && !p.respostas[x.s.id]; });
    if (!meus.length) return null;
    return el("div.brt-pedidos", { role: "alert" }, meus.map(function (p) {
      var mot = M().motivoDoTeste(x.e, x.s, p);
      return el("div.brt-pedido", {}, [
        el("strong", { texto: "A Diretora pede: " + p.rotulo }),
        el("span.t-mini", { texto: p.tipo === "susto" ? "1 dado; a falha é descartada." : p.tipo === "complexo" ? "Teste Complexo: exatamente 2 sucessos." : "Teste comum: 1 sucesso basta." }),
        x.pode ? botao("Responder", function () { abrirTeste(ctx, { pedido: p.id }); }, { motivo: mot, classe: "r-botao--principal" }) : null,
        T().motivo(mot),
      ]);
    }));
  }

  /* ---------- identidade ---------- */
  function identidade(ctx, x) {
    var b = ctx.ficha.brutal;
    var geral = global.RAMASecaoGeral;
    var edita = ctx.podeEditar();
    function campoLivre(rotulo, chave, limite) {
      return UI().campo({ rotulo: rotulo, valor: b[chave], limite: limite, desabilitado: !edita, aoMudar: function (v) { b[chave] = String(v).slice(0, limite); ctx.alterou(); } });
    }
    var foto = geral && geral.foto && ctx.foto ? geral.foto(ctx) : (x.a ? el("img.brt-avatar", { src: global.RAMABrutalCriar ? global.RAMABrutalCriar.imagem(b.arquetipo) : "", alt: "" }) : el("span.brt-avatar.brt-avatar--vazio", { "aria-hidden": "true", texto: "?" }));
    return el("section.brt-cartao.brt-identidade", { "aria-label": "Identidade" }, [
      el("div.brt-identidade__foto", {}, [foto]),
      el("div.brt-identidade__campos", {}, [
        geral && geral.campoNome ? geral.campoNome(ctx) : el("h1.t-titulo", { texto: ctx.ficha.nome }),
        el("div.brt-linha", {}, [campoLivre("Pronomes", "pronomes", 40), campoLivre("Intérprete", "interprete", 80)]),
      ]),
    ]);
  }

  /* ---------- o Arquétipo e as abas internas ---------- */
  var ABAS = [
    { chave: "vantagens", rotulo: "Vantagens" },
    { chave: "habilidades", rotulo: "Habilidades" },
    { chave: "acoes", rotulo: "Ações" },
    { chave: "iniciativa", rotulo: "Iniciativa" },
    { chave: "detalhes", rotulo: "Detalhes" },
  ];

  function cartaoDoArquetipo(ctx, x) {
    var s = x.s, a = x.a;
    var conteudo = { vantagens: abaVantagens, habilidades: abaHabilidades, acoes: abaAcoes, iniciativa: abaIniciativa, detalhes: abaDetalhes }[ui.aba] || abaVantagens;
    return el("section.brt-cartao.brt-arquetipo", { "aria-label": "Arquétipo" }, [
      el("header.brt-arquetipo__topo", {}, [
        el("strong", { texto: a ? a.nome : "Sem Arquétipo" }),
        ctx.podeEditar() ? el("button.brt-icone", { type: "button", title: "Trocar o Arquétipo", "aria-label": "Trocar o Arquétipo", texto: "✎", onclick: function () { ctx.irParaAba("geral"); } }) : null,
      ]),
      el("div.brt-estilos", {}, (s.estilos.length ? s.estilos : (a ? a.estilos : [])).map(function (k) {
        var inc = s.incapacitados.indexOf(k) >= 0;
        return el("span.brt-estilo" + (inc ? ".brt-estilo--incapacitado" : ""), { title: inc ? "Incapacitado: não reduz a Dificuldade e a Vantagem dele não vale" : K().ESTILOS[k].texto, texto: nomeEstilo(k) + (inc ? " (incapacitado)" : "") });
      })),
      el("div.brt-abas", { role: "tablist", "aria-label": "Consulta" }, ABAS.map(function (ab) {
        var ativa = ui.aba === ab.chave;
        return el("button.brt-aba" + (ativa ? ".brt-aba--ativa" : ""), { type: "button", role: "tab", "aria-selected": String(ativa), dataset: { aba: ab.chave }, texto: ab.rotulo, onclick: function () { ui.aba = ab.chave; ctx.atualizar(["bloco"]); } });
      })),
      el("div.brt-abas__conteudo", { role: "tabpanel" }, conteudo(ctx, x)),
    ]);
  }

  function itemDeLista(titulo, origem, pe, texto, acoes, extra) {
    return el("article.brt-item", {}, [
      el("header.brt-item__topo", {}, [
        pe !== null && pe !== undefined ? el("span.brt-chama", { title: "Custo em Pontos de Tensão", texto: String(pe) }) : null,
        el("div", {}, [origem ? el("span.brt-item__origem", { texto: origem }) : null, el("strong.brt-item__nome", { texto: titulo })]),
        extra ? el("span.brt-item__recarga", { texto: extra }) : null,
      ]),
      texto ? el("p.brt-item__texto", { texto: texto }) : null,
      acoes && acoes.length ? el("div.faixa", {}, acoes) : null,
    ]);
  }

  function abaVantagens(ctx, x) {
    var e = x.e, s = x.s;
    var lista = M().vantagensDe(e, s);
    if (!lista.length) return [el("p.t-mini", { texto: "Escolha o Arquétipo para ver as Vantagens." })];
    return [el("p.t-mini", { texto: "Fora de um Encontro. Custam Pontos de Tensão e voltam pela recarga (p. 8)." })].concat(lista.map(function (k) {
      var v = M().definicaoDaVantagem(e, k);
      var mot = M().motivoDaVantagem(e, s, k);
      var origem = v.oficial ? (v.estilo ? "Do Estilo " + nomeEstilo(v.estilo) : "Das Vantagens Gerais") : "Da mesa" + (v.estilo ? " · " + nomeEstilo(v.estilo) : "");
      var custo = v.custo === null || v.custo === undefined ? (k === "compartilharForcas" ? "?" : "—") : v.custo;
      return itemDeLista(v.nome, origem, custo, v.texto, x.pode ? [botao("Usar", function () { usarVantagem(ctx, x, k); }, { motivo: mot }), T().motivo(mot)] : [], T().nomeRecarga(M().recargaDaVantagem(e, k)));
    }));
  }

  function abaHabilidades(ctx, x) {
    var a = x.a, s = x.s, e = x.e;
    if (!a) return [el("p.t-mini", { texto: "Sem Arquétipo." })];
    var h = a.habilidade;
    var acoes = [];
    if (["memoriaFotografica", "caraLavada", "ole"].indexOf(h.chave) >= 0 && x.pode) {
      var mot = M().motivoDaHabilidade(e, s, h.chave);
      acoes.push(botao("Usar " + h.nome, function () {
        op(ctx, { tipo: "habilidade", chave: h.chave }).then(function (r) { if (r && r.ok && r.faltam !== undefined && r.faltam !== null) UI().aviso("Memória Fotográfica: faltam " + r.faltam + " dado(s) para completar a sua Pilha de Fuga.", { duracao: 12000 }); });
      }, { motivo: mot }));
      acoes.push(T().motivo(mot));
    }
    if (h.chave === "carencia" && x.pode) acoes.push(el("label.r-marca", {}, [el("input", { type: "checkbox", checked: s.carenciaAutomatica, onchange: function (ev) { op(ctx, { tipo: "preferencia", carenciaAutomatica: ev.currentTarget.checked }, { silencioso: true }); } }), el("span", { texto: "Usar Carência sozinha quando me ajudarem num Encontro" })]));
    var estado = "";
    if (h.chave === "resiliencia") estado = s.usos["h:resiliencia"] ? "Usada — volta no fim de um Encontro." : "Disponível: aparece ao rolar, se você tiver um Dado Marcador.";
    if (h.chave === "beneficioDaDuvida") estado = "Automática: ao rolar um Teste de Susto, você escolhe repetir.";
    if (h.chave === "egocentrica") estado = "Automática: +1 PT por 6 rolado.";
    if (h.chave === "ateOFim") estado = "Aparece ao Arriscar Tudo para se salvar.";
    if (h.chave === "carencia") estado = s.sessaoUsos.carencia ? "Usada nesta sessão." : "Disponível nesta sessão.";
    return [
      itemDeLista(h.nome, "Habilidade · " + a.nome, null, h.texto, acoes, "Cena: " + h.cena + " · Recarga: " + T().nomeRecarga(h.recarga)),
      estado ? el("p.t-mini", { texto: estado }) : null,
      h.lacuna ? el("p.brt-lacuna", { texto: "Lacuna do Corte Rápido: " + K().LACUNAS[h.lacuna].texto }) : null,
    ];
  }

  function abaAcoes(ctx, x) {
    var e = x.e, s = x.s;
    var lista = K().ORDEM_ACOES_ENCONTRO.map(function (k) {
      var d = K().ACOES_ENCONTRO[k];
      var mot = M().motivoDaAcao(e, s, k);
      return itemDeLista(d.nome, d.estilo && d.estilo !== "livre" ? "Teste " + nomeEstilo(d.estilo) + (d.teste === "complexo" ? " · Complexo" : "") : d.estilo === "livre" ? "Teste no Estilo apropriado" : "Sem teste", null, d.texto, x.pode ? [botao("Fazer", function () { abrirAcao(ctx, k); }, { motivo: mot }), T().motivo(mot)] : [], "p. " + d.pagina);
    });
    if (M().marcadorDe(s, "restricao")) {
      var m1 = M().motivoDaAcao(e, s, "livrarRestricao");
      lista.unshift(itemDeLista("Livrar-se da Restrição", "Teste Ligeiro ou Sagaz · Complexo", null, K().ACOES_ASSASSINO.restringir.texto, x.pode ? [botao("Tentar", function () { abrirAcao(ctx, "livrarRestricao"); }, { motivo: m1 }), T().motivo(m1)] : [], "p. 14"));
    }
    if (e.encontro && M().restantesNoEncontro(e).some(function (y) { return y.segurada && y.id !== s.id; })) {
      var m2 = M().motivoDaAcao(e, s, "livrarAliada");
      lista.unshift(itemDeLista("Livrar a aliada SEGURADA", "Teste Complexo", null, "As demais Sobreviventes podem fazer Testes Complexos para livrar a aliada das mãos do Assassino (p. 14).", x.pode ? [botao("Tentar", function () { abrirAcao(ctx, "livrarAliada"); }, { motivo: m2 }), T().motivo(m2)] : [], "p. 14"));
    }
    return [el("p.t-mini", { texto: "Num Encontro, uma Ação por vez, na sua vez da Iniciativa. Vantagens não valem durante o Encontro (p. 21)." })].concat(lista);
  }

  function abaIniciativa(ctx, x) {
    var e = x.e, s = x.s;
    if (e.encontro) {
      var vez = M().daVez(e);
      return [el("ol.brt-iniciativa", {}, e.encontro.ordem.map(function (id) {
        var y = id === "assassino" ? null : e.sobreviventes[id];
        var nome = id === "assassino" ? "Assassino" : (y ? y.nome + " (" + ((K().ARQUETIPOS[y.arquetipo] || {}).nome || "?") + ")" : "?");
        var sit = y && y.situacao !== "viva" ? (y.situacao === "morta" ? " ☠" : " 🏃") : "";
        return el("li" + (vez === id ? ".brt-iniciativa--vez" : "") + (y && y.id === s.id ? ".brt-iniciativa--eu" : ""), { texto: nome + sit + (vez === id ? " — vez" : "") });
      })), el("p.t-mini", { texto: "Rodada " + e.encontro.rodada + "." })];
    }
    return [el("p.t-mini", { texto: "A Iniciativa é fixa, pelo Arquétipo; o Assassino é sempre o último (p. 21)." }), el("ol.brt-iniciativa", {}, K().INICIATIVA.map(function (k) {
      return el("li" + (k === s.arquetipo ? ".brt-iniciativa--eu" : ""), { texto: K().ARQUETIPOS[k].nome });
    }).concat([el("li", { texto: "Assassino" })]))];
  }

  function abaDetalhes(ctx, x) {
    var b = ctx.ficha.brutal, a = x.a, s = x.s;
    var apegos = ["item", "relacao", "desejo"].map(function (k) {
      var ap = K().APEGOS[k];
      var nome = k === "desejo" ? (b.apegos.desejo.texto ? "(segredo)" : "") : b.apegos[k].nome;
      var mot = s.situacao === "morta" ? "Ela está morta." : k === "desejo" ? (s.desejoRevelado || b.apegos.desejo.revelado ? "Já revelado: não pode ser usado de novo." : "") : (s.sessaoUsos["apego:" + k] ? "Já usado nesta sessão." : "");
      if (s.teste) mot = "Confirme o teste que está esperando.";
      return itemDeLista(ap.nome + (nome ? ": " + nome : ""), "Apego · +" + ap.pt + " PT", null, ap.texto, x.pode ? [botao(k === "desejo" ? "Revelar" : "Usar", function () { usarApego(ctx, k); }, { motivo: mot }), T().motivo(mot)] : [], k === "desejo" ? "uma vez" : "1×/sessão");
    });
    return [
      a ? el("p.t-mini", { texto: a.adjetivos.toUpperCase() }) : null,
      a ? el("p", { texto: a.resumo }) : null,
    ].concat(apegos);
  }

  /* ---------- Ferida, Sequela, Marcadores ---------- */
  function feridaESequela(ctx, x) {
    var s = x.s, dir = x.diretora;
    return el("section.brt-cartao.brt-ferida", { "aria-label": "Ferida e Sequela" }, [
      el("div.brt-ferida__bloco", {}, [
        el("span.brt-rotulo", { texto: "Ferida" }),
        s.ferida ? T().dado(s.ferida, { estado: "ferida", rotulo: "Dado Marcador de Ferida: " + s.ferida }) : el("span.brt-vazio", { texto: "—", title: "Sem Ferida" }),
        s.ferida > 6 ? el("span.t-mini.brt-alerta", { texto: "acima de 6" }) : null,
        dir && x.pode ? el("div.brt-mais-menos", {}, [
          botao("−", function () { op(ctx, { tipo: "ajustar", alvo: s.id, campo: "ferida", delta: -1 }); }, { rotulo: "Ferida −1", motivo: s.ferida ? "" : "Sem Ferida." }),
          botao("+", function () { op(ctx, { tipo: "ajustar", alvo: s.id, campo: "ferida", delta: 1 }); }, { rotulo: "Ferida +1" }),
        ]) : null,
        s.pendentes.reduzirFerida ? el("span.t-mini", { texto: "próxima Ferida −" + s.pendentes.reduzirFerida }) : null,
      ]),
      el("div.brt-ferida__bloco", {}, [
        el("span.brt-rotulo", { texto: "Sequela" }),
        el("span.brt-contador", { texto: String(s.sequelas), "aria-label": s.sequelas + " Sequelas" }),
        dir && x.pode ? el("div.brt-mais-menos", {}, [
          botao("+", function () { op(ctx, { tipo: "ajustar", alvo: s.id, campo: "sequelas", delta: 1 }); }, { rotulo: "Sequela +1" }),
          botao("−", function () { op(ctx, { tipo: "ajustar", alvo: s.id, campo: "sequelas", delta: -1 }); }, { rotulo: "Sequela −1", motivo: s.sequelas ? "" : "Sem Sequelas." }),
        ]) : null,
      ]),
    ]);
  }

  function marcadores(ctx, x) {
    var s = x.s;
    return el("section.brt-cartao.brt-marcadores", { "aria-label": "Marcadores" }, [
      el("span.brt-rotulo", { texto: "Marcadores" }),
      el("div.brt-marcadores__lista", {}, s.marcadores.length ? s.marcadores.map(function (m) {
        return el("span.brt-marcador", { title: m.nome + ": " + m.valor }, [T().dado(m.valor, { estado: m.tipo, pequeno: true, rotulo: m.nome + " " + m.valor }), el("span", { texto: m.nome })]);
      }) : [el("span.brt-vazio", { texto: "Nenhum", title: "Sem Dados Marcadores" })]),
      x.diretora && x.pode ? botao("+ marcador", function () { abrirMarcador(ctx, s); }) : null,
      el("p.t-mini", { texto: "Marcadores não rolam e não contam na Pilha (p. 3)." }),
    ]);
  }

  /* ---------- Recursos e Dificuldade ---------- */
  function recursos(ctx, x) {
    var s = x.s;
    var entrada = UI().campo({ rotulo: "Recursos", dica: "Insira aqui um recurso", limite: 80 });
    var usos = UI().campo({ rotulo: "Usos", tipo: "numero", valor: 1, limite: 2 });
    function adicionar() {
      var nome = String(entrada.entrada.value).trim();
      if (!nome) return;
      op(ctx, { tipo: "recurso", nome: nome, usos: U.inteiro(usos.entrada.value, 1) });
    }
    entrada.entrada.addEventListener("keydown", function (ev) { if (ev.key === "Enter") adicionar(); });
    return el("section.brt-cartao.brt-recursos", {}, [
      x.pode ? el("div.brt-recursos__entrada", {}, [entrada, usos, botao("Adicionar", adicionar)]) : el("span.brt-rotulo", { texto: "Recursos" }),
      el("ul.brt-recursos__lista", {}, s.recursos.map(function (r) {
        return el("li", {}, [el("span", { texto: r.nome + " · " + r.usos + " uso" + (r.usos === 1 ? "" : "s") }), x.pode ? botao("×", function () { op(ctx, { tipo: "recurso", acao: "remover", id: r.id }, { silencioso: true }); }, { rotulo: "Remover " + r.nome }) : null]);
      })),
      el("p.t-mini", { texto: "Cada uso reduz a Dificuldade de um teste em 1 (p. 8)." }),
    ]);
  }

  function dificuldade(ctx, x) {
    var s = x.s;
    if (ui.estilo && !K().ESTILOS[ui.estilo]) ui.estilo = "";
    var d = M().dificuldade(s, ui.estilo, []);
    return el("section.brt-cartao.brt-dificuldade", {}, [
      el("span.brt-rotulo", { texto: "Dificuldade" }),
      el("div.brt-dificuldade__valor", {}, [el("span.t-mini", { texto: "Acima de" }), el("strong", { texto: String(d.valor - 1) })]),
      UI().campo({ rotulo: "Estilo", tipo: "selecao", valor: ui.estilo, opcoes: [{ valor: "", rotulo: "Sem Estilo" }].concat(K().ORDEM_ESTILOS.map(function (k) { return { valor: k, rotulo: nomeEstilo(k) + (s.estilos.indexOf(k) >= 0 ? (s.incapacitados.indexOf(k) >= 0 ? " (incapacitado)" : " (seu: −1)") : "") }; })), aoMudar: function (v) { ui.estilo = v; ctx.atualizar(["bloco"]); } }),
      M().forcadoComplexo(s) ? el("p.t-mini.brt-alerta", { texto: "RESTRITA: todos os testes são Complexos." }) : null,
    ]);
  }

  /* ---------- Rolagens ---------- */
  function rolagens(ctx, x) {
    var lista = x.e.rolagens.filter(function (r) { return r.quem === x.s.id || (r.quem === "assassino" && r.rotulo && r.rotulo.indexOf(x.s.nome) >= 0); }).slice(-3).reverse();
    var diretoraDevora = x.modo === "campanha" && x.diretora && M().temAcao(x.e, "devorar");
    return el("section.brt-cartao.brt-rolagens", { "aria-label": "Rolagens", "aria-live": "polite" }, [
      el("h3.brt-titulo-sec", { texto: "Rolagens" }),
      lista.length ? el("div.brt-rolagens__lista", {}, lista.map(function (r) {
        var acoes = diretoraDevora && r.seis && !r.devorada && r.quem !== "assassino" ? [botao("DEVORAR (+1 PH)", function () { op(ctx, { tipo: "devorar", rolagem: r.id }); })] : [];
        return T().rolagem(r, { semNome: true, acoes: acoes });
      })) : el("p.t-mini.brt-rolagens__vazio", { texto: "Nenhuma rolagem ainda." }),
    ]);
  }

  /* ---------- Pilhas ---------- */
  function pilhaComum(ctx, x) {
    var s = x.s;
    return el("section.brt-cartao.brt-pilha-cartao.brt-pilha-cartao--comum", {}, [
      el("h3.brt-titulo-sec", { texto: "Pilha da Intérprete · " + s.pilha + "/6" }),
      T().pilha(s.pilha, { rotulo: "Pilha Comum", vazia: "sem dados" }),
      x.diretora && x.pode ? el("div.brt-mais-menos", {}, [
        botao("−", function () { op(ctx, { tipo: "ajustar", alvo: s.id, campo: "pilha", delta: -1 }); }, { rotulo: "Pilha −1 (ajuste)", motivo: s.pilha ? "" : "Vazia." }),
        botao("+", function () { op(ctx, { tipo: "ajustar", alvo: s.id, campo: "pilha", delta: 1 }); }, { rotulo: "Pilha +1 (ajuste)", motivo: s.pilha >= 6 ? "Nunca passa de 6." : "" }),
      ]) : null,
    ]);
  }
  function pilhaDeFuga(ctx, x) {
    var s = x.s, e = x.e;
    return el("section.brt-cartao.brt-pilha-cartao.brt-pilha-cartao--fuga", {}, [
      el("h3.brt-titulo-sec", { texto: "Pilha de Fuga" + (e.encontro ? " · " + s.fuga + (e.encontro.meta ? "/" + e.encontro.meta : "") : "") }),
      e.encontro ? T().pilha(s.fuga, { rotulo: "Pilha de Fuga", estado: "fuga", vazia: "nenhum passo ainda" }) : el("p.t-mini", { texto: "Só existe durante um Encontro. Completá-la é escapar (p. 22)." }),
    ]);
  }

  /* ---------- PT e os botões grandes ---------- */
  function pontosDeTensao(ctx, x) {
    var s = x.s;
    var podeDar = x.diretora && x.pode;
    var dica = "Pontos de Tensão vêm de Desafios (a Diretora concede) e dos Apegos.";
    return el("section.brt-pt", { "aria-label": "Pontos de Tensão" }, [
      botao("−", function () { op(ctx, { tipo: "darPt", alvo: s.id, valor: -1, motivo: "correção" }); }, { rotulo: "Pontos de Tensão −1", classe: "brt-pt__botao", motivo: !podeDar ? dica : s.pt ? "" : "Sem PT." }),
      el("div.brt-pt__chama", { title: "Pontos de Tensão: " + s.pt + " de 10" }, [el("span.brt-pt__valor", { texto: String(s.pt) })]),
      botao("+", function () { abrirDesafio(ctx, s); }, { rotulo: "Pontos de Tensão +", classe: "brt-pt__botao", motivo: !podeDar ? dica : s.pt >= 10 ? "Máximo de 10 PT." : "" }),
      el("span.brt-pt__rotulo", { texto: "Pontos de Tensão" }),
    ]);
  }

  function grandesBotoes(ctx, x) {
    var s = x.s, e = x.e;
    var motA = M().motivoDaAcao(e, s, "arriscarTudo");
    var motT = M().motivoDoTeste(e, s, null);
    var motD = s.situacao === "morta" ? "Ela está morta." : s.pilha < 1 ? "A Pilha Comum está vazia." : s.teste ? "Confirme o teste que está esperando." : "";
    if (!x.pode) return el("p.t-mini", { texto: "Só leitura." });
    return el("div.brt-grandes", {}, [
      botao("ARRISCAR TUDO", function () { abrirAcao(ctx, "arriscarTudo"); }, { mini: false, classe: "brt-grande brt-grande--arriscar", motivo: motA }),
      motA && e.encontro ? T().motivo(motA) : null,
      botao("DESCARTAR", function () { confirmarDado(ctx, "descartar"); }, { mini: false, classe: "brt-grande", motivo: motD, dica: "Descartar 1 dado da sua Pilha Comum (vai para a Pilha de Descarte)" }),
      botao("SACRIFICAR", function () { confirmarDado(ctx, "sacrificar"); }, { mini: false, classe: "brt-grande", motivo: motD, dica: "Sacrificar 1 dado (vai para a Pilha da Diretora)" }),
      botao("ROLAR", function () { abrirTeste(ctx, {}); }, { mini: false, classe: "brt-grande brt-grande--rolar", motivo: motT }),
      motT ? T().motivo(motT) : null,
    ]);
  }

  /* =================================================================
     JANELAS
     ================================================================= */
  function seletorDeDados(max, valor, aoMudar, fixo) {
    var area = el("div.brt-quantos", { role: "radiogroup", "aria-label": "Quantos dados arriscar" });
    function pintar(v) {
      U.trocar(area, Array.apply(null, { length: Math.max(1, max) }).map(function (_, i) {
        var n = i + 1, sel = n === v;
        return el("button.brt-quantos__opcao" + (sel ? ".brt-quantos__opcao--sel" : ""), { type: "button", role: "radio", "aria-checked": String(sel), disabled: !!fixo || n > max, texto: String(n), onclick: function () { aoMudar(n); pintar(n); } });
      }));
    }
    pintar(valor);
    return area;
  }

  function recursosMarcaveis(s, escolha) {
    if (!s.recursos.length) return null;
    return el("fieldset.brt-recursos-teste", {}, [el("legend", { texto: "Usar Recursos (−1 de Dificuldade cada)" })].concat(s.recursos.map(function (r) {
      return el("label.r-marca", {}, [el("input", { type: "checkbox", checked: escolha.indexOf(r.id) >= 0, onchange: function (ev) { var i = escolha.indexOf(r.id); if (ev.currentTarget.checked && i < 0) escolha.push(r.id); if (!ev.currentTarget.checked && i >= 0) escolha.splice(i, 1); } }), el("span", { texto: r.nome + " (" + r.usos + ")" })]);
    })));
  }

  function abrirTeste(ctx, opcoes) {
    var x = contexto(ctx), s = x.s, e = x.e;
    var p = opcoes.pedido ? M().pedido(e, opcoes.pedido) : null;
    var st = { dados: Math.min(Math.max(1, s.pilha), 2), estilo: ui.estilo || (s.estilos[0] || ""), recursos: [], complexo: false, susto: p ? p.tipo === "susto" : false };
    var prev = el("p.brt-previa", { role: "status" });
    function previa() {
      var d = M().dificuldade(s, st.estilo, st.recursos).valor;
      var comp = p ? p.tipo === "complexo" : st.complexo || M().forcadoComplexo(s);
      var dest = p && p.destino !== "auto" ? p.destino : (st.susto || e.cena === "encontro" ? "descartar" : K().CENAS[e.cena].falhas);
      prev.textContent = "Sucesso em " + d + "+ (acima de " + (d - 1) + ")" + (comp ? " · Complexo: exatamente 2 sucessos" : " · 1 sucesso basta") + " · falhas: " + ({ sacrificar: "SACRIFICADAS (para a Diretora)", descartar: "DESCARTADAS", manter: "ficam com você" })[dest] + ".";
    }
    var conteudo = el("div.pilha", {}, [
      p ? el("p", {}, [el("strong", { texto: p.rotulo }), el("span", { texto: p.tipo === "susto" ? " — 1 dado da Pilha Comum." : "" })]) : el("p.t-mini", { texto: "Cena " + K().CENAS[e.cena].nome + ": " + K().CENAS[e.cena].texto }),
      st.susto ? null : el("div", {}, [el("span.brt-rotulo", { texto: "Dados arriscados (de " + s.pilha + ")" }), seletorDeDados(s.pilha, st.dados, function (n) { st.dados = n; previa(); })]),
      UI().campo({ rotulo: "Estilo", tipo: "selecao", valor: st.estilo, opcoes: [{ valor: "", rotulo: "Sem Estilo" }].concat(K().ORDEM_ESTILOS.map(function (k) { return { valor: k, rotulo: nomeEstilo(k) + (s.estilos.indexOf(k) >= 0 && s.incapacitados.indexOf(k) < 0 ? " (seu: −1)" : "") }; })), aoMudar: function (v) { st.estilo = v; previa(); } }),
      recursosMarcaveis(s, st.recursos),
      !p && !st.susto ? el("label.r-marca", {}, [el("input", { type: "checkbox", disabled: M().forcadoComplexo(s), checked: M().forcadoComplexo(s), onchange: function (ev) { st.complexo = ev.currentTarget.checked; previa(); } }), el("span", { texto: "Teste Complexo (a Diretora disse)" + (M().forcadoComplexo(s) ? " — RESTRITA: sempre" : "") })]) : null,
      !p ? el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) { st.susto = ev.currentTarget.checked; previa(); } }), el("span", { texto: "É um Teste de Susto (1 dado, falha descartada)" })]) : null,
      prev,
    ]);
    previa();
    return UI().modal({
      titulo: p ? "Responder: " + p.rotulo : "Rolar um teste",
      classe: "brt-janela",
      conteudo: [conteudo],
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Rolar", classe: "r-botao--principal", aoClicar: function (f) {
          f();
          op(ctx, { tipo: "teste", dados: st.dados, estilo: st.estilo, recursos: st.recursos, complexo: st.complexo, susto: st.susto, pedido: p ? p.id : "" }).then(function (r) { mostrarRolagem(r); });
        } },
      ],
    });
  }

  function mostrarRolagem(r) {
    if (!r || !r.ok || !global.RAMARolagens) return;
    (r.rolagens || []).forEach(function (rg) {
      global.RAMARolagens.exibir({ expressao: rg.faces.length + "d6", rolagens: rg.faces, total: rg.sucessos === null || rg.sucessos === undefined ? rg.faces[0] : rg.sucessos, parcelas: rg.dificuldade ? [{ rotulo: "Sucesso em", valor: rg.dificuldade }] : [] }, { nome: rg.rotulo + " · " + (rg.superado === null || rg.superado === undefined ? "" : rg.superado ? "superado" : "falhou"), notas: rg.complexo ? ["Complexo: exatamente 2 sucessos."] : [] });
    });
  }

  function abrirAcao(ctx, acao) {
    var x = contexto(ctx), s = x.s, e = x.e;
    if (acao === "recuperarFolego") { op(ctx, { tipo: "acaoEncontro", acao: acao }); return; }
    var d = K().ACOES_ENCONTRO[acao] || { nome: acao === "livrarRestricao" ? "Livrar-se da Restrição" : "Livrar a aliada" };
    var st = { dados: Math.min(Math.max(1, s.pilha), 2), estilo: acao === "livrarRestricao" ? "ligeiro" : (s.estilos[0] || ""), recursos: [], alvo: "", manterUm: false };
    var outras = e.encontro ? M().restantesNoEncontro(e).filter(function (y) { return y.id !== s.id; }) : [];
    if (acao === "livrarAliada") outras = outras.filter(function (y) { return y.segurada; });
    if (outras.length) st.alvo = outras[0].id;
    if (acao === "arriscarTudo") st.alvo = s.id;
    var prev = el("p.brt-previa", { role: "status" });
    function estiloDaAcao() { return { distrair: "desenrolado", partirParaCima: "potente", vazarDali: "ligeiro" }[acao] || st.estilo; }
    function previa() {
      if (acao === "arriscarTudo") { prev.textContent = "Você descarta " + (st.alvo === s.id && st.manterUm ? s.pilha - 1 : s.pilha) + " dado(s); " + (st.alvo === s.id ? "você escapa" : ((e.sobreviventes[st.alvo] || {}).nome || "ela") + " escapa") + " do Encontro."; return; }
      var dd = M().dificuldade(s, estiloDaAcao(), st.recursos).valor;
      prev.textContent = "Sucesso em " + dd + "+" + (acao === "distrair" || acao === "livrarAliada" || M().forcadoComplexo(s) ? " · Complexo: exatamente 2" : "") + (acao === "ajudarAlguem" ? " · os sucessos são doados; as falhas ficam com você" : " · falhas DESCARTADAS") + ".";
    }
    var corpo = [el("p.t-mini", { texto: d.texto || "" })];
    if (acao === "arriscarTudo") {
      var alvos = [s].concat(outras);
      corpo.push(UI().campo({ rotulo: "Quem escapa", tipo: "selecao", valor: st.alvo, opcoes: alvos.map(function (y) { return { valor: y.id, rotulo: y.id === s.id ? "Eu mesma" : y.nome }; }), aoMudar: function (v) { st.alvo = v; previa(); } }));
      if (s.arquetipo === "heroina") corpo.push(el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) { st.manterUm = ev.currentTarget.checked; previa(); } }), el("span", { texto: "Até o Fim: manter um dado (só ao se salvar)" })]));
    } else {
      if (acao === "ajudarAlguem" || acao === "livrarAliada") corpo.push(UI().campo({ rotulo: acao === "ajudarAlguem" ? "Ajudar quem" : "Livrar quem", tipo: "selecao", valor: st.alvo, opcoes: outras.map(function (y) { return { valor: y.id, rotulo: y.nome + " (" + y.pilha + " dados)" }; }), aoMudar: function (v) { st.alvo = v; } }));
      corpo.push(el("div", {}, [el("span.brt-rotulo", { texto: "Dados arriscados (de " + s.pilha + ")" }), seletorDeDados(s.pilha, st.dados, function (n) { st.dados = n; previa(); })]));
      if (acao === "ajudarAlguem" || acao === "livrarAliada") corpo.push(UI().campo({ rotulo: "Estilo apropriado", tipo: "selecao", valor: st.estilo, opcoes: K().ORDEM_ESTILOS.map(function (k) { return { valor: k, rotulo: nomeEstilo(k) + (s.estilos.indexOf(k) >= 0 ? " (seu)" : "") }; }), aoMudar: function (v) { st.estilo = v; previa(); } }));
      if (acao === "livrarRestricao") corpo.push(UI().campo({ rotulo: "Estilo", tipo: "selecao", valor: st.estilo, opcoes: [{ valor: "ligeiro", rotulo: "Ligeiro" }, { valor: "sagaz", rotulo: "Sagaz" }], aoMudar: function (v) { st.estilo = v; previa(); } }));
      corpo.push(recursosMarcaveis(s, st.recursos));
      if (acao === "partirParaCima" && s.pendentes.surpreender) corpo.push(el("p.t-mini", { texto: "Surpreender: um sucesso garantido neste teste." }));
    }
    corpo.push(prev);
    previa();
    return UI().modal({
      titulo: d.nome, classe: "brt-janela", conteudo: [el("div.pilha", {}, corpo)],
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: acao === "arriscarTudo" ? "Arriscar Tudo" : "Rolar", classe: "r-botao--principal", aoClicar: function (f) {
          f();
          op(ctx, { tipo: "acaoEncontro", acao: acao, dados: st.dados, estilo: st.estilo, recursos: st.recursos, alvo: st.alvo, manterUm: st.manterUm }).then(mostrarRolagem);
        } },
      ],
    });
  }

  function usarVantagem(ctx, x, chave) {
    var v = M().definicaoDaVantagem(x.e, chave);
    var outras = M().elenco(x.e).filter(function (y) { return y.id !== x.s.id && y.situacao !== "morta"; });
    if (v.efeito === "transferirPt") {
      var st = { alvo: outras[0] ? outras[0].id : "", valor: 1 };
      return UI().modal({ titulo: v.nome, classe: "brt-janela", conteudo: [el("div.pilha", {}, [
        el("p.t-mini", { texto: v.texto }),
        UI().campo({ rotulo: "Para quem", tipo: "selecao", valor: st.alvo, opcoes: outras.map(function (y) { return { valor: y.id, rotulo: y.nome + " (" + y.pt + " PT)" }; }), aoMudar: function (val) { st.alvo = val; } }),
        UI().campo({ rotulo: "Quantos PT (você tem " + x.s.pt + ")", tipo: "numero", valor: 1, aoMudar: function (val) { st.valor = U.inteiro(val, 1); } }),
      ])], botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Transferir", classe: "r-botao--principal", aoClicar: function (f) { f(); op(ctx, { tipo: "vantagem", chave: chave, alvo: st.alvo, valor: st.valor }); } }] });
    }
    if (v.efeito === "recuperarEstilo") {
      var alvos = [x.s].concat(outras).filter(function (y) { return y.incapacitados.length; });
      if (!alvos.length) { UI().avisoAtencao("Ninguém tem um Estilo incapacitado."); return; }
      var st2 = { alvo: alvos[0].id, estilo: alvos[0].incapacitados[0] };
      return UI().modal({ titulo: v.nome, classe: "brt-janela", conteudo: [el("div.pilha", {}, [
        UI().campo({ rotulo: "Recuperar o Estilo de", tipo: "selecao", valor: st2.alvo + "|" + st2.estilo, opcoes: alvos.reduce(function (l, y) { return l.concat(y.incapacitados.map(function (k) { return { valor: y.id + "|" + k, rotulo: (y.id === x.s.id ? "Eu" : y.nome) + ": " + nomeEstilo(k) }; })); }, []), aoMudar: function (val) { var p = val.split("|"); st2.alvo = p[0]; st2.estilo = p[1]; } }),
      ])], botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Usar (" + v.custo + " PT)", classe: "r-botao--principal", aoClicar: function (f) { f(); op(ctx, { tipo: "vantagem", chave: chave, alvo: st2.alvo, estilo: st2.estilo }); } }] });
    }
    if (v.efeito === "recurso") {
      var nome = UI().campo({ rotulo: "Que Recurso ela encontrou?", limite: 80, dica: "faz sentido na narrativa" });
      return UI().modal({ titulo: v.nome, classe: "brt-janela", conteudo: [el("div.pilha", {}, [el("p.t-mini", { texto: v.texto }), nome])], botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Usar (" + v.custo + " PT)", classe: "r-botao--principal", aoClicar: function (f) { f(); op(ctx, { tipo: "vantagem", chave: chave, nome: nome.entrada.value }); } }] });
    }
    UI().confirmar({ titulo: v.nome, texto: v.texto + (v.custo ? " Custa " + v.custo + " PT." : ""), rotuloConfirmar: "Usar" }).then(function (sim) { if (sim) op(ctx, { tipo: "vantagem", chave: chave }); });
  }

  function usarApego(ctx, k) {
    var ap = K().APEGOS[k];
    var desc = UI().campo({ rotulo: k === "item" ? "Como ela usa o Item Icônico" : k === "relacao" ? "O momento com a Relação Afetiva" : "O que ela revela", limite: 120 });
    UI().modal({ titulo: ap.nome, classe: "brt-janela", conteudo: [el("div.pilha", {}, [el("p.t-mini", { texto: ap.texto }), desc, k === "desejo" ? el("p.brt-alerta", { texto: "Revelado, o Desejo Obscuro não pode ser usado de novo — em nenhum Thriller." }) : null])],
      botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Confirmar (+" + ap.pt + " PT)", classe: "r-botao--principal", aoClicar: function (f) { f(); op(ctx, { tipo: "apego", apego: k, descricao: desc.entrada.value }); } }] });
  }

  function confirmarDado(ctx, acao) {
    UI().confirmar({ titulo: acao === "sacrificar" ? "Sacrificar 1 dado" : "Descartar 1 dado", texto: acao === "sacrificar" ? "O dado sai da sua Pilha Comum e vai para a Pilha da Diretora." : "O dado sai da sua Pilha Comum e vai para a Pilha de Descarte.", rotuloConfirmar: acao === "sacrificar" ? "Sacrificar" : "Descartar" })
      .then(function (sim) { if (sim) op(ctx, { tipo: "dadoManual", acao: acao }); });
  }

  function abrirDesafio(ctx, s) {
    var st = { valor: 1, motivo: "Desafio" };
    UI().modal({ titulo: "Pontos de Tensão para " + s.nome, classe: "brt-janela", conteudo: [el("div.pilha", {}, [
      el("p.t-mini", { texto: "Desafios: um shot, uma ação clichê arriscada… (p. 5). Máximo de 10 PT." }),
      UI().campo({ rotulo: "Quantos PT", tipo: "numero", valor: 1, aoMudar: function (v) { st.valor = U.inteiro(v, 1); } }),
      UI().campo({ rotulo: "Motivo", valor: "Desafio", limite: 80, aoMudar: function (v) { st.motivo = v; } }),
    ])], botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Dar PT", classe: "r-botao--principal", aoClicar: function (f) { f(); op(ctx, { tipo: "darPt", alvo: s.id, valor: st.valor, motivo: st.motivo }); } }] });
  }

  function abrirMarcador(ctx, s) {
    var st = { nome: "", valor: 1 };
    UI().modal({ titulo: "Dado Marcador para " + s.nome, classe: "brt-janela", conteudo: [el("div.pilha", {}, [
      el("p.t-mini", { texto: "Uma condição (infecção, possessão…): quanto maior, mais grave. Um marcador para a mesma condição substitui o antigo (p. 3). Ferida é à parte." }),
      UI().campo({ rotulo: "Condição", limite: 60, aoMudar: function (v) { st.nome = v; } }),
      UI().campo({ rotulo: "Valor (1 a 6)", tipo: "numero", valor: 1, aoMudar: function (v) { st.valor = U.inteiro(v, 1); } }),
    ])], botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Dar o marcador", classe: "r-botao--principal", aoClicar: function (f) { f(); op(ctx, { tipo: "marcador", alvo: s.id, nome: st.nome, valor: st.valor }); } }] });
  }

  /* =================================================================
     ABA "SOBREVIVENTE"
     ================================================================= */
  function abaSobrevivente(ctx) {
    var b = ctx.ficha.brutal;
    var edita = ctx.podeEditar();
    function texto(rotulo, alvo, chave, limite, area) {
      return UI().campo({ rotulo: rotulo, tipo: area ? "area" : undefined, linhas: area ? 3 : undefined, valor: alvo[chave], limite: limite, desabilitado: !edita, aoMudar: function (v) { alvo[chave] = String(v).slice(0, limite); ctx.alterou(); } });
    }
    var revelado = b.apegos.desejo.revelado;
    return el("div.pilha.brt-sobrevivente", {}, [
      UI().painel("Arquétipo", el("div.pilha", {}, [
        el("p.t-mini", { texto: "O Arquétipo dá os Estilos, a Habilidade e a Iniciativa (p. 6). Trocar não mexe no Thriller (as pilhas continuam), só no que o Arquétipo dá." }),
        global.RAMABrutalCriar ? global.RAMABrutalCriar.cartas(b.arquetipo, function (k) {
          if (!edita || k === b.arquetipo) return;
          UI().confirmar({ titulo: "Trocar o Arquétipo", texto: "Passar para " + K().ARQUETIPOS[k].nome + "? Estilos, Habilidade, Vantagens de Estilo e Iniciativa mudam junto.", rotuloConfirmar: "Trocar" }).then(function (sim) {
            if (!sim) return;
            b.arquetipo = k; ctx.alterou(); ctx.redesenhar();
          });
        }) : null,
        global.RAMABrutalCriar ? global.RAMABrutalCriar.detalhe(b.arquetipo) : null,
      ])),
      UI().painel("Apegos", el("div.pilha", {}, [
        el("p.t-mini", { texto: "Usá-los rende Pontos de Tensão (p. 7). O uso é no tabuleiro (Detalhes) ou aqui no Thriller; aqui você escreve quem eles são." }),
        texto("Item Icônico", b.apegos.item, "nome", 80), texto("Sobre o Item", b.apegos.item, "texto", 600, true),
        texto("Relação Afetiva", b.apegos.relacao, "nome", 80), texto("Sobre a Relação", b.apegos.relacao, "texto", 600, true),
        texto("Desejo Obscuro", b.apegos.desejo, "texto", 600, true),
        el("p.t-mini", { texto: revelado ? "Revelado em " + (b.apegos.desejo.reveladoEm || "").slice(0, 10) + ": não rende mais PT." : "Ainda em segredo." }),
      ])),
      UI().painel("Detalhes", el("div.pilha", {}, [
        texto("Aparência", b.detalhes, "aparencia", 1200, true),
        texto("História", b.detalhes, "historia", 4000, true),
      ])),
    ]);
  }

  /* =================================================================
     ABA "THRILLER"
     ================================================================= */
  function abaThriller(ctx) {
    var x = contexto(ctx);
    if (x.modo === "carregando") return UI().carregando("Abrindo o Thriller");
    if (!x.s) return el("p", { texto: "Esta Sobrevivente não está no Thriller." });
    var e = x.e, s = x.s;
    var treino = x.modo !== "campanha";
    var partes = [];
    if (treino) {
      partes.push(UI().painel("Treino (sem campanha)", el("div.pilha", {}, [
        el("p.t-mini", { texto: x.modo === "outra" ? "A campanha desta ficha não abriu o Thriller (" + (TH().erro() || "?") + "). Enquanto isso, o treino fica na ficha." : "Sem campanha, a ficha guarda um Thriller de treino: testes, Sustos, Vantagens e Apegos funcionam; você faz o papel da mesa. Encontros e o Assassino são da Mesa da Diretora, numa campanha de BRUTAL." }),
        el("div.faixa", {}, [
          UI().campo({ rotulo: "Cena", tipo: "selecao", valor: e.cena === "encontro" ? "livre" : e.cena, opcoes: [{ valor: "livre", rotulo: "Livre" }, { valor: "suspense", rotulo: "Suspense" }], aoMudar: function (v) { op(ctx, { tipo: "mudarCena", cena: v }); } }),
          botao("Nova sessão", function () { op(ctx, { tipo: "novaSessao" }); }),
          botao("Dar PT (Desafio)", function () { abrirDesafio(ctx, s); }, { motivo: s.pt >= 10 ? "Máximo de 10 PT." : "" }),
          botao("Recomeçar o treino", function () { UI().confirmar({ titulo: "Recomeçar o treino", texto: "Volta a 6 dados, 0 PT, sem Feridas nem registro.", rotuloConfirmar: "Recomeçar" }).then(function (sim) { if (sim) TH().zerarTreino(ctx); }); }, { classe: "r-botao--fantasma" }),
        ]),
        el("p.t-mini", { texto: "Pilha da \"Diretora\" no treino: " + e.diretora.pilha + " (recebe os dados sacrificados) · Descarte: " + e.descarte + "." }),
      ])));
    } else {
      partes.push(UI().painel("O Thriller da campanha", el("div.pilha", {}, [
        el("p.t-mini", { texto: "Pilhas, PT, Feridas e efeitos desta Sobrevivente são do Thriller desta campanha (Mesa da Diretora): a mesma ficha em outra campanha começa outro." }),
        el("dl.r-dados", {}, [
          el("dt", { texto: "Cena" }), el("dd", { texto: K().CENAS[e.cena].nome }),
          el("dt", { texto: "Sessão" }), el("dd", { texto: String(e.sessao) }),
          el("dt", { texto: "Pilha da Diretora" }), el("dd", { texto: String(e.diretora.pilha) }),
          el("dt", { texto: "Descarte" }), el("dd", { texto: String(e.descarte) }),
          e.assassino.nome ? el("dt", { texto: "Assassino" }) : null, e.assassino.nome ? el("dd", { texto: e.assassino.nome }) : null,
        ]),
        botao("Atualizar", function () { TH().carregar(ctx, true); }),
      ])));
    }
    partes.push(UI().painel("Rolagens do Thriller", e.rolagens.length ? el("div.brt-rolagens__lista", {}, e.rolagens.slice(-12).reverse().map(function (r) { return T().rolagem(r); })) : el("p.t-mini", { texto: "Nenhuma rolagem." })));
    partes.push(UI().painel("Registro", el("ol.brt-registro", {}, e.registro.slice(-60).reverse().map(function (r) { return el("li", { texto: r.texto }); }))));
    return el("div.pilha.brt-thriller", {}, partes);
  }

  global.RAMASecaoBrutal = { blocoSuperior: blocoSuperior, aba: abaSobrevivente };
  global.RAMASecaoBrutalThriller = { aba: abaThriller };
  global.RAMABrutalFicha = { abrirTeste: abrirTeste, abrirAcao: abrirAcao, ui: ui };
})(window);
