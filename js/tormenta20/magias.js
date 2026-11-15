/* =====================================================================
   R.A.M.A. — Tormenta20 · magias (registro e lançamento)
   ---------------------------------------------------------------------
   Os arquivos magias-1.js … magias-5.js chamam
     RAMATormenta20Magias.def(id, nome, "A1", escola, página, base,
                              resumo, aprimoramentos, mecânica)
   · "A1" = tipo (A arcana, D divina, U universal) + círculo.
   · base = "execução|alcance|alvo|duração|resistência"; o terceiro campo
     começa com "area:" ou "ef:" quando a magia usa área ou efeito.
   · aprimoramento = [custo, tipo, texto, mudanças]. Tipo "a" (aumenta,
     repetível), "m" (muda; mudanças na mesma característica não se
     acumulam), "o" (outro, uma vez) ou "T" (truque, custo 0, sozinho).
     Mudanças: ex, al, alvo, area, ef, du, res (novos valores); alvos
     (+n por vez); r (requer círculo — só magias de classe, p. 172);
     precisa (índice de outro aprimoramento); lim (máximo de vezes,
     expressão com circuloMax); substitui (troca o efeito básico);
     silenciosa (sem gestos nem palavras); tipoDano; mat (componente);
     escolha (opções a decidir ao lançar).
   · mecânica: dano (expressão com aN = vezes do aprimoramento N), tipo
     do dano, cura, cond (condição), metade (resistência reduz à metade),
     efeitos (bônus que viram efeito ativo na ficha, categoria magia),
     anula, mat, especial (custo especial em texto).
   Os textos são resumos do RAMA com a página impressa do Livro Básico
   (Jogo do Ano); a descrição completa está no livro.
   ===================================================================== */

