/* =====================================================================
   R.A.M.A. — tema.js
   Tema claro e escuro (v2.25).

   Carregado no <head>, antes das folhas de estilo, para a página já
   pintar com o tema certo — sem piscar o outro.

   Duas coisas separadas:
   - a PREFERÊNCIA, o que a conta escolheu: "sistema", "claro" ou
     "escuro". É ela que vai para a planilha (preferenciasJson.tema);
   - o tema EFETIVO, o que está na tela: "claro" ou "escuro". Com
     "sistema", vem do prefers-color-scheme do aparelho e acompanha a
     mudança com o site aberto. Aparelho que não informa: claro.

   A conta manda: o tema chega com a sessão (login e "sessao" devolvem
   agente.preferencias.tema) e é guardado num cache local POR CONTA
   (rama.tema.<id>), que só antecipa a próxima abertura. Sem conta, vale
   o do sistema; trocar de conta nunca herda o tema da anterior.

   Salvar é otimista na tela e honesto na resposta: um pedido por vez, só
   o último valor escolhido vai; resposta antiga não passa por cima da
   escolha nova; falha não vira "salvo".
   ===================================================================== */

(function (global) {
  "use strict";

  var PREFERENCIAS = ["sistema", "claro", "escuro"];
  var CHAVE_AGENTE = "rama.sessao.agente";
  var PREFIXO = "rama.tema.";
  /* A cor da barra do navegador no celular: o fundo de cada paleta. */
  var COR_DA_BARRA = { claro: "#F4F4F1", escuro: "#08080A" };

  var doc = global.document;
  var midia = null;
  try {
    midia = global.matchMedia ? global.matchMedia("(prefers-color-scheme: dark)") : null;
  } catch (e) { midia = null; }

  function valida(p) { return PREFERENCIAS.indexOf(p) >= 0 ? p : "sistema"; }

  /* A conta pura: preferência + o que o aparelho diz → tema na tela. */
  function resolver(preferencia, sistemaEscuro) {
    var p = valida(preferencia);
    if (p === "sistema") return sistemaEscuro ? "escuro" : "claro";
    return p;
  }

  function sistemaEscuro() { return !!(midia && midia.matches); }

  function lerLocal(chave) {
    try { return global.localStorage.getItem(chave); } catch (e) { return null; }
  }
  function gravarLocal(chave, valor) {
    try { global.localStorage.setItem(chave, valor); } catch (e) { /* segue sem cache */ }
  }

  function contaGuardada() {
    try {
      var a = JSON.parse(lerLocal(CHAVE_AGENTE) || "null");
      return a && a.id ? String(a.id) : null;
    } catch (e) { return null; }
  }

  function cacheDe(conta) {
    return conta ? valida(lerLocal(PREFIXO + conta)) : "sistema";
  }

  /* ---- Estado ---- */
  var conta = contaGuardada();
  var preferencia = cacheDe(conta);
  /* O último valor que a planilha confirmou para esta conta. Começa no
     cache: é o que a conta tinha na última vez que se soube. */
  var confirmada = preferencia;
  var estado = null;            // null | "salvando" | "salvo" | "erro"
  var desejada = null;          // o último valor pedido e ainda não confirmado
  var emVoo = false;
  var ouvintes = [];

  function avisar() {
    var info = { preferencia: preferencia, efetivo: efetivo(), estado: estado };
    ouvintes.slice().forEach(function (fn) {
      try { fn(info); } catch (e) { /* um ouvinte não derruba os outros */ }
    });
  }

  function efetivo() { return resolver(preferencia, sistemaEscuro()); }

  function pintar() {
    var ef = efetivo();
    var raiz = doc.documentElement;
    raiz.setAttribute("data-tema", ef);
    raiz.setAttribute("data-tema-preferencia", preferencia);
    raiz.style.colorScheme = ef === "escuro" ? "dark" : "light";
    var esquema = doc.querySelector('meta[name="color-scheme"]');
    if (esquema) esquema.setAttribute("content", ef === "escuro" ? "dark" : "light");
    var barra = doc.querySelector('meta[name="theme-color"]');
    if (barra) barra.setAttribute("content", COR_DA_BARRA[ef]);
  }

  function definir(p) {
    preferencia = valida(p);
    pintar();
    avisar();
  }

  /* ---- Conta ---- */

  /* A sessão confirmou quem é a conta e o que ela tem salvo. Chamado por
     auth.js a cada login/retomada; `tema` ausente (backend antigo) deixa o
     cache valer. */
  function sincronizarDaConta(id, tema) {
    var novaConta = id ? String(id) : null;
    if (novaConta !== conta) {
      conta = novaConta;
      desejada = null;
      estado = null;
      preferencia = cacheDe(conta);
      confirmada = preferencia;
    }
    if (conta && PREFERENCIAS.indexOf(tema) >= 0) {
      confirmada = tema;
      gravarLocal(PREFIXO + conta, tema);
      /* Um salvamento a caminho é mais novo que esta leitura. */
      if (!emVoo && desejada === null) preferencia = tema;
    }
    pintar();
    avisar();
  }

  /* Saiu da conta: o tema volta ao do sistema, sem apagar o cache dela. */
  function esquecerConta() { sincronizarDaConta(null); }

  /* ---- Salvar ---- */

  function enviar() {
    var api = global.RAMAApi;
    var alvo = desejada;
    var dono = conta;
    if (!api || !dono) {
      desejada = null;
      estado = "erro";
      avisar();
      return;
    }
    emVoo = true;
    estado = "salvando";
    avisar();
    Promise.resolve()
      .then(function () { return api.salvarPerfil({ preferencias: { tema: alvo } }); })
      .then(function (r) {
        var tema = r && r.preferencias && r.preferencias.tema;
        return (r && r.ok && tema === alvo) ? true : false;
      }, function () { return false; })
      .then(function (deuCerto) {
        emVoo = false;
        if (deuCerto) gravarLocal(PREFIXO + dono, alvo);
        if (dono !== conta) return;              // trocou de conta no meio
        if (deuCerto) confirmada = alvo;
        if (desejada !== null && desejada !== alvo) { enviar(); return; }  // escolha mais nova
        desejada = null;
        if (deuCerto) {
          estado = "salvo";
        } else {
          /* A tela segue com a escolha até recarregar; o cache volta ao que
             a conta tem de fato, para a próxima abertura não mentir. */
          gravarLocal(PREFIXO + dono, confirmada);
          estado = "erro";
        }
        avisar();
      });
  }

  function salvar(p) {
    var nova = valida(p);
    definir(nova);
    desejada = nova;
    if (!emVoo) enviar();
    else { estado = "salvando"; avisar(); }
  }

  /* Tentar de novo depois de uma falha: o que está na tela. */
  function tentarDeNovo() { salvar(preferencia); }

  /* ---- Ouvir ---- */

  function aoMudar(fn) {
    ouvintes.push(fn);
    return function () {
      var i = ouvintes.indexOf(fn);
      if (i >= 0) ouvintes.splice(i, 1);
    };
  }

  /* O aparelho trocou de tema com o site aberto: só importa em "sistema". */
  function aoMudarSistema() {
    if (preferencia !== "sistema") return;
    pintar();
    avisar();
  }
  if (midia) {
    if (midia.addEventListener) midia.addEventListener("change", aoMudarSistema);
    else if (midia.addListener) midia.addListener(aoMudarSistema);
  }

  /* Outra aba da mesma conta salvou um tema. */
  if (global.addEventListener) {
    global.addEventListener("storage", function (ev) {
      if (!conta || ev.key !== PREFIXO + conta || emVoo || desejada !== null) return;
      var v = valida(ev.newValue);
      confirmada = v;
      if (v !== preferencia) definir(v);
    });
  }

  pintar();

  global.RAMATema = {
    PREFERENCIAS: PREFERENCIAS.slice(),
    resolver: resolver,
    preferencia: function () { return preferencia; },
    efetivo: efetivo,
    estado: function () { return estado; },
    conta: function () { return conta; },
    sincronizarDaConta: sincronizarDaConta,
    esquecerConta: esquecerConta,
    salvar: salvar,
    tentarDeNovo: tentarDeNovo,
    aoMudar: aoMudar,
  };
})(typeof window !== "undefined" ? window : globalThis);
