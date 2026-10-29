/* =====================================================================
   R.A.M.A. — Vampiro: A Máscara (V5) · Disciplinas, Rituais e Alquimia
   =====================================================================
   Livro Básico, p. 244–287 (página impressa; PDF = +2). Cada poder é um
   registro estruturado que o motor (js/vampiro/poderes.js) sabe aplicar:

     custo        { checagens: n }  Checagens de Sangue ao ativar;
                  { gratis: true }; { fdv: n }; { maculas: true };
                  { doPoder: true }  o custo do poder amplificado.
     parada       [[atributo, "disciplina"|habilidade], …] alternativas
     resistencia  [[…]] a parada do alvo (disputa)
     dificuldade  número fixo, quando há
     duracao      "passiva" | "turno" | "cena" | "noite" | "indefinida"
                  | "alimentacao" | "uso"
     amalgama     { disciplina, nivel } — exige a outra Disciplina
     prereq       chave de outro poder exigido
     efeitos      o que o motor aplica enquanto o poder está ativo
                  (mods de parada, Vitalidade, dano, redução de dano…)
     narrativo    true quando o efeito é decisão da mesa (o motor
                  resolve custo, teste e duração; o resto é registro)

   Nada de poderes de suplementos. Interpretações: docs/VAMPIRO.md.
   ===================================================================== */

