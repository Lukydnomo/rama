/* =====================================================================
   R.A.M.A. — Ordem Paranormal · definições Homebrew na ficha (v9.8)
   ---------------------------------------------------------------------
   Classes e elementos Homebrew entram no motor de Ordem pelo MESMO
   catálogo das oficiais (RAMAOrdemCatalogo.classe, progressaoDaClasse,
   EVOLUCAO_PATENTES), registrados a partir de uma CÓPIA guardada na
   ficha:

     ordem.homebrew = { versao, classes: { chave: def }, elementos: { chave: def } }

   A chave de uma classe é versionada (hbc-<id>-<hash da definição>):
   editar a classe na biblioteca cria outra versão, e o personagem em
   jogo continua com a dele — sem mudar em silêncio. Quem abre a ficha (o
   Mestre, quem a recebeu) não precisa alcançar a biblioteca de ninguém.

   UMA CLASSE HOMEBREW (o formato das oficiais, mais o que a mesa diz):
     nome, resumo, pv/pe/san/pd iniciais e por marco ({ base, atributo }),
     perícias fixas, escolhas obrigatórias e livres, proficiências, grau
     de treinamento, poderesDe / trilhasDe (a lista oficial de poderes e
     trilhas que ela usa, ou nenhuma), e as TABELAS:
       progressao  20 marcos (NEX 5%…99%, e o nível com NEX & Experiência)
       patentes    as 5 patentes (Evolução por Patentes), com PV/PD
   Faltou a tabela de um trilho: a classe NÃO é oferecida nele (o motivo
   aparece) — nunca cai na tabela de Combatente, Especialista ou Ocultista.

   Sem DOM: testes/executar-homebrew-ordem.js.
   ===================================================================== */

