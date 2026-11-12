/* =====================================================================
   R.A.M.A. — Tormenta20 · itens mágicos e recompensas (Livro Básico,
   Capítulo 8, p. 324–349)
   ---------------------------------------------------------------------
   XP por desafio, Tabela 8-1 de tesouro por ND, riquezas, itens
   diversos e equipamento aleatórios, itens superiores aleatórios,
   encantos de armas e armaduras/escudos, itens específicos, poções e
   pergaminhos, acessórios e artefatos. Efeitos no vocabulário do motor
   (js/tormenta20/regras.js); o resto fica no resumo, com a página.
   Resumos do RAMA; a descrição completa está no livro.
   ===================================================================== */

(function (global) {
  "use strict";

  var IM = global.RAMATormenta20ItensMagicos = global.RAMATormenta20ItensMagicos || {};
  function lista(v) { return Array.isArray(v) ? v : []; }

  /* --------------------------------------------------------- XP (p. 326) */
  /* ND × 1.000 dividido pelo grupo; empate rende metade; derrota, um
     quarto; desafio com ND 5 ou mais abaixo do nível do grupo não rende. */
  IM.RESULTADOS_DESAFIO = { vencido: 1, empate: 0.5, derrota: 0.25 };
  IM.xpDoDesafio = function (nd, personagens, resultado, nivelGrupo) {
    var A = global.RAMATormenta20Ameacas;
    var n = A ? A.ndNumero(nd) : Number(nd) || 0;
    var q = Math.max(1, Math.floor(Number(personagens) || 1));
    var fator = IM.RESULTADOS_DESAFIO[resultado] === undefined ? 1 : IM.RESULTADOS_DESAFIO[resultado];
    var irrelevante = nivelGrupo !== undefined && nivelGrupo !== null && n <= Number(nivelGrupo) - 5;
    var total = irrelevante ? 0 : Math.floor(n * 1000 * fator);
    return { total: total, porPersonagem: Math.floor(total / q), irrelevante: irrelevante, fator: fator };
  };

  /* ------------------------------------------- Tabela 8-1 (p. 328–329) */
  /* Cada linha: [ate, resultado]. Dinheiro: "—", "1d6x10 TC", "1 riqueza
     menor", "1d3 riquezas menores+%"… Itens: "Diverso", "Equipamento",
     "1 poção", "Superior (n melhorias)", "Mágico (menor)"; sufixo "2D". */
  IM.TESOURO = {
    "1/4": { dinheiro: [[30, "—"], [70, "1d6x10 TC"], [95, "1d4x100 TC"], [100, "1d6x10 T$"]], itens: [[50, "—"], [75, "Diverso"], [100, "Equipamento"]] },
    "1/2": { dinheiro: [[25, "—"], [70, "2d6x10 TC"], [95, "2d8x10 T$"], [100, "1d4x100 T$"]], itens: [[45, "—"], [70, "Diverso"], [100, "Equipamento"]] },
    "1": { dinheiro: [[20, "—"], [70, "3d8x10 T$"], [95, "4d12x10 T$"], [100, "1 riqueza menor"]], itens: [[40, "—"], [65, "Diverso"], [90, "Equipamento"], [100, "1 poção"]] },
    "2": { dinheiro: [[15, "—"], [55, "3d10x10 T$"], [85, "2d4x100 T$"], [95, "2d6+1x100 T$"], [100, "1 riqueza menor"]], itens: [[30, "—"], [40, "Diverso"], [70, "Equipamento"], [90, "1 poção"], [100, "Superior (1 melhoria)"]] },
    "3": { dinheiro: [[10, "—"], [20, "4d12x10 T$"], [60, "1d4x100 T$"], [90, "1d8x10 TO"], [100, "1d3 riquezas menores"]], itens: [[25, "—"], [35, "Diverso"], [60, "Equipamento"], [85, "1 poção"], [100, "Superior (1 melhoria)"]] },
    "4": { dinheiro: [[10, "—"], [50, "1d6x100 T$"], [80, "1d12x100 T$"], [90, "1 riqueza menor+%"], [100, "1d3 riquezas menores+%"]], itens: [[20, "—"], [30, "Diverso"], [55, "Equipamento 2D"], [80, "1 poção+%"], [100, "Superior (1 melhoria) 2D"]] },
    "5": { dinheiro: [[15, "—"], [65, "1d8x100 T$"], [95, "3d4x10 TO"], [100, "1 riqueza média"]], itens: [[20, "—"], [70, "1 poção"], [90, "Superior (1 melhoria)"], [100, "Superior (2 melhorias)"]] },
    "6": { dinheiro: [[15, "—"], [60, "2d6x100 T$"], [90, "2d10x100 T$"], [100, "1d3+1 riquezas menores"]], itens: [[20, "—"], [65, "1 poção+%"], [95, "Superior (1 melhoria)"], [100, "Superior (2 melhorias) 2D"]] },
    "7": { dinheiro: [[10, "—"], [60, "2d8x100 T$"], [90, "2d12x10 TO"], [100, "1d4+1 riquezas menores"]], itens: [[20, "—"], [60, "1d3 poções"], [90, "Superior (2 melhorias)"], [100, "Superior (3 melhorias)"]] },
    "8": { dinheiro: [[10, "—"], [55, "2d10x100 T$"], [95, "1d4+1 riquezas menores"], [100, "1 riqueza média+%"]], itens: [[20, "—"], [75, "1d3 poções"], [95, "Superior (2 melhorias)"], [100, "Superior (3 melhorias) 2D"]] },
    "9": { dinheiro: [[10, "—"], [35, "1 riqueza média"], [85, "4d6x100 T$"], [100, "1d3 riquezas médias"]], itens: [[20, "—"], [70, "1 poção+%"], [95, "Superior (3 melhorias)"], [100, "Mágico (menor)"]] },
    "10": { dinheiro: [[10, "—"], [30, "4d6x100 T$"], [85, "4d10x10 TO"], [100, "1d3+1 riquezas médias"]], itens: [[50, "—"], [75, "1d3+1 poções"], [90, "Superior (3 melhorias)"], [100, "Mágico (menor)"]] },
    "11": { dinheiro: [[10, "—"], [45, "2d4x1000 T$"], [85, "1d3 riquezas médias"], [100, "2d6x100 TO"]], itens: [[45, "—"], [70, "1d4+1 poções"], [90, "Superior (3 melhorias)"], [100, "Mágico (menor) 2D"]] },
    "12": { dinheiro: [[10, "—"], [45, "1 riqueza média+%"], [80, "2d6x1000 T$"], [100, "1d4+1 riquezas médias"]], itens: [[45, "—"], [70, "1d3+1 poções+%"], [85, "Superior (4 melhorias)"], [100, "Mágico (menor)"]] },
    "13": { dinheiro: [[10, "—"], [45, "4d4x1000 T$"], [80, "1d3+1 riquezas médias"], [100, "4d6x100 TO"]], itens: [[40, "—"], [65, "1d4+1 poções+%"], [95, "Superior (4 melhorias)"], [100, "Mágico (médio)"]] },
    "14": { dinheiro: [[10, "—"], [45, "1d3+1 riquezas médias"], [80, "3d6x1000 T$"], [100, "1 riqueza maior"]], itens: [[40, "—"], [65, "1d4+1 poções+%"], [90, "Superior (4 melhorias)"], [100, "Mágico (médio)"]] },
    "15": { dinheiro: [[10, "—"], [45, "1 riqueza média+%"], [80, "2d10x1000 T$"], [100, "1d4x1000 TO"]], itens: [[35, "—"], [45, "1d6+1 poções"], [85, "Superior (4 melhorias) 2D"], [100, "Mágico (médio)"]] },
    "16": { dinheiro: [[10, "—"], [40, "3d6x1000 T$"], [75, "3d10x100 TO"], [100, "1d3 riquezas maiores"]], itens: [[35, "—"], [45, "1d6+1 poções+%"], [80, "Superior (4 melhorias) 2D"], [100, "Mágico (médio)"]] },
    "17": { dinheiro: [[5, "—"], [40, "4d6x1000 T$"], [75, "1d3 riquezas médias+%"], [100, "2d4x1000 TO"]], itens: [[20, "—"], [40, "Mágico (menor)"], [80, "Mágico (médio)"], [100, "Mágico (maior)"]] },
    "18": { dinheiro: [[5, "—"], [40, "4d10x1000 T$"], [75, "1 riqueza maior"], [100, "1d3+1 riquezas maiores"]], itens: [[15, "—"], [40, "Mágico (menor) 2D"], [70, "Mágico (médio)"], [100, "Mágico (maior)"]] },
    "19": { dinheiro: [[5, "—"], [40, "4d12x1000 T$"], [75, "1 riqueza maior+%"], [100, "1d12x1000 TO"]], itens: [[10, "—"], [40, "Mágico (menor) 2D"], [60, "Mágico (médio) 2D"], [100, "Mágico (maior)"]] },
    "20": { dinheiro: [[5, "—"], [40, "2d4x1000 TO"], [75, "1d3 riquezas maiores"], [100, "1d3+1 riquezas maiores+%"]], itens: [[5, "—"], [40, "Mágico (menor) 2D"], [50, "Mágico (médio) 2D"], [100, "Mágico (maior) 2D"]] },
  };
  /* Categorias de tesouro das criaturas (p. 327). */
  IM.CATEGORIAS_TESOURO = { nenhum: "Nenhum", metade: "Metade (dinheiro dividido por 2)", padrao: "Padrão", dobro: "Dobro (duas rolagens em cada coluna)" };

  /* Tabela 8-2: riquezas (p. 330): [menorAte, mediaAte, maiorAte, dados, média]. */
  IM.RIQUEZAS = [
    [25, 0, 0, "4d4", 10], [40, 0, 0, "1d4x10", 25], [55, 10, 0, "2d4x10", 50], [70, 30, 0, "4d6x10", 140], [85, 50, 5, "1d6x100", 350],
    [95, 65, 15, "2d6x100", 700], [99, 80, 25, "2d8x100", 900], [100, 90, 40, "4d10x100", 2200], [0, 95, 60, "6d12x100", 3900], [0, 99, 75, "2d10x1000", 11000],
    [0, 100, 85, "6d8x1000", 27000], [0, 0, 95, "1d10x10000", 55000], [0, 0, 100, "4d12x10000", 260000],
  ];
  /* Tabela 8-3: itens diversos (p. 331): [até, ref no equipamento ou nome]. */
  IM.DIVERSOS = [[2, "acido"], [4, "aguaBenta"], [5, "alaudeElfico"], [6, "algemas"], [8, "bagaDeFogo"], [23, "balsamoRestaurador"], [24, "bandana"], [25, "bandoleiraDePocoes"], [30, "bomba"], [31, "botasReforcadas"], [32, "camisaBufante"], [33, "capaEsvoacante"], [34, "capaPesada"], [35, "casacoLongo"], [36, "chapeuArcano"], [38, "colecaoDeLivros"], [40, "cosmetico"], [42, "denteDeDragao"], [43, "enfeiteDeElmo"], [44, "elixirDoAmor"], [46, "equipamentoDeViagem"], [56, "essenciaDeMana"], [57, "estojoDeDisfarces"], [58, "farraposDeErmitao"], [59, "flautaMistica"], [66, "fogoAlquimico"], [67, "gorroDeErvas"], [69, "liquenLilas"], [70, "luneta"], [71, "luvaDePelica"], [73, "maletaDeMedicamentos"], [74, "manopla"], [75, "mantoEclesiastico"], [78, "mochilaDeAventureiro"], [80, "musgoPurpura"], [81, "organizadorDePergaminhos"], [83, "ossosDeMonstro"], [85, "poDeCristal"], [87, "poDeGiz"], [88, "poDoDesaparecimento"], [89, "robeMistico"], [91, "sacoDeSal"], [92, "sapatosDeCamurca"], [94, "seixoDeAmbar"], [95, "sela"], [96, "tabardo"], [97, "trajeDaCorte"], [99, "terraDeCemiterio"], [100, "vesteDeSeda"]];
  /* Tabela 8-4: equipamento (p. 331). */
  IM.EQUIPAMENTO_ARMAS = [[3, "adaga"], [5, "alabarda"], [7, "alfange"], [10, "arcoCurto"], [13, "arcoLongo"], [15, "azagaia"], [16, "balas"], [18, "bestaLeve"], [20, "bestaPesada"], [23, "bordao"], [24, "chicote"], [27, "cimitarra"], [30, "clava"], [31, "correnteDeEspinhos"], [33, "espadaBastarda"], [38, "espadaCurta"], [43, "espadaLonga"], [46, "flechas"], [49, "florete"], [51, "foice"], [53, "funda"], [55, "gadanho"], [56, "katana"], [59, "lanca"], [60, "lancaMontada"], [63, "maca"], [66, "machadinha"], [67, "machadoAnao"], [70, "machadoDeBatalha"], [73, "machadoDeGuerra"], [74, "machadoTaurico"], [76, "mangual"], [77, "marreta"], [80, "marteloDeGuerra"], [83, "montante"], [84, "mosquete"], [85, "pedras"], [88, "picareta"], [90, "pique"], [92, "pistola"], [93, "rede"], [96, "tacape"], [98, "tridente"], [100, "virotes"]];
  IM.EQUIPAMENTO_ARMADURAS = [[5, "couro"], [10, "brunea"], [25, "armaduraCompleta"], [30, "cotaDeMalha"], [45, "couraca"], [55, "couroBatido"], [65, "escudoLeve"], [80, "escudoPesado"], [85, "gibaoDePeles"], [90, "lorigaSegmentada"], [100, "meiaArmadura"]];
  IM.EQUIPAMENTO_ESOTERICOS = [[10, "bolsaDePo"], [25, "cajadoArcano"], [35, "cetroElemental"], [42, "costelaDeLich"], [50, "dedoDeEnte"], [55, "luvaDeFerro"], [65, "medalhaoDePrata"], [75, "orbeCristalino"], [85, "tomoHermetico"], [100, "varinhaArcana"]];
  /* Tabela 8-5: itens superiores (p. 332). ¹ conta como duas melhorias. */
  IM.SUPERIOR_ARMAS = [[10, "atroz", 2], [13, "banhadoAOuro"], [23, "certeira"], [26, "cravejadoDeGemas"], [36, "cruel"], [39, "discreto"], [44, "equilibrada"], [48, "harmonizadaArma"], [53, "injecaoAlquimica"], [55, "macabro"], [65, "macica"], [75, "material"], [80, "miraTelescopica"], [90, "precisa"], [100, "pungente", 2]];
  IM.SUPERIOR_ARMADURAS = [[15, "ajustada"], [19, "banhadoAOuro"], [23, "cravejadoDeGemas"], [28, "delicada"], [32, "discreto"], [37, "espinhosaArmadura"], [40, "macabro"], [50, "material"], [55, "polida"], [80, "reforcada"], [90, "selada"], [100, "sobMedida", 2]];
  /* O livro imprime "Canalizador" em 05–19 e de novo em 70–85; o RAMA
     segue o livro e registra a dúvida em docs/TORMENTA20.md (Lacunas). */
  IM.SUPERIOR_ESOTERICOS = [[4, "banhadoAOuro"], [19, "canalizador"], [23, "cravejadoDeGemas"], [27, "discreto"], [42, "energetico"], [57, "harmonizadoEsoterico"], [60, "macabro"], [69, "material"], [85, "canalizador"], [100, "vigilante"]];
  IM.MATERIAIS_D6 = ["acoRubi", "adamante", "geloEterno", "madeiraTollon", "materiaVermelha", "mitral"];
  /* Tabela 8-6: tesouro médio por cena (p. 332). */
  IM.TESOURO_MEDIO = [0, 300, 300, 400, 1000, 1000, 2000, 2000, 3000, 3000, 6000, 8000, 9000, 13000, 17000, 22000, 22000, 40000, 50000, 60000, 72000];

  /* --------------------------------------- regras de itens (p. 333–334) */
  IM.CATEGORIAS = { menor: { encantos: 1, pmSacrificio: 1, pv: 10, rd: 10, resistencia: 5, cdEspecifico: 30 }, medio: { encantos: 2, pmSacrificio: 2, pv: 20, rd: 20, resistencia: 10, cdEspecifico: 40 }, maior: { encantos: 3, pmSacrificio: 3, pv: 40, rd: 40, resistencia: 20, cdEspecifico: 50 } };
  IM.PRECO_ENCANTOS = { 1: 18000, 2: 36000, 3: 72000 };
  IM.CD_ENCANTOS = { 1: 10, 2: 15, 3: 20 };
  /* Poção ou pergaminho: T$ 30 × PM² (mínimo 1), CD 20 + PM; poções
     aceitam aprimoramentos ao fabricar, pergaminhos ao ativar. */
  IM.usoUnico = function (pm) { var c = Math.max(1, Math.floor(Number(pm) || 1)); return { preco: 30 * c * c, cd: 20 + c, materiaPrima: Math.ceil(30 * c * c / 3) }; };
  IM.categoriaPorEncantos = function (n) { return n >= 3 ? "maior" : (n === 2 ? "medio" : "menor"); };

  /* ------------------------------------- encantos de armas (p. 335–336) */
  function enc(id, nome, ate, r, extra) { return Object.assign({ id: id, nome: nome, ate: ate, r: r, valor: 1 }, extra || {}); }
  IM.ENCANTOS_ARMA = [
    enc("ameacadora", "Ameaçadora", 5, "Margem de ameaça duplica (antes de outros aumentos).", { arma: { margemDuplica: true } }),
    enc("anticriatura", "Anticriatura", 10, "Contra um tipo de criatura (ou raça), uma vez por rodada, 2 PM: acertando, +4d8 de dano.", { escolha: "tipoCriatura", acao: { custo: 2, danoExtra: "4d8" } }),
    enc("arremesso", "Arremesso", 12, "Arremessável em alcance curto (ou +1 categoria) e volta voando; pegar é reação.", { arma: { arremesso: true } }),
    enc("assassina", "Assassina", 14, "Dados de Ataque Furtivo viram d8; 2 PM para rolar de novo os 1."),
    enc("cacadora", "Caçadora", 16, "Anula penalidades de camuflagem leve e total e de cobertura leve; à distância, +1 categoria de alcance."),
    enc("congelante", "Congelante", 21, "+1d6 de frio; uma vez por rodada, 2 PM: acertando, enredado por 1 rodada.", { arma: { extras: [{ dados: "1d6", tipo: "frio" }] } }),
    enc("conjuradora", "Conjuradora", 23, "Guarda uma magia de alvo ou área; ao acertar, descarrega como ação livre sem custo."),
    enc("corrosiva", "Corrosiva", 28, "+1d6 de ácido; uma vez por rodada, 2 PM: acertando, mais 4d4 de ácido na rodada seguinte.", { arma: { extras: [{ dados: "1d6", tipo: "acido" }] } }),
    enc("dancarina", "Dançarina", 30, "Ação de movimento e 1 PM (sustentada): a arma ataca sozinha uma criatura em alcance curto."),
    enc("defensora", "Defensora", 34, "+2 na Defesa.", { efeitos: [{ t: "bonus", alvo: "defesa", valor: 2, categoria: "item" }] }),
    enc("destruidora", "Destruidora", 36, "Contra construtos e objetos (quebrar): +2 no ataque e +2d8 de dano."),
    enc("dilacerante", "Dilacerante", 38, "Acerto crítico causa +10 de dano.", { arma: { critico: 10 } }),
    enc("drenante", "Drenante", 40, "Crítico em criatura viva: ela fica fraca e você ganha 2d10 PV temporários."),
    enc("eletrica", "Elétrica", 45, "+1d6 de eletricidade; uma vez por rodada, 2 PM: acertando, raio de 3d8 em outra criatura em alcance curto.", { arma: { extras: [{ dados: "1d6", tipo: "eletricidade" }] } }),
    enc("energetica", "Energética", 46, "+4 no ataque, ignora 20 de RD, dano vira essência e emite luz. Pré-requisito: formidável. Conta como dois encantos.", { valor: 2, requer: "formidavel", arma: { ataque: 4, ignoraRD: 20, tipo: "essencia" } }),
    enc("excruciante", "Excruciante", 48, "Criatura viva atingida fica fraca; já fraca, debilitada (máximo)."),
    enc("flamejante", "Flamejante", 53, "+1d6 de fogo; uma vez por rodada, 2 PM: em vez do ataque, bola de fogo de 6d6 num alvo em alcance médio (Reflexos CD For ou Des reduz à metade).", { arma: { extras: [{ dados: "1d6", tipo: "fogo" }] } }),
    enc("formidavel", "Formidável", 63, "+2 em ataque e dano.", { arma: { ataque: 2, dano: 2 } }),
    enc("lancinante", "Lancinante", 64, "Crítico: +10 de dano ou multiplica também os bônus numéricos (à escolha). Substitui dilacerante (pré-requisito). Conta como dois encantos.", { valor: 2, requer: "dilacerante", arma: { critico: 10, lancinante: true } }),
    enc("magnifica", "Magnífica", 72, "+4 em ataque e dano (substitui formidável, pré-requisito). Conta como dois encantos.", { valor: 2, requer: "formidavel", arma: { ataque: 4, dano: 4, substitui: "formidavel" } }),
    enc("piedosa", "Piedosa", 74, "+1d8 de dano, todo não letal (1 PM para ligar ou desligar).", { arma: { extras: [{ dados: "1d8", tipo: "" }], naoLetal: true } }),
    enc("profana", "Profana", 76, "+2d8 contra devotos de deuses só de energia positiva e criaturas bondosas (mestre decide)."),
    enc("sagrada", "Sagrada", 78, "+2d8 contra devotos de deuses só de energia negativa e criaturas malignas (mestre decide)."),
    enc("sanguinaria", "Sanguinária", 80, "Criatura viva atingida fica sangrando; o sangramento da arma acumula."),
    enc("trovejante", "Trovejante", 82, "Crítico: atordoado 1 rodada (uma vez por cena; Fort CD For ou Des evita)."),
    enc("tumular", "Tumular", 84, "+1d8 de trevas; uma vez por rodada, 2 PM: vira +2d8, mas você perde 1d8 PV.", { arma: { extras: [{ dados: "1d8", tipo: "trevas" }] } }),
    enc("veloz", "Veloz", 88, "Ataque Extra (do guerreiro) só com esta arma; se já tem, custa –1 PM com ela."),
    enc("venenosa", "Venenosa", 90, "Uma vez por rodada, 2 PM: acertando, envenenado (perde 1d12 PV por rodada por 3 rodadas)."),
  ];
  /* --------------------------- encantos de armaduras e escudos (p. 338–339) */
  IM.ENCANTOS_ARMADURA = [
    enc("abascanto", "Abascanto", 6, "Resistência a magia +5.", { efeitos: [{ t: "bonus", alvo: "resistencias", valor: 5, categoria: "item", cond: "contraMagia" }] }),
    enc("abencoado", "Abençoado", 10, "Redução de trevas 10 e +5 nas resistências contra necromancia.", { efeitos: [{ t: "rd", valor: 10, tipos: ["trevas"], fonteRd: "item" }] }),
    enc("acrobatico", "Acrobático", 12, "+5 em Acrobacia e ignora a penalidade desta armadura nela.", { efeitos: [{ t: "bonus", alvo: "pericia.acrobacia", valor: 5, categoria: "item" }], ignoraPenalidade: ["acrobacia"] }),
    enc("alado", "Alado", 14, "2 PM (sustentada): asas e voo 12 m."),
    enc("animado", "Animado", 16, "Só escudos. Ação de movimento e 1 PM: o escudo flutua e protege até o fim da cena, com as mãos livres.", { escudo: true }),
    enc("assustador", "Assustador", 18, "Ação de movimento e 2 PM: inimigos em alcance curto fazem Vontade (CD Car) ou ficam abalados pela cena."),
    enc("caustica", "Cáustica", 22, "Redução de ácido 10; ação de movimento e 2 PM: seus ataques causam +1d4 de ácido pela cena.", { efeitos: [{ t: "rd", valor: 10, tipos: ["acido"], fonteRd: "item" }] }),
    enc("defensor", "Defensor", 32, "+2 no bônus de Defesa do item.", { defesa: 2 }),
    enc("escorregadio", "Escorregadio", 34, "+10 em Acrobacia para escapar e em manobras contra agarrar."),
    enc("esmagador", "Esmagador", 36, "Só escudos. +2 em ataque e dano com o escudo e dano +1 passo.", { escudo: true }),
    enc("fantasmagorico", "Fantasmagórico", 38, "Pode lançar Manto de Sombras.", { efeitos: [{ t: "magia", id: "mantoDeSombras", atributo: "car" }] }),
    enc("fortificado", "Fortificado", 40, "25% (escudo) ou 50% (armadura) de chance de ignorar o dano extra de críticos e ataques furtivos."),
    enc("gelido", "Gélido", 44, "Redução de frio 10; ação de movimento e 2 PM: 10 PV temporários.", { efeitos: [{ t: "rd", valor: 10, tipos: ["frio"], fonteRd: "item" }] }),
    enc("guardiao", "Guardião", 54, "+4 no bônus de Defesa do item (substitui defensor, pré-requisito). Conta como dois encantos.", { valor: 2, requer: "defensor", defesa: 4, substitui: "defensor" }),
    enc("hipnotico", "Hipnótico", 56, "Ação padrão e 3 PM: inimigos em alcance curto fazem Vontade (CD Car) ou ficam fascinados 1d6 rodadas."),
    enc("ilusorio", "Ilusório", 58, "Ação de movimento e 1 PM: parece roupa comum (Visão da Verdade revela)."),
    enc("incandescente", "Incandescente", 62, "Redução de fogo 10; ação de movimento e 2 PM: 1d6 de fogo nos adjacentes no início dos seus turnos, pela cena.", { efeitos: [{ t: "rd", valor: 10, tipos: ["fogo"], fonteRd: "item" }] }),
    enc("invulneravel", "Invulnerável", 68, "Redução de dano 2 (escudo) ou 5 (armadura).", { rdPorTipo: { escudo: 2, armadura: 5 } }),
    enc("opaco", "Opaco", 72, "Redução de ácido, eletricidade, fogo e frio 10.", { efeitos: [{ t: "rd", valor: 10, tipos: ["acido", "eletricidade", "fogo", "frio"], fonteRd: "item" }] }),
    enc("protetor", "Protetor", 78, "+2 nos testes de resistência.", { efeitos: [{ t: "bonus", alvo: "resistencias", valor: 2, categoria: "item" }] }),
    enc("refletor", "Refletor", 80, "Uma vez por rodada, alvo de magia: gasta PM igual ao custo dela para refleti-la ao conjurador."),
    enc("relampejante", "Relampejante", 84, "Redução de eletricidade 10; ação de movimento e 2 PM: quem o ataca corpo a corpo sofre 2d6 de eletricidade, pela cena.", { efeitos: [{ t: "rd", valor: 10, tipos: ["eletricidade"], fonteRd: "item" }] }),
    enc("reluzente", "Reluzente", 86, "Ação de movimento e 2 PM: inimigos em alcance curto fazem Reflexos (CD Car) ou ficam cegos 1 rodada."),
    enc("sombrio", "Sombrio", 88, "+5 em Furtividade e ignora a penalidade desta armadura nela.", { efeitos: [{ t: "bonus", alvo: "pericia.furtividade", valor: 5, categoria: "item" }], ignoraPenalidade: ["furtividade"] }),
    enc("zeloso", "Zeloso", 90, "Uma vez por rodada, 1 PM: torna-se o alvo de um ataque contra aliado adjacente."),
  ];
  IM.ENCANTO = {};
  IM.ENCANTOS_ARMA.concat(IM.ENCANTOS_ARMADURA).forEach(function (e) { IM.ENCANTO[e.id] = e; });

  /* ------------------------------------------- itens específicos (p. 336–340) */
  IM.ITEM = {};
  IM.ITENS = [];
  function esp(id, nome, base, preco, categoria, pagina, r, extra) {
    var it = Object.assign({ id: id, nome: nome, base: base, preco: preco, categoriaMagica: categoria, pagina: pagina, resumo: r, especifico: true, fonte: { livro: "Tormenta20 — Jogo do Ano", pagina: pagina } }, extra || {});
    IM.ITENS.push(it); IM.ITEM[id] = it; return it;
  }
  IM.esp = esp;
  /* Armas específicas (todas maiores). */
  esp("arcoDoPoder", "Arco do Poder", "arcoLongo", 90000, "maior", 336, "Arco longo formidável sem corda que cria flechas de energia: normal (3d8 de essência), piedosa (4d8 não letal), explosiva (3d6 de fogo no alvo e adjacentes, Reflexos CD Des metade) ou rede (agarrado; Força ou Acrobacia CD 25).", { encantos: ["formidavel"], ata: 61 });
  esp("avalanche", "Avalanche", "machadoDeGuerra", 140000, "maior", 337, "Machado de guerra de gelo eterno congelante formidável; redução de fogo 10. Ação padrão e 6 PM: tempestade de gelo em alcance curto (camuflagem leve, 3d6 de impacto e 3d6 de frio por rodada; você imune; 1 PM por turno para manter).", { encantos: ["congelante", "formidavel"], material: "geloEterno", efeitos: [{ t: "rd", valor: 10, tipos: ["fogo"], fonteRd: "item" }], ata: 92 });
  esp("azagaiaDosRelampagos", "Azagaia dos Relâmpagos", "azagaia", 30000, "maior", 337, "Arremessada, vira um Relâmpago (8d6 de eletricidade numa linha em alcance médio; CD For ou Des) e volta no fim do turno.", { ata: 5 });
  esp("bestaExplosiva", "Besta Explosiva", "bestaPesada", 100000, "maior", 337, "Besta pesada formidável. 3 PM: o virote vira Bola de Fogo — contra uma criatura (ataque; acertando, dano do disparo mais 6d6 de fogo, e 6d6 a até 6 m, Reflexos metade) ou num ponto em alcance médio.", { encantos: ["formidavel"], ata: 77 });
  esp("cajadoDaDestruicao", "Cajado da Destruição", "bordao", 60000, "maior", 337, "Bordão formidável que conta como cajado arcano; magias de dano causam +1 por dado.", { encantos: ["formidavel"], esotericoComo: "cajadoArcano", efeitos: [{ t: "danoPorDadoMagia", valor: 1 }], ata: 45 });
  esp("cajadoDaVida", "Cajado da Vida", "bordao", 60000, "maior", 337, "Bordão formidável que conta como cajado arcano para magias divinas; magias de cura curam +2 por dado.", { encantos: ["formidavel"], esotericoComo: "cajadoArcano", efeitos: [{ t: "curaPorDadoMagia", valor: 2 }], ata: 50 });
  esp("cajadoDoPoder", "Cajado do Poder", "bordao", 180000, "maior", 337, "Bordão defensor magnífico que conta como cajado arcano; magias arcanas custam –1 PM (acumula com Mestre em Escola) e CD +2 (total +3).", { encantos: ["defensora", "magnifica"], esotericoComo: "cajadoArcano", efeitos: [{ t: "descontoMagia", valor: 1, tipoMagia: "arcana", cumulativo: true }, { t: "cdMagia", valor: 2 }], ata: 95 });
  esp("espadaBaronial", "Espada Baronial", "espadaLonga", 30000, "maior", 337, "+1 em ataque e dano, +1 por cada: código de conduta, devoto de Khalmyr, treinado em Nobreza (até +4).", { arma: { ataqueExpr: "1 + (tem.codigo ? 1 : 0) + (deus.khalmyr ? 1 : 0) + (treino.nobreza ? 1 : 0)" }, ata: 15 });
  esp("espadaSortuda", "Espada Sortuda", "espadaCurta", 110000, "maior", 337, "Espada curta formidável; +2 nas resistências e 3 PM para rolar de novo um teste recém-feito (uma vez por teste; com Sortudo, –1 PM).", { encantos: ["formidavel"], efeitos: [{ t: "bonus", alvo: "resistencias", valor: 2, categoria: "item" }], ata: 87 });
  esp("floreteFugaz", "Florete Fugaz", "florete", 50000, "maior", 337, "Florete formidável. Ao agredir, 1 PM: se acertar um crítico no turno, ataque extra contra a mesma criatura.", { encantos: ["formidavel"], ata: 40 });
  esp("laminaDaLuz", "Lâmina da Luz", "espadaBastarda", 45000, "maior", 338, "Espada bastarda formidável. Ação de movimento e 2 PM: luz brilhante em alcance médio pela cena; inimigos nela ficam ofuscados.", { encantos: ["formidavel"], ata: 25 });
  esp("lancaAnimalesca", "Lança Animalesca", "lanca", 45000, "maior", 338, "Lança formidável; em Forma Selvagem, o +2 em ataque e dano vale para as armas naturais.", { encantos: ["formidavel"], ata: 30 });
  esp("linguaDoDeserto", "Língua do Deserto", "cimitarra", 90000, "maior", 338, "Cimitarra formidável. Ação de movimento e 1 PM: lâmina em chamas pela cena (dano +1 passo, tipo fogo). Ação de movimento e 2 PM: brilho que deixa inimigos em alcance curto desprevenidos 1 rodada.", { encantos: ["formidavel"], ata: 72 });
  esp("macaDoTerror", "Maça do Terror", "maca", 45000, "maior", 338, "Maça formidável que lança Amedrontar (CD For ou Car); se já conhece, custa –1 PM.", { encantos: ["formidavel"], efeitos: [{ t: "magia", id: "amedrontar", atributo: "car" }], ata: 35 });
  esp("machadoSilvestre", "Machado Silvestre", "machadoDeBatalha", 70000, "maior", 338, "Machado de batalha formidável. Em ambiente ermo ao ar livre: +1d8 de dano e o poder Trespassar (sem custo, se já tiver).", { encantos: ["formidavel"], ata: 55 });
  esp("marteloDeDoherimm", "Martelo de Doherimm", "marteloDeGuerra", 70000, "maior", 338, "Martelo de guerra formidável; nas mãos de um anão ganha arremesso e +1d8 de dano (+2d8 contra Grandes ou maiores).", { encantos: ["formidavel"], ata: 60 });
  esp("punhalSszzaazita", "Punhal Sszzaazita", "adaga", 100000, "maior", 338, "Adaga assassina formidável venenosa. Ação padrão e 2 PM: vira um objeto inofensivo indetectável; voltar é ação livre.", { encantos: ["assassina", "formidavel", "venenosa"], ata: 82 });
  esp("vingadoraSagrada", "Vingadora Sagrada", "espadaLonga", 200000, "maior", 338, "Espada longa formidável. Para um paladino: +5 em ataque e dano, Golpe Divino –1 PM e resistência a magia +5 para você e aliados em alcance curto.", { encantos: ["formidavel"], ata: 100 });
  /* Armaduras e escudos específicos (todos maiores). */
  esp("armaduraDaLuz", "Armadura da Luz", "armaduraCompleta", 150000, "maior", 340, "Armadura completa banhada a ouro reforçada guardiã zelosa com o símbolo de Khalmyr. Com código de conduta ou devoto de deus só de energia positiva: RD igual ao Carisma.", { melhorias: ["banhadoAOuro", "reforcada"], encantos: ["guardiao", "zeloso"], ata: 100 });
  esp("baluarteAnao", "Baluarte Anão", "armaduraCompleta", 50000, "maior", 340, "Armadura completa reforçada defensora de adamante; sem se deslocar no turno, a RD dela vira 10 até o próximo turno.", { melhorias: ["reforcada"], encantos: ["defensor"], material: "adamante", ata: 59 });
  esp("carapacaDemoniaca", "Carapaça Demoníaca", "armaduraCompleta", 63000, "maior", 340, "Armadura completa macabra reforçada guardiã; devoto de deus só de energia negativa: ataques corpo a corpo +1d8 de trevas.", { melhorias: ["macabro", "reforcada"], encantos: ["guardiao"], ata: 83 });
  esp("cotaElfica", "Cota Élfica", "cotaDeMalha", 30000, "maior", 340, "Cota de malha defensora de mitral; aplica a Destreza na Defesa como armadura leve.", { encantos: ["defensor"], material: "mitral", comoLeve: true, ata: 10 });
  esp("couracaDoComando", "Couraça do Comando", "couraca", 45000, "maior", 340, "Couraça banhada a ouro sob medida defensora; +1 em Carisma e Comandar dá +2.", { melhorias: ["banhadoAOuro", "sobMedida"], encantos: ["defensor"], efeitos: [{ t: "bonus", alvo: "atr.car", valor: 1, categoria: "item" }], ata: 49 });
  esp("couroDeMonstro", "Couro de Monstro", "gibaoDePeles", 36000, "maior", 340, "Gibão de peles defensor; com Ataque Poderoso ou investida, +2d6 no dano.", { encantos: ["defensor"], ata: 20 });
  esp("lorigaDoCenturiao", "Loriga do Centurião", "lorigaSegmentada", 45000, "maior", 340, "Loriga segmentada defensora com o símbolo de Tauron; liderando (Comandar ou similar), ataques corpo a corpo +2d6 de fogo.", { encantos: ["defensor"], ata: 32 });
  esp("mantoDaNoite", "Manto da Noite", "couroBatido", 45000, "maior", 340, "Couro batido ajustado defensor sombrio; sem penalidade em Furtividade por mover-se no deslocamento normal e –10 (em vez de –20) por atacar.", { melhorias: ["ajustada"], encantos: ["defensor", "sombrio"], ata: 42 });
  esp("escudoDeAzgher", "Escudo de Azgher", "escudoPesado", 140000, "maior", 340, "Escudo pesado guardião. Ação padrão e 10 PM: cone de luz em alcance curto com Visão da Verdade e 6d6 de fogo nos inimigos (6d8 em mortos-vivos e sensíveis ao sol); 1 PM por turno mantém.", { encantos: ["guardiao"], ata: 93 });
  esp("escudoDoConjurador", "Escudo do Conjurador", "escudoLeve", 45000, "maior", 340, "Escudo leve defensor com tira de couro que guarda uma magia, lida depois como pergaminho.", { encantos: ["defensor"], ata: 25 });
  esp("escudoDoEclipse", "Escudo do Eclipse", "escudoPesado", 70000, "maior", 340, "Escudo pesado defensor; redução de trevas 10, +1d8 de trevas num ataque com ele e Escuridão por ação de movimento e 2 PM.", { encantos: ["defensor"], efeitos: [{ t: "rd", valor: 10, tipos: ["trevas"], fonteRd: "item" }], ata: 88 });
  esp("escudoEspinhoso", "Escudo Espinhoso", "escudoPesado", 50000, "maior", 340, "Escudo pesado defensor. Ação de movimento e 2 PM: espinho que acerta automaticamente um alvo em alcance curto (1d10+2 de perfuração).", { encantos: ["defensor"], ata: 66 });
  esp("escudoDoLeao", "Escudo do Leão", "escudoPesado", 50000, "maior", 340, "Escudo pesado defensor. Uma vez por rodada, 2 PM: a cabeça de leão morde um adjacente, acerto automático (2d6+2 de perfuração).", { encantos: ["defensor"], ata: 76 });
  IM.ARMAS_ESPECIFICAS = ["azagaiaDosRelampagos", "espadaBaronial", "laminaDaLuz", "lancaAnimalesca", "macaDoTerror", "floreteFugaz", "cajadoDaDestruicao", "cajadoDaVida", "machadoSilvestre", "marteloDeDoherimm", "arcoDoPoder", "linguaDoDeserto", "bestaExplosiva", "punhalSszzaazita", "espadaSortuda", "avalanche", "cajadoDoPoder", "vingadoraSagrada"];
  IM.ARMADURAS_ESPECIFICAS = ["cotaElfica", "couroDeMonstro", "escudoDoConjurador", "lorigaDoCenturiao", "mantoDaNoite", "couracaDoComando", "baluarteAnao", "escudoEspinhoso", "escudoDoLeao", "carapacaDemoniaca", "escudoDoEclipse", "escudoDeAzgher", "armaduraDaLuz"];
})(typeof window !== "undefined" ? window : globalThis);
