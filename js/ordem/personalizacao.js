/* =====================================================================
   R.A.M.A. — Ordem Paranormal · versões personalizadas
   =====================================================================
   Uma habilidade oficial que o personagem tem (automática de classe,
   de trilha, poder escolhido na progressão) pode ser EDITADA na ficha.
   Editar não mexe no catálogo: cria uma versão personalizada que vale
   só para aquela ocorrência, naquela ficha.

   ---------------------------------------------------------------------
   O VÍNCULO
   ---------------------------------------------------------------------

   Cada personalização aponta para uma AQUISIÇÃO pelo id estável que o
   motor de progressão dá a ela (progressao.js, `idDeAquisicao`):

       auto|ataqueEspecial            automática de classe
       t.cascaGrossa|cascaGrossa     habilidade automática de trilha
       d3.poderClasse|golpePesado     poder escolhido numa etapa
       x60.transcender|sangueDeFerro  poder vindo de um Transcender

   O id é a etapa mais a chave do poder — nunca o nome. Aquisições
   repetidas ficam em etapas diferentes, e cada uma tem o seu.

   A personalização é APRESENTAÇÃO: nome, texto, origem, cor de
   contorno, negrito e etiqueta. Ela não abre nem consome escolha, não
   concede nada e não é lida como regra. O único dado mecânico dela é
   `efeitos`:

       "herdados"      (padrão) os efeitos automáticos do original
                       continuam valendo, como se nada tivesse mudado
       "desativados"   o motor pula os efeitos DESTA aquisição; os de
                       outras fontes e os ajustes manuais ficam

   ---------------------------------------------------------------------
   QUANDO A AQUISIÇÃO SOME
   ---------------------------------------------------------------------

   A classe mudou, a trilha mudou, a escolha foi trocada: o id deixa de
   existir no estado. A personalização NÃO é apagada — fica "sem
   aquisição", visível na aba Habilidades, sem conceder nada, para ser
   recuperada como habilidade comum ou excluída. Se a aquisição voltar
   (a escolha foi refeita igual), ela volta a valer sozinha.

   ---------------------------------------------------------------------
   EXCLUIR
   ---------------------------------------------------------------------

   Uma habilidade que CHEGA SOZINHA (automática de classe, de trilha)
   não tem escolha para desfazer. Excluí-la grava a aquisição em
   `ordem.excluidas`: ela some da lista, e os efeitos dela deixam de
   entrar na conta — o motor lê as excluídas junto com as desativadas.
   Nada é apagado: a lista de excluídas fica visível e cada uma pode ser
   restaurada. A personalização, se houver, é mantida e volta junto.

   Um poder ESCOLHIDO é excluído desfazendo a escolha na progressão
   (progressao.js, `remover`) — isso é da tela, não deste módulo.

   ---------------------------------------------------------------------
   RESTAURAR
   ---------------------------------------------------------------------

   Restaurar a versão oficial apaga a personalização daquela ocorrência.
   O que aparece depois é o texto ATUAL do catálogo do R.A.M.A. — não uma
   cópia de quando a personalização foi feita. Nenhum snapshot do
   original é guardado: o catálogo é código, e a versão oficial é sempre
   a que está nele.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;

  var EFEITOS = { HERDADOS: "herdados", DESATIVADOS: "desativados" };

  var LIMITES = { quantidade: 300, aquisicao: 160, poder: 80 };

  var PADRAO_AQUISICAO = /^[A-Za-z0-9_.:|#-]+$/;

  function corValida(valor) {
    var H = global.RAMAHabilidades;
    if (H) return H.corValida(valor);
    var v = U.aparar(valor, 7);
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v) ? v : "";
  }

  function dataValida(valor, padrao) {
    return U.paraData(valor) ? new Date(valor).toISOString() : padrao;
  }

  function normalizarUma(bruto) {
    if (!bruto || typeof bruto !== "object") return null;
    var aquisicao = U.aparar(bruto.aquisicao, LIMITES.aquisicao);
    if (!aquisicao || !PADRAO_AQUISICAO.test(aquisicao)) return null;
    var nome = U.aparar(bruto.nome, 120);
    if (!nome) return null;

    var agora = U.agoraISO();
    var p = {
      id: U.aparar(bruto.id, 60) || U.uuid(),
      aquisicao: aquisicao,
      poder: U.aparar(bruto.poder, LIMITES.poder),
      nome: nome,
      texto: U.aparar(bruto.texto, 8000),
      origem: U.aparar(bruto.origem, 60),
      cor: corValida(bruto.cor),
      negrito: !!bruto.negrito,
      efeitos: bruto.efeitos === EFEITOS.DESATIVADOS ? EFEITOS.DESATIVADOS : EFEITOS.HERDADOS,
      /* Rastro do registro na biblioteca, quando a pessoa salvou esta
         versão lá. Nunca é lido de volta para a ficha. */
      homebrewId: U.aparar(bruto.homebrewId, 60) || null,
      criadoEm: dataValida(bruto.criadoEm, agora),
      atualizadoEm: dataValida(bruto.atualizadoEm, agora),
    };
    var etiqueta = U.normalizarEtiqueta(bruto.etiqueta);
    if (etiqueta) p.etiqueta = etiqueta;
    return p;
  }

  /* Uma por aquisição. Duas para a mesma — dois aparelhos editaram ao
     mesmo tempo e a sincronização juntou — vale a mais recente. */
  function normalizar(lista) {
    var porAquisicao = {};
    var ordem = [];
    (Array.isArray(lista) ? lista : []).forEach(function (bruto) {
      var p = normalizarUma(bruto);
      if (!p) return;
      var atual = porAquisicao[p.aquisicao];
      if (!atual) {
        porAquisicao[p.aquisicao] = p;
        ordem.push(p.aquisicao);
        return;
      }
      if (p.atualizadoEm > atual.atualizadoEm) porAquisicao[p.aquisicao] = p;
    });
    return ordem.slice(0, LIMITES.quantidade).map(function (k) { return porAquisicao[k]; });
  }

  function lista(ordem) {
    if (!ordem) return [];
    if (!Array.isArray(ordem.personalizacoes)) ordem.personalizacoes = [];
    return ordem.personalizacoes;
  }

  function daAquisicao(ordem, aquisicao) {
    var achada = null;
    lista(ordem).forEach(function (p) {
      if (p && p.aquisicao === aquisicao && (!achada || String(p.atualizadoEm) > String(achada.atualizadoEm))) achada = p;
    });
    return achada;
  }

  /* Cria ou atualiza a personalização de uma aquisição. `dados` traz o
     que o editor coletou. Devolve o registro gravado, ou null se os
     dados não formam uma personalização válida (nome vazio). */
  function salvar(ordem, aquisicao, poder, dados) {
    var existente = daAquisicao(ordem, aquisicao);
    var agora = U.agoraISO();
    var nova = normalizarUma(Object.assign({}, existente || {}, dados || {}, {
      id: existente ? existente.id : U.uuid(),
      aquisicao: aquisicao,
      poder: poder,
      criadoEm: existente ? existente.criadoEm : agora,
      atualizadoEm: agora,
      homebrewId: (dados && dados.homebrewId) || (existente && existente.homebrewId) || null,
    }));
    if (!nova) return null;

    ordem.personalizacoes = lista(ordem).filter(function (p) { return !p || p.aquisicao !== aquisicao; });
    ordem.personalizacoes.push(nova);
    return nova;
  }

  function restaurar(ordem, aquisicao) {
    var antes = lista(ordem).length;
    ordem.personalizacoes = lista(ordem).filter(function (p) { return !p || p.aquisicao !== aquisicao; });
    return ordem.personalizacoes.length !== antes;
  }

  function marcarHomebrew(ordem, aquisicao, homebrewId) {
    var p = daAquisicao(ordem, aquisicao);
    if (!p) return false;
    p.homebrewId = homebrewId || null;
    return true;
  }

  /* As aquisições cujos efeitos não entram na conta: desligados numa
     versão personalizada ou excluídos da ficha. É isto — e só isto — que
     o motor de progressão lê. */
  function desativadas(ordem) {
    var saida = {};
    (ordem && Array.isArray(ordem.personalizacoes) ? ordem.personalizacoes : []).forEach(function (p) {
      if (p && p.efeitos === EFEITOS.DESATIVADOS && p.aquisicao) saida[p.aquisicao] = true;
    });
    (ordem && Array.isArray(ordem.excluidas) ? ordem.excluidas : []).forEach(function (x) {
      if (x && x.aquisicao) saida[x.aquisicao] = true;
    });
    return saida;
  }

  /* ---------------- excluídas ---------------- */

  function normalizarExcluidas(listaBruta) {
    var vistas = {};
    var saida = [];
    (Array.isArray(listaBruta) ? listaBruta : []).forEach(function (b) {
      if (!b || typeof b !== "object") return;
      var aquisicao = U.aparar(b.aquisicao, LIMITES.aquisicao);
      if (!aquisicao || !PADRAO_AQUISICAO.test(aquisicao) || vistas[aquisicao]) return;
      vistas[aquisicao] = true;
      saida.push({
        id: U.aparar(b.id, 60) || U.uuid(),
        aquisicao: aquisicao,
        poder: U.aparar(b.poder, LIMITES.poder),
        nome: U.aparar(b.nome, 120) || "Habilidade oficial",
        excluidaEm: dataValida(b.excluidaEm, U.agoraISO()),
      });
    });
    return saida.slice(0, LIMITES.quantidade);
  }

  function listaExcluidas(ordem) {
    if (!ordem) return [];
    if (!Array.isArray(ordem.excluidas)) ordem.excluidas = [];
    return ordem.excluidas;
  }

  function excluida(ordem, aquisicao) {
    return listaExcluidas(ordem).filter(function (x) { return x && x.aquisicao === aquisicao; })[0] || null;
  }

  function excluir(ordem, aquisicao, poder, nome) {
    if (!aquisicao || !PADRAO_AQUISICAO.test(aquisicao)) return null;
    var ja = excluida(ordem, aquisicao);
    if (ja) return ja;
    var registro = normalizarExcluidas([{ aquisicao: aquisicao, poder: poder, nome: nome, excluidaEm: U.agoraISO() }])[0];
    listaExcluidas(ordem).push(registro);
    return registro;
  }

  function reincluir(ordem, aquisicao) {
    var antes = listaExcluidas(ordem).length;
    ordem.excluidas = listaExcluidas(ordem).filter(function (x) { return !x || x.aquisicao !== aquisicao; });
    return ordem.excluidas.length !== antes;
  }

  /* Apaga tudo o que se prende a estas aquisições: personalização e
     exclusão. Usado quando a escolha que as originou é desfeita. */
  function esquecerAquisicoes(ordem, ids) {
    var alvo = {};
    (ids || []).forEach(function (id) { alvo[id] = true; });
    ordem.personalizacoes = lista(ordem).filter(function (p) { return !p || !alvo[p.aquisicao]; });
    ordem.excluidas = listaExcluidas(ordem).filter(function (x) { return !x || !alvo[x.aquisicao]; });
  }

  /* As personalizações sem aquisição correspondente no estado atual. */
  function semAquisicao(ordem, idsAtuais) {
    var existe = {};
    (idsAtuais || []).forEach(function (id) { existe[id] = true; });
    return lista(ordem).filter(function (p) { return p && !existe[p.aquisicao]; });
  }

  /* O conteúdo como habilidade comum da árvore — para recuperar uma
     personalização órfã ou salvá-la na biblioteca. */
  function comoHabilidade(p) {
    var H = global.RAMAHabilidades;
    var dados = { nome: p.nome, texto: p.texto, origem: p.origem, cor: p.cor, negrito: p.negrito, etiqueta: p.etiqueta };
    return H ? H.criarHabilidade(dados) : dados;
  }

  global.RAMAOrdemPersonalizacao = {
    EFEITOS: EFEITOS,
    LIMITES: LIMITES,
    normalizar: normalizar,
    normalizarUma: normalizarUma,
    daAquisicao: daAquisicao,
    salvar: salvar,
    restaurar: restaurar,
    marcarHomebrew: marcarHomebrew,
    desativadas: desativadas,
    normalizarExcluidas: normalizarExcluidas,
    excluida: excluida,
    excluir: excluir,
    reincluir: reincluir,
    esquecerAquisicoes: esquecerAquisicoes,
    semAquisicao: semAquisicao,
    comoHabilidade: comoHabilidade,
  };
})(typeof window !== "undefined" ? window : globalThis);
