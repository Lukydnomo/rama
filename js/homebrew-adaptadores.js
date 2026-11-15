/* =====================================================================
   R.A.M.A. — Homebrew por sistema: o registro de adaptadores (v9.7)
   ---------------------------------------------------------------------
   Um adaptador por sistema diz, para cada TIPO que o Homebrew oferece
   naquele RPG:

     campos      o que o editor mostra (por subtipo, com "avançado")
     guardar     como o registro vai para a biblioteca (versionado)
     paraFicha   o objeto NATIVO que a ficha daquele sistema recebe —
                 passado depois pelo normalizador do próprio motor
     resumo      a linha curta da lista e dos pacotes
     destino     onde entra na ficha e o que fica MANUAL

   O REGISTRO (o que a biblioteca guarda)
     { tipo (coluna do servidor: item | arma | armadura | mochila |
       habilidade | ritual | criatura), nome, descricao, sistema,
       modelo: { versao, sistema, grupo, subtipo, def },
       universal?: { campos, valores, acoes } }

   Compatibilidade: um registro SEM `modelo` é o formato anterior (v9.6
   e antes) e continua igual — itens e habilidades genéricos são
   Universal; arma, armadura, mochila e ritual aparecem agrupados em
   Item e em Habilidade sem regravar nada. Os itens de Ordem e Universal
   continuam no formato do RAMAFicha (o inventário dessas fichas já os
   lê); os outros sistemas guardam a definição nativa em `modelo.def`.

   Trocar o subtipo no editor não apaga o que já foi preenchido (fica no
   rascunho), mas só os campos do subtipo ESCOLHIDO são gravados: um
   campo escondido nunca altera o jogo.

   Sem DOM: testes/executar-homebrew-sistemas.js.
   ===================================================================== */

