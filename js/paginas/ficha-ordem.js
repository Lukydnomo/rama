/* =====================================================================
   R.A.M.A. — ficha de Ordem Paranormal
   =====================================================================
   As seções que só a ficha de Ordem tem: Geral, Perícias, Progressão e
   Regras — e os complementos de Ordem do inventário (carga e
   capacidade) e das habilidades (poderes e habilidades das regras).

   Habilidades, Rituais, Inventário e Anotações são as MESMAS da ficha
   universal. Um ritual é um ritual; duplicar a seção só para trocar o
   cabeçalho seria manter dois códigos iguais e corrigir bug em um só.
   O inventário recebe daqui só o que é de Ordem: espaços, quantidade,
   categoria e a carga.

   ---------------------------------------------------------------------
   CALCULADO, ESCOLHIDO E AJUSTADO SÃO VISUALMENTE DIFERENTES
   ---------------------------------------------------------------------

     valor calculado   tem o símbolo de conta ao lado e abre a
                       composição no clique
     ajuste manual     aparece na composição com o motivo e a marca de
                       ajuste da mesa
     recurso atual     é editável, porque é o que a pessoa gastou

   ---------------------------------------------------------------------
   O QUE ESTA TELA NUNCA FAZ
   ---------------------------------------------------------------------

   Escolher sozinha. Uma pendência aparece com o botão que abre a
   escolha certa, e espera. Uma escolha que deixou de cumprir requisito
   não é apagada: é marcada, com o motivo, e quem joga decide.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var C = global.RAMAOrdemCatalogo;
  var R = global.RAMAOrdemRegras;
  var OP = global.RAMAOrdemOpcionais;
  var E = global.RAMAOrdemProgressao;
  var P = global.RAMAOrdemPoderes;
  var I = global.RAMAOrdemInventario;
  var ES = global.RAMAOrdemEscolhas;
  var D = global.RAMADados;
  var el = U.el;

  function ordemDe(ctx) {
    if (!ctx.ficha.ordem) ctx.ficha.ordem = R.fichaVazia();
    return ctx.ficha.ordem;
  }

  function contextoDe(ctx) {
    return { inventario: ctx.ficha.inventario };
  }

  function rituaisDe(ctx) {
    return (ctx.ficha.rituais && ctx.ficha.rituais.itens) || [];
  }

  function calculo(ctx) {
    return R.calcular(ordemDe(ctx), ctx.ficha.inventario);
  }

  function estadoDe(ctx) {
    return E.estado(ordemDe(ctx), contextoDe(ctx));
  }

  /* =================================================================
     O NÚMERO CALCULADO, COM A CONTA ATRÁS
     ================================================================= */

  function valorCalculado(rotulo, conta, extra) {
    return el("button.calculado", {
      type: "button",
      "aria-label": "Como " + rotulo + " foi calculado",
      title: "Ver a composição",
      onclick: function () { abrirComposicao(rotulo, conta); },
    }, [
      el("span.calculado__rotulo", { texto: rotulo }),
      el("span.calculado__valor", { texto: String(conta.total) }),
      extra ? el("span.calculado__extra", { texto: extra }) : null,
      el("span.calculado__marca", { "aria-hidden": "true", texto: "=" }),
    ]);
  }

  /* Decisões da mesa ou da ficha (ajuste manual, bônus extra) ficam
     marcadas à parte do que as regras produziram. */
  var ORIGENS_MANUAIS = ["ajuste da mesa", "bônus extra", "ajuste da ficha"];

  function linhasDaComposicao(conta) {
    return conta.parcelas.map(function (p) {
      return el("div.composicao__linha", {
        class: ORIGENS_MANUAIS.indexOf(p.origem) >= 0 ? "composicao__linha--manual" : "",
      }, [
        el("span.composicao__rotulo", { texto: p.rotulo }),
        el("span.composicao__origem", { texto: p.origem || "" }),
        el("span.composicao__valor", { texto: U.comSinal(p.valor) }),
      ]);
    });
  }

  /* =================================================================
     DEFESA, BLOQUEIO E ESQUIVA COM BÔNUS EXTRA
     -----------------------------------------------------------------
     O botão mostra o total; a janela mostra a composição e o campo do
     bônus extra daquela estatística. O número e a explicação vêm da mesma
     conta (R.defesa, R.bloqueio, R.esquiva, via R.calcular) e a janela se
     redesenha depois de cada mudança.

     O campo não exige o modo edição: é um ajuste de mesa usado durante a
     sessão. Quem não pode editar a ficha vê o valor, sem o campo.
     ================================================================= */

  var EXPLICACOES = {
    defesa: "",
    bloqueio: "Bloqueio usa o valor de Fortitude — o bônus da perícia, sem rolar os dados — mais o bônus extra de Bloqueio. O bônus em testes de resistência não entra: bloquear não é resistir.",
    esquiva: "Esquiva usa a Defesa final, já com todos os modificadores e o bônus extra de Defesa, mais o valor de Reflexos e o bônus extra de Esquiva. As parcelas da Defesa não são somadas de novo.",
  };

  var NOMES_EXTRA = { defesa: "Defesa", bloqueio: "Bloqueio", esquiva: "Esquiva" };

  function valorComExtra(ctx, o, c, qual) {
    var conta = c[qual];
    return el("button.calculado", {
      type: "button",
      "aria-label": "Como " + NOMES_EXTRA[qual] + " foi calculado: " + conta.total,
      title: "Ver a composição",
      dataset: { estatistica: qual },
      onclick: function () { abrirComposicaoComExtra(ctx, o, qual); },
    }, [
      el("span.calculado__rotulo", { texto: NOMES_EXTRA[qual] }),
      el("span.calculado__valor", { texto: String(conta.total) }),
      R.bonusExtra(o, qual)
        ? el("span.calculado__extra", { texto: "extra " + U.comSinal(R.bonusExtra(o, qual)) })
        : null,
      el("span.calculado__marca", { "aria-hidden": "true", texto: "=" }),
    ]);
  }

  function abrirComposicaoComExtra(ctx, o, qual) {
    var nome = NOMES_EXTRA[qual];
    var corpo = el("div.pilha");

    function pintar(foco) {
      var conta = calculo(ctx)[qual];
      var atual = R.bonusExtra(o, qual);

      U.trocar(corpo, [
        el("p.t-mini", { texto: "De onde vem cada parte deste número." }),
        EXPLICACOES[qual] ? el("p.t-mini", { texto: EXPLICACOES[qual] }) : null,
        el("div.composicao", {}, linhasDaComposicao(conta)),
        el("div.composicao__total", { "aria-live": "polite" }, [
          el("span", { texto: "Total" }),
          el("span", { texto: String(conta.total) }),
        ]),
        (conta.avisos || []).length
          ? el("div.pilha--curta", { class: "pilha" }, conta.avisos.map(function (a) { return el("p.t-mini.t-aviso", { texto: a }); }))
          : null,
        campoDeExtra(atual),
      ]);

      if (foco) {
        var alvo = corpo.querySelector("input.composicao-extra__entrada");
        if (alvo) { alvo.focus(); alvo.select(); }
      }
    }

    function campoDeExtra(atual) {
      var rotulo = "Bônus extra de " + nome;
      if (!ctx.podeEditar()) {
        return el("p.t-mini", { texto: rotulo + ": " + U.comSinal(atual) + " (só leitura)." });
      }

      var id = "extra-" + qual + "-" + U.uuid().slice(0, 6);
      var erro = el("p.t-mini.t-erro", { role: "alert" });
      var entrada = el("input.r-entrada.composicao-extra__entrada", {
        id: id, type: "text", inputmode: "numeric", value: String(atual), maxlength: 4,
      });

      function aplicar() {
        var v = validarExtra(entrada.value);
        if (!v.ok) {
          entrada.setAttribute("aria-invalid", "true");
          erro.textContent = v.mensagem;
          entrada.focus();
          return;
        }
        if (v.valor === atual) { erro.textContent = ""; entrada.removeAttribute("aria-invalid"); return; }
        R.definirBonusExtra(o, qual, v.valor);
        aoMudarOrdem(ctx);
        pintar(true);
      }

      entrada.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter") { ev.preventDefault(); aplicar(); }
      });

      return el("div.composicao-extra", {}, [
        el("label", { for: id, texto: rotulo }),
        el("div.composicao-extra__linha", {}, [
          entrada,
          el("button.r-botao.r-botao--mini", { type: "button", texto: "Aplicar", onclick: aplicar }),
          el("button.r-botao.r-botao--mini.r-botao--fantasma", {
            type: "button", texto: "Zerar", disabled: atual === 0,
            "aria-label": "Zerar o bônus extra de " + nome,
            onclick: function () {
              R.definirBonusExtra(o, qual, 0);
              aoMudarOrdem(ctx);
              pintar(true);
            },
          }),
        ]),
        erro,
        el("p.r-ajuda", {
          texto: "De −" + R.LIMITE_EXTRA + " a +" + R.LIMITE_EXTRA + ". Fica guardado na ficha até alguém mudar ou zerar — não mexe em atributos, equipamentos nem valores-base.",
        }),
      ]);
    }

    pintar(false);

    UI.modal({
      titulo: nome,
      conteudo: corpo,
      botoes: [{ rotulo: "Fechar", classe: "r-botao--principal" }],
    });
  }

  /* Um inteiro de −99 a +99. Vazio ou texto é recusado — nunca vira 0. */
  function validarExtra(texto) {
    var bruto = U.texto(texto).trim().replace("−", "-").replace(/^\+/, "");
    if (!bruto) return { ok: false, mensagem: "Digite um número (0 para nenhum bônus)." };
    if (!/^-?\d+$/.test(bruto)) return { ok: false, mensagem: "Use um número inteiro, como 2 ou -1." };
    var n = parseInt(bruto, 10);
    if (Math.abs(n) > R.LIMITE_EXTRA) return { ok: false, mensagem: "Use um valor entre −" + R.LIMITE_EXTRA + " e +" + R.LIMITE_EXTRA + "." };
    return { ok: true, valor: n };
  }

  function abrirComposicao(rotulo, conta, extra) {
    UI.modal({
      titulo: rotulo,
      conteudo: [
        el("p.t-mini", { texto: "De onde vem cada parte deste número." }),
        el("div.composicao", {}, linhasDaComposicao(conta)),
        el("div.composicao__total", {}, [
          el("span", { texto: "Total" }),
          el("span", { texto: String(conta.total) }),
        ]),
        /* O que NÃO entrou e por quê — uma proteção guardada, por
           exemplo. Não é parcela: não soma nada. */
        (conta.avisos || []).length
          ? el("div.pilha--curta", { class: "pilha" }, conta.avisos.map(function (a) { return el("p.t-mini.t-aviso", { texto: a }); }))
          : null,
        extra || null,
      ],
      botoes: [{ rotulo: "Fechar", classe: "r-botao--principal" }],
    });
  }

  /* =================================================================
     GERAL
     ================================================================= */

  var SecaoGeral = {
    /* O que fica sempre à vista, acima das abas: a foto, os atributos
       que se rolam e os recursos que se gastam. */
    blocoSuperior: function (ctx) {
      var o = ordemDe(ctx);
      var c = calculo(ctx);

      return el("div.ficha-geral", {}, [
        el("div.ficha-identidade", {}, [
          global.RAMASecaoGeral.foto
            ? global.RAMASecaoGeral.foto(ctx)
            : el("div.ficha-foto", {}, [el("div.ficha-foto__vazio", {}, [UI.marca(48)])]),
          identidadeCurta(ctx, o, c),
        ]),
        el("div.pilha--larga", { class: "pilha" }, [
          avisoDePendencias(ctx, c),
          UI.painel("Atributos", painelAtributosCorpo(ctx, o)),
          UI.painel("Recursos", painelRecursosCorpo(ctx, o, c)),
          UI.painel("Defesa e movimento", painelDerivadosCorpo(ctx, o, c)),
        ]),
      ]);
    },

    /* A aba Geral: quem o personagem é nas regras, as proficiências e
       resistências, e os ajustes da mesa. Os poderes ficam na aba
       Habilidades e a carga na aba Inventário, junto do que eles
       descrevem. */
    aba: function (ctx) {
      var o = ordemDe(ctx);
      var c = calculo(ctx);

      return el("div.pilha--larga", { class: "pilha" }, [
        painelIdentidade(ctx, o, c),
        painelResistencias(ctx, o, c),
        UI.painel("Ajustes da mesa", botaoAjuste(ctx, o, true)),
      ]);
    },
  };

  /* Uma faixa curta, acima dos atributos, quando há decisão esperando.
     Leva direto para a aba onde ela se resolve. */
  function avisoDePendencias(ctx, c) {
    var est = c.estado;
    if (!est) return null;
    var n = est.pendencias.length;
    if (!n) return null;
    return el("div.ordem-aviso-pendencias", { role: "status" }, [
      el("span", { texto: n === 1 ? "1 escolha de progressão esperando decisão." : n + " escolhas de progressão esperando decisão." }),
      el("button.r-botao.r-botao--mini", {
        type: "button", texto: "Ver na Progressão",
        onclick: function () { if (ctx.irParaAba) ctx.irParaAba("progressao"); },
      }),
    ]);
  }

  function identidadeCurta(ctx, o, c) {
    var classe = C.classe(o.classe);
    var origem = C.origem(o.origem);

    return el("dl.r-dados.ficha-identidade__dados", {}, [
      el("dt", { texto: "Classe" }), el("dd", { texto: classe ? classe.nome : "—" }),
      el("dt", { texto: "Origem" }), el("dd", { texto: origem ? origem.nome : "—" }),
      el("dt", { texto: c.trilho.separado ? "Nível" : "NEX" }), el("dd", { texto: c.trilho.curto }),
      el("dt", { texto: "Patente" }), el("dd", { texto: c.patente.aplicada ? c.patente.patente.nome : "não aplicada" }),
    ]);
  }

  function painelIdentidade(ctx, o, c) {
    var classe = C.classe(o.classe);
    var origem = C.origem(o.origem);
    var trilha = C.trilha(o.trilha);
    var est = c.estado;

    var linhas = [
      ["Classe", classe ? classe.nome : "—"],
      ["Origem", origem ? origem.nome : "—"],
      ["Trilha", trilha ? trilha.nome : "—"],
      [c.trilho.separado ? "Nível de experiência" : "NEX", c.trilho.rotulo],
    ];

    if (c.trilho.separado) linhas.push(["NEX por exposição", c.exposicao + "%"]);

    if (est && est.afinidade.gatilho) {
      linhas.push(["Afinidade", textoAfinidade(est.afinidade)]);
    }

    if (c.patente.aplicada) {
      linhas.push(["Patente", c.patente.patente.nome]);
      linhas.push(["Limite de crédito", c.patente.credito + (c.patente.creditoElevado ? " (elevado)" : "")]);
    } else {
      linhas.push(["Patente", "Regra de patente desligada"]);
    }

    var poderDaOrigem = origem
      ? el("div.pilha--curta", { class: "pilha" }, [
          el("p.t-secao", { texto: origem.poder }),
          el("p.t-mini", { texto: origem.resumo }),
          ES.etiquetaAutomacao(origem.automacao),
          el("p.criacao-fonte", { texto: C.referencia(origem) }),
        ])
      : null;

    return UI.painel("Identidade", el("div.pilha", {}, [
      el("dl.r-dados", {}, linhas.reduce(function (saida, par) {
        return saida.concat([el("dt", { texto: par[0] }), el("dd", { texto: par[1] })]);
      }, [])),
      poderDaOrigem,
    ]));
  }

  function textoAfinidade(af) {
    if (!af.escolhida) return af.adiada ? "a decidir (adiada)" : "a decidir";
    var nome = af.homebrew ? af.nomeOutro + " (Homebrew)" : ((C.elemento(af.elemento) || {}).nome || af.elemento);
    return nome + (af.ativa ? " — afinidade desenvolvida" : " — conexão; a afinidade vem ao transcender");
  }

  /* =================================================================
     PODERES E HABILIDADES
     -----------------------------------------------------------------
     Tudo o que o personagem já recebeu: as automáticas da classe, os
     poderes da trilha, os escolhidos. Cada um diz de onde veio, se está
     completo e o que o sistema faz com ele. A lista não tem painel
     próprio: entra na aba Habilidades, na mesma lista das habilidades
     criadas à mão.
     ================================================================= */

  function poderesDasRegras(ctx, o, c) {
    var est = c.estado;
    if (!est || !C.classe(o.classe)) {
      return {
        itens: [],
        fim: cartoesSemAquisicao(ctx, o, []),
        aviso: "Escolha uma classe na aba Geral para ver as habilidades das regras.",
        biblioteca: { classe: "", nomes: nomesPersonalizados(o) },
      };
    }

    var aquisicoes = [];

    E.automaticas(o).forEach(function (a) {
      aquisicoes.push({
        id: a.id,
        chave: a.entrada.chave,
        nome: a.entrada.nome,
        estagio: a.estagio,
        resumo: a.entrada.resumo,
        origem: "Automática da classe",
        automacao: a.entrada.automacao,
        referencia: P.referencia(a.entrada),
        situacao: "ok",
        /* As automáticas de classe não têm efeito na conta: são gasto de
           PE e anotação. Não há o que desativar. */
        temEfeitos: false,
      });
    });

    est.adquiridos.forEach(function (a) {
      if (a.tipo === "escolhaPerito") {
        aquisicoes.push({
          id: a.id, chave: a.chave, nome: a.nome, resumo: "As perícias escolhidas para usar com Perito.",
          origem: "Escolha · " + a.rotuloEtapa, automacao: "informacao", situacao: "ok", temEfeitos: false,
          registroId: a.registroId || "", rotuloEtapa: a.rotuloEtapa || "",
        });
        return;
      }
      var e = a.entrada;
      if (!e) {
        var org = a.tipo === "origem" ? C.origem(String(a.chave).replace(/^origem:/, "")) : null;
        aquisicoes.push({
          id: a.id, chave: a.chave, nome: a.nome, resumo: a.resumo || "",
          origem: "Escolha · " + (a.rotuloEtapa || ""), automacao: a.automacao || "informacao",
          referencia: a.fonteRef || "", situacao: "ok",
          temEfeitos: !!(org && org.efeito), efeitosDesativados: !!a.efeitosDesativados,
          registroId: a.registroId || "", rotuloEtapa: a.rotuloEtapa || "",
        });
        return;
      }
      aquisicoes.push({
        id: a.id,
        chave: e.chave,
        nome: a.nome,
        resumo: e.resumo,
        afinidade: a.afinidade && e.afinidade ? e.afinidade : "",
        origem: rotuloDaVia(a) + (a.rotuloEtapa ? " · " + a.rotuloEtapa : ""),
        automacao: e.automacao,
        nota: e.nota,
        referencia: P.referencia(e, o.classe),
        situacao: !a.valido ? "suspensa" : (a.completo === false ? "incompleta" : "ok"),
        motivos: a.motivos,
        temEfeitos: ((a.afinidade ? e.efeitosAfinidade : e.efeitos) || []).length > 0,
        efeitosDesativados: !!a.efeitosDesativados,
        /* Habilidade de trilha com opção interna (A Favorita) e alteração
           por NEX chegam sozinhas: o registro delas guarda só a opção.
           Desfazê-lo não tiraria a habilidade — então, para excluir,
           elas contam como automáticas. */
        registroId: (a.via === "opcoesBeneficio" || a.via === "alteracao") ? "" : (a.registroId || ""),
        rotuloEtapa: a.rotuloEtapa || "",
      });
    });

    /* Para a ordem "de adição": uma habilidade escolhida entrou quando a
       escolha foi registrada; uma automática não tem data e vem antes. */
    var registradoEm = {};
    (o.escolhas || []).forEach(function (r) { if (r && r.id) registradoEm[r.id] = r.registradoEm || ""; });
    aquisicoes.forEach(function (aq) { aq.adicionadoEm = aq.registroId ? (registradoEm[aq.registroId] || "") : ""; });

    /* A ordem personalizada das habilidades das regras: a guardada em
       `organizacao.habilidades.regras`, e as que ainda não estão lá no
       fim, na ordem da progressão. */
    var ativas = aquisicoes.filter(function (aq) { return !(PZ() && PZ().excluida(o, aq.id)); });
    var guardada = (Organizacao.dados(o).habilidades.regras || []);
    var posicao = {};
    guardada.forEach(function (id, i) { posicao[id] = i; });
    ativas = ativas.map(function (aq, i) { return { aq: aq, i: i }; }).sort(function (a, b) {
      var pa = posicao[a.aq.id] === undefined ? guardada.length + a.i : posicao[a.aq.id];
      var pb = posicao[b.aq.id] === undefined ? guardada.length + b.i : posicao[b.aq.id];
      return pa - pb;
    }).map(function (x) { return x.aq; });
    var ordemAtual = ativas.map(function (aq) { return aq.id; });

    var nomes = [];
    var itens = [];
    ativas.forEach(function (aq) {
      /* Excluída da ficha: não aparece na lista, e o motor já tirou os
         efeitos dela da conta. Fica na seção de excluídas, no fim. */
      var pz = PZ() ? PZ().daAquisicao(o, aq.id) : null;
      nomes.push(aq.nome);
      if (pz) nomes.push(pz.nome);
      itens.push(cartaoDeAquisicao(ctx, o, aq, pz, ordemAtual));
    });

    var idsAtuais = aquisicoes.map(function (aq) { return aq.id; });
    /* O que não é habilidade ativa vai para o FIM da lista, depois das
       criadas à mão: versões sem aquisição e as excluídas. */
    var fim = cartoesSemAquisicao(ctx, o, idsAtuais);
    var secaoExcluidas = cartaoDeExcluidas(ctx, o, idsAtuais);
    if (secaoExcluidas) fim.push(secaoExcluidas);

    return {
      itens: itens,
      fim: fim,
      ordenacao: { modo: Organizacao.modo(ctx, "habilidades"), barra: Organizacao.barra(ctx, "habilidades") },
      biblioteca: { classe: o.classe, nomes: nomes.concat(nomesPersonalizados(o)) },
      aviso: itens.length
        ? "“Entra na conta”: o efeito já está nos números da ficha. “Parte na conta”: uma parte está, o resto é aplicado na cena. “Anotação”: o efeito depende da cena ou de gasto de PE. As que vêm das regras são escolhidas na aba Progressão; no modo edição, o menu de cada uma cria uma versão personalizada só desta ficha."
        : "",
    };
  }

  function PZ() { return global.RAMAOrdemPersonalizacao || null; }

  function nomesPersonalizados(o) {
    return (Array.isArray(o.personalizacoes) ? o.personalizacoes : []).map(function (p) { return p && p.nome; }).filter(Boolean);
  }

  function rotuloDaVia(a) {
    if (a.via === "trilha") return "Trilha";
    if (a.via === "opcoesBeneficio") return "Trilha";
    if (a.via === "poderClasse") return "Poder de classe";
    if (a.via === "versatilidade") return "Versatilidade";
    if (a.via === "transcenderExposicao") return "Transcender";
    if (a.via === "poderOrigem") return "Origem";
    if (a.via === "alteracao") return "Alteração por NEX";
    return "Escolha";
  }

  function rotuloDaAutomacao(automacao) {
    if (automacao === "calculo") return "entra na conta";
    if (automacao === "parcial") return "parte na conta";
    return "anotação";
  }

  /* =================================================================
     VERSÃO PERSONALIZADA DE UMA HABILIDADE OFICIAL
     -----------------------------------------------------------------
     Uma aquisição mostra UMA habilidade: a oficial ou, se a mesa
     personalizou, a versão desta ficha — nunca as duas. A versão é
     apresentação (personalizacao.js); o que entra na conta continua
     vindo do motor de progressão, e só muda se a pessoa desligar os
     efeitos daquela ocorrência explicitamente.
     ================================================================= */

  function cartaoDeAquisicao(ctx, o, aq, pz, ordemAtual) {
    var situacaoExtra = aq.situacao === "suspensa" ? "suspenso" : (aq.situacao === "incompleta" ? "incompleto" : "");
    var nomeOficial = aq.nome + (aq.estagio ? " · " + aq.estagio : "");
    var titulo = pz ? pz.nome : nomeOficial;

    var acoes = null;
    if (ctx.emEdicao() && PZ()) {
      var opcoes = [{
        rotulo: pz ? "Editar versão personalizada" : "Editar",
        aoClicar: function () { editarAquisicao(ctx, o, aq, pz); },
      }];
      if (pz) {
        opcoes.push({ rotulo: "Salvar na minha biblioteca Homebrew", aoClicar: function () { salvarPersonalizadaNaBiblioteca(ctx, o, aq, pz); } });
      }
      if (ordemAtual && Organizacao.modo(ctx, "habilidades") === "personalizada") {
        opcoes.push({ rotulo: "Subir", aoClicar: function () { moverRegra(ctx, o, ordemAtual, aq.id, -1); } });
        opcoes.push({ rotulo: "Descer", aoClicar: function () { moverRegra(ctx, o, ordemAtual, aq.id, 1); } });
      }
      opcoes.push("separador");
      if (pz) {
        opcoes.push({ rotulo: "Restaurar versão oficial", perigo: true, aoClicar: function () { restaurarOficial(ctx, o, aq, pz); } });
      }
      opcoes.push({ rotulo: "Excluir", perigo: true, aoClicar: function () { excluirAquisicao(ctx, o, aq, pz); } });
      acoes = [UI.menu(opcoes, { rotulo: "Opções de " + titulo, icone: "tresPontos" })];
    }

    var avisos = [
      aq.situacao === "suspensa" ? el("p.t-mini.t-erro", { texto: "Efeitos suspensos: " + (aq.motivos || []).join(" ") }) : null,
      aq.situacao === "incompleta" ? el("p.t-mini.t-aviso", { texto: "Incompleto: resolva a opção na aba Progressão. Os efeitos entram depois disso." }) : null,
    ];

    var conteudo;
    if (pz) {
      conteudo = [
        el("p.t-mini", { texto: pz.origem || aq.origem }),
        el("p.habilidade__texto", { class: pz.negrito ? "habilidade__texto--negrito" : "", texto: pz.texto || "Sem descrição." }),
        aq.estagio ? el("p.t-mini", { texto: "Estágio atual pelas regras: " + aq.estagio }) : null,
        el("p.ordem-personalizada", {}, [
          el("span.etiqueta", { texto: "personalizada" }),
          el("span.t-mini", { texto: "Versão desta ficha, baseada em " + aq.nome + " (" + aq.origem + "). O catálogo oficial não mudou." }),
        ]),
        linhaDeAutomacao(aq, pz),
      ].concat(avisos, [
        aq.referencia ? el("p.criacao-fonte", { texto: "Original: " + aq.referencia }) : null,
      ]);
    } else {
      conteudo = [
        el("p.t-mini", { texto: aq.origem }),
        aq.resumo ? el("p", { texto: aq.resumo }) : null,
        aq.afinidade ? el("p.t-mini", { texto: "Com afinidade: " + aq.afinidade }) : null,
        linhaDeAutomacao(aq, null),
        aq.nota ? el("p.t-mini", { texto: aq.nota }) : null,
      ].concat(avisos, [
        aq.referencia ? el("p.criacao-fonte", { texto: aq.referencia }) : null,
      ]);
    }

    var etiqueta = pz ? UI.etiquetaColorida(pz.etiqueta) : null;
    var caixa = UI.recolhivel({
      titulo: titulo,
      subtitulo: etiqueta ? [etiqueta] : null,
      extra: situacaoExtra || (pz ? (pz.origem || aq.origem) : aq.origem),
      classe: "ordem-poder ordem-poder--" + aq.situacao + (pz ? " ordem-poder--personalizada" : ""),
      conteudo: el("div.pilha--curta", { class: "pilha" }, conteudo),
      acoes: acoes,
    });
    caixa.dataset.aquisicao = aq.id;
    caixa.dataset.adicionado = aq.adicionadoEm || "";
    if (pz && pz.cor) {
      caixa.dataset.cor = "sim";
      caixa.style.setProperty("border-left-color", pz.cor);
    }
    return caixa;
  }

  /* O que a ficha faz com a habilidade — sem deixar um texto novo
     parecer uma mecânica nova. */
  function linhaDeAutomacao(aq, pz) {
    if (pz && aq.temEfeitos && aq.efeitosDesativados) {
      return el("p.ordem-automacao", {}, [
        el("span.etiqueta.etiqueta--desligada", { texto: "efeitos desativados" }),
        el("span.t-mini", { texto: "Nesta versão os efeitos automáticos do original não entram na conta." }),
      ]);
    }
    if (pz) {
      return el("p.ordem-automacao", {}, [
        ES.etiquetaAutomacao(aq.automacao),
        el("span.t-mini", {
          texto: aq.temEfeitos
            ? "Automação herdada do original. O texto desta versão não cria nem muda efeitos."
            : "Como o original, sem efeito automático na conta.",
        }),
      ]);
    }
    return ES.etiquetaAutomacao(aq.automacao);
  }

  function textoOficial(aq) {
    return [aq.resumo, aq.afinidade ? "Com afinidade: " + aq.afinidade : ""].filter(Boolean).join("\n\n");
  }

  function editarAquisicao(ctx, o, aq, pz) {
    var desativar = !!(pz && pz.efeitos === "desativados");

    var atual = pz || {
      nome: aq.nome,
      origem: aq.origem,
      texto: textoOficial(aq),
      cor: "",
      negrito: false,
    };

    var aviso = el("p.t-mini.ordem-personalizacao-aviso", {
      texto: pz
        ? "Versão personalizada de " + aq.nome + ", só nesta ficha."
        : "Ao salvar, esta ficha passa a mostrar uma versão personalizada de " + aq.nome + ". O catálogo oficial e as outras fichas não mudam.",
    });

    var automacao;
    if (aq.temEfeitos) {
      automacao = el("div.ordem-personalizacao-automacao", {}, [
        el("p.t-mini", {
          texto: "Automação herdada do original: " + rotuloDaAutomacao(aq.automacao) +
            ". Mudar nome, texto, cor ou etiqueta não muda o que entra na conta, e um texto novo não cria efeito novo.",
        }),
        el("label.r-marca", {}, [
          el("input", {
            type: "checkbox", checked: desativar,
            onchange: function (ev) { desativar = ev.target.checked; },
          }),
          el("span", { texto: "Desativar os efeitos automáticos desta ocorrência" }),
        ]),
        el("p.r-ajuda", {
          texto: "Tira da conta só o que vem desta aquisição. Bônus de outras fontes e ajustes manuais continuam. A escolha na Progressão não muda.",
        }),
      ]);
    } else {
      automacao = el("p.t-mini.ordem-personalizacao-automacao", {
        texto: "O original não tem efeito automático na conta: é aplicado na hora do jogo. Esta versão também não terá.",
      });
    }

    global.RAMASecaoHabilidades.editorDeHabilidade({
      titulo: pz ? "Editar versão personalizada" : "Personalizar " + aq.nome,
      atual: atual,
      antes: [aviso],
      depois: [automacao],
      rotuloSalvar: "Salvar",
      aoSalvar: function (dados, fechar) {
        var gravada = PZ().salvar(o, aq.id, aq.chave, Object.assign({}, dados, {
          efeitos: aq.temEfeitos && desativar ? "desativados" : "herdados",
        }));
        if (!gravada) { UI.avisoErro("A versão personalizada precisa de um nome."); return; }
        fechar();
        /* Os efeitos podem ter mudado: recalcula e apara os recursos. */
        aoMudarOrdem(ctx);
        UI.avisoOk(pz ? "Versão personalizada atualizada." : gravada.nome + " agora é uma versão personalizada desta ficha.");
      },
    });
  }

  async function restaurarOficial(ctx, o, aq, pz) {
    var certeza = await UI.confirmar({
      titulo: "Restaurar a versão oficial?",
      texto: "O nome, o texto, a cor e a etiqueta personalizados desta ocorrência (" + pz.nome + ") serão substituídos pela versão oficial de " + aq.nome + ".",
      detalhe: "A habilidade volta ao texto ATUAL do catálogo do R.A.M.A. — não a uma cópia de quando foi personalizada — e os efeitos automáticos voltam a valer. A cópia salva na biblioteca, se houver, continua lá.",
      rotuloConfirmar: "Restaurar",
      perigo: true,
    });
    if (!certeza) return;
    PZ().restaurar(o, aq.id);
    aoMudarOrdem(ctx);
    UI.avisoOk(aq.nome + " voltou à versão oficial.");
  }

  async function salvarPersonalizadaNaBiblioteca(ctx, o, aq, pz) {
    var id = await global.RAMASecaoHabilidades.paraBibliotecaPrivada({
      nome: pz.nome, origem: pz.origem, texto: pz.texto, cor: pz.cor, negrito: pz.negrito, etiqueta: pz.etiqueta,
    }, pz.homebrewId);
    if (!id) return;
    if (pz.homebrewId !== id) {
      PZ().marcarHomebrew(o, aq.id, id);
      ctx.alterou();
    }
    UI.avisoOk(pz.nome + " foi guardada na sua biblioteca Homebrew, como privada. A ficha continua com a própria cópia.");
  }

  /* Personalizações cuja aquisição não existe mais: a classe, a trilha
     ou uma escolha mudou. Aparecem, sem conceder nada, para recuperar
     ou excluir — nunca somem sozinhas. */
  function cartoesSemAquisicao(ctx, o, idsAtuais) {
    if (!PZ()) return [];
    return PZ().semAquisicao(o, idsAtuais).map(function (pz) {
      var poder = P.poder(pz.poder);
      var acoes = ctx.emEdicao() ? [UI.menu([
        { rotulo: "Transformar em habilidade comum", aoClicar: function () {
            var comum = PZ().comoHabilidade(pz);
            comum.adicionadoEm = U.agoraISO();
            H().inserir(ctx.ficha.habilidades, comum, null);
            PZ().restaurar(o, pz.aquisicao);
            aoMudarOrdem(ctx);
            UI.avisoOk(pz.nome + " agora é uma habilidade comum da ficha.");
          } },
        "separador",
        { rotulo: "Excluir versão personalizada", perigo: true, aoClicar: async function () {
            var certeza = await UI.confirmar({
              titulo: "Excluir " + pz.nome + "?",
              texto: "A versão personalizada sai da ficha. Ela não tem aquisição correspondente e não concede nenhum efeito.",
              rotuloConfirmar: "Excluir", perigo: true,
            });
            if (!certeza) return;
            PZ().restaurar(o, pz.aquisicao);
            aoMudarOrdem(ctx);
          } },
      ], { rotulo: "Opções de " + pz.nome, icone: "tresPontos" })] : null;

      var etiqueta = UI.etiquetaColorida(pz.etiqueta);
      return UI.recolhivel({
        titulo: pz.nome,
        subtitulo: etiqueta ? [etiqueta] : null,
        extra: "sem aquisição",
        classe: "ordem-poder ordem-poder--orfa",
        conteudo: el("div.pilha--curta", { class: "pilha" }, [
          el("p.t-mini.t-aviso", {
            texto: "A aquisição desta versão personalizada não existe mais na ficha (a classe, a trilha ou uma escolha da progressão mudou). Ela não concede nenhum efeito. Se a mesma aquisição voltar, ela volta a valer.",
          }),
          el("p.habilidade__texto", { class: pz.negrito ? "habilidade__texto--negrito" : "", texto: pz.texto || "Sem descrição." }),
          el("p.criacao-fonte", { texto: "Baseada em " + (poder ? poder.nome : pz.poder || "habilidade oficial") }),
        ]),
        acoes: acoes,
      });
    });
  }

  function H() { return global.RAMAHabilidades; }

  /* =================================================================
     EXCLUIR UMA HABILIDADE OFICIAL
     -----------------------------------------------------------------
     Duas situações, e a tela diz qual antes de fazer:

       escolhida   (tem registro na progressão) — excluir DESFAZ a
                   escolha: a etapa volta a ficar pendente, para escolher
                   de novo, e os efeitos dela saem. É o mesmo "Desfazer"
                   da aba Progressão.
       automática  (classe, trilha) — não há escolha para desfazer. A
                   habilidade sai da lista, os efeitos deixam de entrar
                   na conta, e ela fica em "excluídas", restaurável.
     ================================================================= */

  async function excluirAquisicao(ctx, o, aq, pz) {
    if (aq.registroId) {
      var antes = E.estado(o, contextoDe(ctx));
      var registro = (o.escolhas || []).filter(function (r) { return r.id === aq.registroId; })[0];
      var mesmaEscolha = antes.adquiridos.filter(function (a) { return a.registroId === aq.registroId; });
      var junto = mesmaEscolha.filter(function (a) { return a.id !== aq.id; }).map(function (a) { return a.nome; });

      var copia = JSON.parse(JSON.stringify(o));
      E.remover(copia, aq.registroId);
      var depois = E.estado(copia, contextoDe(ctx));
      var afetados = [];
      Object.keys(depois.avaliacoes).forEach(function (id) {
        var a = antes.avaliacoes[id];
        var d = depois.avaliacoes[id];
        if (a && a.valido && d && !d.valido) {
          var x = (o.escolhas || []).filter(function (e) { return e.id === id; })[0];
          afetados.push(x ? x.nome : "uma escolha");
        }
      });

      var detalhes = [];
      if (junto.length) detalhes.push("Sai junto, por ser a mesma escolha: " + junto.join(", ") + ".");
      if (afetados.length) detalhes.push("Deixam de cumprir requisito (não são apagadas, ficam marcadas): " + afetados.join(", ") + ".");
      if (pz || mesmaEscolha.some(function (a) { return PZ() && PZ().daAquisicao(o, a.id); })) {
        detalhes.push("A versão personalizada desta escolha é apagada junto.");
      }

      var certeza = await UI.confirmar({
        titulo: "Excluir " + (pz ? pz.nome : aq.nome) + "?",
        texto: "Esta habilidade foi escolhida em " + (aq.rotuloEtapa || "uma etapa da progressão") +
          (registro && registro.nome ? " (" + registro.nome + ")" : "") +
          ". Excluir desfaz a escolha: a etapa volta a ficar pendente na aba Progressão, para escolher de novo, e os efeitos dela saem da conta.",
        detalhe: detalhes.join(" ") || "Nenhuma outra escolha é afetada.",
        rotuloConfirmar: "Excluir",
        perigo: true,
      });
      if (!certeza) return;

      E.remover(o, aq.registroId);
      if (PZ()) PZ().esquecerAquisicoes(o, mesmaEscolha.map(function (a) { return a.id; }));
      aoMudarOrdem(ctx);
      UI.avisoOk("Escolha desfeita. A etapa está pendente na aba Progressão.");
      return;
    }

    var ok = await UI.confirmar({
      titulo: "Excluir " + (pz ? pz.nome : aq.nome) + " da ficha?",
      texto: aq.nome + " vem sozinha pelas regras (" + aq.origem + "), então não há escolha para desfazer. Ela sai da lista de habilidades, e os efeitos automáticos dela deixam de entrar na conta.",
      detalhe: "Nada é apagado: ela fica em “Habilidades oficiais excluídas”, no fim da lista, e pode ser restaurada" +
        (pz ? " — com a versão personalizada" : "") + ". Para trocar de classe ou trilha, use as abas Geral e Progressão.",
      rotuloConfirmar: "Excluir",
      perigo: true,
    });
    if (!ok) return;

    PZ().excluir(o, aq.id, aq.chave, aq.nome);
    aoMudarOrdem(ctx);
    UI.avisoOk(aq.nome + " saiu da ficha. Dá para restaurar no fim da lista.");
  }

  function cartaoDeExcluidas(ctx, o, idsAtuais) {
    if (!PZ()) return null;
    var lista = Array.isArray(o.excluidas) ? o.excluidas : [];
    if (!lista.length) return null;
    var existe = {};
    idsAtuais.forEach(function (id) { existe[id] = true; });

    var linhas = lista.map(function (x) {
      var semAquisicao = !existe[x.aquisicao];
      return el("div.ordem-excluida", {}, [
        el("div.ordem-excluida__texto", {}, [
          el("span.t-forte", { texto: x.nome }),
          el("span.t-mini", {
            texto: semAquisicao
              ? "A aquisição não existe mais na ficha; não há o que restaurar."
              : "Excluída da ficha. Os efeitos automáticos não entram na conta.",
          }),
        ]),
        ctx.emEdicao()
          ? el("button.r-botao.r-botao--mini", {
              type: "button",
              texto: semAquisicao ? "Tirar da lista" : "Restaurar",
              "aria-label": (semAquisicao ? "Tirar da lista " : "Restaurar ") + x.nome,
              onclick: function () {
                PZ().reincluir(o, x.aquisicao);
                aoMudarOrdem(ctx);
                if (!semAquisicao) UI.avisoOk(x.nome + " voltou para a ficha.");
              },
            })
          : null,
      ]);
    });

    return UI.recolhivel({
      titulo: "Habilidades oficiais excluídas (" + lista.length + ")",
      extra: ctx.emEdicao() ? "restaurar" : "",
      classe: "ordem-poder ordem-poder--excluidas",
      conteudo: el("div.pilha--curta", { class: "pilha" }, [
        el("p.t-mini", { texto: "Habilidades que chegam sozinhas pelas regras e foram tiradas desta ficha. Nada foi apagado." }),
      ].concat(linhas, [
        ctx.emEdicao() ? null : el("p.t-mini", { texto: "Entre no modo edição para restaurar." }),
      ])),
    });
  }

  function painelResistencias(ctx, o, c) {
    var r = c.resistencias;
    var linhas = [];
    r.dano.forEach(function (d) {
      linhas.push(el("dt", { texto: "Resistência a " + d.rotulo.toLowerCase() }));
      linhas.push(el("dd", {}, [valorCalculado(d.rotulo, d.conta)]));
    });
    if (r.testes.total) {
      linhas.push(el("dt", { texto: "Testes de resistência" }));
      linhas.push(el("dd", {}, [valorCalculado("Testes de resistência", r.testes)]));
    }
    if (r.testesParanormal.total) {
      linhas.push(el("dt", { texto: "Contra efeitos paranormais" }));
      linhas.push(el("dd", {}, [valorCalculado("Resistência paranormal", r.testesParanormal)]));
    }

    return UI.painel("Proficiências e resistências", el("div.pilha", {}, [
      el("dl.r-dados", {}, [
        el("dt", { texto: "Proficiências" }),
        el("dd", { texto: c.proficiencias.map(function (p) { return p.texto; }).join(", ") || "—" }),
      ].concat(linhas)),
      r.testes.total
        ? el("p.t-mini", { texto: "O bônus em testes de resistência vale quando Fortitude, Reflexos ou Vontade são usados para resistir; por isso não entra no bônus geral dessas perícias." })
        : null,
    ]));
  }

  function painelAtributosCorpo(ctx, o) {
    var grade = el("div.ordem-atributos", {}, C.ATRIBUTOS.map(function (a) {
      var efetivo = R.atributo(o, a.chave);
      var base = R.atributoBase(o, a.chave);
      var expressao = efetivo <= 0 ? "-2d20" : efetivo + "d20";
      var composicao = R.composicaoDoAtributo(o, a.chave);
      var alterado = efetivo !== base;

      return el("div.ordem-atributo", {}, [
        el("span.ordem-atributo__sigla", { texto: a.sigla }),
        ctx.emEdicao()
          ? UI.passo({
              valor: base, minimo: 0, maximo: 5, rotulo: a.nome + " (valor da ficha)",
              aoMudar: function (v) {
                o.atributos[a.chave] = v;
                aoMudarOrdem(ctx);
              },
            })
          : el("button.ordem-atributo__valor", {
              type: "button",
              "aria-label": "Rolar " + a.nome + ", " + expressao,
              title: "Rolar " + expressao,
              texto: String(efetivo),
              onclick: function () { rolarAtributo(ctx, a, expressao); },
            }),
        el("span.ordem-atributo__dado", { texto: ctx.emEdicao() && alterado ? "efetivo " + efetivo : expressao }),
        alterado
          ? el("button.ordem-atributo__conta", {
              type: "button", texto: "conta", "aria-label": "Como " + a.nome + " foi calculado",
              onclick: function () { abrirComposicao(a.nome, composicao); },
            })
          : el("span.ordem-atributo__nome", { texto: a.nome }),
      ]);
    }));

    return el("div.pilha", {}, [
      grade,
      el("p.t-mini", {
        texto: ctx.emEdicao()
          ? "Aqui se edita o valor da ficha (criação e ajustes à mão). Aumentos de atributo escolhidos na Progressão somam por cima, e aparecem em “conta”."
          : "Clique no número para rolar.",
      }),
    ]);
  }

  function rolarAtributo(ctx, a, expressao) {
    var r = D.rolar(expressao);
    if (!r.ok) { UI.avisoErro("Expressão de dado inválida para " + a.nome + "."); return; }

    global.RAMARolagens.mostrar({
      tipo: "atributo",
      nome: a.nome,
      expressao: r.expressao,
      rolagens: r.rolagens,
      natural: r.principal,
      total: r.principal,
      parcelas: [],
    }, { nome: a.nome });
  }

  /* Os recursos: o que sobrou. */
  function painelRecursosCorpo(ctx, o, c) {
    var semSanidade = OP && OP.ligada(o, "semSanidade");

    var itens = [
      { chave: "pv", nome: "Pontos de vida", conta: c.pv, atual: c.atual.pv },
      { chave: "pe", nome: "Pontos de esforço", conta: c.pe, atual: c.atual.pe },
    ];

    if (!semSanidade) {
      itens.push({ chave: "san", nome: "Sanidade", conta: c.san, atual: c.atual.san });
    }

    return el("div.pilha", {}, [
      el("div.ordem-recursos", {}, itens.map(function (item) {
        return el("div.ordem-recurso", {}, [
          el("div.ordem-recurso__topo", {}, [
            el("span.ordem-recurso__nome", { texto: item.nome }),
            valorCalculado("Máximo de " + item.nome.toLowerCase(), item.conta),
          ]),
          UI.passo({
            valor: item.atual, minimo: -99, maximo: item.conta.total,
            rotulo: item.nome + " atual",
            aoMudar: function (v) {
              if (!o.recursos) o.recursos = { pv: null, pe: null, san: null };
              o.recursos[item.chave] = v;
              ctx.alterou();
            },
          }),
        ]);
      })),
      semSanidade
        ? el("p.t-mini", { texto: "A Sanidade está escondida pela regra opcional “Jogando sem Sanidade”. O valor continua gravado." })
        : null,
      el("p.t-mini", { texto: "Os máximos são calculados. O número editável é o que sobrou depois do gasto." }),
    ]);
  }

  function painelDerivadosCorpo(ctx, o, c) {
    var carga = c.carga;

    return el("div.pilha", {}, [
      el("div.ordem-derivados", {}, [
        valorComExtra(ctx, o, c, "defesa"),
        valorComExtra(ctx, o, c, "bloqueio"),
        valorComExtra(ctx, o, c, "esquiva"),
        valorCalculado("Deslocamento", c.deslocamento, "metros"),
        valorCalculado("Limite de PE por turno", c.limitePe),
      ]),

      el("div.ordem-carga", {}, [
        el("span.t-rotulo", { texto: "Carga" }),
        el("span", { texto: I.rotuloEspacos(carga.ocupado) + " / " + carga.final + " espaços" }),
        carga.temporario ? el("span.t-mini", { texto: "(" + carga.calculada + " " + U.comSinal(carga.temporario) + " temporário)" }) : null,
        carga.sobrecarregado
          ? el("span.t-erro.t-mini", {
              texto: carga.acimaDoMaximo
                ? "Acima do máximo de " + carga.maximo + " espaços."
                : "Sobrecarregado: −5 Defesa, −5 nas perícias de carga, −3m de deslocamento.",
            })
          : null,
      ]),

      c.rituais.circuloMaximo
        ? el("p.t-mini", {
            texto: "Conjura rituais até o " + c.rituais.circuloMaximo + "º círculo. " +
                   "Pode aprender até " + c.rituais.limitePorIntelecto + " ritual(is) pelo poder Aprender Ritual.",
          })
        : null,
    ]);
  }

  /* =================================================================
     CARGA E CAPACIDADE
     -----------------------------------------------------------------
     "Capacidade calculada + ajuste temporário = capacidade final",
     escrito assim, na tela. O ajuste é um número com sinal que fica
     até alguém mudá-lo ou tirá-lo: nenhuma duração é inventada.
     ================================================================= */

  function painelCarga(ctx, o, c) {
    var carga = c.carga;

    var equacao = el("div.ordem-equacao", { "aria-label": "Composição da capacidade" }, [
      el("span.ordem-equacao__termo", {}, [
        el("span.t-mini", { texto: "Capacidade calculada" }),
        el("button.calculado__valor.ordem-equacao__valor", {
          type: "button", texto: String(carga.calculada), title: "Ver a composição",
          "aria-label": "Capacidade calculada: " + carga.calculada + ". Ver a composição.",
          onclick: function () { abrirComposicao("Capacidade calculada", carga.composicao); },
        }),
      ]),
      el("span.ordem-equacao__sinal", { "aria-hidden": "true", texto: "+" }),
      el("span.ordem-equacao__termo", {}, [
        el("span.t-mini", { texto: "Ajuste temporário" }),
        el("span.ordem-equacao__valor", { texto: U.comSinal(carga.temporario) }),
      ]),
      el("span.ordem-equacao__sinal", { "aria-hidden": "true", texto: "=" }),
      el("span.ordem-equacao__termo", {}, [
        el("span.t-mini", { texto: "Capacidade final" }),
        el("span.ordem-equacao__valor", { texto: String(carga.final) }),
      ]),
    ]);

    var controle = null;
    if (ctx.emEdicao()) {
      var campo = UI.campo({
        rotulo: "Bônus temporário de capacidade (espaços)",
        valor: carga.temporario ? U.comSinal(carga.temporario) : "0",
        limite: 4,
        ajuda: "Com sinal: +5 aumenta, -2 reduz, 0 mantém a calculada. Não mexe na carga dos itens, na Força nem nos limites por categoria.",
        aoMudar: function (v) {
          var r = I.validarAjusteTemporario(v);
          if (!r.ok) { campo.marcarErro(r.mensagem); return; }
          campo.marcarErro("");
          if (!o.temporarios) o.temporarios = { pv: 0, pe: 0, san: 0, defesa: 0, capacidade: 0 };
          o.temporarios.capacidade = r.valor;
          aoMudarOrdem(ctx);
        },
      });
      controle = campo;
    }

    var remover = carga.temporario
      ? el("button.r-botao.r-botao--mini", {
          type: "button", texto: "Remover ajuste temporário",
          onclick: function () {
            o.temporarios.capacidade = 0;
            aoMudarOrdem(ctx);
            UI.aviso("Ajuste temporário removido. A capacidade voltou a " + carga.calculada + ".");
          },
        })
      : null;

    var uso = c.categorias;
    var cats = [0, 1, 2, 3, 4].map(function (n) { return uso.categorias[n]; });

    return UI.painel("Carga e capacidade", el("div.pilha", {}, [
      equacao,
      carga.abaixoDeZero
        ? el("p.t-mini.t-aviso", { texto: "O ajuste temporário levaria a capacidade a " + (carga.calculada + carga.temporario) + ". A capacidade final fica em 0." })
        : null,
      el("div.faixa", {}, [controle, remover]),
      el("dl.r-dados", {}, [
        el("dt", { texto: "Ocupado" }), el("dd", { texto: I.rotuloEspacos(carga.ocupado) + " espaços" }),
        el("dt", { texto: "Sem penalidade até" }), el("dd", { texto: carga.final + " espaços" }),
        el("dt", { texto: "Máximo absoluto" }), el("dd", { texto: carga.maximo + " espaços (o dobro)" }),
      ]),
      carga.sobrecarregado
        ? el("p.t-mini.t-erro", {
            texto: carga.acimaDoMaximo
              ? "Acima do máximo: o personagem não consegue carregar tudo isto (OPRPG p.53)."
              : "Sobrecarregado: −5 Defesa, −5 nas perícias afetadas por carga e −3m de deslocamento (OPRPG p.53).",
          })
        : null,
      el("h4.t-secao", { texto: "Itens por categoria" }),
      el("p.t-mini", {
        texto: uso.aplicada
          ? "Limites da patente. Categoria 0 não tem limite. Cada unidade conta como um item."
          : "Limites definidos pela mesa (a regra de patente está desligada). Cada unidade conta como um item.",
      }),
      el("div.ordem-categorias", {}, cats.map(function (cat) {
        return el("div.ordem-categoria", { class: cat.excedido ? "ordem-categoria--excedida" : "" }, [
          el("span.ordem-categoria__rotulo", { texto: "Cat. " + cat.rotulo }),
          el("span.ordem-categoria__valor", { texto: cat.usados + " / " + (cat.limite === null ? "sem limite" : cat.limite) }),
          cat.excedido ? el("span.t-mini.t-erro", { texto: "acima do limite" }) : null,
        ]);
      })),
      uso.semCategoria.length
        ? el("p.t-mini.t-aviso", { texto: "Sem categoria informada (não contam em nenhum limite): " + uso.semCategoria.map(function (i) { return i.nome; }).join(", ") + "." })
        : null,
      el("p.t-mini", { texto: "Espaços, quantidade e categoria de cada item são editados no próprio item, na lista abaixo." }),
    ]));
  }

  /* =================================================================
     AJUSTE MANUAL
     ================================================================= */

  var ALVOS_DE_AJUSTE = [
    { valor: "pv", rotulo: "Pontos de vida (máximo)" },
    { valor: "pe", rotulo: "Pontos de esforço (máximo)" },
    { valor: "san", rotulo: "Sanidade (máximo)" },
    { valor: "defesa", rotulo: "Defesa" },
    { valor: "deslocamento", rotulo: "Deslocamento" },
    { valor: "limitePe", rotulo: "Limite de PE por turno" },
    { valor: "capacidade", rotulo: "Capacidade de carga (espaços)" },
  ];

  function botaoAjuste(ctx, o, semTitulo) {
    var lista = (o.ajustes || []);

    return el("div.pilha--curta", { class: "pilha" }, [
      semTitulo ? null : el("h4.t-secao", { texto: "Ajustes da mesa" }),
      lista.length
        ? el("div.pilha--curta", { class: "pilha" }, lista.map(function (a) {
            var alvo = ALVOS_DE_AJUSTE.filter(function (x) { return x.valor === a.alvo; })[0];
            return el("div.faixa", {}, [
              el("span.t-mini", {
                texto: (alvo ? alvo.rotulo : a.alvo) + ": " + U.comSinal(a.valor) +
                       (a.motivo ? " — " + a.motivo : ""),
              }),
              ctx.emEdicao()
                ? el("button.r-botao.r-botao--mini.r-botao--fantasma", {
                    type: "button", texto: "Remover",
                    onclick: function () {
                      o.ajustes = o.ajustes.filter(function (x) { return x.id !== a.id; });
                      aoMudarOrdem(ctx);
                    },
                  })
                : null,
            ]);
          }))
        : el("p.t-mini", { texto: "Nenhum ajuste. Os números vêm todos das regras." }),

      ctx.emEdicao()
        ? el("button.r-botao.r-botao--mini", {
            type: "button", texto: "+ Ajuste manual",
            onclick: function () { abrirAjuste(ctx, o); },
          })
        : el("p.t-mini", { texto: "Entre no modo edição para acrescentar um ajuste." }),
    ]);
  }

  function abrirAjuste(ctx, o) {
    var alvo = UI.campo({
      rotulo: "O que ajustar", tipo: "selecao", valor: "defesa",
      opcoes: ALVOS_DE_AJUSTE.map(function (a) { return { valor: a.valor, rotulo: a.rotulo }; }),
    });
    var valor = UI.campo({ rotulo: "Quanto", tipo: "numero", valor: "0", limite: 6 });
    var motivo = UI.campo({
      rotulo: "Motivo", valor: "", limite: 120,
      ajuda: "Por que a mesa decidiu isto. Aparece na composição do número.",
    });

    UI.modal({
      titulo: "Ajuste manual",
      conteudo: el("div.pilha", {}, [
        el("p.t-mini", {
          texto: "Um ajuste sobrevive a qualquer recálculo e aparece marcado como decisão da mesa, " +
                 "separado do que as regras produziram.",
        }),
        alvo, valor, motivo,
      ]),
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        {
          rotulo: "Acrescentar", classe: "r-botao--principal",
          aoClicar: function (fechar) {
            var n = U.inteiro(valor.entrada.value, 0);
            if (!n) { valor.marcarErro("Informe um valor diferente de zero."); return; }
            if (!motivo.entrada.value.trim()) {
              motivo.marcarErro("Escreva o motivo. Um ajuste sem motivo vira mistério na próxima sessão.");
              return;
            }
            o.ajustes.push(R.criarAjuste(alvo.entrada.value, n, motivo.entrada.value.trim()));
            aoMudarOrdem(ctx);
            fechar();
          },
        },
      ],
    });
  }

  /* =================================================================
     PERÍCIAS
     ================================================================= */

  var SecaoPericias = {
    aba: function (ctx) {
      var o = ordemDe(ctx);
      var edicao = ctx.emEdicao();
      var linhas = C.PERICIAS.map(function (p) { return linhaDePericia(ctx, o, p); });

      return el("div.pilha--larga", { class: "pilha" }, [
        UI.painel("Perícias", el("div.pilha", {}, [
          el("div.ordem-pericias", { role: "table", "aria-label": "Perícias", class: edicao ? "ordem-pericias--edicao" : "" }, [
            el("div.ordem-pericia.ordem-pericia--cabecalho", { role: "row" }, [
              el("span", { role: "columnheader", texto: "Perícia" }),
              el("span", { role: "columnheader", texto: "Atributo" }),
              el("span", { role: "columnheader", texto: "Grau" }),
              el("span", { role: "columnheader", texto: "Treino" }),
              el("span", { role: "columnheader", texto: "Extra" }),
              el("span", { role: "columnheader", texto: "Total" }),
              el("span", { role: "columnheader" }, [el("span.so-leitor", { texto: "Rolar" })]),
              el("span", { role: "columnheader", texto: "Notas" }),
            ]),
          ].concat(linhas)),
          el("p.t-mini", {
            texto: "Treino: Destreinado 0 · Treinado +5 · Veterano +10 · Expert +15. Total = treino + extra + outros modificadores (poderes, carga, ajustes da mesa) — toque no total para ver a conta. " +
                   "“Só treinada” exige treinamento para ser usada.",
          }),
          edicao
            ? el("p.t-mini", {
                texto: "No modo edição: o seletor de grau muda o grau da ficha (o da criação) — graus ganhos na progressão somam por cima. Trocar o atributo muda os dados da rolagem, não o grau nem o bônus. O extra é um bônus fixo desta perícia.",
              })
            : null,
        ])),
      ]);
    },
  };

  function linhaDePericia(ctx, o, p) {
    var edicao = ctx.emEdicao();
    var bonus = R.bonusDePericia(o, p.chave, ctx.ficha.inventario);
    var dado = R.dadoDePericia(o, p.chave);
    var g = R.grauDaPericia(o, p.chave);
    var grau = C.grau(g);
    var base = R.grauBaseDaPericia(o, p.chave);
    var fontes = R.fontesDoGrau(o, p.chave);
    var destreinada = g === "destreinado";
    var atributo = R.atributoDaPericia(o, p.chave);
    var padrao = R.atributoPadraoDaPericia(o, p.chave);
    var ajuste = R.ajusteDePericia(o, p.chave);
    var trocado = atributo !== padrao;
    var outros = bonus.total - grau.bonus - ajuste.extra;
    var podeRolar = !(p.treinada && destreinada);

    /* ---- atributo ---- */
    var celulaAtributo;
    if (edicao) {
      celulaAtributo = el("span.ordem-pericia__atrib-edicao", {}, [
        el("select.r-selecao.ordem-pericia__seletor", {
          "aria-label": "Atributo de " + p.nome,
          dataset: { foco: "atrib-" + p.chave },
          onchange: function (ev) {
            R.definirAjusteDePericia(o, p.chave, { atributo: ev.target.value === padrao ? "" : ev.target.value });
            mudouPericia(ctx, "atrib-" + p.chave);
          },
        }, C.ATRIBUTOS.map(function (a) {
          return el("option", {
            value: a.chave, selected: a.chave === atributo,
            texto: a.sigla + (a.chave === padrao ? " (padrão)" : ""),
          });
        })),
        trocado
          ? el("button.r-icone.ordem-pericia__restaurar", {
              type: "button",
              "aria-label": "Restaurar atributo padrão de " + p.nome + " (" + siglaDe(padrao) + ")",
              title: "Restaurar atributo padrão (" + siglaDe(padrao) + ")",
              dataset: { foco: "rest-" + p.chave },
              onclick: function () {
                R.definirAjusteDePericia(o, p.chave, { atributo: "" });
                mudouPericia(ctx, "atrib-" + p.chave);
              },
            }, [el("span", { "aria-hidden": "true", texto: "↺" })])
          : null,
      ]);
    } else {
      celulaAtributo = el("span.ordem-pericia__atrib", {
        class: trocado ? "ordem-pericia__atrib--trocado" : "",
        title: trocado ? "Atributo trocado nesta ficha. Padrão: " + siglaDe(padrao) + "." : (padrao !== p.atributo ? "Atributo trocado por um poder." : ""),
      }, [
        el("span", { texto: siglaDe(atributo) }),
        trocado ? el("span.so-leitor", { texto: " (trocado; padrão " + siglaDe(padrao) + ")" }) : null,
      ]);
    }

    /* ---- grau ---- */
    var celulaGrau = edicao
      ? el("span.ordem-pericia__grau-edicao", {}, [
          el("select.r-selecao.ordem-pericia__seletor", {
            "aria-label": "Grau de " + p.nome + " na ficha",
            dataset: { foco: "grau-" + p.chave },
            onchange: function (ev) {
              if (ev.target.value === "destreinado") delete o.pericias[p.chave];
              else o.pericias[p.chave] = ev.target.value;
              mudouPericia(ctx, "grau-" + p.chave);
            },
          }, C.GRAUS.map(function (x) {
            return el("option", { value: x.chave, selected: x.chave === base, texto: x.nome });
          })),
          fontes.length ? el("span.t-mini", { texto: "efetivo: " + grau.nome }) : null,
        ])
      : el("span.ordem-pericia__grau.grau--" + g, {
          texto: grau.nome,
          title: fontes.length ? fontes.map(function (f) { return f.fonte + " (" + f.detalhe + ")"; }).join("; ") : "",
        });

    /* ---- extra ---- */
    var celulaExtra = edicao
      ? el("input.r-entrada.ordem-pericia__extra-entrada", {
          type: "text", inputmode: "numeric", maxlength: 4, value: String(ajuste.extra),
          "aria-label": "Bônus extra de " + p.nome,
          dataset: { foco: "extra-" + p.chave },
          onkeydown: function (ev) { if (ev.key === "Enter") { ev.preventDefault(); ev.target.blur(); } },
          onchange: function (ev) {
            var v = validarExtra(ev.target.value);
            if (!v.ok) {
              ev.target.setAttribute("aria-invalid", "true");
              UI.avisoErro(p.nome + ": " + v.mensagem);
              ev.target.value = String(ajuste.extra);
              return;
            }
            R.definirAjusteDePericia(o, p.chave, { extra: v.valor });
            mudouPericia(ctx, null);
          },
        })
      : el("span.ordem-pericia__extra", { class: ajuste.extra ? "" : "ordem-pericia__extra--zero", texto: U.comSinal(ajuste.extra) });

    return el("div.ordem-pericia", {
      role: "row",
      class: (destreinada ? "ordem-pericia--destreinada" : ""),
    }, [
      el("span.ordem-pericia__nome", { role: "rowheader", texto: p.nome, title: p.nome }),
      el("span.ordem-pericia__celula.ordem-pericia__c-atrib", { role: "cell", "data-rotulo": "Atributo" }, [celulaAtributo]),
      el("span.ordem-pericia__celula.ordem-pericia__c-grau", { role: "cell", "data-rotulo": "Grau" }, [celulaGrau]),
      el("span.ordem-pericia__celula.ordem-pericia__c-treino", { role: "cell", "data-rotulo": "Treino" }, [
        el("span.ordem-pericia__treino.grau--" + g, { texto: U.comSinal(grau.bonus) }),
      ]),
      el("span.ordem-pericia__celula.ordem-pericia__c-extra", { role: "cell", "data-rotulo": "Extra" }, [celulaExtra]),
      el("span.ordem-pericia__celula.ordem-pericia__c-total", { role: "cell", "data-rotulo": "Total" }, [
        el("button.ordem-pericia__bonus", {
          type: "button",
          "aria-label": "Total de " + p.nome + ": " + U.comSinal(bonus.total) + (outros ? ", inclui outros modificadores" : "") + ". Ver a composição",
          title: "Ver a composição",
          onclick: function () { abrirComposicao("Bônus de " + p.nome, bonus); },
        }, [
          el("span", { texto: U.comSinal(bonus.total) }),
          outros ? el("span.ordem-pericia__outros", { "aria-hidden": "true", texto: "*" }) : null,
        ]),
      ]),
      el("span.ordem-pericia__celula.ordem-pericia__c-rolar", { role: "cell" }, [
        podeRolar
          ? el("button.r-icone.ordem-pericia__rolar", {
              type: "button",
              "aria-label": "Rolar " + p.nome + ", " + dado + " " + U.comSinal(bonus.total),
              title: "Rolar " + dado + " " + U.comSinal(bonus.total),
              onclick: function () { rolarPericia(ctx, o, p, dado, bonus, atributo); },
            }, [UI.simbolo("dado", 18)])
          : el("span.ordem-pericia__travada", {
              texto: "só treinada",
              title: "Esta perícia exige treinamento para ser usada.",
            }),
      ]),
      el("span.ordem-pericia__celula.ordem-pericia__marcas", { role: "cell" }, [p.carga ? el("span.r-etiqueta", { texto: "carga", title: "Sofre a penalidade de carga." }) : null,
        p.kit ? el("span.r-etiqueta", { texto: "kit", title: "Precisa de um kit." }) : null]),
    ]);
  }

  /* Recalcula e devolve o foco ao controle que mudou — redesenhar a aba
     recria os elementos, e quem usa teclado não pode perder o lugar. */
  function mudouPericia(ctx, foco) {
    aoMudarOrdem(ctx);
    if (!foco) return;
    var alvo = document.querySelector('[data-foco="' + foco + '"]');
    if (alvo) alvo.focus();
  }

  /* A rolagem de perícia usa o motor central — o mesmo `dependente` da
     ficha universal — e o mesmo mostrador, que sobe para o histórico. */
  function rolarPericia(ctx, o, p, dado, bonus, atributo) {
    var r = D.dependente({
      expressao: dado,
      sigla: siglaDe(atributo),
      nome: p.nome,
      bonus: bonus.total,
      modificadores: [],
    });

    if (!r || !r.ok) { UI.avisoErro("Expressão de dado inválida para " + p.nome + "."); return; }

    /* As parcelas do bônus aparecem abertas no resultado: grau, poder,
       penalidade de carga — em vez de um "+15" sem explicação. */
    r.parcelas = [r.parcelas[0]].concat(bonus.parcelas.map(function (x) { return { rotulo: x.rotulo, valor: x.valor }; }));
    global.RAMARolagens.mostrar(Object.assign(r, { tipo: "pericia", nome: p.nome }), { nome: p.nome });
  }

  /* =================================================================
     PROGRESSÃO
     ================================================================= */

  var SecaoProgressao = {
    aba: function (ctx) {
      var o = ordemDe(ctx);
      var c = calculo(ctx);
      var est = estadoDe(ctx);

      return el("div.pilha--larga", { class: "pilha" }, [
        painelNivel(ctx, o, c),
        painelPendencias(ctx, o, c, est),
        painelAfinidade(ctx, o, c, est),
        painelEscolhas(ctx, o, c, est),
        painelForaDaProgressao(ctx, o, est),
        painelLegado(ctx, o, est),
        painelDegraus(ctx, o, c),
      ]);
    },

    /* Chamado uma vez depois de abrir a ficha. Se o personagem chegou a
       NEX 50% e ainda não tem afinidade — e ninguém adiou —, a escolha
       abre sozinha. Nunca a cada recálculo, nunca a cada salvamento. */
    verificarAfinidade: function (ctx) {
      var o = ordemDe(ctx);
      var est = estadoDe(ctx);
      if (!est || !est.afinidade.gatilho || est.afinidade.escolhida || est.afinidade.adiada) return false;
      ES.abrirAfinidade({
        ordem: o,
        contexto: contextoDe(ctx),
        aoConfirmar: function () { aoMudarOrdem(ctx); UI.avisoOk("Afinidade registrada."); },
        aoAdiar: function () { aoMudarOrdem(ctx); UI.aviso("Afinidade adiada. Ela fica na aba Progressão até você decidir."); },
        aoFecharSemDecidir: function () {
          if (!o.afinidade) o.afinidade = { elemento: "", nomeOutro: "", adiada: false };
          o.afinidade.adiada = true;
          aoMudarOrdem(ctx);
        },
      });
      return true;
    },
  };

  function painelNivel(ctx, o, c) {
    var separado = c.trilho.separado;
    var campos = [];

    if (separado) {
      campos.push(UI.campo({
        rotulo: "Nível de experiência", tipo: "numero", valor: String(o.nivel), limite: 2,
        ajuda: "Manda na progressão: PV, PE, Sanidade e habilidades de classe.",
        aoMudar: function (v) {
          o.nivel = Math.max(1, Math.min(20, U.inteiro(v, 1)));
          aoMudarOrdem(ctx);
        },
      }));
      campos.push(UI.campo({
        rotulo: "NEX por exposição (%)", tipo: "numero", valor: String(o.nex), limite: 2,
        ajuda: "Mede só a exposição ao Outro Lado. Vale para poderes paranormais e afinidade elemental.",
        aoMudar: function (v) {
          o.nex = R.nexValido(v);
          aoMudarOrdem(ctx);
        },
      }));
    } else {
      campos.push(UI.campo({
        rotulo: "NEX (%)", tipo: "selecao", valor: String(o.nex),
        opcoes: opcoesDeNex(),
        aoMudar: function (v) { o.nex = R.nexValido(v); aoMudarOrdem(ctx); },
      }));
    }

    campos.push(UI.campo({
      rotulo: "Pontos de prestígio", tipo: "numero", valor: String(o.prestigio), limite: 4,
      ajuda: c.patente.aplicada ? "A patente vem daqui. Perder PP rebaixa." : "Guardado. A regra de patente está desligada.",
      aoMudar: function (v) { o.prestigio = Math.max(0, U.inteiro(v, 0)); aoMudarOrdem(ctx); },
    }));

    return UI.painel(separado ? "Nível e exposição" : "Exposição paranormal", el("div.pilha", {}, [
      separado
        ? el("p.t-mini", {
            texto: "A regra “NEX & Experiência” está ligada: nível e NEX andam separados. " +
                   "O nível manda na progressão; o NEX mede o contato com o Outro Lado.",
          })
        : null,
      el("p.t-mini", { texto: "Baixar o NEX não apaga escolha nenhuma: as das etapas acima ficam guardadas, sem efeito, e voltam a valer se o personagem chegar lá de novo." }),
      el("div.editar-grade", {}, campos),
    ]));
  }

  function opcoesDeNex() {
    var lista = [];
    for (var n = C.REGRAS.nexMinimo; n <= 95; n += C.REGRAS.passoNex) {
      lista.push({ valor: String(n), rotulo: n + "%" });
    }
    lista.push({ valor: "99", rotulo: "99%" });
    return lista;
  }

  function resolver(ctx, p) {
    var o = ordemDe(ctx);
    ES.abrir({
      ordem: o,
      contexto: contextoDe(ctx),
      rituais: rituaisDe(ctx),
      vagaId: p.id,
      aoRegistrar: function () { aoMudarOrdem(ctx); UI.avisoOk("Escolha registrada."); },
      aoConfirmar: function () { aoMudarOrdem(ctx); UI.avisoOk("Afinidade registrada."); },
      aoAdiar: function () { aoMudarOrdem(ctx); },
    });
  }

  /* As escolhas em aberto, cada uma com o botão que abre a escolha certa.
     Resolver não exige o modo edição: decidir um poder é jogar, não
     mexer na estrutura da ficha. */
  function painelPendencias(ctx, o, c, est) {
    if (!est) return null;
    var lista = est.pendencias;

    if (!C.classe(o.classe)) {
      return UI.painel("Escolhas pendentes", el("p.t-mini", { texto: "Escolha uma classe para ver a progressão." }));
    }

    if (!lista.length) {
      return UI.painel("Escolhas pendentes",
        el("p.t-mini", { texto: "Nenhuma. Tudo o que " + c.trilho.rotulo + " abre já foi decidido." }));
    }

    return UI.painel("Escolhas pendentes (" + lista.length + ")", el("div.pilha", {}, [
      el("p.t-mini", {
        texto: "O R.A.M.A. não decide isto por você. Cada item abre a escolha certa, mostra só as opções que cabem e explica as que não cabem.",
      }),
      el("div.pilha--curta", { class: "pilha" }, lista.map(function (p) {
        return ES.cartaoDePendencia(p, function () { resolver(ctx, p); });
      })),
    ]));
  }

  function painelAfinidade(ctx, o, c, est) {
    if (!est || !est.afinidade.gatilho) return null;
    var af = est.afinidade;

    var linhas = [
      el("p", { texto: textoAfinidade(af) }),
      el("p.t-mini", {
        texto: c.trilho.separado
          ? "Com NEX & Experiência, a afinidade olha o NEX de exposição, não o nível (Sobrevivendo ao Horror, p. 98)."
          : "A conexão acontece em NEX 50%. A afinidade — e os benefícios dela — vêm na primeira vez que o personagem transcende a partir daí (Ordem Paranormal RPG, p. 110 e 114).",
      }),
    ];
    if (af.homebrew) linhas.push(el("p.t-mini", { texto: "Elemento Homebrew: nenhum efeito mecânico é aplicado automaticamente." }));
    if (af.conflito) linhas.push(el("p.t-mini.t-aviso", { texto: af.conflito }));

    if (af.escolhida && ctx.emEdicao()) {
      linhas.push(el("button.r-botao.r-botao--mini", {
        type: "button", texto: "Revisar afinidade",
        onclick: function () {
          ES.abrirAfinidade({
            ordem: o, contexto: contextoDe(ctx),
            aoConfirmar: function () { aoMudarOrdem(ctx); UI.avisoOk("Afinidade atualizada."); },
          });
        },
      }));
    } else if (af.escolhida) {
      linhas.push(el("p.t-mini", { texto: "Para revisar, entre no modo edição." }));
    }

    return UI.painel("Afinidade elemental", el("div.pilha--curta", { class: "pilha" }, linhas));
  }

  /* As escolhas feitas, na ordem das etapas. No modo edição, cada uma
     pode ser revisada; as que perderam requisito mostram o motivo e
     deixam a mesa manter mesmo assim. */
  function painelEscolhas(ctx, o, c, est) {
    if (!est) return null;
    var vagas = est.vagas;
    var registros = (o.escolhas || []).filter(function (r) {
      var a = est.avaliacoes[r.id];
      return a && a.vaga;
    }).sort(function (a, b) {
      return est.avaliacoes[a.id].vaga.ordem - est.avaliacoes[b.id].vaga.ordem;
    });

    var trilha = C.trilha(o.trilha);
    var vagaTrilha = vagas.filter(function (v) { return v.tipo === "trilha"; })[0];

    var itens = [];

    /* A trilha não é um registro — ela mora em `ordem.trilha` —, mas é
       uma escolha feita, e entra na lista na posição da etapa dela. */
    if (trilha && vagaTrilha) {
      itens.push({ ordem: vagaTrilha.ordem, elemento: linhaDeEscolha({
        etapa: vagaTrilha.rotuloEtapa,
        rotulo: "Trilha",
        descricao: trilha.nome,
        situacao: est.pendencias.some(function (p) { return p.id === vagaTrilha.id; }) ? "invalida" : "ok",
        motivos: (est.pendencias.filter(function (p) { return p.id === vagaTrilha.id; })[0] || {}).motivos || [],
        acoes: ctx.emEdicao() ? [botaoRevisar("Revisar", function () { resolver(ctx, { id: vagaTrilha.id }); }, false, "Trilha, " + vagaTrilha.rotuloEtapa)] : [],
      }) });
    }

    registros.forEach(function (r) {
      var a = est.avaliacoes[r.id];
      var v = a.vaga;
      var situacao = a.mantidaPelaMesa ? "mantida" : (!a.valido ? "invalida" : (!a.completo ? "incompleta" : "ok"));
      var acoes = [];
      var contextoAria = v.rotulo + ", " + v.rotuloEtapa;
      if (ctx.emEdicao()) {
        acoes.push(botaoRevisar("Revisar", function () { resolver(ctx, { id: v.id }); }, false, contextoAria));
        if (situacao === "invalida" && a.completo) {
          acoes.push(botaoRevisar("Manter mesmo assim", function () {
            E.definirIgnorarRequisitos(o, r.id, true);
            aoMudarOrdem(ctx);
            UI.aviso("A escolha vale por decisão da mesa. Os problemas continuam listados.");
          }));
        }
        if (situacao === "mantida") {
          acoes.push(botaoRevisar("Voltar a exigir os requisitos", function () {
            E.definirIgnorarRequisitos(o, r.id, false);
            aoMudarOrdem(ctx);
          }));
        }
        acoes.push(botaoRevisar("Desfazer", function () { desfazer(ctx, o, r, v); }, true, contextoAria));
      }
      itens.push({ ordem: v.ordem, elemento: linhaDeEscolha({
        etapa: v.rotuloEtapa,
        rotulo: v.rotulo,
        descricao: E.descrever(o, r) || r.nome || "—",
        situacao: situacao,
        motivos: a.motivos,
        faltam: a.faltam,
        acoes: acoes,
      }) });
    });

    itens.sort(function (a, b) { return a.ordem - b.ordem; });

    return UI.painel("Escolhas feitas", el("div.pilha", {}, [
      itens.length
        ? el("div.pilha--curta", { class: "pilha" }, itens.map(function (x) { return x.elemento; }))
        : el("p.t-mini", { texto: "Nenhuma escolha registrada ainda." }),
      ctx.emEdicao()
        ? el("p.t-mini", { texto: "Revisar troca só esta escolha: os efeitos dela saem, os da nova entram, e os ajustes da mesa ficam. A tela mostra antes o que muda." })
        : el("p.t-mini", { texto: "Para revisar uma escolha feita, entre no modo edição." }),
    ]));
  }

  function botaoRevisar(rotulo, aoClicar, perigo, contexto) {
    return el("button.r-botao.r-botao--mini", {
      type: "button", texto: rotulo, class: perigo ? "r-botao--fantasma" : "", onclick: aoClicar,
      "aria-label": contexto ? rotulo + ": " + contexto : null,
    });
  }

  function linhaDeEscolha(d) {
    var rotuloSituacao = {
      ok: "", incompleta: "incompleta", invalida: "requisito não cumprido", mantida: "mantida pela mesa",
    }[d.situacao];
    return el("div.ordem-escolha", { dataset: { situacao: d.situacao } }, [
      el("span.ordem-pendencia__nex", { texto: d.etapa }),
      el("div.ordem-pendencia__corpo", {}, [
        el("span.ordem-escolha__rotulo", { texto: d.rotulo + ": " + d.descricao }),
        rotuloSituacao ? el("span.etiqueta", { texto: rotuloSituacao }) : null,
        (d.motivos && d.motivos.length) ? el("span.t-mini" + (d.situacao === "mantida" ? "" : ".t-erro"), { texto: d.motivos.join(" ") }) : null,
        (d.faltam && d.faltam.length) ? el("span.t-mini.t-aviso", { texto: "Falta: " + d.faltam.join("; ") + "." }) : null,
      ]),
      d.acoes && d.acoes.length ? el("div.faixa", {}, d.acoes) : null,
    ]);
  }

  async function desfazer(ctx, o, r, v) {
    var antes = E.estado(o, contextoDe(ctx));
    var copia = JSON.parse(JSON.stringify(o));
    E.remover(copia, r.id);
    var depois = E.estado(copia, contextoDe(ctx));
    var afetados = [];
    Object.keys(depois.avaliacoes).forEach(function (id) {
      var a = antes.avaliacoes[id];
      var d = depois.avaliacoes[id];
      if (a && a.valido && d && !d.valido) {
        var x = (o.escolhas || []).filter(function (e) { return e.id === id; })[0];
        afetados.push(x ? x.nome : "uma escolha");
      }
    });

    var certeza = await UI.confirmar({
      titulo: "Desfazer esta escolha?",
      texto: v.rotulo + " em " + v.rotuloEtapa + " volta a ficar pendente, e só os efeitos dela saem da ficha.",
      detalhe: afetados.length
        ? "Isto faz outras escolhas deixarem de cumprir requisito: " + afetados.join(", ") + ". Elas não são apagadas; ficam marcadas."
        : "Nenhuma outra escolha é afetada.",
      rotuloConfirmar: "Desfazer",
    });
    if (!certeza) return;

    E.remover(o, r.id);
    aoMudarOrdem(ctx);
  }

  /* Escolhas guardadas de etapas que o personagem não alcança mais. */
  function painelForaDaProgressao(ctx, o, est) {
    if (!est || !est.fora.length) return null;
    return UI.painel("Escolhas guardadas fora da progressão atual", el("div.pilha--curta", { class: "pilha" }, [
      el("p.t-mini", { texto: "Nada aqui tem efeito agora. Nada foi apagado." }),
    ].concat(est.fora.map(function (f) {
      return linhaDeEscolha({
        etapa: f.registro.etapa,
        rotulo: f.registro.nome || f.registro.tipo,
        descricao: "",
        situacao: "invalida",
        motivos: f.motivos,
        acoes: ctx.emEdicao() ? [botaoRevisar("Descartar", async function () {
          var ok = await UI.confirmar({
            titulo: "Descartar esta escolha guardada?",
            texto: "Ela sai da ficha de vez. Hoje ela não tem efeito nenhum.",
            rotuloConfirmar: "Descartar",
            perigo: true,
          });
          if (!ok) return;
          E.remover(o, f.registro.id);
          aoMudarOrdem(ctx);
        }, true)] : [],
      });
    }))));
  }

  /* Os registros de texto livre da v2.3. Contam como decisão tomada — a
     pessoa escreveu o que decidiu — e podem ser trocados por uma
     escolha do catálogo quando ela quiser. */
  function painelLegado(ctx, o, est) {
    if (!est || !est.legado.length) return null;
    return UI.painel("Registros escritos à mão", el("div.pilha--curta", { class: "pilha" }, [
      el("p.t-mini", {
        texto: "Anotações de versões anteriores do R.A.M.A., quando o catálogo de poderes ainda não existia. Elas contam como escolha feita, mas não têm efeito na conta. Escolher pelo catálogo substitui a anotação para os cálculos; o texto continua guardado.",
      }),
    ].concat(est.legado.map(function (l) {
      return linhaDeEscolha({
        etapa: "NEX " + l.nex + "%",
        rotulo: l.rotulo,
        descricao: "“" + l.texto + "”",
        situacao: "ok",
        acoes: [botaoRevisar("Escolher pelo catálogo", function () { resolver(ctx, { id: l.id }); })],
      });
    }))));
  }

  function painelDegraus(ctx, o, c) {
    var progressao = C.progressaoDaClasse(o.classe);
    if (!progressao.length) {
      return UI.painel("Progressão", el("p.t-mini", { texto: "Escolha uma classe para ver a progressão." }));
    }

    return UI.painel("Progressão da classe", el("div.pilha", {}, [
      el("div.ordem-degraus", {}, progressao.map(function (degrau) {
        var alcancado = degrau.nex <= c.trilho.nexEquivalente;
        return el("div.ordem-degrau", {
          class: alcancado ? "ordem-degrau--alcancado" : "",
        }, [
          el("span.ordem-degrau__nex", {
            texto: c.trilho.separado ? "Nv " + E.degrauDoNex(degrau.nex) : degrau.nex + "%",
          }),
          el("span.ordem-degrau__texto", { texto: degrau.rotulos.join(" · ") }),
        ]);
      })),
      el("p.t-mini", {
        texto: c.trilho.separado
          ? "Com nível e NEX separados, os degraus são lidos em nível: 1 nível equivale a 5% de NEX."
          : "Os degraus em destaque são os que este NEX já alcançou. As habilidades de trilha chegam sozinhas; só a trilha em si é escolhida.",
      }),
    ]));
  }

  /* =================================================================
     REGRAS
     ================================================================= */

  var SecaoRegras = {
    aba: function (ctx) {
      var o = ordemDe(ctx);

      var afetam = OP.REGRAS.filter(function (r) { return r.afetaFicha; });
      var naoAfetam = OP.REGRAS.filter(function (r) { return !r.afetaFicha; });

      return el("div.pilha--larga", { class: "pilha" }, [
        painelConfiguracao(ctx, o),

        UI.painel("Regras opcionais", el("div.pilha", {}, [
          el("p.t-mini", {
            texto: "Todas do Sobrevivendo ao Horror, e todas começam desligadas — é o que o " +
                   "próprio livro pede. O Livro de Regras continua sendo a versão padrão do jogo.",
          }),
          el("div.pilha--curta", { class: "pilha" }, afetam.map(function (r) {
            return cartaoDeRegra(ctx, o, r);
          })),
        ])),

        UI.painel("Regras de mesa", el("div.pilha", {}, [
          el("p.t-mini", {
            texto: "Estas não mudam campo nem conta da ficha. Ligá-las serve para a mesa " +
                   "registrar que as usa.",
          }),
          el("div.pilha--curta", { class: "pilha" }, naoAfetam.map(function (r) {
            return cartaoDeRegra(ctx, o, r);
          })),
        ])),
      ]);
    },
  };

  /* A chave "Aplicar regras de patente" e, com ela desligada, os
     limites manuais por categoria. */
  function painelConfiguracao(ctx, o) {
    var aplicada = R.regraDePatente(o);
    var pat = R.patente(o);

    var chave = el("button.r-interruptor", {
      type: "button",
      role: "switch",
      "aria-checked": String(aplicada),
      "aria-label": (aplicada ? "Desligar" : "Ligar") + " as regras de patente",
      class: aplicada ? "r-interruptor--ligado" : "",
      onclick: function () { alternarPatente(ctx, o, !aplicada); },
    }, [el("span.r-interruptor__bola", { "aria-hidden": "true" })]);

    var corpo = [
      el("p.t-mini", {
        texto: "Ligada, a patente sai dos pontos de prestígio e controla o limite de crédito e o limite de itens por categoria (Ordem Paranormal RPG, p. 51-53). Desligada, nenhum dos três é calculado: os limites por categoria passam a ser os que a mesa definir.",
      }),
      el("p.t-mini", { texto: "Alternar a chave não apaga item nenhum e não perde os limites manuais, que ficam guardados para a próxima vez." }),
    ];

    var cats = [0, 1, 2, 3, 4];

    if (aplicada) {
      corpo.push(el("dl.r-dados", {}, [
        el("dt", { texto: "Patente" }), el("dd", { texto: pat.patente.nome + " (" + pat.prestigio + " PP)" }),
        el("dt", { texto: "Limite de crédito" }), el("dd", { texto: pat.credito + (pat.creditoElevado ? " (elevado)" : "") }),
        el("dt", { texto: "Itens por categoria" }),
        el("dd", { texto: cats.map(function (n) {
          var l = pat.limites[n].limite;
          return C.CATEGORIAS_ITEM[n].rotulo + ": " + (l === null ? "sem limite" : l);
        }).join(" · ") }),
        el("dt", { texto: "Origem dos limites" }), el("dd", { texto: "Tabela 3.1, " + pat.patente.nome + " — Ordem Paranormal RPG, p. 52" }),
      ]));
    } else {
      var limites = pat.limites;
      if (ctx.emEdicao()) {
        corpo.push(el("div.ordem-limites", {}, cats.map(function (n) {
          return controleDeLimite(ctx, o, n, limites[n].limite);
        })));
        corpo.push(el("p.t-mini", { texto: "“Sem limite” é diferente de 0: 0 quer dizer que nenhum item daquela categoria é permitido." }));
      } else {
        corpo.push(el("dl.r-dados", {}, [
          el("dt", { texto: "Itens por categoria (definidos pela mesa)" }),
          el("dd", { texto: cats.map(function (n) {
            var l = limites[n].limite;
            return C.CATEGORIAS_ITEM[n].rotulo + ": " + (l === null ? "sem limite" : l);
          }).join(" · ") }),
        ]));
        corpo.push(el("p.t-mini", { texto: "Entre no modo edição para mudar os limites." }));
      }
    }

    return UI.painel("Configuração da ficha", el("div.ordem-regra" + (aplicada ? ".ordem-regra--ligada" : ""), {}, [
      el("div.ordem-regra__topo", {}, [
        el("span.ordem-regra__nome", { texto: "Aplicar regras de patente" }),
        chave,
      ]),
      el("div.pilha--curta", { class: "pilha" }, corpo),
    ]));
  }

  function controleDeLimite(ctx, o, n, atual) {
    var rotulo = "Categoria " + C.CATEGORIAS_ITEM[n].rotulo;
    var semLimite = atual === null;
    var campo = UI.campo({
      rotulo: rotulo, tipo: "numero", valor: semLimite ? "" : String(atual), limite: 2,
      desabilitado: semLimite,
      aoMudar: function (v) {
        var r = I.validarLimite(v, false);
        if (!r.ok) { campo.marcarErro(r.mensagem); return; }
        campo.marcarErro("");
        gravarLimite(ctx, o, n, r.valor);
      },
    });
    var marca = el("label.r-marca", {}, [
      el("input", {
        type: "checkbox", checked: semLimite,
        onchange: function (ev) { gravarLimite(ctx, o, n, ev.target.checked ? null : 0); },
      }),
      el("span", { texto: "sem limite" }),
    ]);
    return el("div.ordem-limite", {}, [campo, marca]);
  }

  function gravarLimite(ctx, o, n, valor) {
    if (!o.patente) o.patente = { aplicar: false, limites: null };
    if (!o.patente.limites) o.patente.limites = R.limitesDaTabela(o);
    o.patente.limites[String(n)] = valor;
    aoMudarOrdem(ctx);
  }

  async function alternarPatente(ctx, o, aplicar) {
    var certeza = await UI.confirmar({
      titulo: (aplicar ? "Ligar" : "Desligar") + " as regras de patente?",
      texto: aplicar
        ? "A patente volta a sair dos pontos de prestígio, com o limite de crédito e os limites de itens da Tabela 3.1."
        : "A patente, o limite de crédito e os limites da Tabela 3.1 deixam de ser calculados. Os limites por categoria passam a ser os definidos pela mesa.",
      detalhe: "Nenhum item é apagado. " + (aplicar
        ? "Os limites manuais ficam guardados para quando a regra for desligada de novo."
        : (o.patente && o.patente.limites ? "Os limites manuais guardados antes voltam a valer." : "Os limites manuais começam iguais aos da patente atual.")),
      rotuloConfirmar: aplicar ? "Ligar" : "Desligar",
    });
    if (!certeza) return;
    var r = R.definirRegraDePatente(o, aplicar);
    if (r.aviso) UI.aviso(r.aviso);
    aoMudarOrdem(ctx);
  }

  function cartaoDeRegra(ctx, o, r) {
    var ligada = OP.ligada(o, r.chave);
    var problemas = OP.conflitos(o, r.chave, true);
    var bloqueada = !ligada && problemas.length > 0;

    var chave = el("button.r-interruptor", {
      type: "button",
      role: "switch",
      "aria-checked": String(ligada),
      "aria-label": (ligada ? "Desligar" : "Ligar") + " " + r.nome,
      disabled: bloqueada,
      class: ligada ? "r-interruptor--ligado" : "",
      onclick: function () { alternarRegra(ctx, o, r, !ligada); },
    }, [el("span.r-interruptor__bola", { "aria-hidden": "true" })]);

    var corpo = [
      el("p.t-mini", { texto: r.resumo }),
      el("p.t-mini", { texto: r.efeito }),
      ES.etiquetaAutomacao(r.automacao),
      el("p.criacao-fonte", {
        texto: (r.fonte === "SAH" ? "Sobrevivendo ao Horror" : "Ordem Paranormal RPG") + ", p. " + r.pagina,
      }),
    ];

    if (bloqueada) {
      corpo.push(el("p.t-mini.t-erro", { texto: problemas.map(function (p) { return p.texto; }).join(" ") }));
    }

    if (ligada && r.parametros.length) {
      corpo.push(el("div.editar-grade", {}, r.parametros.map(function (par) {
        return UI.campo({
          rotulo: par.rotulo,
          tipo: "numero",
          valor: String(o[par.chave] !== undefined ? o[par.chave] : ""),
          limite: 3,
          ajuda: par.ajuda,
          aoMudar: function (v) {
            var n = U.inteiro(v, par.minimo);
            o[par.chave] = Math.max(par.minimo, Math.min(par.maximo, n));
            aoMudarOrdem(ctx);
          },
        });
      })));
    }

    return el("div.ordem-regra", { class: ligada ? "ordem-regra--ligada" : "" }, [
      el("div.ordem-regra__topo", {}, [
        el("span.ordem-regra__nome", { texto: r.nome }),
        chave,
      ]),
      el("div.pilha--curta", { class: "pilha" }, corpo),
    ]);
  }

  async function alternarRegra(ctx, o, r, ligar) {
    var consequencias = OP.consequenciasDe(o, r.chave, ligar);

    if (consequencias.length) {
      var certeza = await UI.confirmar({
        titulo: (ligar ? "Ligar" : "Desligar") + " “" + r.nome + "”?",
        texto: consequencias[0],
        detalhe: consequencias.slice(1).join(" "),
        rotuloConfirmar: ligar ? "Ligar" : "Desligar",
      });
      if (!certeza) return;
    }

    var resultado = OP.definir(o, r.chave, ligar);

    if (!resultado.ok) {
      UI.avisoErro((resultado.problemas || []).map(function (p) { return p.texto; }).join(" ") ||
        "Não foi possível mudar esta regra.");
      return;
    }

    if (resultado.aviso) UI.aviso(resultado.aviso);
    aoMudarOrdem(ctx);
  }

  /* =================================================================
     INVENTÁRIO — o complemento de Ordem
     -----------------------------------------------------------------
     A seção de inventário é a universal. Numa ficha de Ordem ela pede a
     este objeto o que é de Ordem: o cabeçalho de carga, os campos de
     espaços, quantidade, categoria e grupo, e as linhas de detalhe.
     ================================================================= */

  function efetivoDe(item, efetivos) {
    var ef = efetivos && efetivos.porId ? efetivos.porId[item.id] : null;
    if (ef) return ef;
    /* Sem o cálculo em mãos (item fora do inventário): os valores-base,
       sem modificador nenhum. */
    var d = I.dadosDoItem(item);
    var e = I.espacosDoItem(item);
    var total = Math.round(e.unitario * d.quantidade * 100) / 100;
    return {
      id: item.id, nome: item.nome, quantidade: d.quantidade,
      espacos: { unitario: e.unitario, unitarioEfetivo: e.unitario, padrao: e.padrao, totalBase: total, total: total, modificado: false, notas: [] },
      categoria: { base: d.categoria, efetiva: d.categoria, reducoes: [] },
    };
  }

  /* Só uma proteção em uso por vez: marcar uma desmarca as outras. O
     valor-base do item (a Defesa cadastrada) nunca é tocado — só o
     estado de uso. */
  function definirProtecaoEmUso(ctx, alvo, usar) {
    (ctx.ficha.inventario.itens || []).forEach(function (i) {
      if (!i || i.tipo !== "armadura") return;
      if (!i.ordem || typeof i.ordem !== "object") i.ordem = I.normalizarDados(i.ordem, i.tipo);
      var deveUsar = usar && i === alvo;
      if (deveUsar) i.ordem.emUso = true;
      else delete i.ordem.emUso;
    });
    aoMudarOrdem(ctx);
  }

  var SecaoInventarioOrdem = {
    /* No lugar do peso, o painel inteiro de carga e capacidade: a conta,
       o ajuste temporário e os itens por categoria, logo acima dos itens
       que eles contam. */
    cabecalho: function (ctx) {
      return painelCarga(ctx, ordemDe(ctx), calculo(ctx));
    },

    /* Mochila é peso; Ordem não usa peso. Uma mochila de verdade em
       Ordem é um item com "aumenta a capacidade". */
    tiposPermitidos: ["item", "arma", "armadura"],

    /* Os valores efetivos de todos os itens, calculados UMA vez por
       desenho do inventário (R.itensEfetivos) e entregues ao cabeçalho e
       aos detalhes de cada cartão. */
    preparar: function (ctx) {
      return R.itensEfetivos(ordemDe(ctx), ctx.ficha.inventario);
    },

    /* Pares [rótulo, valor] para a linha abaixo do nome do item — com os
       valores EFETIVOS, depois das habilidades. A transformação (II → I,
       e de onde vem) fica nos detalhes. */
    resumoDoCartao: function (item, efetivos) {
      var ef = efetivoDe(item, efetivos);
      var pares = [["Categoria", ef.categoria.efetiva === null ? "—" : I.rotuloCategoria(ef.categoria.efetiva)]];
      if (ef.quantidade > 1) {
        /* Com mais de uma unidade, por unidade e total têm nomes
           diferentes: "Espaços" sozinho seria ambíguo. */
        pares.push(["Espaços por unidade", I.rotuloEspacos(ef.espacos.unitarioEfetivo)]);
        pares.push(["Quantidade", String(ef.quantidade)]);
        pares.push(["Ocupa", I.rotuloEspacos(ef.espacos.total)]);
      } else {
        pares.push(["Espaços", I.rotuloEspacos(ef.espacos.total)]);
      }
      return pares;
    },

    detalhes: function (ctx, item, efetivos) {
      var d = I.dadosDoItem(item);
      var ef = efetivoDe(item, efetivos || SecaoInventarioOrdem.preparar(ctx));
      var e = ef.espacos;
      var cat = ef.categoria;
      var fontes = function (lista) {
        return lista.filter(Boolean).filter(function (f, i, todas) { return todas.indexOf(f) === i; }).join(", ");
      };
      var notasEspaco = e.notas.join("; ");

      var linhas = [
        ["Espaços por unidade", I.rotuloEspacos(e.unitario) + (e.padrao ? " (padrão do livro)" : "") +
          (e.unitarioEfetivo !== e.unitario ? " → " + I.rotuloEspacos(e.unitarioEfetivo) : "")],
        ["Quantidade", String(ef.quantidade)],
        ["Ocupa no total", (e.total !== e.totalBase
          ? I.rotuloEspacos(e.totalBase) + " → " + I.rotuloEspacos(e.total)
          : I.rotuloEspacos(e.total)) + (notasEspaco ? " — " + notasEspaco : "")],
        ["Categoria", cat.base === null ? "Não informada" : I.rotuloCategoria(cat.base) +
          (cat.efetiva !== cat.base
            ? " → " + I.rotuloCategoria(cat.efetiva) + " — " + fontes(cat.reducoes.map(function (r) { return r.fonte; }))
            : "")],
        ["Grupo", (I.GRUPOS.filter(function (g) { return g.valor === d.grupo; })[0] || {}).rotulo || d.grupo],
      ];
      if (d.capacidade) linhas.push(["Aumenta a capacidade", "+" + d.capacidade + " espaços"]);
      if (item.tipo === "armadura") {
        var uso = R.protecaoEmUso(ctx.ficha.inventario);
        linhas.push(["Uso", uso.item === item
          ? "Em uso — soma " + U.comSinal(uso.defesa) + " na Defesa"
          : (d.emUso ? "Marcada em uso, mas outra proteção de Defesa maior vale" : "Guardada — não soma na Defesa")]);
      }
      return linhas;
    },

    /* A faixa que fica à vista com o cartão fechado: numa proteção, o
       estado de uso e o botão que troca. Usar uma tira as outras de uso. */
    faixaDoItem: function (ctx, item) {
      if (item.tipo !== "armadura") return null;
      var uso = R.protecaoEmUso(ctx.ficha.inventario);
      var emUso = uso.item === item;
      return el("div.item__acoes.item__acoes--fora.item-uso", {}, [
        el("span.t-mini.item-uso__estado", {
          texto: emUso ? "Em uso: soma " + U.comSinal(uso.defesa) + " na Defesa." : "Guardada: não soma na Defesa.",
        }),
        el("button.r-botao.r-botao--mini", {
          type: "button",
          class: emUso ? "r-botao--principal" : "",
          "aria-pressed": String(emUso),
          "aria-label": (emUso ? "Tirar de uso " : "Usar ") + item.nome,
          texto: emUso ? "Em uso" : "Usar",
          onclick: function () { definirProtecaoEmUso(ctx, item, !emUso); },
        }),
      ]);
    },

    campos: function (ctx, atual) {
      var d = I.dadosDoItem(atual);

      var espacos = UI.campo({
        rotulo: "Espaços por unidade", valor: d.espacos === null ? "" : String(d.espacos).replace(".", ","), limite: 8,
        dica: String(I.espacosPadrao(atual.tipo)),
        ajuda: "Vazio usa o padrão do livro: 1 espaço. Duas mãos e proteção leve: 2. Proteção pesada: 5. Aceita qualquer número, como 0,5 ou 0,1.",
      });
      var quantidade = UI.campo({
        rotulo: "Quantidade", valor: String(d.quantidade), limite: 3,
        ajuda: "Unidades deste item. Cada unidade conta contra o limite da categoria.",
      });
      var categoria = UI.campo({
        rotulo: "Categoria (0 a IV)", tipo: "selecao", valor: d.categoria === null ? "" : String(d.categoria),
        opcoes: [{ valor: "", rotulo: "Não informada" }].concat(C.CATEGORIAS_ITEM.map(function (c) {
          return { valor: String(c.valor), rotulo: "Categoria " + c.rotulo };
        })),
        ajuda: "A categoria do livro, antes de qualquer redução por habilidade.",
      });
      var grupo = UI.campo({
        rotulo: "Grupo", tipo: "selecao", valor: d.grupo,
        opcoes: I.GRUPOS.map(function (g) { return { valor: g.valor, rotulo: g.rotulo }; }),
        ajuda: "Usado por habilidades como Remendão (equipamento geral) e Ferramentas Paranormais (item paranormal).",
      });
      var capacidade = UI.campo({
        rotulo: "Aumenta a capacidade em (espaços)", valor: String(d.capacidade || 0), limite: 2,
        ajuda: "Para itens como a Mochila Militar (+2). Conta uma vez por item.",
      });

      return {
        elementos: [
          el("h4.t-secao", { texto: "Ordem Paranormal" }),
          el("div.editar-grade", {}, [espacos, quantidade]),
          el("div.editar-grade", {}, [categoria, grupo]),
          capacidade,
        ],
        coletar: function () {
          var ok = true;
          var rE = I.validarEspacos(espacos.entrada.value);
          espacos.marcarErro(rE.ok ? "" : rE.mensagem); if (!rE.ok) ok = false;
          var rQ = I.validarQuantidade(quantidade.entrada.value);
          quantidade.marcarErro(rQ.ok ? "" : rQ.mensagem); if (!rQ.ok) ok = false;
          var rC = I.validarCapacidadeItem(capacidade.entrada.value);
          capacidade.marcarErro(rC.ok ? "" : rC.mensagem); if (!rC.ok) ok = false;
          if (!ok) return null;
          return {
            espacos: rE.valor,
            quantidade: rQ.valor,
            categoria: categoria.entrada.value === "" ? null : parseInt(categoria.entrada.value, 10),
            grupo: grupo.entrada.value,
            capacidade: rC.valor,
            /* Editar a proteção não a tira de uso. */
            emUso: d.emUso === true,
          };
        },
      };
    },
  };

  /* =================================================================
     HABILIDADES — o complemento de Ordem
     -----------------------------------------------------------------
     A aba Habilidades é a universal, com a árvore de habilidades que a
     mesa cria à mão. Numa ficha de Ordem a MESMA lista abre com o que as
     regras entregaram: habilidades automáticas, poderes da trilha e
     poderes escolhidos na Progressão. Um painel só, sem separar.
     ================================================================= */

  /* =================================================================
     ORGANIZAÇÃO DAS LISTAS
     -----------------------------------------------------------------
     Habilidades, Rituais e Inventário ordenam a exibição por um de
     quatro modos (U.ordenarLista): personalizada, de adição, A–Z e
     Z–A. O modo é da FICHA — fica em `ordem.organizacao` e vale em
     qualquer aparelho. Só a tela ordena; nada na lista guardada é
     reescrito por escolher um modo. As três abas são compartilhadas com
     a ficha universal e perguntam aqui se há um modo a aplicar.
     ================================================================= */

  var Organizacao = {
    ativa: function (ctx) {
      return !!(ctx && ctx.ficha && global.RAMAFicha && global.RAMAFicha.ehDeOrdem(ctx.ficha));
    },

    dados: function (o) {
      if (!o.organizacao || !o.organizacao.habilidades || !o.organizacao.rituais || !o.organizacao.inventario) {
        o.organizacao = R.normalizar({ organizacao: o.organizacao }).organizacao;
      }
      return o.organizacao;
    },

    modo: function (ctx, aba) {
      if (!Organizacao.ativa(ctx)) return "personalizada";
      var org = Organizacao.dados(ordemDe(ctx));
      return U.modoDeOrdem(org[aba] && org[aba].modo);
    },

    definir: function (ctx, aba, modo) {
      var org = Organizacao.dados(ordemDe(ctx));
      if (org[aba].modo === modo) return;
      org[aba].modo = U.modoDeOrdem(modo);
      ctx.alterou();
      ctx.redesenhar();
      /* Redesenhar recria o seletor: o foco volta para ele, para quem
         troca de modo pelo teclado não se perder na página. */
      var novo = document.querySelector('[data-ordenacao="' + aba + '"] select');
      if (novo) novo.focus();
    },

    barra: function (ctx, aba) {
      if (!Organizacao.ativa(ctx)) return null;
      var modo = Organizacao.modo(ctx, aba);
      return el("div.ordenacao-barra", { dataset: { ordenacao: aba } }, [
        UI.seletorDeOrdem({
          valor: modo,
          rotulo: "Ordenar",
          aoMudar: function (m) { Organizacao.definir(ctx, aba, m); },
        }),
        modo === "personalizada" && ctx.emEdicao()
          ? el("span.t-mini", { texto: "Subir e Descer, no menu de cada um, mudam esta ordem." })
          : (modo === "adicao" ? el("span.t-mini", { texto: "O mais antigo primeiro. O que entrou antes da v2.7 vem no topo, na ordem guardada." }) : null),
      ]);
    },
  };

  function moverRegra(ctx, o, ordemAtual, id, direcao) {
    var lista = ordemAtual.slice();
    var i = lista.indexOf(id);
    var j = i + (direcao < 0 ? -1 : 1);
    if (i < 0 || j < 0 || j >= lista.length) return;
    lista[i] = lista[j];
    lista[j] = id;
    Organizacao.dados(o).habilidades.regras = lista;
    ctx.alterou();
    ctx.redesenhar();
  }

  var SecaoHabilidadesOrdem = {
    aba: function (ctx) {
      return global.RAMASecaoHabilidades.aba(ctx, poderesDasRegras(ctx, ordemDe(ctx), calculo(ctx)));
    },
  };

  /* =================================================================
     AUXILIARES
     ================================================================= */

  /* Uma mudança nas escolhas muda os máximos. Os recursos gastos são
     aparados para baixo quando o máximo cai — e NUNCA repostos quando
     ele sobe. */
  function aoMudarOrdem(ctx) {
    var o = ordemDe(ctx);
    R.aparar(o, {
      pv: R.pontosDeVida(o).total,
      pe: R.pontosDeEsforco(o).total,
      san: R.sanidade(o).total,
    });
    ctx.alterou();
    ctx.redesenhar();
  }

  function siglaDe(chave) {
    var a = C.ATRIBUTOS.filter(function (x) { return x.chave === chave; })[0];
    return a ? a.sigla : chave;
  }

  global.RAMASecaoOrdemGeral = SecaoGeral;
  global.RAMASecaoOrdemPericias = SecaoPericias;
  global.RAMASecaoOrdemProgressao = SecaoProgressao;
  global.RAMASecaoOrdemRegras = SecaoRegras;
  global.RAMASecaoOrdemInventario = SecaoInventarioOrdem;
  global.RAMASecaoOrdemHabilidades = SecaoHabilidadesOrdem;
  global.RAMAOrdemOrganizacao = Organizacao;
})(window);
