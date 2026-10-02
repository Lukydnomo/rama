/* =====================================================================
   R.A.M.A. — Ordem Paranormal · catálogo de criaturas
   =====================================================================
   O que se faz com os dados de js/ordem/criaturas-dados.js: carregar sob
   demanda, transformar cada entrada numa criatura do R.A.M.A. (sistema
   "ordem", origem "catalogo"), buscar, filtrar e conferir. Sem tela: a
   janela da biblioteca fica em js/paginas/criaturas-biblioteca.js.

   ---------------------------------------------------------------------
   CÓPIA, NUNCA VÍNCULO
   ---------------------------------------------------------------------

   O catálogo carregado é congelado (Object.freeze) e ninguém o edita: o
   modelo oficial é imutável. Quem quer mudar uma ameaça copia para o
   Homebrew (copiaParaHomebrew) ou mexe na OCORRÊNCIA de um combate ou
   aliado. criatura(id) devolve sempre um objeto novo; `origem` guarda o
   id do catálogo, o livro e a página como rastro.

   Os ids das partes (habilidades, ações, ataques, rolagens) são
   DETERMINÍSTICOS — h0, a2, a2.t1 —, porque o estado de uma ocorrência
   (usos, marcadores) é guardado por esses ids.
   ===================================================================== */

