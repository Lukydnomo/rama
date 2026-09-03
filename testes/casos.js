/* =====================================================================
   R.A.M.A. — casos de teste
   ---------------------------------------------------------------------
   Um só arquivo de casos, rodado de dois lugares: pelo navegador em
   testes/index.html e pela linha de comando em testes/executar.js.
   Escrever o caso duas vezes seria a forma mais fácil de os dois
   ambientes discordarem em silêncio.

   O sorteio é substituído por uma fila de resultados combinados. Testar
   dado de verdade com número aleatório de verdade não testa nada.
   ===================================================================== */

(function (global) {
  "use strict";

  function casos(t) {
    var D = global.RAMADados;
    var S = global.RAMAFicha;
    var V = global.RAMAValidacao;

    /* Fila de faces: cada chamada de sorteio consome a próxima. Se a
       fila acabar antes da conta terminar, o teste falha por aqui — e
       não com um número aleatório disfarçando o erro. */
    function comFila(valores, fn) {
      var fila = valores.slice();
      D.usarSorteio(function () {
        if (!fila.length) throw new Error("a fila de dados acabou antes da rolagem terminar");
        return fila.shift();
      });
      try { return fn(); }
      finally { D.restaurarSorteio(); }
    }

    /* =================================================================
       LEITURA DA EXPRESSÃO
       ================================================================= */

    t.grupo("Expressão de dado — o que vale");

    [
      ["1d20", 1, 20, "maior"],
      ["2d20", 2, 20, "maior"],
      ["-2d20", 2, 20, "menor"],
      ["1d6", 1, 6, "maior"],
      ["10d100", 10, 100, "maior"],
      ["3d6", 3, 6, "maior"],
      ["1d100", 1, 100, "maior"],
      ["+1d20", 1, 20, "maior"],
      ["2D20", 2, 20, "maior"],
      ["  2d20  ", 2, 20, "maior"],
    ].forEach(function (caso) {
      var a = D.analisar(caso[0]);
      t.ok("analisar(" + JSON.stringify(caso[0]) + ") é válida", a.ok, a.erro);
      t.igual("  quantidade de " + caso[0], a.quantidade, caso[1]);
      t.igual("  faces de " + caso[0], a.faces, caso[2]);
      t.igual("  seleção de " + caso[0], a.selecao, caso[3]);
    });

    t.grupo("Expressão de dado — o que não vale");

    ["d20", "2d", "0d20", "2d0", "2.5d20", "abc", "2x20", "", "  ", "d", "-d20",
     "2d20d3", "2,5d20", "-0d20", "2d 2 0x", "1e3d20", "999d20", "2d9999"
    ].forEach(function (bruto) {
      var a = D.analisar(bruto);
      t.ok("analisar(" + JSON.stringify(bruto) + ") é recusada", !a.ok, "aceitou como " + JSON.stringify(a));
    });

    t.grupo("Expressão canônica");
    t.igual("normalizar('2 D 20')", D.normalizar("2 D 20"), "2d20");
    t.igual("normalizar('-2d20')", D.normalizar("-2d20"), "-2d20");
    t.igual("normalizar('+2d20')", D.normalizar("+2d20"), "2d20");
    t.igual("normalizar('lixo')", D.normalizar("lixo"), "");

    /* =================================================================
       SELEÇÃO DO DADO PRINCIPAL
       ================================================================= */

    t.grupo("Dado principal");

    comFila([6, 15], function () {
      var r = D.rolar("2d20");
      t.iguais("2d20 rolou [6,15]", r.rolagens, [6, 15]);
      t.igual("2d20 → principal é o MAIOR", r.principal, 15);
      t.igual("2d20 → seleção 'maior'", r.selecao, "maior");
    });

    comFila([6, 15], function () {
      var r = D.rolar("-2d20");
      t.iguais("-2d20 rolou [6,15]", r.rolagens, [6, 15]);
      t.igual("-2d20 → principal é o MENOR", r.principal, 6);
      t.igual("-2d20 → seleção 'menor'", r.selecao, "menor");
    });

    comFila([12], function () {
      var r = D.rolar("1d20");
      t.igual("1d20 com um dado só → principal é ele mesmo", r.principal, 12);
    });

    comFila([3, 3, 3], function () {
      var r = D.rolar("3d6");
      t.igual("3d6 empatado → principal continua sendo o valor", r.principal, 3);
      t.igual("3d6 → soma dos dados vem junto", r.soma, 9);
    });

    t.ok("rolar de expressão inválida não estoura", D.rolar("2x20").ok === false);

    /* =================================================================
       ROLAGEM DE PERÍCIA
       -----------------------------------------------------------------
       O caso do enunciado: Agilidade 2d20 tira 6 e 15; o principal é 15;
       Acrobacia soma +2 e +1d6 que sai 5. Total 22. O 6 fica de fora.
       ================================================================= */

    t.grupo("Perícia — bônus e dados extras");

    comFila([6, 15, 5], function () {
      var r = D.dependente({
        nome: "Acrobacia", sigla: "AGI", expressao: "2d20",
        bonus: 2, bonusTemporario: 0,
        modificadores: [{ id: "m1", operacao: "+", dado: "1d6" }],
      });
      t.iguais("atributo rolou [6,15]", r.rolagens, [6, 15]);
      t.igual("principal do atributo é 15", r.natural, 15);
      t.igual("1d6 extra saiu 5", r.extras[0].total, 5);
      t.igual("15 + 2 + 5 = 22", r.total, 22);
    });

    comFila([6, 15, 5], function () {
      var r = D.dependente({
        nome: "Perícia ruim", sigla: "AGI", expressao: "2d20",
        bonus: -2, bonusTemporario: 0,
        modificadores: [{ operacao: "-", dado: "1d6" }],
      });
      t.igual("principal 15, bônus −2, −1d6 (saiu 5) = 8", r.total, 8);
      t.igual("o extra entrou negativo", r.extras[0].valor, -5);
    });

    comFila([6, 15], function () {
      var r = D.dependente({ sigla: "AGI", expressao: "2d20", bonus: 0, bonusTemporario: 0, modificadores: [] });
      t.igual("sem bônus nenhum, total = principal", r.total, 15);
      t.igual("o dado descartado NÃO recebe bônus", r.rolagens[0], 6);
    });

    comFila([6, 15, 4], function () {
      var r = D.dependente({
        sigla: "AGI", expressao: "2d20",
        bonus: 2, bonusTemporario: 3,
        modificadores: [{ operacao: "+", dado: "1d4" }],
      });
      t.igual("bônus temporário soma junto: 15+2+3+4 = 24", r.total, 24);
    });

    comFila([18, 4], function () {
      var r = D.dependente({
        sigla: "AGI", expressao: "-2d20", bonus: 0, bonusTemporario: 0, modificadores: [],
      });
      t.igual("perícia com atributo em seleção negativa usa o menor", r.natural, 4);
    });

    comFila([9, 2, 3], function () {
      var r = D.dependente({
        sigla: "FOR", expressao: "1d20", bonus: 0, bonusTemporario: 0,
        modificadores: [{ operacao: "+", dado: "2d4" }],
      });
      t.igual("um extra de 2d4 soma OS DOIS dados: 9 + (2+3) = 14", r.total, 14);
    });

    comFila([10, 5], function () {
      var r = D.dependente({
        sigla: "FOR", expressao: "1d20", bonus: 0, bonusTemporario: 0,
        modificadores: [{ operacao: "+", dado: "lixo" }, { operacao: "+", dado: "1d6" }],
      });
      t.igual("modificador inválido é ignorado, o válido continua valendo", r.total, 15);
      t.igual("só um extra entrou na conta", r.extras.length, 1);
    });

    /* =================================================================
       DANO
       ================================================================= */

    t.grupo("Dano — todos os dados somam");

    comFila([6, 9], function () {
      var r = D.dano({ dano: "2d10" });
      t.iguais("2d10 rolou [6,9]", r.rolagens, [6, 9]);
      t.igual("2d10 = 6 + 9 = 15 (não existe dado principal)", r.total, 15);
    });

    comFila([6, 9], function () {
      var r = D.dano({ dano: "2d10", danoExtra: 4 });
      t.igual("2d10 + 4 = 19", r.total, 19);
      t.igual("o extra ficou registrado à parte", r.extra, 4);
    });

    comFila([2, 2], function () {
      var r = D.dano({ dano: "-2d10" });
      t.igual("dano ignora a seleção negativa e soma os dois", r.total, 4);
    });

    /* =================================================================
       CRÍTICO
       ================================================================= */

    t.grupo("Crítico");

    t.ok("natural 19 com margem 18 é crítico", D.ehCritico(19, 18));
    t.ok("natural 18 com margem 18 é crítico", D.ehCritico(18, 18));
    t.ok("natural 17 com margem 18 NÃO é crítico", !D.ehCritico(17, 18));
    t.ok("margem 0 nunca dá crítico", !D.ehCritico(20, 0));

    comFila([6, 9, 7, 8], function () {
      var r = D.dano({ dano: "2d10", danoExtra: 4, critico: true, multiplicador: 2 });
      t.igual("crítico x2 em 2d10 vira 4d10", r.expressao, "4d10");
      t.igual("rolou quatro dados", r.rolagens.length, 4);
      t.igual("soma dos dados-base: 6+9+7+8 = 30", r.somaBase, 30);
      t.igual("o extra NÃO é multiplicado: 30 + 4 = 34", r.total, 34);
      t.igual("o extra continua valendo 4", r.extra, 4);
    });

    comFila([5, 5, 5, 5, 5, 5], function () {
      var r = D.dano({ dano: "2d10", danoExtra: 10, critico: true, multiplicador: 3 });
      t.igual("crítico x3 em 2d10 vira 6d10", r.expressao, "6d10");
      t.igual("6 dados de 5 = 30, mais 10 de extra = 40", r.total, 40);
    });

    comFila([6, 9], function () {
      var r = D.dano({ dano: "2d10", danoExtra: 4, critico: false, multiplicador: 2 });
      t.igual("sem crítico o multiplicador não faz nada", r.expressao, "2d10");
      t.igual("6 + 9 + 4 = 19", r.total, 19);
    });

    comFila([6, 9], function () {
      var r = D.dano({ dano: "2d10", critico: true, multiplicador: 0 });
      t.igual("multiplicador 0 não apaga o dano — vira x1", r.expressao, "2d10");
    });

    comFila([6, 9, 3], function () {
      var r = D.dano({ dano: "2d10", danoExtra: "1d6", critico: false });
      t.igual("dano extra também aceita expressão de dado: 6+9+3 = 18", r.total, 18);
    });

    /* =================================================================
       O ATAQUE INTEIRO, DA PERÍCIA AO DANO CRÍTICO
       ================================================================= */

    t.grupo("Ataque completo");

    comFila([19, 3], function () {
      /* Luta com 2d20: sai 19 e 3, principal 19. Bônus +2 → total 21.
         A margem da espada é 18, e quem decide é o 19 natural. */
      var ataque = D.dependente({
        nome: "Luta", sigla: "FOR", expressao: "2d20",
        bonus: 2, bonusTemporario: 0, modificadores: [],
      });
      t.igual("natural principal = 19", ataque.natural, 19);
      t.igual("total do ataque = 21", ataque.total, 21);
      t.ok("19 natural com margem 18 é crítico", D.ehCritico(ataque.natural, 18));
      t.ok("o total 21 NÃO é o que decide o crítico", ataque.total !== ataque.natural);
    });

    comFila([17, 3], function () {
      var ataque = D.dependente({
        sigla: "FOR", expressao: "2d20", bonus: 5, bonusTemporario: 0, modificadores: [],
      });
      t.igual("total 22 com natural 17", ataque.total, 22);
      t.ok("bônus alto não fabrica crítico", !D.ehCritico(ataque.natural, 18));
    });

    /* =================================================================
       FICHA — estrutura padrão
       ================================================================= */

    if (S) {
      t.grupo("Ficha padrão");

      var ficha = S.criarFicha({ nome: "Teste" });

      t.igual("nasce com 5 atributos", ficha.atributos.length, 5);
      t.iguais("as siglas são as do projeto",
        ficha.atributos.map(function (a) { return a.sigla; }),
        ["FOR", "AGI", "PRE", "INT", "VIG"]);
      t.igual("todo atributo começa em 1d20",
        ficha.atributos.every(function (a) { return a.dado === "1d20"; }), true);

      t.igual("nasce com 3 status", ficha.status.length, 3);
      t.iguais("PV, PE e Sanidade",
        ficha.status.map(function (s) { return s.nome; }), ["PV", "PE", "Sanidade"]);

      t.igual("nasce com 28 perícias", ficha.pericias.length, 28);

      var comAsterisco = ficha.pericias.filter(function (p) { return p.nome.indexOf("*") >= 0; });
      t.igual("os asteriscos foram preservados", comAsterisco.length, 10);
      t.ok("Ocultismo* mantém o asterisco",
        ficha.pericias.some(function (p) { return p.nome === "Ocultismo*"; }));

      var sobrevivencia = ficha.pericias.find(function (p) { return p.nome === "Sobrevivência"; });
      t.ok("Sobrevivência existe", !!sobrevivencia);
      t.igual("Sobrevivência permite dois atributos",
        (sobrevivencia.atributosPermitidos || []).length, 2);

      t.ok("toda perícia aponta para um atributo que existe",
        ficha.pericias.every(function (p) {
          return ficha.atributos.some(function (a) { return a.id === p.atributoId; });
        }));

      t.ok("todo id é único", (function () {
        var ids = [];
        ficha.atributos.concat(ficha.status, ficha.pericias).forEach(function (r) { ids.push(r.id); });
        return new Set(ids).size === ids.length;
      })());

      t.igual("defesa começa zerada e configurável", ficha.defesa.dt, 0);
      t.igual("inventário começa vazio", ficha.inventario.itens.length, 0);
      t.igual("anotações começam vazias", ficha.anotacoes.pastas.length, 0);

      t.grupo("Peso do inventário");

      t.igual("itens 12, mochila reduz 3 → peso 9", S.pesoAtual({
        limite: 12,
        itens: [
          { id: "1", tipo: "item", nome: "Coisa", peso: 12 },
          { id: "2", tipo: "mochila", nome: "Bolsa", reducaoPeso: 3 },
        ],
      }), 9);

      t.igual("redução maior que o peso não vira negativo", S.pesoAtual({
        itens: [
          { id: "1", tipo: "item", peso: 2 },
          { id: "2", tipo: "mochila", reducaoPeso: 10 },
        ],
      }), 0);

      t.igual("mochila não pesa por si", S.pesoAtual({
        itens: [{ id: "1", tipo: "mochila", reducaoPeso: 0, peso: 5 }],
      }), 0);

      t.igual("meio quilo conta", S.pesoAtual({
        itens: [{ id: "1", tipo: "item", peso: 0.5 }, { id: "2", tipo: "item", peso: 0.25 }],
      }), 0.75);

      t.grupo("Normalização de ficha vinda de fora");

      var suja = S.normalizarFicha({
        nome: "  Michael  ",
        atributos: [{ nome: "Força", sigla: "for", valor: "3", dado: "2 d 20" }],
        status: [{ nome: "PV", atual: "20", maximo: "12" }],
        pericias: [{ nome: "Acrobacia", atributoId: "inexistente", bonus: "2" }],
        inventario: { limite: "-5", itens: [{ tipo: "arma", nome: "Faca", dano: "2x10", critico: "abc" }] },
        camposCustomizados: "isto não é uma lista",
      });

      t.igual("nome aparado", suja.nome, "Michael");
      t.igual("sigla vira maiúscula", suja.atributos[0].sigla, "FOR");
      t.igual("valor de texto vira número", suja.atributos[0].valor, 3);
      t.igual("dado vira canônico", suja.atributos[0].dado, "2d20");
      t.igual("atual acima do máximo é aparado", suja.status[0].atual, 12);
      t.ok("perícia órfã foi religada a um atributo existente",
        suja.atributos.some(function (a) { return a.id === suja.pericias[0].atributoId; }));
      t.igual("limite negativo vira zero", suja.inventario.limite, 0);
      t.igual("dado de dano inválido vira vazio", suja.inventario.itens[0].dano, "");
      t.igual("crítico inválido vira 0", suja.inventario.itens[0].critico, 0);
      t.ok("campo que deveria ser lista virou lista", Array.isArray(suja.camposCustomizados));
      t.ok("todo item ganhou id", suja.inventario.itens.every(function (i) { return !!i.id; }));
    }

    /* =================================================================
       VALIDAÇÃO E IMPORTAÇÃO
       ================================================================= */

    if (V) {
      t.grupo("Validação");

      t.ok("dado válido passa", V.dado("2d20").ok);
      t.ok("dado inválido não passa", !V.dado("2x20").ok);
      t.ok("multiplicador 2 passa", V.multiplicador(2).ok);
      t.ok("multiplicador 0 não passa", !V.multiplicador(0).ok);
      t.ok("crítico 18 passa", V.critico(18).ok);
      t.ok("crítico negativo não passa", !V.critico(-3).ok);
      t.ok("peso negativo não passa", !V.peso(-1).ok);
      t.ok("peso 0,5 passa", V.peso(0.5).ok);
      t.ok("id em branco não passa", !V.id("").ok);
      t.ok("uuid passa", V.id("3f2a1b4c-1111-4222-8333-444455556666").ok);

      t.grupo("Importação — o que precisa ser recusado");

      t.ok("JSON que não é do R.A.M.A. é recusado",
        !V.importado({ tipo: "personagem", dados: {} }).ok);
      t.ok("tipo desconhecido é recusado",
        !V.importado({ rama: true, tipo: "coisa", versaoFormato: 1, dados: {} }).ok);
      t.ok("versão futura é recusada",
        !V.importado({ rama: true, tipo: "personagem", versaoFormato: 99, dados: {} }).ok);
      t.ok("sem dados é recusado",
        !V.importado({ rama: true, tipo: "personagem", versaoFormato: 1 }).ok);

      var bom = V.importado({
        rama: true, tipo: "personagem", versaoFormato: 1,
        dados: { nome: "Vinda de fora", ownerId: "OUTRA-PESSOA", id: "ID-ANTIGO", token: "SEGREDO" },
      });
      t.ok("um pacote correto passa", bom.ok);
      t.ok("ownerId de fora é descartado", bom.dados.ownerId === undefined || bom.dados.ownerId === "");
      t.ok("token de fora é descartado", bom.dados.token === undefined);
      t.ok("id de fora é descartado", bom.dados.id === undefined || bom.dados.id !== "ID-ANTIGO");
    }
  }

  global.RAMACasos = casos;
})(typeof window !== "undefined" ? window : globalThis);
