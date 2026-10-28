/* =====================================================================
   R.A.M.A. — Oblívio · testes, ataque e inventário na ficha (v3.0)
   ---------------------------------------------------------------------
     RAMASecaoOblivioTestes      Conhecimentos, Coragem, disputa, ataque
     RAMASecaoOblivioInventario  espaços, equipar, usar, modificar,
                                 fabricar, recarregar
     RAMAOblivioJogo             o que outras seções chamam: usar uma
                                 habilidade, teste de remoção de mazela,
                                 Ataque Cardíaco, Descansar

   O ATAQUE
     As regiões são escolhidas no diagrama ANTES de rolar: cada clique é
     um dado, e o número do dado aparece na região. Rolado, o ataque fica
     PENDENTE enquanto houver escolha (Comprar Sucesso, Aumentar Extremo,
     Empunhadura, Corte Relâmpago); só "Concluir" aplica o Estresse das
     falhas e conta os sucessos. Contra uma Ameaça da mesa, o servidor
     compara com a Proteção e aplica o dano; avulso, a pessoa informa a
     Proteção do alvo e nada é guardado sobre ele.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el;
  function C() { return global.RAMAOblivioCatalogo; }
  function R() { return global.RAMAOblivio; }
  function K() { return global.RAMAOblivioCombate; }
  function H() { return global.RAMAOblivioHabilidades; }
  function UI() { return global.RAMAUI; }
  function FX() { return global.RAMAOblivioFicha; }

  var RES_CLASSE = { falhaExtrema: "fe", falhaRegular: "fr", sucessoRegular: "sr", sucessoExtremo: "se" };

  /* ---------------------------------------------------------------
     TESTE DE CONHECIMENTO
     --------------------------------------------------------------- */

  function abrirTeste(ctx, conhecimento, opcoes) {
    var op = opcoes || {};
    var o = ctx.ficha.oblivio;
    var dif = UI().campo({ rotulo: "Dificuldade (da Testemunha)", tipo: "selecao", valor: "normal", opcoes: C().DIFICULDADES.map(function (d) { return { valor: d.chave, rotulo: d.nome }; }) });
    var ajudas = UI().campo({ rotulo: "Personas ajudando (+1 cada)", tipo: "numero", valor: 0 });
    var bonus = UI().campo({ rotulo: "Outro bônus (Repertório, Analisar…)", tipo: "numero", valor: 0 });
    var fonte = UI().campo({ rotulo: "De onde vem o bônus", valor: "", limite: 60 });
    var utensilios = o.inventario.itens.filter(function (i) { return i.chave === "utensilio" && i.usos > 0 && i.estado !== "destruido"; });
    var usarUtensilio = utensilios.length ? el("label.r-marca", {}, [el("input", { type: "checkbox" }), el("span", { texto: "Usar um Utensílio (reduz a dificuldade; gasta 1 uso)" })]) : null;
    var plano = R().temHabilidade(o, "planoDeContingencia") ? el("label.r-marca", {}, [el("input", { type: "checkbox" }), el("span", { texto: "Plano de Contingência (uma vez por cena)" })]) : null;
    var susto = conhecimento === "emocional" ? el("label.r-marca", {}, [el("input", { type: "checkbox" }), el("span", { texto: "É para evitar um susto (Covardia)" })]) : null;
    UI().modal({
      titulo: "Teste de " + C().conhecimento[conhecimento].nome,
      conteudo: [el("p.t-mini", { texto: C().conhecimento[conhecimento].resumo + " " + (R().bonusDeEspecializacao(o, conhecimento) ? "Especializado: +" + o.ajustes.bonusEspecializacao + "." : "Sem especialização.") }),
        dif, el("div.editar-grade", {}, [ajudas, bonus]), fonte, usarUtensilio, plano, susto],
      botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Rolar", classe: "r-botao--principal", aoClicar: function (fechar) {
        var cx = FX().contextoDeJogo(ctx);
        var reduzir = [];
        var usou = null;
        if (usarUtensilio && usarUtensilio.querySelector("input").checked) { reduzir.push("Utensílio"); usou = utensilios[0]; }
        if (plano && plano.querySelector("input").checked) {
          var p = H().usar("planoDeContingencia", { fichas: { eu: o }, quem: "eu", ctx: cx });
          if (!p.ok) { UI().avisoAtencao(p.motivo); return; }
          reduzir.push("Plano de Contingência");
        }
        var b = U.inteiro(bonus.entrada.value, 0);
        var mont = K().montarTeste(o, conhecimento, { dificuldade: dif.entrada.value, ajudas: U.inteiro(ajudas.entrada.value, 0), reduzir: reduzir,
          bonus: b ? [{ fonte: fonte.entrada.value || "Bônus", valor: b }] : [], susto: susto && susto.querySelector("input").checked, recuperarSemReacao: !!op.recuperarSemReacao });
        if (!mont.ok) { UI().avisoAtencao(mont.motivo); return; }
        fechar();
        var resultado = null;
        /* Só grava quando o teste muda a ficha: Utensílio gasto, Reduzir
           Extremo consumido, Plano de Contingência usado. */
        if (usou || mont.reducaoExtremo || reduzir.indexOf("Plano de Contingência") >= 0) {
          FX().operar(ctx, function (bloco) {
            if (usou) R().consumir(bloco, usou.id, 1);
            resultado = K().rolarTeste(bloco, mont, FX().rolador);
            return { ok: true, eventos: [] };
          }, { silencioso: true });
        } else resultado = K().rolarTeste(o, mont, FX().rolador);
        if (!resultado) return;
        FX().mostrarRolagem(C().conhecimento[conhecimento].nome + " — " + resultado.nome, resultado.faces, resultado.total, resultado.bonus, resultado.resultado === "sucessoExtremo");
        mostrarResultadoDoTeste(ctx, resultado, op);
      } }],
    });
  }

  /* O resultado: dado, bônus, total, classe — e o que ainda dá para fazer
     (Coragem, Dar uma Mãozinha). */
  function mostrarResultadoDoTeste(ctx, r, op) {
    var o = ctx.ficha.oblivio;
    var linhas = [
      el("p.oblivio-resultado", { class: "oblivio-resultado--" + RES_CLASSE[r.resultado] }, [el("strong", { texto: r.nome }), el("span", { texto: " · total " + r.total + " (dado " + r.faces.join("/") + (r.somaBonus ? (r.somaBonus > 0 ? " + " : " − ") + Math.abs(r.somaBonus) : "") + ") · " + r.dificuldade + (r.autoFalha ? " · falha automática (Sem Reação)" : "") }) ]),
      r.bonus.length ? el("p.t-mini", { texto: r.bonus.map(function (b) { return b.fonte + " " + (b.valor >= 0 ? "+" : "") + b.valor; }).join(" · ") }) : null,
    ];
    var botoes = [];
    if (!r.sucesso && !r.autoFalha) {
      var custo = r.resultado === "falhaExtrema" ? 2 : 1;
      if (o.coragem >= custo) botoes.push({ rotulo: "Comprar sucesso (" + custo + " de Coragem)", aoClicar: function (fechar) {
        fechar();
        FX().operar(ctx, function (b) { b.coragem -= custo; return { ok: true, eventos: [R().evento("coragem", { valor: -custo, motivo: "Comprar Sucesso" })] }; });
        r.resultado = "sucessoRegular"; r.sucesso = true; r.nome = "Sucesso Regular (comprado)";
        if (op && op.aoTerminar) op.aoTerminar(r);
      } });
      botoes.push({ rotulo: "Dar uma Mãozinha (1D6)", aoClicar: function (fechar) {
        var m = K().darUmaMaozinha(r.resultado, FX().rolador);
        UI().aviso("Dar uma Mãozinha: 1D6 = " + m.d6 + (m.virou === "sucessoRegular" ? " — virou sucesso." : " — continua falha; Quem Resolve sofre " + m.estresseEmQuemResolve + " de Estresse."));
        if (m.virou === "sucessoRegular") { r.resultado = "sucessoRegular"; r.sucesso = true; r.nome = "Sucesso Regular (Mãozinha)"; }
        fechar();
        if (op && op.aoTerminar) op.aoTerminar(r);
      } });
      if (temFardoCovardia(o)) linhas.push(el("p.t-mini", { texto: "Covardia: perder Coragem por falhar custa o dobro." }));
    } else if (r.resultado === "sucessoExtremo" && o.coragem >= 1) {
      botoes.push({ rotulo: "Aumentar Extremo (1 de Coragem)", aoClicar: function (fechar) {
        fechar();
        FX().operar(ctx, function (b) { b.coragem -= 1; return { ok: true, eventos: [R().evento("coragem", { valor: -1, motivo: "Aumentar Extremo: +1 sucesso" })] }; });
        if (op && op.aoTerminar) op.aoTerminar(r, { sucessoAdicional: true });
      } });
    }
    UI().modal({ titulo: "Resultado", conteudo: linhas, botoes: botoes.map(function (b) { return { rotulo: b.rotulo, classe: "r-botao--fantasma", aoClicar: b.aoClicar }; })
      .concat([{ rotulo: "Fechar", classe: "r-botao--principal", aoClicar: function (fechar) { fechar(); if (op && op.aoTerminar && !op.terminado) op.aoTerminar(r); } }]) });
  }
  function temFardoCovardia(o) { return R().temFardo(o, "covardia"); }

  /* ---------------------------------------------------------------
     ABA TESTES
     --------------------------------------------------------------- */

  function abaTestes(ctx) {
    var o = ctx.ficha.oblivio;
    var pode = ctx.podeEditar() && R().estadoDaPersona(o) === "ativa";
    var lista = el("ul.oblivio-conhecimentos", {}, C().CONHECIMENTOS.map(function (c) {
      var esp = R().bonusDeEspecializacao(o, c.chave);
      return el("li.oblivio-conhecimento", { class: esp ? "oblivio-conhecimento--esp" : "" }, [
        el("button.oblivio-conhecimento__rolar", { type: "button", disabled: !pode, "aria-label": "Testar " + c.nome + (esp ? ", especializado, +" + esp : ""), onclick: function () { abrirTeste(ctx, c.chave); } }, [
          el("span.oblivio-conhecimento__nome", { texto: c.nome }),
          el("span.oblivio-conhecimento__bonus", { texto: esp ? "+" + esp : "—" }),
        ]),
        el("span.t-mini", { texto: c.resumo }),
      ]);
    }));
    return el("div.oblivio-aba.pilha", {}, [
      UI().painel("Testes de Conhecimento (1D20)", [lista, el("p.t-mini", { texto: "Zona de Acerto (p. 52): Reduzida 10+, Normal 13+, Aumentada 16+; 1 é Falha Extrema; 20 (ou o mínimo reduzido) é Sucesso Extremo. Compara o total (dado + bônus)." })]),
      UI().painel("Ataque", [painelDeAtaque(ctx)]),
      UI().painel("Coragem", [painelDeCoragem(ctx)]),
      UI().painel("Disputa de testes", [painelDeDisputa(ctx)]),
      UI().painel("Ações", [painelDeAcoes(ctx)]),
    ]);
  }

  /* ---- Coragem (p. 37) ---- */
  function painelDeCoragem(ctx) {
    var o = ctx.ficha.oblivio;
    var pode = ctx.podeEditar();
    var cx = FX().contextoDeJogo(ctx);
    var pontos = UI().campo({ rotulo: "Pontos", tipo: "numero", valor: 1 });
    var mut = UI().campo({ rotulo: "Atributo a aumentar", tipo: "selecao", opcoes: ["dano", "folego", "protecao", "velocidade"].map(function (k) { return { valor: k, rotulo: C().mutavel[k].nome }; }) });
    var motivo = UI().campo({ rotulo: "Motivo da recompensa", tipo: "selecao", opcoes: [{ valor: "Motivação", rotulo: "Agiu pela Motivação" }, { valor: "Ação Corajosa", rotulo: "Ação Corajosa" }, { valor: "Estimulante", rotulo: "Estimulante" }, { valor: "Testemunha", rotulo: "Outro (Testemunha)" }] });
    var reduz = (o.efeitos.filter(function (e) { return e.tipo === "reduzirExtremo"; })[0] || {}).valor;
    return el("div.pilha.pilha--curta", {}, [
      el("p", { texto: "Saldo: " + o.coragem + ". Recalcular a ficha nunca devolve o que foi gasto." + (reduz ? " Próximo teste: Extremo a partir de " + (20 - reduz) + "." : "") }),
      el("ul.oblivio-lista", {}, C().USOS_DE_CORAGEM.map(function (u) { return el("li", { texto: u.nome + " — " + u.custo + ": " + u.resumo }); })),
      pode ? el("div.editar-grade", {}, [pontos, mut, motivo]) : null,
      pode ? el("div.faixa", {}, [
        el("button.r-botao.r-botao--mini", { type: "button", texto: "Reduzir Extremo do próximo teste", onclick: function () { FX().operar(ctx, function (b) { return R().gastarCoragem(b, "reduzirExtremo", { valor: U.inteiro(pontos.entrada.value, 1) }, cx); }); } }),
        el("button.r-botao.r-botao--mini", { type: "button", texto: "Aumentar Atributo Mutável", onclick: function () { FX().operar(ctx, function (b) { return R().gastarCoragem(b, "aumentarMutavel", { atributo: mut.entrada.value }, cx); }); } }),
        el("button.r-botao.r-botao--mini", { type: "button", texto: "Recuperar Estresse (Fôlego por ponto)", onclick: function () { FX().operar(ctx, function (b) { return R().gastarCoragem(b, "recuperarEstresse", { pontos: U.inteiro(pontos.entrada.value, 1) }, cx); }); } }),
        el("button.r-botao.r-botao--mini", { type: "button", texto: "Receber Coragem (recompensa)", onclick: function () {
          FX().operar(ctx, function (b) { return R().ganharCoragem(b, U.inteiro(pontos.entrada.value, 1), motivo.entrada.value); });
        } }),
        el("button.r-botao.r-botao--mini", { type: "button", texto: "Perder Coragem", onclick: function () {
          var porFalha = el("label.r-marca", {}, [el("input", { type: "checkbox" }), el("span", { texto: "Por ter falhado num teste (Covardia dobra)" })]);
          UI().modal({ titulo: "Perder " + U.inteiro(pontos.entrada.value, 1) + " de Coragem", conteudo: [porFalha,
            el("p.t-mini", { texto: "Sem Coragem para perder, vira Pavor (p. 93)." + (cx.perdaDeCoragem > 1 ? " Buraco Assustador: a perda dobra." : "") })],
            botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Perder", classe: "r-botao--principal", aoClicar: function (f) {
              f();
              FX().operar(ctx, function (b) { return R().perderCoragem(b, U.inteiro(pontos.entrada.value, 1), { porFalha: porFalha.querySelector("input").checked, multiplicador: cx.perdaDeCoragem > 1 ? cx.perdaDeCoragem : 0, motivo: "Testemunha" }); });
            } }] });
        } }),
      ]) : null,
    ]);
  }

  /* ---- Disputa (p. 49): o resultado do oponente vem de fora ---- */
  function painelDeDisputa(ctx) {
    var con = UI().campo({ rotulo: "Conhecimento", tipo: "selecao", opcoes: C().CONHECIMENTOS.map(function (c) { return { valor: c.chave, rotulo: c.nome }; }) });
    var outro = UI().campo({ rotulo: "Total do oponente", tipo: "numero", valor: 0 });
    var dif = UI().campo({ rotulo: "Dificuldade do oponente", tipo: "selecao", valor: "normal", opcoes: C().DIFICULDADES.map(function (d) { return { valor: d.chave, rotulo: d.nome }; }) });
    return el("div.pilha.pilha--curta", {}, [el("div.editar-grade", {}, [con, outro, dif]),
      el("button.r-botao.r-botao--mini", { type: "button", texto: "Rolar a disputa", disabled: !ctx.podeEditar(), onclick: function () {
        abrirTeste(ctx, con.entrada.value, { aoTerminar: function (meu) {
          var total = U.inteiro(outro.entrada.value, 0);
          var deles = { total: total, resultado: K().classificarD20(total, dif.entrada.value, 0) };
          var v = K().compararDisputa(meu, deles);
          UI().aviso(v === "a" ? "Você venceu a disputa." : v === "b" ? "O oponente venceu a disputa." : "Empate: a Testemunha decide ou manda rolar de novo (p. 49).", { tipo: v === "a" ? "ok" : v === "b" ? "atencao" : "info" });
        } });
      } })]);
  }

  /* ---- Ações específicas e corajosas ---- */
  function painelDeAcoes(ctx) {
    var o = ctx.ficha.oblivio;
    var pode = ctx.podeEditar();
    var cx = FX().contextoDeJogo(ctx);
    function botao(rotulo, fn) { return el("button.r-botao.r-botao--mini", { type: "button", texto: rotulo, disabled: !pode, onclick: fn }); }
    return el("div.pilha.pilha--curta", {}, [
      el("ul.oblivio-lista", {}, C().ACOES.map(function (a) { return el("li", { texto: a.nome + " (" + a.acao.replace("+", " + ").replace("|", " ou ") + ")" + (a.corajosa ? " — Corajosa" : "") + ": " + a.resumo }); })),
      el("div.faixa", {}, [
        botao("Acelerar", function () { FX().operar(ctx, function (b) { return H().agir("acelerar", { fichas: { eu: b }, quem: "eu", ctx: cx, rolador: FX().rolador }); }); }),
        botao("Preparar ação", function () {
          UI().pedirTexto({ titulo: "Preparar", rotulo: "Quando… (o gatilho)", rotuloConfirmar: "Preparar" }).then(function (g) {
            if (!g) return;
            FX().operar(ctx, function (b) { return H().agir("preparar", { fichas: { eu: b }, quem: "eu", param: { gatilho: g, acao: "ação preparada" } }); });
          });
        }),
        botao("Seguir em Frente", function () {
          abrirTeste(ctx, "emocional", { aoTerminar: function (r) { FX().operar(ctx, function (b) { return H().agir("seguirEmFrente", { fichas: { eu: b }, quem: "eu", param: { resultado: r.resultado } }); }); } });
        }),
        botao("Escapar (contar sucessos)", function () { global.RAMAOblivioMesaDaFicha.escapar(ctx); }),
        botao("Fabricar", function () { abrirFabricar(ctx); }),
      ]),
      naMesa(ctx) ? el("div.faixa", {}, [
        botao("Analisar uma Ameaça", function () { global.RAMAOblivioMesaDaFicha.agir(ctx, "analisar"); }),
        botao("Resgatar (Pavor)", function () { global.RAMAOblivioMesaDaFicha.agir(ctx, "resgatar"); }),
        botao("Sacrificar", function () { global.RAMAOblivioMesaDaFicha.agir(ctx, "sacrificar"); }),
      ]) : el("p.t-mini", { texto: "Analisar, Resgatar e Sacrificar envolvem a mesa ou outra Persona: ficam disponíveis com a ficha numa campanha." }),
      o.efeitos.some(function (e) { return e.tipo === "preparada"; }) ? el("p.t-mini", { texto: "Ação preparada: " + o.efeitos.filter(function (e) { return e.tipo === "preparada"; })[0].gatilho + ". Uma Ação Regular antes disso a perde." }) : null,
    ]);
  }

  /* ---------------------------------------------------------------
     ATAQUE
     --------------------------------------------------------------- */

  var rascunhos = {};

  function painelDeAtaque(ctx) {
    var o = ctx.ficha.oblivio;
    var id = ctx.personagemId || "avulsa";
    var d = rascunhos[id] || (rascunhos[id] = { regioes: [], arma: "", alvo: { protecao: 0, zerada: false, noChao: false, contra: "normal", alcance: 1 }, mirar: false, capacidade: 0, bonus: 0, fonte: "" });
    var pode = ctx.podeEditar() && R().estadoDaPersona(o) === "ativa";
    var sobrecarga = R().temHabilidade(o, "sobrecarga");
    var corpo = global.RAMAOblivioCorpo.diagrama(o, {
      selecionadas: d.regioes, soDisponiveis: true, rotuloAcao: "— arriscar esta região",
      aoEscolher: pode ? function (k) {
        var i = d.regioes.lastIndexOf(k);
        if (i >= 0 && !sobrecarga) d.regioes.splice(i, 1);
        else if (d.regioes.length < C().MAXIMO_DADOS_ATAQUE) d.regioes.push(k);
        else UI().avisoAtencao("No máximo 5 rolagens por ataque.");
        ctx.atualizar(["conteudo"], {});
      } : null,
    });
    var armas = R().itensEquipados(o).filter(function (i) { var c = C().equipamento[i.chave]; return c && (c.classe === "arma" || (c.classe === "escudo" && R().temMod(i, "belica"))); });
    var arma = UI().campo({ rotulo: "Arma", tipo: "selecao", valor: d.arma, opcoes: [{ valor: "", rotulo: "Desarmado (atributo de Dano)" }].concat(armas.map(function (i) {
      var c = C().equipamento[i.chave];
      return { valor: i.id, rotulo: i.nome + " — " + (c.dano || "1d6").toUpperCase() + (c.recargaApos ? " (" + i.ataques + "/" + c.recargaApos + " até recarregar)" : "") };
    })), aoMudar: function (v) { d.arma = v; } });
    var alvosDaMesa = global.RAMAOblivioMesaDaFicha ? global.RAMAOblivioMesaDaFicha.alvos(ctx) : null;
    var alvoMesa = alvosDaMesa && alvosDaMesa.length ? UI().campo({ rotulo: "Alvo (Ameaça da mesa)", tipo: "selecao", valor: d.alvoMesa || "",
      opcoes: [{ valor: "", rotulo: "Escolha…" }].concat(alvosDaMesa.map(function (a) { return { valor: a.id, rotulo: a.nome + " — " + a.alcance }; })), aoMudar: function (v) { d.alvoMesa = v; } }) : null;
    var prot = alvoMesa ? null : UI().campo({ rotulo: "Proteção restante do alvo", tipo: "numero", valor: d.alvo.protecao, aoMudar: function (v) { d.alvo.protecao = U.inteiro(v, 0); } });
    var contra = UI().campo({ rotulo: "Dificuldade contra o alvo", tipo: "selecao", valor: d.alvo.contra, opcoes: C().DIFICULDADES.map(function (x) { return { valor: x.chave, rotulo: x.nome }; }), aoMudar: function (v) { d.alvo.contra = v; } });
    var noChao = el("label.r-marca", {}, [el("input", { type: "checkbox", checked: d.alvo.noChao, onchange: function (e) { d.alvo.noChao = e.target.checked; } }), el("span", { texto: "Alvo No Chão (rola duas vezes, fica com o melhor)" })]);
    var mirar = el("label.r-marca", {}, [el("input", { type: "checkbox", checked: d.mirar, onchange: function (e) { d.mirar = e.target.checked; ctx.atualizar(["conteudo"], {}); } }), el("span", { texto: "Mirar (Ação Completa) numa região do alvo" })]);
    var capacidade = d.mirar ? UI().campo({ rotulo: "Estresse que a região mirada ainda aguenta", tipo: "numero", valor: d.capacidade, aoMudar: function (v) { d.capacidade = U.inteiro(v, 0); } }) : null;
    var bonus = UI().campo({ rotulo: "Bônus num dado (Analisar, Repertório…)", tipo: "numero", valor: d.bonus, aoMudar: function (v) { d.bonus = U.inteiro(v, 0); } });
    var semRegioes = el("label.r-marca", {}, [el("input", { type: "checkbox", checked: d.alvo.zerada, onchange: function (e) { d.alvo.zerada = e.target.checked; ctx.atualizar(["conteudo"], {}); } }), el("span", { texto: "Alvo com Proteção zerada (só Ação Regular, sem arriscar regiões — p. 118)" })]);
    return el("div.oblivio-ataque", {}, [
      el("p.t-mini", { texto: "Cada clique numa região é um dado preso a ela antes de rolar" + (sobrecarga ? " (Sobrecarga: pode repetir)" : "") + ". Falha põe 1 de Estresse na região (2 na Extrema). Regiões: " + (d.regioes.map(function (k) { return C().regiao[k].nome; }).join(", ") || "nenhuma") + "." }),
      corpo,
      el("div.editar-grade", {}, [arma, alvoMesa || prot, contra, bonus]),
      semRegioes, noChao, mirar, capacidade,
      el("div.faixa", {}, [
        el("button.r-botao.r-botao--principal", { type: "button", texto: d.alvo.zerada ? "Atacar sem regiões" : "Rolar " + d.regioes.length + " dado(s)", disabled: !pode || (!d.alvo.zerada && !d.regioes.length), onclick: function () { executarAtaque(ctx, d); } }),
        el("button.r-botao.r-botao--fantasma", { type: "button", texto: "Limpar regiões", disabled: !d.regioes.length, onclick: function () { d.regioes = []; ctx.atualizar(["conteudo"], {}); } }),
      ]),
    ]);
  }

  function executarAtaque(ctx, d) {
    var o = ctx.ficha.oblivio;
    var cx = FX().contextoDeJogo(ctx);
    var daMesa = d.alvoMesa && global.RAMAOblivioMesaDaFicha ? (global.RAMAOblivioMesaDaFicha.alvos(ctx) || []).filter(function (a) { return a.id === d.alvoMesa; })[0] : null;
    if (d.alvoMesa && !daMesa) { UI().avisoAtencao("Essa Ameaça não está mais ativa no encontro."); d.alvoMesa = ""; ctx.atualizar(["conteudo"], {}); return; }
    var bonus = d.bonus ? [{ fonte: "Bônus", valor: d.bonus, aplicacao: "umDado" }] : [];
    if (daMesa && daMesa.analise) bonus.push({ fonte: "Analisar", valor: daMesa.analise.bonus, aplicacao: "umDado" });
    var prep = K().prepararAtaque(o, {
      regioes: d.regioes, arma: d.arma, semRegioes: d.alvo.zerada, dificuldade: d.alvo.contra,
      alvo: { id: d.alvoMesa || "alvo-avulso", noChao: d.alvo.noChao, alcance: daMesa ? daMesa.casa : 0 },
      mirar: d.mirar ? { regiao: "mirada", capacidade: d.capacidade } : null,
      bonus: bonus,
    });
    if (!prep.ok) { UI().avisoAtencao(prep.erros.join(" ")); return; }
    if (!prep.armaValida && d.arma && prep.motivoSemArma) UI().avisoAtencao("Sem o dano da arma: " + prep.motivoSemArma + ".");
    var rol = K().rolarAtaque(o, prep, FX().rolador);
    janelaDoAtaque(ctx, rol.ataque, d, cx);
  }

  function janelaDoAtaque(ctx, ataque, d, cx) {
    var o = ctx.ficha.oblivio;
    var area = el("div.oblivio-ataque__dados");
    var m;
    function desenharDados() {
      var opc = K().opcoesDoAtaque(o, ataque, []);
      U.trocar(area, [
        el("ol.oblivio-dados", {}, ataque.dados.map(function (dd) {
          var botoes = opc.filter(function (x) { return x.dado === dd.id; }).map(function (x) {
            return el("button.r-botao.r-botao--mini", { type: "button", texto: x.tipo === "comprarSucesso" ? "Comprar (" + x.custo + ")" : "Aumentar Extremo (1)",
              onclick: function () { var r = K().escolherNoAtaque(o, ataque, { tipo: x.tipo, dado: dd.id }, FX().rolador); if (!r.ok) UI().avisoAtencao(r.motivo); desenharDados(); } });
          });
          if (!C().RESULTADOS[dd.resultado].sucesso && !dd.maozinha) botoes.push(el("button.r-botao.r-botao--mini", { type: "button", texto: "Dar uma Mãozinha", onclick: function () {
            var r = K().escolherNoAtaque(o, ataque, { tipo: "darUmaMaozinha", dado: dd.id }, FX().rolador);
            if (r.ok) UI().aviso("1D6 = " + r.maozinha.d6 + (r.maozinha.virou === "sucessoRegular" ? ": virou sucesso." : ": continua falha; Quem Resolve sofre " + r.maozinha.estresseEmQuemResolve + "."));
            desenharDados();
          } }));
          return el("li.oblivio-dado", { class: "oblivio-dado--" + RES_CLASSE[dd.resultado] }, [
            el("span.oblivio-dado__regiao", { texto: C().regiao[dd.regiao].nome + (dd.corte ? " (Corte Relâmpago)" : "") }),
            el("span.oblivio-dado__face", { texto: dd.faces.join(" / ") + (dd.bonus ? " " + (dd.bonus > 0 ? "+" : "") + dd.bonus : "") + " = " + dd.total }),
            el("span.oblivio-dado__res", { texto: C().RESULTADOS[dd.resultado].nome + (dd.comprado ? " (comprado)" : "") + (dd.aumentado ? " +1" : "") + " · " + dd.sucessos + " sucesso(s)" }),
            el("span.faixa", {}, botoes),
          ]);
        })),
        el("p", { texto: "Sucessos: " + ataque.dados.reduce(function (s, x) { return s + x.sucessos; }, 0) + " · Coragem a gastar: " + ataque.custoCoragem }),
        el("div.faixa", {}, opc.filter(function (x) { return !x.dado; }).map(function (x) {
          return el("button.r-botao.r-botao--mini", { type: "button", texto: x.tipo === "empunhadura" ? "Empunhadura: rolar de novo o pior dado" : "Corte Relâmpago (+1 de Estresse)",
            onclick: function () { var r = K().escolherNoAtaque(o, ataque, { tipo: x.tipo }, FX().rolador); if (!r.ok) UI().avisoAtencao(r.motivo); desenharDados(); } });
        })),
      ]);
    }
    if (ataque.semRegioes) { concluir(); return; }
    desenharDados();
    /* Sem "fechar": fugir da janela seria fugir do Estresse das falhas. */
    m = UI().modal({ titulo: "Ataque — resolução pendente", largo: true, exigeDecisao: true, semFechar: true,
      conteudo: [el("p.t-mini", { texto: "Nada foi aplicado ainda. Faça as escolhas que mudam o resultado e conclua." }), area],
      botoes: [{ rotulo: "Concluir ataque", classe: "r-botao--principal", aoClicar: function (fechar) { fechar(); concluir(); } }] });

    function concluir() {
      var r = null;
      FX().operar(ctx, function (b) { r = K().concluirAtaque(b, ataque); return r; }, { silencioso: true });
      if (!r || r.ok === false) return;
      FX().narrar(r.eventos);
      var faces = ataque.dados.map(function (x) { return x.usado; });
      if (faces.length) FX().mostrarRolagem("Ataque — " + r.sucessos + " sucesso(s)", faces, r.sucessos, [], r.extremos > 0);
      resolverAcerto(ctx, ataque, r, d, cx);
    }
  }

  /* O acerto: na mesa, o servidor compara com a Proteção da Ameaça;
     avulso, com a Proteção informada (nada guardado sobre o alvo). */
  function resolverAcerto(ctx, ataque, r, d, cx) {
    var o = ctx.ficha.oblivio;
    var alvoId = d.alvoMesa || "alvo-avulso";
    var primeiro = H().primeiroAcertoNoAlvo(o, alvoId, cx);
    var comp = K().composicaoDoDano(o, ataque, { primeiroAcertoNoAlvo: primeiro, tiroCerteiro: !!d.mirar, usarAbrirFeridas: false });
    var dano = K().rolarDano(comp, FX().rolador);
    var texto = "Dano: " + (comp.expressaoArma ? comp.expressaoArma + " (" + dano.faces.join("+") + (comp.metade ? ", metade: fabricada" : "") + ") + " : "") + comp.somas.map(function (s) { return s.fonte + " " + s.valor; }).join(" + ") + " = " + dano.total;
    if (d.alvoMesa && global.RAMAOblivioMesaDaFicha) {
      global.RAMAOblivioMesaDaFicha.atacarAmeaca(ctx, { alvo: d.alvoMesa, sucessos: r.sucessos, semRegioes: !!ataque.semRegioes, dano: dano.total, corpoACorpo: comp.corpoACorpo, mirar: d.mirar ? { capacidade: d.capacidade } : null }).then(function (res) {
        if (res && res.acerto && res.acerto.acertou) { FX().operar(ctx, function (b) { H().registrarAcerto(b, alvoId, cx); return { ok: true, eventos: [] }; }, { silencioso: true }); UI().avisoOk("Acertou! " + texto); }
        else if (res) UI().aviso("Não acertou: faltam " + (res.acerto && res.acerto.faltam !== undefined ? res.acerto.faltam : "?") + " sucesso(s) para vencer a Proteção.");
      });
      d.regioes = [];
      return;
    }
    var restante = U.inteiro(d.alvo.protecao, 0);
    var acertou = ataque.semRegioes || d.alvo.zerada || (d.mirar ? r.sucessos >= restante + d.capacidade : r.sucessos >= restante);
    if (acertou) {
      FX().operar(ctx, function (b) { H().registrarAcerto(b, alvoId, cx); return { ok: true, eventos: [] }; }, { silencioso: true });
      UI().modal({ titulo: "Acertou", conteudo: [el("p", { texto: r.sucessos + " sucesso(s) contra Proteção " + restante + (d.mirar ? " + " + d.capacidade + " (Mirar)" : "") + "." }), el("p", { texto: texto }),
        el("p.t-mini", { texto: "Avulso: o Estresse no alvo e a Proteção dele (zerada até o início do seu próximo turno) ficam com a mesa." })], botoes: [{ rotulo: "Fechar", classe: "r-botao--principal" }] });
    } else {
      UI().aviso(r.sucessos + " sucesso(s) contra Proteção " + restante + (d.mirar ? " + " + d.capacidade : "") + ": não acertou. A Proteção do alvo cai para " + Math.max(0, restante - r.sucessos) + " (desgaste).");
      d.alvo.protecao = Math.max(0, restante - r.sucessos);
    }
    d.regioes = [];
    ctx.atualizar(["conteudo"], {});
  }

  /* ---------------------------------------------------------------
     INVENTÁRIO
     --------------------------------------------------------------- */

  function abaInventario(ctx) {
    var o = ctx.ficha.oblivio;
    var esp = R().espacosDeInventario(o);
    var pode = ctx.podeEditar();
    var grupos = [["carregado", "Carregados, vestidos e empunhados"], ["guardado", "Guardados"], ["derrubado", "Derrubados ou arremessados"], ["destruido", "Destruídos"]];
    return el("div.oblivio-aba.pilha", {}, [
      UI().painel("Espaços", [
        el("p", { role: "status", class: esp.usados > esp.total ? "oblivio-criar__contador--falta" : "", texto: esp.usados + " de " + esp.total + " espaços guardados (" + esp.partes.map(function (p) { return p.fonte + " " + p.valor; }).join(" + ") + "). Carregados não ocupam espaço; um por região." }),
        el("p.t-mini", { texto: "Moedas: " + o.inventario.moedas }),
        pode ? el("div.faixa", {}, [botaoAdicionar(ctx), el("button.r-botao.r-botao--mini", { type: "button", texto: "Fabricar", onclick: function () { abrirFabricar(ctx); } })]) : null,
      ]),
    ].concat(grupos.map(function (g) {
      var itens = o.inventario.itens.filter(function (i) { return g[0] === "derrubado" ? (i.estado === "derrubado" || i.estado === "arremessado") : i.estado === g[0]; });
      if (!itens.length) return null;
      return UI().painel(g[1], [el("ul.oblivio-itens", {}, itens.map(function (i) { return linhaDoItem(ctx, i); }))]);
    })));
  }

  function linhaDoItem(ctx, i) {
    var o = ctx.ficha.oblivio;
    var cat = C().equipamento[i.chave];
    var pode = ctx.podeEditar();
    var dados = [];
    if (cat) {
      if (cat.dano) dados.push("dano " + cat.dano.toUpperCase());
      if (cat.alcance) dados.push(R().alcanceDoItem(i).chave);
      if (cat.bonusProtecao) dados.push("+" + (cat.bonusProtecao + R().contarMod(i, "reforco")) + " Proteção");
      if (cat.limiteEstresse) dados.push("Estresse " + i.estresse + "/" + R().limiteDoItem(i));
      if (i.usos !== null && i.usos !== undefined) dados.push(i.usos + " uso(s)");
      if (cat.recargaApos) dados.push("ataques " + i.ataques + "/" + cat.recargaApos);
      dados.push(R().espacosDoItem(i) + " esp.");
    }
    if (i.qtd > 1) dados.push("×" + i.qtd);
    if (i.fabricado && i.fabricado.metade) dados.push("fabricado (metade)");
    if (i.corrompido) dados.push("Corrompido");
    var acoes = [];
    if (pode && i.estado !== "destruido") {
      if (i.estado !== "carregado") acoes.push(selecaoDeRegiao(ctx, i));
      if (i.estado === "carregado") acoes.push(btn("Guardar", function () { FX().operar(ctx, function (b) { return R().guardar(b, i.id); }); }));
      if (i.estado === "carregado") acoes.push(btn("Derrubar", function () { FX().operar(ctx, function (b) { return R().derrubar(b, i.id, "largado"); }); }));
      if (i.estado === "derrubado" || i.estado === "arremessado") acoes.push(btn("Pegar e guardar", function () { FX().operar(ctx, function (b) { return R().guardar(b, i.id); }); }));
      if (cat && cat.tipo === "consumivel" && cat.classe !== "recurso" && cat.chave !== "municao") acoes.push(btn("Usar", function () { usarConsumivel(ctx, i); }));
      if (cat && cat.disparo && i.estado === "carregado") acoes.push(btn("Recarregar", function () {
        var mun = o.inventario.itens.filter(function (x) { return x.chave === "municao" && x.usos > 0; })[0];
        if (!mun) { UI().avisoAtencao("Sem Munição."); return; }
        FX().operar(ctx, function (b) { var r = K().recarregar(b, i.id, mun.id); if (r.ok) UI().aviso("Recarregado com " + (r.acao === "regular" ? "uma Ação Regular." : "uma Ação Extra ou de Movimento (Suporte de Carregador).")); return r; });
      }));
      if (cat && cat.classe === "escudo" && i.estado === "carregado") acoes.push(btn(i.prontidao && i.prontidao.ativa ? "Encerrar Prontidão" : "Prontidão (Ação Regular)", function () {
        FX().operar(ctx, function (b) { var it = b.inventario.itens.filter(function (x) { return x.id === i.id; })[0]; it.prontidao = it.prontidao && it.prontidao.ativa ? null : { ativa: true }; return { ok: true, eventos: [] }; });
      }));
      if (cat && cat.especial === "arremesso" && i.estado === "carregado") acoes.push(btn("Arremessar", function () { FX().operar(ctx, function (b) { var it = b.inventario.itens.filter(function (x) { return x.id === i.id; })[0]; it.estado = "arremessado"; it.regiao = null; return { ok: true, eventos: [] }; }); }));
      if (cat && cat.limiteEstresse && i.estresse > 0) acoes.push(btn("Reparar (Kit de Reparos)", function () { repararCom(ctx, i); }));
      if (cat) acoes.push(btn("Modificar", function () { abrirModificar(ctx, i); }));
    }
    if (pode) acoes.push(btn("Remover", function () {
      UI().confirmar({ titulo: "Remover " + i.nome + "?", texto: "O equipamento sai da ficha.", rotuloConfirmar: "Remover", perigo: true }).then(function (s) {
        if (s) FX().operar(ctx, function (b) { b.inventario.itens = b.inventario.itens.filter(function (x) { return x.id !== i.id; }); return { ok: true, eventos: [] }; });
      });
    }));
    return el("li.oblivio-item", { dataset: { estado: i.estado } }, [
      el("div.oblivio-item__topo", {}, [el("span.oblivio-item__nome", { texto: i.nome }), i.regiao ? el("span.r-etiqueta", { texto: C().regiao[i.regiao].nome }) : null]),
      el("p.t-mini", { texto: dados.join(" · ") }),
      i.modificacoes.length ? el("p.t-mini", { texto: "Modificações: " + i.modificacoes.map(function (m) { return C().modificacao[m.chave].nome + (m.param && m.param.conhecimento ? " (" + C().conhecimento[m.param.conhecimento].nome + ")" : ""); }).join(", ") }) : null,
      cat ? el("p.t-mini", { texto: cat.resumo }) : null,
      el("div.faixa", {}, acoes),
    ]);
  }

  function btn(rotulo, fn) { return el("button.r-botao.r-botao--mini", { type: "button", texto: rotulo, onclick: fn }); }

  function selecaoDeRegiao(ctx, i) {
    var o = ctx.ficha.oblivio;
    var sel = el("select.r-selecao.oblivio-item__regiao", { "aria-label": "Carregar " + i.nome + " em", onchange: function () {
      var v = sel.value; if (!v) return;
      FX().operar(ctx, function (b) { return R().equipar(b, i.id, v); });
    } }, [el("option", { value: "", texto: "Carregar em…" })].concat(R().regioesPresentes(o).map(function (r) { return el("option", { value: r.chave, texto: C().regiao[r.chave].nome + (R().esgotada(r) ? " (esgotada)" : "") }); })));
    return sel;
  }

  function botaoAdicionar(ctx) {
    return btn("Adicionar do catálogo", function () {
      var sel = UI().campo({ rotulo: "Equipamento", tipo: "selecao", opcoes: C().EQUIPAMENTOS.map(function (e) { return { valor: e.chave, rotulo: e.nome + " (" + e.espacos + " esp.)" }; }) });
      var qtd = UI().campo({ rotulo: "Quantidade", tipo: "numero", valor: 1 });
      var corrompido = el("label.r-marca", {}, [el("input", { type: "checkbox" }), el("span", { texto: "Equipamento Corrompido (a mesa define — o livro não dá regras próprias)" })]);
      UI().modal({ titulo: "Adicionar equipamento", conteudo: [sel, qtd, corrompido], botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Adicionar", classe: "r-botao--principal", aoClicar: function (fechar) {
        fechar();
        var n = U.limitar(U.inteiro(qtd.entrada.value, 1), 1, 20);
        FX().operar(ctx, function (b) {
          var cat = C().equipamento[sel.entrada.value];
          if (cat && cat.classe === "recurso") return R().adicionarItem(b, cat.chave, { qtd: n, corrompido: corrompido.querySelector("input").checked });
          var ev = [];
          for (var k = 0; k < n; k++) ev = ev.concat(R().adicionarItem(b, sel.entrada.value, { corrompido: corrompido.querySelector("input").checked }).eventos);
          return { ok: true, eventos: ev };
        });
      } }] });
    });
  }

  function usarConsumivel(ctx, i) {
    var o = ctx.ficha.oblivio;
    var cx = FX().contextoDeJogo(ctx);
    var k = i.chave;
    if (k === "racao") { FX().operar(ctx, function (b) { return R().comerRacao(b, i.id); }); return; }
    if (k === "estimulante") { FX().operar(ctx, function (b) { var c = R().consumir(b, i.id, 1); return c.ok ? { ok: true, eventos: c.eventos.concat(R().ganharCoragem(b, 1, "Estimulante").eventos) } : c; }); return; }
    if (k === "kitPrimeirosSocorros") {
      var botoes = [{ rotulo: "Curar 5 (temporário, até a próxima cena)", aoClicar: function (fechar) { fechar(); FX().operar(ctx, function (b) { var c = R().consumir(b, i.id, 1); return c.ok ? { ok: true, eventos: c.eventos.concat(R().recuperarEstresse(b, R().temMod(i, "efetividade") ? 10 : 5, { fonte: "kitPrimeirosSocorros", temporaria: true, ctx: cx }).eventos) } : c; }); } }];
      ["botandoParaFora", "ferida"].forEach(function (mz) {
        if (R().temMazela(o, mz)) botoes.push({ rotulo: "Tratar " + C().mazela[mz].nome, aoClicar: function (fechar) { fechar(); FX().operar(ctx, function (b) { var c = R().consumir(b, i.id, 1); return c.ok ? { ok: true, eventos: c.eventos.concat(R().removerMazela(b, mz, "kitPrimeirosSocorros").eventos) } : c; }); } });
      });
      UI().modal({ titulo: "Kit de Primeiros Socorros", conteudo: [el("p", { texto: i.usos + " uso(s). Ação Regular." })], botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }].concat(botoes.map(function (b) { return Object.assign({ classe: "r-botao--principal" }, b); })) });
      return;
    }
    if (k === "kitDeReparos") { repararCom(ctx, null, i); return; }
    if (k === "fogueira") { descansar(ctx); return; }
    var cat = C().equipamento[k];
    FX().operar(ctx, function (b) { return R().consumir(b, i.id, 1); });
    if (cat && cat.dano) {
      var comp = R().rolarExpressao(cat.dano, FX().rolador);
      UI().modal({ titulo: cat.nome, conteudo: [el("p", { texto: cat.resumo }), el("p", { texto: "Dano rolado: " + comp.total + " (" + comp.faces.join("+") + "). A disputa de Reflexos com o alvo é da mesa." })], botoes: [{ rotulo: "Fechar", classe: "r-botao--principal" }] });
    } else if (cat) UI().aviso(cat.nome + ": " + cat.resumo);
  }

  /* Kit de Reparos: 5 (10 com Efetividade) num Durável ou Prótese,
     podendo dividir — ou, gastando todos os usos, −1 Falha Extrema de
     uma prótese. */
  function repararCom(ctx, item, kitDado) {
    var o = ctx.ficha.oblivio;
    var kit = kitDado || o.inventario.itens.filter(function (x) { return x.chave === "kitDeReparos" && x.usos > 0; })[0];
    if (!kit) { UI().avisoAtencao("Sem Kit de Reparos."); return; }
    var valor = R().temMod(kit, "efetividade") ? 10 : 5;
    var alvos = o.inventario.itens.filter(function (x) { return x.estresse > 0 && x.estado !== "destruido"; });
    var proteses = R().regioesPresentes(o).filter(function (r) { return r.estado === "protese"; });
    var opcoes = (item ? [item] : alvos).map(function (x) { return { rotulo: "Reparar " + x.nome + " (" + x.estresse + ")", aoClicar: function (f) { f(); FX().operar(ctx, function (b) { var c = R().consumir(b, kit.id, 1); return c.ok ? { ok: true, eventos: c.eventos.concat(R().repararItem(b, x.id, valor).eventos) } : c; }); } }; });
    proteses.forEach(function (r) {
      if (r.estresse > 0) opcoes.push({ rotulo: "Reparar a prótese (" + C().regiao[r.chave].nome + ")", aoClicar: function (f) { f(); FX().operar(ctx, function (b) { var c = R().consumir(b, kit.id, 1); return c.ok ? { ok: true, eventos: c.eventos.concat(R().recuperarEstresse(b, valor, { fonte: "kitDeReparos", distribuicao: (function () { var d = {}; d[r.chave] = valor; return d; })() }).eventos) } : c; }); } });
      if (r.falhasExtremas > 0 && kit.usos >= 5) opcoes.push({ rotulo: "Gastar o kit todo: −1 Falha Extrema da prótese (" + C().regiao[r.chave].nome + ")", aoClicar: function (f) { f(); FX().operar(ctx, function (b) { var c = R().consumir(b, kit.id, kit.usos); if (!c.ok) return c; R().regiao(b, r.chave).falhasExtremas--; return { ok: true, eventos: c.eventos }; }); } });
    });
    if (!opcoes.length) { UI().aviso("Nada para reparar."); return; }
    UI().modal({ titulo: "Kit de Reparos (" + kit.usos + " usos)", conteudo: [el("p.t-mini", { texto: "Recupera " + valor + " de Estresse de um Durável ou Prótese (Ação Regular)." })],
      botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }].concat(opcoes.map(function (x) { return Object.assign({ classe: "r-botao--principal" }, x); })) });
  }

  function abrirModificar(ctx, i) {
    var aceitas = C().MODIFICACOES.filter(function (m) { return R().aceitaModificacao(i, m.chave).ok; });
    if (!aceitas.length) { UI().aviso("Nenhuma modificação cabe em " + i.nome + " agora (limite ou tipo)."); return; }
    var sel = UI().campo({ rotulo: "Modificação", tipo: "selecao", opcoes: aceitas.map(function (m) { return { valor: m.chave, rotulo: m.nome + " — " + m.resumo }; }) });
    var con = UI().campo({ rotulo: "Conhecimento (Versátil)", tipo: "selecao", opcoes: C().CONHECIMENTOS.map(function (c) { return { valor: c.chave, rotulo: c.nome }; }) });
    UI().modal({ titulo: "Modificar " + i.nome, conteudo: [sel, con, el("p.t-mini", { texto: "Cada modificação ocupa +1 espaço enquanto o item estiver guardado (p. 77). Encontrada ou comprada; para fabricar, use Fabricar." })],
      botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Aplicar", classe: "r-botao--principal", aoClicar: function (fechar) {
        fechar(); FX().operar(ctx, function (b) { return R().aplicarModificacao(b, i.id, sel.entrada.value, sel.entrada.value === "versatil" ? { conhecimento: con.entrada.value } : {}); });
      } }] });
  }

  /* Fabricar (p. 88): Ação Completa e teste de Saber; Recursos pelo
     custo; Kit de Reparos opcional evita a metade. */
  function abrirFabricar(ctx) {
    var o = ctx.ficha.oblivio;
    var tipo = UI().campo({ rotulo: "Fabricar", tipo: "selecao", opcoes: [{ valor: "item", rotulo: "Equipamento" }, { valor: "mod", rotulo: "Modificação num equipamento" }] });
    var item = UI().campo({ rotulo: "Equipamento", tipo: "selecao", opcoes: C().EQUIPAMENTOS.filter(function (e) { return !R().custoDeFabricacao({ chave: e.chave }).erro; }).map(function (e) { return { valor: e.chave, rotulo: e.nome + " — " + R().custoDeFabricacao({ chave: e.chave }).recursos + " Recurso(s)" }; }) });
    var alvo = UI().campo({ rotulo: "Modificar qual", tipo: "selecao", opcoes: o.inventario.itens.filter(function (x) { return x.estado !== "destruido"; }).map(function (x) { return { valor: x.id, rotulo: x.nome }; }) });
    var mod = UI().campo({ rotulo: "Modificação (2 Recursos)", tipo: "selecao", opcoes: C().MODIFICACOES.map(function (m) { return { valor: m.chave, rotulo: m.nome }; }) });
    var kits = o.inventario.itens.filter(function (x) { return x.chave === "kitDeReparos" && x.usos > 0; });
    var usarKit = kits.length ? el("label.r-marca", {}, [el("input", { type: "checkbox" }), el("span", { texto: "Gastar 1 uso do Kit de Reparos (evita a metade)" })]) : null;
    UI().modal({ titulo: "Fabricar", conteudo: [el("p", { texto: "Recursos: " + R().contarRecursos(o) + ". Teste de Saber (Ação Completa)." }), tipo, item, alvo, mod, usarKit],
      botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Testar Saber e fabricar", classe: "r-botao--principal", aoClicar: function (fechar) {
        fechar();
        abrirTeste(ctx, "saber", { aoTerminar: function (r) {
          var alvoFab = tipo.entrada.value === "mod" ? { modificacao: mod.entrada.value, itemId: alvo.entrada.value } : { chave: item.entrada.value };
          FX().operar(ctx, function (b) { return R().fabricar(b, alvoFab, { sucesso: r.sucesso, kitId: usarKit && usarKit.querySelector("input").checked ? kits[0].id : "" }); });
        } });
      } }] });
  }

  /* ---------------------------------------------------------------
     AÇÕES CHAMADAS DE OUTRAS SEÇÕES
     --------------------------------------------------------------- */

  /* Usar uma habilidade: avulsa, nesta ficha; com alvo em outra ficha da
     campanha, pelo servidor (oblivio_operar) — nunca editando a outra
     ficha daqui. */
  function usarHabilidade(ctx, chave) {
    var mesa = global.RAMAOblivioMesaDaFicha;
    if (mesa && mesa.naCampanha(ctx)) { mesa.usarHabilidade(ctx, chave); return; }
    usarHabilidadeLocal(ctx, chave);
  }

  /* Avulsa (ou sem alvo em outra ficha): nesta ficha, no tempo dela. */
  var SO_EM_OUTRA = ["ataqueEmDupla", "animarOsAnimos", "copiaBarata", "instrucaoDecisiva", "todosPorUm"];
  function usarHabilidadeLocal(ctx, chave) {
    var o = ctx.ficha.oblivio;
    var cx = FX().contextoDeJogo(ctx);
    if (SO_EM_OUTRA.indexOf(chave) >= 0) {
      UI().aviso(C().habilidade[chave].nome + " age em outra Persona: vincule as fichas a uma campanha para a mesa aplicar nas duas.", { tipo: "atencao" });
      return;
    }
    var param = {};
    if (chave === "balsamo") {
      var sel = UI().campo({ rotulo: "Mazela a remover (em si mesma)", tipo: "selecao", opcoes: o.mazelas.map(function (m) { return { valor: m.chave, rotulo: C().mazela[m.chave].nome }; }) });
      UI().modal({ titulo: "Bálsamo", conteudo: [sel, el("p.t-mini", { texto: "Avulsa, só em si mesma. Em outra Persona, use pela campanha." })], botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Usar", classe: "r-botao--principal", aoClicar: function (f) {
        f(); FX().operar(ctx, function (b) { return H().usar("balsamo", { fichas: { eu: b }, quem: "eu", alvos: ["eu"], ctx: cx, param: { mazela: sel.entrada.value } }); });
      } }] });
      return;
    }
    if (chave === "estocada") {
      UI().pedirTexto({ titulo: "Estocada", rotulo: "Casas avançadas", valor: "1", rotuloConfirmar: "Avançar e atacar" }).then(function (v) {
        if (v === null) return;
        var r = H().usar("estocada", { fichas: { eu: o }, quem: "eu", ctx: cx, param: { casas: U.inteiro(v, 0) } });
        if (!r.ok) UI().avisoAtencao(r.motivo); else UI().aviso("Estocada: +" + r.pendente.casasAvancadas + " de dano se acertar; errando, o alvo testa Reflexos ou fica No Chão. Faça o ataque na aba Testes.");
      });
      return;
    }
    if (chave === "pontoFraco") {
      abrirTeste(ctx, "saber", { aoTerminar: function (r) {
        UI().pedirTexto({ titulo: "Ponto Fraco", rotulo: "Você venceu a disputa? Efeito: dano | mazela | protecao (ou deixe em branco se perdeu)", rotuloConfirmar: "Aplicar" }).then(function (ef) {
          if (!ef) return;
          var res = H().usar("pontoFraco", { fichas: { eu: o }, quem: "eu", ctx: cx, rolador: FX().rolador, param: { disputa: "venceu", efeito: ef.trim() } });
          if (!res.ok) { UI().avisoAtencao(res.motivo); return; }
          var e = res.efeitoNoAlvo;
          UI().aviso("Ponto Fraco: " + (e.tipo === "mazela" ? C().mazela[e.mazela].nome + " (1D6 = " + e.d6 + ")" : e.tipo === "protecao" ? "−1 de Proteção até o próximo dano" : "+" + e.valor + " de dano contra o alvo") + ". Aplique no alvo pela mesa.");
          FX().operar(ctx, function () { return { ok: true, eventos: [] }; }, { silencioso: true });
        });
      } });
      return;
    }
    var r = H().usar(chave, { fichas: { eu: o }, quem: "eu", alvos: ["eu"], ctx: Object.assign({}, cx, { momento: "inicioDaRodada" }), rolador: FX().rolador, param: param });
    if (!r.ok) { UI().avisoAtencao(r.motivo); return; }
    FX().operar(ctx, function () { return { ok: true, eventos: r.eventos }; });
    if (r.bonus) UI().aviso(C().habilidade[chave].nome + ": +" + r.bonus.valor + " no próximo teste (some no campo de bônus).");
  }

  function testeDeRemocao(ctx, mazela, conhecimento) {
    abrirTeste(ctx, conhecimento, { recuperarSemReacao: mazela === "semReacao", aoTerminar: function (r) {
      if (!r.sucesso) { UI().aviso("Falhou: " + C().mazela[mazela].nome + " continua."); return; }
      FX().operar(ctx, function (b) { return R().removerMazela(b, mazela, "teste:" + conhecimento); });
    } });
  }

  function testeDeAtaqueCardiaco(ctx, pendenciaId) {
    abrirTeste(ctx, "esforco", { aoTerminar: function (r) {
      FX().operar(ctx, function (b) {
        b.escolhasPendentes = b.escolhasPendentes.filter(function (p) { return p.id !== pendenciaId; });
        if (r.sucesso) return { ok: true, eventos: [] };
        b.morte = { causa: "Ataque Cardíaco", quando: new Date().toISOString() };
        return { ok: true, eventos: [R().evento("morte", { causa: "Ataque Cardíaco" })] };
      });
    } });
  }

  /* Descansar (p. 47, 119): gasta uma Fogueira (Ação Completa). Num
     lugar perigoso, 1D6 (e a vigília) decide o Encontro e a metade. */
  function descansar(ctx) {
    var o = ctx.ficha.oblivio;
    var fog = o.inventario.itens.filter(function (x) { return x.chave === "fogueira" && x.estado !== "destruido"; })[0];
    if (!fog) { UI().avisoAtencao("Sem Fogueira no inventário (p. 69)."); return; }
    var perigoso = el("label.r-marca", {}, [el("input", { type: "checkbox" }), el("span", { texto: "Lugar perigoso (um cômodo de Buraco)" })]);
    var vigilia = UI().campo({ rotulo: "Sucessos de vigília (Extremo = 2)", tipo: "numero", valor: 0 });
    UI().modal({ titulo: "Cena de Descanso", conteudo: [el("p", { texto: "Recupera 5 + Fôlego. Sem ter comido Ração desde o último Descanso: Fome e Carne Fraca." }), perigoso, vigilia],
      botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Acender a Fogueira", classe: "r-botao--principal", aoClicar: function (f) {
        f();
        var p = perigoso.querySelector("input").checked;
        var dp = p ? global.RAMAOblivioMesa.descansoPerigoso(FX().rolador, U.inteiro(vigilia.entrada.value, 0)) : null;
        if (dp) UI().aviso("Descanso perigoso: 1D6 = " + dp.d6 + (dp.encontro ? " — um Encontro! Recupera metade; a Testemunha resolve o encontro." : " — nada acontece."), { tipo: dp.encontro ? "atencao" : "info" });
        var naCampanha = !FX().contextoDeJogo(ctx).avulsa;
        FX().operar(ctx, function (b) {
          var c = R().consumir(b, fog.id, 1);
          if (!c.ok) return c;
          var ini = { eventos: [] };
          /* Avulsa, a cena de Descanso abre aqui; na campanha, quem abre
             a cena é a Testemunha (e o início dela já chegou à ficha). */
          if (!naCampanha) {
            b.contexto.n++; b.contexto.cena = "av-" + b.contexto.n; b.contexto.tipoDeCena = "descanso"; b.contexto.rodada = 0;
            ini = R().inicioDaCena(b, { cena: b.contexto.cena });
          }
          var d = R().descansar(b, { perigoso: dp ? { encontro: dp.encontro } : null });
          return { ok: true, eventos: c.eventos.concat(ini.eventos, d.eventos) };
        });
      } }] });
  }

  global.RAMASecaoOblivioTestes = { aba: abaTestes };
  global.RAMASecaoOblivioInventario = { aba: abaInventario };
  function naMesa(ctx) { return !!(global.RAMAOblivioMesaDaFicha && global.RAMAOblivioMesaDaFicha.naCampanha(ctx)); }

  global.RAMAOblivioJogo = { abrirTeste: abrirTeste, usarHabilidade: usarHabilidade, usarHabilidadeLocal: usarHabilidadeLocal, testeDeRemocao: testeDeRemocao, testeDeAtaqueCardiaco: testeDeAtaqueCardiaco, descansar: descansar, abrirFabricar: abrirFabricar };
})(window);
