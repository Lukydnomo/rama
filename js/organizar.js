/* =====================================================================
   R.A.M.A. — organizar listas
   =====================================================================
   O que muda de lugar quando alguém arrasta, e como cada aba agrupa o
   que mostra. Sem tela: js/arrastar.js cuida do gesto, e cada aba chama
   daqui a operação que o gesto pediu. As mesmas funções servem a
   Subir/Descer do menu e às setas do teclado — três caminhos, uma conta.

   ---------------------------------------------------------------------
   AS REGRAS DE TODO MOVIMENTO
   ---------------------------------------------------------------------

     · mover não recria nada: o objeto que sai é o MESMO que entra, com o
       mesmo id, o mesmo conteúdo e os mesmos vínculos;
     · com filtro ou busca ligados, a posição é entre os VISÍVEIS: o item
       vai para logo antes do vizinho visível que ficará depois dele, e
       os ocultos não trocam de ordem entre si nem mudam de pasta;
     · uma pasta não entra em si mesma nem num descendente, e nenhum
       movimento pode deixar a árvore mais funda do que o modelo guarda
       (habilidades.js corta o que passar disso ao ler a ficha);
     · nada aqui ordena por nome ou número sozinho: quem pede a ordem
       automática é a aba, e ela nunca reescreve a ordem guardada.
   ===================================================================== */

