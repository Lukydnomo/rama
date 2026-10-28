/* =====================================================================
   R.A.M.A. — Oblívio · a ficha da Persona (v3.0)
   ---------------------------------------------------------------------
   As seções da ficha de Oblívio. A tela não tem regra própria: toda
   conta, validação e efeito vem do motor (js/oblivio/*). Cada ação da
   pessoa vira UMA operação com id (R.aplicarOperacao): um clique
   repetido, a resposta perdida ou a volta à página não aplicam duas
   vezes.

   Seções:
     RAMASecaoOblivio           blocoSuperior + aba "Persona"
     RAMASecaoOblivioHabilidades
     RAMASecaoOblivioEstado     mazelas, Fora de Ação, Fardos, Missão,
                                o tempo de jogo da ficha avulsa
   Testes, ataque e inventário: js/oblivio/telas/ficha-oblivio-jogo.js.

   FICHA AVULSA X CAMPANHA
     Fora de campanha, o tempo (turno, rodada, cena, Descanso) anda pelos
     botões da aba Estado, no contexto da própria ficha. Numa campanha
     com mesa de Oblívio, quem anda o tempo é a Testemunha (página da
     campanha) — aqui a ficha só mostra o contexto da mesa. Nada que
     dependa de outras fichas é simulado avulso.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el;
  function C() { return global.RAMAOblivioCatalogo; }
  function R() { return global.RAMAOblivio; }
  function H() { return global.RAMAOblivioHabilidades; }
  function UI() { return global.RAMAUI; }

  /* ---------------------------------------------------------------
     OPERAR — o único caminho de uma ação até a ficha
     --------------------------------------------------------------- */

  var NOMES_EVENTO = {
    estresse: function (e) { return "+" + e.valor + " de Estresse (" + C().regiao[e.regiao].nome + (e.transbordo ? ", transbordou" : "") + ")"; },
    recuperacao: function (e) { return e.regiao ? "−" + e.valor + " de Estresse (" + C().regiao[e.regiao].nome + ")" + (e.temporaria ? " temporário" : "") : ""; },
    coragem: function (e) { return (e.valor > 0 ? "+" : "") + e.valor + " de Coragem" + (e.motivo ? " (" + e.motivo + ")" : ""); },
    mazela: function (e) { return "Mazela: " + C().mazela[e.chave].nome; },
    mazelaRemovida: function (e) { return C().mazela[e.chave].nome + " terminou"; },
    imunidade: function (e) { return "Imune a " + C().mazela[e.mazela].nome; },
    foraDeAcao: function (e) { return "Fora de Ação (" + e.vez + "ª vez na Missão)"; },
    fardo: function (e) { return "Fardo: " + C().fardo[e.chave].nome + " (1D6 = " + e.d6 + ")"; },
    morte: function (e) { return "A Persona morreu: " + e.causa; },
    retorno: function () { return "A Persona voltou a si"; },
    itemDestruido: function (e) { return e.nome + " foi destruído"; },
    itemDerrubado: function (e) { return e.nome + " foi derrubado" + (e.motivo ? " (" + e.motivo + ")" : ""); },
    excesso: function (e) { return e.valor + " de Estresse além do limite do Torso"; },
    atingiuLimite: function () { return "Atingiu o limite de Estresse"; },
    regiaoPerdida: function (e) { return C().regiao[e.regiao].nome + " perdida"; },
    habilidadesAEscolher: function (e) { return "Escolha " + e.quantas + " habilidade(s)"; },
    limiteMudou: function () { return "O limite de Estresse mudou: redistribua"; },
  };

  function narrar(eventos) {
    var frases = (eventos || []).map(function (e) { var f = NOMES_EVENTO[e.tipo]; return f ? f(e) : ""; }).filter(Boolean);
    if (frases.length) UI().aviso(frases.slice(0, 4).join(" · ") + (frases.length > 4 ? " …" : ""), { tipo: eventos.some(function (e) { return e.tipo === "morte" || e.tipo === "foraDeAcao"; }) ? "atencao" : "info" });
    return frases;
  }

  /* Contexto de jogo: o da mesa (campanha) ou o da ficha avulsa. */
  function contextoDeJogo(ctx) {
    var o = ctx.ficha.oblivio;
    var mesa = global.RAMAOblivioMesaDaFicha && global.RAMAOblivioMesaDaFicha.contexto(ctx);
    if (mesa) return mesa;
    return { cena: o.contexto.cena, rodada: o.contexto.rodada, tipoDeCena: o.contexto.tipoDeCena, partida: o.contexto.partida || "avulsa", missao: o.missao.id, avulsa: true };
  }

  /* fn(o) → { ok, motivo?, eventos } ; aplicada uma vez por id. */
  function operar(ctx, fn, opcoes) {
    var op = opcoes || {};
    if (!ctx.podeEditar()) { UI().avisoAtencao("Esta ficha está em modo de leitura."); return { ok: false }; }
    var o = ctx.ficha.oblivio;
    var id = op.opId || (global.RAMAApi ? global.RAMAApi.novaOperacao() : "op-" + U.uuid());
    var r = R().aplicarOperacao(o, id, fn);
    if (r.ok === false) { if (r.motivo) UI().avisoAtencao(r.motivo); return r; }
    if (!op.silencioso) narrar(r.eventos);
    tratarLimite(ctx, r.eventos || []);
    ctx.alterou();
    ctx.atualizar(op.regioes || ["bloco", "conteudo"]);
    return r;
  }

  /* Atingiu o limite: primeiro as intervenções (Animar os Ânimos é de
     outra Persona — numa campanha, a mesa oferece; avulsa, a pessoa
     informa), depois Fora de Ação com o Fardo. */
  function tratarLimite(ctx, eventos) {
    if (!eventos.some(function (e) { return e.tipo === "atingiuLimite"; })) return;
    var o = ctx.ficha.oblivio;
    if (!R().deveFicarForaDeAcao(o) && !eventos.some(function (e) { return e.motivo === "semFolego"; })) return;
    UI().confirmar({
      titulo: "Limite de Estresse atingido",
      texto: "Alguém intervém antes (Animar os Ânimos, de uma Persona adjacente de Quem Resolve)? Sem intervenção, a Persona fica Fora de Ação e rola na Tabela de Fardos.",
      rotuloCancelar: "Houve intervenção",
      rotuloConfirmar: "Fica Fora de Ação",
    }).then(function (sim) {
      if (!sim) return;
      var cx = contextoDeJogo(ctx);
      var vezes = cx.buracoMortal ? 2 : 1;
      operar(ctx, function (b) { return R().entrarForaDeAcao(b, { cena: cx.cena, rodada: cx.rodada, vezes: vezes }, rolador); });
    });
  }

  function rolador(faces) { return global.RAMADados.rolar("1d" + faces).rolagens[0]; }

  /* Uma rolagem para o funil de sempre (cartão + histórico da campanha). */
  function mostrarRolagem(nome, faces, total, partes, critico) {
    if (!global.RAMARolagens) return;
    global.RAMARolagens.mostrar({
      tipo: "oblivio", nome: nome, expressao: faces.length + "d20", rolagens: faces, natural: faces[0],
      total: total, parcelas: (partes || []).map(function (p) { return { rotulo: p.fonte, valor: p.valor }; }),
    }, { nome: nome, critico: !!critico });
  }

  /* ---------------------------------------------------------------
     BLOCO SUPERIOR
     --------------------------------------------------------------- */

  /* "(Força + Carne) / 2 = 3"; com mais parcelas, cada uma com sinal. */
  function composicao(partes) {
    if (partes.length === 1) return partes[0].fonte + " = " + partes[0].valor;
    return partes.map(function (p) { return p.fonte + " " + (p.valor >= 0 ? "+" : "") + p.valor; }).join(" · ");
  }

  function blocoSuperior(ctx) {
    var o = ctx.ficha.oblivio;
    if (!o || !R()) return el("p", { texto: "O motor de Oblívio não está carregado nesta página." });
    var c = R().calcular(o, { bonusDeGrupo: global.RAMAOblivioMesaDaFicha ? global.RAMAOblivioMesaDaFicha.bonusDeGrupo(ctx) : [] });
    var papel = C().papel[o.papel];
    var estado = c.estado === "morta" ? "Morta" : c.estado === "foraDeAcao" ? "Fora de Ação" : "Ativa";
    var geral = global.RAMASecaoGeral;
    var mut = ["dano", "folego", "protecao", "velocidade"].map(function (k) {
      var x = c.mutaveis[k];
      return el("div.oblivio-mut", { title: composicao(x.partes) }, [
        el("span.oblivio-mut__nome", { texto: C().mutavel[k].nome }),
        el("span.oblivio-mut__valor", { texto: String(x.total) }),
        el("span.so-leitor", { texto: "Composição: " + composicao(x.partes) }),
      ]);
    });
    var coragem = el("div.oblivio-mut.oblivio-mut--coragem", { title: "Saldo de Coragem: gastar e ganhar não se desfaz com recálculo." }, [
      el("span.oblivio-mut__nome", { texto: "Coragem" }),
      el("span.oblivio-mut__valor", { texto: String(o.coragem) }),
    ]);
    return el("div.oblivio-bloco", { dataset: { estado: c.estado } }, [
      el("div.oblivio-bloco__identidade", {}, [
        global.RAMACapaSistema ? global.RAMACapaSistema.elemento("oblivio", { tamanho: "p" }) : null,
        geral && geral.foto ? geral.foto(ctx) : null,
        el("div.oblivio-bloco__textos", {}, [
          geral && geral.campoNome ? geral.campoNome(ctx) : el("h1.t-titulo", { texto: ctx.ficha.nome }),
          el("p.oblivio-bloco__papel", { texto: "Oblívio · " + (papel ? papel.nome : "sem Papel") + (o.motivacao.chave ? " · " + C().motivacao[o.motivacao.chave].nome + (o.motivacao.abandonada ? " (abandonada)" : "") : "") }),
          el("p.oblivio-bloco__estado", { role: "status" }, [
            el("span.r-etiqueta" + (c.estado === "ativa" ? "" : ".r-etiqueta--aviso"), { texto: estado }),
            el("span", { texto: " Estresse " + c.estresseTotal + "/" + c.limite.total + " · Fora de Ação na Missão: " + c.foraDeAcaoNaMissao + "/3" }),
            o.mazelas.length ? el("span", { texto: " · " + o.mazelas.map(function (m) { return C().mazela[m.chave].nome; }).join(", ") }) : null,
          ]),
        ]),
      ]),
      el("div.oblivio-bloco__atributos", { "aria-label": "Atributos Fixos" }, C().ATRIBUTOS.map(function (a) {
        var v = c.atributos[a.chave];
        return el("div.oblivio-fixo", { title: a.nome + (v !== o.atributos[a.chave] ? " (efetivo; ficha: " + o.atributos[a.chave] + ")" : "") }, [el("span.oblivio-fixo__sigla", { texto: a.sigla }), el("span.oblivio-fixo__valor", { texto: String(v) })]);
      })),
      el("div.oblivio-bloco__mutaveis", { "aria-label": "Atributos Mutáveis" }, [coragem].concat(mut)),
      c.pendencias.length ? el("ul.oblivio-pendencias", { role: "status", "aria-label": "Pendências" }, c.pendencias.map(function (p) { return el("li", { texto: p.texto }); })) : null,
      global.RAMAOblivioMesaDaFicha ? global.RAMAOblivioMesaDaFicha.painel(ctx) : null,
    ]);
  }

  /* ---------------------------------------------------------------
     ABA PERSONA — atributos, corpo, especializações, motivação
     --------------------------------------------------------------- */

  function abaPersona(ctx) {
    var o = ctx.ficha.oblivio;
    var c = R().calcular(o);
    var edicao = ctx.emEdicao();
    var corpo = global.RAMAOblivioCorpo.diagrama(o, {});
    var redistribuir = c.distribuicao.falta !== 0 || edicao ? painelDistribuicao(ctx) : null;
    var mutaveis = el("dl.oblivio-composicao", {}, ["coragem", "dano", "folego", "protecao", "velocidade"].reduce(function (l, k) {
      var x = c.mutaveis[k];
      return l.concat([el("dt", { texto: C().mutavel[k].nome + " " + (k === "coragem" ? o.coragem + " (saldo; valor inicial " + x.base + ")" : x.total) }),
        el("dd", { texto: composicao(x.partes) + " — p. " + C().mutavel[k].pag })]);
    }, []));
    var esc = el("ul.oblivio-lista", {}, o.especializacoes.map(function (s) {
      return el("li", { texto: C().conhecimento[s.conhecimento].nome + " (+" + o.ajustes.bonusEspecializacao + ") — " + ({ papel: "do Papel", mente: "por Mente", habilidade: "Saber é Poder", mesa: "da mesa" }[s.origem] || s.origem) });
    }));
    var escolhas = edicao ? el("div.editar-grade", {}, [
      UI().campo({ rotulo: "Dano soma Força com", tipo: "selecao", valor: o.escolhas.dano, opcoes: [{ valor: "carne", rotulo: "Carne" }, { valor: "fuga", rotulo: "Fuga" }],
        aoMudar: function (v) { operar(ctx, function (b) { b.escolhas.dano = v; return { ok: true, eventos: [] }; }); } }),
      UI().campo({ rotulo: "Inventário soma 5 com", tipo: "selecao", valor: o.escolhas.inventario, opcoes: [{ valor: "carne", rotulo: "Carne" }, { valor: "forca", rotulo: "Força" }],
        aoMudar: function (v) { operar(ctx, function (b) { b.escolhas.inventario = v; return { ok: true, eventos: [] }; }); } }),
      UI().campo({ rotulo: "Proteção Elevada/Maximizada usa", tipo: "selecao", valor: o.escolhas.protecaoContra, opcoes: [{ valor: "carne", rotulo: "Carne" }, { valor: "fuga", rotulo: "Fuga" }],
        aoMudar: function (v) { operar(ctx, function (b) { b.escolhas.protecaoContra = v; return { ok: true, eventos: [] }; }); } }),
    ]) : null;
    var motivacao = el("div.oblivio-motivacao", {}, [
      el("p", { texto: o.motivacao.chave ? C().motivacao[o.motivacao.chave].nome + ": " + C().motivacao[o.motivacao.chave].resumo : "Sem Motivação escolhida." }),
      o.motivacao.texto ? el("p.t-mini", { texto: o.motivacao.texto }) : null,
      o.motivacao.abandonada ? el("p.t-mini", { texto: "Abandonada em Seguir em Frente." }) : null,
    ]);
    return el("div.oblivio-aba.pilha", {}, [
      UI().painel("Corpo e Estresse", [corpo, el("p.t-mini", { texto: "Estresse sobe a partir de zero (p. 41). Região esgotada não pode ser arriscada; o Torso esgotado deixa Fora de Ação." }), redistribuir, painelMenosRegioes(ctx)]),
      UI().painel("Atributos Mutáveis", [mutaveis, escolhas]),
      UI().painel("Conhecimentos Especializados", [esc]),
      UI().painel("Motivação", [motivacao]),
      /* A campanha: no modo Edição, o mesmo seletor da ficha universal —
         é ele que põe a Persona na mesa da Testemunha. */
      UI().painel("Campanha", [edicao && global.RAMASecaoGeral && global.RAMASecaoGeral.campoCampanha
        ? global.RAMASecaoGeral.campoCampanha(ctx)
        : el("p", { texto: (ctx.nomeDaCampanha() || "Sem campanha (ficha avulsa)") + (edicao ? "" : " — troque no modo Edição.") })]),
    ]);
  }

  function painelDistribuicao(ctx) {
    var o = ctx.ficha.oblivio;
    var mapa = {};
    R().regioesPresentes(o).forEach(function (r) { mapa[r.chave] = r.limite; });
    var d = R().distribuicao(o);
    var status = el("p.oblivio-criar__contador", { role: "status", texto: "" });
    function conferir() {
      var soma = Object.keys(mapa).reduce(function (s, k) { return s + mapa[k]; }, 0);
      var falta = d.limite - soma;
      status.textContent = falta ? (falta > 0 ? "Faltam " + falta + "." : "Sobram " + (-falta) + ".") : "Bate com o limite (" + d.limite + ").";
      status.className = "oblivio-criar__contador" + (falta ? " oblivio-criar__contador--falta" : "");
    }
    var linhas = R().regioesPresentes(o).map(function (r) {
      return el("div.oblivio-criar__regiao", {}, [
        el("span.oblivio-criar__reg-nome", { texto: C().regiao[r.chave].nome + (r.estresse > 0 ? " (" + r.estresse + " de Estresse fica)" : "") }),
        UI().passo({ valor: r.limite, minimo: 1, maximo: r.estado === "protese" ? 5 : 99, rotulo: "Limite de " + C().regiao[r.chave].nome, aoMudar: function (v) { mapa[r.chave] = v; conferir(); } }),
      ]);
    });
    conferir();
    return el("div.oblivio-distribuir", {}, [
      el("h4.t-rotulo", { texto: d.falta ? "Redistribuir o limite (" + (d.falta > 0 ? "+" : "") + d.falta + ")" : "Distribuição do limite" }),
      el("p.t-mini", { texto: "O Estresse acumulado nunca é apagado: se o novo limite de uma região for menor, ela fica esgotada com ele." }),
      el("div.oblivio-criar__regioes", {}, linhas), status,
      el("button.r-botao.r-botao--mini", { type: "button", texto: "Aplicar distribuição", onclick: function () {
        operar(ctx, function (b) { var r = R().definirLimites(b, mapa); return r.ok ? r : { ok: false, motivo: r.erros.join(" ") }; });
      } }),
    ]);
  }

  function painelMenosRegioes(ctx) {
    var o = ctx.ficha.oblivio;
    var faltam = o.corpo.regioes.filter(function (r) { return r.estado !== "organica"; }).length;
    if (!faltam && !o.escolhasPendentes.some(function (p) { return p.tipo === "menosRegioes"; })) return null;
    var atual = o.escolhas.menosRegioes;
    return el("div.oblivio-menos", {}, [
      el("h4.t-rotulo", { texto: "Jogando com menos regiões (p. 42)" }),
      el("p.t-mini", { texto: atual ? C().MENOS_REGIOES[atual].nome + ": " + C().MENOS_REGIOES[atual].resumo : "Escolha como a Persona segue com menos regiões." }),
      ctx.podeEditar() ? UI().campo({ rotulo: "Opção", tipo: "selecao", valor: atual,
        opcoes: [{ valor: "", rotulo: "Escolha…" }, { valor: "proteses", rotulo: "Usar Próteses" }, { valor: "aprimorar", rotulo: "Aprimorar o Corpo" }, { valor: "irAlem", rotulo: "Ir Além (Sobrecarga)" }],
        aoMudar: function (v) { operar(ctx, function (b) {
          b.escolhas.menosRegioes = v;
          var antes = b.limiteAjustes.filter(function (x) { return x.origem === "aprimorar"; }).length;
          R().sincronizarAprimorar(b);
          var ganho = b.limiteAjustes.filter(function (x) { return x.origem === "aprimorar"; }).length - antes;
          var ev = [];
          if (ganho > 0) ev = R().ganharCoragem(b, ganho, "Aprimorar o Corpo").eventos;
          b.escolhasPendentes = b.escolhasPendentes.filter(function (p) { return p.tipo !== "menosRegioes"; });
          return { ok: true, eventos: ev };
        }); } }) : null,
    ]);
  }

  /* ---------------------------------------------------------------
     ABA HABILIDADES
     --------------------------------------------------------------- */

  function abaHabilidades(ctx) {
    var o = ctx.ficha.oblivio;
    var cx = contextoDeJogo(ctx);
    var possuidas = o.habilidades.map(function (h) {
      var cat = C().habilidade[h.chave];
      var param = h.chave === "caoVelho" ? " — " + C().mazela[h.param.mazela].nome : h.chave === "saberEPoder" ? " — " + C().conhecimento[h.param.conhecimento].nome : "";
      var pode = R().podeUsar(o, h.chave, cx);
      var ativa = H().temAtivacao(h.chave);
      return el("li.oblivio-hab", { dataset: { tipo: cat.tipo } }, [
        el("div.oblivio-hab__topo", {}, [
          el("span.oblivio-hab__nome", { texto: cat.nome + param }),
          el("span.r-etiqueta", { texto: { passiva: "Efeito Passivo", regular: "Ação Regular", extra: "Ação Extra", completa: "Ação Completa", "regular+movimento": "Ação Regular + Movimento" }[cat.acao] }),
          el("span.t-mini", { texto: { principal: "Principal", unica: "Única", geral: "Geral" }[cat.tipo] + " · p. " + cat.pag }),
        ]),
        el("p.oblivio-hab__resumo", { texto: cat.resumo }),
        ativa ? el("div.faixa", {}, [
          el("button.r-botao.r-botao--mini", { type: "button", texto: "Usar", disabled: !pode.ok || !ctx.podeEditar(), title: pode.ok ? "" : pode.motivo,
            onclick: function () { global.RAMAOblivioJogo.usarHabilidade(ctx, h.chave); } }),
          !pode.ok ? el("span.t-mini", { texto: pode.motivo }) : null,
        ]) : el("p.t-mini", { texto: "Automática: o motor aplica quando a condição acontece." }),
      ]);
    });
    if (R().temHabilidade(o, "sobrecarga")) possuidas.push(el("li.oblivio-hab", {}, [el("span.oblivio-hab__nome", { texto: "Sobrecarga (Ir Além)" }), el("p.oblivio-hab__resumo", { texto: C().SOBRECARGA.resumo })]));
    o.efeitos.filter(function (e) { return e.tipo === "copia"; }).forEach(function (e) {
      possuidas.push(el("li.oblivio-hab.oblivio-hab--copia", {}, [el("span.oblivio-hab__nome", { texto: C().habilidade[e.habilidade].nome + " (Cópia Barata, até o fim da cena)" })]));
    });
    var pend = o.escolhasPendentes.filter(function (p) { return p.tipo === "habilidades"; })[0];
    return el("div.oblivio-aba.pilha", {}, [
      pend ? UI().painel("Escolher habilidades (" + pend.quantas + ")", [el("p.t-mini", { texto: "A Missão foi concluída: " + pend.quantas + " Habilidade(s) Única(s) do Papel ou Geral(is)." }), escolherHabilidade(ctx, "progressao")]) : null,
      UI().painel("Habilidades", [el("ul.oblivio-habs", {}, possuidas)]),
      ctx.podeEditar() ? UI().painel("Habilidade concedida pela Testemunha", [el("p.t-mini", { texto: "Habilidades além da Principal dependem da Testemunha (p. 25 e 65)." }), escolherHabilidade(ctx, "mesa")]) : null,
    ]);
  }

  function escolherHabilidade(ctx, origem) {
    var o = ctx.ficha.oblivio;
    var opcoes = C().HABILIDADES.filter(function (h) {
      if (h.tipo === "principal") return false;
      if (h.papel && h.papel !== o.papel && origem === "progressao") return false;
      return h.repetivel || !R().temHabilidade(o, h.chave);
    });
    var sel = UI().campo({ rotulo: "Habilidade", tipo: "selecao", opcoes: [{ valor: "", rotulo: "Escolha…" }].concat(opcoes.map(function (h) { return { valor: h.chave, rotulo: h.nome + (h.papel ? " (" + C().papel[h.papel].nome + ")" : " (Geral)") }; })) });
    var extra = el("div.oblivio-hab-param");
    var param = {};
    sel.entrada.addEventListener("change", function () {
      param = {};
      var k = sel.entrada.value;
      if (k === "caoVelho") U.trocar(extra, [UI().campo({ rotulo: "Mazela", tipo: "selecao", opcoes: [{ valor: "", rotulo: "Escolha…" }].concat(C().MAZELAS.map(function (m) { return { valor: m.chave, rotulo: m.nome }; })), aoMudar: function (v) { param.mazela = v; } })]);
      else if (k === "saberEPoder") U.trocar(extra, [UI().campo({ rotulo: "Conhecimento", tipo: "selecao", opcoes: [{ valor: "", rotulo: "Escolha…" }].concat(C().CONHECIMENTOS.map(function (c) { return { valor: c.chave, rotulo: c.nome }; })), aoMudar: function (v) { param.conhecimento = v; } })]);
      else if (k === "aumentoDeAtributo") U.trocar(extra, C().ATRIBUTOS.map(function (a) { return el("div.oblivio-criar__atributo", {}, [el("span", { texto: a.nome }), UI().passo({ valor: 0, minimo: 0, maximo: 3, rotulo: a.nome, aoMudar: function (v) { param[a.chave] = v; } })]); }));
      else if (k === "aprenderComAPratica") U.trocar(extra, [UI().campo({ rotulo: "Habilidade aprendida (de quem esteve no grupo na última missão)", tipo: "selecao", opcoes: [{ valor: "", rotulo: "Escolha…" }].concat(C().HABILIDADES.filter(function (h) { return h.tipo !== "geral"; }).map(function (h) { return { valor: h.chave, rotulo: h.nome }; })), aoMudar: function (v) { param.habilidade = v; } })]);
      else U.limpar(extra);
    });
    return el("div.pilha.pilha--curta", {}, [sel, extra, el("button.r-botao.r-botao--mini", { type: "button", texto: "Adquirir", onclick: function () {
      var k = sel.entrada.value;
      if (!k) return;
      operar(ctx, function (b) {
        if (k === "aprenderComAPratica") {
          var r1 = R().adquirirHabilidade(b, "aprenderComAPratica", param, origem);
          if (!r1.ok) return r1;
          if (param.habilidade) { var r2 = R().adquirirHabilidade(b, param.habilidade, {}, "aprenderComAPratica"); r1.eventos = r1.eventos.concat(r2.eventos || []); }
          return r1;
        }
        return R().adquirirHabilidade(b, k, param, origem);
      });
    } })]);
  }

  /* ---------------------------------------------------------------
     ABA ESTADO — mazelas, Fora de Ação, Fardos, Missão, tempo
     --------------------------------------------------------------- */

  function abaEstado(ctx) {
    var o = ctx.ficha.oblivio;
    var cx = contextoDeJogo(ctx);
    var pode = ctx.podeEditar();
    var mazelas = el("ul.oblivio-mazelas", {}, o.mazelas.map(function (m) {
      var cat = C().mazela[m.chave];
      var detalhe = m.chave === "ferida" ? " — " + m.param.dano + " por rodada" : m.chave === "pegandoFogo" ? " — próximo: " + m.param.proximo : m.chave === "coragemCega" ? " — −" + m.param.reducao + " de Proteção" : m.chave === "semFolego" ? " — " + m.param.turnos + "/" + m.param.maximo + " turnos" : m.chave === "semReacao" ? " — turno " + (m.param.turnos || 0) + "/2" : "";
      return el("li.oblivio-mazela", {}, [
        el("span.oblivio-mazela__nome", { texto: cat.nome + detalhe }),
        el("p.t-mini", { texto: cat.resumo + " (p. " + cat.pag + ")" }),
        pode ? el("div.faixa", {}, cat.remocao.filter(function (r) { return r.indexOf("teste:") !== 0 && MEIOS_AUTOMATICOS.indexOf(r) < 0; }).map(function (meio) {
          return botaoDoMeio(ctx, m.chave, meio);
        }).concat(cat.remocao.filter(function (r) { return r.indexOf("teste:") === 0; }).map(function (meio) {
          var k = meio.split(":")[1].split("|")[0];
          return el("button.r-botao.r-botao--mini", { type: "button", texto: "Testar " + C().conhecimento[k].nome, onclick: function () { global.RAMAOblivioJogo.testeDeRemocao(ctx, m.chave, k); } });
        }))) : null,
      ]);
    }));
    var aplicar = pode ? el("div.faixa", {}, [(function () {
      var sel = UI().campo({ rotulo: "Aplicar mazela", tipo: "selecao", opcoes: [{ valor: "", rotulo: "Escolha…" }].concat(C().MAZELAS.map(function (m) { return { valor: m.chave, rotulo: m.nome }; })) });
      var valor = UI().campo({ rotulo: "Dano que a causou (Ferida, Pegando Fogo)", tipo: "numero", valor: 0 });
      return el("div.editar-grade", {}, [sel, valor, el("button.r-botao.r-botao--mini", { type: "button", texto: "Aplicar", onclick: function () {
        var k = sel.entrada.value; if (!k) return;
        operar(ctx, function (b) { return R().aplicarMazela(b, k, { dano: U.inteiro(valor.entrada.value, 0), reducao: U.inteiro(valor.entrada.value, 0) }, { tipo: "mesa" }); });
      } })]);
    })()]) : null;
    var historico = el("ul.oblivio-lista", {}, o.foraDeAcao.historico.map(function (h) {
      return el("li", { texto: h.vez + "ª vez" + (h.contaComo > 1 ? " (contou " + h.contaComo + ")" : "") + (h.missao ? " · Missão " + h.missao.slice(-6) : " · sem Missão") + (h.fardo ? " · Fardo: " + C().fardo[h.fardo].nome : "") });
    }));
    var fardos = el("ul.oblivio-lista", {}, o.fardos.map(function (f) {
      var cat = C().fardo[f.chave];
      var det = f.param.regiao ? " (" + C().regiao[f.param.regiao].nome + ")" : f.param.atributo ? " (" + C().atributo[f.param.atributo].nome + " −" + f.param.perda + ")" : "";
      return el("li", { texto: cat.nome + det + " — " + cat.resumo });
    }));
    var pendFardo = o.escolhasPendentes.filter(function (p) { return p.tipo === "rolarFardo" || p.tipo === "testeDeAtaqueCardiaco"; });
    return el("div.oblivio-aba.pilha", {}, [
      UI().painel("Tempo de jogo", [painelDoTempo(ctx, cx)]),
      UI().painel("Mazelas", [o.mazelas.length ? mazelas : el("p.t-mini", { texto: "Nenhuma mazela." }), aplicar]),
      UI().painel("Fora de Ação e Fardos", [
        el("p", { texto: "Nesta Missão: " + R().ocorrenciasNaMissao(o) + " de 3. Descansar não zera; só concluir a Missão (glossário, p. 121)." }),
        o.morte ? el("p.r-etiqueta.r-etiqueta--aviso", { texto: "Morta: " + o.morte.causa + ". A ficha continua guardada." }) : null,
        historico, fardos,
        pendFardo.map(function (p) {
          return el("div.faixa", {}, [el("span", { texto: p.texto }), el("button.r-botao.r-botao--mini", { type: "button", texto: p.tipo === "rolarFardo" ? "Rolar Fardo" : "Testar Esforço", onclick: function () {
            if (p.tipo === "rolarFardo") operar(ctx, function (b) { b.escolhasPendentes = b.escolhasPendentes.filter(function (x) { return x.id !== p.id; }); return R().rolarFardo(b, rolador); });
            else global.RAMAOblivioJogo.testeDeAtaqueCardiaco(ctx, p.id);
          } })]);
        }),
        pode && R().estadoDaPersona(o) === "ativa" ? el("button.r-botao.r-botao--mini", { type: "button", texto: "Ficar Fora de Ação (sem intervenção)", onclick: function () {
          operar(ctx, function (b) { return R().entrarForaDeAcao(b, { cena: cx.cena, rodada: cx.rodada }, rolador); });
        } }) : null,
        pode && o.foraDeAcao.ativo ? el("button.r-botao.r-botao--mini", { type: "button", texto: "Voltar a si agora (decisão da mesa)", onclick: function () {
          operar(ctx, function (b) { return R().retornarDeForaDeAcao(b, cx); });
        } }) : null,
      ]),
      UI().painel("Missão", [painelDaMissao(ctx)]),
      UI().painel("Ajustes da mesa", [painelDeAjustes(ctx)]),
    ]);
  }

  /* Meios que o motor aplica sozinho (no Estresse, no dano, no tempo, no
     Descanso) ou que são de OUTRA Persona (Resgatar): sem botão aqui. */
  var MEIOS_AUTOMATICOS = ["proximoEstresse", "proximoDanoSofrido", "danoZerado", "doisTurnos", "descanso", "resgatar"];

  /* Cada meio de remoção cobra o que o livro cobra: a Ração sai do
     inventário, o Kit gasta um uso, o Bálsamo é a habilidade (de quem a
     tem). Luz, origem derrotada e as ações são decisões da mesa. */
  function botaoDoMeio(ctx, mazela, meio) {
    var o = ctx.ficha.oblivio;
    function botao(texto, fn, motivo) {
      return el("button.r-botao.r-botao--mini", { type: "button", texto: texto, disabled: !!motivo, title: motivo || "", onclick: fn });
    }
    if (meio === "racao") {
      var racao = o.inventario.itens.filter(function (i) { return i.chave === "racao" && i.estado !== "destruido" && (i.usos === null || i.usos === undefined || i.usos > 0); })[0];
      return botao("Comer uma Ração", function () { operar(ctx, function (b) { return R().comerRacao(b, racao.id); }); }, racao ? "" : "Sem Ração no inventário.");
    }
    if (meio === "kitPrimeirosSocorros") {
      var kit = o.inventario.itens.filter(function (i) { return i.chave === "kitPrimeirosSocorros" && i.usos > 0; })[0];
      return botao("Kit de Primeiros Socorros (1 uso)", function () {
        operar(ctx, function (b) { var c = R().consumir(b, kit.id, 1); return c.ok ? { ok: true, eventos: c.eventos.concat(R().removerMazela(b, mazela, "kitPrimeirosSocorros").eventos) } : c; });
      }, kit ? "" : "Sem Kit de Primeiros Socorros com usos.");
    }
    if (meio === "balsamo") {
      return botao("Bálsamo", function () { global.RAMAOblivioJogo.usarHabilidade(ctx, "balsamo"); },
        R().temHabilidade(o, "balsamo") ? "" : "Bálsamo é de Quem Cuida: quem tem usa na ficha dela, em você.");
    }
    return botao(rotuloDoMeio(meio), function () { operar(ctx, function (b) { return R().removerMazela(b, mazela, meio); }); });
  }

  function rotuloDoMeio(m) {
    return { kitPrimeirosSocorros: "Kit de Primeiros Socorros", balsamo: "Bálsamo", racao: "Ração", descanso: "Descanso", resgatar: "Resgatar", luz: "A luz voltou",
      derrotarOrigem: "Responsável derrotado", "acao:extra+movimento": "Levantar (Extra + Movimento)", "acao:regular+movimento": "Apagar o fogo (Regular + Movimento)" }[m] || m;
  }

  /* O tempo da ficha avulsa (numa campanha com mesa, quem anda é a
     Testemunha). Cada botão é um MOMENTO do motor. */
  function painelDoTempo(ctx, cx) {
    var o = ctx.ficha.oblivio;
    if (!cx.avulsa) return el("div.pilha.pilha--curta", {}, [
      el("p", { texto: "Campanha: cena " + (cx.tipoDeCena ? C().cena[cx.tipoDeCena].nome : "—") + (cx.rodada ? ", rodada " + cx.rodada : "") + ". O tempo anda pela mesa da Testemunha: fim de turno, de rodada e de cena chegam a esta ficha sozinhos." }),
      ctx.podeEditar() ? el("button.r-botao.r-botao--mini", { type: "button", texto: "Descansar (gasta uma Fogueira)", onclick: function () { global.RAMAOblivioJogo.descansar(ctx); } }) : null,
    ]);
    var pode = ctx.podeEditar();
    function momento(fn) { operar(ctx, fn); }
    var tipo = o.contexto.tipoDeCena;
    return el("div.pilha.pilha--curta", {}, [
      el("p", { texto: "Ficha avulsa — " + (tipo ? "Cena de " + C().cena[tipo].nome + (o.contexto.rodada ? ", rodada " + o.contexto.rodada : "") : "nenhuma cena aberta") + ". O tempo só anda por estes botões." }),
      pode ? el("div.faixa", {}, C().CENAS.map(function (cn) {
        return el("button.r-botao.r-botao--mini", { type: "button", texto: "Nova cena: " + cn.nome, onclick: function () {
          momento(function (b) {
            b.contexto.n++;
            b.contexto.cena = "av-" + b.contexto.n; b.contexto.tipoDeCena = cn.chave; b.contexto.rodada = cn.rodadas ? 1 : 0;
            if (!b.contexto.partida) b.contexto.partida = "av-p1";
            return R().inicioDaCena(b, { cena: b.contexto.cena });
          });
        } });
      })) : null,
      pode && o.contexto.rodada ? el("div.faixa", {}, [
        el("button.r-botao.r-botao--mini", { type: "button", texto: "Fim do meu turno", onclick: function () { momento(function (b) { return R().fimDoTurno(b, contextoDeJogo(ctx), rolador); }); } }),
        el("button.r-botao.r-botao--mini", { type: "button", texto: "Fim da rodada", onclick: function () { momento(function (b) { var r = R().fimDaRodada(b, contextoDeJogo(ctx), rolador); b.contexto.rodada++; return r; }); } }),
      ]) : null,
      pode ? el("div.faixa", {}, [
        el("button.r-botao.r-botao--mini", { type: "button", texto: "Nova Partida (sessão)", onclick: function () { momento(function (b) { b.contexto.partida = "av-p" + (Number(String(b.contexto.partida).replace(/\D/g, "")) + 1 || 2); return { ok: true, eventos: [] }; }); } }),
        el("button.r-botao.r-botao--mini", { type: "button", texto: "Descansar (gasta uma Fogueira)", onclick: function () { global.RAMAOblivioJogo.descansar(ctx); } }),
      ]) : null,
    ]);
  }

  function painelDaMissao(ctx) {
    var o = ctx.ficha.oblivio;
    var pode = ctx.podeEditar();
    var naCampanha = !contextoDeJogo(ctx).avulsa;
    return el("div.pilha.pilha--curta", {}, [
      el("p", { texto: o.missao.id ? "Missão em andamento." : "Nenhuma Missão em andamento." + " Concluídas: " + o.missao.concluidas + "." }),
      naCampanha ? el("p.t-mini", { texto: "Na campanha, a Missão é aberta e concluída pela Testemunha." }) :
      pode ? el("div.faixa", {}, [
        !o.missao.id ? el("button.r-botao.r-botao--mini", { type: "button", texto: "Iniciar Missão", onclick: function () { operar(ctx, function (b) { return R().iniciarMissao(b, "av-m-" + U.uuid().slice(0, 8)); }); } }) : null,
        o.missao.id ? el("button.r-botao.r-botao--mini", { type: "button", texto: "Concluir Missão", onclick: function () {
          UI().pedirTexto({ titulo: "Concluir a Missão", rotulo: "Quantas Personas morreram nesta Missão?", valor: "0", rotuloConfirmar: "Concluir" }).then(function (v) {
            if (v === null) return;
            operar(ctx, function (b) { return R().concluirMissao(b, b.missao.id, U.inteiro(v, 0)); });
          });
        } }) : null,
      ]) : null,
    ]);
  }

  /* Os ajustes da mesa (D1, D5, D6…) numa ficha avulsa; numa campanha,
     valem os da mesa. */
  function painelDeAjustes(ctx) {
    var o = ctx.ficha.oblivio;
    var pode = ctx.podeEditar() && contextoDeJogo(ctx).avulsa;
    function campo(rotulo, chave, opcoes, conv) {
      return UI().campo({ rotulo: rotulo, tipo: "selecao", valor: String(o.ajustes[chave]), opcoes: opcoes, desabilitado: !pode,
        aoMudar: function (v) { operar(ctx, function (b) { b.ajustes[chave] = conv ? conv(v) : v; b.ajustes = R().ajustesDe(b.ajustes); return { ok: true, eventos: [] }; }); } });
    }
    return el("div.pilha.pilha--curta", {}, [
      el("p.t-mini", { texto: "Leituras onde o livro diverge ou não define. Ver docs/OBLIVIO.md." }),
      campo("Bônus de especialização", "bonusEspecializacao", [{ valor: "2", rotulo: "+2 (Testes, p. 48 — padrão)" }, { valor: "3", rotulo: "+3 (p. 40)" }], Number),
      campo("Zona de Acerto", "zona", [{ valor: "d20", rotulo: "1D20 (livro — padrão)" }, { valor: "d6", rotulo: "1D6 (ficha; sem bônus)" }, { valor: "2d6", rotulo: "2D6 (ficha; sem bônus)" }]),
      campo("\"Teste de Fuga\" (Armadura de Espinhos)", "testeDeFuga", [{ valor: "reflexos", rotulo: "Teste de Reflexos (padrão)" }, { valor: "testemunha", rotulo: "A Testemunha decide" }]),
    ]);
  }

  global.RAMASecaoOblivio = { blocoSuperior: blocoSuperior, aba: abaPersona };
  global.RAMASecaoOblivioHabilidades = { aba: abaHabilidades };
  global.RAMASecaoOblivioEstado = { aba: abaEstado };
  global.RAMAOblivioFicha = { operar: operar, narrar: narrar, contextoDeJogo: contextoDeJogo, rolador: rolador, mostrarRolagem: mostrarRolagem, composicao: composicao, tratarLimite: tratarLimite };
})(window);
