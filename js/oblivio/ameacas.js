/* =====================================================================
   R.A.M.A. — Oblívio · motor das Ameaças
   =====================================================================
   Uma INSTÂNCIA de encontro é independente do catálogo: guarda os
   valores publicados no momento em que entrou e tudo o que aconteceu
   com ela (Estresse, regiões perdidas ou ganhas, Mutações, benefícios,
   marcas). O catálogo nunca é alterado.

   Valores publicados não são recalculados pelas fórmulas da Persona:
   Proteção, Dano, Velocidade e limite vêm da página (A1).

   Como na Persona, nada aqui sorteia sozinho nem anda com o relógio:
   as funções recebem o rolador e são chamadas pelos MOMENTOS da mesa.
   ===================================================================== */

(function (global) {
  "use strict";

  var D = global.RAMAOblivioAmeacas;
  var R = global.RAMAOblivio;
  var K = global.RAMAOblivioCombate;

  function ev(tipo, dados) { return R.evento(tipo, dados); }
  function hab(inst, chave) { return inst.habilidades.indexOf(chave) >= 0; }

  /* Regiões de uma Ameaça: o limite total dividido igualmente; a sobra
     vai para a primeira (A7). Só importa para Mirar e para perdas. */
  function dividirRegioes(limite, n, origem) {
    var lista = [];
    var cada = Math.max(1, Math.floor(limite / Math.max(1, n)));
    for (var i = 0; i < n; i++) lista.push({ id: R.novoId("rg"), limite: cada, estresse: 0, origem: origem || "base" });
    if (lista.length) lista[0].limite += Math.max(0, limite - cada * n);
    return lista;
  }

  /* criarInstancia(chave, rolador, opcoes) — opcoes.golfosExtras para a
     Amálgama formada por mais de 3 Golfos; opcoes.atributoExtra para
     onde vão os pontos (Carne/Força, preferencialmente). */
  function criarInstancia(chave, rolador, opcoes) {
    var cat = D.ameaca[chave];
    if (!cat) return null;
    var op = opcoes || {};
    var nRegioes = typeof cat.regioes === "number" ? cat.regioes : cat.regioes.base + R.rolarExpressao(cat.regioes.dado, rolador).total;
    var inst = {
      id: R.novoId("am"), chave: chave, nome: cat.nome, grau: cat.grau,
      atributos: R.copiar(cat.atributos), dano: cat.dano, protecao: cat.protecao, velocidade: cat.velocidade,
      limite: cat.limiteEstresse, estresse: 0,
      regioes: dividirRegioes(cat.limiteEstresse, nRegioes),
      habilidades: cat.habilidades.map(function (h) { return h.chave; }),
      especializacoes: cat.especializacoes.slice(),
      casas: Array.isArray(cat.casas) ? cat.casas[0] : cat.casas,
      estado: "ativa", mazelas: [], marcas: {}, usos: [], efeitos: [],
      mutacao: { pontos: 0, gastos: [] }, beneficios: [], derrotas: 0,
      danosNaRodada: 0, danosNaUltimaRodada: 0, cenaDeEntrada: op.cena || "",
      notas: [],
    };
    if (chave === "forca") {
      var corpos = nRegioes - 2;
      inst.corpos = [];
      for (var i = 0; i < corpos; i++) inst.corpos.push({ id: R.novoId("cp"), limite: cat.corpo.limiteEstresse, estresse: 0, protecao: cat.corpo.protecao });
      inst.regioes = dividirRegioes(cat.limiteEstresse, 2);
    }
    if (chave === "amalgamaGolfada" && op.golfosExtras) {
      var extra = R.inteiro(op.golfosExtras, 0, 99, 0);
      var bonus = cat.formacao.porAdicional;
      inst.limite += bonus.limiteEstresse * extra;
      for (var g = 0; g < extra; g++) {
        var atr = (op.atributosExtras && op.atributosExtras[g]) || bonus.atributosPreferidos[g % bonus.atributosPreferidos.length];
        inst.atributos[atr] = (inst.atributos[atr] || 0) + bonus.atributo;
        inst.regioes.push({ id: R.novoId("rg"), limite: bonus.limiteEstresse, estresse: 0, origem: "golfo" });
      }
      inst.notas.push("Formada por " + (3 + extra) + " Golfos.");
    }
    return inst;
  }

  /* Proteção completa da instância: publicada + corpos da Forca +
     benefícios do Coletor + Proteção Variável do Errante − reduções
     (Destruir Barreiras, Ponto Fraco). */
  function protecaoCompleta(inst, ctx) {
    var c = ctx || {};
    var partes = [{ fonte: "Publicada", valor: inst.protecao }];
    if (inst.corpos) partes.push({ fonte: "Corpos enforcados", valor: inst.corpos.filter(function (x) { return x.estresse < x.limite; }).length });
    inst.beneficios.forEach(function (b) { if (b.chave === "protecao") partes.push({ fonte: "Apropriação (+Proteção)", valor: b.valor }); });
    if (hab(inst, "protecaoVariavel")) {
      var n = R.inteiro(c.personasNaCena, 0, 99, 0);
      var modo = (c.ajustes && c.ajustes.errante) || "metade";
      var valor = n > 3 ? n : modo === "metade" ? R.metade(n) : modo === "zero" ? 0 : R.inteiro(c.bonusErranteTestemunha, 0, 99, 0);
      partes.push({ fonte: "Proteção Variável" + (n <= 3 ? " (3 ou menos: " + modo + ")" : ""), valor: valor });
    }
    inst.efeitos.forEach(function (e) { if (e.tipo === "protecao") partes.push({ fonte: e.fonte, valor: e.valor }); });
    if (inst.efeitos.some(function (e) { return e.tipo === "protecaoMetade"; })) {
      var t0 = partes.reduce(function (s, x) { return s + x.valor; }, 0);
      partes.push({ fonte: "Proteção pela metade (Golpe do Carrasco)", valor: -Math.ceil(t0 / 2) });
    }
    var total = partes.reduce(function (s, x) { return s + x.valor; }, 0);
    return { total: Math.max(0, total), partes: partes };
  }

  function danoAtual(inst) {
    var d = inst.dano;
    inst.beneficios.forEach(function (b) { if (b.chave === "dano") d += b.valor; });
    return d;
  }
  function velocidadeAtual(inst) {
    var v = inst.velocidade;
    inst.beneficios.forEach(function (b) { if (b.chave === "velocidade") v += b.valor; });
    return v;
  }
  function regioesVivas(inst) { return inst.regioes.filter(function (r) { return r.estresse < r.limite; }); }
  function folego(inst) { return R.metade(inst.atributos.carne + inst.atributos.determinacao); }

  /* ---------------------------------------------------------------
     SOFRER DANO
     opcoes: classe ("bomba"), corrompido, regiao (Mirar), pontoFraco
             (região analisada do Apogeu), muralha (Coletor: quantas
             regiões perder para reduzir), corpoACorpo, deCura (Patógeno)
     --------------------------------------------------------------- */

  function sofrerDano(inst, valor, opcoes, rolador) {
    var op = opcoes || {};
    var eventos = [];
    if (inst.estado !== "ativa") return { ok: false, motivo: inst.nome + " não está em combate.", eventos: [] };
    var v = R.inteiro(valor, 0, 9999, 0);
    if (hab(inst, "alemTumulo") && !op.corrompido) return { ok: true, valor: 0, eventos: [ev("imuneAoDano", { ameaca: inst.id, motivo: "Mortalha: só Equipamentos Corrompidos" })] };
    if (hab(inst, "forcaImparavel")) {
      if (op.classe === "bomba") { v *= 2; eventos.push(ev("multiplicado", { fonte: "Força Imparável (bomba)", x: 2 })); }
      else { v = Math.max(0, v - 5); eventos.push(ev("reduzido", { fonte: "Força Imparável", valor: 5 })); }
    }
    if (hab(inst, "couracaImpenetravel")) {
      if (op.regiao && op.pontoFraco && op.regiao === op.pontoFraco) { v *= 2; eventos.push(ev("multiplicado", { fonte: "Ponto fraco revelado", x: 2 })); }
      else { v = Math.floor(v / 2); eventos.push(ev("reduzido", { fonte: "Couraça Impenetrável", metade: true })); }
    }
    if (hab(inst, "muralhaDeCarne") && op.muralha) {
      var n = Math.min(R.inteiro(op.muralha, 0, 99, 0), regioesVivas(inst).length - 1);
      for (var i = 0; i < n; i++) { inst.regioes.pop(); v = Math.max(0, v - 7); }
      if (n) eventos.push(ev("muralha", { regioes: n, reduziu: 7 * n }));
    }
    if (!op.deCura) { inst.danosNaRodada++; }
    inst.estresse = Math.min(inst.limite, inst.estresse + v);
    if (op.regiao) {
      var reg = inst.regioes.filter(function (r) { return r.id === op.regiao; })[0];
      if (reg) reg.estresse = Math.min(reg.limite, reg.estresse + v);
    }
    eventos.push(ev("danoNaAmeaca", { ameaca: inst.id, valor: v, total: inst.estresse, limite: inst.limite }));
    /* Enxame e Horda perdem regiões com dano grande de uma vez (A8). */
    var cat = D.ameaca[inst.chave];
    if (cat.perdeRegioes && v > cat.perdeRegioes.acimaDe) {
      for (var j = 0; j < cat.perdeRegioes.perde && inst.regioes.length; j++) inst.regioes.pop();
      eventos.push(ev("ameacaPerdeRegiao", { ameaca: inst.id, perdeu: cat.perdeRegioes.perde, restam: inst.regioes.length }));
    }
    if (hab(inst, "apiceDaEvolucao") && op.ferida) inst.efeitos.push({ tipo: "semRegeneracao", ate: "fimDaPartida" });
    /* Mutação: algo que vise derrotá-lo rola 1D6 (4–6 = 1 ponto). */
    if (hab(inst, "mutacao") && rolador && v > 0) {
      var d = rolador(6);
      if (d >= 4) { inst.mutacao.pontos++; eventos.push(ev("mutacao", { ameaca: inst.id, d6: d, pontos: inst.mutacao.pontos })); }
      else eventos.push(ev("mutacaoFalhou", { ameaca: inst.id, d6: d }));
    }
    if (inst.estresse >= inst.limite || (cat.perdeRegioes && !inst.regioes.length)) eventos = eventos.concat(derrotar(inst, op).eventos);
    return { ok: true, valor: v, eventos: eventos };
  }

  /* Toque Corrosivo: quem acerta a Amálgama corpo a corpo sofre 4. */
  function reflexoDoAcerto(inst, opcoes) {
    var op = opcoes || {};
    if (hab(inst, "toqueCorrosivo") && op.corpoACorpo) return { dano: 4, fonte: "Toque Corrosivo" };
    return null;
  }

  /* ---------------------------------------------------------------
     DERROTA E RETORNOS
     --------------------------------------------------------------- */

  function derrotar(inst, opcoes) {
    var op = opcoes || {};
    var eventos = [];
    inst.derrotas++;
    if (inst.chave === "reiDosRatos" && inst.derrotas === 1 && !inst.virouEnxame) {
      /* Vida Longa ao Rei: vira Enxame; 3 rodadas para derrotá-lo. */
      inst.virouEnxame = { rodadas: 3, estresseAntes: inst.estresse };
      var enx = D.ameaca.enxame;
      inst.forma = "enxame";
      inst.limite = enx.limiteEstresse; inst.estresse = 0; inst.protecao = enx.protecao; inst.dano = enx.dano;
      inst.regioes = dividirRegioes(enx.limiteEstresse, enx.regioes);
      inst.habilidades = enx.habilidades.map(function (h) { return h.chave; }).concat(["vidaLongaAoRei"]);
      eventos.push(ev("transformacao", { ameaca: inst.id, em: "enxame", rodadas: 3 }));
      return { ok: true, eventos: eventos };
    }
    if (inst.virouEnxame) {
      inst.estado = "derrotada";
      eventos.push(ev("derrotada", { ameaca: inst.id, nome: inst.nome + " (Enxame do Rei)" }));
      return { ok: true, eventos: eventos };
    }
    inst.estado = "derrotada";
    eventos.push(ev("derrotada", { ameaca: inst.id, nome: inst.nome }));
    if (hab(inst, "regeneracaoMaldita")) {
      inst.retorno = { quando: "fimDaProximaCena", recupera: "metade", impedido: false };
      eventos.push(ev("retornoPendente", { ameaca: inst.id, impedirCom: ["combustivel", "bombaIncendiaria"] }));
    }
    if (hab(inst, "alemTumulo")) {
      inst.retorno = { quando: "fimDaProximaCena", recupera: "tudo", impedido: false };
      eventos.push(ev("retornoPendente", { ameaca: inst.id, impedirCom: ["vinculoCessado"] }));
    }
    if (hab(inst, "fimDeTodasAsCoisas")) {
      inst.retorno = { quando: "personaForaDeAcao", recupera: "tudo", impedido: false };
      eventos.push(ev("retornoPendente", { ameaca: inst.id, quando: "personaForaDeAcao" }));
    }
    if (hab(inst, "estrondoFinal")) {
      inst.explosao = { rodadas: 3 };
      eventos.push(ev("explosaoIminente", { ameaca: inst.id, rodadas: 3, tensao: { sucessos: 12, falha: "1d20+10" } }));
    }
    return { ok: true, eventos: eventos };
  }

  /* Impedir o retorno (destruir os restos com fogo, cessar o vínculo). */
  function impedirRetorno(inst, meio) {
    if (!inst.retorno) return { ok: false, motivo: "Nada a impedir." };
    var cat = D.ameaca[inst.chave];
    var h = cat.habilidades.filter(function (x) { return x.efeito && x.efeito.tipo === "retorno"; })[0];
    if (h && h.efeito.impedidoPor && h.efeito.impedidoPor.indexOf(meio) < 0 && !(meio === "fogo" && h.efeito.impedidoPor.indexOf("fogo") >= 0)) {
      return { ok: false, motivo: "Isso não impede o retorno de " + inst.nome + "." };
    }
    inst.retorno.impedido = true;
    return { ok: true, eventos: [ev("retornoImpedido", { ameaca: inst.id, meio: meio })] };
  }

  /* Fim de uma cena: as que deviam voltar "no fim da próxima cena"
     contam esta cena; na segunda, voltam (se não impedidas). */
  function fimDaCena(inst) {
    var eventos = [];
    if (inst.estado !== "derrotada" || !inst.retorno || inst.retorno.quando !== "fimDaProximaCena") return { eventos: eventos };
    if (inst.retorno.impedido) { inst.retorno = null; inst.estado = "destruida"; return { eventos: [ev("destruida", { ameaca: inst.id })] }; }
    if (!inst.retorno.cenasPassadas) { inst.retorno.cenasPassadas = 1; return { eventos: eventos }; }
    var rec = inst.retorno.recupera === "metade" ? R.metade(inst.limite) : inst.limite;
    inst.estresse = Math.max(0, inst.limite - rec);
    inst.estado = "ativa"; inst.retorno = null;
    eventos.push(ev("retornou", { ameaca: inst.id, estresse: inst.estresse }));
    return { eventos: eventos };
  }

  /* Uma Persona ficou Fora de Ação: a Forca volta. */
  function aoPersonaForaDeAcao(inst) {
    if (inst.estado === "derrotada" && inst.retorno && inst.retorno.quando === "personaForaDeAcao") {
      inst.estado = "ativa"; inst.estresse = 0; inst.retorno = null;
      return { eventos: [ev("retornou", { ameaca: inst.id, motivo: "Fim de Todas as Coisas" })] };
    }
    return { eventos: [] };
  }

  /* ---------------------------------------------------------------
     MOMENTOS
     --------------------------------------------------------------- */

  function fimDaRodada(inst, ctx) {
    var eventos = [];
    inst.danosNaUltimaRodada = inst.danosNaRodada;
    inst.danosNaRodada = 0;
    inst.efeitos = inst.efeitos.filter(function (e) { return e.ate !== "fimDaRodada"; });
    if (inst.estado === "ativa") {
      var regen = 0;
      if (hab(inst, "vidaLongaAoRei") && !inst.virouEnxame) regen += 8;
      if (hab(inst, "apiceDaEvolucao") && !inst.efeitos.some(function (e) { return e.tipo === "semRegeneracao"; })) regen += 7;
      if (inst.mutacao.gastos.indexOf("regeneracao") >= 0) regen += 4;
      inst.beneficios.forEach(function (b) { if (b.chave === "regeneracao") regen += 7; });
      if (regen && inst.estresse) {
        var x = Math.min(inst.estresse, regen);
        inst.estresse -= x;
        eventos.push(ev("regeneracao", { ameaca: inst.id, valor: x }));
      }
      if (inst.virouEnxame) {
        inst.virouEnxame.rodadas--;
        if (inst.virouEnxame.rodadas <= 0) {
          var rei = D.ameaca.reiDosRatos;
          inst.forma = ""; inst.limite = rei.limiteEstresse; inst.estresse = R.metade(rei.limiteEstresse);
          inst.protecao = rei.protecao; inst.dano = rei.dano;
          inst.regioes = dividirRegioes(rei.limiteEstresse, rei.regioes);
          inst.habilidades = rei.habilidades.map(function (h) { return h.chave; });
          inst.virouEnxame = null; inst.reiVoltou = true;
          eventos.push(ev("transformacao", { ameaca: inst.id, em: "reiDosRatos", estresse: inst.estresse }));
        }
      }
      if (inst.mutacao.gastos.indexOf("evolui") >= 0 && inst.chave === "mutageno") {
        var mut = inst.mutacao;
        var pat = criarInstancia("patogeno", function () { return 1; });
        Object.assign(inst, { chave: "patogeno", nome: pat.nome, grau: pat.grau, atributos: pat.atributos, dano: pat.dano, protecao: pat.protecao,
          velocidade: pat.velocidade, limite: pat.limite, regioes: pat.regioes, habilidades: pat.habilidades, especializacoes: pat.especializacoes, casas: pat.casas });
        inst.mutacao = { pontos: mut.pontos, gastos: mut.gastos.filter(function (g) { return g !== "evolui"; }) };
        eventos.push(ev("transformacao", { ameaca: inst.id, em: "patogeno", mantemMutacoes: true }));
      }
    }
    if (inst.explosao) {
      inst.explosao.rodadas--;
      if (inst.explosao.rodadas <= 0) { eventos.push(ev("explodiu", { ameaca: inst.id, dano: "1d20+10", sucessosParaEscapar: 12 })); inst.explosao = null; inst.estado = "destruida"; }
    }
    if (inst.golfoContagem !== undefined) {
      inst.golfoContagem--;
      if (inst.golfoContagem <= 0 && inst.estado === "ativa") { inst.estado = "destruida"; eventos.push(ev("destruida", { ameaca: inst.id, motivo: "A União Faz a Força não aconteceu" })); }
    }
    return { eventos: eventos };
  }

  /* ---------------------------------------------------------------
     COMPORTAMENTOS ESPECIAIS
     --------------------------------------------------------------- */

  /* A União Faz a Força (Golfo): 3+ Golfos ativos na cena viram uma
     Amálgama Golfada; os Golfos saem do encontro. */
  function unirGolfos(instancias, rolador) {
    var golfos = instancias.filter(function (i) { return i.chave === "golfo" && i.estado === "ativa"; });
    if (golfos.length < 3) return { ok: false, motivo: "Precisa de 3 ou mais Golfos na cena." };
    golfos.forEach(function (g) { g.estado = "unida"; });
    var am = criarInstancia("amalgamaGolfada", rolador, { golfosExtras: golfos.length - 3 });
    return { ok: true, nova: am, consumidas: golfos.map(function (g) { return g.id; }), eventos: [ev("uniao", { golfos: golfos.length, ameaca: am.id })] };
  }

  /* Sem conseguir unir: todos são destruídos no fim da próxima rodada. */
  function marcarGolfosSemUniao(instancias) {
    instancias.forEach(function (i) { if (i.chave === "golfo" && i.estado === "ativa" && i.golfoContagem === undefined) i.golfoContagem = 2; });
  }

  /* Gastar pontos de Mutação (Mutágeno; o Patógeno que veio dele mantém). */
  function gastarMutacao(inst, chave, param) {
    var cat = D.ameaca.mutageno;
    var b = cat.habilidades[0].efeito.beneficios.filter(function (x) { return x.chave === chave; })[0];
    if (!b) return { ok: false, motivo: "Benefício desconhecido." };
    if (inst.mutacao.pontos < b.custo) return { ok: false, motivo: "Precisa de " + b.custo + " pontos de Mutação." };
    inst.mutacao.pontos -= b.custo;
    inst.mutacao.gastos.push(chave);
    var p = param || {};
    if (chave === "atributo" && inst.atributos[p.atributo] !== undefined) inst.atributos[p.atributo]++;
    if (chave === "regiao") inst.regioes.push({ id: R.novoId("rg"), limite: Math.max(1, Math.floor(inst.limite / Math.max(1, inst.regioes.length))), estresse: 0, origem: "mutacao" });
    if (chave === "imunidade") inst.efeitos.push({ tipo: "imunidade", habilidade: R.copiar(p.habilidade) || "", persona: p.persona || "" });
    return { ok: true, eventos: [ev("mutacaoGasta", { ameaca: inst.id, beneficio: b.texto })] };
  }

  /* Benefícios da Apropriação Forçada (Coletor), até 3 na cena. */
  function beneficioDaApropriacao(inst, chave, rolador) {
    if (inst.beneficios.length >= 3) return { ok: false, motivo: "Máximo de 3 benefícios." };
    var tab = { velocidade: "1d6", protecao: "1d4", dano: "1d2" };
    var valor = tab[chave] ? R.rolarExpressao(tab[chave], rolador).total : 1;
    inst.beneficios.push({ chave: chave, valor: valor, ate: "fimDaCena" });
    return { ok: true, valor: valor, eventos: [ev("beneficio", { ameaca: inst.id, chave: chave, valor: valor })] };
  }

  /* Muralhas de Carne e invocações por regiões (Coletor, Horda, Rei). */
  function trocarRegioesPor(inst, chaveCriada, rolador) {
    var custo = { carcaca: 2, enxame: 3 }[chaveCriada];
    if (chaveCriada === "muralha") custo = 1;
    if (!custo) return { ok: false, motivo: "Não pode criar isso." };
    if (regioesVivas(inst).length <= custo) return { ok: false, motivo: "Regiões insuficientes." };
    for (var i = 0; i < custo; i++) inst.regioes.pop();
    if (chaveCriada === "muralha") {
      var mur = { id: R.novoId("am"), chave: "muralha", nome: "Muralha de Carne", grau: 0, atributos: { carne: 0, forca: 0, fuga: 0, determinacao: 0, mente: 0 },
        dano: 0, protecao: 1, velocidade: 0, limite: 5, estresse: 0, regioes: dividirRegioes(5, 1), habilidades: [], especializacoes: [], casas: 1, estado: "ativa",
        mazelas: [], marcas: {}, usos: [], efeitos: [], mutacao: { pontos: 0, gastos: [] }, beneficios: [], derrotas: 0, danosNaRodada: 0, danosNaUltimaRodada: 0, notas: ["Do Coletor"], invocadaPor: inst.id };
      return { ok: true, nova: mur, eventos: [ev("invocada", { por: inst.id, chave: "muralha" })] };
    }
    var nova = criarInstancia(chaveCriada, rolador);
    nova.invocadaPor = inst.id;
    return { ok: true, nova: nova, eventos: [ev("invocada", { por: inst.id, chave: chaveCriada })] };
  }

  /* Incorporar regiões de uma Persona devorada (Horda, Rei, Enxame). */
  function incorporarRegioes(inst, quantas) {
    var n = R.inteiro(quantas, 0, 20, 0);
    for (var i = 0; i < n; i++) inst.regioes.push({ id: R.novoId("rg"), limite: Math.max(1, Math.floor(inst.limite / Math.max(1, inst.regioes.length))), estresse: 0, origem: "devorada" });
    return { eventos: [ev("regioesIncorporadas", { ameaca: inst.id, n: n })] };
  }

  /* Recuperar Estresse (Sede de Sangue do Errante, Amedrontar…). */
  function recuperar(inst, valor) {
    var x = Math.min(inst.estresse, R.inteiro(valor, 0, 9999, 0));
    inst.estresse -= x;
    return { eventos: [ev("regeneracao", { ameaca: inst.id, valor: x })] };
  }

  /* Quimera (p. 137): 3 Ameaças componentes e uma habilidade de cada,
     mais Decifra-me ou Te Devoro. Sem o capítulo "Ameaças de Jogo", o
     resto da ficha é a publicada (lacuna registrada). */
  function montarQuimera(componentes, rolador) {
    var lista = (componentes || []).filter(function (c) { return c && D.ameaca[c.ameaca] && c.ameaca !== "quimera"; });
    if (lista.length !== 3) return { ok: false, motivo: "Escolha 3 Ameaças e uma habilidade de cada." };
    var habs = [];
    for (var i = 0; i < 3; i++) {
      var ok = D.ameaca[lista[i].ameaca].habilidades.some(function (h) { return h.chave === lista[i].habilidade; });
      if (!ok) return { ok: false, motivo: "A habilidade escolhida não é de " + D.ameaca[lista[i].ameaca].nome + "." };
      habs.push(lista[i].habilidade);
    }
    var q = criarInstancia("quimera", rolador);
    habs.forEach(function (h) { if (q.habilidades.indexOf(h) < 0) q.habilidades.push(h); });
    q.componentes = lista.map(function (c) { return { ameaca: c.ameaca, habilidade: c.habilidade }; });
    q.notas.push("Montada de " + lista.map(function (c) { return D.ameaca[c.ameaca].nome; }).join(", ") + ". Sem o capítulo \"Ameaças de Jogo\", o resto é a ficha publicada.");
    return { ok: true, nova: q };
  }

  /* ---------------------------------------------------------------
     ATAQUE DA AMEAÇA
     --------------------------------------------------------------- */

  /* Os dados da Ameaça: uma região viva por dado, até 5 (A9). bonus:
     Guardas! (+1 por Enxame), Decreto Real contra o alvo, obstáculos. */
  function rolarAtaque(inst, opcoes, rolador) {
    var op = opcoes || {};
    var vivas = regioesVivas(inst);
    var n = Math.max(1, Math.min(5, R.inteiro(op.dados || vivas.length, 1, 5, 1), vivas.length || 1));
    var dif = K.combinarDificuldade(op.dificuldade || "normal", op.passos || []);
    var dados = [];
    for (var i = 0; i < n; i++) {
      var f = [rolador(20)];
      var usado = f[0];
      if (op.alvoNoChao) { f.push(rolador(20)); usado = Math.max(f[0], f[1]); }
      var total = usado + R.inteiro(op.bonus, -99, 99, 0);
      var res = K.classificarD20(total, dif, 0);
      dados.push({ regiao: vivas[i] ? vivas[i].id : "", faces: f, usado: usado, total: total, resultado: res, sucessos: K.sucessosDe(res) });
    }
    var sucessos = dados.reduce(function (s, d) { return s + d.sucessos; }, 0);
    /* As falhas também cansam a Ameaça (mesma regra do teste, A9). */
    var falha = dados.reduce(function (s, d) { return s + (d.sucessos ? 0 : (d.resultado === "falhaExtrema" ? 2 : 1)); }, 0);
    if (falha) inst.estresse = Math.min(inst.limite, inst.estresse + falha);
    return { dados: dados, sucessos: sucessos, extremos: dados.filter(function (d) { return d.resultado === "sucessoExtremo"; }).length, estresseDasFalhas: falha, dificuldade: dif };
  }

  function danoDaHabilidade(inst, chaveHabilidade, rolador, extras) {
    var cat = D.ameaca[inst.chave] || {};
    var h = (cat.habilidades || []).concat(Object.keys(D.ameaca).reduce(function (s, k) { return s.concat(D.ameaca[k].habilidades); }, []))
      .filter(function (x) { return x.chave === chaveHabilidade; })[0];
    if (!h || !h.dano) return { total: 0, faces: [] };
    var expr = h.dano;
    var r = R.rolarExpressao(expr, rolador);
    var total = r.total + R.inteiro(extras, -99, 999, 0);
    inst.beneficios.forEach(function (b) { if (b.chave === "dano") total += b.valor; });
    return { total: total, faces: r.faces, expressao: expr };
  }

  /* Recompensa (tabela de 1D6 da Ameaça). Item fora do catálogo vira
     escolha da Testemunha (lacuna), nunca um item inventado. */
  function recompensa(chave, rolador) {
    var cat = D.ameaca[chave];
    if (!cat) return { itens: [] };
    var d = rolador(6);
    var linha = cat.recompensa.filter(function (x) { return d >= x.de && d <= x.ate; })[0];
    return { d6: d, itens: linha ? R.copiar(linha.itens) : [] };
  }

  global.RAMAOblivioMotorAmeacas = {
    criarInstancia: criarInstancia, protecaoCompleta: protecaoCompleta, danoAtual: danoAtual, velocidadeAtual: velocidadeAtual,
    regioesVivas: regioesVivas, folego: folego, sofrerDano: sofrerDano, reflexoDoAcerto: reflexoDoAcerto,
    derrotar: derrotar, impedirRetorno: impedirRetorno, fimDaCena: fimDaCena, aoPersonaForaDeAcao: aoPersonaForaDeAcao,
    fimDaRodada: fimDaRodada, unirGolfos: unirGolfos, marcarGolfosSemUniao: marcarGolfosSemUniao,
    gastarMutacao: gastarMutacao, beneficioDaApropriacao: beneficioDaApropriacao, trocarRegioesPor: trocarRegioesPor,
    incorporarRegioes: incorporarRegioes, recuperar: recuperar, montarQuimera: montarQuimera,
    rolarAtaque: rolarAtaque, danoDaHabilidade: danoDaHabilidade, recompensa: recompensa,
  };
})(typeof window !== "undefined" ? window : globalThis);
