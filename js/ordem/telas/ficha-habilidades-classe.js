/* =====================================================================
   R.A.M.A. — Ordem · usar as habilidades características de uma classe
   Homebrew nas rolagens (Legacy e Modern20: a mesma ficha)
   ---------------------------------------------------------------------
   As regras estão em js/ordem/habilidades-classe.js. Aqui, as AÇÕES no
   resultado, como o Empenho: no teste de perícia (bônus, dado extra,
   benefícios de grau — com Engenhosidade e afins), no ataque e no dano.

   Usar abre a confirmação com o custo e o efeito; cancelar não gasta
   nada. O gasto vai pelo motor de recursos (PE, ou PD com "Jogando sem
   Sanidade" e na Evolução por Patentes; temporários primeiro), conferido
   na hora: sem saldo, nada se aplica; acima do limite de PE por rodada,
   também não. Cada opção vale uma vez por resultado (clicar de novo não
   gasta de novo) e o efeito vale SÓ para aquele teste: o resultado é
   mostrado de novo com a parcela nomeada, e a ficha não muda.
   ===================================================================== */

(function (global) {
  "use strict";

  function R() { return global.RAMAOrdemRegras; }
  function C() { return global.RAMAOrdemCatalogo; }
  function HC() { return global.RAMAOrdemHabilidadesClasse; }
  function CD() { return global.RAMAOrdemCondicoes; }
  function UI() { return global.RAMAUI; }
  function D() { return global.RAMADados; }

  function ordemDe(ctx) { return ctx.ficha.ordem || {}; }
  function calculo(ctx) { return R().calcular(ordemDe(ctx), ctx.ficha.inventario); }
  function grauAtual(o, pericia) {
    var g = C().grau(R().grauDaPericia(o, pericia));
    return Math.max(0, Math.min(3, Math.round((g.bonus || 0) / 5)));
  }
  function efeitosDoEstado(c) { return (c && c.estado && c.estado.efeitos) || []; }

  /* Uma ação de uso: confirma, confere e gasta uma vez só. `aplicar(r)`
     devolve { resultado, notas } — o mesmo teste com a parcela nova. */
  function acaoDeUso(ctx, op, descricao, aplicar) {
    var usado = false, ocupado = false;
    var o = ordemDe(ctx);
    var recurso = R().usaDeterminacao(o) ? "PD" : "PE";
    return {
      rotulo: op.rotulo + (op.custo ? " (" + op.custo + " " + recurso + ")" : ""),
      aoClicar: function (cartao, botaoUsado) {
        if (usado || ocupado) return;
        var c = calculo(ctx);
        var qual = c.determinacao ? "pd" : "pe";
        var atual = c.atual[qual];
        var temp = Math.max(0, Number((o.temporarios || {})[qual]) || 0);
        var limite = c.limitePe && c.limitePe.total;
        /* Limite de PE por rodada: acima dele, só o custo mínimo da
           habilidade (o do 1º estágio) — sempre dá para usá-la nele. */
        var acimaDoLimite = !!(op.custo && limite && op.custo > limite);
        if (acimaDoLimite && op.custo > (op.custoMinimo || 0)) { UI().avisoAtencao(op.nome + " custa " + op.custo + " " + qual.toUpperCase() + ", acima do seu limite por rodada (" + limite + ")."); return; }
        if (op.custo && atual + temp < op.custo) { UI().avisoAtencao("Sem " + qual.toUpperCase() + " para " + op.nome + ": custa " + op.custo + ", você tem " + (atual + temp) + "."); return; }
        ocupado = true;
        UI().confirmar({
          titulo: "Usar " + op.nome + "?",
          texto: (op.custo ? "Gasta " + op.custo + " " + qual.toUpperCase() + " (" + (atual + temp) + " → " + (atual + temp - op.custo) + "). " : "Sem custo. ") + descricao + " Vale só para este resultado; a ficha não muda." +
            (acimaDoLimite ? " Acima do limite de " + qual.toUpperCase() + " por rodada (" + limite + "), permitido por ser o custo mínimo da habilidade." : ""),
          rotuloConfirmar: "Usar",
        }).then(function (sim) {
          ocupado = false;
          if (!sim || usado) return;
          var c2 = calculo(ctx);
          var gasto = null;
          if (op.custo) {
            gasto = CD() ? CD().aplicarAcao(qual, "gastar", { cond: o.condicoes, temporarios: o.temporarios, atual: c2.atual[qual], maximo: qual === "pd" ? c2.pd.total : c2.pe.total, valor: op.custo, pd: c2.determinacao }) : null;
            if (!gasto || !gasto.ok) { UI().avisoAtencao((gasto && gasto.motivo) || "Sem " + qual.toUpperCase() + " para " + op.nome + "."); return; }
          }
          usado = true;
          if (gasto) {
            if (!o.recursos) o.recursos = { pv: null, pe: null, san: null, pd: null };
            o.recursos[qual] = gasto.valor;
            ctx.alterou();
            ctx.redesenhar();
          }
          var botao = botaoUsado || (cartao && cartao.querySelector(".rolagem__acao.r-botao"));
          if (botao) botao.disabled = true;
          var feito = aplicar();
          if (!feito) return;
          var notas = (feito.notas || []).concat(op.custo ? ["Gastou " + op.custo + " " + qual.toUpperCase() + " com " + op.nome + " (" + c2.atual[qual] + " → " + gasto.valor + (gasto.absorvido ? ", " + gasto.absorvido + " temporário(s) primeiro" : "") + ")."] : []);
          global.RAMARolagens.mostrar(feito.resultado, { nome: feito.nome, critico: feito.critico, notas: notas });
        });
      },
    };
  }

  function somar(r, rotulo, valor) {
    return Object.assign({}, r, { total: r.total + valor, parcelas: (r.parcelas || []).concat([{ rotulo: rotulo, valor: valor }]) });
  }

  /* No resultado de um teste de perícia de Ordem. */
  function acoesNoTeste(ctx, o, p, r) {
    if (!HC() || !p || !p.chave || !HC().classeHbDe(o)) return [];
    var c = calculo(ctx);
    var t = R().trilho(o);
    var grau = grauAtual(o, p.chave);
    var pericia = C().pericia(p.chave);
    return HC().opcoesDeTeste(o, t, p.chave, grau, efeitosDoEstado(c)).map(function (op) {
      if (op.dado) {
        return acaoDeUso(ctx, op, "Soma " + op.dado + " ao teste de " + p.nome + ".", function () {
          var d = D().rolar(op.dado);
          if (!d || !d.ok) { UI().avisoErro("O dado " + op.dado + " não é válido."); return null; }
          return { resultado: somar(r, op.nome + " (" + op.dado + ")", d.principal), nome: p.nome + " · com " + op.nome, notas: ["Mesmo teste, +" + d.principal + " no " + op.dado + " de " + op.nome + "."] };
        });
      }
      if (op.treino) {
        return acaoDeUso(ctx, op, "Recebe os benefícios de " + op.treino + " em " + p.nome + " neste teste.", function () {
          var notas = ["Mesmo teste, com os benefícios de " + op.treino + " (" + (op.valor >= 0 ? "+" : "") + op.valor + "). O grau da ficha não muda."];
          if (pericia && pericia.treinada && grau < 1) notas.push(p.nome + " só pode ser usada treinada: com " + op.nome + ", este teste vale.");
          return { resultado: somar(r, op.nome + " (" + op.treino + ")", op.valor), nome: p.nome + " · com " + op.nome, notas: notas };
        });
      }
      return acaoDeUso(ctx, op, "Soma +" + op.valor + " ao teste de " + p.nome + ".", function () {
        return { resultado: somar(r, op.nome, op.valor), nome: p.nome + " · com " + op.nome, notas: ["Mesmo teste, +" + op.valor + " de " + op.nome + "."] };
      });
    });
  }

  /* No resultado de um ataque: +N no teste de ataque. O crítico continua
     sendo o do dado natural. */
  function acoesNoAtaque(ctx, arma, r, critico) {
    var o = ordemDe(ctx);
    if (!HC() || !HC().classeHbDe(o)) return [];
    var c = calculo(ctx);
    return HC().opcoesDeAtaque(o, R().trilho(o), efeitosDoEstado(c)).map(function (op) {
      return acaoDeUso(ctx, op, "Soma +" + op.valor + " a este ataque com " + arma.nome + ".", function () {
        return { resultado: somar(r, op.nome, op.valor), nome: arma.nome + " · Ataque com " + op.nome, critico: critico, notas: ["Mesmo ataque, +" + op.valor + " de " + op.nome + ". O crítico é o do dado natural."] };
      });
    });
  }

  /* No resultado de um dano: +N, fora da multiplicação do crítico. */
  function acoesNoDano(ctx, arma, r) {
    var o = ordemDe(ctx);
    if (!HC() || !HC().classeHbDe(o)) return [];
    var c = calculo(ctx);
    return HC().opcoesDeDano(o, R().trilho(o), efeitosDoEstado(c)).map(function (op) {
      return acaoDeUso(ctx, op, "Soma +" + op.valor + " a este dano de " + arma.nome + ".", function () {
        return { resultado: somar(r, op.nome, op.valor), nome: arma.nome + " · Dano com " + op.nome, notas: ["Mesmo dano, +" + op.valor + " de " + op.nome + " (bônus numérico: não multiplica no crítico)."] };
      });
    });
  }

  global.RAMAFichaHabilidadesClasse = { acoesNoTeste: acoesNoTeste, acoesNoAtaque: acoesNoAtaque, acoesNoDano: acoesNoDano, acaoDeUso: acaoDeUso };
})(typeof window !== "undefined" ? window : globalThis);
