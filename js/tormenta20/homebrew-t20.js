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
  function D() { return global.RAMATormenta20Dados; }
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
  ];
  var SENTIDOS = { visaoNoEscuro: "Visão no escuro", visaoNaPenumbra: "Visão na penumbra", faro: "Faro" };
  var PROFS = { marciais: "Armas marciais", escudos: "Escudos", pesadas: "Armaduras pesadas", exoticas: "Armas exóticas", fogo: "Armas de fogo" };
  var NOMES_ATR = { "for": "Força", des: "Destreza", con: "Constituição", "int": "Inteligência", sab: "Sabedoria", car: "Carisma" };

  function chaveDoEfeito(e) {
    if (e.t === "bonus") return e.alvo === "defesa" ? "defesa" : "pericia";
    return ({ treino: "treino", pvNivel: "pv", pmNivel: "pm", sentido: "sentido", rd: "rd", prof: "prof" })[e.t] || "";
  }
  function nomePericia(k) { var p = D() && D().PERICIAS.filter(function (x) { return x.chave === k; })[0]; return p ? p.nome : k; }
  function nomeDano(k) { var x = D() && D().TIPOS_DANO.filter(function (y) { return y[0] === k; })[0]; return x ? x[1].toLowerCase() : k; }
  function sinal(v) { return v > 0 ? "+" + v : String(v); }
  function textoEfeito(e) {
    if (e.t === "bonus") return sinal(e.valor) + " em " + (e.alvo === "defesa" ? "Defesa" : nomePericia(String(e.alvo).slice(8)));
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
    var linhas = ["Atributos: " + textoAtributos(d.atributos) + ".", RA().textoCorpo(d.tamanho, d.deslocamento)];
    d.habilidades.filter(function (h) { return h.id !== "corpo"; }).forEach(function (h) {
      var partes = h.efeitos.map(textoEfeito).concat((h.escolhas || []).map(textoEscolha));
      linhas.push(h.nome + (partes.length ? ": " + partes.join("; ") : " (informativa)") + ".");
    });
    return linhas;
  }
  /* O que é automático e o que fica para quem joga / a mesa. */
  function automacao(d) {
    var auto = ["Atributos, tamanho e deslocamento entram na conta da ficha."], escolha = [], mesa = [];
    d.habilidades.filter(function (h) { return h.id !== "corpo"; }).forEach(function (h) {
      if (h.efeitos.length) auto.push(h.nome + ": " + h.efeitos.map(textoEfeito).join(", ") + ".");
      (h.escolhas || []).forEach(function (e) { escolha.push(h.nome + ": " + textoEscolha(e) + " (escolhida na criação)."); });
      if (!h.efeitos.length && !(h.escolhas || []).length) mesa.push(h.nome + ": a ficha mostra o texto; a mesa aplica.");
    });
    if (d.atributos.escolha) escolha.unshift("Os " + d.atributos.escolha.quantidade + " atributos à escolha (na criação).");
    return { automatico: auto, escolha: escolha, mesa: mesa.concat(["O que o texto descreve além dos efeitos é aplicado pela mesa."]) };
  }

  /* Da biblioteca para a definição do motor. */
  function deRegistro(reg) {
    var m = obj(obj(reg).modelo);
    if (m.sistema !== "tormenta20" || m.grupo !== "estrutural" || m.subtipo !== "raca" || !RA()) return null;
    return { tipo: "raca", def: RA().normalizarRacaHomebrew(Object.assign({}, obj(m.def), { id: "", nome: reg.nome, descricao: reg.descricao || "", homebrewId: reg.id })) };
  }

  /* As raças da conta (as suas e as públicas) entram no catálogo — uma
     viagem só, quando a criação precisa. Escolher uma grava a cópia. */
  var biblioteca = null, carga = null;
  function carregarBiblioteca(forcar) {
    if (biblioteca && !forcar) return Promise.resolve(biblioteca);
    if (carga && !forcar) return carga;
    var API = global.RAMAApi;
    if (!API || !API.listarHomebrew || !RA()) return Promise.resolve({ racas: [] });
    carga = API.listarHomebrew({ escopo: "todos", tipos: ["raca"] }).then(function (r) {
      carga = null;
      var saida = { racas: [] };
      ((r && r.ok && r.dados) || []).forEach(function (reg) {
        var x = deRegistro(reg);
        if (!x || !x.def) return;
        RA().registrarRacaHomebrew(x.def);
        saida.racas.push(Object.assign({ meu: reg.meu !== false }, x.def));
      });
      biblioteca = saida;
      return saida;
    }, function () { carga = null; return { racas: [] }; });
    return carga;
  }

  global.RAMATormenta20Homebrew = {
    EFEITOS: EFEITOS, SENTIDOS: SENTIDOS, PROFS: PROFS, NOMES_ATR: NOMES_ATR,
    chaveDoEfeito: chaveDoEfeito, textoEfeito: textoEfeito, textoEscolha: textoEscolha, textoAtributos: textoAtributos,
    previaRaca: previaRaca, automacao: automacao, deRegistro: deRegistro, carregarBiblioteca: carregarBiblioteca,
  };
})(typeof window !== "undefined" ? window : globalThis);
