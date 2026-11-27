/* =====================================================================
   R.A.M.A. — Ordem Paranormal · ficha do Companheiro Animal (v9.25.0)
   =====================================================================
   A ficha jogável do companheiro, aberta pela lista de aliados do tutor.
   O motor é RAMAOrdemCompanheiro (js/ordem/companheiro.js): esta tela
   lê `aliado.companheiro`, mostra o cálculo e grava cada mudança no
   próprio registro, dentro da ficha do tutor (ctx.alterou()).

   QUEM PODE O QUÊ. Ler: qualquer um que abriu a ficha. Jogar (PV, PE,
   COR, Elo, trauma, rolagens): quem pode editar a ficha do tutor.
   Mudar a estrutura (NEX, escolhas, inventário, descrição): também, e
   só no modo edição — como o aliado convencional. O servidor confere de
   novo a cada gravação.

   Consultar uma habilidade nunca gasta nada. O que o RAMA não sabe
   (distância, flanco, alvo, narrativa) aparece como gatilho, custo e
   efeito, e a mesa ativa.
   ===================================================================== */

(function (global) {
  "use strict";
  var U = global.RAMAUtil, UI = global.RAMAUI, el = U.el;
  function M() { return global.RAMAOrdemCompanheiro; }

  function atual(ctx, id) { return U.porId(ctx.ficha.aliados || [], id); }
  function podeJogar(ctx) { return !ctx.podeEditar || ctx.podeEditar(); }
  function podeMudar(ctx) { return podeJogar(ctx) && ctx.emEdicao(); }

  /* Muda o bloco do companheiro e grava. `fn` recebe o bloco já
     normalizado; devolver false cancela. */
  function mudar(ctx, id, fn, jogo) {
    if (!(jogo ? podeJogar(ctx) : podeMudar(ctx))) { UI.avisoAtencao(jogo ? "Somente leitura." : "Entre no modo edição para mudar o companheiro."); return false; }
    var a = atual(ctx, id);
    if (!a || a.tipo !== "companheiro") { UI.avisoAtencao("Este companheiro foi removido da ficha."); return false; }
    var bloco = M().normalizar(a.companheiro);
    if (fn(bloco, a) === false) return false;
    a.companheiro = M().normalizar(bloco);
    ctx.alterou();
    return true;
  }

  function sinal(n) { return (n >= 0 ? "+" : "") + n; }
  function siglaDe(k) { return M().nomeAtr(k); }
  function expressaoDoAtributo(v) { return v <= 0 ? "-2d20" : v + "d20"; }
  function rotuloDoAtributo(v) { return v <= 0 ? "2d20, o pior" : v + "d20, o melhor"; }

  /* ---------------- rolagens ---------------- */

  function rolarTeste(ctx, c, nome, valorAtributo, sigla, bonus, notas) {
    var D = global.RAMADados;
    var r = D.dependente({ expressao: expressaoDoAtributo(valorAtributo), sigla: sigla, nome: nome, bonus: bonus });
    if (!r || !r.ok) { UI.avisoErro("Não deu para rolar " + nome + "."); return null; }
    if (global.RAMARolagens) global.RAMARolagens.mostrar(Object.assign(r, { tipo: "pericia", nome: nome }), { nome: (c.nome || "Companheiro") + " · " + nome, notas: notas || [] });
    else UI.avisoOk(nome + ": " + r.total);
    return r;
  }

  function multiplicarDados(dano, vezes) {
    return String(dano).replace(/^(\d+)d(\d+)/, function (_, q, f) { return (Number(q) * vezes) + "d" + f; });
  }
  function rolarDano(ctx, c, at, critico) {
    var D = global.RAMADados;
    var base = /^\d+$/.test(at.dano) ? at.dano + "d1" : at.dano;
    if (critico) base = multiplicarDados(base, at.multiplicador);
    var formula = base + (at.danoBonus ? (at.danoBonus > 0 ? "+" : "") + at.danoBonus : "");
    var r = D.formula({ nome: at.nome, formula: formula, contagem: "soma" });
    if (!r || !r.ok) { UI.avisoErro("Dano inválido: " + formula); return; }
    var notas = [];
    if (/^\d+$/.test(at.dano)) notas.push("Dano fixo do porte (" + at.dano + ").");
    if (at.semDadoExtra) notas.push("Ataque Pesado: dano fixo não ganha dado do mesmo tipo.");
    if (global.RAMARolagens) global.RAMARolagens.mostrar(r, { nome: (c.nome || "Companheiro") + " · " + at.nome + (critico ? " (crítico ×" + at.multiplicador + ")" : ""), notas: notas });
  }

  /* ---------------- partes reaproveitadas pela criação ---------------- */

  /* O controle de UMA vaga (decisão). `r` é o cálculo; `aoEscolher(v)`
     grava o novo valor. Também usado em companheiro-criar.js. */
  function controleDaVaga(v, r, aoEscolher, desabilitado) {
    var C = M();
    var corpo = [];
    function botao(rotulo, marcado, acao, extra) {
      return el("button.criacao-pericia", Object.assign({
        type: "button", "aria-pressed": String(!!marcado), disabled: !!desabilitado,
        class: marcado ? "criacao-pericia--marcada" : "", onclick: acao,
      }, extra || {}), [el("span.criacao-pericia__nome", { texto: rotulo })]);
    }
    function selecao(opcoes, atualValor, ajuda) {
      var s = UI.campo({ tipo: "selecao", rotulo: v.rotulo, valor: atualValor || "", desabilitado: desabilitado,
        opcoes: [{ valor: "", rotulo: "— escolha —" }].concat(opcoes), ajuda: ajuda || "",
        aoMudar: function (x) { aoEscolher(x || null); } });
      return s;
    }
    if (v.tipo === "opcao") {
      corpo.push(el("p.t-mini.comp-vaga__rotulo", { texto: v.rotulo }));
      corpo.push(el("div.criacao-pericias", {}, v.opcoes.map(function (op) {
        return botao(op.rotulo, v.valor === op.valor, function () { aoEscolher(v.valor === op.valor ? null : op.valor); }, { title: op.texto || "" });
      })));
      var esc = v.opcoes.filter(function (op) { return op.valor === v.valor; })[0];
      if (esc && esc.texto) corpo.push(el("p.t-mini", { texto: esc.texto }));
    } else if (v.tipo === "pericia") {
      corpo.push(selecao(C.PERICIAS.filter(function (p) { return v.excluir.indexOf(p.chave) < 0 || p.chave === v.valor; }).map(function (p) {
        return { valor: p.chave, rotulo: p.nome + " (" + siglaDe(p.atributo) + ")" };
      }), v.valor));
    } else if (v.tipo === "pericias" || v.tipo === "grau") {
      var lista = Array.isArray(v.valor) ? v.valor.slice() : [];
      var pode = C.PERICIAS.filter(function (p) {
        if (v.tipo === "grau") return r.graus[p.chave] !== "destreinado" || lista.indexOf(p.chave) >= 0;
        return v.subir || v.excluir.indexOf(p.chave) < 0 || lista.indexOf(p.chave) >= 0;
      });
      corpo.push(el("p.t-mini.comp-vaga__rotulo", { texto: v.rotulo + " — " + lista.length + " de " + v.quantidade }));
      if (v.tipo === "grau") corpo.push(el("p.t-mini", { texto: "Treinado sobe a veterano (a partir de 35%); veterano sobe a expert (a partir de 70%). Só perícias já treinadas." }));
      if (v.subir) corpo.push(el("p.t-mini", { texto: "Cada escolha treina uma perícia ou sobe um grau (veterano a partir de 35%, expert a partir de 70%)." }));
      corpo.push(el("div.criacao-pericias", {}, pode.map(function (p) {
        var marcada = lista.indexOf(p.chave) >= 0;
        var cheia = !marcada && lista.length >= v.quantidade;
        return botao(p.nome + " · " + siglaDe(p.atributo) + (r.graus[p.chave] !== "destreinado" && !marcada ? " (" + r.graus[p.chave] + ")" : ""), marcada, function () {
          if (cheia) { UI.avisoAtencao("Já há " + v.quantidade + " escolhida(s). Desmarque uma antes."); return; }
          var i = lista.indexOf(p.chave);
          if (i >= 0) lista.splice(i, 1); else lista.push(p.chave);
          aoEscolher(lista.slice());
        }, cheia ? { "aria-disabled": "true", class: "criacao-pericia--bloqueada" } : null);
      })));
    } else if (v.tipo === "atributo") {
      corpo.push(el("p.t-mini.comp-vaga__rotulo", { texto: v.rotulo }));
      corpo.push(el("div.criacao-pericias", {}, C.ATRIBUTOS.map(function (a) {
        var marcado = v.valor === a.chave;
        var noTeto = !marcado && r.atributos[a.chave] >= Math.min(5, r.tetos[a.chave]);
        return botao(a.sigla + " " + r.atributos[a.chave] + (noTeto ? " (teto)" : ""), marcado, function () {
          if (noTeto) { UI.avisoAtencao(a.nome + " já está no teto do porte (" + r.tetos[a.chave] + ")."); return; }
          aoEscolher(marcado ? null : a.chave);
        }, noTeto ? { "aria-disabled": "true", class: "criacao-pericia--bloqueada" } : null);
      })));
    } else if (v.tipo === "poder") {
      var ops = C.PODERES.map(function (p) {
        var falta = (p.requisitos || []).filter(function (q) { return !C.cumpre(q, { atributos: r.atributos, graus: r.graus, porElemento: {}, c: r.c }); });
        return { valor: p.chave, rotulo: p.nome + (falta.length ? " — requer " + falta.map(C.textoDoRequisito).join(", ") : "") };
      });
      var pd = C.poderGeral(v.valor);
      corpo.push(selecao(ops, v.valor, pd ? pd.texto : ""));
    } else if (v.tipo === "paranormal") {
      var grupos = {};
      C.paranormais().forEach(function (p) { (grupos[p.elemento || "variado"] = grupos[p.elemento || "variado"] || []).push(p); });
      var opsP = [];
      ["sangue", "morte", "conhecimento", "energia", "medo", "variado"].forEach(function (g) {
        (grupos[g] || []).forEach(function (p) {
          opsP.push({ valor: p.chave, rotulo: (g === "variado" ? "" : C.nomeElemento(g) + " · ") + p.nome + (p.deOrdem ? " (Ordem)" : "") +
            ((p.requisitos || []).length ? " — requer " + p.requisitos.map(C.textoDoRequisito).join(", ") : "") });
        });
      });
      var pp = C.paranormal(v.valor);
      corpo.push(selecao(opsP, v.valor, pp ? pp.texto + (pp.afinidade ? " Afinidade: " + pp.afinidade : "") : "Os exclusivos de companheiro e os poderes paranormais de Ordem que servem ao animal (sem Aprender Ritual)."));
    } else if (v.tipo === "poderElo") {
      var pe = C.PODERES_ELO.filter(function (x) { return x.chave === v.valor; })[0];
      corpo.push(selecao(C.PODERES_ELO.map(function (x) { return { valor: x.chave, rotulo: x.nome + (x.custo ? " (" + x.custo + " PE)" : "") }; }), v.valor, pe ? pe.texto : ""));
      if (!v.ativa) corpo.push(el("p.t-mini.t-aviso", { texto: "Inativo: o Elo está abaixo de " + v.elo + "%. A escolha fica guardada e volta quando o Elo subir." }));
    }
    if (v.problema && v.ativa) corpo.push(el("p.t-mini.t-erro", { role: "status", texto: v.problema }));
    return el("div.comp-vaga", { class: v.problema && v.ativa ? "comp-vaga--pendente" : "", dataset: { vaga: v.id } }, corpo);
  }

  /* As vagas agrupadas pelo marco, em ordem: NEX crescente, depois Elo. */
  function porMarco(vagas) {
    var grupos = [];
    vagas.slice().sort(function (x, y) { return (x.elo ? 1000 + x.elo : x.marco) - (y.elo ? 1000 + y.elo : y.marco); }).forEach(function (v) {
      var t = v.elo ? "Elo " + v.elo + "%" : "NEX " + v.marco + "%";
      var g = grupos[grupos.length - 1];
      if (!g || g.titulo !== t) grupos.push(g = { titulo: t, vagas: [] });
      g.vagas.push(v);
    });
    return grupos;
  }

  /* Os números principais, em linhas de dados. */
  function resumo(r) {
    return el("dl.r-dados.comp-resumo", {}, [
      el("dt", { texto: "PV" }), el("dd", { texto: String(r.pv.maximo) }),
      el("dt", { texto: "PE" }), el("dd", { texto: String(r.pe.maximo) }),
      el("dt", { texto: "COR" }), el("dd", { texto: String(r.cor.maximo) }),
      el("dt", { texto: "Defesa" }), el("dd", { texto: String(r.defesa) }),
      el("dt", { texto: "Limite de PE por turno" }), el("dd", { texto: String(r.limitePE) }),
      el("dt", { texto: "Elo" }), el("dd", { texto: r.elo + "%" }),
      el("dt", { texto: "Carga" }), el("dd", { texto: r.carga.capacidade + " espaço(s)" }),
      el("dt", { texto: "Deslocamento" }), el("dd", { texto: r.deslocamento + " m" }),
    ]);
  }

  /* ---------------- a janela ---------------- */

  function abrir(ctx, id) {
    var a = atual(ctx, id);
    if (!a || a.tipo !== "companheiro" || !M()) return;
    var estado = { aba: "geral" };
    var corpo = el("div.pilha.comp-ficha", {});
    var m = UI.modal({
      titulo: (a.companheiro.nome || "Companheiro"), largo: true, classe: "comp-modal",
      conteudo: corpo, botoes: [{ rotulo: "Fechar" }], aoFechar: function () { ctx.redesenhar(); },
    });

    function pintar() {
      var aliado = atual(ctx, id);
      if (!aliado || aliado.tipo !== "companheiro") { U.trocar(corpo, [UI.vazio({ titulo: "Companheiro removido", texto: "Ele não está mais nesta ficha." })]); return; }
      var r = M().calcular(aliado.companheiro, { tutor: ctx.ficha.ordem });
      var titulo = m.janela.querySelector(".r-modal__topo .t-secao");
      if (titulo) titulo.textContent = r.c.nome || "Companheiro";
      var ABAS = [["geral", "Geral"], ["habilidades", "Habilidades e poderes"], ["inventario", "Inventário"], ["progressao", "Progressão" + (r.pendentes.length ? " (" + r.pendentes.length + ")" : "")], ["descricao", "Descrição"]];
      var abas = el("div.r-abas.r-abas--rolavel", { role: "tablist", "aria-label": "Seções do companheiro" }, ABAS.map(function (x) {
        return el("button.r-aba", { type: "button", role: "tab", "aria-selected": String(estado.aba === x[0]), "aria-pressed": String(estado.aba === x[0]), texto: x[1],
          onclick: function () { estado.aba = x[0]; pintar(); } });
      }));
      var secao = estado.aba === "geral" ? abaGeral(r, aliado) : estado.aba === "habilidades" ? abaHabilidades(r) : estado.aba === "inventario" ? abaInventario(r)
        : estado.aba === "progressao" ? abaProgressao(r) : abaDescricao(r, aliado);
      U.trocar(corpo, [cabecalho(r, aliado), abas, secao]);
    }
    function refazer(fn, jogo) { if (mudar(ctx, id, fn, jogo)) pintar(); }

    function cabecalho(r, aliado) {
      var linha = [r.c.especie || "animal", r.porte.nome, "NEX " + r.nex + "%", r.especializacao ? r.especializacao.nome : "sem especialização", r.origem ? r.origem.nome : "sem origem"].join(" · ");
      return el("div.faixa.comp-cabecalho", {}, [
        aliado.imagem ? el("img.aliado-imagem.comp-retrato", { src: aliado.imagem, alt: r.c.nome }) : null,
        el("div.pilha--curta", { class: "pilha" }, [
          el("p.t-mini", { texto: linha }),
          el("p.t-mini", { texto: "Tutor: " + (ctx.ficha.nome || "—") + " · " + M().FONTE }),
          !podeJogar(ctx) ? el("p.t-mini.t-aviso", { texto: "Somente leitura." }) : !ctx.emEdicao() ? el("p.t-mini", { texto: "Recursos, Elo e rolagens funcionam aqui. Para subir de NEX, escolher e editar, entre no modo edição da ficha." }) : null,
          r.trauma.incapaz ? el("p.t-mini.t-erro", { texto: "Três episódios de trauma nesta missão: não pode lutar até o fim da missão." }) : null,
          r.pendentes.length ? el("p.t-mini.t-aviso", { texto: r.pendentes.length + " decisão(ões) pendente(s) na Progressão." }) : null,
        ]),
      ]);
    }

    /* ---------- Geral ---------- */

    function recurso(r, chave, nome, info) {
      var atualV = info.atual, max = info.maximo;
      var passo = UI.passo({ valor: atualV, minimo: chave === "pv" ? -999 : 0, maximo: 9999, rotulo: nome + " atual",
        aoMudar: function (v) { refazer(function (c) { M().definirRecurso(c, chave, v, max); }, true); } });
      if (!podeJogar(ctx)) passo.querySelectorAll("button, input").forEach(function (x) { x.disabled = true; });
      return el("div.comp-recurso", {}, [
        el("span.comp-recurso__nome", { texto: nome }),
        passo,
        el("span.comp-recurso__max", { texto: "/ " + max }),
        el("div.faixa", {}, [
          el("button.r-botao.r-botao--mini", { type: "button", texto: chave === "cor" ? "Perder COR" : chave === "pv" ? "Dano" : "Gastar", disabled: !podeJogar(ctx),
            onclick: function () { perder(r, chave, nome, atualV, max); } }),
          el("button.r-botao.r-botao--mini", { type: "button", texto: "Recuperar tudo", disabled: !podeJogar(ctx) || atualV >= max,
            onclick: function () { refazer(function (c) { M().definirRecurso(c, chave, max, max); c.recursos[chave] = null; }, true); } }),
        ]),
      ]);
    }

    function perder(r, chave, nome, atualV, max) {
      var valor = 0, reducao = 0;
      var conteudo = [el("div.editar-grade", {}, [
        el("div.r-campo", {}, [el("label", { texto: chave === "pe" ? "PE gastos" : "Dano" }), UI.passo({ valor: 0, minimo: 0, maximo: 999, rotulo: "Quantidade", aoMudar: function (v) { valor = v; } })]),
        chave === "pe" ? null : el("div.r-campo", {}, [el("label", { texto: chave === "cor" ? "Resistência mental" : "Redução de dano" }),
          UI.passo({ valor: 0, minimo: 0, maximo: 999, rotulo: "Redução", aoMudar: function (v) { reducao = v; } })]),
      ])];
      if (chave === "cor") conteudo.push(el("p.t-mini", { texto: "A resistência mental é aplicada antes da perda de COR. Chegar a 0 abre um episódio de trauma." }));
      if (chave === "pv" && r.rd.length) conteudo.push(el("p.t-mini", { texto: "RD do companheiro: " + r.rd.map(function (x) { return x.valor + " (" + x.tipo + ", " + x.fonte + ")"; }).join("; ") + "." }));
      if (chave === "pe") conteudo.push(el("p.t-mini", { texto: "Limite por turno: " + r.limitePE + " PE (com PE, sempre dá para usar uma habilidade pelo custo mínimo)." }));
      UI.modal({ titulo: nome + " — " + (chave === "pe" ? "gastar" : "perder"), conteudo: conteudo, botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Aplicar", classe: "r-botao--principal", aoClicar: function (fechar) {
          var final = Math.max(0, valor - reducao);
          var res = null;
          refazer(function (c) { res = M().definirRecurso(c, chave, atualV - final, max); }, true);
          fechar();
          if (res && res.abriuTrauma) UI.avisoAtencao("COR 0: episódio de trauma aberto. Há 3 turnos para o tratamento.");
        } },
      ] });
    }

    function abaGeral(r) {
      var C = M();
      var partes = [];
      partes.push(el("div.comp-recursos", {}, [recurso(r, "pv", "PV", r.pv), recurso(r, "pe", "PE", r.pe), recurso(r, "cor", "COR", r.cor)]));
      if (r.amedrontado) partes.push(el("p.t-mini.t-aviso", { texto: "Amedrontado: COR abaixo do máximo — –2 em testes contra o Outro Lado." }));
      if (r.trauma.emTrauma || r.trauma.aberto) partes.push(painelTrauma(r));
      partes.push(el("dl.r-dados", {}, [
        el("dt", { texto: "Defesa" }), el("dd", { texto: r.defesa + " (" + r.partesDefesa.map(function (x) { return x.fonte + " " + sinal(x.valor); }).join(", ") + ")" }),
        el("dt", { texto: "Deslocamento" }), el("dd", { texto: r.deslocamento + " m" }),
        el("dt", { texto: "NEX" }), el("dd", { texto: r.nex + "% · limite de PE por turno " + r.limitePE }),
        el("dt", { texto: "Carga" }), el("dd", { texto: r.carga.ocupado + " de " + r.carga.capacidade + " espaço(s)" + (r.carga.sobrecarregado ? " — sobrecarregado (–5 em Defesa e nas perícias com penalidade de carga, –3 m)" : "") }),
        r.rd.length ? el("dt", { texto: "Redução de dano" }) : null,
        r.rd.length ? el("dd", { texto: r.rd.map(function (x) { return x.valor + " " + x.tipo + " (" + x.fonte + ")"; }).join("; ") }) : null,
      ]));
      partes.push(el("h4.t-secao", { texto: "Atributos" }));
      partes.push(el("div.comp-atributos", {}, C.ATRIBUTOS.map(function (at) {
        var v = r.atributos[at.chave];
        return el("button.comp-atributo", { type: "button", disabled: !podeJogar(ctx) || ctx.emEdicao(), title: rotuloDoAtributo(v),
          onclick: function () { rolarTeste(ctx, r.c, at.nome, v, at.sigla, 0); } }, [
          el("span.comp-atributo__sigla", { texto: at.sigla }), el("span.comp-atributo__valor", { texto: String(v) }), el("span.t-mini", { texto: "teto " + r.tetos[at.chave] }),
        ]);
      })));
      partes.push(el("h4.t-secao", { texto: "Resistências" }));
      partes.push(el("div.faixa", {}, r.resistencias.map(function (p) { return botaoDePericia(r, p); })));
      partes.push(painelElo(r));
      partes.push(el("h4.t-secao", { texto: "Perícias" }));
      partes.push(el("div.comp-pericias", {}, r.pericias.map(function (p) { return linhaDePericia(r, p); })));
      partes.push(el("h4.t-secao", { texto: "Ataques" }));
      partes.push(el("div.pilha--curta", { class: "pilha" }, r.ataques.map(function (at) { return linhaDeAtaque(r, at); })));
      return el("div.pilha", {}, partes);
    }

    function botaoDePericia(r, p) {
      var rolar = !ctx.emEdicao() && podeJogar(ctx) && p.podeUsar;
      return el("button.r-botao.r-botao--mini", { type: "button", disabled: !rolar, title: p.podeUsar ? "" : "Só treinada",
        texto: p.nome + " " + sinal(p.total) + " (" + p.valorAtributo + "d20)",
        onclick: function () { rolarDaPericia(r, p); } });
    }
    function rolarDaPericia(r, p) {
      var notas = p.extras.map(function (x) { return x.fonte + " " + sinal(x.valor); });
      if (p.usosDeOrdem) notas.push("Usos: os compatíveis de Ordem" + (p.semUsos.length ? ", menos " + p.semUsos.join(", ") : "") + ".");
      rolarTeste(ctx, r.c, p.nome, p.valorAtributo, siglaDe(p.atributo), p.total, notas);
    }
    function linhaDePericia(r, p) {
      var rolar = !ctx.emEdicao() && podeJogar(ctx) && p.podeUsar;
      return el("div.comp-pericia", { class: p.grau !== "destreinado" ? "comp-pericia--treinada" : "" }, [
        el("button.comp-pericia__rolar", { type: "button", disabled: !rolar, "aria-label": "Rolar " + p.nome, onclick: function () { rolarDaPericia(r, p); } }, [
          el("span.comp-pericia__nome", { texto: p.nome + (p.carga ? "*" : "") + (p.treinada ? " (só treinada)" : "") }),
          el("span.t-mini", { texto: siglaDe(p.atributo) + " " + p.valorAtributo + " · " + p.grauNome }),
          el("span.comp-pericia__total", { texto: sinal(p.total) }),
        ]),
        p.usos.length ? el("details.comp-usos", {}, [el("summary.t-mini", { texto: "Usos" }),
          el("ul.bib-lista-textos", {}, p.usos.map(function (u) { return el("li.t-mini", { texto: u.nome + (u.treinada ? " (treinada)" : "") + ": " + u.texto }); }))]) : null,
      ]);
    }
    function linhaDeAtaque(r, at) {
      var rolar = !ctx.emEdicao() && podeJogar(ctx);
      var meta = [at.pericia === "luta" ? "Luta" : "Pontaria", sinal(at.bonus), "dano " + at.dano + (at.danoBonus ? sinal(at.danoBonus) : ""), "crítico " + at.margem + "/×" + at.multiplicador];
      if (at.agil) meta.push("ágil");
      if (at.proficiente === false) meta.push("sem proficiência (–5)");
      return el("div.comp-ataque", {}, [
        el("strong", { texto: at.nome }),
        el("span.t-mini", { texto: meta.join(" · ") }),
        at.nota ? el("span.t-mini", { texto: at.nota }) : null,
        el("div.faixa", {}, [
          el("button.r-botao.r-botao--mini", { type: "button", texto: "Atacar", disabled: !rolar, onclick: function () {
            var res = rolarTeste(ctx, r.c, at.nome, at.valorAtributo, siglaDe(at.atributo), at.bonus,
              ["Margem de ameaça " + at.margem + ".", r.presaFacilDados ? "Presa Fácil (1 PE, desprevenido ou flanqueado): +AGI na margem e +" + r.presaFacilDados + "d6 de dano." : ""].filter(Boolean));
            if (res && res.natural >= at.margem) UI.avisoOk("Ameaça de crítico (natural " + res.natural + ").");
          } }),
          el("button.r-botao.r-botao--mini", { type: "button", texto: "Dano", disabled: !rolar, onclick: function () { rolarDano(ctx, r.c, at, false); } }),
          el("button.r-botao.r-botao--mini", { type: "button", texto: "Crítico", disabled: !rolar, onclick: function () { rolarDano(ctx, r.c, at, true); } }),
          r.presaFacilDados ? el("button.r-botao.r-botao--mini", { type: "button", texto: "+" + r.presaFacilDados + "d6 Presa Fácil", disabled: !rolar, onclick: function () {
            var x = global.RAMADados.formula({ nome: "Presa Fácil", formula: r.presaFacilDados + "d6", contagem: "soma" });
            if (x.ok && global.RAMARolagens) global.RAMARolagens.mostrar(x, { nome: (r.c.nome || "Companheiro") + " · Presa Fácil" });
          } }) : null,
        ]),
      ]);
    }

    function painelTrauma(r) {
      var ep = r.trauma.aberto;
      var partes = [el("h4.t-secao", { texto: "Trauma" })];
      if (ep) {
        partes.push(el("p.t-mini", { texto: ep.estado === "aberto"
          ? "Episódio aberto: " + ep.turnos + " de 3 turnos para o tratamento. Depois disso, o tratamento passa para o interlúdio."
          : "Tratamento no interlúdio (os 3 turnos passaram)." }));
        partes.push(el("div.faixa", {}, [
          ep.estado === "aberto" ? el("button.r-botao.r-botao--mini", { type: "button", texto: "Passou um turno", disabled: !podeJogar(ctx), onclick: function () {
            refazer(function (c) { var e = U.porId(c.trauma.episodios, ep.id); if (!e) return false; e.turnos = Math.min(3, e.turnos + 1); if (e.turnos >= 3) e.estado = "prolongado"; }, true);
          } }) : null,
          el("button.r-botao.r-botao--mini", { type: "button", texto: "Registrar tratamento", disabled: !podeJogar(ctx), onclick: async function () {
            var txt = await UI.pedirTexto({ titulo: "Como o trauma foi resolvido?", rotulo: "Resolução (a mesa decide)", valor: "", limite: 300 });
            if (txt === null || txt === undefined) return;
            refazer(function (c) { var e = U.porId(c.trauma.episodios, ep.id); if (!e) return false; e.estado = "tratado"; e.resolucao = String(txt); }, true);
          } }),
        ]));
      }
      partes.push(el("p.t-mini", { texto: "Episódios nesta missão: " + r.trauma.daMissao + " de 3." + (r.trauma.incapaz ? " Incapaz de lutar até o fim da missão." : "") }));
      partes.push(el("button.r-botao.r-botao--mini", { type: "button", texto: "Nova missão (zera a contagem)", disabled: !podeJogar(ctx), onclick: function () {
        refazer(function (c) { c.trauma.missao = "m" + Date.now().toString(36); }, true);
      } }));
      return el("div.pilha--curta.comp-trauma", { class: "pilha" }, partes);
    }

    function painelElo(r) {
      var C = M();
      var partes = [el("h4.t-secao", { texto: "Elo: " + r.elo + "%" }),
        el("div.comp-elo-barra", { role: "img", "aria-label": "Elo " + r.elo + "%", style: "--comp-elo: " + r.elo + "%" }),
        el("p.t-mini", { texto: "Obediência: " + r.obediencia }),
        el("p.t-mini", { texto: "Sugestão do suplemento: +15 a cada 10% de NEX, se a relação for boa. Quem decide é a mesa." })];
      if (podeJogar(ctx)) {
        partes.push(el("div.faixa", {}, C.AJUSTES_ELO.map(function (aj) {
          return el("button.r-botao.r-botao--mini", { type: "button", texto: aj.texto + " " + sinal(aj.valor), onclick: function () {
            refazer(function (c) { C.ajustarElo(c, aj.valor, aj.texto); }, true);
          } });
        }).concat([el("button.r-botao.r-botao--mini", { type: "button", texto: "Outro ajuste…", onclick: async function () {
          var txt = await UI.pedirTexto({ titulo: "Ajustar o Elo", rotulo: "Pontos (ex.: 15 ou -5)", valor: "" });
          var n = parseInt(txt, 10);
          if (!Number.isFinite(n) || !n) return;
          refazer(function (c) { C.ajustarElo(c, n, "Ajuste da mesa"); }, true);
        } })])));
      }
      var reg = r.c.eloRegistro.slice(-5).reverse();
      if (reg.length) partes.push(el("ul.bib-lista-textos", {}, reg.map(function (x) { return el("li.t-mini", { texto: sinal(x.valor) + " · " + (x.motivo || "ajuste") }); })));
      return el("div.pilha--curta.comp-elo", { class: "pilha" }, partes);
    }

    /* ---------- Habilidades e poderes ---------- */

    function cartaoDeHabilidade(h, extra) {
      var e = extra || {};
      var custo = typeof h.custo === "number" ? h.custo : null;
      return el("div.comp-habilidade", { class: e.inativa ? "comp-habilidade--inativa" : "" }, [
        el("div.faixa", {}, [el("strong", { texto: h.nome }), e.rotulo ? el("span.etiqueta", { texto: e.rotulo }) : null, h.custo ? el("span.etiqueta", { texto: h.custo + " PE" }) : null]),
        el("p.t-mini", { texto: h.texto }),
        e.afinidade ? el("p.t-mini", { texto: "Afinidade: " + e.afinidade }) : null,
        custo && !e.inativa && podeJogar(ctx) ? el("button.r-botao.r-botao--mini", { type: "button", texto: "Usar (gastar " + custo + " PE)", onclick: function () {
          var aliado = atual(ctx, id); if (!aliado) return;
          var r = M().calcular(aliado.companheiro);
          if (r.pe.atual < custo) { UI.avisoAtencao("PE insuficientes (" + r.pe.atual + ")."); return; }
          if (custo > r.limitePE) UI.avisoAtencao("Acima do limite de " + r.limitePE + " PE por turno — confira com a mesa.");
          refazer(function (c) { M().definirRecurso(c, "pe", r.pe.atual - custo, r.pe.maximo); }, true);
          UI.avisoOk(h.nome + ": " + custo + " PE gastos.");
        } }) : null,
      ]);
    }

    function abaHabilidades(r) {
      var partes = [el("p.t-mini", { texto: "Consultar não gasta nada. O gatilho (distância, flanco, alvo) é decisão da mesa; “Usar” só desconta os PE." })];
      if (r.origem) {
        partes.push(el("h4.t-secao", { texto: "Origem: " + r.origem.nome }));
        partes.push(cartaoDeHabilidade({ nome: r.origem.beneficio, texto: r.origem.texto, custo: r.origem.acao && r.origem.acao.custo }));
        if (r.sequela) { var sq = M().SEQUELAS.filter(function (x) { return x.chave === r.sequela; })[0]; if (sq) partes.push(cartaoDeHabilidade({ nome: "Sequela: " + sq.nome, texto: sq.texto })); }
      }
      if (r.especializacao) {
        partes.push(el("h4.t-secao", { texto: "Especialização: " + r.especializacao.nome }));
        partes.push(el("p.t-mini", { texto: "Proficiências: " + r.proficiencias.join(", ") + "." }));
        r.habilidades.forEach(function (h) {
          var texto = h.chave === "presaFacil" && h.ativa ? h.texto + " Agora: +" + r.presaFacilDados + "d6." : h.chave === "combateAnimal" && h.ativa ? h.texto + " Agora: +" + r.combateAnimal + " de dano." : h.texto;
          partes.push(cartaoDeHabilidade(Object.assign({}, h, { texto: texto }), { rotulo: "NEX " + h.marco + "%", inativa: !h.ativa }));
        });
      }
      partes.push(el("h4.t-secao", { texto: "Poderes de companheiro" }));
      partes.push(r.poderes.length ? el("div.pilha--curta", { class: "pilha" }, r.poderes.map(function (p) { return cartaoDeHabilidade(p, { rotulo: "NEX " + p.marco + "%" }); }))
        : el("p.t-mini", { texto: "Nenhum ainda (chegam em NEX 20%, 50% e 80%)." }));
      partes.push(el("h4.t-secao", { texto: "Paranormal" }));
      partes.push(el("p.t-mini", { texto: r.conexao ? "Conexão: " + M().nomeElemento(r.conexao) + (r.afinidade ? " — afinidade manifestada." : " — a afinidade se manifesta no próximo poder paranormal.") : "Sem conexão (escolhida em NEX 50%; pode ser diferente da do tutor)." }));
      r.paranormais.forEach(function (p) { partes.push(cartaoDeHabilidade(p, { rotulo: p.elemento ? M().nomeElemento(p.elemento) : "", afinidade: p.comAfinidade ? p.afinidadeTexto : "" })); });
      partes.push(el("h4.t-secao", { texto: "Elo" }));
      r.habilidadesElo.forEach(function (h) {
        var texto = h.chave === "trabalhoEquipe" && h.ativa ? h.texto + " Agora: +" + r.bonusEquipe + "." : h.texto;
        partes.push(cartaoDeHabilidade(Object.assign({}, h, { texto: texto }), { rotulo: "Elo " + h.marco + "%", inativa: !h.ativa }));
      });
      r.poderesElo.forEach(function (p) { partes.push(cartaoDeHabilidade(p, { rotulo: "Elo " + p.elo + "%" + (p.ativo ? "" : " · inativo"), inativa: !p.ativo })); });
      return el("div.pilha", {}, partes);
    }

    /* ---------- Inventário ---------- */

    function abaInventario(r) {
      var C = M();
      var mudarOk = podeMudar(ctx);
      var partes = [el("p.t-mini", { texto: "Capacidade " + r.carga.capacidade + " espaço(s) (porte " + r.porte.nome + ", FOR " + r.atributos["for"] + "); ocupado " + r.carga.ocupado + "." + (r.carga.sobrecarregado ? " Sobrecarregado." : "") + (r.carga.acimaDoMaximo ? " Acima do dobro: não consegue se mover." : "") })];
      partes.push(el("p.t-mini", { texto: "Crédito: o do tutor, registrado uma vez só na ficha dele. Escudos não servem ao animal. Guardar um item segurado é ação de movimento; largar é livre. O tutor adjacente equipa o animal com ação padrão e tira com ação de movimento." }));
      var limites = null;
      try { limites = global.RAMAOrdemRegras && ctx.ficha.ordem ? global.RAMAOrdemRegras.calcular(ctx.ficha.ordem, ctx.ficha.inventario).categorias : null; } catch (e) { limites = null; }
      if (limites && limites.categorias) {
        partes.push(el("p.t-mini", { texto: "Patente do tutor — itens por categoria (tutor + companheiro / limite): " + [1, 2, 3, 4].map(function (n) {
          var cat = limites.categorias[n] || {};
          var usados = (cat.usados || 0) + (r.usoCategoria[n] || 0);
          return ["I", "II", "III", "IV"][n - 1] + " " + usados + "/" + (cat.limite === null || cat.limite === undefined ? "∞" : cat.limite);
        }).join(" · ") }));
      }
      var itens = r.c.inventario.itens;
      partes.push(itens.length ? el("div.pilha--curta", { class: "pilha" }, itens.map(function (i) {
        var meta = [i.quantidade + "×", i.espacos + " esp."];
        if (i.categoria) meta.push("cat. " + ["0", "I", "II", "III", "IV"][i.categoria]);
        if (i.tipo === "arma") meta.push(i.dano + " · " + i.margem + "/×" + i.multiplicador + " · " + i.proficiencia);
        if (i.tipo === "armadura") meta.push("Defesa +" + i.defesa + " · proteção " + i.protecao);
        return el("div.comp-item", {}, [
          el("strong", { texto: i.nome }), el("span.t-mini", { texto: meta.join(" · ") }),
          i.nota ? el("span.t-mini", { texto: i.nota }) : null,
          el("div.faixa", {}, [
            i.tipo === "armadura" ? el("button.r-botao.r-botao--mini", { type: "button", texto: i.vestido ? "Tirar" : "Vestir", disabled: !podeJogar(ctx), onclick: function () {
              refazer(function (c) { var x = U.porId(c.inventario.itens, i.id); if (!x) return false; x.vestido = !x.vestido; if (!x.vestido) delete x.vestido; }, true);
            } }) : null,
            i.tipo === "arma" ? el("button.r-botao.r-botao--mini", { type: "button", texto: i.empunhado ? "Guardar (movimento)" : "Empunhar", disabled: !podeJogar(ctx), onclick: function () {
              refazer(function (c) { var x = U.porId(c.inventario.itens, i.id); if (!x) return false; x.empunhado = !x.empunhado; if (!x.empunhado) delete x.empunhado; }, true);
            } }) : null,
            mudarOk ? el("button.r-botao.r-botao--mini.r-botao--perigo", { type: "button", texto: "Remover", onclick: async function () {
              var sim = await UI.confirmar({ titulo: "Remover item?", texto: "Remover " + i.nome + " do inventário do companheiro?", rotuloConfirmar: "Remover", perigo: true });
              if (sim) refazer(function (c) { c.inventario.itens = c.inventario.itens.filter(function (x) { return x.id !== i.id; }); });
            } }) : null,
          ]),
        ]);
      })) : el("p.t-mini", { texto: "Inventário vazio." }));
      if (mudarOk) {
        partes.push(el("div.faixa", {}, [
          el("button.r-botao.r-botao--mini", { type: "button", texto: "Arma adaptada", onclick: function () { escolherArma(); } }),
          el("button.r-botao.r-botao--mini", { type: "button", texto: "Proteção adaptada", onclick: function () { novoItem("armadura"); } }),
          el("button.r-botao.r-botao--mini", { type: "button", texto: "Item", onclick: function () { novoItem("item"); } }),
        ]));
      }
      void C;
      return el("div.pilha", {}, partes);
    }

    function escolherArma() {
      var C = M();
      var lista = el("div.criacao-lista", {}, C.ARMAS.map(function (w) {
        return el("button.criacao-opcao", { type: "button", onclick: function () {
          refazer(function (c) { c.inventario.itens.push(Object.assign({ id: U.uuid(), tipo: "arma", quantidade: 1 }, U.copiar(w))); });
          janela.fechar();
        } }, [
          el("span.criacao-opcao__nome", { texto: w.nome }),
          el("span.criacao-opcao__meta", { texto: "Categoria " + ["0", "I", "II"][w.categoria] + " · " + w.dano + " · " + w.margem + "/×" + w.multiplicador + " · " + w.tipoDano + " · " + w.espacos + " esp. · armas " + w.proficiencia }),
          w.nota ? el("span.criacao-opcao__texto", { texto: w.nota }) : null,
        ]);
      }));
      var janela = UI.modal({ titulo: "Arma adaptada", largo: true, conteudo: lista, botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }] });
    }

    function novoItem(tipo) {
      var dados = { nome: tipo === "armadura" ? "Proteção adaptada" : "", espacos: tipo === "armadura" ? 2 : 1, categoria: tipo === "armadura" ? 1 : 0, defesa: 5, protecao: "leve", quantidade: 1 };
      var nome = UI.campo({ rotulo: "Nome", valor: dados.nome, aoDigitar: true, aoMudar: function (v) { dados.nome = v; } });
      var esp = UI.campo({ rotulo: "Espaços", valor: String(dados.espacos), aoDigitar: true, aoMudar: function (v) { dados.espacos = v; } });
      var cat = UI.campo({ tipo: "selecao", rotulo: "Categoria", valor: String(dados.categoria), opcoes: [0, 1, 2, 3, 4].map(function (n) { return { valor: String(n), rotulo: ["0", "I", "II", "III", "IV"][n] }; }),
        aoMudar: function (v) { dados.categoria = Number(v); } });
      var extra = tipo === "armadura" ? [
        el("div.r-campo", {}, [el("label", { texto: "Defesa" }), UI.passo({ valor: dados.defesa, minimo: 0, maximo: 30, rotulo: "Defesa", aoMudar: function (v) { dados.defesa = v; } })]),
        UI.campo({ tipo: "selecao", rotulo: "Proteção", valor: "leve", opcoes: [{ valor: "leve", rotulo: "Leve" }, { valor: "pesada", rotulo: "Pesada" }], aoMudar: function (v) { dados.protecao = v; } }),
      ] : [el("div.r-campo", {}, [el("label", { texto: "Quantidade" }), UI.passo({ valor: 1, minimo: 1, maximo: 999, rotulo: "Quantidade", aoMudar: function (v) { dados.quantidade = v; } })])];
      UI.modal({ titulo: tipo === "armadura" ? "Proteção adaptada" : "Novo item",
        conteudo: [el("div.editar-grade", {}, [nome, esp, cat].concat(extra)), tipo === "armadura" ? el("p.t-mini", { texto: "Proteções adaptadas ao corpo do animal (sem escudos)." }) : null],
        botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Adicionar", classe: "r-botao--principal", aoClicar: function (fechar) {
          if (!String(dados.nome).trim()) { nome.marcarErro("Dê um nome."); return; }
          refazer(function (c) { c.inventario.itens.push({ id: U.uuid(), tipo: tipo, nome: String(dados.nome).trim(), espacos: dados.espacos, categoria: dados.categoria, defesa: dados.defesa, protecao: dados.protecao, quantidade: dados.quantidade }); });
          fechar();
        } }] });
    }

    /* ---------- Progressão ---------- */

    function abaProgressao(r) {
      var C = M();
      var mudarOk = podeMudar(ctx);
      var partes = [];
      partes.push(el("div.faixa", {}, [
        el("strong", { texto: "NEX " + r.nex + "%" }),
        el("button.r-botao.r-botao--mini", { type: "button", texto: "Voltar a " + (C.NEX[r.nexIndice - 1] || "—") + "%", disabled: !mudarOk || r.nexIndice === 0, onclick: async function () {
          var sim = await UI.confirmar({ titulo: "Voltar um marco de NEX?", texto: "As escolhas deste marco ficam guardadas (voltam se ele subir de novo). Um crescimento registrado neste marco é desfeito.", rotuloConfirmar: "Voltar" });
          if (sim) refazer(function (c) { C.descerNex(c); });
        } }),
        el("button.r-botao.r-botao--mini.r-botao--principal", { type: "button", texto: r.proximoNex ? "Subir para " + r.proximoNex + "%" : "NEX máximo", disabled: !mudarOk || !r.proximoNex, onclick: function () {
          refazer(function (c) { C.subirNex(c); });
        } }),
        r.podeCrescer ? el("button.r-botao.r-botao--mini", { type: "button", texto: "Crescer neste marco (" + r.porte.nome + " → próximo porte)", disabled: !mudarOk, onclick: function () {
          refazer(function (c) { C.crescer(c); });
        } }) : null,
        r.c.crescimentos.some(function (g) { return g.marco === r.nexIndice; }) ? el("button.r-botao.r-botao--mini", { type: "button", texto: "Desfazer o crescimento deste marco", disabled: !mudarOk, onclick: function () {
          refazer(function (c) { C.desfazerCrescimento(c); });
        } }) : null,
      ]));
      if (r.portePlanejado.chave !== r.porteInicial.chave) partes.push(el("p.t-mini", { texto: "Crescimento planejado: " + r.porteInicial.nome + " → " + r.portePlanejado.nome + ". Cada crescimento dá 1 ponto de atributo; os ganhos seguintes usam o novo porte." }));
      if (r.problemasDistribuicao.length) partes.push(el("p.t-mini.t-erro", { texto: "Atributos de criação: " + r.problemasDistribuicao.join(" ") }));
      partes.push(el("h4.t-secao", { texto: "Decisões" }));
      porMarco(r.vagas).forEach(function (g) {
        partes.push(el("div.comp-marco", {}, [el("h5.t-mini.comp-marco__titulo", { texto: g.titulo })].concat(g.vagas.map(function (v) {
          return controleDaVaga(v, r, function (valor) {
            refazer(function (c) { if (valor === null || valor === undefined || (Array.isArray(valor) && !valor.length)) delete c.escolhas[v.id]; else c.escolhas[v.id] = valor; }, false);
          }, !mudarOk);
        }))));
      });
      partes.push(el("h4.t-secao", { texto: "Recursos por marco" }));
      partes.push(el("div.comp-tabela-rolavel", {}, [el("table.comp-tabela", {}, [
        el("thead", {}, [el("tr", {}, ["NEX", "Porte", "PV", "PE", "COR"].map(function (x) { return el("th", { texto: x }); }))]),
        el("tbody", {}, r.linhasDeRecursos.map(function (l, i) {
          var pre = i === 0 ? "" : "+";
          return el("tr", {}, [l.nex + "%", l.porte, pre + l.pv, pre + l.pe, (l.semCor ? "0 (Transcender)" : pre + l.cor)].map(function (x) { return el("td", { texto: String(x) }); }));
        })),
      ])]));
      if (r.pv.extras.length || r.cor.extras.length) partes.push(el("p.t-mini", { texto: r.pv.extras.concat(r.cor.extras).map(function (x) { return x.fonte + " +" + x.valor; }).join(" · ") + " (por marco, já incluído no máximo)." }));
      return el("div.pilha", {}, partes);
    }

    /* ---------- Descrição ---------- */

    function abaDescricao(r, aliado) {
      var mudarOk = podeMudar(ctx);
      function campoTexto(chave, rotulo, area) {
        var c = UI.campo({ rotulo: rotulo, valor: r.c[chave], tipo: area ? "area" : undefined, limite: area ? 3000 : 80, desabilitado: !mudarOk,
          aoMudar: function (v) { refazer(function (b) { b[chave] = v; }); } });
        return c;
      }
      var previa = el("div.comp-previa", {}, [aliado.imagem ? el("img", { src: aliado.imagem, alt: "" }) : "?"]);
      return el("div.pilha", {}, [
        el("div.faixa", {}, [previa,
          mudarOk ? el("button.r-botao.r-botao--fantasma", { type: "button", texto: aliado.imagem ? "Trocar imagem" : "Imagem", onclick: async function () {
            var img = await global.RAMAEditorImagem.escolher("aliado");
            if (!img || !img.ok) return;
            refazer(function (b, a) { a.imagem = img.imagem; });
          } }) : null,
          mudarOk && aliado.imagem ? el("button.r-botao.r-botao--fantasma", { type: "button", texto: "Remover imagem", onclick: function () { refazer(function (b, a) { a.imagem = ""; }); } }) : null,
        ]),
        el("div.editar-grade", {}, [campoTexto("nome", "Nome"), campoTexto("especie", "Espécie")]),
        campoTexto("aparencia", "Aparência", true), campoTexto("personalidade", "Personalidade", true), campoTexto("historico", "Histórico", true),
        UI.campo({ rotulo: "Anotações", tipo: "area", valor: r.c.anotacoes, limite: 10000, desabilitado: !podeJogar(ctx),
          aoMudar: function (v) { refazer(function (b) { b.anotacoes = v; }, true); } }),
      ]);
    }

    pintar();
    return m;
  }

  /* O cartão na lista de aliados do tutor. */
  function cartao(ctx, a, acoes) {
    var r = M() ? M().calcular(a.companheiro) : null;
    var nome = (a.companheiro && a.companheiro.nome) || "Companheiro";
    return el("article.r-painel.comp-cartao", {}, [
      a.imagem ? el("img.aliado-imagem", { src: a.imagem, alt: nome, loading: "lazy" }) : null,
      el("h3.t-secao", { texto: nome }),
      r ? el("p.t-mini", { texto: ["Companheiro animal", r.c.especie, r.porte.nome, "NEX " + r.nex + "%", r.especializacao ? r.especializacao.nome : ""].filter(Boolean).join(" · ") }) : el("p.t-mini", { texto: "Companheiro animal" }),
      r ? el("p.t-mini", { texto: "PV " + r.pv.atual + "/" + r.pv.maximo + " · PE " + r.pe.atual + "/" + r.pe.maximo + " · COR " + r.cor.atual + "/" + r.cor.maximo + " · Elo " + r.elo + "%" + (r.pendentes.length ? " · " + r.pendentes.length + " pendente(s)" : "") }) : null,
      acoes,
    ]);
  }

  global.RAMAOrdemCompanheiroFicha = { abrir: abrir, cartao: cartao, controleDaVaga: controleDaVaga, resumo: resumo, porMarco: porMarco };
})(window);
