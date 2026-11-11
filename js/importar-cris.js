/* =====================================================================
   R.A.M.A. — conversão de ficha pública do CRIS (v2.34)
   ---------------------------------------------------------------------
   O CONVERSOR. Recebe o retrato que `ler_ficha_cris` devolveu (adaptador
   cris-firestore-v1: fonte, ficha, resumo, avisos) e monta uma ficha de
   Ordem do R.A.M.A. com as fábricas, os catálogos e o motor de regras
   do próprio R.A.M.A. Não toca no DOM, não faz pedido ao servidor e não
   grava nada: quem cria a ficha é a tela (js/importar-cris-tela.js),
   pela criação de sempre.

     converter(retrato, decisoes, dependencias)
       → { ok, ficha, avisos, pendencias, comparacao, preservadosComoTexto,
           resumo, bloqueado }

   ---------------------------------------------------------------------
   AS DECISÕES QUE ESTE ARQUIVO TOMA
   ---------------------------------------------------------------------
   1. O ESTADO ATUAL É A BASE. O CRIS diz como a ficha está, não como ela
      chegou lá. Atributos e graus viram os valores do marco de
      importação (`ordem.importacao.marco`); as etapas até ali ficam como
      histórico indisponível na progressão — nada é inventado.
   2. CALCULAR, COMPARAR, AJUSTAR SÓ O RESÍDUO. Item reconhecido nasce
      da base do catálogo com as modificações reconhecidas; o motor
      calcula; só a diferença para o valor observado vira ajuste, com
      motivo. Nunca o valor final como base nova.
   3. AMBIGUIDADE VIRA REVISÃO, NÃO PALPITE. Trilha inferida, arma
      favorita, procedência de um poder, identificação parcial de item,
      elemento de ritual: a prévia mostra, a pessoa decide (em grupo,
      sem uma confirmação por linha).
   4. TEXTO DE FORA É TEXTO. HTML vira texto puro, por um analisador
      restrito; expressão de dano passa por um analisador de termos —
      sem eval, sem innerHTML.
   ===================================================================== */

