/* =====================================================================
   R.A.M.A. — Ordem Paranormal · munição e componentes ritualísticos
   =====================================================================
   Duas regras opcionais, cada uma com a sua chave (js/ordem/opcionais.js)
   e desligadas em toda ficha antiga:

     contagemMunicao        Ordem Paranormal RPG, p. 174 ("Contagem de
                            Munição"), com Sobrevivendo ao Horror, p. 37-38
     controleComponentes    o controle, pela mesa, dos componentes
                            ritualísticos (OPRPG p. 66 e 119; catalisadores,
                            SAH p. 44; Conjuração Complexa, SAH p. 115)

   Sem tela e sem rede: a aba Geral mostra, o ataque e "Usar ritual"
   confirmam, e o que é gasto é gravado na ficha pelo salvador de
   sempre. Desligar a regra não apaga nada — os saldos ficam guardados.

   ---------------------------------------------------------------------
   MUNIÇÃO: UM SALDO SÓ, NO INVENTÁRIO
   ---------------------------------------------------------------------

   A reserva é o PRÓPRIO item de munição do inventário: `quantidade`
   pacotes, cada um com munição para `porPacote` ataques (20; foguete,
   1), menos `retiradas` — o que já saiu dos pacotes. Não existe um
   segundo contador de munição em lugar nenhum. O que está CARREGADO mora
   na arma (`contagem.carregada`), e já saiu da reserva: recarregar tira
   da reserva e põe na arma; atirar tira da arma. A mesma bala nunca é
   descontada duas vezes.

   Arma de fogo tem capacidade (a tabela da p. 174 e da SAH p. 38) e
   atira do que está carregado. Arma sem capacidade (arco, besta,
   lança-chamas, bazuca) atira direto da reserva.

   Rajada gasta 10 balas e, nesta regra, causa +2 dados de dano em vez
   de +1 (p. 174); o ataque de rajada continua com −1 dado (p. 59).
   Espingarda de cano duplo disparando os dois canos gasta 2 cartuchos,
   com −1 dado e dano 6d6 (SAH p. 37).

   ---------------------------------------------------------------------
   COMPONENTES: O LIVRO DIZ "TER", NÃO "GASTAR"
   ---------------------------------------------------------------------

   Conjurar exige manipular componentes do elemento do ritual, exceto
   rituais de Medo (OPRPG p. 119); a afinidade dispensa os componentes
   do elemento (p. 114). O livro não diz que conjurar gasta os
   componentes — então, pela regra, eles se TÊM ou não se têm. Gastam-se:
   o catalisador (SAH p. 44, "consumido ao ser usado") e, com
   Conjuração Complexa, os componentes que a pessoa ESCOLHE entregar à
   entidade em troca de +1 dado no teste de Ocultismo (SAH p. 115).

   Uma mesa que quiser contar usos escolhe o modo "quantidade", diz a
   unidade e quanto cada uso gasta — e a ficha mostra que isso é regra
   da mesa, não do livro.

   ---------------------------------------------------------------------
   CADA USO TEM UM ID
   ---------------------------------------------------------------------

   O ataque ou o uso de ritual confirmado leva um id de operação, e o
   registro (`ordem.consumos`) guarda os últimos. O mesmo id chegando de
   novo — clique repetido, resposta perdida, a mesma ficha em duas abas
   conciliada — não desconta de novo.
   ===================================================================== */

