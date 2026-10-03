/* =====================================================================
   R.A.M.A. — personagens-organizacao.js
   A conta da página Personagens (v2.26): o que aparece, dada a pasta
   aberta, a busca, o filtro de sistema e o agrupamento. Sem DOM e sem
   rede — a página desenha, este arquivo decide. Testado em
   testes/executar-pastas.js.

   As duas organizações são independentes:
   - a PASTA escolhe a seleção: "todos" (todas as pastas), "sem-pasta"
     (só as fichas fora de pasta) ou o id de uma pasta;
   - busca e sistema filtram DENTRO da seleção;
   - agrupar por sistema só arruma o resultado em grupos. Nada aqui muda
     a pasta de ninguém.
   ===================================================================== */

(function (global) {
  "use strict";

  var TODOS = "todos";
  var SEM_PASTA = "sem-pasta";

  function U() { return global.RAMAUtil; }
  function S() { return global.RAMASistemas; }

  /* O sistema de um registro da listagem. `sistema` nulo quer dizer que
     o servidor ainda não sabe (ficha que não passou pelo índice, ou um
     servidor anterior à v2.26) — o que é diferente de ficha antiga
     (texto vazio, o modelo universal). */
  function sistemaDe(p) {
    if (!p || p.sistema === null || p.sistema === undefined) {
      return { id: "?", nome: "Sistema a identificar", curto: "?", conhecido: false, antigo: false, pendente: true, ordem: 1000 };
    }
    return S().de(p.sistema);
  }

  /* A pasta aberta, conferida: um id que não existe mais vira "todos". */
  function selecaoValida(pasta, pastas) {
    if (pasta === TODOS || pasta === SEM_PASTA) return pasta;
    return (pastas || []).some(function (x) { return x.id === pasta; }) ? pasta : TODOS;
  }

  function daSelecao(registros, pasta) {
    if (pasta === TODOS) return registros.slice();
    if (pasta === SEM_PASTA) return registros.filter(function (p) { return !p.pastaId; });
    return registros.filter(function (p) { return p.pastaId === pasta; });
  }

  /* A busca de sempre: nome, campanha, classe e origem. */
  function casaBusca(p, chave) {
    if (!chave) return true;
    return U().chaveDeBusca([p.nome, p.campanha, p.classe, p.origem].join(" ")).indexOf(chave) >= 0;
  }

  function filtrar(registros, filtros) {
    var f = filtros || {};
    var chave = U().chaveDeBusca(f.busca || "");
    return registros.filter(function (p) {
      if (f.sistema && sistemaDe(p).id !== f.sistema) return false;
      return casaBusca(p, chave);
    });
  }

  /* Os sistemas presentes numa lista, com quantos de cada, na ordem do
     registro. Os conhecidos aparecem sempre (com zero), para o filtro
     não mudar de forma conforme a pasta. */
  function sistemasPresentes(registros) {
    var mapa = {};
    S().lista().forEach(function (s) { mapa[s.id] = { sistema: s, n: 0 }; });
    registros.forEach(function (p) {
      var s = sistemaDe(p);
      if (!mapa[s.id]) mapa[s.id] = { sistema: s, n: 0 };
      mapa[s.id].n++;
    });
    return Object.keys(mapa).map(function (k) { return mapa[k]; })
      .sort(function (a, b) { return S().comparar(a.sistema, b.sistema); });
  }

  /* Grupos por sistema, só os que têm alguém, na ordem do registro. A
     ordem dentro de cada grupo é a da lista recebida. */
  function agrupar(registros) {
    var grupos = {};
    registros.forEach(function (p) {
      var s = sistemaDe(p);
      if (!grupos[s.id]) grupos[s.id] = { sistema: s, itens: [] };
      grupos[s.id].itens.push(p);
    });
    return Object.keys(grupos).map(function (k) { return grupos[k]; })
      .sort(function (a, b) { return S().comparar(a.sistema, b.sistema); });
  }

  function contagens(registros, pastas) {
    var porPasta = {};
    (pastas || []).forEach(function (x) { porPasta[x.id] = 0; });
    var sem = 0;
    registros.forEach(function (p) {
      if (p.pastaId && porPasta[p.pastaId] !== undefined) porPasta[p.pastaId]++;
      else sem++;
    });
    return { todos: registros.length, semPasta: sem, porPasta: porPasta };
  }

  /* Quantos de cada pasta passam pela busca e pelo sistema (v2.35): a
     mesma seleção e o mesmo filtro da lista, para os ícones contarem o
     que a pasta aberta vai mostrar. */
  function contagensFiltradas(registros, pastas, filtros) {
    var porPasta = {};
    (pastas || []).forEach(function (x) { porPasta[x.id] = filtrar(daSelecao(registros, x.id), filtros).length; });
    return {
      todos: filtrar(daSelecao(registros, TODOS), filtros).length,
      semPasta: filtrar(daSelecao(registros, SEM_PASTA), filtros).length,
      porPasta: porPasta,
    };
  }

  /* A prévia de um ícone: os primeiros `n` da lista e quantos sobram. É
     só amostra — a pasta aberta mostra todos. */
  function previa(lista, n) {
    var max = Math.max(0, n || 0);
    var itens = (lista || []).slice(0, max);
    return { itens: itens, resto: Math.max(0, (lista || []).length - itens.length) };
  }

  /* Tudo o que a tela precisa de uma vez. `vazio` diz qual estado vazio
     mostrar: "nenhum" (a conta não tem personagem), "pasta" (a pasta
     aberta está vazia), "sem-pasta" (todos estão em pastas), "filtros"
     (a seleção tem gente, mas a busca/sistema não deixou ninguém) ou
     null. */
  function montar(registros, pastas, estado) {
    var e = estado || {};
    var pasta = selecaoValida(e.pasta || TODOS, pastas);
    var base = daSelecao(registros, pasta);
    var filtros = { busca: e.busca, sistema: e.sistema };
    var visiveis = filtrar(base, filtros);
    var filtrando = !!(String(e.busca || "").trim() || e.sistema);
    var vazio = null;
    if (!registros.length) vazio = "nenhum";
    else if (!base.length) vazio = pasta === SEM_PASTA ? "sem-pasta" : (pasta === TODOS ? "nenhum" : "pasta");
    else if (!visiveis.length) vazio = "filtros";
    return {
      pasta: pasta,
      base: base,
      visiveis: visiveis,
      grupos: e.agrupar ? agrupar(visiveis) : null,
      sistemas: sistemasPresentes(base),
      contagens: contagens(registros, pastas),
      /* Com busca ou sistema: quantos de cada pasta passam; sem, null. */
      filtradas: filtrando ? contagensFiltradas(registros, pastas, filtros) : null,
      filtrando: filtrando,
      vazio: vazio,
    };
  }

  global.RAMAOrganizacaoPersonagens = {
    TODOS: TODOS,
    SEM_PASTA: SEM_PASTA,
    sistemaDe: sistemaDe,
    selecaoValida: selecaoValida,
    daSelecao: daSelecao,
    filtrar: filtrar,
    sistemasPresentes: sistemasPresentes,
    agrupar: agrupar,
    contagens: contagens,
    contagensFiltradas: contagensFiltradas,
    previa: previa,
    montar: montar,
  };
})(typeof window !== "undefined" ? window : globalThis);
