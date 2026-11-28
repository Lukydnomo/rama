/* =====================================================================
   R.A.M.A. — fichas de demonstração (tutorial inicial e Ajuda)
   ---------------------------------------------------------------------
   RAMAAjudaDemos.ficha(sistema) → Promise<{ ficha, foto }>

   A ficha Universal do tutorial inicial é montada aqui, a cada abertura
   (refazer o tutorial dá uma demonstração nova, com ids novos). As dos
   outros sistemas foram geradas pelos próprios motores e moram em
   assets/ajuda/demos/<sistema>.json (testes/gerar-demos-ajuda.js),
   carregadas só quando alguém abre aquele percurso.

   Personagens FICTÍCIOS. Nenhuma ficha daqui é gravada: a página de
   demonstração recusa toda gravação.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  function F() { return global.RAMAFicha; }
  function H() { return global.RAMAHabilidades; }

  var SISTEMAS_COM_DEMO = ["ordem", "ordem2", "oblivio", "vampiro", "goblins", "brutal", "tormenta20"];

  /* Rafa Duarte: investigador(a) de uma mesa de mistério urbano qualquer.
     Atributos, recursos, perícias, habilidades e itens contam a mesma
     história — e nada aqui é regra de livro: é o modelo Universal. */
  function universal() {
    var base = F().criarFicha({
      tipoFicha: "universal",
      nome: "Rafa Duarte",
      classe: "Detetive particular",
      origem: "Ex-jornalista",
    });

    var valores = { FOR: 1, AGI: 2, PRE: 2, INT: 3, VIG: 1 };
    var porSigla = {};
    base.atributos.forEach(function (a) {
      a.valor = valores[a.sigla] || 0;
      a.dado = (valores[a.sigla] || 1) + "d20";
      porSigla[a.sigla] = a.id;
    });

    var recursos = { PV: [16, 20], PE: [6, 8], Sanidade: [12, 15] };
    base.status.forEach(function (s) {
      var r = recursos[s.nome];
      if (r) { s.atual = r[0]; s.maximo = r[1]; }
    });

    function pericia(nome, sigla, bonus) {
      return { id: U.uuid(), nome: nome, atributoId: porSigla[sigla], bonus: bonus, bonusTemporario: 0, dadosExtras: [], formula: "", contagem: "maior" };
    }
    base.pericias = [
      pericia("Investigação", "INT", 5),
      pericia("Percepção", "PRE", 5),
      pericia("Diplomacia", "PRE", 2),
      pericia("Furtividade", "AGI", 3),
      pericia("Medicina", "INT", 2),
      pericia("Pontaria", "AGI", 2),
      pericia("Luta", "FOR", 1),
      pericia("Vontade", "PRE", 3),
    ];
    var pontaria = base.pericias[5].id;

    var talentos = H().criarPasta("Talentos de investigação");
    talentos.filhos.push(H().criarHabilidade({
      nome: "Olho para detalhes", origem: "Ex-jornalista",
      texto: "Uma vez por cena, quando examinar um lugar com calma, a mesa diz um detalhe que passou despercebido aos outros.",
    }));
    talentos.filhos.push(H().criarHabilidade({
      nome: "Contatos na imprensa", origem: "Ex-jornalista",
      texto: "Pode pedir a um antigo colega de redação uma informação pública difícil de achar. Leva um dia e deixa um favor em aberto.",
    }));
    base.habilidades = { filhos: [
      talentos,
      H().criarHabilidade({
        nome: "Persistente", origem: "Detetive particular", cor: "#3b7d5a",
        texto: "Quando um teste de Investigação falhar, gaste 1 PE para rolar de novo e ficar com o melhor resultado.",
      }),
    ] };

    base.inventario = {
      limite: 12,
      itens: [
        { tipo: "item", nome: "Caderno de anotações", categoria: "Investigação", peso: 0.5,
          descricao: "Datas, nomes e um mapa rabiscado do bairro antigo. Algumas páginas estão manchadas de café." },
        { tipo: "item", nome: "Lanterna tática", categoria: "Investigação", peso: 1,
          descricao: "Ilumina um cone curto. Pilhas para uma noite." },
        { tipo: "item", nome: "Kit de primeiros socorros", categoria: "Consumível", peso: 1,
          descricao: "Ataduras e antisséptico para três usos. Combina com a perícia Medicina." },
        { tipo: "arma", nome: "Revólver .38", categoria: "Arma", peso: 1, periciaId: pontaria, dano: "2d6", critico: 19, multiplicador: 2,
          descricao: "Seis tiros. Rafa prefere não usar." },
        { tipo: "armadura", nome: "Jaqueta de couro", categoria: "Proteção", peso: 2, defesa: 1 },
        { tipo: "mochila", nome: "Mochila", categoria: "", reducaoPeso: 2 },
      ],
    };

    base.anotacoes = { pastas: [], soltas: [{
      titulo: "Caso da biblioteca",
      conteudo: "A bibliotecária jura que o livro voltou sozinho para a estante. Conferir o registro de empréstimos e a câmera do corredor.",
    }] };

    return { ficha: F().normalizarFicha(base), foto: U.url("assets/brutal/arquetipos/cetica.webp") };
  }

  async function doArquivo(sistema) {
    var r = await fetch(U.url("assets/ajuda/demos/" + sistema + ".json") + (global.RAMAVersion ? "?v=" + encodeURIComponent(global.RAMAVersion.numero) : ""), { cache: "no-cache" });
    if (!r.ok) throw new Error("demonstração de " + sistema + " indisponível (" + r.status + ")");
    var d = await r.json();
    if (!d || !d.ficha || d.ficha.tipoFicha !== sistema) throw new Error("arquivo de demonstração inválido: " + sistema);
    /* Ids novos a cada abertura: refazer é sempre uma demonstração nova. */
    var ficha = JSON.parse(JSON.stringify(d.ficha));
    ficha.criadoEm = ficha.atualizadoEm = U.agoraISO();
    return { ficha: ficha, foto: d.foto ? U.url(d.foto) : "" };
  }

  function ficha(sistema) {
    if (sistema === "universal") return Promise.resolve(universal());
    if (SISTEMAS_COM_DEMO.indexOf(sistema) < 0) return Promise.reject(new Error("sistema sem demonstração: " + sistema));
    return doArquivo(sistema);
  }

  global.RAMAAjudaDemos = { ficha: ficha, universal: universal, SISTEMAS: SISTEMAS_COM_DEMO.concat(["universal"]) };
})(typeof window !== "undefined" ? window : globalThis);
