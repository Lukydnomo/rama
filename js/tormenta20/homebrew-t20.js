/* =====================================================================
   R.A.M.A. — Tormenta20 · Homebrew na ficha (v9.10)
   ---------------------------------------------------------------------
   O lado da página da RAÇA Homebrew de Tormenta20. A definição, a chave
   versionada e o registro no catálogo moram no motor
   (js/tormenta20/racas.js: normalizarRacaHomebrew, registrarRacaHomebrew)
   — que o servidor também roda. Aqui ficam:

     carregarBiblioteca  as raças da conta (suas e públicas) entram no
                         catálogo: a criação de personagem as lista; ao
                         escolher, a normalização grava a CÓPIA na ficha
     deRegistro          do registro da biblioteca para a definição
     EFEITOS, textos     o que o editor oferece e como a prévia escreve

   Sem DOM: testes/executar-homebrew-t20.js.
   ===================================================================== */

(function (global) {
  "use strict";

  function RA() { return global.RAMATormenta20Racas; }
  function OR() { return global.RAMATormenta20Origens; }
  function DE() { return global.RAMATormenta20Deuses; }
  function PO() { return global.RAMATormenta20Poderes; }
  function EQ() { return global.RAMATormenta20Equipamento; }
  function CL() { return global.RAMATormenta20Classes; }
  function D() { return global.RAMATormenta20Dados; }
  function MG() { return global.RAMATormenta20Magias; }
  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }

  /* O que o editor oferece em cada habilidade (no formato do motor). */
  var EFEITOS = [
    { chave: "defesa", rotulo: "Bônus na Defesa", exemplo: "+1 na Defesa (Couro Rígido)", modelo: { t: "bonus", alvo: "defesa", valor: 1 } },
    { chave: "pericia", rotulo: "Bônus em perícia", exemplo: "+2 em Percepção", modelo: { t: "bonus", alvo: "pericia.percepcao", valor: 2 } },
    { chave: "treino", rotulo: "Perícia treinada", exemplo: "treinado em Sobrevivência", modelo: { t: "treino", pericia: "sobrevivencia" } },
    { chave: "pv", rotulo: "PV extra", exemplo: "+3 PV no 1º nível e +1 por nível seguinte (Duro como Pedra)", modelo: { t: "pvNivel", inicial: 3, valor: 1 } },
    { chave: "pm", rotulo: "PM por nível", exemplo: "+1 PM por nível (Sangue Mágico)", modelo: { t: "pmNivel", valor: 1 } },
    { chave: "sentido", rotulo: "Sentido", exemplo: "visão no escuro", modelo: { t: "sentido", valor: "visaoNoEscuro" } },
    { chave: "rd", rotulo: "Redução de dano", exemplo: "redução de fogo 5", modelo: { t: "rd", valor: 5, tipos: ["fogo"] } },
    { chave: "prof", rotulo: "Proficiência", exemplo: "armas marciais", modelo: { t: "prof", qual: "marciais" } },
    /* v9.13: só na habilidade ativada (efeito que dura a cena/rodada). */
    { chave: "ataque", rotulo: "Bônus em ataque", exemplo: "+2 nos ataques", modelo: { t: "bonus", alvo: "ataque", valor: 2 }, soAtivada: true },
    { chave: "dano", rotulo: "Bônus em dano", exemplo: "+2 no dano", modelo: { t: "bonus", alvo: "dano", valor: 2 }, soAtivada: true },
  ];
  /* O que cada lugar aceita: passivo (sempre ligado) ou ativado (gasta PM). */
  var NA_ATIVADA = ["defesa", "pericia", "sentido", "rd", "ataque", "dano"];
  function efeitosPara(ativada) { return EFEITOS.filter(function (e) { return ativada ? NA_ATIVADA.indexOf(e.chave) >= 0 : !e.soAtivada; }); }
  var EXECUCOES = { livre: "ação livre", movimento: "ação de movimento", padrao: "ação padrão", completa: "ação completa", reacao: "reação" };
  var DURACOES = { cena: "até o fim da cena", rodada: "por 1 rodada", instantanea: "instantânea" };
  function textoAcao(a) {
    return a.custo + " PM, " + EXECUCOES[a.execucao] + ", " + DURACOES[a.duracao] + (a.limite === "cena" ? ", uma vez por cena" : "") + (a.efeitos.length ? ": " + a.efeitos.map(textoEfeito).join(", ") : "");
  }
  var SENTIDOS = { visaoNoEscuro: "Visão no escuro", visaoNaPenumbra: "Visão na penumbra", faro: "Faro" };
  var PROFS = { marciais: "Armas marciais", escudos: "Escudos", pesadas: "Armaduras pesadas", exoticas: "Armas exóticas", fogo: "Armas de fogo" };
  var NOMES_ATR = { "for": "Força", des: "Destreza", con: "Constituição", "int": "Inteligência", sab: "Sabedoria", car: "Carisma" };

  function chaveDoEfeito(e) {
    if (e.t === "bonus") return e.alvo === "defesa" ? "defesa" : e.alvo === "ataque" ? "ataque" : e.alvo === "dano" ? "dano" : "pericia";
    return ({ treino: "treino", pvNivel: "pv", pmNivel: "pm", sentido: "sentido", rd: "rd", prof: "prof" })[e.t] || "";
  }
  function nomePericia(k) { var p = D() && D().PERICIAS.filter(function (x) { return x.chave === k; })[0]; return p ? p.nome : k; }
  function nomeDano(k) { var x = D() && D().TIPOS_DANO.filter(function (y) { return y[0] === k; })[0]; return x ? x[1].toLowerCase() : k; }
  function sinal(v) { return v > 0 ? "+" + v : String(v); }
  function textoEfeito(e) {
    if (e.t === "bonus") return sinal(e.valor) + " em " + (e.alvo === "defesa" ? "Defesa" : e.alvo === "ataque" ? "ataques" : e.alvo === "dano" ? "dano" : nomePericia(String(e.alvo).slice(8)));
    if (e.t === "treino") return "treinado em " + nomePericia(e.pericia);
    if (e.t === "pvNivel") return [e.inicial ? sinal(e.inicial) + " PV no 1º nível" : "", e.valor ? sinal(e.valor) + " PV por nível seguinte" : ""].filter(Boolean).join(" e ");
    if (e.t === "pmNivel") return sinal(e.valor) + " PM por nível";
    if (e.t === "sentido") return (SENTIDOS[e.valor] || e.valor).toLowerCase();
    if (e.t === "rd") return "redução de " + nomeDano((e.tipos || [])[0]) + " " + e.valor;
    if (e.t === "prof") return "proficiência: " + (PROFS[e.qual] || e.qual).toLowerCase();
    if (e.t === "tamanho") return "tamanho " + (((D() && D().TAMANHO[e.valor]) || {}).nome || e.valor);
    if (e.t === "deslocamento") return "deslocamento " + String(e.base).replace(".", ",") + "m";
    return "";
  }
  function textoEscolha(esc) {
    if (esc.tipo === "magia") return "uma magia de " + (esc.circulo || 1) + "º círculo à escolha (" + (NOMES_ATR[esc.efeito.atributo] || "Carisma") + ")";
    var n = esc.quantidade || 1;
    return n + (n === 1 ? " perícia" : " perícias") + " à escolha, " + (esc.efeito.t === "bonus" ? "com " + sinal(esc.efeito.valor) : (n === 1 ? "treinada" : "treinadas"));
  }
  function textoAtributos(at) {
    var x = obj(at), l = [];
    Object.keys(obj(x.fixo)).forEach(function (k) { l.push(NOMES_ATR[k] + " " + sinal(x.fixo[k])); });
    if (x.escolha) l.push("+" + x.escolha.valor + " em " + x.escolha.quantidade + " à escolha" + (x.escolha.exceto && x.escolha.exceto.length ? " (exceto " + x.escolha.exceto.map(function (k) { return NOMES_ATR[k]; }).join(", ") + ")" : ""));
    return l.join(", ") || "nenhum ajuste";
  }

  /* A prévia (revisão do editor, consulta da biblioteca). */
  function previaRaca(d) {
    var linhas = d.variantes ? d.variantes.map(function (v) { return "Variante " + v.nome + ": " + textoAtributos(v.atributos) + "; " + (v.habilidades.filter(function (k) { return k !== "corpo"; }).map(function (k) { return (d.habilidades.filter(function (h) { return h.id === k; })[0] || {}).nome; }).join(", ") || "sem habilidades") + "."; }) : ["Atributos: " + textoAtributos(d.atributos) + "."];
    linhas.push(RA().textoCorpo(d.tamanho, d.deslocamento));
    d.habilidades.filter(function (h) { return h.id !== "corpo"; }).forEach(function (h) {
      var partes = h.efeitos.map(textoEfeito).concat((h.escolhas || []).map(textoEscolha)).concat(h.acao ? ["ativada: " + textoAcao(h.acao)] : []);
      linhas.push(h.nome + (partes.length ? ": " + partes.join("; ") : " (informativa)") + ".");
    });
    return linhas;
  }
  /* O que é automático e o que fica para quem joga / a mesa. */
  function automacao(d) {
    var auto = ["Atributos, tamanho e deslocamento entram na conta da ficha."], escolha = [], mesa = [];
    d.habilidades.filter(function (h) { return h.id !== "corpo"; }).forEach(function (h) {
      if (h.efeitos.length) auto.push(h.nome + ": " + h.efeitos.map(textoEfeito).join(", ") + ".");
      if (h.acao) auto.push(h.nome + ": botão Usar na ficha (" + textoAcao(h.acao) + "), que cobra os PM e cria o efeito ativo.");
      (h.escolhas || []).forEach(function (e) { escolha.push(h.nome + ": " + textoEscolha(e) + " (escolhida na criação)."); });
      if (!h.efeitos.length && !(h.escolhas || []).length && !h.acao) mesa.push(h.nome + ": a ficha mostra o texto; a mesa aplica.");
    });
    if (d.atributos.escolha && !d.variantes) escolha.unshift("Os " + d.atributos.escolha.quantidade + " atributos à escolha (na criação).");
    if (d.variantes) escolha.unshift("A variante (" + d.variantes.map(function (v) { return v.nome; }).join(" ou ") + "), na criação.");
    return { automatico: auto, escolha: escolha, mesa: mesa.concat(["O que o texto descreve além dos efeitos é aplicado pela mesa."]) };
  }

  /* v9.11: a prévia de uma origem e de uma divindade. */
  function nomePoder(k) { var p = PO() && PO().PODER[k]; return p ? p.nome : k; }
  function nomePericiaOuOficio(k) {
    if (/^oficio:/.test(k)) { var o = D() && D().OFICIOS.filter(function (x) { return "oficio:" + x.chave === k; })[0]; return "Ofício (" + (o ? o.nome : k.slice(7)) + ")"; }
    return nomePericia(k);
  }
  function previaOrigem(d) {
    var l = [];
    if (d.itens.length) l.push("Itens: " + d.itens.join("; ") + ".");
    l.push("Perícias: " + (d.pericias.map(nomePericiaOuOficio).join(", ") || "nenhuma") + ".");
    l.push("Poderes gerais: " + (d.poderes.map(nomePoder).join(", ") || "nenhum") + ".");
    l.push("Poder único: " + d.unico.nome + (d.unico.efeitos.length ? " (" + d.unico.efeitos.map(textoEfeito).join(", ") + ")" : d.unico.acao ? "" : " (informativo)") + (d.unico.acao ? " — ativado: " + textoAcao(d.unico.acao) : "") + ".");
    l.push("Quem joga escolhe 2 benefícios entre esses " + (d.pericias.length + d.poderes.length + 1) + ".");
    return l;
  }
  function nomeDevoto(k) {
    var p = String(k).split(":");
    var r = RA() && RA().RACA[p[0]], c = CL() && CL().CLASSE[p[0]];
    return (r || c || { nome: k }).nome;
  }
  function previaDeus(d) {
    var arma = d.armaPreferida && EQ() && EQ().ITEM[d.armaPreferida];
    var l = [(d.titulo ? d.titulo + " · " : "") + "Energia " + (d.energia === "qualquer" ? "à escolha (positiva ou negativa)" : d.energia) + " · arma preferida: " + (arma ? arma.nome : "nenhuma") + "."];
    l.push("Devotos: " + (d.devotos === "qualquer" ? "qualquer um" : d.devotos.map(nomeDevoto).join(", ") + " (e humanos e clérigos)") + ".");
    l.push("Poderes concedidos: " + (d.poderes.map(function (k) {
      var p = d.poderesProprios.filter(function (x) { return x.id === k; })[0];
      return p ? p.nome + (p.efeitos.length ? " (" + p.efeitos.map(textoEfeito).join(", ") + ")" : "") + (p.acao ? " (ativado: " + textoAcao(p.acao) + ")" : "") : nomePoder(k);
    }).join(", ") || "nenhum") + ".");
    if (d.obrigacoes) l.push("Obrigações e restrições: " + d.obrigacoes);
    return l;
  }

  /* v9.12: a prévia de uma classe (1º nível com Con +2, a tabela). */
  function previaClasse(d) {
    var l = ["1º nível: " + (d.pv.inicial + 2) + " PV (com Con +2) e " + d.pm + " PM; depois, +" + d.pv.nivel + " PV + Con e +" + d.pm + " PM por nível."];
    l.push("Perícias: " + (d.pericias.fixas.map(nomePericia).join(", ") || "nenhuma fixa") + (d.pericias.escolha.n ? " + " + d.pericias.escolha.n + " entre " + d.pericias.escolha.de.map(nomePericia).join(", ") : "") + ".");
    l.push("Proficiências: " + (d.proficiencias.map(function (q) { return (PROFS[q] || q).toLowerCase(); }).join(", ") || "só armas simples e armaduras leves") + ".");
    if (d.magias) l.push(d.habilidades.magias.resumo);
    d.habilidadesDaTabela.slice().sort(function (a, b) { return a.nivel - b.nivel; }).forEach(function (h) {
      var partes = h.efeitos.map(textoEfeito).concat((h.escolhas || []).map(textoEscolha)).concat(h.acao ? ["ativada: " + textoAcao(h.acao)] : []);
      l.push(h.nivel + "º nível · " + h.nome + (partes.length ? ": " + partes.join("; ") : "") + ".");
    });
    l.push("Poder de " + d.nome + " nos níveis: " + (d.niveisDePoder.join(", ") || "nenhum") + ".");
    l.push("Poderes de classe: " + (d.poderesProprios.map(function (p) { return p.nome + (p.ncMinimo > 1 ? " (" + p.ncMinimo + "º nível)" : "") + (p.efeitos.length ? " [" + p.efeitos.map(textoEfeito).join(", ") + "]" : "") + (p.acao ? " [ativado: " + textoAcao(p.acao) + "]" : ""); }).concat(["Aumento de Atributo"]).join(", ")) + "; e os poderes gerais.");
    return l;
  }

  /* v9.14: a prévia de uma magia e de um poder Homebrew. */
  var NOMES_ESCOLA = { abjuracao: "Abjuração", adivinhacao: "Adivinhação", convocacao: "Convocação", encantamento: "Encantamento", evocacao: "Evocação", ilusao: "Ilusão", necromancia: "Necromancia", transmutacao: "Transmutação" };
  function previaMagia(d) {
    var l = [({ arcana: "Arcana", divina: "Divina", universal: "Universal" })[d.tipo] + " " + d.circulo + "º círculo (" + (MG() ? MG().custoBase(d.circulo) : "") + " PM) · " + NOMES_ESCOLA[d.escola] + "."];
    l.push([EXECUCOES[d.execucao] || d.execucao, d.alcance, d.alvo, d.duracao, d.resistencia].filter(Boolean).join(" · ") + ".");
    var mec = [];
    if (d.dano) mec.push("dano " + d.dano + (d.tipoDano ? " de " + nomeDano(d.tipoDano) : "") + (d.metade ? " (a resistência reduz à metade)" : ""));
    if (d.cura) mec.push("cura " + d.cura);
    if (d.efeitos.length) mec.push("efeito ativo: " + d.efeitos.map(textoEfeito).join(", "));
    l.push(mec.length ? "No lançamento: " + mec.join("; ") + "." : "Sem mecânica automática: a ficha mostra o texto e cobra os PM.");
    if (d.aprimoramentosTexto) l.push("Aprimoramentos (a mesa aplica): " + d.aprimoramentosTexto);
    return l;
  }
  function previaPoder(d) {
    var l = [({ combate: "Poder de combate", destino: "Poder de destino", magia: "Poder de magia", tormenta: "Poder da Tormenta" })[d.grupo] + (d.nivelMinimo > 1 ? " · a partir do " + d.nivelMinimo + "º nível" : "") + (d.requisitosTexto ? " · requisitos (a mesa confere): " + d.requisitosTexto : "") + "."];
    if (d.efeitos.length) l.push("Na conta da ficha: " + d.efeitos.map(textoEfeito).join(", ") + ".");
    if (d.acao) l.push("Ativado: " + textoAcao(d.acao) + ".");
    if (!d.efeitos.length && !d.acao) l.push("Informativo: a ficha mostra o texto; a mesa aplica.");
    return l;
  }
  /* Os campos do editor de habilidade (magia) para a definição do motor. */
  function magiaDoRegistro(reg, m) {
    var v = obj(m.def);
    return MG().normalizarHomebrew({ id: "", nome: reg.nome, homebrewId: reg.id, resumo: reg.descricao || reg.texto || "", tipo: v.tipoMagia, circulo: v.circulo, escola: v.escola, execucao: ({ "padrão": "padrao", padrao: "padrao", movimento: "movimento", completa: "completa", livre: "livre", "reação": "reacao", reacao: "reacao" })[String(v.execucao || "").toLowerCase().trim()] || "padrao",
      alcance: v.alcance, alvo: v.alvo, duracao: v.duracao, resistencia: v.resistencia, aprimoramentosTexto: v.aprimoramentos, dano: v.dano, tipoDano: v.tipoDano, cura: v.cura, metade: v.metade, efeitos: v.efeitos });
  }
  function poderDoRegistro(reg, m) {
    var v = obj(m.def);
    var grupo = v.grupoT20 || ({ geral: "destino", tormenta: "tormenta" })[v.grupo];
    if (!grupo) return null; /* de classe, concedido ou de origem: pelos tipos estruturais */
    return PO().normalizarHomebrew({ id: "", nome: reg.nome, homebrewId: reg.id, resumo: reg.descricao || reg.texto || "", grupo: grupo, requisitosTexto: v.requisitos, nivelMinimo: v.nivelMinimo, efeitos: v.efeitos, acao: v.acao });
  }

  /* Da biblioteca para a definição do motor. */
  function deRegistro(reg) {
    var m = obj(obj(reg).modelo);
    if (m.sistema === "tormenta20" && m.grupo === "habilidade") {
      if (m.subtipo === "magia" && MG() && MG().normalizarHomebrew) return { tipo: "magia", def: magiaDoRegistro(reg, m) };
      if (m.subtipo === "poder" && PO() && PO().normalizarHomebrew) { var p = poderDoRegistro(reg, m); return p ? { tipo: "poder", def: p } : null; }
      return null;
    }
    if (m.sistema !== "tormenta20" || m.grupo !== "estrutural") return null;
    var base = Object.assign({}, obj(m.def), { id: "", nome: reg.nome, descricao: reg.descricao || "", homebrewId: reg.id });
    if (m.subtipo === "raca" && RA()) return { tipo: "raca", def: RA().normalizarRacaHomebrew(base) };
    if (m.subtipo === "origem" && OR() && OR().normalizarHomebrew) return { tipo: "origem", def: OR().normalizarHomebrew(base) };
    if (m.subtipo === "divindade" && DE() && DE().normalizarHomebrew) return { tipo: "divindade", def: DE().normalizarHomebrew(base) };
    if (m.subtipo === "classe" && CL() && CL().normalizarHomebrew) return { tipo: "classe", def: CL().normalizarHomebrew(base) };
    return null;
  }
  function registrarDef(x) {
    if (x.tipo === "raca") RA().registrarRacaHomebrew(x.def);
    if (x.tipo === "origem") OR().registrarHomebrew(x.def);
    if (x.tipo === "divindade") DE().registrarHomebrew(x.def);
    if (x.tipo === "classe") CL().registrarHomebrew(x.def);
    if (x.tipo === "magia") MG().registrarHomebrew(x.def);
    if (x.tipo === "poder") PO().registrarHomebrew(x.def);
  }

  /* As raças da conta (as suas e as públicas) entram no catálogo — uma
     viagem só, quando a criação precisa. Escolher uma grava a cópia. */
  var biblioteca = null, carga = null;
  function carregarBiblioteca(forcar) {
    if (biblioteca && !forcar) return Promise.resolve(biblioteca);
    if (carga && !forcar) return carga;
    var API = global.RAMAApi;
    var VAZIA = { racas: [], origens: [], divindades: [], classes: [], magias: [], poderes: [] };
    if (!API || !API.listarHomebrew || !RA()) return Promise.resolve(VAZIA);
    carga = API.listarHomebrew({ escopo: "todos", tipos: ["raca", "origem", "divindade", "classe", "habilidade"] }).then(function (r) {
      carga = null;
      var saida = { racas: [], origens: [], divindades: [], classes: [], magias: [], poderes: [] };
      var CAMPO = { raca: "racas", origem: "origens", divindade: "divindades", classe: "classes", magia: "magias", poder: "poderes" };
      ((r && r.ok && r.dados) || []).forEach(function (reg) {
        var x = deRegistro(reg);
        if (!x || !x.def) return;
        registrarDef(x);
        saida[CAMPO[x.tipo]].push(Object.assign({ meu: reg.meu !== false }, x.def));
      });
      biblioteca = saida;
      return saida;
    }, function () { carga = null; return VAZIA; });
    return carga;
  }

  /* v9.15: as cópias da ficha e as versões novas da biblioteca. */
  var CAMPOS_VERSAO = [["racas", "racas", "raca"], ["origens", "origens", "origem"], ["deuses", "divindades", "divindade"], ["classes", "classes", "classe"], ["magias", "magias", "magia"], ["poderes", "poderes", "poder"]];
  function trocarChave(bloco, antiga, nova) {
    var novo = JSON.parse(JSON.stringify(bloco).split(antiga).join(nova));
    Object.keys(bloco).forEach(function (k) { delete bloco[k]; });
    Object.keys(novo).forEach(function (k) { bloco[k] = novo[k]; });
  }
  function copiasDaFicha(t20) {
    var hb = obj(obj(t20).homebrew), out = [];
    CAMPOS_VERSAO.forEach(function (c) { Object.keys(obj(hb[c[0]])).forEach(function (k) { var d = hb[c[0]][k]; out.push({ campo: c[0], tipo: c[2], chave: k, nome: d.nome || k, homebrewId: d.homebrewId || "" }); }); });
    return out;
  }
  function versoesNovas(t20, bib) {
    var b = obj(bib);
    return copiasDaFicha(t20).map(function (cp) {
      var lista = (CAMPOS_VERSAO.filter(function (c) { return c[0] === cp.campo; })[0] || [])[1];
      var nova = (b[lista] || []).filter(function (d) { return cp.homebrewId && d.homebrewId === cp.homebrewId && d.id !== cp.chave; })[0];
      return nova ? Object.assign({}, cp, { def: nova }) : null;
    }).filter(Boolean);
  }
  function atualizarVersao(t20, item) {
    var def = JSON.parse(JSON.stringify(item.def)); delete def.meu;
    trocarChave(t20, item.chave, def.id);
    t20.homebrew = t20.homebrew || { versao: 1 };
    t20.homebrew[item.campo] = t20.homebrew[item.campo] || {};
    t20.homebrew[item.campo][def.id] = def;
    registrarDef({ tipo: item.tipo, def: def });
    return true;
  }

  global.RAMATormenta20Homebrew = {
    copiasDaFicha: copiasDaFicha, versoesNovas: versoesNovas, atualizarVersao: atualizarVersao,
    EFEITOS: EFEITOS, efeitosPara: efeitosPara, textoAcao: textoAcao, EXECUCOES: EXECUCOES, DURACOES: DURACOES, SENTIDOS: SENTIDOS, PROFS: PROFS, NOMES_ATR: NOMES_ATR,
    chaveDoEfeito: chaveDoEfeito, textoEfeito: textoEfeito, textoEscolha: textoEscolha, textoAtributos: textoAtributos,
    previaRaca: previaRaca, automacao: automacao, previaOrigem: previaOrigem, previaDeus: previaDeus, previaClasse: previaClasse, previaMagia: previaMagia, previaPoder: previaPoder, NOMES_ESCOLA: NOMES_ESCOLA, nomePoder: nomePoder, nomePericiaOuOficio: nomePericiaOuOficio, deRegistro: deRegistro, carregarBiblioteca: carregarBiblioteca,
  };
})(typeof window !== "undefined" ? window : globalThis);
