/* =====================================================================
   R.A.M.A. — utilidades
   ---------------------------------------------------------------------
   O que não pertence a nenhum módulo específico e é usado por todos:
   identificadores, datas, números, DOM e comparação.

   Regra para entrar aqui: ser usado por pelo menos dois módulos e não
   ter dono natural. Isto não é um depósito de funções órfãs.
   ===================================================================== */

(function (global) {
  "use strict";

  /* =================================================================
     IDENTIFICADORES
     -----------------------------------------------------------------
     Todo registro que persiste nasce com um id que não muda nunca.
     Nome muda, posição na lista muda, linha da planilha muda — o id
     não. É o que permite renomear e reordenar sem quebrar referência.
     ================================================================= */

  function uuid() {
    if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID();
    /* Navegador antigo: 16 bytes do gerador criptográfico montados à mão
       na forma v4. Math.random ficaria de fora — id previsível é id que
       colide. */
    var b = new Uint8Array(16);
    (global.crypto || global.msCrypto).getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    var h = [];
    for (var i = 0; i < 16; i++) h.push(b[i].toString(16).padStart(2, "0"));
    return h.slice(0, 4).join("") + "-" + h.slice(4, 6).join("") + "-" +
           h.slice(6, 8).join("") + "-" + h.slice(8, 10).join("") + "-" +
           h.slice(10, 16).join("");
  }

  /* Código curto e legível para mostrar na interface (REGISTRO // 2F91A).
     É enfeite derivado do id, não identidade: nunca use para procurar. */
  function codigoCurto(id) {
    var texto = String(id || "");
    var soma = 5381;
    for (var i = 0; i < texto.length; i++) soma = ((soma * 33) ^ texto.charCodeAt(i)) >>> 0;
    return soma.toString(16).toUpperCase().padStart(5, "0").slice(-5);
  }

  /* =================================================================
     DATAS
     -----------------------------------------------------------------
     No banco tudo é ISO em UTC. Na tela tudo é horário local de quem
     está olhando, no formato brasileiro. A conversão acontece só aqui.
     ================================================================= */

  function agoraISO() { return new Date().toISOString(); }

  function paraData(valor) {
    if (!valor) return null;
    if (valor instanceof Date) return isNaN(valor.getTime()) ? null : valor;
    var d = new Date(valor);
    return isNaN(d.getTime()) ? null : d;
  }

  function dataCurta(valor) {
    var d = paraData(valor);
    if (!d) return "—";
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  function horaCurta(valor) {
    var d = paraData(valor);
    if (!d) return "";
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  function dataHora(valor) {
    var d = paraData(valor);
    if (!d) return "—";
    return dataCurta(d) + " " + horaCurta(d);
  }

  /* "agora", "há 5 min", "há 2 h", "há 3 d" — o suficiente para o
     indicador de sincronização sem virar biblioteca de datas. */
  function haQuanto(quando) {
    var d = paraData(quando);
    if (!d) return "";
    var s = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
    if (s < 45) return "agora";
    if (s < 3600) return "há " + Math.round(s / 60) + " min";
    if (s < 86400) return "há " + Math.round(s / 3600) + " h";
    return "há " + Math.round(s / 86400) + " d";
  }

  /* =================================================================
     NÚMEROS
     -----------------------------------------------------------------
     Campo de texto devolve string, e string vazia vira NaN. Toda
     entrada numérica passa por aqui antes de virar dado.
     ================================================================= */

  function inteiro(valor, padrao) {
    var n = parseInt(valor, 10);
    return Number.isFinite(n) ? n : (padrao === undefined ? 0 : padrao);
  }

  function numero(valor, padrao) {
    if (typeof valor === "number") return Number.isFinite(valor) ? valor : (padrao || 0);
    var texto = String(valor === undefined || valor === null ? "" : valor).trim().replace(",", ".");
    var n = parseFloat(texto);
    return Number.isFinite(n) ? n : (padrao === undefined ? 0 : padrao);
  }

  function limitar(n, minimo, maximo) {
    return Math.min(maximo, Math.max(minimo, n));
  }

  /* Peso aceita meio quilo, mas não aceita dízima infinita na tela. */
  function peso(valor) {
    var n = Math.max(0, numero(valor, 0));
    return Math.round(n * 100) / 100;
  }

  function comSinal(n) {
    var v = numero(n, 0);
    return (v >= 0 ? "+" : "") + v;
  }

  /* =================================================================
     TEXTO
     ================================================================= */

  function texto(valor) {
    return String(valor === undefined || valor === null ? "" : valor);
  }

  function aparar(valor, limite) {
    var t = texto(valor).trim();
    return limite ? t.slice(0, limite) : t;
  }

  /* Sem acento e em minúsculas: é assim que a busca compara, para
     "Percepção" ser encontrado por "percepcao". */
  function chaveDeBusca(valor) {
    return texto(valor)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  /* =================================================================
     ETIQUETA COLORIDA
     -----------------------------------------------------------------
     A etiqueta abaixo do nome de uma habilidade ou item ("ENERGIA" em
     roxo). É APRESENTAÇÃO: nenhuma regra lê o texto dela. Tem dados
     próprios — { texto, cor } — e não reaproveita a cor de contorno da
     habilidade, a categoria do item nem o elemento de um poder.

     Texto vazio = sem etiqueta (null). A cor é sempre um hexadecimal de
     seis dígitos; qualquer outra coisa vira a cor padrão. O texto nunca
     vira HTML (é pintado com textContent) e a cor nunca vira CSS por
     concatenação (vai por style.setProperty, já validada).
     ================================================================= */

  var ETIQUETA_LIMITE = 32;
  var ETIQUETA_COR_PADRAO = "#7E6BB5";
  var CORES_ETIQUETA = [
    { nome: "Roxo", valor: "#7E6BB5" },
    { nome: "Vermelho", valor: "#A33B3B" },
    { nome: "Laranja", valor: "#C2702E" },
    { nome: "Amarelo", valor: "#D8B43A" },
    { nome: "Verde", valor: "#4F8A4B" },
    { nome: "Azul", valor: "#3B6EA3" },
    { nome: "Cinza", valor: "#6B6B73" },
    { nome: "Branco", valor: "#E6E6EA" },
  ];

  function corDeEtiqueta(valor) {
    var v = aparar(valor, 7);
    if (/^#[0-9a-fA-F]{6}$/.test(v)) return v.toUpperCase();
    if (/^#[0-9a-fA-F]{3}$/.test(v)) {
      return ("#" + v[1] + v[1] + v[2] + v[2] + v[3] + v[3]).toUpperCase();
    }
    return "";
  }

  function normalizarEtiqueta(valor) {
    if (!valor || typeof valor !== "object") return null;
    /* Sem quebra de linha nem caractere de controle: é uma etiqueta de
       uma linha só. */
    var t = texto(valor.texto).replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, ETIQUETA_LIMITE);
    if (!t) return null;
    return { texto: t, cor: corDeEtiqueta(valor.cor) || ETIQUETA_COR_PADRAO };
  }

  /* Preto ou branco, o que tiver mais contraste com o fundo (luminância
     relativa do WCAG). */
  function corDoTextoSobre(fundo) {
    var hex = corDeEtiqueta(fundo) || ETIQUETA_COR_PADRAO;
    var canal = function (i) {
      var c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    var l = 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5);
    var contrasteBranco = 1.05 / (l + 0.05);
    var contrastePreto = (l + 0.05) / 0.05;
    return contrastePreto >= contrasteBranco ? "#08080A" : "#FFFFFF";
  }

  function iniciais(nome) {
    var partes = texto(nome).trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return "?";
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  }

  /* =================================================================
     CÓPIA E COMPARAÇÃO
     -----------------------------------------------------------------
     A comparação é canônica: "3" e 3 são o mesmo número, e a ordem das
     chaves de um objeto não muda o que ele é. Sem isto o sistema
     acusaria conflito de sincronização onde não existe nenhum.
     ================================================================= */

  function copiar(valor) {
    if (valor === undefined || valor === null) return valor;
    if (global.structuredClone) {
      try { return global.structuredClone(valor); } catch (e) { /* cai no JSON */ }
    }
    return JSON.parse(JSON.stringify(valor));
  }

  function vazio(v) { return v === undefined || v === null || v === ""; }

  function canonico(v) {
    if (vazio(v)) return "";
    if (typeof v === "number") return "n:" + v;
    if (typeof v === "boolean") return "b:" + v;
    if (typeof v === "string") {
      var t = v.trim();
      if (t !== "" && /^-?\d+(\.\d+)?$/.test(t)) return "n:" + Number(t);
      return "s:" + t;
    }
    if (Array.isArray(v)) return "a:[" + v.map(canonico).join(",") + "]";
    if (typeof v === "object") {
      var chaves = Object.keys(v).filter(function (k) { return !vazio(v[k]); }).sort();
      return "o:{" + chaves.map(function (k) { return k + ":" + canonico(v[k]); }).join(",") + "}";
    }
    return "s:" + String(v);
  }

  function iguais(a, b) { return canonico(a) === canonico(b); }

  /* =================================================================
     LISTAS
     ================================================================= */

  function porId(lista, id) {
    var alvo = String(id);
    return (lista || []).find(function (r) { return r && String(r.id) === alvo; }) || null;
  }

  function indiceDe(lista, id) {
    var alvo = String(id);
    return (lista || []).findIndex(function (r) { return r && String(r.id) === alvo; });
  }

  function indexar(lista, chave) {
    var mapa = {};
    (lista || []).forEach(function (r) {
      if (r && !vazio(r[chave || "id"])) mapa[String(r[chave || "id"])] = r;
    });
    return mapa;
  }

  /* =================================================================
     DOM
     -----------------------------------------------------------------
     Um construtor pequeno, para o JavaScript montar o que é conteúdo
     sem escrever HTML em string. Markup que é estrutura da página
     continua no .html; o que nasce de dado nasce aqui.
     ================================================================= */

  function $(seletor, raiz) { return (raiz || document).querySelector(seletor); }
  function $$(seletor, raiz) { return Array.prototype.slice.call((raiz || document).querySelectorAll(seletor)); }

  /* el("div.classe", { attrs }, [filhos]) — atributos com nome real
     (class, aria-label), e dataset/eventos por chave especial. */
  function el(descricao, atributos, filhos) {
    var partes = String(descricao).split(".");
    var tag = partes.shift() || "div";
    var node = document.createElement(tag);
    if (partes.length) node.className = partes.join(" ");

    var a = atributos || {};
    Object.keys(a).forEach(function (chave) {
      var valor = a[chave];
      if (valor === undefined || valor === null || valor === false) return;

      if (chave === "class") { node.className = (node.className + " " + valor).trim(); return; }
      if (chave === "texto") { node.textContent = valor; return; }
      if (chave === "html")  { node.innerHTML = valor; return; }   // só para SVG interno confiável
      if (chave === "dataset") {
        Object.keys(valor).forEach(function (d) { node.dataset[d] = valor[d]; });
        return;
      }
      if (chave === "estilo") { Object.assign(node.style, valor); return; }
      if (chave.indexOf("on") === 0 && typeof valor === "function") {
        node.addEventListener(chave.slice(2).toLowerCase(), valor);
        return;
      }
      if (valor === true) { node.setAttribute(chave, ""); return; }
      node.setAttribute(chave, String(valor));
    });

    anexar(node, filhos);
    return node;
  }

  function anexar(pai, filhos) {
    if (filhos === undefined || filhos === null || filhos === false) return pai;
    if (Array.isArray(filhos)) {
      filhos.forEach(function (f) { anexar(pai, f); });
      return pai;
    }
    pai.appendChild(filhos instanceof Node ? filhos : document.createTextNode(String(filhos)));
    return pai;
  }

  function limpar(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  function trocar(node, filhos) {
    limpar(node);
    return anexar(node, filhos);
  }

  /* SVG precisa de namespace; sem isto o navegador cria um elemento HTML
     com nome de tag SVG, que não desenha nada. */
  function svg(nome, atributos, filhos) {
    var node = document.createElementNS("http://www.w3.org/2000/svg", nome);
    var a = atributos || {};
    Object.keys(a).forEach(function (k) { node.setAttribute(k, String(a[k])); });
    (Array.isArray(filhos) ? filhos : [filhos]).forEach(function (f) {
      if (f instanceof Node) node.appendChild(f);
    });
    return node;
  }

  /* =================================================================
     TEMPO
     ================================================================= */

  function esperar(ms) {
    return new Promise(function (ok) { setTimeout(ok, ms); });
  }

  function debounce(fn, ms) {
    var timer = null;
    return function () {
      var args = arguments, self = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(self, args); }, ms);
    };
  }

  /* =================================================================
     ENDEREÇO
     -----------------------------------------------------------------
     O site é publicado debaixo de uma pasta no GitHub Pages
     (usuario.github.io/rama/), então nada pode usar caminho absoluto.
     A raiz é descoberta a partir do próprio <script src>.
     ================================================================= */

  var RAIZ = (function () {
    var atual = document.currentScript;
    if (atual && atual.src) {
      /* .../js/util.js  ->  .../ */
      return atual.src.replace(/js\/util\.js.*$/, "");
    }
    return "./";
  })();

  function raiz() { return RAIZ; }

  function url(caminho) {
    return RAIZ + String(caminho || "").replace(/^\//, "");
  }

  function parametro(nome) {
    return new URLSearchParams(location.search).get(nome) || "";
  }

  global.RAMAUtil = {
    uuid: uuid,
    codigoCurto: codigoCurto,
    agoraISO: agoraISO,
    paraData: paraData,
    dataCurta: dataCurta,
    horaCurta: horaCurta,
    dataHora: dataHora,
    haQuanto: haQuanto,
    inteiro: inteiro,
    numero: numero,
    limitar: limitar,
    peso: peso,
    comSinal: comSinal,
    texto: texto,
    aparar: aparar,
    chaveDeBusca: chaveDeBusca,
    ETIQUETA_LIMITE: ETIQUETA_LIMITE,
    ETIQUETA_COR_PADRAO: ETIQUETA_COR_PADRAO,
    CORES_ETIQUETA: CORES_ETIQUETA,
    corDeEtiqueta: corDeEtiqueta,
    normalizarEtiqueta: normalizarEtiqueta,
    corDoTextoSobre: corDoTextoSobre,
    iniciais: iniciais,
    copiar: copiar,
    vazio: vazio,
    canonico: canonico,
    iguais: iguais,
    porId: porId,
    indiceDe: indiceDe,
    indexar: indexar,
    $: $,
    $$: $$,
    el: el,
    anexar: anexar,
    limpar: limpar,
    trocar: trocar,
    svg: svg,
    esperar: esperar,
    debounce: debounce,
    raiz: raiz,
    url: url,
    parametro: parametro,
  };
})(window);
