/* =====================================================================
   R.A.M.A. — Ficha de Ordem · Arquivos Secretos 3
   =====================================================================
   A tela do que o AS3 põe numa ficha. A regra mora em
   js/ordem/arquivo3.js; aqui, só desenho, clique e gravação.

     painel(ctx)              no alto da aba Habilidades, só com o que se
                              aplica: cronologia, sacrifício, flagelo,
                              bônus recebidos de um performático, aliados
                              do AS3, batalha, recordações, paixão, circo,
                              veículos e animais
     controles(ctx, aq)       os botões no cartão de um poder do AS3
     acoesNoTeste             Entrada Triunfal, Papinho Sedutor, Direção
                              Precognitiva, Boas Recordações, aliados
                              (rolar de novo, trocar pelo valor guardado)
     acoesNoAtaque            Frase de Efeito e Rítmo Contagiante
     multiplicadorNoDano      a Frase de Efeito guardada
     noDano / acoesNoDano     Camiseta Psikolera, aliados, Mosh Pit,
                              Batalha de Intenções, Porrada Rítmica
     opcoesDoItem             Paçoca, Crânio, Gaiola, Bloody Mary,
                              Armadura dos Couraças, Instrumento
     noRitual                 Poder do Flagelo e Torvo em "Usar ritual"

   Nada é rolado sem clique, e nada narrativo é resolvido sozinho.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var el = U.el;

  function A3() { return global.RAMAOrdemArquivo3; }
  function R() { return global.RAMAOrdemRegras; }
  function P() { return global.RAMAOrdemPoderes; }
  function E() { return global.RAMAOrdemProgressao; }
  function C() { return global.RAMAOrdemCatalogo; }
  function D() { return global.RAMADados; }
  function CD() { return global.RAMAOrdemCondicoes || null; }
  function I() { return global.RAMAOrdemInventario || null; }
  function OPC() { return global.RAMAOrdemOpcionais || null; }
  function CR() { return global.RAMACriaturas || null; }

  function ordemDe(ctx) { return ctx.ficha.ordem; }
  function calc(ctx) { return R().calcular(ordemDe(ctx), ctx.ficha.inventario); }
  function salvar(ctx) { ctx.alterou(); ctx.redesenhar(); }
  function permitido(ctx) { return !ctx.podeEditar || ctx.podeEditar(); }

  function somar(expr) {
    var r = D() && D().somar ? D().somar(expr) : null;
    return r && r.ok !== false ? r : { total: 0, rolagens: [] };
  }
  function rolar(expr) { return somar(expr).total; }

  function estado(o) { return E() ? E().estado(o, null) : null; }
  function aquisicoes(o, chave) {
    var est = estado(o);
    return est ? est.adquiridos.filter(function (a) { return a.chave === chave && a.valido !== false; }) : [];
  }
  function tem(o, chave) { return aquisicoes(o, chave).length > 0; }
  function comAfinidade(o, chave) { return aquisicoes(o, chave).some(function (a) { return a.afinidade; }); }

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
  function sigla(o) { return R().usaDeterminacao(o) ? "PD" : "PE"; }

  function mexerRecurso(ctx, qual, delta) {
    var o = ordemDe(ctx);
    var c = calc(ctx);
    var maximo = qual === "pv" ? c.pv.total : qual === "pe" ? c.pe.total : qual === "san" ? c.san.total : (c.pd ? c.pd.total : 0);
    var atual = c.atual[qual];
    var novo = Math.max(0, Math.min(maximo, (Number(atual) || 0) + delta));
    if (!o.recursos) o.recursos = { pv: null, pe: null, san: null, pd: null };
    o.recursos[qual] = novo;
    return { antes: atual, depois: novo, maximo: maximo };
  }

  function botao(texto, aoClicar, op) {
    var x = op || {};
    return el("button.r-botao.r-botao--mini", { type: "button", texto: texto, disabled: !!x.desligado, title: x.dica || "", onclick: aoClicar });
  }
  function linha(texto) { return el("p.t-mini", { texto: texto }); }
  function titulo(texto) { return el("h4.t-secao", { texto: texto }); }
  function bloco(partes) { return el("div.pilha--curta", { class: "pilha" }, partes.filter(Boolean)); }

  /* A DT de um atributo: 10 + limite de PE (degraus) + atributo. */
  function dtDe(o, atributo) {
    var t = R().trilho(o);
    return 10 + (t.passos || 0) + R().atributo(o, atributo);
  }

  function regra(o, qual) { return A3() && A3().regraLigada(o, qual); }

  /* =================================================================
     ALIADOS DO AS3 NA FICHA
     ================================================================= */

  function catalogoDoAliado(a) {
    var c = a && a.criatura;
    var o = (c && c.origem) || {};
    return o.catalogoId || o.copiadoDe || "";
  }
  function aliadosAs3(ctx) {
    return (ctx.ficha.aliados || []).filter(function (a) { return /^as3\.criatura\./.test(catalogoDoAliado(a)); });
  }
  /* Habilidades com comportamento especial (rolar de novo, valor
     guardado), de qualquer aliado — inclusive uma cópia de Homebrew. */
  function especiais(ctx, tipo) {
    var l = [];
    (ctx.ficha.aliados || []).forEach(function (a) {
      ((a.criatura && a.criatura.habilidades) || []).forEach(function (h) {
        if (h.especial === tipo) l.push({ aliado: a, hab: h });
      });
    });
    return l;
  }
  function instancia(a) {
    var c = a.criatura;
    if (!c.instancia) c.instancia = { estados: {}, usos: {}, marcadores: {}, enigma: false, nota: "" };
    return c.instancia;
  }
  function marcar(a, chave, ligado) { return CR() ? CR().definirNaInstancia(a.criatura, "marcador:" + chave, !!ligado) : false; }
  function usoDe(a, chave) { return Number(instancia(a).usos[chave]) || 0; }
  function definirUso(a, chave, n) { return CR() ? CR().definirNaInstancia(a.criatura, "uso:" + chave, n) : false; }

  /* "Uma vez por cena": a marca guarda a cena; outra cena, outra marca. */
  function usadoNaCena(o, a, h) { return !!instancia(a).marcadores["cena." + h.id + "." + A3().cenaDe(o)]; }
  function marcarNaCena(o, a, h) {
    var inst = instancia(a);
    Object.keys(inst.marcadores).forEach(function (k) { if (k.indexOf("cena." + h.id + ".") === 0) marcar(a, k, false); });
    marcar(a, "cena." + h.id + "." + A3().cenaDe(o), true);
  }
  function usadoNaMissao(o, a, h) { return !!instancia(a).marcadores["missao." + h.id + "." + A3().dados(o).cronologia.missao]; }
  function marcarNaMissao(o, a, h) {
    var inst = instancia(a);
    Object.keys(inst.marcadores).forEach(function (k) { if (k.indexOf("missao." + h.id + ".") === 0) marcar(a, k, false); });
    marcar(a, "missao." + h.id + "." + A3().dados(o).cronologia.missao, true);
  }
  function guardados(a, h) {
    return [1, 2].map(function (i) { return { chave: h.id + ".d" + i, valor: usoDe(a, h.id + ".d" + i) }; }).filter(function (x) { return x.valor > 0; });
  }

  /* =================================================================
     O PAINEL
     ================================================================= */

  var PODERES_AS3 = ["guardiaoDaTropa", "vitalidadeSofrida", "flageloBemAproveitado", "recuperacaoFlagelante", "ambidestria",
    "entradaTriunfal", "papinhoSedutor", "conhecimentoDeDirecaoPrecognitiva", "instrumentoEletricoDeCombate",
    "ensaio", "fraseDeEfeito", "moshPit", "ritmoContagiante"];

  function contexto(ctx, o) {
    var a = A3().dados(o);
    var regras = Object.keys(A3().REGRAS).filter(function (k) { return regra(o, k); });
    var poderes = PODERES_AS3.filter(function (k) { return tem(o, k); });
    var itens = ((ctx.ficha.inventario && ctx.ficha.inventario.itens) || []).filter(function (i) { return /^as3\./.test(i.origemCatalogoId || ""); });
    var recebido = (a.ensaio && a.ensaio.origem === "aliado") || (a.ritmo && a.ritmo.origem === "aliado");
    return { a: a, regras: regras, poderes: poderes, itens: itens, aliados: aliadosAs3(ctx), recebido: recebido, flagelo: tem(o, "poderDoFlagelo") };
  }

  function painel(ctx) {
    if (!A3()) return null;
    var o = ordemDe(ctx);
    var k = contexto(ctx, o);
    var temAlgo = k.regras.length || k.poderes.length || k.itens.length || k.aliados.length || k.recebido || k.a.flagelo.pvGastos;
    if (!temAlgo) return null;

    var secoes = [secaoCronologia(ctx, o)];
    var resumo = [];
    if (regra(o, "sacrificio")) {
      secoes.push(secaoSacrificio(ctx, o));
      var ps = A3().poderDeSacrificio(o);
      if (ps) resumo.push("sacrifício: " + ps.entrada.nome);
    }
    if (k.flagelo || k.a.flagelo.pvGastos) secoes.push(secaoFlagelo(ctx, o));
    secoes.push(secaoPerformatico(ctx, o, k));
    if (k.aliados.length) secoes.push(secaoAliados(ctx, o, k.aliados));
    if (regra(o, "batalhas")) { secoes.push(secaoBatalha(ctx, o)); if (A3().batalhaAtiva(o)) resumo.push("batalha contra " + A3().batalhaAtiva(o).contra); }
    if (regra(o, "recordacoes")) secoes.push(secaoRecordacoes(ctx, o));
    if (regra(o, "paixao")) { secoes.push(secaoPaixao(ctx, o)); if (A3().paixoesValendo(o).length) resumo.push("apaixonado"); }
    if (regra(o, "circo")) secoes.push(secaoCirco(ctx, o));
    if (regra(o, "veiculos")) secoes.push(secaoVeiculos(ctx, o));
    if (regra(o, "animais")) secoes.push(secaoAnimais(ctx, o));

    return UI.recolhivel({
      titulo: "Arquivos Secretos 3",
      extra: resumo.join(" · ") || "cronologia, regras e itens do AS3",
      classe: "as3-painel",
      aberto: !!resumo.length,
      conteudo: el("div.pilha--curta.as3-secoes", { class: "pilha" }, secoes.filter(Boolean)),
    });
  }

  /* ---------- cronologia da campanha ---------- */

  function secaoCronologia(ctx, o) {
    var cr = A3().dados(o).cronologia;
    var nomes = { missao: "missão", dia: "dia", semana: "semana", sessao: "sessão" };
    return bloco([
      titulo("Cronologia da campanha"),
      linha("O que o livro mede em tempo (“uma vez por dia”, “24 horas”, “por sessão”, “a cada semana”) segue estes contadores, marcados à mão — nunca o relógio."),
      el("p.as3-cronologia", { texto: Object.keys(nomes).map(function (k) { return nomes[k].charAt(0).toUpperCase() + nomes[k].slice(1) + " " + cr[k]; }).join(" · ") }),
      permitido(ctx) ? el("div.faixa", {}, Object.keys(A3().MARCOS).map(function (k) {
        return botao(A3().MARCOS[k], function () {
          A3().avancar(o, k);
          salvar(ctx);
          UI.avisoOk(A3().MARCOS[k] + ": " + nomes[k] + " " + A3().dados(o).cronologia[k] + ".");
        });
      })) : null,
    ]);
  }

  /* ---------- sacrifício (p. 110-111) ---------- */

  function secaoSacrificio(ctx, o) {
    var s = A3().dados(o).sacrificio;
    var partes = [titulo("Sacrifício do Hexatombe")];
    partes.push(linha("Só é tragado pelo Hexatombe quem já carregou o Trono — “portador do Diabo” (Digno de Sacrifício, p. 110). A mesa registra; o estigma dá um poder, sem ocupar vaga."));
    partes.push(el("label.r-marca", {}, [
      el("input", { type: "checkbox", checked: s.digno, disabled: !permitido(ctx), onchange: function (ev) {
        var ligar = ev.target.checked;
        if (!ligar) { A3().registrarDigno(o, false); A3().registrarEstigma(o, ""); salvar(ctx); return; }
        UI.pedirTexto({ titulo: "Digno de Sacrifício", rotulo: "Quando carregou o Trono (nota da mesa)", valor: "", limite: 300 }).then(function (t) {
          if (t === null || t === undefined) { ev.target.checked = false; return; }
          A3().registrarDigno(o, true, ctx.ficha.nome || "", t);
          salvar(ctx);
        });
      } }),
      el("span", { texto: "Digno de Sacrifício" + (s.digno && s.dignoNota ? " — " + s.dignoNota : "") }),
    ]));
    if (s.digno) {
      partes.push(el("label.ordenacao", {}, [
        el("span.ordenacao__rotulo", { texto: "Estigma" }),
        el("select.r-selecao", { disabled: !permitido(ctx), onchange: function (ev) {
          var r = A3().registrarEstigma(o, ev.target.value, ctx.ficha.nome || "");
          if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
          salvar(ctx);
        } }, [el("option", { value: "", texto: "Nenhum (ainda não é sacrifício)" })].concat(A3().ESTIGMAS.map(function (e) {
          return el("option", { value: e.chave, selected: e.chave === s.estigma, texto: e.nome });
        }))),
      ]));
    }
    var p = A3().poderDeSacrificio(o);
    if (p) partes.push(cartaoDeSacrificio(ctx, o, p));
    return bloco(partes);
  }

  function cartaoDeSacrificio(ctx, o, p) {
    var e = p.entrada;
    var sc = e.sacrificio || {};
    var dt = dtDe(o, "pre") + 5;
    var s = A3().dados(o).sacrificio;
    var partes = [
      el("strong", { texto: e.nome + " · sacrifício do " + p.estigma.nome }),
      el("p", { texto: e.resumo }),
      sc.custo ? linha([sc.acao ? "Ação " + sc.acao : "", sc.custo + " " + sigla(o), sc.alcance ? "alcance " + sc.alcance : "", sc.alvo || "", sc.resistencia ? sc.resistencia + " DT " + dt + " (Pre + 5)" : "", sc.duracao ? "duração: " + sc.duracao : ""].filter(Boolean).join(" · ")) : null,
      el("ul.as3-ramos", {}, (sc.ramos || []).map(function (r) { return el("li", { texto: r.rotulo + ": " + r.texto }); })),
    ];
    if (e.chave === "frutoDaAmbicao") {
      partes.push(linha(s.fruto ? "Gatilho: " + (s.fruto.tipo === "ritual" ? "ritual " : "poder ") + s.fruto.nome + "." : "Escolha o poder ou ritual que vira gatilho."));
      if (permitido(ctx)) partes.push(botao(s.fruto ? "Trocar o gatilho…" : "Escolher o gatilho…", function () { escolherFruto(ctx, o); }));
      partes.push(linha("Ao usar o gatilho, a forma funciona como As Máscaras (AS2 p. 97): a seção Forma suprema (regra opcional Formas Supremas) ativa e cobra os custos dela."));
    } else if (permitido(ctx)) {
      partes.push(botao("Usar (" + sc.custo + " " + sigla(o) + ")", function () { usarSacrificio(ctx, o, p, dt); }));
    }
    if (s.usos.length) partes.push(linha("Usos registrados: " + s.usos.length + " (último em " + (s.usos[s.usos.length - 1].em || "").slice(0, 10) + ")."));
    return el("div.as3-cartao", {}, partes.filter(Boolean));
  }

  function usarSacrificio(ctx, o, p, dt) {
    var sc = p.entrada.sacrificio;
    var g = gastar(ctx, sc.custo);
    if (!g) return;
    A3().registrarUsoDeSacrificio(o, "");
    salvar(ctx);
    var notas = ["DT " + dt + " (Pre + 5). Gastou " + sc.custo + " " + g.qual + "."].concat((sc.ramos || []).map(function (r) { return r.rotulo + ": " + r.texto; }));
    var acoes = [];
    (sc.ramos || []).forEach(function (r) {
      if (r.rolagem) acoes.push({ rotulo: r.rotulo + ": " + r.rolagem, aoClicar: function () { mostrarRolagem(r.rolagem, p.entrada.nome + " · " + r.rotulo); } });
    });
    if (p.entrada.chave === "odioSuprimido") {
      acoes.push({ rotulo: "Marcar exausto (fim da explosão)", aoClicar: function () { UI.avisoAtencao("Registre a condição exausto em Condições: até o fim da cena (AS3 p. 111)."); } });
      notas.push("Os danos são os seus: corpo a corpo (desarmado ou a arma empunhada) e à distância (arma à distância ou pedras de 1d4 de impacto) — role pelas armas do inventário.");
    }
    global.RAMARolagens.mostrar({ ok: true, tipo: "info", nome: p.entrada.nome, expressao: "DT " + dt, total: dt, parcelas: [] },
      { nome: p.entrada.nome + " · sacrifício", notas: notas, acoes: acoes });
  }

  function mostrarRolagem(expr, nome) {
    var r = somar(expr);
    global.RAMARolagens.mostrar({ ok: true, tipo: "dano", nome: nome, expressao: expr, total: r.total,
      parcelas: [{ rotulo: expr, valor: r.total, detalhe: (r.rolagens || []).join(" + ") }] }, { nome: nome });
    return r;
  }

  function escolherFruto(ctx, o) {
    var opcoes = [];
    var est = estado(o);
    (est ? est.adquiridos : []).forEach(function (a) { if (a.nome && a.valido !== false) opcoes.push({ tipo: "poder", chave: a.chave, nome: a.nome }); });
    ((ctx.ficha.rituais && ctx.ficha.rituais.itens) || []).forEach(function (r) { if (r && r.nome) opcoes.push({ tipo: "ritual", chave: r.id || "", nome: r.nome }); });
    if (!opcoes.length) { UI.avisoAtencao("A ficha não tem poder nem ritual para escolher."); return; }
    var escolha = 0;
    var m = UI.modal({
      titulo: "Fruto da Ambição",
      conteudo: [
        linha("Escolha um poder ou ritual que o personagem conheça: usá-lo vira o gatilho da forma (AS3 p. 111)."),
        el("select.r-selecao", { "aria-label": "Gatilho", onchange: function (ev) { escolha = Number(ev.target.value) || 0; } },
          opcoes.map(function (x, i) { return el("option", { value: String(i), texto: (x.tipo === "ritual" ? "Ritual · " : "Poder · ") + x.nome }); })),
      ],
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Definir", classe: "r-botao--principal", aoClicar: function (fechar) {
          var x = opcoes[escolha];
          var r = A3().definirFruto(o, x.tipo, x.chave, x.nome);
          if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
          fechar();
          salvar(ctx);
        } },
      ],
    });
    return m;
  }

  /* ---------- flagelo ---------- */

  function secaoFlagelo(ctx, o) {
    var n = aquisicoes(o, "recuperacaoFlagelante").length;
    var e = A3().estadoDaRecuperacao(o, n);
    var partes = [titulo("Poder do Flagelo"),
      linha("PV pagos com o flagelo que ainda não voltaram: " + e.pvGastos + ". Taxa: " + A3().taxaDoFlagelo(tem(o, "flageloBemAproveitado")) + " PV por PE" +
        (tem(o, "flageloBemAproveitado") ? " (Flagelo Bem Aproveitado)" : "") + ". Esses PV só voltam com descanso" +
        (n ? ", salvo Recuperação Flagelante: " + e.restantes + " de " + e.maximo + " uso(s) desde o último interlúdio." : "."))];
    if (permitido(ctx) && e.pvGastos) {
      if (n) partes.push(botao("Recuperar PV do flagelo (Recuperação Flagelante)…", function () { recuperarFlagelo(ctx, o, n); }, { desligado: !e.restantes }));
      partes.push(botao("Descansei (os PV do flagelo voltam com o descanso)", function () {
        var r = A3().descansoDoFlagelo(o);
        salvar(ctx);
        UI.avisoOk(r.liberados + " PV do flagelo liberados: a cura é a do descanso, registrada nos recursos.");
      }));
    }
    return bloco(partes);
  }

  function recuperarFlagelo(ctx, o, n) {
    UI.pedirTexto({ titulo: "Recuperação Flagelante", rotulo: "Quantos PV a cura (ritual, item, poder) devolveu?", valor: "", limite: 4 }).then(function (t) {
      if (t === null || t === undefined) return;
      var r = A3().recuperarFlagelo(o, Number(t) || 0, n);
      if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
      var m = mexerRecurso(ctx, "pv", r.pv);
      salvar(ctx);
      UI.avisoOk("Recuperou " + r.pv + " PV do flagelo (PV " + m.antes + " → " + m.depois + "). Restam " + r.restantes + " uso(s) até o próximo interlúdio.");
    });
  }

  /* ---------- Combatente Performático: o que vem de um aliado ---------- */

  function secaoPerformatico(ctx, o, k) {
    var a = k.a;
    var minha = tem(o, "ensaio") || tem(o, "ritmoContagiante");
    var partes = [];
    var margem = A3().margemDoEnsaio(o);
    if (a.ensaio && a.ensaio.origem === "aliado") partes.push(linha("Ensaio com " + (a.ensaio.nome || "um performático") + ": +" + a.ensaio.bonus + " na margem " + (margem ? "até o próximo interlúdio." : "(vencido: já houve outro interlúdio).")));
    if (a.ritmo && a.ritmo.origem === "aliado") partes.push(linha("Rítmo Contagiante de " + (a.ritmo.nome || "um aliado") + ": +" + a.ritmo.bonus + " na Defesa " + (A3().defesaDoRitmo(o) ? "nesta cena." : "(outra cena: vencido).")));
    if (!permitido(ctx)) return partes.length ? bloco([titulo("Combatente Performático")].concat(partes)) : null;
    if (!minha && !partes.length && !k.regras.length && !k.poderes.length) return null;
    partes.push(el("div.faixa", {}, [
      botao("Ensaiei com um performático…", function () {
        UI.pedirTexto({ titulo: "Ensaio (interlúdio)", rotulo: "Com quem, e o bônus dele (1 a 4) — ex.: Ana 2", valor: "", limite: 60 }).then(function (t) {
          if (!t) return;
          var m = /(.*?)\s*([1-4])\s*$/.exec(String(t).trim());
          if (!m) { UI.avisoAtencao("Escreva o nome e o bônus (1 a 4), como “Ana 2”."); return; }
          var r = A3().ensaiar(o, Number(m[2]), "aliado", m[1]);
          if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
          salvar(ctx);
        });
      }),
      botao("Rítmo Contagiante de um aliado…", function () {
        UI.pedirTexto({ titulo: "Rítmo Contagiante", rotulo: "De quem, e o bônus atual (5 ou mais) — ex.: Caio 6", valor: "", limite: 60 }).then(function (t) {
          if (!t) return;
          var m = /(.*?)\s*(\d{1,2})\s*$/.exec(String(t).trim());
          if (!m || Number(m[2]) < 5) { UI.avisoAtencao("Escreva o nome e o bônus (5 ou mais), como “Caio 6”."); return; }
          A3().iniciarRitmo(o, "aliado", m[1], Number(m[2]));
          salvar(ctx);
        });
      }),
    ]));
    return bloco([titulo("Combatente Performático"), linha("Bônus que um aliado performático dá a quem ensaia com ele ou está perto no começo do combate (AS3 p. 119).")].concat(partes));
  }

  /* ---------- aliados do AS3 ---------- */

  function secaoAliados(ctx, o, aliados) {
    var partes = [titulo("Aliados do Arquivos Secretos 3"),
      linha("Ligue “acompanhando” enquanto o aliado estiver com o personagem: os bônus fixos entram nas contas. Os de custo e os condicionais aparecem nos resultados das rolagens.")];
    aliados.forEach(function (a) {
      var cat = catalogoDoAliado(a);
      var fixo = A3().EFEITOS_DE_ALIADO[cat];
      var reg = A3().registroDeAliado(o, a.id);
      var linhaA = [el("strong", { texto: a.criatura.nome })];
      if (fixo) {
        linhaA.push(el("label.r-marca", {}, [
          el("input", { type: "checkbox", checked: !!(reg && reg.ativo), disabled: !permitido(ctx), onchange: function (ev) {
            var r = A3().acompanhar(o, a.id, cat, a.criatura.nome, ev.target.checked);
            if (!r.ok) { UI.avisoAtencao(r.motivo); ev.target.checked = false; return; }
            salvar(ctx);
          } }),
          el("span", { texto: "Acompanhando — " + fixo.texto }),
        ]));
        if (fixo.escolha) {
          linhaA.push(linha("Perícias: " + (reg && reg.pericias.length ? reg.pericias.map(function (k) { return (C().pericia(k) || {}).nome || k; }).join(", ") : "escolha duas")));
          if (permitido(ctx)) linhaA.push(botao("Escolher as perícias…", function () { escolherPericiasDoAliado(ctx, o, a, cat); }));
        }
      }
      especiaisDoAliado(ctx, o, a).forEach(function (x) { linhaA.push(x); });
      partes.push(el("div.as3-cartao", {}, linhaA));
    });
    return bloco(partes);
  }

  function especiaisDoAliado(ctx, o, a) {
    var saida = [];
    ((a.criatura && a.criatura.habilidades) || []).forEach(function (h) {
      if (h.especial === "trocarPorGuardado") {
        var g = guardados(a, h);
        saida.push(linha(h.nome + ": " + (g.length ? "valores guardados " + g.map(function (x) { return x.valor; }).join(" e ") + " (até o fim da missão)." : (usadoNaMissao(o, a, h) ? "usado nesta missão." : "disponível nesta missão."))));
        if (permitido(ctx) && !usadoNaMissao(o, a, h)) {
          saida.push(botao(h.nome + " (" + (h.custo || "2 PE") + "): rolar 2d20 e anotar", function () {
            var custo = parseInt(h.custo, 10) || 0;
            if (custo && !gastar(ctx, custo)) return;
            var d1 = rolar("1d20"), d2 = rolar("1d20");
            definirUso(a, h.id + ".d1", d1);
            definirUso(a, h.id + ".d2", d2);
            marcarNaMissao(o, a, h);
            salvar(ctx);
            UI.avisoOk(h.nome + ": anotados " + d1 + " e " + d2 + ". Aparecem no resultado dos testes até o fim da missão.", { duracao: 7000 });
          }));
        }
        if (permitido(ctx) && g.length) {
          saida.push(botao("Usar um valor num teste de outro ser…", function () {
            UI.pedirTexto({ titulo: h.nome, rotulo: "Qual valor (" + g.map(function (x) { return x.valor; }).join(" ou ") + ")?", valor: String(g[0].valor), limite: 2 }).then(function (t) {
              var v = Number(t);
              var alvo = g.filter(function (x) { return x.valor === v; })[0];
              if (!alvo) return;
              definirUso(a, alvo.chave, 0);
              salvar(ctx);
              UI.avisoOk("O d20 mais alto daquele teste vira " + v + " (mesmo que seja menor). Valor gasto.");
            });
          }));
        }
      }
    });
    return saida;
  }

  function escolherPericiasDoAliado(ctx, o, a, cat) {
    var marcadas = ((A3().registroDeAliado(o, a.id) || {}).pericias || []).slice();
    var lista = el("div.pilha--curta", { class: "pilha" }, A3().PERICIAS_DE_INTELECTO.map(function (k) {
      return el("label.r-marca", {}, [
        el("input", { type: "checkbox", checked: marcadas.indexOf(k) >= 0, onchange: function (ev) {
          if (ev.target.checked) marcadas.push(k); else marcadas = marcadas.filter(function (x) { return x !== k; });
        } }),
        el("span", { texto: (C().pericia(k) || {}).nome || k }),
      ]);
    }));
    UI.modal({
      titulo: "Perícias de " + a.criatura.nome,
      conteudo: [linha("Duas perícias de Intelecto: você é considerado treinado nelas (AS3 p. 117)."), lista],
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Salvar", classe: "r-botao--principal", aoClicar: function (fechar) {
          var reg = A3().registroDeAliado(o, a.id);
          var r = A3().acompanhar(o, a.id, cat, a.criatura.nome, reg ? reg.ativo : false, marcadas);
          if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
          fechar();
          salvar(ctx);
        } },
      ],
    });
  }

  /* ---------- Batalha de Intenções (p. 120) ---------- */

  function secaoBatalha(ctx, o) {
    var b = A3().batalhaAtiva(o);
    var partes = [titulo("Batalha de Intenções"),
      linha(b ? "Em batalha contra " + b.contra + ": +1d10 de dano do mesmo tipo contra " + b.contra + "; todo dano que não venha dele cai à metade." : "Sem batalha em curso.")];
    if (!permitido(ctx)) return bloco(partes);
    if (b) {
      partes.push(el("div.faixa", {}, [
        botao("Sofrer dano…", function () { sofrerNaBatalha(ctx, o, b); }),
        botao("Encerrar a batalha", function () { A3().encerrarBatalha(o); salvar(ctx); }),
      ]));
    } else {
      partes.push(botao("Começar uma batalha…", function () {
        UI.pedirTexto({ titulo: "Batalha de Intenções", rotulo: "Contra quem (uma pessoa)", valor: "", limite: 80 }).then(function (t) {
          if (!t) return;
          var r = A3().iniciarBatalha(o, t);
          if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
          salvar(ctx);
        });
      }));
    }
    return bloco(partes);
  }

  function sofrerNaBatalha(ctx, o, b) {
    var doAlvo = false;
    var campo = UI.campo({ rotulo: "Dano (depois de RD)", valor: "", limite: 5 });
    UI.modal({
      titulo: "Dano na batalha",
      conteudo: [campo, el("label.r-marca", {}, [
        el("input", { type: "checkbox", onchange: function (ev) { doAlvo = ev.target.checked; } }),
        el("span", { texto: "Veio de " + b.contra + " (o alvo da batalha): sem redução" }),
      ])],
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Aplicar", classe: "r-botao--principal", aoClicar: function (fechar) {
          var bruto = Math.max(0, parseInt(campo.entrada.value, 10) || 0);
          var d = A3().danoNaBatalha(o, bruto, doAlvo);
          var m = mexerRecurso(ctx, "pv", -d);
          fechar();
          salvar(ctx);
          UI.avisoOk("Sofreu " + d + (d !== bruto ? " (metade de " + bruto + ")" : "") + ". PV " + m.antes + " → " + m.depois + ".");
        } },
      ],
    });
  }

  /* ---------- Boas Recordações (p. 123) ---------- */

  function secaoRecordacoes(ctx, o) {
    var r = A3().dados(o).recordacoes;
    var cr = A3().dados(o).cronologia;
    var partes = [titulo("Boas Recordações"),
      linha(r.fotos.length ? "Fotos: " + r.fotos.map(function (f) { return f.nome + " (+" + f.valor + " " + f.recurso.toUpperCase() + ")"; }).join(", ") + "." : "Nenhuma foto ainda."),
      linha(A3().bonusDeRecordacaoPendente(o) ? "+1d6 guardado para um teste até o fim do dia " + cr.dia + "." :
        (r.missaoUsada === cr.missao ? "Olhar a foto: já usado nesta missão." : "Olhar a foto: disponível nesta missão (ação padrão, +1d6 num teste até o fim do dia)."))];
    if (!permitido(ctx)) return bloco(partes);
    partes.push(el("div.faixa", {}, [
      botao("Tirar foto no circo…", function () {
        var recurso = "pv";
        UI.modal({
          titulo: "Foto no painel do circo",
          conteudo: [linha("Recupera 1d4 pontos — você escolhe PV, PE ou SAN."),
            el("select.r-selecao", { "aria-label": "Recurso", onchange: function (ev) { recurso = ev.target.value; } },
              [["pv", "PV"], ["pe", "PE"], ["san", "SAN"]].map(function (x) { return el("option", { value: x[0], texto: x[1] }); }))],
          botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Rolar 1d4", classe: "r-botao--principal", aoClicar: function (fechar) {
            var v = rolar("1d4");
            var qual = recurso === "pe" && R().usaDeterminacao(o) ? "pd" : recurso;
            var res = A3().registrarFoto(o, "Foto no circo", recurso, v);
            if (!res.ok) { UI.avisoAtencao(res.motivo); return; }
            var m = mexerRecurso(ctx, qual, v);
            fechar();
            salvar(ctx);
            UI.avisoOk("1d4 = " + v + ": " + qual.toUpperCase() + " " + m.antes + " → " + m.depois + ".");
          } }],
        });
      }),
      botao("Olhar a foto (ação padrão)", function () {
        var res = A3().olharFoto(o);
        if (!res.ok) { UI.avisoAtencao(res.motivo); return; }
        salvar(ctx);
        UI.avisoOk("+1d6 guardado: aparece no resultado do próximo teste de perícia, até o fim do dia.");
      }, { desligado: r.missaoUsada === cr.missao || !r.fotos.length }),
    ]));
    return bloco(partes);
  }

  /* ---------- Regras da Paixão (p. 124) ---------- */

  function secaoPaixao(ctx, o) {
    var lista = A3().dados(o).paixoes;
    var partes = [titulo("Paixão"),
      linha("Use só com o acordo de toda a mesa. Um laço com bônus por vez (1d8 PV e 1d8 PE, atuais e máximos, anotados à parte); apaixonado sofre penalidade igual a esse PV + PE nos testes contra a pessoa amada.")];
    lista.forEach(function (p) {
      var pen = A3().penalidadeDeApaixonado(p);
      partes.push(el("div.as3-cartao", {}, [
        el("strong", { texto: p.nome + (p.perdida ? " (perdido)" : "") }),
        linha(p.perdida ? "Laço perdido: " + p.perdida.motivo + (p.comBonus ? " Os +" + p.pv + " PV e +" + p.pe + " PE saíram para sempre." : "") :
          (p.comBonus ? "+" + p.pv + " PV e +" + p.pe + " PE. " : "Sem bônus (só a condição). ") + "Apaixonado: –" + pen + " nos testes contra " + p.nome + "."),
        !p.perdida && permitido(ctx) ? botao("O parceiro morreu…", function () {
          UI.confirmar({ titulo: "Perder o laço com " + p.nome + "?", texto: "Os PV e PE recebidos saem para sempre (atuais e máximos), e a condição apaixonado termina.", rotuloConfirmar: "Perder o laço", perigo: true }).then(function (sim) {
            if (!sim) return;
            var r = A3().perderPaixao(o, p.id, "O parceiro morreu.");
            if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
            /* "Perde permanentemente a quantidade recebida em PV e PE
               atuais e máximos": o máximo já saiu da conta; o atual também. */
            if (p.comBonus) { mexerRecurso(ctx, "pv", -p.pv); mexerRecurso(ctx, R().usaDeterminacao(o) ? "pd" : "pe", -p.pe); }
            salvar(ctx);
          });
        }) : null,
      ].filter(Boolean)));
    });
    if (permitido(ctx)) {
      partes.push(botao("Laço de intimidade (interlúdio)…", function () {
        UI.pedirTexto({ titulo: "Regras da Paixão", rotulo: "Com quem", valor: "", limite: 80 }).then(function (t) {
          if (!t) return;
          var pv = rolar("1d8"), pe = rolar("1d8");
          var r = A3().criarPaixao(o, t, pv, pe, "intimidade");
          if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
          if (r.comBonus) { mexerRecurso(ctx, "pv", pv); mexerRecurso(ctx, R().usaDeterminacao(o) ? "pd" : "pe", pe); }
          salvar(ctx);
          UI.avisoOk(r.comBonus ? "Apaixonado por " + t + ": +" + pv + " PV e +" + pe + " PE (1d8 cada), atuais e máximos." :
            "Apaixonado por " + t + ". Você já tem um laço com bônus: este é só a condição.", { duracao: 7000 });
        });
      }));
    }
    return bloco(partes);
  }

  /* ---------- Jogos do Circo (p. 122-123) ---------- */

  function secaoCirco(ctx, o) {
    var partidas = A3().dados(o).circo;
    var partes = [titulo("Jogos do Circo dos Irmãos Davo"),
      partidas.length ? linha("Partidas: " + partidas.slice(-5).map(function (p) { return (p.jogo === "dardos" ? "Dardos " : "Soco ") + p.pontos + " pts" + (p.quebrou ? " (quebrou a máquina!)" : ""); }).join(" · ")) : null];
    if (permitido(ctx)) {
      partes.push(el("div.faixa", {}, [
        botao("Acerte os Dardos (3 × Pontaria)", function () { jogarDardos(ctx, o); }),
        botao("Máquina de Soco…", function () { maquinaDeSoco(ctx, o); }),
      ]));
    }
    return bloco(partes);
  }

  function jogarDardos(ctx, o) {
    var dado = R().dadosDoTeste(o, "pontaria").expressao;
    var bonus = R().bonusDePericia(o, "pontaria", ctx.ficha.inventario).total;
    var total = 0;
    var linhas = [];
    for (var i = 1; i <= 3; i++) {
      var r = D().dependente({ expressao: dado, sigla: "", nome: "Dardo", bonus: bonus, modificadores: [] });
      var t = r && r.ok ? r.total : 0;
      var pts = A3().pontosDoDardo(t);
      total += pts;
      linhas.push("Dardo " + i + ": Pontaria " + t + " → " + pts + " pts");
    }
    A3().dados(o).circo.push({ id: "cir-" + U.uuid().replace(/[^A-Za-z0-9]/g, "").slice(0, 20), jogo: "dardos", pontos: total, detalhe: linhas.join("; "), quebrou: false, em: new Date().toISOString() });
    A3().dados(o).circo = A3().dados(o).circo.slice(-20);
    salvar(ctx);
    global.RAMARolagens.mostrar({ ok: true, tipo: "info", nome: "Acerte os Dardos", expressao: "3 × Pontaria", total: total,
      parcelas: linhas.map(function (l) { return { rotulo: l, valor: 0 }; }) }, {
      nome: "Acerte os Dardos · " + total + " pontos",
      notas: linhas.concat(["DT 10: 5 · 15: 10 · 20: 15 · 25: 25 · 30: 50. Some e compare com os outros; empate, a mesa decide."]),
    });
  }

  function maquinaDeSoco(ctx, o) {
    var tipo = "intenso";
    var gasto = 0;
    var c = calc(ctx);
    var limite = R().limiteDeEsforco(o).total || 1;
    var desarmado = "1d3";
    var campo = UI.campo({ rotulo: "Quanto gastar (de 2 em 2, até " + limite + ")", valor: "0", limite: 3 });
    var dano = UI.campo({ rotulo: "Seu dano desarmado", valor: desarmado, limite: 20, ajuda: "A expressão do seu ataque desarmado (sem o atributo; ele soma à parte)." });
    UI.modal({
      titulo: "Máquina de Soco",
      conteudo: [linha("Decida o golpe e o gasto ANTES de rolar. Descuidado: 2 PV para cada +2 de dano. Intenso: 2 PE para cada +2. Pontuação = dano × 100; 18 ou mais num soco quebra a máquina."),
        el("select.r-selecao", { "aria-label": "Golpe", onchange: function (ev) { tipo = ev.target.value; } }, [
          el("option", { value: "intenso", texto: "Golpe intenso (gasta PE)" }),
          el("option", { value: "descuidado", texto: "Golpe descuidado (gasta PV)" }),
        ]), campo, dano],
      botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Socar", classe: "r-botao--principal", aoClicar: function (fechar) {
        gasto = parseInt(campo.entrada.value, 10) || 0;
        var plano = A3().planoDoSoco(tipo, gasto, limite);
        if (!plano.ok) { UI.avisoAtencao(plano.motivo); return; }
        if (plano.gasto) {
          if (plano.recurso === "pe") { if (!gastar(ctx, plano.gasto)) return; }
          else { if (c.atual.pv <= plano.gasto) { UI.avisoAtencao("PV insuficientes."); return; } mexerRecurso(ctx, "pv", -plano.gasto); }
        }
        var expr = String(dano.entrada.value || "1d3").replace(/\s+/g, "");
        var r = somar(expr);
        var forca = R().atributo(o, "for");
        var d = r.total + forca + plano.bonus;
        var res = A3().resultadoDoSoco(d);
        A3().dados(o).circo.push({ id: "cir-" + U.uuid().replace(/[^A-Za-z0-9]/g, "").slice(0, 20), jogo: "soco", pontos: res.pontos,
          detalhe: tipo + ", gasto " + plano.gasto + ", dano " + d, quebrou: res.quebrou, em: new Date().toISOString() });
        A3().dados(o).circo = A3().dados(o).circo.slice(-20);
        fechar();
        salvar(ctx);
        global.RAMARolagens.mostrar({ ok: true, tipo: "dano", nome: "Máquina de Soco", expressao: expr, total: d,
          parcelas: [{ rotulo: expr, valor: r.total, detalhe: (r.rolagens || []).join(" + ") }, { rotulo: "Força", valor: forca }, { rotulo: "Golpe " + tipo, valor: plano.bonus }] },
          { nome: "Máquina de Soco · " + res.pontos + " pontos", notas: [res.quebrou ? "18 ou mais: a máquina quebrou!" : "Pontuação = dano × 100.", "Gastou " + plano.gasto + " " + plano.recurso.toUpperCase() + "."] });
      } }],
    });
  }

  /* ---------- Veículos (p. 125-131) ---------- */

  function secaoVeiculos(ctx, o) {
    var lista = A3().dados(o).veiculos;
    var partes = [titulo("Veículos operacionais")];
    if (!lista.length) partes.push(linha("Nenhum veículo. A categoria depende da patente mais alta do grupo (p. 126)."));
    lista.forEach(function (v) { partes.push(cartaoDeVeiculo(ctx, o, v)); });
    if (permitido(ctx) && lista.length < 8) {
      partes.push(botao("Novo veículo…", function () {
        var modelo = A3().MODELOS_VEICULO[0].chave;
        UI.modal({
          titulo: "Novo veículo",
          conteudo: [el("select.r-selecao", { "aria-label": "Modelo", onchange: function (ev) { modelo = ev.target.value; } }, A3().MODELOS_VEICULO.map(function (m) {
            return el("option", { value: m.chave, texto: m.nome + " — Def " + m.defesaBase + "+Agi, RD " + m.rd + ", " + m.pv + " PV, " + m.regalias + " regalia(s)" });
          }))],
          botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Criar", classe: "r-botao--principal", aoClicar: function (fechar) {
            var v = A3().novoVeiculo(modelo);
            A3().dados(o).veiculos.push(v);
            fechar();
            salvar(ctx);
          } }],
        });
      }));
    }
    return bloco(partes);
  }

  function cartaoDeVeiculo(ctx, o, v) {
    var c = A3().contasDoVeiculo(v);
    var m = c.modelo;
    var pen = A3().penalidadesDoVeiculo(v);
    var partes = [
      el("strong", { texto: v.nome === m.nome ? m.nome : v.nome + " · " + m.nome }),
      linha("Categoria " + m.categoria + " · " + m.tamanho + " · Defesa " + c.defesa.total + " (" + c.defesa.parcelas.map(function (p) { return p.rotulo + " " + p.valor; }).join(", ") + ") · pontos vitais " + c.defesaPontosVitais +
        " · RD " + c.rd.total + " · PV " + v.pvAtual + "/" + c.pvMaximo + (c.danificado ? " (danificado: deslocamento à metade, sem cobertura)" : "")),
      linha("Leva " + m.seres + " seres médios e " + m.carga + " espaços (" + m.total + " sem passageiros) · combustível " + v.combustivel + "d6" +
        (c.deslocamento ? " · manobra DT " + c.deslocamento.dt + ": " + c.deslocamento.metros + " m (" + c.deslocamento.quadrados + "q)" : " · sem velocidade de manobra nesta cena") +
        (c.pilotagem ? " · +" + c.pilotagem + " em Pilotagem" : "") + (c.dadosPilotagem ? " · " + c.dadosPilotagem + "d20 em Pilotagem (pneus)" : "")),
      linha("Regalias (" + v.regalias.length + "/" + m.regalias + "): " + (v.regalias.length ? v.regalias.map(function (r) {
        var d = A3().POR_REGALIA[r.chave];
        return d.nome + (r.pericia ? " (" + r.pericia + ")" : "") + (r.tipoDeDano ? " (" + r.tipoDeDano + ")" : "");
      }).join(", ") : "nenhuma")),
      pen.length ? linha("Penalidades: " + pen.map(function (p) { return p.nome; }).join(", ") + ".") : null,
      linha("Em combate: dirigir é ação completa (ou movimento com Pilotagem DT 20; falhar por 5+ causa acidente); colidir pede Reflexos contra a sua Pilotagem — 1d6 de impacto por 1,5 m (o veículo sofre metade); disparar de dentro sofre –1d20 (mirar para fora anula, sem cobertura); manobra evasiva (treinado, 1/rodada, reação) soma o bônus de Pilotagem na Defesa."),
    ];
    if (!permitido(ctx)) return el("div.as3-cartao", {}, partes.filter(Boolean));
    var acoes = [
      ["Motorista…", function () {
        UI.pedirTexto({ titulo: "Quem dirige", rotulo: "Nome e Agilidade (ex.: Ana 3)", valor: v.motorista ? v.motorista + " " + v.agiMotorista : "", limite: 60 }).then(function (t) {
          if (t === null || t === undefined) return;
          var mm = /(.*?)\s*(\d)\s*$/.exec(String(t).trim());
          v.motorista = mm ? mm[1] : String(t).trim();
          v.agiMotorista = mm ? Number(mm[2]) : 0;
          salvar(ctx);
        });
      }],
      ["Velocidade de manobra…", function () {
        UI.pedirTexto({ titulo: "Velocidade de manobra", rotulo: "Total do teste de Pilotagem do começo da cena" + (c.pilotagem ? " (com +" + c.pilotagem + " dos aprimoramentos)" : ""), valor: "", limite: 3 }).then(function (t) {
          if (t === null || t === undefined || t === "") return;
          var vel = A3().definirManobra(v, A3().cenaDe(o), Number(t) + 0);
          salvar(ctx);
          UI.avisoOk(vel ? "DT " + vel.dt + ": " + vel.metros + " m por rodada." : "Abaixo de DT 5: o veículo não manobra.");
        });
      }],
      ["Percurso (combustível)", function () {
        var n = A3().dadosARolar(v);
        var dados = [];
        for (var i = 0; i < n; i++) dados.push(rolar("1d6"));
        var r = A3().gastarCombustivel(v, dados);
        if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
        salvar(ctx);
        UI.avisoOk("Pilha " + r.antes + "d6 → " + r.depois + "d6" + (r.semCombustivel ? ": sem combustível!" : "."));
      }],
      ["Reabastecer", function () { A3().reabastecer(v); salvar(ctx); }],
      ["Galão (+2d6)", function () { A3().usarGalao(v); salvar(ctx); }],
      ["Sofrer dano…", function () { danoNoVeiculo(ctx, o, v); }],
      ["Reparar (interlúdio)…", function () {
        UI.pedirTexto({ titulo: "Reparar " + v.nome, rotulo: "Total do teste de Profissão (consertos)", valor: "", limite: 3 }).then(function (t) {
          if (t === null || t === undefined || t === "") return;
          var r = A3().repararVeiculo(v, Number(t));
          salvar(ctx);
          UI.avisoOk(r.plano.texto + " PV " + r.antes + " → " + r.depois + (r.tiradas.length ? "; sem " + r.tiradas.map(function (p) { return p.nome; }).join(", ") : "") + ".", { duracao: 7000 });
        });
      }],
      ["Regalias…", function () { editarRegalias(ctx, o, v); }],
    ];
    if (v.regalias.some(function (r) { return r.chave === "arsenalSecreto"; })) {
      acoes.push(["Arsenal Secreto (" + (v.usos.missao === A3().dados(o).cronologia.missao ? v.usos.arsenal : 0) + "/3)", function () {
        var r = A3().usarArsenal(v, A3().dados(o).cronologia.missao);
        if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
        salvar(ctx);
        UI.avisoOk("Arsenal Secreto: " + r.usados + "/3 nesta missão. Pegue o item (de uma patente que possa acessar) pela biblioteca do inventário.");
      }]);
    }
    acoes.push(["Remover", function () {
      UI.confirmar({ titulo: "Remover " + v.nome + "?", texto: "O veículo e o registro dele saem da ficha.", rotuloConfirmar: "Remover", perigo: true }).then(function (sim) {
        if (!sim) return;
        A3().dados(o).veiculos = A3().dados(o).veiculos.filter(function (x) { return x.id !== v.id; });
        salvar(ctx);
      });
    }]);
    partes.push(el("div.faixa.as3-faixa", {}, acoes.map(function (x) { return botao(x[0], x[1]); })));
    if (v.registro.length) partes.push(UI.recolhivel({ titulo: "Registro", extra: v.registro.length + " lançamento(s)",
      conteudo: el("ul.as3-registro", {}, v.registro.slice(-10).reverse().map(function (r) { return el("li", { texto: (r.em || "").slice(0, 10) + " · " + r.texto }); })) }));
    return el("div.as3-cartao", {}, partes.filter(Boolean));
  }

  function danoNoVeiculo(ctx, o, v) {
    var campo = UI.campo({ rotulo: "Dano do ataque", valor: "", limite: 5 });
    var ponto = "";
    UI.modal({
      titulo: "Dano em " + v.nome,
      conteudo: [campo, el("select.r-selecao", { "aria-label": "Ponto vital", onchange: function (ev) { ponto = ev.target.value; } }, [
        ["", "Lataria (Defesa normal)"], ["tanque", "Atingiu o tanque (arma de fogo)"], ["janelas", "Estilhaçou as janelas"], ["pneus", "Furou um pneu"], ["farois", "Quebrou os faróis"],
      ].map(function (x) { return el("option", { value: x[0], texto: x[1] }); })), linha("Pontos vitais têm Defesa do veículo +10 (p. 130).")],
      botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Aplicar", classe: "r-botao--principal", aoClicar: function (fechar) {
        var r = A3().danificarVeiculo(v, parseInt(campo.entrada.value, 10) || 0);
        var notas = [];
        if (ponto === "pneus") { v.danos.pneus = Math.min(8, v.danos.pneus + 1); notas.push("Pneu furado: –1d20 em Pilotagem e –3 m (cumulativo)."); }
        if (ponto === "janelas") { v.danos.janelas = true; notas.push("Cacos: o ser mais perto da janela sofre 2d4 de perfuração (Reflexos DT 20 reduz à metade)."); }
        if (ponto === "farois") { v.danos.farois = true; notas.push("Faróis quebrados: no escuro, é dirigir cego."); }
        if (ponto === "tanque") {
          v.danos.tanque = true;
          var d6 = rolar("1d6");
          notas.push("Tanque atingido: o piloto rola 1d6 = " + d6 + (d6 % 2 ? " (ímpar): EXPLODE — 12d6 num raio de 9 m (metade perfuração, metade fogo) e em chamas; quem está fora faz Reflexos DT 25 para metade e evitar a condição." : " (par): não explode."));
        }
        if (r.massivo) {
          var d8 = rolar("1d8");
          var def = A3().registrarDefeito(v, d8);
          notas.push("Dano massivo — 1d8 = " + d8 + ": " + def.defeito.nome + ". " + def.defeito.resumo);
        }
        fechar();
        salvar(ctx);
        UI.avisoOk("Veículo: " + r.efetivo + " de dano (PV " + r.antes + " → " + r.depois + ")." + (notas.length ? " " + notas.join(" ") : ""), { duracao: 9000 });
      } }],
    });
  }

  function editarRegalias(ctx, o, v) {
    var m = A3().contasDoVeiculo(v).modelo;
    var escolhidas = v.regalias.map(function (r) { return Object.assign({}, r); });
    var corpo = el("div.pilha--curta", { class: "pilha" });
    function pintar() {
      U.trocar(corpo, [linha("Até " + m.regalias + " regalia(s). Lataria Reforçada pode ser escolhida duas vezes.")].concat(A3().REGALIAS.map(function (d) {
        var n = escolhidas.filter(function (r) { return r.chave === d.chave; }).length;
        return el("div.faixa", {}, [
          el("span", { texto: d.nome + (n ? " ×" + n : "") + " — " + d.resumo }),
          botao("+", function () {
            if (escolhidas.length >= m.regalias) { UI.avisoAtencao("O veículo já tem " + m.regalias + " regalia(s)."); return; }
            if (n >= (d.maximo || 1)) return;
            var nova = { chave: d.chave, pericia: "", tipoDeDano: "" };
            if (d.pericia) {
              UI.pedirTexto({ titulo: d.nome, rotulo: "Perícia (exceto Luta, Pilotagem e Pontaria)", valor: "", limite: 40 }).then(function (t) {
                if (!t || /luta|pilotagem|pontaria/i.test(t)) { UI.avisoAtencao("Escolha uma perícia que não seja Luta, Pilotagem nem Pontaria."); return; }
                nova.pericia = t; escolhidas.push(nova); pintar();
              });
              return;
            }
            if (d.tipoDeDano) {
              UI.pedirTexto({ titulo: d.nome, rotulo: "Tipo de dano (impacto, corte ou perfuração)", valor: "impacto", limite: 20 }).then(function (t) {
                var tt = String(t || "impacto").toLowerCase();
                nova.tipoDeDano = ["impacto", "corte", "perfuração"].indexOf(tt) >= 0 ? tt : "impacto";
                escolhidas.push(nova); pintar();
              });
              return;
            }
            escolhidas.push(nova);
            pintar();
          }, { desligado: n >= (d.maximo || 1) }),
          n ? botao("−", function () { var i = escolhidas.map(function (r) { return r.chave; }).lastIndexOf(d.chave); escolhidas.splice(i, 1); pintar(); }) : null,
        ]);
      })));
    }
    pintar();
    UI.modal({ titulo: "Regalias de " + v.nome, largo: true, conteudo: [corpo], botoes: [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Salvar", classe: "r-botao--principal", aoClicar: function (fechar) {
        var novo = A3().normalizarVeiculo(Object.assign({}, v, { regalias: escolhidas }));
        v.regalias = novo.regalias;
        fechar();
        salvar(ctx);
      } },
    ] });
  }

  /* ---------- Animais treinados (p. 132-134) ---------- */

  function secaoAnimais(ctx, o) {
    var lista = A3().dados(o).animais;
    var vd = A3().vdDoAnimal(R().exposicao(o));
    var partes = [titulo("Animais treinados"),
      linha("Como aliado: copie o perfil (Serpente, Corvo ou Gato) na aba Aliados. Como ficha de ameaça da realidade: VD " + vd + " pelo NEX do dono — sem a redução de duas categorias —, imune a Presença Perturbadora, controlado pelo dono e aprovado pelo mestre.")];
    lista.forEach(function (a) {
      partes.push(el("div.as3-cartao", {}, [
        el("strong", { texto: a.nome + (a.especie ? " (" + a.especie + ")" : "") }),
        linha((a.modo === "ficha" ? "Ficha de ameaça da realidade, VD " + vd : "Aliado" + (a.perfil ? " · perfil " + a.perfil : "")) +
          " · " + (a.treinado ? "treinado" + (a.treino ? " (" + a.treino + ")" : "") : "sem treino — precisa de uma folga da Ordem (SaH p. 94)") +
          (a.modo === "ficha" ? " · " + (a.aprovado ? "aprovado pelo mestre" + (a.aprovadoPor ? " (" + a.aprovadoPor + ")" : "") : "aguardando aprovação do mestre") : "")),
        permitido(ctx) ? el("div.faixa", {}, [
          !a.treinado ? botao("Treinado numa folga…", function () {
            UI.pedirTexto({ titulo: "Treino de " + a.nome, rotulo: "Nota da folga (os testes de relacionamento não impedem o adestramento)", valor: "", limite: 300 }).then(function (t) {
              if (t === null || t === undefined) return;
              a.treinado = true; a.treino = String(t).slice(0, 300); salvar(ctx);
            });
          }) : null,
          a.modo === "ficha" && !a.aprovado ? botao("Aprovação do mestre", function () {
            a.aprovado = true; a.aprovadoPor = ctx.ficha.nome || ""; a.aprovadoEm = new Date().toISOString(); salvar(ctx);
          }) : null,
          a.modo === "ficha" ? botao("Montar a ficha (valores médios)…", function () { fichaDoAnimal(ctx, o, a, vd); }) : null,
          botao("Remover", function () { A3().dados(o).animais = A3().dados(o).animais.filter(function (x) { return x.id !== a.id; }); salvar(ctx); }),
        ].filter(Boolean)) : null,
      ].filter(Boolean)));
    });
    if (permitido(ctx) && lista.length < 8) {
      partes.push(botao("Registrar animal…", function () {
        var modo = "aliado", perfil = "";
        var nome = UI.campo({ rotulo: "Nome", valor: "", limite: 80 });
        var especie = UI.campo({ rotulo: "Espécie", valor: "", limite: 60 });
        UI.modal({
          titulo: "Animal treinado",
          conteudo: [nome, especie,
            el("select.r-selecao", { "aria-label": "Modo", onchange: function (ev) { modo = ev.target.value; } }, [
              el("option", { value: "aliado", texto: "Como aliado (OPRPG p. 170)" }), el("option", { value: "ficha", texto: "Como ficha de ameaça da realidade" })]),
            el("select.r-selecao", { "aria-label": "Perfil", onchange: function (ev) { perfil = ev.target.value; } }, [
              el("option", { value: "", texto: "Sem perfil especial" }), el("option", { value: "serpente", texto: "Serpente (p. 133)" }),
              el("option", { value: "corvo", texto: "Corvo (p. 133)" }), el("option", { value: "gato", texto: "Gato (p. 133)" })]),
            linha("Animais vindos de uma habilidade já chegam treinados; os adotados na história precisam de uma folga (SaH p. 94).")],
          botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Registrar", classe: "r-botao--principal", aoClicar: function (fechar) {
            var a = A3().normalizarAnimal({ id: "ani-" + U.uuid().replace(/[^A-Za-z0-9]/g, "").slice(0, 20), nome: nome.entrada.value, especie: especie.entrada.value, modo: modo, perfil: perfil });
            if (!a) { nome.marcarErro("Dê um nome."); return; }
            A3().dados(o).animais.push(a);
            fechar();
            salvar(ctx);
          } }],
        });
      }));
    }
    return bloco(partes);
  }

  /* A ficha do animal vira um aliado da ficha (cópia independente), com
     o editor de criaturas — e os valores médios do VD como ponto de
     partida, sem a redução das ameaças da realidade. */
  function fichaDoAnimal(ctx, o, a, vd) {
    if (!global.RAMAHomebrewCriatura || !CR()) return;
    var base = CR().criarOrdem({ nome: a.nome });
    base.natureza = "animal";
    base.ordem.tipo = "Animal";
    base.ordem.vd = vd;
    base.ordem.imunidades = ["Presença Perturbadora"];
    base.ordem.notas = ["Animal treinado (AS3 p. 134): VD pelo NEX do dono, sem a redução de duas categorias; imune a Presença Perturbadora. Ficha aprovada pelo mestre."];
    base = CR().normalizar(base);
    global.RAMAHomebrewCriatura.editar(base, null, {
      titulo: "Ficha de " + a.nome, destinoImagem: "aliado", animal: true,
      salvar: async function (criatura, imagem) {
        var nova = CR().criarAliado(criatura, imagem);
        ctx.ficha.aliados.push(nova);
        a.aliadoId = nova.id;
        ctx.alterou(); ctx.redesenhar();
      },
    });
  }

  /* =================================================================
     BOTÕES NOS CARTÕES DOS PODERES DO AS3
     ================================================================= */

  var CONTROLES = {
    guardiaoDaTropa: function (ctx, o) {
      var n = aquisicoes(o, "guardiaoDaTropa").length;
      var pend = A3().dados(o).guardiao.filter(function (g) { return g.resultado === "pendente"; });
      var l = [linha("Alcance: " + (n >= 2 ? "curto" : "adjacente") + ".")];
      if (!permitido(ctx)) return l;
      l.push(botao("Proteger um aliado (reação, 2 " + sigla(o) + ")", function () {
        if (!gastar(ctx, 2)) return;
        A3().usarGuardiao(o);
        salvar(ctx);
        UI.avisoOk("Você sofre o ataque ou a habilidade no lugar do aliado. Diga como terminou para saber se recupera 1 SAN.");
      }));
      pend.forEach(function (g) {
        l.push(el("div.faixa", {}, [
          el("span.t-mini", { texto: "Uso pendente (" + (g.em || "").slice(11, 16) + "):" }),
          botao("Não venceu a Defesa / não me afetou por completo (+1 SAN)", function () {
            var r = A3().resolverGuardiao(o, g.id, true);
            if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
            var m = mexerRecurso(ctx, "san", 1);
            salvar(ctx);
            UI.avisoOk("Guardião da Tropa: +1 SAN (" + m.antes + " → " + m.depois + ").");
          }),
          botao("Me atingiu", function () { A3().resolverGuardiao(o, g.id, false); salvar(ctx); }),
        ]));
      });
      return l;
    },
    recuperacaoFlagelante: function (ctx, o) {
      var n = aquisicoes(o, "recuperacaoFlagelante").length;
      var e = A3().estadoDaRecuperacao(o, n);
      return [linha("Usos entre interlúdios: " + e.restantes + " de " + e.maximo + ". PV do flagelo a recuperar: " + e.pvGastos + "."),
        permitido(ctx) && e.pvGastos ? botao("Recuperar PV do flagelo…", function () { recuperarFlagelo(ctx, o, n); }, { desligado: !e.restantes }) : null];
    },
    ambidestria: function (ctx, o) {
      var amb = A3().dados(o).ambidestria;
      var l = [];
      if (amb && amb.cena === A3().cenaDe(o) && !amb.semPenalidade) {
        l.push(linha("Penalidade ativa: –1d20 nos testes de ataque até o seu próximo turno."));
        if (permitido(ctx)) l.push(botao("Meu turno começou (encerrar a penalidade)", function () { A3().encerrarAmbidestria(o); salvar(ctx); }));
      }
      if (permitido(ctx)) l.push(botao("Agredir com as duas armas…", function () { atacarComDuas(ctx, o); }));
      return l;
    },
    entradaTriunfal: function (ctx, o) {
      var e = A3().estadoDaEntrada(o);
      var l = [linha(e.pendente ? "+1d20 guardado para o primeiro teste no ambiente (não Furtividade)." : e.usadaNaSessao ? "Já usada nesta sessão" + (e.transferida ? " (transferida a um aliado)." : ".") : "Disponível nesta sessão.")];
      if (!permitido(ctx)) return l;
      if (!e.usadaNaSessao) l.push(botao("Anunciar a chegada", function () {
        var r = A3().anunciarEntrada(o);
        if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
        salvar(ctx);
      }));
      if (e.pendente) l.push(botao("Transferir a um aliado (reação)", function () {
        A3().transferirEntrada(o);
        salvar(ctx);
        UI.avisoOk("O primeiro teste de um aliado em alcance longo, no mesmo ambiente, recebe +1d20 (exceto Furtividade).");
      }));
      return l;
    },
    instrumentoEletricoDeCombate: function (ctx, o) {
      var ins = A3().dados(o).instrumento;
      var item = ins.itemId ? ((ctx.ficha.inventario && ctx.ficha.inventario.itens) || []).filter(function (i) { return i.id === ins.itemId; })[0] : null;
      var l = [linha(item ? "Instrumento: " + item.nome + " (no inventário, ataque com Artes, dano 2d8 + Presença de Energia)." :
        (ins.itemId ? "O instrumento saiu do inventário: se quebrou, o poder pode ser usado num novo instrumento." : "Ainda sem instrumento: escolha antes da próxima missão ou no próximo interlúdio (o que vier primeiro)."))];
      if (ins.quebrados.length) l.push(linha("Quebrados: " + ins.quebrados.map(function (q) { return q.nome; }).join(", ") + "."));
      if (permitido(ctx) && !item) l.push(botao("Transformar um instrumento…", function () { criarInstrumento(ctx, o); }));
      if (permitido(ctx) && item) l.push(botao("O instrumento quebrou", function () {
        UI.confirmar({ titulo: "O instrumento quebrou?", texto: item.nome + " sai do inventário. O poder pode ser usado de novo num novo instrumento.", rotuloConfirmar: "Quebrou", perigo: true }).then(function (sim) {
          if (!sim) return;
          ins.quebrados.push({ nome: item.nome, em: new Date().toISOString(), motivo: "quebrou" });
          ctx.ficha.inventario.itens = ctx.ficha.inventario.itens.filter(function (i) { return i.id !== item.id; });
          ins.itemId = "";
          salvar(ctx);
        });
      }));
      return l;
    },
    ensaio: function (ctx, o) {
      var t = R().trilho(o);
      var b = A3().bonusDeEnsaio(t.nexEquivalente);
      var a = A3().dados(o);
      var vale = a.ensaio && a.ensaio.origem === "propria" && A3().margemDoEnsaio(o);
      return [linha(vale ? "Ensaiado: +" + a.ensaio.bonus + " na margem de ameaça até o próximo interlúdio." : "Bônus atual do Ensaio: +" + b + " na margem."),
        permitido(ctx) ? botao("Ensaiar combate (ação de interlúdio)", function () {
          var r = A3().ensaiar(o, b, "propria", "");
          if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
          salvar(ctx);
          UI.avisoOk("+" + b + " na margem dos seus ataques até o início da próxima cena de interlúdio. Quem ensaiar junto registra “Ensaiei com um performático” na própria ficha, com +" + b + ".", { duracao: 8000 });
        }) : null];
    },
    fraseDeEfeito: function (ctx, o) {
      if (!permitido(ctx)) return [];
      return [botao("Frase de Efeito no crítico de um aliado (2 " + sigla(o) + ")…", function () {
        UI.pedirTexto({ titulo: "Frase de Efeito", rotulo: "Multiplicador do crítico do aliado (ex.: 2)", valor: "2", limite: 2 }).then(function (t) {
          if (t === null || t === undefined) return;
          if (!gastar(ctx, 2)) return;
          var novo = A3().multiplicadorDaFrase(Number(t) || 2, R().atributo(o, "pre"));
          salvar(ctx);
          UI.avisoOk("O crítico do aliado usa ×" + novo + " (Presença " + R().atributo(o, "pre") + ").", { duracao: 7000 });
        });
      })];
    },
    ritmoContagiante: function (ctx, o) {
      var a = A3().dados(o);
      var ativo = a.ritmo && a.ritmo.origem === "propria" && a.ritmo.cena === A3().cenaDe(o);
      return [linha(ativo ? "Ativo nesta cena: +" + a.ritmo.bonus + " na Defesa (" + a.ritmo.criticos.length + " crítico(s) contados). Aliados em alcance médio registram o mesmo bônus na ficha deles." : "Comece no início de uma cena de combate."),
        permitido(ctx) && !ativo ? botao("Começar o combate (+5 na Defesa)", function () { A3().iniciarRitmo(o, "propria", ""); salvar(ctx); }) : null];
    },
  };

  function controles(ctx, aq) {
    var f = aq && CONTROLES[aq.chave];
    if (!f || !A3()) return null;
    var partes = f(ctx, ordemDe(ctx), aq);
    partes = (partes || []).filter(Boolean);
    return partes.length ? el("div.pilha--curta.origem-controles", { class: "pilha" }, partes) : null;
  }

  function armasDe(ctx) {
    return ((ctx.ficha.inventario && ctx.ficha.inventario.itens) || []).filter(function (i) { return i.tipo === "arma"; });
  }

  function atacarComDuas(ctx, o) {
    var armas = armasDe(ctx);
    if (armas.length < 2) { UI.avisoAtencao("O inventário precisa ter duas armas."); return; }
    var comTwf = tem(o, "combaterComDuasArmas");
    var a1 = armas[0].id, a2 = armas[1].id;
    function sel(atual, aoMudar) {
      return el("select.r-selecao", { onchange: function (ev) { aoMudar(ev.target.value); } }, armas.map(function (x) {
        var e = (I() ? I().dadosDoItem(x).arma : null) || {};
        return el("option", { value: x.id, selected: x.id === atual, texto: x.nome + (e.empunhadura === "leve" ? " (leve)" : e.empunhadura === "umaMao" ? " (uma mão)" : e.empunhadura === "duasMaos" ? " (duas mãos)" : "") });
      }));
    }
    UI.modal({
      titulo: "Ambidestria",
      conteudo: [linha(comTwf ? "Com Combater com Duas Armas: sem penalidade, e as duas podem ser de uma mão." : "Pelo menos uma arma leve. Os dois ataques e os seguintes, até o seu próximo turno, sofrem –1d20."),
        sel(a1, function (v) { a1 = v; }), sel(a2, function (v) { a2 = v; })],
      botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Atacar", classe: "r-botao--principal", aoClicar: function (fechar) {
        if (a1 === a2) { UI.avisoAtencao("Escolha duas armas diferentes."); return; }
        var x1 = U.porId(armas, a1), x2 = U.porId(armas, a2);
        var emp = [x1, x2].map(function (x) { return ((I() ? I().dadosDoItem(x).arma : null) || {}).empunhadura || ""; });
        if (emp.indexOf("duasMaos") >= 0) { UI.avisoAtencao("Armas de duas mãos não servem para empunhar duas ao mesmo tempo."); return; }
        if (!comTwf && emp.indexOf("leve") < 0) { UI.avisoAtencao("Sem Combater com Duas Armas, pelo menos uma das armas precisa ser leve."); return; }
        A3().usarAmbidestria(o, comTwf);
        fechar();
        salvar(ctx);
        var S = global.RAMASecaoOrdemInventario;
        if (S) { S.rolarAtaque(ctx, x1, { nota: "Ambidestria: primeiro ataque." }); S.rolarAtaque(ctx, x2, { nota: "Ambidestria: segundo ataque." }); }
      } }],
    });
  }

  function criarInstrumento(ctx, o) {
    var nome = UI.campo({ rotulo: "O instrumento", valor: "", limite: 60, ajuda: "Um que você saiba tocar e esteja com você." });
    UI.modal({
      titulo: "Instrumento Elétrico de Combate",
      conteudo: [linha("Vira, para sempre, uma arma tática amaldiçoada de Energia: duas mãos, à distância (alcance curto), ataque com Artes, 2d8 de Energia + Presença, crítico 20/x2, categoria II, 2 espaços. Só você é proficiente."), nome],
      botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Criar a arma", classe: "r-botao--principal", aoClicar: function (fechar) {
        var n = String(nome.entrada.value || "").trim();
        if (!n) { nome.marcarErro("Qual instrumento?"); return; }
        var F = global.RAMAFicha;
        var item = F.criarItem("arma", {
          nome: (n + " elétrico").slice(0, 80), categoria: "Armas", origemCatalogoId: "",
          descricao: "Instrumento Elétrico de Combate (Arquivos Secretos 3, p. 109): arma tática amaldiçoada de Energia que só o dono é proficiente em usar. Duas mãos; ataca à distância 1 alvo à escolha em alcance curto com ondas sonoras (com afinidade: todos os alvos à escolha no alcance); ataque com Artes; 2d8 de Energia + Presença; crítico 20/x2; categoria II; 2 espaços. Quebra se o dono morrer.",
          dano: "2d8", critico: 20, multiplicador: 2,
          ordem: { categoria: 2, espacos: 2, quantidade: 1, grupo: "arma", amaldicoado: true, elemento: "energia", pericia: "artes",
            referencia: { fonte: "AS3", pagina: 109 },
            arma: { proficiencia: "tatica", tipo: "distancia", empunhadura: "duasMaos", alcance: "curto", tipoDano: "Energia", atributoDano: "pre" } },
        });
        item.adicionadoEm = new Date().toISOString();
        ctx.ficha.inventario.itens.push(item);
        var ins = A3().dados(o).instrumento;
        ins.itemId = item.id;
        ins.nome = item.nome;
        ins.criadoEm = item.adicionadoEm;
        fechar();
        salvar(ctx);
        UI.avisoOk(item.nome + " está no inventário.", { duracao: 6000 });
      } }],
    });
  }

  /* =================================================================
     NO RESULTADO DE UM TESTE DE PERÍCIA
     ================================================================= */

  /* +N dados num teste já rolado: com dados "o maior vale", o dado novo
     entra no mesmo teste; com penalidade de dados, rola de novo. */
  function comMaisDados(r, expressao, n, rotulo) {
    var sel = r.selecao || "maior";
    if (sel === "maior" || (r.rolagens || []).length <= 1 && !/^-/.test(String(expressao))) {
      var novos = [];
      for (var i = 0; i < n; i++) novos.push(rolar("1d20"));
      var todos = (r.rolagens || []).concat(novos);
      var natural = Math.max.apply(null, todos);
      return Object.assign({}, r, { rolagens: todos, natural: natural, total: r.total - r.natural + natural,
        parcelas: [{ rotulo: "Dado (" + todos.join(", ") + ")", valor: natural }].concat((r.parcelas || []).slice(1)),
        notaExtra: rotulo + ": +" + n + "d20 (" + novos.join(", ") + ")." });
    }
    return null;
  }

  function acoesNoTeste(ctx, o, p, r, dado, bonus, atributo) {
    if (!A3()) return [];
    var saida = [];
    var unico = function (rotulo, f) {
      var usado = false;
      saida.push({ rotulo: rotulo, aoClicar: function (cartao, b) { if (usado) return; if (f() !== false) { usado = true; if (b) b.disabled = true; } } });
    };
    var mostrar = function (novo, nome, notas) { global.RAMARolagens.mostrar(novo, { nome: p.nome + " · " + nome, notas: notas }); };
    var somarAoTeste = function (valor, rot) {
      return Object.assign({}, r, { total: r.total + valor, parcelas: (r.parcelas || []).concat([{ rotulo: rot, valor: valor }]) });
    };

    var e = A3().dados(o).entrada;
    if (e.pendente && p.chave !== "furtividade" && permitido(ctx)) {
      unico("Entrada Triunfal: +1d20", function () {
        var c = A3().consumirEntrada(o, p.chave);
        if (!c.ok) { UI.avisoAtencao(c.motivo); return false; }
        salvar(ctx);
        var novo = comMaisDados(r, dado, 1, "Entrada Triunfal");
        if (novo) { mostrar(novo, "Entrada Triunfal", [novo.notaExtra]); return; }
        var re = D().dependente({ expressao: R().dadosDoTeste(o, p.chave).expressao, sigla: "", nome: p.nome, bonus: bonus.total, modificadores: [] });
        var mais = global.RAMAOrdemEfeitos ? global.RAMAOrdemEfeitos.expressaoDeDados(R().dadosDoTeste(o, p.chave).quantos + 1) : "";
        if (mais) re = D().dependente({ expressao: mais, sigla: "", nome: p.nome, bonus: bonus.total, modificadores: [] });
        mostrar(re, "Entrada Triunfal", ["O teste tinha penalidade de dados: rolado de novo com +1d20 (" + (mais || "") + ")."]);
      });
    }
    if (A3().bonusDeRecordacaoPendente(o) && permitido(ctx)) {
      unico("Boas Recordações: +1d6", function () {
        var g = A3().gastarRecordacao(o);
        if (!g.ok) { UI.avisoAtencao(g.motivo); return false; }
        var v = rolar("1d6");
        salvar(ctx);
        mostrar(somarAoTeste(v, "Boas Recordações (1d6)"), "Boas Recordações", ["+1d6 = " + v + " (uma vez, até o fim do dia)."]);
      });
    }
    if (atributo === "pre" && tem(o, "papinhoSedutor") && permitido(ctx)) {
      unico("Papinho Sedutor: +5 para seduzir (1 " + sigla(o) + ")", function () {
        var g = gastar(ctx, 1);
        if (!g) return false;
        salvar(ctx);
        mostrar(somarAoTeste(5, "Papinho Sedutor"), "Papinho Sedutor", ["Só vale para seduzir. Passando, o alvo fica apaixonado por você — e pode virar um problema, a critério do mestre (AS3 p. 109)."]);
      });
    }
    if ((p.chave === "percepcao" || p.chave === "sobrevivencia") && tem(o, "conhecimentoDeDirecaoPrecognitiva")) {
      var v = comAfinidade(o, "conhecimentoDeDirecaoPrecognitiva") ? 10 : 5;
      unico("Direção Precognitiva: +" + v + " (só para se orientar)", function () {
        mostrar(somarAoTeste(v, "Direção Precognitiva"), "Direção Precognitiva", ["Só para se localizar ou se orientar até um local (AS3 p. 109)."]);
      });
    }
    /* Aliados: rolar de novo e ficar com o melhor (Alê, uma vez por cena). */
    especiais(ctx, "rolarDeNovoMelhor").forEach(function (x) {
      var porCena = x.hab.limite && x.hab.limite.periodo === "cena";
      if (porCena && usadoNaCena(o, x.aliado, x.hab)) return;
      if (!permitido(ctx)) return;
      unico(x.aliado.criatura.nome + ": rolar de novo (fica o melhor)", function () {
        if (porCena) marcarNaCena(o, x.aliado, x.hab);
        ctx.alterou();
        var re = D().dependente({ expressao: dado, sigla: "", nome: p.nome, bonus: bonus.total, modificadores: [] });
        var melhor = re.total > r.total ? re : r;
        mostrar(Object.assign({}, melhor, { parcelas: (melhor.parcelas || []) }), "de novo (" + x.aliado.criatura.nome + ")",
          ["Primeiro: " + r.total + " · de novo: " + re.total + " → fica o melhor, " + melhor.total + "." + (porCena ? " Uma vez por cena." : "")]);
      });
    });
    /* Aliados: trocar o d20 mais alto por um valor guardado (Alê, Prever
       Resultados) — vale no lugar, mesmo que seja menor. */
    especiais(ctx, "trocarPorGuardado").forEach(function (x) {
      if (!permitido(ctx)) return;
      guardados(x.aliado, x.hab).forEach(function (g) {
        unico(x.hab.nome + ": d20 mais alto vira " + g.valor, function () {
          definirUso(x.aliado, g.chave, 0);
          ctx.alterou();
          var rol = (r.rolagens || []).slice();
          var i = rol.indexOf(Math.max.apply(null, rol));
          var antes = rol[i];
          rol[i] = g.valor;
          var natural = r.selecao === "menor" ? Math.min.apply(null, rol) : Math.max.apply(null, rol);
          mostrar(Object.assign({}, r, { rolagens: rol, natural: natural, total: r.total - r.natural + natural,
            parcelas: [{ rotulo: "Dado (" + rol.join(", ") + ")", valor: natural }].concat((r.parcelas || []).slice(1)) }),
            x.hab.nome, ["O d20 mais alto (" + antes + ") virou " + g.valor + ", mesmo que seja menor. O valor foi gasto."]);
        });
      });
    });
    return saida;
  }

  /* =================================================================
     NO ATAQUE E NO DANO
     ================================================================= */

  /* Depois do ataque: Rítmo Contagiante conta o crítico (uma vez, pelo
     id desta rolagem) e Frase de Efeito oferece o multiplicador. */
  function acoesNoAtaque(ctx, arma, r, critico, ef) {
    if (!A3() || !critico) return { acoes: [], notas: [] };
    var o = ordemDe(ctx);
    var notas = [];
    var acoes = [];
    var id = "atk-" + U.uuid().replace(/[^A-Za-z0-9]/g, "").slice(0, 24);
    var rit = A3().criticoNoRitmo(o, id);
    if (rit.ok) { ctx.alterou(); notas.push("Rítmo Contagiante: +1 na Defesa (agora +" + rit.bonus + ")."); }
    if (tem(o, "fraseDeEfeito") && permitido(ctx)) {
      var pre = R().atributo(o, "pre");
      var novo = A3().multiplicadorDaFrase(ef.multiplicador, pre);
      var usado = false;
      acoes.push({ rotulo: "Frase de Efeito: ×" + novo + " (2 " + sigla(o) + ")", aoClicar: function (cartao, b) {
        if (usado) return;
        if (!gastar(ctx, 2)) return;
        usado = true;
        if (b) b.disabled = true;
        A3().guardarFrase(o, novo);
        salvar(ctx);
        UI.avisoOk("O dano deste crítico usa ×" + novo + ". Role o dano crítico.");
      } });
    }
    return { acoes: acoes, notas: notas };
  }

  function multiplicadorNoDano(ctx, critico) {
    if (!A3() || !critico) return 0;
    var m = A3().consumirFrase(ordemDe(ctx));
    if (m) ctx.alterou();
    return m || 0;
  }

  function acompanhando(ctx, o, cat) {
    var a = (ctx.ficha.aliados || []).filter(function (x) { return catalogoDoAliado(x) === cat; })[0];
    if (!a) return null;
    var reg = A3().registroDeAliado(o, a.id);
    return reg && reg.ativo ? a : null;
  }

  /* Somado na rolagem de dano de arma, sem clique: Camiseta Psikolera e
     o Bônus de Argano e Ana (quando acompanham). */
  function noDano(ctx, arma, r, ef) {
    if (!A3()) return [];
    var o = ordemDe(ctx);
    var notas = [];
    var itens = (ctx.ficha.inventario && ctx.ficha.inventario.itens) || [];
    var camiseta = itens.filter(function (i) { return i.origemCatalogoId === "as3.amaldicoado.camiseta-psikolera" && I() && I().dadosDoItem(i).vestida; })[0];
    if (camiseta && R().machucado && R().machucado(o)) {
      var c = somar("2d8");
      r.parcelas.push({ rotulo: "Camiseta Psikolera (2d8 Sangue)", valor: c.total, detalhe: (c.rolagens || []).join(" + ") });
      r.total += c.total;
      notas.push("Camiseta Psikolera: machucado, +2d8 de Sangue.");
    }
    if (acompanhando(ctx, o, "as3.criatura.argano-aliado")) {
      var g = somar("1d12");
      r.parcelas.push({ rotulo: "Bônus de Argano (1d12 perfuração)", valor: g.total });
      r.total += g.total;
    }
    var a = (I() ? I().dadosDoItem(arma).arma : null) || {};
    if (a.tipo === "corpoACorpo" && acompanhando(ctx, o, "as3.criatura.ana-aliado") && r.faces) {
      var n = rolar("1d" + r.faces);
      r.parcelas.push({ rotulo: "Bônus de Ana (+1d" + r.faces + ")", valor: n });
      r.total += n;
    }
    return notas;
  }

  /* No resultado do dano: o que custa ou depende da cena. */
  function acoesNoDano(ctx, arma, r) {
    if (!A3()) return [];
    var o = ordemDe(ctx);
    var saida = [];
    var mostrarSoma = function (nome, valor, rot, notas) {
      global.RAMARolagens.mostrar(Object.assign({}, r, { total: r.total + valor, parcelas: (r.parcelas || []).concat([{ rotulo: rot, valor: valor }]) }), { nome: arma.nome + " · " + nome, notas: notas || [] });
    };
    function unico(rotulo, f) {
      var usado = false;
      saida.push({ rotulo: rotulo, aoClicar: function (cartao, b) { if (usado) return; if (f() !== false) { usado = true; if (b) b.disabled = true; } } });
    }
    var b = A3().batalhaAtiva(o);
    if (b) unico("Contra " + b.contra + ": +1d10 (batalha)", function () { var v = rolar("1d10"); mostrarSoma("Batalha de Intenções", v, "Batalha (1d10)", ["Só contra o alvo da batalha."]); });
    var a = (I() ? I().dadosDoItem(arma).arma : null) || {};
    if (tem(o, "moshPit") && a.tipo === "corpoACorpo") {
      unico("Mosh Pit…", function () {
        UI.pedirTexto({ titulo: "Mosh Pit", rotulo: "Quantos cercam o alvo, contando você (até 5d6)", valor: "2", limite: 2 }).then(function (t) {
          var n = A3().dadosDoMoshPit(t);
          if (!n) return;
          var s = somar(n + "d6");
          mostrarSoma("Mosh Pit", s.total, "Mosh Pit (" + n + "d6)", ["Flanqueando: +1d6 por quem cerca o alvo, até +5d6 (AS3 p. 119)."]);
        });
      });
    }
    if (permitido(ctx) && acompanhandoQualquer(ctx, "as3.criatura.cindy-aliado")) {
      unico("Tiro de Aviso (Cindy): +2d8 balístico (2 " + sigla(o) + ")", function () {
        if (!gastar(ctx, 2)) return false;
        salvar(ctx);
        var s = somar("2d8");
        mostrarSoma("Tiro de Aviso", s.total, "Tiro de Aviso (2d8 balístico)", ["Ao acertar um ataque (AS3 p. 118)."]);
      });
    }
    especiais(ctx, "rolarDeNovoObrigatorio").forEach(function (x) {
      if (!permitido(ctx)) return;
      unico(x.aliado.criatura.nome + ": rolar de novo os 1 e 2 (" + (x.hab.custo || "1 PE") + ")", function () {
        var custo = parseInt(x.hab.custo, 10) || 0;
        if (custo && !gastar(ctx, custo)) return false;
        salvar(ctx);
        var base = (r.rolagens || []).map(function (d) { return d <= 2 ? rolar("1d" + r.faces) : d; });
        var extraFaces = /d(\d+)$/.exec(r.extraExpressao || "");
        var extra = (r.extraRolagens || []).map(function (d) { return d <= 2 && extraFaces ? rolar("1d" + extraFaces[1]) : d; });
        var somaB = base.reduce(function (t, n) { return t + n; }, 0);
        var somaE = extra.reduce(function (t, n) { return t + n; }, 0);
        var antes = (r.somaBase || 0) + ((r.extraRolagens || []).reduce(function (t, n) { return t + n; }, 0));
        var total = r.total - antes + somaB + somaE;
        global.RAMARolagens.mostrar(Object.assign({}, r, { rolagens: base, total: total,
          parcelas: [{ rotulo: r.expressao, valor: somaB, detalhe: base.join(" + ") }].concat(r.extraRolagens ? [{ rotulo: "Extra " + r.extraExpressao, valor: somaE, detalhe: extra.join(" + ") }] : [])
            .concat((r.parcelas || []).slice(r.extraRolagens ? 2 : 1)) }),
          { nome: arma.nome + " · " + x.hab.nome, notas: ["Os 1 e 2 foram rolados de novo e os novos valem, mesmo se forem menores. Uma vez por rolagem de dano."] });
      });
    });
    return saida;
  }

  /* =================================================================
     ITENS DO AS3 NO INVENTÁRIO
     ================================================================= */

  function doCatalogo(item, id) { return item && item.origemCatalogoId === id; }

  function gastarUnidade(ctx, item) {
    if (!item.ordem) item.ordem = {};
    var q = Math.max(1, Number(item.ordem.quantidade) || 1);
    if (q > 1) item.ordem.quantidade = q - 1;
    else ctx.ficha.inventario.itens = ctx.ficha.inventario.itens.filter(function (x) { return x !== item; });
  }

  function opcoesDoItem(ctx, item) {
    if (!A3() || !permitido(ctx)) return [];
    var o = ordemDe(ctx);
    var l = [];
    if (doCatalogo(item, "as3.geral.pacoca")) {
      l.push({ rotulo: "Comer (prato rápido)", aoClicar: function () { gastarUnidade(ctx, item); salvar(ctx); UI.aviso("Paçoca comida: conta como prato rápido (OPRPG p. 93)."); } });
      l.push({ rotulo: "Comer em ocasião especial (mestre: 1d8+1 PV, PE e SAN)…", aoClicar: function () {
        var r = A3().usarPacoca(o);
        if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
        var v = rolar("1d8+1");
        var pv = mexerRecurso(ctx, "pv", v), pe = mexerRecurso(ctx, R().usaDeterminacao(o) ? "pd" : "pe", v), san = mexerRecurso(ctx, "san", v);
        gastarUnidade(ctx, item);
        salvar(ctx);
        UI.avisoOk("1d8+1 = " + v + ": PV " + pv.antes + "→" + pv.depois + ", PE " + pe.antes + "→" + pe.depois + ", SAN " + san.antes + "→" + san.depois + ". Uma vez por dia.", { duracao: 8000 });
      } });
    }
    if (doCatalogo(item, "as3.geral.bloody-mary-batizada")) {
      l.push({ rotulo: "Beber (tira uma condição mental e/ou de medo; 2d4 mental)", aoClicar: function () {
        var v = rolar("2d4");
        gastarUnidade(ctx, item);
        salvar(ctx);
        global.RAMARolagens.mostrar({ ok: true, tipo: "dano", nome: "Bloody Mary Batizada", expressao: "2d4", total: v, parcelas: [{ rotulo: "2d4 mental", valor: v }] },
          { nome: "Bloody Mary Batizada", notas: ["Tire uma condição mental e/ou de medo em Condições.", "Aplique os " + v + " de dano mental em Sanidade (com as regras de dano mental)."] });
      } });
    }
    if (doCatalogo(item, "as3.paranormal.cranio-dominador")) {
      var disp = A3().cranioDisponivel(o);
      l.push({ rotulo: disp ? "Invocar correntes (ação padrão, 2 " + sigla(o) + ")" : "Crânio: só no próximo dia da campanha", aoClicar: function () {
        if (!A3().cranioDisponivel(o)) { UI.avisoAtencao("O crânio só volta a ser útil depois de 24 horas (no próximo dia da campanha)."); return; }
        if (!gastar(ctx, 2)) return;
        A3().usarCranio(o);
        salvar(ctx);
        global.RAMARolagens.mostrar({ ok: true, tipo: "info", nome: "Crânio Dominador", expressao: "DT " + dtDe(o, "pre"), total: dtDe(o, "pre"), parcelas: [] },
          { nome: "Crânio Dominador", notas: ["Até dois alvos em alcance curto: paralisados (Reflexos DT " + dtDe(o, "pre") + " evita).", "Libertar-se: romper a corrente (Defesa 10, RD 10, 20 PV).", "Volta a ser útil no próximo dia da campanha; então as correntes antigas somem."] });
      } });
    }
    if (doCatalogo(item, "as3.paranormal.gaiola-do-corvo")) {
      var aberta = A3().dados(o).itens.gaiolaAberta;
      l.push({ rotulo: aberta ? "Fechar a gaiola (ação padrão)" : "Abrir a gaiola (ação padrão)", aoClicar: function () {
        A3().dados(o).itens.gaiolaAberta = !aberta;
        salvar(ctx);
        if (!aberta) UI.avisoOk("Lodo num raio de 18 m (terreno difícil). No começo de toda rodada: 3d10 de Morte (Fortitude DT " + dtDe(o, "vig") + " reduz à metade). Quem ficar morrendo no Lodo é consumido e a gaiola se fecha.", { duracao: 9000 });
      } });
      if (aberta) l.push({ rotulo: "Rodada no Lodo: rolar 3d10 de Morte", aoClicar: function () { mostrarRolagem("3d10", "Gaiola do Corvo · Lodo (Fortitude DT " + dtDe(o, "vig") + " reduz à metade)"); } });
    }
    if (doCatalogo(item, "as3.amaldicoado.armadura-dos-couracas")) {
      var c = A3().couraca(o, item.id);
      var vencidos = A3().testesDaCouracaVencidos(o, item.id);
      l.push({ rotulo: "Semanas de uso: " + c.semanas + " (+" + c.semanas + " Defesa) — somar uma semana", aoClicar: function () { A3().semanaDeCouraca(o, item.id); salvar(ctx); } });
      l.push({ rotulo: vencidos ? "Testes da armadura (refazer: nova semana ou missão)…" : "Testes da armadura (feitos: Vontade " + (c.vontade || "—") + ", Fortitude " + (c.fortitude || "—") + ", DT " + c.dt + ")", aoClicar: function () { testesDaCouraca(ctx, o, item); } });
    }
    var ins = A3().dados(o).instrumento;
    if (ins.itemId && item.id === ins.itemId) {
      l.push({ rotulo: "Instrumento Elétrico: ataque com Artes, Presença no dano" + (comAfinidade(o, "instrumentoEletricoDeCombate") ? ", todos os alvos à escolha no alcance" : ""), aoClicar: function () {
        UI.aviso("O que vale para armas, Luta ou Pontaria é combinado com o mestre (AS3 p. 109).");
      } });
    }
    return l;
  }

  function testesDaCouraca(ctx, o, item) {
    var dt = rolar("6d6");
    var vontade = "", fortitude = "";
    UI.modal({
      titulo: "Armadura dos Couraças",
      conteudo: [linha("DT desta vez: 6d6 = " + dt + ". Vontade ao tocar (falhando, o desejo força a vesti-la) e Fortitude vestida (falhando, o Sangue pode controlar você; passando, fica imune ao controle)."),
        el("select.r-selecao", { "aria-label": "Vontade", onchange: function (ev) { vontade = ev.target.value; } }, [el("option", { value: "", texto: "Vontade: —" }), el("option", { value: "passou", texto: "Vontade: passou" }), el("option", { value: "falhou", texto: "Vontade: falhou" })]),
        el("select.r-selecao", { "aria-label": "Fortitude", onchange: function (ev) { fortitude = ev.target.value; } }, [el("option", { value: "", texto: "Fortitude: —" }), el("option", { value: "passou", texto: "Fortitude: passou" }), el("option", { value: "falhou", texto: "Fortitude: falhou" })]),
        linha("Os testes são refeitos depois de uma semana ou no início de uma nova missão (cronologia da campanha)."),
      ],
      botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Registrar", classe: "r-botao--principal", aoClicar: function (fechar) {
        A3().registrarTestesDaCouraca(o, item.id, dt, vontade, fortitude);
        fechar();
        salvar(ctx);
      } }],
    });
  }

  /* =================================================================
     EM "USAR RITUAL": PODER DO FLAGELO E TORVO
     -----------------------------------------------------------------
     opcoesNoRitual devolve os controles e um `ajuste` que a janela lê:
       peComPv   PE pagos com PV (Poder do Flagelo)
       menosPe   Torvo: rituais de Sangue custam 1 PE a menos
     ================================================================= */

  function ajusteDoRitual(ctx, elemento) {
    if (!A3()) return { menosPe: 0, notas: [] };
    var o = ordemDe(ctx);
    var torvo = elemento === "sangue" && acompanhandoQualquer(ctx, "as3.criatura.torvo-aliado");
    return { menosPe: torvo ? 1 : 0, notas: torvo ? ["Torvo: ritual de Sangue sem componentes e 1 PE a menos (AS3 p. 116)."] : [], flagelo: tem(o, "poderDoFlagelo") };
  }
  function acompanhandoQualquer(ctx, cat) {
    return (ctx.ficha.aliados || []).some(function (x) { return catalogoDoAliado(x) === cat; });
  }

  function opcoesNoRitual(ctx, estado3, custo, pintar) {
    var o = ordemDe(ctx);
    if (!A3() || !tem(o, "poderDoFlagelo")) return [];
    var taxa = A3().taxaDoFlagelo(tem(o, "flageloBemAproveitado"));
    return [el("label.ordenacao", {}, [
      el("span.ordenacao__rotulo", { texto: "Poder do Flagelo: PE pagos com PV (" + taxa + " PV por PE)" }),
      el("input.r-entrada", { type: "number", min: "0", max: String(custo || 0), value: String(estado3.peComPv || 0), style: "max-width:6rem",
        onchange: function (ev) { estado3.peComPv = Math.max(0, Math.min(custo || 0, parseInt(ev.target.value, 10) || 0)); pintar(); } }),
    ]), estado3.peComPv ? linha("Paga " + estado3.peComPv + " PE com " + (estado3.peComPv * taxa) + " PV; esses PV só voltam com descanso" + (tem(o, "recuperacaoFlagelante") ? " (ou Recuperação Flagelante)." : ".")) : null].filter(Boolean);
  }

  function pagarFlagelo(ctx, peComPv) {
    var o = ordemDe(ctx);
    if (!peComPv || !A3()) return "";
    var r = A3().pagarComFlagelo(o, peComPv, tem(o, "flageloBemAproveitado"));
    var m = mexerRecurso(ctx, "pv", -r.pv);
    return "Poder do Flagelo: " + r.pe + " PE pagos com " + r.pv + " PV (PV " + m.antes + " → " + m.depois + ").";
  }

  global.RAMAFichaArquivo3 = {
    painel: painel,
    controles: controles,
    acoesNoTeste: acoesNoTeste,
    acoesNoAtaque: acoesNoAtaque,
    multiplicadorNoDano: multiplicadorNoDano,
    noDano: noDano,
    acoesNoDano: acoesNoDano,
    opcoesDoItem: opcoesDoItem,
    ajusteDoRitual: ajusteDoRitual,
    opcoesNoRitual: opcoesNoRitual,
    pagarFlagelo: pagarFlagelo,
  };
})(window);
