/* =====================================================================
   R.A.M.A. — Ordem Paranormal · habilidades características de classes
   Homebrew
   ---------------------------------------------------------------------
   Uma classe Homebrew pode ter HABILIDADES CARACTERÍSTICAS: benefícios
   que chegam sozinhos em marcos da progressão (como Ataque Especial,
   Eclético, Perito, Engenhosidade e Escolhido pelo Outro Lado) — sem
   ocupar vaga de poder de classe. Elas moram na definição da classe
   (`habilidadesCaracteristicas`, cópia versionada na ficha) e são
   CAMPOS ESTRUTURADOS; o texto da descrição nunca é interpretado.

     hab = {
       chave       estável (letras e números): liga escolhas, cartões e
                   efeitos — trocar o nome não muda nada. Não se chama
                   `id` de propósito: a importação apaga todo `id`, e esta
                   chave é da DEFINIÇÃO (precisa atravessar exportações)
       nome, descricao
       base        a predefinição oficial de que partiu (só referência e
                   para os ajustes de custo do Treinamento Especial)
       escolha     null | { tipo: "pericias", quantidade, modo:
                   "treinada" | "qualquer", exceto: [perícias] }
       estagios    [{ nex, patente, custo, custoPatente, efeitos }]
                   o 1º estágio é a aquisição; cada estágio SUBSTITUI o
                   anterior (custo e efeitos), nunca soma. `nex` vale
                   para NEX e para o nível (NEX & Experiência: o nível n é
                   o marco n da tabela); `patente` (0 a 4, ou null) é o
                   marco na Evolução por Patentes — null: o estágio não
                   existe nesse trilho. `custoPatente` null = o mesmo.
     }

   EFEITOS
     passivos (entram na conta da ficha quando o estágio vale):
       defesa, pvFixo, peFixo, pvPorNex, sanPorNex   { valor }
       bonusPericia             { valor, pericias: [k] }
       bonusPericiaEscolhida    { valor } nas perícias da escolha
     de uso (o jogador decide; o custo do estágio é gasto ao usar):
       bonusTeste      { valor, alvo }    +valor naquele teste
       dadoTeste       { dado, alvo }     +1dN somado naquele teste
       treinoTemporario { grau, alvo }    os benefícios do grau naquele
                                          teste (a ficha não muda)
       bonusAtaque     { valor }          +valor naquele ataque
       bonusDano       { valor }          +valor naquele dano
       alvo: "escolha" (as perícias da escolha), "todas" ou "lista"
             (+ pericias); `exceto` vale nos três; `exigeTreinada`
     especiais:
       melhoraTreino   { alvo: chave de outra habilidade da classe com
                       treinoTemporario, grau, custoExtra } — usando
                       aquela, o grau melhor por mais PE (Engenhosidade)
       conjuracao      a classe conjura rituais pela tabela de círculos
                       da própria classe (circuloPorNex): uma concessão
                       só, a da conjuração Homebrew que já existe.

   Sem DOM: testes/executar-homebrew-ordem.js.
   ===================================================================== */

