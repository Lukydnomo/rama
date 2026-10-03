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
     comRegra        { regra }               a regra opcional LIGADA (Reter
                                             Ritual de Combate, AS1 p. 44)
     conjurarRitual  { circulo, elemento?,   conhecer um ritual de pelo
                       elementoDaOpcao? }    menos esse círculo (e desse
                                             elemento) — AS1 p. 44-47
     atributoUm      { atributos, minimo }   um dos atributos no mínimo
                                             (“For 2 ou Agi 2”, AS2)
     grau            { pericia, grau }       grau mínimo numa perícia
                                             (2 = veterano, 3 = expert)
     grauEmUma       { pericias, grau }      o grau em pelo menos uma
     coroaDeEspinhos {}                      o contato com a Coroa de
                                             Espinhos registrado na ficha
                                             (poderes de Intenção, AS2 p. 94)
     declaracao      { texto }               condição narrativa que a
                                             ficha não mede (“ter
                                             cicatrizes”): sempre aceita,
                                             sempre escrita
   ===================================================================== */

(function (global) {
  "use strict";

  var OPRPG = "OPRPG";
  var SAH = "SAH";
  var AS1 = "AS1";
  var AS2 = "AS2";
  var AS3 = "AS3";

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
    conj: function (c, e) { return e ? { tipo: "conjurarRitual", circulo: c, elemento: e } : { tipo: "conjurarRitual", circulo: c }; },
    regra: function (k) { return { tipo: "comRegra", regra: k }; },
    /* Habilidade automática da classe (AS3 p. 108). */
    daClasse: function (k) { return { tipo: "habilidadeDeClasse", habilidade: k }; },
    atrUm: function (lista, n) { return { tipo: "atributoUm", atributos: lista, minimo: n }; },
    grau: function (p, g) { return { tipo: "grau", pericia: p, grau: g }; },
    grauUma: function (lista, g) { return { tipo: "grauEmUma", pericias: lista, grau: g }; },
    capaz: function () { return { tipo: "conjurarRitual", circulo: 1, texto: "Capacidade de conjurar rituais" }; },
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
      /* Quantas vezes a MESMA opção pode ser escolhida (<Habilidade>
         Aprimorada: duas, AS1 p. 46). Sem o campo, uma. */
      repeticaoMaxima: d.repeticaoMaxima || 0,
      /* Quantas vezes o poder pode ser adquirido no TOTAL, somando as
         opções (Dominar Habilidade Ritualística: três, AS2 p. 75). */
      maximoTotal: d.maximoTotal || 0,
      /* A habilidade que precisa existir antes para esta funcionar
         (Maldição Suprema depende de Reproduzir Maldição). Dominar
         Habilidade Ritualística confere isto (AS2 p. 75). */
      dependeDe: d.dependeDe || "",
      /* Só nos poderes de Intenção (AS2 p. 94-95). */
      intencao: d.intencao || null,
      /* Só nos poderes de Sacrifício (AS3 p. 110-111). */
      sacrificio: d.sacrificio || null,
      opcoes: d.opcoes || [],
      efeitos: d.efeitos || [],
      efeitosAfinidade: d.efeitosAfinidade || [],
      automacao: d.automacao || "informacao",
      nota: d.nota || "",
      /* Só nas habilidades de Sobrevivente: o estágio em que chegam. */
      estagio: d.estagio || 0,
      trilhaSobrevivente: d.trilhaSobrevivente || "",
      /* O que a habilidade vira ao virar agente (SAH p. 32). */
      substituicao: d.substituicao || null,
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

    /* --- combatente · Arquivos Secretos 2 --- */
    entrada({ chave: "predadorPerfeito", nome: "Predador Perfeito", tipo: "classe", classes: ["combatente"], fonte: AS2, pagina: 41,
      resumo: "Uma vez por rodada, 5 PE dão uma ação padrão adicional — e ela precisa ter intenção de causar dano (golpe, disparo, armar uma armadilha, ritual de dano…).",
      requisitos: [req.grauUma(["luta", "pontaria"], 2), req.grau("sobrevivencia", 2)],
      automacao: "parcial", nota: "O botão do cartão gasta os 5 PE. A ação e o limite de uma por rodada são da cena." }),
    entrada({ chave: "golpesDeArena", nome: "Golpes de Arena", tipo: "classe", classes: ["combatente"], fonte: AS2, pagina: 47,
      resumo: "Ao acertar um ataque corpo a corpo, 2 PE dão um ataque corpo a corpo adicional ou uma manobra de combate contra o mesmo alvo.",
      requisitos: [req.trein("luta")],
      automacao: "parcial", nota: "O botão do cartão gasta os 2 PE; o ataque adicional é rolado como qualquer outro." }),
    entrada({ chave: "marteladas", nome: "Marteladas", tipo: "classe", classes: ["combatente"], fonte: AS2, pagina: 87,
      resumo: "Ação completa e 3 PE: três ataques desarmados no mesmo alvo. Os testes só dizem se há crítico (não se comparam à Defesa); os três danos são somados e causados como uma única fonte (Fortitude DT For reduz à metade).",
      requisitos: [req.atr("for", 2), req.trein("luta"), req.poder("artistaMarcial")],
      automacao: "calculo", nota: "O botão do cartão gasta os 3 PE, rola os três testes (só para o crítico) e os três danos desarmados de Artista Marcial, e mostra a soma como um dano só, com a DT." }),

    /* --- especialista · Arquivos Secretos 2 --- */
    entrada({ chave: "assassinatoFurtivo", nome: "Assassinato Furtivo", tipo: "classe", classes: ["especialista"], fonte: AS2, pagina: 53,
      resumo: "O dano de Ataque Furtivo aumenta em +1d6. Ao acertar um ataque furtivo, 2 PE trocam os dados de dano furtivo de d6 para d8.",
      requisitos: [req.poder("ataqueFurtivo")] }),
    entrada({ chave: "especialistaEmMatar", nome: "Especialista em Matar", tipo: "classe", classes: ["especialista"], fonte: AS2, pagina: 59,
      resumo: "Ao atacar, 2 PE dão +4 no ataque ou no dano. Com o NEX, +1 PE compra mais um +4: NEX 25% (3 PE, dois +4), 55% (4 PE, três), 85% (5 PE, quatro). Cada +4 vai para o ataque ou para o dano, à sua escolha.",
      requisitos: [req.atrUm(["agi", "for"], 2), req.treinUma(["luta", "pontaria"])],
      automacao: "calculo", nota: "O ataque com arma pergunta antes de rolar: quantos +4 e onde cada um vai. O PE sai na hora, o do ataque entra no teste e o do dano fica guardado para a rolagem de dano desse ataque." }),

    /* --- combatente · Arquivos Secretos 3, p. 108 --- */
    entrada({ chave: "guardiaoDaTropa", nome: "Guardião da Tropa", tipo: "classe", classes: ["combatente"], fonte: AS3, pagina: 108,
      resumo: "Quando um aliado adjacente é o alvo único de um ataque ou de uma habilidade, reação e 2 PE fazem você sofrer o ataque ou a habilidade no lugar dele. Se o ataque não vencer a sua Defesa, ou a habilidade não o afetar por completo (passou na resistência, por exemplo), você recupera 1 SAN. Adquirido de novo, o alcance muda de adjacente para curto.",
      requisitos: [req.daClasse("ataqueEspecial"), req.poder("cascaGrossa")],
      repetivel: true, maximoTotal: 2,
      automacao: "parcial", nota: "O botão do cartão gasta os 2 PE (alcance adjacente; curto com a segunda aquisição) e deixa o uso pendente: a mesa diz como terminou, e só “não venceu a Defesa / não afetou por completo” devolve 1 SAN, uma vez por uso." }),
    entrada({ chave: "vitalidadeSofrida", nome: "Vitalidade Sofrida", tipo: "classe", classes: ["combatente"], fonte: AS3, pagina: 108,
      resumo: "Seus PV iniciais passam a 24 + Vigor e cada novo NEX dá 6 + Vigor, nos níveis que você já tem e nos futuros. Ex.: combatente NEX 15% com Vigor 3 e 37 PV fica com 45 PV e ganha +9 PV a cada novo NEX.",
      requisitos: [req.daClasse("ataqueEspecial")],
      efeitos: [{ tipo: "tabelaDePv", inicial: 24, porNex: 6 }],
      automacao: "calculo", nota: "Troca a tabela de PV do combatente (20 + Vig e 4 + Vig) pela do poder, retroativamente e uma vez só — a conta mostra a tabela nova, sem somar à antiga. Com NEX & Experiência, por nível; o PV de quem chegou a agente vindo de Mundano ou Sobrevivente continua o da fase anterior, e só os degraus de agente usam o 6 + Vig." }),

    /* --- ocultista · Arquivos Secretos 3, p. 108 --- */
    entrada({ chave: "flageloBemAproveitado", nome: "Flagelo Bem Aproveitado", tipo: "classe", classes: ["ocultista"], fonte: AS3, pagina: 108,
      resumo: "A taxa de Poder do Flagelo cai para 1 PV por PE pago.",
      requisitos: [req.daClasse("escolhidoPeloOutroLado"), req.poder("poderDoFlagelo")],
      automacao: "calculo", nota: "Em “Usar ritual”, pagar com PV (Poder do Flagelo) custa 1 PV por PE em vez de 2." }),
    entrada({ chave: "recuperacaoFlagelante", nome: "Recuperação Flagelante", tipo: "classe", classes: ["ocultista"], fonte: AS3, pagina: 108,
      resumo: "Uma vez entre uma cena de interlúdio e outra, você pode recuperar PV gastos com Poder do Flagelo por outros métodos além do descanso. Adquirido de novo, +1 uso, até 3 usos entre interlúdios.",
      requisitos: [req.daClasse("escolhidoPeloOutroLado"), req.poder("poderDoFlagelo")],
      repetivel: true, maximoTotal: 3,
      automacao: "parcial", nota: "A ficha guarda quantos PV o flagelo tirou. O botão do cartão recupera esses PV (até o que o flagelo tirou), contando os usos do interlúdio atual — um por aquisição." }),

    /* --- ocultista · Arquivos Secretos 2 --- */
    entrada({ chave: "dominarHabilidadeRitualistica", nome: "Dominar Habilidade Ritualística", tipo: "classe", classes: ["ocultista"], fonte: AS2, pagina: 75,
      resumo: "Aprenda uma habilidade de trilha de ocultista, desde que tenha o NEX dela (com NEX 65%, Anular Ritual, por exemplo). Habilidades que dependem de uma anterior continuam dependendo. Até três vezes.",
      requisitos: [req.atr("int", 3), req.trein("ocultismo"), req.capaz()],
      repetivel: true, repeticaoPorOpcao: "habilidade", maximoTotal: 3,
      opcoes: [{ chave: "habilidade", tipo: "habilidadeDeTrilha", classe: "ocultista", rotulo: "Habilidade de trilha de ocultista",
        ajuda: "O NEX desta etapa precisa alcançar o da habilidade; uma que depende de outra exige a anterior." }],
      automacao: "calculo", nota: "A habilidade escolhida entra como adquirida, com os efeitos e as concessões de ritual dela, a partir desta etapa." }),
    entrada({ chave: "liturgiaDeFortalecimento", nome: "Liturgia de Fortalecimento Ritualístico", tipo: "classe", classes: ["ocultista"], fonte: AS2, pagina: 93,
      resumo: "Numa cena de interlúdio, 2 PE e uma ação de interlúdio fortalecem um ritual que você conhece: a DT dele sobe +2 até o início da próxima cena de interlúdio.",
      requisitos: [req.atr("int", 2), req.atr("pre", 2)],
      automacao: "calculo", nota: "O botão do cartão escolhe o ritual e gasta os 2 PE; a DT mostrada na aba Rituais soma o +2 até o próximo interlúdio." }),

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

    /* --- Arquivos Secretos 1, p. 44 --- */
    entrada({ chave: "ritualIntenso", nome: "Ritual Intenso", tipo: "classe", classes: ["ocultista"], fonte: AS1, pagina: 44,
      resumo: "Soma a Presença nas rolagens de dano e de cura dos seus rituais.",
      requisitos: [req.atr("pre", 2)],
      efeitos: [{ tipo: "rolagemDeRitual", atributo: "pre" }], automacao: "calculo",
      nota: "A Presença entra nas rolagens de dano e de cura feitas pela aba Rituais." }),
    entrada({ chave: "saudeSobrenatural", nome: "Saúde Sobrenatural", tipo: "classe", classes: ["ocultista"], fonte: AS1, pagina: 44,
      resumo: "Uma vez por cena, ação de movimento e 3 PE: PV temporários iguais à Presença × 10 (Pre 3 dá 30), que somem no fim da cena e não acumulam com eles mesmos.",
      requisitos: [req.atr("int", 2), req.atr("pre", 2), req.conj(1)],
      automacao: "parcial",
      nota: "O botão do cartão gasta os 3 PE, registra o uso da cena e põe os PV temporários na ficha (sem somar a um uso anterior)." }),
    entrada({ chave: "acostumadoAMaldicao", nome: "Acostumado à Maldição de Elemento", tipo: "classe", classes: ["ocultista"], fonte: AS1, pagina: 44,
      resumo: "Escolha um elemento (exceto Medo). Ao falhar num teste ligado ao preço da maldição de um item amaldiçoado desse elemento (OPRPG p. 145), você não perde Sanidade; os outros efeitos negativos continuam.",
      requisitos: [req.atr("int", 2), { tipo: "conjurarRitual", circulo: 2, elementoDaOpcao: "elemento" }],
      opcoes: [{ chave: "elemento", tipo: "elemento", rotulo: "Elemento (exceto Medo)" }],
      nota: "O nome no livro é “Acostumado à Maldição de <Elemento>”. A perda de Sanidade é do teste, na cena." }),
    entrada({ chave: "reterRitualDeCombate", nome: "Reter Ritual de Combate", tipo: "classe", classes: ["ocultista"], fonte: AS1, pagina: 44,
      resumo: "Com a regra opcional Reter Ritual: como reação, muda para cena a duração retida de um ritual que afeta negativamente um alvo, no instante em que ele sai da linha de efeito. E, ao sofrer uma condição que faz deixar de reter rituais, reação e 1 PE por ritual mudam a duração deles para cena, sem perder os efeitos.",
      requisitos: [req.atr("int", 2), req.conj(1), req.regra("reterRitual")],
      automacao: "parcial",
      nota: "Os rituais retidos ganham, na aba Rituais, o botão “Mudar para cena” (reação; 1 PE quando é para não perder o foco)." }),
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

    /* --- Arquivos Secretos 2 (as fichas “na sua mesa”) --- */
    geral("revidarViolento", "Revidar Violento", 41,
      "Pode fazer uma segunda reação especial de defesa na mesma rodada, desde que ela seja um contra-ataque.",
      [req.atrUm(["for", "agi"], 2)], [], "informacao", { fonte: AS2,
        nota: "A segunda reação vale só para contra-ataque; a primeira continua a de sempre." }),
    geral("corpoFechado", "Corpo Fechado", 47,
      "Pode fazer uma segunda reação especial de defesa na mesma rodada, desde que ela seja um bloqueio.",
      [req.atr("vig", 2)], [], "informacao", { fonte: AS2, nota: "A segunda reação vale só para bloqueio." }),
    geral("esquivaTatica", "Esquiva Tática", 53,
      "Pode fazer uma segunda reação especial de defesa na mesma rodada, desde que ela seja uma esquiva.",
      [req.atr("agi", 2)], [], "informacao", { fonte: AS2, nota: "A segunda reação vale só para esquiva." }),
    geral("palpiteConfiante", "Palpite Confiante", 59,
      "Num teste de perícia baseado em Intelecto ou Presença, 1 PE soma o seu Intelecto ao teste.",
      [req.atr("int", 2)], [], "calculo", { fonte: AS2,
        nota: "Aparece no resultado de um teste de perícia de Intelecto ou Presença, por 1 PE." }),
    geral("especialistaEmCorrentes", "Especialista em Correntes", 70,
      "Ação completa para prender um item numa corrente amarrada ao corpo (o seu ou o de um aliado em alcance de toque): ele não pode ser desarmado nem tirado sem quebrar a corrente. +2 em manobras com correntes, chicotes e armas presas assim. Cada item preso além do primeiro dá –1 em perícias afetadas por carga.",
      [req.atr("agi", 2)], [], "informacao", { fonte: AS2 }),
    geral("especialistaEmCorrentesPuxar", "Especialista em Correntes (puxar o alvo)", 70,
      "Ao acertar um ataque com corrente ou semelhante (chicote, corda…), 2 PE puxam o alvo para um espaço vazio adjacente. Se ele se afastar de você por vontade própria, sofre –1 dado em ataques contra outros alvos por 1 rodada.",
      [req.atrUm(["for", "agi"], 2), req.trein("luta")], [], "informacao", { fonte: AS2,
        nota: "O livro imprime este poder com o mesmo nome do anterior, “Especialista em Correntes”, na mesma página. São dois poderes diferentes; o R.A.M.A. os separa pelo efeito." }),
    geral("praticaComMateriaisRitualisticos", "Prática com Materiais Ritualísticos", 74,
      "Na conjuração complexa (SAH p. 115), não sofre –1 dado para empregar materiais específicos de uma Entidade na 1ª etapa.",
      [req.atr("int", 2), req.trein("ocultismo"), req.capaz()], [], "informacao", { fonte: AS2 }),
    geral("estagioTerminal", "Estágio Terminal", 78,
      "Uma vez por rodada, machucado, 2 PE dão uma ação de movimento extra.",
      [req.atr("agi", 2)], [], "parcial", { fonte: AS2, nota: "O botão do cartão gasta os 2 PE e só se acende com a ficha machucada." }),
    geral("kianVaiNosSalvar", "Kian Vai Nos Salvar", 78,
      "A critério do mestre, diante de um desafio em que a sua fé em Kian esteja envolvida, você aprende a conjurar um ritual de Conhecimento de até 3º círculo como se o conhecesse (fora do limite), até o fim da cena. Não pode ter dois rituais assim na mesma cena.",
      [req.atr("pre", 2), req.capaz()], [], "informacao", { fonte: AS2,
        nota: "Depende da mesa: o ritual escolhido entra pela biblioteca como concessão da mesa, se ela quiser registrar." }),
    geral("tratamentoDeEmergencia", "Tratamento de Emergência", 79,
      "Ação padrão e 2 PE dão 2d10+10 PV temporários a um ser em alcance de toque. Quando todos forem perdidos, ele fica fraco até o fim da cena. O mesmo alvo não se beneficia de novo na mesma cena.",
      [req.atr("int", 2), req.trein("medicina")], [], "parcial", { fonte: AS2,
        nota: "O botão do cartão gasta os 2 PE e rola os PV temporários; em você mesmo, eles entram na ficha até o fim da cena." }),
    geral("arteDaMusicaMacabra", "Arte da Música Macabra", 83,
      "Ação padrão e 2 PE causam um efeito num ser em alcance curto que possa ouvi-lo: o próximo dano dele +5; o próximo ataque +2 na margem de ameaça; o próximo teste de ataque +5; ou +9 m no alcance do próximo ataque ou habilidade.",
      [], [], "parcial", { fonte: AS2,
        nota: "Em você mesmo, o efeito fica guardado e é gasto no próximo ataque, dano ou habilidade. O texto impresso tem duas frases soltas sobre “gastar 1d6 no mesmo ritual” e um trecho cortado (“No fim da cena”), copiados do Catalisador; o livro não lista pré-requisito. Ver docs/ORDEM-REGRAS.md." }),
    geral("sintonizacaoMentalComArma", "Sintonização Mental com Arma", 83,
      "Numa cena de interlúdio, uma ação de interlúdio e 3 PE sintonizam uma arma que você empunha: até o início da próxima cena de interlúdio, ela usa o atributo que você escolher para ataque e dano, em vez do padrão. Só vale com a arma empunhada por você.",
      [req.atrUm(["int", "pre"], 2), req.trein("ocultismo"), req.capaz()], [], "calculo", { fonte: AS2,
        nota: "O botão do cartão escolhe a arma e o atributo e gasta os 3 PE; o ataque e o dano da arma passam a usar o atributo até o próximo interlúdio." }),
    geral("sintonizacaoMentalComProtecao", "Sintonização Mental com Proteção", 83,
      "Numa cena de interlúdio, uma ação de interlúdio e 3 PE sintonizam uma proteção que você veste: até o início da próxima cena de interlúdio, ela usa o atributo que você escolher na Defesa, em vez de Agilidade. Só vale com a proteção vestida por você.",
      [req.atrUm(["int", "pre"], 2), req.trein("ocultismo"), req.capaz()], [], "calculo", { fonte: AS2,
        nota: "O botão do cartão escolhe a proteção e o atributo e gasta os 3 PE; a Defesa troca a Agilidade pelo atributo enquanto a proteção estiver em uso, até o próximo interlúdio." }),
    geral("movimentacaoTatica", "Movimentação Tática", 87,
      "Movendo-se em direção a uma cobertura ou a um inimigo, 1 PE permite percorrer o dobro do seu deslocamento.",
      [req.atr("for", 2), req.trein("atletismo"), req.trein("tatica")], [], "informacao", { fonte: AS2 }),
    geral("sentidoTaticoMilitar", "Sentido Tático (geral)", 87,
      "Fica imune à condição desprevenido. Ao causar dano num alvo, 2 PE fazem ele falhar automaticamente em Furtividade contra você por 1 rodada.",
      [req.atr("pre", 2), req.trein("percepcao"), req.trein("tatica")], [], "informacao", { fonte: AS2,
        nota: "O livro chama este poder geral de “Sentido Tático”, o mesmo nome do poder de combatente do livro básico (p. 26), que é outro. Marque desprevenido em Condições → Editar imunidades (a ficha recusa aplicar uma condição de que você é imune). A falha em Furtividade é aplicada na cena." }),

    /* --- Arquivos Secretos 3, p. 108-109 --- */
    geral("ambidestria", "Ambidestria", 108,
      "Empunhando duas armas (pelo menos uma leve), na ação agredir você pode fazer dois ataques, um com cada arma; se fizer, sofre –1d20 em todos os testes de ataque até o seu próximo turno. Com Combater com Duas Armas, em vez disso, você não sofre a penalidade dele e pode empunhar duas armas de uma mão.",
      [req.atrUm(["for", "agi"], 2), req.trein("luta")], [], "parcial", { fonte: AS3,
        nota: "O botão do cartão escolhe as duas armas do inventário e rola os dois ataques; a penalidade de –1d20 entra nos ataques seguintes até você encerrá-la (no início do seu próximo turno) ou a cena acabar. Com Combater com Duas Armas, os dois ataques saem sem penalidade e as armas podem ser de uma mão." }),
    geral("entradaTriunfal", "Entrada Triunfal", 109,
      "Uma vez por sessão, ao entrar num ambiente, anuncie sua chegada em voz alta para todos ouvirem: +1d20 no primeiro teste que fizer ali, exceto Furtividade. Como reação, pode transferir o bônus para o primeiro teste de um aliado em alcance longo, no mesmo ambiente.",
      [req.atr("pre", 2)], [], "parcial", { fonte: AS3,
        nota: "A “sessão” é a da cronologia da campanha (painel do Arquivos Secretos 3). O bônus fica guardado e aparece no resultado do próximo teste de perícia (nunca Furtividade), ou é transferido a um aliado." }),
    geral("papinhoSedutor", "Papinho Sedutor", 109,
      "Num teste de perícia baseado em Presença para seduzir alguém, 1 PE dá +5. Se passar, o alvo fica apaixonado por você — e, enquanto estiver, pode virar um problema na sua vida, a critério do mestre.",
      [req.atr("pre", 2)], [], "parcial", { fonte: AS3,
        nota: "Aparece no resultado de um teste de perícia de Presença, por 1 PE, só para seduzir. A condição apaixonado é do alvo: quem registra é ele (ou o mestre)." }),

    /* --- Arquivos Secretos 1, p. 46 --- */
    geral("habilidadeAprimorada", "Habilidade Aprimorada", 46,
      "Escolha uma habilidade ou um ritual que tenha DT: a DT para resistir a ele aumenta em +2. Pode ser escolhido de novo para outra habilidade ou ritual, e até duas vezes para a mesma (a DT sobe +5 no total).",
      [], [{ tipo: "dtAprimorada", opcao: "alvo" }], "parcial",
      { fonte: AS1, repetivel: true, repeticaoPorOpcao: "alvo", repeticaoMaxima: 2,
        opcoes: [{ chave: "alvo", tipo: "texto", rotulo: "Habilidade ou ritual com DT", dica: "o nome, como está na ficha (ex.: Decadência)", limite: 60 }],
        nota: "O nome no livro é “<Habilidade> Aprimorada”. Num ritual da ficha com o mesmo nome, a DT mostrada na aba Rituais já soma o +2 (ou +5, com duas escolhas). Numa habilidade, o aumento é aplicado na cena." }),
    geral("instintosUrbanos", "Instintos Urbanos", 46,
      "Treinado em Crime, ou +2 se já for. Ao entrar num ambiente fechado, Crime DT 20 identifica uma rota de fuga: decidindo fugir, ganha uma ação de movimento extra no primeiro turno da fuga e +2 na Defesa até fugir. Sem rota possível, +2 na Defesa enquanto estiver no lugar.",
      [req.atr("agi", 2)], [ef.treinarOuBonus("crime")], "parcial", { fonte: AS1, nota: PARCIAL_TREINO }),
    geral("cicatrizesExpostas", "Cicatrizes Expostas", 46,
      "Ação de movimento para expor suas cicatrizes (ou quando outro ser as expõe): até o fim da cena, +1d8 de dano do mesmo tipo, mas –1 dado em Vontade e em testes que exijam calma (furtividade, traduzir um idioma…).",
      [{ tipo: "declaracao", texto: "Ter cicatrizes" }], [], "parcial",
      { fonte: AS1,
        opcoes: [{ chave: "cicatrizes", tipo: "texto", rotulo: "As cicatrizes (físicas ou psicológicas)", limite: 120 }],
        nota: "O botão do cartão registra o estado exposto como efeito de cena (–1 dado em Vontade); o +1d8 de dano é somado na rolagem de dano." }),
    geral("curiosidadeOculta", "Curiosidade Oculta", 46,
      "Treinado em Ocultismo, ou +2 se já for. Num teste de Vontade, pode gastar 2 PE para usar Ocultismo no lugar.",
      [req.atr("int", 2)], [ef.treinarOuBonus("ocultismo")], "parcial",
      { fonte: AS1, nota: "O treinamento (ou o +2) entra na conta. A troca aparece no resultado de um teste de Vontade, por 2 PE." }),
    geral("especialistaEsoterico", "Especialista Esotérico", 46,
      "Ao conjurar um ritual, combina os efeitos de até três catalisadores ritualísticos diferentes ao mesmo tempo.",
      [req.atr("int", 3), req.conj(2), req.poder("dominioEsoterico")], [], "informacao", { fonte: AS1 }),
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
          { chave: "substituicao", tipo: "substituicaoDeRitual", opcional: true, rotulo: "Substituir um ritual conhecido",
            ajuda: "“Além disso, você pode substituir um ritual que já conhece por outro” (OPRPG p.114). É a única troca que as regras dão, e é opcional: deixar em branco não troca nada." },
          { chave: "elemento", tipo: "elemento", comMedo: true, doRitual: "aprendido", rotulo: "Elemento do ritual",
            ajuda: "Este poder conta como um poder do elemento do ritual escolhido: com o ritual escolhido, o elemento vem dele." },
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

    /* --- Arquivos Secretos 2 --- */
    paranormal("predadorDeSangue", "Predador de Sangue", "sangue", AS2, 41,
      "Ação padrão e 3 PE memorizam o odor de uma vítima (com uma fonte do odor): +1d20 para rastreá-la, percebê-la e atacá-la. Uma vítima por vez; dura até memorizar outra.",
      "Pode memorizar até três vítimas ao mesmo tempo.",
      { automacao: "parcial", nota: "O cartão guarda as vítimas memorizadas (uma, ou três com afinidade); o +1d20 é somado no teste contra elas." }),
    paranormal("pressaoAtmosferica", "Pressão Atmosférica", "energia", AS2, 47,
      "Ao acertar um ataque corpo a corpo num alvo agarrado, 3 PE causam +1d10 de dano de Energia e deixam o alvo atordoado por uma rodada (Fortitude DT For evita a condição). Um mesmo ser só é atordoado assim uma vez por cena.",
      "O alvo também fica caído e sangrando (o teste não evita essas condições).",
      { automacao: "parcial", nota: "O botão do cartão gasta os 3 PE e rola o +1d10 de Energia com a DT; as condições ficam com a cena." }),
    paranormal("zonaDosSussurros", "Zona dos Sussurros", "conhecimento", AS2, 53,
      "Ação completa e 3 PE marcam uma área do tamanho de um cômodo pequeno: nela, +5 nos testes de ataque e nenhuma penalidade em Furtividade depois de atacar ou de outras ações chamativas. No máximo três áreas; a quarta apaga uma anterior.",
      "Contra alvo desprevenido (corpo a corpo ou em alcance curto) ou flanqueado, pode rolar de novo os dados de dano que deram 1 ou 2 e ficar com os melhores.",
      { automacao: "parcial", nota: "O cartão guarda as áreas (até três, a quarta tira a mais antiga); o +5 é da cena." }),
    paranormal("disparoDaMorte", "Disparo da Morte", "morte", AS2, 59,
      "Antes do teste de ataque com arma de fogo ou de disparo, 3 PE dão +2 na margem de ameaça desse ataque.",
      "O ataque também ignora cobertura e 10 pontos de resistência a dano do alvo.",
      { automacao: "calculo", nota: "O ataque com arma de fogo ou de disparo pergunta antes de rolar; o +2 entra na margem desse ataque." }),
    paranormal("engolirSangue", "Engolir Sangue", "sangue", AS2, 93,
      "Ação completa para consumir uma porção de carne humana (1 espaço): recupera 2d8+2 PV, mas perde 1d4 de Sanidade.",
      "A cura muda para 4d8+4 PV.",
      { automacao: "calculo", nota: "O botão do cartão rola a cura e a perda de Sanidade e as aplica na ficha." }),

    /* --- Arquivos Secretos 3, p. 109 --- */
    paranormal("conhecimentoDeDirecaoPrecognitiva", "Conhecimento de Direção Precognitiva", "conhecimento", AS3, 109,
      "Um sexto sentido aponta o caminho: +5 em testes de Percepção ou Sobrevivência para se localizar ou se orientar até um local, mesmo sem nunca tê-lo visto ou sem saber onde fica.",
      "O bônus aumenta para +10.",
      { automacao: "parcial", nota: "Aparece no resultado de um teste de Percepção ou Sobrevivência, só para localização e orientação (+5, ou +10 com afinidade). Não vira bônus da perícia." }),
    paranormal("instrumentoEletricoDeCombate", "Instrumento Elétrico de Combate", "energia", AS3, 109,
      "Antes da próxima missão ou na próxima cena de interlúdio (o que vier primeiro), escolha um instrumento musical que você saiba tocar e tenha consigo: ele vira, para sempre, uma arma tática amaldiçoada de Energia que só você é proficiente em usar — duas mãos, ataca à distância 1 alvo à sua escolha em alcance curto com ondas sonoras, ataque com Artes (em vez de Luta ou Pontaria), 2d8 de Energia somando Presença (em vez de Força ou Agilidade), crítico 20/x2, categoria II, 2 espaços. Se quebrar, você pode usar o poder de novo num novo instrumento; se você morrer, ela quebra. Habilidades e regras que beneficiam armas, Luta ou Pontaria valem conforme a combinação com o mestre.",
      "Em vez de 1 alvo, atinge todos os alvos à sua escolha em alcance curto.",
      { automacao: "parcial", nota: "O botão do cartão cria a arma no inventário (perícia Artes, Presença no dano, ligada ao poder) quando chega o momento. O que vale para armas, Luta ou Pontaria é escolha registrada da mesa: a ficha não soma sozinha." }),

    /* --- Arquivos Secretos 1, p. 47 (todos de Sangue) --- */
    paranormal("ferroMaculado", "Ferro Maculado", "sangue", AS1, 47,
      "Ação de movimento e 2 PV amaldiçoam 1 projétil de munição: ele causa +1d6 de dano de Sangue, uma única vez.",
      "O dano muda para +1d8 de Sangue.",
      { nota: "Os 2 PV saem pelos recursos; o dado extra é somado na rolagem de dano do disparo." }),
    paranormal("placasSanguinolentas", "Placas Sanguinolentas", "sangue", AS1, 47,
      "Ao conjurar um ritual de Sangue, +Defesa igual ao círculo dele até o início do seu próximo turno (3º círculo: +3).",
      "O bônus passa a ser o círculo +2 (+3 no 1º círculo, +4 no 2º…).",
      { requisitos: [req.conj(1, "sangue")], automacao: "parcial",
        nota: "Em “Usar ritual” de um ritual de Sangue, a Defesa entra como efeito até o seu próximo turno." }),
    paranormal("sangueCorrosivo", "Sangue Corrosivo", "sangue", AS1, 47,
      "Ação de movimento e 1 PE: até o fim da cena, quem estiver adjacente e causar dano a você sofre 1d10 de dano de Sangue.",
      "O dano muda para 2d10 de Sangue.",
      { automacao: "parcial", nota: "O botão do cartão gasta o PE e registra o estado até o fim da cena; o dano é rolado pela mesa a cada golpe." }),
    paranormal("sanguePrazeroso", "Sangue Prazeroso", "sangue", AS1, 47,
      "Enquanto estiver machucado (metade dos PV ou menos), resistência a dano 5.",
      "Machucado, também recebe 20 PV temporários, uma vez por cena.",
      { requisitos: [req.elem("sangue", 1)], efeitos: [{ tipo: "resistenciaDanoMachucado", valor: 5 }], automacao: "parcial",
        nota: "A resistência a dano entra na conta enquanto os PV atuais estiverem na metade ou abaixo. Os 20 PV temporários da afinidade vêm pelo botão do cartão, uma vez por cena." }),
  ];

  /* =================================================================
     PODERES DE INTENÇÃO — Arquivos Secretos 2, p. 94-95
     -----------------------------------------------------------------
     "Um poder paranormal de Intenção não funciona como os poderes das
     demais entidades": pede contato com a Coroa de Espinhos e só pode
     ser usado depois que o GATILHO é atendido — e de novo só quando ele
     for atendido de novo. Intenção não tem afinidade, componentes,
     oposição elemental nem aquisição por Transcender no livro, e o
     R.A.M.A. não inventa nada disso: o poder é concedido pela mesa,
     com o contato registrado (ordem.intencao, js/ordem/intencao.js).

     `intencao`:
       gatilho     o texto do gatilho
       tipo        "ferimentos" (contado pela ficha) | "acao" (o gesto
                   do próprio personagem) | "confirmacao" (a mesa diz)
       ferimentos  quantos, e o dano mínimo de cada um (Filho da Dor)
       uso         a ação de usar
       efeito      "ativo" (fica ligado até desligar ou a cena acabar)
                   | "instantaneo"
       porCena     usos por cena, quando o livro limita
       versoesNpc  onde a ficha de NPC diverge do texto da p. 94-95
     ================================================================= */

  function intencao(chave, nome, pagina, lema, resumo, dados) {
    return entrada({ chave: chave, nome: nome, tipo: "intencao", elemento: "intencao", fonte: AS2, pagina: pagina,
      resumo: resumo, requisitos: [{ tipo: "comRegra", regra: "poderesDeIntencao" }, { tipo: "coroaDeEspinhos" }], intencao: Object.assign({ lema: lema }, dados),
      automacao: "parcial" });
  }

  var PODERES_INTENCAO = [
    intencao("desejoDiabolico", "Desejo Diabólico", 94, "Prove-se digno.",
      "Gatilho: obedecer a Ele. Ao fazer um teste, em vez de rolar, uma reação torna o resultado um sucesso automático (como um 20 natural). Uma vez por cena, e na mesma cena em que obedeceu a uma vontade d’Ele.",
      { gatilho: "Obedecer a Ele.", tipo: "confirmacao", uso: "reação", efeito: "instantaneo", porCena: 1, mesmaCena: true,
        versoesNpc: [{ ficha: "Juan Davo (p. 91-92)", texto: "Igual ao texto da p. 94." }] }),
    intencao("filhoDaDor", "Filho da Dor", 95, "Você foi torturado, mas a dor não o derrotou. Pelo contrário, tornou-se sua amiga.",
      "Gatilho: ser ferido três vezes, cada ferimento com pelo menos 5 de dano. Uma reação dá resistência a dano 25; enquanto ela durar, você perde 5 PV no início dos seus turnos. Outra reação desliga o efeito.",
      { gatilho: "Ser ferido três vezes, cada ferimento com pelo menos 5 pontos de dano.", tipo: "ferimentos", ferimentos: 3, danoMinimo: 5,
        uso: "reação", efeito: "ativo", rd: 25, perdaPorTurno: 5,
        versoesNpc: [{ ficha: "Jonas Aguiar e Mutilador Noturno (p. 39-40)", texto: "A ficha de NPC não menciona a reação para desligar o efeito." }] }),
    intencao("novoCaminho", "Novo Caminho", 95, "A Intenção dos mortos é a matéria-prima do labirinto da sua própria criação.",
      "Gatilho: testemunhar a morte de uma pessoa. Ação padrão para absorver as intenções de uma pessoa morta em alcance curto: um ser em alcance curto recupera PV iguais à metade dos PV máximos do cadáver.",
      { gatilho: "Testemunhar a morte de uma pessoa.", tipo: "confirmacao", uso: "ação padrão", efeito: "instantaneo",
        versoesNpc: [{ ficha: "Labirinto (p. 63-65)", texto: "A ficha de NPC traz o poder como REAÇÃO no destaque e como ação PADRÃO na lista de ações; a p. 95 diz ação padrão." }] }),
    intencao("oSaborDoSilencio", "O Sabor do Silêncio", 95, "O silêncio que te atormentou agora assombra o pesadelo dos outros.",
      "Gatilho: gastar uma ação padrão para provar o sangue de um ser adjacente que esteja machucado. Até o fim da cena, seus ataques causam +1d8 de dano e têm +2 na margem de ameaça; num crítico, você corta a boca do alvo, que fica sem poder se comunicar nem usar poderes ou rituais por 1d4 rodadas.",
      { gatilho: "Gastar uma ação padrão para provar o sangue de um ser adjacente machucado.", tipo: "acao", uso: "ação padrão (o gatilho)",
        efeito: "ativo", duracao: "cena",
        versoesNpc: [{ ficha: "Jae-Yoon e X (p. 51-52)", texto: "A ficha de NPC usa uma REAÇÃO para provar o sangue; a p. 95 pede uma ação padrão." }] }),
    intencao("sedeDeVinganca", "Sede de Vingança", 95, "Uma vez, você cuidou de alguém, mas a perdeu. É hora de fazer os responsáveis pagarem.",
      "Gatilho: ouvir o grito de morte de alguém que você tentou proteger (um aliado morrendo que você escute ou veja). Como reação, ataque quem o deixou morrendo — ou, antes de ficar inconsciente, quem deixou você morrendo.",
      { gatilho: "Ouvir o grito de morte de alguém que tentou proteger (aliado morrendo à vista ou ao alcance da voz).", tipo: "confirmacao",
        uso: "reação", efeito: "instantaneo",
        versoesNpc: [{ ficha: "Kemi e Fantasma (p. 57-58)", texto: "A ficha de NPC acrescenta “uma vez por rodada”." }] }),
  ];

  /* =================================================================
     PODERES DE SACRIFÍCIO — Arquivos Secretos 3, p. 110-111
     -----------------------------------------------------------------
     "Quando um ser se torna um sacrifício do Hexatombe, ele recebe um
     dos poderes a seguir, correspondente ao seu estigma." Não ocupam
     vaga de poder e não são escolhidos na progressão: vêm do estigma
     registrado pela mesa (js/ordem/arquivo3.js), com a regra opcional
     Poderes de Sacrifício ligada. A DT é Pre + 5 (a DT de Presença da
     ficha, mais 5).

     `sacrificio`:
       estigma       o estigma que concede o poder
       acao, custo, alcance, alvo, duracao, resistencia
       ramos         [{ rotulo, texto, rolagem? }] — passou/falhou,
                     desviar/encarar, Fortitude/Reflexos
     ================================================================= */

  function sacrificio(chave, nome, estigma, nomeEstigma, pagina, resumo, dados) {
    return entrada({ chave: chave, nome: nome, tipo: "sacrificio", fonte: AS3, pagina: pagina, resumo: resumo,
      requisitos: [{ tipo: "comRegra", regra: "poderesDeSacrificio" }, { tipo: "declaracao", texto: "Ser o sacrifício do " + nomeEstigma }],
      sacrificio: Object.assign({ estigma: estigma }, dados), automacao: "parcial",
      nota: "Concedido pelo estigma (painel do Arquivos Secretos 3), sem ocupar vaga. O botão gasta o custo, mostra a DT e registra o uso; o resultado de cada ramo é da cena." });
  }

  var PODERES_SACRIFICIO = [
    sacrificio("arroganciaDiabolica", "Arrogância Diabólica", "orgulho", "Orgulho", 110,
      "Ação padrão e 3 PE: diga a uma pessoa em alcance médio que ela pode tudo, “basta ter o mindset certo”. Vontade (DT Pre + 5): falhando, no próximo turno ela faz algo extremamente imprudente (atacar alguém mais poderoso, saltar de um lugar alto…) só para provar que pode; passando, ainda fica insegura e sofre 2d6 de dano mental que não pode ser evitado, reduzido nem resistido.",
      { acao: "padrão", custo: 3, alcance: "médio", alvo: "uma pessoa", resistencia: "Vontade",
        ramos: [{ rotulo: "Falhou", texto: "Faz uma ação extremamente imprudente no próximo turno, só para provar que “pode”." },
                { rotulo: "Passou", texto: "Fica insegura: 2d6 de dano mental que não pode ser evitado, reduzido nem resistido.", rolagem: "2d6" }] }),
    sacrificio("causarCulpa", "Causar Culpa", "culpa", "Culpa", 110,
      "Ação padrão e 3 PE: uma pessoa em alcance curto é tomada por uma culpa terrível até o fim da cena. Vontade (DT Pre + 5) evita. Falhando, revive as piores coisas que já fez, sente-se merecedora de todo o sofrimento do mundo e fica indefesa; no início de cada turno dela, pode fazer um novo teste para se libertar.",
      { acao: "padrão", custo: 3, alcance: "curto", alvo: "uma pessoa", duracao: "cena", resistencia: "Vontade evita",
        ramos: [{ rotulo: "Falhou", texto: "Indefesa até o fim da cena; novo teste de Vontade no início de cada turno dela para se libertar." },
                { rotulo: "Passou", texto: "Nenhum efeito." }] }),
    sacrificio("despertarObsessao", "Despertar Obsessão", "obsessao", "Obsessão", 110,
      "Ação padrão e 3 PE para encarar uma pessoa em alcance curto, que escolhe desviar o olhar ou encarar de volta. Desviando, fica desprevenida contra ataques seus e dos seus aliados por 1 rodada. Encarando, faz Vontade (DT Pre + 5): passando, nada; falhando, por 1 rodada gasta todas as ações para se aproximar e adorar você — ou, se não quiser, tem um impulso incontrolável de se ferir e faz um ataque contra si mesma, e o efeito termina.",
      { acao: "padrão", custo: 3, alcance: "curto", alvo: "uma pessoa", resistencia: "Vontade (só se encarar)",
        ramos: [{ rotulo: "Desviou o olhar", texto: "Desprevenida contra ataques seus e dos seus aliados por 1 rodada." },
                { rotulo: "Encarou e passou", texto: "Nada acontece." },
                { rotulo: "Encarou e falhou", texto: "Por 1 rodada, todas as ações para se aproximar e adorar você; se não quiser, ataca a si mesma e o efeito termina." }] }),
    sacrificio("estimularHedonismo", "Estimular Hedonismo", "prazer", "Prazer", 111,
      "Ação padrão e 3 PE: uma pessoa em alcance curto é tomada por uma onda de prazer insana. Vontade (DT Pre + 5) evita. Falhando, todos os sentidos e alertas do corpo só transmitem prazer e euforia: ela perde o senso de autopreservação e fica indefesa por 1 rodada.",
      { acao: "padrão", custo: 3, alcance: "curto", alvo: "uma pessoa", duracao: "1 rodada", resistencia: "Vontade evita",
        ramos: [{ rotulo: "Falhou", texto: "Indefesa por 1 rodada." }, { rotulo: "Passou", texto: "Nenhum efeito." }] }),
    sacrificio("frutoDaAmbicao", "Fruto da Ambição", "desejo", "Desejo", 111,
      "Escolha um poder ou ritual que você conheça. Além do efeito normal, usá-lo vira o gatilho de uma forma poderosíssima: funciona como As Máscaras (Arquivos Secretos 2, p. 97), como se, ao usá-lo, você vestisse a sua máscara.",
      { gatilho: true,
        ramos: [{ rotulo: "Ao usar o poder ou ritual escolhido", texto: "Pode ativar a forma suprema (As Máscaras, AS2 p. 97), com as regras e custos dela." }] }),
    sacrificio("odioSuprimido", "Ódio Suprimido", "rancor", "Rancor", 111,
      "Ação completa e 3 PE: você explode de raiva, gritando, correndo e saltando sobre quem estiver no caminho. Todo ser em alcance curto faz Fortitude e Reflexos, ambos contra DT Pre + 5. Falhou em Fortitude: é espancado, fica caído e sofre seu dano corpo a corpo (desarmado ou da arma empunhada). Falhou em Reflexos: é atingido por algo que você atira e sofre seu dano à distância (com uma arma à distância empunhada ou, pelo menos, pedras de 1d4 de impacto). Depois, você cai no chão chorando e tremendo: exausto até o fim da cena.",
      { acao: "completa", custo: 3, alcance: "curto", alvo: "todos os seres no alcance", resistencia: "Fortitude e Reflexos, separados",
        ramos: [{ rotulo: "Falhou em Fortitude", texto: "Caído e sofre o seu dano corpo a corpo.", danoDe: "corpo" },
                { rotulo: "Falhou em Reflexos", texto: "Sofre o seu dano à distância (ou 1d4 de impacto, com pedras).", danoDe: "distancia" },
                { rotulo: "Depois da explosão", texto: "Você fica exausto até o fim da cena." }] }),
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
      "Recupera 2 pontos de possessão por sono e 2 PE dão +1 dado em Acrobacia, Atletismo e Furtividade por uma rodada.",
      { dependeDe: "poderNaoDesejado" }),
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

    /* --- Combatente Performático, Arquivos Secretos 3 p. 119 --- */
    trilha("performatico", 10, "ensaio", "Ensaio", AS3, 119,
      "Nova ação de interlúdio, ensaiar combate: +1 na margem de ameaça dos seus ataques até o início da próxima cena de interlúdio (+2 em NEX 40%, +3 em 65%, +4 em 99%). Uma vez por cena. Outros personagens podem gastar uma ação de interlúdio para ensaiar com você e recebem o mesmo bônus, pela mesma duração.",
      { automacao: "calculo", nota: "O botão do cartão registra o ensaio no interlúdio atual; a margem dos ataques soma o bônus até o próximo interlúdio. Quem ensaia junto registra o ensaio na própria ficha (painel do Arquivos Secretos 3)." }),
    trilha("performatico", 40, "fraseDeEfeito", "Frase de Efeito", AS3, 119,
      "Quando você ou um aliado em alcance curto acerta um crítico, 2 PE fazem você exclamar a sua frase: o multiplicador desse crítico passa a ser igual à sua Presença; se a Presença for igual ou menor que o multiplicador, ele aumenta em +1.",
      { automacao: "calculo", nota: "No resultado de um crítico seu, o botão gasta os 2 PE e o dano desse crítico usa o multiplicador novo. Para o crítico de um aliado, o botão do cartão gasta os 2 PE e mostra o multiplicador que ele deve usar." }),
    trilha("performatico", 65, "moshPit", "Mosh Pit", AS3, 119,
      "Flanqueando um alvo, você e todos os aliados que o flanqueiam ou estão adjacentes a ele recebem +1d6 nas rolagens de dano contra ele para cada aliado que o cerca (até +5d6). Pelo exemplo do livro, você e um aliado flanqueando e mais dois adjacentes dão +4d6 a todos.",
      { automacao: "parcial", nota: "No resultado de dano corpo a corpo, informe quantos cercam o alvo (contando você, como no exemplo do livro): entram os d6, até 5. Flanquear é da cena." }),
    trilha("performatico", 99, "ritmoContagiante", "Rítmo Contagiante", AS3, 119,
      "No início de uma cena de combate, você e todos os aliados em alcance médio recebem +5 na Defesa até o fim do combate. Cada acerto crítico seu aumenta esse bônus em +1.",
      { automacao: "calculo", nota: "O botão do cartão começa o efeito na cena atual (+5 na Defesa). Cada crítico seu numa rolagem de ataque soma +1 uma vez — o id da rolagem fica guardado, e recarregar a ficha não conta de novo. Aliados registram o bônus na própria ficha." }),

    /* --- Maledictólogo, Arquivos Secretos 1 p. 45 --- */
    trilha("maledictologo", 10, "identificacaoMacabra", "Identificação Macabra", AS1, 45,
      "Num teste para identificar item amaldiçoado ou ritual, 1 PE dá +1d10. Identificar item amaldiçoado como ação completa sofre só –1 dado.",
      { automacao: "parcial", nota: "O +1d10 aparece no resultado de um teste de Ocultismo, por 1 PE." }),
    trilha("maledictologo", 40, "compreensaoDeMaldicoes", "Compreensão de Maldições", AS1, 45,
      "Ação de interlúdio e 3 PE para estudar um item amaldiçoado: Ocultismo DT 10 +5 por categoria. Falhando, perde 2d4+2 de Sanidade e não pode tentar de novo com o item. Passando e o item contendo um ritual: perde 1d4+1 de Sanidade, aprende o ritual (fora do limite) e o item é consumido. Passando sem ritual: perde 1d4+1 de Sanidade e transfere as maldições para outro item ou para um símbolo tatuado em você ou num aliado adjacente (uma tatuagem dessas por pessoa, que pode ser destruída com uma ação de interlúdio); o item original é consumido.",
      { automacao: "parcial",
        nota: "O ritual aprendido é registrado na aba Rituais (“Compreensão de Maldições”). A transferência das maldições é feita pelo menu do item no inventário (“Maldições do Maledictólogo…”)." }),
    trilha("maledictologo", 65, "reproduzirMaldicao", "Reproduzir Maldição", AS1, 45,
      "Ação de interlúdio e 3 PE memorizam uma maldição de item com que já lidou. Outra ação de interlúdio e 3 PE a aplicam num item novo, com Ocultismo DT 10 +5 por categoria: falhando, perde 2d8+2 de Sanidade; passando, perde 1d8+1 e o item recebe a maldição até o fim da missão. Maldições sobem a categoria, e nenhum item passa da IV.",
      { automacao: "parcial",
        nota: "Memorizar e aplicar ficam no menu do item (“Maldições do Maledictólogo…”). A maldição aplicada fica marcada como temporária, até o fim da missão." }),
    trilha("maledictologo", 99, "maldicaoSuprema", "Maldição Suprema", AS1, 45,
      "Em Reproduzir Maldição, o item conta como três categorias a menos: um item IV conta como I, e recebe maldições até voltar à IV.",
      { automacao: "calculo", dependeDe: "reproduzirMaldicao", nota: "O limite de categoria de Reproduzir Maldição já desconta as três categorias." }),
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
    /* OPRPG p. 172 e SAH p. 31, com o mesmo texto. É uma AÇÃO no teste:
       1 PE por +2 naquele teste. Não é bônus permanente em perícia
       nenhuma. */
    entrada({ chave: "empenho", nome: "Empenho", tipo: "automatica", classes: ["mundano", "sobrevivente"], pagina: 172,
      paginas: { sobrevivente: 31 },
      resumo: "Ao fazer um teste de perícia, gaste 1 PE para receber +2 nesse teste.",
      automacao: "parcial",
      nota: "Na rolagem de perícia, a ficha oferece o Empenho: gasta 1 PE (ou PD) e soma +2 só naquele teste." }),
  ];

  /* =================================================================
     SOBREVIVENTE — SAH p. 31-32
     -----------------------------------------------------------------
     Habilidades que chegam por ESTÁGIO, não por NEX. As trilhas dão
     duas cada (2º e 4º estágio); Cicatrizado chega no 5º.
     ================================================================= */

  function sobrevivente(chaveTrilha, estagio, chave, nome, pagina, resumo, extra) {
    return entrada(Object.assign({
      chave: chave, nome: nome, tipo: "sobrevivente", trilhaSobrevivente: chaveTrilha, estagio: estagio,
      classes: ["sobrevivente"], fonte: SAH, pagina: pagina, resumo: resumo,
    }, extra || {}));
  }

  var HABILIDADES_SOBREVIVENTE = [
    sobrevivente("durao", 2, "durao", "Durão", 31,
      "Você recebe +4 PV. Quando subir para o 3º estágio, recebe +2 PV.",
      { efeitos: [{ tipo: "pvFixo", valor: 4 }], automacao: "calculo",
        nota: "Os +4 PV entram no 2º estágio; os +2, a partir do 3º." }),
    sobrevivente("durao", 4, "pancadaForte", "Pancada Forte", 31,
      "Ao fazer um ataque, gaste 1 PE para receber +1 dado no teste de ataque.",
      { automacao: "informacao",
        substituicao: { classe: "combatente", habilidade: "ataqueEspecial", custo: -1,
          texto: "Virando combatente, Pancada Forte some e Ataque Especial custa 1 PE a menos (SAH p. 31)." } }),
    sobrevivente("esperto", 2, "esperto", "Esperto", 32,
      "Você se torna treinado em uma perícia adicional à sua escolha.",
      { opcoes: [{ chave: "pericia", tipo: "pericia", modo: "treinar", rotulo: "Perícia adicional" }],
        efeitos: [{ tipo: "treinar", opcao: "pericia" }], automacao: "calculo" }),
    sobrevivente("esperto", 4, "entendido", "Entendido", 32,
      "Em duas perícias treinadas (exceto Luta e Pontaria), gaste 1 PE para somar +1d4 ao teste.",
      { opcoes: [{ chave: "pericias", tipo: "pericias", quantidade: 2, exceto: ["luta", "pontaria"], modo: "treinada",
          rotulo: "Perícias de Entendido" }],
        automacao: "informacao",
        substituicao: { classe: "especialista", habilidade: "perito", custo: -1,
          texto: "Virando especialista, Entendido some e Perito custa 1 PE a menos (SAH p. 32)." } }),
    sobrevivente("esoterico", 2, "esoterico", "Esotérico", 32,
      "Ação padrão e 1 PE: você sente energias paranormais em alcance curto. O mestre diz o que você percebe, se houver algo.",
      { automacao: "informacao" }),
    sobrevivente("esoterico", 4, "iniciado", "Iniciado", 32,
      "Você aprende e pode conjurar um ritual de 1º círculo à sua escolha — mesmo em NEX 0%. Virando ocultista, ele se soma aos três rituais de Escolhido pelo Outro Lado.",
      { automacao: "parcial",
        nota: "O ritual é escolhido pela biblioteca, como qualquer concessão, e fica preso a esta habilidade." }),
    entrada({ chave: "cicatrizado", nome: "Cicatrizado", tipo: "sobrevivente", classes: ["sobrevivente"], estagio: 5,
      fonte: SAH, pagina: 31,
      resumo: "Um perigo paranormal de um elemento deixou trauma: –1 dado em testes de resistência contra ele. Uma vez por sessão, como reação, sacrifique 1 PV para sempre para ignorar um dano mental ou gasto de PE, ou 1 PE para sempre para reduzir um dano físico à metade.",
      opcoes: [
        { chave: "elemento", tipo: "elemento", comMedo: true, rotulo: "Elemento do perigo" },
        { chave: "perigo", tipo: "texto", rotulo: "O perigo enfrentado", dica: "um tipo de criatura, um culto, um lugar…", limite: 80 },
      ],
      automacao: "parcial",
      nota: "O –1 dado vale só contra aquele perigo: a mesa decide quando ele se aplica. Os sacrifícios ficam registrados e tiram PV ou PE do máximo, para sempre." }),
  ];

  /* O treinamento que transforma quem não é agente em agente. Um por
     transição e classe, montado a partir de RAMAOrdemCatalogo.TRANSICOES
     — o catálogo diz os ganhos, e aqui eles viram opções a escolher. */
  function treinamentosDeTransicao() {
    var CAT = global.RAMAOrdemCatalogo;
    if (!CAT || !CAT.TRANSICOES) return [];
    var lista = [];
    Object.keys(CAT.TRANSICOES).forEach(function (de) {
      var t = CAT.TRANSICOES[de];
      Object.keys(t.classes).forEach(function (para) {
        var g = t.classes[para];
        var opcoes = [];
        var efeitos = [];
        g.pericias.pares.forEach(function (par, i) {
          var nomes = par.map(function (k) { var pr = CAT.pericia(k); return pr ? pr.nome : k; });
          opcoes.push({ chave: "par" + i, tipo: "pericia", entre: par.slice(), modo: "treinar", rotulo: nomes.join(" ou ") });
          efeitos.push({ tipo: "treinar", opcao: "par" + i });
        });
        g.pericias.fixas.forEach(function (k) {
          efeitos.push({ tipo: "grauMinimo", pericia: k, grau: "treinado" });
        });
        if (g.pericias.livres) {
          opcoes.push({ chave: "livres", tipo: "pericias", quantidade: g.pericias.livres, modo: "treinar",
            rotulo: g.pericias.livres + " perícias à sua escolha" });
          efeitos.push({ tipo: "treinarLista", opcao: "livres" });
        }
        var nomeClasse = CAT.classe(para) ? CAT.classe(para).nome : para;
        var ganhos = [];
        if (g.pv) ganhos.push("+" + g.pv + " PV");
        if (g.pe) ganhos.push("+" + g.pe + " PE");
        if (g.san) ganhos.push("+" + g.san + " SAN");
        lista.push(entrada({
          chave: "treinamento." + de + "." + para,
          nome: t.titulo + " · " + nomeClasse,
          tipo: "treinamento",
          classes: [para],
          fonte: t.fonte, pagina: t.pagina,
          resumo: (ganhos.length ? ganhos.join(", ") + "; " : "") + "perícias: " +
            [].concat(g.pericias.pares.map(function (par) { return par.map(function (k) { return CAT.pericia(k).nome; }).join(" ou "); }))
              .concat(g.pericias.fixas.map(function (k) { return CAT.pericia(k).nome; }))
              .concat(g.pericias.livres ? [g.pericias.livres + " à sua escolha"] : []).join(", ") +
            "; proficiências: " + (g.proficiencias.length ? g.proficiencias.join(" e ") : "nenhuma") +
            "; habilidades: " + g.habilidades.join(" e ") + ".",
          opcoes: opcoes,
          efeitos: efeitos,
          automacao: "calculo",
        }));
      });
    });
    return lista;
  }

  var TREINAMENTOS = treinamentosDeTransicao();

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
    /* Empenho existe em NEX 0%: é justamente de quem ainda não é agente. */
    empenho: 0,
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

  var TODOS = [].concat(PODERES_CLASSE, PODERES_GERAIS, PODERES_PARANORMAIS, PODERES_INTENCAO, PODERES_SACRIFICIO, HABILIDADES_TRILHA, AUTOMATICAS, ALTERACOES_GERAIS,
    HABILIDADES_SOBREVIVENTE, TREINAMENTOS);

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

  /* As habilidades de uma trilha de Sobrevivente, pelo estágio. */
  function habilidadesDaTrilhaSobrevivente(chaveTrilha) {
    return HABILIDADES_SOBREVIVENTE.filter(function (h) { return h.trilhaSobrevivente === chaveTrilha; })
      .sort(function (a, b) { return a.estagio - b.estagio; });
  }

  function treinamento(de, para) { return POR_CHAVE["treinamento." + de + "." + para] || null; }

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
    var C = global.RAMAOrdemCatalogo;
    var livro = C && C.nomeDoLivro ? C.nomeDoLivro(p.fonte) : (p.fonte === SAH ? "Sobrevivendo ao Horror" : "Ordem Paranormal RPG");
    return livro + ", p. " + paginaPara(p, classe);
  }

  global.RAMAOrdemPoderes = {
    FONTES: { OPRPG: OPRPG, SAH: SAH, AS1: AS1, AS2: AS2, AS3: AS3 },
    PODERES_CLASSE: PODERES_CLASSE,
    PODERES_GERAIS: PODERES_GERAIS,
    PODERES_PARANORMAIS: PODERES_PARANORMAIS,
    PODERES_INTENCAO: PODERES_INTENCAO,
    PODERES_SACRIFICIO: PODERES_SACRIFICIO,
    HABILIDADES_TRILHA: HABILIDADES_TRILHA,
    AUTOMATICAS: AUTOMATICAS,
    ESTAGIOS: ESTAGIOS,
    NEX_INICIAL_AUTOMATICA: NEX_INICIAL_AUTOMATICA,
    NEX_DE_ALTERACAO: NEX_DE_ALTERACAO,
    ALTERACOES_GERAIS: ALTERACOES_GERAIS,
    HABILIDADES_SOBREVIVENTE: HABILIDADES_SOBREVIVENTE,
    TREINAMENTOS: TREINAMENTOS,
    TODOS: TODOS,

    poder: poder,
    poderesDeClasse: poderesDeClasse,
    pertenceAClasse: pertenceAClasse,
    habilidadesDaTrilha: habilidadesDaTrilha,
    habilidadesDaTrilhaSobrevivente: habilidadesDaTrilhaSobrevivente,
    treinamento: treinamento,
    primeiraDaTrilha: primeiraDaTrilha,
    paginaPara: paginaPara,
    referencia: referencia,
  };
})(typeof window !== "undefined" ? window : globalThis);
