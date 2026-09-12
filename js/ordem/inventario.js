/* =====================================================================
   R.A.M.A. — Ordem Paranormal · dados de item
   =====================================================================
   O que um item precisa ter para as regras de Ordem: espaços,
   quantidade, categoria e grupo.

   ---------------------------------------------------------------------
   ESPAÇO NÃO É PESO
   ---------------------------------------------------------------------

   A ficha universal mede o inventário em PESO, um número livre que a
   mesa inventa. Ordem Paranormal mede em ESPAÇOS de item (OPRPG p.53):
   "Por padrão, um item ocupa 1 espaço". Não existe conversão entre os
   dois, e este arquivo não tenta fazer uma.

   Por isso os dados de Ordem vivem num bloco próprio do item, `ordem`,
   e o `peso` universal fica intocado. Uma ficha universal nunca ganha
   esse bloco; uma ficha de Ordem nunca olha para o peso.

   ---------------------------------------------------------------------
   TRÊS NÚMEROS QUE NÃO SE CONFUNDEM
   ---------------------------------------------------------------------

     quantidade   quantas UNIDADES deste item a ficha tem
                  (3 granadas de fumaça)
     espacos      quanto UMA unidade ocupa
     categoria    o quão raro o item é: 0, I, II, III ou IV. É ela que
                  conta contra o LIMITE POR CATEGORIA da patente — que é
                  outra coisa: quantos itens daquela categoria a Ordem
                  libera por missão

   ---------------------------------------------------------------------
   AUSENTE É DIFERENTE DE ZERO
   ---------------------------------------------------------------------

   `espacos: null` quer dizer "não informado" e vale o padrão do livro
   (1 espaço). `espacos: 0` quer dizer "ocupa nada" — a caneta, a
   mochila militar. A tela mostra os dois de jeitos diferentes.

   `categoria: null` quer dizer "não informada": o item não conta em
   nenhuma categoria e aparece listado como pendente de classificação,
   em vez de ser jogado em categoria 0 às escondidas.
   ===================================================================== */

