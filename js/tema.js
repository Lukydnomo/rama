/* =====================================================================
   R.A.M.A. — tema.js
   Tema da página: claro, escuro, do aparelho ou personalizado (v2.25,
   ampliado na v2.36).

   Carregado no <head>, depois de tema-modelo.js e antes das folhas de
   estilo, para a página já pintar com o tema certo — sem piscar o outro.

   Duas coisas separadas:
   - a PREFERÊNCIA, o que foi escolhido: "sistema", "claro", "escuro" ou
     "personalizado" (um tema da conta). É ela que vai para a planilha
     (preferenciasJson.tema, e temaAtivo/temas para os personalizados);
   - a APARÊNCIA efetiva, o que está na tela. Com "sistema", vem do
     prefers-color-scheme do aparelho e acompanha a mudança com o site
     aberto; temas fixos e personalizados não mudam por isso.

   A RESOLUÇÃO, em ordem (uma função só, `escolha`):
     1. a prévia do editor de temas, enquanto ele está aberto;
     2. o tema da ficha aberta nesta página, quando ela tem um próprio;
     3. o tema da conta (que pode ser "sistema" → o aparelho).
   Uma ficha que "usa o tema da conta" cai no passo 3 — com a conta de
   quem está vendo, não a do dono.

   A conta manda: o tema chega com a sessão e fica num cache local POR
   CONTA (rama.tema.<id>, rama.tema.personalizado.<id>), e o da ficha POR
   CONTA E FICHA (rama.tema.ficha.<id>.<ficha>) — o cache só antecipa a
   próxima abertura. Sem conta, vale o aparelho; trocar de conta nunca
   herda o tema da anterior. Cada aba resolve o seu: duas fichas abertas
   em abas diferentes ficam cada uma com o seu tema.

   Salvar é otimista na tela e honesto na resposta: um pedido por vez,
   só o último valor escolhido vai; resposta antiga não passa por cima da
   escolha nova; falha não vira "salvo".
   ===================================================================== */