(function (global) {
  "use strict";

  var M = global.RAMATormenta20Magias = global.RAMATormenta20Magias || { MAGIAS: [], MAGIA: {} };
  var TIPOS = { A: "arcana", D: "divina", U: "universal" };
  var ESCOLAS = { abjur: "abjuracao", adiv: "adivinhacao", conv: "convocacao", encan: "encantamento", evoc: "evocacao", ilus: "ilusao", necro: "necromancia", trans: "transmutacao" };
  var CUSTO = { 1: 1, 2: 3, 3: 6, 4: 10, 5: 15 };
  var NOMES_EXECUCAO = { padrao: "padrão", movimento: "movimento", completa: "completa", livre: "livre", reacao: "reação" };
  var CAMPOS = ["ex", "al", "alvo", "area", "ef", "du", "res"];
  var NAO_CARACTERISTICA = { alvos: 1, r: 1, precisa: 1, lim: 1, substitui: 1, silenciosa: 1, mat: 1, escolha: 1, apenas: 1, sozinho: 1 };

  function X() { return global.RAMATormenta20Expressao; }

  M.def = function (id, nome, tc, escola, pagina, base, resumo, aprim, mec) {
    var partes = String(base || "").split("|");
    var b = { ex: partes[0] || "padrao", al: partes[1] || "", du: partes[3] || "", res: partes[4] || "" };
    var a3 = partes[2] || "";
    if (a3.indexOf("area:") === 0) b.area = a3.slice(5);
    else if (a3.indexOf("ef:") === 0) b.ef = a3.slice(3);
    else b.alvo = a3;
    var m = {
      id: id, nome: nome, tipo: TIPOS[tc[0]], circulo: Number(tc.slice(1)), escola: ESCOLAS[escola] || escola, pagina: pagina,
      base: b, resumo: resumo, mec: mec || {},
      aprimoramentos: (aprim || []).map(function (a, i) {
        var mud = a[3] || {};
        return { indice: i, custo: a[1] === "T" ? 0 : Number(a[0]) || 0, tipo: a[1], texto: a[2], mud: mud, requer: mud.r || null };
      }),
      fonte: { livro: "Tormenta20 — Jogo do Ano", pagina: pagina },
    };
    if (M.MAGIA[id]) M.MAGIAS = M.MAGIAS.filter(function (x) { return x.id !== id; });
    M.MAGIAS.push(m);
    M.MAGIA[id] = m;
    return m;
  };

  M.custoBase = function (circulo) { return CUSTO[circulo] || 0; };
  M.nomeExecucao = function (ex) { return NOMES_EXECUCAO[ex] || ex; };

  /* Disponível para uma fonte: tipo (arcana/divina; universal serve às
     duas), círculo máximo e escolas permitidas (bardo, druida). */
  M.disponivel = function (magia, fonte) {
    if (!magia || !fonte) return false;
    if (magia.circulo > (fonte.circuloMax || 0)) return false;
    if (fonte.tipo && fonte.tipo !== "ambas" && magia.tipo !== "universal" && magia.tipo !== fonte.tipo) return false;
    if (fonte.escolas && fonte.escolas.length && fonte.escolas.indexOf(magia.escola) < 0) return false;
    return true;
  };

  /* Prepara um lançamento: aplica os aprimoramentos escolhidos e devolve
     custo, execução, alcance, alvo/área/efeito, duração, resistência,
     dano e os textos, com os erros que impedem confirmar.
       escolhas = { aprim: { indice: vezes }, opcoes: { indice: valor } }
       ctx = { circuloMax, deClasse, limitePM, desconto, alquebrado, cd } */
  M.preparar = function (magia, escolhas, ctx) {
    var c = ctx || {};
    var e = escolhas || {};
    var vezes = {};
    var erros = [];
    var r = { magia: magia.id, nome: magia.nome, custoBase: CUSTO[magia.circulo] || 0, alvosExtra: 0, textos: [], erros: erros, aplicados: [] };
    CAMPOS.forEach(function (k) { if (magia.base[k] !== undefined) r[k] = magia.base[k]; });
    var mudou = {}, mudouExtra = {};
    r.extra = {};
    var truque = false;
    var ordem = magia.aprimoramentos.slice();
    ordem.forEach(function (a) {
      var n = Math.max(0, Math.floor(Number((e.aprim || {})[a.indice]) || 0));
      if (!n) return;
      if (a.tipo !== "a" && n > 1) { erros.push("“" + a.texto + "” só pode ser usado uma vez."); n = 1; }
      if (a.mud.lim !== undefined) {
        var lim = Math.max(0, Math.floor(X() ? X().numero(a.mud.lim, { circuloMax: c.circuloMax || 0 }) : 0));
        if (n > lim) { erros.push("Limite de " + lim + " vez(es) para “" + a.texto + "” (pelo seu círculo máximo)."); n = lim; }
      }
      if (a.requer) {
        if (!c.deClasse) erros.push("“" + a.texto + "” exige " + a.requer + "º círculo e só vale para magias de classe.");
        else if ((c.circuloMax || 0) < a.requer) erros.push("“" + a.texto + "” exige lançar magias de " + a.requer + "º círculo.");
      }
      if (a.tipo === "T") truque = true;
      vezes[a.indice] = n;
    });
    Object.keys(vezes).forEach(function (i) {
      var a = magia.aprimoramentos[i];
      if (a.mud.precisa !== undefined && !vezes[a.mud.precisa]) erros.push("“" + a.texto + "” precisa de “" + magia.aprimoramentos[a.mud.precisa].texto + "”.");
    });
    if (truque && Object.keys(vezes).length > 1) erros.push("O truque não pode ser combinado com outros aprimoramentos.");
    var custo = truque ? 0 : r.custoBase;
    Object.keys(vezes).forEach(function (i) {
      var a = magia.aprimoramentos[i], n = vezes[i];
      if (!truque) custo += a.custo * n;
      CAMPOS.forEach(function (k) {
        if (a.mud[k] === undefined) return;
        if (mudou[k] !== undefined && mudou[k] !== i) erros.push("Dois aprimoramentos mudam " + nomeCampo(k) + "; mudanças na mesma característica não se acumulam.");
        mudou[k] = i;
        r[k] = a.mud[k];
        if (k === "alvo" || k === "area" || k === "ef") ["alvo", "area", "ef"].forEach(function (o) { if (o !== k && a.mud[o] === undefined) delete r[o]; });
      });
      Object.keys(a.mud).forEach(function (k) {
        if (CAMPOS.indexOf(k) >= 0 || NAO_CARACTERISTICA[k]) return;
        if (mudouExtra[k] !== undefined && mudouExtra[k] !== i) erros.push("Dois aprimoramentos mudam a mesma característica (" + k + "); não se acumulam.");
        mudouExtra[k] = i;
        r.extra[k] = a.mud[k];
      });
      if (a.mud.apenas && c.tipoFonte && c.tipoFonte !== a.mud.apenas) erros.push("“" + a.texto + "” é só para conjuradores de magia " + a.mud.apenas + ".");
      if (a.mud.sozinho && Object.keys(vezes).length > 1) erros.push("“" + a.texto + "” não combina com outros aprimoramentos.");
      if (a.mud.alvos) r.alvosExtra += a.mud.alvos * n;
      if (a.mud.silenciosa) r.silenciosa = true;
      if (a.mud.tipoDano) r.tipoDano = a.mud.tipoDano;
      if (a.mud.mat) r.mat = a.mud.mat;
      if (a.mud.substitui) r.substitui = true;
      if (a.mud.escolha) { var v = (e.opcoes || {})[i]; if (!v) erros.push("Escolha uma opção para “" + a.texto + "”."); else r.opcao = v; }
      r.aplicados.push({ indice: Number(i), vezes: n, texto: a.texto, custo: a.custo * n });
      r.textos.push((n > 1 ? n + "× " : "") + a.texto);
    });
    if (magia.mec.mat && !r.mat) r.mat = magia.mec.mat;
    if (magia.mec.especial) r.especial = magia.mec.especial;
    /* custo final: reduções não se acumulam (vale a maior), mínimo 1
       (truque fica em 0); alquebrado +1 (p. 226 e 394) */
    var desconto = Math.max(0, Number(c.desconto) || 0);
    var final = custo - desconto;
    if (!truque) final = Math.max(1, final);
    if (c.alquebrado && !truque) final += 1;
    r.custoAntes = custo;
    r.custo = Math.max(0, final);
    r.truque = truque;
    if (c.limitePM && custo > c.limitePM && custo > r.custoBase) erros.push("Custo " + custo + " PM passa do limite de " + c.limitePM + " PM desta fonte.");
    r.sustentada = String(r.du || "").indexOf("sustentada") >= 0;
    r.vezes = vezes;
    var ctxEx = function (nome) {
      if (/^a\d+$/.test(nome)) return vezes[nome.slice(1)] || 0;
      if (nome === "circuloMax") return c.circuloMax || 0;
      if (nome === "truque") return truque ? 1 : 0;
      if (nome === "nivel") return c.nivel || 1;
      if (nome.indexOf("atr.") === 0) return (c.atr || {})[nome.slice(4)] || 0;
      return 0;
    };
    r.ctx = ctxEx;
    if (magia.mec.dano) {
      var expr = magia.mec.dano;
      r.dano = X() ? X().rolavel(expr, ctxEx) : expr;
      if (r.dano === "0") delete r.dano;
      r.tipoDano = r.tipoDano || magia.mec.tipo || "";
    }
    if (magia.mec.cura) { r.cura = X() ? X().rolavel(magia.mec.cura, ctxEx) : magia.mec.cura; if (r.cura === "0") delete r.cura; }
    if (magia.mec.pvTemp) { r.pvTemp = X() ? X().rolavel(magia.mec.pvTemp, ctxEx) : magia.mec.pvTemp; if (r.pvTemp === "0") delete r.pvTemp; }
    if (magia.mec.projeteis) r.projeteis = X() ? X().numero(magia.mec.projeteis, ctxEx) : 1;
    if (magia.mec.escolha) { r.opcoesBase = magia.mec.escolha; var ob = (e.opcoes || {}).base; if (!ob) erros.push("Escolha: " + magia.mec.escolha.join(", ") + "."); else r.opcao = ob; }
    if (magia.mec.cond) r.condicao = magia.mec.cond;
    if (magia.mec.metade) r.metade = true;
    if (c.cd) r.cd = c.cd;
    r.efeitos = (magia.mec.efeitos || []).map(function (ef) {
      var cp = JSON.parse(JSON.stringify(ef));
      if (typeof cp.valor === "string" && X()) { var vv = X().avaliar(cp.valor, ctxEx); cp.valor = typeof vv === "number" ? vv : vv; }
      return cp;
    }).filter(function (ef) { return !(typeof ef.valor === "number" && ef.valor === 0 && ef.t === "bonus"); });
    r.alvosTexto = r.alvo ? r.alvo + (r.alvosExtra ? " (+" + r.alvosExtra + ")" : "") : (r.area || r.ef || "");
    return r;
  };

  function nomeCampo(k) { return { ex: "a execução", al: "o alcance", alvo: "o alvo", area: "a área", ef: "o efeito", du: "a duração", res: "a resistência" }[k] || k; }

  /* Teste para lançar (p. 172–173): concentração ferido (CD = dano),
     condição ruim (15 + PM) ou terrível (20 + PM); arcana de armadura
     (Misticismo 20 + PM, com penalidade de armadura). */
  M.testesParaLancar = function (preparo, situacao) {
    var s = situacao || {};
    var out = [];
    var pm = preparo.custoAntes || preparo.custo;
    if (s.dano) out.push({ pericia: "vontade", cd: s.dano, motivo: "concentração: sofreu " + s.dano + " de dano" });
    if (s.condicao === "ruim") out.push({ pericia: "vontade", cd: 15 + pm, motivo: "condição ruim (balançando, chuva forte)" });
    if (s.condicao === "terrivel") out.push({ pericia: "vontade", cd: 20 + pm, motivo: "condição terrível (tempestade, cavalgando em disparada)" });
    if (s.armaduraArcana && !preparo.silenciosa) out.push({ pericia: "misticismo", cd: 20 + pm, motivo: "magia arcana de armadura (penalidade de armadura se aplica)", penalidade: true });
    return out;
  };

  M.listar = function (filtro) {
    var f = filtro || {};
    return M.MAGIAS.filter(function (m) {
      if (f.tipo && m.tipo !== f.tipo && m.tipo !== "universal") return false;
      if (f.circulo && m.circulo !== f.circulo) return false;
      if (f.escola && m.escola !== f.escola) return false;
      return true;
    }).sort(function (a, b) { return a.circulo - b.circulo || a.nome.localeCompare(b.nome); });
  };
})(typeof window !== "undefined" ? window : globalThis);