(function (global) {
  "use strict";

  var ADAPTADOR = "cris-firestore-v1";
  var LINK = /^https:\/\/crisordemparanormal\.com\/agente\/([A-Za-z0-9_-]{1,128})\/?(?:[?#][^\s]*)?$/i;

  /* ---------------------------------------------------------------- link */

  function validarLink(texto) {
    var t = typeof texto === "string" ? texto.trim() : "";
    if (!t || t.length > 2048) return { ok: false, erro: "cris_url_invalida", mensagem: MENSAGENS.cris_url_invalida };
    var m = LINK.exec(t);
    if (!m) return { ok: false, erro: "cris_url_invalida", mensagem: MENSAGENS.cris_url_invalida };
    return { ok: true, documentId: m[1], url: "https://crisordemparanormal.com/agente/" + m[1] };
  }

  var MENSAGENS = {
    cris_url_invalida: "Use o link público da ficha, no formato https://crisordemparanormal.com/agente/ID.",
    cris_nao_encontrada: "Não existe ficha com esse link no CRIS. Confira o endereço.",
    cris_acesso_negado: "O CRIS negou o acesso a essa ficha. Ela precisa estar pública.",
    cris_nao_publica: "Essa ficha não está pública no CRIS. Torne-a pública lá e tente de novo.",
    cris_limite_temporario: "Muitas consultas em pouco tempo. Espere alguns minutos e tente de novo.",
    cris_indisponivel: "O CRIS não respondeu agora. Tente de novo em instantes.",
    cris_resposta_invalida: "O CRIS respondeu algo que não é uma ficha. Tente de novo mais tarde.",
    cris_formato_incompativel: "O formato da ficha no CRIS mudou ou está incompleto. A importação por arquivo continua disponível.",
    cris_sem_autorizacao: "O servidor do R.A.M.A. ainda não tem permissão para acessar sites externos. Quem administra precisa abrir o Apps Script, executar uma função qualquer (ex.: ping) para autorizar e criar uma nova versão da implantação.",
    cris_limite_excedido: "A ficha passa dos limites de leitura (tamanho, quantidade ou profundidade).",
    acao_desconhecida: "O servidor do R.A.M.A. ainda não tem a leitura do CRIS. Peça para quem administra atualizar o Apps Script (Cris.gs e Codigo.gs).",
    sessao_invalida: "Sua sessão expirou. Entre de novo.",
  };

  function mensagemDeErro(r) {
    var codigo = r && r.erro;
    if (codigo && MENSAGENS[codigo]) return MENSAGENS[codigo];
    if (r && r.mensagem) return String(r.mensagem);
    return "Não foi possível consultar a ficha agora.";
  }

  /* ---------------------------------------------------------------- texto */

  var ENTIDADES = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…", laquo: "«", raquo: "»" };

  /* HTML → texto, sem DOM e sem executar nada: scripts e estilos somem
     com o conteúdo; parágrafos, quebras e itens de lista viram linhas. */
  function textoSeguro(html, limite) {
    var s = String(html === undefined || html === null ? "" : html);
    s = s.replace(/<(script|style|iframe|object|embed|noscript|template)\b[\s\S]*?<\/\1\s*>/gi, " ");
    s = s.replace(/<!--[\s\S]*?-->/g, " ");
    s = s.replace(/<\s*br\s*\/?>/gi, "\n");
    s = s.replace(/<\s*li\b[^>]*>/gi, "\n• ");
    s = s.replace(/<\/\s*li\s*>/gi, "");
    s = s.replace(/<\/\s*(p|div|ul|ol|h[1-6]|blockquote|tr|table|section)\s*>/gi, "\n\n");
    s = s.replace(/<[^>]*>/g, "");
    s = s.replace(/&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z]{2,8});/gi, function (m, c) {
      if (c[0] === "#") {
        var n = c[1] === "x" || c[1] === "X" ? parseInt(c.slice(2), 16) : parseInt(c.slice(1), 10);
        return isFinite(n) && n > 31 && n < 0x110000 && !(n >= 0xD800 && n <= 0xDFFF) ? String.fromCodePoint(n) : " ";
      }
      return ENTIDADES[c.toLowerCase()] !== undefined ? ENTIDADES[c.toLowerCase()] : m;
    });
    s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ");
    s = s.split("\n").map(function (l) { return l.replace(/[ \t ]+/g, " ").trim(); }).join("\n");
    s = s.replace(/\n{3,}/g, "\n\n").trim();
    if (limite && s.length > limite) s = s.slice(0, limite - 1).trimEnd() + "…";
    return s;
  }

  /* ---------------------------------------------------------------- expressões */

  /* Só dados, constantes, + e −. "2d4+1d8+2" → termos. Nada é avaliado. */
  function analisarExpressao(texto) {
    var t = String(texto === undefined || texto === null ? "" : texto).toLowerCase().replace(/\s+/g, "");
    if (!t) return { ok: true, texto: "", termos: [] };
    if (t.length > 200 || !/^[+-]?(?:\d+d\d+|\d+)(?:[+-](?:\d+d\d+|\d+))*$/.test(t)) return { ok: false, texto: t, termos: [] };
    var partes = t.match(/[+-]?(?:\d+d\d+|\d+)/g) || [];
    if (partes.length > 30) return { ok: false, texto: t, termos: [] };
    var termos = [];
    for (var i = 0; i < partes.length; i++) {
      var m = /^([+-]?)(\d+)d(\d+)$/.exec(partes[i]);
      if (m) {
        var q = Number(m[2]), f = Number(m[3]);
        if (q < 1 || q > 100 || f < 2 || f > 1000) return { ok: false, texto: t, termos: [] };
        termos.push({ tipo: "dados", quantidade: q, faces: f, negativo: m[1] === "-" });
      } else {
        var n = Number(partes[i]);
        if (!isFinite(n) || Math.abs(n) > 100000) return { ok: false, texto: t, termos: [] };
        termos.push({ tipo: "constante", valor: n });
      }
    }
    return { ok: true, texto: t, termos: termos };
  }

  function montarExpressao(dados, constante) {
    var s = dados.filter(function (d) { return d.quantidade > 0; }).map(function (d) { return d.quantidade + "d" + d.faces; }).join("+");
    if (constante) s += (constante > 0 ? (s ? "+" : "") : "-") + Math.abs(constante);
    return s || "0";
  }

  /* ---------------------------------------------------------------- busca */

  function chaveDeTexto(s) {
    var t = String(s === undefined || s === null ? "" : s);
    if (t.normalize) t = t.normalize("NFD").replace(/[̀-ͯ]/g, "");
    t = t.toLowerCase().replace(/^\s*nex\s*\d{1,2}\s*%?\s*[-–—:]\s*/, "");
    return t.replace(/[^a-z0-9]+/g, " ").trim();
  }

  var ATRIBUTO_POR_TEXTO = {
    "for": "for", "forca": "for", "str": "for", "agi": "agi", "agilidade": "agi", "dex": "agi",
    "int": "int", "intelecto": "int", "pre": "pre", "presenca": "pre", "vig": "vig", "vigor": "vig", "con": "vig",
  };
  function atributoDeTexto(s) { return ATRIBUTO_POR_TEXTO[chaveDeTexto(s)] || ""; }

  var GRAU_POR_TREINO = { "0": "destreinado", "5": "treinado", "10": "veterano", "15": "expert" };
  var ROMANOS = { "0": 0, "i": 1, "ii": 2, "iii": 3, "iv": 4, "v": 5, "vi": 6, "vii": 7 };
  var ELEMENTO_POR_TEXTO = { sangue: "sangue", morte: "morte", conhecimento: "conhecimento", energia: "energia", medo: "medo", varia: "varia" };

  function numeroOuNulo(v) {
    if (v === undefined || v === null) return null;
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v === "string" && v.trim() !== "" && isFinite(Number(v))) return Number(v);
    return null;
  }
  function romanoOuNulo(v) {
    if (v === undefined || v === null) return null;
    var k = String(v).trim().toLowerCase();
    if (ROMANOS[k] !== undefined) return ROMANOS[k];
    var n = numeroOuNulo(v);
    return n === null ? null : Math.round(n);
  }
  function rotuloRomano(n) { return ["0", "I", "II", "III", "IV", "V", "VI", "VII"][n] || String(n); }

  /* ------------------------------------------------- o assistente (v7.2)
     As seções seguem a ficha de Ordem. Uma entrada está conferida quando a
     assinatura confirmada é a atual: se um recálculo muda o resultado
     dela, a confirmação deixa de valer e ela volta para a revisão. */
  var SECOES = [
    { chave: "identidade", titulo: "Identidade e progressão" },
    { chave: "atributos", titulo: "Atributos" },
    { chave: "pericias", titulo: "Perícias" },
    { chave: "recursos", titulo: "Recursos e defesas" },
    { chave: "inventario", titulo: "Inventário e ataques" },
    { chave: "poderes", titulo: "Poderes e habilidades" },
    { chave: "rituais", titulo: "Rituais e anotações" },
  ];
  var CONFIRMAVEIS = { sugerido: true, escolhido: true };

  function podeConfirmar(e) { return !!(e && CONFIRMAVEIS[e.estado]); }

  function situacao(entradas, confirmados) {
    var c = confirmados || {};
    var porSecao = {};
    SECOES.forEach(function (s) { porSecao[s.chave] = { total: 0, conferidas: 0, sugeridas: 0, semDestino: 0 }; });
    var pendentes = [];
    var sugeridas = 0, semDestino = 0;
    (entradas || []).forEach(function (e) {
      var ps = porSecao[e.secao] || (porSecao[e.secao] = { total: 0, conferidas: 0, sugeridas: 0, semDestino: 0 });
      ps.total++;
      if (c[e.chave] === e.assinatura) { ps.conferidas++; return; }
      pendentes.push(e.chave);
      if (podeConfirmar(e)) { ps.sugeridas++; sugeridas++; } else { ps.semDestino++; semDestino++; }
    });
    var total = (entradas || []).length;
    return { total: total, conferidas: total - pendentes.length, pendentes: pendentes, sugeridas: sugeridas, semDestino: semDestino, porSecao: porSecao, pronto: total > 0 && !pendentes.length };
  }

  /* "Confirmar as sugestões desta seção": só as que têm destino. Sem
     destino e conflito continuam pedindo decisão. */
  function confirmaveisDaSecao(entradas, confirmados, secao) {
    var c = confirmados || {};
    return (entradas || []).filter(function (e) { return e.secao === secao && c[e.chave] !== e.assinatura && podeConfirmar(e); });
  }
  function confirmarSecao(entradas, confirmados, secao) {
    var novo = Object.assign({}, confirmados || {});
    confirmaveisDaSecao(entradas, confirmados, secao).forEach(function (e) { novo[e.chave] = e.assinatura; });
    return novo;
  }

  /* Depois de recalcular: o que estava conferido e mudou volta para a
     revisão, com o antes e o depois. O resto continua conferido. */
  function reconciliarConfirmacoes(antigas, novas, confirmados) {
    var c = confirmados || {};
    var antes = {};
    (antigas || []).forEach(function (e) { antes[e.chave] = e; });
    var mantidos = {};
    var voltaram = [];
    (novas || []).forEach(function (e) {
      if (c[e.chave] === undefined) return;
      if (c[e.chave] === e.assinatura) { mantidos[e.chave] = c[e.chave]; return; }
      var a = antes[e.chave];
      voltaram.push({ chave: e.chave, rotulo: e.rotulo, secao: e.secao, antes: a ? a.rama : "", depois: e.rama, destinoAntes: a ? a.rotuloDestino : "", destinoDepois: e.rotuloDestino, estado: e.estado });
    });
    return { confirmados: mantidos, voltaram: voltaram };
  }

  /* Destinos compatíveis para o seletor "O que é isso na sua ficha?":
     os prováveis primeiro (nome, apelido, tipo, círculo, elemento), e a
     busca alcança o resto do catálogo e da Homebrew acessível. */
  function sugerirDestinos(entrada, consulta, fontes) {
    var f = fontes || {};
    var e = entrada || {};
    var dc = e.dadosCris || {};
    var q = chaveDeTexto(consulta);
    var alvo = chaveDeTexto(dc.nome || e.rotulo);
    var preferidos = {};
    (e.candidatos || []).concat(e.candidatosHomebrew || []).forEach(function (id) { preferidos[id] = true; });
    var hb = f.homebrew || {};
    var saida = [];
    function pontos(nome, alias) {
      var melhor = 0;
      [nome].concat(alias || []).forEach(function (n) {
        var k = chaveDeTexto(n);
        if (!k || !alvo) return;
        var p = 0;
        if (k === alvo) p = 100;
        else if (alvo.indexOf(k) >= 0 || k.indexOf(alvo) >= 0) p = 60;
        else {
          var ta = alvo.split(" ").filter(function (w) { return w.length > 2; });
          var tb = k.split(" ");
          var comuns = ta.filter(function (w) { return tb.indexOf(w) >= 0; }).length;
          p = comuns ? 20 + Math.round(30 * comuns / ta.length) : 0;
        }
        if (p > melhor) melhor = p;
      });
      return melhor;
    }
    function casa(nome, alias) {
      if (!q) return true;
      return [nome].concat(alias || []).some(function (n) { return chaveDeTexto(n).indexOf(q) >= 0; });
    }
    function add(x, nome, alias, bonus) {
      if (!casa(nome, alias)) return;
      x.afinidade = pontos(nome, alias) + (preferidos[x.id] ? 80 : 0);
      x.pontos = x.afinidade + (bonus || 0);
      x.nome = nome;
      saida.push(x);
    }
    function deHomebrew(lista, filtro, detalhe) {
      (lista || []).forEach(function (h) {
        if (!h || (filtro && !filtro(h))) return;
        add({ tipo: "homebrew", id: h.id, registro: h, grupo: h.meu ? "Homebrew · minhas criações" : "Homebrew · públicos", detalhe: detalhe(h) }, h.nome, null, h.meu ? 5 : 0);
      });
    }
    var cat = f.catalogoItens;
    var fonteItem = function (x) { return f.ITM && f.ITM.ROTULO_FONTE ? (f.ITM.ROTULO_FONTE[x.fonte] || x.fonte) : x.fonte; };
    if (e.tipo === "item" && cat) {
      cat.itens.forEach(function (x) {
        if (x.natureza === "item") {
          var compat = dc.tipoItem === "arma" ? x.tipoItem === "arma" : dc.tipoItem === "armadura" ? x.tipoItem === "armadura" : (x.tipoItem !== "arma" && x.tipoItem !== "armadura");
          add({ tipo: "catalogo", id: x.id, grupo: "Catálogo", detalhe: (x.tipoItem === "arma" ? "arma" : x.tipoItem === "armadura" ? "proteção" : "item") + (typeof x.categoria === "number" ? " · cat. " + rotuloRomano(x.categoria) : "") + " · " + fonteItem(x), compativel: compat }, x.nome, x.alias, compat ? 15 : -10);
        } else if (x.natureza === "modificacao" || x.natureza === "maldicao") {
          add({ tipo: "modificacao", id: x.id, grupo: "Aplicar a um item da ficha", detalhe: (x.natureza === "maldicao" ? "maldição" : "modificação") + " · " + fonteItem(x) }, x.nome, x.alias, -5);
        }
      });
      deHomebrew(hb.itens, null, function (h) { return h.tipo + (h.categoria ? " · " + h.categoria : ""); });
    } else if (e.tipo === "mod" && cat) {
      cat.itens.forEach(function (x) {
        if (x.natureza !== "modificacao" && x.natureza !== "maldicao") return;
        var cabe = f.item && f.ITM ? f.ITM.podeAplicar(x, f.item).ok : true;
        add({ tipo: "catalogo", id: x.id, grupo: cabe ? "Cabe neste item" : "Outras (não cabem neste item)", detalhe: (x.natureza === "maldicao" ? "maldição" : "modificação") + " · " + fonteItem(x), compativel: cabe }, x.nome, x.alias, (cabe ? 15 : -30) + (x.natureza === dc.natureza ? 5 : 0));
      });
    } else if (e.tipo === "ritual" && f.catalogoRituais) {
      var elR = ELEMENTO_POR_TEXTO[chaveDeTexto(dc.elemento)];
      f.catalogoRituais.rituais.forEach(function (x) {
        var b = (dc.circulo !== null && dc.circulo !== undefined && x.circulo === dc.circulo ? 15 : 0) + (elR && x.elemento === elR ? 10 : 0);
        add({ tipo: "catalogo", id: x.id, grupo: "Catálogo", detalhe: x.circulo + "º círculo · " + (f.RS && f.RS.nomeDoElemento ? f.RS.nomeDoElemento(x.elemento) : x.elemento || "—") + " · " + x.fonte }, x.nome, null, b);
      });
      deHomebrew(hb.rituais, null, function (h) { return [h.circulo, h.elemento].filter(Boolean).join(" · ") || "ritual"; });
    } else if (e.tipo === "poder" && f.P) {
      var elP = ELEMENTO_POR_TEXTO[chaveDeTexto(dc.elemento)];
      f.P.TODOS.forEach(function (x) {
        if (["classe", "geral", "paranormal", "trilha", "automatica", "sacrificio", "intencao", "alteracao"].indexOf(x.tipo) < 0) return;
        add({ tipo: "catalogo", id: x.chave, grupo: "Catálogo", detalhe: x.tipo + (x.elemento ? " · " + x.elemento : "") + (x.fonte ? " · " + x.fonte : "") }, x.nome, null, elP && x.elemento === elP ? 10 : 0);
      });
      deHomebrew(hb.habilidades, null, function () { return "habilidade"; });
    } else if (e.tipo === "pericia" && f.C) {
      f.C.PERICIAS.forEach(function (x) { add({ tipo: "catalogo", id: x.chave, grupo: "Perícias do R.A.M.A.", detalhe: String(x.atributo || "").toUpperCase() }, x.nome, null, 0); });
    }
    saida.sort(function (a, b) { return (b.pontos - a.pontos) || String(a.nome).localeCompare(String(b.nome), "pt-BR"); });
    var lista = q ? saida.slice(0, 40) : saida.filter(function (x) { return x.afinidade > 0 && x.pontos > 0; }).slice(0, 8);
    /* Agrupado pela origem, na ordem do melhor de cada grupo. */
    var ordemGrupo = {};
    lista.forEach(function (x, n) { if (ordemGrupo[x.grupo] === undefined) ordemGrupo[x.grupo] = n; });
    return lista.map(function (x, n) { return { x: x, n: n }; })
      .sort(function (a, b) { return (ordemGrupo[a.x.grupo] - ordemGrupo[b.x.grupo]) || (a.n - b.n); })
      .map(function (y) { return y.x; });
  }

  /* ---------------------------------------------------------------- o conversor */

  /* dependencias: { F, R, C, P, E, H, ITM, RS, catalogoItens, catalogoRituais, U } */
  function converter(retrato, decisoesBrutas, deps) {
    var d = deps || {};
    var F = d.F, R = d.R, C = d.C, P = d.P, E = d.E, H = d.H, ITM = d.ITM, RS = d.RS, U = d.U;
    var catItens = d.catalogoItens, catRituais = d.catalogoRituais;
    var decisoes = decisoesBrutas && typeof decisoesBrutas === "object" ? decisoesBrutas : {};

    var avisos = [];
    var revisoes = [];
    var comparacao = [];
    var preservados = [];
    var observacoes = [];
    var ajustesDoc = [];
    var criticos = [];

    /* v7.2 — o assistente. `destinos` são as escolhas explícitas de cada
       entrada ("isto é aquele item do catálogo", "guardar em Anotações",
       "não importar"…); `vinculos` dizem a que arma cada ataque pertence.
       Chaves estáveis (ids do CRIS), nunca nomes: renomear não perde nada. */
    var destinos = decisoes.destinos && typeof decisoes.destinos === "object" ? decisoes.destinos : {};
    var vinculos = decisoes.vinculos && typeof decisoes.vinculos === "object" ? decisoes.vinculos : {};
    var HB = d.homebrew && typeof d.homebrew === "object" ? d.homebrew : {};
    var hbItens = Array.isArray(HB.itens) ? HB.itens : [];
    var hbRituais = Array.isArray(HB.rituais) ? HB.rituais : [];
    var hbHabilidades = Array.isArray(HB.habilidades) ? HB.habilidades : [];
    var metas = {};
    var ordemMetas = [];
    function meta(chave, dados) {
      if (!metas[chave]) { metas[chave] = { chave: chave }; ordemMetas.push(chave); }
      return Object.assign(metas[chave], dados || {});
    }
    var TIPOS_DESTINO = { catalogo: 1, homebrew: 1, personalizado: 1, anotacao: 1, ignorar: 1, modificacao: 1, texto: 1 };
    function destinoDe(chave) {
      var x = destinos[chave];
      return x && typeof x === "object" && TIPOS_DESTINO[x.tipo] ? x : null;
    }
    /* Texto que uma entrada mandou para Anotações: entra na pasta, mas não
       vira uma entrada nova da revisão (já é o destino de outra). */
    function paraAnotacao(chave, titulo, texto) {
      preservados.push({ titulo: String(titulo).slice(0, 110), texto: String(texto || "").slice(0, 40000) || "(sem texto no CRIS)", deEntrada: chave });
    }
    function textoDoHomebrew(reg) { return reg && reg.meu ? "Homebrew · minha criação" : "Homebrew · público"; }
    /* Nome idêntico na Homebrew acessível: as minhas criações primeiro. */
    function homebrewPorNome(lista, nome, filtro) {
      var k = chaveDeTexto(nome);
      if (!k) return [];
      var achados = lista.filter(function (h) { return h && chaveDeTexto(h.nome) === k && (!filtro || filtro(h)); });
      var meus = achados.filter(function (h) { return h.meu; });
      return meus.length ? meus : achados;
    }

    function aviso(codigo, gravidade, campo, texto) { avisos.push({ codigo: codigo, gravidade: gravidade, campo: campo, texto: texto }); }
    function revisao(chave, rotulo, texto, opcoes, padrao, extra) {
      var escolhido = decisoes[chave] !== undefined && opcoes.some(function (o) { return o.valor === decisoes[chave]; }) ? decisoes[chave] : padrao;
      var r = Object.assign({ chave: chave, rotulo: rotulo, texto: texto, opcoes: opcoes, padrao: padrao, valor: escolhido }, extra || {});
      revisoes.push(r);
      return escolhido;
    }
    function falhar(codigo, texto) {
      aviso(codigo, "erro", "", texto);
      return { ok: false, avisos: avisos, pendencias: revisoes, comparacao: comparacao, preservadosComoTexto: preservados, bloqueado: true };
    }

    if (!F || !R || !C || !P || !E || !ITM || !RS || !catItens || !catRituais) return falhar("dependencias", "Os catálogos do R.A.M.A. ainda não carregaram.");
    if (!retrato || typeof retrato !== "object" || retrato.adaptador !== ADAPTADOR) return falhar("cris_formato_incompativel", MENSAGENS.cris_formato_incompativel);
    var src = retrato.ficha;
    var fonte = retrato.fonte || {};
    if (!src || typeof src !== "object") return falhar("cris_formato_incompativel", MENSAGENS.cris_formato_incompativel);
    if (src.private !== false) return falhar("cris_nao_publica", MENSAGENS.cris_nao_publica);
    var ref = validarLink(fonte.url || "");
    if (!ref.ok || ref.documentId !== fonte.documentId) return falhar("cris_formato_incompativel", "A leitura não corresponde ao link pedido.");
    var attrs = src.attributes && typeof src.attributes === "object" ? src.attributes : null;
    if (!attrs) return falhar("cris_formato_incompativel", "A ficha não traz os atributos.");

    /* ---------- identidade ---------- */
    var nomeOriginal = String(src.name || "").trim() || "Personagem do CRIS";
    var ficha = F.criarFicha({ tipoFicha: "ordem", nome: nomeOriginal });
    if (nomeOriginal.length > 80) aviso("nome_cortado", "informacao", "name", "O nome tem mais de 80 caracteres: a ficha guarda os 80 primeiros e o nome inteiro vai nas anotações.");
    var o = ficha.ordem;

    /* ---------- classe e origem ---------- */
    var classeAchada = C.CLASSES.filter(function (c) { return chaveDeTexto(c.nome) === chaveDeTexto(src.className); })[0];
    var opcoesClasse = C.CLASSES.map(function (c) { return { valor: c.chave, rotulo: c.nome }; });
    var classe = classeAchada ? classeAchada.chave : "";
    if (!classeAchada || (src.statsClass && chaveDeTexto(src.statsClass) !== chaveDeTexto(src.className))) {
      classe = revisao("classe", "Classe", !classeAchada
        ? "A classe “" + (src.className || "—") + "” não existe no catálogo. Escolha a classe que a ficha usa."
        : "A classe é " + src.className + ", mas a tabela de estatísticas do CRIS é " + src.statsClass + ". Confirme a classe.",
        opcoesClasse, classe || opcoesClasse[0].valor);
    } else if (decisoes.classe && opcoesClasse.some(function (x) { return x.valor === decisoes.classe; })) classe = decisoes.classe;
    o.classe = classe;
    ficha.classe = (C.classe(classe) || {}).nome || "";

    var origemAchada = C.ORIGENS.filter(function (x) { return chaveDeTexto(x.nome) === chaveDeTexto(src.backgroundName) || x.chave === chaveDeTexto(src.backgroundName).replace(/ /g, ""); })[0];
    var origem = origemAchada ? origemAchada.chave : "";
    if (!origemAchada) {
      var opcoesOrigem = [{ valor: "", rotulo: "Sem origem do catálogo (manter só o nome em anotação)" }].concat(C.ORIGENS.map(function (x) { return { valor: x.chave, rotulo: x.nome }; }));
      origem = revisao("origem", "Origem", "A origem “" + (src.backgroundName || "—") + "” não está no catálogo. Escolha a correspondente ou mantenha só o nome.", opcoesOrigem, "");
      if (src.backgroundName) preservados.push({ titulo: "Origem no CRIS", texto: String(src.backgroundName), deEntrada: "id:origem" });
    }
    o.origem = origem;
    ficha.origem = origem ? C.origem(origem).nome : String(src.backgroundName || "").slice(0, 60);

    /* ---------- regras opcionais: só as que a ficha liga explicitamente ---------- */
    o.opcionais = {};
    if (src.isPdOn === true) o.opcionais.semSanidade = true;
    var porNivel = src.isNexLevelOn === true;
    if (porNivel) o.opcionais.nexExperiencia = true;
    if (src.isSobrevivendoAoHorror === true) aviso("sah_contexto", "informacao", "isSobrevivendoAoHorror", "A ficha usa conteúdo do Sobrevivendo ao Horror. Isso não liga nenhuma regra opcional: só “Jogando sem Sanidade” e “NEX & Experiência” vêm dos campos explícitos.");

    /* ---------- NEX, nível e estágio ---------- */
    var marco = { modo: "nex", nex: 0, nivel: null, estagio: null, degrau: 0 };
    var perfil = C.perfilDaClasse(classe);
    var nexTexto = String(src.nex === undefined || src.nex === null ? "" : src.nex);
    if (!porNivel) {
      var mNex = /^(\d{1,2})%?$/.exec(nexTexto.trim());
      if (!mNex) return falhar("cris_formato_incompativel", "O NEX da ficha (“" + nexTexto + "”) não é um número.");
      var nex = Number(mNex[1]);
      if (!R.nexValido || R.nexValido(nex) !== nex) {
        aviso("nex_fora_do_trilho", "revisao", "nex", "O NEX " + nex + "% não é um degrau do R.A.M.A.; a ficha usa " + R.nexValido(nex) + "%.");
        nex = R.nexValido(nex);
      }
      o.nex = perfil === "agente" ? nex : 0;
      marco.nex = o.nex;
      if (src.nexString !== undefined && String(src.nexString) !== nexTexto) observacoes.push("nexString do CRIS (" + src.nexString + ") é diferente do NEX atual; vale o NEX atual (" + nexTexto + ").");
    } else {
      /* O CRIS guarda a progressão em `nex` mesmo com NEX & Experiência:
         "55%" é o 11º passo, isto é, nível 11 (99% é o 20º). Um número
         sem % é lido como nível. */
      var mNiv = /^(\d{1,3})(%?)$/.exec(String(src.nex === undefined || src.nex === null ? "" : src.nex).trim());
      if (!mNiv) return falhar("cris_formato_incompativel", "O nível da ficha (“" + src.nex + "”) não é um número.");
      var nivel = mNiv[2] ? (Number(mNiv[1]) >= 99 ? 20 : Math.round(Number(mNiv[1]) / 5)) : Number(mNiv[1]);
      if (mNiv[2]) observacoes.push("NEX & Experiência: o CRIS guarda a progressão como " + src.nex + "; no R.A.M.A. isso é o nível " + Math.max(1, Math.min(20, nivel)) + ".");
      o.nivel = Math.max(1, Math.min(20, Math.round(nivel)));
      o.nivelDefinido = true;
      marco.modo = "nivel";
      marco.nivel = o.nivel;
      var exp = /^(\d{1,3})%$/.exec(String(src.nexString || "").trim());
      var nexExp = exp ? R.nexValido(Math.min(99, Number(exp[1]))) : null;
      if (exp && Number(exp[1]) > 99) observacoes.push("Exposição no CRIS: " + src.nexString + "; o R.A.M.A. vai até 99%.");
      if (nexExp === null) {
        nexExp = Number(revisao("exposicao", "NEX de exposição", "Com NEX & Experiência, o CRIS informa o nível (" + o.nivel + "), e o NEX de exposição não veio. Nível não é porcentagem: escolha a exposição.",
          [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 99].map(function (n) { return { valor: String(n), rotulo: n + "%" }; }), "5"));
      }
      o.nex = nexExp;
      marco.nex = nexExp;
    }
    if (perfil === "sobrevivente") {
      var est = Number(revisao("estagio", "Estágio do Sobrevivente", "O CRIS não informa o estágio do Sobrevivente. Escolha o estágio atual.",
        [1, 2, 3, 4, 5].map(function (n) { return { valor: String(n), rotulo: n + "º estágio" }; }), "1"));
      o.estagio = est;
      marco.modo = "estagio";
      marco.estagio = est;
    }

    /* ---------- atributos ---------- */
    [["for", "str"], ["agi", "dex"], ["int", "int"], ["pre", "pre"], ["vig", "con"]].forEach(function (p) {
      var v = numeroOuNulo(attrs[p[1]]);
      if (v === null) { aviso("atributo_ausente", "erro", "attributes." + p[1], "Atributo " + p[0].toUpperCase() + " ausente ou inválido."); return; }
      var n = Math.round(v);
      if (n < 0 || n > 5) aviso("atributo_fora", "revisao", "attributes." + p[1], p[0].toUpperCase() + " " + n + " passa do limite do R.A.M.A. (0 a 5): fica " + Math.max(0, Math.min(5, n)) + ".");
      o.atributos[p[0]] = Math.max(0, Math.min(5, n));
    });
    if (avisos.some(function (a) { return a.gravidade === "erro"; })) return falhar("atributos", "Atributos essenciais estão corrompidos.");

    /* ---------- poderes: reconhecimento ---------- */
    var poderes = Array.isArray(src.powers) ? src.powers : [];
    var nomesDePoderes = poderes.map(function (p) { return chaveDeTexto(p.name); });
    var porNome = {};
    P.TODOS.forEach(function (e) {
      if (["classe", "geral", "paranormal", "trilha", "automatica", "sacrificio", "intencao", "alteracao"].indexOf(e.tipo) < 0) return;
      (porNome[chaveDeTexto(e.nome)] = porNome[chaveDeTexto(e.nome)] || []).push(e);
    });

    /* ---------- trilha: sugestão pelas habilidades, nunca imposta ---------- */
    var trilhas = classe ? C.trilhasDaClasse(classe) : [];
    var evidencias = trilhas.map(function (tr) {
      var achadas = P.habilidadesDaTrilha(tr.chave).filter(function (h) { return nomesDePoderes.indexOf(chaveDeTexto(h.nome)) >= 0; });
      return { trilha: tr, achadas: achadas };
    }).filter(function (x) { return x.achadas.length; }).sort(function (a, b) { return b.achadas.length - a.achadas.length; });
    var sugerida = evidencias.length && (evidencias.length === 1 || evidencias[0].achadas.length > evidencias[1].achadas.length) ? evidencias[0].trilha : null;
    if (trilhas.length && perfil === "agente" && o.nex >= 10) {
      var opcoesTrilha = [{ valor: "", rotulo: "Sem trilha por enquanto (decidir na Progressão)" }].concat(trilhas.map(function (tr) { return { valor: tr.chave, rotulo: tr.nome }; }));
      o.trilha = revisao("trilha", "Trilha", sugerida
        ? "O CRIS não guarda a trilha. " + evidencias.map(function (x) { return x.trilha.nome + " (" + x.achadas.map(function (h) { return h.nome; }).join(", ") + ")"; }).join("; ") + ". Sugestão: " + sugerida.nome + "."
        : "O CRIS não guarda a trilha e nenhuma habilidade de trilha foi reconhecida. Escolha a trilha ou decida depois.",
        opcoesTrilha, sugerida ? sugerida.chave : "", { evidencias: evidencias.map(function (x) { return x.trilha.nome + ": " + x.achadas.map(function (h) { return h.nome; }).join(", "); }) });
    }

    marco.degrau = R.trilho(o).passos || 0;
    o.importacao = { versao: 1, sistema: "cris", marco: marco, aquisicoes: [] };

    /* ---------- perícias ---------- */
    var periciasCris = {};
    var vistasPericia = {};
    (Array.isArray(src.skills) ? src.skills : []).forEach(function (s, i) {
      var pe = C.PERICIAS.filter(function (p) { return chaveDeTexto(p.nome) === chaveDeTexto(s.name); })[0];
      var resumoSkill = "Atributo " + (s.attribute || "—") + ", treino " + (s.trainingDegree === undefined ? "—" : s.trainingDegree) + ", bônus " + (s.bonus === undefined ? "—" : s.bonus);
      if (!pe) {
        var chaveSk = "pericia-cris:" + (chaveDeTexto(s.name).replace(/ /g, "-") || i);
        var dSk = destinoDe(chaveSk);
        var mapeada = dSk && dSk.tipo === "catalogo" ? C.PERICIAS.filter(function (p) { return p.chave === dSk.id; })[0] : null;
        meta(chaveSk, { secao: "pericias", tipo: "pericia", rotulo: String(s.name || "Perícia"), cris: resumoSkill, dadosCris: { nome: String(s.name || ""), atributo: s.attribute, treino: s.trainingDegree, bonus: s.bonus },
          destino: dSk, explicita: !!dSk, estado: dSk ? "escolhido" : "sem_destino", motivo: dSk ? "" : "A perícia não existe no R.A.M.A." });
        if (mapeada) { pe = mapeada; metas[chaveSk].periciaRama = pe.chave; }
        else {
          if (!dSk || dSk.tipo !== "ignorar") {
            var nota = { titulo: "Perícia personalizada: " + String(s.name || "?"), texto: resumoSkill + "." };
            if (dSk) nota.deEntrada = chaveSk; else nota.semEntrada = true;
            preservados.push(nota);
          }
          aviso("pericia_personalizada", "informacao", "skills." + i, "A perícia “" + s.name + "” não existe no R.A.M.A." + (dSk && dSk.tipo === "ignorar" ? " Ficou de fora, por escolha." : " e ficou registrada como texto."));
          return;
        }
      }
      if (vistasPericia[pe.chave]) { aviso("pericia_duplicada", "revisao", "skills." + i, "A perícia " + pe.nome + " aparece duas vezes; vale a primeira."); return; }
      var grauCris = GRAU_POR_TREINO[String(s.trainingDegree === undefined ? "" : s.trainingDegree).trim()];
      meta("pericia:" + pe.chave, { secao: "pericias", tipo: "valor", rotulo: pe.nome, formato: "pericia",
        cris: ((C.grau(grauCris) || {}).nome || "treino " + (s.trainingDegree === undefined ? "—" : s.trainingDegree)) + " · " + String(s.attribute || pe.atributo || "").toUpperCase() + " · " + (numeroOuNulo(s.bonus) === null ? "—" : (numeroOuNulo(s.bonus) >= 0 ? "+" : "") + numeroOuNulo(s.bonus)) });
      vistasPericia[pe.chave] = true;
      var grau = GRAU_POR_TREINO[String(s.trainingDegree === undefined ? "" : s.trainingDegree).trim()];
      if (!grau) {
        aviso("grau_desconhecido", "revisao", "skills." + i, pe.nome + ": grau de treino “" + s.trainingDegree + "” desconhecido; ficou destreinada, e o bônus observado entra como ajuste.");
        grau = "destreinado";
      }
      if (grau !== "destreinado") o.pericias[pe.chave] = grau;
      var at = atributoDeTexto(s.attribute);
      if (at && at !== pe.atributo) o.periciasAjustes[pe.chave] = { atributo: at };
      var b = numeroOuNulo(s.bonus);
      periciasCris[pe.chave] = { bonus: b, outros: numeroOuNulo(s.otherBonus), nome: pe.nome, grau: grau, atributo: at || pe.atributo };
    });

    /* ---------- inventário ---------- */
    ficha.inventario.itens = [];
    var porIdCris = {};
    var infoItens = [];
    /* "Componentes Ritualísticos de Sangue" é o item do catálogo com o
       elemento escolhido. Uma linha do CRIS com vários elementos continua
       uma linha só (item personalizado): o inventário guarda o que a ficha
       tinha, entrada por entrada. */
    function elementoDosComponentes(it) {
      var m = /^componentes ritualisticos (?:de|do|da|dos|das) (.+)$/.exec(chaveDeTexto(it && it.name));
      if (!m) return "";
      var els = m[1].split(/\s+(?:e\s+)?/).filter(function (x) { return ELEMENTO_POR_TEXTO[x] && x !== "varia"; });
      return els.length === 1 && m[1] === els[0] ? els[0] : "";
    }
    var inventarioCris = (Array.isArray(src.inventory) ? src.inventory : []).map(function (it) {
      var el = elementoDosComponentes(it);
      return el ? Object.assign({}, it, { element: el }) : it;
    });
    var modsPorDestino = [];
    var porChaveItem = {};
    inventarioCris.forEach(function (it, i) {
      var r = montarItem(it, i);
      if (!r) return;
      ficha.inventario.itens.push(r.item);
      if (it.id) porIdCris[String(it.id)] = r;
      porChaveItem[r.chave] = r;
      infoItens.push(r);
    });
    /* Entrada do inventário que, na ficha, é uma modificação ou maldição
       de outro item ("aplicar a maldição à arma"). */
    modsPorDestino.forEach(function (x) {
      var mX = metas[x.chave];
      var alvo = porChaveItem[x.alvo];
      var eX = catItens.porId[x.id];
      if (!alvo || !eX || (eX.natureza !== "modificacao" && eX.natureza !== "maldicao")) {
        mX.estado = "conflito"; mX.motivo = !alvo ? "O item escolhido para receber não está mais na ficha." : "A modificação escolhida não existe mais no catálogo.";
        return;
      }
      var el2 = ELEMENTO_POR_TEXTO[chaveDeTexto(x.it.element)];
      var rX = ITM.aplicar(eX, alvo.item, { escolha: el2 && el2 !== "varia" ? el2 : undefined });
      if (!rX.ok) { mX.estado = "conflito"; mX.motivo = eX.nome + " não cabe em " + alvo.item.nome + ": " + String(rX.motivo || "conferência do catálogo").replace(/\.+$/, "") + "."; return; }
      mX.aplicadoEm = alvo.item.nome;
      mX.itemId = alvo.item.id;
    });

    function familiaCompativel(e, it) {
      var t = chaveDeTexto(it.itemType);
      if (t === "weapon") return e.tipoItem === "arma";
      if (t === "protection") return e.tipoItem === "armadura";
      if (t === "curseditem") return e.aba === "amaldicoados" && e.natureza === "item";
      if (t === "ammo" || t === "ammunition") return e.aba === "municoes";
      return e.natureza === "item" && e.tipoItem !== "arma" && e.tipoItem !== "armadura";
    }

    function candidatosDeNome(nome) {
      var n = String(nome || "");
      var lista = [{ texto: n, parte: "nome" }];
      var par = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(n);
      if (par) { lista.push({ texto: par[1], parte: "antes dos parênteses" }); lista.push({ texto: par[2], parte: "entre parênteses" }); }
      var hif = /^(.*?)\s+[-–—]\s+(.*)$/.exec(par ? par[1] : n);
      if (hif) { lista.push({ texto: hif[2], parte: "depois do hífen" }); lista.push({ texto: hif[1], parte: "antes do hífen" }); }
      return lista;
    }

    function identificar(it) {
      if (/^componentes ritualisticos /.test(chaveDeTexto(it.name)) && ELEMENTO_POR_TEXTO[chaveDeTexto(it.element)] && catItens.porId["op.paranormal.componentes"]) {
        return { entrada: catItens.porId["op.paranormal.componentes"], exata: true, parte: "nome", texto: it.name };
      }
      var cands = candidatosDeNome(it.name);
      for (var c = 0; c < cands.length; c++) {
        var k = chaveDeTexto(cands[c].texto);
        if (!k) continue;
        var achados = catItens.itens.filter(function (e) {
          return e.natureza === "item" && familiaCompativel(e, it) &&
            (chaveDeTexto(e.nome) === k || (e.alias || []).some(function (a) { return chaveDeTexto(a) === k; }));
        });
        if (achados.length === 1) return { entrada: achados[0], exata: c === 0, parte: cands[c].parte, texto: cands[c].texto };
        if (achados.length > 1) return { ambigua: achados, parte: cands[c].parte };
      }
      /* Nome idêntico, tipo incompatível (uma "arma" do CRIS com o nome de
         uma proteção do catálogo): não é correspondência confiável — pede
         decisão, com o homônimo entre os candidatos. */
      var kNome = chaveDeTexto(it.name);
      var homonimos = kNome ? catItens.itens.filter(function (e) {
        return e.natureza === "item" && (chaveDeTexto(e.nome) === kNome || (e.alias || []).some(function (a) { return chaveDeTexto(a) === kNome; }));
      }) : [];
      if (homonimos.length) return { conflito: homonimos };
      return null;
    }

    function rotuloDoTipoCris(it) {
      var t = chaveDeTexto(it.itemType);
      return t === "weapon" ? "arma" : t === "protection" ? "proteção" : t === "curseditem" ? "item amaldiçoado" : (t === "ammo" || t === "ammunition") ? "munição" : "item";
    }
    function rotuloDoTipoCatalogo(e) {
      return e.tipoItem === "arma" ? "arma" : e.tipoItem === "armadura" ? "proteção" : e.aba === "municoes" ? "munição" : e.aba === "amaldicoados" ? "item amaldiçoado" : "item";
    }

    function escolhaPara(e, it) {
      var es = e.escolha;
      if (!es) return undefined;
      if (es.tipo === "elemento" || es.defineElemento) {
        var el = ELEMENTO_POR_TEXTO[chaveDeTexto(it.element)];
        return el && el !== "varia" ? el : undefined;
      }
      if (es.tipo === "texto") {
        var par = /\(([^)]*)\)\s*$/.exec(String(it.name || ""));
        return par ? par[1].trim() : undefined;
      }
      return undefined;
    }

    function itemPersonalizado(it, tipoItem) {
      var dados = {
        nome: String(it.name || "Item do CRIS").slice(0, 80),
        categoria: "Importado do CRIS",
        descricao: textoSeguro(it.description, 2000),
        ordem: { quantidade: Math.max(1, Math.round(numeroOuNulo(it.quantity !== undefined ? it.quantity : it.amount) || 1)) },
      };
      var cat = romanoOuNulo(it.category);
      if (cat !== null) dados.ordem.categoria = Math.max(0, Math.min(4, cat));
      var esp = numeroOuNulo(it.slots);
      if (esp !== null) dados.ordem.espacos = Math.max(0, esp);
      if (esp !== null && esp < 0) observacoes.push("“" + it.name + "”: o CRIS usa " + esp + " espaços (a mochila representada como espaço negativo); no R.A.M.A. o item ocupa 0.");
      if (ELEMENTO_POR_TEXTO[chaveDeTexto(it.element)]) dados.ordem.elemento = ELEMENTO_POR_TEXTO[chaveDeTexto(it.element)];
      if (chaveDeTexto(it.itemType) === "curseditem") dados.ordem.amaldicoado = true;
      if (tipoItem === "arma") {
        dados.ordem.arma = { tipo: chaveDeTexto(it.type) === "corpo a corpo" ? "corpoACorpo" : "distancia",
          empunhadura: chaveDeTexto(it.handling) === "leve" ? "leve" : (chaveDeTexto(it.handling) === "duas maos" ? "duasMaos" : "umaMao"),
          proficiencia: /tatica/.test(chaveDeTexto(it.proficiencie)) ? "tatica" : (/pesada/.test(chaveDeTexto(it.proficiencie)) ? "pesada" : "simples"),
          tipoDano: String(it.damageType || "").slice(0, 20) };
        dados.ordem.pericia = dados.ordem.arma.tipo === "corpoACorpo" ? "luta" : "pontaria";
        dados.critico = 20;
        dados.multiplicador = 2;
      }
      if (tipoItem === "armadura") {
        var def = numeroOuNulo(it.defense);
        dados.defesa = def === null ? 0 : def;
        dados.ordem.protecao = { tipo: "leve" };
      }
      return F.criarItem(tipoItem, dados);
    }

    function montarItem(it, i) {
      if (!it || typeof it !== "object") return null;
      var t = chaveDeTexto(it.itemType);
      var tipoItem = t === "weapon" ? "arma" : (t === "protection" ? "armadura" : "item");
      var item = null, entrada = null, identificacao = "personalizado";
      var chaveRev = "item:" + (it.id || i);
      var dI = destinoDe(chaveRev);
      var qtdCris = numeroOuNulo(it.quantity !== undefined ? it.quantity : it.amount) || 1;
      var mI = meta(chaveRev, { secao: "inventario", tipo: "item", rotulo: String(it.name || "Item"), dadosCris: dadosCrisDoItem(it, tipoItem), destino: dI, explicita: !!dI, cris: resumoDoItemCris(it) });

      if (dI && (dI.tipo === "anotacao" || dI.tipo === "ignorar" || dI.tipo === "modificacao")) {
        mI.estado = "escolhido";
        if (dI.tipo === "anotacao") paraAnotacao(chaveRev, "Item do CRIS: " + (it.name || "?"), descricaoDoItemCris(it));
        if (dI.tipo === "modificacao") modsPorDestino.push({ chave: chaveRev, it: it, alvo: String(dI.alvo || ""), id: String(dI.id || ""), indice: i });
        return null;
      }

      var id = null;
      if (dI && dI.tipo === "catalogo") {
        entrada = catItens.porId[dI.id] && catItens.porId[dI.id].natureza === "item" ? catItens.porId[dI.id] : null;
        if (!entrada) { mI.estado = "sem_destino"; mI.destino = null; mI.explicita = false; mI.motivo = "O item escolhido não existe mais no catálogo."; }
        else mI.estado = "escolhido";
      } else if (dI && dI.tipo === "homebrew" && dI.registro && typeof dI.registro === "object") {
        var reg = F.normalizarItem(dI.registro);
        if (reg) {
          var dadosHb = Object.assign({}, reg, { origemHomebrewId: dI.registro.id || null });
          item = F.criarItem(reg.tipo, dadosHb);
          if (item.ordem) {
            delete item.ordem.emUso;
            (item.ordem.modificacoes || []).forEach(function (mod) { mod.id = U.uuid(); });
            if (item.ordem.quantidade !== undefined) item.ordem.quantidade = Math.max(1, Math.round(qtdCris));
          }
          identificacao = "homebrew";
          mI.estado = "escolhido";
        }
      } else if (dI && dI.tipo === "personalizado") {
        var dp = dI.dados && typeof dI.dados === "object" ? dI.dados : {};
        var tipoPers = dp.tipoItem === "arma" || dp.tipoItem === "armadura" || dp.tipoItem === "item" ? dp.tipoItem : tipoItem;
        item = itemPersonalizado(it, tipoPers);
        aplicarCamposPersonalizados(item, dp);
        if (dI.salvarHomebrew && dI.homebrewId) item.origemHomebrewId = String(dI.homebrewId).slice(0, 80);
        identificacao = "personalizadoEditado";
        mI.estado = "escolhido";
      } else {
        id = identificar(it);
        if (id && id.ambigua) {
          mI.estado = "sem_destino";
          mI.candidatos = id.ambigua.map(function (e) { return e.id; });
          mI.motivo = "O nome corresponde a mais de um item do catálogo (" + id.ambigua.map(function (e) { return e.nome + " · " + (ITM.ROTULO_FONTE[e.fonte] || e.fonte); }).join("; ") + ").";
        } else if (id && id.conflito) {
          mI.estado = "conflito";
          mI.candidatos = id.conflito.map(function (e) { return e.id; });
          mI.motivo = "Há “" + id.conflito[0].nome + "” no catálogo, mas como " + rotuloDoTipoCatalogo(id.conflito[0]) + "; no CRIS é " + rotuloDoTipoCris(it) + ".";
        } else if (id && !id.exata) {
          entrada = id.entrada;
          mI.estado = "sugerido";
          mI.motivo = "Reconhecido como " + id.entrada.nome + " pela parte “" + id.texto + "” (" + id.parte + "); o nome do CRIS é mantido.";
        } else if (id) {
          entrada = id.entrada;
          mI.estado = "sugerido";
          mI.motivo = "Nome do catálogo" + (chaveDeTexto(id.entrada.nome) === chaveDeTexto(it.name) ? "" : " (apelido conhecido)") + ".";
        } else {
          var hbI = homebrewPorNome(hbItens, it.name, function (h) { return tipoDoHomebrewCompativel(h, tipoItem); });
          if (hbI.length === 1) {
            var regA = F.normalizarItem(hbI[0]);
            if (regA) {
              item = F.criarItem(regA.tipo, Object.assign({}, regA, { origemHomebrewId: hbI[0].id || null }));
              if (item.ordem) { delete item.ordem.emUso; (item.ordem.modificacoes || []).forEach(function (mod) { mod.id = U.uuid(); }); }
              identificacao = "homebrew";
              mI.estado = "sugerido";
              mI.destino = { tipo: "homebrew", registro: hbI[0] };
              mI.motivo = "Mesmo nome na sua Homebrew (" + textoDoHomebrew(hbI[0]) + ").";
            }
          } else {
            mI.estado = "sem_destino";
            if (hbI.length) mI.candidatosHomebrew = hbI.map(function (h) { return h.id; });
            mI.motivo = "Nenhum item do catálogo ou da Homebrew tem esse nome.";
          }
        }
      }

      if (entrada) {
        var montado = ITM.paraInventario(entrada, { escolha: escolhaPara(entrada, it), quantidade: qtdCris, catalogo: catItens });
        if (!montado.ok && entrada.escolha) montado = ITM.paraInventario(entrada, { escolha: undefined, quantidade: 1, catalogo: catItens });
        if (montado.ok) {
          item = F.criarItem(montado.tipo, montado.dados);
          item.nome = String(it.name || item.nome).slice(0, 80);
          identificacao = "catalogo";
          if (!mI.destino) mI.destino = { tipo: "catalogo", id: entrada.id };
        } else {
          aviso("item_escolha", "revisao", "inventory." + i, "“" + it.name + "”: " + (montado.mensagem || "o catálogo pede uma escolha que o CRIS não informa") + " Entrou como item personalizado.");
          mI.estado = "sem_destino"; mI.motivo = "O catálogo pede uma escolha que o CRIS não informa.";
        }
      }
      if (!item) {
        item = itemPersonalizado(it, tipoItem);
        if (!entrada && !dI) aviso("item_personalizado", "informacao", "inventory." + i, "“" + it.name + "” não foi identificado no catálogo e entrou provisoriamente como item personalizado, com os valores observados (composição desconhecida).");
      }
      /* Cópia editada (nome e descrição): só esta ficha muda; o catálogo
         e a Homebrew continuam como estavam. */
      if (dI && (dI.tipo === "catalogo" || dI.tipo === "homebrew")) {
        if (U.aparar(dI.nome, 80)) item.nome = U.aparar(dI.nome, 80);
        if (typeof dI.descricao === "string") item.descricao = U.aparar(dI.descricao, 2000);
      }
      if (!item.ordem) item.ordem = {};
      var equip = it.equipped === true;
      if (item.tipo === "armadura") { if (equip) item.ordem.emUso = true; }
      else if (entrada && entrada.vestimenta && equip) item.ordem.vestida = true;
      else if (it.equipped === true || it.equipped === false) item.ordem.equipadoNaOrigem = equip;
      if (!entrada && tipoItem === "arma") {
        /* A arma personalizada leva o que o CRIS diz dela; a reconciliação
           de dano vem com o ataque. */
        var crit = numeroOuNulo(it.criticalRange);
        if (crit !== null) item.critico = Math.max(1, Math.min(20, Math.round(crit)));
        var mult = numeroOuNulo(it.criticalMult);
        if (mult !== null) item.multiplicador = Math.max(1, Math.min(10, Math.round(mult)));
      }

      /* modificações e maldições */
      var modsNaoReconhecidos = [];
      (Array.isArray(it.mods) ? it.mods : []).forEach(function (m) {
        var k = chaveDeTexto(m.name);
        var cands = catItens.itens.filter(function (e) { return (e.natureza === "modificacao" || e.natureza === "maldicao") && chaveDeTexto(e.nome) === k; });
        if (cands.length > 1) {
          var natureza = chaveDeTexto(m.modType) === "curse" ? "maldicao" : "modificacao";
          var filtrados = cands.filter(function (e) { return e.natureza === natureza && ITM.podeAplicar(e, item).ok; });
          if (!filtrados.length) filtrados = cands.filter(function (e) { return ITM.podeAplicar(e, item).ok; });
          if (filtrados.length) cands = filtrados;
        }
        var e = cands[0];
        if (!e) { modsNaoReconhecidos.push(m); return; }
        var esc = undefined;
        if (e.escolha && (e.escolha.tipo === "elemento" || e.escolha.defineElemento)) {
          var el = ELEMENTO_POR_TEXTO[chaveDeTexto(m.element)];
          if (el && el !== "varia") esc = el;
        }
        var r = ITM.aplicar(e, item, { escolha: esc });
        if (!r.ok) {
          /* O catálogo pede uma escolha que o CRIS não guarda (a perícia da
             Função Adicional) ou a conferência recusou: o retrato entra
             mesmo assim — a categoria precisa dele —, com o aviso. */
          if (!Array.isArray(item.ordem.modificacoes)) item.ordem.modificacoes = [];
          var reg = { id: U.uuid(), catalogoId: e.id, nome: e.nome.slice(0, 80), natureza: e.natureza,
            resumo: (e.efeitos && e.efeitos.length ? e.efeitos.join(" ") : e.resumo || "").slice(0, 300), referencia: { fonte: e.fonte, pagina: e.pagina } };
          if (e.elemento) reg.elemento = e.elemento;
          if (e.calculo) reg.calculo = JSON.parse(JSON.stringify(e.calculo));
          if (e.semAcrescimoDeCategoria) reg.semAcrescimoDeCategoria = true;
          item.ordem.modificacoes.push(reg);
          var faltaEscolha = !!(e.escolha && esc === undefined);
          aviso(faltaEscolha ? "mod_sem_escolha" : "mod_fora_da_regra", "revisao", "inventory." + i, "“" + it.name + "” · " + e.nome + ": " + (faltaEscolha
            ? "o CRIS não guarda a escolha da modificação; ela entrou sem a escolha, e o efeito que depende dela fica para a mesa."
            : "o R.A.M.A. não aceitaria essa combinação (" + String(r.motivo || "conferência do catálogo").replace(/\.+$/, "") + "); a modificação foi mantida como está no CRIS."));
        }
      });
      /* "Balas Curtas (Explosiva)": a modificação só está no nome. Entra
         quando o catálogo a tem com esse nome e ela cabe no item. */
      var parNome = entrada ? /\(([^)]*)\)\s*$/.exec(String(it.name || "")) : null;
      if (parNome) {
        parNome[1].split(",").forEach(function (parte) {
          var kp = chaveDeTexto(parte);
          if (!kp) return;
          var jaTem = (item.ordem.modificacoes || []).some(function (m) { return chaveDeTexto(m.nome) === kp; });
          var mod = jaTem ? null : catItens.itens.filter(function (e) { return (e.natureza === "modificacao" || e.natureza === "maldicao") && chaveDeTexto(e.nome) === kp && ITM.podeAplicar(e, item).ok; })[0];
          if (!mod || (mod.escolha && !(mod.escolha.opcional))) return;
          var r = ITM.aplicar(mod, item, {});
          if (r.ok) aviso("mod_do_nome", "informacao", "inventory." + i, "“" + it.name + "”: a modificação " + mod.nome + " estava só no nome e foi aplicada.");
        });
      }
      /* Modificação do CRIS sem correspondência: cada uma é uma entrada
         da revisão ("O que é isso na sua ficha?"). Sem escolha, fica no
         texto do item — provisório, até a pessoa decidir. */
      var modsNoTexto = [];
      modsNaoReconhecidos.forEach(function (m) {
        var chaveMod = "mod:" + chaveRev + ":" + (m.id || chaveDeTexto(m.name).replace(/ /g, "-") || modsNaoReconhecidos.indexOf(m));
        var dM = destinoDe(chaveMod);
        var mM = meta(chaveMod, { secao: "inventario", tipo: "mod", rotulo: String(m.name || "Modificação") + " · em " + String(it.name || "item"), itemChave: chaveRev,
          cris: (chaveDeTexto(m.modType) === "curse" ? "Maldição" : "Modificação") + (m.element ? " de " + m.element : "") + (m.description ? " · " + textoSeguro(m.description, 160) : ""),
          dadosCris: { nome: String(m.name || ""), descricao: textoSeguro(m.description, 2000), natureza: chaveDeTexto(m.modType) === "curse" ? "maldicao" : "modificacao", elemento: m.element || "" },
          destino: dM, explicita: !!dM, estado: dM ? "escolhido" : "sem_destino", motivo: dM ? "" : "Não existe no catálogo com esse nome." });
        if (dM && dM.tipo === "catalogo") {
          var eM = catItens.porId[dM.id];
          var rM = eM && (eM.natureza === "modificacao" || eM.natureza === "maldicao") ? ITM.aplicar(eM, item, { escolha: ELEMENTO_POR_TEXTO[chaveDeTexto(m.element)] && ELEMENTO_POR_TEXTO[chaveDeTexto(m.element)] !== "varia" ? ELEMENTO_POR_TEXTO[chaveDeTexto(m.element)] : undefined }) : { ok: false, motivo: "não existe mais no catálogo" };
          if (!rM.ok) { mM.estado = "conflito"; mM.motivo = (eM ? eM.nome : "A escolha") + " não cabe neste item: " + String(rM.motivo || "conferência do catálogo").replace(/\.+$/, "") + "."; modsNoTexto.push(m); }
          return;
        }
        if (dM && dM.tipo === "anotacao") { paraAnotacao(chaveMod, "Modificação do CRIS: " + m.name + " (" + it.name + ")", textoSeguro(m.description, 4000)); return; }
        if (dM && dM.tipo === "ignorar") return;
        modsNoTexto.push(m);
      });
      if (modsNoTexto.length) {
        var textoMods = modsNoTexto.map(function (m) { return "• " + m.name + (m.description ? ": " + textoSeguro(m.description, 400) : ""); }).join("\n");
        item.descricao = ((item.descricao ? item.descricao + "\n\n" : "") + "Modificações do CRIS sem correspondência no catálogo:\n" + textoMods).slice(0, 2000);
        aviso("mod_desconhecida", "revisao", "inventory." + i, "“" + it.name + "”: " + modsNoTexto.map(function (m) { return m.name; }).join(", ") + " não existem no catálogo; ficaram no texto do item, sem efeito de conta.");
      }
      mI.itemId = item.id;
      mI.identificacao = identificacao;
      return { item: item, cris: it, entrada: entrada, identificacao: identificacao, indice: i, chave: chaveRev, explicito: !!(dI && (dI.tipo === "catalogo" || dI.tipo === "homebrew")) };
    }

    function dadosCrisDoItem(it, tipoItem) {
      return {
        nome: String(it.name || ""), descricao: textoSeguro(it.description, 2000), tipoItem: tipoItem, tipoCris: rotuloDoTipoCris(it),
        categoria: romanoOuNulo(it.category), espacos: numeroOuNulo(it.slots), elemento: it.element || "",
        dano: String(it.damage || ""), critico: numeroOuNulo(it.criticalRange), multiplicador: numeroOuNulo(it.criticalMult), tipoDano: String(it.damageType || ""),
        defesa: numeroOuNulo(it.defense), quantidade: numeroOuNulo(it.quantity !== undefined ? it.quantity : it.amount),
        mods: (Array.isArray(it.mods) ? it.mods : []).map(function (m) { return String(m.name || ""); }),
      };
    }
    function resumoDoItemCris(it) {
      var dc = dadosCrisDoItem(it, "");
      return [dc.tipoCris, dc.categoria !== null ? "cat. " + rotuloRomano(dc.categoria) : "", dc.espacos !== null ? dc.espacos + " esp." : "",
        dc.dano ? dc.dano + (dc.tipoDano ? " " + dc.tipoDano : "") : "", dc.defesa !== null ? "Defesa +" + dc.defesa : "", dc.mods.join(", ")].filter(Boolean).join(" · ");
    }
    function descricaoDoItemCris(it) {
      var dc = dadosCrisDoItem(it, "");
      return [dc.tipoCris + (dc.categoria !== null ? " · categoria " + rotuloRomano(dc.categoria) : "") + (dc.espacos !== null ? " · " + dc.espacos + " espaço(s)" : ""),
        dc.dano ? "Dano: " + dc.dano + (dc.tipoDano ? " (" + dc.tipoDano + ")" : "") : "", dc.defesa !== null ? "Defesa: " + dc.defesa : "",
        dc.mods.length ? "Modificações: " + dc.mods.join(", ") : "", dc.descricao].filter(Boolean).join("\n");
    }
    function tipoDoHomebrewCompativel(h, tipoItem) {
      if (tipoItem === "arma") return h.tipo === "arma";
      if (tipoItem === "armadura") return h.tipo === "armadura";
      return h.tipo === "item" || h.tipo === "mochila";
    }
    /* Campos próprios do tipo, editados no assistente. Só o que veio. */
    function aplicarCamposPersonalizados(item, dp) {
      if (U.aparar(dp.nome, 80)) item.nome = U.aparar(dp.nome, 80);
      if (typeof dp.descricao === "string") item.descricao = U.aparar(dp.descricao, 2000);
      if (!item.ordem) item.ordem = {};
      var cat = numeroOuNulo(dp.categoria);
      if (cat !== null) item.ordem.categoria = Math.max(0, Math.min(4, Math.round(cat)));
      var esp = numeroOuNulo(dp.espacos);
      if (esp !== null) item.ordem.espacos = Math.max(0, Math.min(99, esp));
      if (item.tipo === "arma") {
        var ex = analisarExpressao(dp.dano);
        var dadosDp = ex.ok ? ex.termos.filter(function (t) { return t.tipo === "dados" && !t.negativo; }) : [];
        if (dadosDp.length) item.dano = dadosDp[0].quantidade + "d" + dadosDp[0].faces;
        var cr = numeroOuNulo(dp.critico);
        if (cr !== null) item.critico = Math.max(1, Math.min(20, Math.round(cr)));
        var mu = numeroOuNulo(dp.multiplicador);
        if (mu !== null) item.multiplicador = Math.max(1, Math.min(10, Math.round(mu)));
        if (!item.ordem.arma) item.ordem.arma = {};
        if (dp.tipoArma === "corpoACorpo" || dp.tipoArma === "distancia") { item.ordem.arma.tipo = dp.tipoArma; item.ordem.pericia = dp.tipoArma === "corpoACorpo" ? "luta" : "pontaria"; }
        if (typeof dp.tipoDano === "string") item.ordem.arma.tipoDano = U.aparar(dp.tipoDano, 20);
      }
      if (item.tipo === "armadura") {
        var df = numeroOuNulo(dp.defesa);
        if (df !== null) item.defesa = Math.max(0, Math.min(99, Math.round(df)));
      }
    }

    /* ---------- poderes: aquisições ---------- */
    var aquisicoes = o.importacao.aquisicoes;
    var origemEntrada = origem ? C.origem(origem) : null;
    var trilhaAtual = o.trilha ? C.trilha(o.trilha) : null;
    var habTrilha = {};
    if (trilhaAtual) P.habilidadesDaTrilha(trilhaAtual.chave).forEach(function (h) { if (h.nex <= R.trilho(o).nexEquivalente) habTrilha[h.chave] = h; });
    var automaticas = {};
    P.AUTOMATICAS.forEach(function (a) { if (a.classes.indexOf(classe) >= 0) automaticas[a.chave] = a; });
    var pastaHabilidades = null;
    var contagemPorChave = {};

    /* Opções que mudam contas e que o CRIS não guarda (a perícia
       penalizada de Arrepios na Espinha, o atributo de Coincidências
       Inexplicáveis…). Vão para a revisão; a sugestão só vem quando os
       números do CRIS apontam UMA resposta. As opções que o retrato já
       contém (treinar, atributo) não são perguntadas. */
    var EFEITOS_DO_RETRATO = { grauPericias: 1, treinar: 1, treinarLista: 1, treinarOuBonus: 1, grauMinimo: 1, atributo: 1 };
    function opcoesDoPoder(e, p, i) {
      var saida = {};
      var algum = false;
      (e.opcoes || []).forEach(function (op) {
        if (op.tipo !== "pericia" && op.tipo !== "atributo") return;
        var efeitos = (e.efeitos || []).filter(function (ef) { return ef.opcao === op.chave && !EFEITOS_DO_RETRATO[ef.tipo]; });
        if (!efeitos.length) return;
        var lista, sugestao = "", evidencia = "";
        if (op.tipo === "pericia") {
          lista = (op.entre && op.entre.length ? op.entre : C.PERICIAS.map(function (x) { return x.chave; }));
          var negativo = efeitos.filter(function (ef) { return ef.tipo === "bonusPericia" && ef.valor < 0; })[0];
          if (negativo) {
            var marcadas = lista.filter(function (k) { return periciasCris[k] && periciasCris[k].outros !== null && periciasCris[k].outros <= negativo.valor; });
            if (marcadas.length === 1) { sugestao = marcadas[0]; evidencia = " No CRIS, só " + C.pericia(sugestao).nome + " tem " + negativo.valor + " ou menos em outros bônus."; }
          }
        } else {
          lista = C.ATRIBUTOS.map(function (a) { return a.chave; }).filter(function (k) { return (op.exceto || []).indexOf(k) < 0; });
          if (efeitos.some(function (ef) { return ef.tipo === "peAtributo"; })) {
            var obsPe = numeroOuNulo(src.maxPe);
            var pe = R.calcular(o, ficha.inventario).pe;
            var falta = obsPe === null || !pe ? null : obsPe - pe.total;
            var batem = lista.filter(function (k) { return falta !== null && falta > 0 && o.atributos[k] === falta; });
            if (batem.length === 1) { sugestao = batem[0]; evidencia = " O PE do CRIS tem " + falta + " a mais que o cálculo, e só " + C.ATRIBUTOS.filter(function (a) { return a.chave === sugestao; })[0].nome + " vale " + falta + "."; }
          }
        }
        var rotuloDe = function (k) { return op.tipo === "pericia" ? (C.pericia(k) || {}).nome || k : (C.ATRIBUTOS.filter(function (a) { return a.chave === k; })[0] || {}).nome || k; };
        var valor = revisao("opcao:" + (p.id || i) + ":" + op.chave, e.nome + " · " + (op.rotulo || op.chave),
          "O CRIS não guarda esta escolha; sem ela, o efeito que depende dela fica de fora." + evidencia,
          [{ valor: "", rotulo: "Não informado (sem o efeito)" }].concat(lista.map(function (k) { return { valor: k, rotulo: rotuloDe(k) }; })), sugestao);
        if (valor) { saida[op.chave] = valor; algum = true; }
      });
      return algum ? saida : null;
    }

    function pastaDoCris() {
      if (!pastaHabilidades) { pastaHabilidades = H.criarPasta("Importado do CRIS"); H.inserir(ficha.habilidades, pastaHabilidades); }
      return pastaHabilidades;
    }
    var poderesFora = 0;
    poderes.forEach(function (p, i) {
      var k = chaveDeTexto(p.name);
      var refAq = "imp-" + String(U.uuid()).replace(/[^A-Za-z0-9]/g, "").slice(0, 20);
      var chaveP = "poder:" + (p.id || i);
      var dP = destinoDe(chaveP);
      var mP = meta(chaveP, { secao: "poderes", tipo: "poder", rotulo: String(p.name || "Poder"), refAquisicao: refAq,
        cris: (p.element ? p.element + " · " : "") + (textoSeguro(p.description, 160) || "sem descrição"),
        dadosCris: { nome: String(p.name || ""), descricao: textoSeguro(p.description, 8000), elemento: p.element || "" }, destino: dP, explicita: !!dP });
      if (dP && (dP.tipo === "anotacao" || dP.tipo === "ignorar")) {
        mP.estado = "escolhido";
        poderesFora++;
        if (dP.tipo === "anotacao") paraAnotacao(chaveP, "Poder do CRIS: " + (p.name || "?"), textoSeguro(p.description, 8000));
        return;
      }
      if (dP && (dP.tipo === "homebrew" || dP.tipo === "personalizado")) {
        var hab = null;
        if (dP.tipo === "homebrew" && dP.registro) {
          hab = H.copiarParaFicha(dP.registro);
          if (hab && U.aparar(dP.nome, 120)) hab.nome = U.aparar(dP.nome, 120);
          if (hab && typeof dP.descricao === "string") hab.texto = U.aparar(dP.descricao, 8000);
        } else if (dP.tipo === "personalizado") {
          var dd = dP.dados && typeof dP.dados === "object" ? dP.dados : {};
          hab = H.criarHabilidade({ nome: U.aparar(dd.nome, 120) || String(p.name || "Poder do CRIS"), texto: typeof dd.descricao === "string" ? dd.descricao : textoSeguro(p.description, 8000), origem: "CRIS",
            origemHabilidadeId: dP.salvarHomebrew && dP.homebrewId ? String(dP.homebrewId).slice(0, 80) : null });
        }
        if (hab) {
          H.inserir(ficha.habilidades, hab, pastaDoCris().id);
          aquisicoes.push({ ref: refAq, chave: "", nome: hab.nome, nomeOriginal: p.name, tipo: "personalizado", representacao: "texto", procedencia: dP.tipo === "homebrew" ? "Homebrew" : "personalizado na importação" });
          mP.estado = "escolhido"; mP.habilidadeId = hab.id;
          return;
        }
        mP.estado = "sem_destino"; mP.destino = null; mP.explicita = false;
      }
      if (origemEntrada && k === chaveDeTexto(origemEntrada.poder) && !(dP && dP.tipo === "catalogo")) {
        aquisicoes.push({ ref: refAq, chave: "origem:" + origemEntrada.chave, nome: origemEntrada.poder, nomeOriginal: p.name, tipo: "origem", representacao: "regras", procedencia: "origem " + origemEntrada.nome });
        mP.estado = "sugerido"; mP.destino = { tipo: "regras", rotulo: "Poder da origem " + origemEntrada.nome }; mP.motivo = "Dado pela origem: entra uma vez, pelas regras.";
        return;
      }
      var cands = dP && dP.tipo === "catalogo" ? [P.poder(dP.id)].filter(Boolean) : (porNome[k] || []).slice();
      if (dP && dP.tipo === "catalogo" && !cands.length) { mP.estado = "sem_destino"; mP.destino = null; mP.explicita = false; mP.motivo = "O poder escolhido não existe mais no catálogo."; }
      var opcoesDoNome = null;
      if (!cands.length) {
        /* "Resistir a Sangue" é "Resistir a Elemento" com a opção já escolhida. */
        var mEl = /\b(sangue|morte|conhecimento|energia|medo)\b/.exec(k);
        if (mEl) {
          var generico = (porNome[k.replace(mEl[0], "elemento")] || []).filter(function (e) {
            return (e.opcoes || []).some(function (op) { return op.tipo === "elemento"; });
          });
          if (generico.length === 1) {
            cands = generico;
            opcoesDoNome = {};
            generico[0].opcoes.forEach(function (op) { if (op.tipo === "elemento") opcoesDoNome[op.chave] = mEl[1]; });
          }
        }
      }
      var el = ELEMENTO_POR_TEXTO[chaveDeTexto(p.element)];
      var explicitoP = !!(dP && dP.tipo === "catalogo" && cands.length);
      var conflitoP = null;
      if (!explicitoP && cands.length && el && el !== "varia") {
        var mesmoEl = cands.filter(function (e) { return e.elemento === el; });
        var comElemento = cands.filter(function (e) { return e.elemento; });
        if (mesmoEl.length) cands = mesmoEl;
        else if (comElemento.length === cands.length) conflitoP = cands;
      }
      if (cands.length > 1) {
        var daClasse = cands.filter(function (e) { return (e.classes || []).indexOf(classe) >= 0 || e.tipo === "paranormal" || e.tipo === "geral"; });
        if (daClasse.length) cands = daClasse;
      }
      var e = null;
      if (explicitoP) { e = cands[0]; mP.estado = "escolhido"; }
      else if (conflitoP) {
        mP.estado = "conflito"; mP.candidatos = conflitoP.map(function (x) { return x.chave; });
        mP.motivo = "Há “" + conflitoP[0].nome + "” no catálogo, mas de " + conflitoP.map(function (x) { return x.elemento; }).join(" ou ") + "; no CRIS o elemento é " + p.element + ".";
      } else if (cands.length > 1) {
        mP.estado = "sem_destino"; mP.candidatos = cands.map(function (x) { return x.chave; });
        mP.motivo = "Há mais de uma habilidade com esse nome no catálogo (" + cands.map(function (x) { return x.nome + " · " + x.tipo; }).join("; ") + ").";
      } else if (cands.length === 1) {
        e = cands[0]; mP.estado = "sugerido"; mP.motivo = opcoesDoNome ? "Reconhecido como " + e.nome + ", com o elemento do nome." : "Nome do catálogo.";
      }

      if (!e) {
        var hbP = !conflitoP && cands.length < 2 ? homebrewPorNome(hbHabilidades, p.name) : [];
        var habilidade = hbP.length === 1 ? H.copiarParaFicha(hbP[0]) : null;
        if (habilidade) {
          mP.estado = "sugerido"; mP.destino = { tipo: "homebrew", registro: hbP[0] }; mP.motivo = "Mesmo nome na Homebrew (" + textoDoHomebrew(hbP[0]) + ").";
        } else {
          habilidade = H.criarHabilidade({ nome: String(p.name || "Poder do CRIS").slice(0, 120), texto: textoSeguro(p.description, 8000), origem: "CRIS" });
          if (!mP.estado) { mP.estado = "sem_destino"; mP.motivo = "Nenhuma habilidade do catálogo ou da Homebrew tem esse nome."; }
          if (hbP.length) mP.candidatosHomebrew = hbP.map(function (h) { return h.id; });
          aviso("poder_personalizado", "informacao", "powers." + i, "“" + p.name + "” não está no catálogo e entrou provisoriamente como habilidade de texto (pasta Importado do CRIS), sem efeito de conta.");
        }
        H.inserir(ficha.habilidades, habilidade, pastaDoCris().id);
        mP.habilidadeId = habilidade.id;
        aquisicoes.push({ ref: refAq, chave: "", nome: String(habilidade.nome || "").slice(0, 120), nomeOriginal: p.name, tipo: "personalizado", representacao: "texto", procedencia: mP.destino && mP.destino.tipo === "homebrew" ? "Homebrew" : "desconhecida" });
        return;
      }
      if (!mP.destino) mP.destino = { tipo: "catalogo", id: e.chave };
      mP.poderChave = e.chave;
      if (automaticas[e.chave] || habTrilha[e.chave] && !habTrilha[e.chave].opcoes.length) {
        aquisicoes.push({ ref: refAq, chave: e.chave, nome: e.nome, nomeOriginal: p.name, tipo: e.tipo, representacao: "regras", procedencia: automaticas[e.chave] ? "classe" : "trilha " + trilhaAtual.nome });
        mP.destino = { tipo: "regras", id: e.chave, rotulo: e.nome + " · dado pela " + (automaticas[e.chave] ? "classe" : "trilha " + trilhaAtual.nome) };
        mP.motivo = "Já vem da " + (automaticas[e.chave] ? "classe" : "trilha") + ": entra uma vez, pelas regras, sem duplicar.";
        return;
      }
      contagemPorChave[e.chave] = (contagemPorChave[e.chave] || 0) + 1;
      var repetida = contagemPorChave[e.chave] > 1;
      if (repetida && !e.repetivel && e.tipo !== "paranormal") {
        aviso("poder_repetido", "revisao", "powers." + i, e.nome + " aparece mais de uma vez e não é repetível: a segunda ficou de fora.");
        mP.destino = { tipo: "regras", id: e.chave, rotulo: "Fica de fora: " + e.nome + " já está na ficha e não é repetível" };
        return;
      }
      var aq = { ref: refAq, chave: e.chave, nome: e.nome, nomeOriginal: p.name, tipo: e.tipo, elemento: e.elemento || "", afinidade: repetida && e.tipo === "paranormal", representacao: "importada", procedencia: "desconhecida" };
      if (opcoesDoNome) aq.opcoes = opcoesDoNome;
      else {
        var escolhidas = opcoesDoPoder(e, p, i);
        if (escolhidas) aq.opcoes = escolhidas;
      }
      if (e.tipo === "alteracao") aq.procedencia = "alteração por exposição (NEX & Experiência)";
      else if (habTrilha[e.chave]) aq.procedencia = "trilha " + trilhaAtual.nome + " (opção não informada)";
      else if (e.tipo === "classe" && (e.classes || []).indexOf(classe) < 0) {
        var fontes = [];
        if (nomesDePoderes.indexOf(chaveDeTexto("Especialista Diletante")) >= 0) fontes.push("Especialista Diletante");
        if (nomesDePoderes.indexOf(chaveDeTexto("Expansão de Conhecimento")) >= 0) fontes.push("Expansão de Conhecimento");
        aq.procedencia = fontes.length ? "poder de outra classe (provavelmente " + fontes.join(" ou ") + ")" : "poder de outra classe (procedência desconhecida)";
      }
      else if (e.tipo === "trilha") {
        /* Versatilidade (NEX 50%): o primeiro poder de outra trilha da classe. */
        var primeira = e.trilha ? P.primeiraDaTrilha(e.trilha) : null;
        var temVersatilidade = E.vagas(o).some(function (v) { return v.tipo === "versatilidade" && v.degrau <= marco.degrau; });
        aq.procedencia = primeira && primeira.chave === e.chave && temVersatilidade && C.trilhasDaClasse(classe).some(function (tr) { return tr.chave === e.trilha; })
          ? "provavelmente Versatilidade (primeiro poder de " + ((C.trilha(e.trilha) || {}).nome || e.trilha) + ")"
          : "habilidade de trilha fora da trilha da ficha (procedência desconhecida)";
      }

      /* Procedência: um item com o nome do poder (Dedo Decepado (X)). */
      var itemDoPoder = infoItens.filter(function (x) { var par = /\(([^)]*)\)\s*$/.exec(x.cris.name || ""); return par && chaveDeTexto(par[1]) === k; })[0];
      if (itemDoPoder) {
        var proc = revisao("procedencia:" + (p.id || i), "Procedência de " + e.nome, "O inventário tem “" + itemDoPoder.cris.name + "” (" + (itemDoPoder.cris.equipped === true ? "em uso" : "guardado") + "). O CRIS não diz se o poder vem do item.",
          [{ valor: "ficha", rotulo: "Poder da ficha (procedência desconhecida)" }, { valor: "item", rotulo: "Concedido pelo item: sem efeito fora dele" }], "ficha");
        if (proc === "item") {
          aq.representacao = "item";
          aq.procedencia = "concedido por " + itemDoPoder.cris.name;
        }
      }
      aquisicoes.push(aq);
    });

    /* Origem com poder à escolha (Traços do Outro Lado): de onde veio é
       procedência anotada, sem registro fictício na progressão. */
    if (origemEntrada && origemEntrada.escolha && origemEntrada.escolha.tipo === "poderParanormal") {
      var paranormais = aquisicoes.filter(function (a) { return a.tipo === "paranormal" && a.representacao === "importada"; });
      if (paranormais.length) {
        var deOrigem = revisao("origem:poder", origemEntrada.poder, "A origem dá um poder paranormal, e o CRIS não diz qual. Indicar não muda a conta (cada poder entra uma vez só); fica anotado como procedência.",
          [{ valor: "", rotulo: "Não informado" }].concat(paranormais.map(function (a) { return { valor: a.ref, rotulo: a.nome }; })), "");
        paranormais.forEach(function (a) { if (a.ref === deOrigem) a.procedencia = "origem " + origemEntrada.nome + " (" + origemEntrada.poder + ")"; });
      }
    }

    /* ---------- ataques ---------- */
    var ataquesPorItem = {};
    var ataquesFora = 0;
    (Array.isArray(src.attacks) ? src.attacks : []).forEach(function (a, i) {
      var chaveA = "ataque:" + (a.id || i);
      var vin = typeof vinculos[chaveA] === "string" ? vinculos[chaveA] : "";
      var itemCris = a.itemId ? inventarioCris.filter(function (x) { return String(x.id) === String(a.itemId); })[0] : null;
      var mA = meta(chaveA, { secao: "inventario", tipo: "ataque", rotulo: "Ataque “" + String(a.name || "sem nome") + "”",
        cris: (a.damage || "—") + (a.damageType ? " " + a.damageType : "") + " · crítico " + (a.criticalRange || "—") + "/x" + (a.criticalMult || "—") + (a.skillUsed ? " · " + a.skillUsed : "") + (itemCris ? " · ligado a “" + itemCris.name + "”" : a.itemId ? " · ligado a um item ausente" : " · sem item"),
        dadosCris: { nome: String(a.name || ""), dano: String(a.damage || ""), itemCris: itemCris ? String(itemCris.name || "") : "", itemChaveCris: itemCris ? "item:" + itemCris.id : "" },
        vinculo: vin || "", explicita: !!vin });
      if (vin === "ignorar" || vin === "anotacao") {
        mA.estado = "escolhido";
        if (vin === "anotacao") paraAnotacao(chaveA, "Ataque do CRIS: " + (a.name || "?"), "Dano " + (a.damage || "—") + (a.damageType ? " (" + a.damageType + ")" : "") + ", crítico " + (a.criticalRange || "—") + "/x" + (a.criticalMult || "—") + ", perícia " + (a.skillUsed || "—") + ", atributo " + (a.damageAttribute || "—") + (itemCris ? ". Ligado a “" + itemCris.name + "” no CRIS." : "."));
        ataquesFora++;
        return;
      }
      var alvo = vin.indexOf("item:") === 0 ? porChaveItem[vin] : (vin === "proprio" ? null : (a.itemId ? porIdCris[String(a.itemId)] : null));
      if (alvo && alvo.item.tipo === "arma") {
        (ataquesPorItem[alvo.item.id] = ataquesPorItem[alvo.item.id] || []).push(a);
        if (!alvo.ataqueChave) alvo.ataqueChave = chaveA;
        mA.alvoChave = alvo.chave; mA.itemId = alvo.item.id;
        if (vin) mA.estado = "escolhido";
        else { mA.estado = "sugerido"; mA.motivo = "O CRIS liga o ataque a este item: ele acompanha o destino escolhido para o item, mesmo com outro nome."; }
        return;
      }
      if (vin.indexOf("item:") === 0 || (!vin && a.itemId)) {
        mA.estado = "conflito";
        mA.motivo = vin ? "O item escolhido não está na ficha como arma." : (itemCris ? "“" + itemCris.name + "” não está na ficha como arma (destino escolhido para ele); diga onde este ataque fica." : "O item ligado no CRIS não existe.");
      } else if (vin === "proprio") mA.estado = "escolhido";
      else { mA.estado = "sugerido"; mA.motivo = "Sem item no CRIS: vira uma arma própria de 0 espaço, para a rolagem continuar existindo."; }
      mA.alvoChave = "proprio";
      /* Ataque sem item (ou com item que não é arma): uma arma de 0
         espaço, identificada, para a rolagem continuar existindo — sem
         inventar um exemplar do item. */
      var semItem = F.criarItem("arma", {
        nome: ("Ataque: " + String(a.name || "sem nome")).slice(0, 80), categoria: "Importado do CRIS",
        descricao: "Ataque do CRIS sem item correspondente no inventário" + (a.itemId ? " (o item ligado não existe ou não é arma)" : "") + ". Não ocupa espaço nem conta na patente.",
        critico: Math.max(1, Math.min(20, Math.round(numeroOuNulo(a.criticalRange) || 20))),
        multiplicador: Math.max(1, Math.min(10, Math.round(numeroOuNulo(a.criticalMult) || 2))),
        ordem: { espacos: 0, quantidade: 1, arma: { tipo: /dist|curto|medio|longo/.test(chaveDeTexto(a.range)) ? "distancia" : "corpoACorpo", tipoDano: String(a.damageType || "").slice(0, 20) } },
      });
      semItem.ordem.categoria = null;
      ficha.inventario.itens.push(semItem);
      mA.itemId = semItem.id;
      (ataquesPorItem[semItem.id] = ataquesPorItem[semItem.id] || []).push(a);
      infoItens.push({ item: semItem, cris: { name: a.name, damage: a.damage, criticalRange: a.criticalRange, criticalMult: a.criticalMult }, entrada: null, identificacao: "ataqueSemItem", indice: -1, chave: "ataque:" + (a.id || i) });
      aviso("ataque_sem_item", "revisao", "attacks." + i, "O ataque “" + a.name + "” não tem item no inventário: virou uma arma de 0 espaço com os valores observados.");
    });

    /* ---------- arma favorita (A Favorita): só se a trilha a dá ---------- */
    var favoritaVaga = null;
    if (o.trilha === "aniquilador" && R.trilho(o).nexEquivalente >= 10) {
      var armas = infoItens.filter(function (x) { return x.item.tipo === "arma" && x.identificacao !== "ataqueSemItem"; });
      if (armas.length) {
        var fav = revisao("favorita", "Arma favorita (A Favorita)", "A trilha Aniquilador escolhe uma arma favorita, e o CRIS não guarda qual. Escolher reduz a categoria dela pela regra (I, II em NEX 40%); sem escolher, a categoria observada fica como ajuste de composição desconhecida.",
          [{ valor: "", rotulo: "Não informada (decidir depois)" }].concat(armas.map(function (x) { return { valor: x.chave, rotulo: x.item.nome }; })), "");
        var armaFav = armas.filter(function (x) { return x.chave === fav; })[0];
        if (armaFav) favoritaVaga = { itemId: armaFav.item.id, nome: armaFav.item.nome };
      }
    }
    if (favoritaVaga) {
      var vaga = E.vagas(o).filter(function (v) { return v.id === "b.aFavorita"; })[0];
      if (vaga) E.registrar(o, vaga, { valor: "aFavorita", opcoes: { arma: favoritaVaga.nome, itens: [favoritaVaga.itemId] } });
    }

    /* ---------- reconciliação dos itens ---------- */
    function calc() { return R.calcular(o, ficha.inventario); }

    var itensEscolhidos = {};
    infoItens.forEach(function (x) { if (x.explicito) { itensEscolhidos[x.item.id] = true; x.editado = true; } });
    infoItens.forEach(function (info) { reconciliarItem(info); });
    /* Personalizado editado no assistente: o que a pessoa escreveu vale
       mais que o número observado no CRIS. Os ajustes de reconciliação dos
       campos editados saem; a rolagem volta a ser montada com eles. */
    infoItens.forEach(function (info) {
      if (info.identificacao !== "personalizadoEditado") return;
      var dpx = (destinoDe(info.chave) || {}).dados || {};
      aplicarCamposPersonalizados(info.item, dpx);
      var aj = info.item.ordem && info.item.ordem.ajustesImportados;
      if (aj) {
        var saem = { dano: ["dadosDano"], critico: ["margem"], multiplicador: ["multiplicador"], categoria: ["categoria"], espacos: ["espacos"], defesa: ["defesa"] };
        Object.keys(saem).forEach(function (campo) {
          if (dpx[campo] !== undefined && dpx[campo] !== null && dpx[campo] !== "") saem[campo].forEach(function (k2) { delete aj[k2]; });
        });
        if (!Object.keys(aj).some(function (k2) { return k2 !== "motivo"; })) delete info.item.ordem.ajustesImportados;
      }
      info.editado = true;
    });

    /* Item com destino escolhido (Catálogo ou Homebrew): vale o modelo
       escolhido (dado, crítico, categoria, espaços, Defesa), não o número
       observado no CRIS. O que é do ATAQUE — bônus no teste e a parte fixa
       do dano — acompanha a arma escolhida. */
    function ajustarItem(item, chave, valor, motivo) {
      if (!valor) return;
      if (itensEscolhidos[item.id] && chave !== "ataque" && chave !== "dano") return;
      if (!item.ordem.ajustesImportados) item.ordem.ajustesImportados = {};
      item.ordem.ajustesImportados[chave] = (item.ordem.ajustesImportados[chave] || 0) + valor;
      item.ordem.ajustesImportados.motivo = ((item.ordem.ajustesImportados.motivo ? item.ordem.ajustesImportados.motivo + " · " : "") + motivo).slice(0, 300);
    }

    function valorDoAtributoDeDano(arma, chave) {
      if (chave === "melhor") return Math.max(R.atributo(o, "for"), R.atributo(o, "agi"));
      if (["for", "agi", "int", "pre", "vig"].indexOf(chave) >= 0) return R.atributo(o, chave);
      return 0;
    }

    function reconciliarItem(info) {
      var item = info.item, it = info.cris;
      var nomeVisivel = item.nome;
      var ataques = ataquesPorItem[item.id] || [];

      if (item.tipo === "arma") {
        var at = ataques[0] || null;
        info.ataque = at;
        if (ataques.length > 1) {
          var outros = ataques.slice(1).map(function (a) { return "• " + (a.name || "Ataque") + ": " + (a.damage || "—") + " (" + (a.damageType || "") + "), crítico " + (a.criticalRange || "—") + "/x" + (a.criticalMult || "—") + ", perícia " + (a.skillUsed || "—") + ", atributo " + (a.damageAttribute || "—"); }).join("\n");
          item.descricao = ((item.descricao ? item.descricao + "\n\n" : "") + "Outras configurações de ataque no CRIS (rolar à mão):\n" + outros).slice(0, 2000);
          aviso("varios_ataques", "revisao", "attacks", "“" + nomeVisivel + "” tem " + ataques.length + " ataques no CRIS: o primeiro configura a arma; os outros ficaram descritos no item.");
        }
        var pericia = at && at.skillUsed ? C.PERICIAS.filter(function (p) { return chaveDeTexto(p.nome) === chaveDeTexto(at.skillUsed); })[0] : null;
        if (pericia) item.ordem.pericia = pericia.chave;
        if (!item.ordem.arma) item.ordem.arma = {};
        var atrDano = at && at.damageAttribute !== undefined ? atributoDeTexto(at.damageAttribute) || (chaveDeTexto(at.damageAttribute) === "" || /nenhum/.test(chaveDeTexto(at.damageAttribute)) ? "nenhum" : "") : "";
        if (atrDano) item.ordem.arma.atributoDano = atrDano;

        var expr = analisarExpressao(at ? at.damage : it.damage);
        if (!expr.ok) {
          info.danoIncompleto = true; aviso("expressao_nao_suportada", "revisao", "attacks", "“" + nomeVisivel + "”: o dano “" + (at ? at.damage : it.damage) + "” não cabe no formato do R.A.M.A.; ficou descrito no item, para rolar à mão.");
          item.descricao = ((item.descricao ? item.descricao + "\n\n" : "") + "Dano no CRIS: " + (at ? at.damage : it.damage)).slice(0, 2000);
        } else if (expr.termos.length) {
          var dados = expr.termos.filter(function (t) { return t.tipo === "dados" && !t.negativo; });
          var constObs = expr.termos.filter(function (t) { return t.tipo === "constante"; }).reduce(function (s, t) { return s + t.valor; }, 0);
          if (expr.termos.some(function (t) { return t.negativo; })) { info.danoIncompleto = true; aviso("dado_negativo", "revisao", "attacks", "“" + nomeVisivel + "”: o dano tem dados subtraídos, que o R.A.M.A. não representa; foram ignorados na conta."); }
          var ef = R.armaEfetiva(o, ficha.inventario, item, ficha.pericias);
          var principalRama = /^(\d+)d(\d+)$/.exec(String(ef.dano || ""));
          var principal = dados[0];
          if (principal && principalRama && Number(principalRama[2]) === principal.faces) {
            var dif = principal.quantidade - Number(principalRama[1]);
            if (dif) {
              var golpe = aquisicoes.some(function (a) { return a.chave === "golpePesado"; }) && (item.ordem.arma.tipo === "corpoACorpo");
              ajustarItem(item, "dadosDano", dif, golpe ? "Golpe Pesado no CRIS (+1 dado); no R.A.M.A. ele é só descrito" : "dados de dano observados no CRIS");
            }
          } else if (info.explicito) {
            info.danoIncompleto = true;
          } else if (principal && !info.entrada) {
            item.dano = principal.quantidade + "d" + principal.faces;
          } else if (principal) {
            item.dano = principal.quantidade + "d" + principal.faces;
            info.danoIncompleto = true; aviso("dano_base_diferente", "revisao", "attacks", "“" + nomeVisivel + "”: o dado principal do CRIS (" + principal.quantidade + "d" + principal.faces + ") não é o do catálogo; ficou o observado, com composição desconhecida.");
          }
          var extras = dados.slice(1);
          var lancinante = (item.ordem.modificacoes || []).some(function (m) { return m.catalogoId === "op.maldicao.arma.lancinante"; });
          var extraAtual = analisarExpressao(item.danoExtra);
          var extraRama = extraAtual.ok ? extraAtual.termos.filter(function (t) { return t.tipo === "dados"; }) : [];
          var faltam = extras.filter(function (x) { return !extraRama.some(function (y) { return y.faces === x.faces && y.quantidade === x.quantidade; }); });
          if (faltam.length && !extraRama.length) {
            item.danoExtra = faltam[0].quantidade + "d" + faltam[0].faces;
            if (lancinante && faltam[0].faces === 8 && faltam[0].quantidade === 1) {
              item.ordem.arma.tipoDanoExtra = "Sangue";
              item.ordem.arma.extraMultiplica = true;
            } else if (at && at.damageType) item.ordem.arma.tipoDanoExtra = String(at.damageType).slice(0, 20);
            faltam = faltam.slice(1);
          }
          if (faltam.length) {
            item.descricao = ((item.descricao ? item.descricao + "\n\n" : "") + "Dados extras do CRIS sem lugar na arma: " + faltam.map(function (x) { return x.quantidade + "d" + x.faces; }).join(" + ") + " (rolar à mão).").slice(0, 2000);
            info.danoIncompleto = true; aviso("dano_composto", "revisao", "attacks", "“" + nomeVisivel + "”: o dano tem mais parcelas de dados do que a arma do R.A.M.A. guarda; as que sobraram ficaram descritas no item.");
          }
          var adicionais = at && Array.isArray(at.aditionalDamage) ? at.aditionalDamage.filter(function (x) { return x && x.value; }) : [];
          if (adicionais.length) {
            item.descricao = ((item.descricao ? item.descricao + "\n\n" : "") + "Dano adicional no CRIS (não automatizado): " + adicionais.map(function (x) { return x.value + (x.damageType ? " " + x.damageType : ""); }).join("; ") + ".").slice(0, 2000);
            aviso("dano_adicional", "revisao", "attacks", "“" + nomeVisivel + "”: " + adicionais.length + " parcela(s) de dano adicional (" + adicionais.map(function (x) { return x.value; }).join(", ") + ") ficaram descritas no item, sem rolagem automática.");
          }
          if (at && numeroOuNulo(at.extraDamage)) aviso("extra_legado", "revisao", "attacks", "“" + nomeVisivel + "”: o campo extraDamage (" + at.extraDamage + ") não é usado na rolagem do CRIS analisada; não foi somado.");

          ef = R.armaEfetiva(o, ficha.inventario, item, ficha.pericias);
          var atrVal = valorDoAtributoDeDano(item, ef.atributoDano || item.ordem.arma.atributoDano || "");
          var constRama = (ef.extra ? ef.extra.total : 0) - (ef.extra && ef.extra.parcelas.some(function (x) { return /^(Força|Agilidade|Intelecto|Presença|Vigor)$/.test(x.rotulo); }) ? atrVal : 0);
          ajustarItem(item, "dano", constObs - constRama, "parte fixa do dano observada no CRIS");

          if (at && numeroOuNulo(at.attackBonus)) ajustarItem(item, "ataque", numeroOuNulo(at.attackBonus), "bônus de ataque do CRIS");
          ef = R.armaEfetiva(o, ficha.inventario, item, ficha.pericias);
          var margemObs = numeroOuNulo(at ? at.criticalRange : it.criticalRange);
          if (margemObs !== null && ef.margem) ajustarItem(item, "margem", ef.margem - Math.max(1, Math.min(20, Math.round(margemObs))), "margem de ameaça observada no CRIS");
          var multObs = numeroOuNulo(at ? at.criticalMult : it.criticalMult);
          if (multObs !== null) ajustarItem(item, "multiplicador", Math.max(1, Math.min(10, Math.round(multObs))) - ef.multiplicador, "multiplicador observado no CRIS");

          /* As duas rolagens, lado a lado: normal e crítico. */
          ef = R.armaEfetiva(o, ficha.inventario, item, ficha.pericias);
          var mult = ef.multiplicador || 2;
          var atrFinal = ef.extra && ef.extra.parcelas.some(function (x) { return /^(Força|Agilidade|Intelecto|Presença|Vigor)$/.test(x.rotulo); }) ? atrVal : 0;
          var normal = montarExpressao(dados, constObs + atrFinal);
          var critCris = montarExpressao(dados.map(function (x) { return { quantidade: x.quantidade * mult, faces: x.faces }; }), constObs * mult + atrFinal);
          var pr = /^(\d+)d(\d+)$/.exec(String(ef.dano || ""));
          var dadosRama = [];
          if (pr) dadosRama.push({ quantidade: Number(pr[1]) * mult, faces: Number(pr[2]) });
          var exRama = analisarExpressao(item.danoExtra);
          (exRama.ok ? exRama.termos.filter(function (t) { return t.tipo === "dados"; }) : []).forEach(function (x) {
            dadosRama.push({ quantidade: x.quantidade * (ef.extraMultiplica ? mult : 1), faces: x.faces });
          });
          var critRama = montarExpressao(dadosRama, ef.extra ? ef.extra.total : 0);
          if (critCris !== critRama) {
            criticos.push({ item: nomeVisivel, origem: critCris, rama: critRama });
            revisao("critico:" + info.chave, "Crítico de " + nomeVisivel, "No crítico, o CRIS repete a expressão inteira (" + critCris + "); o R.A.M.A. multiplica só os dados (" + critRama + "). A ficha segue a regra do R.A.M.A.; a fórmula do CRIS fica anotada.",
              [{ valor: "rama", rotulo: "Entendi: usar a regra do R.A.M.A." }], "rama", { reconhecer: true });
          }
          info.rolagens = { normal: normal, criticoCris: critCris, criticoRama: critRama };
        }
      }

      if (item.tipo === "armadura") {
        var defObs = numeroOuNulo(it.defense);
        if (defObs !== null) {
          var defRama = R.defesaDaProtecao(item).total;
          ajustarItem(item, "defesa", Math.round(defObs) - defRama, "Defesa observada no CRIS");
        }
      }

      /* categoria e espaços: depois de tudo o que muda o item */
      var catObs = romanoOuNulo(it.category);
      function registroDeCategoria() {
        var uso = R.usoPorCategoria(o, ficha.inventario);
        var achado = null;
        Object.keys(uso.categorias).forEach(function (n) { uso.categorias[n].itens.forEach(function (x) { if (x.id === item.id) achado = x; }); });
        uso.acimaDeIV.forEach(function (x) { if (x.id === item.id) achado = x; });
        return achado;
      }
      if (catObs !== null) {
        var regCat = registroDeCategoria();
        /* Item personalizado: a categoria observada já inclui as
           modificações, então a base é o que sobra delas. */
        if (regCat && !info.entrada && !info.explicito && regCat.efetiva !== catObs && typeof item.ordem.categoria === "number") {
          item.ordem.categoria = Math.max(0, item.ordem.categoria + catObs - regCat.efetiva);
          regCat = registroDeCategoria();
        }
        if (regCat && regCat.efetiva !== catObs) {
          var motivoCat = "categoria observada no CRIS (" + rotuloRomano(catObs) + "); composição desconhecida";
          if (regCat.efetiva > catObs && o.trilha === "aniquilador" && item.tipo === "arma" && !favoritaVaga) motivoCat += " — uma arma favorita explicaria a redução";
          ajustarItem(item, "categoria", catObs - regCat.efetiva, motivoCat);
        }
      }
      var espObs = numeroOuNulo(it.slots);
      if (espObs !== null && espObs >= 0) {
        var ocup = R.ocupacaoDoInventario ? R.ocupacaoDoInventario(o, ficha.inventario) : null;
        var regEsp = ocup && ocup.itens ? ocup.itens.filter(function (x) { return x.id === item.id; })[0] : null;
        var espRama = regEsp ? regEsp.unitarioEfetivo : null;
        if (typeof espRama === "number" && !info.entrada && !info.explicito && Math.abs(espObs - espRama) >= 0.01) {
          item.ordem.espacos = Math.max(0, (numeroOuNulo(item.ordem.espacos) || 0) + espObs - espRama);
          espRama = espObs;
        }
        if (typeof espRama === "number" && Math.abs(espObs - espRama) >= 0.5) ajustarItem(item, "espacos", Math.round(espObs - espRama), "espaços observados no CRIS");
      }
    }

    /* ---------- rituais ---------- */
    ficha.rituais.itens = [];
    var ritualDaLinha = {};
    (Array.isArray(src.rituals) ? src.rituals : []).forEach(function (r, i) {
      var chaveR = "ritual:" + (r.id || i);
      var dR = destinoDe(chaveR);
      var circ = numeroOuNulo(r.circle);
      var mR = meta(chaveR, { secao: "rituais", tipo: "ritual", rotulo: String(r.name || "Ritual"),
        cris: (circ !== null ? circ + "º círculo" : "círculo —") + " · " + (r.element || "elemento —") + (r.execution ? " · " + r.execution : "") + (r.range ? " · " + r.range : ""),
        dadosCris: { nome: String(r.name || ""), circulo: circ, elemento: String(r.element || ""), execucao: String(r.execution || ""), alcance: String(r.range || ""), alvo: String(r.target || ""), area: String(r.area || ""),
          duracao: String(r.duration || ""), resistencia: String(r.save || r.resistance || ""), descricao: textoSeguro(r.description, 8000), custo: r.cost || "" },
        destino: dR, explicita: !!dR });
      if (dR && (dR.tipo === "anotacao" || dR.tipo === "ignorar")) {
        mR.estado = "escolhido";
        if (dR.tipo === "anotacao") paraAnotacao(chaveR, "Ritual do CRIS: " + (r.name || "?"), descricaoDoRitualCris(mR.dadosCris));
        return;
      }
      var cands = [];
      var ritual = null;
      var e = null;
      var conferirCatalogo = true;
      if (dR && dR.tipo === "catalogo") {
        e = catRituais.porId[dR.id] || null;
        if (e) { mR.estado = "escolhido"; conferirCatalogo = false; }
        else { mR.estado = "sem_destino"; mR.destino = null; mR.explicita = false; mR.motivo = "O ritual escolhido não existe mais no catálogo."; }
      } else if (dR && dR.tipo === "homebrew" && dR.registro) {
        var nr = F.normalizarRitual(dR.registro);
        if (nr) {
          ritual = F.criarRitual(Object.assign({}, nr, { origemHomebrewId: dR.registro.id || null }));
          if (U.aparar(dR.nome, 120)) ritual.nome = U.aparar(dR.nome, 120);
          if (typeof dR.descricao === "string") ritual.descricao = U.aparar(dR.descricao, 8000);
          mR.estado = "escolhido";
        }
      } else if (dR && dR.tipo === "personalizado") {
        var dr = dR.dados && typeof dR.dados === "object" ? dR.dados : {};
        var base = mR.dadosCris;
        var campoR = function (k) { return typeof dr[k] === "string" || typeof dr[k] === "number" ? String(dr[k]) : String(base[k] === null || base[k] === undefined ? "" : base[k]); };
        var circP = numeroOuNulo(campoR("circulo"));
        ritual = F.criarRitual({ nome: U.aparar(dr.nome, 120) || base.nome || "Ritual do CRIS", circulo: circP !== null ? circP + "º círculo" : "", elemento: campoR("elemento"),
          execucao: campoR("execucao"), alcance: campoR("alcance"), alvo: campoR("alvo"), area: campoR("area"), duracao: campoR("duracao"), resistencia: campoR("resistencia"),
          descricao: campoR("descricao"), complemento: "Ritual personalizado na importação do CRIS.",
          origemHomebrewId: dR.salvarHomebrew && dR.homebrewId ? String(dR.homebrewId).slice(0, 80) : null });
        mR.estado = "escolhido";
      }
      if (!ritual && !e && mR.estado !== "sem_destino") {
        candidatosDeNome(r.name).some(function (cand) {
          var kc = chaveDeTexto(cand.texto);
          cands = kc ? catRituais.rituais.filter(function (x) { return chaveDeTexto(x.nome) === kc; }) : [];
          return cands.length > 0;
        });
        if (cands.length > 1 && circ !== null) {
          var mesmoCirc = cands.filter(function (x) { return x.circulo === circ; });
          if (mesmoCirc.length) cands = mesmoCirc;
        }
        if (cands.length === 1) { e = cands[0]; mR.estado = "sugerido"; mR.motivo = "Nome do catálogo."; }
        else if (cands.length > 1) {
          mR.estado = "sem_destino"; mR.candidatos = cands.map(function (x) { return x.id; });
          mR.motivo = "Há mais de um ritual com esse nome no catálogo (" + cands.map(function (x) { return x.nome + " · " + x.circulo + "º · " + x.fonte; }).join("; ") + ").";
        }
      }
      /* Nome idêntico, círculo ou elemento diferentes: pede decisão. A
         prévia usa o catálogo até lá. */
      if (e && conferirCatalogo) {
        var elCr = ELEMENTO_POR_TEXTO[chaveDeTexto(r.element)];
        var difCirc = circ !== null && e.circulo !== circ;
        var difEl = !(e.escolha && e.escolha.tipo === "elemento") && elCr && elCr !== "varia" && e.elemento && elCr !== e.elemento && !e.todosOsElementos;
        if (difCirc || difEl) {
          mR.estado = "conflito"; mR.candidatos = [e.id];
          mR.motivo = "Há “" + e.nome + "” no catálogo, mas " + [difCirc ? "de " + e.circulo + "º círculo (no CRIS, " + circ + "º)" : "", difEl ? "de " + (RS.nomeDoElemento ? RS.nomeDoElemento(e.elemento) : e.elemento) + " (no CRIS, " + r.element + ")" : ""].filter(Boolean).join(" e ") + ".";
          if (difCirc) aviso("ritual_circulo", "revisao", "rituals." + i, r.name + ": o CRIS diz " + circ + "º círculo e o catálogo, " + e.circulo + "º.");
          if (difEl) aviso("ritual_elemento", "revisao", "rituals." + i, r.name + ": o CRIS diz " + r.element + " e o catálogo, " + e.elemento + ".");
        }
      }
      if (!ritual && !e && !cands.length && mR.estado !== "sem_destino") {
        var hbR = homebrewPorNome(hbRituais, r.name, function (h) { var nh = F.normalizarRitual(h); var ch = nh ? numeroOuNulo(String(nh.circulo || "").replace(/[^0-9]/g, "")) : null; return circ === null || ch === null || ch === circ; });
        if (hbR.length === 1 && F.normalizarRitual(hbR[0])) {
          ritual = F.criarRitual(Object.assign({}, F.normalizarRitual(hbR[0]), { origemHomebrewId: hbR[0].id || null }));
          mR.estado = "sugerido"; mR.destino = { tipo: "homebrew", registro: hbR[0] }; mR.motivo = "Mesmo nome na Homebrew (" + textoDoHomebrew(hbR[0]) + ").";
        } else {
          mR.estado = "sem_destino"; mR.motivo = "Nenhum ritual do catálogo ou da Homebrew tem esse nome.";
          if (hbR.length) mR.candidatosHomebrew = hbR.map(function (h) { return h.id; });
        }
      }
      if (e && !mR.destino) mR.destino = { tipo: "catalogo", id: e.id };
      if (ritual) {
        ritual.adicionadoEm = U.agoraISO();
        ficha.rituais.itens.push(ritual);
        ritualDaLinha[i] = ficha.rituais.itens.length; mR.ritualIndice = ficha.rituais.itens.length - 1;
        return;
      }
      if (e) {
        var elemento = undefined;
        if (e.escolha && e.escolha.tipo === "elemento") {
          var elCris = ELEMENTO_POR_TEXTO[chaveDeTexto(r.element)];
          if (elCris && elCris !== "varia" && e.escolha.opcoes.indexOf(elCris) >= 0) elemento = elCris;
          else {
            elemento = revisao("ritual-elemento:" + (r.id || i), "Elemento de " + e.nome, "O ritual é do elemento escolhido ao aprender, e o CRIS guarda “" + (r.element || "—") + "”. Escolha o elemento ou deixe para depois (o ritual entra sem elemento definido).",
              [{ valor: "", rotulo: "Não informado" }].concat(e.escolha.opcoes.map(function (x) { return { valor: x, rotulo: RS.nomeDoElemento ? RS.nomeDoElemento(x) : x }; })), "") || undefined;
          }
        } else {
          var elC = ELEMENTO_POR_TEXTO[chaveDeTexto(r.element)];
          if (elC && e.elemento && elC !== e.elemento && !e.todosOsElementos) aviso("ritual_elemento", "revisao", "rituals." + i, r.name + ": o CRIS diz " + r.element + " e o catálogo, " + e.elemento + ". Vale o catálogo.");
        }
        var montado = RS.paraFicha(e, { escolha: elemento });
        if (!montado.ok) montado = e.escolha ? RS.paraFicha(e, { escolha: e.escolha.opcoes[0] }) : montado;
        if (montado.ok && !elemento && e.escolha) {
          montado.dados.elemento = "Varia";
          if (montado.dados.ordem) delete montado.dados.ordem.elemento;
        }
        if (montado.ok) ritual = F.criarRitual(montado.dados);
        if (ritual && dR && dR.tipo === "catalogo") {
          if (U.aparar(dR.nome, 120)) ritual.nome = U.aparar(dR.nome, 120);
          if (typeof dR.descricao === "string") ritual.complemento = U.aparar(dR.descricao, 8000);
        }
      }
      if (!ritual) {
        var resist = String(r.save || r.resistance || "");
        ritual = F.criarRitual({
          nome: String(r.name || "Ritual do CRIS").slice(0, 120),
          circulo: circ !== null ? circ + "º círculo" : "",
          elemento: String(r.element || ""),
          execucao: String(r.execution || ""), alcance: String(r.range || ""), alvo: String(r.target || ""), area: String(r.area || ""),
          duracao: String(r.duration || ""), resistencia: resist,
          descricao: textoSeguro(r.description, 8000),
          complemento: "Ritual do CRIS sem correspondência no catálogo do R.A.M.A." + (r.cost ? " Custo no CRIS: " + r.cost + "." : ""),
        });
        aviso("ritual_personalizado", "informacao", "rituals." + i, "“" + r.name + "” não está no catálogo e entrou provisoriamente como ritual personalizado, com os campos do CRIS e a descrição em texto.");
      }
      ritual.adicionadoEm = U.agoraISO();
      ficha.rituais.itens.push(ritual);
      ritualDaLinha[i] = ficha.rituais.itens.length; mR.ritualIndice = ficha.rituais.itens.length - 1;
    });
    function descricaoDoRitualCris(dc) {
      return [(dc.circulo !== null ? dc.circulo + "º círculo" : "") + (dc.elemento ? " · " + dc.elemento : ""),
        dc.execucao ? "Execução: " + dc.execucao : "", dc.alcance ? "Alcance: " + dc.alcance : "", dc.alvo ? "Alvo: " + dc.alvo : "", dc.area ? "Área: " + dc.area : "",
        dc.duracao ? "Duração: " + dc.duracao : "", dc.resistencia ? "Resistência: " + dc.resistencia : "", dc.custo ? "Custo: " + dc.custo : "", dc.descricao].filter(Boolean).join("\n");
    }

    /* ---------- conferência ----------
       Cada valor que o CRIS mostra vira uma linha: o que o CRIS mostra, o
       que o R.A.M.A. calcula com o que foi reconhecido (antes de ajuste),
       o valor que a ficha terá e o porquê. Ajuste só onde a diferença ficou
       sem fonte reconhecida (ou a pessoa escolheu manter o número do CRIS).

       Cada linha sabe reler o próprio valor numa ficha qualquer (`ler`). No
       fim, ela é relida na ficha JÁ NORMALIZADA — a que vai ser criada — e
       de novo depois de exportar e importar. Valor que muda no caminho, ou
       que devia bater com o CRIS e não bate, é divergência. */
    function aviso_contar(codigo, campo) {
      return avisos.filter(function (a) { return a.codigo === codigo && (!campo || a.campo === campo); }).length;
    }
    function ajusteDaOrdem(alvo, valor, motivo) {
      if (!valor) return;
      o.ajustes.push({ id: U.uuid(), alvo: alvo, valor: valor, motivo: ("Importação CRIS: " + motivo).slice(0, 120), manual: true });
      ajustesDoc.push({ alvo: alvo, valor: valor, motivo: motivo });
    }
    function linha(l) {
      comparacao.push(Object.assign({ grupo: "Geral", tipo: "valor", ajuste: null, deveBater: false, motivo: "" }, l));
    }
    function sinal(n) { return (n > 0 ? "+" : "−") + Math.abs(n); }
    function nomesDasParcelas(lista) {
      var vistos = {};
      return lista.filter(function (x) { if (vistos[x.rotulo]) return false; vistos[x.rotulo] = true; return true; })
        .map(function (x) { return x.rotulo + " (" + sinal(x.valor) + ")"; }).join(", ");
    }

    var c = calc();

    /* A penalidade de sobrecarga é estado do momento (escolhido seguir o
       R.A.M.A. na carga): ela fica fora da comparação, para não virar
       um ajuste permanente que a desfaça. */
    function semSobrecarga(conta) {
      return conta.total - (conta.parcelas || []).filter(function (x) { return x.rotulo === "Sobrecarregado"; })
        .reduce(function (soma, x) { return soma + x.valor; }, 0);
    }

    /* Carga primeiro: a sobrecarga mexe na Defesa, no deslocamento e nas
       perícias de carga. No CRIS a mochila costuma entrar como espaço
       negativo; no R.A.M.A. a Mochila Militar soma capacidade. Quando o
       R.A.M.A. vê sobrecarga que a ficha do CRIS não aplicava, a decisão
       padrão mantém o estado do CRIS com um ajuste de capacidade. */
    var cargaCris = numeroOuNulo(src.currentLoad), capCris = numeroOuNulo(src.maxLoad);
    if (c.carga && c.carga.sobrecarregado) {
      var falta = c.carga.ocupado - c.carga.limite;
      var folgaCris = cargaCris !== null && capCris !== null ? Math.max(0, capCris - cargaCris) : 0;
      var ajusteCap = Math.ceil(falta + folgaCris);
      var crisSobrecarregada = cargaCris !== null && capCris !== null && cargaCris > capCris;
      var cargaDec = revisao("carga", "Carga", "O R.A.M.A. soma " + c.carga.ocupado + " espaços para uma capacidade de " + c.carga.limite +
        " (no CRIS: " + (cargaCris === null ? "—" : cargaCris) + " de " + (capCris === null ? "—" : capCris) + (crisSobrecarregada ? ", também acima, sem penalidade aplicada" : "") +
        "). Sobrecarregada, a ficha perde 5 na Defesa e nas perícias de carga e 3 m de deslocamento.",
        [{ valor: "cris", rotulo: "Manter como no CRIS: capacidade +" + ajusteCap + " (ajuste importado)" }, { valor: "rama", rotulo: "Seguir o R.A.M.A.: sobrecarregada, com as penalidades" }], "cris");
      if (cargaDec === "cris") {
        o.ajustes.push({ id: U.uuid(), alvo: "capacidade", valor: ajusteCap, motivo: "Importação CRIS: capacidade observada (mochila como espaço negativo)", manual: true });
        ajustesDoc.push({ alvo: "capacidade", valor: ajusteCap, motivo: "carga do CRIS sem sobrecarga" });
      }
      c = calc();
    }

    /* perícias: o bônus do CRIS já inclui o treino; um poder que o
       R.A.M.A. automatiza e o CRIS não somava não vira ajuste negativo
       sem a pessoa pedir. */
    var automatizadas = [];
    var sobrecargaFica = !!(calc().carga && calc().carga.sobrecarregado);
    function lerPericia(k) { return function (x) { return R.bonusDePericia(x.o, k, x.inv).total; }; }
    Object.keys(periciasCris).forEach(function (k) {
      var pc = periciasCris[k];
      linha({ entrada: "pericia:" + k, grupo: "Perícias", campo: pc.nome + " · grau e atributo", deveBater: true,
        cris: (C.grau(pc.grau) || {}).nome + " · " + pc.atributo.toUpperCase(),
        rama: (C.grau(R.grauDaPericia(o, k)) || {}).nome + " · " + R.atributoDaPericia(o, k).toUpperCase(),
        motivo: "grau e atributo do teste",
        ler: function (x) { return (C.grau(R.grauDaPericia(x.o, k)) || {}).nome + " · " + R.atributoDaPericia(x.o, k).toUpperCase(); } });
      if (pc.bonus === null) return;
      var bruto = R.bonusDePericia(o, k, ficha.inventario);
      var penal = bruto.total - semSobrecarga(bruto);
      var conta = { total: semSobrecarga(bruto), parcelas: bruto.parcelas.filter(function (x) { return x.rotulo !== "Sobrecarregado"; }) };
      var notaCarga = penal ? "; sobrecarregada pela decisão de carga (" + sinal(penal) + ")" : "";
      if (pc.bonus === conta.total) {
        linha({ entrada: "pericia:" + k, grupo: "Perícias", campo: pc.nome, cris: pc.bonus, rama: conta.total, motivo: "igual" + notaCarga, deveBater: !penal, ler: lerPericia(k) });
        return;
      }
      var efeitos = conta.parcelas.slice(1).filter(function (x) { return x.valor; });
      var x = { chave: k, nome: pc.nome, cris: pc.bonus, rama: conta.total, efeitos: efeitos, notaCarga: notaCarga, penal: penal };
      if (efeitos.length && !pc.outros) { automatizadas.push(x); return; }
      ajusteDaOrdem("pericia:" + k, pc.bonus - conta.total, "bônus de " + pc.nome + " observado no CRIS");
      linha({ entrada: "pericia:" + k, grupo: "Perícias", campo: pc.nome, cris: pc.bonus, rama: conta.total, ajuste: pc.bonus - conta.total, deveBater: !penal, ler: lerPericia(k),
        motivo: (pc.outros ? "total observado no CRIS (com " + sinal(pc.outros) + " em outros bônus)" : "diferença sem fonte reconhecida") + "; ajuste importado" + notaCarga });
    });
    if (automatizadas.length) {
      var segue = revisao("pericias:automaticas", "Perícias com efeito automático", "O R.A.M.A. aplica efeitos que o CRIS não aplicava: " +
        automatizadas.map(function (x) { return x.nome + " " + x.cris + " → " + x.rama + " (" + nomesDasParcelas(x.efeitos) + ")"; }).join("; ") + ".",
        [{ valor: "rama", rotulo: "Seguir o R.A.M.A. (o efeito vale)" }, { valor: "cris", rotulo: "Manter os totais do CRIS (ajuste negativo)" }], "rama");
      automatizadas.forEach(function (x) {
        if (segue === "cris") ajusteDaOrdem("pericia:" + x.chave, x.cris - x.rama, "total de " + x.nome + " mantido como no CRIS");
        linha({ entrada: "pericia:" + x.chave, grupo: "Perícias", campo: x.nome, cris: x.cris, rama: x.rama, ajuste: segue === "cris" ? x.cris - x.rama : null,
          deveBater: segue === "cris" && !x.penal, ler: lerPericia(x.chave),
          motivo: (segue === "cris" ? "total do CRIS mantido por decisão" : "o R.A.M.A. aplica " + nomesDasParcelas(x.efeitos) + "; o CRIS não aplicava") + x.notaCarga });
      });
    }

    /* máximos de recursos (PD só com a regra ligada) */
    var recursosPelaRegra = {};
    var pdLigada = src.isPdOn === true;
    c = calc();
    [["pv", "Pv", "PV"], ["pe", "Pe", "PE"], ["san", "San", "SAN"], ["pd", "Pd", "PD"]].forEach(function (r) {
      if (r[0] === "pd" && !pdLigada) return;
      var obs = numeroOuNulo(src["max" + r[1]]);
      if (obs === null || !c[r[0]]) return;
      var rama = c[r[0]].total;
      var lerMax = function (x) { return x.c[r[0]] ? x.c[r[0]].total : null; };
      if (obs === rama) { linha({ entrada: "rec:" + r[0], grupo: "Recursos", campo: r[2] + " máximo", cris: obs, rama: rama, motivo: "igual", deveBater: true, ler: lerMax }); return; }
      var motivo = r[0] === "san" && origem === "cultistaarrependido" && obs > rama
        ? "o R.A.M.A. aplica a metade da Sanidade da classe (Traços do Outro Lado); o CRIS não"
        : "máximo observado no CRIS; composição desconhecida";
      var escolha = revisao("maximo:" + r[0], r[2] + " máximo", "O CRIS mostra " + obs + "; o R.A.M.A. calcula " + rama + " (" + motivo + ").",
        [{ valor: "cris", rotulo: "Manter " + obs + " (ajuste importado " + sinal(obs - rama) + ")" }, { valor: "rama", rotulo: "Usar o cálculo do R.A.M.A. (" + rama + ")" }], "cris");
      if (escolha === "cris") ajusteDaOrdem(r[0], obs - rama, motivo);
      else recursosPelaRegra[r[0]] = true;
      linha({ entrada: "rec:" + r[0], grupo: "Recursos", campo: r[2] + " máximo", cris: obs, rama: rama, motivo: escolha === "cris" ? motivo : "cálculo do R.A.M.A. por decisão (" + motivo + ")",
        ajuste: escolha === "cris" ? obs - rama : null, deveBater: escolha === "cris", ler: lerMax });
      c = calc();
    });
    if (!pdLigada && numeroOuNulo(src.maxPd) !== null) observacoes.push("PD no CRIS: " + src.currentPd + "/" + src.maxPd + " (regra desligada; o valor atual fica guardado para quando ela for ligada).");

    /* defesa, bloqueio, esquiva — nessa ordem (bloqueio e esquiva leem a Defesa) */
    var protDef = numeroOuNulo(src.protectionDefense) || 0;
    var bonusDef = numeroOuNulo(src.bonusDefense) || 0;
    var defObs = 10 + o.atributos.agi + protDef + bonusDef;
    c = calc();
    var defRama = semSobrecarga(c.defesa);
    if (defObs !== defRama) {
      var diffDef = defObs - defRama;
      /* A maldição Defesa de acessório (+5) é descrita, não automatizada,
         no R.A.M.A.: quando ela explica a diferença, o motivo diz isso. */
      var sigilo = infoItens.filter(function (x) { return (x.item.ordem.modificacoes || []).some(function (m) { return m.catalogoId === "op.maldicao.acessorio.defesa"; }); })[0];
      var motivoDef = sigilo && diffDef === 5
        ? "provavelmente a maldição Defesa de “" + sigilo.item.nome + "” (+5), que o R.A.M.A. descreve sem automatizar; bônus extra importado"
        : "bônus de Defesa do CRIS sem fonte reconhecida; bônus extra importado";
      /* Proteção trocada no assistente: o padrão passa a ser a conta do
         R.A.M.A. com a proteção escolhida; a pessoa pode manter o CRIS. */
      var protecaoEscolhida = infoItens.some(function (x) { return x.explicito && x.item.tipo === "armadura"; });
      var decDef = revisao("defesa", "Defesa", "O CRIS mostra " + defObs + "; o R.A.M.A. calcula " + defRama + " (" + motivoDef.replace(/; bônus extra importado$/, "") + ").",
        [{ valor: "cris", rotulo: "Manter " + defObs + " (bônus extra importado " + sinal(diffDef) + ")" }, { valor: "rama", rotulo: "Usar o cálculo do R.A.M.A. (" + defRama + ")" }], protecaoEscolhida ? "rama" : "cris");
      if (decDef === "cris") {
        o.bonusExtra.defesa = (o.bonusExtra.defesa || 0) + diffDef;
        ajustesDoc.push({ alvo: "bonusExtra.defesa", valor: diffDef, motivo: "Defesa observada no CRIS (proteção " + protDef + ", bônus " + bonusDef + ")" + (sigilo && diffDef === 5 ? "; provável maldição Defesa de " + sigilo.item.nome : "") });
      }
      linha({ entrada: "def:defesa", grupo: "Defesas", campo: "Defesa", cris: defObs, rama: defRama, motivo: decDef === "cris" ? motivoDef : "cálculo do R.A.M.A. por decisão", ajuste: decDef === "cris" ? diffDef : null, deveBater: decDef === "cris" && !sobrecargaFica, ler: function (x) { return x.c.defesa.total; } });
    } else linha({ entrada: "def:defesa", grupo: "Defesas", campo: "Defesa", cris: defObs, rama: defRama, motivo: "igual", deveBater: !sobrecargaFica, ler: function (x) { return x.c.defesa.total; } });
    [["bloqueio", "block", "Bloqueio"], ["esquiva", "evade", "Esquiva"]].forEach(function (x) {
      var obs = numeroOuNulo(src[x[1]]);
      if (obs === null) return;
      var rama = calc()[x[0]].total;
      if (obs !== rama) {
        o.bonusExtra[x[0]] = (o.bonusExtra[x[0]] || 0) + (obs - rama);
        ajustesDoc.push({ alvo: "bonusExtra." + x[0], valor: obs - rama, motivo: x[2] + " observado no CRIS" });
      }
      linha({ entrada: "def:" + x[0], grupo: "Defesas", campo: x[2], cris: obs, rama: rama, motivo: obs === rama ? "igual" : "diferença sem fonte reconhecida; bônus extra importado",
        ajuste: obs === rama ? null : obs - rama, deveBater: !sobrecargaFica, ler: function (y) { return y.c[x[0]].total; } });
    });

    c = calc();
    var desl = numeroOuNulo(src.movement);
    if (desl !== null && c.deslocamento) {
      var deslRama = semSobrecarga(c.deslocamento);
      if (desl !== deslRama) ajusteDaOrdem("deslocamento", desl - deslRama, "deslocamento observado no CRIS");
      linha({ entrada: "def:deslocamento", grupo: "Defesas", campo: "Deslocamento", cris: desl, rama: deslRama, motivo: desl === deslRama ? "igual" : "diferença sem fonte reconhecida; ajuste importado",
        ajuste: desl === deslRama ? null : desl - deslRama, deveBater: !sobrecargaFica, ler: function (x) { return x.c.deslocamento.total; } });
    }
    c = calc();
    var limPe = numeroOuNulo(src.peTurn);
    if (limPe !== null && c.limitePe) {
      var limRama = c.limitePe.total;
      if (limPe !== limRama) ajusteDaOrdem("limitePe", limPe - limRama, "limite de PE observado no CRIS");
      linha({ entrada: "rec:limitePe", grupo: "Recursos", campo: "Limite de PE por turno", cris: limPe, rama: limRama, motivo: limPe === limRama ? "igual" : "diferença sem fonte reconhecida; ajuste importado",
        ajuste: limPe === limRama ? null : limPe - limRama, deveBater: true, ler: function (x) { return x.c.limitePe.total; } });
    }
    c = calc();
    var cap = numeroOuNulo(src.maxLoad);
    if (cap !== null && c.carga) linha({ entrada: "rec:carga", grupo: "Carga", campo: "Capacidade de carga", tipo: "info", cris: cap, rama: c.carga.limite,
      motivo: cap === c.carga.limite ? "igual" : "no CRIS a mochila pode entrar como espaço negativo; vale a conta do R.A.M.A.", ler: function (x) { return x.c.carga.limite; } });
    var cargaObs = numeroOuNulo(src.currentLoad);
    if (cargaObs !== null && c.carga) linha({ entrada: "rec:carga", grupo: "Carga", campo: "Carga ocupada", tipo: "info", cris: cargaObs, rama: c.carga.ocupado,
      motivo: cargaObs === c.carga.ocupado ? "igual" : "vale a soma dos itens no R.A.M.A.", ler: function (x) { return x.c.carga.ocupado; } });
    if (cargaObs !== null && capCris !== null && c.carga) linha({ entrada: "rec:carga", grupo: "Carga", campo: "Sobrecarregada", tipo: "info", cris: cargaObs > capCris ? "sim" : "não", rama: c.carga.sobrecarregado ? "sim" : "não",
      motivo: "estado da carga na ficha criada", ler: function (x) { return x.c.carga.sobrecarregado ? "sim" : "não"; } });
    var dtObs = numeroOuNulo(src.ritualsDc);
    var dtRama = RS.dtDeResistencia ? RS.dtDeResistencia(o) : null;
    if (dtObs !== null && ficha.rituais.itens.length && dtRama) {
      linha({ entrada: "rit:dt", grupo: "Rituais", campo: "DT dos rituais", cris: dtObs, rama: dtRama.total, motivo: dtObs === dtRama.total ? "igual" : "a DT é calculada pelo R.A.M.A. (10 + limite de PE + Presença)",
        ler: function (x) { var dt = RS.dtDeResistencia(x.o); return dt ? dt.total : null; } });
      if (dtObs !== dtRama.total) observacoes.push("DT dos rituais no CRIS: " + dtObs + "; no R.A.M.A.: " + dtRama.total + ".");
    }
    o.prestigio = Math.max(0, Math.round(numeroOuNulo(src.prestigePoints) || 0));
    c = calc();
    if (src.patent && c.patente && c.patente.patente) {
      var mesmaPatente = chaveDeTexto(src.patent) === chaveDeTexto(c.patente.patente.nome);
      linha({ entrada: "id:prestigio", grupo: "Identidade", campo: "Patente", tipo: "info", cris: String(src.patent), rama: c.patente.patente.nome,
        motivo: mesmaPatente ? "igual" : "a patente do R.A.M.A. sai dos pontos de prestígio; a do CRIS pode ser manual",
        ler: function (x) { var pt = x.c.patente; return pt && pt.patente ? pt.patente.nome : null; } });
      if (!mesmaPatente) observacoes.push("Patente no CRIS: " + src.patent + ".");
    }

    /* Limites de categoria da patente: o R.A.M.A. avisa, o CRIS não
       confere. Nada é removido; a ficha mostra o aviso no inventário. */
    var usoFinal = R.usoPorCategoria(o, ficha.inventario);
    var excedidas = Object.keys(usoFinal.categorias).filter(function (n) { return usoFinal.categorias[n].excedido; });
    if (excedidas.length || usoFinal.acimaDeIV.length) {
      aviso("limite_da_patente", "revisao", "inventory", "Pela patente " + (c.patente && c.patente.patente ? c.patente.patente.nome : "atual") +
        ", o R.A.M.A. aponta itens acima do limite" + (excedidas.length ? " nas categorias " + excedidas.map(function (n) { return rotuloRomano(Number(n)); }).join(", ") : "") +
        (usoFinal.acimaDeIV.length ? " e " + usoFinal.acimaDeIV.length + " item(ns) acima da categoria IV" : "") + ". O CRIS não confere isso; nada foi removido.");
    }

    /* ---------- recursos atuais: depois dos máximos finais ----------
       Sem descanso e sem preencher: o atual do CRIS, zero incluído. Só
       quando a pessoa escolheu o máximo do R.A.M.A. o atual cabe nele. */
    c = calc();
    o.recursos = { pv: null, pe: null, san: null, pd: null };
    [["pv", "currentPv"], ["pe", "currentPe"], ["san", "currentSan"], ["pd", "currentPd"]].forEach(function (x) {
      var v = numeroOuNulo(src[x[1]]);
      if (v === null) return;
      v = Math.round(v);
      if (c[x[0]] && v > c[x[0]].total) {
        var excedente = v - c[x[0]].total;
        if (x[0] !== "pd" && o.temporarios && !recursosPelaRegra[x[0]]) {
          o.temporarios[x[0]] = (o.temporarios[x[0]] || 0) + excedente;
          aviso("acima_do_maximo", "revisao", x[1], x[0].toUpperCase() + " atual no CRIS (" + v + ") passa do máximo (" + c[x[0]].total + "): o excedente (" + excedente + ") entrou como pontos temporários.");
        } else {
          observacoes.push(x[0].toUpperCase() + " atual no CRIS era " + v + "; ficou " + c[x[0]].total + " para caber no máximo do R.A.M.A.");
        }
        v = c[x[0]].total;
      }
      o.recursos[x[0]] = v;
    });

    /* ---------- conferência: identidade, atributos, recursos atuais,
       itens, ataques, rituais e contagens ---------- */
    var calcAgora = calc();
    linha({ entrada: "id:nome", grupo: "Identidade", campo: "Nome", cris: nomeOriginal, rama: ficha.nome, deveBater: nomeOriginal.length <= 80,
      motivo: nomeOriginal.length > 80 ? "o R.A.M.A. guarda 80 caracteres; o nome inteiro vai nas anotações" : "nome da ficha", ler: function (x) { return x.f.nome; } });
    linha({ entrada: "id:classe", grupo: "Identidade", campo: "Classe", cris: String(src.className || "—"), rama: (C.classe(o.classe) || {}).nome || "—", deveBater: !!classeAchada && classe === classeAchada.chave,
      motivo: classeAchada ? "classe do catálogo" : "classe escolhida na revisão", ler: function (x) { return (C.classe(x.o.classe) || {}).nome || "—"; } });
    linha({ entrada: "id:origem", grupo: "Identidade", campo: "Origem", cris: String(src.backgroundName || "—"), rama: origem ? C.origem(origem).nome : "—", deveBater: !!origemAchada,
      motivo: origemAchada ? "origem do catálogo" : (origem ? "origem escolhida na revisão" : "fora do catálogo; o nome fica nas anotações"),
      ler: function (x) { return x.o.origem ? (C.origem(x.o.origem) || {}).nome : "—"; } });
    linha({ entrada: "id:trilha", grupo: "Identidade", campo: "Trilha", tipo: "info", cris: "—", rama: o.trilha ? (C.trilha(o.trilha) || {}).nome : "—",
      motivo: "o CRIS não guarda a trilha; vale a decisão da revisão", ler: function (x) { return x.o.trilha ? (C.trilha(x.o.trilha) || {}).nome : "—"; } });
    linha({ entrada: "id:progressao", grupo: "Identidade", campo: porNivel ? "Progressão (NEX & Experiência)" : "NEX", tipo: porNivel ? "info" : "valor", deveBater: !porNivel && perfil === "agente",
      cris: String(src.nex), rama: R.trilho(o).rotulo + (porNivel ? " · exposição " + o.nex + "%" : ""),
      motivo: porNivel ? "o CRIS guarda o progresso como porcentagem; no R.A.M.A. é nível e exposição" : "NEX da ficha",
      ler: function (x) { return porNivel ? R.trilho(x.o).rotulo + " · exposição " + x.o.nex + "%" : x.o.nex + "%"; } });
    linha({ entrada: "id:opcionais", grupo: "Identidade", campo: "Jogando sem Sanidade (PD)", deveBater: true, cris: src.isPdOn === true ? "sim" : "não", rama: o.opcionais.semSanidade ? "sim" : "não",
      motivo: "regra opcional ligada só pelo campo do CRIS", ler: function (x) { return x.o.opcionais && x.o.opcionais.semSanidade ? "sim" : "não"; } });
    linha({ entrada: "id:opcionais", grupo: "Identidade", campo: "NEX & Experiência", deveBater: true, cris: porNivel ? "sim" : "não", rama: o.opcionais.nexExperiencia ? "sim" : "não",
      motivo: "regra opcional ligada só pelo campo do CRIS", ler: function (x) { return x.o.opcionais && x.o.opcionais.nexExperiencia ? "sim" : "não"; } });
    linha({ entrada: "id:prestigio", grupo: "Identidade", campo: "Pontos de prestígio", deveBater: true, cris: Math.max(0, Math.round(numeroOuNulo(src.prestigePoints) || 0)), rama: o.prestigio,
      motivo: "prestígio da ficha", ler: function (x) { return x.o.prestigio; } });

    [["for", "str", "Força"], ["agi", "dex", "Agilidade"], ["int", "int", "Intelecto"], ["pre", "pre", "Presença"], ["vig", "con", "Vigor"]].forEach(function (a) {
      var obsA = numeroOuNulo(attrs[a[1]]);
      if (obsA === null) return;
      var efetivo = R.atributo(o, a[0]);
      var foraDoLimite = obsA < 0 || obsA > 5;
      linha({ entrada: "atr:" + a[0], grupo: "Atributos", campo: a[2], cris: obsA, rama: efetivo, deveBater: !foraDoLimite && efetivo === o.atributos[a[0]],
        motivo: foraDoLimite ? "o R.A.M.A. limita o atributo de 0 a 5" : (efetivo !== o.atributos[a[0]] ? "o R.A.M.A. soma efeitos ao valor da ficha (" + o.atributos[a[0]] + ")" : "igual"),
        ler: function (x) { return R.atributo(x.o, a[0]); } });
    });

    [["pv", "currentPv", "PV"], ["pe", "currentPe", "PE"], ["san", "currentSan", "SAN"], ["pd", "currentPd", "PD"]].forEach(function (r) {
      var obsAtual = numeroOuNulo(src[r[1]]);
      if (obsAtual === null) return;
      var temp = r[0] !== "pd" && o.temporarios ? (o.temporarios[r[0]] || 0) : 0;
      var lerAtual = function (x) { var v = x.o.recursos[r[0]]; var t = r[0] !== "pd" && x.o.temporarios ? (x.o.temporarios[r[0]] || 0) : 0; return v === null || v === undefined ? null : v + t; };
      linha({ entrada: "rec:atuais", grupo: "Recursos", campo: r[2] + " atual" + (temp ? " (com temporários)" : "") + (r[0] === "pd" && !pdLigada ? " (regra desligada, guardado)" : ""),
        cris: Math.round(obsAtual), rama: o.recursos[r[0]] === null ? null : o.recursos[r[0]] + temp, deveBater: !recursosPelaRegra[r[0]],
        motivo: recursosPelaRegra[r[0]] ? "cabe no máximo do R.A.M.A., por decisão" : (temp ? "o excedente sobre o máximo entrou como pontos temporários" : "valor atual do CRIS, sem descanso"),
        ler: lerAtual });
    });

    var indiceSemItem = {};
    infoItens.forEach(function (info) { if (info.identificacao === "ataqueSemItem") indiceSemItem[ficha.inventario.itens.indexOf(info.item)] = true; });
    function itemDe(x, idx) { return x.inv.itens[idx]; }
    function categoriaDe(x, idx) {
      var it2 = itemDe(x, idx);
      if (!it2) return null;
      var achado = null;
      Object.keys(x.uso.categorias).forEach(function (n) { x.uso.categorias[n].itens.forEach(function (y) { if (y.id === it2.id) achado = y; }); });
      x.uso.acimaDeIV.forEach(function (y) { if (y.id === it2.id) achado = y; });
      return achado ? rotuloRomano(achado.efetiva) : "—";
    }
    function espacosDe(x, idx) {
      var it2 = itemDe(x, idx);
      var reg = it2 ? x.ocup.itens.filter(function (y) { return y.id === it2.id; })[0] : null;
      return reg ? reg.unitarioEfetivo : null;
    }
    function rolagemDe(x, idx) {
      var it2 = itemDe(x, idx);
      var ef = R.armaEfetiva(x.o, x.inv, it2, x.f.pericias);
      var dadosR = [];
      var pr = /^(\d+)d(\d+)$/.exec(String(ef.dano || ""));
      if (pr) dadosR.push({ quantidade: Number(pr[1]), faces: Number(pr[2]) });
      var ex = analisarExpressao(it2.danoExtra);
      (ex.ok ? ex.termos.filter(function (t) { return t.tipo === "dados"; }) : []).forEach(function (t) { dadosR.push(t); });
      return montarExpressao(dadosR, ef.extra ? ef.extra.total : 0);
    }
    var ctxConversao = { f: ficha, o: o, inv: ficha.inventario, c: calcAgora, uso: R.usoPorCategoria(o, ficha.inventario), ocup: R.ocupacaoDoInventario(o, ficha.inventario) };
    infoItens.forEach(function (info) {
      var idx = ficha.inventario.itens.indexOf(info.item);
      var it = info.cris;
      var nomeI = info.item.nome;
      if (info.identificacao !== "ataqueSemItem") {
        var catObsI = romanoOuNulo(it.category);
        var ajCat = (info.item.ordem.ajustesImportados || {}).categoria || 0;
        var catAgora = categoriaDe(ctxConversao, idx);
        if (catObsI !== null && catAgora !== "—") {
          linha({ entrada: info.chave, grupo: "Itens", campo: nomeI + " · categoria", cris: rotuloRomano(catObsI), rama: rotuloRomano(ROMANOS[String(catAgora).toLowerCase()] - ajCat),
            ajuste: ajCat || null, deveBater: !info.editado, motivo: ajCat ? info.item.ordem.ajustesImportados.motivo : (info.entrada ? "base do catálogo com as modificações" : "item personalizado"),
            ler: function (x) { return categoriaDe(x, idx); } });
        }
        var espObsI = numeroOuNulo(it.slots);
        if (espObsI !== null) {
          var ajEsp = (info.item.ordem.ajustesImportados || {}).espacos || 0;
          linha({ entrada: info.chave, grupo: "Itens", campo: nomeI + " · espaços", tipo: espObsI < 0 ? "info" : "valor", cris: espObsI, rama: espObsI < 0 ? espacosDe(ctxConversao, idx) : espacosDe(ctxConversao, idx) - ajEsp,
            ajuste: ajEsp || null, deveBater: espObsI >= 0 && !info.editado,
            motivo: espObsI < 0 ? "no CRIS a mochila entra como espaço negativo; no R.A.M.A. ela soma capacidade" : (ajEsp ? "espaços observados no CRIS; ajuste importado" : "espaços por unidade"),
            ler: function (x) { return espacosDe(x, idx); } });
        }
        if (info.item.tipo === "armadura") {
          var defObsI = numeroOuNulo(it.defense);
          if (defObsI !== null) linha({ entrada: info.chave, grupo: "Itens", campo: nomeI + " · Defesa", cris: defObsI, rama: R.defesaDaProtecao(info.item).total - ((info.item.ordem.ajustesImportados || {}).defesa || 0),
            ajuste: (info.item.ordem.ajustesImportados || {}).defesa || null, deveBater: !info.editado, motivo: info.editado ? "valor editado no assistente" : "Defesa da proteção",
            ler: function (x) { return R.defesaDaProtecao(itemDe(x, idx)).total; } });
          linha({ entrada: info.chave, grupo: "Itens", campo: nomeI + " · em uso", deveBater: true, cris: it.equipped === true ? "sim" : "não", rama: info.item.ordem.emUso ? "sim" : "não",
            motivo: "proteção vestida conta na Defesa", ler: function (x) { return itemDe(x, idx).ordem.emUso ? "sim" : "não"; } });
        }
      }
      if (info.item.tipo === "arma" && info.ataque && info.rolagens) {
        var at = info.ataque;
        var rotA = "Ataque " + (at.name || nomeI);
        linha({ entrada: info.ataqueChave || info.chave, grupo: "Ataques", campo: rotA + " · dano", cris: info.rolagens.normal, rama: info.rolagens.normal, deveBater: !info.danoIncompleto && !info.editado,
          motivo: info.danoIncompleto ? "o dano do CRIS não cabe inteiro na arma do R.A.M.A.; o resto está descrito no item" : "dano normal, com o atributo",
          ler: function (x) { return rolagemDe(x, idx); } });
        var margemC = numeroOuNulo(at.criticalRange) || 20, multC = numeroOuNulo(at.criticalMult) || 2;
        var critObs = margemC + "/x" + multC;
        var critForaDoLimite = margemC < 1 || margemC > 20 || multC < 1 || multC > 10;
        if (critForaDoLimite) aviso("critico_fora_do_limite", "revisao", "attacks", "“" + (at.name || nomeI) + "”: o crítico do CRIS (" + critObs + ") passa do que o R.A.M.A. aceita (margem de 1 a 20, multiplicador de ×1 a ×10); ficou no limite.");
        linha({ entrada: info.ataqueChave || info.chave, grupo: "Ataques", campo: rotA + " · margem e multiplicador", cris: critObs, rama: critObs, deveBater: !critForaDoLimite && !info.editado,
          motivo: critForaDoLimite ? "fora do limite do R.A.M.A. (margem 1 a 20, multiplicador ×1 a ×10)" : "crítico da arma",
          ler: function (x) { var ef = R.armaEfetiva(x.o, x.inv, itemDe(x, idx), x.f.pericias); return ef.margem + "/x" + ef.multiplicador; } });
        linha({ entrada: info.ataqueChave || info.chave, grupo: "Ataques", campo: rotA + " · dano no crítico", tipo: "info", cris: info.rolagens.criticoCris, rama: info.rolagens.criticoRama,
          motivo: info.rolagens.criticoCris === info.rolagens.criticoRama ? "igual" : "o CRIS repete a expressão inteira; o R.A.M.A. multiplica os dados (regra do R.A.M.A.)",
          ler: function () { return info.rolagens.criticoRama; } });
        var periciaAt = at.skillUsed ? C.PERICIAS.filter(function (pp) { return chaveDeTexto(pp.nome) === chaveDeTexto(at.skillUsed); })[0] : null;
        var nomeAtr = { "for": "Força", agi: "Agilidade", "int": "Intelecto", pre: "Presença", vig: "Vigor", melhor: "Força ou Agilidade", nenhum: "Nenhum" };
        linha({ entrada: info.ataqueChave || info.chave, grupo: "Ataques", campo: rotA + " · perícia e atributo do dano", deveBater: !!periciaAt,
          cris: (periciaAt ? periciaAt.nome : String(at.skillUsed || "—")) + " · " + (nomeAtr[atributoDeTexto(at.damageAttribute) || (/nenhum/.test(chaveDeTexto(at.damageAttribute)) || !at.damageAttribute ? "nenhum" : "")] || String(at.damageAttribute || "—")),
          rama: "", motivo: "perícia do teste e atributo somado ao dano",
          ler: function (x) { var it2 = itemDe(x, idx); var ef = R.armaEfetiva(x.o, x.inv, it2, x.f.pericias); return (ef.periciaNome || "—") + " · " + (nomeAtr[(it2.ordem.arma || {}).atributoDano] || "—"); } });
        var testeCris = periciaAt && periciasCris[periciaAt.chave] && periciasCris[periciaAt.chave].bonus !== null ? periciasCris[periciaAt.chave].bonus + (numeroOuNulo(at.attackBonus) || 0) : null;
        var efAgora = R.armaEfetiva(o, ficha.inventario, info.item, ficha.pericias);
        var dasMods = efAgora.ataque.parcelas.filter(function (pp) { return /modificação da arma|bônus de ataque da arma/.test(pp.origem || ""); });
        if (testeCris !== null) linha({ entrada: info.ataqueChave || info.chave, grupo: "Ataques", campo: rotA + " · bônus no teste", cris: testeCris, rama: efAgora.ataque.total,
          motivo: testeCris === efAgora.ataque.total ? "igual" : (dasMods.length ? "o R.A.M.A. soma " + nomesDasParcelas(dasMods) + " ao total da perícia; o CRIS não somava" : "o total da perícia difere (ver Perícias)"),
          ler: function (x) { return R.armaEfetiva(x.o, x.inv, itemDe(x, idx), x.f.pericias).ataque.total; } });
      }
    });
    function foraDaFicha(tipo) {
      return ordemMetas.filter(function (k2) { var m2 = metas[k2]; return m2.tipo === tipo && m2.destino && (m2.destino.tipo === "anotacao" || m2.destino.tipo === "ignorar" || m2.destino.tipo === "modificacao"); }).length;
    }
    var itensFora = foraDaFicha("item"), ritosFora = foraDaFicha("ritual");
    var nInvCris = (Array.isArray(src.inventory) ? src.inventory.length : 0) - itensFora;
    var nSemItem = Object.keys(indiceSemItem).length;
    linha({ grupo: "Contagens", campo: "Itens no inventário", cris: nInvCris, rama: ficha.inventario.itens.length - nSemItem, deveBater: true,
      motivo: (nSemItem ? "sem contar " + nSemItem + " arma(s) de 0 espaço criada(s) para ataques sem item" : "uma entrada por linha do CRIS") + (itensFora ? "; " + itensFora + " entrada(s) com outro destino (anotação, modificação ou fora)" : ""),
      ler: function (x) { return x.inv.itens.length - nSemItem; } });
    linha({ grupo: "Contagens", campo: "Ataques", tipo: "info", cris: Array.isArray(src.attacks) ? src.attacks.length : 0, rama: Object.keys(ataquesPorItem).reduce(function (s2, k2) { return s2 + ataquesPorItem[k2].length; }, 0),
      motivo: "o primeiro ataque de cada arma a configura; os outros ficam descritos no item", ler: function () { return Object.keys(ataquesPorItem).reduce(function (s2, k2) { return s2 + ataquesPorItem[k2].length; }, 0); } });
    var poderesForaDaConta = aviso_contar("poder_repetido");
    linha({ grupo: "Contagens", campo: "Poderes e habilidades", cris: poderes.length - poderesFora, rama: aquisicoes.length, deveBater: !poderesForaDaConta,
      motivo: (poderesForaDaConta ? poderesForaDaConta + " repetido(s) não repetível(is) ficou(aram) de fora" : "um registro por poder do CRIS") + (poderesFora ? "; " + poderesFora + " em Anotações ou fora, por escolha" : ""),
      ler: function (x) { return x.o.importacao ? x.o.importacao.aquisicoes.length : 0; } });
    linha({ grupo: "Contagens", campo: "Rituais", cris: (Array.isArray(src.rituals) ? src.rituals.length : 0) - ritosFora, rama: ficha.rituais.itens.length, deveBater: true,
      motivo: "um ritual por linha do CRIS" + (ritosFora ? "; " + ritosFora + " em Anotações ou fora, por escolha" : ""), ler: function (x) { return x.f.rituais.itens.length; } });

    var REPRESENTA = { importada: "efeito aplicado", regras: "dado pelas regras", item: "concedido por item", texto: "só texto" };
    var entradaDaAquisicao = {};
    ordemMetas.forEach(function (k2) { if (metas[k2].refAquisicao) entradaDaAquisicao[metas[k2].refAquisicao] = k2; });
    aquisicoes.forEach(function (aq, j) {
      linha({ entrada: entradaDaAquisicao[aq.ref] || "", grupo: "Poderes", campo: aq.nomeOriginal || aq.nome, tipo: "info", cris: "na ficha", rama: (REPRESENTA[aq.representacao] || aq.representacao) + (aq.chave && aq.nome !== aq.nomeOriginal ? " · " + aq.nome : ""),
        motivo: "procedência: " + (aq.procedencia || "desconhecida"),
        ler: function (x) { var a2 = x.o.importacao && x.o.importacao.aquisicoes[j]; return a2 ? (REPRESENTA[a2.representacao] || a2.representacao) + (a2.chave && a2.nome !== a2.nomeOriginal ? " · " + a2.nome : "") : null; } });
    });

    function rotuloDoRitual(r2) {
      if (!r2) return null;
      var circ2 = r2.ordem && r2.ordem.circulo ? r2.ordem.circulo : numeroOuNulo(String(r2.circulo || "").replace(/[^0-9]/g, ""));
      var el2 = r2.ordem && r2.ordem.elemento ? (RS.nomeDoElemento ? RS.nomeDoElemento(r2.ordem.elemento) : r2.ordem.elemento) : String(r2.elemento || "—");
      return (circ2 ? circ2 + "º" : "—") + " · " + el2;
    }
    (Array.isArray(src.rituals) ? src.rituals : []).forEach(function (r2, j) {
      var circC = numeroOuNulo(r2.circle);
      if (!ritualDaLinha[j]) return;
      var posRit = ritualDaLinha[j] - 1;
      var porIdRit = function (lista) { return lista[posRit]; };
      var rit = porIdRit(ficha.rituais.itens);
      var decidido = revisoes.some(function (rv) { return rv.chave === "ritual-elemento:" + (r2.id || j); });
      var escolhidoR = !!destinoDe("ritual:" + (r2.id || j));
      linha({ entrada: "ritual:" + (r2.id || j), grupo: "Rituais", campo: String(r2.name || "Ritual"), cris: (circC !== null ? circC + "º" : "—") + " · " + String(r2.element || "—"), rama: rotuloDoRitual(rit),
        deveBater: !decidido && !escolhidoR && !aviso_contar("ritual_circulo", "rituals." + j) && !aviso_contar("ritual_elemento", "rituals." + j),
        motivo: rit && rit.origemCatalogoId ? "ritual do catálogo" + (decidido ? "; elemento decidido na revisão" : "") : rit && rit.origemHomebrewId ? "ritual da Homebrew (cópia)" : "ritual personalizado" + (escolhidoR ? ", editado no assistente" : " com os campos do CRIS"),
        ler: function (x) { return rotuloDoRitual(porIdRit(x.f.rituais.itens)); } });
    });

    /* ---------- texto preservado ---------- */
    if (src.player) preservados.push({ titulo: "Jogador", texto: String(src.player).slice(0, 200) });
    if (src.proficiencies) preservados.push({ titulo: "Proficiências no CRIS", texto: String(src.proficiencies).slice(0, 2000) });
    if (src.resistances) preservados.push({ titulo: "Resistências no CRIS", texto: String(src.resistances).slice(0, 2000) });
    if (src.resistencias && Object.keys(src.resistencias).length) preservados.push({ titulo: "Resistências (lista) no CRIS", texto: Object.keys(src.resistencias).map(function (k) { return k + ": " + src.resistencias[k]; }).join("\n").slice(0, 2000) });
    if (Array.isArray(src.imunidades) && src.imunidades.length) preservados.push({ titulo: "Imunidades no CRIS", texto: src.imunidades.join(", ").slice(0, 2000) });
    if (Array.isArray(src.vulnerabilidades) && src.vulnerabilidades.length) preservados.push({ titulo: "Vulnerabilidades no CRIS", texto: src.vulnerabilidades.join(", ").slice(0, 2000) });
    if (nomeOriginal.length > 80) preservados.push({ titulo: "Nome completo", texto: nomeOriginal, deEntrada: "id:nome" });
    var desc = src.description || {};
    [["personal", "Personalidade"], ["goal", "Objetivo"], ["physical", "Aparência"], ["history", "História"], ["anotation", "Anotações do CRIS"]].forEach(function (x) {
      var t = textoSeguro(desc[x[0]]);
      if (t) preservados.push({ titulo: x[1], texto: t });
    });

    /* Textos sem lugar de regra (história, aparência, resistências…): cada
       um é uma entrada, sugerida para Anotações; "Não importar" tira. */
    var vistosTexto = {};
    preservados = preservados.filter(function (p) {
      if (p.deEntrada || p.semEntrada) return true;
      var base = "texto:" + (chaveDeTexto(p.titulo).replace(/ /g, "-") || "x");
      var chaveT = base, n = 2;
      while (vistosTexto[chaveT]) chaveT = base + "-" + n++;
      vistosTexto[chaveT] = true;
      var dT = destinoDe(chaveT);
      var ignorado = !!(dT && dT.tipo === "ignorar");
      meta(chaveT, { secao: "rituais", tipo: "texto", rotulo: p.titulo, cris: p.texto.length > 160 ? p.texto.slice(0, 160) + "…" : p.texto,
        dadosCris: { titulo: p.titulo, texto: p.texto }, destino: ignorado ? dT : { tipo: "anotacao" }, explicita: !!dT, estado: dT ? "escolhido" : "sugerido",
        motivo: dT ? "" : "Sem campo de regra no R.A.M.A.: vai para Anotações, pasta “Importado do CRIS”." });
      return !ignorado;
    });

    var pasta = F.criarPasta("Importado do CRIS");
    var notaOrigem = F.criarNota("Origem da importação");
    notaOrigem.conteudo = ["Importado do CRIS em " + (fonte.lidoEm || "") + " (" + ADAPTADOR + ").", "Link: " + ref.url,
      "Importação pontual: mudanças posteriores no CRIS não sincronizam.",
      "Marco: " + (marco.modo === "nivel" ? "nível " + marco.nivel + ", exposição " + marco.nex + "%" : marco.modo === "estagio" ? "estágio " + marco.estagio : "NEX " + marco.nex + "%") + ". As etapas até ele aparecem como histórico indisponível na Progressão."]
      .concat(ajustesDoc.length ? ["", "Ajustes importados:"].concat(ajustesDoc.map(function (a) { return "• " + a.alvo + " " + (a.valor > 0 ? "+" : "") + a.valor + " — " + a.motivo; })) : [])
      .concat(observacoes.length ? ["", "Observações:"].concat(observacoes.map(function (t) { return "• " + t; })) : [])
      .concat(criticos.length ? ["", "Críticos (CRIS × R.A.M.A.):"].concat(criticos.map(function (x) { return "• " + x.item + ": CRIS " + x.origem + "; R.A.M.A. " + x.rama; })) : [])
      .join("\n").slice(0, 20000);
    pasta.notas.push(notaOrigem);
    preservados.forEach(function (p) {
      var partes = [];
      for (var i = 0; i < p.texto.length; i += 19000) partes.push(p.texto.slice(i, i + 19000));
      if (partes.length > 1) aviso("texto_dividido", "informacao", p.titulo, "“" + p.titulo + "” passou de 20 000 caracteres e foi dividido em " + partes.length + " anotações.");
      partes.forEach(function (t, n) {
        var nota = F.criarNota(p.titulo + (partes.length > 1 ? " (" + (n + 1) + "/" + partes.length + ")" : ""));
        nota.conteudo = t;
        pasta.notas.push(nota);
      });
    });
    ficha.anotacoes.pastas.push(pasta);

    /* ---------- o marco, completo ---------- */
    o.importacao = {
      versao: 1, sistema: "cris",
      fonte: { url: ref.url, documentId: ref.documentId, lidoEm: fonte.lidoEm || U.agoraISO(), updateTime: fonte.updateTime || "", adaptador: ADAPTADOR },
      marco: marco,
      estadoAtualComoBase: true,
      aquisicoes: aquisicoes,
      revisoes: revisoes.map(function (r) { return { codigo: r.chave, campo: r.rotulo, valor: String(r.valor === undefined ? "" : r.valor), texto: r.texto }; }),
      observacoes: observacoes,
      ajustes: ajustesDoc,
      criticos: criticos,
      rituais: ficha.rituais.itens.map(function (r) { return r.id; }),
    };

    /* A ficha passa pela normalização de sempre: o que sair daqui é o que
       o R.A.M.A. grava, abre e exporta. */
    var normal = F.normalizarFicha(JSON.parse(JSON.stringify(ficha)));
    var cf = R.calcular(normal.ordem, normal.inventario);

    /* ---------- conferência final ----------
       Cada linha relida: (1) na ficha antes da normalização (o que o
       importador preparou), (2) na ficha normalizada — a que é criada — e
       (3) depois de exportar e importar o arquivo, como o botão "Baixar
       JSON RAMA" faria. */
    function contextoDe(fx) {
      return { f: fx, o: fx.ordem, inv: fx.inventario, c: R.calcular(fx.ordem, fx.inventario), uso: R.usoPorCategoria(fx.ordem, fx.inventario), ocup: R.ocupacaoDoInventario(fx.ordem, fx.inventario) };
    }
    function lerSeguro(l, x) {
      try { var v = l.ler ? l.ler(x) : l.rama; return v === undefined ? null : v; }
      catch (e) { return "erro na leitura (" + String(e && e.message || e).slice(0, 80) + ")"; }
    }
    function mesmo(a, b) {
      if (typeof a === "number" && typeof b === "number") return a === b;
      return chaveDeTexto(a === null || a === undefined ? "—" : a) === chaveDeTexto(b === null || b === undefined ? "—" : b);
    }
    var ctxPreparado = contextoDe(ficha), ctxNormal = contextoDe(normal), ctxArquivo = null;
    if (d.V && d.V.exportar && d.V.importado) {
      try {
        var volta = d.V.importado(JSON.parse(JSON.stringify(d.V.exportar("personagem", normal))));
        if (volta && volta.ok) ctxArquivo = contextoDe(volta.dados);
        else aviso("conferencia_arquivo", "revisao", "conferencia", "A ficha convertida não passou na importação de arquivo do R.A.M.A.: " + ((volta && (volta.mensagem || (volta.problemas || []).join("; "))) || "motivo desconhecido") + ".");
      } catch (e) { aviso("conferencia_arquivo", "revisao", "conferencia", "Não foi possível conferir a ficha exportada e importada de novo."); }
    }
    var divergentes = [];
    comparacao.forEach(function (l) {
      var preparado = lerSeguro(l, ctxPreparado);
      var naFicha = lerSeguro(l, ctxNormal);
      var noArquivo = ctxArquivo ? lerSeguro(l, ctxArquivo) : naFicha;
      if (l.rama === "" || l.rama === undefined) l.rama = preparado;
      var problema = "";
      if (!mesmo(naFicha, preparado)) problema = "a ficha criada mostra " + naFicha + ", e o importador preparou " + preparado;
      else if (!mesmo(noArquivo, naFicha)) problema = "depois de exportar e importar vira " + noArquivo;
      else if (l.deveBater && !mesmo(l.cris, naFicha)) problema = "devia ficar " + l.cris + " (como no CRIS) e ficou " + naFicha;
      l.final = naFicha;
      l.situacao = problema ? "divergente" : (mesmo(l.cris, naFicha) ? (l.ajuste ? "ajustado" : "igual") : (l.tipo === "info" ? "conferencia" : "regra"));
      l.igual = l.situacao === "igual";
      if (problema) { l.problema = problema; divergentes.push(l); }
      delete l.ler;
    });
    if (divergentes.length) {
      aviso("conferencia_divergente", "revisao", "conferencia", divergentes.length + " valor(es) não saem como o esperado na ficha criada: " +
        divergentes.slice(0, 6).map(function (l) { return l.campo + " (" + l.problema + ")"; }).join("; ") + (divergentes.length > 6 ? "…" : "") + ".");
    }
    var conferencia = { total: comparacao.length, arquivo: !!ctxArquivo };
    ["igual", "ajustado", "regra", "conferencia", "divergente"].forEach(function (k) {
      conferencia[k] = comparacao.filter(function (l) { return l.situacao === k; }).length;
    });

    var entradas = montarEntradas(ctxNormal);

    /* ---------- as entradas do assistente ----------
       Cada coisa que veio do CRIS e vai (ou não) para a ficha: o que era
       lá → como fica aqui, o destino, as decisões dela e uma assinatura
       que muda quando o resultado muda. A tela marca "conferida" contra a
       assinatura: mudou, volta para a revisão. */
    function montarEntradas(x) {
      var FIXAS = [
        ["id:nome", "identidade", "Nome"], ["id:classe", "identidade", "Classe"], ["id:origem", "identidade", "Origem"], ["id:trilha", "identidade", "Trilha"],
        ["id:progressao", "identidade", porNivel ? "Nível e exposição" : (perfil === "sobrevivente" ? "Estágio" : "NEX")], ["id:opcionais", "identidade", "Regras opcionais"], ["id:prestigio", "identidade", "Prestígio e patente"],
        ["atr:for", "atributos", "Força"], ["atr:agi", "atributos", "Agilidade"], ["atr:int", "atributos", "Intelecto"], ["atr:pre", "atributos", "Presença"], ["atr:vig", "atributos", "Vigor"],
        ["pericias:automaticas", "pericias", "Efeitos automáticos nas perícias"],
        ["rec:pv", "recursos", "PV máximo"], ["rec:pe", "recursos", "PE máximo"], ["rec:san", "recursos", "Sanidade máxima"], ["rec:pd", "recursos", "PD máximo"], ["rec:atuais", "recursos", "Recursos atuais"],
        ["def:defesa", "recursos", "Defesa"], ["def:bloqueio", "recursos", "Bloqueio"], ["def:esquiva", "recursos", "Esquiva"], ["def:deslocamento", "recursos", "Deslocamento"],
        ["rec:limitePe", "recursos", "Limite de PE por turno"], ["rec:carga", "recursos", "Carga"],
        ["inv:favorita", "inventario", "Arma favorita"], ["rit:dt", "rituais", "DT dos rituais"],
      ];
      var peso = {};
      FIXAS.forEach(function (f2, n2) { peso[f2[0]] = n2; });
      var linhasPor = {};
      comparacao.forEach(function (l) { if (l.entrada) (linhasPor[l.entrada] = linhasPor[l.entrada] || []).push(l); });
      function entradaDaRevisao(ch) {
        if (ch === "classe" || ch === "origem" || ch === "trilha") return "id:" + ch;
        if (ch === "exposicao" || ch === "estagio") return "id:progressao";
        if (ch === "origem:poder") return "id:origem";
        if (ch === "carga") return "rec:carga";
        if (ch === "defesa") return "def:defesa";
        if (/^maximo:/.test(ch)) return "rec:" + ch.slice(7);
        if (ch === "pericias:automaticas") return ch;
        if (ch === "favorita") return "inv:favorita";
        var mm = /^(?:opcao|procedencia):([^:]+)/.exec(ch);
        if (mm) return "poder:" + mm[1];
        mm = /^ritual-elemento:(.+)$/.exec(ch);
        if (mm) return "ritual:" + mm[1];
        mm = /^critico:(.+)$/.exec(ch);
        if (mm) return porChaveItem[mm[1]] && porChaveItem[mm[1]].ataqueChave ? porChaveItem[mm[1]].ataqueChave : mm[1];
        return "id:classe";
      }
      var revPor = {};
      revisoes.forEach(function (rv) { (revPor[entradaDaRevisao(rv.chave)] = revPor[entradaDaRevisao(rv.chave)] || []).push(rv); });
      FIXAS.forEach(function (f2) { if (linhasPor[f2[0]] || revPor[f2[0]]) meta(f2[0], { secao: f2[1], tipo: metas[f2[0]] && metas[f2[0]].tipo || "valor", rotulo: f2[2] }); });
      Object.keys(linhasPor).concat(Object.keys(revPor)).forEach(function (k2) {
        if (metas[k2]) return;
        var sec = /^pericia/.test(k2) ? "pericias" : /^(item|ataque|mod|inv):/.test(k2) ? "inventario" : /^poder:/.test(k2) ? "poderes" : /^(ritual|rit|texto):/.test(k2) ? "rituais" : /^(rec|def):/.test(k2) ? "recursos" : /^atr:/.test(k2) ? "atributos" : "identidade";
        meta(k2, { secao: sec, tipo: "valor", rotulo: (linhasPor[k2] && linhasPor[k2][0].campo) || (revPor[k2] && revPor[k2][0].rotulo) || k2 });
      });

      function porId(lista, id2) { return id2 ? lista.filter(function (y) { return y.id === id2; })[0] : null; }
      function idxDe(id2) { for (var n2 = 0; n2 < x.inv.itens.length; n2++) if (x.inv.itens[n2].id === id2) return n2; return -1; }
      function valorTexto(v) { return v === null || v === undefined || v === "" ? "—" : String(v); }
      function rotuloDoDestino(m2) {
        var dz = m2.destino;
        if (m2.tipo === "ataque") {
          var v2 = m2.vinculo || "";
          if (v2 === "ignorar") return "Não importar";
          if (v2 === "anotacao") return "Anotações";
          if (m2.alvoChave === "proprio") return "Arma própria (0 espaço)";
          return m2.alvoChave && metas[m2.alvoChave] ? "Vinculado a “" + (porId(x.inv.itens, m2.itemId) || {}).nome + "”" : "";
        }
        if (!dz) return "";
        if (dz.tipo === "anotacao") return "Anotações";
        if (dz.tipo === "ignorar") return "Não importar";
        if (dz.tipo === "regras") return dz.rotulo || "Pelas regras";
        if (dz.tipo === "texto") return "Texto do item";
        if (dz.tipo === "modificacao") return "Modificação em outro item";
        if (dz.tipo === "personalizado") return "Personalizado" + (dz.salvarHomebrew ? " · também na Homebrew" : " · só na ficha");
        if (dz.tipo === "homebrew") return textoDoHomebrew(dz.registro) + " · " + String((dz.registro || {}).nome || "");
        if (dz.tipo === "catalogo") {
          if (m2.tipo === "item" || m2.tipo === "mod") { var ec = catItens.porId[dz.id]; return ec ? "Catálogo · " + ec.nome + " (" + (ITM.ROTULO_FONTE[ec.fonte] || ec.fonte) + ")" : "Catálogo"; }
          if (m2.tipo === "ritual") { var er = catRituais.porId[dz.id]; return er ? "Catálogo · " + er.nome + " (" + er.circulo + "º · " + er.fonte + ")" : "Catálogo"; }
          if (m2.tipo === "poder") { var ep = P.poder(dz.id); return ep ? "Catálogo · " + ep.nome + " (" + ep.tipo + ")" : "Catálogo"; }
          if (m2.tipo === "pericia") { var pk = C.pericia(dz.id); return pk ? "Perícia " + pk.nome : "Perícia"; }
        }
        return "";
      }
      function descreverItem(it2) {
        if (!it2) return "—";
        var n2 = idxDe(it2.id);
        var base = it2.origemCatalogoId && catItens.porId[it2.origemCatalogoId] ? catItens.porId[it2.origemCatalogoId].nome : "";
        var partes = [it2.nome + (base && chaveDeTexto(base) !== chaveDeTexto(it2.nome) ? " (base: " + base + ")" : "")];
        partes.push(it2.tipo === "arma" ? "arma" : it2.tipo === "armadura" ? "proteção" : "item");
        var cat2 = n2 >= 0 ? categoriaDe(x, n2) : "—";
        if (cat2 && cat2 !== "—") partes.push("cat. " + cat2);
        var esp2 = n2 >= 0 ? espacosDe(x, n2) : null;
        if (esp2 !== null && esp2 !== undefined) partes.push(esp2 + " esp.");
        if (it2.tipo === "arma" && n2 >= 0) partes.push(rolagemDe(x, n2));
        if (it2.tipo === "armadura") partes.push("Defesa +" + R.defesaDaProtecao(it2).total);
        var mods = ((it2.ordem || {}).modificacoes || []).map(function (mq) { return mq.nome; });
        if (mods.length) partes.push(mods.join(", "));
        return partes.join(" · ");
      }
      var REP = { importada: "efeito aplicado", regras: "dado pelas regras", item: "concedido por item", texto: "habilidade de texto" };

      var lista = ordemMetas.map(function (k2) {
        var m2 = metas[k2];
        var linhas2 = linhasPor[k2] || [];
        var revs = (revPor[k2] || []).map(function (rv) {
          return { chave: rv.chave, rotulo: rv.rotulo, texto: rv.texto, opcoes: rv.opcoes, valor: rv.valor, padrao: rv.padrao, reconhecer: !!rv.reconhecer, decidida: decisoes[rv.chave] !== undefined };
        });
        var estado2 = m2.estado;
        if (!estado2) {
          var decidida = revs.some(function (rv) { return rv.decidida; });
          var semDest = (k2 === "id:classe" && !classeAchada) || (k2 === "id:origem" && !origemAchada && !!src.backgroundName);
          estado2 = decidida ? "escolhido" : (semDest ? "sem_destino" : "sugerido");
        }
        var rama2 = "";
        var dz = m2.destino;
        if (m2.tipo === "ataque") {
          if (m2.vinculo === "ignorar") rama2 = "Não importado";
          else if (m2.vinculo === "anotacao") rama2 = "Guardado em Anotações";
          else {
            var arma2 = porId(x.inv.itens, m2.itemId);
            var n3 = arma2 ? idxDe(arma2.id) : -1;
            if (arma2 && n3 >= 0) {
              var ef2 = R.armaEfetiva(x.o, x.inv, arma2, x.f.pericias);
              rama2 = (m2.alvoChave === "proprio" ? "Arma própria “" : "Em “") + arma2.nome + "” · dano " + rolagemDe(x, n3) + " · crítico " + ef2.margem + "/x" + ef2.multiplicador + (ef2.periciaNome ? " · " + ef2.periciaNome : "");
            }
          }
        } else if (dz && dz.tipo === "anotacao") rama2 = "Guardado em Anotações (pasta “Importado do CRIS”)";
        else if (dz && dz.tipo === "ignorar") rama2 = "Não importado";
        else if (m2.tipo === "item") rama2 = descreverItem(porId(x.inv.itens, m2.itemId));
        else if (m2.tipo === "mod") rama2 = dz && dz.tipo === "catalogo" && estado2 !== "conflito" ? "Aplicada em “" + (porId(x.inv.itens, (metas[m2.itemChave] || {}).itemId) || {}).nome + "”" : dz && dz.tipo === "texto" ? "No texto do item" : "No texto do item (provisório)";
        else if (dz && dz.tipo === "modificacao") rama2 = m2.aplicadoEm ? "Aplicada em “" + m2.aplicadoEm + "”" : "Não aplicada";
        else if (m2.tipo === "poder") {
          var aq2 = aquisicoes.filter(function (a3) { return a3.ref === m2.refAquisicao; })[0];
          rama2 = aq2 ? (aq2.representacao === "texto" ? "Habilidade de texto “" + aq2.nome + "”" : aq2.nome + " · " + (REP[aq2.representacao] || aq2.representacao)) +
            (revs.length ? " · " + revs.map(function (rv) { var op = rv.opcoes.filter(function (o2) { return o2.valor === rv.valor; })[0]; return (op ? op.rotulo : valorTexto(rv.valor)); }).join(" · ") :
              aq2.opcoes ? " · " + Object.keys(aq2.opcoes).map(function (k3) { return aq2.opcoes[k3]; }).join(", ") : "") : (dz && dz.rotulo) || "—";
        } else if (m2.tipo === "ritual") {
          var rit2 = typeof m2.ritualIndice === "number" ? x.f.rituais.itens[m2.ritualIndice] : null;
          rama2 = rit2 ? rit2.nome + " · " + rotuloDoRitual(rit2) + (rit2.origemCatalogoId ? " · catálogo" : rit2.origemHomebrewId ? " · cópia da Homebrew" : " · personalizado") : "—";
        } else if (m2.tipo === "texto") rama2 = "Anotações · " + m2.rotulo;
        else if (m2.tipo === "pericia" && !m2.periciaRama) rama2 = "Guardado em Anotações" + (estado2 === "sem_destino" ? " (provisório)" : "");
        else rama2 = linhas2.map(function (l) { return (linhas2.length > 1 ? l.campo.replace(m2.rotulo + " · ", "") + ": " : "") + valorTexto(l.final) + (l.ajuste ? " (ajuste " + (l.ajuste > 0 ? "+" : "") + l.ajuste + ")" : ""); }).join(" · ");
        if (m2.formato === "pericia" && linhas2.length) {
          rama2 = linhas2.map(function (l) { return typeof l.final === "number" ? (l.final >= 0 ? "+" : "") + l.final + (l.ajuste ? " (ajuste " + (l.ajuste > 0 ? "+" : "") + l.ajuste + ")" : "") : valorTexto(l.final); }).join(" · ");
        }
        if (m2.tipo === "pericia" && m2.periciaRama) {
          var lp = linhasPor["pericia:" + m2.periciaRama] || [];
          rama2 = "Perícia " + ((C.pericia(m2.periciaRama) || {}).nome || "") + (lp.length ? " · " + lp.map(function (l) { return valorTexto(l.final); }).join(" · ") : "");
        }
        var cris2 = m2.cris || linhas2.map(function (l) { return (linhas2.length > 1 ? l.campo.replace(m2.rotulo + " · ", "") + ": " : "") + valorTexto(l.cris); }).join(" · ") || "—";
        if (!rama2) rama2 = revs.length ? revs.map(function (rv) { var op = rv.opcoes.filter(function (o2) { return o2.valor === rv.valor; })[0]; return op ? op.rotulo : valorTexto(rv.valor); }).join(" · ") : "—";
        var divergente = linhas2.some(function (l) { return l.situacao === "divergente"; });
        var afeta = linhas2.some(function (l) { return l.tipo !== "info" && (l.situacao === "ajustado" || l.situacao === "regra" || l.situacao === "divergente"); }) ||
          !!(dz && (dz.tipo === "anotacao" || dz.tipo === "ignorar" || dz.tipo === "personalizado") && m2.tipo !== "texto") || m2.vinculo === "ignorar" || m2.vinculo === "anotacao" ||
          (m2.tipo === "poder" && /^Habilidade de texto/.test(rama2));
        var rotDest = rotuloDoDestino(m2);
        var e2 = {
          chave: k2, secao: m2.secao || "identidade", tipo: m2.tipo || "valor", rotulo: m2.rotulo || k2,
          cris: cris2, rama: rama2, estado: estado2, motivo: m2.motivo || "", destino: dz || null, rotuloDestino: rotDest,
          explicita: !!m2.explicita, revisoes: revs, divergente: divergente, afetaJogo: afeta,
          candidatos: m2.candidatos || [], candidatosHomebrew: m2.candidatosHomebrew || [], dadosCris: m2.dadosCris || null,
          vinculo: m2.vinculo || "", alvoChave: m2.alvoChave || "", itemChave: m2.itemChave || "",
          alvo: { itemId: m2.itemId || "", ritualIndice: typeof m2.ritualIndice === "number" ? m2.ritualIndice : -1, habilidadeId: m2.habilidadeId || "" },
          detalhes: linhas2.map(function (l) { return { campo: l.campo, cris: l.cris, rama: l.rama, final: l.final, ajuste: l.ajuste, motivo: l.problema ? l.problema + " — " + l.motivo : l.motivo, situacao: l.situacao }; }),
          peso: peso[k2] === undefined ? 1000 : peso[k2],
        };
        e2.assinatura = JSON.stringify([e2.estado, e2.rotuloDestino, e2.rama, revs.map(function (rv) { return rv.chave + "=" + rv.valor; })]);
        return e2;
      });
      var ordemSec = {};
      SECOES.forEach(function (s2, n2) { ordemSec[s2.chave] = n2; });
      var pos = {};
      lista.forEach(function (e3, n3) { pos[e3.chave] = n3; });
      return lista.sort(function (a3, b3) { return (ordemSec[a3.secao] - ordemSec[b3.secao]) || (a3.peso - b3.peso) || (pos[a3.chave] - pos[b3.chave]); });
    }

    var bloqueado = avisos.some(function (a) { return a.gravidade === "erro"; });
    return {
      ok: !bloqueado,
      ficha: normal,
      avisos: avisos,
      entradas: entradas,
      secoes: SECOES,
      pendencias: revisoes,
      comparacao: comparacao,
      conferencia: conferencia,
      preservadosComoTexto: preservados,
      bloqueado: bloqueado,
      itens: infoItens.map(function (x) { return { nome: x.item.nome, identificacao: x.identificacao, catalogoId: x.entrada ? x.entrada.id : "", rolagens: x.rolagens || null }; }),
      resumo: {
        nome: normal.nome, classe: (C.classe(normal.ordem.classe) || {}).nome || "—", origem: (C.origem(normal.ordem.origem) || {}).nome || String(src.backgroundName || "—"),
        trilha: normal.ordem.trilha ? (C.trilha(normal.ordem.trilha) || {}).nome : "—",
        progressao: cf.trilho ? cf.trilho.rotulo : "",
        atributos: normal.ordem.atributos,
        recursos: { pv: [normal.ordem.recursos.pv, cf.pv.total], pe: [normal.ordem.recursos.pe, cf.pe.total], san: [normal.ordem.recursos.san, cf.san.total], pd: cf.determinacao ? [normal.ordem.recursos.pd, cf.pd.total] : null },
        defesa: cf.defesa.total, bloqueio: cf.bloqueio.total, esquiva: cf.esquiva.total,
        itens: normal.inventario.itens.length, poderes: aquisicoes.length, rituais: normal.rituais.itens.length,
        semSanidade: !!normal.ordem.opcionais.semSanidade,
      },
    };
  }

  global.RAMAImportarCris = {
    ADAPTADOR: ADAPTADOR,
    MENSAGENS: MENSAGENS,
    validarLink: validarLink,
    mensagemDeErro: mensagemDeErro,
    textoSeguro: textoSeguro,
    analisarExpressao: analisarExpressao,
    chaveDeTexto: chaveDeTexto,
    converter: converter,
    SECOES: SECOES,
    podeConfirmar: podeConfirmar,
    situacao: situacao,
    confirmaveisDaSecao: confirmaveisDaSecao,
    confirmarSecao: confirmarSecao,
    reconciliarConfirmacoes: reconciliarConfirmacoes,
    sugerirDestinos: sugerirDestinos,
  };
})(typeof window !== "undefined" ? window : globalThis);
