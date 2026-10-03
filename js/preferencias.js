/* =====================================================================
   R.A.M.A. — preferencias.js
   Preferências de apresentação da conta (v2.35).

   Hoje uma: `exibicaoPastas` — como a página Personagens mostra as pastas
   ("abas", o padrão, ou "icones"). O tema tem módulo próprio (tema.js),
   carregado no <head>; este segue o mesmo desenho:

   - a CONTA manda: o valor chega com a sessão (agente.preferencias) e
     fica num cache local POR CONTA (rama.pref.<id>.<chave>), que só
     antecipa a próxima abertura. Sem conta, vale o padrão; trocar de
     conta nunca herda a preferência da anterior;
   - salvar é otimista na tela e honesto na resposta: um pedido por vez,
     só o último valor escolhido vai, resposta antiga não passa por cima
     da escolha nova, falha não vira "salvo";
   - servidor anterior à v2.35 recusa a chave nova (dados_invalidos): a
     escolha continua na tela e no cache deste aparelho, e o estado diz
     "local" — a tela explica que falta atualizar o Apps Script.

   Preferência é apresentação, não navegação: pasta aberta, busca e
   filtros continuam no endereço da página, e trocar a exibição não
   mexe neles.
   ===================================================================== */

(function (global) {
  "use strict";

  var ACEITAS = {
    exibicaoPastas: { valores: ["abas", "icones"], padrao: "abas" },
  };
  var CHAVE_AGENTE = "rama.sessao.agente";
  var PREFIXO = "rama.pref.";

  function lerLocal(chave) {
    try { return global.localStorage.getItem(chave); } catch (e) { return null; }
  }
  function gravarLocal(chave, valor) {
    try { global.localStorage.setItem(chave, valor); } catch (e) { /* segue sem cache */ }
  }

  function valida(chave, v) {
    var def = ACEITAS[chave];
    if (!def) return null;
    return def.valores.indexOf(v) >= 0 ? v : def.padrao;
  }

  function contaGuardada() {
    try {
      var a = JSON.parse(lerLocal(CHAVE_AGENTE) || "null");
      return a && a.id ? String(a.id) : null;
    } catch (e) { return null; }
  }

  function cacheDe(conta, chave) {
    return conta ? valida(chave, lerLocal(PREFIXO + conta + "." + chave)) : ACEITAS[chave].padrao;
  }

  /* ---- Estado por chave ---- */
  var conta = contaGuardada();
  var estados = {};
  function novoEstado(chave) {
    var v = cacheDe(conta, chave);
    return { valor: v, confirmado: v, desejado: null, emVoo: false, estado: null };
  }
  Object.keys(ACEITAS).forEach(function (k) { estados[k] = novoEstado(k); });

  var ouvintes = [];
  function avisar(chave) {
    var e = estados[chave];
    var info = { chave: chave, valor: e.valor, estado: e.estado };
    ouvintes.slice().forEach(function (fn) {
      try { fn(info); } catch (err) { /* um ouvinte não derruba os outros */ }
    });
  }

  /* ---- Conta ---- */

  /* A sessão confirmou quem é a conta e o que ela tem salvo. Chave ausente
     (servidor antigo) deixa o cache valer. */
  function sincronizarDaConta(id, preferencias) {
    var novaConta = id ? String(id) : null;
    var trocou = novaConta !== conta;
    conta = novaConta;
    Object.keys(ACEITAS).forEach(function (chave) {
      var e = estados[chave];
      var antes = e.valor;
      if (trocou) estados[chave] = e = novoEstado(chave);
      var v = preferencias && preferencias[chave];
      if (conta && ACEITAS[chave].valores.indexOf(v) >= 0) {
        e.confirmado = v;
        gravarLocal(PREFIXO + conta + "." + chave, v);
        /* Um salvamento a caminho é mais novo que esta leitura. */
        if (!e.emVoo && e.desejado === null) e.valor = v;
      }
      if (trocou || e.valor !== antes) avisar(chave);
    });
  }

  function esquecerConta() { sincronizarDaConta(null, null); }

  /* ---- Salvar ---- */

  function enviar(chave) {
    var e = estados[chave];
    var api = global.RAMAApi;
    var alvo = e.desejado;
    var dono = conta;
    if (!api || !dono) {
      e.desejado = null;
      e.estado = "erro";
      avisar(chave);
      return;
    }
    e.emVoo = true;
    e.estado = "salvando";
    avisar(chave);
    var pedido = {};
    pedido[chave] = alvo;
    Promise.resolve()
      .then(function () { return api.salvarPerfil({ preferencias: pedido }); })
      .then(function (r) { return r || { ok: false }; }, function () { return { ok: false }; })
      .then(function (r) {
        var gravado = r.ok && r.preferencias && r.preferencias[chave] === alvo;
        /* Servidor anterior à v2.35: ele não conhece a chave e recusa. A
           escolha fica neste aparelho; nada é dito como salvo na conta. */
        var semSuporte = !r.ok && r.erro === "dados_invalidos";
        e.emVoo = false;
        if (gravado || semSuporte) gravarLocal(PREFIXO + dono + "." + chave, alvo);
        if (dono !== conta) return;              // trocou de conta no meio
        if (gravado) e.confirmado = alvo;
        if (e.desejado !== null && e.desejado !== alvo) { enviar(chave); return; }  // escolha mais nova
        e.desejado = null;
        if (gravado) e.estado = "salvo";
        else if (semSuporte) e.estado = "local";
        else {
          /* A tela segue com a escolha até recarregar; o cache volta ao que
             a conta tem de fato, para a próxima abertura não mentir. */
          gravarLocal(PREFIXO + dono + "." + chave, e.confirmado);
          e.estado = "erro";
        }
        avisar(chave);
      });
  }

  function salvar(chave, v) {
    var e = estados[chave];
    if (!e) return;
    var novo = valida(chave, v);
    e.valor = novo;
    e.desejado = novo;
    avisar(chave);
    if (!e.emVoo) enviar(chave);
    else { e.estado = "salvando"; avisar(chave); }
  }

  /* ---- Ouvir ---- */

  function aoMudar(fn) {
    ouvintes.push(fn);
    return function () {
      var i = ouvintes.indexOf(fn);
      if (i >= 0) ouvintes.splice(i, 1);
    };
  }

  /* Outra aba da mesma conta salvou. */
  if (global.addEventListener) {
    global.addEventListener("storage", function (ev) {
      if (!conta || !ev.key || ev.key.indexOf(PREFIXO + conta + ".") !== 0) return;
      var chave = ev.key.slice((PREFIXO + conta + ".").length);
      var e = estados[chave];
      if (!e || e.emVoo || e.desejado !== null) return;
      var v = valida(chave, ev.newValue);
      e.confirmado = v;
      if (v !== e.valor) { e.valor = v; avisar(chave); }
    });
  }

  global.RAMAPreferencias = {
    ACEITAS: ACEITAS,
    valor: function (chave) { return estados[chave] ? estados[chave].valor : null; },
    estado: function (chave) { return estados[chave] ? estados[chave].estado : null; },
    conta: function () { return conta; },
    sincronizarDaConta: sincronizarDaConta,
    esquecerConta: esquecerConta,
    salvar: salvar,
    aoMudar: aoMudar,
  };
})(typeof window !== "undefined" ? window : globalThis);
