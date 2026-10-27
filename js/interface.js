/* =====================================================================
   R.A.M.A. — interface.js
   O estilo da interface (v2.49): "legacy" ou "modern20".

   Carregado no <head>, logo depois de tema.js e antes das folhas de
   estilo: põe data-interface no <html> antes da primeira pintura, para a
   página não abrir num estilo e saltar para o outro.

   O ESTILO É A LINGUAGEM VISUAL, NÃO AS CORES
   - data-interface="legacy"   a aparência da v2.48.4: fonte pixel,
                               caixa-alta, traço fino, véu de CRT. As
                               folhas de css/*.css, intocadas;
   - data-interface="modern20" a identidade nova: as folhas de
                               css/modern20/*.css, todas presas a
                               :root[data-interface="modern20"].
   Claro, Escuro, Sistema e os temas personalizados continuam em tema.js
   e valem nos dois estilos. Trocar o estilo não mexe no tema, na ficha
   nem em nada que vai para o servidor além da própria preferência.

   O MESMO DESENHO DAS OUTRAS PREFERÊNCIAS (tema.js, preferencias.js)
   - a CONTA manda: o valor chega com a sessão
     (agente.preferencias.estiloInterface) e fica num cache local POR
     CONTA (rama.interface.<id>), que só antecipa a próxima abertura. Sem
     conta, ou com valor desconhecido, vale o padrão: Modern20. Trocar de
     conta nunca herda o estilo da anterior;
   - cada pessoa vê o PRÓPRIO estilo: abrir a ficha ou a campanha de outra
     conta não troca nada aqui;
   - salvar é otimista na tela e honesto na resposta: um pedido por vez,
     só o último valor escolhido vai, resposta antiga não passa por cima
     da escolha nova, falha não vira "salvo". Servidor anterior à v2.49
     recusa a chave (dados_invalidos): a escolha fica neste aparelho e o
     estado diz "local";
   - a PRÉVIA do editor de temas (definirPrevia) muda só a tela e some ao
     cancelar; a preferência confirmada fica onde estava.

   Trocar de estilo muda medidas: antes de trocar, guarda-se o que está no
   alto da página (e o elemento em foco, quando ele mora numa janela que
   rola) e a posição deles; depois, a rolagem é corrigida para eles
   continuarem no mesmo lugar. O foco não sai de onde está: nada é
   redesenhado, só o atributo do <html> muda.
   ===================================================================== */

