/* =====================================================================
   R.A.M.A. — Ordem Paranormal · poderes e habilidades
   =====================================================================
   O catálogo do que a progressão ENTREGA: habilidades automáticas de
   classe, poderes de classe, poderes gerais, poderes paranormais e as
   habilidades de cada trilha.

   Separado de catalogo.js porque é outro tipo de dado. catalogo.js diz
   o que um personagem É (atributos, classes, origens); este arquivo
   diz o que ele pode GANHAR ao subir de NEX.

   ---------------------------------------------------------------------
   FONTES E TEXTOS
   ---------------------------------------------------------------------

     OPRPG  Ordem Paranormal RPG — Livro de Regras, v1.1
     SAH    Sobrevivendo ao Horror, v1.2

   Páginas do LIVRO, não do PDF. Os resumos são próprios e curtos, para
   lembrar do que se trata na hora do jogo. O texto integral está nos
   livros, e quem joga precisa deles.

   ---------------------------------------------------------------------
   TRÊS TIPOS DE BENEFÍCIO
   ---------------------------------------------------------------------

     automático       a progressão concede sem perguntar nada
                      (Ataque Especial, os poderes da trilha escolhida)
     escolhido        a progressão abre uma vaga, e quem joga escolhe
                      o que entra nela (poder de classe, aumento de
                      atributo, grau de treinamento)
     com opções       o benefício só fica completo depois de uma
                      decisão interna (A Favorita pede a arma; Resistir
                      a Elemento pede o elemento)

   Um benefício automático NUNCA vira pendência. Um com opções vira
   pendência só enquanto a opção estiver em branco.

   ---------------------------------------------------------------------
   O QUE `automacao` DIZ
   ---------------------------------------------------------------------

     "calculo"     todo o efeito mecânico entra na conta da ficha
     "parcial"     uma parte entra na conta; o resto é anotação
     "informacao"  o efeito depende de gastar PE, de uma cena, de uma
                   rolagem específica ou de decisão do mestre. A ficha
                   mostra o texto e quem joga aplica na hora

   ---------------------------------------------------------------------
   REQUISITOS
   ---------------------------------------------------------------------

   Cada requisito é um objeto com `tipo`, avaliado por progressao.js no
   estado do personagem NA ETAPA em que a escolha foi feita:

     atributo        { atributo, minimo }
     treinado        { pericia }             treinado ou acima
     treinadoEmUma   { pericias: [...] }     ao menos uma delas
     nex             { minimo }              no trilho de progressão
     poder           { poder }               ter o poder
     poderElemento   { poder }               ter o poder no MESMO
                                             elemento escolhido aqui
     elemento        { elemento, quantidade }  N poderes paranormais
     treinadoNaOpcao { opcao }               treinado na perícia
                                             escolhida nesta opção
     semRegra        { regra, motivo }       a regra opcional desligada
   ===================================================================== */

