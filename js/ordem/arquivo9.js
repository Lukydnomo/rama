/* =====================================================================
   R.A.M.A. — Ordem Paranormal · Arquivos Secretos 9: Hell Hunters (v6.9)
   =====================================================================
   O ESTADO e as REGRAS do AS9 que dependem do jogo. A tela mora em
   js/ordem/telas/ficha-arquivo9.js; os catálogos (origens, poderes,
   trilhas, itens, fichas) nos módulos de catálogo de sempre.

     Tática de Abordagem (p. 39)  o plano feito numa cena de interlúdio,
                                  os dados de tática (d6) e o gasto deles;
                                  os que sobram somem no começo da
                                  próxima cena de interlúdio
     Analisar Perigo (p. 38)      uma vez por cena, bônus pela margem
     Municiador Ambulante (p. 39) os pacotes preparados, que não ocupam
                                  espaço até o próximo municiar
     Incursor (p. 40)             o alvo-prioritário (nome e VD que o
                                  mestre informa) e os reféns da rodada
     Ripostar Ousado (p. 39)      o contra-ataque pendente
     Drones (p. 41, 44–46)        tipos e modificações de cada drone, os
                                  bônus passivos, quem pode usar a
                                  habilidade (duas mãos ou Inteligente),
                                  os limites da trilha Piloto de Drone e
                                  a escolha do segundo drone

   Tudo o que depende da cena (quem está engajado, se o refém está a
   até 3 m, qual inimigo é o alvo) é escolhido no momento, por clique: o
   estado só guarda o que foi decidido. Toda ação com efeito leva um id
   de operação — recarregar ou repetir o clique não refaz.
   ===================================================================== */

