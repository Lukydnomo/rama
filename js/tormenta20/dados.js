/* =====================================================================
   R.A.M.A. — Tormenta20 (Jogo do Ano) · tabelas básicas
   ---------------------------------------------------------------------
   Fonte: Tormenta20 — Jogo do Ano, 2ª edição (Jambô, 2023). As páginas
   são as IMPRESSAS. Os resumos são do R.A.M.A.; o texto integral é o do
   livro. Puro: nada aqui toca a ficha.
   ===================================================================== */

(function (global) {
  "use strict";

  var FONTE = { livro: "Tormenta20 — Jogo do Ano", sigla: "T20", edicao: "2ª edição, 2ª impressão (2023)" };

  /* ---------- atributos (p. 17) ---------- */
  var ATRIBUTOS = [
    { chave: "for", nome: "Força", curto: "For" },
    { chave: "des", nome: "Destreza", curto: "Des" },
    { chave: "con", nome: "Constituição", curto: "Con" },
    { chave: "int", nome: "Inteligência", curto: "Int" },
    { chave: "sab", nome: "Sabedoria", curto: "Sab" },
    { chave: "car", nome: "Carisma", curto: "Car" },
  ];
  var CHAVES_ATRIBUTO = ATRIBUTOS.map(function (a) { return a.chave; });

  /* Tabela 1-1 (p. 17): custo em pontos e conversão da rolagem 4d6. */
  var CUSTO_PONTOS = { "-1": -1, "0": 0, "1": 1, "2": 2, "3": 4, "4": 7 };
  var PONTOS_INICIAIS = 10;
  function atributoDaRolagem(total) {
    if (total <= 7) return -2;
    if (total <= 9) return -1;
    if (total <= 11) return 0;
    if (total <= 13) return 1;
    if (total <= 15) return 2;
    if (total <= 17) return 3;
    return 4;
  }
  /* Rolagens: os seis atributos convertidos precisam somar 6 ou mais;
     senão rola-se de novo o menor (p. 17). */
  var SOMA_MINIMA_ROLAGEM = 6;
  /* Atributo abaixo de –5 (p. 17): o efeito ignora imunidades. */
  var ATRIBUTO_MINIMO = { "for": "paralisado", des: "paralisado", con: "morto", "int": "inconsciente", sab: "inconsciente", car: "npc" };

  /* ---------- perícias (Tabela 2-1, p. 115; usos p. 115–123) ---------- */
  function uso(nome, dados) { return Object.assign({ nome: nome }, dados || {}); }
  var PERICIAS = [
    { chave: "acrobacia", nome: "Acrobacia", atributo: "des", armadura: true, pagina: 115, usos: [
      uso("Amortecer Queda", { cd: 15, treinado: true, execucao: "reação", resumo: "Reduz o dano da queda em 1d6, +1d6 a cada 5 acima da CD; zerou, cai de pé." }),
      uso("Equilíbrio", { cd: "10 / 15 / 20", execucao: "movimento", resumo: "Piso escorregadio, estreito ou muito estreito. Passa: metade do deslocamento; falha por 5: cai. –5 para avançar tudo." }),
      uso("Escapar", { cd: "cordas: teste +10 · redes 20 · algemas 30", execucao: "completa" }),
      uso("Levantar-se Rapidamente", { cd: 20, treinado: true, execucao: "livre (com ação de movimento disponível)" }),
      uso("Passar por Espaço Apertado", { cd: 25, treinado: true, execucao: "completa", resumo: "Avança metade do deslocamento." }),
      uso("Passar por Inimigo", { cd: "oposto (Acrobacia, Iniciativa ou Luta)", execucao: "parte do movimento" }),
    ] },
    { chave: "adestramento", nome: "Adestramento", atributo: "car", treinada: true, pagina: 115, usos: [
      uso("Acalmar Animal", { cd: 25, execucao: "completa" }),
      uso("Manejar Animal", { cd: 15, execucao: "movimento", resumo: "Também serve como Pilotagem para veículos de tração animal." }),
    ] },
    { chave: "atletismo", nome: "Atletismo", atributo: "for", pagina: 116, usos: [
      uso("Corrida", { cd: "—", execucao: "completa", resumo: "Avança quadrados de 1,5m igual ao resultado; ±2 por 1,5m de deslocamento acima/abaixo de 9m. Rodadas = 1 + Con; depois Fortitude CD 15 +1 por teste." }),
      uso("Escalar", { cd: "10 / 15 / 20 / 25", execucao: "movimento", resumo: "Metade do deslocamento; falha por 5: cai. Fica desprevenido." }),
      uso("Natação", { cd: "10 / 15 / 20+", execucao: "movimento", resumo: "Sofre penalidade de armadura. Prender a respiração: 1 + Con rodadas." }),
      uso("Saltar", { cd: "longo 5 por 1,5m · altura 15 por 1,5m (+10 sem impulso)", execucao: "parte do movimento" }),
    ] },
    { chave: "atuacao", nome: "Atuação", atributo: "car", treinada: true, pagina: 116, usos: [
      uso("Apresentação", { cd: 20, execucao: "um dia", resumo: "Ganha T$ 1d6, +1d6 a cada 5 acima da CD (metade ou dobro conforme o lugar)." }),
      uso("Impressionar", { cd: "oposto (Vontade)", resumo: "+2 em perícias de Carisma contra o alvo no dia; falha: –2." }),
    ] },
    { chave: "cavalgar", nome: "Cavalgar", atributo: "des", pagina: 116, usos: [
      uso("Conduzir", { cd: "15 / 25", execucao: "parte do movimento", resumo: "Falha: cai e sofre 1d6." }),
      uso("Galopar", { cd: "—", execucao: "completa" }),
      uso("Montar Rapidamente", { cd: 20, execucao: "livre" }),
    ], nota: "Sem sela: –5." },
    { chave: "conhecimento", nome: "Conhecimento", atributo: "int", treinada: true, pagina: 117, usos: [
      uso("Idiomas", { cd: "20 (exótico ou antigo 30)" }),
      uso("Informação", { cd: "simples — · complexa 20 · mistério 30" }),
    ] },
    { chave: "cura", nome: "Cura", atributo: "sab", pagina: 117, usos: [
      uso("Cuidados Prolongados", { cd: 15, treinado: true, execucao: "uma hora", resumo: "+1 PV por nível na recuperação do dia; até nível pessoas." }),
      uso("Necropsia", { cd: "20 (causa rara 30)", treinado: true, execucao: "dez minutos" }),
      uso("Primeiros Socorros", { cd: 15, execucao: "padrão", resumo: "Estabiliza um personagem adjacente que esteja sangrando." }),
      uso("Tratamento", { cd: "CD da doença ou veneno", treinado: true, execucao: "completa", resumo: "+5 no próximo teste de Fortitude do paciente contra o efeito." }),
    ], nota: "Sem maleta de medicamentos: –5. Em si mesmo: –5." },
    { chave: "diplomacia", nome: "Diplomacia", atributo: "car", pagina: 118, usos: [
      uso("Barganha", { cd: "oposto (Vontade)", resumo: "Muda o preço em 10% (20% passando por 10); falha por 5 ofende o negociante." }),
      uso("Mudar Atitude", { cd: "oposto (Vontade)", execucao: "um minuto (–10: completa)", resumo: "Uma categoria (duas passando por 10); uma vez por dia por alvo." }),
      uso("Persuasão", { cd: "20 (custoso –5, perigoso –10)", execucao: "um minuto ou mais" }),
    ] },
    { chave: "enganacao", nome: "Enganação", atributo: "car", pagina: 118, usos: [
      uso("Disfarce", { cd: "oposto (Percepção)", execucao: "dez minutos", resumo: "Complexo –5; quem conhece a pessoa imitada +10. Sem estojo: –5." }),
      uso("Falsificação", { cd: "oposto (Percepção)", resumo: "Documento complexo ou com assinatura: –10." }),
      uso("Fintar", { cd: "oposto (Reflexos)", execucao: "padrão", resumo: "O alvo em alcance curto fica desprevenido contra seu próximo ataque até o fim do seu próximo turno." }),
      uso("Insinuação", { cd: 20 }),
      uso("Intriga", { cd: "20 (improvável 30)", execucao: "um dia ou mais" }),
      uso("Mentir", { cd: "oposto (Intuição)", resumo: "Muito implausível: –10." }),
    ] },
    { chave: "fortitude", nome: "Fortitude", atributo: "con", resistencia: true, pagina: 119, usos: [
      uso("Resistir", { cd: "do efeito" }), uso("Fôlego", { cd: "15 +1 por teste anterior" }),
    ] },
    { chave: "furtividade", nome: "Furtividade", atributo: "des", armadura: true, pagina: 119, usos: [
      uso("Esconder-se", { cd: "oposto (Percepção)", execucao: "livre, no fim do turno", resumo: "Moveu: –5 (meio deslocamento evita). Atacou: –20." }),
      uso("Seguir", { cd: "oposto (Percepção)" }),
    ] },
    { chave: "guerra", nome: "Guerra", atributo: "int", treinada: true, pagina: 119, usos: [
      uso("Analisar Terreno", { cd: 20, execucao: "movimento" }),
      uso("Plano de Ação", { cd: 20, execucao: "padrão", resumo: "+5 na Iniciativa de um aliado em alcance médio." }),
    ] },
    { chave: "iniciativa", nome: "Iniciativa", atributo: "des", pagina: 119, usos: [uso("Iniciativa", { cd: "—", resumo: "Ordem de ação na cena." })] },
    { chave: "intimidacao", nome: "Intimidação", atributo: "car", pagina: 120, usos: [
      uso("Assustar", { cd: "oposto (Vontade)", execucao: "padrão", resumo: "Alvo em alcance curto fica abalado na cena; passando por 10, apavorado por 1 rodada e depois abalado." }),
      uso("Coagir", { cd: "oposto (Vontade)", execucao: "um minuto ou mais", resumo: "Alvo adjacente obedece uma ordem e fica hostil." }),
    ] },
    { chave: "intuicao", nome: "Intuição", atributo: "sab", pagina: 120, usos: [
      uso("Perceber Mentira", { cd: "oposto (Enganação)" }),
      uso("Pressentimento", { cd: 20, treinado: true }),
    ] },
    { chave: "investigacao", nome: "Investigação", atributo: "int", pagina: 120, usos: [
      uso("Interrogar", { cd: "geral — · restrita 20 · confidencial 30", execucao: "uma hora e T$ 3d6" }),
      uso("Procurar", { cd: "15 / 20 / 30", execucao: "completa a um dia" }),
    ] },
    { chave: "jogatina", nome: "Jogatina", atributo: "car", treinada: true, pagina: 120, usos: [
      uso("Apostar", { cd: "tabela", resumo: "Aposta T$ 1d10: até 9 nada; 10–14 metade; 15–19 empata; 20–29 dobro; 30–39 triplo; 40+ quíntuplo." }),
    ] },
    { chave: "ladinagem", nome: "Ladinagem", atributo: "des", treinada: true, armadura: true, pagina: 120, usos: [
      uso("Abrir Fechadura", { cd: "20 / 25 / 30", execucao: "completa", resumo: "Sem gazua: –5." }),
      uso("Ocultar", { cd: "oposto (Percepção)", execucao: "padrão" }),
      uso("Punga", { cd: 20, execucao: "padrão" }),
      uso("Sabotar", { cd: "simples 20 · complexa 30", execucao: "1d4 rodadas (–5: completa)" }),
    ] },
    { chave: "luta", nome: "Luta", atributo: "for", pagina: 121, usos: [uso("Ataque corpo a corpo", { cd: "Defesa do alvo" })] },
    { chave: "misticismo", nome: "Misticismo", atributo: "int", treinada: true, pagina: 121, usos: [
      uso("Detectar Magia", { cd: 15, execucao: "completa" }),
      uso("Identificar Criatura", { cd: "15 + ND", execucao: "padrão" }),
      uso("Identificar Item Mágico", { cd: "menor 20 · médio 25 · maior 30", execucao: "uma hora (–10: completa)" }),
      uso("Identificar Magia", { cd: "15 + custo em PM", execucao: "reação" }),
      uso("Informação", { cd: "simples — · complexa 20 · mistério 30" }),
      uso("Lançar Magia de Armadura", { cd: "20 + custo em PM", resumo: "Magia arcana usando armadura; sofre penalidade de armadura; falha gasta os PM." }),
    ] },
    { chave: "nobreza", nome: "Nobreza", atributo: "int", treinada: true, pagina: 121, usos: [
      uso("Etiqueta", { cd: 15 }), uso("Informação", { cd: "simples — · complexa 20 · mistério 30" }),
    ] },
    { chave: "oficio", nome: "Ofício", atributo: "int", treinada: true, especializada: true, pagina: 121, usos: [
      uso("Consertar", { cd: "a de fabricar", execucao: "uma hora e 1/10 do preço por tentativa" }),
      uso("Fabricar", { cd: "simples 15 · complexo 20", resumo: "Matéria-prima: 1/3 do preço. Tempo: um dia (consumível), uma semana (comum) ou um mês (superior/mágico). Consumível: –5 para fazer dois." }),
      uso("Identificar", { cd: 20, execucao: "completa" }),
      uso("Sustento", { cd: 15, execucao: "uma semana", resumo: "T$ 1, +1 por ponto acima da CD." }),
    ], nota: "Sem instrumentos de ofício: –5." },
    { chave: "percepcao", nome: "Percepção", atributo: "sab", pagina: 122, usos: [
      uso("Observar", { cd: "15 a 30 (ou o teste de quem se esconde); ler lábios 20" }),
      uso("Ouvir", { cd: "conversa 0 · sussurro 15 · porta +10 · dormindo –10" }),
    ] },
    { chave: "pilotagem", nome: "Pilotagem", atributo: "des", treinada: true, pagina: 122, usos: [
      uso("Conduzir veículo", { cd: "15 (extremo 25)", execucao: "movimento" }),
    ] },
    { chave: "pontaria", nome: "Pontaria", atributo: "des", pagina: 122, usos: [uso("Ataque à distância", { cd: "Defesa do alvo" })] },
    { chave: "reflexos", nome: "Reflexos", atributo: "des", resistencia: true, pagina: 122, usos: [uso("Resistir", { cd: "do efeito" })] },
    { chave: "religiao", nome: "Religião", atributo: "sab", treinada: true, pagina: 122, usos: [
      uso("Identificar Criatura", { cd: "15 + ND" }), uso("Identificar Item Mágico", { cd: "menor 20 · médio 25 · maior 30" }),
      uso("Informação", { cd: "simples — · complexa 20 · mistério 30" }),
      uso("Rito", { cd: 20, resumo: "Inclui a penitência de um devoto (T$ 100 por nível ou missão)." }),
    ] },
    { chave: "sobrevivencia", nome: "Sobrevivência", atributo: "sab", pagina: 123, usos: [
      uso("Acampamento", { cd: "15 / 20 / 25 / 30 (–5 por aridez ou clima)", resumo: "Sem equipamento de viagem: –5." }),
      uso("Identificar Criatura", { cd: "15 + ND" }),
      uso("Orientar-se", { cd: "do terreno", execucao: "um dia" }),
      uso("Rastrear", { cd: "15 / 20 / 25 (±5)", treinado: true }),
    ] },
    { chave: "vontade", nome: "Vontade", atributo: "sab", resistencia: true, pagina: 123, usos: [uso("Resistir", { cd: "do efeito" })] },
  ];
  var OFICIOS = [
    { chave: "armeiro", nome: "Armeiro", fabrica: ["arma", "armadura", "escudo"] },
    { chave: "artesao", nome: "Artesão", fabrica: ["aventura", "ferramenta", "esoterico", "veiculo"] },
    { chave: "alquimista", nome: "Alquimista", fabrica: ["alquimico"] },
    { chave: "cozinheiro", nome: "Cozinheiro", fabrica: ["alimentacao"] },
    { chave: "alfaiate", nome: "Alfaiate", fabrica: ["vestuario"] },
    /* Ofícios que o livro cita em habilidades de classe (p. 38, 69–71). */
    { chave: "engenhoqueiro", nome: "Engenhoqueiro", fabrica: ["engenhoca"] },
    { chave: "escriba", nome: "Escriba", fabrica: ["pergaminho"] },
    /* "Você pode inventar outros tipos de Ofício" (p. 121): os exemplos
       do livro, com os usos combinados com o mestre. */
    { chave: "carpinteiro", nome: "Carpinteiro", fabrica: [], mestre: true },
    { chave: "pedreiro", nome: "Pedreiro", fabrica: [], mestre: true },
    { chave: "ourives", nome: "Ourives", fabrica: [], mestre: true },
    { chave: "fazendeiro", nome: "Fazendeiro", fabrica: [], mestre: true },
    { chave: "pescador", nome: "Pescador", fabrica: [], mestre: true },
    { chave: "estalajadeiro", nome: "Estalajadeiro", fabrica: [], mestre: true },
    { chave: "escultor", nome: "Escultor", fabrica: [], mestre: true },
    { chave: "pintor", nome: "Pintor", fabrica: [], mestre: true },
  ];

  /* ---------- nível, treino e XP (p. 35, 114) ---------- */
  function xpDoNivel(n) { var k = Math.max(1, Math.min(20, Math.floor(n))); return 500 * k * (k - 1); }
  function nivelDoXp(xp) { var n = 1; while (n < 20 && xp >= xpDoNivel(n + 1)) n++; return n; }
  function bonusDeTreino(nivel) { return nivel >= 15 ? 6 : nivel >= 7 ? 4 : 2; }
  var PATAMARES = [
    { chave: "iniciante", nome: "Iniciante", de: 1, ate: 4 },
    { chave: "veterano", nome: "Veterano", de: 5, ate: 10 },
    { chave: "campeao", nome: "Campeão", de: 11, ate: 16 },
    { chave: "lenda", nome: "Lenda", de: 17, ate: 20 },
  ];
  function patamar(nivel) { for (var i = 0; i < PATAMARES.length; i++) if (nivel <= PATAMARES[i].ate) return PATAMARES[i]; return PATAMARES[3]; }

  /* ---------- tamanho (Tabela 1-21, p. 107) ---------- */
  var TAMANHOS = [
    { chave: "minusculo", nome: "Minúsculo", espaco: "1,5m", furtividade: 5, manobra: -5, passosArma: -1 },
    { chave: "pequeno", nome: "Pequeno", espaco: "1,5m", furtividade: 2, manobra: -2, passosArma: 0 },
    { chave: "medio", nome: "Médio", espaco: "1,5m", furtividade: 0, manobra: 0, passosArma: 0 },
    { chave: "grande", nome: "Grande", espaco: "3m", furtividade: -2, manobra: 2, passosArma: 1 },
    { chave: "enorme", nome: "Enorme", espaco: "4,5m", furtividade: -5, manobra: 5, passosArma: 1 },
    { chave: "colossal", nome: "Colossal", espaco: "9m", furtividade: -10, manobra: 10, passosArma: 2 },
  ];

  /* ---------- descanso (p. 106) ---------- */
  var DESCANSO = [
    { chave: "ruim", nome: "Ruim", fator: 0.5, exemplo: "ao relento, sem saco de dormir e acampamento" },
    { chave: "normal", nome: "Normal", fator: 1, exemplo: "estalagem comum" },
    { chave: "confortavel", nome: "Confortável", fator: 2 },
    { chave: "luxuosa", nome: "Luxuosa", fator: 3 },
  ];

  /* ---------- idade (p. 108) ---------- */
  var IDADE_INICIAL = {
    "1d6+15": ["barbaro", "bucaneiro", "ladino", "lutador"],
    "2d4+15": ["bardo", "cacador", "cavaleiro", "guerreiro", "nobre", "paladino"],
    "2d6+15": ["arcanista", "clerigo", "druida", "inventor"],
  };
  var ENVELHECIMENTO = [
    { nome: "Maduro", idade: 45, mod: { "for": -1, des: -1, con: -1, "int": 1, sab: 1, car: 1 } },
    { nome: "Velho", idade: 70, mod: { "for": -2, des: -2, con: -2, "int": 1, sab: 1, car: 1 } },
  ];
  var LONGEVIDADE = { anao: 2, qareen: 2, dahllan: 5, elfo: 5, golem: 5, osteon: 5, silfide: 5 };

  var ALINHAMENTOS = [
    ["LB", "Leal e Bondoso"], ["NB", "Neutro e Bondoso"], ["CB", "Caótico e Bondoso"],
    ["LN", "Leal e Neutro"], ["N", "Neutro"], ["CN", "Caótico e Neutro"],
    ["LM", "Leal e Maligno"], ["NM", "Neutro e Maligno"], ["CM", "Caótico e Maligno"],
  ];

  /* ---------- condições (p. 394–395) ----------
     Condições de efeitos iguais não se acumulam: vale a mais severa
     (desprevenido + vulnerável = –5 na Defesa, não –7). Sem indicação,
     terminam no fim da cena. `agrava`: receber de novo vira outra.
     `inclui`: condições que ela implica. `efeitos` usam a língua comum;
     `grupo` agrupa penalidades que não se somam entre si. */
  function cond(id, nome, resumo, extra) { return Object.assign({ id: id, nome: nome, resumo: resumo, efeitos: [] }, extra || {}); }
  var CONDICOES = [
    cond("abalado", "Abalado", "–2 em testes de perícia. De novo: apavorado.", { tipo: "medo", agrava: "apavorado", efeitos: [{ alvo: "pericias", valor: -2, grupo: "medo" }] }),
    cond("agarrado", "Agarrado", "Desprevenido e imóvel; –2 em ataques; só ataca com armas leves. Ataque à distância contra quem está numa manobra agarrar tem 50% de acertar o alvo errado.", { tipo: "movimento", inclui: ["desprevenido", "imovel"], efeitos: [{ alvo: "ataque", valor: -2, grupo: "agarrado" }] }),
    cond("alquebrado", "Alquebrado", "Habilidades custam +1 PM.", { tipo: "mental", efeitos: [{ alvo: "custoPM", valor: 1 }] }),
    cond("apavorado", "Apavorado", "–5 em testes de perícia; não se aproxima voluntariamente da fonte do medo.", { tipo: "medo", efeitos: [{ alvo: "pericias", valor: -5, grupo: "medo" }] }),
    cond("atordoado", "Atordoado", "Desprevenido e não pode fazer ações.", { tipo: "mental", inclui: ["desprevenido"], semAcoes: true }),
    cond("caido", "Caído", "–5 na Defesa contra corpo a corpo e +5 contra distância; –5 em ataques corpo a corpo; deslocamento 1,5m.", { efeitos: [{ alvo: "defesa.corpo", valor: -5, cumulativo: true }, { alvo: "defesa.distancia", valor: 5, cumulativo: true }, { alvo: "ataque.corpo", valor: -5, grupo: "caido" }], deslocamentoFixo: 1.5 }),
    cond("cego", "Cego", "Desprevenido e lento; sem Percepção para observar; –5 em perícias de Força e Destreza; seus alvos têm camuflagem total.", { tipo: "sentidos", inclui: ["desprevenido", "lento"], efeitos: [{ alvo: "pericias.for", valor: -5, grupo: "fisico" }, { alvo: "pericias.des", valor: -5, grupo: "fisico" }], falhaAtaque: 50 }),
    cond("confuso", "Confuso", "No início do turno, 1d6: 1 move-se em direção aleatória (1d8); 2–3 não age; 4–5 ataca a criatura mais próxima (ou a si); 6 a condição termina.", { tipo: "mental", inicioDoTurno: { rolar: "1d6", tabela: [[1, 1, "move-se numa direção sorteada (1d8)"], [2, 3, "não pode fazer ações"], [4, 5, "ataca a criatura mais próxima (ou a si mesmo)"], [6, 6, "a condição termina", "termina"]] } }),
    cond("debilitado", "Debilitado", "–5 em testes de Força, Destreza e Constituição e perícias baseadas neles. De novo: inconsciente.", { agrava: "inconsciente", efeitos: [{ alvo: "pericias.for", valor: -5, grupo: "fisico" }, { alvo: "pericias.des", valor: -5, grupo: "fisico" }, { alvo: "pericias.con", valor: -5, grupo: "fisico" }, { alvo: "atributos.fisicos", valor: -5, grupo: "fisico" }] }),
    cond("desprevenido", "Desprevenido", "–5 na Defesa e em Reflexos.", { efeitos: [{ alvo: "defesa", valor: -5, grupo: "defesa" }, { alvo: "pericia.reflexos", valor: -5, grupo: "reflexos" }] }),
    cond("doente", "Doente", "Sob efeito de uma doença.", { tipo: "metabolismo" }),
    cond("emChamas", "Em chamas", "No início do turno, 1d6 de fogo. Ação padrão para apagar; água apaga.", { inicioDoTurno: { dano: "1d6", tipo: "fogo" }, removivel: "acao padrao" }),
    cond("enfeiticado", "Enfeitiçado", "Prestativo com a fonte, que recebe +10 em Diplomacia com ele.", { tipo: "mental" }),
    cond("enjoado", "Enjoado", "Só uma ação padrão ou de movimento por rodada (investida avança no máximo o deslocamento).", { tipo: "metabolismo", umaAcao: true }),
    cond("enredado", "Enredado", "Lento, vulnerável e –2 em ataques.", { tipo: "movimento", inclui: ["lento", "vulneravel"], efeitos: [{ alvo: "ataque", valor: -2, grupo: "enredado" }] }),
    cond("envenenado", "Envenenado", "Efeito conforme o veneno (perda de vida recorrente cumulativa ou outra condição).", { tipo: "veneno" }),
    cond("esmorecido", "Esmorecido", "–5 em testes de Inteligência, Sabedoria e Carisma e perícias baseadas neles.", { tipo: "mental", efeitos: [{ alvo: "pericias.int", valor: -5, grupo: "mental" }, { alvo: "pericias.sab", valor: -5, grupo: "mental" }, { alvo: "pericias.car", valor: -5, grupo: "mental" }] }),
    cond("exausto", "Exausto", "Debilitado, lento e vulnerável. De novo: inconsciente.", { tipo: "cansaco", agrava: "inconsciente", inclui: ["debilitado", "lento", "vulneravel"] }),
    cond("fascinado", "Fascinado", "–5 em Percepção; só observa o que o fascinou. Ação hostil contra ele anula; sacudi-lo é ação padrão.", { tipo: "mental", efeitos: [{ alvo: "pericia.percepcao", valor: -5, grupo: "percepcao" }], semAcoes: true }),
    cond("fatigado", "Fatigado", "Fraco e vulnerável. De novo: exausto.", { tipo: "cansaco", agrava: "exausto", inclui: ["fraco", "vulneravel"] }),
    cond("fraco", "Fraco", "–2 em testes de Força, Destreza e Constituição e perícias baseadas neles. De novo: debilitado.", { agrava: "debilitado", efeitos: [{ alvo: "pericias.for", valor: -2, grupo: "fisico" }, { alvo: "pericias.des", valor: -2, grupo: "fisico" }, { alvo: "pericias.con", valor: -2, grupo: "fisico" }] }),
    cond("frustrado", "Frustrado", "–2 em testes de Inteligência, Sabedoria e Carisma e perícias baseadas neles. De novo: esmorecido.", { tipo: "mental", agrava: "esmorecido", efeitos: [{ alvo: "pericias.int", valor: -2, grupo: "mental" }, { alvo: "pericias.sab", valor: -2, grupo: "mental" }, { alvo: "pericias.car", valor: -2, grupo: "mental" }] }),
    cond("imovel", "Imóvel", "Todos os deslocamentos ficam 0m.", { tipo: "movimento", deslocamentoFixo: 0 }),
    cond("inconsciente", "Inconsciente", "Indefeso; sem ações nem reações (faz os testes naturais, como estabilizar). Sacudir para acordar: ação padrão.", { inclui: ["indefeso"], semAcoes: true, semReacoes: true }),
    cond("indefeso", "Indefeso", "Desprevenido, –10 na Defesa, falha automaticamente em Reflexos e pode sofrer golpe de misericórdia.", { inclui: ["desprevenido"], efeitos: [{ alvo: "defesa", valor: -10, grupo: "defesa" }], falhaReflexos: true }),
    cond("lento", "Lento", "Deslocamentos pela metade; não corre nem faz investidas.", { tipo: "movimento", deslocamentoFator: 0.5 }),
    cond("ofuscado", "Ofuscado", "–2 em ataques e Percepção.", { tipo: "sentidos", efeitos: [{ alvo: "ataque", valor: -2, grupo: "ofuscado" }, { alvo: "pericia.percepcao", valor: -2, grupo: "ofuscadoP" }] }),
    cond("paralisado", "Paralisado", "Imóvel e indefeso; só ações puramente mentais.", { tipo: "movimento", inclui: ["imovel", "indefeso"] }),
    cond("pasmo", "Pasmo", "Não pode fazer ações.", { tipo: "mental", semAcoes: true }),
    cond("petrificado", "Petrificado", "Inconsciente e RD 8.", { tipo: "metamorfose", inclui: ["inconsciente"], rd: 8 }),
    cond("sangrando", "Sangrando", "No início do turno, Constituição CD 15: falhou perde 1d6 PV; passou, remove a condição.", { tipo: "metabolismo", inicioDoTurno: { teste: { atributo: "con", cd: 15 }, falha: { perda: "1d6" }, sucesso: "remove" } }),
    cond("sobrecarregado", "Sobrecarregado", "Penalidade de armadura –5 e deslocamento –3m.", { tipo: "movimento", efeitos: [{ alvo: "penalidadeArmadura", valor: -5 }], deslocamento: -3 }),
    cond("surdo", "Surdo", "Sem Percepção para ouvir; –5 em Iniciativa; condição ruim para lançar magias.", { tipo: "sentidos", efeitos: [{ alvo: "pericia.iniciativa", valor: -5, grupo: "iniciativa" }], conjuracaoRuim: true }),
    cond("surpreendido", "Surpreendido", "Desprevenido e não pode fazer ações.", { inclui: ["desprevenido"], semAcoes: true }),
    cond("vulneravel", "Vulnerável", "–2 na Defesa.", { efeitos: [{ alvo: "defesa", valor: -2, grupo: "defesa" }] }),
  ];

  /* ---------- combate (p. 230–239) ---------- */
  var TIPOS_DANO = [
    ["acido", "Ácido"], ["corte", "Corte"], ["eletricidade", "Eletricidade"], ["essencia", "Essência"], ["fogo", "Fogo"], ["frio", "Frio"],
    ["impacto", "Impacto"], ["luz", "Luz"], ["perfuracao", "Perfuração"], ["psiquico", "Psíquico"], ["trevas", "Trevas"],
  ];
  var SIGLA_DANO = { C: "corte", I: "impacto", P: "perfuracao" };
  var SITUACOES = {
    atacante: [["caido", "Caído", -5], ["elevado", "Em posição elevada", 2], ["flanqueando", "Flanqueando (corpo a corpo)", 2], ["invisivel", "Invisível", 5], ["ofuscado", "Ofuscado", -2], ["cego", "Cego (50% de falha)", 0]],
    alvo: [["caidoCorpo", "Caído (contra corpo a corpo)", -5], ["caidoDistancia", "Caído (contra distância)", 5], ["cego", "Cego", -5], ["desprevenido", "Desprevenido", -5], ["coberturaLeve", "Cobertura leve", 5], ["camuflagemLeve", "Camuflagem leve (20% de falha)", 0], ["camuflagemTotal", "Camuflagem total (50% de falha)", 0]],
    distanciaEmCorpo: -5, alcanceDobro: -5, naoProficiente: -5, naoLetal: -5, investida: { ataque: 2, defesa: -2 },
  };
  var MANOBRAS = [
    { id: "agarrar", nome: "Agarrar", resumo: "Alvo fica agarrado; soltar-se: ação padrão e manobra oposta. Só com desarmado ou arma natural; trocar um ataque por agarrar causa dano de impacto." },
    { id: "derrubar", nome: "Derrubar", resumo: "Alvo fica caído; vencendo por 5, também é empurrado 1,5m (beirada: Reflexos CD 20)." },
    { id: "desarmar", nome: "Desarmar", resumo: "Derruba um item empunhado; vencendo por 5, empurra o item 1,5m." },
    { id: "empurrar", nome: "Empurrar", resumo: "Empurra 1,5m, +1,5m a cada 5 de diferença; movimento para acompanhar." },
    { id: "quebrar", nome: "Quebrar", resumo: "Ataca um item empunhado (Defesa, RD e PV do objeto)." },
  ];
  /* Morte (p. 236): 0 PV ou menos = inconsciente e sangrando; morre em
     –10 ou –metade dos PV máximos, o que for mais baixo. */
  function limiteDeMorte(pvMax) { return Math.min(-10, -Math.floor((Number(pvMax) || 0) / 2)); }
  var TESTES_ESTENDIDOS = [{ sucessos: 3, complexidade: "Baixa" }, { sucessos: 5, complexidade: "Média" }, { sucessos: 7, complexidade: "Alta" }];
  var DIFICULDADES = [[5, "Fácil"], [10, "Média"], [15, "Difícil"], [20, "Desafiadora"], [25, "Formidável"], [30, "Heroica"], [40, "Quase impossível"]];
  var ACOES = ["padrao", "movimento", "completa", "livre", "reacao"];
  var NOMES_ACAO = { padrao: "Ação padrão", movimento: "Ação de movimento", completa: "Ação completa", livre: "Ação livre", reacao: "Reação" };

  function porChave(lista) { var m = {}; lista.forEach(function (x) { m[x.chave || x.id] = x; }); return m; }

  global.RAMATormenta20Dados = {
    FONTE: FONTE,
    ATRIBUTOS: ATRIBUTOS, CHAVES_ATRIBUTO: CHAVES_ATRIBUTO,
    CUSTO_PONTOS: CUSTO_PONTOS, PONTOS_INICIAIS: PONTOS_INICIAIS, SOMA_MINIMA_ROLAGEM: SOMA_MINIMA_ROLAGEM,
    atributoDaRolagem: atributoDaRolagem, ATRIBUTO_MINIMO: ATRIBUTO_MINIMO,
    PERICIAS: PERICIAS, PERICIA: porChave(PERICIAS), OFICIOS: OFICIOS,
    xpDoNivel: xpDoNivel, nivelDoXp: nivelDoXp, bonusDeTreino: bonusDeTreino,
    PATAMARES: PATAMARES, patamar: patamar,
    TAMANHOS: TAMANHOS, TAMANHO: porChave(TAMANHOS),
    DESCANSO: DESCANSO, IDADE_INICIAL: IDADE_INICIAL, ENVELHECIMENTO: ENVELHECIMENTO, LONGEVIDADE: LONGEVIDADE,
    ALINHAMENTOS: ALINHAMENTOS,
    CONDICOES: CONDICOES, CONDICAO: porChave(CONDICOES),
    TIPOS_DANO: TIPOS_DANO, SIGLA_DANO: SIGLA_DANO, SITUACOES: SITUACOES, MANOBRAS: MANOBRAS,
    limiteDeMorte: limiteDeMorte, TESTES_ESTENDIDOS: TESTES_ESTENDIDOS, DIFICULDADES: DIFICULDADES,
    ACOES: ACOES, NOMES_ACAO: NOMES_ACAO,
    CUSTO_CIRCULO: { 1: 1, 2: 3, 3: 6, 4: 10, 5: 15 },
    ESCOLAS: [["abjuracao", "Abjuração"], ["adivinhacao", "Adivinhação"], ["convocacao", "Convocação"], ["encantamento", "Encantamento"], ["evocacao", "Evocação"], ["ilusao", "Ilusão"], ["necromancia", "Necromancia"], ["transmutacao", "Transmutação"]],
    ALCANCE_METROS: { pessoal: 0, toque: 1.5, curto: 9, medio: 30, longo: 90 },
    porChave: porChave,
  };
})(typeof window !== "undefined" ? window : globalThis);
