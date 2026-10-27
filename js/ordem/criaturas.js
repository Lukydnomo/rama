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
    AS2: { nome: "Arquivos Secretos 2", sigla: "AS2", rotulo: "Arquivos Secretos 2" },
    AS3: { nome: "Arquivos Secretos 3", sigla: "AS3", rotulo: "Arquivos Secretos 3" },
    AS4: { nome: "Arquivos Secretos 4", sigla: "AS4", rotulo: "Arquivos Secretos 4" },
    AS5: { nome: "Arquivos Secretos 5", sigla: "AS5", rotulo: "Arquivos Secretos 5" },
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

  function efeitosComIds(lista, prefixo, ehAcao) {
    return (lista || []).map(function (x, i) {
      var id = prefixo + (ehAcao ? "a" : "h") + i;
      var saida = Object.assign(copia(x), { id: id, rolagens: comIds(x.rolagens, id) });
      if (ehAcao) saida.ataques = (x.ataques || []).map(function (t, j) { return Object.assign(copia(t), { id: id + ".t" + j }); });
      return saida;
    });
  }

  /* Formas da mesma ocorrência (AS2): ids próprios, prefixados pelo id da
     forma, para o uso de uma ação da forma não cair na da ficha base. */
  function formasDe(e) {
    return (e.formas || []).map(function (f) {
      return Object.assign(copia(f), {
        /* AS4: o estágio pode trocar os atributos ([AGI, FOR, INT, PRE, VIG]). */
        atributos: Array.isArray(f.atributos) ? SIGLAS.map(function (s, i) { return { sigla: s, valor: f.atributos[i] }; }) : undefined,
        pericias: (f.pericias || []).map(function (p, i) { return { id: f.id + ".p" + i, nome: p[0], expressao: p[1] }; }),
        habilidades: efeitosComIds(f.habilidades, f.id + ".", false),
        acoes: efeitosComIds(f.acoes, f.id + ".", true),
      });
    });
  }

  function paraCriatura(e) {
    /* Perfil de aliado: sem PV nem PE inventados (OPRPG p. 170). */
    var status = e.aliada ? [] : [{ id: "vida", nome: "Pontos de vida", atual: e.pv, maximo: e.pv }];
    if (e.pe && !e.aliada) status.push({ id: "pe", nome: "Pontos de esforço", atual: e.pe, maximo: e.pe });

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
        vd: e.vd, nivel: e.nivel || "", elementos: e.elementos || [], manifestacao: e.manifestacao || "", tipo: e.tipo, tamanho: e.tamanho,
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
        formas: e.formas ? formasDe(e) : undefined,
        procedimentos: e.procedimentos ? copia(e.procedimentos) : undefined,
        pvBase: e.formas ? e.pv : undefined,
        aliada: e.aliada === true ? true : undefined,
        ficha: e.ficha || undefined,
      },
    };
    return C().normalizar(bruta);
  }

  function indiceDe(c, e) {
    return {
      id: e.id,
      nome: c.nome,
      /* As formas (AS2) entram na busca: "Mutilador Noturno" acha Jonas. */
      chave: busca(c.nome + " " + (c.categoria || "") + " " + (e.tipo || "") + " " + (c.ordem.formas || []).map(function (f) { return f.nome; }).join(" ")),
      livro: e.livro,
      pagina: e.pagina,
      natureza: c.natureza,
      vd: c.ordem.vd,
      nivel: c.ordem.nivel,
      elementos: c.ordem.elementos.slice(),
      manifestacao: c.ordem.manifestacao || "",
      tamanho: c.ordem.tamanho || "",
      tipo: c.ordem.tipo,
      categoria: c.categoria || "",
      pv: (c.status[0] || {}).maximo || 0,
      variante: c.ordem.variante ? c.ordem.variante.de : null,
      formas: (c.ordem.formas || []).map(function (f) { return f.nome; }),
      aliada: !!c.ordem.aliada,
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
        /* "transmissao" é manifestação (AS5 p. 46), não elemento: acha as
           criaturas de Transmissão, que guardam Conhecimento e Energia. */
        var tem = function (e) { return e === "transmissao" ? x.manifestacao === "transmissao" : (x.elementos || []).indexOf(e) >= 0; };
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

  var FORMATO_ID = /^(op|sah|as1|as2|as3|as4|as5)\.criatura\.[a-z0-9-]+(\.[a-z0-9-]+)?$/;

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

  function nomeDoElemento(e) { return e === "transmissao" ? "Transmissão" : (NOMES_ELEMENTO[e] || String(e || "")); }
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

  /* =================================================================
     GERADOR DE PRODUÇÃO DO ANFITRIÃO — Arquivos Secretos 4, p. 48
     -----------------------------------------------------------------
     O mesmo formato: 1d10 decide o perfil, dois d6 INDEPENDENTES os
     dois traços (cada um na coluna do perfil, sem somar) e dois d20
     independentes as duas características de aparência. Só narrativa:
     não cria ficha nem mexe em estatística — a ficha de jogo é a do
     catálogo (Assistente de Produção, Produtor, Diretor).

     O cabeçalho 7–8 da tabela vem cifrado na arte; o nome do perfil,
     Enigmáticos, é o da seção "Membros Típicos" (p. 47, e Mariana, a
     enigmática, na p. 49). Resultados repetidos: o livro não diz o que
     fazer — ficam como saíram.
     ================================================================= */

  var GERADOR_DE_PRODUCAO = {
    fonte: "AS4", pagina: 48,
    perfis: [
      { ate: 2, nome: "Sistemáticos", tracos: ["Arrogante, fala sem parar", "Pensa muito antes de fazer", "Tem boa memória, focado em catalogar",
        "Se preocupa mais com seus objetos de pesquisa", "Se preocupa em ser perfeito", "Ridiculamente cético"] },
      { ate: 4, nome: "Desordeiros", tracos: ["Agitado, é sempre o primeiro", "Pode se explodir", "Não sente culpa por nada",
        "Espalha mentiras", "O primeiro a deixar o grupo pra trás", "Gosta de manusear fogo"] },
      { ate: 6, nome: "Frenéticos", tracos: ["Medroso, é facilmente assustado", "Se move de forma irregular", "Repete movimentos e palavras",
        "Perde facilmente o foco", "Não consegue ficar parado", "Grita do nada"] },
      { ate: 8, nome: "Enigmáticos", tracos: ["Ambíguo", "Comunicam-se por enigmas", "Usa aparatos tecnológicos",
        "É o primeiro a perceber algo de errado", "Sabe usar qualquer tecnologia", "Conserta qualquer aparelho"] },
      { ate: 10, nome: "Teatrais", tracos: ["Melodramático", "Extremamente emocionado", "Se comunica com frases famosas",
        "Veste-se de forma extravagante", "Anuncia o que vai fazer antes de fazer", "Gosta de atos performáticos e catastróficos"] },
    ],
    aparencia: [
      "Tatuagens brilhantes que mudam constantemente", "Mechas do cabelo mudam de cor conforme o humor", "Implante ocular de visão noturna",
      "Pele modificada que anula detecção de radiação de calor", "Descargas elétricas flutuam e protegem o corpo", "Fala robótica e distorcida",
      "Aura neon colorida e brilhante", "Drone tático acoplado no corpo", "Veias são fios elétricos que saem da pele", "Cabelos eletrificados e tostados",
      "Sua sombra não para de se mover", "Seus reflexos em superfícies são inconsistentes", "Objetos perto flutuam levemente",
      "Deixa rastros triplicados ao se movimentar", "Piercings geram pequenas descargas elétricas", "Circuitos eletrônicos espalhados pelo corpo",
      "Hologramas de onomatopeias surgem ao redor", "Corpo plasmático, mostrando ossos cheios de circuitos",
      "Pequenos aparelhos eletrônicos usados como acessórios", "Spikes metálicas e estilosas saindo do corpo",
    ],
  };

  function gerarProducao(rolar) {
    var r = typeof rolar === "function" ? rolar : function (faces) { return 1 + Math.floor(Math.random() * faces); };
    var g = GERADOR_DE_PRODUCAO;
    var d10 = r(10);
    var perfil = g.perfis.filter(function (p) { return d10 <= p.ate; })[0] || g.perfis[g.perfis.length - 1];
    var d6a = r(6), d6b = r(6), d20a = r(20), d20b = r(20);
    return {
      dados: { perfil: d10, tracos: [d6a, d6b], aparencia: [d20a, d20b] },
      perfil: perfil.nome,
      tracos: [perfil.tracos[d6a - 1], perfil.tracos[d6b - 1]],
      aparencia: [g.aparencia[d20a - 1], g.aparencia[d20b - 1]],
      referencia: "Arquivos Secretos 4, p. 48",
    };
  }


  /* =================================================================
     GERADOR DE FUNCIONÁRIOS DA TV VARMINHO — Arquivos Secretos 5, p. 23
     -----------------------------------------------------------------
     1d10 decide o perfil; dois d6 INDEPENDENTES, os dois traços (cada um
     na coluna do perfil, sem somar); dois d20 independentes, as duas
     características. Só narrativa: nenhum poder, nenhuma estatística,
     nenhuma ficha. Os Alheios jogáveis estão no catálogo (doppelgangers,
     hospedeiros…); o Estrangeiro e os funcionários de exemplo não têm
     números no livro, e o R.A.M.A. não inventa. Resultados repetidos: o
     livro não diz o que fazer — ficam como saíram.
     ================================================================= */

  var GERADOR_DA_VARMINHO = {
    fonte: "AS5", pagina: 23,
    perfis: [
      { ate: 2, nome: "Associados comportamentais", nota: "Ainda em conexão: decida com a mesa uma forma de os jogadores conseguirem salvá-lo (p. 23).",
        tracos: ["Simula medo", "Simula paixão", "Simula obsessão", "Simula remorso", "Simula nostalgia", "Simula raiva"] },
      { ate: 4, nome: "Engravatados", tracos: ["Finge querer subir na “hierarquia”", "Ajusta a gravata constantemente", "Esquece obstáculos físicos",
        "Fica imóvel quando não observado", "Ameaça desconhecidos", "Sempre encarando"] },
      { ate: 6, nome: "Câmeras", tracos: ["Gesticula como se estivesse filmando", "Coloca a câmera na cara das pessoas", "Não fala português",
        "Completamente inexpressivo", "Tem a reação oposta à que deveria ter", "Se distrai fácil"] },
      { ate: 8, nome: "Equipe editorial", tracos: ["Tem um bordão", "Faz pegadinhas com os outros da equipe", "Tenta muito ser engraçado",
        "Faz expressões faciais fora de contexto", "Mente pros outros do escritório, mas eles sabem", "Fofoqueiro"] },
      { ate: 10, nome: "Apresentadores", tracos: ["Paródia de um ator", "Paródia de um apresentador de televisão", "Paródia de personagem de desenho",
        "Paródia de um cantor", "Paródia de um mascote", "Paródia de um comercial"] },
    ],
    caracteristicas: [
      "Pele que parece não encaixar direito", "Olhos redondos que parecem ser de plástico", "Cabelo desgrenhado ou parecendo flutuar",
      "Roupas que se misturam com a pele", "Pele com uma textura enrugada", "Um segundo par de pupilas",
      "Óculos de armação verde e lentes escuras ovaladas", "Fumaça verde saindo do corpo", "Pele acinzentada ou esverdeada", "Dedos alongados",
      "Braços alongados", "Pernas alongadas", "Voz muito fina", "Boca substituída por riscos horizontais", "Odor de enxofre ou queimado",
      "Nariz e orelhas minúsculas ou inexistentes", "Carrega diversas câmeras de vídeo e fotografia", "Sempre sorri", "Crânio alongado",
      "Cifose protuberante",
    ],
  };

  function gerarVarminho(rolar) {
    var r = typeof rolar === "function" ? rolar : function (faces) { return 1 + Math.floor(Math.random() * faces); };
    var g = GERADOR_DA_VARMINHO;
    var d10 = r(10);
    var perfil = g.perfis.filter(function (p) { return d10 <= p.ate; })[0] || g.perfis[g.perfis.length - 1];
    var d6a = r(6), d6b = r(6), d20a = r(20), d20b = r(20);
    return {
      dados: { perfil: d10, tracos: [d6a, d6b], aparencia: [d20a, d20b] },
      perfil: perfil.nome,
      nota: perfil.nota || "",
      tracos: [perfil.tracos[d6a - 1], perfil.tracos[d6b - 1]],
      aparencia: [g.caracteristicas[d20a - 1], g.caracteristicas[d20b - 1]],
      referencia: "Arquivos Secretos 5, p. 23",
    };
  }

  /* A TV Varminho como referência de preparo (p. 20–33), em resumo
     próprio: a torre, os papéis, os programas, o ciclo e os ganchos.
     Consulta — nada aqui vira ficha, número ou regra. */
  var VARMINHO = {
    pagina: 20,
    resumo: "Emissora de fachada da cidade de Varminho (MG), reaberta com programação tomada pela Transmissão. No sexto andar da torre está um dos seis Sinos de Tenebris — o que permite a Transmissão existir na Realidade.",
    andares: [
      { nome: "Primeiros andares (1º ao 3º)", pagina: 26, texto: "Escritório da equipe editorial, estúdios e sets. Tudo parece comum, mas é imitação imperfeita: privadas viradas para o lado errado, relógios só com os símbolos da Transmissão." },
      { nome: "Laboratórios (4º)", pagina: 26, texto: "Pesquisa com tecnologia incompreensível, corredores mal iluminados, tubos com líquido verde viscoso para conectar os Associados; doppelgangers sem função ficam parados encarando o vazio." },
      { nome: "Os Becos (5º)", pagina: 26, texto: "Um escritório corporativo abandonado e interminável, reescrito pela Transmissão: lâmpadas piscando, carpete mofado, paredes que se atravessam e uma sala de casulos biomecânicos ligados a terminais." },
      { nome: "O sexto andar", pagina: 27, texto: "Um único corredor tomado por cabos verdes vivos; no fim, a sala do Sino de Tenebris, cercado por seis cápsulas — uma vazia, quatro ocupadas quando a Ordem chegou, uma nunca usada." },
    ],
    papeis: [
      { nome: "Associados comportamentais", texto: "Ainda em processo de conexão nas máquinas; sentimentos fortes resistem. Os únicos que podem voltar a uma vida normal." },
      { nome: "Engravatados", texto: "Os mais comuns: uma espécie de guarda, altos, de terno, chapéu e óculos escuros. Combate tático." },
      { nome: "Câmeras", texto: "Atrás das câmeras e em todo papel de bastidor (recepção, faxina, estoque) — nunca do jeito certo. Faz-tudo, filmagem e edição." },
      { nome: "Equipe editorial", texto: "Roteiros dos programas e revisão do entendimento dos Sinais de quem chega à torre; olham para câmeras inexistentes depois de algo estranho." },
      { nome: "Apresentadores", texto: "Os rostos da emissora, em geral mais poderosos: apresentam o Sinal aos telespectadores." },
      { nome: "O Estrangeiro", texto: "O primeiro a se conectar com a Transmissão; tudo se originou dele. Personagem narrativo — o livro não lhe dá ficha." },
    ],
    programas: [
      { nome: "Atividade Física", texto: "Futebol escolar que vira mistura de todos os esportes, com narradores robóticos que nunca respiram." },
      { nome: "Comunicação", texto: "O telejornal de William Bonantos, que sorri ao noticiar desaparecimentos; o quadro “Quem Ainda Está Assistindo?” lê nomes de moradores." },
      { nome: "Emissão Você", texto: "Culinária com Joana Traga e o pinguim empalhado Ruivo Zezé, que muda de posição entre cortes." },
      { nome: "Baseball abcdefghjklmpqrtuvwxyz", texto: "Desenho violento e desconfortável do guerreiro Raposinha, defendendo bolas de baseball de ameaças do espaço." },
    ],
    funcionamento: "A equipe editorial escreve os roteiros com os Sinais; os apresentadores gravam; os câmeras inserem Sinais na edição. A vítima que chega é testada e posta numa cápsula, onde um terminal descreve, na linguagem da Transmissão, um momento ou desejo dela: quem traduzir e interpretar corretamente uma dessas mensagens faz a vítima sentir de novo a emoção — e a conexão falha. Imagens da vítima nos programas atraem quem a ama (p. 29).",
    ganchos: [
      { nome: "Sobreviventes dos Becos", pagina: 31, texto: "Pessoas comuns acordam em casulos nos Becos, sem memórias inteiras: salvar os outros, fugir da torre ou subir até o topo." },
      { nome: "Show do Sinalzão", pagina: 31, texto: "Desaparecidos de Minas Gerais foram vistos por último num programa de perguntas na linguagem da Transmissão; errar acaba o programa." },
      { nome: "Monstros do Esgoto", pagina: 32, texto: "Passos metálicos e gosma verde ácida nos esgotos urbanos; algo cresce sob a cidade." },
      { nome: "Caçador", pagina: 32, texto: "Um acampamento na Amazônia dissolvido por ácido verde; fitas VHS mostram uma criatura inteligente que estudava as vítimas." },
    ],
    exemplos: [
      { nome: "Ravi, o Covarde", papel: "Associado comportamental", pagina: 24 },
      { nome: "Pedro, o Ex-Militar", papel: "Engravatado", pagina: 24 },
      { nome: "Aline, a Faxineira", papel: "Câmera", pagina: 25 },
      { nome: "Estácio Hudpai, no Fim da Carreira", papel: "Equipe editorial", pagina: 25 },
      { nome: "Adam Sanolly, o Ator", papel: "Apresentador", pagina: 25 },
    ],
    notaExemplos: "Funcionários de exemplo, só narrativos: o livro não dá estatísticas a nenhum deles (p. 24–25).",
  };

  /* =================================================================
     INQUÉRITO PARANORMAL — Arquivos Secretos 4, p. 76–78
     -----------------------------------------------------------------
     Consulta e preparo de cena: o que a investigação pode render contra
     uma ameaça do catálogo, sem refazer a ficha. NÃO é errata: o modelo
     do catálogo não muda. Cada ajuda só vale numa ocorrência quando o
     mestre a registra nela, à mão (e o livro pede que os jogadores não
     saibam dos efeitos de cara).
     ================================================================= */

  var INQUERITO = {
    pagina: 76,
    geral: "Ajudas resolvidas com números brutos (−10 em testes, rolagens de dano e/ou Defesa), condições severas (desprevenido, debilitado, esmorecido, lento, indefeso, cego…) e/ou remoção de RD ou imunidades. Itens e rituais de uso único ou de situação muito específica resolvem o caso sem virar trunfo pela série toda (p. 78).",
    porCriatura: {
      "as1.criatura.apostolo-do-sangue": [
        { id: "filha", pagina: 76, titulo: "Lembrar da filha", efeito: "Entra em conflito e abre a guarda: atordoado por 1 rodada e −10 em testes e na Defesa até o fim do combate." },
        { id: "tomo", pagina: 76, titulo: "Tomo amaldiçoado de Morte", efeito: "Usado uma vez contra ele (ser de Sangue): perde metade dos pontos de vida; o tomo se desfaz em Lodo." },
        { id: "lodo", pagina: 76, titulo: "Armadilha de Lodo de Morte", efeito: "Ao sair do Lodo, não consegue usar rituais de Sangue até o fim do combate." },
      ],
      "op.criatura.nidere": [
        { id: "arma", pagina: 77, titulo: "Arma amaldiçoada de Energia do templo", efeito: "Na presença da arma, o nidere fica debilitado, esmorecido, lento e desprevenido; ela também destrói a engenhoca (o Enigma de Medo continua a ser resolvido)." },
      ],
    },
  };

  function inquerito(catalogoId) {
    var l = INQUERITO.porCriatura[String(catalogoId || "")];
    return l ? { geral: INQUERITO.geral, ajudas: l, referencia: "Arquivos Secretos 4, p. " + INQUERITO.pagina + "–78" } : null;
  }

  global.RAMAOrdemCriaturas = {
    FONTES: FONTES,
    GERADOR_DE_TRANSTORNADOS: GERADOR_DE_TRANSTORNADOS,
    gerarTranstornado: gerarTranstornado,
    GERADOR_DE_PRODUCAO: GERADOR_DE_PRODUCAO,
    gerarProducao: gerarProducao,
    GERADOR_DA_VARMINHO: GERADOR_DA_VARMINHO,
    gerarVarminho: gerarVarminho,
    VARMINHO: VARMINHO,
    inquerito: inquerito,
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