/* =====================================================================
   v9.14 — MAGIA HOMEBREW de Tormenta20 (chave hbmg-<id>-<hash>, cópia em
   t20.homebrew.magias). Registrada pelo MESMO M.def das magias do livro:
   tipo, círculo (custo pela tabela), escola, execução, alcance, alvo,
   duração e resistência; a mecânica que o lançamento já resolve — dano
   (dados e tipo; a resistência pode reduzir à metade), cura e efeitos
   que viram efeito ativo (bônus em Defesa, perícia, ataque, dano;
   redução de dano). Os aprimoramentos ficam como texto: a mesa aplica.
   Puro: o servidor roda este arquivo.
   ===================================================================== */
(function (global) {
  "use strict";

  var M = global.RAMATormenta20Magias = global.RAMATormenta20Magias || { MAGIAS: [], MAGIA: {} };
  var PADRAO_HB = /^hbmg-[a-z0-9-]{3,30}$/;
  var DADO = /^\d{1,2}d\d{1,3}([+-]\d{1,3})?$/;
  var ESCOLAS = ["abjuracao", "adivinhacao", "convocacao", "encantamento", "evocacao", "ilusao", "necromancia", "transmutacao"];
  var EXECUCOES = ["padrao", "movimento", "completa", "livre", "reacao"];
  var LETRA = { arcana: "A", divina: "D", universal: "U" };
  function RA() { return global.RAMATormenta20Racas; }
  function Dd() { return global.RAMATormenta20Dados; }
  function oo(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  function ll(v) { return Array.isArray(v) ? v : []; }
  function tx(v, max) { return String(v === undefined || v === null ? "" : v).slice(0, max || 200); }
  function nn(v, min, max, p) { var n = Math.round(Number(v)); return v !== "" && v !== null && v !== undefined && isFinite(n) ? Math.max(min, Math.min(max, n)) : p; }
  function semAcento(s) { return String(s || "").toLowerCase().normalize ? String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]/g, "") : String(s || "").toLowerCase(); }
  function escola(v) { var k = semAcento(v); return ESCOLAS.filter(function (e) { return e === k || e.indexOf(k) === 0 && k.length >= 4; })[0] || "evocacao"; }
  function dado(v) { var s = tx(v, 20).replace(/\s+/g, "").toLowerCase(); return DADO.test(s) ? s : ""; }

  M.ehHomebrew = function (id) { return PADRAO_HB.test(String(id || "")); };
  M.normalizarHomebrew = function (bruto) {
    var b = oo(bruto);
    var tipoDano = tx(b.tipoDano, 20);
    var d = {
      id: M.ehHomebrew(b.id) ? b.id : "",
      nome: tx(b.nome, 60).trim() || "Magia Homebrew",
      homebrew: true, homebrewId: tx(b.homebrewId, 80), fonte: "HOMEBREW", pagina: 0,
      tipo: LETRA[b.tipo] ? b.tipo : "arcana",
      circulo: nn(b.circulo, 1, 5, 1),
      escola: escola(b.escola),
      execucao: EXECUCOES.indexOf(b.execucao) >= 0 ? b.execucao : "padrao",
      alcance: tx(b.alcance, 40).trim(), alvo: tx(b.alvo, 80).trim(), duracao: tx(b.duracao, 40).trim(), resistencia: tx(b.resistencia, 60).trim(),
      resumo: tx(b.resumo, 1200).trim(),
      aprimoramentosTexto: tx(b.aprimoramentosTexto, 2000).trim(),
      dano: dado(b.dano),
      tipoDano: !Dd() || Dd().TIPOS_DANO.some(function (x) { return x[0] === tipoDano; }) ? tipoDano : "",
      cura: dado(b.cura),
      metade: !!b.metade,
      efeitos: RA() && RA().acaoHomebrew ? (RA().acaoHomebrew({ efeitos: b.efeitos }) || { efeitos: [] }).efeitos : [],
    };
    if (!d.dano) { d.tipoDano = ""; d.metade = false; }
    if (!d.id) d.id = RA() ? RA().chaveHomebrew("hbmg-", d) : "hbmg-local-000000";
    return d;
  };
  M.registrarHomebrew = function (def) {
    if (!def || !M.ehHomebrew(def.id)) return null;
    var mec = {};
    if (def.dano) { mec.dano = def.dano; if (def.tipoDano) mec.tipo = def.tipoDano; if (def.metade) mec.metade = true; }
    if (def.cura) mec.cura = def.cura;
    if (def.efeitos && def.efeitos.length) mec.efeitos = def.efeitos;
    var resumo = def.resumo + (def.aprimoramentosTexto ? " Aprimoramentos (a mesa aplica): " + def.aprimoramentosTexto : "");
    var m = M.def(def.id, def.nome, LETRA[def.tipo] + def.circulo, def.escola, 0, [def.execucao, def.alcance, def.alvo, def.duracao, def.resistencia].join("|"), resumo, [], mec);
    m.homebrew = true;
    m.fonte = { livro: "Homebrew", pagina: 0 };
    m.definicao = def;
    return m;
  };
  /* A cópia guardada na ficha é a definição (não o registro do M.def). */
  M.ESCOLAS_HB = ESCOLAS;
})(typeof window !== "undefined" ? window : globalThis);
