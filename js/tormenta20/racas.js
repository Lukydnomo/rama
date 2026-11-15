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

  /* =================================================================
     v9.10 — RAÇA HOMEBREW
     -----------------------------------------------------------------
     Uma raça da mesa entra pelo MESMO mapa RACA (todo o motor a lê
     dali), a partir de uma CÓPIA guardada na ficha:

       t20.homebrew = { versao, racas: { "hbr-<id>-<hash>": def } }

     A chave é versionada pelo conteúdo: editar a raça na biblioteca cria
     outra versão, e o personagem em jogo continua com a dele. Só entram
     efeitos que o motor já soma, no formato das raças do livro:
       bonus     Defesa ou uma perícia (−5 a +10)
       treino    uma perícia treinada
       pvNivel   PV no 1º nível e por nível seguinte (Duro como Pedra)
       pmNivel   PM por nível (Sangue Mágico)
       sentido   visão no escuro, na penumbra, faro
       rd        redução de dano de um tipo
       prof      uma proficiência
     e UMA escolha por habilidade: perícias à escolha, treinadas ou com
     bônus (Versátil, Híbrido, Deformidade). Tamanho e deslocamento são
     da raça (viram a habilidade "Tamanho e deslocamento"). O resto do
     texto é da mesa. Puro: o servidor roda este arquivo.
     ================================================================= */
  var PADRAO_HB = /^hbr-[a-z0-9-]{3,30}$/;
  var ATRS = ["for", "des", "con", "int", "sab", "car"];
  var TAMANHOS_HB = ["minusculo", "pequeno", "medio", "grande"];
  var SENTIDOS_HB = ["visaoNoEscuro", "visaoNaPenumbra", "faro"];
  var PROFS_HB = ["marciais", "escudos", "pesadas", "exoticas", "fogo"];
  var RACAS_HOMEBREW = [];
  function Dd() { return global.RAMATormenta20Dados; }
  function oo(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  function ll(v) { return Array.isArray(v) ? v : []; }
  function tx(v, max) { return String(v === undefined || v === null ? "" : v).slice(0, max || 200); }
  function nn(v, min, max, p) { var n = Math.round(Number(v)); return v !== "" && v !== null && v !== undefined && isFinite(n) ? Math.max(min, Math.min(max, n)) : p; }
  function periciaOk(k) { return k !== "oficio" && (!Dd() || Dd().PERICIAS.some(function (p) { return p.chave === k; })); }
  function danoOk(k) { return !Dd() || Dd().TIPOS_DANO.some(function (x) { return x[0] === k; }); }
  function estavel(v) {
    if (Array.isArray(v)) return "[" + v.map(estavel).join(",") + "]";
    if (v && typeof v === "object") return "{" + Object.keys(v).sort().map(function (k) { return JSON.stringify(k) + ":" + estavel(v[k]); }).join(",") + "}";
    return JSON.stringify(v === undefined ? null : v);
  }
  function hash(t) { var h = 5381; for (var i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36).slice(0, 6); }
  function ehHomebrew(id) { return PADRAO_HB.test(String(id || "")); }

  function efeitoHomebrew(bruto) {
    var e = oo(bruto);
    if (e.t === "bonus") {
      var alvo = e.alvo === "defesa" ? "defesa" : (/^pericia\.[a-z]+$/.test(String(e.alvo)) && periciaOk(String(e.alvo).slice(8)) ? e.alvo : "");
      var v = nn(e.valor, -5, 10, 0);
      return alvo && v ? { t: "bonus", alvo: alvo, valor: v } : null;
    }
    if (e.t === "treino") return periciaOk(e.pericia) ? { t: "treino", pericia: e.pericia } : null;
    if (e.t === "pvNivel") { var ini = nn(e.inicial, 0, 10, 0), pn = nn(e.valor, -2, 5, 0); return ini || pn ? { t: "pvNivel", inicial: ini, valor: pn } : null; }
    if (e.t === "pmNivel") { var pm = nn(e.valor, 1, 3, 0); return pm ? { t: "pmNivel", valor: pm } : null; }
    if (e.t === "sentido") return SENTIDOS_HB.indexOf(e.valor) >= 0 ? { t: "sentido", valor: e.valor } : null;
    if (e.t === "rd") { var tp = ll(e.tipos)[0], rv = nn(e.valor, 1, 10, 0); return rv && danoOk(tp) ? { t: "rd", valor: rv, tipos: [tp] } : null; }
    if (e.t === "prof") return PROFS_HB.indexOf(e.qual) >= 0 ? { t: "prof", qual: e.qual } : null;
    return null;
  }
  /* v9.13: a habilidade ATIVADA (gasta PM): custo, execução, duração e
     efeitos que viram um efeito ativo na ficha (bônus em Defesa, perícia,
     ataque ou dano; redução de dano; sentido). Uma vez por cena, se quiser. */
  var EXECUCOES_HB = ["livre", "movimento", "padrao", "completa", "reacao"];
  var DURACOES_HB = ["cena", "rodada", "instantanea"];
  function acaoHomebrew(bruto) {
    var a = oo(bruto);
    if (!Object.keys(a).length) return null;
    var efs = ll(a.efeitos).map(function (e0) {
      var e = oo(e0);
      if (e.t === "bonus" && (e.alvo === "ataque" || e.alvo === "dano")) { var v = nn(e.valor, -5, 10, 0); return v ? { t: "bonus", alvo: e.alvo, valor: v } : null; }
      var x = efeitoHomebrew(e);
      return x && (x.t === "bonus" || x.t === "rd" || x.t === "sentido") ? x : null;
    }).filter(Boolean).slice(0, 4);
    var d = { custo: nn(a.custo, 0, 10, 1), execucao: EXECUCOES_HB.indexOf(a.execucao) >= 0 ? a.execucao : "padrao", duracao: DURACOES_HB.indexOf(a.duracao) >= 0 ? a.duracao : "cena", efeitos: efs };
    if (a.limite === "cena") d.limite = "cena";
    return d;
  }
  function escolhaHomebrew(bruto, id) {
    var x = oo(bruto);
    /* v9.13: uma magia à escolha (como a Tatuagem Mística do qareen). */
    if (x.tipo === "magia") return { id: id, tipo: "magia", circulo: nn(x.circulo, 1, 2, 1), quantidade: 1, efeito: { t: "magia", atributo: ["int", "sab", "car"].indexOf(oo(x.efeito).atributo) >= 0 ? x.efeito.atributo : "car", desconto: 0 } };
    if (x.tipo !== "pericia") return null;
    var q = nn(x.quantidade, 1, 3, 1);
    var ef = oo(x.efeito);
    var efeito = ef.t === "bonus" ? { t: "bonus", valor: nn(ef.valor, 1, 5, 2) } : { t: "treino" };
    return { id: id, tipo: "pericia", quantidade: q, efeito: efeito };
  }
  function atributosHomebrew(bruto) {
    var at = oo(bruto), fixo = {};
    ATRS.forEach(function (a) { var v = nn(oo(at.fixo)[a], -2, 2, 0); if (v) fixo[a] = v; });
    var atributos = { fixo: fixo };
    var esc = oo(at.escolha), q = nn(esc.quantidade, 0, 3, 0);
    if (q) atributos.escolha = { quantidade: q, valor: nn(esc.valor, 1, 2, 1), exceto: ll(esc.exceto).filter(function (a, i, l) { return ATRS.indexOf(a) >= 0 && !fixo[a] && l.indexOf(a) === i; }).concat(Object.keys(fixo)) };
    if (atributos.escolha && !atributos.escolha.exceto.length) delete atributos.escolha.exceto;
    return atributos;
  }
  function textoCorpo(tam, desl) {
    var nome = ((Dd() && Dd().TAMANHO && Dd().TAMANHO[tam]) || { nome: tam }).nome;
    return "Tamanho " + nome + ", deslocamento " + String(desl).replace(".", ",") + "m.";
  }
  function normalizarRacaHomebrew(bruto) {
    var b = oo(bruto);
    var atributos = atributosHomebrew(b.atributos);
    var tam = TAMANHOS_HB.indexOf(b.tamanho) >= 0 ? b.tamanho : "medio";
    var desl = Math.max(3, Math.min(18, Math.round((Number(b.deslocamento) || 9) / 1.5) * 1.5));
    var d = {
      id: ehHomebrew(b.id) ? b.id : "",
      nome: tx(b.nome, 60).trim() || "Raça Homebrew",
      homebrew: true, homebrewId: tx(b.homebrewId, 80), fonte: "HOMEBREW", pagina: 0,
      descricao: tx(b.descricao, 1200),
      tamanho: tam, deslocamento: desl,
      atributos: atributos,
      habilidades: [],
    };
    ll(b.habilidades).filter(function (h) { return oo(h).id !== "corpo"; }).slice(0, 6).forEach(function (h0, i) {
      var h = oo(h0);
      var id = "h" + (i + 1);
      var x = { id: id, nome: tx(h.nome, 60).trim() || "Habilidade " + (i + 1), resumo: tx(h.resumo, 600).trim(), efeitos: ll(h.efeitos).map(efeitoHomebrew).filter(Boolean).slice(0, 4), homebrew: true };
      var e = ll(h.escolhas).map(function (y) { return escolhaHomebrew(y, id + "e"); }).filter(Boolean)[0];
      if (e) x.escolhas = [e];
      var ac = acaoHomebrew(h.acao);
      if (ac) x.acao = ac;
      d.habilidades.push(x);
    });
    /* v9.13: VARIANTES (como o Suraggel): cada uma com os seus atributos
       e as habilidades que tem. Só valem a partir de duas. */
    var idsHab = d.habilidades.map(function (h) { return h.id; });
    var vars = ll(b.variantes).slice(0, 3).map(function (v0, i) {
      var v = oo(v0);
      return { id: "v" + (i + 1), nome: tx(v.nome, 40).trim() || "Variante " + (i + 1), atributos: atributosHomebrew(v.atributos), habilidades: ll(v.habilidades).map(String).filter(function (k, j, l) { return idsHab.indexOf(k) >= 0 && l.indexOf(k) === j; }) };
    });
    if (vars.length >= 2) d.variantes = vars;
    if (tam !== "medio" || desl !== 9) {
      var corpo = [];
      if (tam !== "medio") corpo.push({ t: "tamanho", valor: tam });
      if (desl !== 9) corpo.push({ t: "deslocamento", tipo: "terrestre", base: desl });
      d.habilidades.unshift({ id: "corpo", nome: "Tamanho e deslocamento", resumo: textoCorpo(tam, desl), efeitos: corpo, homebrew: true });
      if (d.variantes) d.variantes.forEach(function (v) { v.habilidades.unshift("corpo"); });
    }
    if (!d.id) d.id = chaveHomebrew("hbr-", d);
    return d;
  }
  /* A chave versionada de qualquer definição Homebrew de T20 (raça,
     origem, divindade, classe): prefixo + id curto + hash do conteúdo. */
  function chaveHomebrew(prefixo, d) {
    var sem = Object.assign({}, d); delete sem.id;
    return prefixo + (String(d.homebrewId || "local").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "local") + "-" + hash(estavel(sem));
  }
  /* Registra no mapa (idempotente; chaves versionadas não colidem). */
  function registrarRacaHomebrew(def) {
    if (!def || !ehHomebrew(def.id)) return null;
    RACA[def.id] = def;
    RACAS_HOMEBREW = RACAS_HOMEBREW.filter(function (r) { return r.id !== def.id; }).concat([def]);
    return def;
  }
  function racasHomebrew() { return RACAS_HOMEBREW.slice(); }
  function racasDisponiveis() { return RACAS.concat(RACAS_HOMEBREW); }
  function referencia(r) { return r && r.homebrew ? "Homebrew" : (r && r.pagina ? "p. " + r.pagina : ""); }

  global.RAMATormenta20Racas = { RACAS: RACAS, RACA: RACA, habilidade: habilidade, habilidadesDe: habilidadesDe, atributosDe: atributosDe, HUMANOIDES: HUMANOIDES,
    ehHomebrew: ehHomebrew, chaveHomebrew: chaveHomebrew, escolhaHomebrew: escolhaHomebrew, acaoHomebrew: acaoHomebrew, EXECUCOES_HB: EXECUCOES_HB, DURACOES_HB: DURACOES_HB, normalizarRacaHomebrew: normalizarRacaHomebrew, registrarRacaHomebrew: registrarRacaHomebrew, efeitoHomebrew: efeitoHomebrew,
    racasHomebrew: racasHomebrew, racasDisponiveis: racasDisponiveis, referencia: referencia, textoCorpo: textoCorpo,
    TAMANHOS_HB: TAMANHOS_HB, SENTIDOS_HB: SENTIDOS_HB, PROFS_HB: PROFS_HB };
})(typeof window !== "undefined" ? window : globalThis);
