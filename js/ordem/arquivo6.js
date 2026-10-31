/* =====================================================================
   R.A.M.A. — Ordem Paranormal · estados do Arquivos Secretos 6
   =====================================================================
   O que o Arquivos Secretos 6 (v1.0) guarda numa ficha, e a regra de
   cada coisa — sem tela e sem rede. A ficha desenha (js/ordem/telas/
   ficha-arquivo6.js); as contas (js/ordem/regras.js) perguntam daqui.

     forcas         Forças para Enfrentar (Cobaia Sobrevivente): cada
                    ocorrência do trauma (a mesa indica), o abalado posto
                    em Condições e a imunidade a medo comprada na cena
     resgates       Resgatar da Morte: o ser socorrido em cada cena (uma
                    vez por ser por cena)
     salvacao       Médico da Salvação: Paramédico como movimento, uma
                    vez por rodada
     escudo         Escudo Espiral Temporal: os usos de cada rodada
     grilhoes       Grilhões de Lodo: a área da cena (e cada resolução)
     salto          Salto de Dados: a marca (com o retrato do estado), as
                    marcas já consumidas e as operações feitas
     fabricacoes    Farmacêutico de Campo: cada item criado (id da
                    operação: recarregar não cria outro)
     usos           usos de medicamento e de habilidades com custo, pelo
                    id da operação (o mesmo clique não gasta duas vezes)
     afeccoes       doenças e venenos (p. 75–76): estágio, efeitos postos
                    em Condições por ESTA afecção, histórico e o bônus de
                    tratamento guardado para o próximo teste
     recebidos      o que outra ficha deu a esta (Grão-Mestre em
                    Elemento), com o nome de quem deu
     hesitacao      Hesitação Forçada sobre esta ficha: sucessos
                    seguidos e o turno em que o teste falhou
     rebotes        Aplicador de Adrenalina: o fatigado que vem quando o
                    efeito acaba
     modular        Evolução Modular: a reclassificação que a mesa fez
                    de um poder ambíguo ({ chave: grupo })

   Tempo é sempre o do JOGO: cena e rodada da ficha (Condições e
   Arquivos Secretos 5) e dia da cronologia (Arquivos Secretos 3) —
   nunca o relógio do computador. NADA AQUI ROLA DADO SOZINHO, nem mexe
   em outra ficha: a tela rola por clique, e o que vai para outra ficha
   é registrado por quem a controla.
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
  function copia(x) { return x === undefined ? undefined : JSON.parse(JSON.stringify(x)); }
  function porId(l, campo) {
    var vistos = {};
    return l.filter(function (x) {
      var k = x && x[campo || "id"];
      if (!k || vistos[k]) return false;
      vistos[k] = true;
      return true;
    });
  }

  function C() { return global.RAMAOrdemCatalogo || null; }
  function E() { return global.RAMAOrdemProgressao || null; }
  function EF() { return global.RAMAOrdemEfeitos || null; }
  function CD() { return global.RAMAOrdemCondicoes || null; }
  function A3() { return global.RAMAOrdemArquivo3 || null; }
  function A5() { return global.RAMAOrdemArquivo5 || null; }
  function I() { return global.RAMAOrdemInventario || null; }

  /* Os poderes da ficha (progressão): só as aquisições válidas. */
  function aquisicoes(ordem, chave) {
    var est = E() && ordem ? E().estado(ordem, null) : null;
    return est ? est.adquiridos.filter(function (a) { return a.chave === chave && a.valido !== false && a.completo !== false; }) : [];
  }
  function temPoder(ordem, chave) { return aquisicoes(ordem, chave).length > 0; }
  function comAfinidade(ordem, chave) { return aquisicoes(ordem, chave).some(function (a) { return a.afinidade; }); }
  function elementosDoPoder(ordem, chave) {
    var vistos = {};
    return aquisicoes(ordem, chave).map(function (a) { return a.opcoes && a.opcoes.elemento; }).filter(function (e) {
      if (!e || vistos[e]) return false;
      vistos[e] = true;
      return true;
    });
  }

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
  /* A rodada é a da ficha, a mesma do Arquivos Secretos 5. */
  function rodadaDe(ordem) {
    return A5() && ordem ? A5().rodada(ordem) : 1;
  }
  function chaveDaRodada(ordem) { return cenaDe(ordem) + "#" + rodadaDe(ordem); }
  /* O dia da cronologia da campanha (Arquivos Secretos 3); 0 sem ela. */
  function diaDe(ordem) {
    var cr = A3() && ordem ? A3().dados(ordem).cronologia : null;
    return cr ? (Number(cr.dia) || 0) : 0;
  }

  /* =================================================================
     DOENÇAS E VENENOS (p. 75–76)
     -----------------------------------------------------------------
     Cada estágio diz o que entra em Condições: `condicoes` (as do
     livro, pelo modelo), `modificadores` (o −2/−5 em testes), `textos`
     (o que a ficha não mede — trêmulo, perder a comunicação) e `fatal`
     (a regra diz que o personagem morre: a ficha AVISA, a mesa confirma).
     Estágio 4 é "IV ou superior". Nada avança sozinho: cada mudança é
     um clique, com histórico.
     ================================================================= */

  function menos(n) { return [{ alvo: "testes", tipo: "bonus", valor: -n }]; }
  var TREMULO = "Trêmulo (Arquivos Secretos 3, p. 124): o efeito é o da condição no AS3, aplicado pela mesa.";

  var DOENCAS = [
    { chave: "criseAlergica", nome: "Crise Alérgica", pagina: 75, resistencia: "fortitude", dt: 20,
      causa: "reação exagerada do sistema imunológico a substâncias externas",
      estagios: [
        { texto: "Sintomas leves: −2 em testes.", modificadores: menos(2) },
        { texto: "Sintomas intensos: −5 em testes.", modificadores: menos(5) },
        { texto: "Sintomas intensos: −5 em testes, e enjoado.", modificadores: menos(5), condicoes: ["enjoado"] },
        { texto: "Sintomas intensos: −5 em testes, enjoado e asfixiado.", modificadores: menos(5), condicoes: ["enjoado", "asfixiado"] },
      ] },
    { chave: "criseHipertensiva", nome: "Crise Hipertensiva", pagina: 75, resistencia: "vontade", dt: 20,
      causa: "ataques de pânico, sustos extremos ou ansiedade grave",
      estagios: [
        { texto: "Trêmulo.", textos: [TREMULO] },
        { texto: "Trêmulo e abalado.", condicoes: ["abalado"], textos: [TREMULO] },
        { texto: "Trêmulo, abalado e enjoado.", condicoes: ["abalado", "enjoado"], textos: [TREMULO] },
        { texto: "Infarto agudo: o personagem morre.", fatal: true },
      ] },
    { chave: "criseHipocondriaca", nome: "Crise Hipocondríaca", pagina: 75, resistencia: "", dt: 0,
      causa: "pavor paralisante de ter contraído uma doença perigosa",
      estagios: [
        { texto: "Abalado.", condicoes: ["abalado"] },
        { texto: "Abalado e confuso.", condicoes: ["abalado", "confuso"] },
        { texto: "Usa todos os medicamentos do grupo, sem receber nenhum efeito positivo deles, e perde 2d12 PV. Abalado e confuso.",
          condicoes: ["abalado", "confuso"], medicamentos: true, perdaPv: "2d12" },
        { texto: "A consequência final das misturas de medicações: morre intoxicado.", fatal: true },
      ] },
    { chave: "infeccaoCerebral", nome: "Infecção Cerebral", pagina: 75, resistencia: "fortitude", dt: 20,
      causa: "microrganismos que infectam as membranas do cérebro",
      estagios: [
        { texto: "Frustrado.", condicoes: ["frustrado"] },
        { texto: "Esmorecido.", condicoes: ["esmorecido"] },
        { texto: "Esmorecido; Intelecto reduzido a 0; perde qualquer capacidade de comunicação e raciocínio.", condicoes: ["esmorecido"], intelectoZero: true,
          textos: ["Perde qualquer capacidade de comunicação e raciocínio."] },
        { texto: "Morte cerebral.", fatal: true },
      ] },
    { chave: "infeccaoGeneralizada", nome: "Infecção Generalizada", pagina: 75, resistencia: "fortitude", dt: 20,
      causa: "microrganismos que infectam diversos órgãos do corpo",
      estagios: [
        { texto: "Fatigado.", condicoes: ["fatigado"] },
        { texto: "Exausto.", condicoes: ["exausto"] },
        { texto: "Exausto e inconsciente.", condicoes: ["exausto", "inconsciente"] },
        { texto: "Falência dos órgãos infectados: morre.", fatal: true },
      ] },
  ];

  /* Os venenos (por Miguel Souza e Trakoll). `falha` é o efeito; `resistiu`,
     o que o livro põe entre parênteses — o que acontece a quem passa no
     teste. Fortitude DT 25 em todos. */
  var VENENOS = [
    { chave: "batracotoxina", nome: "Batracotoxina", pagina: 76, via: "contato", dt: 25,
      falha: { texto: "Exausta, paralisada e asfixiada.", condicoes: ["exausto", "paralisado", "asfixiado"] },
      resistiu: { texto: "Exausta.", condicoes: ["exausto"] } },
    { chave: "cianetoDePotassio", nome: "Cianeto de Potássio", pagina: 76, via: "ingestão", dt: 25,
      falha: { texto: "Inconsciente e asfixiada.", condicoes: ["inconsciente", "asfixiado"] },
      resistiu: { texto: "Asfixiada.", condicoes: ["asfixiado"] } },
    { chave: "gasNeurotoxico", nome: "Gás Neurotóxico", pagina: 76, via: "inalação", dt: 25,
      falha: { texto: "Paralisada.", condicoes: ["paralisado"] },
      resistiu: { texto: "Imóvel.", condicoes: ["imovel"] } },
    { chave: "ricina", nome: "Ricina", pagina: 76, via: "inalação", dt: 25,
      falha: { texto: "Perde 4d6 PV por rodada até ser curada do veneno.", perdaPorRodada: "4d6" },
      resistiu: { texto: "Perde 2d6 PV por rodada, por 1d4+1 rodadas.", perdaPorRodada: "2d6", rodadas: "1d4+1" } },
    { chave: "toxinaCardiotoxica", nome: "Toxina Cardiotóxica", pagina: 76, via: "ferimento", dt: 25,
      falha: { texto: "Fica com 0 PV e morrendo.", zeraPv: true },
      resistiu: { texto: "Perde metade dos PV.", metadeDosPv: true } },
  ];

  var POR_DOENCA = {};
  DOENCAS.forEach(function (d) { POR_DOENCA[d.chave] = d; });
  var POR_VENENO = {};
  VENENOS.forEach(function (v) { POR_VENENO[v.chave] = v; });

  function modeloDa(af) {
    return af.tipo === "veneno" ? POR_VENENO[af.chave] : POR_DOENCA[af.chave];
  }
  /* O que vale agora: o estágio da doença, ou o lado do veneno. */
  function efeitoAtual(af) {
    var m = modeloDa(af);
    if (!m) return null;
    if (af.tipo === "veneno") return af.resistiu ? m.resistiu : m.falha;
    return af.estagio >= 1 ? m.estagios[Math.min(4, af.estagio) - 1] : null;
  }

  function normalizarAfeccao(b) {
    var x = obj(b);
    var id = idOk(x.id);
    var tipo = x.tipo === "veneno" ? "veneno" : "doenca";
    var chave = String(x.chave || "");
    if (!id || !(tipo === "veneno" ? POR_VENENO[chave] : POR_DOENCA[chave])) return null;
    return {
      id: id, tipo: tipo, chave: chave,
      estagio: tipo === "doenca" ? inteiro(x.estagio, 0, 4, 1) : 0,
      resistiu: tipo === "veneno" && x.resistiu === true,
      rodadas: inteiro(x.rodadas, 0, 99, 0),
      rodadasFeitas: inteiro(x.rodadasFeitas, 0, 99, 0),
      origem: texto(x.origem, 120).trim(),
      efeitos: lista(x.efeitos).map(idOk).filter(Boolean).slice(0, 12),
      tratamento: inteiro(x.tratamento, 0, 10, 0),
      encerrada: x.encerrada === true,
      em: carimbo(x.em),
      historico: porId(lista(x.historico).map(function (h) {
        var y = obj(h);
        var hid = idOk(y.id);
        if (!hid) return null;
        return { id: hid, acao: texto(y.acao, 160), por: texto(y.por, 80), em: carimbo(y.em) };
      }).filter(Boolean)).slice(-MAX),
    };
  }

  /* =================================================================
     ESTADO
     ================================================================= */

  var ELEMENTOS = ["sangue", "morte", "conhecimento", "energia"];
  var GRUPOS = ["combate", "utilidade"];

  function normalizarRetrato(r) {
    var x = obj(r);
    if (!Object.keys(x).length) return null;
    var rec = obj(x.recursos);
    var num = function (v) { return v === null || v === undefined || v === "" ? null : inteiro(v, -999, 9999, null); };
    return {
      recursos: { pv: num(rec.pv), pe: num(rec.pe), san: num(rec.san), pd: num(rec.pd) },
      temporarios: copia(obj(x.temporarios)),
      temporariosDeCena: copia(lista(x.temporariosDeCena)).slice(0, 12),
      efeitos: copia(lista(x.efeitos)).slice(0, 80),
      imunidades: lista(x.imunidades).map(function (k) { return texto(k, 40); }).slice(0, 40),
      rastreadores: (function () {
        var rr = obj(x.rastreadores);
        var saida = {};
        ["morrendo", "inconsciente", "enlouquecendo", "perturbado"].forEach(function (k) {
          var y = obj(rr[k]);
          saida[k] = { ativa: y.ativa === true, desde: carimbo(y.desde) };
        });
        return saida;
      })(),
    };
  }

  function normalizar(ordem, bruto) {
    var b = obj(bruto && bruto.arquivo6 !== undefined ? bruto.arquivo6 : (ordem && ordem.arquivo6));
    var fz = obj(b.forcas);
    var sl = obj(b.salto);
    var md = obj(b.modular);
    var consumidas = porId(lista(sl.consumidas).map(function (c) { var y = obj(c); var id = idOk(y.id); return id ? { id: id, em: carimbo(y.em) } : null; }).filter(Boolean)).slice(-MAX);
    var jaConsumida = {};
    consumidas.forEach(function (c) { jaConsumida[c.id] = true; });
    var mc = obj(sl.marca);
    var marca = null;
    if (idOk(mc.id) && !jaConsumida[mc.id]) {
      var retrato = normalizarRetrato(mc.retrato);
      if (retrato) {
        marca = {
          id: idOk(mc.id), em: carimbo(mc.em), cena: idOk(mc.cena), dia: inteiro(mc.dia, 0, 99999, 0),
          afinidade: mc.afinidade === true, retrato: retrato,
        };
      }
    }
    var grupos = {};
    Object.keys(obj(md.grupos)).forEach(function (k) {
      if (/^[A-Za-z0-9]{1,60}$/.test(k) && GRUPOS.indexOf(md.grupos[k]) >= 0) grupos[k] = md.grupos[k];
    });

    ordem.arquivo6 = {
      forcas: {
        ocorrencias: porId(lista(fz.ocorrencias).map(function (o) {
          var y = obj(o);
          var id = idOk(y.id);
          if (!id) return null;
          return { id: id, cena: idOk(y.cena), em: carimbo(y.em), por: texto(y.por, 80), efeitoId: idOk(y.efeitoId), imune: y.imune === true,
            imunidadeAdicionada: y.imunidadeAdicionada === true };
        }).filter(Boolean)).slice(-MAX),
      },
      resgates: porId(lista(b.resgates).map(function (r) {
        var y = obj(r);
        var id = idOk(y.id);
        var alvo = texto(y.alvo, 80).trim();
        return id && alvo ? { id: id, cena: idOk(y.cena), alvo: alvo, em: carimbo(y.em) } : null;
      }).filter(Boolean)).slice(-MAX),
      salvacao: porId(lista(b.salvacao).map(function (r) {
        var y = obj(r);
        var id = idOk(y.id);
        return id ? { id: id, rodada: texto(y.rodada, 100), em: carimbo(y.em) } : null;
      }).filter(Boolean)).slice(-MAX),
      escudo: porId(lista(b.escudo).map(function (r) {
        var y = obj(r);
        var id = idOk(y.id);
        if (!id) return null;
        return { id: id, rodada: texto(y.rodada, 100), tipo: y.tipo === "municao" ? "municao" : "arma", rd: inteiro(y.rd, 0, 99, 0), em: carimbo(y.em) };
      }).filter(Boolean)).slice(-MAX),
      grilhoes: porId(lista(b.grilhoes).map(function (r) {
        var y = obj(r);
        var id = idOk(y.id);
        if (!id) return null;
        return { id: id, cena: idOk(y.cena), afinidade: y.afinidade === true, dt: inteiro(y.dt, 0, 99, 0), resolucoes: inteiro(y.resolucoes, 0, 99, 0), em: carimbo(y.em) };
      }).filter(Boolean)).slice(-MAX),
      salto: {
        marca: marca,
        consumidas: consumidas,
        operacoes: porId(lista(sl.operacoes).map(function (o) { var y = obj(o); var op = idOk(y.opId); return op ? { opId: op, tipo: y.tipo === "marcar" ? "marcar" : "voltar", em: carimbo(y.em) } : null; }).filter(Boolean), "opId").slice(-MAX),
      },
      fabricacoes: porId(lista(b.fabricacoes).map(function (r) {
        var y = obj(r);
        var id = idOk(y.id);
        if (!id) return null;
        return { id: id, itemId: idOk(y.itemId), catalogoId: texto(y.catalogoId, 80), nome: texto(y.nome, 80), kitId: idOk(y.kitId), custo: inteiro(y.custo, 0, 99, 0), interludio: inteiro(y.interludio, 0, 99999, 0), em: carimbo(y.em) };
      }).filter(Boolean)).slice(-MAX),
      usos: porId(lista(b.usos).map(function (r) {
        var y = obj(r);
        var op = idOk(y.opId);
        return op ? { opId: op, tipo: texto(y.tipo, 40), em: carimbo(y.em) } : null;
      }).filter(Boolean), "opId").slice(-MAX),
      afeccoes: porId(lista(b.afeccoes).map(normalizarAfeccao).filter(Boolean)).slice(-MAX),
      recebidos: porId(lista(b.recebidos).map(function (r) {
        var y = obj(r);
        var id = idOk(y.id);
        if (!id || ELEMENTOS.indexOf(y.elemento) < 0) return null;
        return { id: id, tipo: "graoMestre", elemento: y.elemento, papel: y.papel === "inimigo" ? "inimigo" : "aliado",
          de: texto(y.de, 80).trim(), cena: idOk(y.cena), efeitoId: idOk(y.efeitoId), em: carimbo(y.em) };
      }).filter(Boolean)).slice(-MAX),
      hesitacao: porId(lista(b.hesitacao).map(function (r) {
        var y = obj(r);
        var ef = idOk(y.efeitoId);
        if (!ef) return null;
        return { efeitoId: ef, seguidos: inteiro(y.seguidos, 0, 2, 0), falhouNoTurno: y.falhouNoTurno === true };
      }).filter(Boolean), "efeitoId").slice(-MAX),
      rebotes: porId(lista(b.rebotes).map(function (r) {
        var y = obj(r);
        var id = idOk(y.id);
        if (!id) return null;
        return { id: id, efeitoId: idOk(y.efeitoId), cena: idOk(y.cena), pendente: y.pendente !== false };
      }).filter(Boolean)).slice(-MAX),
      modular: { grupos: grupos },
    };
    return ordem;
  }

  function vazio() { return normalizar({}, {}).arquivo6; }

  function dados(ordem) {
    if (!ordem.arquivo6) normalizar(ordem, {});
    return ordem.arquivo6;
  }

  function jaFeito(ordem, opId) {
    return !!opId && dados(ordem).usos.some(function (u) { return u.opId === opId; });
  }
  function registrarUso(ordem, opId, tipo) {
    var a = dados(ordem);
    if (!opId || jaFeito(ordem, opId)) return false;
    a.usos.push({ opId: opId, tipo: texto(tipo, 40), em: agora() });
    a.usos = a.usos.slice(-MAX);
    return true;
  }

  /* =================================================================
     FORÇAS PARA ENFRENTAR (Cobaia Sobrevivente, p. 66)
     ================================================================= */

  function ocorrenciaDaCena(ordem) {
    var cena = cenaDe(ordem);
    return dados(ordem).forcas.ocorrencias.filter(function (o) { return o.cena === cena; }).slice(-1)[0] || null;
  }
  function imuneAMedoNaCena(ordem) {
    var cena = cenaDe(ordem);
    return dados(ordem).forcas.ocorrencias.some(function (o) { return o.cena === cena && o.imune; });
  }
  /* A mesa indica: o abalado entra em Condições com a origem. */
  function registrarOcorrencia(ordem, efeitoId, por) {
    if (ordem.origem !== "cobaiaSobrevivente") return { ok: false, motivo: "Só com a origem Cobaia Sobrevivente." };
    var a = dados(ordem);
    var oc = { id: novoId("tr"), cena: cenaDe(ordem), em: agora(), por: texto(por, 80), efeitoId: idOk(efeitoId), imune: false };
    a.forcas.ocorrencias.push(oc);
    a.forcas.ocorrencias = a.forcas.ocorrencias.slice(-MAX);
    return { ok: true, ocorrencia: oc };
  }
  /* 2 PE (cobrados pela tela): imunidade a efeitos de medo até o fim da
     cena — inclusive ao abalado da ocorrência, que sai de Condições. */
  function comprarImunidade(ordem, idOcorrencia) {
    var oc = dados(ordem).forcas.ocorrencias.filter(function (o) { return o.id === idOcorrencia; })[0];
    if (!oc) return { ok: false, motivo: "Ocorrência não encontrada." };
    if (oc.cena !== cenaDe(ordem)) return { ok: false, motivo: "A ocorrência é de outra cena." };
    if (oc.imune) return { ok: false, motivo: "A imunidade já foi comprada nesta ocorrência." };
    oc.imune = true;
    if (oc.efeitoId && EF() && ordem.condicoes) EF().encerrar(ordem.condicoes, oc.efeitoId, "manual", "Forças para Enfrentar");
    /* A imunidade entra na lista de Condições (é ela que a ficha confere
       antes de aplicar) e sai no fim da cena — só se foi posta aqui. */
    if (ordem.condicoes) {
      if (!Array.isArray(ordem.condicoes.imunidades)) ordem.condicoes.imunidades = [];
      if (ordem.condicoes.imunidades.indexOf("categoria:medo") < 0) {
        ordem.condicoes.imunidades.push("categoria:medo");
        oc.imunidadeAdicionada = true;
      }
    }
    var outras = EF() && ordem.condicoes ? (ordem.condicoes.efeitos || []).filter(function (x) {
      var m = /^cond:(.+)$/.exec(x.modelo || "");
      var c = m ? EF().condicao(m[1]) : null;
      return EF().ativa(x) && c && c.categoria === "medo";
    }) : [];
    return { ok: true, outrasDeMedo: outras.map(function (x) { return x.nome; }) };
  }

  /* =================================================================
     MÉDICO DE CAMPO (p. 68)
     ================================================================= */

  /* Paramédico: 2d10 (d12 com Médico da Salvação), +1 dado em NEX 40%,
     65% e 99%, a +1 PE cada (OPRPG p. 31). Com NEX & Experiência, o
     NEX da trilha é o do nível. */
  function planoDoParamedico(ordem, extras) {
    var R = global.RAMAOrdemRegras;
    var t = R ? R.trilho(ordem) : { nexEquivalente: Number(ordem && ordem.nex) || 0 };
    var nex = t.nexEquivalente || 0;
    var maximo = 2 + (nex >= 40 ? 1 : 0) + (nex >= 65 ? 1 : 0) + (nex >= 99 ? 1 : 0);
    var dados_ = Math.max(2, Math.min(maximo, inteiro(extras, 0, 3, 0) + 2));
    var dado = temPoder(ordem, "medicoDaSalvacao") ? 12 : 10;
    return { dados: dados_, maximo: maximo, dado: dado, expressao: dados_ + "d" + dado, custo: 2 + (dados_ - 2) };
  }
  function salvacaoNaRodada(ordem) {
    var k = chaveDaRodada(ordem);
    return dados(ordem).salvacao.some(function (s) { return s.rodada === k; });
  }
  function registrarSalvacao(ordem) {
    if (!temPoder(ordem, "medicoDaSalvacao")) return { ok: false, motivo: "Só com Médico da Salvação." };
    if (salvacaoNaRodada(ordem)) return { ok: false, motivo: "Já usado como ação de movimento nesta rodada (uma vez por rodada)." };
    var a = dados(ordem);
    a.salvacao.push({ id: novoId("sv"), rodada: chaveDaRodada(ordem), em: agora() });
    a.salvacao = a.salvacao.slice(-MAX);
    return { ok: true };
  }
  /* Equipe de Trauma: uma condição; três com o Veterano (nunca morrendo). */
  function limiteDaEquipe(ordem) { return temPoder(ordem, "veteranoDaEquipeDeTrauma") ? 3 : 1; }

  function resgateNaCena(ordem, alvo) {
    var cena = cenaDe(ordem);
    var k = texto(alvo, 80).trim().toLowerCase();
    return dados(ordem).resgates.some(function (r) { return r.cena === cena && r.alvo.toLowerCase() === k; });
  }
  function registrarResgate(ordem, alvo) {
    var nome = texto(alvo, 80).trim();
    if (!temPoder(ordem, "resgatarDaMorte")) return { ok: false, motivo: "Só com Resgatar da Morte." };
    if (!nome) return { ok: false, motivo: "Diga quem é o ser socorrido." };
    if (resgateNaCena(ordem, nome)) return { ok: false, motivo: "Resgatar da Morte já foi usado em " + nome + " nesta cena (uma vez por ser por cena)." };
    var a = dados(ordem);
    a.resgates.push({ id: novoId("rg"), cena: cenaDe(ordem), alvo: nome, em: agora() });
    a.resgates = a.resgates.slice(-MAX);
    return { ok: true };
  }

  /* =================================================================
     FARMACÊUTICO DE CAMPO (p. 68)
     ================================================================= */

  /* O catálogo normalizado guarda a categoria como número (1); o livro e
     a ficha antiga, em romano ("I"). Os dois valem. */
  var NUMERO_DA_CATEGORIA = { "0": 0, "I": 1, "II": 2, "III": 3, "IV": 4, "1": 1, "2": 2, "3": 3, "4": 4 };
  var USOS_DO_KIT = 3;

  function ehKitDeMedicina(item) {
    if (!item) return false;
    var nome = String(item.nome || "").toLowerCase();
    if (nome.normalize) nome = nome.normalize("NFD").replace(/[̀-ͯ]/g, "");
    return /kit/.test(nome) && /medicin|medic/.test(nome);
  }
  function usosDoKit(item) {
    var d = I() ? I().dadosDoItem(item) : ((item && item.ordem) || {});
    return inteiro(d.usosFarmaceutico, 0, USOS_DO_KIT, 0);
  }
  function custoDaFabricacao(categoria) {
    var n = NUMERO_DA_CATEGORIA[String(categoria)];
    return 2 + 2 * (n === undefined ? 0 : n);
  }
  function fabricacaoFeita(ordem, opId) { return dados(ordem).fabricacoes.some(function (f) { return f.id === opId; }); }
  /* O registro da fabricação. Quem cria o item e tira o uso do kit é a
     tela, na MESMA gravação; aqui fica o id para não repetir. */
  function registrarFabricacao(ordem, opId, item, catalogoId, kitId, custo) {
    if (!temPoder(ordem, "farmaceuticoDeCampo")) return { ok: false, motivo: "Só com Farmacêutico de Campo." };
    if (!emInterludio(ordem)) return { ok: false, motivo: "Só numa cena de interlúdio." };
    if (fabricacaoFeita(ordem, opId)) return { ok: true, repetido: true };
    var a = dados(ordem);
    a.fabricacoes.push({ id: opId, itemId: idOk(item && item.id), catalogoId: texto(catalogoId, 80), nome: texto(item && item.nome, 80),
      kitId: idOk(kitId), custo: custo, interludio: interludioDe(ordem), em: agora() });
    a.fabricacoes = a.fabricacoes.slice(-MAX);
    return { ok: true };
  }

  /* =================================================================
     ESCUDO ESPIRAL TEMPORAL e GRILHÕES DE LODO (p. 71)
     ================================================================= */

  function usosDoEscudoNaRodada(ordem) {
    var k = chaveDaRodada(ordem);
    return dados(ordem).escudo.filter(function (e) { return e.rodada === k; }).length;
  }
  function podeEscudo(ordem) {
    if (!temPoder(ordem, "escudoEspiralTemporal")) return { ok: false, motivo: "Só com Escudo Espiral Temporal." };
    if (!comAfinidade(ordem, "escudoEspiralTemporal") && usosDoEscudoNaRodada(ordem) >= 1) return { ok: false, motivo: "Já usado nesta rodada (sem afinidade, uma vez por rodada)." };
    return { ok: true };
  }
  /* RD 20 contra munição, 10 contra arma corpo a corpo; nunca contra
     dano de Energia. */
  function registrarEscudo(ordem, tipo, energia) {
    var p = podeEscudo(ordem);
    if (!p.ok) return p;
    var rd = energia ? 0 : (tipo === "municao" ? 20 : 10);
    var a = dados(ordem);
    a.escudo.push({ id: novoId("es"), rodada: chaveDaRodada(ordem), tipo: tipo === "municao" ? "municao" : "arma", rd: rd, em: agora() });
    a.escudo = a.escudo.slice(-MAX);
    return { ok: true, rd: rd };
  }
  /* A arma envelhecida (no inventário de quem a empunha): 1 = −1 dado
     no ataque; 2 = quebrada. */
  function envelhecer(item) {
    if (!item) return { ok: false };
    if (!item.ordem || typeof item.ordem !== "object") item.ordem = {};
    var n = inteiro(item.ordem.envelhecida, 0, 2, 0);
    item.ordem.envelhecida = Math.min(2, n + 1);
    return { ok: true, nivel: item.ordem.envelhecida };
  }
  function dadosDeEnvelhecimento(item) {
    var d = I() ? I().dadosDoItem(item) : ((item && item.ordem) || {});
    return inteiro(d.envelhecida, 0, 2, 0) >= 1 ? -1 : 0;
  }

  function maiorAtributo(ordem) {
    var R = global.RAMAOrdemRegras;
    if (!R) return 0;
    return ["agi", "for", "int", "pre", "vig"].reduce(function (m, k) { return Math.max(m, R.atributo(ordem, k)); }, 0);
  }
  /* DT de habilidade: 10 + limite de PE + o atributo (aqui, o mais alto). */
  function dtDosGrilhoes(ordem, inventario) {
    var R = global.RAMAOrdemRegras;
    var c = R ? R.calcular(ordem, inventario) : null;
    var limite = c && c.limitePe ? c.limitePe.total : 0;
    return 10 + limite + maiorAtributo(ordem);
  }
  function grilhoesNaCena(ordem) {
    var cena = cenaDe(ordem);
    return dados(ordem).grilhoes.filter(function (g) { return g.cena === cena; }).slice(-1)[0] || null;
  }
  function criarGrilhoes(ordem, dt) {
    if (!temPoder(ordem, "grilhoesDeLodo")) return { ok: false, motivo: "Só com Grilhões de Lodo." };
    var a = dados(ordem);
    var g = { id: novoId("gl"), cena: cenaDe(ordem), afinidade: comAfinidade(ordem, "grilhoesDeLodo"), dt: inteiro(dt, 0, 99, 0), resolucoes: 1, em: agora() };
    a.grilhoes.push(g);
    a.grilhoes = a.grilhoes.slice(-MAX);
    return { ok: true, area: g };
  }
  function resolverGrilhoes(ordem) {
    var g = grilhoesNaCena(ordem);
    if (!g) return { ok: false, motivo: "Não há área de Grilhões de Lodo nesta cena." };
    g.resolucoes = Math.min(99, g.resolucoes + 1);
    return { ok: true, area: g };
  }
  function planoDosGrilhoes(ordem) {
    var af = comAfinidade(ordem, "grilhoesDeLodo");
    return { dano: af ? "6d6" : "3d6", condicao: af ? "enredado" : "lento", afinidade: af };
  }

  /* =================================================================
     SALTO DE DADOS (p. 71)
     -----------------------------------------------------------------
     A ORDEM: marcar cobra os 2 PE e SÓ DEPOIS tira o retrato (o
     "momento em que fez o símbolo" já é sem os 2 PE). Voltar cobra os 3
     PE e então devolve o retrato — inclusive os PE —, consome a marca e
     aplica frustrado até o fim da cena.

     O retrato guarda o estado de jogo: PV, PE, Sanidade e PD, os PV e PE
     temporários, os efeitos e as imunidades de Condições e os
     rastreadores (morrendo, inconsciente, enlouquecendo, perturbado) —
     ligado/desligado, não os turnos contados. NÃO guarda nem devolve:
     identidade, NEX e progressão, inventário, rituais, permissões,
     anotações, histórico, a cena e o próprio arquivo6 (a marca não volta
     de um retrato).

     Uma marca consumida entra em `consumidas` e não reaparece: a
     leitura descarta uma marca cujo id já foi consumido, mesmo que uma
     aba antiga a mande de volta. O id da operação impede voltar duas
     vezes com o mesmo clique, reenvio ou outra aba.
     ================================================================= */

  function tirarRetrato(ordem) {
    var cond = ordem.condicoes || {};
    var rr = {};
    ["morrendo", "inconsciente", "enlouquecendo", "perturbado"].forEach(function (k) {
      var y = obj(cond[k]);
      rr[k] = { ativa: y.ativa === true, desde: carimbo(y.desde) };
    });
    return normalizarRetrato({
      recursos: copia(obj(ordem.recursos)),
      temporarios: copia(obj(ordem.temporarios)),
      temporariosDeCena: copia(lista(ordem.temporariosDeCena)),
      efeitos: copia(lista(cond.efeitos)),
      imunidades: copia(lista(cond.imunidades)),
      rastreadores: rr,
    });
  }

  function validadeDaMarca(ordem) {
    var m = dados(ordem).salto.marca;
    if (!m) return { valida: false, motivo: "Não há marca." };
    var dias = m.afinidade ? 365 : 1;
    var hoje = diaDe(ordem);
    if (m.dia && hoje && hoje > m.dia + dias) return { valida: false, vencida: true, motivo: "A marca venceu (" + (m.afinidade ? "1 ano" : "1 dia") + " pela cronologia da campanha)." };
    return { valida: true, dias: dias };
  }

  function operacaoFeita(ordem, opId) {
    return !!opId && dados(ordem).salto.operacoes.some(function (o) { return o.opId === opId; });
  }

  function marcar(ordem, opId) {
    if (!temPoder(ordem, "saltoDeDados")) return { ok: false, motivo: "Só com Salto de Dados." };
    if (operacaoFeita(ordem, opId)) return { ok: true, repetido: true };
    var a = dados(ordem);
    if (a.salto.marca && validadeDaMarca(ordem).valida) return { ok: false, motivo: "Já há uma marca no seu corpo. Consuma-a (ou encerre a vencida) antes de fazer outra." };
    a.salto.marca = { id: novoId("mk"), em: agora(), cena: cenaDe(ordem), dia: diaDe(ordem), afinidade: comAfinidade(ordem, "saltoDeDados"), retrato: tirarRetrato(ordem) };
    a.salto.operacoes.push({ opId: opId, tipo: "marcar", em: agora() });
    a.salto.operacoes = a.salto.operacoes.slice(-MAX);
    return { ok: true, marca: a.salto.marca };
  }

  function encerrarMarca(ordem) {
    var a = dados(ordem);
    if (!a.salto.marca) return { ok: false };
    a.salto.consumidas.push({ id: a.salto.marca.id, em: agora() });
    a.salto.consumidas = a.salto.consumidas.slice(-MAX);
    a.salto.marca = null;
    return { ok: true };
  }

  /* Devolve o retrato. A tela já cobrou os 3 PE (e o frustrado vem
     depois, aplicado por ela com a origem). */
  function voltar(ordem, opId) {
    if (operacaoFeita(ordem, opId)) return { ok: true, repetido: true };
    var a = dados(ordem);
    var m = a.salto.marca;
    if (!m) return { ok: false, motivo: "Não há marca para consumir." };
    var v = validadeDaMarca(ordem);
    if (!v.valida) return { ok: false, motivo: v.motivo };
    var r = m.retrato;
    if (!ordem.recursos) ordem.recursos = {};
    ["pv", "pe", "san", "pd"].forEach(function (k) { ordem.recursos[k] = r.recursos[k]; });
    ordem.temporarios = copia(r.temporarios);
    ordem.temporariosDeCena = copia(r.temporariosDeCena);
    if (!ordem.condicoes) ordem.condicoes = CD() ? CD().vazio() : {};
    ordem.condicoes.efeitos = EF() ? EF().normalizarLista(copia(r.efeitos)) : copia(r.efeitos);
    ordem.condicoes.imunidades = EF() ? EF().normalizarImunidades(r.imunidades) : r.imunidades.slice();
    ["morrendo", "inconsciente", "enlouquecendo", "perturbado"].forEach(function (k) {
      if (!ordem.condicoes[k]) return;
      ordem.condicoes[k].ativa = r.rastreadores[k].ativa;
      ordem.condicoes[k].desde = r.rastreadores[k].desde;
    });
    a.salto.consumidas.push({ id: m.id, em: agora() });
    a.salto.consumidas = a.salto.consumidas.slice(-MAX);
    a.salto.marca = null;
    a.salto.operacoes.push({ opId: opId, tipo: "voltar", em: agora() });
    a.salto.operacoes = a.salto.operacoes.slice(-MAX);
    return { ok: true, retrato: r };
  }

  /* =================================================================
     GRÃO-MESTRE EM ELEMENTO (p. 69)
     ================================================================= */

  var GRAO_MESTRE = {
    sangue: { aliado: "+2d4 de dano de Sangue nas rolagens de dano, até o fim da cena.", inimigo: "debilitado", rotuloAliado: "+2d4 de Sangue no dano" },
    morte: { aliado: "2d8+2 PV temporários, até o fim da cena.", inimigo: "lento", rotuloAliado: "2d8+2 PV temporários", pvTemporarios: "2d8+2" },
    conhecimento: { aliado: "+2 em testes de perícia, até o fim da cena.", inimigo: "esmorecido", rotuloAliado: "+2 em testes de perícia",
      modificadores: [{ alvo: "pericias", tipo: "bonus", valor: 2 }] },
    energia: { aliado: "+6 m em todas as formas de deslocamento, até o fim da cena.", inimigo: "desprevenido", rotuloAliado: "+6 m de deslocamento",
      modificadores: [{ alvo: "deslocamento", tipo: "deslocamento", valor: 6, operacao: "soma" }] },
  };

  /* Os elementos de um ritual (vários, quando o livro dá vários). */
  function elementosDoRitual(ritual) {
    var RT = global.RAMAOrdemRituais;
    var d = RT && RT.dadosDoRitual ? RT.dadosDoRitual(ritual) : ((ritual && ritual.ordem) || {});
    /* Como em "Usar ritual": a lista vale quando o ritual é de todos os
       elementos dela (Hesitação Forçada); senão, o elemento escolhido
       (Amaldiçoar Arma). */
    var l = Array.isArray(d.elementos) && d.elementos.length && d.todosOsElementos ? d.elementos.slice() : (d.elemento ? [d.elemento] : []);
    if (!l.length && ritual && ritual.elemento) l = [String(ritual.elemento).toLowerCase()];
    return l.filter(function (e) { return ELEMENTOS.indexOf(e) >= 0 || e === "medo"; });
  }
  function graoMestreNoRitual(ordem, ritual) {
    var meus = elementosDoPoder(ordem, "graoMestreEmElemento");
    var dele = elementosDoRitual(ritual);
    return meus.filter(function (e) { return dele.indexOf(e) >= 0; });
  }

  var OPRESSAO_PADRAO = { sangue: "conhecimento", conhecimento: "energia", energia: "morte", morte: "sangue" };
  function oprime(a, b) {
    var O = (C() && C().OPRESSAO) || OPRESSAO_PADRAO;
    return O[a] === b;
  }
  /* Dominador de Elemento: os elementos escolhidos que oprimem o do
     ritual — para onde o dano pode ir. */
  function dominadorNoRitual(ordem, ritual) {
    var meus = elementosDoPoder(ordem, "dominadorDeElemento");
    var dele = elementosDoRitual(ritual);
    return meus.filter(function (e) { return dele.some(function (d) { return oprime(e, d); }); });
  }

  function registrarRecebido(ordem, elemento, papel, de, efeitoId) {
    if (ELEMENTOS.indexOf(elemento) < 0) return { ok: false, motivo: "Elemento inválido." };
    var a = dados(ordem);
    var r = { id: novoId("rc"), tipo: "graoMestre", elemento: elemento, papel: papel === "inimigo" ? "inimigo" : "aliado",
      de: texto(de, 80).trim(), cena: cenaDe(ordem), efeitoId: idOk(efeitoId), em: agora() };
    a.recebidos.push(r);
    a.recebidos = a.recebidos.slice(-MAX);
    return { ok: true, recebido: r };
  }
  function recebidosNaCena(ordem) {
    var cena = cenaDe(ordem);
    return dados(ordem).recebidos.filter(function (r) { return r.cena === cena; });
  }

  /* =================================================================
     HESITAÇÃO FORÇADA (p. 72) — no alvo
     ================================================================= */

  var ID_HESITACAO = "as6.ritual.hesitacao-forcada";

  function hesitacoesAtivas(ordem) {
    if (!EF() || !ordem || !ordem.condicoes) return [];
    return (ordem.condicoes.efeitos || []).filter(function (x) {
      return EF().ativa(x) && (x.modelo === "ritual:" + ID_HESITACAO || /^hesita[cç][aã]o for[cç]ada/i.test(x.nome || ""));
    });
  }
  function versaoDaHesitacao(inst) {
    var v = String(inst && inst.versao || "Normal");
    return v === "Verdadeiro" ? "Verdadeiro" : (v === "Discente" ? "Discente" : "Normal");
  }
  function registroDaHesitacao(ordem, efeitoId) {
    var a = dados(ordem);
    var r = a.hesitacao.filter(function (h) { return h.efeitoId === efeitoId; })[0];
    if (!r) { r = { efeitoId: efeitoId, seguidos: 0, falhouNoTurno: false }; a.hesitacao.push(r); }
    return r;
  }
  /* O teste de Vontade no início do turno do alvo. Normal e Discente:
     falhou, rola de novo o maior dado até o fim do turno; dois sucessos
     seguidos encerram. Verdadeira (Vontade anula): passou, encerra. */
  function testeDaHesitacao(ordem, efeitoId, passou) {
    var inst = hesitacoesAtivas(ordem).filter(function (x) { return x.id === efeitoId; })[0];
    if (!inst) return { ok: false, motivo: "O efeito não está ativo." };
    var r = registroDaHesitacao(ordem, efeitoId);
    var versao = versaoDaHesitacao(inst);
    var encerrou = false;
    if (versao === "Verdadeiro") {
      r.falhouNoTurno = false;
      if (passou) encerrou = true;
    } else if (passou) {
      r.seguidos = Math.min(2, r.seguidos + 1);
      r.falhouNoTurno = false;
      if (r.seguidos >= 2) encerrou = true;
    } else {
      r.seguidos = 0;
      r.falhouNoTurno = true;
    }
    if (encerrou) {
      EF().encerrar(ordem.condicoes, efeitoId, "manual", "Hesitação Forçada");
      dados(ordem).hesitacao = dados(ordem).hesitacao.filter(function (h) { return h.efeitoId !== efeitoId; });
    }
    return { ok: true, encerrou: encerrou, versao: versao, seguidos: r.seguidos, falhouNoTurno: r.falhouNoTurno };
  }
  function fimDoTurnoDaHesitacao(ordem, efeitoId) {
    var r = registroDaHesitacao(ordem, efeitoId);
    r.falhouNoTurno = false;
    return { ok: true };
  }
  /* O que o próximo teste rola de novo: "maior" (falhou no início do
     turno, Normal e Discente), "menor" (Verdadeira) ou nada. */
  function rolagemDaHesitacao(ordem) {
    var saida = null;
    hesitacoesAtivas(ordem).forEach(function (inst) {
      var v = versaoDaHesitacao(inst);
      if (v === "Verdadeiro") { saida = saida || { dado: "menor", versao: v, efeitoId: inst.id }; return; }
      var r = dados(ordem).hesitacao.filter(function (h) { return h.efeitoId === inst.id; })[0];
      if (r && r.falhouNoTurno) saida = { dado: "maior", versao: v, efeitoId: inst.id };
    });
    return saida;
  }

  /* =================================================================
     AFECÇÕES — registrar, mudar de estágio, encerrar
     -----------------------------------------------------------------
     A afecção põe em Condições o que o estágio (ou o veneno) dá, e
     guarda o id de cada aplicação. Mudar de estágio encerra SÓ essas
     aplicações e põe as do estágio novo; uma condição que veio de outra
     fonte nunca é tocada. Os rastreadores (inconsciente, morrendo) são
     LIGADOS quando o estágio pede, e nunca desligados por aqui: podem
     ter outra causa — a pessoa encerra.
     ================================================================= */

  function nomeDaAfeccao(af) {
    var m = modeloDa(af);
    if (!m) return "Afecção";
    return m.nome + (af.tipo === "doenca" ? " (estágio " + ["—", "I", "II", "III", "IV"][Math.min(4, af.estagio)] + ")" : af.resistiu ? " (resistiu)" : "");
  }

  function aplicarEfeitosDe(ordem, af, alvoNome) {
    var ef = efeitoAtual(af);
    var notas = [];
    if (!ef || !EF() || !ordem.condicoes) return notas;
    var nome = nomeDaAfeccao(af);
    var origem = { tipo: "condicao", nome: nome };
    var base = { origem: origem, alvoNome: alvoNome || "", duracao: { tipo: "ateRemover" }, cena: cenaDe(ordem) };
    if ((ef.modificadores && ef.modificadores.length) || (ef.textos && ef.textos.length) || ef.intelectoZero) {
      var mods = copia(ef.modificadores || []);
      if (ef.intelectoZero) {
        var R = global.RAMAOrdemRegras;
        var int = R ? R.atributo(ordem, "int") : 0;
        if (int > 0) mods.push({ alvo: "atributo:int", tipo: "dados", valor: -int });
      }
      var inst = EF().criarInstancia(Object.assign({}, base, {
        nome: nome, descricao: ef.texto + (ef.intelectoZero ? " Intelecto 0: os testes de Intelecto rolam como com o atributo 0 — o atributo da ficha não muda." : ""),
        modificadores: mods, restricoes: (ef.textos || []).slice(0, 8),
      }));
      var r = EF().aplicar(ordem.condicoes, inst, "nova");
      if (r.ok && r.instancia) af.efeitos.push(r.instancia.id);
      else if (r.motivo) notas.push(r.motivo);
    }
    (ef.condicoes || []).forEach(function (k) {
      if (!EF().condicao(k)) return;
      var c = EF().criarInstancia(Object.assign({}, base, { modelo: "cond:" + k }));
      var r2 = EF().aplicar(ordem.condicoes, c, "nova");
      if (r2.ok && r2.acao === "rastreador" && CD()) {
        CD().ativar(ordem.condicoes, r2.rastreador);
        notas.push(EF().condicao(k).nome + ": ligado no contador próprio da ficha (encerre-o lá quando a condição acabar).");
      } else if (r2.ok && r2.instancia) af.efeitos.push(r2.instancia.id);
      else if (!r2.ok && r2.motivo) notas.push(r2.motivo);
    });
    af.efeitos = af.efeitos.slice(-12);
    return notas;
  }

  function tirarEfeitosDe(ordem, af, por) {
    if (EF() && ordem.condicoes) {
      af.efeitos.forEach(function (id) { EF().encerrar(ordem.condicoes, id, "manual", por || "afecção"); });
    }
    af.efeitos = [];
  }

  function historico(af, acao, por) {
    af.historico.push({ id: novoId("h"), acao: texto(acao, 160), por: texto(por, 80), em: agora() });
    af.historico = af.historico.slice(-MAX);
  }

  /* Doença: entra no estágio dado (I, se não disser). Veneno: falhou ou
     resistiu ao teste de Fortitude. `rodadas` é a rolagem de 1d4+1 da
     Ricina resistida, feita pela tela. */
  function registrarAfeccao(ordem, tipo, chave, opcoes) {
    var op = obj(opcoes);
    var m = tipo === "veneno" ? POR_VENENO[chave] : POR_DOENCA[chave];
    if (!m) return { ok: false, motivo: "Doença ou veneno desconhecido." };
    var a = dados(ordem);
    var af = normalizarAfeccao({ id: novoId("af"), tipo: tipo, chave: chave, estagio: op.estagio || 1, resistiu: op.resistiu === true,
      rodadas: op.rodadas || 0, origem: op.origem || "", em: agora() });
    var notas = aplicarEfeitosDe(ordem, af, op.alvoNome);
    historico(af, tipo === "veneno" ? (af.resistiu ? "Resistiu ao veneno (Fortitude DT " + m.dt + ")." : "Falhou no teste (Fortitude DT " + m.dt + ").") : "Contraiu: estágio " + ["—", "I", "II", "III", "IV"][af.estagio] + ".", op.por);
    a.afeccoes.push(af);
    a.afeccoes = a.afeccoes.slice(-MAX);
    return { ok: true, afeccao: af, notas: notas, efeito: efeitoAtual(af) };
  }

  function acharAfeccao(ordem, id) {
    return dados(ordem).afeccoes.filter(function (x) { return x.id === id; })[0] || null;
  }

  /* +1 ou −1 estágio (ou um número). 0 cura a doença. */
  function mudarEstagio(ordem, id, para, por, alvoNome) {
    var af = acharAfeccao(ordem, id);
    if (!af || af.tipo !== "doenca" || af.encerrada) return { ok: false, motivo: "Doença não encontrada." };
    var novo = inteiro(para, 0, 4, af.estagio);
    if (novo === af.estagio) return { ok: false, motivo: "O estágio já é esse." };
    var de = af.estagio;
    tirarEfeitosDe(ordem, af, por);
    af.estagio = novo;
    var notas = [];
    if (novo === 0) {
      af.encerrada = true;
      historico(af, "Curada (estágio " + ["—", "I", "II", "III", "IV"][de] + " → fim).", por);
    } else {
      notas = aplicarEfeitosDe(ordem, af, alvoNome);
      historico(af, "Estágio " + ["—", "I", "II", "III", "IV"][de] + " → " + ["—", "I", "II", "III", "IV"][novo] + ".", por);
    }
    return { ok: true, afeccao: af, notas: notas, efeito: efeitoAtual(af) };
  }

  function encerrarAfeccao(ordem, id, por, motivo) {
    var af = acharAfeccao(ordem, id);
    if (!af || af.encerrada) return { ok: false, motivo: "Afecção não encontrada." };
    tirarEfeitosDe(ordem, af, por);
    af.encerrada = true;
    historico(af, motivo || "Encerrada.", por);
    return { ok: true };
  }

  /* Rodada de perda de PV (Ricina): perda, não dano — RD não reduz. */
  function rodadaDeRicina(ordem, id) {
    var af = acharAfeccao(ordem, id);
    if (!af || af.encerrada || af.chave !== "ricina") return { ok: false, motivo: "Ricina não encontrada." };
    var ef = efeitoAtual(af);
    if (af.resistiu && af.rodadas && af.rodadasFeitas >= af.rodadas) return { ok: false, motivo: "As rodadas da Ricina já acabaram." };
    af.rodadasFeitas = Math.min(99, af.rodadasFeitas + 1);
    historico(af, "Rodada " + af.rodadasFeitas + (af.rodadas ? " de " + af.rodadas : "") + ": perde " + ef.perdaPorRodada + " PV.");
    var acabou = af.resistiu && af.rodadas && af.rodadasFeitas >= af.rodadas;
    if (acabou) { af.encerrada = true; historico(af, "As rodadas acabaram."); }
    return { ok: true, expressao: ef.perdaPorRodada, acabou: !!acabou };
  }

  /* Tratamento (OPRPG p. 46): passando, o paciente recebe +5 no próximo
     teste de Fortitude contra a doença ou o veneno — +10 com Doutor em
     Emergências. Fica guardado na afecção e é gasto uma vez. */
  function guardarTratamento(ordem, id, valor) {
    var af = acharAfeccao(ordem, id);
    if (!af || af.encerrada) return { ok: false, motivo: "Afecção não encontrada." };
    af.tratamento = valor >= 10 ? 10 : 5;
    historico(af, "Tratamento: +" + af.tratamento + " no próximo teste de Fortitude.");
    return { ok: true };
  }
  function gastarTratamento(ordem, id) {
    var af = acharAfeccao(ordem, id);
    if (!af || !af.tratamento) return 0;
    var v = af.tratamento;
    af.tratamento = 0;
    historico(af, "Tratamento usado (+" + v + ").");
    return v;
  }

  function afeccoesAtivas(ordem) {
    return dados(ordem).afeccoes.filter(function (x) { return !x.encerrada; });
  }

  /* =================================================================
     APLICADOR DE ADRENALINA — o rebote
     ================================================================= */

  function registrarRebote(ordem, efeitoId) {
    var a = dados(ordem);
    a.rebotes.push({ id: novoId("rb"), efeitoId: idOk(efeitoId), cena: cenaDe(ordem), pendente: true });
    a.rebotes = a.rebotes.slice(-MAX);
  }
  /* No fim da cena do efeito, o rebote fica pendente para a próxima. */
  function rebotesPendentes(ordem) {
    var cena = cenaDe(ordem);
    return dados(ordem).rebotes.filter(function (r) { return r.pendente && r.cena !== cena; });
  }
  function resolverRebote(ordem, id) {
    var r = dados(ordem).rebotes.filter(function (x) { return x.id === id; })[0];
    if (!r) return { ok: false };
    r.pendente = false;
    return { ok: true };
  }

  /* =================================================================
     EFEITOS QUE ENTRAM NA CONTA DA FICHA
     ================================================================= */

  function efeitos(ordem, inventario) {
    var saida = [];
    if (!ordem) return saida;
    /* Especialista em Proteção Leve: com uma proteção LEVE em uso. */
    if (temPoder(ordem, "especialistaEmProtecaoLeve")) {
      var R = global.RAMAOrdemRegras;
      var p = R && R.protecaoEmUso ? R.protecaoEmUso(inventario) : null;
      var item = p && p.item;
      var tipo = item ? (I() ? I().dadosDoItem(item) : (item.ordem || {})).protecao : null;
      if (tipo && tipo.tipo === "leve") {
        saida.push({ fonte: "Especialista em Proteção Leve", detalhe: item.nome + " em uso (AS6 p. 67)", efeito: { tipo: "defesa", valor: 2 } });
        saida.push({ fonte: "Especialista em Proteção Leve", detalhe: item.nome + " em uso (AS6 p. 67)", efeito: { tipo: "bonusPericia", pericias: ["reflexos"], valor: 2 } });
      }
    }
    return saida;
  }

  /* Imunidade a medo da cena (Forças para Enfrentar): a lista que a
     tela de Condições consulta antes de aplicar. */
  function imunidadesDaCena(ordem) {
    return imuneAMedoNaCena(ordem) ? ["categoria:medo"] : [];
  }

  /* Desligar a Evolução Modular não mexe aqui; os ajustes da mesa ficam. */
  function ajustarGrupo(ordem, chave, grupo) {
    var P = global.RAMAOrdemPoderes;
    if (!P || !P.AMBIGUOS_MODULARES[chave]) return { ok: false, motivo: "Só os poderes listados como ambíguos podem ser reclassificados." };
    var g = dados(ordem).modular.grupos;
    if (GRUPOS.indexOf(grupo) < 0) delete g[chave];
    else g[chave] = grupo;
    return { ok: true };
  }

  /* As áreas, os resgates e os usos são da cena: a leitura já filtra
     pela cena atual. A imunidade a medo posta por Forças para Enfrentar
     sai da lista de Condições (só a que foi posta aqui). */
  function aoTrocarDeCena(ordem, cenaQueAcabou) {
    var a = ordem && ordem.arquivo6;
    var saida = { imunidadeRetirada: false };
    if (!a) return saida;
    var acabou = cenaQueAcabou || "inicial";
    a.forcas.ocorrencias.forEach(function (oc) {
      if (oc.cena !== acabou || !oc.imunidadeAdicionada) return;
      oc.imunidadeAdicionada = false;
      if (ordem.condicoes && Array.isArray(ordem.condicoes.imunidades)) {
        ordem.condicoes.imunidades = ordem.condicoes.imunidades.filter(function (k) { return k !== "categoria:medo"; });
        saida.imunidadeRetirada = true;
      }
    });
    return saida;
  }

  global.RAMAOrdemArquivo6 = {
    DOENCAS: DOENCAS,
    VENENOS: VENENOS,
    GRAO_MESTRE: GRAO_MESTRE,
    ID_HESITACAO: ID_HESITACAO,
    USOS_DO_KIT: USOS_DO_KIT,

    normalizar: normalizar,
    vazio: vazio,
    dados: dados,
    temPoder: temPoder,
    comAfinidade: comAfinidade,
    elementosDoPoder: elementosDoPoder,
    cenaDe: cenaDe,
    emInterludio: emInterludio,
    rodadaDe: rodadaDe,
    diaDe: diaDe,
    jaFeito: jaFeito,
    registrarUso: registrarUso,

    ocorrenciaDaCena: ocorrenciaDaCena,
    imuneAMedoNaCena: imuneAMedoNaCena,
    imunidadesDaCena: imunidadesDaCena,
    registrarOcorrencia: registrarOcorrencia,
    comprarImunidade: comprarImunidade,

    planoDoParamedico: planoDoParamedico,
    salvacaoNaRodada: salvacaoNaRodada,
    registrarSalvacao: registrarSalvacao,
    limiteDaEquipe: limiteDaEquipe,
    resgateNaCena: resgateNaCena,
    registrarResgate: registrarResgate,

    ehKitDeMedicina: ehKitDeMedicina,
    usosDoKit: usosDoKit,
    custoDaFabricacao: custoDaFabricacao,
    fabricacaoFeita: fabricacaoFeita,
    registrarFabricacao: registrarFabricacao,

    podeEscudo: podeEscudo,
    usosDoEscudoNaRodada: usosDoEscudoNaRodada,
    registrarEscudo: registrarEscudo,
    envelhecer: envelhecer,
    dadosDeEnvelhecimento: dadosDeEnvelhecimento,
    dtDosGrilhoes: dtDosGrilhoes,
    grilhoesNaCena: grilhoesNaCena,
    criarGrilhoes: criarGrilhoes,
    resolverGrilhoes: resolverGrilhoes,
    planoDosGrilhoes: planoDosGrilhoes,

    tirarRetrato: tirarRetrato,
    validadeDaMarca: validadeDaMarca,
    marcar: marcar,
    voltar: voltar,
    encerrarMarca: encerrarMarca,

    elementosDoRitual: elementosDoRitual,
    graoMestreNoRitual: graoMestreNoRitual,
    dominadorNoRitual: dominadorNoRitual,
    oprime: oprime,
    registrarRecebido: registrarRecebido,
    recebidosNaCena: recebidosNaCena,

    hesitacoesAtivas: hesitacoesAtivas,
    versaoDaHesitacao: versaoDaHesitacao,
    testeDaHesitacao: testeDaHesitacao,
    fimDoTurnoDaHesitacao: fimDoTurnoDaHesitacao,
    rolagemDaHesitacao: rolagemDaHesitacao,

    efeitoAtual: efeitoAtual,
    nomeDaAfeccao: nomeDaAfeccao,
    registrarAfeccao: registrarAfeccao,
    acharAfeccao: acharAfeccao,
    mudarEstagio: mudarEstagio,
    encerrarAfeccao: encerrarAfeccao,
    rodadaDeRicina: rodadaDeRicina,
    guardarTratamento: guardarTratamento,
    gastarTratamento: gastarTratamento,
    afeccoesAtivas: afeccoesAtivas,

    registrarRebote: registrarRebote,
    rebotesPendentes: rebotesPendentes,
    resolverRebote: resolverRebote,

    efeitos: efeitos,
    ajustarGrupo: ajustarGrupo,
    aoTrocarDeCena: aoTrocarDeCena,
  };
})(typeof window !== "undefined" ? window : globalThis);
