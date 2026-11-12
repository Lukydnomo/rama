/* =====================================================================
   R.A.M.A. — Tormenta20 · origens (p. 85–95)
   ---------------------------------------------------------------------
   Itens grátis e dois benefícios da lista (duas perícias, dois poderes
   ou um de cada); o poder único só para quem tem a origem. Poderes
   gerais citados estão em poderes.js; `qualquer: "combate"` é "um
   poder de combate a sua escolha". A origem própria (p. 95) é montada
   na criação, com aprovação do mestre.
   ===================================================================== */

(function (global) {
  "use strict";

  function o(id, nome, pagina, itens, pericias, poderes, unico, extra) {
    return Object.assign({ id: id, nome: nome, pagina: pagina, itens: itens, pericias: pericias, poderes: poderes, unico: unico, fonte: "T20" }, extra || {});
  }
  function u(id, nome, resumo, extra) { return Object.assign({ id: id, nome: nome, resumo: resumo, unico: true }, extra || {}); }

  var ORIGENS = [
    o("acolito", "Acólito", 85, ["Símbolo sagrado", "Traje de sacerdote"], ["cura", "religiao", "vontade"], ["medicina", "vontadeDeFerro"],
      u("membroDaIgreja", "Membro da Igreja", "Hospedagem confortável e informação em qualquer templo da sua divindade, para você e aliados.")),
    o("amigoDosAnimais", "Amigo dos Animais", 85, [{ escolha: ["Cão de caça", "Cavalo", "Pônei", "Trobo"] }], ["adestramento", "cavalgar"], [],
      u("amigoEspecial", "Amigo Especial", "+5 em Adestramento com animais; um animal de estimação parceiro dá +2 numa perícia (não Luta nem Pontaria) e não conta no limite de parceiros.",
        { efeitos: [{ t: "bonus", alvo: "pericia.adestramento", valor: 5, cond: "com animais" }], escolhas: [{ id: "pericia", tipo: "pericia", exceto: ["luta", "pontaria"], efeito: { t: "bonus", valor: 2, categoria: "parceiro" } }] })),
    o("amnesico", "Amnésico", 86, [{ texto: "Itens até T$ 500 aprovados pelo mestre (pista do passado)", ate: 500 }], [], [],
      u("lembrancasGraduais", "Lembranças Graduais", "Em momentos que o mestre decide, Sabedoria CD 10 para reconhecer pessoas, criaturas ou lugares de antes da perda de memória."),
      { especial: "mestre", resumoEspecial: "Em vez de escolher, recebe uma perícia e um poder escolhidos pelo mestre e o poder Lembranças Graduais." }),
    o("aristocrata", "Aristocrata", 86, ["Joia de família (T$ 300)", "Traje da corte"], ["diplomacia", "enganacao", "nobreza"], ["comandar"],
      u("sangueAzul", "Sangue Azul", "Influência política: leniência da guarda, audiência com o nobre local etc.")),
    o("artesao", "Artesão", 86, ["Instrumentos de ofício (qualquer)", { texto: "Um item que possa fabricar de até T$ 50", ate: 50 }], ["oficio", "vontade"], ["sortudo"],
      u("frutosDoTrabalho", "Frutos do Trabalho", "No início de cada aventura, até 5 itens gerais que possa fabricar, total até T$ 50 (100 veterano, 300 campeão, 500 lenda).",
        { inicioDeAventura: { itensFabricaveis: 5, valor: "patamar == 'lenda' ? 500 : patamar == 'campeao' ? 300 : patamar == 'veterano' ? 100 : 50" } })),
    o("artista", "Artista", 86, [{ escolha: ["Estojo de disfarces", "Instrumento musical"] }], ["atuacao", "enganacao"], ["atraente", "sortudo", "torcida"],
      u("domArtistico", "Dom Artístico", "+2 em Atuação e o dobro de tibares em apresentações.", { efeitos: [{ t: "bonus", alvo: "pericia.atuacao", valor: 2 }] })),
    o("assistenteDeLaboratorio", "Assistente de Laboratório", 87, ["Instrumentos de ofício (alquimista)"], ["oficio:alquimista", "misticismo"], ["veneficio"],
      u("esseCheiro", "Esse Cheiro...", "+2 em Fortitude; detecta a presença de itens alquímicos em alcance curto.", { efeitos: [{ t: "bonus", alvo: "pericia.fortitude", valor: 2 }] }),
      { qualquer: ["tormenta"] }),
    o("batedor", "Batedor", 88, ["Barraca", "Equipamento de viagem", { texto: "Uma arma simples ou marcial de ataque à distância", tipo: "arma", distancia: true }], ["furtividade", "percepcao", "sobrevivencia"], ["estiloDeDisparo", "sentidosAgucados"],
      u("aProvaDeTudo", "À Prova de Tudo", "Sem penalidade em deslocamento e Sobrevivência por clima ruim e terreno difícil natural.")),
    o("capanga", "Capanga", 88, [{ texto: "Tatuagem ou adereço da gangue (+1 em Intimidação)", efeitos: [{ t: "bonus", alvo: "pericia.intimidacao", valor: 1, categoria: "item" }] }, { texto: "Uma arma simples corpo a corpo", tipo: "arma", simples: true, corpo: true }], ["luta", "intimidacao"], [],
      u("confissao", "Confissão", "Usa Intimidação para interrogar sem custo e em uma hora."), { qualquer: ["combate"] }),
    o("charlatao", "Charlatão", 88, ["Estojo de disfarces", "Joia falsificada (aparenta T$ 100, sem valor)"], ["enganacao", "jogatina"], ["aparenciaInofensiva", "sortudo"],
      u("alpinistaSocial", "Alpinista Social", "Pode usar Enganação no lugar de Diplomacia.")),
    o("circense", "Circense", 89, [{ texto: "Três bolas de malabarismo (+1 em Atuação)", efeitos: [{ t: "bonus", alvo: "pericia.atuacao", valor: 1, categoria: "item" }] }], ["acrobacia", "atuacao", "reflexos"], ["acrobatico", "torcida"],
      u("truqueDeMagica", "Truque de Mágica", "Lança Explosão de Chamas, Hipnotismo e Queda Suave só com o aprimoramento Truque; não é mágico (prestidigitação).",
        { efeitos: [{ t: "magia", id: "explosaoDeChamas", soTruque: true, naoMagica: true }, { t: "magia", id: "hipnotismo", soTruque: true, naoMagica: true }, { t: "magia", id: "quedaSuave", soTruque: true, naoMagica: true }] })),
    o("criminoso", "Criminoso", 89, [{ escolha: ["Estojo de disfarces", "Gazua"] }], ["enganacao", "furtividade", "ladinagem"], ["veneficio"],
      u("punguista", "Punguista", "Usa Ladinagem para sustento em um dia; passando, o dobro do dinheiro; falhando, problemas com a lei.")),
    o("curandeiro", "Curandeiro", 89, ["Bálsamo restaurador ×2", "Maleta de medicamentos"], ["cura", "vontade"], ["medicina", "veneficio"],
      u("medicoDeCampo", "Médico de Campo", "Soma a Sabedoria aos PV curados por suas habilidades e itens mundanos de cura.", { efeitos: [{ t: "curaMundana", valor: "atr.sab" }] })),
    o("eremita", "Eremita", 89, ["Barraca", "Equipamento de viagem"], ["misticismo", "religiao", "sobrevivencia"], ["loboSolitario"],
      u("buscaInterior", "Busca Interior", "Diante de um mistério sem saída, 1 PM para meditar e receber uma dica do mestre.")),
    o("escravo", "Escravo", 89, ["Algemas", { texto: "Ferramenta pesada (como maça)", comoArma: "maca" }], ["atletismo", "fortitude", "furtividade"], ["vitalidade"],
      u("desejoDeLiberdade", "Desejo de Liberdade", "+5 contra a manobra agarrar e efeitos de movimento.", { efeitos: [{ t: "bonus", alvo: "resist.agarrar", valor: 5 }, { t: "bonus", alvo: "resist.movimento", valor: 5 }] })),
    o("estudioso", "Estudioso", 90, [{ texto: "Coleção de livros (+1 em Conhecimento, Guerra, Misticismo ou Nobreza)", escolhaBonus: ["conhecimento", "guerra", "misticismo", "nobreza"], valor: 1 }], ["conhecimento", "guerra", "misticismo"], ["aparenciaInofensiva"],
      u("palpiteFundamentado", "Palpite Fundamentado", "2 PM: troca um teste de perícia de Inteligência ou Sabedoria por Conhecimento.", { opcaoDeTeste: { id: "palpite", custo: 2, usaPericia: "conhecimento", atributos: ["int", "sab"] } })),
    o("fazendeiro", "Fazendeiro", 90, ["Carroça", { texto: "Ferramenta agrícola (como lança)", comoArma: "lanca" }, "10 rações de viagem", "Um animal não combativo"], ["adestramento", "cavalgar", "oficio:fazendeiro", "sobrevivencia"], ["ginete"],
      u("aguaNoFeijao", "Água no Feijão", "Sem a penalidade de –5 nem matéria-prima extra para fazer pratos para cinco pessoas.")),
    o("forasteiro", "Forasteiro", 90, ["Equipamento de viagem", { texto: "Instrumento musical exótico (+1 numa perícia de Carisma aprovada pelo mestre)", escolhaBonus: ["adestramento", "atuacao", "diplomacia", "enganacao", "intimidacao", "jogatina"], valor: 1 }, "Traje estrangeiro"], ["cavalgar", "pilotagem", "sobrevivencia"], ["loboSolitario"],
      u("culturaExotica", "Cultura Exótica", "1 PM: faz um teste de perícia somente treinada sem ser treinado.", { opcaoDeTeste: { id: "culturaExotica", custo: 1, permiteSemTreino: true } })),
    o("gladiador", "Gladiador", 90, [{ texto: "Uma arma marcial ou exótica", tipo: "arma", marcialOuExotica: true }, "Um item sem valor de um admirador"], ["atuacao", "luta"], ["atraente", "torcida"],
      u("paoECirco", "Pão e Circo", "Causa dano não letal sem a penalidade de –5."), { qualquer: ["combate"] }),
    o("guarda", "Guarda", 91, ["Apito", "Insígnia da milícia", { texto: "Uma arma marcial", tipo: "arma", marcial: true }], ["investigacao", "luta", "percepcao"], ["investigador"],
      u("detetive", "Detetive", "1 PM: troca Percepção e Intuição por Investigação até o fim da cena."), { qualquer: ["combate"] }),
    o("herdeiro", "Herdeiro", 91, ["Símbolo da herança (anel de sinete, manto cerimonial…)"], ["misticismo", "nobreza", "oficio"], ["comandar"],
      u("heranca", "Herança", "Herdou um item de até T$ 1.000; escolhido duas vezes, até T$ 2.000.", { itemInicial: { ate: 1000, duasVezes: 2000 }, repetivel: 2 })),
    o("heroiCampones", "Herói Camponês", 91, [{ escolha: ["Instrumentos de ofício", "Uma arma simples"] }, "Traje de plebeu"], ["adestramento", "oficio"], ["sortudo", "surtoHeroico", "torcida"],
      u("coracaoHeroico", "Coração Heroico", "+3 PM; +3 PM a cada novo patamar (5º, 11º e 17º níveis).", { efeitos: [{ t: "bonus", alvo: "pm", valor: "3 * (1 + (nivel >= 5 ? 1 : 0) + (nivel >= 11 ? 1 : 0) + (nivel >= 17 ? 1 : 0))" }] })),
    o("marujo", "Marujo", 92, [{ texto: "T$ 2d6 (último salário)", dinheiro: "2d6" }, "Corda"], ["atletismo", "jogatina", "pilotagem"], ["acrobatico"],
      u("passagemDeNavio", "Passagem de Navio", "Transporte marítimo sem custo para você e aliados, pagando com trabalho (um teste adequado na viagem).")),
    o("mateiro", "Mateiro", 92, ["Arco curto", "Barraca", "Equipamento de viagem", "20 flechas"], ["atletismo", "furtividade", "sobrevivencia"], ["loboSolitario", "sentidosAgucados"],
      u("vendedorDeCarcacas", "Vendedor de Carcaças", "Extrai recursos de criaturas em um minuto (em vez de uma hora) e com +5 no teste.")),
    o("membroDeGuilda", "Membro de Guilda", 92, [{ escolha: ["Gazua", "Instrumentos de ofício"] }], ["diplomacia", "enganacao", "misticismo", "oficio"], ["focoEmPericia"],
      u("redeDeContatos", "Rede de Contatos", "Usa Diplomacia para interrogar sem custo e em uma hora.")),
    o("mercador", "Mercador", 93, ["Carroça", "Trobo", "Mercadorias para vender (T$ 100)"], ["diplomacia", "intuicao", "oficio"], ["proficiencia", "sortudo"],
      u("negociacao", "Negociação", "Vende itens 10% mais caro (não cumulativo com barganha).", { efeitos: [{ t: "vendaBonus", valor: 0.1 }] })),
    o("minerador", "Minerador", 93, ["Gemas preciosas (T$ 100)", "Picareta"], ["atletismo", "fortitude", "oficio:minerador"], ["ataquePoderoso", "sentidosAgucados"],
      u("escavador", "Escavador", "Proficiente em picaretas, +1 de dano com elas; ignora terreno difícil em masmorras e subterrâneos.", { efeitos: [{ t: "profArma", armas: ["picareta"] }, { t: "bonus", alvo: "dano", valor: 1, armas: ["picareta"] }] })),
    o("nomade", "Nômade", 93, ["Bordão", "Equipamento de viagem"], ["cavalgar", "pilotagem", "sobrevivencia"], ["loboSolitario", "sentidosAgucados"],
      u("mochileiro", "Mochileiro", "+5 espaços no limite de carga.", { efeitos: [{ t: "bonus", alvo: "carga", valor: 5 }] })),
    o("pivete", "Pivete", 93, ["Gazua", "Traje de plebeu", "Um animal urbano"], ["furtividade", "iniciativa", "ladinagem"], ["acrobatico", "aparenciaInofensiva"],
      u("quebraGalho", "Quebra-Galho", "Em cidades, compra itens mundanos não superiores pela metade (não matéria-prima, não revendíveis).")),
    o("refugiado", "Refugiado", 93, [{ texto: "Um item estrangeiro de até T$ 100", ate: 100 }], ["fortitude", "reflexos", "vontade"], ["vontadeDeFerro"],
      u("estoico", "Estoico", "Condição de descanso uma categoria acima do padrão.", { efeitos: [{ t: "descansoMelhor", valor: 1 }] })),
    o("seguidor", "Seguidor", 94, [{ texto: "Um item do antigo mestre de até T$ 100", ate: 100 }], ["adestramento", "oficio"], ["proficiencia", "surtoHeroico"],
      u("antigoMestre", "Antigo Mestre", "Uma vez por aventura, o herói que você servia ajuda por uma cena: parceiro mestre de um tipo escolhido ao obter o poder, fora do limite.", { escolhas: [{ id: "tipo", tipo: "tipoParceiro" }] })),
    o("selvagem", "Selvagem", 94, [{ texto: "Uma arma simples", tipo: "arma", simples: true }, "Um pequeno animal de estimação"], ["percepcao", "reflexos", "sobrevivencia"], ["loboSolitario", "vitalidade"],
      u("vidaRustica", "Vida Rústica", "Imune a efeitos prejudiciais de itens ingeríveis; ao relento, recuperação de PV e PM nunca menor que o nível.", { efeitos: [{ t: "recuperacaoMinima", valor: "nivel" }] })),
    o("soldado", "Soldado", 94, [{ texto: "Uma arma marcial", tipo: "arma", marcial: true }, "Uniforme militar", "Insígnia do exército"], ["fortitude", "guerra", "luta", "pontaria"], [],
      u("influenciaMilitar", "Influência Militar", "Hospedagem e informação para você e aliados em acampamentos e bases militares."), { qualquer: ["combate"] }),
    o("taverneiro", "Taverneiro", 94, [{ texto: "Rolo de macarrão ou martelo de carne (como clava)", comoArma: "clava" }, "Panela", "Avental", "Caneca", "Pano sujo"], ["diplomacia", "jogatina", "oficio:cozinheiro"], ["proficiencia", "vitalidade"],
      u("gororoba", "Gororoba", "Sem a penalidade de –5 para fazer um prato especial adicional.")),
    o("trabalhador", "Trabalhador", 95, [{ texto: "Ferramenta pesada (como maça ou lança)", comoArma: ["maca", "lanca"] }], ["atletismo", "fortitude"], ["atletico"],
      u("esforcado", "Esforçado", "+2 em todos os testes de perícia estendidos (inclusive perigos complexos).", { efeitos: [{ t: "bonus", alvo: "pericias", valor: 2, cond: "em testes estendidos" }] })),
  ];

  var ORIGEM = {};
  ORIGENS.forEach(function (x) { ORIGEM[x.id] = x; });
  var BENEFICIOS = 2;
  var PROPRIA = {
    pagina: 95,
    resumo: "Ajuste uma origem (trocar uma perícia, os itens, um poder) ou crie uma nova com o mestre: até dois benefícios entre perícias, poderes e um poder único inventado na medida dos outros.",
  };

  global.RAMATormenta20Origens = { ORIGENS: ORIGENS, ORIGEM: ORIGEM, BENEFICIOS: BENEFICIOS, PROPRIA: PROPRIA };
})(typeof window !== "undefined" ? window : globalThis);