(function (global) {
  "use strict";

  var OPRPG = "OPRPG";
  var SAH = "SAH";

  /* ------------------------------------------------------------------
     Atalhos de montagem. Existem só para a lista abaixo caber na tela.
     ------------------------------------------------------------------ */

  var req = {
    atr: function (a, n) { return { tipo: "atributo", atributo: a, minimo: n }; },
    trein: function (p) { return { tipo: "treinado", pericia: p }; },
    treinUma: function (lista) { return { tipo: "treinadoEmUma", pericias: lista }; },
    nex: function (n) { return { tipo: "nex", minimo: n }; },
    poder: function (k) { return { tipo: "poder", poder: k }; },
    elem: function (e, n) { return { tipo: "elemento", elemento: e, quantidade: n }; },
  };

  var ef = {
    defesa: function (v) { return { tipo: "defesa", valor: v }; },
    resTestes: function (v) { return { tipo: "resistenciaTestes", valor: v }; },
    prof: function (t) { return { tipo: "proficiencia", texto: t }; },
    pericia: function (lista, v) { return { tipo: "bonusPericia", pericias: lista, valor: v }; },
    treinarOuBonus: function (p) { return { tipo: "treinarOuBonus", pericia: p, bonus: 2 }; },
    desloc: function (v) { return { tipo: "deslocamento", valor: v }; },
    carga: function (v) { return { tipo: "capacidade", valor: v }; },
  };

  /* Uma entrada do catálogo. Os campos que faltam ganham o padrão. */
  function entrada(d) {
    return {
      chave: d.chave,
      nome: d.nome,
      tipo: d.tipo,
      classes: d.classes || [],
      trilha: d.trilha || "",
      nex: d.nex || 0,
      elemento: d.elemento || "",
      fonte: d.fonte || OPRPG,
      pagina: d.pagina || 0,
      paginas: d.paginas || null,
      geral: d.geral || null,
      resumo: d.resumo || "",
      afinidade: d.afinidade || "",
      requisitos: d.requisitos || [],
      repetivel: !!d.repetivel,
      repeticaoPorOpcao: d.repeticaoPorOpcao || "",
      opcoes: d.opcoes || [],
      efeitos: d.efeitos || [],
      efeitosAfinidade: d.efeitosAfinidade || [],
      automacao: d.automacao || "informacao",
      nota: d.nota || "",
    };
  }

  /* =================================================================
     PODERES DE CLASSE — OPRPG p.25-26, p.29-30, p.33-34
     ================================================================= */

  var TODAS = ["combatente", "especialista", "ocultista"];

  var PODERES_CLASSE = [
    /* --- combatente --- */
    entrada({ chave: "armamentoPesado", nome: "Armamento Pesado", tipo: "classe", classes: ["combatente"], pagina: 25,
      resumo: "Proficiência com armas pesadas.",
      requisitos: [req.atr("for", 2)], efeitos: [ef.prof("Armas pesadas")], automacao: "calculo" }),

    entrada({ chave: "artistaMarcial", nome: "Artista Marcial", tipo: "classe", classes: ["combatente", "especialista"],
      pagina: 25, paginas: { combatente: 25, especialista: 29 }, geral: { fonte: SAH, pagina: 33 },
      resumo: "Ataques desarmados causam 1d6 de dano letal e contam como armas ágeis. O dado sobe para 1d8 em NEX 35% e 1d10 em NEX 70%." }),

    entrada({ chave: "ataqueDeOportunidade", nome: "Ataque de Oportunidade", tipo: "classe", classes: ["combatente"], pagina: 25,
      resumo: "Quando um ser sai por vontade própria de um espaço adjacente, gaste uma reação e 1 PE para atacá-lo corpo a corpo." }),

    entrada({ chave: "combaterComDuasArmas", nome: "Combater com Duas Armas", tipo: "classe", classes: ["combatente"], pagina: 25,
      geral: { fonte: SAH, pagina: 33 },
      resumo: "Com duas armas, uma delas leve, a ação agredir faz um ataque com cada — com –1 dado nos ataques até o próximo turno.",
      requisitos: [req.atr("agi", 3), req.treinUma(["luta", "pontaria"])] }),

    entrada({ chave: "combateDefensivo", nome: "Combate Defensivo", tipo: "classe", classes: ["combatente"], pagina: 25,
      resumo: "Ao agredir, pode lutar na defensiva: –1 dado nos ataques e +5 na Defesa até o próximo turno.",
      requisitos: [req.atr("int", 2)] }),

    entrada({ chave: "golpeDemolidor", nome: "Golpe Demolidor", tipo: "classe", classes: ["combatente"], pagina: 25,
      resumo: "Ao quebrar ou atacar um objeto, gaste 1 PE para somar dois dados de dano do tipo da arma.",
      requisitos: [req.atr("for", 2), req.trein("luta")] }),

    entrada({ chave: "golpePesado", nome: "Golpe Pesado", tipo: "classe", classes: ["combatente"], pagina: 25,
      resumo: "O dano das suas armas corpo a corpo ganha mais um dado do mesmo tipo." }),

    entrada({ chave: "incansavel", nome: "Incansável", tipo: "classe", classes: ["combatente"], pagina: 25,
      resumo: "Uma vez por cena, gaste 2 PE para uma ação de investigação a mais, usando Força ou Agilidade como atributo-base." }),

    entrada({ chave: "prestezaAtletica", nome: "Presteza Atlética", tipo: "classe", classes: ["combatente"], pagina: 25,
      resumo: "Ao facilitar a investigação, gaste 1 PE para usar Força ou Agilidade no teste. Se passar, o próximo aliado que usar o bônus ganha +1 dado." }),

    entrada({ chave: "protecaoPesada", nome: "Proteção Pesada", tipo: "classe", classes: ["combatente"], pagina: 25,
      resumo: "Proficiência com proteções pesadas.",
      requisitos: [req.nex(30)], efeitos: [ef.prof("Proteções pesadas")], automacao: "calculo" }),

    entrada({ chave: "reflexosDefensivos", nome: "Reflexos Defensivos", tipo: "classe", classes: ["combatente"], pagina: 25,
      resumo: "+2 em Defesa e em testes de resistência.",
      requisitos: [req.atr("agi", 2)], efeitos: [ef.defesa(2), ef.resTestes(2)], automacao: "calculo" }),

    entrada({ chave: "saqueRapido", nome: "Saque Rápido", tipo: "classe", classes: ["combatente"], pagina: 25,
      geral: { fonte: SAH, pagina: 33 },
      resumo: "Saca ou guarda itens como ação livre. Com a regra de munição, uma vez por rodada recarrega uma arma de disparo como ação livre.",
      requisitos: [req.trein("iniciativa")] }),

    entrada({ chave: "segurarOGatilho", nome: "Segurar o Gatilho", tipo: "classe", classes: ["combatente"], pagina: 25,
      resumo: "Ao acertar com arma de fogo, ataca de novo o mesmo alvo pagando 2 PE por ataque já feito no turno, até errar ou atingir o limite de PE.",
      requisitos: [req.nex(60)] }),

    entrada({ chave: "sentidoTatico", nome: "Sentido Tático", tipo: "classe", classes: ["combatente"], pagina: 26,
      resumo: "Ação de movimento e 2 PE: até o fim da cena, bônus igual ao Intelecto em Defesa e em testes de resistência.",
      requisitos: [req.atr("int", 2), req.trein("percepcao"), req.trein("tatica")] }),

    entrada({ chave: "tanqueDeGuerra", nome: "Tanque de Guerra", tipo: "classe", classes: ["combatente"], pagina: 26,
      resumo: "Vestindo proteção pesada, a Defesa e a resistência a dano que ela dá aumentam em +2.",
      requisitos: [req.poder("protecaoPesada")] }),

    entrada({ chave: "tiroCerteiro", nome: "Tiro Certeiro", tipo: "classe", classes: ["combatente"], pagina: 26,
      geral: { fonte: SAH, pagina: 33 },
      resumo: "Com arma de disparo, soma a Agilidade ao dano e ignora a penalidade contra alvos em corpo a corpo.",
      requisitos: [req.trein("pontaria")] }),

    entrada({ chave: "tiroDeCobertura", nome: "Tiro de Cobertura", tipo: "classe", classes: ["combatente"], pagina: 26,
      resumo: "Ação padrão e 1 PE: Pontaria contra a Vontade do alvo. Se vencer, ele não sai do lugar e sofre –5 em ataques até o seu próximo turno." }),

    /* --- os três --- */
    entrada({ chave: "transcender", nome: "Transcender", tipo: "classe", classes: TODAS,
      pagina: 26, paginas: { combatente: 26, especialista: 30, ocultista: 34 },
      resumo: "Recebe um poder paranormal à escolha, mas não ganha a Sanidade deste aumento de NEX. Pode ser escolhido várias vezes.",
      repetivel: true,
      requisitos: [{ tipo: "semRegra", regra: "nexExperiencia",
        motivo: "Com NEX & Experiência, Transcender deixa de ser poder de classe: ele é recebido nos valores de NEX de exposição (Sobrevivendo ao Horror, p. 98)." }],
      opcoes: [{ chave: "poder", tipo: "poderParanormal", rotulo: "Poder paranormal" }],
      automacao: "calculo" }),

    entrada({ chave: "treinamentoEmPericia", nome: "Treinamento em Perícia", tipo: "classe", classes: TODAS,
      pagina: 26, paginas: { combatente: 26, especialista: 30, ocultista: 34 },
      resumo: "Escolha duas perícias e fique treinado nelas. A partir de NEX 35% pode subir uma treinada para veterano; a partir de NEX 70%, uma veterana para expert. Pode ser escolhido várias vezes.",
      repetivel: true,
      opcoes: [{ chave: "pericias", tipo: "pericias", quantidade: 2, modo: "treinamento", rotulo: "Duas perícias" }],
      efeitos: [{ tipo: "grauPericias", opcao: "pericias", modo: "treinamento" }],
      automacao: "calculo" }),

    /* --- especialista --- */
    entrada({ chave: "balisticaAvancada", nome: "Balística Avançada", tipo: "classe", classes: ["especialista"], pagina: 29,
      resumo: "Proficiência com armas táticas de fogo e +2 nas rolagens de dano com elas.",
      efeitos: [ef.prof("Armas táticas de fogo")], automacao: "parcial",
      nota: "A proficiência entra na ficha. O +2 no dano vale só para essas armas e é aplicado na rolagem." }),

    entrada({ chave: "conhecimentoAplicado", nome: "Conhecimento Aplicado", tipo: "classe", classes: ["especialista"], pagina: 29,
      resumo: "Em teste de perícia (exceto Luta e Pontaria), gaste 2 PE para usar Intelecto como atributo-base.",
      requisitos: [req.atr("int", 2)] }),

    entrada({ chave: "hacker", nome: "Hacker", tipo: "classe", classes: ["especialista"], pagina: 29,
      resumo: "+5 em Tecnologia para invadir sistemas, e hackear leva só uma ação completa.",
      requisitos: [req.trein("tecnologia")] }),

    entrada({ chave: "maosRapidas", nome: "Mãos Rápidas", tipo: "classe", classes: ["especialista"], pagina: 29,
      resumo: "Pague 1 PE para fazer um teste de Crime como ação livre.",
      requisitos: [req.atr("agi", 3), req.trein("crime")] }),

    entrada({ chave: "mochilaDeUtilidades", nome: "Mochila de Utilidades", tipo: "classe", classes: ["especialista"], pagina: 29,
      resumo: "Um item à escolha, exceto armas, conta como uma categoria abaixo e ocupa 1 espaço a menos.",
      opcoes: [{ chave: "item", tipo: "item", excetoArmas: true, rotulo: "Item do inventário" }],
      efeitos: [{ tipo: "categoriaItem", opcao: "item", reducao: 1 }, { tipo: "espacoItem", opcao: "item", reducao: 1 }],
      automacao: "calculo" }),

    entrada({ chave: "movimentoTatico", nome: "Movimento Tático", tipo: "classe", classes: ["especialista"], pagina: 29,
      resumo: "Gaste 1 PE para ignorar a penalidade de deslocamento por terreno difícil e por escalar até o fim do turno.",
      requisitos: [req.trein("atletismo")] }),

    entrada({ chave: "naTrilhaCerta", nome: "Na Trilha Certa", tipo: "classe", classes: ["especialista"], pagina: 29,
      resumo: "Depois de achar uma pista, gaste 1 PE para +1 dado no próximo teste. Custo e bônus acumulam a cada sucesso seguido." }),

    entrada({ chave: "nerd", nome: "Nerd", tipo: "classe", classes: ["especialista"], pagina: 29,
      resumo: "Uma vez por cena, 2 PE e Atualidades (DT 20) para receber uma informação útil sobre a cena." }),

    entrada({ chave: "ninjaUrbano", nome: "Ninja Urbano", tipo: "classe", classes: ["especialista"], pagina: 29,
      resumo: "Proficiência com armas táticas corpo a corpo e de disparo (exceto de fogo) e +2 no dano com elas.",
      efeitos: [ef.prof("Armas táticas corpo a corpo e de disparo (exceto de fogo)")], automacao: "parcial",
      nota: "A proficiência entra na ficha. O +2 no dano é aplicado na rolagem." }),

    entrada({ chave: "pensamentoAgil", nome: "Pensamento Ágil", tipo: "classe", classes: ["especialista"], pagina: 30,
      resumo: "Uma vez por rodada, em cena de investigação, gaste 2 PE para procurar pistas mais uma vez." }),

    entrada({ chave: "peritoEmExplosivos", nome: "Perito em Explosivos", tipo: "classe", classes: ["especialista"], pagina: 30,
      resumo: "Soma o Intelecto na DT dos seus explosivos e pode deixar fora da explosão tantos alvos quanto o seu Intelecto." }),

    entrada({ chave: "primeiraImpressao", nome: "Primeira Impressão", tipo: "classe", classes: ["especialista"], pagina: 30,
      resumo: "+2 dados no primeiro teste de Diplomacia, Enganação, Intimidação ou Intuição de cada cena." }),

    /* --- ocultista --- */
    entrada({ chave: "camuflarOcultismo", nome: "Camuflar Ocultismo", tipo: "classe", classes: ["ocultista"], pagina: 33,
      resumo: "Esconde símbolos desenhados com uma ação livre. Por +2 PE, conjura sem componentes nem gestos; perceber exige Ocultismo DT 25." }),

    entrada({ chave: "criarSelo", nome: "Criar Selo", tipo: "classe", classes: ["ocultista"], pagina: 33,
      resumo: "Fabrica selos dos rituais que conhece, com uma ação de interlúdio e o custo do ritual em PE. Máximo de selos igual à Presença." }),

    entrada({ chave: "envoltoEmMisterio", nome: "Envolto em Mistério", tipo: "classe", classes: ["ocultista"], pagina: 33,
      resumo: "Em geral, +5 em Enganação e Intimidação contra pessoas não treinadas em Ocultismo, a critério do mestre." }),

    entrada({ chave: "especialistaEmElemento", nome: "Especialista em Elemento", tipo: "classe", classes: ["ocultista"], pagina: 33,
      resumo: "Escolha um elemento: a DT para resistir aos seus rituais dele aumenta em +2.",
      opcoes: [{ chave: "elemento", tipo: "elemento", comMedo: true, rotulo: "Elemento" }] }),

    entrada({ chave: "ferramentasParanormais", nome: "Ferramentas Paranormais", tipo: "classe", classes: ["ocultista"], pagina: 33,
      resumo: "Reduz em I a categoria de um item paranormal e ativa itens paranormais sem pagar o custo em PE.",
      opcoes: [{ chave: "item", tipo: "item", grupo: "paranormal", rotulo: "Item paranormal do inventário" }],
      efeitos: [{ tipo: "categoriaItem", opcao: "item", reducao: 1 }], automacao: "parcial",
      nota: "A redução de categoria entra na conta do inventário. Ativar sem pagar PE é aplicado na hora." }),

    entrada({ chave: "fluxoDePoder", nome: "Fluxo de Poder", tipo: "classe", classes: ["ocultista"], pagina: 33,
      resumo: "Mantém dois efeitos sustentados de rituais com uma única ação livre, pagando cada um separadamente.",
      requisitos: [req.nex(60)] }),

    entrada({ chave: "guiadoPeloParanormal", nome: "Guiado pelo Paranormal", tipo: "classe", classes: ["ocultista"], pagina: 34,
      resumo: "Uma vez por cena, gaste 2 PE para uma ação de investigação a mais." }),

    entrada({ chave: "identificacaoParanormal", nome: "Identificação Paranormal", tipo: "classe", classes: ["ocultista"], pagina: 34,
      resumo: "+10 em Ocultismo para identificar criaturas, objetos ou rituais." }),

    entrada({ chave: "improvisarComponentes", nome: "Improvisar Componentes", tipo: "classe", classes: ["ocultista"], pagina: 34,
      resumo: "Uma vez por cena, ação completa e Investigação DT 15 para achar componentes ritualísticos de um elemento, se o mestre permitir." }),

    entrada({ chave: "intuicaoParanormal", nome: "Intuição Paranormal", tipo: "classe", classes: ["ocultista"], pagina: 34,
      resumo: "Ao facilitar a investigação, soma Intelecto ou Presença no teste." }),

    entrada({ chave: "mestreEmElemento", nome: "Mestre em Elemento", tipo: "classe", classes: ["ocultista"], pagina: 34,
      resumo: "Rituais do elemento escolhido custam –1 PE.",
      requisitos: [{ tipo: "poderElemento", poder: "especialistaEmElemento" }, req.nex(45)],
      opcoes: [{ chave: "elemento", tipo: "elemento", comMedo: true, rotulo: "Elemento" }] }),

    entrada({ chave: "ritualPotente", nome: "Ritual Potente", tipo: "classe", classes: ["ocultista"], pagina: 34,
      resumo: "Soma o Intelecto nas rolagens de dano e nos efeitos de cura dos seus rituais.",
      requisitos: [req.atr("int", 2)] }),

    entrada({ chave: "ritualPredileto", nome: "Ritual Predileto", tipo: "classe", classes: ["ocultista"], pagina: 34,
      resumo: "Escolha um ritual que conhece: ele custa –1 PE, acumulando com outras reduções.",
      opcoes: [{ chave: "ritual", tipo: "ritual", rotulo: "Ritual" }] }),

    entrada({ chave: "tatuagemRitualistica", nome: "Tatuagem Ritualística", tipo: "classe", classes: ["ocultista"], pagina: 34,
      resumo: "Rituais de alcance pessoal que têm você como alvo custam –1 PE." }),

    /* =================================================================
       SOBREVIVENDO AO HORROR — novos poderes de classe
       (p.14-15, p.22-23, p.26-27)
       ================================================================= */

    entrada({ chave: "apegoAngustiado", nome: "Apego Angustiado", tipo: "classe", classes: ["combatente"], fonte: SAH, pagina: 14,
      resumo: "Não desmaia por estar morrendo; cada rodada terminada consciente nessa condição custa 2 de Sanidade." }),
    entrada({ chave: "caminhoParaForca", nome: "Caminho para Forca", tipo: "classe", classes: ["combatente"], fonte: SAH, pagina: 14,
      resumo: "1 PE amplia o sacrifício numa perseguição (+1 dado extra para os outros) ou o chamar atenção numa cena furtiva (–2 de visibilidade dos aliados)." }),
    entrada({ chave: "cienteDasCicatrizes", nome: "Ciente das Cicatrizes", tipo: "classe", classes: ["combatente"], fonte: SAH, pagina: 14,
      resumo: "Em pistas ligadas a armas ou ferimentos, pode usar Luta ou Pontaria no lugar da perícia original.",
      requisitos: [req.treinUma(["luta", "pontaria"])] }),
    entrada({ chave: "correriaDesesperada", nome: "Correria Desesperada", tipo: "classe", classes: ["combatente"], fonte: SAH, pagina: 14,
      resumo: "+3m de deslocamento e +1 dado nos testes para fugir numa perseguição.",
      efeitos: [ef.desloc(3)], automacao: "parcial",
      nota: "O deslocamento entra na conta. O dado na perseguição é aplicado na cena." }),
    entrada({ chave: "engolirOChoro", nome: "Engolir o Choro", tipo: "classe", classes: ["combatente"], fonte: SAH, pagina: 14,
      resumo: "Condições não impõem penalidade nos testes para fugir nem em Furtividade." }),
    entrada({ chave: "instintoDeFuga", nome: "Instinto de Fuga", tipo: "classe", classes: ["combatente"], fonte: SAH, pagina: 14,
      resumo: "Quando começa uma perseguição, +2 em todos os testes de perícia até o fim da cena.",
      requisitos: [req.trein("intuicao")] }),
    entrada({ chave: "mochileiro", nome: "Mochileiro", tipo: "classe", classes: ["combatente"], fonte: SAH, pagina: 14,
      resumo: "O limite de carga aumenta em 5 espaços e pode aproveitar uma vestimenta a mais.",
      requisitos: [req.atr("vig", 2)], efeitos: [ef.carga(5)], automacao: "parcial",
      nota: "Os 5 espaços entram na capacidade. A vestimenta a mais é anotação." }),
    entrada({ chave: "paranoiaDefensiva", nome: "Paranoia Defensiva", tipo: "classe", classes: ["combatente"], fonte: SAH, pagina: 15,
      resumo: "Uma vez por cena, uma rodada e 3 PE: você e cada aliado escolhem +5 na Defesa contra o próximo ataque ou +5 em um teste." }),
    entrada({ chave: "sacrificarOsJoelhos", nome: "Sacrificar os Joelhos", tipo: "classe", classes: ["combatente"], fonte: SAH, pagina: 15,
      resumo: "Uma vez por perseguição, ao fazer esforço extra, gaste 2 PE para passar automaticamente no teste.",
      requisitos: [req.trein("atletismo")] }),
    entrada({ chave: "semTempoIrmao", nome: "Sem Tempo, Irmão", tipo: "classe", classes: ["combatente"], fonte: SAH, pagina: 15,
      resumo: "Uma vez por investigação, facilita a investigação com sucesso automático, mas provoca uma rolagem a mais de eventos." }),
    entrada({ chave: "valentao", nome: "Valentão", tipo: "classe", classes: ["combatente"], fonte: SAH, pagina: 15,
      resumo: "Pode usar Força no lugar de Presença em Intimidação e, uma vez por cena, 1 PE para assustar como ação livre." }),

    entrada({ chave: "acolherOTerror", nome: "Acolher o Terror", tipo: "classe", classes: ["especialista"], fonte: SAH, pagina: 22,
      resumo: "Pode se entregar ao medo uma vez a mais por sessão de jogo." }),
    entrada({ chave: "contatosOportunos", nome: "Contatos Oportunos", tipo: "classe", classes: ["especialista"], fonte: SAH, pagina: 22,
      resumo: "Uma ação de interlúdio aciona contatos locais e rende um aliado do tipo escolhido até o fim da missão.",
      requisitos: [req.trein("crime")] }),
    entrada({ chave: "disfarceSutil", nome: "Disfarce Sutil", tipo: "classe", classes: ["especialista"], fonte: SAH, pagina: 22,
      resumo: "1 PE para se disfarçar com uma ação completa e sem kit; com o kit, +5 no teste.",
      requisitos: [req.atr("pre", 2), req.trein("enganacao")] }),
    entrada({ chave: "esconderijoDesesperado", nome: "Esconderijo Desesperado", tipo: "classe", classes: ["especialista"], fonte: SAH, pagina: 22,
      resumo: "Sem –1 dado em Furtividade por se mover normalmente; em cena furtiva, esconder-se reduz a visibilidade em 2." }),
    entrada({ chave: "especialistaDiletante", nome: "Especialista Diletante", tipo: "classe", classes: ["especialista"], fonte: SAH, pagina: 22,
      resumo: "Aprende um poder de outra classe (exceto de trilha ou paranormal) cujos requisitos cumpra.",
      requisitos: [req.nex(30)],
      opcoes: [{ chave: "poder", tipo: "poderOutraClasse", rotulo: "Poder de outra classe" }],
      automacao: "calculo" }),
    entrada({ chave: "flashback", nome: "Flashback", tipo: "classe", classes: ["especialista"], fonte: SAH, pagina: 22,
      resumo: "Escolha uma origem que não seja a sua e receba o poder dela.",
      opcoes: [{ chave: "origem", tipo: "origem", rotulo: "Origem" }],
      automacao: "calculo", nota: "Quando o poder da origem escolhida tem efeito numérico, ele entra na conta." }),
    entrada({ chave: "leituraFria", nome: "Leitura Fria", tipo: "classe", classes: ["especialista"], fonte: SAH, pagina: 22,
      resumo: "Uma vez por interlúdio, faz três perguntas pessoais sobre um NPC observado; cada uma sem resposta rende 2 PE temporários.",
      requisitos: [req.trein("intuicao")] }),
    entrada({ chave: "maosFirmes", nome: "Mãos Firmes", tipo: "classe", classes: ["especialista"], fonte: SAH, pagina: 22,
      resumo: "Em Furtividade para esconder-se ou manipular um objeto discretamente, 2 PE dão +1 dado.",
      requisitos: [req.trein("furtividade")] }),
    entrada({ chave: "planoDeFuga", nome: "Plano de Fuga", tipo: "classe", classes: ["especialista"], fonte: SAH, pagina: 23,
      resumo: "Usa Intelecto no lugar de Força para criar obstáculos numa perseguição e, uma vez por cena, 2 PE garantem o sucesso." }),
    entrada({ chave: "remoerMemorias", nome: "Remoer Memórias", tipo: "classe", classes: ["especialista"], fonte: SAH, pagina: 23,
      resumo: "Uma vez por cena, troca um teste de perícia de Intelecto ou Presença por um teste de Intelecto DT 15, por 2 PE.",
      requisitos: [req.atr("int", 1)] }),
    entrada({ chave: "resistirAPressao", nome: "Resistir à Pressão", tipo: "classe", classes: ["especialista"], fonte: SAH, pagina: 23,
      resumo: "Uma vez por investigação, 5 PE aumentam a urgência em 1 rodada, com +2 em perícias para todos nessa rodada.",
      requisitos: [req.trein("investigacao")] }),

    entrada({ chave: "deixeOsSussurrosGuiarem", nome: "Deixe os Sussurros Guiarem", tipo: "classe", classes: ["ocultista"], fonte: SAH, pagina: 26,
      resumo: "Uma vez por cena, 2 PE e uma rodada: +2 em perícias de investigação até o fim da cena, mas cada falha custa 1 de Sanidade." }),
    entrada({ chave: "dominioEsoterico", nome: "Domínio Esotérico", tipo: "classe", classes: ["ocultista"], fonte: SAH, pagina: 26,
      resumo: "Combina os efeitos de até dois catalisadores ritualísticos diferentes num mesmo ritual.",
      requisitos: [req.atr("int", 3)] }),
    entrada({ chave: "estalosMacabros", nome: "Estalos Macabros", tipo: "classe", classes: ["ocultista"], fonte: SAH, pagina: 26,
      resumo: "Ao distrair ou fintar, 1 PE permite usar Ocultismo; contra pessoas ou animais, +5 no teste." }),
    entrada({ chave: "minhaDorMeImpulsiona", nome: "Minha Dor me Impulsiona", tipo: "classe", classes: ["ocultista"], fonte: SAH, pagina: 26,
      resumo: "Com pelo menos 5 de dano sofrido, 1 PE dá +1d6 em Acrobacia, Atletismo ou Furtividade.",
      requisitos: [req.atr("vig", 2)] }),
    entrada({ chave: "nosOlhosDoMonstro", nome: "Nos Olhos do Monstro", tipo: "classe", classes: ["ocultista"], fonte: SAH, pagina: 26,
      resumo: "Encarar uma criatura paranormal por uma rodada e 3 PE dá +5 nos testes contra ela (exceto ataques) até o fim da cena." }),
    entrada({ chave: "olharSinistro", nome: "Olhar Sinistro", tipo: "classe", classes: ["ocultista"], fonte: SAH, pagina: 26,
      resumo: "Pode usar Presença no lugar de Intelecto em Ocultismo e usar essa perícia para coagir.",
      requisitos: [req.atr("pre", 1)] }),
    entrada({ chave: "sentidoPremonitorio", nome: "Sentido Premonitório", tipo: "classe", classes: ["ocultista"], fonte: SAH, pagina: 26,
      resumo: "3 PE ativam um déjà vu de uma rodada à frente fora de combate; mantê-lo custa 1 PE por rodada." }),
    entrada({ chave: "sincroniaParanormal", nome: "Sincronia Paranormal", tipo: "classe", classes: ["ocultista"], fonte: SAH, pagina: 26,
      resumo: "Ação padrão e 2 PE criam uma sincronia com aliados de encontros passados; a cada rodada distribui dados de bônus iguais à Presença.",
      requisitos: [req.atr("pre", 2)] }),
    entrada({ chave: "tracadoConjuratorio", nome: "Traçado Conjuratório", tipo: "classe", classes: ["ocultista"], fonte: SAH, pagina: 27,
      resumo: "1 PE e ação completa traçam um símbolo de 1,5m: dentro dele, +2 em Ocultismo e resistência, e +2 na DT dos seus rituais." }),
  ];

  /* =================================================================
     PODERES GERAIS — SAH p.33-36
     -----------------------------------------------------------------
     "Essencialmente, eles são considerados poderes de todas as
     classes": onde a progressão deixa escolher um poder de classe,
     deixa escolher um destes.

     O padrão "treinamento em X ou, se já for treinado, +2 nela" vira o
     efeito `treinarOuBonus`, que olha o grau que a perícia teria SEM
     este poder.
     ================================================================= */

  function geral(chave, nome, pagina, resumo, requisitos, efeitos, automacao, extra) {
    return entrada(Object.assign({
      chave: chave, nome: nome, tipo: "geral", classes: TODAS, fonte: SAH, pagina: pagina,
      resumo: resumo, requisitos: requisitos || [], efeitos: efeitos || [],
      automacao: automacao || "informacao",
    }, extra || {}));
  }

  var PARCIAL_TREINO = "O treinamento (ou o +2) entra na conta. O resto é aplicado na cena.";

  var PODERES_GERAIS = [
    geral("acrobatico", "Acrobático", 33, "Treinado em Acrobacia, ou +2 se já for. Terreno difícil não reduz o deslocamento nem impede investidas.",
      [req.atr("agi", 2)], [ef.treinarOuBonus("acrobacia")], "parcial", { nota: PARCIAL_TREINO }),
    geral("asDoVolante", "Ás do Volante", 33, "Treinado em Pilotagem, ou +2 se já for. Uma vez por rodada, Pilotagem pode evitar o dano sofrido pelo veículo.",
      [req.atr("agi", 2)], [ef.treinarOuBonus("pilotagem")], "parcial", { nota: PARCIAL_TREINO }),
    geral("atletico", "Atlético", 33, "Treinado em Atletismo, ou +2 se já for, e +3m de deslocamento.",
      [req.atr("for", 2)], [ef.treinarOuBonus("atletismo"), ef.desloc(3)], "calculo"),
    geral("atraente", "Atraente", 33, "+5 em Artes, Diplomacia, Enganação e Intimidação contra quem se sente atraído por você.",
      [req.atr("pre", 2)]),
    geral("dedosAgeis", "Dedos Ágeis", 33, "Treinado em Crime, ou +2 se já for. Arromba com ação padrão, furta com ação livre e sabota com ação completa.",
      [req.atr("agi", 2)], [ef.treinarOuBonus("crime")], "parcial", { nota: PARCIAL_TREINO }),
    geral("detectorDeMentiras", "Detector de Mentiras", 33, "Treinado em Intuição, ou +2 se já for. Quem mente para você sofre –10 em Enganação.",
      [req.atr("pre", 2)], [ef.treinarOuBonus("intuicao")], "parcial", { nota: PARCIAL_TREINO }),
    geral("especialistaEmEmergencias", "Especialista em Emergências", 33, "Treinado em Medicina, ou +2 se já for. Aplica cicatrizantes com ação de movimento e saca um por rodada como ação livre.",
      [req.atr("int", 2)], [ef.treinarOuBonus("medicina")], "parcial", { nota: PARCIAL_TREINO }),
    geral("estigmado", "Estigmado", 33, "Pode converter dano mental de efeitos de medo em perda de pontos de vida."),
    geral("focoEmPericia", "Foco em Perícia", 33, "Escolha uma perícia treinada (exceto Luta e Pontaria): rola +1 dado nela. Pode repetir para outras perícias.",
      [{ tipo: "treinadoNaOpcao", opcao: "pericia" }], [], "informacao",
      { repetivel: true, repeticaoPorOpcao: "pericia",
        opcoes: [{ chave: "pericia", tipo: "pericia", exceto: ["luta", "pontaria"], rotulo: "Perícia" }],
        nota: "O dado extra é aplicado ao rolar. O requisito de treinamento é conferido." }),
    geral("inventarioOrganizado", "Inventário Organizado", 34, "Soma o Intelecto no limite de espaços. Itens de meio espaço ocupam um quarto de espaço.",
      [req.atr("int", 2)], [{ tipo: "capacidadeAtributo", atributo: "int" }, { tipo: "meioEspaco" }], "calculo"),
    geral("informado", "Informado", 34, "Treinado em Atualidades, ou +2 se já for. Com aval do mestre, usa Atualidades para testes de informação.",
      [req.atr("int", 2)], [ef.treinarOuBonus("atualidades")], "parcial", { nota: PARCIAL_TREINO }),
    geral("interrogador", "Interrogador", 34, "Treinado em Intimidação, ou +2 se já for. Coage com ação padrão, uma vez por cena contra a mesma pessoa.",
      [req.atr("for", 2)], [ef.treinarOuBonus("intimidacao")], "parcial", { nota: PARCIAL_TREINO }),
    geral("mentirosoNato", "Mentiroso Nato", 34, "Treinado em Enganação, ou +2 se já for. Mentiras implausíveis custam só –1 dado.",
      [req.atr("pre", 2)], [ef.treinarOuBonus("enganacao")], "parcial", { nota: PARCIAL_TREINO }),
    geral("observador", "Observador", 34, "Treinado em Investigação, ou +2 se já for, e soma o Intelecto em Intuição.",
      [req.atr("int", 2)], [ef.treinarOuBonus("investigacao"), { tipo: "bonusPericiaAtributo", pericia: "intuicao", atributo: "int" }], "calculo"),
    geral("paiDePet", "Pai de Pet", 34, "Treinado em Adestramento, ou +2 se já for. Tem um animal aliado que dá +2 em duas perícias aprovadas pelo mestre.",
      [req.atr("pre", 2)], [ef.treinarOuBonus("adestramento")], "parcial", { nota: PARCIAL_TREINO }),
    geral("palavrasDeDevocao", "Palavras de Devoção", 35, "Treinado em Religião, ou +2 se já for. Uma vez por cena, uma oração dá resistência a dano mental 5 a um grupo.",
      [req.atr("pre", 2)], [ef.treinarOuBonus("religiao")], "parcial", { nota: PARCIAL_TREINO }),
    geral("parceiro", "Parceiro", 35, "Um aliado fiel, de um tipo à sua escolha, acompanha as missões.",
      [req.trein("diplomacia"), req.nex(30)]),
    geral("pensamentoTatico", "Pensamento Tático", 35, "Treinado em Tática, ou +2 se já for. Analisar terreno com sucesso dá ação de movimento extra no próximo combate ali.",
      [req.atr("int", 2)], [ef.treinarOuBonus("tatica")], "parcial", { nota: PARCIAL_TREINO }),
    geral("personalidadeEsoterica", "Personalidade Esotérica", 35, "+3 PE e treinado em Ocultismo, ou +2 se já for.",
      [req.atr("int", 2)], [{ tipo: "peFixo", valor: 3 }, ef.treinarOuBonus("ocultismo")], "calculo"),
    geral("persuasivo", "Persuasivo", 35, "Treinado em Diplomacia, ou +2 se já for. Pedidos custosos ou perigosos penalizam 5 a menos.",
      [req.atr("pre", 2)], [ef.treinarOuBonus("diplomacia")], "parcial", { nota: PARCIAL_TREINO }),
    geral("pesquisadorCientifico", "Pesquisador Científico", 35, "Treinado em Ciências, ou +2 se já for. Usa Ciências para identificar criaturas e animais.",
      [req.atr("int", 2)], [ef.treinarOuBonus("ciencias")], "parcial", { nota: PARCIAL_TREINO }),
    geral("proativo", "Proativo", 35, "Treinado em Iniciativa, ou +2 se já for. Um 19 ou 20 na Iniciativa dá uma ação padrão extra no primeiro turno.",
      [req.atr("agi", 2)], [ef.treinarOuBonus("iniciativa")], "parcial", { nota: PARCIAL_TREINO }),
    geral("provisoesDeEmergencia", "Provisões de Emergência", 35, "Uma vez por missão, um interlúdio recupera um esconderijo com equipamento equivalente à sua patente."),
    geral("racionalidadeInflexivel", "Racionalidade Inflexível", 35, "Usa Intelecto no lugar de Presença em Vontade e no cálculo dos pontos de esforço.",
      [req.atr("int", 3)], [{ tipo: "atributoBasePericia", pericia: "vontade", atributo: "int" }, { tipo: "atributoDoPe", atributo: "int" }], "calculo"),
    geral("ratoDeComputador", "Rato de Computador", 36, "Treinado em Tecnologia, ou +2 se já for. Hackear e operar dispositivos levam uma ação completa.",
      [req.atr("int", 2)], [ef.treinarOuBonus("tecnologia")], "parcial", { nota: PARCIAL_TREINO }),
    geral("respostaRapida", "Resposta Rápida", 36, "Treinado em Reflexos, ou +2 se já for. Ao falhar em Percepção contra surpresa, 2 PE rolam de novo com Reflexos.",
      [req.atr("agi", 2)], [ef.treinarOuBonus("reflexos")], "parcial", { nota: PARCIAL_TREINO }),
    geral("talentoso", "Talentoso", 36, "Treinado em Artes, ou +2 se já for. Impressionar com folga aumenta o bônus concedido.",
      [req.atr("pre", 2)], [ef.treinarOuBonus("artes")], "parcial", { nota: PARCIAL_TREINO }),
    geral("teimosiaObstinada", "Teimosia Obstinada", 36, "Treinado em Vontade, ou +2 se já for. Contra condição mental ou mudança de atitude, 2 PE dão +5.",
      [req.atr("pre", 2)], [ef.treinarOuBonus("vontade")], "parcial", { nota: PARCIAL_TREINO }),
    geral("tenacidade", "Tenacidade", 36, "Treinado em Fortitude, ou +2 se já for. Morrendo e consciente, pode tentar encerrar a condição com Fortitude.",
      [req.atr("vig", 2)], [ef.treinarOuBonus("fortitude")], "parcial", { nota: PARCIAL_TREINO }),
    geral("sentidosAgucados", "Sentidos Aguçados", 36, "Treinado em Percepção, ou +2 se já for. Não fica desprevenido contra quem não vê.",
      [req.atr("pre", 2)], [ef.treinarOuBonus("percepcao")], "parcial", { nota: PARCIAL_TREINO }),
    geral("sobrevivencialista", "Sobrevivencialista", 36, "Treinado em Sobrevivência, ou +2 se já for. +2 contra clima, e terreno difícil natural não atrapalha.",
      [req.atr("int", 2)], [ef.treinarOuBonus("sobrevivencia")], "parcial", { nota: PARCIAL_TREINO }),
    geral("sorrateiro", "Sorrateiro", 36, "Treinado em Furtividade, ou +2 se já for. Sem penalidade por se mover furtivo nem por seguir alguém sem esconderijo.",
      [req.atr("agi", 2)], [ef.treinarOuBonus("furtividade")], "parcial", { nota: PARCIAL_TREINO }),
    geral("vitalidadeReforcada", "Vitalidade Reforçada", 36, "+1 PV para cada 5% de NEX (ou por nível) e +2 em Fortitude.",
      [req.atr("vig", 2)], [{ tipo: "pvPorDegrau", valor: 1 }, ef.pericia(["fortitude"], 2)], "calculo"),
    geral("vontadeInabalavel", "Vontade Inabalável", 36, "+1 PE para cada 10% de NEX (ou a cada 2 níveis) e +2 em Vontade.",
      [req.atr("pre", 2)], [{ tipo: "pePorDoisDegraus", valor: 1 }, ef.pericia(["vontade"], 2)], "calculo"),
  ];

  /* =================================================================
     PODERES PARANORMAIS — OPRPG p.114-116, SAH p.46-47
     -----------------------------------------------------------------
     "a menos que o texto indique o contrário, só pode escolher cada
     poder uma vez" (OPRPG p.114). Com afinidade, um poder do seu
     elemento pode ser escolhido uma segunda vez para receber a linha
     "Afinidade" — é por isso que existem `efeitosAfinidade`.

     Efeitos "por NEX" de poder paranormal olham o NEX de EXPOSIÇÃO,
     não o nível: com NEX & Experiência, o NEX "continua sendo usado
     para [...] efeitos de poderes paranormais" (SAH p.98).
     ================================================================= */

  function paranormal(chave, nome, elemento, fonte, pagina, resumo, afinidade, extra) {
    return entrada(Object.assign({
      chave: chave, nome: nome, tipo: "paranormal", elemento: elemento, fonte: fonte, pagina: pagina,
      resumo: resumo, afinidade: afinidade,
    }, extra || {}));
  }

  var PODERES_PARANORMAIS = [
    paranormal("aprenderRitual", "Aprender Ritual", "", OPRPG, 114,
      "Aprende um ritual de 1º círculo (até 2º a partir de NEX 45%, até 3º a partir de NEX 75%) e pode trocar um ritual conhecido. Sujeito ao limite de rituais pelo Intelecto.",
      "",
      { repetivel: true,
        opcoes: [
          { chave: "aprendido", tipo: "ritualAprendido", rotulo: "Ritual aprendido",
            ajuda: "Escolha pela biblioteca. O círculo permitido sobe com o NEX de exposição: 1º, 2º a partir de 45% e 3º a partir de 75%." },
          { chave: "substituido", tipo: "ritualDaFicha", opcional: true, rotulo: "Ritual substituído",
            ajuda: "“Além disso, você pode substituir um ritual que já conhece por outro” (OPRPG p.114). É a única troca que as regras dão; deixar em branco não substitui nada." },
          { chave: "elemento", tipo: "elemento", comMedo: true, rotulo: "Elemento do ritual",
            ajuda: "Este poder conta como um poder do elemento do ritual." },
        ],
        nota: "Este é o único aprendizado que conta no limite de rituais conhecidos (Intelecto). O elemento escolhido conta para requisitos como Morte 2." }),

    paranormal("resistirAElemento", "Resistir a Elemento", "", OPRPG, 114,
      "Resistência 10 contra o elemento escolhido. Conta como poder desse elemento.",
      "A resistência aumenta para 20.",
      { repeticaoPorOpcao: "elemento",
        opcoes: [{ chave: "elemento", tipo: "elemento", rotulo: "Elemento" }],
        efeitos: [{ tipo: "resistenciaDano", opcao: "elemento", valor: 10 }],
        efeitosAfinidade: [{ tipo: "resistenciaDano", opcao: "elemento", valor: 10 }],
        automacao: "calculo",
        nota: "O nome no livro é “Resistir a <Elemento>”. O R.A.M.A. trata cada elemento como uma escolha distinta — ver as lacunas em docs/ORDEM-REGRAS.md." }),

    /* --- Conhecimento --- */
    paranormal("expansaoDeConhecimento", "Expansão de Conhecimento", "conhecimento", OPRPG, 114,
      "Aprende um poder de classe que não é da sua classe, cumprindo os requisitos dele.",
      "Aprende um segundo poder de classe de fora da sua classe.",
      { requisitos: [req.elem("conhecimento", 1)],
        opcoes: [{ chave: "poder", tipo: "poderOutraClasse", semGerais: true, rotulo: "Poder de outra classe" }],
        automacao: "calculo" }),
    paranormal("percepcaoParanormal", "Percepção Paranormal", "conhecimento", OPRPG, 114,
      "Procurando pistas, pode rolar de novo um dado abaixo de 10, ficando com a segunda rolagem.",
      "Rola de novo até dois dados abaixo de 10."),
    paranormal("precognicao", "Precognição", "conhecimento", OPRPG, 114,
      "+2 em Defesa e em testes de resistência.",
      "Fica imune à condição desprevenido.",
      { requisitos: [req.elem("conhecimento", 1)], efeitos: [ef.defesa(2), ef.resTestes(2)], automacao: "calculo" }),
    paranormal("sensitivo", "Sensitivo", "conhecimento", OPRPG, 114,
      "+5 em Diplomacia, Intimidação e Intuição.",
      "Num teste oposto com essas perícias, o oponente sofre –1 dado.",
      { efeitos: [ef.pericia(["diplomacia", "intimidacao", "intuicao"], 5)], automacao: "calculo" }),
    paranormal("visaoDoOculto", "Visão do Oculto", "conhecimento", OPRPG, 115,
      "+5 em Percepção e enxerga no escuro.",
      "Ignora camuflagem.",
      { efeitos: [ef.pericia(["percepcao"], 5)], automacao: "parcial", nota: "O +5 entra na conta. A visão no escuro é anotação." }),

    /* --- Energia --- */
    paranormal("afortunado", "Afortunado", "energia", OPRPG, 115,
      "Uma vez por rolagem, rola de novo um 1 em qualquer dado que não seja d20.",
      "Além disso, uma vez por teste, rola de novo um 1 no d20."),
    paranormal("campoProtetor", "Campo Protetor", "energia", OPRPG, 115,
      "Ao usar a ação esquiva, 1 PE dá +5 em Defesa.",
      "Também dá +5 em Reflexos e, até o próximo turno, passar num teste de Reflexos para metade do dano evita todo o dano.",
      { requisitos: [req.elem("energia", 1)] }),
    paranormal("causalidadeFortuita", "Causalidade Fortuita", "energia", OPRPG, 115,
      "Em investigação, a DT para procurar pistas cai 5 até você achar uma pista.",
      "A DT para procurar pistas sempre cai 5."),
    paranormal("golpeDeSorte", "Golpe de Sorte", "energia", OPRPG, 115,
      "Seus ataques recebem +1 na margem de ameaça.",
      "Seus ataques recebem +1 no multiplicador de crítico.",
      { requisitos: [req.elem("energia", 1)] }),
    paranormal("manipularEntropia", "Manipular Entropia", "energia", OPRPG, 115,
      "2 PE fazem um alvo em alcance curto rolar de novo um dos dados de um teste de perícia.",
      "O alvo rola de novo todos os dados que você escolher.",
      { requisitos: [req.elem("energia", 1)] }),

    /* --- Morte --- */
    paranormal("encararAMorte", "Encarar a Morte", "morte", OPRPG, 115,
      "Em cenas de ação, o limite de PE por turno aumenta em +1 (sem afetar DT).",
      "Em cenas de ação, o aumento passa a +3 no total.",
      { nota: "Vale só em cenas de ação; por isso não entra no limite de PE mostrado na ficha." }),
    paranormal("escaparDaMorte", "Escapar da Morte", "morte", OPRPG, 115,
      "Uma vez por cena, dano que deixaria você com 0 PV deixa com 1 PV (exceto dano massivo).",
      "Evita todo o dano; contra dano massivo, fica com 1 PV.",
      { requisitos: [req.elem("morte", 1)] }),
    paranormal("potencialAprimorado", "Potencial Aprimorado", "morte", OPRPG, 115,
      "+1 PE por NEX, acompanhando o NEX daqui para a frente.",
      "+1 PE adicional por NEX, para +2 por NEX.",
      { efeitos: [{ tipo: "pePorDegrau", valor: 1, trilho: "exposicao" }],
        efeitosAfinidade: [{ tipo: "pePorDegrau", valor: 1, trilho: "exposicao" }],
        automacao: "calculo" }),
    paranormal("potencialReaproveitado", "Potencial Reaproveitado", "morte", OPRPG, 115,
      "Uma vez por rodada, passar num teste de resistência dá 2 PE temporários cumulativos até o fim da cena.",
      "Ganha 3 PE temporários em vez de 2."),
    paranormal("surtoTemporal", "Surto Temporal", "morte", OPRPG, 115,
      "Uma vez por cena, no seu turno, 3 PE dão uma ação padrão adicional.",
      "Pode usar uma vez por turno em vez de uma vez por cena.",
      { requisitos: [req.elem("morte", 2)] }),

    /* --- Sangue --- */
    paranormal("anatomiaInsana", "Anatomia Insana", "sangue", OPRPG, 116,
      "50% de chance (par em 1d4) de ignorar o dano extra de um crítico ou ataque furtivo.",
      "Fica imune aos efeitos de acertos críticos e ataques furtivos.",
      { requisitos: [req.elem("sangue", 2)] }),
    paranormal("armaDeSangue", "Arma de Sangue", "sangue", OPRPG, 116,
      "Ação de movimento e 2 PE criam uma arma simples leve de 1d6 de dano de Sangue até o fim da cena; 1 PE dá um ataque extra ao agredir.",
      "A arma fica permanente e causa 1d10."),
    paranormal("sangueDeFerro", "Sangue de Ferro", "sangue", OPRPG, 116,
      "+2 PV por NEX, acompanhando o NEX daqui para a frente.",
      "+5 em Fortitude e imunidade a venenos e doenças.",
      { efeitos: [{ tipo: "pvPorDegrau", valor: 2, trilho: "exposicao" }],
        efeitosAfinidade: [ef.pericia(["fortitude"], 5)],
        automacao: "calculo", nota: "Os PV e o +5 da afinidade entram na conta. A imunidade é anotação." }),
    paranormal("sangueFervente", "Sangue Fervente", "sangue", OPRPG, 116,
      "Machucado, recebe +1 em Agilidade ou Força, escolhido a cada ativação.",
      "O bônus sobe para +2.",
      { requisitos: [req.elem("sangue", 2)], nota: "Depende de estar machucado; não entra nos atributos da ficha." }),
    paranormal("sangueVivo", "Sangue Vivo", "sangue", OPRPG, 116,
      "Na primeira vez que fica machucado na cena, recebe cura acelerada 2, nunca acima da metade dos PV.",
      "A cura acelerada sobe para 5.",
      { requisitos: [req.elem("sangue", 1)] }),

    /* --- Sobrevivendo ao Horror, Tabela 1.6 --- */
    paranormal("espreitarDaBesta", "Espreitar da Besta", "sangue", SAH, 46,
      "+5 em Furtividade. Caçando numa perseguição, usa Furtividade no lugar de Atletismo; em cena furtiva, ações discretas sem –1 dado.",
      "O bônus em Furtividade sobe para +10.",
      { efeitos: [ef.pericia(["furtividade"], 5)], efeitosAfinidade: [ef.pericia(["furtividade"], 5)],
        automacao: "parcial", nota: "O bônus em Furtividade entra na conta. O resto é aplicado na cena." }),
    paranormal("instintosSanguinarios", "Instintos Sanguinários", "sangue", SAH, 46,
      "Visão no escuro e faro.",
      "Não pode ser flanqueado, não fica desprevenido e recebe +5 em resistência contra armadilhas."),
    paranormal("anteciparVitalidade", "Antecipar Vitalidade", "morte", SAH, 46,
      "Acumula cargas (até o Vigor) para +1 dado num teste; cada carga custa a recuperação de PV de um sono.",
      "O limite de cargas aumenta em 2, e cada sono consome 2 cargas."),
    paranormal("auraDePavor", "Aura de Pavor", "morte", SAH, 46,
      "Ação de movimento e 2 PE deixam uma pessoa ou animal em alcance médio apavorado (Vontade reduz para abalado).",
      "A DT sobe 5 e afeta todos os que você escolher no alcance."),
    paranormal("absorverConhecimento", "Absorver Conhecimento", "conhecimento", SAH, 46,
      "Empunhando uma fonte escrita, 1 PE e ação completa respondem uma pergunta que esteja nela; melhora o dado da ação ler.",
      "Rituais de Conhecimento em uma pessoa tocada custam –1 PE."),
    paranormal("apatiaHerege", "Apatia Herege", "conhecimento", SAH, 46,
      "Contra condição de medo, 2 PE permitem rolar o teste de novo, ficando com a segunda rolagem.",
      "Pode decidir depois de saber o resultado e fica com a melhor rolagem.",
      { requisitos: [req.elem("conhecimento", 1)] }),
    paranormal("conexaoEmpatica", "Conexão Empática", "energia", SAH, 47,
      "Ação completa e 2 PE permitem conversar com um objeto elétrico ligado que você toca.",
      "+5 em perícias de Intelecto ou Presença com o objeto.",
      { requisitos: [req.elem("energia", 1)] }),
    paranormal("valerSeDoCaos", "Valer-se do Caos", "energia", SAH, 47,
      "Pode receber +1 dado num teste; se falhar ou esse dado tirar 5 ou menos, perde 1d4 de Sanidade.",
      "Só perde Sanidade se falhar ou se o dado extra tirar 1 ou 2."),
  ];

  /* =================================================================
     HABILIDADES DE TRILHA
     -----------------------------------------------------------------
     Todas AUTOMÁTICAS depois que a trilha é escolhida: "Você recebe um
     novo poder da trilha escolhida em NEX 40%, 65% e 99%" (OPRPG p.24,
     28, 33). Nenhuma delas é uma vaga de escolha — só algumas pedem
     uma opção interna para ficarem completas.
     ================================================================= */

  function trilha(chaveTrilha, nex, chave, nome, fonte, pagina, resumo, extra) {
    return entrada(Object.assign({
      chave: chave, nome: nome, tipo: "trilha", trilha: chaveTrilha, nex: nex,
      fonte: fonte, pagina: pagina, resumo: resumo,
    }, extra || {}));
  }

  var HABILIDADES_TRILHA = [
    /* --- Aniquilador, OPRPG p.26 --- */
    trilha("aniquilador", 10, "aFavorita", "A Favorita", OPRPG, 26,
      "Escolha uma arma para ser a favorita: a categoria dela cai I.",
      { opcoes: [
          { chave: "arma", tipo: "texto", rotulo: "Arma favorita", dica: "katana, fuzil de assalto…", limite: 60 },
          { chave: "itens", tipo: "itens", apenasArmas: true, opcional: true, rotulo: "Armas do inventário que são a favorita",
            ajuda: "Marque as armas da ficha que são a favorita. É nelas que a redução de categoria entra." },
        ],
        efeitos: [{ tipo: "categoriaFavorita", opcao: "itens" }], automacao: "calculo",
        nota: "A redução acompanha a trilha: I em NEX 10%, II em 40%, III em 99%." }),
    trilha("aniquilador", 40, "tecnicaSecreta", "Técnica Secreta", OPRPG, 26,
      "A arma favorita cai II de categoria. Ao atacar com ela, 2 PE por efeito: Amplo (atinge alvo adjacente) ou Destruidor (+1 no multiplicador).",
      { automacao: "parcial", nota: "A categoria entra na conta do inventário. Os efeitos são escolhidos no ataque." }),
    trilha("aniquilador", 65, "tecnicaSublime", "Técnica Sublime", OPRPG, 26,
      "Acrescenta Letal (+2 na margem, ou +5 escolhendo duas vezes) e Perfurante (ignora 5 de resistência) à Técnica Secreta."),
    trilha("aniquilador", 99, "maquinaDeMatar", "Máquina de Matar", OPRPG, 26,
      "A favorita cai III de categoria, ganha +2 na margem de ameaça e um dado de dano a mais.",
      { automacao: "parcial", nota: "A categoria entra na conta do inventário. Margem e dano são aplicados na rolagem." }),

    /* --- Comandante de Campo, OPRPG p.26-27 --- */
    trilha("comandante", 10, "inspirarConfianca", "Inspirar Confiança", OPRPG, 26,
      "Reação e 2 PE fazem um aliado em alcance curto rolar de novo um teste recém-feito."),
    trilha("comandante", 40, "estrategista", "Estrategista", OPRPG, 27,
      "Ação padrão e 1 PE por aliado (até o Intelecto) em alcance curto: eles ganham uma ação de movimento no próximo turno."),
    trilha("comandante", 65, "brechaNaGuarda", "Brecha na Guarda", OPRPG, 27,
      "Uma vez por rodada, quando um aliado fere um inimigo próximo, reação e 2 PE dão um ataque adicional contra ele. Os alcances da trilha viram médio."),
    trilha("comandante", 99, "oficialComandante", "Oficial Comandante", OPRPG, 27,
      "Ação padrão e 5 PE: cada aliado visível em alcance médio ganha uma ação padrão no próximo turno."),

    /* --- Guerreiro, OPRPG p.27 --- */
    trilha("guerreiro", 10, "tecnicaLetal", "Técnica Letal", OPRPG, 27,
      "+2 na margem de ameaça de todos os ataques corpo a corpo."),
    trilha("guerreiro", 40, "revidar", "Revidar", OPRPG, 27,
      "Depois de bloquear, reação e 2 PE para contra-atacar corpo a corpo quem atacou."),
    trilha("guerreiro", 65, "forcaOpressora", "Força Opressora", OPRPG, 27,
      "Ao acertar corpo a corpo, 1 PE faz derrubar ou empurrar como ação livre, com bônus pelo dano causado."),
    trilha("guerreiro", 99, "potenciaMaxima", "Potência Máxima", OPRPG, 27,
      "Com armas corpo a corpo, todos os bônus numéricos do Ataque Especial dobram."),

    /* --- Operações Especiais, OPRPG p.27 --- */
    trilha("operacoes", 10, "iniciativaAprimorada", "Iniciativa Aprimorada", OPRPG, 27,
      "+5 em Iniciativa e uma ação de movimento adicional na primeira rodada.",
      { efeitos: [ef.pericia(["iniciativa"], 5)], automacao: "parcial",
        nota: "O +5 entra na conta. A ação extra é aplicada no combate." }),
    trilha("operacoes", 40, "ataqueExtra", "Ataque Extra", OPRPG, 27,
      "Uma vez por rodada, ao atacar, 2 PE dão um ataque adicional."),
    trilha("operacoes", 65, "surtoDeAdrenalina", "Surto de Adrenalina", OPRPG, 27,
      "Uma vez por rodada, 5 PE dão uma ação padrão ou de movimento adicional."),
    trilha("operacoes", 99, "sempreAlerta", "Sempre Alerta", OPRPG, 27,
      "Uma ação padrão adicional no início de cada cena de combate."),

    /* --- Tropa de Choque, OPRPG p.27 --- */
    trilha("tropadechoque", 10, "cascaGrossa", "Casca Grossa", OPRPG, 27,
      "+1 PV para cada 5% de NEX e, ao bloquear, soma o Vigor na resistência a dano.",
      { efeitos: [{ tipo: "pvPorDegrau", valor: 1 }], automacao: "parcial",
        nota: "Os PV entram na conta. O Vigor no bloqueio é aplicado no combate." }),
    trilha("tropadechoque", 40, "caiDentro", "Cai Dentro", OPRPG, 27,
      "Reação e 1 PE forçam um oponente próximo a atacar você em vez do aliado, se falhar em Vontade."),
    trilha("tropadechoque", 65, "duroDeMatar", "Duro de Matar", OPRPG, 27,
      "Reação e 2 PE reduzem à metade um dano não paranormal; a partir de NEX 85%, também paranormal."),
    trilha("tropadechoque", 99, "inquebravel", "Inquebrável", OPRPG, 27,
      "Machucado, +5 na Defesa e resistência a dano 5. Morrendo, não fica indefeso e ainda age."),

    /* --- Atirador de Elite, OPRPG p.30 --- */
    trilha("atirador", 10, "miraDeElite", "Mira de Elite", OPRPG, 30,
      "Proficiência com armas de fogo de balas longas e soma o Intelecto no dano com elas.",
      { efeitos: [ef.prof("Armas de fogo que usam balas longas")], automacao: "parcial",
        nota: "A proficiência entra na ficha. O Intelecto no dano é aplicado na rolagem." }),
    trilha("atirador", 40, "disparoLetal", "Disparo Letal", OPRPG, 30,
      "Ao mirar, 1 PE aumenta em +2 a margem de ameaça do próximo ataque."),
    trilha("atirador", 65, "disparoImpactante", "Disparo Impactante", OPRPG, 30,
      "Com arma de fogo de calibre grosso, 2 PE permitem derrubar, desarmar, empurrar e quebrar à distância."),
    trilha("atirador", 99, "atirarParaMatar", "Atirar para Matar", OPRPG, 30,
      "Crítico com arma de fogo causa o dano máximo, sem rolar."),

    /* --- Infiltrador, OPRPG p.30-31 --- */
    trilha("infiltrador", 10, "ataqueFurtivo", "Ataque Furtivo", OPRPG, 30,
      "Uma vez por rodada, contra alvo desprevenido ou flanqueado, 1 PE soma +1d6 de dano (+2d6 em NEX 40%, +3d6 em 65%, +4d6 em 99%)."),
    trilha("infiltrador", 40, "gatuno", "Gatuno", OPRPG, 30,
      "+5 em Atletismo e Crime, e anda o deslocamento normal escondido sem penalidade.",
      { efeitos: [ef.pericia(["atletismo", "crime"], 5)], automacao: "parcial",
        nota: "O +5 entra na conta. O deslocamento escondido é aplicado na cena." }),
    trilha("infiltrador", 65, "assassinar", "Assassinar", OPRPG, 30,
      "Ação de movimento e 3 PE analisam um alvo: o próximo Ataque Furtivo contra ele dobra os dados extras e pode derrubá-lo."),
    trilha("infiltrador", 99, "sombraFugaz", "Sombra Fugaz", OPRPG, 31,
      "Depois de atacar, 3 PE evitam a penalidade de –15 em Furtividade."),

    /* --- Médico de Campo, OPRPG p.31 --- */
    trilha("medico", 10, "paramedico", "Paramédico", OPRPG, 31,
      "Ação padrão e 2 PE curam 2d10 PV de um aliado adjacente; mais dados de cura em NEX 40%, 65% e 99%, a +1 PE cada."),
    trilha("medico", 40, "equipeDeTrauma", "Equipe de Trauma", OPRPG, 31,
      "Ação padrão e 2 PE removem uma condição negativa (exceto morrendo) de um aliado adjacente."),
    trilha("medico", 65, "resgate", "Resgate", OPRPG, 31,
      "Aproxima-se de aliado ferido como ação livre, curar dá +5 de Defesa a ambos, e carregar alguém ocupa metade dos espaços."),
    trilha("medico", 99, "reanimacao", "Reanimação", OPRPG, 31,
      "Uma vez por cena, ação completa e 10 PE trazem de volta quem morreu nesta cena (exceto por dano massivo)."),

    /* --- Negociador, OPRPG p.31 --- */
    trilha("negociador", 10, "eloquencia", "Eloquência", OPRPG, 31,
      "Ação completa e 1 PE por alvo: Diplomacia, Enganação ou Intimidação contra Vontade deixa os alvos fascinados enquanto você se concentrar."),
    trilha("negociador", 40, "discursoMotivador", "Discurso Motivador", OPRPG, 31,
      "Ação padrão e 4 PE: você e aliados próximos ganham +1 dado em perícias até o fim da cena (+2 dados por 8 PE a partir de NEX 65%)."),
    trilha("negociador", 65, "euConhecoUmCara", "Eu Conheço um Cara", OPRPG, 31,
      "Uma vez por missão, pede um favor à sua rede de contatos, dentro do que o mestre permitir."),
    trilha("negociador", 99, "truqueDeMestre", "Truque de Mestre", OPRPG, 31,
      "5 PE simulam uma habilidade que um aliado usou na cena, pagando os custos dela."),

    /* --- Técnico, OPRPG p.31 --- */
    trilha("tecnico", 10, "inventarioOtimizado", "Inventário Otimizado", OPRPG, 31,
      "Soma o Intelecto à Força para calcular a capacidade de carga.",
      { efeitos: [{ tipo: "capacidadeForcaMais", atributo: "int" }], automacao: "calculo" }),
    trilha("tecnico", 40, "remendao", "Remendão", OPRPG, 31,
      "Ação completa e 1 PE removem a condição quebrado até o fim da cena, e equipamentos gerais caem I de categoria para você.",
      { efeitos: [{ tipo: "categoriaGrupo", grupo: "geral", reducao: 1 }], automacao: "parcial",
        nota: "A redução de categoria dos equipamentos gerais entra na conta do inventário." }),
    trilha("tecnico", 65, "improvisar", "Improvisar", OPRPG, 31,
      "Ação completa e 2 PE mais 2 PE por categoria criam uma versão funcional de um equipamento geral até o fim da cena."),
    trilha("tecnico", 99, "preparadoParaTudo", "Preparado para Tudo", OPRPG, 31,
      "Ação de movimento e 3 PE por categoria tiram da bolsa um item de que precisa (exceto armas)."),

    /* --- Conduíte, OPRPG p.34 --- */
    trilha("conduite", 10, "ampliarRitual", "Ampliar Ritual", OPRPG, 34,
      "+2 PE aumentam o alcance de um ritual em um passo ou dobram a área."),
    trilha("conduite", 40, "acelerarRitual", "Acelerar Ritual", OPRPG, 34,
      "Uma vez por rodada, +4 PE conjuram um ritual como ação livre."),
    trilha("conduite", 65, "anularRitual", "Anular Ritual", OPRPG, 34,
      "Alvo de um ritual, paga o mesmo custo e vence Ocultismo oposto para anulá-lo."),
    trilha("conduite", 99, "canalizarOMedo", "Canalizar o Medo", OPRPG, 34,
      "Aprende o ritual Canalizar o Medo."),

    /* --- Flagelador, OPRPG p.34-35 --- */
    trilha("flagelador", 10, "poderDoFlagelo", "Poder do Flagelo", OPRPG, 34,
      "Paga o custo de rituais com os próprios PV, 2 PV por PE; esses PV só voltam com descanso."),
    trilha("flagelador", 40, "abracarADor", "Abraçar a Dor", OPRPG, 34,
      "Reação e 2 PE reduzem à metade um dano não paranormal."),
    trilha("flagelador", 65, "absorverAgonia", "Absorver Agonia", OPRPG, 34,
      "Levar inimigos a 0 PV com um ritual dá PE temporários iguais ao círculo dele."),
    trilha("flagelador", 99, "medoTangivel", "Medo Tangível", OPRPG, 35,
      "Aprende o ritual Medo Tangível."),

    /* --- Graduado, OPRPG p.35 --- */
    trilha("graduado", 10, "saberAmpliado", "Saber Ampliado", OPRPG, 35,
      "Aprende um ritual de 1º círculo e mais um a cada novo círculo, fora do limite de rituais.",
      { automacao: "parcial",
        nota: "As escolhas aparecem na Progressão e na aba Rituais, uma por círculo novo." }),
    trilha("graduado", 40, "grimorioRitualistico", "Grimório Ritualístico", OPRPG, 35,
      "Um grimório de 1 espaço guarda rituais de 1º ou 2º círculo iguais ao Intelecto; consultá-lo exige empunhá-lo e uma ação completa.",
      { automacao: "parcial",
        nota: "Os rituais do grimório ficam separados dos conhecidos na aba Rituais, com a condição de uso escrita. O grimório em si é um item de 1 espaço no inventário." }),
    trilha("graduado", 65, "rituaisEficientes", "Rituais Eficientes", OPRPG, 35,
      "A DT para resistir a todos os seus rituais aumenta em +5.",
      { efeitos: [{ tipo: "dtRitual", valor: 5 }], automacao: "calculo",
        nota: "O +5 entra na DT de resistência mostrada na aba Rituais." }),
    trilha("graduado", 99, "conhecendoOMedo", "Conhecendo o Medo", OPRPG, 35,
      "Aprende o ritual Conhecendo o Medo."),

    /* --- Intuitivo, OPRPG p.35 --- */
    trilha("intuitivo", 10, "menteSa", "Mente Sã", OPRPG, 35,
      "Resistência paranormal +5: +5 em testes de resistência contra efeitos paranormais.",
      { efeitos: [{ tipo: "resistenciaTestesParanormal", valor: 5 }], automacao: "calculo" }),
    trilha("intuitivo", 40, "presencaPoderosa", "Presença Poderosa", OPRPG, 35,
      "Soma a Presença ao limite de PE por turno, só para conjurar rituais.",
      { nota: "Vale só para rituais; por isso não entra no limite de PE mostrado na ficha." }),
    trilha("intuitivo", 65, "inabalavel", "Inabalável", OPRPG, 35,
      "Resistência a dano mental e paranormal 10; efeito paranormal que permite Vontade para metade não causa dano se você passar.",
      { efeitos: [{ tipo: "resistenciaDano", dano: "mental", valor: 10 }, { tipo: "resistenciaDano", dano: "paranormal", valor: 10 }],
        automacao: "parcial", nota: "As resistências entram na ficha. O teste de Vontade é aplicado na cena." }),
    trilha("intuitivo", 99, "presencaDoMedo", "Presença do Medo", OPRPG, 35,
      "Aprende o ritual Presença do Medo."),

    /* --- Lâmina Paranormal, OPRPG p.35 --- */
    trilha("laminaparanormal", 10, "laminaMaldita", "Lâmina Maldita", OPRPG, 35,
      "Aprende Amaldiçoar Arma (ou ele custa –1 PE) e ataca com Ocultismo usando a arma amaldiçoada."),
    trilha("laminaparanormal", 40, "gladiadorParanormal", "Gladiador Paranormal", OPRPG, 35,
      "Acertar corpo a corpo dá 2 PE temporários, até o limite de PE por cena."),
    trilha("laminaparanormal", 65, "conjuracaoMarcial", "Conjuração Marcial", OPRPG, 35,
      "Uma vez por rodada, ao conjurar um ritual de ação padrão, 2 PE dão um ataque corpo a corpo como ação livre."),
    trilha("laminaparanormal", 99, "laminaDoMedo", "Lâmina do Medo", OPRPG, 35,
      "Aprende o ritual Lâmina do Medo."),

    /* --- SAH: Agente Secreto, p.15-16 --- */
    trilha("agentesecreto", 10, "carteirada", "Carteirada", SAH, 15,
      "Treinado em Diplomacia ou Enganação (+2 se já for), e documentos de agência que abrem portas a critério do mestre.",
      { opcoes: [{ chave: "pericia", tipo: "pericia", entre: ["diplomacia", "enganacao"], rotulo: "Perícia" }],
        efeitos: [{ tipo: "treinarOuBonus", opcao: "pericia", bonus: 2 }], automacao: "parcial",
        nota: "O treinamento (ou o +2) entra na conta. Os documentos são anotação." }),
    trilha("agentesecreto", 40, "oSorriso", "O Sorriso", SAH, 16,
      "+2 em Diplomacia e Enganação; 2 PE repetem uma falha nelas; uma vez por cena, Diplomacia acalma a si mesmo.",
      { efeitos: [ef.pericia(["diplomacia", "enganacao"], 2)], automacao: "parcial",
        nota: "O +2 entra na conta. A rolagem repetida é aplicada na hora." }),
    trilha("agentesecreto", 65, "metodoInvestigativo", "Método Investigativo", SAH, 16,
      "A urgência das investigações aumenta em 1 rodada, e 2 PE (mais 2 a cada uso) anulam um evento de investigação."),
    trilha("agentesecreto", 99, "multifacetado", "Multifacetado", SAH, 16,
      "Uma vez por cena, 5 de Sanidade dão as habilidades até NEX 65% de uma trilha de combatente ou especialista até o fim da cena."),

    /* --- SAH: Caçador, p.16-17 --- */
    trilha("cacador", 10, "rastrearOParanormal", "Rastrear o Paranormal", SAH, 16,
      "Treinado em Sobrevivência (+2 se já for), usada no lugar de Ocultismo, Investigação e Percepção para rastros paranormais.",
      { efeitos: [ef.treinarOuBonus("sobrevivencia")], automacao: "parcial", nota: PARCIAL_TREINO }),
    trilha("cacador", 40, "estudarFraquezas", "Estudar Fraquezas", SAH, 16,
      "Um interlúdio estudando uma pista de um ser rende uma informação e +1 nos testes contra ele por pista."),
    trilha("cacador", 65, "atacarDasSombras", "Atacar das Sombras", SAH, 17,
      "Sem –1 dado em Furtividade por se mover, penalidade menor ao atacar com arma silenciosa e visibilidade inicial menor."),
    trilha("cacador", 99, "estudarAPresa", "Estudar a Presa", SAH, 17,
      "Um tipo de criatura ou cultista vira sua presa: +1 dado, +1 na margem e no multiplicador e resistência a dano 5 contra ela."),

    /* --- SAH: Monstruoso, p.17-21 --- */
    trilha("monstruoso", 10, "serAmaldicoado", "Ser Amaldiçoado", SAH, 17,
      "Treinado em Ocultismo (+2 se já for). Escolha um elemento: uma etapa ritualística diária dele dá efeitos próprios; sem ela, fome e sede. A afinidade, se vier, tem de ser com este elemento.",
      { opcoes: [{ chave: "elemento", tipo: "elemento", rotulo: "Elemento da maldição" }],
        efeitos: [ef.treinarOuBonus("ocultismo")],
        automacao: "parcial", nota: "O Ocultismo entra na conta. Os efeitos diários dependem da etapa ritualística e são anotação." }),
    trilha("monstruoso", 40, "serMacabro", "Ser Macabro", SAH, 18,
      "A resistência da etapa ritualística sobe para 10 e a penalidade para –2 dados, com novos efeitos por elemento."),
    trilha("monstruoso", 65, "serAssustador", "Ser Assustador", SAH, 19,
      "A resistência da etapa ritualística sobe para 15, com novos efeitos por elemento, e a Presença cai 1 permanentemente.",
      { efeitos: [{ tipo: "atributo", atributo: "pre", valor: -1 }], automacao: "parcial",
        nota: "A Presença reduzida entra na conta. Os efeitos da etapa ritualística são anotação." }),
    trilha("monstruoso", 99, "serAterrorizante", "Ser Aterrorizante", SAH, 20,
      "Os efeitos da etapa ritualística ficam permanentes, a resistência sobe para 20 e atributos mudam conforme o elemento. Passa a contar como criatura paranormal.",
      { efeitos: [{ tipo: "atributosPorElemento", opcaoDe: "serAmaldicoado",
          mapa: {
            sangue: [{ atributo: "int", valor: -1 }, { atributo: "for", valor: 1 }],
            morte: [{ atributo: "pre", valor: -1 }, { atributo: "vig", valor: 1 }],
            conhecimento: [{ atributo: "for", valor: -1 }, { atributo: "int", valor: 1 }],
            energia: [{ atributo: "for", valor: -1 }, { atributo: "agi", valor: 1 }],
          } }],
        automacao: "parcial", nota: "As mudanças de atributo por elemento entram na conta. O resto é anotação." }),

    /* --- SAH: Bibliotecário, p.23 --- */
    trilha("bibliotecario", 10, "conhecimentoPratico", "Conhecimento Prático", SAH, 23,
      "Em perícia (exceto Luta e Pontaria), 2 PE mudam o atributo-base para Intelecto; com Conhecimento Aplicado, custa 1 PE a menos."),
    trilha("bibliotecario", 40, "leitorContumaz", "Leitor Contumaz", SAH, 23,
      "O dado da ação ler vira 1d8 e vale para qualquer perícia; 2 PE somam mais um dado."),
    trilha("bibliotecario", 65, "ratoDeBiblioteca", "Rato de Biblioteca", SAH, 23,
      "Uma vez por cena, cercado de livros, recebe o benefício de ler ou revisar caso em minutos."),
    trilha("bibliotecario", 99, "aForcaDoSaber", "A Força do Saber", SAH, 23,
      "O Intelecto aumenta em +1 e soma nos PE; uma perícia escolhida passa a usar Intelecto como atributo-base.",
      { opcoes: [{ chave: "pericia", tipo: "pericia", rotulo: "Perícia que passa a usar Intelecto" }],
        efeitos: [{ tipo: "atributo", atributo: "int", valor: 1 }, { tipo: "peAtributo", atributo: "int" },
                  { tipo: "atributoBasePericia", opcao: "pericia", atributo: "int" }],
        automacao: "calculo" }),

    /* --- SAH: Perseverante, p.24 --- */
    trilha("perseverante", 10, "solucoesImprovisadas", "Soluções Improvisadas", SAH, 24,
      "2 PE rolam de novo um dado de um teste recém-feito, uma vez por teste, ficando com o melhor."),
    trilha("perseverante", 40, "fugaObstinada", "Fuga Obstinada", SAH, 24,
      "+1 dado para fugir de um inimigo e, como presa numa perseguição, aguenta até 4 falhas."),
    trilha("perseverante", 65, "determinacaoInquestionavel", "Determinação Inquestionável", SAH, 24,
      "Uma vez por cena, 5 PE e ação padrão removem uma condição de medo, mental ou de paralisia."),
    trilha("perseverante", 99, "soMaisUmPasso", "Só Mais um Passo…", SAH, 24,
      "Uma vez por rodada, 5 PE deixam você com 1 PV quando cairia a 0 (exceto dano massivo)."),

    /* --- SAH: Muambeiro, p.25 --- */
    trilha("muambeiro", 10, "mascate", "Mascate", SAH, 25,
      "Treinado em Profissão (armeiro, engenheiro ou químico), +5 na capacidade de carga e DT de itens improvisados –10.",
      { opcoes: [{ chave: "profissao", tipo: "escolha", valores: ["armeiro", "engenheiro", "químico"], rotulo: "Profissão" }],
        efeitos: [ef.carga(5)], automacao: "parcial",
        nota: "Os 5 espaços entram na capacidade. O R.A.M.A. tem uma perícia Profissão só, sem especialidade: o treinamento fica anotado." }),
    trilha("muambeiro", 40, "fabricacaoPropria", "Fabricação Própria", SAH, 25,
      "Fabrica itens mundanos na metade do tempo."),
    trilha("muambeiro", 65, "laboratorioDeCampo", "Laboratório de Campo", SAH, 25,
      "Treinado em mais uma dessas Profissões (ou +5 se já for) e fabrica e conserta itens paranormais em campo."),
    trilha("muambeiro", 99, "achadoConveniente", "Achado Conveniente", SAH, 25,
      "Ação completa e 5 PE produzem um item de até categoria III (exceto paranormal) que funciona até o fim da cena."),

    /* --- SAH: Exorcista, p.27-28 --- */
    trilha("exorcista", 10, "revelacaoDoMal", "Revelação do Mal", SAH, 27,
      "Treinado em Religião (+2 se já for), usada no lugar de Investigação, Percepção e Ocultismo para sinais paranormais.",
      { efeitos: [ef.treinarOuBonus("religiao")], automacao: "parcial", nota: PARCIAL_TREINO }),
    trilha("exorcista", 40, "poderDaFe", "Poder da Fé", SAH, 27,
      "Veterano em Religião (ou +1 dado se já for) e, ao falhar em resistência, 2 PE repetem o teste com Religião.",
      { efeitos: [{ tipo: "grauMinimo", pericia: "religiao", grau: "veterano" }], automacao: "parcial",
        nota: "O grau veterano entra na conta. O dado extra e o teste repetido são aplicados na hora." }),
    trilha("exorcista", 65, "parareligiosidade", "Parareligiosidade", SAH, 27,
      "+2 PE somam a um ritual o efeito de um catalisador ritualístico à escolha."),
    trilha("exorcista", 99, "chagasDaResistencia", "Chagas da Resistência", SAH, 28,
      "Quando a Sanidade chegaria a 0, 10 PV a deixam em 1."),

    /* --- SAH: Possuído, p.28-29 --- */
    trilha("possuido", 10, "poderNaoDesejado", "Poder Não Desejado", SAH, 28,
      "Cada novo poder de ocultista vira Transcender. Tem pontos de possessão (3, mais 2 por Transcender; gasta até a Presença por turno) que recuperam 10 PV ou 2 PE cada, e dormir devolve 1.",
      { automacao: "parcial",
        nota: "A troca é aplicada pela ficha: as vagas de poder de ocultista, e o poder de ocultista da Versatilidade, só aceitam Transcender. Os pontos de possessão são contados pela mesa — a ficha não tem esse recurso." }),
    trilha("possuido", 40, "asSombrasDentroDeMim", "As Sombras Dentro de Mim", SAH, 28,
      "Recupera 2 pontos de possessão por sono e 2 PE dão +1 dado em Acrobacia, Atletismo e Furtividade por uma rodada."),
    trilha("possuido", 65, "eleMeEnsina", "Ele Me Ensina", SAH, 28,
      "Escolha entre transcender ou receber o primeiro poder de outra trilha de ocultista.",
      { opcoes: [{ chave: "caminho", tipo: "caminho", rotulo: "Caminho",
          caminhos: [
            { valor: "transcender", rotulo: "Transcender", opcao: { chave: "poder", tipo: "poderParanormal", rotulo: "Poder paranormal" } },
            { valor: "trilha", rotulo: "Primeiro poder de outra trilha de ocultista", opcao: { chave: "trilha", tipo: "trilhaOutra", rotulo: "Trilha" } },
          ] }],
        automacao: "calculo" }),
    trilha("possuido", 99, "tornamoNosUm", "Tornamo-nos Um", SAH, 28,
      "Recebe um presente conforme o elemento da afinidade: Obsessão (Sangue), Tempo (Morte), Saber (Conhecimento) ou Espaço (Energia)."),

    /* --- SAH: Parapsicólogo, p.29 --- */
    trilha("parapsicologo", 10, "terapia", "Terapia", SAH, 29,
      "Usa Profissão (psicólogo) como Diplomacia e, com 2 PE, substitui o teste de resistência falho contra dano mental de alguém próximo."),
    trilha("parapsicologo", 40, "palavrasChave", "Palavras-chave", SAH, 29,
      "Ao acalmar com sucesso, cada PE gasto (até o limite) devolve 1 de Sanidade."),
    trilha("parapsicologo", 65, "reprogramacaoMental", "Reprogramação Mental", SAH, 29,
      "5 PE e um interlúdio dão a um voluntário um poder até o próximo interlúdio."),
    trilha("parapsicologo", 99, "aSanidadeEstaLaFora", "A Sanidade Está Lá Fora", SAH, 29,
      "Ação de movimento e 5 PE removem todas as condições de medo ou mentais de alguém adjacente."),
  ];

  /* =================================================================
     HABILIDADES AUTOMÁTICAS DE CLASSE
     -----------------------------------------------------------------
     O que a tabela de cada classe dá sem perguntar.
     ================================================================= */

  var AUTOMATICAS = [
    entrada({ chave: "ataqueEspecial", nome: "Ataque Especial", tipo: "automatica", classes: ["combatente"], pagina: 24,
      resumo: "Ao atacar, gaste PE para somar bônus de +5 no ataque ou no dano." }),
    entrada({ chave: "ecletico", nome: "Eclético", tipo: "automatica", classes: ["especialista"], pagina: 28,
      resumo: "Em um teste de perícia, 2 PE dão os benefícios de ser treinado nela." }),
    entrada({ chave: "perito", nome: "Perito", tipo: "automatica", classes: ["especialista"], pagina: 28,
      resumo: "Em duas perícias treinadas escolhidas (exceto Luta e Pontaria), gaste PE para somar um dado de bônus ao teste." }),
    entrada({ chave: "engenhosidade", nome: "Engenhosidade", tipo: "automatica", classes: ["especialista"], pagina: 30,
      resumo: "Usando Eclético, PE adicionais dão os benefícios de veterano (NEX 40%) ou de expert (NEX 75%)." }),
    entrada({ chave: "escolhidoPeloOutroLado", nome: "Escolhido pelo Outro Lado", tipo: "automatica", classes: ["ocultista"], pagina: 32,
      resumo: "Conjura rituais: começa com três de 1º círculo e aprende um a cada NEX, fora do limite de rituais." }),
  ];

  /* Os estágios de cada habilidade automática, por NEX. */
  var ESTAGIOS = {
    ataqueEspecial: [
      { nex: 5, texto: "2 PE: +5" }, { nex: 25, texto: "3 PE: +10" },
      { nex: 55, texto: "4 PE: +15" }, { nex: 85, texto: "5 PE: +20" },
    ],
    perito: [
      { nex: 5, texto: "2 PE: +1d6" }, { nex: 25, texto: "3 PE: +1d8" },
      { nex: 55, texto: "4 PE: +1d10" }, { nex: 85, texto: "5 PE: +1d12" },
    ],
    engenhosidade: [
      { nex: 40, texto: "+2 PE: veterano" }, { nex: 75, texto: "+4 PE: expert" },
    ],
    escolhidoPeloOutroLado: [
      { nex: 5, texto: "1º círculo" }, { nex: 25, texto: "2º círculo" },
      { nex: 55, texto: "3º círculo" }, { nex: 85, texto: "4º círculo" },
    ],
  };

  /* A partir de quando cada automática existe. */
  var NEX_INICIAL_AUTOMATICA = {
    ataqueEspecial: 5, ecletico: 5, perito: 5, engenhosidade: 40, escolhidoPeloOutroLado: 5,
  };

  /* =================================================================
     ALTERAÇÕES POR NEX — regra opcional NEX & Experiência, SAH p.99-103
     -----------------------------------------------------------------
     Só existem com a regra ligada. Os valores de NEX abaixo são os
     "valores de NEX em que [o personagem] poderia sofrer uma alteração"
     — é neles que a regra permite transcender (SAH p.98).

     Só as alterações GERAIS de NEX 25% e 35% têm escolha e efeito
     numérico. As de elemento (60%, 75%, 90%) são descritivas, com
     penalidades em dados e rituais — ficam como anotação.
     ================================================================= */

  var NEX_DE_ALTERACAO = [25, 35, 50, 60, 75, 90];

  var ALTERACOES_GERAIS = [
    entrada({ chave: "alteracao25", nome: "Arrepios na espinha", tipo: "alteracao", nex: 25, fonte: SAH, pagina: 99,
      resumo: "Testes de Ocultismo sem treinamento; se treinado, +2. Em troca, –5 em Diplomacia, Enganação ou Intimidação, à escolha.",
      opcoes: [{ chave: "penalidade", tipo: "pericia", entre: ["diplomacia", "enganacao", "intimidacao"], rotulo: "Perícia penalizada" }],
      efeitos: [{ tipo: "bonusSeTreinado", pericia: "ocultismo", valor: 2 }, { tipo: "bonusPericia", opcao: "penalidade", valor: -5 }],
      automacao: "calculo" }),
    entrada({ chave: "alteracao35", nome: "Coincidências inexplicáveis", tipo: "alteracao", nex: 35, fonte: SAH, pagina: 99,
      resumo: "Soma um atributo (exceto Presença) no total de PE. Em troca, –5 em Atletismo, Fortitude ou Reflexos, à escolha.",
      opcoes: [
        { chave: "atributo", tipo: "atributo", exceto: ["pre"], rotulo: "Atributo somado aos PE" },
        { chave: "penalidade", tipo: "pericia", entre: ["atletismo", "fortitude", "reflexos"], rotulo: "Perícia penalizada" },
      ],
      efeitos: [{ tipo: "peAtributo", opcao: "atributo" }, { tipo: "bonusPericia", opcao: "penalidade", valor: -5 }],
      automacao: "calculo" }),
  ];

  /* =================================================================
     ÍNDICES
     ================================================================= */

  var TODOS = [].concat(PODERES_CLASSE, PODERES_GERAIS, PODERES_PARANORMAIS, HABILIDADES_TRILHA, AUTOMATICAS, ALTERACOES_GERAIS);

  var POR_CHAVE = {};
  TODOS.forEach(function (p) { POR_CHAVE[p.chave] = p; });

  function poder(chave) { return POR_CHAVE[chave] || null; }

  /* O que um personagem desta classe pode escolher numa vaga de poder
     de classe: os da classe e, do Sobrevivendo ao Horror, os gerais —
     inclusive os quatro poderes de classe que o suplemento transformou
     em gerais. */
  function poderesDeClasse(classe) {
    return PODERES_CLASSE.filter(function (p) {
      return p.classes.indexOf(classe) >= 0 || !!p.geral;
    }).concat(PODERES_GERAIS);
  }

  /* Se o poder pertence à classe. Um poder geral pertence a todas; um
     de classe que o SAH tornou geral também — mas marcado, para a tela
     dizer de onde veio a permissão. */
  function pertenceAClasse(p, classe) {
    if (!p) return false;
    if (p.tipo === "geral") return true;
    if (p.classes.indexOf(classe) >= 0) return true;
    return !!p.geral;
  }

  function habilidadesDaTrilha(chaveTrilha) {
    return HABILIDADES_TRILHA.filter(function (h) { return h.trilha === chaveTrilha; })
      .sort(function (a, b) { return a.nex - b.nex; });
  }

  function primeiraDaTrilha(chaveTrilha) {
    return habilidadesDaTrilha(chaveTrilha)[0] || null;
  }

  function paginaPara(p, classe) {
    if (!p) return 0;
    if (p.paginas && classe && p.paginas[classe]) return p.paginas[classe];
    return p.pagina;
  }

  function referencia(p, classe) {
    if (!p) return "";
    var livro = p.fonte === SAH ? "Sobrevivendo ao Horror" : "Ordem Paranormal RPG";
    return livro + ", p. " + paginaPara(p, classe);
  }

  global.RAMAOrdemPoderes = {
    FONTES: { OPRPG: OPRPG, SAH: SAH },
    PODERES_CLASSE: PODERES_CLASSE,
    PODERES_GERAIS: PODERES_GERAIS,
    PODERES_PARANORMAIS: PODERES_PARANORMAIS,
    HABILIDADES_TRILHA: HABILIDADES_TRILHA,
    AUTOMATICAS: AUTOMATICAS,
    ESTAGIOS: ESTAGIOS,
    NEX_INICIAL_AUTOMATICA: NEX_INICIAL_AUTOMATICA,
    NEX_DE_ALTERACAO: NEX_DE_ALTERACAO,
    ALTERACOES_GERAIS: ALTERACOES_GERAIS,
    TODOS: TODOS,

    poder: poder,
    poderesDeClasse: poderesDeClasse,
    pertenceAClasse: pertenceAClasse,
    habilidadesDaTrilha: habilidadesDaTrilha,
    primeiraDaTrilha: primeiraDaTrilha,
    paginaPara: paginaPara,
    referencia: referencia,
  };
})(typeof window !== "undefined" ? window : globalThis);
