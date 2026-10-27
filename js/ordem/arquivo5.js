/* =====================================================================
   R.A.M.A. — Ordem Paranormal · estados do Arquivos Secretos 5
   =====================================================================
   O que o Arquivos Secretos 5 (v1.0) guarda numa ficha, e a regra de
   cada coisa — sem tela e sem rede. A ficha desenha (js/paginas/
   ficha-arquivo5.js); as contas (js/ordem/regras.js) perguntam daqui.

     teorias        Minha Teoria Absurda (Ufólogo): a teoria de cada
                    missão, o veredito do mestre e se os +3 PE já foram
                    dados (nunca duas vezes)
     turnos         Turno Invertido: as missões em que foi usado
     folego         Fôlego de Emergência: a cena e o que foi recuperado
     meditacoes     Meditação Ocultista: o interlúdio e a conta
     ruidos         Ruído de Comunicação: alvo e efeito de cada uso
     desafios       Desafiar o Ego: o ataque observado e o resultado
     rodada         a rodada da ficha (cena + número): "uma vez por
                    rodada" e "por 1 rodada" contam nela
     acido          Ácido Corrosivo valendo na cena (desarmado ou arma)
     destruir       armas corroídas esperando a confirmação no fim da cena
     deadMan        Dead Man Switch: alvos, perícias e graus transmitidos
     recebidos      o que ESTA ficha recebeu de outra (Aura de Confiança,
                    Parede de Carne, Direção Defensiva, Gaiola de
                    Proteção, grau do Dead Man Switch) — com o nome de quem
                    deu e até quando vale
     aliados        os aliados marcados por quem tem o poder (aura,
                    parede, conexão), só para registro da cena
     telas          Treinado nas Telas armado para o próximo teste
     dirigindo      Direção Defensiva: dirigindo nesta cena
     larva          Larva da Fúria: o efeito de cena e a rodada hostil
     nitro          Óxido Nitroso: veículo, cena e rodada
     transmissao    o Sino (registrado e confirmado), os outros
                    portadores de cada poder, a conexão, a sincronia e os
                    empréstimos da cena (perícia, poder, ritual)
     selos          fabricações (com id: recarregar não fabrica de novo)
                    e usos consumidos (id da operação: o mesmo uso não
                    gasta dois selos)

   Tempo é sempre o do JOGO: cena, rodada e interlúdio da ficha
   (Condições), e missão da cronologia da campanha (Arquivos Secretos 3)
   — nunca o relógio do computador.

   NADA AQUI ROLA DADO SOZINHO, nem mexe em outra ficha. Quem rola é a
   tela, por clique; o que vai para outra ficha passa pelo servidor
   (Sincronia Conectiva) ou é registrado pela própria pessoa.
   ===================================================================== */

