/* =====================================================================
   R.A.M.A. — densidade.js
   A densidade da interface (v5.2): "confortavel" ou "compacta".

   Carregado no <head>, logo depois de interface.js e antes das folhas de
   estilo: põe data-densidade no <html> antes da primeira pintura, para a
   página não abrir numa densidade e saltar para a outra.

   DENSIDADE NÃO É ESTILO, COR NEM TAMANHO
   - o estilo (Legacy/Modern20) é a linguagem visual — interface.js;
   - as cores são o tema — tema.js;
   - o tamanho é a escala do Perfil (--escala) — app.js;
   - a densidade é quanto ESPAÇO sobra entre as coisas: margens internas,
     distância entre seções, altura das linhas. As regras moram num lugar
     só, css/densidade.css (e o ajuste do Modern20 na par dela), presas a
     :root[data-densidade="compacta"]. Sem o atributo, ou com
     "confortavel", a tela é exatamente a de antes.

   COMO A ESCALA E OS EFEITOS: SÓ NESTE APARELHO
   A densidade descreve a tela em que a pessoa está, não a conta — o
   celular pode querer o confortável e o desktop o compacto. Fica em
   localStorage (rama.pref.densidade), sem conta, sem servidor, sem
   ficha. Uma troca em outra aba deste navegador chega aqui também.

   TROCAR É SÓ UM ATRIBUTO
   Nada é redesenhado: campos preenchidos, alterações não salvas,
   filtros, abas, seções abertas e o foco continuam onde estão. O lugar
   na página é guardado e devolvido como na troca de estilo
   (RAMAInterface.guardarLugar / voltarAoLugar).
   ===================================================================== */

(function (global) {
  "use strict";

  var CHAVE = "rama.pref.densidade";
  var DENSIDADES = ["confortavel", "compacta"];
  var PADRAO = "confortavel";
  var NOMES = { confortavel: "Confortável", compacta: "Compacta" };
  var doc = global.document;
  var ouvintes = [];

  function valida(v) { return DENSIDADES.indexOf(v) >= 0; }

  function ler() {
    try {
      var v = global.localStorage ? global.localStorage.getItem(CHAVE) : null;
      return valida(v) ? v : PADRAO;
    } catch (e) { return PADRAO; }
  }

  function gravar(v) {
    try { if (global.localStorage) global.localStorage.setItem(CHAVE, v); } catch (e) { /* segue sem guardar */ }
  }

  function atual() {
    var raiz = doc && doc.documentElement;
    var v = raiz ? raiz.getAttribute("data-densidade") : null;
    return valida(v) ? v : PADRAO;
  }

  function pintar(v) {
    var raiz = doc && doc.documentElement;
    if (!raiz) return;
    var nova = valida(v) ? v : PADRAO;
    if (raiz.getAttribute("data-densidade") === nova) return;
    var I = global.RAMAInterface;
    var lugar = doc.body && I && I.guardarLugar ? I.guardarLugar() : null;
    raiz.setAttribute("data-densidade", nova);
    if (lugar && I.voltarAoLugar) I.voltarAoLugar(lugar);
    ouvintes.forEach(function (fn) { try { fn(nova); } catch (e) { /* um ouvinte não derruba os outros */ } });
  }

  /* Escolha da pessoa: grava neste aparelho e aplica na hora. */
  function definir(v) {
    var nova = valida(v) ? v : PADRAO;
    gravar(nova);
    pintar(nova);
    return nova;
  }

  function aoMudar(fn) { if (typeof fn === "function") ouvintes.push(fn); }

  /* Antes da primeira pintura. */
  pintar(ler());

  /* Outra aba deste navegador trocou a densidade. */
  if (global.addEventListener) {
    global.addEventListener("storage", function (ev) {
      if (ev && ev.key === CHAVE) pintar(valida(ev.newValue) ? ev.newValue : PADRAO);
    });
  }

  global.RAMADensidade = {
    CHAVE: CHAVE,
    DENSIDADES: DENSIDADES.slice(),
    PADRAO: PADRAO,
    NOMES: NOMES,
    atual: atual,
    preferencia: ler,
    definir: definir,
    aoMudar: aoMudar,
  };
})(typeof window !== "undefined" ? window : globalThis);
