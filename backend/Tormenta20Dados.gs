/* =====================================================================
   R.A.M.A. — Tormenta20 (Jogo do Ano) no servidor: os catálogos (v8.0)
   =====================================================================
   Cópia fiel dos dados de js/tormenta20/ (não edite aqui): constantes,
   expressões, raças, classes, origens, divindades, poderes,
   equipamento, magias, ameaças e perigos, parceiros e itens mágicos.
   O motor e a mesa estão em Tormenta20.gs. Cada arquivo entra entre os
   marcadores; testes/gerar-tormenta20-gs.js atualiza e a suíte do
   backend confere. A ordem interna importa (o registro das magias e das
   ameaças vem antes das partes); entre arquivos .gs não importa: o
   motor só consulta os catálogos quando é chamado.
   ===================================================================== */

/* >>> js/tormenta20/dados.js */
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
/* <<< js/tormenta20/dados.js */

/* >>> js/tormenta20/expressao.js */
/* =====================================================================
   R.A.M.A. — Tormenta20 · expressões dos dados
   ---------------------------------------------------------------------
   Os catálogos escrevem valores como "1 + floor((nc - 3) / 6)",
   "min(atr.car, nivel)" ou "tem.peleDeAco ? 8 : 4". Isto avalia essas
   expressões SEM eval: um analisador pequeno, com números, textos entre
   aspas, nomes com ponto, + − × ÷, comparações, &&, ||, !, ?: e as
   funções floor, ceil, min, max, abs. Nome desconhecido vale 0.
   ===================================================================== */

(function (global) {
  "use strict";

  var FUNCOES = {
    floor: Math.floor, ceil: Math.ceil, abs: Math.abs, round: Math.round,
    min: function () { return Math.min.apply(null, arguments); },
    max: function () { return Math.max.apply(null, arguments); },
  };

  function tokens(s) {
    var out = [], i = 0;
    while (i < s.length) {
      var c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (/[0-9.]/.test(c)) { var j = i; while (j < s.length && /[0-9.]/.test(s[j])) j++; out.push({ t: "n", v: Number(s.slice(i, j)) }); i = j; continue; }
      if (/[A-Za-z_]/.test(c)) { var k = i; while (k < s.length && /[A-Za-z0-9_.:]/.test(s[k])) k++; out.push({ t: "id", v: s.slice(i, k) }); i = k; continue; }
      if (c === "'" || c === '"') { var f = s.indexOf(c, i + 1); if (f < 0) throw new Error("texto sem fim"); out.push({ t: "s", v: s.slice(i + 1, f) }); i = f + 1; continue; }
      var dois = s.slice(i, i + 2);
      if (["&&", "||", ">=", "<=", "==", "!="].indexOf(dois) >= 0) { out.push({ t: "op", v: dois }); i += 2; continue; }
      if ("+-*/()?:,<>!".indexOf(c) >= 0) { out.push({ t: "op", v: c }); i++; continue; }
      throw new Error("caractere inválido: " + c);
    }
    return out;
  }

  function avaliar(expr, ctx) {
    if (typeof expr === "number") return expr;
    if (expr === null || expr === undefined || expr === "") return 0;
    if (typeof expr === "boolean") return expr ? 1 : 0;
    var tk;
    try { tk = tokens(String(expr)); } catch (e) { return 0; }
    var p = 0;
    function olha() { return tk[p]; }
    function e(op) { if (tk[p] && tk[p].t === "op" && tk[p].v === op) { p++; return true; } return false; }
    function valorDe(nome) {
      var v = typeof ctx === "function" ? ctx(nome) : (ctx ? ctx[nome] : undefined);
      if (v === undefined && ctx && typeof ctx !== "function" && nome.indexOf(".") > 0) {
        var partes = nome.split("."), o = ctx;
        for (var q = 0; q < partes.length && o !== undefined && o !== null; q++) o = o[partes[q]];
        v = o;
      }
      if (v === undefined || v === null) return 0;
      if (typeof v === "boolean") return v ? 1 : 0;
      return v;
    }
    function primario() {
      var t = olha();
      if (!t) return 0;
      if (e("(")) { var v = ternario(); e(")"); return v; }
      if (e("-")) return -num(primario());
      if (e("!")) return verdade(primario()) ? 0 : 1;
      p++;
      if (t.t === "n") return t.v;
      if (t.t === "s") return t.v;
      if (t.t === "id") {
        if (t.v === "true") return 1;
        if (t.v === "false") return 0;
        if (FUNCOES[t.v] && olha() && olha().v === "(") {
          p++;
          var args = [];
          if (!e(")")) { do { args.push(num(ternario())); } while (e(",")); e(")"); }
          return FUNCOES[t.v].apply(null, args);
        }
        return valorDe(t.v);
      }
      return 0;
    }
    function num(v) { return typeof v === "number" ? v : (isFinite(Number(v)) ? Number(v) : 0); }
    function verdade(v) { return typeof v === "string" ? v !== "" && v !== "0" : !!v; }
    function mult() { var v = primario(); for (;;) { if (e("*")) v = num(v) * num(primario()); else if (e("/")) { var d = num(primario()); v = d ? num(v) / d : 0; } else return v; } }
    function soma() { var v = mult(); for (;;) { if (e("+")) { var b = mult(); v = (typeof v === "string" || typeof b === "string") ? String(v) + String(b) : v + b; } else if (e("-")) v = num(v) - num(mult()); else return v; } }
    function comp() {
      var v = soma();
      for (;;) {
        if (e(">=")) v = num(v) >= num(soma()) ? 1 : 0;
        else if (e("<=")) v = num(v) <= num(soma()) ? 1 : 0;
        else if (e(">")) v = num(v) > num(soma()) ? 1 : 0;
        else if (e("<")) v = num(v) < num(soma()) ? 1 : 0;
        else if (e("==")) v = String(v) === String(soma()) ? 1 : 0;
        else if (e("!=")) v = String(v) !== String(soma()) ? 1 : 0;
        else return v;
      }
    }
    function e_() { var v = comp(); while (e("&&")) { var b = comp(); v = verdade(v) && verdade(b) ? (verdade(b) ? b : 1) : 0; } return v; }
    function ou() { var v = e_(); while (e("||")) { var b = e_(); v = verdade(v) ? v : b; } return v; }
    function ternario() { var c = ou(); if (e("?")) { var a = ternario(); e(":"); var b = ternario(); return verdade(c) ? a : b; } return c; }
    var r = ternario();
    return r;
  }
  function numero(expr, ctx) { var v = avaliar(expr, ctx); return typeof v === "number" && isFinite(v) ? v : (isFinite(Number(v)) ? Number(v) : 0); }
  function texto(expr, ctx) { var v = avaliar(expr, ctx); return v === 0 && typeof expr === "string" && !/[a-z]/i.test(expr) ? "0" : String(v); }

  /* "(1 + x)d12", "(2 + 2 * x)d6", "2d6 + 1": resolve as partes entre
     parênteses antes do "d" e devolve uma expressão de dado simples. */
  function dados(expr, ctx) {
    if (expr === null || expr === undefined) return "";
    var s = String(expr);
    s = s.replace(/\(([^()]*)\)\s*d(\d+)/g, function (m, dentro, faces) { return Math.max(0, Math.floor(numero(dentro, ctx))) + "d" + faces; });
    s = s.replace(/\b([a-z][A-Za-z0-9_.]*)\s*d(\d+)/g, function (m, nome, faces) { return Math.max(0, Math.floor(numero(nome, ctx))) + "d" + faces; });
    s = s.replace(/\(([^()]*)\)/g, function (m, dentro) { return /\d+d\d+/.test(dentro) ? m : String(Math.floor(numero(dentro, ctx))); });
    s = s.replace(/(^|[^A-Za-z0-9_.])([a-z][A-Za-z0-9_.]*)/g, function (m, antes, nome) { return /^d\d+$/.test(nome) ? m : antes + Math.floor(numero(nome, ctx)); });
    s = s.replace(/\s+/g, "").replace(/\+-/g, "-").replace(/-\+/g, "-").replace(/\+0(?![\d.d])/g, "");
    return s;
  }

  /* Expressão que vira dado: com aspas ou ?: avalia antes (o resultado é
     o texto do dado); sem isso, resolve direto as partes do dado. */
  function rolavel(expr, ctx) {
    if (expr === null || expr === undefined || expr === "") return "";
    if (typeof expr === "number") return String(expr);
    var s = String(expr);
    if (/['"?]/.test(s)) return dados(texto(s, ctx), ctx);
    return dados(s, ctx);
  }

  global.RAMATormenta20Expressao = { avaliar: avaliar, numero: numero, texto: texto, dados: dados, rolavel: rolavel };
})(typeof window !== "undefined" ? window : globalThis);
/* <<< js/tormenta20/expressao.js */

/* >>> js/tormenta20/racas.js */
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
/* <<< js/tormenta20/racas.js */

/* >>> js/tormenta20/classes-a.js */
/* =====================================================================
   R.A.M.A. — Tormenta20 · classes (1/3): Arcanista, Bárbaro, Bardo,
   Bucaneiro, Caçador
   ---------------------------------------------------------------------
   Formato (ver docs/TORMENTA20.md):
     pv { inicial, nivel } (+ Con), pm (por nível), pericias { fixas,
     ou: [[a,b]], escolha { n, de } }, proficiencias, magias,
     tabela: nível → ids de habilidades, habilidades { id: {…} },
     poderes [ { id, nome, req, … } ].
   Expressões em `valor`: nivel, nc (nível nesta classe), atr.X, x (PM
   extras de uma ativação escalonável), tem.ID, floor/min/max.
   `req`: { nc, nivel, atr: {for: 1}, poderes: [], pericias: [],
   caminho, escolha }.
   ===================================================================== */

(function (global) {
  "use strict";

  var C = global.RAMATormenta20Classes = global.RAMATormenta20Classes || { CLASSES: [], CLASSE: {} };
  function registrar(c) { c.fonte = "T20"; C.CLASSES.push(c); C.CLASSE[c.id] = c; }
  function tabela(linhas) { var t = {}; linhas.forEach(function (l, i) { t[i + 1] = l; }); return t; }
  var AUMENTO = { id: "aumentoDeAtributo", nome: "Aumento de Atributo", resumo: "+1 em um atributo; várias vezes, uma vez por patamar para o mesmo atributo.", repetivel: true, aumento: true };

  /* ------------------------------------------------------- ARCANISTA */
  registrar({
    id: "arcanista", nome: "Arcanista", pagina: 36, atributo: "Inteligência ou Carisma",
    pv: { inicial: 8, nivel: 2 }, pm: 6,
    pericias: { fixas: ["misticismo", "vontade"], escolha: { n: 2, de: ["conhecimento", "diplomacia", "enganacao", "guerra", "iniciativa", "intimidacao", "intuicao", "investigacao", "nobreza", "oficio", "percepcao"] } },
    proficiencias: [],
    magias: { tipo: "arcana", atributoPor: "caminho", somaPM: true, circulos: { 1: 1, 5: 2, 9: 3, 13: 4, 17: 5 }, iniciais: 3, porNivel: 1, livre: true },
    tabela: tabela([["caminho", "magias"], ["poder"], ["poder"], ["poder"], ["poder"], ["poder"], ["poder"], ["poder"], ["poder"], ["poder"],
      ["poder"], ["poder"], ["poder"], ["poder"], ["poder"], ["poder"], ["poder"], ["poder"], ["poder"], ["altaArcana", "poder"]]),
    habilidades: {
      caminho: { nome: "Caminho do Arcanista", resumo: "Bruxo (foco, Inteligência), Feiticeiro (linhagem, Carisma, uma magia nova só nos níveis ímpares) ou Mago (grimório, Inteligência, memoriza metade das magias por dia, +1 magia inicial e +1 a cada novo círculo). Não muda depois.",
        escolhas: [{ id: "caminho", tipo: "opcao", fixa: true, opcoes: [["bruxo", "Bruxo"], ["feiticeiro", "Feiticeiro"], ["mago", "Mago"]] }],
        caminhos: {
          bruxo: { atributo: "int", resumo: "Lança com o foco empunhado (outra mão livre) ou faz Misticismo CD 20 + PM. Foco: RD 10 e metade dos seus PV; destruído, você fica atordoado 1 rodada; recuperar custa uma semana e T$ 100.", foco: true },
          feiticeiro: { atributo: "car", resumo: "Escolhe uma linhagem e recebe a herança básica. Aprende magia nova só nos níveis ímpares.", aprendeImpar: true, linhagem: true },
          mago: { atributo: "int", resumo: "Só lança magias memorizadas (metade das conhecidas, estudando o grimório uma hora por dia). +1 magia inicial e +1 magia do círculo novo a cada círculo.", memoriza: true, magiaInicialExtra: 1, magiaPorCirculo: 1 },
        } },
      magias: { nome: "Magias", resumo: "Magias arcanas: 1º círculo no 1º nível, um círculo a mais a cada quatro níveis. Começa com três de 1º círculo e aprende uma por nível. Soma o atributo-chave nos PM." },
      poder: { nome: "Poder de Arcanista", poder: true },
      altaArcana: { nome: "Alta Arcana", resumo: "Magias arcanas custam metade dos PM (depois de aprimoramentos e reduções).", efeitos: [{ t: "custoMagia", fator: 0.5, tipoMagia: "arcana" }] },
    },
    linhagens: {
      draconica: { nome: "Linhagem Dracônica", escolha: { id: "elemento", opcoes: [["acido", "Ácido"], ["eletricidade", "Eletricidade"], ["fogo", "Fogo"], ["frio", "Frio"]] },
        basica: { resumo: "Soma o Carisma nos PV iniciais; redução 5 ao tipo escolhido.", efeitos: [{ t: "bonus", alvo: "pvInicial", valor: "atr.car" }, { t: "rd", tipoEscolhido: "elemento", valor: 5 }] },
        aprimorada: { resumo: "Magias do tipo escolhido custam –1 PM e causam +1 por dado.", efeitos: [{ t: "descontoMagia", valor: 1, danoTipo: "elemento" }, { t: "danoPorDadoMagia", valor: 1, danoTipo: "elemento" }] },
        superior: { resumo: "Soma o dobro do Carisma nos PV iniciais; imune ao tipo; derrubar inimigos com magia do tipo dá PM temporários iguais ao círculo.", efeitos: [{ t: "bonus", alvo: "pvInicial", valor: "atr.car" }, { t: "imune", tipoEscolhido: "elemento" }] } },
      feerica: { nome: "Linhagem Feérica",
        basica: { resumo: "Treinado em Enganação; aprende uma magia de 1º círculo de encantamento ou ilusão, arcana ou divina.", efeitos: [{ t: "treino", pericia: "enganacao" }], escolhas: [{ id: "magia", tipo: "magia", circulo: 1, escolas: ["encantamento", "ilusao"], qualquerTipo: true, quantidade: 1 }] },
        aprimorada: { resumo: "+2 na CD e –1 PM nas magias de encantamento e ilusão.", efeitos: [{ t: "cdMagia", valor: 2, escolas: ["encantamento", "ilusao"] }, { t: "descontoMagia", valor: 1, escolas: ["encantamento", "ilusao"] }] },
        superior: { resumo: "+2 em Carisma; quem resistir a sua magia de encantamento ou ilusão deixa você alquebrado até o fim da cena.", efeitos: [{ t: "bonus", alvo: "atr.car", valor: 2 }] } },
      rubra: { nome: "Linhagem Rubra",
        basica: { resumo: "Um poder da Tormenta; pode perder outro atributo em vez de Carisma pelos poderes da Tormenta.", escolhas: [{ id: "poder", tipo: "poderTormenta", quantidade: 1 }], efeitos: [{ t: "perdaTormentaEscolhida" }] },
        aprimorada: { resumo: "Uma magia por poder da Tormenta custa –1 PM. Conta como poder da Tormenta (exceto perda de Carisma).", contaComo: "poderTormenta", efeitos: [{ t: "descontoMagiaPorPoderTormenta", valor: 1 }] },
        superior: { resumo: "+4 PM por poder da Tormenta. Conta como poder da Tormenta (exceto perda de Carisma).", contaComo: "poderTormenta", efeitos: [{ t: "bonus", alvo: "pm", valor: "4 * poderesTormenta" }] } },
    },
    familiares: [
      ["borboleta", "Borboleta", "+1 na CD de Vontade das suas magias.", [{ t: "cdMagia", valor: 1, resistencia: "vontade" }]],
      ["cobra", "Cobra", "+1 na CD de Fortitude das suas magias.", [{ t: "cdMagia", valor: 1, resistencia: "fortitude" }]],
      ["coruja", "Coruja", "1 PM: magia de toque passa a alcance curto.", []],
      ["corvo", "Corvo", "1 PM: em Misticismo ou Vontade rola dois dados e fica com o melhor.", []],
      ["falcao", "Falcão", "Não é surpreendido e nunca fica desprevenido.", [{ t: "imune", valor: "desprevenido" }]],
      ["gato", "Gato", "Visão no escuro e +2 em Furtividade.", [{ t: "sentido", valor: "visaoNoEscuro" }, { t: "bonus", alvo: "pericia.furtividade", valor: 2 }]],
      ["lagarto", "Lagarto", "+1 na CD de Reflexos das suas magias.", [{ t: "cdMagia", valor: 1, resistencia: "reflexos" }]],
      ["morcego", "Morcego", "Percepção às cegas em alcance curto.", [{ t: "sentido", valor: "percepcaoAsCegas" }]],
      ["rato", "Rato", "Usa o atributo-chave em Fortitude, no lugar de Constituição.", [{ t: "atrPericia", pericia: "fortitude", atributo: "chave" }]],
      ["sapo", "Sapo", "Soma o atributo-chave nos PV (cumulativo).", [{ t: "bonus", alvo: "pv", valor: "atr.chave" }]],
    ],
    poderes: [
      { id: "arcanoDeBatalha", nome: "Arcano de Batalha", resumo: "Soma o atributo-chave no dano das magias.", efeitos: [{ t: "danoMagia", valor: "atr.chave" }] },
      AUMENTO,
      { id: "caldeiraoDoBruxo", nome: "Caldeirão do Bruxo", resumo: "Cria poções como Preparar Poção; com os dois, até 5º círculo.", req: { caminho: "bruxo", pericias: ["oficio:alquimista"] } },
      { id: "conhecimentoMagico", nome: "Conhecimento Mágico", resumo: "Aprende duas magias de qualquer círculo que possa lançar.", repetivel: true, efeitos: [{ t: "magiasExtras", valor: 2 }] },
      { id: "contramagicaAprimorada", nome: "Contramágica Aprimorada", resumo: "Uma vez por rodada, contramágica como reação.", req: { magias: ["dissiparMagia"] } },
      { id: "envoltoEmMisterio", nome: "Envolto em Mistério", resumo: "+5 em Enganação e Intimidação contra quem não é treinado em Conhecimento nem Misticismo.", efeitos: [{ t: "bonus", alvo: "pericia.enganacao", valor: 5, cond: "contra não treinados em Conhecimento ou Misticismo" }, { t: "bonus", alvo: "pericia.intimidacao", valor: 5, cond: "contra não treinados em Conhecimento ou Misticismo" }] },
      { id: "escribaArcano", nome: "Escriba Arcano", resumo: "Aprende magias copiando pergaminhos e grimórios: um dia e T$ 250 por PM.", req: { caminho: "mago", pericias: ["oficio:escriba"] } },
      { id: "especialistaEmEscola", nome: "Especialista em Escola", resumo: "+2 na CD das magias de uma escola.", req: { caminho: ["bruxo", "mago"] }, escolhas: [{ id: "escola", tipo: "escola" }], efeitos: [{ t: "cdMagia", valor: 2, escolaEscolhida: "escola" }] },
      { id: "familiar", nome: "Familiar", resumo: "Um animal mágico (parceiro especial, telepatia em alcance longo); morrer deixa você atordoado 1 rodada. Novo: um dia e T$ 100.", escolhas: [{ id: "familiar", tipo: "familiar" }] },
      { id: "fluxoDeMana", nome: "Fluxo de Mana", resumo: "Mantém dois efeitos sustentados com uma ação livre, pagando cada um.", req: { nc: 10 } },
      { id: "focoVital", nome: "Foco Vital", resumo: "Segurando o foco, dano que o levaria a 0 PV deixa você com 1 PV e o excedente vai para o foco.", req: { caminho: "bruxo" } },
      { id: "fortalecimentoArcano", nome: "Fortalecimento Arcano", resumo: "+1 na CD das magias (+2 se lança 4º círculo).", req: { nc: 5 }, efeitos: [{ t: "cdMagia", valor: "circuloMax >= 4 ? 2 : 1" }] },
      { id: "herancaAprimorada", nome: "Herança Aprimorada", resumo: "Recebe a herança aprimorada da linhagem.", req: { caminho: "feiticeiro", nc: 6 }, heranca: "aprimorada" },
      { id: "herancaSuperior", nome: "Herança Superior", resumo: "Recebe a herança superior da linhagem.", req: { poderes: ["herancaAprimorada"], nc: 11 }, heranca: "superior" },
      { id: "magiaPungente", nome: "Magia Pungente", resumo: "Ao lançar, 1 PM para +2 na CD.", opcaoDeMagia: { id: "pungente", custo: 1, cd: 2 } },
      { id: "mestreEmEscola", nome: "Mestre em Escola", resumo: "Magias da escola custam –1 PM.", req: { poderes: ["especialistaEmEscola"], nc: 8 }, escolhas: [{ id: "escola", tipo: "escola", igualA: "especialistaEmEscola.escola" }], efeitos: [{ t: "descontoMagia", valor: 1, escolaEscolhida: "escola" }] },
      { id: "poderMagico", nome: "Poder Mágico", resumo: "+1 PM por nível de arcanista.", efeitos: [{ t: "bonus", alvo: "pm", valor: "nc" }] },
      { id: "raioArcano", nome: "Raio Arcano", resumo: "Ação padrão: 1d8 de essência (+1d8 por círculo acima do 1º que lança) num alvo em alcance curto; Reflexos (CD atributo-chave) reduz à metade. Conta como magia.",
        acao: { custo: 0, execucao: "padrao", alcance: "curto", dano: { dados: "raioArcano", tipo: "essencia" }, resistencia: { pericia: "reflexos", atributo: "chave", efeito: "metade" }, contaComoMagia: true } },
      { id: "raioElemental", nome: "Raio Elemental", resumo: "+1 PM no Raio Arcano: ácido (vulnerável 1 rodada), eletricidade (ofuscado 1 rodada), fogo (em chamas), frio (lento 1 rodada) ou trevas (não cura PV 1 rodada), se falhar em Reflexos.", req: { poderes: ["raioArcano"] } },
      { id: "raioPoderoso", nome: "Raio Poderoso", resumo: "Raio Arcano com d12 e alcance médio.", req: { poderes: ["raioArcano"] } },
      { id: "tintaDoMago", nome: "Tinta do Mago", resumo: "Cria pergaminhos como Escrever Pergaminho; com os dois, metade do custo.", req: { caminho: "mago", pericias: ["oficio:escriba"] } },
    ],
  });

  /* --------------------------------------------------------- BÁRBARO */
  registrar({
    id: "barbaro", nome: "Bárbaro", pagina: 40, atributo: "Força",
    pv: { inicial: 24, nivel: 6 }, pm: 3,
    pericias: { fixas: ["fortitude", "luta"], escolha: { n: 4, de: ["adestramento", "atletismo", "cavalgar", "iniciativa", "intimidacao", "oficio", "percepcao", "pontaria", "sobrevivencia", "vontade"] } },
    proficiencias: ["marciais", "escudos"],
    tabela: tabela([["furia"], ["poder"], ["instintoSelvagem", "poder"], ["poder"], ["poder", "reducaoDeDano"], ["poder"], ["poder"], ["poder"], ["poder"], ["poder"],
      ["poder"], ["poder"], ["poder"], ["poder"], ["poder"], ["poder"], ["poder"], ["poder"], ["poder"], ["furiaTitanica", "poder"]]),
    habilidades: {
      furia: { nome: "Fúria", resumo: "2 PM: +2 em ataque e dano corpo a corpo; sem ações de calma (Furtividade, magias). A cada cinco níveis, +1 PM aumenta o bônus em +1. Termina se, no fim da rodada, você não atacou nem foi alvo de efeito hostil.",
        acao: { id: "furia", custo: 2, execucao: "livre", duracao: "cena", estado: "furia", escala: { pm: 1, max: "floor((nc - 1) / 5)", rotulo: "+1 nos bônus" },
          efeitos: [{ t: "bonus", alvo: "ataque.corpo", valor: "(2 + x) * (tem.furiaTitanica ? 2 : 1)" }, { t: "bonus", alvo: "dano.corpo", valor: "(2 + x) * (tem.furiaTitanica ? 2 : 1)" }],
          impede: ["furtividade", "magia"], termina: "fim da rodada sem atacar nem ser alvo hostil" } },
      poder: { nome: "Poder de Bárbaro", poder: true },
      instintoSelvagem: { nome: "Instinto Selvagem", resumo: "+1 em dano, Percepção e Reflexos; +1 a cada seis níveis.",
        efeitos: [{ t: "bonus", alvo: "dano", valor: "1 + floor((nc - 3) / 6)" }, { t: "bonus", alvo: "pericia.percepcao", valor: "1 + floor((nc - 3) / 6)" }, { t: "bonus", alvo: "pericia.reflexos", valor: "1 + floor((nc - 3) / 6)" }] },
      reducaoDeDano: { nome: "Redução de Dano", resumo: "RD 2 no 5º nível, +2 a cada três níveis (RD 10 no 17º).", efeitos: [{ t: "rd", valor: "min(10, 2 * floor((nc - 2) / 3))" }] },
      furiaTitanica: { nome: "Fúria Titânica", resumo: "Os bônus da Fúria são dobrados." },
    },
    totens: [
      ["coruja", "Coruja", "orientacao"], ["corvo", "Corvo", "visaoMistica"], ["falcao", "Falcão", "detectarAmeacas"], ["grifo", "Grifo", "primorAtletico"],
      ["lobo", "Lobo", "concentracaoDeCombate"], ["raposa", "Raposa", "imagemEspelhada"], ["tartaruga", "Tartaruga", "armaduraArcana"], ["urso", "Urso", "vitalidadeFantasma"],
    ],
    poderes: [
      { id: "almaDeBronze", nome: "Alma de Bronze", resumo: "Ao entrar em fúria, PV temporários iguais a nível + Força.", gatilho: { estado: "furia", pvTemp: "nivel + atr.for" } },
      AUMENTO,
      { id: "bradoAssustador", nome: "Brado Assustador", resumo: "Ação de movimento e 1 PM: inimigos em alcance curto ficam vulneráveis até o fim da cena. Medo.", req: { pericias: ["intimidacao"] },
        acao: { custo: 1, execucao: "movimento", alcance: "curto", alvos: "inimigos", condicao: { id: "vulneravel", duracao: "cena" }, descritores: ["medo"] } },
      { id: "criticoBrutal", nome: "Crítico Brutal", resumo: "+1 no multiplicador de crítico com armas corpo a corpo e de arremesso.", req: { nc: 6 }, efeitos: [{ t: "bonus", alvo: "mult.corpo", valor: 1 }, { t: "bonus", alvo: "mult.arremesso", valor: 1 }] },
      { id: "destruidor", nome: "Destruidor", resumo: "Com arma corpo a corpo de duas mãos, rola de novo resultados 1 e 2 do dano da arma.", req: { atr: { "for": 1 } }, efeitos: [{ t: "rerolarDano", ate: 2, armas: ["duasMaos"] }] },
      { id: "espiritoInquebravel", nome: "Espírito Inquebrável", resumo: "Em fúria, não cai inconsciente por 0 PV ou menos (ainda morre no limite).", req: { poderes: ["almaDeBronze"] } },
      { id: "esquivaSobrenatural", nome: "Esquiva Sobrenatural", resumo: "Nunca fica surpreendido.", efeitos: [{ t: "imune", valor: "surpreendido" }] },
      { id: "forcaIndomavel", nome: "Força Indomável", resumo: "1 PM: soma o nível num teste de Força ou Atletismo (depois de rolar).", opcaoDeTeste: { id: "forcaIndomavel", custo: 1, soma: "nivel", pericias: ["atletismo"], atributos: ["for"], depois: true } },
      { id: "frenesi", nome: "Frenesi", resumo: "Uma vez por rodada, em fúria, ao agredir corpo a corpo ou com arremesso, 2 PM para um ataque adicional.", req: {}, opcaoDeAtaque: { id: "frenesi", custo: 2, estado: "furia", ataqueExtra: true } },
      { id: "furiaDaSavana", nome: "Fúria da Savana", resumo: "+3m de deslocamento; a Fúria vale também para armas de arremesso.", efeitos: [{ t: "bonus", alvo: "deslocamento", valor: 3 }, { t: "furiaArremesso" }] },
      { id: "furiaRaivosa", nome: "Fúria Raivosa", resumo: "1 PM para manter a fúria uma rodada que ela terminaria." },
      { id: "golpePoderoso", nome: "Golpe Poderoso", resumo: "Ao acertar corpo a corpo ou com arremesso, 1 PM para um dado extra de dano da arma.", opcaoDeAtaque: { id: "golpePoderoso", custo: 1, dadoExtra: 1, aoAcertar: true } },
      { id: "impeto", nome: "Ímpeto", resumo: "1 PM: +6m de deslocamento por uma rodada.", acao: { custo: 1, execucao: "livre", duracao: "rodada", efeitos: [{ t: "bonus", alvo: "deslocamento", valor: 6 }] } },
      { id: "investidaImprudente", nome: "Investida Imprudente", resumo: "Na investida, –5 na Defesa (em vez de –2) para +1d12 de dano.", opcaoDeAtaque: { id: "investidaImprudente", custo: 0, danoExtra: "1d12", manobra: "investida" } },
      { id: "peleDeAco", nome: "Pele de Aço", resumo: "Pele de Ferro passa a +8.", req: { poderes: ["peleDeFerro"], nc: 8 } },
      { id: "peleDeFerro", nome: "Pele de Ferro", resumo: "+4 na Defesa sem armadura pesada (+8 com Pele de Aço).", efeitos: [{ t: "bonus", alvo: "defesa", valor: "tem.peleDeAco ? 8 : 4", auto: "semArmaduraPesada" }] },
      { id: "sangueDosInimigos", nome: "Sangue dos Inimigos", resumo: "Em fúria, cada crítico ou inimigo derrubado dá +1 cumulativo em ataque e dano (até o nível) até o fim da cena.", contador: { id: "sangueDosInimigos", max: "nivel", efeitos: [{ t: "bonus", alvo: "ataque", valor: "contador" }, { t: "bonus", alvo: "dano", valor: "contador" }] } },
      { id: "supersticao", nome: "Superstição", resumo: "Resistência a magia +5.", efeitos: [{ t: "bonus", alvo: "resist.magia", valor: 5 }] },
      { id: "totemEspiritual", nome: "Totem Espiritual", resumo: "Soma a Sabedoria nos PM e lança a magia do animal totêmico (Sabedoria), mesmo em fúria.", req: { atr: { sab: 1 }, nc: 4 },
        escolhas: [{ id: "totem", tipo: "totem" }], efeitos: [{ t: "bonus", alvo: "pm", valor: "atr.sab", atributoUnico: "sab" }] },
      { id: "vigorPrimal", nome: "Vigor Primal", resumo: "Ação de movimento e até Con PM: recupera 1d12 PV por PM.", acao: { custo: 1, execucao: "movimento", escala: { pm: 1, max: "atr.con - 1", rotulo: "+1d12 PV" }, cura: "(1 + x)d12" } },
    ],
  });

  /* ----------------------------------------------------------- BARDO */
  var MUSICA = { custo: 1, execucao: "padrao", alcance: "curto", exige: ["treino:atuacao", "instrumento"] };
  registrar({
    id: "bardo", nome: "Bardo", pagina: 43, atributo: "Carisma",
    pv: { inicial: 12, nivel: 3 }, pm: 4,
    pericias: { fixas: ["atuacao", "reflexos"], escolha: { n: 6, de: ["acrobacia", "cavalgar", "conhecimento", "diplomacia", "enganacao", "furtividade", "iniciativa", "intuicao", "investigacao", "jogatina", "ladinagem", "luta", "misticismo", "nobreza", "percepcao", "pontaria", "vontade"] } },
    proficiencias: ["marciais"],
    magias: { tipo: "arcana", atributo: "car", somaPM: true, escolas: 3, circulos: { 1: 1, 6: 2, 10: 3, 14: 4 }, iniciais: 2, aprendePar: true, armaduraLeve: true },
    tabela: tabela([["inspiracao", "magias"], ["poder", "eclético"], ["poder"], ["poder"], ["poder"], ["poder"], ["poder"], ["poder"], ["poder"], ["poder"],
      ["poder"], ["poder"], ["poder"], ["poder"], ["poder"], ["poder"], ["poder"], ["poder"], ["poder"], ["artistaCompleto", "poder"]]),
    habilidades: {
      inspiracao: { nome: "Inspiração", resumo: "Ação padrão e 2 PM: você e aliados em alcance curto ganham +1 em testes de perícia até o fim da cena. A cada quatro níveis, +2 PM aumentam o bônus em +1.",
        acao: { id: "inspiracao", custo: 2, execucao: "tem.artistaCompleto ? 'livre' : 'padrao'", alcance: "curto", alvos: "voce e aliados", duracao: "cena", estado: "inspiracao", escala: { pm: 2, max: "floor((nc - 1) / 4)", rotulo: "+1 no bônus" },
          efeitos: [{ t: "bonus", alvo: "pericias", valor: "1 + x" }, { t: "bonus", alvo: "dano", valor: "1 + x", se: "tem.inspiracaoMarcial" }] } },
      magias: { nome: "Magias", resumo: "Escolhe três escolas (fixas). Magias arcanas dessas escolas: 2º círculo no 6º nível, 3º no 10º, 4º no 14º. Começa com duas e aprende uma em cada nível par. Lança de armadura leve sem teste. Carisma; soma Carisma nos PM.",
        escolhas: [{ id: "escolas", tipo: "escola", quantidade: 3, fixa: true }] },
      poder: { nome: "Poder de Bardo", poder: true },
      "eclético": { nome: "Eclético", resumo: "1 PM: todos os benefícios de treinado numa perícia por um teste.", opcaoDeTeste: { id: "ecletico", custo: 1, treinoTemporario: true } },
      artistaCompleto: { nome: "Artista Completo", resumo: "Inspiração como ação livre; sob Inspiração, habilidades de bardo (e magias) custam metade dos PM.", efeitos: [{ t: "custoMagia", fator: 0.5, estado: "inspiracao" }] },
    },
    poderes: [
      { id: "arteMagica", nome: "Arte Mágica", resumo: "Sob Inspiração, +2 na CD das habilidades de bardo.", efeitos: [{ t: "cdMagia", valor: 2, estado: "inspiracao" }] },
      { id: "aumentarRepertorio", nome: "Aumentar Repertório", resumo: "Aprende duas magias das suas escolas, arcanas ou divinas.", repetivel: true, efeitos: [{ t: "magiasExtras", valor: 2, qualquerTipo: true }] },
      AUMENTO,
      { id: "dancaDasLaminas", nome: "Dança das Lâminas", resumo: "Ao lançar magia de ação padrão, 1 PM para um ataque corpo a corpo como ação livre.", req: { poderes: ["esgrimaMagica"], nc: 10 } },
      { id: "esgrimaMagica", nome: "Esgrima Mágica", resumo: "Sob Inspiração, usa Atuação no lugar de Luta com armas corpo a corpo leves ou de uma mão.", efeitos: [{ t: "periciaAtaque", pericia: "atuacao", estado: "inspiracao", armas: ["leve", "umaMao"] }] },
      { id: "estrelato", nome: "Estrelato", resumo: "Impressionar com Atuação dá +5 (em vez de +2) nas perícias de Carisma.", req: { nc: 6 } },
      { id: "fascinarEmMassa", nome: "Fascinar em Massa", resumo: "+2 PM na Balada Fascinante: afeta todas as criaturas escolhidas no alcance.", req: { poderes: ["baladaFascinante"] } },
      { id: "golpeElemental", nome: "Golpe Elemental", resumo: "Sob Inspiração, ao acertar corpo a corpo, 1 PM para +1d6 de ácido, eletricidade, fogo ou frio (+1 PM por +1d6 a cada quatro níveis).", req: { poderes: ["golpeMagico"] },
        opcaoDeAtaque: { id: "golpeElemental", custo: 1, estado: "inspiracao", danoExtra: "(1 + x)d6", escala: { pm: 1, max: "floor(nivel / 4)" }, aoAcertar: true } },
      { id: "golpeMagico", nome: "Golpe Mágico", resumo: "Sob Inspiração, cada acerto corpo a corpo num inimigo dá 2 PM temporários (até o nível por cena; somem no fim da cena).", req: { poderes: ["esgrimaMagica"] } },
      { id: "inspiracaoMarcial", nome: "Inspiração Marcial", resumo: "A Inspiração também vale nas rolagens de dano." },
      { id: "lendasEHistorias", nome: "Lendas e Histórias", resumo: "1 PM para rolar de novo Conhecimento, Misticismo, Nobreza ou Religião para informação ou identificação.", req: { atr: { "int": 1 } } },
      { id: "manipular", nome: "Manipular", resumo: "1 PM: criatura fascinada por você fica enfeitiçada até o fim da cena (Vontade CD Car anula; imune por um dia).", req: { poderes: ["baladaFascinante"] },
        acao: { custo: 1, execucao: "livre", resistencia: { pericia: "vontade", atributo: "car" }, condicao: { id: "enfeiticado", duracao: "cena" } } },
      { id: "manipularEmMassa", nome: "Manipular em Massa", resumo: "+2 PM no Manipular: todas as criaturas escolhidas em alcance curto.", req: { poderes: ["fascinarEmMassa", "manipular"], nc: 10 } },
      { id: "melodiaRestauradora", nome: "Melodia Restauradora", resumo: "+2 PM na Melodia Curativa: remove uma condição (abalado, alquebrado, apavorado, atordoado, cego, confuso, enfeitiçado, esmorecido, exausto, fatigado, frustrado, pasmo ou surdo).", req: { poderes: ["melodiaCurativa"] } },
      { id: "mestreDosSussurros", nome: "Mestre dos Sussurros", resumo: "Em Investigação para interrogar e Enganação para intriga, rola dois dados e fica com o melhor; em ambientes sociais, sem custo e em uma hora.", req: { atr: { car: 1 }, pericias: ["enganacao", "investigacao"] } },
      { id: "baladaFascinante", nome: "Música: Balada Fascinante", musica: true, resumo: "Atuação oposta à Vontade de uma criatura no alcance: fascinada enquanto você se concentrar (ação padrão por rodada). Hostil ou em combate: +5 e novo teste a cada rodada. Passou: imune por um dia.",
        acao: Object.assign({}, MUSICA, { teste: { pericia: "atuacao", contra: "vontade" }, condicao: { id: "fascinado", duracao: "sustentada" }, sustentada: true }) },
      { id: "cancaoAssustadora", nome: "Música: Canção Assustadora", musica: true, resumo: "Um teste de Atuação contra a Vontade de cada criatura escolhida no alcance: falhou fica abalada até o fim da cena; passou, imune por um dia.",
        acao: Object.assign({}, MUSICA, { teste: { pericia: "atuacao", contra: "vontade" }, condicao: { id: "abalado", duracao: "cena" } }) },
      { id: "melodiaCurativa", nome: "Música: Melodia Curativa", musica: true, resumo: "Criaturas escolhidas no alcance recuperam 1d6 PV; +1d6 por PM extra.",
        acao: Object.assign({}, MUSICA, { cura: "(1 + x)d6", escala: { pm: 1, max: "limitePM - 1", rotulo: "+1d6 PV" } }) },
      { id: "parodia", nome: "Paródia", resumo: "Uma vez por rodada, ao ver uma magia em alcance médio, 1 PM e Atuação (CD 15 + PM da magia): pode lançá-la até o fim do seu próximo turno." },
      { id: "prestidigitacao", nome: "Prestidigitação", resumo: "Numa ação padrão, Atuação (CD 15 + PM) para lançar junto uma magia de até ação completa como ação livre; falha gasta os PM. Notar exige Misticismo CD 20.", req: { nc: 6 } },
    ],
  });

  /* ------------------------------------------------------- BUCANEIRO */
  var LIVRE = "exige liberdade de movimentos (sem armadura pesada, não imóvel)";
  registrar({
    id: "bucaneiro", nome: "Bucaneiro", pagina: 46, atributo: "Destreza",
    pv: { inicial: 16, nivel: 4 }, pm: 3,
    pericias: { fixas: ["reflexos"], ou: [["luta", "pontaria"]], escolha: { n: 4, de: ["acrobacia", "atletismo", "atuacao", "enganacao", "fortitude", "furtividade", "iniciativa", "intimidacao", "jogatina", "luta", "oficio", "percepcao", "pilotagem", "pontaria"] } },
    proficiencias: ["marciais"],
    tabela: tabela([["audacia", "insolencia"], ["evasao", "poder"], ["esquivaSagaz", "poder"], ["poder"], ["panache", "poder"], ["poder"], ["poder"], ["poder"], ["poder"], ["evasaoAprimorada", "poder"],
      ["poder"], ["poder"], ["poder"], ["poder"], ["poder"], ["poder"], ["poder"], ["poder"], ["poder"], ["poder", "sorteDeNimb"]]),
    habilidades: {
      audacia: { nome: "Audácia", resumo: "Num teste de perícia (não de ataque), 2 PM para somar o Carisma.", opcaoDeTeste: { id: "audacia", custo: 2, soma: "atr.car", exceto: ["ataque"] } },
      insolencia: { nome: "Insolência", resumo: "Soma o Carisma na Defesa, limitado pelo nível. " + LIVRE + ".", efeitos: [{ t: "bonus", alvo: "defesa", valor: "min(atr.car, nivel)", auto: "livreMovimento", atributoUnico: "car" }] },
      evasao: { nome: "Evasão", resumo: "Passou em Reflexos para metade do dano: não sofre dano. " + LIVRE + ".", efeitos: [{ t: "evasao", auto: "livreMovimento" }] },
      poder: { nome: "Poder de Bucaneiro", poder: true },
      esquivaSagaz: { nome: "Esquiva Sagaz", resumo: "+1 na Defesa e em Reflexos; +1 a cada quatro níveis. " + LIVRE + ".",
        efeitos: [{ t: "bonus", alvo: "defesa", valor: "1 + floor((nc - 3) / 4)", auto: "livreMovimento" }, { t: "bonus", alvo: "pericia.reflexos", valor: "1 + floor((nc - 3) / 4)", auto: "livreMovimento" }] },
      panache: { nome: "Panache", resumo: "Crítico ou inimigo reduzido a 0 PV: recupera 1 PM.", gatilho: { evento: ["critico", "derrubou"], pm: 1 } },
      evasaoAprimorada: { nome: "Evasão Aprimorada", resumo: "Reflexos para metade: passou, nada; falhou, metade. " + LIVRE + ".", efeitos: [{ t: "evasao", aprimorada: true, auto: "livreMovimento" }] },
      sorteDeNimb: { nome: "Sorte de Nimb", resumo: "5 PM para rolar de novo um teste; 11 ou mais na nova rolagem conta como 20 natural." },
    },
    poderes: [
      { id: "abusarDosFracos", nome: "Abusar dos Fracos", resumo: "Contra criatura sob condição de medo, dano +1 passo.", req: { poderes: ["flageloDosMares"] } },
      { id: "amigosNoPorto", nome: "Amigos no Porto", resumo: "Em comunidade portuária, Carisma CD 10: um amigo faz um favor ou acompanha como parceiro veterano por um dia.", req: { atr: { car: 1 }, nc: 6 } },
      { id: "aparar", nome: "Aparar", resumo: "Uma vez por rodada, ao ser atingido, 1 PM para um teste de ataque com bônus igual ao nível; maior que o do oponente, evita o ataque. Só com arma corpo a corpo leve ou ágil.", req: { poderes: ["esgrimista"] } },
      { id: "apostador", nome: "Apostador", resumo: "Um dia de jogo: escolhe T$ 100 (CD 15), 200 (20), 400 (25), 800 (30)…; passa ganha, falha perde.", req: { pericias: ["jogatina"] } },
      { id: "ataqueAcrobatico", nome: "Ataque Acrobático", resumo: "Aproximar-se com salto ou pirueta (Atletismo ou Acrobacia) e atacar no turno: +2 no ataque e no dano.", opcaoDeAtaque: { id: "ataqueAcrobatico", custo: 0, ataque: 2, dano: 2 } },
      AUMENTO,
      { id: "aventureiroAvido", nome: "Aventureiro Ávido", resumo: "Uma vez por rodada, 5 PM para uma ação padrão ou de movimento extra (–2 PM com Surto Heroico)." },
      { id: "bravataAudaz", nome: "Bravata Audaz", bravata: true, resumo: "Jura uma façanha; cumprida, +2 PM por nível de bucaneiro até o fim da aventura. Falhar ou desistir: perde todos os PM até o próximo dia.", estadoAventura: { efeitos: [{ t: "bonus", alvo: "pm", valor: "2 * nc" }] } },
      { id: "bravataImprudente", nome: "Bravata Imprudente", bravata: true, resumo: "Na 1ª rodada, jura vencer com uma restrição real; vencendo, +2 no ataque e na margem de ameaça até o fim da aventura.", estadoAventura: { efeitos: [{ t: "bonus", alvo: "ataque", valor: 2 }, { t: "bonus", alvo: "margem", valor: 2 }] } },
      { id: "enGarde", nome: "En Garde", resumo: "Ação de movimento e 1 PM: até o fim da cena, com arma corpo a corpo leve ou ágil, +2 na margem de ameaça e +2 na Defesa.", req: { poderes: ["esgrimista"] },
        acao: { custo: 1, execucao: "movimento", duracao: "cena", efeitos: [{ t: "bonus", alvo: "margem", valor: 2, armas: ["leve", "agil"] }, { t: "bonus", alvo: "defesa", valor: 2, armaEmpunhada: ["leve", "agil"] }] } },
      { id: "esgrimista", nome: "Esgrimista", resumo: "Com arma corpo a corpo leve ou ágil, soma a Inteligência no dano (limitado pelo nível).", req: { atr: { "int": 1 } }, efeitos: [{ t: "bonus", alvo: "dano.corpo", valor: "min(atr.int, nivel)", armas: ["leve", "agil"] }] },
      { id: "flageloDosMares", nome: "Flagelo dos Mares", resumo: "Aprende e lança Amedrontar (Carisma); não é habilidade mágica.", req: { pericias: ["intimidacao"] }, efeitos: [{ t: "magia", id: "amedrontar", atributo: "car", naoMagica: true }] },
      { id: "foliao", nome: "Folião", resumo: "Em festas e tavernas, +2 em perícias de Carisma e atitudes uma categoria melhores.", req: { atr: { car: 1 } }, efeitos: [{ t: "bonus", alvo: "pericias.car", valor: 2, cond: "em festas, tavernas e bailes" }] },
      { id: "grudarOCano", nome: "Grudar o Cano", resumo: "Arma de fogo contra adjacente: sem –5 e dano +1 passo.", req: { pericias: ["luta"], poderes: ["pistoleiro"] } },
      { id: "pernasDoMar", nome: "Pernas do Mar", resumo: "+2 em Acrobacia e Atletismo; equilibrando-se ou escalando, não fica desprevenido nem lento.", efeitos: [{ t: "bonus", alvo: "pericia.acrobacia", valor: 2 }, { t: "bonus", alvo: "pericia.atletismo", valor: 2 }] },
      { id: "pistoleiro", nome: "Pistoleiro", resumo: "Proficiência com armas de fogo e +2 no dano com elas.", efeitos: [{ t: "prof", qual: "fogo" }, { t: "bonus", alvo: "dano", valor: 2, armas: ["fogo"] }] },
      { id: "presencaParalisante", nome: "Presença Paralisante", resumo: "Soma o Carisma na Iniciativa; primeiro na iniciativa, ação padrão extra na primeira rodada.", req: { atr: { car: 1 }, nc: 4 }, efeitos: [{ t: "bonus", alvo: "pericia.iniciativa", valor: "atr.car" }] },
      { id: "ripostar", nome: "Ripostar", resumo: "Ao evitar com Aparar, 1 PM para um ataque corpo a corpo imediato contra o atacante.", req: { poderes: ["aparar"], nc: 12 } },
      { id: "touche", nome: "Touché", resumo: "Aproximar-se e atacar com arma leve ou ágil no turno: 2 PM para dano +1 passo e +5 na margem de ameaça.", req: { poderes: ["esgrimista"], nc: 10 },
        opcaoDeAtaque: { id: "touche", custo: 2, passoDano: 1, margem: 5, armas: ["leve", "agil"] } },
    ],
  });

  /* --------------------------------------------------------- CAÇADOR */
  var ARMADILHA = { custo: 3, execucao: "completa", area: "quadrado de 3m adjacente", cd: { atributo: "sab" } };
  registrar({
    id: "cacador", nome: "Caçador", pagina: 49, atributo: "Força ou Destreza",
    pv: { inicial: 16, nivel: 4 }, pm: 4,
    /* A Tabela 1-3 (p. 32) diz "mais 4"; a descrição da classe (p. 50),
       "mais 6". Vale a descrição (ver Lacunas). */
    pericias: { fixas: ["sobrevivencia"], ou: [["luta", "pontaria"]], escolha: { n: 6, de: ["adestramento", "atletismo", "cavalgar", "cura", "fortitude", "furtividade", "iniciativa", "investigacao", "luta", "oficio", "percepcao", "pontaria", "reflexos"] } },
    proficiencias: ["marciais", "escudos"],
    tabela: tabela([["marcaDaPresa", "rastreador"], ["poder"], ["explorador", "poder"], ["poder"], ["caminhoDoExplorador", "poder"], ["poder"], ["explorador", "poder"], ["poder"], ["poder"], ["poder"],
      ["explorador", "poder"], ["poder"], ["poder"], ["poder"], ["explorador", "poder"], ["poder"], ["poder"], ["poder"], ["explorador", "poder"], ["mestreCacador", "poder"]]),
    habilidades: {
      marcaDaPresa: { nome: "Marca da Presa", resumo: "Ação de movimento e 1 PM: criatura em alcance curto recebe +1d4 de dano seu até o fim da cena. A cada quatro níveis, +1 PM sobe o dado (1d8, 1d12, 2d8, 2d10).",
        acao: { id: "marcaDaPresa", custo: 1, execucao: "tem.mestreCacador ? 'livre' : 'movimento'", alcance: "tem.olhoDoFalcao ? 'longo' : 'curto'", alvo: "1 criatura", duracao: "cena", estado: "marcaDaPresa",
          escala: { pm: 1, max: "floor((nc - 1) / 4)", rotulo: "dado maior" }, danoContraAlvo: ["1d4", "1d8", "1d12", "2d8", "2d10"] } },
      rastreador: { nome: "Rastreador", resumo: "+2 em Sobrevivência; rastreia com o deslocamento normal sem penalidade.", efeitos: [{ t: "bonus", alvo: "pericia.sobrevivencia", valor: 2 }] },
      poder: { nome: "Poder de Caçador", poder: true },
      explorador: { nome: "Explorador", resumo: "Num terreno escolhido, soma Sabedoria (mín. +1) na Defesa e em Acrobacia, Atletismo, Furtividade, Percepção e Sobrevivência. A cada quatro níveis, novo terreno ou +2 num já escolhido (área de Tormenta a partir do 11º).",
        escolhas: [{ id: "terreno", tipo: "terreno", porOcorrencia: true }], efeitos: [{ t: "explorador" }] },
      caminhoDoExplorador: { nome: "Caminho do Explorador", resumo: "Nos terrenos de Explorador, ignora terreno difícil e a CD para rastreá-lo aumenta em +10." },
      mestreCacador: { nome: "Mestre Caçador", resumo: "Marca da Presa como ação livre; 5 PM para +2 na margem contra a criatura; reduzi-la a 0 PV recupera 5 PM." },
    },
    terrenos: [["aquatico", "Aquático"], ["artico", "Ártico"], ["colina", "Colina"], ["deserto", "Deserto"], ["floresta", "Floresta"], ["montanha", "Montanha"], ["pantano", "Pântano"], ["planicie", "Planície"], ["subterraneo", "Subterrâneo"], ["urbano", "Urbano"], ["tormenta", "Área de Tormenta", 11]],
    poderes: [
      { id: "ambidestria", nome: "Ambidestria", resumo: "Empunhando duas armas (uma leve), agredir faz dois ataques, com –2 em todos os ataques até o próximo turno.", req: { atr: { des: 2 } }, efeitos: [{ t: "ambidestria" }] },
      { id: "arataca", nome: "Armadilha: Arataca", armadilha: true, resumo: "2d6 de perfuração e fica agarrada (escapar: ação padrão e Força ou Acrobacia CD Sab).", acao: Object.assign({}, ARMADILHA, { dano: { dados: "2d6", tipo: "perfuracao" }, condicao: { id: "agarrado" } }) },
      { id: "espinhos", nome: "Armadilha: Espinhos", armadilha: true, resumo: "6d6 de perfuração; Reflexos (CD Sab) reduz à metade.", acao: Object.assign({}, ARMADILHA, { dano: { dados: "6d6", tipo: "perfuracao" }, resistencia: { pericia: "reflexos", atributo: "sab", efeito: "metade" } }) },
      { id: "laco", nome: "Armadilha: Laço", armadilha: true, resumo: "Reflexos (CD Sab): passou fica caída; falhou fica agarrada.", acao: Object.assign({}, ARMADILHA, { resistencia: { pericia: "reflexos", atributo: "sab" } }) },
      { id: "rede", nome: "Armadilha: Rede", armadilha: true, resumo: "Todas na área ficam enredadas e presas (libertar-se: Força ou Acrobacia CD 25); a área vira terreno difícil.", acao: Object.assign({}, ARMADILHA, { condicao: { id: "enredado" } }) },
      { id: "armadilheiro", nome: "Armadilheiro", resumo: "Soma a Sabedoria no dano e na CD das armadilhas.", req: { poderesDoTipo: "armadilha", nc: 5 } },
      { id: "arqueiro", nome: "Arqueiro", resumo: "Com arma à distância, soma a Sabedoria no dano (limitado pelo nível).", req: { atr: { sab: 1 } }, efeitos: [{ t: "bonus", alvo: "dano.distancia", valor: "min(atr.sab, nivel)" }] },
      AUMENTO,
      { id: "bote", nome: "Bote", resumo: "Com duas armas, na investida, 1 PM para um ataque adicional com a secundária.", req: { poderes: ["ambidestria"], nc: 6 } },
      { id: "camuflagem", nome: "Camuflagem", resumo: "2 PM para se esconder sem camuflagem ou cobertura.", req: { nc: 6 } },
      { id: "chuvaDeLaminas", nome: "Chuva de Lâminas", resumo: "Uma vez por rodada, com Ambidestria, 2 PM para um ataque adicional com a primária.", req: { atr: { des: 4 }, poderes: ["ambidestria"], nc: 12 } },
      { id: "companheiroAnimal", nome: "Companheiro Animal", resumo: "Recebe um companheiro animal (p. 62).", req: { atr: { car: 1 }, pericias: ["adestramento"] }, parceiro: "companheiroAnimal" },
      { id: "eloComANatureza", nome: "Elo com a Natureza", resumo: "Soma a Sabedoria nos PM e lança Caminhos da Natureza (Sabedoria).", req: { atr: { sab: 1 }, nc: 3 }, efeitos: [{ t: "bonus", alvo: "pm", valor: "atr.sab", atributoUnico: "sab" }, { t: "magia", id: "caminhosDaNatureza", atributo: "sab" }] },
      { id: "emboscar", nome: "Emboscar", resumo: "Na primeira rodada de combate, 2 PM para uma ação padrão adicional.", req: { pericias: ["furtividade"] } },
      { id: "empatiaSelvagem", nome: "Empatia Selvagem", resumo: "Comunica-se com animais e usa Adestramento para mudar atitude e persuasão.", efeitos: [{ t: "empatiaSelvagem" }] },
      { id: "escaramuca", nome: "Escaramuça", resumo: "Movendo-se 6m ou mais: +2 em Defesa e Reflexos e +1d8 de dano (alcance curto) até o início do próximo turno. Sem armadura pesada.", req: { atr: { des: 2 }, nc: 6 },
        acao: { custo: 0, execucao: "livre", duracao: "ate o proximo turno", gatilho: "mover-se 6m ou mais", efeitos: [{ t: "bonus", alvo: "defesa", valor: "tem.escaramucaSuperior ? 5 : 2" }, { t: "bonus", alvo: "pericia.reflexos", valor: "tem.escaramucaSuperior ? 5 : 2" }, { t: "danoExtra", valor: "tem.escaramucaSuperior ? '1d12' : '1d8'" }] } },
      { id: "escaramucaSuperior", nome: "Escaramuça Superior", resumo: "Escaramuça passa a +5 em Defesa e Reflexos e +1d12 de dano.", req: { poderes: ["escaramuca"], nc: 12 } },
      { id: "espreitar", nome: "Espreitar", resumo: "Marca da Presa dá +1 em perícias contra o alvo (+1 por PM extra; dobra com Inimigo)." },
      { id: "ervasCurativas", nome: "Ervas Curativas", resumo: "Ação completa e até Sab PM: em você ou aliado adjacente, cada PM cura 2d6 PV ou remove envenenado.", acao: { custo: 1, execucao: "completa", alcance: "adjacente", escala: { pm: 1, max: "atr.sab - 1", rotulo: "+2d6 PV" }, cura: "(2 + 2 * x)d6" } },
      { id: "impeto", nome: "Ímpeto", resumo: "1 PM: +6m de deslocamento por uma rodada.", acao: { custo: 1, execucao: "livre", duracao: "rodada", efeitos: [{ t: "bonus", alvo: "deslocamento", valor: 6 }] } },
      { id: "inimigo", nome: "Inimigo de (Criatura)", resumo: "Um tipo (animal, construto, espírito, monstro, morto-vivo) ou duas raças humanoides: Marca da Presa dobra os dados de dano contra eles.", repetivel: true, escolhas: [{ id: "inimigo", tipo: "texto", rotulo: "Tipo ou raças" }] },
      { id: "olhoDoFalcao", nome: "Olho do Falcão", resumo: "Marca da Presa em alcance longo." },
      { id: "pontoFraco", nome: "Ponto Fraco", resumo: "Com Marca da Presa, +2 na margem de ameaça contra o alvo (dobra com Inimigo)." },
    ],
  });
})(typeof window !== "undefined" ? window : globalThis);
/* <<< js/tormenta20/classes-a.js */

/* >>> js/tormenta20/classes-b.js */
/* =====================================================================
   R.A.M.A. — Tormenta20 · classes (2/3): Cavaleiro, Clérigo, Druida,
   Guerreiro, Inventor (formato em classes-a.js)
   ===================================================================== */

(function (global) {
  "use strict";

  var C = global.RAMATormenta20Classes = global.RAMATormenta20Classes || { CLASSES: [], CLASSE: {} };
  function registrar(c) { c.fonte = "T20"; C.CLASSES.push(c); C.CLASSE[c.id] = c; }
  function tabela(linhas) { var t = {}; linhas.forEach(function (l, i) { t[i + 1] = l; }); return t; }
  function poderes20(primeiro, extra) { var l = [primeiro]; for (var i = 2; i <= 20; i++) l.push((extra[i] || []).concat(["poder"])); return l; }
  var AUMENTO = { id: "aumentoDeAtributo", nome: "Aumento de Atributo", resumo: "+1 em um atributo; várias vezes, uma vez por patamar para o mesmo atributo.", repetivel: true, aumento: true };

  /* ------------------------------------------------------- CAVALEIRO */
  var POSTURA = { custo: 2, execucao: "movimento", duracao: "cena", postura: true };
  registrar({
    id: "cavaleiro", nome: "Cavaleiro", pagina: 52, atributo: "Força",
    pv: { inicial: 20, nivel: 5 }, pm: 3,
    pericias: { fixas: ["fortitude", "luta"], escolha: { n: 2, de: ["adestramento", "atletismo", "cavalgar", "diplomacia", "guerra", "iniciativa", "intimidacao", "nobreza", "percepcao", "vontade"] } },
    proficiencias: ["marciais", "pesadas", "escudos"],
    tabela: tabela(poderes20(["baluarte", "codigoDeHonra"], { 2: ["duelo"], 5: ["caminhoDoCavaleiro"], 11: ["resoluto"], 20: ["bravuraFinal"] })),
    habilidades: {
      codigoDeHonra: { nome: "Código de Honra", resumo: "Não ataca pelas costas (sem bônus de flanquear), nem oponente caído, desprevenido ou incapaz de lutar. Violar: perde todos os PM até o próximo dia.", obrigacao: true },
      baluarte: { nome: "Baluarte", resumo: "Ao sofrer um ataque ou fazer teste de resistência, 1 PM: +2 na Defesa e nas resistências até o início do próximo turno; +1 PM por +2 a cada quatro níveis. 7º: +2 PM estende a aliados adjacentes; 15º: +5 PM, aliados em alcance curto.",
        reacao: { id: "baluarte", custo: 1, duracao: "ate o proximo turno", escala: { pm: 1, max: "floor((nc - 1) / 4)", rotulo: "+2 nos bônus" },
          efeitos: [{ t: "bonus", alvo: "defesa", valor: "2 + 2 * x" }, { t: "bonus", alvo: "resistencias", valor: "2 + 2 * x" }],
          extensoes: [{ id: "adjacentes", desde: 7, custo: 2, rotulo: "aliados adjacentes" }, { id: "curto", desde: 15, custo: 5, rotulo: "aliados em alcance curto" }] } },
      duelo: { nome: "Duelo", resumo: "2 PM: um oponente em alcance curto; +2 em ataque e dano contra ele até o fim da cena (termina se atacar outro). A cada cinco níveis, +1 PM por +1.",
        acao: { id: "duelo", custo: 2, execucao: "livre", alcance: "curto", alvo: "1 oponente", duracao: "cena", estado: "duelo", escala: { pm: 1, max: "floor((nc - 2) / 5)", rotulo: "+1 nos bônus" },
          efeitos: [{ t: "bonus", alvo: "ataque", valor: "2 + x", contraAlvo: true }, { t: "bonus", alvo: "dano", valor: "2 + x", contraAlvo: true }] } },
      poder: { nome: "Poder de Cavaleiro", poder: true },
      caminhoDoCavaleiro: { nome: "Caminho do Cavaleiro", resumo: "Bastião (RD 5 com armadura pesada, cumulativa com Especialização em Armadura) ou Montaria (cavalo de guerra: parceiro veterano, mestre no 11º; +5 em Adestramento e Cavalgar com ele).",
        escolhas: [{ id: "caminho", tipo: "opcao", fixa: true, opcoes: [["bastiao", "Bastião"], ["montaria", "Montaria"]] }],
        caminhos: {
          bastiao: { efeitos: [{ t: "rd", valor: 5, auto: "armaduraPesada", fonteRd: "bastiao" }] },
          montaria: { parceiro: "montaria", efeitos: [{ t: "bonus", alvo: "pericia.adestramento", valor: 5, cond: "com a montaria" }, { t: "bonus", alvo: "pericia.cavalgar", valor: 5, cond: "com a montaria" }] },
        } },
      resoluto: { nome: "Resoluto", resumo: "1 PM para refazer, com +5, um teste de resistência contra uma condição que o afeta; passou, cancela. Uma vez por efeito." },
      bravuraFinal: { nome: "Bravura Final", resumo: "Reduzido a 0 PV ou menos, 3 PM para continuar consciente e de pé (sustentada); ao encerrar, sofre os efeitos dos PV atuais.", acao: { custo: 3, execucao: "reacao", sustentada: true } },
    },
    poderes: [
      { id: "armaduraDaHonra", nome: "Armadura da Honra", resumo: "No início de cada cena, PV temporários iguais a nível + Carisma, até o fim da cena.", inicioDeCena: { pvTemp: "nivel + atr.car" } },
      AUMENTO,
      { id: "autoridadeFeudal", nome: "Autoridade Feudal", resumo: "Uma hora e 2 PM: o povo o ajuda como parceiro iniciante até o fim da aventura (onde você tem influência).", req: { nc: 6 } },
      { id: "desprezarOsCovardes", nome: "Desprezar os Covardes", resumo: "RD 5 se estiver caído, desprevenido ou flanqueado.", efeitos: [{ t: "rd", valor: 5, cond: "caído, desprevenido ou flanqueado", autoCondicoes: ["caido", "desprevenido", "flanqueado"] }] },
      { id: "escudeiro", nome: "Escudeiro", resumo: "Parceiro especial: armas +1 no dano e armadura +1 na Defesa; 1 PM para uma ação de movimento dele (levantar, sacar, trazer a montaria). Não conta no limite de parceiros.",
        efeitos: [{ t: "bonus", alvo: "dano", valor: 1, categoria: "parceiro" }, { t: "bonus", alvo: "defesa", valor: 1, auto: "comArmadura", categoria: "parceiro" }] },
      { id: "especializacaoEmArmadura", nome: "Especialização em Armadura", resumo: "RD 5 com armadura pesada (cumulativa com Bastião).", req: { nc: 12 }, efeitos: [{ t: "rd", valor: 5, auto: "armaduraPesada", fonteRd: "especializacao" }] },
      { id: "estandarte", nome: "Estandarte", resumo: "No início de cada cena, você e aliados que vejam o estandarte recebem PM temporários iguais ao Carisma (mín. 1).", req: { poderes: ["titulo"], nc: 14 }, inicioDeCena: { pmTemp: "max(1, atr.car)" } },
      { id: "etiqueta", nome: "Etiqueta", resumo: "+2 em Diplomacia ou Nobreza; 1 PM para rolar de novo um teste dessas perícias.", escolhas: [{ id: "pericia", tipo: "opcao", opcoes: [["diplomacia", "Diplomacia"], ["nobreza", "Nobreza"]], efeito: { t: "bonus", valor: 2, alvoPericia: true } }] },
      { id: "investidaDestruidora", nome: "Investida Destruidora", resumo: "Na investida, 2 PM antes de rolar: +2d8 de dano.", opcaoDeAtaque: { id: "investidaDestruidora", custo: 2, danoExtra: "2d8", manobra: "investida" } },
      { id: "montariaCorajosa", nome: "Montaria Corajosa", resumo: "A montaria dá +1d6 no dano corpo a corpo.", req: { caminho: "montaria" }, efeitos: [{ t: "danoExtra", valor: "1d6", alvo: "corpo", cond: "montado" }] },
      { id: "pajem", nome: "Pajem", resumo: "+2 em Diplomacia e descanso uma categoria melhor; faz pequenas tarefas. Não conta no limite de parceiros.", efeitos: [{ t: "bonus", alvo: "pericia.diplomacia", valor: 2, categoria: "parceiro" }, { t: "descansoMelhor", valor: 1 }] },
      { id: "arieteImplacavel", nome: "Postura de Combate: Aríete Implacável", postura: true, resumo: "+2 no ataque em investidas (+1 por 2 PM extras); investida contra construto ou objeto causa +2d8. Precisa se deslocar todo turno.",
        acao: Object.assign({}, POSTURA, { escala: { pm: 2, max: "limitePM", rotulo: "+1 no ataque em investida" }, efeitos: [{ t: "bonus", alvo: "ataque.investida", valor: "2 + x" }] }) },
      { id: "castigoDeFerro", nome: "Postura de Combate: Castigo de Ferro", postura: true, resumo: "Quando um aliado adjacente sofre ataque corpo a corpo, 1 PM para atacar o agressor.", acao: Object.assign({}, POSTURA) },
      { id: "focoDeBatalha", nome: "Postura de Combate: Foco de Batalha", postura: true, resumo: "Cada ataque contra você dá 1 PM temporário (até o nível por cena; somem no fim da cena).", acao: Object.assign({}, POSTURA) },
      { id: "muralhaIntransponivel", nome: "Postura de Combate: Muralha Intransponível", postura: true, resumo: "Com escudo: +1 na Defesa e Reflexos e evasão; +1 por 2 PM extras; deslocamento 3m.",
        acao: Object.assign({}, POSTURA, { exige: ["escudo"], escala: { pm: 2, max: "limitePM", rotulo: "+1 nos bônus" }, efeitos: [{ t: "bonus", alvo: "defesa", valor: "1 + x" }, { t: "bonus", alvo: "pericia.reflexos", valor: "1 + x" }, { t: "evasao" }, { t: "deslocamento", tipo: "terrestre", fixo: 3 }] }) },
      { id: "provocacaoPetulante", nome: "Postura de Combate: Provocação Petulante", postura: true, resumo: "Inimigos que começam o turno em alcance curto fazem Vontade (CD Car) ou suas ações hostis precisam ter você como alvo. Mental.",
        acao: Object.assign({}, POSTURA, { resistencia: { pericia: "vontade", atributo: "car" }, descritores: ["mental"] }) },
      { id: "torreInabalavel", nome: "Postura de Combate: Torre Inabalável", postura: true, resumo: "Não pode ser movido nem se deslocar; soma Constituição na Defesa e pode usar Fortitude no lugar de Reflexos e Vontade.",
        acao: Object.assign({}, POSTURA, { efeitos: [{ t: "bonus", alvo: "defesa", valor: "atr.con" }, { t: "deslocamento", tipo: "terrestre", fixo: 0 }] }) },
      { id: "solidez", nome: "Solidez", resumo: "Com escudo, soma o bônus de Defesa do escudo nos testes de resistência.", efeitos: [{ t: "bonus", alvo: "resistencias", valor: "defesaEscudo" }] },
      { id: "titulo", nome: "Título", resumo: "Título de nobreza: em geral, 20 TO por nível de cavaleiro no início de cada aventura ou um parceiro veterano.", req: { poderes: ["autoridadeFeudal"], nc: 10, mesa: "ter conquistado terras ou servido a um nobre que possa ser seu suserano" } },
      { id: "torreArmada", nome: "Torre Armada", resumo: "Quando um inimigo erra você, 1 PM: +5 no dano contra ele até o fim do seu próximo turno." },
    ],
  });

  /* --------------------------------------------------------- CLÉRIGO */
  var MISSA = { custoT: 25, duracao: "dia", alcance: "1 + Sab pessoas", missa: true };
  registrar({
    id: "clerigo", nome: "Clérigo", pagina: 56, atributo: "Sabedoria",
    pv: { inicial: 16, nivel: 4 }, pm: 5,
    pericias: { fixas: ["religiao", "vontade"], escolha: { n: 2, de: ["conhecimento", "cura", "diplomacia", "fortitude", "iniciativa", "intuicao", "luta", "misticismo", "nobreza", "oficio", "percepcao"] } },
    proficiencias: ["pesadas", "escudos"],
    magias: { tipo: "divina", atributo: "sab", somaPM: true, circulos: { 1: 1, 5: 2, 9: 3, 13: 4, 17: 5 }, iniciais: 3, porNivel: 1 },
    tabela: tabela(poderes20(["devotoFiel", "magias"], { 20: ["maoDaDivindade"] })),
    habilidades: {
      devotoFiel: { nome: "Devoto Fiel", resumo: "Devoto de um deus maior com dois poderes concedidos (em vez de um). Ou cultua o Panteão: sem poder concedido; só não usa armas cortantes nem perfurantes; arma preferida maça; escolhe canalizar energia positiva ou negativa.",
        devocao: { obrigatoria: true, poderesConcedidos: 2, panteao: true } },
      magias: { nome: "Magias", resumo: "Magias divinas: um círculo a mais a cada quatro níveis. Começa com três e aprende uma por nível. Sabedoria; soma Sabedoria nos PM." },
      poder: { nome: "Poder de Clérigo", poder: true },
      maoDaDivindade: { nome: "Mão da Divindade", resumo: "Ação completa e 15 PM: lança três magias divinas quaisquer como ação livre sem gastar PM (aprimoramentos e outros custos à parte); depois fica atordoado 1d4 rodadas, mesmo se imune.", acao: { custo: 15, execucao: "completa" } },
    },
    poderes: [
      { id: "abencoarArma", nome: "Abençoar Arma", resumo: "Proficiência na arma preferida do deus. Empunhando-a, ação de movimento e 3 PM: até o fim da cena é mágica, ilumina, dano +1 passo e usa Sabedoria no ataque e no dano.",
        efeitos: [{ t: "prof", qual: "armaPreferida" }], acao: { custo: 3, execucao: "movimento", duracao: "cena", exige: ["armaPreferida"], efeitos: [{ t: "passoDano", valor: 1, armaPreferida: true }, { t: "atrAtaque", atributo: "sab", armaPreferida: true }] } },
      AUMENTO,
      { id: "autoridadeEclesiastica", nome: "Autoridade Eclesiástica", resumo: "Posição formal na igreja: em geral +5 em Diplomacia ou Intimidação com devotos do deus e metade do preço de alquímicos, poções e serviços nos templos.", req: { nc: 5, devotoDeusMaior: true } },
      { id: "canalizarEnergia", nome: "Canalizar Energia Positiva/Negativa", resumo: "Ação padrão e PM: criaturas escolhidas em alcance curto; cada PM cura 1d6 (luz em vivos, dano em mortos-vivos) ou o inverso (trevas). Vontade (CD Sab) reduz o dano à metade.",
        acao: { custo: 1, execucao: "padrao", alcance: "tem.canalizarAmplo && x2 ? 'medio' : 'curto'", escala: { pm: 1, max: "limitePM - 1", rotulo: "+1d6" }, curaOuDano: "(1 + x)d6", energia: "divindade", resistencia: { pericia: "vontade", atributo: "sab", efeito: "metade" } } },
      { id: "canalizarAmplo", nome: "Canalizar Amplo", resumo: "+2 PM: Canalizar Energia em alcance médio.", req: { poderes: ["canalizarEnergia"] } },
      { id: "comunhaoVital", nome: "Comunhão Vital", resumo: "Magia de cura: +2 PM para outra criatura em alcance curto recuperar metade da cura.", opcaoDeMagia: { id: "comunhaoVital", custo: 2, cura: true } },
      { id: "conhecimentoMagico", nome: "Conhecimento Mágico", resumo: "Aprende duas magias divinas de qualquer círculo que possa lançar.", repetivel: true, efeitos: [{ t: "magiasExtras", valor: 2 }] },
      { id: "expulsarMortosVivos", nome: "Expulsar/Comandar Mortos-Vivos", resumo: "Ação padrão e 3 PM: mortos-vivos em alcance curto ficam apavorados 1d6 rodadas (positiva) ou sob suas ordens um dia, até ND somados = nível + 3 (negativa; inteligentes ficam fascinados 1 rodada). Vontade (CD Sab) evita.",
        req: { poderes: ["canalizarEnergia"] }, acao: { custo: 3, execucao: "padrao", alcance: "curto", resistencia: { pericia: "vontade", atributo: "sab" } } },
      { id: "liturgiaMagica", nome: "Liturgia Mágica", resumo: "Ação de movimento: +2 na CD da próxima habilidade de clérigo até o fim do próximo turno.", acao: { custo: 0, execucao: "movimento", duracao: "ate o proximo turno", efeitos: [{ t: "cdMagia", valor: 2, proxima: true }] } },
      { id: "magiaSagrada", nome: "Magia Sagrada/Profana", resumo: "Magia divina de dano: +1 PM para mudar o dano para luz (positiva) ou trevas (negativa).", opcaoDeMagia: { id: "magiaSagrada", custo: 1, tipoDano: "energiaDaDivindade" } },
      { id: "mestreCelebrante", nome: "Mestre Celebrante", resumo: "Missa afeta dez vezes mais pessoas e os benefícios dobram.", req: { poderesDoTipo: "missa", nc: 12 } },
      { id: "missaBencaoDaVida", nome: "Missa: Bênção da Vida", missa: true, resumo: "Participantes recebem PV temporários iguais a nível + Sabedoria.", missaEfeito: { pvTemp: "nivel + atr.sab" } },
      { id: "missaChamadoAsArmas", nome: "Missa: Chamado às Armas", missa: true, resumo: "Participantes recebem +1 em ataque e dano.", missaEfeito: { efeitos: [{ t: "bonus", alvo: "ataque", valor: 1 }, { t: "bonus", alvo: "dano", valor: 1 }] } },
      { id: "missaElevacaoDoEspirito", nome: "Missa: Elevação do Espírito", missa: true, resumo: "Participantes recebem PM temporários iguais à Sabedoria.", missaEfeito: { pmTemp: "atr.sab" } },
      { id: "missaEscudoDivino", nome: "Missa: Escudo Divino", missa: true, resumo: "Participantes recebem +1 na Defesa e nas resistências.", missaEfeito: { efeitos: [{ t: "bonus", alvo: "defesa", valor: 1 }, { t: "bonus", alvo: "resistencias", valor: 1 }] } },
      { id: "missaSuperarAsLimitacoes", nome: "Missa: Superar as Limitações", missa: true, resumo: "Cada participante recebe +1d6 num único teste à escolha, mesmo depois de rolar.", missaEfeito: { bonusUnico: "1d6" } },
      { id: "preceDeCombate", nome: "Prece de Combate", resumo: "Magia divina de ação padrão em si mesmo: +2 PM para lançar como ação de movimento.", opcaoDeMagia: { id: "preceDeCombate", custo: 2, execucao: "movimento", emSi: true } },
      { id: "simboloSagradoEnergizado", nome: "Símbolo Sagrado Energizado", resumo: "Ação de movimento e 1 PM: até o fim da cena o símbolo ilumina e, empunhado, suas magias divinas custam –1 PM.",
        acao: { custo: 1, execucao: "movimento", duracao: "cena", exige: ["simboloSagrado"], efeitos: [{ t: "descontoMagia", valor: 1, tipoMagia: "divina" }] } },
    ],
    missa: MISSA,
  });

  /* ---------------------------------------------------------- DRUIDA */
  function forma(id, nome, basica, aprimorada, superior) { return { id: id, nome: nome, basica: basica, aprimorada: aprimorada, superior: superior }; }
  var FORMAS_SELVAGENS = [
    forma("agil", "Forma Ágil",
      { atr: { des: 2 }, armas: [{ dano: "1d6", margem: 19, qtd: 2 }], nota: "Atacar com as duas: –2 nos ataques até o próximo turno." },
      { atr: { des: 4 }, deslocamento: 3, armas: [{ dano: "1d8", margem: 19, qtd: 2 }], tamanho: "grande" },
      { atr: { des: 6 }, deslocamento: 6, armas: [{ dano: "1d10", margem: 19, qtd: 2 }], tamanho: "grande" }),
    forma("feroz", "Forma Feroz",
      { atr: { "for": 3 }, defesa: 2, armas: [{ dano: "1d8" }] },
      { atr: { "for": 5 }, defesa: 4, armas: [{ dano: "2d6" }], tamanho: "grande" },
      { atr: { "for": 10 }, defesa: 6, armas: [{ dano: "4d6" }], tamanho: "enorme" }),
    forma("resistente", "Forma Resistente",
      { defesa: 5, rd: 5, armas: [{ dano: "1d6" }] },
      { atr: { "for": 3 }, defesa: 8, rd: 8, armas: [{ dano: "1d8" }], tamanho: "grande" },
      { atr: { "for": 5 }, defesa: 10, rd: 10, armas: [{ dano: "2d6" }], tamanho: "enorme" }),
    forma("sorrateira", "Forma Sorrateira",
      { atr: { des: 2 }, armas: [{ dano: "1d4" }], tamanho: "pequeno" },
      { atr: { des: 4 }, armas: [{ dano: "1d4" }], tamanho: "minusculo" },
      { atr: { des: 6 }, armas: [{ dano: "1d4" }], tamanho: "minusculo", deslocamentos: { voo: 18 } }),
    forma("veloz", "Forma Veloz",
      { atr: { des: 2 }, armas: [{ dano: "1d6" }], umDe: [{ terrestre: 15 }, { escalada: 9 }, { natacao: 9 }] },
      { atr: { des: 4 }, armas: [{ dano: "1d6" }], umDe: [{ terrestre: 18 }, { escalada: 12 }, { natacao: 12 }] },
      { atr: { des: 6 }, armas: [{ dano: "1d6" }], umDe: [{ natacao: 18 }, { voo: 24 }] }),
  ];
  var TIPOS_COMPANHEIRO = ["ajudante", "assassino", "atirador", "combatente", "fortao", "guardiao", "perseguidor", "montaria"];
  registrar({
    id: "druida", nome: "Druida", pagina: 60, atributo: "Sabedoria",
    pv: { inicial: 16, nivel: 4 }, pm: 4,
    pericias: { fixas: ["sobrevivencia", "vontade"], escolha: { n: 4, de: ["adestramento", "atletismo", "cavalgar", "conhecimento", "cura", "fortitude", "iniciativa", "intuicao", "luta", "misticismo", "oficio", "percepcao", "religiao"] } },
    proficiencias: ["escudos"],
    magias: { tipo: "divina", atributo: "sab", somaPM: true, escolas: 3, circulos: { 1: 1, 6: 2, 10: 3, 14: 4 }, iniciais: 2, aprendePar: true },
    tabela: tabela(poderes20(["devotoFiel", "empatiaSelvagem", "magias"], { 2: ["caminhoDosErmos"], 20: ["forcaDaNatureza"] })),
    habilidades: {
      devotoFiel: { nome: "Devoto Fiel", resumo: "Devoto de Allihanna, Megalokk ou Oceano, com dois poderes concedidos.", devocao: { obrigatoria: true, poderesConcedidos: 2, deuses: ["allihanna", "megalokk", "oceano"] } },
      empatiaSelvagem: { nome: "Empatia Selvagem", resumo: "Comunica-se com animais e usa Adestramento para mudar atitude e persuasão com eles.", efeitos: [{ t: "empatiaSelvagem" }] },
      magias: { nome: "Magias", resumo: "Três escolas (fixas). Magias divinas dessas escolas: 2º círculo no 6º nível, 3º no 10º, 4º no 14º. Começa com duas e aprende uma em cada nível par. Sabedoria; soma Sabedoria nos PM.",
        escolhas: [{ id: "escolas", tipo: "escola", quantidade: 3, fixa: true }] },
      poder: { nome: "Poder de Druida", poder: true },
      caminhoDosErmos: { nome: "Caminho dos Ermos", resumo: "Em terrenos naturais, ignora terreno difícil e a CD para rastreá-lo aumenta em +10." },
      forcaDaNatureza: { nome: "Força da Natureza", resumo: "Magias custam –2 PM e têm +2 na CD; em terrenos naturais, –4 PM e +4.", efeitos: [{ t: "descontoMagia", valor: 2 }, { t: "cdMagia", valor: 2 }, { t: "descontoMagia", valor: 2, cond: "em terreno natural" }, { t: "cdMagia", valor: 2, cond: "em terreno natural" }] },
    },
    formasSelvagens: FORMAS_SELVAGENS,
    tiposCompanheiro: TIPOS_COMPANHEIRO,
    poderes: [
      { id: "aspectoDoInverno", nome: "Aspecto do Inverno", resumo: "Aprende uma magia de convocação ou evocação (arcana ou divina) que possa lançar; redução de frio 5; magias de frio causam +1 por dado.",
        escolhas: [{ id: "magia", tipo: "magia", escolas: ["convocacao", "evocacao"], qualquerTipo: true, quantidade: 1 }], efeitos: [{ t: "rd", tipos: ["frio"], valor: 5 }, { t: "danoPorDadoMagia", valor: 1, tipoDano: "frio" }] },
      { id: "aspectoDoOutono", nome: "Aspecto do Outono", resumo: "Aprende uma magia de necromancia (arcana ou divina); 1 PM: inimigos em alcance curto sofrem –2 nas resistências até o início do seu próximo turno.",
        escolhas: [{ id: "magia", tipo: "magia", escolas: ["necromancia"], qualquerTipo: true, quantidade: 1 }], acao: { custo: 1, execucao: "livre", alcance: "curto", alvos: "inimigos", duracao: "ate o proximo turno", texto: "–2 nos testes de resistência." } },
      { id: "aspectoDaPrimavera", nome: "Aspecto da Primavera", resumo: "Aprende uma magia de encantamento ou ilusão (arcana ou divina); escolha magias em número igual ao Carisma (mín. 1): custam –1 PM.",
        escolhas: [{ id: "magia", tipo: "magia", escolas: ["encantamento", "ilusao"], qualquerTipo: true, quantidade: 1 }, { id: "baratas", tipo: "magiaConhecida", quantidade: "max(1, atr.car)" }], efeitos: [{ t: "descontoMagia", valor: 1, magiasEscolhidas: "baratas" }] },
      { id: "aspectoDoVerao", nome: "Aspecto do Verão", resumo: "Aprende uma magia de transmutação (arcana ou divina); 1 PM: uma arma em chamas até o fim da cena (+1d6 fogo; cada acerto dá 1 PM temporário, até o nível por cena).",
        escolhas: [{ id: "magia", tipo: "magia", escolas: ["transmutacao"], qualquerTipo: true, quantidade: 1 }], acao: { custo: 1, execucao: "livre", duracao: "cena", efeitos: [{ t: "danoExtra", valor: "1d6", tipo: "fogo" }] } },
      AUMENTO,
      { id: "companheiroAnimal", nome: "Companheiro Animal", resumo: "Um companheiro animal (parceiro iniciante; veterano no 7º, mestre no 15º). Pode escolher mais vezes, com companheiros diferentes, respeitando o limite de parceiros.", req: { atr: { car: 1 }, pericias: ["adestramento"] }, repetivel: true, parceiro: "companheiroAnimal" },
      { id: "companheiroAnimalAprimorado", nome: "Companheiro Animal Aprimorado", resumo: "Um companheiro ganha um segundo tipo, com os bônus do nível dele.", req: { poderes: ["companheiroAnimal"], nc: 6 } },
      { id: "companheiroAnimalLendario", nome: "Companheiro Animal Lendário", resumo: "Um companheiro dobra os bônus do tipo original.", req: { poderes: ["companheiroAnimal"], nc: 18 } },
      { id: "companheiroAnimalMagico", nome: "Companheiro Animal Mágico", resumo: "Um companheiro ganha um segundo tipo entre adepto, destruidor, magivocador ou médico.", req: { poderes: ["companheiroAnimal"], nc: 8 } },
      { id: "coracaoDaSelva", nome: "Coração da Selva", resumo: "+2 na CD dos seus venenos e +1 de perda de vida por dado." },
      { id: "espiritoDosEquinocios", nome: "Espírito dos Equinócios", resumo: "4 PM: até o fim da cena, rola de novo qualquer 1 nos dados.", req: { poderes: ["aspectoDaPrimavera", "aspectoDoOutono"], nc: 10 }, acao: { custo: 4, execucao: "livre", duracao: "cena", efeitos: [{ t: "rerolarUm" }] } },
      { id: "espiritoDosSolsticios", nome: "Espírito dos Solstícios", resumo: "Ao lançar uma magia, +4 PM para maximizar os efeitos numéricos variáveis.", req: { poderes: ["aspectoDoInverno", "aspectoDoVerao"], nc: 10 }, opcaoDeMagia: { id: "maximizar", custo: 4, maximiza: true } },
      { id: "forcaDosPenhascos", nome: "Força dos Penhascos", resumo: "+2 em Fortitude; em contato com solo ou pedra, cada PM (até a Sabedoria) reduz 10 do dano sofrido.", req: { nc: 4 }, efeitos: [{ t: "bonus", alvo: "pericia.fortitude", valor: 2 }] },
      { id: "formaPrimal", nome: "Forma Primal", resumo: "Na Forma Selvagem, benefícios de dois tipos de animal (bônus iguais não se somam).", req: { nc: 18 } },
      { id: "formaSelvagem", nome: "Forma Selvagem", resumo: "Ação completa e 3 PM: assume uma forma selvagem (não fala, não empunha itens nem lança magias; o equipamento some, mas os itens vestidos valem).",
        acao: { id: "formaSelvagem", custo: 3, execucao: "completa", duracao: "indefinida", forma: true, niveis: { aprimorada: { custo: 6, poder: "formaSelvagemAprimorada" }, superior: { custo: 10, poder: "formaSelvagemSuperior" } } } },
      { id: "formaSelvagemAprimorada", nome: "Forma Selvagem Aprimorada", resumo: "6 PM ao todo para uma forma aprimorada.", req: { poderes: ["formaSelvagem"], nc: 6 } },
      { id: "formaSelvagemSuperior", nome: "Forma Selvagem Superior", resumo: "10 PM ao todo para uma forma superior.", req: { poderes: ["formaSelvagemAprimorada"], nc: 12 } },
      { id: "liberdadeDaPradaria", nome: "Liberdade da Pradaria", resumo: "+2 em Reflexos; ao ar livre, 1 PM para aumentar o alcance de uma magia em um passo.", efeitos: [{ t: "bonus", alvo: "pericia.reflexos", valor: 2 }], opcaoDeMagia: { id: "pradaria", custo: 1, alcance: 1, cond: "ao ar livre" } },
      { id: "magiaNatural", nome: "Magia Natural", resumo: "Na forma selvagem, lança magias e empunha catalisadores e esotéricos.", req: { poderes: ["formaSelvagem"] } },
      { id: "presasAfiadas", nome: "Presas Afiadas", resumo: "+2 na margem de ameaça das armas naturais.", efeitos: [{ t: "bonus", alvo: "margem.natural", valor: 2 }] },
      { id: "segredosDaNatureza", nome: "Segredos da Natureza", resumo: "Aprende duas magias das suas escolas, arcanas ou divinas.", repetivel: true, efeitos: [{ t: "magiasExtras", valor: 2, qualquerTipo: true }] },
      { id: "tranquilidadeDosLagos", nome: "Tranquilidade dos Lagos", resumo: "+2 em Vontade; portando água, uma vez por rodada, 1 PM para refazer um teste de resistência.", efeitos: [{ t: "bonus", alvo: "pericia.vontade", valor: 2 }] },
    ],
  });

  /* ------------------------------------------------------- GUERREIRO */
  var EFEITOS_GOLPE_PESSOAL = [
    ["amplo", "Amplo", 3, "Atinge todas as criaturas em alcance curto (aliados inclusive): um teste contra a Defesa de cada uma."],
    ["atordoante", "Atordoante", 2, "Quem sofrer dano fica atordoado 1 rodada (uma vez por cena; Fortitude CD For anula)."],
    ["brutal", "Brutal", 1, "Um dado extra de dano do mesmo tipo."],
    ["conjurador", "Conjurador", "magia + 1", "Ao acertar, lança uma magia de 1º ou 2º círculo (alvo ou área) como ação livre."],
    ["destruidor", "Destruidor", 2, "+1 no multiplicador de crítico."],
    ["distante", "Distante", 1, "Alcance um passo maior."],
    ["elemental", "Elemental", 2, "+2d6 de ácido, eletricidade, fogo ou frio (repetível, +2 PM cada)."],
    ["impactante", "Impactante", 1, "Empurra 1,5m a cada 10 de dano."],
    ["letal", "Letal", 2, "+2 na margem de ameaça (duas vezes: +5)."],
    ["penetrante", "Penetrante", 1, "Ignora 10 de RD."],
    ["preciso", "Preciso", 1, "Rola dois d20 no ataque e usa o melhor."],
    ["qualquerArma", "Qualquer Arma", 1, "Vale com qualquer arma."],
    ["ricocheteante", "Ricocheteante", 1, "A arma de arremesso volta."],
    ["teleguiado", "Teleguiado", 1, "Ignora camuflagem e cobertura leves."],
    ["lento", "Lento", -2, "Exige ação completa."],
    ["pertoDaMorte", "Perto da Morte", -2, "Só com um quarto dos PV ou menos."],
    ["sacrificio", "Sacrifício", -2, "Perde 10 PV a cada uso."],
  ];
  registrar({
    id: "guerreiro", nome: "Guerreiro", pagina: 64, atributo: "Força ou Destreza",
    pv: { inicial: 20, nivel: 5 }, pm: 3,
    pericias: { fixas: ["fortitude"], ou: [["luta", "pontaria"]], escolha: { n: 2, de: ["adestramento", "atletismo", "cavalgar", "guerra", "iniciativa", "intimidacao", "luta", "oficio", "percepcao", "pontaria", "reflexos"] } },
    proficiencias: ["marciais", "pesadas", "escudos"],
    tabela: tabela(poderes20(["ataqueEspecial"], { 3: ["durao"], 6: ["ataqueExtra"], 20: ["campeao"] })),
    habilidades: {
      ataqueEspecial: { nome: "Ataque Especial", resumo: "Num ataque, 1 PM para +4 no ataque ou no dano; a cada quatro níveis, +1 PM por +4 (pode dividir igualmente).",
        opcaoDeAtaque: { id: "ataqueEspecial", custo: 1, escala: { pm: 1, max: "floor((nc - 1) / 4)" }, bonusDivisivel: "4 + 4 * x" } },
      poder: { nome: "Poder de Guerreiro", poder: true },
      durao: { nome: "Durão", resumo: "Ao sofrer dano, 3 PM para reduzi-lo à metade.", reacao: { id: "durao", custo: 3, gatilho: "sofrer dano", efeito: "metade do dano" } },
      ataqueExtra: { nome: "Ataque Extra", resumo: "Ao agredir, 2 PM para um ataque adicional, uma vez por rodada.", opcaoDeAtaque: { id: "ataqueExtra", custo: 2, ataqueExtra: true } },
      campeao: { nome: "Campeão", resumo: "Dano de todos os ataques +1 passo; Ataque Especial ou Golpe Pessoal que acerta devolve metade dos PM gastos.", efeitos: [{ t: "passoDano", valor: 1 }] },
    },
    efeitosGolpePessoal: EFEITOS_GOLPE_PESSOAL,
    poderes: [
      { id: "ambidestria", nome: "Ambidestria", resumo: "Empunhando duas armas (uma leve), agredir faz dois ataques, com –2 em todos os ataques até o próximo turno.", req: { atr: { des: 2 } }, efeitos: [{ t: "ambidestria" }] },
      { id: "arqueiro", nome: "Arqueiro", resumo: "Com arma à distância, soma a Sabedoria no dano (limitado pelo nível).", req: { atr: { sab: 1 } }, efeitos: [{ t: "bonus", alvo: "dano.distancia", valor: "min(atr.sab, nivel)" }] },
      { id: "ataqueReflexo", nome: "Ataque Reflexo", resumo: "Alvo no seu alcance fica desprevenido ou sai voluntariamente dele: 1 PM para um ataque corpo a corpo (uma vez por alvo por rodada).", req: { atr: { des: 1 } } },
      AUMENTO,
      { id: "baterECorrer", nome: "Bater e Correr", resumo: "Após a investida, continua se movendo até o deslocamento; 2 PM para investir em terreno difícil e sem a penalidade na Defesa." },
      { id: "destruidor", nome: "Destruidor", resumo: "Com arma corpo a corpo de duas mãos, rola de novo resultados 1 e 2 do dano da arma.", req: { atr: { "for": 1 } }, efeitos: [{ t: "rerolarDano", ate: 2, armas: ["duasMaos"] }] },
      { id: "esgrimista", nome: "Esgrimista", resumo: "Com arma corpo a corpo leve ou ágil, soma a Inteligência no dano (limitado pelo nível).", req: { atr: { "int": 1 } }, efeitos: [{ t: "bonus", alvo: "dano.corpo", valor: "min(atr.int, nivel)", armas: ["leve", "agil"] }] },
      { id: "especializacaoEmArma", nome: "Especialização em Arma", resumo: "+2 no dano com a arma escolhida.", repetivel: true, escolhas: [{ id: "arma", tipo: "arma" }], efeitos: [{ t: "bonus", alvo: "dano", valor: 2, armaEscolhida: "arma" }] },
      { id: "especializacaoEmArmadura", nome: "Especialização em Armadura", resumo: "RD 5 com armadura pesada.", req: { nc: 12 }, efeitos: [{ t: "rd", valor: 5, auto: "armaduraPesada", fonteRd: "especializacao" }] },
      { id: "golpeDeRaspao", nome: "Golpe de Raspão", resumo: "Uma vez por rodada, ao errar, 2 PM para causar metade do dano (sem os efeitos de acerto)." },
      { id: "golpeDemolidor", nome: "Golpe Demolidor", resumo: "Ao quebrar ou atacar objeto, 2 PM para ignorar a RD dele." },
      { id: "golpePessoal", nome: "Golpe Pessoal", resumo: "Uma técnica com uma arma específica, montada com efeitos e custo (mín. 1 PM); refeita ao subir de nível. Não gasta em golpes pessoais na rodada mais que o limite de PM.", req: { nc: 5 }, repetivel: true, golpePessoal: true },
      { id: "impeto", nome: "Ímpeto", resumo: "1 PM: +6m de deslocamento por uma rodada.", acao: { custo: 1, execucao: "livre", duracao: "rodada", efeitos: [{ t: "bonus", alvo: "deslocamento", valor: 6 }] } },
      { id: "mestreEmArma", nome: "Mestre em Arma", resumo: "Com a arma escolhida, dano +1 passo e 2 PM para rolar de novo um ataque.", req: { poderes: ["especializacaoEmArma"], nc: 12 }, escolhas: [{ id: "arma", tipo: "arma", igualA: "especializacaoEmArma.arma" }], efeitos: [{ t: "passoDano", valor: 1, armaEscolhida: "arma" }] },
      { id: "planejamentoMarcial", nome: "Planejamento Marcial", resumo: "Uma vez por dia, uma hora e 3 PM: um poder de guerreiro ou de combate cujos requisitos cumpra, até o próximo dia.", req: { pericias: ["guerra"], nc: 10 } },
      { id: "romperResistencias", nome: "Romper Resistências", resumo: "No Ataque Especial, +1 PM para ignorar 10 de RD." },
      { id: "solidez", nome: "Solidez", resumo: "Com escudo, soma o bônus de Defesa do escudo nos testes de resistência.", efeitos: [{ t: "bonus", alvo: "resistencias", valor: "defesaEscudo" }] },
      { id: "tornadoDeDor", nome: "Tornado de Dor", resumo: "Ação padrão e 2 PM: um ataque corpo a corpo contra a Defesa de cada inimigo no alcance natural; o dano ganha +2 por acerto e vale para todos os atingidos.", req: { nc: 6 } },
      { id: "valentao", nome: "Valentão", resumo: "+2 no ataque e no dano contra oponentes caídos, desprevenidos, flanqueados ou indefesos.", efeitos: [{ t: "bonus", alvo: "ataque", valor: 2, cond: "alvo caído, desprevenido, flanqueado ou indefeso" }, { t: "bonus", alvo: "dano", valor: 2, cond: "alvo caído, desprevenido, flanqueado ou indefeso" }] },
    ],
  });

  /* -------------------------------------------------------- INVENTOR */
  registrar({
    id: "inventor", nome: "Inventor", pagina: 67, atributo: "Inteligência",
    pv: { inicial: 12, nivel: 3 }, pm: 4,
    pericias: { fixas: ["oficio", "vontade"], escolha: { n: 4, de: ["conhecimento", "cura", "diplomacia", "fortitude", "iniciativa", "investigacao", "luta", "misticismo", "oficio", "pilotagem", "percepcao", "pontaria"] } },
    proficiencias: [],
    tabela: tabela(poderes20(["engenhosidade", "prototipo"], { 2: ["fabricarItemSuperior"], 3: ["comerciante"], 5: ["fabricarItemSuperior"], 7: ["encontrarFraqueza"], 8: ["fabricarItemSuperior"], 9: ["fabricarItemMagico"], 10: ["olhoDoDragao"], 11: ["fabricarItemSuperior"], 13: ["fabricarItemMagico"], 17: ["fabricarItemMagico"], 20: ["obraPrima"] })),
    habilidades: {
      engenhosidade: { nome: "Engenhosidade", resumo: "Num teste de perícia (não de ataque), 2 PM para somar a Inteligência.", opcaoDeTeste: { id: "engenhosidade", custo: 2, soma: "atr.int", exceto: ["ataque"] } },
      prototipo: { nome: "Protótipo", resumo: "Começa com um item superior ou 10 itens alquímicos, até T$ 500 no total.", itemInicial: { ate: 500, superiorOuAlquimicos: 10 } },
      fabricarItemSuperior: { nome: "Fabricar Item Superior", resumo: "2º nível: recebe um item superior de até T$ 2.000 e fabrica itens com uma melhoria. Nos níveis 5, 8 e 11, troca por um item com 2, 3 e 4 melhorias e passa a fabricá-los. Sem custo de tempo ou dinheiro nesses itens.",
        melhorias: "nc >= 11 ? 4 : nc >= 8 ? 3 : nc >= 5 ? 2 : 1" },
      poder: { nome: "Poder de Inventor", poder: true },
      comerciante: { nome: "Comerciante", resumo: "Vende itens 10% mais caro (não cumulativo com barganha).", efeitos: [{ t: "vendaBonus", valor: 0.1 }] },
      encontrarFraqueza: { nome: "Encontrar Fraqueza", resumo: "Ação de movimento e 2 PM: até o fim da cena ignora a RD de um objeto em alcance curto, ou recebe +2 no ataque contra inimigo de armadura ou construto.",
        acao: { custo: 2, execucao: "movimento", alcance: "curto", duracao: "cena", efeitos: [{ t: "bonus", alvo: "ataque", valor: 2, contraAlvo: true, cond: "alvo de armadura ou construto" }] } },
      fabricarItemMagico: { nome: "Fabricar Item Mágico", resumo: "9º: recebe um item mágico menor e fabrica itens menores; 13º e 17º: troca por médio e maior e passa a fabricá-los. Sem custo nesses itens.",
        categoria: "nc >= 17 ? 'maior' : nc >= 13 ? 'medio' : 'menor'" },
      olhoDoDragao: { nome: "Olho do Dragão", resumo: "Ação completa: descobre se um item é mágico, suas propriedades e como usá-las." },
      obraPrima: { nome: "Obra-Prima", resumo: "Um item próprio aprovado pelo mestre, equivalente a cinco melhorias e quatro encantos, sem custo." },
    },
    engenhocas: {
      pagina: 70,
      resumo: "Item mundano Minúsculo (1 espaço, Defesa 15, PV = metade dos seus, RD 5), empunhado ou vestido, que simula uma magia arcana ou divina. 1º círculo; 2º no 6º nível e um círculo a mais a cada quatro níveis. Fabricar: T$ 100 × PM da magia, Ofício (engenhoqueiro) CD 20 + PM, uma semana. Máximo = Inteligência.",
      circulos: { 1: 1, 6: 2, 10: 3, 14: 4, 18: 5 },
      fabricar: { custoPorPM: 100, cdBase: 20, tempo: "uma semana", pericia: "oficio:engenhoqueiro" },
      ativar: { pericia: "oficio:engenhoqueiro", cdBase: 15, porAtivacaoNoDia: 5, porPMAprimoramento: 1, aprimoramentoAte: "atr.int", falha: "enguiça (uma hora para consertar)", penalidadeArmadura: true, execucao: "padrao ou a da magia", naoMagica: true },
    },
    livroDeFormulas: { pagina: 70, iniciais: 3, porNivel: 1, circulos: { 1: 1, 6: 2 }, circulosMestre: { 10: 3, 14: 4, 18: 5 }, atributo: "int", perda: "uma semana e T$ 100" },
    poderes: [
      { id: "agiteAntesDeUsar", nome: "Agite Antes de Usar", resumo: "Preparado alquímico de dano: até Int PM, cada um soma um dado do mesmo tipo.", req: { pericias: ["oficio:alquimista"] } },
      { id: "ajusteDeMira", nome: "Ajuste de Mira", resumo: "Ação padrão e até Int PM: +1 no dano com uma arma à distância por PM, até o fim da cena.", req: { poderes: ["balistica"] },
        acao: { custo: 1, execucao: "padrao", duracao: "cena", escala: { pm: 1, max: "atr.int - 1", rotulo: "+1 dano" }, efeitos: [{ t: "bonus", alvo: "dano.distancia", valor: "1 + x", armaUnica: true }] } },
      { id: "alquimistaDeBatalha", nome: "Alquimista de Batalha", resumo: "Soma a Inteligência no dano de preparados alquímicos e poções.", req: { poderes: ["alquimistaIniciado"] } },
      { id: "alquimistaIniciado", nome: "Alquimista Iniciado", resumo: "Livro de fórmulas; fabrica poções de 1º e 2º círculos com fórmulas que conhece.", req: { atr: { "int": 1, sab: 1 }, pericias: ["oficio:alquimista"] }, formulas: true },
      { id: "armeiro", nome: "Armeiro", resumo: "Proficiência com armas marciais corpo a corpo; usa Inteligência no lugar de Força no ataque e dano corpo a corpo.", req: { pericias: ["luta", "oficio:armeiro"] },
        efeitos: [{ t: "prof", qual: "marciaisCorpo" }, { t: "atrAtaque", atributo: "int", tipoArma: "corpo", substitui: "for", dano: true }] },
      { id: "ativacaoRapida", nome: "Ativação Rápida", resumo: "Engenhoca de ação padrão: 2 PM para ativar com ação de movimento.", req: { poderes: ["engenhoqueiro"], nc: 7 } },
      AUMENTO,
      { id: "automato", nome: "Autômato", resumo: "Um construto parceiro iniciante (ajudante, assassino, atirador, combatente, guardião, montaria ou vigilante); veterano no 7º, mestre no 15º. Novo: uma semana e T$ 100.", req: { poderes: ["engenhoqueiro"] }, parceiro: "automato" },
      { id: "automatoPrototipado", nome: "Autômato Prototipado", resumo: "Ação padrão e 2 PM: 1d6; 2–6 sobe o nível do autômato (ou dá outra habilidade iniciante) até o fim da cena; 1 enguiça.", req: { poderes: ["automato"] } },
      { id: "balistica", nome: "Balística", resumo: "Proficiência com armas marciais à distância ou de fogo; usa Inteligência no lugar de Destreza no ataque à distância (e no dano com Estilo de Disparo).", req: { pericias: ["pontaria", "oficio:armeiro"] },
        escolhas: [{ id: "prof", tipo: "opcao", opcoes: [["marciaisDistancia", "Armas marciais à distância"], ["fogo", "Armas de fogo"]], efeito: { t: "prof" } }], efeitos: [{ t: "atrAtaque", atributo: "int", tipoArma: "distancia", substitui: "des" }] },
      { id: "blindagem", nome: "Blindagem", resumo: "Com armadura pesada, soma a Inteligência na Defesa (e não a Destreza).", req: { poderes: ["couraceiro"], nc: 8 }, efeitos: [{ t: "atrDefesa", atributo: "int", comPesada: true }] },
      { id: "canoRaiado", nome: "Cano Raiado", resumo: "Arma de disparo feita por você: +1 na margem de ameaça.", req: { poderes: ["balistica"], nc: 5 } },
      { id: "catalisadorInstavel", nome: "Catalisador Instável", resumo: "Ação completa e 3 PM: fabrica na hora um preparado ou poção que conhece, pela metade do custo e sem teste; dura até o fim da cena.", req: { poderes: ["alquimistaIniciado"] } },
      { id: "chutesEPalavroes", nome: "Chutes e Palavrões", resumo: "Uma vez por rodada, 1 PM para repetir o teste de ativar uma engenhoca.", req: { poderes: ["engenhoqueiro"] } },
      { id: "conhecimentoDeFormulas", nome: "Conhecimento de Fórmulas", resumo: "Aprende três fórmulas de círculos que pode aprender.", req: { poderes: ["alquimistaIniciado"] }, repetivel: true },
      { id: "couraceiro", nome: "Couraceiro", resumo: "Proficiência com armaduras pesadas e escudos; com armadura, usa Inteligência no lugar de Destreza na Defesa (pesada continua sem atributo).", req: { pericias: ["oficio:armeiro"] },
        efeitos: [{ t: "prof", qual: "pesadas" }, { t: "prof", qual: "escudos" }, { t: "atrDefesa", atributo: "int", substitui: "des", comArmadura: true }] },
      { id: "engenhoqueiro", nome: "Engenhoqueiro", resumo: "Fabrica engenhocas (p. 70).", req: { atr: { "int": 3 }, pericias: ["oficio:engenhoqueiro"] }, engenhocas: true },
      { id: "farmaceutico", nome: "Farmacêutico", resumo: "Item alquímico de cura: até Int PM, cada um cura um dado extra.", req: { atr: { sab: 1 }, pericias: ["oficio:alquimista"] } },
      { id: "ferreiro", nome: "Ferreiro", resumo: "Arma corpo a corpo feita por você: dano +1 passo.", req: { poderes: ["armeiro"], nc: 5 } },
      { id: "granadeiro", nome: "Granadeiro", resumo: "Arremessa alquímicos e poções em alcance médio; usa Inteligência na CD deles.", req: { poderes: ["alquimistaDeBatalha"] } },
      { id: "homunculo", nome: "Homúnculo", resumo: "Criatura Minúscula alquímica (telepatia em alcance longo): parceiro ajudante iniciante; perdendo 1d6 PV, vira também guardião iniciante até o fim da cena.", req: { poderes: ["alquimistaIniciado"] }, parceiro: "homunculo" },
      { id: "invencaoPotente", nome: "Invenção Potente", resumo: "Item ou engenhoca feita por você: 1 PM para +2 na CD.", opcaoDeMagia: { id: "invencaoPotente", custo: 1, cd: 2, soEngenhoca: true } },
      { id: "maestriaEmPericia", nome: "Maestria em Perícia", resumo: "Escolha perícias treinadas em número igual à Inteligência: nelas, 1 PM para escolher 10 (exceto ataques).", escolhas: [{ id: "pericias", tipo: "periciaTreinada", quantidade: "atr.int" }] },
      { id: "manutencaoEficiente", nome: "Manutenção Eficiente", resumo: "+3 no limite de engenhocas; cada uma ocupa meio espaço.", req: { poderes: ["engenhoqueiro"], nc: 5 } },
      { id: "mestreAlquimista", nome: "Mestre Alquimista", resumo: "Fabrica poções de qualquer círculo com fórmulas que conheça.", req: { atr: { "int": 3, sab: 3 }, poderes: ["alquimistaIniciado"], nc: 10 } },
      { id: "mestreCuca", nome: "Mestre Cuca", resumo: "Comidas que você cozinha têm +1 no bônus numérico.", req: { pericias: ["oficio:cozinheiro"] } },
      { id: "misturaFervilhante", nome: "Mistura Fervilhante", resumo: "Alquímico ou poção: 2 PM para dobrar a área.", req: { poderes: ["alquimistaIniciado"], nc: 5 } },
      { id: "oficinaDeCampo", nome: "Oficina de Campo", resumo: "Uma hora e 2 PM: cada membro do grupo escolhe arma (+1 no ataque) ou armadura/escudo (+1 na Defesa) por um dia.", req: { pericias: ["oficio:armeiro"] } },
      { id: "pedraDeAmolar", nome: "Pedra de Amolar", resumo: "Ação de movimento e até Int PM: +1 no dano por PM com a arma corpo a corpo empunhada até o fim da cena.", req: { poderes: ["armeiro"] },
        acao: { custo: 1, execucao: "movimento", duracao: "cena", escala: { pm: 1, max: "atr.int - 1", rotulo: "+1 dano" }, efeitos: [{ t: "bonus", alvo: "dano.corpo", valor: "1 + x", armaUnica: true }] } },
      { id: "sinteseRapida", nome: "Síntese Rápida", resumo: "Fabrica o dobro de doses de alquímicos e poções no mesmo tempo.", req: { poderes: ["alquimistaIniciado"] } },
    ],
  });
})(typeof window !== "undefined" ? window : globalThis);
/* <<< js/tormenta20/classes-b.js */

/* >>> js/tormenta20/classes-c.js */
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
/* <<< js/tormenta20/classes-c.js */

/* >>> js/tormenta20/origens.js */
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
/* <<< js/tormenta20/origens.js */

/* >>> js/tormenta20/deuses.js */
/* =====================================================================
   R.A.M.A. — Tormenta20 · deuses do Panteão (p. 96–105)
   ---------------------------------------------------------------------
   Devoto (p. 96): raça ou classe listada em "devotos" (humanos e
   clérigos podem qualquer deus); um poder concedido (clérigo, druida e
   paladino: dois); violar as Obrigações & Restrições tira todos os PM
   até o próximo dia (de novo na mesma aventura: até a penitência).
   `inicioDeCena` e `restricoes` são o que a ficha aplica sozinha; o
   resto das O&R é decisão da mesa.
   ===================================================================== */

(function (global) {
  "use strict";

  function d(id, nome, pagina, energia, arma, devotos, poderes, oer, extra) {
    return Object.assign({ id: id, nome: nome, pagina: pagina, energia: energia, armaPreferida: arma, devotos: devotos, poderes: poderes, obrigacoes: oer, fonte: "T20" }, extra || {});
  }
  var QUALQUER = "qualquer";

  var DEUSES = [
    d("aharadak", "Aharadak", 96, "negativa", "correnteDeEspinhos", QUALQUER, ["afinidadeComATormenta", "extaseDaLoucura", "percepcaoTemporal", "rejeicaoDivina"],
      "No início de cada cena de ação, role 1d6: ímpar, fica fascinado na primeira rodada (mesmo se imune).",
      { titulo: "Deus da Tormenta", inicioDeCena: { rolar: "1d6", se: "impar", condicao: "fascinado", duracao: "1 rodada", ignoraImunidade: true } }),
    d("allihanna", "Allihanna", 97, "positiva", "bordao", ["dahllan", "elfo", "silfide", "barbaro", "cacador", "druida"], ["compreenderOsErmos", "dedoVerde", "descansoNatural", "vozDaNatureza"],
      "Só armaduras e escudos não metálicos (acolchoada, couro, gibão de peles, escudo leve ou materiais especiais não metálicos). Não descansa em comunidade maior que aldeia (não recupera PV e PM).",
      { titulo: "Deusa da Natureza", restricoes: { armadurasPermitidas: ["acolchoada", "couro", "gibaoDePeles", "escudoLeve"], naoMetal: true } }),
    d("arsenal", "Arsenal", 98, QUALQUER, "marteloDeGuerra", ["anao", "minotauro", "barbaro", "cavaleiro", "guerreiro", "lutador"], ["conjurarArma", "coragemTotal", "feGuerreira", "sangueDeFerro"],
      "Proibido de ser derrotado em combate ou disputa (inclusive o grupo).", { titulo: "Deus da Guerra" }),
    d("azgher", "Azgher", 98, "positiva", "cimitarra", ["suraggel:aggelus", "qareen", "arcanista", "barbaro", "cacador", "cavaleiro", "guerreiro", "nobre", "paladino"], ["espadaSolar", "fulgorSolar", "habitanteDoDeserto", "inimigoDeTenebra"],
      "Rosto sempre coberto (só revelado ao sumo-sacerdote ou no funeral). Doa à igreja 20% de todo tesouro, em ouro.", { titulo: "Deus-Sol", dizimo: 0.2 }),
    d("hyninn", "Hyninn", 98, QUALQUER, "adaga", ["hynne", "goblin", "silfide", "bardo", "bucaneiro", "ladino", "inventor", "nobre"], ["apostarComOTrapaceiro", "farsaDoFingidor", "formaDeMacaco", "golpistaDivino"],
      "Não recusa golpe, trapaça ou artimanha (salvo contra aliados). Um ato furtivo, ousado ou proibido por dia ou sessão (Enganação ou Ladinagem, CD mínima 15 + metade do nível).", { titulo: "Deus da Trapaça" }),
    d("kallyadranoch", "Kallyadranoch", 99, "negativa", "lanca", ["elfo", "medusa", "suraggel:sulfure", "arcanista", "cavaleiro", "guerreiro", "lutador", "nobre"], ["auraDeMedo", "escamasDraconicas", "presasPrimordiais", "servosDoDragao"],
      "Para subir de nível, oferenda de 20% da diferença de dinheiro inicial entre o nível novo e o atual.", { titulo: "Deus dos Dragões", oferendaPorNivel: 0.2 }),
    d("khalmyr", "Khalmyr", 99, "positiva", "espadaLonga", ["suraggel:aggelus", "anao", "cavaleiro", "guerreiro", "nobre", "paladino"], ["coragemTotal", "domDaVerdade", "espadaJusticeira", "repararInjustica"],
      "Não recusa ajuda a inocentes; obedece superiores na igreja; só usa itens mágicos permanentes feitos por devotos de Khalmyr.", { titulo: "Deus da Justiça" }),
    d("lena", "Lena", 99, "positiva", null, ["dahllan", "qareen", "nobre", "paladino"], ["ataquePiedoso", "auraRestauradora", "curaGentil", "curandeiraPerfeita"],
      "Não causa dano letal nem perda de PV a criaturas vivas (nem dá bônus nisso); pode dano não letal e condições. Só mulheres (paladinos podem ser homens). Sem Arma Espiritual e similares.",
      { titulo: "Deusa da Vida", restricoes: { semDanoLetal: true, semArmaEspiritual: true } }),
    d("linWu", "Lin-Wu", 100, QUALQUER, "katana", ["anao", "cavaleiro", "guerreiro", "nobre", "paladino"], ["coragemTotal", "kiaiDivino", "menteVazia", "tradicaoDeLinWu"],
      "Comportamento honrado: proibido qualquer teste de Enganação, Furtividade ou Ladinagem.", { titulo: "Deus Samurai", restricoes: { periciasProibidas: ["enganacao", "furtividade", "ladinagem"] } }),
    d("marah", "Marah", 101, "positiva", null, ["suraggel:aggelus", "elfo", "hynne", "qareen", "bardo", "nobre", "paladino"], ["auraDePaz", "domDaEsperanca", "palavrasDeBondade", "talentoArtistico"],
      "Não causa dano, perda de PV nem condições (exceto enfeitiçado, fascinado e pasmo); em combate só protege, cura, foge ou se rende. Sem Arma Espiritual e similares.",
      { titulo: "Deusa da Paz", restricoes: { semDano: true, semArmaEspiritual: true } }),
    d("megalokk", "Megalokk", 101, "negativa", "maca", ["goblin", "medusa", "minotauro", "suraggel:sulfure", "trog", "barbaro", "cacador", "druida", "lutador"], ["olharAmedrontador", "presasPrimordiais", "urroDivino", "vozDosMonstros"],
      "Proibido usar perícias de Inteligência ou Carisma (exceto Adestramento e Intimidação), preparar ação, escolher 10 ou 20 e lançar magias sustentadas.",
      { titulo: "Deus dos Monstros", restricoes: { periciasPorAtributo: ["int", "car"], excetoPericias: ["adestramento", "intimidacao"], semSustentadas: true, semEscolher10: true } }),
    d("nimb", "Nimb", 102, QUALQUER, "qualquer", ["goblin", "qareen", "silfide", "arcanista", "barbaro", "bardo", "bucaneiro", "inventor", "ladino"], ["extaseDaLoucura", "poderOculto", "sorteDosLoucos", "transmissaoDaLoucura"],
      "Sem obrigações (nunca perde PM por elas). –5 em perícias de Carisma; no início de cada cena de ação, 1d6: com 1, fica confuso (mesmo se imune).",
      { titulo: "Deus do Caos", semPerdaDePM: true, efeitos: [{ t: "bonus", alvo: "pericias.car", valor: -5 }], inicioDeCena: { rolar: "1d6", se: 1, condicao: "confuso", ignoraImunidade: true } }),
    d("oceano", "Oceano", 102, QUALQUER, "tridente", ["dahllan", "hynne", "minotauro", "sereia", "barbaro", "bucaneiro", "cacador", "druida"], ["anfibio", "arsenalDasProfundezas", "mestreDosMares", "soproDoMar"],
      "Só azagaia, lança, tridente e rede; só armaduras leves; não fica mais de um mês longe do oceano.",
      { titulo: "Deus dos Mares", restricoes: { armasPermitidas: ["azagaia", "lanca", "tridente", "rede"], soArmaduraLeve: true } }),
    d("sszzaas", "Sszzaas", 103, "negativa", "adaga", ["medusa", "arcanista", "bardo", "bucaneiro", "inventor", "ladino", "nobre"], ["astuciaDaSerpente", "familiarOfidico", "presasVenenosas", "sangueOfidico"],
      "Um ato de traição, intriga ou corrupção por dia ou sessão (Enganação, CD mínima 15 + metade do nível).", { titulo: "Deus da Traição" }),
    d("tannaToh", "Tanna-Toh", 103, QUALQUER, "bordao", ["golem", "kliren", "arcanista", "bardo", "inventor", "nobre", "paladino"], ["conhecimentoEnciclopedico", "menteAnalitica", "pesquisaAbencoada", "vozDaCivilizacao"],
      "Não recusa missão de buscar conhecimento; sempre diz a verdade e responde perguntas diretas; não esconde conhecimento.", { titulo: "Deusa do Conhecimento" }),
    d("tenebra", "Tenebra", 104, "negativa", "adaga", ["anao", "medusa", "qareen", "osteon", "suraggel:sulfure", "trog", "arcanista", "bardo", "ladino"], ["cariciaSombria", "mantoDaPenumbra", "visaoNasTrevas", "zumbificar"],
      "Não pode ser tocado pelo sol: de dia, cobre-se inteiro.", { titulo: "Deusa das Trevas" }),
    d("thwor", "Thwor", 104, QUALQUER, "machadoDeGuerra", "duyshidakk", ["almejarOImpossivel", "furiaDivina", "olharAmedrontador", "tropasDuyshidakk"],
      "Ser duyshidakk (aceito pelo povo goblinoide); buscar o 'Mundo Como Deve Ser'; aliar-se a goblinoides e só lutar contra eles em último caso.", { titulo: "Deus dos Goblinoides" }),
    d("thyatis", "Thyatis", 104, "positiva", "espadaLonga", ["suraggel:aggelus", "cavaleiro", "guerreiro", "inventor", "lutador", "paladino"], ["ataquePiedoso", "domDaImortalidade", "domDaProfecia", "domDaRessurreicao"],
      "Proibido matar criaturas inteligentes (Int –3 ou maior).", { titulo: "Deus da Ressurreição e Profecia" }),
    d("valkaria", "Valkaria", 105, "positiva", "mangual", "aventureiros", ["almejarOImpossivel", "armasDaAmbicao", "coragemTotal", "liberdadeDivina"],
      "Não fixa moradia (no máximo 2d10+10 dias na mesma cidade ou 1d4+2 meses no mesmo reino); não se casa nem forma união estável.", { titulo: "Deusa da Ambição" }),
    d("wynna", "Wynna", 105, QUALQUER, "adaga", ["elfo", "golem", "qareen", "silfide", "arcanista", "bardo"], ["bencaoDoMana", "centelhaMagica", "escudoMagico", "teurgistaMistico"],
      "Não recusa ajuda a inocentes; proibido matar seres mágicos (elfos, qareen, sílfides…) e conjuradores arcanos.", { titulo: "Deusa da Magia" }),
  ];
  var DEUS = {};
  DEUSES.forEach(function (x) { DEUS[x.id] = x; });

  /* Pode ser devoto? Humanos e clérigos podem qualquer deus (p. 96). */
  function podeSerDevoto(deus, racaId, varianteId, classesIds) {
    var dz = typeof deus === "string" ? DEUS[deus] : deus;
    if (!dz) return false;
    if (racaId === "humano" || classesIds.indexOf("clerigo") >= 0) return true;
    if (dz.devotos === QUALQUER || dz.devotos === "aventureiros") return true;
    if (dz.devotos === "duyshidakk") return null; // decisão da mesa
    return dz.devotos.some(function (x) {
      var p = x.split(":");
      if (p[0] === racaId) return !p[1] || p[1] === varianteId;
      return classesIds.indexOf(p[0]) >= 0;
    });
  }

  global.RAMATormenta20Deuses = { DEUSES: DEUSES, DEUS: DEUS, podeSerDevoto: podeSerDevoto, PANTEAO: { id: "panteao", nome: "Panteão", armaPreferida: "maca", restricao: "Não usa armas cortantes nem perfurantes." }, BEM: { id: "bem", nome: "O bem (paladino)" } };
})(typeof window !== "undefined" ? window : globalThis);
/* <<< js/tormenta20/deuses.js */

/* >>> js/tormenta20/poderes.js */
/* =====================================================================
   R.A.M.A. — Tormenta20 · poderes gerais (p. 124–137)
   ---------------------------------------------------------------------
   Grupos: combate, destino, magia, concedidos (devotos; atributo-chave
   Sabedoria) e da Tormenta. Formato igual ao dos poderes de classe
   (classes-a.js). Na Tormenta, `pt` é o total de poderes da Tormenta e
   `pto` os OUTROS (pt − 1). Perda de Carisma (p. 136): –1 no primeiro
   e –1 a cada dois outros — ver perdaDeCarisma().
   ===================================================================== */

(function (global) {
  "use strict";

  function p(grupo, id, nome, resumo, extra) { return Object.assign({ id: id, nome: nome, grupo: grupo, resumo: resumo, fonte: "T20" }, extra || {}); }
  function c(id, nome, resumo, extra) { return p("combate", id, nome, resumo, Object.assign({ pagina: 124 }, extra || {})); }
  function d(id, nome, resumo, extra) { return p("destino", id, nome, resumo, Object.assign({ pagina: 129 }, extra || {})); }
  function m(id, nome, resumo, extra) { return p("magia", id, nome, resumo, Object.assign({ pagina: 131, req: Object.assign({ lancaMagias: true }, (extra && extra.req) || {}) }, extra || {}, { req: Object.assign({ lancaMagias: true }, (extra && extra.req) || {}) })); }
  function g(id, nome, deuses, resumo, extra) { return p("concedido", id, nome, resumo, Object.assign({ pagina: 132, deuses: deuses, req: Object.assign({ devoto: deuses }, (extra && extra.req) || {}) }, extra || {}, { req: Object.assign({ devoto: deuses }, (extra && extra.req) || {}) })); }
  function t(id, nome, resumo, extra) { return p("tormenta", id, nome, resumo, Object.assign({ pagina: 136 }, extra || {})); }
  var ALVO_HOSTIL = "alvo caído, desprevenido, flanqueado ou indefeso";

  var PODERES = [
    /* ---------------- COMBATE (p. 124–129) ---------------- */
    c("acuidadeComArma", "Acuidade com Arma", "Com arma corpo a corpo leve ou de arremesso, usa Destreza no lugar de Força no ataque e no dano.", { req: { atr: { des: 1 } }, efeitos: [{ t: "atrAtaque", atributo: "des", substitui: "for", armas: ["leve", "arremesso"], dano: true }] }),
    c("armaSecundariaGrande", "Arma Secundária Grande", "Empunha duas armas de uma mão com Estilo de Duas Armas.", { req: { poderes: ["estiloDeDuasArmas"] } }),
    c("arremessoPotente", "Arremesso Potente", "Com arma de arremesso, usa Força no lugar de Destreza no ataque; Ataque Poderoso vale com elas.", { req: { atr: { "for": 1 }, poderes: ["estiloDeArremesso"] }, efeitos: [{ t: "atrAtaque", atributo: "for", substitui: "des", armas: ["arremesso"] }] }),
    c("arremessoMultiplo", "Arremesso Múltiplo", "Uma vez por rodada, 1 PM para um ataque adicional de arremesso contra o mesmo alvo.", { req: { atr: { des: 1 }, poderes: ["estiloDeArremesso"] }, opcaoDeAtaque: { id: "arremessoMultiplo", custo: 1, ataqueExtra: true, armas: ["arremesso"] } }),
    c("ataqueComEscudo", "Ataque com Escudo", "Uma vez por rodada, ao agredir com escudo, 1 PM para um ataque extra com ele, sem perder o bônus na Defesa.", { req: { poderes: ["estiloDeArmaEEscudo"] } }),
    c("ataquePesado", "Ataque Pesado", "Arma de duas mãos: 1 PM; acertando, derruba ou empurra como ação livre (o ataque vale como teste de manobra).", { req: { poderes: ["estiloDeDuasMaos"] }, opcaoDeAtaque: { id: "ataquePesado", custo: 1, armas: ["duasMaos"], aoAcertar: true, manobraLivre: ["derrubar", "empurrar"] } }),
    c("ataquePoderoso", "Ataque Poderoso", "Ataque corpo a corpo com –2 no teste e +5 no dano.", { req: { atr: { "for": 1 } }, opcaoDeAtaque: { id: "ataquePoderoso", custo: 0, ataque: -2, dano: 5, corpo: true } }),
    c("ataquePreciso", "Ataque Preciso", "Arma corpo a corpo numa mão e nada na outra: +2 na margem de ameaça e +1 no multiplicador.", { req: { poderes: ["estiloDeUmaArma"] }, efeitos: [{ t: "bonus", alvo: "margem", valor: 2, empunhadura: "umaArma" }, { t: "bonus", alvo: "mult", valor: 1, empunhadura: "umaArma" }] }),
    c("bloqueioComEscudo", "Bloqueio com Escudo", "Ao sofrer dano, 1 PM para RD igual ao bônus de Defesa do escudo contra esse dano.", { req: { poderes: ["estiloDeArmaEEscudo"] }, reacao: { custo: 1, gatilho: "sofrer dano", rd: "defesaEscudo" } }),
    c("cargaDeCavalaria", "Carga de Cavalaria", "Investida montada: +2d8 de dano e pode continuar se movendo em linha reta (máximo o dobro do deslocamento).", { req: { poderes: ["ginete"] }, opcaoDeAtaque: { id: "cargaDeCavalaria", custo: 0, danoExtra: "2d8", manobra: "investida", cond: "montado" } }),
    c("combateDefensivo", "Combate Defensivo", "Ao agredir: até o próximo turno, –2 nos ataques e +5 na Defesa.", { req: { atr: { "int": 1 } }, acao: { custo: 0, execucao: "parte de agredir", duracao: "ate o proximo turno", efeitos: [{ t: "bonus", alvo: "ataque", valor: -2 }, { t: "bonus", alvo: "defesa", valor: 5 }] } }),
    c("derrubarAprimorado", "Derrubar Aprimorado", "+2 para derrubar; derrubando, 1 PM para um ataque extra contra a criatura.", { req: { poderes: ["combateDefensivo"] }, efeitos: [{ t: "bonus", alvo: "manobra.derrubar", valor: 2 }] }),
    c("desarmarAprimorado", "Desarmar Aprimorado", "+2 para desarmar; desarmando, 1 PM para arremessar a arma (1d8 direção, 1d6 quadrados).", { req: { poderes: ["combateDefensivo"] }, efeitos: [{ t: "bonus", alvo: "manobra.desarmar", valor: 2 }] }),
    c("disparoPreciso", "Disparo Preciso", "Ataca à distância alvos em corpo a corpo sem a penalidade de –5.", { req: { poderesUm: ["estiloDeDisparo", "estiloDeArremesso"] }, efeitos: [{ t: "semPenalidadeCorpoACorpo" }] }),
    c("disparoRapido", "Disparo Rápido", "Arma de disparo de recarga livre, agredindo com ação completa: um ataque adicional, com –2 nos ataques até o próximo turno.", { req: { atr: { des: 1 }, poderes: ["estiloDeDisparo"] } }),
    c("empunhaduraPoderosa", "Empunhadura Poderosa", "Arma de uma categoria maior: –2 no ataque (em vez de –5).", { req: { atr: { "for": 3 } } }),
    c("encouracado", "Encouraçado", "Com armadura pesada, +2 na Defesa; +2 a mais por poder que o tenha como pré-requisito.", { req: { prof: ["pesadas"] }, efeitos: [{ t: "bonus", alvo: "defesa", valor: "2 + 2 * dependentes.encouracado", auto: "armaduraPesada" }] }),
    c("esquiva", "Esquiva", "+2 na Defesa e em Reflexos.", { req: { atr: { des: 1 } }, efeitos: [{ t: "bonus", alvo: "defesa", valor: 2 }, { t: "bonus", alvo: "pericia.reflexos", valor: 2 }] }),
    c("estiloDeArmaEEscudo", "Estilo de Arma e Escudo", "Com escudo, o bônus na Defesa dele aumenta em +2.", { req: { pericias: ["luta"], prof: ["escudos"] }, efeitos: [{ t: "bonus", alvo: "defesa", valor: 2, auto: "comEscudo" }] }),
    c("estiloDeArmaLonga", "Estilo de Arma Longa", "+2 no ataque com armas alongadas e ataca adjacentes com elas.", { req: { atr: { "for": 1 }, pericias: ["luta"] }, efeitos: [{ t: "bonus", alvo: "ataque", valor: 2, armas: ["alongada"] }] }),
    c("estiloDeArremesso", "Estilo de Arremesso", "Saca armas de arremesso como ação livre e +2 no dano com elas (+2 no ataque também com Saque Rápido).", { req: { pericias: ["pontaria"] }, efeitos: [{ t: "bonus", alvo: "dano", valor: 2, armas: ["arremesso"] }, { t: "bonus", alvo: "ataque", valor: 2, armas: ["arremesso"], se: "tem.saqueRapido" }] }),
    c("estiloDeDisparo", "Estilo de Disparo", "Com arma de disparo, soma a Destreza no dano.", { req: { pericias: ["pontaria"] }, efeitos: [{ t: "bonus", alvo: "dano", valor: "atr.des", armas: ["disparo"] }] }),
    c("estiloDeDuasArmas", "Estilo de Duas Armas", "Empunhando duas armas (uma leve), agredir faz dois ataques, com –2 nos ataques até o próximo turno (sem penalidade com Ambidestria).", { req: { atr: { des: 2 }, pericias: ["luta"] }, efeitos: [{ t: "duasArmas" }] }),
    c("estiloDeDuasMaos", "Estilo de Duas Mãos", "Arma corpo a corpo com as duas mãos (não leve): +5 no dano.", { req: { atr: { "for": 2 }, pericias: ["luta"] }, efeitos: [{ t: "bonus", alvo: "dano", valor: 5, empunhadura: "duasMaos", exceto: ["leve"] }] }),
    c("estiloDeUmaArma", "Estilo de Uma Arma", "Arma corpo a corpo numa mão e nada na outra: +2 na Defesa e no ataque com ela (não desarmado).", { req: { pericias: ["luta"] }, efeitos: [{ t: "bonus", alvo: "defesa", valor: 2, empunhadura: "umaArma" }, { t: "bonus", alvo: "ataque", valor: 2, empunhadura: "umaArma" }] }),
    c("estiloDesarmado", "Estilo Desarmado", "Desarmado causa 1d6, letal ou não letal sem penalidade.", { req: { pericias: ["luta"] }, efeitos: [{ t: "danoDesarmado", valor: "1d6" }] }),
    c("fanatico", "Fanático", "Deslocamento não reduzido por armadura pesada.", { req: { nivel: 12, poderes: ["encouracado"] }, efeitos: [{ t: "semReducaoDeslocamentoArmadura" }] }),
    c("fintaAprimorada", "Finta Aprimorada", "+2 em Enganação para fintar e finta como ação de movimento.", { req: { pericias: ["enganacao"] } }),
    c("focoEmArma", "Foco em Arma", "+2 no ataque com a arma escolhida.", { repetivel: true, escolhas: [{ id: "arma", tipo: "arma", proficiente: true }], efeitos: [{ t: "bonus", alvo: "ataque", valor: 2, armaEscolhida: "arma" }] }),
    c("ginete", "Ginete", "Passa automaticamente em Cavalgar para não cair ao sofrer dano; sem penalidade para atacar à distância ou lançar magias montado.", { pagina: 128, req: { pericias: ["cavalgar"] } }),
    c("inexpugnavel", "Inexpugnável", "Com armadura pesada, +2 em todos os testes de resistência.", { pagina: 128, req: { poderes: ["encouracado"], nivel: 6 }, efeitos: [{ t: "bonus", alvo: "resistencias", valor: 2, auto: "armaduraPesada" }] }),
    c("miraApurada", "Mira Apurada", "Ao mirar, +2 no ataque e na margem de ameaça à distância até o fim do turno.", { pagina: 128, req: { atr: { sab: 1 }, poderes: ["disparoPreciso"] } }),
    c("piqueiro", "Piqueiro", "Uma vez por rodada, com arma alongada, inimigo entra voluntariamente no alcance: 1 PM para atacá-lo (investida: +2 dados de dano).", { pagina: 128, req: { poderes: ["estiloDeArmaLonga"] } }),
    c("presencaAterradora", "Presença Aterradora", "Ação padrão e 1 PM: assusta (Intimidação) todas as criaturas escolhidas em alcance curto.", { pagina: 128, req: { pericias: ["intimidacao"] }, acao: { custo: 1, execucao: "padrao", alcance: "curto", teste: { pericia: "intimidacao", contra: "vontade" }, condicao: { id: "abalado", duracao: "cena" } } }),
    c("proficiencia", "Proficiência", "Uma proficiência: armas marciais, armas de fogo, armaduras pesadas ou escudos (exóticas, se já tiver marciais).", { pagina: 129, repetivel: true, escolhas: [{ id: "prof", tipo: "proficiencia" }] }),
    c("quebrarAprimorado", "Quebrar Aprimorado", "+2 para quebrar; zerando os PV de uma arma, 1 PM para um ataque extra contra o usuário.", { pagina: 129, req: { poderes: ["ataquePoderoso"] }, efeitos: [{ t: "bonus", alvo: "manobra.quebrar", valor: 2 }] }),
    c("reflexosDeCombate", "Reflexos de Combate", "Ação de movimento extra no primeiro turno de cada combate.", { pagina: 129, req: { atr: { des: 1 } } }),
    c("saqueRapido", "Saque Rápido", "+2 em Iniciativa; saca e guarda itens como ação livre; recarregar armas de disparo fica uma categoria mais rápido.", { pagina: 129, req: { pericias: ["iniciativa"] }, efeitos: [{ t: "bonus", alvo: "pericia.iniciativa", valor: 2 }, { t: "recargaMaisRapida" }] }),
    c("trespassar", "Trespassar", "Reduzindo um alvo a 0 PV corpo a corpo, 1 PM para atacar outra criatura no alcance.", { pagina: 129, req: { poderes: ["ataquePoderoso"] } }),
    c("vitalidade", "Vitalidade", "+1 PV por nível de personagem e +2 em Fortitude.", { pagina: 129, req: { atr: { con: 1 } }, efeitos: [{ t: "bonus", alvo: "pv", valor: "nivel" }, { t: "bonus", alvo: "pericia.fortitude", valor: 2 }] }),

    /* ---------------- DESTINO (p. 129–131) ---------------- */
    d("acrobatico", "Acrobático", "Usa Destreza no lugar de Força em Atletismo; terreno difícil não reduz o deslocamento nem impede investidas.", { req: { atr: { des: 2 } }, efeitos: [{ t: "atrPericia", pericia: "atletismo", atributo: "des" }] }),
    d("aoSaborDoDestino", "Ao Sabor do Destino", "Abre mão de itens mágicos (exceto poções) em troca de bônus por nível: perícias, Defesa, dano e atributos (tabela p. 130). Usar item mágico voluntariamente tira os benefícios até o fim da aventura.",
      { req: { nivel: 6 }, aoSabor: [[6, "pericia", 2], [7, "defesa", 1], [8, "dano", 1], [9, "atributo", 1], [11, "pericia", 2], [12, "defesa", 2], [13, "dano", 2], [14, "atributo", 1], [16, "pericia", 2], [17, "defesa", 3], [18, "dano", 3], [19, "atributo", 1]] }),
    d("aparenciaInofensiva", "Aparência Inofensiva", "A primeira criatura inteligente que o atacar na cena faz Vontade (CD Car) ou perde a ação.", { pagina: 130, req: { atr: { car: 1 } } }),
    d("atletico", "Atlético", "+2 em Atletismo e +3m de deslocamento.", { pagina: 130, req: { atr: { "for": 2 } }, efeitos: [{ t: "bonus", alvo: "pericia.atletismo", valor: 2 }, { t: "bonus", alvo: "deslocamento", valor: 3 }] }),
    d("atraente", "Atraente", "+2 em perícias de Carisma contra quem possa se sentir atraído por você.", { pagina: 130, req: { atr: { car: 1 } }, efeitos: [{ t: "bonus", alvo: "pericias.car", valor: 2, cond: "contra quem se sente atraído" }] }),
    d("comandar", "Comandar", "Ação de movimento e 1 PM: aliados em alcance médio +1 em perícias até o fim da cena.", { pagina: 130, req: { atr: { car: 1 } }, acao: { custo: 1, execucao: "movimento", alcance: "medio", alvos: "aliados", duracao: "cena", efeitos: [{ t: "bonus", alvo: "pericias", valor: 1 }] } }),
    d("costasLargas", "Costas Largas", "+5 espaços de carga e um item vestido adicional.", { pagina: 130, req: { atr: { con: 1, "for": 1 } }, efeitos: [{ t: "bonus", alvo: "carga", valor: 5 }, { t: "bonus", alvo: "vestidos", valor: 1 }] }),
    d("focoEmPericia", "Foco em Perícia", "1 PM: rola dois dados e fica com o melhor na perícia escolhida (não Luta nem Pontaria).", { pagina: 130, repetivel: true, escolhas: [{ id: "pericia", tipo: "periciaTreinada", exceto: ["luta", "pontaria"] }], opcaoDeTeste: { id: "focoEmPericia", custo: 1, vantagem: true, escolhida: "pericia" } }),
    d("inventarioOrganizado", "Inventário Organizado", "Soma a Inteligência no limite de espaços; itens de meio espaço ocupam 1/4.", { pagina: 130, req: { atr: { "int": 1 } }, efeitos: [{ t: "bonus", alvo: "carga", valor: "atr.int" }, { t: "itensLevesQuarto" }] }),
    d("investigador", "Investigador", "+2 em Investigação e soma a Inteligência em Intuição.", { pagina: 130, req: { atr: { "int": 1 } }, efeitos: [{ t: "bonus", alvo: "pericia.investigacao", valor: 2 }, { t: "bonus", alvo: "pericia.intuicao", valor: "atr.int" }] }),
    d("loboSolitario", "Lobo Solitário", "+1 em perícias e Defesa sem aliados em alcance curto; sem penalidade por usar Cura em si mesmo.", { pagina: 130, efeitos: [{ t: "bonus", alvo: "pericias", valor: 1, cond: "sem aliados em alcance curto" }, { t: "bonus", alvo: "defesa", valor: 1, cond: "sem aliados em alcance curto" }] }),
    d("medicina", "Medicina", "Ação completa e Cura CD 15: recupera 1d6 PV, +1d6 a cada 5 acima. Uma vez por dia por criatura.", { pagina: 130, req: { atr: { sab: 1 }, pericias: ["cura"] }, acao: { custo: 0, execucao: "completa", teste: { pericia: "cura", cd: 15 }, cura: "1d6 por 5 acima" } }),
    d("parceiro", "Parceiro", "Um parceiro iniciante (animal com Adestramento, humanoide com Diplomacia) que o acompanha; perdido, outro no início da próxima aventura.", { pagina: 130, req: { periciasUm: ["adestramento", "diplomacia"], nivel: 5 }, parceiro: "parceiro" }),
    d("sentidosAgucados", "Sentidos Aguçados", "+2 em Percepção; não fica desprevenido contra quem não vê; rerrola a chance de falha por camuflagem.", { pagina: 130, req: { atr: { sab: 1 }, pericias: ["percepcao"] }, efeitos: [{ t: "bonus", alvo: "pericia.percepcao", valor: 2 }] }),
    d("sortudo", "Sortudo", "3 PM para rolar de novo um teste (uma vez por teste).", { pagina: 131, rerrolar: { custo: 3 } }),
    d("surtoHeroico", "Surto Heroico", "Uma vez por rodada, 5 PM para uma ação padrão ou de movimento adicional.", { pagina: 131 }),
    d("torcida", "Torcida", "+2 em perícias e Defesa com a torcida a seu favor.", { pagina: 131, req: { atr: { car: 1 } }, efeitos: [{ t: "bonus", alvo: "pericias", valor: 2, cond: "com torcida" }, { t: "bonus", alvo: "defesa", valor: 2, cond: "com torcida" }] }),
    d("treinamentoEmPericia", "Treinamento em Perícia", "Treinado numa perícia à escolha.", { pagina: 131, repetivel: true, escolhas: [{ id: "pericia", tipo: "pericia", efeito: { t: "treino" } }] }),
    d("veneficio", "Venefício", "Sem risco de se envenenar ao usar veneno; +2 na CD dos seus venenos.", { pagina: 131, req: { pericias: ["oficio:alquimista"] } }),
    d("vontadeDeFerro", "Vontade de Ferro", "+1 PM a cada dois níveis e +2 em Vontade.", { pagina: 131, req: { atr: { sab: 1 } }, efeitos: [{ t: "bonus", alvo: "pm", valor: "floor(nivel / 2)" }, { t: "bonus", alvo: "pericia.vontade", valor: 2 }] }),

    /* ---------------- MAGIA (p. 131) ---------------- */
    m("celebrarRitual", "Celebrar Ritual", "Lança magias como rituais: dobra o limite de PM, execução 1 hora (ou o dobro), T$ 10 por PM. Não pode armazenar em itens.", { req: { periciasUm: ["misticismo", "religiao"], nivel: 8 }, opcaoDeMagia: { id: "ritual", custo: 0, ritual: true, limiteFator: 2, custoT: 10 } }),
    m("escreverPergaminho", "Escrever Pergaminho", "Fabrica pergaminhos de magias que conhece com Ofício (escriba).", { req: { habilidadeMagias: true, pericias: ["oficio:escriba"] } }),
    m("focoEmMagia", "Foco em Magia", "Uma magia que possa lançar custa –1 PM (cumulativo).", { repetivel: true, escolhas: [{ id: "magia", tipo: "magiaConhecida" }], efeitos: [{ t: "descontoMagia", valor: 1, magiaEscolhida: "magia" }] }),
    m("magiaAcelerada", "Magia Acelerada", "Aprimoramento +4 PM: execução livre (só magias de movimento, padrão ou completa; uma por rodada).", { req: { circulo: 2 }, aprimoramento: { custo: 4, execucao: "livre", de: ["movimento", "padrao", "completa"] } }),
    m("magiaAmpliada", "Magia Ampliada", "Aprimoramento +2 PM: alcance +1 passo ou área dobrada.", { aprimoramento: { custo: 2, alcanceOuArea: true } }),
    m("magiaDiscreta", "Magia Discreta", "Aprimoramento +2 PM: sem gestos nem palavras; magia arcana de armadura sem Misticismo; notar exige Misticismo CD 20.", { aprimoramento: { custo: 2, discreta: true } }),
    m("magiaIlimitada", "Magia Ilimitada", "Soma o atributo-chave no limite de PM por magia.", { efeitos: [{ t: "limitePM", valor: "atr.chave" }] }),
    m("prepararPocao", "Preparar Poção", "Fabrica poções de 1º e 2º círculos de magias que conhece com Ofício (alquimista).", { req: { habilidadeMagias: true, pericias: ["oficio:alquimista"] } }),

    /* ---------------- CONCEDIDOS (p. 132–136) ---------------- */
    g("afinidadeComATormenta", "Afinidade com a Tormenta", ["aharadak"], "+10 em resistência contra a Tormenta, suas criaturas e devotos de Aharadak; o primeiro poder da Tormenta não conta para perda de Carisma.", { efeitos: [{ t: "bonus", alvo: "resistencias", valor: 10, cond: "contra a Tormenta" }, { t: "tormentaGratis", valor: 1 }] }),
    g("almejarOImpossivel", "Almejar o Impossível", ["thwor", "valkaria"], "Em teste de perícia, 19 ou mais no dado é sempre sucesso.", { efeitos: [{ t: "sucessoAutomatico", natural: 19, pericias: true }] }),
    g("anfibio", "Anfíbio", ["oceano"], "Respira debaixo d'água; natação igual ao deslocamento terrestre.", { efeitos: [{ t: "respiraAgua" }, { t: "deslocamento", tipo: "natacao", igualTerrestre: true }] }),
    g("apostarComOTrapaceiro", "Apostar com o Trapaceiro", ["hyninn"], "Num teste de perícia, 1 PM: você e o mestre rolam 1d20 (o dele em segredo) e você escolhe qual usar.", { opcaoDeTeste: { id: "apostar", custo: 1, apostaMestre: true } }),
    g("armasDaAmbicao", "Armas da Ambição", ["valkaria"], "+1 no ataque e na margem de ameaça com armas em que é proficiente.", { efeitos: [{ t: "bonus", alvo: "ataque", valor: 1, proficiente: true }, { t: "bonus", alvo: "margem", valor: 1, proficiente: true }] }),
    g("arsenalDasProfundezas", "Arsenal das Profundezas", ["oceano"], "+2 no dano e +1 no multiplicador com azagaias, lanças e tridentes.", { efeitos: [{ t: "bonus", alvo: "dano", valor: 2, armas: ["azagaia", "lanca", "tridente"] }, { t: "bonus", alvo: "mult", valor: 1, armas: ["azagaia", "lanca", "tridente"] }] }),
    g("astuciaDaSerpente", "Astúcia da Serpente", ["sszzaas"], "+2 em Enganação, Furtividade e Intuição.", { efeitos: [{ t: "bonus", alvo: "pericia.enganacao", valor: 2 }, { t: "bonus", alvo: "pericia.furtividade", valor: 2 }, { t: "bonus", alvo: "pericia.intuicao", valor: 2 }] }),
    g("ataquePiedoso", "Ataque Piedoso", ["lena", "thyatis"], "Dano não letal com armas corpo a corpo sem a penalidade de –5."),
    g("auraDeMedo", "Aura de Medo", ["kallyadranoch"], "2 PM: aura de 9m até o fim da cena; inimigos que entrarem fazem Vontade (CD Car) ou ficam abalados até o fim da cena (passou: imune por um dia).", { acao: { custo: 2, execucao: "livre", duracao: "cena", alcance: "raio 9m", resistencia: { pericia: "vontade", atributo: "car" }, condicao: { id: "abalado", duracao: "cena" } } }),
    g("auraDePaz", "Aura de Paz", ["marah"], "2 PM: aura em alcance curto por uma cena; inimigo que tentar ação hostil contra você faz Vontade (CD Car) ou perde a ação.", { acao: { custo: 2, execucao: "livre", duracao: "cena", alcance: "curto", resistencia: { pericia: "vontade", atributo: "car" } } }),
    g("auraRestauradora", "Aura Restauradora", ["lena"], "Curas suas e de aliados em alcance curto recuperam +1 PV por dado.", { efeitos: [{ t: "curaPorDado", valor: 1 }] }),
    g("bencaoDoMana", "Bênção do Mana", ["wynna"], "+1 PM a cada nível ímpar.", { efeitos: [{ t: "bonus", alvo: "pm", valor: "ceil(nivel / 2)" }] }),
    g("cariciaSombria", "Carícia Sombria", ["tenebra"], "1 PM e ação padrão: toque causa 2d6 de trevas (Fortitude CD Sab metade) e você recupera metade. Pode aprender Toque Vampírico como divina com –1 PM.", { acao: { custo: 1, execucao: "padrao", alcance: "toque", dano: { dados: "2d6", tipo: "trevas" }, resistencia: { pericia: "fortitude", atributo: "sab", efeito: "metade" }, drena: 0.5 } }),
    g("centelhaMagica", "Centelha Mágica", ["wynna"], "Aprende e lança uma magia arcana ou divina de 1º círculo.", { escolhas: [{ id: "magia", tipo: "magia", circulo: 1, qualquerTipo: true, quantidade: 1, efeito: { t: "magia", atributo: "sab" } }] }),
    g("compreenderOsErmos", "Compreender os Ermos", ["allihanna"], "+2 em Sobrevivência; usa Sabedoria em Adestramento.", { efeitos: [{ t: "bonus", alvo: "pericia.sobrevivencia", valor: 2 }, { t: "atrPericia", pericia: "adestramento", atributo: "sab" }] }),
    g("conhecimentoEnciclopedico", "Conhecimento Enciclopédico", ["tannaToh"], "Treinado em duas perícias de Inteligência.", { escolhas: [{ id: "pericias", tipo: "pericia", quantidade: 2, atributo: "int", efeito: { t: "treino" } }] }),
    g("conjurarArma", "Conjurar Arma", ["arsenal"], "1 PM: invoca uma arma corpo a corpo ou de arremesso em que é proficiente (+1 no ataque e dano, mágica, dura a cena) ou 20 munições.", { acao: { custo: 1, execucao: "livre", duracao: "cena", texto: "Arma conjurada: +1 no ataque e no dano, mágica." } }),
    g("coragemTotal", "Coragem Total", ["arsenal", "khalmyr", "linWu", "valkaria"], "Imune a medo, mágico ou não (não elimina fobias raciais).", { efeitos: [{ t: "imune", valor: "medo" }] }),
    g("curaGentil", "Cura Gentil", ["lena"], "Soma o Carisma aos PV das suas curas mágicas.", { efeitos: [{ t: "curaMagica", valor: "atr.car" }] }),
    g("curandeiraPerfeita", "Curandeira Perfeita", ["lena"], "Sempre pode escolher 10 em Cura; sem penalidade sem maleta; com maleta, +2 (+5 aprimorada)."),
    g("dedoVerde", "Dedo Verde", ["allihanna"], "Aprende e lança Controlar Plantas; se aprender de novo, –1 PM.", { efeitos: [{ t: "magia", id: "controlarPlantas", atributo: "sab", desconto: 1 }] }),
    g("descansoNatural", "Descanso Natural", ["allihanna"], "Dormir ao relento conta como descanso confortável.", { efeitos: [{ t: "descansoRelento", valor: "confortavel" }] }),
    g("domDaEsperanca", "Dom da Esperança", ["marah"], "Soma Sabedoria nos PV em vez de Constituição; imune a alquebrado, esmorecido e frustrado.", { efeitos: [{ t: "atrPV", atributo: "sab" }, { t: "imune", valor: "alquebrado" }, { t: "imune", valor: "esmorecido" }, { t: "imune", valor: "frustrado" }] }),
    g("domDaImortalidade", "Dom da Imortalidade", ["thyatis"], "Imortal: morto, volta à vida após 3d6 dias. Só paladinos; exclui Dom da Ressurreição.", { req: { classe: "paladino", semPoder: "domDaRessurreicao" } }),
    g("domDaProfecia", "Dom da Profecia", ["thyatis"], "Lança Augúrio (–1 PM se aprender de novo); 2 PM para +2 num teste.", { efeitos: [{ t: "magia", id: "augurio", atributo: "sab", desconto: 1 }], opcaoDeTeste: { id: "profecia", custo: 2, bonus: 2 } }),
    g("domDaRessurreicao", "Dom da Ressurreição", ["thyatis"], "Ação completa e todos os PM (mín. 1): ressuscita criatura morta há menos de um ano (1 PV, 0 PM, –1 Con permanente; uma vez por criatura). Só clérigos; exclui Dom da Imortalidade.", { req: { classe: "clerigo", semPoder: "domDaImortalidade" } }),
    g("domDaVerdade", "Dom da Verdade", ["khalmyr"], "2 PM: +5 em Intuição e em Percepção contra Enganação e Furtividade até o fim da cena.", { acao: { custo: 2, execucao: "livre", duracao: "cena", efeitos: [{ t: "bonus", alvo: "pericia.intuicao", valor: 5 }, { t: "bonus", alvo: "pericia.percepcao", valor: 5, cond: "contra Enganação e Furtividade" }] } }),
    g("escamasDraconicas", "Escamas Dracônicas", ["kallyadranoch"], "+2 na Defesa e em Fortitude.", { efeitos: [{ t: "bonus", alvo: "defesa", valor: 2 }, { t: "bonus", alvo: "pericia.fortitude", valor: 2 }] }),
    g("escudoMagico", "Escudo Mágico", ["wynna"], "Ao lançar magia, +círculo na Defesa até o início do próximo turno.", { gatilho: { evento: "lancarMagia", efeitos: [{ t: "bonus", alvo: "defesa", valor: "circuloDaMagia" }], duracao: "ate o proximo turno" } }),
    g("espadaJusticeira", "Espada Justiceira", ["khalmyr"], "1 PM: a espada (ou arma corpo a corpo de corte) tem dano +1 passo até o fim da cena.", { acao: { custo: 1, execucao: "livre", duracao: "cena", efeitos: [{ t: "passoDano", valor: 1, tipoDano: "corte", armaUnica: true }] } }),
    g("espadaSolar", "Espada Solar", ["azgher"], "1 PM: arma corpo a corpo de corte causa +1d6 de fogo até o fim da cena.", { acao: { custo: 1, execucao: "livre", duracao: "cena", efeitos: [{ t: "danoExtra", valor: "1d6", tipo: "fogo", tipoDanoArma: "corte" }] } }),
    g("extaseDaLoucura", "Êxtase da Loucura", ["aharadak", "nimb"], "Cada vez que criaturas falham em Vontade contra sua habilidade mágica, 1 PM temporário (até a Sabedoria por cena)."),
    g("familiarOfidico", "Familiar Ofídico", ["sszzaas"], "Um familiar cobra (p. 38) fora do limite de parceiros.", { efeitos: [{ t: "cdMagia", valor: 1, resistencia: "fortitude" }] }),
    g("farsaDoFingidor", "Farsa do Fingidor", ["hyninn"], "Aprende e lança Criar Ilusão; se aprender de novo, –1 PM.", { efeitos: [{ t: "magia", id: "criarIlusao", atributo: "sab", desconto: 1 }] }),
    g("feGuerreira", "Fé Guerreira", ["arsenal"], "Usa Sabedoria em Guerra; em combate, 2 PM para trocar um teste de perícia (não ataque) por Guerra.", { efeitos: [{ t: "atrPericia", pericia: "guerra", atributo: "sab" }], opcaoDeTeste: { id: "feGuerreira", custo: 2, usaPericia: "guerra", exceto: ["ataque"] } }),
    g("formaDeMacaco", "Forma de Macaco", ["hyninn"], "Ação completa e 2 PM: vira macaco Minúsculo com escalada 9m; equipamento some; termina ao atacar, lançar magia ou sofrer dano.", { acao: { custo: 2, execucao: "completa", duracao: "indefinida", efeitos: [{ t: "tamanho", valor: "minusculo" }, { t: "deslocamento", tipo: "escalada", base: 9 }] } }),
    g("fulgorSolar", "Fulgor Solar", ["azgher"], "Redução de frio e trevas 5; alvo de ataque, 1 PM para ofuscar o atacante por uma rodada.", { efeitos: [{ t: "rd", tipos: ["frio", "trevas"], valor: 5 }], reacao: { custo: 1, gatilho: "alvo de ataque", condicao: { id: "ofuscado", duracao: "1 rodada", alvo: "atacante" } } }),
    g("furiaDivina", "Fúria Divina", ["thwor"], "2 PM: +2 em ataque e dano corpo a corpo até o fim da cena, sem ações de concentração; junto da Fúria, ela também dura a cena.", { acao: { custo: 2, execucao: "livre", duracao: "cena", estado: "furiaDivina", impede: ["furtividade", "magia"], efeitos: [{ t: "bonus", alvo: "ataque.corpo", valor: 2 }, { t: "bonus", alvo: "dano.corpo", valor: 2 }] } }),
    g("golpistaDivino", "Golpista Divino", ["hyninn"], "+2 em Enganação, Jogatina e Ladinagem.", { efeitos: [{ t: "bonus", alvo: "pericia.enganacao", valor: 2 }, { t: "bonus", alvo: "pericia.jogatina", valor: 2 }, { t: "bonus", alvo: "pericia.ladinagem", valor: 2 }] }),
    g("habitanteDoDeserto", "Habitante do Deserto", ["azgher"], "Redução de fogo 10; 1 PM cria um odre de água potável.", { efeitos: [{ t: "rd", tipos: ["fogo"], valor: 10 }] }),
    g("inimigoDeTenebra", "Inimigo de Tenebra", ["azgher"], "+1d6 de dano contra mortos-vivos; efeitos de luz iluminam o dobro.", { efeitos: [{ t: "danoExtra", valor: "1d6", contraTipo: "mortoVivo" }] }),
    g("kiaiDivino", "Kiai Divino", ["linWu"], "Uma vez por rodada, ataque corpo a corpo: 3 PM; acertando, dano máximo.", { opcaoDeAtaque: { id: "kiai", custo: 3, corpo: true, danoMaximo: true } }),
    g("liberdadeDivina", "Liberdade Divina", ["valkaria"], "2 PM: imune a efeitos de movimento por uma rodada.", { acao: { custo: 2, execucao: "reacao", duracao: "rodada", efeitos: [{ t: "imune", valor: "movimento" }] } }),
    g("mantoDaPenumbra", "Manto da Penumbra", ["tenebra"], "Aprende e lança Escuridão; se aprender de novo, –1 PM.", { efeitos: [{ t: "magia", id: "escuridao", atributo: "sab", desconto: 1 }] }),
    g("menteAnalitica", "Mente Analítica", ["tannaToh"], "+2 em Intuição, Investigação e Vontade.", { efeitos: [{ t: "bonus", alvo: "pericia.intuicao", valor: 2 }, { t: "bonus", alvo: "pericia.investigacao", valor: 2 }, { t: "bonus", alvo: "pericia.vontade", valor: 2 }] }),
    g("menteVazia", "Mente Vazia", ["linWu"], "+2 em Iniciativa, Percepção e Vontade.", { efeitos: [{ t: "bonus", alvo: "pericia.iniciativa", valor: 2 }, { t: "bonus", alvo: "pericia.percepcao", valor: 2 }, { t: "bonus", alvo: "pericia.vontade", valor: 2 }] }),
    g("mestreDosMares", "Mestre dos Mares", ["oceano"], "Fala com animais aquáticos e lança Acalmar Animal só contra criaturas aquáticas (–1 PM se aprender de novo).", { efeitos: [{ t: "magia", id: "acalmarAnimal", atributo: "sab", desconto: 1, restricao: "só criaturas aquáticas" }] }),
    g("olharAmedrontador", "Olhar Amedrontador", ["megalokk", "thwor"], "Aprende e lança Amedrontar; se aprender de novo, –1 PM.", { efeitos: [{ t: "magia", id: "amedrontar", atributo: "sab", desconto: 1 }] }),
    g("palavrasDeBondade", "Palavras de Bondade", ["marah"], "Aprende e lança Enfeitiçar; se aprender de novo, –1 PM.", { efeitos: [{ t: "magia", id: "enfeiticar", atributo: "sab", desconto: 1 }] }),
    g("percepcaoTemporal", "Percepção Temporal", ["aharadak"], "3 PM: soma Sabedoria (limitada pelo nível) aos ataques, Defesa e Reflexos até o fim da cena.", { acao: { custo: 3, execucao: "livre", duracao: "cena", efeitos: [{ t: "bonus", alvo: "ataque", valor: "min(atr.sab, nivel)" }, { t: "bonus", alvo: "defesa", valor: "min(atr.sab, nivel)", atributoUnico: "sab" }, { t: "bonus", alvo: "pericia.reflexos", valor: "min(atr.sab, nivel)" }] } }),
    g("pesquisaAbencoada", "Pesquisa Abençoada", ["tannaToh"], "Uma hora pesquisando: rola de novo um teste de Int ou Sab feito desde a última cena (+2 coleção, +5 grande biblioteca)."),
    g("poderOculto", "Poder Oculto", ["nimb"], "Ação de movimento e 2 PM: 1d6 para +2 em Força (1–2), Destreza (3–4) ou Constituição (5–6) até o fim da cena (mesmo atributo não acumula).", { acao: { custo: 2, execucao: "movimento", duracao: "cena", sorteio: { dado: "1d6", faixas: [[1, 2, "for"], [3, 4, "des"], [5, 6, "con"]], efeito: { t: "bonus", valor: 2 } } } }),
    g("presasPrimordiais", "Presas Primordiais", ["kallyadranoch", "megalokk"], "1 PM: mordida (1d6, x2, perfuração) até o fim da cena, com ataque extra por 1 PM ao agredir; quem já tem mordida aumenta o dano em dois passos.", { acao: { custo: 1, execucao: "livre", duracao: "cena", efeitos: [{ t: "armaNatural", id: "presasPrimordiais", nome: "Mordida (Presas Primordiais)", dano: "1d6", margem: 20, mult: 2, tipo: "perfuracao", extra: { custo: 1, quando: "uma vez por rodada, ao agredir com outra arma" } }] } }),
    g("presasVenenosas", "Presas Venenosas", ["sszzaas"], "Ação de movimento e 1 PM: arma corpo a corpo envenenada (perda de 1d12 PV no acerto) até atingir ou o fim da cena.", { acao: { custo: 1, execucao: "movimento", duracao: "cena", danoExtra: { dados: "1d12", tipo: "perda", veneno: true, ate: "acertar" } } }),
    g("rejeicaoDivina", "Rejeição Divina", ["aharadak"], "Resistência a magia divina +5.", { efeitos: [{ t: "bonus", alvo: "resist.magiaDivina", valor: 5 }] }),
    g("repararInjustica", "Reparar Injustiça", ["khalmyr"], "Uma vez por rodada, oponente em alcance curto acerta você ou aliado: 2 PM para ele repetir o ataque e ficar com o pior.", { reacao: { custo: 2, gatilho: "oponente acerta aliado" } }),
    g("sangueDeFerro", "Sangue de Ferro", ["arsenal"], "3 PM: +2 no dano e RD 5 até o fim da cena.", { acao: { custo: 3, execucao: "livre", duracao: "cena", efeitos: [{ t: "bonus", alvo: "dano", valor: 2 }, { t: "rd", valor: 5 }] } }),
    g("sangueOfidico", "Sangue Ofídico", ["sszzaas"], "Resistência a veneno +5; +2 na CD dos seus venenos.", { efeitos: [{ t: "bonus", alvo: "resist.veneno", valor: 5 }] }),
    g("servosDoDragao", "Servos do Dragão", ["kallyadranoch"], "Ação completa e 2 PM: 2d4+1 kobolds capangas em alcance curto (For –1, Des 1, Defesa 12, 1 PV; 1d6–1 perfuração); somem ao morrer ou no fim da cena.", { acao: { custo: 2, execucao: "completa", duracao: "cena", capangas: { quantidade: "2d4+1", nome: "Kobold", for: -1, des: 1, defesa: 12, pv: 1, dano: "1d6-1", tipo: "perfuracao" } } }),
    g("soproDoMar", "Sopro do Mar", ["oceano"], "Ação padrão e 1 PM: cone de 6m, 2d6 de frio (Reflexos CD Sab metade). Pode aprender Sopro das Uivantes como divina com –1 PM.", { acao: { custo: 1, execucao: "padrao", area: "cone 6m", dano: { dados: "2d6", tipo: "frio" }, resistencia: { pericia: "reflexos", atributo: "sab", efeito: "metade" } } }),
    g("sorteDosLoucos", "Sorte dos Loucos", ["nimb"], "1 PM para rolar de novo um teste; falhando de novo, perde 1d6 PM.", { rerrolar: { custo: 1, falhaPerde: "1d6" } }),
    g("talentoArtistico", "Talento Artístico", ["marah"], "+2 em Acrobacia, Atuação e Diplomacia.", { efeitos: [{ t: "bonus", alvo: "pericia.acrobacia", valor: 2 }, { t: "bonus", alvo: "pericia.atuacao", valor: 2 }, { t: "bonus", alvo: "pericia.diplomacia", valor: 2 }] }),
    g("teurgistaMistico", "Teurgista Místico", ["wynna"], "Uma magia de cada círculo aprendida pode ser do outro tipo (divina para arcanos, arcana para divinos).", { req: { habilidadeMagias: true }, efeitos: [{ t: "teurgista" }] }),
    g("tradicaoDeLinWu", "Tradição de Lin-Wu", ["linWu"], "Katana é arma simples; com proficiência marcial, +1 na margem com ela.", { efeitos: [{ t: "armaSimples", armas: ["katana"] }, { t: "bonus", alvo: "margem", valor: 1, armas: ["katana"], se: "prof.marciais" }] }),
    g("transmissaoDaLoucura", "Transmissão da Loucura", ["nimb"], "Lança Sussurros Insanos (CD Car); se aprender de novo, –1 PM.", { efeitos: [{ t: "magia", id: "sussurrosInsanos", atributo: "car", desconto: 1 }] }),
    g("tropasDuyshidakk", "Tropas Duyshidakk", ["thwor"], "Ação completa e 2 PM: 1d4+1 goblinoides capangas em alcance curto (For 1, Des 1, Defesa 15, 1 PV; 1d6+1 corte); somem ao morrer ou no fim da cena.", { acao: { custo: 2, execucao: "completa", duracao: "cena", capangas: { quantidade: "1d4+1", nome: "Goblinoide", for: 1, des: 1, defesa: 15, pv: 1, dano: "1d6+1", tipo: "corte" } } }),
    g("urroDivino", "Urro Divino", ["megalokk"], "Ao atacar ou lançar magia, 1 PM para somar a Constituição (mín. +1) ao dano.", { opcaoDeAtaque: { id: "urroDivino", custo: 1, dano: "max(1, atr.con)" }, opcaoDeMagia: { id: "urroDivino", custo: 1, dano: "max(1, atr.con)" } }),
    g("visaoNasTrevas", "Visão nas Trevas", ["tenebra"], "Enxerga perfeitamente no escuro, mesmo mágico.", { efeitos: [{ t: "sentido", valor: "visaoNasTrevas" }] }),
    g("vozDaCivilizacao", "Voz da Civilização", ["tannaToh"], "Sempre sob efeito de Compreensão.", { efeitos: [{ t: "efeitoPermanente", magia: "compreensao" }] }),
    g("vozDaNatureza", "Voz da Natureza", ["allihanna"], "Fala com animais e lança Acalmar Animal só contra animais (–1 PM se aprender de novo).", { efeitos: [{ t: "falaComAnimais" }, { t: "magia", id: "acalmarAnimal", atributo: "sab", desconto: 1, restricao: "só animais" }] }),
    g("vozDosMonstros", "Voz dos Monstros", ["megalokk"], "Conhece os idiomas dos monstros inteligentes e fala com monstros não inteligentes."),
    g("zumbificar", "Zumbificar", ["tenebra"], "Ação completa e 3 PM: reanima um cadáver Pequeno ou Médio adjacente por um dia como parceiro iniciante (combatente, fortão ou guardião); pode sacrificá-lo para sofrer metade do dano.", { acao: { custo: 3, execucao: "completa", duracao: "dia", parceiro: { nivel: "iniciante", tipos: ["combatente", "fortao", "guardiao"] } } }),

    /* ---------------- TORMENTA (p. 136–137) ---------------- */
    t("anatomiaInsana", "Anatomia Insana", "25% (1 em 1d4) de ignorar o dano extra de crítico ou furtivo; +25% a cada dois outros poderes da Tormenta.", { escala: "min(100, 25 + 25 * floor(pto / 2))" }),
    t("antenas", "Antenas", "+1 em Iniciativa, Percepção e Vontade; +1 a cada dois outros poderes da Tormenta.", { efeitos: ["iniciativa", "percepcao", "vontade"].map(function (k) { return { t: "bonus", alvo: "pericia." + k, valor: "1 + floor(pto / 2)" }; }) }),
    t("armamentoAberrante", "Armamento Aberrante", "Ação de movimento e 1 PM: arma orgânica corpo a corpo ou de arremesso em que é proficiente, dano +1 passo a cada dois outros poderes; dura a cena.", { req: { tormenta: 1 }, acao: { custo: 1, execucao: "movimento", duracao: "cena", efeitos: [{ t: "passoDano", valor: "floor(pto / 2)", armaUnica: true }] } }),
    t("articulacoesFlexiveis", "Articulações Flexíveis", "+1 em Acrobacia, Furtividade e Reflexos; +1 a cada dois outros poderes da Tormenta.", { efeitos: ["acrobacia", "furtividade", "reflexos"].map(function (k) { return { t: "bonus", alvo: "pericia." + k, valor: "1 + floor(pto / 2)" }; }) }),
    t("asasInsetoides", "Asas Insetoides", "1 PM: voo 9m até o fim do turno (+1,5m por outro poder da Tormenta).", { req: { tormenta: 4 }, acao: { custo: 1, execucao: "livre", duracao: "turno", efeitos: [{ t: "deslocamento", tipo: "voo", base: "9 + 1.5 * pto" }] } }),
    t("carapaca", "Carapaça", "+1 na Defesa; +1 a cada dois outros poderes da Tormenta.", { efeitos: [{ t: "bonus", alvo: "defesa", valor: "1 + floor(pto / 2)" }] }),
    t("corpoAberrante", "Corpo Aberrante", "Dano desarmado +1 passo, +1 a cada quatro outros poderes da Tormenta.", { req: { tormenta: 1 }, efeitos: [{ t: "passoDano", valor: "1 + floor(pto / 4)", desarmado: true }] }),
    t("cuspirEnxame", "Cuspir Enxame", "Ação completa e 2 PM: enxame Médio sustentado em alcance curto (move 9m com ação de movimento; 2d6 de ácido no fim do turno em quem estiver nele); +1 PM por +1d6 a cada dois outros poderes.", { acao: { custo: 2, execucao: "completa", sustentada: true, alcance: "curto", escala: { pm: 1, max: "floor(pto / 2)", rotulo: "+1d6" }, dano: { dados: "(2 + x)d6", tipo: "acido" } } }),
    t("dentesAfiados", "Dentes Afiados", "Mordida (1d4, x2, corte); ao agredir com outra arma, 1 PM para um ataque extra com ela.", { efeitos: [{ t: "armaNatural", id: "dentesAfiados", nome: "Mordida (Dentes Afiados)", dano: "1d4", margem: 20, mult: 2, tipo: "corte", extra: { custo: 1, quando: "uma vez por rodada, ao agredir com outra arma" } }] }),
    t("desprezarARealidade", "Desprezar a Realidade", "2 PM: até o próximo turno, ignora terreno difícil e 20% de falha em efeitos contra você (+5% a cada dois outros poderes, máx. 50%).", { req: { tormenta: 4 }, acao: { custo: 2, execucao: "livre", duracao: "ate o proximo turno", texto: "Chance de falha contra você: min(50, 20 + 5 por dois outros poderes)%" } }),
    t("empunhaduraRubra", "Empunhadura Rubra", "1 PM: +1 em Luta até o fim da cena (+1 a cada dois outros poderes).", { acao: { custo: 1, execucao: "livre", duracao: "cena", efeitos: [{ t: "bonus", alvo: "pericia.luta", valor: "1 + floor(pto / 2)" }] } }),
    t("fomeDeMana", "Fome de Mana", "Passar em resistência contra habilidade mágica dá 1 PM temporário (até o número de poderes da Tormenta por cena)."),
    t("larvaExplosiva", "Larva Explosiva", "Criatura ferida pela sua mordida na cena que chegar a 0 PV explode: 4d4 de ácido nos adjacentes (+2d4 a cada dois outros poderes); você é imune.", { req: { poderes: ["dentesAfiados"] } }),
    t("legiaoAberrante", "Legião Aberrante", "Massa de insetos: passa por espaços de uma moeda (terreno difícil); +1 contra manobras e em resistência contra efeitos de alvo; +1 a cada dois outros poderes.", { req: { poderes: ["anatomiaInsana"], tormenta: 3 } }),
    t("maosMembranosas", "Mãos Membranosas", "+1 em Atletismo, Fortitude e agarrar; +1 a cada dois outros poderes.", { efeitos: [{ t: "bonus", alvo: "pericia.atletismo", valor: "1 + floor(pto / 2)" }, { t: "bonus", alvo: "pericia.fortitude", valor: "1 + floor(pto / 2)" }, { t: "bonus", alvo: "manobra.agarrar", valor: "1 + floor(pto / 2)" }] }),
    t("membrosEstendidos", "Membros Estendidos", "Alcance natural +1,5m (+1,5m a cada quatro outros poderes).", { efeitos: [{ t: "alcanceNatural", valor: "1.5 * (1 + floor(pto / 4))" }] }),
    t("membrosExtras", "Membros Extras", "Duas patas insetoides (1d4, x2, corte): ao agredir com outra arma, 2 PM para um ataque extra com cada; com Ambidestria ou Estilo de Duas Armas, empunham armas leves.", { req: { tormenta: 4 } }),
    t("menteAberrante", "Mente Aberrante", "Resistência a efeitos mentais +1; quem o força a Vontade sofre 1d6 psíquico; ambos +1/+1d6 a cada dois outros poderes.", { efeitos: [{ t: "bonus", alvo: "resist.mental", valor: "1 + floor(pto / 2)" }] }),
    t("olhosVermelhos", "Olhos Vermelhos", "Visão no escuro e +1 em Intimidação (+1 a cada dois outros poderes).", { efeitos: [{ t: "sentido", valor: "visaoNoEscuro" }, { t: "bonus", alvo: "pericia.intimidacao", valor: "1 + floor(pto / 2)" }] }),
    t("peleCorrompida", "Pele Corrompida", "Redução de ácido, eletricidade, fogo, frio, luz e trevas 2 (+2 a cada dois outros poderes).", { efeitos: [{ t: "rd", tipos: ["acido", "eletricidade", "fogo", "frio", "luz", "trevas"], valor: "2 + 2 * floor(pto / 2)" }] }),
    t("sangueAcido", "Sangue Ácido", "Atacante corpo a corpo que o fere sofre 1 de ácido por poder da Tormenta."),
    t("viscoRubro", "Visco Rubro", "1 PM: +1 no dano corpo a corpo até o fim da cena (+1 a cada dois outros poderes).", { acao: { custo: 1, execucao: "livre", duracao: "cena", efeitos: [{ t: "bonus", alvo: "dano.corpo", valor: "1 + floor(pto / 2)" }] } }),
  ];

  var PODER = {};
  PODERES.forEach(function (x) { PODER[x.id] = x; });

  /* Perda de Carisma (p. 136): –1 pelo primeiro e –1 a cada dois
     outros. `gratis` são os que não contam (Afinidade com a Tormenta,
     bônus de Deformidade, heranças da Linhagem Rubra). */
  function perdaDeCarisma(total, gratis) {
    var n = Math.max(0, total - (gratis || 0));
    return n <= 0 ? 0 : 1 + Math.floor((n - 1) / 2);
  }

  global.RAMATormenta20Poderes = { PODERES: PODERES, PODER: PODER, perdaDeCarisma: perdaDeCarisma, GRUPOS: { combate: "Combate", destino: "Destino", magia: "Magia", concedido: "Concedidos", tormenta: "Tormenta" } };
})(typeof window !== "undefined" ? window : globalThis);
/* <<< js/tormenta20/poderes.js */

/* >>> js/tormenta20/equipamento.js */
/* =====================================================================
   R.A.M.A. — Tormenta20 · equipamento (p. 138–167)
   ---------------------------------------------------------------------
   Preços em T$ (TC = 0,1 T$; TO = 10 T$). Carga em espaços (p. 141):
   10 + 2 por Força (–1 por Força negativa); acima, sobrecarregado
   (penalidade de armadura –5, deslocamento –3m); máximo o dobro.
   Até quatro itens vestidos com benefício; dois empunhados.
   ===================================================================== */

(function (global) {
  "use strict";

  /* ---------- dinheiro (p. 140) ---------- */
  var DINHEIRO_INICIAL = { 1: "4d6", 2: 300, 3: 600, 4: 1000, 5: 2000, 6: 3000, 7: 5000, 8: 7000, 9: 10000, 10: 13000, 11: 19000, 12: 27000, 13: 36000, 14: 49000, 15: 66000, 16: 88000, 17: 110000, 18: 150000, 19: 200000, 20: 260000 };
  var MOEDAS = { tc: 0.1, ts: 1, to: 10 };
  var VENDA = 0.5;
  var ITENS_INICIAIS = { pagina: 140, sempre: ["mochila", "sacoDeDormir", "trajeDeViajante"], dinheiro: "4d6",
    resumo: "Mochila, saco de dormir, traje de viajante; uma arma simples (e uma marcial, se proficiente); armadura de couro, couro batido ou gibão de peles (brunea, se proficiente em pesadas; escudo leve, se proficiente em escudos; arcanistas sem armadura); T$ 4d6." };

  /* ---------- passos de dano (Tabela 3-2, p. 143) ---------- */
  var PASSOS = [
    ["1", "1d2", "1d3", "1d4", "1d6", "1d8"],
    ["1d2", "1d3", "1d4", "1d6", "1d8", "1d10"],
    ["1d3", "1d4", "1d6", "1d8", "1d10", "1d12"],
    ["1d4", "1d6", "1d8|2d4", "1d10", "1d12", "3d6"],
    ["1d6", "1d8", "1d10", "1d12", "3d6", "4d6"],
    ["1d8", "1d10", "1d12|2d6|3d4", "3d6", "4d6", "4d8"],
    ["1d10", "2d6", "2d8", "3d8", "4d8", "4d10"],
    ["2d6", "2d8", "2d10", "3d10", "4d10", "4d12"],
  ];
  var NORMAL = 2;
  function naCelula(celula, dano) { return celula.split("|").indexOf(dano) >= 0; }
  function primeiraDa(celula) { return celula.split("|")[0]; }
  /* Um passo de cada vez: a linha onde o dano é o "normal"; senão,
     qualquer linha em que ele apareça e haja para onde andar. */
  function umPasso(dano, sentido) {
    var r, c;
    for (r = 0; r < PASSOS.length; r++) if (naCelula(PASSOS[r][NORMAL], dano)) return primeiraDa(PASSOS[r][NORMAL + sentido]);
    for (r = 0; r < PASSOS.length; r++) for (c = 0; c < PASSOS[r].length; c++) {
      if (naCelula(PASSOS[r][c], dano) && PASSOS[r][c + sentido]) return primeiraDa(PASSOS[r][c + sentido]);
    }
    return dano;
  }
  function passoDeDano(dano, n) {
    var d = String(dano || "").trim();
    var k = Math.round(Number(n) || 0);
    while (k > 0) { d = umPasso(d, 1); k--; }
    while (k < 0) { d = umPasso(d, -1); k++; }
    return d;
  }

  /* ---------- armas (Tabela 3-3, p. 144–151) ---------- */
  function a(id, nome, prof, prop, emp, preco, dano, margem, mult, alcance, tipo, espacos, extra) {
    return Object.assign({ id: id, nome: nome, categoria: "arma", proficiencia: prof, proposito: prop, empunhadura: emp, preco: preco, dano: dano, margem: margem, mult: mult, alcance: alcance, tipo: tipo, espacos: espacos, habilidades: [], pagina: 144 }, extra || {});
  }
  var ARMAS = [
    a("adaga", "Adaga", "simples", "corpo", "leve", 2, "1d4", 19, 2, "curto", "P", 1, { arremesso: true, usaDesAtaque: true, ocultar: 5, grupos: ["faca"] }),
    a("espadaCurta", "Espada curta", "simples", "corpo", "leve", 10, "1d6", 19, 2, null, "P", 1, { grupos: ["espada"] }),
    a("foice", "Foice", "simples", "corpo", "leve", 4, "1d6", 20, 3, null, "C", 1),
    a("clava", "Clava", "simples", "corpo", "umaMao", 0, "1d6", 20, 2, null, "I", 1, { madeira: true }),
    a("lanca", "Lança", "simples", "corpo", "umaMao", 2, "1d6", 20, 2, "curto", "P", 1, { arremesso: true, madeira: true }),
    a("maca", "Maça", "simples", "corpo", "umaMao", 12, "1d8", 20, 2, null, "I", 1),
    a("bordao", "Bordão", "simples", "corpo", "duasMaos", 0, "1d6/1d6", 20, 2, null, "I", 2, { habilidades: ["dupla"], madeira: true }),
    a("pique", "Pique", "simples", "corpo", "duasMaos", 2, "1d8", 20, 2, null, "P", 2, { habilidades: ["alongada"], madeira: true }),
    a("tacape", "Tacape", "simples", "corpo", "duasMaos", 0, "1d10", 20, 2, null, "I", 2, { madeira: true }),
    a("azagaia", "Azagaia", "simples", "distancia", "umaMao", 1, "1d6", 20, 2, "medio", "P", 1, { arremesso: true, corpoPenalidade: -5 }),
    a("bestaLeve", "Besta leve", "simples", "distancia", "umaMao", 35, "1d8", 19, 2, "medio", "P", 1, { disparo: true, municao: "virotes", recarga: "movimento" }),
    a("funda", "Funda", "simples", "distancia", "umaMao", 0, "1d4", 20, 2, "medio", "I", 1, { disparo: true, municao: "pedras", recarga: "movimento", somaFor: true, semMunicaoPassos: -1 }),
    a("arcoCurto", "Arco curto", "simples", "distancia", "duasMaos", 30, "1d6", 20, 3, "medio", "P", 2, { disparo: true, municao: "flechas", recarga: "livre", montado: true, madeira: true, grupos: ["arco"] }),
    a("machadinha", "Machadinha", "marcial", "corpo", "leve", 6, "1d6", 20, 3, "curto", "C", 1, { arremesso: true, grupos: ["machado"] }),
    a("cimitarra", "Cimitarra", "marcial", "corpo", "umaMao", 15, "1d6", 18, 2, null, "C", 1, { habilidades: ["agil"], grupos: ["espada"] }),
    a("espadaLonga", "Espada longa", "marcial", "corpo", "umaMao", 15, "1d8", 19, 2, null, "C", 1, { grupos: ["espada"] }),
    a("florete", "Florete", "marcial", "corpo", "umaMao", 20, "1d6", 18, 2, null, "P", 1, { habilidades: ["agil"], grupos: ["espada"] }),
    a("machadoDeBatalha", "Machado de batalha", "marcial", "corpo", "umaMao", 10, "1d8", 20, 3, null, "C", 1, { grupos: ["machado"] }),
    a("mangual", "Mangual", "marcial", "corpo", "umaMao", 8, "1d8", 20, 2, null, "I", 1, { habilidades: ["versatil"], manobras: { desarmar: 2 } }),
    a("marteloDeGuerra", "Martelo de guerra", "marcial", "corpo", "umaMao", 12, "1d8", 20, 3, null, "I", 1, { grupos: ["martelo"] }),
    a("picareta", "Picareta", "marcial", "corpo", "umaMao", 8, "1d6", 20, 4, null, "P", 1, { grupos: ["picareta"] }),
    a("tridente", "Tridente", "marcial", "corpo", "umaMao", 15, "1d8", 20, 2, "curto", "P", 1, { arremesso: true, habilidades: ["versatil"], manobras: { derrubar: 2 } }),
    a("alabarda", "Alabarda", "marcial", "corpo", "duasMaos", 10, "1d10", 20, 3, null, "C/P", 2, { habilidades: ["alongada"], grupos: ["machado"] }),
    a("alfange", "Alfange", "marcial", "corpo", "duasMaos", 75, "2d4", 18, 2, null, "C", 2, { grupos: ["espada"] }),
    a("gadanho", "Gadanho", "marcial", "corpo", "duasMaos", 18, "2d4", 20, 4, null, "C", 2),
    a("lancaMontada", "Lança montada", "marcial", "corpo", "duasMaos", 10, "1d8", 20, 3, null, "P", 2, { habilidades: ["alongada"], montadaUmaMao: true, investidaMontada: "2d8" }),
    a("machadoDeGuerra", "Machado de guerra", "marcial", "corpo", "duasMaos", 20, "1d12", 20, 3, null, "C", 2, { grupos: ["machado"] }),
    a("marreta", "Marreta", "marcial", "corpo", "duasMaos", 20, "3d4", 20, 2, null, "I", 2, { grupos: ["marreta"] }),
    a("montante", "Montante", "marcial", "corpo", "duasMaos", 50, "2d6", 19, 2, null, "C", 2, { grupos: ["espada"] }),
    a("arcoLongo", "Arco longo", "marcial", "distancia", "duasMaos", 100, "1d8", 20, 3, "medio", "P", 2, { disparo: true, municao: "flechas", recarga: "livre", somaFor: true, naoMontado: true, madeira: true, grupos: ["arco"] }),
    a("bestaPesada", "Besta pesada", "marcial", "distancia", "duasMaos", 50, "1d12", 19, 2, "medio", "P", 2, { disparo: true, municao: "virotes", recarga: "padrao" }),
    a("chicote", "Chicote", "exotica", "corpo", "umaMao", 2, "1d3", 20, 2, null, "C", 1, { alcanceCorpo: 4.5, habilidades: ["agil", "versatil"], manobras: { derrubar: 2, desarmar: 2 } }),
    a("espadaBastarda", "Espada bastarda", "exotica", "corpo", "umaMao", 35, "1d10/1d12", 19, 2, null, "C", 1, { habilidades: ["adaptavel"], marcialDuasMaos: true, grupos: ["espada"] }),
    a("katana", "Katana", "exotica", "corpo", "umaMao", 100, "1d8/1d10", 19, 2, null, "C", 1, { habilidades: ["adaptavel", "agil"], marcialDuasMaos: true, grupos: ["espada"] }),
    a("machadoAnao", "Machado anão", "exotica", "corpo", "umaMao", 30, "1d10", 20, 3, null, "C", 1, { marcialDuasMaos: true, grupos: ["machado"] }),
    a("correnteDeEspinhos", "Corrente de espinhos", "exotica", "corpo", "duasMaos", 25, "2d4/2d4", 19, 2, null, "C", 2, { alcanceCorpo: 4.5, habilidades: ["agil", "dupla", "versatil"], manobras: { derrubar: 2, desarmar: 2 } }),
    a("machadoTaurico", "Machado táurico", "exotica", "corpo", "duasMaos", 50, "2d8", 20, 3, null, "C", 2, { habilidades: ["desbalanceada"], grupos: ["machado"] }),
    a("rede", "Rede", "exotica", "distancia", "umaMao", 20, null, null, null, "curto", null, 1, { enreda: true, pv: 5, resumo: "Acerto não causa dano: a vítima fica enredada; segurando a corda, Força oposta para contê-la. Soltar: ação completa e Força ou Acrobacia CD 20." }),
    a("pistola", "Pistola", "fogo", "distancia", "leve", 250, "2d6", 19, 3, "curto", "P", 1, { disparo: true, municao: "balas", recarga: "padrao" }),
    a("mosquete", "Mosquete", "fogo", "distancia", "duasMaos", 500, "2d8", 19, 3, "medio", "P", 2, { disparo: true, municao: "balas", recarga: "padrao" }),
  ];
  var MUNICOES = [
    { id: "balas", nome: "Balas (20)", categoria: "municao", preco: 20, espacos: 1, quantidade: 20, pagina: 151 },
    { id: "flechas", nome: "Flechas (20)", categoria: "municao", preco: 1, espacos: 1, quantidade: 20, pagina: 151 },
    { id: "pedras", nome: "Pedras (20)", categoria: "municao", preco: 0.5, espacos: 1, quantidade: 20, pagina: 151 },
    { id: "virotes", nome: "Virotes (20)", categoria: "municao", preco: 2, espacos: 1, quantidade: 20, pagina: 151 },
  ];
  var DESARMADO = { id: "desarmado", nome: "Ataque desarmado", categoria: "arma", proficiencia: "simples", proposito: "corpo", empunhadura: "leve", dano: "1d3", margem: 20, mult: 2, tipo: "I", naoLetal: true, natural: true, pagina: 143 };
  var IMPROVISADA = { id: "improvisada", nome: "Arma improvisada", categoria: "arma", proficiencia: "simples", proposito: "corpo", empunhadura: "umaMao", dano: "1d6", margem: 20, mult: 2, tipo: "I", ataque: -2, pagina: 147 };
  var ALCANCES = { curto: 9, medio: 30, longo: 90 };

  /* ---------- armaduras e escudos (Tabela 3-5, p. 152–154) ---------- */
  function ar(id, nome, tipo, preco, defesa, penalidade, espacos, extra) {
    return Object.assign({ id: id, nome: nome, categoria: tipo === "escudo" ? "escudo" : "armadura", tipoArmadura: tipo, preco: preco, defesa: defesa, penalidade: penalidade, espacos: espacos, pagina: 153 }, extra || {});
  }
  var ARMADURAS = [
    ar("acolchoada", "Armadura acolchoada", "leve", 5, 1, 0, 2, { efeitos: [{ t: "bonus", alvo: "pericia.fortitude", valor: 2, categoria: "item" }], naoMetal: true }),
    ar("couro", "Armadura de couro", "leve", 20, 2, 0, 2, { naoMetal: true }),
    ar("couroBatido", "Couro batido", "leve", 35, 3, -1, 2),
    ar("gibaoDePeles", "Gibão de peles", "leve", 25, 4, -3, 2, { naoMetal: true }),
    ar("couraca", "Couraça", "leve", 500, 5, -4, 2),
    ar("brunea", "Brunea", "pesada", 50, 5, -2, 5),
    ar("cotaDeMalha", "Cota de malha", "pesada", 150, 6, -2, 5),
    ar("lorigaSegmentada", "Loriga segmentada", "pesada", 250, 7, -3, 5),
    ar("meiaArmadura", "Meia armadura", "pesada", 600, 8, -4, 5),
    ar("armaduraCompleta", "Armadura completa", "pesada", 3000, 10, -5, 5, { ajusteUsuario: 200 }),
    ar("escudoLeve", "Escudo leve", "escudo", 5, 1, -1, 1, { ataque: { dano: "1d4", mult: 2, tipo: "I" }, maoSemArma: true, madeira: true }),
    ar("escudoPesado", "Escudo pesado", "escudo", 15, 2, -2, 2, { ataque: { dano: "1d6", mult: 2, tipo: "I" } }),
  ];
  var REGRAS_ARMADURA = {
    pericias: ["acrobacia", "furtividade", "ladinagem"], natacao: "atletismo",
    pesada: { semDes: true, deslocamento: -3, vestir: "cinco minutos", dormir: "fatigado" }, leve: { vestir: "completa" }, escudo: { vestir: "movimento" },
    naoProficiente: "aplica a penalidade em todas as perícias de Força e Destreza",
  };

  /* ---------- itens gerais (Tabela 3-6, p. 155–163) ---------- */
  function it(id, nome, cat, preco, espacos, extra) { return Object.assign({ id: id, nome: nome, categoria: cat, preco: preco, espacos: espacos }, extra || {}); }
  function bonus(pericia, valor, cond) { return [{ t: "bonus", alvo: "pericia." + pericia, valor: valor, categoria: "item", cond: cond }]; }
  var ITENS = [
    /* equipamento de aventura (CD 15) */
    it("aguaBenta", "Água benta", "aventura", 10, 0.5, { pagina: 155, uso: { execucao: "padrao", alcance: "curto", alvo: "morto-vivo, demônio ou diabo", dano: { dados: "2d10", tipo: "luz" }, resistencia: { pericia: "reflexos", atributo: "sab", efeito: "metade" }, consumivel: true } }),
    it("algemas", "Algemas", "aventura", 15, 1, { pagina: 155, resumo: "Prender exige agarrar e vencer novo agarrar. Pulsos presos: –5 em testes com as mãos e impede conjuração. Escapar: ação completa, Acrobacia 30 ou Força 25." }),
    it("arpeu", "Arpéu", "aventura", 5, 1, { pagina: 155, resumo: "Prender: Pontaria CD 15. Subir com corda: +5 em Atletismo." }),
    it("bandoleiraDePocoes", "Bandoleira de poções", "aventura", 20, 1, { pagina: 155, vestido: true, resumo: "Saca alquímicos e poções como ação livre." }),
    it("barraca", "Barraca", "aventura", 10, 1, { pagina: 155, efeitos: bonus("sobrevivencia", 2, "para acampar"), resumo: "Saco de dormir para duas pessoas." }),
    it("corda", "Corda (10m)", "aventura", 1, 1, { pagina: 155, efeitos: bonus("atletismo", 5, "descendo buraco ou muro com a corda") }),
    it("espelho", "Espelho", "aventura", 10, 1, { pagina: 155 }),
    it("lampiao", "Lampião", "aventura", 7, 1, { pagina: 155, resumo: "Acender: ação padrão; ilumina 15m de raio por uma cena por carga de óleo." }),
    it("mochila", "Mochila", "aventura", 2, 0, { pagina: 155 }),
    it("mochilaDeAventureiro", "Mochila de aventureiro", "aventura", 50, 0, { pagina: 155, vestido: true, efeitos: [{ t: "bonus", alvo: "carga", valor: 2, categoria: "item" }] }),
    it("oleo", "Óleo", "aventura", 0.1, 0.5, { pagina: 155, uso: { execucao: "padrao", alcance: "curto", texto: "Se o alvo sofrer dano de fogo até o fim do seu próximo turno, +1d6 e fica em chamas.", consumivel: true } }),
    it("organizadorDePergaminhos", "Organizador de pergaminhos", "aventura", 25, 1, { pagina: 155, vestido: true, resumo: "Saca pergaminhos como ação livre." }),
    it("peDeCabra", "Pé de cabra", "aventura", 2, 1, { pagina: 155, comoArma: "clava", resumo: "+5 em Força para abrir portas, janelas e baús." }),
    it("sacoDeDormir", "Saco de dormir", "aventura", 1, 1, { pagina: 155 }),
    it("simboloSagrado", "Símbolo sagrado", "aventura", 5, 1, { pagina: 157, vestido: true, efeitos: [{ t: "bonus", alvo: "resistencias", valor: 1, categoria: "item", cond: "símbolo do seu deus" }] }),
    it("tocha", "Tocha", "aventura", 0.1, 1, { pagina: 157, comoArma: { dano: "1d4", extra: "1 de fogo", mult: 2, tipo: "I", empunhadura: "leve" }, resumo: "Acender: ação padrão; ilumina 9m por uma cena." }),
    it("varaDeMadeira", "Vara de madeira (3m)", "aventura", 0.2, 1, { pagina: 157 }),
    /* ferramentas (CD 20) */
    it("alaudeElfico", "Alaúde élfico", "ferramenta", 300, 1, { pagina: 158, instrumento: true, resumo: "Empunhado: Inspiração como ação de movimento." }),
    it("colecaoDeLivros", "Coleção de livros", "ferramenta", 75, 1, { pagina: 158, escolhaBonus: ["conhecimento", "guerra", "misticismo", "nobreza", "religiao"], valor: 1 }),
    it("equipamentoDeViagem", "Equipamento de viagem", "ferramenta", 10, 1, { pagina: 158, ferramentaDe: { pericia: "sobrevivencia", uso: "acampar" } }),
    it("estojoDeDisfarces", "Estojo de disfarces", "ferramenta", 50, 1, { pagina: 158, ferramentaDe: { pericia: "enganacao", uso: "disfarce" } }),
    it("flautaMistica", "Flauta mística", "ferramenta", 150, 1, { pagina: 158, instrumento: true, resumo: "Bardo empunhando: +1 na CD das magias." }),
    it("gazua", "Gazua", "ferramenta", 5, 1, { pagina: 158, ferramentaDe: { pericia: "ladinagem", uso: "abrir fechadura" } }),
    it("instrumentosDeOficio", "Instrumentos de ofício", "ferramenta", 30, 1, { pagina: 158, escolhaOficio: true, ferramentaDe: { pericia: "oficio" } }),
    it("instrumentoMusical", "Instrumento musical", "ferramenta", 35, 1, { pagina: 158, instrumento: true }),
    it("luneta", "Luneta", "ferramenta", 100, 1, { pagina: 158, efeitos: bonus("percepcao", 5, "observando em alcance longo ou além") }),
    it("maletaDeMedicamentos", "Maleta de medicamentos", "ferramenta", 50, 1, { pagina: 158, ferramentaDe: { pericia: "cura" } }),
    it("sela", "Sela", "ferramenta", 20, 1, { pagina: 158, ferramentaDe: { pericia: "cavalgar" } }),
    it("tamborDasProfundezas", "Tambor das profundezas", "ferramenta", 80, 1, { pagina: 158, instrumento: true, resumo: "Empunhado: alcance da Inspiração e das Músicas dobrado." }),
    /* vestuário (CD 20; vestido) */
    it("andrajosDeAldeao", "Andrajos de aldeão", "vestuario", 1, 1, { pagina: 159, vestido: true, efeitos: bonus("investigacao", 2, "para interrogar"), resumo: "–2 em perícias de Carisma com quem se importa com classe social." }),
    it("bandana", "Bandana", "vestuario", 5, 1, { pagina: 159, vestido: true, efeitos: bonus("intimidacao", 1) }),
    it("botasReforcadas", "Botas reforçadas", "vestuario", 20, 1, { pagina: 159, vestido: true, resumo: "+1,5m no deslocamento reduzido por terreno difícil." }),
    it("camisaBufante", "Camisa bufante", "vestuario", 25, 1, { pagina: 159, vestido: true, efeitos: bonus("atuacao", 1) }),
    it("capaEsvoacante", "Capa esvoaçante", "vestuario", 25, 1, { pagina: 159, vestido: true, efeitos: bonus("enganacao", 1) }),
    it("capaPesada", "Capa pesada", "vestuario", 15, 1, { pagina: 159, vestido: true, efeitos: bonus("fortitude", 1) }),
    it("casacoLongo", "Casaco longo", "vestuario", 20, 1, { pagina: 159, vestido: true, efeitos: bonus("fortitude", 5, "contra frio").concat([{ t: "bonus", alvo: "penalidadeArmadura", valor: -2, categoria: "item" }]) }),
    it("chapeuArcano", "Chapéu arcano", "vestuario", 50, 1, { pagina: 159, vestido: true, efeitos: [{ t: "bonus", alvo: "pm", valor: 1, categoria: "item", se: "tem.caminho" }] }),
    it("enfeiteDeElmo", "Enfeite de elmo", "vestuario", 15, 1, { pagina: 159, vestido: true, efeitos: [{ t: "bonus", alvo: "resist.medo", valor: 2, categoria: "item" }] }),
    it("farraposDeErmitao", "Farrapos de ermitão", "vestuario", 1, 1, { pagina: 159, vestido: true, efeitos: bonus("adestramento", 2).concat(bonus("diplomacia", -2)) }),
    it("gorroDeErvas", "Gorro de ervas", "vestuario", 75, 1, { pagina: 159, vestido: true, efeitos: bonus("vontade", 1) }),
    it("luvaDePelica", "Luva de pelica", "vestuario", 5, 1, { pagina: 159, vestido: true, efeitos: bonus("ladinagem", 1) }),
    it("manopla", "Manopla", "vestuario", 10, 1, { pagina: 159, vestido: true, desarmadoLetal: true, recebeMelhoriasDeArma: true }),
    it("mantoCamuflado", "Manto camuflado", "vestuario", 12, 1, { pagina: 159, vestido: true, escolhaTerreno: true, efeitos: bonus("furtividade", 2, "no terreno do manto") }),
    it("mantoEclesiastico", "Manto eclesiástico", "vestuario", 20, 1, { pagina: 159, vestido: true, efeitos: bonus("religiao", 1) }),
    it("robeMistico", "Robe místico", "vestuario", 50, 1, { pagina: 159, vestido: true, efeitos: bonus("misticismo", 1) }),
    it("sapatosDeCamurca", "Sapatos de camurça", "vestuario", 8, 1, { pagina: 159, vestido: true, efeitos: bonus("acrobacia", 1) }),
    it("tabardo", "Tabardo", "vestuario", 10, 1, { pagina: 159, vestido: true, efeitos: bonus("diplomacia", 1) }),
    it("trajeDaCorte", "Traje da corte", "vestuario", 100, 1, { pagina: 159, resumo: "Sem ele, em bailes e palácios: –5 em perícias de Carisma." }),
    it("trajeDeViajante", "Traje de viajante", "vestuario", 10, 0, { pagina: 159 }),
    it("vesteDeSeda", "Veste de seda", "vestuario", 25, 1, { pagina: 159, vestido: true, efeitos: bonus("reflexos", 1) }),
    /* esotéricos (CD 20, treinado em Misticismo; empunhado) */
    it("bolsaDePo", "Bolsa de pó", "esoterico", 300, 1, { pagina: 159, esoterico: { pmAprimoramento: 2, escolas: ["encantamento", "ilusao"] } }),
    it("cajadoArcano", "Cajado arcano", "esoterico", 1000, 2, { pagina: 160, duasMaos: true, comoArma: "bordao", esoterico: { limitePM: 1, cd: 1, tipoMagia: "arcana" } }),
    it("cetroElemental", "Cetro elemental", "esoterico", 750, 1, { pagina: 160, escolhaElemento: ["acido", "eletricidade", "fogo", "frio"], esoterico: { dadoExtraDoTipo: true } }),
    it("costelaDeLich", "Costela de lich", "esoterico", 300, 1, { pagina: 160, esoterico: { danoExtra: { dados: "1d6", tipo: "trevas" }, semCuraMagica: true } }),
    it("dedoDeEnte", "Dedo de ente", "esoterico", 200, 1, { pagina: 160, esoterico: { recuperaPM: "1d4 = 4" } }),
    it("luvaDeFerro", "Luva de ferro", "esoterico", 150, 1, { pagina: 160, esoterico: { bonusPessoal: 1, tipoMagia: "arcana" } }),
    it("medalhaoDePrata", "Medalhão de prata", "esoterico", 750, 1, { pagina: 160, esoterico: { desconto: 1, alcance: "pessoal" } }),
    it("orbeCristalino", "Orbe cristalino", "esoterico", 750, 1, { pagina: 160, esoterico: { limitePM: 1, tipoMagia: "arcana" } }),
    it("tomoHermetico", "Tomo hermético", "esoterico", 1500, 1, { pagina: 160, escolhaEscola: true, esoterico: { cd: 2, tipoMagia: "arcana", escolaEscolhida: true } }),
    it("varinhaArcana", "Varinha arcana", "esoterico", 100, 1, { pagina: 160, esoterico: { cd: 1, tipoMagia: "arcana" } }),
    /* alquímicos — preparados (CD 15) */
    it("acido", "Ácido", "alquimico", 10, 0.5, { pagina: 160, subtipo: "preparado", uso: { execucao: "padrao", alcance: "curto", dano: { dados: "2d4", tipo: "acido" }, resistencia: { pericia: "reflexos", atributo: "des", efeito: "metade" }, consumivel: true } }),
    it("balsamoRestaurador", "Bálsamo restaurador", "alquimico", 10, 0.5, { pagina: 160, subtipo: "preparado", uso: { execucao: "completa", cura: "2d4", consumivel: true } }),
    it("bomba", "Bomba", "alquimico", 50, 0.5, { pagina: 160, subtipo: "preparado", uso: { execucao: "movimento (acender) + padrao", alcance: "curto", area: "raio 3m", dano: { dados: "6d6", tipo: "impacto" }, resistencia: { pericia: "reflexos", atributo: "des", efeito: "metade" }, consumivel: true } }),
    it("cosmetico", "Cosmético", "alquimico", 30, 0.5, { pagina: 160, subtipo: "preparado", uso: { execucao: "completa", duracao: "cena", efeitos: [{ t: "bonus", alvo: "pericias.car", valor: 2, categoria: "item" }], consumivel: true } }),
    it("elixirDoAmor", "Elixir do amor", "alquimico", 100, 0.5, { pagina: 160, subtipo: "preparado", uso: { resistencia: { pericia: "vontade", atributo: "car" }, condicao: { id: "enfeiticado", duracao: "1d3 dias" }, consumivel: true } }),
    it("essenciaDeMana", "Essência de mana", "alquimico", 50, 0.5, { pagina: 160, subtipo: "preparado", uso: { execucao: "padrao", pm: "1d4", consumivel: true } }),
    it("fogoAlquimico", "Fogo alquímico", "alquimico", 10, 0.5, { pagina: 160, subtipo: "preparado", uso: { execucao: "padrao", alcance: "curto", dano: { dados: "1d6", tipo: "fogo" }, condicao: { id: "emChamas" }, resistencia: { pericia: "reflexos", atributo: "des", efeito: "metade e evita as chamas" }, consumivel: true } }),
    it("poDoDesaparecimento", "Pó do desaparecimento", "alquimico", 100, 0.5, { pagina: 160, subtipo: "preparado", uso: { duracao: "2d6 rodadas (secreta)", condicao: { id: "invisivel" }, consumivel: true } }),
    /* alquímicos — catalisadores (CD 15, Misticismo; empunhado, um por vez) */
    it("bagaDeFogo", "Baga-de-fogo", "alquimico", 30, 0.5, { pagina: 160, subtipo: "catalisador", catalisador: { danoExtra: { dados: "1d6", tipo: "fogo" } } }),
    it("denteDeDragao", "Dente-de-dragão", "alquimico", 45, 0.5, { pagina: 161, subtipo: "catalisador", catalisador: { dadoExtra: 1 } }),
    it("essenciaAbissal", "Essência abissal", "alquimico", 150, 0.5, { pagina: 161, subtipo: "catalisador", catalisador: { sobeDado: true, tipoDano: "fogo" } }),
    it("liquenLilas", "Líquen lilás", "alquimico", 30, 0.5, { pagina: 161, subtipo: "catalisador", catalisador: { danoExtra: { dados: "1d6", tipo: "frio" } } }),
    it("musgoPurpura", "Musgo púrpura", "alquimico", 45, 0.5, { pagina: 161, subtipo: "catalisador", catalisador: { cd: 2, escola: "ilusao" } }),
    it("ossosDeMonstro", "Ossos de monstro", "alquimico", 45, 0.5, { pagina: 161, subtipo: "catalisador", catalisador: { cd: 2, escola: "necromancia" } }),
    it("poDeCristal", "Pó de cristal", "alquimico", 30, 0.5, { pagina: 161, subtipo: "catalisador", catalisador: { desconto: 1, escola: "encantamento" } }),
    it("poDeGiz", "Pó de giz", "alquimico", 30, 0.5, { pagina: 161, subtipo: "catalisador", catalisador: { desconto: 1, escola: "convocacao" } }),
    it("ramoVerdejante", "Ramo verdejante", "alquimico", 45, 0.5, { pagina: 161, subtipo: "catalisador", catalisador: { curaPorDado: 1 } }),
    it("sacoDeSal", "Saco de sal", "alquimico", 45, 0.5, { pagina: 161, subtipo: "catalisador", catalisador: { cd: 2, escola: "abjuracao" } }),
    it("seixoDeAmbar", "Seixo de âmbar", "alquimico", 30, 0.5, { pagina: 161, subtipo: "catalisador", catalisador: { desconto: 1, escola: "transmutacao" } }),
    it("terraDeCemiterio", "Terra de cemitério", "alquimico", 30, 0.5, { pagina: 161, subtipo: "catalisador", catalisador: { danoExtra: { dados: "1d6", tipo: "trevas" } } }),
    /* alquímicos — venenos (CD 20, salvo indicado; Fortitude contra a CD do aplicador, Int) */
    it("beladona", "Beladona", "alquimico", 1500, 0.5, { pagina: 161, subtipo: "veneno", veneno: { via: "ingestao", efeito: "paralisado 3 rodadas", parcial: "lento", cdExtra: 5 } }),
    it("brumaSonolenta", "Bruma sonolenta", "alquimico", 150, 0.5, { pagina: 161, subtipo: "veneno", veneno: { via: "inalacao", efeito: "inconsciente", parcial: "enjoado 1 rodada" } }),
    it("cicuta", "Cicuta", "alquimico", 60, 0.5, { pagina: 161, subtipo: "veneno", veneno: { via: "ingestao", perda: "1d12", rodadas: 3, parcial: "perde 1d12 PV" } }),
    it("essenciaDeSombra", "Essência de sombra", "alquimico", 100, 0.5, { pagina: 161, subtipo: "veneno", veneno: { via: "contato", efeito: "debilitado", parcial: "fraco" } }),
    it("nevoaToxica", "Névoa tóxica", "alquimico", 30, 0.5, { pagina: 161, subtipo: "veneno", veneno: { via: "inalacao", perda: "1d12", rodadas: 3, parcial: "perde 1d12 PV" } }),
    it("peconhaComum", "Peçonha comum", "alquimico", 15, 0.5, { pagina: 161, subtipo: "veneno", veneno: { via: "contato", perda: "1d12" } }),
    it("peconhaConcentrada", "Peçonha concentrada", "alquimico", 90, 0.5, { pagina: 162, subtipo: "veneno", veneno: { via: "contato", perda: "1d12", rodadas: 3, parcial: "perde 1d12 PV" } }),
    it("peconhaPotente", "Peçonha potente", "alquimico", 600, 0.5, { pagina: 162, subtipo: "veneno", veneno: { via: "contato", perda: "2d12", rodadas: 3, parcial: "perde 2d12 PV" } }),
    it("poDeLich", "Pó de lich", "alquimico", 3000, 0.5, { pagina: 162, subtipo: "veneno", veneno: { via: "ingestao", perda: "4d12", rodadas: 5, parcial: "perde 4d12 PV", cdExtra: 5 } }),
    it("risoDeNimb", "Riso de Nimb", "alquimico", 150, 0.5, { pagina: 162, subtipo: "veneno", veneno: { via: "inalacao", efeito: "confuso", parcial: "lento 1 rodada" } }),
    /* alimentação (um bônus por dia; consumido ao comprar; Ofício cozinheiro CD 15) */
    it("batataValkariana", "Batata valkariana", "alimentacao", 2, 0.5, { pagina: 162, alimento: { bonusUnico: "1d6" } }),
    it("goradQuente", "Gorad quente", "alimentacao", 18, 0.5, { pagina: 162, alimento: { pmTemp: 2 } }),
    it("macarraoDeYuvalin", "Macarrão de Yuvalin", "alimentacao", 6, 0.5, { pagina: 162, alimento: { pvTemp: 5 } }),
    it("pratoDoAventureiro", "Prato do aventureiro", "alimentacao", 1, 0.5, { pagina: 162, alimento: { recuperacaoPV: "nivel" } }),
    it("racaoDeViagem", "Ração de viagem (dia)", "alimentacao", 0.5, 0.5, { pagina: 162 }),
    it("refeicaoComum", "Refeição comum", "alimentacao", 0.3, 0.5, { pagina: 162 }),
    it("sopaDePeixe", "Sopa de peixe", "alimentacao", 1, 0.5, { pagina: 162, alimento: { recuperacaoPM: "nivel" } }),
    /* animais (parceiros iniciantes) */
    it("alforje", "Alforje", "animal", 30, 0, { pagina: 162, resumo: "A montaria carrega até 10 espaços." }),
    it("caoDeCaca", "Cão de caça", "animal", 150, 0, { pagina: 162, parceiro: { tipos: ["perseguidor", "montaria"], nivel: "iniciante" } }),
    it("cavalo", "Cavalo", "animal", 75, 0, { pagina: 162, parceiro: { tipos: ["montaria"], nivel: "iniciante" }, resumo: "Sem treino: Cavalgar CD 20 por rodada em combate." }),
    it("cavaloDeGuerra", "Cavalo de guerra", "animal", 400, 0, { pagina: 162, parceiro: { tipos: ["montaria"], nivel: "iniciante" } }),
    it("estabulo", "Estábulo (dia)", "animal", 0.1, 0, { pagina: 162 }),
    it("ponei", "Pônei", "animal", 5, 0, { pagina: 162, parceiro: { tipos: ["montaria"], nivel: "iniciante" } }),
    it("poneiDeGuerra", "Pônei de guerra", "animal", 30, 0, { pagina: 162, parceiro: { tipos: ["montaria"], nivel: "iniciante" } }),
    it("trobo", "Trobo", "animal", 60, 0, { pagina: 163, parceiro: { tipos: ["montaria"], nivel: "iniciante" } }),
    /* veículos */
    it("balaoGoblin", "Balão goblin", "veiculo", 200, 0, { pagina: 163, veiculo: { tamanho: "enorme", deslocamento: { voo: 12 }, defesa: "5 + Des", pv: 100, carga: "8 Médias ou 160 espaços" } }),
    it("carroca", "Carroça", "veiculo", 150, 0, { pagina: 163, veiculo: { tamanho: "grande", deslocamento: { terrestre: 9 }, defesa: "8 + Des", pv: 50, carga: "4 Médias ou 80 espaços" } }),
    it("carruagem", "Carruagem", "veiculo", 500, 0, { pagina: 163, veiculo: { tamanho: "grande", deslocamento: { terrestre: 9 }, defesa: "8 + Des", pv: 50, cobertura: "leve" } }),
    it("canoa", "Canoa", "veiculo", 70, 0, { pagina: 163, veiculo: { tamanho: "grande", deslocamento: { natacao: 9 }, defesa: "8 + Des", pv: 50 } }),
    it("veleiro", "Veleiro", "veiculo", 10000, 0, { pagina: 163 }),
  ];
  var SERVICOS = [
    { id: "estadiaComum", nome: "Estadia comum (noite)", preco: 0.5, descanso: "normal", pagina: 163 },
    { id: "estadiaConfortavel", nome: "Estadia confortável (noite)", preco: 4, descanso: "confortavel", pagina: 163 },
    { id: "estadiaLuxuosa", nome: "Estadia luxuosa (noite)", preco: 20, descanso: "luxuosa", pagina: 163 },
    { id: "conducaoTerrestre", nome: "Condução terrestre", preco: 0.5, unidade: "km" },
    { id: "conducaoMaritima", nome: "Condução marítima", preco: 0.1, unidade: "km" },
    { id: "conducaoAerea", nome: "Condução aérea", preco: 10, unidade: "km", risco: "1 em 20 de queda (não fatal) a cada 100 km" },
    { id: "curandeiro", nome: "Curandeiro", preco: 5 },
    { id: "magia1", nome: "Magia de 1º círculo", preco: 10 },
    { id: "magia2", nome: "Magia de 2º círculo", preco: 90 },
    { id: "magia3", nome: "Magia de 3º círculo", preco: 360 },
    { id: "mensageiro", nome: "Mensageiro", preco: 0.5, unidade: "km" },
  ];
  /* A estalagem "comum" recupera 1 por nível (p. 163) — o descanso normal. */

  /* ---------- itens superiores (p. 164–167) ---------- */
  var PRECO_MELHORIAS = { 1: 300, 2: 3000, 3: 9000, 4: 18000 };
  var CD_MELHORIAS = { 1: 5, 2: 10, 3: 15, 4: 20 };
  function mel(id, nome, cats, resumo, extra) { return Object.assign({ id: id, nome: nome, categorias: cats, resumo: resumo, pagina: 164 }, extra || {}); }
  var MELHORIAS = [
    mel("certeira", "Certeira", ["arma"], "+1 nos testes de ataque.", { arma: { ataque: 1 } }),
    mel("pungente", "Pungente", ["arma"], "+2 nos testes de ataque.", { req: "certeira", arma: { ataque: 2 }, substitui: "certeira" }),
    mel("cruel", "Cruel", ["arma"], "+1 nas rolagens de dano.", { arma: { dano: 1 } }),
    mel("atroz", "Atroz", ["arma"], "+2 nas rolagens de dano.", { req: "cruel", arma: { dano: 2 }, substitui: "cruel" }),
    mel("equilibrada", "Equilibrada", ["arma"], "+2 em testes de manobras.", { arma: { manobras: 2 } }),
    mel("harmonizadaArma", "Harmonizada", ["arma"], "Uma habilidade de ataque escolhida custa –1 PM com a arma.", { req: "outra" }),
    mel("injecaoAlquimica", "Injeção alquímica", ["arma"], "Acerto libera uma carga de preparado ou água benta (2 doses; recarregar: ação completa)."),
    mel("macica", "Maciça", ["arma"], "+1 no multiplicador de crítico.", { arma: { mult: 1 }, exclui: "precisa" }),
    mel("miraTelescopica", "Mira telescópica", ["arma"], "Alcance +1 categoria e Ataque Furtivo em alcance médio (armas de disparo, exceto fundas).", { arma: { alcance: 1 } }),
    mel("precisa", "Precisa", ["arma"], "+1 na margem de ameaça.", { arma: { margem: 1 }, exclui: "macica" }),
    mel("ajustada", "Ajustada", ["armadura", "escudo"], "–1 na penalidade de armadura.", { armadura: { penalidade: 1 } }),
    mel("sobMedida", "Sob medida", ["armadura", "escudo"], "–2 na penalidade de armadura (só o usuário).", { req: "ajustada", armadura: { penalidade: 2 }, substitui: "ajustada" }),
    mel("delicada", "Delicada", ["armadura"], "Armadura pesada que permite 1 ponto de Destreza na Defesa.", { soPesada: true, armadura: { desMax: 1 }, exclui: "reforcada" }),
    mel("espinhosaArmadura", "Espinhosa", ["armadura"], "Agarrar ou ser agarrado causa perfuração igual à Força (ao fazer e no início de cada turno)."),
    mel("espinhosoEscudo", "Espinhoso", ["escudo"], "Ataque com escudo: dano +1 passo.", { escudo: { passo: 1 } }),
    mel("polida", "Polida", ["armadura", "escudo"], "+5 na Defesa na primeira rodada de combate (ambiente iluminado).", { armadura: { defesaPrimeiraRodada: 5 } }),
    mel("reforcada", "Reforçada", ["armadura", "escudo"], "+1 na Defesa e +1 na penalidade de armadura.", { armadura: { defesa: 1, penalidade: -1 }, exclui: "delicada" }),
    mel("selada", "Selada", ["armadura"], "+1 nos testes de resistência (só armadura pesada).", { soPesada: true, armadura: { resistencias: 1 } }),
    mel("canalizador", "Canalizador", ["esoterico"], "+1 no limite de PM das magias.", { esoterico: { limitePM: 1 } }),
    mel("energetico", "Energético", ["esoterico"], "Magias de dano causam +1d6 do mesmo tipo.", { esoterico: { danoExtra: "1d6" } }),
    mel("harmonizadoEsoterico", "Harmonizado", ["esoterico"], "Uma magia escolhida custa –1 PM (trocar: um dia e T$ 100).", { esoterico: { descontoMagiaEscolhida: 1 } }),
    mel("poderoso", "Poderoso", ["esoterico"], "+1 na CD das magias.", { esoterico: { cd: 1 } }),
    mel("vigilante", "Vigilante", ["esoterico"], "+2 na Defesa.", { esoterico: { defesa: 2 } }),
    mel("aprimorado", "Aprimorado", ["ferramenta", "vestuario"], "+1 na perícia que o item modifica.", { pericia: 1 }),
    mel("banhadoAOuro", "Banhado a ouro", ["arma", "armadura", "escudo", "esoterico", "ferramenta", "vestuario"], "+2 em Diplomacia.", { efeitos: [{ t: "bonus", alvo: "pericia.diplomacia", valor: 2, categoria: "item" }] }),
    mel("cravejadoDeGemas", "Cravejado de gemas", ["arma", "armadura", "escudo", "esoterico", "ferramenta", "vestuario"], "+2 em Enganação.", { efeitos: [{ t: "bonus", alvo: "pericia.enganacao", valor: 2, categoria: "item" }] }),
    mel("discreto", "Discreto", ["arma", "armadura", "escudo", "esoterico", "ferramenta", "vestuario"], "–1 espaço (mín. 1) e +5 em Ladinagem para ocultar.", { espacos: -1 }),
    mel("macabro", "Macabro", ["arma", "armadura", "escudo", "esoterico", "ferramenta", "vestuario"], "+2 em Intimidação e –2 em Diplomacia.", { efeitos: [{ t: "bonus", alvo: "pericia.intimidacao", valor: 2, categoria: "item" }, { t: "bonus", alvo: "pericia.diplomacia", valor: -2, categoria: "item" }] }),
    mel("materialEspecial", "Material especial", ["arma", "armadura", "escudo", "esoterico"], "Feito de um material especial (preço do material à parte)."),
  ];
  var MATERIAIS = [
    { id: "acoRubi", nome: "Aço-rubi", pagina: 166, precos: { arma: 6000, leve: 3000, pesada: 6000, escudo: 3000, esoterico: 6000 },
      arma: "Ignora 10 de RD e a imunidade a crítico de lefeu.", armadura: "Chance de ignorar dano extra de crítico e furtivo: 25% leve/escudo, 50% pesada (cumulativas).", esoterico: "Magias de dano ignoram 10 de RD e as imunidades de lefeu.", efeitoArma: { ignoraRD: 10 } },
    { id: "adamante", nome: "Adamante", pagina: 166, precos: { arma: 3000, leve: 6000, pesada: 18000, escudo: 6000, esoterico: 3000 },
      arma: "Dano +1 passo.", armadura: "RD 2 (leve e escudo) ou 5 (pesada).", esoterico: "+1 PM para rolar de novo resultados 1 no dano da magia.", efeitoArma: { passo: 1 }, rdArmadura: { leve: 2, escudo: 2, pesada: 5 } },
    { id: "geloEterno", nome: "Gelo eterno", pagina: 166, precos: { arma: 600, leve: 1500, pesada: 3000, escudo: 1500, esoterico: 3000 },
      arma: "+2 de dano de frio.", armadura: "Redução de fogo 5 (leve e escudo) ou 10 (pesada).", esoterico: "Rola de novo 1s no dano das magias de frio.", efeitoArma: { danoExtraFixo: 2, tipo: "frio" }, rdFogo: { leve: 5, escudo: 5, pesada: 10 } },
    { id: "madeiraTollon", nome: "Madeira Tollon", pagina: 167, precos: { arma: 1500, escudo: 1500, esoterico: 1500 }, soMadeira: true,
      arma: "Conta como mágica para vencer RD; habilidades de ataque custam –1 PM.", armadura: "Escudo leve: resistência a magia +2.", esoterico: "Resistência a magia +2." },
    { id: "materiaVermelha", nome: "Matéria vermelha", pagina: 167, precos: { arma: 1500, leve: 6000, pesada: 18000, escudo: 6000, esoterico: 3000 }, penalidadeCarisma: -2,
      arma: "+1d6 de dano; cada acerto custa 1 PV ao usuário (lefou e lefeu imunes).", armadura: "Falha 10% (leve e escudo) ou 25% (pesada), cumulativas.", esoterico: "Você e inimigos em alcance curto sofrem –2 em resistência contra magia.", efeitoArma: { danoExtra: "1d6" } },
    { id: "mitral", nome: "Mitral", pagina: 167, precos: { arma: 1500, leve: 1500, pesada: 12000, escudo: 1500, esoterico: 3000 }, espacos: -1,
      arma: "+1 na margem de ameaça.", armadura: "–2 na penalidade; pesada permite até 2 de Destreza na Defesa.", esoterico: "+2 PM para +2 na CD da magia.", efeitoArma: { margem: 1 } },
  ];
  /* Munição superior ou mágica paga metade do aumento de uma arma (p. 151). */
  var FATOR_MUNICAO = 0.5;
  /* Fabricar (p. 121–122, 167): matéria-prima 1/3 do preço; CD 15 simples ou 20 complexo, + CD das melhorias. */
  function precoDoItem(base, nMelhorias, material) { return (Number(base) || 0) + (PRECO_MELHORIAS[nMelhorias] || 0) + (Number(material) || 0); }

  function porId(lista) { var m = {}; lista.forEach(function (x) { m[x.id] = x; }); return m; }
  var TODOS = ARMAS.concat(MUNICOES, ARMADURAS, ITENS);
  var ITEM = porId(TODOS);

  global.RAMATormenta20Equipamento = {
    DINHEIRO_INICIAL: DINHEIRO_INICIAL, MOEDAS: MOEDAS, VENDA: VENDA, ITENS_INICIAIS: ITENS_INICIAIS,
    PASSOS: PASSOS, passoDeDano: passoDeDano,
    ARMAS: ARMAS, MUNICOES: MUNICOES, DESARMADO: DESARMADO, IMPROVISADA: IMPROVISADA, ALCANCES: ALCANCES,
    ARMADURAS: ARMADURAS, REGRAS_ARMADURA: REGRAS_ARMADURA, ITENS: ITENS, SERVICOS: SERVICOS,
    PRECO_MELHORIAS: PRECO_MELHORIAS, CD_MELHORIAS: CD_MELHORIAS, MELHORIAS: MELHORIAS, MELHORIA: porId(MELHORIAS),
    MATERIAIS: MATERIAIS, MATERIAL: porId(MATERIAIS), FATOR_MUNICAO: FATOR_MUNICAO, precoDoItem: precoDoItem,
    TODOS: TODOS, ITEM: ITEM,
  };
})(typeof window !== "undefined" ? window : globalThis);
/* <<< js/tormenta20/equipamento.js */

/* >>> js/tormenta20/magias.js */
/* =====================================================================
   R.A.M.A. — Tormenta20 · magias (registro e lançamento)
   ---------------------------------------------------------------------
   Os arquivos magias-1.js … magias-5.js chamam
     RAMATormenta20Magias.def(id, nome, "A1", escola, página, base,
                              resumo, aprimoramentos, mecânica)
   · "A1" = tipo (A arcana, D divina, U universal) + círculo.
   · base = "execução|alcance|alvo|duração|resistência"; o terceiro campo
     começa com "area:" ou "ef:" quando a magia usa área ou efeito.
   · aprimoramento = [custo, tipo, texto, mudanças]. Tipo "a" (aumenta,
     repetível), "m" (muda; mudanças na mesma característica não se
     acumulam), "o" (outro, uma vez) ou "T" (truque, custo 0, sozinho).
     Mudanças: ex, al, alvo, area, ef, du, res (novos valores); alvos
     (+n por vez); r (requer círculo — só magias de classe, p. 172);
     precisa (índice de outro aprimoramento); lim (máximo de vezes,
     expressão com circuloMax); substitui (troca o efeito básico);
     silenciosa (sem gestos nem palavras); tipoDano; mat (componente);
     escolha (opções a decidir ao lançar).
   · mecânica: dano (expressão com aN = vezes do aprimoramento N), tipo
     do dano, cura, cond (condição), metade (resistência reduz à metade),
     efeitos (bônus que viram efeito ativo na ficha, categoria magia),
     anula, mat, especial (custo especial em texto).
   Os textos são resumos do RAMA com a página impressa do Livro Básico
   (Jogo do Ano); a descrição completa está no livro.
   ===================================================================== */

(function (global) {
  "use strict";

  var M = global.RAMATormenta20Magias = global.RAMATormenta20Magias || { MAGIAS: [], MAGIA: {} };
  var TIPOS = { A: "arcana", D: "divina", U: "universal" };
  var ESCOLAS = { abjur: "abjuracao", adiv: "adivinhacao", conv: "convocacao", encan: "encantamento", evoc: "evocacao", ilus: "ilusao", necro: "necromancia", trans: "transmutacao" };
  var CUSTO = { 1: 1, 2: 3, 3: 6, 4: 10, 5: 15 };
  var NOMES_EXECUCAO = { padrao: "padrão", movimento: "movimento", completa: "completa", livre: "livre", reacao: "reação" };
  var CAMPOS = ["ex", "al", "alvo", "area", "ef", "du", "res"];
  var NAO_CARACTERISTICA = { alvos: 1, r: 1, precisa: 1, lim: 1, substitui: 1, silenciosa: 1, mat: 1, escolha: 1, apenas: 1, sozinho: 1 };

  function X() { return global.RAMATormenta20Expressao; }

  M.def = function (id, nome, tc, escola, pagina, base, resumo, aprim, mec) {
    var partes = String(base || "").split("|");
    var b = { ex: partes[0] || "padrao", al: partes[1] || "", du: partes[3] || "", res: partes[4] || "" };
    var a3 = partes[2] || "";
    if (a3.indexOf("area:") === 0) b.area = a3.slice(5);
    else if (a3.indexOf("ef:") === 0) b.ef = a3.slice(3);
    else b.alvo = a3;
    var m = {
      id: id, nome: nome, tipo: TIPOS[tc[0]], circulo: Number(tc.slice(1)), escola: ESCOLAS[escola] || escola, pagina: pagina,
      base: b, resumo: resumo, mec: mec || {},
      aprimoramentos: (aprim || []).map(function (a, i) {
        var mud = a[3] || {};
        return { indice: i, custo: a[1] === "T" ? 0 : Number(a[0]) || 0, tipo: a[1], texto: a[2], mud: mud, requer: mud.r || null };
      }),
      fonte: { livro: "Tormenta20 — Jogo do Ano", pagina: pagina },
    };
    if (M.MAGIA[id]) M.MAGIAS = M.MAGIAS.filter(function (x) { return x.id !== id; });
    M.MAGIAS.push(m);
    M.MAGIA[id] = m;
    return m;
  };

  M.custoBase = function (circulo) { return CUSTO[circulo] || 0; };
  M.nomeExecucao = function (ex) { return NOMES_EXECUCAO[ex] || ex; };

  /* Disponível para uma fonte: tipo (arcana/divina; universal serve às
     duas), círculo máximo e escolas permitidas (bardo, druida). */
  M.disponivel = function (magia, fonte) {
    if (!magia || !fonte) return false;
    if (magia.circulo > (fonte.circuloMax || 0)) return false;
    if (fonte.tipo && fonte.tipo !== "ambas" && magia.tipo !== "universal" && magia.tipo !== fonte.tipo) return false;
    if (fonte.escolas && fonte.escolas.length && fonte.escolas.indexOf(magia.escola) < 0) return false;
    return true;
  };

  /* Prepara um lançamento: aplica os aprimoramentos escolhidos e devolve
     custo, execução, alcance, alvo/área/efeito, duração, resistência,
     dano e os textos, com os erros que impedem confirmar.
       escolhas = { aprim: { indice: vezes }, opcoes: { indice: valor } }
       ctx = { circuloMax, deClasse, limitePM, desconto, alquebrado, cd } */
  M.preparar = function (magia, escolhas, ctx) {
    var c = ctx || {};
    var e = escolhas || {};
    var vezes = {};
    var erros = [];
    var r = { magia: magia.id, nome: magia.nome, custoBase: CUSTO[magia.circulo] || 0, alvosExtra: 0, textos: [], erros: erros, aplicados: [] };
    CAMPOS.forEach(function (k) { if (magia.base[k] !== undefined) r[k] = magia.base[k]; });
    var mudou = {}, mudouExtra = {};
    r.extra = {};
    var truque = false;
    var ordem = magia.aprimoramentos.slice();
    ordem.forEach(function (a) {
      var n = Math.max(0, Math.floor(Number((e.aprim || {})[a.indice]) || 0));
      if (!n) return;
      if (a.tipo !== "a" && n > 1) { erros.push("“" + a.texto + "” só pode ser usado uma vez."); n = 1; }
      if (a.mud.lim !== undefined) {
        var lim = Math.max(0, Math.floor(X() ? X().numero(a.mud.lim, { circuloMax: c.circuloMax || 0 }) : 0));
        if (n > lim) { erros.push("Limite de " + lim + " vez(es) para “" + a.texto + "” (pelo seu círculo máximo)."); n = lim; }
      }
      if (a.requer) {
        if (!c.deClasse) erros.push("“" + a.texto + "” exige " + a.requer + "º círculo e só vale para magias de classe.");
        else if ((c.circuloMax || 0) < a.requer) erros.push("“" + a.texto + "” exige lançar magias de " + a.requer + "º círculo.");
      }
      if (a.tipo === "T") truque = true;
      vezes[a.indice] = n;
    });
    Object.keys(vezes).forEach(function (i) {
      var a = magia.aprimoramentos[i];
      if (a.mud.precisa !== undefined && !vezes[a.mud.precisa]) erros.push("“" + a.texto + "” precisa de “" + magia.aprimoramentos[a.mud.precisa].texto + "”.");
    });
    if (truque && Object.keys(vezes).length > 1) erros.push("O truque não pode ser combinado com outros aprimoramentos.");
    var custo = truque ? 0 : r.custoBase;
    Object.keys(vezes).forEach(function (i) {
      var a = magia.aprimoramentos[i], n = vezes[i];
      if (!truque) custo += a.custo * n;
      CAMPOS.forEach(function (k) {
        if (a.mud[k] === undefined) return;
        if (mudou[k] !== undefined && mudou[k] !== i) erros.push("Dois aprimoramentos mudam " + nomeCampo(k) + "; mudanças na mesma característica não se acumulam.");
        mudou[k] = i;
        r[k] = a.mud[k];
        if (k === "alvo" || k === "area" || k === "ef") ["alvo", "area", "ef"].forEach(function (o) { if (o !== k && a.mud[o] === undefined) delete r[o]; });
      });
      Object.keys(a.mud).forEach(function (k) {
        if (CAMPOS.indexOf(k) >= 0 || NAO_CARACTERISTICA[k]) return;
        if (mudouExtra[k] !== undefined && mudouExtra[k] !== i) erros.push("Dois aprimoramentos mudam a mesma característica (" + k + "); não se acumulam.");
        mudouExtra[k] = i;
        r.extra[k] = a.mud[k];
      });
      if (a.mud.apenas && c.tipoFonte && c.tipoFonte !== a.mud.apenas) erros.push("“" + a.texto + "” é só para conjuradores de magia " + a.mud.apenas + ".");
      if (a.mud.sozinho && Object.keys(vezes).length > 1) erros.push("“" + a.texto + "” não combina com outros aprimoramentos.");
      if (a.mud.alvos) r.alvosExtra += a.mud.alvos * n;
      if (a.mud.silenciosa) r.silenciosa = true;
      if (a.mud.tipoDano) r.tipoDano = a.mud.tipoDano;
      if (a.mud.mat) r.mat = a.mud.mat;
      if (a.mud.substitui) r.substitui = true;
      if (a.mud.escolha) { var v = (e.opcoes || {})[i]; if (!v) erros.push("Escolha uma opção para “" + a.texto + "”."); else r.opcao = v; }
      r.aplicados.push({ indice: Number(i), vezes: n, texto: a.texto, custo: a.custo * n });
      r.textos.push((n > 1 ? n + "× " : "") + a.texto);
    });
    if (magia.mec.mat && !r.mat) r.mat = magia.mec.mat;
    if (magia.mec.especial) r.especial = magia.mec.especial;
    /* custo final: reduções não se acumulam (vale a maior), mínimo 1
       (truque fica em 0); alquebrado +1 (p. 226 e 394) */
    var desconto = Math.max(0, Number(c.desconto) || 0);
    var final = custo - desconto;
    if (!truque) final = Math.max(1, final);
    if (c.alquebrado && !truque) final += 1;
    r.custoAntes = custo;
    r.custo = Math.max(0, final);
    r.truque = truque;
    if (c.limitePM && custo > c.limitePM && custo > r.custoBase) erros.push("Custo " + custo + " PM passa do limite de " + c.limitePM + " PM desta fonte.");
    r.sustentada = String(r.du || "").indexOf("sustentada") >= 0;
    r.vezes = vezes;
    var ctxEx = function (nome) {
      if (/^a\d+$/.test(nome)) return vezes[nome.slice(1)] || 0;
      if (nome === "circuloMax") return c.circuloMax || 0;
      if (nome === "truque") return truque ? 1 : 0;
      if (nome === "nivel") return c.nivel || 1;
      if (nome.indexOf("atr.") === 0) return (c.atr || {})[nome.slice(4)] || 0;
      return 0;
    };
    r.ctx = ctxEx;
    if (magia.mec.dano) {
      var expr = magia.mec.dano;
      r.dano = X() ? X().rolavel(expr, ctxEx) : expr;
      if (r.dano === "0") delete r.dano;
      r.tipoDano = r.tipoDano || magia.mec.tipo || "";
    }
    if (magia.mec.cura) { r.cura = X() ? X().rolavel(magia.mec.cura, ctxEx) : magia.mec.cura; if (r.cura === "0") delete r.cura; }
    if (magia.mec.pvTemp) { r.pvTemp = X() ? X().rolavel(magia.mec.pvTemp, ctxEx) : magia.mec.pvTemp; if (r.pvTemp === "0") delete r.pvTemp; }
    if (magia.mec.projeteis) r.projeteis = X() ? X().numero(magia.mec.projeteis, ctxEx) : 1;
    if (magia.mec.escolha) { r.opcoesBase = magia.mec.escolha; var ob = (e.opcoes || {}).base; if (!ob) erros.push("Escolha: " + magia.mec.escolha.join(", ") + "."); else r.opcao = ob; }
    if (magia.mec.cond) r.condicao = magia.mec.cond;
    if (magia.mec.metade) r.metade = true;
    if (c.cd) r.cd = c.cd;
    r.efeitos = (magia.mec.efeitos || []).map(function (ef) {
      var cp = JSON.parse(JSON.stringify(ef));
      if (typeof cp.valor === "string" && X()) { var vv = X().avaliar(cp.valor, ctxEx); cp.valor = typeof vv === "number" ? vv : vv; }
      return cp;
    }).filter(function (ef) { return !(typeof ef.valor === "number" && ef.valor === 0 && ef.t === "bonus"); });
    r.alvosTexto = r.alvo ? r.alvo + (r.alvosExtra ? " (+" + r.alvosExtra + ")" : "") : (r.area || r.ef || "");
    return r;
  };

  function nomeCampo(k) { return { ex: "a execução", al: "o alcance", alvo: "o alvo", area: "a área", ef: "o efeito", du: "a duração", res: "a resistência" }[k] || k; }

  /* Teste para lançar (p. 172–173): concentração ferido (CD = dano),
     condição ruim (15 + PM) ou terrível (20 + PM); arcana de armadura
     (Misticismo 20 + PM, com penalidade de armadura). */
  M.testesParaLancar = function (preparo, situacao) {
    var s = situacao || {};
    var out = [];
    var pm = preparo.custoAntes || preparo.custo;
    if (s.dano) out.push({ pericia: "vontade", cd: s.dano, motivo: "concentração: sofreu " + s.dano + " de dano" });
    if (s.condicao === "ruim") out.push({ pericia: "vontade", cd: 15 + pm, motivo: "condição ruim (balançando, chuva forte)" });
    if (s.condicao === "terrivel") out.push({ pericia: "vontade", cd: 20 + pm, motivo: "condição terrível (tempestade, cavalgando em disparada)" });
    if (s.armaduraArcana && !preparo.silenciosa) out.push({ pericia: "misticismo", cd: 20 + pm, motivo: "magia arcana de armadura (penalidade de armadura se aplica)", penalidade: true });
    return out;
  };

  M.listar = function (filtro) {
    var f = filtro || {};
    return M.MAGIAS.filter(function (m) {
      if (f.tipo && m.tipo !== f.tipo && m.tipo !== "universal") return false;
      if (f.circulo && m.circulo !== f.circulo) return false;
      if (f.escola && m.escola !== f.escola) return false;
      return true;
    }).sort(function (a, b) { return a.circulo - b.circulo || a.nome.localeCompare(b.nome); });
  };
})(typeof window !== "undefined" ? window : globalThis);
/* <<< js/tormenta20/magias.js */

/* >>> js/tormenta20/magias-1.js */
/* R.A.M.A. — Tormenta20 · magias de 1º círculo (Livro Básico, Jogo do Ano).
   Resumos do RAMA; formato descrito em js/tormenta20/magias.js. */
RAMATormenta20Magias.def("abencoarAlimentos", "Abençoar Alimentos", "D1", "trans", 178, "padrao|curto|alimento para 1 criatura|cena|",
  "Purifica uma porção de comida ou bebida. Consumida dentro da duração, dá 5 PV ou 1 PM temporários (bônus de alimentação: um por dia, dura um dia).",
  [[0, "T", "Só purifica; sem bônus.", { substitui: 1 }], [1, "a", "+1 alvo.", { alvos: 1 }], [1, "m", "Permanente: cria um frasco de água benta (pó de prata, T$ 5).", { du: "permanente", alvo: "1 frasco com água", mat: "pó de prata (T$ 5)", substitui: 1 }]]);
RAMATormenta20Magias.def("acalmarAnimal", "Acalmar Animal", "D1", "encan", 178, "padrao|curto|1 animal|cena|Vontade anula",
  "O animal fica prestativo e interpreta suas ações da forma mais favorável; você tem +10 em Adestramento e Diplomacia com ele. Alvo hostil ou em combate tem +5 na resistência. Ação hostil sua ou de aliados dissipa a magia.",
  [[1, "m", "Alcance médio.", { al: "medio" }], [1, "m", "Alvo: 1 monstro ou espírito com Inteligência –5 ou –4.", { alvo: "1 monstro ou espírito (Int –5 ou –4)" }], [2, "a", "+1 alvo.", { alvos: 1 }], [5, "m", "Alvo: 1 monstro ou espírito.", { alvo: "1 monstro ou espírito", r: 3 }]]);
RAMATormenta20Magias.def("adagaMental", "Adaga Mental", "A1", "encan", 178, "padrao|curto|1 criatura|instantanea|Vontade parcial",
  "2d6 de dano psíquico e atordoado por 1 rodada. Passar na resistência reduz o dano à metade e evita a condição. Cada criatura só fica atordoada por esta magia uma vez por cena.",
  [[1, "o", "Sem gestos nem palavras (pode ser lançada de armadura); a adaga é invisível e, se o alvo falhar, ele não percebe a magia.", { silenciosa: 1 }], [2, "m", "Duração 1 dia: você sabe a direção e a localização do alvo no mesmo mundo.", { du: "1 dia" }], [2, "a", "+1d6 de dano."]],
  { dano: "(2 + a2)d6", tipo: "psiquico", cond: "atordoado", metade: 1 });
RAMATormenta20Magias.def("alarme", "Alarme", "A1", "abjur", 178, "padrao|curto|area:esfera com 9m de raio|1 dia|",
  "Barreira invisível que detecta quem entra ou toca a área (você escolhe quem passa livre). Aviso telepático (só você, até 1 km, acorda você) ou sonoro (ouvido em alcance longo).",
  [[2, "m", "Alcance pessoal; a área emana de você.", { al: "pessoal" }], [5, "o", "Também percebe adivinhação usada na área ou através dela; teste oposto de Misticismo revela o rosto e a localização aproximada de quem a usou."], [9, "m", "Pode ser descarregada quando um intruso entra: Vontade anula ou fica paralisado 1d4 rodadas; por 24 h você e os escolhidos têm +10 em Sobrevivência para rastreá-lo.", { du: "1 dia ou até descarregar", res: "Vontade anula" }]]);
RAMATormenta20Magias.def("amedrontar", "Amedrontar", "A1", "necro", 179, "padrao|curto|1 animal ou humanoide|cena|Vontade parcial",
  "Falha: apavorado por 1 rodada e depois abalado. Sucesso: abalado por 1d4 rodadas.",
  [[2, "o", "Quem falha fica apavorado por 1d4+1 rodadas."], [2, "m", "Alvo: 1 criatura.", { alvo: "1 criatura" }], [5, "m", "Afeta todos os alvos válidos que você escolher no alcance.", { alvo: "alvos válidos escolhidos no alcance" }]],
  { cond: "apavorado" });
RAMATormenta20Magias.def("armaEspiritual", "Arma Espiritual", "D1", "conv", 180, "padrao|pessoal|você|cena|",
  "A arma preferida da sua divindade flutua a seu lado. Uma vez por rodada, quando você sofre um ataque corpo a corpo, reação: ela causa 2d6 de dano (do tipo da arma) no atacante. Dissipa se você morrer.",
  [[1, "o", "A arma protege você: +1 na Defesa."], [2, "a", "+1 na Defesa (com o aprimoramento anterior).", { precisa: 0 }], [2, "m", "Sustentada; uma vez por rodada, ação livre: a arma acerta automaticamente um alvo adjacente (sem contra-atacar até seu próximo turno).", { du: "sustentada", r: 2 }], [2, "m", "Dano de essência.", { tipoDano: "essencia", r: 2 }], [2, "a", "+1d6 de dano (limite pelo círculo máximo que você lança).", { lim: "circuloMax" }], [5, "o", "Duas armas: contra-ataca (ou ataca) duas vezes por rodada.", { r: 3 }]],
  { dano: "(2 + a4)d6", tipo: "arma", efeitos: [{ t: "bonus", alvo: "defesa", valor: "a0 + a1", categoria: "magia" }] });
RAMATormenta20Magias.def("armaMagica", "Arma Mágica", "U1", "trans", 181, "padrao|toque|1 arma empunhada|cena|",
  "A arma fica mágica e dá +1 em ataque e dano (bônus de encanto). Se você a empunha, pode usar seu atributo-chave de magias nos ataques com ela.",
  [[2, "a", "+1 no bônus (limite pelo círculo máximo).", { lim: "circuloMax - 1" }], [2, "o", "+1d6 de dano de ácido, eletricidade, fogo ou frio (escolha ao lançar).", { escolha: ["acido", "eletricidade", "fogo", "frio"] }], [3, "o", "O dano do aprimoramento anterior vira +2d6.", { precisa: 1 }]],
  { efeitos: [{ t: "bonus", alvo: "ataque", valor: "1 + a0", categoria: "magia", naArma: 1 }, { t: "bonus", alvo: "dano", valor: "1 + a0", categoria: "magia", naArma: 1 }, { t: "atrAtaque", atributo: "chave", naArma: 1 }, { t: "danoExtra", valor: "a2 ? '2d6' : (a1 ? '1d6' : '0')", tipo: "opcao", naArma: 1 }] });
RAMATormenta20Magias.def("armaduraArcana", "Armadura Arcana", "A1", "abjur", 181, "padrao|pessoal|você|cena|",
  "Película invisível que dá +5 na Defesa. Acumula com outras magias, mas não com o bônus de armadura.",
  [[1, "m", "Execução reação: ao sofrer um ataque, +5 na Defesa contra ele (acumula com o efeito básico e com armaduras).", { ex: "reacao", du: "instantanea", substitui: 1 }], [2, "a", "+1 na Defesa."], [2, "m", "Duração 1 dia.", { du: "1 dia" }]],
  { efeitos: [{ t: "bonus", alvo: "defesa", valor: "5 + a1", categoria: "magia", cumulativo: 1, naoAcumulaArmadura: 1 }] });
RAMATormenta20Magias.def("armamentoDaNatureza", "Armamento da Natureza", "D1", "trans", 181, "padrao|toque|1 arma primitiva, natural ou desarmado|cena|",
  "Arma primitiva sem custo (bordão, clava, funda, tacape), arma natural ou ataque desarmado: dano +1 passo e conta como mágica. Pode mudar o tipo de dano para corte, impacto ou perfuração.",
  [[1, "o", "+1 nos ataques com a arma."], [2, "m", "Execução ação de movimento.", { ex: "movimento" }], [3, "a", "+1 nos ataques (com o primeiro aprimoramento).", { precisa: 0 }], [5, "o", "Dano +1 passo adicional."]],
  { efeitos: [{ t: "passoDano", valor: "1 + a3", naArma: 1 }, { t: "bonus", alvo: "ataque", valor: "a0 + a2", categoria: "magia", naArma: 1 }] });
RAMATormenta20Magias.def("aviso", "Aviso", "U1", "adiv", 182, "movimento|longo|1 criatura|instantanea|",
  "Recado telepático, mesmo sem ver o alvo. Escolha: Alerta (+5 no próximo teste de Iniciativa e de Percepção na cena), Mensagem (até 25 palavras, idioma em comum) ou Localização (sabe onde você está agora).",
  [[1, "a", "Alcance ×10 (90 m → 900 m → 9 km…)."], [1, "o", "Mensagem: o alvo pode responder com até 25 palavras até o fim do próximo turno dele."], [2, "o", "Localização dura a cena e acompanha você.", { du: "cena" }], [3, "a", "+1 alvo.", { alvos: 1 }]]);
RAMATormenta20Magias.def("bencao", "Bênção", "D1", "encan", 182, "padrao|curto|aliados|cena|",
  "Aliados recebem +1 em testes de ataque e rolagens de dano. Anula Perdição.",
  [[1, "m", "Alvo: 1 cadáver por 1 semana; não se decompõe nem vira morto-vivo.", { alvo: "1 cadáver", du: "1 semana", substitui: 1 }], [2, "a", "+1 nos bônus (limite pelo círculo máximo).", { lim: "circuloMax - 1" }]],
  { efeitos: [{ t: "bonus", alvo: "ataque", valor: "1 + a1", categoria: "magia" }, { t: "bonus", alvo: "dano", valor: "1 + a1", categoria: "magia" }], anula: "perdicao" });
RAMATormenta20Magias.def("caminhosDaNatureza", "Caminhos da Natureza", "D1", "conv", 183, "padrao|curto|area:criaturas escolhidas|1 dia|",
  "As criaturas afetadas recebem +3 m de deslocamento e ignoram terreno difícil natural.",
  [[0, "T", "Só você: +5 em Sobrevivência para se orientar.", { al: "pessoal", alvo: "você", substitui: 1 }], [1, "o", "A CD para rastrear os alvos em terreno natural sobe +10."], [2, "a", "+3 m no bônus de deslocamento."]],
  { efeitos: [{ t: "bonus", alvo: "deslocamento", valor: "truque ? 0 : 3 + 3 * a2", categoria: "magia" }] });
RAMATormenta20Magias.def("comando", "Comando", "D1", "encan", 184, "padrao|curto|1 humanoide|1 rodada|Vontade anula",
  "Ordem irresistível que o alvo precisa ouvir. Fuja (gasta o turno se afastando), Largue (solta o que segura), Pare (pasmo; uma vez por cena), Senta (senta e não levanta até seu próximo turno) ou Venha (gasta o turno se aproximando).",
  [[1, "m", "Alvo: 1 criatura.", { alvo: "1 criatura" }], [2, "a", "+1 alvo.", { alvos: 1 }]]);
RAMATormenta20Magias.def("compreensao", "Compreensão", "U1", "adiv", 184, "padrao|toque|1 criatura ou texto|cena|Vontade anula (veja texto)",
  "Entende textos em qualquer idioma, conversa com criaturas inteligentes sem idioma comum e percebe sentimentos de animais. Ação de movimento: ouve os pensamentos de quem toca (involuntário faz Vontade).",
  [[1, "m", "Alcance curto.", { al: "curto" }], [2, "m", "Alcance curto; alvo: criaturas escolhidas (ouve os pensamentos de uma por vez).", { al: "curto", alvo: "criaturas escolhidas" }], [2, "m", "Alvo: 1 criatura; vasculha os pensamentos dela atrás de uma informação (Vontade anula; o mestre decide se ela sabe).", { alvo: "1 criatura", r: 2 }], [5, "m", "Pessoal: você fala, entende e escreve qualquer idioma.", { al: "pessoal", alvo: "você", r: 3, substitui: 1 }]]);
RAMATormenta20Magias.def("concentracaoDeCombate", "Concentração de Combate", "A1", "adiv", 185, "livre|pessoal|você|1 rodada|",
  "Você antecipa os movimentos dos inimigos: nos testes de ataque, rola dois dados e usa o melhor.",
  [[2, "m", "Execução padrão; duração cena.", { ex: "padrao", du: "cena", r: 2 }], [5, "o", "Além do normal, quem ataca você rola dois dados e usa o pior.", { r: 3 }], [9, "m", "Execução padrão, alcance curto, alvo: criaturas escolhidas, duração cena.", { ex: "padrao", al: "curto", alvo: "criaturas escolhidas", du: "cena", r: 4 }], [14, "m", "Execução padrão; duração 1 dia. Sexto sentido: imune a surpreendido e desprevenido, +10 na Defesa e em Reflexos.", { ex: "padrao", du: "1 dia", r: 5 }]],
  { efeitos: [{ t: "rolagemDupla", alvo: "ataque" }] });
RAMATormenta20Magias.def("conjurarMonstro", "Conjurar Monstro", "A1", "conv", 185, "completa|curto|ef:1 criatura conjurada|sustentada|",
  "Conjura um construto de energia Pequeno (aparência e dano corte, impacto ou perfuração à escolha), um por vez. Age a partir da próxima rodada com uma ação de movimento (deslocamento 9 m). Ação padrão sua para ordenar: Mover (dobro do deslocamento), Atacar (2d4+2 em adjacente) ou Lançar Magia (serve de origem para uma magia sua de ação padrão ou menor). For 2, Des 3, outros nulos; Defesa igual à sua, 20 PV, usa seus Reflexos; imune a efeitos de Fortitude e Vontade.",
  [[1, "o", "Escalada ou natação igual ao deslocamento terrestre."], [1, "a", "+3 m de deslocamento."], [1, "m", "Dano do ataque vira ácido, fogo, frio ou eletricidade.", { escolha: ["acido", "fogo", "frio", "eletricidade"] }], [2, "a", "+10 PV por categoria de tamanho a partir de Pequeno."], [2, "m", "Tamanho Médio: For 4, Des 3, 45 PV, deslocamento 12 m, ataque 2d6+6.", { tamanho: "medio" }], [2, "a", "Resistência 5 contra dois tipos de dano."], [4, "o", "Nova ordem Arma de Sopro: gasta 1 PM, dobro do dano de ataque em cone de 6 m (Reflexos reduz à metade)."], [5, "m", "Tamanho Grande: For 7, Des 2, 75 PV, deslocamento 12 m, ataque 4d6+10 com alcance 3 m.", { tamanho: "grande", r: 2 }], [9, "o", "Voo igual ao dobro do deslocamento."], [9, "a", "Imunidade a dois tipos de dano."], [9, "m", "Tamanho Enorme: For 11, Des 1, 110 PV, deslocamento 15 m, ataque 4d8+15 com alcance 4,5 m.", { tamanho: "enorme", r: 4 }], [14, "m", "Tamanho Colossal: For 15, Des 0, 180 PV, deslocamento 15 m, ataque 4d12+20 com alcance 9 m.", { tamanho: "colossal", r: 5 }]],
  { conjura: { pv: 20, ataque: "2d4+2" } });
RAMATormenta20Magias.def("consagrar", "Consagrar", "D1", "evoc", 186, "padrao|longo|area:esfera com 9m de raio|1 dia|",
  "Enche a área de energia positiva: curas de luz são maximizadas ali (e o dano de luz em mortos-vivos também). Não pode ser lançada onde há símbolo visível de outra divindade. Anula Profanar.",
  [[1, "o", "Mortos-vivos na área sofrem –2 em testes e Defesa."], [2, "a", "Penalidade dos mortos-vivos –1 (com o anterior; limite pelo círculo máximo).", { precisa: 0, lim: "circuloMax - 2" }], [9, "m", "Execução 1 hora; permanente; incenso e óleos (T$ 1.000).", { ex: "1 hora", du: "permanente", mat: "incenso e óleos (T$ 1.000)", r: 4 }]],
  { anula: "profanar" });
RAMATormenta20Magias.def("controlarPlantas", "Controlar Plantas", "D1", "trans", 188, "padrao|curto|area:quadrado com 9m de lado|cena|Reflexos anula",
  "Só em área com vegetação. Plantas se enroscam: quem falha fica enredado (ação padrão e Acrobacia ou Atletismo para se soltar). A área vira terreno difícil e repete o teste de Reflexos no início do turno de quem está nela.",
  [[0, "T", "Alvo: 1 planta, sem resistência; ela se move como animada (não causa dano nem atrapalha conjuradores).", { alvo: "1 planta", res: "nenhuma", substitui: 1 }], [1, "m", "Instantânea: as plantas da área encolhem; terreno difícil vira normal e não dá camuflagem. Dissipa o uso normal desta magia.", { du: "instantanea", substitui: 1 }], [1, "o", "Quem falha também fica imóvel."], [2, "m", "Pessoal, sem resistência: você conversa com plantas (prestativas) e pode usar Diplomacia com elas.", { al: "pessoal", alvo: "você", res: "nenhuma", substitui: 1 }]],
  { cond: "enredado" });
RAMATormenta20Magias.def("criarElementos", "Criar Elementos", "D1", "conv", 188, "padrao|curto|ef:elemento escolhido|instantanea|",
  "Cria uma pequena porção real de um elemento numa superfície (ou objetos simples de gelo, terra ou pedra). Água: enche um recipiente Minúsculo ou um cubo de gelo. Ar: vento fraco num quadrado de 1,5 m que dispersa gás, fumaça ou névoa. Fogo: chama que ilumina como tocha; num quadrado ocupado causa 1d6 de fogo e, com falha em Reflexos, deixa em chamas. Terra: cubo Minúsculo de terra, argila ou pedra.",
  [[1, "a", "Quantidade +1 passo (+1 categoria de tamanho para água ou terra; +1 quadrado para ar e fogo)."], [1, "m", "Alvo: 1 criatura ou objeto, Reflexos reduz à metade: arremessa água ou terra causando 2d4 de impacto (+1 passo por categoria acima de Minúsculo).", { alvo: "1 criatura ou objeto", res: "Reflexos reduz à metade" }], [1, "a", "Fogo: +1d6 no dano inicial de cada chama."]],
  { dano: "(1 + a2)d6", tipo: "fogo" });
RAMATormenta20Magias.def("criarIlusao", "Criar Ilusão", "A1", "ilus", 189, "padrao|medio|ef:ilusão de até 4 cubos de 1,5m|cena|Vontade desacredita",
  "Ilusão visual ou sonora simples (sem cheiro, textura, temperatura ou sons complexos; volume de voz normal por cubo). Não causa nem sofre dano, mas pode esconder coisas. Dissipa se você sair do alcance.",
  [[1, "m", "Sustentada: ação livre por rodada para mover a imagem ou ajustar o som; ao parar, persiste uma rodada.", { du: "sustentada" }], [1, "a", "+1 cubo de 1,5 m."], [1, "o", "Imagem e som combinados."], [1, "o", "Sons complexos (volume de cinco pessoas por cubo); ação livre para ajustar volume ou posição."], [2, "o", "Odores e sensações térmicas, percebidos até o dobro do tamanho do efeito."], [2, "m", "Alcance longo; efeito: esfera de 30 m de raio. Em vez do normal, som de multidão: lançar magias ali conta como condição ruim e ouvir tem CD +10.", { al: "longo", ef: "esfera com 30m de raio", substitui: 1, r: 2 }], [2, "o", "Sensações táteis: quem não sabe que é ilusão precisa passar em Vontade para atravessar.", { r: 2 }], [5, "m", "Sustentada; ação livre para modificar a ilusão à vontade (sem novos aprimoramentos).", { du: "sustentada", r: 3 }]]);
RAMATormenta20Magias.def("curarFerimentos", "Curar Ferimentos", "D1", "evoc", 189, "padrao|toque|1 criatura|instantanea|",
  "Luz que recupera 2d8+2 PV na criatura tocada.",
  [[0, "T", "Alvo: 1 morto-vivo; causa 1d8 de luz (Vontade reduz à metade).", { alvo: "1 morto-vivo", res: "Vontade reduz à metade", substitui: 1 }], [1, "a", "+1d8+1 de cura."], [2, "o", "Também remove uma condição de fadiga."], [2, "m", "Alcance curto.", { al: "curto" }], [5, "m", "Alcance curto; alvo: criaturas escolhidas.", { al: "curto", alvo: "criaturas escolhidas" }]],
  { cura: "truque ? '0' : (2 + a1) + 'd8+' + (2 + a1)", dano: "truque ? '1d8' : '0'", tipo: "luz", luz: 1 });
RAMATormenta20Magias.def("despedacar", "Despedaçar", "D1", "evoc", 190, "padrao|curto|1 criatura ou objeto mundano Pequeno|instantanea|Fortitude parcial",
  "Som agudo: 1d8+2 de impacto (o dobro e ignorando RD em construto ou objeto mundano) e atordoado por 1 rodada (uma vez por cena). Fortitude reduz à metade e evita o atordoamento.",
  [[2, "a", "+1d8+2 de dano."], [2, "m", "Alvo: objeto mundano Médio.", { alvo: "objeto mundano Médio", r: 2 }], [5, "m", "Alvo: objeto mundano Grande.", { alvo: "objeto mundano Grande", r: 3 }], [9, "m", "Alvo: objeto mundano Enorme.", { alvo: "objeto mundano Enorme", r: 4 }], [14, "m", "Alvo: objeto mundano Colossal.", { alvo: "objeto mundano Colossal", r: 5 }], [5, "m", "Alcance pessoal; área: esfera de 6 m de raio (todas as criaturas e objetos mundanos).", { al: "pessoal", area: "esfera com 6m de raio" }]],
  { dano: "(1 + a0) + 'd8+' + (2 + 2 * a0)", tipo: "impacto", cond: "atordoado", metade: 1 });
RAMATormenta20Magias.def("detectarAmeacas", "Detectar Ameaças", "D1", "adiv", 190, "padrao|pessoal|area:esfera com 18m de raio|cena, até ser descarregada|",
  "Quando uma criatura hostil ou armadilha entra na área, você faz Percepção (CD do mestre). Passou: sabe a origem, a direção e a distância. Falhou: sabe só que há perigo.",
  [[1, "o", "Também descobre raça ou espécie e o poder pela aura (tênue até 6, moderada até 12, poderosa até 20, avassaladora acima)."], [2, "o", "Não fica surpreendido contra perigos detectados e tem +5 nas resistências contra armadilhas.", { r: 2 }]]);
RAMATormenta20Magias.def("disfarceIlusorio", "Disfarce Ilusório", "A1", "ilus", 191, "padrao|pessoal|você|cena|Vontade desacredita",
  "Muda sua aparência e a do equipamento (altura, peso, pele, voz…): +10 em Enganação para disfarce. Não dá habilidades nem muda o funcionamento dos itens.",
  [[0, "T", "Toque, 1 criatura, 1 semana: uma pequena alteração inofensiva e persistente na aparência.", { al: "toque", alvo: "1 criatura", du: "1 semana", substitui: 1 }], [1, "m", "Alcance curto; alvo: 1 objeto (+10 em Enganação para falsificação).", { al: "curto", alvo: "1 objeto" }], [2, "m", "Alcance curto; alvo: 1 criatura (involuntária anula com Vontade).", { al: "curto", alvo: "1 criatura" }], [2, "o", "Inclui odores e sensações: bônus de disfarce vira +20."], [3, "m", "Alcance curto; alvo: criaturas escolhidas, cada uma com aparência própria (involuntárias anulam com Vontade).", { al: "curto", alvo: "criaturas escolhidas", r: 2 }]],
  { efeitos: [{ t: "bonus", alvo: "pericia.enganacao", valor: "truque ? 0 : (a3 ? 20 : 10)", categoria: "magia", cond: "disfarce" }] });
RAMATormenta20Magias.def("enfeiticar", "Enfeitiçar", "A1", "encan", 191, "padrao|curto|1 humanoide|cena|Vontade anula",
  "O alvo fica enfeitiçado (p. 394). Alvo hostil ou em combate tem +5 na resistência. Ação hostil sua ou de aliados dissipa a magia.",
  [[2, "m", "Em vez do normal, sugere uma ação aceitável que o alvo cumpre (pode ter condição de gatilho); ao cumprir, a magia termina.", { substitui: 1 }], [5, "m", "Alvo: 1 espírito ou monstro.", { alvo: "1 espírito ou monstro", r: 3 }], [5, "m", "Afeta todos os alvos no alcance.", { alvo: "todos os alvos no alcance" }]],
  { cond: "enfeiticado" });
RAMATormenta20Magias.def("escudoDaFe", "Escudo da Fé", "D1", "abjur", 192, "reacao|curto|1 criatura|1 turno|",
  "Escudo místico momentâneo: +2 na Defesa.",
  [[1, "m", "Execução padrão, alcance toque, duração cena.", { ex: "padrao", al: "toque", du: "cena" }], [1, "o", "Também dá camuflagem leve contra ataques à distância."], [2, "a", "+1 na Defesa."], [2, "m", "Execução padrão, toque, cena; o alvo sofre metade do dano de ataques e efeitos e a outra metade vai para você (dissipa se ele sair do alcance curto).", { ex: "padrao", al: "toque", du: "cena", r: 2 }], [3, "m", "Duração 1 dia.", { du: "1 dia", r: 2 }]],
  { efeitos: [{ t: "bonus", alvo: "defesa", valor: "2 + a2", categoria: "magia" }] });
RAMATormenta20Magias.def("escuridao", "Escuridão", "U1", "necro", 193, "padrao|curto|1 objeto|cena|Vontade anula (veja texto)",
  "O objeto emana sombras num raio de 6 m: camuflagem leve por escuridão leve, que luz natural não ilumina. Guardar o objeto interrompe o efeito. Objeto de criatura involuntária: Vontade anula. Anula Luz.",
  [[1, "a", "+1,5 m de raio."], [2, "o", "Camuflagem total por escuridão total; bloqueia a visão."], [2, "m", "Alvo: 1 criatura, Fortitude parcial: cego pela cena (passou: 1 rodada).", { alvo: "1 criatura", res: "Fortitude parcial", substitui: 1, r: 2 }], [3, "m", "Duração 1 dia.", { du: "1 dia" }], [5, "m", "Pessoal: sombras cobrem você (+10 em Furtividade e camuflagem leve).", { al: "pessoal", alvo: "você", substitui: 1, r: 2 }]],
  { anula: "luz" });
RAMATormenta20Magias.def("explosaoDeChamas", "Explosão de Chamas", "A1", "evoc", 193, "padrao|pessoal|area:cone de 6m|instantanea|Reflexos reduz à metade",
  "Leque de chamas: 2d6 de dano de fogo nas criaturas da área.",
  [[0, "T", "Alcance curto, 1 objeto, Reflexos anula: acende vela, tocha ou fogueira, ou incendeia objeto inflamável com RD 0.", { al: "curto", alvo: "1 objeto", res: "Reflexos anula", substitui: 1 }], [1, "a", "+1d6 de dano."], [1, "m", "Reflexos parcial: quem falha também fica em chamas.", { res: "Reflexos parcial" }]],
  { dano: "truque ? '0' : (2 + a1) + 'd6'", tipo: "fogo", metade: 1 });
RAMATormenta20Magias.def("imagemEspelhada", "Imagem Espelhada", "A1", "ilus", 195, "padrao|pessoal|você|cena|",
  "Três cópias ilusórias imitam você: +6 na Defesa. Cada ataque que erra apaga uma cópia (–2 no bônus). O atacante precisa ver as cópias; se você estiver invisível ou ele de olhos fechados, não há bônus.",
  [[2, "a", "+1 cópia (+2 na Defesa)."], [2, "o", "Cada cópia destruída solta um clarão: quem a destruiu fica ofuscado por 1 rodada.", { r: 2 }]],
  { efeitos: [{ t: "bonus", alvo: "defesa", valor: "6 + 2 * a0 - 2 * contador", categoria: "magia" }], contador: "cópias destruídas" });
RAMATormenta20Magias.def("infligirFerimentos", "Infligir Ferimentos", "D1", "necro", 195, "padrao|toque|1 criatura|instantanea|Fortitude reduz à metade",
  "Energia negativa: 2d8+2 de dano de trevas (ou cura isso num morto-vivo). Anula Curar Ferimentos.",
  [[1, "o", "Quem falha também fica fraco pela cena."], [2, "a", "+1d8+1 de dano."], [2, "m", "Sem resistência: como parte da execução, faz um ataque corpo a corpo; se acertar, causa o dano do ataque e o da magia.", { res: "nenhuma" }], [5, "m", "Alcance curto; alvo: criaturas escolhidas.", { al: "curto", alvo: "criaturas escolhidas" }]],
  { dano: "(2 + a1)d8 + (2 + a1)", tipo: "trevas", metade: 1, anula: "curarFerimentos" });
RAMATormenta20Magias.def("lequeCromatico", "Leque Cromático", "A1", "ilus", 196, "padrao|pessoal|area:cone de 4,5m|instantanea|Vontade parcial",
  "Luzes brilhantes: animais e humanoides na área ficam atordoados por 1 rodada (uma vez por cena; Vontade anula esta parte) e ofuscados pela cena. Não afeta criaturas cegas.",
  [[2, "o", "Os afetados também ficam vulneráveis pela cena."], [2, "o", "Também afeta espíritos e monstros.", { r: 2 }], [5, "o", "Também afeta construtos, espíritos, monstros e mortos-vivos.", { r: 3 }]],
  { cond: "atordoado" });
RAMATormenta20Magias.def("luz", "Luz", "U1", "evoc", 197, "padrao|curto|1 objeto|cena|Vontade anula (veja texto)",
  "O objeto emite luz sem calor num raio de 6 m; guardá-lo interrompe a luz. Objeto de criatura involuntária: Vontade anula. Anula Escuridão.",
  [[1, "a", "+3 m de raio."], [2, "m", "Duração 1 dia.", { du: "1 dia" }], [2, "m", "Permanente; pó de rubi (T$ 50). Não combina com outros aprimoramentos.", { du: "permanente", mat: "pó de rubi (T$ 50)", sozinho: 1, r: 2 }], [0, "m", "Apenas arcanos — alvo: 1 criatura; lançada nos olhos, deixa ofuscado pela cena (não afeta cegos).", { alvo: "1 criatura", apenas: "arcana", substitui: 1 }], [2, "m", "Apenas arcanos — alcance longo: cria 4 globos de luz móveis (ação livre por rodada); cada um ilumina como tocha e quem ocupa o espaço de um fica ofuscado e sem camuflagem por escuridão ou invisibilidade.", { al: "longo", ef: "4 globos flutuantes de luz", apenas: "arcana", r: 2 }], [2, "o", "Apenas divinos — luz do sol: afeta quem sofre com luz solar; aliados na área estabilizam e ficam imunes a sangrando; inimigos ficam ofuscados.", { apenas: "divina", r: 2 }], [5, "m", "Apenas divinos — toque, 1 criatura: halo de luz dá +10 em Diplomacia e redução de trevas 10.", { al: "toque", alvo: "1 criatura", apenas: "divina", substitui: 1, r: 2 }]],
  { anula: "escuridao" });
RAMATormenta20Magias.def("nevoa", "Névoa", "U1", "conv", 200, "padrao|curto|ef:nuvem com 6m de raio e 6m de altura|cena|",
  "Névoa espessa: criaturas a até 1,5 m têm camuflagem leve; a partir de 3 m, camuflagem total. Vento forte dispersa em 4 rodadas; vendaval, em 1. Não funciona debaixo d'água.",
  [[1, "o", "Funciona debaixo d'água (nuvem de tinta)."], [2, "o", "Criaturas escolhidas ao lançar enxergam através da névoa.", { r: 2 }], [2, "o", "Cheiro horrível: no início do turno, quem está dentro (ou tem faro em alcance curto) faz Fortitude ou fica enjoado 1 rodada."], [2, "o", "Cáustica: no início do turno, quem está dentro sofre 2d4 de ácido."], [3, "a", "+2d4 de ácido (com o anterior).", { precisa: 3 }], [5, "o", "Quase sólida: deslocamento 3 m e –2 em ataques e dano dentro dela."]],
  { dano: "a3 ? (2 + 2 * a4) + 'd4' : '0'", tipo: "acido" });
RAMATormenta20Magias.def("orientacao", "Orientação", "D1", "adiv", 200, "padrao|curto|1 criatura|1 rodada|",
  "No próximo teste de perícia, o alvo rola dois dados e usa o melhor.",
  [[2, "m", "Duração cena: escolha um atributo; testes de perícia dele rolam dois dados (não ataque nem resistência).", { du: "cena", r: 2 }], [5, "m", "Duração cena: como acima, mas para atributos físicos ou mentais.", { du: "cena", r: 3 }], [5, "m", "Alvo: criaturas escolhidas.", { alvo: "criaturas escolhidas", r: 3 }]]);
RAMATormenta20Magias.def("perdicao", "Perdição", "D1", "necro", 201, "padrao|curto|criaturas escolhidas|cena|nenhuma",
  "Os alvos sofrem –1 em testes de ataque e rolagens de dano. Anula Bênção.",
  [[2, "a", "–1 adicional (limite pelo círculo máximo).", { lim: "circuloMax - 1" }]],
  { efeitosAlvo: [{ t: "bonus", alvo: "ataque", valor: "-1 - a0" }, { t: "bonus", alvo: "dano", valor: "-1 - a0" }], anula: "bencao" });
RAMATormenta20Magias.def("primorAtletico", "Primor Atlético", "A1", "trans", 201, "padrao|toque|1 criatura|cena|",
  "O alvo recebe +9 m de deslocamento e +10 em Atletismo.",
  [[1, "o", "+20 adicional em Atletismo para saltar (total +30)."], [1, "o", "Escala paredes e tetos sem testes (mãos livres; uma só se ficar parado) e não fica desprevenido ao escalar."], [1, "m", "Movimento, pessoal, instantânea: salta e pousa adjacente a uma criatura em alcance curto; um ataque corpo a corpo contra ela neste turno conta como investida e causa um dado extra da arma.", { ex: "movimento", al: "pessoal", alvo: "você", du: "instantanea", substitui: 1 }], [3, "o", "Testes de perícias de Força, Destreza ou Constituição rolam dois dados (não ataque nem resistência).", { r: 2 }]],
  { efeitos: [{ t: "bonus", alvo: "deslocamento", valor: 9, categoria: "magia" }, { t: "bonus", alvo: "pericia.atletismo", valor: 10, categoria: "magia" }] });
RAMATormenta20Magias.def("profanar", "Profanar", "D1", "necro", 202, "padrao|longo|area:esfera com 9m de raio|1 dia|",
  "Enche a área de energia negativa: dano de trevas é maximizado ali (e curas de trevas em mortos-vivos também). Não pode ser lançada onde há símbolo visível de outra divindade. Anula Consagrar.",
  [[1, "o", "Mortos-vivos na área recebem +2 na Defesa e em todos os testes."], [2, "a", "+1 nesses bônus (com o anterior; limite pelo círculo máximo).", { precisa: 0, lim: "circuloMax - 2" }], [9, "m", "Execução 1 hora; permanente; incenso e óleos (T$ 1.000).", { ex: "1 hora", du: "permanente", mat: "incenso e óleos (T$ 1.000)", r: 4 }]],
  { anula: "consagrar" });
RAMATormenta20Magias.def("protecaoDivina", "Proteção Divina", "D1", "abjur", 202, "padrao|toque|1 criatura|cena|",
  "Barreira invisível: +2 nos testes de resistência.",
  [[2, "a", "+1 no bônus."], [2, "m", "Reação, alcance curto, 1 rodada: +5 no próximo teste de resistência (acumula com o efeito básico).", { ex: "reacao", al: "curto", du: "1 rodada", substitui: 1 }], [2, "m", "Área: esfera de 3 m de raio; todos os aliados nela recebem o bônus.", { area: "esfera com 3m de raio", r: 2 }], [5, "o", "Imunidade a efeitos mentais e de medo.", { r: 3 }]],
  { efeitos: [{ t: "bonus", alvo: "resistencias", valor: "2 + a0", categoria: "magia" }] });
RAMATormenta20Magias.def("quedaSuave", "Queda Suave", "A1", "trans", 202, "reacao|curto|1 criatura ou objeto Grande ou menor|até chegar ao solo ou cena|",
  "O alvo cai a 18 m por rodada, sem sofrer dano. Num projétil em queda, ele causa metade do dano. Só funciona em queda livre.",
  [[0, "T", "Alvo: objeto Minúsculo; ação de movimento para levitá-lo até 4,5 m.", { alvo: "objeto Minúsculo", substitui: 1 }], [2, "m", "Alvo: até 10 criaturas ou objetos.", { alvo: "até 10 criaturas ou objetos" }], [2, "a", "+1 categoria de tamanho do alvo."]]);
RAMATormenta20Magias.def("raioDoEnfraquecimento", "Raio do Enfraquecimento", "A1", "necro", 202, "padrao|curto|1 criatura|cena|Fortitude parcial",
  "Falha: fatigado. Sucesso: vulnerável. Lançar de novo no mesmo alvo não o deixa exausto (efeitos de magia não se acumulam).",
  [[0, "T", "Toque, Fortitude anula: ao tocar, o alvo fica fatigado.", { al: "toque", res: "Fortitude anula", substitui: 1 }], [2, "m", "Falha: exausto. Sucesso: fatigado.", { r: 2 }], [5, "m", "Como o anterior, com alvo: criaturas escolhidas.", { alvo: "criaturas escolhidas", r: 3 }]],
  { cond: "fatigado" });
RAMATormenta20Magias.def("resistenciaAEnergia", "Resistência a Energia", "U1", "abjur", 204, "padrao|toque|1 criatura|cena|",
  "Escolha ácido, eletricidade, fogo, frio, luz ou trevas: o alvo recebe redução de dano 10 contra esse tipo.",
  [[2, "a", "+5 na redução."], [2, "m", "Duração 1 dia.", { du: "1 dia", r: 2 }], [5, "m", "Alcance curto; alvo: criaturas escolhidas.", { al: "curto", alvo: "criaturas escolhidas", r: 3 }], [5, "m", "RD contra todos os tipos listados.", { ef: "RD contra todos os tipos", r: 3 }], [9, "m", "Imunidade a um dos tipos listados.", { ef: "imunidade a um tipo", r: 4 }]],
  { escolha: ["acido", "eletricidade", "fogo", "frio", "luz", "trevas"], efeitos: [{ t: "rd", valor: "10 + 5 * a0", tipos: ["opcao"], fonteRd: "resistenciaAEnergia" }] });
RAMATormenta20Magias.def("santuario", "Santuário", "D1", "abjur", 205, "padrao|toque|1 criatura|cena|Vontade anula",
  "Quem tenta uma ação hostil contra o alvo faz Vontade; falhando, perde a ação e não tenta de novo na cena. Não protege de efeitos de área. Se o alvo fizer ação hostil, a magia se dissipa (cura e suporte são permitidos).",
  [[1, "o", "Escolha animal, construto ou morto-vivo: criaturas não inteligentes (Int –4 ou menor) desse tipo não percebem você."], [9, "o", "Também protege de efeitos de área (quem mira a área faz Vontade)."]]);
RAMATormenta20Magias.def("setaInfalivelDeTalude", "Seta Infalível de Talude", "A1", "evoc", 206, "padrao|medio|criaturas escolhidas|instantanea|",
  "Duas setas de energia que acertam automaticamente, 1d4+1 de essência cada, no mesmo alvo ou em alvos diferentes. Bônus de dano em magias (como Arcano de Batalha) vale para uma seta só.",
  [[2, "m", "Lanças de energia caem do céu: 1d8+1 de essência cada.", { r: 2 }], [2, "m", "Três setas/lanças.", { setas: 3 }], [4, "m", "Cinco setas/lanças.", { setas: 5, r: 2 }], [9, "m", "Dez setas/lanças.", { setas: 10, r: 4 }]],
  { dano: "a0 ? '1d8+1' : '1d4+1'", tipo: "essencia", projeteis: "a3 ? 10 : (a2 ? 5 : (a1 ? 3 : 2))", acertoAutomatico: 1 });
RAMATormenta20Magias.def("sono", "Sono", "A1", "encan", 207, "padrao|curto|1 humanoide|cena|Vontade parcial",
  "Falha: inconsciente e caído; em combate ou perigo, exausto por 1 rodada e depois fatigado. Sucesso: fatigado por 1d4 rodadas.",
  [[2, "o", "Quem falha em combate fica exausto por 1d4+1 rodadas."], [2, "m", "Alvo: 1 criatura.", { alvo: "1 criatura" }], [5, "m", "Afeta todos os alvos válidos escolhidos no alcance.", { alvo: "alvos válidos escolhidos no alcance" }]],
  { cond: "inconsciente" });
RAMATormenta20Magias.def("suporteAmbiental", "Suporte Ambiental", "D1", "abjur", 207, "padrao|toque|1 criatura|1 dia|",
  "Imune a calor e frio extremos, respira na água (ou no ar, se for aquático) e não sufoca em fumaça densa.",
  [[5, "m", "Alcance curto; alvo: criaturas escolhidas.", { al: "curto", alvo: "criaturas escolhidas" }]]);
RAMATormenta20Magias.def("teia", "Teia", "A1", "conv", 208, "padrao|curto|area:cubo com 6m de lado|cena|Reflexos anula",
  "Fibras pegajosas: quem falha fica enredado (ação padrão e Acrobacia ou Atletismo para se soltar). A área é terreno difícil. Inflamável: dano de fogo destrói a teia por onde passa, soltando as vítimas, mas deixando-as em chamas.",
  [[1, "o", "Quem falha também fica imóvel."], [2, "o", "No início do turno, quem está na área repete o teste de Reflexos.", { r: 2 }], [2, "a", "+1 cubo de 1,5 m."]],
  { cond: "enredado" });
RAMATormenta20Magias.def("toqueChocante", "Toque Chocante", "A1", "evoc", 209, "padrao|toque|1 criatura|instantanea|Fortitude reduz à metade",
  "2d8+2 de dano de eletricidade. Alvo com armadura de metal (ou muito metal) sofre –5 na resistência.",
  [[1, "a", "+1d8+1 de dano."], [2, "m", "Sem resistência: como parte da execução, faz um ataque corpo a corpo; se acertar, causa o dano do ataque e o da magia.", { res: "nenhuma" }], [2, "m", "Pessoal; área: esfera de 6 m de raio (todas as criaturas).", { al: "pessoal", area: "esfera com 6m de raio" }]],
  { dano: "(2 + a0)d8 + (2 + a0)", tipo: "eletricidade", metade: 1 });
RAMATormenta20Magias.def("trancaArcana", "Tranca Arcana", "A1", "abjur", 209, "padrao|toque|1 objeto Grande ou menor|permanente|",
  "Tranca porta, baú ou similar: +10 na CD de Força ou Ladinagem para abrir; você abre livremente.",
  [[0, "T", "Alcance curto: abre ou fecha um objeto Grande ou menor que não esteja trancado.", { al: "curto", substitui: 1 }], [1, "m", "Alcance curto, instantânea: abre portas, baús e janelas trancadas, presas ou barradas (dissipa Tranca Arcana) e afrouxa grilhões e correntes.", { al: "curto", du: "instantanea", substitui: 1 }], [5, "a", "+5 na CD para abrir."], [5, "m", "Alvo: 1 objeto de qualquer tamanho.", { alvo: "1 objeto de qualquer tamanho", r: 3 }]],
  { mat: "chave de bronze (T$ 25)" });
RAMATormenta20Magias.def("tranquilidade", "Tranquilidade", "D1", "encan", 210, "padrao|curto|1 animal ou humanoide|cena|Vontade parcial",
  "Falha: atitude indiferente (p. 259) e não pode fazer ações agressivas. Sucesso: –2 em ataques. Ação hostil contra o alvo ou aliados dele dissipa a magia.",
  [[1, "m", "Alvo: 1 criatura.", { alvo: "1 criatura" }], [1, "a", "+1 alvo.", { alvos: 1 }], [5, "m", "Alcance médio; alvo: criaturas escolhidas.", { al: "medio", alvo: "criaturas escolhidas", r: 3 }]]);
RAMATormenta20Magias.def("transmutarObjetos", "Transmutar Objetos", "A1", "trans", 210, "padrao|toque|matéria-prima (madeira, rocha, ossos…)|cena|",
  "Molda matéria bruta num objeto Pequeno ou menor de até T$ 25 (sem consumíveis nem mecanismos complexos). Reverte no fim da cena ou ao tocar chumbo. Anula Despedaçar.",
  [[0, "T", "1 objeto mundano Minúsculo, instantânea: colore, limpa, aquece, esfria ou conserta pequenas falhas (cura 1 PV do objeto); uma vez por dia por objeto.", { alvo: "1 objeto mundano Minúsculo", du: "instantanea", substitui: 1 }], [1, "m", "Toque, 1 construto, instantânea: cura 2d8 PV (+2 PM por +1d8).", { alvo: "1 construto", du: "instantanea", substitui: 1 }], [2, "a", "+1 categoria de tamanho do objeto."], [3, "a", "Preço máximo ×10 por vez."], [5, "m", "1 objeto mundano, instantânea: restaura todos os PV do objeto (dentro dos limites de tamanho e preço; não se foi destruído por completo).", { alvo: "1 objeto mundano", du: "instantanea", substitui: 1, r: 3 }], [9, "m", "Como o anterior, mas também afeta itens mágicos.", { alvo: "1 objeto (inclusive mágico)", du: "instantanea", substitui: 1 }]],
  { anula: "despedacar" });
RAMATormenta20Magias.def("visaoMistica", "Visão Mística", "U1", "adiv", 211, "padrao|pessoal|você|cena|",
  "Enxerga auras mágicas: detecta todas em alcance médio e sabe tudo sobre elas sem gastar ações. Ação de movimento: descobre se uma criatura em alcance médio lança magias e a aura do círculo mais alto dela.",
  [[1, "o", "Recebe visão no escuro."], [2, "m", "Duração 1 dia.", { du: "1 dia" }], [2, "o", "Também enxerga objetos e criaturas invisíveis (formas translúcidas)."]]);
RAMATormenta20Magias.def("vitalidadeFantasma", "Vitalidade Fantasma", "A1", "necro", 211, "padrao|pessoal|você|instantanea|",
  "Suga energia vital da terra: 2d10 PV temporários, que somem no fim da cena.",
  [[2, "a", "+1d10 nos PV temporários (ou no dano, com o aprimoramento seguinte)."], [5, "m", "Área: esfera de 6 m centrada em você, Fortitude reduz à metade: 1d10 de trevas nas criaturas vivas e PV temporários iguais ao dano total.", { area: "esfera com 6m de raio", res: "Fortitude reduz à metade", substitui: 1, r: 2 }]],
  { pvTemp: "a1 ? '0' : (2 + a0) + 'd10'", dano: "a1 ? (1 + a0) + 'd10' : '0'", tipo: "trevas", metade: 1 });
RAMATormenta20Magias.def("areaEscorregadia", "Área Escorregadia", "A1", "conv", 180, "padrao|curto|area:quadrado de 3m ou 1 objeto|cena|Reflexos (veja texto)",
  "Substância escorregadia: quem está na área faz Reflexos ou cai; depois, mover-se por ela exige Acrobacia CD 10. Num objeto, quem o segura faz Reflexos a cada uso ou o derruba.",
  [[1, "a", "+1 quadrado de 1,5 m."], [2, "m", "Acrobacia CD 15.", { cdAcrobacia: 15 }], [5, "m", "Acrobacia CD 20.", { cdAcrobacia: 20 }]],
  { cond: "caido" });
RAMATormenta20Magias.def("hipnotismo", "Hipnotismo", "A1", "encan", 194, "padrao|curto|1 animal ou humanoide|1d4 rodadas|Vontade anula",
  "Palavras e gestos ritmados deixam o alvo fascinado. Só afeta quem percebe você; em combate, o alvo tem +5 na resistência. Quem passa fica imune por um dia.",
  [[0, "T", "Duração 1 rodada: em vez de fascinado, pasmo (uma vez por cena).", { du: "1 rodada", substitui: 1 }], [1, "o", "Quem passa não percebe que foi alvo de magia."], [2, "m", "Alvo: animais ou humanoides escolhidos.", { alvo: "animais ou humanoides escolhidos" }], [2, "m", "Duração sustentada.", { du: "sustentada" }], [2, "o", "Também afeta espíritos e monstros.", { r: 2 }], [5, "o", "Também afeta construtos, espíritos, monstros e mortos-vivos.", { r: 3 }]],
  { cond: "fascinado" });
/* <<< js/tormenta20/magias-1.js */

/* >>> js/tormenta20/magias-2.js */
/* R.A.M.A. — Tormenta20 · magias de 2º círculo (Livro Básico, Jogo do Ano).
   Resumos do RAMA; formato descrito em js/tormenta20/magias.js. */
RAMATormenta20Magias.def("aliadoAnimal", "Aliado Animal", "D2", "encan", 178, "padrao|curto|1 animal prestativo|1 dia|",
  "Vínculo mental com um animal prestativo, que obedece mesmo arriscando a vida. Funciona como parceiro veterano de um tipo à sua escolha: ajudante, combatente, fortão, guardião, montaria ou perseguidor.",
  [[1, "m", "Alvo: 1 animal Minúsculo por 1 semana: leva um item ou mensagem a um local e espera lá, deixando só quem você escolheu pegar o que carrega.", { alvo: "1 animal Minúsculo", du: "1 semana", substitui: 1 }], [7, "m", "O parceiro é mestre.", { parceiro: "mestre", r: 3 }], [12, "m", "Alvo: 2 animais prestativos, parceiros de tipos diferentes (respeitando seu limite de parceiros).", { alvo: "2 animais prestativos", r: 4 }]],
  { parceiro: { nivel: "veterano", tipos: ["ajudante", "combatente", "fortao", "guardiao", "montaria", "perseguidor"] } });
RAMATormenta20Magias.def("alterarTamanho", "Alterar Tamanho", "A2", "trans", 179, "padrao|curto|1 objeto|1 dia|",
  "Aumenta ou diminui um item mundano em até três categorias e pode mudar a consistência (rígido ou flexível) sem alterar RD nem PV. Objeto de criatura involuntária: Vontade anula.",
  [[1, "a", "+1 alvo.", { alvos: 1 }], [2, "m", "Toque, 1 criatura: aumenta uma categoria de tamanho e ganha Força +2 (involuntária: Fortitude anula).", { al: "toque", alvo: "1 criatura", substitui: 1, efeitoAlvo: "aumentar" }], [3, "m", "Toque, 1 criatura: diminui uma categoria de tamanho e ganha Destreza +2 (involuntária: Fortitude anula).", { al: "toque", alvo: "1 criatura", substitui: 1, efeitoAlvo: "diminuir", r: 3 }], [7, "m", "Toque, 1 criatura, permanente, Fortitude anula: vira Minúsculo, Força –5 e deslocamentos 3 m.", { al: "toque", alvo: "1 criatura", du: "permanente", res: "Fortitude anula", substitui: 1, efeitoAlvo: "encolher", r: 4 }]],
  { efeitosPorOpcao: { aumentar: [{ t: "tamanhoPasso", valor: 1 }, { t: "bonus", alvo: "atr.for", valor: 2, categoria: "magia" }], diminuir: [{ t: "tamanhoPasso", valor: -1 }, { t: "bonus", alvo: "atr.des", valor: 2, categoria: "magia" }] } });
RAMATormenta20Magias.def("amarrasEtereas", "Amarras Etéreas", "A2", "conv", 179, "padrao|medio|1 criatura|cena|Reflexos anula",
  "Três laços de energia deixam o alvo agarrado. Ação padrão e Atletismo destrói um laço, mais um a cada 5 pontos acima da CD. Cada laço tem Defesa 10, 10 PV, RD 5 e imunidade a dano mágico; destruídos todos, a magia acaba. Afeta incorpóreos.",
  [[2, "a", "+1 alvo.", { alvos: 1 }], [2, "a", "+1 laço num alvo (limite pelo círculo máximo).", { lim: "circuloMax" }], [3, "o", "Cada laço cai com um único ataque, mas solta um choque de 1d8+1 de essência na criatura presa.", { r: 3 }]],
  { cond: "agarrado" });
RAMATormenta20Magias.def("aparenciaPerfeita", "Aparência Perfeita", "A2", "ilus", 180, "padrao|pessoal|você|cena|",
  "Aparência idealizada: Carisma +2 se já for 5 ou mais; senão, vira 5 (conta como bônus). +5 em Diplomacia e Enganação. Quem nota a mudança tende a desconfiar. No fim da cena, pode pagar o custo de novo (ação livre) para manter. Não dá PV nem PM extras.",
  [[1, "m", "Toque; alvo: 1 humanoide.", { al: "toque", alvo: "1 humanoide" }]],
  { efeitos: [{ t: "bonus", alvo: "atr.car", valor: "atr.car >= 5 ? 2 : 5 - atr.car", categoria: "magia", semPVPM: 1 }, { t: "bonus", alvo: "pericia.diplomacia", valor: 5, categoria: "magia" }, { t: "bonus", alvo: "pericia.enganacao", valor: 5, categoria: "magia" }] });
RAMATormenta20Magias.def("augurio", "Augúrio", "D2", "adiv", 181, "completa|pessoal|você|instantanea|",
  "Diz se uma ação em até uma hora trará felicidade, miséria, ambas ou nada. O mestre rola 1d6 em segredo: 1 falha e responde “nada”. Repetir sobre o mesmo assunto dá o primeiro resultado.",
  [[3, "m", "Execução 1 minuto: uma pergunta a uma divindade sobre algo em até um dia; com 2–6, recebe uma frase, profecia ou enigma.", { ex: "1 minuto", substitui: 1, r: 3 }], [7, "m", "Execução 10 minutos, duração 1 minuto: uma pergunta de sim/não/não sei por rodada (falha em cada uma responde “não sei”).", { ex: "10 minutos", du: "1 minuto", substitui: 1, r: 4 }], [7, "m", "O mestre rola 1d12 (falha só no 1).", { chance: "1d12" }], [12, "m", "O mestre rola 1d20 (falha só no 1).", { chance: "1d20" }]],
  { chanceFalha: "1d6" });
RAMATormenta20Magias.def("bolaDeFogo", "Bola de Fogo", "A2", "evoc", 182, "padrao|medio|area:esfera com 6m de raio|instantanea|Reflexos reduz à metade",
  "Explosão de 6d6 de dano de fogo em todas as criaturas e objetos soltos na área.",
  [[2, "a", "+2d6 de dano."], [2, "m", "Efeito: esfera flamejante de 1,5 m, duração cena: 3d6 em quem estiver no espaço dela (uma vez por rodada); ação de movimento para voá-la 9 m. Imune a dano, apagável com água.", { area: "", ef: "esfera flamejante Média", du: "cena", substitui: 1 }], [3, "m", "Duração 1 dia ou até descarregar: pedra flamejante (arremesso, alcance curto) que detona como reação, causando o dano da magia em esfera de 6 m.", { du: "1 dia ou até descarregar" }]],
  { dano: "a1 ? (3 + 2 * a0) + 'd6' : (6 + 2 * a0) + 'd6'", tipo: "fogo", metade: 1 });
RAMATormenta20Magias.def("campoDeForca", "Campo de Força", "A2", "abjur", 183, "padrao|pessoal|você|cena|",
  "Película protetora: 30 PV temporários.",
  [[1, "m", "Reação, instantânea: RD 30 contra o próximo dano.", { ex: "reacao", du: "instantanea", substitui: 1 }], [3, "m", "PV temporários ou RD viram 50.", { valor: 50, r: 3 }], [7, "m", "PV temporários ou RD viram 70.", { valor: 70, r: 4 }], [7, "m", "Alcance curto, outra criatura ou objeto solto Enorme ou menor, sustentada: esfera imóvel que nada atravessa (Reflexos evita ser preso, ao lançar e a cada concentração).", { al: "curto", alvo: "outra criatura ou objeto Enorme ou menor", du: "sustentada", substitui: 1, r: 4 }], [9, "m", "Como o anterior, e o conteúdo quase sem peso: ação livre por rodada para flutuar a esfera 9 m.", { al: "curto", alvo: "outra criatura ou objeto Enorme ou menor", du: "sustentada", substitui: 1, r: 4 }]],
  { pvTemp: "a0 ? '0' : (a2 ? '70' : (a1 ? '50' : '30'))" });
RAMATormenta20Magias.def("camuflagemIlusoria", "Camuflagem Ilusória", "A2", "ilus", 183, "padrao|toque|1 criatura|cena|",
  "A imagem do alvo fica nublada: camuflagem leve.",
  [[3, "m", "Sustentada: a chance de falha da camuflagem leve sobe para 50%.", { du: "sustentada" }], [7, "m", "Alcance curto; alvo: criaturas escolhidas.", { al: "curto", alvo: "criaturas escolhidas", r: 4 }]],
  { efeitos: [{ t: "camuflagem", valor: "a0 ? 50 : 20" }] });
RAMATormenta20Magias.def("condicao", "Condição", "D2", "adiv", 185, "padrao|curto|até 5 criaturas|cena|",
  "Você sabe posição e estado (PV atuais, condições, magias) dos alvos, a qualquer distância, até que morram ou mudem de plano.",
  [[1, "a", "+1 alvo.", { alvos: 1 }], [1, "m", "Duração 1 dia.", { du: "1 dia" }]]);
RAMATormenta20Magias.def("conjurarMortosVivos", "Conjurar Mortos-Vivos", "U2", "necro", 186, "completa|curto|ef:6 mortos-vivos|sustentada|",
  "Seis esqueletos capangas Médios de energia negativa. Ação de movimento: andam 9 m; ação padrão: cada um causa 1d6+2 de trevas num adjacente. For 2, Des 2, Defesa 18, 1 PV; falham em resistências e testes opostos; imunes a atordoamento, não letal, doença, encantamento, fadiga, frio, ilusão, paralisia, sono e veneno. Somem a 0 PV ou no fim da cena; só agem com ordem.",
  [[2, "a", "+1 morto-vivo."], [3, "m", "Carniçais: For 3, Des 3, Defesa 27; 1d8+3 de trevas mais perda de 1d8 PV por veneno e Fortitude ou paralisado 1 rodada (quem passa fica imune por um dia).", { tipoMorto: "carnical", r: 3 }], [7, "m", "Sombras: Des 4, Defesa 35, incorpóreas, 2d10 de trevas e Fortitude ou perde 1d4 PM; perdem a incorporeidade sob o sol.", { tipoMorto: "sombra", r: 4 }]],
  { capangas: "6 + a0" });
RAMATormenta20Magias.def("controlarFogo", "Controlar Fogo", "D2", "evoc", 187, "padrao|curto|veja texto|cena|",
  "Escolha um efeito. Chamejar: armas escolhidas (inclusive naturais e desarmado) causam +1d6 de fogo. Esquentar: 1 objeto sofre e causa 1d6 de fogo por rodada a quem o segura ou veste (ação completa para resfriar). Extinguir: apaga uma chama Grande ou menor, deixando fumaça (camuflagem leve, 3 m). Modelar: move uma chama Grande ou menor 9 m por rodada (ação livre), 2d6 de fogo em quem atravessar.",
  [[1, "m", "Sustentada, Reflexos reduz à metade — Labaredas: ação de movimento por rodada para lançar 4d6 de fogo num alvo em alcance curto da chama.", { du: "sustentada", res: "Reflexos reduz à metade", substitui: 1 }], [2, "a", "+1d6 de dano (menos no Chamejar)."], [3, "m", "Alvo: 1 criatura feita de fogo, lava ou magma, Fortitude parcial: falha vai a 0 PV; passa e sofre 5d6.", { alvo: "1 criatura de fogo, lava ou magma", res: "Fortitude parcial", substitui: 1 }]],
  { opcoes: ["chamejar", "esquentar", "extinguir", "modelar"], tipo: "fogo" });
RAMATormenta20Magias.def("controlarMadeira", "Controlar Madeira", "D2", "trans", 187, "padrao|medio|1 objeto de madeira Grande ou menor|cena|",
  "Escolha. Fortalecer: armas +1 passo de dano; escudos +2 na Defesa (melhoria, acumula com magias); itens de madeira +5 de RD e o dobro de PV. Modelar: muda a forma (sem mecanismos complexos nem consumíveis). Repelir: arma contra você erra sempre; portas se abrem; objetos que viriam em você desviam. Retorcer: porta emperra (Força CD 25), itens dão –5, escudo perde o bônus, barco afunda no fim da cena. Objeto de criatura involuntária: Vontade anula.",
  [[1, "m", "Pessoal, 1 dia: você vira uma árvore Grande (não fala nem age fisicamente; atacada, a magia acaba; Sobrevivência CD 30 percebe).", { al: "pessoal", alvo: "você", du: "1 dia", substitui: 1 }], [3, "m", "Área: quadrado de 9 m, cena: a vegetação fica afiada (terreno difícil e 1d6 de corte a cada 1,5 m percorrido).", { area: "quadrado com 9m de lado", du: "cena", substitui: 1 }], [7, "m", "Alvo Enorme ou menor.", { alvo: "1 objeto de madeira Enorme ou menor", r: 3 }], [12, "m", "Alvo Colossal ou menor.", { alvo: "1 objeto de madeira Colossal ou menor", r: 4 }]],
  { opcoes: ["fortalecer", "modelar", "repelir", "retorcer"] });
RAMATormenta20Magias.def("cranioVoadorDeVladislav", "Crânio Voador de Vladislav", "A2", "necro", 188, "padrao|medio|1 criatura|instantanea|Fortitude parcial",
  "Crânio de energia negativa: 4d8+4 de trevas e um grito que deixa abalados o alvo e os inimigos a até 3 m dele (já abalados ficam apavorados 1d4 rodadas). Passar reduz o dano à metade e evita a condição (os outros também testam).",
  [[2, "a", "+1d8+1 de dano."], [2, "a", "+1 alvo.", { alvos: 1 }]],
  { dano: "(4 + a0)d8 + (4 + a0)", tipo: "trevas", cond: "abalado", metade: 1 });
RAMATormenta20Magias.def("circuloDaJustica", "Círculo da Justiça", "D2", "abjur", 183, "completa|curto|area:esfera com 9m de raio|1 dia|Vontade parcial",
  "Criaturas na área sofrem –10 em Acrobacia, Enganação, Furtividade e Ladinagem e não podem mentir de propósito (podem ser evasivas). Quem passa na resistência sofre –5 e pode mentir.",
  [[1, "m", "Padrão, pessoal, cena, sem resistência: criaturas e objetos invisíveis em alcance curto ficam visíveis enquanto estiverem perto.", { ex: "padrao", al: "pessoal", alvo: "você", du: "cena", res: "nenhuma", substitui: 1 }], [3, "m", "Penalidade –10 para quem passa e –20 para quem falha.", { penalidade: 20, r: 4 }], [7, "m", "Permanente; balança de prata (T$ 5.000).", { du: "permanente", mat: "balança de prata (T$ 5.000)" }]]);
RAMATormenta20Magias.def("desesperoEsmagador", "Desespero Esmagador", "A2", "encan", 190, "padrao|pessoal|area:cone de 6m|instantanea|Vontade parcial",
  "Humanoides na área ficam fracos e frustrados até o fim da cena (1 rodada se passarem).",
  [[2, "m", "As condições viram debilitado e esmorecido.", { condicoes: "debilitado+esmorecido" }], [3, "o", "Afeta qualquer tipo de criatura."], [3, "o", "Quem falha também fica pasmo por 1 rodada (uma vez por cena).", { r: 3 }]],
  { cond: "fraco" });
RAMATormenta20Magias.def("dissiparMagia", "Dissipar Magia", "U2", "abjur", 191, "padrao|medio|1 criatura, 1 objeto mágico ou esfera de 3m de raio|instantanea|",
  "Encerra magias ativas (não as instantâneas). Em criatura ou área, faça Misticismo: dissipa as magias com CD igual ou menor. Num item mágico, ele vira mundano por 1d6 rodadas (Vontade anula).",
  [[12, "m", "Área: esfera de 9 m — disjunção: todas as magias na área são dissipadas e itens mágicos (menos os seus) viram mundanos pela cena (Vontade evita).", { area: "esfera com 9m de raio", alvo: "", substitui: 1, r: 5 }]],
  { testeMisticismo: 1 });
RAMATormenta20Magias.def("enxameDePestes", "Enxame de Pestes", "D2", "conv", 192, "completa|medio|ef:1 enxame Médio (quadrado de 1,5m)|sustentada|Fortitude reduz à metade",
  "Enxame de bichos à escolha que ocupa espaços alheios. No fim do seu turno, causa 2d12 de corte em quem estiver no espaço dele. Ação de movimento: move 12 m.",
  [[2, "a", "+1d12 de dano."], [3, "m", "Reflexos reduz à metade; criaturas maiores (gatos, guaxinins, kobolds…): 3d12 de corte, impacto ou perfuração.", { res: "Reflexos reduz à metade", enxame: "maior" }], [5, "a", "+1 enxame (não podem ocupar o mesmo espaço).", { r: 3 }], [7, "m", "Reflexos reduz à metade; enxame elemental: 5d12 de ácido, eletricidade, fogo ou frio.", { res: "Reflexos reduz à metade", enxame: "elemental", r: 4 }]],
  { dano: "(a3 ? 5 : (a1 ? 3 : 2)) + a0 + 'd12'", tipo: "corte", metade: 1 });
RAMATormenta20Magias.def("purificacao", "Purificação", "D2", "evoc", 202, "padrao|toque|1 criatura|instantanea|",
  "Remove uma destas condições: abalado, apavorado, alquebrado, atordoado, cego, confuso, debilitado, enjoado, envenenado, esmorecido, exausto, fascinado, fatigado, fraco, frustrado, lento, ofuscado, paralisado, pasmo ou surdo.",
  [[2, "o", "Também recupera todos os PV perdidos por veneno."], [2, "o", "Remove todas as condições listadas, não só uma."], [3, "o", "O alvo consegue soltar itens amaldiçoados que segura (a maldição continua)."], [7, "o", "Também dissipa magias e efeitos prejudiciais de encantamento, necromancia e transmutação.", { r: 3 }]],
  { removeCondicoes: ["abalado", "apavorado", "alquebrado", "atordoado", "cego", "confuso", "debilitado", "enjoado", "envenenado", "esmorecido", "exausto", "fascinado", "fatigado", "fraco", "frustrado", "lento", "ofuscado", "paralisado", "pasmo", "surdo"] });
RAMATormenta20Magias.def("esculpirSons", "Esculpir Sons", "A2", "ilus", 192, "padrao|medio|1 criatura ou objeto|cena|Vontade anula",
  "Omite ou transforma os sons do alvo (não cria sons nem idiomas que você não conhece); a escolha não muda depois. Conjurador com a voz muito alterada não lança magias.",
  [[2, "a", "+1 alvo (todos afetados da mesma forma).", { alvos: 1 }]]);
RAMATormenta20Magias.def("flechaAcida", "Flecha Ácida", "A2", "evoc", 193, "padrao|medio|1 criatura ou objeto|instantanea|Reflexos parcial",
  "Projétil de 4d6 de dano de ácido. Quem falha fica coberto de muco e sofre mais 2d6 de ácido no início dos dois próximos turnos. Objeto fora da posse de alguém sofre o dobro e ignora RD.",
  [[1, "o", "O muco corrói armadura ou escudo do alvo: –1 permanente no bônus de Defesa do item (consertável com Ofício)."], [2, "a", "+1 na redução de Defesa (com o anterior).", { precisa: 0 }], [2, "a", "+1d6 no dano inicial e por rodada."]],
  { dano: "(4 + a2)d6", porRodada: "(2 + a2)d6", tipo: "acido", metade: 0 });
RAMATormenta20Magias.def("fisicoDivino", "Físico Divino", "D2", "trans", 193, "padrao|toque|1 criatura|cena|",
  "+2 em Força, Destreza ou Constituição, à escolha (sem PV ou PM extras).",
  [[3, "m", "Alcance curto; alvo: criaturas escolhidas.", { al: "curto", alvo: "criaturas escolhidas" }], [3, "m", "+2 nos três atributos físicos.", { forca: "tres2", r: 3 }], [7, "m", "+4 no atributo escolhido.", { forca: "um4", r: 4 }], [12, "m", "+4 nos três atributos físicos.", { forca: "tres4", r: 5 }]],
  { escolha: ["for", "des", "con"], efeitos: [{ t: "bonus", alvo: "atr.opcao", valor: "a2 ? 4 : 2", categoria: "magia", semPVPM: 1, todos: "a1 || a3", valorTodos: "a3 ? 4 : 2", atributos: ["for", "des", "con"] }] });
RAMATormenta20Magias.def("invisibilidade", "Invisibilidade", "A2", "ilus", 195, "livre|pessoal|você|1 rodada|",
  "O alvo e o equipamento ficam invisíveis: camuflagem total, +10 em Furtividade contra ouvir, e quem não o vê fica desprevenido contra ele. Termina com ação hostil contra uma criatura (objetos soltos e dano indireto não contam). Luz nunca fica invisível.",
  [[1, "m", "Execução padrão, toque, 1 criatura ou objeto Grande ou menor.", { ex: "padrao", al: "toque", alvo: "1 criatura ou objeto Grande ou menor" }], [3, "m", "Duração cena.", { du: "cena", r: 3 }], [3, "m", "Sustentada: esfera de invisibilidade de 3 m que acompanha o alvo (não combina com outros aprimoramentos).", { du: "sustentada", sozinho: 1, r: 3 }], [7, "m", "Execução padrão, toque, 1 criatura; não se dissipa com ação hostil.", { ex: "padrao", al: "toque", alvo: "1 criatura", r: 4 }]],
  { cond: "invisivel", efeitos: [{ t: "estado", valor: "invisivel" }] });
RAMATormenta20Magias.def("ligacaoTelepatica", "Ligação Telepática", "A2", "adiv", 197, "padrao|toque|2 criaturas voluntárias|1 dia|",
  "Elo mental entre duas criaturas com Inteligência –4 ou maior (você pode ser uma): conversam sem idioma comum e a qualquer distância no mesmo mundo.",
  [[2, "a", "+1 alvo.", { alvos: 1 }], [3, "m", "Alvo: 1 criatura; ação de movimento para ver e ouvir pelos sentidos dela (involuntária: Vontade suprime por uma hora).", { alvo: "1 criatura", substitui: 1, r: 3 }]]);
RAMATormenta20Magias.def("localizacao", "Localização", "A2", "adiv", 197, "padrao|pessoal|area:esfera com 90m de raio|cena|",
  "Indica direção e distância da criatura ou objeto mais próximo do tipo pensado (geral ou específico; o específico exige imagem precisa, senão falha e os PM são gastos). Chumbo fino bloqueia.",
  [[0, "T", "Alvo: você; sabe onde fica o norte e tem +5 em Sobrevivência para se orientar.", { alvo: "você", substitui: 1 }], [5, "a", "Área ×10."]]);
RAMATormenta20Magias.def("mapear", "Mapear", "A2", "adiv", 198, "padrao|toque|superfície plana (mesa, papel)|cena|",
  "Uma fagulha queima na superfície um mapa da região (até um quadrado de 10 km; dentro de construções, o andar atual). Lugar conhecido: mapa completo; desconhecido: esboço com um ponto de referência e um local de interesse definidos pelo mestre.",
  [[3, "m", "Alvo: 1 criatura, 1 hora: ela sabe o caminho mais direto para entrar ou sair de um lugar (não acha criaturas nem objetos).", { alvo: "1 criatura", du: "1 hora", substitui: 1 }]]);
RAMATormenta20Magias.def("marcaDaObediencia", "Marca da Obediência", "U2", "encan", 198, "padrao|toque|1 criatura|cena|Vontade anula",
  "Grava uma marca com uma ordem específica (sem ordens genéricas nem suicidas), que o alvo cumpre usando todas as ações. A cada rodada, pode fazer Vontade para dissipar.",
  [[3, "m", "Duração 1 dia; fora de combate, o teste é a cada hora.", { du: "1 dia", r: 3 }], [3, "o", "Cada teste de Vontade falho causa 3d6 de dano psíquico.", { r: 3 }]]);
RAMATormenta20Magias.def("menteDivina", "Mente Divina", "D2", "adiv", 198, "padrao|toque|1 criatura|cena|",
  "+2 em Inteligência, Sabedoria ou Carisma, à escolha (sem PV, PM ou perícias extras).",
  [[3, "m", "Alcance curto; alvo: criaturas escolhidas.", { al: "curto", alvo: "criaturas escolhidas" }], [3, "m", "+2 nos três atributos mentais.", { forca: "tres2", r: 3 }], [7, "m", "+4 no atributo escolhido.", { forca: "um4", r: 4 }], [12, "m", "+4 nos três atributos mentais.", { forca: "tres4", r: 5 }]],
  { escolha: ["int", "sab", "car"], efeitos: [{ t: "bonus", alvo: "atr.opcao", valor: "a2 ? 4 : 2", categoria: "magia", semPVPM: 1, todos: "a1 || a3", valorTodos: "a3 ? 4 : 2", atributos: ["int", "sab", "car"] }] });
RAMATormenta20Magias.def("metamorfose", "Metamorfose", "A2", "trans", 198, "padrao|pessoal|você|cena|",
  "Muda sua forma e o equipamento para qualquer criatura: +20 em Enganação para disfarce. Forma humanoide: pode trocar o tipo de dano das armas e mudar uma categoria de tamanho. Outras formas: uma Forma Selvagem básica do druida (armas naturais e bônus dela), sem atacar com armas, falar ou lançar magias.",
  [[1, "o", "A forma ganha faro, visão na penumbra ou visão no escuro."], [3, "o", "A forma ganha percepção às cegas.", { r: 3 }], [3, "m", "Toque, 1 criatura, Vontade anula.", { al: "toque", alvo: "1 criatura", res: "Vontade anula" }], [3, "m", "Alcance médio, 1 criatura, Vontade anula: vira algo inofensivo (não ataca, fala nem lança magias; deslocamento 3 m; Defesa 10); repete Vontade no início do turno.", { al: "medio", alvo: "1 criatura", res: "Vontade anula", substitui: 1, r: 3 }], [5, "m", "Pode escolher uma Forma Selvagem aprimorada.", { forma: "aprimorada", r: 3 }], [9, "m", "Pode escolher uma Forma Selvagem superior.", { forma: "superior", r: 4 }], [12, "o", "No início de cada turno, pode mudar de forma de novo (ação livre).", { r: 5 }]],
  { efeitos: [{ t: "bonus", alvo: "pericia.enganacao", valor: 20, categoria: "magia", cond: "disfarce" }], formaSelvagem: "a5 ? 'superior' : (a4 ? 'aprimorada' : 'basica')" });
RAMATormenta20Magias.def("miasmaMefitico", "Miasma Mefítico", "D2", "necro", 199, "padrao|medio|area:nuvem com 6m de raio|instantanea|Fortitude (veja texto)",
  "Emanações letais: 5d6 de dano de ácido e enjoado por 1 rodada. Passar reduz à metade e evita a condição.",
  [[0, "T", "Toque, 1 criatura com 0 PV ou menos, Fortitude anula; pó de ônix (T$ 10): falhando, ela morre e você ganha +2 na CD das suas magias por um dia; passando, fica imune por um dia.", { al: "toque", alvo: "1 criatura com 0 PV ou menos", area: "", res: "Fortitude anula", mat: "pó de ônix (T$ 10)", substitui: 1 }], [2, "a", "+1d6 de dano."], [3, "m", "Dano de trevas.", { tipoDano: "trevas" }]],
  { dano: "truque ? '0' : (5 + a1) + 'd6'", tipo: "acido", cond: "enjoado", metade: 1 });
RAMATormenta20Magias.def("montariaArcana", "Montaria Arcana", "A2", "conv", 199, "padrao|curto|ef:criatura conjurada|1 dia|",
  "Convoca um cavalo (ou pônei) de guerra, parceiro veterano, que atravessa terreno difícil sem redução. Você pode usar Misticismo no lugar de Cavalgar com ela (contando como treinado).",
  [[1, "o", "Animais em alcance curto dela fazem Vontade: passam e ficam abalados pela cena; falham e ficam apavorados 1d4 rodadas, depois abalados."], [3, "m", "Permanente, com –3 PM máximos enquanto durar.", { du: "permanente", penalidadePM: 3 }], [3, "a", "+1 categoria de tamanho (Enorme leva duas criaturas; Colossal, seis)."], [3, "m", "Parceiro mestre.", { parceiro: "mestre", r: 3 }]],
  { parceiro: { nivel: "veterano", tipos: ["montaria"] } });
RAMATormenta20Magias.def("oracao", "Oração", "D2", "encan", 200, "padrao|curto|todas as criaturas (veja texto)|sustentada|",
  "Você e aliados no alcance recebem +2 em testes de perícia e rolagens de dano; inimigos no alcance sofrem –2. Acumula com outras magias. Componente: T$ 20 por PM em incenso ou oferendas.",
  [[2, "a", "+1 nos bônus (limite pelo círculo máximo).", { lim: "circuloMax - 2" }], [2, "a", "–1 nas penalidades (limite pelo círculo máximo).", { lim: "circuloMax - 2" }], [7, "m", "Alcance médio.", { al: "medio", r: 3 }], [12, "m", "Duração cena.", { du: "cena", r: 4 }]],
  { matPorPM: 20, efeitos: [{ t: "bonus", alvo: "pericias", valor: "2 + a0", categoria: "magia", cumulativo: 1 }, { t: "bonus", alvo: "dano", valor: "2 + a0", categoria: "magia", cumulativo: 1 }], efeitosInimigos: [{ t: "bonus", alvo: "pericias", valor: "-2 - a1" }, { t: "bonus", alvo: "dano", valor: "-2 - a1" }] });
RAMATormenta20Magias.def("raioSolar", "Raio Solar", "D2", "evoc", 203, "padrao|pessoal|area:linha de 30m|instantanea|Reflexos (veja texto)",
  "Rajada de energia positiva: 4d8 de dano de luz (4d12 em mortos-vivos) e ofuscado por 1 rodada. Passar reduz à metade e evita a condição.",
  [[0, "T", "Duração cena, sem resistência: facho de luz que ilumina a área; ação livre por rodada para mudar a direção.", { du: "cena", res: "nenhuma", substitui: 1 }], [2, "a", "+1d8 de dano ou cura (+1d12 em mortos-vivos)."], [3, "o", "Criaturas vivas escolhidas na área curam 4d8 PV; as demais sofrem o dano."], [3, "o", "Quem falha fica cego por 1d4 rodadas."]],
  { dano: "truque ? '0' : (4 + a1) + 'd8'", danoMortoVivo: "(4 + a1)d12", cura: "a2 ? (4 + a1) + 'd8' : '0'", tipo: "luz", cond: "ofuscado", metade: 1 });
RAMATormenta20Magias.def("refugio", "Refúgio", "A2", "abjur", 203, "completa|curto|ef:domo com 6m de raio|1 dia|",
  "Domo imóvel, quase opaco por fora e transparente por dentro: protege de calor, frio e forças pequenas (não de dano) e dá camuflagem total contra ataques de fora. Entra-se e sai-se livremente; descansar dentro dá recuperação normal.",
  [[1, "o", "Fumaça espessa nas bordas: quem está fora não vê nem ouve o interior; bloqueia adivinhação."], [3, "m", "Cabana para 10 criaturas Médias, com mobília: descanso confortável. Porta e janelas (15 PV, RD 5, com Tranca Arcana); paredes 200 PV, RD 5.", { ef: "cabana", substitui: 1, descanso: "confortavel" }], [3, "m", "Espaço extradimensional (caverna escura para 10 criaturas Médias) com entrada desenhada num objeto fixo; isolado do mundo real, com uma janela de 1 m para observar.", { ef: "espaço extradimensional", substitui: 1, descanso: "normal", r: 3 }], [9, "m", "Mansão extradimensional para 100 criaturas, com comida e dez servos fantasmagóricos: descanso luxuoso. Porta de luz, só os escolhidos passam.", { ef: "mansão extradimensional", substitui: 1, descanso: "luxuosa", r: 4 }]],
  { descanso: "normal" });
RAMATormenta20Magias.def("relampago", "Relâmpago", "A2", "evoc", 203, "padrao|pessoal|area:linha de 30m|instantanea|Reflexos reduz à metade",
  "Raio de 6d6 de dano de eletricidade em todas as criaturas e objetos soltos na linha.",
  [[2, "a", "+2d6 de dano."], [3, "m", "Alvo: criaturas escolhidas; um relâmpago para cada, 6d6 de eletricidade.", { area: "", alvo: "criaturas escolhidas", r: 3 }]],
  { dano: "(6 + 2 * a0)d6", tipo: "eletricidade", metade: 1 });
RAMATormenta20Magias.def("rogarMaldicao", "Rogar Maldição", "D2", "necro", 204, "padrao|curto|1 criatura|sustentada|Fortitude anula",
  "Escolha uma maldição. Debilidade: esmorecido, não se comunica nem lança magias (ainda segue e ajuda aliados de forma simplória). Doença: instantânea, contrai uma doença à sua escolha sem incubação. Fraqueza: debilitado e lento. Isolamento: perde um sentido (visão: cego; audição: surdo; olfato ou paladar: sem faro; tato: caído e sem levantar). O mestre aprova maldições inventadas.",
  [[3, "a", "+1 efeito à escolha.", { r: 3 }], [7, "m", "Permanente, Fortitude parcial (passou: sofre a maldição por 1 rodada).", { du: "permanente", res: "Fortitude parcial", r: 4 }]],
  { opcoes: ["debilidade", "doenca", "fraqueza", "isolamento"] });
RAMATormenta20Magias.def("runaDeProtecao", "Runa de Proteção", "U2", "abjur", 204, "1 hora|toque|uma área de 6m de raio|permanente até ser descarregada|varia (veja texto)",
  "Runa quase invisível numa superfície fixa. Quando alguém entra na área, explode: 6d6 de dano (ácido, eletricidade, fogo, frio, luz ou trevas, escolhido ao lançar) em todos a até 6 m; quem ativou não tem teste, os demais fazem Reflexos para metade. Pode ter condições de ativação e palavra de passe. Investigação encontra e Ladinagem desarma. Componente: pó de diamante (T$ 200).",
  [[1, "a", "+2d6 de dano."], [1, "m", "Pessoal, em você: grave uma magia de 1º círculo que você conhece (padrão ou menos) com uma condição; cumprida, lance-a como reação. Uma runa no corpo por vez.", { al: "pessoal", alvo: "você", substitui: 1 }], [3, "m", "Como o anterior, com magias de 2º círculo.", { al: "pessoal", alvo: "você", substitui: 1, r: 3 }]],
  { dano: "(6 + 2 * a0)d6", tipo: "opcao", escolha: ["acido", "eletricidade", "fogo", "frio", "luz", "trevas"], mat: "pó de diamante (T$ 200)", metade: 1 });
RAMATormenta20Magias.def("saltoDimensional", "Salto Dimensional", "A2", "conv", 205, "padrao|curto|você|instantanea|",
  "Teletransporta você para um ponto no alcance, mesmo sem vê-lo. Depois de chegar, não age até a rodada seguinte. Sem espaço livre, surge no vazio mais próximo.",
  [[1, "m", "Alcance médio.", { al: "medio" }], [1, "a", "+1 criatura voluntária que você esteja tocando.", { alvos: 1 }], [2, "m", "Reação: +5 na Defesa e em Reflexos contra um ataque ou efeito; depois, salta 1,5 m.", { ex: "reacao", substitui: 1 }], [3, "m", "Alcance longo.", { al: "longo" }]]);
RAMATormenta20Magias.def("servosInvisiveis", "Servos Invisíveis", "A2", "conv", 206, "padrao|longo|ef:criaturas conjuradas|cena|",
  "Até três servos invisíveis e silenciosos para tarefas simples (arrumar, montar acampamento — p. 123). Gastar um servo dá +2 não cumulativo num teste de perícia (não ataque nem resistência). Não lutam e falham em qualquer resistência ou teste oposto, sendo destruídos.",
  [[2, "a", "+1 servo."], [3, "o", "Os servos fazem uma tarefa por você: passam num teste de perícia com CD até seu nível +2 por servo, no tempo normal do uso.", { r: 3 }]],
  { servos: "3 + a0" });
RAMATormenta20Magias.def("silencio", "Silêncio", "D2", "ilus", 206, "padrao|medio|area:esfera com 6m de raio|sustentada|",
  "Nenhum som na área: criaturas nela ficam surdas e, como magias exigem palavras, normalmente não se lança magia ali.",
  [[1, "m", "Alvo: 1 objeto que emana silêncio em 3 m (objeto de involuntária: Vontade anula).", { area: "", alvo: "1 objeto", substitui: 1 }], [2, "m", "Duração cena: nenhum som sai da área, mas dentro dela fala-se, ouve-se e lança-se magia normalmente.", { du: "cena", substitui: 1 }]],
  { cond: "surdo" });
RAMATormenta20Magias.def("socoDeArsenal", "Soco de Arsenal", "D2", "conv", 206, "padrao|medio|1 criatura|instantanea|Fortitude parcial",
  "Golpe à distância: 4d6 + sua Força de dano de impacto e empurra 3 m. Passar reduz à metade e evita o empurrão.",
  [[1, "m", "Pessoal, cena, sem resistência: seu alcance natural corpo a corpo aumenta 3 m.", { al: "pessoal", alvo: "você", du: "cena", res: "nenhuma", substitui: 1 }], [2, "a", "+1d6 de dano."], [4, "a", "+3 m de empurrão."], [5, "m", "Dano de essência.", { tipoDano: "essencia" }]],
  { dano: "(4 + a1)d6 + atr.for", tipo: "impacto", metade: 1, empurrao: "3 + 3 * a2" });
RAMATormenta20Magias.def("soproDasUivantes", "Sopro das Uivantes", "A2", "evoc", 207, "padrao|pessoal|area:cone de 9m|instantanea|Fortitude parcial",
  "Ar gélido: 4d6 de dano de frio (Fortitude reduz à metade). Criaturas Médias ou menores que falham ficam caídas e são empurradas 6 m; batendo numa parede ou objeto sólido, param e sofrem +2d6 de impacto.",
  [[2, "a", "+2d6 de frio."], [3, "a", "+1 categoria no tamanho máximo afetado.", { r: 3 }]],
  { dano: "(4 + 2 * a0)d6", tipo: "frio", cond: "caido", metade: 1 });
RAMATormenta20Magias.def("sussurrosInsanos", "Sussurros Insanos", "A2", "encan", 207, "padrao|curto|1 humanoide|cena|Vontade anula",
  "Palavras desconexas deixam o alvo confuso.",
  [[2, "a", "+1 alvo.", { alvos: 1 }], [3, "m", "Alvo: 1 criatura.", { alvo: "1 criatura" }], [12, "m", "Alvo: criaturas escolhidas.", { alvo: "criaturas escolhidas", r: 5 }]],
  { cond: "confuso" });
RAMATormenta20Magias.def("tempestadeDivina", "Tempestade Divina", "D2", "evoc", 208, "completa|longo|area:cilindro com 15m de raio e 15m de altura|sustentada|",
  "Só ao ar livre. Vendaval: ataques à distância –5, chamas apagam e névoas se dissipam. Pode gerar chuva (–5 em Percepção), neve (como chuva e terreno difícil) ou granizo (como chuva e 1 de impacto por rodada no início dos seus turnos).",
  [[1, "o", "Uma vez por rodada, ação padrão: um raio cai num alvo na área, 3d8 de eletricidade (Reflexos reduz à metade)."], [2, "a", "+1d8 no dano dos raios (com o anterior).", { precisa: 0 }], [3, "o", "Chuva grossa: revela invisíveis, Médios ou menores ficam lentos e voadores fazem Atletismo por rodada ou caem."], [3, "o", "Granizo causa 2d6 por rodada."], [3, "o", "Neve causa 2d6 de frio no início dos turnos de quem está na área."], [3, "m", "Área: cilindro de 90 m de raio e 90 m de altura.", { area: "cilindro com 90m de raio e 90m de altura" }]],
  { dano: "a0 ? (3 + a1) + 'd8' : '0'", tipo: "eletricidade", opcoes: ["chuva", "neve", "granizo"] });
RAMATormenta20Magias.def("toqueVampirico", "Toque Vampírico", "A2", "necro", 209, "padrao|toque|1 criatura|instantanea|Fortitude reduz à metade",
  "6d6 de dano de trevas; você recupera PV iguais à metade do dano causado.",
  [[2, "m", "Sem resistência: como parte da execução, faz um ataque corpo a corpo; se acertar, causa o dano do ataque e o da magia e recupera metade do dano da magia.", { res: "nenhuma" }], [2, "a", "+2d6 de dano."], [2, "m", "Pessoal, cena: a cada rodada, ação padrão para tocar 1 criatura e causar 3d6, recuperando metade.", { al: "pessoal", alvo: "você", du: "cena", substitui: 1, r: 3 }]],
  { dano: "a2 ? '3d6' : (6 + 2 * a1) + 'd6'", tipo: "trevas", metade: 1, drenoMetade: 1 });
RAMATormenta20Magias.def("velocidade", "Velocidade", "A2", "trans", 210, "padrao|curto|1 criatura|sustentada|",
  "O alvo ganha uma ação padrão ou de movimento extra por turno (não para lançar magias nem ativar engenhocas).",
  [[0, "m", "Duração cena; a ação extra é só de movimento. Uma ação extra por turno por Velocidade.", { du: "cena" }], [7, "m", "Alvo: criaturas escolhidas no alcance.", { alvo: "criaturas escolhidas", r: 4 }], [7, "m", "Pessoal: a ação extra também serve para lançar magias e ativar engenhocas.", { al: "pessoal", alvo: "você", r: 4 }]],
  { efeitos: [{ t: "acaoExtra", valor: "a0 ? 'movimento' : 'padraoOuMovimento'" }] });
RAMATormenta20Magias.def("vestimentaDaFe", "Vestimenta da Fé", "D2", "abjur", 210, "padrao|toque|1 armadura, escudo ou vestuário|1 dia|",
  "+2 no bônus de Defesa de uma armadura ou escudo; num vestuário, +2 na Defesa (não cumulativo com armadura). Conta como bônus de encanto.",
  [[3, "o", "O item dá o mesmo bônus nos testes de resistência.", { r: 3 }], [4, "a", "+1 no bônus."], [7, "o", "O item também dá redução de dano 5.", { r: 4 }]],
  { efeitos: [{ t: "bonus", alvo: "defesa", valor: "2 + a1", categoria: "encanto" }, { t: "bonus", alvo: "resistencias", valor: "a0 ? 2 + a1 : 0", categoria: "encanto" }, { t: "rd", valor: "a2 ? 5 : 0", fonteRd: "vestimentaDaFe" }] });
RAMATormenta20Magias.def("vozDivina", "Voz Divina", "D2", "adiv", 211, "padrao|pessoal|você|cena|",
  "Conversa com criaturas de qualquer tipo, mesmo sem idioma ou fala, dentro dos limites da Inteligência delas. A atitude não muda, mas Diplomacia funciona.",
  [[1, "o", "Faz um cadáver responder perguntas (respostas curtas e enigmáticas, só o que sabia em vida; uma vez por corpo; não funciona sem cabeça)."], [1, "o", "Fala com plantas e rochas (percepção limitada, respostas simples)."]]);
RAMATormenta20Magias.def("globoDaVerdadeDeGwen", "Globo da Verdade de Gwen", "D2", "adiv", 194, "padrao|curto|ef:1 globo|cena|",
  "Globo flutuante e intangível de 50 cm que mostra, para todos verem, uma cena vista até uma semana atrás por você ou por uma criatura que você toque (ao responder a uma pergunta; ela pode anular com Vontade).",
  [[1, "m", "Cena de até um mês atrás.", { prazo: "mes" }], [2, "m", "Cena de até um ano atrás.", { prazo: "ano" }], [2, "o", "Tocando um cadáver, mostra a última cena que ele viu."], [4, "m", "Alcance longo; 10 globos com a mesma cena.", { al: "longo", ef: "10 globos" }]]);
/* <<< js/tormenta20/magias-2.js */

/* >>> js/tormenta20/magias-3.js */
/* R.A.M.A. — Tormenta20 · magias de 3º círculo (Livro Básico, Jogo do Ano).
   Resumos do RAMA; formato descrito em js/tormenta20/magias.js. */
RAMATormenta20Magias.def("anularALuz", "Anular a Luz", "D3", "necro", 180, "padrao|pessoal|area:esfera com 6m de raio|veja texto|",
  "Onda de escuridão: dissipa magias de até 3º círculo na área se você passar em Religião contra a CD de cada uma; aliados na área ganham +4 na Defesa até o fim da cena; inimigos ficam enjoados 1d4 rodadas (uma vez por cena). Anula Dispersar as Trevas.",
  [[2, "a", "+1 no bônus de Defesa."], [4, "m", "Dissipa magias de até 4º círculo.", { circuloDissipa: 4, r: 4 }], [9, "m", "Dissipa magias de até 5º círculo.", { circuloDissipa: 5, r: 5 }]],
  { anula: "dispersarAsTrevas", efeitosAliados: [{ t: "bonus", alvo: "defesa", valor: "4 + a0", categoria: "magia" }], testeReligiao: 1 });
RAMATormenta20Magias.def("banimento", "Banimento", "D3", "abjur", 182, "1d3+1 rodadas|curto|1 criatura|instantanea|Vontade parcial",
  "Expulsa uma criatura não nativa de Arton para um lugar aleatório do mundo de origem; morto-vivo vai a 0 PV. Passando, fica enjoado 1d4 rodadas. Cada item que se oponha ao alvo (a critério do mestre) dá +2 na CD.",
  [[0, "m", "Sem resistência: devolve automaticamente uma criatura conjurada ao plano de origem.", { res: "nenhuma", substitui: 1 }]],
  { cdPorItem: 2 });
RAMATormenta20Magias.def("colunaDeChamas", "Coluna de Chamas", "D3", "evoc", 184, "padrao|longo|area:cilindro com 3m de raio e 30m de altura|instantanea|Reflexos reduz à metade",
  "Pilar de fogo sagrado: 6d6 de dano de fogo mais 6d6 de luz nas criaturas e objetos soltos da área.",
  [[1, "a", "+1d6 de fogo."], [1, "a", "+1d6 de luz."]],
  { dano: "(6 + a0)d6", tipo: "fogo", danoExtra: { dados: "(6 + a1)d6", tipo: "luz" }, metade: 1 });
RAMATormenta20Magias.def("comunhaoComANatureza", "Comunhão com a Natureza", "D3", "adiv", 184, "completa|pessoal|você|1 dia|",
  "Intuições sobre a região (um dia de viagem): 6d4 dados de auxílio. Em testes de perícia em áreas naturais, gaste 2d4 (+2d4 por círculo acima do 3º que você lança) como bônus. Termina sem dados.",
  [[1, "m", "Execução 1 minuto, instantânea: descobre 1d4+1 informações sobre terreno, animais, vegetais, minerais, cursos d'água e criaturas antinaturais da região.", { ex: "1 minuto", du: "instantanea", substitui: 1 }], [3, "a", "+2 dados de auxílio."], [4, "m", "Dados de auxílio viram d6.", { dado: "d6" }], [8, "m", "Dados de auxílio viram d8.", { dado: "d8" }]],
  { auxilio: { quantidade: "6 + 2 * a1", dado: "a3 ? 'd8' : (a2 ? 'd6' : 'd4')", porUso: "2 + 2 * (circuloMax - 3)", natural: 1 } });
RAMATormenta20Magias.def("contatoExtraplanar", "Contato Extraplanar", "A3", "adiv", 186, "completa|pessoal|você|1 dia|",
  "Pacto com uma entidade de outro plano: 6d6 dados de auxílio. Em testes de perícia, gaste 1d6 (+1d6 por círculo acima do 3º que você lança) como bônus; cada 6 rolado suga 1 PM. Termina sem dados, sem PM ou no fim do dia.",
  [[2, "a", "+1 dado de auxílio."], [8, "m", "Dados viram d12; cada 12 rolado suga 2 PM.", { dado: "d12", r: 4 }]],
  { auxilio: { quantidade: "6 + a0", dado: "a1 ? 'd12' : 'd6'", porUso: "1 + (circuloMax - 3)", suga: "a1 ? '12:2' : '6:1'" } });
RAMATormenta20Magias.def("controlarTerra", "Controlar Terra", "D3", "trans", 188, "padrao|longo|area:9 cubos com 1,5m de lado|instantanea|veja texto",
  "Escolha. Amolecer: num teto ou coluna, desabamento de 10d6 de impacto (Reflexos reduz à metade); num piso, terreno difícil de areia ou argila. Modelar: objetos simples Enormes ou menores de pedra ou argila (passagens, paredes com cobertura total, RD 8 e 50 PV a cada 3 m). Solidificar: lama ou areia viram terra ou pedra e quem pisa nela fica agarrado (ação padrão e Acrobacia ou Atletismo para soltar).",
  [[1, "a", "+2 cubos de 1,5 m."], [1, "m", "Pessoal, 1 dia: você se funde a uma superfície de pedra, terra, argila ou areia adjacente (sai com ação livre; se o trecho for destruído, sofre 10d6 de impacto).", { al: "pessoal", alvo: "você", du: "1 dia", substitui: 1 }]],
  { opcoes: ["amolecer", "modelar", "solidificar"], dano: "10d6", tipo: "impacto" });
RAMATormenta20Magias.def("controlarAgua", "Controlar Água", "D3", "trans", 186, "padrao|longo|area:esfera com 30m de raio|cena|veja texto",
  "Escolha. Congelar: a água mundana congela e quem nada fica imóvel (ação padrão e Atletismo ou Acrobacia para escapar). Derreter: gelo vira água. Enchente: o nível sobe até 4,5 m (ou uma embarcação ganha +3 m de deslocamento). Evaporar: água e gelo somem; elementais da água, plantas monstruosas e imunes a frio sofrem 10d8 de fogo, outros vivos metade (Fortitude reduz à metade). Partir: o nível baixa até 4,5 m, abrindo caminho ou criando redemoinho; elementais da água ficam lentos.",
  [[2, "a", "+2d8 de dano."]],
  { opcoes: ["congelar", "derreter", "enchente", "evaporar", "partir"], dano: "(10 + 2 * a0)d8", tipo: "fogo", metade: 1 });
RAMATormenta20Magias.def("convocacaoInstantanea", "Convocação Instantânea", "A3", "conv", 188, "padrao|ilimitado|1 objeto de até 2 espaços|instantanea|",
  "Traz para sua mão um objeto marcado antes com sua runa (T$ 5). Se outra criatura o tiver, não funciona, mas você sabe onde está e com quem.",
  [[1, "o", "Até 1 hora depois, ação de movimento para devolver o objeto ao lugar de onde veio."], [1, "m", "Baú Médio, permanente, sacrifício de 1 PM: esconde no Éter um baú com 20 espaços (tudo cabe); ação padrão para chamá-lo ou mandá-lo de volta. Baú de T$ 1.000 e miniatura de T$ 100.", { alvo: "1 baú Médio", du: "permanente", mat: "baú (T$ 1.000) e miniatura (T$ 100)", sacrificioPM: 1, substitui: 1 }], [2, "a", "+1 alvo.", { alvos: 1 }], [2, "m", "Alvo: 1 objeto de até 10 espaços (se não couber nas mãos, surge adjacente).", { alvo: "1 objeto de até 10 espaços" }]]);
RAMATormenta20Magias.def("despertarConsciencia", "Despertar Consciência", "D3", "encan", 190, "completa|toque|1 animal ou planta|1 dia|",
  "O alvo vira parceiro veterano (ajudante, combatente, fortão, guardião, médico, perseguidor ou vigilante), racional, com Inteligência –1 e fala. Num parceiro que você já tem, um tipo sobe um passo (uma vez por parceiro); se já for mestre, ganha outro tipo iniciante.",
  [[4, "m", "Alvo: 1 escultura mundana, que também ganha as características de construto.", { alvo: "1 escultura mundana" }], [4, "m", "Permanente, com –3 PM máximos enquanto durar.", { du: "permanente", penalidadePM: 3 }]],
  { parceiro: { nivel: "veterano", tipos: ["ajudante", "combatente", "fortao", "guardiao", "medico", "perseguidor", "vigilante"] } });
RAMATormenta20Magias.def("dificultarDeteccao", "Dificultar Detecção", "A3", "abjur", 190, "padrao|toque|1 criatura ou objeto|1 dia|",
  "Oculta o alvo (e o equipamento) de detecção mágica: quem usa adivinhação para achá-lo faz Vontade; falhando, a magia não funciona e os PM são gastos.",
  [[4, "m", "Área: cubo de 9 m; tudo dentro dela fica protegido.", { area: "cubo de 9m", alvo: "" }], [4, "m", "Duração 1 semana.", { du: "1 semana" }]]);
RAMATormenta20Magias.def("dispersarAsTrevas", "Dispersar as Trevas", "D3", "evoc", 191, "padrao|pessoal|area:esfera com 6m de raio|veja texto|",
  "Brilho forte: dissipa magias de até 3º círculo na área se você passar em Religião contra a CD de cada uma; aliados ganham +4 nas resistências e redução de trevas 10 até o fim da cena; inimigos ficam cegos 1d4 rodadas (uma vez por cena). Anula Anular a Luz.",
  [[2, "a", "+1 no bônus de resistência."], [4, "m", "Alcance curto, 1 criatura, cena: imune a efeitos de trevas.", { al: "curto", area: "", alvo: "1 criatura", du: "cena", substitui: 1 }], [4, "m", "Dissipa magias de até 4º círculo.", { circuloDissipa: 4, r: 4 }], [9, "m", "Dissipa magias de até 5º círculo.", { circuloDissipa: 5, r: 5 }]],
  { anula: "anularALuz", efeitosAliados: [{ t: "bonus", alvo: "resistencias", valor: "4 + a0", categoria: "magia" }, { t: "rd", valor: 10, tipos: ["trevas"], fonteRd: "dispersarAsTrevas" }], testeReligiao: 1 });
RAMATormenta20Magias.def("enxameRubroDeIchabod", "Enxame Rubro de Ichabod", "A3", "conv", 192, "padrao|medio|ef:1 enxame Grande (quadrado de 3m)|sustentada|Reflexos reduz à metade",
  "Enxame de criaturinhas da Tormenta que ocupa espaços alheios. No fim de cada turno seu, 4d12 de ácido em quem estiver no espaço dele. Ação de movimento: move 12 m.",
  [[1, "o", "Quem falha fica agarrado (ação padrão e Acrobacia ou Atletismo para escapar; mover o enxame solta)."], [2, "a", "+1d12 de dano."], [2, "m", "Dano de trevas.", { tipoDano: "trevas" }], [3, "m", "Enxame Enorme (quadrado de 6 m).", { tamanho: "enorme" }], [3, "o", "Voo 18 m; ocupa um cubo."], [4, "o", "Parasitas: no início de cada turno seu, 1d6; com 5 ou 6 surge outro enxame adjacente (todos se movem com uma ação).", { r: 4 }]],
  { dano: "(4 + a1)d12", tipo: "acido", metade: 1 });
RAMATormenta20Magias.def("erupcaoGlacial", "Erupção Glacial", "A3", "evoc", 192, "padrao|medio|area:quadrado de 6m de lado|instantanea|Reflexos parcial",
  "Estacas de gelo: 4d6 de corte e 4d6 de frio, e caído. Passar evita o corte e a queda. As estacas ficam pela cena (terreno difícil e cobertura leve) e quebram com qualquer dano de fogo mágico.",
  [[3, "a", "+2d6 de frio e +2d6 de corte."], [4, "m", "Cilindro de 6 m de raio e altura, sustentada: granizo de 3d6 de impacto e 3d6 de frio por rodada sem teste, camuflagem leve e piso escorregadio (terreno difícil, Acrobacia para equilíbrio).", { area: "cilindro com 6m de raio e 6m de altura", du: "sustentada", res: "nenhuma", substitui: 1, r: 4 }]],
  { dano: "a1 ? '3d6' : (4 + 2 * a0) + 'd6'", tipo: "frio", danoExtra: { dados: "a1 ? '3d6' : (4 + 2 * a0) + 'd6'", tipo: "a1 ? 'impacto' : 'corte'" }, cond: "caido" });
RAMATormenta20Magias.def("ferverSangue", "Ferver Sangue", "A3", "necro", 193, "padrao|curto|1 criatura|sustentada|Fortitude parcial",
  "Ao lançar e no início de cada turno seu: 4d8 de fogo e enjoado 1 rodada (Fortitude reduz à metade e evita a condição). Dois sucessos seguidos dissipam. Se o alvo cair a 0 PV por ela, explode e morre, causando 6d6 de fogo a até 3 m (Reflexos reduz à metade). Não afeta criaturas sem sangue.",
  [[2, "a", "+1d8 de dano."], [9, "m", "Alvo: criaturas escolhidas.", { alvo: "criaturas escolhidas", r: 5 }]],
  { dano: "(4 + a0)d8", tipo: "fogo", cond: "enjoado", metade: 1, porTurno: 1 });
RAMATormenta20Magias.def("globoDeInvulnerabilidade", "Globo de Invulnerabilidade", "A3", "abjur", 194, "padrao|pessoal|você|sustentada|",
  "Esfera imóvel de 3 m de raio que detém magias de 2º círculo ou menor: não podem mirar quem está dentro nem penetrar com área (as de dentro saem normalmente). Efeitos são suprimidos, não dissipados. Só é dissipada se a dissipação mirar você.",
  [[4, "m", "Detém magias de até 3º círculo.", { circuloBarra: 3, r: 4 }], [9, "m", "Detém magias de até 4º círculo.", { circuloBarra: 4, r: 5 }]]);
RAMATormenta20Magias.def("heroismo", "Heroísmo", "D3", "encan", 194, "padrao|toque|1 criatura|cena|",
  "O alvo fica imune a medo, recebe 40 PV temporários e +4 em ataques e dano contra o inimigo de maior ND na cena.",
  [[2, "m", "O bônus vira +6.", { bonus: 6 }]],
  { pvTemp: "40", imune: ["medo"], efeitos: [{ t: "bonus", alvo: "ataque", valor: "a0 ? 6 : 4", categoria: "magia", cond: "inimigoMaiorND" }, { t: "bonus", alvo: "dano", valor: "a0 ? 6 : 4", categoria: "magia", cond: "inimigoMaiorND" }, { t: "imune", valor: "medo" }] });
RAMATormenta20Magias.def("ilusaoLacerante", "Ilusão Lacerante", "A3", "ilus", 195, "padrao|medio|area:cubo de 9m|sustentada|Vontade anula",
  "Ilusão de um perigo mortal: ao lançar, e sempre que alguém começar o turno na área, Vontade; quem falha acredita e sofre 3d6 de dano psíquico não letal (e racionaliza a repetição).",
  [[3, "a", "+2d6 de dano."], [4, "m", "Área: cubo de 90 m.", { area: "cubo de 90m", r: 4 }]],
  { dano: "(3 + 2 * a0)d6", tipo: "psiquico", naoLetal: 1, porTurno: 1 });
RAMATormenta20Magias.def("imobilizar", "Imobilizar", "U3", "encan", 195, "padrao|curto|1 humanoide ou animal|cena|Vontade parcial",
  "O alvo fica paralisado (passando, fica lento). A cada rodada, uma ação completa permite novo teste de Vontade para se libertar.",
  [[1, "m", "Alvo: 1 espírito.", { alvo: "1 espírito" }], [2, "a", "+1 alvo.", { alvos: 1 }], [3, "m", "Alvo: 1 criatura.", { alvo: "1 criatura", r: 4 }]],
  { cond: "paralisado" });
RAMATormenta20Magias.def("lancaIgneaDeAleph", "Lança Ígnea de Aleph", "A3", "evoc", 196, "padrao|medio|1 criatura|instantanea|Reflexos parcial",
  "Projétil de magma: 4d6 de fogo e 4d6 de perfuração, e em chamas (2d6 por rodada no lugar do normal). Passar reduz à metade e evita as chamas. Criaturas adjacentes ao alvo fazem Reflexos ou também ficam em chamas.",
  [[3, "a", "+2d6 no dano inicial e +1d6 no dano das chamas."], [4, "m", "Cena ou até descarregar: quatro dardos de lava; uma vez por rodada, ação livre, dispara um com o efeito normal.", { du: "cena ou até descarregar", r: 4 }]],
  { dano: "(4 + a0)d6", tipo: "fogo", danoExtra: { dados: "(4 + a0)d6", tipo: "perfuracao" }, porRodada: "(2 + a0)d6", cond: "emChamas", metade: 1 });
RAMATormenta20Magias.def("lendasEHistorias", "Lendas e Histórias", "U3", "adiv", 196, "padrao|toque|1 criatura, objeto ou local|sustentada|",
  "A cada rodada sustentada, descobre (a critério do mestre, às vezes só pistas): tudo o que os testes de Conhecimento revelariam; as habilidades e estatísticas do alvo (ou o funcionamento do item mágico); e as magias ativas sobre ele.",
  [[4, "m", "Execução 1 dia, alcance ilimitado; cuba de ouro e ingredientes (T$ 1.000). Precisa de nome, descrição ou localização do alvo.", { ex: "1 dia", al: "ilimitado", mat: "cuba de ouro e ingredientes (T$ 1.000)" }]]);
RAMATormenta20Magias.def("mantoDeSombras", "Manto de Sombras", "U3", "ilus", 197, "padrao|pessoal|você|sustentada|",
  "Você fica incorpóreo (com o equipamento): só armas e habilidades mágicas ou incorpóreos o afetam; atravessa objetos sem manipulá-los e não ataca criaturas normais (mas lança magias). Luz direta causa 1 de dano por rodada. Ação de movimento e 1 PM: entra numa sombra e sai em outra em alcance médio.",
  [[4, "m", "Toque; alvo: 1 criatura.", { al: "toque", alvo: "1 criatura", r: 4 }]],
  { efeitos: [{ t: "estado", valor: "incorporeo" }] });
RAMATormenta20Magias.def("miragem", "Miragem", "A3", "ilus", 199, "padrao|longo|area:cubo de até 90m de lado|1 dia|Vontade desacredita",
  "Um terreno parece outro, com sons e cheiros (útil para armadilhas). Altera, inclui ou esconde estruturas, mas não criaturas.",
  [[4, "o", "Também altera a aparência de criaturas escolhidas na área, como Disfarce Ilusório."], [9, "m", "Permanente; pó de diamante (T$ 1.000).", { du: "permanente", mat: "pó de diamante (T$ 1.000)", r: 4 }]]);
RAMATormenta20Magias.def("missaoDivina", "Missão Divina", "D3", "encan", 199, "padrao|curto|1 criatura|1 semana ou até ser descarregada|Vontade anula (veja texto)",
  "Obriga o alvo a uma tarefa possível e não suicida. Pode recusar, mas a cada dia sem se esforçar faz Vontade; falhando, sofre –2 cumulativo em todos os testes e rolagens.",
  [[2, "m", "Toque, permanente, –1 PM máximo: marca na pele ativada por um tipo de ação (crime, quebra de obrigações); cada ativação dá –2 cumulativo. Dissipar suprime por um dia; só o conjurador ou Purificação removem.", { al: "toque", du: "permanente", penalidadePM: 1, substitui: 1 }], [4, "m", "Duração 1 ano ou até descarregar.", { du: "1 ano ou até ser descarregada" }]]);
RAMATormenta20Magias.def("muralhaElemental", "Muralha Elemental", "A3", "evoc", 200, "padrao|medio|ef:muralha de energia|cena|veja texto",
  "Muro de até 30 m × 3 m (ou o inverso) ou cúpula de 3 m de raio. Fogo: um lado emite 2d6 de fogo a até 6 m ao lançar e no início dos seus turnos; atravessar causa 8d6 de fogo (quem estava no local faz Reflexos para metade e escolhe o lado). Gelo: parede de 15 cm (cada trecho de 3 m: Defesa 8, 40 PV, RD 5, fogo causa o dobro); a cúpula pode prender (Reflexos escapa); atravessar trecho rompido causa 4d6 de frio.",
  [[2, "a", "+2d6 no dano por atravessar."], [2, "a", "+15 m de comprimento e +3 m de altura (até 60 m × 9 m)."], [4, "m", "Sustentada, nova opção Essência: muralha invisível e indestrutível que nada atravessa (só teletransporte); magias lançadas direto em alvos do outro lado funcionam.", { du: "sustentada", r: 4 }]],
  { opcoes: ["fogo", "gelo"], dano: "(8 + 2 * a0)d6", tipo: "fogo", metade: 1 });
RAMATormenta20Magias.def("peleDePedra", "Pele de Pedra", "U3", "trans", 201, "padrao|pessoal|você|cena|",
  "Pele dura como rocha: redução de dano 5.",
  [[1, "m", "Toque; alvo: 1 criatura.", { al: "toque", alvo: "1 criatura" }], [4, "m", "Duração 1 dia.", { du: "1 dia" }], [4, "m", "Pele de aço: redução de dano 10.", { rd: 10, r: 4 }], [4, "m", "Toque, 1 criatura, 1d4 rodadas, Fortitude anula: vira estátua inerte (mesmos PV, RD 8; quebrada, a criatura morre).", { al: "toque", alvo: "1 criatura", du: "1d4 rodadas", res: "Fortitude anula", substitui: 1, r: 4 }], [9, "m", "Como o anterior, permanente.", { al: "toque", alvo: "1 criatura", du: "permanente", res: "Fortitude anula", substitui: 1, r: 5 }]],
  { efeitos: [{ t: "rd", valor: "a2 ? 10 : 5", fonteRd: "peleDePedra" }] });
RAMATormenta20Magias.def("poeiraDaPodridao", "Poeira da Podridão", "D3", "necro", 201, "padrao|medio|area:nuvem com 6m de raio|cena|Fortitude (veja texto)",
  "Nuvem de energia negativa: ao lançar e no início dos seus turnos, 2d8+8 de trevas (Fortitude reduz à metade). Quem falha não recupera PV por uma rodada.",
  [[2, "a", "+1d8+4 de dano."]],
  { dano: "(2 + a0)d8 + (8 + 4 * a0)", tipo: "trevas", metade: 1, porTurno: 1 });
RAMATormenta20Magias.def("potenciaDivina", "Potência Divina", "D3", "trans", 201, "padrao|pessoal|você|sustentada|",
  "Você cresce uma categoria de tamanho (o equipamento acompanha) e recebe Força +4 e RD 10. Não lança magias enquanto durar.",
  [[2, "a", "+1 de Força."], [5, "a", "+5 de RD."], [2, "m", "Toque; alvo: 1 criatura devota da mesma divindade.", { al: "toque", alvo: "1 criatura (mesma divindade)" }]],
  { efeitos: [{ t: "tamanhoPasso", valor: 1 }, { t: "bonus", alvo: "atr.for", valor: "4 + a0", categoria: "magia" }, { t: "rd", valor: "10 + 5 * a1", fonteRd: "potenciaDivina" }, { t: "semMagias" }] });
RAMATormenta20Magias.def("protecaoContraMagia", "Proteção contra Magia", "D3", "abjur", 202, "padrao|toque|1 criatura|cena|",
  "+5 nos testes de resistência contra magias.",
  [[4, "m", "O bônus vira +10.", { protecao: "mais10", r: 4 }], [4, "m", "Imune a uma escola de magia à escolha.", { protecao: "escola1", r: 4 }], [9, "m", "Imune a duas escolas à escolha.", { protecao: "escola2", r: 5 }]],
  { efeitos: [{ t: "bonus", alvo: "resistencias", valor: "a0 ? 10 : (a1 || a2 ? 0 : 5)", categoria: "magia", cond: "contraMagia" }] });
RAMATormenta20Magias.def("seloDeMana", "Selo de Mana", "U3", "encan", 205, "padrao|toque|1 criatura|cena|Vontade parcial",
  "Selo que atrapalha o mana: sempre que o alvo fizer algo que gaste PM, faz Vontade; falhando, a ação não tem efeito (os PM são gastos).",
  [[4, "m", "Alcance curto; alvo: criaturas escolhidas.", { al: "curto", alvo: "criaturas escolhidas", r: 4 }]]);
RAMATormenta20Magias.def("servoDivino", "Servo Divino", "D3", "conv", 205, "padrao|curto|ef:criatura conjurada|cena ou até ser descarregada|",
  "Sua divindade envia um espírito (tipo escolhido pelo mestre) que cumpre uma tarefa de até uma hora e volta ao plano natal. Pagamento de T$ 100 ao espírito (doação, item mágico ou dinheiro).",
  [[4, "m", "Duração 1 dia: tarefa de até um dia; pagamento T$ 500.", { du: "1 dia ou até ser descarregada", mat: "pagamento de T$ 500" }], [9, "m", "Duração 1 semana: tarefa de até uma semana; pagamento T$ 1.000.", { du: "1 semana ou até ser descarregada", mat: "pagamento de T$ 1.000" }]],
  { mat: "pagamento de T$ 100" });
RAMATormenta20Magias.def("servoMortoVivo", "Servo Morto-Vivo", "U3", "necro", 206, "completa|toque|1 cadáver|instantanea|",
  "Transforma o cadáver de humanoide, animal ou monstro em esqueleto ou zumbi que obedece a tudo. Pode acompanhar você como parceiro iniciante (ajudante, atirador, combatente, fortão, guardião ou montaria). Uma vez por rodada, ao sofrer dano, você pode sacrificar um servo para evitar esse dano. Componente: ônix negro (T$ 100).",
  [[3, "m", "Carniçal (pó de ônix negro, T$ 500): parceiro veterano (ajudante, atirador, combatente, fortão ou guardião).", { servo: "carnical", mat: "pó de ônix negro (T$ 500)" }], [3, "m", "Sombra (pó de ônix negro, T$ 500): parceiro veterano (assassino, combatente ou perseguidor).", { servo: "sombra", mat: "pó de ônix negro (T$ 500)" }], [7, "m", "Múmia (ferramentas de embalsamar, T$ 1.000): parceiro mestre (ajudante, destruidor, guardião ou médico).", { servo: "mumia", mat: "ferramentas de embalsamar (T$ 1.000)", r: 4 }]],
  { mat: "ônix negro (T$ 100)", parceiro: { nivel: "iniciante", tipos: ["ajudante", "atirador", "combatente", "fortao", "guardiao", "montaria"] } });
RAMATormenta20Magias.def("soproDaSalvacao", "Sopro da Salvação", "D3", "evoc", 207, "padrao|pessoal|area:cone de 9m|instantanea|",
  "Cone de poeira de luz que só afeta aliados: cura 2d8+4 PV e remove uma destas condições de todos: abalado, atordoado, apavorado, alquebrado, cego, confuso, debilitado, enfeitiçado, enjoado, esmorecido, exausto, fascinado, fatigado, fraco, frustrado, lento, paralisado, pasmo, surdo.",
  [[2, "a", "+1d8+2 de cura."], [4, "o", "Aliado com PV negativos vai a 0 antes de receber a cura."], [4, "o", "Remove todas as condições listadas."]],
  { cura: "(2 + a0)d8 + (4 + 2 * a0)", removeCondicoes: ["abalado", "atordoado", "apavorado", "alquebrado", "cego", "confuso", "debilitado", "enfeiticado", "enjoado", "esmorecido", "exausto", "fascinado", "fatigado", "fraco", "frustrado", "lento", "paralisado", "pasmo", "surdo"] });
RAMATormenta20Magias.def("telecinesia", "Telecinesia", "A3", "trans", 208, "padrao|medio|veja texto|sustentada ou instantanea|",
  "Escolha. Força Contínua (sustentada): move uma criatura Média ou menor ou objeto de até 10 espaços até 6 m por rodada em qualquer direção (Vontade anula; cai ao sair do alcance). Empurrão Violento (instantânea): arremessa até 10 objetos (10 espaços, a até 3 m uns dos outros); cada espaço causa de 1 a 1d6 de impacto (Reflexos reduz à metade). Criaturas Médias ou menores podem ser arremessadas (Vontade evita) e sofrem 1d6 a cada 3 m voados ao bater numa superfície.",
  [[3, "a", "+1 categoria de tamanho de criatura ou o dobro de espaços de objeto."]],
  { opcoes: ["forcaContinua", "empurraoViolento"] });
RAMATormenta20Magias.def("teletransporte", "Teletransporte", "A3", "conv", 208, "padrao|toque|até 5 criaturas voluntárias|instantanea|",
  "Leva os alvos a um lugar a até 1.000 km. Misticismo: CD 20 (familiar), 30 (já visitado) ou 40 (só por descrição). Falha: surge 1d10 × 10 km longe; falha por 5 ou mais: lugar parecido, errado; 1 natural: a magia falha (PM gastos) e você fica atordoado 1d4 rodadas.",
  [[2, "a", "+5 alvos.", { alvos: 5 }], [2, "m", "Vai ao seu santuário (preparado com ritual de um dia e T$ 1.000; um por vez), sem limite de distância nem teste, no mesmo plano.", { destino: "santuario", substitui: 1 }], [9, "m", "Ação completa, cena, sacrifício de 1 PM: círculo de 1,5 m que leva quem pisar a um destino conhecido em qualquer mundo, sem teste.", { ex: "completa", du: "cena", sacrificioPM: 1, destino: "circulo", substitui: 1, r: 5 }]],
  { teste: { pericia: "misticismo", cds: { familiar: 20, conhecido: 30, descricao: 40 } } });
RAMATormenta20Magias.def("tentaculosDeTrevas", "Tentáculos de Trevas", "A3", "necro", 209, "padrao|medio|area:esfera com 6m de raio|cena|",
  "Tentáculos de treva: ao lançar e no início de cada turno seu, faça a manobra agarrar (com seu Misticismo) contra cada criatura na área; quem já estava agarrado sofre 4d6 de trevas. Terreno difícil; os tentáculos são imunes a dano.",
  [[2, "a", "+3 m de raio."], [2, "a", "+2d6 de dano."]],
  { dano: "(4 + 2 * a1)d6", tipo: "trevas", manobra: { tipo: "agarrar", pericia: "misticismo" }, porTurno: 1 });
RAMATormenta20Magias.def("transformacaoDeGuerra", "Transformação de Guerra", "A3", "trans", 210, "padrao|pessoal|você|sustentada|",
  "Máquina de combate: +6 na Defesa, nos ataques e no dano corpo a corpo e 30 PV temporários. Proficiente em todas as armas, mas não lança magias.",
  [[2, "a", "+1 nos bônus e +10 PV temporários."], [2, "o", "Barra de adamante (T$ 100): RD 10, imunidade a atordoamento, cansaço, encantamento, metabolismo, trevas e veneno, e não respira.", { mat: "barra de adamante (T$ 100)" }]],
  { pvTemp: "30 + 10 * a0", efeitos: [{ t: "bonus", alvo: "defesa", valor: "6 + a0", categoria: "magia" }, { t: "bonus", alvo: "ataque.corpo", valor: "6 + a0", categoria: "magia" }, { t: "bonus", alvo: "dano.corpo", valor: "6 + a0", categoria: "magia" }, { t: "prof", qual: "marciais" }, { t: "prof", qual: "exoticas" }, { t: "prof", qual: "fogo" }, { t: "rd", valor: "a1 ? 10 : 0", fonteRd: "transformacaoDeGuerra" }, { t: "semMagias" }] });
RAMATormenta20Magias.def("viagemArborea", "Viagem Arbórea", "D3", "conv", 210, "completa|pessoal|você|cena|",
  "Você entra numa árvore adjacente maior que você e percebe os arredores (sem agir). Ação de movimento: sai dela ou de qualquer outra a até 1 km. Ação de movimento e 1 PM: entra em outra. Se a árvore for destruída, sai e sofre 10d6 de impacto.",
  [[2, "m", "Toque, até cinco criaturas, instantânea: entram numa planta Média ou maior e saem em outra a até 100 km na direção indicada.", { al: "toque", alvo: "até 5 criaturas", du: "instantanea", substitui: 1 }]]);
RAMATormenta20Magias.def("videncia", "Vidência", "U3", "adiv", 211, "completa|ilimitado|1 criatura|sustentada|Vontade anula",
  "Por uma superfície reflexiva, vê e ouve a criatura e 6 m ao redor, a qualquer distância. Modificadores da Vontade do alvo: não conhece +10; ouviu falar +5; outro plano +5; já encontrou +0; tem representação –2; conhece bem –5; tem pertence –5; tem parte do corpo –10.",
  []);
RAMATormenta20Magias.def("voo", "Voo", "A3", "trans", 211, "padrao|pessoal|você|cena|",
  "Deslocamento de voo 12 m, simples como andar (ataca e lança magias normalmente). No fim, desce devagar como em Queda Suave.",
  [[1, "m", "Toque; alvo: 1 criatura.", { al: "toque", alvo: "1 criatura" }], [4, "m", "Duração 1 dia.", { du: "1 dia", r: 4 }], [4, "m", "Alcance curto; alvo: até 10 criaturas.", { al: "curto", alvo: "até 10 criaturas", r: 4 }]],
  { efeitos: [{ t: "deslocamento", tipo: "voo", base: 12 }] });
RAMATormenta20Magias.def("ancoraDimensional", "Âncora Dimensional", "A3", "abjur", 179, "padrao|curto|1 criatura ou objeto|cena|",
  "Campo esmeralda que impede movimento planar: convocações como Salto Dimensional e Teletransporte, viagem astral e a habilidade incorpóreo.",
  [[2, "m", "Alcance médio; área: esfera de 3 m; alvo: criaturas escolhidas.", { al: "medio", area: "esfera com 3m de raio", alvo: "criaturas escolhidas" }], [2, "m", "Fio de energia prende o alvo a um ponto fixo (não se afasta mais de 3 m); o fio tem 20 PV e RD 20 (efeitos de libertação o desfazem).", { ancora: "fio" }], [4, "m", "Como o anterior, com corrente de 20 PV e RD 40.", { ancora: "corrente" }], [4, "m", "Área: cubo de 9 m, permanente; chave de esmeralda (T$ 2.000): ninguém entra nem sai dali por movimento planar.", { area: "cubo de 9m", du: "permanente", mat: "chave de esmeralda (T$ 2.000)", substitui: 1 }], [9, "m", "Alcance médio, esfera de 3 m, criaturas escolhidas, todas presas por fios ao centro.", { al: "medio", area: "esfera com 3m de raio", alvo: "criaturas escolhidas", ancora: "fios" }]]);
/* <<< js/tormenta20/magias-3.js */

/* >>> js/tormenta20/magias-4.js */
/* R.A.M.A. — Tormenta20 · magias de 4º círculo (Livro Básico, Jogo do Ano).
   Resumos do RAMA; formato descrito em js/tormenta20/magias.js. */
RAMATormenta20Magias.def("alterarMemoria", "Alterar Memória", "A4", "encan", 179, "padrao|toque|1 criatura|instantanea|Vontade anula",
  "Invade a mente do alvo e altera ou apaga as memórias da última hora.",
  [[2, "m", "Pessoal; área: cone de 4,5 m.", { al: "pessoal", area: "cone de 4,5m", alvo: "" }], [5, "o", "Alcança as memórias das últimas 24 horas."]]);
RAMATormenta20Magias.def("animarObjetos", "Animar Objetos", "A4", "trans", 179, "padrao|medio|até 8 objetos Minúsculos ou Pequenos, 4 Médios, 2 Grandes ou 1 Enorme|cena|",
  "Objetos viram parceiros construtos sob seu controle (fora do limite de parceiros), comandados com ação de movimento. Sem Defesa nem resistências, falham em testes opostos e podem ser alvo de ações hostis. Não afeta itens mágicos nem objetos carregados por outros. Minúsculo: For –3, Des 4, 5 PV (assassino ou combatente iniciante). Pequeno: For –2, Des 2, 10 PV (combatente ou guardião iniciante). Médio: For 0, Des 1, 20 PV (combatente ou guardião veterano). Grande: For 2, Des 0, 40 PV (fortão, guardião ou montaria veterano). Enorme: For 4, Des –2, 80 PV (fortão, guardião ou montaria mestre).",
  [[5, "m", "Permanente; prataria (T$ 1.000). Máximo de objetos animados igual à metade do seu nível.", { du: "permanente", mat: "prataria (T$ 1.000)" }]]);
RAMATormenta20Magias.def("assassinoFantasmagorico", "Assassino Fantasmagórico", "A4", "necro", 181, "padrao|longo|1 criatura|cena, até ser descarregada|Vontade anula, Fortitude parcial",
  "Ilusão daquilo que o alvo mais teme (os outros veem um espectro). Vontade: passando, a magia se dissipa. Falhando, o espectro incorpóreo e imune a magias (salvo dissipação) voa 18 m por rodada até ele no fim do seu turno; terminando adjacente, Fortitude: passa e sofre 6d6 de trevas (sem cair abaixo de 0 PV); falha e cai a –1 PV, sangrando. Some se o alvo ficar inconsciente ou passar do alcance longo.",
  [],
  { dano: "6d6", tipo: "trevas" });
RAMATormenta20Magias.def("campoAntimagia", "Campo Antimagia", "A4", "abjur", 183, "padrao|pessoal|você|sustentada|",
  "Barreira invisível de 3 m de raio que acompanha você e suprime habilidades e itens mágicos dentro dela; convocados somem até o campo acabar. Criaturas mágicas não são afetadas diretamente, mas não usam magia ali. Não é dissipada por magia; artefatos e deuses maiores a ignoram.",
  []);
RAMATormenta20Magias.def("concederMilagre", "Conceder Milagre", "D4", "encan", 184, "padrao|toque|1 criatura|permanente até ser descarregada|",
  "Escolha uma magia de até 2º círculo que você conhece: o alvo a lança uma vez sem pagar o custo (aprimoramentos com os PM dele). Você fica com –3 PM até lá.",
  [[4, "m", "Magia de 3º círculo; penalidade de –6 PM.", { circuloConcedido: 3, penalidadePM: 6 }]],
  { penalidadePM: 3 });
RAMATormenta20Magias.def("conjurarElemental", "Conjurar Elemental", "A4", "conv", 185, "completa|medio|ef:parceiro elemental|sustentada|",
  "Uma porção de elemento vira um elemental Grande que só ajuda você, parceiro mestre destruidor (habilidade por 2 PM) e de mais um tipo, fora do limite de parceiros. Ar (eletricidade): assassino, perseguidor ou vigilante. Água (frio): ajudante, guardião ou médico. Fogo: atirador, combatente ou fortão. Terra (impacto): combatente, guardião ou montaria.",
  [[5, "o", "Elemental Enorme, com dois tipos da lista do elemento."], [5, "o", "Um elemental de cada tipo; cada um ajuda você ou um aliado no alcance.", { r: 5 }]],
  { parceiro: { nivel: "mestre", tipos: ["destruidor"] }, opcoes: ["ar", "agua", "fogo", "terra"] });
RAMATormenta20Magias.def("controlarAGravidade", "Controlar a Gravidade", "A4", "trans", 186, "padrao|medio|area:cubo de 12m de lado|sustentada|",
  "Escolha (ação padrão para trocar). Aumentar: no início dos seus turnos, cada criatura faz Atletismo; passa e fica fatigada, falha e fica fatigada e caída. Inverter: tudo “cai” para cima (1d6 por 1,5 m se bater num teto; sem teto, flutua no topo); quem tem onde se agarrar faz Reflexos. Reduzir: criaturas e objetos Médios ou menores voam 6 m à vontade, +20 em Atletismo para escalar e saltar, –2 em ataques.",
  [],
  { opcoes: ["aumentar", "inverter", "reduzir"] });
RAMATormenta20Magias.def("controlarOClima", "Controlar o Clima", "D4", "trans", 187, "completa|2km|area:esfera com 2km de raio|4d12 horas|",
  "Cria qualquer condição climática na área (chuva, neve, vento, névoa…); efeitos do clima no Capítulo 6.",
  [[1, "m", "Apenas druidas: raio de 3 km e duração 1d4 dias.", { area: "esfera com 3km de raio", du: "1d4 dias", apenasClasse: "druida" }]]);
RAMATormenta20Magias.def("circuloDaRestauracao", "Círculo da Restauração", "D4", "evoc", 184, "padrao|curto|area:esfera com 3m de raio|5 rodadas|",
  "Círculo de luz: criatura viva que termina o turno nele recupera 3d8+3 PV e 1 PM (no máximo 5 PM por dia assim). Mortos-vivos e quem sofre dano por luz perdem o mesmo.",
  [[2, "a", "+1d8+1 de PV por turno."]],
  { cura: "(3 + a0)d8 + (3 + a0)", porTurno: 1 });
RAMATormenta20Magias.def("coleraDeAzgher", "Cólera de Azgher", "D4", "evoc", 184, "padrao|medio|area:esfera com 6m de raio|instantanea|Reflexos parcial",
  "Fulgor dourado: cego por 1d4 rodadas, em chamas e 10d6 de fogo (10d8 em mortos-vivos). Passar evita cegueira e chamas e reduz o dano à metade.",
  [[2, "a", "+2d6 de dano (+2d8 em mortos-vivos)."], [2, "a", "+6 m de raio."], [5, "o", "Dissipa todas as magias de necromancia ativas na área.", { r: 5 }]],
  { dano: "(10 + 2 * a0)d6", danoMortoVivo: "(10 + 2 * a0)d8", tipo: "fogo", cond: "cego", metade: 1 });
RAMATormenta20Magias.def("cupulaDeRepulsao", "Cúpula de Repulsão", "D4", "abjur", 189, "padrao|pessoal|você|sustentada|Vontade anula",
  "Escolha um tipo de criatura ou uma raça: quem for do grupo e tentar chegar a menos de 3 m faz Vontade; falhando, gasta a ação e só tenta de novo na próxima rodada (impede corpo a corpo, não ataques à distância). Se você avançar sobre eles, a magia se rompe.",
  [[2, "m", "Distância mínima de 4,5 m.", { distancia: "4,5m" }], [5, "o", "Ataques e efeitos à distância dessas criaturas também exigem o teste; falhando, são desviados.", { r: 5 }]]);
RAMATormenta20Magias.def("desintegrar", "Desintegrar", "A4", "trans", 190, "padrao|medio|1 criatura ou objeto|instantanea|Fortitude parcial",
  "Raio esverdeado de 10d12 de essência (passando, 2d12). Se os PV do alvo chegarem a 0 ou menos, vira pó.",
  [[4, "a", "+2d12 no dano total e +1d12 no mínimo."]],
  { dano: "(10 + 2 * a0)d12", danoSucesso: "(2 + a0)d12", tipo: "essencia" });
RAMATormenta20Magias.def("duplicataIlusoria", "Duplicata Ilusória", "A4", "ilus", 191, "padrao|medio|ef:cópia ilusória|cena|",
  "Cópia semirreal e intangível de você que imita suas ações; a cada turno, escolha por qual corpo vê e ouve. Magias de toque ou mais podem sair da cópia. Para agir diferente, ação de movimento. Quem interage com ela faz Vontade para perceber a ilusão. Some se sair do alcance.",
  [[3, "a", "+1 cópia."]]);
RAMATormenta20Magias.def("explosaoCaleidoscopica", "Explosão Caleidoscópica", "A4", "ilus", 193, "padrao|curto|area:esfera com 6m de raio|instantanea|Fortitude parcial",
  "Luzes e sons desorientam, conforme o nível ou ND. Até 4: falha inconsciente; passa atordoado 1d4 rodadas e enjoado pela cena. De 5 a 9: falha atordoado 1d4 rodadas e enjoado pela cena; passa atordoado 1 rodada e enjoado 1d4. 10 ou mais: falha atordoado 1 rodada e enjoado 1d4; passa desprevenido e enjoado 1 rodada. Atordoa cada criatura só uma vez por cena.",
  [],
  { porND: [[4, "inconsciente"], [9, "atordoado"], [99, "atordoado"]] });
RAMATormenta20Magias.def("formaEterea", "Forma Etérea", "A4", "trans", 193, "completa|pessoal|você|sustentada|",
  "Você e o equipamento vão ao plano etéreo: invisível (alterna como ação livre), incorpóreo, move-se em qualquer direção e percebe o mundo físico em cinza até 18 m. Só abjuração e essência o afetam; não ataca nem lança magias no plano material. Materializar-se é uma ação de movimento (em espaço ocupado, é empurrado e sofre 1d6 por 1,5 m).",
  [[5, "m", "Toque; até 5 criaturas voluntárias de mãos dadas (podem soltar depois).", { al: "toque", alvo: "até 5 criaturas voluntárias", r: 5 }]],
  { efeitos: [{ t: "estado", valor: "etereo" }] });
RAMATormenta20Magias.def("guardiaoDivino", "Guardião Divino", "D4", "conv", 194, "padrao|curto|ef:elemental de luz invocado|cena ou até ser descarregado|",
  "Orbe Pequeno de luz divina, incorpóreo e imune a dano, que ilumina como tocha e tem 100 pontos de luz. Uma vez por rodada, no seu turno, voa 18 m e gasta pontos para curar criaturas em alcance curto: 1 PV por ponto ou uma condição por 3 pontos (abalado, apavorado, alquebrado, atordoado, cego, confuso, debilitado, enjoado, esmorecido, exausto, fascinado, fatigado, fraco, frustrado, ofuscado, pasmo, sangrando, surdo ou vulnerável). Acaba sem pontos.",
  [],
  { reserva: { nome: "pontos de luz", total: 100 } });
RAMATormenta20Magias.def("ligacaoSombria", "Ligação Sombria", "D4", "necro", 196, "padrao|longo|1 criatura|1 dia|Fortitude anula",
  "Marca idêntica em você e no alvo: sempre que você sofrer dano ou condição, ele faz Fortitude; falhando, sofre o mesmo. Termina se ele chegar a 0 PV.",
  [[5, "o", "Não termina a 0 PV (o dano pode matá-lo)."]]);
RAMATormenta20Magias.def("libertacao", "Libertação", "U4", "abjur", 196, "padrao|curto|1 criatura|cena|",
  "O alvo fica imune a efeitos de movimento, ignora tudo que impeça ou restrinja seu deslocamento e usa habilidades que exigem liberdade de movimentos mesmo de armadura ou escudo.",
  [[2, "o", "Caminha sobre água e outros líquidos (sem proteção contra os efeitos deles)."], [2, "o", "Pode escolher 20 em todos os testes de Atletismo."], [2, "o", "Pode escolher 20 em Acrobacia e fazer as manobras dela sem treino."], [5, "m", "Alcance curto; até 5 criaturas.", { alvo: "até 5 criaturas" }], [5, "o", "Pode dissipar Aprisionamento."]],
  { efeitos: [{ t: "ignoraReducaoDeslocamento" }, { t: "imune", valor: "movimento" }] });
RAMATormenta20Magias.def("mantoDoCruzado", "Manto do Cruzado", "D4", "evoc", 197, "padrao|pessoal|você|sustentada|",
  "Manto de energia divina em duas versões; escolha uma ao aprender (não muda). Luz: no início de cada turno seu, você e aliados em alcance curto recuperam 2d8 PV; você fica imune a trevas e seus ataques corpo a corpo causam +2d8 de luz. Trevas: no início de cada turno seu, inimigos em alcance curto sofrem 4d8 de trevas e você cura metade do dano causado.",
  [],
  { versaoAoAprender: ["luz", "trevas"], porTurno: 1 });
RAMATormenta20Magias.def("marionete", "Marionete", "A4", "encan", 198, "padrao|medio|1 criatura|sustentada|Fortitude anula",
  "Controla o sistema nervoso do alvo: ao lançar e no início de cada turno seu, ele faz Fortitude (passa e anula). Falhando, você controla todas as ações físicas dele naquele turno (ele ainda percebe e fala com esforço, sem lançar magias). Sem linha de efeito, ele fica paralisado até você retomar.",
  []);
RAMATormenta20Magias.def("muralhaDeOssos", "Muralha de Ossos", "U4", "necro", 199, "padrao|medio|ef:muro de ossos|cena|",
  "Parede de ossos de 15 m × 9 m × 1,5 m, em qualquer forma apoiada no chão. Ao surgir, quem está no lugar ou adjacente sofre 4d8 de corte e faz Reflexos para não ficar agarrado (ação padrão e Atletismo para sair; falhando, mais 4d8). Cada trecho de 3 m: Defesa 8, 40 PV, redução de corte, frio e perfuração 10. Escalar exige Atletismo e causa 4d8 de corte a cada 3 m.",
  [[3, "a", "+15 m de comprimento e +3 m de altura."], [5, "o", "Esqueletos animados: quem começa o turno adjacente ou escalando faz Reflexos ou fica agarrado."]],
  { dano: "4d8", tipo: "corte" });
RAMATormenta20Magias.def("maoPoderosaDeTalude", "Mão Poderosa de Talude", "A4", "conv", 197, "padrao|medio|ef:mão gigante de energia|sustentada|",
  "Mão Grande flutuante que se põe entre você e um oponente escolhido: cobertura leve (+5 na Defesa) contra ele, sem ser enganada. Defesa 20, PV e resistências iguais aos seus. Ação de movimento: troca de oponente ou Agarrar (Misticismo +10), Esmagar um agarrado (2d6+10 de impacto) ou Empurrar (Misticismo +10).",
  [[2, "a", "+1d6+5 de dano."], [5, "m", "Bônus em Misticismo vira +20.", { bonusManobra: 20, r: 5 }]],
  { dano: "(2 + a0)d6 + (10 + 5 * a0)", tipo: "impacto", manobra: { pericia: "misticismo", bonus: "a1 ? 20 : 10" } });
RAMATormenta20Magias.def("premonicao", "Premonição", "D4", "adiv", 201, "padrao|pessoal|você|cena|",
  "Uma vez por rodada, rola de novo um teste recém-feito e fica com o novo resultado.",
  [[3, "m", "Reação, alcance curto, 1 criatura, instantânea: obriga quem acabou de fazer um teste a rolar de novo e aceitar (involuntária: Vontade nega).", { ex: "reacao", al: "curto", alvo: "1 criatura", du: "instantanea", substitui: 1 }], [10, "m", "Duração 1 dia.", { du: "1 dia" }]]);
RAMATormenta20Magias.def("raioPolar", "Raio Polar", "A4", "evoc", 203, "padrao|medio|1 criatura|instantanea|Fortitude parcial",
  "10d8 de dano de frio e preso num bloco de gelo (paralisado). Passar reduz à metade e deixa só lento por 1 rodada. O bloco tem 20 PV, RD 10 e vulnerabilidade a fogo; o preso usa ação completa e Atletismo para causar 10 de dano nele, ignorando a RD.",
  [[3, "a", "+2d8 de dano."], [5, "m", "Área: esfera de 6 m de raio (bola de gelo).", { area: "esfera com 6m de raio", alvo: "" }]],
  { dano: "(10 + 2 * a0)d8", tipo: "frio", cond: "paralisado", metade: 1 });
RAMATormenta20Magias.def("relampagoFlamejanteDeReynard", "Relâmpago Flamejante de Reynard", "A4", "evoc", 203, "duas rodadas|medio|ef:bolas de fogo e relâmpagos|sustentada|Reflexos reduz à metade",
  "Uma mão em chamas e outra eletrificada. Ação de movimento: bola de fogo (10d6 de fogo em esfera de 6 m) ou relâmpago (10d6 de eletricidade em linha). Ação padrão, com as duas mãos livres: rajada mista de 20d12 (metade fogo, metade eletricidade) em esfera de 9 m, que encerra a magia. A execução não pode ser reduzida.",
  [[2, "a", "+1d6 nas rajadas e +2d12 na rajada mista."]],
  { dano: "(10 + a0)d6", danoMisto: "(20 + 2 * a0)d12", tipo: "fogo", metade: 1, execucaoFixa: 1 });
RAMATormenta20Magias.def("sonho", "Sonho", "A4", "adiv", 207, "10 minutos|ilimitado|1 criatura viva|veja texto|",
  "Entra nos sonhos de uma criatura e conversa com ela até que acorde (pode esperar em transe até ela dormir; em transe você fica indefeso). Sair do transe encerra a magia.",
  [[2, "o", "Pesadelo: Vontade (com os modificadores de Vidência); falhando, não recupera PV nem PM na noite, sofre 1d10 de trevas e acorda fatigado."], [1, "a", "+1 alvo (todos compartilham o sonho).", { alvos: 1 }]]);
RAMATormenta20Magias.def("talhoInvisivelDeEdauros", "Talho Invisível de Edauros", "A4", "evoc", 207, "padrao|pessoal|area:cone de 9m|instantanea|Fortitude parcial",
  "Lâmina de ar: 10d8 de corte e sangrando. Passar reduz à metade e evita o sangramento.",
  [[2, "a", "+2d8 de dano."], [2, "m", "Alvo: você, sustentada: uma vez por rodada, ação de movimento, lança uma lâmina num alvo em alcance médio (6d8 de corte, Fortitude reduz à metade).", { area: "", alvo: "você", du: "sustentada", substitui: 1 }]],
  { dano: "a1 ? (6 + 2 * a0) + 'd8' : (10 + 2 * a0) + 'd8'", tipo: "corte", cond: "sangrando", metade: 1 });
RAMATormenta20Magias.def("terremoto", "Terremoto", "D4", "evoc", 209, "padrao|longo|area:esfera com 30m de raio|1 rodada|veja texto",
  "Tremor de uma rodada: criaturas no solo ficam atordoadas (uma vez por cena). Caverna: o teto cai, 12d6 de impacto e agarrado (Reflexos reduz à metade e evita). Construção: 200 de dano nas estruturas; quem estiver numa que desabe sofre como na caverna. Espaço aberto: role um dado por criatura; ímpar abre fenda (Reflexos ou cai; ação completa e Atletismo para sair); no próximo turno as fendas fecham e matam quem estiver nelas. Penhasco: desmoronamento de 12d6 e agarrado. Água ou pântano: lamaçal agarra (Reflexos evita) e pode afogar. Agarrados sofrem 1d6 por rodada até se soltarem (ação completa e Atletismo).",
  [],
  { dano: "12d6", tipo: "impacto", cond: "atordoado", opcoes: ["caverna", "construcao", "aberto", "penhasco", "agua"] });
RAMATormenta20Magias.def("viagemPlanar", "Viagem Planar", "U4", "conv", 211, "completa|toque|pessoal|instantanea|",
  "Viaja para outro plano, chegando a 1d100 × 10 km do destino. Componente: bastão em forquilha de metal precioso (T$ 1.000); o metal define o plano.",
  [[2, "m", "Alvo: até cinco criaturas voluntárias que você toca.", { alvo: "até 5 criaturas voluntárias" }]],
  { mat: "bastão em forquilha de metal precioso (T$ 1.000)" });
RAMATormenta20Magias.def("visaoDaVerdade", "Visão da Verdade", "U4", "adiv", 211, "movimento|pessoal|você|cena|",
  "Enxerga a forma real: através de camuflagem e escuridão (normais e mágicas) e de ilusões e transmutações.",
  [[1, "m", "Toque; alvo: 1 criatura.", { al: "toque", alvo: "1 criatura" }], [1, "o", "+10 em Percepção."], [2, "o", "+10 em Intuição."], [4, "o", "Enxerga através de paredes e barreiras de até 30 cm."]],
  { efeitos: [{ t: "bonus", alvo: "pericia.percepcao", valor: "a1 ? 10 : 0", categoria: "magia" }, { t: "bonus", alvo: "pericia.intuicao", valor: "a2 ? 10 : 0", categoria: "magia" }, { t: "sentido", valor: "visaoDaVerdade" }] });
/* <<< js/tormenta20/magias-4.js */

/* >>> js/tormenta20/magias-5.js */
/* R.A.M.A. — Tormenta20 · magias de 5º círculo (Livro Básico, Jogo do Ano).
   Resumos do RAMA; formato descrito em js/tormenta20/magias.js. */
RAMATormenta20Magias.def("auraDivina", "Aura Divina", "D5", "abjur", 182, "padrao|pessoal|area:esfera com 9m de raio|cena|Vontade parcial",
  "Aura brilhante: você e aliados devotos da mesma divindade ficam imunes a encantamento e recebem +10 na Defesa e nas resistências; outros aliados recebem +5. Inimigos que entram na área fazem Vontade ou ficam esmorecidos, debilitados ou lentos (à sua escolha) até o fim da cena; o teste se repete a cada entrada.",
  [[2, "a", "+1 nos bônus de Defesa e resistências."]],
  { efeitos: [{ t: "bonus", alvo: "defesa", valor: "10 + a0", categoria: "magia" }, { t: "bonus", alvo: "resistencias", valor: "10 + a0", categoria: "magia" }, { t: "imune", valor: "encantamento" }], efeitosAliados: [{ t: "bonus", alvo: "defesa", valor: "5 + a0", categoria: "magia" }, { t: "bonus", alvo: "resistencias", valor: "5 + a0", categoria: "magia" }] });
RAMATormenta20Magias.def("barragemElementalDeVectorius", "Barragem Elemental de Vectorius", "A5", "evoc", 182, "padrao|longo|ef:4 esferas elementais|instantanea|Reflexos parcial",
  "Quatro esferas (ácido, eletricidade, fogo e frio), cada uma com seu ponto: 6d6 do seu tipo em raio de 12 m (Reflexos reduz à metade; um teste por esfera). Quem falha sofre: ácido, vulnerável pela cena; eletricidade, atordoado 1 rodada (uma vez por cena); fogo, em chamas; frio, lento pela cena.",
  [[5, "a", "+2d6 em cada esfera."], [5, "m", "Todas causam dano de essência (mantendo os efeitos).", { tipoDano: "essencia" }]],
  { dano: "(6 + 2 * a0)d6", tipo: "elementos", esferas: 4, metade: 1 });
RAMATormenta20Magias.def("buracoNegro", "Buraco Negro", "U5", "conv", 182, "completa|longo|ef:buraco negro|3 rodadas|Fortitude parcial",
  "Vácuo num espaço vazio. No início de cada um dos seus três turnos seguintes, todos em alcance longo (inclusive você) fazem Fortitude ou ficam caídos e são puxados 30 m (segurar-se num objeto fixo, ação de movimento, dá +2). Quem começa o turno no buraco gasta ação de movimento e Fortitude para se arrastar 1,5 m; quem termina o turno nele some para sempre.",
  [[5, "o", "Você não é afetado."]]);
RAMATormenta20Magias.def("chuvaDeMeteoros", "Chuva de Meteoros", "A5", "conv", 183, "completa|longo|area:quadrado com 18m de lado|instantanea|Reflexos parcial",
  "Só a céu aberto. 15d6 de impacto e 15d6 de fogo, caído e agarrado sob escombros (ação padrão e Atletismo para escapar). Passar reduz à metade e evita cair e ficar preso. A área vira terreno difícil com poeira (camuflagem leve).",
  [[2, "a", "+2d6 de impacto e +2d6 de fogo."]],
  { dano: "(15 + 2 * a0)d6", tipo: "impacto", danoExtra: { dados: "(15 + 2 * a0)d6", tipo: "fogo" }, cond: "agarrado", metade: 1 });
RAMATormenta20Magias.def("controlarOTempo", "Controlar o Tempo", "A5", "trans", 187, "padrao|curto|veja texto|veja texto|",
  "Escolha. Congelar: bolha do seu tamanho em que você age por 3 rodadas enquanto, para os outros, nada passa (você e seus efeitos não saem da área). Saltar: você e até 5 voluntários vão de 1 a 24 horas para o futuro, no mesmo lugar. Voltar: desfaz a rodada anterior (inclusive PV e PM, exceto os desta magia); só você lembra; uma vez por rodada revivida.",
  [],
  { opcoes: ["congelar", "saltar", "voltar"] });
RAMATormenta20Magias.def("deflagracaoDeMana", "Deflagração de Mana", "A5", "evoc", 189, "completa|pessoal|area:esfera com 15m de raio|instantanea|Fortitude parcial",
  "Explosão de mana: 150 de dano de essência em todas as criaturas na área (menos você) e itens mágicos que não sejam artefatos viram mundanos. Passar reduz à metade e os itens voltam a funcionar em um dia.",
  [[1, "a", "+10 de dano."], [5, "o", "Afeta só as criaturas que você escolher."]],
  { dano: "150 + 10 * a0", tipo: "essencia", metade: 1 });
RAMATormenta20Magias.def("desejo", "Desejo", "A5", "trans", 190, "completa|veja texto|veja texto|veja texto|veja texto",
  "Altera a realidade. Sem custo extra: dissipa magia de até 4º círculo; leva até 10 voluntários em alcance longo a qualquer lugar e plano; ou obriga um teste da última rodada a ser refeito. Com sacrifício de 2 PM: cria item mundano de até T$ 30.000; duplica magia de até 4º círculo (com componentes); ou dá +1 num atributo de uma criatura (uma vez por atributo). Pedidos maiores ficam com o mestre — e cuidado com o que deseja.",
  [],
  { opcoes: ["dissipar", "transportar", "desfazer", "criarItem", "duplicarMagia", "atributo"], sacrificioPM: { criarItem: 2, duplicarMagia: 2, atributo: 2 } });
RAMATormenta20Magias.def("engenhoDeMana", "Engenho de Mana", "A5", "abjur", 192, "padrao|medio|ef:disco de energia com 1,5m de diâmetro|sustentada|",
  "Disco imóvel e imune a dano que faz contramágica automática (com seu Misticismo) contra magias alheias em alcance médio; vencendo, anula e absorve os PM como PM temporários, que você gasta para lançar magias estando ao alcance dele.",
  [[1, "o", "O disco segue você, sempre adjacente."], [4, "m", "Duração 1 dia.", { du: "1 dia" }]]);
RAMATormenta20Magias.def("furiaDoPanteao", "Fúria do Panteão", "D5", "evoc", 194, "completa|longo|area:cubo de 90m|sustentada|veja texto",
  "Tempestade violenta: ataques à distância impossíveis, lançar magia é condição terrível e inimigos têm a visão reduzida (como Névoa). Uma vez por turno, ação de movimento: Nevasca (10d6 de frio, Fortitude metade; terreno difícil), Raios (até 6 inimigos, 10d8 de eletricidade, Reflexos metade), Siroco (10d6, metade corte e metade fogo, e sangrando; Fortitude metade e evita) ou Trovões (10d6 de impacto e desprevenido 1 rodada; Fortitude metade e evita).",
  [],
  { opcoes: ["nevasca", "raios", "siroco", "trovoes"], dano: "10d6", tipo: "frio", metade: 1 });
RAMATormenta20Magias.def("intervencaoDivina", "Intervenção Divina", "D5", "conv", 195, "completa|veja texto|veja texto|veja texto|veja texto",
  "Sua divindade intercede. Sem custo extra: cura todos os PV e condições de até 10 criaturas em alcance longo (cura mortos-vivos também) ou dissipa magia de até 4º círculo. Com sacrifício de 2 PM: cria item mundano de até T$ 30.000; duplica magia de até 4º círculo; protege uma cidade de um desastre; ressuscita quem morreu há até uma rodada (acorda com 1 PV); ou outra coisa que o mestre autorize.",
  [],
  { opcoes: ["curar", "dissipar", "criarItem", "duplicarMagia", "protegerCidade", "ressuscitar"], sacrificioPM: { criarItem: 2, duplicarMagia: 2, protegerCidade: 2, ressuscitar: 2 } });
RAMATormenta20Magias.def("invulnerabilidade", "Invulnerabilidade", "U5", "abjur", 195, "padrao|pessoal|você|cena|",
  "Escolha. Proteção mental: imune a abalado, alquebrado, apavorado, atordoado, confuso, esmorecido, fascinado, frustrado, pasmo, encantamento e ilusão. Proteção física: imune a atordoado, cego, debilitado, enjoado, envenenado, exausto, fatigado, fraco, lento, ofuscado, paralisado, acertos críticos, ataques furtivos e doenças.",
  [[5, "m", "Alcance curto; alvo: 1 criatura.", { al: "curto", alvo: "1 criatura" }]],
  { opcoes: ["mental", "fisica"], imunesPorOpcao: { mental: ["abalado", "alquebrado", "apavorado", "atordoado", "confuso", "esmorecido", "fascinado", "frustrado", "pasmo", "encantamento", "ilusao"], fisica: ["atordoado", "cego", "debilitado", "enjoado", "envenenado", "exausto", "fatigado", "fraco", "lento", "ofuscado", "paralisado", "critico", "furtivo", "doenca"] } });
RAMATormenta20Magias.def("lagrimasDeWynna", "Lágrimas de Wynna", "D5", "abjur", 196, "padrao|curto|1 criatura|instantanea|Vontade parcial",
  "O alvo perde a capacidade de lançar magias arcanas até o fim da cena (passando, por uma rodada).",
  [[2, "m", "Área: esfera de 6 m; alvo: criaturas escolhidas.", { area: "esfera com 6m de raio", alvo: "criaturas escolhidas" }], [5, "m", "Execução 1 dia, sacrifício de 1 PM; o alvo fica em alcance curto o tempo todo. Falhando na Vontade, perde a magia arcana para sempre; passando, pode ser alvo de novo no dia seguinte.", { ex: "1 dia", sacrificioPM: 1, r: 5 }]]);
RAMATormenta20Magias.def("legiao", "Legião", "A5", "encan", 196, "padrao|medio|até 10 criaturas na área|sustentada|Vontade parcial",
  "Domina a mente dos alvos, que obedecem a tudo menos ordens claramente suicidas. No fim de cada turno, cada um testa para se livrar; quem passa fica abalado 1 rodada.",
  [[1, "a", "+1 alvo.", { alvos: 1 }]]);
RAMATormenta20Magias.def("mataDragao", "Mata-Dragão", "A5", "evoc", 198, "duas rodadas|pessoal|area:cone de 30m|instantanea|Reflexos reduz à metade",
  "Carga de energia de 20d12 de essência em criaturas, construções e objetos soltos na área; cada 12 rolado soma +1d12. Lenta para usar em combate.",
  [[1, "a", "+1d12 de dano."]],
  { dano: "(20 + a0)d12", tipo: "essencia", explode: 12, metade: 1 });
RAMATormenta20Magias.def("palavraPrimordial", "Palavra Primordial", "U5", "encan", 200, "padrao|curto|1 criatura com menos níveis que você|instantanea ou veja texto|Vontade parcial",
  "Uma palavra primordial, à escolha. Atordoar: atordoado 1d4+1 rodadas (uma vez por cena); passando ou já atordoado por ela, desprevenido 1d4 rodadas. Cegar: cego; passando, ofuscado 1d4 rodadas. Matar: morre; tem também Fortitude se tiver mais da metade dos PV; passando em qualquer um, perde 10d8 PV e fica sangrando.",
  [],
  { opcoes: ["atordoar", "cegar", "matar"], dano: "10d8", tipo: "perdaDeVida" });
RAMATormenta20Magias.def("possessao", "Possessão", "A5", "encan", 201, "padrao|longo|1 criatura|1 dia|Vontade anula",
  "Sua consciência toma o corpo do alvo: você usa sua ficha com os atributos físicos e o deslocamento dele, enquanto seu corpo fica inconsciente. Quem passa sabe da tentativa e fica imune por um dia. Se o corpo possuído morrer, faça Vontade contra sua própria CD para voltar (no alcance) ou morra também. Voltar é ação livre.",
  [[5, "o", "Acesso às habilidades de raça e classe da criatura."], [5, "o", "Pode saltar para outra criatura (Vontade dela); a anterior recobra a consciência."], [5, "m", "Permanente, destruindo seu corpo: o possuído testa Vontade a cada dia para retomar; se o corpo morrer, pode possuir outro em alcance curto.", { du: "permanente" }]]);
RAMATormenta20Magias.def("projetarConsciencia", "Projetar Consciência", "U5", "adiv", 202, "padrao|ilimitado (veja texto)|local ou criatura conhecidos|sustentada|",
  "Sua consciência vai a um local conhecido ou para perto de uma criatura no mesmo plano: forma fantasmagórica invisível (ação de movimento para se mostrar), voo 18 m, incorpórea, limitada ao local ou ao alcance curto da criatura. Vê, ouve e fala mentalmente com quem vê (idioma em comum).",
  [[10, "o", "A projeção lança magias sem componente material e não sustentadas; funciona como Forma Etérea, mas as magias afetam corpóreos."]]);
RAMATormenta20Magias.def("reanimacaoImpura", "Reanimação Impura", "D5", "necro", 203, "completa|toque|1 criatura|cena|",
  "Reanima à força alguém morto nesta cena como morto-vivo, com memórias e habilidades (inclusive magias), que pensa e fala mas obedece a você. No fim da cena volta a morrer. Destruída, não pode ser reanimada de novo assim.",
  []);
RAMATormenta20Magias.def("roubarAAlma", "Roubar a Alma", "U5", "necro", 204, "padrao|curto|1 criatura|permanente|Vontade parcial",
  "Arranca a alma e a prende num objeto que custe T$ 1.000 por nível ou ND do alvo. Passando, fica abalado 1 rodada. Falhando, o corpo fica inerte e em estase (pode ser destruído). Quebrado o objeto, a alma volta ao corpo ou parte para os Mundos dos Deuses. Sacrifício de 1 PM.",
  [[5, "o", "O objeto guarda os PM totais do alvo; empunhando-o, você os usa para lançar magias (recupera como descanso normal)."], [10, "o", "Reação ao lançar: você possui o corpo vazio, como Possessão."]],
  { sacrificioPM: 1 });
RAMATormenta20Magias.def("requiem", "Réquiem", "A5", "ilus", 204, "completa|curto|criaturas escolhidas|sustentada|Vontade anula",
  "Ilusão particular para cada alvo: no início de cada turno dele, Vontade; falhando, acha que não agiu e repete as ações do turno anterior com –5 cumulativo em todos os testes por repetição (não no teste contra a magia). Gasta recursos normalmente; alvos de resistência ganham bônus igual à penalidade.",
  []);
RAMATormenta20Magias.def("segundaChance", "Segunda Chance", "D5", "evoc", 205, "padrao|toque|1 criatura|instantanea|",
  "Asas de fênix de luz: recupera 200 PV e remove abalado, apavorado, alquebrado, atordoado, cego, confuso, debilitado, enjoado, envenenado, esmorecido, exausto, fascinado, fatigado, fraco, frustrado, lento, ofuscado, paralisado, pasmo e surdo.",
  [[1, "a", "+20 PV de cura."], [2, "m", "Alcance curto; até 5 criaturas.", { al: "curto", alvo: "até 5 criaturas" }], [5, "m", "Alvo: criatura morta há até uma rodada (a magia pode curá-la).", { alvo: "1 criatura morta há até uma rodada" }]],
  { cura: "200 + 20 * a0", removeCondicoes: ["abalado", "apavorado", "alquebrado", "atordoado", "cego", "confuso", "debilitado", "enjoado", "envenenado", "esmorecido", "exausto", "fascinado", "fatigado", "fraco", "frustrado", "lento", "ofuscado", "paralisado", "pasmo", "surdo"] });
RAMATormenta20Magias.def("semiplano", "Semiplano", "A5", "conv", 205, "completa|curto|ef:semiplano com 30m de lado|1 dia|",
  "Cria uma dimensão particular (forma à escolha, com ar, luz e calor). Entrar: ação padrão e 10 PM, +1 PM por criatura voluntária tocada e por objeto (1 Médio ou menor, 2 Grande, 5 Enorme, 10 Colossal). Voltar ao mesmo lugar: ação completa (ou Viagem Planar para outro local).",
  [[2, "o", "Alvo extra (1 criatura): é expulsa para um labirinto; a cada rodada faz Investigação ou Sobrevivência (+1 cumulativo) para escapar; Viagem Planar ajuda, teletransporte não."], [5, "m", "Permanente; maquete preciosa (T$ 5.000); lançar de novo aumenta +30 m de lado.", { du: "permanente", mat: "maquete preciosa (T$ 5.000)" }]]);
RAMATormenta20Magias.def("sombraAssassina", "Sombra Assassina", "A5", "ilus", 207, "padrao|curto|1 criatura|cena|Vontade parcial",
  "Uma sombra sólida do alvo, com as mesmas estatísticas, repete cada ação hostil dele contra ele mesmo, com as mesmas rolagens. Pode ser atacada e some a 0 PV. Passando, ela desaparece no fim do turno do alvo depois de copiar a ação dessa rodada.",
  [[10, "m", "Alvo: criaturas escolhidas.", { alvo: "criaturas escolhidas" }]]);
RAMATormenta20Magias.def("toqueDaMorte", "Toque da Morte", "U5", "necro", 209, "padrao|toque|1 criatura|instantanea|veja texto",
  "10d8+10 de dano de trevas. Se o alvo estiver com menos da metade dos PV, faz Fortitude: passando, sofre o dano normal; falhando, os PV vão a –10.",
  [[2, "m", "Alcance curto (raio púrpura).", { al: "curto" }], [10, "m", "Alcance curto; alvo: inimigos no alcance.", { al: "curto", alvo: "inimigos no alcance" }]],
  { dano: "10d8 + 10", tipo: "trevas" });
RAMATormenta20Magias.def("alterarDestino", "Alterar Destino", "A5", "adiv", 179, "reacao|pessoal|você|instantanea|",
  "Você vê todas as possibilidades de um evento: rola de novo um teste de resistência com +10, ou obriga um inimigo a rolar de novo um ataque contra você com –10.",
  [],
  { opcoes: ["resistencia", "ataque"] });
RAMATormenta20Magias.def("aprisionamento", "Aprisionamento", "A5", "abjur", 180, "completa|curto|1 criatura|permanente|Vontade anula",
  "Prisão mágica (quem passa fica imune por uma semana). O preso não respira, não come, não envelhece e não é localizado por adivinhação. Formas (componente de T$ 1.000 cada): Acorrentamento (paralisado e imóvel; corrente de mitral), Contenção Mínima (2 cm dentro de uma gema inquebrável; gema), Prisão Dimensional (semiplano sem teletransporte; miniatura de jade), Sepultamento (esfera indestrutível nas profundezas; orbe de adamante) ou Sono Eterno (fruta com ervas soníferas). Defina uma condição possível e observável que encerra a magia (o mestre valida).",
  [],
  { opcoes: ["acorrentamento", "contencaoMinima", "prisaoDimensional", "sepultamento", "sonoEterno"], mat: "componente da forma escolhida (T$ 1.000)" });
/* <<< js/tormenta20/magias-5.js */

/* >>> js/tormenta20/ameacas.js */
/* =====================================================================
   R.A.M.A. — Tormenta20 · ameaças (registro, ND de encontro, instância)
   ---------------------------------------------------------------------
   Os arquivos ameacas-1.js … chamam
     RAMATormenta20Ameacas.def(id, nome, nd, grupo, página, ficha, resumo)
   ficha = {
     tipo, sub, tam, papel (solo | lacaio | especial),
     ini, per, sentidos: [], def, fort, ref, von,
     imune: [], rd: { geral, fogo… }, vulner: [], defesasTexto,
     pv, desl (metros), mov: { voo, escalar, natacao, escavar }, pm,
     atr: [for, des, con, int, sab, car] (null = atributo nulo),
     ataques: [{ n, a, d, x, m, c, t, alc, q, dist, grupo }]
        n nome, a bônus, d dano da arma (dados + fixo), x dano extra
        (texto "1d4 acido"), m margem, c multiplicador, t tipo, alc
        alcance, q quantidade, dist à distância, grupo: ataques do mesmo
        grupo vão juntos numa ação ("e"); grupos diferentes são "ou"
     habs: [{ n, acao, pm, r (resumo), cd, res, dano, tipoDano, recarga }]
     magias: { como, cd, lista: [{ id, acao, pm, r }] }
     pericias: { chave: total }, equip, tesouro, recursos
   }
   O papel de combate vem do ícone do livro; nas fichas em que o texto
   extraído não o mostra, o RAMA o registrou pela descrição da p. 283.
   Textos são resumos do RAMA, com a página impressa do Livro Básico.
   ===================================================================== */

(function (global) {
  "use strict";

  var A = global.RAMATormenta20Ameacas = global.RAMATormenta20Ameacas || { AMEACAS: [], AMEACA: {}, NPCS: [], PERIGOS: [], PERIGO: {} };
  var TIPOS = { animal: "Animal", construto: "Construto", espirito: "Espírito", humanoide: "Humanoide", monstro: "Monstro", mortoVivo: "Morto-vivo" };
  var GRUPOS = { masmorras: "Masmorras", ermos: "Ermos", puristas: "Puristas", reinoDosMortos: "Reino dos Mortos", duyshidakk: "Duyshidakk", sszzaazitas: "Sszzaazitas", trollsNobres: "Trolls nobres", dragoes: "Dragões", tormenta: "Tormenta", npcs: "Fichas de NPCs" };

  function ndNumero(nd) {
    var s = String(nd === undefined || nd === null ? "" : nd).trim();
    var m = /^(\d+)\s*\/\s*(\d+)$/.exec(s);
    if (m) return Number(m[1]) / Number(m[2]);
    var n = Number(s);
    return isFinite(n) ? n : 0;
  }
  function ndTexto(n) {
    if (n >= 1) return String(Math.round(n * 100) / 100);
    var frac = [[1 / 8, "1/8"], [1 / 4, "1/4"], [1 / 3, "1/3"], [1 / 2, "1/2"], [3 / 4, "3/4"]];
    for (var i = 0; i < frac.length; i++) if (Math.abs(frac[i][0] - n) < 0.01) return frac[i][1];
    return String(Math.round(n * 100) / 100);
  }

  /* Monta a ficha normalizada sem registrar (cópias do Homebrew). */
  A.montar = function (id, nome, nd, grupo, pagina, f, resumo) {
    var x = f || {};
    return {
      id: id, nome: nome, nd: String(nd), ndNum: ndNumero(nd), grupo: grupo, grupoNome: GRUPOS[grupo] || grupo, pagina: pagina,
      tipo: x.tipo || "monstro", tipoNome: TIPOS[x.tipo] || x.tipo, sub: x.sub || "", tam: x.tam || "medio", papel: x.papel || "solo",
      ini: x.ini || 0, per: x.per || 0, sentidos: x.sentidos || [], def: x.def || 10, fort: x.fort || 0, ref: x.ref || 0, von: x.von || 0,
      imune: x.imune || [], rd: x.rd || {}, vulner: x.vulner || [], defesasTexto: x.defesasTexto || "",
      pv: x.pv || 1, desl: x.desl === undefined ? 9 : x.desl, mov: x.mov || {}, pm: x.pm || 0,
      atr: x.atr || [0, 0, 0, 0, 0, 0], ataques: (x.ataques || []).map(function (t, i) { return Object.assign({ m: 20, c: 2, q: 1, grupo: t.dist ? "dist" : "corpo", id: "a" + i }, t); }),
      habs: x.habs || [], magias: x.magias || null, pericias: x.pericias || {}, equip: x.equip || "", tesouro: x.tesouro || "nenhum", recursos: x.recursos || "",
      resumo: resumo || "", fonte: { livro: "Tormenta20 — Jogo do Ano", pagina: pagina }, npc: !!x.npc,
      curaAcelerada: x.curaAcelerada || 0, curaBloqueadaPor: x.curaBloqueadaPor || null, bando: !!x.bando, enxame: !!x.enxame,
      metadeFisico: !!x.metadeFisico, metadeMundano: !!x.metadeMundano, resistenciaMagia: x.resistenciaMagia || 0, incorporeo: !!x.incorporeo,
    };
  };
  A.def = function (id, nome, nd, grupo, pagina, f, resumo) {
    var a = A.montar(id, nome, nd, grupo, pagina, f, resumo);
    if (A.AMEACA[id]) A.AMEACAS = A.AMEACAS.filter(function (z) { return z.id !== id; });
    A.AMEACAS.push(a);
    A.AMEACA[id] = a;
    return a;
  };

  /* Perigos (armadilhas p. 317–318) e perigos complexos (p. 319–321). */
  A.perigo = function (id, nome, nd, pagina, f, resumo) {
    var p = Object.assign({ id: id, nome: nome, nd: String(nd), ndNum: ndNumero(nd), pagina: pagina, resumo: resumo || "", fonte: { livro: "Tormenta20 — Jogo do Ano", pagina: pagina } }, f || {});
    if (A.PERIGO[id]) A.PERIGOS = A.PERIGOS.filter(function (z) { return z.id !== id; });
    A.PERIGOS.push(p);
    A.PERIGO[id] = p;
    return p;
  };

  /* Uma ficha vinda de fora (Homebrew): os mesmos campos, limitados. */
  A.daFicha = function (f) {
    var x = f && typeof f === "object" ? f : {};
    var copia = JSON.parse(JSON.stringify(x));
    return A.montar(String(x.id || "homebrew").slice(0, 80), String(x.nome || "Ameaça").slice(0, 120), String(x.nd || "1").slice(0, 6), String(x.grupo || "homebrew").slice(0, 40), Number(x.pagina) || 0, copia, String(x.resumo || "").slice(0, 600));
  };
  A.ndNumero = ndNumero;
  A.ndTexto = ndTexto;
  A.TIPOS = TIPOS;
  A.GRUPOS = GRUPOS;

  /* ND de um grupo de criaturas iguais (p. 282): abaixo de 1, ND ×
     quantidade; de 1 em diante, +2 a cada vez que a quantidade dobra. */
  function ndDeGrupoIgual(nd, qtd) {
    var n = ndNumero(nd), q = Math.max(1, Math.floor(Number(qtd) || 1));
    if (n < 1) return n * q;
    return n + 2 * Math.log(q) / Math.LN2;
  }
  /* Encontro: [{ nd, quantidade }]. Grupos iguais seguem o livro. Com
     criaturas diferentes o livro não dá fórmula; o RAMA soma as menores
     que 1 como no livro e junta os grupos pela mesma regra de dobra
     (cada +2 de ND vale o dobro de criaturas). O resultado avisa. */
  A.ndDoEncontro = function (grupos) {
    var gs = (grupos || []).filter(function (g) { return g && Number(g.quantidade) > 0; });
    if (!gs.length) return { nd: 0, texto: "—", aproximado: false, partes: [] };
    var partes = gs.map(function (g) { return { nd: g.nd, quantidade: Math.floor(Number(g.quantidade)), ndGrupo: ndDeGrupoIgual(g.nd, g.quantidade) }; });
    var aproximado = partes.length > 1;
    var menores = partes.filter(function (p) { return ndNumero(p.nd) < 1; }).reduce(function (s, p) { return s + p.ndGrupo; }, 0);
    var valores = partes.filter(function (p) { return ndNumero(p.nd) >= 1; }).map(function (p) { return p.ndGrupo; });
    if (menores > 0) valores.push(menores);
    var nd;
    if (valores.length === 1) nd = valores[0];
    else {
      var maior = Math.max.apply(null, valores);
      if (maior < 1) nd = valores.reduce(function (s, v) { return s + v; }, 0);
      else {
        var soma = valores.reduce(function (s, v) { return s + Math.pow(2, (v - maior) / 2); }, 0);
        nd = maior + 2 * Math.log(soma) / Math.LN2;
      }
    }
    var arred = nd >= 1 ? Math.round(nd) : nd;
    return { nd: arred, ndExato: nd, texto: ndTexto(arred), aproximado: aproximado, partes: partes };
  };
  /* Dificuldade para um grupo: compara o ND do encontro com o nível
     médio, ajustando pelo tamanho do grupo (o ND supõe quatro). */
  A.dificuldade = function (ndEncontro, nivelMedio, jogadores) {
    var j = Math.max(1, Math.floor(Number(jogadores) || 4));
    var nivelEf = Number(nivelMedio) + 2 * Math.log(j / 4) / Math.LN2;
    var d = ndEncontro - nivelEf;
    if (d <= -4) return { chave: "trivial", nome: "Trivial", diferenca: d };
    if (d <= -2) return { chave: "facil", nome: "Fácil", diferenca: d };
    if (d < 2) return { chave: "equilibrado", nome: "Equilibrado", diferenca: d };
    if (d < 4) return { chave: "dificil", nome: "Difícil", diferenca: d };
    return { chave: "mortal", nome: "Muito perigoso", diferenca: d };
  };

  /* Uma ocorrência independente da ameaça para a mesa: PV próprios,
     condições próprias; a ficha do catálogo não muda. */
  A.instanciar = function (ameaca, extra) {
    var a = typeof ameaca === "string" ? A.AMEACA[ameaca] : ameaca;
    if (!a) return null;
    var e = extra || {};
    return {
      tipo: "ameaca", ameacaId: a.id, nome: e.nome || a.nome, nd: a.nd,
      pv: { atual: a.pv, max: a.pv, temp: 0 }, pm: { atual: a.pm, max: a.pm },
      def: a.def, fort: a.fort, ref: a.ref, von: a.von, ini: a.ini, per: a.per,
      rd: JSON.parse(JSON.stringify(a.rd)), imune: a.imune.slice(), vulner: a.vulner.slice(),
      condicoes: [], recargas: {}, notas: "", oculto: !!e.oculto, homebrew: e.homebrew || null,
    };
  };

  A.atributo = function (a, i) { var v = a.atr[i]; return v === null || v === undefined ? null : v; };

  A.listar = function (filtro) {
    var f = filtro || {};
    return A.AMEACAS.filter(function (a) {
      if (f.grupo && a.grupo !== f.grupo) return false;
      if (f.tipo && a.tipo !== f.tipo) return false;
      if (f.ndMax !== undefined && a.ndNum > f.ndMax) return false;
      if (f.ndMin !== undefined && a.ndNum < f.ndMin) return false;
      if (f.busca && (a.nome + " " + a.resumo).toLowerCase().indexOf(String(f.busca).toLowerCase()) < 0) return false;
      return true;
    }).sort(function (x, y) { return x.ndNum - y.ndNum || x.nome.localeCompare(y.nome); });
  };
})(typeof window !== "undefined" ? window : globalThis);
/* <<< js/tormenta20/ameacas.js */

/* >>> js/tormenta20/ameacas-1.js */
/* R.A.M.A. — Tormenta20 · ameaças: Masmorras e Ermos (Livro Básico, p. 286–293).
   Formato em js/tormenta20/ameacas.js. Resumos do RAMA. */
RAMATormenta20Ameacas.def("glop", "Glop", "1/4", "masmorras", 286, {
  tipo: "monstro", tam: "pequeno", papel: "lacaio", ini: 0, per: 0, sentidos: ["percepção às cegas"], def: 10, fort: 0, ref: 2, von: -5, imune: ["acido"], pv: 10, desl: 9,
  ataques: [{ n: "Pancada", a: 7, d: "1d4", x: "1d4 acido", t: "I" }], atr: [0, 0, 0, null, -5, -5], tesouro: "nenhum",
}, "Gosma ácida que salta sobre matéria orgânica pelos corredores das masmorras.");
RAMATormenta20Ameacas.def("ratoGigante", "Rato Gigante", "1/4", "masmorras", 286, {
  tipo: "animal", tam: "pequeno", papel: "lacaio", ini: 5, per: 4, sentidos: ["faro", "visão na penumbra"], def: 12, fort: 0, ref: 3, von: -2, pv: 3, desl: 12, mov: { escalar: 6 },
  ataques: [{ n: "Mordida", a: 7, d: "1d4+3", t: "P", efeito: "doença (infecção do esgoto, p. 318)" }],
  habs: [{ n: "Doença", r: "Quem é mordido fica exposto à infecção do esgoto (p. 318)." }], atr: [0, 2, 1, -4, 1, -3], tesouro: "nenhum",
}, "Roedor do tamanho de um cão que vive em bandos em esgotos, porões e pântanos.");
RAMATormenta20Ameacas.def("orcCombatente", "Orc Combatente", "1/2", "masmorras", 286, {
  tipo: "humanoide", sub: "orc", tam: "medio", papel: "lacaio", ini: 4, per: 1, sentidos: ["visão no escuro"], def: 14, fort: 5, ref: 3, von: 0, pv: 8, desl: 9,
  ataques: [{ n: "Maça", a: 9, d: "1d8+7", t: "I" }],
  habs: [{ n: "Sensibilidade a Luz", r: "Sob luz do sol ou similar, fica ofuscado." }], atr: [4, 1, 2, -1, -1, -1], equip: "Couro batido, maça.", tesouro: "metade",
}, "Guerreiro brutal de bando, sensível à luz do sol.");
RAMATormenta20Ameacas.def("orcChefe", "Orc Chefe", "2", "masmorras", 286, {
  tipo: "humanoide", sub: "orc", tam: "medio", papel: "solo", ini: 5, per: 3, sentidos: ["visão no escuro"], def: 19, fort: 13, ref: 7, von: 2, pv: 66, desl: 9,
  ataques: [{ n: "Machado de batalha", a: 11, d: "1d8+12", c: 3, t: "C" }],
  habs: [{ n: "Urro Selvagem", acao: "movimento", r: "+2 em ataques e dano corpo a corpo até o fim da cena, mas não faz ações que exijam calma e concentração.", efeito: { ataque: 2, dano: 2, duracao: "cena" } }, { n: "Sensibilidade a Luz", r: "Sob luz do sol ou similar, fica ofuscado." }],
  atr: [5, 2, 4, 0, 0, 0], pericias: { intimidacao: 4, sobrevivencia: 5 }, equip: "Gibão de peles, machado de batalha.", tesouro: "padrao",
}, "Líder que mantém a tribo pela força.");
RAMATormenta20Ameacas.def("orcMutante", "Orc Mutante", "5", "masmorras", 286, {
  tipo: "humanoide", sub: "orc", tam: "medio", papel: "lacaio", ini: 8, per: 5, sentidos: ["visão no escuro"], def: 22, fort: 15, ref: 11, von: 7, pv: 55, desl: 9,
  ataques: [{ n: "Machado de guerra", a: 20, d: "1d12+18", c: 3, t: "C" }, { n: "Mordida", a: 20, d: "1d6+18", t: "P" }],
  habs: [{ n: "Terceiro Braço", acao: "livre", r: "Se acertar o machado e a mordida na mesma criatura na rodada, causa mais 1d6+9 de corte.", dano: "1d6+9", tipoDano: "corte" }, { n: "Sensibilidade a Luz", r: "Sob luz do sol ou similar, fica ofuscado." }],
  atr: [6, 2, 4, -2, -2, -2], equip: "Machado de guerra.", tesouro: "padrao",
}, "Orc deformado com um terceiro braço degenerado.");
RAMATormenta20Ameacas.def("aranhaGigante", "Aranha Gigante", "2", "masmorras", 287, {
  tipo: "monstro", tam: "grande", papel: "solo", ini: 7, per: 3, sentidos: ["visão no escuro"], def: 19, fort: 8, ref: 11, von: 3, pv: 77, desl: 12, mov: { escalar: 12 },
  ataques: [{ n: "Mordida", a: 12, d: "2d6+8", t: "P", efeito: "veneno: fraco (Fort CD 18 evita)" }],
  habs: [{ n: "Teia", acao: "padrao", r: "Quadrado de 3 m em alcance curto: enredado (Ref CD 18 evita). Soltar: ação completa e Força ou Acrobacia CD 20, ou cortar (5 PV, RD 5 por 1,5 m). Fogo queima em 2 rodadas (1d6 por rodada a quem está nela). Também cobre uma área de 6 m quase invisível (Percepção CD 20); percebe tudo na própria teia.", cd: 18, res: "reflexos", condicao: "enredado" }, { n: "Veneno", r: "Fraco (Fort CD 18 evita).", cd: 18, res: "fortitude", condicao: "fraco" }],
  atr: [5, 4, 1, -5, 0, -4], pericias: { furtividade: 9 }, tesouro: "1d4 doses de veneno de aranha gigante (CD 17 para extrair, T$ 45 cada)",
}, "Aranha do tamanho de um cavalo que prende vítimas com teia e as paralisa com veneno.");
RAMATormenta20Ameacas.def("gargula", "Gárgula", "2", "masmorras", 287, {
  tipo: "construto", tam: "medio", papel: "solo", ini: 3, per: 3, sentidos: ["visão no escuro"], def: 19, fort: 13, ref: 7, von: 2, imune: ["petrificado"], rd: { geral: 5 }, pv: 65, desl: 12, mov: { voo: 18 },
  ataques: [{ n: "Garra", a: 12, d: "1d6+6", q: 2, t: "C" }],
  habs: [{ n: "Imobilidade", r: "Parada, passa por estátua (Percepção CD 35 percebe)." }], atr: [6, 2, 4, -2, 1, -2], tesouro: "padrao",
}, "Predador que finge ser estátua no alto de ruínas e mergulha com as garras.");
RAMATormenta20Ameacas.def("guerreiroDeChifres", "Guerreiro de Chifres", "3", "masmorras", 287, {
  tipo: "espirito", sub: "demônio", tam: "medio", papel: "solo", ini: 6, per: 3, sentidos: ["faro", "visão no escuro"], def: 21, fort: 13, ref: 11, von: 9, imune: ["acido", "veneno"], rd: { geral: 5, fogo: 10, frio: 10 }, pv: 100, desl: 9,
  ataques: [{ n: "Machado de guerra", a: 14, d: "1d12+16", c: 3, t: "C", grupo: "machado" }, { n: "Chifres", a: 14, d: "2d6+10", t: "I", grupo: "chifres" }],
  habs: [{ n: "Marrada", acao: "completa", r: "Investida atacando com machado e chifres no mesmo alvo, ambos com +2 da investida." }],
  atr: [5, 3, 4, -2, 1, -1], pericias: { atletismo: 8, intimidacao: 4 }, equip: "Machado de guerra cruel.", tesouro: "padrao",
}, "Demônio menor com cabeça de bode, convocado às vezes por arcanistas.");
RAMATormenta20Ameacas.def("manticora", "Mantícora", "6", "masmorras", 287, {
  tipo: "monstro", tam: "grande", papel: "solo", ini: 7, per: 8, sentidos: ["faro", "visão no escuro"], def: 26, fort: 18, ref: 7, von: 12, pv: 240, desl: 9, mov: { voo: 15 },
  ataques: [{ n: "Mordida", a: 18, d: "1d10+12", t: "P" }, { n: "Garra", a: 18, d: "1d8+12", q: 2, t: "C" }],
  habs: [{ n: "Espinhos", acao: "movimento", recarga: "movimento", r: "1d4 espinhos, cada um numa criatura em alcance médio: 1d8+7 de perfuração (Ref CD 22 reduz à metade).", cd: 22, res: "reflexos", dano: "1d8+7", tipoDano: "perfuracao" }],
  atr: [7, 2, 5, -2, 1, -1], tesouro: "padrao", recursos: "Espinhos (CD 21): T$ 150 em matéria-prima para flechas superiores.",
}, "Leão alado com rosto humano e cauda de espinhos.");
RAMATormenta20Ameacas.def("centopeiaDragao", "Centopeia-Dragão", "7", "masmorras", 287, {
  tipo: "monstro", tam: "enorme", papel: "solo", ini: 10, per: 8, sentidos: ["visão no escuro"], def: 27, fort: 20, ref: 14, von: 9, imune: ["caido"], rd: { fogo: 10 }, pv: 275, desl: 15, mov: { escavar: 6 },
  ataques: [{ n: "Mordida", a: 24, d: "2d8+18", x: "2d6 fogo", t: "P" }],
  habs: [{ n: "Agarrar Aprimorado", acao: "livre", r: "Ao acertar a mordida, pode agarrar (teste +29)." }, { n: "Aura de Calor", r: "Enfurecida, no início de cada turno dela todos em alcance curto sofrem 4d6+9 de fogo.", dano: "4d6+9", tipoDano: "fogo" }, { n: "Engolir", acao: "padrao", r: "Começando o turno agarrando uma criatura Média ou menor, vence um teste de agarrar e a engole: 2d6+18 de impacto mais 4d6+9 de fogo por turno. Uma por vez; escapa causando 20 de dano ao estômago (Defesa 10)." }],
  atr: [11, 3, 9, -4, 1, 0], tesouro: "2d4 doses de essência abissal (CD 22 para extrair)",
}, "Centopeia incandescente de dez metros que enche túneis com a bocarra.");
RAMATormenta20Ameacas.def("golemDeFerro", "Golem de Ferro", "10", "masmorras", 288, {
  tipo: "construto", tam: "grande", papel: "solo", ini: 4, per: 9, sentidos: ["visão no escuro"], def: 36, fort: 24, ref: 14, von: 11, rd: { geral: 10 }, imune: ["magia"], pv: 400, desl: 9,
  ataques: [{ n: "Pancada", a: 30, d: "2d10+25", q: 2, t: "I" }],
  habs: [{ n: "Imunidade a Magia", r: "Imune a efeitos mágicos, exceto: eletricidade mágica o deixa lento 1d6 rodadas; fogo mágico remove lento e cura 1 PV a cada 3 de dano." }, { n: "Sopro", acao: "movimento", recarga: "movimento", r: "Gás venenoso num cubo de 3 m: perde 6d12 PV e fica enjoado (Fort CD 30 reduz à metade e evita).", cd: 30, res: "fortitude", dano: "6d12", tipoDano: "perdaDeVida", condicao: "enjoado" }],
  atr: [12, -1, 10, null, 0, -5], tesouro: "nenhum",
}, "Guardião antigo e sem mente, quase invulnerável.");
RAMATormenta20Ameacas.def("bandido", "Bandido", "1/4", "ermos", 289, {
  tipo: "humanoide", sub: "humano", tam: "medio", papel: "lacaio", ini: 4, per: 1, def: 13, fort: 1, ref: 3, von: -1, pv: 6, desl: 9,
  ataques: [{ n: "Clava", a: 7, d: "1d6+3", t: "I" }], atr: [1, 2, 1, 0, -1, 0], pericias: { furtividade: 5 }, equip: "Clava.", tesouro: "metade",
}, "Salteador de estrada que embosca viajantes.");
RAMATormenta20Ameacas.def("chefeBandido", "Chefe Bandido", "1", "ermos", 289, {
  tipo: "humanoide", sub: "humano", tam: "medio", papel: "especial", ini: 4, per: 2, def: 16, fort: 5, ref: 8, von: 3, pv: 30, desl: 9,
  ataques: [{ n: "Espada curta", a: 9, d: "1d6+5", m: 19, t: "P" }, { n: "Adaga", a: 7, d: "1d4+3", m: 19, t: "P", dist: true, alc: "curto" }],
  habs: [{ n: "Ataque Furtivo", r: "Uma vez por rodada, +2d6 contra alvo desprevenido ou flanqueado (corpo a corpo ou à distância em alcance curto).", dano: "2d6" }],
  atr: [3, 2, 2, 0, 0, 1], pericias: { furtividade: 7, intimidacao: 6 }, equip: "Adaga, espada curta.", tesouro: "padrao",
}, "Líder de bando que ataca pelos flancos.");
RAMATormenta20Ameacas.def("guardaDeCidade", "Guarda de Cidade", "1/2", "ermos", 289, {
  tipo: "humanoide", sub: "humano", tam: "medio", papel: "lacaio", ini: 4, per: 3, def: 15, fort: 5, ref: 2, von: 1, pv: 8, desl: 9,
  ataques: [{ n: "Maça", a: 7, d: "1d8+5", t: "I" }], atr: [2, 1, 2, 0, 0, 0], pericias: { atletismo: 5 }, equip: "Apito, couro batido, maça.", tesouro: "nenhum",
}, "Miliciano de ruas e postos de fronteira.");
RAMATormenta20Ameacas.def("sargentoDaGuarda", "Sargento da Guarda", "1", "ermos", 289, {
  tipo: "humanoide", sub: "humano", tam: "medio", papel: "especial", ini: 5, per: 4, def: 17, fort: 9, ref: 4, von: 3, pv: 28, desl: 6,
  ataques: [{ n: "Maça", a: 10, d: "1d8+10", t: "I" }, { n: "Besta leve", a: 9, d: "1d8+5", m: 19, t: "P", dist: true, alc: "medio" }],
  habs: [{ n: "Ordens", acao: "movimento", r: "Aliados em alcance médio recebem +2 em testes de perícia até o fim da cena." }],
  atr: [3, 1, 2, 0, 0, 1], pericias: { atletismo: 7, intuicao: 4 }, equip: "Apito, besta leve, cota de malha, maça, 20 virotes.", tesouro: "metade",
}, "Oficial que coordena a guarda com ordens.");
RAMATormenta20Ameacas.def("lobo", "Lobo", "1/2", "ermos", 290, {
  tipo: "animal", tam: "medio", papel: "lacaio", ini: 5, per: 6, sentidos: ["faro", "visão na penumbra"], def: 14, fort: 6, ref: 3, von: 1, pv: 14, desl: 15,
  ataques: [{ n: "Mordida", a: 7, d: "1d6+5", t: "P" }],
  habs: [{ n: "Derrubar", acao: "livre", r: "Ao acertar a mordida, pode derrubar (teste +7)." }, { n: "Táticas de Alcateia", r: "Flanqueando, +2 no ataque e no dano além do bônus normal." }],
  atr: [3, 3, 3, -4, 2, -2], pericias: { sobrevivencia: 6 }, tesouro: "nenhum",
}, "Caçador de alcateia que derruba a presa mordendo as pernas.");
RAMATormenta20Ameacas.def("centauroCombatente", "Centauro Combatente", "1", "ermos", 290, {
  tipo: "humanoide", sub: "centauro", tam: "grande", papel: "lacaio", ini: 3, per: 3, def: 16, fort: 9, ref: 2, von: 5, pv: 35, desl: 12,
  ataques: [{ n: "Tacape", a: 9, d: "1d12+5", t: "I" }, { n: "Cascos", a: 9, d: "1d8+5", t: "I" }, { n: "Arco longo", a: 7, d: "1d10+5", c: 3, t: "P", dist: true, alc: "medio" }],
  habs: [{ n: "Investida Poderosa", r: "Em investida com o tacape, +1d12 de dano.", dano: "1d12" }, { n: "Medo de Altura", r: "Adjacente a uma queda de 3 m ou mais, fica abalado." }],
  atr: [5, 2, 3, -2, 1, -2], pericias: { sobrevivencia: 5 }, equip: "Arco longo aumentado, 20 flechas, tacape aumentado.", tesouro: "metade",
}, "Caçador equino das planícies, desconfiado e territorial.");
RAMATormenta20Ameacas.def("centauroXama", "Centauro Xamã", "3", "ermos", 290, {
  tipo: "humanoide", sub: "centauro", tam: "grande", papel: "especial", ini: 4, per: 8, def: 21, fort: 9, ref: 4, von: 15, pv: 35, desl: 12, pm: 20,
  ataques: [{ n: "Bordão", a: 11, d: "1d8+4", t: "I" }, { n: "Cascos", a: 11, d: "1d8+4", t: "I" }],
  magias: { como: "clérigo de Allihanna de 3º nível", cd: 17, lista: [{ id: "armamentoDaNatureza", acao: "movimento", pm: 3, r: "Uma arma fica mágica e o dano sobe um passo (1d8 → 1d10)." }, { id: "controlarPlantas", acao: "padrao", pm: 2, r: "Quadrado de 9 m em alcance curto vira terreno difícil; quem está nele fica enredado e imóvel (Fortitude evita)." }, { id: "curarFerimentos", acao: "padrao", pm: 3, r: "Uma criatura adjacente cura 4d8+4 PV." }] },
  habs: [{ n: "Medo de Altura", r: "Adjacente a uma queda de 3 m ou mais, fica abalado." }, { n: "Voz da Natureza", r: "Sempre sob Voz Divina, só para falar com animais." }],
  atr: [4, 1, 3, -1, 4, 0], pericias: { religiao: 8, sobrevivencia: 10 }, equip: "Bordão aumentado, símbolo sagrado de Allihanna.", tesouro: "metade",
}, "Líder espiritual que guia bandos de centauros.");
RAMATormenta20Ameacas.def("gnollSaqueador", "Gnoll Saqueador", "1", "ermos", 290, {
  tipo: "humanoide", sub: "gnoll", tam: "medio", papel: "lacaio", ini: 5, per: 4, sentidos: ["faro"], def: 15, fort: 7, ref: 7, von: 1, pv: 15, desl: 9,
  ataques: [{ n: "Lança", a: 10, d: "1d6+4", t: "P" }, { n: "Mordida", a: 10, d: "1d6+4", t: "P" }, { n: "Arco curto", a: 9, d: "1d6+3", c: 3, t: "P", dist: true, alc: "medio" }],
  atr: [3, 2, 3, -2, 1, -1], equip: "Arco curto, 20 flechas, lança.", tesouro: "metade",
}, "Povo-hiena covarde que embosca em beira de estrada e honra a rendição.");
RAMATormenta20Ameacas.def("gnollFilibusteiro", "Gnoll Filibusteiro", "2", "ermos", 291, {
  tipo: "humanoide", sub: "gnoll", tam: "medio", papel: "solo", ini: 9, per: 4, sentidos: ["faro"], def: 19, fort: 7, ref: 11, von: 4, pv: 60, desl: 9,
  ataques: [{ n: "Espada curta", a: 11, d: "1d6+4", m: 19, t: "P" }, { n: "Mordida", a: 11, d: "1d6+4", t: "P" }, { n: "Mosquete", a: 12, d: "2d8+9", m: 19, c: 3, t: "P", dist: true, alc: "medio" }],
  habs: [{ n: "Recarga Rápida", r: "Recarrega o mosquete com ação de movimento." }],
  atr: [3, 4, 3, -1, 2, -1], equip: "20 balas, espada curta, mosquete.", tesouro: "padrao",
}, "Gnoll que aprendeu as armas de fogo da civilização.");
RAMATormenta20Ameacas.def("gorlogg", "Gorlogg", "1", "ermos", 291, {
  tipo: "animal", tam: "grande", papel: "lacaio", ini: 4, per: 3, sentidos: ["visão na penumbra"], def: 16, fort: 8, ref: 5, von: 3, pv: 36, desl: 12,
  ataques: [{ n: "Mordida", a: 9, d: "2d6+8", c: 3, t: "P" }],
  habs: [{ n: "Agarrar Aprimorado", acao: "livre", r: "Ao acertar a mordida, pode agarrar (teste +13)." }],
  atr: [5, 2, 5, -4, 1, -2], pericias: { atletismo: 9 }, tesouro: "nenhum",
}, "Fera de Galrasia, meio lobo, meio crocodilo, cobiçada como montaria.");
/* <<< js/tormenta20/ameacas-1.js */

/* >>> js/tormenta20/ameacas-2.js */
/* R.A.M.A. — Tormenta20 · ameaças: Ermos e Puristas (Livro Básico, p. 291–296).
   Formato em js/tormenta20/ameacas.js. Resumos do RAMA. */
(function () {
  var D = RAMATormenta20Ameacas.def;
  var ODIO = { n: "Ódio Puro", r: "+5 em Vontade seguindo ordens de um purista de ND maior; +2 no dano contra humanoides não humanos (p. 295).", danoContra: { valor: 2, tipo: "humanoideNaoHumano" } };
  var FORMACAO = { n: "Lutar em Formação", r: "Adjacente a um aliado com esta habilidade, +2 em ataque e Defesa." };
  D("trog", "Trog", "1", "ermos", 291, {
    tipo: "humanoide", sub: "trog", tam: "medio", papel: "lacaio", ini: 3, per: 0, sentidos: ["visão no escuro"], def: 16, fort: 10, ref: 5, von: 1, pv: 11, desl: 9,
    ataques: [{ n: "Lança", a: 11, d: "1d6+5", t: "P" }, { n: "Mordida", a: 11, d: "1d6+5", t: "P" }, { n: "Azagaia", a: 9, d: "1d6+5", t: "P", dist: true, alc: "medio" }],
    habs: [{ n: "Mau Cheiro", acao: "padrao", r: "Criaturas (menos trogs) em alcance curto ficam enjoadas 1d6 rodadas (Fort CD 15 evita; quem passa fica imune por um dia). Veneno.", cd: 15, res: "fortitude", condicao: "enjoado" }, { n: "Sangue Frio", r: "+1 de dano por dado de dano de frio." }],
    vulner: [], atr: [3, 1, 3, -2, 0, -1], pericias: { furtividade: 7 }, equip: "2 azagaias, lança.", tesouro: "metade",
  }, "Homem-lagarto camaleônico que embosca no escuro e odeia anões.");
  D("loboDasCavernas", "Lobo-das-Cavernas", "2", "ermos", 292, {
    tipo: "animal", tam: "grande", papel: "lacaio", ini: 5, per: 7, sentidos: ["faro", "visão na penumbra"], def: 19, fort: 11, ref: 7, von: 6, pv: 73, desl: 15,
    ataques: [{ n: "Mordida", a: 13, d: "2d6+10", t: "P" }],
    habs: [{ n: "Derrubar", acao: "livre", r: "Ao acertar a mordida, pode derrubar (teste +15)." }, { n: "Táticas de Alcateia", r: "Flanqueando, +2 no ataque e no dano além do bônus normal." }],
    atr: [6, 2, 5, -4, 2, -2], pericias: { sobrevivencia: 11 }, tesouro: "nenhum",
  }, "Lobo pré-histórico com placas no dorso, usado como montaria por goblinoides.");
  D("caoDoInferno", "Cão do Inferno", "3", "ermos", 292, {
    tipo: "espirito", tam: "grande", papel: "solo", ini: 6, per: 4, sentidos: ["faro", "visão no escuro"], def: 21, fort: 11, ref: 9, von: 7, imune: ["fogo"], rd: { naoMagico: 10 }, vulner: ["frio"], pv: 95, desl: 12,
    ataques: [{ n: "Mordida", a: 14, d: "2d6+6", x: "2d6 fogo", t: "P" }],
    habs: [{ n: "Sopro", acao: "padrao", recarga: "movimento", r: "Cone de 6 m: 4d6+4 de fogo (Ref CD 17 reduz à metade).", cd: 17, res: "reflexos", dano: "4d6+4", tipoDano: "fogo" }],
    atr: [6, 3, 4, -2, 1, -2], pericias: { atletismo: 9 }, tesouro: "1d4 doses de essência abissal (CD 18 para extrair)", defesasTexto: "RD 10/mágico",
  }, "Fera ígnea de planos divinos trazida por conjuradores malignos.");
  D("grifo", "Grifo", "3", "ermos", 292, {
    tipo: "monstro", tam: "grande", papel: "solo", ini: 9, per: 7, sentidos: ["visão no escuro"], def: 19, fort: 9, ref: 15, von: 4, imune: ["medo"], pv: 110, desl: 12, mov: { voo: 24 },
    ataques: [{ n: "Mordida", a: 14, d: "2d6+5", t: "P" }, { n: "Garra", a: 14, d: "1d6+5", q: 2, t: "C" }],
    habs: [{ n: "Bote", acao: "completa", r: "Investida com mordida e duas garras no mesmo alvo, todas com +2 da investida." }],
    atr: [5, 4, 3, -4, 2, -1], tesouro: "Ninho: 25% de chance de 1d4 ovos de T$ 2.500 cada",
  }, "Leão com asas e cabeça de águia, entre os voadores mais rápidos de Arton.");
  D("basilisco", "Basilisco", "4", "ermos", 293, {
    tipo: "monstro", tam: "medio", papel: "solo", ini: 6, per: 5, sentidos: ["visão no escuro"], def: 23, fort: 10, ref: 9, von: 9, rd: { geral: 5 }, pv: 145, desl: 9, mov: { natacao: 9 },
    ataques: [{ n: "Mordida", a: 16, d: "2d8+12", t: "P", efeito: "veneno: peçonha concentrada" }],
    habs: [{ n: "Olhar Petrificante", r: "No início do turno dele, cada personagem em alcance curto faz Reflexos CD 18: falha fica lento; já lento, petrificado para sempre. Fechar os olhos (reação) dá imunidade, mas cego por 1 rodada. Remover paralisia reverte. Metamorfose.", cd: 18, res: "reflexos", condicao: "lento" }, { n: "Veneno", r: "Peçonha concentrada: perde 1d12 PV por rodada por 3 rodadas (Fort CD 18 reduz para 1 rodada).", cd: 18, res: "fortitude", dano: "1d12", tipoDano: "perdaDeVida" }],
    atr: [4, 2, 4, -4, 1, 0], tesouro: "1d4 doses de peçonha concentrada (CD 19); couro de basilisco (CD 19, T$ 1.000 em matéria-prima para armadura superior)",
  }, "Lagarto venenoso cujo olhar transforma em pedra.");
  D("ogro", "Ogro", "4", "ermos", 293, {
    tipo: "humanoide", sub: "gigante", tam: "grande", papel: "solo", ini: 3, per: 1, sentidos: ["visão na penumbra"], def: 23, fort: 16, ref: 10, von: 0, pv: 130, desl: 9,
    ataques: [{ n: "Tacape", a: 16, d: "1d12+18", t: "I" }],
    habs: [{ n: "Burro Demais...", r: "–5 em Intuição e Vontade (já na ficha)." }, { n: "...Para Morrer!", r: "Dano de corte, impacto e perfuração sofrido é reduzido à metade.", metadeFisico: true }],
    atr: [7, 0, 4, -3, -2, -2], pericias: { atletismo: 12, intuicao: -5 }, equip: "Tacape aumentado.", tesouro: "padrao",
  }, "Gigante bruto e fácil de enganar, às vezes a serviço de bandidos ou cultistas.");
  D("ursoCoruja", "Urso-Coruja", "4", "ermos", 293, {
    tipo: "monstro", tam: "grande", papel: "solo", ini: 7, per: 5, sentidos: ["faro", "visão no escuro"], def: 23, fort: 16, ref: 10, von: 5, pv: 145, desl: 12,
    ataques: [{ n: "Mordida", a: 16, d: "1d8+5", t: "P" }, { n: "Garra", a: 15, d: "1d6+5", q: 2, t: "C" }],
    habs: [{ n: "Agarrar Aprimorado", acao: "livre", r: "Ao acertar uma garra, pode agarrar (teste +18)." }],
    atr: [7, 3, 5, -4, 1, -2], tesouro: "nenhum",
  }, "Urso emplumado com cabeça de coruja, agressivo com tudo que se move.");
  D("serpe", "Serpe", "5", "ermos", 293, {
    tipo: "monstro", tam: "grande", papel: "solo", ini: 5, per: 7, sentidos: ["faro", "visão no escuro"], def: 24, fort: 10, ref: 16, von: 5, imune: ["paralisado"], pv: 200, desl: 9, mov: { voo: 18 },
    ataques: [{ n: "Mordida", a: 17, d: "2d6+12", t: "P" }, { n: "Ferrão", a: 17, d: "1d8+12", t: "P", efeito: "veneno: peçonha concentrada" }],
    habs: [{ n: "Agarrar Aprimorado", acao: "livre", r: "Ao acertar a mordida, pode agarrar (teste +19)." }, { n: "Veneno", r: "Peçonha concentrada: perde 1d12 PV por rodada por 3 rodadas (Fort CD 20 reduz para 1 rodada).", cd: 20, res: "fortitude", dano: "1d12", tipoDano: "perdaDeVida" }],
    atr: [6, 1, 6, -2, 1, -1], tesouro: "1d4 doses de peçonha concentrada (CD 20)",
  }, "Réptil alado sem braços, com ferrão de veneno poderoso.");
  D("recrutaPurista", "Recruta Purista", "1/2", "puristas", 294, {
    tipo: "humanoide", sub: "humano", tam: "medio", papel: "lacaio", ini: 3, per: 0, def: 16, fort: 6, ref: 2, von: 0, pv: 10, desl: 6,
    ataques: [{ n: "Alabarda", a: 8, d: "1d10+5", c: 3, t: "C" }], habs: [FORMACAO, ODIO],
    atr: [2, 1, 2, -1, -1, 0], equip: "Alabarda, cota de malha.", tesouro: "nenhum",
  }, "A ralé do exército da Supremacia.");
  D("soldadoPurista", "Soldado Purista", "1", "puristas", 294, {
    tipo: "humanoide", sub: "humano", tam: "medio", papel: "lacaio", ini: 4, per: 1, def: 20, fort: 10, ref: 4, von: 1, pv: 20, desl: 6,
    ataques: [{ n: "Espada bastarda", a: 9, d: "1d10+9", m: 19, t: "C" }, { n: "Besta pesada", a: 7, d: "1d12+4", m: 19, t: "P", dist: true, alc: "medio" }], habs: [FORMACAO, ODIO],
    atr: [3, 1, 3, 0, -1, 0], equip: "Besta pesada, escudo pesado, espada bastarda, meia armadura, 10 virotes.", tesouro: "metade",
  }, "Soldado doutrinado desde a infância nos campos da Supremacia.");
  D("sargentoMor", "Sargento-Mor", "3", "puristas", 294, {
    tipo: "humanoide", sub: "humano", tam: "medio", papel: "solo", ini: 4, per: 3, def: 24, fort: 14, ref: 9, von: 5, pv: 105, desl: 6,
    ataques: [{ n: "Espada bastarda", a: 14, d: "1d12+15", m: 19, t: "C" }, { n: "Besta pesada", a: 12, d: "1d12+10", m: 19, t: "P", dist: true, alc: "medio" }],
    habs: [FORMACAO, { n: "Varrer", acao: "livre", r: "Uma vez por rodada, ao derrubar um alvo a 0 PV com ataque corpo a corpo, ataca outra criatura ao alcance." }, ODIO],
    atr: [4, 1, 4, 0, 0, 0], equip: "Armadura completa, besta pesada, escudo pesado, espada bastarda aumentada certeira, 20 virotes.", tesouro: "padrao",
  }, "Veterano que lidera o batalhão pelo exemplo.");
  D("capelaoDeGuerra", "Capelão de Guerra", "4", "puristas", 295, {
    tipo: "humanoide", sub: "humano", tam: "medio", papel: "especial", ini: 4, per: 7, def: 21, fort: 10, ref: 5, von: 16, imune: ["medo"], pv: 105, desl: 6, pm: 25,
    ataques: [{ n: "Martelo de guerra", a: 14, d: "1d8+15", c: 3, t: "I" }],
    magias: { como: "clérigo de 5º nível", cd: 18, lista: [{ id: "armaMagica", acao: "padrao", pm: 5, r: "Uma arma fica mágica: +2 em ataque e dano e +1d6 de fogo." }, { id: "bencao", acao: "padrao", pm: 3, r: "Aliados em alcance curto: +2 em ataque e dano até o fim da cena." }, { id: "curarFerimentos", acao: "padrao", pm: 5, r: "Uma criatura adjacente cura 6d8+6 PV." }, { id: "socoDeArsenal", acao: "padrao", pm: 5, r: "Uma criatura em alcance médio: 5d6+5 de impacto e empurrada 3 m (Fortitude reduz à metade e evita)." }] },
    habs: [ODIO], atr: [4, 0, 4, 1, 3, -1], pericias: { misticismo: 5, religiao: 7 }, equip: "Armadura completa, escudo leve, martelo de guerra certeiro, símbolo sagrado.", tesouro: "padrao",
  }, "Fanático do Templo da Pureza Divina que acompanha os batalhões.");
  D("capitaoBaluarte", "Capitão-Baluarte", "5", "puristas", 295, {
    tipo: "humanoide", sub: "humano", tam: "medio", papel: "especial", ini: 4, per: 5, def: 33, fort: 15, ref: 5, von: 13, pv: 115, desl: 6,
    ataques: [{ n: "Espada longa", a: 17, d: "1d8+8", m: 19, t: "C" }],
    habs: [{ n: "Comandar", acao: "padrao", r: "Aliados em alcance médio: +4 em ataque e dano até o fim da rodada." }, { n: "Formação Invencível", r: "Aliados em alcance curto: +2 na Defesa." }, ODIO],
    atr: [3, 0, 4, 3, 1, 4], pericias: { cavalgar: 4, guerra: 7, nobreza: 7 }, equip: "Armadura completa reforçada, escudo pesado reforçado, espada longa certeira.", tesouro: "dobro",
  }, "Jovem nobre treinado para conduzir as investidas da tropa.");
  D("cavaleiroDoLeopardo", "Cavaleiro do Leopardo Sangrento", "9", "puristas", 295, {
    tipo: "humanoide", sub: "humano", tam: "medio", papel: "especial", ini: 17, per: 15, def: 36, fort: 21, ref: 11, von: 17, imune: ["medo"], pv: 270, desl: 9, pm: 58,
    ataques: [{ n: "Espada bastarda", a: 28, d: "3d6+15", m: 19, t: "C" }],
    magias: { como: "mago de 9º nível (lança magias arcanas de armadura sem teste; ao agredir corpo a corpo, uma magia como ação livre por rodada)", cd: 28, lista: [{ id: "concentracaoDeCombate", acao: "padrao", pm: 3, r: "Até o fim da cena, rola dois dados nos ataques e usa o melhor." }, { id: "dissiparMagia", acao: "padrao", pm: 3, r: "Teste de Misticismo dissipa magias com CD menor num alvo ou esfera de 3 m em alcance médio." }, { id: "peleDePedra", acao: "padrao", pm: 6, r: "RD 5 até o fim da cena." }, { id: "toqueChocante", acao: "padrao", pm: 9, r: "Ataque corpo a corpo que, acertando, causa mais 8d8+8 de eletricidade." }, { id: "velocidade", acao: "padrao", pm: 3, r: "Sustentada: uma ação padrão extra por turno (não para magias)." }] },
    habs: [ODIO], atr: [5, 2, 4, 4, 0, 2], pericias: { furtividade: 8, intimidacao: 17, misticismo: 19 }, equip: "Armadura completa reforçada, espada bastarda aumentada pungente de adamante.", tesouro: "padrao",
  }, "Guarda-costas e assassino de elite, purista entre os puristas.");
})();
/* <<< js/tormenta20/ameacas-2.js */

/* >>> js/tormenta20/ameacas-3.js */
/* R.A.M.A. — Tormenta20 · ameaças: Colosso e Reino dos Mortos (Livro Básico, p. 296–299).
   Formato em js/tormenta20/ameacas.js. Resumos do RAMA. */
(function () {
  var D = RAMATormenta20Ameacas.def;
  var BANDO = { n: "Bando", r: "Ataque que passa a Defesa por 10 ou mais causa o dobro; ataque que erra causa metade. Imune a manobras e a efeitos de alvo único sem dano; sofre +50% de dano de área. Trespassar permite um ataque extra contra o bando (uma vez por turno).", bando: true };
  var FRAQ_ZUMBI = { n: "Fraqueza Zumbi", r: "Sofre o dobro de dano de críticos e de ataques contra o cérebro (Defesa 21).", criticoDobro: true, defesaCerebro: 21 };
  var ODIO = { n: "Ódio Puro", r: "+5 em Vontade seguindo ordens de um purista de ND maior; +2 no dano contra humanoides não humanos (p. 295)." };
  D("colossoSupremo", "Colosso Supremo", "14", "puristas", 296, {
    tipo: "construto", tam: "colossal", papel: "solo", ini: 8, per: 9, sentidos: ["visão no escuro"], def: 46, fort: 31, ref: 19, von: 20, rd: { geral: 10 }, pv: 675, desl: 12, defesasTexto: "cura acelerada 20, resistência a magia +5",
    curaAcelerada: 20, resistenciaMagia: 5,
    ataques: [{ n: "Espada titânica", a: 39, d: "4d12+30", m: 19, t: "C" }],
    habs: [{ n: "Balistas", acao: "livre", r: "Duas balistas, uma por ombro, disparam em rodadas alternadas: ataque +39, 6d8 de perfuração, crítico 19, alcance médio. Cada tripulação tem Defesa 26, 50 PV e usa as resistências do colosso.", ataque: { a: 39, d: "6d8", m: 19, t: "P" } }, { n: "Fumos Tóxicos", r: "Quem começa o turno em alcance curto perde 4d6 PV e fica enjoado (Fort CD 38 evita). Veneno.", cd: 38, res: "fortitude", dano: "4d6", tipoDano: "perdaDeVida", condicao: "enjoado" }, { n: "Goblins Consertadores", r: "Goblins internos (imunes a dano, Vontade +3) mantêm a cura acelerada; se forem afetados por qualquer condição, a cura acelerada para." }, { n: "Jato de Chamas", acao: "movimento", r: "Cone de 12 m: 8d8+10 de fogo (Ref CD 38 reduz à metade).", cd: 38, res: "reflexos", dano: "8d8+10", tipoDano: "fogo" }, { n: "Passar por Cima", acao: "completa", r: "Anda até o dobro do deslocamento passando sobre criaturas Grandes ou menores: 6d8+15 de impacto (Ref CD 38 reduz à metade).", cd: 38, res: "reflexos", dano: "6d8+15", tipoDano: "impacto" }, { n: "Varrer", acao: "livre", r: "Uma vez por rodada, ao derrubar um alvo a 0 PV, ataca outra criatura ao alcance." }],
    atr: [15, -1, 10, null, -5, -5], tesouro: "1d6 engrenagens (CD 29; T$ 1.000 cada em matéria-prima para engenhocas)",
  }, "Engenho de guerra purista do tamanho de um moinho, movido por escravos goblins.");
  D("zumbi", "Zumbi", "1/4", "reinoDosMortos", 297, {
    tipo: "mortoVivo", tam: "medio", papel: "lacaio", ini: -1, per: -1, sentidos: ["visão no escuro"], def: 11, fort: 3, ref: -1, von: -1, pv: 20, desl: 6,
    ataques: [{ n: "Mordida", a: 7, d: "1d6+6", t: "P" }], habs: [FRAQ_ZUMBI], atr: [3, -1, 2, null, -1, 0], tesouro: "nenhum",
  }, "Cadáver cambaleante; sozinho é fraco, em horda é perigoso.");
  D("turbaZumbi", "Turba Zumbi", "2", "reinoDosMortos", 297, {
    tipo: "mortoVivo", sub: "bando", tam: "grande", papel: "solo", ini: 1, per: 1, sentidos: ["visão no escuro"], def: 11, fort: 5, ref: 1, von: 1, pv: 100, desl: 6, bando: true,
    ataques: [{ n: "Mordida (bando)", a: 17, d: "2d6+12", t: "P", bando: true }], habs: [BANDO, FRAQ_ZUMBI], atr: [3, -1, 3, null, -1, 0], tesouro: "nenhum",
  }, "Uma massa de zumbis que avança como um só corpo.");
  D("esqueleto", "Esqueleto", "2", "reinoDosMortos", 297, {
    tipo: "mortoVivo", tam: "medio", papel: "lacaio", ini: 7, per: 3, sentidos: ["visão no escuro"], def: 19, fort: 3, ref: 7, von: 12, rd: { corte: 5, frio: 5, perfuracao: 5 }, pv: 14, desl: 9,
    ataques: [{ n: "Espada longa", a: 14, d: "2d8+12", m: 19, t: "C" }], atr: [5, 3, 0, null, 0, -5], equip: "Escudo pesado, espada longa.", tesouro: "nenhum",
  }, "Morto-vivo sem mente, ágil com armas, que segue ordens do criador.");
  D("esqueletoDeElite", "Esqueleto de Elite", "4", "reinoDosMortos", 297, {
    tipo: "mortoVivo", tam: "medio", papel: "lacaio", ini: 10, per: 4, sentidos: ["visão no escuro"], def: 25, fort: 4, ref: 10, von: 16, rd: { corte: 5, frio: 5, perfuracao: 5 }, pv: 60, desl: 6,
    ataques: [{ n: "Espada longa", a: 18, d: "2d8+15", m: 19, x: "2d8 trevas", t: "C" }], atr: [6, 4, 2, null, 0, -5], equip: "Escudo pesado, espada longa, meia armadura.", tesouro: "nenhum",
  }, "Soldado esquelético de Aslothia, mais resistente e mais letal.");
  D("falange", "Falange", "8", "reinoDosMortos", 298, {
    tipo: "mortoVivo", sub: "bando", tam: "grande", papel: "solo", ini: 12, per: 6, sentidos: ["visão no escuro"], def: 25, fort: 6, ref: 12, von: 18, rd: { corte: 5, frio: 5, perfuracao: 5 }, pv: 300, desl: 6, bando: true,
    ataques: [{ n: "Espada longa (bando)", a: 28, d: "4d8+30", m: 19, x: "4d8 trevas", t: "C", bando: true }], habs: [BANDO], atr: [6, 4, 2, null, 0, -5], equip: "Escudos pesados, espadas longas, meias armaduras (1d8 de cada).", tesouro: "nenhum",
  }, "Tropa de esqueletos de elite que defende o Reino dos Mortos.");
  D("aparicao", "Aparição", "5", "reinoDosMortos", 298, {
    tipo: "mortoVivo", tam: "medio", papel: "solo", ini: 10, per: 6, sentidos: ["visão no escuro"], def: 23, fort: 5, ref: 17, von: 11, pv: 110, desl: 0, mov: { voo: 18 }, incorporeo: true, defesasTexto: "incorpóreo",
    ataques: [{ n: "Toque drenante", a: 18, d: "3d8+6", t: "trevas", efeito: "criatura viva faz Fort CD 21: falha fica fraca e a aparição ganha 20 PV temporários cumulativos" }],
    habs: [{ n: "Toque Drenante", r: "Vivo atingido: Fortitude CD 21 ou fica fraco; a aparição ganha 20 PV temporários cumulativos.", cd: 21, res: "fortitude", condicao: "fraco" }, { n: "Vulnerabilidade à Luz do Dia", r: "Sob luz solar natural, fica debilitada." }],
    atr: [null, 6, 0, 0, 2, 2], pericias: { furtividade: 15 }, tesouro: "nenhum",
  }, "Sombra separada do dono que odeia os vivos e drena sua força.");
  D("necromante", "Necromante", "7", "reinoDosMortos", 298, {
    tipo: "humanoide", sub: "elfo", tam: "medio", papel: "especial", ini: 9, per: 9, sentidos: ["visão na penumbra"], def: 23, fort: 7, ref: 14, von: 20, pv: 180, desl: 12, pm: 55,
    ataques: [{ n: "Adaga", a: 22, d: "1d4", m: 19, x: "1d8 trevas", t: "P" }],
    habs: [{ n: "Ergam-se!", acao: "completa", pm: 5, r: "Seis mortos-vivos em alcance curto, agindo a partir da próxima rodada: deslocamento 9 m, ação padrão para 2d8 de trevas num adjacente; For 3, Des 3, Defesa 25, 1 PV; falham em testes opostos; somem mortos ou no fim da cena.", capangas: 6 }, { n: "Sacrificar Servo", acao: "reacao", r: "Uma vez por rodada, ao sofrer dano, sacrifica um morto-vivo conjurado e o dano vira 0." }],
    magias: { como: "mago de 7º nível", cd: 26, cdEscola: { necromancia: 28 }, lista: [{ id: "amedrontar", acao: "padrao", pm: 7, r: "Animais e humanoides escolhidos em alcance curto: apavorados 1d4+1 rodadas e depois abalados (Vontade reduz para abalado)." }, { id: "armaduraArcana", acao: "padrao", pm: 7, r: "+7 na Defesa por um dia." }, { id: "cranioVoadorDeVladislav", acao: "padrao", pm: 6, r: "6d8+6 de trevas numa criatura em alcance médio e abala quem está a 3 m (Fortitude reduz à metade e evita)." }, { id: "toqueVampirico", acao: "padrao", pm: 6, r: "Toque de 10d6 de trevas (Fortitude reduz à metade); cura metade do dano causado." }] },
    atr: [0, 2, 1, 5, 0, 0], pericias: { conhecimento: 14, misticismo: 16 }, equip: "Adaga, essência de mana.", tesouro: "dobro",
  }, "Arcanista de trevas que luta protegido por seus mortos-vivos.");
  D("vampiro", "Vampiro", "12", "reinoDosMortos", 299, {
    tipo: "mortoVivo", tam: "medio", papel: "solo", ini: 15, per: 13, sentidos: ["visão no escuro"], def: 45, fort: 12, ref: 26, von: 20, rd: { naoLuz: 10 }, pv: 550, desl: 18, mov: { escalar: 18 }, curaAcelerada: 10, defesasTexto: "cura acelerada 10, RD 10/luz",
    ataques: [{ n: "Espada longa", a: 36, d: "2d8+5", m: 17, x: "2d10 trevas", q: 2, t: "C" }, { n: "Garra", a: 36, d: "2d6+25", x: "2d10 trevas", t: "C" }],
    habs: [{ n: "Dominação Vampírica", acao: "padrao", r: "Um humanoide em alcance curto fica confuso, enfeitiçado ou fascinado até o fim da cena, ou perde as memórias da última hora (Von CD 29 evita; uma vez por cena por alvo).", cd: 29, res: "vontade" }, { n: "Drenar Sangue", acao: "padrao", r: "Num vivo que esteja agarrando: 6d6 de perfuração e cura o mesmo. Quem morre assim levanta como vampiro na noite seguinte e, perdendo Vontade oposta, fica sob controle dele.", dano: "6d6", tipoDano: "perfuracao" }, { n: "Forma de Morcego", acao: "padrao", r: "Vira morcego Minúsculo (+5 Furtividade, –5 manobras), voo 12 m; termina ao atacar, lançar magia ou sofrer dano." }, { n: "Presença Majestosa", acao: "reacao", r: "Quem o ataca faz Vontade CD 29 ou não consegue feri-lo e perde a ação (quem passa fica imune pela cena).", cd: 29, res: "vontade" }, { n: "Sensibilidade ao Sol", r: "Sob luz solar direta, fica ofuscado e perde 6d6 PV por rodada." }],
    atr: [6, 5, 5, 3, 3, 6], pericias: { diplomacia: 16, enganacao: 16, furtividade: 25, nobreza: 13 }, equip: "Armadura completa delicada de mitral, espada longa precisa de mitral.", tesouro: "dobro",
  }, "Nobre morto-vivo de Aslothia, dependente de sangue e vulnerável ao sol.");
  void ODIO;
})();
/* <<< js/tormenta20/ameacas-3.js */

/* >>> js/tormenta20/ameacas-4.js */
/* R.A.M.A. — Tormenta20 · ameaças: Duyshidakk (Livro Básico, p. 300–303).
   Formato em js/tormenta20/ameacas.js. Resumos do RAMA. */
(function () {
  var D = RAMATormenta20Ameacas.def;
  D("goblinSalteador", "Goblin Salteador", "1/4", "duyshidakk", 300, {
    tipo: "humanoide", sub: "goblin", tam: "pequeno", papel: "lacaio", ini: 5, per: 1, sentidos: ["visão no escuro"], def: 13, fort: 2, ref: 3, von: -1, pv: 4, desl: 9, mov: { escalar: 9 },
    ataques: [{ n: "Adaga", a: 7, d: "1d4", m: 19, q: 2, t: "P" }],
    habs: [{ n: "Frenesi", r: "+2 em ataque e dano para cada outro goblin salteador adjacente ao alvo." }],
    atr: [0, 3, 0, 0, -1, -1], equip: "2 adagas.", tesouro: "padrao",
  }, "Goblin feroz e caótico que ataca em bando por todos os lados.");
  D("hobgoblinSoldado", "Hobgoblin Soldado", "2", "duyshidakk", 300, {
    tipo: "humanoide", sub: "hobgoblin", tam: "medio", papel: "lacaio", ini: 4, per: 1, sentidos: ["visão no escuro"], def: 19, fort: 12, ref: 7, von: 3, pv: 18, desl: 6,
    ataques: [{ n: "Espada longa", a: 15, d: "1d8+15", m: 19, t: "C" }, { n: "Arco longo", a: 11, d: "1d8+6", c: 3, t: "P", dist: true, alc: "medio" }],
    atr: [4, 2, 1, 0, 0, -1], pericias: { "oficio:armeiro": 2 }, equip: "Arco longo, cota de malha, escudo pesado, espada longa, 20 flechas.", tesouro: "padrao",
  }, "Militar disciplinado de armas e táticas de primeira.");
  D("goblinEngenhoqueiro", "Goblin Engenhoqueiro", "3", "duyshidakk", 300, {
    tipo: "humanoide", sub: "goblin", tam: "pequeno", papel: "especial", ini: 5, per: 2, sentidos: ["visão no escuro"], def: 19, fort: 3, ref: 15, von: 9, pv: 74, desl: 9, mov: { escalar: 9 },
    ataques: [{ n: "Adaga", a: 8, d: "1d4+3", m: 19, t: "P" }, { n: "Besta leve", a: 9, d: "1d8+3", m: 19, t: "P", dist: true, alc: "medio" }],
    habs: [{ n: "Engenhocas", acao: "padrao", r: "Ofício (engenhoqueiro) +10 contra CD 15 (+5 por ativação da mesma engenhoca no dia); falha enguiça pela cena. Asa de Bambu: voo 12 m pela cena. Cospe-chamas: cone de 9 m, 6d6 de fogo e em chamas (Ref CD 19 reduz à metade e evita). Gritador: criaturas escolhidas em alcance curto sofrem –2 em ataque e dano pela cena.", engenhocas: [{ n: "Asa de Bambu" }, { n: "Cospe-chamas", cd: 19, res: "reflexos", dano: "6d6", tipoDano: "fogo", condicao: "emChamas" }, { n: "Gritador" }], teste: { pericia: "oficio:engenhoqueiro", bonus: 10, cd: 15, porAtivacao: 5 } }],
    atr: [0, 2, 2, 3, -1, 0], pericias: { furtividade: 7, "oficio:engenhoqueiro": 10 }, equip: "Adaga, besta leve, instrumentos de Ofício (engenhoqueiro), 20 virotes.", tesouro: "padrao",
  }, "Inventor de sucata cujas engenhocas imprevisíveis ajudam as hordas.");
  D("arautoDeThwor", "Arauto de Thwor", "4", "duyshidakk", 301, {
    tipo: "humanoide", sub: "humano", tam: "medio", papel: "especial", ini: 5, per: 8, def: 23, fort: 10, ref: 4, von: 16, pv: 135, desl: 6, pm: 26,
    ataques: [{ n: "Machado de guerra", a: 16, d: "3d6+12", c: 3, t: "C" }],
    habs: [{ n: "O Mundo como Ele É", acao: "reacao", r: "Ao errar um ataque, rola de novo (uma vez por oponente por cena)." }],
    magias: { como: "clérigo de Thwor de 4º nível", cd: 18, lista: [{ id: "amedrontar", acao: "padrao", pm: 3, r: "Um animal ou humanoide em alcance curto: apavorado 1d4+1 rodadas e depois abalado (Vontade reduz para abalado)." }, { id: "curarFerimentos", acao: "padrao", pm: 4, r: "Uma criatura adjacente cura 5d8+5 PV." }, { id: "perdicao", acao: "padrao", pm: 1, r: "Criaturas escolhidas em alcance curto: –1 em ataque e dano pela cena." }] },
    atr: [3, 1, 3, 0, 4, 0], pericias: { intimidacao: 9, religiao: 8 }, equip: "Machado de guerra, símbolo sagrado de Thwor.", tesouro: "padrao",
  }, "Clérigo de qualquer raça que abraçou a causa de Thwor.");
  D("hobgoblinMagoDeBatalha", "Hobgoblin Mago de Batalha", "5", "duyshidakk", 301, {
    tipo: "humanoide", sub: "hobgoblin", tam: "medio", papel: "especial", ini: 5, per: 4, sentidos: ["visão no escuro"], def: 17, fort: 11, ref: 5, von: 17, pv: 120, desl: 9, pm: 35,
    ataques: [{ n: "Espada longa", a: 14, d: "1d8+3", m: 19, t: "C" }],
    habs: [{ n: "Arcano de Batalha", r: "Soma Inteligência (+4) no dano das magias." }],
    magias: { como: "mago de 5º nível", cd: 22, lista: [{ id: "amedrontar", acao: "padrao", pm: 3, r: "Um animal ou humanoide em alcance curto: apavorado 1d4+1 rodadas e depois abalado (Vontade reduz para abalado)." }, { id: "armaduraArcana", acao: "padrao", pm: 5, r: "+6 na Defesa por um dia." }, { id: "bolaDeFogo", acao: "padrao", pm: 5, r: "8d6+5 de fogo num raio de 6 m em alcance médio (Reflexos reduz à metade)." }, { id: "concentracaoDeCombate", acao: "livre", pm: 1, r: "Rola dois dados num ataque e usa o melhor." }, { id: "toqueVampirico", acao: "padrao", pm: 5, r: "Ataque com a espada; acertando, mais 6d6+5 de trevas e cura metade desse dano." }] },
    atr: [3, 1, 3, 4, 0, -1], pericias: { guerra: 9, misticismo: 9, "oficio:armeiro": 11 }, equip: "Espada longa, essência de mana.", tesouro: "padrao",
  }, "Hobgoblin que aprendeu a magia destrutiva dos tomos élficos.");
  D("engenhoDeGuerraGoblin", "Engenho de Guerra Goblin", "6", "duyshidakk", 301, {
    tipo: "construto", tam: "enorme", papel: "solo", ini: 3, per: 5, sentidos: ["visão no escuro"], def: 25, fort: 18, ref: 6, von: 12, rd: { geral: 10 }, pv: 246, desl: 12,
    ataques: [],
    habs: [{ n: "Arsenal de Engenhocas", acao: "padrao", r: "Role 1d6 quatro vezes; cada resultado ativa uma engenhoca (repetidos se perdem). 1 Canhão elétrico: linha em alcance médio, 8d8 de eletricidade (Ref CD 22 metade). 2 Balestra ácida: uma criatura em alcance médio, 8d6 de ácido e mais 4d6 no próximo turno (Ref CD 22 metade e evita o resto). 3 Foles: cone curto, 6d6 de fogo e em chamas (Ref CD 23 metade e evita). 4 Lâmina giratória: ataque +20 (4d6+10 corte, 19) em cada adjacente. 5 Poça de óleo: em alcance curto, vulneráveis a fogo e caídos (Ref CD 22 evita). 6 Reparos: recupera 20 PV.", tabela: "1d6x4", opcoes: [{ n: "Canhão elétrico", cd: 22, res: "reflexos", dano: "8d8", tipoDano: "eletricidade" }, { n: "Balestra ácida", cd: 22, res: "reflexos", dano: "8d6", tipoDano: "acido" }, { n: "Foles", cd: 23, res: "reflexos", dano: "6d6", tipoDano: "fogo", condicao: "emChamas" }, { n: "Lâmina giratória", ataque: { a: 20, d: "4d6+10", m: 19, t: "C" } }, { n: "Poça de óleo", cd: 22, res: "reflexos", condicao: "caido" }, { n: "Reparos emergenciais", cura: 20 }] }, { n: "Tripulação", r: "Destruído, 1d6 goblins salteadores saem dos escombros no início da rodada seguinte." }],
    atr: [10, 0, 7, null, 0, -5], tesouro: "padrao",
  }, "Carroça de guerra sem cavalos, cheia de armas e goblins frenéticos.");
  D("devoradorDeMedos", "Devorador de Medos", "8", "duyshidakk", 303, {
    tipo: "humanoide", sub: "bugbear", tam: "medio", papel: "solo", ini: 11, per: 9, sentidos: ["faro", "visão no escuro"], def: 31, fort: 21, ref: 15, von: 8, imune: ["medo"], pv: 325, desl: 9,
    ataques: [{ n: "Machado de guerra", a: 26, d: "1d12+20", c: 3, q: 2, t: "C" }],
    habs: [{ n: "Apavorar", acao: "movimento", r: "Intimidação oposta pela Vontade de criaturas escolhidas em alcance médio: falha fica abalado pela cena; falha por 10 ou mais, apavorado 1d4 rodadas e abalado pela cena (uma vez por criatura por cena)." }, { n: "Artesão do Medo", r: "Rola dois dados em Intimidação e usa o melhor." }, { n: "Medo Inebriante", r: "Sofre metade do dano de criaturas abaladas ou apavoradas; perto delas, ganha em perícias e dano corpo a corpo o valor da penalidade delas e PV temporários iguais a ela ao acertá-las." }],
    atr: [5, 3, 3, 0, 1, 0], pericias: { furtividade: 13, intimidacao: 14 }, equip: "Machado de guerra cruel.", tesouro: "metade",
  }, "Bugbear que fareja o medo e aterroriza antes de matar.");
  D("sombraDeThwor", "Sombra de Thwor", "9", "duyshidakk", 303, {
    tipo: "humanoide", sub: "hobgoblin", tam: "medio", papel: "especial", ini: 17, per: 10, sentidos: ["visão no escuro"], def: 33, fort: 15, ref: 21, von: 9, pv: 295, desl: 9,
    ataques: [{ n: "Machadinha", a: 27, d: "1d6+12", c: 3, q: 2, t: "C", efeito: "veneno" }, { n: "Machadinha arremessada", a: 27, d: "1d6+12", c: 3, q: 2, t: "C", dist: true, alc: "curto", efeito: "veneno" }],
    habs: [{ n: "Assassinar", acao: "movimento", r: "Analisa uma criatura em alcance curto; o primeiro Ataque Furtivo contra ela até o fim do próximo turno tem os dados dobrados." }, { n: "Ataque Furtivo", r: "Uma vez por rodada, +7d6 contra desprevenidos ou flanqueados (corpo a corpo ou à distância em alcance curto).", dano: "7d6" }, { n: "Evasão Aprimorada", r: "Reflexos para metade: passando, nenhum dano; falhando, metade.", evasaoAprimorada: true }, { n: "Um com as Sombras", r: "Nunca fica surpreendido nem flanqueado; usa Furtividade em deslocamento normal sem penalidade." }, { n: "Veneno", r: "Perde 2d12 PV por rodada por 3 rodadas (Fort CD 26 reduz para 1 rodada).", cd: 26, res: "fortitude", dano: "2d12", tipoDano: "perdaDeVida" }],
    atr: [5, 5, 5, 2, 2, 0], pericias: { acrobacia: 15, atletismo: 13, furtividade: 18, intimidacao: 9, ladinagem: 15, "oficio:armeiro": 12 }, equip: "Couro batido ajustado, 4 machadinhas atrozes, 1d4 doses de peçonha potente.", tesouro: "padrao",
  }, "Hobgoblin espião e assassino silencioso.");
})();
/* <<< js/tormenta20/ameacas-4.js */

/* >>> js/tormenta20/ameacas-5.js */
/* R.A.M.A. — Tormenta20 · ameaças: Sszzaazitas e Trolls nobres (Livro Básico, p. 304–308).
   Formato em js/tormenta20/ameacas.js. Resumos do RAMA. */
(function () {
  var D = RAMATormenta20Ameacas.def;
  var OFIDIAS = { n: "Fraquezas Ofídias", r: "+1 de dano por dado de frio; –5 nas resistências contra Músicas de Bardo." };
  var VEGETAL = { n: "Natureza Vegetal", r: "Afetado por habilidades e magias que afetam plantas." };
  var REGEN = { n: "Regeneração Vegetal", acao: "movimento", r: "Recupera 5 PV (não cura ácido nem fogo; não funciona sob luz do sol ou similar).", cura: 5 };
  var LUZ = { n: "Sensibilidade a Luz", r: "Sob luz do sol ou similar, fica ofuscado." };
  D("cascavel", "Cascavel", "1/4", "sszzaazitas", 304, {
    tipo: "animal", tam: "minusculo", papel: "lacaio", ini: 5, per: 3, sentidos: ["faro", "visão na penumbra"], def: 13, fort: 2, ref: 5, von: -1, pv: 2, desl: 6, mov: { escalar: 6, natacao: 9 },
    ataques: [{ n: "Mordida", a: 7, d: "1d4", t: "P", efeito: "veneno" }],
    habs: [{ n: "Veneno", r: "Perde 1d12 PV (Fort CD 16 evita).", cd: 16, res: "fortitude", dano: "1d12", tipoDano: "perdaDeVida" }],
    atr: [-2, 3, 0, -5, 0, -4], pericias: { furtividade: 12 }, tesouro: "1 dose de peçonha comum (CD 15)",
  }, "Cobra peçonhenta usada como armadilha pelos cultistas.");
  D("jiboia", "Jiboia", "1/2", "sszzaazitas", 304, {
    tipo: "animal", tam: "medio", papel: "lacaio", ini: 5, per: 3, sentidos: ["faro", "visão na penumbra"], def: 14, fort: 3, ref: 5, von: 0, pv: 14, desl: 6, mov: { escalar: 6, natacao: 9 },
    ataques: [{ n: "Mordida", a: 9, d: "1d6+4", t: "P" }],
    habs: [{ n: "Agarrar Aprimorado", acao: "livre", r: "Ao acertar a mordida, pode agarrar (teste +9)." }, { n: "Constrição", acao: "livre", r: "No início do turno dela, 2d6+4 de impacto em quem estiver agarrando.", dano: "2d6+4", tipoDano: "impacto" }],
    atr: [2, 3, 1, -5, 1, -4], pericias: { furtividade: 7 }, tesouro: "nenhum",
  }, "Serpente constritora.");
  D("naja", "Naja", "1", "sszzaazitas", 304, {
    tipo: "animal", tam: "pequeno", papel: "lacaio", ini: 8, per: 3, sentidos: ["faro", "visão na penumbra"], def: 17, fort: 5, ref: 10, von: 1, pv: 13, desl: 6, mov: { escalar: 6, natacao: 6 },
    ataques: [{ n: "Mordida", a: 12, d: "1d4", t: "P", efeito: "veneno" }],
    habs: [{ n: "Veneno", r: "Perde 1d12 PV por 3 rodadas (Fort CD 18 reduz para 1 rodada).", cd: 18, res: "fortitude", dano: "1d12", tipoDano: "perdaDeVida" }],
    atr: [-1, 4, 1, -5, 0, -4], pericias: { furtividade: 10 }, tesouro: "1 dose de peçonha concentrada (CD 16)",
  }, "Cobra de veneno potente, preferida para assassinatos.");
  D("sucuri", "Sucuri", "3", "sszzaazitas", 304, {
    tipo: "animal", tam: "grande", papel: "solo", ini: 5, per: 4, sentidos: ["faro", "visão na penumbra"], def: 19, fort: 9, ref: 15, von: 3, pv: 88, desl: 6, mov: { escalar: 9, natacao: 9 },
    ataques: [{ n: "Mordida", a: 18, d: "2d6+14", t: "P" }],
    habs: [{ n: "Agarrar Aprimorado", acao: "livre", r: "Ao acertar a mordida, pode agarrar (teste +20)." }, { n: "Constrição", acao: "livre", r: "No início do turno dela, 4d6+14 de impacto em quem estiver agarrando.", dano: "4d6+14", tipoDano: "impacto" }],
    atr: [6, 2, 4, -5, 1, -4], pericias: { furtividade: 8 }, tesouro: "nenhum",
  }, "Serpente gigante que esmaga a presa.");
  D("nagahGuardiao", "Nagah Guardião", "3", "sszzaazitas", 305, {
    tipo: "humanoide", sub: "nagah", tam: "medio", papel: "lacaio", ini: 6, per: 3, sentidos: ["visão na penumbra"], def: 21, fort: 6, ref: 11, von: 9, pv: 45, desl: 9, defesasTexto: "resistência a veneno +5",
    ataques: [{ n: "Cimitarra", a: 14, d: "1d6+6", m: 18, q: 2, t: "C" }, { n: "Cauda", a: 14, d: "1d6+6", t: "I" }],
    habs: [OFIDIAS], atr: [4, 3, 2, 0, 0, 0], pericias: { enganacao: 4, furtividade: 6 }, equip: "2 cimitarras.", tesouro: "padrao",
  }, "Guerreiro meio serpente a serviço dos cultos de Sszzaas.");
  D("nagahMistica", "Nagah Mística", "6", "sszzaazitas", 305, {
    tipo: "humanoide", sub: "nagah", tam: "medio", papel: "especial", ini: 8, per: 6, sentidos: ["visão na penumbra"], def: 20, fort: 6, ref: 12, von: 18, pv: 160, desl: 9, pm: 35, defesasTexto: "resistência a veneno +5",
    ataques: [{ n: "Adaga", a: 18, d: "1d6+6", m: 19, t: "P" }, { n: "Cauda", a: 18, d: "1d6+6", t: "I" }],
    habs: [{ n: "Magia Acelerada", acao: "livre", pm: 4, r: "Uma vez por rodada, uma magia de ação completa ou menor vira ação livre." }, OFIDIAS],
    magias: { como: "maga de 8º nível", cd: 24, lista: [{ id: "imagemEspelhada", acao: "padrao", pm: 5, r: "Cinco cópias: +10 na Defesa, –2 a cada ataque que erra." }, { id: "relampago", acao: "padrao", pm: 5, r: "8d6 de eletricidade numa linha em alcance médio (Reflexos reduz à metade)." }, { id: "velocidade", acao: "padrao", pm: 3, r: "Sustentada: uma ação padrão extra por turno (não para magias)." }] },
    atr: [1, 3, 2, 4, 2, 2], pericias: { conhecimento: 10, enganacao: 9, furtividade: 10, intuicao: 9, misticismo: 10 }, equip: "Adaga, essência de mana.", tesouro: "padrao",
  }, "Líder arcana das nagahs, mestra do disfarce.");
  D("cultistaDeSszzaas", "Cultista de Sszzaas", "7", "sszzaazitas", 306, {
    tipo: "monstro", sub: "medusa", tam: "medio", papel: "especial", ini: 11, per: 12, sentidos: ["visão no escuro"], def: 29, fort: 7, ref: 14, von: 20, pv: 160, desl: 9, pm: 40, defesasTexto: "resistência a veneno +5",
    ataques: [{ n: "Adaga", a: 22, d: "1d4+4", m: 19, t: "P", efeito: "veneno" }],
    habs: [{ n: "Ataque Furtivo", r: "Uma vez por rodada, +5d6 contra desprevenidos ou flanqueados.", dano: "5d6" }, { n: "Olhar Atordoante", acao: "movimento", r: "Uma criatura em alcance curto fica atordoada por 1 rodada (uma vez por cena; Fort CD 26 evita).", cd: 26, res: "fortitude", condicao: "atordoado" }, { n: "Veneno", r: "Perde 2d12 PV por 3 rodadas (Fort CD 26 reduz para 1 rodada).", cd: 26, res: "fortitude", dano: "2d12", tipoDano: "perdaDeVida" }],
    magias: { como: "clériga de Sszzaas de 7º nível", cd: 26, lista: [{ id: "armaMagica" }, { id: "comando" }, { id: "curarFerimentos" }, { id: "escuridao" }, { id: "enxameDePestes" }, { id: "miasmaMefitico" }] },
    atr: [0, 2, 0, 4, 4, 5], pericias: { enganacao: 20, intuicao: 20, religiao: 17 }, equip: "Adaga certeira, couraça, escudo leve, símbolo sagrado de Sszzaas.", tesouro: "padrao",
  }, "Medusa que manipula a cabala sszzaazita das sombras.");
  D("hidra", "Hidra", "11", "sszzaazitas", 306, {
    tipo: "monstro", tam: "enorme", papel: "solo", ini: 9, per: 9, sentidos: ["faro", "visão no escuro"], def: 35, fort: 24, ref: 18, von: 9, pv: 550, desl: 9, mov: { natacao: 9 }, curaAcelerada: 100, defesasTexto: "cura acelerada 100",
    ataques: [{ n: "Mordida", a: 34, d: "3d6+16", q: 5, t: "P" }],
    habs: [{ n: "Cortar Cabeças", r: "Atacar uma cabeça dá –2; acertando com 25+ de corte, decepa (–1 mordida). Em 1d4 rodadas nascem duas (até dez), salvo se o pescoço for cauterizado com 25 de ácido ou fogo. Sem cabeças e com tudo cauterizado, morre.", cabecas: { inicial: 5, max: 10, danoCorte: 25, cauterizar: 25 } }],
    atr: [10, 0, 10, -4, 0, -1], pericias: { furtividade: 4 }, tesouro: "padrao",
  }, "Réptil de cinco cabeças que se multiplicam quando cortadas.");
  D("lagash", "Lagash", "13", "sszzaazitas", 306, {
    tipo: "monstro", tam: "enorme", papel: "solo", ini: 19, per: 11, sentidos: ["faro", "visão no escuro"], def: 41, fort: 26, ref: 20, von: 13, imune: ["movimento", "veneno"], pv: 660, desl: 12, mov: { escalar: 12, natacao: 12 },
    ataques: [{ n: "Mordida", a: 37, d: "4d12+28", t: "P", efeito: "veneno" }],
    habs: [{ n: "Agarrar Aprimorado", acao: "livre", r: "Ao acertar a mordida, pode agarrar (teste +42)." }, { n: "Constrição", acao: "livre", r: "No início do turno dele, 6d12+28 de impacto em quem estiver agarrando.", dano: "6d12+28", tipoDano: "impacto" }, { n: "Crias de Sszzaas", acao: "movimento", recarga: "movimento", r: "Cospe 2d6 serpentes em alcance curto: agem a partir da próxima rodada, deslocamento 9 m, ação padrão para 1d6 de perfuração; Defesa nula, 1 PV; somem mortas ou no fim da cena." }, { n: "Cuspe Venenoso", acao: "padrao", r: "Cone de 9 m: perde 6d12 PV e cego 1d4 rodadas (Fort CD 35 reduz à metade e evita a cegueira).", cd: 35, res: "fortitude", dano: "6d12", tipoDano: "perdaDeVida", condicao: "cego" }, { n: "Veneno", r: "Perde 4d12 PV por rodada por 5 rodadas (Fort CD 35 reduz para 1 rodada).", cd: 35, res: "fortitude", dano: "4d12", tipoDano: "perdaDeVida" }],
    atr: [11, 4, 9, -3, 2, -2], pericias: { furtividade: 17 }, tesouro: "padrao",
  }, "Serpente colossal e sagrada que cospe veneno e cobras.");
  D("finntrollCacador", "Finntroll Caçador", "2", "trollsNobres", 307, {
    tipo: "monstro", sub: "finntroll", tam: "medio", papel: "lacaio", ini: 7, per: 7, sentidos: ["visão no escuro"], def: 19, fort: 6, ref: 12, von: 4, imune: ["atordoado", "metamorfose"], pv: 65, desl: 9, defesasTexto: "resistência a magia +2",
    ataques: [{ n: "Cimitarra", a: 12, d: "1d6+5", m: 18, q: 2, t: "C" }, { n: "Besta pesada", a: 12, d: "1d12+4", m: 19, t: "P", dist: true, alc: "medio" }, { n: "Rede", a: 12, d: "0", t: "", dist: true, alc: "curto", efeito: "agarrar", grupo: "rede" }],
    habs: [{ n: "Marca da Presa", acao: "movimento", r: "Até o fim da cena, +1d8 de dano contra uma criatura em alcance curto (+2d8 se anão, elfo ou humano)." }, VEGETAL, REGEN, LUZ],
    atr: [2, 3, 3, 2, 2, -1], pericias: { furtividade: 8, sobrevivencia: 7 }, equip: "Besta pesada, 2 cimitarras, rede, 20 virotes.", tesouro: "padrao",
  }, "Troll nobre caçador de escravos da superfície.");
  D("finntrollFeitor", "Finntroll Feitor", "6", "trollsNobres", 307, {
    tipo: "monstro", sub: "finntroll", tam: "medio", papel: "especial", ini: 9, per: 5, sentidos: ["visão no escuro"], def: 20, fort: 8, ref: 12, von: 16, imune: ["atordoado", "metamorfose"], pv: 155, desl: 9, pm: 35, defesasTexto: "resistência a magia +2",
    ataques: [{ n: "Chicote", a: 18, d: "1d3+10", m: 19, t: "C" }],
    habs: [{ n: "Açoitar", acao: "padrao", r: "No próximo turno de cada aliado em alcance médio, ele ganha uma ação de movimento extra e +2 em ataque e dano." }, VEGETAL, REGEN, LUZ],
    magias: { como: "mago de 7º nível", cd: 26, cdEscola: { encantamento: 28 }, lista: [{ id: "adagaMental" }, { id: "armaduraArcana" }, { id: "enfeiticar" }, { id: "desesperoEsmagador" }, { id: "marcaDaObediencia" }, { id: "relampago" }] },
    atr: [0, 3, 3, 4, 0, 2], pericias: { intimidacao: 9, misticismo: 11 }, equip: "Chicote cruel.", tesouro: "dobro",
  }, "Troll nobre de casta alta que comanda escravos e monstros.");
})();
/* <<< js/tormenta20/ameacas-5.js */

/* >>> js/tormenta20/ameacas-6.js */
/* R.A.M.A. — Tormenta20 · ameaças: Trolls, Dragões e Tormenta (Livro Básico, p. 308–316).
   Formato em js/tormenta20/ameacas.js. Resumos do RAMA. */
(function () {
  var D = RAMATormenta20Ameacas.def;
  var LUZ = { n: "Sensibilidade a Luz", r: "Sob luz do sol ou similar, fica ofuscado." };
  var VARRER = { n: "Varrer", acao: "livre", r: "Uma vez por rodada, ao derrubar um alvo a 0 PV com ataque corpo a corpo, ataca outra criatura ao alcance." };
  var DRACONICAS = { n: "Habilidades Dracônicas", r: "Imune a atordoamento, cansaço, fogo (tipo do sopro), metamorfose e paralisia. Adultos ou mais velhos lançam magias sem palavras, gestos ou concentração. Jovens ou mais velhos usam Metamorfose Dracônica (ação completa). Resistência a magia +1 por categoria de idade (p. 311)." };
  var DRAG_IMUNE = ["fogo", "atordoado", "fatigado", "exausto", "metamorfose", "paralisado"];
  function aura(cd) { return { n: "Aura Aterradora", r: "Quem começa o turno em alcance longo fica apavorado (4 níveis ou menos) ou abalado (5 ou mais) até o fim da cena (Vontade CD " + cd + " evita; quem passa fica imune por um dia).", cd: cd, res: "vontade", condicao: "abalado" }; }
  function sopro(cone, dados, cd) { return { n: "Sopro", acao: "padrao", recarga: "movimento", r: "Cone de " + cone + ": " + dados + " de fogo e em chamas (Ref CD " + cd + " reduz à metade e evita a condição).", cd: cd, res: "reflexos", dano: dados, tipoDano: "fogo", condicao: "emChamas" }; }
  var LEFEU_IMUNE = ["critico", "acido", "fatigado", "exausto", "eletricidade", "fogo", "frio", "luz", "paralisado", "metabolismo", "metamorfose", "trevas", "veneno"];
  var LEFEU = { n: "Habilidades Lefeu", r: "Imune a críticos, ácido, cansaço, eletricidade, fogo, frio, luz, paralisia, metabolismo, metamorfose, trevas e veneno. Soma Sabedoria em ataque, Defesa e Reflexos (já na ficha). +5 em Percepção e não pode ser flanqueado (p. 315)." };
  function insanidade(pm, cd) { return { n: "Insanidade da Tormenta", r: "Quem vê lefeu faz Vontade CD " + cd + " (contra o de maior ND) ou perde " + pm + " PM (+1 por lefeu extra); a 0 PM fica confuso. Uma vez por dia.", cd: cd, res: "vontade", perdaPM: pm, insanidade: true }; }

  D("ganchador", "Ganchador", "5", "trollsNobres", 308, {
    tipo: "monstro", tam: "grande", papel: "solo", ini: 7, per: 5, sentidos: ["percepção às cegas"], def: 26, fort: 15, ref: 11, von: 7, pv: 210, desl: 9, mov: { escalar: 9 },
    ataques: [{ n: "Mordida", a: 17, d: "2d6+8", t: "P" }, { n: "Garra", a: 17, d: "1d8+8", m: 19, c: 3, q: 2, t: "C" }],
    habs: [{ n: "Dilacerar", r: "Acertando as duas garras na mesma criatura na rodada, mais 2d8+8 de dano.", dano: "2d8+8" }, { n: "Quebrar Tudo!", r: "+2 para quebrar (teste +21) e +1d8 de dano contra objetos." }, LUZ],
    atr: [6, 3, 5, -2, 1, -2], tesouro: "metade e 2 garras (CD 20; T$ 500 cada em matéria-prima para armas de corte superiores)",
  }, "Besouro humanoide de garras em gancho, escravo dos finntroll.");
  D("troll", "Troll", "5", "trollsNobres", 308, {
    tipo: "monstro", tam: "grande", papel: "solo", ini: 4, per: 3, sentidos: ["visão no escuro"], def: 23, fort: 14, ref: 10, von: 6, pv: 165, desl: 9, curaAcelerada: 15, curaBloqueadaPor: ["acido", "fogo"], defesasTexto: "cura acelerada 15/ácido ou fogo",
    ataques: [{ n: "Mordida", a: 17, d: "1d8+6", t: "P" }, { n: "Garra", a: 17, d: "1d6+6", q: 2, t: "C" }],
    habs: [{ n: "Dilacerar", r: "Acertando as duas garras na mesma criatura na rodada, mais 2d6+6 de dano.", dano: "2d6+6" }, { n: "Variantes (p. 309)", r: "Ghillanin: Defesa 25 e sensível à luz (ofuscado e sem cura acelerada). Glacioll: dano de frio vira PV temporários (+1 em ataque e dano a cada 10, pela cena) e sofre +50% de fogo. Vrakoll: natação 9 m, respira na água, –2 em ataques em terra firme." }],
    atr: [6, 2, 6, -2, -1, -2], tesouro: "padrao", variantes: ["ghillanin", "glacioll", "vrakoll"],
  }, "Monstro vegetal faminto que regenera tudo, menos fogo e ácido.");
  D("trollDasCavernas", "Troll das Cavernas", "9", "trollsNobres", 309, {
    tipo: "monstro", tam: "enorme", papel: "solo", ini: 7, per: 14, sentidos: ["faro", "visão no escuro"], def: 29, fort: 21, ref: 15, von: 9, pv: 345, desl: 12, mov: { escalar: 9 }, curaAcelerada: 20, curaBloqueadaPor: ["acido", "fogo"], defesasTexto: "cura acelerada 20/ácido ou fogo",
    ataques: [{ n: "Tacape", a: 26, d: "3d6+27", t: "I" }, { n: "Mordida", a: 26, d: "2d6+27", t: "P" }],
    habs: [{ n: "Golpe Avassalador", acao: "livre", r: "Acertando o tacape, arremessa a vítima 1d6 × 1,5 m e a deixa caída (Fort CD 28 evita); batendo num obstáculo, 1d6 por 1,5 m voado.", cd: 28, res: "fortitude", condicao: "caido" }, VARRER],
    atr: [9, 0, 11, -2, -1, -2], equip: "Tacape gigante.", tesouro: "metade",
  }, "Troll gigantesco de pele de pedra, arma pesada dos finntroll.");
  D("enxameKobold", "Enxame Kobold", "2", "dragoes", 310, {
    tipo: "monstro", sub: "kobold, enxame", tam: "medio", papel: "solo", ini: 6, per: 1, sentidos: ["visão no escuro"], def: 17, fort: 7, ref: 13, von: 2, pv: 60, desl: 9, enxame: true,
    ataques: [],
    habs: [{ n: "Caixa com Pregos", acao: "padrao", r: "Uma criatura em alcance curto sofre 2d6 de perfuração e fica atordoada 1 rodada (Ref CD 16 reduz à metade e evita).", cd: 16, res: "reflexos", dano: "2d6", tipoDano: "perfuracao", condicao: "atordoado" }, { n: "Enxame", r: "Entra no espaço de personagens e, no fim do turno, causa 2d6 de perfuração automática a quem estiver nele. Imune a manobras e a efeitos de alvo único sem dano; +50% de dano de área; metade do dano de ataques com armas. Dentro dele, lançar magia é condição ruim.", dano: "2d6", tipoDano: "perfuracao", enxame: true }, { n: "Unidos Venceremos", r: "No início de cada rodada, +10 PV (até 100). +1 de dano para cada 10 PV que tem.", ganhaPV: 10, maxPV: 100 }],
    atr: [0, 3, 0, -1, 0, -1], tesouro: "metade",
  }, "Praga de pequenos humanoides dracônicos que ataca em massa.");
  D("dragaoFilhote", "Dragão Filhote", "3", "dragoes", 310, {
    tipo: "monstro", sub: "dragão", tam: "medio", papel: "solo", ini: 8, per: 5, sentidos: ["percepção às cegas", "visão no escuro"], def: 22, fort: 15, ref: 3, von: 9, imune: DRAG_IMUNE, vulner: ["frio"], pv: 140, desl: 12, mov: { voo: 18 }, resistenciaMagia: 1, defesasTexto: "resistência a magia +1",
    ataques: [{ n: "Mordida", a: 15, d: "2d6+5", t: "P" }, { n: "Garra", a: 15, d: "1d6+5", q: 2, t: "C" }],
    habs: [sopro("6 m", "2d12", 18), DRACONICAS],
    atr: [4, 3, 3, 0, 0, 0], tesouro: "padrao",
  }, "Jovem cuspidor de fogo, já perigoso para iniciantes.");
  D("dragaoJovem", "Dragão Jovem", "7", "dragoes", 310, {
    tipo: "monstro", sub: "dragão", tam: "grande", papel: "solo", ini: 11, per: 11, sentidos: ["percepção às cegas", "visão no escuro"], def: 32, fort: 20, ref: 9, von: 12, imune: DRAG_IMUNE, vulner: ["frio"], rd: { geral: 5 }, pv: 320, desl: 12, mov: { voo: 18 }, pm: 15, resistenciaMagia: 2, defesasTexto: "resistência a magia +2",
    ataques: [{ n: "Mordida", a: 25, d: "2d6+14", m: 19, t: "P" }, { n: "Garra", a: 25, d: "1d8+14", m: 19, q: 2, t: "C" }],
    habs: [sopro("9 m", "6d12", 25), VARRER, DRACONICAS],
    atr: [7, 2, 6, 2, 2, 2], pericias: { intimidacao: 11 }, tesouro: "dobro e 2 peças de couro de dragão (CD 22)",
  }, "Dragão em ascensão, capaz de mudar de forma.");
  D("dragaoAdulto", "Dragão Adulto", "11", "dragoes", 311, {
    tipo: "monstro", sub: "dragão", tam: "enorme", papel: "solo", ini: 12, per: 15, sentidos: ["percepção às cegas", "visão no escuro"], def: 42, fort: 24, ref: 11, von: 18, imune: DRAG_IMUNE, vulner: ["frio"], rd: { geral: 10 }, pv: 600, desl: 12, mov: { voo: 24 }, pm: 70, resistenciaMagia: 3, defesasTexto: "resistência a magia +3",
    ataques: [{ n: "Mordida", a: 35, d: "4d10+25", m: 18, t: "P" }, { n: "Garra", a: 35, d: "3d10+25", m: 18, q: 2, t: "C" }],
    magias: { como: "conjurador arcano de 11º nível", cd: 32, lista: [{ id: "campoDeForca", acao: "reacao", pm: 4, r: "Ao sofrer dano, RD 30 contra ele." }, { id: "curarFerimentos", acao: "padrao", pm: 11, r: "Uma criatura adjacente cura 12d8+12 PV." }, { id: "dissiparMagia", acao: "padrao", pm: 3, r: "Misticismo dissipa magias de CD menor num alvo ou esfera de 3 m em alcance médio." }, { id: "enfeiticar", acao: "padrao", pm: 1, r: "Um humanoide em alcance curto fica enfeitiçado até o fim da cena (Vontade evita)." }, { id: "globoDeInvulnerabilidade", acao: "padrao", pm: 6, r: "Sustentada: esfera de 3 m que detém magias de até 2º círculo." }, { id: "velocidade", acao: "padrao", pm: 3, r: "Sustentada: uma ação padrão extra por turno (não para magias)." }] },
    habs: [aura(31), sopro("12 m", "12d12", 32), VARRER, DRACONICAS],
    atr: [11, 1, 8, 4, 4, 4], pericias: { enganacao: 15, intimidacao: 15, misticismo: 15 }, tesouro: "dobro e 4 peças de couro de dragão (CD 26)",
  }, "Dragão em pleno poder, conjurador e tirano de sua região.");
  D("dragaoVeneravel", "Dragão Venerável", "15", "dragoes", 311, {
    tipo: "monstro", sub: "dragão", tam: "enorme", papel: "solo", ini: 16, per: 22, sentidos: ["percepção às cegas", "visão no escuro"], def: 52, fort: 28, ref: 15, von: 22, imune: DRAG_IMUNE, vulner: ["frio"], rd: { geral: 15 }, pv: 800, desl: 12, mov: { voo: 24 }, pm: 97, resistenciaMagia: 4, defesasTexto: "resistência a magia +4",
    ataques: [{ n: "Mordida", a: 44, d: "4d12+40", m: 17, t: "P" }, { n: "Garra", a: 44, d: "3d12+40", m: 17, q: 2, t: "C" }],
    magias: { como: "conjurador arcano de 15º nível", cd: 40, lista: [{ id: "campoDeForca", acao: "reacao", pm: 7, r: "Ao sofrer dano, RD 50 contra ele." }, { id: "controlarAGravidade", acao: "padrao", pm: 10, r: "Sustentada: cubo de 12 m em alcance médio (p. 186)." }, { id: "curarFerimentos", acao: "padrao", pm: 15, r: "Uma criatura adjacente cura 16d8+16 PV." }, { id: "dissiparMagia", acao: "padrao", pm: 3, r: "Misticismo dissipa magias de CD menor num alvo ou esfera de 3 m em alcance médio." }, { id: "enfeiticar", acao: "padrao", pm: 1, r: "Um humanoide em alcance curto fica enfeitiçado até o fim da cena (Vontade evita)." }, { id: "globoDeInvulnerabilidade", acao: "padrao", pm: 10, r: "Sustentada: detém magias de até 3º círculo." }, { id: "velocidade", acao: "padrao", pm: 3, r: "Sustentada: uma ação padrão extra por turno (não para magias)." }] },
    habs: [aura(40), { n: "Fluxo de Mana", r: "Mantém duas magias sustentadas com uma ação livre (pagando cada uma)." }, { n: "Magia Acelerada", acao: "livre", pm: 4, r: "Uma vez por rodada, uma magia de ação completa ou menor vira ação livre." }, sopro("15 m", "16d12", 40), VARRER, DRACONICAS],
    atr: [13, 1, 10, 6, 6, 6], pericias: { enganacao: 22, intimidacao: 22, intuicao: 22, misticismo: 22 }, tesouro: "dobro e 4 peças de couro de dragão (CD 30)",
  }, "Dragão antigo de sabedoria e crueldade imensas.");
  D("dragaoRei", "Dragão-Rei", "20", "dragoes", 312, {
    tipo: "monstro", sub: "dragão", tam: "colossal", papel: "solo", ini: 19, per: 27, sentidos: ["percepção às cegas", "visão no escuro"], def: 62, fort: 34, ref: 20, von: 28, imune: DRAG_IMUNE, vulner: ["frio"], rd: { geral: 20 }, pv: 1400, desl: 12, mov: { voo: 36 }, pm: 128, resistenciaMagia: 5, metadeMundano: true, defesasTexto: "resistência a magia +5; metade do dano de fontes mundanas",
    ataques: [{ n: "Mordida", a: 55, d: "6d20+50", m: 16, t: "P" }, { n: "Garra", a: 50, d: "6d20+50", m: 16, q: 2, t: "C" }],
    magias: { como: "conjurador arcano de 20º nível", cd: 50, lista: [{ id: "campoDeForca", acao: "reacao", pm: 7, r: "Ao sofrer dano, RD 50 contra ele." }, { id: "controlarAGravidade", acao: "padrao", pm: 10, r: "Sustentada: cubo de 12 m em alcance médio." }, { id: "controlarOTempo", acao: "padrao", pm: 15, r: "Controla o tempo ao redor (p. 187)." }, { id: "dissiparMagia", acao: "padrao", pm: 3, r: "Misticismo dissipa magias de CD menor." }, { id: "enfeiticar", acao: "padrao", pm: 1, r: "Um humanoide em alcance curto fica enfeitiçado (Vontade evita)." }, { id: "globoDeInvulnerabilidade", acao: "padrao", pm: 15, r: "Sustentada: detém magias de até 4º círculo." }, { id: "segundaChance", acao: "padrao", pm: 20, r: "Uma criatura adjacente cura 300 PV e condições." }, { id: "velocidade", acao: "padrao", pm: 10, r: "Sustentada: uma ação padrão extra por turno." }] },
    habs: [aura(50), { n: "Escamas Supremas", r: "Sofre metade do dano de fontes mundanas." }, { n: "Fluxo de Mana", r: "Mantém duas magias sustentadas com uma ação livre." }, { n: "Magia Acelerada", acao: "livre", pm: 4, r: "Uma vez por rodada, uma magia de ação completa ou menor vira ação livre." }, sopro("18 m", "20d12", 50), VARRER, DRACONICAS],
    atr: [17, 0, 12, 7, 7, 7], pericias: { enganacao: 26, intimidacao: 26, intuicao: 26, misticismo: 26 }, tesouro: "dobro e 6 peças de couro de dragão (CD 35)",
  }, "O ápice dos dragões, rival de deuses menores.");
  D("tiranoDoTerceiro", "Tirano do Terceiro", "10", "dragoes", 313, {
    tipo: "humanoide", sub: "humano", tam: "medio", papel: "especial", ini: 9, per: 10, sentidos: ["visão no escuro"], def: 37, fort: 22, ref: 10, von: 16, imune: ["atordoado", "medo"], rd: { geral: 5 }, pv: 370, desl: 6, pm: 62, resistenciaMagia: 2, defesasTexto: "resistência a magia +2",
    ataques: [{ n: "Machado de batalha", a: 29, d: "2d8+14", c: 3, q: 2, t: "C" }, { n: "Garra", a: 29, d: "1d8+14", t: "C" }],
    habs: [{ n: "Dádiva Dracônica", r: "Lança magias arcanas cavalgando ou de armadura sem teste de Misticismo." }],
    magias: { como: "mago de 10º nível", cd: 30, lista: [{ id: "bolaDeFogo", acao: "padrao", pm: 9, r: "12d6+5 de fogo num raio de 6 m em alcance médio (Reflexos reduz à metade)." }, { id: "concentracaoDeCombate", acao: "padrao", pm: 8, r: "Até o fim da cena, rola dois dados ao atacar e quem o ataca rola dois e usa o pior." }, { id: "velocidade", acao: "padrao", pm: 3, r: "Sustentada: uma ação padrão extra por turno (não para magias)." }] },
    atr: [6, 0, 6, 2, 1, 4], pericias: { cavalgar: 9, intimidacao: 13, misticismo: 11 }, equip: "Armadura completa de adamante, machado de batalha de adamante atroz.", tesouro: "dobro",
  }, "Servo de Kallyadranoch que cavalga dragões e aterroriza reinos.");
  D("maniacoLefou", "Maníaco Lefou", "2", "tormenta", 314, {
    tipo: "humanoide", sub: "lefou", tam: "medio", papel: "lacaio", ini: 4, per: 2, def: 18, fort: 12, ref: 7, von: 3, pv: 25, desl: 9,
    ataques: [{ n: "Machado de guerra", a: 16, d: "1d12+15", c: 3, t: "C" }],
    habs: [{ n: "Frenesi Insano", r: "Sempre que causa ou sofre dano, +2 cumulativo em ataque e dano até o fim da cena." }],
    atr: [5, 1, 1, -1, -1, -2], equip: "Machado de guerra.", tesouro: "metade",
  }, "Meio-demônio da Tormenta consumido pela loucura.");
  D("uktril", "Uktril", "3", "tormenta", 314, {
    tipo: "monstro", sub: "lefeu", tam: "medio", papel: "lacaio", ini: 9, per: 10, sentidos: ["visão no escuro"], def: 22, fort: 12, ref: 11, von: 6, imune: LEFEU_IMUNE, rd: { geral: 10 }, pv: 45, desl: 9,
    ataques: [{ n: "Pinça", a: 16, d: "2d6+6", m: 19, t: "C" }, { n: "Garra", a: 16, d: "1d6+6", t: "C" }],
    habs: [insanidade("1d6", 17), LEFEU], atr: [5, 4, 2, -1, 2, -4], tesouro: "nenhum",
  }, "O lefeu mais comum: meio humano, meio formiga.");
  D("geraktril", "Geraktril", "6", "tormenta", 314, {
    tipo: "monstro", sub: "lefeu", tam: "medio", papel: "solo", ini: 13, per: 16, sentidos: ["visão no escuro"], def: 30, fort: 18, ref: 15, von: 6, imune: LEFEU_IMUNE, rd: { geral: 10 }, pv: 240, desl: 9,
    ataques: [{ n: "Pinça", a: 23, d: "3d6+10", m: 19, q: 2, t: "C" }, { n: "Garra", a: 23, d: "1d8+10", t: "C" }],
    habs: [insanidade("2d4", 22), LEFEU], atr: [7, 5, 3, 1, 3, -1], tesouro: "nenhum",
  }, "Lefeu de três braços que lidera bandos de uktril.");
  D("reishid", "Reishid", "8", "tormenta", 314, {
    tipo: "monstro", sub: "lefeu", tam: "medio", papel: "especial", ini: 17, per: 19, sentidos: ["visão no escuro"], def: 37, fort: 19, ref: 21, von: 10, imune: LEFEU_IMUNE, rd: { geral: 10 }, pv: 295, desl: 9, mov: { escalar: 9, voo: 15 },
    ataques: [{ n: "Adaga da Tormenta", a: 30, d: "1d4+18", x: "1d8 trevas", m: 19, t: "P" }, { n: "Garra", a: 30, d: "1d6+18", t: "C" }, { n: "Mordida", a: 30, d: "1d6+18", t: "P", efeito: "veneno" }],
    habs: [{ n: "Ataque em Movimento", r: "Pode se mover antes e depois de agredir, sem passar do deslocamento." }, { n: "Ataque Reflexo", acao: "reacao", r: "Uma vez por rodada, ataca um adjacente desprevenido ou que sai do alcance." }, insanidade("2d6", 26), { n: "Sombra Rubra", r: "Rola dois dados em Iniciativa e Furtividade e usa o melhor." }, { n: "Veneno", r: "Paralisado por 1d6 horas (Fort CD 26 reduz para lento por 1d6 rodadas).", cd: 26, res: "fortitude", condicao: "paralisado" }, LEFEU],
    atr: [4, 7, 4, 4, 4, 1], pericias: { furtividade: 20 }, tesouro: "padrao e adaga da Tormenta (adaga formidável tumular; +5 contra desarmar; soltá-la é ação de movimento)",
  }, "Lefeu espião com asas de barata, mestre de cerimônias profanas.");
  D("thuwarokk", "Thuwarokk", "16", "tormenta", 315, {
    tipo: "monstro", sub: "lefeu", tam: "colossal", papel: "solo", ini: 11, per: 12, sentidos: ["visão no escuro"], def: 50, fort: 30, ref: 24, von: 16, imune: LEFEU_IMUNE, rd: { geral: 10 }, pv: 900, desl: 12, metadeFisico: true,
    ataques: [{ n: "Pancada", a: 48, d: "4d12+24", q: 4, t: "I" }],
    habs: [{ n: "Carapaça", r: "Corte, impacto e perfuração causam metade. Passando na resistência contra magia que o mire, ela volta contra o conjurador. Ação de movimento e Percepção CD 25 acham um ponto fraco: atacar ali tem –5 e ignora a carapaça.", metadeFisico: true }, insanidade("2d12", 42), { n: "Jato de Ácido", acao: "movimento", recarga: "movimento", r: "Cone de 30 m: 10d8+20 de ácido (Ref CD 42 reduz à metade).", cd: 42, res: "reflexos", dano: "10d8+20", tipoDano: "acido" }, { n: "Passar por Cima", acao: "completa", r: "Anda o dobro do deslocamento sobre criaturas Enormes ou menores: 10d12+50 (Ref CD 42 reduz à metade).", cd: 42, res: "reflexos", dano: "10d12+50", tipoDano: "impacto" }, LEFEU],
    atr: [17, -1, 10, -3, 0, -4], tesouro: "nenhum",
  }, "Colosso da Tormenta do tamanho de um castelo, capaz de dizimar exércitos.");
  D("otyugh", "Otyugh", "5", "tormenta", 315, {
    tipo: "monstro", tam: "grande", papel: "solo", ini: 3, per: 10, sentidos: ["visão no escuro"], def: 24, fort: 17, ref: 11, von: 5, imune: ["doenca", "veneno"], rd: { geral: 5 }, pv: 213, desl: 6,
    ataques: [{ n: "Tentáculo", a: 17, d: "1d8+9", q: 2, t: "I", alc: "4,5m" }, { n: "Mordida", a: 17, d: "1d6+9", t: "P", efeito: "doença (infecção do esgoto)" }],
    habs: [{ n: "Agarrar Aprimorado", acao: "livre", r: "Ao acertar um tentáculo, pode agarrar (teste +19)." }, { n: "Constrição", acao: "livre", r: "No início do turno dele, 1d8+9 de impacto em quem estiver agarrando.", dano: "1d8+9", tipoDano: "impacto" }, { n: "Doença", r: "Mordido fica exposto à infecção do esgoto (p. 318)." }],
    atr: [5, -1, 4, -2, 1, -2], pericias: { furtividade: 3 }, tesouro: "padrao",
  }, "Monstro pustulento de três patas que devora tudo em esgotos e pântanos.");
  D("sacerdoteDeAharadak", "Sacerdote de Aharadak", "10", "tormenta", 316, {
    tipo: "humanoide", sub: "humano", tam: "medio", papel: "especial", ini: 17, per: 15, def: 38, fort: 16, ref: 10, von: 22, imune: ["confuso"], rd: { acido: 10, eletricidade: 10, fogo: 10, frio: 10, luz: 10, trevas: 10 }, pv: 315, desl: 9, mov: { voo: 15 }, pm: 56, defesasTexto: "resistência a magia divina +5",
    ataques: [{ n: "Corrente de espinhos aberrante", a: 30, d: "4d6+12", x: "1d6 acido", q: 2, t: "C" }, { n: "Mordida", a: 30, d: "1d6+12", t: "P" }],
    habs: [{ n: "Magia Acelerada", acao: "livre", pm: 4, r: "Uma vez por rodada, uma magia de ação completa ou menor vira ação livre." }, { n: "Sangue Ácido", r: "Quem o fere corpo a corpo sofre 10 de ácido.", retaliacao: { dano: 10, tipo: "acido" } }],
    magias: { como: "clérigo de Aharadak de 10º nível", cd: 30, lista: [{ id: "curarFerimentos", acao: "padrao", pm: 10, r: "Uma criatura adjacente cura 11d8+11 PV." }, { id: "perdicao", acao: "padrao", pm: 5, r: "Criaturas escolhidas em alcance curto: –3 em ataque e dano pela cena." }, { id: "potenciaDivina", acao: "padrao", pm: 10, r: "Sustentada: fica Grande, Força +5, RD 10, dados dos ataques viram d8; não lança magias." }, { id: "silencio", acao: "padrao", pm: 4, r: "Sustentada: esfera de 3 m ao redor; quem está nela fica surdo e não lança magias." }] },
    atr: [4, 2, 4, 2, 5, -1], pericias: { intimidacao: 9, religiao: 16 }, equip: "Símbolo sagrado de Aharadak.", tesouro: "padrao",
  }, "Devoto do Deus da Tormenta que abraçou a deturpação aberrante.");
})();
/* <<< js/tormenta20/ameacas-6.js */

/* >>> js/tormenta20/ameacas-7.js */
/* R.A.M.A. — Tormenta20 · perigos, doenças, perigos complexos e o
   gerador de fichas de NPC (Livro Básico, p. 317–323).
   Formato em js/tormenta20/ameacas.js. Resumos do RAMA. */
(function () {
  var A = RAMATormenta20Ameacas;
  var P = A.perigo;
  function arm(id, nome, nd, pag, f, r) { return P(id, nome, nd, pag, Object.assign({ tipo: "armadilha" }, f), r); }
  /* Armadilhas (p. 317–318). magica: anulável por Dissipar Magia. */
  arm("agulhaEnvenenada", "Agulha Envenenada", "1/4", 317, { dano: "1", tipoDano: "perfuracao", perda: "1d12", res: "reflexos", cd: 20, efeitoRes: "evita", investigacao: 25, ladinagem: 20 }, "1 de perfuração e perde 1d12 PV por veneno.");
  arm("arameFarpado", "Arame Farpado", "1/4", 317, { dano: "1d6+2", tipoDano: "corte", investigacao: 10, ladinagem: 20 }, "Terreno difícil; 1d6+2 de corte em quem atravessa.");
  arm("fossoCamuflado", "Fosso Camuflado", "1/4", 317, { dano: "2d6", tipoDano: "impacto", res: "reflexos", cd: 20, efeitoRes: "evita", investigacao: 20, ladinagem: 20, escalar: 20 }, "Queda de 3 m (2d6 de impacto); Atletismo CD 20 para sair.");
  arm("rede", "Rede", "1/4", 317, { condicao: "agarrado", res: "reflexos", cd: 20, efeitoRes: "evita", investigacao: 20, ladinagem: 20 }, "Agarrado (ação completa e Acrobacia CD 20 para escapar).");
  arm("virote", "Virote", "1/4", 317, { dano: "1d10+2", tipoDano: "perfuracao", res: "reflexos", cd: 20, efeitoRes: "evita", investigacao: 25, ladinagem: 20 }, "Disparo de 1d10+2 de perfuração.");
  arm("fossoProfundo", "Fosso Profundo", "1/2", 317, { dano: "4d6", tipoDano: "impacto", res: "reflexos", cd: 20, efeitoRes: "evita", investigacao: 20, ladinagem: 20, escalar: 20 }, "Queda de 6 m (4d6 de impacto); Atletismo CD 20 para sair.");
  arm("laminaNaParede", "Lâmina na Parede", "1/2", 317, { dano: "2d6+5", tipoDano: "corte", res: "reflexos", cd: 20, efeitoRes: "evita", investigacao: 25, ladinagem: 20 }, "Lâmina de 2d6+5 de corte.");
  arm("blocoDePedra", "Bloco de Pedra", "1", 317, { dano: "6d6", tipoDano: "impacto", res: "reflexos", cd: 20, efeitoRes: "evita", investigacao: 20, ladinagem: 20 }, "Bloco que cai: 6d6 de impacto.");
  arm("penduloDeTeto", "Pêndulo de Teto", "1", 317, { dano: "1d12+10", tipoDano: "corte", res: "reflexos", cd: 25, efeitoRes: "evita", investigacao: 25, ladinagem: 20 }, "Lâmina pendular de 1d12+10 de corte.");
  arm("fossoComEstacas", "Fosso com Estacas", "2", 317, { dano: "6d6", tipoDano: "impacto", danoExtra: "2d4+5 perfuracao", res: "reflexos", cd: 20, efeitoRes: "evita", investigacao: 20, ladinagem: 20, escalar: 20 }, "Queda de 9 m (6d6 de impacto) e estacas (2d4+5 de perfuração).");
  arm("runaDeProtecao", "Runa de Proteção", "2", 317, { magica: true, dano: "6d6", tipoDano: "fogo", area: "3m", res: "reflexos", cd: 20, efeitoRes: "metade", investigacao: 25, ladinagem: 25 }, "6d6 de fogo (ou outro elemento) a até 3 m; quem ativou não tem teste.");
  arm("simboloDoMedo", "Símbolo do Medo", "2", 317, { magica: true, condicao: "abalado", area: "curto", res: "vontade", cd: 20, efeitoRes: "evita", investigacao: 25, ladinagem: 25 }, "Criaturas em alcance curto ficam abaladas até o fim da cena.");
  arm("estatuaExecutora", "Estátua Executora", "3", 318, { dano: "1d12+10", tipoDano: "corte", golpes: 2, res: "reflexos", cd: 25, efeitoRes: "evita", investigacao: 20, ladinagem: 20 }, "Dois golpes de 1d12+10 de corte; um teste de Reflexos para cada.");
  arm("gasVenenoso", "Gás Venenoso", "3", 318, { perda: "1d12", rodadas: "2d4", res: "fortitude", cd: 20, efeitoRes: "metade", investigacao: 25, ladinagem: 25 }, "Perde 1d12 PV por rodada por 2d4 rodadas.");
  arm("simboloDoSono", "Símbolo do Sono", "3", 318, { magica: true, condicao: "inconsciente", area: "curto", limiteNivel: 8, res: "vontade", cd: 20, efeitoRes: "evita", investigacao: 25, ladinagem: 25 }, "Criaturas de até 8 níveis em alcance curto caem inconscientes.");
  arm("paredeInstavel", "Parede Instável", "4", 318, { dano: "8d6", tipoDano: "impacto", area: "quadrado de 3m", res: "reflexos", cd: 25, efeitoRes: "metade", investigacao: 20, ladinagem: 20 }, "Desaba: 8d6 de impacto num quadrado de 3 m.");
  arm("simboloDaDor", "Símbolo da Dor", "4", 318, { magica: true, area: "curto", penalidade: -5, res: "fortitude", cd: 25, efeitoRes: "evita", investigacao: 30, ladinagem: 30 }, "Dores: –5 em todos os testes até o fim da cena.");
  arm("brumaDaInsanidade", "Bruma da Insanidade", "5", 318, { magica: true, condicao: "confuso", area: "cubo de 6m", res: "fortitude", cd: 20, efeitoRes: "evita", investigacao: 25, ladinagem: 25 }, "Criaturas num cubo de 6 m ficam confusas até o fim da cena.");
  arm("simboloDoAtordoamento", "Símbolo do Atordoamento", "5", 318, { magica: true, condicao: "atordoado", rodadas: "1d6", area: "curto", res: "fortitude", cd: 25, efeitoRes: "evita", investigacao: 30, ladinagem: 30 }, "Atordoadas por 1d6 rodadas.");
  arm("desabamentoDoTeto", "Desabamento do Teto", "6", 318, { dano: "15d6", tipoDano: "impacto", area: "quadrado de 6m", res: "reflexos", cd: 30, efeitoRes: "metade", investigacao: 25, ladinagem: 25 }, "15d6 de impacto num quadrado de 6 m.");
  arm("simboloDaInsanidade", "Símbolo da Insanidade", "6", 318, { magica: true, condicao: "confuso", permanente: true, area: "curto", res: "vontade", cd: 25, efeitoRes: "evita", investigacao: 30, ladinagem: 30 }, "Confusas permanentemente.");
  arm("abismoDaMorte", "Abismo da Morte", "8", 318, { dano: "20d6", tipoDano: "impacto", danoExtra: "2d8+10 perfuracao", area: "quadrado de 6m", res: "reflexos", cd: 30, efeitoRes: "evita", investigacao: 30, ladinagem: 30, escalar: 25 }, "Queda de 30 m sobre estacas: 20d6 de impacto e 2d8+10 de perfuração.");
  arm("simboloDaMorte", "Símbolo da Morte", "8", 318, { magica: true, pvPara: -1, area: "curto", res: "fortitude", cd: 30, efeitoRes: "10d6 trevas", investigacao: 30, ladinagem: 30 }, "Reduz a –1 PV (Fortitude: em vez disso, 10d6 de trevas).");

  /* Doenças (p. 318): Fortitude ao ser exposto; contaminado testa a cada
     dia; dois sucessos seguidos curam; efeitos progressivos por "/". */
  A.DOENCAS = [
    { id: "calafrioDiabolico", nome: "Calafrio Diabólico", via: "contato", cd: 25, estagios: ["fraco", "debilitado", "inconsciente", "morte"], pagina: 318 },
    { id: "febreDoRiso", nome: "Febre do Riso", via: "inalação", cd: 20, estagios: ["frustrado", "esmorecido", "confuso"], porCena: true, pagina: 318 },
    { id: "febreMental", nome: "Febre Mental", via: "inalação", cd: 20, estagios: ["frustrado", "esmorecido", "alquebrado"], pagina: 318 },
    { id: "infeccaoDoEsgoto", nome: "Infecção do Esgoto", via: "contato", cd: 15, estagios: ["fraco", "debilitado"], pagina: 318 },
    { id: "maldicaoPegajosa", nome: "Maldição Pegajosa", via: "contato", cd: 20, estagios: ["perde 1d12 PV", "perde 2d12 PV", "perde 4d12 PV"], curaCom: 3, pagina: 318 },
    { id: "molestiaDemoniaca", nome: "Moléstia Demoníaca", via: "contato", cd: 20, estagios: ["perde 1d12 PV", "perde 2d12 PV", "perde 1 de Constituição (permanente)", "morte"], pagina: 318 },
    { id: "tremores", nome: "Tremores", via: "contato", cd: 15, estagios: ["vulneravel"], pagina: 318 },
    { id: "variola", nome: "Varíola", via: "inalação", cd: 20, estagios: ["enjoado", "debilitado", "perde 1 de Carisma (permanente)", "morte"], pagina: 318 },
  ];
  /* Teste diário de doença: devolve o novo estado. */
  A.testeDeDoenca = function (doenca, estado, sucesso) {
    var e = Object.assign({ falhasSeguidas: 0, sucessosSeguidos: 0, estagio: -1 }, estado || {});
    var precisa = doenca.curaCom || 2;
    if (sucesso) {
      e.sucessosSeguidos++; e.falhasSeguidas = 0;
      if (e.sucessosSeguidos >= precisa) return { curado: true, estado: e, efeito: null };
      e.estagio = Math.max(-1, e.estagio - 1);
    } else {
      e.falhasSeguidas++; e.sucessosSeguidos = 0;
      e.estagio = Math.min(doenca.estagios.length - 1, e.estagio + 1);
    }
    return { curado: false, estado: e, efeito: e.estagio >= 0 ? doenca.estagios[e.estagio] : null };
  };

  /* Perigos do ambiente (p. 317–319). */
  A.AMBIENTE = [
    { id: "acido", nome: "Ácido", pagina: 317, r: "1d6 por rodada de exposição; imersão 10d6 por rodada, mais uma rodada depois de sair." },
    { id: "areiaMovedica", nome: "Areia Movediça", pagina: 317, r: "Sobrevivência CD 25 nota. Entrar: agarrado; uma rodada inteira agarrado e submerge (sufocamento). Ação completa e Atletismo CD 25 avança um passo (submerso → agarrado → livre); falhar por 5 ou mais cansa. Outros podem ajudar." },
    { id: "escuridao", nome: "Escuridão", pagina: 318, r: "Leve: camuflagem leve. Total: camuflagem total." },
    { id: "fogo", nome: "Fogo", pagina: 319, r: "Exposto: Reflexos CD 15 ou em chamas (1d6 de fogo no início dos turnos; ação padrão ou água apaga). Efeitos instantâneos não incendeiam." },
    { id: "fomeESede", nome: "Fome e Sede", pagina: 319, r: "Após um dia, Fortitude diária CD 15 (+1 por teste anterior): fatigado, exausto, inconsciente, morte. Só comida e bebida curam. Metabolismo." },
    { id: "fumaca", nome: "Fumaça", pagina: 319, r: "Fumaça densa: Fortitude no início do turno CD 10 (+1 por teste); falha perde o turno; duas seguidas, perde 1d6 PV. Camuflagem leve." },
    { id: "lava", nome: "Lava", pagina: 319, r: "2d6 de fogo por rodada de exposição; imersão 20d6 por rodada, mais uma rodada depois." },
    { id: "queda", nome: "Queda", pagina: 319, r: "1d6 de impacto a cada 1,5 m (máximo 40d6 aos 60 m); na água, –4d6. Objeto que cai causa 1d6 a cada 1,5 m (o dobro se muito pesado)." },
    { id: "sono", nome: "Sono", pagina: 319, r: "Uma noite sem dormir não recupera PV e PM; depois, Fortitude diária CD 15 (+1): fatigado, exausto, inconsciente até dormir 8 horas." },
    { id: "sufocamento", nome: "Sufocamento", pagina: 319, r: "Prende a respiração por 1 + Constituição rodadas; depois Fortitude por rodada CD 15 (+1); falha: inconsciente e perde 1d6 PV por rodada. Metabolismo." },
    { id: "tormenta", nome: "Área de Tormenta", pagina: 319, r: "Ao entrar, frustrado. A cada dia, Vontade CD 25 (+2 por dia consecutivo) ou esmorecido; já esmorecido, confuso; já confuso, insano (vira NPC). Habilidades com custo em PM custam +2; itens encantados perdem um encanto; recuperação por descanso cai à metade. Lefeu e lefou são imunes." },
    { id: "clima", nome: "Clima, calor e frio", pagina: 267, r: "Ver as regras de clima no Capítulo 6 (p. 267)." },
  ];

  /* Perigos complexos (p. 320–321): testes estendidos. */
  P("avalanche", "Avalanche", "4", 320, {
    tipo: "complexo", objetivo: "Escapar da avalanche.", rodadas: 5,
    deteccao: { pericia: "sobrevivencia", cd: 20, beneficio: "ação adicional na primeira rodada" },
    resultado: [{ ate: 2, efeito: "Zona de soterramento: 16d6 de impacto e soterrado (imóvel, 1d6 por turno; Força CD 25 para soltar, com ajuda).", dano: "16d6" }, { ate: 4, efeito: "Zona de deslizamento: 8d6 de impacto.", dano: "8d6" }, { ate: 99, efeito: "Escapa ileso." }],
    acoes: [{ n: "Correr", pericia: "atletismo", cd: 20, r: "Um sucesso; por 10 ou mais (ou 20 natural), dois. Cavalgar ou Pilotagem substituem com montaria ou veículo.", sucessos: 1 }, { n: "Carregar Outro", pericia: "atletismo", cd: 25, r: "Leva um aliado com até um sucesso de diferença: um sucesso para cada.", sucessos: 1 }, { n: "Procurar Caminho", pericia: "percepcao", cd: 20, r: "+5 nos testes de correr e carregar outro neste perigo." }],
  }, "O grupo tem cinco rodadas para fugir dos escombros.");
  P("jornadaPelosErmos", "Jornada pelos Ermos", "2", 320, {
    tipo: "complexo", objetivo: "Chegar ao destino.", sucessosPor: { curta: 3, media: 5, longa: 7 }, falhasMax: 3,
    cdPorTerreno: { planicie: 15, colina: 15, floresta: 20, pantano: 20, deserto: 25, montanha: 25, planar: 30, tormenta: 30 },
    porFalha: { perda: "2d6", r: "Cada falha: perde 2d6 PV (só cura um dia após a jornada)." }, tresFalhas: "PM máximos –1 por nível na próxima aventura (ou recomeçar, se o mestre quiser que possa falhar).",
    acoes: [{ n: "Avançar", pericia: "sobrevivencia", r: "Os personagens se alternam. Outras perícias justificadas (Pilotagem, Diplomacia…) valem uma vez cada por jornada." }],
  }, "Teste estendido aberto da viagem por território selvagem (ver p. 267).");
  P("salaEsmagadora", "Sala Esmagadora", "9", 321, {
    tipo: "complexo", objetivo: "Abrir a porta ou travar o mecanismo das paredes.", rodadas: 3,
    efeito: "Na 4ª rodada, 10d6 de impacto; na 5ª, quem estiver dentro morre. Âncora Dimensional impede fuga planar.",
    acoes: [{ n: "Derrubar Porta", pericia: "for", cd: 30, sucessosNecessarios: 3, r: "Até dois personagens por rodada (ou um ajudando o outro)." }, { n: "Desabilitar Mecanismo", pericia: "ladinagem", cd: 30, sucessosNecessarios: 3, r: "Paredes travadas: a porta sai sem testes." }, { n: "Segurar Paredes", pericia: "for", cd: 25, r: "A cada dois sucessos, +1 rodada antes de fechar." }],
  }, "Armadilha de masmorra em que as paredes se fecham sobre o grupo.");
  P("tempestadeEmAltoMar", "Tempestade em Alto Mar", "6", 321, {
    tipo: "complexo", objetivo: "Sobreviver à tempestade (1d6+6 rodadas).", duracao: "1d6+6",
    deteccao: { pericia: "sobrevivencia", cd: 20, beneficio: "ação adicional na primeira rodada" },
    efeito: "No início do turno, Reflexos CD 20+1d6 (rolado por rodada): falha 4d6 de impacto; falha por 10 ou mais, cai no mar (no mar, falha automática).",
    acoes: [{ n: "Navegar", pericia: "pilotagem", cd: 25, r: "Cada sucesso reduz a tempestade em uma rodada; um por rodada." }, { n: "Ajudar o Piloto", r: "Teste de ajuda com perícia justificada." }, { n: "Esconder-se", r: "No convés inferior: Reflexos CD 20 fixa, sem cair no mar, mas sem navegar ou ajudar." }, { n: "Voltar para o Navio", pericia: "atletismo", cd: 25, sucessosNecessarios: 2, r: "Falha não avança; por 5 ou mais, afunda." }],
  }, "Ondas gigantes ameaçam jogar o grupo ao mar.");

  /* Tabela 7-2: estatísticas de NPC por ND (p. 323). */
  A.TABELA_NPC = {
    "1/2": { patamar: "iniciante", ataque: 7, ataques: 1, dano: "1d6+3", def: 15, pv: 10, pericias: [4, 0], cd: 14 },
    "1": { patamar: "iniciante", ataque: 9, ataques: 1, dano: "1d8+6", def: 16, pv: 20, pericias: [6, 1], cd: 15 },
    "2": { patamar: "iniciante", ataque: 11, ataques: 1, dano: "1d10+10", def: 18, pv: 40, pericias: [8, 2], cd: 16 },
    "3": { patamar: "iniciante", ataque: 13, ataques: 1, dano: "1d12+12", def: 21, pv: 70, pericias: [10, 3], cd: 17 },
    "4": { patamar: "iniciante", ataque: 15, ataques: 1, dano: "2d6+14", def: 24, pv: 110, pericias: [12, 4], cd: 18 },
    "5": { patamar: "veterano", ataque: 18, ataques: 2, dano: "1d12+11", def: 28, pv: 150, pericias: [14, 5], cd: 20 },
    "6": { patamar: "veterano", ataque: 20, ataques: 2, dano: "2d6+15", def: 31, pv: 190, pericias: [16, 6], cd: 22 },
    "7": { patamar: "veterano", ataque: 22, ataques: 2, dano: "2d8+19", def: 34, pv: 230, pericias: [18, 7], cd: 24 },
    "8": { patamar: "veterano", ataque: 24, ataques: 2, dano: "2d10+20", def: 37, pv: 270, pericias: [20, 8], cd: 26 },
    "9": { patamar: "veterano", ataque: 26, ataques: 2, dano: "2d12+21", def: 40, pv: 310, pericias: [22, 9], cd: 28 },
    "10": { patamar: "veterano", ataque: 29, ataques: 2, dano: "3d6+26", def: 43, pv: 350, pericias: [24, 10], cd: 30 },
    "11": { patamar: "campeao", ataque: 32, ataques: 3, dano: "3d8+24", def: 46, pv: 400, pericias: [25, 11], cd: 32 },
    "12": { patamar: "campeao", ataque: 35, ataques: 3, dano: "3d10+26", def: 48, pv: 450, pericias: [26, 12], cd: 34 },
    "13": { patamar: "campeao", ataque: 37, ataques: 3, dano: "3d12+28", def: 50, pv: 550, pericias: [27, 13], cd: 36 },
    "14": { patamar: "campeao", ataque: 40, ataques: 3, dano: "4d6+38", def: 52, pv: 600, pericias: [28, 14], cd: 38 },
    "15": { patamar: "campeao", ataque: 42, ataques: 3, dano: "4d8+40", def: 54, pv: 650, pericias: [29, 15], cd: 40 },
    "16": { patamar: "campeao", ataque: 45, ataques: 3, dano: "4d10+42", def: 56, pv: 700, pericias: [30, 16], cd: 42 },
    "17": { patamar: "lenda", ataque: 47, ataques: 4, dano: "4d12+35", def: 59, pv: 750, pericias: [32, 17], cd: 44 },
    "18": { patamar: "lenda", ataque: 50, ataques: 4, dano: "4d12+40", def: 61, pv: 800, pericias: [33, 18], cd: 46 },
    "19": { patamar: "lenda", ataque: 52, ataques: 4, dano: "4d12+45", def: 63, pv: 850, pericias: [34, 19], cd: 48 },
    "20": { patamar: "lenda", ataque: 55, ataques: 4, dano: "4d12+50", def: 65, pv: 900, pericias: [35, 20], cd: 50 },
  };
  A.PACOTES_ATRIBUTOS = { iniciante: [3, 2, 1, 1, 0, -1], veterano: [4, 3, 2, 1, 0, 0], campeao: [5, 4, 3, 2, 1, 0], lenda: [7, 5, 4, 2, 2, 1] };
  /* Ficha de NPC pela Tabela 7-2: ajustes sobem ou descem colunas pelo
     ND (o bárbaro robusto: PV +2 de ND, Defesa –2). */
  A.gerarNPC = function (o) {
    var op = o || {};
    var chaves = Object.keys(A.TABELA_NPC);
    function linha(nd, desloc) {
      var i = chaves.indexOf(String(nd));
      if (i < 0) i = 0;
      return A.TABELA_NPC[chaves[Math.max(0, Math.min(chaves.length - 1, i + (desloc || 0)))]];
    }
    var aj = op.ajustes || {};
    var base = linha(op.nd);
    var foco = op.pericias || [];
    var per = {};
    ["iniciativa", "percepcao", "fortitude", "reflexos", "vontade"].concat(foco).forEach(function (k) { per[k] = foco.indexOf(k) >= 0 ? linha(op.nd, aj.pericias)[ "pericias"][0] : linha(op.nd, aj.pericias).pericias[1]; });
    var atr = (A.PACOTES_ATRIBUTOS[base.patamar] || A.PACOTES_ATRIBUTOS.iniciante).slice();
    var ordem = op.ordemAtributos || [0, 1, 2, 3, 4, 5];
    var atrFinal = [0, 0, 0, 0, 0, 0];
    ordem.forEach(function (idx, pos) { atrFinal[idx] = atr[pos]; });
    var lAt = linha(op.nd, aj.ataque), lDef = linha(op.nd, aj.defesa), lPv = linha(op.nd, aj.pv), lCd = linha(op.nd, aj.cd);
    return {
      id: op.id || "npc", nome: op.nome || "NPC", nd: String(op.nd || "1"), grupo: "npcs", pagina: 322, tipo: "humanoide", sub: op.raca || "", tam: op.tam || "medio", papel: op.papel || "solo",
      ini: per.iniciativa, per: per.percepcao, def: lDef.def, fort: per.fortitude, ref: per.reflexos, von: per.vontade, pv: lPv.pv, desl: op.desl || 9, pm: 0,
      atr: atrFinal, ataques: [{ n: op.arma || "Ataque", a: lAt.ataque, d: lAt.dano, m: 20, c: 2, q: lAt.ataques, t: op.tipoDano || "C" }],
      habs: op.habs || [], pericias: per, cd: lCd.cd, tesouro: op.tesouro || "padrao", npc: true, gerado: true,
    };
  };
})();
/* <<< js/tormenta20/ameacas-7.js */

/* >>> js/tormenta20/parceiros.js */
/* =====================================================================
   R.A.M.A. — Tormenta20 · parceiros (Livro Básico, p. 260–262)
   ---------------------------------------------------------------------
   Parceiros não agem: dão um bônus a quem ajudam, pelo tipo e pelo
   nível (iniciante, veterano, mestre). Limite por patamar: 1 até o 4º
   nível, 2 do 5º ao 16º, 3 do 17º em diante. Bônus de parceiros não se
   acumulam entre si (categoria "parceiro", p. 226).
   Cada tipo: { nome, resumo, niveis: { iniciante, veterano, mestre } },
   e cada nível: { r (resumo), efeitos: [...] } no vocabulário do motor.
   ===================================================================== */

(function (global) {
  "use strict";

  var NIVEIS = ["iniciante", "veterano", "mestre"];
  function n(r, efeitos, extra) { return Object.assign({ r: r, efeitos: efeitos || [] }, extra || {}); }

  var TIPOS = {
    adepto: { nome: "Adepto", pagina: 260, resumo: "Conjurador que ajuda a lançar magias.", niveis: {
      iniciante: n("Magias de 1º círculo custam –1 PM.", [{ t: "descontoMagia", valor: 1, circulos: [1] }]),
      veterano: n("Magias de 1º e 2º círculos custam –1 PM.", [{ t: "descontoMagia", valor: 1, circulos: [1, 2] }]),
      mestre: n("Como veterano, e a redução acumula com outras.", [{ t: "descontoMagia", valor: 1, circulos: [1, 2], cumulativo: true }]) } },
    ajudante: { nome: "Ajudante", pagina: 260, resumo: "Bardo, nobre ou sábio que encoraja. Perícias definidas pelo parceiro (nunca Luta nem Pontaria).", escolhaPericias: true, niveis: {
      iniciante: n("+2 em duas perícias.", [], { pericias: 2, valor: 2 }),
      veterano: n("+2 em três perícias.", [], { pericias: 3, valor: 2 }),
      mestre: n("+4 em três perícias.", [], { pericias: 3, valor: 4 }) } },
    assassino: { nome: "Assassino", pagina: 260, resumo: "Ladino ou outro tipo furtivo e letal.", niveis: {
      iniciante: n("Ataque Furtivo +1d6 (acumula com o seu).", [{ t: "ataqueFurtivo", valor: "1d6" }]),
      veterano: n("Ataque Furtivo +1d6 e bônus de flanquear contra um inimigo por rodada.", [{ t: "ataqueFurtivo", valor: "1d6" }, { t: "flanqueiaUm" }]),
      mestre: n("Ataque Furtivo +2d6 e bônus de flanquear contra um inimigo por rodada.", [{ t: "ataqueFurtivo", valor: "2d6" }, { t: "flanqueiaUm" }]) } },
    atirador: { nome: "Atirador", pagina: 261, resumo: "Arqueiro, besteiro ou outro combatente à distância.", niveis: {
      iniciante: n("Uma vez por rodada, +1d6 num dano à distância.", [{ t: "danoUmaVez", valor: "1d6", alvo: "distancia" }]),
      veterano: n("Uma vez por rodada, +1d10 num dano à distância.", [{ t: "danoUmaVez", valor: "1d10", alvo: "distancia" }]),
      mestre: n("Uma vez por rodada, +2d8 num dano à distância.", [{ t: "danoUmaVez", valor: "2d8", alvo: "distancia" }]) } },
    combatente: { nome: "Combatente", pagina: 261, resumo: "Bucaneiro, guerreiro, paladino ou animal de caça.", niveis: {
      iniciante: n("+2 em testes de ataque.", [{ t: "bonus", alvo: "ataque", valor: 2, categoria: "parceiro" }]),
      veterano: n("+3 em testes de ataque.", [{ t: "bonus", alvo: "ataque", valor: 3, categoria: "parceiro" }]),
      mestre: n("+4 em testes de ataque e, uma vez por rodada, 5 PM para um ataque extra.", [{ t: "bonus", alvo: "ataque", valor: 4, categoria: "parceiro" }], { acao: { nome: "Ataque extra do parceiro", custo: 5, execucao: "livre", limite: "rodada" } }) } },
    destruidor: { nome: "Destruidor", pagina: 261, resumo: "Arcanista ou inventor (tipo de dano conforme o parceiro: ácido, eletricidade, fogo ou frio).", escolhaElemento: true, niveis: {
      iniciante: n("Uma vez por rodada, ação livre e 1 PM: 2d6 num alvo em alcance curto.", [], { acoes: [{ custo: 1, dano: "2d6", alcance: "curto" }] }),
      veterano: n("Como acima, ou 2 PM para 4d6.", [], { acoes: [{ custo: 1, dano: "2d6", alcance: "curto" }, { custo: 2, dano: "4d6", alcance: "curto" }] }),
      mestre: n("Como acima, ou 4 PM para 6d6 em área de 6 m de raio em alcance médio.", [], { acoes: [{ custo: 1, dano: "2d6", alcance: "curto" }, { custo: 2, dano: "4d6", alcance: "curto" }, { custo: 4, dano: "6d6", alcance: "medio", area: "6m de raio" }] }) } },
    fortao: { nome: "Fortão", pagina: 261, resumo: "Bárbaro, lutador ou outro brutamontes.", niveis: {
      iniciante: n("Uma vez por rodada, +1d8 num dano corpo a corpo.", [{ t: "danoUmaVez", valor: "1d8", alvo: "corpo" }]),
      veterano: n("Uma vez por rodada, +1d12 num dano corpo a corpo.", [{ t: "danoUmaVez", valor: "1d12", alvo: "corpo" }]),
      mestre: n("Uma vez por rodada, +3d6 num dano corpo a corpo.", [{ t: "danoUmaVez", valor: "3d6", alvo: "corpo" }]) } },
    guardiao: { nome: "Guardião", pagina: 261, resumo: "Cavaleiro, cão de guarda ou protetor.", niveis: {
      iniciante: n("+2 na Defesa.", [{ t: "bonus", alvo: "defesa", valor: 2, categoria: "parceiro" }]),
      veterano: n("+3 na Defesa.", [{ t: "bonus", alvo: "defesa", valor: 3, categoria: "parceiro" }]),
      mestre: n("+4 na Defesa e +2 nos testes de resistência.", [{ t: "bonus", alvo: "defesa", valor: 4, categoria: "parceiro" }, { t: "bonus", alvo: "resistencias", valor: 2, categoria: "parceiro" }]) } },
    magivocador: { nome: "Magivocador", pagina: 261, resumo: "Conjurador de magias ofensivas.", niveis: {
      iniciante: n("O dano das suas magias ganha +1 dado do mesmo tipo.", [{ t: "dadoExtraMagia", valor: 1 }]),
      veterano: n("+1 dado de dano nas magias e +1 na CD delas.", [{ t: "dadoExtraMagia", valor: 1 }, { t: "cdMagia", valor: 1 }]),
      mestre: n("+2 dados de dano nas magias e +2 na CD delas.", [{ t: "dadoExtraMagia", valor: 2 }, { t: "cdMagia", valor: 2 }]) } },
    medico: { nome: "Médico", pagina: 261, resumo: "Clérigo, druida ou herbalista.", niveis: {
      iniciante: n("Uma vez por rodada, 1 PM: cura 1d8+1 PV de uma criatura adjacente.", [], { acoes: [{ custo: 1, cura: "1d8+1" }] }),
      veterano: n("Como acima, ou 3 PM para curar 3d8+3 PV ou remover uma condição prejudicial.", [], { acoes: [{ custo: 1, cura: "1d8+1" }, { custo: 3, cura: "3d8+3", ouCondicao: true }] }),
      mestre: n("Como acima, ou 5 PM para curar 6d8+6 PV.", [], { acoes: [{ custo: 1, cura: "1d8+1" }, { custo: 3, cura: "3d8+3", ouCondicao: true }, { custo: 5, cura: "6d8+6" }] }) } },
    perseguidor: { nome: "Perseguidor", pagina: 261, resumo: "Caçador ou animal farejador.", niveis: {
      iniciante: n("+2 em Percepção e Sobrevivência.", [{ t: "bonus", alvo: "pericia.percepcao", valor: 2, categoria: "parceiro" }, { t: "bonus", alvo: "pericia.sobrevivencia", valor: 2, categoria: "parceiro" }]),
      veterano: n("Pode usar Sentidos Aguçados.", [{ t: "sentido", valor: "sentidosAgucados" }]),
      mestre: n("Pode usar Percepção às Cegas.", [{ t: "sentido", valor: "percepcaoAsCegas" }]) } },
    vigilante: { nome: "Vigilante", pagina: 261, resumo: "Vigia ou animal de guarda.", niveis: {
      iniciante: n("+2 em Percepção e Iniciativa.", [{ t: "bonus", alvo: "pericia.percepcao", valor: 2, categoria: "parceiro" }, { t: "bonus", alvo: "pericia.iniciativa", valor: 2, categoria: "parceiro" }]),
      veterano: n("Pode usar Esquiva Sobrenatural.", [{ t: "habilidade", valor: "esquivaSobrenatural" }]),
      mestre: n("Pode usar Olhos nas Costas.", [{ t: "habilidade", valor: "olhosNasCostas" }]) } },
    /* Montarias (p. 261–262): precisam ser montadas; sem treino em
       Cavalgar, ação de movimento e Cavalgar CD 10 por turno. */
    cavalo: { nome: "Cavalo (ou pônei)", pagina: 262, montaria: true, tamanho: "grande", resumo: "A montaria mais comum do Reinado; pônei é Médio.", niveis: {
      iniciante: n("Deslocamento 12 m e uma ação de movimento extra por turno (só para se deslocar).", [{ t: "deslocamento", tipo: "terrestre", fixo: 12 }, { t: "movimentoExtra" }]),
      veterano: n("Deslocamento 15 m, movimento extra e +2 em ataques corpo a corpo.", [{ t: "deslocamento", tipo: "terrestre", fixo: 15 }, { t: "movimentoExtra" }, { t: "bonus", alvo: "ataque.corpo", valor: 2, categoria: "parceiro" }]),
      mestre: n("Como veterano e uma segunda ação de movimento extra.", [{ t: "deslocamento", tipo: "terrestre", fixo: 15 }, { t: "movimentoExtra", valor: 2 }, { t: "bonus", alvo: "ataque.corpo", valor: 2, categoria: "parceiro" }]) } },
    caoDeCaca: { nome: "Cão de caça", pagina: 262, montaria: true, tamanho: "medio", resumo: "Montaria de personagens Pequenos ou Minúsculos.", niveis: {
      iniciante: n("Deslocamento 9 m, faro e movimento extra por turno.", [{ t: "deslocamento", tipo: "terrestre", fixo: 9 }, { t: "sentido", valor: "faro" }, { t: "movimentoExtra" }]),
      veterano: n("Deslocamento 12 m, faro, movimento extra e +2 na Defesa.", [{ t: "deslocamento", tipo: "terrestre", fixo: 12 }, { t: "sentido", valor: "faro" }, { t: "movimentoExtra" }, { t: "bonus", alvo: "defesa", valor: 2, categoria: "parceiro" }]),
      mestre: n("Como veterano e, uma vez por rodada, derrubar como ação livre ao acertar corpo a corpo.", [{ t: "deslocamento", tipo: "terrestre", fixo: 12 }, { t: "sentido", valor: "faro" }, { t: "movimentoExtra" }, { t: "bonus", alvo: "defesa", valor: 2, categoria: "parceiro" }, { t: "derrubarLivre" }]) } },
    loboDasCavernas: { nome: "Lobo-das-cavernas (ou lobo)", pagina: 262, montaria: true, tamanho: "grande", resumo: "Montaria de goblinoides e aventureiros selvagens; lobo comum é Médio.", niveis: {
      iniciante: n("Deslocamento 12 m e movimento extra por turno.", [{ t: "deslocamento", tipo: "terrestre", fixo: 12 }, { t: "movimentoExtra" }]),
      veterano: n("Deslocamento 15 m, movimento extra e, uma vez por rodada, +1d8 num dano corpo a corpo.", [{ t: "deslocamento", tipo: "terrestre", fixo: 15 }, { t: "movimentoExtra" }, { t: "danoUmaVez", valor: "1d8", alvo: "corpo" }]),
      mestre: n("Como veterano e derrubar como ação livre ao acertar corpo a corpo (uma vez por rodada).", [{ t: "deslocamento", tipo: "terrestre", fixo: 15 }, { t: "movimentoExtra" }, { t: "danoUmaVez", valor: "1d8", alvo: "corpo" }, { t: "derrubarLivre" }]) } },
    grifo: { nome: "Grifo", pagina: 262, montaria: true, tamanho: "grande", resumo: "Fera cobiçada; o filhote (iniciante) não serve de montaria.", niveis: {
      iniciante: n("Uma vez por rodada, +1d8 num dano corpo a corpo (não é montaria).", [{ t: "danoUmaVez", valor: "1d8", alvo: "corpo" }], { naoMontavel: true }),
      veterano: n("+1d8 num dano corpo a corpo e, montado, voo 18 m.", [{ t: "danoUmaVez", valor: "1d8", alvo: "corpo" }, { t: "deslocamento", tipo: "voo", base: 18 }]),
      mestre: n("Como veterano e movimento extra por turno.", [{ t: "danoUmaVez", valor: "1d8", alvo: "corpo" }, { t: "deslocamento", tipo: "voo", base: 18 }, { t: "movimentoExtra" }]) } },
    gorlogg: { nome: "Gorlogg", pagina: 262, montaria: true, tamanho: "grande", resumo: "Besta primitiva dos mais selvagens.", niveis: {
      iniciante: n("Deslocamento 12 m e, uma vez por rodada, +1d6 num dano corpo a corpo.", [{ t: "deslocamento", tipo: "terrestre", fixo: 12 }, { t: "danoUmaVez", valor: "1d6", alvo: "corpo" }]),
      veterano: n("Deslocamento 12 m e +1d10 num dano corpo a corpo por rodada.", [{ t: "deslocamento", tipo: "terrestre", fixo: 12 }, { t: "danoUmaVez", valor: "1d10", alvo: "corpo" }]),
      mestre: n("Deslocamento 15 m e +2d8 num dano corpo a corpo por rodada.", [{ t: "deslocamento", tipo: "terrestre", fixo: 15 }, { t: "danoUmaVez", valor: "2d8", alvo: "corpo" }]) } },
    trobo: { nome: "Trobo", pagina: 262, montaria: true, tamanho: "grande", resumo: "Animal de carga e tração que também serve de montaria.", niveis: {
      iniciante: n("Deslocamento 9 m, movimento extra e +1 nos testes de resistência.", [{ t: "deslocamento", tipo: "terrestre", fixo: 9 }, { t: "movimentoExtra" }, { t: "bonus", alvo: "resistencias", valor: 1, categoria: "parceiro" }]),
      veterano: n("Deslocamento 12 m, movimento extra e +2 nas resistências.", [{ t: "deslocamento", tipo: "terrestre", fixo: 12 }, { t: "movimentoExtra" }, { t: "bonus", alvo: "resistencias", valor: 2, categoria: "parceiro" }]),
      mestre: n("Deslocamento 12 m, movimento extra e +5 nas resistências.", [{ t: "deslocamento", tipo: "terrestre", fixo: 12 }, { t: "movimentoExtra" }, { t: "bonus", alvo: "resistencias", valor: 5, categoria: "parceiro" }]) } },
  };

  var REGRAS_MONTARIA = {
    pagina: 261,
    texto: "Montar e desmontar são ações de movimento. Sem treino em Cavalgar, guiar exige ação de movimento e Cavalgar CD 10 por turno (falha perde a ação; por 5 ou mais, cai e sofre 1d6). Sofrer dano montado pede Cavalgar com CD igual ao dano (Ginete dispensa). Montado, ataques à distância sofrem –2 e lançar magia é condição ruim (Ginete dispensa). Só se monta algo maior que você; montado, usa o tamanho dela para espaço e Furtividade.",
  };

  function limite(nivel) { var n2 = Number(nivel) || 1; return n2 >= 17 ? 3 : (n2 >= 5 ? 2 : 1); }

  /* Variante parceiros vulneráveis (p. 262): ao sofrer dano, um dado por
     parceiro (d4 iniciante, d6 veterano, d8 mestre); 1 fere; outro 1 com
     o parceiro ferido o mata. */
  var DADO_VULNERAVEL = { iniciante: 4, veterano: 6, mestre: 8 };
  function testarVulneraveis(parceiros, rolar) {
    var eventos = [];
    (parceiros || []).forEach(function (p) {
      if (p.ativo === false || p.morto) return;
      var faces = DADO_VULNERAVEL[p.nivel] || 4;
      var r = rolar("1d" + faces);
      if (r === 1) {
        if (p.ferido) { p.morto = true; p.ativo = false; eventos.push({ parceiro: p.id, nome: p.nome, morreu: true, rolagem: r, faces: faces }); }
        else { p.ferido = true; eventos.push({ parceiro: p.id, nome: p.nome, ferido: true, rolagem: r, faces: faces }); }
      } else eventos.push({ parceiro: p.id, nome: p.nome, rolagem: r, faces: faces });
    });
    return eventos;
  }

  /* Efeitos de um parceiro na ficha (todos os tipos dele). */
  function efeitosDoParceiro(p) {
    var out = [];
    var tipos = (p.tipos && p.tipos.length ? p.tipos : [p.tipo]).filter(Boolean);
    tipos.forEach(function (t) {
      var def = TIPOS[t];
      if (!def) return;
      var lv = def.niveis[p.nivel] || def.niveis.iniciante;
      out = out.concat(JSON.parse(JSON.stringify(lv.efeitos || [])));
      if (lv.pericias && p.pericias) (p.pericias || []).slice(0, lv.pericias).forEach(function (k) { if (k !== "luta" && k !== "pontaria") out.push({ t: "bonus", alvo: "pericia." + k, valor: lv.valor, categoria: "parceiro" }); });
    });
    return out;
  }

  global.RAMATormenta20Parceiros = { TIPOS: TIPOS, NIVEIS: NIVEIS, REGRAS_MONTARIA: REGRAS_MONTARIA, limite: limite, testarVulneraveis: testarVulneraveis, efeitosDoParceiro: efeitosDoParceiro, DADO_VULNERAVEL: DADO_VULNERAVEL };
})(typeof window !== "undefined" ? window : globalThis);
/* <<< js/tormenta20/parceiros.js */

/* >>> js/tormenta20/itens-magicos.js */
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
/* <<< js/tormenta20/itens-magicos.js */

/* >>> js/tormenta20/itens-magicos-2.js */
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
/* <<< js/tormenta20/itens-magicos-2.js */
