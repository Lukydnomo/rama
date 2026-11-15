/* =====================================================================
   R.A.M.A. — Vampiro: A Máscara · Homebrew na ficha (v9.20)
   ---------------------------------------------------------------------
   O lado da página de CLÃ, PREDADOR, DISCIPLINA e VANTAGEM/DEFEITO
   Homebrew. Definições e registro: catalogo.js e disciplinas-dados.js;
   a cópia na ficha: regras.js (o servidor roda os três). Aqui:
   carregarBiblioteca, deRegistro, prévias e versões.
   ===================================================================== */

(function (global) {
  "use strict";

  function C() { return global.RAMAVampiroCatalogo; }
  function DS() { return global.RAMAVampiroDisciplinas; }
  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  var TIPOS = ["cla", "predador", "disciplina", "vantagem", "conhecimento"];
  var CAMPO = { cla: "clas", predador: "predadores", disciplina: "disciplinas", vantagem: "vantagens", conhecimento: "fichas" };
  var USOS = { historia: "1× por história", sessao: "1× por sessão", cronica: "1× por crônica" };
  function nomeDisc(k) { return (DS() && DS().DISCIPLINAS[k] || { nome: k }).nome; }
  function nomeHab(k) { var h = C() && C().habilidade(k); return h ? h.nome : k; }
  function nomeAtr(k) { var a = C() && C().atributo(k); return a ? a.nome : k; }
  var DURACOES = { passiva: "passiva", turno: "um turno", cena: "uma cena", noite: "uma noite", indefinida: "indefinida" };

  function previa(tipo, d) {
    if (tipo === "cla") return ["Disciplinas: " + (d.disciplinas.map(nomeDisc).join(", ") || "nenhuma") + (d.disciplinas.length < 3 ? " (no livro, três)" : "") + ".",
      "Perdição: " + (d.perdicao.texto.replace(/\.$/, "") || "(sem texto)") + " (a mesa aplica a Gravidade).",
      "Compulsão: " + d.compulsao.nome + " — −" + d.compulsao.penalidade + " dados em todas as paradas" + (d.compulsao.termina ? " até: " + d.compulsao.termina.replace(/\.$/, "") : "") + "."];
    if (tipo === "predador") {
      var l = ["Especialização (uma): " + (d.especializacoes.map(function (e) { return nomeHab(e.habilidade) + " (" + e.nome + ")"; }).join(" ou ") || "nenhuma") + ".",
        "Disciplina (+1 ponto, uma): " + (d.disciplinas.map(nomeDisc).join(" ou ") || "nenhuma") + "."];
      if (d.humanidade) l.push("Humanidade " + (d.humanidade > 0 ? "+" : "") + d.humanidade + ".");
      d.vantagens.concat(d.defeitos).forEach(function (v) { var x = C().VANTAGENS[v.chave]; l.push((x.tipo === "defeito" ? "Defeito: " : "Vantagem: ") + x.nome + " " + v.pontos + (v.nota ? " (" + v.nota + ")" : "") + "."); });
      if (d.parada.length) l.push("Caça: " + d.parada.map(function (p) { return nomeAtr(p[0]) + " + " + nomeHab(p[1]); }).join(" ou ") + ".");
      return l;
    }
    if (tipo === "disciplina") return [(d.tipo === "fisica" ? "Física" : "Mental") + (d.ressonancia ? " · ressonância " + d.ressonancia : "") + "."].concat(d.poderesHb.map(function (p) {
      return "Nível " + p.nivel + " · " + p.nome + " (" + (p.checagens ? p.checagens + " Checagem(ns)" : "grátis") + (p.atributo ? ", " + nomeAtr(p.atributo) + " + Disciplina" : "") + ", " + DURACOES[p.duracao] + ")" + (p.efeito ? ": " + p.efeito : "");
    }));
    if (tipo === "conhecimento") return [(d.cla ? "Exclusiva do clã " + ((C().CLAS[d.cla] || {}).nome || d.cla) + ". " : "") + "Cada nível se compra à parte (Antecedente, 3 XP por ponto)."].concat(d.niveis.map(function (n) {
      return "Nível " + n.nivel + " · " + n.nome + (n.uso ? " (" + USOS[n.uso] + ")" : "") + (n.texto ? ": " + n.texto.replace(/\.$/, "") + "." : "");
    }));
    return [(d.tipo === "defeito" ? "Defeito" : "Vantagem") + " de " + d.niveis.join(", ") + " ponto(s)" + (d.efeito ? "; " + (d.efeito.social > 0 ? "+" : "") + d.efeito.social + " dados em paradas Sociais" : "") + ".", d.texto || "(sem texto)"];
  }

  function deRegistro(reg) {
    var m = obj(obj(reg).modelo);
    if (m.sistema !== "vampiro" || m.grupo !== "estrutural" || TIPOS.indexOf(m.subtipo) < 0 || !C() || !C().normalizarHomebrew) return null;
    var base = Object.assign({}, obj(m.def), { chave: "", nome: reg.nome, homebrewId: reg.id });
    if (m.subtipo === "disciplina") return { tipo: "disciplina", def: DS().normalizarDisciplinaHomebrew(base) };
    if ((m.subtipo === "cla" || m.subtipo === "predador" || m.subtipo === "conhecimento") && !base.descricao) base.descricao = reg.descricao || "";
    if (m.subtipo === "vantagem" && !base.texto) base.texto = reg.descricao || "";
    return { tipo: m.subtipo, def: C().normalizarHomebrew(m.subtipo, base) };
  }
  function registrar(x) {
    if (x.tipo === "disciplina") DS().registrarDisciplinaHomebrew(x.def); else C().registrarHomebrew(x.tipo, x.def);
  }

  var biblioteca = null, carga = null;
  function vazia() { return { clas: [], predadores: [], disciplinas: [], vantagens: [], fichas: [] }; }
  function carregarBiblioteca(forcar) {
    if (biblioteca && !forcar) return Promise.resolve(biblioteca);
    if (carga && !forcar) return carga;
    var API = global.RAMAApi;
    if (!API || !API.listarHomebrew || !C() || !DS()) return Promise.resolve(vazia());
    carga = API.listarHomebrew({ escopo: "todos", tipos: TIPOS }).then(function (r) {
      carga = null;
      var saida = vazia();
      var xs = ((r && r.ok && r.dados) || []).map(deRegistro).filter(function (x) { return x && x.def; });
      /* As Disciplinas primeiro: um clã ou predador pode usar uma. */
      xs.sort(function (a, b) { return (a.tipo === "disciplina" ? 0 : 1) - (b.tipo === "disciplina" ? 0 : 1); }).forEach(function (x) { registrar(x); saida[CAMPO[x.tipo]].push(x.def); });
      biblioteca = saida;
      return saida;
    }, function () { carga = null; return vazia(); });
    return carga;
  }

  function copiasDaFicha(o) {
    var hb = obj(obj(o).homebrew), out = [];
    TIPOS.forEach(function (t) { Object.keys(obj(hb[CAMPO[t]])).forEach(function (k) { var d = hb[CAMPO[t]][k]; out.push({ campo: CAMPO[t], tipo: t, chave: k, nome: d.nome || k, homebrewId: d.homebrewId || "" }); }); });
    return out;
  }
  function versoesNovas(o, bib) {
    return copiasDaFicha(o).map(function (cp) {
      var nova = (obj(bib)[cp.campo] || []).filter(function (d) { return cp.homebrewId && d.homebrewId === cp.homebrewId && d.chave !== cp.chave; })[0];
      return nova ? Object.assign({}, cp, { def: nova }) : null;
    }).filter(Boolean);
  }
  function atualizarVersao(o, item) {
    var def = JSON.parse(JSON.stringify(item.def));
    var novo = JSON.parse(JSON.stringify(o).split(item.chave).join(def.chave));
    Object.keys(o).forEach(function (k) { delete o[k]; });
    Object.keys(novo).forEach(function (k) { o[k] = novo[k]; });
    o.homebrew = o.homebrew || { versao: 1 };
    o.homebrew[item.campo] = o.homebrew[item.campo] || {};
    o.homebrew[item.campo][def.chave] = def;
    registrar({ tipo: item.tipo, def: def });
    return true;
  }

  global.RAMAVampiroHomebrew = { TIPOS: TIPOS, DURACOES: DURACOES, USOS: USOS, previa: previa, deRegistro: deRegistro, carregarBiblioteca: carregarBiblioteca,
    copiasDaFicha: copiasDaFicha, versoesNovas: versoesNovas, atualizarVersao: atualizarVersao };
})(typeof window !== "undefined" ? window : globalThis);
