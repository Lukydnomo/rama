/* =====================================================================
   R.A.M.A. — Tormenta20 · classes (3/3): Ladino, Lutador, Nobre,
   Paladino (formato em classes-a.js)
   ===================================================================== */

(function (global) {
  "use strict";

  var C = global.RAMATormenta20Classes = global.RAMATormenta20Classes || { CLASSES: [], CLASSE: {} };
  function registrar(c) { c.fonte = "T20"; C.CLASSES.push(c); C.CLASSE[c.id] = c; }
  function tabela(linhas) { var t = {}; linhas.forEach(function (l, i) { t[i + 1] = l; }); return t; }
  function poderes20(primeiro, extra) { var l = [primeiro]; for (var i = 2; i <= 20; i++) l.push((extra[i] || []).concat(["poder"])); return l; }
  var AUMENTO = { id: "aumentoDeAtributo", nome: "Aumento de Atributo", resumo: "+1 em um atributo; várias vezes, uma vez por patamar para o mesmo atributo.", repetivel: true, aumento: true };
  var LIVRE = "exige liberdade de movimentos (sem armadura pesada, não imóvel)";

  /* ---------------------------------------------------------- LADINO */
  registrar({
    id: "ladino", nome: "Ladino", pagina: 72, atributo: "Destreza ou Inteligência",
    pv: { inicial: 12, nivel: 3 }, pm: 4,
    pericias: { fixas: ["ladinagem", "reflexos"], escolha: { n: 8, de: ["acrobacia", "atletismo", "atuacao", "cavalgar", "conhecimento", "diplomacia", "enganacao", "furtividade", "iniciativa", "intimidacao", "intuicao", "investigacao", "jogatina", "luta", "oficio", "percepcao", "pilotagem", "pontaria"] } },
    proficiencias: [],
    tabela: tabela(poderes20(["ataqueFurtivo", "especialista"], { 2: ["evasao"], 4: ["esquivaSobrenatural"], 8: ["olhosNasCostas"], 10: ["evasaoAprimorada"], 20: ["pessoaCerta"] })),
    habilidades: {
      ataqueFurtivo: { nome: "Ataque Furtivo", resumo: "Uma vez por rodada, ao atingir criatura desprevenida (corpo a corpo ou alcance curto) ou que você flanqueia: +1d6 de dano; +1d6 a cada dois níveis. Imune a crítico é imune a furtivo.",
        furtivo: { dados: "ceil(nc / 2)", faces: 6 } },
      especialista: { nome: "Especialista", resumo: "Perícias treinadas em número igual à Inteligência (mín. 1): nelas, 1 PM dobra o bônus de treino (exceto ataques).",
        escolhas: [{ id: "pericias", tipo: "periciaTreinada", quantidade: "max(1, atr.int)" }], opcaoDeTeste: { id: "especialista", custo: 1, dobraTreino: true, escolhidas: "pericias", exceto: ["ataque"] } },
      evasao: { nome: "Evasão", resumo: "Passou em Reflexos para metade do dano: não sofre dano. " + LIVRE + ".", efeitos: [{ t: "evasao", auto: "livreMovimento" }] },
      poder: { nome: "Poder de Ladino", poder: true },
      esquivaSobrenatural: { nome: "Esquiva Sobrenatural", resumo: "Nunca fica surpreendido.", efeitos: [{ t: "imune", valor: "surpreendido" }] },
      olhosNasCostas: { nome: "Olhos nas Costas", resumo: "Não pode ser flanqueado.", efeitos: [{ t: "imune", valor: "flanqueado" }] },
      evasaoAprimorada: { nome: "Evasão Aprimorada", resumo: "Reflexos para metade: passou, nada; falhou, metade. " + LIVRE + ".", efeitos: [{ t: "evasao", aprimorada: true, auto: "livreMovimento" }] },
      pessoaCerta: { nome: "A Pessoa Certa para o Trabalho", resumo: "Em ataque furtivo ou perícia da lista de ladino, 5 PM para +10 no teste.", opcaoDeTeste: { id: "pessoaCerta", custo: 5, bonus: 10, listaDaClasse: true } },
    },
    poderes: [
      { id: "assassinar", nome: "Assassinar", resumo: "Ação de movimento e 3 PM: até o fim do próximo turno, o primeiro Ataque Furtivo que ferir a criatura analisada dobra os dados do furtivo.", req: { nc: 5 }, acao: { custo: 3, execucao: "movimento", alcance: "curto", duracao: "ate o fim do proximo turno", efeitos: [{ t: "dobraFurtivo" }] } },
      AUMENTO,
      { id: "contatosNoSubmundo", nome: "Contatos no Submundo", resumo: "Numa vila ou maior, 2 PM e Carisma CD 10: +5 em Investigação para interrogar, 20% de desconto em itens mundanos, poções e pergaminhos e acesso a itens proibidos." },
      { id: "emboscar", nome: "Emboscar", resumo: "Na primeira rodada de cada combate, 2 PM para uma ação padrão adicional.", req: { pericias: ["furtividade"] } },
      { id: "escapista", nome: "Escapista", resumo: "+5 em Acrobacia para escapar, passar por espaço apertado e por inimigo, e contra efeitos de movimento." },
      { id: "fugaFormidavel", nome: "Fuga Formidável", resumo: "Ação completa e 1 PM: até o fim da cena, +3m de deslocamento, +5 em Acrobacia e Atletismo e ignora terreno difícil, enquanto só fugir.", req: { atr: { "int": 1 } },
        acao: { custo: 1, execucao: "completa", duracao: "cena", efeitos: [{ t: "bonus", alvo: "deslocamento", valor: 3 }, { t: "bonus", alvo: "pericia.acrobacia", valor: 5 }, { t: "bonus", alvo: "pericia.atletismo", valor: 5 }] } },
      { id: "gatuno", nome: "Gatuno", resumo: "+2 em Atletismo; escalando, não fica desprevenido e usa o deslocamento normal.", efeitos: [{ t: "bonus", alvo: "pericia.atletismo", valor: 2 }] },
      { id: "ladraoArcano", nome: "Ladrão Arcano", resumo: "Furtivo que fere conjurador: 1 PM por círculo para 'roubar' uma magia (até 4º) que viu ele lançar e lançá-la até o fim da cena (Inteligência).", req: { poderes: ["rouboDeMana"], nc: 13 } },
      { id: "maoNaBoca", nome: "Mão na Boca", resumo: "+2 para agarrar; acertando furtivo em desprevenido, agarra como ação livre e a criatura não fala.", req: { pericias: ["luta"] }, efeitos: [{ t: "bonus", alvo: "manobra.agarrar", valor: 2 }] },
      { id: "maosRapidas", nome: "Mãos Rápidas", resumo: "Uma vez por rodada, 1 PM para abrir fechadura, ocultar, punga ou sabotar como ação livre.", req: { atr: { des: 2 }, pericias: ["ladinagem"] } },
      { id: "menteCriminosa", nome: "Mente Criminosa", resumo: "Soma a Inteligência em Ladinagem e Furtividade.", req: { atr: { "int": 1 } }, efeitos: [{ t: "bonus", alvo: "pericia.ladinagem", valor: "atr.int" }, { t: "bonus", alvo: "pericia.furtividade", valor: "atr.int" }] },
      { id: "oportunismo", nome: "Oportunismo", resumo: "Uma vez por rodada, inimigo adjacente ferido por aliado: 2 PM para um ataque corpo a corpo contra ele.", req: { nc: 6 } },
      { id: "rolamentoDefensivo", nome: "Rolamento Defensivo", resumo: "Ao sofrer dano, 2 PM para reduzi-lo à metade e ficar caído.", req: { pericias: ["reflexos"] }, reacao: { custo: 2, gatilho: "sofrer dano", efeito: "metade do dano; fica caído" } },
      { id: "rouboDeMana", nome: "Roubo de Mana", resumo: "Furtivo que fere: 1 PM temporário por d6 do furtivo e a criatura perde 1 PM; uma vez por cena por criatura.", req: { poderes: ["truqueMagico"], nc: 7 } },
      { id: "saqueadorDeTumbas", nome: "Saqueador de Tumbas", resumo: "+5 em Investigação para achar armadilhas e nas resistências contra elas; desabilita mecanismos com ação padrão." },
      { id: "sombra", nome: "Sombra", resumo: "+2 em Furtividade; sem penalidade por mover o deslocamento normal; atacar dá –10 (em vez de –20).", req: { pericias: ["furtividade"] }, efeitos: [{ t: "bonus", alvo: "pericia.furtividade", valor: 2 }] },
      { id: "truqueMagico", nome: "Truque Mágico", resumo: "Aprende e lança uma magia arcana de 1º círculo (Inteligência).", req: { atr: { "int": 1 } }, repetivel: true, escolhas: [{ id: "magia", tipo: "magia", circulo: 1, tipoMagia: "arcana", quantidade: 1, efeito: { t: "magia", atributo: "int" } }] },
      { id: "velocidadeLadina", nome: "Velocidade Ladina", resumo: "Uma vez por rodada, 2 PM para uma ação de movimento adicional.", req: { atr: { des: 2 }, pericias: ["iniciativa"] } },
      { id: "venenoPersistente", nome: "Veneno Persistente", resumo: "Veneno aplicado dura três ataques.", req: { poderes: ["venenoPotente"], nc: 8 } },
      { id: "venenoPotente", nome: "Veneno Potente", resumo: "+5 na CD dos venenos que você usa.", req: { pericias: ["oficio:alquimista"] } },
    ],
  });

  /* --------------------------------------------------------- LUTADOR */
  registrar({
    id: "lutador", nome: "Lutador", pagina: 75, atributo: "Força",
    pv: { inicial: 20, nivel: 5 }, pm: 3,
    pericias: { fixas: ["fortitude", "luta"], escolha: { n: 4, de: ["acrobacia", "adestramento", "atletismo", "enganacao", "furtividade", "iniciativa", "intimidacao", "oficio", "percepcao", "pontaria", "reflexos"] } },
    proficiencias: [],
    tabela: tabela(poderes20(["briga", "golpeRelampago"], { 3: ["cascaGrossa"], 5: ["golpeCruel"], 9: ["golpeViolento"], 20: ["donoDaRua"] })),
    habilidades: {
      briga: { nome: "Briga", resumo: "Desarmado causa 1d6 (letal ou não letal, sem penalidade); 1d8 no 5º, 1d10 no 9º, 2d6 no 13º, 2d8 no 17º, 2d10 no 20º. Para Pequenos e Médios; Minúsculos –1 passo, Grandes e Enormes +1, Colossais +2.",
        efeitos: [{ t: "danoDesarmado", valor: "nc >= 20 ? '2d10' : nc >= 17 ? '2d8' : nc >= 13 ? '2d6' : nc >= 9 ? '1d10' : nc >= 5 ? '1d8' : '1d6'" }] },
      golpeRelampago: { nome: "Golpe Relâmpago", resumo: "Ao agredir desarmado, 1 PM para um ataque desarmado adicional.", opcaoDeAtaque: { id: "golpeRelampago", custo: 1, ataqueExtra: true, desarmado: true } },
      poder: { nome: "Poder de Lutador", poder: true },
      cascaGrossa: { nome: "Casca Grossa", resumo: "Soma a Constituição na Defesa (limitada pelo nível, sem armadura pesada); +1 na Defesa no 7º e a cada quatro níveis.",
        efeitos: [{ t: "bonus", alvo: "defesa", valor: "min(atr.con, nivel)", auto: "semArmaduraPesada", atributoUnico: "con" }, { t: "bonus", alvo: "defesa", valor: "max(0, floor((nc - 3) / 4))", auto: "semArmaduraPesada" }] },
      golpeCruel: { nome: "Golpe Cruel", resumo: "+1 na margem de ameaça desarmado.", efeitos: [{ t: "bonus", alvo: "margem.desarmado", valor: 1 }] },
      golpeViolento: { nome: "Golpe Violento", resumo: "+1 no multiplicador de crítico desarmado.", efeitos: [{ t: "bonus", alvo: "mult.desarmado", valor: 1 }] },
      donoDaRua: { nome: "Dono da Rua", resumo: "Desarmado 2d10; ao agredir desarmado faz dois ataques (três com Golpe Relâmpago)." },
    },
    poderes: [
      { id: "armaImprovisada", nome: "Arma Improvisada", resumo: "Armas improvisadas contam como desarmado com dano +1 passo; ação de movimento e Percepção CD 20 para achar uma; erro com d20 ímpar a quebra." },
      { id: "ateAcertar", nome: "Até Acertar", resumo: "Errar ataque desarmado dá +2 cumulativo em ataque e dano desarmado contra o oponente até acertar ou o fim da cena.", contador: { id: "ateAcertar", passo: 2 } },
      AUMENTO,
      { id: "bracosCalejados", nome: "Braços Calejados", resumo: "Sem armadura, soma a Força na Defesa (limitada pelo nível).", efeitos: [{ t: "bonus", alvo: "defesa", valor: "min(atr.for, nivel)", auto: "semArmadura", atributoUnico: "for" }] },
      { id: "cabecada", nome: "Cabeçada", resumo: "Ataque desarmado: 2 PM para o oponente ficar desprevenido contra ele (uma vez por cena por alvo).", opcaoDeAtaque: { id: "cabecada", custo: 2, desarmado: true, alvoDesprevenido: true } },
      { id: "chave", nome: "Chave", resumo: "Agarrando, manobra para causar dano tem dano desarmado +1 passo.", req: { atr: { "int": 1 }, poderes: ["lutadorDeChao"], nc: 4 } },
      { id: "confiancaDosRingues", nome: "Confiança dos Ringues", resumo: "Inimigo erra ataque corpo a corpo em você: 2 PM temporários (até o nível por cena).", req: { nc: 8 } },
      { id: "convencido", nome: "Convencido", resumo: "Resistência a medo e mental +5.", efeitos: [{ t: "bonus", alvo: "resist.medo", valor: 5 }, { t: "bonus", alvo: "resist.mental", valor: 5 }] },
      { id: "golpeBaixo", nome: "Golpe Baixo", resumo: "Ataque desarmado: 2 PM; acertando, Fortitude (CD For) ou atordoado 1 rodada (uma vez por cena).", opcaoDeAtaque: { id: "golpeBaixo", custo: 2, desarmado: true, aoAcertar: true, resistencia: { pericia: "fortitude", atributo: "for" }, condicao: { id: "atordoado", duracao: "1 rodada" } } },
      { id: "golpeImprudente", nome: "Golpe Imprudente", resumo: "Com Golpe Relâmpago, ataques desarmados ganham um dado extra, com –5 na Defesa até o próximo turno.", opcaoDeAtaque: { id: "golpeImprudente", custo: 0, dadoExtra: 1, desarmado: true, penalidade: { alvo: "defesa", valor: -5 } } },
      { id: "imobilizacao", nome: "Imobilização", resumo: "Agarrando, ação completa e manobra: a criatura fica indefesa e só tenta se soltar.", req: { poderes: ["chave"], nc: 8 } },
      { id: "linguaDosBecos", nome: "Língua dos Becos", resumo: "1 PM: usa Força no lugar de Carisma numa perícia de Carisma.", req: { atr: { "for": 1 }, pericias: ["intimidacao"] }, opcaoDeTeste: { id: "linguaDosBecos", custo: 1, trocaAtributo: { de: "car", para: "for" } } },
      { id: "lutadorDeChao", nome: "Lutador de Chão", resumo: "+2 para agarrar e derrubar; agarrando, 1 PM para derrubar como ação livre.", efeitos: [{ t: "bonus", alvo: "manobra.agarrar", valor: 2 }, { t: "bonus", alvo: "manobra.derrubar", valor: 2 }] },
      { id: "nomeNaArena", nome: "Nome na Arena", resumo: "Uma vez por cena, ação completa e Luta CD 10: +2 em perícias de Carisma até o fim da cena (+2 a cada 10 acima) e fãs de luta melhoram a atitude.", req: { nc: 11 } },
      { id: "punhosDeAdamante", nome: "Punhos de Adamante", resumo: "Ataques desarmados ignoram 10 de RD.", req: { nc: 8 } },
      { id: "rasteira", nome: "Rasteira", resumo: "Ataque desarmado contra criatura até uma categoria maior: 2 PM; acertando, ela fica caída.", opcaoDeAtaque: { id: "rasteira", custo: 2, desarmado: true, aoAcertar: true, condicao: { id: "caido" } } },
      { id: "sarado", nome: "Sarado", resumo: "Soma a Força nos PV e em Fortitude; usa Força em Diplomacia com quem se atrai por físicos definidos.", req: { atr: { "for": 3 } }, efeitos: [{ t: "bonus", alvo: "pv", valor: "atr.for", atributoUnico: "for" }, { t: "bonus", alvo: "pericia.fortitude", valor: "atr.for" }] },
      { id: "sequenciaDestruidora", nome: "Sequência Destruidora", resumo: "No início do turno, 2 PM e diz um número (≥2): acertando essa quantidade de ataques, o último ganha +4 de dano por ataque feito.", req: { poderes: ["trocacao"], nc: 12 } },
      { id: "trincado", nome: "Trincado", resumo: "Soma a Constituição no dano desarmado.", req: { atr: { con: 3 }, poderes: ["sarado"], nc: 10 }, efeitos: [{ t: "bonus", alvo: "dano.desarmado", valor: "atr.con" }] },
      { id: "trocacao", nome: "Trocação", resumo: "Ao acertar desarmado, novo ataque contra o mesmo alvo pagando PM igual aos ataques já feitos no turno, até errar ou acabar a mana.", req: { nc: 6 } },
      { id: "trocacaoTumultuosa", nome: "Trocação Tumultuosa", resumo: "Ao agredir desarmado, 2 PM antes de rolar: um teste contra a Defesa de todas as criaturas adjacentes (aliados inclusive).", req: { poderes: ["trocacao"], nc: 8 } },
      { id: "valentao", nome: "Valentão", resumo: "+2 no ataque e no dano contra oponentes caídos, desprevenidos, flanqueados ou indefesos.", efeitos: [{ t: "bonus", alvo: "ataque", valor: 2, cond: "alvo caído, desprevenido, flanqueado ou indefeso" }, { t: "bonus", alvo: "dano", valor: 2, cond: "alvo caído, desprevenido, flanqueado ou indefeso" }] },
      { id: "voadora", nome: "Voadora", resumo: "Investida desarmada: 2 PM para +1d6 de dano por 3m percorridos (limitado pelo nível).", opcaoDeAtaque: { id: "voadora", custo: 2, desarmado: true, manobra: "investida", danoPorDistancia: "1d6 por 3m" } },
    ],
  });

  /* ----------------------------------------------------------- NOBRE */
  registrar({
    id: "nobre", nome: "Nobre", pagina: 78, atributo: "Carisma",
    pv: { inicial: 16, nivel: 4 }, pm: 4,
    pericias: { fixas: ["vontade"], ou: [["diplomacia", "intimidacao"]], escolha: { n: 4, de: ["adestramento", "atuacao", "cavalgar", "conhecimento", "diplomacia", "enganacao", "fortitude", "guerra", "iniciativa", "intimidacao", "intuicao", "investigacao", "jogatina", "luta", "nobreza", "oficio", "percepcao", "pontaria"] } },
    proficiencias: ["marciais", "pesadas", "escudos"],
    tabela: tabela(poderes20(["autoconfianca", "espolio", "orgulho"], { 2: ["palavrasAfiadas"], 3: ["riqueza"], 4: ["gritarOrdens"], 5: ["presencaAristocratica"], 20: ["realeza"] })),
    habilidades: {
      autoconfianca: { nome: "Autoconfiança", resumo: "Usa Carisma no lugar de Destreza na Defesa (armadura pesada continua sem atributo).", efeitos: [{ t: "atrDefesa", atributo: "car", substitui: "des", opcional: true }] },
      espolio: { nome: "Espólio", resumo: "Um item à escolha de até T$ 2.000.", itemInicial: { ate: 2000 } },
      orgulho: { nome: "Orgulho", resumo: "Num teste de perícia, até Car PM: +2 por PM.", opcaoDeTeste: { id: "orgulho", custo: 1, escala: { pm: 1, max: "atr.car - 1" }, bonus: "2 + 2 * x" } },
      poder: { nome: "Poder de Nobre", poder: true },
      palavrasAfiadas: { nome: "Palavras Afiadas", resumo: "Ação padrão e 1 PM: Diplomacia ou Intimidação contra a Vontade de criatura inteligente em alcance curto; vence 2d6 de dano psíquico não letal, perde metade. A 0 PV, rende-se (Diplomacia) ou foge apavorada (Intimidação). A cada quatro níveis, +1 PM por +2d6.",
        acao: { id: "palavrasAfiadas", custo: 1, execucao: "padrao", alcance: "curto", teste: { pericia: ["diplomacia", "intimidacao"], contra: "vontade" }, escala: { pm: 1, max: "floor((nc - 2) / 4)", rotulo: "+2d6" }, dano: { dados: "(2 + 2 * x)d6", tipo: "psiquico", naoLetal: true, metadeSePerder: true } } },
      riqueza: { nome: "Riqueza", resumo: "Uma vez por aventura, Carisma + nível de nobre: recebe esse total em TO (se a família, patrono ou negócios alcançarem você).", teste: { atributo: "car", bonus: "nc", recompensa: "TO" } },
      gritarOrdens: { nome: "Gritar Ordens", resumo: "Até Car PM: aliados em alcance curto recebem +1 por PM nos testes de perícia até o início do seu próximo turno.", acao: { custo: 1, execucao: "livre", alcance: "curto", alvos: "aliados", duracao: "ate o proximo turno", escala: { pm: 1, max: "atr.car - 1" }, efeitos: [{ t: "bonus", alvo: "pericias", valor: "1 + x" }] } },
      presencaAristocratica: { nome: "Presença Aristocrática", resumo: "Quando criatura inteligente tenta feri-lo, 2 PM: Vontade (CD Car) ou não consegue e perde a ação. Uma vez por cena por criatura.", reacao: { custo: 2, gatilho: "criatura inteligente tenta feri-lo", resistencia: { pericia: "vontade", atributo: "car", bonusCd: "tem.realeza ? 5 : 0" } } },
      realeza: { nome: "Realeza", resumo: "+5 na CD da Presença Aristocrática; falhar por 10 faz a criatura lutar a seu lado na cena. Quem chega a 0 PV por Palavras Afiadas passa a lutar a seu lado em vez de sofrer o dano." },
    },
    poderes: [
      { id: "armaduraBrilhante", nome: "Armadura Brilhante", resumo: "Com armadura pesada, soma o Carisma na Defesa (e não a Destreza).", req: { nc: 8 }, efeitos: [{ t: "atrDefesa", atributo: "car", comPesada: true }] },
      AUMENTO,
      { id: "autoridadeFeudal", nome: "Autoridade Feudal", resumo: "Uma hora e 2 PM: o povo o ajuda como parceiro iniciante até o fim da aventura (onde você tem influência).", req: { nc: 6 } },
      { id: "educacaoPrivilegiada", nome: "Educação Privilegiada", resumo: "Treinado em duas perícias de nobre.", escolhas: [{ id: "pericias", tipo: "pericia", quantidade: 2, daClasse: true, efeito: { t: "treino" } }] },
      { id: "estrategista", nome: "Estrategista", resumo: "Ação padrão e 1 PM por aliado em alcance curto (até Car): no próximo turno dele, ganha uma ação de movimento.", req: { atr: { "int": 1 }, pericias: ["guerra"], nc: 6 } },
      { id: "favor", nome: "Favor", resumo: "5 PM e uma hora ou mais: como persuasão, mas pode pedir favores caros, difíceis ou perigosos; falhando, não repete o pedido por uma semana." },
      { id: "general", nome: "General", resumo: "Aliados direcionados por Estrategista recebem 1d4 PM temporários até o fim do turno deles.", req: { poderes: ["estrategista"], nc: 12 } },
      { id: "gritoTiranico", nome: "Grito Tirânico", resumo: "Palavras Afiadas como ação completa: dados d8 e atinge todos os inimigos em alcance curto.", req: { nc: 8 } },
      { id: "inspirarConfianca", nome: "Inspirar Confiança", resumo: "Aliado em alcance curto faz um teste: 2 PM para ele rolar de novo." },
      { id: "inspirarGloria", nome: "Inspirar Glória", resumo: "Uma vez por rodada, 5 PM: aliado em alcance curto ganha uma ação padrão no próximo turno (uma vez por cena por aliado).", req: { poderes: ["inspirarConfianca"], nc: 8 } },
      { id: "jogoDaCorte", nome: "Jogo da Corte", resumo: "1 PM para rolar de novo Diplomacia, Intuição ou Nobreza." },
      { id: "liderarPeloExemplo", nome: "Liderar pelo Exemplo", resumo: "2 PM: até o início do próximo turno, ao passar num teste, aliados em alcance curto podem usar seu resultado na mesma perícia.", req: { nc: 6 } },
      { id: "linguaDeOuro", nome: "Língua de Ouro", resumo: "Ação padrão e 4 PM: efeito de Enfeitiçar com sugerir ação, em todas as criaturas no alcance (CD Car); não é mágico.", req: { poderes: ["linguaDePrata"], nc: 8 } },
      { id: "linguaDePrata", nome: "Língua de Prata", resumo: "Perícia de Carisma: 2 PM para +metade do nível.", opcaoDeTeste: { id: "linguaDePrata", custo: 2, bonus: "floor(nivel / 2)", atributos: ["car"] } },
      { id: "linguaRapida", nome: "Língua Rápida", resumo: "Mudar atitude como ação completa: –5 (em vez de –10)." },
      { id: "presencaMajestosa", nome: "Presença Majestosa", resumo: "Presença Aristocrática vale contra qualquer criatura com Inteligência e mais de uma vez por cena.", req: { nc: 16 } },
      { id: "titulo", nome: "Título", resumo: "Título de nobreza: em geral, 20 TO por nível de nobre no início de cada aventura ou um parceiro veterano.", req: { poderes: ["autoridadeFeudal"], nc: 10, mesa: "ter conquistado terras ou servido a um nobre que possa ser seu suserano" } },
      { id: "vozPoderosa", nome: "Voz Poderosa", resumo: "+2 em Diplomacia e Intimidação; habilidades de nobre de alcance curto passam a médio.", efeitos: [{ t: "bonus", alvo: "pericia.diplomacia", valor: 2 }, { t: "bonus", alvo: "pericia.intimidacao", valor: 2 }] },
    ],
  });

  /* -------------------------------------------------------- PALADINO */
  var JULGAMENTO = { execucao: "movimento", duracao: "cena", julgamento: true };
  registrar({
    id: "paladino", nome: "Paladino", pagina: 81, atributo: "Força e Carisma",
    pv: { inicial: 20, nivel: 5 }, pm: 3,
    pericias: { fixas: ["luta", "vontade"], escolha: { n: 2, de: ["adestramento", "atletismo", "cavalgar", "cura", "diplomacia", "fortitude", "guerra", "iniciativa", "intuicao", "nobreza", "percepcao", "religiao"] } },
    proficiencias: ["marciais", "pesadas", "escudos"],
    tabela: tabela(poderes20(["abencoado", "codigoDoHeroi", "golpeDivino"], { 2: ["curaPelasMaos"], 3: ["auraSagrada"], 5: ["bencaoDaJustica"], 20: ["vingadorSagrado"] })),
    habilidades: {
      abencoado: { nome: "Abençoado", resumo: "Soma o Carisma nos PM no 1º nível. Devoto de Azgher, Khalmyr, Lena, Lin-Wu, Marah, Tanna-Toh, Thyatis ou Valkaria, com dois poderes concedidos; ou paladino do bem: sem poder concedido e sem Obrigações & Restrições além do Código do Herói.",
        efeitos: [{ t: "bonus", alvo: "pmInicial", valor: "atr.car" }], devocao: { obrigatoria: true, poderesConcedidos: 2, deuses: ["azgher", "khalmyr", "lena", "linWu", "marah", "tannaToh", "thyatis", "valkaria"], bem: true } },
      codigoDoHeroi: { nome: "Código do Herói", resumo: "Mantém a palavra, não recusa ajuda a inocentes, não mente, trapaceia nem rouba. Violar: perde todos os PM até o próximo dia.", obrigacao: true },
      golpeDivino: { nome: "Golpe Divino", resumo: "Ataque corpo a corpo: 2 PM para somar o Carisma no ataque e +1d8 no dano; a cada quatro níveis, +1 PM por +1d8.",
        opcaoDeAtaque: { id: "golpeDivino", custo: 2, ataque: "atr.car", danoExtra: "(1 + x)d8", escala: { pm: 1, max: "floor((nc - 1) / 4)" }, corpo: true } },
      curaPelasMaos: { nome: "Cura pelas Mãos", resumo: "Ação de movimento e 1 PM: cura 1d8+1 PV num alvo em alcance corpo a corpo (você inclusive); a cada quatro níveis, +1 PM por +1d8+1. Fere mortos-vivos (luz, ataque desarmado). 6º: +1 PM anula abalado, apavorado, atordoado, cego, doente, exausto, fatigado ou surdo.",
        acao: { id: "curaPelasMaos", custo: 1, execucao: "movimento", alcance: "tem.compaixao ? 'curto' : 'toque'", escala: { pm: 1, max: "floor((nc - 2) / 4)", rotulo: "+1d8+1" }, cura: "tem.compaixao ? '(2 + 2 * x)d6 + (1 + x)' : '(1 + x)d8 + (1 + x)'" } },
      poder: { nome: "Poder de Paladino", poder: true },
      auraSagrada: { nome: "Aura Sagrada", resumo: "1 PM: aura de 9m (30m com Aura Poderosa), sustentada: você e aliados dentro somam seu Carisma nas resistências.",
        acao: { id: "auraSagrada", custo: 1, execucao: "livre", sustentada: true, alcance: "tem.auraPoderosa ? 'raio 30m' : 'raio 9m'", estado: "auraSagrada", efeitos: [{ t: "bonus", alvo: "resistencias", valor: "atr.car" }] } },
      bencaoDaJustica: { nome: "Bênção da Justiça", resumo: "Égide Sagrada (ação de movimento e 2 PM: você e aliados adjacentes +Car na Defesa até o fim da cena; 11º: 5 PM para refazer resistência contra magia e devolvê-la se for alvo único) ou Montaria Sagrada (ação de movimento e 2 PM: invoca a montaria; parceiro veterano, mestre no 11º).",
        escolhas: [{ id: "bencao", tipo: "opcao", fixa: true, opcoes: [["egide", "Égide Sagrada"], ["montaria", "Montaria Sagrada"]] }],
        caminhos: {
          egide: { acao: { custo: 2, execucao: "movimento", duracao: "cena", efeitos: [{ t: "bonus", alvo: "defesa", valor: "atr.car" }] } },
          montaria: { parceiro: "montariaSagrada", acao: { custo: 2, execucao: "movimento", duracao: "cena", texto: "Invoca a montaria sagrada." } },
        } },
      vingadorSagrado: { nome: "Vingador Sagrado", resumo: "Ação completa e 10 PM: até o fim da cena, voo 18m, RD 20 e Golpe Divino pela metade do custo com dois dados a mais.",
        acao: { custo: 10, execucao: "completa", duracao: "cena", estado: "vingadorSagrado", efeitos: [{ t: "deslocamento", tipo: "voo", base: 18 }, { t: "rd", valor: 20 }] } },
    },
    virtudesPM: [0, 1, 3, 6, 10, 15],
    poderes: [
      { id: "armaSagrada", nome: "Arma Sagrada", resumo: "Golpe Divino com a arma preferida do deus usa d12.", req: { devotoExceto: ["lena", "marah"] } },
      AUMENTO,
      { id: "auraAntimagia", nome: "Aura Antimagia", resumo: "Com a aura ativa, você e aliados nela podem rolar de novo resistências contra magia.", req: { nc: 14 } },
      { id: "auraArdente", nome: "Aura Ardente", resumo: "Com a aura ativa, no início dos seus turnos, espíritos e mortos-vivos escolhidos nela sofrem 5 + Car de dano de luz.", req: { nc: 10 } },
      { id: "auraDeCura", nome: "Aura de Cura", resumo: "Com a aura ativa, no início dos seus turnos, você e aliados escolhidos nela curam 5 + Car PV.", req: { nc: 6 }, inicioDeTurno: { estado: "auraSagrada", cura: "5 + atr.car" } },
      { id: "auraDeInvencibilidade", nome: "Aura de Invencibilidade", resumo: "Com a aura ativa, você e aliados nela ignoram o primeiro dano da cena.", req: { nc: 18 } },
      { id: "auraPoderosa", nome: "Aura Poderosa", resumo: "Raio da aura passa a 30m.", req: { nc: 6 } },
      { id: "fulgorDivino", nome: "Fulgor Divino", resumo: "Golpe Divino deixa inimigos em alcance curto ofuscados até o início do seu próximo turno." },
      { id: "julgamentoArrependimento", nome: "Julgamento Divino: Arrependimento", julgamento: true, resumo: "2 PM: inimigo em alcance curto; ao acertar você ou aliado, Vontade (CD Car) ou atordoado no próximo turno dele (uma vez por cena).", acao: Object.assign({ custo: 2, alcance: "curto", resistencia: { pericia: "vontade", atributo: "car" } }, JULGAMENTO) },
      { id: "julgamentoAutoridade", nome: "Julgamento Divino: Autoridade", julgamento: true, resumo: "1 PM: Diplomacia contra Vontade de criatura em alcance curto; vence, ela obedece um comando simples (uma vez por cena). Mental.", acao: Object.assign({ custo: 1, alcance: "curto", teste: { pericia: "diplomacia", contra: "vontade" }, descritores: ["mental"] }, JULGAMENTO) },
      { id: "julgamentoCoragem", nome: "Julgamento Divino: Coragem", julgamento: true, resumo: "2 PM: criatura em alcance curto (você inclusive) fica imune a medo e +2 no ataque contra o inimigo de maior ND.", acao: Object.assign({ custo: 2, alcance: "curto", efeitos: [{ t: "imune", valor: "medo" }] }, JULGAMENTO) },
      { id: "julgamentoIluminacao", nome: "Julgamento Divino: Iluminação", julgamento: true, resumo: "Marca inimigo em alcance curto: acertos corpo a corpo nele dão 2 PM temporários. Uma vez por cena.", acao: Object.assign({ custo: 0, alcance: "curto", limite: "cena" }, JULGAMENTO) },
      { id: "julgamentoJustica", nome: "Julgamento Divino: Justiça", julgamento: true, resumo: "2 PM: inimigo em alcance curto; ao causar dano a você ou aliado, Vontade (CD Car) ou sofre luz igual à metade do dano.", acao: Object.assign({ custo: 2, alcance: "curto", resistencia: { pericia: "vontade", atributo: "car" } }, JULGAMENTO) },
      { id: "julgamentoLibertacao", nome: "Julgamento Divino: Libertação", julgamento: true, resumo: "5 PM: cancela uma condição negativa de uma criatura em alcance curto.", acao: Object.assign({ custo: 5, alcance: "curto", removeCondicao: true }, JULGAMENTO) },
      { id: "julgamentoSalvacao", nome: "Julgamento Divino: Salvação", julgamento: true, resumo: "2 PM: inimigo em alcance curto; até o fim da cena, cada acerto corpo a corpo nele cura 5 PV.", acao: Object.assign({ custo: 2, alcance: "curto" }, JULGAMENTO) },
      { id: "julgamentoVindicacao", nome: "Julgamento Divino: Vindicação", julgamento: true, resumo: "2 PM: inimigo que feriu você ou aliados na cena: +1 no ataque e +1d8 no dano contra ele, –5 no ataque contra outros. 5º e a cada cinco níveis: +1 PM por +1/+1d8. Termina se ele ficar inconsciente.",
        acao: Object.assign({ custo: 2, escala: { pm: 1, max: "floor(nc / 5)", rotulo: "+1 e +1d8" }, efeitos: [{ t: "bonus", alvo: "ataque", valor: "1 + x", contraAlvo: true }, { t: "danoExtra", valor: "(1 + x)d8", contraAlvo: true }, { t: "bonus", alvo: "ataque", valor: -5, contraOutros: true }] }, JULGAMENTO) },
      { id: "julgamentoZelo", nome: "Julgamento Divino: Zelo", julgamento: true, resumo: "1 PM: alvo em alcance longo; na cena, movendo-se na direção dele, o deslocamento dobra.", acao: Object.assign({ custo: 1, alcance: "longo" }, JULGAMENTO) },
      { id: "orar", nome: "Orar", resumo: "Aprende e lança uma magia divina de 1º círculo (Sabedoria).", repetivel: true, escolhas: [{ id: "magia", tipo: "magia", circulo: 1, tipoMagia: "divina", quantidade: 1, efeito: { t: "magia", atributo: "sab" } }] },
      { id: "virtudeCaridade", nome: "Virtude Paladinesca: Caridade", virtude: true, resumo: "Habilidades de paladino com aliado como alvo custam –1 PM. Deve sempre ajudar os necessitados." },
      { id: "virtudeCastidade", nome: "Virtude Paladinesca: Castidade", virtude: true, resumo: "Imune a encantamento; +5 em Intuição para perceber blefes. Nunca cai em tentação.", efeitos: [{ t: "imune", valor: "encantamento" }, { t: "bonus", alvo: "pericia.intuicao", valor: 5, cond: "para perceber blefes" }] },
      { id: "compaixao", nome: "Virtude Paladinesca: Compaixão", virtude: true, resumo: "Cura pelas Mãos em alcance curto e 2d6+1 por PM." },
      { id: "virtudeHumildade", nome: "Virtude Paladinesca: Humildade", virtude: true, resumo: "Na 1ª rodada de combate, ação completa para rezar: PM temporários iguais ao Carisma até o fim da cena." },
      { id: "virtudeTemperanca", nome: "Virtude Paladinesca: Temperança", virtude: true, resumo: "Alimento, alquímico ou poção rende duas doses para você." },
    ],
  });
})(typeof window !== "undefined" ? window : globalThis);