(function (global) {
  "use strict";

  var GRUPOS = [
    { valor: "arma", rotulo: "Arma" },
    { valor: "municao", rotulo: "Munição" },
    { valor: "protecao", rotulo: "Proteção" },
    { valor: "geral", rotulo: "Equipamento geral" },
    { valor: "paranormal", rotulo: "Item paranormal" },
  ];

  var ROMANOS = ["0", "I", "II", "III", "IV"];

  var LIMITES = {
    espacos: 99,
    quantidade: 999,
    capacidadeItem: 50,
    /* O ajuste temporário de capacidade. Um intervalo largo o bastante
       para qualquer mesa, estreito o bastante para um erro de digitação
       (+500) não passar despercebido. */
    ajusteTemporario: 99,
  };

  function grupoPadrao(tipo) {
    if (tipo === "arma") return "arma";
    if (tipo === "armadura") return "protecao";
    return "geral";
  }

  /* OPRPG p.53: um item ocupa 1 espaço por padrão, e "a própria mochila
     não ocupa um espaço". */
  function espacosPadrao(tipo) {
    return tipo === "mochila" ? 0 : 1;
  }

  function inteiro(valor, padrao) {
    var n = parseInt(valor, 10);
    return Number.isFinite(n) ? n : padrao;
  }

  function categoriaValida(valor) {
    if (valor === null || valor === undefined || valor === "") return null;
    var n = inteiro(valor, NaN);
    if (!Number.isFinite(n) || n < 0 || n > 4) return null;
    return n;
  }

  /* Espaços andam em quartos: o Sobrevivendo ao Horror tem itens de meio
     espaço, e Inventário Organizado os reduz a um quarto (SAH p.34). */
  function espacosValidos(valor) {
    if (valor === null || valor === undefined || valor === "") return null;
    var n = Number(String(valor).replace(",", "."));
    if (!Number.isFinite(n) || n < 0 || n > LIMITES.espacos) return null;
    return Math.round(n * 4) / 4;
  }

  function normalizarDados(bruto, tipo) {
    var b = (bruto && typeof bruto === "object") ? bruto : {};
    var grupo = GRUPOS.some(function (g) { return g.valor === b.grupo; }) ? b.grupo : grupoPadrao(tipo);

    return {
      categoria: categoriaValida(b.categoria),
      espacos: espacosValidos(b.espacos),
      quantidade: Math.max(1, Math.min(LIMITES.quantidade, inteiro(b.quantidade, 1))),
      grupo: grupo,
      /* Quanto este item AUMENTA a capacidade de carga — a Mochila
         Militar dá +2 (OPRPG p.66). Nunca negativo: item que atrapalha
         a carga é ajuste da mesa, não propriedade do item. */
      capacidade: Math.max(0, Math.min(LIMITES.capacidadeItem, inteiro(b.capacidade, 0))),
    };
  }

  /* Os dados de Ordem de um item qualquer, com padrões. Um item que
     nunca passou por uma ficha de Ordem não tem o bloco — e ainda assim
     precisa ocupar espaço: o padrão do livro. */
  function dadosDoItem(item) {
    if (!item || typeof item !== "object") return normalizarDados(null, "item");
    var bruto = item.ordem;
    if (!bruto && item.espacos !== undefined) bruto = { espacos: item.espacos };
    return normalizarDados(bruto, item.tipo);
  }

  function espacosDoItem(item) {
    var d = dadosDoItem(item);
    var padrao = d.espacos === null;
    return {
      unitario: padrao ? espacosPadrao(item && item.tipo) : d.espacos,
      padrao: padrao,
      quantidade: d.quantidade,
    };
  }

  function rotuloCategoria(n) {
    return (n === null || n === undefined) ? "sem categoria" : ROMANOS[n];
  }

  function rotuloEspacos(n) {
    var v = Math.round(Number(n) * 100) / 100;
    return String(v).replace(".", ",");
  }

  /* =================================================================
     VALIDAÇÃO DE ENTRADA
     -----------------------------------------------------------------
     Cada uma devolve { ok, valor, mensagem }. A tela mostra a mensagem
     sem apagar o que foi digitado.
     ================================================================= */

  function validarEspacos(texto) {
    var bruto = String(texto === undefined || texto === null ? "" : texto).trim();
    if (!bruto) return { ok: true, valor: null };
    var n = Number(bruto.replace(",", "."));
    if (!Number.isFinite(n)) return { ok: false, mensagem: "Use um número: 1, 2 ou 0,5." };
    if (n < 0) return { ok: false, mensagem: "Espaço não pode ser negativo." };
    if (n > LIMITES.espacos) return { ok: false, mensagem: "No máximo " + LIMITES.espacos + " espaços por unidade." };
    if (Math.round(n * 4) !== n * 4) return { ok: false, mensagem: "Use frações de quarto: 0,25, 0,5, 0,75…" };
    return { ok: true, valor: n };
  }

  function validarQuantidade(texto) {
    var bruto = String(texto === undefined || texto === null ? "" : texto).trim();
    if (!bruto) return { ok: true, valor: 1 };
    if (!/^\d+$/.test(bruto)) return { ok: false, mensagem: "A quantidade é um número inteiro a partir de 1." };
    var n = parseInt(bruto, 10);
    if (n < 1) return { ok: false, mensagem: "A quantidade começa em 1. Para tirar o item, remova-o." };
    if (n > LIMITES.quantidade) return { ok: false, mensagem: "No máximo " + LIMITES.quantidade + " unidades." };
    return { ok: true, valor: n };
  }

  function validarCapacidadeItem(texto) {
    var bruto = String(texto === undefined || texto === null ? "" : texto).trim();
    if (!bruto) return { ok: true, valor: 0 };
    if (!/^\d+$/.test(bruto)) return { ok: false, mensagem: "Use um número inteiro de espaços, a partir de 0." };
    var n = parseInt(bruto, 10);
    if (n > LIMITES.capacidadeItem) return { ok: false, mensagem: "No máximo +" + LIMITES.capacidadeItem + " espaços." };
    return { ok: true, valor: n };
  }

  /* O ajuste temporário de capacidade aceita sinal: "+5", "-2", "0". */
  function validarAjusteTemporario(texto) {
    var bruto = String(texto === undefined || texto === null ? "" : texto).trim().replace("−", "-");
    if (!bruto) return { ok: true, valor: 0 };
    if (!/^[+-]?\d+$/.test(bruto)) return { ok: false, mensagem: "Use um número inteiro com sinal: +5, -2 ou 0." };
    var n = parseInt(bruto, 10);
    if (Math.abs(n) > LIMITES.ajusteTemporario) {
      return { ok: false, mensagem: "O ajuste vai de −" + LIMITES.ajusteTemporario + " a +" + LIMITES.ajusteTemporario + " espaços." };
    }
    return { ok: true, valor: n };
  }

  /* O limite manual de uma categoria: vazio ou "sem limite" é ilimitado
     (null), número é o máximo — e 0 é "nenhum". Os dois nunca se
     confundem. */
  function validarLimite(texto, semLimite) {
    if (semLimite) return { ok: true, valor: null };
    var bruto = String(texto === undefined || texto === null ? "" : texto).trim();
    if (!/^\d+$/.test(bruto)) return { ok: false, mensagem: "Use um número inteiro a partir de 0, ou marque “sem limite”." };
    var n = parseInt(bruto, 10);
    if (n > 99) return { ok: false, mensagem: "No máximo 99 itens por categoria." };
    return { ok: true, valor: n };
  }

  global.RAMAOrdemInventario = {
    GRUPOS: GRUPOS,
    LIMITES: LIMITES,
    ROMANOS: ROMANOS,

    grupoPadrao: grupoPadrao,
    espacosPadrao: espacosPadrao,
    normalizarDados: normalizarDados,
    dadosDoItem: dadosDoItem,
    espacosDoItem: espacosDoItem,
    rotuloCategoria: rotuloCategoria,
    rotuloEspacos: rotuloEspacos,
    categoriaValida: categoriaValida,

    validarEspacos: validarEspacos,
    validarQuantidade: validarQuantidade,
    validarCapacidadeItem: validarCapacidadeItem,
    validarAjusteTemporario: validarAjusteTemporario,
    validarLimite: validarLimite,
  };
})(typeof window !== "undefined" ? window : globalThis);
