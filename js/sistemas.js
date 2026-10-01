/* =====================================================================
   R.A.M.A. — sistemas.js
   O registro dos sistemas de RPG que a ficha conhece (v2.26).

   A ficha diz o seu sistema em `tipoFicha`. Este arquivo é o ÚNICO lugar
   que traduz esse identificador em nome de tela, ordem de exibição e "é
   conhecido ou não". A interface pergunta aqui; ela não testa "ordem"
   ou "universal" por conta própria. Um sistema novo entra acrescentando
   uma linha em SISTEMAS.

   Três casos, separados de propósito:
   - CONHECIDO: um id da lista.
   - ANTIGO: ficha sem tipoFicha (vazio, nulo, ausente) — anterior ao
     campo. Segue a compatibilidade de sempre do projeto (js/ficha.js):
     é o modelo universal. Mostrado como Universal.
   - DESCONHECIDO: um id que esta versão não conhece (uma versão futura,
     um arquivo de fora). Não some da lista, não vira outro sistema e
     nada é gravado por causa dele: aparece como "Sistema não
     reconhecido", com o identificador ao lado.

   Classificar não converte ficha nenhuma.
   ===================================================================== */

(function (global) {
  "use strict";

  var SISTEMAS = [
    { id: "ordem", nome: "Ordem Paranormal", curto: "Ordem" },
    { id: "universal", nome: "Universal", curto: "Universal" },
  ];

  /* A ficha sem identificação: a compatibilidade atual (js/ficha.js). */
  var DAS_FICHAS_ANTIGAS = "universal";

  var porId = {};
  SISTEMAS.forEach(function (s, i) { porId[s.id] = Object.assign({ ordem: i }, s); });

  function idDe(valor) {
    if (valor === undefined || valor === null) return "";
    return String(valor).trim().toLowerCase();
  }

  /* O sistema de um valor de tipoFicha (ou do `sistema` da listagem).
     Devolve { id, nome, curto, conhecido, antigo, ordem }. `id` é a
     chave para filtrar e agrupar: as fichas antigas caem no id do
     modelo universal; uma desconhecida guarda o próprio id. */
  function de(valor) {
    var id = idDe(valor);
    if (!id) {
      return Object.assign({}, porId[DAS_FICHAS_ANTIGAS], { conhecido: true, antigo: true });
    }
    if (porId[id]) return Object.assign({}, porId[id], { conhecido: true, antigo: false });
    return {
      id: id,
      nome: "Sistema não reconhecido (" + id + ")",
      curto: id,
      conhecido: false,
      antigo: false,
      ordem: SISTEMAS.length,
    };
  }

  /* Os sistemas conhecidos, na ordem de exibição. */
  function lista() {
    return SISTEMAS.map(function (s) { return de(s.id); });
  }

  /* Ordem de exibição: os conhecidos na ordem da lista, depois os
     desconhecidos por id. */
  function comparar(a, b) {
    if (a.ordem !== b.ordem) return a.ordem - b.ordem;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  }

  global.RAMASistemas = {
    de: de,
    lista: lista,
    comparar: comparar,
  };
})(typeof window !== "undefined" ? window : globalThis);
