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
      t.iguais("os cinco campos padrão",
        S.CAMPOS_RITUAL, ["circulo", "alcance", "duracao", "alvo", "efeito"]);
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
        ["alcance", "alvo", "circulo", "duracao", "efeito", "id", "nome", "versoes"]);

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

      t.igual("dez regras opcionais", OP.REGRAS.length, 10);
      t.ok("todas com fonte e página",
        OP.REGRAS.every(function (r) { return r.fonte && r.pagina > 0; }));
      t.ok("todas com resumo e efeito",
        OP.REGRAS.every(function (r) { return r.resumo && r.efeito; }));

      var fichaLimpa = R2.fichaVazia();
      t.igual("nenhuma começa ligada", OP.ligadas(fichaLimpa).length, 0);
      t.ok("as que não mexem na ficha estão marcadas",
        OP.regra("combateNarrativo").afetaFicha === false);
      t.ok("  e as que mexem também", OP.regra("nexExperiencia").afetaFicha === true);

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
