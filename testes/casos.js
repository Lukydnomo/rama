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
      t.igual("quinze trilhas", OC.TRILHAS.length, 15);
      t.igual("cinco por classe", OC.trilhasDaClasse("combatente").length, 5);
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
