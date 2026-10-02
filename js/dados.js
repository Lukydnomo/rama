/* =====================================================================
   R.A.M.A. — motor de dados
   ---------------------------------------------------------------------
   O único lugar do sistema onde um número aleatório nasce. Nenhuma tela
   sorteia nada por conta própria: se um dado rolar em outro arquivo,
   ele foge dos testes e das regras daqui.

   As três operações são diferentes de propósito:

     rolar   — sorteia N dados e ELEGE UM deles. É como atributo e
               perícia funcionam: 2d20 rola dois d20 e vale o maior;
               -2d20 rola dois d20 e vale o menor.

     somar   — sorteia N dados e SOMA todos. É como dano funciona:
               2d10 vale os dois dados juntos, sem dado principal.

     dependente — a rolagem de perícia: pega o principal do atributo e
               só nele aplica bônus e dados extras. Os dados descartados
               do atributo não recebem bônus nenhum.

   O sorteio usa o gerador criptográfico do navegador com rejeição de
   sobra, para as faces saírem uniformes. Math.random sozinho enviesaria
   levemente as últimas faces em d100.
   ===================================================================== */

(function (global) {
  "use strict";

  /* Limites de sanidade. Não são regra de jogo — são contra o acidente
     de digitar 99999d20 e travar a aba. */
  var MAX_QUANTIDADE = 100;
  var MAX_FACES = 1000;

  /* =================================================================
     SORTEIO
     ================================================================= */

  function sorteioPadrao(faces) {
    var cripto = global.crypto || global.msCrypto;
    if (cripto && cripto.getRandomValues) {
      /* Rejeição de sobra: 2^32 raramente é múltiplo de `faces`, e usar
         o resto direto daria vantagem às primeiras faces. Descartar a
         cauda desigual custa quase nada e deixa a distribuição exata. */
      var limite = Math.floor(4294967296 / faces) * faces;
      var buffer = new Uint32Array(1);
      var v;
      do { cripto.getRandomValues(buffer); v = buffer[0]; } while (v >= limite);
      return (v % faces) + 1;
    }
    return Math.floor(Math.random() * faces) + 1;
  }

  /* Trocável para os testes rodarem com resultados combinados. */
  var sorteio = sorteioPadrao;

  function usarSorteio(fn) { sorteio = fn || sorteioPadrao; }
  function restaurarSorteio() { sorteio = sorteioPadrao; }

  /* =================================================================
     LEITURA DA EXPRESSÃO
     -----------------------------------------------------------------
     Formato aceito: [-]NdX

       N  quantidade, inteiro positivo
       X  faces, inteiro positivo
       -  na frente, o dado principal passa a ser o MENOR

     Recusa tudo o mais. "d20" não vale porque a quantidade é parte da
     regra, não um padrão implícito: quem escreve 1d20 sabe o que
     pediu, quem escreve d20 talvez não.
     ================================================================= */

  var FORMATO = /^([+-]?)(\d+)[dD](\d+)$/;

  function analisar(expressao) {
    var bruto = String(expressao === undefined || expressao === null ? "" : expressao).trim();

    if (!bruto) return { ok: false, erro: "vazio" };

    /* Espaço no meio ("2 d 20") é erro de digitação, não formato: o
       texto vai limpo para a expressão canônica, mas o que veio com
       ponto decimal continua sendo recusado abaixo. */
    var limpo = bruto.replace(/\s+/g, "");

    var m = FORMATO.exec(limpo);
    if (!m) return { ok: false, erro: "formato" };

    var quantidade = parseInt(m[2], 10);
    var faces = parseInt(m[3], 10);

    if (!Number.isInteger(quantidade) || quantidade < 1) return { ok: false, erro: "quantidade" };
    if (!Number.isInteger(faces) || faces < 1) return { ok: false, erro: "faces" };
    if (quantidade > MAX_QUANTIDADE) return { ok: false, erro: "quantidade_alta" };
    if (faces > MAX_FACES) return { ok: false, erro: "faces_altas" };

    var selecao = m[1] === "-" ? "menor" : "maior";

    return {
      ok: true,
      quantidade: quantidade,
      faces: faces,
      selecao: selecao,
      expressao: (selecao === "menor" ? "-" : "") + quantidade + "d" + faces,
    };
  }

  function valida(expressao) { return analisar(expressao).ok; }

  /* Texto canônico de uma expressão válida; devolve "" para inválida.
     É o que se guarda na ficha, para "2 D 20" e "2d20" não virarem
     dois valores diferentes na comparação de sincronização. */
  function normalizar(expressao) {
    var a = analisar(expressao);
    return a.ok ? a.expressao : "";
  }

  /* =================================================================
     ROLAR — N dados, um principal
     ================================================================= */

  function rolar(expressao) {
    var a = analisar(expressao);
    if (!a.ok) {
      return { ok: false, erro: a.erro, expressao: String(expressao || ""), rolagens: [], principal: 0, selecao: "maior" };
    }

    var rolagens = [];
    for (var i = 0; i < a.quantidade; i++) rolagens.push(sorteio(a.faces));

    var principal = a.selecao === "menor"
      ? Math.min.apply(null, rolagens)
      : Math.max.apply(null, rolagens);

    return {
      ok: true,
      expressao: a.expressao,
      quantidade: a.quantidade,
      faces: a.faces,
      selecao: a.selecao,
      rolagens: rolagens,
      principal: principal,
      soma: rolagens.reduce(function (t, n) { return t + n; }, 0),
    };
  }

  /* =================================================================
     SOMAR — N dados, todos contam (dano)
     ================================================================= */

  function somar(expressao) {
    var a = analisar(expressao);
    if (!a.ok) {
      return { ok: false, erro: a.erro, expressao: String(expressao || ""), rolagens: [], total: 0 };
    }

    var rolagens = [];
    for (var i = 0; i < a.quantidade; i++) rolagens.push(sorteio(a.faces));

    return {
      ok: true,
      expressao: a.expressao,
      quantidade: a.quantidade,
      faces: a.faces,
      rolagens: rolagens,
      total: rolagens.reduce(function (t, n) { return t + n; }, 0),
    };
  }

  /* =================================================================
     ROLAGEM DEPENDENTE — a perícia
     -----------------------------------------------------------------
     pedido = {
       nome, sigla,
       expressao,            dado do atributo vinculado, ex. "2d20"
       bonus,                fixo, da ficha
       bonusTemporario,      da sessão
       modificadores: [ { operacao:"+"|"-", dado:"1d6" } ]
     }

     O bônus vai SÓ no dado principal. Se o atributo rolou 6 e 15 em
     2d20, o 6 continua sendo 6 — ele foi descartado, não recebe nada.
     ================================================================= */

  function dependente(pedido) {
    var p = pedido || {};
    var atributo = rolar(p.expressao);

    var parcelas = [];
    var total = atributo.ok ? atributo.principal : 0;

    if (atributo.ok) {
      parcelas.push({ rotulo: p.sigla ? "Dado (" + p.sigla + ")" : "Dado", valor: atributo.principal });
    }

    var bonus = inteiroSeguro(p.bonus);
    if (bonus) { total += bonus; parcelas.push({ rotulo: "Bônus", valor: bonus }); }

    var temporario = inteiroSeguro(p.bonusTemporario);
    if (temporario) { total += temporario; parcelas.push({ rotulo: "Temporário", valor: temporario }); }

    var extras = [];
    (p.modificadores || []).forEach(function (mod) {
      if (!mod || !mod.dado) return;
      var r = somar(mod.dado);
      if (!r.ok) return;

      var sinal = mod.operacao === "-" ? -1 : 1;
      var valor = sinal * r.total;
      total += valor;

      extras.push({
        id: mod.id || null,
        operacao: sinal < 0 ? "-" : "+",
        expressao: r.expressao,
        rolagens: r.rolagens,
        total: r.total,
        valor: valor,
      });

      parcelas.push({
        rotulo: (sinal < 0 ? "−" : "+") + r.expressao,
        valor: valor,
        detalhe: r.rolagens.join(" + "),
      });
    });

    return {
      ok: atributo.ok,
      erro: atributo.ok ? null : atributo.erro,
      tipo: "dependente",
      nome: p.nome || "",
      sigla: p.sigla || "",
      expressao: atributo.expressao,
      selecao: atributo.selecao,
      rolagens: atributo.rolagens,
      /* O natural principal é guardado separado do total porque é ele,
         e não o total, que decide crítico. Somar bônus e depois comparar
         com a margem transformaria +5 de perícia em crítico grátis. */
      natural: atributo.ok ? atributo.principal : 0,
      bonus: bonus,
      bonusTemporario: temporario,
      extras: extras,
      parcelas: parcelas,
      total: total,
    };
  }

  /* =================================================================
     DANO
     -----------------------------------------------------------------
     pedido = { nome, dano:"2d10", danoExtra: 4, critico:false, multiplicador:2 }

     No crítico, multiplica-se a QUANTIDADE de dados-base, não o
     resultado: 2d10 x2 vira 4d10. O dano extra fica de fora — ele é
     acréscimo fixo da arma, não parte do dado que o golpe crítico
     multiplica.
     ================================================================= */

  function dano(pedido) {
    var p = pedido || {};
    var base = analisar(p.dano);

    if (!base.ok) {
      return {
        ok: false, erro: base.erro, tipo: "dano",
        nome: p.nome || "", expressao: String(p.dano || ""),
        rolagens: [], total: 0, critico: !!p.critico,
      };
    }

    var critico = !!p.critico;
    var multiplicador = critico ? multiplicadorSeguro(p.multiplicador) : 1;
    var quantidade = base.quantidade * multiplicador;

    var rolagens = [];
    for (var i = 0; i < quantidade; i++) rolagens.push(sorteio(base.faces));
    var somaBase = rolagens.reduce(function (t, n) { return t + n; }, 0);

    var expressao = quantidade + "d" + base.faces;
    var parcelas = [{ rotulo: expressao, valor: somaBase, detalhe: rolagens.join(" + ") }];

    /* O extra costuma ser um número, mas Homebrew não é restrito: se
       vier uma expressão de dado válida, ela rola — e continua fora da
       multiplicação do crítico, como manda a regra. */
    var extraTotal = 0;
    var extraRolagens = null;
    var extraTexto = "";

    if (!vazio(p.danoExtra)) {
      var comoDado = analisar(p.danoExtra);
      if (comoDado.ok) {
        var r = somar(comoDado.expressao);
        extraTotal = r.total;
        extraRolagens = r.rolagens;
        extraTexto = comoDado.expressao;
        parcelas.push({ rotulo: "Extra " + extraTexto, valor: extraTotal, detalhe: r.rolagens.join(" + ") });
      } else {
        extraTotal = inteiroSeguro(p.danoExtra);
        if (extraTotal) {
          extraTexto = String(extraTotal);
          parcelas.push({ rotulo: "Extra", valor: extraTotal });
        }
      }
    }

    return {
      ok: true,
      tipo: "dano",
      nome: p.nome || "",
      expressao: expressao,
      expressaoBase: base.expressao,
      multiplicador: multiplicador,
      critico: critico,
      quantidade: quantidade,
      faces: base.faces,
      rolagens: rolagens,
      somaBase: somaBase,
      extra: extraTotal,
      extraExpressao: extraTexto,
      extraRolagens: extraRolagens,
      parcelas: parcelas,
      total: somaBase + extraTotal,
    };
  }

  /* =================================================================
     CRÍTICO
     -----------------------------------------------------------------
     A margem é comparada com o resultado NATURAL PRINCIPAL do ataque —
     a face do dado eleito pelo atributo, antes de qualquer soma.
     ================================================================= */

  function ehCritico(natural, margem) {
    var n = inteiroSeguro(natural);
    var m = inteiroSeguro(margem);
    if (m < 1) return false;
    return n >= m;
  }

  /* =================================================================
     EXPRESSÕES COMPOSTAS (v2.28)
     -----------------------------------------------------------------
     As fichas publicadas trazem o teste e o dano já prontos: "3d20+10",
     "-2d20+5", "4d10+40", "2d6+1d4+3". termos() lê essa soma de termos
     sem inventar formato novo: cada termo é um dado no formato de
     analisar() ou um número inteiro.

     O sinal na frente do PRIMEIRO dado tem dois sentidos, e quem decide
     é a operação, não a leitura:

       teste()       "-2d20+5" = o pior de dois d20, mais 5 — a mesma
                     regra de rolar() para atributo 0
       danoComposto() "-1d4" depois do primeiro termo SUBTRAI; um dano
       e total()      nunca começa com sinal negativo
     ================================================================= */

  var FORMATO_TERMOS = /^[+-]?(\d+[dD]\d+|\d+)([+-](\d+[dD]\d+|\d+))*$/;
  var UM_TERMO = /([+-]?)(\d+[dD]\d+|\d+)/g;
  var MAX_TERMOS = 12;

  function termos(expressao) {
    var limpo = String(expressao === undefined || expressao === null ? "" : expressao).replace(/\s+/g, "");
    if (!limpo) return { ok: false, erro: "vazio" };
    if (!FORMATO_TERMOS.test(limpo)) return { ok: false, erro: "formato" };

    var lista = [];
    var m;
    UM_TERMO.lastIndex = 0;
    while ((m = UM_TERMO.exec(limpo))) {
      var sinal = m[1] === "-" ? -1 : 1;
      if (/[dD]/.test(m[2])) {
        var a = analisar(m[2]);
        if (!a.ok) return { ok: false, erro: a.erro };
        lista.push({ tipo: "dado", sinal: sinal, quantidade: a.quantidade, faces: a.faces });
      } else {
        var n = parseInt(m[2], 10);
        if (!Number.isFinite(n) || n > 1000000) return { ok: false, erro: "numero_alto" };
        lista.push({ tipo: "fixo", sinal: sinal, valor: n });
      }
    }
    if (lista.length > MAX_TERMOS) return { ok: false, erro: "termos_demais" };

    return { ok: true, termos: lista, expressao: textoDosTermos(lista) };
  }

  function textoDosTermos(lista) {
    return lista.map(function (t, i) {
      var corpo = t.tipo === "dado" ? t.quantidade + "d" + t.faces : String(t.valor);
      if (i === 0) return (t.sinal < 0 ? "-" : "") + corpo;
      return (t.sinal < 0 ? "-" : "+") + corpo;
    }).join("");
  }

  /* Uma expressão de TESTE é válida quando tem ao menos um dado. */
  function testeValido(expressao) {
    var t = termos(expressao);
    return t.ok && t.termos.some(function (x) { return x.tipo === "dado"; });
  }

  /* O teste com expressão própria ("3d20+10"): o primeiro dado é o
     conjunto de onde sai o principal (o maior, ou o menor com "-"), os
     números viram bônus e os outros dados entram como dados extras —
     exatamente o caminho de dependente(), para o crítico continuar
     sendo decidido pelo natural principal. */
  function teste(expressao, opcoes) {
    var o = opcoes || {};
    var t = termos(expressao);
    var primeiro = t.ok ? t.termos.filter(function (x) { return x.tipo === "dado"; })[0] : null;
    if (!t.ok || !primeiro) {
      return {
        ok: false, erro: t.ok ? "sem_dado" : t.erro, tipo: "dependente",
        nome: o.nome || "", expressao: String(expressao || ""), rolagens: [], natural: 0, parcelas: [], total: 0,
      };
    }

    var bonus = 0;
    var modificadores = [];
    t.termos.forEach(function (x) {
      if (x === primeiro) return;
      if (x.tipo === "fixo") bonus += x.sinal * x.valor;
      else modificadores.push({ operacao: x.sinal < 0 ? "-" : "+", dado: x.quantidade + "d" + x.faces });
    });

    var r = dependente({
      nome: o.nome || "",
      sigla: o.sigla || "",
      expressao: (primeiro.sinal < 0 ? "-" : "") + primeiro.quantidade + "d" + primeiro.faces,
      bonus: bonus,
      bonusTemporario: o.bonusTemporario || 0,
      modificadores: modificadores.concat(o.modificadores || []),
    });
    if (r.ok) r.expressao = t.expressao;
    return r;
  }

  /* Uma parte de dano: "4d10+40 Morte" → { expressao, tipo }. O tipo é
     o texto depois da expressão, como o livro escreve. */
  function parteDeDano(parte) {
    if (parte && typeof parte === "object") {
      return { expressao: String(parte.expressao || "").replace(/\s+/g, ""), tipo: String(parte.tipo || "").trim() };
    }
    var texto = String(parte === undefined || parte === null ? "" : parte).trim();
    var m = /^([0-9dD+\-\s]+?)(?:\s+(.+))?$/.exec(texto);
    if (!m) return { expressao: "", tipo: texto };
    return { expressao: m[1].replace(/\s+/g, ""), tipo: (m[2] || "").trim() };
  }

  function danoValido(partes) {
    var lista = Array.isArray(partes) ? partes : [partes];
    return lista.length > 0 && lista.every(function (p) { return termos(parteDeDano(p).expressao).ok; });
  }

  /* DANO COMPOSTO — uma ou mais partes, cada uma com o próprio tipo.

     pedido = { nome, partes: ["2d8+8 impacto", "2d12 Morte"],
                critico: false, multiplicador: 2 }

     Todas as partes somam, e o resultado guarda o total de cada tipo
     separado (`porTipo`), para a mesa aplicar resistências e
     vulnerabilidades sem refazer a conta.

     No crítico vale a mesma regra de dano(): multiplica-se a QUANTIDADE
     de dados, e só do dado-base — o PRIMEIRO dado da PRIMEIRA parte.
     Números fixos e as demais partes ficam como dano extra, fora da
     multiplicação. */
  function danoComposto(pedido) {
    var p = pedido || {};
    var lista = (Array.isArray(p.partes) ? p.partes : [p.partes]).map(parteDeDano);
    var falha = { ok: false, tipo: "dano", nome: p.nome || "", expressao: "", rolagens: [], parcelas: [], total: 0, critico: !!p.critico };

    if (!lista.length || !lista[0].expressao) return Object.assign(falha, { erro: "vazio" });

    var critico = !!p.critico;
    var multiplicador = critico ? multiplicadorSeguro(p.multiplicador) : 1;
    var multiplicou = !critico;

    var rolagens = [];
    var parcelas = [];
    var porTipo = [];
    var total = 0;
    var textos = [];

    for (var i = 0; i < lista.length; i++) {
      var parte = lista[i];
      var t = termos(parte.expressao);
      if (!t.ok) return Object.assign(falha, { erro: t.erro, expressao: parte.expressao });

      var subtotal = 0;
      var sufixo = parte.tipo ? " " + parte.tipo : "";
      var expressaoRolada = [];

      t.termos.forEach(function (x, j) {
        if (x.tipo === "fixo") {
          subtotal += x.sinal * x.valor;
          expressaoRolada.push((j ? (x.sinal < 0 ? "-" : "+") : (x.sinal < 0 ? "-" : "")) + x.valor);
          parcelas.push({ rotulo: "Fixo" + sufixo, valor: x.sinal * x.valor });
          return;
        }
        var quantidade = x.quantidade;
        if (!multiplicou) { quantidade = Math.min(MAX_QUANTIDADE * 10, quantidade * multiplicador); multiplicou = true; }
        var faces = [];
        for (var k = 0; k < quantidade; k++) faces.push(sorteio(x.faces));
        var soma = faces.reduce(function (a, b) { return a + b; }, 0);
        rolagens = rolagens.concat(faces);
        subtotal += x.sinal * soma;
        expressaoRolada.push((j ? (x.sinal < 0 ? "-" : "+") : (x.sinal < 0 ? "-" : "")) + quantidade + "d" + x.faces);
        parcelas.push({ rotulo: (x.sinal < 0 ? "−" : "") + quantidade + "d" + x.faces + sufixo, valor: x.sinal * soma, detalhe: faces.join(" + ") });
      });

      /* Dano nunca é negativo: uma parte com redutor alto vale zero. */
      subtotal = Math.max(0, subtotal);
      total += subtotal;
      porTipo.push({ tipo: parte.tipo, total: subtotal });
      textos.push(expressaoRolada.join("") + sufixo);
    }

    return {
      ok: true,
      tipo: "dano",
      nome: p.nome || "",
      expressao: textos.join(" + "),
      critico: critico,
      multiplicador: multiplicador,
      rolagens: rolagens,
      parcelas: parcelas,
      porTipo: porTipo,
      total: total,
    };
  }

  /* Uma soma simples ("1d4+1" rodadas, "2d10+2" de cura): todos os
     dados contam, sem tipo e sem crítico. */
  function total(expressao, opcoes) {
    var o = opcoes || {};
    var r = danoComposto({ nome: o.nome, partes: [String(expressao || "")] });
    if (!r.ok) return Object.assign(r, { tipo: "soma" });
    r.tipo = "soma";
    delete r.porTipo;
    delete r.critico;
    delete r.multiplicador;
    return r;
  }

  /* =================================================================
     AUXILIARES
     ================================================================= */

  function vazio(v) { return v === undefined || v === null || v === ""; }

  function inteiroSeguro(v) {
    if (typeof v === "number") return Number.isFinite(v) ? Math.trunc(v) : 0;
    var n = parseInt(String(v === undefined || v === null ? "" : v).trim(), 10);
    return Number.isFinite(n) ? n : 0;
  }

  /* Multiplicador é inteiro de no mínimo 1: x0 apagaria o dano e um
     valor quebrado daria "3,5d10", que não existe. */
  function multiplicadorSeguro(v) {
    var n = inteiroSeguro(v);
    if (n < 1) return 1;
    if (n > 10) return 10;
    return n;
  }

  global.RAMADados = {
    analisar: analisar,
    valida: valida,
    normalizar: normalizar,
    rolar: rolar,
    somar: somar,
    dependente: dependente,
    dano: dano,
    ehCritico: ehCritico,
    termos: termos,
    testeValido: testeValido,
    teste: teste,
    parteDeDano: parteDeDano,
    danoValido: danoValido,
    danoComposto: danoComposto,
    total: total,
    usarSorteio: usarSorteio,
    restaurarSorteio: restaurarSorteio,
    MAX_QUANTIDADE: MAX_QUANTIDADE,
    MAX_FACES: MAX_FACES,
  };
})(typeof window !== "undefined" ? window : globalThis);
