/* =====================================================================
   R.A.M.A. — Ordem Paranormal · maldições do Maledictólogo
   =====================================================================
   A trilha Maledictólogo (Arquivos Secretos 1, p. 45) mexe nas
   maldições de itens como COISAS: transfere de um item para outro (ou
   para uma tatuagem), memoriza e reproduz. Este arquivo é a regra disso,
   sem tela e sem rede — js/paginas/ficha-maldicoes.js desenha e grava.

   Uma maldição aplicada é o retrato em `item.ordem.modificacoes` com
   `natureza: "maldicao"` (js/ordem/itens.js). Transferir MOVE o retrato
   — o mesmo id, o mesmo texto, o mesmo cálculo —, para o efeito seguir
   igual no item novo; reproduzir COPIA o retrato memorizado com id novo
   e a marca `temporaria: "missao"`, porque a maldição reproduzida dura
   até o fim da missão.

   Os testes, os PE e a Sanidade são da mesa: a tela pergunta se o teste
   passou e lembra o custo. Nada aqui rola dado.
   ===================================================================== */

(function (global) {
  "use strict";

  var OPRESSAO = { sangue: "conhecimento", conhecimento: "energia", energia: "morte", morte: "sangue" };
  var NOMES = { sangue: "Sangue", morte: "Morte", conhecimento: "Conhecimento", energia: "Energia", medo: "Medo" };
  var CATEGORIA_MAXIMA = 4;

  function I() { return global.RAMAOrdemInventario || null; }

  function uuid() {
    var U = global.RAMAUtil;
    return U && U.uuid ? U.uuid() : "m" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function copia(x) { return JSON.parse(JSON.stringify(x)); }

  function dados(item) {
    return I() ? I().dadosDoItem(item) : ((item && item.ordem) || {});
  }

  function garantirOrdem(item) {
    if (!item.ordem || typeof item.ordem !== "object") {
      item.ordem = I() ? I().normalizarDados(null, item.tipo) : {};
    }
    if (!Array.isArray(item.ordem.modificacoes)) item.ordem.modificacoes = [];
    return item.ordem;
  }

  function maldicoesDe(item) {
    return (dados(item).modificacoes || []).filter(function (m) { return m && m.natureza === "maldicao"; });
  }

  function temporariasDe(item) {
    return maldicoesDe(item).filter(function (m) { return m.temporaria === "missao"; });
  }

  /* A categoria do item com o que ele já tem: +I por modificação, +II na
     primeira maldição e +I nas seguintes (OPRPG p. 60 e p. 144). */
  function categoriaDoItem(item, extras) {
    var d = dados(item);
    var base = Number(d.categoria);
    var total = Number.isFinite(base) ? base : 0;
    var maldicoes = 0;
    (d.modificacoes || []).concat(extras || []).forEach(function (m) {
      if (!m) return;
      if (m.natureza === "maldicao") { maldicoes++; total += maldicoes === 1 ? 2 : 1; }
      else if (!m.semAcrescimoDeCategoria) total += 1;
    });
    return total;
  }

  /* A DT de Compreensão de Maldições e de Reproduzir Maldição: 10 + 5
     por categoria do item (AS1 p. 45). */
  function dtDoItem(item) {
    return 10 + 5 * categoriaDoItem(item);
  }

  function conflitoDeElemento(lista, m) {
    if (!m.elemento || OPRESSAO[m.elemento] === undefined) return null;
    return lista.filter(function (x) {
      return x.natureza === "maldicao" && x.elemento && (OPRESSAO[x.elemento] === m.elemento || OPRESSAO[m.elemento] === x.elemento);
    })[0] || null;
  }

  function mesma(lista, m) {
    return lista.some(function (x) {
      return x.natureza === "maldicao" && ((m.catalogoId && x.catalogoId === m.catalogoId) || (!m.catalogoId && x.nome === m.nome));
    });
  }

  /* -----------------------------------------------------------------
     COMPREENSÃO DE MALDIÇÕES — transferir (NEX 40%)
     ----------------------------------------------------------------- */

  /* As maldições de `origem` cabem em `destino`? Maldições iguais não se
     acumulam e elementos opressores não convivem (OPRPG p. 144). O tipo
     do item continua valendo: maldição de arma vai para arma, de
     proteção para proteção — a tatuagem aceita qualquer uma. */
  function planoDeTransferencia(origem, destino) {
    var lista = maldicoesDe(origem);
    if (!lista.length) return { ok: false, motivo: (origem && origem.nome ? origem.nome : "O item") + " não tem maldição para transferir." };
    if (!destino) return { ok: false, motivo: "Escolha o item que recebe as maldições." };
    if (destino === origem || (destino.id && destino.id === origem.id)) return { ok: false, motivo: "As maldições precisam ir para outro item." };
    var dd = dados(destino);
    if (!dd.tatuagem && destino.tipo !== origem.tipo) {
      return { ok: false, motivo: "Maldição de " + (origem.tipo === "arma" ? "arma" : origem.tipo === "armadura" ? "proteção" : "acessório") +
        " vai para um item do mesmo tipo (ou para uma tatuagem)." };
    }
    var existentes = (dd.modificacoes || []).slice();
    for (var i = 0; i < lista.length; i++) {
      var m = lista[i];
      if (mesma(existentes, m)) return { ok: false, motivo: destino.nome + " já tem " + m.nome + ": maldições iguais não se acumulam." };
      var c = conflitoDeElemento(existentes, m);
      if (c) return { ok: false, motivo: "Elementos opressores não convivem no mesmo item: " + m.nome + " e " + c.nome + "." };
      existentes.push(m);
    }
    return { ok: true, maldicoes: lista, dt: dtDoItem(origem) };
  }

  /* Move as maldições (o retrato inteiro, com o mesmo id). Quem chama
     tira o item original do inventário: ele é consumido. */
  function transferir(origem, destino) {
    var plano = planoDeTransferencia(origem, destino);
    if (!plano.ok) return plano;
    var od = garantirOrdem(destino);
    plano.maldicoes.forEach(function (m) {
      var nova = copia(m);
      nova.transferidaDe = String(origem.nome || "").slice(0, 80);
      od.modificacoes.push(nova);
    });
    if (!od.elemento && plano.maldicoes[0].elemento) od.elemento = plano.maldicoes[0].elemento;
    return { ok: true, movidas: plano.maldicoes.length };
  }

  /* O símbolo marcado no corpo: um "item" sem espaço nem categoria de
     equipamento, que carrega as maldições. A pessoa usa as maldições
     como se usasse o item; uma tatuagem dessas por pessoa. */
  function tatuagem(origem, inventario) {
    var itens = (inventario && Array.isArray(inventario.itens)) ? inventario.itens : [];
    if (itens.some(function (x) { return x && dados(x).tatuagem; })) {
      return { ok: false, motivo: "Uma pessoa não pode ter mais de uma tatuagem de maldição (Arquivos Secretos 1, p. 45). Destrua a outra antes." };
    }
    var lista = maldicoesDe(origem);
    if (!lista.length) return { ok: false, motivo: "Não há maldição para tatuar." };
    var nomes = lista.map(function (m) { return m.nome; }).join(", ");
    var item = {
      tipo: "item",
      nome: ("Tatuagem de maldição: " + nomes).slice(0, 120),
      descricao: "Símbolo marcado no corpo com as maldições de " + (origem.nome || "um item") + ", por Compreensão de Maldições (Arquivos Secretos 1, p. 45). " +
        "Quem a tem usufrui das maldições como se usasse o item. Pode ser destruída com uma ação de interlúdio.",
      ordem: {
        categoria: 0, espacos: 0, quantidade: 1, grupo: "amaldicoado", amaldicoado: true, tatuagem: true,
        modificacoes: lista.map(function (m) { var n = copia(m); n.transferidaDe = String(origem.nome || "").slice(0, 80); return n; }),
      },
    };
    if (lista[0].elemento) item.ordem.elemento = lista[0].elemento;
    return { ok: true, item: item };
  }

  /* -----------------------------------------------------------------
     REPRODUZIR MALDIÇÃO (NEX 65%) e MALDIÇÃO SUPREMA (NEX 99%)
     ----------------------------------------------------------------- */

  function memorizar(ordem, item, idRegistro) {
    var m = maldicoesDe(item).filter(function (x) { return x.id === idRegistro; })[0];
    if (!m) return { ok: false, motivo: "Essa maldição não está mais no item." };
    if (!Array.isArray(ordem.maldicoesMemorizadas)) ordem.maldicoesMemorizadas = [];
    var ja = ordem.maldicoesMemorizadas.filter(function (x) {
      return (m.catalogoId && x.catalogoId === m.catalogoId) || (!m.catalogoId && x.nome === m.nome);
    })[0];
    if (ja) return { ok: false, motivo: m.nome + " já está memorizada." };
    var registro = { id: uuid(), catalogoId: m.catalogoId || "", nome: m.nome, resumo: m.resumo || "", em: new Date().toISOString() };
    if (m.elemento) registro.elemento = m.elemento;
    if (m.referencia) registro.referencia = copia(m.referencia);
    ordem.maldicoesMemorizadas.push(registro);
    return { ok: true, registro: registro };
  }

  /* Aplicar a maldição memorizada: maldições sobem a categoria, e nenhum
     item passa da IV. Com Maldição Suprema, o item conta três categorias
     a menos nessa conta (um IV conta como I). */
  function planoDeReproducao(item, memorizada, suprema) {
    if (!item) return { ok: false, motivo: "Escolha o item." };
    if (!memorizada) return { ok: false, motivo: "Escolha a maldição memorizada." };
    var d = dados(item);
    if (d.tatuagem) return { ok: false, motivo: "Reproduzir Maldição aplica num item, não numa tatuagem." };
    var lista = d.modificacoes || [];
    var m = { natureza: "maldicao", nome: memorizada.nome, catalogoId: memorizada.catalogoId, elemento: memorizada.elemento };
    if (mesma(lista, m)) return { ok: false, motivo: item.nome + " já tem " + memorizada.nome + "." };
    var c = conflitoDeElemento(lista, m);
    if (c) return { ok: false, motivo: "Elementos opressores não convivem no mesmo item: " + memorizada.nome + " e " + c.nome + "." };
    var antes = categoriaDoItem(item);
    var depois = categoriaDoItem(item, [m]);
    var desconto = suprema ? 3 : 0;
    var efetiva = Math.max(0, depois - desconto);
    if (efetiva > CATEGORIA_MAXIMA) {
      return { ok: false, motivo: "Com " + memorizada.nome + ", " + item.nome + " passaria a categoria " + depois +
        (desconto ? " (" + efetiva + " com Maldição Suprema)" : "") + ", e nenhum item passa da IV (Arquivos Secretos 1, p. 45)." };
    }
    return { ok: true, antes: antes, depois: depois, efetiva: efetiva, dt: 10 + 5 * Math.max(0, antes - desconto) };
  }

  function reproduzir(item, memorizada, suprema) {
    var plano = planoDeReproducao(item, memorizada, suprema);
    if (!plano.ok) return plano;
    var od = garantirOrdem(item);
    var registro = {
      id: uuid(), catalogoId: memorizada.catalogoId || "", nome: memorizada.nome, natureza: "maldicao",
      resumo: (memorizada.resumo || "").slice(0, 300), temporaria: "missao",
    };
    if (memorizada.elemento) registro.elemento = memorizada.elemento;
    if (memorizada.referencia) registro.referencia = copia(memorizada.referencia);
    od.modificacoes.push(registro);
    return { ok: true, registro: registro, plano: plano };
  }

  /* Fim da missão: as maldições reproduzidas saem de todos os itens. */
  function encerrarMissao(inventario) {
    var tiradas = 0;
    ((inventario && inventario.itens) || []).forEach(function (item) {
      if (!item || !item.ordem || !Array.isArray(item.ordem.modificacoes)) return;
      var antes = item.ordem.modificacoes.length;
      item.ordem.modificacoes = item.ordem.modificacoes.filter(function (m) { return !(m && m.temporaria === "missao"); });
      tiradas += antes - item.ordem.modificacoes.length;
    });
    return tiradas;
  }

  global.RAMAOrdemMaldicoes = {
    CATEGORIA_MAXIMA: CATEGORIA_MAXIMA,
    NOMES: NOMES,
    maldicoesDe: maldicoesDe,
    temporariasDe: temporariasDe,
    categoriaDoItem: categoriaDoItem,
    dtDoItem: dtDoItem,
    planoDeTransferencia: planoDeTransferencia,
    transferir: transferir,
    tatuagem: tatuagem,
    memorizar: memorizar,
    planoDeReproducao: planoDeReproducao,
    reproduzir: reproduzir,
    encerrarMissao: encerrarMissao,
  };
})(typeof window !== "undefined" ? window : globalThis);
