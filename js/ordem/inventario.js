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
    /* Itens amaldiçoados não são "itens paranormais" no livro (OPRPG
       p. 66 e p. 144 são listas diferentes): Ferramentas Paranormais,
       por exemplo, não os alcança. */
    { valor: "amaldicoado", rotulo: "Item amaldiçoado" },
  ];

  /* Categorias válidas vão de 0 a IV. Os romanos seguintes existem para
     MOSTRAR uma categoria efetiva acima de IV — um item com modificações
     e maldições demais —, que nunca é gravada. */
  var ROMANOS = ["0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

  /* Os valores fechados dos dados de arma e proteção de Ordem. */
  var PROFICIENCIAS_ARMA = ["simples", "tatica", "pesada"];
  var TIPOS_ARMA = ["corpoACorpo", "arremesso", "disparo", "fogo", "distancia"];
  var EMPUNHADURAS = ["leve", "umaMao", "duasMaos"];
  var ALCANCES = ["curto", "medio", "longo", "extremo"];
  var ATRIBUTOS_DANO = ["for", "agi", "melhor"];
  var TIPOS_PROTECAO = ["leve", "pesada", "escudo"];
  var ELEMENTOS = ["sangue", "morte", "conhecimento", "energia", "medo", "varia"];
  var MARCADORES = ["acessorio", "utensilio", "vestimenta", "eletrico", "camera", "corpoACorpo", "besta", "balas"];
  var FONTES = ["OPRPG", "SAH"];
  var MAX_MODIFICACOES = 12;
  var DADO = /^[1-9]\d{0,2}d([1-9]\d{0,2})$/;

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

  /* Espaços aceitam qualquer número, guardado com duas casas decimais —
     a mesma precisão com que a carga é somada e mostrada. Até a v2.5.2
     eles andavam em quartos (0,25, 0,5…), por causa dos itens de meio
     espaço do SAH; a mesa pode precisar de outros valores. */
  function arredondarEspacos(n) {
    return Math.round(n * 100) / 100;
  }

  function espacosValidos(valor) {
    if (valor === null || valor === undefined || valor === "") return null;
    var n = Number(String(valor).replace(",", "."));
    if (!Number.isFinite(n) || n < 0 || n > LIMITES.espacos) return null;
    return arredondarEspacos(n);
  }

  function normalizarDados(bruto, tipo) {
    var b = (bruto && typeof bruto === "object") ? bruto : {};
    var grupo = GRUPOS.some(function (g) { return g.valor === b.grupo; }) ? b.grupo : grupoPadrao(tipo);

    var dados = {
      categoria: categoriaValida(b.categoria),
      espacos: espacosValidos(b.espacos),
      quantidade: Math.max(1, Math.min(LIMITES.quantidade, inteiro(b.quantidade, 1))),
      grupo: grupo,
      /* Quanto este item AUMENTA a capacidade de carga — a Mochila
         Militar dá +2 (OPRPG p.66). Nunca negativo: item que atrapalha
         a carga é ajuste da mesa, não propriedade do item. */
      capacidade: Math.max(0, Math.min(LIMITES.capacidadeItem, inteiro(b.capacidade, 0))),
    };
    /* Proteção em uso: é ela que soma na Defesa (regras.js,
       protecaoEmUso). O campo só aparece quando é verdade — nenhum item
       antigo ganha campo novo. */
    if (tipo === "armadura" && b.emUso === true) dados.emUso = true;

    /* Os campos abaixo vieram com o catálogo de itens (v2.13). Cada um
       só existe quando tem valor: um item antigo, ou criado à mão sem
       eles, continua exatamente como era. */
    if (tipo === "arma") {
      var pericia = periciaValida(b.pericia);
      if (pericia) dados.pericia = pericia;
      var arma = armaValida(b.arma);
      if (arma) dados.arma = arma;
    }
    if (tipo === "armadura" && b.protecao && TIPOS_PROTECAO.indexOf(b.protecao.tipo) >= 0) {
      dados.protecao = { tipo: b.protecao.tipo };
    }
    if (b.amaldicoado === true) dados.amaldicoado = true;
    if (ELEMENTOS.indexOf(b.elemento) >= 0) dados.elemento = b.elemento;
    var marcadores = (Array.isArray(b.marcadores) ? b.marcadores : []).filter(function (m, i, lista) {
      return MARCADORES.indexOf(m) >= 0 && lista.indexOf(m) === i;
    });
    if (marcadores.length) dados.marcadores = marcadores;
    var ref = referenciaValida(b.referencia);
    if (ref) dados.referencia = ref;
    var mods = (Array.isArray(b.modificacoes) ? b.modificacoes : []).map(modificacaoValida).filter(Boolean).slice(0, MAX_MODIFICACOES);
    if (mods.length) dados.modificacoes = mods;
    /* Contagem de munição (v2.20, regra opcional): o que está carregado
       numa arma e o que já saiu dos pacotes de uma munição. Sem o módulo
       (uma página que não conta munição), passa como veio. */
    if (b.contagem && typeof b.contagem === "object") {
      var CS = global.RAMAOrdemConsumo;
      var contagem = CS ? CS.contagemValida(b.contagem, tipo, dados.grupo) : JSON.parse(JSON.stringify(b.contagem));
      if (contagem) dados.contagem = contagem;
    }
    return dados;
  }

  function textoCurto(v, limite) {
    return String(v === null || v === undefined ? "" : v).trim().slice(0, limite);
  }

  function dadoValido(v) {
    var s = textoCurto(v, 12).toLowerCase().replace(/\s+/g, "");
    return DADO.test(s) ? s : "";
  }

  function inteiroEntre(v, min, max) {
    var n = Math.round(Number(v));
    if (!Number.isFinite(n)) return 0;
    return Math.max(min, Math.min(max, n));
  }

  function periciaValida(chave) {
    if (typeof chave !== "string" || !/^[a-z]{2,20}$/.test(chave)) return "";
    var C = global.RAMAOrdemCatalogo;
    if (C && C.pericia && !C.pericia(chave)) return "";
    return chave;
  }

  function referenciaValida(r) {
    if (!r || typeof r !== "object" || FONTES.indexOf(r.fonte) < 0) return null;
    var pagina = inteiroEntre(r.pagina, 0, 999);
    return pagina ? { fonte: r.fonte, pagina: pagina } : null;
  }

  /* O bloco `arma` de Ordem: o que a arma é e como ela ataca. Valores
     fora das listas fechadas são descartados, nunca inventados. */
  function armaValida(a) {
    if (!a || typeof a !== "object") return null;
    var saida = {};
    if (PROFICIENCIAS_ARMA.indexOf(a.proficiencia) >= 0) saida.proficiencia = a.proficiencia;
    if (TIPOS_ARMA.indexOf(a.tipo) >= 0) saida.tipo = a.tipo;
    if (EMPUNHADURAS.indexOf(a.empunhadura) >= 0) saida.empunhadura = a.empunhadura;
    if (ALCANCES.indexOf(a.alcance) >= 0) saida.alcance = a.alcance;
    var tipoDano = textoCurto(a.tipoDano, 20);
    if (tipoDano) saida.tipoDano = tipoDano;
    var municao = textoCurto(a.municao, 80);
    if (municao) saida.municao = municao;
    if (ATRIBUTOS_DANO.indexOf(a.atributoDano) >= 0) saida.atributoDano = a.atributoDano;
    ["agil", "arremessavel", "automatica", "desarmado", "semMunicao"].forEach(function (k) {
      if (a[k] === true) saida[k] = true;
    });
    var dadosAtaque = inteiroEntre(a.dadosAtaque, -5, 5);
    if (dadosAtaque) saida.dadosAtaque = dadosAtaque;
    var bonusAtaque = inteiroEntre(a.bonusAtaque, -20, 20);
    if (bonusAtaque) saida.bonusAtaque = bonusAtaque;
    if (a.danoAlternativo && typeof a.danoAlternativo === "object") {
      var alt = dadoValido(a.danoAlternativo.dano);
      if (alt) saida.danoAlternativo = { dano: alt, rotulo: textoCurto(a.danoAlternativo.rotulo, 30) || "alternativo" };
    }
    if (Array.isArray(a.danoPorD6) && a.danoPorD6.length === 6) {
      var tabela = a.danoPorD6.map(dadoValido);
      if (tabela.every(Boolean)) saida.danoPorD6 = tabela;
    }
    var capacidade = inteiroEntre(a.capacidade, 0, 999);
    if (capacidade) saida.capacidade = capacidade;
    var semEspaco = periciaValida(a.semEspacoSeTreinado);
    if (semEspaco) saida.semEspacoSeTreinado = semEspaco;
    return Object.keys(saida).length ? saida : null;
  }

  /* Uma modificação ou maldição aplicada: um RETRATO com os números que
     a regra usa, copiados na hora. Mudar o catálogo depois não mexe nela. */
  var CAMPOS_DE_CALCULO = {
    ataque: [-20, 20], dano: [-20, 20], dadosDano: [-5, 5], margem: [-10, 10],
    alcance: [-3, 3], alcanceSeDistancia: [-3, 3], espacos: [-10, 10], defesa: [-20, 20],
  };

  function modificacaoValida(m) {
    if (!m || typeof m !== "object") return null;
    var nome = textoCurto(m.nome, 80);
    if (!nome) return null;
    var natureza = m.natureza === "maldicao" ? "maldicao" : "modificacao";
    var saida = {
      id: textoCurto(m.id, 60) || (global.RAMAUtil && global.RAMAUtil.uuid ? global.RAMAUtil.uuid() : nome),
      catalogoId: textoCurto(m.catalogoId, 80),
      nome: nome,
      natureza: natureza,
    };
    var resumo = textoCurto(m.resumo, 300);
    if (resumo) saida.resumo = resumo;
    if (ELEMENTOS.indexOf(m.elemento) >= 0) saida.elemento = m.elemento;
    var escolha = textoCurto(m.escolha, 60);
    if (escolha) saida.escolha = escolha;
    var ref = referenciaValida(m.referencia);
    if (ref) saida.referencia = ref;
    if (m.semAcrescimoDeCategoria === true) saida.semAcrescimoDeCategoria = true;
    if (m.calculo && typeof m.calculo === "object") {
      var calculo = {};
      Object.keys(CAMPOS_DE_CALCULO).forEach(function (k) {
        var limites = CAMPOS_DE_CALCULO[k];
        var v = inteiroEntre(m.calculo[k], limites[0], limites[1]);
        if (v) calculo[k] = v;
      });
      if (m.calculo.margemDobra === true) calculo.margemDobra = true;
      if (m.calculo.automatica === true) calculo.automatica = true;
      if (Object.keys(calculo).length) saida.calculo = calculo;
    }
    return saida;
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
    if (n === null || n === undefined) return "sem categoria";
    return ROMANOS[n] !== undefined ? ROMANOS[n] : String(n);
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
    return { ok: true, valor: arredondarEspacos(n) };
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
    TIPOS_ARMA: TIPOS_ARMA,
    PROFICIENCIAS_ARMA: PROFICIENCIAS_ARMA,
    EMPUNHADURAS: EMPUNHADURAS,
    ALCANCES: ALCANCES,
    TIPOS_PROTECAO: TIPOS_PROTECAO,
    ELEMENTOS: ELEMENTOS,

    grupoPadrao: grupoPadrao,
    espacosPadrao: espacosPadrao,
    normalizarDados: normalizarDados,
    dadosDoItem: dadosDoItem,
    espacosDoItem: espacosDoItem,
    rotuloCategoria: rotuloCategoria,
    rotuloEspacos: rotuloEspacos,
    categoriaValida: categoriaValida,
    armaValida: armaValida,
    modificacaoValida: modificacaoValida,

    validarEspacos: validarEspacos,
    validarQuantidade: validarQuantidade,
    validarCapacidadeItem: validarCapacidadeItem,
    validarAjusteTemporario: validarAjusteTemporario,
    validarLimite: validarLimite,
  };
})(typeof window !== "undefined" ? window : globalThis);
