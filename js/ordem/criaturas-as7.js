/* =====================================================================
   R.A.M.A. — Ordem Paranormal · mecânicas das ameaças do AS7
   =====================================================================
   O painel de uma OCORRÊNCIA de criatura (js/criatura-painel.js) pergunta
   aqui se a ameaça tem uma mecânica com estado além dos contadores
   comuns. Tudo é gravado pelas chaves que a ocorrência já aceita (e que
   o servidor confere igual, Campanhas.gs → definirNaInstanciaDaCriatura):
   "estado:", "uso:", "marcador:", "forma" — e os PV pela vida da
   ocorrência. Nada muda o modelo do catálogo nem outra ficha.

     Apóstata (p. 70–73)   patamares, ritos (3 sucessos antes de 3
                           falhas), o Enigma de Medo (exposta por 3
                           rodadas, a volta aos ídolos com os PV
                           recuperados, a manifestação final e a
                           regressão), os fios com PV próprios e Gnosis
                           Absoluta (+5 de RD por tipo, cumulativo)
     Alvira (p. 42)        Transferir Sangue e Madre Superior: o dano
                           nela e a cura de quem recebe (metade com ela
                           machucada; nunca morrendo); Bolsa de Sangue
     Incinerado (p. 65)    –10 PV no início do turno, as duas ações
                           machucado e a explosão em 0 PV
     Stryzga (p. 67)       alimentações por alvo (+1 dado a partir da
                           3ª) e Constrição × Quebra-ossos na rodada
     Velisar (p. 44)       as armadilhas armadas e o disparo de cada uma
     Raziel (p. 40–41)     a Fúria Sanguinária é a forma da ocorrência
                           (com o piso de 200 PV)

   Revelações e o que é do mestre: o painel só aparece com controles para
   quem controla a ocorrência (o mestre, no combate); na consulta da
   biblioteca, só o texto.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var el = U.el;
  function D() { return global.RAMADados; }

  function slug(nome) {
    var s = String(nome || "").toLowerCase();
    if (s.normalize) s = s.normalize("NFD").replace(/[̀-ͯ]/g, "");
    return s.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  }
  function deSlug(s) { return String(s || "").replace(/-/g, " "); }
  function linha(t, classe) { return el("p.t-mini" + (classe ? "." + classe : ""), { texto: t }); }
  function botao(t, f, op) {
    var x = op || {};
    return el("button.r-botao.r-botao--mini", { type: "button", texto: t, disabled: !!x.desligado, class: x.classe || "", onclick: f });
  }
  function faixa(partes) { return el("div.faixa", {}, partes.filter(Boolean)); }
  function bloco(t, partes) { return el("div.pilha--curta", { class: "pilha" }, [el("p.t-forte", { texto: t })].concat(partes.filter(Boolean))); }

  function vida(api) { return U.porId(api.atual().status, "vida") || { atual: 0, maximo: 0 }; }
  function estado(api, id) { var i = api.atual().instancia || {}; return (i.estados && i.estados[id]) || 0; }
  function uso(api, id) { var i = api.atual().instancia || {}; return (i.usos && i.usos[id]) || 0; }
  function marcador(api, id) { var i = api.atual().instancia || {}; return !!(i.marcadores && i.marcadores[id]); }
  /* A rolagem passa pelo painel (api.rolar), que mostra com a
     visibilidade da mesa — a mesma das ações da ficha de ameaça. */
  function rolarSoma(api, rotulo, expr) {
    var r = D().total(expr, { nome: rotulo });
    if (!r || !r.ok) return null;
    if (api.rolar) api.rolar(rotulo, r);
    return r;
  }
  function perderPv(api, n) {
    var v = vida(api);
    api.aplicarStatus("vida", Math.max(0, v.atual - n));
  }

  /* =================================================================
     APÓSTATA
     ================================================================= */

  var FORMAS_APOSTATA = ["", "vd160", "vd240", "vd320"];
  var VD_APOSTATA = [80, 160, 240, 320];
  var DT_DO_RITO = [25, 30, 35];
  var TIPOS_DE_DANO = ["balistico", "corte", "impacto", "perfuracao", "fogo", "frio", "eletricidade", "quimico", "mental", "sangue", "morte", "conhecimento", "energia"];
  var NOMES_DANO = { balistico: "balístico", corte: "corte", impacto: "impacto", perfuracao: "perfuração", fogo: "fogo", frio: "frio", eletricidade: "eletricidade", quimico: "químico", mental: "mental", sangue: "Sangue", morte: "Morte", conhecimento: "Conhecimento", energia: "Energia" };

  function apostata(api) {
    var patamar = Math.max(1, estado(api, "patamar") || 1);
    var exposta = estado(api, "exposta");
    var manifestada = marcador(api, "manifestada");
    var partes = [];
    var imun = manifestada ? "perdidas (manifestação final: abandonou os ídolos)" : (exposta ? "suspensas — exposta, rodada " + exposta + " de 3, deslocamento 9 m | 6" : "ativas (dano e todas as condições), protegida pelos ídolos");
    partes.push(linha("Patamar " + patamar + " (VD " + VD_APOSTATA[patamar - 1] + "). Imunidades: " + imun + ".", exposta || manifestada ? "t-aviso" : ""));
    if (!api.pode) {
      partes.push(linha("Numa ocorrência de combate, o mestre controla os ritos, a exposição, os fios e Gnosis Absoluta aqui."));
      return bloco("Apóstata · ritos e Enigma de Medo", partes);
    }
    function irPara(p) {
      api.aplicar("forma", FORMAS_APOSTATA[p - 1]);
      api.aplicar("estado:patamar", p);
    }
    /* ritos */
    if (patamar <= 3 && !manifestada) {
      var suc = uso(api, "rito.sucessos");
      var fal = uso(api, "rito.falhas");
      partes.push(linha("Rito " + patamar + " (" + (patamar === 3 ? "Vontade para resistir" : "Religião") + ", DT " + DT_DO_RITO[patamar - 1] + "): " + suc + " sucesso(s) e " + fal + " falha(s) de 3 (complexidade baixa, OPRPG p. 77)."));
      partes.push(faixa([
        botao("+1 sucesso", function () { api.aplicar("uso:rito.sucessos", Math.min(3, suc + 1)); }, { desligado: suc >= 3 }),
        botao("+1 falha", function () { api.aplicar("uso:rito.falhas", Math.min(3, fal + 1)); }, { desligado: fal >= 3 }),
        botao("Rito concluído → VD " + VD_APOSTATA[patamar], function () {
          UI.confirmar({ titulo: "Concluir o " + ["", "primeiro", "segundo", "terceiro"][patamar] + " rito?", texto: "A apóstata vai ao VD " + VD_APOSTATA[patamar] + " (presença, Defesa e PV do patamar). Os infectados avançam de estágio — cada um na própria ficha (Condições).", rotuloConfirmar: "Concluir" }).then(function (sim) {
            if (!sim) return;
            irPara(patamar + 1);
            api.aplicar("uso:rito.sucessos", 0);
            api.aplicar("uso:rito.falhas", 0);
          });
        }, { classe: "r-botao--principal" }),
        exposta ? null : botao("Rito interrompido: expor", function () {
          api.aplicar("estado:exposta", 1);
          api.aplicar("uso:rito.sucessos", 0);
          api.aplicar("uso:rito.falhas", 0);
        }),
      ]));
    }
    /* exposta por 3 rodadas */
    if (exposta) {
      partes.push(faixa([
        exposta < 3 ? botao("Passou uma rodada (" + (exposta + 1) + " de 3)", function () { api.aplicar("estado:exposta", exposta + 1); }) : null,
        botao("Fim das 3 rodadas: volta aos ídolos", function () {
          var v = vida(api);
          api.aplicar("estado:exposta", 0);
          api.aplicarStatus("vida", v.maximo);
        }, { classe: exposta >= 3 ? "r-botao--principal" : "" }),
      ]));
      partes.push(linha("Ao voltar, recupera as imunidades e os PV perdidos."));
    }
    /* manifestação final e regressão */
    if (patamar >= 4 && !manifestada) partes.push(faixa([botao("Último rito concluído: manifestar (perde as imunidades)", function () { api.aplicar("marcador:manifestada", true); })]));
    if (manifestada) partes.push(faixa([linha("Na forma plena, o único objetivo é matar todos os seguidores."), botao("Matou todos os seguidores: regride ao VD 80", function () {
      api.aplicar("marcador:manifestada", false);
      api.aplicar("estado:exposta", 0);
      irPara(1);
    })]));
    /* fios: o dano de cada um fica no contador "Fio" acima (22 PV,
       Defesa 25); destruído, liberta quem estava preso e tira 22 PV dela */
    ["fio-1", "fio-2"].forEach(function (f, i) {
      var dano = estado(api, f);
      partes.push(faixa([
        linha("Fio " + (i + 1) + ": " + dano + " de 22 PV de dano."),
        botao("Fio " + (i + 1) + " destruído: liberta e a apóstata perde 22 PV", function () {
          api.aplicar("estado:" + f, 0);
          perderPv(api, 22);
        }, { classe: dano >= 22 ? "r-botao--principal" : "" }),
      ]));
    });
    /* Gnosis Absoluta */
    if (patamar >= 4) {
      var lista = TIPOS_DE_DANO.filter(function (t) { return uso(api, "gnosis." + t); }).map(function (t) { return NOMES_DANO[t] + " +" + 5 * uso(api, "gnosis." + t); });
      partes.push(linha("Gnosis Absoluta — RD acumulada e permanente: " + (lista.length ? lista.join(", ") : "nenhuma ainda") + "."));
      var tipo = "balistico";
      partes.push(faixa([
        el("select.r-selecao", { "aria-label": "Tipo de dano sofrido", onchange: function (ev) { tipo = ev.target.value; } }, TIPOS_DE_DANO.map(function (t) { return el("option", { value: t, texto: NOMES_DANO[t] }); })),
        botao("Sofreu dano deste tipo: +5 de RD", function () { api.aplicar("uso:gnosis." + tipo, Math.min(999, uso(api, "gnosis." + tipo) + 1)); }),
      ]));
    }
    return bloco("Apóstata · ritos e Enigma de Medo", partes);
  }

  /* =================================================================
     ALVIRA
     ================================================================= */

  function alvira(api) {
    var partes = [];
    if (!api.pode) return bloco("Alvira · sangue", [linha("Numa ocorrência de combate, o mestre rola Transferir Sangue e Madre Superior aqui: o dano entra nos PV dela.")]);
    function transferir(rotulo) {
      var v = vida(api);
      if (v.atual <= 0) { UI.avisoAtencao("Com Alvira morrendo, não pode ser usada."); return; }
      var machucada = global.RAMACriaturas && global.RAMACriaturas.estaMachucada ? global.RAMACriaturas.estaMachucada(api.atual()) : false;
      var r = rolarSoma(api, rotulo, "3d8+3");
      if (!r) return;
      perderPv(api, r.total);
      var cura = machucada ? Math.floor(r.total / 2) : r.total;
      UI.aviso(rotulo + ": Alvira sofre " + r.total + "; quem recebe cura " + cura + (machucada ? " (metade: ela está machucada)" : "") + ".", { duracao: 9000 });
    }
    partes.push(faixa([
      botao("Transferir Sangue (completa, 1 por rodada)", function () { transferir("Transferir Sangue"); }),
      botao("Madre Superior (um aliado suga)", function () { transferir("Madre Superior"); }),
      botao("Bolsa de Sangue (3d8+3 PV no alvo)", function () {
        var r = rolarSoma(api, "Bolsa de Sangue", "3d8+3");
        if (r) UI.aviso("Bolsa de Sangue: o alvo recebe " + r.total + " PV; o que passar do máximo vira PV temporários.", { duracao: 9000 });
      }),
    ]));
    partes.push(linha("A cura e os PV temporários são de quem recebe: aplique na ficha ou na ocorrência dele. Transferir Sangue pode ser evitada com Reflexos (DT 23)."));
    return bloco("Alvira · sangue", partes);
  }

  /* =================================================================
     INCINERADO
     ================================================================= */

  function incinerado(api) {
    var v = vida(api);
    var machucado = global.RAMACriaturas && global.RAMACriaturas.estaMachucada ? global.RAMACriaturas.estaMachucada(api.atual()) : false;
    var partes = [linha(machucado ? "Machucado: duas ações padrão por turno, enquanto continuar machucado." : "Uma ação padrão por turno (duas quando machucado).", machucado ? "t-aviso" : "")];
    if (api.pode) {
      partes.push(faixa([
        botao("Início do turno: –10 PV (Combustão Caótica)", function () { perderPv(api, 10); }, { desligado: v.atual <= 0 }),
        v.atual <= 0 ? botao("0 PV: Instabilidade Ígnea (explosão de 6 m)", function () {
          var r = rolarSoma(api, "Instabilidade Ígnea", "5d10");
          if (r) UI.aviso("Explosão: " + r.total + " de dano — " + Math.ceil(r.total / 2) + " mental e " + Math.floor(r.total / 2) + " de Energia; em chamas (Reflexos DT 19 reduz à metade e evita).", { duracao: 10000 });
        }, { classe: "r-botao--principal" }) : null,
      ]));
    }
    partes.push(linha("Imunidade e vulnerabilidade a fogo vêm impressas juntas (veja as notas): o mestre decide."));
    return bloco("Incinerado · combustão", partes);
  }

  /* =================================================================
     STRYZGA
     ================================================================= */

  function stryzga(api) {
    var inst = api.atual().instancia || {};
    var alvos = Object.keys(inst.usos || {}).filter(function (k) { return k.indexOf("alimentou.") === 0; });
    var partes = [linha(alvos.length ? "Alimentações: " + alvos.map(function (k) { var n = inst.usos[k]; return deSlug(k.slice(10)) + " " + n + (n >= 3 ? " (+1 dado contra ele)" : ""); }).join(" · ") + "." : "Nenhuma alimentação registrada.")];
    if (!api.pode) return bloco("Stryzga · alimentações", partes);
    var entrada = el("input.r-entrada", { type: "text", maxlength: 60, placeholder: "alvo", "aria-label": "Alvo da alimentação" });
    partes.push(faixa([entrada, botao("Alimentou-se (+1)", function () {
      var s = slug(entrada.value);
      if (!s) return;
      api.aplicar("uso:alimentou." + s, Math.min(999, uso(api, "alimentou." + s) + 1));
    })]));
    var cons = marcador(api, "rodada.constricao");
    var queb = marcador(api, "rodada.quebra");
    partes.push(faixa([
      botao(cons ? "Constrição usada nesta rodada" : "Usar Constrição", function () { api.aplicar("marcador:rodada.constricao", true); }, { desligado: cons || queb }),
      botao(queb ? "Quebra-ossos usado nesta rodada" : "Usar Quebra-ossos", function () { api.aplicar("marcador:rodada.quebra", true); }, { desligado: cons || queb }),
      botao("Nova rodada", function () { api.aplicar("marcador:rodada.constricao", false); api.aplicar("marcador:rodada.quebra", false); }, { classe: "r-botao--fantasma" }),
    ]));
    partes.push(linha("Constrição e Quebra-ossos não podem ser usados na mesma rodada."));
    return bloco("Stryzga · alimentações", partes);
  }

  /* =================================================================
     VELISAR
     ================================================================= */

  var ARMADILHAS = [
    { id: "caixao", nome: "Caixão de Sangue", disparo: null, texto: "1 ser a 3 m fica agarrado, caído e enredado (Reflexos DT 21 evita); Velisar pode teletransportar o caixão para a base." },
    { id: "explosao", nome: "Explosão de Carne", disparo: "6d6", texto: "todos a 3 m: 6d6 de perfuração e sangrando (Reflexos DT 21 reduz à metade e evita a condição)." },
    { id: "gas", nome: "Gás Paralisante", disparo: "1d4+1", texto: "todos a 3 m: paralisados por 1d4+1 rodadas (Fortitude DT 21 muda para 1 rodada)." },
  ];
  function velisar(api) {
    var partes = [linha("Encontrar: Investigação DT 21 · desarmar: Ocultismo DT 21. Dispara com qualquer ser a 3 m ou menos.")];
    ARMADILHAS.forEach(function (a) {
      var n = uso(api, "armadilha." + a.id);
      partes.push(faixa([
        linha(a.nome + ": " + n + " armada(s)."),
        api.pode ? botao("Armar", function () { api.aplicar("uso:armadilha." + a.id, Math.min(999, n + 1)); }) : null,
        api.pode && n ? botao("Disparou", function () {
          api.aplicar("uso:armadilha." + a.id, n - 1);
          if (a.disparo) rolarSoma(api, a.nome, a.disparo);
          UI.aviso(a.nome + ": " + a.texto, { duracao: 9000 });
        }) : null,
        api.pode && n ? botao("Desarmada", function () { api.aplicar("uso:armadilha." + a.id, n - 1); }, { classe: "r-botao--fantasma" }) : null,
      ]));
    });
    return bloco("Velisar · armadilhas", partes);
  }

  /* =================================================================
     RAZIEL
     ================================================================= */

  function raziel(api) {
    var forma = (api.atual().instancia || {}).forma || "";
    return bloco("Raziel · Fúria Sanguinária", [
      linha(forma === "verdadeiro" ? "Na forma O Verdadeiro Raziel (VD 200)." : "Machucado ou enfurecido (a critério do mestre), troque para a forma O Verdadeiro Raziel no seletor de forma: com menos de 200 PV, ele fica com 200."),
    ]);
  }

  var MECANICAS = {
    "as7.criatura.apostata": apostata,
    "as7.criatura.alvira": alvira,
    "as7.criatura.incinerado": incinerado,
    "as7.criatura.stryzga": stryzga,
    "as7.criatura.velisar": velisar,
    "as7.criatura.raziel": raziel,
  };

  /* api: { atual(), pode, aplicar(chave, valor), aplicarStatus(id, valor),
            rolar(rotulo, resultado) } — pode = ocorrência controlável */
  function bloco_(catalogoId, api) {
    var f = MECANICAS[String(catalogoId || "")];
    return f ? f(api) : null;
  }

  global.RAMACriaturasMecanicas = { bloco: bloco_, MECANICAS: Object.keys(MECANICAS) };
})(typeof window !== "undefined" ? window : globalThis);