(function (global) {
  "use strict";

  function C() { return global.RAMAOrdemCatalogo; }
  function EL() { return global.RAMAOrdemElementos; }
  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  function lista(v) { return Array.isArray(v) ? v : []; }
  function texto(v, max) { return String(v === undefined || v === null ? "" : v).slice(0, max || 200); }
  function int(v, min, max, p) { var n = Math.round(Number(v)); return isFinite(n) && v !== "" && v !== null && v !== undefined ? Math.max(min, Math.min(max, n)) : p; }
  function estavel(v) {
    if (Array.isArray(v)) return "[" + v.map(estavel).join(",") + "]";
    if (v && typeof v === "object") return "{" + Object.keys(v).sort().map(function (k) { return JSON.stringify(k) + ":" + estavel(v[k]); }).join(",") + "}";
    return JSON.stringify(v === undefined ? null : v);
  }
  function hash(t) { var h = 5381; for (var i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36).slice(0, 6); }

  var NEX = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 99];
  var ESCOLHAS = [
    { chave: "trilha", rotulo: "Trilha" }, { chave: "poderClasse", rotulo: "Poder de classe" },
    { chave: "atributo", rotulo: "Aumento de atributo" }, { chave: "grauTreinamento", rotulo: "Grau de treinamento" },
    { chave: "versatilidade", rotulo: "Versatilidade" },
  ];
  var ESCOLHAS_PATENTE = ESCOLHAS.concat([{ chave: "trilhaElite", rotulo: "Trilha (3ª ou 4ª habilidade)" }]);
  var OFICIAIS = ["combatente", "especialista", "ocultista"];
  var PADRAO_CHAVE = /^hbc-[a-z0-9-]{3,60}$/;

  function recurso(b, padraoBase, atributos) {
    var x = obj(b);
    return { base: int(x.base, 0, 99, padraoBase), atributo: atributos.indexOf(x.atributo) >= 0 ? x.atributo : null };
  }
  function pericias(v, max) {
    return lista(v).map(String).filter(function (k, i, l) { return (!C() || C().pericia(k)) && l.indexOf(k) === i; }).slice(0, max);
  }
  function escolhasDe(v, validas) {
    var ok = validas.map(function (e) { return e.chave; });
    return lista(v).map(String).filter(function (k, i, l) { return ok.indexOf(k) >= 0 && l.indexOf(k) === i; });
  }
  function rotulos(v) { return lista(v).map(function (s) { return texto(s, 80).trim(); }).filter(Boolean).slice(0, 4); }

  /* A definição da classe, no formato que o catálogo e o motor leem. */
  function normalizarClasse(bruto) {
    var b = obj(bruto);
    var ATR_PV = ["vig", "for", "agi", "int", "pre"];
    var d = {
      chave: PADRAO_CHAVE.test(String(b.chave || "")) ? b.chave : "",
      nome: texto(b.nome, 60).trim() || "Classe Homebrew",
      perfil: "agente", homebrew: true, homebrewId: texto(b.homebrewId, 80),
      resumo: texto(b.resumo || b.descricao, 1200),
      pvInicial: recurso(b.pvInicial, 16, ATR_PV), pvPorNex: recurso(b.pvPorNex, 3, ATR_PV),
      peInicial: recurso(b.peInicial, 2, ATR_PV), pePorNex: recurso(b.pePorNex, 2, ATR_PV),
      sanInicial: recurso(b.sanInicial, 12, ATR_PV), sanPorNex: recurso(b.sanPorNex, 3, ATR_PV),
      pdInicial: recurso(b.pdInicial, 6, ATR_PV), pdPorNex: recurso(b.pdPorNex, 3, ATR_PV),
      periciasFixas: pericias(b.periciasFixas, 6),
      periciasEscolhaObrigatoria: lista(b.periciasEscolhaObrigatoria).map(function (x) { return { entre: pericias(obj(x).entre, 4) }; }).filter(function (x) { return x.entre.length >= 2; }).slice(0, 3),
      periciasLivres: { base: int(obj(b.periciasLivres).base, 0, 12, 2), atributo: obj(b.periciasLivres).atributo === null ? null : "int" },
      proficiencias: lista(b.proficiencias).map(function (s) { return texto(s, 60).trim(); }).filter(Boolean).slice(0, 8),
      grauTreinamentoBase: int(b.grauTreinamentoBase, 0, 10, 3),
      poderesDe: OFICIAIS.indexOf(b.poderesDe) >= 0 ? b.poderesDe : "",
      trilhasDe: OFICIAIS.indexOf(b.trilhasDe) >= 0 ? b.trilhasDe : "",
      habilidadesIniciais: lista(b.habilidadesIniciais).map(function (s) { return texto(s, 80).trim(); }).filter(Boolean).slice(0, 6),
      progressao: null, patentes: null,
    };
    var prog = lista(b.progressao);
    if (prog.length) {
      d.progressao = NEX.map(function (nex, i) {
        var e = obj(prog.filter(function (x) { return obj(x).nex === nex; })[0] || prog[i]);
        return { nex: nex, rotulos: rotulos(e.rotulos), escolhas: escolhasDe(e.escolhas, ESCOLHAS) };
      });
    }
    var pt = obj(b.patentes);
    if (lista(pt.patentes).length) {
      d.patentes = {
        pagina: 0, tabela: "Homebrew",
        pv: { base: int(obj(pt.pv).base, 0, 99, 16), porPatente: int(obj(pt.pv).porPatente, 0, 50, 8), atributo: obj(pt.pv).atributo === null ? null : "vig" },
        pd: { base: int(obj(pt.pd).base, 0, 99, 8), porPatente: int(obj(pt.pd).porPatente, 0, 50, 4), atributo: obj(pt.pd).atributo === null ? null : "pre" },
        periciasEscolhaObrigatoria: d.periciasEscolhaObrigatoria, periciasFixas: d.periciasFixas, periciasLivres: d.periciasLivres, proficiencias: d.proficiencias,
        patentes: [0, 1, 2, 3, 4].map(function (i) { var e = obj(lista(pt.patentes)[i]); return { escolhas: escolhasDe(e.escolhas, ESCOLHAS_PATENTE), rotulos: rotulos(e.rotulos) }; }),
      };
    }
    if (!d.chave) d.chave = chaveDaClasse(d);
    return d;
  }
  /* A chave muda quando a definição muda: cada versão é uma classe. */
  function chaveDaClasse(d) {
    var semChave = Object.assign({}, d); delete semChave.chave;
    var id = String(d.homebrewId || "local").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "local";
    return "hbc-" + id + "-" + hash(estavel(semChave));
  }

  /* O trilho em uso aceita esta classe? */
  function disponivelNoTrilho(d, trilho) {
    var t = obj(trilho);
    if (t.porPatente) return d.patentes ? { ok: true } : { ok: false, motivo: d.nome + " não tem a tabela de Evolução por Patentes: a mesa precisa defini-la antes (ela não usa a de nenhuma classe oficial)." };
    return d.progressao ? { ok: true } : { ok: false, motivo: d.nome + " não tem a tabela de progressão por NEX (que também serve ao nível): a mesa precisa defini-la antes." };
  }
  function faltas(d) {
    var f = [];
    if (!d.progressao) f.push("tabela de progressão por NEX / nível");
    if (!d.patentes) f.push("tabela de Evolução por Patentes");
    return f;
  }

  /* O bloco que a ficha guarda. */
  function normalizarBloco(bruto) {
    var b = obj(bruto);
    var classes = {}, elementos = {};
    Object.keys(obj(b.classes)).slice(0, 8).forEach(function (k) {
      if (!PADRAO_CHAVE.test(k)) return;
      var d = normalizarClasse(Object.assign({}, b.classes[k], { chave: k }));
      classes[k] = d;
    });
    Object.keys(obj(b.elementos)).slice(0, 20).forEach(function (k) {
      if (EL() && EL().ehHomebrew(k)) elementos[k] = EL().normalizar(Object.assign({}, b.elementos[k], { chave: k }));
    });
    if (!Object.keys(classes).length && !Object.keys(elementos).length) return null;
    return { versao: 1, classes: classes, elementos: elementos };
  }
  /* Registra no catálogo (idempotente; chaves versionadas não colidem). */
  function registrar(bloco) {
    var b = obj(bloco);
    Object.keys(obj(b.classes)).forEach(function (k) { if (C() && C().registrarClasseHomebrew) C().registrarClasseHomebrew(b.classes[k]); });
    if (EL()) EL().registrarMapa(b.elementos);
  }

  /* Da biblioteca (registro com modelo) para a definição da ficha. */
  function deRegistro(reg) {
    var m = obj(obj(reg).modelo);
    if (m.sistema !== "ordem" || m.grupo !== "estrutural") return null;
    var def = Object.assign({}, obj(m.def), { nome: reg.nome, resumo: reg.descricao || obj(m.def).resumo, homebrewId: reg.id });
    if (m.subtipo === "classe") return { tipo: "classe", def: normalizarClasse(def) };
    if (m.subtipo === "elemento") return { tipo: "elemento", def: EL() ? EL().normalizar(Object.assign(def, { chave: obj(m.def).chave || "" })) : null };
    return null;
  }
  /* Põe uma definição na ficha (cópia) e registra. */
  function guardarNaFicha(ordem, tipo, def) {
    if (!ordem.homebrew || typeof ordem.homebrew !== "object") ordem.homebrew = { versao: 1, classes: {}, elementos: {} };
    if (!ordem.homebrew.classes) ordem.homebrew.classes = {};
    if (!ordem.homebrew.elementos) ordem.homebrew.elementos = {};
    var alvo = tipo === "classe" ? ordem.homebrew.classes : ordem.homebrew.elementos;
    alvo[def.chave] = JSON.parse(JSON.stringify(def));
    registrar(ordem.homebrew);
    return def.chave;
  }

  /* A prévia que a revisão mostra: o 1º marco e os ganhos, pelo motor. */
  function previa(d, atributos) {
    var a = Object.assign({ agi: 1, for: 1, int: 1, pre: 1, vig: 1 }, obj(atributos));
    function v(r) { return r.base + (r.atributo ? (a[r.atributo] || 0) : 0); }
    var linhas = [];
    linhas.push("NEX 5%: " + v(d.pvInicial) + " PV, " + v(d.peInicial) + " PE, " + v(d.sanInicial) + " SAN (com " + Object.keys(a).map(function (k) { return k.toUpperCase() + " " + a[k]; }).join(", ") + ").");
    linhas.push("A cada marco depois: +" + v(d.pvPorNex) + " PV, +" + v(d.pePorNex) + " PE, +" + v(d.sanPorNex) + " SAN.");
    if (d.progressao) {
      var esc = {}; d.progressao.forEach(function (e) { e.escolhas.forEach(function (x) { esc[x] = (esc[x] || 0) + 1; }); });
      linhas.push("Até NEX 99%: " + Object.keys(esc).map(function (k) { return esc[k] + "× " + ESCOLHAS.filter(function (e) { return e.chave === k; })[0].rotulo.toLowerCase(); }).join(", ") + ".");
    }
    if (d.patentes) linhas.push("Patentes: " + (d.patentes.pv.base + (d.patentes.pv.atributo ? a.vig : 0)) + " PV em Recruta, +" + d.patentes.pv.porPatente + " por patente.");
    return linhas;
  }
  /* A tabela de uma classe oficial, como ponto de partida do editor. */
  function modeloDeOficial(chave) {
    var c = C() && C().classe(chave);
    if (!c) return null;
    var d = JSON.parse(JSON.stringify(c));
    d.progressao = JSON.parse(JSON.stringify(C().progressaoDaClasse(chave))).map(function (e) {
      return { nex: e.nex, rotulos: e.rotulos, escolhas: e.escolhas.filter(function (x) { return ESCOLHAS.some(function (y) { return y.chave === x; }); }) };
    });
    var ep = C().EVOLUCAO_PATENTES && C().EVOLUCAO_PATENTES.classes[chave];
    if (ep) d.patentes = JSON.parse(JSON.stringify(ep));
    d.poderesDe = chave; d.trilhasDe = chave;
    delete d.chave; delete d.pagina; delete d.circuloPorNex;
    return d;
  }

  /* A biblioteca da conta (as suas e as públicas): os elementos entram
     nos seletores desta página; as classes ficam para a criação. Uma
     viagem só, quando uma tela precisa (nunca na sincronia da ficha). */
  var biblioteca = null, carga = null;
  function carregarBiblioteca(forcar) {
    if (biblioteca && !forcar) return Promise.resolve(biblioteca);
    if (carga && !forcar) return carga;
    var API = global.RAMAApi;
    if (!API || !API.listarHomebrew) return Promise.resolve({ classes: [], elementos: [] });
    carga = API.listarHomebrew({ escopo: "todos", tipos: ["classe", "elemento"] }).then(function (r) {
      carga = null;
      var saida = { classes: [], elementos: [] };
      ((r && r.ok && r.dados) || []).forEach(function (reg) {
        var x = deRegistro(reg);
        if (!x || !x.def) return;
        if (x.tipo === "elemento") { if (EL()) EL().registrar(x.def); saida.elementos.push(x.def); }
        if (x.tipo === "classe") saida.classes.push(Object.assign({ meu: reg.meu !== false }, x.def));
      });
      biblioteca = saida;
      return saida;
    }, function () { carga = null; return { classes: [], elementos: [] }; });
    return carga;
  }

  global.RAMAOrdemHomebrew = {
    carregarBiblioteca: carregarBiblioteca,
    NEX: NEX, ESCOLHAS: ESCOLHAS, ESCOLHAS_PATENTE: ESCOLHAS_PATENTE, OFICIAIS: OFICIAIS,
    normalizarClasse: normalizarClasse, chaveDaClasse: chaveDaClasse, disponivelNoTrilho: disponivelNoTrilho, faltas: faltas,
    normalizarBloco: normalizarBloco, registrar: registrar, deRegistro: deRegistro, guardarNaFicha: guardarNaFicha,
    previa: previa, modeloDeOficial: modeloDeOficial,
  };
})(typeof window !== "undefined" ? window : globalThis);