(function (global) {
  "use strict";

  var ID = /^[A-Za-z0-9_.:|#-]{1,80}$/;
  var MAX = 60;

  function uuid() {
    var U = global.RAMAUtil;
    return U && U.uuid ? U.uuid() : String(Date.now()) + Math.random().toString(16).slice(2);
  }
  function agora() { return new Date().toISOString(); }
  function texto(v, n) { return String(v === undefined || v === null ? "" : v).replace(/[\u0000-\u001F]/g, " ").slice(0, n || 120); }
  function inteiro(v, min, max, padrao) {
    var n = Number(v);
    if (v === "" || v === null || v === undefined || !Number.isFinite(n)) return padrao;
    return Math.max(min, Math.min(max, Math.round(n)));
  }
  function idOk(v) { var s = String(v || ""); return ID.test(s) ? s : ""; }
  function lista(v) { return Array.isArray(v) ? v : []; }
  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  function novoId(prefixo) { return prefixo + "-" + String(uuid()).replace(/[^A-Za-z0-9]/g, "").slice(0, 24); }
  function porId(l, campo) {
    var k = campo || "id";
    var vistos = {};
    return l.filter(function (x) { if (!x || vistos[x[k]]) return false; vistos[x[k]] = true; return true; });
  }

  function C() { return global.RAMAOrdemCatalogo || null; }
  function E() { return global.RAMAOrdemProgressao || null; }
  function A5() { return global.RAMAOrdemArquivo5 || null; }
  function I() { return global.RAMAOrdemInventario || null; }

  function cenaDe(ordem) { return (ordem && ordem.condicoes && ordem.condicoes.cena && ordem.condicoes.cena.id) || "inicial"; }
  function emInterludio(ordem) { return !!(ordem && ordem.condicoes && ordem.condicoes.cena && ordem.condicoes.cena.interludio); }
  function rodadaDe(ordem) { return A5() && ordem ? A5().rodada(ordem) : 1; }
  function chaveDaRodada(ordem) { return cenaDe(ordem) + "#" + rodadaDe(ordem); }
  function liberado() { var Cat = C(); return !Cat || !Cat.fonteLiberada || Cat.fonteLiberada("AS9"); }

  function aquisicoes(ordem, chave) {
    var est = E() && ordem ? E().estado(ordem, null) : null;
    return est ? est.adquiridos.filter(function (a) { return a.chave === chave && a.valido !== false && a.completo !== false; }) : [];
  }
  function temPoder(ordem, chave) { return aquisicoes(ordem, chave).length > 0; }
  function grauDe(ordem, pericia) {
    var est = E() && ordem ? E().estado(ordem, null) : null;
    var g = est && est.graus ? est.graus[pericia] : 0;
    if (typeof g === "number") return g;
    var Cat = C();
    var b = g && Cat ? Cat.grau(g).bonus : 0;
    return b >= 15 ? 3 : b >= 10 ? 2 : b >= 5 ? 1 : 0;
  }

  /* =================================================================
     NORMALIZAÇÃO
     ================================================================= */

  function normalizar(ordem, bruto) {
    var b = obj(bruto && bruto.arquivo9 !== undefined ? bruto.arquivo9 : (ordem && ordem.arquivo9));
    var ta = obj(b.tatica), an = obj(b.analisar), mu = obj(b.municiar), al = b.alvo ? obj(b.alvo) : null, re = obj(b.refens), ri = obj(b.ripostar), dr = obj(b.drones);
    ordem.arquivo9 = {
      tatica: {
        planos: porId(lista(ta.planos).map(function (p) {
          var y = obj(p); var id = idOk(y.id);
          if (!id) return null;
          var dados = inteiro(y.dados, 0, 20, 0);
          return { id: id, ameaca: texto(y.ameaca, 120), total: inteiro(y.total, -99, 999, 0), dados: dados,
            restantes: inteiro(y.restantes, 0, dados, dados), cena: idOk(y.cena), em: texto(y.em, 40) };
        }).filter(Boolean)).slice(-10),
      },
      analisar: { cena: idOk(an.cena), bonus: inteiro(an.bonus, 0, 20, 0), efeitoId: idOk(an.efeitoId) },
      municiar: { pacotes: inteiro(mu.pacotes, 0, 200, 0), cena: idOk(mu.cena), rolagens: lista(mu.rolagens).map(function (x) { return inteiro(x, 1, 6, 1); }).slice(0, 10) },
      alvo: al && texto(al.nome, 80).trim() ? { nome: texto(al.nome, 80).trim(), vd: inteiro(al.vd, 0, 9999, 0), em: texto(al.em, 40) } : null,
      refens: { rodada: texto(re.rodada, 80), nomes: lista(re.nomes).map(function (n) { return texto(n, 80).trim(); }).filter(Boolean).slice(0, 3) },
      ripostar: { pendente: ri.pendente === true, rodada: texto(ri.rodada, 80) },
      drones: { escolha99: dr.escolha99 === "segundo" || dr.escolha99 === "seis" ? dr.escolha99 : "", metralhar: texto(dr.metralhar, 80) },
      usos: porId(lista(b.usos).map(function (u) {
        var y = obj(u); var op = idOk(y.opId);
        return op ? { opId: op, tipo: texto(y.tipo, 40), em: texto(y.em, 40) } : null;
      }).filter(Boolean), "opId").slice(-MAX),
    };
    return ordem;
  }

  function vazio() { return normalizar({}, {}).arquivo9; }
  function dados(ordem) {
    if (!ordem.arquivo9) normalizar(ordem, {});
    return ordem.arquivo9;
  }
  function jaFeito(ordem, opId) { return !!opId && dados(ordem).usos.some(function (u) { return u.opId === opId; }); }
  function registrarUso(ordem, opId, tipo) {
    var a = dados(ordem);
    if (!opId || jaFeito(ordem, opId)) return false;
    a.usos.push({ opId: opId, tipo: texto(tipo, 40), em: agora() });
    a.usos = a.usos.slice(-MAX);
    return true;
  }
  function falha(motivo) { return { ok: false, motivo: motivo }; }

  /* =================================================================
     TÁTICA DE ABORDAGEM (p. 39)
     ================================================================= */

  /* Tática DT 10: 1 dado passando, +1 a cada 5 acima. */
  function dadosPelaTatica(total) {
    var t = inteiro(total, -99, 999, 0);
    return t >= 10 ? 1 + Math.floor((t - 10) / 5) : 0;
  }
  function planoDaCena(ordem) {
    var cena = cenaDe(ordem);
    return dados(ordem).tatica.planos.filter(function (p) { return p.cena === cena; })[0] || null;
  }
  function planejar(ordem, opId, ameaca, total) {
    if (jaFeito(ordem, opId)) return { ok: true, repetido: true, plano: planoDaCena(ordem) };
    if (!temPoder(ordem, "taticaDeAbordagem")) return falha("A ficha não tem Tática de Abordagem.");
    if (!emInterludio(ordem)) return falha("Tática de abordagem é uma ação de interlúdio: comece um em Condições → Novo interlúdio.");
    if (planoDaCena(ordem)) return falha("Uma vez por cena — o plano desta cena de interlúdio já foi feito.");
    var a = dados(ordem);
    var n = dadosPelaTatica(total);
    var plano = { id: novoId("tt"), ameaca: texto(ameaca, 120).trim() || "ameaça do plano", total: inteiro(total, -99, 999, 0), dados: n, restantes: n, cena: cenaDe(ordem), em: agora() };
    a.tatica.planos.push(plano);
    a.tatica.planos = a.tatica.planos.slice(-10);
    registrarUso(ordem, opId, "tatica");
    return { ok: true, plano: plano };
  }
  function dadosDeTatica(ordem) {
    return dados(ordem).tatica.planos.reduce(function (s, p) { return s + p.restantes; }, 0);
  }
  function planosComDados(ordem) { return dados(ordem).tatica.planos.filter(function (p) { return p.restantes > 0; }); }
  /* Gasta n dados de um plano. A rolagem (nd6) é da tela. */
  function gastarTatica(ordem, opId, planoId, n) {
    if (jaFeito(ordem, opId)) return { ok: true, repetido: true };
    var p = dados(ordem).tatica.planos.filter(function (x) { return x.id === planoId; })[0];
    if (!p) return falha("Plano desconhecido.");
    var q = inteiro(n, 1, 20, 1);
    if (q > p.restantes) return falha("O plano “" + p.ameaca + "” tem só " + p.restantes + " dado(s) de tática.");
    p.restantes -= q;
    registrarUso(ordem, opId, "taticaGasto");
    return { ok: true, plano: p, gastos: q };
  }
  /* Começo de uma cena de interlúdio: os dados que sobraram somem. */
  function aoComecarInterludio(ordem, cenaNova) {
    var a = ordem && ordem.arquivo9;
    if (!a) return { perdidos: 0 };
    var perdidos = 0;
    a.tatica.planos = a.tatica.planos.filter(function (p) {
      if (p.cena === cenaNova) return true;
      perdidos += p.restantes;
      return false;
    });
    return { perdidos: perdidos };
  }

  /* =================================================================
     ANALISAR PERIGO (Tática, p. 38)
     ================================================================= */

  function bonusDaAnalise(total) {
    var t = inteiro(total, -99, 999, 0);
    return t >= 15 ? 2 + Math.floor((t - 15) / 5) : 0;
  }
  function analisarUsadoNaCena(ordem) { return dados(ordem).analisar.cena === cenaDe(ordem); }
  function analisar(ordem, opId, total) {
    if (jaFeito(ordem, opId)) return { ok: true, repetido: true, bonus: dados(ordem).analisar.bonus };
    if (grauDe(ordem, "tatica") < 1) return falha("Analisar Perigo pede Tática treinada.");
    if (analisarUsadoNaCena(ordem)) return falha("Analisar Perigo: uma vez por cena — já usado nesta.");
    var b = bonusDaAnalise(total);
    var a = dados(ordem);
    a.analisar = { cena: cenaDe(ordem), bonus: b, efeitoId: "" };
    registrarUso(ordem, opId, "analisar");
    return { ok: true, bonus: b, passou: b > 0 };
  }

  /* =================================================================
     MUNICIADOR AMBULANTE (p. 39)
     ================================================================= */

  function municiar(ordem, opId, rolagens) {
    if (jaFeito(ordem, opId)) return { ok: true, repetido: true, pacotes: dados(ordem).municiar.pacotes };
    if (!temPoder(ordem, "municiadorAmbulante")) return falha("A ficha não tem Municiador Ambulante.");
    if (!emInterludio(ordem)) return falha("Municiar é uma ação de interlúdio: comece um em Condições → Novo interlúdio.");
    var r = lista(rolagens).map(function (x) { return inteiro(x, 1, 6, 1); });
    var total = r.reduce(function (s, x) { return s + x; }, 0);
    dados(ordem).municiar = { pacotes: total, cena: cenaDe(ordem), rolagens: r.slice(0, 10) };
    registrarUso(ordem, opId, "municiar");
    return { ok: true, pacotes: total };
  }
  function ehMunicao(item) {
    var d = I() ? I().dadosDoItem(item) : ((item && item.ordem) || {});
    return d.grupo === "municao" || /\.municao\./.test(String((item && item.origemCatalogoId) || ""));
  }
  /* Quantos espaços os pacotes preparados deixam de ocupar: até o número
     preparado, contando pacote a pacote o espaço de cada um. */
  function espacosPoupados(ordem, inventario) {
    if (!ordem || !ordem.arquivo9 || !temPoder(ordem, "municiadorAmbulante")) return 0;
    var resta = ordem.arquivo9.municiar.pacotes;
    var poupado = 0;
    ((inventario && inventario.itens) || []).forEach(function (i) {
      if (resta <= 0 || !i || !ehMunicao(i)) return;
      var d = I() ? I().dadosDoItem(i) : (i.ordem || {});
      var q = Math.max(1, inteiro(d.quantidade, 1, 999, 1));
      var unit = typeof d.espacos === "number" ? d.espacos : 1;
      var n = Math.min(resta, q);
      poupado += n * unit;
      resta -= n;
    });
    return Math.round(poupado * 100) / 100;
  }

  /* =================================================================
     INCURSOR (p. 40) E RIPOSTAR OUSADO (p. 39)
     ================================================================= */

  function marcarAlvo(ordem, opId, nome, vd) {
    if (jaFeito(ordem, opId)) return { ok: true, repetido: true, alvo: dados(ordem).alvo };
    if (!temPoder(ordem, "alvoPrioritario")) return falha("A ficha não tem Alvo-prioritário.");
    var n = texto(nome, 80).trim();
    if (!n) return falha("Diga qual inimigo é o alvo-prioritário.");
    var v = inteiro(vd, 0, 9999, -1);
    if (v < 0) return falha("O mestre informa o VD do inimigo: preencha.");
    dados(ordem).alvo = { nome: n, vd: v, em: agora() };
    registrarUso(ordem, opId, "alvo");
    return { ok: true, alvo: dados(ordem).alvo };
  }
  function limparAlvo(ordem) { dados(ordem).alvo = null; return { ok: true }; }
  /* O que o alvo-prioritário dá: VD 200 ou menos, o dano zera os PV; mais,
     +5 na margem de ameaça. */
  function efeitoDoAlvo(ordem) {
    var a = dados(ordem).alvo;
    if (!a) return null;
    return a.vd <= 200 ? { tipo: "zerar", texto: a.nome + " (VD " + a.vd + "): qualquer dano seu nele reduz os PV dele a 0." }
      : { tipo: "margem", valor: 5, texto: a.nome + " (VD " + a.vd + "): +5 na margem de ameaça contra ele." };
  }

  function protegerRefem(ordem, opId, nome) {
    if (jaFeito(ordem, opId)) return { ok: true, repetido: true };
    if (!temPoder(ordem, "protegerRefens")) return falha("A ficha não tem Proteger Reféns.");
    var n = texto(nome, 80).trim();
    if (!n) return falha("Diga quem é o refém.");
    var r = dados(ordem).refens;
    var rodada = chaveDaRodada(ordem);
    if (r.rodada !== rodada) { r.rodada = rodada; r.nomes = []; }
    var k = n.toLowerCase();
    var ja = r.nomes.some(function (x) { return x.toLowerCase() === k; });
    if (!ja && r.nomes.length >= 3) return falha("Nesta rodada você já protegeu três reféns diferentes (" + r.nomes.join(", ") + ").");
    if (!ja) r.nomes.push(n);
    registrarUso(ordem, opId, "refem");
    return { ok: true, refens: r.nomes.slice() };
  }

  function armarRipostar(ordem, opId) {
    if (jaFeito(ordem, opId)) return { ok: true, repetido: true };
    if (!temPoder(ordem, "ripostarOusado")) return falha("A ficha não tem Ripostar Ousado.");
    dados(ordem).ripostar = { pendente: true, rodada: chaveDaRodada(ordem) };
    registrarUso(ordem, opId, "ripostar");
    return { ok: true };
  }
  function ripostarPendente(ordem) {
    var r = dados(ordem).ripostar;
    return !!(r.pendente && r.rodada === chaveDaRodada(ordem));
  }
  function usarRipostar(ordem) { dados(ordem).ripostar = { pendente: false, rodada: "" }; }

  /* =================================================================
     DRONES (p. 41, 44–46)
     ================================================================= */

  var ID_DRONE = "as9.geral.drone-de-combate-tatico";
  var TIPOS_DRONE = {
    atirador: { nome: "Drone Atirador", habilidade: "Metralhar Tudo", custo: 2 },
    espiao: { nome: "Drone Espião", habilidade: "Captação Térmica e de Áudio", custo: 2 },
    hacker: { nome: "Drone Hacker", habilidade: "Acelerar e Ocultar", custo: 2 },
    inteligente: { nome: "Drone Inteligente", habilidade: "Braços Articulados", custo: 2 },
    medico: { nome: "Drone Médico", habilidade: "Robô ao Resgate", custo: 2 },
    protetor: { nome: "Drone Protetor", habilidade: "Alerta de Ameaça", custo: 2 },
    utilitario: { nome: "Drone Utilitário", habilidade: "Meu Amigo Drone", custo: 3 },
  };
  var FORA_DO_UTILITARIO = ["fortitude", "luta", "pontaria", "reflexos", "vontade"];
  var ESTADOS_DRONE = ["ok", "danificado", "quebrado"];

  function dadosDoItem(item) { return I() ? I().dadosDoItem(item) : ((item && item.ordem) || {}); }
  function ehDrone(item) {
    if (!item) return false;
    if (item.origemCatalogoId === ID_DRONE) return true;
    var d = dadosDoItem(item);
    return (d.marcadores || []).indexOf("drone") >= 0;
  }
  function tipoDaModificacao(m) {
    var x = /^as9\.mod\.drone\.([a-z]+)$/.exec(String((m && m.catalogoId) || ""));
    return x && TIPOS_DRONE[x[1]] ? x[1] : "";
  }
  /* O resumo de um drone do inventário: tipos (o próprio e os das
     modificações), estado, a perícia do Utilitário, da trilha ou não. */
  function drone(item) {
    var d = dadosDoItem(item);
    var s = obj(d.as9);
    var tipos = [];
    if (TIPOS_DRONE[s.tipo]) tipos.push(s.tipo);
    var modsTrilha = 0, mods = 0;
    (d.modificacoes || []).forEach(function (m) {
      var t = tipoDaModificacao(m);
      if (!t) return;
      mods += 1;
      if (m.daTrilha) modsTrilha += 1;
      if (tipos.indexOf(t) < 0) tipos.push(t);
    });
    var categoria = Number(d.categoria) || 0;
    (d.modificacoes || []).forEach(function (m) { if (m.natureza === "maldicao" || !m.semAcrescimoDeCategoria) categoria += 1; });
    return {
      item: item, id: item && item.id, nome: (item && item.nome) || "Drone",
      tipos: tipos, tipo: TIPOS_DRONE[s.tipo] ? s.tipo : "", pericia: s.pericia || "", estado: ESTADOS_DRONE.indexOf(s.estado) >= 0 ? s.estado : "ok",
      daTrilha: s.daTrilha === true, segundo: s.segundo === true,
      modificacoes: mods, modificacoesDaTrilha: modsTrilha, categoria: Math.min(4, categoria),
      empunhado: !!d.empunhada, maosLivres: tipos.indexOf("inteligente") >= 0,
    };
  }
  function drones(inventario) {
    return ((inventario && inventario.itens) || []).filter(ehDrone).map(drone);
  }
  /* A habilidade do tipo exige operar com as duas mãos (o item
     empunhado), a não ser com o Drone Inteligente (comandos de voz). */
  function podeUsarHabilidade(dr) { return !!dr && dr.estado !== "quebrado" && (dr.empunhado || dr.maosLivres); }
  function habilidadesDisponiveis(inventario) {
    var saida = [];
    drones(inventario).forEach(function (dr) {
      if (!podeUsarHabilidade(dr)) return;
      dr.tipos.forEach(function (t) { saida.push({ drone: dr, tipo: t, nome: TIPOS_DRONE[t].habilidade, custo: TIPOS_DRONE[t].custo }); });
    });
    return saida;
  }
  function temHabilidade(inventario, tipo) { return habilidadesDisponiveis(inventario).some(function (h) { return h.tipo === tipo; }); }

  /* Piloto de Drone: quantas modificações a trilha dá por drone. */
  function marcoDoPiloto(ordem) {
    if (temPoder(ordem, "mestreDosDrones")) return 99;
    if (temPoder(ordem, "asDosDrones")) return 65;
    if (temPoder(ordem, "protetorDosDrones")) return 40;
    if (temPoder(ordem, "companheiroDrone")) return 10;
    return 0;
  }
  function limiteDaTrilha(ordem) {
    var m = marcoDoPiloto(ordem);
    if (m >= 99) return dados(ordem).drones.escolha99 === "segundo" ? 3 : (dados(ordem).drones.escolha99 === "seis" ? 6 : 3);
    if (m >= 65) return 3;
    if (m >= 40) return 1;
    return 0;
  }
  function custoParaEvitar(ordem) { return marcoDoPiloto(ordem) >= 99 ? 1 : 3; }
  function dronesDaTrilha(ordem, inventario) { return drones(inventario).filter(function (d) { return d.daTrilha; }); }
  /* Quantos drones a trilha entrega: 1; em 99%, 2 se a escolha for o
     segundo drone. */
  function dronesPermitidosPelaTrilha(ordem) {
    var m = marcoDoPiloto(ordem);
    if (!m) return 0;
    return m >= 99 && dados(ordem).drones.escolha99 === "segundo" ? 2 : 1;
  }
  function escolher99(ordem, escolha) {
    if (marcoDoPiloto(ordem) < 99) return falha("A escolha é de Mestre dos Drones (NEX 99%).");
    if (escolha !== "seis" && escolha !== "segundo") return falha("Escolha desconhecida.");
    dados(ordem).drones.escolha99 = escolha;
    return { ok: true };
  }
  function podeModificarPelaTrilha(ordem, inventario, item) {
    var dr = drone(item);
    if (!dr.daTrilha) return falha("Só o drone da trilha recebe as modificações de Piloto de Drone (os outros seguem o aumento normal de categoria).");
    var limite = limiteDaTrilha(ordem);
    if (!limite) return falha("As modificações da trilha começam em Protetor dos Drones (NEX 40%).");
    if (dr.modificacoesDaTrilha >= limite) return falha("Este drone já tem as " + limite + " modificações da trilha.");
    return { ok: true, restam: limite - dr.modificacoesDaTrilha };
  }

  /* Os bônus PASSIVOS dos drones (não quebrados), no formato dos
     modificadores de regras.js. As habilidades são da tela. */
  function m(fonte, detalhe, efeito) { return { fonte: fonte, detalhe: detalhe, efeito: efeito }; }
  function efeitosDosDrones(ordem, inventario) {
    var saida = [];
    drones(inventario).forEach(function (dr) {
      if (dr.estado === "quebrado") return;
      var nome = dr.nome;
      dr.tipos.forEach(function (t) {
        var f = TIPOS_DRONE[t].nome + " (" + nome + ")";
        var det = "Arquivos Secretos 9, p. " + (t === "atirador" ? 44 : 45);
        if (t === "atirador") saida.push(m(f, det + " · em testes de ataque (Luta e Pontaria)", { tipo: "dadosPericia", pericias: ["luta", "pontaria"], valor: 1, soAtaque: true }));
        if (t === "espiao") saida.push(m(f, det + " · quando o drone pode ajudar", { tipo: "dadosPericia", pericias: ["investigacao", "percepcao"], valor: 1 }));
        if (t === "hacker") saida.push(m(f, det + " · quando o drone pode ajudar", { tipo: "dadosPericia", pericias: ["tecnologia"], valor: 1 }));
        if (t === "medico") saida.push(m(f, det, { tipo: "treinadoPorAliado", pericias: ["medicina"], seJaTreinadoDados: 1 }));
        if (t === "protetor") saida.push(m(f, det, { tipo: "defesa", valor: 5 }));
        if (t === "utilitario" && dr.pericia) saida.push(m(f, det, { tipo: "dadosPericia", pericias: [dr.pericia], valor: 1 }));
      });
    });
    return saida;
  }

  function efeitos(ordem, inventario) {
    if (!ordem) return [];
    return efeitosDosDrones(ordem, inventario);
  }

  /* inventario.js chama ao normalizar os dados de Ordem de um item: só o
     que vale passa. */
  function normalizarDadosDoItem(destino, bruto) {
    var x = obj(bruto && bruto.as9);
    var s = {};
    if (TIPOS_DRONE[x.tipo]) s.tipo = x.tipo;
    var C0 = C();
    if (typeof x.pericia === "string" && FORA_DO_UTILITARIO.indexOf(x.pericia) < 0 && (!C0 || C0.pericia(x.pericia))) s.pericia = x.pericia;
    if (ESTADOS_DRONE.indexOf(x.estado) > 0) s.estado = x.estado;
    if (x.daTrilha === true) s.daTrilha = true;
    if (x.segundo === true) s.segundo = true;
    if (Object.keys(s).length || (bruto && bruto.as9 && typeof bruto.as9 === "object")) destino.as9 = s;
  }

  function definirDoDrone(item, campo, valor) {
    if (!item.ordem || typeof item.ordem !== "object") item.ordem = {};
    if (!item.ordem.as9 || typeof item.ordem.as9 !== "object") item.ordem.as9 = {};
    var s = item.ordem.as9;
    if (campo === "tipo") { if (!TIPOS_DRONE[valor]) return falha("Tipo de drone desconhecido."); s.tipo = valor; return { ok: true }; }
    if (campo === "pericia") {
      if (s.pericia) return falha("A perícia do Drone Utilitário, uma vez escolhida, não muda mais (p. 45).");
      if (FORA_DO_UTILITARIO.indexOf(valor) >= 0) return falha("O Drone Utilitário não vale para Fortitude, Luta, Pontaria, Reflexos nem Vontade.");
      if (C() && !C().pericia(valor)) return falha("Perícia desconhecida.");
      s.pericia = valor; return { ok: true };
    }
    if (campo === "estado") { if (ESTADOS_DRONE.indexOf(valor) < 0) return falha("Estado desconhecido."); if (valor === "ok") delete s.estado; else s.estado = valor; return { ok: true }; }
    return falha("Campo desconhecido.");
  }

  /* Metralhar Tudo: gasto no ataque, somado ao dano se acertar. */
  function armarMetralhar(ordem) { dados(ordem).drones.metralhar = chaveDaRodada(ordem); }
  function metralharPendente(ordem) { return dados(ordem).drones.metralhar === chaveDaRodada(ordem); }
  function usarMetralhar(ordem) { dados(ordem).drones.metralhar = ""; }

  /* =================================================================
     FULL METAL JACKET (Veterano de Conflito Armado, p. 38)
     ================================================================= */

  /* As penalidades numéricas de uma rolagem (parcelas negativas). */
  function penalidades(r) {
    return lista(r && r.parcelas).filter(function (p) { return typeof p.valor === "number" && p.valor < 0; });
  }

  global.RAMAOrdemArquivo9 = {
    ID_DRONE: ID_DRONE,
    TIPOS_DRONE: TIPOS_DRONE,
    FORA_DO_UTILITARIO: FORA_DO_UTILITARIO,
    normalizar: normalizar, vazio: vazio, dados: dados, jaFeito: jaFeito, registrarUso: registrarUso,
    cenaDe: cenaDe, emInterludio: emInterludio, temPoder: temPoder, grauDe: grauDe, liberado: liberado,
    dadosPelaTatica: dadosPelaTatica, planejar: planejar, planoDaCena: planoDaCena, dadosDeTatica: dadosDeTatica,
    planosComDados: planosComDados, gastarTatica: gastarTatica, aoComecarInterludio: aoComecarInterludio,
    bonusDaAnalise: bonusDaAnalise, analisar: analisar, analisarUsadoNaCena: analisarUsadoNaCena,
    municiar: municiar, espacosPoupados: espacosPoupados, ehMunicao: ehMunicao,
    marcarAlvo: marcarAlvo, limparAlvo: limparAlvo, efeitoDoAlvo: efeitoDoAlvo,
    protegerRefem: protegerRefem,
    armarRipostar: armarRipostar, ripostarPendente: ripostarPendente, usarRipostar: usarRipostar,
    ehDrone: ehDrone, drone: drone, drones: drones, podeUsarHabilidade: podeUsarHabilidade,
    habilidadesDisponiveis: habilidadesDisponiveis, temHabilidade: temHabilidade,
    marcoDoPiloto: marcoDoPiloto, limiteDaTrilha: limiteDaTrilha, custoParaEvitar: custoParaEvitar,
    dronesDaTrilha: dronesDaTrilha, dronesPermitidosPelaTrilha: dronesPermitidosPelaTrilha, escolher99: escolher99,
    podeModificarPelaTrilha: podeModificarPelaTrilha, tipoDaModificacao: tipoDaModificacao,
    efeitos: efeitos, efeitosDosDrones: efeitosDosDrones,
    normalizarDadosDoItem: normalizarDadosDoItem, definirDoDrone: definirDoDrone,
    armarMetralhar: armarMetralhar, metralharPendente: metralharPendente, usarMetralhar: usarMetralhar,
    penalidades: penalidades,
  };
})(typeof window !== "undefined" ? window : globalThis);
