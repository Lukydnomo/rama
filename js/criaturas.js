/* =====================================================================
   R.A.M.A. — criaturas
   ---------------------------------------------------------------------
   O modelo de uma criatura: a de Homebrew, a do catálogo oficial e a
   ocorrência dela num combate ou como aliado.

   ---------------------------------------------------------------------
   DOIS EIXOS QUE NÃO SE MISTURAM (v2.28)
   ---------------------------------------------------------------------

     sistema   as REGRAS da ficha. "universal" é a mini ficha de sempre
               (status, atributos com dado, perícias por atributo,
               ataques, habilidades); "ordem" é a ficha de ameaça de
               Ordem Paranormal. Criatura sem `sistema` é universal —
               é assim que toda criatura anterior à v2.28 continua
               abrindo, sem conversão nenhuma.

     origem    DE ONDE ela veio: { tipo: "catalogo" | "homebrew", ... }.
               Homebrew é origem, não sistema: uma criatura de Homebrew
               pode ser de Ordem ou universal.

   ---------------------------------------------------------------------
   NÚCLEO COMUM E BLOCO DO SISTEMA
   ---------------------------------------------------------------------

   Todo sistema usa o mesmo núcleo: identidade (nome, natureza,
   categoria, descrição), recursos (`status`, onde a vida tem id "vida"
   e o esforço id "pe"), `atributos`, `pericias`, `habilidades` e
   `acoes`. A imagem continua fora, na aba própria. O que só existe em
   Ordem — VD, elementos, Presença Perturbadora, defesas, resistências,
   deslocamentos, estados de fase e Enigma de Medo — fica no bloco
   `ordem`.

   Em Ordem, a perícia tem a PRÓPRIA expressão ("3d20+10"): a ficha
   publicada já traz o número pronto, com tudo somado, e recalcular a
   partir do atributo somaria duas vezes. Nada aqui calcula estatística.

   ---------------------------------------------------------------------
   VALORES ESPECIAIS
   ---------------------------------------------------------------------

     0          zero
     null       não informado
     "—"        não se aplica (Uivar não tem Força)
     outro texto  mostrado como está e nunca rolado ("veja texto")

   ---------------------------------------------------------------------
   MODELO x OCORRÊNCIA
   ---------------------------------------------------------------------

   O modelo é o que a biblioteca guarda. A OCORRÊNCIA é a cópia que
   entra num combate ou vira aliado: id próprio e um bloco `instancia`
   com o que muda durante o jogo — estados de fase, usos de habilidades
   limitadas, marcadores, Enigma resolvido e uma anotação. A vida e o
   esforço continuam em `status`. Os valores de referência nunca são
   reescritos: resolver o Enigma muda a VISTA (vistaEfetiva), não a
   ficha guardada.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var D = global.RAMADados;
  var H = global.RAMAHabilidades;

  /* Sugestão de partida, não regra: são só dois status, e ambos podem
     ser removidos ou renomeados como qualquer outro. */
  var STATUS_SUGERIDOS = [{ nome: "Vida" }, { nome: "Esforço" }];

  var SISTEMA_ORDEM = "ordem";
  var SISTEMA_UNIVERSAL = "universal";
  var NAO_SE_APLICA = "—";

  var ELEMENTOS = ["sangue", "morte", "conhecimento", "energia", "medo"];
  var NATUREZAS = ["paranormal", "humana", "animal"];
  var TIPOS_DE_ACAO = ["padrao", "movimento", "completa", "livre", "reacao"];
  var PERIODOS = ["rodada", "turno", "cena", "combate", "interlúdio", "dia", "missão"];
  var TIPOS_DE_ROLAGEM = ["teste", "dano", "soma"];

  var ATRIBUTOS_ORDEM = [
    { id: "agi", sigla: "AGI", nome: "Agilidade" },
    { id: "for", sigla: "FOR", nome: "Força" },
    { id: "int", sigla: "INT", nome: "Intelecto" },
    { id: "pre", sigla: "PRE", nome: "Presença" },
    { id: "vig", sigla: "VIG", nome: "Vigor" },
  ];

  var ID_VIDA = "vida";
  var ID_PE = "pe";

  function lista(v) { return Array.isArray(v) ? v : []; }

  /* O id de uma parte da ficha; num arquivo exportado ele vem como
     `chave` (a exportação apaga todo `id`) — ver criaturaPortavel em
     js/validacao.js. */
  function idDe(x) {
    if (x.id) return x.id;
    if (typeof x.chave === "string" && /^[A-Za-z0-9_.:-]{1,90}$/.test(x.chave)) return x.chave;
    return U.uuid();
  }

  function sistemaDe(c) { return c && c.sistema === SISTEMA_ORDEM ? SISTEMA_ORDEM : SISTEMA_UNIVERSAL; }
  function ehOrdem(c) { return sistemaDe(c) === SISTEMA_ORDEM; }

  /* =================================================================
     CRIAR
     ================================================================= */

  function criar(dados) {
    var d = dados || {};
    if (d.sistema === SISTEMA_ORDEM) return criarOrdem(d);
    return {
      tipo: "criatura",
      nome: U.aparar(d.nome, 120) || "Nova criatura",
      visibilidade: d.visibilidade === "publico" ? "publico" : "privado",
      descricao: U.aparar(d.descricao, 4000),
      status: STATUS_SUGERIDOS.map(function (s) {
        return { id: U.uuid(), nome: s.nome, atual: 0, maximo: 0 };
      }),
      atributos: [],
      pericias: [],
      ataques: [],
      habilidades: [],
    };
  }

  /* Uma ficha de Ordem em branco: a vida e os cinco atributos já
     existem, porque toda ameaça do livro os tem; o resto começa vazio. */
  function criarOrdem(dados) {
    var d = dados || {};
    return normalizar({
      tipo: "criatura",
      sistema: SISTEMA_ORDEM,
      nome: U.aparar(d.nome, 120) || "Nova criatura",
      visibilidade: d.visibilidade === "publico" ? "publico" : "privado",
      natureza: "paranormal",
      origem: { tipo: "homebrew" },
      status: [{ id: ID_VIDA, nome: "Pontos de vida", atual: 0, maximo: 0 }],
      atributos: ATRIBUTOS_ORDEM.map(function (a) { return { id: a.id, nome: a.nome, sigla: a.sigla, valor: 0 }; }),
      pericias: [],
      habilidades: [],
      acoes: [],
      ordem: { tipo: "Criatura", tamanho: "Médio", elementos: [] },
    });
  }

  /* =================================================================
     NORMALIZAR
     ================================================================= */

  function normalizar(bruto) {
    var b = (bruto && typeof bruto === "object") ? bruto : {};
    if (b.sistema === SISTEMA_ORDEM) return normalizarOrdem(b);

    var criatura = {
      tipo: "criatura",
      nome: U.aparar(b.nome, 120) || "Criatura",
      visibilidade: b.visibilidade === "publico" ? "publico" : "privado",
      categoria: U.aparar(b.categoria, 60),
      descricao: U.aparar(b.descricao, 4000),
      status: lista(b.status).map(normalizarStatus).filter(Boolean),
      atributos: lista(b.atributos).map(normalizarAtributo).filter(Boolean),
    };

    if (b.id) criatura.id = b.id;
    /* Campos novos do núcleo só aparecem quando vieram: uma criatura
       antiga sai daqui exatamente como entrou. */
    if (b.sistema === SISTEMA_UNIVERSAL) criatura.sistema = SISTEMA_UNIVERSAL;
    if (NATUREZAS.indexOf(b.natureza) >= 0) criatura.natureza = b.natureza;
    if (b.origem && typeof b.origem === "object") criatura.origem = normalizarOrigem(b.origem);

    var ids = criatura.atributos.map(function (a) { return a.id; });

    /* Perícia sem atributo válido é religada ao primeiro — e se não
       houver atributo nenhum, ela é descartada: sem atributo ela não
       teria dado para rolar. */
    criatura.pericias = lista(b.pericias)
      .map(function (p) { return normalizarPericia(p, ids); })
      .filter(Boolean);

    criatura.ataques = lista(b.ataques).map(normalizarAtaque).filter(Boolean);
    criatura.habilidades = lista(b.habilidades).map(H.normalizarHabilidade).filter(Boolean);
    if (Array.isArray(b.acoes) && b.acoes.length) criatura.acoes = unicos(b.acoes.map(function (a) { return normalizarEfeito(a, true); }));
    if (b.instancia && typeof b.instancia === "object") criatura.instancia = normalizarInstancia(b.instancia, criatura);

    return criatura;
  }

  function normalizarStatus(s) {
    if (!s || typeof s !== "object") return null;
    var nome = U.aparar(s.nome, 40);
    if (!nome) return null;
    var maximo = Math.max(0, U.inteiro(s.maximo, 0));
    var atual = U.inteiro(s.atual, 0);
    return {
      id: idDe(s),
      nome: nome,
      atual: maximo > 0 ? U.limitar(atual, 0, maximo) : Math.max(0, atual),
      maximo: maximo,
    };
  }

  function normalizarAtributo(a) {
    if (!a || typeof a !== "object") return null;
    var nome = U.aparar(a.nome, 40);
    if (!nome) return null;
    return {
      id: a.id || U.uuid(),
      nome: nome,
      sigla: (U.aparar(a.sigla, 6) || nome.slice(0, 3)).toUpperCase(),
      valor: U.inteiro(a.valor, 0),
      dado: D.normalizar(a.dado) || "1d20",
    };
  }

  function normalizarPericia(p, idsAtributo) {
    if (!p || typeof p !== "object") return null;
    var nome = U.aparar(p.nome, 60);
    if (!nome || !idsAtributo.length) return null;

    var atributoId = idsAtributo.indexOf(p.atributoId) >= 0 ? p.atributoId : idsAtributo[0];

    return {
      id: p.id || U.uuid(),
      nome: nome,
      atributoId: atributoId,
      bonus: U.inteiro(p.bonus, 0),
      bonusTemporario: U.inteiro(p.bonusTemporario, 0),
      dadosExtras: [],
    };
  }

  function normalizarAtaque(a) {
    if (!a || typeof a !== "object") return null;
    var nome = U.aparar(a.nome, 80);
    if (!nome) return null;
    return {
      id: a.id || U.uuid(),
      nome: nome,
      periciaId: a.periciaId || null,
      dado: D.normalizar(a.dado) || "",
      dano: D.normalizar(a.dano),
      danoExtra: U.aparar(a.danoExtra, 20),
      critico: Math.max(0, U.inteiro(a.critico, 0)),
      multiplicador: Math.max(1, U.inteiro(a.multiplicador, 2)),
      descricao: U.aparar(a.descricao, 1000),
    };
  }

  function normalizarOrigem(o) {
    var tipo = o.tipo === "catalogo" ? "catalogo" : "homebrew";
    var saida = { tipo: tipo };
    if (o.catalogoId) saida.catalogoId = U.aparar(o.catalogoId, 120);
    if (o.livro) saida.livro = U.aparar(o.livro, 20);
    if (o.pagina !== undefined && o.pagina !== null && o.pagina !== "") saida.pagina = U.inteiro(o.pagina, 0) || null;
    if (o.copiadoDe) saida.copiadoDe = U.aparar(o.copiadoDe, 120);
    return saida;
  }

  /* ---------------- valores de ficha ---------------- */

  function ehNaoSeAplica(t) { return /^[—–-]$/.test(t); }

  /* Uma estatística rolável (Percepção, Fortitude…): expressão de teste
     válida, "—", null, ou texto que só é mostrado. */
  function valorDeTeste(v) {
    if (v === null || v === undefined) return null;
    var t = String(v).trim();
    if (!t) return null;
    if (ehNaoSeAplica(t)) return NAO_SE_APLICA;
    var r = D.termos(t);
    if (r.ok && D.testeValido(t)) return r.expressao;
    return U.aparar(t, 160);
  }

  /* Um número de ficha (Defesa, machucado, DT): inteiro, "—", null ou
     texto. */
  function valorNumerico(v) {
    if (v === null || v === undefined || v === "") return null;
    if (typeof v === "number") return Number.isFinite(v) ? Math.round(v) : null;
    var t = String(v).trim();
    if (!t) return null;
    if (ehNaoSeAplica(t)) return NAO_SE_APLICA;
    if (/^-?\d+$/.test(t)) return parseInt(t, 10);
    return U.aparar(t, 160);
  }

  /* Como a tela deve tratar um valor de ficha. */
  function classificar(v) {
    if (v === null || v === undefined || v === "") return { tipo: "nd", texto: "Não informado" };
    if (v === NAO_SE_APLICA) return { tipo: "na", texto: "—" };
    if (typeof v === "number") return { tipo: "numero", texto: String(v), valor: v };
    if (D.testeValido(v)) return { tipo: "expressao", texto: String(v), expressao: String(v) };
    return { tipo: "texto", texto: String(v) };
  }

  function textos(v, max, tamanho) {
    return lista(v).map(function (x) { return U.aparar(x, tamanho || 200); }).filter(Boolean).slice(0, max || 40);
  }

  /* ---------------- Ordem ---------------- */

  function normalizarOrdem(b) {
    var criatura = {
      tipo: "criatura",
      sistema: SISTEMA_ORDEM,
      versao: 2,
      nome: U.aparar(b.nome, 120) || "Criatura",
      visibilidade: b.visibilidade === "publico" ? "publico" : "privado",
      natureza: NATUREZAS.indexOf(b.natureza) >= 0 ? b.natureza : "paranormal",
      categoria: U.aparar(b.categoria, 60),
      descricao: U.aparar(b.descricao, 4000),
      origem: normalizarOrigem(b.origem && typeof b.origem === "object" ? b.origem : {}),
      status: lista(b.status).map(normalizarStatus).filter(Boolean),
      atributos: normalizarAtributosOrdem(b.atributos),
      pericias: unicos(lista(b.pericias).map(normalizarPericiaOrdem)),
      ataques: [],
      habilidades: unicos(lista(b.habilidades).map(function (h) { return normalizarEfeito(h, false); })),
      acoes: unicos(lista(b.acoes).map(function (a) { return normalizarEfeito(a, true); })),
      ordem: normalizarBlocoOrdem(b.ordem || {}),
    };
    if (b.id) criatura.id = b.id;
    if (b.instancia && typeof b.instancia === "object") criatura.instancia = normalizarInstancia(b.instancia, criatura);
    return criatura;
  }

  /* Ids repetidos numa lista quebrariam o estado da ocorrência (o uso
     de uma ação acabaria contado na outra): o segundo ganha id novo. */
  function unicos(itens) {
    var vistos = {};
    return itens.filter(Boolean).map(function (x) {
      if (vistos[x.id]) x.id = U.uuid();
      vistos[x.id] = true;
      return x;
    });
  }

  function normalizarAtributosOrdem(brutos) {
    var porSigla = {};
    lista(brutos).forEach(function (a) {
      if (a && typeof a === "object") porSigla[String(a.sigla || a.id || "").toUpperCase()] = a;
    });
    return ATRIBUTOS_ORDEM.map(function (base) {
      var a = porSigla[base.sigla] || {};
      var naoAplica = a.naoAplica === true || a.valor === NAO_SE_APLICA || (typeof a.valor === "string" && ehNaoSeAplica(a.valor.trim()));
      var valor = naoAplica || a.valor === null || a.valor === undefined || a.valor === "" ? null : U.inteiro(a.valor, 0);
      return {
        id: base.id,
        nome: base.nome,
        sigla: base.sigla,
        valor: valor,
        naoAplica: naoAplica,
        /* O dado do teste de atributo em Ordem: tantos d20 quanto o
           valor, ficando o maior; com 0, dois d20 e fica o menor. */
        dado: naoAplica || valor === null ? "" : (valor > 0 ? Math.min(valor, D.MAX_QUANTIDADE) + "d20" : "-2d20"),
      };
    });
  }

  function normalizarPericiaOrdem(p) {
    if (!p || typeof p !== "object") return null;
    var nome = U.aparar(p.nome, 80);
    if (!nome) return null;
    var expressao = valorDeTeste(p.expressao);
    return { id: idDe(p), nome: nome, expressao: expressao };
  }

  function normalizarCritico(c) {
    if (c && typeof c === "object") {
      var m = U.limitar(U.inteiro(c.margem, 20), 2, 20);
      var x = U.limitar(U.inteiro(c.multiplicador, 2), 1, 10);
      return { margem: m, multiplicador: x };
    }
    var t = String(c === undefined || c === null ? "" : c).replace(/\s+/g, "").toLowerCase();
    var margem = 20;
    var mult = 2;
    var mm = /^(\d{1,2})/.exec(t);
    if (mm) margem = U.limitar(parseInt(mm[1], 10), 2, 20);
    var mx = /x(\d{1,2})/.exec(t);
    if (mx) mult = U.limitar(parseInt(mx[1], 10), 1, 10);
    return { margem: margem, multiplicador: mult };
  }

  function textoDoCritico(c) {
    if (!c) return "20/x2";
    return (c.margem < 20 ? c.margem : "20") + "/x" + c.multiplicador;
  }

  function normalizarPartesDeDano(dano) {
    return lista(Array.isArray(dano) ? dano : (dano ? [dano] : []))
      .map(function (p) { return U.aparar(typeof p === "object" && p ? (p.expressao + " " + (p.tipo || "")) : p, 120); })
      .filter(Boolean).slice(0, 6);
  }

  function normalizarAtaqueOrdem(a) {
    if (!a || typeof a !== "object") return null;
    var nome = U.aparar(a.nome, 80);
    if (!nome) return null;
    var saida = {
      id: idDe(a),
      nome: nome,
      alcance: U.aparar(a.alcance, 60),
      quantidade: U.limitar(U.inteiro(a.quantidade, 1), 1, 20),
      teste: valorDeTeste(a.teste),
      dano: normalizarPartesDeDano(a.dano),
      critico: normalizarCritico(a.critico),
      nota: U.aparar(a.nota, 400),
    };
    /* AS2: "multiplica em caso de crítico" — o dano extra da ficha
       também multiplica (Machado do Mutilador). */
    if (a.multiplicaTudo === true) saida.multiplicaTudo = true;
    return saida;
  }

  function normalizarRolagem(r) {
    if (!r || typeof r !== "object") return null;
    var tipo = TIPOS_DE_ROLAGEM.indexOf(r.tipo) >= 0 ? r.tipo : "soma";
    var rotulo = U.aparar(r.rotulo, 80) || (tipo === "dano" ? "Dano" : tipo === "teste" ? "Teste" : "Rolagem");
    var saida = { id: idDe(r), tipo: tipo, rotulo: rotulo };
    if (tipo === "dano") saida.partes = normalizarPartesDeDano(r.partes || r.expressao);
    else saida.expressao = U.aparar(String(r.expressao || "").replace(/\s+/g, ""), 80);
    return saida;
  }

  function normalizarLimite(l) {
    if (!l) return null;
    var quantidade = Array.isArray(l) ? l[0] : l.quantidade;
    var periodo = Array.isArray(l) ? l[1] : l.periodo;
    var n = U.inteiro(quantidade, 0);
    if (n < 1) return null;
    var p = String(periodo || "").trim().toLowerCase().replace("interludio", "interlúdio").replace("missao", "missão");
    return { quantidade: Math.min(n, 99), periodo: PERIODOS.indexOf(p) >= 0 ? p : "cena" };
  }

  function normalizarRequisito(r) {
    if (!r) return null;
    var estado = Array.isArray(r) ? r[0] : r.estado;
    var minimo = Array.isArray(r) ? r[1] : r.minimo;
    var id = U.aparar(estado, 60);
    if (!id) return null;
    return { estado: id, minimo: Math.max(0, U.inteiro(minimo, 1)) };
  }

  /* Habilidade (passiva) e ação têm o mesmo corpo; a ação tem tipo e
     pode trazer ataques. */
  function normalizarEfeito(e, ehAcao) {
    if (!e || typeof e !== "object") return null;
    var nome = U.aparar(e.nome, 120);
    if (!nome) return null;
    var saida = { id: idDe(e), nome: nome, texto: U.aparar(e.texto, 8000) };
    if (ehAcao) {
      saida.tipo = TIPOS_DE_ACAO.indexOf(e.tipo) >= 0 ? e.tipo : "padrao";
      saida.ataques = unicos(lista(e.ataques).map(normalizarAtaqueOrdem)).slice(0, 12);
    }
    saida.rolagens = unicos(lista(e.rolagens).map(normalizarRolagem)).slice(0, 12);
    var resistencia = U.aparar(e.resistencia, 200);
    if (resistencia) saida.resistencia = resistencia;
    var limite = normalizarLimite(e.limite);
    if (limite) saida.limite = limite;
    var requer = normalizarRequisito(e.requer);
    if (requer) saida.requer = requer;
    ["marcador", "custo", "recarga"].forEach(function (k) {
      var v = U.aparar(e[k], k === "recarga" ? 120 : 60);
      if (v) saida[k] = v;
    });
    /* As habilidades de uma criatura universal continuam sendo as da
       ficha: o que não é mecânica (cor, etiqueta) passa direto. */
    if (!ehAcao && e.origem) saida.origem = U.aparar(e.origem, 60);
    return saida;
  }

  function normalizarResistencias(v) {
    return lista(v).map(function (r) {
      if (Array.isArray(r)) return { valor: U.inteiro(r[0], 0), tipos: textos(r.slice(1), 20, 60) };
      if (r && typeof r === "object") return { valor: U.inteiro(r.valor, 0), tipos: textos(r.tipos, 20, 60) };
      return null;
    }).filter(function (r) { return r && r.tipos.length; }).slice(0, 20);
  }

  function normalizarDeslocamento(v) {
    return lista(v).map(function (d) {
      var metros = Array.isArray(d) ? d[0] : d && d.metros;
      var quadrados = Array.isArray(d) ? d[1] : d && d.quadrados;
      var modo = Array.isArray(d) ? d[2] : d && d.modo;
      var m = Number(metros);
      if (!Number.isFinite(m) || m < 0) return null;
      var q = quadrados === undefined || quadrados === null || quadrados === "" ? null : U.inteiro(quadrados, 0);
      return { metros: Math.round(m * 10) / 10, quadrados: q, modo: U.aparar(modo, 30) };
    }).filter(Boolean).slice(0, 8);
  }

  /* O que uma fase ou o Enigma muda. Só as chaves que vierem existem —
     ausente quer dizer "continua igual"; lista vazia quer dizer "perde
     todas". */
  function normalizarAltera(a) {
    if (!a || typeof a !== "object") return null;
    var saida = {};
    if (a.defesa !== undefined) saida.defesa = valorNumerico(a.defesa);
    ["percepcao", "iniciativa", "fortitude", "reflexos", "vontade"].forEach(function (k) {
      if (a[k] !== undefined) saida[k] = valorDeTeste(a[k]);
    });
    if (Array.isArray(a.resistencias)) saida.resistencias = normalizarResistencias(a.resistencias);
    if (Array.isArray(a.imunidades)) saida.imunidades = textos(a.imunidades, 30, 120);
    if (Array.isArray(a.vulnerabilidades)) saida.vulnerabilidades = textos(a.vulnerabilidades, 30, 120);
    if (Array.isArray(a.deslocamento)) saida.deslocamento = normalizarDeslocamento(a.deslocamento);
    if (Array.isArray(a.desativar)) saida.desativar = textos(a.desativar, 30, 120);
    if (a.atributos && typeof a.atributos === "object") {
      var at = {};
      Object.keys(a.atributos).forEach(function (s) {
        var sigla = String(s).toUpperCase();
        if (ATRIBUTOS_ORDEM.some(function (x) { return x.sigla === sigla; })) at[sigla] = U.inteiro(a.atributos[s], 0);
      });
      if (Object.keys(at).length) saida.atributos = at;
    }
    return Object.keys(saida).length ? saida : null;
  }

  function normalizarBlocoOrdem(o) {
    var vd = o.vd === null || o.vd === undefined || o.vd === "" ? null : U.inteiro(o.vd, 0);
    var saida = {
      vd: vd,
      nivel: U.aparar(o.nivel, 60),
      elementos: lista(o.elementos).filter(function (e, i, l) { return ELEMENTOS.indexOf(e) >= 0 && l.indexOf(e) === i; }),
      tipo: U.aparar(o.tipo, 40) || "Criatura",
      tamanho: o.tamanho ? U.aparar(o.tamanho, 30) : null,
      presenca: null,
      percepcao: valorDeTeste(o.percepcao),
      iniciativa: valorDeTeste(o.iniciativa),
      sentidos: textos(o.sentidos, 12, 80),
      defesa: valorNumerico(o.defesa),
      fortitude: valorDeTeste(o.fortitude),
      reflexos: valorDeTeste(o.reflexos),
      vontade: valorDeTeste(o.vontade),
      machucado: valorNumerico(o.machucado),
      resistencias: normalizarResistencias(o.resistencias),
      imunidades: textos(o.imunidades, 30, 120),
      vulnerabilidades: textos(o.vulnerabilidades, 30, 120),
      deslocamento: normalizarDeslocamento(o.deslocamento),
      estados: [],
      notas: textos(o.notas, 20, 1000),
      forma: null,
      enigma: null,
      variante: null,
    };

    if (o.presenca && typeof o.presenca === "object") {
      var dano = String(o.presenca.dano || "").replace(/\s+/g, "");
      saida.presenca = {
        dt: o.presenca.dt === null || o.presenca.dt === undefined || o.presenca.dt === "" ? null : U.inteiro(o.presenca.dt, 0),
        dano: D.termos(dano).ok ? D.termos(dano).expressao : U.aparar(o.presenca.dano, 40),
        imune: U.aparar(o.presenca.imune, 60),
      };
    }

    var vistos = {};
    saida.estados = lista(o.estados).map(function (e) {
      if (!e || typeof e !== "object") return null;
      var id = U.aparar(e.id || e.chave, 60).replace(/[^A-Za-z0-9_.-]/g, "");
      var nome = U.aparar(e.nome, 80);
      if (!id || !nome || vistos[id]) return null;
      vistos[id] = true;
      var maximo = U.limitar(U.inteiro(e.maximo, 1), 1, 99);
      var estado = { id: id, nome: nome, maximo: maximo, inicial: U.limitar(U.inteiro(e.inicial, 0), 0, maximo) };
      var altera = normalizarAltera(e.altera);
      if (altera) estado.altera = altera;
      return estado;
    }).filter(Boolean).slice(0, 12);

    if (o.forma && typeof o.forma === "object" && (o.forma.inicial || o.forma.nota)) {
      saida.forma = { inicial: U.aparar(o.forma.inicial, 120), nota: U.aparar(o.forma.nota, 1000) };
    }

    if (o.enigma && typeof o.enigma === "object" && (o.enigma.texto || o.enigma.efeito)) {
      saida.enigma = {
        texto: U.aparar(o.enigma.texto, 4000),
        efeito: U.aparar(o.enigma.efeito, 2000),
        altera: normalizarAltera(o.enigma.altera),
        rolagens: unicos(lista(o.enigma.rolagens).map(normalizarRolagem)).slice(0, 6),
      };
    }

    if (o.variante && typeof o.variante === "object" && o.variante.de) {
      saida.variante = { de: U.aparar(o.variante.de, 120), rotulo: U.aparar(o.variante.rotulo, 60) };
    }

    /* Arquivos Secretos 2 (v2.30): as fichas transformadas (Mutilador
       Noturno, Colosso...) são FORMAS da mesma ocorrência, não outra
       criatura. `pvBase` guarda os PV máximos da ficha de partida. */
    var vistasF = {};
    var formas = lista(o.formas).map(normalizarForma).filter(function (f) {
      if (!f || vistasF[f.id]) return false;
      vistasF[f.id] = true;
      return true;
    }).slice(0, 6);
    if (formas.length) {
      saida.formas = formas;
      var base = U.inteiro(o.pvBase, 0);
      saida.pvBase = base > 0 ? base : null;
    }
    /* Perfil "como aliado" (OPRPG p. 170): benefícios, sem PV nem PE.
       `ficha` aponta a ficha de ameaça da mesma pessoa, quando existe. */
    if (o.aliada === true) {
      saida.aliada = true;
      if (o.ficha && typeof o.ficha === "object" && o.ficha.id) {
        saida.ficha = { id: U.aparar(o.ficha.id, 120), nome: U.aparar(o.ficha.nome, 120), pagina: o.ficha.pagina ? U.inteiro(o.ficha.pagina, 0) : null };
      }
    }

    return saida;
  }

  var CAMPOS_DE_TESTE_DA_FORMA = ["percepcao", "iniciativa", "fortitude", "reflexos", "vontade"];

  function normalizarForma(f) {
    if (!f || typeof f !== "object") return null;
    var id = U.aparar(f.id, 60).replace(/[^A-Za-z0-9_.-]/g, "");
    var nome = U.aparar(f.nome, 120);
    var pv = U.inteiro(f.pv, 0);
    if (!id || !nome || !(pv > 0)) return null;
    var forma = {
      id: id, nome: nome,
      pagina: f.pagina ? U.inteiro(f.pagina, 0) : null,
      vd: f.vd === null || f.vd === undefined || f.vd === "" ? null : U.inteiro(f.vd, 0),
      pv: pv,
      machucado: valorNumerico(f.machucado),
      defesa: valorNumerico(f.defesa),
      ativacao: U.aparar(f.ativacao, 2000),
      notas: textos(f.notas, 10, 1000),
      pericias: unicos(lista(f.pericias).map(normalizarPericiaOrdem)),
      habilidades: unicos(lista(f.habilidades).map(function (h) { return normalizarEfeito(h, false); })),
      acoes: unicos(lista(f.acoes).map(function (a) { return normalizarEfeito(a, true); })),
    };
    CAMPOS_DE_TESTE_DA_FORMA.forEach(function (k) { if (f[k] !== undefined && f[k] !== null) forma[k] = valorDeTeste(f[k]); });
    if (Array.isArray(f.deslocamento)) forma.deslocamento = normalizarDeslocamento(f.deslocamento);
    if (Array.isArray(f.resistencias)) forma.resistencias = normalizarResistencias(f.resistencias);
    return forma;
  }

  function formaAtivaDe(c) {
    var id = c && c.instancia && c.instancia.forma;
    return id ? U.porId(lista(c.ordem && c.ordem.formas), id) : null;
  }

  /* Trocar de forma muda os PV MÁXIMOS para os da ficha publicada da
     forma (ou da ficha de partida) e só PRENDE os atuais no novo
     máximo — nunca os restaura. */
  function ajustarVidaDaForma(c, forma) {
    var vida = U.porId(c.status, ID_VIDA);
    if (!vida) return;
    var maximo = forma ? forma.pv : (c.ordem && c.ordem.pvBase) || vida.maximo;
    if (!(maximo > 0)) return;
    vida.maximo = maximo;
    vida.atual = Math.max(0, Math.min(vida.atual, maximo));
  }

  /* ---------------- ocorrência ---------------- */

  var CHAVE_LIVRE = /^[A-Za-z0-9_.:-]{1,90}$/;

  function normalizarInstancia(i, criatura) {
    var estadosDaFicha = {};
    lista(criatura.ordem && criatura.ordem.estados).forEach(function (e) { estadosDaFicha[e.id] = e; });

    var saida = { estados: {}, usos: {}, marcadores: {}, enigma: i.enigma === true, nota: U.aparar(i.nota, 1000) };
    Object.keys(i.estados || {}).forEach(function (id) {
      var e = estadosDaFicha[id];
      if (!e) return;
      var v = U.limitar(U.inteiro(i.estados[id], 0), 0, e.maximo);
      if (v) saida.estados[id] = v;
    });
    Object.keys(i.usos || {}).forEach(function (id) {
      if (!CHAVE_LIVRE.test(id)) return;
      var v = U.limitar(U.inteiro(i.usos[id], 0), 0, 999);
      if (v) saida.usos[id] = v;
    });
    Object.keys(i.marcadores || {}).forEach(function (id) {
      if (CHAVE_LIVRE.test(id) && i.marcadores[id] === true) saida.marcadores[id] = true;
    });
    if (typeof i.forma === "string" && i.forma && U.porId(lista(criatura.ordem && criatura.ordem.formas), i.forma)) saida.forma = i.forma;
    return saida;
  }

  /* A ocorrência nova: estados no valor inicial, vida cheia. */
  function iniciarInstancia(c) {
    var estados = {};
    lista(c.ordem && c.ordem.estados).forEach(function (e) { if (e.inicial) estados[e.id] = e.inicial; });
    c.instancia = { estados: estados, usos: {}, marcadores: {}, enigma: false, nota: "" };
    /* Com formas (AS2), a ocorrência nova começa na ficha de partida. */
    if (lista(c.ordem && c.ordem.formas).length && c.ordem.pvBase) ajustarVidaDaForma(c, null);
    return c;
  }

  /* Muda UM campo da ocorrência — o mesmo formato da operação
     `criatura_instancia` do combate, para a ficha do aliado e o combate
     usarem a mesma regra:

       "estado:<id>"    inteiro de 0 ao máximo do estado
       "uso:<id>"       inteiro de 0 a 999
       "marcador:<id>"  booleano
       "enigma"         booleano
       "nota"           texto (até 1000)
       "forma"          id de uma forma de ordem.formas, ou "" para a
                        ficha de partida (v2.30): troca os PV máximos e
                        prende os atuais, sem restaurar nada

     Devolve false se a chave ou o valor não valem — nada muda. */
  function definirNaInstancia(c, chave, valor) {
    if (!c || typeof chave !== "string") return false;
    if (!c.instancia) c.instancia = { estados: {}, usos: {}, marcadores: {}, enigma: false, nota: "" };
    var inst = c.instancia;
    if (chave === "enigma") {
      if (typeof valor !== "boolean") return false;
      inst.enigma = valor;
      return true;
    }
    if (chave === "nota") {
      if (typeof valor !== "string") return false;
      inst.nota = U.aparar(valor, 1000);
      return true;
    }
    if (chave === "forma") {
      var formas = lista(c.ordem && c.ordem.formas);
      if (typeof valor !== "string" || !formas.length) return false;
      var alvo = valor ? U.porId(formas, valor) : null;
      if (valor && !alvo) return false;
      if ((inst.forma || "") === valor) return true;
      if (valor) inst.forma = valor; else delete inst.forma;
      ajustarVidaDaForma(c, alvo);
      return true;
    }
    var m = /^(estado|uso|marcador):(.+)$/.exec(chave);
    if (!m || !CHAVE_LIVRE.test(m[2])) return false;
    if (m[1] === "marcador") {
      if (typeof valor !== "boolean") return false;
      if (valor) inst.marcadores[m[2]] = true; else delete inst.marcadores[m[2]];
      return true;
    }
    var n = Number(valor);
    if (!Number.isFinite(n) || Math.round(n) !== n) return false;
    if (m[1] === "estado") {
      var e = U.porId(c.ordem && c.ordem.estados, m[2]);
      if (!e || n < 0 || n > e.maximo) return false;
      if (n) inst.estados[m[2]] = n; else delete inst.estados[m[2]];
      return true;
    }
    if (n < 0 || n > 999) return false;
    if (n) inst.usos[m[2]] = n; else delete inst.usos[m[2]];
    return true;
  }

  function valorDoEstado(c, id) {
    var i = c && c.instancia;
    return i && i.estados && i.estados[id] ? i.estados[id] : 0;
  }

  /* =================================================================
     A VISTA DO JOGO
     -----------------------------------------------------------------
     O que a mesa vê agora: os valores de referência com o que as fases
     ativas e o Enigma resolvido mudam por cima. Cada habilidade e ação
     sai marcada como `desativada` (o Enigma a tirou) ou `inativa` (o
     estado que ela exige não foi atingido) — elas continuam visíveis
     para consulta, só deixam de ser a jogada óbvia.
     ================================================================= */

  function vistaEfetiva(bruta) {
    var c = U.copiar(bruta);
    if (!ehOrdem(c)) return c;
    var o = c.ordem;
    var alteracoes = [];

    /* A forma ativa troca a ficha publicada por inteiro; vida, estados,
       usos, marcadores e anotação continuam os da ocorrência. */
    var forma = formaAtivaDe(c);
    if (forma) {
      ["vd", "defesa", "machucado", "percepcao", "iniciativa", "fortitude", "reflexos", "vontade", "deslocamento", "resistencias"].forEach(function (k) {
        if (forma[k] !== undefined && forma[k] !== null) o[k] = U.copiar(forma[k]);
      });
      if (forma.pericias.length) c.pericias = U.copiar(forma.pericias);
      c.habilidades = U.copiar(forma.habilidades);
      c.acoes = U.copiar(forma.acoes);
      c.formaAtiva = { id: forma.id, nome: forma.nome, pagina: forma.pagina, ativacao: forma.ativacao, notas: forma.notas.slice() };
    }

    lista(o.estados).forEach(function (e) {
      if (e.altera && valorDoEstado(c, e.id) >= 1) alteracoes.push({ origem: e.nome, altera: e.altera });
    });
    var enigmaResolvido = !!(c.instancia && c.instancia.enigma && o.enigma);
    if (enigmaResolvido && o.enigma.altera) alteracoes.push({ origem: "Enigma de Medo", altera: o.enigma.altera });

    var desativadas = {};
    var alterados = {};
    alteracoes.forEach(function (x) {
      var a = x.altera;
      ["defesa", "percepcao", "iniciativa", "fortitude", "reflexos", "vontade", "resistencias", "imunidades", "vulnerabilidades", "deslocamento"]
        .forEach(function (k) {
          if (a[k] === undefined) return;
          o[k] = U.copiar(a[k]);
          alterados[k] = x.origem;
        });
      if (a.atributos) {
        c.atributos.forEach(function (at) {
          if (a.atributos[at.sigla] === undefined) return;
          at.valor = a.atributos[at.sigla];
          at.naoAplica = false;
          at.dado = at.valor > 0 ? at.valor + "d20" : "-2d20";
          alterados["atributo:" + at.sigla] = x.origem;
        });
      }
      lista(a.desativar).forEach(function (nome) { desativadas[U.chaveDeBusca(nome)] = x.origem; });
    });

    function marcar(ef) {
      var chave = U.chaveDeBusca(ef.nome);
      if (desativadas[chave]) { ef.desativada = true; ef.motivo = desativadas[chave]; }
      if (ef.requer && valorDoEstado(c, ef.requer.estado) < ef.requer.minimo) ef.inativa = true;
      return ef;
    }
    c.habilidades.forEach(marcar);
    lista(c.acoes).forEach(marcar);

    c.alterados = alterados;
    c.enigmaResolvido = enigmaResolvido;
    return c;
  }

  /* Machucado: vida atual na metade ou abaixo — pelo valor IMPRESSO de
     machucado, que é o que a ficha manda (ele nem sempre é a metade). */
  function estaMachucada(c) {
    if (!ehOrdem(c)) return false;
    var vida = U.porId(c.status, ID_VIDA);
    var forma = formaAtivaDe(c);
    var limite = forma && typeof forma.machucado === "number" ? forma.machucado : c.ordem && c.ordem.machucado;
    return !!(vida && typeof limite === "number" && vida.maximo > 0 && vida.atual <= limite);
  }

  /* =================================================================
     IMAGENS DO CATÁLOGO (v2.28)
     -----------------------------------------------------------------
     Toda criatura do catálogo tem duas imagens no próprio site:
     assets/criaturas/<livro>/<nome>/retrato.png (1:1) e corpo.png
     (corpo inteiro, qualquer tamanho) — ver assets/criaturas/LEIA-ME.md.
     Valem para a ficha do catálogo e para as cópias dela (Homebrew,
     combate, aliado), pelo rastro em `origem`. Nada disso é gravado na
     criatura: o caminho sai do id, sempre.
     ================================================================= */

  function idDoCatalogo(c) {
    var o = (c && c.origem) || {};
    return o.catalogoId || o.copiadoDe || null;
  }

  function imagensDoCatalogo(alvo) {
    var id = typeof alvo === "string" ? alvo : idDoCatalogo(alvo);
    var m = /^(op|sah|as1|as2)\.criatura\.([a-z0-9.-]+)$/.exec(String(id || ""));
    if (!m) return null;
    var base = "assets/criaturas/" + m[1] + "/" + m[2] + "/";
    var url = U.url || function (x) { return x; };
    return { retrato: url(base + "retrato.png"), corpo: url(base + "corpo.png") };
  }

  /* =================================================================
     RESUMO E VALIDAÇÃO
     ================================================================= */

  /* O que uma LISTA precisa saber, sem a ficha inteira. */
  function resumo(bruta) {
    var c = bruta && bruta.sistema === SISTEMA_ORDEM && bruta.ordem && Array.isArray(bruta.acoes) ? bruta : normalizar(bruta);
    var vida = U.porId(c.status, ID_VIDA) || (c.status || [])[0] || null;
    var r = { sistema: sistemaDe(c), nome: c.nome, natureza: c.natureza || "", categoria: c.categoria || "" };
    if (vida) r.pv = vida.maximo;
    if (ehOrdem(c)) {
      r.vd = c.ordem.vd;
      r.nivel = c.ordem.nivel || "";
      r.elementos = c.ordem.elementos.slice();
      r.tamanho = c.ordem.tamanho || "";
      r.tipo = c.ordem.tipo;
      if (c.origem && c.origem.livro) { r.livro = c.origem.livro; r.pagina = c.origem.pagina || null; }
    }
    return r;
  }

  /* Problemas que impedem a ficha de funcionar direito. Lista vazia =
     ficha boa. Serve ao catálogo (teste de integridade) e ao editor. */
  function validar(bruta) {
    var c = normalizar(bruta);
    var erros = [];
    if (!U.aparar(bruta && bruta.nome)) erros.push("sem nome");
    if (!ehOrdem(c)) return erros;

    var o = c.ordem;
    ["percepcao", "iniciativa", "fortitude", "reflexos", "vontade"].forEach(function (k) {
      var bruto = bruta.ordem && bruta.ordem[k];
      if (bruto && typeof bruto === "string" && /\d+d\d+/i.test(bruto) && !D.testeValido(bruto)) erros.push(k + ": expressão inválida");
    });
    if (!U.porId(c.status, ID_VIDA) && !o.aliada) erros.push("sem pontos de vida");
    lista(c.pericias).forEach(function (p) {
      if (!p.expressao || !D.testeValido(p.expressao)) erros.push("perícia " + p.nome + ": expressão inválida");
    });
    var estados = {};
    o.estados.forEach(function (e) { estados[e.id] = true; });
    function conferir(ef, onde) {
      lista(ef.ataques).forEach(function (a) {
        if (!a.teste || !D.testeValido(a.teste)) erros.push(onde + " " + ef.nome + " · " + a.nome + ": teste inválido");
        if (!a.dano.length || !D.danoValido(a.dano)) erros.push(onde + " " + ef.nome + " · " + a.nome + ": dano inválido");
      });
      lista(ef.rolagens).forEach(function (r) {
        var ok = r.tipo === "dano" ? D.danoValido(r.partes) : r.tipo === "teste" ? D.testeValido(r.expressao) : D.termos(r.expressao).ok;
        if (!ok) erros.push(onde + " " + ef.nome + " · " + r.rotulo + ": rolagem inválida");
      });
      if (ef.requer && !estados[ef.requer.estado]) erros.push(onde + " " + ef.nome + ": exige o estado inexistente " + ef.requer.estado);
    }
    c.habilidades.forEach(function (h) { conferir(h, "habilidade"); });
    c.acoes.forEach(function (a) { conferir(a, "ação"); });
    lista(o.formas).forEach(function (f) {
      f.pericias.forEach(function (p) { if (!p.expressao || !D.testeValido(p.expressao)) erros.push("forma " + f.nome + " · perícia " + p.nome + ": expressão inválida"); });
      f.habilidades.forEach(function (h) { conferir(h, "forma " + f.nome + " · habilidade"); });
      f.acoes.forEach(function (a) { conferir(a, "forma " + f.nome + " · ação"); });
    });
    if (lista(o.formas).length && !(o.pvBase > 0)) erros.push("formas sem os PV da ficha de partida");
    if (o.presenca && o.presenca.dano && !D.termos(o.presenca.dano).ok) erros.push("presença: dano inválido");
    return erros;
  }

  /* =================================================================
     ROLAGEM (criatura universal)
     ================================================================= */

  /* Prepara o pedido de rolagem de um ataque, reusando o motor. Se o
     ataque aponta para uma perícia, ela manda; se não, um dado próprio
     serve — uma criatura simples pode ter só "2d20" e pronto. */
  function pedidoDeAtaque(criatura, ataque) {
    var pericia = U.porId(criatura.pericias, ataque.periciaId);

    if (pericia) {
      var atributo = U.porId(criatura.atributos, pericia.atributoId);
      return {
        nome: ataque.nome,
        sigla: atributo ? atributo.sigla : "",
        expressao: atributo ? atributo.dado : "1d20",
        bonus: U.inteiro(pericia.bonus, 0),
        bonusTemporario: U.inteiro(pericia.bonusTemporario, 0),
        modificadores: [],
      };
    }

    return {
      nome: ataque.nome,
      sigla: "",
      expressao: ataque.dado || "1d20",
      bonus: 0, bonusTemporario: 0, modificadores: [],
    };
  }

  function pedidoDePericia(criatura, pericia) {
    var atributo = U.porId(criatura.atributos, pericia.atributoId);
    return {
      nome: pericia.nome,
      sigla: atributo ? atributo.sigla : "",
      expressao: atributo ? atributo.dado : "1d20",
      bonus: U.inteiro(pericia.bonus, 0),
      bonusTemporario: U.inteiro(pericia.bonusTemporario, 0),
      modificadores: [],
    };
  }

  /* =================================================================
     OCORRÊNCIAS
     ================================================================= */

  /* O SNAPSHOT que entra num combate. Cada ocorrência tem id próprio:
     "Existido #1" e "Existido #2" vêm do mesmo modelo e têm vidas
     independentes. Editar a criatura na biblioteca — ou corrigir o
     catálogo — depois não muda combate nenhum que já foi montado. */
  function paraCombate(modelo, numero) {
    var copia = normalizar(modelo);
    delete copia.id;
    copia.visibilidade = "privado";
    if (ehOrdem(copia)) iniciarInstancia(copia);

    return {
      id: U.uuid(),
      tipo: "criatura",
      origemId: modelo.id || (copia.origem && copia.origem.catalogoId) || null,
      nome: copia.nome + (numero ? " #" + numero : ""),
      ordem: 0,
      snapshot: copia,
    };
  }

  /* Aliados usam a mesma criatura, em uma ocorrência independente. A
     imagem comprimida acompanha a ficha em BLOCOS, nunca o Homebrew. */
  function criarAliado(modelo, imagem) {
    var c = normalizar(modelo || criar());
    delete c.id;
    c.visibilidade = "privado";
    if (ehOrdem(c) && !c.instancia) iniciarInstancia(c);
    return {
      id: U.uuid(),
      origemId: modelo && (modelo.id || (modelo.origem && modelo.origem.catalogoId)) || null,
      criatura: c, imagem: imagem || "",
    };
  }

  function normalizarAliados(bruto) {
    var ids = {};
    return lista(bruto).filter(function (a) { return a && a.criatura && typeof a.criatura === "object"; })
      .map(function (a) {
        var id = a.id && !ids[a.id] ? String(a.id) : U.uuid();
        ids[id] = true;
        var c = normalizar(a.criatura);
        delete c.id;
        c.visibilidade = "privado";
        var saida = { id: id, origemId: a.origemId || null, criatura: c,
          imagem: typeof a.imagem === "string" && /^data:image\/(png|jpeg|webp|gif|bmp);base64,[A-Za-z0-9+/=]+$/.test(a.imagem) ? a.imagem : "" };
        var perigo = normalizarPerigo(a.perigo);
        if (perigo) saida.perigo = perigo;
        return saida;
      });
  }

  /* Aliados em Perigo (Arquivos Secretos 2, p. 24 — regra opcional):
     cada uso arriscado do aliado é uma rolagem de 1d6 registrada; ímpar
     fere. Os ferimentos contam POR CENA (`cena` é a marca da cena da
     ficha) e o segundo na mesma cena mata — só depois que a mesa
     confirma. Cada aliado tem o seu registro. */
  function normalizarPerigo(p) {
    if (!p || typeof p !== "object") return null;
    var registros = lista(p.registros).filter(function (r) { return r && typeof r === "object" && r.id; }).slice(-20).map(function (r) {
      return { id: U.aparar(r.id, 80), em: U.aparar(r.em, 40), cena: U.aparar(r.cena, 80), d6: U.limitar(U.inteiro(r.d6, 0), 0, 6),
        ferido: r.ferido === true, situacao: U.aparar(r.situacao, 200) };
    });
    var saida = { cena: U.aparar(p.cena, 80), feridas: U.limitar(U.inteiro(p.feridas, 0), 0, 1), morto: p.morto === true,
      pendente: p.pendente === true, registros: registros };
    if (!saida.registros.length && !saida.feridas && !saida.morto && !saida.pendente) return null;
    return saida;
  }

  global.RAMACriaturas = {
    SISTEMA_ORDEM: SISTEMA_ORDEM,
    SISTEMA_UNIVERSAL: SISTEMA_UNIVERSAL,
    NAO_SE_APLICA: NAO_SE_APLICA,
    ELEMENTOS: ELEMENTOS,
    NATUREZAS: NATUREZAS,
    TIPOS_DE_ACAO: TIPOS_DE_ACAO,
    PERIODOS: PERIODOS,
    ATRIBUTOS_ORDEM: ATRIBUTOS_ORDEM,
    ID_VIDA: ID_VIDA,
    ID_PE: ID_PE,
    STATUS_SUGERIDOS: STATUS_SUGERIDOS,
    criar: criar,
    criarOrdem: criarOrdem,
    normalizar: normalizar,
    sistemaDe: sistemaDe,
    ehOrdem: ehOrdem,
    classificar: classificar,
    valorDeTeste: valorDeTeste,
    valorNumerico: valorNumerico,
    normalizarCritico: normalizarCritico,
    textoDoCritico: textoDoCritico,
    iniciarInstancia: iniciarInstancia,
    definirNaInstancia: definirNaInstancia,
    valorDoEstado: valorDoEstado,
    vistaEfetiva: vistaEfetiva,
    estaMachucada: estaMachucada,
    formaAtivaDe: formaAtivaDe,
    normalizarPerigo: normalizarPerigo,
    resumo: resumo,
    validar: validar,
    idDoCatalogo: idDoCatalogo,
    imagensDoCatalogo: imagensDoCatalogo,
    pedidoDeAtaque: pedidoDeAtaque,
    pedidoDePericia: pedidoDePericia,
    paraCombate: paraCombate,
    criarAliado: criarAliado,
    normalizarAliados: normalizarAliados,
  };
})(typeof window !== "undefined" ? window : globalThis);