(function (global) {
  "use strict";

  var ESTILOS = ["legacy", "modern20"];
  var PADRAO = "modern20";
  var NOMES = { legacy: "Legacy", modern20: "Modern20" };
  var CHAVE_AGENTE = "rama.sessao.agente";
  var PREFIXO = "rama.interface.";

  var doc = global.document;

  function valido(v) { return ESTILOS.indexOf(v) >= 0; }
  function valida(v) { return valido(v) ? v : PADRAO; }

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

  function cacheDe(conta) { return conta ? valida(lerLocal(PREFIXO + conta)) : PADRAO; }

  /* ---- Estado ---- */
  var conta = contaGuardada();
  var valor = cacheDe(conta);    // a preferência na tela (otimista)
  var confirmado = valor;        // o que a conta tinha na última vez que se soube
  var desejado = null;           // o último valor pedido e ainda não respondido
  var emVoo = false;
  var estado = null;             // null | "salvando" | "salvo" | "local" | "erro"
  var previa = null;             // o estilo do rascunho do editor, enquanto aberto
  var ouvintes = [];
  var esperando = [];            // promessas de salvar() à espera do fim da fila

  function efetivo() { return previa || valor; }

  function avisar() {
    var info = { estilo: efetivo(), preferencia: valor, estado: estado, previa: previa };
    ouvintes.slice().forEach(function (fn) {
      try { fn(info); } catch (err) { /* um ouvinte não derruba os outros */ }
    });
  }

  /* ---- Pintar sem perder o lugar ---- */

  /* Duas referências, porque há dois lugares que rolam:
     - a PÁGINA: o elemento que está no alto da área visível, logo abaixo
       do cabeçalho. As camadas fixas (janela, avisos, rolagens) ficam fora
       da conta — sem isso, a referência seria o que flutua, e não o
       conteúdo;
     - a CAIXA que rola por dentro (o corpo de uma janela aberta), quando
       o foco está nela: é o elemento em foco que precisa continuar à
       vista. */
  var CAMADAS = ".r-fundo, .r-avisos, .rolagens, .r-sincronia, .r-atividade";
  /* O que entra com animação: se já está na tela quando o estilo troca, a
     animação de entrada não repete (css/interface.css). */
  var ENTRADAS = ".r-fundo, .r-modal, .rolagem, .r-aviso";

  function caixaQueRola(el) {
    for (var no = el && el.parentElement; no && no !== doc.body && no !== doc.documentElement; no = no.parentElement) {
      var s = global.getComputedStyle(no);
      if (/(auto|scroll)/.test(s.overflowY) && no.scrollHeight > no.clientHeight) return no;
    }
    return null;
  }

  function visivel(el) {
    if (!el || el === doc.body || el === doc.documentElement || !el.getBoundingClientRect) return false;
    var r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < (global.innerHeight || 0) && !!(r.width || r.height);
  }

  function ancoraDaPagina() {
    var camadas = Array.prototype.slice.call(doc.querySelectorAll(CAMADAS));
    var antes = camadas.map(function (c) { return c.style.pointerEvents; });
    camadas.forEach(function (c) { c.style.pointerEvents = "none"; });
    try {
      var topo = doc.querySelector(".ficha-topo") || doc.querySelector(".app-topo");
      var alto = global.innerHeight || 0;
      var y = topo ? Math.min(Math.max(topo.getBoundingClientRect().bottom + 8, 8), alto / 2) : 8;
      var alvo = doc.elementFromPoint((global.innerWidth || 0) / 2, y);
      return visivel(alvo) ? { alvo: alvo, y: alvo.getBoundingClientRect().top } : null;
    } finally {
      camadas.forEach(function (c, i) { c.style.pointerEvents = antes[i]; });
    }
  }

  function guardarLugar() {
    try {
      if (!doc.body || !global.getComputedStyle || !doc.elementFromPoint) return null;
      var foco = doc.activeElement;
      var caixa = visivel(foco) ? caixaQueRola(foco) : null;
      return {
        pagina: ancoraDaPagina(),
        caixa: caixa ? { caixa: caixa, alvo: foco, y: foco.getBoundingClientRect().top } : null,
      };
    } catch (e) { return null; }
  }

  function corrigir(ref, rolar) {
    if (!ref || !ref.alvo.isConnected) return;
    var delta = ref.alvo.getBoundingClientRect().top - ref.y;
    if (Math.abs(delta) >= 1) rolar(delta);
  }

  function voltarAoLugar(lugar) {
    if (!lugar) return;
    try {
      corrigir(lugar.pagina, function (d) { global.scrollBy(0, d); });
      if (lugar.caixa && lugar.caixa.caixa.isConnected) {
        corrigir(lugar.caixa, function (d) { lugar.caixa.caixa.scrollTop += d; });
      }
    } catch (e) { /* a página segue no lugar que o navegador escolher */ }
  }

  function pintar() {
    var raiz = doc && doc.documentElement;
    if (!raiz) return;
    var novo = efetivo();
    if (raiz.getAttribute("data-interface") === novo) return;
    var lugar = guardarLugar();
    if (doc.body) {
      Array.prototype.forEach.call(doc.querySelectorAll(ENTRADAS), function (el) { el.classList.add("interface-entrou"); });
    }
    raiz.setAttribute("data-interface", novo);
    voltarAoLugar(lugar);
  }

  /* ---- Conta ---- */

  /* A sessão confirmou quem é a conta e o que ela tem salvo. Chave ausente
     (servidor anterior à v2.49) deixa o cache valer. */
  function sincronizarDaConta(id, preferencias) {
    var nova = id ? String(id) : null;
    var antes = valor;
    var trocou = nova !== conta;
    if (trocou) {
      conta = nova;
      desejado = null;
      estado = null;
      valor = cacheDe(conta);
      confirmado = valor;
    }
    var v = preferencias && preferencias.estiloInterface;
    if (conta && valido(v)) {
      confirmado = v;
      gravarLocal(PREFIXO + conta, v);
      /* Um salvamento a caminho é mais novo que esta leitura. */
      if (!emVoo && desejado === null) valor = v;
    }
    pintar();
    if (trocou || valor !== antes) avisar();
  }

  function esquecerConta() { sincronizarDaConta(null, null); }

  /* ---- Salvar ---- */

  function terminar(resultado) {
    var lista = esperando;
    esperando = [];
    lista.forEach(function (fn) { fn(resultado); });
  }

  function enviar() {
    var api = global.RAMAApi;
    var alvo = desejado;
    var dono = conta;
    if (!api || !dono) {
      desejado = null;
      valor = confirmado;
      estado = "erro";
      pintar();
      avisar();
      terminar({ ok: false, estado: "erro", erro: dono ? "sem_api" : "sem_conta" });
      return;
    }
    emVoo = true;
    estado = "salvando";
    avisar();
    Promise.resolve()
      .then(function () { return api.salvarPerfil({ preferencias: { estiloInterface: alvo } }); })
      .then(function (r) { return r || { ok: false }; }, function () { return { ok: false, erro: "sem_conexao" }; })
      .then(function (r) {
        var gravado = !!(r.ok && r.preferencias && r.preferencias.estiloInterface === alvo);
        var semSuporte = !r.ok && r.erro === "dados_invalidos";
        emVoo = false;
        if (gravado || semSuporte) gravarLocal(PREFIXO + dono, alvo);
        if (dono !== conta) { terminar({ ok: false, estado: "erro", erro: "outra_conta" }); return; }
        if (gravado) confirmado = alvo;
        if (desejado !== null && desejado !== alvo) { enviar(); return; }   // escolha mais nova
        desejado = null;
        var fim;
        if (gravado) {
          estado = "salvo";
          fim = { ok: true, estado: "salvo" };
        } else if (semSuporte) {
          estado = "local";
          fim = { ok: true, estado: "local" };
        } else {
          /* A conta continua com o estilo anterior: a tela e o cache voltam
             a ele, para nada fingir que mudou. */
          gravarLocal(PREFIXO + dono, confirmado);
          valor = confirmado;
          estado = "erro";
          fim = { ok: false, estado: "erro", erro: r.erro || "servidor" };
          pintar();
        }
        avisar();
        terminar(fim);
      });
  }

  /* Escolhe e grava. Devolve uma promessa com o resultado da ÚLTIMA
     escolha: duas escolhas seguidas esperam juntas e recebem o mesmo fim. */
  function salvar(v) {
    var novo = valida(v);
    var promessa = new Promise(function (resolver) { esperando.push(resolver); });
    valor = novo;
    desejado = novo;
    pintar();
    if (!emVoo) enviar();
    else { estado = "salvando"; avisar(); }
    return promessa;
  }

  /* ---- Prévia do editor ---- */

  function definirPrevia(v) {
    var nova = valido(v) ? v : null;
    if (nova === previa) return;
    previa = nova;
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

  /* Outra aba da mesma conta salvou. */
  if (global.addEventListener) {
    global.addEventListener("storage", function (ev) {
      if (!conta || ev.key !== PREFIXO + conta) return;
      if (emVoo || desejado !== null) return;
      var v = valida(ev.newValue);
      confirmado = v;
      if (v !== valor) { valor = v; pintar(); avisar(); }
    });
  }

  pintar();

  global.RAMAInterface = {
    ESTILOS: ESTILOS.slice(),
    PADRAO: PADRAO,
    NOMES: NOMES,
    estilo: efetivo,
    preferencia: function () { return valor; },
    confirmado: function () { return confirmado; },
    estado: function () { return estado; },
    conta: function () { return conta; },
    sincronizarDaConta: sincronizarDaConta,
    esquecerConta: esquecerConta,
    salvar: salvar,
    definirPrevia: definirPrevia,
    aoMudar: aoMudar,
  };
})(typeof window !== "undefined" ? window : globalThis);
