/* =====================================================================
   R.A.M.A. — Ordem Paranormal · catálogo de itens
   =====================================================================
   O que se faz com os dados de js/ordem/itens-dados.js: carregar sob
   demanda, normalizar, buscar, filtrar, descrever e transformar uma
   entrada num ITEM DE FICHA. Sem tela: a janela "Da biblioteca" fica em
   js/paginas/ficha-inventario-biblioteca.js.

   ---------------------------------------------------------------------
   CÓPIA, NUNCA VÍNCULO
   ---------------------------------------------------------------------

   paraInventario() devolve os dados de um item NOVO, com todos os
   campos preenchidos a partir da entrada — dano, crítico, Defesa,
   espaços, categoria, perícia de ataque — e `origemCatalogoId` como
   rastro. A ficha guarda a cópia inteira: o catálogo pode mudar, ser
   corrigido ou nem estar carregado, e o item da ficha continua igual.
   O catálogo carregado é congelado (Object.freeze): nenhuma tela
   consegue alterá-lo por engano ao mexer numa cópia.

   ---------------------------------------------------------------------
   MODIFICAÇÕES E MALDIÇÕES NÃO SÃO OBJETOS
   ---------------------------------------------------------------------

   Elas não entram no inventário. Aplicadas a um item, viram uma entrada
   em `ordem.modificacoes` dele, com os números que as regras usam
   (`calculo`) copiados na hora. A categoria e os espaços EFETIVOS saem
   daí em js/ordem/regras.js — o valor-base do item nunca é reescrito.
   ===================================================================== */

