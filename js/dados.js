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
        /* O dano extra fica fora do crítico — salvo quando o item diz que
           ele multiplica (Machado do Mutilador, AS2 p. 41 e 104). */
        if (p.extraMultiplica && critico && multiplicador > 1) {
          comoDado = analisar(Math.min(MAX_QUANTIDADE, comoDado.quantidade * multiplicador) + "d" + comoDado.faces);
        }
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
      /* multiplicaTodas: o primeiro dado de CADA parte multiplica (AS2,
         dano extra "multiplica em caso de crítico"). */
      if (i > 0 && critico && p.multiplicaTodas) multiplicou = false;

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
      multiplicaTodas: critico && !!p.multiplicaTodas,
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
     FÓRMULAS (v2.43) — os dados da perícia universal
     -----------------------------------------------------------------
     Cada sistema conta os dados do seu jeito: o atributo como
     quantidade ("@FOR d6"), metade dele mais alguma coisa
     ("(@FOR/2 + 1)d6 + @INT"), um teto, um mínimo. A fórmula é uma
     conta pequena, lida aqui e só aqui — nada de eval:

       números        3   2.5
       atributos      @FOR (sigla ou nome de uma palavra), @{Nome Longo}
       dados          2d6   d20   (@FOR)d6   @FOR d6   (@FOR/2+1)d(4+2)
       manter         3d20k1 (fica com o maior)   3d20kh2 (os 2 maiores)
                      3d20kl1 (fica com o menor)  — o número é opcional (1)
       contas         + − * / e parênteses
       funções        piso() teto() arred() abs() min(a, b…) max(a, b…)

     Dado liga mais forte que * e /: "2*1d6" dobra um d6. A quantidade
     e as faces são contas sem dado, arredondadas para baixo na hora de
     rolar; o total também é arredondado para baixo no fim (use teto()
     para arredondar para cima). Uma quantidade 0 não rola nada.

     Como os dados contam (`contagem`):
       maior   o PRIMEIRO dado da fórmula é o conjunto de onde sai um
               dado só, o maior — como 2d20 de atributo; os outros dados
               somam. O dado eleito é o natural, que decide crítico.
       menor   o mesmo, valendo o menor
       soma    todos os dados somam; não há natural
     ================================================================= */

  /* v9.21.0 — a sintaxe inteira do Rollem (v1, e as funções de
     estatística do v2), no mesmo leitor, sem eval:

       dados          XdY  dY  d%  XdF (Fate: −1, 0, +1)
       explodir       XdY!  (no máximo)   XdY!Z  (de Z para cima)
       manter         XdYkZ = XdYkhZ (os Z maiores)   XdYklZ (os Z menores)
       descartar      XdYdZ = XdYdlZ (os Z menores)   XdYdhZ (os Z maiores)
       crítico        XdYcZ   destaca os dados de Z para cima
       iguais         2dYdaro  3dYtaro  XdYaro   todos iguais: rola de novo e soma
       sem ordenar    XdYns   (aceito; a saída já vem na ordem rolada)
       por dado       XdY++N  XdY--N   soma (ou tira) N de CADA dado
       contar         A<<B  (quantos dados ≤ B)   A>>B  (quantos ≥ B)
       Burning Wheel  BX  GX  WX  (Xd6 >> 4, 3, 2)   BX!  GX!  WX!  (explodindo)
       comparar       A<B  A<=B  A>B  A>=B  A=B   — só como a ÚLTIMA conta
       repetir        X#A   rola A X vezes (6#4d6d1)
       estatística    min(2d6) max(2d6) ev(2d6)  — o mínimo, o máximo e a
                      média possíveis, sem rolar (com vários valores,
                      min/max continuam sendo o menor/maior deles)

     Continua tudo o que já valia: @atributos, + − * / e parênteses,
     piso() teto() arred() abs(), a quantidade e as faces como contas. */

  var MAX_FORMULA = 200;
  var MAX_NOS_FORMULA = 200;
  var MAX_DADOS_FORMULA = 12;
  var MAX_EXPLOSOES = 100;
  var MAX_REPETICOES = 20;
  var MAX_IGUAIS = 20;
  var CONTAGENS = ["maior", "menor", "soma"];
  var LETRA_DE_REF = /[A-Za-z0-9_À-ÖØ-öø-ÿ]/;
  var LETRA_DE_PALAVRA = /[A-Za-z_À-ÖØ-öø-ÿ]/;
  var COMPARACOES = ["<", "<=", ">", ">=", "="];
  var BURNING = { b: 4, g: 3, w: 2 };

  function arredondar(x) { return Math.round(x); }
  var FUNCOES_DE_FORMULA = {
    piso: { fn: Math.floor, min: 1, max: 1 }, floor: { fn: Math.floor, min: 1, max: 1 },
    teto: { fn: Math.ceil, min: 1, max: 1 }, ceil: { fn: Math.ceil, min: 1, max: 1 },
    arred: { fn: arredondar, min: 1, max: 1 }, arredondar: { fn: arredondar, min: 1, max: 1 }, round: { fn: arredondar, min: 1, max: 1 },
    abs: { fn: Math.abs, min: 1, max: 1 },
    min: { fn: Math.min, min: 1, max: 12 },
    max: { fn: Math.max, min: 1, max: 12 },
    ev: { fn: function (v) { return v; }, min: 1, max: 1 }, media: { fn: function (v) { return v; }, min: 1, max: 1 },
  };

  function erroDeFormula(mensagem) { return { ok: false, erro: "formula", mensagem: mensagem }; }

  var OPERADORES_DUPLOS = ["<<", ">>", "<=", ">=", "++", "--"];

  function tokensDaFormula(s) {
    var lista = [];
    var i = 0;
    while (i < s.length) {
      var c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (/[0-9.]/.test(c)) {
        var m = /^(\d+(\.\d+)?|\.\d+)/.exec(s.slice(i));
        if (!m) return erroDeFormula("Número mal escrito perto de “" + s.slice(i, i + 6) + "”.");
        lista.push({ t: "num", v: parseFloat(m[0]) });
        i += m[0].length;
        continue;
      }
      if (c === "@") {
        if (s[i + 1] === "{") {
          var fim = s.indexOf("}", i + 2);
          if (fim < 0) return erroDeFormula("Falta fechar a chave de @{…}.");
          var longo = s.slice(i + 2, fim).trim();
          if (!longo) return erroDeFormula("@{ } vazio: escreva o nome do atributo dentro das chaves.");
          lista.push({ t: "ref", v: longo });
          i = fim + 1;
          continue;
        }
        var j = i + 1;
        while (j < s.length && LETRA_DE_REF.test(s[j])) {
          /* "@FORd20": o d seguido de número ou parêntese já é o dado. */
          if (j > i + 1 && /[dD]/.test(s[j]) && /[0-9(@%]/.test(s[j + 1] || "")) break;
          j++;
        }
        if (j === i + 1) return erroDeFormula("Depois de @ vem a sigla ou o nome de um atributo (por exemplo, @FOR).");
        lista.push({ t: "ref", v: s.slice(i + 1, j) });
        i = j;
        continue;
      }
      if (LETRA_DE_PALAVRA.test(c)) {
        var k = i;
        while (k < s.length && LETRA_DE_PALAVRA.test(s[k])) k++;
        var palavra = s.slice(i, k);
        var baixa = palavra.toLowerCase();
        if (baixa === "d") lista.push({ t: "d" });
        else if (baixa === "df") { lista.push({ t: "d" }); lista.push({ t: "fate" }); }
        else lista.push({ t: "id", v: baixa });
        i = k;
        continue;
      }
      var dois = s.slice(i, i + 2);
      if (OPERADORES_DUPLOS.indexOf(dois) >= 0) { lista.push({ t: dois }); i += 2; continue; }
      var op = { "−": "-", "×": "*", "÷": "/", ";": ",", "≤": "<=", "≥": ">=" }[c] || c;
      if (op.length === 2) { lista.push({ t: op }); i++; continue; }
      if ("+-*/(),!#%<>=".indexOf(op) >= 0) { lista.push({ t: op }); i++; continue; }
      return erroDeFormula("“" + c + "” não faz parte de uma fórmula.");
    }
    return { ok: true, lista: lista };
  }

  function ehEstatistica(x) { return !!x && x.k === "fn" && !!x.estatistica; }

  function lerFormula(texto) {
    var s = String(texto === undefined || texto === null ? "" : texto).trim();
    if (!s) return erroDeFormula("A fórmula está vazia.");
    if (s.length > MAX_FORMULA) return erroDeFormula("A fórmula passa de " + MAX_FORMULA + " caracteres.");
    var tk = tokensDaFormula(s);
    if (!tk.ok) return tk;
    var t = tk.lista;
    var p = 0;
    var nos = 0;
    var dados = 0;
    var referencias = [];
    var falha = null;

    function no(x) {
      nos++;
      if (nos > MAX_NOS_FORMULA && !falha) falha = "A fórmula é grande demais.";
      return x;
    }
    function ve(tipo) { return t[p] && t[p].t === tipo; }
    function veId(re) { return t[p] && t[p].t === "id" && re.test(t[p].v); }
    function come(tipo) { if (ve(tipo)) { p++; return true; } return false; }
    function exige(tipo, mensagem) { if (!come(tipo) && !falha) falha = mensagem; }
    function veComparacao() { return t[p] && COMPARACOES.indexOf(t[p].t) >= 0; }
    function temDado(x) {
      if (!x || ehEstatistica(x)) return false;
      if (x.k === "dado") return true;
      return [x.a, x.b, x.q, x.f].some(temDado) || (x.args || []).some(temDado);
    }
    function inteiroDoToken(min, mensagem) {
      if (!ve("num") || t[p].v < min || Math.floor(t[p].v) !== t[p].v) { if (!falha) falha = mensagem; return null; }
      return t[p++].v;
    }

    /* X#A: só no começo, valendo para a fórmula inteira. */
    function topo() {
      var vezes = 0;
      if (ve("num") && t[p + 1] && t[p + 1].t === "#") {
        vezes = t[p].v;
        p += 2;
        if (vezes < 1 || vezes > MAX_REPETICOES || Math.floor(vezes) !== vezes) { falha = "Repetir (X#…) vai de 1 a " + MAX_REPETICOES + " vezes."; return null; }
      }
      var a = comparacao();
      if (!falha && ve("#")) falha = "Repetir (X#…) só vale no começo da fórmula: 6#4d6d1.";
      return vezes ? no({ k: "rep", n: vezes, a: a }) : a;
    }
    /* A comparação é a última conta: nada depois dela, e nunca dentro
       de parênteses. */
    function comparacao() {
      var a = soma();
      if (!falha && veComparacao()) {
        var op = t[p++].t;
        var b = soma();
        if (!falha && veComparacao()) falha = "Só uma comparação por fórmula, e ela é a última conta.";
        return no({ k: "cmp", op: op, a: a, b: b });
      }
      return a;
    }
    function soma() {
      var a = produto();
      while (!falha && (ve("+") || ve("-"))) {
        var op = t[p++].t;
        a = no({ k: "op", op: op, a: a, b: produto() });
      }
      return a;
    }
    function produto() {
      var a = porDado();
      while (!falha && (ve("*") || ve("/"))) {
        var op = t[p++].t;
        a = no({ k: "op", op: op, a: a, b: porDado() });
      }
      return a;
    }
    /* ++ e -- mexem em CADA dado; << e >> contam dados. Fora de um dado,
       "5--2" continua sendo 5 − (−2). */
    function porDado() {
      var a = unario();
      while (!falha && (ve("++") || ve("--") || ve("<<") || ve(">>"))) {
        var op = t[p++].t;
        var b = unario();
        if (falha) return a;
        if (op === "<<" || op === ">>") {
          if (!a || a.k !== "dado") { falha = op + " conta dados: escreva logo depois de um dado (10d6 " + op + " 4)."; return a; }
          if (temDado(b)) { falha = "O alvo de " + op + " é um número, não outro dado."; return a; }
          a.contar = { modo: op === "<<" ? "le" : "ge", alvo: b };
          continue;
        }
        if (a && a.k === "dado" && !a.contar && !temDado(b)) {
          var parcela = op === "--" ? no({ k: "neg", a: b }) : b;
          a.porDado = a.porDado ? no({ k: "op", op: "+", a: a.porDado, b: parcela }) : parcela;
          continue;
        }
        a = no({ k: "op", op: op === "++" ? "+" : "-", a: a, b: op === "--" ? no({ k: "neg", a: b }) : b });
      }
      return a;
    }
    function unario() {
      if (come("-")) return no({ k: "neg", a: unario() });
      if (come("+")) return unario();
      return dado();
    }
    function contarDado() {
      dados++;
      if (dados > MAX_DADOS_FORMULA && !falha) falha = "Dados demais numa fórmula só (até " + MAX_DADOS_FORMULA + ").";
    }
    function dado() {
      /* Burning Wheel: B5 = 5d6 >> 4; G5 >> 3; W5 >> 2; com ! explode. */
      if (veId(/^[bgw]$/) && t[p + 1] && t[p + 1].t === "num") {
        var letra = t[p].v;
        p++;
        var qtd = inteiroDoToken(0, "Burning Wheel: B, G ou W seguido do número de dados (B5).");
        if (falha) return null;
        contarDado();
        var bw = no({ k: "dado", q: no({ k: "num", v: qtd }), f: no({ k: "num", v: 6 }), contar: { modo: "ge", alvo: no({ k: "num", v: BURNING[letra] }) }, burning: letra.toUpperCase() });
        if (come("!")) bw.explode = { limiar: null };
        return bw;
      }
      var q = null;
      if (!ve("d")) {
        q = primario();
        if (!ve("d")) return q;
      }
      p++;
      var x = { k: "dado", q: q || no({ k: "num", v: 1 }) };
      if (come("fate")) { x.fate = true; x.f = no({ k: "num", v: 3 }); }
      else if (come("%")) { x.f = no({ k: "num", v: 100 }); x.porcento = true; }
      else x.f = primario();
      if (falha) return null;
      if (temDado(q) || temDado(x.f)) { falha = "A quantidade e as faces de um dado não podem ter outro dado."; return null; }
      contarDado();
      modificadores(x);
      if (falha) return null;
      return no(x);
    }
    /* Os sufixos de um dado, em qualquer ordem. */
    function modificadores(x) {
      for (;;) {
        if (falha) return;
        if (come("!")) {
          if (x.explode) { falha = "O dado já explode (um ! basta)."; return; }
          x.explode = { limiar: ve("num") ? t[p++].v : null };
          continue;
        }
        if (ve("d") && t[p + 1] && t[p + 1].t === "num") {
          p++;
          if (x.manter) { falha = "Escolha manter (k) ou descartar (d), não os dois."; return; }
          x.manter = { tipo: "descartar", modo: "l", n: inteiroDoToken(1, "Quantos dados descartar: um número inteiro (4d6d1).") };
          continue;
        }
        if (veId(/^(k|kh|kl|dl|dh)$/)) {
          var v = t[p++].v;
          if (x.manter) { falha = "Escolha manter (k) ou descartar (d), não os dois."; return; }
          var n = 1;
          if (ve("num")) n = inteiroDoToken(1, "O número depois de " + v + " é inteiro, de 1 para cima (3d20" + v + "1).");
          x.manter = v.charAt(0) === "k"
            ? { tipo: "manter", modo: v === "kl" ? "l" : "h", n: n }
            : { tipo: "descartar", modo: v === "dh" ? "h" : "l", n: n };
          continue;
        }
        if (veId(/^ns$/)) { p++; x.semOrdem = true; continue; }
        if (veId(/^c$/)) {
          p++;
          x.critico = inteiroDoToken(1, "O crítico (c) precisa do número: 1d20c19.");
          continue;
        }
        if (veId(/^(daro|taro|aro)$/)) { x.iguais = t[p++].v; continue; }
        /* Juntos, sem espaço: "2d6ns", "4d6kh3ns" viram uma palavra só. */
        if (ve("id")) {
          var junto = /^(kh|kl|k|dh|dl|ns|c|daro|taro|aro)(.+)$/.exec(t[p].v);
          if (junto && /^(kh|kl|k|dh|dl|ns|c|daro|taro|aro)+$/.test(junto[2])) {
            var partes = t[p].v.match(/kh|kl|k|dh|dl|ns|c|daro|taro|aro/g);
            t.splice.apply(t, [p, 1].concat(partes.map(function (v) { return { t: "id", v: v }; })));
            continue;
          }
        }
        break;
      }
      if (x.critico && x.manter) { falha = "O crítico (c) não combina com manter ou descartar."; return; }
      if (x.fate && (x.explode || x.critico || x.iguais)) { falha = "Dados Fate (dF) não explodem nem têm crítico."; return; }
    }
    function primario() {
      if (falha) return null;
      var x = t[p];
      if (!x) { falha = "A fórmula terminou no meio de uma conta."; return null; }
      if (x.t === "num") { p++; return no({ k: "num", v: x.v }); }
      if (x.t === "ref") {
        p++;
        if (referencias.indexOf(x.v) < 0) referencias.push(x.v);
        return no({ k: "ref", nome: x.v });
      }
      if (x.t === "(") {
        p++;
        var dentro = soma();
        if (!falha && veComparacao()) { falha = "A comparação precisa ser a última conta, fora de parênteses: 1 < (2 * 5)."; return null; }
        exige(")", "Falta fechar um parêntese.");
        return dentro;
      }
      if (x.t === "id") {
        p++;
        var fn = FUNCOES_DE_FORMULA[x.v];
        if (!fn) { falha = "“" + x.v + "” não é uma função conhecida (piso, teto, arred, abs, min, max, ev)."; return null; }
        exige("(", x.v + " precisa de parênteses: " + x.v + "(…).");
        var args = [];
        if (!ve(")")) {
          args.push(soma());
          while (!falha && come(",")) args.push(soma());
        }
        exige(")", "Falta fechar o parêntese de " + x.v + "(…).");
        if (!falha && (args.length < fn.min || args.length > fn.max)) {
          falha = x.v + "() recebe " + (fn.min === fn.max ? fn.min + " valor" : "de " + fn.min + " a " + fn.max + " valores") + ".";
        }
        var nome = x.v === "media" ? "ev" : x.v;
        /* v2 do Rollem: min(2d6), max(2d6), ev(2d6) — o possível, sem rolar. */
        var estatistica = nome === "ev" || ((nome === "min" || nome === "max") && args.length === 1 && temDado(args[0]));
        return no({ k: "fn", nome: nome, args: args, estatistica: estatistica });
      }
      if (x.t === "d") { falha = "Um dado precisa das faces: 1d20, 2d6, dF, d%…"; return null; }
      if (COMPARACOES.indexOf(x.t) >= 0) { falha = "A comparação precisa de um valor dos dois lados: 1d20 >= 15."; return null; }
      falha = "“" + (x.v !== undefined ? x.v : x.t) + "” está fora do lugar.";
      return null;
    }

    var arvore = topo();
    if (!falha && p < t.length) falha = "“" + (t[p].v !== undefined ? t[p].v : t[p].t) + "” está fora do lugar.";
    if (falha) return erroDeFormula(falha);
    return { ok: true, arvore: arvore, referencias: referencias, dados: dados, texto: s };
  }

  /* Uma conta sem dado (quantidade, faces, os números da fórmula). */
  function contaDaFormula(x, valorDe) {
    switch (x.k) {
      case "num": return x.v;
      case "ref": {
        var v = valorDe ? valorDe(x.nome) : undefined;
        if (typeof v !== "number" || !Number.isFinite(v)) throw new Error("@" + x.nome + " não é um atributo desta ficha.");
        return v;
      }
      case "neg": return -contaDaFormula(x.a, valorDe);
      case "fn":
        if (x.estatistica) return estatisticaDoNo(x, valorDe);
        return FUNCOES_DE_FORMULA[x.nome].fn.apply(null, x.args.map(function (a) { return contaDaFormula(a, valorDe); }));
      case "op": return conta(x.op, contaDaFormula(x.a, valorDe), contaDaFormula(x.b, valorDe));
    }
    throw new Error("Fórmula inválida.");
  }

  function conta(op, a, b) {
    if (op === "+") return a + b;
    if (op === "-") return a - b;
    if (op === "*") return a * b;
    if (b === 0) throw new Error("Divisão por zero na fórmula.");
    return a / b;
  }

  /* Arredondar para baixo sem cair no 0,1 + 0,2 do ponto flutuante. */
  function pisoSeguro(v) { return Math.floor(v + 1e-9); }

  function textoDeNumero(v) {
    var r = Math.round(v * 100) / 100;
    return String(r).replace(".", ",").replace("-", "−");
  }

  function quantidadeEFaces(x, valorDe) {
    var q = pisoSeguro(contaDaFormula(x.q, valorDe));
    var f = pisoSeguro(contaDaFormula(x.f, valorDe));
    if (q < 0) throw new Error("A quantidade de dados ficou negativa (" + q + ").");
    if (q > MAX_QUANTIDADE) throw new Error("A quantidade de dados passou de " + MAX_QUANTIDADE + " (" + q + ").");
    if (f < 1) throw new Error("Um dado precisa de pelo menos 1 face (deu " + f + ").");
    if (f > MAX_FACES) throw new Error("Um dado passa de " + MAX_FACES + " faces (" + f + ").");
    return { q: q, f: f };
  }

  /* ---------------- rolar um dado (com os sufixos) ----------------
     Devolve { valor, rolagens, marcas, eleito?, sucessos?, natural? }.
     `sortear(faces)` é o sorteio (o de verdade ou o da estatística). */
  function rolarDado(x, valorDe, sortear) {
    var qf = quantidadeEFaces(x, valorDe);
    var q = qf.q, f = qf.f;
    function um() { return x.fate ? sortear(3) - 2 : sortear(f); }
    var faces = [], marcas = [];
    for (var i = 0; i < q; i++) { faces.push(um()); marcas.push(""); }
    if (x.explode) {
      var limiar = x.explode.limiar === null ? f : pisoSeguro(x.explode.limiar);
      if (limiar < 2) throw new Error("Explodir de " + limiar + " para cima explodiria sempre: use 2 ou mais (1d6!5).");
      if (limiar > f) throw new Error("Explodir de " + limiar + " para cima num d" + f + " nunca acontece.");
      var extras = 0;
      for (var e = 0; e < faces.length && extras < MAX_EXPLOSOES; e++) {
        if (faces[e] >= limiar) { faces.push(um()); marcas.push("explosao"); extras++; }
      }
    }
    if (x.iguais && q >= 2) {
      /* Tunnels & Trolls: todos iguais → rola de novo o mesmo tanto e soma. */
      var lote = faces.slice(0, q), rodadas = 0;
      while (rodadas < MAX_IGUAIS && lote.every(function (v) { return v === lote[0]; })) {
        lote = [];
        for (var r2 = 0; r2 < q; r2++) { var novo = um(); lote.push(novo); faces.push(novo); marcas.push("explosao"); }
        rodadas++;
      }
    }
    var m = x.porDado ? contaDaFormula(x.porDado, valorDe) : 0;
    var valores = faces.map(function (v) { return v + m; });
    var mantidos = valores.map(function () { return true; });
    if (x.manter) {
      var ordem = valores.map(function (v, k) { return k; }).sort(function (a, b) { return valores[a] - valores[b] || a - b; });
      var n = Math.min(x.manter.n, valores.length);
      var fora;
      if (x.manter.tipo === "manter") fora = x.manter.modo === "h" ? ordem.slice(0, valores.length - n) : ordem.slice(n);
      else fora = x.manter.modo === "l" ? ordem.slice(0, n) : ordem.slice(valores.length - n);
      fora.forEach(function (k) { mantidos[k] = false; marcas[k] = "descartado"; });
    }
    if (x.critico) faces.forEach(function (v, k) { if (v >= x.critico && marcas[k] !== "descartado") marcas[k] = marcas[k] === "explosao" ? "explosao" : "critico"; });
    var r = { rolagens: valores, marcas: marcas, faces: f, fate: !!x.fate };
    var soma = 0, quantos = 0;
    valores.forEach(function (v, k) { if (mantidos[k]) { soma += v; quantos++; } });
    if (x.contar) {
      var alvo = contaDaFormula(x.contar.alvo, valorDe);
      var sucessos = 0;
      valores.forEach(function (v, k) { if (mantidos[k] && (x.contar.modo === "ge" ? v >= alvo : v <= alvo)) sucessos++; });
      r.sucessos = sucessos;
      r.alvo = alvo;
      r.valor = sucessos;
    } else {
      r.valor = soma;
      if (x.manter && quantos < valores.length) r.eleito = soma;
    }
    r.mantidos = quantos;
    return r;
  }

  function dadoSimples(x) { return !x.manter && !x.explode && !x.iguais && !x.contar && !x.porDado && !x.fate; }

  /* ---------------- avaliar ----------------
     ctx = { valorDe, sortear, rolados (lista que recebe cada dado),
             contagem, natural } */
  function avaliar(x, ctx) {
    if (!temDadoNo(x)) return contaDaFormula(x, ctx.valorDe);
    if (x.k === "dado") {
      var primeiro = !ctx.rolados.length;
      var r;
      if (ctx.contagem !== "soma" && primeiro && dadoSimples(x)) {
        /* maior/menor: o primeiro dado é o conjunto de onde sai um só. */
        r = rolarDado(x, ctx.valorDe, ctx.sortear);
        var v = r.rolagens.length ? (ctx.contagem === "menor" ? Math.min.apply(null, r.rolagens) : Math.max.apply(null, r.rolagens)) : 0;
        ctx.natural = v;
        if (r.rolagens.length > 1) r.eleito = v;
        r.valor = v;
      } else {
        r = rolarDado(x, ctx.valorDe, ctx.sortear);
        if (ctx.contagem !== "soma" && primeiro && x.manter && r.mantidos === 1 && !x.contar) ctx.natural = r.valor;
      }
      ctx.rolados.push(r);
      return r.valor;
    }
    if (x.k === "neg") return -avaliar(x.a, ctx);
    if (x.k === "fn") {
      if (x.estatistica) return estatisticaDoNo(x, ctx.valorDe);
      return FUNCOES_DE_FORMULA[x.nome].fn.apply(null, x.args.map(function (a) { return avaliar(a, ctx); }));
    }
    if (x.k === "op") return conta(x.op, avaliar(x.a, ctx), avaliar(x.b, ctx));
    throw new Error("Fórmula inválida.");
  }

  /* ---------------- estatística (v2: min, max, ev) ---------------- */

  function intervalo(x, valorDe) {
    if (!temDadoNo(x)) { var c = contaDaFormula(x, valorDe); return { min: c, max: c }; }
    if (x.k === "dado") {
      var qf = quantidadeEFaces(x, valorDe);
      var m = x.porDado ? contaDaFormula(x.porDado, valorDe) : 0;
      var lo = (x.fate ? -1 : 1) + m, hi = (x.fate ? 1 : qf.f) + m;
      var total = qf.q;
      var kept = !x.manter ? total : x.manter.tipo === "manter" ? Math.min(x.manter.n, total) : Math.max(0, total - x.manter.n);
      if (x.contar) return { min: 0, max: x.explode || x.iguais ? Infinity : kept };
      if (x.explode || x.iguais) return { min: kept * lo, max: Infinity };
      return { min: Math.min(kept * lo, kept * hi), max: Math.max(kept * lo, kept * hi) };
    }
    if (x.k === "neg") { var n = intervalo(x.a, valorDe); return { min: -n.max, max: -n.min }; }
    if (x.k === "fn") {
      if (x.estatistica) { var e = estatisticaDoNo(x, valorDe); return { min: e, max: e }; }
      var iv = x.args.map(function (a) { return intervalo(a, valorDe); });
      if (x.nome === "min") return { min: Math.min.apply(null, iv.map(function (i) { return i.min; })), max: Math.min.apply(null, iv.map(function (i) { return i.max; })) };
      if (x.nome === "max") return { min: Math.max.apply(null, iv.map(function (i) { return i.min; })), max: Math.max.apply(null, iv.map(function (i) { return i.max; })) };
      var fn = FUNCOES_DE_FORMULA[x.nome].fn;
      if (x.nome === "abs" && iv[0].min < 0 && iv[0].max > 0) return { min: 0, max: Math.max(-iv[0].min, iv[0].max) };
      var a1 = fn(iv[0].min), a2 = fn(iv[0].max);
      return { min: Math.min(a1, a2), max: Math.max(a1, a2) };
    }
    var a = intervalo(x.a, valorDe), b = intervalo(x.b, valorDe);
    if (x.op === "+") return { min: a.min + b.min, max: a.max + b.max };
    if (x.op === "-") return { min: a.min - b.max, max: a.max - b.min };
    if (x.op === "/" && b.min <= 0 && b.max >= 0) throw new Error("Divisão que pode dar zero: sem mínimo ou máximo.");
    var cantos = [conta(x.op, a.min, b.min), conta(x.op, a.min, b.max), conta(x.op, a.max, b.min), conta(x.op, a.max, b.max)]
      .filter(function (v) { return !isNaN(v); });
    return { min: Math.min.apply(null, cantos), max: Math.max.apply(null, cantos) };
  }

  /* A média exata quando a conta é linear; senão, 20 000 rolagens com um
     sorteio próprio e fixo (o mesmo resultado sempre, e nada do sorteio
     de verdade é gasto). */
  function mediaExata(x, valorDe) {
    if (!temDadoNo(x)) return contaDaFormula(x, valorDe);
    if (x.k === "dado") {
      if (x.explode || x.iguais) return null;
      if (x.manter || x.contar) return mediaPorEnumeracao(x, valorDe);
      var qf = quantidadeEFaces(x, valorDe);
      var m = x.porDado ? contaDaFormula(x.porDado, valorDe) : 0;
      return qf.q * ((x.fate ? 0 : (qf.f + 1) / 2) + m);
    }
    if (x.k === "neg") { var n = mediaExata(x.a, valorDe); return n === null ? null : -n; }
    if (x.k === "fn") return x.estatistica ? estatisticaDoNo(x, valorDe) : null;
    var a = mediaExata(x.a, valorDe), b = mediaExata(x.b, valorDe);
    if (a === null || b === null) return null;
    if (x.op === "+" || x.op === "-" || x.op === "*") return conta(x.op, a, b);
    return temDadoNo(x.b) ? null : conta(x.op, a, b);
  }

  /* Manter, descartar e contar: a média exata, passando por todas as
     combinações, quando elas são poucas (até 200 mil). */
  function mediaPorEnumeracao(x, valorDe) {
    var qf = quantidadeEFaces(x, valorDe);
    var lados = x.fate ? 3 : qf.f;
    var total = Math.pow(lados, qf.q);
    if (!qf.q) return 0;
    if (total > 200000) return null;
    var faces = [], soma = 0;
    for (var i = 0; i < qf.q; i++) faces.push(1);
    for (var c = 0; c < total; c++) {
      var k = 0;
      var fila = faces.slice();
      soma += rolarDado(x, valorDe, function () { return fila[k++]; }).valor;
      for (var j = 0; j < qf.q; j++) { if (faces[j] < lados) { faces[j]++; break; } faces[j] = 1; }
    }
    return soma / total;
  }

  function estatisticaDoNo(x, valorDe) {
    var alvo = x.args[0];
    if (x.nome === "min" || x.nome === "max") {
      var iv = intervalo(alvo, valorDe);
      var v = x.nome === "min" ? iv.min : iv.max;
      if (!Number.isFinite(v)) throw new Error(x.nome + "() não tem limite: o dado explode ou repete.");
      return v;
    }
    var exata = mediaExata(alvo, valorDe);
    if (exata !== null) return Math.round(exata * 100) / 100;
    /* mulberry32 com semente fixa: o mesmo número sempre. */
    var semente = 0x9E3779B9;
    function sortear(f) {
      semente = (semente + 0x6D2B79F5) | 0;
      var z = Math.imul(semente ^ (semente >>> 15), 1 | semente);
      z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;
      return 1 + Math.floor((((z ^ (z >>> 14)) >>> 0) / 4294967296) * f);
    }
    var soma = 0, vezes = 20000;
    for (var i = 0; i < vezes; i++) soma += avaliar(alvo, { valorDe: valorDe, sortear: sortear, rolados: [], contagem: "soma" });
    return Math.round((soma / vezes) * 100) / 100;
  }

  /* ---------------- escrever ---------------- */

  /* Precedência para escrever a conta de volta com o mínimo de
     parênteses. */
  function nivel(x) { return x.k === "op" ? (x.op === "+" || x.op === "-" ? 1 : 2) : 3; }

  function textoDoDado(x, valorDe) {
    if (x.burning) return x.burning + pisoSeguro(contaDaFormula(x.q, valorDe)) + (x.explode ? "!" : "");
    var qf = quantidadeEFaces(x, valorDe);
    var s = qf.q + "d" + (x.fate ? "F" : x.porcento ? "%" : qf.f);
    if (x.explode) s += "!" + (x.explode.limiar !== null ? pisoSeguro(x.explode.limiar) : "");
    if (x.manter) s += (x.manter.tipo === "manter" ? (x.manter.modo === "l" ? "kl" : "k") : (x.manter.modo === "h" ? "dh" : "d")) + x.manter.n;
    if (x.critico) s += "c" + x.critico;
    if (x.iguais) s += x.iguais;
    if (x.semOrdem) s += "ns";
    if (x.porDado) { var m = contaDaFormula(x.porDado, valorDe); s += (m < 0 ? "--" : "++") + textoDeNumero(Math.abs(m)); }
    if (x.contar) s += " " + (x.contar.modo === "ge" ? ">>" : "<<") + " " + textoDeNumero(contaDaFormula(x.contar.alvo, valorDe));
    return s;
  }

  function textoDaFace(v, r) {
    if (r.fate) return v > 0 ? "+" : v < 0 ? "−" : "0";
    return textoDeNumero(v);
  }

  /* A fórmula escrita com os números de agora: os pedaços sem dado viram
     o número, cada dado vira "3d6" — e, depois de rolado, "3d6 (4, 2, 6)",
     com os descartados entre colchetes, os de explosão com "!" e os
     críticos com "*". */
  function escreverFormula(x, valorDe, rolados) {
    if (x.k === "rep") return x.n + "#" + escreverFormula(x.a, valorDe, rolados);
    if (x.k === "cmp") return escreverFormula(x.a, valorDe, rolados) + " " + { "<": "<", "<=": "≤", ">": ">", ">=": "≥", "=": "=" }[x.op] + " " + escreverFormula(x.b, valorDe, rolados);
    if (ehEstatistica(x)) return x.nome + "(" + escreverFormula(x.args[0], valorDe, null) + ") = " + textoDeNumero(estatisticaDoNo(x, valorDe));
    if (!temDadoNo(x)) return textoDeNumero(contaDaFormula(x, valorDe));
    if (x.k === "dado") {
      var r = rolados ? rolados.shift() : null;
      var base = textoDoDado(x, valorDe);
      if (!r) return base;
      var lista = r.rolagens.map(function (v, k) {
        var t = textoDaFace(v, r);
        if (r.marcas[k] === "descartado") return "[" + t + "]";
        if (r.marcas[k] === "explosao") return t + "!";
        if (r.marcas[k] === "critico") return t + "*";
        return t;
      });
      var fim = r.sucessos !== undefined ? " → " + r.sucessos + (r.sucessos === 1 ? " sucesso" : " sucessos") : r.eleito !== undefined ? " → " + textoDeNumero(r.eleito) : "";
      return base + " (" + (lista.length ? lista.join(", ") : "nenhum") + fim + ")";
    }
    if (x.k === "neg") return "−" + embrulhar(x.a, 3, valorDe, rolados);
    if (x.k === "fn") return x.nome + "(" + x.args.map(function (a) { return escreverFormula(a, valorDe, rolados); }).join(", ") + ")";
    var n = nivel(x);
    var a = embrulhar(x.a, n, valorDe, rolados);
    var b = embrulhar(x.b, n + (x.op === "-" || x.op === "/" ? 1 : 0), valorDe, rolados);
    return a + " " + (x.op === "-" ? "−" : (x.op === "*" ? "×" : x.op)) + " " + b;
  }
  function embrulhar(x, minimo, valorDe, rolados) {
    var s = escreverFormula(x, valorDe, rolados);
    return temDadoNo(x) && nivel(x) < minimo ? "(" + s + ")" : s;
  }
  function temDadoNo(x) {
    if (!x || ehEstatistica(x)) return false;
    if (x.k === "dado") return true;
    return temDadoNo(x.a) || temDadoNo(x.b) || (x.args || []).some(temDadoNo);
  }

  /* A prévia, sem rolar: "(@FOR/2+1)d6 + @INT" com FOR 4 e INT 2 → "3d6 + 2". */
  function previaDaFormula(texto, valorDe) {
    var l = lerFormula(texto);
    if (!l.ok) return l;
    try {
      return { ok: true, texto: escreverFormula(l.arvore, valorDe, null), dados: l.dados, referencias: l.referencias };
    } catch (e) {
      return erroDeFormula(e.message);
    }
  }

  function contagemValida(c) { return CONTAGENS.indexOf(c) >= 0 ? c : "maior"; }

  /* pedido = { nome, sigla, formula, contagem, valorDe(nome) → número,
                bonus, bonusTemporario, modificadores } */
  function formula(pedido) {
    var p = pedido || {};
    var contagem = contagemValida(p.contagem);
    var falhou = function (mensagem) {
      return {
        ok: false, erro: "formula", mensagem: mensagem, tipo: contagem === "soma" ? "soma" : "dependente",
        nome: p.nome || "", expressao: String(p.formula || ""), rolagens: [], parcelas: [], total: 0,
      };
    };
    var l = lerFormula(p.formula);
    if (!l.ok) return falhou(l.mensagem);
    if (!l.dados) return falhou("A fórmula precisa ter pelo menos um dado (por exemplo, 1d20).");

    var raiz = l.arvore;
    var vezes = raiz.k === "rep" ? raiz.n : 1;
    var corpo = raiz.k === "rep" ? raiz.a : raiz;
    var comparacao = corpo.k === "cmp" ? corpo : null;
    var conta_ = comparacao ? comparacao.a : corpo;

    var rodadas = [];
    var natural;
    try {
      for (var i = 0; i < vezes; i++) {
        var ctx = { valorDe: p.valorDe, sortear: sorteio, rolados: [], contagem: contagem };
        var bruto = avaliar(conta_, ctx);
        /* Só estatística (ev(4d6d1), sem rolar nada): as casas decimais ficam. */
        var valor = ctx.rolados.length ? pisoSeguro(bruto) : Math.round(bruto * 100) / 100;
        var rodada = { valor: valor, rolados: ctx.rolados };
        if (comparacao) {
          var alvo = avaliar(comparacao.b, ctx);
          rodada.alvo = alvo;
          rodada.sucesso = { "<": valor < alvo, "<=": valor <= alvo, ">": valor > alvo, ">=": valor >= alvo, "=": valor === alvo }[comparacao.op];
        }
        rodada.detalhe = escreverFormula(comparacao || conta_, p.valorDe, ctx.rolados.slice());
        if (i === 0) natural = ctx.natural;
        rodadas.push(rodada);
      }
    } catch (e) {
      return falhou(e.message);
    }

    var todos = rodadas.reduce(function (s, rd) { return s.concat(rd.rolados); }, []);
    var rolagens = [], marcas = [];
    todos.forEach(function (rd) { rd.rolagens.forEach(function (v, k) { rolagens.push(v); marcas.push(rd.marcas[k] || ""); }); });

    var base = rodadas.reduce(function (s, rd) { return s + rd.valor; }, 0);
    var parcelas;
    var totalTexto = null;
    if (vezes > 1) {
      parcelas = rodadas.map(function (rd, k) { return { rotulo: "#" + (k + 1), valor: rd.valor, detalhe: rd.detalhe + (comparacao ? (rd.sucesso ? " — sucesso" : " — falha") : "") }; });
      totalTexto = rodadas.map(function (rd) { return String(rd.valor) + (comparacao ? (rd.sucesso ? " ✓" : " ✗") : ""); }).join(" · ");
    } else {
      parcelas = [{ rotulo: "Fórmula", valor: base, detalhe: rodadas[0].detalhe }];
      if (comparacao) {
        totalTexto = base + " · " + (rodadas[0].sucesso ? "sucesso" : "falha");
        parcelas.push({ rotulo: rodadas[0].sucesso ? "Sucesso" : "Falha", valor: 0, semValor: true, detalhe: textoDeNumero(base) + " " + { "<": "<", "<=": "≤", ">": ">", ">=": "≥", "=": "=" }[comparacao.op] + " " + textoDeNumero(rodadas[0].alvo) });
      }
    }

    var r = {
      ok: true,
      erro: null,
      tipo: contagem === "soma" ? "soma" : "dependente",
      nome: p.nome || "",
      sigla: p.sigla || "",
      expressao: l.texto,
      selecao: contagem === "soma" ? null : contagem,
      rolagens: rolagens.slice(0, 200),
      formula: l.texto,
      contagem: contagem,
      parcelas: parcelas,
      total: base,
    };
    if (marcas.some(Boolean)) r.marcas = marcas.slice(0, 200);
    /* Só dados Fate: as faces se escrevem − 0 + no cartão. */
    if (todos.length && todos.every(function (rd) { return rd.fate; })) r.fate = true;
    if (!totalTexto && base !== Math.floor(base)) totalTexto = textoDeNumero(base);
    if (totalTexto) r.totalTexto = totalTexto;
    if (comparacao && vezes === 1) r.sucesso = !!rodadas[0].sucesso;
    if (vezes > 1) r.repeticoes = rodadas.map(function (rd) { return rd.valor; });
    if (contagem !== "soma") r.natural = natural || 0;
    acrescentarBonusEExtras(r, p);
    /* Com bônus, o total da comparação é o de depois do bônus. */
    if (comparacao && vezes === 1 && r.total !== base) {
      var final = r.total;
      r.sucesso = { "<": final < rodadas[0].alvo, "<=": final <= rodadas[0].alvo, ">": final > rodadas[0].alvo, ">=": final >= rodadas[0].alvo, "=": final === rodadas[0].alvo }[comparacao.op];
      r.totalTexto = final + " · " + (r.sucesso ? "sucesso" : "falha");
    }
    return r;
  }

  /* Bônus fixo, temporário e dados extras: o mesmo caminho da rolagem
     dependente, para a fórmula e o atributo somarem igual. */
  function acrescentarBonusEExtras(r, p) {
    var bonus = inteiroSeguro(p.bonus);
    if (bonus) { r.total += bonus; r.parcelas.push({ rotulo: "Bônus", valor: bonus }); }
    var temporario = inteiroSeguro(p.bonusTemporario);
    if (temporario) { r.total += temporario; r.parcelas.push({ rotulo: "Temporário", valor: temporario }); }
    r.bonus = bonus;
    r.bonusTemporario = temporario;
    r.extras = [];
    (p.modificadores || []).forEach(function (mod) {
      if (!mod || !mod.dado) return;
      var s = somar(mod.dado);
      if (!s.ok) return;
      var sinal = mod.operacao === "-" ? -1 : 1;
      var valor = sinal * s.total;
      r.total += valor;
      r.extras.push({ id: mod.id || null, operacao: sinal < 0 ? "-" : "+", expressao: s.expressao, rolagens: s.rolagens, total: s.total, valor: valor });
      r.parcelas.push({ rotulo: (sinal < 0 ? "−" : "+") + s.expressao, valor: valor, detalhe: s.rolagens.join(" + ") });
    });
    return r;
  }

  /* Troca uma referência por outra nas fórmulas (renomear a sigla ou o
     nome de um atributo): "@FOR", "@{FOR}" e "@FORd20" acompanham. */
  function trocarReferencia(texto, antiga, nova) {
    var s = String(texto || "");
    var a = String(antiga || "").trim();
    var n = String(nova || "").trim();
    if (!s || !a || !n || a === n) return s;
    var escapada = a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    var simples = /^[A-Za-z0-9_\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF]+$/.test(n);
    var novaRef = simples ? "@" + n : "@{" + n + "}";
    return s
      .replace(new RegExp("@\\{\\s*" + escapada + "\\s*\\}", "gi"), "@{" + n + "}")
      .replace(new RegExp("@" + escapada + "(?=$|[^A-Za-z0-9_\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u00FF]|[dD][0-9(@])", "gi"), novaRef);
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
    CONTAGENS: CONTAGENS,
    MAX_FORMULA: MAX_FORMULA,
    lerFormula: lerFormula,
    previaDaFormula: previaDaFormula,
    formula: formula,
    contagemValida: contagemValida,
    trocarReferencia: trocarReferencia,
    usarSorteio: usarSorteio,
    restaurarSorteio: restaurarSorteio,
    MAX_QUANTIDADE: MAX_QUANTIDADE,
    MAX_FACES: MAX_FACES,
  };
})(typeof window !== "undefined" ? window : globalThis);