(function (global) {
  "use strict";

  function U() { return global.RAMAUtil; }
  function C() { return global.RAMACriaturas; }

  var ARQUIVO_DADOS = "js/ordem/criaturas-dados.js";
  var PRAZO_CARGA_MS = 20000;

  var FONTES = {
    OPRPG: { nome: "Ordem Paranormal RPG", sigla: "LB", rotulo: "Livro básico" },
    SAH: { nome: "Sobrevivendo ao Horror", sigla: "SAH", rotulo: "Sobrevivendo ao Horror" },
    AS1: { nome: "Arquivos Secretos 1", sigla: "AS1", rotulo: "Arquivos Secretos 1" },
  };

  var NOMES_ELEMENTO = { sangue: "Sangue", morte: "Morte", conhecimento: "Conhecimento", energia: "Energia", medo: "Medo" };
  var NOMES_NATUREZA = { paranormal: "Paranormal", humana: "Pessoa", animal: "Animal" };
  var SIGLAS = ["AGI", "FOR", "INT", "PRE", "VIG"];

  var pronto = null;
  var emCarga = null;

  function congelar(obj) {
    if (!obj || typeof obj !== "object" || Object.isFrozen(obj)) return obj;
    Object.keys(obj).forEach(function (k) { congelar(obj[k]); });
    return Object.freeze(obj);
  }

  function copia(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }

  function busca(texto) {
    return String(texto || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  /* =================================================================
     ENTRADA → CRIATURA
     ================================================================= */

  function comIds(rolagens, prefixo) {
    return (rolagens || []).map(function (r, i) { return Object.assign(copia(r), { id: prefixo + ".r" + i }); });
  }

  function paraCriatura(e) {
    var status = [{ id: "vida", nome: "Pontos de vida", atual: e.pv, maximo: e.pv }];
    if (e.pe) status.push({ id: "pe", nome: "Pontos de esforço", atual: e.pe, maximo: e.pe });

    var bruta = {
      tipo: "criatura",
      sistema: "ordem",
      nome: e.nome,
      visibilidade: "privado",
      natureza: e.natureza,
      categoria: e.categoria || "",
      descricao: e.descricao || "",
      origem: { tipo: "catalogo", catalogoId: e.id, livro: e.livro, pagina: e.pagina },
      status: status,
      atributos: SIGLAS.map(function (s, i) { return { sigla: s, valor: (e.atributos || [])[i] }; }),
      pericias: (e.pericias || []).map(function (p, i) { return { id: "p" + i, nome: p[0], expressao: p[1] }; }),
      habilidades: (e.habilidades || []).map(function (h, i) {
        return Object.assign(copia(h), { id: "h" + i, rolagens: comIds(h.rolagens, "h" + i) });
      }),
      acoes: (e.acoes || []).map(function (a, i) {
        var id = "a" + i;
        return Object.assign(copia(a), {
          id: id,
          ataques: (a.ataques || []).map(function (t, j) { return Object.assign(copia(t), { id: id + ".t" + j }); }),
          rolagens: comIds(a.rolagens, id),
        });
      }),
      ordem: {
        vd: e.vd, nivel: e.nivel || "", elementos: e.elementos || [], tipo: e.tipo, tamanho: e.tamanho,
        presenca: e.presenca || null,
        percepcao: e.percepcao, iniciativa: e.iniciativa, sentidos: e.sentidos || [],
        defesa: e.defesa, fortitude: e.fortitude, reflexos: e.reflexos, vontade: e.vontade,
        machucado: e.machucado,
        resistencias: e.resistencias || [], imunidades: e.imunidades || [], vulnerabilidades: e.vulnerabilidades || [],
        deslocamento: e.deslocamento || [],
        estados: e.estados || [],
        forma: e.forma || null,
        notas: e.notas || [],
        enigma: e.enigma ? Object.assign(copia(e.enigma), { rolagens: comIds(e.enigma.rolagens, "enigma") }) : null,
        variante: e.variante || null,
      },
    };
    return C().normalizar(bruta);
  }

  function indiceDe(c, e) {
    return {
      id: e.id,
      nome: c.nome,
      chave: busca(c.nome + " " + (c.categoria || "") + " " + (e.tipo || "")),
      livro: e.livro,
      pagina: e.pagina,
      natureza: c.natureza,
      vd: c.ordem.vd,
      nivel: c.ordem.nivel,
      elementos: c.ordem.elementos.slice(),
      tamanho: c.ordem.tamanho || "",
      tipo: c.ordem.tipo,
      categoria: c.categoria || "",
      pv: (c.status[0] || {}).maximo || 0,
      variante: c.ordem.variante ? c.ordem.variante.de : null,
    };
  }

  function normalizarCatalogo(dados) {
    var porId = {};
    var indice = [];
    (dados && dados.criaturas || []).forEach(function (e) {
      if (!e || !e.id || porId[e.id]) return;
      var c = paraCriatura(e);
      porId[e.id] = c;
      indice.push(indiceDe(c, e));
    });
    indice.sort(function (a, b) {
      return a.nome.localeCompare(b.nome, "pt-BR");
    });
    return congelar({ porId: porId, indice: indice });
  }

  /* =================================================================
     CARGA SOB DEMANDA
     ================================================================= */

  function carregar() {
    if (pronto) return Promise.resolve(pronto);
    if (global.RAMAOrdemCriaturasDados) {
      pronto = normalizarCatalogo(global.RAMAOrdemCriaturasDados);
      return Promise.resolve(pronto);
    }
    if (emCarga) return emCarga;
    if (typeof document === "undefined" || !document.createElement) return Promise.reject(new Error("sem_documento"));

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
        if (!global.RAMAOrdemCriaturasDados) { falha(new Error("vazio")); return; }
        pronto = normalizarCatalogo(global.RAMAOrdemCriaturasDados);
        ok(pronto);
      }
      script.src = U() && U().url ? U().url(ARQUIVO_DADOS) : ARQUIVO_DADOS;
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

  /* Uma cópia NOVA da criatura do catálogo — pronta para virar
     ocorrência ou Homebrew sem tocar no catálogo congelado. */
  function criatura(id) {
    if (!pronto || !pronto.porId[id]) return null;
    return copia(pronto.porId[id]);
  }

  /* A cópia que vai para o Homebrew: deixa de ser "catálogo" e vira
     "homebrew", com o rastro de onde veio. Sem id: o servidor cria o
     registro novo, privado, sob quem pediu. */
  function copiaParaHomebrew(id) {
    var c = criatura(id);
    if (!c) return null;
    var origem = c.origem || {};
    c.origem = { tipo: "homebrew", copiadoDe: id, livro: origem.livro, pagina: origem.pagina };
    c.visibilidade = "privado";
    delete c.id;
    delete c.instancia;
    return c;
  }

  /* =================================================================
     BUSCA E FILTROS
     -----------------------------------------------------------------
     filtros = { busca, livro, natureza, elementos: [], modoElementos:
     "qualquer" | "todos", vdMin, vdMax } — vazio quer dizer "todos", e
     eles se combinam. Uma ameaça com vários elementos aparece em cada
     um deles. Ficha de NPC sem VD (nível em vez de VD) só some quando
     há faixa de VD escolhida.
     ================================================================= */

  function filtrar(indice, filtros) {
    var f = filtros || {};
    var termo = busca(f.busca);
    var elementos = (f.elementos || []).filter(Boolean);
    var todos = f.modoElementos === "todos";
    var min = f.vdMin === "" || f.vdMin === null || f.vdMin === undefined ? null : Number(f.vdMin);
    var max = f.vdMax === "" || f.vdMax === null || f.vdMax === undefined ? null : Number(f.vdMax);

    return (indice || []).filter(function (x) {
      if (termo && x.chave.indexOf(termo) < 0) return false;
      if (f.livro && x.livro !== f.livro) return false;
      if (f.natureza && x.natureza !== f.natureza) return false;
      if (elementos.length) {
        var tem = function (e) { return (x.elementos || []).indexOf(e) >= 0; };
        if (todos ? !elementos.every(tem) : !elementos.some(tem)) return false;
      }
      if (min !== null || max !== null) {
        if (typeof x.vd !== "number") return false;
        if (min !== null && Number.isFinite(min) && x.vd < min) return false;
        if (max !== null && Number.isFinite(max) && x.vd > max) return false;
      }
      return true;
    });
  }

  /* =================================================================
     CONFERÊNCIA DO CATÁLOGO
     -----------------------------------------------------------------
     Usada pelos testes: ids únicos e no formato, campos obrigatórios,
     expressões válidas, variantes apontando para uma base que existe.
     ================================================================= */

  var FORMATO_ID = /^(op|sah|as1)\.criatura\.[a-z0-9-]+(\.[a-z0-9-]+)?$/;

  function conferir(dados) {
    var erros = [];
    var ids = {};
    var porLivro = {};
    (dados && dados.criaturas || []).forEach(function (e, i) {
      var onde = (e && e.id) || ("#" + i);
      if (!e || typeof e !== "object") { erros.push(onde + ": entrada vazia"); return; }
      if (!FORMATO_ID.test(String(e.id || ""))) erros.push(onde + ": id fora do formato");
      if (ids[e.id]) erros.push(onde + ": id repetido");
      ids[e.id] = true;
      if (!FONTES[e.livro]) erros.push(onde + ": livro desconhecido");
      if (!(Number(e.pagina) > 0)) erros.push(onde + ": sem página");
      if (!e.nome) erros.push(onde + ": sem nome");
      if (["paranormal", "humana", "animal"].indexOf(e.natureza) < 0) erros.push(onde + ": natureza inválida");
      /* Aliada (Agatha, AS1 p. 19): benefícios de aliado, sem ficha de
         combate — os campos de ameaça não se aplicam. */
      var aliada = e.aliada === true;
      if (!aliada && !(Number(e.pv) > 0)) erros.push(onde + ": sem PV");
      if (e.vd === undefined) erros.push(onde + ": VD ausente (use null quando a ficha não tem)");
      if (e.vd === null && !e.nivel) erros.push(onde + ": sem VD e sem nível");
      if (!aliada && (!Array.isArray(e.atributos) || e.atributos.length !== 5)) erros.push(onde + ": atributos incompletos");
      if (!e.descricao) erros.push(onde + ": sem descrição");
      if (e.natureza === "paranormal" && !(e.elementos || []).length) erros.push(onde + ": criatura paranormal sem elemento");
      if (e.variante && !(dados.criaturas || []).some(function (x) { return x.id === e.variante.de; })) erros.push(onde + ": variante de base inexistente");
      ["percepcao", "iniciativa", "fortitude", "reflexos", "vontade"].forEach(function (k) {
        var v = e[k];
        if (v === undefined && !aliada) erros.push(onde + ": " + k + " ausente");
        else if (typeof v === "string" && /\d+d\d+/i.test(v) && !global.RAMADados.testeValido(v)) erros.push(onde + ": " + k + " inválido");
      });
      C().validar(paraCriatura(e)).forEach(function (msg) { erros.push(onde + ": " + msg); });
      var chave = e.livro + (e.variante ? " (variantes)" : "");
      porLivro[chave] = (porLivro[chave] || 0) + 1;
    });
    return { erros: erros, total: Object.keys(ids).length, porLivro: porLivro };
  }

  /* =================================================================
     APRESENTAÇÃO
     ================================================================= */

  function nomeDoElemento(e) { return NOMES_ELEMENTO[e] || String(e || ""); }
  function nomeDaNatureza(n) { return NOMES_NATUREZA[n] || String(n || ""); }

  function referencia(livro, pagina) {
    var f = FONTES[livro];
    if (!f) return "";
    return f.sigla + (pagina ? " p. " + pagina : "");
  }

  /* =================================================================
     GERADOR DE TRANSTORNADOS — Arquivos Secretos 1, p. 23
     -----------------------------------------------------------------
     Ferramenta do mestre: 1d10 decide o perfil, 2d6 os dois traços de
     personalidade (um d6 por traço, na coluna do perfil) e dois d20 as
     duas características de aparência. As entradas são resumos nossos
     das tabelas do livro; a ficha de jogo vem das criaturas do catálogo
     (Assecla, Investido, Apóstolo do Sangue).
     ================================================================= */

  var GERADOR_DE_TRANSTORNADOS = {
    fonte: "AS1", pagina: 23,
    perfis: [
      { ate: 2, nome: "Desesperado", tracos: ["Sem família (órfão)", "Perdeu todo o dinheiro", "Fácil de manipular",
        "Criado em meio à violência", "Aceita qualquer alívio para a dor emocional", "Desistiu de uma vida melhor"] },
      { ate: 4, nome: "Quebrado", tracos: ["Em luto", "Depressão profunda", "Covarde ao extremo",
        "Chora o tempo todo", "Culpa profunda por algo que fez", "Busca experiências extremas"] },
      { ate: 6, nome: "Ambicioso", tracos: ["Ego enorme", "Família rica", "Precisa controlar tudo",
        "Frustrado com os limites do corpo humano", "Fascinado pelo poder proibido", "Não aceita falhar"] },
      { ate: 8, nome: "Obcecado", tracos: ["Sem empatia", "Formação acadêmica", "Curiosidade sem freio",
        "Vive isolado", "Vidrado em padrões e símbolos", "Despreza o conhecimento mundano"] },
      { ate: 10, nome: "Convertido", tracos: ["Ri sem parar", "Carrega um trauma psicológico", "Agressivo",
        "Perdeu a noção de quem é", "Viu um evento paranormal", "Atraído por lugares tocados pelo Sangue"] },
    ],
    aparencia: [
      "Magro a ponto de parecer um cadáver", "Uma boca com dentes no pescoço", "Enorme cicatriz no rosto", "Um terceiro braço",
      "Um órgão interno à mostra, funcionando", "Língua bifurcada e longa demais", "Olhos arrancados e pálpebras costuradas",
      "Coluna saltada como a lâmina de uma serra", "Um cutelo cravado na cabeça", "Pele do rosto presa com grampos",
      "Uma cicatriz que sangra sem parar", "Um pé de cabra no lugar do fêmur", "Arame farpado sob a pele",
      "Uma cauda de corrente farpada", "Chora sangue o tempo todo", "Tatuagens feitas a maçarico", "Dentes de tubarão",
      "Navalhas no lugar das unhas", "Bem vestido demais para o que é", "Uma terceira perna",
    ],
  };

  /* `rolar(faces)` devolve um inteiro de 1 a faces; sem ele, o sorteio
     comum. Os dados ficam no resultado, para a mesa conferir. */
  function gerarTranstornado(rolar) {
    var r = typeof rolar === "function" ? rolar : function (faces) { return 1 + Math.floor(Math.random() * faces); };
    var g = GERADOR_DE_TRANSTORNADOS;
    var d10 = r(10);
    var perfil = g.perfis.filter(function (p) { return d10 <= p.ate; })[0] || g.perfis[g.perfis.length - 1];
    var d6a = r(6), d6b = r(6), d20a = r(20), d20b = r(20);
    return {
      dados: { perfil: d10, tracos: [d6a, d6b], aparencia: [d20a, d20b] },
      perfil: perfil.nome,
      tracos: [perfil.tracos[d6a - 1], perfil.tracos[d6b - 1]],
      aparencia: [g.aparencia[d20a - 1], g.aparencia[d20b - 1]],
      referencia: "Arquivos Secretos 1, p. 23",
    };
  }

  global.RAMAOrdemCriaturas = {
    FONTES: FONTES,
    GERADOR_DE_TRANSTORNADOS: GERADOR_DE_TRANSTORNADOS,
    gerarTranstornado: gerarTranstornado,
    carregar: carregar,
    catalogoPronto: catalogoPronto,
    criatura: criatura,
    copiaParaHomebrew: copiaParaHomebrew,
    filtrar: filtrar,
    conferir: conferir,
    paraCriatura: paraCriatura,
    nomeDoElemento: nomeDoElemento,
    nomeDaNatureza: nomeDaNatureza,
    referencia: referencia,
  };
})(typeof window !== "undefined" ? window : globalThis);