(function (global) {
  "use strict";

  function C() { return global.RAMAOrdemCatalogo; }

  var ARQUIVO_DADOS = "js/ordem/itens-dados.js";
  var PRAZO_CARGA_MS = 20000;

  var ABAS = [
    { chave: "armas", rotulo: "Armas" },
    { chave: "municoes", rotulo: "Munições" },
    { chave: "protecoes", rotulo: "Proteções" },
    { chave: "geral", rotulo: "Geral" },
    { chave: "amaldicoados", rotulo: "Itens Amaldiçoados" },
  ];

  /* O texto da gaveta do inventário (o campo livre "categoria" do item,
     que o filtro da aba usa). Não confundir com a categoria 0–IV. */
  var GAVETA_DA_ABA = {
    armas: "Armas", municoes: "Munições", protecoes: "Proteções", geral: "Geral", amaldicoados: "Itens amaldiçoados",
  };

  var SECOES = {
    armas: [
      { chave: "simples", titulo: "Armas simples" },
      { chave: "taticas", titulo: "Armas táticas" },
      { chave: "pesadas", titulo: "Armas pesadas" },
      { chave: "modificacoes", titulo: "Modificações para armas",
        nota: "Não são itens: aplicam-se a uma arma do inventário. Cada uma soma I à categoria dela, e iguais não se acumulam." },
    ],
    municoes: [
      { chave: "municoes", titulo: "Munições",
        nota: "A unidade é o pacote, que dura cenas — não um número de balas. A quantidade é de pacotes." },
      { chave: "modificacoes", titulo: "Modificações para munições",
        nota: "Aplicam-se a um pacote de balas curtas ou longas do inventário e somam I à categoria dele." },
    ],
    protecoes: [
      { chave: "protecoes", titulo: "Proteções" },
      { chave: "modificacoes", titulo: "Modificações para proteções",
        nota: "Aplicam-se a uma proteção do inventário. Cada uma soma I à categoria dela." },
    ],
    geral: [
      { chave: "acessorios", titulo: "Acessórios" },
      { chave: "explosivos", titulo: "Explosivos" },
      { chave: "operacionais", titulo: "Itens operacionais" },
      { chave: "paranormais", titulo: "Itens paranormais" },
      { chave: "modificacoes", titulo: "Modificações para acessórios e itens paranormais",
        nota: "Aplicam-se a um item do inventário. As de acessório somam I à categoria dele." },
    ],
    amaldicoados: [
      { chave: "especiais", titulo: "Itens amaldiçoados",
        nota: "Salvo indicação, categoria II e 1 espaço. Só liberados para agente especial, oficial de operações e agente de elite." },
      { chave: "maldicoesArmas", titulo: "Maldições para armas",
        nota: "Aplicam-se a uma arma do inventário. A primeira maldição de um item soma II à categoria; as seguintes, I." },
      { chave: "maldicoesProtecoes", titulo: "Maldições para proteções",
        nota: "Aplicam-se a uma proteção do inventário. A primeira maldição soma II à categoria; as seguintes, I." },
      { chave: "maldicoesAcessorios", titulo: "Maldições para acessórios",
        nota: "Só em utensílios e vestimentas. A primeira maldição soma II à categoria; as seguintes, I." },
    ],
  };

  var ROTULO_FONTE = { OPRPG: "Livro básico", SAH: "Sobrevivendo ao Horror" };
  var NOME_FONTE = { OPRPG: "Ordem Paranormal RPG", SAH: "Sobrevivendo ao Horror" };
  var SIGLA_FONTE = { OPRPG: "LB", SAH: "SAH" };

  var PROFICIENCIAS = { simples: "Arma simples", tatica: "Arma tática", pesada: "Arma pesada" };
  var PROFICIENCIAS_PLURAL = { simples: "armas simples", tatica: "armas táticas", pesada: "armas pesadas" };
  var TIPOS_ARMA = { corpoACorpo: "Corpo a corpo", arremesso: "Arremesso", disparo: "Disparo", fogo: "Fogo", distancia: "À distância" };
  var EMPUNHADURAS = { leve: "Leve", umaMao: "Uma mão", duasMaos: "Duas mãos" };
  var ALCANCES = ["curto", "medio", "longo", "extremo"];
  var ROTULO_ALCANCE = { curto: "Curto (9 m)", medio: "Médio (18 m)", longo: "Longo (36 m)", extremo: "Extremo (90 m)" };
  var TIPOS_DANO = { C: "Corte", I: "Impacto", P: "Perfuração", B: "Balístico" };
  var TIPOS_PROTECAO = { leve: "Proteção leve", pesada: "Proteção pesada", escudo: "Escudo" };
  var ELEMENTOS = { sangue: "Sangue", morte: "Morte", conhecimento: "Conhecimento", energia: "Energia", medo: "Medo", varia: "Varia" };

  var ROTULOS_TIPO_FILTRO = {
    corpoACorpo: "Corpo a corpo", arremesso: "Arremesso", disparo: "Disparo", fogo: "Fogo", distancia: "À distância",
    municao: "Munição",
    leve: "Proteção leve", pesada: "Proteção pesada", escudo: "Escudo",
    acessorio: "Acessório", explosivo: "Explosivo", operacional: "Item operacional", medicamento: "Medicamento", paranormal: "Item paranormal",
    amaldicoado: "Item amaldiçoado", arma: "Arma amaldiçoada",
    modificacao: "Modificação",
    maldicaoArma: "Maldição para arma", maldicaoProtecao: "Maldição para proteção", maldicaoAcessorio: "Maldição para acessório",
  };

  /* O preço de cada elemento (OPRPG p. 145), para os itens amaldiçoados. */
  var PRECO_DA_MALDICAO = {
    conhecimento: "Ao falhar em teste baseado em Intelecto, perde 2 de Sanidade por maldição de Conhecimento nos seus itens.",
    energia: "Ao falhar em teste baseado em Agilidade, perde 2 de Sanidade por maldição de Energia nos seus itens.",
    morte: "Ao falhar em teste baseado em Presença, perde 2 de Sanidade por maldição de Morte nos seus itens.",
    sangue: "Ao falhar em teste baseado em Força ou Vigor, perde 2 de Sanidade por maldição de Sangue nos seus itens.",
    medo: "Cada item de Medo tem um preço próprio, decidido pelo mestre.",
  };

  var ROMANOS = ["0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

  /* =================================================================
     UTILITÁRIOS
     ================================================================= */

  function normalizarTexto(texto) {
    return String(texto || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function categoriaDeTexto(valor) {
    if (valor === null || valor === undefined || valor === "") return null;
    if (typeof valor === "number") return valor >= 0 && valor <= 4 ? Math.round(valor) : null;
    var i = ROMANOS.indexOf(String(valor).trim().toUpperCase());
    return i >= 0 && i <= 4 ? i : null;
  }

  function rotuloCategoria(n) {
    if (n === null || n === undefined) return "—";
    return ROMANOS[n] !== undefined ? ROMANOS[n] : String(n);
  }

  function rotuloEspacos(n) {
    if (n === null || n === undefined) return "1 (padrão)";
    return String(Math.round(Number(n) * 100) / 100).replace(".", ",");
  }

  /* "19/x3" → { margem: 19, multiplicador: 3 }. Vazio é a regra geral
     do livro: crítico no 20, dano x2 (OPRPG p. 54). */
  function lerCritico(texto) {
    var t = String(texto || "").replace(/\s+/g, "").toLowerCase();
    var saida = { margem: 20, multiplicador: 2, padrao: !t };
    if (!t) return saida;
    t.split("/").forEach(function (parte) {
      var mult = /^x(\d+)$/.exec(parte);
      if (mult) { saida.multiplicador = parseInt(mult[1], 10); return; }
      var margem = /^(\d+)$/.exec(parte);
      if (margem) saida.margem = parseInt(margem[1], 10);
    });
    return saida;
  }

  function rotuloCritico(margem, multiplicador) {
    var m = Number(margem);
    var x = Number(multiplicador) || 2;
    if (!m) return "sem crítico";
    if (m >= 20) return "x" + x;
    return m + "/x" + x;
  }

  function congelar(obj) {
    if (!obj || typeof obj !== "object" || Object.isFrozen(obj)) return obj;
    Object.keys(obj).forEach(function (k) { congelar(obj[k]); });
    return Object.freeze(obj);
  }

  function copia(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }

  /* =================================================================
     NORMALIZAÇÃO DO CATÁLOGO
     ================================================================= */

  function secaoPadrao(e) {
    if (e.secao) return e.secao;
    if (e.natureza === "modificacao") return "modificacoes";
    if (e.aba === "armas" && e.arma) return e.arma.proficiencia === "tatica" ? "taticas" : (e.arma.proficiencia === "pesada" ? "pesadas" : "simples");
    return e.aba;
  }

  function tipoDoItem(e) {
    if (e.natureza !== "item") return null;
    if (e.arma) return "arma";
    if (e.protecao) return "armadura";
    return "item";
  }

  function grupoDoItem(e) {
    if (e.natureza !== "item") return null;
    if (e.aba === "armas" || (e.arma && e.aba !== "geral")) return "arma";
    if (e.aba === "municoes") return "municao";
    if (e.aba === "protecoes") return "protecao";
    if (e.aba === "amaldicoados") return "amaldicoado";
    if (e.secao === "paranormais") return "paranormal";
    return "geral";
  }

  function tipoFiltro(e) {
    if (e.natureza === "modificacao") return "modificacao";
    if (e.natureza === "maldicao") {
      if (e.secao === "maldicoesArmas") return "maldicaoArma";
      if (e.secao === "maldicoesProtecoes") return "maldicaoProtecao";
      return "maldicaoAcessorio";
    }
    if (e.aba === "armas") return e.arma.tipo;
    if (e.aba === "municoes") return "municao";
    if (e.aba === "protecoes") return e.protecao.tipo;
    if (e.aba === "amaldicoados") return e.arma ? "arma" : "amaldicoado";
    if (e.medicamento) return "medicamento";
    return { acessorios: "acessorio", explosivos: "explosivo", operacionais: "operacional", paranormais: "paranormal" }[e.secao] || "operacional";
  }

  /* A linha abaixo do nome: "Arma tática · Corpo a corpo · Duas mãos". */
  function classificacao(e) {
    if (e.natureza === "modificacao") return "Modificação · " + rotuloAplicaEm(e);
    if (e.natureza === "maldicao") return "Maldição de " + (ELEMENTOS[e.elemento] || "elemento variável") + " · " + rotuloAplicaEm(e);
    if (e.arma && e.aba !== "geral") {
      var partes = [];
      if (e.aba === "amaldicoados") partes.push("Item amaldiçoado de " + (ELEMENTOS[e.elemento] || e.elemento));
      if (e.arma.proficiencia) partes.push(PROFICIENCIAS[e.arma.proficiencia]);
      if (e.arma.tipo) partes.push(TIPOS_ARMA[e.arma.tipo]);
      if (e.arma.empunhadura) partes.push(EMPUNHADURAS[e.arma.empunhadura]);
      return partes.join(" · ");
    }
    if (e.aba === "municoes") return "Munição · " + apresentacaoDaMunicao(e.municao);
    if (e.protecao) return TIPOS_PROTECAO[e.protecao.tipo];
    if (e.aba === "amaldicoados") return "Item amaldiçoado de " + (ELEMENTOS[e.elemento] || e.elemento);
    var base = ROTULOS_TIPO_FILTRO[tipoFiltro(e)] || "Item";
    if (e.arma) base += " · usada como arma de " + TIPOS_ARMA[e.arma.tipo].toLowerCase();
    return base;
  }

  var ROTULO_APLICA_EM = {
    arma: "armas", corpoACorpo: "armas corpo a corpo", disparo: "armas de disparo", fogo: "armas de fogo",
    automatica: "armas automáticas", besta: "bestas e balestras", balas: "balas curtas e longas",
    protecao: "proteções", leve: "proteções leves", pesada: "proteções pesadas", escudo: "escudos",
    acessorio: "acessórios", utensilio: "utensílios", vestimenta: "vestimentas", eletrico: "objetos elétricos",
    camera: "câmeras de aura paranormal",
  };

  function rotuloAplicaEm(e) {
    var lista = (e.aplicaEm || []).map(function (k) { return ROTULO_APLICA_EM[k] || k; });
    if (!lista.length) return "itens";
    if (lista.length === 1) return "para " + lista[0];
    return "para " + lista.slice(0, -1).join(", ") + " e " + lista[lista.length - 1];
  }

  /* Como o livro apresenta a munição: um pacote que DURA (cenas, uma
     missão, um disparo) ou uma caixa que CONTÉM (2 dardos). As duas
     coisas não se misturam, e nenhuma vira contagem de projéteis. */
  function apresentacaoDaMunicao(m) {
    if (!m) return "";
    if (m.duracao) return m.unidade + " que dura " + m.duracao;
    if (m.conteudo) return m.unidade + " com " + m.conteudo;
    return m.unidade;
  }

  function normalizarEntrada(bruto) {
    var e = copia(bruto);
    e.natureza = e.natureza || "item";
    e.secao = secaoPadrao(e);
    e.categoria = categoriaDeTexto(e.categoria);
    e.espacos = e.espacos === null || e.espacos === undefined ? null : Math.max(0, Number(e.espacos));
    e.alias = Array.isArray(e.alias) ? e.alias : [];
    e.efeitos = Array.isArray(e.efeitos) ? e.efeitos : [];
    e.notas = Array.isArray(e.notas) ? e.notas : [];
    e.tipoItem = tipoDoItem(e);
    e.grupo = grupoDoItem(e);
    e.tipoFiltro = tipoFiltro(e);
    if (e.arma) {
      var c = lerCritico(e.arma.critico);
      e.arma.margem = c.margem;
      e.arma.multiplicador = c.multiplicador;
      e.arma.criticoPadrao = c.padrao;
    }
    e.classificacao = classificacao(e);
    e.chaveBusca = normalizarTexto([e.nome].concat(e.alias).join(" | "));
    return e;
  }

  function normalizarCatalogo(dados) {
    var itens = (dados && Array.isArray(dados.itens) ? dados.itens : []).map(normalizarEntrada);
    var porId = {};
    itens.forEach(function (e) { porId[e.id] = e; });
    return congelar({ versao: dados && dados.versao, itens: itens, porId: porId });
  }

  /* =================================================================
     CARGA SOB DEMANDA
     -----------------------------------------------------------------
     O catálogo não vem com a página: ele entra na primeira vez que
     alguém abre a biblioteca. Uma falha de rede não fica guardada — a
     próxima tentativa carrega de novo.
     ================================================================= */

  var pronto = null;
  var emCarga = null;

  function carregar() {
    if (pronto) return Promise.resolve(pronto);
    if (global.RAMAOrdemItensDados) {
      pronto = normalizarCatalogo(global.RAMAOrdemItensDados);
      return Promise.resolve(pronto);
    }
    if (emCarga) return emCarga;
    if (typeof document === "undefined" || !document.createElement) {
      return Promise.reject(new Error("sem_documento"));
    }

    emCarga = new Promise(function (ok, falha) {
      var script = document.createElement("script");
      var prazo = null;
      function terminar(erro) {
        clearTimeout(prazo);
        script.onload = script.onerror = null;
        if (erro) {
          if (script.parentNode) script.parentNode.removeChild(script);
          falha(erro);
          return;
        }
        if (!global.RAMAOrdemItensDados) { falha(new Error("vazio")); return; }
        pronto = normalizarCatalogo(global.RAMAOrdemItensDados);
        ok(pronto);
      }
      script.src = global.RAMAUtil && global.RAMAUtil.url ? global.RAMAUtil.url(ARQUIVO_DADOS) : ARQUIVO_DADOS;
      script.async = true;
      script.onload = function () { terminar(null); };
      script.onerror = function () { terminar(new Error("rede")); };
      prazo = setTimeout(function () { terminar(new Error("prazo")); }, PRAZO_CARGA_MS);
      (document.head || document.body || document.documentElement).appendChild(script);
    });

    emCarga.then(null, function () { emCarga = null; });
    return emCarga.then(function (c) { emCarga = null; return c; });
  }

  function catalogoPronto() { return pronto; }

  /* =================================================================
     BUSCA E FILTROS
     ================================================================= */

  /* filtros: { aba, busca, fonte, tipo, categoria, elemento }.
     `categoria` é "0".."4", "nula" (não informada) ou vazio. */
  function filtrar(catalogo, filtros) {
    var f = filtros || {};
    var termo = normalizarTexto(f.busca);
    return (catalogo ? catalogo.itens : []).filter(function (e) {
      if (f.aba && e.aba !== f.aba) return false;
      if (termo && e.chaveBusca.indexOf(termo) < 0) return false;
      if (f.fonte && e.fonte !== f.fonte) return false;
      if (f.tipo && e.tipoFiltro !== f.tipo) return false;
      if (f.elemento && e.elemento !== f.elemento) return false;
      if (f.categoria !== undefined && f.categoria !== null && f.categoria !== "") {
        if (f.categoria === "nula") { if (e.natureza !== "item" || e.categoria !== null) return false; }
        else if (e.natureza !== "item" || e.categoria !== parseInt(f.categoria, 10)) return false;
      }
      return true;
    });
  }

  /* Quantos resultados cada aba teria com a mesma busca e filtros —
     para a tela dizer "nada aqui, mas 2 em Geral". Fonte e busca valem
     em todas as abas; tipo e elemento são da aba atual e não passam. */
  function contagemPorAba(catalogo, filtros) {
    var f = filtros || {};
    var saida = {};
    ABAS.forEach(function (a) {
      saida[a.chave] = filtrar(catalogo, { aba: a.chave, busca: f.busca, fonte: f.fonte, categoria: f.categoria }).length;
    });
    return saida;
  }

  function ordenarPorNome(a, b) { return a.nome.localeCompare(b.nome, "pt-BR"); }

  function secoes(aba, entradas) {
    var modelos = SECOES[aba] || [];
    return modelos.map(function (s) {
      return {
        chave: s.chave, titulo: s.titulo, nota: s.nota || "",
        entradas: entradas.filter(function (e) { return e.secao === s.chave; }).sort(ordenarPorNome),
      };
    }).filter(function (s) { return s.entradas.length; });
  }

  /* As opções dos filtros de uma aba: só o que existe nela. */
  function opcoesDeFiltro(catalogo, aba) {
    var daAba = filtrar(catalogo, { aba: aba });
    function unicos(fn) {
      var vistos = {};
      daAba.forEach(function (e) { var v = fn(e); if (v !== null && v !== undefined && v !== "") vistos[v] = true; });
      return Object.keys(vistos);
    }
    var ordemTipos = Object.keys(ROTULOS_TIPO_FILTRO);
    var tipos = unicos(function (e) { return e.tipoFiltro; })
      .sort(function (a, b) { return ordemTipos.indexOf(a) - ordemTipos.indexOf(b); })
      .map(function (k) { return { valor: k, rotulo: ROTULOS_TIPO_FILTRO[k] || k }; });
    var categorias = unicos(function (e) { return e.natureza === "item" ? (e.categoria === null ? "nula" : String(e.categoria)) : null; })
      .sort()
      .map(function (k) { return { valor: k, rotulo: k === "nula" ? "Não informada" : "Categoria " + rotuloCategoria(parseInt(k, 10)) }; });
    var ordemElementos = Object.keys(ELEMENTOS);
    var elementos = unicos(function (e) { return e.elemento || null; })
      .sort(function (a, b) { return ordemElementos.indexOf(a) - ordemElementos.indexOf(b); })
      .map(function (k) { return { valor: k, rotulo: ELEMENTOS[k] || k }; });
    var fontes = unicos(function (e) { return e.fonte; })
      .map(function (k) { return { valor: k, rotulo: ROTULO_FONTE[k] || k }; });
    return { tipos: tipos, categorias: categorias, elementos: elementos, fontes: fontes };
  }

  /* =================================================================
     APRESENTAÇÃO
     ================================================================= */

  function rotuloDano(tipoDano) {
    if (!tipoDano) return "";
    return TIPOS_DANO[tipoDano] || tipoDano;
  }

  /* Os números que cabem na linha fechada. Nada vazio. */
  function resumoCompacto(e) {
    var pares = [];
    if (e.natureza === "item") {
      if (e.arma) {
        if (e.arma.dano) pares.push(["Dano", e.arma.dano + (e.arma.danoAlternativo ? " / " + e.arma.danoAlternativo.dano : "")]);
        else if (e.arma.danoPorD6) pares.push(["Dano", "varia (1d6)"]);
        pares.push(["Crítico", rotuloCritico(e.arma.margem, e.arma.multiplicador)]);
        if (e.arma.alcance) pares.push(["Alcance", (ROTULO_ALCANCE[e.arma.alcance] || e.arma.alcance).replace(/ \(.*\)$/, "")]);
        if (e.arma.tipoDano) pares.push(["Tipo", rotuloDano(e.arma.tipoDano)]);
      }
      if (e.protecao) pares.push(["Defesa", "+" + e.protecao.defesa]);
      if (e.municao && e.municao.duracao) pares.push(["Dura", e.municao.duracao]);
      if (e.municao && e.municao.conteudo) pares.push(["Conteúdo", e.municao.conteudo]);
      if (e.capacidade) pares.push(["Capacidade", "+" + e.capacidade]);
    } else {
      pares.push(["Categoria", e.natureza === "maldicao" ? "+II (1ª) · +I" : (e.semAcrescimoDeCategoria ? "não informada" : "+I")]);
    }
    return pares;
  }

  function referencia(e) {
    return (NOME_FONTE[e.fonte] || e.fonte) + ", p. " + e.pagina + (e.tabela ? " · " + e.tabela : "");
  }

  /* Regras gerais que acompanham o tipo — escritas uma vez aqui, e não
     repetidas em cada arma do arquivo de dados. */
  function regrasGerais(e) {
    var r = [];
    if (e.arma) {
      if (e.arma.agil) r.push("Arma ágil: pode usar Agilidade no lugar de Força nos testes de ataque e nas rolagens de dano (OPRPG p. 59).");
      if (e.arma.automatica) r.push("Arma automática: tiro único normal, ou rajada com −1 dado no ataque e +1 dado de dano do mesmo tipo (OPRPG p. 59).");
      if (e.arma.tipo === "fogo") r.push("Coronhada: pode atacar corpo a corpo com 1d4 de impacto (armas leves e de uma mão) ou 1d6 (de duas mãos) (OPRPG p. 59).");
      if (e.arma.capacidade) r.push("Contagem de munição (regra opcional, OPRPG p. 174): " + e.arma.capacidade + " disparo(s) antes de recarregar.");
      if (e.arma.alcance) r.push("Até o dobro do alcance, com −5 no ataque (OPRPG p. 55).");
    }
    if (e.municao && e.municao.contagem) {
      r.push("Contagem de munição (regra opcional, OPRPG p. 174): cada pacote tem munição para " + e.municao.contagem + " ataque(s).");
    }
    if (e.granada) r.push("Granadas: empunhar e ação padrão para arremessar num ponto em alcance médio; afetam um raio de 6 m (OPRPG p. 64).");
    if (e.catalisador) r.push("Catalisador: precisa ser empunhado, é consumido e só um vale por ritual; não pode ser improvisado, mas pode ser fabricado em campo (SAH p. 44, 94).");
    if (e.acessorio && e.aba === "geral") r.push("Bônus de itens em perícias não se acumulam entre si (OPRPG p. 63).");
    if (e.natureza === "maldicao") {
      r.push("Um item não pode ter maldições de elementos opressores, e maldições iguais não se acumulam (OPRPG p. 144).");
      r.push("Cada maldição dá ao item +10 PV e +10 RD (OPRPG p. 145).");
    }
    if (e.natureza === "modificacao" && e.aba !== "geral") r.push("Modificações iguais não se acumulam (OPRPG p. 60).");
    return r;
  }

  function requisitos(e) {
    var r = [];
    if (e.arma && e.arma.proficiencia) {
      r.push("Proficiência com " + PROFICIENCIAS_PLURAL[e.arma.proficiencia] + ". Sem ela, −2 dados nos testes de ataque (OPRPG p. 54).");
    }
    if (e.protecao) {
      var pesada = e.protecao.tipo !== "leve";
      r.push("Proficiência com proteções " + (pesada ? "pesadas" : "leves") + (e.protecao.tipo === "escudo" ? " (escudos contam como proteção pesada)" : "") +
        ". Sem ela, −2 dados em testes baseados em Força ou Agilidade (OPRPG p. 62).");
    }
    if (e.aba === "amaldicoados") {
      r.push("Itens amaldiçoados só são liberados para agente especial, oficial de operações e agente de elite (OPRPG p. 144).");
      if (e.elemento && PRECO_DA_MALDICAO[e.elemento]) r.push("Preço da maldição — " + PRECO_DA_MALDICAO[e.elemento]);
    }
    if (e.unico) r.push("Item único: só um agente pode escolhê-lo.");
    return r;
  }

  /* O que a ficha faz com a entrada — dito com honestidade: o que entra
     na conta sozinho e o que fica com quem joga. */
  function naFicha(e) {
    if (e.natureza !== "item") {
      var calc = e.calculo || {};
      var feitos = [];
      if (e.natureza === "maldicao") feitos.push("soma II à categoria do item (I, se ele já tiver outra maldição)");
      else if (!e.semAcrescimoDeCategoria) feitos.push("soma I à categoria do item");
      if (calc.espacos) feitos.push((calc.espacos > 0 ? "+" : "−") + Math.abs(calc.espacos) + " espaço por unidade");
      if (calc.defesa) feitos.push("+" + calc.defesa + " na Defesa quando a proteção está em uso");
      if (calc.ataque) feitos.push("+" + calc.ataque + " no botão Ataque");
      if (calc.dano) feitos.push("+" + calc.dano + " no botão Dano");
      if (calc.dadosDano) feitos.push("+" + calc.dadosDano + " dado de dano");
      if (calc.margem) feitos.push("+" + calc.margem + " na margem de ameaça");
      if (calc.margemDobra) feitos.push("dobra a margem de ameaça");
      if (calc.alcance || calc.alcanceSeDistancia) feitos.push("aumenta o alcance mostrado");
      if (calc.automatica) feitos.push("marca a arma como automática");
      var texto = "Aplicada a um item do inventário: " + feitos.join(", ") + ".";
      var manual = (e.efeitos || []).length > Object.keys(calc).length;
      return { automacao: Object.keys(calc).length ? "parcial" : "texto",
        texto: texto + (manual ? " O resto dos efeitos é controle manual." : "") };
    }

    var partes = ["Categoria e espaços contam na carga e nos limites por categoria."];
    var automacao = "texto";
    if (e.arma) {
      automacao = "parcial";
      partes.push(e.arma.danoPorD6
        ? "O botão Dano rola 1d6 e o dano da tabela da arma."
        : "Os botões Ataque e Dano usam o dano, a margem e o multiplicador da arma.");
      partes.push("O ataque rola " + (e.arma.tipo === "corpoACorpo" ? "Luta" : "Pontaria") + " com o bônus da perícia" +
        (atributoDoDano(e.arma) ? " e o dano soma " + ({ for: "a Força", melhor: "o melhor entre Força e Agilidade" }[atributoDoDano(e.arma)] || "") : "") + ".");
      if (e.arma.dadosAtaque) partes.push("A penalidade de " + e.arma.dadosAtaque + " dado no ataque entra sozinha.");
      if (e.arma.semEspacoSeTreinado) partes.push("Treinado em Crime, uma unidade não ocupa espaço.");
    }
    if (e.protecao) {
      automacao = e.protecao.tipo === "leve" ? "calculo" : "parcial";
      partes.push("Soma +" + e.protecao.defesa + " na Defesa quando estiver em uso" + (e.protecao.tipo === "escudo" ? ", junto com uma proteção" : "") + ".");
      if (e.protecao.tipo === "pesada") partes.push("Em uso, −5 nas perícias com penalidade de carga. A resistência a dano é controle manual.");
    }
    if (e.municao) {
      automacao = "parcial";
      partes.push("A quantidade é de " + (e.municao.unidade === "foguete" ? "foguetes" : e.municao.unidade + "s") +
        ". Com a regra opcional Contagem de munição ligada, cada ataque é descontado; sem ela, " +
        (e.municao.duracao ? "a duração é controle manual." : "o que sai de cada " + e.municao.unidade + " é controle manual."));
    }
    if (e.capacidade) {
      automacao = "calculo";
      partes.push("Aumenta a capacidade de carga em " + e.capacidade + ".");
    }
    if (automacao === "texto" && e.efeitos.length) partes.push("Os efeitos descritos são controle manual.");
    else if (automacao === "parcial" && e.efeitos.length) partes.push("Efeitos com condição, custo em PE ou ação são controle manual.");
    return { automacao: automacao, texto: partes.join(" ") };
  }

  function atributoDoDano(arma) {
    if (!arma) return "";
    if (arma.atributoDano) return arma.atributoDano === "for" && arma.agil ? "melhor" : arma.atributoDano;
    if (arma.tipo === "corpoACorpo" || arma.tipo === "arremesso") return arma.agil ? "melhor" : "for";
    return "";
  }

  function periciaDaArma(arma) {
    if (!arma) return "";
    return arma.tipo === "corpoACorpo" ? "luta" : "pontaria";
  }

  /* Pares [rótulo, valor] para os detalhes abertos. Só o que existe. */
  function detalhes(e, catalogo) {
    var p = [];
    function par(r, v) { if (v !== null && v !== undefined && v !== "") p.push([r, String(v)]); }
    if (e.natureza === "item") {
      if (e.arma) {
        par("Proficiência", e.arma.proficiencia ? PROFICIENCIAS[e.arma.proficiencia] : "");
        par("Tipo", TIPOS_ARMA[e.arma.tipo]);
        par("Empunhadura", e.arma.empunhadura ? EMPUNHADURAS[e.arma.empunhadura] : "");
        if (e.arma.danoPorD6) par("Dano", "1d6 decide: " + e.arma.danoPorD6.map(function (d, i) { return (i + 1) + ") " + d; }).join(", "));
        else par("Dano", e.arma.dano + (e.arma.danoAlternativo ? " (" + e.arma.danoAlternativo.rotulo + ": " + e.arma.danoAlternativo.dano + ")" : ""));
        par("Crítico", (e.arma.margem >= 20 ? "20" : e.arma.margem + "–20") + ", x" + e.arma.multiplicador + (e.arma.criticoPadrao ? " (regra geral)" : ""));
        par("Alcance", e.arma.alcance ? ROTULO_ALCANCE[e.arma.alcance] : "—");
        par("Tipo de dano", rotuloDano(e.arma.tipoDano));
        if (e.arma.bonusAtaque) par("Bônus de ataque", "+" + e.arma.bonusAtaque);
        if (e.arma.municao) {
          var m = catalogo && catalogo.porId[e.arma.municao];
          par("Munição", m ? m.nome + " (" + apresentacaoDaMunicao(m.municao) + ")" : e.arma.municao);
        } else if (e.arma.semMunicao) {
          par("Munição", "não precisa");
        }
        var props = [];
        if (e.arma.agil) props.push("ágil");
        if (e.arma.arremessavel) props.push("pode ser arremessada");
        if (e.arma.automatica) props.push("automática");
        if (props.length) par("Propriedades", props.join(", "));
      }
      if (e.protecao) {
        par("Defesa", "+" + e.protecao.defesa);
        par("Tipo", TIPOS_PROTECAO[e.protecao.tipo]);
      }
      if (e.municao) {
        par("Unidade", e.municao.unidade);
        par("Duração", e.municao.duracao);
        par("Conteúdo", e.municao.conteudo);
        par("Usada em", e.municao.armas);
      }
      if (e.elemento) par("Elemento", ELEMENTOS[e.elemento]);
      par("Categoria", e.categoria === null ? "não informada" : rotuloCategoria(e.categoria));
      par("Espaços", e.espacos === null ? "não informado (padrão: 1)" : rotuloEspacos(e.espacos));
      if (e.capacidade) par("Capacidade de carga", "+" + e.capacidade + " espaços");
    } else {
      par("Aplica-se a", rotuloAplicaEm(e).replace(/^para /, ""));
      if (e.elemento) par("Elemento", ELEMENTOS[e.elemento]);
      par("Categoria", e.natureza === "maldicao" ? "+II na primeira maldição do item; +I nas seguintes" :
        (e.semAcrescimoDeCategoria ? "o livro não informa" : "+I no item"));
    }
    par("Fonte", referencia(e));
    return p;
  }

  /* =================================================================
     ESCOLHAS AO ADICIONAR
     ================================================================= */

  function opcoesDaEscolha(escolha) {
    if (!escolha) return [];
    if (escolha.tipo === "pericia") {
      var pericias = C() ? C().PERICIAS : [];
      return pericias.filter(function (p) {
        if (escolha.filtro === "kit") return !!p.kit;
        if (escolha.filtro === "semLutaPontaria") return p.chave !== "luta" && p.chave !== "pontaria";
        return true;
      }).map(function (p) { return { valor: p.chave, rotulo: p.nome }; });
    }
    if (escolha.tipo === "elemento") {
      return ["sangue", "morte", "conhecimento", "energia", "medo"]
        .filter(function (k) { return !(escolha.semMedo && k === "medo"); })
        .map(function (k) { return { valor: k, rotulo: ELEMENTOS[k] }; });
    }
    if (escolha.tipo === "circulo") {
      return [1, 2, 3, 4].map(function (n) { return { valor: String(n), rotulo: n + "º círculo" }; });
    }
    return [];
  }

  /* Confere a escolha feita. Devolve { ok, valor, rotulo } ou
     { ok:false, mensagem }. */
  function validarEscolha(escolha, valor) {
    if (!escolha) return { ok: true, valor: null, rotulo: "" };
    var bruto = valor === undefined || valor === null ? "" : String(valor).trim();
    if (!bruto) {
      return escolha.opcional ? { ok: true, valor: null, rotulo: "" } : { ok: false, mensagem: "Escolha: " + escolha.rotulo.toLowerCase() + "." };
    }
    if (escolha.tipo === "texto") {
      return { ok: true, valor: bruto.slice(0, 60), rotulo: bruto.slice(0, 60) };
    }
    var opcao = opcoesDaEscolha(escolha).filter(function (o) { return o.valor === bruto; })[0];
    if (!opcao) return { ok: false, mensagem: escolha.rotulo + ": opção inválida." };
    return { ok: true, valor: opcao.valor, rotulo: opcao.rotulo };
  }

  function nomeComEscolha(nome, escolha, resolvida) {
    if (!resolvida || !resolvida.rotulo) return nome.replace(/ de \(elemento\)$/, "").replace(/ \(elemento\)$/, "");
    if (/\(elemento\)/.test(nome)) return nome.replace("(elemento)", resolvida.rotulo);
    return nome + " (" + resolvida.rotulo + ")";
  }

  /* =================================================================
     ENTRADA → ITEM DA FICHA
     -----------------------------------------------------------------
     Devolve { ok, tipo, dados } para RAMAFicha.criarItem(tipo, dados),
     ou { ok:false, mensagem }. Não toca na ficha: quem chama insere.
     ================================================================= */

  function paraInventario(e, opcoes) {
    var o = opcoes || {};
    if (!e || e.natureza !== "item") return { ok: false, mensagem: "Só itens entram no inventário; modificações e maldições são aplicadas a um item." };

    var escolhida = validarEscolha(e.escolha, o.escolha);
    if (!escolhida.ok) return { ok: false, mensagem: escolhida.mensagem };

    var quantidade = parseInt(o.quantidade, 10);
    if (!Number.isFinite(quantidade) || quantidade < 1) quantidade = 1;
    quantidade = Math.min(999, quantidade);

    var nome = nomeComEscolha(e.nome, e.escolha, escolhida).slice(0, 80);

    var categoria = e.categoria;
    if (e.escolha && e.escolha.tipo === "circulo" && escolhida.valor) categoria = Math.min(4, parseInt(escolhida.valor, 10));

    var ordem = {
      categoria: categoria,
      espacos: e.espacos,
      quantidade: quantidade,
      grupo: e.grupo,
      capacidade: e.capacidade || 0,
      referencia: { fonte: e.fonte, pagina: e.pagina },
    };

    var elemento = e.elemento || (e.escolha && e.escolha.tipo === "elemento" && escolhida.valor ? escolhida.valor : null);
    if (e.aba === "amaldicoados") ordem.amaldicoado = true;
    if (elemento) ordem.elemento = elemento;

    var marcadores = [];
    ["acessorio", "utensilio", "vestimenta", "eletrico", "camera"].forEach(function (k) { if (e[k]) marcadores.push(k); });
    if (e.modificavelComo) marcadores.push(e.modificavelComo);
    if (e.id === "op.arma.besta" || e.id === "op.arma.balestra") marcadores.push("besta");
    if (e.id === "op.municao.balas-curtas" || e.id === "op.municao.balas-longas") marcadores.push("balas");
    if (marcadores.length) ordem.marcadores = marcadores;

    var dados = {
      nome: nome,
      categoria: GAVETA_DA_ABA[e.aba] || "",
      descricao: descricaoDaInstancia(e, escolhida),
      origemCatalogoId: e.id,
      ordem: ordem,
    };

    if (e.tipoItem === "arma") {
      var a = e.arma;
      ordem.pericia = periciaDaArma(a);
      ordem.arma = {
        proficiencia: a.proficiencia || null,
        tipo: a.tipo || null,
        empunhadura: a.empunhadura || null,
        alcance: a.alcance || "",
        tipoDano: rotuloDano(a.tipoDano),
        municao: a.municao && o.catalogo && o.catalogo.porId[a.municao] ? o.catalogo.porId[a.municao].nome : (a.municao ? a.municao : ""),
        atributoDano: atributoDoDano(a),
      };
      ["agil", "arremessavel", "automatica", "desarmado", "semMunicao"].forEach(function (k) { if (a[k]) ordem.arma[k] = true; });
      if (a.dadosAtaque) ordem.arma.dadosAtaque = a.dadosAtaque;
      if (a.bonusAtaque) ordem.arma.bonusAtaque = a.bonusAtaque;
      if (a.danoAlternativo) ordem.arma.danoAlternativo = { dano: a.danoAlternativo.dano, rotulo: a.danoAlternativo.rotulo };
      if (a.danoPorD6) ordem.arma.danoPorD6 = a.danoPorD6.slice();
      if (a.capacidade) ordem.arma.capacidade = a.capacidade;
      if (a.semEspacoSeTreinado) ordem.arma.semEspacoSeTreinado = a.semEspacoSeTreinado;

      dados.dano = a.dano || "";
      dados.danoExtra = "";
      dados.critico = a.margem;
      dados.multiplicador = a.multiplicador;
      dados.periciaId = o.periciaUniversal ? o.periciaUniversal(ordem.pericia) : null;
    }

    if (e.tipoItem === "armadura") {
      ordem.protecao = { tipo: e.protecao.tipo };
      dados.defesa = e.protecao.defesa;
    }

    return { ok: true, tipo: e.tipoItem, dados: dados };
  }

  /* A descrição que vai junto com a cópia: resumo, efeitos, regras e a
     fonte. Redação própria, dentro do limite de 2000 caracteres. */
  function descricaoDaInstancia(e, escolhida) {
    var partes = [e.resumo];
    if (escolhida && escolhida.rotulo && e.escolha) partes.push(e.escolha.rotulo + ": " + escolhida.rotulo + ".");
    if (e.efeitos.length) partes.push(e.efeitos.map(function (x) { return "• " + x; }).join("\n"));
    var regras = regrasGerais(e);
    if (regras.length) partes.push(regras.map(function (x) { return "• " + x; }).join("\n"));
    partes.push("Fonte: " + referencia(e) + ".");
    var texto = partes.filter(Boolean).join("\n\n");
    if (texto.length <= 2000) return texto;
    return (partes[0] + "\n\n" + (e.efeitos.length ? e.efeitos.map(function (x) { return "• " + x; }).join("\n") : "") + "\n\nFonte: " + referencia(e) + ".").slice(0, 2000);
  }

  /* =================================================================
     MODIFICAÇÕES E MALDIÇÕES NUM ITEM
     ================================================================= */

  /* O que se sabe de um item da ficha para decidir onde uma modificação
     cabe. `conhecido` quer dizer que a ficha SABE o tipo exato dele —
     todo item do catálogo, e o item à mão que ganhou tipo de arma ou de
     proteção no editor. */
  function marcadoresDoItem(item) {
    var d = global.RAMAOrdemInventario ? global.RAMAOrdemInventario.dadosDoItem(item) : (item && item.ordem) || {};
    var tags = {};
    (d.marcadores || []).forEach(function (k) { tags[k] = true; });
    var conhecido = !!(item && item.origemCatalogoId) || !!(d.marcadores && d.marcadores.length);
    var familias = {};
    if (item && item.tipo === "arma") {
      familias.arma = true;
      tags.arma = true;
      var arma = d.arma || {};
      if (arma.tipo) { conhecido = true; tags[arma.tipo] = true; }
      if (arma.automatica || temModificacao(d, "op.mod.arma.ferrolho-automatico")) tags.automatica = true;
    } else if (item && item.tipo === "armadura") {
      familias.armadura = true;
      tags.protecao = true;
      if (d.protecao && d.protecao.tipo) { conhecido = true; tags[d.protecao.tipo] = true; }
    } else {
      familias.item = true;
    }
    /* A soqueira aceita o que armas corpo a corpo aceitam. */
    if (tags.corpoACorpo) { familias.arma = true; tags.arma = true; }
    return { tags: tags, familias: familias, conhecido: conhecido, dados: d };
  }

  /* A que tipo de item cada alvo de modificação pertence. "*" é qualquer. */
  var FAMILIA_DO_ALVO = {
    arma: "arma", corpoACorpo: "arma", disparo: "arma", fogo: "arma", automatica: "arma", besta: "arma",
    protecao: "armadura", leve: "armadura", pesada: "armadura", escudo: "armadura",
    balas: "item", acessorio: "item", utensilio: "item", vestimenta: "item", camera: "item", eletrico: "*",
  };

  function temModificacao(d, catalogoId) {
    return (d.modificacoes || []).some(function (m) { return m.catalogoId === catalogoId; });
  }

  var OPRESSAO = { sangue: "conhecimento", conhecimento: "energia", energia: "morte", morte: "sangue" };

  /* Pode aplicar `e` (modificação/maldição) no item? { ok, motivo, aviso } */
  function podeAplicar(e, item, escolha) {
    if (!e || e.natureza === "item") return { ok: false, motivo: "Isto não é uma modificação nem uma maldição." };
    if (!item) return { ok: false, motivo: "Escolha um item do inventário." };

    var perfil = marcadoresDoItem(item);
    var d = perfil.dados;
    var alvos = e.aplicaEm || [];
    var casa = alvos.some(function (k) { return perfil.tags[k]; });

    if (!casa) {
      var familiaCabe = alvos.some(function (k) {
        var f = FAMILIA_DO_ALVO[k];
        return f === "*" || perfil.familias[f];
      });
      /* Tipo errado (uma arma não é proteção), ou tipo conhecido que não
         é o que o livro pede: não aplica. Tipo desconhecido: aplica com
         aviso, e a mesa confere. */
      if (!familiaCabe || perfil.conhecido) {
        return { ok: false, motivo: e.nome + " só se aplica " + rotuloAplicaEm(e).replace(/^para /, "a ") + "." };
      }
    }

    var lista = d.modificacoes || [];
    var mesma = lista.filter(function (m) { return m.catalogoId === e.id; });
    if (mesma.length) {
      var repete = e.repeteComFuncaoAdicional && mesma.length < 2 && temModificacao(d, "op.mod.acessorio.funcao-adicional");
      if (!repete) return { ok: false, motivo: e.nome + " já está aplicada neste item — " + (e.natureza === "maldicao" ? "maldições" : "modificações") + " iguais não se acumulam." };
    }

    var incompativel = (e.incompativel || []).filter(function (id) { return temModificacao(d, id); })[0];
    if (incompativel) {
      var outra = lista.filter(function (m) { return m.catalogoId === incompativel; })[0];
      return { ok: false, motivo: e.nome + " não combina com " + (outra ? outra.nome : "outra modificação do item") + "." };
    }

    if (e.exigeNaoAutomatica && perfil.tags.automatica) return { ok: false, motivo: item.nome + " já é automática." };

    if (e.natureza === "maldicao") {
      var elemento = e.elemento;
      if (e.escolha && e.escolha.defineElemento) elemento = escolha || null;
      if (elemento && OPRESSAO[elemento] !== undefined) {
        var conflito = lista.filter(function (m) {
          return m.natureza === "maldicao" && m.elemento && (OPRESSAO[m.elemento] === elemento || OPRESSAO[elemento] === m.elemento);
        })[0];
        if (conflito) {
          return { ok: false, motivo: "Maldições de elementos opressores não convivem no mesmo item: " + ELEMENTOS[elemento] + " e " + ELEMENTOS[conflito.elemento] + " (" + conflito.nome + ")." };
        }
      }
    }

    if (!casa) {
      return { ok: true, aviso: "A ficha não sabe que tipo de item " + item.nome + " é. Confira se " + e.nome + " se aplica a ele." };
    }
    return { ok: true };
  }

  /* O registro que entra em `ordem.modificacoes` do item. */
  function modificacaoParaItem(e, opcoes) {
    var o = opcoes || {};
    var escolhida = validarEscolha(e.escolha, o.escolha);
    if (!escolhida.ok) return { ok: false, mensagem: escolhida.mensagem };
    var registro = {
      id: o.id || (global.RAMAUtil ? global.RAMAUtil.uuid() : String(Date.now()) + Math.random()),
      catalogoId: e.id,
      nome: (e.nome + (escolhida.rotulo ? " (" + escolhida.rotulo + ")" : "")).slice(0, 80),
      natureza: e.natureza,
      resumo: (e.efeitos.length ? e.efeitos.join(" ") : e.resumo).slice(0, 300),
      referencia: { fonte: e.fonte, pagina: e.pagina },
    };
    var elemento = e.elemento;
    if (e.escolha && e.escolha.defineElemento) elemento = escolhida.valor;
    if (elemento) registro.elemento = elemento;
    if (escolhida.rotulo) registro.escolha = escolhida.rotulo;
    if (e.calculo) registro.calculo = copia(e.calculo);
    if (e.semAcrescimoDeCategoria) registro.semAcrescimoDeCategoria = true;
    return { ok: true, registro: registro };
  }

  /* Aplica, conferindo antes. Muda o item recebido (a cópia da ficha). */
  function aplicar(e, item, opcoes) {
    var o = opcoes || {};
    var conferencia = podeAplicar(e, item, o.escolha);
    if (!conferencia.ok) return conferencia;
    var montado = modificacaoParaItem(e, o);
    if (!montado.ok) return { ok: false, motivo: montado.mensagem };
    if (!item.ordem || typeof item.ordem !== "object") {
      item.ordem = global.RAMAOrdemInventario ? global.RAMAOrdemInventario.normalizarDados(null, item.tipo) : {};
    }
    if (!Array.isArray(item.ordem.modificacoes)) item.ordem.modificacoes = [];
    item.ordem.modificacoes.push(montado.registro);
    return { ok: true, registro: montado.registro, aviso: conferencia.aviso || "" };
  }

  function remover(item, idRegistro) {
    if (!item || !item.ordem || !Array.isArray(item.ordem.modificacoes)) return false;
    var antes = item.ordem.modificacoes.length;
    item.ordem.modificacoes = item.ordem.modificacoes.filter(function (m) { return m.id !== idRegistro; });
    var mudou = item.ordem.modificacoes.length !== antes;
    if (!item.ordem.modificacoes.length) delete item.ordem.modificacoes;
    return mudou;
  }

  /* Itens do inventário separados em compatíveis, desconhecidos (a
     ficha não sabe o tipo) e incompatíveis. */
  function alvosPara(e, itens) {
    var saida = { compativeis: [], desconhecidos: [], incompativeis: [] };
    (itens || []).forEach(function (item) {
      if (!item) return;
      var r = podeAplicar(e, item);
      if (r.ok && !r.aviso) saida.compativeis.push({ item: item });
      else if (r.ok) saida.desconhecidos.push({ item: item, aviso: r.aviso });
      else saida.incompativeis.push({ item: item, motivo: r.motivo });
    });
    return saida;
  }

  /* Quantas cópias de uma entrada já estão na ficha (pelo rastro). */
  function quantasNaFicha(e, itens) {
    return (itens || []).filter(function (i) { return i && i.origemCatalogoId === e.id; }).length;
  }

  /* A aba em que um item da ficha seria procurado — para "modificar"
     abrir a biblioteca no lugar certo. */
  function abaParaModificar(item) {
    if (!item) return "armas";
    if (item.tipo === "armadura") return "protecoes";
    if (item.tipo === "arma") return "armas";
    var d = global.RAMAOrdemInventario ? global.RAMAOrdemInventario.dadosDoItem(item) : {};
    if (d.grupo === "municao") return "municoes";
    return "geral";
  }

  global.RAMAOrdemItens = {
    ABAS: ABAS,
    SECOES: SECOES,
    ROTULO_FONTE: ROTULO_FONTE,
    SIGLA_FONTE: SIGLA_FONTE,
    NOME_FONTE: NOME_FONTE,
    ELEMENTOS: ELEMENTOS,
    TIPOS_ARMA: TIPOS_ARMA,
    EMPUNHADURAS: EMPUNHADURAS,
    PROFICIENCIAS: PROFICIENCIAS,
    TIPOS_PROTECAO: TIPOS_PROTECAO,
    ALCANCES: ALCANCES,
    ROTULO_ALCANCE: ROTULO_ALCANCE,
    TIPOS_DANO: TIPOS_DANO,
    OPRESSAO: OPRESSAO,
    PRECO_DA_MALDICAO: PRECO_DA_MALDICAO,

    carregar: carregar,
    catalogoPronto: catalogoPronto,
    normalizarCatalogo: normalizarCatalogo,
    normalizarTexto: normalizarTexto,
    lerCritico: lerCritico,
    rotuloCritico: rotuloCritico,
    rotuloCategoria: rotuloCategoria,

    filtrar: filtrar,
    contagemPorAba: contagemPorAba,
    secoes: secoes,
    opcoesDeFiltro: opcoesDeFiltro,

    resumoCompacto: resumoCompacto,
    detalhes: detalhes,
    regrasGerais: regrasGerais,
    requisitos: requisitos,
    naFicha: naFicha,
    referencia: referencia,

    opcoesDaEscolha: opcoesDaEscolha,
    validarEscolha: validarEscolha,
    paraInventario: paraInventario,

    marcadoresDoItem: marcadoresDoItem,
    podeAplicar: podeAplicar,
    modificacaoParaItem: modificacaoParaItem,
    aplicar: aplicar,
    remover: remover,
    alvosPara: alvosPara,
    quantasNaFicha: quantasNaFicha,
    abaParaModificar: abaParaModificar,

    /* Só para os testes: esquece o que foi carregado. */
    _esquecer: function () { pronto = null; emCarga = null; },
  };
})(typeof window !== "undefined" ? window : globalThis);
