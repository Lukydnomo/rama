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

   v9.9 — ORIGEM e TRILHA Homebrew, no mesmo esquema (chave versionada
   hbo-… / hbt-…, cópia em ordem.homebrew.origens / .trilhas):
     origem  perícias fixas e à escolha, o poder (nome e texto) e, se a
             mesa quiser, EFEITOS do conjunto que o motor já calcula
             (Defesa, PV/PE fixos, PV/SAN por marco, bônus em perícia)
     trilha  a classe oficial a que serve, um requisito opcional e os
             quatro poderes (NEX 10%, 40%, 65%, 99%), com os mesmos efeitos
   Nada mais é inventado: um poder sem efeito é informativo, como os do
   livro que dependem da cena.

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
  var PADRAO_ORIGEM = /^hbo-[a-z0-9-]{3,60}$/;
  var PADRAO_TRILHA = /^hbt-[a-z0-9-]{3,60}$/;
  var NEX_TRILHA = [10, 40, 65, 99];
  /* Os efeitos que uma origem ou um poder de trilha Homebrew podem ter:
     só os tipos que o motor de Ordem já soma (mesmo formato dos do livro). */
  var EFEITOS = [
    { chave: "defesa", rotulo: "Defesa", exemplo: "+2 em Defesa (como Patrulha)" },
    { chave: "pvFixo", rotulo: "PV (fixo)", exemplo: "+5 PV" },
    { chave: "peFixo", rotulo: "PE (fixo)", exemplo: "+2 PE" },
    { chave: "pvPorNex", rotulo: "PV por marco", exemplo: "+1 PV a cada 5% de NEX (como Calejado)" },
    { chave: "sanPorNex", rotulo: "SAN por marco", exemplo: "+1 SAN a cada 5% de NEX (como Cicatrizes Psicológicas)" },
    { chave: "bonusPericia", rotulo: "Bônus em perícia", exemplo: "+2 em Diplomacia", pericia: true },
  ];

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

  function efeitos(v) {
    var ok = EFEITOS.map(function (e) { return e.chave; });
    return lista(v).map(obj).filter(function (e) { return ok.indexOf(e.tipo) >= 0; }).map(function (e) {
      var x = { tipo: e.tipo, valor: int(e.valor, -5, 10, 0) };
      if (e.tipo === "bonusPericia") x.pericias = pericias(e.pericias || (e.pericia ? [e.pericia] : []), 1);
      return x;
    }).filter(function (e) { return e.valor !== 0 && (e.tipo !== "bonusPericia" || e.pericias.length); }).slice(0, 4);
  }
  function textoEfeito(e) {
    var sinal = e.valor > 0 ? "+" + e.valor : String(e.valor);
    if (e.tipo === "defesa") return sinal + " em Defesa";
    if (e.tipo === "pvFixo") return sinal + " PV";
    if (e.tipo === "peFixo") return sinal + " PE";
    if (e.tipo === "pvPorNex") return sinal + " PV a cada marco (5% de NEX)";
    if (e.tipo === "sanPorNex") return sinal + " SAN a cada marco (5% de NEX)";
    if (e.tipo === "bonusPericia") return sinal + " em " + ((C() && C().pericia(e.pericias[0])) || { nome: e.pericias[0] }).nome;
    return "";
  }
  function textoEscolha(e) {
    var lista = e.entre.length ? " entre " + e.entre.map(function (k) { return ((C() && C().pericia(k)) || { nome: k }).nome; }).join(" e ") : " à escolha";
    if (e.modo === "treinar") return "treinado numa perícia" + lista;
    if (e.modo === "treinarOuBonus") return "treinado numa perícia" + lista + " (+" + e.valor + " se já for)";
    return "+" + e.valor + " numa perícia" + lista;
  }
  function idCurto(d) { return String(d.homebrewId || "local").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "local"; }
  function chaveVersionada(prefixo, d) {
    var semChave = Object.assign({}, d); delete semChave.chave;
    return prefixo + idCurto(d) + "-" + hash(estavel(semChave));
  }

  /* ORIGEM Homebrew, no formato das do catálogo (pericias, poder, resumo,
     efeitos, automacao). Fonte "HOMEBREW": nunca bloqueada por suplemento. */
  function normalizarOrigem(bruto) {
    var b = obj(bruto);
    var d = {
      chave: PADRAO_ORIGEM.test(String(b.chave || "")) ? b.chave : "",
      nome: texto(b.nome, 60).trim() || "Origem Homebrew",
      homebrew: true, homebrewId: texto(b.homebrewId, 80), fonte: "HOMEBREW", pagina: 0,
      descricao: texto(b.descricao, 1200),
      pericias: pericias(b.pericias, 2),
      periciasAEscolher: int(b.periciasAEscolher, 0, 4, 0),
      periciasOpcoes: null,
      periciasObservacao: texto(b.periciasObservacao, 160).trim(),
      poder: texto(b.poder, 60).trim() || "Poder de origem",
      resumo: texto(b.resumo, 1200).trim(),
      efeitos: efeitos(b.efeitos),
    };
    var op = pericias(b.periciasOpcoes, 20).filter(function (k) { return d.pericias.indexOf(k) < 0; });
    if (d.periciasAEscolher && op.length >= d.periciasAEscolher) d.periciasOpcoes = op;
    if (!d.periciasOpcoes) delete d.periciasOpcoes;
    if (!d.periciasObservacao) delete d.periciasObservacao;
    d.automacao = d.efeitos.length ? "calculo" : "informacao";
    /* v9.16: a escolha de perícia no poder, no formato das origens do livro
       (escolhas + efeitosEscolha, como a Mutação do Experimento). */
    var esc = escolhaDoPoder(b.escolhaHb);
    if (esc) {
      d.escolhaHb = esc;
      var opc = { chave: "pericia", tipo: "pericia", rotulo: "Perícia — " + d.poder };
      if (esc.entre.length) opc.entre = esc.entre.slice();
      if (esc.modo === "treinar") opc.modo = "treinar";
      d.escolhas = [opc];
      d.efeitosEscolha = [esc.modo === "treinar" ? { tipo: "treinar", opcao: "pericia" } : esc.modo === "treinarOuBonus" ? { tipo: "treinarOuBonus", opcao: "pericia", bonus: esc.valor } : { tipo: "bonusPericia", opcao: "pericia", valor: esc.valor }];
      d.automacao = "calculo";
    }
    if (!d.chave) d.chave = chaveVersionada("hbo-", d);
    return d;
  }

  /* TRILHA Homebrew: serve a uma classe oficial (e às classes Homebrew que
     usam as trilhas dela); quatro poderes, um por marco de trilha. */
  /* v9.16: UMA escolha de perícia num poder de trilha (como a Carteirada:
     "treinado em Diplomacia ou Enganação, +2 se já for"). Quem joga
     decide na Progressão ("Falta decidir"), e o efeito entra na conta.
       treinar          treinado na perícia escolhida
       treinarOuBonus   treinado; se já for, +valor
       bonus            +valor na perícia escolhida */
  var MODOS_ESCOLHA = ["treinar", "treinarOuBonus", "bonus"];
  function escolhaDoPoder(bruto) {
    var e = obj(bruto);
    if (MODOS_ESCOLHA.indexOf(e.modo) < 0) return null;
    var x = { modo: e.modo, entre: pericias(e.entre, 8), valor: int(e.valor, 1, 5, 2) };
    if (x.entre.length === 1) x.entre = [];
    if (e.modo === "treinar") delete x.valor;
    return x;
  }
  function normalizarTrilha(bruto) {
    var b = obj(bruto);
    var pod = lista(b.poderes);
    var req = obj(lista(b.requisitos)[0]);
    var d = {
      chave: PADRAO_TRILHA.test(String(b.chave || "")) ? b.chave : "",
      nome: texto(b.nome, 60).trim() || "Trilha Homebrew",
      classe: OFICIAIS.indexOf(b.classe) >= 0 ? b.classe : "combatente",
      homebrew: true, homebrewId: texto(b.homebrewId, 80), fonte: "HOMEBREW", pagina: 0,
      resumo: texto(b.resumo || b.descricao, 1200).trim(),
      requisitos: req.tipo === "treinado" && C() && C().pericia(req.pericia) ? [{ tipo: "treinado", pericia: req.pericia }] : [],
      poderes: NEX_TRILHA.map(function (nex, i) {
        var p = obj(pod.filter(function (x) { return obj(x).nex === nex; })[0] || pod[i]);
        var ef = efeitos(p.efeitos);
        var x = { nex: nex, nome: texto(p.nome, 60).trim() || ("Poder de " + nex + "%"), resumo: texto(p.resumo, 1200).trim(), efeitos: ef, pagina: 0, automacao: ef.length ? "calculo" : "informacao" };
        var esc = escolhaDoPoder(p.escolha);
        if (esc) { x.escolha = esc; x.automacao = "calculo"; }
        return x;
      }),
    };
    if (!d.chave) d.chave = chaveVersionada("hbt-", d);
    return d;
  }

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
    /* v9.24: a classe que conjura rituais, como o Ocultista (Escolhido
       pelo Outro Lado): o círculo máximo por NEX. Só existe quando a
       mesa marcou — sem ela, a definição (e a chave) fica como antes. */
    var circulos = circulosPorNex(b.circuloPorNex);
    if (circulos) d.circuloPorNex = circulos;
    if (!d.chave) d.chave = chaveDaClasse(d);
    return d;
  }
  /* Até quatro faixas, uma por círculo (1º, 2º, 3º, 4º), cada uma num
     marco de NEX depois da anterior. A 1ª é obrigatória; um círculo sem
     marco válido encerra a lista (não há 3º sem 2º). */
  var CIRCULOS_DO_OCULTISTA = [{ nex: 5, circulo: 1 }, { nex: 25, circulo: 2 }, { nex: 55, circulo: 3 }, { nex: 85, circulo: 4 }];
  function circulosPorNex(v) {
    var l = lista(v).map(obj);
    if (!l.length) return null;
    var saida = [], ultimo = 0;
    for (var c = 1; c <= 4; c++) {
      var f = l.filter(function (x) { return Number(x.circulo) === c; })[0] || (l[c - 1] && l[c - 1].circulo === undefined ? l[c - 1] : null);
      var nex = f ? Math.round(Number(f.nex)) : NaN;
      if (!f || NEX.indexOf(nex) < 0 || nex <= ultimo) break;
      saida.push({ nex: nex, circulo: c });
      ultimo = nex;
    }
    return saida.length ? saida : null;
  }
  function chaveDaClasse(d) { return chaveVersionada("hbc-", d); }

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
    var classes = {}, elementos = {}, origens = {}, trilhas = {};
    Object.keys(obj(b.classes)).slice(0, 8).forEach(function (k) {
      if (!PADRAO_CHAVE.test(k)) return;
      var d = normalizarClasse(Object.assign({}, b.classes[k], { chave: k }));
      classes[k] = d;
    });
    Object.keys(obj(b.elementos)).slice(0, 20).forEach(function (k) {
      if (EL() && EL().ehHomebrew(k)) elementos[k] = EL().normalizar(Object.assign({}, b.elementos[k], { chave: k }));
    });
    Object.keys(obj(b.origens)).slice(0, 8).forEach(function (k) {
      if (PADRAO_ORIGEM.test(k)) origens[k] = normalizarOrigem(Object.assign({}, b.origens[k], { chave: k }));
    });
    Object.keys(obj(b.trilhas)).slice(0, 8).forEach(function (k) {
      if (PADRAO_TRILHA.test(k)) trilhas[k] = normalizarTrilha(Object.assign({}, b.trilhas[k], { chave: k }));
    });
    if (![classes, elementos, origens, trilhas].some(function (m) { return Object.keys(m).length; })) return null;
    return { versao: 1, classes: classes, elementos: elementos, origens: origens, trilhas: trilhas };
  }
  /* Registra no catálogo (idempotente; chaves versionadas não colidem). */
  function registrar(bloco) {
    var b = obj(bloco);
    Object.keys(obj(b.classes)).forEach(function (k) { if (C() && C().registrarClasseHomebrew) C().registrarClasseHomebrew(b.classes[k]); });
    if (EL()) EL().registrarMapa(b.elementos);
    Object.keys(obj(b.origens)).forEach(function (k) { if (C() && C().registrarOrigemHomebrew) C().registrarOrigemHomebrew(b.origens[k]); });
    Object.keys(obj(b.trilhas)).forEach(function (k) { if (C() && C().registrarTrilhaHomebrew) C().registrarTrilhaHomebrew(b.trilhas[k]); });
  }

  /* Da biblioteca (registro com modelo) para a definição da ficha. */
  function deRegistro(reg) {
    var m = obj(obj(reg).modelo);
    if (m.sistema !== "ordem" || m.grupo !== "estrutural") return null;
    var def = Object.assign({}, obj(m.def), { nome: reg.nome, resumo: reg.descricao || obj(m.def).resumo, homebrewId: reg.id });
    if (m.subtipo === "classe") return { tipo: "classe", def: normalizarClasse(def) };
    if (m.subtipo === "elemento") return { tipo: "elemento", def: EL() ? EL().normalizar(Object.assign(def, { chave: obj(m.def).chave || "" })) : null };
    if (m.subtipo === "origem") return { tipo: "origem", def: normalizarOrigem(Object.assign(def, { chave: "", descricao: reg.descricao || "", resumo: obj(m.def).resumo || "" })) };
    if (m.subtipo === "trilha") return { tipo: "trilha", def: normalizarTrilha(Object.assign(def, { chave: "" })) };
    return null;
  }
  /* Põe uma definição na ficha (cópia) e registra. */
  var MAPA_DO_TIPO = { classe: "classes", elemento: "elementos", origem: "origens", trilha: "trilhas" };
  function guardarNaFicha(ordem, tipo, def) {
    if (!ordem.homebrew || typeof ordem.homebrew !== "object") ordem.homebrew = { versao: 1, classes: {}, elementos: {} };
    var campo = MAPA_DO_TIPO[tipo] || "elementos";
    if (!ordem.homebrew[campo] || typeof ordem.homebrew[campo] !== "object") ordem.homebrew[campo] = {};
    ordem.homebrew[campo][def.chave] = JSON.parse(JSON.stringify(def));
    registrar(ordem.homebrew);
    return def.chave;
  }
  /* A chave Homebrew que a ficha passou a usar (escolhida numa lista que
     veio da biblioteca) ganha a sua cópia na ficha. Sem a definição no
     catálogo, nada muda (e a chave continua identificada). */
  function tipoDaChave(k) {
    k = String(k || "");
    if (PADRAO_CHAVE.test(k)) return "classe";
    if (PADRAO_ORIGEM.test(k)) return "origem";
    if (PADRAO_TRILHA.test(k)) return "trilha";
    if (EL() && EL().ehHomebrew(k)) return "elemento";
    return "";
  }
  function embutir(ordem, chave) {
    var tipo = tipoDaChave(chave);
    if (!ordem || !tipo) return false;
    var campo = MAPA_DO_TIPO[tipo];
    if (ordem.homebrew && ordem.homebrew[campo] && ordem.homebrew[campo][chave]) return true;
    var def = tipo === "classe" ? C() && C().classe(chave) : tipo === "origem" ? C() && C().origem(chave) : tipo === "trilha" ? C() && C().trilha(chave) : EL() && EL().def(chave);
    if (!def || !def.homebrew) return false;
    guardarNaFicha(ordem, tipo, def);
    return true;
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
    if (d.circuloPorNex) linhas.push("Conjura rituais (como o Ocultista): 3 de 1º círculo no 1º marco e um a cada marco; " + d.circuloPorNex.map(function (f) { return f.circulo + "º círculo em NEX " + f.nex + "%"; }).join(", ") + ".");
    return linhas;
  }
  /* A prévia de uma origem e de uma trilha (revisão do editor, consulta). */
  function previaOrigem(d) {
    var nomes = function (l) { return l.map(function (k) { return ((C() && C().pericia(k)) || { nome: k }).nome; }).join(" e "); };
    var linhas = [];
    linhas.push("Perícias: " + (d.pericias.length ? nomes(d.pericias) : "nenhuma fixa") + (d.periciasAEscolher ? " + " + d.periciasAEscolher + " à escolha" + (d.periciasOpcoes ? " entre " + nomes(d.periciasOpcoes) : "") : "") + ".");
    linhas.push("Poder: " + d.poder + (d.resumo ? " — " + d.resumo : ""));
    linhas.push(d.efeitos.length ? "Na conta da ficha: " + d.efeitos.map(textoEfeito).join(", ") + "." : (d.escolhaHb ? "Sem efeito fixo." : "Informativo: a ficha mostra o poder; o efeito é aplicado pela mesa."));
    if (d.escolhaHb) linhas.push("Escolha (na Progressão): " + textoEscolha(d.escolhaHb) + ".");
    return linhas;
  }
  function previaTrilha(d) {
    var linhas = ["Para: " + ((C() && C().classe(d.classe)) || { nome: d.classe }).nome + " (e as classes Homebrew que usam as trilhas dela)."];
    if (d.requisitos.length) linhas.push("Requisito: treinado em " + ((C() && C().pericia(d.requisitos[0].pericia)) || {}).nome + ".");
    d.poderes.forEach(function (p) { linhas.push("NEX " + p.nex + "%: " + p.nome + (p.efeitos.length ? " (" + p.efeitos.map(textoEfeito).join(", ") + ")" : "") + (p.escolha ? " · " + textoEscolha(p.escolha) : "")); });
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
    /* v9.24: a tabela de círculos vem junto (partir do Ocultista dá uma
       classe que conjura; a mesa pode desmarcar). */
    delete d.chave; delete d.pagina;
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
    var VAZIA = { classes: [], elementos: [], origens: [], trilhas: [] };
    if (!API || !API.listarHomebrew) return Promise.resolve(VAZIA);
    carga = API.listarHomebrew({ escopo: "todos", tipos: ["classe", "elemento", "origem", "trilha"] }).then(function (r) {
      carga = null;
      var saida = { classes: [], elementos: [], origens: [], trilhas: [] };
      ((r && r.ok && r.dados) || []).forEach(function (reg) {
        var x = deRegistro(reg);
        if (!x || !x.def) return;
        if (x.tipo === "elemento") { if (EL()) EL().registrar(x.def); saida.elementos.push(x.def); }
        if (x.tipo === "classe") saida.classes.push(Object.assign({ meu: reg.meu !== false }, x.def));
        /* Origens e trilhas entram no catálogo (chave versionada: nunca
           colidem) — as listas da criação, da troca de origem e da vaga de
           Trilha as mostram; escolher uma grava a cópia na ficha. */
        if (x.tipo === "origem") { if (C() && C().registrarOrigemHomebrew) C().registrarOrigemHomebrew(x.def); saida.origens.push(x.def); }
        if (x.tipo === "trilha") { if (C() && C().registrarTrilhaHomebrew) C().registrarTrilhaHomebrew(x.def); saida.trilhas.push(x.def); }
      });
      biblioteca = saida;
      return saida;
    }, function () { carga = null; return VAZIA; });
    return carga;
  }

  /* v9.15: as cópias da ficha e as versões novas da biblioteca (classe,
     origem, trilha; o elemento tem chave estável e não versiona). */
  var CAMPOS_VERSAO = [["classes", "classes", "classe"], ["origens", "origens", "origem"], ["trilhas", "trilhas", "trilha"]];
  function trocarChave(bloco, antiga, nova) {
    var novo = JSON.parse(JSON.stringify(bloco).split(antiga).join(nova));
    Object.keys(bloco).forEach(function (k) { delete bloco[k]; });
    Object.keys(novo).forEach(function (k) { bloco[k] = novo[k]; });
  }
  function copiasDaFicha(ordem) {
    var hb = obj(obj(ordem).homebrew), out = [];
    CAMPOS_VERSAO.forEach(function (c) { Object.keys(obj(hb[c[0]])).forEach(function (k) { var d = hb[c[0]][k]; out.push({ campo: c[0], tipo: c[2], chave: k, nome: d.nome || k, homebrewId: d.homebrewId || "" }); }); });
    return out;
  }
  function versoesNovas(ordem, bib) {
    var b = obj(bib);
    return copiasDaFicha(ordem).map(function (cp) {
      var lista = (CAMPOS_VERSAO.filter(function (c) { return c[0] === cp.campo; })[0] || [])[1];
      var nova = (b[lista] || []).filter(function (d) { return cp.homebrewId && d.homebrewId === cp.homebrewId && d.chave !== cp.chave; })[0];
      return nova ? Object.assign({}, cp, { def: nova }) : null;
    }).filter(Boolean);
  }
  function atualizarVersao(ordem, item) {
    var def = JSON.parse(JSON.stringify(item.def)); delete def.meu;
    trocarChave(ordem, item.chave, def.chave);
    guardarNaFicha(ordem, item.tipo, def);
    return true;
  }

  global.RAMAOrdemHomebrew = {
    copiasDaFicha: copiasDaFicha, versoesNovas: versoesNovas, atualizarVersao: atualizarVersao,
    carregarBiblioteca: carregarBiblioteca,
    NEX: NEX, ESCOLHAS: ESCOLHAS, ESCOLHAS_PATENTE: ESCOLHAS_PATENTE, OFICIAIS: OFICIAIS,
    normalizarClasse: normalizarClasse, chaveDaClasse: chaveDaClasse, disponivelNoTrilho: disponivelNoTrilho, faltas: faltas,
    normalizarBloco: normalizarBloco, registrar: registrar, deRegistro: deRegistro, guardarNaFicha: guardarNaFicha,
    previa: previa, modeloDeOficial: modeloDeOficial, circulosPorNex: circulosPorNex, CIRCULOS_DO_OCULTISTA: CIRCULOS_DO_OCULTISTA,
    NEX_TRILHA: NEX_TRILHA, EFEITOS: EFEITOS, MODOS_ESCOLHA: MODOS_ESCOLHA, escolhaDoPoder: escolhaDoPoder, textoEscolha: textoEscolha, normalizarOrigem: normalizarOrigem, normalizarTrilha: normalizarTrilha,
    textoEfeito: textoEfeito, previaOrigem: previaOrigem, previaTrilha: previaTrilha, embutir: embutir, tipoDaChave: tipoDaChave,
  };
})(typeof window !== "undefined" ? window : globalThis);
