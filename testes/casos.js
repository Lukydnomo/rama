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
    var H = global.RAMAHabilidades;
    var Ver = global.RAMAVersion;

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
       HABILIDADES
       ================================================================= */

    if (S && H) {
      t.grupo("Habilidades — modelo");

      var hab = H.criarHabilidade({ nome: "Ataque Especial", texto: "...", origem: "geral", cor: "#C6564B", negrito: true });
      t.igual("habilidade nasce com id", typeof hab.id, "string");
      t.igual("tipo é habilidade", hab.tipo, H.TIPO_HABILIDADE);
      t.igual("nome guardado", hab.nome, "Ataque Especial");
      t.igual("origem guardada", hab.origem, "geral");
      t.igual("cor válida aceita", hab.cor, "#C6564B");
      t.igual("negrito guardado", hab.negrito, true);
      t.ok("habilidade não tem valor nem dado — é informação",
        hab.valor === undefined && hab.dado === undefined && hab.atributoId === undefined);

      t.grupo("Habilidades — cor nunca vira CSS arbitrário");

      t.igual("hex de 6 passa", H.corValida("#A33B3B"), "#A33B3B");
      t.igual("hex de 3 passa", H.corValida("#abc"), "#abc");
      t.igual("sem cor é vazio", H.corValida(""), "");
      t.igual("nome de cor é recusado", H.corValida("red"), "");
      t.igual("expressão CSS é recusada", H.corValida("red; background: url(x)"), "");
      t.igual("javascript: é recusado", H.corValida("javascript:alert(1)"), "");
      t.igual("var() é recusado", H.corValida("var(--cor-fundo)"), "");
      t.igual("cor inválida numa habilidade vira vazio",
        H.criarHabilidade({ nome: "X", cor: "'; drop" }).cor, "");

      t.grupo("Habilidades — árvore recursiva");

      var arv = H.arvoreVazia();
      var classe = H.criarPasta("Classe");
      var passivas = H.criarPasta("Passivas");
      var defensivas = H.criarPasta("Defensivas");
      var hx = H.criarHabilidade({ nome: "Habilidade X" });
      var hy = H.criarHabilidade({ nome: "Habilidade Y" });

      H.inserir(arv, classe, null);
      H.inserir(arv, passivas, classe.id);
      H.inserir(arv, defensivas, passivas.id);
      H.inserir(arv, hx, defensivas.id);
      H.inserir(arv, hy, passivas.id);

      t.igual("raiz tem uma pasta", arv.filhos.length, 1);
      t.igual("Classe contém Passivas", arv.filhos[0].filhos[0].nome, "Passivas");
      t.igual("terceiro nível existe", arv.filhos[0].filhos[0].filhos[0].nome, "Defensivas");
      t.igual("habilidade no quarto nível",
        arv.filhos[0].filhos[0].filhos[0].filhos[0].nome, "Habilidade X");

      var achado = H.achar(arv, hx.id);
      t.ok("achar encontra em profundidade", !!achado);
      t.igual("  e sabe a profundidade", achado.profundidade, 3);
      t.igual("  e sabe o pai", achado.pai.nome, "Defensivas");

      t.iguais("contagem percorre a árvore inteira",
        [H.contar(arv).pastas, H.contar(arv).habilidades], [3, 2]);

      t.grupo("Habilidades — mover");

      t.ok("move habilidade entre pastas", H.mover(arv, hx.id, classe.id));
      t.igual("  saiu de Defensivas", defensivas.filhos.length, 0);
      t.igual("  chegou em Classe", classe.filhos.length, 2);

      t.ok("move para a raiz", H.mover(arv, hx.id, null));
      t.igual("  a raiz recebeu", arv.filhos.length, 2);

      t.ok("NÃO move uma pasta para dentro de si mesma", !H.mover(arv, classe.id, classe.id));
      t.ok("NÃO move uma pasta para dentro de um descendente seu",
        !H.mover(arv, classe.id, defensivas.id));
      t.ok("a árvore continua íntegra depois das tentativas recusadas",
        !!H.achar(arv, defensivas.id) && !!H.achar(arv, classe.id));

      t.grupo("Habilidades — excluir pasta sem perder conteúdo");

      var arv2 = H.arvoreVazia();
      var pastaA = H.criarPasta("A");
      var dentro = H.criarHabilidade({ nome: "Dentro" });
      H.inserir(arv2, pastaA, null);
      H.inserir(arv2, dentro, pastaA.id);

      t.igual("a pasta sabe dizer o que tem dentro",
        H.conteudoDaPasta(pastaA).habilidades, 1);

      H.esvaziarPara(arv2, pastaA.id);
      t.igual("esvaziar sobe o conteúdo para o lugar da pasta", arv2.filhos.length, 1);
      t.igual("  e a habilidade sobreviveu", arv2.filhos[0].nome, "Dentro");

      t.grupo("Habilidades — cópia para a ficha");

      var modelo = H.criarHabilidade({ nome: "Da biblioteca", texto: "original" });
      var copia = H.copiarParaFicha(modelo);
      t.ok("a cópia tem id próprio", copia.id !== modelo.id);
      t.igual("a cópia guarda de onde veio", copia.origemHabilidadeId, modelo.id);

      modelo.texto = "editado depois na biblioteca";
      t.igual("editar o modelo NÃO muda a cópia da ficha", copia.texto, "original");

      t.grupo("Habilidades — normalização defensiva");

      var suja2 = H.normalizarArvore({
        filhos: [
          { tipo: "pasta", nome: "  Espaçada  ", filhos: [
            { nome: "Solta", cor: "vermelho", negrito: "sim" },
            { nome: "" },
            null,
          ] },
          "isto não é um nó",
          { nome: "Na raiz" },
        ],
      });
      t.igual("nome de pasta aparado", suja2.filhos[0].nome, "Espaçada");
      t.igual("lixo é descartado", suja2.filhos.length, 2);
      t.igual("habilidade sem nome é descartada", suja2.filhos[0].filhos.length, 1);
      t.igual("cor inválida vira vazio", suja2.filhos[0].filhos[0].cor, "");
      t.igual("negrito vira booleano", suja2.filhos[0].filhos[0].negrito, true);
      t.ok("todo nó ganhou id", H.todasAsHabilidades(suja2).every(function (n) { return !!n.id; }));

      t.grupo("Habilidades — profundidade tem teto");

      var fundo = { filhos: [] };
      var atual = fundo;
      for (var p = 0; p < H.MAX_PROFUNDIDADE + 4; p++) {
        var nova = { tipo: "pasta", nome: "N" + p, filhos: [] };
        atual.filhos.push(nova);
        atual = nova;
      }
      var limitada = H.normalizarArvore(fundo);
      var niveis = 0, cursor = limitada;
      while (cursor.filhos && cursor.filhos.length) { niveis++; cursor = cursor.filhos[0]; }
      t.ok("a normalização para no teto em vez de recursar sem fim",
        niveis <= H.MAX_PROFUNDIDADE + 1);

      /* ---------------------------------------------------------------- */
      t.grupo("Etiqueta colorida — dados próprios, validados");

      var UU = global.RAMAUtil;
      t.igual("texto vazio é sem etiqueta", UU.normalizarEtiqueta({ texto: "   ", cor: "#7E6BB5" }), null);
      t.igual("sem objeto é sem etiqueta", UU.normalizarEtiqueta("ENERGIA"), null);
      t.iguais("texto e cor válidos passam", UU.normalizarEtiqueta({ texto: "Energia", cor: "#7e6bb5" }), { texto: "Energia", cor: "#7E6BB5" });
      t.igual("cor inválida vira a padrão", UU.normalizarEtiqueta({ texto: "x", cor: "red; background:url(x)" }).cor, UU.ETIQUETA_COR_PADRAO);
      t.igual("cor curta vira seis dígitos", UU.normalizarEtiqueta({ texto: "x", cor: "#fa0" }).cor, "#FFAA00");
      t.igual("texto longo é aparado no limite", UU.normalizarEtiqueta({ texto: new Array(80).join("a"), cor: "" }).texto.length, UU.ETIQUETA_LIMITE);
      t.igual("quebra de linha vira espaço", UU.normalizarEtiqueta({ texto: "Morte\nSangue", cor: "" }).texto, "Morte Sangue");
      t.igual("HTML fica como texto, nunca como marcação", UU.normalizarEtiqueta({ texto: "<b>x</b>", cor: "" }).texto, "<b>x</b>");
      t.igual("texto sobre roxo escuro é branco", UU.corDoTextoSobre("#3B2A6B"), "#FFFFFF");
      t.igual("texto sobre amarelo é escuro", UU.corDoTextoSobre("#D8B43A"), "#08080A");

      var habComEtq = H.criarHabilidade({ nome: "Baguncinha Mortal", etiqueta: { texto: "Energia", cor: "#7E6BB5" } });
      t.igual("habilidade guarda a etiqueta", habComEtq.etiqueta.texto, "Energia");
      t.ok("habilidade sem etiqueta não ganha campo novo", !("etiqueta" in H.criarHabilidade({ nome: "Antiga" })));
      t.igual("normalizar a habilidade preserva a etiqueta", H.normalizarHabilidade(JSON.parse(JSON.stringify(habComEtq))).etiqueta.cor, "#7E6BB5");
      t.igual("copiar da biblioteca para a ficha preserva a etiqueta", H.copiarParaFicha(habComEtq).etiqueta.texto, "Energia");

      var itemComEtq = S.criarItem("arma", { nome: "Faca ritual", etiqueta: { texto: "Sangue", cor: "#A33B3B" }, dano: "1d4" });
      t.igual("item guarda a etiqueta", itemComEtq.etiqueta.texto, "Sangue");
      t.ok("item antigo sem etiqueta continua sem o campo", !("etiqueta" in S.normalizarItem({ tipo: "item", nome: "Corda" })));
      var duplicado = S.normalizarItem(itemComEtq);
      duplicado.id = "outro";
      t.ok("duplicar preserva a etiqueta com id independente",
        duplicado.etiqueta.texto === "Sangue" && duplicado.id !== itemComEtq.id && duplicado.etiqueta !== itemComEtq.etiqueta);
      t.igual("a etiqueta não muda a categoria do item", itemComEtq.categoria, "");

      var fichaEtq = S.criarFicha({ nome: "Com etiquetas" });
      fichaEtq.inventario.itens.push(itemComEtq);
      H.inserir(fichaEtq.habilidades, habComEtq, null);
      var pacote = V.exportar("personagem", fichaEtq);
      var reimportada = V.importado(JSON.parse(JSON.stringify(pacote)));
      t.ok("exportar e importar a ficha preserva a etiqueta do item",
        reimportada.ok && reimportada.dados.inventario.itens[0].etiqueta.texto === "Sangue");
      t.ok("  e a da habilidade", H.todasAsHabilidades(reimportada.dados.habilidades)[0].etiqueta.texto === "Energia");
      var hbHab = V.importado(JSON.parse(JSON.stringify(V.exportar("homebrew-habilidade", Object.assign({ tipo: "habilidade" }, habComEtq)))));
      t.ok("habilidade Homebrew exportada e importada mantém a etiqueta", hbHab.ok && hbHab.dados.etiqueta.texto === "Energia");
      var hbItem = V.importado(JSON.parse(JSON.stringify(V.exportar("homebrew-item", itemComEtq))));
      t.ok("item Homebrew exportado e importado mantém a etiqueta", hbItem.ok && hbItem.dados.etiqueta.cor === "#A33B3B");

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem das listas — A–Z, Z–A, personalizada e de adição");

      var UO = global.RAMAUtil;
      var nomesDe = function (lista) { return lista.map(function (x) { return x.nome; }).join(","); };
      var guardada = [
        { id: "c", nome: "Zarabatana", adicionadoEm: "2026-09-12T10:00:00.000Z" },
        { id: "a", nome: "ágata" },
        { id: "d", nome: "Nível 10", adicionadoEm: "2026-09-12T09:00:00.000Z" },
        { id: "b", nome: "Nível 2" },
        { id: "e", nome: "Bússola", adicionadoEm: "2026-09-12T11:00:00.000Z" },
      ];
      var copiaGuardada = JSON.stringify(guardada);

      t.igual("A–Z ignora acento e caixa, e põe Nível 2 antes de Nível 10",
        nomesDe(UO.ordenarLista(guardada, "az")), "ágata,Bússola,Nível 2,Nível 10,Zarabatana");
      t.igual("Z–A é o contrário", nomesDe(UO.ordenarLista(guardada, "za")), "Zarabatana,Nível 10,Nível 2,Bússola,ágata");
      t.igual("personalizada é a ordem guardada", nomesDe(UO.ordenarLista(guardada, "personalizada")), nomesDe(guardada));
      t.igual("de adição: o que não tem data (anterior ao carimbo) vem primeiro, na ordem guardada; depois, do mais antigo ao mais novo",
        nomesDe(UO.ordenarLista(guardada, "adicao")), "ágata,Nível 2,Nível 10,Zarabatana,Bússola");
      t.igual("modo desconhecido vale personalizada", nomesDe(UO.ordenarLista(guardada, "aleatorio")), nomesDe(guardada));
      t.igual("ordenar não reescreve a lista guardada", JSON.stringify(guardada), copiaGuardada);
      t.igual("em A–Z o grupo vem antes do nome (pastas primeiro)",
        nomesDe(UO.ordenarLista([{ nome: "Arma" }, { nome: "Zona", pasta: true }], "az", { grupo: function (x) { return x.pasta ? 0 : 1; } })), "Zona,Arma");
      t.igual("empate no nome desempata pela posição guardada",
        UO.ordenarLista([{ id: 1, nome: "Igual" }, { id: 2, nome: "igual" }], "az").map(function (x) { return x.id; }).join(","), "1,2");

      var guardadaMover = guardada.slice();
      var visiveisMover = [guardada[0], guardada[2], guardada[4]];
      t.ok("subir troca com o vizinho visível", UO.moverEntreVisiveis(guardadaMover, visiveisMover, guardada[2], -1));
      t.igual("  mexendo só nas duas posições", nomesDe(guardadaMover), "Nível 10,ágata,Zarabatana,Nível 2,Bússola");
      t.ok("  e o primeiro não sobe mais", !UO.moverEntreVisiveis(guardadaMover, [guardada[0]], guardada[0], -1));

      t.igual("item preserva a data de adição", S.normalizarItem({ tipo: "item", nome: "Lanterna", adicionadoEm: "2026-09-12T10:00:00.000Z" }).adicionadoEm, "2026-09-12T10:00:00.000Z");
      t.ok("item antigo sem data não ganha data inventada", !("adicionadoEm" in S.normalizarItem({ tipo: "item", nome: "Corda" })));
      t.ok("data inválida é descartada", !("adicionadoEm" in S.normalizarItem({ tipo: "item", nome: "Corda", adicionadoEm: "ontem" })));
      t.igual("habilidade preserva a data de adição", H.normalizarHabilidade({ nome: "X", adicionadoEm: "2026-09-12T10:00:00.000Z" }).adicionadoEm, "2026-09-12T10:00:00.000Z");
      t.ok("pasta nova nasce com data", !!H.criarPasta("Nova").adicionadoEm);
      t.igual("pasta preserva a data ao normalizar",
        H.normalizarArvore({ filhos: [{ tipo: "pasta", nome: "P", filhos: [], adicionadoEm: "2026-09-12T10:00:00.000Z" }] }).filhos[0].adicionadoEm, "2026-09-12T10:00:00.000Z");
      t.igual("ritual preserva a data de adição ao normalizar a ficha",
        S.normalizarFicha({ nome: "R", rituais: { itens: [{ nome: "Decadência", adicionadoEm: "2026-09-12T10:00:00.000Z" }] } }).rituais.itens[0].adicionadoEm, "2026-09-12T10:00:00.000Z");
    }

    /* =================================================================
       RITUAIS
       ================================================================= */

    if (S) {
      t.grupo("Rituais — estrutura");

      var fichaR = S.criarFicha({ nome: "Com rituais" });

      t.igual("a seção nasce chamada Rituais", fichaR.rituais.rotuloSecao, "Rituais");
      t.igual("nasce sem nenhum ritual", fichaR.rituais.itens.length, 0);
      t.iguais("os campos padrão do ritual, na ordem da tela",
        S.CAMPOS_RITUAL, ["circulo", "elemento", "execucao", "alcance", "alvo", "area", "efeito", "duracao", "resistencia", "descricao"]);
      t.igual("  e o campo longo é a descrição", S.CAMPO_LONGO_RITUAL, "descricao");
      t.ok("  Alvo, Área e Efeito são campos diferentes", S.ROTULOS_RITUAL_PADRAO.alvo === "Alvo" &&
        S.ROTULOS_RITUAL_PADRAO.area === "Área" && S.ROTULOS_RITUAL_PADRAO.efeito === "Efeito" &&
        S.ROTULOS_RITUAL_PADRAO.descricao === "Descrição");
      t.igual("rótulo padrão de circulo", fichaR.rituais.rotulos.circulo, "Círculo");

      var rit = S.criarRitual({ nome: "Cicatrização", circulo: "1", efeito: "Cura." });
      t.igual("ritual nasce com nome", rit.nome, "Cicatrização");
      t.igual("  e com os campos", rit.circulo, "1");
      t.ok("  e com id próprio", !!rit.id);

      t.grupo("Rituais — rótulos pertencem à SEÇÃO, não ao ritual");

      fichaR.rituais.itens.push(S.criarRitual({ nome: "A", circulo: "1", alvo: "Você" }));
      fichaR.rituais.itens.push(S.criarRitual({ nome: "B", circulo: "3", alvo: "Área" }));

      fichaR.rituais.rotuloSecao = "Magias";
      fichaR.rituais.rotulos.circulo = "Nível";
      fichaR.rituais.rotulos.alvo = "Destinatário";

      var depois = S.normalizarFicha(fichaR);

      t.igual("a seção passou a se chamar Magias", depois.rituais.rotuloSecao, "Magias");
      t.igual("Círculo virou Nível", depois.rituais.rotulos.circulo, "Nível");
      t.igual("Alvo virou Destinatário", depois.rituais.rotulos.alvo, "Destinatário");
      t.igual("os rótulos não mexidos continuam", depois.rituais.rotulos.duracao, "Duração");

      t.igual("TODOS os rituais usam o rótulo novo — não há rótulo por ritual",
        depois.rituais.itens.every(function (r) { return r.rotulos === undefined; }), true);

      t.igual("os DADOS não se perderam ao renomear o rótulo",
        depois.rituais.itens[0].circulo, "1");
      t.igual("  nem no segundo ritual", depois.rituais.itens[1].circulo, "3");
      t.igual("  nem no campo alvo", depois.rituais.itens[1].alvo, "Área");
      t.iguais("  e a chave interna continua 'circulo'",
        Object.keys(depois.rituais.itens[0]).sort(),
        ["alcance", "alvo", "area", "circulo", "descricao", "duracao", "efeito", "elemento",
         "execucao", "id", "nome", "resistencia", "versoes"]);

      t.grupo("Rituais — rótulo em branco volta ao padrão");

      var semRotulo = S.normalizarRituais({ rotuloSecao: "   ", rotulos: { circulo: "  " }, itens: [] });
      t.igual("seção sem nome volta a Rituais", semRotulo.rotuloSecao, "Rituais");
      t.igual("rótulo vazio volta ao padrão", semRotulo.rotulos.circulo, "Círculo");
    }

    /* =================================================================
       RITUAIS — VERSÕES E DANO
       -----------------------------------------------------------------
       As versões são uma COLEÇÃO com id estável, e não campos fixos
       chamados danoDiscente e danoVerdadeiro. Quase todo caso abaixo
       existe para trancar uma consequência dessa escolha: o nome é
       conteúdo, o id é identidade, e nada se perde ao renomear.
       ================================================================= */

    if (S) {
      t.grupo("Rituais — a versão Normal aparece sozinha");

      var semVersoes = S.criarRitual({ nome: "Sem nada" });
      t.igual("todo ritual nasce com uma versão", semVersoes.versoes.length, 1);
      t.igual("  chamada Normal", semVersoes.versoes[0].nome, "Normal");
      t.igual("  e com dano em branco", semVersoes.versoes[0].dano, "");
      t.ok("  e com id próprio", !!semVersoes.versoes[0].id);

      /* Um ritual gravado antes de as versões existirem — o caso real
         de toda ficha que já está na planilha. */
      var antigo = S.normalizarRituais({
        itens: [{ id: "rit-antigo", nome: "Cicatrização", circulo: "1", efeito: "Cura." }],
      }).itens[0];

      t.igual("ritual antigo abre sem perder nada", antigo.efeito, "Cura.");
      t.igual("  e ganha a versão Normal", antigo.versoes.length, 1);
      t.igual("  em branco", antigo.versoes[0].dano, "");
      t.igual("  sem trocar o id do ritual", antigo.id, "rit-antigo");

      /* Idempotência: normalizar de novo não pode acrescentar uma
         segunda Normal, nem trocar o id da que já existe. */
      var idDaNormal = antigo.versoes[0].id;
      var duasVezes = S.normalizarRituais({ itens: [antigo] }).itens[0];
      var tresVezes = S.normalizarRituais({ itens: [duasVezes] }).itens[0];

      t.igual("normalizar de novo NÃO duplica a Normal", tresVezes.versoes.length, 1);
      t.igual("  e o id da versão sobrevive", tresVezes.versoes[0].id, idDaNormal);

      t.grupo("Rituais — várias versões");

      var comVersoes = S.criarRitual({
        nome: "Crepúsculo",
        versoes: [
          { nome: "Normal", dano: "6d8" },
          { nome: "Discente", dano: "10d8" },
          { nome: "Verdadeiro", dano: "14d8" },
        ],
      });

      t.igual("as três versões entram", comVersoes.versoes.length, 3);
      t.igual("cada uma com o próprio dano", comVersoes.versoes[1].dano, "10d8");
      t.igual("  e o próprio nome", comVersoes.versoes[2].nome, "Verdadeiro");

      var ids = comVersoes.versoes.map(function (v) { return v.id; });
      t.igual("os ids são todos diferentes", new Set(ids).size, 3);

      /* O sistema não obriga ninguém a usar o vocabulário de Ordem
         Paranormal, e nome não é chave. */
      var personalizada = S.criarRitual({
        nome: "Técnica",
        versoes: [
          { nome: "Base", dano: "2d6" },
          { nome: "Sobrecarga", dano: "5d6" },
          { nome: "Sobrecarga", dano: "9d6" },
        ],
      });

      t.igual("versões com nome personalizado são aceitas", personalizada.versoes[1].nome, "Sobrecarga");
      t.igual("  e duas versões podem se chamar igual", personalizada.versoes[2].nome, "Sobrecarga");
      t.igual("  sem uma sobrescrever a outra", personalizada.versoes[2].dano, "9d6");
      t.igual("  porque o id é que identifica",
        new Set(personalizada.versoes.map(function (v) { return v.id; })).size, 3);

      t.grupo("Rituais — renomear preserva id e dano");

      var paraRenomear = S.criarRitual({
        nome: "Ritual",
        versoes: [{ nome: "Discente", dano: "10d8" }],
      });
      var idOriginal = paraRenomear.versoes[0].id;

      /* É o que o editor faz ao salvar: devolve as linhas com os ids
         que já tinha. */
      var renomeado = S.normalizarVersoesRitual([
        { id: idOriginal, nome: "Ampliado", dano: "10d8" },
      ]);

      t.igual("renomear não troca o id", renomeado[0].id, idOriginal);
      t.igual("  e o dano continua junto", renomeado[0].dano, "10d8");
      t.igual("  com o nome novo", renomeado[0].nome, "Ampliado");

      t.grupo("Rituais — remover uma versão");

      var tres = S.criarRitual({
        nome: "Três",
        versoes: [
          { nome: "Normal", dano: "1d6" },
          { nome: "Discente", dano: "2d6" },
          { nome: "Verdadeiro", dano: "3d6" },
        ],
      });

      var idDoMeio = tres.versoes[1].id;
      var semOMeio = S.normalizarVersoesRitual(
        tres.versoes.filter(function (v) { return v.id !== idDoMeio; })
      );

      t.igual("sobram duas", semOMeio.length, 2);
      t.igual("  a primeira intacta", semOMeio[0].dano, "1d6");
      t.igual("  e a terceira também", semOMeio[1].dano, "3d6");
      t.igual("  sem herdar o id da removida",
        semOMeio.filter(function (v) { return v.id === idDoMeio; }).length, 0);

      /* Remover a última devolve a Normal em branco: um ritual sem
         nenhuma versão não teria onde guardar dano. */
      t.igual("remover TODAS devolve uma Normal em branco",
        S.normalizarVersoesRitual([]).length, 1);

      t.grupo("Rituais — dano vazio e expressão inválida");

      var mistura = S.criarRitual({
        nome: "Mistura",
        versoes: [
          { nome: "Sem dano", dano: "" },
          { nome: "Com espaço", dano: " 6 d 8 " },
          { nome: "Torta", dano: "seis dados" },
        ],
      });

      t.igual("dano em branco continua em branco", mistura.versoes[0].dano, "");
      t.ok("  e NÃO vira zero", mistura.versoes[0].dano !== "0" && mistura.versoes[0].dano !== 0);
      t.igual("expressão válida é gravada canônica", mistura.versoes[1].dano, "6d8");
      t.igual("expressão inválida NÃO é apagada", mistura.versoes[2].dano, "seis dados");

      t.igual("só as versões com dano aparecem na ficha",
        S.versoesComDano(mistura).length, 2);
      t.igual("  e a sem dano fica de fora",
        S.versoesComDano(mistura).filter(function (v) { return v.nome === "Sem dano"; }).length, 0);

      /* A conferência do editor é a MESMA do dano de uma arma. */
      if (V) {
        t.ok("o editor aceita dano em branco", V.dadoOpcional("").ok);
        t.ok("o editor aceita 10d8", V.dadoOpcional("10d8").ok);
        t.ok("o editor recusa 'seis dados'", !V.dadoOpcional("seis dados").ok);
        t.ok("  com mensagem que explica",
          /NdX/.test(V.dadoOpcional("seis dados").mensagem || ""));
        t.ok("o editor recusa dados demais", !V.dadoOpcional("999d8").ok);
      }

      t.grupo("Rituais — a rolagem usa a expressão da versão certa");

      var paraRolar = S.criarRitual({
        nome: "Crepúsculo",
        versoes: [
          { nome: "Normal", dano: "2d8" },
          { nome: "Discente", dano: "3d8" },
        ],
      });

      comFila([5, 6], function () {
        var r = D.dano({ dano: paraRolar.versoes[0].dano, nome: paraRolar.nome });
        t.igual("a Normal rola 2d8", r.expressao, "2d8");
        t.igual("  dois dados", r.rolagens.length, 2);
        t.igual("  somados", r.total, 11);
        t.igual("  e o tipo é dano", r.tipo, "dano");
      });

      comFila([1, 2, 3], function () {
        var r = D.dano({ dano: paraRolar.versoes[1].dano, nome: paraRolar.nome });
        t.igual("a Discente rola 3d8", r.expressao, "3d8");
        t.igual("  três dados", r.rolagens.length, 3);
        t.igual("  somados", r.total, 6);
      });

      /* Nada de crítico, multiplicador ou dano extra: o ritual rola o
         que está escrito, e só. */
      comFila([8, 8], function () {
        var r = D.dano({ dano: "2d8", nome: "Crepúsculo" });
        t.igual("sem multiplicação de crítico", r.multiplicador, 1);
        t.igual("  e sem extra somado", r.extra, 0);
        t.igual("  o total é a soma pura", r.total, 16);
      });

      var ruim = D.dano({ dano: "seis dados", nome: "Torta" });
      t.igual("expressão inválida NÃO rola", ruim.ok, false);
      t.igual("  e devolve o que foi escrito, para a mensagem", ruim.expressao, "seis dados");

      t.grupo("Rituais — duplicar não compartilha nada");

      var original = S.criarRitual({
        nome: "Original",
        circulo: "2",
        versoes: [
          { nome: "Normal", dano: "6d8" },
          { nome: "Discente", dano: "10d8" },
        ],
      });

      /* É exatamente o que a tela faz ao duplicar. */
      var copia = S.criarRitual(original);

      t.igual("a cópia leva as duas versões", copia.versoes.length, 2);
      t.igual("  com os mesmos nomes", copia.versoes[1].nome, "Discente");
      t.igual("  e os mesmos danos", copia.versoes[1].dano, "10d8");
      t.ok("o ritual copiado tem id próprio", copia.id !== original.id);
      t.ok("  e cada versão também", copia.versoes[0].id !== original.versoes[0].id);
      t.ok("  a segunda inclusive", copia.versoes[1].id !== original.versoes[1].id);

      t.ok("os objetos não são compartilhados", copia.versoes[0] !== original.versoes[0]);
      copia.versoes[0].dano = "1d4";
      t.igual("mexer na cópia não mexe no original", original.versoes[0].dano, "6d8");

      t.grupo("Rituais — sobrevivem ao salvar e recarregar");

      var fichaComRitual = S.criarFicha({ nome: "Conjuradora" });
      fichaComRitual.rituais.itens.push(S.criarRitual({
        nome: "Crepúsculo",
        circulo: "3",
        versoes: [
          { nome: "Normal", dano: "6d8" },
          { nome: "Verdadeiro", dano: "14d8" },
          { nome: "Ritualística", dano: "" },
        ],
      }));

      var idsAntes = fichaComRitual.rituais.itens[0].versoes.map(function (v) { return v.id; });

      /* Ida e volta pela planilha: o fichaJson é texto. */
      var voltou = S.normalizarFicha(JSON.parse(JSON.stringify(fichaComRitual)));
      var ritualVoltou = voltou.rituais.itens[0];

      t.igual("as três versões voltam", ritualVoltou.versoes.length, 3);
      t.iguais("  com os ids intactos",
        ritualVoltou.versoes.map(function (v) { return v.id; }), idsAntes);
      t.igual("  e os danos intactos", ritualVoltou.versoes[1].dano, "14d8");
      t.igual("  inclusive a versão sem dano", ritualVoltou.versoes[2].dano, "");
      t.igual("  que continua fora da ficha", S.versoesComDano(ritualVoltou).length, 2);

      /* Exportar e importar. O importado NÃO pode ter o ownerId nem o
         id da ficha, mas as versões precisam atravessar inteiras. */
      if (V) {
        var pacote = V.exportar("personagem", fichaComRitual);
        var lido = V.importado(JSON.parse(JSON.stringify(pacote)));

        t.ok("o pacote exportado é aceito de volta", lido.ok, JSON.stringify(lido.problemas || lido));

        if (lido.ok) {
          var ritualImportado = lido.dados.rituais.itens[0];
          t.igual("as versões atravessam a exportação", ritualImportado.versoes.length, 3);
          t.igual("  com os danos", ritualImportado.versoes[0].dano, "6d8");
          t.igual("  e os nomes", ritualImportado.versoes[1].nome, "Verdadeiro");
          t.igual("  sem a validação apagar o campo novo",
            ritualImportado.versoes[2].nome, "Ritualística");
        }
      }

      t.grupo("Rituais — arquivo importado esquisito não derruba nada");

      var esquisito = S.normalizarRituais({
        itens: [{
          nome: "Vindo de fora",
          versoes: [
            { id: "mesmo", nome: "A", dano: "1d6" },
            { id: "mesmo", nome: "B", dano: "2d6" },
            null,
            "texto solto",
            { nome: "", dano: "3d6" },
          ],
        }],
      }).itens[0];

      t.igual("linhas inválidas são descartadas", esquisito.versoes.length, 3);
      t.igual("  id repetido ganha um id novo",
        new Set(esquisito.versoes.map(function (v) { return v.id; })).size, 3);
      t.igual("  sem perder o dano da segunda", esquisito.versoes[1].dano, "2d6");
      t.igual("  e versão sem nome vira Normal", esquisito.versoes[2].nome, "Normal");

      var demais = [];
      for (var iv = 0; iv < 40; iv++) demais.push({ nome: "V" + iv, dano: "1d6" });
      t.igual("o teto de versões é respeitado",
        S.normalizarVersoesRitual(demais).length, S.MAX_VERSOES_RITUAL);
    }

    /* =================================================================
       ORDEM PARANORMAL — TIPO DE FICHA
       -----------------------------------------------------------------
       O tipo é um CAMPO. Nada no sistema o deduz do conteúdo, e ficha
       antiga é universal — que é o modelo que não impõe nada.
       ================================================================= */

    if (S) {
      t.grupo("Ordem — tipo de ficha");

      var universal = S.criarFicha({ nome: "Livre" });
      t.igual("ficha nasce universal por padrão", universal.tipoFicha, "universal");
      t.ok("e não carrega o bloco de Ordem", universal.ordem === undefined);

      var deOrdem = S.criarFicha({ nome: "Agente", tipoFicha: "ordem" });
      t.igual("ficha de Ordem grava o tipo", deOrdem.tipoFicha, "ordem");
      t.ok("e carrega o bloco de Ordem", !!deOrdem.ordem);
      t.igual("que começa em NEX 5%", deOrdem.ordem.nex, 5);

      /* O caso que a instrução destaca: ficha gravada antes desta
         versão, sem o campo. */
      var antiga = S.normalizarFicha({
        nome: "Michael",
        atributos: [{ id: "a1", nome: "Agilidade", sigla: "AGI", valor: 2, dado: "1d20" }],
        status: [{ id: "s1", nome: "PV", atual: 10, maximo: 20 }],
      });
      t.igual("ficha sem o campo é tratada como universal", antiga.tipoFicha, "universal");
      t.igual("  sem perder o nome", antiga.nome, "Michael");
      t.igual("  nem os atributos", antiga.atributos[0].sigla, "AGI");
      t.igual("  nem o que já estava gasto", antiga.status[0].atual, 10);

      /* Nada é deduzido do conteúdo: uma ficha universal com nomes de
         Ordem continua universal. */
      var disfarcada = S.normalizarFicha({
        nome: "Parece de Ordem",
        atributos: ["AGI", "FOR", "INT", "PRE", "VIG"].map(function (sg, i) {
          return { id: "a" + i, nome: sg, sigla: sg, valor: 1, dado: "1d20" };
        }),
      });
      t.igual("atributos com nome de Ordem NÃO tornam a ficha de Ordem",
        disfarcada.tipoFicha, "universal");

      t.igual("tipo desconhecido cai para universal",
        S.tipoDeFicha("sistema-inventado"), "universal");
      t.igual("tipo vazio cai para universal", S.tipoDeFicha(""), "universal");
      t.ok("ehDeOrdem reconhece a de Ordem", S.ehDeOrdem(deOrdem));
      t.ok("  e não a universal", !S.ehDeOrdem(universal));

      /* O bloco sobrevive à ida e volta pela planilha. */
      var voltou = S.normalizarFicha(JSON.parse(JSON.stringify(deOrdem)));
      t.igual("o tipo sobrevive ao salvar e recarregar", voltou.tipoFicha, "ordem");
      t.ok("  e o bloco de Ordem também", !!voltou.ordem);
    }

    /* =================================================================
       ORDEM — CATÁLOGO
       ================================================================= */

    if (global.RAMAOrdemCatalogo) {
      var OC = global.RAMAOrdemCatalogo;

      t.grupo("Ordem — catálogo");

      t.igual("cinco atributos", OC.ATRIBUTOS.length, 5);
      t.igual("28 perícias", OC.PERICIAS.length, 28);
      t.igual("26 origens", OC.ORIGENS.length, 26);
      t.igual("três classes", OC.CLASSES.length, 3);
      /* Quinze do livro básico e nove do Sobrevivendo ao Horror, três
         por classe. A fonte distingue as duas. */
      t.igual("quinze trilhas do livro básico",
        OC.TRILHAS.filter(function (tr) { return tr.fonte !== "SAH"; }).length, 15);
      t.igual("nove trilhas do Sobrevivendo ao Horror",
        OC.TRILHAS.filter(function (tr) { return tr.fonte === "SAH"; }).length, 9);
      t.igual("cinco do livro básico por classe",
        OC.trilhasDaClasse("combatente").filter(function (tr) { return tr.fonte !== "SAH"; }).length, 5);
      t.igual("e três do suplemento por classe",
        OC.trilhasDaClasse("ocultista").filter(function (tr) { return tr.fonte === "SAH"; }).length, 3);
      t.igual("cinco patentes", OC.PATENTES.length, 5);

      /* Atributos-base conferidos contra o livro (OPRPG p.41-49). */
      t.igual("Intuição é Presença, não Intelecto", OC.pericia("intuicao").atributo, "pre");
      t.igual("Adestramento é Presença", OC.pericia("adestramento").atributo, "pre");
      t.igual("Luta é Força", OC.pericia("luta").atributo, "for");
      t.igual("Fortitude é Vigor", OC.pericia("fortitude").atributo, "vig");
      t.igual("Ocultismo é Intelecto", OC.pericia("ocultismo").atributo, "int");
      t.ok("Ocultismo é só treinada", OC.pericia("ocultismo").treinada);
      t.ok("Acrobacia tem penalidade de carga", OC.pericia("acrobacia").carga);
      t.ok("Percepção não tem", !OC.pericia("percepcao").carga);

      t.iguais("bônus por grau", OC.GRAUS.map(function (g) { return g.bonus; }), [0, 5, 10, 15]);
      t.igual("veterano exige NEX 35%", OC.grau("veterano").nexMinimo, 35);
      t.igual("expert exige NEX 70%", OC.grau("expert").nexMinimo, 70);

      /* Origens conferidas contra a Tabela 1.1 (OPRPG p.19). */
      t.iguais("Investigador treina Investigação e Percepção",
        OC.origem("investigador").pericias, ["investigacao", "percepcao"]);
      t.iguais("Militar treina Pontaria e Tática",
        OC.origem("militar").pericias, ["pontaria", "tatica"]);
      t.igual("Desgarrado tem Calejado", OC.origem("desgarrado").poder, "Calejado");
      t.igual("Vítima tem Cicatrizes Psicológicas", OC.origem("vitima").poder, "Cicatrizes Psicológicas");

      t.igual("toda origem tem duas perícias ou diz que são à escolha",
        OC.ORIGENS.filter(function (o) {
          return o.pericias.length === 2 || o.periciasAEscolher === 2;
        }).length, 26);

      t.ok("toda origem tem página do livro",
        OC.ORIGENS.every(function (o) { return o.pagina > 0; }));
      t.ok("toda trilha tem quatro poderes",
        OC.TRILHAS.every(function (tr) { return tr.poderes.length === 4; }));
      t.ok("nos NEX 10, 40, 65 e 99",
        OC.TRILHAS.every(function (tr) {
          return JSON.stringify(tr.poderes.map(function (p) { return p.nex; })) === "[10,40,65,99]";
        }));

      t.igual("custo do 1º círculo", OC.CUSTO_RITUAL[1], 1);
      t.igual("custo do 4º círculo", OC.CUSTO_RITUAL[4], 10);
      t.igual("referência mostra livro e página",
        OC.referencia(OC.origem("investigador")), "Ordem Paranormal RPG, p. 19");
    }

    /* =================================================================
       ORDEM — CÁLCULO
       -----------------------------------------------------------------
       O exemplo do livro: Bianca, a especialista de Luísa.
       Agilidade 2, Força 0, Intelecto 3, Presença 3, Vigor 1,
       origem Investigador, NEX 5%. OPRPG p.15, p.22, p.29.
       ================================================================= */

    if (global.RAMAOrdemRegras && global.RAMAOrdemCatalogo) {
      var R = global.RAMAOrdemRegras;

      function bianca(extra) {
        var f = R.fichaVazia();
        f.classe = "especialista";
        f.origem = "investigador";
        f.atributos = { agi: 2, for: 0, int: 3, pre: 3, vig: 1 };
        f.nex = 5;
        return Object.assign(f, extra || {});
      }

      t.grupo("Ordem — a especialista do exemplo do livro");

      var b = bianca();

      t.igual("PV = 16 + Vigor 1", R.pontosDeVida(b).total, 17);
      t.igual("PE = 3 + Presença 3", R.pontosDeEsforco(b).total, 6);
      t.igual("Sanidade da especialista", R.sanidade(b).total, 16);
      t.igual("Defesa = 10 + Agilidade 2", R.defesa(b).total, 12);
      t.igual("deslocamento padrão", R.deslocamento(b).total, 9);
      t.igual("limite de PE por turno em NEX 5%", R.limiteDeEsforco(b).total, 1);

      /* Força 0 carrega 2 espaços, não 0 — OPRPG p.53. */
      t.igual("Força 0 carrega 2 espaços", R.capacidade(b, { itens: [] }).limite, 2);
      t.igual("Força 2 carrega 10", R.capacidade(bianca({ atributos: { agi: 2, for: 2, int: 3, pre: 3, vig: 1 } }), { itens: [] }).limite, 10);
      t.igual("  e o teto é o dobro", R.capacidade(bianca({ atributos: { agi: 2, for: 2, int: 3, pre: 3, vig: 1 } }), { itens: [] }).maximo, 20);

      /* A composição é aberta: dá para conferir de onde veio cada
         número em vez de ter de confiar. */
      var composicaoDefesa = R.defesa(b).parcelas;
      t.igual("a Defesa mostra a composição", composicaoDefesa.length, 2);
      t.igual("  começando pela base", composicaoDefesa[0].valor, 10);
      t.igual("  e somando o atributo", composicaoDefesa[1].rotulo, "Agilidade");

      t.grupo("Ordem — progressão de NEX");

      /* Especialista: 16+Vig inicial, depois 3+Vig por degrau. */
      t.igual("especialista NEX 10% com Vigor 1", R.pontosDeVida(bianca({ nex: 10 })).total, 17 + 4);
      t.igual("  NEX 15%", R.pontosDeVida(bianca({ nex: 15 })).total, 17 + 8);
      t.igual("PE sobe 3 + Presença por degrau", R.pontosDeEsforco(bianca({ nex: 10 })).total, 6 + 6);
      t.igual("Sanidade sobe 4 por degrau", R.sanidade(bianca({ nex: 10 })).total, 16 + 4);
      t.igual("limite de PE acompanha o NEX", R.limiteDeEsforco(bianca({ nex: 50 })).total, 10);
      t.igual("  e chega a 20 em NEX 99%", R.limiteDeEsforco(bianca({ nex: 99 })).total, 20);

      /* Combatente e ocultista, conferidos contra os blocos do livro. */
      function comClasse(chave, atrib, nex) {
        var f = R.fichaVazia();
        f.classe = chave;
        f.atributos = atrib;
        f.nex = nex || 5;
        return f;
      }
      var atribPadrao = { agi: 1, for: 1, int: 1, pre: 1, vig: 1 };

      t.igual("combatente NEX 5%, Vigor 1: PV 21",
        R.pontosDeVida(comClasse("combatente", atribPadrao)).total, 21);
      t.igual("  PE 3", R.pontosDeEsforco(comClasse("combatente", atribPadrao)).total, 3);
      t.igual("  Sanidade 12", R.sanidade(comClasse("combatente", atribPadrao)).total, 12);
      t.igual("ocultista NEX 5%, Vigor 1: PV 13",
        R.pontosDeVida(comClasse("ocultista", atribPadrao)).total, 13);
      t.igual("  PE 5", R.pontosDeEsforco(comClasse("ocultista", atribPadrao)).total, 5);
      t.igual("  Sanidade 20", R.sanidade(comClasse("ocultista", atribPadrao)).total, 20);

      t.grupo("Ordem — poderes de origem que entram na conta");

      /* Calejado: +1 PV para cada 5% de NEX (OPRPG p.18). */
      var desgarrado = comClasse("combatente", atribPadrao, 20);
      desgarrado.origem = "desgarrado";
      var semCalejado = comClasse("combatente", atribPadrao, 20);
      t.igual("Calejado dá +1 PV por degrau",
        R.pontosDeVida(desgarrado).total - R.pontosDeVida(semCalejado).total, 4);

      /* Cicatrizes Psicológicas: +1 Sanidade por 5% de NEX. */
      var vitima = comClasse("ocultista", atribPadrao, 20);
      vitima.origem = "vitima";
      t.igual("Cicatrizes Psicológicas dá +1 Sanidade por degrau",
        R.sanidade(vitima).total - R.sanidade(comClasse("ocultista", atribPadrao, 20)).total, 4);

      /* Patrulha: +2 em Defesa. */
      var policial = comClasse("combatente", atribPadrao);
      policial.origem = "policial";
      t.igual("Patrulha dá +2 em Defesa", R.defesa(policial).total, 13);
      t.ok("  e aparece na composição com o nome do poder",
        R.defesa(policial).parcelas.some(function (p) { return p.rotulo === "Patrulha"; }));

      /* Traços do Outro Lado: metade da Sanidade da classe. */
      var cultista = comClasse("ocultista", atribPadrao);
      cultista.origem = "cultistaarrependido";
      t.igual("Cultista Arrependido começa com metade da Sanidade",
        R.sanidade(cultista).total, 10);

      /* Dedicação: +1 PE e mais 1 a cada NEX ímpar. */
      var universitario = comClasse("especialista", atribPadrao);
      universitario.origem = "universitario";
      t.igual("Dedicação dá +1 PE em NEX 5%",
        R.pontosDeEsforco(universitario).total - R.pontosDeEsforco(comClasse("especialista", atribPadrao)).total, 1);
      t.igual("  e aumenta o limite de PE por turno",
        R.limiteDeEsforco(universitario).total, 2);

      t.grupo("Ordem — recálculo não acumula nem restaura");

      /* O defeito clássico: recalcular e o bônus entrar de novo. */
      var estavel = bianca();
      estavel.origem = "policial";
      var uma = R.defesa(estavel).total;
      var outra = R.defesa(estavel).total;
      var maisUma = R.defesa(estavel).total;
      t.igual("recalcular três vezes dá o mesmo valor", uma + "/" + outra + "/" + maisUma, "14/14/14");

      /* Recurso gasto não volta ao recalcular. */
      var ferido = bianca();
      ferido.recursos.pv = 5;
      t.igual("PV atual é o que sobrou", R.calcular(ferido, { itens: [] }).atual.pv, 5);
      ferido.nex = 20;
      t.igual("subir de NEX não cura", R.calcular(ferido, { itens: [] }).atual.pv, 5);
      t.igual("  mas o máximo sobe", R.pontosDeVida(ferido).total, 17 + 12);

      /* Máximo que cai apara o atual, sem repor. */
      var aparado = bianca({ nex: 20 });
      aparado.recursos.pv = 29;
      aparado.nex = 5;
      var maximos = { pv: R.pontosDeVida(aparado).total, pe: R.pontosDeEsforco(aparado).total, san: R.sanidade(aparado).total };
      R.aparar(aparado, maximos);
      t.igual("máximo que cai apara o atual", aparado.recursos.pv, 17);

      /* null é "cheio", zero é "gastou tudo". */
      var intocado = bianca();
      t.igual("recurso nunca tocado vale o máximo", R.calcular(intocado, { itens: [] }).atual.pv, 17);
      var zerado = bianca();
      zerado.recursos.pv = 0;
      t.igual("zero continua zero", R.calcular(zerado, { itens: [] }).atual.pv, 0);

      t.grupo("Ordem — ajuste manual sobrevive ao recálculo");

      var comAjuste = bianca();
      comAjuste.ajustes.push(R.criarAjuste("defesa", 3, "Colete da mesa"));
      t.igual("o ajuste entra na conta", R.defesa(comAjuste).total, 15);
      t.igual("  e continua depois de recalcular", R.defesa(comAjuste).total, 15);
      t.ok("  aparecendo com o motivo",
        R.defesa(comAjuste).parcelas.some(function (p) { return p.rotulo === "Colete da mesa"; }));
      t.ok("  e marcado como ajuste da mesa",
        R.defesa(comAjuste).parcelas.some(function (p) { return p.origem === "ajuste da mesa"; }));

      var ajustePv = bianca();
      ajustePv.ajustes.push(R.criarAjuste("pv", 5, "Bênção da campanha"));
      t.igual("ajuste de PV soma no máximo", R.pontosDeVida(ajustePv).total, 22);

      t.grupo("Ordem — sobrecarga");

      var pesado = bianca();
      var inventarioPesado = { itens: [{ espacos: 3 }] };
      t.ok("passar do limite sobrecarrega", R.capacidade(pesado, inventarioPesado).sobrecarregado);
      t.igual("sobrecarregado perde 5 de Defesa", R.defesa(pesado, inventarioPesado).total, 12 - 5);
      t.igual("  e 3m de deslocamento", R.deslocamento(pesado, inventarioPesado).total, 6);
      t.igual("perícia com carga sofre a penalidade",
        R.bonusDePericia(pesado, "acrobacia", inventarioPesado).total, -5);
      t.igual("  e perícia sem carga não",
        R.bonusDePericia(pesado, "percepcao", inventarioPesado).total, 0);

      t.grupo("Ordem — perícias");

      var treinada = bianca();
      treinada.pericias = { investigacao: "treinado", ciencias: "veterano", luta: "expert" };
      t.igual("treinado dá +5", R.bonusDePericia(treinada, "investigacao", { itens: [] }).total, 5);
      t.igual("veterano dá +10", R.bonusDePericia(treinada, "ciencias", { itens: [] }).total, 10);
      t.igual("expert dá +15", R.bonusDePericia(treinada, "luta", { itens: [] }).total, 15);
      t.igual("destreinada dá 0", R.bonusDePericia(treinada, "pilotagem", { itens: [] }).total, 0);

      /* Os dados vêm do atributo-base, e atributo 0 rola 2d20 pegando o
         pior — que é o -2d20 do motor de dados. */
      t.igual("Investigação usa Intelecto 3", R.dadoDePericia(treinada, "investigacao"), "3d20");
      t.igual("Atletismo com Força 0 rola -2d20", R.dadoDePericia(treinada, "atletismo"), "-2d20");
      t.igual("Percepção usa Presença 3", R.dadoDePericia(treinada, "percepcao"), "3d20");

      if (global.RAMAOrdemBiblioteca) {
        t.grupo("Ordem — biblioteca oficial de habilidades");

        var OB = global.RAMAOrdemBiblioteca;
        var OPod = global.RAMAOrdemPoderes;
        var soma = function (secs) { return secs.reduce(function (n, s) { return n + s.entradas.length; }, 0); };
        var chavesDe = function (secs) {
          var k = {};
          secs.forEach(function (s) { s.entradas.forEach(function (x) { k[x.entrada.chave] = true; }); });
          return k;
        };

        t.igual("cinco abas: três classes, gerais e paranormais", OB.ABAS.map(function (a) { return a.chave; }).join(","),
          "combatente,especialista,ocultista,gerais,paranormais");

        var todasAsChaves = {};
        OB.ABAS.forEach(function (a) { Object.assign(todasAsChaves, chavesDe(OB.secoes(a.chave))); });
        var fora = OPod.PODERES_CLASSE.concat(OPod.PODERES_GERAIS, OPod.PODERES_PARANORMAIS, OPod.HABILIDADES_TRILHA, OPod.AUTOMATICAS)
          .filter(function (p) { return !todasAsChaves[p.chave]; }).map(function (p) { return p.nome; });
        t.igual("todo poder e habilidade do catálogo aparece em alguma aba", fora.join(", "), "");

        var combatente = OB.secoes("combatente");
        t.igual("combatente abre com as habilidades de classe", combatente[0].titulo, "Habilidades de classe");
        t.ok("  e tem Ataque Especial", chavesDe([combatente[0]]).ataqueEspecial);
        t.ok("combatente só traz poderes e trilhas do combatente", combatente.every(function (s) {
          return s.entradas.every(function (x) {
            var p = x.entrada;
            return p.tipo === "trilha"
              ? global.RAMAOrdemCatalogo.trilha(p.trilha).classe === "combatente"
              : p.classes.indexOf("combatente") >= 0;
          });
        }));
        t.igual("cada trilha do combatente vira uma seção",
          combatente.filter(function (s) { return s.chave.indexOf("trilha.") === 0; }).length,
          global.RAMAOrdemCatalogo.trilhasDaClasse("combatente").length);
        t.igual("paranormais separados por elemento", soma(OB.secoes("paranormais")), OPod.PODERES_PARANORMAIS.length);
        var gerais = chavesDe(OB.secoes("gerais"));
        t.ok("gerais incluem os poderes de classe que o SAH tornou gerais",
          OPod.PODERES_CLASSE.filter(function (p) { return p.geral; }).every(function (p) { return gerais[p.chave]; }));
        t.igual("  e todos os poderes gerais", OPod.PODERES_GERAIS.filter(function (p) { return !gerais[p.chave]; }).length, 0);
        t.igual("aba desconhecida não tem nada", OB.secoes("sobrevivente").length, 0);

        t.ok("busca ignora acento e caixa", soma(OB.filtrar(OB.secoes("combatente"), "ATAQUE especial")) >= 1);
        t.igual("busca sem resultado esvazia", OB.filtrar(OB.secoes("combatente"), "zzzz").length, 0);
        t.igual("a aba inicial é a da classe da ficha", OB.abaInicial("ocultista"), "ocultista");
        t.igual("  e sem classe abre em Combatente", OB.abaInicial(""), "combatente");

        var atletico = OB.modelo(OPod.poder("atletico"), "");
        t.igual("a cópia leva o nome", atletico.nome, "Atlético");
        t.igual("  a origem", atletico.origem, "Poder geral");
        t.ok("  os pré-requisitos por extenso", atletico.texto.indexOf("Pré-requisitos: Força 2") >= 0);
        t.ok("  e a página do livro", atletico.texto.indexOf("Sobrevivendo ao Horror, p. 33") >= 0);
        t.ok("a origem cabe no campo de 60 caracteres",
          OB.ABAS.every(function (a) { return OB.secoes(a.chave).every(function (s) { return s.entradas.every(function (x) { return OB.origem(x.entrada, x.classe).length <= 60; }); }); }));
        var ataque = OB.modelo(OPod.poder("ataqueEspecial"), "combatente");
        t.ok("habilidade de classe leva os estágios por NEX", ataque.texto.indexOf("NEX 55%: 4 PE: +15") >= 0);
        var copia = global.RAMAHabilidades.copiarParaFicha(ataque);
        t.ok("a cópia vira habilidade de texto comum na árvore", copia && copia.tipo === global.RAMAHabilidades.TIPO_HABILIDADE && !copia.origemHabilidadeId);
      }

      t.grupo("Ordem — patente");

      function comPP(pp, origem) {
        var f = bianca();
        f.prestigio = pp;
        if (origem) f.origem = origem;
        return f;
      }
      t.igual("0 PP é recruta", R.patente(comPP(0)).patente.chave, "recruta");
      t.igual("20 PP é operador", R.patente(comPP(20)).patente.chave, "operador");
      t.igual("49 PP ainda é operador", R.patente(comPP(49)).patente.chave, "operador");
      t.igual("50 PP é agente especial", R.patente(comPP(50)).patente.chave, "especial");
      t.igual("200 PP é agente de elite", R.patente(comPP(200)).patente.chave, "elite");
      t.igual("perder PP rebaixa", R.patente(comPP(19)).patente.chave, "recruta");
      t.igual("recruta leva 2 itens de categoria I", R.patente(comPP(0)).itens.I, 2);
      t.igual("Patrocinador da Ordem sobe o crédito",
        R.patente(comPP(0, "magnata")).credito, "Médio");
      t.ok("  e a ficha mostra que foi elevado", R.patente(comPP(0, "magnata")).creditoElevado);

      t.grupo("Ordem — rituais");

      var ocultista5 = comClasse("ocultista", { agi: 1, for: 1, int: 3, pre: 1, vig: 1 }, 5);
      t.igual("ocultista NEX 5% lança 1º círculo", R.rituais(ocultista5).circuloMaximo, 1);
      t.igual("  2º círculo em NEX 25%",
        R.rituais(comClasse("ocultista", atribPadrao, 25)).circuloMaximo, 2);
      t.igual("  3º círculo em NEX 55%",
        R.rituais(comClasse("ocultista", atribPadrao, 55)).circuloMaximo, 3);
      t.igual("  4º círculo em NEX 85%",
        R.rituais(comClasse("ocultista", atribPadrao, 85)).circuloMaximo, 4);
      t.igual("  e NEX 80% ainda é 3º círculo",
        R.rituais(comClasse("ocultista", atribPadrao, 80)).circuloMaximo, 3);
      t.igual("  NEX 50% ainda é 2º círculo",
        R.rituais(comClasse("ocultista", atribPadrao, 50)).circuloMaximo, 2);
      t.igual("o limite de rituais aprendidos é o Intelecto",
        R.rituais(ocultista5).limitePorIntelecto, 3);
      t.igual("combatente não conjura por classe",
        R.rituais(comClasse("combatente", atribPadrao, 99)).circuloMaximo, 0);
    }

    /* =================================================================
       ORDEM — NÍVEL E NEX SEPARADOS
       -----------------------------------------------------------------
       A regra opcional de SAH p.98. Não é troca de rótulo: o trilho de
       progressão inteiro muda de campo.
       ================================================================= */

    if (global.RAMAOrdemRegras && global.RAMAOrdemOpcionais) {
      var R2 = global.RAMAOrdemRegras;
      var OP = global.RAMAOrdemOpcionais;

      t.grupo("Ordem — regras opcionais");

      t.igual("onze regras opcionais", OP.REGRAS.length, 11);
      t.ok("todas com fonte e página",
        OP.REGRAS.every(function (r) { return r.fonte && r.pagina > 0; }));
      t.ok("todas com resumo e efeito",
        OP.REGRAS.every(function (r) { return r.resumo && r.efeito; }));

      var fichaLimpa = R2.fichaVazia();
      t.igual("nenhuma começa ligada", OP.ligadas(fichaLimpa).length, 0);
      t.ok("as que não mexem na ficha estão marcadas",
        OP.regra("combateNarrativo").afetaFicha === false);
      t.ok("  e as que mexem também", OP.regra("nexExperiencia").afetaFicha === true);
      t.iguais("as que trocam o trilho de progressão (mostradas na revisão da criação)",
        OP.deProgressao().map(function (r) { return r.chave; }), ["nexExperiencia", "evolucaoPatentes"]);
      t.ok("  todas mexem na ficha", OP.deProgressao().every(function (r) { return r.afetaFicha; }));

      /* A revisão da criação liga a regra sobre o rascunho: as pendências
         passam a seguir o nível, e o que vale é o degrau, não o rótulo. */
      var rascunho = R2.fichaVazia();
      rascunho.classe = "combatente";
      rascunho.origem = "academico";
      rascunho.atributos = { agi: 2, for: 2, int: 2, pre: 2, vig: 1 };
      rascunho.nex = 25;
      var idsDe = function (o, prefixo) {
        return global.RAMAOrdemProgressao.estado(o, null).pendencias
          .map(function (p) { return p.id; })
          .filter(function (id) { return id.indexOf(prefixo) === 0; });
      };
      var daClassePorNex = idsDe(rascunho, "d");
      t.iguais("sem a regra, NEX 25% pede trilha, poder e atributo", daClassePorNex, ["d2.trilha", "d3.poderClasse", "d4.atributo"]);
      t.iguais("  e nada por exposição", idsDe(rascunho, "x"), []);
      OP.definir(rascunho, "nexExperiencia", true);
      t.igual("ligar no rascunho põe o nível no equivalente ao NEX (25% → 5)", rascunho.nivel, 5);
      t.iguais("  as etapas de classe são as mesmas, porque o degrau é o mesmo", idsDe(rascunho, "d"), daClassePorNex);
      t.ok("  mas surgem pendências por exposição — por isso a revisão pergunta antes",
        idsDe(rascunho, "x").length > 0);
      rascunho.nivel = 1;
      t.iguais("  baixar o nível tira as etapas de classe que ele não alcança", idsDe(rascunho, "d"), []);

      t.grupo("Ordem — separar nível e NEX");

      var comum = R2.fichaVazia();
      comum.classe = "combatente";
      comum.atributos = { agi: 1, for: 1, int: 1, pre: 1, vig: 1 };
      comum.nex = 50;

      t.igual("sem a regra, o trilho é o NEX", R2.trilho(comum).passos, 10);
      t.igual("  e o rótulo diz NEX", R2.trilho(comum).rotulo, "NEX 50%");
      var pvPorNex = R2.pontosDeVida(comum).total;

      var r = OP.definir(comum, "nexExperiencia", true);
      t.ok("a regra liga", r.ok);
      t.ok("  avisando que o nível partiu do equivalente", !!r.aviso);
      t.igual("  nível 10 para NEX 50%", comum.nivel, 10);
      t.igual("o NEX gravado NÃO é convertido nem zerado", comum.nex, 50);

      t.igual("com a regra, o trilho é o nível", R2.trilho(comum).passos, 10);
      t.igual("  e o rótulo diz Nível", R2.trilho(comum).rotulo, "Nível 10");
      t.igual("os PV não mudam quando o nível equivale ao NEX",
        R2.pontosDeVida(comum).total, pvPorNex);

      /* Agora os dois andam separados: é o ponto da regra. */
      comum.nivel = 4;
      comum.nex = 80;
      t.igual("o nível manda nos PV", R2.trilho(comum).passos, 4);
      t.igual("  PV de combatente nível 4", R2.pontosDeVida(comum).total, 21 + 15);
      t.igual("o NEX continua sendo o NEX", R2.exposicao(comum), 80);
      t.ok("  e o sistema sabe que estão separados", R2.separaNivelENex(comum));

      /* O exemplo do próprio livro: Proteção Pesada exige NEX 30%, que
         com a regra vira nível 6. */
      comum.nivel = 6;
      t.igual("nível 6 equivale a NEX 30% para pré-requisitos",
        R2.trilho(comum).nexEquivalente, 30);
      comum.nivel = 5;
      t.ok("  e nível 5 ainda não alcança", R2.trilho(comum).nexEquivalente < 30);

      /* Calejado: "+1 PV para cada 5% de NEX" vira "+1 PV por nível". */
      var calejado = R2.fichaVazia();
      calejado.classe = "combatente";
      calejado.origem = "desgarrado";
      calejado.atributos = { agi: 1, for: 1, int: 1, pre: 1, vig: 1 };
      calejado.opcionais = { nexExperiencia: true };
      calejado.nivel = 6;
      calejado.nex = 10;
      var semOrigem = R2.fichaVazia();
      semOrigem.classe = "combatente";
      semOrigem.atributos = { agi: 1, for: 1, int: 1, pre: 1, vig: 1 };
      semOrigem.opcionais = { nexExperiencia: true };
      semOrigem.nivel = 6;
      semOrigem.nex = 10;
      t.igual("Calejado passa a contar por NÍVEL, não por NEX",
        R2.pontosDeVida(calejado).total - R2.pontosDeVida(semOrigem).total, 6);

      /* O limite de PE por turno também segue o nível. */
      t.igual("limite de PE segue o nível", R2.limiteDeEsforco(calejado).total, 6);

      t.grupo("Ordem — ligar e desligar não reconfigura");

      var ida = R2.fichaVazia();
      ida.classe = "especialista";
      ida.atributos = { agi: 2, for: 0, int: 3, pre: 3, vig: 1 };
      ida.nex = 25;
      ida.pericias = { investigacao: "treinado" };
      ida.recursos.pv = 7;
      var pvAntes = R2.pontosDeVida(ida).total;

      OP.definir(ida, "nexExperiencia", true);
      OP.definir(ida, "nexExperiencia", false);

      t.igual("desligar volta ao valor de antes", R2.pontosDeVida(ida).total, pvAntes);
      t.igual("  o NEX está intacto", ida.nex, 25);
      t.igual("  as perícias estão intactas", ida.pericias.investigacao, "treinado");
      t.igual("  e o que estava gasto continua gasto", ida.recursos.pv, 7);

      t.grupo("Ordem — regras incompatíveis");

      var conflito = R2.fichaVazia();
      OP.definir(conflito, "nexExperiencia", true);
      var recusa = OP.definir(conflito, "evolucaoPatentes", true);
      t.ok("Evolução por Patentes não liga junto com NEX & Experiência", !recusa.ok);
      t.igual("  e diz o motivo", recusa.erro, "conflito");
      t.ok("  citando a outra regra", recusa.problemas[0].texto.indexOf("NEX & Experiência") >= 0);
      t.ok("a primeira continua ligada", OP.ligada(conflito, "nexExperiencia"));
      t.ok("  e a segunda não entrou", !OP.ligada(conflito, "evolucaoPatentes"));

      /* Um arquivo adulterado com as duas ligadas abre num estado
         possível, em vez de num estado que as regras proíbem. */
      var salvo = OP.normalizar({ nexExperiencia: true, evolucaoPatentes: true, inventada: true });
      t.ok("a normalização desfaz a combinação impossível",
        !(salvo.nexExperiencia && salvo.evolucaoPatentes));
      t.ok("  e ignora chave inventada", salvo.inventada === undefined);

      t.grupo("Ordem — consequências antes de mexer");

      var consequencias = OP.consequenciasDe(R2.fichaVazia(), "nexExperiencia", true);
      t.ok("ligar avisa o que muda", consequencias.length >= 3);
      t.ok("  inclusive que o NEX deixa de controlar a progressão",
        consequencias.join(" ").indexOf("deixa de controlar") >= 0);

      var semEfeito = OP.consequenciasDe(R2.fichaVazia(), "combateNarrativo", true);
      t.ok("regra sem efeito na ficha diz isso com todas as letras",
        semEfeito.join(" ").indexOf("não muda nenhum campo") >= 0);
    }

    /* =================================================================
       ORDEM — PERSISTÊNCIA
       ================================================================= */

    if (S && global.RAMAOrdemRegras) {
      t.grupo("Ordem — sobrevive ao salvar, exportar e importar");

      var completa = S.criarFicha({ nome: "Bianca", tipoFicha: "ordem" });
      completa.ordem.classe = "especialista";
      completa.ordem.origem = "investigador";
      completa.ordem.trilha = "medico";
      completa.ordem.atributos = { agi: 2, for: 0, int: 3, pre: 3, vig: 1 };
      completa.ordem.pericias = { investigacao: "treinado", percepcao: "treinado" };
      completa.ordem.nex = 25;
      completa.ordem.prestigio = 60;
      completa.ordem.recursos.pv = 9;
      completa.ordem.ajustes.push(global.RAMAOrdemRegras.criarAjuste("defesa", 2, "Item da mesa"));
      completa.ordem.opcionais = { ferimentosDebilitantes: true };

      var lida = S.normalizarFicha(JSON.parse(JSON.stringify(completa)));

      t.igual("a classe volta", lida.ordem.classe, "especialista");
      t.igual("a origem volta", lida.ordem.origem, "investigador");
      t.igual("a trilha volta", lida.ordem.trilha, "medico");
      t.igual("os atributos voltam", lida.ordem.atributos.int, 3);
      t.igual("  inclusive o zero", lida.ordem.atributos["for"], 0);
      t.igual("as perícias voltam", lida.ordem.pericias.investigacao, "treinado");
      t.igual("o NEX volta", lida.ordem.nex, 25);
      t.igual("o prestígio volta", lida.ordem.prestigio, 60);
      t.igual("o que estava gasto continua gasto", lida.ordem.recursos.pv, 9);
      t.igual("o ajuste manual volta", lida.ordem.ajustes.length, 1);
      t.igual("  com o motivo", lida.ordem.ajustes[0].motivo, "Item da mesa");
      t.ok("a regra opcional volta ligada", lida.ordem.opcionais.ferimentosDebilitantes);

      /* Trilha de outra classe é vínculo quebrado, e some. */
      var trocada = S.normalizarFicha(Object.assign({}, JSON.parse(JSON.stringify(completa)), {
        ordem: Object.assign({}, completa.ordem, { classe: "combatente" }),
      }));
      t.igual("trilha de outra classe não sobrevive à troca de classe", trocada.ordem.trilha, "");
      t.igual("  mas as perícias sobrevivem", trocada.ordem.pericias.investigacao, "treinado");

      if (V) {
        var pacote = V.exportar("personagem", completa);
        var importada = V.importado(JSON.parse(JSON.stringify(pacote)));
        t.ok("o pacote exportado é aceito de volta", importada.ok,
          JSON.stringify(importada.problemas || importada));
        if (importada.ok) {
          t.igual("o tipo atravessa a exportação", importada.dados.tipoFicha, "ordem");
          t.igual("  e a classe também", importada.dados.ordem.classe, "especialista");
          t.igual("  e o NEX", importada.dados.ordem.nex, 25);
          t.igual("  e o ajuste manual", importada.dados.ordem.ajustes.length, 1);
        }
      }
    }

    /* =================================================================
       ORDEM — PROGRESSÃO, ESCOLHAS E EFEITOS
       -----------------------------------------------------------------
       O motor que transforma pendência em escolha e escolha em número.
       Os exemplos numéricos vêm dos próprios livros sempre que o livro
       dá um.
       ================================================================= */

    if (global.RAMAOrdemProgressao && global.RAMAOrdemPoderes && global.RAMAOrdemRegras) {
      var EP = global.RAMAOrdemProgressao;
      var PO = global.RAMAOrdemPoderes;
      var RR = global.RAMAOrdemRegras;
      var CC = global.RAMAOrdemCatalogo;
      var IO = global.RAMAOrdemInventario;

      function agente(extra) {
        var f = RR.fichaVazia();
        f.classe = "combatente";
        f.origem = "militar";
        f.trilha = "tropadechoque";
        f.nex = 99;
        f.atributos = { agi: 2, for: 3, int: 1, pre: 1, vig: 2 };
        f.pericias = { luta: "treinado", fortitude: "treinado", pontaria: "treinado", tatica: "treinado", iniciativa: "treinado", percepcao: "treinado" };
        return Object.assign(f, extra || {});
      }

      function vagaDe(ordem, id) {
        return EP.vagas(ordem).filter(function (v) { return v.id === id; })[0];
      }

      function escolher(ordem, id, valor, opcoes) {
        return EP.registrar(ordem, vagaDe(ordem, id), { valor: valor, opcoes: opcoes || {} });
      }

      function avaliar(ordem, id, valor, opcoes, contexto) {
        return EP.simular(ordem, vagaDe(ordem, id), { valor: valor, opcoes: opcoes || {} }, contexto || null).avaliacao;
      }

      function idsPendentes(ordem, contexto) {
        return EP.estado(ordem, contexto || null).pendencias.map(function (p) { return p.id; });
      }

      function nomesAdquiridos(ordem, contexto) {
        return EP.estado(ordem, contexto || null).adquiridos.filter(function (a) { return a.valido && a.completo !== false; })
          .map(function (a) { return a.nome; });
      }

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem — catálogo de poderes");

      var chaves = {};
      var duplicada = "";
      PO.TODOS.forEach(function (p) { if (chaves[p.chave]) duplicada = p.chave; chaves[p.chave] = true; });
      t.igual("nenhuma chave de poder se repete", duplicada, "");
      t.ok("todo poder tem fonte e página", PO.TODOS.every(function (p) { return (p.fonte === "OPRPG" || p.fonte === "SAH") && p.pagina > 0; }));
      t.ok("todo poder tem resumo", PO.TODOS.every(function (p) { return p.resumo.length > 10; }));
      t.ok("toda automação é calculo, parcial ou informacao",
        PO.TODOS.every(function (p) { return ["calculo", "parcial", "informacao"].indexOf(p.automacao) >= 0; }));
      t.igual("22 poderes paranormais do livro básico",
        PO.PODERES_PARANORMAIS.filter(function (p) { return p.fonte === "OPRPG"; }).length, 22);
      t.igual("8 poderes paranormais do Sobrevivendo ao Horror (Tabela 1.6)",
        PO.PODERES_PARANORMAIS.filter(function (p) { return p.fonte === "SAH"; }).length, 8);
      t.igual("34 poderes gerais do Sobrevivendo ao Horror (Tabela 2.3)", PO.PODERES_GERAIS.length, 34);
      t.igual("quatro habilidades por trilha, nas 24 trilhas", PO.HABILIDADES_TRILHA.length, 96);
      t.ok("os nomes das habilidades batem com os das trilhas do catálogo",
        CC.TRILHAS.every(function (tr) {
          var h = PO.habilidadesDaTrilha(tr.chave).map(function (x) { return x.nome; });
          return JSON.stringify(h) === JSON.stringify(tr.poderes.map(function (x) { return x.nome; }));
        }));
      t.ok("todo requisito de poder aponta para algo que existe",
        PO.TODOS.every(function (p) {
          return p.requisitos.every(function (r) {
            if (r.tipo === "poder" || r.tipo === "poderElemento") return !!PO.poder(r.poder);
            if (r.tipo === "treinado") return !!CC.pericia(r.pericia);
            if (r.tipo === "atributo") return CC.ATRIBUTOS.some(function (a) { return a.chave === r.atributo; });
            return true;
          });
        }));
      t.ok("Transcender é poder das três classes", PO.poder("transcender").classes.length === 3);
      t.ok("Artista Marcial também vale como poder geral (SAH p.33)", !!PO.poder("artistaMarcial").geral);

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem — pendências viram vagas com id estável");

      var lia = agente();
      var pendentes = idsPendentes(lia);
      t.ok("poder de classe em NEX 15% é a vaga d3.poderClasse", pendentes.indexOf("d3.poderClasse") >= 0);
      t.ok("  e o de NEX 30% é outra vaga, d6.poderClasse", pendentes.indexOf("d6.poderClasse") >= 0);
      t.ok("NEX 50% abre atributo e versatilidade separados",
        pendentes.indexOf("d10.atributo") >= 0 && pendentes.indexOf("d10.versatilidade") >= 0);
      t.ok("habilidade de trilha NÃO é pendência: chega sozinha",
        pendentes.filter(function (id) { return /poderTrilha/.test(id); }).length === 0);
      t.iguais("os quatro poderes da Tropa de Choque chegaram sozinhos em NEX 99%",
        nomesAdquiridos(lia), ["Casca Grossa", "Cai Dentro", "Duro de Matar", "Inquebrável"]);
      t.ok("a afinidade é pendência em NEX 99%", pendentes.indexOf("afinidade") >= 0);

      var especialista5 = RR.fichaVazia();
      especialista5.classe = "especialista";
      especialista5.nex = 5;
      t.iguais("especialista em NEX 5% só tem Perito a decidir", idsPendentes(especialista5), ["d1.perito"]);

      var semTrilha = agente({ trilha: "", nex: 10 });
      t.iguais("sem trilha em NEX 10%, a trilha é pendência", idsPendentes(semTrilha), ["d2.trilha"]);

      /* ---------------------------------------------------------------- */
      if (global.RAMAOrdemPersonalizacao) {
        t.grupo("Ordem — versões personalizadas de habilidades oficiais");

        var PZ = global.RAMAOrdemPersonalizacao;
        var daChave = function (ordem, chave) {
          return EP.estado(ordem, null).adquiridos.filter(function (a) { return a.chave === chave; });
        };

        var tropa = agente();
        var casca = daChave(tropa, "cascaGrossa")[0];
        t.igual("habilidade de trilha tem id estável: etapa e chave, não nome", casca.id, "t.cascaGrossa|cascaGrossa");
        t.igual("automática de classe tem id próprio", EP.automaticas(tropa)[0].id, "auto|ataqueEspecial");
        escolher(tropa, "d3.poderClasse", "reflexosDefensivos");
        var aqReflexos = daChave(tropa, "reflexosDefensivos")[0];
        t.igual("poder escolhido tem o id da etapa em que entrou", aqReflexos.id, "d3.poderClasse|reflexosDefensivos");

        tropa.temporarios.defesa = 3;
        var catalogoAntes = JSON.stringify(PO.poder("reflexosDefensivos"));
        var pvAntes = RR.pontosDeVida(tropa).total;
        var defAntes = RR.defesa(tropa).total;
        var escolhasAntes = JSON.stringify(tropa.escolhas);
        var pendAntes = JSON.stringify(idsPendentes(tropa));

        var gravada = PZ.salvar(tropa, aqReflexos.id, "reflexosDefensivos", {
          nome: "Reflexos de Gato", texto: "Texto da mesa: +10 em tudo.", etiqueta: { texto: "Agilidade", cor: "#3B6EA3" },
        });
        t.ok("personalizar um poder escolhido cria a versão", !!gravada && gravada.efeitos === "herdados");
        t.igual("mudança só visual mantém a Defesa (e o texto não vira regra)", RR.defesa(tropa).total, defAntes);
        t.igual("  mantém os PV", RR.pontosDeVida(tropa).total, pvAntes);
        t.igual("  não mexe nas escolhas de progressão", JSON.stringify(tropa.escolhas), escolhasAntes);
        t.igual("  não reabre nem consome pendência", JSON.stringify(idsPendentes(tropa)), pendAntes);
        t.igual("  não altera o catálogo", JSON.stringify(PO.poder("reflexosDefensivos")), catalogoAntes);
        t.igual("  e a aquisição continua uma só", daChave(tropa, "reflexosDefensivos").length, 1);

        var gravadaAuto = PZ.salvar(tropa, "auto|ataqueEspecial", "ataqueEspecial", { nome: "Golpe de Quebrada", texto: "Mesma regra, outro nome." });
        t.ok("personalizar uma habilidade automática de classe também funciona", !!gravadaAuto && tropa.personalizacoes.length === 2);

        var outraFicha = agente();
        escolher(outraFicha, "d3.poderClasse", "reflexosDefensivos");
        t.igual("outra ficha com o mesmo poder não recebe a personalização", outraFicha.personalizacoes.length, 0);

        var recarregada = RR.normalizar(JSON.parse(JSON.stringify(tropa)));
        t.igual("recarregar mantém uma personalização por aquisição", recarregada.personalizacoes.length, 2);
        t.igual("  com o nome personalizado", PZ.daAquisicao(recarregada, aqReflexos.id).nome, "Reflexos de Gato");
        t.igual("  e a etiqueta", PZ.daAquisicao(recarregada, aqReflexos.id).etiqueta.texto, "Agilidade");
        t.igual("recalcular a ficha recarregada não duplica a aquisição", daChave(recarregada, "reflexosDefensivos").length, 1);
        t.igual("  nem as personalizações (normalizar duas vezes)", RR.normalizar(recarregada).personalizacoes.length, 2);

        PZ.salvar(tropa, aqReflexos.id, "reflexosDefensivos", { nome: "Reflexos Felinos", texto: "x", etiqueta: null });
        t.igual("editar de novo atualiza a mesma personalização", tropa.personalizacoes.length, 2);
        t.ok("  e tirar a etiqueta apaga o campo", !("etiqueta" in PZ.daAquisicao(tropa, aqReflexos.id)));

        PZ.salvar(tropa, aqReflexos.id, "reflexosDefensivos", { nome: "Reflexos Felinos", texto: "x", efeitos: "desativados" });
        t.igual("desativar os efeitos tira só os +2 de Defesa desta aquisição", RR.defesa(tropa).total, defAntes - 2);
        t.ok("  e o ajuste temporário de Defesa continua na conta",
          RR.defesa(tropa).parcelas.some(function (p) { return p.valor === 3; }));
        t.igual("  os PV (Casca Grossa) não mudam", RR.pontosDeVida(tropa).total, pvAntes);
        t.ok("  o poder continua adquirido e válido", daChave(tropa, "reflexosDefensivos")[0].valido);
        t.igual("  e nenhuma pendência reabre", JSON.stringify(idsPendentes(tropa)), pendAntes);

        PZ.salvar(tropa, casca.id, "cascaGrossa", { nome: "Casca Grossa", efeitos: "desativados" });
        t.igual("desativar Casca Grossa tira 1 PV por degrau de NEX (20 em NEX 99%)", pvAntes - RR.pontosDeVida(tropa).total, 20);

        PZ.restaurar(tropa, aqReflexos.id);
        t.igual("restaurar a versão oficial devolve os +2 de Defesa", RR.defesa(tropa).total, defAntes);
        t.ok("  e apaga só aquela personalização", !PZ.daAquisicao(tropa, aqReflexos.id) && !!PZ.daAquisicao(tropa, casca.id));

        var trocada = agente();
        escolher(trocada, "d3.poderClasse", "reflexosDefensivos");
        PZ.salvar(trocada, "d3.poderClasse|reflexosDefensivos", "reflexosDefensivos", { nome: "Minha versão", efeitos: "desativados" });
        var defTrocada = RR.defesa(trocada).total;
        escolher(trocada, "d3.poderClasse", "golpePesado");
        var idsTrocada = EP.estado(trocada, null).adquiridos.map(function (a) { return a.id; });
        t.igual("trocar a escolha deixa a personalização sem aquisição", PZ.semAquisicao(trocada, idsTrocada).length, 1);
        t.igual("  preservada para recuperação", trocada.personalizacoes[0].nome, "Minha versão");
        t.ok("  sem desligar nada do poder novo", !daChave(trocada, "golpePesado")[0].efeitosDesativados);
        t.igual("  e sem conceder Defesa", RR.defesa(trocada).total, defTrocada);
        escolher(trocada, "d3.poderClasse", "reflexosDefensivos");
        t.igual("refazer a mesma escolha religa a personalização",
          PZ.semAquisicao(trocada, EP.estado(trocada, null).adquiridos.map(function (a) { return a.id; })).length, 0);

        t.igual("personalização sem nome é descartada", PZ.normalizar([{ aquisicao: "auto|x", nome: "" }]).length, 0);
        t.igual("aquisição com caracteres fora do padrão é recusada", PZ.normalizar([{ aquisicao: "<script>", nome: "a" }]).length, 0);
        t.igual("duas para a mesma aquisição: vale a mais recente",
          PZ.normalizar([
            { aquisicao: "auto|x", nome: "velha", atualizadoEm: "2026-01-01T00:00:00.000Z" },
            { aquisicao: "auto|x", nome: "nova", atualizadoEm: "2026-02-01T00:00:00.000Z" },
          ]).map(function (x) { return x.nome; }).join(","), "nova");
        t.igual("efeitos desconhecidos viram herdados", PZ.normalizar([{ aquisicao: "auto|x", nome: "a", efeitos: "tudo" }])[0].efeitos, "herdados");
        t.igual("ficha antiga sem o campo abre com a lista vazia", RR.normalizar({ classe: "combatente" }).personalizacoes.length, 0);

        t.grupo("Ordem — excluir habilidades oficiais");

        var exc = agente();
        var pvExc = RR.pontosDeVida(exc).total;
        var cascaExc = daChave(exc, "cascaGrossa")[0];
        PZ.excluir(exc, cascaExc.id, "cascaGrossa", "Casca Grossa");
        t.igual("excluir uma habilidade automática de trilha tira os PV dela (20 em NEX 99%)", pvExc - RR.pontosDeVida(exc).total, 20);
        t.ok("  e fica registrada como excluída, sem apagar nada", !!PZ.excluida(exc, cascaExc.id));
        t.igual("  sem reabrir pendência", JSON.stringify(idsPendentes(exc)), JSON.stringify(idsPendentes(agente())));
        t.igual("excluir de novo não duplica o registro", (PZ.excluir(exc, cascaExc.id, "cascaGrossa", "Casca Grossa"), exc.excluidas.length), 1);
        PZ.salvar(exc, cascaExc.id, "cascaGrossa", { nome: "Pele de Pedra" });
        t.igual("personalizar uma excluída não traz os efeitos de volta", pvExc - RR.pontosDeVida(exc).total, 20);
        PZ.reincluir(exc, cascaExc.id);
        t.igual("restaurar a excluída devolve os PV", RR.pontosDeVida(exc).total, pvExc);
        t.igual("  e a versão personalizada continua lá", PZ.daAquisicao(exc, cascaExc.id).nome, "Pele de Pedra");
        t.igual("a exclusão sobrevive a recarregar",
          (PZ.excluir(exc, cascaExc.id, "cascaGrossa", "Casca Grossa"), RR.normalizar(JSON.parse(JSON.stringify(exc))).excluidas.length), 1);

        var enganada = agente();
        escolher(enganada, "d3.poderClasse", "reflexosDefensivos");
        var defEnganada = RR.defesa(enganada).total;
        var aqEnganada = daChave(enganada, "reflexosDefensivos")[0];
        PZ.salvar(enganada, aqEnganada.id, "reflexosDefensivos", { nome: "Escolhi errado" });
        EP.remover(enganada, aqEnganada.registroId);
        PZ.esquecerAquisicoes(enganada, [aqEnganada.id]);
        t.ok("excluir um poder escolhido desfaz a escolha: a etapa volta a ficar pendente", idsPendentes(enganada).indexOf("d3.poderClasse") >= 0);
        t.igual("  os +2 de Defesa saem", RR.defesa(enganada).total, defEnganada - 2);
        t.igual("  e a personalização dela é apagada junto, sem virar órfã", enganada.personalizacoes.length, 0);

        t.igual("exclusão com aquisição fora do padrão é descartada", PZ.normalizarExcluidas([{ aquisicao: "a b", nome: "x" }]).length, 0);
        t.igual("exclusão repetida para a mesma aquisição vira uma só",
          PZ.normalizarExcluidas([{ aquisicao: "auto|x" }, { aquisicao: "auto|x" }]).length, 1);
        t.igual("ficha antiga sem exclusões abre com a lista vazia", RR.normalizar({ classe: "combatente" }).excluidas.length, 0);

        t.grupo("Ordem — organização das listas guardada na ficha");

        var semOrg = RR.normalizar({ classe: "combatente" }).organizacao;
        t.igual("ficha antiga abre com as três abas na ordem personalizada",
          [semOrg.habilidades.modo, semOrg.rituais.modo, semOrg.inventario.modo].join(","), "personalizada,personalizada,personalizada");
        var comOrg = RR.normalizar({ organizacao: {
          habilidades: { modo: "az", regras: ["auto|ataqueEspecial", "auto|ataqueEspecial", "<lixo>", "t.cascaGrossa|cascaGrossa"] },
          rituais: { modo: "adicao" }, inventario: { modo: "za" },
        } }).organizacao;
        t.igual("os modos escolhidos sobrevivem a recarregar",
          [comOrg.habilidades.modo, comOrg.rituais.modo, comOrg.inventario.modo].join(","), "az,adicao,za");
        t.igual("a ordem das habilidades das regras descarta repetida e id fora do padrão",
          comOrg.habilidades.regras.join(","), "auto|ataqueEspecial,t.cascaGrossa|cascaGrossa");
        t.igual("modo inválido vira personalizada", RR.normalizar({ organizacao: { rituais: { modo: "caos" } } }).organizacao.rituais.modo, "personalizada");
        var orgOrdem = agente();
        var pvOrg = RR.pontosDeVida(orgOrdem).total;
        orgOrdem.organizacao.habilidades.modo = "za";
        orgOrdem.organizacao.habilidades.regras = ["t.caiDentro|caiDentro"];
        t.igual("a organização não muda nenhuma conta", RR.pontosDeVida(orgOrdem).total, pvOrg);
        t.igual("  nem as pendências", JSON.stringify(idsPendentes(orgOrdem)), JSON.stringify(idsPendentes(agente())));
      }

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem — Bloqueio, Esquiva e bônus extras");

      var somaParcelas = function (conta) { return conta.parcelas.reduce(function (s, x) { return s + x.valor; }, 0); };
      var vig = RR.fichaVazia();
      vig.atributos = { agi: 3, for: 1, int: 1, pre: 1, vig: 1 };
      vig.pericias = { fortitude: "treinado", reflexos: "veterano" };
      var invVig = { limite: 0, itens: [global.RAMAFicha.criarItem("armadura", { nome: "Proteção Leve", defesa: 5, ordem: { espacos: 0, categoria: 1, emUso: true } })] };

      t.igual("Defesa calculada do exemplo: 18", RR.defesa(vig, invVig).total, 18);
      t.igual("Bloqueio sem extras = Fortitude (+5)", RR.bloqueio(vig, invVig).total, 5);
      t.igual("Esquiva sem extras = Defesa 18 + Reflexos 10 = 28", RR.esquiva(vig, invVig).total, 28);

      RR.definirBonusExtra(vig, "defesa", 2);
      RR.definirBonusExtra(vig, "bloqueio", 3);
      RR.definirBonusExtra(vig, "esquiva", 1);
      var cVig = RR.calcular(vig, invVig);
      t.igual("com os extras do exemplo: Defesa 20", cVig.defesa.total, 20);
      t.igual("  Bloqueio 8", cVig.bloqueio.total, 8);
      t.igual("  Esquiva 31", cVig.esquiva.total, 31);
      t.ok("a composição das três fecha com o total",
        somaParcelas(cVig.defesa) === 20 && somaParcelas(cVig.bloqueio) === 8 && somaParcelas(cVig.esquiva) === 31);
      t.ok("  e mostra cada bônus extra como parcela própria",
        cVig.defesa.parcelas.some(function (x) { return x.rotulo === "Bônus extra de Defesa" && x.valor === 2; }) &&
        cVig.bloqueio.parcelas.some(function (x) { return x.rotulo === "Bônus extra de Bloqueio" && x.valor === 3; }) &&
        cVig.esquiva.parcelas.some(function (x) { return x.rotulo === "Bônus extra de Esquiva" && x.valor === 1; }));
      t.ok("a Esquiva usa a Defesa final como UMA parcela, sem repetir as da Defesa",
        cVig.esquiva.parcelas.filter(function (x) { return x.rotulo === "Defesa final" && x.valor === 20; }).length === 1 &&
        !cVig.esquiva.parcelas.some(function (x) { return x.rotulo === "Base" || x.rotulo === "Bônus extra de Defesa"; }));

      RR.definirBonusExtra(vig, "defesa", -3);
      t.igual("extra negativo de Defesa: 15 na Defesa", RR.defesa(vig, invVig).total, 15);
      t.igual("  e a Esquiva cai os mesmos 5 pontos, uma vez só (26)", RR.esquiva(vig, invVig).total, 26);
      RR.definirBonusExtra(vig, "defesa", 0);
      t.ok("extra zero não vira parcela", !RR.defesa(vig, invVig).parcelas.some(function (x) { return /Bônus extra/.test(x.rotulo); }));
      t.igual("extra acima do limite é aparado em +99", (RR.definirBonusExtra(vig, "bloqueio", 500), vig.bonusExtra.bloqueio), 99);
      RR.definirBonusExtra(vig, "bloqueio", 3);
      t.ok("estatística fora das três é recusada", !RR.definirBonusExtra(vig, "deslocamento", 5));

      RR.definirAjusteDePericia(vig, "fortitude", { extra: 2 });
      t.igual("extra de Fortitude entra no bônus da perícia (+7)", RR.bonusDePericia(vig, "fortitude", invVig).total, 7);
      t.igual("  e no Bloqueio uma vez só (7 + 3 = 10)", RR.bloqueio(vig, invVig).total, 10);
      t.igual("  sem mudar o grau", RR.grauDaPericia(vig, "fortitude"), "treinado");
      RR.definirAjusteDePericia(vig, "reflexos", { extra: 1 });
      t.igual("extra de Reflexos reflete na Esquiva (18 + 11 + 1 = 30)", RR.esquiva(vig, invVig).total, 30);
      t.ok("  a composição mostra de onde veio (Reflexos · Bônus extra)",
        RR.esquiva(vig, invVig).parcelas.some(function (x) { return x.rotulo === "Reflexos · Bônus extra" && x.valor === 1; }));

      var recarregadoVig = RR.normalizar(JSON.parse(JSON.stringify(vig)));
      t.ok("recalcular e recarregar não duplicam nada",
        RR.calcular(recarregadoVig, invVig).esquiva.total === 30 && RR.calcular(recarregadoVig, invVig).esquiva.total === 30 &&
        RR.bloqueio(recarregadoVig, invVig).total === 10);
      t.igual("  os extras continuam guardados à parte", JSON.stringify(recarregadoVig.periciasAjustes), JSON.stringify({ fortitude: { extra: 2 }, reflexos: { extra: 1 } }));
      t.igual("  e o grau-base da ficha não mudou", JSON.stringify(recarregadoVig.pericias), JSON.stringify({ fortitude: "treinado", reflexos: "veterano" }));

      var reflexosDef = agente();
      escolher(reflexosDef, "d3.poderClasse", "reflexosDefensivos");
      var semPoderEsq = RR.esquiva(agente(), null).total;
      t.igual("Reflexos Defensivos: +2 na Defesa entram na Esquiva; o +2 em testes de resistência NÃO (condicional)",
        RR.esquiva(reflexosDef, null).total, semPoderEsq + 2);

      var lutador = RR.fichaVazia();
      lutador.atributos = { agi: 3, for: 1, int: 1, pre: 1, vig: 1 };
      lutador.pericias = { luta: "treinado" };
      t.igual("Luta usa Força por padrão (1d20)", RR.dadoDePericia(lutador, "luta"), "1d20");
      RR.definirAjusteDePericia(lutador, "luta", { atributo: "agi" });
      t.igual("trocar para Agilidade muda os dados da rolagem (3d20)", RR.dadoDePericia(lutador, "luta"), "3d20");
      t.igual("  o atributo padrão continua Força", RR.atributoPadraoDaPericia(lutador, "luta"), "for");
      t.ok("  e o grau e o bônus não mudam", RR.grauDaPericia(lutador, "luta") === "treinado" && RR.bonusDePericia(lutador, "luta").total === 5);
      var rolagemAgi = comFila([4, 17, 9], function () {
        return D.dependente({ expressao: RR.dadoDePericia(lutador, "luta"), bonus: RR.bonusDePericia(lutador, "luta").total });
      });
      t.igual("  a rolagem de fato usa 3 dados de Agilidade (maior 17 + 5)", rolagemAgi.total, 22);
      RR.definirAjusteDePericia(lutador, "luta", { atributo: "" });
      t.ok("restaurar o atributo padrão volta a Força e limpa a personalização",
        RR.dadoDePericia(lutador, "luta") === "1d20" && !lutador.periciasAjustes.luta);

      var sujo = RR.normalizar({ periciasAjustes: {
        inventada: { extra: 3 }, luta: { atributo: "sorte", extra: "abc" }, crime: { extra: 0 }, furtividade: { atributo: "agi", extra: 150 },
      }, bonusExtra: { defesa: "x", bloqueio: -500 } });
      t.igual("normalização descarta perícia e atributo inexistentes e extra zero", JSON.stringify(sujo.periciasAjustes), JSON.stringify({ furtividade: { atributo: "agi", extra: 99 } }));
      t.igual("  e apara os extras das estatísticas", JSON.stringify(sujo.bonusExtra), JSON.stringify({ defesa: 0, bloqueio: -99, esquiva: 0 }));
      var antiga = RR.normalizar({ classe: "combatente" });
      t.ok("ficha antiga abre com extras zerados e atributos padrão",
        JSON.stringify(antiga.bonusExtra) === JSON.stringify({ defesa: 0, bloqueio: 0, esquiva: 0 }) && JSON.stringify(antiga.periciasAjustes) === "{}");

      var fichaExport = global.RAMAFicha.criarFicha({ nome: "Exportável", tipoFicha: "ordem" });
      RR.definirBonusExtra(fichaExport.ordem, "esquiva", 4);
      RR.definirAjusteDePericia(fichaExport.ordem, "reflexos", { atributo: "int", extra: -2 });
      var ida = V.importado(JSON.parse(JSON.stringify(V.exportar("personagem", fichaExport))));
      t.ok("exportar e importar preservam os extras e o atributo trocado",
        ida.ok && ida.dados.ordem.bonusExtra.esquiva === 4 &&
        ida.dados.ordem.periciasAjustes.reflexos.atributo === "int" && ida.dados.ordem.periciasAjustes.reflexos.extra === -2);

      /* ---------------------------------------------------------------- */
      if (global.RAMAPainelMesa) {
        t.grupo("Painel da mesa — cartões calculados pela ficha");

        var PMs = global.RAMAPainelMesa;
        var mari = agente({ classe: "ocultista", trilha: "", nex: 60, atributos: { agi: 3, for: 1, int: 5, pre: 4, vig: 0 } });
        mari.recursos = { pv: 0, pe: 5, san: 47 };
        var protecaoMari = global.RAMAFicha.criarItem("armadura", { nome: "Proteção Leve", defesa: 5, ordem: { espacos: 2, categoria: 1, emUso: true } });
        var invMari = { limite: 0, itens: [protecaoMari] };
        var calcMari = RR.calcular(mari, invMari);
        var listadoMari = { id: "m1", nome: "Mari", tipoFicha: "ordem", souDono: false, detalhado: true, dono: "Bolo", rev: 3,
          ordem: JSON.parse(JSON.stringify(mari)), inventario: JSON.parse(JSON.stringify(invMari)) };
        var cartaoMari = PMs.resumir(listadoMari);

        t.igual("PV do cartão = PV da ficha (atual e máximo)", cartaoMari.recursos[0].atual + "/" + cartaoMari.recursos[0].maximo, calcMari.atual.pv + "/" + calcMari.pv.total);
        t.igual("PE do cartão = PE da ficha", cartaoMari.recursos[1].atual + "/" + cartaoMari.recursos[1].maximo, calcMari.atual.pe + "/" + calcMari.pe.total);
        t.igual("Sanidade do cartão = Sanidade da ficha", cartaoMari.recursos[2].atual + "/" + cartaoMari.recursos[2].maximo, calcMari.atual.san + "/" + calcMari.san.total);
        t.igual("PV zerado continua 0, não o máximo", cartaoMari.recursos[0].atual, 0);
        t.igual("Defesa do cartão = Defesa da ficha, com a proteção em uso", cartaoMari.estatisticas[0].valor, String(calcMari.defesa.total));
        t.igual("PE por turno = limite da ficha", cartaoMari.estatisticas[3].valor, String(calcMari.limitePe.total));
        t.igual("deslocamento = o da ficha", cartaoMari.estatisticas[4].valor, calcMari.deslocamento.total + " m");
        t.igual("estatísticas do cartão: Defesa, Bloqueio, Esquiva, PE por turno e deslocamento",
          cartaoMari.estatisticas.map(function (s) { return s.chave; }).join(","), "defesa,bloqueio,esquiva,limitePe,deslocamento");
        t.igual("  Bloqueio do cartão = Bloqueio da ficha", cartaoMari.estatisticas[1].valor, String(calcMari.bloqueio.total));
        t.igual("  Esquiva do cartão = Esquiva da ficha", cartaoMari.estatisticas[2].valor, String(calcMari.esquiva.total));
        t.igual("atributos efetivos, na ordem do catálogo", cartaoMari.atributos.map(function (a) { return a.sigla + a.valor; }).join(" "),
          CC.ATRIBUTOS.map(function (a) { return a.sigla + RR.atributo(mari, a.chave); }).join(" "));
        t.igual("classe e progressão na identificação", cartaoMari.linhas[0] + " | " + cartaoMari.progressao, "Ocultista | NEX 60%");
        t.igual("o recurso de Ordem é ajustado por recurso/pv, só o atual",
          [cartaoMari.recursos[0].alvo, cartaoMari.recursos[0].itemId, cartaoMari.recursos[0].campo].join("/"), "recurso/pv/atual");
        t.ok("  com os limites da ficha: −99 até o máximo", cartaoMari.recursos[0].minimo === -99 && cartaoMari.recursos[0].teto === calcMari.pv.total);

        var semSan = JSON.parse(JSON.stringify(listadoMari));
        semSan.ordem.opcionais = { semSanidade: true };
        t.igual("com “Jogando sem Sanidade”, a Sanidade não aparece", PMs.resumir(semSan).recursos.map(function (r) { return r.rotulo; }).join(","), "PV,PE");

        var nivelado = JSON.parse(JSON.stringify(listadoMari));
        nivelado.ordem.opcionais = { nexExperiencia: true };
        nivelado.ordem.nivel = 4;
        t.igual("com NEX & Experiência, mostra nível e NEX", PMs.resumir(nivelado).progressao, "Nível 4 · NEX 60%");

        var alheio = { id: "m2", nome: "Mari", tipoFicha: "ordem", detalhado: false, ordem: { classe: "ocultista", trilha: "", nex: 60, nivel: null, opcionais: {} } };
        var cartaoAlheio = PMs.resumir(alheio);
        t.ok("ficha alheia sem dados de cálculo: nenhum recurso ou estatística inventado",
          !cartaoAlheio.recursos.length && !cartaoAlheio.estatisticas.length && !cartaoAlheio.atributos.length);
        t.igual("  mas com a identificação", cartaoAlheio.linhas[0] + " | " + cartaoAlheio.progressao, "Ocultista | NEX 60%");

        var universal = PMs.resumir({ id: "u1", nome: "Livre", tipoFicha: "universal", classe: "Bardo",
          status: [{ id: "s1", nome: "Fôlego", atual: 3, maximo: 0 }, { id: "s2", nome: "Mana", atual: 12, maximo: 10 }],
          atributos: [{ id: "a1", nome: "Carisma", sigla: "CAR", valor: 4 }] });
        t.igual("universal mantém os nomes da própria ficha", universal.recursos.map(function (r) { return r.rotulo; }).join(","), "Fôlego,Mana");
        t.ok("  sem Sanidade, NEX nem estatística de Ordem", !universal.estatisticas.length && !universal.progressao);
        t.igual("  com os limites da ficha universal (sem teto quando o máximo é 0)", universal.recursos[0].teto, 999999);
        t.igual("  e o atributo configurado", universal.atributos[0].sigla + universal.atributos[0].valor, "CAR4");

        t.igual("barra: zerado fica vazia", PMs.preenchimento(0, 69), 0);
        t.igual("barra: negativo fica vazia", PMs.preenchimento(-5, 69), 0);
        t.igual("barra: acima do máximo não passa de 100%", PMs.preenchimento(12, 10), 100);
        t.igual("barra: máximo 0 com valor enche", PMs.preenchimento(3, 0), 100);
        t.igual("barra: proporcional", PMs.preenchimento(31, 62), 50);

        var limitesPv = cartaoMari.recursos[0];
        t.ok("entrada vazia é recusada, não vira 0", !PMs.validarEntrada("", limitesPv).ok && !PMs.validarEntrada("   ", limitesPv).ok);
        t.ok("texto e decimal são recusados", !PMs.validarEntrada("abc", limitesPv).ok && !PMs.validarEntrada("2,5", limitesPv).ok);
        t.ok("fora dos limites é recusado com o motivo", /máximo/.test(PMs.validarEntrada("999", limitesPv).mensagem) && /mínimo/.test(PMs.validarEntrada("-100", limitesPv).mensagem));
        t.igual("número válido passa", PMs.validarEntrada(" 12 ", limitesPv).valor, 12);
        t.igual("sinal de menos tipográfico é aceito", PMs.validarEntrada("−3", limitesPv).valor, -3);

        t.ok("conflito: reenviar se o recurso não mudou no servidor", PMs.podeReenviar(listadoMari, cartaoMari.recursos[1], 5));
        var mudou = JSON.parse(JSON.stringify(listadoMari));
        mudou.ordem.recursos.pe = 2;
        t.ok("  não reenviar se o jogador mexeu naquele recurso", !PMs.podeReenviar(mudou, cartaoMari.recursos[1], 5));
        t.ok("  nunca-tocado (null) continua igual a null", PMs.podeReenviar({ tipoFicha: "ordem", ordem: { recursos: { pv: null } } }, cartaoMari.recursos[0], null));
        t.ok("  personagem sem o status não reenvia", !PMs.podeReenviar({ status: [] }, universal.recursos[0], 3));

        t.grupo("Painel da mesa — jogadores, ocultação e o resumo guardado");

        var resumoMari = RR.resumoDeRecursos(mari);
        t.igual("o resumo da mesa sai do mesmo cálculo da ficha", resumoMari.pv + "/" + resumoMari.pe + "/" + resumoMari.san,
          calcMari.pv.total + "/" + calcMari.pe.total + "/" + calcMari.san.total);
        t.igual("  e com “Jogando sem Sanidade” a Sanidade é nula", RR.resumoDeRecursos(Object.assign({}, mari, { opcionais: { semSanidade: true } })).san, null);

        var alheioComResumo = PMs.resumir({ id: "m3", nome: "Mari", tipoFicha: "ordem", detalhado: false,
          podeEditarRecursos: false, podeAbrirFicha: false, recursosVisiveis: true,
          ordem: { classe: "ocultista", trilha: "", nex: 60, nivel: null, opcionais: {} },
          recursos: [{ chave: "pv", atual: 3, maximo: 20 }, { chave: "san", atual: 16, maximo: 16 }, { chave: "hackeado", atual: 1, maximo: 1 }] });
        t.igual("ficha alheia: os recursos resumidos que o servidor mandou, sem inventar outros",
          alheioComResumo.recursos.map(function (r) { return r.rotulo + " " + r.atual + "/" + r.maximo; }).join(", "), "PV 3/20, SAN 16/16");
        t.ok("  sem permissão de editar nem de abrir a ficha", alheioComResumo.podeEditar === false && alheioComResumo.podeAbrirFicha === false);
        t.ok("  e sem estatísticas nem atributos calculados", !alheioComResumo.estatisticas.length && !alheioComResumo.atributos.length);

        var oculto = PMs.resumir({ id: "m4", nome: "Mari", tipoFicha: "ordem", detalhado: false, recursosVisiveis: false,
          ordem: { classe: "ocultista", trilha: "", nex: 60, nivel: null, opcionais: {} } });
        t.ok("com a ocultação ligada, o cartão sabe que os recursos estão ocultos", oculto.recursosOcultos && !oculto.recursos.length);
        t.ok("resumo ainda não calculado vira aviso, não número", PMs.resumir({ id: "m5", nome: "Mari", tipoFicha: "ordem", detalhado: false,
          recursosPendentes: true, recursos: [], ordem: { classe: "ocultista", opcionais: {} } }).recursosPendentes);
        t.ok("servidor antigo (sem os rótulos): a tela decide pelo papel", PMs.resumir(listadoMari).podeEditar === null);

        var guardadoCerto = JSON.parse(JSON.stringify(listadoMari));
        guardadoCerto.resumoRecursos = { versao: 1, pv: resumoMari.pv, pe: resumoMari.pe, san: resumoMari.san };
        t.ok("quem vê a ficha inteira: resumo guardado igual ao cálculo não é regravado", PMs.resumir(guardadoCerto).resumoDesatualizado === false);
        var guardadoVelho = JSON.parse(JSON.stringify(guardadoCerto));
        guardadoVelho.resumoRecursos.pv = resumoMari.pv - 7;
        t.ok("  resumo guardado velho é percebido", PMs.resumir(guardadoVelho).resumoDesatualizado === true);
        var semResumo = JSON.parse(JSON.stringify(listadoMari));
        semResumo.resumoRecursos = null;
        t.ok("  resumo que nunca foi gravado também", PMs.resumir(semResumo).resumoDesatualizado === true);
        t.ok("  e servidor que nem manda o campo não provoca regravação", PMs.resumir(listadoMari).resumoDesatualizado === false);
      }

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem — resolver cada tipo de pendência");

      /* Poder de classe. */
      var r1 = avaliar(lia, "d3.poderClasse", "golpePesado");
      t.ok("Golpe Pesado resolve um poder de classe", r1.completo && r1.valido);
      escolher(lia, "d3.poderClasse", "golpePesado");
      t.ok("  e a vaga sai das pendências", idsPendentes(lia).indexOf("d3.poderClasse") < 0);
      t.ok("  sem quitar a de NEX 30%", idsPendentes(lia).indexOf("d6.poderClasse") >= 0);
      t.ok("  e o poder aparece na ficha", nomesAdquiridos(lia).indexOf("Golpe Pesado") >= 0);

      /* Aumento de atributo, com o ponto de Intelecto. */
      var semPericia = avaliar(lia, "d4.atributo", "int");
      t.ok("aumentar Intelecto sem escolher a perícia fica incompleto", !semPericia.completo);
      t.ok("  e diz o que falta", semPericia.faltam.join(" ").indexOf("Perícia") >= 0);
      escolher(lia, "d4.atributo", "int", { pericia: "investigacao" });
      t.igual("Intelecto sobe de 1 para 2", RR.atributo(lia, "int"), 2);
      t.igual("  o valor da ficha continua 1", RR.atributoBase(lia, "int"), 1);
      t.igual("  e Investigação fica treinada (OPRPG p.15)", RR.grauDaPericia(lia, "investigacao"), "treinado");

      /* Grau de treinamento: 2 + Intelecto, já com o aumento. */
      t.igual("grau de treinamento de combatente com Int 2 pede 4 perícias",
        EP.quantasNoGrau(lia, "d7.grauTreinamento").total, 4);
      var parcial = avaliar(lia, "d7.grauTreinamento", "", { pericias: ["luta", "fortitude"] });
      t.ok("duas de quatro: incompleto", !parcial.completo && parcial.valido);
      t.ok("  dizendo quantas faltam", parcial.faltam.join(" ").indexOf("faltam 2") >= 0);
      var destreinada = avaliar(lia, "d7.grauTreinamento", "", { pericias: ["luta", "fortitude", "pontaria", "crime"] });
      t.ok("perícia destreinada não sobe grau", !destreinada.valido);
      escolher(lia, "d7.grauTreinamento", "", { pericias: ["luta", "fortitude", "pontaria", "tatica"] });
      t.igual("Luta vira veterano", RR.grauDaPericia(lia, "luta"), "veterano");
      t.igual("  com bônus +10", RR.bonusDePericia(lia, "luta").total, 10);
      t.igual("  e a ficha continua dizendo treinado na base", RR.grauBaseDaPericia(lia, "luta"), "treinado");

      /* Versatilidade: o primeiro poder de outra trilha. */
      var vers = avaliar(lia, "d10.versatilidade", "trilha", { trilha: { valor: "aniquilador", opcoes: { arma: "Katana" } } });
      t.ok("versatilidade aceita o primeiro poder de outra trilha", vers.completo && vers.valido);
      var versPropria = avaliar(lia, "d10.versatilidade", "trilha", { trilha: { valor: "tropadechoque", opcoes: {} } });
      t.ok("  mas não da própria trilha", !versPropria.valido);
      escolher(lia, "d10.versatilidade", "trilha", { trilha: { valor: "aniquilador", opcoes: { arma: "Katana" } } });
      t.ok("A Favorita chega pela versatilidade", nomesAdquiridos(lia).indexOf("A Favorita") >= 0);

      /* Perito. */
      var perito = RR.fichaVazia();
      perito.classe = "especialista";
      perito.nex = 5;
      perito.pericias = { investigacao: "treinado", luta: "treinado", ciencias: "treinado" };
      t.ok("Perito não aceita Luta", !avaliar(perito, "d1.perito", "", { pericias: ["investigacao", "luta"] }).valido);
      t.ok("  nem perícia destreinada", !avaliar(perito, "d1.perito", "", { pericias: ["investigacao", "crime"] }).valido);
      t.ok("  e aceita duas treinadas", avaliar(perito, "d1.perito", "", { pericias: ["investigacao", "ciencias"] }).valido);

      /* Trilha com requisito: Médico de Campo exige Medicina (OPRPG p.31). */
      var medica = RR.fichaVazia();
      medica.classe = "especialista";
      medica.nex = 10;
      var medicoSem = EP.candidatosTrilha(medica, "d2.trilha", null, false).filter(function (c) { return c.trilha.chave === "medico"; })[0];
      t.ok("Médico de Campo fica indisponível sem Medicina", !medicoSem.disponivel);
      t.ok("  e diz por quê", medicoSem.motivos.join(" ").indexOf("Medicina") >= 0);
      medica.pericias.medicina = "treinado";
      var medicoCom = EP.candidatosTrilha(medica, "d2.trilha", null, false).filter(function (c) { return c.trilha.chave === "medico"; })[0];
      t.ok("  e disponível com Medicina", medicoCom.disponivel);

      /* Opção interna de habilidade automática. */
      var aniq = agente({ trilha: "aniquilador", nex: 10 });
      t.ok("A Favorita abre a vaga da opção interna", idsPendentes(aniq).indexOf("b.aFavorita") >= 0);
      escolher(aniq, "b.aFavorita", "", { arma: "Fuzil de assalto", itens: [] });
      t.ok("  e escolher a arma a fecha", idsPendentes(aniq).indexOf("b.aFavorita") < 0);

      /* Poder de origem com escolha: Traços do Outro Lado. */
      var cultista = agente({ origem: "cultistaarrependido", nex: 5, trilha: "" });
      t.ok("Cultista Arrependido abre a escolha do poder paranormal", idsPendentes(cultista).indexOf("b.origem.cultistaarrependido") >= 0);
      escolher(cultista, "b.origem.cultistaarrependido", "", { poder: { valor: "sensitivo", opcoes: {} } });
      t.igual("  e Sensitivo entra na conta de Diplomacia", RR.bonusDePericia(cultista, "diplomacia").total, 5);

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem — requisitos e repetição");

      var req = agente({ nex: 60, atributos: { agi: 2, for: 1, int: 1, pre: 1, vig: 2 } });
      var armamento = EP.candidatosPoderClasse(req, "d3.poderClasse", null).filter(function (c) { return c.entrada.chave === "armamentoPesado"; })[0];
      t.ok("Armamento Pesado indisponível com Força 1", !armamento.disponivel);
      t.ok("  dizendo o requisito e o valor da etapa", armamento.motivos.join(" ").indexOf("Força 2") >= 0);
      t.ok("Proteção Pesada não serve em NEX 15%", !avaliar(req, "d3.poderClasse", "protecaoPesada").valido);
      t.ok("  e serve em NEX 30% (OPRPG p.25)", avaliar(req, "d6.poderClasse", "protecaoPesada").valido);
      t.ok("Tanque de Guerra exige Proteção Pesada", !avaliar(req, "d6.poderClasse", "tanqueDeGuerra").valido);
      escolher(req, "d6.poderClasse", "protecaoPesada");
      t.ok("  e com ela escolhida antes, vale", avaliar(req, "d9.poderClasse", "tanqueDeGuerra").valido);
      t.ok("o mesmo poder não entra duas vezes", !avaliar(req, "d9.poderClasse", "protecaoPesada").valido);
      t.ok("Treinamento em Perícia pode repetir",
        avaliar(req, "d9.poderClasse", "treinamentoEmPericia", { pericias: ["crime", "medicina"] }).valido);
      t.ok("um poder de outra classe não vale como poder de classe", !avaliar(req, "d9.poderClasse", "hacker").valido);
      t.ok("poder geral do Sobrevivendo ao Horror vale como poder de classe", avaliar(req, "d9.poderClasse", "estigmado").valido);

      /* Elemento: "para escolher um poder com pré-requisito Morte 2, você
         já precisa ter outros dois poderes de Morte" (OPRPG p.114). */
      var morte = agente({ nex: 99 });
      t.ok("Surto Temporal (Morte 2) fica indisponível sem poderes de Morte",
        !avaliar(morte, "d3.poderClasse", "transcender", { poder: { valor: "surtoTemporal", opcoes: {} } }).valido);
      escolher(morte, "d3.poderClasse", "transcender", { poder: { valor: "encararAMorte", opcoes: {} } });
      escolher(morte, "d6.poderClasse", "transcender", { poder: { valor: "resistirAElemento", opcoes: { elemento: "morte" } } });
      t.ok("  e disponível com dois poderes de Morte (Resistir a Morte conta como Morte)",
        avaliar(morte, "d9.poderClasse", "transcender", { poder: { valor: "surtoTemporal", opcoes: {} } }).valido);

      t.ok("Mestre em Elemento exige Especialista no mesmo elemento", (function () {
        var oc = RR.fichaVazia();
        oc.classe = "ocultista";
        oc.nex = 60;
        escolher(oc, "d3.poderClasse", "especialistaEmElemento", { elemento: "sangue" });
        var outro = avaliar(oc, "d9.poderClasse", "mestreEmElemento", { elemento: "morte" });
        var mesmo = avaliar(oc, "d9.poderClasse", "mestreEmElemento", { elemento: "sangue" });
        return !outro.valido && mesmo.valido;
      })());

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem — o Possuído não escolhe poder de ocultista");

      /* "Sempre que receber um novo poder de ocultista, em vez disso você
         recebe o poder Transcender" (Poder Não Desejado, SAH p.28). */
      function ocultista(extra) {
        var f = RR.fichaVazia();
        f.classe = "ocultista";
        f.nex = 90;
        f.atributos = { agi: 1, for: 1, int: 3, pre: 3, vig: 1 };
        f.pericias = { ocultismo: "treinado", vontade: "treinado", atualidades: "treinado" };
        return Object.assign(f, extra || {});
      }

      var pos = ocultista({ trilha: "possuido" });
      var vagasPos = EP.vagas(pos);
      var poderesPos = vagasPos.filter(function (v) { return v.tipo === "poderClasse"; });
      t.igual("o Possuído de NEX 90% tem as seis vagas de poder de ocultista", poderesPos.length, 6);
      t.ok("  e todas as seis viram Transcender", poderesPos.every(function (v) { return v.soTranscender; }));
      t.ok("  com o rótulo dizendo isso", poderesPos[0].rotulo.indexOf("Transcender") >= 0);
      t.ok("  e a explicação citando Poder Não Desejado e a página", poderesPos[0].explicacao.indexOf("Poder Não Desejado") >= 0 && poderesPos[0].explicacao.indexOf("p. 28") >= 0);
      t.ok("a versatilidade de NEX 50% também", vagasPos.filter(function (v) { return v.tipo === "versatilidade"; })[0].soTranscender);
      t.ok("mas o aumento de atributo não muda", !vagasPos.filter(function (v) { return v.tipo === "atributo"; })[0].soTranscender);

      var ofertaPos = EP.candidatosPoderClasse(pos, "d3.poderClasse", null);
      t.igual("a vaga oferece um poder só", ofertaPos.length, 1);
      t.igual("  e ele é Transcender", ofertaPos[0].entrada.chave, "transcender");
      t.ok("  disponível", ofertaPos[0].disponivel);

      t.ok("Transcender resolve a vaga", avaliar(pos, "d3.poderClasse", "transcender", { poder: { valor: "sensitivo", opcoes: {} } }).valido);
      t.ok("  e a vaga vazia pede Transcender pelo nome", avaliar(pos, "d3.poderClasse", "").faltam.join(" ").indexOf("Transcender") >= 0);

      var outroPoder = avaliar(pos, "d3.poderClasse", "treinamentoEmPericia", { pericias: ["ocultismo", "vontade"] });
      t.ok("outro poder de ocultista não vale", !outroPoder.valido);
      t.ok("  e o motivo cita Poder Não Desejado, com livro e página", outroPoder.motivos.join(" ").indexOf("Sobrevivendo ao Horror, p. 28") >= 0);
      t.ok("  e diz qual poder não entra", outroPoder.motivos.join(" ").indexOf("Treinamento em Perícia") >= 0);
      t.ok("poder geral do SAH também não entra (SAH p.33: poder de todas as classes)",
        !avaliar(pos, "d3.poderClasse", "estigmado").valido);

      /* O que não é poder de ocultista continua livre. */
      t.ok("o primeiro poder de outra trilha continua valendo na versatilidade",
        avaliar(pos, "d10.versatilidade", "trilha", { trilha: { valor: "exorcista", opcoes: {} } }).valido);
      var versOutro = avaliar(pos, "d10.versatilidade", "poderClasse", { poder: { valor: "treinamentoEmPericia", opcoes: { pericias: ["ocultismo", "vontade"] } } });
      t.ok("mas o poder de ocultista da versatilidade vira Transcender", !versOutro.valido);
      t.ok("  pelo mesmo motivo", versOutro.motivos.join(" ").indexOf("Poder Não Desejado") >= 0);
      t.ok("  e Transcender ali vale", avaliar(pos, "d10.versatilidade", "poderClasse", { poder: { valor: "transcender", opcoes: { poder: { valor: "sensitivo", opcoes: {} } } } }).valido);

      /* Transcender continua custando a Sanidade daquele aumento de NEX. */
      var sanPos = RR.sanidade(pos).total;
      escolher(pos, "d3.poderClasse", "transcender", { poder: { valor: "sensitivo", opcoes: {} } });
      t.igual("o Transcender recebido pela troca custa a Sanidade do degrau (5 do ocultista)", sanPos - RR.sanidade(pos).total, 5);
      t.ok("  e o poder paranormal entra na ficha", nomesAdquiridos(pos).indexOf("Sensitivo") >= 0);
      t.ok("  e a vaga sai das pendências", idsPendentes(pos).indexOf("d3.poderClasse") < 0);

      /* Uma ficha feita antes: a escolha antiga não é apagada. */
      var antesDaTroca = ocultista({ trilha: "conduite" });
      escolher(antesDaTroca, "d3.poderClasse", "treinamentoEmPericia", { pericias: ["crime", "medicina"] });
      t.igual("um ocultista de outra trilha escolhe poder de ocultista à vontade", RR.grauDaPericia(antesDaTroca, "crime"), "treinado");
      antesDaTroca.trilha = "possuido";
      var regAntigo = (antesDaTroca.escolhas || []).filter(function (r) { return r.etapa === "d3.poderClasse"; })[0];
      var estAntigo = EP.estado(antesDaTroca);
      t.ok("virar Possuído NÃO apaga a escolha antiga", !!regAntigo && antesDaTroca.escolhas.length === 1);
      t.ok("  mas ela fica marcada, com o motivo", estAntigo.avaliacoes[regAntigo.id].valido === false);
      t.ok("  e vira pendência a revisar", estAntigo.pendencias.some(function (p) { return p.id === "d3.poderClasse" && p.situacao === "invalida"; }));
      t.igual("  com o efeito suspenso", RR.grauDaPericia(antesDaTroca, "crime"), "destreinado");
      EP.definirIgnorarRequisitos(antesDaTroca, regAntigo.id, true);
      t.ok("a mesa pode manter a escolha mesmo assim", EP.estado(antesDaTroca).avaliacoes[regAntigo.id].valido);
      t.igual("  e o efeito volta", RR.grauDaPericia(antesDaTroca, "crime"), "treinado");

      /* Só o Possuído, e só no ocultista. */
      var exorcista = ocultista({ trilha: "exorcista" });
      t.ok("outra trilha de ocultista não troca nada",
        EP.vagas(exorcista).filter(function (v) { return v.tipo === "poderClasse"; }).every(function (v) { return !v.soTranscender; }));
      t.ok("  e a vaga dela oferece a lista inteira", EP.candidatosPoderClasse(exorcista, "d3.poderClasse", null).length > 10);
      t.ok("combatente com a mesma chave de trilha em branco não é afetado",
        EP.vagas(agente({ nex: 90 })).filter(function (v) { return v.tipo === "poderClasse"; }).every(function (v) { return !v.soTranscender; }));

      /* Com NEX & Experiência, Transcender deixa de ser poder de classe
         (SAH p.98): sem poder para receber no lugar, a vaga fica livre. */
      var posNiv = ocultista({ trilha: "possuido", opcionais: { nexExperiencia: true }, nivel: 10, nex: 50 });
      t.ok("com NEX & Experiência a troca não é aplicada",
        EP.vagas(posNiv).filter(function (v) { return v.tipo === "poderClasse"; }).every(function (v) { return !v.soTranscender; }));
      t.ok("  e a vaga aceita um poder de ocultista normal",
        avaliar(posNiv, "d3.poderClasse", "treinamentoEmPericia", { pericias: ["crime", "medicina"] }).valido);

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem — efeitos entram uma vez só");

      /* Potencial Aprimorado: "se escolher este poder em NEX 30%, recebe
         6 PE. Quando subir para NEX 35%, recebe +1 PE" (OPRPG p.115). */
      var potencial = agente({ nex: 30 });
      var pe30 = RR.pontosDeEsforco(potencial).total;
      escolher(potencial, "d6.poderClasse", "transcender", { poder: { valor: "potencialAprimorado", opcoes: {} } });
      t.igual("Potencial Aprimorado em NEX 30% dá 6 PE", RR.pontosDeEsforco(potencial).total - pe30, 6);
      potencial.nex = 35;
      var semPoder35 = agente({ nex: 35 });
      t.igual("  e em NEX 35% passa a dar 7", RR.pontosDeEsforco(potencial).total - RR.pontosDeEsforco(semPoder35).total, 7);

      /* Sangue de Ferro: "se escolher este poder em NEX 50%, recebe 20 PV.
         Quando subir para NEX 55%, recebe +2 PV" (OPRPG p.116). */
      var ferro = agente({ nex: 50 });
      var pv50 = RR.pontosDeVida(ferro).total;
      escolher(ferro, "d9.poderClasse", "transcender", { poder: { valor: "sangueDeFerro", opcoes: {} } });
      t.igual("Sangue de Ferro em NEX 50% dá 20 PV", RR.pontosDeVida(ferro).total - pv50, 20);

      /* Transcender: "não ganha Sanidade neste aumento de NEX". */
      var sanAntes = RR.sanidade(agente({ nex: 50 })).total;
      t.igual("Transcender tira a Sanidade daquele degrau (3 do combatente)", sanAntes - RR.sanidade(ferro).total, 3);

      var tresVezes = [RR.pontosDeVida(ferro).total, RR.pontosDeVida(ferro).total, RR.pontosDeVida(ferro).total];
      t.ok("recalcular três vezes dá o mesmo PV", tresVezes[0] === tresVezes[1] && tresVezes[1] === tresVezes[2]);

      var relida = RR.normalizar(JSON.parse(JSON.stringify(ferro)));
      t.igual("recarregar a ficha não concede o poder de novo", RR.pontosDeVida(relida).total, RR.pontosDeVida(ferro).total);
      t.igual("  nem duplica a escolha", relida.escolhas.length, ferro.escolhas.length);

      var casca = agente({ nex: 50 });
      var cascas = EP.estado(casca).adquiridos.filter(function (a) { return a.chave === "cascaGrossa"; }).length;
      t.igual("habilidade automática de trilha aparece uma vez", cascas, 1);

      /* Reflexos Defensivos: +2 Defesa, aparecendo na composição. */
      var reflexos = agente({ nex: 15 });
      var defAntes = RR.defesa(reflexos).total;
      escolher(reflexos, "d3.poderClasse", "reflexosDefensivos");
      t.igual("Reflexos Defensivos soma +2 na Defesa", RR.defesa(reflexos).total - defAntes, 2);
      t.ok("  com o nome do poder na composição",
        RR.defesa(reflexos).parcelas.some(function (p) { return p.rotulo === "Reflexos Defensivos"; }));
      t.igual("  e +2 em testes de resistência, à parte", RR.resistencias(reflexos).testes.total, 2);

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem — revisar tira só o que a escolha dava");

      var rev = agente({ nex: 60 });
      rev.ajustes.push(RR.criarAjuste("defesa", 1, "Colete da mesa"));
      escolher(rev, "d3.poderClasse", "reflexosDefensivos");
      escolher(rev, "d6.poderClasse", "protecaoPesada");
      escolher(rev, "d9.poderClasse", "tanqueDeGuerra");
      var defesaAntes = RR.defesa(rev).total;

      var imp = EP.impacto(rev, vagaDe(rev, "d6.poderClasse"), { valor: "golpePesado", opcoes: {} }, null);
      t.iguais("trocar Proteção Pesada avisa o que sai", imp.saem, ["Proteção Pesada"]);
      t.iguais("  e o que entra", imp.entram, ["Golpe Pesado"]);
      t.igual("  e que Tanque de Guerra deixa de valer", imp.invalidados.length, 1);

      escolher(rev, "d6.poderClasse", "golpePesado");
      var est = EP.estado(rev);
      var tanque = (rev.escolhas || []).filter(function (r) { return r.etapa === "d9.poderClasse"; })[0];
      t.ok("Tanque de Guerra NÃO foi apagado", !!tanque);
      t.ok("  mas ficou marcado como requisito não cumprido", est.avaliacoes[tanque.id].valido === false);
      t.ok("  e virou pendência a revisar", est.pendencias.some(function (p) { return p.id === "d9.poderClasse" && p.situacao === "invalida"; }));
      t.igual("a Defesa de Reflexos Defensivos e do ajuste da mesa continua", RR.defesa(rev).total, defesaAntes);
      t.ok("o ajuste da mesa sobreviveu à troca", rev.ajustes.length === 1);

      EP.definirIgnorarRequisitos(rev, tanque.id, true);
      t.ok("a mesa pode manter a escolha mesmo assim", EP.estado(rev).avaliacoes[tanque.id].valido);
      t.ok("  e os problemas continuam listados", EP.estado(rev).avaliacoes[tanque.id].motivos.length > 0);

      /* Baixar o NEX guarda a escolha em vez de apagar. */
      var baixa = agente({ nex: 50 });
      escolher(baixa, "d10.atributo", "agi");
      baixa.nex = 45;
      t.igual("baixar o NEX não apaga a escolha de NEX 50%", baixa.escolhas.length, 1);
      t.igual("  mas tira o efeito", RR.atributo(baixa, "agi"), 2);
      t.igual("  e a lista como guardada fora da progressão", EP.estado(baixa).fora.length, 1);
      baixa.nex = 50;
      t.igual("subir de novo faz a escolha voltar a valer", RR.atributo(baixa, "agi"), 3);

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem — afinidade");

      var af = agente({ nex: 45 });
      t.ok("NEX 45%: nenhuma afinidade a decidir", idsPendentes(af).indexOf("afinidade") < 0);
      af.nex = 50;
      t.ok("NEX 50%: afinidade a decidir", idsPendentes(af).indexOf("afinidade") >= 0);

      af.afinidade = { elemento: "", nomeOutro: "", adiada: true };
      var adiada = EP.estado(af).pendencias.filter(function (p) { return p.id === "afinidade"; })[0];
      t.ok("adiar mantém a pendência", !!adiada);
      t.ok("  marcada como adiada", adiada.adiada === true);

      af.afinidade = { elemento: "outro", nomeOutro: "", adiada: false };
      t.ok("“Outro” sem nome continua pendente", idsPendentes(af).indexOf("afinidade") >= 0);
      af.afinidade.nomeOutro = "Vazio";
      t.ok("“Outro” com nome resolve", idsPendentes(af).indexOf("afinidade") < 0);
      t.ok("  e é marcado como Homebrew", EP.estado(af).afinidade.homebrew);

      /* Escolher o elemento não aplica efeito: a afinidade vem ao
         transcender depois de NEX 50% (OPRPG p.114). */
      var afi = agente({ nex: 99, afinidade: { elemento: "sangue", nomeOutro: "", adiada: false } });
      t.ok("escolher o elemento sozinho não desenvolve afinidade", !EP.estado(afi).afinidade.ativa);
      escolher(afi, "d9.poderClasse", "transcender", { poder: { valor: "espreitarDaBesta", opcoes: {} } });
      t.ok("transcender em NEX 45% ainda não desenvolve", !EP.estado(afi).afinidade.ativa);
      t.ok("  e antes de NEX 50% a segunda escolha do mesmo poder é recusada", (function () {
        var cedo = agente({ nex: 99, afinidade: { elemento: "sangue", nomeOutro: "", adiada: false } });
        escolher(cedo, "d3.poderClasse", "transcender", { poder: { valor: "espreitarDaBesta", opcoes: {} } });
        return !avaliar(cedo, "d6.poderClasse", "transcender", { poder: { valor: "espreitarDaBesta", opcoes: {} } }).valido;
      })());
      escolher(afi, "d12.poderClasse", "transcender", { poder: { valor: "sangueDeFerro", opcoes: {} } });
      t.ok("transcender em NEX 60% desenvolve a afinidade", EP.estado(afi).afinidade.ativa);
      var furtAntes = RR.bonusDePericia(afi, "furtividade").total;
      escolher(afi, "d15.poderClasse", "transcender", { poder: { valor: "espreitarDaBesta", opcoes: {} } });
      t.igual("com afinidade, Espreitar da Besta de novo sobe Furtividade para +10", RR.bonusDePericia(afi, "furtividade").total - furtAntes, 5);
      var afi2 = agente({ nex: 99, afinidade: { elemento: "sangue", nomeOutro: "", adiada: false } });
      escolher(afi2, "d3.poderClasse", "transcender", { poder: { valor: "encararAMorte", opcoes: {} } });
      escolher(afi2, "d12.poderClasse", "transcender", { poder: { valor: "armaDeSangue", opcoes: {} } });
      t.ok("com afinidade em Sangue, um poder de Morte não repete",
        !avaliar(afi2, "d15.poderClasse", "transcender", { poder: { valor: "encararAMorte", opcoes: {} } }).valido);

      afi.afinidade.elemento = "morte";
      var trocada = EP.estado(afi);
      var segunda = (afi.escolhas || []).filter(function (r) { return r.etapa === "d15.poderClasse"; })[0];
      t.ok("trocar o elemento marca a segunda escolha como problema, sem apagar",
        trocada.avaliacoes[segunda.id].valido === false && afi.escolhas.length === 3);

      /* Nível e NEX separados: a afinidade olha o NEX de exposição. */
      var sep = agente({ opcionais: { nexExperiencia: true }, nivel: 12, nex: 30 });
      t.ok("nível 12 com NEX 30%: sem afinidade a decidir", idsPendentes(sep).indexOf("afinidade") < 0);
      sep.nivel = 2;
      sep.nex = 55;
      t.ok("nível 2 com NEX 55%: afinidade a decidir", idsPendentes(sep).indexOf("afinidade") >= 0);

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem — progressão com nível e NEX separados");

      var niv = agente({ opcionais: { nexExperiencia: true }, nivel: 6, nex: 25, trilha: "tropadechoque" });
      var vagasNiv = EP.vagas(niv).map(function (v) { return v.id; });
      t.ok("as vagas de classe seguem o nível", vagasNiv.indexOf("d6.poderClasse") >= 0 && vagasNiv.indexOf("d7.grauTreinamento") < 0);
      t.ok("a exposição abre a oportunidade de transcender em NEX 25%", vagasNiv.indexOf("x25.transcender") >= 0);
      t.ok("  e a alteração de NEX 25%", vagasNiv.indexOf("x25.alteracao") >= 0);
      t.ok("Transcender não vale como poder de classe com a regra",
        !avaliar(niv, "d3.poderClasse", "transcender", { poder: { valor: "sensitivo", opcoes: {} } }).valido);
      var sanNiv = RR.sanidade(niv).total;
      escolher(niv, "x25.transcender", "transcender", { poder: { valor: "sensitivo", opcoes: {} } });
      t.igual("transcender pela exposição NÃO custa Sanidade (SAH p.98)", RR.sanidade(niv).total, sanNiv);
      escolher(niv, "x25.alteracao", "", { penalidade: "enganacao" });
      t.igual("a alteração de NEX 25% penaliza a perícia escolhida em –5", RR.bonusDePericia(niv, "enganacao").total, -5);
      t.ok("recusar transcender também resolve a vaga", (function () {
        var o = agente({ opcionais: { nexExperiencia: true }, nivel: 7, nex: 35 });
        escolher(o, "x35.transcender", "nao");
        return idsPendentes(o).indexOf("x35.transcender") < 0;
      })());

      /* Ligar a regra não apaga a escolha de Transcender feita antes. */
      var antes = agente({ nex: 30 });
      escolher(antes, "d6.poderClasse", "transcender", { poder: { valor: "sensitivo", opcoes: {} } });
      global.RAMAOrdemOpcionais.definir(antes, "nexExperiencia", true);
      var reg = antes.escolhas[0];
      t.ok("ligar NEX & Experiência marca Transcender de classe como problema", EP.estado(antes).avaliacoes[reg.id].valido === false);
      t.igual("  sem apagar a escolha", antes.escolhas.length, 1);
      global.RAMAOrdemOpcionais.definir(antes, "nexExperiencia", false);
      t.ok("  e desligar faz ela voltar a valer", EP.estado(antes).avaliacoes[reg.id].valido === true);

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem — criação em progressão avançada");

      var rascunho = RR.fichaVazia();
      rascunho.classe = "ocultista";
      rascunho.origem = "academico";
      rascunho.nex = 60;
      rascunho.atributos = { agi: 1, for: 1, int: 3, pre: 2, vig: 1 };
      var abertas = idsPendentes(rascunho);
      t.ok("NEX 60% sem nada decidido lista trilha, poderes, atributos, graus e afinidade",
        ["d2.trilha", "d3.poderClasse", "d4.atributo", "d7.grauTreinamento", "d10.versatilidade", "afinidade"].every(function (id) {
          return abertas.indexOf(id) >= 0;
        }));
      rascunho.trilha = "graduado";
      escolher(rascunho, "d3.poderClasse", "ritualPotente");
      var criada = global.RAMAFicha.normalizarFicha(JSON.parse(JSON.stringify({
        nome: "Criada", tipoFicha: "ordem", ordem: rascunho,
      })));
      t.igual("a escolha feita na criação chega na ficha", criada.ordem.escolhas.length, 1);
      t.ok("  e as abertas continuam abertas", idsPendentes(criada.ordem).indexOf("d4.atributo") >= 0);

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem — carga, quantidade e ajuste temporário");

      function invDe(itens) { return { limite: 0, itens: itens }; }

      var carg = agente({ nex: 5, atributos: { agi: 1, for: 2, int: 1, pre: 1, vig: 1 } });
      var inv = invDe([
        global.RAMAFicha.criarItem("item", { nome: "Granada", ordem: { espacos: 1, quantidade: 3, categoria: 1 } }),
        global.RAMAFicha.criarItem("arma", { nome: "Fuzil", ordem: { espacos: 2, quantidade: 1, categoria: 2 } }),
        global.RAMAFicha.criarItem("item", { nome: "Corda" }),
        global.RAMAFicha.criarItem("item", { nome: "Mochila militar", ordem: { espacos: 0, capacidade: 2, categoria: 1 } }),
      ]);
      var cap = RR.capacidade(carg, inv);
      t.igual("Força 2 carrega 10 espaços, mais 2 da mochila militar", cap.calculada, 12);
      t.igual("carga soma espaços × quantidade, com o padrão de 1 para quem não informou", cap.ocupado, 3 + 2 + 1 + 0);
      t.ok("  e marca o item sem espaço informado como padrão", cap.itens.filter(function (x) { return x.nome === "Corda"; })[0].padrao);

      carg.temporarios.capacidade = 5;
      t.igual("ajuste +5 aumenta a capacidade final", RR.capacidade(carg, inv).final, 17);
      t.igual("  sem mexer na carga", RR.capacidade(carg, inv).ocupado, 6);
      t.igual("  nem na Força", RR.atributo(carg, "for"), 2);
      carg.temporarios.capacidade = -2;
      t.igual("ajuste –2 reduz", RR.capacidade(carg, inv).final, 10);
      carg.temporarios.capacidade = 0;
      t.igual("ajuste 0 mantém a calculada", RR.capacidade(carg, inv).final, 12);
      carg.temporarios.capacidade = -20;
      var negativo = RR.capacidade(carg, inv);
      t.igual("ajuste que levaria abaixo de zero para em 0", negativo.final, 0);
      t.ok("  e avisa que passou do limite", negativo.abaixoDeZero);
      t.ok("  deixando sobrecarregado, com –5 na Defesa", RR.defesa(carg, inv).parcelas.some(function (p) { return p.rotulo === "Sobrecarregado"; }));
      carg.temporarios.capacidade = 0;

      t.ok("o ajuste temporário sobrevive a recarregar", (function () {
        var o = agente();
        o.temporarios.capacidade = 4;
        return RR.normalizar(JSON.parse(JSON.stringify(o))).temporarios.capacidade === 4;
      })());
      t.igual("ajuste fora do intervalo é aparado na leitura", RR.normalizar({ temporarios: { capacidade: 500 } }).temporarios.capacidade, 99);

      t.ok("“+5” é um ajuste válido", IO.validarAjusteTemporario("+5").valor === 5);
      t.ok("“-2” também", IO.validarAjusteTemporario("-2").valor === -2);
      t.ok("“abc” não é", !IO.validarAjusteTemporario("abc").ok);
      t.ok("meio espaço é aceito", IO.validarEspacos("0,5").valor === 0.5);
      t.ok("espaço fora de quartos (0,1) é aceito", IO.validarEspacos("0,1").ok && IO.validarEspacos("0,1").valor === 0.1);
      t.igual("  e guardado com duas casas", IO.validarEspacos("0,125").valor, 0.13);
      t.igual("  e sobrevive à normalização", IO.normalizarDados({ espacos: 0.1 }, "item").espacos, 0.1);
      t.ok("espaço negativo continua recusado", !IO.validarEspacos("-1").ok);
      t.igual("três unidades de 0,1 ocupam 0,3, sem resto de ponto flutuante",
        RR.ocupacaoDoInventario(RR.fichaVazia(), invDe([{ id: "p", tipo: "item", nome: "Pena", ordem: { espacos: 0.1, quantidade: 3 } }])).total, 0.3);
      t.ok("quantidade 0 é recusada", !IO.validarQuantidade("0").ok);

      /* Inventário Otimizado: "se você tem Força 1 e Intelecto 3, seu
         inventário tem 20 espaços" (OPRPG p.31). */
      var tecnico = RR.fichaVazia();
      tecnico.classe = "especialista";
      tecnico.trilha = "tecnico";
      tecnico.nex = 10;
      tecnico.atributos = { agi: 1, for: 1, int: 3, pre: 1, vig: 1 };
      t.igual("Técnico com Força 1 e Intelecto 3 carrega 20 espaços", RR.capacidade(tecnico, invDe([])).calculada, 20);

      /* Mochila de Utilidades: um item conta uma categoria abaixo e ocupa
         1 espaço a menos. */
      var mochila = RR.fichaVazia();
      mochila.classe = "especialista";
      mochila.nex = 15;
      mochila.atributos = { agi: 1, for: 2, int: 1, pre: 1, vig: 1 };
      var kit = global.RAMAFicha.criarItem("item", { nome: "Kit", ordem: { espacos: 2, categoria: 2 } });
      var invKit = invDe([kit]);
      escolher(mochila, "d3.poderClasse", "mochilaDeUtilidades", { item: kit.id });
      t.igual("Mochila de Utilidades tira 1 espaço do item", RR.capacidade(mochila, invKit).ocupado, 1);
      t.igual("  e baixa a categoria de II para I", RR.usoPorCategoria(mochila, invKit).categorias[1].usados, 1);
      var semItem = EP.estado(mochila, { inventario: invDe([]) });
      t.ok("remover o item deixa a escolha marcada, não apagada",
        semItem.avaliacoes[mochila.escolhas[0].id].valido === false && mochila.escolhas.length === 1);

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem — categoria e espaços efetivos: uma origem só");

      var coroa = global.RAMAFicha.criarItem("item", { nome: "Coroa de Espinhos", ordem: { categoria: 2, grupo: "paranormal" } });
      var municao = global.RAMAFicha.criarItem("item", { nome: "Balas", ordem: { espacos: 1, quantidade: 3, categoria: 2 } });
      var invCoroa = invDe([coroa, municao]);
      var fichaCoroa = RR.fichaVazia();
      fichaCoroa.classe = "especialista";
      fichaCoroa.nex = 15;
      escolher(fichaCoroa, "d3.poderClasse", "mochilaDeUtilidades", { item: coroa.id });

      var efCoroa = RR.itensEfetivos(fichaCoroa, invCoroa).porId[coroa.id];
      t.igual("Coroa de Espinhos modificada: categoria efetiva I", efCoroa.categoria.efetiva, 1);
      t.igual("  guardando a original II", efCoroa.categoria.base, 2);
      t.ok("  com a fonte do modificador", efCoroa.categoria.reducoes.some(function (r) { return /Mochila de Utilidades/.test(r.fonte); }));
      t.igual("  espaços efetivos 0 — zero não vira o valor-base", efCoroa.espacos.total, 0);
      t.igual("  espaços originais 1 (padrão do livro)", efCoroa.espacos.totalBase, 1);
      t.ok("  e o item guardado continua com os valores-base", coroa.ordem.categoria === 2 && coroa.ordem.espacos === null);
      t.igual("o cabeçalho, os detalhes e a carga leem a mesma conta",
        RR.itensEfetivos(fichaCoroa, invCoroa).ocupado, RR.capacidade(fichaCoroa, invCoroa).ocupado);
      t.igual("  e os limites por categoria contam a categoria efetiva",
        RR.usoPorCategoria(fichaCoroa, invCoroa).categorias[1].itens.map(function (x) { return x.nome; }).join(","), "Coroa de Espinhos");

      var efBalas = RR.itensEfetivos(fichaCoroa, invCoroa).porId[municao.id];
      t.igual("sem modificador, 3 unidades de 1 espaço ocupam 3", efBalas.espacos.total, 3);
      t.igual("  e contam 3 contra a categoria II", RR.usoPorCategoria(fichaCoroa, invCoroa).categorias[2].usados, 3);

      var fichaBalas = RR.fichaVazia();
      fichaBalas.classe = "especialista";
      fichaBalas.nex = 15;
      escolher(fichaBalas, "d3.poderClasse", "mochilaDeUtilidades", { item: municao.id });
      var efBalasMod = RR.itensEfetivos(fichaBalas, invCoroa).porId[municao.id];
      t.igual("Mochila de Utilidades numa pilha de 3 tira 1 espaço de UMA unidade: ocupa 2", efBalasMod.espacos.total, 2);
      t.igual("  o espaço por unidade continua 1", efBalasMod.espacos.unitarioEfetivo, 1);
      t.igual("  a quantidade continua 3", efBalasMod.quantidade, 3);
      t.igual("  e as 3 unidades contam na categoria I", RR.usoPorCategoria(fichaBalas, invCoroa).categorias[1].usados, 3);

      fichaCoroa.escolhas = [];
      var efSem = RR.itensEfetivos(fichaCoroa, invCoroa).porId[coroa.id];
      t.ok("remover o modificador restaura os valores-base", efSem.categoria.efetiva === 2 && efSem.espacos.total === 1);

      var zero = global.RAMAFicha.criarItem("item", { nome: "Bilhete", ordem: { espacos: 0, categoria: 0 } });
      var efZero = RR.itensEfetivos(RR.fichaVazia(), invDe([zero])).porId[zero.id];
      t.ok("espaço 0 cadastrado é 0, não o padrão de 1", efZero.espacos.total === 0 && efZero.espacos.unitario === 0 && !efZero.espacos.padrao);
      t.igual("  e categoria 0 é 0, não “não informada”", efZero.categoria.efetiva, 0);

      escolher(fichaCoroa, "d3.poderClasse", "mochilaDeUtilidades", { item: coroa.id });
      var recarregadaCoroa = RR.normalizar(JSON.parse(JSON.stringify(fichaCoroa)));
      var invRecarregado = { limite: 0, itens: JSON.parse(JSON.stringify(invCoroa.itens)).map(global.RAMAFicha.normalizarItem) };
      RR.itensEfetivos(recarregadaCoroa, invRecarregado);
      var efRecarregada = RR.itensEfetivos(recarregadaCoroa, invRecarregado).porId[coroa.id];
      t.ok("recalcular e recarregar não acumulam a redução", efRecarregada.categoria.efetiva === 1 && efRecarregada.espacos.total === 0);

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem — proteção em uso soma na Defesa");

      var comProtecao = RR.fichaVazia();
      comProtecao.atributos = { agi: 3, for: 1, int: 1, pre: 1, vig: 1 };
      var leve = global.RAMAFicha.criarItem("armadura", { nome: "Proteção Leve", defesa: 5, ordem: { espacos: 2, quantidade: 2, categoria: 1, emUso: true } });
      var invLeve = invDe([leve]);
      var defLeve = RR.defesa(comProtecao, invLeve);
      t.igual("Base 10 + Agilidade 3 + Proteção Leve 5 = Defesa 18", defLeve.total, 18);
      t.ok("  a composição mostra a proteção", defLeve.parcelas.some(function (x) { return x.rotulo === "Proteção Leve" && x.valor === 5; }));
      t.igual("  e as parcelas somam o total", defLeve.parcelas.reduce(function (s, x) { return s + x.valor; }, 0), defLeve.total);
      t.igual("quantidade 2 não dobra o bônus", RR.defesa(comProtecao, invLeve).total, 18);

      delete leve.ordem.emUso;
      var guardadaDef = RR.defesa(comProtecao, invLeve);
      t.igual("guardada, a proteção não soma: 13", guardadaDef.total, 13);
      t.ok("  e a composição explica por quê", (guardadaDef.avisos || []).some(function (a) { return /nenhuma está em uso/.test(a); }));

      leve.ordem.emUso = true;
      leve.defesa = 7;
      t.igual("mudar a Defesa cadastrada muda o resultado (20)", RR.defesa(comProtecao, invLeve).total, 20);
      leve.defesa = 5;

      /* Sem espaço: a carga não pode entrar na conta deste teste (5 espaços
         a mais sobrecarregariam e tirariam 5 da Defesa). */
      var pesada = global.RAMAFicha.criarItem("armadura", { nome: "Proteção Pesada", defesa: 10, ordem: { espacos: 0, categoria: 2, emUso: true } });
      var invDuas = invDe([leve, pesada]);
      var defDuas = RR.defesa(comProtecao, invDuas);
      t.igual("duas marcadas em uso não somam as duas: vale a de maior Defesa (23)", defDuas.total, 23);
      t.ok("  e a composição avisa", (defDuas.avisos || []).some(function (a) { return /Mais de uma/.test(a); }));

      t.igual("remover a proteção tira o bônus sem resto", RR.defesa(comProtecao, invDe([])).total, 13);

      var leveRecarregada = global.RAMAFicha.normalizarItem(JSON.parse(JSON.stringify(leve)));
      t.ok("o estado de uso sobrevive a salvar e reabrir", leveRecarregada.ordem.emUso === true);
      t.igual("  e recalcular duas vezes não acumula", (RR.defesa(comProtecao, invDe([leveRecarregada])), RR.defesa(comProtecao, invDe([leveRecarregada])).total), 18);
      t.ok("só proteção guarda estado de uso", !("emUso" in IO.normalizarDados({ emUso: true }, "item")));
      t.ok("proteção fora de uso não ganha campo", !("emUso" in IO.normalizarDados({}, "armadura")));

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem — patente ligada e limites manuais");

      var pat = agente({ prestigio: 20 });
      var invPat = invDe([
        global.RAMAFicha.criarItem("item", { nome: "Granadas", ordem: { quantidade: 4, categoria: 1 } }),
        global.RAMAFicha.criarItem("item", { nome: "Óculos", ordem: { quantidade: 1, categoria: 2 } }),
      ]);
      t.ok("ficha sem a chave aplica a patente (comportamento anterior)", RR.regraDePatente(RR.normalizar({})));
      var uso = RR.usoPorCategoria(pat, invPat);
      t.igual("operador: 3 itens de categoria I (OPRPG p.53)", uso.categorias[1].limite, 3);
      t.ok("  e 4 unidades passam do limite", uso.categorias[1].excedido);
      t.igual("categoria 0 não tem limite", uso.categorias[0].limite, null);
      t.igual("patente III de operador é 0 — nenhum, não “sem limite”", uso.categorias[3].limite, 0);

      var aviso = RR.definirRegraDePatente(pat, false);
      t.ok("desligar a patente avisa que os limites manuais começaram iguais", !!aviso.aviso);
      t.igual("  com o limite de I igual ao da patente", RR.usoPorCategoria(pat, invPat).categorias[1].limite, 3);
      t.ok("  e a patente deixa de ser aplicada", !RR.patente(pat).aplicada);
      pat.patente.limites["1"] = null;
      pat.patente.limites["3"] = 0;
      t.igual("limite manual “sem limite” vale", RR.usoPorCategoria(pat, invPat).categorias[1].limite, null);
      t.ok("  e nada fica acima do limite", !RR.usoPorCategoria(pat, invPat).categorias[1].excedido);
      RR.definirRegraDePatente(pat, true);
      t.igual("religar volta à tabela", RR.usoPorCategoria(pat, invPat).categorias[1].limite, 3);
      RR.definirRegraDePatente(pat, false);
      t.igual("desligar de novo recupera a configuração manual", RR.usoPorCategoria(pat, invPat).categorias[1].limite, null);
      t.igual("alternar a regra não apaga item nenhum", invPat.itens.length, 2);
      t.ok("os limites manuais sobrevivem a recarregar", (function () {
        var lida = RR.normalizar(JSON.parse(JSON.stringify(pat)));
        return lida.patente.aplicar === false && lida.patente.limites["1"] === null && lida.patente.limites["3"] === 0;
      })());

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem — persistência e compatibilidade");

      var completa2 = global.RAMAFicha.criarFicha({ nome: "Persistente", tipoFicha: "ordem" });
      completa2.ordem = agente({ nex: 60, afinidade: { elemento: "energia", nomeOutro: "Vazio", adiada: false } });
      escolher(completa2.ordem, "d3.poderClasse", "golpePesado");
      completa2.inventario.itens.push(global.RAMAFicha.criarItem("item", { nome: "Kit", ordem: { espacos: 1.5, quantidade: 2, categoria: 1, grupo: "geral" } }));
      var voltou = global.RAMAFicha.normalizarFicha(JSON.parse(JSON.stringify(completa2)));
      t.igual("a escolha volta depois de salvar e recarregar", voltou.ordem.escolhas[0].valor, "golpePesado");
      t.igual("  com o mesmo id", voltou.ordem.escolhas[0].id, completa2.ordem.escolhas[0].id);
      t.igual("a afinidade volta", voltou.ordem.afinidade.elemento, "energia");
      t.igual("  e o nome Homebrew guardado não se perde", voltou.ordem.afinidade.nomeOutro, "Vazio");
      t.iguais("os dados de Ordem do item voltam", [voltou.inventario.itens[0].ordem.espacos, voltou.inventario.itens[0].ordem.quantidade],
        [1.5, 2]);

      if (V) {
        var pacote2 = V.exportar("personagem", completa2);
        var imp2 = V.importado(JSON.parse(JSON.stringify(pacote2)));
        t.ok("a ficha com escolhas atravessa exportar e importar", imp2.ok && imp2.dados.ordem.escolhas.length === 1);
      }

      var universal = global.RAMAFicha.normalizarFicha({ nome: "Universal", inventario: { itens: [{ id: "u1", tipo: "item", nome: "Corda", peso: 2 }] } });
      t.ok("item da ficha universal não ganha bloco de Ordem", universal.inventario.itens[0].ordem === undefined);
      t.igual("  e continua com o peso", universal.inventario.itens[0].peso, 2);
      t.ok("ficha universal não ganha bloco de Ordem", universal.ordem === undefined);

      /* A v2.3 guardava pendências e anotações de texto em `progressao`. */
      var antiga23 = RR.normalizar({
        classe: "combatente", nex: 20,
        progressao: [
          { id: "p1", nex: 15, tipo: "poderClasse", valor: "Golpe Pesado", rotulo: "Poder de classe" },
          { id: "p2", nex: 20, tipo: "atributo", valor: "", rotulo: "Aumento de atributo" },
        ],
      });
      t.igual("a anotação de texto da v2.3 é preservada", antiga23.progressao.length, 2);
      t.ok("  e conta como escolha feita", idsPendentes(antiga23).indexOf("d3.poderClasse") < 0);
      t.ok("  enquanto a pendência vazia continua pendente", idsPendentes(antiga23).indexOf("d4.atributo") >= 0);
      t.igual("  e aparece como registro escrito à mão", EP.estado(antiga23).legado.length, 1);

      if (global.RAMASync) {
        /* Dois aparelhos resolvendo etapas diferentes: as duas decisões
           ficam, casadas por id. */
        var base = { ordem: agente({ nex: 30 }) };
        var aparelhoA = JSON.parse(JSON.stringify(base));
        var aparelhoB = JSON.parse(JSON.stringify(base));
        escolher(aparelhoA.ordem, "d3.poderClasse", "golpePesado");
        escolher(aparelhoB.ordem, "d6.poderClasse", "protecaoPesada");
        var mescla = global.RAMASync.mesclar(base, aparelhoA, aparelhoB, global.RAMASync.ESQUEMA_FICHA);
        t.igual("a sincronização junta escolhas de etapas diferentes", mescla.estado.ordem.escolhas.length, 2);
        t.igual("  sem perguntar nada", mescla.conflitos.length, 0);
      }
    }

    /* =================================================================
       ORDEM — BIBLIOTECA DE ITENS (v2.13)
       -----------------------------------------------------------------
       O catálogo dos dois livros como dado, a busca, a cópia que vira
       item de ficha, e a prova de que o item copiado FUNCIONA: carga,
       categoria, Defesa, ataque e dano pelos mesmos motores da ficha.
       ================================================================= */

    if (global.RAMAOrdemItens && global.RAMAOrdemItensDados && global.RAMAOrdemRegras && global.RAMAFicha) {
      var IT = global.RAMAOrdemItens;
      var RI = global.RAMAOrdemRegras;
      var II = global.RAMAOrdemInventario;
      var FI = global.RAMAFicha;

      var catalogo = IT.normalizarCatalogo(global.RAMAOrdemItensDados);
      var entrada = function (id) { return catalogo.porId[id]; };
      var inv = function (itens) { return { limite: 0, itens: itens }; };
      var agenteDeItens = function (extra) {
        var f = RI.fichaVazia();
        f.classe = "combatente";
        f.origem = "militar";
        f.trilha = "";
        f.nex = 5;
        f.atributos = { agi: 2, for: 2, int: 1, pre: 1, vig: 2 };
        f.pericias = { luta: "treinado", pontaria: "treinado", fortitude: "treinado", reflexos: "treinado" };
        return Object.assign(f, extra || {});
      };
      /* Adicionar pela biblioteca, sem tela: montar e criar o item. */
      var adicionar = function (id, opcoes) {
        var o = Object.assign({ catalogo: catalogo }, opcoes || {});
        var r = IT.paraInventario(entrada(id), o);
        if (!r.ok) throw new Error("não montou " + id + ": " + r.mensagem);
        return FI.criarItem(r.tipo, r.dados);
      };
      var aplicarEm = function (id, item, escolha) {
        return IT.aplicar(entrada(id), item, { escolha: escolha });
      };

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem · itens — catálogo completo e estruturado");

      t.igual("244 entradas nos dois livros", catalogo.itens.length, 244);
      var contagem = {};
      catalogo.itens.forEach(function (e) {
        var k = e.aba + "/" + e.natureza + "/" + e.fonte;
        contagem[k] = (contagem[k] || 0) + 1;
      });
      [
        ["armas/item/OPRPG", 34, "armas do livro básico (Tabela 3.3)"],
        ["armas/item/SAH", 11, "armas do Sobrevivendo ao Horror (Tabela 1.4)"],
        ["armas/modificacao/OPRPG", 13, "modificações de armas do livro básico (Tabela 3.5)"],
        ["armas/modificacao/SAH", 1, "modificação de armas do SAH (Carregador rápido)"],
        ["municoes/item/OPRPG", 8, "munições do livro básico"],
        ["municoes/item/SAH", 1, "munição do SAH (bolinhas de estilingue)"],
        ["municoes/modificacao/OPRPG", 2, "modificações de munição (Dum dum, Explosiva)"],
        ["protecoes/item/OPRPG", 3, "proteções (Tabela 3.6)"],
        ["protecoes/modificacao/OPRPG", 4, "modificações de proteção (Tabela 3.7)"],
        ["geral/item/OPRPG", 34, "equipamentos gerais e paranormais do livro básico"],
        ["geral/item/SAH", 45, "equipamentos gerais e paranormais do SAH (Tabela 1.5)"],
        ["geral/modificacao/OPRPG", 4, "modificações de acessório (Tabela 3.9)"],
        ["geral/modificacao/SAH", 2, "modificações do SAH para acessórios e itens paranormais"],
        ["amaldicoados/maldicao/OPRPG", 35, "maldições para armas, proteções e acessórios"],
        ["amaldicoados/item/OPRPG", 28, "itens amaldiçoados especiais do livro básico"],
        ["amaldicoados/item/SAH", 19, "itens amaldiçoados do SAH (Tabela 1.6)"],
      ].forEach(function (c) { t.igual(c[2] + ": " + c[1], contagem[c[0]] || 0, c[1]); });

      var idsVistos = {};
      var idRepetido = "";
      catalogo.itens.forEach(function (e) { if (idsVistos[e.id]) idRepetido = e.id; idsVistos[e.id] = true; });
      t.igual("nenhum id se repete", idRepetido, "");
      t.ok("todo id é estável e diz a fonte (op.… ou sah.…)", catalogo.itens.every(function (e) {
        return /^(op|sah)\.[a-z0-9.-]+$/.test(e.id) && (e.fonte === "SAH") === (e.id.indexOf("sah.") === 0);
      }));
      t.ok("toda entrada tem nome, resumo, fonte e página", catalogo.itens.every(function (e) {
        return e.nome && e.resumo && (e.fonte === "OPRPG" || e.fonte === "SAH") && e.pagina > 0;
      }));
      t.ok("todo item tem tipo de ficha e grupo; modificações e maldições não", catalogo.itens.every(function (e) {
        return e.natureza === "item" ? !!(e.tipoItem && e.grupo) : (e.tipoItem === null && e.grupo === null);
      }));
      var semCategoria = catalogo.itens.filter(function (e) { return e.natureza === "item" && e.categoria === null; });
      t.iguais("só dois itens ficam sem categoria, porque o livro não a informa",
        semCategoria.map(function (e) { return e.id; }).sort(), ["op.amaldicoado.selos-paranormais", "op.paranormal.medidor-de-estabilidade"]);
      t.ok("  e os dois explicam o porquê (nota ou escolha que define a categoria)", semCategoria.every(function (e) {
        return e.notas.length || (e.escolha && e.escolha.tipo === "circulo");
      }));
      t.ok("toda arma tem dano (ou a tabela de 1d6 do Arcabuz)", catalogo.itens.every(function (e) {
        return !e.arma || e.arma.dano || (e.arma.danoPorD6 && e.arma.danoPorD6.length === 6);
      }));
      t.ok("toda munição citada por uma arma existe no catálogo", catalogo.itens.every(function (e) {
        return !e.arma || !e.arma.municao || !!catalogo.porId[e.arma.municao];
      }));
      t.ok("toda incompatibilidade aponta para uma entrada real", catalogo.itens.every(function (e) {
        return (e.incompativel || []).every(function (id) { return !!catalogo.porId[id]; });
      }));
      t.ok("toda modificação e maldição diz onde se aplica", catalogo.itens.every(function (e) {
        return e.natureza === "item" || (e.aplicaEm || []).length > 0;
      }));
      t.ok("toda maldição tem elemento (ou o elemento é escolhido ao aplicar)", catalogo.itens.every(function (e) {
        return e.natureza !== "maldicao" || !!e.elemento || !!(e.escolha && e.escolha.defineElemento);
      }));
      t.ok("o catálogo carregado é congelado, até o fundo", Object.isFrozen(catalogo) && Object.isFrozen(catalogo.itens) &&
        Object.isFrozen(entrada("op.arma.katana")) && Object.isFrozen(entrada("op.arma.katana").arma));
      IT._esquecer();
      var carga = IT.carregar();
      t.ok("carregar() devolve uma promessa e deixa o catálogo pronto", !!carga && typeof carga.then === "function" && !!IT.catalogoPronto());
      t.igual("  com as mesmas 244 entradas", IT.catalogoPronto().itens.length, 244);

      /* Conferência pontual contra as tabelas dos livros. */
      var katana = entrada("op.arma.katana");
      t.iguais("Katana (Tabela 3.3): I, 2 espaços, 1d10, 19/x2, corte, tática de duas mãos, ágil",
        [katana.categoria, katana.espacos, katana.arma.dano, katana.arma.margem, katana.arma.multiplicador, katana.arma.tipoDano,
          katana.arma.proficiencia, katana.arma.empunhadura, katana.arma.agil, katana.fonte, katana.pagina],
        [1, 2, "1d10", 19, 2, "C", "tatica", "duasMaos", true, "OPRPG", 58]);
      var fuzil = entrada("op.arma.fuzil-de-assalto");
      t.iguais("Fuzil de assalto: II, 2 espaços, 2d10, 19/x3, médio, balas longas, automático",
        [fuzil.categoria, fuzil.espacos, fuzil.arma.dano, fuzil.arma.margem, fuzil.arma.multiplicador, fuzil.arma.alcance, fuzil.arma.municao, fuzil.arma.automatica],
        [2, 2, "2d10", 19, 3, "medio", "op.municao.balas-longas", true]);
      var bazuca = entrada("op.arma.bazuca");
      t.iguais("Bazuca: III, 10d8, x2, médio", [bazuca.categoria, bazuca.arma.dano, bazuca.arma.margem, bazuca.arma.multiplicador, bazuca.arma.alcance], [3, "10d8", 20, 2, "medio"]);
      t.iguais("Bastão: 1d6, ou 1d8 com as duas mãos", [entrada("op.arma.bastao").arma.dano, entrada("op.arma.bastao").arma.danoAlternativo.dano], ["1d6", "1d8"]);
      t.igual("Motosserra: −1 dado no teste de ataque", entrada("op.arma.motosserra").arma.dadosAtaque, -1);
      var pesadaCat = entrada("op.protecao.pesada");
      t.iguais("Proteção pesada (Tabela 3.6): +10, II, 5 espaços", [pesadaCat.protecao.defesa, pesadaCat.categoria, pesadaCat.espacos], [10, 2, 5]);
      var escudoCat = entrada("op.protecao.escudo");
      t.iguais("Escudo: +2, I, 2 espaços, tipo escudo", [escudoCat.protecao.defesa, escudoCat.categoria, escudoCat.espacos, escudoCat.protecao.tipo], [2, 1, 2, "escudo"]);
      var curtas = entrada("op.municao.balas-curtas");
      t.iguais("Balas curtas: 0, 1 espaço, pacote que dura 2 cenas", [curtas.categoria, curtas.espacos, curtas.municao.unidade, curtas.municao.duracao], [0, 1, "pacote", "2 cenas"]);
      t.iguais("Foguete: I, dura um disparo", [entrada("op.municao.foguete").categoria, entrada("op.municao.foguete").municao.duracao], [1, "1 disparo"]);
      var dardos = entrada("op.municao.dardos");
      t.ok("caixa de dardos: o livro diz o CONTEÚDO (2 dardos), não uma duração", dardos.municao.conteudo === "2 dardos" && !dardos.municao.duracao);
      t.ok("  e a classificação não fala em \"dura\"", !/dura/.test(dardos.classificacao) && /caixa com 2 dardos/.test(dardos.classificacao));
      var fuzilAlheio = entrada("sah.amaldicoado.fuzil-alheio");
      t.iguais("Fuzil alheio (SAH Tabela 1.6): Energia, IV, 2 espaços", [fuzilAlheio.elemento, fuzilAlheio.categoria, fuzilAlheio.espacos, fuzilAlheio.fonte], ["energia", 4, 2, "SAH"]);
      var jaqueta = entrada("op.amaldicoado.jaqueta-de-verissimo");
      t.iguais("Jaqueta de Veríssimo: categoria IV e item único", [jaqueta.categoria, jaqueta.unico], [4, true]);
      t.iguais("amaldiçoado especial sem indicação: II e 1 espaço (OPRPG p. 148)",
        [entrada("op.amaldicoado.coracao-pulsante").categoria, entrada("op.amaldicoado.coracao-pulsante").espacos], [2, 1]);
      var mochilaCat = entrada("op.geral.mochila-militar");
      t.iguais("Mochila militar: I, sem espaço, +2 de capacidade", [mochilaCat.categoria, mochilaCat.espacos, mochilaCat.capacidade], [1, 0, 2]);
      t.ok("Tábula do saber custoso também é achada como \"Tablet\", o nome da Tabela 1.6",
        IT.filtrar(catalogo, { busca: "tablet do saber" }).some(function (e) { return e.id === "sah.amaldicoado.tabula-do-saber-custoso"; }));
      t.igual("Discreta aparece UMA vez, para armas corpo a corpo, de disparo e de fogo",
        catalogo.itens.filter(function (e) { return e.aba === "armas" && e.nome === "Discreta"; }).length, 1);
      t.ok("  com a divergência entre tabela e texto registrada", entrada("op.mod.arma.discreta").notas.length > 0);

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem · itens — busca e filtros");

      var nomes = function (lista) { return lista.map(function (e) { return e.nome; }); };
      t.ok("busca ignora maiúsculas e acentos: BASTAO acha Bastão", nomes(IT.filtrar(catalogo, { busca: "BASTAO" })).indexOf("Bastão") >= 0);
      t.ok("  \"municao jurada\" acha Munição jurada", nomes(IT.filtrar(catalogo, { busca: "municao jurada" })).indexOf("Munição jurada") >= 0);
      t.ok("  e espaços a mais não atrapalham", nomes(IT.filtrar(catalogo, { busca: "  fuzil   de  assalto " })).indexOf("Fuzil de assalto") >= 0);
      t.iguais("busca sem resultado devolve lista vazia", IT.filtrar(catalogo, { busca: "xyzzy nada" }), []);

      var sahArmas = IT.filtrar(catalogo, { aba: "armas", fonte: "SAH" });
      t.igual("fonte SAH na aba Armas: 11 armas e 1 modificação", sahArmas.length, 12);
      t.ok("  nenhuma do livro básico", sahArmas.every(function (e) { return e.fonte === "SAH"; }));
      var fogo = IT.filtrar(catalogo, { aba: "armas", tipo: "fogo" });
      t.ok("tipo Fogo só traz armas de fogo", fogo.length > 5 && fogo.every(function (e) { return e.arma && e.arma.tipo === "fogo"; }));
      var cat0 = IT.filtrar(catalogo, { aba: "armas", categoria: "0" });
      t.ok("categoria 0 filtra itens de categoria 0 — e deixa modificações de fora", cat0.length > 0 &&
        cat0.every(function (e) { return e.natureza === "item" && e.categoria === 0; }));
      t.igual("categoria \"não informada\" existe e é específica", IT.filtrar(catalogo, { categoria: "nula" }).length, 2);
      var sangue = IT.filtrar(catalogo, { aba: "amaldicoados", elemento: "sangue" });
      t.ok("elemento Sangue na aba Itens Amaldiçoados", sangue.length > 5 && sangue.every(function (e) { return e.elemento === "sangue"; }));
      t.igual("filtros combinados: SAH + categoria III + Conhecimento",
        nomes(IT.filtrar(catalogo, { aba: "amaldicoados", fonte: "SAH", categoria: "3", elemento: "conhecimento" })).sort().join(", "),
        "Câmera obscura, Enxame fantasmagórico");
      var porAba = IT.contagemPorAba(catalogo, { busca: "discret" });
      t.iguais("a contagem por aba acompanha a busca (\"discret\" em Armas, Proteções e Geral)",
        [porAba.armas, porAba.municoes, porAba.protecoes, porAba.geral, porAba.amaldicoados], [1, 0, 1, 1, 0]);
      var opcoesArmas = IT.opcoesDeFiltro(catalogo, "armas");
      t.ok("os filtros de uma aba só oferecem o que existe nela", opcoesArmas.tipos.every(function (o) {
        return ["corpoACorpo", "arremesso", "disparo", "fogo", "distancia", "modificacao"].indexOf(o.valor) >= 0;
      }) && opcoesArmas.elementos.length === 0);
      t.ok("  e a aba de amaldiçoados oferece elementos", IT.opcoesDeFiltro(catalogo, "amaldicoados").elementos.length >= 5);
      var secoesArmas = IT.secoes("armas", IT.filtrar(catalogo, { aba: "armas" }));
      t.iguais("seções de Armas sem abas a mais: simples, táticas, pesadas, modificações",
        secoesArmas.map(function (s) { return s.chave; }), ["simples", "taticas", "pesadas", "modificacoes"]);
      t.ok("  cada seção em ordem alfabética", secoesArmas.every(function (s) {
        return s.entradas.every(function (e, i, l) { return i === 0 || l[i - 1].nome.localeCompare(e.nome, "pt-BR") <= 0; });
      }));
      t.ok("a categoria de navegação (aba) não é a categoria 0–IV: são campos diferentes", catalogo.itens.every(function (e) {
        return typeof e.aba === "string" && (e.categoria === null || typeof e.categoria === "number");
      }));

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem · itens — prévia compacta e detalhes sem campo vazio");

      var semVazio = function (pares) { return pares.every(function (p) { return p[0] && p[1] !== "" && p[1] !== null && p[1] !== undefined && p[1] !== "undefined"; }); };
      t.ok("o resumo compacto de TODAS as entradas não tem valor vazio", catalogo.itens.every(function (e) { return semVazio(IT.resumoCompacto(e)); }));
      t.ok("os detalhes de TODAS as entradas não têm valor vazio", catalogo.itens.every(function (e) { return semVazio(IT.detalhes(e, catalogo)); }));
      t.ok("  e todos dizem a fonte com página", catalogo.itens.every(function (e) {
        return IT.detalhes(e, catalogo).some(function (p) { return p[0] === "Fonte" && /p\. \d+/.test(p[1]); });
      }));
      var rotulosDe = function (pares) { return pares.map(function (p) { return p[0]; }); };
      t.iguais("arma: dano, crítico, alcance e tipo no resumo", rotulosDe(IT.resumoCompacto(entrada("op.arma.fuzil-de-assalto"))), ["Dano", "Crítico", "Alcance", "Tipo"]);
      t.iguais("arma corpo a corpo não mostra alcance vazio", rotulosDe(IT.resumoCompacto(katana)), ["Dano", "Crítico", "Tipo"]);
      var detKatana = rotulosDe(IT.detalhes(katana, catalogo));
      t.ok("detalhes de arma: proficiência, tipo, empunhadura, dano, crítico, alcance, tipo de dano",
        ["Proficiência", "Tipo", "Empunhadura", "Dano", "Crítico", "Alcance", "Tipo de dano"].every(function (r) { return detKatana.indexOf(r) >= 0; }));
      t.iguais("proteção: Defesa no resumo", IT.resumoCompacto(pesadaCat), [["Defesa", "+10"]]);
      t.iguais("munição: duração no resumo", IT.resumoCompacto(curtas), [["Dura", "2 cenas"]]);
      t.ok("munição nos detalhes: unidade, duração e armas", ["Unidade", "Duração", "Usada em"].every(function (r) { return rotulosDe(IT.detalhes(curtas, catalogo)).indexOf(r) >= 0; }));
      t.iguais("modificação: o acréscimo de categoria", IT.resumoCompacto(entrada("op.mod.arma.certeira")), [["Categoria", "+I"]]);
      t.ok("requisitos de arma citam a proficiência", /armas táticas/.test(IT.requisitos(katana).join(" ")));
      t.ok("requisitos de amaldiçoado citam a patente e o preço da maldição", (function () {
        var r = IT.requisitos(entrada("op.amaldicoado.coracao-pulsante")).join(" ");
        return /agente especial/.test(r) && /Preço da maldição/.test(r);
      })());
      t.ok("toda entrada declara o que é automático (calculo, parcial ou texto)", catalogo.itens.every(function (e) {
        var n = IT.naFicha(e);
        return ["calculo", "parcial", "texto"].indexOf(n.automacao) >= 0 && n.texto.length > 10;
      }));
      t.ok("proteção pesada avisa que a resistência a dano é manual", /controle manual/.test(IT.naFicha(pesadaCat).texto));

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem · itens — adicionar cria um item completo");

      var kat = adicionar("op.arma.katana");
      t.igual("arma vira item do tipo arma", kat.tipo, "arma");
      t.iguais("  com dano, crítico e multiplicador nos campos da ficha", [kat.dano, kat.critico, kat.multiplicador, kat.danoExtra], ["1d10", 19, 2, ""]);
      t.iguais("  categoria e espaços de Ordem", [kat.ordem.categoria, kat.ordem.espacos, kat.ordem.quantidade, kat.ordem.grupo], [1, 2, 1, "arma"]);
      t.iguais("  como a arma ataca", [kat.ordem.pericia, kat.ordem.arma.tipo, kat.ordem.arma.proficiencia, kat.ordem.arma.empunhadura, kat.ordem.arma.tipoDano, kat.ordem.arma.agil, kat.ordem.arma.atributoDano],
        ["luta", "corpoACorpo", "tatica", "duasMaos", "Corte", true, "melhor"]);
      t.igual("  com o rastro da origem", kat.origemCatalogoId, "op.arma.katana");
      t.iguais("  a referência do livro", kat.ordem.referencia, { fonte: "OPRPG", pagina: 58 });
      t.igual("  a gaveta (categoria livre) é a aba, não a categoria 0–IV", kat.categoria, "Armas");
      t.ok("  a descrição resume e cita a fonte, dentro do limite", /Fonte: Ordem Paranormal RPG, p\. 58/.test(kat.descricao) && kat.descricao.length <= 2000);
      t.ok("  e tem id próprio", typeof kat.id === "string" && kat.id.length > 8);

      var pistola = adicionar("op.arma.pistola");
      t.iguais("arma de fogo ataca com Pontaria e não soma atributo no dano", [pistola.ordem.pericia, pistola.ordem.arma.atributoDano || ""], ["pontaria", ""]);
      t.igual("  e guarda o NOME da munição, não o id", pistola.ordem.arma.municao, "Balas curtas");

      var balas = adicionar("op.municao.balas-curtas", { quantidade: 3 });
      t.iguais("munição: 3 pacotes, 1 espaço cada, categoria 0, grupo munição", [balas.tipo, balas.ordem.quantidade, balas.ordem.espacos, balas.ordem.categoria, balas.ordem.grupo],
        ["item", 3, 1, 0, "municao"]);
      t.ok("  sem virar contagem de balas", JSON.stringify(balas).indexOf("contagem") < 0 && !("balas" in balas.ordem));
      t.igual("  marcada como balas (para Dum dum e Explosiva)", (balas.ordem.marcadores || []).join(","), "balas");

      var leve = adicionar("op.protecao.leve");
      t.iguais("proteção: armadura com Defesa +5 e tipo leve", [leve.tipo, leve.defesa, leve.ordem.protecao.tipo], ["armadura", 5, "leve"]);
      t.ok("  e entra GUARDADA: adicionar não é vestir", leve.ordem.emUso !== true);

      var mochila = adicionar("op.geral.mochila-militar");
      t.iguais("equipamento geral: capacidade da mochila militar", [mochila.tipo, mochila.ordem.capacidade, mochila.ordem.espacos], ["item", 2, 0]);

      t.ok("kit de perícia sem a perícia escolhida é recusado", !IT.paraInventario(entrada("op.geral.kit-de-pericia"), {}).ok);
      t.ok("  perícia fora da lista também", !IT.paraInventario(entrada("op.geral.kit-de-pericia"), { escolha: "luta" }).ok);
      var kitMed = adicionar("op.geral.kit-de-pericia", { escolha: "medicina" });
      t.igual("  com Medicina, o nome leva a escolha", kitMed.nome, "Kit de perícia (Medicina)");

      var scanner = adicionar("op.paranormal.scanner", { escolha: "sangue" });
      t.iguais("item de (elemento): o elemento entra no nome e nos dados", [scanner.nome, scanner.ordem.elemento], ["Scanner de manifestação paranormal de Sangue", "sangue"]);

      var coracao = adicionar("op.amaldicoado.coracao-pulsante");
      t.iguais("amaldiçoado: marcado, com elemento, categoria II", [coracao.ordem.amaldicoado, coracao.ordem.elemento, coracao.ordem.categoria, coracao.ordem.grupo],
        [true, "sangue", 2, "amaldicoado"]);
      var selo = adicionar("op.amaldicoado.selos-paranormais", { escolha: "3" });
      t.igual("selo paranormal de 3º círculo: categoria III (a do círculo)", selo.ordem.categoria, 3);
      var arcabuz = adicionar("op.amaldicoado.arcabuz-dos-moretti");
      t.iguais("Arcabuz dos Moretti: tabela de 1d6, +2 no ataque, sem munição",
        [arcabuz.ordem.arma.danoPorD6.length, arcabuz.ordem.arma.bonusAtaque, arcabuz.ordem.arma.semMunicao, arcabuz.dano], [6, 2, true, ""]);

      t.ok("modificação não entra no inventário como item", !IT.paraInventario(entrada("op.mod.arma.certeira"), {}).ok);
      t.ok("maldição também não", !IT.paraInventario(entrada("op.maldicao.arma.predadora"), {}).ok);
      t.igual("quantidade 0 vira 1", adicionar("op.municao.balas-curtas", { quantidade: 0 }).ordem.quantidade, 1);
      t.igual("quantidade absurda para em 999", adicionar("op.municao.balas-curtas", { quantidade: 5000 }).ordem.quantidade, 999);

      var todosMontam = catalogo.itens.filter(function (e) { return e.natureza === "item"; }).every(function (e) {
        var escolha = e.escolha ? (IT.opcoesDaEscolha(e.escolha)[0] || { valor: "texto livre" }).valor : undefined;
        var r = IT.paraInventario(e, { escolha: escolha, catalogo: catalogo });
        if (!r.ok) return false;
        var item = FI.normalizarItem(FI.criarItem(r.tipo, r.dados));
        var d = II.dadosDoItem(item);
        return item.nome && item.origemCatalogoId === e.id && d.categoria === (e.escolha && e.escolha.tipo === "circulo" ? 1 : e.categoria) &&
          (e.espacos === null ? d.espacos === null : d.espacos === e.espacos);
      });
      t.ok("TODOS os itens do catálogo viram item de ficha com categoria e espaços do livro", todosMontam);

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem · itens — cópia independente (snapshot)");

      var k1 = adicionar("op.arma.katana");
      var k2 = adicionar("op.arma.katana");
      t.ok("duas inclusões do mesmo item: dois itens, ids diferentes", k1.id !== k2.id && k1.origemCatalogoId === k2.origemCatalogoId);
      k1.dano = "9d9";
      k1.ordem.arma.tipoDano = "Corte (afiada)";
      k1.ordem.categoria = 3;
      t.iguais("editar a cópia não muda a outra cópia", [k2.dano, k2.ordem.arma.tipoDano, k2.ordem.categoria], ["1d10", "Corte", 1]);
      t.iguais("  nem o catálogo", [entrada("op.arma.katana").arma.dano, entrada("op.arma.katana").arma.tipoDano, entrada("op.arma.katana").categoria], ["1d10", "C", 1]);
      t.ok("o catálogo recusa alteração direta", (function () {
        try { entrada("op.arma.katana").arma.dano = "1d4"; } catch (e) { /* modo estrito lança */ }
        return entrada("op.arma.katana").arma.dano === "1d10";
      })());
      var dadosNovos = JSON.parse(JSON.stringify(global.RAMAOrdemItensDados));
      dadosNovos.itens.forEach(function (e) { if (e.id === "op.arma.katana") { e.arma.dano = "2d12"; e.categoria = "IV"; } });
      var catalogoNovo = IT.normalizarCatalogo(dadosNovos);
      t.igual("um catálogo corrigido depois não muda item já adicionado", (catalogoNovo.porId["op.arma.katana"].arma.dano !== k2.dano) && k2.dano, "1d10");
      var k2lido = FI.normalizarItem(JSON.parse(JSON.stringify(k2)));
      t.iguais("salvar e reabrir preserva a cópia inteira", [k2lido.id, k2lido.origemCatalogoId, k2lido.ordem.arma.agil, k2lido.ordem.pericia, k2lido.ordem.referencia.pagina],
        [k2.id, "op.arma.katana", true, "luta", 58]);
      t.igual("o item salvo não carrega o catálogo junto (só a própria cópia)", JSON.stringify(k2lido).length < 2600, true);

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem · itens — arma usa os controles de ataque e dano");

      var lutador = agenteDeItens();
      var armaDe = function (item, ficha, extra) { return RI.armaEfetiva(ficha || lutador, inv([item].concat(extra || [])), item); };
      var kataNova = adicionar("op.arma.katana");
      var ek = armaDe(kataNova);
      t.iguais("Katana: Luta, Força 2 → 2d20, +5 de treinado", [ek.pericia, ek.periciaNome, ek.dado, ek.ataque.total], ["luta", "Luta", "2d20", 5]);
      t.iguais("  dano 1d10 + Força 2, margem 19, x2", [ek.dano, ek.extra.total, ek.margem, ek.multiplicador], ["1d10", 2, 19, 2]);
      t.ok("  o dado é uma expressão que o motor de dados aceita", !global.RAMADados || global.RAMADados.analisar(ek.dado).ok);
      var agil = agenteDeItens({ atributos: { agi: 4, for: 1, int: 1, pre: 1, vig: 1 } });
      var ekAgil = armaDe(kataNova, agil);
      t.iguais("arma ágil com Agilidade maior: 4d20 e Agilidade no dano", [ekAgil.dado, ekAgil.agilNoTeste, ekAgil.extra.total, ekAgil.extra.parcelas[0].rotulo], ["4d20", true, 4, "Agilidade"]);
      var ep = armaDe(adicionar("op.arma.pistola"));
      t.iguais("Pistola: Pontaria, sem atributo no dano, margem 18", [ep.pericia, ep.extra.total, ep.margem], ["pontaria", 0, 18]);
      var em = armaDe(adicionar("op.arma.motosserra"));
      t.igual("Motosserra: Força 2 com −1 dado → 1d20", em.dado, "1d20");
      var eb = armaDe(adicionar("op.arma.bastao"));
      t.iguais("Bastão: dano normal e o alternativo com as duas mãos", [eb.dano, eb.alternativo.dano, eb.alternativo.rotulo], ["1d6", "1d8", "duas mãos"]);
      var ea = armaDe(adicionar("op.amaldicoado.arcabuz-dos-moretti"));
      t.iguais("Arcabuz: tabela de 1d6 e +2 como parcela do ataque", [ea.tabelaD6.join(" "), ea.ataque.total, ea.ataque.parcelas.some(function (p) { return p.valor === 2; })],
        ["2d4 2d6 2d8 2d10 2d12 2d20", 7, true]);

      var modificada = adicionar("op.arma.katana");
      aplicarEm("op.mod.arma.certeira", modificada);
      aplicarEm("op.mod.arma.cruel", modificada);
      var emod = armaDe(modificada);
      t.iguais("Certeira +2 no ataque e Cruel +2 no dano, como parcelas", [emod.ataque.total, emod.extra.total], [7, 4]);
      var perigosa = adicionar("op.arma.katana");
      aplicarEm("op.mod.arma.perigosa", perigosa);
      t.igual("Perigosa: margem 19 vira 17", armaDe(perigosa).margem, 17);
      var predadora = adicionar("op.arma.katana");
      aplicarEm("op.maldicao.arma.predadora", predadora);
      t.igual("Predadora dobra a margem: 19 vira 17", armaDe(predadora).margem, 17);
      aplicarEm("op.mod.arma.perigosa", predadora);
      t.igual("  e dobra ANTES dos aumentos: com Perigosa, 15", armaDe(predadora).margem, 15);
      var cacador = adicionar("op.arma.fuzil-de-caca");
      aplicarEm("op.maldicao.arma.predadora", cacador);
      t.iguais("fuzil de caça predador: margem 17 e alcance médio vira longo (OPRPG p. 146)", [armaDe(cacador).margem, armaDe(cacador).alcance], [17, "longo"]);
      var calibre = adicionar("op.arma.fuzil-de-assalto");
      aplicarEm("op.mod.arma.calibre-grosso", calibre);
      t.igual("Calibre grosso: 2d10 vira 3d10", armaDe(calibre).dano, "3d10");
      var ferrolho = adicionar("op.arma.pistola");
      aplicarEm("op.mod.arma.ferrolho-automatico", ferrolho);
      t.ok("Ferrolho automático marca a arma como automática", armaDe(ferrolho).automatica);
      t.ok("  e não se aplica de novo numa arma que já é automática",
        !IT.podeAplicar(entrada("op.mod.arma.ferrolho-automatico"), adicionar("op.arma.submetralhadora")).ok);

      var semPericia = FI.criarItem("arma", { nome: "Arma antiga", dano: "2d10", critico: 19, multiplicador: 3, ordem: { espacos: 2, categoria: 2 } });
      t.ok("arma antiga sem perícia: o botão avisa em vez de adivinhar", armaDe(semPericia).pericia === "" && /Escolha a perícia/.test(armaDe(semPericia).avisos[0]));
      var antiga = FI.criarItem("arma", { nome: "Rifle antigo", dano: "2d8", periciaId: "u-pontaria" });
      t.igual("arma antiga com perícia da lista universal chamada Pontaria ataca com Pontaria",
        RI.armaEfetiva(lutador, inv([antiga]), antiga, [{ id: "u-pontaria", nome: "Pontaria" }]).pericia, "pontaria");
      t.igual("  e o dano extra digitado à mão continua valendo", RI.armaEfetiva(lutador, inv([antiga]), FI.criarItem("arma", { nome: "X", dano: "1d6", danoExtra: "2" })).danoExtraManual, "2");
      var ocultista = agenteDeItens({ classe: "ocultista" });
      t.igual("proficiência: ocultista com arma tática recebe AVISO", RI.proficienciaDaArma(ocultista, kataNova).proficiente, false);
      t.igual("  combatente é proficiente", RI.proficienciaDaArma(lutador, kataNova).proficiente, true);

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem · itens — proteção equipada muda a Defesa");

      var def = function (ficha, itens) { return RI.defesa(ficha, inv(itens)).total; };
      var semNada = def(lutador, []);
      var leveUso = adicionar("op.protecao.leve");
      var escudoUso = adicionar("op.protecao.escudo");
      t.igual("proteção adicionada e guardada não muda a Defesa", def(lutador, [leveUso]), semNada);
      leveUso.ordem.emUso = true;
      t.igual("em uso, soma +5", def(lutador, [leveUso]), semNada + 5);
      escudoUso.ordem.emUso = true;
      t.igual("o escudo em uso acumula com a proteção: +7", def(lutador, [leveUso, escudoUso]), semNada + 7);
      var pesadaUso = adicionar("op.protecao.pesada");
      pesadaUso.ordem.emUso = true;
      pesadaUso.ordem.espacos = 0;
      t.igual("duas vestidas em uso: vale a maior (+10), e o escudo continua (+12)", def(lutador, [leveUso, pesadaUso, escudoUso]), semNada + 12);
      var acrobacia = function (itens) { return RI.bonusDePericia(lutador, "acrobacia", inv(itens)); };
      t.igual("proteção pesada em uso: −5 nas perícias de carga", acrobacia([pesadaUso]).total, -5);
      t.igual("  mas não em Luta", RI.bonusDePericia(lutador, "luta", inv([pesadaUso])).total, 5);
      pesadaUso.ordem.emUso = false;
      t.igual("  e guardada, nada", acrobacia([pesadaUso]).total, 0);
      var reforcada = adicionar("op.protecao.leve");
      aplicarEm("op.mod.protecao.reforcada", reforcada);
      reforcada.ordem.emUso = true;
      t.igual("Reforçada: +2 na Defesa da proteção em uso", def(lutador, [reforcada]), semNada + 7);
      t.igual("  +1 espaço por unidade", RI.itensEfetivos(lutador, inv([reforcada])).porId[reforcada.id].espacos.total, 3);
      t.ok("  e não combina com Discreta", !IT.podeAplicar(entrada("op.mod.protecao.discreta"), reforcada).ok);
      t.igual("o valor-base da proteção continua 5 no item", reforcada.defesa, 5);

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem · itens — modificações e maldições entram uma vez");

      var base = adicionar("op.arma.katana");
      var efCat = function (item, ficha, extra) { return RI.itensEfetivos(ficha || lutador, inv([item].concat(extra || []))).porId[item.id].categoria; };
      t.ok("aplicar Certeira: categoria efetiva II", aplicarEm("op.mod.arma.certeira", base).ok && efCat(base).efetiva === 2);
      t.igual("  o valor-base continua I no item", base.ordem.categoria, 1);
      t.igual("  recalcular não soma de novo", (efCat(base), efCat(base), efCat(base).efetiva), 2);
      var relida = FI.normalizarItem(JSON.parse(JSON.stringify(base)));
      t.igual("  salvar e reabrir também não", efCat(relida).efetiva, 2);
      var segunda = aplicarEm("op.mod.arma.certeira", base);
      t.ok("a mesma modificação duas vezes é recusada", !segunda.ok && /não se acumulam/.test(segunda.motivo));
      t.ok("maldição de Sangue: +II (a primeira)", aplicarEm("op.maldicao.arma.predadora", base).ok && efCat(base).efetiva === 4);
      var senciente = aplicarEm("op.maldicao.arma.senciente", base);
      t.ok("maldição de elemento opressor (Conhecimento contra Sangue) é recusada", !senciente.ok && /opressores/.test(senciente.motivo));
      t.ok("segunda maldição compatível (Energia) soma só +I: acima de IV", aplicarEm("op.maldicao.arma.empuxo", base).ok && efCat(base).efetiva === 5);
      t.ok("  e acima de IV fica fora dos limites, com aviso", RI.itensEfetivos(lutador, inv([base])).acimaDeIV.length === 1 && efCat(base).acimaDeIV);
      var idCerteira = base.ordem.modificacoes.filter(function (m) { return m.catalogoId === "op.mod.arma.certeira"; })[0].id;
      t.ok("remover a Certeira desfaz só a parte dela", IT.remover(base, idCerteira) && efCat(base).efetiva === 4);
      base.ordem.modificacoes.slice().forEach(function (m) { IT.remover(base, m.id); });
      t.ok("sem modificações: volta ao valor-base e some a lista", efCat(base).efetiva === 1 && !("modificacoes" in base.ordem));

      var alongadaNaKatana = IT.podeAplicar(entrada("op.mod.arma.alongada"), adicionar("op.arma.katana"));
      t.ok("modificação de arma de fogo numa arma corpo a corpo: recusada com motivo", !alongadaNaKatana.ok && /armas de fogo/.test(alongadaNaKatana.motivo));
      t.ok("modificação de proteção numa arma: recusada", !IT.podeAplicar(entrada("op.mod.protecao.reforcada"), adicionar("op.arma.katana")).ok);
      var desconhecida = IT.podeAplicar(entrada("op.mod.arma.alongada"), FI.criarItem("arma", { nome: "Arma caseira" }));
      t.ok("arma feita à mão, sem tipo: aplica com aviso para a mesa conferir", desconhecida.ok && !!desconhecida.aviso);
      t.ok("Dum dum aplica em balas curtas", IT.podeAplicar(entrada("op.mod.municao.dum-dum"), adicionar("op.municao.balas-curtas")).ok);
      t.ok("  e não em cartuchos", !IT.podeAplicar(entrada("op.mod.municao.dum-dum"), adicionar("op.municao.cartuchos")).ok);
      var lente = adicionar("op.paranormal.camera-de-aura");
      t.ok("modificação sem acréscimo informado (Lente de revelação) não muda a categoria",
        aplicarEm("sah.mod.paranormal.lente-de-revelacao", lente).ok && efCat(lente).efetiva === lente.ordem.categoria);
      var utensilio = adicionar("op.geral.utensilio", { escolha: "ciencias" });
      t.ok("Aprimorado só se repete com Função adicional", aplicarEm("op.mod.acessorio.aprimorado", utensilio).ok &&
        !aplicarEm("op.mod.acessorio.aprimorado", utensilio).ok &&
        aplicarEm("op.mod.acessorio.funcao-adicional", utensilio).ok &&
        aplicarEm("op.mod.acessorio.aprimorado", utensilio).ok);

      /* A Mochila de Utilidades (habilidade) e as modificações juntas:
         cada uma entra uma vez. */
      var espec = RI.fichaVazia();
      espec.classe = "especialista";
      espec.nex = 15;
      espec.atributos = { agi: 1, for: 2, int: 1, pre: 1, vig: 1 };
      /* A Mochila não vale para armas (OPRPG p. 29): uma proteção leve. */
      var kitDiscreto = adicionar("op.protecao.leve");
      aplicarEm("op.mod.protecao.discreta", kitDiscreto);
      if (global.RAMAOrdemProgressao) {
        var vaga = global.RAMAOrdemProgressao.vagas(espec).filter(function (v) { return v.id === "d3.poderClasse"; })[0];
        global.RAMAOrdemProgressao.registrar(espec, vaga, { valor: "mochilaDeUtilidades", opcoes: { item: kitDiscreto.id } });
        var efMochila = RI.itensEfetivos(espec, inv([kitDiscreto])).porId[kitDiscreto.id];
        t.iguais("proteção leve (I, 2 espaços) com Discreta (+I, −1) e Mochila de Utilidades (−I, −1): I e 0 espaços",
          [efMochila.categoria.efetiva, efMochila.espacos.total], [1, 0]);
        t.igual("  e continua igual depois de recalcular", RI.itensEfetivos(espec, inv([kitDiscreto])).porId[kitDiscreto.id].espacos.total, 0);
      }

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem · itens — carga, quantidade e categorias");

      var mochilaCarga = adicionar("op.geral.mochila-militar");
      var katanaCarga = adicionar("op.arma.katana");
      var balasCarga = adicionar("op.municao.balas-curtas", { quantidade: 3 });
      var pesadaCarga = adicionar("op.protecao.pesada");
      var invCarga = inv([mochilaCarga, katanaCarga, balasCarga, pesadaCarga]);
      var capCarga = RI.capacidade(lutador, invCarga);
      t.igual("Katana 2 + três pacotes de balas 3 + proteção pesada 5 + mochila 0 = 10 espaços", capCarga.ocupado, 10);
      t.igual("a mochila militar soma +2 na capacidade (Força 2: 10 + 2)", capCarga.calculada, 12);
      var usoCarga = RI.usoPorCategoria(lutador, invCarga);
      t.iguais("por categoria: 0 → 3 pacotes; I → Katana e mochila; II → proteção pesada",
        [usoCarga.categorias[0].usados, usoCarga.categorias[1].usados, usoCarga.categorias[2].usados], [3, 2, 1]);
      t.igual("o cabeçalho e a carga leem a mesma conta", RI.itensEfetivos(lutador, invCarga).ocupado, capCarga.ocupado);
      var compacto = adicionar("sah.arma.revolver-compacto", {});
      var crimeTreinado = agenteDeItens({ pericias: { luta: "treinado", crime: "treinado" } });
      t.iguais("Revólver compacto: treinado em Crime, uma unidade não ocupa espaço (SAH p. 37)",
        [RI.itensEfetivos(lutador, inv([compacto])).ocupado, RI.itensEfetivos(crimeTreinado, inv([compacto])).ocupado], [1, 0]);

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem · itens — persistência, importação e exportação");

      var fichaCompleta = FI.criarFicha({ nome: "Com catálogo", tipoFicha: "ordem" });
      fichaCompleta.ordem = agenteDeItens();
      var kExp = adicionar("op.arma.katana");
      aplicarEm("op.maldicao.arma.predadora", kExp);
      var pExp = adicionar("op.protecao.leve");
      aplicarEm("op.mod.protecao.reforcada", pExp);
      pExp.ordem.emUso = true;
      fichaCompleta.inventario.itens = [kExp, pExp, adicionar("op.municao.balas-curtas", { quantidade: 2 }),
        FI.criarItem("item", { nome: "Corda à mão", ordem: { espacos: 1, categoria: 0 } })];
      var reaberta = FI.normalizarFicha(JSON.parse(JSON.stringify(fichaCompleta)));
      var resumoMecanico = function (f) {
        return {
          defesa: RI.defesa(f.ordem, f.inventario).total,
          ocupado: RI.itensEfetivos(f.ordem, f.inventario).ocupado,
          categorias: f.inventario.itens.map(function (i) { return RI.itensEfetivos(f.ordem, f.inventario).porId[i.id].categoria.efetiva; }),
          margem: RI.armaEfetiva(f.ordem, f.inventario, f.inventario.itens[0]).margem,
          origens: f.inventario.itens.map(function (i) { return i.origemCatalogoId || null; }),
          mods: f.inventario.itens.map(function (i) { return ((i.ordem || {}).modificacoes || []).map(function (m) { return m.catalogoId; }).join(","); }),
        };
      };
      t.iguais("salvar e reabrir: mesmos valores efetivos, origens e modificações", resumoMecanico(reaberta), resumoMecanico(fichaCompleta));
      t.ok("  e a proteção continua em uso", reaberta.inventario.itens[1].ordem.emUso === true);
      if (V) {
        var imp = V.importado(JSON.parse(JSON.stringify(V.exportar("personagem", fichaCompleta))));
        t.ok("exportar e importar a ficha com itens do catálogo", imp.ok);
        t.iguais("  com os mesmos números", resumoMecanico(imp.dados), resumoMecanico(fichaCompleta));
        t.ok("  itens e modificações ganham ids novos (quem importa recebe registro próprio)",
          imp.dados.inventario.itens.every(function (i, n) { return i.id && i.id !== fichaCompleta.inventario.itens[n].id; }) &&
          imp.dados.inventario.itens[0].ordem.modificacoes[0].id && imp.dados.inventario.itens[0].ordem.modificacoes[0].id !== kExp.ordem.modificacoes[0].id);
        var pacoteItem = V.exportar("homebrew-item", kExp);
        var impItem = V.importado(JSON.parse(JSON.stringify(pacoteItem)));
        t.ok("um item do catálogo exportado sozinho também importa", impItem.ok && impItem.dados.ordem.arma.agil === true);
      }
      var lixo = FI.normalizarItem({ id: "x", tipo: "arma", nome: "Estranha", ordem: {
        arma: { tipo: "laser", proficiencia: "divina", agil: "sim", municao: "<b>balas</b>" },
        modificacoes: [{ nome: "" }, { nome: "Certeira", calculo: { ataque: 9999, margem: "abc" } }],
      } });
      t.ok("dados de arma fora do esperado são descartados na leitura", !lixo.ordem.arma || (lixo.ordem.arma.tipo === undefined && lixo.ordem.arma.proficiencia === undefined && lixo.ordem.arma.agil === undefined));
      t.ok("modificação sem nome some; número absurdo não passa", lixo.ordem.modificacoes.length === 1 &&
        !(lixo.ordem.modificacoes[0].calculo && lixo.ordem.modificacoes[0].calculo.ataque === 9999));
      var muitas = { id: "y", tipo: "arma", nome: "Cheia", ordem: { modificacoes: [] } };
      for (var mm = 0; mm < 30; mm++) muitas.ordem.modificacoes.push({ nome: "M" + mm });
      t.igual("no máximo 12 modificações por item", FI.normalizarItem(muitas).ordem.modificacoes.length, 12);

      var universalItens = FI.normalizarFicha({ nome: "Universal", inventario: { itens: [{ id: "u1", tipo: "arma", nome: "Facão", dano: "1d8", critico: 19, multiplicador: 2, peso: 2 }] } });
      t.ok("ficha universal: arma continua sem bloco de Ordem", universalItens.inventario.itens[0].ordem === undefined);
      t.ok("  e sem rastro de catálogo", !("origemCatalogoId" in universalItens.inventario.itens[0]));
      var legado = FI.normalizarItem({ id: "o-1", tipo: "arma", nome: "Fuzil de assalto", dano: "2d10", critico: 19, multiplicador: 3,
        ordem: { espacos: 2, quantidade: 1, categoria: 2, grupo: "arma" } });
      t.iguais("item de Ordem anterior à biblioteca abre igual", [legado.ordem.categoria, legado.ordem.espacos, legado.dano, "arma" in legado.ordem, "origemCatalogoId" in legado],
        [2, 2, "2d10", false, false]);
    }

    /* =================================================================
       ORDEM — BIBLIOTECA DE RITUAIS (v2.14)
       -----------------------------------------------------------------
       O catálogo dos dois livros como dado, a busca, a cópia que vira
       ritual de ficha — com campos e versões preenchidos — e a prova de
       que adicionar NÃO conjura: nenhum PE some, nenhum dado rola.
       ================================================================= */

    if (global.RAMAOrdemRituais && global.RAMAOrdemRituaisDados && global.RAMAFicha) {
      var RS = global.RAMAOrdemRituais;
      var FR = global.RAMAFicha;
      var catalogoR = RS.normalizarCatalogo(global.RAMAOrdemRituaisDados);
      var ritual = function (id) { return catalogoR.porId[id]; };
      var adicionarRitual = function (id, opcoes) {
        var r = RS.paraFicha(ritual(id), opcoes || {});
        if (!r.ok) throw new Error("não montou " + id + ": " + r.mensagem);
        return FR.criarRitual(r.dados);
      };

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem · rituais — catálogo completo e estruturado");

      t.igual("98 rituais nos dois livros", catalogoR.rituais.length, 98);
      var porFonte = {};
      var porElemento = {};
      var porCirculo = {};
      catalogoR.rituais.forEach(function (e) {
        porFonte[e.fonte] = (porFonte[e.fonte] || 0) + 1;
        porCirculo[e.circulo] = (porCirculo[e.circulo] || 0) + 1;
        e.elementos.forEach(function (el) { porElemento[el] = (porElemento[el] || 0) + 1; });
      });
      t.igual("82 do livro básico", porFonte.OPRPG, 82);
      t.igual("16 do Sobrevivendo ao Horror", porFonte.SAH, 16);
      t.iguais("por círculo: 30, 26, 22 e 20", [porCirculo[1], porCirculo[2], porCirculo[3], porCirculo[4]], [30, 26, 22, 20]);
      t.iguais("por elemento (Amaldiçoar Arma conta nos quatro em que o livro a coloca)",
        [porElemento.conhecimento, porElemento.energia, porElemento.morte, porElemento.sangue, porElemento.medo],
        [23, 23, 23, 23, 9]);

      var idsR = {};
      var repetidoR = "";
      catalogoR.rituais.forEach(function (e) { if (idsR[e.id]) repetidoR = e.id; idsR[e.id] = true; });
      t.igual("nenhum id se repete", repetidoR, "");
      t.ok("todo id é estável e diz a fonte", catalogoR.rituais.every(function (e) {
        return /^(op|sah)\.ritual\.[a-z0-9-]+$/.test(e.id) && (e.fonte === "SAH") === (e.id.indexOf("sah.") === 0);
      }));
      t.ok("toda entrada tem nome, resumo, elemento, círculo, execução, alcance, fonte e página",
        catalogoR.rituais.every(function (e) {
          return e.nome && e.resumo && e.elementos.length && e.circulo >= 1 && e.circulo <= 4 &&
            e.execucao && e.alcance && (e.fonte === "OPRPG" || e.fonte === "SAH") && e.pagina > 0;
        }));
      t.ok("onde a duração falta, é porque o livro não informa — e a entrada registra isso",
        catalogoR.rituais.filter(function (e) { return !e.duracao; }).every(function (e) {
          return e.notas.some(function (n) { return /não informa a duração/.test(n); });
        }));
      t.igual("  e isso acontece em um ritual só", catalogoR.rituais.filter(function (e) { return !e.duracao; }).length, 1);
      t.ok("o alcance só falta onde o livro não informa", catalogoR.rituais.filter(function (e) { return !e.alcance; }).length === 0);
      t.ok("alvo, área e efeito são campos diferentes, e cada ritual usa UM (ou nenhum)",
        catalogoR.rituais.every(function (e) {
          var quantos = [e.alvo, e.area, e.efeito].filter(Boolean).length;
          return quantos <= 1 || e.id === "op.ritual.dissipar-ritual";
        }));
      t.ok("Dissipar Ritual é a exceção do livro (“Alvo ou Área”), e diz isso na nota",
        !!ritual("op.ritual.dissipar-ritual").alvo && !!ritual("op.ritual.dissipar-ritual").area &&
        ritual("op.ritual.dissipar-ritual").notas.length > 0);
      t.ok("o custo da forma básica vem da tabela do círculo (1, 3, 6, 10)",
        catalogoR.rituais.every(function (e) { return e.custo === { 1: 1, 2: 3, 3: 6, 4: 10 }[e.circulo]; }));
      t.ok("toda entrada tem a versão básica na frente, e só ela sem custo adicional",
        catalogoR.rituais.every(function (e) {
          return e.versoes[0].basica && e.versoes[0].custo === 0 &&
            e.versoes.slice(1).every(function (v) { return !v.basica; });
        }));
      t.ok("o total de cada versão é o básico mais o acréscimo — nunca somado duas vezes",
        catalogoR.rituais.every(function (e) {
          return e.versoes.every(function (v) { return v.custoTotal === e.custo + v.custo; });
        }));
      t.ok("nenhuma versão inventa expressão de dados", catalogoR.rituais.every(function (e) {
        return e.versoes.every(function (v) {
          return (!v.dano || /^\d{1,3}d\d{1,3}$/.test(v.dano)) &&
            v.rolagens.every(function (r) { return !r.expressao || /^\d{1,3}d\d{1,3}$/.test(r.expressao); });
        });
      }));
      t.ok("o catálogo é congelado, até o fundo", Object.isFrozen(catalogoR) && Object.isFrozen(catalogoR.rituais) &&
        Object.isFrozen(ritual("op.ritual.cicatrizacao")) && Object.isFrozen(ritual("op.ritual.cicatrizacao").versoes[0]));
      RS._esquecer();
      var cargaR = RS.carregar();
      t.ok("carregar() devolve promessa e deixa o catálogo pronto", !!cargaR && typeof cargaR.then === "function" && !!RS.catalogoPronto());

      /* Conferência pontual contra as páginas dos livros. */
      var cica = ritual("op.ritual.cicatrizacao");
      t.iguais("Cicatrização (OPRPG p. 126): Morte, 1º círculo, 1 PE, toque, instantânea",
        [cica.elemento, cica.circulo, cica.custo, cica.execucao, cica.alcance, cica.alvo, cica.duracao, cica.fonte, cica.pagina],
        ["morte", 1, 1, "padrão", "toque", "1 ser", "instantânea", "OPRPG", 126]);
      t.iguais("  e a cura de cada versão: 3d8+3, 5d8+5, 7d8+7",
        cica.versoes.map(function (v) { return v.rolagens[0].expressao + "+" + v.rolagens[0].extra; }),
        ["3d8+3", "5d8+5", "7d8+7"]);
      t.iguais("  com custo total 1, 3 e 10 PE", cica.versoes.map(function (v) { return v.custoTotal; }), [1, 3, 10]);
      t.ok("  e a cura é CURA, não dano", cica.versoes.every(function (v) { return v.rolagens[0].tipo === "cura" && !v.dano; }));

      var amaldicoar = ritual("op.ritual.amaldicoar-arma");
      t.iguais("Amaldiçoar Arma existe em quatro elementos", amaldicoar.elementos, ["conhecimento", "energia", "morte", "sangue"]);
      t.ok("  e pede o elemento ao adicionar", amaldicoar.escolha && amaldicoar.escolha.tipo === "elemento");
      var esfolar = ritual("sah.ritual.esfolar");
      t.iguais("Esfolar (SAH p. 48): Sangue, 1º círculo, dano 3d4+3, Reflexos parcial",
        [esfolar.elemento, esfolar.circulo, esfolar.versoes[0].dano, esfolar.versoes[0].danoExtra, esfolar.resistencia],
        ["sangue", 1, "3d4", "3", "Reflexos parcial"]);
      t.igual("Presença do Medo é de Medo e 4º círculo", ritual("op.ritual.presenca-do-medo").elemento + "/" + ritual("op.ritual.presenca-do-medo").circulo, "medo/4");
      t.ok("Deflagração de Energia não finge que 3d10 x 10 é uma expressão de dado",
        ritual("op.ritual.deflagracao-de-energia").versoes[0].rolagens[0].expressao === "3d10" &&
        ritual("op.ritual.deflagracao-de-energia").notas.some(function (n) { return /multiplica/.test(n); }));
      t.ok("Milagre Ionizante registra a divergência do círculo impresso no SAH",
        ritual("sah.ritual.milagre-ionizante").notas.some(function (n) { return /ENERGIA 3/.test(n); }));
      t.ok("rituais sem nenhuma rolagem existem e são válidos",
        catalogoR.rituais.filter(function (e) {
          return e.versoes.every(function (v) { return !v.dano && !v.rolagens.length; });
        }).length > 20);
      t.ok("toda forma avançada diz o que muda", catalogoR.rituais.every(function (e) {
        return e.versoes.slice(1).every(function (v) { return !!v.alteracoes; });
      }));

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem · rituais — busca e filtros");

      var nomesR = function (lista) { return lista.map(function (e) { return e.nome; }); };
      t.ok("busca ignora acento e caixa: CICATRIZACAO acha Cicatrização",
        nomesR(RS.filtrar(catalogoR, { busca: "CICATRIZACAO" })).indexOf("Cicatrização") >= 0);
      t.iguais("busca sem resultado devolve lista vazia", RS.filtrar(catalogoR, { busca: "xyzzy" }), []);
      var sangue2 = RS.filtrar(catalogoR, { elemento: "sangue", circulo: 2 });
      t.ok("elemento + círculo se combinam", sangue2.length === 6 &&
        sangue2.every(function (e) { return e.elementos.indexOf("sangue") >= 0 && e.circulo === 2; }));
      t.ok("o filtro de elemento acha o ritual multielemento",
        RS.filtrar(catalogoR, { elemento: "morte" }).some(function (e) { return e.id === "op.ritual.amaldicoar-arma"; }) &&
        RS.filtrar(catalogoR, { elemento: "sangue" }).some(function (e) { return e.id === "op.ritual.amaldicoar-arma"; }));
      t.igual("filtro de livro: 16 no Sobrevivendo ao Horror", RS.filtrar(catalogoR, { fonte: "SAH" }).length, 16);
      t.igual("elemento + círculo + livro juntos",
        nomesR(RS.filtrar(catalogoR, { elemento: "morte", circulo: 4, fonte: "OPRPG" })).sort().join(", "),
        "Convocar o Algoz, Distorção Temporal, Fim Inevitável");
      t.igual("  e a busca entra na mesma combinação",
        nomesR(RS.filtrar(catalogoR, { busca: "fim", elemento: "morte", circulo: 4, fonte: "OPRPG" })).join(", "),
        "Fim Inevitável");
      var contagens = RS.contagens(catalogoR, { elemento: "sangue" });
      t.igual("a contagem de círculos respeita o elemento escolhido", contagens.circulos[2], 6);
      t.igual("  e a de elementos ignora o próprio filtro de elemento", contagens.elementos.morte, 23);
      t.iguais("as duas fontes aparecem no catálogo", RS.fontesDoCatalogo(catalogoR).sort(), ["OPRPG", "SAH"]);
      var grupos = RS.porCirculo(RS.filtrar(catalogoR, { elemento: "medo" }));
      t.iguais("agrupado por círculo, com o custo de cada um",
        grupos.map(function (g) { return g.circulo + ":" + g.entradas.length + ":" + g.custo; }).join(" "),
        "1:1:1 2:2:3 3:1:6 4:5:10");
      t.ok("  e em ordem alfabética dentro do círculo", grupos[3].entradas.every(function (e, i, l) {
        return i === 0 || l[i - 1].nome.localeCompare(e.nome, "pt-BR") <= 0;
      }));

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem · rituais — prévia, detalhes e honestidade");

      var semVazioR = function (pares) { return pares.every(function (p) { return p[0] && p[1] !== "" && p[1] !== undefined; }); };
      t.ok("o resumo compacto de TODOS os rituais não tem valor vazio",
        catalogoR.rituais.every(function (e) { return semVazioR(RS.resumoCompacto(e)); }));
      t.ok("os detalhes de TODOS não têm valor vazio", catalogoR.rituais.every(function (e) { return semVazioR(RS.detalhes(e)); }));
      t.ok("  e todos dizem o custo e a fonte com página", catalogoR.rituais.every(function (e) {
        var rotulos = RS.detalhes(e).map(function (p) { return p[0]; });
        return rotulos.indexOf("Custo") >= 0 && RS.detalhes(e).some(function (p) { return p[0] === "Fonte" && /p\. \d+/.test(p[1]); });
      }));
      t.ok("o resumo compacto não repete o círculo e o elemento (já estão na classificação)",
        RS.resumoCompacto(cica).every(function (p) { return p[0] !== "Círculo" && p[0] !== "Elemento"; }));
      t.ok("ritual de Medo avisa do custo em Sanidade e de não ter afinidade",
        RS.regrasGerais(ritual("op.ritual.cineraria")).join(" ").match(/Sanidade/) &&
        /afinidade com Medo/.test(RS.regrasGerais(ritual("op.ritual.cineraria")).join(" ")));
      t.ok("ritual de outro elemento avisa dos componentes e do Custo do Paranormal",
        /componentes ritualísticos/.test(RS.regrasGerais(cica).join(" ")) && /Custo do Paranormal/.test(RS.regrasGerais(cica).join(" ")));
      t.ok("os requisitos citam o círculo e o que cada versão exige",
        /Conjurar 1º círculo/.test(RS.requisitos(cica).join(" ")) && /Discente: requer 2º círculo/.test(RS.requisitos(cica).join(" ")));
      t.ok("toda entrada declara o que é automático", catalogoR.rituais.every(function (e) {
        var n = RS.naFicha(e);
        return ["calculo", "parcial", "texto"].indexOf(n.automacao) >= 0 && /não gasta PE/.test(n.texto);
      }));
      t.ok("ritual sem dados diz que nenhum botão de rolagem é inventado",
        /não tem expressão de dados/.test(RS.naFicha(ritual("op.ritual.possessao")).texto));

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem · rituais — adicionar preenche a ficha (e não conjura)");

      var cicaFicha = adicionarRitual("op.ritual.cicatrizacao");
      t.iguais("os campos do livro entram preenchidos",
        [cicaFicha.circulo, cicaFicha.elemento, cicaFicha.execucao, cicaFicha.alcance, cicaFicha.alvo, cicaFicha.duracao],
        ["1º círculo", "Morte", "padrão", "toque", "1 ser", "instantânea"]);
      t.igual("  com o rastro da origem", cicaFicha.origemCatalogoId, "op.ritual.cicatrizacao");
      t.iguais("  e o bloco de Ordem com elemento, círculo, custo e referência",
        [cicaFicha.ordem.elemento, cicaFicha.ordem.circulo, cicaFicha.ordem.custo, cicaFicha.ordem.referencia.fonte, cicaFicha.ordem.referencia.pagina],
        ["morte", 1, 1, "OPRPG", 126]);
      t.igual("  a descrição resume e cita a fonte", /Fonte: Ordem Paranormal RPG, p\. 126/.test(cicaFicha.descricao), true);
      t.ok("  e o campo “Efeito” fica vazio quando o livro não usa essa linha", cicaFicha.efeito === "");
      t.igual("as três versões entram, com id próprio", cicaFicha.versoes.length, 3);
      t.ok("  ids de versão são novos e diferentes entre si",
        cicaFicha.versoes[0].id !== cicaFicha.versoes[1].id && cicaFicha.versoes[0].id.length > 8);
      t.iguais("  custo ADICIONAL de cada versão avançada", cicaFicha.versoes.map(function (v) { return v.custo || 0; }), [0, 2, 9]);
      t.ok("  a cura vem como rolagem de cura, não como dano",
        cicaFicha.versoes[0].rolagens[0].tipo === "cura" && !cicaFicha.versoes[0].dano);
      t.iguais("  e o custo total sai da soma com o círculo, uma vez só",
        cicaFicha.versoes.map(function (v) { return RS.custoDaVersao(cicaFicha, v).total; }), [1, 3, 10]);

      var esfolarFicha = adicionarRitual("sah.ritual.esfolar");
      t.iguais("ritual de dano: dano e dano extra separados", [esfolarFicha.versoes[0].dano, esfolarFicha.versoes[0].danoExtra], ["3d4", "3"]);
      t.ok("  e a ficha mostra as três versões com rolagem", FR.versoesComRolagem(esfolarFicha).length === 3);

      var possessao = adicionarRitual("op.ritual.possessao");
      t.igual("ritual sem dano não ganha expressão nenhuma", FR.versoesComRolagem(possessao).length, 0);
      t.ok("  e continua com a versão Normal guardada", possessao.versoes.length === 1 && possessao.versoes[0].nome === "Normal");

      t.ok("Amaldiçoar Arma sem elemento escolhido é recusada", !RS.paraFicha(amaldicoar, {}).ok);
      t.ok("  elemento fora da lista também", !RS.paraFicha(amaldicoar, { escolha: "medo" }).ok);
      var amaldicoada = adicionarRitual("op.ritual.amaldicoar-arma", { escolha: "morte" });
      t.iguais("  com Morte, o elemento entra no ritual e no bloco de Ordem",
        [amaldicoada.elemento, amaldicoada.ordem.elemento], ["Morte", "morte"]);
      t.ok("  e a escolha aparece na descrição", /Elemento do ritual: Morte/.test(amaldicoada.descricao));

      var todosMontam = catalogoR.rituais.every(function (e) {
        var escolha = e.escolha ? (RS.opcoesDaEscolha(e.escolha)[0] || {}).valor : undefined;
        var r = RS.paraFicha(e, { escolha: escolha });
        if (!r.ok) return false;
        var pronto = FR.normalizarRitual(FR.criarRitual(r.dados));
        return pronto && pronto.nome === e.nome && pronto.origemCatalogoId === e.id &&
          pronto.ordem.circulo === e.circulo && pronto.versoes.length === e.versoes.length;
      });
      t.ok("TODOS os 98 rituais viram ritual de ficha com campos, versões e origem", todosMontam);

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem · rituais — cópia independente (snapshot)");

      var copia1 = adicionarRitual("op.ritual.cicatrizacao");
      var copia2 = adicionarRitual("op.ritual.cicatrizacao");
      t.ok("duas inclusões do mesmo ritual: dois registros, ids diferentes",
        copia1.id !== copia2.id && copia1.origemCatalogoId === copia2.origemCatalogoId);
      t.ok("  e versões com ids diferentes", copia1.versoes[0].id !== copia2.versoes[0].id);
      copia1.nome = "Cicatrização da mesa";
      copia1.area = "esfera de 3 m";
      copia1.versoes[1].custo = 5;
      t.iguais("editar a cópia não muda a outra", [copia2.nome, copia2.area, copia2.versoes[1].custo], ["Cicatrização", "", 2]);
      t.iguais("  nem o catálogo", [ritual("op.ritual.cicatrizacao").nome, ritual("op.ritual.cicatrizacao").versoes[1].custo], ["Cicatrização", 2]);
      t.ok("o catálogo recusa alteração direta", (function () {
        try { ritual("op.ritual.cicatrizacao").versoes[1].custo = 99; } catch (e) { /* modo estrito lança */ }
        return ritual("op.ritual.cicatrizacao").versoes[1].custo === 2;
      })());
      var relido = FR.normalizarRitual(JSON.parse(JSON.stringify(copia1)));
      t.iguais("salvar e reabrir preserva a cópia inteira",
        [relido.id, relido.nome, relido.area, relido.origemCatalogoId, relido.ordem.circulo, relido.versoes[1].custo,
          relido.versoes[0].rolagens[0].tipo],
        [copia1.id, "Cicatrização da mesa", "esfera de 3 m", "op.ritual.cicatrizacao", 1, 5, "cura"]);
      t.ok("o ritual salvo não leva o catálogo junto", JSON.stringify(relido).length < 2600);

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem · rituais — a ficha olhando o ritual (avisos, nunca bloqueio)");

      if (global.RAMAOrdemRegras) {
        var RRR = global.RAMAOrdemRegras;
        var ocultista = RRR.fichaVazia();
        ocultista.classe = "ocultista";
        ocultista.nex = 25;
        ocultista.atributos = { agi: 1, for: 1, int: 3, pre: 3, vig: 1 };

        t.igual("ocultista com NEX 25% conjura até o 2º círculo", RRR.rituais(ocultista).circuloMaximo, 2);
        var avisos2 = RS.conferencias(ritual("op.ritual.aprimorar-fisico"), ocultista);
        t.ok("ritual dentro do círculo não gera aviso de círculo", !avisos2.some(function (a) { return /círculo máximo/.test(a); }));
        var avisos4 = RS.conferencias(ritual("op.ritual.controle-mental"), ocultista);
        t.ok("ritual de 4º círculo avisa que a ficha não chega lá", avisos4.some(function (a) { return /círculo máximo é o 2º/.test(a); }));
        t.ok("  e avisa que o custo passa do limite de PE por turno", avisos4.some(function (a) { return /limite de PE por turno/.test(a); }));
        t.ok("sem afinidade, as formas que a pedem são avisadas",
          RS.conferencias(ritual("op.ritual.arma-atroz"), ocultista).some(function (a) { return /afinidade/.test(a); }));
        ocultista.afinidade = { elemento: "sangue", adiada: false };
        t.ok("com afinidade de Sangue, Arma Atroz não avisa mais",
          !RS.conferencias(ritual("op.ritual.arma-atroz"), ocultista).some(function (a) { return /afinidade/.test(a); }));
        t.ok("  e um ritual de outro elemento avisa qual é a afinidade da ficha",
          RS.conferencias(cica, ocultista).some(function (a) { return /afinidade desta ficha é Sangue/.test(a); }));
        t.ok("ritual de Medo avisa do preço em Sanidade",
          RS.conferencias(ritual("op.ritual.cineraria"), ocultista).some(function (a) { return /Sanidade permanente/.test(a); }));
        var combatente = RRR.fichaVazia();
        combatente.classe = "combatente";
        combatente.nex = 60;
        t.ok("classe que não conjura por NEX recebe aviso, não bloqueio",
          RS.conferencias(cica, combatente).some(function (a) { return /não conjura rituais por NEX/.test(a); }));

        var dt = RS.dtDeResistencia(ocultista);
        t.iguais("a DT de resistência é 10 + nível de exposição + Presença (OPRPG p. 121)", [dt.nivel, dt.presenca, dt.total], [5, 3, 18]);
        var forte = RRR.fichaVazia();
        forte.classe = "ocultista";
        forte.nex = 99;
        forte.atributos = { agi: 1, for: 1, int: 1, pre: 5, vig: 1 };
        t.igual("  com Presença 5 e NEX 99%, DT 35 — o exemplo do livro", RS.dtDeResistencia(forte).total, 35);

        /* Registrar um ritual não resolve pendência de progressão. */
        if (global.RAMAOrdemProgressao) {
          var antes = global.RAMAOrdemProgressao.estado(ocultista).pendencias.length;
          var fichaComRitual = FR.criarFicha({ nome: "Com ritual", tipoFicha: "ordem" });
          fichaComRitual.ordem = ocultista;
          fichaComRitual.rituais.itens.push(adicionarRitual("op.ritual.aprimorar-fisico"));
          t.igual("adicionar um ritual não resolve pendência de progressão nenhuma",
            global.RAMAOrdemProgressao.estado(ocultista).pendencias.length, antes);
        }
      }

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem · rituais — ficha antiga, persistência e exportação");

      /* O texto longo do ritual morava em `efeito` até a v2.13. */
      var antiga = FR.normalizarFicha({
        nome: "Antiga", schemaVersion: 7,
        rituais: {
          rotuloSecao: "Magias",
          rotulos: { circulo: "Nível", efeito: "O que faz" },
          itens: [{ id: "r1", nome: "Bola de Fogo", circulo: "3", alcance: "médio", alvo: "área",
                    efeito: "Texto longo escrito pela mesa.", versoes: [{ id: "v1", nome: "Normal", dano: "6d6" }] }],
        },
      });
      var migrado = antiga.rituais.itens[0];
      t.igual("o texto longo de uma ficha 7 migra para a descrição", migrado.descricao, "Texto longo escrito pela mesa.");
      t.igual("  e o campo Efeito fica livre para a linha do livro", migrado.efeito, "");
      t.igual("  o rótulo personalizado vai junto com o texto", antiga.rituais.rotulos.descricao, "O que faz");
      t.igual("  e o rótulo de Efeito volta ao padrão", antiga.rituais.rotulos.efeito, "Efeito");
      t.iguais("  nada mais se perde", [migrado.circulo, migrado.alcance, migrado.alvo, migrado.versoes[0].dano, antiga.rituais.rotuloSecao],
        ["3", "médio", "área", "6d6", "Magias"]);
      t.igual("a ficha migrada sai no schema atual", antiga.schemaVersion, FR.VERSAO_SCHEMA);

      var atual = FR.normalizarFicha({
        nome: "Atual", schemaVersion: 8,
        rituais: { itens: [{ id: "r2", nome: "Tecer Ilusão", efeito: "ilusão de até 4 cubos", descricao: "Cria uma ilusão." }] },
      });
      t.iguais("numa ficha 8, Efeito e Descrição ficam onde estão",
        [atual.rituais.itens[0].efeito, atual.rituais.itens[0].descricao], ["ilusão de até 4 cubos", "Cria uma ilusão."]);
      var semDescricao = FR.normalizarFicha({
        nome: "Atual sem descrição", schemaVersion: 8,
        rituais: { itens: [{ id: "r3", nome: "Nuvem", efeito: "nuvem de 6 m de raio" }] },
      });
      t.igual("  e um ritual novo só com a linha do livro não tem o campo movido",
        semDescricao.rituais.itens[0].efeito, "nuvem de 6 m de raio");

      var fichaRituais = FR.criarFicha({ nome: "Com rituais do catálogo", tipoFicha: "ordem" });
      if (global.RAMAOrdemRegras) fichaRituais.ordem = global.RAMAOrdemRegras.normalizar({ classe: "ocultista", nex: 55 });
      fichaRituais.rituais.itens = [adicionarRitual("op.ritual.cicatrizacao"), adicionarRitual("sah.ritual.esfolar"),
        FR.criarRitual({ nome: "Ritual da mesa", circulo: "1", descricao: "Escrito à mão." })];
      var voltou = FR.normalizarFicha(JSON.parse(JSON.stringify(fichaRituais)));
      var retrato = function (f) {
        return f.rituais.itens.map(function (r) {
          return [r.nome, r.circulo, r.elemento, r.origemCatalogoId || "", (r.ordem || {}).custo || 0,
            r.versoes.map(function (v) { return v.nome + ":" + (v.dano || "") + ":" + (v.custo || 0) + ":" + (v.rolagens || []).length; }).join("|")].join("/");
        });
      };
      t.iguais("salvar e reabrir preserva campos, bloco de Ordem, versões e rolagens", retrato(voltou), retrato(fichaRituais));

      if (V) {
        var pacoteR = V.exportar("personagem", fichaRituais);
        var impR = V.importado(JSON.parse(JSON.stringify(pacoteR)));
        t.ok("a ficha com rituais do catálogo atravessa exportar e importar", impR.ok);
        t.iguais("  com os mesmos dados", retrato(impR.dados), retrato(fichaRituais));
        t.ok("  e com ids novos, de ritual e de versão", impR.dados.rituais.itens.every(function (r, i) {
          return r.id !== fichaRituais.rituais.itens[i].id && r.versoes[0].id !== fichaRituais.rituais.itens[i].versoes[0].id;
        }));
      }

      var lixoR = FR.normalizarRitual({
        id: "x", nome: "Estranho",
        ordem: { elemento: "caos", circulo: 9, custo: -5, referencia: { fonte: "PIRATA", pagina: 0 } },
        versoes: [{ nome: "Normal", dano: "não é dado", custo: 999, rolagens: [{ tipo: "magia", rotulo: "", expressao: "xd" }] }],
      });
      t.ok("bloco de Ordem inválido é descartado na leitura", lixoR.ordem === undefined);
      t.igual("  custo absurdo é aparado", lixoR.versoes[0].custo, 99);
      t.igual("  expressão inválida é preservada como veio, para não sumir do olho de quem digitou", lixoR.versoes[0].dano, "não é dado");
      t.igual("  expressão inválida de uma rolagem também é preservada, com o tipo corrigido",
        lixoR.versoes[0].rolagens[0].tipo + ":" + lixoR.versoes[0].rolagens[0].expressao, "outra:xd");
      t.ok("  e rolagem sem expressão nem valor nenhum é descartada",
        !FR.normalizarRitual({ nome: "X", versoes: [{ nome: "Normal", rolagens: [{ tipo: "cura", rotulo: "Cura" }] }] }).versoes[0].rolagens);

      var universalR = FR.normalizarFicha({ nome: "Universal", rituais: { itens: [{ id: "u1", nome: "Magia da casa", circulo: "1", descricao: "Texto." }] } });
      t.ok("ficha universal: ritual sem bloco de Ordem e sem rastro de catálogo",
        universalR.rituais.itens[0].ordem === undefined && !("origemCatalogoId" in universalR.rituais.itens[0]));
      t.ok("  e continua com os campos e a versão Normal",
        universalR.rituais.itens[0].circulo === "1" && universalR.rituais.itens[0].versoes.length === 1);
    }

    /* =================================================================
       ORDEM — APRENDIZADO DE RITUAIS (v2.17)
       -----------------------------------------------------------------
       As concessões de ritual da classe e da trilha viram vagas de
       progressão, com contagem, círculo e origem próprios. O que estes
       casos provam:

         · os três rituais iniciais do ocultista, e um a cada avanço;
         · Saber Ampliado e o grimório de Graduado, cada um com a sua
           quantidade e o seu círculo;
         · o círculo é conferido NA ETAPA que concedeu, nunca com o
           alcance de hoje;
         · escolher menos e voltar depois;
         · um ritual ocupa UMA concessão, e recalcular não concede nada
           de novo nem duplica ritual nenhum;
         · trocar trilha ou classe não apaga ritual: solta o vínculo;
         · o limite por Intelecto conta só Aprender Ritual;
         · a tabela de rituais concedidos pelo nome bate com o catálogo.
       ================================================================= */

    if (global.RAMAOrdemAprendizado && global.RAMAOrdemProgressao && global.RAMAOrdemRegras &&
        global.RAMAOrdemRituais && global.RAMAOrdemRituaisDados && global.RAMAFicha) {
      var AP = global.RAMAOrdemAprendizado;
      var APe = global.RAMAOrdemProgressao;
      var APr = global.RAMAOrdemRegras;
      var APrt = global.RAMAOrdemRituais;
      var APf = global.RAMAFicha;
      var APcat = APrt.normalizarCatalogo(global.RAMAOrdemRituaisDados);

      function apRitual(nome, elemento) {
        var e = APcat.rituais.filter(function (x) { return x.nome === nome; })[0];
        if (!e) throw new Error("ritual inexistente no catálogo: " + nome);
        var m = APrt.paraFicha(e, { escolha: e.escolha ? (elemento || "conhecimento") : undefined });
        if (!m.ok) throw new Error(nome + ": " + m.mensagem);
        return APf.criarRitual(m.dados);
      }

      function apOcultista(nex, trilha, int) {
        var o = APr.fichaVazia();
        o.classe = "ocultista";
        o.origem = "academico";
        o.nex = nex;
        o.trilha = trilha || "";
        o.atributos = { agi: 1, "for": 1, int: int === undefined ? 3 : int, pre: 2, vig: 1 };
        return o;
      }

      function apIds(ordem) {
        return APe.concessoesDeRitual(ordem).map(function (c) { return c.id; });
      }

      function apConcessao(ordem, rituais, id) {
        var est = APe.estado(ordem, { rituais: rituais });
        return est.rituais.concessoes.filter(function (c) { return c.id === id; })[0];
      }

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem · aprendizado — o que a classe concede");

      t.iguais("NEX 5%: só os três rituais iniciais", apIds(apOcultista(5)), ["d1.rituaisIniciais"]);
      t.iguais("NEX 20%: os iniciais e um ritual por avanço",
        apIds(apOcultista(20)),
        ["d1.rituaisIniciais", "d2.ritualClasse", "d3.ritualClasse", "d4.ritualClasse"]);
      t.igual("NEX 99%: três iniciais mais dezenove avanços",
        apIds(apOcultista(99)).length, 20);
      t.iguais("combatente não recebe concessão de ritual por classe",
        (function () { var c = APr.fichaVazia(); c.classe = "combatente"; c.nex = 99; return apIds(c); })(), []);

      var apInicial = AP.concessoes({ classe: "ocultista", passos: 1 })[0];
      t.iguais("os iniciais são três, de 1º círculo, fora do limite",
        [apInicial.quantidade, apInicial.circulos.join(","), apInicial.contaNoLimite, apInicial.destino],
        [3, "1", false, "conhecido"]);

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem · aprendizado — o círculo vale o da etapa");

      t.igual("no 1º degrau, 1º círculo", AP.circuloMaximoNoDegrau("ocultista", 1), 1);
      t.igual("  NEX 25% (5º degrau), 2º círculo", AP.circuloMaximoNoDegrau("ocultista", 5), 2);
      t.igual("  NEX 55% (11º degrau), 3º círculo", AP.circuloMaximoNoDegrau("ocultista", 11), 3);
      t.igual("  NEX 85% (17º degrau), 4º círculo", AP.circuloMaximoNoDegrau("ocultista", 17), 4);
      t.igual("  NEX 80% ainda é 3º círculo", AP.circuloMaximoNoDegrau("ocultista", 16), 3);

      var apAvancado = apOcultista(99);
      var apCedo = AP.concessoes({ classe: "ocultista", passos: 20 }).filter(function (c) { return c.id === "d4.ritualClasse"; })[0];
      var apTarde = AP.concessoes({ classe: "ocultista", passos: 20 }).filter(function (c) { return c.id === "d18.ritualClasse"; })[0];
      t.iguais("a concessão de NEX 20% continua só de 1º círculo, num personagem de NEX 99%",
        apCedo.circulos, [1]);
      t.iguais("  e a de NEX 90% alcança o 4º", apTarde.circulos, [1, 2, 3, 4]);
      t.ok("resolver a antiga com um ritual de 4º círculo é recusado",
        !AP.elegibilidade(apCedo, { circulo: 4 }).ok);
      t.ok("  com o motivo escrito", /aceita 1º círculo/.test(AP.elegibilidade(apCedo, { circulo: 4 }).motivo));

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem · aprendizado — escolher, escolher pela metade e completar");

      var apO = apOcultista(5);
      var apTres = [apRitual("Luz"), apRitual("Cicatrização"), apRitual("Ouvir os Sussurros")];
      var apCtx = { rituais: apTres };

      var apPend0 = APe.estado(apO, apCtx).pendencias.filter(function (x) { return x.tipo === "rituais"; })[0];
      t.iguais("a pendência diz o permitido, o escolhido e o que falta",
        [apPend0.rotulo, apPend0.aprendizado.quantidade, apPend0.aprendizado.escolhidos, apPend0.aprendizado.restantes],
        ["Rituais iniciais", 3, 0, 3]);
      t.igual("  e o verbo do botão", apPend0.verbo, "Escolher rituais");

      APe.adicionarRitual(apO, "d1.rituaisIniciais", apTres[0]);
      APe.adicionarRitual(apO, "d1.rituaisIniciais", apTres[1]);
      var apPend1 = APe.estado(apO, apCtx).pendencias.filter(function (x) { return x.tipo === "rituais"; })[0];
      t.igual("escolha parcial continua pendente", apPend1.situacao, "incompleta");
      t.iguais("  com a conta certa", [apPend1.aprendizado.escolhidos, apPend1.aprendizado.restantes], [2, 1]);
      t.ok("  e os dois já escolhidos valem", APe.estado(apO, apCtx).rituais.concessoes[0].escolhidos.length === 2);
      t.iguais("  o terceiro fica sem concessão",
        APe.estado(apO, apCtx).rituais.semOrigem.map(function (x) { return x.nome; }), ["Ouvir os Sussurros"]);

      APe.adicionarRitual(apO, "d1.rituaisIniciais", apTres[2]);
      var apEst = APe.estado(apO, apCtx);
      t.igual("com os três, a pendência some", apEst.pendencias.filter(function (x) { return x.tipo === "rituais"; }).length, 0);
      t.ok("  e a concessão fica completa", apEst.rituais.concessoes[0].completa);
      t.igual("  nenhum ritual fica sem origem", apEst.rituais.semOrigem.length, 0);

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem · aprendizado — recalcular não concede nem duplica");

      var apRetrato = JSON.stringify(apO.escolhas);
      APe.estado(apO, apCtx);
      APe.estado(apO, apCtx);
      APe.estado(apO, { rituais: apTres.slice() });
      t.igual("ler a ficha três vezes não muda escolha nenhuma", JSON.stringify(apO.escolhas), apRetrato);
      t.igual("  e o número de rituais continua o mesmo", apTres.length, 3);
      t.igual("  o aprendizado continua com três", APe.estado(apO, apCtx).rituais.aprendizados.length, 3);

      var apSalvo = APf.normalizarFicha(JSON.parse(JSON.stringify((function () {
        var f = APf.criarFicha({ nome: "Ocultista", tipoFicha: "ordem" });
        f.ordem = apO;
        f.rituais.itens = apTres;
        return f;
      })())));
      var apVolta = APe.estado(apSalvo.ordem, { rituais: apSalvo.rituais.itens });
      t.igual("salvar e reabrir preserva os três vínculos", apVolta.rituais.aprendizados.length, 3);
      t.igual("  sem pendência nova", apVolta.pendencias.filter(function (x) { return x.tipo === "rituais"; }).length, 0);

      if (V) {
        var apPacote = V.importado(JSON.parse(JSON.stringify(V.exportar("personagem", apSalvo))));
        t.ok("a ficha atravessa exportar e importar", apPacote.ok);
        var apImp = APe.estado(apPacote.dados.ordem, { rituais: apPacote.dados.rituais.itens });
        t.igual("  com os três rituais inteiros", apPacote.dados.rituais.itens.length, 3);
        t.ok("  e nenhuma cópia a mais",
          apPacote.dados.rituais.itens.map(function (r) { return r.nome; }).sort().join("|") ===
          ["Cicatrização", "Luz", "Ouvir os Sussurros"].join("|"));
        t.ok("  com ids de ritual novos, como toda importação",
          apPacote.dados.rituais.itens.every(function (r, i) { return r.id !== apSalvo.rituais.itens[i].id; }));
        t.igual("  e o vínculo de aprendizado refeito nos ids novos", apImp.rituais.aprendizados.length, 3);
        t.igual("  sem concessão pendente", apImp.pendencias.filter(function (x) { return x.tipo === "rituais"; }).length, 0);

        /* Um pacote em que a lista de rituais não atravessa inteira: o
           vínculo NÃO é refeito no palpite — a concessão volta a ficar
           pendente, com os rituais do lado. */
        var apTorto = JSON.parse(JSON.stringify(V.exportar("personagem", apSalvo)));
        apTorto.dados.rituais.itens.push({ nome: "", versoes: [] });
        apTorto.dados.rituais.itens[0] = { lixo: true };
        var apTortoImp = V.importado(apTorto);
        if (apTortoImp.ok) {
          var apTortoEst = APe.estado(apTortoImp.dados.ordem, { rituais: apTortoImp.dados.rituais.itens });
          t.igual("lista de rituais alterada no arquivo não recria vínculo por palpite",
            apTortoEst.rituais.aprendizados.length, 0);
        }
      }

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem · aprendizado — um ritual ocupa uma concessão só");

      var apDup = apOcultista(20);
      var apRd = [apRitual("Luz"), apRitual("Cicatrização"), apRitual("Ouvir os Sussurros")];
      apRd.forEach(function (r) { APe.adicionarRitual(apDup, "d1.rituaisIniciais", r); });
      APe.adicionarRitual(apDup, "d2.ritualClasse", apRd[0]);
      var apEstDup = APe.estado(apDup, { rituais: apRd });
      var apPendDup = apEstDup.pendencias.filter(function (x) { return x.id === "d2.ritualClasse"; })[0];
      t.ok("o mesmo ritual em duas concessões é recusado na segunda",
        !!apPendDup && /já ocupa outra concessão/.test(apPendDup.motivos.join(" ")));
      t.igual("  e a primeira continua de pé", apEstDup.rituais.concessoes[0].escolhidos.length, 3);
      t.igual("  o ritual continua com uma origem só", apEstDup.rituais.porRitual[apRd[0].id].concessao, "d1.rituaisIniciais");

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem · aprendizado — Graduado: Saber Ampliado e grimório");

      var apG = AP.concessoes({ classe: "ocultista", trilha: "graduado", passos: 20 });
      var apPorId = {};
      apG.forEach(function (c) { apPorId[c.id] = c; });

      t.iguais("Saber Ampliado dá um ritual de 1º círculo em NEX 10%",
        [apPorId["d2.saberAmpliado"].quantidade, apPorId["d2.saberAmpliado"].circulos.join(",")], [1, "1"]);
      t.iguais("  e um DAQUELE círculo a cada círculo novo",
        ["d5.saberAmpliado", "d11.saberAmpliado", "d17.saberAmpliado"].map(function (k) { return apPorId[k].circulos.join(","); }),
        ["2", "3", "4"]);
      t.ok("  nenhum deles conta no limite de rituais conhecidos",
        ["d2.saberAmpliado", "d5.saberAmpliado"].every(function (k) { return !apPorId[k].contaNoLimite; }));

      t.iguais("o grimório guarda rituais de 1º ou 2º círculo em NEX 40%",
        [apPorId["d8.grimorio"].quantidade, apPorId["d8.grimorio"].circulos.join(","), apPorId["d8.grimorio"].destino],
        ["intelecto", "1,2", "grimorio"]);
      t.igual("  a quantidade é o Intelecto: com Int 4, quatro",
        AP.quantidadeDa(apPorId["d8.grimorio"], 4), 4);
      t.ok("  o acréscimo por círculo novo é uma permissão, não uma obrigação",
        apPorId["d11.grimorio"].opcional === true && apPorId["d17.grimorio"].opcional === true);
      t.iguais("  e cada um é do círculo que acabou de abrir",
        [apPorId["d11.grimorio"].circulos.join(","), apPorId["d17.grimorio"].circulos.join(",")], ["3", "4"]);
      t.ok("não há grimório de 3º círculo antes de NEX 55%",
        !AP.concessoes({ classe: "ocultista", trilha: "graduado", passos: 10 })
          .some(function (c) { return c.id === "d11.grimorio"; }));

      var apGr = apOcultista(40, "graduado", 3);
      var apGrRit = [apRitual("Luz"), apRitual("Aprimorar Mente"), apRitual("Cicatrização")];
      apGrRit.forEach(function (r) { APe.adicionarRitual(apGr, "d8.grimorio", r); });
      var apGrEst = APe.estado(apGr, { rituais: apGrRit });
      t.igual("com Int 3, três rituais entram no grimório",
        apGrEst.rituais.concessoes.filter(function (c) { return c.id === "d8.grimorio"; })[0].escolhidos.length, 3);
      t.igual("  e cada um fica marcado como do grimório",
        apGrEst.rituais.porRitual[apGrRit[0].id].destino, "grimorio");
      t.ok("  o grimório não é uma pasta: a condição de uso vem com ele",
        APrt.condicoesDoDestino("grimorio").some(function (x) { return /empunh/i.test(x); }));
      t.igual("  e nada disso conta no limite por Intelecto", apGrEst.rituais.limite.usados, 0);
      t.ok("um ritual de 3º círculo não cabe no grimório de NEX 40%",
        !AP.elegibilidade(apPorId["d8.grimorio"], { circulo: 3 }).ok);

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem · aprendizado — o limite por Intelecto conta só Aprender Ritual");

      var apLim = apOcultista(50, "", 2);
      var apLimRit = [apRitual("Luz"), apRitual("Cicatrização")];
      APe.registrar(apLim, APe.vagas(apLim).filter(function (v) { return v.id === "d3.poderClasse"; })[0], {
        valor: "transcender",
        opcoes: { poder: { valor: "aprenderRitual", opcoes: { aprendido: APe.vinculoDeRitual(apLimRit[0]), elemento: "energia" } } },
      });
      var apLimEst = APe.estado(apLim, { rituais: apLimRit });
      t.igual("Aprender Ritual conta no limite", apLimEst.rituais.limite.usados, 1);
      t.iguais("  contra o Intelecto", [apLimEst.rituais.limite.total, apLimEst.rituais.limite.excedido], [2, false]);
      t.igual("  e o ritual fica marcado como vindo dele",
        apLimEst.rituais.porRitual[apLimRit[0].id].nomePoder, "Aprender Ritual");
      APe.adicionarRitual(apLim, "d1.rituaisIniciais", apLimRit[1]);
      t.igual("um ritual dos iniciais não mexe no limite",
        APe.estado(apLim, { rituais: apLimRit }).rituais.limite.usados, 1);

      t.igual("Aprender Ritual alcança o 1º círculo antes de NEX 45%", AP.circuloDeAprenderRitual(30), 1);
      t.igual("  o 2º a partir de 45%", AP.circuloDeAprenderRitual(45), 2);
      t.igual("  e o 3º a partir de 75%", AP.circuloDeAprenderRitual(75), 3);

      var apAlto = apOcultista(30, "", 3);
      var apAltoRit = apRitual("Ferver Sangue");   /* 2º círculo */
      APe.registrar(apAlto, APe.vagas(apAlto).filter(function (v) { return v.id === "d3.poderClasse"; })[0], {
        valor: "transcender",
        opcoes: { poder: { valor: "aprenderRitual", opcoes: { aprendido: APe.vinculoDeRitual(apAltoRit), elemento: "sangue" } } },
      });
      var apAltoEst = APe.estado(apAlto, { rituais: [apAltoRit] });
      t.ok("um ritual de 2º círculo com NEX 30% é recusado em Aprender Ritual",
        apAltoEst.problemas.concat(apAltoEst.pendencias).some(function (x) {
          return (x.motivos || []).some(function (m) { return /alcança até o 1º círculo/.test(m); });
        }));

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem · aprendizado — trocar trilha, classe e regra");

      var apTr = apOcultista(40, "graduado", 3);
      var apTrRit = [apRitual("Luz")];
      APe.adicionarRitual(apTr, "d8.grimorio", apTrRit[0]);
      t.igual("com Graduado, o grimório reivindica o ritual",
        APe.estado(apTr, { rituais: apTrRit }).rituais.porRitual[apTrRit[0].id].destino, "grimorio");

      apTr.trilha = "conduite";
      var apTrEst = APe.estado(apTr, { rituais: apTrRit });
      t.igual("trocando de trilha, o grimório some da progressão",
        apTrEst.rituais.concessoes.filter(function (c) { return c.id === "d8.grimorio"; }).length, 0);
      t.ok("  a escolha fica guardada, com o motivo",
        apTrEst.fora.some(function (f) { return /concessão de rituais não existe mais/.test(f.motivos.join(" ")); }));
      t.igual("  e o ritual continua na ficha, sem concessão", apTrEst.rituais.semOrigem.length, 1);

      apTr.trilha = "graduado";
      t.igual("voltando a trilha, o vínculo volta sozinho",
        APe.estado(apTr, { rituais: apTrRit }).rituais.porRitual[apTrRit[0].id].destino, "grimorio");

      apTr.classe = "combatente";
      t.igual("virando combatente, nenhuma concessão de ocultista sobra",
        APe.estado(apTr, { rituais: apTrRit }).rituais.concessoes.length, 0);
      t.igual("  e o ritual continua inteiro na ficha", apTrRit.length, 1);
      apTr.classe = "ocultista";

      var apBaixo = apOcultista(20);
      var apBaixoRit = [apRitual("Luz")];
      APe.adicionarRitual(apBaixo, "d4.ritualClasse", apBaixoRit[0]);
      apBaixo.nex = 10;
      var apBaixoEst = APe.estado(apBaixo, { rituais: apBaixoRit });
      t.ok("baixar o NEX guarda a escolha da etapa que sumiu",
        apBaixoEst.fora.length === 1 && apBaixoEst.rituais.semOrigem.length === 1);
      apBaixo.nex = 20;
      t.ok("  e ela volta a valer quando o NEX volta",
        !!APe.estado(apBaixo, { rituais: apBaixoRit }).rituais.porRitual[apBaixoRit[0].id]);

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem · aprendizado — regras opcionais de SAH p.113");

      var apLento = apOcultista(40);
      apLento.opcionais = { limitesCompreensao: true };
      t.iguais("aprendizado lento: só os degraus ímpares",
        apIds(apLento), ["d1.rituaisIniciais", "d3.ritualClasse", "d5.ritualClasse", "d7.ritualClasse"]);

      var apCampo = apOcultista(40);
      apCampo.opcionais = { aprendizadoEmCampo: true };
      t.iguais("aprendizado em campo: só os três iniciais", apIds(apCampo), ["d1.rituaisIniciais"]);
      t.ok("  e a ficha diz que está nesse modo",
        APe.estado(apCampo, { rituais: [] }).rituais.emCampo === true);

      if (global.RAMAOrdemOpcionais) {
        var apOP = global.RAMAOrdemOpcionais;
        t.ok("as duas variantes não valem juntas",
          apOP.conflitos({ opcionais: { limitesCompreensao: true } }, "aprendizadoEmCampo", true).length === 1);
        t.ok("  e as duas citam a página do livro",
          apOP.regra("limitesCompreensao").pagina === 113 && apOP.regra("aprendizadoEmCampo").pagina === 113);
      }

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem · aprendizado — nível e NEX separados");

      var apNx = apOcultista(10, "graduado", 3);
      apNx.opcionais = { nexExperiencia: true };
      apNx.nivel = 12;
      apNx.nex = 10;
      var apNxIds = apIds(apNx);
      t.ok("as concessões de classe seguem o NÍVEL, não o NEX",
        apNxIds.indexOf("d12.ritualClasse") >= 0 && apNxIds.indexOf("d13.ritualClasse") < 0);
      t.iguais("  e o círculo também: nível 12 alcança o 3º",
        AP.concessoes({ classe: "ocultista", trilha: "graduado", passos: 12, separado: true })
          .filter(function (c) { return c.id === "d12.ritualClasse"; })[0].circulos, [1, 2, 3]);
      t.ok("  o grimório de nível 11 existe", apNxIds.indexOf("d11.grimorio") >= 0);
      t.igual("Aprender Ritual continua olhando o NEX de exposição, não o nível",
        AP.circuloDeAprenderRitual(APr.exposicao(apNx)), 1);

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem · aprendizado — ficha antiga e personagem avançado");

      /* Um ocultista de NEX 75% criado direto, com rituais na ficha e
         nenhum vínculo: nada é assumido, nada é apagado. */
      var apVelha = apOcultista(75, "graduado", 3);
      var apVelhaRit = [apRitual("Luz"), apRitual("Cicatrização"), apRitual("Ouvir os Sussurros"),
                        apRitual("Ferver Sangue"), apRitual("Aprimorar Mente")];
      var apVelhaEst = APe.estado(apVelha, { rituais: apVelhaRit });
      t.igual("nenhum ritual é reivindicado sozinho", apVelhaEst.rituais.aprendizados.length, 0);
      t.igual("  todos aparecem sem origem", apVelhaEst.rituais.semOrigem.length, 5);
      t.ok("  e as concessões do personagem avançado estão todas abertas",
        apVelhaEst.rituais.concessoes.length > 15 &&
        apVelhaEst.rituais.concessoes.every(function (c) { return !c.completa; }));

      APe.adicionarRitual(apVelha, "d1.rituaisIniciais", apVelhaRit[0]);
      var apVelhaDepois = APe.estado(apVelha, { rituais: apVelhaRit });
      t.igual("associar um ritual antigo não cria outra cópia", apVelhaRit.length, 5);
      t.igual("  e ele passa a ter origem", apVelhaDepois.rituais.porRitual[apVelhaRit[0].id].concessao, "d1.rituaisIniciais");
      t.igual("  os outros continuam sem origem, intactos", apVelhaDepois.rituais.semOrigem.length, 4);

      /* Aprender Ritual de uma ficha anterior guardava só o nome. */
      var apLegado = apOcultista(50, "", 3);
      APe.registrar(apLegado, APe.vagas(apLegado).filter(function (v) { return v.id === "d3.poderClasse"; })[0], {
        valor: "transcender",
        opcoes: { poder: { valor: "aprenderRitual", opcoes: { ritual: "Luz", elemento: "energia" } } },
      });
      var apLegadoEst = APe.estado(apLegado, { rituais: [] });
      t.igual("Aprender Ritual com só o nome continua completo",
        apLegadoEst.pendencias.filter(function (x) { return x.id === "d3.poderClasse"; }).length, 0);
      t.ok("  e aparece marcado como vínculo antigo",
        apLegadoEst.rituais.aprendizados.some(function (a) { return a.legado && a.nome === "Luz"; }));
      t.igual("  contando no limite por Intelecto", apLegadoEst.rituais.limite.usados, 1);

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem · aprendizado — rituais concedidos pelo nome");

      AP.RITUAIS_DE_TRILHA.forEach(function (entrada) {
        var alvos = entrada.porElemento
          ? Object.keys(entrada.porElemento).map(function (k) { return entrada.porElemento[k].ritual; }).filter(Boolean)
          : [entrada.ritual];
        alvos.forEach(function (r) {
          var e = APcat.porId[r.id];
          t.ok(r.nome + " existe no catálogo, com o círculo certo",
            !!e && e.circulo === r.circulo, e ? "círculo " + e.circulo : "id desconhecido");
        });
      });

      var apCond = apOcultista(99, "conduite", 3);
      var apCondC = apConcessao(apCond, [], "d20.canalizarOMedo");
      t.ok("a trilha Conduíte concede Canalizar o Medo pelo nome",
        !!apCondC && apCondC.fixo.nome === "Canalizar o Medo");
      t.igual("  e a pendência dela é de trazer, não de escolher",
        APe.estado(apCond, { rituais: [] }).pendencias.filter(function (x) { return x.id === "d20.canalizarOMedo"; })[0].verbo,
        "Trazer ritual");
      t.ok("  só aquele ritual serve",
        !AP.elegibilidade(apCondC.concessao, { circulo: 4, catalogo: "op.ritual.medo-tangivel" }).ok &&
        AP.elegibilidade(apCondC.concessao, { circulo: 4, catalogo: "op.ritual.canalizar-o-medo" }).ok);

      var apMon = APr.fichaVazia();
      apMon.classe = "combatente";
      apMon.trilha = "monstruoso";
      apMon.nex = 99;
      apMon.atributos = { agi: 1, "for": 2, int: 1, pre: 1, vig: 2 };
      t.igual("sem o elemento da maldição, Ser Aterrorizante não concede nada",
        apIds(apMon).filter(function (x) { return /serAterrorizante/.test(x); }).length, 0);
      apMon.escolhas = [{ id: "e1", etapa: "b.serAmaldicoado", tipo: "opcoesBeneficio", valor: "",
                          opcoes: { elemento: "morte" }, nome: "", ignorarRequisitos: false, registradoEm: "" }];
      var apMonC = AP.concessoes({ classe: "combatente", trilha: "monstruoso", passos: 20, elementoMaldicao: "morte" })
        .filter(function (c) { return c.poder === "serAterrorizante"; })[0];
      t.igual("com Morte, ela concede Fim Inevitável", apMonC.fixo.nome, "Fim Inevitável");
      var apMonCo = AP.concessoes({ classe: "combatente", trilha: "monstruoso", passos: 20, elementoMaldicao: "conhecimento" })
        .filter(function (c) { return c.poder === "serAterrorizante"; })[0];
      t.ok("com Conhecimento, ela vira ESCOLHA de um ritual de 4º círculo daquele elemento",
        !apMonCo.fixo && apMonCo.circulos.join(",") === "4" && apMonCo.elemento === "conhecimento");
      t.ok("  e um ritual de outro elemento é recusado",
        !AP.elegibilidade(apMonCo, { circulo: 4, elemento: "morte", elementos: ["morte"] }).ok);

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem · aprendizado — a ficha manda, não o retrato guardado");

      /* O vínculo guarda um RETRATO do círculo, para a Progressão ficar
         legível sem a lista de rituais à mão. Com a lista à mão, quem
         manda é o ritual de verdade — senão bastaria editar o arquivo
         para caber qualquer coisa em qualquer concessão. */
      var apFalso = apOcultista(5);
      var apFalsoRit = apRitual("Canalizar o Medo");   /* 4º círculo */
      apFalso.escolhas = [{
        id: "f1", etapa: "d1.rituaisIniciais", tipo: "rituais", valor: "",
        opcoes: { rituais: [{ id: apFalsoRit.id, nome: "Canalizar o Medo", circulo: 1, elemento: "medo" }] },
        nome: "", ignorarRequisitos: false, registradoEm: "",
      }];
      var apFalsoEst = APe.estado(apFalso, { rituais: [apFalsoRit] });
      t.ok("círculo adulterado no vínculo não engana a concessão",
        apFalsoEst.rituais.aprendizados.length === 0);
      t.ok("  e o motivo cita o círculo de verdade",
        (apFalsoEst.pendencias.filter(function (x) { return x.id === "d1.rituaisIniciais"; })[0] || { motivos: [] })
          .motivos.join(" ").indexOf("é de 4º") >= 0);
      t.igual("sem a lista de rituais à mão, o retrato é aceito como está",
        APe.estado(apFalso, null).rituais.aprendizados.length, 1);

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem · aprendizado — trilha tem de ser da classe");

      /* Um combatente Monstruoso que virou ocultista: a trilha e a
         escolha do elemento continuam gravadas — e não é por isso que
         Ser Aterrorizante concede o ritual dele. */
      var apTrocado = apOcultista(99, "monstruoso", 3);   /* trilha de combatente */
      apTrocado.escolhas = [{ id: "m1", etapa: "b.serAmaldicoado", tipo: "opcoesBeneficio", valor: "",
                              opcoes: { elemento: "morte" }, nome: "", ignorarRequisitos: false, registradoEm: "" }];
      t.igual("trilha de outra classe não concede ritual nenhum",
        apIds(apTrocado).filter(function (x) { return !/ritualClasse|rituaisIniciais/.test(x); }).length, 0);
      t.igual("  nem com a escolha do elemento ainda gravada",
        apIds(apTrocado).filter(function (x) { return /serAterrorizante/.test(x); }).length, 0);
      var apCombGrad = APr.fichaVazia();
      apCombGrad.classe = "combatente";
      apCombGrad.trilha = "graduado";
      apCombGrad.nex = 55;
      apCombGrad.atributos = { agi: 1, "for": 2, int: 3, pre: 1, vig: 2 };
      t.igual("e um combatente com trilha de ocultista não ganha grimório",
        apIds(apCombGrad).length, 0);

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem · aprendizado — exceção da mesa e DT de Graduado");

      var apExc = apOcultista(5);
      var apExcRit = [apRitual("Canalizar o Medo")];   /* 4º círculo nos iniciais */
      APe.adicionarRitual(apExc, "d1.rituaisIniciais", apExcRit[0]);
      var apExcEst = APe.estado(apExc, { rituais: apExcRit });
      t.igual("fora da regra, o ritual não é reivindicado", apExcEst.rituais.aprendizados.length, 0);
      APe.definirIgnorarRequisitos(apExc, apExc.escolhas[0].id, true);
      var apExcEst2 = APe.estado(apExc, { rituais: apExcRit });
      t.ok("com “manter mesmo assim”, ele entra marcado como exceção",
        apExcEst2.rituais.aprendizados.length === 1 && apExcEst2.rituais.aprendizados[0].excecao === true);
      t.ok("  e o motivo continua escrito", !!apExcEst2.rituais.aprendizados[0].motivoDaExcecao);

      var apDt = apOcultista(99, "graduado", 3);
      apDt.atributos.pre = 2;
      var apSemGrad = apOcultista(99, "conduite", 3);
      apSemGrad.atributos.pre = 2;
      t.igual("Rituais Eficientes soma +5 na DT de resistir aos rituais",
        APrt.dtDeResistencia(apDt).total - APrt.dtDeResistencia(apSemGrad).total, 5);
      t.igual("  e a parcela aparece aberta", APrt.dtDeResistencia(apDt).extra, 5);

      /* =============================================================
         v2.18 — UMA LÓGICA DE AQUISIÇÃO, UMA PORTA DE GRAVAÇÃO
         ============================================================= */

      function apClasse(classe, nex, int) {
        var o = APr.fichaVazia();
        o.classe = classe;
        o.origem = "academico";
        o.nex = nex;
        o.atributos = { agi: 2, "for": 2, int: int === undefined ? 2 : int, pre: 1, vig: 1 };
        return o;
      }
      function apCandidatoAprender(ritual, elemento, extra) {
        return { valor: "transcender", opcoes: { poder: { valor: "aprenderRitual",
          opcoes: Object.assign({ aprendido: APe.vinculoDeRitual(ritual), elemento: elemento || "energia" }, extra || {}) } } };
      }
      function apFoto(ordem, lista) {
        return JSON.stringify([ordem.escolhas || [], ordem.registrosDeRitual || [], lista.map(function (r) { return r.id; })]);
      }

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem · aquisição — o contexto diz por que se escolhe");

      var aqO = apOcultista(20);
      var aqLista = [];
      var aqConc = APe.contextoDeAquisicao(aqO, { tipo: "concessao", vaga: "d4.ritualClasse" }, { rituais: aqLista });
      t.iguais("a concessão de NEX 20% diz quantos e de que círculo",
        [aqConc.tipo, aqConc.quantidade, aqConc.circulos.join(","), aqConc.origem, aqConc.nomePoder],
        ["concessao", 1, "1", "classe", "Escolhido pelo Outro Lado"]);
      t.ok("  e recusa um ritual de 2º círculo com o motivo",
        !aqConc.avaliar({ circulo: 2, nome: "X" }).ok && /aceita 1º círculo/.test(aqConc.avaliar({ circulo: 2 }).motivo));

      var aqOcup = apOcultista(20);
      var aqOcupL = [apRitual("Luz")];
      APe.confirmarAquisicao(aqOcup, aqOcupL, { tipo: "concessao", vaga: "d1.rituaisIniciais", rituais: [aqOcupL[0].id] });
      var aqOcupC = APe.contextoDeAquisicao(aqOcup, { tipo: "concessao", vaga: "d2.ritualClasse" }, { rituais: aqOcupL });
      var aqOcupT = aqOcupC.avaliar({ ritualId: aqOcupL[0].id, circulo: 1, nome: "Luz" });
      t.ok("um ritual que já é de outra aquisição aparece como ocupado, com o motivo",
        !aqOcupT.ok && aqOcupT.estado === "ocupado" && /Rituais iniciais|Escolhido pelo Outro Lado/.test(aqOcupT.motivo));
      t.igual("  e na própria aquisição, como escolhido",
        APe.contextoDeAquisicao(aqOcup, { tipo: "concessao", vaga: "d1.rituaisIniciais" }, { rituais: aqOcupL })
          .avaliar({ ritualId: aqOcupL[0].id, circulo: 1 }).estado, "escolhido");

      var aqAp = APe.contextoDeAquisicao(apOcultista(45, "", 2), { tipo: "aprenderRitual", vaga: "d3.poderClasse" }, { rituais: [] });
      t.iguais("Aprender Ritual numa vaga de NEX 15% alcança o 1º círculo, mesmo num personagem de NEX 45%",
        [aqAp.circulos.join(","), aqAp.contaNoLimite, aqAp.limite.total], ["1", true, 2]);
      t.igual("  a vaga de NEX 45% alcança o 2º",
        APe.contextoDeAquisicao(apOcultista(45, "", 2), { tipo: "aprenderRitual", vaga: "d9.poderClasse" }, { rituais: [] }).circulos.join(","), "1,2");

      t.igual("sem a regra de campo, não existe aquisição por estudo",
        APe.contextoDeAquisicao(apOcultista(20), { tipo: "campo" }, { rituais: [] }), null);
      var aqCampoO = apOcultista(30);
      aqCampoO.opcionais = { aprendizadoEmCampo: true };
      var aqCampo = APe.contextoDeAquisicao(aqCampoO, { tipo: "campo" }, { rituais: [] });
      t.ok("com ela, o estudo aceita os círculos a que o personagem tem acesso AGORA e pede confirmação",
        aqCampo.circulos.join(",") === "1,2" && aqCampo.exigeConfirmacao === true && aqCampo.quantidade === null);
      var aqCombCampo = apClasse("combatente", 30);
      aqCombCampo.opcionais = { aprendizadoEmCampo: true };
      t.igual("  e não existe para quem não é ocultista", APe.contextoDeAquisicao(aqCombCampo, { tipo: "campo" }, { rituais: [] }), null);
      t.ok("a concessão da mesa aceita qualquer círculo, como exceção declarada",
        APe.contextoDeAquisicao(aqO, { tipo: "mesa" }, { rituais: [] }).avaliar({ circulo: 4 }).ok);

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem · aquisição — gravar é uma operação só");

      var gO = apOcultista(5);
      var gLista = [];
      var gAlto = apRitual("Canalizar o Medo");
      var gLuz = apRitual("Luz");
      var gAntes = apFoto(gO, gLista);
      var gRuim = APe.confirmarAquisicao(gO, gLista, { tipo: "concessao", vaga: "d1.rituaisIniciais", rituais: [gLuz.id, gAlto.id], novos: [gLuz, gAlto] });
      t.ok("uma operação com um ritual que não cabe é recusada inteira", !gRuim.ok && /4º/.test(gRuim.motivos.join(" ")));
      t.igual("  e nada muda: nem escolha, nem ritual, nem o que cabia", apFoto(gO, gLista), gAntes);

      var gBom = APe.confirmarAquisicao(gO, gLista, { tipo: "concessao", vaga: "d1.rituaisIniciais", rituais: [gLuz.id], novos: [gLuz] });
      t.ok("a operação válida entra", gBom.ok && gLista.length === 1);
      APe.confirmarAquisicao(gO, gLista, { tipo: "concessao", vaga: "d1.rituaisIniciais", rituais: [gLuz.id], novos: [gLuz] });
      APe.confirmarAquisicao(gO, gLista, { tipo: "concessao", vaga: "d1.rituaisIniciais", rituais: [gLuz.id], novos: [gLuz] });
      t.igual("repetir a mesma confirmação não duplica ritual", gLista.length, 1);
      t.igual("  nem escolha", gO.escolhas.length, 1);

      var gSobra = apRitual("Cicatrização");
      APe.confirmarAquisicao(gO, gLista, { tipo: "concessao", vaga: "d1.rituaisIniciais", rituais: [gLuz.id], novos: [gSobra] });
      t.igual("cópia montada e não usada não entra na ficha", gLista.length, 1);

      var gDois = [apRitual("Cicatrização"), apRitual("Ouvir os Sussurros")];
      var gO2 = apOcultista(20);
      var gLista2 = [];
      var gLote = APe.confirmarAquisicao(gO2, gLista2, [
        { tipo: "concessao", vaga: "d1.rituaisIniciais", rituais: [gDois[0].id], novos: [gDois[0]] },
        { tipo: "concessao", vaga: "d2.ritualClasse", rituais: [gDois[0].id] },
      ]);
      t.ok("um lote em que duas concessões disputam o mesmo ritual é recusado inteiro",
        !gLote.ok && gLista2.length === 0 && (gO2.escolhas || []).length === 0);

      var gReg = APe.confirmarAquisicao(gO2, gLista2, { tipo: "registro", novos: [gDois[1]] });
      t.ok("só registrar põe o ritual na ficha sem aquisição", gReg.ok && gLista2.length === 1 &&
        !APe.estado(gO2, { rituais: gLista2 }).rituais.porRitual[gDois[1].id]);
      t.igual("  e nenhuma pendência é resolvida por isso",
        APe.estado(gO2, { rituais: gLista2 }).pendencias.filter(function (x) { return x.tipo === "rituais"; }).length, 4);

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem · aquisição — Transcender → Aprender Ritual");

      [["combatente", "Combatente"], ["especialista", "Especialista"], ["ocultista", "Ocultista"]].forEach(function (par) {
        var o = apClasse(par[0], 15, 2);
        var l = [];
        var r = apRitual("Luz");
        var ok = APe.confirmarAquisicao(o, l, { tipo: "escolha", vaga: "d3.poderClasse", candidato: apCandidatoAprender(r), novos: [r] });
        var est = APe.estado(o, { rituais: l });
        t.ok(par[1] + " de NEX 15% aprende um ritual de 1º círculo por Transcender",
          ok.ok && l.length === 1 && !!est.rituais.porRitual[r.id] && est.rituais.porRitual[r.id].nomePoder === "Aprender Ritual");
      });

      var trO = apClasse("combatente", 15, 2);
      var trL = [];
      var trAlto = apRitual("Aprimorar Físico");
      var trR = APe.confirmarAquisicao(trO, trL, { tipo: "escolha", vaga: "d3.poderClasse", candidato: apCandidatoAprender(trAlto, "sangue"), novos: [trAlto] });
      t.ok("um ritual acima do círculo é recusado, e o poder não entra sem ele",
        !trR.ok && trL.length === 0 && (trO.escolhas || []).length === 0);

      var trLim = apClasse("combatente", 45, 1);
      var trLimL = [];
      var trA = apRitual("Luz");
      var trB = apRitual("Cicatrização");
      APe.confirmarAquisicao(trLim, trLimL, { tipo: "escolha", vaga: "d3.poderClasse", candidato: apCandidatoAprender(trA), novos: [trA] });
      var trLimR = APe.confirmarAquisicao(trLim, trLimL, { tipo: "escolha", vaga: "d6.poderClasse", candidato: apCandidatoAprender(trB, "morte"), novos: [trB] });
      t.ok("com Intelecto 1, o segundo Aprender Ritual passa do limite e é recusado",
        !trLimR.ok && /Intelecto \(1/.test(trLimR.motivos.join(" ")) && trLimL.length === 1);

      var trJa = apOcultista(20);
      var trJaL = [apRitual("Luz")];
      APe.confirmarAquisicao(trJa, trJaL, { tipo: "concessao", vaga: "d1.rituaisIniciais", rituais: [trJaL[0].id] });
      var trJaR = APe.confirmarAquisicao(trJa, trJaL, { tipo: "escolha", vaga: "d3.poderClasse", candidato: apCandidatoAprender(trJaL[0]) });
      t.ok("um ritual que já é de outra aquisição não quita Aprender Ritual", !trJaR.ok && /outra aquisição/.test(trJaR.motivos.join(" ")));

      var trSolto = apOcultista(20);
      var trSoltoL = [apRitual("Luz")];
      var trSoltoR = APe.confirmarAquisicao(trSolto, trSoltoL, { tipo: "escolha", vaga: "d3.poderClasse", candidato: apCandidatoAprender(trSoltoL[0]) });
      t.ok("um ritual da ficha sem aquisição ocupa Aprender Ritual sem virar cópia", trSoltoR.ok && trSoltoL.length === 1);

      var trNex = apClasse("especialista", 50, 2);
      trNex.opcionais = { nexExperiencia: true };
      trNex.nivel = 3;
      var trNexL = [];
      var trDois = apRitual("Aprimorar Físico");
      var trNexX50 = APe.confirmarAquisicao(trNex, trNexL, { tipo: "escolha", vaga: "x50.transcender",
        candidato: { valor: "transcender", opcoes: { poder: { valor: "aprenderRitual", opcoes: { aprendido: APe.vinculoDeRitual(trDois), elemento: "sangue" } } } },
        novos: [trDois] });
      t.ok("com nível e NEX separados, Aprender Ritual em NEX de exposição 50% alcança o 2º círculo — no nível 3",
        trNexX50.ok && trNexL.length === 1);
      var trNex25 = apClasse("especialista", 50, 2);
      trNex25.opcionais = { nexExperiencia: true };
      trNex25.nivel = 3;
      var trNex25L = [];
      var trDois25 = apRitual("Aprimorar Físico");
      var trNexX25 = APe.confirmarAquisicao(trNex25, trNex25L, { tipo: "escolha", vaga: "x25.transcender",
        candidato: { valor: "transcender", opcoes: { poder: { valor: "aprenderRitual", opcoes: { aprendido: APe.vinculoDeRitual(trDois25), elemento: "sangue" } } } },
        novos: [trDois25] });
      t.ok("  e a de NEX de exposição 25% continua só no 1º", !trNexX25.ok && trNex25L.length === 0);

      /* Versatilidade → Transcender → Aprender Ritual guarda o ritual a
         sete níveis de profundidade; até a v2.17 a limpeza cortava em 4. */
      var trVers = apOcultista(50, "", 3);
      var trVersL = [];
      var trVersR = apRitual("Luz");
      var trVersOk = APe.confirmarAquisicao(trVers, trVersL, { tipo: "escolha", vaga: "d10.versatilidade",
        candidato: { valor: "poderClasse", opcoes: { poder: { valor: "transcender", opcoes: { poder: { valor: "aprenderRitual",
          opcoes: { aprendido: APe.vinculoDeRitual(trVersR), elemento: "energia" } } } } } },
        novos: [trVersR] });
      var trVersSalvo = APr.normalizar(JSON.parse(JSON.stringify(trVers)));
      t.ok("Versatilidade → Transcender → Aprender Ritual sobrevive a salvar e reabrir",
        trVersOk.ok && !!APe.estado(trVersSalvo, { rituais: trVersL }).rituais.porRitual[trVersR.id]);

      /* "Este poder conta como um poder do elemento do ritual escolhido"
         (OPRPG p.114): o elemento não é escolha livre quando o ritual
         diz o dele. */
      var trEl = apClasse("combatente", 15, 2);
      var trElL = [];
      var trElR = apRitual("Luz");
      var trElRuim = APe.confirmarAquisicao(trEl, trElL, { tipo: "escolha", vaga: "d3.poderClasse",
        candidato: apCandidatoAprender(trElR, "morte"), novos: [trElR] });
      t.ok("Aprender Ritual com um elemento que não é o do ritual é recusado, com o motivo e a página",
        !trElRuim.ok && /Luz é de Energia/.test(trElRuim.motivos.join(" ")) && /p\. 114/.test(trElRuim.motivos.join(" ")) &&
        trElL.length === 0 && (trEl.escolhas || []).length === 0);
      var trElBom = APe.confirmarAquisicao(trEl, trElL, { tipo: "escolha", vaga: "d3.poderClasse",
        candidato: apCandidatoAprender(trElR, "energia"), novos: [trElR] });
      var trElAdq = APe.estado(trEl, { rituais: trElL }).adquiridos.filter(function (a) { return a.chave === "aprenderRitual"; })[0];
      t.ok("  com o elemento do ritual, entra — e conta como poder de Energia",
        trElBom.ok && trElL.length === 1 && !!trElAdq && trElAdq.elemento === "energia");

      /* Uma cópia editada depois — a mesa mudou o elemento do ritual —
         não apaga nada: a escolha passa a mostrar o problema. */
      trElL[0].ordem.elemento = "sangue";
      var trElDepois = APe.estado(trEl, { rituais: trElL });
      var trElAval = Object.keys(trElDepois.avaliacoes).map(function (k) { return trElDepois.avaliacoes[k]; })
        .filter(function (a) { return a && a.vaga && a.vaga.id === "d3.poderClasse"; })[0];
      t.ok("  mudar o elemento da cópia depois marca a escolha, sem apagá-la",
        !!trElAval && !trElAval.valido && /é de Sangue/.test(trElAval.motivos.join(" ")) && trEl.escolhas.length === 1);

      var trElLivre = apClasse("combatente", 15, 2);
      var trElLivreL = [APf.criarRitual(APf.normalizarRitual({ nome: "Ritual da mesa", ordem: { circulo: 1, custo: 1 } }))];
      var trElLivreR = APe.confirmarAquisicao(trElLivre, trElLivreL, { tipo: "escolha", vaga: "d3.poderClasse",
        candidato: apCandidatoAprender(trElLivreL[0], "morte") });
      t.ok("  um ritual sem elemento informado deixa o elemento com quem joga",
        trElLivreR.ok && !!APe.estado(trElLivre, { rituais: trElLivreL }).rituais.porRitual[trElLivreL[0].id]);

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem · aquisição — a troca que Aprender Ritual permite");

      var sbO = apOcultista(20, "", 3);
      var sbL = [];
      var sbIni = [apRitual("Luz"), apRitual("Cicatrização"), apRitual("Ouvir os Sussurros")];
      APe.confirmarAquisicao(sbO, sbL, { tipo: "concessao", vaga: "d1.rituaisIniciais", rituais: sbIni.map(function (r) { return r.id; }), novos: sbIni });
      var sbAprende = apRitual("Amaldiçoar Tecnologia");
      var sbEntra = apRitual("Arma Atroz");
      var sbOk = APe.confirmarAquisicao(sbO, sbL, { tipo: "escolha", vaga: "d3.poderClasse", novos: [sbAprende, sbEntra],
        candidato: apCandidatoAprender(sbAprende, "energia", { substituicao: { sai: { id: sbIni[0].id, nome: sbIni[0].nome }, entra: APe.vinculoDeRitual(sbEntra) } }) });
      var sbEst = APe.estado(sbO, { rituais: sbL });
      t.ok("o ritual que sai deixa de ser conhecido e continua na ficha",
        sbOk.ok && !sbEst.rituais.porRitual[sbIni[0].id] && sbL.some(function (r) { return r.id === sbIni[0].id; }));
      t.ok("  o que entra herda a aquisição do que saiu",
        sbEst.rituais.porRitual[sbEntra.id].concessao === "d1.rituaisIniciais" && !!sbEst.rituais.porRitual[sbEntra.id].substitui);
      t.ok("  a concessão continua completa, sem contar duas vezes", sbEst.rituais.concessoes[0].completa &&
        sbEst.rituais.concessoes[0].escolhidos.length === 3);
      t.ok("  e a ficha registra a troca", !!sbEst.rituais.substituidos[sbIni[0].id]);

      var sbAlto = apOcultista(20, "", 3);
      var sbAltoL = [];
      var sbAltoIni = [apRitual("Luz"), apRitual("Cicatrização"), apRitual("Ouvir os Sussurros")];
      APe.confirmarAquisicao(sbAlto, sbAltoL, { tipo: "concessao", vaga: "d1.rituaisIniciais", rituais: sbAltoIni.map(function (r) { return r.id; }), novos: sbAltoIni });
      var sbAltoAp = apRitual("Amaldiçoar Tecnologia");
      var sbAltoEntra = apRitual("Aprimorar Físico");   /* 2º círculo, no lugar de um inicial de 1º */
      var sbAltoR = APe.confirmarAquisicao(sbAlto, sbAltoL, { tipo: "escolha", vaga: "d3.poderClasse", novos: [sbAltoAp, sbAltoEntra],
        candidato: apCandidatoAprender(sbAltoAp, "energia", { substituicao: { sai: { id: sbAltoIni[1].id, nome: sbAltoIni[1].nome }, entra: APe.vinculoDeRitual(sbAltoEntra) } }) });
      t.ok("o que entra precisa caber na regra do que sai", !sbAltoR.ok && /não cabe no lugar/.test(sbAltoR.motivos.join(" ")));
      t.igual("  e a recusa não deixa nenhum dos dois rituais na ficha", sbAltoL.length, 3);

      var sbMeio = apOcultista(20, "", 3);
      var sbMeioL = [];
      var sbMeioIni = [apRitual("Luz"), apRitual("Cicatrização"), apRitual("Ouvir os Sussurros")];
      APe.confirmarAquisicao(sbMeio, sbMeioL, { tipo: "concessao", vaga: "d1.rituaisIniciais", rituais: sbMeioIni.map(function (r) { return r.id; }), novos: sbMeioIni });
      var sbMeioAp = apRitual("Amaldiçoar Tecnologia");
      var sbMeioR = APe.confirmarAquisicao(sbMeio, sbMeioL, { tipo: "escolha", vaga: "d3.poderClasse", novos: [sbMeioAp],
        candidato: apCandidatoAprender(sbMeioAp, "energia", { substituicao: { sai: { id: sbMeioIni[2].id, nome: sbMeioIni[2].nome } } }) });
      t.ok("uma troca pela metade (só o que sai) não é gravada", !sbMeioR.ok && /o ritual que entra/.test(sbMeioR.motivos.join(" ")));

      /* O grimório guarda o que a mente não guarda (OPRPG p.35): ele não
         é um ritual conhecido para Aprender Ritual trocar. */
      var sbGr = apOcultista(45, "graduado", 3);
      var sbGrL = [];
      var sbGrRit = apRitual("Luz");
      APe.confirmarAquisicao(sbGr, sbGrL, { tipo: "concessao", vaga: "d8.grimorio", rituais: [sbGrRit.id], novos: [sbGrRit] });
      var sbGrEst = APe.estado(sbGr, { rituais: sbGrL });
      t.ok("um ritual do grimório não está entre os que Aprender Ritual pode trocar",
        !!sbGrEst.rituais.porRitual[sbGrRit.id] && sbGrEst.rituais.porRitual[sbGrRit.id].destino === "grimorio" &&
        !APe.conhecidosAntes(sbGr, "d9.poderClasse", { rituais: sbGrL }).some(function (k) { return k.id === sbGrRit.id; }));
      var sbGrNovo = apRitual("Arma Atroz");
      var sbGrEntra = apRitual("Cicatrização");
      var sbGrR = APe.confirmarAquisicao(sbGr, sbGrL, { tipo: "escolha", vaga: "d9.poderClasse", novos: [sbGrNovo, sbGrEntra],
        candidato: apCandidatoAprender(sbGrNovo, "sangue", { substituicao: { sai: { id: sbGrRit.id, nome: sbGrRit.nome }, entra: APe.vinculoDeRitual(sbGrEntra) } }) });
      t.ok("  e a troca que tenta é recusada, com o motivo, sem deixar nada na ficha",
        !sbGrR.ok && /grimório/.test(sbGrR.motivos.join(" ")) && sbGrL.length === 1);

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem · aquisição — estudo em campo precisa de confirmação");

      var ecO = apOcultista(30);
      ecO.opcionais = { aprendizadoEmCampo: true };
      var ecL = [];
      var ecR = apRitual("Luz");
      var ecSem = APe.confirmarAquisicao(ecO, ecL, { tipo: "campo", ritualId: ecR.id, novos: [ecR] });
      t.ok("selecionar o ritual não prova o estudo: sem confirmação, nada entra", !ecSem.ok && ecL.length === 0);
      var ecCom = APe.confirmarAquisicao(ecO, ecL, { tipo: "campo", ritualId: ecR.id, novos: [ecR], confirmado: true, fonte: "selo", nota: "Selo da missão 2" });
      var ecEst = APe.estado(ecO, { rituais: ecL });
      t.ok("com a confirmação, o ritual passa a ser conhecido por estudo",
        ecCom.ok && ecEst.rituais.porRitual[ecR.id].nomePoder === "Estudo em campo" && !ecEst.rituais.porRitual[ecR.id].contaNoLimite);
      t.iguais("  com a fonte e a nota guardadas", [ecO.registrosDeRitual[0].fonte, ecO.registrosDeRitual[0].nota], ["selo", "Selo da missão 2"]);
      var ecAlto = apRitual("Ferver Sangue");
      t.ok("um ritual de círculo sem acesso é recusado",
        !APe.confirmarAquisicao(ecO, ecL, { tipo: "campo", ritualId: ecAlto.id, novos: [ecAlto], confirmado: true }).ok);
      t.ok("o mesmo ritual não é estudado duas vezes",
        !APe.confirmarAquisicao(ecO, ecL, { tipo: "campo", ritualId: ecR.id, confirmado: true }).ok && ecO.registrosDeRitual.length === 1);

      ecO.opcionais = {};
      var ecOff = APe.estado(ecO, { rituais: ecL });
      t.ok("desligar a regra guarda o estudo sem efeito, com o motivo",
        !ecOff.rituais.porRitual[ecR.id] && ecOff.rituais.registros[0].valido === false && /desligado/.test(ecOff.rituais.registros[0].motivo));
      t.igual("  sem apagar o registro", ecO.registrosDeRitual.length, 1);
      ecO.opcionais = { aprendizadoEmCampo: true };
      t.ok("  e religar devolve o efeito", !!APe.estado(ecO, { rituais: ecL }).rituais.porRitual[ecR.id]);

      /* O estudo foi registrado em NEX 30%. Corrigir o NEX para baixo faz
         dele o que uma escolha acima do NEX atual é: guardado, sem efeito. */
      ecO.nex = 20;
      var ecBaixo = APe.estado(ecO, { rituais: ecL });
      t.ok("um estudo de uma etapa que a ficha não alcança mais fica sem efeito, com o motivo",
        !ecBaixo.rituais.porRitual[ecR.id] && ecBaixo.rituais.registros[0].valido === false &&
        /NEX 30%/.test(ecBaixo.rituais.registros[0].motivo) && ecO.registrosDeRitual.length === 1);
      ecO.nex = 30;
      t.ok("  e volta a valer quando a ficha chega lá", !!APe.estado(ecO, { rituais: ecL }).rituais.porRitual[ecR.id]);

      var ecDesfaz = APe.confirmarAquisicao(ecO, ecL, { tipo: "desfazerRegistro", id: ecO.registrosDeRitual[0].id });
      t.ok("desfazer o estudo tira o registro e deixa o ritual como registro",
        ecDesfaz.ok && ecO.registrosDeRitual.length === 0 && ecL.length === 1 && !APe.estado(ecO, { rituais: ecL }).rituais.porRitual[ecR.id]);

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem · aquisição — concessão da mesa é exceção, não atalho");

      var msO = apOcultista(5);
      var msL = [apRitual("Canalizar o Medo")];
      var msR = APe.confirmarAquisicao(msO, msL, { tipo: "mesa", ritualId: msL[0].id, nota: "presente do mestre" });
      var msEst = APe.estado(msO, { rituais: msL });
      t.ok("a mesa pode conceder um ritual fora das regras", msR.ok && msEst.rituais.porRitual[msL[0].id].origem === "mesa");
      t.ok("  marcado como exceção", msEst.rituais.porRitual[msL[0].id].excecao === true);
      t.igual("  e a pendência de progressão continua aberta",
        msEst.pendencias.filter(function (x) { return x.id === "d1.rituaisIniciais"; }).length, 1);

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem · aquisição — Homebrew e ritual escrito à mão");

      var hbO = apOcultista(5);
      var hbComCirculo = APf.criarRitual(APf.normalizarRitual({ nome: "Selo caseiro", ordem: { elemento: "sangue", circulo: 1, custo: 1 } }));
      var hbSem = APf.criarRitual({ nome: "Ritual sem círculo", circulo: "1º círculo" });
      var hbAq = APe.contextoDeAquisicao(hbO, { tipo: "concessao", vaga: "d1.rituaisIniciais" }, { rituais: [] });
      t.ok("um ritual Homebrew com o círculo informado pode ocupar a concessão",
        hbAq.avaliar({ circulo: 1, elemento: "sangue", nome: hbComCirculo.nome }).ok);
      t.ok("  sem o círculo, é recusado com o motivo — o texto livre não é lido como número",
        /não informa o círculo/.test(hbAq.avaliar({ circulo: RAMAOrdemRituais.dadosDoRitual(hbSem).circulo || 0 }).motivo));

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem · aquisição — ficha antiga e arquivos");

      var fvO = apOcultista(20, "", 3);
      var fvR = apRitual("Luz");
      fvO.escolhas = [{ id: "v17", etapa: "d3.poderClasse", tipo: "poderClasse", valor: "transcender", nome: "", ignorarRequisitos: false, registradoEm: "",
        opcoes: { poder: { valor: "aprenderRitual", opcoes: { aprendido: APe.vinculoDeRitual(fvR), elemento: "energia",
          substituido: { id: "fora-da-ficha", nome: "Algum ritual" } } } } }];
      var fvEst = APe.estado(APr.normalizar(JSON.parse(JSON.stringify(fvO))), { rituais: [fvR] });
      t.ok("a troca registrada pela metade na v2.17 não quebra a ficha nem vale como troca",
        !!fvEst.rituais.porRitual[fvR.id] && !Object.keys(fvEst.rituais.substituidos).length);

      /* `registrosDeRitual` é campo novo do bloco de Ordem, e a troca de
         Aprender Ritual é mais funda do que a limpeza da v2.17 alcançava.
         O schema subiu para 9 SEM converter nada: é o que faz uma aba
         aberta na versão anterior recusar a ficha, em vez de gravar por
         cima dela sem esses dados. */
      t.igual("o schema da ficha é 9", APf.VERSAO_SCHEMA, 9);
      var sc8 = APf.normalizarFicha({ nome: "Ficha 8", schemaVersion: 8, tipoFicha: "ordem", ordem: { classe: "ocultista", nex: 20 } });
      t.ok("  uma ficha 8 abre igual, com a lista de registros vazia, e sai no schema 9",
        sc8.schemaVersion === 9 && Array.isArray(sc8.ordem.registrosDeRitual) && !sc8.ordem.registrosDeRitual.length &&
        sc8.ordem.classe === "ocultista" && sc8.ordem.nex === 20);

      if (V) {
        var arqO = apOcultista(30);
        arqO.opcionais = { aprendizadoEmCampo: true };
        var arqL = [apRitual("Luz"), apRitual("Cicatrização")];
        APe.confirmarAquisicao(arqO, arqL, { tipo: "campo", ritualId: arqL[0].id, confirmado: true, fonte: "texto" });
        APe.confirmarAquisicao(arqO, arqL, { tipo: "mesa", ritualId: arqL[1].id });
        var arqFicha = APf.criarFicha({ nome: "Com registros", tipoFicha: "ordem" });
        arqFicha.ordem = arqO;
        arqFicha.rituais.itens = arqL;
        var arqImp = V.importado(JSON.parse(JSON.stringify(V.exportar("personagem", APf.normalizarFicha(JSON.parse(JSON.stringify(arqFicha)))))));
        var arqEst = APe.estado(arqImp.dados.ordem, { rituais: arqImp.dados.rituais.itens });
        t.ok("estudo em campo e concessão da mesa atravessam exportar e importar, nos ids novos",
          arqImp.ok && arqEst.rituais.registros.length === 2 && arqEst.rituais.registros.every(function (x) { return x.valido; }) &&
          arqImp.dados.rituais.itens.every(function (r) { return !!arqEst.rituais.porRitual[r.id]; }));

        var arqTorto = JSON.parse(JSON.stringify(V.exportar("personagem", APf.normalizarFicha(JSON.parse(JSON.stringify(arqFicha))))));
        arqTorto.dados.rituais.itens.reverse();
        var arqTortoImp = V.importado(arqTorto);
        var arqTortoEst = APe.estado(arqTortoImp.dados.ordem, { rituais: arqTortoImp.dados.rituais.itens });
        t.ok("  e numa lista embaralhada o registro não é refeito no palpite",
          arqTortoEst.rituais.registros.every(function (x) { return !x.valido; }) && arqTortoImp.dados.ordem.registrosDeRitual.length === 2);
      }

      /* ---------------------------------------------------------------- */
      t.grupo("Ordem · aquisição — trocar regra não apaga, e recalcular não concede");

      var trR2 = apOcultista(40);
      var trR2L = [];
      var trR2Rit = [apRitual("Luz"), apRitual("Cicatrização")];
      APe.confirmarAquisicao(trR2, trR2L, [
        { tipo: "concessao", vaga: "d2.ritualClasse", rituais: [trR2Rit[0].id], novos: [trR2Rit[0]] },
        { tipo: "concessao", vaga: "d3.ritualClasse", rituais: [trR2Rit[1].id], novos: [trR2Rit[1]] },
      ]);
      trR2.opcionais = { limitesCompreensao: true };
      var trR2Lento = APe.estado(trR2, { rituais: trR2L });
      t.ok("com o aprendizado lento, a escolha do degrau par fica guardada fora, e a do ímpar continua",
        !trR2Lento.rituais.porRitual[trR2Rit[0].id] && !!trR2Lento.rituais.porRitual[trR2Rit[1].id] &&
        trR2Lento.fora.some(function (f) { return f.registro.etapa === "d2.ritualClasse"; }));
      t.igual("  sem apagar ritual nenhum", trR2L.length, 2);
      trR2.opcionais = {};
      t.ok("  e desligar devolve tudo", !!APe.estado(trR2, { rituais: trR2L }).rituais.porRitual[trR2Rit[0].id]);
      var trR2Foto = apFoto(trR2, trR2L);
      for (var ri = 0; ri < 3; ri++) APe.estado(trR2, { rituais: trR2L.slice() });
      t.igual("recalcular três vezes não muda nada gravado", apFoto(trR2, trR2L), trR2Foto);

      /* Tirar um ritual da ficha leva junto os vínculos DIRETOS a ele; o
         de uma escolha de poder fica, para a Progressão pedir revisão. */
      var esO = apOcultista(20, "", 3);
      esO.opcionais = {};
      var esL = [];
      var esR = [apRitual("Luz"), apRitual("Cicatrização"), apRitual("Canalizar o Medo")];
      APe.confirmarAquisicao(esO, esL, { tipo: "concessao", vaga: "d1.rituaisIniciais", rituais: [esR[0].id], novos: [esR[0]] });
      APe.confirmarAquisicao(esO, esL, { tipo: "escolha", vaga: "d3.poderClasse", candidato: apCandidatoAprender(esR[1], "morte"), novos: [esR[1]] });
      APe.confirmarAquisicao(esO, esL, { tipo: "registro", novos: [esR[2]] });
      APe.confirmarAquisicao(esO, esL, { tipo: "mesa", ritualId: esR[2].id });
      t.igual("antes de esquecer, a mesa concedeu um ritual", esO.registrosDeRitual.length, 1);
      APe.esquecerRitual(esO, esR[0].id);
      APe.esquecerRitual(esO, esR[1].id);
      APe.esquecerRitual(esO, esR[2].id);
      t.ok("esquecer um ritual tira o vínculo da concessão e o registro da mesa",
        !esO.escolhas.some(function (r) { return r.etapa === "d1.rituaisIniciais"; }) && esO.registrosDeRitual.length === 0);
      var esEst = APe.estado(esO, { rituais: [] });
      t.ok("  e a escolha de Aprender Ritual fica, pedindo revisão",
        esO.escolhas.some(function (r) { return r.etapa === "d3.poderClasse"; }) &&
        esEst.pendencias.some(function (p) { return p.id === "d3.poderClasse" && p.situacao === "invalida"; }));

      var paO = apOcultista(40);
      paO.opcionais = { evolucaoPatentes: true };
      t.ok("com Evolução por Patentes, a ficha avisa que o trilho por patente não é calculado",
        APe.estado(paO, { rituais: [] }).rituais.avisos.some(function (a) { return /dois a cada nova patente/.test(a); }));
    }

    /* =================================================================
       MIGRAÇÃO — FICHA ANTIGA (schema 1)
       ================================================================= */

    if (S) {
      t.grupo("Ficha antiga continua abrindo");

      /* Exatamente o que a versão 1 gravava: sem habilidades, sem
         rituais, e com itens sem categoria. */
      var antiga = S.normalizarFicha({
        schemaVersion: 1,
        nome: "Michael",
        classe: "Combatente",
        atributos: [{ id: "a1", nome: "Força", sigla: "FOR", valor: 2, dado: "1d20" }],
        status: [{ id: "s1", nome: "PV", atual: 10, maximo: 20 }],
        pericias: [{ id: "p1", nome: "Luta", atributoId: "a1", bonus: 2, bonusTemporario: 0, dadosExtras: [] }],
        inventario: { limite: 5, itens: [
          { id: "i1", tipo: "arma", nome: "Espada", peso: 1, dano: "2d10", critico: 18, multiplicador: 2 },
          { id: "i2", tipo: "item", nome: "Corda", peso: 2 },
        ] },
        anotacoes: { pastas: [], soltas: [{ id: "n1", titulo: "Nota", conteudo: "texto" }] },
      });

      t.igual("a ficha subiu para o schema atual", antiga.schemaVersion, S.VERSAO_SCHEMA);
      t.igual("o nome sobreviveu", antiga.nome, "Michael");
      t.igual("os atributos sobreviveram", antiga.atributos[0].sigla, "FOR");
      t.igual("os ids antigos foram preservados", antiga.atributos[0].id, "a1");
      t.igual("o status sobreviveu", antiga.status[0].atual, 10);
      t.igual("a perícia continua ligada ao atributo", antiga.pericias[0].atributoId, "a1");
      t.igual("a anotação sobreviveu", antiga.anotacoes.soltas[0].conteudo, "texto");
      t.igual("o inventário sobreviveu", antiga.inventario.itens.length, 2);
      t.igual("a arma manteve o dano", antiga.inventario.itens[0].dano, "2d10");

      t.ok("ganhou habilidades vazias", !!antiga.habilidades && Array.isArray(antiga.habilidades.filhos));
      t.igual("  e nenhuma habilidade inventada", antiga.habilidades.filhos.length, 0);
      t.ok("ganhou rituais padrão", !!antiga.rituais);
      t.igual("  com o rótulo padrão", antiga.rituais.rotuloSecao, "Rituais");
      t.igual("  e nenhum ritual inventado", antiga.rituais.itens.length, 0);

      t.igual("item antigo ganhou categoria vazia", antiga.inventario.itens[0].categoria, "");
      t.igual("  e não uma categoria inventada", antiga.inventario.itens[1].categoria, "");

      t.grupo("Categorias no inventário");

      var inv = { limite: 0, itens: [
        S.criarItem("item", { nome: "Bandagem", categoria: "Consumível", peso: 0 }),
        S.criarItem("item", { nome: "Poção", categoria: " consumível ", peso: 0 }),
        S.criarItem("item", { nome: "Soro", categoria: "CONSUMÍVEL", peso: 0 }),
        S.criarItem("arma", { nome: "Faca", categoria: "Corpo a corpo", peso: 1 }),
        S.criarItem("item", { nome: "Anônimo", peso: 1 }),
      ] };

      var cats = S.categoriasDe(inv);
      t.igual("três grafias de 'consumível' viram UMA categoria", cats.length, 3);
      t.igual("  e o grupo tem os três itens",
        cats.filter(function (c) { return c.chave === S.chaveDeCategoria("Consumível"); })[0].quantidade, 3);
      t.igual("o rótulo mostrado preserva a grafia de quem escreveu",
        cats[0].rotulo, "Consumível");
      t.igual("sem categoria vai para o fim", cats[cats.length - 1].rotulo, "Sem categoria");

      t.grupo("Filtro por categoria");

      var chaveCons = S.chaveDeCategoria("Consumível");
      var filtrados = inv.itens.filter(function (i) { return S.itemNaCategoria(i, chaveCons); });
      t.igual("o filtro pega as três grafias", filtrados.length, 3);

      t.ok("o filtro usa a categoria, não a descrição",
        !inv.itens.filter(function (i) { return S.itemNaCategoria(i, S.chaveDeCategoria("Corpo a corpo")); })
          .some(function (i) { return i.nome === "Bandagem"; }));

      t.igual("sem filtro, todos passam",
        inv.itens.filter(function (i) { return S.itemNaCategoria(i, ""); }).length, 5);

      t.igual("filtrar por 'sem categoria' pega só o que não tem",
        inv.itens.filter(function (i) { return S.itemNaCategoria(i, S.CATEGORIA_VAZIA); }).length, 1);

      t.grupo("Categoria vale para TODOS os tipos de item");

      S.TIPOS_ITEM.forEach(function (tipo) {
        var it = S.criarItem(tipo, { nome: "X", categoria: "Teste" });
        t.igual("  " + tipo + " aceita categoria", it.categoria, "Teste");
      });
    }

    /* =================================================================
       VERSIONAMENTO
       ================================================================= */

    if (Ver) {
      t.grupo("Versionamento — fonte única");

      t.ok("existe changelog", Array.isArray(Ver.changelog) && Ver.changelog.length > 0);
      t.ok("a versão atual É o primeiro registro", Ver.atual === Ver.changelog[0]);
      t.igual("o rótulo deriva do topo", Ver.rotulo,
        "v" + Ver.changelog[0].versao + " — " + Ver.changelog[0].codinome);
      t.igual("o número deriva do topo", Ver.numero, Ver.changelog[0].versao);
      t.igual("o codinome deriva do topo", Ver.codinome, Ver.changelog[0].codinome);

      t.grupo("Versionamento — formato SemVer");

      Ver.changelog.forEach(function (r) {
        t.ok("v" + r.versao + " tem três segmentos numéricos",
          /^\d+\.\d+\.\d+$/.test(r.versao));
        t.ok("  sem letra e sem sufixo", !/[a-zA-Z]/.test(r.versao));
        t.ok("  data em DD/MM/AAAA", /^\d{2}\/\d{2}\/\d{4}$/.test(r.data));
        t.ok("  codinome numa palavra, em maiúsculas: " + r.codinome,
          /^[A-ZÀ-Ú]+$/.test(r.codinome));
      });

      t.grupo("Versionamento — ordem e unicidade");

      var codinomes = Ver.changelog.map(function (r) { return r.codinome; });
      t.igual("nenhum codinome se repete", new Set(codinomes).size, codinomes.length);

      var versoes = Ver.changelog.map(function (r) { return r.versao; });
      t.igual("nenhuma versão se repete", new Set(versoes).size, versoes.length);

      function ordem(v) {
        var p = v.split(".").map(Number);
        return p[0] * 1000000 + p[1] * 1000 + p[2];
      }

      var decrescente = true;
      for (var i = 1; i < Ver.changelog.length; i++) {
        if (ordem(Ver.changelog[i - 1].versao) <= ordem(Ver.changelog[i].versao)) decrescente = false;
      }
      t.ok("da mais recente para a mais antiga", decrescente);

      t.grupo("Versionamento — os números de baixo zeram");

      for (var j = 1; j < Ver.changelog.length; j++) {
        var nova = Ver.changelog[j - 1].versao.split(".").map(Number);
        var velha = Ver.changelog[j].versao.split(".").map(Number);

        if (nova[0] > velha[0]) {
          t.igual("MAJOR " + Ver.changelog[j - 1].versao + ": minor zerou", nova[1], 0);
          t.igual("MAJOR " + Ver.changelog[j - 1].versao + ": patch zerou", nova[2], 0);
        } else if (nova[1] > velha[1]) {
          t.igual("MINOR " + Ver.changelog[j - 1].versao + ": patch zerou", nova[2], 0);
        }
      }

      t.grupo("Versionamento — changelog sem categoria vazia");

      Ver.changelog.forEach(function (r) {
        Object.keys(r.mudancas || {}).forEach(function (cat) {
          t.ok("v" + r.versao + " · " + cat + " tem conteúdo",
            Array.isArray(r.mudancas[cat]) && r.mudancas[cat].length > 0);
          t.ok("  " + cat + " é uma categoria conhecida",
            Ver.categorias.indexOf(cat) >= 0);
        });
      });

      t.grupo("Versionamento — não se confunde com os outros números");

      if (S) {
        t.ok("schemaVersion da ficha é independente da versão do app",
          S.VERSAO_SCHEMA !== Ver.numero);
      }
      t.ok("versaoFormato da importação é independente",
        String((global.RAMA_CONFIG || {}).VERSAO_FORMATO) !== Ver.numero);
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