(function (global) {
  "use strict";

  function C() { return global.RAMAOrdemCatalogo; }
  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  function lista(v) { return Array.isArray(v) ? v : []; }
  function texto(v, max) { return String(v === undefined || v === null ? "" : v).slice(0, max || 200); }
  function int(v, min, max, p) { var n = Math.round(Number(v)); return isFinite(n) && v !== "" && v !== null && v !== undefined ? Math.max(min, Math.min(max, n)) : p; }
  function hash(t) { var h = 5381; for (var i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36).slice(0, 6); }

  var NEX = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 99];
  var PATENTES = ["Recruta", "Operador", "Agente especial", "Oficial de operações", "Agente de elite"];
  var GRAUS = ["treinado", "veterano", "expert"];
  var DADOS = ["1d4", "1d6", "1d8", "1d10", "1d12"];
  var ID = /^[a-z0-9]{4,24}$/;
  var MAX_HABILIDADES = 8, MAX_ESTAGIOS = 6, MAX_EFEITOS = 4;

  var TIPOS = [
    { chave: "defesa", rotulo: "Defesa", grupo: "passivo", valor: [-5, 10] },
    { chave: "pvFixo", rotulo: "PV (fixo)", grupo: "passivo", valor: [-10, 30] },
    { chave: "peFixo", rotulo: "PE (fixo)", grupo: "passivo", valor: [-5, 10] },
    { chave: "pvPorNex", rotulo: "PV por marco", grupo: "passivo", valor: [-3, 5] },
    { chave: "sanPorNex", rotulo: "SAN por marco", grupo: "passivo", valor: [-3, 5] },
    { chave: "bonusPericia", rotulo: "Bônus fixo numa perícia", grupo: "passivo", valor: [-5, 10], pericias: true },
    { chave: "bonusPericiaEscolhida", rotulo: "Bônus fixo nas perícias da escolha", grupo: "passivo", valor: [-5, 10], precisaEscolha: true },
    { chave: "bonusTeste", rotulo: "Bônus no teste (ao usar)", grupo: "uso", valor: [1, 30], alvo: true },
    { chave: "dadoTeste", rotulo: "Dado extra no teste (ao usar)", grupo: "uso", dado: true, alvo: true },
    { chave: "treinoTemporario", rotulo: "Benefícios de grau no teste (ao usar)", grupo: "uso", grau: true, alvo: true },
    { chave: "bonusAtaque", rotulo: "Bônus no ataque (ao usar)", grupo: "uso", valor: [1, 30] },
    { chave: "bonusDano", rotulo: "Bônus no dano (ao usar)", grupo: "uso", valor: [1, 30] },
    { chave: "melhoraTreino", rotulo: "Melhora outra habilidade de grau (ao usar aquela)", grupo: "especial", grau: true },
    { chave: "conjuracao", rotulo: "Conjura rituais (pela tabela de círculos da classe)", grupo: "especial" },
  ];
  var POR_TIPO = {};
  TIPOS.forEach(function (t) { POR_TIPO[t.chave] = t; });

  function pericias(v, max) {
    return lista(v).map(String).filter(function (k, i, l) { return (!C() || C().pericia(k)) && l.indexOf(k) === i; }).slice(0, max || 30);
  }
  function nomePericia(k) { var p = C() && C().pericia(k); return p ? p.nome : k; }

  function novoId() {
    var s = "";
    var cripto = global.crypto && global.crypto.getRandomValues ? global.crypto : null;
    for (var i = 0; i < 8; i++) s += "abcdefghijklmnopqrstuvwxyz0123456789"[cripto ? cripto.getRandomValues(new Uint8Array(1))[0] % 36 : Math.floor(Math.random() * 36)];
    return "h" + s;
  }

  /* ---------------- normalização ---------------- */

  function normalizarEfeito(b, idsDaClasse) {
    var e = obj(b), t = POR_TIPO[e.tipo];
    if (!t) return null;
    var x = { tipo: t.chave };
    if (t.valor) { x.valor = int(e.valor, t.valor[0], t.valor[1], 0); if (!x.valor) return null; }
    if (t.dado) { x.dado = DADOS.indexOf(String(e.dado)) >= 0 ? String(e.dado) : "1d6"; }
    if (t.grau) { x.grau = GRAUS.indexOf(e.grau) >= 0 ? e.grau : "treinado"; }
    if (t.pericias) { x.pericias = pericias(e.pericias || (e.pericia ? [e.pericia] : []), 1); if (!x.pericias.length) return null; }
    if (t.alvo) {
      x.alvo = ["escolha", "todas", "lista"].indexOf(e.alvo) >= 0 ? e.alvo : "todas";
      if (x.alvo === "lista") { x.pericias = pericias(e.pericias, 30); if (!x.pericias.length) x.alvo = "todas"; }
      var ex = pericias(e.exceto, 30);
      if (ex.length) x.exceto = ex;
      if (e.exigeTreinada === true) x.exigeTreinada = true;
    }
    if (t.chave === "melhoraTreino") {
      x.alvo = ID.test(String(e.alvo || "")) ? String(e.alvo) : "";
      x.custoExtra = int(e.custoExtra, 0, 20, 2);
      if (!x.alvo || (idsDaClasse && idsDaClasse.indexOf(x.alvo) < 0)) return null;
    }
    return x;
  }

  function normalizarEscolha(b) {
    var e = obj(b);
    if (e.tipo !== "pericias") return null;
    var x = { tipo: "pericias", quantidade: int(e.quantidade, 1, 4, 2), modo: e.modo === "qualquer" ? "qualquer" : "treinada" };
    var ex = pericias(e.exceto, 30);
    if (ex.length) x.exceto = ex;
    return x;
  }

  function normalizarHabilidade(b, idsDaClasse) {
    var h = obj(b);
    var id = ID.test(String(h.chave || "")) ? String(h.chave) : "";
    if (!id) return null;
    var d = {
      chave: id,
      nome: texto(h.nome, 60).trim() || "Habilidade característica",
      descricao: texto(h.descricao, 1200).trim(),
      base: PRESETS[h.base] ? h.base : "",
      escolha: normalizarEscolha(h.escolha),
      estagios: [],
    };
    var vistos = {};
    lista(h.estagios).map(obj).forEach(function (s) {
      var nex = NEX.indexOf(Math.round(Number(s.nex))) >= 0 ? Math.round(Number(s.nex)) : null;
      if (nex === null || vistos[nex]) return;
      vistos[nex] = true;
      var pat = s.patente === null || s.patente === undefined || s.patente === "" ? null : int(s.patente, 0, 4, null);
      var est = {
        nex: nex, patente: pat,
        custo: int(s.custo, 0, 20, 0),
        custoPatente: s.custoPatente === null || s.custoPatente === undefined || s.custoPatente === "" ? null : int(s.custoPatente, 0, 20, null),
        efeitos: lista(s.efeitos).map(function (e) { return normalizarEfeito(e, idsDaClasse); }).filter(Boolean).slice(0, MAX_EFEITOS),
      };
      d.estagios.push(est);
    });
    d.estagios.sort(function (a, b) { return a.nex - b.nex; });
    d.estagios = d.estagios.slice(0, MAX_ESTAGIOS);
    /* Patentes nunca descem de um estágio para o seguinte. */
    var ultima = -1;
    d.estagios.forEach(function (s) { if (s.patente !== null) { if (s.patente < ultima) s.patente = ultima; ultima = s.patente; } });
    if (!d.estagios.length) d.estagios.push({ nex: 5, patente: 0, custo: 0, custoPatente: null, efeitos: [] });
    /* Sem escolha, nada aponta para ela. */
    if (!d.escolha) d.estagios.forEach(function (s) {
      s.efeitos = s.efeitos.filter(function (e) { return e.tipo !== "bonusPericiaEscolhida" && e.alvo !== "escolha"; });
    });
    return d;
  }

  /* A lista da classe. Ids repetidos: fica o primeiro. */
  function normalizarLista(v) {
    var brutos = lista(v).slice(0, MAX_HABILIDADES);
    var ids = brutos.map(function (h) { return String(obj(h).chave || ""); }).filter(function (k) { return ID.test(k); });
    var vistos = {};
    return brutos.map(function (h) {
      var d = normalizarHabilidade(h, ids);
      if (!d || vistos[d.chave]) return null;
      vistos[d.chave] = true;
      return d;
    }).filter(Boolean).map(function (d, i, todas) {
      /* melhoraTreino só aponta para uma habilidade com treinoTemporario. */
      d.estagios.forEach(function (s) {
        s.efeitos = s.efeitos.filter(function (e) {
          if (e.tipo !== "melhoraTreino") return true;
          var alvo = todas.filter(function (x) { return x.chave === e.alvo && x.chave !== d.chave; })[0];
          return !!alvo && alvo.estagios.some(function (z) { return z.efeitos.some(function (y) { return y.tipo === "treinoTemporario"; }); });
        });
      });
      return d;
    });
  }

  function usaConjuracao(l) {
    return lista(l).some(function (h) { return lista(h.estagios).some(function (s) { return lista(s.efeitos).some(function (e) { return e.tipo === "conjuracao"; }); }); });
  }

  /* ---------------- predefinições (as oficiais, adaptáveis) ---------------- */

  function est(nex, patente, custo, custoPatente, efeitos) { return { nex: nex, patente: patente, custo: custo, custoPatente: custoPatente, efeitos: efeitos }; }
  var PRESETS = {
    ataqueEspecial: function () {
      function e(v) { return [{ tipo: "bonusAtaque", valor: v }, { tipo: "bonusDano", valor: v }]; }
      return { nome: "Ataque Especial", base: "ataqueEspecial",
        descricao: "Ao atacar, gaste PE para somar o bônus no teste de ataque ou na rolagem de dano (Ordem Paranormal RPG, p. 24).",
        escolha: null,
        estagios: [est(5, 0, 2, 1, e(5)), est(25, 2, 3, 2, e(10)), est(55, 3, 4, 3, e(15)), est(85, 4, 5, 4, e(20))] };
    },
    ecletico: function () {
      return { nome: "Eclético", base: "ecletico",
        descricao: "Num teste de perícia, gaste 2 PE para receber os benefícios de ser treinado nela (Ordem Paranormal RPG, p. 28).",
        escolha: null,
        estagios: [est(5, 0, 2, 2, [{ tipo: "treinoTemporario", grau: "treinado", alvo: "todas" }])] };
    },
    perito: function () {
      function e(d) { return [{ tipo: "dadoTeste", dado: d, alvo: "escolha" }]; }
      return { nome: "Perito", base: "perito",
        descricao: "Escolha duas perícias treinadas (exceto Luta e Pontaria). Num teste delas, gaste PE para somar um dado ao resultado (Ordem Paranormal RPG, p. 28).",
        escolha: { tipo: "pericias", quantidade: 2, modo: "treinada", exceto: ["luta", "pontaria"] },
        estagios: [est(5, 0, 2, 1, e("1d6")), est(25, 2, 3, 2, e("1d8")), est(55, 3, 4, 3, e("1d10")), est(85, 4, 5, 4, e("1d12"))] };
    },
    engenhosidade: function (alvo) {
      return { nome: "Engenhosidade", base: "engenhosidade",
        descricao: "Usando Eclético, gaste PE adicionais para receber os benefícios de veterano (NEX 40%) ou de expert (NEX 75%) (Ordem Paranormal RPG, p. 30).",
        escolha: null,
        estagios: [est(40, null, 0, null, alvo ? [{ tipo: "melhoraTreino", alvo: alvo, grau: "veterano", custoExtra: 2 }] : []),
          est(75, null, 0, null, alvo ? [{ tipo: "melhoraTreino", alvo: alvo, grau: "expert", custoExtra: 4 }] : [])] };
    },
    escolhidoPeloOutroLado: function () {
      return { nome: "Escolhido pelo Outro Lado", base: "escolhidoPeloOutroLado",
        descricao: "Conjura rituais: começa com três de 1º círculo e aprende um a cada marco, fora do limite de rituais (Ordem Paranormal RPG, p. 32). Os círculos seguem a tabela de Rituais da classe (Etapa Perícias).",
        escolha: null,
        estagios: [est(5, 0, 0, null, [{ tipo: "conjuracao" }])] };
    },
  };
  var ROTULOS_PRESET = { ataqueEspecial: "Ataque Especial", ecletico: "Eclético", perito: "Perito", engenhosidade: "Engenhosidade", escolhidoPeloOutroLado: "Escolhido pelo Outro Lado" };

  /* Uma predefinição com id novo (adaptar a cópia nunca muda a oficial).
     Engenhosidade precisa do id do Eclético da mesma classe. */
  function dePreset(chave, alvo) {
    if (!PRESETS[chave]) return null;
    var d = PRESETS[chave](alvo);
    d.chave = novoId();
    return d;
  }
  /* As habilidades características de uma classe oficial, com as escolhas
     e as ligações necessárias (Eclético ↔ Engenhosidade). */
  function presetsDaClasse(oficial) {
    if (oficial === "combatente") return [dePreset("ataqueEspecial")];
    if (oficial === "especialista") {
      var ec = dePreset("ecletico");
      return [ec, dePreset("perito"), dePreset("engenhosidade", ec.chave)];
    }
    if (oficial === "ocultista") return [dePreset("escolhidoPeloOutroLado")];
    return [];
  }

  /* ---------------- no trilho e na ficha ---------------- */

  function degrauDoNex(nex) { var n = Number(nex) || 0; return n >= 99 ? 20 : Math.max(0, Math.round(n / 5)); }

  /* O estágio que vale no trilho, ou null (a habilidade não chegou). */
  function estagioNoTrilho(h, t) {
    var tt = obj(t), atual = null, indice = -1;
    lista(h && h.estagios).forEach(function (s, i) {
      var chegou = tt.porPatente ? (s.patente !== null && s.patente !== undefined && Number(tt.patente) >= s.patente) : (Number(tt.passos) >= degrauDoNex(s.nex));
      if (chegou) { atual = s; indice = i; }
    });
    return atual ? { estagio: atual, indice: indice } : null;
  }
  /* O degrau em que a habilidade chega (para a vaga da escolha). */
  function degrauDeAquisicao(h, t) {
    var tt = obj(t);
    for (var i = 0; i < lista(h.estagios).length; i++) {
      var s = h.estagios[i];
      if (tt.porPatente) { if (s.patente !== null && s.patente !== undefined) return C() && C().degrauDaPatente ? C().degrauDaPatente(s.patente) : s.patente; }
      else return degrauDoNex(s.nex);
    }
    return Infinity;
  }

  function classeHbDe(ordem) {
    var c = C() && C().classe(obj(ordem).classe);
    return c && c.homebrew && Array.isArray(c.habilidadesCaracteristicas) && c.habilidadesCaracteristicas.length ? c : null;
  }
  function vagaId(h) { return "b.hbh-" + h.chave; }
  function chaveDaEntrada(h, classe) { return "hbh-" + h.chave + "-" + hash(String(obj(classe).chave || "")); }

  /* As habilidades que valem agora: { hab, estagio, indice, chave }. */
  function ativas(ordem, t) {
    var c = classeHbDe(ordem);
    if (!c) return [];
    return c.habilidadesCaracteristicas.map(function (h) {
      var e = estagioNoTrilho(h, t);
      return e ? { hab: h, estagio: e.estagio, indice: e.indice, chave: chaveDaEntrada(h, c), classe: c } : null;
    }).filter(Boolean);
  }

  /* As perícias que o jogador escolheu (o registro da vaga da escolha). */
  function escolhidas(ordem, h) {
    var r = lista(obj(ordem).escolhas).filter(function (x) { return x && x.etapa === vagaId(h); })[0];
    if (!r) return [];
    var o = obj(r.opcoes);
    return pericias(o.pericias || r.valor, 4);
  }

  /* O custo do estágio no trilho, com os ajustes de custo que o motor já
     produz para a habilidade oficial de que ela partiu (Treinamento
     Especial). `efeitosDoEstado` é est.efeitos. */
  function custoDe(a, t, efeitosDoEstado, estagio) {
    var s = estagio || a.estagio;
    var c = obj(t).porPatente && s.custoPatente !== null && s.custoPatente !== undefined ? s.custoPatente : s.custo;
    if (a.hab.base) lista(efeitosDoEstado).forEach(function (ef) { if (ef.tipo === "custoHabilidade" && ef.habilidade === a.hab.base) c += Number(ef.valor) || 0; });
    return Math.max(0, c);
  }

  /* O custo mínimo da habilidade no trilho (o do 1º estágio que existe
     nele): o que o limite de PE por rodada sempre deixa usar. */
  function custoMinimo(a, t, efeitosDoEstado) {
    var tt = obj(t);
    var primeiro = lista(a.hab.estagios).filter(function (s) { return !tt.porPatente || (s.patente !== null && s.patente !== undefined); })[0] || a.estagio;
    return custoDe(a, t, efeitosDoEstado, primeiro);
  }

  /* Os efeitos passivos, no formato que o motor de Ordem soma. Montados
     do zero a cada leitura: recarregar nunca soma de novo. */
  function efeitosPassivos(ordem, t) {
    var saida = [];
    ativas(ordem, t).forEach(function (a) {
      var detalhe = "Habilidade de classe · " + rotuloDoEstagio(a.estagio, obj(t).porPatente);
      a.estagio.efeitos.forEach(function (e) {
        var g = (POR_TIPO[e.tipo] || {}).grupo;
        if (g !== "passivo") return;
        if (e.tipo === "bonusPericiaEscolhida") {
          var esc = escolhidas(ordem, a.hab);
          if (esc.length) saida.push({ tipo: "bonusPericia", pericias: esc, valor: e.valor, fonte: a.hab.nome, detalhe: detalhe, habilidadeClasse: a.hab.chave });
          return;
        }
        var x = { tipo: e.tipo, valor: e.valor, fonte: a.hab.nome, detalhe: detalhe, habilidadeClasse: a.hab.chave };
        if (e.pericias) x.pericias = e.pericias.slice();
        saida.push(x);
      });
    });
    return saida;
  }

  function cabeNoAlvo(e, pericia, grau, esc) {
    if (e.exceto && e.exceto.indexOf(pericia) >= 0) return false;
    if (e.exigeTreinada && grau < 1) return false;
    if (e.alvo === "escolha") return esc.indexOf(pericia) >= 0;
    if (e.alvo === "lista") return lista(e.pericias).indexOf(pericia) >= 0;
    return true;
  }
  var BONUS_GRAU = { 0: 0, 1: 5, 2: 10, 3: 15 };
  function nivelDoGrau(g) { return GRAUS.indexOf(g) + 1; }

  /* As opções de uso num teste de perícia. grau = 0 a 3 (o atual).
     Cada opção: { id, hab, nome, rotulo, custo, valor | dado | treino }. */
  function opcoesDeTeste(ordem, t, pericia, grau, efeitosDoEstado) {
    var at = ativas(ordem, t), saida = [];
    at.forEach(function (a) {
      var esc = escolhidas(ordem, a.hab);
      var custo = custoDe(a, t, efeitosDoEstado);
      var minimo = custoMinimo(a, t, efeitosDoEstado);
      a.estagio.efeitos.forEach(function (e, i) {
        if (!cabeNoAlvo(e, pericia, grau, esc)) return;
        var base = { id: a.hab.chave + ":" + a.indice + ":" + i, hab: a.hab, nome: a.hab.nome, custo: custo, custoMinimo: minimo };
        if (e.tipo === "bonusTeste") saida.push(Object.assign(base, { valor: e.valor, rotulo: a.hab.nome + ": +" + e.valor }));
        else if (e.tipo === "dadoTeste") saida.push(Object.assign(base, { dado: e.dado, rotulo: a.hab.nome + ": +" + e.dado }));
        else if (e.tipo === "treinoTemporario") {
          var alvoNivel = nivelDoGrau(e.grau);
          if (alvoNivel > grau) saida.push(Object.assign(base, { treino: e.grau, valor: BONUS_GRAU[alvoNivel] - BONUS_GRAU[grau], rotulo: a.hab.nome + " (" + e.grau + ")" }));
          /* As habilidades que melhoram esta (Engenhosidade). */
          at.forEach(function (b) {
            if (b === a) return;
            b.estagio.efeitos.forEach(function (m, j) {
              if (m.tipo !== "melhoraTreino" || m.alvo !== a.hab.chave) return;
              var n = nivelDoGrau(m.grau);
              if (n <= grau || n <= alvoNivel) return;
              saida.push({ id: a.hab.chave + ":" + a.indice + ":" + i + "+" + b.hab.chave + ":" + b.indice + ":" + j, hab: a.hab, nome: a.hab.nome + " + " + b.hab.nome,
                custo: custo + m.custoExtra + custoDe(b, t, efeitosDoEstado), custoMinimo: minimo, treino: m.grau, valor: BONUS_GRAU[n] - BONUS_GRAU[grau],
                rotulo: a.hab.nome + " + " + b.hab.nome + " (" + m.grau + ")" });
            });
          });
        }
      });
    });
    return saida;
  }
  function opcoesDe(ordem, t, tipo, efeitosDoEstado) {
    var saida = [];
    ativas(ordem, t).forEach(function (a) {
      var custo = custoDe(a, t, efeitosDoEstado);
      var minimo = custoMinimo(a, t, efeitosDoEstado);
      a.estagio.efeitos.forEach(function (e, i) {
        if (e.tipo !== tipo) return;
        saida.push({ id: a.hab.chave + ":" + a.indice + ":" + i, hab: a.hab, nome: a.hab.nome, custo: custo, custoMinimo: minimo, valor: e.valor,
          rotulo: a.hab.nome + ": +" + e.valor + (tipo === "bonusDano" ? " no dano" : " no ataque") });
      });
    });
    return saida;
  }
  function opcoesDeAtaque(ordem, t, ef) { return opcoesDe(ordem, t, "bonusAtaque", ef); }
  function opcoesDeDano(ordem, t, ef) { return opcoesDe(ordem, t, "bonusDano", ef); }

  /* ---------------- textos ---------------- */

  function rotuloDoEstagio(s, porPatente) {
    if (porPatente && s.patente !== null && s.patente !== undefined) return PATENTES[s.patente];
    return "NEX " + s.nex + "% / nível " + degrauDoNex(s.nex);
  }
  function textoDoAlvo(e, h) {
    var partes = [];
    if (e.alvo === "escolha") partes.push("nas perícias escolhidas");
    else if (e.alvo === "lista") partes.push("em " + lista(e.pericias).map(nomePericia).join(", "));
    else partes.push("em qualquer perícia");
    if (e.exigeTreinada) partes.push("treinada");
    if (e.exceto) partes.push("exceto " + e.exceto.map(nomePericia).join(" e "));
    void h;
    return partes.join(" ");
  }
  function textoDoEfeito(e, nomesPorId) {
    var s = e.valor > 0 ? "+" + e.valor : String(e.valor);
    switch (e.tipo) {
      case "defesa": return s + " em Defesa";
      case "pvFixo": return s + " PV";
      case "peFixo": return s + " PE";
      case "pvPorNex": return s + " PV por marco";
      case "sanPorNex": return s + " SAN por marco";
      case "bonusPericia": return s + " em " + lista(e.pericias).map(nomePericia).join(", ");
      case "bonusPericiaEscolhida": return s + " nas perícias escolhidas";
      case "bonusTeste": return s + " no teste " + textoDoAlvo(e);
      case "dadoTeste": return "+" + e.dado + " no teste " + textoDoAlvo(e);
      case "treinoTemporario": return "benefícios de " + e.grau + " no teste " + textoDoAlvo(e);
      case "bonusAtaque": return s + " no ataque";
      case "bonusDano": return s + " no dano";
      case "melhoraTreino": return "usando " + ((nomesPorId || {})[e.alvo] || "a habilidade ligada") + ", +" + e.custoExtra + " PE para " + e.grau;
      case "conjuracao": return "conjura rituais (tabela de círculos da classe)";
    }
    return "";
  }
  function temUso(s) { return lista(s.efeitos).some(function (e) { return (POR_TIPO[e.tipo] || {}).grupo === "uso"; }); }
  function textoDoEstagio(h, s, porPatente, nomesPorId) {
    var custo = porPatente && s.custoPatente !== null && s.custoPatente !== undefined ? s.custoPatente : s.custo;
    var recurso = porPatente ? "PD" : "PE";
    var efs = lista(s.efeitos);
    var uso = efs.filter(function (e) { return (POR_TIPO[e.tipo] || {}).grupo === "uso"; }).map(function (e) { return textoDoEfeito(e, nomesPorId); });
    var outros = efs.filter(function (e) { return (POR_TIPO[e.tipo] || {}).grupo !== "uso"; }).map(function (e) { return textoDoEfeito(e, nomesPorId); });
    var partes = [];
    if (uso.length) partes.push((custo ? custo + " " + recurso + ": " : "sem custo: ") + uso.join(" ou "));
    if (outros.length) partes.push(outros.join(", "));
    return partes.join(" · ") || "sem efeito automatizado (só o texto)";
  }
  function nomesPorId(l) { var m = {}; lista(l).forEach(function (h) { m[h.chave] = h.nome; }); return m; }
  /* A prévia da evolução, para o editor e a consulta. */
  function previa(h, todas) {
    var nomes = nomesPorId(todas || [h]);
    var linhas = [];
    if (h.escolha) linhas.push("Escolha (criação e Progressão): " + h.escolha.quantidade + " perícia(s) " + (h.escolha.modo === "treinada" ? "treinada(s)" : "") + (h.escolha.exceto ? ", exceto " + h.escolha.exceto.map(nomePericia).join(" e ") : "") + ".");
    h.estagios.forEach(function (s, i) {
      linhas.push((i ? "Depois, em " : "Chega em ") + "NEX " + s.nex + "% / nível " + degrauDoNex(s.nex) + ": " + textoDoEstagio(h, s, false, nomes) + ".");
      if (s.patente !== null) linhas.push("   Patentes · " + PATENTES[s.patente] + ": " + textoDoEstagio(h, s, true, nomes) + ".");
    });
    if (!h.estagios.some(function (s) { return s.patente !== null; })) linhas.push("Não existe na Evolução por Patentes.");
    var semAuto = !h.estagios.some(function (s) { return s.efeitos.length; });
    if (semAuto) linhas.push("Sem efeito automatizado: a ficha mostra o texto, e a mesa aplica.");
    return linhas;
  }

  /* A entrada que vai para o catálogo de poderes (o cartão e a vaga da
     escolha). Sem efeitos: os passivos entram por efeitosPassivos, com o
     estágio, nunca duas vezes. */
  function entradaDe(h, classe) {
    var opcoes = [];
    if (h.escolha) {
      var op = { chave: "pericias", tipo: "pericias", quantidade: h.escolha.quantidade, rotulo: "Perícias de " + h.nome };
      if (h.escolha.modo === "treinada") op.modo = "treinada";
      if (h.escolha.exceto) op.exceto = h.escolha.exceto.slice();
      opcoes.push(op);
    }
    var temAuto = h.estagios.some(function (s) { return s.efeitos.length; });
    var soPassivo = temAuto && !h.estagios.some(temUso);
    return {
      chave: chaveDaEntrada(h, classe), nome: h.nome, tipo: "automatica", classes: [], fonte: "HOMEBREW", pagina: 0,
      resumo: h.descricao || h.nome, opcoes: opcoes, efeitos: [],
      automacao: !temAuto ? "informacao" : (soPassivo ? "calculo" : "parcial"),
      nota: !temAuto ? "Sem efeito automatizado: a mesa aplica." : (soPassivo ? "Os efeitos entram na conta da ficha." : "Nas rolagens pertinentes, a ficha oferece o uso, com o custo do estágio."),
      habilidadeClasse: h.chave, classeHomebrew: classe.homebrewId || "",
    };
  }

  /* Registra as entradas da classe no catálogo de poderes (idempotente). */
  function registrarDaClasse(classe) {
    var P = global.RAMAOrdemPoderes;
    if (!P || !P.registrarHabilidadeClasseHomebrew || !classe || !Array.isArray(classe.habilidadesCaracteristicas)) return;
    classe.habilidadesCaracteristicas.forEach(function (h) { P.registrarHabilidadeClasseHomebrew(entradaDe(h, classe)); });
  }

  global.RAMAOrdemHabilidadesClasse = {
    TIPOS: TIPOS, POR_TIPO: POR_TIPO, GRAUS: GRAUS, DADOS: DADOS, PATENTES: PATENTES, NEX: NEX, ROTULOS_PRESET: ROTULOS_PRESET,
    MAX_HABILIDADES: MAX_HABILIDADES, MAX_ESTAGIOS: MAX_ESTAGIOS, MAX_EFEITOS: MAX_EFEITOS,
    novoId: novoId, normalizarLista: normalizarLista, normalizarHabilidade: normalizarHabilidade, normalizarEfeito: normalizarEfeito,
    usaConjuracao: usaConjuracao, dePreset: dePreset, presetsDaClasse: presetsDaClasse,
    degrauDoNex: degrauDoNex, estagioNoTrilho: estagioNoTrilho, degrauDeAquisicao: degrauDeAquisicao,
    classeHbDe: classeHbDe, vagaId: vagaId, chaveDaEntrada: chaveDaEntrada, ativas: ativas, escolhidas: escolhidas,
    custoDe: custoDe, custoMinimo: custoMinimo, efeitosPassivos: efeitosPassivos, opcoesDeTeste: opcoesDeTeste, opcoesDeAtaque: opcoesDeAtaque, opcoesDeDano: opcoesDeDano,
    rotuloDoEstagio: rotuloDoEstagio, textoDoEfeito: textoDoEfeito, textoDoEstagio: textoDoEstagio, previa: previa, nomesPorId: nomesPorId,
    temUso: temUso, entradaDe: entradaDe, registrarDaClasse: registrarDaClasse,
  };
})(typeof window !== "undefined" ? window : globalThis);