(function (global) {
  "use strict";

  var DISCIPLINAS = {
    animalismo: { nome: "Animalismo", tipo: "mental", mascara: "baixa a média", ressonancia: "animal", pagina: 244 },
    auspicios: { nome: "Auspícios", tipo: "mental", mascara: "baixa", ressonancia: "fleumatica", pagina: 248 },
    celeridade: { nome: "Celeridade", tipo: "fisica", mascara: "média a alta", ressonancia: "colerica", pagina: 252 },
    dominacao: { nome: "Dominação", tipo: "mental", mascara: "baixa", ressonancia: "fleumatica", pagina: 254 },
    fortitude: { nome: "Fortitude", tipo: "fisica", mascara: "média", ressonancia: "melancolica", pagina: 257 },
    ofuscacao: { nome: "Ofuscação", tipo: "mental", mascara: "baixa", ressonancia: "melancolica", pagina: 260 },
    potencia: { nome: "Potência", tipo: "fisica", mascara: "média a alta", ressonancia: "colerica", pagina: 263 },
    presenca: { nome: "Presença", tipo: "mental", mascara: "baixa a média", ressonancia: "sanguinea", pagina: 265 },
    proteanismo: { nome: "Proteanismo", tipo: "fisica", mascara: "alta", ressonancia: "animal", pagina: 269 },
    feiticaria: { nome: "Feitiçaria de Sangue", tipo: "mental", mascara: "baixa a alta", ressonancia: "sanguinea", pagina: 271, rituais: true },
    alquimia: { nome: "Alquimia Sangue-Ralo", tipo: "especial", mascara: "varia", ressonancia: "", pagina: 282, soSangueRalo: true, formulas: true },
  };

  /* Atalho para montar poderes sem repetir as chaves. */
  function p(disciplina, nivel, chave, nome, pagina, o) {
    return Object.assign({ disciplina: disciplina, nivel: nivel, chave: chave, nome: nome, pagina: pagina, custo: { gratis: true }, duracao: "passiva" }, o || {});
  }
  var CH = function (n) { return { checagens: n || 1 }; };

  var PODERES = [
    /* ---------------- ANIMALISMO (p. 244–248) ---------------- */
    p("animalismo", 1, "famulusEnlacado", "Famulus Enlaçado", 245, { custo: { checagensExtras: 3, texto: "Alimentar o animal 3 noites com Sangue, uma Checagem cada" }, parada: [["carisma", "empatiaComAnimais"]], duracao: "indefinida", efeito: "Enlaça um animal como famulus (um por vez); ordens simples sem Sussurros: Carisma + Empatia com Animais, Dif 2+.", narrativo: true }),
    p("animalismo", 1, "sentirABesta", "Sentir a Besta", 245, { parada: [["determinacao", "disciplina"]], resistencia: [["autocontrole", "subterfugio"]], efeito: "Sente a Besta e a hostilidade de um alvo, e se é sobrenatural.", critico: "Tipo exato de criatura, Fome e Ressonância." }),
    p("animalismo", 2, "sussurrosSelvagens", "Sussurros Selvagens", 245, { custo: { checagens: 1, texto: "1 Checagem por tipo de animal na cena (grátis com o famulus)" }, parada: [["manipulacao", "disciplina"], ["carisma", "disciplina"]], duracao: "cena", efeito: "Conversa com animais; ordens Dif 3–6; convocar: Carisma + Animalismo pela escassez.", narrativo: true }),
    p("animalismo", 3, "enxameNaoVivo", "Enxame Não Vivo", 246, { amalgama: { disciplina: "ofuscacao", nivel: 2 }, efeito: "Estende os poderes de Animalismo a enxames: Vitalidade 5, parada 8 para resistir; −2 dados por distração; +1 a +3 Intimidação." }),
    p("animalismo", 3, "subjugarABesta", "Subjugar a Besta", 246, { custo: CH(1), parada: [["carisma", "disciplina"]], resistencia: [["vigor", "determinacao"]], duracao: "cena", efeito: "Mortal: letárgico na cena. Vampiro: não pode Surto de Sangue e é imune a críticos bestiais por turnos = margem.", critico: "Contra vampiro, encerra o frenesi." }),
    p("animalismo", 3, "suculenciaAnimal", "Suculência Animal", 247, { efeitos: { saciaAnimalExtra: 1, potenciaContraAnimal: -2, famulusSacia: 4 }, efeito: "Animais saciam +1 de Fome; a Potência conta 2 a menos para a penalidade de animal; consumir o famulus sacia 4 (nunca o último dado de Fome)." }),
    p("animalismo", 4, "comunhaoDeEspiritos", "Comunhão de Espíritos", 247, { custo: { checagens: 1, texto: "1 Checagem (grátis no famulus)" }, parada: [["manipulacao", "disciplina"]], dificuldade: 4, duracao: "cena", efeito: "Habita um animal; o corpo fica como em Torpor; morte do animal: 1 Agravado à FdV.", critico: "Indefinidamente.", narrativo: true }),
    p("animalismo", 5, "controleAnimal", "Controle Animal", 247, { custo: CH(2), parada: [["carisma", "disciplina"]], duracao: "cena", efeito: "Comanda um grupo de animais (Dif 3 a 5 pela natureza da ordem).", narrativo: true }),
    p("animalismo", 5, "expulsarABesta", "Expulsar a Besta", 247, { custo: CH(1), parada: [["raciocinio", "disciplina"]], resistencia: [["autocontrole", "determinacao"]], duracao: "uso", efeitos: { substituiFrenesi: ["furia", "terror"] }, efeito: "Substitui o teste de FdV contra frenesi de terror ou fúria: vitória transfere o frenesi ao alvo; falha, entra em frenesi. Não transfere frenesi de fome." }),

    /* ---------------- AUSPÍCIOS (p. 248–252) ---------------- */
    p("auspicios", 1, "sentidosAgucados", "Sentidos Aguçados", 249, { duracao: "ate desativar", alternavel: true, efeitos: { mods: [{ contexto: "percepcao", valor: "nivel" }] }, efeito: "Soma Auspícios às rolagens de percepção; estímulos extremos: Raciocínio + Determinação, Dif 3+, ou −3 dados na cena." }),
    p("auspicios", 1, "sentirOInvisivel", "Sentir o Invisível", 249, { parada: [["raciocinio", "disciplina"], ["determinacao", "disciplina"]], efeito: "Percebe o sobrenatural oculto; contra Ofuscação: Raciocínio + Auspícios vs. Raciocínio + Ofuscação." }),
    p("auspicios", 2, "premonicao", "Premonição", 249, { custo: { checagens: 1, opcional: true, texto: "Grátis (passiva) ou 1 Checagem para provocar" }, parada: [["determinacao", "disciplina"]], efeito: "Vislumbres (passivo, sugestão: 1 por cena); provocada, os sucessos dão o nível da revelação.", narrativo: true }),
    p("auspicios", 3, "compartilharOsSentidos", "Compartilhar os Sentidos", 250, { custo: CH(1), parada: [["determinacao", "disciplina"]], dificuldade: 3, duracao: "cena", efeito: "Vê e ouve pelos sentidos de outro na linha de visão (ou com seu Sangue no corpo).", narrativo: true }),
    p("auspicios", 3, "perscrutarAAlma", "Perscrutar a Alma", 250, { custo: CH(1), parada: [["inteligencia", "disciplina"]], resistencia: [["autocontrole", "subterfugio"]], duracao: "turno", efeitos: { perguntas: "margem" }, efeito: "Perguntas = margem: estado emocional, Ressonância, se é vampiro ou sobrenatural, se está sob magia, Diablerie no último ano.", critico: "Algo inesperado também." }),
    p("auspicios", 4, "toqueDoEspirito", "Toque do Espírito", 250, { custo: CH(1), parada: [["inteligencia", "disciplina"]], dificuldade: 3, duracao: "turno", efeitos: { perguntas: "margem" }, efeito: "Cada margem revela um portador anterior do objeto." }),
    p("auspicios", 5, "clarividencia", "Clarividência", 251, { custo: CH(1), parada: [["inteligencia", "disciplina"]], duracao: "uso", efeitos: { perguntas: "margem" }, efeito: "Observa um local (Dif pela segurança e atividade); perguntas = margem." }),
    p("auspicios", 5, "possessao", "Possessão", 251, { amalgama: { disciplina: "dominacao", nivel: 3 }, custo: CH(2), parada: [["determinacao", "disciplina"]], resistencia: [["determinacao", "inteligencia"]], duracao: "indefinida", efeito: "Possui um mortal (contato visual). Agravado ao hospedeiro: Determinação + Auspícios, Dif 2 + dano; morte do hospedeiro: 3 Agravado à FdV.", falhaTotal: "O alvo fica imune na história.", narrativo: true }),
    p("auspicios", 5, "telepatia", "Telepatia", 252, { custo: { checagens: 1, texto: "1 Checagem (+1 FdV contra vampiro relutante)" }, parada: [["determinacao", "disciplina"]], resistencia: [["raciocinio", "subterfugio"]], duracao: "cena", efeito: "Projeta pensamentos sem rolar; ler: pensamentos superficiais, margem → memórias.", narrativo: true }),

    /* ---------------- CELERIDADE (p. 252–254) ---------------- */
    p("celeridade", 1, "gracaFelina", "Graça Felina", 252, { efeitos: { autoSucesso: "equilibrio" }, efeito: "Passa automaticamente em Destreza/Atletismo para equilíbrio." }),
    p("celeridade", 1, "reflexosRapidos", "Reflexos Rápidos", 252, { efeitos: { semPenalidadeCobertura: true, acaoMenorLivre: 2 }, efeito: "Sem penalidade de defesa por falta de cobertura contra armas de fogo; uma ação menor (até 2 dados) livre por turno." }),
    p("celeridade", 2, "rapidez", "Rapidez", 253, { custo: CH(1), duracao: "cena", efeitos: { mods: [{ atributo: "destreza", foraDeCombate: true, valor: "nivel" }, { contexto: "defesaDestreza", valor: "nivel", vezesPorTurno: 1 }] }, efeito: "+Celeridade às paradas de Destreza fora de combate; uma vez por turno também para defender com Destreza + Atletismo." }),
    p("celeridade", 3, "piscadela", "Piscadela", 253, { custo: CH(1), parada: [["destreza", "atletismo"]], duracao: "turno", efeito: "Move até 50 m em linha reta e ainda age." }),
    p("celeridade", 3, "travessia", "Travessia", 253, { custo: CH(1), parada: [["destreza", "atletismo"]], duracao: "turno", efeito: "Corre por superfícies verticais ou líquidas (Dif 3–6)." }),
    p("celeridade", 4, "eleganciaDiretoDaFonte", "Elegância Direto da Fonte", 254, { custo: CH(1), duracao: "noite", efeitos: { emprestaDisciplina: true }, efeito: "Quem bebe ganha Celeridade = metade da do doador e os poderes até esse nível, por uma noite." }),
    p("celeridade", 4, "miraInfalivel", "Mira Infalível", 254, { amalgama: { disciplina: "auspicios", nivel: 2 }, custo: CH(1), duracao: "uso", efeitos: { semDefesa: "distancia", dificuldadeFixa: 1 }, efeito: "O alvo do ataque à distância não rola defesa (Dif 1). Celeridade 5 anula com uma Checagem." }),
    p("celeridade", 5, "fracaoDeSegundo", "Fração de Segundo", 254, { custo: CH(1), duracao: "uso", efeito: "Substitui a narração por uma ação razoável.", narrativo: true }),
    p("celeridade", 5, "golpeRelampago", "Golpe Relâmpago", 254, { custo: CH(1), duracao: "uso", efeitos: { semDefesa: "corpoACorpo", dificuldadeFixa: 1 }, efeito: "Ataque de Briga ou Armas Brancas sem defesa do oponente (Dif 1). Celeridade 5 anula." }),

    /* ---------------- DOMINAÇÃO (p. 254–257) ---------------- */
    p("dominacao", 1, "compelir", "Compelir", 256, { parada: [["carisma", "disciplina"]], resistencia: [["inteligencia", "determinacao"]], duracao: "turno", efeito: "Um comando curto, cumprido no turno. Mortal despreparado: sem rolagem.", falhaTotal: "Não pode Dominar o alvo na história.", narrativo: true }),
    p("dominacao", 1, "nublarMemoria", "Nublar Memória", 256, { parada: [["carisma", "disciplina"]], resistencia: [["raciocinio", "determinacao"]], duracao: "indefinida", efeito: "O alvo esquece o momento atual e os últimos minutos.", narrativo: true }),
    p("dominacao", 2, "dementacao", "Dementação", 256, { amalgama: { disciplina: "ofuscacao", nivel: 2 }, custo: { checagens: 1, texto: "1 Checagem por cena (+1 por vítima adicional)" }, parada: [["manipulacao", "disciplina"]], resistencia: [["autocontrole", "inteligencia"]], duracao: "cena", efeitos: { danoSocial: "superficialFdV" }, efeito: "Ataca a mente: dano Superficial à FdV; mortal Debilitado tem um ataque de nervos; vampiro Debilitado sofre uma Compulsão escolhida pelo usuário." }),
    p("dominacao", 2, "mesmerismo", "Mesmerismo", 256, { custo: CH(1), parada: [["manipulacao", "disciplina"]], resistencia: [["inteligencia", "determinacao"]], duracao: "cena", efeito: "Comandos complexos até cumpridos ou fim da cena.", narrativo: true }),
    p("dominacao", 3, "diretrizSubmersa", "Diretriz Submersa", 257, { custo: { doPoder: true, texto: "Sem custo adicional (Mesmerismo)" }, prereqDisciplina: "mesmerismo", efeito: "Sugestão pós-hipnótica com gatilho; uma por vítima.", narrativo: true }),
    p("dominacao", 3, "aMenteEsquecida", "A Mente Esquecida", 257, { custo: CH(1), parada: [["manipulacao", "disciplina"]], resistencia: [["inteligencia", "determinacao"]], duracao: "indefinida", efeito: "Margem = memórias acrescentadas ou removidas.", critico: "Impecável.", narrativo: true }),
    p("dominacao", 4, "racionalizar", "Racionalizar", 257, { efeito: "A vítima crê ter agido por vontade própria; questionada: Raciocínio + Percepção, Dif 5." }),
    p("dominacao", 5, "decretoTerminal", "Decreto Terminal", 257, { efeito: "Comandos de dano grave ou morte deixam de falhar automaticamente e passam a ser resistidos.", maculasPossiveis: true }),
    p("dominacao", 5, "manipulacaoEmMassa", "Manipulação em Massa", 257, { custo: { checagens: 1, doPoder: true, texto: "1 Checagem + o custo do poder amplificado" }, duracao: "doPoder", efeito: "Amplifica um poder de Dominação a todo um grupo que veja os olhos; rola contra o oponente mais forte." }),

    /* ---------------- FORTITUDE (p. 257–260) ---------------- */
    p("fortitude", 1, "menteInescrutavel", "Mente Inescrutável", 258, { efeitos: { mods: [{ contexto: "resistirCoercao", valor: "nivel" }] }, efeito: "+Fortitude para resistir a coerção, intimidação, sedução e influência (inclui Dominação e Presença)." }),
    p("fortitude", 1, "resiliencia", "Resiliência", 258, { efeitos: { vitalidade: "nivel" }, efeito: "+Fortitude à trilha de Vitalidade." }),
    p("fortitude", 2, "ferasTenazes", "Feras Tenazes", 258, { amalgama: { disciplina: "animalismo", nivel: 1 }, custo: { checagens: 1, opcional: true, texto: "Grátis no famulus; outros: 1 Checagem + Vigor + Animalismo, Dif 3" }, duracao: "cena", efeito: "Animais ganham Vitalidade = Fortitude." }),
    p("fortitude", 2, "tenacidade", "Tenacidade", 258, { custo: CH(1), duracao: "cena", efeitos: { reduzSuperficial: "nivel" }, efeito: "Subtrai Fortitude de todo dano Superficial ANTES de dividir (mínimo 1)." }),
    p("fortitude", 3, "desafioAPerdicao", "Desafio à Perdição", 259, { custo: CH(1), duracao: "cena", efeitos: { converteAgravado: "nivel" }, efeito: "Converte Agravado = Fortitude em Superficial por cena; ativar por reflexo: Raciocínio + Sobrevivência, Dif 3." }),
    p("fortitude", 3, "fortificarAFachada", "Fortificar a Fachada Interior", 259, { duracao: "cena", efeitos: { dificuldadeContraMente: "metadeCima", mods: [{ contexto: "resistirMente", valor: "nivel" }] }, efeito: "+metade da Fortitude (arred. para cima) à Dificuldade de Perscrutar a Alma, Telepatia e similares; onde há resistência, +Fortitude." }),
    p("fortitude", 4, "resistenciaDiretoDaFonte", "Resistência Direto da Fonte", 259, { custo: CH(1), duracao: "noite", efeitos: { emprestaDisciplina: true }, efeito: "Quem bebe ganha Fortitude = metade da do doador e os poderes até esse nível." }),
    p("fortitude", 5, "peleDeMarmore", "Pele de Mármore", 259, { custo: CH(2), duracao: "cena", efeitos: { ignoraPrimeiraFonte: true }, efeito: "Ignora a primeira fonte de dano físico a cada turno (inclui fogo, não sol); um crítico a supera." }),
    p("fortitude", 5, "poderVindoDaDor", "Poder Vindo da Dor", 260, { custo: CH(1), duracao: "cena", efeitos: { ignoraPenalidadeVitalidade: true, fisicoPorDano: true }, efeito: "Ignora penalidades de dano e Debilitação à Vitalidade; +1 num Atributo Físico por nível de dano (máximo Surto + 6)." }),

    /* ---------------- OFUSCAÇÃO (p. 260–263) ---------------- */
    p("ofuscacao", 1, "mantoDeSombras", "Manto de Sombras", 261, { duracao: "cena", efeito: "Parado, quieto e com cobertura, some de vista até se mover ou ser detectado." }),
    p("ofuscacao", 1, "silencioDaMorte", "Silêncio da Morte", 261, { duracao: "cena", efeito: "Anula os sons do usuário, até para aparelhos." }),
    p("ofuscacao", 2, "passagemInvisivel", "Passagem Invisível", 261, { custo: CH(1), duracao: "cena", efeito: "Move-se oculto; não pode desaparecer enquanto observado." }),
    p("ofuscacao", 3, "fantasmaNaMaquina", "Fantasma na Máquina", 262, { custo: { doPoder: true }, efeitos: { mods: [{ contexto: "vigilanciaEletronica", valor: 3 }] }, efeito: "A Ofuscação vale por meios eletrônicos; +3 Dif para identificar em gravações; +3 dados para contornar vigilância." }),
    p("ofuscacao", 3, "mascaraDeMilFaces", "Máscara de Mil Faces", 262, { custo: CH(1), duracao: "cena", efeito: "Rosto esquecível ou aparência neutra, sem teste." }),
    p("ofuscacao", 4, "desaparecer", "Desaparecer", 262, { prereq: "mantoDeSombras", custo: { doPoder: true }, parada: [["raciocinio", "disciplina"]], resistencia: [["raciocinio", "percepcao"]], limite: "cena", efeito: "Ativa Manto de Sombras ou Passagem Invisível mesmo observado.", critico: "Some também da memória." }),
    p("ofuscacao", 4, "ocultar", "Ocultar", 262, { amalgama: { disciplina: "auspicios", nivel: 3 }, custo: CH(1), parada: [["inteligencia", "disciplina"]], duracao: "noite", efeito: "Oculta um objeto (Dif 2–6) por uma noite + uma por margem." }),
    p("ofuscacao", 5, "disfarceDoImpostor", "Disfarce do Impostor", 263, { prereq: "mascaraDeMilFaces", custo: CH(1), parada: [["raciocinio", "disciplina"], ["manipulacao", "performance"]], duracao: "cena", efeito: "Assume a aparência de alguém estudado por 5 minutos." }),
    p("ofuscacao", 5, "ocultarOGrupo", "Ocultar o Grupo", 263, { custo: { checagens: 1, doPoder: true }, duracao: "doPoder", efeito: "Estende a Ofuscação a alvos voluntários = Raciocínio (+1 por Checagem extra)." }),

    /* ---------------- POTÊNCIA (p. 263–265) ---------------- */
    p("potencia", 1, "corpoLetal", "Corpo Letal", 264, { efeitos: { desarmadoAgravadoMortais: true, ignoraArmadura: "nivel" }, efeito: "Desarmado causa Agravado a mortais (opcional) e ignora 1 nível de armadura por Potência." }),
    p("potencia", 1, "saltoVertiginoso", "Salto Vertiginoso", 264, { efeito: "Salto vertical 3 × Potência metros; horizontal 5 ×." }),
    p("potencia", 2, "poderio", "Poderio", 264, { custo: CH(1), duracao: "cena", efeitos: { danoDesarmado: "nivel", danoArmaBranca: "metadeCima", mods: [{ contexto: "forcaBruta", valor: "nivel" }] }, efeito: "+Potência ao dano desarmado e a feitos de Força; +metade (arred. para cima) ao dano com Armas Brancas." }),
    p("potencia", 3, "alimentacaoBrutal", "Alimentação Brutal", 264, { duracao: "alimentacao", efeitos: { drenarNumTurno: true }, efeito: "Drena um humano num turno; contra vampiro, só Superficial.", maculasPossiveis: true }),
    p("potencia", 3, "centelhaDeFuria", "Centelha de Fúria", 264, { amalgama: { disciplina: "presenca", nivel: 3 }, custo: CH(1), parada: [["manipulacao", "disciplina"]], resistencia: [["autocontrole", "inteligencia"]], duracao: "cena", efeito: "+Potência para irritar e incitar; contra vampiro, vitória causa frenesi de fúria Dif 3." }),
    p("potencia", 3, "pegadaSobrenatural", "Pegada Sobrenatural", 265, { custo: CH(1), duracao: "cena", efeito: "Escala superfícies automaticamente; deixa rastros (Inteligência + Investigação, Dif 2)." }),
    p("potencia", 4, "forcaDiretoDaFonte", "Força Direto da Fonte", 265, { custo: CH(1), duracao: "noite", efeitos: { emprestaDisciplina: true }, efeito: "Quem bebe ganha Potência = metade da do doador e os poderes até esse nível." }),
    p("potencia", 5, "punhoDeCaim", "Punho de Caim", 265, { custo: CH(1), duracao: "cena", efeitos: { desarmadoAgravado: true }, efeito: "Dano Agravado à Vitalidade de mortais e sobrenaturais com Briga." }),
    p("potencia", 5, "terremoto", "Terremoto", 265, { custo: CH(2), duracao: "uso", limite: "cena", efeito: "Onda de choque de 5 m: Destreza + Atletismo, Dif 3, ou cai e perde a ação." }),

    /* ---------------- PRESENÇA (p. 265–268) ---------------- */
    p("presenca", 1, "amedrontar", "Amedrontar", 266, { duracao: "cena", exclui: ["fascinio"], efeitos: { mods: [{ habilidade: "intimidacao", valor: "nivel", grupo: "presenca" }] }, efeito: "+Presença em Intimidação; atacá-lo exige Determinação + Autocontrole, Dif 2." }),
    p("presenca", 1, "fascinio", "Fascínio", 266, { duracao: "cena", exclui: ["amedrontar"], efeitos: { mods: [{ habilidade: "persuasao", valor: "nivel", grupo: "presenca" }, { habilidade: "performance", valor: "nivel", grupo: "presenca" }, { atributo: "carisma", valor: "nivel", grupo: "presenca" }] }, resistencia: [["autocontrole", "inteligencia"]], efeito: "+Presença em Persuasão, Performance e Carisma; resistir: Autocontrole + Inteligência vs. Manipulação + Presença.", critico: "Na resistência, imune pela noite." }),
    p("presenca", 2, "beijoIndelevel", "Beijo Indelével", 267, { duracao: "alimentacao", efeito: "Durante uma alimentação que sacie 1+ Fome, a vítima ganha +metade da Presença num Atributo Social por uma noite; abstinência depois.", narrativo: true }),
    p("presenca", 3, "olharAterrorizante", "Olhar Aterrorizante", 267, { custo: CH(1), parada: [["carisma", "disciplina"]], resistencia: [["autocontrole", "determinacao"]], duracao: "turno", efeito: "Mortais fogem; vampiros não agem um turno a menos que gastem FdV = margem.", critico: "Mortais congelam; vampiros entram em frenesi de terror Dif 3." }),
    p("presenca", 3, "transe", "Transe", 267, { custo: CH(1), parada: [["carisma", "disciplina"]], resistencia: [["autocontrole", "raciocinio"]], duracao: "horas", efeitos: { mods: [{ contexto: "socialContraFascinado", valor: "nivel", grupo: "presenca" }] }, efeito: "O alvo fica fascinado por 1 hora + 1 por margem; +Presença em Sociais contra ele." }),
    p("presenca", 4, "convocar", "Convocar", 268, { custo: CH(1), parada: [["manipulacao", "disciplina"]], resistencia: [["autocontrole", "inteligencia"]], duracao: "noite", efeito: "Chama quem já sofreu Fascínio, Transe, Majestade ou provou seu Sangue.", critico: "Vem o mais rápido possível.", narrativo: true }),
    p("presenca", 4, "vozIrresistivel", "Voz Irresistível", 268, { amalgama: { disciplina: "dominacao", nivel: 1 }, efeito: "A Dominação funciona só pela voz (não por meios eletrônicos)." }),
    p("presenca", 5, "magnetismoDeEstrela", "Magnetismo de Estrela", 268, { custo: { checagens: 1, doPoder: true }, duracao: "doPoder", efeito: "Fascínio, Amedrontar e Transe por transmissão ao vivo." }),
    p("presenca", 5, "majestade", "Majestade", 268, { custo: CH(2), parada: [["carisma", "disciplina"]], resistencia: [["autocontrole", "determinacao"]], duracao: "cena", efeito: "Ninguém age contra o usuário; vencer a resistência dá 1 turno de liberdade + 1 por margem.", critico: "Na resistência, livre pela cena." }),

    /* ---------------- PROTEANISMO (p. 269–271) ---------------- */
    p("proteanismo", 1, "olhosDaBesta", "Olhos da Besta", 269, { duracao: "ate desativar", alternavel: true, efeitos: { mods: [{ habilidade: "intimidacao", contexto: "contraMortais", valor: 2 }], semPenalidadeEscuro: true }, efeito: "Enxerga no escuro; +2 dados em Intimidação contra mortais." }),
    p("proteanismo", 1, "pesoPena", "Peso Pena", 269, { duracao: "ate desativar", alternavel: true, efeito: "Imune a dano de quedas e colisões; em reação, Raciocínio + Sobrevivência, Dif 3." }),
    p("proteanismo", 2, "armasFerais", "Armas Ferais", 270, { custo: CH(1), duracao: "cena", efeitos: { danoDesarmado: 2, superficialNaoDivide: true, mordidaSemPenalidade: true }, efeito: "Garras: arma leve de Briga (+2); mordida sem penalidade de ataque localizado; o dano Superficial em vampiros não é dividido." }),
    p("proteanismo", 3, "fusaoComATerra", "Fusão com a Terra", 270, { custo: CH(1), duracao: "dia", efeito: "Afunda numa superfície natural (1 turno) e descansa protegido." }),
    p("proteanismo", 3, "mudancaDeForma", "Mudança de Forma", 270, { custo: CH(1), duracao: "cena", efeitos: { forma: "animal" }, efeito: "Assume a forma de um animal do próprio tamanho: Atributos Físicos, sentidos e Habilidades do animal (p. 373)." }),
    p("proteanismo", 4, "metamorfose", "Metamorfose", 271, { prereq: "mudancaDeForma", custo: CH(1), duracao: "cena", efeitos: { forma: "animalQualquer" }, efeito: "A forma animal pode ser de outro tamanho." }),
    p("proteanismo", 5, "coracaoVagante", "Coração Vagante", 271, { efeitos: { estacaDificuldade: 3 }, efeito: "+3 Dif para estaqueá-lo; estacado: 1 Checagem e Força + Determinação, Dif 5, uma vez por hora, para expulsar a estaca (não com Fome 5)." }),
    p("proteanismo", 5, "formaDeNevoa", "Forma de Névoa", 271, { custo: { checagens: 1, ate: 3, texto: "1 a 3 Checagens (cada uma acelera a transformação)" }, duracao: "cena", efeitos: { forma: "nevoa" }, efeito: "Névoa intocável, exceto por fogo, sol e o sobrenatural." }),

    /* ---------------- FEITIÇARIA DE SANGUE (p. 271–274) ---------------- */
    p("feiticaria", 1, "umGostoPorSangue", "Um Gosto por Sangue", 272, { parada: [["determinacao", "disciplina"]], dificuldade: 3, duracao: "uso", efeito: "Prova o sangue: Ressonância, intensidade, se é humano, mortal/carniçal/vampiro, Potência relativa.", critico: "Diablerie e geração exata." }),
    p("feiticaria", 1, "vitaeCorrosivo", "Vitae Corrosivo", 272, { custo: { checagens: 1, porUso: true, texto: "1+ Checagens" }, duracao: "uso", efeito: "Cada Checagem corrói ~35 cm de matéria morta." }),
    p("feiticaria", 2, "extinguirVitae", "Extinguir Vitae", 273, { custo: CH(1), parada: [["inteligencia", "disciplina"]], resistencia: [["vigor", "autocontrole"]], duracao: "uso", efeitos: { fomeNoAlvo: 1, fomeNoAlvoCritico: 2 }, efeito: "Vitória: +1 Fome no alvo (crítico, +2)." }),
    p("feiticaria", 3, "picadaDeEscorpiao", "Picada de Escorpião", 273, { custo: { checagens: 1, porUso: true, texto: "1+ Checagens" }, parada: [["forca", "disciplina"]], resistencia: [["vigor", "ocultismo"], ["vigor", "fortitude"]], duracao: "cena", efeitos: { danoVeneno: "margem" }, efeito: "Cuspe venenoso (ataque Destreza + Atletismo): Agravado = margem a mortais; Superficial não dividido a vampiros." }),
    p("feiticaria", 3, "sanguePotente", "Sangue Potente", 273, { custo: CH(1), parada: [["determinacao", "disciplina"]], duracao: "noite", efeitos: { potenciaTemporaria: 1, potenciaCritico: 2 }, efeito: "+1 Potência (crítico, +2), acima do limite da geração; Dif 2 + Potência." }),
    p("feiticaria", 4, "rouboDeVitae", "Roubo de Vitae", 274, { custo: CH(1), parada: [["raciocinio", "disciplina"]], resistencia: [["raciocinio", "ocultismo"]], duracao: "alimentacao", efeito: "Alimenta-se à distância." }),
    p("feiticaria", 5, "caldeiraoDeSangue", "Caldeirão de Sangue", 274, { custo: { checagens: 1, maculas: true, texto: "1 Checagem + uma ou mais Máculas" }, parada: [["determinacao", "disciplina"]], resistencia: [["autocontrole", "ocultismo"], ["autocontrole", "fortitude"]], duracao: "turno", efeitos: { danoAgravado: "margem" }, efeito: "Toque: Agravado = margem; mortais morrem; vampiros +1 Fome por dano." }),
    p("feiticaria", 5, "cariciaDeBaal", "Carícia de Baal", 274, { custo: { checagens: 1, porUso: true }, parada: [["forca", "disciplina"]], resistencia: [["vigor", "ocultismo"], ["vigor", "fortitude"]], duracao: "cena", efeitos: { danoAgravado: "margem" }, efeito: "Veneno: Agravado = margem (mortais e vampiros); mortal com 1 dano morre; vampiro que sofre Agravado rola de novo: vitória, Torpor no próximo sono." }),

    /* ---------------- ALQUIMIA SANGUE-RALO (p. 282–287) ---------------- */
    p("alquimia", 1, "longoAlcance", "Longo Alcance", 284, { formula: true, custo: CH(1), parada: [["determinacao", "disciplina"]], resistencia: [["forca", "atletismo"]], duracao: "turno", efeito: "Move um objeto de até 100 kg a 10 m; empurrar uma pessoa: margem = metros e Superficial; manter flutuando: Dif 3 por turno." }),
    p("alquimia", 1, "neblina", "Neblina", 285, { formula: true, custo: CH(1), duracao: "cena", efeitos: { penalidadeContraVoceDistancia: 2 }, efeito: "Uma nuvem segue o usuário: −2 dados a ataques à distância contra ele; estender a um grupo de 5 com outra Checagem." }),
    p("alquimia", 2, "envolver", "Envolver", 285, { formula: true, custo: CH(1), parada: [["raciocinio", "disciplina"]], resistencia: [["vigor", "sobrevivencia"]], duracao: "cena", efeito: "−3 dados em detecção visual e ataques à distância; mortal sufoca (vitória não age; crítico, inconsciente)." }),
    p("alquimia", 2, "defracionar", "Defracionar", 285, { formula: true, custo: { gratis: true, texto: "Sem custo de ativação" }, duracao: "uso", efeito: "Cada sucesso torna uma bolsa de sangue fracionado em integral (sacia 1)." }),
    p("alquimia", 3, "hierosGamosProfano", "Hieros Gamos Profano", 285, { formula: true, custo: { checagens: 1, texto: "1 Checagem (ou 1 Agravado à Vitalidade de um mortal)" }, parada: [["vigor", "determinacao"]], duracao: "permanente", efeito: "Transforma a forma (Dif 8 − sucessos da destilação; vampiro soma a Gravidade da Perdição).", critico: "Pode conceder ou remover Qualidades/Defeitos Visuais (pagando XP)." }),
    p("alquimia", 4, "impetoAereo", "Ímpeto Aéreo", 287, { formula: true, custo: CH(1), parada: [["forca", "disciplina"]], resistencia: [["forca", "atletismo"]], duracao: "cena", efeito: "Voa na velocidade de corrida." }),
    p("alquimia", 4, "despertarAdormecido", "Despertar Adormecido", 287, { formula: true, custo: { gratis: true }, duracao: "uso", efeito: "Cada sucesso acima de 2 desperta do Torpor um vampiro daquela Potência." }),
  ];

  /* ---------------- RITUAIS (p. 274–282) ---------------- */
  /* Todos: 1 Checagem; 5 min por nível; Inteligência + Feitiçaria,
     Dif = nível + 1 (p. 274). `ingredientes`, `duracao`, `efeito`. */
  function r(nivel, chave, nome, pagina, o) {
    return Object.assign({ tipo: "ritual", nivel: nivel, chave: chave, nome: nome, pagina: pagina, custo: { checagens: 1 }, parada: [["inteligencia", "feiticaria"]], dificuldade: nivel + 1, execucaoMinutos: 5 * nivel }, o || {});
  }
  var RITUAIS = [
    r(1, "aderenciaDoInseto", "Aderência do Inseto", 276, { ingredientes: "Uma aranha viva", duracao: "cena", efeito: "Adere a paredes e tetos por uma cena (crítico: a noite), na metade da velocidade." }),
    r(1, "caminhoDoSangue", "Caminho do Sangue", 276, { ingredientes: "Copo de prata com o Sangue do alvo", efeito: "Revela a geração e o nome do Senhor do alvo.", critico: "Também os Laços ativos." }),
    r(1, "criarPedraDeSangue", "Criar Pedra de Sangue", 276, { ingredientes: "Seixo de ferro ou ímã; 1 litro de sangue", execucaoNoites: 3, duracao: "indefinida", efeito: "Rastreia a pedra (direção e distância); máximo de pedras = Determinação." }),
    r(1, "despertarComFrescor", "Despertar com o Frescor do Anoitecer", 276, { ingredientes: "Ossos e cinzas de galo", duracao: "dia", efeitos: { ignoraPenalidadeDiurna: true }, efeito: "Desperta alerta se houver perigo; ignora penalidades diurnas na cena.", critico: "Até o amanhecer." }),
    r(1, "protecaoContraCarnicais", "Proteção contra Carniçais", 276, { protecao: "carnicais", duracao: "indefinida", efeito: "Glifo: carniçal que toca sofre 1 Agravado (crítico 3)." }),
    r(2, "circuloContraCarnicais", "Círculo de Proteção contra Carniçais", 277, { circulo: "carnicais", custo: { checagens: 3 }, duracao: "noite", efeito: "Círculo de até 3 m; cruzar exige disputa contra a FdV; 3 Superficial (crítico 3 Agravado)." }),
    r(2, "comunicacaoComOSenhor", "Comunicação com o Senhor do Membro", 277, { ingredientes: "Objeto do Senhor, tigela de prata", execucaoMinutos: 15, duracao: "10 minutos", efeito: "Telepatia com o Senhor por 10 minutos.", critico: "Imediata." }),
    r(2, "iluminarORastro", "Iluminar o Rastro da Presa", 277, { ingredientes: "Fita de cetim branca", duracao: "noite", efeito: "Rastro brilhante de até 24 h (rastrear: Inteligência + Sobrevivência, Dif 6 − margem).", critico: "Duas noites." }),
    r(2, "olhosDeBabel", "Olhos de Babel", 277, { ingredientes: "Olho e língua de uma vítima", maculasPossiveis: true, duracao: "uma semana", efeito: "Lê e fala a língua da vítima.", critico: "Um mês." }),
    r(2, "protecaoContraEspiritos", "Proteção contra Espíritos", 277, { protecao: "espiritos", duracao: "indefinida", efeito: "Glifo contra espíritos." }),
    r(2, "verdadeDoSangue", "Verdade do Sangue", 277, { ingredientes: "Sangue do alvo", duracao: "cena", efeito: "Determinação + Feitiçaria vs. Autocontrole + Ocultismo por afirmação: sabe se é verdade." }),
    r(3, "andarilhoDoFogo", "Andarilho do Fogo", 278, { ingredientes: "A ponta de um dedo", duracao: "noite", efeitos: { metadeFogo: true }, efeito: "Metade do dano de fogo na noite (Vigor + Determinação, Dif 3)." }),
    r(3, "chamadoDeDagon", "O Chamado de Dagon", 278, { ingredientes: "Adaga; a vítima exposta ao sangue do conjurador", resistencia: [["vigor", "determinacao"]], efeitos: { danoAgravado: "margem", contraVampiro: "superficial" }, efeito: "Afoga por dentro: margem = Agravado a mortais, Superficial a vampiros; repetir 2× com Checagem." }),
    r(3, "circuloContraEspiritos", "Círculo de Proteção contra Espíritos", 278, { circulo: "espiritos", custo: { checagens: 3 }, duracao: "noite", efeito: "Círculo contra espíritos." }),
    r(3, "deflexaoDaRuina", "Deflecção da Ruína de Madeira", 278, { ingredientes: "Lascas de madeira", duracao: "noite", efeitos: { primeiraEstaca: true }, efeito: "A primeira estaca se despedaça.", critico: "Cega o atacante 2 turnos." }),
    r(3, "essenciaDoAr", "Essência do Ar", 279, { ingredientes: "Beladona", duracao: "cena", efeito: "Voo lento por uma cena.", critico: "Duas doses." }),
    r(3, "protecaoContraLupinos", "Proteção contra Lupinos", 279, { protecao: "lupinos", duracao: "indefinida", efeito: "Glifo contra lobisomens." }),
    r(4, "circuloContraLupinos", "Círculo de Proteção contra Lupinos", 279, { circulo: "lupinos", custo: { checagens: 3 }, duracao: "noite", efeito: "Círculo contra lobisomens." }),
    r(4, "defesaDoRefugio", "Defesa do Refúgio Sagrado", 279, { execucaoMinutos: 60, duracao: "indefinida", efeito: "Raio de 6 m impede a luz solar enquanto o conjurador estiver." }),
    r(4, "olhosDoFalcao", "Olhos do Falcão Noturno", 279, { ingredientes: "Olhos de uma ave carnívora", duracao: "cena", efeito: "Controla a ave e vê pelos olhos dela; arrancar os olhos da ave depois, senão 3 noites de cegueira." }),
    r(4, "passagemIncorporea", "Passagem Incorpórea", 280, { ingredientes: "Um espelho", duracao: "cena", efeito: "Incorpóreo; imune exceto a fogo, sol e armas arcanas." }),
    r(4, "protecaoContraCainitas", "Proteção contra Cainitas", 280, { protecao: "cainitas", ingredientes: "Cinzas de fogo", duracao: "indefinida", efeito: "Glifo contra vampiros (risco de frenesi de terror)." }),
    r(5, "circuloContraCainitas", "Círculo de Proteção contra Cainitas", 280, { circulo: "cainitas", custo: { checagens: 3 }, duracao: "noite", efeito: "Círculo contra vampiros." }),
    r(5, "coracaoDePedra", "Coração de Pedra", 280, { ingredientes: "Laje e vela", duracao: "indefinida", efeitos: { imuneEstaca: true, remorso: -3, social: -3 }, efeito: "1 Agravado e frenesi de terror Dif 3; imune a estacas; −3 dados em Remorso e Sociais ativas (exceto Intimidação e Dominação); sem Presença; +3 para resistir a Presença." }),
    r(5, "fugaParaOSantuario", "Fuga para o Verdadeiro Santuário", 281, { custo: { checagens: 12, texto: "12 Checagens ao preparar os dois círculos" }, duracao: "uso", efeito: "Teleporta-se entre os dois círculos; um por cena." }),
    r(5, "fusteDeExtincao", "Fuste de Extinção Tardia", 281, { ingredientes: "Estaca de sorveira", custo: { checagens: 2 }, execucaoMinutos: 300, efeito: "+3 dados para estacar; margem 5+: reduz a pó; senão a ponta se enterra até o coração em horas ou noites (remover: Destreza + Medicina, Dif 6)." }),
  ];

  /* Proteções e Círculos (p. 275–276): mecânica comum. */
  var PROTECOES = {
    glifo: "Ao tocar: a rolagem do Ritual; vitória, 1 Agravado à Vitalidade do intruso (crítico 3); para tocar de novo: 1 FdV + Vigor + Determinação, Dif 4 (7 se crítico).",
    circulo: "Até 3 m; uma noite para conjurar (Dif + 2); um ano e um dia ou até o amanhecer; cruzar: Inteligência + Feitiçaria vs. FdV do intruso; vencer: 3 Superficial (crítico 3 Agravado) e não entra; 1 FdV para tentar de novo.",
  };

  /* ---------------- ALQUIMIA: métodos e destilação (p. 282–284) ---------------- */
  var METODOS_DE_ALQUIMIA = {
    athanorCorporis: { nome: "Athanor Corporis", parada: ["vigor", "alquimia"], texto: "No próprio corpo: bebe os sangues ressonantes; só um poder ativo por vez; ~3 turnos de concentração.", umAtivo: true, armazena: false },
    calcinatio: { nome: "Calcinatio", parada: ["manipulacao", "alquimia"], texto: "No corpo de um humano: bebe do alvo para ativar; Fome saciada = nível do poder (mínimo 1); um poder por vítima.", saciaNivel: true, armazena: false },
    fixatio: { nome: "Fixatio", parada: ["inteligencia", "alquimia"], texto: "Em laboratório: fórmulas fixas e carregáveis; sem laboratório, só fracas (nível 3 ou menos) com −2 dados; carrega até Raciocínio ou Destreza; armazena até 2 × (Alquimia + Refúgio).", armazena: true, semLaboratorio: -2 },
  };
  /* Resultado da destilação (p. 283): sucessos → qualidade. */
  function qualidadeDaDestilacao(sucessos) {
    var s = Number(sucessos) || 0;
    if (s >= 6) return "aumentada";
    if (s >= 4) return "funciona";
    if (s >= 2) return "fraca";
    return "falha";
  }
  /* Imitar poderes (p. 285–287): o nível da fórmula imita o nível − 1
     de outra Disciplina; tempo de destilação e pesquisa. */
  var IMITACAO = {
    2: { imitaNivel: 1, destilar: "algumas horas", pesquisa: "uma semana" },
    3: { imitaNivel: 2, destilar: "uma noite", pesquisa: "um mês" },
    4: { imitaNivel: 3, destilar: "três noites", pesquisa: "três meses", exigeVitae: true },
    5: { imitaNivel: 4, destilar: "um mês", pesquisa: "três anos", exigeVitae: true },
  };

  var porChave = {};
  PODERES.forEach(function (x) { porChave[x.chave] = x; });
  var ritualPorChave = {};
  RITUAIS.forEach(function (x) { ritualPorChave[x.chave] = x; });

  global.RAMAVampiroDisciplinas = {
    DISCIPLINAS: DISCIPLINAS, PODERES: PODERES, RITUAIS: RITUAIS, PROTECOES: PROTECOES,
    METODOS_DE_ALQUIMIA: METODOS_DE_ALQUIMIA, IMITACAO: IMITACAO, qualidadeDaDestilacao: qualidadeDaDestilacao,
    poder: function (k) { return porChave[k] || null; },
    ritual: function (k) { return ritualPorChave[k] || null; },
    daDisciplina: function (d) { return PODERES.filter(function (x) { return x.disciplina === d; }); },
  };
})(typeof window !== "undefined" ? window : globalThis);
