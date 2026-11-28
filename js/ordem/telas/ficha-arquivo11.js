/* =====================================================================
   R.A.M.A. — ficha de Ordem · Arquivos Secretos 11
   ---------------------------------------------------------------------
   O que o AS11 põe na ficha, sem tela própria:

     acoesNoTeste           no resultado de um teste: gastar DADOS DE
                            CAÇADA (Carcaças Vermelhas, p. 62) — o servidor
                            rola e grava pela operação ligada a esta
                            rolagem, e a repetição devolve o mesmo
                            resultado — e o +1d6 de Troca Tiro e Dá Porrada
                            (Bruna e Rômulo, p. 92 e 97) por 1 PE, em Luta
                            ou Pontaria
     modificadoresDoTeste   o +1d4 do Apfelstrudel (Sonnenblume, p. 77) nos
                            testes de resistência, até o fim da missão
     temporarios(o)         os pontos temporários do Sonnenblume com a
                            origem (a ficha os mostra junto dos outros)

   Os dados de caçada moram na campanha (aba Viagens): a ficha só lê o
   saldo do agente e pede o gasto ao servidor.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;

  function V() { return global.RAMAViagens || null; }
  function A3() { return global.RAMAOrdemArquivo3 || null; }
  function D() { return global.RAMADados; }

  function R() { return global.RAMAOrdemRegras; }
  function CD() { return global.RAMAOrdemCondicoes || null; }
  function permitido(ctx) { return !ctx.podeEditar || ctx.podeEditar(); }
  /* Gasta PE (ou PD) pelo caminho das ações de recurso (os temporários
     são gastos antes). */
  function gastar(ctx, quanto) {
    var o = ctx.ficha.ordem;
    var c = R().calcular(o, ctx.ficha.inventario);
    var qual = c.determinacao ? "pd" : "pe";
    var maximo = qual === "pe" ? c.pe.total : (c.pd ? c.pd.total : 0);
    var r = CD() ? CD().aplicarAcao(qual, "gastar", { cond: o.condicoes, temporarios: o.temporarios, atual: c.atual[qual], maximo: maximo, valor: quanto, pd: c.determinacao }) : null;
    if (!r || !r.ok) { UI.avisoAtencao((r && r.motivo) || "Sem " + qual.toUpperCase() + " suficientes."); return null; }
    if (!o.recursos) o.recursos = { pv: null, pe: null, san: null, pd: null };
    var antes = c.atual[qual];
    o.recursos[qual] = r.valor;
    return { texto: "Gastou " + quanto + " " + qual.toUpperCase() + " (" + antes + " → " + r.valor + ")." + (r.absorvido ? " " + r.absorvido + " temporário(s) primeiro." : "") };
  }
  function personagemDe(ctx) { var p = ctx.personagemId; return typeof p === "function" ? p() : (p || ""); }
  function campanhaDe(ctx) { return ctx.ficha && ctx.ficha.campanhaId ? ctx.ficha.campanhaId : ""; }

  /* ---------------------------------------------------------------
     O saldo de caçada do agente, lido da campanha (em segundo plano,
     uma vez por campanha; de novo depois de cada gasto).
     --------------------------------------------------------------- */
  var cache = { campanhaId: "", personagemId: "", carregado: false, carregando: false, saldo: 0, missao: false, encerrada: false };

  function carregarCaca(ctx) {
    var cid = campanhaDe(ctx), pid = personagemDe(ctx);
    if (!cid || !pid || !global.RAMAApi || !global.RAMAApi.lerViagens) return;
    if (cache.carregando || (cache.carregado && cache.campanhaId === cid && cache.personagemId === pid)) return;
    cache.carregando = true;
    global.RAMAApi.lerViagens(cid, { segundoPlano: true }).then(function (r) {
      cache.carregando = false;
      cache.campanhaId = cid; cache.personagemId = pid; cache.carregado = true;
      receber(r, pid);
    }, function () { cache.carregando = false; });
  }
  function receber(r, pid) {
    var d = r && r.ok ? r.dados || {} : {};
    var vg = null;
    if (d.mestre && d.estado && V()) vg = V().viagemAtual(V().normalizar(d.estado));
    else if (d.vista) vg = d.vista.viagem;
    var cv = vg && vg.carcacas;
    cache.missao = !!(cv && cv.agentes.indexOf(pid) >= 0);
    cache.encerrada = !!(cv && cv.encerrada);
    cache.saldo = cache.missao ? (cv.caca[pid] || 0) : 0;
  }

  function opId(prefixo) { return prefixo + "-" + String(U.uuid()).replace(/[^A-Za-z0-9]/g, "").slice(0, 22); }

  /* ---------------------------------------------------------------
     NO RESULTADO DO TESTE
     --------------------------------------------------------------- */

  function aliadosAcompanhando(o, flag) {
    var a = o && o.arquivo3;
    if (!a || !Array.isArray(a.aliados) || !A3()) return [];
    return a.aliados.filter(function (r) { var d = A3().EFEITOS_DE_ALIADO[r.catalogoId]; return r.ativo && d && d[flag]; });
  }

  function acoesNoTeste(ctx, o, p, r) {
    var saida = [];
    if (!permitido(ctx)) return saida;
    carregarCaca(ctx);
    var ultimo = r;
    function somar(valor, rot, notas) {
      ultimo = Object.assign({}, ultimo, { total: ultimo.total + valor, parcelas: (ultimo.parcelas || []).concat([{ rotulo: rot, valor: valor }]) });
      global.RAMARolagens.mostrar(ultimo, { nome: (p && p.nome ? p.nome : "Teste") + " · " + rot, notas: notas || [] });
    }

    /* Dados de caçada: +1d4 cada, ou +1d6 contra um Carcaça Vermelha. */
    if (cache.missao && !cache.encerrada && cache.saldo > 0 && campanhaDe(ctx)) {
      var operacao = opId("cc");
      var usado = false;
      saida.push({ rotulo: "Dados de caçada (" + cache.saldo + "): +1d4 cada…", aoClicar: function (cartao, botao) {
        if (usado) return;
        pedirCaca(function (q, contra) {
          if (botao) botao.disabled = true;
          global.RAMAApi.operarViagem(campanhaDe(ctx), operacao, { tipo: "caca_gastar", personagemId: personagemDe(ctx), quantidade: q, contraCarcaca: contra, teste: p && p.nome ? p.nome : "", rolagem: r && r.id ? String(r.id) : "" }).then(function (g) {
            if (!g.ok) {
              if (botao) botao.disabled = false;
              UI.avisoAtencao(g.motivo || "Não deu para gastar os dados de caçada.");
              return;
            }
            usado = true;
            var res = g.resultado && g.resultado.resultado;
            cache.carregado = false;
            receber(g, personagemDe(ctx));
            if (res) somar(res.total, "Caçada (" + res.quantidade + "d" + res.faces + " = " + res.valores.join(" + ") + ")", ["Dados de caçada" + (res.faces === 6 ? " contra um Carcaça Vermelha" : "") + " (Arquivos Secretos 11, p. 62). Saldo: " + res.saldo + "." + (g.repetida ? " (Resultado gravado: a repetição não rolou de novo.)" : "")]);
          });
        });
      } });
    }

    /* Troca Tiro e Dá Porrada (Bruna e Rômulo): 1 PE por +1d6 em Luta ou
       Pontaria. */
    if (p && (p.chave === "luta" || p.chave === "pontaria") && aliadosAcompanhando(o, "trocaTiro").length) {
      var feito = false;
      saida.push({ rotulo: "Troca Tiro e Dá Porrada: +1d6 (1 PE)", aoClicar: function (cartao, botao) {
        if (feito) return;
        var g = gastar(ctx, 1);
        if (!g) return;
        feito = true;
        if (botao) botao.disabled = true;
        ctx.alterou();
        var d = D().dano({ nome: "", dano: "1d6", danoExtra: "", critico: false });
        var v = d && d.ok ? d.total : 0;
        somar(v, "Troca Tiro e Dá Porrada (1d6 = " + v + ")", [g.texto]);
      } });
    }
    return saida;
  }

  function pedirCaca(fn) {
    var max = cache.saldo;
    var qtd = U.el("input.r-entrada.r-entrada--numero", { type: "text", inputmode: "numeric", value: "1", maxlength: 2, "aria-label": "Quantos dados de caçada" });
    var contra = U.el("input", { type: "checkbox" });
    UI.modal({
      titulo: "Dados de caçada",
      conteudo: [
        U.el("p.t-mini", { texto: "Você tem " + max + ". Cada um dá +1d4 neste teste; se o teste é diretamente contra um motociclista dos Carcaças Vermelhas (atacar ou resistir a um efeito dele), +1d6. Vários se somam." }),
        U.el("label.r-campo", {}, [U.el("span.t-mini", { texto: "Quantos" }), qtd]),
        U.el("label.r-marca", {}, [contra, U.el("span", { texto: "Contra um integrante dos Carcaças Vermelhas (d6)" })]),
      ],
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Gastar e somar", classe: "r-botao--principal", aoClicar: function (fechar) {
          var n = parseInt(qtd.value, 10) || 0;
          if (n < 1 || n > max) { UI.avisoAtencao("De 1 a " + max + "."); return false; }
          fechar();
          fn(n, contra.checked);
          return null;
        } },
      ],
    });
  }

  /* O +1d4 do Apfelstrudel nos testes de resistência, até o fim da
     missão (entra na rolagem como dado extra, com a origem). */
  function modificadoresDoTeste(ctx, o, contexto) {
    var c = contexto || {};
    if (!V() || !V().apfelstrudelAtivo(o)) return [];
    if (["fortitude", "reflexos", "vontade"].indexOf(c.pericia) < 0) return [];
    return [{ id: "as11-apfelstrudel", dado: "1d4", operacao: "+", rotulo: "Apfelstrudel (Sonnenblume, Arquivos Secretos 11, p. 77)" }];
  }
  function depoisDoTeste(ctx, r, mods) {
    if (!r || !Array.isArray(r.extras)) return [];
    r.extras.forEach(function (x) {
      var m = (mods || []).filter(function (y) { return y.id === x.id; })[0];
      if (m && !(r.parcelas || []).some(function (p) { return p.dadoExtraId === x.id; })) r.parcelas.push({ rotulo: m.rotulo + " (" + x.expressao + ")", valor: x.valor, dadoExtraId: x.id });
    });
    return [];
  }

  /* Os temporários do AS11 que ainda valem, com a origem. */
  function temporarios(o) {
    var a = o && o.arquivo11;
    if (!a || !Array.isArray(a.temporarios)) return [];
    return a.temporarios.filter(function (t) { return !t.expirado && !t.desfeito; });
  }

  /* Ajuda Como Dá (Nicole, p. 96): 1 PE para ela fazer algo simples; o
     mestre decide se ela consegue. */
  function ajudaComoDa(ctx, nome) {
    if (!permitido(ctx)) return;
    UI.pedirTexto({ titulo: "Ajuda Como Dá", rotulo: "O que " + (nome || "Nicole") + " faz por você (algo simples)?", valor: "", limite: 160 }).then(function (t) {
      if (!t) return;
      var g = gastar(ctx, 1);
      if (!g) return;
      ctx.alterou(); ctx.redesenhar();
      UI.aviso("Ajuda Como Dá: “" + t + "”. " + g.texto + " Ela é civil: o mestre decide se consegue fazer isso correndo risco de vida (Arquivos Secretos 11, p. 96).", { duracao: 9000 });
    });
  }

  global.RAMAFichaArquivo11 = { ajudaComoDa: ajudaComoDa, acoesNoTeste: acoesNoTeste, modificadoresDoTeste: modificadoresDoTeste, depoisDoTeste: depoisDoTeste, temporarios: temporarios, carregarCaca: carregarCaca };
})(window);
