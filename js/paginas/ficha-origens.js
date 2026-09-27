/* =====================================================================
   R.A.M.A. — ficha de Ordem · os poderes de origem que se USAM
   =====================================================================
   O catálogo (js/ordem/catalogo.js) diz o que cada origem dá; a camada
   de cálculo aplica o que é permanente e objetivo (+2 em Diplomacia, +5
   PV, resistência a dano). Este arquivo é o resto — o que acontece por
   CLIQUE de quem joga:

     · no resultado de um teste, os "gaste 2 PE para +5" e as trocas de
       perícia numa situação (Terapia, Encontrar a Verdade, cosplay);
     · no cartão da origem, na aba Habilidades, os controles de cada
       poder que guarda algo entre usos: o companheiro animal, os números
       da sorte, o invento, as refeições do Chef, o melhor amigo…;
     · a troca de origem de uma ficha existente, com as perícias
       mostradas antes de confirmar.

   Nada aqui gasta PE, rola dado ou tira Sanidade sem um clique, e nada
   situacional fica ligado sem que alguém ligue: os bônus de cena entram
   pelo sistema de efeitos (js/ordem/efeitos.js), com duração e
   encerramento à vista.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var el = U.el;

  function C() { return global.RAMAOrdemCatalogo; }
  function R() { return global.RAMAOrdemRegras; }
  function E() { return global.RAMAOrdemProgressao; }
  function EF() { return global.RAMAOrdemEfeitos || null; }
  function CD() { return global.RAMAOrdemCondicoes || null; }
  function D() { return global.RAMADados; }

  function ordemDe(ctx) { return ctx.ficha.ordem; }
  function calc(ctx) { return R().calcular(ordemDe(ctx), ctx.ficha.inventario); }
  /* A primeira cena de uma ficha não tem id: ela vale como "inicial" — a
     mesma chave que a camada de cálculo usa. */
  function cenaAtual(o) { return (o.condicoes && o.condicoes.cena && o.condicoes.cena.id) || "inicial"; }

  function estado(o, chave) {
    if (!o.estadoDasOrigens || typeof o.estadoDasOrigens !== "object") o.estadoDasOrigens = {};
    if (!o.estadoDasOrigens[chave]) o.estadoDasOrigens[chave] = {};
    return o.estadoDasOrigens[chave];
  }

  function registroDaOrigem(o, org) {
    return (o.escolhas || []).filter(function (r) { return r.etapa === "b.origem." + org.chave; })[0] || null;
  }

  function salvar(ctx) { ctx.alterou(); ctx.redesenhar(); }

  /* Gasta PE (ou PD, com Jogando sem Sanidade) pelo mesmo caminho das
     ações de recurso. Devolve false, com aviso, se não der. */
  function gastar(ctx, quanto) {
    var o = ordemDe(ctx);
    var c = calc(ctx);
    var qual = c.determinacao ? "pd" : "pe";
    var maximo = qual === "pd" ? c.pd.total : c.pe.total;
    var atual = c.atual[qual];
    var r = CD() ? CD().aplicarAcao(qual, "gastar", { cond: o.condicoes, atual: atual, maximo: maximo, valor: quanto, pd: c.determinacao }) : null;
    if (!r || !r.ok) { UI.avisoAtencao((r && r.motivo) || "Sem " + qual.toUpperCase() + " suficientes."); return null; }
    if (!o.recursos) o.recursos = { pv: null, pe: null, san: null, pd: null };
    o.recursos[qual] = r.valor;
    return { qual: qual.toUpperCase(), antes: atual, depois: r.valor };
  }

  function siglaDoGasto(o) { return R().usaDeterminacao(o) ? "PD" : "PE"; }

  /* As origens cujo poder a ficha tem: a própria e as recebidas por
     Flashback (só o poder — nunca as perícias). */
  function origensComPoder(o) {
    var lista = [];
    var propria = C().origem(o.origem);
    if (propria) lista.push(propria);
    var est = E() ? E().estado(o, null) : null;
    (est ? est.adquiridos : []).forEach(function (a) {
      if (a.tipo !== "origem" || a.valido === false) return;
      var org = C().origem(String(a.chave).replace(/^origem:/, ""));
      if (org && lista.indexOf(org) < 0) lista.push(org);
    });
    return lista;
  }

  function aplicarEfeito(ctx, org, dados, modo) {
    var o = ordemDe(ctx);
    if (!EF()) return null;
    var ag = global.RAMAAuth && global.RAMAAuth.agente ? global.RAMAAuth.agente() : null;
    var inst = EF().criarInstancia(Object.assign({
      origem: { tipo: "habilidade", nome: org.poder + " (" + org.nome + ")" },
      alvoNome: ctx.ficha.nome, cena: cenaAtual(o),
      aplicadoPor: { id: ag ? ag.id : "", nome: ag ? (ag.nome || ag.usuario || "") : "", papel: "jogador" },
    }, dados));
    var av = EF().avaliarAplicacao(o.condicoes, inst);
    var r = EF().aplicar(o.condicoes, inst, modo || (av.ok && av.conflito ? "renovar" : "nova"));
    if (!r.ok) { UI.avisoAtencao(r.motivo); return null; }
    return r;
  }

  function encerrarEfeitoDoModelo(o, modelo, motivo) {
    if (!EF()) return;
    (o.condicoes.efeitos || []).forEach(function (x) {
      if (x.modelo === modelo && EF().ativa(x)) EF().encerrar(o.condicoes, x.id, motivo || "manual", "");
    });
  }

  /* =================================================================
     NO RESULTADO DE UM TESTE
     ================================================================= */

  function acoesNoTeste(ctx, o, p, r) {
    var saida = [];
    origensComPoder(o).forEach(function (org) {
      (org.acoesNoTeste || []).forEach(function (ac) {
        if (ac.pericias.indexOf(p.chave) < 0) return;
        saida.push(acaoDePe(ctx, o, p, r, org, ac));
      });
      (org.substituicoes || []).forEach(function (sub) {
        if (sub.de !== p.chave) return;
        saida.push({
          rotulo: sub.rotulo,
          dica: sub.condicao || "",
          aoClicar: function () {
            var nomePara = C().nomeComEspecialidade(org, sub.para);
            var ir = function () { rolar(ctx, sub.para, nomePara + " · " + org.poder); };
            if (!sub.condicao) { ir(); return; }
            UI.confirmar({ titulo: sub.rotulo, texto: sub.condicao + " Rolar " + nomePara + " no lugar?", rotuloConfirmar: "Rolar" })
              .then(function (ok) { if (ok) ir(); });
          },
        });
      });
    });
    return saida;
  }

  function acaoDePe(ctx, o, p, r, org, ac) {
    var usado = false;
    var sigla = siglaDoGasto(o);
    return {
      rotulo: ac.rotulo + (ac.tipo === "rerrolar" ? ": rolar de novo" : ": +" + ac.valor) + " (" + ac.custo + " " + sigla + ")",
      dica: ac.condicao || "",
      aoClicar: function (cartao, botao) {
        if (usado) return;
        if (!ac.condicao) { usar(botao); return; }
        UI.confirmar({ titulo: ac.rotulo, texto: ac.condicao + " Gastar " + ac.custo + " " + sigla + "?", rotuloConfirmar: "Gastar" })
          .then(function (ok) { if (ok) usar(botao); });
      },
    };

    function usar(botao) {
        if (usado) return;
        var g = gastar(ctx, ac.custo);
        if (!g) return;
        usado = true;
        if (botao) botao.disabled = true;
        salvar(ctx);
        var nota = "Gastou " + ac.custo + " " + g.qual + " (" + g.antes + " → " + g.depois + ") — " + org.poder + ", origem " + org.nome + ".";
        if (ac.tipo === "rerrolar") {
          var novo = D().dependente({ expressao: r.expressao, sigla: "", nome: p.nome, bonus: (r.total - (r.natural || 0)), modificadores: [] });
          var melhor = novo && novo.ok && novo.total > r.total ? novo : r;
          global.RAMARolagens.mostrar(Object.assign({}, novo, { tipo: "pericia", nome: p.nome }), {
            nome: p.nome + " · " + ac.rotulo,
            notas: ["Primeira rolagem: " + r.total + "; segunda: " + (novo && novo.ok ? novo.total : "—") + ". Fica a melhor: " + melhor.total + ".", nota],
          });
          return;
        }
        global.RAMARolagens.mostrar(Object.assign({}, r, {
          total: r.total + ac.valor,
          parcelas: (r.parcelas || []).concat([{ rotulo: ac.rotulo, valor: ac.valor }]),
        }), { nome: p.nome + " · " + ac.rotulo, notas: ["Mesmo teste, +" + ac.valor + ". " + nota] });
    }
  }

  function rolar(ctx, chave, rotulo) {
    if (global.RAMAOrdemRolarPericia) global.RAMAOrdemRolarPericia(ctx, chave, rotulo);
  }

  /* =================================================================
     OS CONTROLES DO CARTÃO DA ORIGEM
     ================================================================= */

  function botao(texto, aoClicar, opcoes) {
    var op = opcoes || {};
    return el("button.r-botao.r-botao--mini", {
      type: "button", texto: texto, disabled: !!op.desligado, title: op.dica || "",
      dataset: { foco: op.foco || "" },
      onclick: aoClicar,
    });
  }

  function controles(ctx, org) {
    var o = ordemDe(ctx);
    if (!org || !org.controles) return null;
    var f = CONTROLES[org.chave];
    if (!f) return null;
    var partes = f(ctx, o, org, estado(o, org.chave), registroDaOrigem(o, org));
    return partes && partes.length ? el("div.pilha--curta.origem-controles", { class: "pilha" }, partes.filter(Boolean)) : null;
  }

  var CONTROLES = {
    amigoDosAnimais: function (ctx, o, org, e, reg) {
      var op = reg ? reg.opcoes || {} : {};
      var nex = R().trilho(o).nexEquivalente;
      var linhas = [
        el("p.t-mini", { texto: "Companheiro: " + (op.companheiro || "sem nome registrado") +
          (op.pericia ? " · +2 em " + (C().pericia(op.pericia) || {}).nome + (e.companheiroPerdido ? " (suspenso)" : "") : " · perícia a escolher na Progressão") }),
        nex >= 35 ? el("p.t-mini", { texto: "NEX 35%: bônus do tipo de aliado " + (op.aliado || "(a escolher na Progressão)") + " — aplicado pela mesa." }) : null,
        nex >= 70 ? el("p.t-mini", { texto: "NEX 70%: também a habilidade desse tipo de aliado — aplicada pela mesa." }) : null,
      ];
      if (e.companheiroPerdido) {
        linhas.push(el("p.t-mini.t-aviso", { texto: "O companheiro morreu. Um novo fica a critério do mestre, normalmente entre missões." }));
        linhas.push(botao("Um novo companheiro chegou", function () { e.companheiroPerdido = false; salvar(ctx); UI.aviso("O bônus do companheiro volta a valer. Troque a perícia na Progressão, se mudou."); }));
      } else {
        linhas.push(botao("O companheiro morreu", function () { morteDoCompanheiro(ctx, o, e); }));
      }
      return linhas;
    },

    astronauta: function (ctx, o, org, e) {
      var usos = e.cena === cenaAtual(o) ? (e.usos || 0) : 0;
      var custo = 1 + usos;
      return [
        el("p.t-mini", { texto: usos ? "Usado " + usos + "× nesta cena." : "Ainda não usado nesta cena." }),
        botao("Reduzir dano de fogo, frio ou mental em 5 (" + custo + " " + siglaDoGasto(o) + ")", function () {
          var g = gastar(ctx, custo);
          if (!g) return;
          e.cena = cenaAtual(o);
          e.usos = usos + 1;
          salvar(ctx);
          UI.aviso("Acostumado ao Extremo: reduza esse dano em 5. Gastou " + custo + " " + g.qual + "; o próximo uso nesta cena custa " + (custo + 1) + ".");
        }),
      ];
    },

    chefDoOutroLado: function (ctx, o, org, e) {
      var itens = (ctx.ficha.inventario && ctx.ficha.inventario.itens) || [];
      var ingredientes = itens.filter(function (i) { return i && i.origemCatalogoId === "origem.chef.ingrediente"; });
      var pratos = itens.filter(function (i) { return i && i.origemCatalogoId === "origem.chef.prato"; });
      var comPd = R().usaDeterminacao(o);
      return [
        el("p.t-mini", { texto: "Ingredientes: " + ingredientes.length + " · pratos prontos: " + pratos.length +
          " · refeições: " + (e.refeicoes || 0) + (comPd ? "" : " (–" + (e.refeicoes || 0) + " de Sanidade permanente)") }),
        el("div.faixa", {}, [
          botao("Registrar ingrediente", function () { registrarIngrediente(ctx, o); }),
          botao("Preparar prato (interlúdio)", function () { prepararPrato(ctx, o, ingredientes); }, { desligado: !ingredientes.length, dica: ingredientes.length ? "" : "Nenhum ingrediente no inventário." }),
          botao("Comer um prato", function () { comerPrato(ctx, o, e, pratos); }, { desligado: !pratos.length, dica: pratos.length ? "" : "Nenhum prato pronto." }),
        ]),
      ];
    },

    colegial: function (ctx, o, org, e, reg) {
      var amigo = reg && reg.opcoes && reg.opcoes.amigo ? reg.opcoes.amigo : "";
      var ativo = (o.condicoes.efeitos || []).some(function (x) { return x.modelo === "origem:colegial" && EF() && EF().ativa(x); });
      var linhas = [el("p.t-mini", { texto: "Melhor amigo: " + (amigo || "a escolher na Progressão") + (ativo ? " · por perto: +2 em testes de perícia" : "") })];
      if (e.amigoPerdido) {
        linhas.push(el("p.t-mini.t-aviso", { texto: "O melhor amigo morreu: –1 PE por 5% de NEX até o fim da missão." }));
        linhas.push(botao("Fim da missão", function () { e.amigoPerdido = false; salvar(ctx); UI.aviso("Os PE voltam. Na próxima missão você pode escolher outro melhor amigo, na Progressão."); }));
      } else {
        linhas.push(el("div.faixa", {}, [
          ativo ? null : botao("Melhor amigo por perto (+2)", function () {
            if (aplicarEfeito(ctx, org, { modelo: "origem:colegial", nome: "Poder da Amizade", descricao: "Em alcance médio de " + (amigo || "seu melhor amigo") + ", trocando olhares: +2 em todos os testes de perícia. Encerre quando ele se afastar.",
              modificadores: [{ alvo: "pericias", tipo: "bonus", valor: 2 }], duracao: { tipo: "ateRemover" } })) salvar(ctx);
          }),
          ativo ? botao("Ele se afastou", function () { encerrarEfeitoDoModelo(o, "origem:colegial"); salvar(ctx); }) : null,
          botao("O melhor amigo morreu", function () {
            UI.confirmar({ titulo: "O melhor amigo morreu?", texto: "Seu total de PE cai 1 para cada 5% de NEX até o fim da missão (SAH p. 9).", rotuloConfirmar: "Registrar" }).then(function (ok) {
              if (!ok) return;
              e.amigoPerdido = true;
              encerrarEfeitoDoModelo(o, "origem:colegial");
              salvar(ctx);
            });
          }),
        ]));
      }
      return linhas;
    },

    cosplayer: function (ctx, o, org) {
      return [botao("Estou de cosplay…", function () { cosplay(ctx, o, org); })];
    },

    fanaticoPorCriaturas: function (ctx, o, org) {
      return [botao("Identifiquei uma criatura", function () {
        UI.pedirTexto({ titulo: "Criatura identificada", rotulo: "Qual criatura (como a mesa a chama)", valor: "", limite: 60 }).then(function (nome) {
          if (!nome) return;
          if (aplicarEfeito(ctx, org, { modelo: "", nome: "Conhecimento Oculto: " + nome,
            descricao: "+2 em todos os testes contra " + nome + ", até o fim da missão. Some o bônus no teste contra ela — ele não vale contra outras criaturas.",
            modificadores: [], duracao: { tipo: "especial", texto: "até o fim da missão" } })) salvar(ctx);
        });
      })];
    },

    inventorParanormal: function (ctx, o, org, e, reg) {
      var ritual = reg && reg.opcoes && reg.opcoes.ritual ? reg.opcoes.ritual : null;
      var dt = 15 + 5 * (e.ativacoes || 0);
      var itens = (ctx.ficha.inventario && ctx.ficha.inventario.itens) || [];
      var temItem = itens.some(function (i) { return i && i.origemCatalogoId === "origem.inventor.invento"; });
      return [
        el("p.t-mini", { texto: "Invento: " + (ritual ? ritual.nome + " (1º círculo, forma básica)" : "ritual a escolher na Progressão") +
          " · ativações nesta missão: " + (e.ativacoes || 0) + " · próxima DT " + dt + (e.enguicado ? " · ENGUIÇADO" : "") }),
        el("div.faixa", {}, [
          botao("Ativar o invento (Profissão (engenheiro), DT " + dt + ")", function () { ativarInvento(ctx, o, org, e, ritual, dt); },
            { desligado: !ritual || e.enguicado, dica: e.enguicado ? "Enguiçado: faça a manutenção no interlúdio." : (!ritual ? "Escolha o ritual na Progressão." : "") }),
          botao("Manutenção (interlúdio)", function () { e.enguicado = false; e.ativacoes = 0; salvar(ctx); UI.aviso("Invento consertado: a DT volta a 15."); }),
          botao("Nova missão", function () { e.ativacoes = 0; salvar(ctx); UI.aviso("Ativações zeradas. No início da missão você pode trocar o ritual do invento, na Progressão."); }),
          temItem ? null : botao("Pôr o invento no inventário", function () { porInvento(ctx, ritual); }),
        ]),
      ];
    },

    jovemMistico: function (ctx, o, org, e, reg) {
      var inicial = reg && reg.opcoes && reg.opcoes.numero ? Number(reg.opcoes.numero) : 0;
      if (!inicial) return [el("p.t-mini", { texto: "Escolha o número da sorte na Progressão." })];
      var numeros = e.numeros && e.numeros.length ? e.numeros : [inicial];
      var usadoNaCena = e.cena && e.cena === cenaAtual(o);
      var linhas = [el("p.t-mini", { texto: "Números da sorte: " + numeros.join(", ") + (usadoNaCena ? " · já usada nesta cena" : "") })];
      if (e.adicionar && numeros.length < 6) {
        linhas.push(el("p.t-mini.t-aviso", { texto: "Antes da próxima rolagem, escolha mais um número:" }));
        linhas.push(el("div.faixa", {}, [1, 2, 3, 4, 5, 6].filter(function (n) { return numeros.indexOf(n) < 0; }).map(function (n) {
          return botao(String(n), function () { e.numeros = numeros.concat([n]); e.adicionar = false; salvar(ctx); });
        })));
      } else {
        linhas.push(botao("Início de cena: rolar a sorte (1 " + siglaDoGasto(o) + ")", function () { rolarSorte(ctx, o, org, e, numeros, inicial); },
          { desligado: usadoNaCena, dica: usadoNaCena ? "Uma vez por cena, no início dela." : "" }));
      }
      return linhas;
    },

    profetizado: function (ctx, o, org, e, reg) {
      var prem = reg && reg.opcoes && reg.opcoes.premonicao ? reg.opcoes.premonicao : "";
      var nestaCena = e.cena && e.cena === cenaAtual(o) && e.peTemporarios;
      return [
        el("p.t-mini", { texto: "Premonição: " + (prem || "registre na Progressão o que o personagem sabe") }),
        botao("Surgiu uma referência (+2 " + siglaDoGasto(o) + " temporários)", function () {
          e.peTemporarios = 2;
          e.cena = cenaAtual(o);
          var qual = R().usaDeterminacao(o) ? "pd" : "pe";
          if (o.recursos && o.recursos[qual] !== null && o.recursos[qual] !== undefined) o.recursos[qual] += 2;
          salvar(ctx);
          UI.aviso("Luta ou Fuga: +2 " + qual.toUpperCase() + " temporários, até o fim da cena.");
        }, { desligado: !!nestaCena, dica: nestaCena ? "Já recebidos nesta cena." : "Quando a mesa reconhece a referência." }),
      ];
    },

    psicologo: function (ctx, o, org) {
      return [
        el("p.t-mini", { texto: "Profissão (psicólogo) pode ser usada como Diplomacia: o resultado de Diplomacia oferece a troca." }),
        botao("Terapia (2 " + siglaDoGasto(o) + "): Profissão (psicólogo) no lugar da resistência", function () {
          UI.confirmar({ titulo: "Terapia", texto: "Uma vez por rodada, quando você ou um aliado em alcance curto falha num teste de resistência contra dano mental. Gastar 2 e rolar Profissão (psicólogo)?", rotuloConfirmar: "Gastar e rolar" }).then(function (ok) {
            if (!ok) return;
            var g = gastar(ctx, 2);
            if (!g) return;
            salvar(ctx);
            rolar(ctx, "profissao", "Profissão (psicólogo) · Terapia");
          });
        }),
      ];
    },
  };

  /* ---------------- ações com diálogo ---------------- */

  function morteDoCompanheiro(ctx, o, e) {
    var comPd = R().usaDeterminacao(o);
    var perderSan = el("input", { type: "checkbox", checked: !comPd, disabled: comPd });
    var perturbar = el("input", { type: "checkbox", checked: true });
    UI.modal({
      titulo: "O companheiro morreu",
      conteudo: [el("div.pilha--curta", { class: "pilha" }, [
        el("p", { texto: "“Se ele morrer, você perde 10 pontos de Sanidade permanentemente, além de ficar perturbado até o fim da cena” (SAH p. 7)." }),
        el("label.r-marca", {}, [perderSan, el("span", { texto: comPd ? "Sanidade: com Jogando sem Sanidade, a referência é ignorada (SAH p. 104)." : "Perder 10 de Sanidade permanente (entra como ajuste, visível e reversível)" })]),
        el("label.r-marca", {}, [perturbar, el("span", { texto: "Ficar perturbado até o fim da cena" })]),
      ])],
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Registrar", classe: "r-botao--principal", aoClicar: function (fechar) {
          e.companheiroPerdido = true;
          if (perderSan.checked && !comPd) {
            if (!Array.isArray(o.ajustes)) o.ajustes = [];
            o.ajustes.push(R().criarAjuste("san", -10, "Companheiro Animal: o companheiro morreu (permanente)"));
          }
          if (perturbar.checked && CD()) CD().ativar(o.condicoes, "perturbado");
          fechar();
          salvar(ctx);
        } },
      ],
    });
  }

  var ELEMENTOS_DE_DANO = ["sangue", "morte", "conhecimento", "energia", "medo"];

  function seletorDeElemento() {
    return el("select.r-selecao", { "aria-label": "Elemento" }, ELEMENTOS_DE_DANO.map(function (k) {
      var e = C().elemento(k);
      return el("option", { value: k, texto: e ? e.nome : k });
    }));
  }

  function registrarIngrediente(ctx, o) {
    var nome = el("input.r-entrada", { type: "text", maxlength: 60, "aria-label": "Criatura" });
    var elemento = seletorDeElemento();
    UI.modal({
      titulo: "Ingrediente paranormal",
      conteudo: [el("div.pilha--curta", { class: "pilha" }, [
        el("p.t-mini", { texto: "Pedido no início da missão ou tirado de uma criatura derrotada (1 por criatura Pequena ou maior). Item de categoria I, 0,5 espaço (SAH p. 8)." }),
        el("label.r-campo", {}, [el("span", { texto: "Criatura" }), nome]),
        el("label.r-campo", {}, [el("span", { texto: "Elemento" }), elemento]),
      ])],
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Pôr no inventário", classe: "r-botao--principal", aoClicar: function (fechar) {
          var criatura = nome.value.trim() || "criatura";
          if (!ctx.ficha.inventario.itens) ctx.ficha.inventario.itens = [];
          ctx.ficha.inventario.itens.push({
            id: U.uuid(), tipo: "item", nome: "Ingrediente paranormal: " + criatura, peso: 0,
            origemCatalogoId: "origem.chef.ingrediente",
            descricao: "Parte de " + criatura + " (" + (C().elemento(elemento.value) || {}).nome + "). Fome do Outro Lado, SAH p. 8.",
            ordem: { categoria: 1, espacos: 0.5, quantidade: 1, grupo: "paranormal", elemento: elemento.value },
          });
          fechar();
          salvar(ctx);
        } },
      ],
    });
  }

  function prepararPrato(ctx, o, ingredientes) {
    var sel = el("select.r-selecao", { "aria-label": "Ingrediente" }, ingredientes.map(function (i) { return el("option", { value: i.id, texto: i.nome }); }));
    UI.modal({
      titulo: "Preparar prato especial",
      conteudo: [el("div.pilha--curta", { class: "pilha" }, [
        el("p.t-mini", { texto: "Uma ação de interlúdio e 1 ingrediente. O teste de Profissão (cozinheiro), DT 15 + 1 dado, é do mestre: ele oculta o resultado até alguém comer o prato. Preparar não dá benefício nem custa Sanidade." }),
        sel,
      ])],
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Preparar", classe: "r-botao--principal", aoClicar: function (fechar) {
          var itens = ctx.ficha.inventario.itens;
          var ing = itens.filter(function (i) { return i.id === sel.value; })[0];
          if (!ing) { fechar(); return; }
          var d = global.RAMAOrdemInventario.dadosDoItem(ing);
          if ((d.quantidade || 1) > 1) ing.ordem.quantidade = d.quantidade - 1;
          else ctx.ficha.inventario.itens = itens.filter(function (i) { return i !== ing; });
          var criatura = ing.nome.replace(/^Ingrediente paranormal:\s*/, "");
          ctx.ficha.inventario.itens.push({
            id: U.uuid(), tipo: "item", nome: "Prato especial: " + criatura, peso: 0,
            origemCatalogoId: "origem.chef.prato",
            descricao: "Preparado com " + criatura + ". Resultado do teste com o mestre.",
            ordem: { categoria: 0, espacos: 0, quantidade: 1, grupo: "paranormal", elemento: d.elemento || "" },
          });
          fechar();
          salvar(ctx);
          UI.aviso("Prato pronto. O resultado do teste fica com o mestre até alguém comer.");
        } },
      ],
    });
  }

  function comerPrato(ctx, o, e, pratos) {
    var comPd = R().usaDeterminacao(o);
    var sel = el("select.r-selecao", { "aria-label": "Prato" }, pratos.map(function (i) { return el("option", { value: i.id, texto: i.nome }); }));
    var resultado = el("select.r-selecao", { "aria-label": "Resultado (o mestre informa)" }, [
      el("option", { value: "rd", texto: "O teste passou: RD 10 contra o dano do elemento" }),
      el("option", { value: "vuln", texto: "O teste falhou: vulnerável ao dano do elemento" }),
      el("option", { value: "", texto: "O mestre ainda não disse (registrar depois)" }),
    ]);
    var exposicao = el("input", { type: "checkbox", checked: R().separaNivelENex(o) });
    UI.modal({
      titulo: "Comer um prato do Outro Lado",
      conteudo: [el("div.pilha--curta", { class: "pilha" }, [
        sel,
        el("label.r-campo", {}, [el("span", { texto: "Resultado (o mestre informa)" }), resultado]),
        el("p.t-mini", { texto: comPd
          ? "Cada refeição custa 1 de Sanidade permanente — com Jogando sem Sanidade, a referência a Sanidade é ignorada (SAH p. 104)."
          : "Cada refeição custa 1 de Sanidade permanente (SAH p. 8): o máximo cai 1, para sempre." }),
        el("label.r-marca", {}, [exposicao, el("span", { texto: "+3% de NEX de exposição, se for parte de uma criatura diferente das já comidas (NEX & Experiência)" })]),
      ])],
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Comer", classe: "r-botao--principal", aoClicar: function (fechar) {
          var itens = ctx.ficha.inventario.itens;
          var prato = itens.filter(function (i) { return i.id === sel.value; })[0];
          if (!prato) { fechar(); return; }
          var d = global.RAMAOrdemInventario.dadosDoItem(prato);
          var elemento = (C().elemento(d.elemento) || {}).nome || "o elemento";
          var criatura = prato.nome.replace(/^Prato especial:\s*/, "");
          if ((d.quantidade || 1) > 1) prato.ordem.quantidade = d.quantidade - 1;
          else ctx.ficha.inventario.itens = itens.filter(function (i) { return i !== prato; });
          if (!comPd) e.refeicoes = (e.refeicoes || 0) + 1;
          var nova = (e.partes || []).indexOf(criatura) < 0;
          if (nova) e.partes = (e.partes || []).concat([criatura]);
          if (exposicao.checked && nova && R().separaNivelENex(o)) o.nex = Math.min(99, (Number(o.nex) || 0) + 3);
          var org = C().origem("chefDoOutroLado");
          if (resultado.value) {
            aplicarEfeito(ctx, org, {
              modelo: "", nome: resultado.value === "rd" ? "Prato do Outro Lado: RD 10 (" + elemento + ")" : "Prato do Outro Lado: vulnerável (" + elemento + ")",
              descricao: resultado.value === "rd" ? "Resistência 10 contra dano de " + elemento + "." : "Vulnerabilidade a dano de " + elemento + ".",
              modificadores: resultado.value === "rd" ? [{ alvo: "resistenciaDano", tipo: "bonus", valor: 10 }] : [],
              duracao: { tipo: "especial", texto: "até o fim da próxima cena" },
            });
          }
          fechar();
          salvar(ctx);
        } },
      ],
    });
  }

  function cosplay(ctx, o, org) {
    var tema = el("input.r-entrada", { type: "text", maxlength: 60, "aria-label": "Cosplay" });
    var escolhidas = [];
    var grade = el("div.criacao-pericias", {}, C().PERICIAS.map(function (p) {
      var b = el("button.criacao-pericia", { type: "button", "aria-pressed": "false", onclick: function () {
        var i = escolhidas.indexOf(p.chave);
        if (i >= 0) escolhidas.splice(i, 1); else escolhidas.push(p.chave);
        b.setAttribute("aria-pressed", String(i < 0));
        b.classList.toggle("criacao-pericia--marcada", i < 0);
      } }, [el("span.criacao-pericia__nome", { texto: p.nome })]);
      return b;
    }));
    UI.modal({
      titulo: "Não É Fantasia, É Cosplay!",
      largo: true,
      conteudo: [el("div.pilha--curta", { class: "pilha" }, [
        el("p.t-mini", { texto: "+2 nos testes com que o cosplay tem relação (vestido de um gato agente secreto: ser furtivo, se equilibrar…). Marque as perícias que a mesa aceita; o bônus sai quando você encerrar o efeito." }),
        el("label.r-campo", {}, [el("span", { texto: "Cosplay" }), tema]),
        grade,
      ])],
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Vestir", classe: "r-botao--principal", aoClicar: function (fechar) {
          if (!escolhidas.length) { UI.avisoAtencao("Marque ao menos uma perícia."); return; }
          var nome = tema.value.trim() || "cosplay";
          if (aplicarEfeito(ctx, org, { modelo: "origem:cosplayer", nome: "Cosplay: " + nome,
            descricao: "Vestido de " + nome + ": +2 nos testes relacionados.",
            modificadores: escolhidas.map(function (k) { return { alvo: "pericia:" + k, tipo: "bonus", valor: 2 }; }),
            duracao: { tipo: "ateRemover" } }, "renovar")) {
            fechar();
            salvar(ctx);
          }
        } },
      ],
    });
  }

  function ativarInvento(ctx, o, org, e, ritual, dt) {
    var chave = "profissao";
    var bonus = R().bonusDePericia(o, chave, ctx.ficha.inventario);
    var r = D().dependente({ expressao: R().dadoDePericia(o, chave), sigla: "", nome: "Profissão (engenheiro)", bonus: bonus.total, modificadores: [] });
    if (!r || !r.ok) return;
    var passou = r.total >= dt;
    e.ativacoes = (e.ativacoes || 0) + 1;
    if (!passou) e.enguicado = true;
    salvar(ctx);
    global.RAMARolagens.mostrar(Object.assign(r, { tipo: "pericia", nome: "Profissão (engenheiro)" }), {
      nome: "Invento · " + ritual.nome + " (DT " + dt + ")",
      notas: [passou
        ? "Passou: é como conjurar " + ritual.nome + " na forma básica, sem pagar PE. A próxima ativação nesta missão é DT " + (dt + 5) + "."
        : "Falhou: o invento enguiçou. Uma ação de interlúdio de manutenção conserta e volta a DT a 15."],
    });
  }

  function porInvento(ctx, ritual) {
    if (!ctx.ficha.inventario.itens) ctx.ficha.inventario.itens = [];
    ctx.ficha.inventario.itens.push({
      id: U.uuid(), tipo: "item", nome: "Invento paranormal" + (ritual ? " (" + ritual.nome + ")" : ""), peso: 0,
      origemCatalogoId: "origem.inventor.invento",
      descricao: "Invenção Paranormal (SAH p. 10): executa o efeito do ritual escolhido. O ritual não é aprendido.",
      ordem: { categoria: 0, espacos: 1, quantidade: 1, grupo: "paranormal" },
    });
    salvar(ctx);
  }

  function rolarSorte(ctx, o, org, e, numeros, inicial) {
    var g = gastar(ctx, 1);
    if (!g) return;
    var r = D().rolar("1d6");
    var saiu = r.principal;
    e.cena = cenaAtual(o);
    var acertou = numeros.indexOf(saiu) >= 0;
    if (acertou) {
      /* "Quando rolar um de seus números da sorte, a quantidade de
         números volta a 1" — o R.A.M.A. volta ao número escolhido na
         Progressão. Ver docs/ORDEM-REGRAS.md. */
      e.numeros = [inicial];
      e.adicionar = false;
      aplicarEfeito(ctx, org, { modelo: "origem:jovemMistico", nome: "A Culpa é das Estrelas",
        descricao: "Número da sorte: +2 em testes de perícia até o fim da cena.",
        modificadores: [{ alvo: "pericias", tipo: "bonus", valor: 2 }], duracao: { tipo: "cena" } });
    } else {
      e.numeros = numeros;
      e.adicionar = numeros.length < 6;
    }
    salvar(ctx);
    global.RAMARolagens.mostrar(Object.assign(r, { tipo: "outra", nome: "A Culpa é das Estrelas" }), {
      nome: "A Culpa é das Estrelas · 1d6",
      notas: [(acertou ? "Número da sorte! +2 em testes de perícia até o fim da cena." : "Não saiu: na próxima vez, escolha mais um número.") +
        " Gastou 1 " + g.qual + "."],
    });
  }

  /* =================================================================
     TROCAR A ORIGEM
     -----------------------------------------------------------------
     As perícias que a origem deu ficam em `ordem.periciasDaOrigem`
     (fichas antigas: as da origem no catálogo). Trocar mostra o que sai
     e o que entra, deixa escolher as livres e as trocas por repetição —
     "se receber uma perícia que já havia recebido, escolha outra" — e só
     muda a ficha ao confirmar. As escolhas do poder antigo ficam
     guardadas, sem efeito, e voltam se a origem voltar.
     ================================================================= */

  function trocarOrigem(ctx) {
    var o = ordemDe(ctx);
    var atual = C().origem(o.origem);
    var antigas = (o.periciasDaOrigem && o.periciasDaOrigem.length) ? o.periciasDaOrigem.slice() : (atual ? atual.pericias.slice() : []);
    var nova = null;
    var busca = "";
    var tirar = {};
    antigas.forEach(function (k) { tirar[k] = true; });
    var escolhidas = [];
    var corpo = el("div.pilha");
    var m = UI.modal({
      titulo: "Trocar origem",
      largo: true,
      conteudo: [corpo],
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Confirmar", classe: "r-botao--principal", aoClicar: confirmar },
      ],
    });
    var confirmarBotao = m.janela.querySelector(".r-modal__rodape .r-botao--principal");

    function treinadasDepois() {
      var mapa = {};
      Object.keys(o.pericias || {}).forEach(function (k) { if (!tirar[k] || o.pericias[k] !== "treinado") mapa[k] = true; });
      return mapa;
    }

    function plano() {
      if (!nova) return null;
      var jaTem = treinadasDepois();
      var fixas = nova.pericias.slice();
      var repetidas = fixas.filter(function (k) { return jaTem[k]; });
      var livres = (nova.periciasAEscolher || 0) + repetidas.length;
      return { fixas: fixas, repetidas: repetidas, livres: livres, jaTem: jaTem };
    }

    function pintar() {
      var termo = U.chaveDeBusca(busca);
      var lista = C().ORIGENS.filter(function (org) {
        return !termo || U.chaveDeBusca(org.nome + " " + org.poder).indexOf(termo) >= 0;
      });
      var pl = plano();
      var partes = [
        el("p.t-mini", { texto: "Trocar a origem troca o poder que aparece em Habilidades e os efeitos dele. As perícias abaixo só mudam ao confirmar." }),
        el("input.r-entrada", { type: "search", placeholder: "Buscar por origem ou poder", "aria-label": "Buscar origem", value: busca,
          oninput: function (ev) { busca = ev.target.value; pintar(); var c = corpo.querySelector("input[type=search]"); if (c) { c.focus(); c.setSelectionRange(busca.length, busca.length); } } }),
        el("div.criacao-lista.origem-lista", {}, lista.map(function (org) {
          var marcada = nova === org;
          return el("button.criacao-opcao", {
            type: "button", "aria-pressed": String(marcada), class: marcada ? "criacao-opcao--escolhida" : "",
            disabled: atual === org,
            onclick: function () { nova = org; escolhidas = []; pintar(); },
          }, [
            el("span.criacao-opcao__nome", { texto: org.nome + (atual === org ? " (atual)" : "") }),
            el("span.criacao-opcao__meta", { texto: org.pericias.map(function (k) { return C().nomeComEspecialidade(org, k); }).join(" e ") + (org.periciasAEscolher ? " + " + org.periciasAEscolher + " à escolha" : "") }),
            el("span.criacao-opcao__texto", { texto: org.poder }),
            el("span.criacao-opcao__fonte", { texto: C().referencia(org) }),
          ]);
        })),
      ];
      if (antigas.length) {
        partes.push(el("h4.t-secao", { texto: "Perícias da origem atual" }));
        partes.push(el("div.faixa", {}, antigas.map(function (k) {
          var caixa = el("input", { type: "checkbox", checked: !!tirar[k], onchange: function (ev) { tirar[k] = ev.target.checked; pintar(); } });
          return el("label.r-marca", {}, [caixa, el("span", { texto: "Deixar de ser treinado em " + (C().pericia(k) || {}).nome })]);
        })));
      }
      if (pl) {
        partes.push(el("h4.t-secao", { texto: "Perícias de " + nova.nome }));
        partes.push(el("p.t-mini", { texto: "Treinadas: " + (pl.fixas.map(function (k) { return C().nomeComEspecialidade(nova, k); }).join(", ") || "—") +
          (nova.periciasObservacao ? " — " + nova.periciasObservacao : "") }));
        if (pl.repetidas.length) partes.push(el("p.t-mini.t-aviso", { texto: "Já treinada(s): " + pl.repetidas.map(function (k) { return (C().pericia(k) || {}).nome; }).join(", ") + ". Escolha outra no lugar (OPRPG p. 22)." }));
        if (pl.livres) {
          partes.push(el("p.t-mini", { texto: "Escolha " + pl.livres + ": " + escolhidas.length + " escolhida(s)." }));
          partes.push(el("div.criacao-pericias", {}, C().PERICIAS.map(function (p) {
            var bloqueada = pl.jaTem[p.chave] || pl.fixas.indexOf(p.chave) >= 0;
            var marcada = escolhidas.indexOf(p.chave) >= 0;
            return el("button.criacao-pericia", {
              type: "button", disabled: bloqueada, "aria-pressed": String(marcada), class: marcada ? "criacao-pericia--marcada" : "",
              onclick: function () {
                if (marcada) escolhidas.splice(escolhidas.indexOf(p.chave), 1);
                else if (escolhidas.length < pl.livres) escolhidas.push(p.chave);
                pintar();
              },
            }, [el("span.criacao-pericia__nome", { texto: p.nome })]);
          })));
        }
        partes.push(el("p.t-mini", { texto: "As escolhas do poder de " + (atual ? atual.nome : "antes") + " ficam guardadas, sem efeito; as do novo poder aparecem em “Falta decidir”." }));
      }
      U.trocar(corpo, partes);
      confirmarBotao.disabled = !pl || escolhidas.length !== pl.livres;
    }

    function confirmar(fechar) {
      var pl = plano();
      if (!pl || escolhidas.length !== pl.livres) return;
      if (!o.pericias) o.pericias = {};
      antigas.forEach(function (k) { if (tirar[k] && o.pericias[k] === "treinado") delete o.pericias[k]; });
      var novas = pl.fixas.filter(function (k) { return pl.repetidas.indexOf(k) < 0; }).concat(escolhidas);
      novas.forEach(function (k) { if (!o.pericias[k]) o.pericias[k] = "treinado"; });
      o.periciasDaOrigem = pl.fixas.concat(escolhidas).filter(function (k, i, l) { return l.indexOf(k) === i; });
      o.origem = nova.chave;
      ctx.ficha.origem = nova.nome;
      fechar();
      salvar(ctx);
      UI.avisoOk("Origem: " + nova.nome + ". O poder " + nova.poder + " está em Habilidades.");
    }

    pintar();
    return m;
  }

  global.RAMASecaoOrigens = {
    acoesNoTeste: acoesNoTeste,
    controles: controles,
    trocarOrigem: trocarOrigem,
    origensComPoder: origensComPoder,
  };
})(window);