(function (global) {
  "use strict";

  var PREFERENCIAS = ["sistema", "claro", "escuro"];
  var PREFERENCIAS_CONTA = PREFERENCIAS.concat(["personalizado"]);
  var CHAVE_AGENTE = "rama.sessao.agente";
  var PREFIXO = "rama.tema.";
  var PREFIXO_PERSONALIZADO = "rama.tema.personalizado.";
  var PREFIXO_FICHA = "rama.tema.ficha.";
  /* A cor da barra do navegador no celular: o fundo de cada paleta. */
  var COR_DA_BARRA = { claro: "#F4F4F1", escuro: "#08080A" };

  var doc = global.document;
  var midia = null;
  try {
    midia = global.matchMedia ? global.matchMedia("(prefers-color-scheme: dark)") : null;
  } catch (e) { midia = null; }

  function M() { return global.RAMATemaModelo || null; }

  function valida(p) { return PREFERENCIAS_CONTA.indexOf(p) >= 0 ? p : "sistema"; }

  /* A conta pura: preferência de base + o que o aparelho diz → tema na
     tela. (O personalizado resolve pelo modelo; aqui só as três bases.) */
  function resolver(preferencia, sistemaEscuro) {
    var p = valida(preferencia);
    if (p === "sistema" || p === "personalizado") return sistemaEscuro ? "escuro" : "claro";
    return p;
  }

  function sistemaEscuro() { return !!(midia && midia.matches); }

  function lerLocal(chave) {
    try { return global.localStorage.getItem(chave); } catch (e) { return null; }
  }
  function gravarLocal(chave, valor) {
    try { global.localStorage.setItem(chave, valor); } catch (e) { /* segue sem cache */ }
  }
  function apagarLocal(chave) {
    try { global.localStorage.removeItem(chave); } catch (e) { /* segue */ }
  }
  function lerJsonLocal(chave) {
    try { return JSON.parse(lerLocal(chave) || "null"); } catch (e) { return null; }
  }

  function contaGuardada() {
    var a = lerJsonLocal(CHAVE_AGENTE);
    return a && a.id ? String(a.id) : null;
  }

  function cacheDe(conta) {
    return conta ? valida(lerLocal(PREFIXO + conta)) : "sistema";
  }

  /* O tema personalizado ativo da conta, do cache: { id, tema } ou null. */
  function personalizadoDoCache(conta) {
    if (!conta || !M()) return null;
    var bruto = lerJsonLocal(PREFIXO_PERSONALIZADO + conta);
    var tema = bruto ? M().normalizarTema(bruto.tema, true) : null;
    return tema ? { id: tema.id, tema: tema } : null;
  }

  /* A ficha desta página, antes de a página carregar: só o endereço. */
  function fichaDoEndereco() {
    try {
      var caminho = String(global.location && global.location.pathname || "");
      if (!/\/ficha(\/|\/index\.html)?$/.test(caminho)) return null;
      var id = new URLSearchParams(global.location.search || "").get("id");
      return id && /^[A-Za-z0-9_-]{1,80}$/.test(id) ? id : null;
    } catch (e) { return null; }
  }
  function aparenciaDoCache(conta, fichaId) {
    if (!conta || !fichaId || !M()) return null;
    var bruto = lerJsonLocal(PREFIXO_FICHA + conta + "." + fichaId);
    return bruto ? M().normalizarAparencia(bruto) : null;
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
  var personalizado = personalizadoDoCache(conta);
  var ficha = null;             // { id, aparencia } da ficha aberta nesta página
  var previa = null;            // { modo, tema } enquanto o editor está aberto
  var aplicadas = [];           // variáveis postas no <html> pelo tema personalizado
  var seqConta = 0;             // salvamentos do editor: só o último vale

  (function () {
    var id = fichaDoEndereco();
    if (id) {
      var a = aparenciaDoCache(conta, id);
      ficha = { id: id, aparencia: a || { v: 1, modo: "conta" } };
    }
  })();

  /* A escolha que vale agora, com a origem. */
  function escolha() {
    if (previa) return { modo: previa.modo, tema: previa.tema || null, origem: "previa" };
    if (ficha && ficha.aparencia && ficha.aparencia.modo !== "conta") {
      return { modo: ficha.aparencia.modo, tema: ficha.aparencia.tema || null, origem: "ficha" };
    }
    return { modo: preferencia, tema: personalizado ? personalizado.tema : null, origem: "conta" };
  }

  /* Escolha → o que pintar. Um personalizado sem tema (apagado, cache
     vazio) cai no aparelho: a página nunca fica sem estilo. */
  function resolverEscolha(e) {
    if (e.modo === "personalizado" && e.tema && M()) {
      var r = M().resolver(e.tema);
      return { efetivo: r.efetivo, base: r.base, vars: r.vars, esquema: r.esquema, barra: r.barra, personalizado: true };
    }
    var ef = resolver(e.modo, sistemaEscuro());
    return { efetivo: ef, base: ef, vars: null, esquema: ef === "escuro" ? "dark" : "light", barra: COR_DA_BARRA[ef], personalizado: false };
  }

  function efetivo() { return resolverEscolha(escolha()).efetivo; }

  function avisar() {
    var e = escolha();
    var info = { preferencia: preferencia, efetivo: resolverEscolha(e).efetivo, estado: estado, origem: e.origem, modo: e.modo };
    ouvintes.slice().forEach(function (fn) {
      try { fn(info); } catch (err) { /* um ouvinte não derruba os outros */ }
    });
  }

  function pintar() {
    var e = escolha();
    var r = resolverEscolha(e);
    var raiz = doc.documentElement;
    raiz.setAttribute("data-tema", r.base);
    raiz.setAttribute("data-tema-preferencia", preferencia);
    raiz.setAttribute("data-tema-origem", e.origem);
    if (raiz.style) {
      aplicadas.forEach(function (v) { raiz.style.removeProperty(v); });
      aplicadas = [];
      if (r.vars) {
        Object.keys(r.vars).forEach(function (v) { raiz.style.setProperty(v, r.vars[v]); aplicadas.push(v); });
      }
      raiz.style.colorScheme = r.esquema;
    }
    var esquema = doc.querySelector('meta[name="color-scheme"]');
    if (esquema) esquema.setAttribute("content", r.esquema);
    var barra = doc.querySelector('meta[name="theme-color"]');
    if (barra) barra.setAttribute("content", r.barra);
  }

  function definir(p) {
    preferencia = valida(p);
    pintar();
    avisar();
  }

  /* Aplica uma escolha num elemento só (a prévia do editor, um painel):
     a lista inteira de propriedades, para não depender do que vem de
     fora. Devolve a função que desfaz. */
  function aplicarEm(elemento, esc) {
    if (!elemento || !elemento.style || !M()) return function () {};
    var e = esc || escolha();
    var tema = e.modo === "personalizado" && e.tema ? e.tema : { base: resolver(e.modo, sistemaEscuro()), valores: {} };
    var r = M().resolver(tema);
    var postas = Object.keys(r.vars);
    postas.forEach(function (v) { elemento.style.setProperty(v, r.vars[v]); });
    elemento.style.colorScheme = r.esquema;
    elemento.setAttribute("data-tema-contexto", r.efetivo);
    return function () {
      postas.forEach(function (v) { elemento.style.removeProperty(v); });
      elemento.style.colorScheme = "";
      elemento.removeAttribute("data-tema-contexto");
    };
  }

  /* ---- Conta ---- */

  /* A sessão confirmou quem é a conta e o que ela tem salvo. Chamado por
     auth.js a cada login/retomada; `tema` ausente (backend antigo) deixa o
     cache valer. `prefs` (v2.36) traz temaAtivo e temaPersonalizado. */
  function sincronizarDaConta(id, tema, prefs) {
    var novaConta = id ? String(id) : null;
    if (novaConta !== conta) {
      conta = novaConta;
      desejada = null;
      estado = null;
      preferencia = cacheDe(conta);
      confirmada = preferencia;
      personalizado = personalizadoDoCache(conta);
      if (ficha) ficha.aparencia = aparenciaDoCache(conta, ficha.id) || ficha.aparencia;
    }
    if (conta && PREFERENCIAS_CONTA.indexOf(tema) >= 0) {
      confirmada = tema;
      gravarLocal(PREFIXO + conta, tema);
      /* Um salvamento a caminho é mais novo que esta leitura. */
      if (!emVoo && desejada === null) preferencia = tema;
    }
    if (conta && prefs && Object.prototype.hasOwnProperty.call(prefs, "temaPersonalizado") && M() && !emVoo && desejada === null) {
      var t = prefs.temaPersonalizado ? M().normalizarTema(prefs.temaPersonalizado, true) : null;
      personalizado = t ? { id: t.id, tema: t } : null;
      if (t) gravarLocal(PREFIXO_PERSONALIZADO + conta, JSON.stringify({ id: t.id, tema: t }));
      else apagarLocal(PREFIXO_PERSONALIZADO + conta);
    }
    pintar();
    avisar();
  }

  /* Saiu da conta: o tema volta ao do sistema, sem apagar o cache dela. */
  function esquecerConta() { sincronizarDaConta(null); }

  /* ---- Salvar a escolha simples (Sistema, Claro, Escuro) ---- */

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
    if (nova === "personalizado" && !personalizado) nova = "sistema";
    definir(nova);
    desejada = nova;
    if (!emVoo) enviar();
    else { estado = "salvando"; avisar(); }
  }

  /* Tentar de novo depois de uma falha: o que está na tela. */
  function tentarDeNovo() { salvar(preferencia); }

  /* ---- Salvar pelo editor: preferência, tema ativo e a lista ----
     Devolve uma promessa { ok, erro }. Nada muda na conta antes da
     resposta; uma resposta de um pedido mais antigo é ignorada. */
  function salvarConta(pedido) {
    var api = global.RAMAApi;
    var dono = conta;
    var meu = ++seqConta;
    if (!api || !dono) return Promise.resolve({ ok: false, erro: "sem_conta" });
    estado = "salvando";
    avisar();
    var prefs = {};
    if (pedido.tema !== undefined) prefs.tema = valida(pedido.tema);
    if (pedido.temaAtivo !== undefined) prefs.temaAtivo = pedido.temaAtivo;
    if (pedido.temas !== undefined) prefs.temas = pedido.temas;
    return Promise.resolve()
      .then(function () { return api.salvarPerfil({ preferencias: prefs }); })
      .then(function (r) { return r || { ok: false }; }, function () { return { ok: false, erro: "sem_conexao" }; })
      .then(function (r) {
        var gravou = r.ok && r.preferencias && (prefs.tema === undefined || r.preferencias.tema === prefs.tema);
        if (dono !== conta || meu !== seqConta) return { ok: gravou, erro: gravou ? null : (r.erro || "servidor"), antigo: true };
        if (!gravou) {
          estado = "erro";
          avisar();
          return { ok: false, erro: r.erro || "servidor" };
        }
        var gp = r.preferencias;
        if (gp.tema) { preferencia = valida(gp.tema); confirmada = preferencia; gravarLocal(PREFIXO + dono, preferencia); }
        var lista = M() ? M().normalizarTemas(gp.temas) : [];
        var ativo = null;
        lista.forEach(function (t) { if (t.id === gp.temaAtivo) ativo = t; });
        personalizado = ativo ? { id: ativo.id, tema: ativo } : null;
        if (ativo) gravarLocal(PREFIXO_PERSONALIZADO + dono, JSON.stringify({ id: ativo.id, tema: ativo }));
        else apagarLocal(PREFIXO_PERSONALIZADO + dono);
        estado = "salvo";
        pintar();
        avisar();
        return { ok: true, preferencias: gp };
      });
  }

  /* ---- Ficha ---- */

  /* A página da ficha diz qual ficha está aberta e a aparência dela. O
     cache por conta e ficha guarda só a ficha que tem tema próprio. */
  function definirFicha(id, aparencia) {
    var a = M() ? M().normalizarAparencia(aparencia) : { v: 1, modo: "conta" };
    ficha = { id: String(id), aparencia: a };
    if (conta && id) {
      if (a.modo === "conta") apagarLocal(PREFIXO_FICHA + conta + "." + id);
      else gravarLocal(PREFIXO_FICHA + conta + "." + id, JSON.stringify(a));
    }
    pintar();
    avisar();
  }

  /* Saiu da ficha (sem trocar de página): volta ao tema da conta. */
  function sairDaFicha() {
    ficha = null;
    pintar();
    avisar();
  }

  /* ---- Prévia do editor ---- */

  function definirPrevia(esc) {
    previa = esc && esc.modo ? { modo: esc.modo, tema: esc.tema || null } : null;
    pintar();
    avisar();
  }

  /* ---- Ouvir ---- */

  function aoMudar(fn) {
    ouvintes.push(fn);
    return function () {
      var i = ouvintes.indexOf(fn);
      if (i >= 0) ouvintes.splice(i, 1);
    };
  }

  /* O aparelho trocou de tema com o site aberto: só importa quando o que
     está na tela segue o aparelho. */
  function aoMudarSistema() {
    var e = escolha();
    if (e.modo !== "sistema" && !(e.modo === "personalizado" && !e.tema)) return;
    pintar();
    avisar();
  }
  if (midia) {
    if (midia.addEventListener) midia.addEventListener("change", aoMudarSistema);
    else if (midia.addListener) midia.addListener(aoMudarSistema);
  }

  /* Outra aba da mesma conta salvou um tema (ou o tema desta ficha). */
  if (global.addEventListener) {
    global.addEventListener("storage", function (ev) {
      if (!conta || !ev.key) return;
      if (ev.key === PREFIXO + conta) {
        if (emVoo || desejada !== null) return;
        var v = valida(ev.newValue);
        confirmada = v;
        if (v !== preferencia) definir(v);
        return;
      }
      if (ev.key === PREFIXO_PERSONALIZADO + conta && M()) {
        personalizado = personalizadoDoCache(conta);
        pintar();
        avisar();
        return;
      }
      if (ficha && ev.key === PREFIXO_FICHA + conta + "." + ficha.id && M()) {
        ficha.aparencia = aparenciaDoCache(conta, ficha.id) || { v: 1, modo: "conta" };
        pintar();
        avisar();
      }
    });
  }

  pintar();

  global.RAMATema = {
    PREFERENCIAS: PREFERENCIAS.slice(),
    PREFERENCIAS_CONTA: PREFERENCIAS_CONTA.slice(),
    resolver: resolver,
    preferencia: function () { return preferencia; },
    efetivo: efetivo,
    estado: function () { return estado; },
    conta: function () { return conta; },
    escolha: escolha,
    personalizado: function () { return personalizado; },
    ficha: function () { return ficha; },
    sincronizarDaConta: sincronizarDaConta,
    esquecerConta: esquecerConta,
    salvar: salvar,
    tentarDeNovo: tentarDeNovo,
    salvarConta: salvarConta,
    definirFicha: definirFicha,
    sairDaFicha: sairDaFicha,
    definirPrevia: definirPrevia,
    aplicarEm: aplicarEm,
    aoMudar: aoMudar,
  };
})(typeof window !== "undefined" ? window : globalThis);
