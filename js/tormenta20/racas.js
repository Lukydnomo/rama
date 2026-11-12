/* =====================================================================
   R.A.M.A. — Tormenta20 · raças (p. 18–31)
   ---------------------------------------------------------------------
   Cada raça: modificadores de atributo (fixos ou à escolha), escolhas
   internas e habilidades com efeitos estruturados (ver docs/TORMENTA20.md,
   "Efeitos"). `acao` é uma habilidade ativada: custo em PM, execução,
   duração e o que ela faz; a ficha cobra os PM e cria o efeito ativo.
   Resumos do R.A.M.A.; o texto é o do livro, na página indicada.
   ===================================================================== */

(function (global) {
  "use strict";

  function hab(id, nome, resumo, extra) { return Object.assign({ id: id, nome: nome, resumo: resumo, efeitos: [] }, extra || {}); }

  var RACAS = [
    { id: "humano", nome: "Humano", pagina: 19, comum: true,
      atributos: { escolha: { quantidade: 3, valor: 1 } },
      habilidades: [
        hab("versatil", "Versátil", "Treinado em duas perícias à escolha (qualquer classe). Pode trocar uma delas por um poder geral.",
          { escolhas: [{ id: "versatil", tipo: "pericia", quantidade: 2, efeito: { t: "treino" }, troca: { tipo: "poderGeral", quantidade: 1 } }] }),
      ] },
    { id: "anao", nome: "Anão", pagina: 20, comum: true,
      atributos: { fixo: { con: 2, sab: 1, des: -1 } },
      habilidades: [
        hab("conhecimentoDasRochas", "Conhecimento das Rochas", "Visão no escuro; +2 em Percepção e Sobrevivência no subterrâneo.",
          { efeitos: [{ t: "sentido", valor: "visaoNoEscuro" }, { t: "bonus", alvo: "pericia.percepcao", valor: 2, cond: "no subterrâneo" }, { t: "bonus", alvo: "pericia.sobrevivencia", valor: 2, cond: "no subterrâneo" }] }),
        hab("devagarESempre", "Devagar e Sempre", "Deslocamento 6m, nunca reduzido por armadura ou carga.",
          { efeitos: [{ t: "deslocamento", tipo: "terrestre", base: 6 }, { t: "ignoraReducaoDeslocamento" }] }),
        hab("duroComoPedra", "Duro como Pedra", "+3 PV no 1º nível e +1 PV por nível seguinte.",
          { efeitos: [{ t: "pvNivel", inicial: 3, valor: 1 }] }),
        hab("tradicaoDeHeredrimm", "Tradição de Heredrimm", "Machados, martelos, marretas e picaretas são armas simples; +2 em ataques com elas.",
          { efeitos: [{ t: "armaSimples", grupos: ["machado", "martelo", "marreta", "picareta"] }, { t: "bonus", alvo: "ataque", valor: 2, armas: ["machado", "martelo", "marreta", "picareta"] }] }),
      ] },
    { id: "dahllan", nome: "Dahllan", pagina: 21, comum: true,
      atributos: { fixo: { sab: 2, des: 1, "int": -1 } },
      habilidades: [
        hab("amigaDasPlantas", "Amiga das Plantas", "Pode lançar Controlar Plantas (Sabedoria). Se aprender de novo, custa –1 PM.",
          { efeitos: [{ t: "magia", id: "controlarPlantas", atributo: "sab", desconto: 1 }] }),
        hab("armaduraDeAllihanna", "Armadura de Allihanna", "Ação de movimento e 1 PM: +2 na Defesa até o fim da cena.",
          { acao: { custo: 1, execucao: "movimento", duracao: "cena", efeitos: [{ t: "bonus", alvo: "defesa", valor: 2 }] } }),
        hab("empatiaSelvagem", "Empatia Selvagem", "Comunica-se com animais e usa Adestramento para mudar atitude e persuasão com eles. Recebida de novo: +2 em Adestramento.",
          { efeitos: [{ t: "empatiaSelvagem" }] }),
      ] },
    { id: "elfo", nome: "Elfo", pagina: 22, comum: true,
      atributos: { fixo: { "int": 2, des: 1, con: -1 } },
      habilidades: [
        hab("gracaDeGlorienn", "Graça de Glórienn", "Deslocamento 12m.", { efeitos: [{ t: "deslocamento", tipo: "terrestre", base: 12 }] }),
        hab("sangueMagico", "Sangue Mágico", "+1 PM por nível.", { efeitos: [{ t: "pmNivel", valor: 1 }] }),
        hab("sentidosElficos", "Sentidos Élficos", "Visão na penumbra; +2 em Misticismo e Percepção.",
          { efeitos: [{ t: "sentido", valor: "visaoNaPenumbra" }, { t: "bonus", alvo: "pericia.misticismo", valor: 2 }, { t: "bonus", alvo: "pericia.percepcao", valor: 2 }] }),
      ] },
    { id: "goblin", nome: "Goblin", pagina: 23, comum: true,
      atributos: { fixo: { des: 2, "int": 1, car: -1 } },
      habilidades: [
        hab("engenhoso", "Engenhoso", "Sem penalidade por não usar ferramentas; com a ferramenta, +2 no teste.", { efeitos: [{ t: "semPenalidadeFerramenta", bonusComFerramenta: 2 }] }),
        hab("espelunqueiro", "Espelunqueiro", "Visão no escuro e deslocamento de escalada igual ao terrestre.",
          { efeitos: [{ t: "sentido", valor: "visaoNoEscuro" }, { t: "deslocamento", tipo: "escalada", igualTerrestre: true }] }),
        hab("pesteEsguia", "Peste Esguia", "Tamanho Pequeno, deslocamento 9m.", { efeitos: [{ t: "tamanho", valor: "pequeno" }] }),
        hab("ratoDasRuas", "Rato das Ruas", "+2 em Fortitude; recuperação de PV e PM nunca menor que o nível.",
          { efeitos: [{ t: "bonus", alvo: "pericia.fortitude", valor: 2 }, { t: "recuperacaoMinima", valor: "nivel" }] }),
      ] },
    { id: "lefou", nome: "Lefou", pagina: 24, comum: true,
      atributos: { escolha: { quantidade: 3, valor: 1, exceto: ["car"] }, fixo: { car: -1 } },
      habilidades: [
        hab("criaDaTormenta", "Cria da Tormenta", "Criatura do tipo monstro; +5 em resistência contra lefeu e a Tormenta.",
          { efeitos: [{ t: "tipo", valor: "monstro" }, { t: "bonus", alvo: "resistencias", valor: 5, cond: "contra lefeu e a Tormenta" }] }),
        hab("deformidade", "Deformidade", "+2 em duas perícias à escolha; cada bônus conta como poder da Tormenta (não para perda de Carisma). Pode trocar um deles por um poder da Tormenta.",
          { escolhas: [{ id: "deformidade", tipo: "pericia", quantidade: 2, efeito: { t: "bonus", valor: 2 }, contaComo: "poderTormenta", troca: { tipo: "poderTormenta", quantidade: 1, semPerdaCarisma: true } }] }),
      ] },
    { id: "minotauro", nome: "Minotauro", pagina: 25, comum: true,
      atributos: { fixo: { "for": 2, con: 1, sab: -1 } },
      habilidades: [
        hab("chifres", "Chifres", "Arma natural (1d6, x2, perfuração). Uma vez por rodada, ao agredir com outra arma, 1 PM para um ataque extra com os chifres.",
          { efeitos: [{ t: "armaNatural", id: "chifres", nome: "Chifres", dano: "1d6", margem: 20, mult: 2, tipo: "perfuracao", extra: { custo: 1, quando: "uma vez por rodada, ao agredir com outra arma" } }] }),
        hab("couroRigido", "Couro Rígido", "+1 na Defesa.", { efeitos: [{ t: "bonus", alvo: "defesa", valor: 1 }] }),
        hab("faro", "Faro", "Contra inimigos em alcance curto que não possa ver, não fica desprevenido; camuflagem total só dá 20% de falha.", { efeitos: [{ t: "sentido", valor: "faro" }] }),
        hab("medoDeAltura", "Medo de Altura", "Adjacente a uma queda de 3m ou mais, fica abalado.", { efeitos: [{ t: "condicaoSituacional", condicao: "abalado", cond: "adjacente a queda de 3m ou mais" }] }),
      ] },
    { id: "qareen", nome: "Qareen", pagina: 26, comum: true,
      atributos: { fixo: { car: 2, "int": 1, sab: -1 } },
      habilidades: [
        hab("desejos", "Desejos", "Magia pedida por alguém desde seu último turno custa –1 PM. Pedir é ação livre.", { efeitos: [{ t: "descontoMagia", valor: 1, cond: "magia pedida desde seu último turno" }] }),
        hab("resistenciaElemental", "Resistência Elemental", "Redução 10 a um tipo de dano conforme a ascendência.",
          { escolhas: [{ id: "elemento", tipo: "opcao", opcoes: [["frio", "Água (frio)"], ["eletricidade", "Ar (eletricidade)"], ["fogo", "Fogo (fogo)"], ["acido", "Terra (ácido)"], ["luz", "Luz (luz)"], ["trevas", "Trevas (trevas)"]], efeito: { t: "rd", valor: 10 } }] }),
        hab("tatuagemMistica", "Tatuagem Mística", "Pode lançar uma magia de 1º círculo à escolha (Carisma). Se aprender de novo, custa –1 PM.",
          { escolhas: [{ id: "magia", tipo: "magia", circulo: 1, quantidade: 1, efeito: { t: "magia", atributo: "car", desconto: 1 } }] }),
      ] },
    { id: "golem", nome: "Golem", pagina: 27,
      atributos: { fixo: { "for": 2, con: 1, car: -1 } }, semOrigem: true,
      habilidades: [
        hab("chassi", "Chassi", "Deslocamento 6m, não reduzido por armadura ou carga. +2 na Defesa, penalidade de armadura –2. Vestir armadura leva um dia; ela não conta no limite de itens.",
          { efeitos: [{ t: "deslocamento", tipo: "terrestre", base: 6 }, { t: "ignoraReducaoDeslocamento" }, { t: "bonus", alvo: "defesa", valor: 2 }, { t: "bonus", alvo: "penalidadeArmadura", valor: -2 }, { t: "armaduraAcoplada" }] }),
        hab("criaturaArtificial", "Criatura Artificial", "Construto: visão no escuro; imune a cansaço, metabólicos e veneno; não respira, come nem dorme; sem cura mundana nem alimentação; fica inerte 8 horas para recuperar PV e PM; Ofício (artesão) substitui Cura nele.",
          { efeitos: [{ t: "tipo", valor: "construto" }, { t: "sentido", valor: "visaoNoEscuro" }, { t: "imune", valor: "cansaco" }, { t: "imune", valor: "metabolico" }, { t: "imune", valor: "veneno" }, { t: "descansoFixo" }] }),
        hab("fonteElemental", "Fonte Elemental", "Imune a um tipo de dano; dano mágico desse tipo cura metade em vez de ferir.",
          { escolhas: [{ id: "elemento", tipo: "opcao", opcoes: [["frio", "Água (frio)"], ["eletricidade", "Ar (eletricidade)"], ["fogo", "Fogo (fogo)"], ["acido", "Terra (ácido)"]], efeito: { t: "imune", absorveMagico: 0.5 } }] }),
        hab("propositoDeCriacao", "Propósito de Criação", "Sem origem; recebe um poder geral à escolha.",
          { escolhas: [{ id: "poder", tipo: "poderGeral", quantidade: 1 }] }),
      ] },
    { id: "hynne", nome: "Hynne", pagina: 27,
      atributos: { fixo: { des: 2, car: 1, "for": -1 } },
      habilidades: [
        hab("arremessador", "Arremessador", "Ataque à distância com funda ou arma de arremesso: dano +1 passo.", { efeitos: [{ t: "passoDano", valor: 1, armas: ["funda", "arremesso"] }] }),
        hab("pequenoERechonchudo", "Pequeno e Rechonchudo", "Tamanho Pequeno, deslocamento 6m; +2 em Enganação; pode usar Destreza em Atletismo.",
          { efeitos: [{ t: "tamanho", valor: "pequeno" }, { t: "deslocamento", tipo: "terrestre", base: 6 }, { t: "bonus", alvo: "pericia.enganacao", valor: 2 }, { t: "atrPericia", pericia: "atletismo", atributo: "des" }] }),
        hab("sorteSalvadora", "Sorte Salvadora", "Em um teste de resistência, 1 PM para rolar de novo.", { reacao: { custo: 1, gatilho: "teste de resistência", efeito: "rolar de novo" } }),
      ] },
    { id: "kliren", nome: "Kliren", pagina: 28,
      atributos: { fixo: { "int": 2, car: 1, "for": -1 } },
      habilidades: [
        hab("hibrido", "Híbrido", "Treinado em uma perícia à escolha.", { escolhas: [{ id: "pericia", tipo: "pericia", quantidade: 1, efeito: { t: "treino" } }] }),
        hab("engenhosidade", "Engenhosidade", "Num teste de perícia (não de ataque), 2 PM para somar a Inteligência. Recebida de novo: –1 PM.",
          { opcaoDeTeste: { id: "engenhosidade", custo: 2, soma: "atr.int", exceto: ["ataque"] } }),
        hab("ossosFrageis", "Ossos Frágeis", "+1 de dano sofrido por dado de dano de impacto.", { efeitos: [{ t: "vulnerabilidadePorDado", tipo: "impacto", valor: 1 }] }),
        hab("vanguardista", "Vanguardista", "Proficiência com armas de fogo e +2 em um Ofício à escolha.",
          { efeitos: [{ t: "prof", qual: "fogo" }], escolhas: [{ id: "oficio", tipo: "oficio", quantidade: 1, efeito: { t: "bonus", valor: 2 } }] }),
      ] },
    { id: "medusa", nome: "Medusa", pagina: 28,
      atributos: { fixo: { des: 2, car: 1 } },
      habilidades: [
        hab("criaDeMegalokk", "Cria de Megalokk", "Criatura do tipo monstro; visão no escuro.", { efeitos: [{ t: "tipo", valor: "monstro" }, { t: "sentido", valor: "visaoNoEscuro" }] }),
        hab("naturezaVenenosa", "Natureza Venenosa", "Resistência a veneno +5. Ação de movimento e 1 PM: envenena a arma em uso (perda de 1d12 PV) até acertar ou o fim da cena.",
          { efeitos: [{ t: "bonus", alvo: "resist.veneno", valor: 5 }], acao: { custo: 1, execucao: "movimento", duracao: "cena", texto: "A arma em uso causa perda de 1d12 PV (veneno) no próximo acerto.", danoExtra: { dados: "1d12", tipo: "perda", veneno: true, ate: "acertar" } } }),
        hab("olharAtordoante", "Olhar Atordoante", "Ação de movimento e 1 PM: criatura em alcance curto faz Fortitude (CD Car) ou fica atordoada por uma rodada (uma vez por cena).",
          { acao: { custo: 1, execucao: "movimento", alcance: "curto", resistencia: { pericia: "fortitude", atributo: "car" }, limite: "cena", texto: "Falha: atordoada por 1 rodada.", condicao: { id: "atordoado", duracao: "1 rodada" } } }),
      ] },
    { id: "osteon", nome: "Osteon", pagina: 29,
      atributos: { escolha: { quantidade: 3, valor: 1, exceto: ["con"] }, fixo: { con: -1 } },
      habilidades: [
        hab("armaduraOssea", "Armadura Óssea", "Redução de corte, frio e perfuração 5.", { efeitos: [{ t: "rd", tipos: ["corte", "frio", "perfuracao"], valor: 5 }] }),
        hab("memoriaPostuma", "Memória Póstuma", "Treinado em uma perícia, ou um poder geral, ou uma habilidade de outra raça humanoide (e o tamanho dela).",
          { escolhas: [{ id: "memoria", tipo: "alternativa", opcoes: [
            { id: "pericia", rotulo: "Uma perícia treinada", escolha: { tipo: "pericia", quantidade: 1, efeito: { t: "treino" } } },
            { id: "poder", rotulo: "Um poder geral", escolha: { tipo: "poderGeral", quantidade: 1 } },
            { id: "raca", rotulo: "Habilidade de outra raça humanoide", escolha: { tipo: "habilidadeDeRaca", exceto: ["humano", "osteon", "golem"], herdaTamanho: true } },
          ] }] }),
        hab("naturezaEsqueletica", "Natureza Esquelética", "Morto-vivo: visão no escuro; imune a cansaço, metabólicos, trevas e veneno; luz mágica de cura fere, trevas curam; sem alimentação.",
          { efeitos: [{ t: "tipo", valor: "mortoVivo" }, { t: "sentido", valor: "visaoNoEscuro" }, { t: "imune", valor: "cansaco" }, { t: "imune", valor: "metabolico" }, { t: "imune", valor: "trevas" }, { t: "imune", valor: "veneno" }, { t: "curaInvertida" }] }),
        hab("precoDaNaoVida", "Preço da Não Vida", "Precisa de 8 horas sob estrelas ou no subterrâneo para recuperar PV e PM (condição normal fixa); senão, sofre fome.", { efeitos: [{ t: "descansoFixo" }] }),
      ] },
    { id: "sereia", nome: "Sereia/Tritão", pagina: 29,
      atributos: { escolha: { quantidade: 3, valor: 1 } },
      habilidades: [
        hab("cancaoDosMares", "Canção dos Mares", "Pode lançar duas entre Amedrontar, Comando, Despedaçar, Enfeitiçar, Hipnotismo e Sono (Carisma). Se aprender de novo, –1 PM.",
          { escolhas: [{ id: "magias", tipo: "magia", quantidade: 2, de: ["amedrontar", "comando", "despedacar", "enfeiticar", "hipnotismo", "sono"], efeito: { t: "magia", atributo: "car", desconto: 1 } }] }),
        hab("mestreDoTridente", "Mestre do Tridente", "Tridente é arma simples; +2 em dano com azagaias, lanças e tridentes.",
          { efeitos: [{ t: "armaSimples", armas: ["tridente"] }, { t: "bonus", alvo: "dano", valor: 2, armas: ["azagaia", "lanca", "tridente"] }] }),
        hab("transformacaoAnfibia", "Transformação Anfíbia", "Respira debaixo d'água; natação 12m na água, pernas e 9m fora dela. Um dia sem água: não recupera PM.",
          { efeitos: [{ t: "deslocamento", tipo: "natacao", base: 12 }, { t: "respiraAgua" }] }),
      ] },
    { id: "silfide", nome: "Sílfide", pagina: 30,
      atributos: { fixo: { car: 2, des: 1, "for": -2 } },
      habilidades: [
        hab("asasDeBorboleta", "Asas de Borboleta", "Minúscula; paira a 1,5m com deslocamento 9m (ignora terreno difícil, imune a queda). 1 PM por rodada para voar 12m.",
          { efeitos: [{ t: "tamanho", valor: "minusculo" }, { t: "pairar" }], acao: { custo: 1, execucao: "livre", duracao: "rodada", texto: "Voo 12m nesta rodada.", efeitos: [{ t: "deslocamento", tipo: "voo", base: 12 }] } }),
        hab("espiritoDaNatureza", "Espírito da Natureza", "Espírito; visão na penumbra; fala com animais.", { efeitos: [{ t: "tipo", valor: "espirito" }, { t: "sentido", valor: "visaoNaPenumbra" }, { t: "falaComAnimais" }] }),
        hab("magiaDasFadas", "Magia das Fadas", "Pode lançar duas entre Criar Ilusão, Enfeitiçar, Luz (arcana) e Sono (Carisma). Se aprender de novo, –1 PM.",
          { escolhas: [{ id: "magias", tipo: "magia", quantidade: 2, de: ["criarIlusao", "enfeiticar", "luz", "sono"], efeito: { t: "magia", atributo: "car", desconto: 1, tipoMagia: "arcana" } }] }),
      ] },
    { id: "suraggel", nome: "Suraggel", pagina: 30,
      variantes: [
        { id: "aggelus", nome: "Aggelus", atributos: { fixo: { sab: 2, car: 1 } }, habilidades: ["herancaDivina", "luzSagrada"] },
        { id: "sulfure", nome: "Sulfure", atributos: { fixo: { des: 2, "int": 1 } }, habilidades: ["herancaDivina", "sombrasProfanas"] },
      ],
      habilidades: [
        hab("herancaDivina", "Herança Divina", "Espírito; visão no escuro.", { efeitos: [{ t: "tipo", valor: "espirito" }, { t: "sentido", valor: "visaoNoEscuro" }] }),
        hab("luzSagrada", "Luz Sagrada (aggelus)", "+2 em Diplomacia e Intuição; pode lançar Luz (divina, Carisma). Se aprender de novo, –1 PM.",
          { efeitos: [{ t: "bonus", alvo: "pericia.diplomacia", valor: 2 }, { t: "bonus", alvo: "pericia.intuicao", valor: 2 }, { t: "magia", id: "luz", atributo: "car", desconto: 1, tipoMagia: "divina" }] }),
        hab("sombrasProfanas", "Sombras Profanas (sulfure)", "+2 em Enganação e Furtividade; pode lançar Escuridão (divina, Inteligência). Se aprender de novo, –1 PM.",
          { efeitos: [{ t: "bonus", alvo: "pericia.enganacao", valor: 2 }, { t: "bonus", alvo: "pericia.furtividade", valor: 2 }, { t: "magia", id: "escuridao", atributo: "int", desconto: 1, tipoMagia: "divina" }] }),
      ] },
    { id: "trog", nome: "Trog", pagina: 31,
      atributos: { fixo: { con: 2, "for": 1, "int": -1 } },
      habilidades: [
        hab("mauCheiro", "Mau Cheiro", "Ação padrão e 2 PM: criaturas (exceto trogs) em alcance curto fazem Fortitude contra veneno (CD Con) ou ficam enjoadas por 1d6 rodadas; quem passa fica imune por um dia.",
          { acao: { custo: 2, execucao: "padrao", alcance: "curto", resistencia: { pericia: "fortitude", atributo: "con" }, texto: "Falha: enjoado por 1d6 rodadas.", condicao: { id: "enjoado", duracao: "1d6 rodadas" } } }),
        hab("mordida", "Mordida", "Arma natural (1d6, x2, perfuração). Uma vez por rodada, ao agredir com outra arma, 1 PM para um ataque extra com a mordida.",
          { efeitos: [{ t: "armaNatural", id: "mordida", nome: "Mordida", dano: "1d6", margem: 20, mult: 2, tipo: "perfuracao", extra: { custo: 1, quando: "uma vez por rodada, ao agredir com outra arma" } }] }),
        hab("reptiliano", "Reptiliano", "Monstro; visão no escuro; +1 na Defesa; +5 em Furtividade sem armadura nem roupas pesadas.",
          { efeitos: [{ t: "tipo", valor: "monstro" }, { t: "sentido", valor: "visaoNoEscuro" }, { t: "bonus", alvo: "defesa", valor: 1 }, { t: "bonus", alvo: "pericia.furtividade", valor: 5, cond: "sem armadura nem roupas pesadas", auto: "semArmadura" }] }),
        hab("sangueFrio", "Sangue Frio", "+1 de dano sofrido por dado de dano de frio.", { efeitos: [{ t: "vulnerabilidadePorDado", tipo: "frio", valor: 1 }] }),
      ] },
  ];

  var RACA = {};
  RACAS.forEach(function (r) { r.fonte = "T20"; RACA[r.id] = r; });

  /* A habilidade com aquele id, de qualquer raça (Memória Póstuma). */
  function habilidade(racaId, habId) {
    var r = RACA[racaId];
    if (!r) return null;
    return r.habilidades.filter(function (h) { return h.id === habId; })[0] || null;
  }
  /* Habilidades de fato da raça, já resolvida a variante (Suraggel). */
  function habilidadesDe(racaId, varianteId) {
    var r = RACA[racaId];
    if (!r) return [];
    if (!r.variantes) return r.habilidades.slice();
    var v = r.variantes.filter(function (x) { return x.id === varianteId; })[0] || r.variantes[0];
    return r.habilidades.filter(function (h) { return v.habilidades.indexOf(h.id) >= 0; });
  }
  function atributosDe(racaId, varianteId) {
    var r = RACA[racaId];
    if (!r) return {};
    if (!r.variantes) return r.atributos || {};
    var v = r.variantes.filter(function (x) { return x.id === varianteId; })[0] || r.variantes[0];
    return v.atributos;
  }
  /* Sem "criatura do tipo…" na descrição, a raça é humanoide. Lefou,
     medusa e trog são monstros; sílfide e suraggel, espíritos; golem,
     construto; osteon, morto-vivo. */
  var HUMANOIDES = ["humano", "anao", "dahllan", "elfo", "goblin", "minotauro", "qareen", "hynne", "kliren", "sereia"];

  global.RAMATormenta20Racas = { RACAS: RACAS, RACA: RACA, habilidade: habilidade, habilidadesDe: habilidadesDe, atributosDe: atributosDe, HUMANOIDES: HUMANOIDES };
})(typeof window !== "undefined" ? window : globalThis);