(function (global) {
  "use strict";

  var MAX_REGISTROS = 100;
  var MAX_POR_PACOTE = 999;
  var MAX_RETIRADAS = 99999;
  var POR_PACOTE_PADRAO = 20;
  var BALAS_DA_RAJADA = 10;

  function I() { return global.RAMAOrdemInventario || null; }
  function OP() { return global.RAMAOrdemOpcionais || null; }
  function RT() { return global.RAMAOrdemRituais || null; }
  function U() { return global.RAMAUtil || null; }

  function uuid() {
    if (U() && U().uuid) return U().uuid();
    return "x" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function agora() { return new Date().toISOString(); }

  function inteiro(v, min, max, padrao) {
    var n = Math.round(Number(v));
    if (!isFinite(n)) return padrao;
    return Math.max(min, Math.min(max, n));
  }

  function texto(v, limite) { return String(v === undefined || v === null ? "" : v).slice(0, limite || 80); }

  function chaveDeBusca(v) {
    var s = texto(v, 120).toLowerCase();
    if (s.normalize) s = s.normalize("NFD").replace(/[̀-ͯ]/g, "");
    return s.replace(/\s+/g, " ").trim();
  }

  function idValido(v) {
    var s = texto(v, 160);
    return /^[A-Za-z0-9_.:|#-]{1,160}$/.test(s) ? s : "";
  }

  /* =================================================================
     AS TABELAS
     ================================================================= */

  /* Ataques por pacote, com a regra (OPRPG p. 174; SAH p. 37). */
  var POR_PACOTE = {
    "op.municao.balas-curtas": 20, "op.municao.balas-longas": 20, "op.municao.cartuchos": 20,
    "op.municao.combustivel": 20, "op.municao.flechas": 20, "op.municao.foguete": 1,
    "op.municao.dardos": 2, "sah.municao.bolinhas": 20,
  };

  /* Capacidade das armas que não trazem o número do catálogo — itens
     criados antes dele, ou à mão com o nome do livro (OPRPG p. 174; SAH
     p. 38). */
  var CAPACIDADE_POR_NOME = {
    "pistola": 12, "revolver": 6, "fuzil de caca": 4, "submetralhadora": 20, "espingarda": 6,
    "fuzil de assalto": 30, "fuzil de precisao": 1, "metralhadora": 50,
    "espingarda de cano duplo": 2, "pistola pesada": 10, "revolver compacto": 5,
  };

  var CANO_DUPLO = "sah.arma.espingarda-cano-duplo";

  /* =================================================================
     NORMALIZAÇÃO (chamada por js/ordem/inventario.js)
     ================================================================= */

  function contagemValida(bruto, tipo, grupo) {
    if (!bruto || typeof bruto !== "object") return null;
    if (tipo === "arma") {
      var saida = {};
      var municao = idValido(bruto.municao);
      if (municao) saida.municao = municao;
      var carregada = inteiro(bruto.carregada, 0, 999, 0);
      if (carregada) saida.carregada = carregada;
      var capacidade = inteiro(bruto.capacidade, 0, 999, 0);
      if (capacidade) saida.capacidade = capacidade;
      return Object.keys(saida).length ? saida : null;
    }
    if (grupo === "municao") {
      var s = {};
      var porPacote = inteiro(bruto.porPacote, 0, MAX_POR_PACOTE, 0);
      if (porPacote) s.porPacote = porPacote;
      var retiradas = inteiro(bruto.retiradas, 0, MAX_RETIRADAS, 0);
      if (retiradas) s.retiradas = retiradas;
      return Object.keys(s).length ? s : null;
    }
    return null;
  }

  /* O bloco de componentes (`ordem.componentes`) e o registro de usos. */
  var ELEMENTOS = ["sangue", "morte", "conhecimento", "energia"];
  var NOMES_ELEMENTOS = { sangue: "Sangue", morte: "Morte", conhecimento: "Conhecimento", energia: "Energia", medo: "Medo" };

  function normalizarControle(bruto) {
    var b = (bruto && typeof bruto === "object") ? bruto : {};
    var e = (b.elementos && typeof b.elementos === "object") ? b.elementos : {};
    var elementos = {};
    ELEMENTOS.forEach(function (k) { elementos[k] = normalizarElemento(e[k]); });
    var vistos = {};
    var extras = (Array.isArray(b.extras) ? b.extras : []).map(function (x) {
      if (!x || typeof x !== "object") return null;
      var id = idValido(x.id);
      var nome = texto(x.nome, 60).trim();
      if (!id || !nome || vistos[id]) return null;
      vistos[id] = true;
      return Object.assign({ id: id, nome: nome }, normalizarElemento(x));
    }).filter(Boolean).slice(0, 12);
    return { elementos: elementos, extras: extras };
  }

  function normalizarElemento(bruto) {
    var b = (bruto && typeof bruto === "object") ? bruto : {};
    return {
      modo: b.modo === "quantidade" ? "quantidade" : "posse",
      tem: b.tem === true,
      quantidade: inteiro(b.quantidade, 0, 9999, 0),
      unidade: texto(b.unidade, 30).trim() || "usos",
      porUso: inteiro(b.porUso, 1, 99, 1),
    };
  }

  function normalizarRegistros(lista) {
    var vistos = {};
    return (Array.isArray(lista) ? lista : []).map(function (x) {
      if (!x || typeof x !== "object") return null;
      var id = idValido(x.id);
      if (!id || vistos[id]) return null;
      vistos[id] = true;
      return {
        id: id,
        tipo: ["ataque", "recarga", "ritual", "ajuste", "reposicao"].indexOf(x.tipo) >= 0 ? x.tipo : "ajuste",
        em: typeof x.em === "string" ? x.em.slice(0, 40) : "",
        resumo: texto(x.resumo, 200),
      };
    }).filter(Boolean).slice(-MAX_REGISTROS);
  }

  function jaFeito(ordem, opId) {
    return !!opId && (ordem.consumos || []).some(function (x) { return x.id === opId; });
  }

  function registrar(ordem, opId, tipo, resumo, quando) {
    if (!Array.isArray(ordem.consumos)) ordem.consumos = [];
    ordem.consumos.push({ id: opId || "c-" + uuid(), tipo: tipo, em: quando || agora(), resumo: texto(resumo, 200) });
    if (ordem.consumos.length > MAX_REGISTROS) ordem.consumos = ordem.consumos.slice(-MAX_REGISTROS);
  }

  /* =================================================================
     MUNIÇÃO
     ================================================================= */

  function dados(item) { return I() ? I().dadosDoItem(item) : ((item && item.ordem) || {}); }

  function ehMunicao(item) {
    if (!item) return false;
    var d = dados(item);
    return d.grupo === "municao" || /^(op|sah)\.municao\./.test(item.origemCatalogoId || "");
  }

  function porPacote(item) {
    var d = dados(item);
    if (d.contagem && d.contagem.porPacote) return d.contagem.porPacote;
    if (item && POR_PACOTE[item.origemCatalogoId]) return POR_PACOTE[item.origemCatalogoId];
    return POR_PACOTE_PADRAO;
  }

  /* Quanto há na reserva: pacotes × por pacote − o que já saiu. */
  function reserva(item) {
    var d = dados(item);
    var total = (d.quantidade || 1) * porPacote(item) - ((d.contagem && d.contagem.retiradas) || 0);
    return Math.max(0, total);
  }

  function pacotesVazios(item) {
    var d = dados(item);
    var ret = (d.contagem && d.contagem.retiradas) || 0;
    return Math.min(d.quantidade || 1, Math.floor(ret / porPacote(item)));
  }

  function usaMunicao(arma) {
    if (!arma || arma.tipo !== "arma") return false;
    var a = dados(arma).arma || {};
    if (a.semMunicao || a.desarmado) return false;
    if (a.tipo === "fogo" || a.tipo === "disparo") return true;
    if (a.tipo === "distancia" && !a.arremessavel) return true;
    return !!(dados(arma).contagem && dados(arma).contagem.municao);
  }

  function capacidade(arma) {
    var d = dados(arma);
    if (d.contagem && d.contagem.capacidade) return d.contagem.capacidade;
    if (d.arma && d.arma.capacidade) return d.arma.capacidade;
    var porNome = CAPACIDADE_POR_NOME[chaveDeBusca(arma && arma.nome)];
    if (porNome && d.arma && d.arma.tipo === "fogo") return porNome;
    return 0;
  }

  function carregada(arma) {
    var d = dados(arma);
    return (d.contagem && d.contagem.carregada) || 0;
  }

  /* A munição associada: a escolhida; senão, uma do inventário com o
     nome que o catálogo deu à arma. Nunca adivinha entre duas. */
  function municaoDaArma(inventario, arma) {
    var itens = (inventario && inventario.itens) || [];
    var d = dados(arma);
    if (d.contagem && d.contagem.municao) {
      var escolhida = itens.filter(function (i) { return i && i.id === d.contagem.municao; })[0];
      if (escolhida) return { item: escolhida, sugerida: false };
    }
    var bruto = d.arma && d.arma.municao ? String(d.arma.municao) : "";
    var nome = chaveDeBusca(bruto);
    if (!nome) return { item: null, sugerida: false };
    /* O catálogo grava o NOME da munição; sem o catálogo carregado, fica
       o id dele — as duas formas casam. */
    var candidatas = itens.filter(function (i) {
      return ehMunicao(i) && (chaveDeBusca(i.nome) === nome || (i.origemCatalogoId && i.origemCatalogoId === bruto));
    });
    return candidatas.length === 1 ? { item: candidatas[0], sugerida: true } : { item: null, sugerida: false, candidatas: candidatas.length };
  }

  function contagemDe(item) {
    if (!item.ordem || typeof item.ordem !== "object") item.ordem = {};
    if (!item.ordem.contagem || typeof item.ordem.contagem !== "object") item.ordem.contagem = {};
    return item.ordem.contagem;
  }

  /* Tira `n` da reserva de um item de munição. */
  function tirarDaReserva(item, n) {
    var c = contagemDe(item);
    c.retiradas = (c.retiradas || 0) + n;
  }

  /* modo: "unico" | "rajada" | "doisCanos". Devolve o que o ataque vai
     gastar e o saldo depois — sem mexer em nada. */
  function planoDeAtaque(inventario, arma, modo) {
    var d = dados(arma);
    var a = d.arma || {};
    var m = modo || "unico";
    if (m === "rajada" && !a.automatica) return { ok: false, motivo: "Só armas automáticas disparam rajadas (OPRPG p. 59)." };
    if (m === "doisCanos" && arma.origemCatalogoId !== CANO_DUPLO) return { ok: false, motivo: "Só a espingarda de cano duplo dispara os dois canos." };
    var gasto = m === "rajada" ? BALAS_DA_RAJADA : (m === "doisCanos" ? 2 : 1);
    var achada = municaoDaArma(inventario, arma);
    var cap = capacidade(arma);
    var plano = {
      ok: true, modo: m, gasto: gasto, municao: achada.item, sugerida: achada.sugerida,
      capacidade: cap, deOnde: cap ? "carregada" : "reserva",
      rajada: m === "rajada", doisCanos: m === "doisCanos",
    };
    if (cap) {
      plano.antes = carregada(arma);
      plano.depois = plano.antes - gasto;
      if (plano.depois < 0) {
        plano.ok = false;
        plano.motivo = plano.antes
          ? "Faltam balas carregadas: há " + plano.antes + ", " + (m === "rajada" ? "a rajada gasta " : "o ataque gasta ") + gasto + "."
          : "A arma está descarregada.";
        plano.acao = achada.item && reserva(achada.item) > 0 ? "recarregar" : (achada.item ? "semMunicao" : "associar");
      }
      return plano;
    }
    if (!achada.item) {
      plano.ok = false;
      plano.motivo = "Nenhuma munição associada a esta arma. Associe um item de munição do inventário.";
      plano.acao = "associar";
      return plano;
    }
    plano.antes = reserva(achada.item);
    plano.depois = plano.antes - gasto;
    if (plano.depois < 0) {
      plano.ok = false;
      plano.motivo = "A munição acabou: há " + plano.antes + " na reserva.";
      plano.acao = "semMunicao";
    }
    return plano;
  }

  /* Aplica o gasto de um ataque confirmado. Nunca deixa saldo negativo;
     o mesmo id não gasta duas vezes. */
  function aplicarAtaque(ordem, inventario, arma, plano, opId, quando) {
    if (jaFeito(ordem, opId)) return { ok: true, repetido: true };
    if (!plano || !plano.ok) return { ok: false, motivo: (plano && plano.motivo) || "Ataque sem munição." };
    var novo = planoDeAtaque(inventario, arma, plano.modo);
    if (!novo.ok) return novo;
    if (novo.deOnde === "carregada") {
      contagemDe(arma).carregada = novo.depois;
    } else {
      tirarDaReserva(novo.municao, novo.gasto);
    }
    registrar(ordem, opId, "ataque", arma.nome + ": " + novo.gasto + (novo.gasto === 1 ? " disparo" : " disparos") +
      (novo.rajada ? " (rajada)" : "") + (novo.doisCanos ? " (dois canos)" : "") + " · sobram " + novo.depois +
      (novo.deOnde === "carregada" ? " carregadas" : " na reserva"), quando);
    return { ok: true, plano: novo };
  }

  function planoDeRecarga(inventario, arma) {
    var cap = capacidade(arma);
    if (!cap) return { ok: false, motivo: "Esta arma não tem carregador: ela atira direto da reserva." };
    var achada = municaoDaArma(inventario, arma);
    if (!achada.item) return { ok: false, motivo: "Nenhuma munição associada a esta arma.", acao: "associar" };
    var atual = carregada(arma);
    var falta = cap - atual;
    if (falta <= 0) return { ok: false, motivo: "A arma já está carregada (" + atual + " de " + cap + ")." };
    var tem = reserva(achada.item);
    if (!tem) return { ok: false, motivo: "Não há " + achada.item.nome.toLowerCase() + " na reserva.", acao: "semMunicao" };
    var quanto = Math.min(falta, tem);
    return {
      ok: true, municao: achada.item, quanto: quanto, capacidade: cap,
      carregadaAntes: atual, carregadaDepois: atual + quanto, reservaAntes: tem, reservaDepois: tem - quanto,
      incompleta: quanto < falta,
    };
  }

  function recarregar(ordem, inventario, arma, opId, quando) {
    if (jaFeito(ordem, opId)) return { ok: true, repetido: true };
    var p = planoDeRecarga(inventario, arma);
    if (!p.ok) return p;
    tirarDaReserva(p.municao, p.quanto);
    contagemDe(arma).carregada = p.carregadaDepois;
    if (!contagemDe(arma).municao) contagemDe(arma).municao = p.municao.id;
    registrar(ordem, opId, "recarga", arma.nome + ": recarregou " + p.quanto + " (" + p.carregadaDepois + " de " + p.capacidade + ")", quando);
    return { ok: true, plano: p };
  }

  function associar(arma, municaoId) {
    var c = contagemDe(arma);
    if (c.municao === municaoId) return { mudou: false };
    c.municao = municaoId || undefined;
    if (!municaoId) delete c.municao;
    return { mudou: true };
  }

  /* Repor: pacotes novos entram no mesmo item. */
  function repor(ordem, item, pacotes, opId) {
    if (jaFeito(ordem, opId)) return { ok: true, repetido: true };
    var n = inteiro(pacotes, 1, 999, 0);
    if (!n) return { ok: false, motivo: "Informe quantos pacotes." };
    if (!item.ordem || typeof item.ordem !== "object") item.ordem = {};
    item.ordem.quantidade = Math.min(999, (dados(item).quantidade || 1) + n);
    registrar(ordem, opId, "reposicao", item.nome + ": +" + n + " pacote(s)");
    return { ok: true };
  }

  /* Ajuste à mão: fixa o saldo da reserva sem mudar os pacotes. */
  function ajustarReserva(ordem, item, novoSaldo, opId) {
    var alvo = inteiro(novoSaldo, 0, MAX_RETIRADAS, -1);
    if (alvo < 0) return { ok: false, motivo: "Informe um número inteiro a partir de 0." };
    var total = (dados(item).quantidade || 1) * porPacote(item);
    if (alvo > total) return { ok: false, motivo: "Com " + (dados(item).quantidade || 1) + " pacote(s), cabem no máximo " + total + ". Reponha pacotes antes." };
    contagemDe(item).retiradas = total - alvo;
    registrar(ordem, opId, "ajuste", item.nome + ": reserva ajustada para " + alvo);
    return { ok: true };
  }

  function ajustarCarregada(ordem, arma, n, opId) {
    var cap = capacidade(arma);
    var alvo = inteiro(n, 0, 999, -1);
    if (alvo < 0 || (cap && alvo > cap)) return { ok: false, motivo: "De 0 a " + cap + "." };
    contagemDe(arma).carregada = alvo;
    registrar(ordem, opId, "ajuste", arma.nome + ": carregadas ajustadas para " + alvo);
    return { ok: true };
  }

  /* Descarta os pacotes que já se esvaziaram. */
  function descartarVazios(item) {
    var vazios = pacotesVazios(item);
    var d = dados(item);
    if (!vazios || vazios >= (d.quantidade || 1)) {
      if (vazios && vazios >= (d.quantidade || 1)) return { ok: false, motivo: "Todos os pacotes estão vazios: tire o item do inventário, se quiser." };
      return { ok: false, motivo: "Nenhum pacote vazio." };
    }
    item.ordem.quantidade = d.quantidade - vazios;
    contagemDe(item).retiradas = (contagemDe(item).retiradas || 0) - vazios * porPacote(item);
    return { ok: true, vazios: vazios };
  }

  /* =================================================================
     COMPONENTES E "USAR RITUAL"
     ================================================================= */

  function itensDeComponentes(inventario, elemento) {
    var nome = NOMES_ELEMENTOS[elemento] ? chaveDeBusca(NOMES_ELEMENTOS[elemento]) : chaveDeBusca(elemento);
    return ((inventario && inventario.itens) || []).filter(function (i) {
      if (!i) return false;
      var d = dados(i);
      var eComponente = i.origemCatalogoId === "op.paranormal.componentes" || /componentes? ritual/.test(chaveDeBusca(i.nome));
      if (!eComponente) return false;
      return d.elemento === elemento || chaveDeBusca(i.nome).indexOf(nome) >= 0;
    });
  }

  function catalisadores(inventario, elemento) {
    return ((inventario && inventario.itens) || []).filter(function (i) {
      if (!i) return false;
      var d = dados(i);
      var eCatalisador = /^sah\.paranormal\.catalisador/.test(i.origemCatalogoId || "") || /catalisador/.test(chaveDeBusca(i.nome));
      return eCatalisador && (!elemento || !d.elemento || d.elemento === elemento);
    });
  }

  /* O estado de um elemento: tem pelo inventário, pela marca à mão ou
     pela quantidade da mesa. */
  function situacaoDoElemento(controle, inventario, elemento) {
    var c = (controle && controle.elementos && controle.elementos[elemento]) || normalizarElemento(null);
    var itens = itensDeComponentes(inventario, elemento);
    if (c.modo === "quantidade") {
      return { elemento: elemento, modo: "quantidade", tem: c.quantidade >= c.porUso, quantidade: c.quantidade,
        unidade: c.unidade, porUso: c.porUso, itens: itens, oficial: false };
    }
    return { elemento: elemento, modo: "posse", tem: itens.length > 0 || c.tem, itens: itens, manual: c.tem && !itens.length, oficial: true };
  }

  /* Por que este ritual não precisa de componentes, ou por que precisa. */
  function exigencia(ritual, contexto) {
    var el = contexto && contexto.elemento !== undefined ? contexto.elemento : "";
    if (el === "medo") return { precisa: false, motivo: "Rituais de Medo não usam componentes (OPRPG p. 119)." };
    if (contexto && contexto.afinidade && contexto.afinidade === el) {
      return { precisa: false, motivo: "Afinidade com " + (NOMES_ELEMENTOS[el] || el) + ": dispensa os componentes do elemento (OPRPG p. 114)." };
    }
    if (!el) return { precisa: true, motivo: "O ritual não diz o elemento: confira os componentes à mão.", semElemento: true };
    return { precisa: true, motivo: "Conjurar exige componentes de " + (NOMES_ELEMENTOS[el] || el) + " (OPRPG p. 119)." };
  }

  var DISPENSAS = [
    { chave: "", nome: "Nenhuma" },
    { chave: "selo", nome: "Selo paranormal (não usa componentes — OPRPG p. 151)" },
    { chave: "acolito", nome: "Aliado acólito manipula os componentes (OPRPG p. 171)" },
    { chave: "camuflar", nome: "Camuflar Ocultismo: +2 PE, sem componentes (OPRPG p. 33)" },
    { chave: "improvisar", nome: "Improvisar Componentes, uma vez por cena (OPRPG p. 34)" },
    { chave: "mesa", nome: "Decisão da mesa" },
  ];

  /* opcoes: { elemento, afinidade, controle (ordem.componentes), inventario,
     dispensa, entregar (Conjuração Complexa), catalisadorId, custo,
     acrescimoPe } */
  function planoDeRitual(opcoes) {
    var o = opcoes || {};
    var ex = exigencia(null, o);
    var plano = {
      ok: true, avisos: [], exigencia: ex, dispensa: o.dispensa || "",
      custo: (o.custo || 0) + (o.acrescimoPe || 0) + (o.dispensa === "camuflar" ? 2 : 0),
      consumirComponentes: 0, consumirItem: null, consumirCatalisador: null, situacao: null,
    };
    if (o.controleLigado && ex.precisa && !o.dispensa) {
      var sit = situacaoDoElemento(o.controle, o.inventario, o.elemento);
      plano.situacao = sit;
      if (!sit.tem) {
        plano.avisos.push(sit.modo === "quantidade"
          ? "Componentes de " + (NOMES_ELEMENTOS[o.elemento] || o.elemento) + " insuficientes: há " + sit.quantidade + " " + sit.unidade + ", e cada uso gasta " + sit.porUso + " (regra da mesa)."
          : "Sem componentes de " + (NOMES_ELEMENTOS[o.elemento] || o.elemento) + ": pelo livro, não é possível conjurar sem eles.");
        plano.semComponentes = true;
      } else if (sit.modo === "quantidade") {
        plano.consumirComponentes = sit.porUso;
      }
      if (o.entregar) {
        if (sit.modo === "quantidade") plano.consumirComponentes = Math.max(plano.consumirComponentes, sit.porUso);
        else if (sit.itens.length) plano.consumirItem = sit.itens[0];
        else plano.avisos.push("Entregar os componentes pede um item de componentes no inventário (ou o modo quantidade).");
      }
    }
    if (o.catalisadorId) {
      var cat = catalisadores(o.inventario, o.elemento).filter(function (i) { return i.id === o.catalisadorId; })[0];
      if (cat) plano.consumirCatalisador = cat;
      else plano.avisos.push("O catalisador escolhido não está mais no inventário.");
    }
    return plano;
  }

  function tirarUmDoItem(inventario, item) {
    var q = dados(item).quantidade || 1;
    if (q > 1) { item.ordem.quantidade = q - 1; return "sobram " + (q - 1); }
    inventario.itens = inventario.itens.filter(function (i) { return i !== item; });
    return "o último saiu do inventário";
  }

  /* Aplica um uso confirmado: PE ou PD (se a pessoa marcou), os
     componentes e o catalisador. O mesmo id não aplica duas vezes. */
  function aplicarRitual(ordem, inventario, ritualNome, plano, opcoes, opId, quando) {
    var o = opcoes || {};
    if (jaFeito(ordem, opId)) return { ok: true, repetido: true };
    var partes = [];
    if (o.gastar && plano.custo > 0) {
      var qual = o.recurso === "pd" ? "pd" : "pe";
      var atual = Math.round(Number(o.atual)) || 0;
      if (plano.custo > atual) return { ok: false, motivo: "Não há " + qual.toUpperCase() + " suficientes: sobram " + atual + "." };
      if (!ordem.recursos) ordem.recursos = { pv: null, pe: null, san: null, pd: null };
      ordem.recursos[qual] = atual - plano.custo;
      partes.push(plano.custo + " " + qual.toUpperCase() + " (" + atual + " → " + (atual - plano.custo) + ")");
    }
    if (plano.consumirComponentes && o.elemento && ordem.componentes && ordem.componentes.elementos && ordem.componentes.elementos[o.elemento]) {
      var el = ordem.componentes.elementos[o.elemento];
      var antes = el.quantidade;
      el.quantidade = Math.max(0, el.quantidade - plano.consumirComponentes);
      partes.push("componentes de " + (NOMES_ELEMENTOS[o.elemento] || o.elemento) + " " + antes + " → " + el.quantidade + " " + el.unidade + " (regra da mesa)");
    }
    if (plano.consumirItem) partes.push(plano.consumirItem.nome + ": " + tirarUmDoItem(inventario, plano.consumirItem));
    if (plano.consumirCatalisador) partes.push(plano.consumirCatalisador.nome + ": " + tirarUmDoItem(inventario, plano.consumirCatalisador));
    registrar(ordem, opId, "ritual", ritualNome + (o.versao ? " · " + o.versao : "") + (partes.length ? " — " + partes.join("; ") : " — sem gasto registrado"), quando);
    return { ok: true, partes: partes };
  }

  function ligada(ordem, chave) {
    return !!(OP() && OP().ligada(ordem, chave));
  }

  global.RAMAOrdemConsumo = {
    POR_PACOTE_PADRAO: POR_PACOTE_PADRAO,
    BALAS_DA_RAJADA: BALAS_DA_RAJADA,
    CANO_DUPLO: CANO_DUPLO,
    ELEMENTOS: ELEMENTOS,
    NOMES_ELEMENTOS: NOMES_ELEMENTOS,
    DISPENSAS: DISPENSAS,

    contagemValida: contagemValida,
    normalizarControle: normalizarControle,
    normalizarRegistros: normalizarRegistros,
    jaFeito: jaFeito,
    ligada: ligada,

    ehMunicao: ehMunicao,
    porPacote: porPacote,
    reserva: reserva,
    pacotesVazios: pacotesVazios,
    usaMunicao: usaMunicao,
    capacidade: capacidade,
    carregada: carregada,
    municaoDaArma: municaoDaArma,
    planoDeAtaque: planoDeAtaque,
    aplicarAtaque: aplicarAtaque,
    planoDeRecarga: planoDeRecarga,
    recarregar: recarregar,
    associar: associar,
    repor: repor,
    ajustarReserva: ajustarReserva,
    ajustarCarregada: ajustarCarregada,
    descartarVazios: descartarVazios,

    itensDeComponentes: itensDeComponentes,
    catalisadores: catalisadores,
    situacaoDoElemento: situacaoDoElemento,
    exigencia: exigencia,
    planoDeRitual: planoDeRitual,
    aplicarRitual: aplicarRitual,
  };
})(typeof window !== "undefined" ? window : globalThis);
