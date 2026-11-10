/* =====================================================================
   R.A.M.A. — BRUTAL · a ficha persistente (v7.0)
   ---------------------------------------------------------------------
   O bloco `ficha.brutal`: quem a Sobrevivente É — Arquétipo (e, com ele,
   Estilos, Habilidade e Iniciativa), pronomes, intérprete, Apegos e
   detalhes. Nada de jogo mora aqui: pilhas, PT, Feridas, turnos e
   efeitos são do THRILLER (js/brutal/mesa.js), guardados na campanha
   (CAMPANHA_BRUTAL). Assim a mesma ficha em outra campanha começa um
   Thriller limpo — e nada de uma mesa vaza para a outra.

   Duas exceções, de propósito:
     apegos.desejo.revelado  revelar o Desejo Obscuro é para sempre
                             (p. 7): vale em qualquer Thriller
     treino                  um Thriller de uma pessoa só, guardado na
                             ficha, para jogar sem campanha (testes,
                             Vantagens, Apegos). Não vale numa campanha.

   Copiado para backend/Brutal.gs (testes/gerar-brutal-gs.js).
   ===================================================================== */

(function (global) {
  "use strict";

  function K() { return global.RAMABrutalCatalogo; }

  var VERSAO = 1;
  function texto(v, max) { return String(v === undefined || v === null ? "" : v).slice(0, max || 400); }
  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  function copiar(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }

  function fichaVazia() {
    return {
      versao: VERSAO,
      arquetipo: "",
      pronomes: "",
      interprete: "",
      apegos: {
        item: { nome: "", texto: "" },
        relacao: { nome: "", texto: "" },
        desejo: { texto: "", revelado: false, reveladoEm: "" },
      },
      detalhes: { aparencia: "", historia: "", notas: "" },
      treino: null,
      operacoes: [],
    };
  }

  function normalizar(bruto) {
    var b = obj(bruto);
    var v = fichaVazia();
    v.arquetipo = K().ARQUETIPOS[b.arquetipo] ? b.arquetipo : "";
    v.pronomes = texto(b.pronomes, 40);
    v.interprete = texto(b.interprete, 80);
    var a = obj(b.apegos);
    ["item", "relacao"].forEach(function (k) {
      var x = obj(a[k]);
      v.apegos[k] = { nome: texto(x.nome, 80), texto: texto(x.texto, 600) };
    });
    var d = obj(a.desejo);
    v.apegos.desejo = { texto: texto(d.texto, 600), revelado: d.revelado === true, reveladoEm: texto(d.reveladoEm, 40) };
    var det = obj(b.detalhes);
    v.detalhes = { aparencia: texto(det.aparencia, 1200), historia: texto(det.historia, 4000), notas: texto(det.notas, 4000) };
    v.treino = b.treino && typeof b.treino === "object" && global.RAMABrutalMesa ? global.RAMABrutalMesa.normalizar(b.treino) : (b.treino && typeof b.treino === "object" ? copiar(b.treino) : null);
    v.operacoes = (Array.isArray(b.operacoes) ? b.operacoes : []).map(function (x) { return texto(x, 80); }).filter(Boolean).slice(-60);
    return v;
  }

  function arquetipo(b) { return b && K().ARQUETIPOS[b.arquetipo] ? K().ARQUETIPOS[b.arquetipo] : null; }
  function estilos(b) { var a = arquetipo(b); return a ? a.estilos.slice() : []; }
  function nomeDoArquetipo(chave) { var a = K().ARQUETIPOS[chave]; return a ? a.nome : ""; }

  /* O que a mesa lê sem abrir a ficha (calculado aqui, no navegador e
     no servidor). O estado de jogo vem do Thriller, não daqui. */
  function resumoParaMesa(b) {
    var n = normalizar(b);
    var a = arquetipo(n);
    return {
      arquetipo: n.arquetipo,
      arquetipoNome: a ? a.nome : "",
      estilos: a ? a.estilos.slice() : [],
      iniciativa: a ? a.iniciativa : 0,
      pronomes: n.pronomes,
      interprete: n.interprete,
      desejoRevelado: n.apegos.desejo.revelado,
      temItem: !!n.apegos.item.nome,
      temRelacao: !!n.apegos.relacao.nome,
      temDesejo: !!n.apegos.desejo.texto,
    };
  }

  /* O que falta para a ficha estar pronta para um Thriller. */
  function pendencias(b) {
    var p = [];
    if (!b || !arquetipo(b)) p.push("Escolha o Arquétipo.");
    return p;
  }

  /* Uma alteração com id: repetir o mesmo id não aplica de novo. */
  function aplicarOperacao(b, opId, fn) {
    if (opId && b.operacoes.indexOf(opId) >= 0) return { ok: true, repetida: true, eventos: [] };
    var copia = copiar(b);
    var r = fn(copia) || { ok: true };
    if (r.ok === false) return r;
    Object.keys(copia).forEach(function (k) { b[k] = copia[k]; });
    if (opId) { b.operacoes.push(opId); b.operacoes = b.operacoes.slice(-60); }
    return r;
  }

  global.RAMABrutal = {
    VERSAO: VERSAO,
    fichaVazia: fichaVazia,
    normalizar: normalizar,
    arquetipo: arquetipo,
    estilos: estilos,
    nomeDoArquetipo: nomeDoArquetipo,
    resumoParaMesa: resumoParaMesa,
    pendencias: pendencias,
    aplicarOperacao: aplicarOperacao,
    copiar: copiar,
  };
})(typeof window !== "undefined" ? window : globalThis);
