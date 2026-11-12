/* R.A.M.A. — Tormenta20 · poções, acessórios, artefatos e o gerador de
   tesouro (Livro Básico, p. 341–349). Continua js/tormenta20/itens-magicos.js. */
(function (global) {
  "use strict";
  var IM = global.RAMATormenta20ItensMagicos;
  var esp = IM.esp;
  function lista(v) { return Array.isArray(v) ? v : []; }

  /* Tabela 8-12: poções (p. 341). [até, magia, aprimoramentos, preço, rótulo, forma] */
  IM.POCOES = [
    [1, "abencoarAlimentos", {}, 30, "Abençoar Alimentos", "oleo"], [3, "areaEscorregadia", {}, 30, "Área Escorregadia", "granada"], [6, "armaMagica", {}, 30, "Arma Mágica", "oleo"], [7, "compreensao", {}, 30, "Compreensão"],
    [15, "curarFerimentos", {}, 30, "Curar Ferimentos (2d8+2 PV)"], [18, "disfarceIlusorio", {}, 30, "Disfarce Ilusório"], [20, "escuridao", {}, 30, "Escuridão", "oleo"], [22, "luz", {}, 30, "Luz", "oleo"], [24, "nevoa", {}, 30, "Névoa", "granada"],
    [26, "primorAtletico", {}, 30, "Primor Atlético"], [28, "protecaoDivina", {}, 30, "Proteção Divina"], [30, "resistenciaAEnergia", {}, 30, "Resistência a Energia"], [32, "sono", {}, 30, "Sono"], [33, "suporteAmbiental", {}, 30, "Suporte Ambiental"],
    [34, "trancaArcana", {}, 30, "Tranca Arcana", "oleo"], [35, "visaoMistica", {}, 30, "Visão Mística"], [36, "vitalidadeFantasma", {}, 30, "Vitalidade Fantasma"], [38, "escudoDaFe", { 0: 1 }, 120, "Escudo da Fé (duração cena)"],
    [40, "alterarTamanho", {}, 270, "Alterar Tamanho"], [42, "aparenciaPerfeita", {}, 270, "Aparência Perfeita"], [43, "armamentoDaNatureza", {}, 270, "Armamento da Natureza", "oleo"], [49, "bolaDeFogo", {}, 270, "Bola de Fogo", "granada"],
    [51, "camuflagemIlusoria", {}, 270, "Camuflagem Ilusória"], [53, "concentracaoDeCombate", { 0: 1 }, 270, "Concentração de Combate (duração cena)"], [62, "curarFerimentos", { 1: 2 }, 270, "Curar Ferimentos (4d8+4 PV)"], [66, "fisicoDivino", {}, 270, "Físico Divino"],
    [68, "menteDivina", {}, 270, "Mente Divina"], [70, "metamorfose", {}, 270, "Metamorfose"], [75, "purificacao", {}, 270, "Purificação"], [77, "velocidade", {}, 270, "Velocidade"], [79, "vestimentaDaFe", {}, 270, "Vestimenta da Fé", "oleo"], [80, "vozDivina", {}, 270, "Voz Divina"],
    [82, "armaMagica", { 0: 2 }, 750, "Arma Mágica (bônus +3)", "oleo"], [88, "curarFerimentos", { 1: 5 }, 1080, "Curar Ferimentos (7d8+7 PV)"], [89, "fisicoDivino", { 1: 1 }, 1080, "Físico Divino (três atributos)"], [92, "invisibilidade", { 1: 1 }, 1080, "Invisibilidade (duração cena)"],
    [96, "bolaDeFogo", { 0: 2 }, 1470, "Bola de Fogo (10d6)", "granada"], [100, "curarFerimentos", { 1: 9 }, 3000, "Curar Ferimentos (11d8+11 PV)"],
  ];
  IM.REGRAS_POCOES = {
    pagina: 341,
    categoria: function (circulo) { return circulo >= 5 ? "maior" : (circulo >= 3 ? "medio" : "menor"); },
    pocao: "Beber: ação padrão (afeta quem bebe); dar a um inconsciente: ação completa; forçar: agarrar e vencer outra manobra. Óleo: ação padrão para aplicar. Granada: ação padrão para arremessar a um ponto em alcance curto.",
    pergaminho: "Ler em voz alta: ação padrão ou a execução da magia (o que for maior). Precisa conhecer a magia ou passar em Misticismo CD 20 + PM. Quem conhece pode pagar aprimoramentos (só o custo deles).",
  };

  /* Acessórios (p. 342–345). apos: "dia" ou "semana" de uso. */
  function ac(id, nome, preco, cat, pag, r, extra) { return esp(id, nome, null, preco, cat, pag, r, Object.assign({ acessorio: true }, extra || {})); }
  /* menores (Tabela 8-13) */
  ac("anelDoSustento", "Anel do Sustento", 3000, "menor", 342, "Não precisa comer nem beber e dorme só duas horas para descansar (após uma semana de uso).", { apos: "semana", ata: 2 });
  ac("bainhaMagica", "Bainha Mágica", 3000, "menor", 342, "Lança Arma Mágica sem custo em qualquer arma corpo a corpo guardada nela.", { ata: 7 });
  ac("cordaDaEscalada", "Corda da Escalada", 3000, "menor", 343, "Corda de 15 m que aguenta seis criaturas Médias; com um comando (ação de movimento) move-se 3 m por rodada e se prende onde você quiser.", { ata: 12 });
  ac("ferradurasDaVelocidade", "Ferraduras da Velocidade", 3000, "menor", 344, "Numa montaria: +3 m de deslocamento.", { ata: 14 });
  ac("garrafaDaFumacaEterna", "Garrafa da Fumaça Eterna", 3000, "menor", 344, "Abrir lança Névoa sem custo; persiste até tampar.", { ata: 19, efeitos: [{ t: "magia", id: "nevoa", gratis: true }] });
  ac("gemaDaLuminosidade", "Gema da Luminosidade", 3000, "menor", 344, "Comando: luz de tocha ou raio que cega uma criatura em alcance curto por 1d4 rodadas (Fort CD Car evita).", { ata: 24 });
  ac("mantoElfico", "Manto Élfico", 3000, "menor", 345, "Com o capuz cobrindo o rosto, +5 em Furtividade.", { ata: 29, efeitos: [{ t: "bonus", alvo: "pericia.furtividade", valor: 5, categoria: "item" }] });
  ac("mochilaDeCarga", "Mochila de Carga", 3000, "menor", 345, "+10 espaços de carga (ela não ocupa espaço). Rasgada, destrói o que tem dentro.", { ata: 34, espacos: 0, efeitos: [{ t: "bonus", alvo: "carga", valor: 10, categoria: "item", cumulativo: 1 }] });
  ac("brincosDaSagacidade", "Brincos da Sagacidade", 4500, "menor", 342, "+1 em Inteligência (após um dia de uso).", { apos: "dia", ata: 40, efeitos: [{ t: "bonus", alvo: "atr.int", valor: 1, categoria: "item" }] });
  ac("luvasDaDelicadeza", "Luvas da Delicadeza", 4500, "menor", 344, "+1 em Destreza (após um dia de uso).", { apos: "dia", ata: 46, efeitos: [{ t: "bonus", alvo: "atr.des", valor: 1, categoria: "item" }] });
  ac("manoplasDaForcaDoOgro", "Manoplas da Força do Ogro", 4500, "menor", 344, "+1 em Força (após um dia de uso).", { apos: "dia", ata: 52, efeitos: [{ t: "bonus", alvo: "atr.for", valor: 1, categoria: "item" }] });
  ac("mantoDaResistencia", "Manto da Resistência", 4500, "menor", 344, "+2 nos testes de resistência.", { ata: 59, efeitos: [{ t: "bonus", alvo: "resistencias", valor: 2, categoria: "item" }] });
  ac("mantoDoFascinio", "Manto do Fascínio", 4500, "menor", 344, "+1 em Carisma (após um dia de uso).", { apos: "dia", ata: 65, efeitos: [{ t: "bonus", alvo: "atr.car", valor: 1, categoria: "item" }] });
  ac("pingenteDaSensatez", "Pingente da Sensatez", 4500, "menor", 345, "+1 em Sabedoria (após um dia de uso).", { apos: "dia", ata: 71, efeitos: [{ t: "bonus", alvo: "atr.sab", valor: 1, categoria: "item" }] });
  ac("torqueDoVigor", "Torque do Vigor", 4500, "menor", 345, "+1 em Constituição (após um dia de uso).", { apos: "dia", ata: 77, efeitos: [{ t: "bonus", alvo: "atr.con", valor: 1, categoria: "item" }] });
  ac("chapeuDoDisfarce", "Chapéu do Disfarce", 6000, "menor", 343, "Lança Disfarce Ilusório com odores e sensações (+20 em Enganação para disfarce) sem custo; sem outros aprimoramentos.", { ata: 82, efeitos: [{ t: "magia", id: "disfarceIlusorio", gratis: true, aprim: { 3: 1 } }] });
  ac("flautaFantasma", "Flauta Fantasma", 6000, "menor", 344, "Treinado em Atuação: lança Esculpir Sons (CD Car) sem custo.", { ata: 84, efeitos: [{ t: "magia", id: "esculpirSons", gratis: true, atributo: "car", requer: "atuacao" }] });
  ac("lanternaDaRevelacao", "Lanterna da Revelação", 6000, "menor", 344, "Lampião cuja luz revela criaturas e objetos invisíveis.", { ata: 89 });
  ac("anelDaProtecao", "Anel da Proteção", 9000, "menor", 342, "+2 na Defesa.", { ata: 96, efeitos: [{ t: "bonus", alvo: "defesa", valor: 2, categoria: "item" }] });
  ac("anelDoEscudoMental", "Anel do Escudo Mental", 9000, "menor", 342, "Imunidade a magias de adivinhação.", { ata: 98, efeitos: [{ t: "imune", valor: "adivinhacao" }] });
  ac("pingenteDaSaude", "Pingente da Saúde", 9000, "menor", 345, "Imunidade a doenças e venenos (após uma semana de uso).", { apos: "semana", ata: 100, efeitos: [{ t: "imune", valor: "doenca" }, { t: "imune", valor: "veneno" }] });
  /* médios (Tabela 8-14) */
  ac("anelDeTelecinesia", "Anel de Telecinesia", 10500, "medio", 342, "Lança Telecinesia (CD Int); se já conhece, –1 PM.", { ata: 4, efeitos: [{ t: "magia", id: "telecinesia", atributo: "int", descontoSeConhece: 1 }] });
  ac("bolaDeCristal", "Bola de Cristal", 10500, "medio", 342, "Ação completa: Vidência (CD Sab).", { ata: 8, efeitos: [{ t: "magia", id: "videncia", atributo: "sab", gratis: true }] });
  ac("caveiraMaldita", "Caveira Maldita", 10500, "medio", 343, "Efeito de Profanar centrado nela; mortos-vivos e devotos de deuses só de energia negativa ali recebem +2 em testes e Defesa.", { ata: 10 });
  ac("botasAladas", "Botas Aladas", 15000, "medio", 342, "2 PM: voo 12 m por uma rodada; 1 PM no início de cada turno mantém.", { ata: 14 });
  ac("braceletesDeBronze", "Braceletes de Bronze", 16500, "medio", 342, "+4 na Defesa, acumulando com outros itens mágicos, mas não com armaduras.", { ata: 18, efeitos: [{ t: "bonus", alvo: "defesa", valor: 4, categoria: "item", cumulativo: 1, naoAcumulaArmadura: 1 }] });
  ac("anelDaEnergia", "Anel da Energia", 21000, "medio", 342, "+5 PM (após um dia de uso).", { apos: "dia", ata: 24, efeitos: [{ t: "bonus", alvo: "pm", valor: 5, categoria: "item" }] });
  ac("anelDaVitalidade", "Anel da Vitalidade", 21000, "medio", 342, "+10 PV (após um dia de uso).", { apos: "dia", ata: 30, efeitos: [{ t: "bonus", alvo: "pv", valor: 10, categoria: "item" }] });
  ac("anelDeInvisibilidade", "Anel de Invisibilidade", 21000, "medio", 342, "Colocado, deixa invisível (Invisibilidade); termina ao atacar ou lançar magia ofensiva; tirar e recolocar (ação padrão) reativa.", { ata: 34 });
  ac("bracadeirasDoArqueiro", "Braçadeiras do Arqueiro", 21000, "medio", 342, "+2 no dano à distância (acumula com outros itens).", { ata: 38, efeitos: [{ t: "bonus", alvo: "dano.distancia", valor: 2, categoria: "item", cumulativo: 1 }] });
  ac("brincosDeMarah", "Brincos de Marah", 21000, "medio", 343, "A primeira criatura que o atacar na cena faz Vontade (CD Car) ou perde a ação; atacar alguém cancela por um dia (com Aparência Inofensiva, as duas primeiras).", { ata: 42 });
  ac("faixasDoPugilista", "Faixas do Pugilista", 21000, "medio", 344, "+2 em ataque e dano desarmados (acumula com outros itens).", { ata: 46, efeitos: [{ t: "bonus", alvo: "ataque", valor: 2, categoria: "item", cumulativo: 1, armas: ["desarmado"] }, { t: "bonus", alvo: "dano.desarmado", valor: 2, categoria: "item", cumulativo: 1 }] });
  ac("mantoDaAranha", "Manto da Aranha", 21000, "medio", 344, "Escalada igual ao deslocamento, +5 nas resistências contra venenos, imune a teias e lança Teia (CD Des; –1 PM se já conhece).", { ata: 50, efeitos: [{ t: "deslocamento", tipo: "escalar", igualTerrestre: true }, { t: "magia", id: "teia", atributo: "des", descontoSeConhece: 1 }] });
  ac("vassouraVoadora", "Vassoura Voadora", 21000, "medio", 345, "Como tapete voador (voo 12 m), para duas pessoas ou 40 espaços.", { ata: 54 });
  ac("simboloAbencoado", "Símbolo Abençoado", 21000, "medio", 345, "Conta como símbolo sagrado; devoto do deus: magias divinas –1 PM (acumula com Símbolo Sagrado Energizado). Só devotos fabricam.", { ata: 58, efeitos: [{ t: "descontoMagia", valor: 1, tipoMagia: "divina", cumulativo: true, seDevoto: true }] });
  ac("amuletoDaRobustez", "Amuleto da Robustez", 25500, "medio", 342, "+2 em Constituição (após um dia de uso).", { apos: "dia", ata: 64, efeitos: [{ t: "bonus", alvo: "atr.con", valor: 2, categoria: "item" }] });
  ac("botasVelozes", "Botas Velozes", 25500, "medio", 342, "+3 m de deslocamento e lança Velocidade só em você.", { ata: 68, efeitos: [{ t: "bonus", alvo: "deslocamento", valor: 3, categoria: "item" }, { t: "magia", id: "velocidade", soPessoal: true }] });
  ac("cintoDaForcaDoGigante", "Cinto da Força do Gigante", 25500, "medio", 343, "+2 em Força (após um dia de uso).", { apos: "dia", ata: 74, efeitos: [{ t: "bonus", alvo: "atr.for", valor: 2, categoria: "item" }] });
  ac("coroaMajestosa", "Coroa Majestosa", 25500, "medio", 344, "+2 em Carisma (após um dia de uso).", { apos: "dia", ata: 80, efeitos: [{ t: "bonus", alvo: "atr.car", valor: 2, categoria: "item" }] });
  ac("estolaDaSerenidade", "Estola da Serenidade", 25500, "medio", 344, "+2 em Sabedoria (após um dia de uso).", { apos: "dia", ata: 86, efeitos: [{ t: "bonus", alvo: "atr.sab", valor: 2, categoria: "item" }] });
  ac("mantoDoMorcego", "Manto do Morcego", 25500, "medio", 344, "+5 em Furtividade e pendura-se no teto; ação padrão, à noite ou no escuro: vira morcego Minúsculo (voo 12 m, mordida 1d4), como Forma Selvagem.", { ata: 88, efeitos: [{ t: "bonus", alvo: "pericia.furtividade", valor: 5, categoria: "item" }] });
  ac("pulseirasDaCeleridade", "Pulseiras da Celeridade", 25500, "medio", 345, "+2 em Destreza (após um dia de uso).", { apos: "dia", ata: 94, efeitos: [{ t: "bonus", alvo: "atr.des", valor: 2, categoria: "item" }] });
  ac("tiaraDaSapiencia", "Tiara da Sapiência", 25500, "medio", 345, "+2 em Inteligência (após um dia de uso).", { apos: "dia", ata: 100, efeitos: [{ t: "bonus", alvo: "atr.int", valor: 2, categoria: "item" }] });
  /* maiores (Tabela 8-15) */
  ac("elmoDoTeletransporte", "Elmo do Teletransporte", 30000, "maior", 344, "Lança Salto Dimensional e Teletransporte só em você; –1 PM se já conhece.", { ata: 2, efeitos: [{ t: "magia", id: "saltoDimensional", soPessoal: true, descontoSeConhece: 1 }, { t: "magia", id: "teletransporte", soPessoal: true, descontoSeConhece: 1 }] });
  ac("gemaDaTelepatia", "Gema da Telepatia", 30000, "maior", 344, "Lança Compreensão e Enfeitiçar (CD Car) sem custo.", { ata: 4, efeitos: [{ t: "magia", id: "compreensao", gratis: true, atributo: "car" }, { t: "magia", id: "enfeiticar", gratis: true, atributo: "car" }] });
  ac("gemaElemental", "Gema Elemental", 30000, "maior", 344, "Lança Conjurar Elemental sem custo.", { ata: 9, efeitos: [{ t: "magia", id: "conjurarElemental", gratis: true }] });
  ac("manualDaSaudeCorporal", "Manual da Saúde Corporal", 30000, "maior", 345, "Uma semana de leitura: +1 permanente em Constituição (uma vez); depois vira mundano.", { ata: 15, consumivel: true, permanente: { atributo: "con", valor: 1 } });
  ac("manualDoBomExercicio", "Manual do Bom Exercício", 30000, "maior", 345, "Uma semana de leitura: +1 permanente em Força (uma vez); depois vira mundano.", { ata: 21, consumivel: true, permanente: { atributo: "for", valor: 1 } });
  ac("manualDosMovimentosPrecisos", "Manual dos Movimentos Precisos", 30000, "maior", 345, "Uma semana de leitura: +1 permanente em Destreza (uma vez); depois vira mundano.", { ata: 27, consumivel: true, permanente: { atributo: "des", valor: 1 } });
  ac("medalhaoDeLena", "Medalhão de Lena", 30000, "maior", 345, "Uma vez por dia, ao cair a 0 PV ou menos, cura 100 PV antes de você cair.", { ata: 34 });
  ac("tomoDaCompreensao", "Tomo da Compreensão", 30000, "maior", 345, "Uma semana de leitura: +1 permanente em Sabedoria (uma vez).", { ata: 40, consumivel: true, permanente: { atributo: "sab", valor: 1 } });
  ac("tomoDaLiderancaEInfluencia", "Tomo da Liderança e Influência", 30000, "maior", 345, "Uma semana de leitura: +1 permanente em Carisma (uma vez).", { ata: 46, consumivel: true, permanente: { atributo: "car", valor: 1 } });
  ac("tomoDosGrandesPensamentos", "Tomo dos Grandes Pensamentos", 30000, "maior", 345, "Uma semana de leitura: +1 permanente em Inteligência (uma vez).", { ata: 52, consumivel: true, permanente: { atributo: "int", valor: 1 } });
  ac("anelRefletor", "Anel Refletor", 51000, "maior", 342, "Uma vez por rodada, alvo de magia: gaste PM igual ao custo para refleti-la ao conjurador.", { ata: 57 });
  ac("cintoDoCampeao", "Cinto do Campeão", 51000, "maior", 343, "+1 em Força e a habilidade Briga (após um dia); se já tem Briga, dano desarmado como 4 níveis de lutador a mais (máximo 2d12); Torcida dá +3.", { apos: "dia", ata: 60, efeitos: [{ t: "bonus", alvo: "atr.for", valor: 1, categoria: "item" }] });
  ac("colarGuardiao", "Colar Guardião", 51000, "maior", 343, "+5 na Defesa.", { ata: 67, efeitos: [{ t: "bonus", alvo: "defesa", valor: 5, categoria: "item" }] });
  ac("estatuetaAnimista", "Estatueta Animista", 51000, "maior", 344, "Atirada ao chão com a palavra de comando, vira o animal até o fim da cena: parceiro veterano (raposa ajudante, onça assassino, águia atirador, lobo combatente, leão fortão ou urso guardião).", { ata: 72, parceiro: { nivel: "veterano" } });
  ac("anelDaLiberdade", "Anel da Liberdade", 60000, "maior", 342, "Sempre sob efeito de Libertação.", { ata: 77, efeitos: [{ t: "ignoraReducaoDeslocamento" }, { t: "imune", valor: "movimento" }] });
  ac("tapeteVoador", "Tapete Voador", 60000, "maior", 345, "Tapete de 3 × 3 m com voo 12 m para seis criaturas Médias ou 120 espaços; comandável em alcance longo.", { ata: 82 });
  ac("braceletesDeOuro", "Braceletes de Ouro", 64500, "maior", 342, "+8 na Defesa, acumulando com outros itens mágicos, mas não com armaduras.", { ata: 87, efeitos: [{ t: "bonus", alvo: "defesa", valor: 8, categoria: "item", cumulativo: 1, naoAcumulaArmadura: 1 }] });
  ac("espelhoDaOposicao", "Espelho da Oposição", 75000, "maior", 344, "Ativado, cria uma cópia de quem se olha, que luta contra o original até um dos dois cair.", { ata: 89 });
  ac("robeDoArquimago", "Robe do Arquimago", 90000, "maior", 345, "Conjurador arcano: Defesa +5 + círculo máximo e resistências + metade disso.", { ata: 94, efeitos: [{ t: "bonus", alvo: "defesa", valor: "tem.lancaArcana ? 5 + circuloMax : 0", categoria: "item" }, { t: "bonus", alvo: "resistencias", valor: "tem.lancaArcana ? floor((5 + circuloMax) / 2) : 0", categoria: "item" }] });
  ac("orbeDasTempestades", "Orbe das Tempestades", 97500, "maior", 345, "Lança Controlar o Clima e Fúria do Panteão (CD Sab; –1 PM se já conhece); você e aliados adjacentes ficam sob Suporte Ambiental.", { ata: 96, efeitos: [{ t: "magia", id: "controlarOClima", atributo: "sab", descontoSeConhece: 1 }, { t: "magia", id: "furiaDoPanteao", atributo: "sab", descontoSeConhece: 1 }] });
  ac("anelDaRegeneracao", "Anel da Regeneração", 150000, "maior", 342, "Cura acelerada 5 (após um dia de uso).", { apos: "dia", ata: 98, efeitos: [{ t: "curaAcelerada", valor: 5 }] });
  ac("espelhoDoAprisionamento", "Espelho do Aprisionamento", 150000, "maior", 344, "Quem se vê nele em alcance curto faz Reflexos (CD Int) ou fica preso dentro (menos construtos, mortos-vivos e objetos); quebrá-lo liberta todos.", { ata: 100 });
  IM.ACESSORIOS = {
    menor: ["anelDoSustento", "bainhaMagica", "cordaDaEscalada", "ferradurasDaVelocidade", "garrafaDaFumacaEterna", "gemaDaLuminosidade", "mantoElfico", "mochilaDeCarga", "brincosDaSagacidade", "luvasDaDelicadeza", "manoplasDaForcaDoOgro", "mantoDaResistencia", "mantoDoFascinio", "pingenteDaSensatez", "torqueDoVigor", "chapeuDoDisfarce", "flautaFantasma", "lanternaDaRevelacao", "anelDaProtecao", "anelDoEscudoMental", "pingenteDaSaude"],
    medio: ["anelDeTelecinesia", "bolaDeCristal", "caveiraMaldita", "botasAladas", "braceletesDeBronze", "anelDaEnergia", "anelDaVitalidade", "anelDeInvisibilidade", "bracadeirasDoArqueiro", "brincosDeMarah", "faixasDoPugilista", "mantoDaAranha", "vassouraVoadora", "simboloAbencoado", "amuletoDaRobustez", "botasVelozes", "cintoDaForcaDoGigante", "coroaMajestosa", "estolaDaSerenidade", "mantoDoMorcego", "pulseirasDaCeleridade", "tiaraDaSapiencia"],
    maior: ["elmoDoTeletransporte", "gemaDaTelepatia", "gemaElemental", "manualDaSaudeCorporal", "manualDoBomExercicio", "manualDosMovimentosPrecisos", "medalhaoDeLena", "tomoDaCompreensao", "tomoDaLiderancaEInfluencia", "tomoDosGrandesPensamentos", "anelRefletor", "cintoDoCampeao", "colarGuardiao", "estatuetaAnimista", "anelDaLiberdade", "tapeteVoador", "braceletesDeOuro", "espelhoDaOposicao", "robeDoArquimago", "orbeDasTempestades", "anelDaRegeneracao", "espelhoDoAprisionamento"],
  };

  /* Artefatos (p. 346–349): só por decisão do mestre; sem preço. */
  function art(id, nome, pag, r, extra) { return esp(id, nome, null, null, "artefato", pag, r, Object.assign({ artefato: true }, extra || {})); }
  art("espadaDeus", "Espada-Deus", 346, "Espada longa atroz precisa pungente ameaçadora magnífica veloz, dano básico 2d12; ignora RD, critica até imunes e é indestrutível. Só quem tem 15 níveis em classes com Luta inicial a usa; os outros erram todos os ataques.", { base: "espadaLonga", melhorias: ["atroz", "precisa", "pungente"], encantos: ["ameacadora", "magnifica", "veloz"], danoBase: "2d12", ignoraRD: true });
  art("joiaDaAlma", "Joia da Alma", 346, "+3 em Inteligência (após um dia); para magos, magias arcanas custam 0 PM (aprimoramentos pagos). Empunhar: Vontade CD 25 (falha atordoa e solta); teste diário com CD +1 por dia: frustrado, esmorecido, insano (vira NPC).", { efeitos: [{ t: "bonus", alvo: "atr.int", valor: 3, categoria: "item" }], apos: "dia" });
  art("baralhoDoCaos", "Baralho do Caos", 347, "+10 em Jogatina (–10 se abusar da sorte). “Eu aposto tudo”: saca de uma a quatro cartas de 22 (d% cada, repetidas se rolam de novo); treinado em Jogatina pode trocar uma (CD 30). Depois, o baralho some.", { efeitos: [{ t: "bonus", alvo: "pericia.jogatina", valor: 10, categoria: "item" }] });
  IM.BARALHO_DO_CAOS = [[5, "Abismo", "Resistência 10 a um tipo de dano aleatório."], [9, "Amigo", "Um parceiro racional o trai no pior momento (em até um ano)."], [14, "Anel", "+5 PM permanentes."], [19, "Árvore", "+10 PV permanentes."], [24, "Coração", "+1 permanente num atributo à escolha."], [28, "Crânio", "Uma cópia sombria sua o ataca; só você a fere."], [33, "Donzela", "Derrote sozinho um monstro de ND igual ao seu nível –1 e suba de nível."], [38, "Fogo", "Se morrer, volta com PV e PM cheios (uma vez)."], [43, "Gema", "Dez rolagens na coluna Maior de riquezas."], [48, "Lua", "1d4 Desejos até o fim da cena."], [52, "Martelo", "Todos os seus itens mágicos são destruídos."], [56, "Noite", "–1 permanente nas resistências (devoto de Tenebra ou morto-vivo: arma mágica maior)."], [60, "Presas", "Todo o seu dinheiro e itens mundanos viram pó."], [65, "Servo", "Parceiro veterano de um tipo à escolha."], [70, "Sol", "Arma mágica maior (devoto de Tenebra ou morto-vivo: –1 nas resistências)."], [75, "Tentáculo", "–1 permanente num atributo aleatório."], [80, "Tolo", "Perde 10.000 XP e saca outra carta."], [85, "Trono", "+2 em Diplomacia e um feudo (poder Título)."], [90, "Vizir", "Resposta verdadeira a uma pergunta (em até um ano)."], [94, "Nada", "Uma vez em até um ano, anula um ataque ou efeito e fica imune a tudo por uma rodada."], [98, "Vazio", "Sua alma vai para o vazio entre os Planos; o corpo fica em coma."], [100, "Curinga", "10.000 XP ou sacar mais duas cartas."]];
  art("olhoDeSszzaas", "Olho de Sszzaas", 348, "Cajado que lança qualquer magia conhecida ou ouvida, arcana ou divina, sem PM (aprimoramentos pagos), com Misticismo CD 20 + PM; falhas são Sszzaas no controle. Reconhecer exige Conhecimento CD 30.");
  art("rubisDaVirtude", "Rubis da Virtude", 349, "Incrustado no corpo (Cura CD 25), cada rubi dá um nível numa classe que você já tem (em um dia), RD 2 e +1 nas resistências (acumulam entre rubis); adivinhação contra você exige Misticismo CD 30 + rubis.", { efeitos: [{ t: "rd", valor: 2, fonteRd: "rubi", cumulativo: true }, { t: "bonus", alvo: "resistencias", valor: 1, categoria: "item", cumulativo: 1 }], acumulaPorQuantidade: true });

  /* ------------------------------------------------ efeitos de itens */
  /* Usados por regras.js: efeitos de encantos e itens específicos ou
     acessórios vestidos/empunhados. "apos" exige o tempo de uso
     marcado no item (it.notas não conta; o campo é it.ativadoDesde). */
  IM.efeitosDoItem = function (it, base) {
    var out = [];
    var esp2 = IM.ITEM[it.magico] || (base && base.especifico ? base : null);
    var encs = lista(it.encantos).slice();
    if (esp2) {
      encs = encs.concat(lista(esp2.encantos));
      if (!esp2.apos || it.sintonizado !== false) out = out.concat(JSON.parse(JSON.stringify(lista(esp2.efeitos))));
    }
    var substituidos = {};
    encs.forEach(function (id) { var e = IM.ENCANTO[id]; if (e && e.substitui) substituidos[e.substitui] = true; });
    encs.forEach(function (id) {
      var e = IM.ENCANTO[id];
      if (!e || substituidos[id]) return;
      out = out.concat(JSON.parse(JSON.stringify(lista(e.efeitos))));
      if (e.rdPorTipo) out.push({ t: "rd", valor: (base && base.categoria === "escudo") ? e.rdPorTipo.escudo : e.rdPorTipo.armadura, fonteRd: "item:" + it.id });
    });
    return out;
  };
  /* Bônus de arma por encantos (formidável/magnífica não se somam). */
  IM.bonusArma = function (it) {
    var encs = lista(it.encantos);
    var esp2 = IM.ITEM[it.magico];
    if (esp2) encs = encs.concat(lista(esp2.encantos));
    if (!encs.length) return null;
    var b = { ataque: 0, dano: 0, margem: 0, extras: [], critico: 0 };
    var substituidos = {};
    encs.forEach(function (id) { var e = IM.ENCANTO[id]; if (e && e.arma && e.arma.substitui) substituidos[e.arma.substitui] = true; });
    var maiorAtaque = 0, maiorDano = 0;
    encs.forEach(function (id) {
      var e = IM.ENCANTO[id];
      if (!e || !e.arma || substituidos[id]) return;
      maiorAtaque = Math.max(maiorAtaque, e.arma.ataque || 0);
      maiorDano = Math.max(maiorDano, e.arma.dano || 0);
      if (e.arma.extras) b.extras = b.extras.concat(e.arma.extras.map(function (x) { return { dados: x.dados, tipo: x.tipo, rotulo: e.nome }; }));
      if (e.arma.critico) b.critico = Math.max(b.critico, e.arma.critico);
      if (e.arma.margemDuplica) b.margemDuplica = true;
      if (e.arma.ignoraRD) b.ignoraRD = e.arma.ignoraRD;
      if (e.arma.tipo) b.tipo = e.arma.tipo;
    });
    b.ataque = maiorAtaque; b.dano = maiorDano;
    return b;
  };
  /* Bônus de Defesa de armadura ou escudo encantado (defensor +2,
     guardião +4; não somam). */
  IM.bonusDefesaDoItem = function (it) {
    var encs = lista(it.encantos);
    var esp2 = IM.ITEM[it.magico];
    if (esp2) encs = encs.concat(lista(esp2.encantos));
    var m = 0;
    encs.forEach(function (id) { var e = IM.ENCANTO[id]; if (e && e.defesa) m = Math.max(m, e.defesa); });
    return m;
  };
  /* Preço de um item com melhorias e encantos (p. 164 e 334). */
  IM.precoComEncantos = function (precoBase, nMelhorias, nEncantos) {
    var E = global.RAMATormenta20Equipamento;
    var pm = E && E.PRECO_MELHORIAS ? (E.PRECO_MELHORIAS[nMelhorias] || 0) : 0;
    return (Number(precoBase) || 0) + pm + (IM.PRECO_ENCANTOS[nEncantos] || 0);
  };

  /* ------------------------------------------------ gerador de tesouro */
  function naTabela(t, d) { for (var i = 0; i < t.length; i++) if (d <= t[i][0]) return t[i]; return t[t.length - 1]; }
  function rolarDados(rolar, expr) {
    var m = /^(\d+)d(\d+)(?:([+-]\d+))?(?:x([\d.]+))?$/.exec(String(expr).replace(/\s+/g, ""));
    if (!m) return Number(expr) || 0;
    var s = 0; for (var i = 0; i < Number(m[1]); i++) s += rolar("1d" + m[2]);
    s += Number(m[3] || 0);
    return s * Number(String(m[4] || "1").replace(/\./g, ""));
  }
  function riqueza(rolar, cat, bonus) {
    var d = Math.min(100, rolar("1d100") + (bonus || 0));
    var col = cat === "menor" ? 0 : (cat === "media" ? 1 : 2);
    var linha = null;
    for (var i = 0; i < IM.RIQUEZAS.length; i++) { var ate = IM.RIQUEZAS[i][col]; if (ate && d <= ate) { linha = IM.RIQUEZAS[i]; break; } }
    if (!linha) linha = IM.RIQUEZAS[IM.RIQUEZAS.length - 1];
    return { tipo: "riqueza", categoria: cat, valor: rolarDados(rolar, linha[3]), rolagem: d };
  }
  function itemPorTabela(t, rolar) { return naTabela(t, rolar("1d100"))[1]; }
  function tipoEquip(rolar, doisD) { var a = rolar("1d6"); var b = doisD ? rolar("1d6") : null; var escolha = b !== null ? [a, b] : [a]; var tipo = function (v) { return v <= 3 ? "arma" : (v <= 5 ? "armadura" : "esoterico"); }; return { opcoes: escolha.map(tipo), tipo: tipo(a) }; }
  function equipamento(rolar, tipo) { var t = tipo === "arma" ? IM.EQUIPAMENTO_ARMAS : (tipo === "armadura" ? IM.EQUIPAMENTO_ARMADURAS : IM.EQUIPAMENTO_ESOTERICOS); return itemPorTabela(t, rolar); }
  function superior(rolar, tipo, n) {
    var t = tipo === "arma" ? IM.SUPERIOR_ARMAS : (tipo === "armadura" ? IM.SUPERIOR_ARMADURAS : IM.SUPERIOR_ESOTERICOS);
    var mel = [], conta = 0, voltas = 0;
    while (conta < n && voltas < 40) {
      voltas++;
      var l = naTabela(t, rolar("1d100"));
      var peso = l[2] || 1;
      if (peso > n - conta || mel.indexOf(l[1]) >= 0) continue;
      var id = l[1];
      if (id === "material") { var mat = IM.MATERIAIS_D6[rolar("1d6") - 1]; mel.push("material:" + mat); }
      else mel.push(id);
      conta += peso;
    }
    return mel;
  }
  function pocao(rolar, bonus) { var d = Math.min(100, rolar("1d100") + (bonus || 0)); var l = naTabela(IM.POCOES, d); return { tipo: "pocao", magia: l[1], aprim: l[2], preco: l[3], nome: l[4], forma: l[5] || "pocao", rolagem: d }; }
  function magico(rolar, cat, doisD) {
    var a = rolar("1d6"), b = doisD ? rolar("1d6") : null;
    var tipoDe = function (v) { return v <= 2 ? "arma" : (v === 3 ? "armadura" : "acessorio"); };
    var tipo = tipoDe(a);
    var r = { tipo: "magico", categoria: cat, tipoItem: tipo, opcoesTipo: b !== null ? [tipoDe(a), tipoDe(b)] : null };
    if (tipo === "acessorio") {
      var ids = IM.ACESSORIOS[cat === "medio" ? "medio" : cat];
      var d = rolar("1d100");
      var achado = ids.filter(function (id) { return d <= IM.ITEM[id].ata; })[0] || ids[ids.length - 1];
      r.item = achado; r.nome = IM.ITEM[achado].nome; r.preco = IM.ITEM[achado].preco;
      return r;
    }
    var base = equipamento(rolar, tipo);
    var nEnc = IM.CATEGORIAS[cat].encantos, encs = [], voltas = 0, tabela = tipo === "arma" ? IM.ENCANTOS_ARMA : IM.ENCANTOS_ARMADURA, espec = null, soma = 0;
    while (soma < nEnc && voltas < 30) {
      voltas++;
      var dd = rolar("1d100");
      if (dd > 90) { var lista2 = tipo === "arma" ? IM.ARMAS_ESPECIFICAS : IM.ARMADURAS_ESPECIFICAS; var d2 = rolar("1d100"); espec = lista2.filter(function (id) { return d2 <= IM.ITEM[id].ata; })[0] || lista2[lista2.length - 1]; break; }
      var e = tabela.filter(function (x) { return dd <= x.ate; })[0];
      if (!e || encs.indexOf(e.id) >= 0) continue;
      if (e.valor > nEnc - soma) continue;
      if (tipo === "armadura" && e.escudo && base.indexOf("escudo") !== 0) continue;
      if (e.requer && encs.indexOf(e.requer) < 0) { if (e.valor + 1 > nEnc - soma) continue; encs.push(e.requer); soma += 1; }
      encs.push(e.id); soma += e.valor;
    }
    if (espec) { r.item = espec; r.nome = IM.ITEM[espec].nome; r.preco = IM.ITEM[espec].preco; return r; }
    r.base = base; r.encantos = encs;
    return r;
  }
  /* Rola o tesouro de uma criatura ou combate: ND, categoria (padrao,
     metade, dobro, nenhum). Devolve itens com tudo o que foi rolado. */
  IM.gerarTesouro = function (nd, categoria, rolar) {
    var cat = categoria || "padrao";
    var linha = IM.TESOURO[String(nd)];
    if (cat === "nenhum" || !linha) return { nd: String(nd), categoria: cat, itens: [], moedas: { tc: 0, ts: 0, to: 0 }, total: 0 };
    var vezes = cat === "dobro" ? 2 : 1;
    var res = { nd: String(nd), categoria: cat, itens: [], moedas: { tc: 0, ts: 0, to: 0 }, rolagens: [] };
    for (var v = 0; v < vezes; v++) {
      var dd = rolar("1d100"), ld = naTabela(linha.dinheiro, dd)[1];
      res.rolagens.push({ coluna: "dinheiro", d: dd, resultado: ld });
      var mais = /\+%/.test(ld) ? 20 : 0;
      var m;
      if ((m = /^(\d+d\d+(?:[+-]\d+)?)x([\d.]+) (TC|T\$|TO)/.exec(ld))) {
        var valor = rolarDados(rolar, m[1] + "x" + m[2]);
        if (cat === "metade") valor = Math.floor(valor / 2);
        if (m[3] === "TC") res.moedas.tc += valor; else if (m[3] === "TO") res.moedas.to += valor; else res.moedas.ts += valor;
      } else if ((m = /^(1|\d+d\d+(?:[+-]\d+)?) riquezas? (menor|média|maior)/.exec(ld))) {
        var n = /d/.test(m[1]) ? rolarDados(rolar, m[1]) : Number(m[1]);
        var cr = m[2] === "média" ? "media" : m[2];
        for (var i = 0; i < n; i++) { var rq = riqueza(rolar, cr, mais); if (cat === "metade") rq.valor = Math.floor(rq.valor / 2); res.itens.push(rq); }
      }
      var di = rolar("1d100"), li = naTabela(linha.itens, di)[1];
      res.rolagens.push({ coluna: "itens", d: di, resultado: li });
      var doisD = /2D/.test(li), maisI = /\+%/.test(li) ? 20 : 0;
      if (/^Diverso/.test(li)) res.itens.push({ tipo: "diverso", ref: itemPorTabela(IM.DIVERSOS, rolar) });
      else if (/^Equipamento/.test(li)) { var te = tipoEquip(rolar, doisD); res.itens.push({ tipo: "equipamento", tipoItem: te.tipo, opcoesTipo: te.opcoes.length > 1 ? te.opcoes : null, ref: equipamento(rolar, te.tipo) }); }
      else if ((m = /^(1|\d+d\d+(?:[+-]\d+)?) poç/.exec(li))) { var np = /d/.test(m[1]) ? rolarDados(rolar, m[1]) : 1; for (var j = 0; j < np; j++) res.itens.push(pocao(rolar, maisI)); }
      else if ((m = /^Superior \((\d)/.exec(li))) { var ts = tipoEquip(rolar, doisD); res.itens.push({ tipo: "superior", tipoItem: ts.tipo, opcoesTipo: ts.opcoes.length > 1 ? ts.opcoes : null, ref: equipamento(rolar, ts.tipo), melhorias: superior(rolar, ts.tipo, Number(m[1])) }); }
      else if ((m = /^Mágico \((menor|médio|maior)/.exec(li))) res.itens.push(magico(rolar, m[1] === "médio" ? "medio" : m[1], doisD));
    }
    res.total = res.moedas.ts + res.moedas.tc / 10 + res.moedas.to * 10 + res.itens.reduce(function (s, x) { return s + (x.valor || 0); }, 0);
    return res;
  };
  IM.rolarDados = rolarDados;
})(typeof window !== "undefined" ? window : globalThis);