(function (global) {
  "use strict";

  var VERSAO = 1;
  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  function lista(v) { return Array.isArray(v) ? v : []; }
  function texto(v, max) { return String(v === undefined || v === null ? "" : v).slice(0, max || 400); }
  function num(v, min, max, padrao) {
    var n = Number(v);
    if (v === "" || v === null || v === undefined || !isFinite(n)) return padrao;
    return Math.max(min, Math.min(max, n));
  }
  function int(v, min, max, padrao) { var n = num(v, min, max, padrao); return n === padrao ? padrao : Math.round(n); }
  function copiar(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
  function D() { return global.RAMADados; }
  /* Fórmula de dado: o que o rolador do R.A.M.A. aceita (NdX, somas e
     números — RAMADados.total). Nunca código. */
  function dadoOk(v) {
    var t = String(v || "").trim();
    if (!t) return true;
    if (t.length > 40 || !/^[0-9dD+\-\s]+$/.test(t)) return false;
    return !D() || (D().danoValido ? D().danoValido(t) : D().valida(t));
  }

  /* Um campo do editor. tipo: texto | area | numero | selecao | booleano |
     dado | pericia. `unidade` e `exemplo` aparecem junto do controle. */
  function campo(chave, rotulo, tipo, extra) { return Object.assign({ chave: chave, rotulo: rotulo, tipo: tipo || "texto" }, extra || {}); }
  function sel(chave, rotulo, pares, extra) {
    return campo(chave, rotulo, "selecao", Object.assign({ opcoes: pares.map(function (p) { return { valor: p[0], rotulo: p[1] }; }) }, extra || {}));
  }

  /* Normaliza os valores de UM subtipo: só os campos declarados, cada
     um no seu formato. */
  function valoresDe(spec, bruto) {
    var b = obj(bruto), saida = {};
    lista(spec.campos).concat(lista(spec.avancado)).forEach(function (c) {
      var v = b[c.chave];
      if (c.tipo === "numero") { var n = num(v, c.min === undefined ? -9999 : c.min, c.max === undefined ? 9999 : c.max, null); if (n !== null) saida[c.chave] = c.inteiro === false ? n : Math.round(n * 100) / 100; return; }
      if (c.tipo === "booleano") { if (v === true) saida[c.chave] = true; return; }
      if (c.tipo === "selecao") { if (lista(c.opcoes).some(function (o) { return String(o.valor) === String(v); })) saida[c.chave] = v; else if (c.padrao !== undefined) saida[c.chave] = c.padrao; return; }
      if (c.tipo === "dado") { var t = texto(v, 40).trim(); if (t && dadoOk(t)) saida[c.chave] = t; return; }
      if (c.tipo === "cor") { if (/^#[0-9a-fA-F]{6}$/.test(String(v || ""))) saida[c.chave] = String(v).toLowerCase(); return; }
      if (c.tipo === "elemento") { var EL = global.RAMAOrdemElementos; if (v && (EL ? EL.aceito(v) || v === "varia" : true)) saida[c.chave] = String(v); return; }
      if (c.tipo === "elementos") { var EL2 = global.RAMAOrdemElementos; var l = lista(v).map(String).filter(function (k, i, ll) { return (EL2 ? EL2.aceito(k) : true) && ll.indexOf(k) === i; }).slice(0, 10); if (l.length) saida[c.chave] = l; return; }
      var s = texto(v, c.tipo === "area" ? (c.limite || 4000) : (c.limite || 120)).trim();
      if (s) saida[c.chave] = s;
    });
    return saida;
  }
  function erros(spec, bruto) {
    var b = obj(bruto), e = {};
    lista(spec.campos).concat(lista(spec.avancado)).forEach(function (c) {
      var v = b[c.chave];
      if (c.obrigatorio && (v === undefined || v === null || String(v).trim() === "")) e[c.chave] = "Obrigatório.";
      if (c.tipo === "dado" && v && !dadoOk(v)) e[c.chave] = "Use uma expressão de dado, como " + (c.exemplo || "1d6") + ".";
      if (c.tipo === "numero" && v !== "" && v !== undefined && v !== null && !isFinite(Number(v))) e[c.chave] = "Use um número.";
    });
    return e;
  }

  /* =================================================================
     OS SISTEMAS
     ================================================================= */
  var COMUM_ITEM_DESC = campo("descricao", "Descrição", "area", { limite: 2000 });

  var ORDEM = {
    id: "ordem",
    tipos: [
      { chave: "item", rotulo: "Item", ajuda: "Arma, proteção, munição, acessório, consumível ou item paranormal, com categoria e espaços." },
      { chave: "habilidade", rotulo: "Habilidade", ajuda: "Poderes e habilidades — e Ritual, com o editor de rituais." },
      { chave: "criatura", rotulo: "Criatura", ajuda: "A ficha de ameaça: VD, elementos, Presença Perturbadora e ações." },
      { chave: "elemento", rotulo: "Elemento", ajuda: "Um elemento da sua mesa (ex.: Vidro): nome, cor, símbolo e, se quiser, relações e afinidade. Aparece onde a regra deixa escolher elemento." },
      { chave: "classe", rotulo: "Classe", ajuda: "PV/PE/SAN, perícias, proficiências e as tabelas de NEX, nível e Patentes. Entra na criação do agente e na progressão." },
      { chave: "origem", rotulo: "Origem", ajuda: "Perícias treinadas e um poder (com efeito na conta, se quiser). Entra na criação do agente e na troca de origem." },
      { chave: "trilha", rotulo: "Trilha", ajuda: "Os quatro poderes (NEX 10%, 40%, 65% e 99%) para uma classe. Entra na vaga de Trilha da progressão." },
    ],
    item: {
      subtipos: [
        { chave: "geral", rotulo: "Equipamento geral", campos: [sel("categoria", "Categoria", [[0, "0"], [1, "I"], [2, "II"], [3, "III"], [4, "IV"]], { padrao: 0 }), campo("espacos", "Espaços", "numero", { min: 0, max: 99, padrao: 1, unidade: "espaços" })], avancado: [campo("capacidade", "Aumenta a carga em", "numero", { min: 0, max: 50, unidade: "espaços", exemplo: "2 (Mochila Militar)" })] },
        { chave: "arma", rotulo: "Arma", campos: [
          sel("proficiencia", "Proficiência", [["simples", "Simples"], ["tatica", "Tática"], ["pesada", "Pesada"]], { padrao: "simples" }),
          sel("tipoArma", "Tipo", [["corpoACorpo", "Corpo a corpo"], ["arremesso", "Arremesso"], ["disparo", "Disparo"], ["fogo", "Fogo"]], { padrao: "corpoACorpo" }),
          campo("dano", "Dano", "dado", { exemplo: "1d8", obrigatorio: true }),
          campo("critico", "Margem de ameaça", "numero", { min: 2, max: 20, padrao: 20, exemplo: "19" }),
          campo("multiplicador", "Multiplicador", "numero", { min: 2, max: 5, padrao: 2, unidade: "×" }),
          sel("categoria", "Categoria", [[0, "0"], [1, "I"], [2, "II"], [3, "III"], [4, "IV"]], { padrao: 0 }),
          campo("espacos", "Espaços", "numero", { min: 0, max: 99, padrao: 1, unidade: "espaços" }),
        ], avancado: [
          sel("empunhadura", "Empunhadura", [["leve", "Leve"], ["umaMao", "Uma mão"], ["duasMaos", "Duas mãos"]]),
          sel("alcance", "Alcance", [["", "—"], ["curto", "Curto"], ["medio", "Médio"], ["longo", "Longo"], ["extremo", "Extremo"]]),
          campo("tipoDano", "Tipo de dano", "texto", { limite: 20, exemplo: "corte" }),
          campo("municao", "Munição", "texto", { limite: 80, exemplo: "balas curtas" }),
          campo("bonusAtaque", "Bônus no ataque", "numero", { min: -20, max: 20 }),
          campo("agil", "Ágil", "booleano"),
        ] },
        { chave: "protecao", rotulo: "Proteção", campos: [
          sel("tipoProtecao", "Tipo", [["leve", "Leve"], ["pesada", "Pesada"], ["escudo", "Escudo"]], { padrao: "leve" }),
          campo("defesa", "Defesa", "numero", { min: -99, max: 99, padrao: 0, exemplo: "+5" }),
          sel("categoria", "Categoria", [[0, "0"], [1, "I"], [2, "II"], [3, "III"], [4, "IV"]], { padrao: 0 }),
          campo("espacos", "Espaços", "numero", { min: 0, max: 99, padrao: 1, unidade: "espaços" }),
        ], avancado: [campo("rd", "Resistência a dano", "numero", { min: 0, max: 50 })] },
        { chave: "municao", rotulo: "Munição", campos: [campo("quantidade", "Quantidade", "numero", { min: 1, max: 999, padrao: 1 }), sel("categoria", "Categoria", [[0, "0"], [1, "I"], [2, "II"]], { padrao: 0 }), campo("espacos", "Espaços", "numero", { min: 0, max: 99, padrao: 1 })] },
        { chave: "acessorio", rotulo: "Acessório", campos: [sel("categoria", "Categoria", [[0, "0"], [1, "I"], [2, "II"], [3, "III"], [4, "IV"]], { padrao: 1 }), campo("espacos", "Espaços", "numero", { min: 0, max: 99, padrao: 1 })] },
        { chave: "consumivel", rotulo: "Consumível", campos: [campo("quantidade", "Quantidade", "numero", { min: 1, max: 999, padrao: 1 }), sel("categoria", "Categoria", [[0, "0"], [1, "I"], [2, "II"]], { padrao: 0 }), campo("espacos", "Espaços", "numero", { min: 0, max: 99, padrao: 1 })] },
        { chave: "paranormal", rotulo: "Item paranormal", campos: [campo("elemento", "Elemento", "elemento", { ajuda: "Os oficiais e os seus elementos Homebrew de Ordem." }), sel("categoria", "Categoria", [[0, "0"], [1, "I"], [2, "II"], [3, "III"], [4, "IV"]], { padrao: 2 }), campo("espacos", "Espaços", "numero", { min: 0, max: 99, padrao: 1 })] },
        { chave: "mochila", rotulo: "Mochila / recipiente", campos: [campo("capacidade", "Aumenta a carga em", "numero", { min: 0, max: 50, padrao: 2, unidade: "espaços" }), sel("categoria", "Categoria", [[0, "0"], [1, "I"], [2, "II"]], { padrao: 1 })] },
        { chave: "outro", rotulo: "Outro (narrativo)", campos: [] },
      ],
    },
  };

  var UNIVERSAL = {
    id: "universal",
    tipos: [
      { chave: "item", rotulo: "Item", ajuda: "Equipamento, arma, proteção, recipiente ou consumível — com campos e ações da sua mesa." },
      { chave: "habilidade", rotulo: "Habilidade", ajuda: "Poder, técnica, magia ou talento; texto, origem, ações e custos." },
      { chave: "ritual", rotulo: "Ritual", ajuda: "O ritual da ficha Universal: círculo, elemento, conjuração e versões." },
      { chave: "criatura", rotulo: "Criatura", ajuda: "A mini ficha livre: status, atributos, perícias, ataques e habilidades." },
    ],
    item: {
      subtipos: [
        { chave: "equipamento", rotulo: "Equipamento", campos: [campo("categoria", "Categoria", "texto", { limite: 60, exemplo: "Ferramenta" }), campo("peso", "Peso", "numero", { min: 0, max: 9999, inteiro: false, padrao: 0, unidade: "kg" })] },
        { chave: "arma", rotulo: "Arma", campos: [campo("dano", "Dano", "dado", { exemplo: "1d8" }), campo("danoExtra", "Dano extra", "texto", { limite: 20, exemplo: "+2 ou 1d6" }), campo("critico", "Crítico", "numero", { min: 0, max: 20, padrao: 0, ajuda: "0 desliga." }), campo("multiplicador", "Multiplicador", "numero", { min: 1, max: 10, padrao: 2, unidade: "×" }), campo("peso", "Peso", "numero", { min: 0, max: 9999, inteiro: false, padrao: 0, unidade: "kg" })], avancado: [campo("categoria", "Categoria", "texto", { limite: 60 })] },
        { chave: "protecao", rotulo: "Proteção", campos: [campo("defesa", "Defesa", "numero", { min: -999, max: 999, padrao: 0 }), campo("peso", "Peso", "numero", { min: 0, max: 9999, inteiro: false, padrao: 0, unidade: "kg" })], avancado: [campo("categoria", "Categoria", "texto", { limite: 60 })] },
        { chave: "recipiente", rotulo: "Mochila / recipiente", campos: [campo("reducaoPeso", "Reduz o peso carregado em", "numero", { min: 0, max: 9999, inteiro: false, padrao: 0, unidade: "kg" })] },
        { chave: "consumivel", rotulo: "Consumível", campos: [campo("peso", "Peso", "numero", { min: 0, max: 9999, inteiro: false, padrao: 0, unidade: "kg" })], avancado: [campo("categoria", "Categoria", "texto", { limite: 60 })] },
        { chave: "ferramenta", rotulo: "Ferramenta", campos: [campo("peso", "Peso", "numero", { min: 0, max: 9999, inteiro: false, padrao: 0, unidade: "kg" })] },
        { chave: "acessorio", rotulo: "Acessório", campos: [campo("peso", "Peso", "numero", { min: 0, max: 9999, inteiro: false, padrao: 0, unidade: "kg" })] },
        { chave: "outro", rotulo: "Outro (narrativo)", campos: [] },
      ],
    },
  };

  var T20_PERICIAS = [["acrobacia", "Acrobacia"], ["adestramento", "Adestramento"], ["atletismo", "Atletismo"], ["atuacao", "Atuação"], ["cavalgar", "Cavalgar"], ["conhecimento", "Conhecimento"], ["cura", "Cura"], ["diplomacia", "Diplomacia"], ["enganacao", "Enganação"], ["fortitude", "Fortitude"], ["furtividade", "Furtividade"], ["guerra", "Guerra"], ["iniciativa", "Iniciativa"], ["intimidacao", "Intimidação"], ["intuicao", "Intuição"], ["investigacao", "Investigação"], ["jogatina", "Jogatina"], ["ladinagem", "Ladinagem"], ["luta", "Luta"], ["misticismo", "Misticismo"], ["nobreza", "Nobreza"], ["oficio", "Ofício"], ["percepcao", "Percepção"], ["pilotagem", "Pilotagem"], ["pontaria", "Pontaria"], ["reflexos", "Reflexos"], ["religiao", "Religião"], ["sobrevivencia", "Sobrevivência"], ["vontade", "Vontade"]];
  var T20_GERAL = function (chave, rotulo) {
    return { chave: chave, rotulo: rotulo, campos: [campo("preco", "Preço", "numero", { min: 0, max: 999999, inteiro: false, padrao: 0, unidade: "T$" }), campo("espacos", "Espaços", "numero", { min: 0, max: 99, inteiro: false, padrao: 1, unidade: "espaços" })],
      avancado: [sel("bonusPericia", "Bônus em perícia", [["", "—"]].concat(T20_PERICIAS)), campo("bonusValor", "Valor do bônus", "numero", { min: -10, max: 10 }), campo("bonusCondicao", "Quando", "texto", { limite: 120, exemplo: "para acampar" })] };
  };
  var TORMENTA20 = {
    id: "tormenta20",
    tipos: [
      { chave: "item", rotulo: "Item", ajuda: "Arma, armadura, escudo, vestuário, ferramenta, alquímico e o resto do inventário, com preço e espaços." },
      { chave: "habilidade", rotulo: "Habilidade", ajuda: "Magia por círculo (a ficha aprende e lança), poder geral ou da Tormenta (com efeitos) ou habilidade de texto." },
      { chave: "criatura", rotulo: "Ameaça", ajuda: "ND, Defesa, resistências, PV, ataques, habilidades e magias." },
      { chave: "raca", rotulo: "Raça", ajuda: "Atributos, tamanho, deslocamento e habilidades (com efeito na conta e perícias à escolha). Entra na criação de personagem." },
      { chave: "origem", rotulo: "Origem", ajuda: "Itens, perícias e poderes gerais de onde saem os dois benefícios, e o poder único. Entra na criação de personagem." },
      { chave: "divindade", rotulo: "Divindade", ajuda: "Energia, arma preferida, devotos, obrigações e os poderes concedidos (do livro e próprios). Entra na criação e na ficha." },
      { chave: "classe", rotulo: "Classe", ajuda: "PV, PM, perícias, proficiências, magias, as habilidades de cada nível e os poderes de classe. Entra na criação e ao subir de nível (também multiclasse)." },
    ],
    item: {
      subtipos: [
        { chave: "arma", rotulo: "Arma", campos: [
          sel("proficiencia", "Proficiência", [["simples", "Simples"], ["marcial", "Marcial"], ["exotica", "Exótica"], ["fogo", "Arma de fogo"]], { padrao: "simples" }),
          sel("proposito", "Propósito", [["corpo", "Corpo a corpo"], ["distancia", "Ataque à distância"]], { padrao: "corpo" }),
          sel("empunhadura", "Empunhadura", [["leve", "Leve"], ["umaMao", "Uma mão"], ["duasMaos", "Duas mãos"]], { padrao: "umaMao" }),
          campo("dano", "Dano", "dado", { exemplo: "1d8", obrigatorio: true }),
          campo("margem", "Crítico (margem)", "numero", { min: 2, max: 20, padrao: 20, exemplo: "19" }),
          campo("mult", "Crítico (multiplicador)", "numero", { min: 2, max: 5, padrao: 2, unidade: "×" }),
          sel("tipo", "Tipo de dano", [["C", "Corte"], ["P", "Perfuração"], ["I", "Impacto"]], { padrao: "C" }),
          campo("preco", "Preço", "numero", { min: 0, max: 999999, inteiro: false, padrao: 0, unidade: "T$" }),
          campo("espacos", "Espaços", "numero", { min: 0, max: 99, inteiro: false, padrao: 1 }),
        ], avancado: [
          sel("alcance", "Alcance", [["", "—"], ["curto", "Curto (9 m)"], ["medio", "Médio (30 m)"], ["longo", "Longo (90 m)"]]),
          sel("municao", "Munição", [["", "—"], ["balas", "Balas"], ["flechas", "Flechas"], ["pedras", "Pedras"], ["virotes", "Virotes"]]),
          campo("arremesso", "Pode ser arremessada", "booleano"),
        ] },
        { chave: "armadura", rotulo: "Armadura", campos: [sel("tipoArmadura", "Tipo", [["leve", "Leve"], ["pesada", "Pesada"]], { padrao: "leve" }), campo("defesa", "Bônus na Defesa", "numero", { min: 0, max: 30, padrao: 1 }), campo("penalidade", "Penalidade de armadura", "numero", { min: -10, max: 0, padrao: 0 }), campo("preco", "Preço", "numero", { min: 0, max: 999999, inteiro: false, padrao: 0, unidade: "T$" }), campo("espacos", "Espaços", "numero", { min: 0, max: 99, inteiro: false, padrao: 2 })] },
        { chave: "escudo", rotulo: "Escudo", campos: [campo("defesa", "Bônus na Defesa", "numero", { min: 0, max: 10, padrao: 1 }), campo("penalidade", "Penalidade de armadura", "numero", { min: -10, max: 0, padrao: -1 }), campo("preco", "Preço", "numero", { min: 0, max: 999999, inteiro: false, padrao: 0, unidade: "T$" }), campo("espacos", "Espaços", "numero", { min: 0, max: 99, inteiro: false, padrao: 1 })] },
        T20_GERAL("vestuario", "Vestuário"), T20_GERAL("ferramenta", "Ferramenta"), T20_GERAL("alquimico", "Alquímico / consumível"),
        T20_GERAL("esoterico", "Esotérico"), T20_GERAL("aventura", "Equipamento de aventura"), T20_GERAL("alimentacao", "Alimentação"),
        { chave: "municao", rotulo: "Munição", campos: [campo("quantidade", "Quantidade no pacote", "numero", { min: 1, max: 999, padrao: 20 }), campo("preco", "Preço", "numero", { min: 0, max: 999999, inteiro: false, padrao: 0, unidade: "T$" }), campo("espacos", "Espaços", "numero", { min: 0, max: 99, inteiro: false, padrao: 1 })] },
        { chave: "outro", rotulo: "Outro (narrativo)", campos: [] },
      ],
    },
    habilidade: {
      subtipos: [
        { chave: "magia", rotulo: "Magia", campos: [sel("tipoMagia", "Tipo", [["arcana", "Arcana"], ["divina", "Divina"], ["universal", "Universal"]], { padrao: "arcana" }), campo("circulo", "Círculo", "numero", { min: 1, max: 5, padrao: 1, unidade: "º" }), campo("escola", "Escola", "texto", { limite: 30, exemplo: "Evocação" }), campo("execucao", "Execução", "texto", { limite: 40, exemplo: "padrão" }), campo("alcance", "Alcance", "texto", { limite: 40, exemplo: "curto" }), campo("alvo", "Alvo / área", "texto", { limite: 80 }), campo("duracao", "Duração", "texto", { limite: 40, exemplo: "cena" }), campo("resistencia", "Resistência", "texto", { limite: 60, exemplo: "Vontade anula" }),
          /* v9.14: a mecânica que o lançamento da ficha resolve. */
          campo("dano", "Dano (opcional)", "dado", { exemplo: "2d6" }),
          sel("tipoDano", "Tipo de dano", [["", "—"], ["acido", "Ácido"], ["corte", "Corte"], ["eletricidade", "Eletricidade"], ["essencia", "Essência"], ["fogo", "Fogo"], ["frio", "Frio"], ["impacto", "Impacto"], ["luz", "Luz"], ["perfuracao", "Perfuração"], ["psiquico", "Psíquico"], ["trevas", "Trevas"]]),
          campo("metade", "A resistência reduz o dano à metade", "booleano"),
          campo("cura", "Cura (opcional)", "dado", { exemplo: "2d8+2" })], avancado: [campo("aprimoramentos", "Aprimoramentos", "area", { limite: 2000, exemplo: "+2 PM: aumenta o dano em 1d6." })] },
        { chave: "poder", rotulo: "Poder", campos: [sel("grupo", "Grupo", [["geral", "Geral"], ["classe", "De classe"], ["concedido", "Concedido"], ["tormenta", "Da Tormenta"], ["origem", "De origem"]], { padrao: "geral" }), campo("requisitos", "Pré-requisitos", "texto", { limite: 200 }), campo("custo", "Custo", "texto", { limite: 40, exemplo: "2 PM" })] },
        { chave: "habilidade", rotulo: "Habilidade", campos: [campo("fonte", "De onde vem", "texto", { limite: 60, exemplo: "raça, classe" })] },
      ],
    },
  };

  var GOBLINS = {
    id: "goblins",
    tipos: [
      { chave: "item", rotulo: "Item", ajuda: "Arma (mãos, ataque, bônus, munição, recarga), proteção (uso e durabilidade) ou outro item." },
      { chave: "habilidade", rotulo: "Habilidade", ajuda: "Magia (entra na escolha do Bruxo, resultado por hits), técnica (a mesa concede, com uso de 1 vez por dia) ou habilidade, para consulta." },
      { chave: "criatura", rotulo: "Inimigo", ajuda: "Combate, Noção, Habilidade e Vitalidade, bônus da arma, proteção e efeitos." },
      { chave: "ocupacao", rotulo: "Ocupação", ajuda: "Modificador de atributo, opções de equipamento inicial e as três técnicas. Entra na criação de goblins." },
      { chave: "descritor", rotulo: "Descritor", ajuda: "Modificadores de atributo (ou um +1 à escolha, como Supimpa). Entra na criação de goblins." },
      { chave: "pokepraga", rotulo: "PokéPraga", ajuda: "Adaptação PokéPragas: uma espécie (raridade, atributos, elemento fixo opcional). A mesa põe à vista; a captura segue a regra." },
      { chave: "receita", rotulo: "Receita", ajuda: "Adaptação Vale dos Goblins: hits, ingredientes e peixe. Entra na cozinha." },
    ],
    item: {
      subtipos: [
        { chave: "arma", rotulo: "Arma", campos: [sel("maos", "Mãos", [[1, "Uma"], [2, "Duas"]], { padrao: 1 }), sel("ataque", "Ataque", [["corporal", "Corporal"], ["distancia", "À distância"]], { padrao: "corporal" }), campo("bonus", "Bônus", "numero", { min: -5, max: 10, padrao: 1 })], avancado: [campo("municao", "Munição", "numero", { min: 0, max: 99 }), campo("recarga", "Precisa recarregar", "booleano"), campo("arremesso", "Pode ser arremessada", "booleano")] },
        { chave: "protecao", rotulo: "Proteção", campos: [sel("uso", "Onde se usa", [["cabeca", "Cabeça"], ["tronco", "Tronco"], ["umaMao", "Uma mão"], ["pes", "Pés"], ["ombros", "Ombros"], ["pescoco", "Pescoço"], ["corpo", "Corpo"]], { padrao: "tronco" }), campo("durabilidade", "Durabilidade", "numero", { min: 0, max: 10, padrao: 1 })] },
        { chave: "equipamento", rotulo: "Equipamento", campos: [] },
        { chave: "outro", rotulo: "Outro (narrativo)", campos: [] },
      ],
    },
    habilidade: {
      subtipos: [
        /* v9.30: a Magia entra na escolha do Bruxo e se conjura como as do
           livro (teste de Noção, o resultado pelos hits); a Técnica, a
           mesa concede ao goblin. */
        { chave: "magia", rotulo: "Magia", campos: [0, 1, 2, 3].map(function (i) {
          var rot = i === 3 ? "3+ hits" : i + (i === 1 ? " hit" : " hits");
          return [campo("r" + i, rot + ": o que acontece", "area", { limite: 400, exemplo: i === 0 ? "Uma explosão queima seu rosto." : "" }),
            sel("e" + i, rot + ": a ficha aplica", [["", "Só o texto (a mesa)"], ["proprio1", "1 ferimento em quem conjurou"], ["inimigo1", "1 ferimento num inimigo"], ["inimigo2", "2 ferimentos num inimigo"], ["inimigo3", "3 ferimentos num inimigo"], ["aliado1", "Remove 1 ferimento de um aliado"], ["aliadoTodos", "Remove todos os ferimentos de um aliado"]], { padrao: "" })];
        }).reduce(function (a, b) { return a.concat(b); }, []) },
        { chave: "tecnica", rotulo: "Técnica", campos: [sel("uso", "Uso", [["", "Quando o texto diz"], ["dia", "1 vez por dia (a ficha marca)"]], { padrao: "" })] },
        { chave: "habilidade", rotulo: "Habilidade", campos: [] },
      ],
    },
  };

  function opcoesDisciplinasVampiro() {
    var D = global.RAMAVampiroDisciplinas;
    var mapa = D && D.DISCIPLINAS ? D.DISCIPLINAS : {};
    return Object.keys(mapa).filter(function (k) { return !mapa[k].homebrew && k !== "alquimia"; }).map(function (k) { return [k, mapa[k].nome]; });
  }
  function opcoesVampiro(qual) {
    var C = global.RAMAVampiroCatalogo;
    var mapa = C && C[qual] ? C[qual] : {};
    return Object.keys(mapa).map(function (k) { return [k, mapa[k].nome]; });
  }
  var VAMPIRO = {
    id: "vampiro",
    tipos: [
      { chave: "item", rotulo: "Item", ajuda: "Arma ou armadura sobre uma base do livro (dano e proteção do V5) ou objeto, inclusive sobrenatural." },
      { chave: "habilidade", rotulo: "Habilidade", ajuda: "Poder de Disciplina (numa Disciplina do livro: entra nas compras e na criação, com custo, parada e duração) ou outra habilidade, para consulta." },
      { chave: "criatura", rotulo: "Antagonista", ajuda: "Compacto (paradas) ou ficha completa." },
      { chave: "cla", rotulo: "Clã", ajuda: "Três Disciplinas, a Perdição e a Compulsão. Entra na criação de vampiros." },
      { chave: "predador", rotulo: "Predador", ajuda: "Especializações, Disciplinas, Humanidade, Vantagens e Defeitos que dá, paradas de caça. Entra na criação." },
      { chave: "disciplina", rotulo: "Disciplina", ajuda: "Tipo, ressonância e os poderes por nível (custo, parada, duração). Entra na criação e nas compras com XP." },
      { chave: "vantagem", rotulo: "Vantagem", ajuda: "Níveis, efeito Social e clãs proibidos. Entra na criação e nas compras com XP." },
      { chave: "defeito", rotulo: "Defeito", ajuda: "Como a Vantagem, mas é um Defeito." },
      { chave: "conhecimento", rotulo: "Ficha de Conhecimento", ajuda: "De 1 a 5 níveis, cada um com nome, limite de uso e texto; clã exclusivo opcional. Entra na criação e nas compras com XP." },
    ],
    item: {
      subtipos: [
        { chave: "arma", rotulo: "Arma", campos: [sel("arma", "Base (dano e tipo do V5)", opcoesVampiro("ARMAS"), { obrigatorio: true }), campo("dano", "Dano (sobrescreve a base)", "numero", { min: 0, max: 10 })] },
        { chave: "armadura", rotulo: "Armadura", campos: [sel("armadura", "Base (proteção do V5)", opcoesVampiro("ARMADURAS"), { obrigatorio: true })] },
        { chave: "equipamento", rotulo: "Equipamento", campos: [] },
        { chave: "sobrenatural", rotulo: "Objeto sobrenatural", campos: [] },
        { chave: "outro", rotulo: "Outro (narrativo)", campos: [] },
      ],
    },
    habilidade: {
      subtipos: [
        /* v9.29: o poder entra no motor (uma Disciplina do livro; a
           Disciplina Homebrew tem os poderes no próprio editor). O efeito
           é a descrição. */
        { chave: "disciplina", rotulo: "Poder de Disciplina", campos: [sel("disciplina", "Disciplina (do livro)", opcoesDisciplinasVampiro(), { obrigatorio: true, ajuda: "Para uma Disciplina Homebrew, ponha os poderes no editor dela." }), campo("nivel", "Nível", "numero", { min: 1, max: 5, padrao: 1, unidade: "●" }),
          sel("checagens", "Custo", [[0, "Grátis"], [1, "1 Checagem de Despertar"], [2, "2 Checagens"], [3, "3 Checagens"]], { padrao: 0 }),
          sel("atributo", "Parada", [["", "Sem teste"], ["forca", "Força + Disciplina"], ["destreza", "Destreza + Disciplina"], ["vigor", "Vigor + Disciplina"], ["carisma", "Carisma + Disciplina"], ["manipulacao", "Manipulação + Disciplina"], ["autocontrole", "Autocontrole + Disciplina"], ["inteligencia", "Inteligência + Disciplina"], ["raciocinio", "Raciocínio + Disciplina"], ["determinacao", "Determinação + Disciplina"]], { padrao: "" }),
          sel("duracao", "Duração", [["passiva", "Passiva"], ["turno", "Um turno"], ["cena", "Uma cena"], ["noite", "Uma noite"], ["indefinida", "Indefinida"]], { padrao: "cena" })],
          avancado: [campo("requisitos", "Pré-requisitos (a mesa confere)", "texto", { limite: 200 })] },
        { chave: "habilidade", rotulo: "Habilidade", campos: [campo("custo", "Custo", "texto", { limite: 40 })] },
      ],
    },
  };

  function opcoesOblivio() {
    var C = global.RAMAOblivioCatalogo;
    var mapa = C && C.equipamento ? C.equipamento : {};
    return Object.keys(mapa).map(function (k) { return [k, mapa[k].nome]; });
  }
  var OBLIVIO = {
    id: "oblivio",
    tipos: [
      { chave: "item", rotulo: "Item", ajuda: "Equipamento sobre uma base do catálogo (espaços, Durabilidade, Dano, Proteção) ou objeto narrativo." },
      { chave: "habilidade", rotulo: "Habilidade", ajuda: "Habilidade Geral: ação, limite de uso (a ficha conta), custo, alvo e requisitos. Escolhida na progressão ou concedida pela Testemunha." },
      { chave: "criatura", rotulo: "Ameaça", ajuda: "Grau, Dano, Proteção, Velocidade, Estresse e Regiões." },
      { chave: "papel", rotulo: "Papel", ajuda: "Estresse, cor, os seis Conhecimentos, a Habilidade Principal e as Únicas. Entra na criação de Personas." },
      { chave: "motivacao", rotulo: "Motivação", ajuda: "Nome e resumo. Entra na criação de Personas." },
      { chave: "mazela", rotulo: "Mazela", ajuda: "Nome, texto e como sai (Bálsamo, Kit). Entra em \u201cAplicar mazela\u201d na ficha." },
      { chave: "fardo", rotulo: "Fardo", ajuda: "Nome, texto e se acumula. A mesa aplica na ficha." },
    ],
    item: {
      subtipos: [
        { chave: "equipamento", rotulo: "Equipamento (com base no catálogo)", campos: [sel("chave", "Base (regras do item)", opcoesOblivio(), { obrigatorio: true, ajuda: "Espaços, Durabilidade, Dano e Proteção vêm da base: o Oblívio não inventa números." })] },
        { chave: "outro", rotulo: "Objeto narrativo", campos: [] },
      ],
    },
    habilidade: {
      subtipos: [
        /* v9.31: uma habilidade Geral no motor (escolhida na progressão ou
           concedida pela Testemunha); o limite é um dos que a ficha conta. */
        { chave: "habilidade", rotulo: "Habilidade", campos: [
          sel("acao", "Ação", [["passiva", "Passiva"], ["regular", "Ação Regular"], ["extra", "Ação Extra"], ["completa", "Ação Completa"], ["regular+movimento", "Regular + Movimento"]], { padrao: "passiva" }),
          sel("limite", "Limite de uso", [["", "Sem limite"], ["rodada", "Por rodada"], ["cena", "Por cena"], ["cenaCalma", "Por cena de Descanso ou Interação"], ["descanso", "Entre Descansos"], ["partida", "Por Partida"]], { padrao: "" }),
          campo("vezes", "Vezes nesse limite", "numero", { min: 1, max: 3, padrao: 1 }),
          campo("custo", "Custo", "texto", { limite: 60, exemplo: "1 de Estresse" }), campo("alvo", "Alvo", "texto", { limite: 80 }),
          campo("requisitos", "Requisitos (a Testemunha confere)", "texto", { limite: 200 })] },
      ],
    },
  };

  var ORDEM2_PERICIAS = function () {
    var K = global.RAMAOrdem2Catalogo;
    var p = K && K.PERICIAS ? K.PERICIAS : [];
    /* No catálogo de Ordem II cada perícia é [chave, nome, grupo, texto]. */
    return [["", "—"]].concat(p.map(function (x) { return Array.isArray(x) ? [x[0], x[1]] : [x.chave, x.nome]; }));
  };
  var ORDEM2 = {
    id: "ordem2",
    tipos: [
      { chave: "item", rotulo: "Item", ajuda: "Arma, proteção, consumível ou equipamento com dados e efeitos de Ordem II." },
      { chave: "habilidade", rotulo: "Habilidade", ajuda: "Habilidade, poder ou ritual experimental de Ordem II." },
      { chave: "criatura", rotulo: "Ameaça", ajuda: "Dados de atributo e perícia, PV, ações com RA + n." },
      { chave: "perfil", rotulo: "Perfil", ajuda: "Nome, texto e a habilidade de perfil (do catálogo). Entra na criação de personagens." },
      { chave: "ocupacao", rotulo: "Ocupação", ajuda: "Nome, ambientações e a habilidade de ocupação (do catálogo). Entra na criação de personagens." },
    ],
    item: {
      subtipos: [
        { chave: "arma", rotulo: "Arma", campos: [sel("alcance", "Alcance", [["corpo", "Corpo a corpo"], ["distancia", "À distância"]], { padrao: "corpo" }), campo("dano", "Dano", "numero", { min: -10, max: 50, padrao: 1 }), campo("categoria", "Categoria", "texto", { limite: 30 })], avancado: [campo("especial", "Especial", "area", { limite: 600 })] },
        { chave: "protecao", rotulo: "Proteção", campos: [campo("armadura", "Armadura", "numero", { min: 0, max: 20, padrao: 1 })], avancado: [campo("especial", "Especial", "area", { limite: 600 })] },
        { chave: "consumivel", rotulo: "Consumível", campos: [campo("consumivel", "Tipo de consumo", "texto", { limite: 30, exemplo: "1 uso" }), campo("quantidade", "Quantidade", "numero", { min: 0, max: 999, padrao: 1 })] },
        { chave: "equipamento", rotulo: "Equipamento", campos: [], avancado: [sel("pericia", "Perícia que ajuda", ORDEM2_PERICIAS()), campo("passos", "Passos", "numero", { min: -4, max: 4, padrao: 1 })] },
        { chave: "outro", rotulo: "Outro (narrativo)", campos: [] },
      ],
    },
    habilidade: {
      subtipos: [
        { chave: "habilidade", rotulo: "Habilidade", campos: [] },
        { chave: "poder", rotulo: "Poder", campos: [] },
        { chave: "ritual", rotulo: "Ritual (experimental)", campos: [campo("custo", "Custo", "texto", { limite: 40, exemplo: "2 PD" })] },
      ],
    },
  };

  var BRUTAL = {
    id: "brutal",
    tipos: [
      { chave: "item", rotulo: "Item", ajuda: "O Apego \"item\" do Corte Rápido: nome e o que ele significa. Sem Defesa, PV nem mochila." },
      { chave: "habilidade", rotulo: "Habilidade", ajuda: "Vantagem: Estilo, custo em PT, recarga e um efeito que o motor aplica. A Diretora traz para a mesa (Vantagens da mesa)." },
      { chave: "arquetipo", rotulo: "Arquétipo", ajuda: "Adjetivos, cor, Iniciativa, os dois Estilos e a Habilidade (com recarga). Entra na criação de Sobreviventes, na troca e na mesa." },
      { chave: "estilo", rotulo: "Estilo", ajuda: "Um Estilo novo (nome e para que serve), para os seus Arquétipos e as listas de Estilo." },
      { chave: "assassino", rotulo: "Assassino", ajuda: "Modelo de mesa: Ameaças, dados, PH, Testes de Susto, Ações Únicas e Apavoro. A Diretora escolhe ao configurar o Assassino." },
      { chave: "ameaca", rotulo: "Ameaça", ajuda: "Modelo de mesa: adjetivos, Ações Únicas e o Intento Único (PH)." },
      { chave: "apavoro", rotulo: "Apavoro", ajuda: "Modelo de mesa: cena, recarga, custo em PH e texto." },
    ],
    item: { subtipos: [{ chave: "apego", rotulo: "Apego: item", campos: [] }] },
    /* v9.18: Arquétipo e Estilo (js/paginas/homebrew-brutal.js). */
    estrutural: { subtipos: [{ chave: "arquetipo", rotulo: "Arquétipo", campos: [] }, { chave: "estilo", rotulo: "Estilo", campos: [] }, { chave: "assassino", rotulo: "Assassino", campos: [] }, { chave: "ameaca", rotulo: "Ameaça", campos: [] }, { chave: "apavoro", rotulo: "Apavoro", campos: [] }] },
    /* v9.32: a Vantagem no formato das Vantagens da mesa (o efeito que o motor aplica). */
    habilidade: { subtipos: [{ chave: "vantagem", rotulo: "Vantagem", campos: [
      sel("estilo", "Estilo", [["", "Geral (todas)"], ["desenrolado", "Desenrolado"], ["firme", "Firme"], ["ligeiro", "Ligeiro"], ["potente", "Potente"], ["sagaz", "Sagaz"]], { padrao: "" }),
      campo("custo", "Custo (Pontos de Tensão)", "numero", { min: 0, max: 10, padrao: 2 }),
      sel("recarga", "Recarga", [["semRestricao", "Sem restrição"], ["fimEncontro", "Fim de um Encontro"], ["inicioEncontro", "Início de um Encontro"], ["inicioSessao", "Início de uma sessão"], ["encontroLivre", "Encontro, Livre"]], { padrao: "fimEncontro" }),
      sel("efeito", "Efeito (o motor aplica)", [["manual", "Só registra (a mesa resolve)"], ["dado", "+1 dado na Pilha Comum"], ["reduzirFerida", "Reduz a próxima Ferida"], ["sucessoPartir", "Um sucesso garantido no próximo Partir Para Cima"], ["fugaNoEncontro", "Mover 1 dado para a Pilha de Fuga no próximo Encontro"], ["recurso", "Recebe um Recurso (1 uso)"], ["recuperarEstilo", "Recupera um Estilo Incapacitado"], ["transferirPt", "Transfere PT para outra Sobrevivente"]], { padrao: "manual" }),
      campo("valor", "Valor (reduzir Ferida)", "numero", { min: 1, max: 6, padrao: 1 })] }] },
  };

  var SISTEMAS = { ordem: ORDEM, ordem2: ORDEM2, tormenta20: TORMENTA20, oblivio: OBLIVIO, vampiro: VAMPIRO, goblins: GOBLINS, brutal: BRUTAL, universal: UNIVERSAL };

  /* v9.8: tipos estruturais de Ordem. Elemento usa o editor guiado;
     Classe tem editor próprio (js/paginas/homebrew-classe.js). */
  ORDEM.estrutural = { subtipos: [
    { chave: "elemento", rotulo: "Elemento", campos: [
      campo("cor", "Cor", "cor", { ajuda: "Usada nas marcas do elemento. Escolha uma cor com bom contraste." }),
      campo("simbolo", "Símbolo (opcional)", "texto", { limite: 4, exemplo: "◇" }),
    ], avancado: [
      campo("forteContra", "Forte contra", "elementos", { ajuda: "Só vale se a mesa usar a relação — nunca herdada de um elemento oficial." }),
      campo("fracoContra", "Fraco contra", "elementos"),
      campo("permiteAfinidade", "Pode ser escolhido como afinidade (sem efeitos mecânicos oficiais)", "booleano"),
    ] },
    { chave: "classe", rotulo: "Classe", campos: [] },
    /* v9.9: editores próprios (js/paginas/homebrew-origem-trilha.js). */
    { chave: "origem", rotulo: "Origem", campos: [] },
    { chave: "trilha", rotulo: "Trilha", campos: [] },
  ] };

  /* v9.21: Perfil e Ocupação de Ordem II (js/paginas/homebrew-ordem2.js). */
  ORDEM2.estrutural = { subtipos: [{ chave: "perfil", rotulo: "Perfil", campos: [] }, { chave: "ocupacao", rotulo: "Ocupação", campos: [] }] };
  /* v9.20: Clã, Predador, Disciplina e Vantagem/Defeito de Vampiro (js/paginas/homebrew-vampiro.js). */
  VAMPIRO.estrutural = { subtipos: [["cla", "Clã"], ["predador", "Predador"], ["disciplina", "Disciplina"], ["vantagem", "Vantagem / Defeito"], ["conhecimento", "Ficha de Conhecimento"]].map(function (x) { return { chave: x[0], rotulo: x[1], campos: [] }; }) };
  /* v9.19: Papel, Motivação, Mazela e Fardo de Oblívio (js/paginas/homebrew-oblivio.js). */
  OBLIVIO.estrutural = { subtipos: ["papel", "motivacao", "mazela", "fardo"].map(function (k) { return { chave: k, rotulo: ({ papel: "Papel", motivacao: "Motivação", mazela: "Mazela", fardo: "Fardo" })[k], campos: [] }; }) };
  /* v9.17: Ocupação e Descritor de Malditos Goblins (js/paginas/homebrew-goblins.js). */
  GOBLINS.estrutural = { subtipos: [{ chave: "ocupacao", rotulo: "Ocupação", campos: [] }, { chave: "descritor", rotulo: "Descritor", campos: [] },
    /* v9.33: as opções das variantes, no editor de campos. */
    { chave: "pokepraga", rotulo: "PokéPraga", campos: [sel("raridade", "Raridade", [["comum", "Comum (captura 1 hit)"], ["incomum", "Incomum (2 hits)"], ["raro", "Rara (3 hits)"]], { padrao: "comum" }),
      campo("combate", "Combate", "numero", { min: 0, max: 6, padrao: 1 }), campo("habilidade", "Habilidade", "numero", { min: 0, max: 6, padrao: 1 }), campo("nocao", "Noção", "numero", { min: 0, max: 6, padrao: 1 }), campo("vitalidade", "Vitalidade", "numero", { min: 1, max: 8, padrao: 2 }),
      sel("elemento", "Elemento", [["", "Rolado (como as do livro)"], ["fogo", "Fogo"], ["agua", "Água"], ["planta", "Planta"], ["eletrico", "Elétrico"], ["pedra", "Pedra"], ["vento", "Vento"], ["dragao", "Dragão"], ["trevoso", "Trevoso"], ["metal", "Metal"], ["fada", "Fada"], ["psiquico", "Psíquico"], ["fantasma", "Fantasma"]], { padrao: "" })] },
    { chave: "receita", rotulo: "Receita", campos: [campo("hits", "Hits no teste de Noção", "numero", { min: 1, max: 3, padrao: 1 })].concat([["cenoura", "Cenoura"], ["batata", "Batata"], ["alface", "Alface"], ["brocolis", "Brócolis"], ["morango", "Morango"], ["banana", "Banana"], ["arroz", "Arroz"], ["trigo", "Trigo"], ["milho", "Milho"], ["tomate", "Tomate"], ["ovo", "Ovo"], ["leite", "Leite"], ["fruta", "Fruta (qualquer)"]].map(function (x) { return campo("i_" + x[0], x[1], "numero", { min: 0, max: 3 }); })).concat([sel("peixe", "Peixe", [["", "Sem peixe"], ["200", "200 g"], ["400", "400 g"], ["600", "600 g"], ["1000", "1 kg"], ["3000", "3 kg"]], { padrao: "" })]) }] };
  /* Habilidade de Ordem e Universal: o modelo do RAMAHabilidades (o
     editor de sempre); Ordem ganha Ritual como subtipo. */
  /* v9.10: Raça de Tormenta20 (editor próprio: js/paginas/homebrew-raca-t20.js). */
  TORMENTA20.estrutural = { subtipos: [{ chave: "raca", rotulo: "Raça", campos: [] }, { chave: "origem", rotulo: "Origem", campos: [] }, { chave: "divindade", rotulo: "Divindade", campos: [] }, { chave: "classe", rotulo: "Classe", campos: [] }] };
  ORDEM.habilidade = { subtipos: [{ chave: "habilidade", rotulo: "Habilidade / poder", campos: [] }, { chave: "ritual", rotulo: "Ritual", campos: [] }] };
  UNIVERSAL.habilidade = { subtipos: [{ chave: "habilidade", rotulo: "Habilidade", campos: [] }, { chave: "poder", rotulo: "Poder", campos: [] }, { chave: "tecnica", rotulo: "Técnica", campos: [] }, { chave: "magia", rotulo: "Magia", campos: [] }] };

  function adaptador(id) { return SISTEMAS[id] || null; }
  function subtipos(sistema, grupo) { var a = adaptador(sistema); return a && a[grupo] ? a[grupo].subtipos : []; }
  function especDoSubtipo(sistema, grupo, subtipo) { return subtipos(sistema, grupo).filter(function (s) { return s.chave === subtipo; })[0] || null; }

  /* =================================================================
     LER UM REGISTRO (o novo e o de antes)
     ================================================================= */
  var NATIVOS_CRIATURA = ["ordem", "oblivio", "vampiro", "goblins", "tormenta20", "ordem2"];
  function sistemaDe(r) {
    var x = obj(r);
    if (x.modelo && SISTEMAS[x.modelo.sistema]) return x.modelo.sistema;
    if (x.tipo === "criatura") {
      if (x.resumo && x.resumo.sistema) return x.resumo.sistema;
      if (x.sistema === "ordem") return x.ordem && typeof x.ordem === "object" ? "ordem" : "universal";
      return NATIVOS_CRIATURA.indexOf(x.sistema) >= 0 ? x.sistema : "universal";
    }
    if (x.sistema && SISTEMAS[x.sistema]) return x.sistema;
    return "universal";
  }
  function grupoDe(r) {
    var t = obj(r).tipo;
    if (obj(r).modelo && obj(r).modelo.grupo) return obj(r).modelo.grupo;
    if (t === "classe" || t === "elemento" || t === "origem" || t === "trilha" || t === "raca" || t === "divindade" || t === "ocupacao" || t === "descritor" || t === "arquetipo" || t === "estilo" || t === "papel" || t === "motivacao" || t === "mazela" || t === "fardo" || t === "cla" || t === "predador" || t === "disciplina" || t === "vantagem" || t === "perfil") return "estrutural";
    if (t === "criatura") return "criatura";
    if (t === "habilidade" || t === "ritual") return "habilidade";
    return "item";
  }
  var LEGADO_SUBTIPO = { arma: "arma", armadura: "protecao", mochila: "recipiente", item: "equipamento", ritual: "ritual", habilidade: "habilidade" };
  function subtipoDe(r) {
    var x = obj(r);
    if (x.modelo && x.modelo.subtipo) return x.modelo.subtipo;
    var s = sistemaDe(x);
    if (s === "ordem" && x.tipo === "armadura") return "protecao";
    if (s === "ordem" && x.tipo === "mochila") return "mochila";
    if (s === "ordem" && x.tipo === "item") return "geral";
    return LEGADO_SUBTIPO[x.tipo] || x.tipo;
  }
  function rotuloDoSubtipo(r) {
    var spec = especDoSubtipo(sistemaDe(r), grupoDe(r), subtipoDe(r));
    if (spec) return spec.rotulo;
    return ({ arma: "Arma", protecao: "Proteção", recipiente: "Mochila / recipiente", equipamento: "Equipamento", ritual: "Ritual", habilidade: "Habilidade" })[subtipoDe(r)] || "Item";
  }

  /* =================================================================
     GUARDAR — do rascunho do editor para o registro da biblioteca
     ================================================================= */
  var TIPO_COLUNA = { arma: "arma", protecao: "armadura", recipiente: "mochila", mochila: "mochila" };

  function guardar(sistema, grupo, subtipo, rascunho) {
    var a = adaptador(sistema);
    var spec = especDoSubtipo(sistema, grupo, subtipo);
    if (!a || !spec) return { ok: false, erro: "Tipo desconhecido para este sistema." };
    var r = obj(rascunho);
    var nome = texto(r.nome, 120).trim();
    if (!nome) return { ok: false, erro: "Informe um nome.", campos: { nome: "Informe um nome." } };
    var e = erros(spec, r.valores);
    if (Object.keys(e).length) return { ok: false, erro: "Confira os campos marcados.", campos: e };
    var v = valoresDe(spec, r.valores);
    var descricao = texto(r.descricao, 2000);
    var reg = {
      nome: nome, descricao: descricao, sistema: sistema,
      modelo: { versao: VERSAO, sistema: sistema, grupo: grupo, subtipo: subtipo, def: v },
    };
    if (r.etiqueta) reg.etiqueta = r.etiqueta;
    if (grupo === "item") {
      /* Ordem e Universal: o item do RAMAFicha (o inventário dessas fichas
         lê). A coluna do servidor segue o tipo do RAMAFicha. */
      if (sistema === "ordem" || sistema === "universal") {
        var it = itemDoRamaFicha(sistema, subtipo, v, nome, descricao);
        Object.keys(it).forEach(function (k) { if (k !== "id" && reg[k] === undefined) reg[k] = it[k]; });
        reg.tipo = it.tipo;
      } else {
        reg.tipo = "item";
      }
    } else if (grupo === "habilidade") {
      reg.tipo = "habilidade";
      reg.texto = descricao;
      reg.origem = texto(r.origem, 60);
      /* v9.14: o Poder de T20 guarda também efeitos, ativação e nível mínimo. */
      if (sistema === "tormenta20" && subtipo === "poder" && r.def) reg.modelo.def = Object.assign({}, v, r.def);
    } else if (grupo === "estrutural") {
      reg.tipo = subtipo;
      /* Elemento: a chave estável nasce uma vez (e não muda ao renomear). */
      if (subtipo === "elemento") {
        var ELx = global.RAMAOrdemElementos;
        var chaveAntiga = obj(obj(r.modeloAnterior).def).chave;
        v.chave = chaveAntiga && ELx && ELx.ehHomebrew(chaveAntiga) ? chaveAntiga : (ELx ? ELx.chaveNova(nome, r.id || "") : "");
      }
      if (subtipo === "classe" && r.classe) reg.modelo.def = r.classe;
      if (["origem", "trilha", "raca", "divindade", "classe", "ocupacao", "descritor", "arquetipo", "estilo", "papel", "motivacao", "mazela", "fardo", "cla", "predador", "disciplina", "vantagem", "perfil", "conhecimento", "assassino", "ameaca", "apavoro"].indexOf(subtipo) >= 0 && r.def) reg.modelo.def = r.def;
    }
    if (r.universal && sistema === "universal") reg.universal = normalizarUniversal(r.universal);
    if (r.id) reg.id = r.id;
    if (r.visibilidade) reg.visibilidade = r.visibilidade;
    return { ok: true, registro: reg };
  }

  /* O item no formato do RAMAFicha (Ordem e Universal). */
  function itemDoRamaFicha(sistema, subtipo, v, nome, descricao) {
    var F = global.RAMAFicha;
    var tipo = TIPO_COLUNA[subtipo] || (subtipo === "arma" ? "arma" : "item");
    var dados = { nome: nome, descricao: descricao, categoria: v.categoria !== undefined && sistema === "universal" ? texto(v.categoria, 60) : "" };
    if (sistema === "universal") {
      if (v.peso !== undefined) dados.peso = v.peso;
      if (tipo === "arma") { dados.dano = v.dano || ""; dados.danoExtra = v.danoExtra || ""; dados.critico = v.critico || 0; dados.multiplicador = v.multiplicador || 2; }
      if (tipo === "armadura") dados.defesa = v.defesa || 0;
      if (tipo === "mochila") dados.reducaoPeso = v.reducaoPeso || 0;
      if (subtipo !== "equipamento" && !dados.categoria) dados.categoria = ({ consumivel: "Consumível", ferramenta: "Ferramenta", acessorio: "Acessório", outro: "Outro" })[subtipo] || "";
    } else {
      var grupo = { arma: "arma", protecao: "protecao", municao: "municao", paranormal: "paranormal" }[subtipo] || "geral";
      var ordem = { categoria: v.categoria || 0, espacos: v.espacos === undefined ? (tipo === "mochila" ? 0 : 1) : v.espacos, quantidade: v.quantidade || 1, grupo: grupo, capacidade: v.capacidade || 0 };
      if (tipo === "arma") {
        dados.dano = v.dano || ""; dados.critico = v.critico || 20; dados.multiplicador = v.multiplicador || 2;
        ordem.arma = { proficiencia: v.proficiencia, tipo: v.tipoArma, empunhadura: v.empunhadura, alcance: v.alcance || undefined, tipoDano: v.tipoDano, municao: v.municao, bonusAtaque: v.bonusAtaque, agil: v.agil === true };
      }
      if (tipo === "armadura") { dados.defesa = v.defesa || 0; ordem.protecao = { tipo: v.tipoProtecao || "leve" }; if (v.rd) ordem.rd = v.rd; }
      if (subtipo === "paranormal" && v.elemento) ordem.elemento = v.elemento;
      if (subtipo === "acessorio") ordem.marcadores = ["acessorio"];
      dados.ordem = ordem;
      dados.categoria = ({ municao: "Munição", acessorio: "Acessório", consumivel: "Consumível", paranormal: "Paranormal", outro: "Outro" })[subtipo] || "";
    }
    var it = F ? F.criarItem(tipo, dados) : Object.assign({ tipo: tipo }, dados);
    delete it.id;
    return it;
  }

  /* =================================================================
     PARA A FICHA — o objeto nativo de cada sistema
     ================================================================= */
  function defDe(r) { return obj(obj(r).modelo).def; }
  function notaDe(r) { return texto(obj(r).descricao, 600); }

  var PARA_FICHA = {
    tormenta20: function (r) {
      var d = defDe(r), st = subtipoDe(r), nome = texto(r.nome, 120);
      if (st === "outro") return { ref: "", nome: nome, personalizado: { nome: nome, categoria: "aventura", espacos: 0, resumo: notaDe(r) }, notas: notaDe(r) };
      var p = { nome: nome, preco: d.preco || 0, espacos: d.espacos === undefined ? 1 : d.espacos, resumo: notaDe(r), homebrew: true };
      if (st === "arma") Object.assign(p, { categoria: "arma", proficiencia: d.proficiencia, proposito: d.proposito, empunhadura: d.empunhadura, dano: d.dano, margem: d.margem || 20, mult: d.mult || 2, alcance: d.alcance || null, tipo: d.tipo, municao: d.municao || undefined, arremesso: d.arremesso === true, habilidades: [] });
      else if (st === "armadura" || st === "escudo") Object.assign(p, { categoria: st === "escudo" ? "escudo" : "armadura", tipoArmadura: st === "escudo" ? "escudo" : (d.tipoArmadura || "leve"), defesa: d.defesa || 0, penalidade: d.penalidade || 0 });
      else if (st === "municao") Object.assign(p, { categoria: "municao", quantidade: d.quantidade || 20 });
      else {
        p.categoria = st;
        if (d.bonusPericia && d.bonusValor) p.efeitos = [{ t: "bonus", alvo: "pericia." + d.bonusPericia, valor: d.bonusValor, categoria: "item", cond: d.bonusCondicao || undefined }];
      }
      return { ref: "", nome: nome, personalizado: p, quantidade: st === "municao" ? (d.quantidade || 20) : 1, notas: "" };
    },
    goblins: function (r) {
      var d = defDe(r), st = subtipoDe(r), nome = texto(r.nome, 120);
      var pers = null;
      if (st === "arma") pers = { arma: { maos: Number(d.maos) || 1, ataque: d.ataque || "corporal", bonus: d.bonus || 0, municao: d.municao || null, recarga: d.recarga === true, arremesso: d.arremesso === true } };
      if (st === "protecao") pers = { protecao: { uso: d.uso || "tronco", durabilidade: d.durabilidade || 0 } };
      return { nome: nome, categoria: st === "arma" ? "arma" : st === "protecao" ? "protecao" : st === "equipamento" ? "equipamento" : "outro", personalizado: pers, nota: notaDe(r) };
    },
    vampiro: function (r) {
      var d = defDe(r), st = subtipoDe(r);
      return { nome: texto(r.nome, 120), arma: st === "arma" ? d.arma || "" : "", armadura: st === "armadura" ? d.armadura || "" : "", dano: st === "arma" && d.dano !== undefined ? d.dano : null, notas: (st === "sobrenatural" ? "Sobrenatural. " : "") + notaDe(r), personalizado: true };
    },
    oblivio: function (r) {
      var d = defDe(r), st = subtipoDe(r);
      return { chave: st === "equipamento" ? d.chave || "" : "", nome: texto(r.nome, 80), nota: texto(r.descricao, 300), qtd: 1 };
    },
    ordem2: function (r) {
      var d = defDe(r), st = subtipoDe(r);
      var it = { nome: texto(r.nome, 120), tipo: st === "arma" ? "arma" : "item", descricao: texto(r.descricao, 1200), categoria: d.categoria || "", especial: d.especial || "" };
      if (st === "arma") { it.alcance = d.alcance || "corpo"; it.dano = d.dano || 0; }
      if (st === "protecao") it.armadura = d.armadura || 0;
      if (st === "consumivel") { it.consumivel = d.consumivel || "uso"; it.quantidade = d.quantidade === undefined ? 1 : d.quantidade; }
      if (st === "equipamento" && d.pericia && d.passos) { it.passos = {}; it.passos[d.pericia] = d.passos; }
      return it;
    },
    brutal: function (r) { return { nome: texto(r.nome, 80), texto: texto(r.descricao, 600) }; },
  };
  function paraFicha(r) {
    var s = sistemaDe(r);
    if (grupoDe(r) !== "item") return null;
    var f = PARA_FICHA[s];
    return f ? f(r) : null;
  }

  /* Onde o registro entra numa ficha do sistema `destino`, e como. */
  function destinoNaFicha(r, destino) {
    var s = sistemaDe(r), g = grupoDe(r);
    if (g === "criatura") return { modo: "outro", texto: "Criaturas entram no combate, nos aliados e na consulta — não na ficha de personagem." };
    if (g === "estrutural") {
      if (s !== destino) return { modo: "incompativel", texto: "É de " + nomeDoSistema(s) + "." };
      var stE = subtipoDe(r);
      if (s === "ordem2") return { modo: "nativo", texto: stE === "perfil" ? "Escolhido na criação de personagens de Ordem II (experimental), com a habilidade de perfil. A cópia fica na ficha." : "Escolhida na criação de personagens de Ordem II (experimental), com a habilidade de ocupação. A cópia fica na ficha." };
      if (s === "vampiro") return { modo: "nativo", texto: ({ cla: "Escolhido na criação de vampiros; a Compulsão entra pelo mesmo caminho das do livro. A cópia fica na ficha.", predador: "Escolhido na criação: a especialização, a Disciplina e o que ele dá entram na ficha. A cópia fica na ficha.", disciplina: "Aparece na criação (clã e predador) e nas compras com XP; os poderes têm custo, teste e duração. A cópia fica na ficha.", vantagem: "Aparece na criação e nas compras com XP. A cópia fica na ficha.", conhecimento: "Aparece na criação e nas compras com XP (cada nível à parte). A cópia fica na ficha." })[stE] };
      if (s === "oblivio") return { modo: "nativo", texto: ({ papel: "Escolhido na criação de Personas, com a Habilidade Principal; a cópia fica na ficha.", motivacao: "Escolhida na criação de Personas, depois das do livro; a cópia fica na ficha.", mazela: "Aparece em \u201cAplicar mazela\u201d na ficha; a cópia fica na ficha.", fardo: "A mesa aplica na ficha (\u201cAplicar Fardo Homebrew\u201d); a cópia fica na ficha." })[stE] };
      if (s === "brutal" && ["assassino", "ameaca", "apavoro"].indexOf(stE) >= 0) return { modo: "nativo", texto: "Modelo de mesa: aparece na mesa da Diretora, ao configurar o Assassino; a mesa guarda a cópia." };
      if (s === "brutal") return { modo: "nativo", texto: stE === "arquetipo" ? "Escolhido na criação de Sobreviventes e na troca de Arquétipo; a mesa recebe a cópia pelo resumo da ficha." : "Aparece no editor de Arquétipo e nas listas de Estilo da ficha e da mesa." };
      if (s === "goblins" && stE === "pokepraga") return { modo: "nativo", texto: "Adaptação PokéPragas: a mesa põe à vista na ficha (aba Adaptações, em edição); captura, ataque e evolução seguem a regra. A cópia fica na ficha." };
      if (s === "goblins" && stE === "receita") return { modo: "nativo", texto: "Adaptação Vale dos Goblins: aparece na cozinha (aba Adaptações). A cópia fica na ficha." };
      if (s === "goblins") return { modo: "nativo", texto: stE === "ocupacao" ? "Escolhida na criação de goblins (e como ocupação épica), com a cópia guardada na ficha." : "Escolhido na criação de goblins, depois dos do livro, com a cópia guardada na ficha." };
      if (s === "tormenta20") return { modo: "nativo", texto: ({
        raca: "Escolhida na criação de personagem (depois das raças do livro), com a cópia guardada na ficha.",
        origem: "Escolhida na criação de personagem (depois das origens do livro): quem joga escolhe dois benefícios. A cópia fica na ficha.",
        divindade: "Escolhida na criação de personagem (depois do Panteão), com o poder concedido. A cópia fica na ficha.",
        classe: "Escolhida na criação de personagem e ao subir de nível (também como multiclasse). A cópia fica na ficha.",
      })[stE] || "Entra na ficha de Tormenta20." };
      return { modo: "nativo", texto: ({
        classe: "Escolhida na criação do agente (Classes Homebrew), com a cópia guardada na ficha.",
        origem: "Escolhida na criação do agente (aba Homebrew) ou ao trocar de origem, com a cópia guardada na ficha.",
        trilha: "Aparece na vaga de Trilha da progressão (e na criação, a partir de NEX 10%) para a classe dela, com a cópia guardada na ficha.",
        raca: "Escolhida na criação de personagem (depois das raças do livro), com a cópia guardada na ficha.",
      })[stE] || "Aparece nos seletores de elemento (rituais, criaturas, itens e, se permitido, afinidade)." };
    }
    if (s === destino) {
      if (g === "item") return { modo: "nativo", texto: destino === "brutal" ? "Vira o Apego \"item\" da ficha." : "Entra no inventário com as regras do sistema." };
      if (s === "ordem" || s === "universal" || s === "ordem2") return { modo: "nativo", texto: "Entra nas habilidades da ficha." };
      var stH = subtipoDe(r), dH = defDe(r);
      if (s === "brutal" && stH === "vantagem") return { modo: "nativo", texto: "A Diretora traz para a mesa (Vantagens da mesa → Da biblioteca): custo em PT, recarga e o efeito que o motor aplica. A mesa guarda a cópia." };
      if (s === "oblivio" && stH === "habilidade") return { modo: "nativo", texto: "Entra como habilidade Geral: escolhida ao concluir uma Missão ou concedida pela Testemunha (aba Habilidades); o limite de uso é contado pela ficha. A cópia fica na ficha." };
      if (s === "goblins" && stH === "magia" && [0, 1, 2, 3].some(function (i) { return dH["r" + i]; })) return { modo: "nativo", texto: "Entra na escolha de magias do Bruxo e se conjura como as do livro (teste de Noção; o resultado pelos hits, com o que a ficha aplica). A cópia fica na ficha." };
      if (s === "goblins" && stH === "tecnica") return { modo: "nativo", texto: "A mesa concede ao goblin (aba Técnicas, em edição); o uso de 1 vez por dia é marcado pela ficha. A cópia fica na ficha." };
      if (s === "vampiro" && stH === "disciplina" && dH.disciplina) return { modo: "nativo", texto: "Entra nos poderes da Disciplina (criação e compras com XP), com o custo em Checagens, a parada e a duração; o efeito é da mesa. A cópia fica na ficha." };
      if (s === "tormenta20" && stH === "magia") return { modo: "nativo", texto: "Aprendida na aba Magias (+ Aprender magia) e lançada com o custo do círculo, o dano, a cura e os efeitos configurados. A cópia fica na ficha." };
      if (s === "tormenta20" && stH === "poder" && (dH.grupoT20 || dH.grupo === "geral" || dH.grupo === "tormenta")) return { modo: "nativo", texto: "Escolhido ao subir de nível ou em + Poder avulso, com os efeitos e a ativação configurados. A cópia fica na ficha." };
      return { modo: "manual", texto: "O motor de " + nomeDoSistema(s) + " ainda só aplica habilidades do livro: a habilidade entra nas anotações da ficha, para consulta (Manual)." };
    }
    /* v9.35: com ações, entra nas Ações Homebrew da ficha (recursos nativos). */
    if (s === "universal" && lista(obj(obj(r).universal).acoes).length && destino !== "universal") return { modo: "manual", texto: "Conteúdo Universal com ações: entra nas Ações Homebrew da ficha, e as ações usam os recursos dela (custo, efeito e usos; o que não tiver recurso nativo, a mesa resolve)." };
    if (s === "universal") return { modo: "manual", texto: "Conteúdo Universal: entra como item narrativo (nome e descrição); regras e ações ficam marcadas como Manual." };
    return { modo: "incompativel", texto: "É de " + nomeDoSistema(s) + ": o R.A.M.A. não converte conteúdo entre sistemas." };
  }
  function nomeDoSistema(id) {
    var S = global.RAMASistemas;
    var s = S && S.lista().filter(function (x) { return x.id === id; })[0];
    return s ? s.nome : id;
  }

  /* Um Universal num sistema cadastrado: só nome e descrição, Manual. */
  var NARRATIVO = {
    tormenta20: function (r) { var n = texto(r.nome, 120); return { ref: "", nome: n, personalizado: { nome: n, categoria: "aventura", espacos: 0, resumo: notaDe(r), universal: true }, notas: "Universal (Manual): " + notaDe(r) }; },
    goblins: function (r) { return { nome: texto(r.nome, 120), categoria: "outro", personalizado: null, nota: "Universal (Manual): " + notaDe(r) }; },
    vampiro: function (r) { return { nome: texto(r.nome, 120), arma: "", armadura: "", dano: null, notas: "Universal (Manual): " + notaDe(r), personalizado: true }; },
    oblivio: function (r) { return { chave: "", nome: texto(r.nome, 80), nota: texto("Universal (Manual): " + notaDe(r), 300), qtd: 1 }; },
    ordem2: function (r) { return { nome: texto(r.nome, 120), tipo: "item", descricao: texto("Universal (Manual): " + (r.descricao || ""), 1200) }; },
    brutal: function (r) { return { nome: texto(r.nome, 80), texto: texto(r.descricao, 600) }; },
  };
  function narrativoPara(r, destino) { var f = NARRATIVO[destino]; return f ? f(r) : null; }

  /* =================================================================
     RESUMO (lista, pacotes)
     ================================================================= */
  function resumo(r) {
    var d = defDe(r), st = subtipoDe(r), s = sistemaDe(r);
    var p = [rotuloDoSubtipo(r)];
    if (s === "tormenta20" && st === "arma") p.push(d.dano + " " + (d.margem && d.margem < 20 ? d.margem + "/" : "") + "x" + (d.mult || 2));
    if (s === "tormenta20" && (st === "armadura" || st === "escudo")) p.push("Defesa +" + (d.defesa || 0));
    if (s === "vampiro" && st === "cla" && Array.isArray(d.disciplinas)) p.push(d.disciplinas.length + " Disciplinas");
    if (s === "vampiro" && st === "disciplina" && Array.isArray(d.poderesHb)) p.push((d.tipo === "fisica" ? "física" : "mental") + " · " + d.poderesHb.length + " poderes");
    if (s === "vampiro" && st === "conhecimento" && Array.isArray(d.niveis)) p.push(d.niveis.length + " nível(is)" + (d.cla ? " · exclusiva de clã" : ""));
    if (s === "vampiro" && st === "vantagem" && d.tipo) p.push((d.tipo === "defeito" ? "Defeito" : "Vantagem") + " · " + (d.niveis || []).join("/") + " pts");
    if (s === "oblivio" && st === "papel" && d.estresse) p.push("Estresse " + d.estresse + " + Carne · " + (1 + (d.habilidadesUnicas || []).length) + " habilidades");
    if (s === "brutal" && st === "arquetipo" && Array.isArray(d.estilos)) p.push("Iniciativa " + (d.iniciativa || "?") + "º · " + d.estilos.map(function (k) { var B = global.RAMABrutalCatalogo; return B && B.ESTILOS[k] ? B.ESTILOS[k].nome : k; }).join(" e "));
    if (s === "goblins" && (st === "ocupacao" || st === "descritor") && global.RAMAGoblinsHomebrew) p.push(global.RAMAGoblinsHomebrew.textoMods(d.mod) || (d.escolha ? "+1 à escolha" : "sem modificador"));
    if (s === "goblins" && st === "arma") p.push("bônus +" + (d.bonus || 0));
    if (s === "goblins" && st === "protecao") p.push("Durabilidade " + (d.durabilidade || 0));
    if (s === "vampiro" && st === "arma" && d.arma) p.push(((global.RAMAVampiroCatalogo || {}).ARMAS || {})[d.arma] ? global.RAMAVampiroCatalogo.ARMAS[d.arma].nome : d.arma);
    if (s === "oblivio" && st === "equipamento" && d.chave) p.push("base: " + ((((global.RAMAOblivioCatalogo || {}).equipamento || {})[d.chave] || {}).nome || d.chave));
    if (s === "ordem2" && st === "arma") p.push("dano " + (d.dano || 0));
    if (s === "ordem2" && st === "protecao") p.push("armadura " + (d.armadura || 0));
    if (s === "tormenta20" && st === "magia") p.push(d.circulo + "º círculo" + (d.dano ? " · dano " + d.dano : "") + (d.cura ? " · cura " + d.cura : ""));
    if (s === "tormenta20" && st === "poder" && d.grupoT20) p.push(({ combate: "combate", destino: "destino", magia: "magia", tormenta: "Tormenta" })[d.grupoT20] + ((d.efeitos || []).length || d.acao ? " · na conta" : ""));
    if (s === "tormenta20" && st === "origem" && Array.isArray(d.pericias)) p.push(d.pericias.length + (d.pericias.length === 1 ? " perícia · " : " perícias · ") + (d.poderes || []).length + ((d.poderes || []).length === 1 ? " poder · " : " poderes · ") + ((d.unico || {}).nome || "poder único"));
    if (s === "tormenta20" && st === "classe" && d.pv) p.push("PV " + d.pv.inicial + " + Con · PM " + (d.pm || 0) + "/nível" + (d.magias ? " · magias " + (d.magias.tipo === "arcana" ? "arcanas" : "divinas") : ""));
    if (s === "tormenta20" && st === "divindade") p.push("energia " + (d.energia || "qualquer") + " · " + ((d.poderes || []).length + (d.poderesProprios || []).length) + " poderes concedidos");
    if (s === "tormenta20" && st === "raca" && Array.isArray(d.habilidades)) p.push((((global.RAMATormenta20Dados || {}).TAMANHO || {})[d.tamanho] || { nome: d.tamanho || "Médio" }).nome + " · " + d.habilidades.filter(function (h) { return h && h.id !== "corpo"; }).length + " habilidades");
    if (s === "ordem" && st === "elemento" && d.permiteAfinidade) p.push("pode ser afinidade");
    if (s === "ordem" && st === "origem" && Array.isArray(d.pericias)) p.push((d.pericias.length + (d.periciasAEscolher || 0)) + " perícias · " + (d.poder || "poder") + (d.efeitos && d.efeitos.length ? " · na conta" : ""));
    if (s === "ordem" && st === "trilha" && d.classe) p.push("para " + (((global.RAMAOrdemCatalogo && global.RAMAOrdemCatalogo.classe(d.classe)) || {}).nome || d.classe));
    if (s === "ordem" && st === "classe" && d.pvInicial) p.push(d.pvInicial.base + (d.pvInicial.atributo ? " + " + d.pvInicial.atributo.toUpperCase() : "") + " PV iniciais" + (d.patentes ? " · Patentes" : ""));
    var u = obj(r).universal;
    if (u && lista(u.acoes).length) p.push(u.acoes.length === 1 ? "1 ação" : u.acoes.length + " ações");
    return p.filter(Boolean).join(" · ");
  }

  /* =================================================================
     MODELO UNIVERSAL — campos, ações e o motor das ações
     ================================================================= */
  var TIPOS_CAMPO = [
    { valor: "texto", rotulo: "Texto curto" }, { valor: "area", rotulo: "Texto longo" }, { valor: "numero", rotulo: "Número" },
    { valor: "booleano", rotulo: "Sim / não" }, { valor: "opcoes", rotulo: "Lista de opções" }, { valor: "referencias", rotulo: "Lista de referências" },
    { valor: "dado", rotulo: "Fórmula de dado" }, { valor: "recurso", rotulo: "Recurso (atual / máximo)" },
  ];
  var MODELOS_UNIVERSAIS = [
    { chave: "item", rotulo: "Item", grupo: "item", ajuda: "Um objeto com peso, campos e ações." },
    { chave: "habilidade", rotulo: "Habilidade", grupo: "habilidade", ajuda: "Poder, técnica ou magia com texto, custo e ações." },
    { chave: "criatura", rotulo: "Criatura", grupo: "criatura", ajuda: "A mini ficha livre." },
    { chave: "arquetipo", rotulo: "Arquétipo (classe, raça, origem)", grupo: "habilidade", ajuda: "Um conjunto de traços com nome próprio; os campos dizem o que ele concede.", campos: [["concede", "O que concede", "area"]] },
    { chave: "elemento", rotulo: "Elemento / Condição", grupo: "habilidade", ajuda: "Um estado ou força da sua mesa: efeitos, duração e como sai.", campos: [["duracao", "Duração", "texto"], ["comoSai", "Como termina", "texto"]] },
    { chave: "branco", rotulo: "Em branco", grupo: "item", ajuda: "Comece do zero e dê o seu próprio rótulo ao tipo." },
  ];
  var EFEITOS = [
    { valor: "recuperar", rotulo: "Recuperar um recurso" }, { valor: "gastar", rotulo: "Gastar / ferir um recurso" },
    { valor: "rolar", rotulo: "Só rolar e mostrar" }, { valor: "manual", rotulo: "Manual (descrever o efeito)" },
  ];
  var RECUPERACOES = [{ valor: "manual", rotulo: "Manual (botão)" }, { valor: "cena", rotulo: "Por cena" }, { valor: "descanso", rotulo: "Por descanso" }];
  var ALVOS = [{ valor: "proprio", rotulo: "O próprio personagem" }, { valor: "escolher", rotulo: "Escolher na hora (manual)" }];

  function chaveDe(rotulo, usadas) {
    var base = String(rotulo || "campo").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 30) || "campo";
    var k = base, i = 2;
    while (usadas && usadas[k]) k = base + "_" + (i++);
    return k;
  }
  function normalizarCampo(c, usadas) {
    var x = obj(c);
    var tipo = TIPOS_CAMPO.some(function (t) { return t.valor === x.tipo; }) ? x.tipo : "texto";
    var chave = /^[a-z0-9_]{1,30}$/.test(x.chave || "") && !usadas[x.chave] ? x.chave : chaveDe(x.rotulo, usadas);
    usadas[chave] = true;
    var s = { chave: chave, rotulo: texto(x.rotulo, 60) || "Campo", tipo: tipo };
    if (tipo === "numero") { if (isFinite(Number(x.min)) && x.min !== "" && x.min !== null && x.min !== undefined) s.min = Number(x.min); if (isFinite(Number(x.max)) && x.max !== "" && x.max !== null && x.max !== undefined) s.max = Number(x.max); if (x.unidade) s.unidade = texto(x.unidade, 20); }
    if (tipo === "opcoes" || tipo === "referencias") s.opcoes = lista(x.opcoes).map(function (o) { return texto(o, 60).trim(); }).filter(Boolean).slice(0, 30);
    return s;
  }
  function normalizarValor(c, v) {
    if (c.tipo === "numero") { var n = num(v, c.min === undefined ? -999999 : c.min, c.max === undefined ? 999999 : c.max, null); return n; }
    if (c.tipo === "booleano") return v === true;
    if (c.tipo === "opcoes") return lista(c.opcoes).indexOf(v) >= 0 ? v : "";
    if (c.tipo === "referencias") return lista(v).filter(function (x) { return lista(c.opcoes).indexOf(x) >= 0; });
    if (c.tipo === "dado") { var t = texto(v, 40).trim(); return t && dadoOk(t) ? t : ""; }
    if (c.tipo === "recurso") { var o = obj(v); var max = int(o.max, 0, 9999, 0); return { atual: int(o.atual, 0, max, max), max: max }; }
    return texto(v, c.tipo === "area" ? 4000 : 200);
  }
  function normalizarAcao(a) {
    var x = obj(a);
    var usos = obj(x.usos);
    var custo = obj(x.custo), efeito = obj(x.efeito);
    /* `chave`, e não `id`: a exportação apaga todo `id`, e os usos gastos
       de um item da ficha são guardados por esta chave. */
    var s = {
      chave: /^[A-Za-z0-9_-]{1,40}$/.test(x.chave || "") ? x.chave : (/^[A-Za-z0-9_-]{1,40}$/.test(x.id || "") ? x.id : "ac" + Math.random().toString(36).slice(2, 10)),
      nome: texto(x.nome, 60) || "Usar",
      usos: usos.max ? { max: int(usos.max, 1, 999, 1), recuperacao: RECUPERACOES.some(function (r) { return r.valor === usos.recuperacao; }) ? usos.recuperacao : "manual" } : null,
      custo: custo.recurso ? { recurso: texto(custo.recurso, 60), quantidade: int(custo.quantidade, 1, 999, 1) } : null,
      teste: x.teste && dadoOk(x.teste) ? texto(x.teste, 40) : "",
      efeito: { tipo: EFEITOS.some(function (e) { return e.valor === efeito.tipo; }) ? efeito.tipo : "manual", recurso: texto(efeito.recurso, 60), expressao: efeito.expressao && dadoOk(efeito.expressao) ? texto(efeito.expressao, 40) : "", texto: texto(efeito.texto, 400) },
      alvo: ALVOS.some(function (al) { return al.valor === x.alvo; }) ? x.alvo : "proprio",
      requisitos: texto(x.requisitos, 200), duracao: texto(x.duracao, 60),
    };
    return s;
  }
  function normalizarUniversal(u) {
    var x = obj(u), usadas = {};
    var campos = lista(x.campos).slice(0, 40).map(function (c) { return normalizarCampo(c, usadas); });
    var valores = {};
    campos.forEach(function (c) { var v = normalizarValor(c, obj(x.valores)[c.chave]); if (v !== null && v !== "" && !(Array.isArray(v) && !v.length)) valores[c.chave] = v; });
    var saida = { versao: VERSAO, rotuloTipo: texto(x.rotuloTipo, 40), campos: campos, valores: valores, acoes: lista(x.acoes).slice(0, 12).map(normalizarAcao) };
    /* O que a FICHA guarda de uso (cargas gastas): só no item da ficha. */
    if (x.estado && typeof x.estado === "object") {
      var est = { usos: {} };
      Object.keys(obj(x.estado.usos)).forEach(function (k) { est.usos[k] = int(x.estado.usos[k], 0, 999, 0); });
      saida.estado = est;
    }
    return saida;
  }

  /* Usos restantes de uma ação no item da ficha. */
  function usosRestantes(u, acao) {
    if (!acao.usos) return null;
    var gastos = obj(obj(obj(u).estado).usos)[acao.chave] || 0;
    return Math.max(0, acao.usos.max - gastos);
  }
  /* Executa uma ação (puro): devolve o que muda, ou o motivo de não poder.
     ficha = { status: [{ id, nome, atual, maximo }] } (o núcleo Universal).
     rolar(expressao) → { ok, total } (o rolador do R.A.M.A.). */
  function executarAcao(u, acaoChave, ficha, rolar, escolhas) {
    var x = obj(u);
    var a = lista(x.acoes).filter(function (y) { return y.chave === acaoChave; })[0];
    if (!a) return { ok: false, motivo: "Ação desconhecida." };
    var resto = usosRestantes(x, a);
    if (resto !== null && resto <= 0) return { ok: false, motivo: "Sem usos restantes." };
    var status = lista(obj(ficha).status);
    var porNome = function (n) { var k = String(n || "").toLowerCase(); return status.filter(function (s) { return String(s.id) === n || String(s.nome).toLowerCase() === k; })[0] || null; };
    var mudancas = [];
    if (a.custo) {
      var rc = porNome(obj(escolhas).recursoCusto || a.custo.recurso);
      if (!rc) return { ok: false, motivo: "A ficha não tem o recurso \"" + a.custo.recurso + "\" para pagar o custo.", manual: true };
      if ((Number(rc.atual) || 0) < a.custo.quantidade) return { ok: false, motivo: rc.nome + " insuficiente (" + rc.atual + " de " + a.custo.quantidade + ")." };
      mudancas.push({ statusId: rc.id, nome: rc.nome, de: Number(rc.atual) || 0, para: (Number(rc.atual) || 0) - a.custo.quantidade, motivo: "custo" });
    }
    var rolagens = [];
    var teste = null;
    /* v9.35: a perícia nativa escolhida soma ao teste (Ordem, Tormenta20). */
    var bonusT = Math.round(Number(obj(escolhas).bonusTeste) || 0);
    var expTeste = a.teste ? a.teste + (bonusT ? (bonusT > 0 ? "+" : "") + bonusT : "") : "";
    if (a.teste) { teste = rolar(expTeste); if (!teste || !teste.ok) return { ok: false, motivo: "O teste não rolou." }; rolagens.push({ rotulo: "Teste" + (obj(escolhas).rotuloTeste ? " (" + obj(escolhas).rotuloTeste + ")" : ""), expressao: expTeste, total: teste.total }); }
    var efeito = a.efeito;
    var valor = null;
    if (efeito.expressao) { var r = rolar(efeito.expressao); if (!r || !r.ok) return { ok: false, motivo: "O efeito não rolou." }; valor = r.total; rolagens.push({ rotulo: "Efeito", expressao: efeito.expressao, total: r.total }); }
    var manual = efeito.tipo === "manual" || a.alvo === "escolher";
    if (!manual && (efeito.tipo === "recuperar" || efeito.tipo === "gastar")) {
      var re = porNome(obj(escolhas).recursoEfeito || efeito.recurso);
      if (!re) return { ok: false, motivo: "A ficha não tem o recurso \"" + efeito.recurso + "\". Escolha um recurso ou aplique à mão.", manual: true };
      var atualBase = mudancas.filter(function (m) { return m.statusId === re.id; }).length ? mudancas.filter(function (m) { return m.statusId === re.id; })[0].para : (Number(re.atual) || 0);
      var max = Number(re.maximo) || 0;
      var para = efeito.tipo === "recuperar" ? Math.min(max || Infinity, atualBase + (valor || 0)) : Math.max(0, atualBase - (valor || 0));
      mudancas = mudancas.filter(function (m) { return m.statusId !== re.id; }).concat([{ statusId: re.id, nome: re.nome, de: Number(re.atual) || 0, para: para, motivo: efeito.tipo }]);
    }
    var estado = { usos: Object.assign({}, obj(obj(x.estado).usos)) };
    if (a.usos) estado.usos[a.chave] = (estado.usos[a.chave] || 0) + 1;
    return { ok: true, acao: a, rolagens: rolagens, valor: valor, mudancas: mudancas, estado: estado, manual: manual, texto: efeito.texto };
  }
  /* Recupera os usos por gatilho (o que a ficha fornece) ou à mão. */
  function recuperarUsos(u, gatilho) {
    var x = obj(u);
    var estado = { usos: Object.assign({}, obj(obj(x.estado).usos)) };
    lista(x.acoes).forEach(function (a) { if (a.usos && (gatilho === "tudo" || a.usos.recuperacao === gatilho)) delete estado.usos[a.chave]; });
    return estado;
  }
  function previaDaAcao(a) {
    var x = normalizarAcao(a);
    var p = [];
    if (x.usos) p.push(x.usos.max + (x.usos.max === 1 ? " uso" : " usos") + (x.usos.recuperacao !== "manual" ? " (recupera por " + x.usos.recuperacao + ")" : ""));
    if (x.custo) p.push("custa " + x.custo.quantidade + " de " + x.custo.recurso);
    if (x.teste) p.push("teste " + x.teste);
    if (x.efeito.tipo === "recuperar") p.push("recupera " + (x.efeito.expressao || "?") + " de " + (x.efeito.recurso || "um recurso"));
    if (x.efeito.tipo === "gastar") p.push("tira " + (x.efeito.expressao || "?") + " de " + (x.efeito.recurso || "um recurso"));
    if (x.efeito.tipo === "rolar") p.push("rola " + (x.efeito.expressao || "?"));
    if (x.efeito.tipo === "manual") p.push("efeito manual" + (x.efeito.texto ? ": " + x.efeito.texto : ""));
    if (x.alvo === "escolher") p.push("alvo escolhido na hora");
    return x.nome + ": " + p.join(", ") + ".";
  }

  /* =================================================================
     COMPATIBILIDADE COM PACOTES (o mesmo julgamento do servidor)
     ================================================================= */
  function compativelComPacote(r, sistemaDoPacote) {
    var s = sistemaDe(r);
    if (obj(r).modelo) {
      if (s === "universal") return { ok: true, motivo: "" };
      return s === sistemaDoPacote ? { ok: true, motivo: "" } : { ok: false, motivo: "Criação de " + nomeDoSistema(s) + ": o pacote é de " + nomeDoSistema(sistemaDoPacote) + ", e o R.A.M.A. não converte conteúdo entre sistemas." };
    }
    return null; /* formato anterior: a regra de antes (pacotes-homebrew.js) */
  }

  /* Um registro com modelo vindo de um ARQUIVO (importação): refeito pelo
     mesmo caminho do editor — só os campos do subtipo, cada um validado. */
  function deArquivo(bruto) {
    var x = obj(bruto), m = obj(x.modelo);
    if (!SISTEMAS[m.sistema]) return { ok: false, erro: "O arquivo é de um sistema que esta versão não conhece." };
    var g = ["habilidade", "estrutural"].indexOf(m.grupo) >= 0 ? m.grupo : "item";
    if (!especDoSubtipo(m.sistema, g, m.subtipo)) return { ok: false, erro: "O tipo deste arquivo não existe neste sistema." };
    var classeImportada = g === "estrutural" && m.subtipo === "classe" && m.sistema === "ordem" && global.RAMAOrdemHomebrew ? global.RAMAOrdemHomebrew.normalizarClasse(Object.assign({}, m.def, { chave: "" })) : null;
    if (classeImportada) { delete classeImportada.chave; delete classeImportada.homebrewId; }
    /* Origem e Trilha (v9.9): refeitas pelo normalizador do motor. */
    var HOi = global.RAMAOrdemHomebrew, defImportada = null;
    if (g === "estrutural" && HOi && m.sistema === "ordem" && (m.subtipo === "origem" || m.subtipo === "trilha")) {
      defImportada = (m.subtipo === "origem" ? HOi.normalizarOrigem : HOi.normalizarTrilha)(Object.assign({}, m.def, { chave: "", nome: x.nome }));
      ["chave", "homebrewId", "homebrew", "fonte", "pagina", "nome", "descricao"].forEach(function (k) { delete defImportada[k]; });
    }
    /* Raça de T20 (v9.10): refeita pelo normalizador do motor. */
    var RAi = global.RAMATormenta20Racas;
    if (g === "estrutural" && m.sistema === "tormenta20" && m.subtipo === "raca" && RAi) {
      defImportada = RAi.normalizarRacaHomebrew(Object.assign({}, m.def, { id: "", nome: x.nome }));
      ["id", "homebrewId", "homebrew", "fonte", "pagina", "nome", "descricao"].forEach(function (k) { delete defImportada[k]; });
      defImportada.habilidades = defImportada.habilidades.filter(function (h) { return h.id !== "corpo"; });
    }
    /* Perfil e Ocupação de Ordem II (v9.21). */
    var O2C = global.RAMAOrdem2Catalogo;
    if (g === "estrutural" && m.sistema === "ordem2" && O2C && O2C.normalizarHomebrew && (m.subtipo === "perfil" || m.subtipo === "ocupacao")) {
      defImportada = O2C.normalizarHomebrew(m.subtipo, Object.assign({}, m.def, { chave: "", id: "", nome: x.nome }));
      ["chave", "id", "homebrewId", "homebrew", "nome", "texto", "vistas"].forEach(function (k) { delete defImportada[k]; });
    }
    /* Clã, Predador, Disciplina e Vantagem de Vampiro (v9.20). */
    var VC = global.RAMAVampiroCatalogo, VD = global.RAMAVampiroDisciplinas;
    if (g === "estrutural" && m.sistema === "vampiro" && VC && VC.normalizarHomebrew && ["cla", "predador", "disciplina", "vantagem", "conhecimento"].indexOf(m.subtipo) >= 0) {
      defImportada = m.subtipo === "disciplina" ? VD.normalizarDisciplinaHomebrew(Object.assign({}, m.def, { chave: "", nome: x.nome })) : VC.normalizarHomebrew(m.subtipo, Object.assign({}, m.def, { chave: "", nome: x.nome }));
      ["chave", "homebrewId", "homebrew", "nome", "pagina", "descricao", "texto", "grupo"].forEach(function (k) { delete defImportada[k]; });
      if (defImportada.compulsao) delete defImportada.compulsao.chave;
    }
    /* Papel, Motivação, Mazela e Fardo de Oblívio (v9.19). */
    var OC = global.RAMAOblivioCatalogo;
    if (g === "estrutural" && m.sistema === "oblivio" && OC && OC.normalizarHomebrew && ["papel", "motivacao", "mazela", "fardo"].indexOf(m.subtipo) >= 0) {
      defImportada = OC.normalizarHomebrew(m.subtipo, Object.assign({}, m.def, { chave: "", nome: x.nome }));
      ["chave", "homebrewId", "homebrew", "nome", "pag", "principal", "unicas", "processamento"].forEach(function (k) { delete defImportada[k]; });
    }
    /* Arquétipo e Estilo de BRUTAL (v9.18). */
    var BC = global.RAMABrutalCatalogo;
    if (g === "estrutural" && m.sistema === "brutal" && BC && BC.normalizarArquetipoHomebrew && (m.subtipo === "arquetipo" || m.subtipo === "estilo")) {
      defImportada = m.subtipo === "arquetipo" ? BC.normalizarArquetipoHomebrew(Object.assign({}, m.def, { chave: "", nome: x.nome })) : { texto: BC.normalizarEstiloHomebrew(Object.assign({}, m.def, { chave: "", nome: x.nome })).texto };
      ["chave", "homebrewId", "homebrew", "nome", "pagina"].forEach(function (k) { delete defImportada[k]; });
      if (defImportada.habilidade) delete defImportada.habilidade.chave;
    }
    /* Modelos de mesa de BRUTAL (v9.32): Ameaça, Apavoro e Assassino. */
    if (g === "estrutural" && m.sistema === "brutal" && BC && BC.normalizarAmeacaHomebrew && ["ameaca", "apavoro", "assassino"].indexOf(m.subtipo) >= 0) {
      defImportada = ({ ameaca: BC.normalizarAmeacaHomebrew, apavoro: BC.normalizarApavoroHomebrew, assassino: BC.normalizarAssassinoHomebrew })[m.subtipo](Object.assign({}, m.def, { chave: "", nome: x.nome }));
      ["chave", "homebrewId", "homebrew", "nome", "pagina", "definida", "intento"].forEach(function (k) { delete defImportada[k]; });
    }
    /* Ocupação e Descritor de Goblins (v9.17). */
    var GC = global.RAMAGoblinsCatalogo;
    if (g === "estrutural" && m.sistema === "goblins" && GC && GC.normalizarOcupacaoHomebrew && (m.subtipo === "ocupacao" || m.subtipo === "descritor")) {
      defImportada = (m.subtipo === "ocupacao" ? GC.normalizarOcupacaoHomebrew : GC.normalizarDescritorHomebrew)(Object.assign({}, m.def, { chave: "", nome: x.nome }));
      ["chave", "homebrewId", "homebrew", "fonte", "pagina", "nome", "descricao", "escolhas"].forEach(function (k) { delete defImportada[k]; });
      (defImportada.tecnicas || []).forEach(function (t) { delete t.chave; });
    }
    /* Origem e Divindade de T20 (v9.11). */
    var cat20 = m.sistema === "tormenta20" ? ({ origem: global.RAMATormenta20Origens, divindade: global.RAMATormenta20Deuses, classe: global.RAMATormenta20Classes })[m.subtipo] : null;
    if (g === "estrutural" && cat20 && cat20.normalizarHomebrew) {
      defImportada = cat20.normalizarHomebrew(Object.assign({}, m.def, { id: "", nome: x.nome }));
      ["id", "homebrewId", "homebrew", "fonte", "pagina", "nome", "descricao"].forEach(function (k) { delete defImportada[k]; });
      if (m.subtipo === "classe") { ["habilidades", "tabela", "poderes"].forEach(function (k) { delete defImportada[k]; }); defImportada.poderesProprios.forEach(function (p) { delete p.id; }); }
      if (m.subtipo === "divindade") { defImportada.poderes = defImportada.poderes.filter(function (k) { return !/-p\d$/.test(k); }); defImportada.poderesProprios.forEach(function (p) { delete p.id; }); }
    }
    /* Poder de T20 (v9.14): efeitos, ativação e nível mínimo pelo motor. */
    if (g === "habilidade" && m.sistema === "tormenta20" && m.subtipo === "poder" && global.RAMATormenta20Poderes && global.RAMATormenta20Poderes.normalizarHomebrew && m.def && m.def.grupoT20) {
      var pz = global.RAMATormenta20Poderes.normalizarHomebrew(Object.assign({}, m.def, { grupo: m.def.grupoT20 }));
      defImportada = { grupoT20: pz.grupo, nivelMinimo: pz.nivelMinimo, efeitos: pz.efeitos };
      if (pz.acao) defImportada.acao = pz.acao;
    }
    var r = guardar(m.sistema, g, m.subtipo, { nome: x.nome, descricao: x.descricao || x.texto, origem: x.origem, valores: m.def, universal: x.universal, etiqueta: x.etiqueta, modeloAnterior: m, classe: classeImportada, def: defImportada });
    if (r.ok) { delete r.registro.id; r.registro.visibilidade = "privado"; }
    return r;
  }

  global.RAMAHomebrewAdaptadores = {
    deArquivo: deArquivo,
    VERSAO: VERSAO, SISTEMAS: SISTEMAS, adaptador: adaptador, subtipos: subtipos, especDoSubtipo: especDoSubtipo,
    valoresDe: valoresDe, erros: erros, guardar: guardar,
    sistemaDe: sistemaDe, grupoDe: grupoDe, subtipoDe: subtipoDe, rotuloDoSubtipo: rotuloDoSubtipo,
    paraFicha: paraFicha, narrativoPara: narrativoPara, destinoNaFicha: destinoNaFicha, resumo: resumo,
    TIPOS_CAMPO: TIPOS_CAMPO, MODELOS_UNIVERSAIS: MODELOS_UNIVERSAIS, EFEITOS: EFEITOS, RECUPERACOES: RECUPERACOES, ALVOS: ALVOS,
    chaveDe: chaveDe, normalizarUniversal: normalizarUniversal, normalizarAcao: normalizarAcao,
    executarAcao: executarAcao, recuperarUsos: recuperarUsos, usosRestantes: usosRestantes, previaDaAcao: previaDaAcao,
    compativelComPacote: compativelComPacote,
  };
})(typeof window !== "undefined" ? window : globalThis);