(function (global) {
  "use strict";

  var ID = /^[A-Za-z0-9_.:|#-]{1,80}$/;
  var MAX = 40;

  function uuid() {
    var U = global.RAMAUtil;
    return U && U.uuid ? U.uuid() : "a" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
  function agora() { return new Date().toISOString(); }
  function texto(v, n) { return String(v === undefined || v === null ? "" : v).replace(/[\u0000-\u001F]/g, " ").slice(0, n || 120); }
  function inteiro(v, min, max, padrao) {
    var n = Math.round(Number(v));
    if (!isFinite(n)) return padrao;
    return Math.max(min, Math.min(max, n));
  }
  function idOk(v) { var s = String(v || ""); return ID.test(s) ? s : ""; }
  function carimbo(v) {
    if (typeof v !== "string" || !v) return "";
    return isNaN(new Date(v).getTime()) ? "" : v.slice(0, 40);
  }
  function lista(v) { return Array.isArray(v) ? v : []; }
  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  function novoId(prefixo) { return prefixo + "-" + String(uuid()).replace(/[^A-Za-z0-9]/g, "").slice(0, 24); }
  function nomes(v, n) {
    var vistos = {};
    return lista(v).map(function (x) { return texto(x, 80).trim(); }).filter(function (x) {
      if (!x || vistos[x.toLowerCase()]) return false;
      vistos[x.toLowerCase()] = true;
      return true;
    }).slice(0, n || 12);
  }

  function C() { return global.RAMAOrdemCatalogo || null; }
  function A3() { return global.RAMAOrdemArquivo3 || null; }
  function E() { return global.RAMAOrdemProgressao || null; }
  function EF() { return global.RAMAOrdemEfeitos || null; }

  /* Os poderes da ficha (progressão): só as aquisições válidas. */
  function aquisicoes(ordem, chave) {
    var est = E() && ordem ? E().estado(ordem, null) : null;
    return est ? est.adquiridos.filter(function (a) { return a.chave === chave && a.valido !== false; }) : [];
  }
  function temPoder(ordem, chave) { return aquisicoes(ordem, chave).length > 0; }
  function comAfinidade(ordem, chave) { return aquisicoes(ordem, chave).some(function (a) { return a.afinidade; }); }
  function temOrigem(ordem, chave) { return !!(ordem && ordem.origem === chave); }

  /* =================================================================
     O TEMPO DO JOGO
     ================================================================= */

  function cenaDe(ordem) {
    return (ordem && ordem.condicoes && ordem.condicoes.cena && ordem.condicoes.cena.id) || "inicial";
  }
  function emInterludio(ordem) {
    return !!(ordem && ordem.condicoes && ordem.condicoes.cena && ordem.condicoes.cena.interludio);
  }
  function interludioDe(ordem) {
    var c = ordem && ordem.condicoes;
    return c && c.interludio && typeof c.interludio.numero === "number" ? c.interludio.numero : 0;
  }
  /* Missão: o contador da cronologia da campanha (AS3). */
  function missaoDe(ordem) {
    var a = A3() && ordem ? A3().dados(ordem).cronologia : null;
    return a ? a.missao : 0;
  }

  /* =================================================================
     ESTADO
     ================================================================= */

  var CONDICOES_DE_MEDITACAO = [
    { chave: "precaria", nome: "Precária", multiplicador: 1, texto: "recuperação reduzida pela metade (1× o limite de PE)" },
    { chave: "normal", nome: "Normal", multiplicador: 2, texto: "o dobro do limite de PE" },
    { chave: "confortavel", nome: "Confortável", multiplicador: 3, texto: "recuperação triplicada (3× o limite de PE)" },
    { chave: "luxuosa", nome: "Luxuosa", multiplicador: 4, texto: "recuperação quadruplicada (4× o limite de PE)" },
  ];
  var POR_MEDITACAO = {};
  CONDICOES_DE_MEDITACAO.forEach(function (c) { POR_MEDITACAO[c.chave] = c; });

  /* O que uma ficha pode receber de OUTRA (p. 55-59). `ate`: "cena" (a
     cena da ficha que recebeu), "missao" (a missão da cronologia) ou
     "remover" (até tirar à mão). */
  var RECEBIVEIS = {
    aura: { nome: "Aura de Confiança", poder: "auraDeConfianca", pagina: 55, ate: "cena",
      texto: "+5 em testes de Iniciativa e contra presença perturbadora (a até 18 m de quem tem o poder)." },
    parede: { nome: "Parede de Carne", poder: "paredeDeCarne", pagina: 55, ate: "cena",
      texto: "Cobertura leve: +5 na Defesa, enquanto estiver adjacente a quem tem o poder." },
    direcao: { nome: "Direção Defensiva", poder: "direcaoDefensiva", pagina: 56, ate: "cena",
      texto: "+2 na Defesa e em testes de resistência, dentro do veículo enquanto quem tem o poder dirige." },
    gaiola: { nome: "Gaiola de Proteção", regalia: "gaiolaDeProtecao", pagina: 59, ate: "cena",
      texto: "Ocupante do veículo: +5 na Defesa; metade do dano por capotamento ou amassado na lataria (aplicado pela mesa)." },
    deadMan: { nome: "Dead Man Switch", poder: "deadManSwitch", pagina: 57, ate: "remover",
      texto: "O mesmo grau de treinamento de quem transmitiu, numa perícia — só o grau (nem atributo, nem bônus)." },
  };

  var GRAUS = ["destreinado", "treinado", "veterano", "expert"];

  function normalizarRecebido(r) {
    var x = obj(r);
    var id = idOk(x.id);
    if (!id || !RECEBIVEIS[x.tipo]) return null;
    var saida = {
      id: id, tipo: x.tipo, de: texto(x.de, 80).trim(), em: carimbo(x.em),
      ate: ["cena", "missao", "remover"].indexOf(x.ate) >= 0 ? x.ate : RECEBIVEIS[x.tipo].ate,
      cena: idOk(x.cena), missao: inteiro(x.missao, 0, 99999, 0),
    };
    if (x.tipo === "deadMan") {
      var cat = C();
      if (!cat || !cat.pericia(x.pericia)) return null;
      saida.pericia = x.pericia;
      saida.grau = GRAUS.indexOf(x.grau) > 0 ? x.grau : "treinado";
    }
    return saida;
  }

  function normalizarSino(s) {
    var x = obj(s);
    var registrado = x.registrado === true;
    return {
      registrado: registrado,
      registradoEm: registrado ? carimbo(x.registradoEm) : "",
      nota: registrado ? texto(x.nota, 300) : "",
      confirmado: registrado && x.confirmado === true,
      confirmadoPor: registrado && x.confirmado === true ? (x.confirmadoPor === "mestre" ? "mestre" : "mesa") : "",
      confirmadoEm: registrado && x.confirmado === true ? carimbo(x.confirmadoEm) : "",
    };
  }

  var PODERES_DE_TRANSMISSAO = ["conexaoComunicativa", "sincroniaConectiva", "transmissaoDePericia", "transmissaoDePoder", "transmissaoDeRitual"];

  function normalizarSincronia(s) {
    var x = obj(s);
    var id = idOk(x.id);
    if (!id) return null;
    var ini = obj(x.iniciativa);
    return {
      id: id, cena: idOk(x.cena), entrouEm: carimbo(x.entrouEm),
      participantes: lista(x.participantes).map(function (p) {
        var pp = obj(p);
        var nome = texto(pp.nome, 80).trim();
        if (!nome) return null;
        return { nome: nome, personagemId: /^[A-Za-z0-9-]{8,60}$/.test(String(pp.personagemId || "")) ? String(pp.personagemId) : "" };
      }).filter(Boolean).slice(0, 8),
      iniciativa: x.iniciativa ? {
        propria: inteiro(ini.propria, -99, 999, 0),
        usada: inteiro(ini.usada, -99, 999, 0),
        de: texto(ini.de, 80),
        rodadaUsada: inteiro(ini.rodadaUsada, 0, 9999, 0),
      } : null,
      intencao: texto(x.intencao, 300),
      /* As operações que passaram por esta ficha (gastos e redirecionamentos),
         pelo id: a mesma operação não entra duas vezes. */
      operacoes: lista(x.operacoes).map(function (o) {
        var oo = obj(o);
        var op = idOk(oo.opId);
        if (!op) return null;
        return {
          opId: op, tipo: oo.tipo === "redirecionar" ? "redirecionar" : "pe",
          papel: oo.papel === "alvo" ? "alvo" : "autor",
          outro: texto(oo.outro, 80), valor: inteiro(oo.valor, 0, 999, 0),
          recurso: oo.recurso === "pv" ? "pv" : "pe", natureza: oo.natureza === "perda" ? "perda" : "dano", em: carimbo(oo.em),
        };
      }).filter(Boolean).slice(-30),
    };
  }

  function normalizarEmprestimo(e, tipo) {
    var x = obj(e);
    var cena = idOk(x.cena);
    var de = texto(x.de, 80).trim();
    if (!cena || !de) return null;
    var base = { cena: cena, de: de, em: carimbo(x.em) };
    if (tipo === "pericia") {
      var cat = C();
      if (!cat || !cat.pericia(x.pericia)) return null;
      var atr = ["agi", "for", "int", "pre", "vig"].indexOf(x.atributo) >= 0 ? x.atributo : (cat.pericia(x.pericia).atributo || "");
      return Object.assign(base, {
        pericia: x.pericia, atributo: atr, dados: inteiro(x.dados, 0, 9, 1),
        grau: GRAUS.indexOf(x.grau) >= 0 ? x.grau : "destreinado", bonus: inteiro(x.bonus, -99, 99, 0),
      });
    }
    if (tipo === "poder") {
      var chave = texto(x.chave, 60);
      var P = global.RAMAOrdemPoderes;
      if (!P || !P.poder(chave) || PODERES_DE_TRANSMISSAO.indexOf(chave) >= 0) return null;
      return Object.assign(base, { chave: chave });
    }
    if (tipo === "ritual") {
      var r = obj(x.ritual);
      var nome = texto(r.nome, 120).trim();
      if (!nome) return null;
      return Object.assign(base, { ritual: JSON.parse(JSON.stringify(r)) });
    }
    return null;
  }

  function normalizarTransmissao(t) {
    var x = obj(t);
    var port = obj(x.portadores);
    var portadores = {};
    PODERES_DE_TRANSMISSAO.forEach(function (k) { var l = nomes(port[k], 12); if (l.length) portadores[k] = l; });
    var con = obj(x.conexao);
    var usos = obj(x.usos);
    return {
      sino: normalizarSino(x.sino),
      portadores: portadores,
      conexao: idOk(con.cena) ? { cena: idOk(con.cena), presentes: nomes(con.presentes, 12) } : null,
      sincronia: normalizarSincronia(x.sincronia),
      pericia: normalizarEmprestimo(x.pericia, "pericia"),
      poder: normalizarEmprestimo(x.poder, "poder"),
      ritual: normalizarEmprestimo(x.ritual, "ritual"),
      usos: { pericia: idOk(usos.pericia), poder: idOk(usos.poder), ritual: idOk(usos.ritual) },
    };
  }

  function normalizar(ordem, bruto) {
    var b = obj(bruto && bruto.arquivo5 !== undefined ? bruto.arquivo5 : (ordem && ordem.arquivo5));
    var ac = obj(b.acido);
    var dm = obj(b.deadMan);
    var rd = obj(b.rodada);
    var te = obj(b.telas);
    var dg = obj(b.dirigindo);
    var lv = obj(b.larva);
    var al = obj(b.aliados);
    var se = obj(b.selos);
    var cat = C();

    ordem.arquivo5 = {
      teorias: lista(b.teorias).map(function (t) {
        var x = obj(t);
        var id = idOk(x.id);
        var txt = texto(x.texto, 600).trim();
        if (!id || !txt) return null;
        var resultado = x.resultado === "correta" || x.resultado === "incorreta" ? x.resultado : "";
        return {
          id: id, missao: inteiro(x.missao, 0, 99999, 0), texto: txt, em: carimbo(x.em),
          resultado: resultado,
          por: resultado ? (x.por === "mestre" ? "mestre" : "mesa") : "",
          resolvidaEm: resultado ? carimbo(x.resolvidaEm) : "",
          /* Os +3 PE: dados uma vez, e só com a teoria correta. */
          concedido: resultado === "correta" && x.concedido === true,
        };
      }).filter(Boolean).slice(-MAX),
      turnos: lista(b.turnos).map(function (u) {
        var x = obj(u);
        var id = idOk(x.id);
        return id ? { id: id, missao: inteiro(x.missao, 0, 99999, 0), interludio: inteiro(x.interludio, 0, 99999, 0), em: carimbo(x.em) } : null;
      }).filter(Boolean).slice(-MAX),
      folego: lista(b.folego).map(function (u) {
        var x = obj(u);
        var id = idOk(x.id);
        return id ? { id: id, cena: idOk(x.cena), recurso: x.recurso === "pe" ? "pe" : (x.recurso === "pd" ? "pd" : "pv"),
          rolagem: texto(x.rolagem, 60), valor: inteiro(x.valor, 0, 999, 0), em: carimbo(x.em) } : null;
      }).filter(Boolean).slice(-20),
      meditacoes: lista(b.meditacoes).map(function (u) {
        var x = obj(u);
        var id = idOk(x.id);
        return id && POR_MEDITACAO[x.condicao] ? { id: id, interludio: inteiro(x.interludio, 0, 99999, 0), condicao: x.condicao,
          limite: inteiro(x.limite, 0, 99, 0), recuperado: inteiro(x.recuperado, 0, 999, 0), em: carimbo(x.em) } : null;
      }).filter(Boolean).slice(-20),
      ruidos: lista(b.ruidos).map(function (u) {
        var x = obj(u);
        var id = idOk(x.id);
        return id ? { id: id, cena: idOk(x.cena), alvo: texto(x.alvo, 80), efeito: texto(x.efeito, 120), de: x.de === "penalidade" ? "penalidade" : "bonus", em: carimbo(x.em) } : null;
      }).filter(Boolean).slice(-20),
      desafios: lista(b.desafios).map(function (u) {
        var x = obj(u);
        var id = idOk(x.id);
        if (!id) return null;
        var res = ["acerto", "erro"].indexOf(x.resultado) >= 0 ? x.resultado : "pendente";
        return { id: id, cena: idOk(x.cena), rodada: inteiro(x.rodada, 0, 9999, 0), aliado: texto(x.aliado, 80), ataque: texto(x.ataque, 120),
          resultado: res, danoExtra: res === "acerto" ? inteiro(x.danoExtra, 0, 99, 0) : 0, devolvido: res === "erro" && x.devolvido === true, em: carimbo(x.em) };
      }).filter(Boolean).slice(-20),
      rodada: idOk(rd.cena) ? { cena: idOk(rd.cena), numero: inteiro(rd.numero, 1, 9999, 1) } : null,
      acido: idOk(ac.cena) && (ac.alvo === "desarmado" || (ac.alvo === "arma" && idOk(ac.itemId))) ? {
        cena: idOk(ac.cena), alvo: ac.alvo, itemId: ac.alvo === "arma" ? idOk(ac.itemId) : "", itemNome: texto(ac.itemNome, 120),
        amaldicoado: ac.amaldicoado === true, afinidade: ac.afinidade === true, em: carimbo(ac.em),
      } : null,
      destruir: lista(b.destruir).map(function (d) {
        var x = obj(d);
        var it = idOk(x.itemId);
        return it ? { itemId: it, itemNome: texto(x.itemNome, 120), cena: idOk(x.cena), motivo: texto(x.motivo, 160), em: carimbo(x.em) } : null;
      }).filter(Boolean).slice(-10),
      deadMan: idOk(dm.id) ? {
        id: idOk(dm.id), cena: idOk(dm.cena), em: carimbo(dm.em),
        alvos: nomes(dm.alvos, 3),
        pericias: lista(dm.pericias).filter(function (k) { return cat && cat.pericia(k); }).slice(0, 2),
        graus: (function () { var g = {}; Object.keys(obj(dm.graus)).forEach(function (k) { if (cat && cat.pericia(k) && GRAUS.indexOf(dm.graus[k]) > 0) g[k] = dm.graus[k]; }); return g; })(),
        afinidade: dm.afinidade === true,
        encerrado: dm.encerrado && typeof dm.encerrado === "object" ? { em: carimbo(dm.encerrado.em), motivo: texto(dm.encerrado.motivo, 80) } : null,
        morreu: dm.morreu === true, missao: inteiro(dm.missao, 0, 99999, 0),
      } : null,
      recebidos: lista(b.recebidos).map(normalizarRecebido).filter(Boolean).slice(-20),
      aliados: (function () {
        var s = {};
        ["aura", "parede", "conexao"].forEach(function (k) {
          var a = obj(al[k]);
          if (idOk(a.cena)) s[k] = { cena: idOk(a.cena), nomes: nomes(a.nomes, 12) };
        });
        return s;
      })(),
      telas: te.armado === true ? { armado: true, cena: idOk(te.cena), em: carimbo(te.em) } : null,
      dirigindo: idOk(dg.cena) ? { cena: idOk(dg.cena), veiculo: texto(dg.veiculo, 80) } : null,
      larva: idOk(lv.efeitoId) ? { efeitoId: idOk(lv.efeitoId), cena: idOk(lv.cena), hostilNaRodada: inteiro(lv.hostilNaRodada, 0, 9999, 0) } : null,
      nitro: lista(b.nitro).map(function (n) {
        var x = obj(n);
        var v = idOk(x.veiculoId);
        return v ? { veiculoId: v, cena: idOk(x.cena), rodada: inteiro(x.rodada, 0, 9999, 0) } : null;
      }).filter(Boolean).slice(-8),
      transmissao: normalizarTransmissao(b.transmissao),
      selos: {
        fabricacoes: lista(se.fabricacoes).map(function (f) {
          var x = obj(f);
          var id = idOk(x.id);
          return id ? { id: id, interludio: inteiro(x.interludio, 0, 99999, 0), quantidade: inteiro(x.quantidade, 0, 20, 0), custo: inteiro(x.custo, 0, 999, 0), em: carimbo(x.em) } : null;
        }).filter(Boolean).slice(-MAX),
        usos: lista(se.usos).map(function (u) {
          var x = obj(u);
          var op = idOk(x.opId);
          return op ? { opId: op, itemId: idOk(x.itemId), ritual: texto(x.ritual, 120), em: carimbo(x.em) } : null;
        }).filter(Boolean).slice(-MAX),
      },
    };
    return ordem;
  }

  function vazio() { return normalizar({}, {}).arquivo5; }

  function dados(ordem) {
    if (!ordem.arquivo5) normalizar(ordem, {});
    return ordem.arquivo5;
  }

  /* =================================================================
     A RODADA DA FICHA
     -----------------------------------------------------------------
     "Uma vez por rodada" (Desafiar o Ego), "por 1 rodada" (Óxido Nitroso)
     e "ao fim da rodada" (Larva da Fúria) contam a rodada da ficha: uma
     cena nova começa na rodada 1, e "Próxima rodada" avança.
     ================================================================= */

  function rodada(ordem) {
    var r = dados(ordem).rodada;
    var cena = cenaDe(ordem);
    return r && r.cena === cena ? r.numero : 1;
  }
  function proximaRodada(ordem) {
    var a = dados(ordem);
    var n = rodada(ordem) + 1;
    a.rodada = { cena: cenaDe(ordem), numero: n };
    return n;
  }

  /* =================================================================
     ORIGENS (p. 54)
     ================================================================= */

  /* Minha Teoria Absurda: uma por missão em que há algo a investigar. */
  function teoriaDaMissao(ordem) {
    var m = missaoDe(ordem);
    return dados(ordem).teorias.filter(function (t) { return t.missao === m; })[0] || null;
  }
  function registrarTeoria(ordem, txt) {
    if (!temOrigem(ordem, "ufologo")) return { ok: false, motivo: "Só a origem Ufólogo tem Minha Teoria Absurda." };
    var t = texto(txt, 600).trim();
    if (!t) return { ok: false, motivo: "Escreva a teoria." };
    if (teoriaDaMissao(ordem)) return { ok: false, motivo: "Já há uma teoria nesta missão: uma por missão." };
    var nova = { id: novoId("teo"), missao: missaoDe(ordem), texto: t, em: agora(), resultado: "", por: "", resolvidaEm: "", concedido: false };
    dados(ordem).teorias.push(nova);
    return { ok: true, teoria: nova };
  }
  /* O veredito (do mestre, na campanha). Correta: +3 PE máximos (que
     ficam, pelo `concedido`) e +3 PE atuais — a tela soma os atuais na
     mesma gravação. Uma teoria já concedida não concede de novo. */
  function resolverTeoria(ordem, id, correta, por) {
    var t = dados(ordem).teorias.filter(function (x) { return x.id === id; })[0];
    if (!t) return { ok: false, motivo: "Teoria não encontrada." };
    if (t.concedido) return { ok: false, motivo: "Esta teoria já foi confirmada e os +3 PE já foram dados." };
    t.resultado = correta ? "correta" : "incorreta";
    t.por = por === "mestre" ? "mestre" : "mesa";
    t.resolvidaEm = agora();
    var dar = !!correta;
    if (dar) t.concedido = true;
    return { ok: true, concede: dar ? 3 : 0, teoria: t };
  }
  function peDoUfologo(ordem) {
    if (!ordem || !ordem.arquivo5 || !temOrigem(ordem, "ufologo")) return 0;
    return 3 * ordem.arquivo5.teorias.filter(function (t) { return t.concedido; }).length;
  }

  /* Turno Invertido: uma vez por missão, numa cena de interlúdio. Não
     gasta ação de interlúdio — os benefícios de dormir são da mesa. */
  function turnoUsadoNaMissao(ordem) {
    var m = missaoDe(ordem);
    return dados(ordem).turnos.some(function (u) { return u.missao === m; });
  }
  function usarTurnoInvertido(ordem) {
    if (!temOrigem(ordem, "funcionarioDeBeiraDeEstrada")) return { ok: false, motivo: "Só a origem Funcionário de Beira de Estrada tem Turno Invertido." };
    if (!emInterludio(ordem)) return { ok: false, motivo: "Turno Invertido é usado durante uma cena de interlúdio." };
    if (turnoUsadoNaMissao(ordem)) return { ok: false, motivo: "Turno Invertido já foi usado nesta missão." };
    var u = { id: novoId("tur"), missao: missaoDe(ordem), interludio: interludioDe(ordem), em: agora() };
    dados(ordem).turnos.push(u);
    return { ok: true, uso: u };
  }

  /* =================================================================
     PODERES DE CLASSE (p. 55-56)
     ================================================================= */

  function folegoNaCena(ordem) {
    var c = cenaDe(ordem);
    return dados(ordem).folego.filter(function (u) { return u.cena === c; })[0] || null;
  }
  function registrarFolego(ordem, recurso, valor, rolagem) {
    if (!temPoder(ordem, "folegoDeEmergencia")) return { ok: false, motivo: "A ficha não tem Fôlego de Emergência." };
    if (folegoNaCena(ordem)) return { ok: false, motivo: "Fôlego de Emergência já foi usado nesta cena." };
    var u = { id: novoId("fol"), cena: cenaDe(ordem), recurso: recurso, rolagem: texto(rolagem, 60), valor: inteiro(valor, 0, 999, 0), em: agora() };
    dados(ordem).folego.push(u);
    return { ok: true, uso: u };
  }

  /* Meditação Ocultista: o multiplicador da condição SUBSTITUI o dobro
     do normal (precária 1×, normal 2×, confortável 3×, luxuosa 4× o
     limite) — nunca os dois juntos. */
  function planoDeMeditacao(limite, condicao) {
    var c = POR_MEDITACAO[condicao] || POR_MEDITACAO.normal;
    var l = Math.max(0, inteiro(limite, 0, 99, 0));
    return { condicao: c.chave, nome: c.nome, limite: l, multiplicador: c.multiplicador, total: l * c.multiplicador,
      conta: "limite de PE " + l + " × " + c.multiplicador + " (" + c.texto + ") = " + (l * c.multiplicador) };
  }
  function meditouNoInterludio(ordem) {
    var n = interludioDe(ordem);
    return dados(ordem).meditacoes.some(function (m) { return m.interludio === n; });
  }
  function registrarMeditacao(ordem, plano, recuperado) {
    if (!temPoder(ordem, "meditacaoOcultista")) return { ok: false, motivo: "A ficha não tem Meditação Ocultista." };
    if (!emInterludio(ordem)) return { ok: false, motivo: "Meditação é uma ação de interlúdio." };
    if (meditouNoInterludio(ordem)) return { ok: false, motivo: "Você só pode meditar uma vez por interlúdio." };
    var m = { id: novoId("med"), interludio: interludioDe(ordem), condicao: plano.condicao, limite: plano.limite, recuperado: inteiro(recuperado, 0, 999, 0), em: agora() };
    dados(ordem).meditacoes.push(m);
    return { ok: true, meditacao: m };
  }

  /* Ruído de Comunicação: quem tem o poder registra o uso (reação, 4 PE).
     A inversão mora no efeito da ficha do ALVO (inverterEfeito). */
  function registrarRuido(ordem, alvo, efeito, de) {
    if (!temPoder(ordem, "ruidoDeComunicacao")) return { ok: false, motivo: "A ficha não tem Ruído de Comunicação." };
    var u = { id: novoId("rui"), cena: cenaDe(ordem), alvo: texto(alvo, 80) || "alvo", efeito: texto(efeito, 120), de: de === "penalidade" ? "penalidade" : "bonus", em: agora() };
    dados(ordem).ruidos.push(u);
    return { ok: true, uso: u };
  }

  /* Só um efeito sobre DADOS rolados pode ser invertido: os modificadores
     do tipo "dados" (um d20 a mais ou a menos). Bônus numérico fixo não é
     dado — fica como está. */
  function efeitoInvertivel(inst) {
    return !!(inst && Array.isArray(inst.modificadores) && inst.modificadores.some(function (m) { return m && m.tipo === "dados" && m.valor; }));
  }
  function inversaoValendo(inst, cena) {
    return !!(inst && inst.invertido && inst.invertido.cena && inst.invertido.cena === cena);
  }
  function inverterEfeito(ordem, efeitoId, por) {
    var cond = ordem && ordem.condicoes;
    var inst = cond && Array.isArray(cond.efeitos) ? cond.efeitos.filter(function (x) { return x && x.id === efeitoId; })[0] : null;
    if (!inst) return { ok: false, motivo: "Efeito não encontrado." };
    if (!efeitoInvertivel(inst)) return { ok: false, motivo: "Este efeito não mexe em dados rolados: Ruído de Comunicação não o inverte." };
    var cena = cenaDe(ordem);
    if (inversaoValendo(inst, cena)) return { ok: false, motivo: "Este efeito já está invertido nesta cena — inverter de novo desfaria a inversão." };
    inst.invertido = { por: texto(por, 80) || "Ruído de Comunicação", cena: cena, em: agora() };
    return { ok: true, efeito: inst };
  }
  function desfazerInversao(ordem, efeitoId) {
    var cond = ordem && ordem.condicoes;
    var inst = cond && Array.isArray(cond.efeitos) ? cond.efeitos.filter(function (x) { return x && x.id === efeitoId; })[0] : null;
    if (!inst || !inst.invertido) return { ok: false, motivo: "Nada a desfazer." };
    delete inst.invertido;
    return { ok: true };
  }

  /* Desafiar o Ego: uma vez por rodada, 1 PE (cobrado pela tela). */
  function desafioNaRodada(ordem) {
    var c = cenaDe(ordem);
    var r = rodada(ordem);
    return dados(ordem).desafios.filter(function (d) { return d.cena === c && d.rodada === r; })[0] || null;
  }
  function registrarDesafio(ordem, aliado, ataque) {
    if (!temPoder(ordem, "desafiarOEgo")) return { ok: false, motivo: "A ficha não tem Desafiar o Ego." };
    if (desafioNaRodada(ordem)) return { ok: false, motivo: "Desafiar o Ego já foi usado nesta rodada." };
    var nome = texto(aliado, 80).trim();
    if (!nome) return { ok: false, motivo: "Diga qual aliado está atacando." };
    var d = { id: novoId("des"), cena: cenaDe(ordem), rodada: rodada(ordem), aliado: nome, ataque: texto(ataque, 120), resultado: "pendente", danoExtra: 0, devolvido: false, em: agora() };
    dados(ordem).desafios.push(d);
    return { ok: true, desafio: d };
  }
  /* Acertou: dano extra = Presença. Errou: o PE volta, UMA vez. */
  function resolverDesafio(ordem, id, acertou, presenca) {
    var d = dados(ordem).desafios.filter(function (x) { return x.id === id; })[0];
    if (!d) return { ok: false, motivo: "Desafio não encontrado." };
    if (d.resultado !== "pendente") return { ok: false, motivo: "Este desafio já foi resolvido." };
    if (acertou) {
      d.resultado = "acerto";
      d.danoExtra = Math.max(0, inteiro(presenca, 0, 99, 0));
      return { ok: true, desafio: d, devolver: 0 };
    }
    d.resultado = "erro";
    d.devolvido = true;
    return { ok: true, desafio: d, devolver: 1 };
  }

  /* Treinado nas Telas: armado ANTES do teste; o teste seguinte de
     Iniciativa ou Reflexos usa o Intelecto e cobra os 2 PE. */
  function armarTelas(ordem, armado) {
    if (armado && !temPoder(ordem, "treinadoNasTelas")) return { ok: false, motivo: "A ficha não tem Treinado nas Telas." };
    dados(ordem).telas = armado ? { armado: true, cena: cenaDe(ordem), em: agora() } : null;
    return { ok: true };
  }
  function telasArmado(ordem) {
    var t = ordem && ordem.arquivo5 && ordem.arquivo5.telas;
    return !!(t && t.armado && temPoder(ordem, "treinadoNasTelas"));
  }

  /* =================================================================
     O QUE OUTRA FICHA DEU A ESTA (recebidos)
     ================================================================= */

  function adicionarRecebido(ordem, tipo, de, extra) {
    if (!RECEBIVEIS[tipo]) return { ok: false, motivo: "Benefício desconhecido." };
    var nome = texto(de, 80).trim();
    if (!nome) return { ok: false, motivo: "Diga de quem veio." };
    var x = extra || {};
    var r = normalizarRecebido({ id: novoId("rec"), tipo: tipo, de: nome, em: agora(), ate: x.ate || RECEBIVEIS[tipo].ate,
      cena: cenaDe(ordem), missao: missaoDe(ordem), pericia: x.pericia, grau: x.grau });
    if (!r) return { ok: false, motivo: "Dados incompletos (a perícia e o grau, no Dead Man Switch)." };
    var a = dados(ordem);
    /* O mesmo benefício, da mesma pessoa, na mesma perícia: um só. */
    var igual = a.recebidos.filter(function (q) { return recebidoValendo(ordem, q) && q.tipo === r.tipo && q.de.toLowerCase() === r.de.toLowerCase() && (q.pericia || "") === (r.pericia || ""); })[0];
    if (igual) return { ok: false, motivo: RECEBIVEIS[tipo].nome + " de " + r.de + " já está valendo." };
    a.recebidos.push(r);
    return { ok: true, recebido: r };
  }
  function removerRecebido(ordem, id) {
    var a = dados(ordem);
    var antes = a.recebidos.length;
    a.recebidos = a.recebidos.filter(function (r) { return r.id !== id; });
    return { ok: a.recebidos.length < antes };
  }
  function recebidoValendo(ordem, r) {
    if (!r) return false;
    if (r.ate === "cena") return r.cena === cenaDe(ordem);
    if (r.ate === "missao") return r.missao === missaoDe(ordem);
    return true;
  }
  function recebidosValendo(ordem) {
    if (!ordem || !ordem.arquivo5) return [];
    return ordem.arquivo5.recebidos.filter(function (r) { return recebidoValendo(ordem, r); });
  }
  /* O grau recebido numa perícia (Dead Man Switch): o maior valendo. */
  function grauRecebido(ordem, pericia) {
    var melhor = null;
    recebidosValendo(ordem).forEach(function (r) {
      if (r.tipo !== "deadMan" || r.pericia !== pericia) return;
      if (!melhor || GRAUS.indexOf(r.grau) > GRAUS.indexOf(melhor.grau)) melhor = r;
    });
    return melhor ? { grau: melhor.grau, fonte: "Dead Man Switch", detalhe: "de " + melhor.de + " (AS5 p. 57)" } : null;
  }

  /* Os aliados marcados por quem tem o poder (registro da cena). */
  function marcarAliados(ordem, qual, lista0) {
    if (["aura", "parede", "conexao"].indexOf(qual) < 0) return { ok: false };
    dados(ordem).aliados[qual] = { cena: cenaDe(ordem), nomes: nomes(lista0, 12) };
    return { ok: true };
  }
  function aliadosNaCena(ordem, qual) {
    var a = ordem && ordem.arquivo5 && ordem.arquivo5.aliados[qual];
    return a && a.cena === cenaDe(ordem) ? a.nomes : [];
  }

  function dirigir(ordem, sim, veiculo) {
    dados(ordem).dirigindo = sim ? { cena: cenaDe(ordem), veiculo: texto(veiculo, 80) } : null;
    return { ok: true };
  }
  function dirigindo(ordem) {
    var d = ordem && ordem.arquivo5 && ordem.arquivo5.dirigindo;
    return !!(d && d.cena === cenaDe(ordem));
  }

  /* =================================================================
     PODERES PARANORMAIS (p. 57)
     ================================================================= */

  /* Ácido Corrosivo: até o fim da cena, desarmado OU uma arma corpo a
     corpo escolhida. Nada no item muda: o ajuste é lido daqui. */
  function ativarAcido(ordem, alvo, item, amaldicoado) {
    if (!temPoder(ordem, "acidoCorrosivo")) return { ok: false, motivo: "A ficha não tem Ácido Corrosivo." };
    var a = dados(ordem);
    if (acidoValendo(ordem)) return { ok: false, motivo: "O ácido já está valendo nesta cena." };
    if (alvo === "arma" && !(item && idOk(item.id))) return { ok: false, motivo: "Escolha a arma corpo a corpo." };
    a.acido = {
      cena: cenaDe(ordem), alvo: alvo === "arma" ? "arma" : "desarmado",
      itemId: alvo === "arma" ? item.id : "", itemNome: alvo === "arma" ? texto(item.nome, 120) : "",
      amaldicoado: alvo === "arma" && !!amaldicoado, afinidade: comAfinidade(ordem, "acidoCorrosivo"), em: agora(),
    };
    return { ok: true, acido: a.acido };
  }
  function acidoValendo(ordem) {
    var ac = ordem && ordem.arquivo5 && ordem.arquivo5.acido;
    return ac && ac.cena === cenaDe(ordem) ? ac : null;
  }
  /* O ajuste no ataque e no dano de UMA arma (ou do ataque desarmado). */
  function acidoNaArma(ordem, item, desarmado) {
    var ac = acidoValendo(ordem);
    if (!ac) return null;
    var vale = ac.alvo === "desarmado" ? !!desarmado : (item && item.id === ac.itemId);
    if (!vale) return null;
    var af = comAfinidade(ordem, "acidoCorrosivo");
    return { ataque: af ? 4 : 2, dano: af ? 10 : 5, tipoDano: "Químico", afinidade: af,
      nota: "Ácido Corrosivo" + (af ? " (afinidade)" : "") + ": +" + (af ? 4 : 2) + " no ataque, +" + (af ? 10 : 5) + " no dano, dano químico (AS5 p. 57)." };
  }
  /* Fim da cena: a arma não amaldiçoada é destruída — fica esperando a
     confirmação (o item só sai do inventário com ela). */
  function aoFimDaCenaDoAcido(ordem, cenaQueAcabou) {
    var a = dados(ordem);
    var ac = a.acido;
    if (!ac || ac.cena !== cenaQueAcabou) return null;
    var pendente = null;
    if (ac.alvo === "arma" && !ac.amaldicoado && !a.destruir.some(function (d) { return d.itemId === ac.itemId; })) {
      pendente = { itemId: ac.itemId, itemNome: ac.itemNome, cena: ac.cena, motivo: "Ácido Corrosivo: arma não amaldiçoada destruída no fim da cena (AS5 p. 57).", em: agora() };
      a.destruir.push(pendente);
    }
    a.acido = null;
    return pendente;
  }
  function encerrarAcido(ordem) { dados(ordem).acido = null; return { ok: true }; }
  function resolverDestruicao(ordem, itemId) {
    var a = dados(ordem);
    a.destruir = a.destruir.filter(function (d) { return d.itemId !== itemId; });
    return { ok: true };
  }

  /* Dead Man Switch: só machucado; um alvo e uma perícia (três alvos e
     duas perícias com afinidade); vai o GRAU, nunca atributo ou valor. */
  function ativarDeadMan(ordem, alvos, pericias, grauDe, machucado) {
    if (!temPoder(ordem, "deadManSwitch")) return { ok: false, motivo: "A ficha não tem Dead Man Switch." };
    if (!machucado) return { ok: false, motivo: "Dead Man Switch só é usado machucado (metade dos PV ou menos)." };
    var af = comAfinidade(ordem, "deadManSwitch");
    var al = nomes(alvos, 3);
    var pe = lista(pericias).filter(function (k, i, l) { return C() && C().pericia(k) && l.indexOf(k) === i; });
    if (!al.length) return { ok: false, motivo: "Escolha o alvo (em alcance médio)." };
    if (al.length > (af ? 3 : 1)) return { ok: false, motivo: af ? "Até três alvos." : "Um alvo (três com afinidade)." };
    if (!pe.length) return { ok: false, motivo: "Escolha a perícia." };
    if (pe.length > (af ? 2 : 1)) return { ok: false, motivo: af ? "Até duas perícias (a adicional da afinidade)." : "Uma perícia (mais uma com afinidade)." };
    var graus = {};
    for (var i = 0; i < pe.length; i++) {
      var g = typeof grauDe === "function" ? grauDe(pe[i]) : "destreinado";
      if (GRAUS.indexOf(g) <= 0) return { ok: false, motivo: "Só uma perícia em que você é treinado pode ser transmitida." };
      graus[pe[i]] = g;
    }
    dados(ordem).deadMan = { id: novoId("dms"), cena: cenaDe(ordem), em: agora(), alvos: al, pericias: pe, graus: graus,
      afinidade: af, encerrado: null, morreu: false, missao: missaoDe(ordem) };
    return { ok: true, deadMan: dados(ordem).deadMan };
  }
  /* Valendo: ligado e ainda machucado — ou, com afinidade e morte depois
     do uso, até o fim da missão em que morreu. */
  function deadManValendo(ordem, machucado) {
    var d = ordem && ordem.arquivo5 && ordem.arquivo5.deadMan;
    if (!d || d.encerrado) return null;
    if (d.morreu) return d.afinidade && d.missao === missaoDe(ordem) ? d : null;
    return machucado ? d : null;
  }
  function encerrarDeadMan(ordem, motivo) {
    var d = dados(ordem).deadMan;
    if (!d || d.encerrado) return { ok: false };
    d.encerrado = { em: agora(), motivo: texto(motivo, 80) };
    return { ok: true };
  }
  function morrerComDeadMan(ordem) {
    var d = dados(ordem).deadMan;
    if (!d || d.encerrado) return { ok: false };
    if (!d.afinidade) { d.encerrado = { em: agora(), motivo: "morreu" }; return { ok: true, mantem: false }; }
    d.morreu = true;
    d.missao = missaoDe(ordem);
    return { ok: true, mantem: true };
  }

  /* Paralinguística Ampliada: o −1 PE de Compreensão Paranormal só vale
     quando a ficha JÁ CONHECIA o ritual por outra aquisição (a concessão
     do poder ficou vazia). Uma vez, nunca somado de novo. */
  var ID_COMPREENSAO = "op.ritual.compreensao-paranormal";
  function ehCompreensaoParanormal(ritual) {
    if (!ritual) return false;
    if (ritual.origemCatalogoId === ID_COMPREENSAO) return true;
    var n = String(ritual.nome || "").toLowerCase();
    if (n.normalize) n = n.normalize("NFD").replace(/[̀-ͯ]/g, "");
    return n === "compreensao paranormal";
  }
  function reducaoDaParalinguistica(ordem, ritual) {
    if (!ehCompreensaoParanormal(ritual) || !temPoder(ordem, "paralinguisticaAmpliada")) return 0;
    /* Vindo da concessão do próprio poder, é o ritual aprendido — sem
       desconto. Conhecido por outra via, −1 PE. */
    var est = E() ? E().estado(ordem, null) : null;
    var vindo = est && est.rituais && est.rituais.porRitual ? est.rituais.porRitual[ritual.id] : null;
    return vindo && vindo.poder === "paralinguisticaAmpliada" ? 0 : 1;
  }

  /* =================================================================
     ITENS (p. 60-61)
     ================================================================= */

  var IDS = {
    camera: "as5.geral.camera-filmadora",
    faixas: "as5.amaldicoado.faixas-da-videncia",
    joias: "as5.amaldicoado.joias-da-mente",
    larva: "as5.amaldicoado.larva-da-furia",
    skate: "as5.amaldicoado.skate-caotico",
    tenis: "as5.amaldicoado.tenis-lepidos",
  };

  function I() { return global.RAMAOrdemInventario || null; }
  function dadosDoItem(item) { return I() ? I().dadosDoItem(item) : ((item && item.ordem) || {}); }
  function itensDe(inventario) { return inventario && Array.isArray(inventario.itens) ? inventario.itens : []; }
  function doCatalogo(item, chave) { return !!(item && item.origemCatalogoId === IDS[chave]); }

  /* Os campos do AS5 num item do inventário. Cada um só existe quando
     vale. */
  function normalizarDadosDoItem(destino, b, tipo) {
    var x = obj(b);
    if (x.selo && typeof x.selo === "object") {
      var s = normalizarSelo(x.selo);
      if (s) destino.selo = s;
    }
    if (x.pecas && typeof x.pecas === "object") destino.pecas = { piercing: x.pecas.piercing === true, brinco: x.pecas.brinco === true };
    if (["transporte", "escudo", "arma"].indexOf(x.modoSkate) >= 0) destino.modoSkate = x.modoSkate;
    return destino;
  }

  function treinadoEmUma(ordem, chaves) {
    var R = global.RAMAOrdemRegras;
    if (!R || !R.grauDaPericia) return false;
    return chaves.some(function (k) { var g = R.grauDaPericia(ordem, k); return g && g !== "destreinado"; });
  }

  /* Os benefícios dos itens: só em uso. Mochila não é uso. */
  function efeitosDeItens(ordem, inventario) {
    var saida = [];
    itensDe(inventario).forEach(function (item) {
      var d = dadosDoItem(item);
      if (doCatalogo(item, "camera") && d.empunhada) {
        saida.push({ fonte: item.nome, detalhe: "Câmera Filmadora empunhada (AS5 p. 60)", efeito: { tipo: "bonusPericia", pericias: ["investigacao", "percepcao"], valor: 2 } });
      }
      if (doCatalogo(item, "faixas") && d.vestida) {
        saida.push({ fonte: item.nome, detalhe: "Faixas da Vidência vestidas (AS5 p. 60)", efeito: { tipo: "bonusPericia", pericias: ["intimidacao"], valor: 2 } });
      }
      if (doCatalogo(item, "joias") && d.vestida && d.pecas && d.pecas.piercing && d.pecas.brinco) {
        saida.push({ fonte: item.nome, detalhe: "Joias da Mente: as duas peças vestidas (AS5 p. 60)", efeito: { tipo: "bonusPericia", pericias: ["diplomacia"], valor: 2 } });
        saida.push({ fonte: item.nome, detalhe: "Joias da Mente: as duas peças vestidas (AS5 p. 60)", efeito: { tipo: "resistenciaMental", valor: 10 } });
      }
      if (doCatalogo(item, "tenis") && d.vestida) {
        saida.push({ fonte: item.nome, detalhe: "Tênis Lépidos vestidos (AS5 p. 61)", efeito: { tipo: "bonusPericia", pericias: ["atletismo"], valor: 12 } });
        saida.push({ fonte: item.nome, detalhe: "Tênis Lépidos vestidos (AS5 p. 61)", efeito: { tipo: "deslocamento", valor: 3 } });
      }
      if (doCatalogo(item, "skate") && d.modoSkate === "transporte" && treinadoEmUma(ordem, ["acrobacia", "atletismo", "pilotagem"])) {
        saida.push({ fonte: item.nome, detalhe: "Skate Caótico nos pés, treinado em Acrobacia, Atletismo ou Pilotagem (AS5 p. 61)", efeito: { tipo: "deslocamento", valor: 3 } });
      }
    });
    return saida;
  }

  /* Faixas da Vidência: Defesa e resistência dependem de ONDE está a
     origem do ataque — nunca um +5 geral. */
  function faixasVestidas(inventario) {
    return itensDe(inventario).filter(function (item) { return doCatalogo(item, "faixas") && dadosDoItem(item).vestida; })[0] || null;
  }

  /* =================================================================
     OS EFEITOS QUE ENTRAM NA CONTA (regras.js, montarModificadores)
     ================================================================= */

  function efeitos(ordem, inventario) {
    if (!ordem || !ordem.arquivo5) return efeitosDeItens(ordem, inventario);
    var saida = [];
    var pe = peDoUfologo(ordem);
    if (pe) saida.push({ fonte: "Minha Teoria Absurda", detalhe: (pe / 3) + " teoria(s) confirmada(s) × 3 PE (Ufólogo, AS5 p. 54)", efeito: { tipo: "peFixo", valor: pe } });

    recebidosValendo(ordem).forEach(function (r) {
      var q = RECEBIVEIS[r.tipo];
      var fonte = q.nome + " (" + r.de + ")";
      var det = "recebido de " + r.de + " — AS5 p. " + q.pagina;
      if (r.tipo === "aura") saida.push({ fonte: fonte, detalhe: det, efeito: { tipo: "bonusPericia", pericias: ["iniciativa"], valor: 5 } });
      if (r.tipo === "parede") saida.push({ fonte: fonte, detalhe: "cobertura leve · " + det, efeito: { tipo: "defesa", valor: 5 } });
      if (r.tipo === "gaiola") saida.push({ fonte: fonte, detalhe: "ocupante do veículo · " + det, efeito: { tipo: "defesa", valor: 5 } });
      if (r.tipo === "direcao") {
        saida.push({ fonte: fonte, detalhe: "dentro do veículo · " + det, efeito: { tipo: "defesa", valor: 2 } });
        saida.push({ fonte: fonte, detalhe: "dentro do veículo · " + det, efeito: { tipo: "resistenciaTestes", valor: 2 } });
      }
    });
    /* Direção Defensiva: quem dirige também recebe (p. 56). */
    if (dirigindo(ordem) && temPoder(ordem, "direcaoDefensiva")) {
      saida.push({ fonte: "Direção Defensiva", detalhe: "dirigindo (AS5 p. 56)", efeito: { tipo: "defesa", valor: 2 } });
      saida.push({ fonte: "Direção Defensiva", detalhe: "dirigindo (AS5 p. 56)", efeito: { tipo: "resistenciaTestes", valor: 2 } });
    }
    /* Transmissão de Poder: os efeitos do poder emprestado, só na cena. */
    var emp = poderEmprestado(ordem);
    if (emp) {
      var P = global.RAMAOrdemPoderes;
      var p = P && P.poder(emp.chave);
      if (p && p.automacao !== "informacao") {
        (p.efeitos || []).forEach(function (ef) {
          if (ef.opcao) return; /* depende de uma escolha da progressão: fica no texto */
          saida.push({ fonte: p.nome + " (emprestado)", detalhe: "Transmissão de Poder, de " + emp.de + ", até o fim da cena (AS5 p. 63)", efeito: Object.assign({}, ef) });
        });
      }
    }
    return saida.concat(efeitosDeItens(ordem, inventario));
  }

  /* =================================================================
     TRANSMISSÃO (p. 46 e 62-63)
     ================================================================= */

  function transmissaoDe(ordem) { return dados(ordem).transmissao; }
  function sino(ordem) {
    var t = ordem && ordem.arquivo5 && ordem.arquivo5.transmissao;
    return t ? t.sino : normalizarSino({});
  }
  function registrarSino(ordem, nota) {
    var t = transmissaoDe(ordem);
    t.sino = normalizarSino({ registrado: true, registradoEm: agora(), nota: nota });
    return { ok: true };
  }
  /* A confirmação é da mesa: o mestre, na campanha; sem campanha, quem
     joga registra a decisão da mesa. */
  function confirmarSino(ordem, por) {
    var t = transmissaoDe(ordem);
    if (!t.sino.registrado) return { ok: false, motivo: "Registre a conexão com o Sino antes." };
    t.sino.confirmado = true;
    t.sino.confirmadoPor = por === "mestre" ? "mestre" : "mesa";
    t.sino.confirmadoEm = agora();
    return { ok: true };
  }
  function desfazerSino(ordem) {
    transmissaoDe(ordem).sino = normalizarSino({});
    return { ok: true };
  }

  /* "Só funciona quando dois ou mais seres têm o mesmo poder": os
     OUTROS portadores (nunca a própria ficha). */
  function portadores(ordem, chave) {
    var t = ordem && ordem.arquivo5 && ordem.arquivo5.transmissao;
    return t && t.portadores[chave] ? t.portadores[chave] : [];
  }
  function definirPortadores(ordem, chave, lista0, proprioNome) {
    if (PODERES_DE_TRANSMISSAO.indexOf(chave) < 0) return { ok: false };
    var proprio = texto(proprioNome, 80).trim().toLowerCase();
    var l = nomes(lista0, 12).filter(function (n) { return !proprio || n.toLowerCase() !== proprio; });
    var t = transmissaoDe(ordem);
    if (l.length) t.portadores[chave] = l; else delete t.portadores[chave];
    return { ok: true, portadores: l };
  }
  function funciona(ordem, chave) { return temPoder(ordem, chave) && portadores(ordem, chave).length >= 1; }

  function marcarConexao(ordem, presentes) {
    transmissaoDe(ordem).conexao = { cena: cenaDe(ordem), presentes: nomes(presentes, 12) };
    return { ok: true };
  }
  /* +2 por portador no raio, exceto você. */
  function bonusDaConexao(ordem) {
    var c = ordem && ordem.arquivo5 && ordem.arquivo5.transmissao.conexao;
    if (!c || c.cena !== cenaDe(ordem) || !temPoder(ordem, "conexaoComunicativa")) return 0;
    return 2 * c.presentes.length;
  }

  /* Sincronia Conectiva (cada participante entra pela própria ficha). */
  function sincroniaValendo(ordem) {
    var s = ordem && ordem.arquivo5 && ordem.arquivo5.transmissao.sincronia;
    return s && s.cena === cenaDe(ordem) ? s : null;
  }
  function entrarNaSincronia(ordem, id, participantes) {
    if (!funciona(ordem, "sincroniaConectiva")) return { ok: false, motivo: "Sincronia Conectiva só funciona com outro ser que também tenha o poder." };
    if (sincroniaValendo(ordem)) return { ok: false, motivo: "A ficha já está sincronizada nesta cena." };
    var sid = idOk(id) || novoId("sin");
    transmissaoDe(ordem).sincronia = normalizarSincronia({ id: sid, cena: cenaDe(ordem), entrouEm: agora(), participantes: participantes });
    return { ok: true, sincronia: transmissaoDe(ordem).sincronia };
  }
  function sairDaSincronia(ordem) { transmissaoDe(ordem).sincronia = null; return { ok: true }; }
  /* A iniciativa: a própria ou a de outro sincronizado — só uma vez por
     teste de Iniciativa, e trocar não dá turno a mais (a tela avisa). */
  function escolherIniciativa(ordem, propria, usada, de) {
    var s = sincroniaValendo(ordem);
    if (!s) return { ok: false, motivo: "Sem sincronia nesta cena." };
    s.iniciativa = { propria: inteiro(propria, -99, 999, 0), usada: inteiro(usada, -99, 999, 0), de: texto(de, 80), rodadaUsada: rodada(ordem) };
    return { ok: true };
  }
  function operacaoRegistrada(ordem, opId) {
    var s = ordem && ordem.arquivo5 && ordem.arquivo5.transmissao.sincronia;
    return !!(s && s.operacoes.some(function (o) { return o.opId === opId; }));
  }
  function registrarOperacao(ordem, op) {
    var s = sincroniaValendo(ordem);
    if (!s) return { ok: false };
    if (operacaoRegistrada(ordem, op.opId)) return { ok: true, repetida: true };
    s.operacoes.push(normalizarSincronia({ id: "x", operacoes: [Object.assign({ em: agora() }, op)] }).operacoes[0]);
    s.operacoes = s.operacoes.slice(-30);
    return { ok: true };
  }

  /* Empréstimos de uma cena: perícia, poder e ritual — um uso de cada
     por cena, só com outro portador do mesmo poder. */
  function usarEmprestimo(ordem, tipo, dadosDoEmprestimo) {
    var chave = { pericia: "transmissaoDePericia", poder: "transmissaoDePoder", ritual: "transmissaoDeRitual" }[tipo];
    if (!chave) return { ok: false, motivo: "Empréstimo desconhecido." };
    if (!funciona(ordem, chave)) return { ok: false, motivo: "O poder só funciona com outro ser que também o tenha." };
    var t = transmissaoDe(ordem);
    var cena = cenaDe(ordem);
    if (t.usos[tipo] === cena) return { ok: false, motivo: "Este poder já foi usado nesta cena (uma vez por cena)." };
    if (tipo === "poder" && dadosDoEmprestimo && temPoder(ordem, dadosDoEmprestimo.chave)) return { ok: false, motivo: "Você já tem este poder." };
    var n = normalizarEmprestimo(Object.assign({}, dadosDoEmprestimo || {}, { cena: cena, em: agora() }), tipo);
    if (!n) return { ok: false, motivo: tipo === "poder" ? "Escolha um poder válido (poderes de Transmissão não podem ser emprestados)." : "Dados incompletos." };
    t[tipo] = n;
    t.usos[tipo] = cena;
    return { ok: true, emprestimo: n };
  }
  function emprestimo(ordem, tipo) {
    var t = ordem && ordem.arquivo5 && ordem.arquivo5.transmissao;
    var e = t ? t[tipo] : null;
    return e && e.cena === cenaDe(ordem) ? e : null;
  }
  function periciaEmprestada(ordem, pericia) {
    var e = emprestimo(ordem, "pericia");
    return e && e.pericia === pericia ? e : null;
  }
  function poderEmprestado(ordem) { return emprestimo(ordem, "poder"); }
  function ritualEmprestado(ordem) { return emprestimo(ordem, "ritual"); }

  /* =================================================================
     SELOS (OPRPG p. 33 e 151; Criptologista do Oculto, p. 58)
     -----------------------------------------------------------------
     Três números que NÃO se misturam:
       máximo ao mesmo tempo   a Presença (o dobro com Criar Selo
                               recebido de novo)
       por ação de interlúdio  1; 2 com Método Intuitivo, +1 por outra
                               habilidade da trilha adquirida
       custo de cada selo      o custo em PE do ritual
     O selo guarda o ritual, a versão e a AUTORIA: Caligrafia Eficiente e
     Selo Supremo vêm de quem fez — não de quem usa.
     ================================================================= */

  var VERSOES = ["normal", "discente", "verdadeiro"];

  function normalizarSelo(s) {
    var x = obj(s);
    var nome = texto(x.ritual, 120).trim();
    if (!nome) return null;
    var autor = obj(x.autor);
    var au = obj(x.autoria);
    return {
      ritual: nome,
      ritualId: /^[a-z0-9]+\.ritual\.[a-z0-9-]+$/.test(String(x.ritualId || "")) ? x.ritualId : "",
      circulo: inteiro(x.circulo, 1, 4, 1),
      elemento: texto(x.elemento, 20),
      custo: inteiro(x.custo, 0, 99, 0),
      versao: VERSOES.indexOf(x.versao) >= 0 ? x.versao : "normal",
      autor: { nome: texto(autor.nome, 80), personagemId: /^[A-Za-z0-9-]{8,60}$/.test(String(autor.personagemId || "")) ? String(autor.personagemId) : "" },
      autoria: { caligrafia: au.caligrafia === true, supremo: au.supremo === true },
      fabricacao: idOk(x.fabricacao),
      criadoEm: carimbo(x.criadoEm),
    };
  }

  function temCriarSelo(ordem) { return temPoder(ordem, "criarSelo") || temPoder(ordem, "metodoIntuitivo"); }
  function seloDobrado(ordem) { return temPoder(ordem, "criarSelo") && temPoder(ordem, "metodoIntuitivo"); }
  function selosPorAcao(ordem) {
    if (!temPoder(ordem, "metodoIntuitivo")) return 1;
    var outras = ["caligrafiaEficiente", "decifrarADistancia", "seloSupremo"].filter(function (k) { return temPoder(ordem, k); }).length;
    return 2 + outras;
  }
  function maximoDeSelos(ordem, presenca) {
    return Math.max(0, inteiro(presenca, 0, 99, 0)) * (seloDobrado(ordem) ? 2 : 1);
  }
  /* Os selos FEITOS por esta ficha que estão no inventário dela. */
  function selosProprios(ordem, inventario, autorId) {
    var n = 0;
    itensDe(inventario).forEach(function (item) {
      var s = dadosDoItem(item).selo;
      if (s && s.fabricacao && (!autorId || !s.autor.personagemId || s.autor.personagemId === autorId)) n += Math.max(1, dadosDoItem(item).quantidade || 1);
    });
    return n;
  }
  function autoriaDe(ordem) {
    return { caligrafia: temPoder(ordem, "caligrafiaEficiente"), supremo: temPoder(ordem, "seloSupremo") };
  }
  /* A fabricação de uma ação de interlúdio: quantos, a que custo. */
  function planoDeFabricacao(ordem, inventario, presenca, rituais, autorId) {
    if (!temCriarSelo(ordem)) return { ok: false, motivo: "A ficha não tem Criar Selo." };
    if (!emInterludio(ordem)) return { ok: false, motivo: "Criar selos é uma ação de interlúdio." };
    var porAcao = selosPorAcao(ordem);
    var maximo = maximoDeSelos(ordem, presenca);
    var atuais = selosProprios(ordem, inventario, autorId);
    var l = lista(rituais).filter(function (r) { return r && r.ritual; });
    if (!l.length) return { ok: false, motivo: "Escolha o ritual de cada selo." };
    if (l.length > porAcao) return { ok: false, motivo: "Com uma ação de interlúdio você cria " + porAcao + " selo(s)." };
    if (atuais + l.length > maximo) return { ok: false, motivo: "O máximo de selos ao mesmo tempo é " + maximo + " (você tem " + atuais + ")." };
    var custo = l.reduce(function (s, r) { return s + Math.max(0, inteiro(r.custo, 0, 99, 0)); }, 0);
    return { ok: true, porAcao: porAcao, maximo: maximo, atuais: atuais, quantidade: l.length, custo: custo };
  }
  function registrarFabricacao(ordem, id, plano) {
    var a = dados(ordem);
    var fid = idOk(id) || novoId("fab");
    if (a.selos.fabricacoes.some(function (f) { return f.id === fid; })) return { ok: true, repetida: true, id: fid };
    a.selos.fabricacoes.push({ id: fid, interludio: interludioDe(ordem), quantidade: plano.quantidade, custo: plano.custo, em: agora() });
    a.selos.fabricacoes = a.selos.fabricacoes.slice(-MAX);
    return { ok: true, id: fid };
  }
  /* O plano de USO de um selo por esta ficha: o teste de uso (que não é
     o do Custo do Paranormal), a DT e os dados extras do ritual, e o
     custo adicional da forma avançada. Os benefícios de autoria vêm do
     selo e entram UMA vez, tenha o usuário a trilha ou não. */
  function planoDeUso(ordem, selo, conheceRitual) {
    var s = normalizarSelo(selo);
    if (!s) return { ok: false, motivo: "Selo sem ritual." };
    var decifrar = temPoder(ordem, "decifrarADistancia");
    var teste = null;
    if (s.autoria.supremo) teste = null;
    else if (!conheceRitual) {
      teste = s.autoria.caligrafia
        ? { pericia: "ocultismo", dt: 10 + s.custo, motivo: "Caligrafia Eficiente do autor: DT 10 + custo (AS5 p. 58)" }
        : { pericia: "ocultismo", dt: 20 + s.custo, motivo: "Não conhece o ritual: DT 20 + custo (OPRPG p. 151)" };
    }
    return {
      ok: true, selo: s, teste: teste,
      dispensaTeste: s.autoria.supremo ? "Selo Supremo do autor: dispensa o teste de uso (AS5 p. 58)" : (conheceRitual ? "Conhece o ritual: sem teste de uso" : ""),
      dtMais: s.autoria.supremo ? 5 : 0,
      dadosDeDanoMais: s.autoria.supremo ? 3 : 0,
      semCustoAvancado: s.autoria.supremo,
      podeAvancado: conheceRitual || s.autoria.supremo,
      empunhar: !decifrar,
      vozAlta: !decifrar,
      decifrar: decifrar,
      custoDoParanormal: "O Custo do Paranormal e Invocando o Medo continuam valendo (OPRPG p. 121) — Selo Supremo não os dispensa.",
    };
  }
  function usoRegistrado(ordem, opId) {
    return !!(ordem && ordem.arquivo5 && ordem.arquivo5.selos.usos.some(function (u) { return u.opId === opId; }));
  }
  function registrarUsoDeSelo(ordem, opId, itemId, ritual) {
    var a = dados(ordem);
    var op = idOk(opId);
    if (!op) return { ok: false, motivo: "Uso sem identificação." };
    if (usoRegistrado(ordem, op)) return { ok: true, repetido: true };
    a.selos.usos.push({ opId: op, itemId: idOk(itemId), ritual: texto(ritual, 120), em: agora() });
    a.selos.usos = a.selos.usos.slice(-MAX);
    return { ok: true, repetido: false };
  }

  /* =================================================================
     VEÍCULOS — Óxido Nitroso (p. 59): ação livre, uma vez por cena,
     dobra o deslocamento por 1 rodada (a rodada da ficha).
     ================================================================= */

  function nitroDoVeiculo(ordem, veiculoId) {
    var l = ordem && ordem.arquivo5 ? ordem.arquivo5.nitro : [];
    return l.filter(function (n) { return n.veiculoId === veiculoId; })[0] || null;
  }
  function usarNitro(ordem, veiculoId) {
    var a = dados(ordem);
    var cena = cenaDe(ordem);
    var n = nitroDoVeiculo(ordem, veiculoId);
    if (n && n.cena === cena) return { ok: false, motivo: "O óxido nitroso já foi usado nesta cena." };
    a.nitro = a.nitro.filter(function (x) { return x.veiculoId !== veiculoId; }).concat([{ veiculoId: veiculoId, cena: cena, rodada: rodada(ordem) }]).slice(-8);
    return { ok: true };
  }
  function nitroAtivo(ordem, veiculoId) {
    var n = nitroDoVeiculo(ordem, veiculoId);
    return !!(n && n.cena === cenaDe(ordem) && n.rodada === rodada(ordem));
  }

  /* =================================================================
     LARVA DA FÚRIA (p. 61)
     ================================================================= */

  function registrarLarva(ordem, efeitoId) {
    dados(ordem).larva = { efeitoId: efeitoId, cena: cenaDe(ordem), hostilNaRodada: rodada(ordem) };
    return { ok: true };
  }
  /* "Ao fim da rodada": atacou ou foi alvo nesta rodada mantém; senão a
     fúria termina. Devolve o id do efeito a encerrar, se terminou. */
  function fimDaRodadaDaLarva(ordem, houveHostilidade) {
    var l = dados(ordem).larva;
    if (!l) return { ok: false };
    if (houveHostilidade) { l.hostilNaRodada = rodada(ordem); return { ok: true, termina: false }; }
    dados(ordem).larva = null;
    return { ok: true, termina: true, efeitoId: l.efeitoId };
  }

  /* =================================================================
     FIM DE CENA E INTERLÚDIO
     ================================================================= */

  /* Chamado quando a ficha troca de cena (antes de a cena nova valer):
     o ácido da cena que acabou deixa a arma esperando a destruição. */
  function aoTrocarDeCena(ordem, cenaQueAcabou) {
    var saida = { destruir: null };
    /* A primeira cena de uma ficha não tem id: é a "inicial". */
    cenaQueAcabou = cenaQueAcabou || "inicial";
    if (!ordem || !ordem.arquivo5) return saida;
    saida.destruir = aoFimDaCenaDoAcido(ordem, cenaQueAcabou);
    var a = ordem.arquivo5;
    if (a.larva && a.larva.cena === cenaQueAcabou) a.larva = null;
    if (a.telas && a.telas.cena === cenaQueAcabou) a.telas = null;
    return saida;
  }

  global.RAMAOrdemArquivo5 = {
    IDS: IDS,
    RECEBIVEIS: RECEBIVEIS,
    CONDICOES_DE_MEDITACAO: CONDICOES_DE_MEDITACAO,
    PODERES_DE_TRANSMISSAO: PODERES_DE_TRANSMISSAO,
    GRAUS: GRAUS,
    VERSOES: VERSOES,

    normalizar: normalizar,
    vazio: vazio,
    dados: dados,
    normalizarDadosDoItem: normalizarDadosDoItem,
    normalizarSelo: normalizarSelo,

    temPoder: temPoder,
    comAfinidade: comAfinidade,
    cenaDe: cenaDe,
    emInterludio: emInterludio,
    interludioDe: interludioDe,
    missaoDe: missaoDe,
    rodada: rodada,
    proximaRodada: proximaRodada,

    teoriaDaMissao: teoriaDaMissao,
    registrarTeoria: registrarTeoria,
    resolverTeoria: resolverTeoria,
    peDoUfologo: peDoUfologo,
    turnoUsadoNaMissao: turnoUsadoNaMissao,
    usarTurnoInvertido: usarTurnoInvertido,

    folegoNaCena: folegoNaCena,
    registrarFolego: registrarFolego,
    planoDeMeditacao: planoDeMeditacao,
    meditouNoInterludio: meditouNoInterludio,
    registrarMeditacao: registrarMeditacao,
    registrarRuido: registrarRuido,
    efeitoInvertivel: efeitoInvertivel,
    inversaoValendo: inversaoValendo,
    inverterEfeito: inverterEfeito,
    desfazerInversao: desfazerInversao,
    desafioNaRodada: desafioNaRodada,
    registrarDesafio: registrarDesafio,
    resolverDesafio: resolverDesafio,
    armarTelas: armarTelas,
    telasArmado: telasArmado,

    adicionarRecebido: adicionarRecebido,
    removerRecebido: removerRecebido,
    recebidosValendo: recebidosValendo,
    grauRecebido: grauRecebido,
    marcarAliados: marcarAliados,
    aliadosNaCena: aliadosNaCena,
    dirigir: dirigir,
    dirigindo: dirigindo,

    ativarAcido: ativarAcido,
    acidoValendo: acidoValendo,
    acidoNaArma: acidoNaArma,
    encerrarAcido: encerrarAcido,
    resolverDestruicao: resolverDestruicao,
    ativarDeadMan: ativarDeadMan,
    deadManValendo: deadManValendo,
    encerrarDeadMan: encerrarDeadMan,
    morrerComDeadMan: morrerComDeadMan,
    ehCompreensaoParanormal: ehCompreensaoParanormal,
    reducaoDaParalinguistica: reducaoDaParalinguistica,

    efeitos: efeitos,
    efeitosDeItens: efeitosDeItens,
    faixasVestidas: faixasVestidas,

    sino: sino,
    registrarSino: registrarSino,
    confirmarSino: confirmarSino,
    desfazerSino: desfazerSino,
    portadores: portadores,
    definirPortadores: definirPortadores,
    funciona: funciona,
    marcarConexao: marcarConexao,
    bonusDaConexao: bonusDaConexao,
    sincroniaValendo: sincroniaValendo,
    entrarNaSincronia: entrarNaSincronia,
    sairDaSincronia: sairDaSincronia,
    escolherIniciativa: escolherIniciativa,
    operacaoRegistrada: operacaoRegistrada,
    registrarOperacao: registrarOperacao,
    usarEmprestimo: usarEmprestimo,
    periciaEmprestada: periciaEmprestada,
    poderEmprestado: poderEmprestado,
    ritualEmprestado: ritualEmprestado,

    temCriarSelo: temCriarSelo,
    seloDobrado: seloDobrado,
    selosPorAcao: selosPorAcao,
    maximoDeSelos: maximoDeSelos,
    selosProprios: selosProprios,
    autoriaDe: autoriaDe,
    planoDeFabricacao: planoDeFabricacao,
    registrarFabricacao: registrarFabricacao,
    planoDeUso: planoDeUso,
    usoRegistrado: usoRegistrado,
    registrarUsoDeSelo: registrarUsoDeSelo,

    usarNitro: usarNitro,
    nitroAtivo: nitroAtivo,
    registrarLarva: registrarLarva,
    fimDaRodadaDaLarva: fimDaRodadaDaLarva,
    aoTrocarDeCena: aoTrocarDeCena,
  };
})(typeof window !== "undefined" ? window : globalThis);