(function (global) {
  "use strict";

  function U() { return global.RAMAUtil; }
  function H() { return global.RAMAHabilidades; }
  function RT() { return global.RAMAOrdemRituais; }

  function idDe(x, chave) {
    if (x === null || x === undefined) return "";
    if (typeof x !== "object") return String(x);
    return String(x[chave || "id"]);
  }

  /* =================================================================
     LISTA PLANA
     -----------------------------------------------------------------
     `lista` é a lista GUARDADA (objetos com id, ou ids). `visiveis` é a
     ordem que a tela mostra — ids, subconjunto da guardada. `indice` é
     a posição de destino entre os visíveis, contada SEM o item movido
     (0 = primeiro, visiveis.length - 1 = último).
     ================================================================= */

  function reposicionar(lista, id, indice, visiveis, chave) {
    if (!Array.isArray(lista)) return false;
    var alvo = String(id);
    var ids = (visiveis || lista).map(function (x) { return idDe(x, chave); });
    var pos = ids.indexOf(alvo);
    if (pos < 0) return false;
    var semAlvo = ids.filter(function (x) { return x !== alvo; });
    var p = Math.max(0, Math.min(semAlvo.length, Math.round(Number(indice)) || 0));
    if (p === pos) return false;

    var achar = function (qual) {
      for (var i = 0; i < lista.length; i++) if (idDe(lista[i], chave) === qual) return i;
      return -1;
    };
    var i0 = achar(alvo);
    if (i0 < 0) return false;
    var item = lista.splice(i0, 1)[0];

    var destino;
    if (p < semAlvo.length) {
      destino = achar(semAlvo[p]);
    } else {
      var ultimo = achar(semAlvo[semAlvo.length - 1]);
      destino = ultimo < 0 ? lista.length : ultimo + 1;
    }
    if (destino < 0) destino = lista.length;
    lista.splice(destino, 0, item);
    return true;
  }

  /* Um passo para cima ou para baixo entre os visíveis: o teclado e o
     Subir/Descer do menu. */
  function passo(lista, id, direcao, visiveis, chave) {
    var ids = (visiveis || lista).map(function (x) { return idDe(x, chave); });
    var pos = ids.indexOf(String(id));
    if (pos < 0) return false;
    var p = pos + (direcao < 0 ? -1 : 1);
    if (p < 0 || p >= ids.length) return false;
    return reposicionar(lista, id, p, visiveis, chave);
  }

  /* =================================================================
     ÁRVORE DE HABILIDADES
     ================================================================= */

  /* Quantos níveis descem de um nó (uma habilidade ou pasta vazia: 0). */
  function altura(no) {
    if (!no || no.tipo !== "pasta" || !Array.isArray(no.filhos) || !no.filhos.length) return 0;
    var m = 0;
    no.filhos.forEach(function (f) { m = Math.max(m, 1 + altura(f)); });
    return m;
  }

  function profundidadeDaPasta(arvore, pastaId) {
    if (!pastaId) return -1;
    var achado = H().achar(arvore, pastaId);
    return achado ? achado.profundidade : null;
  }

  /* Pode o nó `id` ir para dentro de `pastaId` (vazio = raiz)? */
  function podeMoverNaArvore(arvore, id, pastaId) {
    var alvo = H().achar(arvore, id);
    if (!alvo) return { ok: false, motivo: "Este item não está mais na lista." };
    if (!pastaId) return { ok: true, motivo: "" };
    var destino = H().achar(arvore, pastaId);
    if (!destino || destino.no.tipo !== H().TIPO_PASTA) return { ok: false, motivo: "A pasta de destino não existe mais." };
    if (alvo.no.tipo === H().TIPO_PASTA) {
      if (pastaId === id) return { ok: false, motivo: "Uma pasta não pode entrar em si mesma." };
      var dentro = false;
      H().percorrer({ filhos: alvo.no.filhos }, function (no) { if (no.id === pastaId) dentro = true; });
      if (dentro) return { ok: false, motivo: "Uma pasta não pode entrar numa pasta que está dentro dela." };
    }
    var fundo = destino.profundidade + 1 + altura(alvo.no);
    if (fundo > H().MAX_PROFUNDIDADE) {
      return { ok: false, motivo: "Ficaria fundo demais: pastas vão até " + (H().MAX_PROFUNDIDADE + 1) + " níveis." };
    }
    return { ok: true, motivo: "" };
  }

  /* Tira o nó de onde está e o põe em `pastaId` (vazio = raiz), na
     posição `indice` entre os filhos de lá (contada sem ele). O MESMO
     objeto: id, conteúdo, cor e etiqueta vão junto. */
  function moverNaArvore(arvore, id, pastaId, indice) {
    var pode = podeMoverNaArvore(arvore, id, pastaId);
    if (!pode.ok) return pode;
    var achado = H().achar(arvore, id);
    var origem = achado.pai ? achado.pai.filhos : arvore.filhos;
    var destinoNo = pastaId ? H().achar(arvore, pastaId).no : null;
    var destino = destinoNo ? destinoNo.filhos : arvore.filhos;

    var no = origem.splice(achado.indice, 1)[0];
    var p = Math.max(0, Math.min(destino.length, Math.round(Number(indice))));
    if (!Number.isFinite(p)) p = destino.length;
    destino.splice(p, 0, no);
    if (destinoNo) destinoNo.aberta = true;
    return { ok: true, motivo: "" };
  }

  /* =================================================================
     ANOTAÇÕES — pastas de um nível e notas soltas
     ================================================================= */

  function acharNotaEm(anotacoes, notaId) {
    var a = anotacoes || {};
    var soltas = a.soltas || [];
    for (var i = 0; i < soltas.length; i++) {
      if (soltas[i].id === notaId) return { lista: soltas, indice: i, pastaId: null };
    }
    var pastas = a.pastas || [];
    for (var j = 0; j < pastas.length; j++) {
      var notas = pastas[j].notas || [];
      for (var k = 0; k < notas.length; k++) {
        if (notas[k].id === notaId) return { lista: notas, indice: k, pastaId: pastas[j].id };
      }
    }
    return null;
  }

  /* A nota vai para `pastaId` (vazio = sem pasta), na posição `indice`
     entre as notas de lá (contada sem ela). */
  function moverNota(anotacoes, notaId, pastaId, indice) {
    var achado = acharNotaEm(anotacoes, notaId);
    if (!achado) return { ok: false, motivo: "A nota não está mais na ficha." };
    var destinoPasta = null;
    if (pastaId) {
      destinoPasta = (anotacoes.pastas || []).filter(function (p) { return p.id === pastaId; })[0] || null;
      if (!destinoPasta) return { ok: false, motivo: "A pasta de destino não existe mais." };
      if (!Array.isArray(destinoPasta.notas)) destinoPasta.notas = [];
    }
    var destino = destinoPasta ? destinoPasta.notas : anotacoes.soltas;
    var nota = achado.lista.splice(achado.indice, 1)[0];
    var p = Math.max(0, Math.min(destino.length, Math.round(Number(indice))));
    if (!Number.isFinite(p)) p = destino.length;
    destino.splice(p, 0, nota);
    return { ok: true, motivo: "" };
  }

  /* =================================================================
     HABILIDADES DE ORDEM — A APRESENTAÇÃO
     -----------------------------------------------------------------
     Numa ficha de Ordem, a mesma pasta mostra habilidades da mesa (nós
     da árvore) e habilidades das regras (cartões da progressão). As das
     regras NÃO entram na árvore: arrastar uma delas guarda só onde ela
     aparece — `organizacao.habilidades.lugares` (a pasta) e `ordem` (a
     posição) —, e a aquisição, o texto e a personalização não mudam.

     Entre as da mesa, a ordem é sempre a da árvore. `ordem[pasta]` só
     posiciona as das regras: cada uma fica logo antes do primeiro nó da
     mesa que vinha depois dela na última arrumação. Assim mover outra
     habilidade depois não embaralha as das regras.

     Sem nada guardado, a raiz mostra as das regras antes (o comportamento
     de sempre) e uma pasta as mostra no fim.
     ================================================================= */

  var RAIZ = "*";

  function chaveDoConteiner(pastaId) { return pastaId ? String(pastaId) : RAIZ; }

  /* nos: nós da árvore naquela pasta, na ordem da árvore.
     regras: ids das habilidades das regras que moram ali, na ordem delas.
     guardada: org.ordem[chave] ou nada. */
  function entradasDoConteiner(nos, regras, guardada, ehRaiz) {
    var lista = Array.isArray(guardada) ? guardada : [];
    var pos = {};
    lista.forEach(function (k, i) { if (pos[k] === undefined) pos[k] = i; });
    var existe = {};
    (nos || []).forEach(function (n) { existe[n.id] = true; });

    var comeco = [];
    var fim = [];
    var antesDe = {};

    (regras || []).forEach(function (rid, ordemDaRegra) {
      var k = "r:" + rid;
      if (pos[k] === undefined) {
        (ehRaiz ? comeco : fim).push({ rid: rid, peso: 1e6 + ordemDaRegra });
        return;
      }
      var ancora = null;
      for (var j = pos[k] + 1; j < lista.length; j++) {
        if (lista[j].indexOf("n:") === 0 && existe[lista[j].slice(2)]) { ancora = lista[j].slice(2); break; }
      }
      var e = { rid: rid, peso: pos[k] };
      if (ancora) (antesDe[ancora] = antesDe[ancora] || []).push(e);
      else fim.push(e);
    });

    function porPeso(a, b) { return a.peso - b.peso; }
    var saida = [];
    comeco.sort(porPeso).forEach(function (e) { saida.push({ tipo: "regra", id: e.rid }); });
    (nos || []).forEach(function (n) {
      (antesDe[n.id] || []).sort(porPeso).forEach(function (e) { saida.push({ tipo: "regra", id: e.rid }); });
      saida.push({ tipo: "no", id: n.id, no: n });
    });
    fim.sort(porPeso).forEach(function (e) { saida.push({ tipo: "regra", id: e.rid }); });
    return saida;
  }

  function chaveDaEntrada(e) { return (e.tipo === "regra" ? "r:" : "n:") + e.id; }

  /* Move uma entrada (nó da árvore ou habilidade das regras) para a
     pasta `pastaId`, na posição `indice` entre o que a pasta mostra.

     ctx = { arvore, org (organizacao.habilidades), regrasDe(pastaId) →
             ids das habilidades das regras que moram lá, na ordem delas,
             pastaDaRegra(id) → pasta atual dela }
     entrada = { tipo: "no" | "regra", id } */
  function moverNaApresentacao(ctx, entrada, pastaId, indice) {
    var arvore = ctx.arvore;
    var org = ctx.org;
    if (!org.lugares) org.lugares = {};
    if (!org.ordem) org.ordem = {};

    var origemPasta;
    if (entrada.tipo === "no") {
      var pode = podeMoverNaArvore(arvore, entrada.id, pastaId);
      if (!pode.ok) return pode;
      var achado = H().achar(arvore, entrada.id);
      origemPasta = achado.pai ? achado.pai.id : "";
    } else {
      origemPasta = ctx.pastaDaRegra(entrada.id) || "";
      if (pastaId && !H().achar(arvore, pastaId)) return { ok: false, motivo: "A pasta de destino não existe mais." };
    }

    /* O que a pasta de destino mostra agora, sem a entrada movida. */
    function nosDe(pid) {
      if (!pid) return arvore.filhos;
      var a = H().achar(arvore, pid);
      return a && a.no.filhos ? a.no.filhos : [];
    }
    var chaveDestino = chaveDoConteiner(pastaId);
    var atuais = entradasDoConteiner(nosDe(pastaId), ctx.regrasDe(pastaId), org.ordem[chaveDestino], !pastaId)
      .filter(function (e) { return !(e.tipo === entrada.tipo && e.id === entrada.id); });
    var p = Math.max(0, Math.min(atuais.length, Math.round(Number(indice))));
    if (!Number.isFinite(p)) p = atuais.length;
    var nova = atuais.slice();
    nova.splice(p, 0, { tipo: entrada.tipo, id: entrada.id });

    /* Nó da mesa: a árvore passa a ter, naquela pasta, os nós na ordem
       em que aparecem na nova arrumação. */
    if (entrada.tipo === "no") {
      var nosNaNova = nova.filter(function (e) { return e.tipo === "no"; });
      var indiceNaArvore = nosNaNova.map(function (e) { return e.id; }).indexOf(entrada.id);
      var r = moverNaArvore(arvore, entrada.id, pastaId, indiceNaArvore);
      if (!r.ok) return r;
    } else {
      if (pastaId) org.lugares[entrada.id] = String(pastaId);
      else delete org.lugares[entrada.id];
    }

    /* A posição das habilidades das regras só precisa ser guardada onde
       houver alguma. */
    if (nova.some(function (e) { return e.tipo === "regra"; })) {
      org.ordem[chaveDestino] = nova.map(chaveDaEntrada);
    } else {
      delete org.ordem[chaveDestino];
    }
    var chaveOrigem = chaveDoConteiner(origemPasta);
    if (chaveOrigem !== chaveDestino && org.ordem[chaveOrigem]) {
      var chaveMovida = chaveDaEntrada(entrada);
      org.ordem[chaveOrigem] = org.ordem[chaveOrigem].filter(function (k) { return k !== chaveMovida; });
      if (!org.ordem[chaveOrigem].some(function (k) { return k.indexOf("r:") === 0; })) delete org.ordem[chaveOrigem];
    }
    return { ok: true, motivo: "" };
  }

  /* =================================================================
     RITUAIS — CÍRCULO E ELEMENTO
     -----------------------------------------------------------------
     Pelos DADOS do ritual — o bloco de Ordem dele (círculo 1 a 4 e a
     chave do elemento) —, nunca pelo nome. Ritual escrito à mão sem esses
     dados fica em "não informado", no fim. O campo de texto "Elemento"
     entra só quando o bloco não tem elemento: se ele é exatamente o nome
     de um elemento, conta como tal; se é outra coisa (um elemento
     Homebrew, "Sangue ou Morte"), vira um grupo com aquele nome. Um
     ritual aparece UMA vez, sempre.
     ================================================================= */

  var ORDEM_DOS_ELEMENTOS = ["conhecimento", "energia", "morte", "sangue", "medo"];

  function dadosDeOrdem(ritual) {
    return RT() && ritual ? RT().dadosDoRitual(ritual) : ((ritual && ritual.ordem) || {});
  }

  function grupoDeCirculo(ritual) {
    var c = Math.round(Number(dadosDeOrdem(ritual).circulo));
    if (c >= 1 && c <= 4) return { chave: "c" + c, rotulo: c + "º círculo", peso: c };
    return { chave: "c?", rotulo: "Círculo não informado", peso: 99 };
  }

  function grupoDeElemento(ritual) {
    var el = String(dadosDeOrdem(ritual).elemento || "");
    var i = ORDEM_DOS_ELEMENTOS.indexOf(el);
    if (i >= 0) return { chave: "e:" + el, rotulo: RT() ? RT().nomeDoElemento(el) : el, peso: i };
    var bruto = U() ? U().texto(ritual && ritual.elemento).trim() : String((ritual && ritual.elemento) || "").trim();
    if (bruto) {
      var chave = U() ? U().chaveDeBusca(bruto) : bruto.toLowerCase();
      for (var j = 0; j < ORDEM_DOS_ELEMENTOS.length; j++) {
        var nome = RT() ? RT().nomeDoElemento(ORDEM_DOS_ELEMENTOS[j]) : ORDEM_DOS_ELEMENTOS[j];
        if ((U() ? U().chaveDeBusca(nome) : nome.toLowerCase()) === chave) {
          return { chave: "e:" + ORDEM_DOS_ELEMENTOS[j], rotulo: nome, peso: j };
        }
      }
      return { chave: "t:" + chave, rotulo: bruto.slice(0, 40), peso: 50, texto: chave };
    }
    return { chave: "e?", rotulo: "Elemento não informado", peso: 99 };
  }

  var GRUPOS = { circulo: grupoDeCirculo, elemento: grupoDeElemento };

  function compararGrupos(a, b) {
    return (a.peso - b.peso) || String(a.texto || "").localeCompare(String(b.texto || ""), "pt-BR");
  }

  /* `lista` já vem na ordem do modo escolhido (personalizada, adição,
     A–Z, Z–A): ela é o desempate dentro de cada grupo, e por isso
     ninguém pula de lugar entre um desenho e outro.
     Devolve [{ chave, rotulo, itens, subgrupos }] — subgrupos só com
     dois critérios. Sem critério: um grupo só, sem rótulo. */
  function agruparRituais(lista, criterios) {
    var cs = (criterios || []).filter(function (c) { return GRUPOS[c]; });
    var itens = Array.isArray(lista) ? lista : [];
    if (!cs.length) return [{ chave: "", rotulo: "", itens: itens.slice(), subgrupos: null }];

    function agrupar(xs, criterio) {
      var mapa = {};
      var ordem = [];
      xs.forEach(function (r) {
        var g = GRUPOS[criterio](r);
        if (!mapa[g.chave]) { mapa[g.chave] = { chave: g.chave, rotulo: g.rotulo, peso: g.peso, texto: g.texto, itens: [] }; ordem.push(mapa[g.chave]); }
        mapa[g.chave].itens.push(r);
      });
      return ordem.sort(compararGrupos);
    }

    return agrupar(itens, cs[0]).map(function (g) {
      return {
        chave: g.chave,
        rotulo: g.rotulo,
        itens: g.itens,
        subgrupos: cs[1] ? agrupar(g.itens, cs[1]).map(function (s) {
          return { chave: g.chave + "/" + s.chave, rotulo: s.rotulo, itens: s.itens };
        }) : null,
      };
    });
  }

  /* =================================================================
     PERÍCIAS
     -----------------------------------------------------------------
     `total(p)` é o número que a linha mostra — o mesmo cálculo da ficha,
     passado por quem desenha. Nada de dado: só o total fixo. Empate
     desempata pelo nome, e o nome pela chave: a ordem nunca depende de
     como a lista chegou.
     ================================================================= */

  function compararNome(a, b) {
    return String(a.nome).localeCompare(String(b.nome), "pt-BR", { sensitivity: "base" }) ||
      (a.chave < b.chave ? -1 : (a.chave > b.chave ? 1 : 0));
  }

  function ordenarPericias(lista, modo, total, personalizada) {
    var xs = (Array.isArray(lista) ? lista : []).slice();
    if (modo === "maior" || modo === "menor") {
      var sinal = modo === "maior" ? -1 : 1;
      var t = {};
      xs.forEach(function (p) { t[p.chave] = Number(total(p)) || 0; });
      return xs.sort(function (a, b) { return (sinal * (t[a.chave] - t[b.chave])) || compararNome(a, b); });
    }
    if (modo === "personalizada") {
      var pos = {};
      (personalizada || []).forEach(function (k, i) { if (pos[k] === undefined) pos[k] = i; });
      return xs.sort(function (a, b) {
        var pa = pos[a.chave] === undefined ? Infinity : pos[a.chave];
        var pb = pos[b.chave] === undefined ? Infinity : pos[b.chave];
        if (pa !== pb) return pa < pb ? -1 : 1;
        return compararNome(a, b);
      });
    }
    return xs.sort(compararNome);
  }

  global.RAMAOrganizar = {
    reposicionar: reposicionar,
    passo: passo,

    altura: altura,
    profundidadeDaPasta: profundidadeDaPasta,
    podeMoverNaArvore: podeMoverNaArvore,
    moverNaArvore: moverNaArvore,

    acharNotaEm: acharNotaEm,
    moverNota: moverNota,

    RAIZ: RAIZ,
    chaveDoConteiner: chaveDoConteiner,
    entradasDoConteiner: entradasDoConteiner,
    moverNaApresentacao: moverNaApresentacao,

    grupoDeCirculo: grupoDeCirculo,
    grupoDeElemento: grupoDeElemento,
    agruparRituais: agruparRituais,

    ordenarPericias: ordenarPericias,
  };
})(typeof window !== "undefined" ? window : globalThis);
