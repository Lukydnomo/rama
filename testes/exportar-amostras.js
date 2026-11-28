/* =====================================================================
   R.A.M.A. — fichas sintéticas para testar a exportação em PDF/PNG
   ---------------------------------------------------------------------
   Uma ficha de cada sistema, montada pelos próprios motores (nada de
   dado real). Usado por testes/executar-exportar.js e, no navegador,
   para conferir os modelos:
     var s = document.createElement("script");
     s.src = "/testes/exportar-amostras.js"; document.head.appendChild(s);
     RAMAExportarAmostras.todas()  →  { ordem: ficha, vampiro: ficha, … }
   `longa` acrescenta muitas habilidades, itens e textos (continuação).
   ===================================================================== */

(function (global) {
  "use strict";

  function F() { return global.RAMAFicha; }
  var TEXTO_LONGO = "Uma descrição comprida, de propósito, para ver o texto passar de uma caixa para a seguinte e para as páginas de continuação sem ser cortado nem ficar ilegível. ";

  function repetir(n, fn) { var r = []; for (var i = 0; i < n; i++) r.push(fn(i)); return r; }

  function comExtras(f, longa) {
    f.anotacoes = { pastas: [{ id: "p1", nome: "Sessões", notas: [{ id: "n1", titulo: "Sessão 1", conteudo: "Chegamos à cidade.\nNinguém fala do farol." }] }], soltas: [{ id: "n2", titulo: "Aparência", conteudo: "Cabelo curto, cicatriz no queixo." }] };
    if (longa) {
      f.anotacoes.soltas = f.anotacoes.soltas.concat(repetir(12, function (i) { return { id: "nl" + i, titulo: "Nota longa " + (i + 1), conteudo: repetir(6, function () { return TEXTO_LONGO; }).join("") }; }));
    }
    return f;
  }

  function ordem(longa) {
    var R = global.RAMAOrdemRegras;
    var f = F().criarFicha({ tipoFicha: "ordem", nome: "Helena Duarte" });
    var o = f.ordem;
    o.classe = "combatente"; o.origem = "academico"; o.nex = 25; o.trilha = "aniquilador";
    o.atributos = { agi: 2, "for": 3, "int": 1, pre: 1, vig: 2 };
    o.pericias = { luta: "treinado", fortitude: "treinado", reflexos: "treinado", pontaria: "treinado", ciencias: "treinado", investigacao: "treinado" };
    f.inventario.itens = [
      F().criarItem("arma", { nome: "Machete", dano: "1d6", critico: 19, multiplicador: 2, ordem: { arma: { tipo: "corpoACorpo" }, categoria: 0, espacos: 1 } }),
      F().criarItem("item", { nome: "Lanterna", descricao: "Ilumina 9 m." }),
    ];
    f.habilidades = { filhos: [{ id: "h1", tipo: "habilidade", nome: "Faro para encrenca", texto: "Criada à mão pela mesa." }] };
    if (longa) {
      f.habilidades.filhos = f.habilidades.filhos.concat(repetir(30, function (i) { return { id: "hl" + i, tipo: "habilidade", nome: "Habilidade extra " + (i + 1), texto: TEXTO_LONGO + TEXTO_LONGO }; }));
      f.inventario.itens = f.inventario.itens.concat(repetir(25, function (i) { return F().criarItem(i % 3 ? "item" : "arma", { nome: "Item " + (i + 1), dano: "1d8", descricao: TEXTO_LONGO }); }));
    }
    if (R && R.normalizar) f.ordem = R.normalizar(o);
    return comExtras(f, longa);
  }

  function ordem2() {
    var f = F().criarFicha({ tipoFicha: "ordem2", nome: "Alan" });
    f.ordem2 = global.RAMAOrdem2.dePreset("alan");
    return comExtras(f);
  }

  function oblivio(longa) {
    var C = global.RAMAOblivioCatalogo, R = global.RAMAOblivio;
    var o = R.fichaVazia(), pap = C.PAPEIS[0];
    o.papel = pap.chave;
    Object.assign(o.atributos, { carne: 3, forca: 2, fuga: 2, determinacao: 2, mente: 1 });
    o.especializacoes = pap.lista.slice(0, 3).map(function (k) { return { conhecimento: k, origem: "papel" }; });
    o.habilidades = C.HABILIDADES.filter(function (h) { return h.papel === pap.chave; }).slice(0, 3).concat(C.HABILIDADES.filter(function (h) { return h.tipo === "geral"; }).slice(0, longa ? 6 : 2)).map(function (h) { return { chave: h.chave }; });
    o.motivacao = { chave: C.MOTIVACOES[1].chave, texto: "Pelo irmão que sumiu.", abandonada: false };
    o.inventario.itens = C.EQUIPAMENTOS.slice(0, longa ? 30 : 4).map(function (e) { return { chave: e.chave, nome: e.nome, estado: "guardado" }; });
    var f = F().criarFicha({ tipoFicha: "oblivio", nome: "Dora Vasconcelos" });
    f.oblivio = R.normalizar(o);
    return comExtras(f, longa);
  }

  function vampiro() {
    var R = global.RAMAVampiro, o = R.fichaVazia("vampiro");
    Object.assign(o, { conceito: "Punk", cla: "brujah", senhor: "Ana", geracao: 13, idade: "neofito", ambicao: "Derrubar o Príncipe", desejo: "Uma briga" });
    Object.assign(o.atributos, { forca: 4, destreza: 3, vigor: 3, carisma: 3, manipulacao: 2, autocontrole: 2, inteligencia: 2, raciocinio: 2, determinacao: 1 });
    Object.assign(o.habilidades, { briga: 4, atletismo: 3, intimidacao: 3, manha: 3, persuasao: 2, furtividade: 2, armasBrancas: 2, conducao: 1, percepcao: 1, sobrevivencia: 1 });
    o.especializacoes.push({ id: "e1", habilidade: "briga", nome: "Membros", origem: "criacao" });
    o.disciplinas = { potencia: 2, celeridade: 1 };
    o.poderes = [{ id: "p1", chave: "corpoLetal", origem: "criacao" }, { id: "p2", chave: "poderio", origem: "criacao" }, { id: "p3", chave: "reflexosRapidos", origem: "criacao" }];
    o.vantagens.push({ id: "v1", chave: "recursos", pontos: 2, origem: "criacao" });
    o.convicoes = [{ id: "c1", texto: "Nunca abandonar um amigo" }];
    o.pilares = [{ id: "pl1", nome: "Marta, a irmã", convicaoId: "c1", estado: "vivo" }];
    o.vitalidade = { superficial: 2, agravado: 1 };
    o.fome = 2; o.maculas = 1; o.criacao.concluida = true;
    var f = F().criarFicha({ tipoFicha: "vampiro", nome: "Iara Monteiro" });
    f.vampiro = R.normalizar(o);
    return comExtras(f);
  }

  function goblins() {
    var G = global.RAMAGoblins, C = global.RAMAGoblinsCatalogo, g = G.fichaVazia();
    g.ocupacao = Object.keys(C.OCUPACOES)[0]; g.descritor = Object.keys(C.DESCRITORES)[0];
    g.caracteristicas = Object.keys(C.CARACTERISTICAS).slice(0, 2).map(function (k) { return { chave: k }; });
    g.nivel = 2; g.ferimentos = 1;
    g.itens = [{ nome: "Espada enferrujada", categoria: "arma", chave: Object.keys(C.ARMAS)[0], equipado: true }, { nome: "Corda", categoria: "equipamento", nota: "Dez metros, meio podre." }];
    var f = F().criarFicha({ tipoFicha: "goblins", nome: "Gnarsh" });
    f.goblins = G.normalizar(g);
    return comExtras(f);
  }

  function brutal() {
    var B = global.RAMABrutal, b = B.fichaVazia();
    b.arquetipo = "atleta"; b.pronomes = "ela/dela"; b.interprete = "Jogadora 1";
    b.apegos = { item: { nome: "Apito do treinador", texto: "Presente do pai." }, relacao: { nome: "Camila", texto: "A melhor amiga." }, desejo: { texto: "Quer que o técnico desapareça.", revelado: false } };
    b.detalhes = { aparencia: "Alta, rabo de cavalo.", historia: "Capitã do time de vôlei.", notas: "" };
    b.treino = { sobreviventes: { s1: { nome: "Bia", arquetipo: "atleta", pilha: 4, pt: 3, fuga: 2, sequelas: 1, marcadores: [{ tipo: "condicao", nome: "Torção", valor: 3 }], recursos: [{ nome: "Lanterna", usos: 2 }] } } };
    var f = F().criarFicha({ tipoFicha: "brutal", nome: "Bia Teixeira" });
    f.brutal = B.normalizar(b);
    return comExtras(f);
  }

  function tormenta20() {
    var T = global.RAMATormenta20, t = T.fichaVazia();
    t.atributosBase = { "for": 2, des: 1, con: 2, "int": 0, sab: 1, car: -1 };
    t.raca.id = global.RAMATormenta20Racas.RACAS[0].id;
    t.origem.id = global.RAMATormenta20Origens.ORIGENS[0].id;
    t.niveis = [{ classe: global.RAMATormenta20Classes.CLASSES[0].id, escolhas: {} }];
    t.inventario.itens = [{ ref: "espadaLonga", nome: "Espada longa", estado: "empunhado", mao: "principal" }, { nome: "Corda (15m)", estado: "mochila" }];
    var f = F().criarFicha({ tipoFicha: "tormenta20", nome: "Sir Aldric" });
    f.tormenta20 = T.normalizar(t);
    return comExtras(f);
  }

  function universal(longa) {
    var u = F().criarFicha({ tipoFicha: "universal", nome: "Capitã Rhea" });
    u.classe = "Exploradora"; u.origem = "Nave Aurora";
    u.atributos.forEach(function (a, i) { a.valor = i + 1; });
    u.status.forEach(function (s, i) { s.atual = 10 + i; s.maximo = 12 + i; });
    u.pericias.forEach(function (p, i) { p.bonus = i % 4; });
    u.defesa.dt = 14;
    u.inventario.itens = [F().criarItem("arma", { nome: "Pistola de plasma", dano: "2d6", critico: 19 }), F().criarItem("item", { nome: "Kit médico", descricao: "Três usos." })];
    u.camposCustomizados = [{ id: "c1", natureza: "informacao", nome: "Nave", valor: "Aurora, classe corveta" }];
    u.rituais.rotuloSecao = "Tecnomagias";
    if (longa) u.inventario.itens = u.inventario.itens.concat(repetir(40, function (i) { return F().criarItem("item", { nome: "Peça " + (i + 1), descricao: TEXTO_LONGO }); }));
    return comExtras(u, longa);
  }

  function todas(longa) {
    return { ordem: ordem(longa), ordem2: ordem2(), oblivio: oblivio(longa), vampiro: vampiro(), goblins: goblins(), brutal: brutal(), tormenta20: tormenta20(), universal: universal(longa) };
  }

  global.RAMAExportarAmostras = { todas: todas, ordem: ordem, ordem2: ordem2, oblivio: oblivio, vampiro: vampiro, goblins: goblins, brutal: brutal, tormenta20: tormenta20, universal: universal, TEXTO_LONGO: TEXTO_LONGO };
})(typeof window !== "undefined" ? window : globalThis);
