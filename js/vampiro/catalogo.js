/* =====================================================================
   R.A.M.A. — Vampiro: A Máscara (V5) · catálogo
   =====================================================================
   Os dados do Livro Básico da 5ª edição em português (Galápagos), com a
   página IMPRESSA de cada regra. A página do PDF fornecido difere: até a
   impressa 305 o PDF é +2; dali em diante, +4 (o PDF repete as páginas
   304–305). Use paginaDoPdf(impressa).

   Só o Livro Básico: nada de suplementos, de clãs ou poderes que vieram
   depois, nem de regras de edições anteriores (Pontos de Sangue,
   Virtudes, Trilhas, Natureza/Comportamento, absorção de dano).

   Nada aqui calcula estado: são tabelas. Quem aplica é js/vampiro/regras.js.
   Divergências e leituras: docs/VAMPIRO.md (Interpretações).
   ===================================================================== */

(function (global) {
  "use strict";

  function paginaDoPdf(impressa) {
    var n = Number(impressa) || 0;
    return n <= 305 ? n + 2 : n + 4;
  }

  /* ---------------------------------------------------------------
     ATRIBUTOS E HABILIDADES (p. 155–171)
     --------------------------------------------------------------- */

  var ATRIBUTOS = [
    { chave: "forca", nome: "Força", categoria: "fisico" },
    { chave: "destreza", nome: "Destreza", categoria: "fisico" },
    { chave: "vigor", nome: "Vigor", categoria: "fisico" },
    { chave: "carisma", nome: "Carisma", categoria: "social" },
    { chave: "manipulacao", nome: "Manipulação", categoria: "social" },
    { chave: "autocontrole", nome: "Autocontrole", categoria: "social" },
    { chave: "inteligencia", nome: "Inteligência", categoria: "mental" },
    { chave: "raciocinio", nome: "Raciocínio", categoria: "mental" },
    { chave: "determinacao", nome: "Determinação", categoria: "mental" },
  ];

  var CATEGORIAS = { fisico: "Físicos", social: "Sociais", mental: "Mentais" };

  /* `especializacaoNaCompra`: ganha uma especialização ao adquirir o
     primeiro ponto (Erudição, Ofícios, Performance, Ciência — p. 159). */
  var HABILIDADES = [
    { chave: "armasBrancas", nome: "Armas Brancas", categoria: "fisico", exemplos: ["Armas Improvisadas", "Correntes", "Desarme", "Esgrima", "Espadas", "Estacas", "Facas", "Garrotes", "Machados", "Porretes"] },
    { chave: "armasDeFogo", nome: "Armas de Fogo", categoria: "fisico", exemplos: ["Bestas", "Comércio de Armas", "Fabricação de Armas de Fogo", "Atirador de Elite", "Recarga Manual", "Saque Rápido", "Tiro de Exibição"] },
    { chave: "atletismo", nome: "Atletismo", categoria: "fisico", exemplos: ["Acrobacia", "Arquearia", "Arremesso", "Escalada", "Natação", "Parkour", "Resistência", "Salto"] },
    { chave: "briga", nome: "Briga", categoria: "fisico", exemplos: ["Agarramento", "Animais", "Briga de Bar", "Combate Esportivo", "Enquanto em Forma de Besta", "Lobisomens", "Membros", "Mortais Armados", "Mortais Desarmados"] },
    { chave: "conducao", nome: "Condução", categoria: "fisico", exemplos: ["Acrobacias", "Caminhões", "Fuga", "Modelos Vintage", "Motocicletas", "Rachas", "Tratores", "Veículos Off-Road"] },
    { chave: "furtividade", nome: "Furtividade", categoria: "fisico", exemplos: ["Disfarce", "Cidades", "Emboscadas", "Ermos", "Esconder-se", "Movimento Furtivo", "Multidões", "Perseguição"] },
    { chave: "ladroagem", nome: "Ladroagem", categoria: "fisico", exemplos: ["Abrir Cofres", "Abrir Fechaduras", "Alarmes", "Análise de Segurança", "Bater Carteiras", "Falsificação", "GTA (Grand Theft Auto)", "Invasão Domiciliar"] },
    { chave: "oficios", nome: "Ofícios", categoria: "fisico", especializacaoNaCompra: true, semLimiteDeEspecializacoes: true, exemplos: ["Carpintaria", "Costura", "Design", "Escultura", "Fabricação de Armas", "Gravura", "Pintura"] },
    { chave: "sobrevivencia", nome: "Sobrevivência", categoria: "fisico", exemplos: ["Abrigos", "Armadilhas", "Bosques", "Caça", "Deserto", "Exploração Urbana", "Rastreamento", "Selva"] },
    { chave: "empatiaComAnimais", nome: "Empatia com Animais", categoria: "social", exemplos: ["Cães", "Cavalos", "Cobras", "Falcoaria", "Gatos", "Lobos", "Pacificação", "Ratos", "Treinamento para Ataque", "Treino de Acrobacias"] },
    { chave: "etiqueta", nome: "Etiqueta", categoria: "social", exemplos: ["Anarchs", "Camarilla", "Celebridades", "Corporativo", "Elísio", "Feudal", "Sociedade Secreta", "Um Por Cento"] },
    { chave: "intimidacao", nome: "Intimidação", categoria: "social", exemplos: ["Ameaças Veladas", "Coerção Física", "Extorsão", "Insultos", "Interrogatório", "Olhares Intimidadores"] },
    { chave: "lideranca", nome: "Liderança", categoria: "social", exemplos: ["Bando de Guerra", "Comando", "Dinâmica de Grupo", "Inspiração", "Oratória", "Práxis"] },
    { chave: "manha", nome: "Manha", categoria: "social", exemplos: ["Contrabando de Armas", "Drogas", "Gangues", "Grafite", "Mercado Negro", "Receptação", "Reputação Pessoal", "Sobrevivência Urbana", "Suborno", "Tráfico Sexual"] },
    { chave: "performance", nome: "Performance", categoria: "social", especializacaoNaCompra: true, exemplos: ["Bateria", "Canto", "Comédia", "Dança", "Drama", "Discurso Público", "Guitarra", "Instrumentos de Sopro", "Poesia", "Rap", "Teclado", "Violino"] },
    { chave: "persuasao", nome: "Persuasão", categoria: "social", exemplos: ["Argumento Jurídico", "Barganha", "Interrogatório", "Lábia", "Negociação", "Retórica"] },
    { chave: "sagacidade", nome: "Sagacidade", categoria: "social", exemplos: ["Ambições", "Desejos", "Detectar Mentiras", "Emoções", "Empatia", "Fobias", "Interrogatório", "Motivos", "Vícios"] },
    { chave: "subterfugio", nome: "Subterfúgio", categoria: "social", exemplos: ["Blefar", "Fingir Mortalidade", "Golpes a Longo Prazo", "Inocência", "Mentiras Impecáveis", "Sedução"] },
    { chave: "ciencia", nome: "Ciência", categoria: "mental", especializacaoNaCompra: true, exemplos: ["Astronomia", "Biologia", "Demolição", "Engenharia", "Física", "Genética", "Geologia", "Matemática", "Química"] },
    { chave: "erudicao", nome: "Erudição", categoria: "mental", especializacaoNaCompra: true, exemplos: ["Arquitetura", "Filosofia", "História", "História da Arte", "Jornalismo", "Literatura Brasileira", "Pedagogia", "Pesquisa", "Teologia"] },
    { chave: "financas", nome: "Finanças", categoria: "mental", exemplos: ["Avaliação", "Contabilidade Forense", "Finanças Corporativas", "Lavagem de Dinheiro", "Manipulação de Moedas", "Mercado de Ações", "Mercado de Arte", "Mercados Negros", "Transações Bancárias"] },
    { chave: "investigacao", nome: "Investigação", categoria: "mental", exemplos: ["Análise de Tráfego", "Assassinato", "Criminologia", "Dedução", "Investigação Forense", "Mistérios Paranormais", "Pessoas Desaparecidas"] },
    { chave: "medicina", nome: "Medicina", categoria: "mental", exemplos: ["Cirurgia", "Farmácia", "Flebotomia", "Hematologia", "Patologia", "Primeiros Socorros", "Trauma", "Veterinária"] },
    { chave: "ocultismo", nome: "Ocultismo", categoria: "mental", exemplos: ["Alquimia", "Fadas", "Fantasmas", "Grimórios", "Infernalismo", "Lobisomens", "Magi", "Magia de Sangue", "Necromancia", "Nodismo", "Parapsicologia", "Vodu"] },
    { chave: "percepcao", nome: "Percepção", categoria: "mental", exemplos: ["Áreas Selvagens", "Armadilhas", "Audição", "Camuflagem", "Emboscadas", "Instintos", "Objetos Ocultos", "Olfato", "Visão"] },
    { chave: "politica", nome: "Política", categoria: "mental", exemplos: ["Anarchs", "Camarilla", "Clã", "Diplomacia", "Governo Municipal", "Mídia", "Política Estadual", "Política Nacional"] },
    { chave: "tecnologia", nome: "Tecnologia", categoria: "mental", exemplos: ["Artilharia", "Codificação", "Extração de Dados", "Hackear", "Montagem de Computadores", "Redes", "Sistemas de Vigilância", "Telefones"] },
  ];

  /* Distribuições da criação (p. 136, 146). */
  var DISTRIBUICAO_DE_ATRIBUTOS = [4, 3, 3, 3, 2, 2, 2, 2, 1];
  var DISTRIBUICOES_DE_HABILIDADES = {
    pauPraTodaObra: { nome: "Pau pra Toda Obra", valores: [3, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
    equilibrado: { nome: "Equilibrado", valores: [3, 3, 3, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1] },
    especialista: { nome: "Especialista", valores: [4, 3, 3, 3, 2, 2, 2, 1, 1, 1] },
  };

  /* ---------------------------------------------------------------
     TABELAS GERAIS (p. 119–130)
     --------------------------------------------------------------- */

  var DIFICULDADES = [
    { valor: 1, nome: "Fácil" }, { valor: 2, nome: "Rotineira" }, { valor: 3, nome: "Moderada" },
    { valor: 4, nome: "Desafiadora" }, { valor: 5, nome: "Difícil" }, { valor: 6, nome: "Muito difícil" },
    { valor: 7, nome: "Quase impossível" },
  ];

  /* Custos de experiência (p. 137, 151). `fator` × NOVO nível, salvo
     onde o custo é por ponto/fixo. */
  var CUSTOS_XP = {
    atributo: { fator: 5, nome: "Atributo" },
    habilidade: { fator: 3, nome: "Habilidade" },
    especializacao: { fixo: 3, nome: "Especialização" },
    disciplinaDoCla: { fator: 5, nome: "Disciplina do clã" },
    disciplinaForaDoCla: { fator: 7, nome: "Outra Disciplina" },
    disciplinaCaitiff: { fator: 6, nome: "Disciplina de Caitiff" },
    ritual: { fatorDoNivel: 3, nome: "Ritual" },
    formula: { fatorDoNivel: 3, nome: "Fórmula sangue-ralo" },
    vantagem: { porPonto: 3, nome: "Vantagem" },
    potencia: { fator: 10, nome: "Potência do Sangue" },
    humanidade: { fator: 10, nome: "Humanidade", soComNarrador: true, pagina: 241 },
  };

  /* O Mar do Tempo (p. 137, 148–151). */
  var IDADES = {
    crianca: { nome: "Criança da Noite", resumo: "Abraçada nos últimos 15 anos.", geracoes: [12, 13], potencia: 1, xp: 0, humanidade: 7, vantagens: 0, defeitos: 0, pagina: 148 },
    neofito: { nome: "Neófito", resumo: "Abraçado entre 1940 e uma década atrás.", geracoes: [12, 13], potencia: 1, xp: 15, humanidade: 7, vantagens: 0, defeitos: 0, pagina: 151 },
    ancilla: { nome: "Ancilla", resumo: "Abraçado entre 1780 e 1940.", geracoes: [10, 11], potencia: 2, xp: 35, humanidade: 6, vantagens: 2, defeitos: 2, pagina: 151 },
  };

  /* Geração × Potência do Sangue (p. 214). */
  var GERACOES = {
    4: [5, 10], 5: [4, 9], 6: [3, 8], 7: [3, 7], 8: [2, 6], 9: [2, 5],
    10: [1, 4], 11: [1, 4], 12: [1, 3], 13: [1, 3], 14: [0, 0], 15: [0, 0], 16: [0, 0],
  };

  /* Potência do Sangue (p. 216). `rerrolagem`: nível máximo de poder de
     Disciplina cuja Checagem pode rolar dois dados (escolhe o melhor).
     `saciaMenos`: Fome a menos saciada por humano; `minimoSemMatar`:
     Fome mínima sem drenar e matar; `animalEnsacado`: "metade" | "nada". */
  var POTENCIA = [
    { valor: 0, surto: 1, recupera: 1, bonusPoder: 0, rerrolagem: 0, perdicao: 0, animalEnsacado: "", saciaMenos: 0, minimoSemMatar: 1 },
    { valor: 1, surto: 2, recupera: 1, bonusPoder: 0, rerrolagem: 1, perdicao: 2, animalEnsacado: "", saciaMenos: 0, minimoSemMatar: 1 },
    { valor: 2, surto: 2, recupera: 2, bonusPoder: 1, rerrolagem: 1, perdicao: 2, animalEnsacado: "metade", saciaMenos: 0, minimoSemMatar: 1 },
    { valor: 3, surto: 3, recupera: 2, bonusPoder: 1, rerrolagem: 2, perdicao: 3, animalEnsacado: "nada", saciaMenos: 0, minimoSemMatar: 1 },
    { valor: 4, surto: 3, recupera: 3, bonusPoder: 2, rerrolagem: 2, perdicao: 3, animalEnsacado: "nada", saciaMenos: 1, minimoSemMatar: 1 },
    { valor: 5, surto: 4, recupera: 3, bonusPoder: 2, rerrolagem: 3, perdicao: 4, animalEnsacado: "nada", saciaMenos: 1, minimoSemMatar: 2 },
    { valor: 6, surto: 4, recupera: 3, bonusPoder: 3, rerrolagem: 3, perdicao: 4, animalEnsacado: "nada", saciaMenos: 1, minimoSemMatar: 2 },
    { valor: 7, surto: 5, recupera: 3, bonusPoder: 3, rerrolagem: 4, perdicao: 5, animalEnsacado: "nada", saciaMenos: 2, minimoSemMatar: 2 },
    { valor: 8, surto: 5, recupera: 4, bonusPoder: 4, rerrolagem: 4, perdicao: 5, animalEnsacado: "nada", saciaMenos: 2, minimoSemMatar: 3 },
    { valor: 9, surto: 6, recupera: 4, bonusPoder: 4, rerrolagem: 5, perdicao: 6, animalEnsacado: "nada", saciaMenos: 2, minimoSemMatar: 3 },
    { valor: 10, surto: 6, recupera: 5, bonusPoder: 5, rerrolagem: 5, perdicao: 6, animalEnsacado: "nada", saciaMenos: 3, minimoSemMatar: 3 },
  ];

  /* Humanidade (p. 236–241). `penalidade`: dados a menos para interagir
     com humanos; `comRubor`: a mesma com Rubor de Vida (níveis 2 e 1).
     `frenesi`: dados somados à resistência (1/3, arredondado para baixo).
     `torpor`: duração (texto) e `torporDias` para cálculos de data. */
  var HUMANIDADE = {
    10: { frenesi: 3, torpor: "um dia", torporDias: 1, penalidade: 0, curaComoMortal: true, semRubor: true, solPelaMetade: true, despertaAntes: 0, notas: "Não precisa de Rubor de Vida; come; acordado de dia como um humano; o sol fere pela metade." },
    9: { frenesi: 3, torpor: "três dias", torporDias: 3, penalidade: 0, curaComoMortal: true, despertaAntes: 1, notas: "Parece doente; come carne crua; desperta até 1 hora antes do pôr do sol e fica até 1 hora depois do amanhecer." },
    8: { frenesi: 2, torpor: "uma semana", torporDias: 7, penalidade: 0, ruborDoisDados: true, despertaAntes: 1, notas: "Rolar dois dados na Checagem do Rubor (fica o melhor); o Rubor permite sexo e prazer; digere vinho." },
    7: { frenesi: 2, torpor: "duas semanas", torporDias: 14, penalidade: 0, notas: "Rubor de Vida por Checagem; sem ele, comida e bebida voltam (Autocontrole + Vigor, Dif 3, para sair a tempo)." },
    6: { frenesi: 2, torpor: "um mês", torporDias: 30, penalidade: 0, notas: "Como 7, sem prazer; com Rubor, manter comida 1 hora: Autocontrole + Vigor, Dif 3." },
    5: { frenesi: 1, torpor: "um ano", torporDias: 365, penalidade: 1, notas: "−1 dado para interagir com humanos." },
    4: { frenesi: 1, torpor: "uma década", torporDias: 3650, penalidade: 2, semComida: true, notas: "−2 dados; não mantém comida mesmo com Rubor." },
    3: { frenesi: 1, torpor: "cinco décadas", torporDias: 18250, penalidade: 4, semComida: true, notas: "−4 dados; não consegue fingir sexo." },
    2: { frenesi: 0, torpor: "um século", torporDias: 36500, penalidade: 6, comRubor: 4, semComida: true, notas: "−6 dados (−4 com Rubor de Vida)." },
    1: { frenesi: 0, torpor: "cinco séculos", torporDias: 182500, penalidade: 8, comRubor: 5, semComida: true, notas: "−8 dados (−5 com Rubor de Vida)." },
    0: { frenesi: 0, torpor: "", torporDias: 0, penalidade: 0, besta: true, notas: "A Besta: o personagem passa ao Narrador." },
  };

  /* Pilares (p. 240): Máculas por evento. */
  var MACULAS_DE_PILAR = [
    { chave: "enlacar", nome: "Enlaçar um mortal", maculas: 1 },
    { chave: "abracar", nome: "Abraçar um mortal", maculas: 2 },
    { chave: "pilarFerido", nome: "Um Pilar sofre dano", maculas: 1 },
    { chave: "pilarFeridoPorVoce", nome: "Um Pilar sofre dano por suas ações", maculas: 2 },
    { chave: "pilarDestruido", nome: "Um Pilar é destruído", maculas: 2 },
    { chave: "pilarDestruidoPorVoce", nome: "Um Pilar é destruído por suas ações", maculas: 3 },
  ];

  /* ---------------------------------------------------------------
     CLÃS (p. 59–114)
     --------------------------------------------------------------- */

  /* `perdicao.efeito`: o que o motor aplica com a Gravidade da Perdição.
     `compulsao`: a Compulsão de clã (p. 210–211). */
  var CLAS = {
    brujah: {
      nome: "Brujah", disciplinas: ["celeridade", "potencia", "presenca"], pagina: 61,
      perdicao: { pagina: 67, efeito: "resistirFuria", texto: "Subtraia a Gravidade da Perdição de qualquer parada para resistir a frenesi de fúria (mínimo 1 dado)." },
      compulsao: { chave: "rebeliao", nome: "Rebelião", penalidade: 2, alvo: "todas", termina: "Contrariar alguém, fazer alguém mudar de ideia ou fazer o oposto do esperado.", pagina: 210 },
    },
    gangrel: {
      nome: "Gangrel", disciplinas: ["animalismo", "fortitude", "proteanismo"], pagina: 68,
      perdicao: { pagina: 73, efeito: "aspectosAnimais", texto: "Em frenesi, ganha aspectos animalescos em número igual à Gravidade; cada um reduz um Atributo em 1 até uma noite depois. Curtindo a Onda, pode manifestar só um." },
      compulsao: { chave: "impulsosFerais", nome: "Impulsos Ferais", penalidade: 3, alvo: ["manipulacao", "inteligencia"], duracao: "cena", termina: "Fim da cena.", pagina: 210 },
    },
    malkaviano: {
      nome: "Malkavianos", disciplinas: ["auspicios", "dominacao", "ofuscacao"], pagina: 74,
      perdicao: { pagina: 79, efeito: "categoriaAfligida", texto: "Em falha bestial ou Compulsão, penalidade igual à Gravidade numa categoria de parada (definida na criação) por toda a cena." },
      compulsao: { chave: "delirio", nome: "Delírio", penalidade: 2, alvo: ["destreza", "manipulacao", "autocontrole", "raciocinio", "frenesiDeTerror"], duracao: "cena", termina: "Fim da cena.", pagina: 210 },
    },
    nosferatu: {
      nome: "Nosferatu", disciplinas: ["animalismo", "ofuscacao", "potencia"], pagina: 80,
      perdicao: { pagina: 85, efeito: "repulsivo", texto: "Defeito Repulsivo (−2) e nunca aumentam a Qualidade Visual; tentar esconder as deformidades sofre penalidade igual à Gravidade (inclui Máscara de Mil Faces e Disfarce do Impostor)." },
      compulsao: { chave: "criptofilia", nome: "Criptofilia", penalidade: 2, alvo: "naoSegredo", termina: "Aprender um segredo grande o bastante.", pagina: 210 },
    },
    toreador: {
      nome: "Toreador", disciplinas: ["auspicios", "celeridade", "presenca"], pagina: 86,
      perdicao: { pagina: 91, efeito: "ambienteFeio", texto: "Em ambiente menos que belo, as paradas para acionar Disciplinas sofrem redutor igual à Gravidade (o Narrador decide)." },
      compulsao: { chave: "obsessao", nome: "Obsessão", penalidade: 2, alvo: "naoObjeto", duracao: "cena", termina: "Deixar de perceber o objeto belo, ou o fim da cena.", pagina: 211 },
    },
    tremere: {
      nome: "Tremere", disciplinas: ["auspicios", "dominacao", "feiticaria"], pagina: 92,
      perdicao: { pagina: 97, efeito: "lacoDiminuido", texto: "Não criam Laços com outros Membros; para enlaçar mortais e carniçais, o vitae precisa ser consumido um número de vezes extra igual à Gravidade." },
      compulsao: { chave: "perfeccionismo", nome: "Perfeccionismo", penalidade: 2, alvo: "todas", duracao: "cena", termina: "Vitória crítica numa rolagem de Habilidade, ou fim da cena; repetir a ação reduz a penalidade para 1, e na segunda repetição ela some.", pagina: 211 },
    },
    ventrue: {
      nome: "Ventrue", disciplinas: ["dominacao", "fortitude", "presenca"], pagina: 98,
      perdicao: { pagina: 102, efeito: "presaExclusiva", texto: "Só se alimentam do tipo de vítima preferido; outro tipo exige gastar Força de Vontade igual à Gravidade (senão vomita). Determinação + Percepção (Dif 4+) para sentir se o mortal serve." },
      compulsao: { chave: "arrogancia", nome: "Arrogância", penalidade: 2, alvo: "naoOrdem", termina: "Alguém obedecer uma ordem (não por Dominação).", pagina: 211 },
    },
    caitiff: {
      nome: "Caitiff", disciplinas: [], pagina: 105, semCla: true,
      perdicao: { pagina: 107, efeito: "", texto: "Sem Perdição de clã. Começa com o Defeito Suspeito (•) e não pode ter Status na criação; aumentar Disciplinas custa 6 × o novo nível." },
      compulsao: null,
    },
    sangueRalo: {
      nome: "Sangue-Ralo", disciplinas: [], pagina: 109, semCla: true, sangueRalo: true,
      perdicao: { pagina: 111, efeito: "", texto: "Sem Perdição nem Compulsão de clã (salvo o Defeito Maldição de Clã)." },
      compulsao: null,
    },
  };

  /* ---------------------------------------------------------------
     COMPULSÕES (p. 208–211) e FRENESI (p. 219–220)
     --------------------------------------------------------------- */

  var COMPULSOES = {
    fome: { nome: "Fome", penalidade: 2, alvo: "naoAlimentar", termina: "Saciar pelo menos 1 nível de Fome.", encerraAoSaciar: true, pagina: 208 },
    dominancia: { nome: "Dominância", penalidade: 2, alvo: "naoDominar", termina: "Vencer e se regozijar; trabalho em equipe proibido.", pagina: 208 },
    dano: { nome: "Dano", penalidade: 2, alvo: "naoFerir", termina: "Incapacitar, destruir ou expulsar o alvo.", pagina: 209 },
    paranoia: { nome: "Paranoia", penalidade: 2, alvo: "naoFugir", termina: "Cerca de uma hora num local seguro.", pagina: 209 },
  };
  /* Tabela aleatória (d10): 1–3 Fome, 4–5 Dominância, 6–7 Dano,
     8–9 Paranoia, 10 Compulsão de Clã (rerrole sem clã). */
  function compulsaoDaTabela(face) {
    var f = Number(face);
    if (f <= 3) return "fome";
    if (f <= 5) return "dominancia";
    if (f <= 7) return "dano";
    if (f <= 9) return "paranoia";
    return "cla";
  }

  var FRENESI = {
    furia: { nome: "Fúria", pagina: 220, gatilhos: [
      { nome: "Amigo morto", dificuldade: 2 }, { nome: "Pilar ou amante ferido", dificuldade: 3 },
      { nome: "Pilar ou amante morto", dificuldade: 4 }, { nome: "Provocação ou assédio físico", dificuldade: 2 },
      { nome: "Ofendido por um inferior", dificuldade: 2 }, { nome: "Humilhação pública", dificuldade: 2 },
    ], termina: "Destruir o alvo ou fim da cena; depois de destruir, Força de Vontade Dif 3 (5 se ainda houver inimigos de pé) para encerrar." },
    fome: { nome: "Fome", pagina: 220, gatilhos: [
      { nome: "Ferida aberta ou cheiro de sangue (Fome 4+)", dificuldade: 2, fomeMinima: 4 },
      { nome: "Gosto de sangue (Fome 4+)", dificuldade: 3, fomeMinima: 4 },
      { nome: "Falha numa Checagem com Fome 5", dificuldade: 4, fomeMinima: 5 },
    ], termina: "Fome 1 ou menos." },
    terror: { nome: "Terror", pagina: 220, gatilhos: [
      { nome: "Fogueira", dificuldade: 2 }, { nome: "Interior de construção em chamas", dificuldade: 3 },
      { nome: "Ser queimado", dificuldade: 2 }, { nome: "Luz do sol obscurecida", dificuldade: 3 },
      { nome: "Exposição total ao sol", dificuldade: 4 },
    ], termina: "Não perceber mais o perigo, ou fim da cena." },
  };

  /* ---------------------------------------------------------------
     FOME E ALIMENTAÇÃO (p. 205–213)
     --------------------------------------------------------------- */

  /* `sacia`: Fome reduzida; `maxSacia` quando variável. `tempo`: texto.
     `ressonancia`: "humana" | "animal" | "nenhuma". `danoNaVitima`:
     Agravado igual à Fome saciada. `mata`: única fonte que leva a 0. */
  var FONTES_DE_SANGUE = {
    animaisPequenos: { nome: "Vários animais pequenos (3–4 gatos, 12+ ratos)", sacia: 1, tempo: "uma cena", animal: true, ressonancia: "animal", pagina: 212 },
    animalMedio: { nome: "Animal médio (guaxinim, cachorro, coiote)", sacia: 1, tempo: "um turno", animal: true, ressonancia: "animal", pagina: 212 },
    animalGrande: { nome: "Animal grande (cavalo)", sacia: 2, tempo: "uma cena", animal: true, ressonancia: "animal", pagina: 212 },
    bolsaDeSangue: { nome: "Bolsa de banco de sangue", sacia: 1, tempo: "um turno", ensacado: true, ressonancia: "nenhuma", pagina: 212 },
    humanoGoles: { nome: "Alguns goles de um humano", sacia: 1, tempo: "três turnos", humano: true, ressonancia: "humana", pagina: 212 },
    humanoSemDano: { nome: "O máximo sem causar dano a um humano", sacia: 2, tempo: "uma cena", humano: true, ressonancia: "humana", pagina: 212 },
    humanoFerido: { nome: "Até causar dano (risco de morte sem tratamento)", sacia: 4, minSacia: 1, tempo: "um turno por Fome saciada", humano: true, ressonancia: "humana", danoNaVitima: true, sobrevivencia: true, pagina: 212 },
    humanoDrenado: { nome: "Humano completamente drenado e morto", sacia: 5, tempo: "cinco turnos", humano: true, ressonancia: "humana", mata: true, pagina: 212 },
    vampiro: { nome: "Outro vampiro", sacia: 1, tempo: "por turno", vampiro: true, ressonancia: "humana", pagina: 213 },
  };

  var TERRITORIOS_DE_CACA = [
    { chave: "favela", nome: "Favela, subúrbio, projeto de habitação pública ou banlieue", dificuldade: 2 },
    { chave: "boemio", nome: "Bairro boêmio ou hipster, bairro pobre ou em gentrificação", dificuldade: 3 },
    { chave: "classeMedia", nome: "Bairro de classe média, comercial, turístico, aeroporto ou cassino", dificuldade: 4 },
    { chave: "industrial", nome: "Bairro industrial ou portuário, zona residencial de classe média alta", dificuldade: 5 },
    { chave: "rico", nome: "Bairro rico", dificuldade: 6 },
  ];
  var MODIFICADORES_DE_CACA = [
    { chave: "policia", nome: "Presença da polícia maior que a normal", valor: 1 },
    { chave: "seguranca", nome: "Segurança reforçada", valor: 2 },
    { chave: "multidao", nome: "Festival, parada, comício, multidões", valor: -2 },
  ];

  /* ---------------------------------------------------------------
     RESSONÂNCIA E DISCRASIAS (p. 226–231)
     --------------------------------------------------------------- */

  var RESSONANCIAS = {
    colerica: { nome: "Colérica", disciplinas: ["celeridade", "potencia"], humor: "irado, violento, provocador, passional, invejoso" },
    melancolica: { nome: "Melancólica", disciplinas: ["fortitude", "ofuscacao"], humor: "triste, assustado, intelectual, deprimido, equilibrado" },
    fleumatica: { nome: "Fleumática", disciplinas: ["auspicios", "dominacao"], humor: "preguiçoso, apático, calmo, controlador, sentimental" },
    sanguinea: { nome: "Sanguínea", disciplinas: ["feiticaria", "presenca"], humor: "excitado, feliz, viciado, ativo, volúvel, entusiasmado" },
    animal: { nome: "Sangue animal", disciplinas: ["animalismo", "proteanismo"], humor: "a natureza do animal" },
  };
  var TEMPERAMENTOS = { efemero: "Efêmero", intenso: "Intenso", agudo: "Agudo" };
  /* d10 da Ressonância aleatória (p. 228). */
  function ressonanciaDaTabela(face) {
    var f = Number(face);
    if (f <= 3) return "fleumatica";
    if (f <= 6) return "melancolica";
    if (f <= 8) return "colerica";
    return "sanguinea";
  }

  /* `efeito`: o que o motor sabe aplicar. `uso`: "unico" consome. */
  var DISCRASIAS = {
    agressivo: { ressonancia: "colerica", nome: "Agressivo", efeito: { rerrolarHabilidade: ["intimidacao"] }, texto: "Rerrole quaisquer rolagens com Intimidação (dados de Fome com 1 da primeira rolagem ficam)." },
    cicloDeViolencia: { ressonancia: "colerica", nome: "Ciclo de Violência", efeito: { proximaAlimentacao: { colerica: 1, outra: -1 } }, uso: "unico", texto: "Próxima alimentação colérica sacia +1; outras, −1." },
    energetico: { ressonancia: "colerica", nome: "Energético", efeito: { xpGratis: ["celeridade", "potencia"] }, uso: "unico", texto: "+1 XP grátis para Celeridade ou Potência." },
    escrupuloso: { ressonancia: "colerica", nome: "Escrupuloso", efeito: { rerrolarContra: "inimigo ideológico" }, texto: "Rerrole qualquer rolagem num conflito contra um inimigo ideológico." },
    inveja: { ressonancia: "colerica", nome: "Inveja", efeito: { danoExtra: 1, condicao: "oponente melhor" }, texto: "+1 de dano contra oponentes melhores (físico e social)." },
    valentao: { ressonancia: "colerica", nome: "Valentão", efeito: { danoExtra: 1, condicao: "oponente mais fraco" }, texto: "+1 de dano contra oponentes mais fracos." },
    vingativo: { ressonancia: "colerica", nome: "Vingativo", efeito: { dados: 2, condicao: "contra o alvo da vingança" }, texto: "+2 dados contra o tipo de alvo ou o indivíduo odiado." },
    amorPerdido: { ressonancia: "melancolica", nome: "Amor Perdido", efeito: { dados: 1, condicao: "resistir a sedução (inclui Presença)" }, texto: "+1 dado para resistir a sedução." },
    emLuto: { ressonancia: "melancolica", nome: "Em Luto", efeito: { remorso: 1 }, texto: "+1 dado em Remorso." },
    evocador: { ressonancia: "melancolica", nome: "Evocador", efeito: { xpGratis: ["fortitude", "ofuscacao"] }, uso: "unico", texto: "+1 XP grátis para Fortitude ou Ofuscação." },
    falhaEpica: { ressonancia: "melancolica", nome: "Falha Épica", efeito: { rerrolarContra: "testes ligados à falha" }, texto: "Rerrole testes que lembrem da falha." },
    nostalgico: { ressonancia: "melancolica", nome: "Nostálgico", efeito: { dados: 1, condicao: "ligado à década, arte ou grupo", memoriam: 3 }, texto: "+1 dado ligado à época; +3 numa parada de Memoriam." },
    parentePerdido: { ressonancia: "melancolica", nome: "Parente Perdido", efeito: { saciaExtra: 1, condicao: "parentes" }, texto: "Sacia +1 ao se alimentar dos parentes." },
    anestesiado: { ressonancia: "fleumatica", nome: "Anestesiado", efeito: { ignoraDor: true }, texto: "Sem penalidade de dor física ou social." },
    comendoEmocoes: { ressonancia: "fleumatica", nome: "Comendo suas Emoções", efeito: { comer: true }, texto: "Come e digere alimentos sem enjoo." },
    dadoPorVencido: { ressonancia: "fleumatica", nome: "Dado por Vencido", efeito: { proximaAlimentacao: { fleumatica: 1, outra: -1 } }, uso: "unico", texto: "Próxima alimentação fleumática sacia +1; outras, −1." },
    indiferente: { ressonancia: "fleumatica", nome: "Indiferente", efeito: { frenesi: 2 }, texto: "+2 dados para resistir a frenesi." },
    loboSolitario: { ressonancia: "fleumatica", nome: "Lobo Solitário", efeito: { dados: 1, condicao: "sozinho", ajuda: -1 }, texto: "+1 dado sozinho; −1 ao ajudar em equipe; uma cena." },
    procrastinar: { ressonancia: "fleumatica", nome: "Procrastinar", efeito: { fdvPorSessao: 1 }, texto: "Recupera 1 FdV ao adiar algo importante por um dia (1× por sessão)." },
    reflexao: { ressonancia: "fleumatica", nome: "Reflexão", efeito: { xpGratis: ["auspicios", "dominacao"] }, uso: "unico", texto: "+1 XP grátis para Auspícios ou Dominação." },
    amorVerdadeiro: { ressonancia: "sanguinea", nome: "Amor Verdadeiro", efeito: { saciaExtra: 1, condicao: "do amor da bolsa" }, texto: "Sacia +1 com o amor da bolsa." },
    arrebatamento: { ressonancia: "sanguinea", nome: "Arrebatamento Maníaco", efeito: { dados: 1, ateFalhar: true, depois: -2 }, texto: "+1 dado em todos os testes até falhar; depois, −2 em todos." },
    bulicoso: { ressonancia: "sanguinea", nome: "Buliçoso", efeito: { xpGratis: ["feiticaria", "presenca"] }, uso: "unico", texto: "+1 XP grátis para Feitiçaria de Sangue ou Presença." },
    entusiasmoConstante: { ressonancia: "sanguinea", nome: "Entusiasmo Constante", efeito: { dados: 3, condicao: "convencer ao tocar a pele" }, texto: "Tocando a pele: +3 dados para convencer." },
    entusiasmoPelaVida: { ressonancia: "sanguinea", nome: "Entusiasmo pela Vida", efeito: { ruborGratis: true }, texto: "Rubor de Vida sem Checagem." },
    jogoDoOlfato: { ressonancia: "sanguinea", nome: "Jogo do Olfato", efeito: { dados: 3, condicao: "detectar bolsas Sanguíneas" }, texto: "+3 dados para detectar bolsas Sanguíneas." },
  };

  /* ---------------------------------------------------------------
     TIPOS DE PREDADOR (p. 175–178; paradas de caça p. 307–308)
     --------------------------------------------------------------- */

  /* Estrutura: `especializacoes` (escolha 1), `disciplinas` (escolha 1;
     `soTremere` limita), `vantagens`/`defeitos` fixos ou `escolha` com
     pontos a repartir; `humanidade`, `potencia`; `proibidoPara` clãs;
     `potenciaMaxima`; `parada` de caça. */
  var PREDADORES = {
    consensualista: {
      nome: "Consensualista", pagina: 175,
      especializacoes: [{ habilidade: "medicina", nome: "Flebotomia" }, { habilidade: "persuasao", nome: "Bolsas" }],
      disciplinas: ["auspicios", "fortitude"],
      humanidade: 1,
      defeitos: [{ chave: "segredoSombrio", pontos: 1, nota: "Quebrador da Máscara" }, { chave: "exclusaoDePresa", pontos: 1, nota: "sem consentimento" }],
      parada: [["manipulacao", "persuasao"]],
    },
    fazendeiro: {
      nome: "Fazendeiro", pagina: 175, proibidoPara: ["ventrue"], potenciaMaxima: 2,
      especializacoes: [{ habilidade: "empatiaComAnimais", nome: "Animal Específico" }, { habilidade: "sobrevivencia", nome: "Caça" }],
      disciplinas: ["animalismo", "proteanismo"],
      humanidade: 1,
      defeitos: [{ chave: "fazendeiro", pontos: 2 }],
      parada: [["autocontrole", "empatiaComAnimais"]],
    },
    osiris: {
      nome: "Osíris", pagina: 176,
      especializacoes: [{ habilidade: "ocultismo", nome: "Tradição específica" }, { habilidade: "performance", nome: "Campo de entretenimento" }],
      disciplinas: ["feiticaria", "presenca"], soTremere: ["feiticaria"],
      escolhas: [
        { tipo: "antecedente", pontos: 3, entre: ["fama", "rebanho"] },
        { tipo: "defeito", pontos: 2, entre: ["inimigos", "miticos"] },
      ],
      parada: [["manipulacao", "subterfugio"], ["intimidacao", "fama"]],
    },
    sacoleiro: {
      nome: "Sacoleiro", pagina: 176, proibidoPara: ["ventrue"],
      especializacoes: [{ habilidade: "ladroagem", nome: "Abrir Fechaduras" }, { habilidade: "manha", nome: "Mercado Negro" }],
      disciplinas: ["feiticaria", "ofuscacao"], soTremere: ["feiticaria"],
      vantagens: [{ chave: "esofagoDeFerro", pontos: 3 }],
      defeitos: [{ chave: "inimigos", pontos: 2 }],
      parada: [["inteligencia", "manha"]],
    },
    sandman: {
      nome: "Sandman", pagina: 176,
      especializacoes: [{ habilidade: "medicina", nome: "Anestésicos" }, { habilidade: "furtividade", nome: "Invasão" }],
      disciplinas: ["auspicios", "ofuscacao"],
      vantagens: [{ chave: "recursos", pontos: 1 }],
      parada: [["destreza", "furtividade"]],
    },
    sanguessuga: {
      nome: "Sanguessuga", pagina: 177,
      especializacoes: [{ habilidade: "briga", nome: "Membros" }, { habilidade: "furtividade", nome: "contra Membros" }],
      disciplinas: ["celeridade", "proteanismo"],
      humanidade: -1, potencia: 1,
      escolhas: [{ tipo: "defeitoUnico", entre: [{ chave: "segredoSombrio", pontos: 2, nota: "Diablerista" }, { chave: "segregado", pontos: 2 }] }],
      defeitos: [{ chave: "exclusaoDePresa", pontos: 2, nota: "mortais" }],
      parada: [["manipulacao", "subterfugio"]],
    },
    sceneQueen: {
      nome: "Scene Queen", pagina: 177,
      especializacoes: [{ habilidade: "etiqueta", nome: "Cena específica" }, { habilidade: "lideranca", nome: "Cena específica" }, { habilidade: "manha", nome: "Cena específica" }],
      disciplinas: ["dominacao", "potencia"],
      vantagens: [{ chave: "fama", pontos: 1 }, { chave: "contatos", pontos: 1 }],
      escolhas: [{ tipo: "defeitoUnico", entre: [{ chave: "malquisto", pontos: 1, nota: "Rejeitado fora da subcultura" }, { chave: "exclusaoDePresa", pontos: 1, nota: "uma subcultura diferente da sua" }] }],
      parada: [["manipulacao", "persuasao"]],
    },
    sereia: {
      nome: "Sereia", pagina: 177,
      especializacoes: [{ habilidade: "persuasao", nome: "Sedução" }, { habilidade: "subterfugio", nome: "Sedução" }],
      disciplinas: ["fortitude", "presenca"],
      vantagens: [{ chave: "belo", pontos: 2 }],
      defeitos: [{ chave: "inimigos", pontos: 1, nota: "amante desprezado ou parceiro ciumento" }],
      parada: [["carisma", "subterfugio"]],
    },
    trinchador: {
      nome: "Trinchador", pagina: 178,
      especializacoes: [{ habilidade: "persuasao", nome: "Gaslighting" }, { habilidade: "subterfugio", nome: "Encobrimento" }],
      disciplinas: ["dominacao", "animalismo"],
      vantagens: [{ chave: "rebanho", pontos: 2 }],
      defeitos: [{ chave: "segredoSombrio", pontos: 1, nota: "Trinchador" }],
      parada: [["manipulacao", "subterfugio"]],
    },
    viraLata: {
      nome: "Vira-lata", pagina: 178,
      especializacoes: [{ habilidade: "intimidacao", nome: "Assalto à Mão Armada" }, { habilidade: "briga", nome: "Agarramento" }],
      disciplinas: ["celeridade", "potencia"],
      humanidade: -1,
      vantagens: [{ chave: "contatos", pontos: 3, nota: "criminosos" }],
      parada: [["forca", "briga"], ["raciocinio", "manha"]],
    },
  };

  /* ---------------------------------------------------------------
     VANTAGENS (p. 179–194)
     --------------------------------------------------------------- */

  /* tipo: "qualidade" | "antecedente" | "defeito". `niveis`: os valores
     permitidos. `grupo`: o título do livro. `efeito`: o que o motor
     aplica. `requisito`: idade/clã/condição. `nome` de defeito com o
     mesmo grupo mostra que são espelhos. */
  var VANTAGENS = {
    // Linguística
    linguistica: { tipo: "qualidade", grupo: "Linguística", nome: "Linguística", niveis: [1, 2, 3, 4, 5], porNivel: true, texto: "Um idioma adicional por ponto.", pagina: 179 },
    analfabeto: { tipo: "defeito", grupo: "Linguística", nome: "Analfabeto", niveis: [2], efeito: { limiteHabilidade: { erudicao: 1, ciencia: 1 } }, texto: "Erudição e Ciência limitadas a 1, sem especializações modernas.", pagina: 179 },
    // Visual
    repulsivo: { tipo: "defeito", grupo: "Visual", nome: "Repulsivo", niveis: [2], efeito: { social: -2 }, texto: "−2 dados em paradas Sociais relevantes.", pagina: 179 },
    feio: { tipo: "defeito", grupo: "Visual", nome: "Feio", niveis: [1], efeito: { social: -1 }, texto: "−1 dado em paradas Sociais relevantes.", pagina: 179 },
    belo: { tipo: "qualidade", grupo: "Visual", nome: "Belo", niveis: [2], efeito: { social: 1 }, proibidoPara: ["nosferatu"], texto: "+1 dado em paradas Sociais apropriadas.", pagina: 179 },
    deslumbrante: { tipo: "qualidade", grupo: "Visual", nome: "Deslumbrante", niveis: [4], efeito: { social: 2 }, proibidoPara: ["nosferatu"], texto: "+2 dados em paradas Sociais apropriadas.", pagina: 179 },
    // Uso de substância
    vicioIncuravel: { tipo: "defeito", grupo: "Uso de Substância", nome: "Vício Incurável", niveis: [2], efeito: { abstinencia: -2 }, texto: "−2 em todas as paradas quando a última vítima não estava sob efeito da droga (exceto para obtê-la).", pagina: 179 },
    dependencia: { tipo: "defeito", grupo: "Uso de Substância", nome: "Dependência", niveis: [1], efeito: { abstinencia: -1 }, texto: "−1 em todas as paradas quando a última vítima não estava sob efeito da droga.", pagina: 179 },
    viciadoFuncional: { tipo: "qualidade", grupo: "Uso de Substância", nome: "Viciado Funcional", niveis: [1], efeito: { sobEfeito: 1 }, texto: "+1 dado numa categoria de parada quando a última vítima estava sob efeito.", pagina: 180 },
    // Arcaico
    arcaico: { tipo: "defeito", grupo: "Arcaico", nome: "Arcaico", niveis: [2], requisito: { idadeMinima: "ancilla" }, efeito: { limiteHabilidade: { tecnologia: 0 } }, texto: "Tecnologia permanentemente 0; −1 dado com tecnologia moderna.", pagina: 180 },
    vivendoNoPassado: { tipo: "defeito", grupo: "Arcaico", nome: "Vivendo no Passado", niveis: [1], requisito: { idadeMinima: "ancilla" }, texto: "−1 dado em Sociais que envolvam crenças antiquadas.", pagina: 180 },
    // Laço
    escravoDoLaco: { tipo: "defeito", grupo: "Laço", nome: "Escravo do Laço", niveis: [2], efeito: { lacoNoPrimeiroGole: true }, texto: "Enlaça ao primeiro gole.", pagina: 180 },
    viciadoEmLaco: { tipo: "defeito", grupo: "Laço", nome: "Viciado em Laço", niveis: [1], efeito: { contraLaco: -1 }, texto: "−1 dado para agir contra um Laço.", pagina: 180 },
    lacoLongo: { tipo: "defeito", grupo: "Laço", nome: "Laço Longo", niveis: [1], efeito: { lacoEnfraquece: "trimestre" }, texto: "Laços perdem força mais devagar: 1 nível a cada 3 meses.", pagina: 180 },
    resistenciaAoLaco: { tipo: "qualidade", grupo: "Laço", nome: "Resistência ao Laço", niveis: [1, 2, 3], efeito: { resistirLacoPorNivel: 1 }, texto: "+1 dado por nível para resistir a um Laço.", pagina: 180 },
    lacoCurto: { tipo: "qualidade", grupo: "Laço", nome: "Laço Curto", niveis: [2], efeito: { lacoEnfraquece: "quinzena" }, texto: "Laços perdem 2 níveis por mês.", pagina: 181 },
    aProvaDeLaco: { tipo: "qualidade", grupo: "Laço", nome: "À Prova de Laço", niveis: [5], efeito: { imuneLaco: true }, texto: "Não pode ser Enlaçado.", pagina: 181 },
    // Alimentação
    fazendeiro: { tipo: "defeito", grupo: "Alimentação", nome: "Fazendeiro", niveis: [2], proibidoPara: ["ventrue"], efeito: { soAnimal: true, custoHumanoFdV: 2 }, texto: "Só se alimenta de sangue animal; beber humano custa 2 FdV.", pagina: 181 },
    organivoro: { tipo: "defeito", grupo: "Alimentação", nome: "Organívoro", niveis: [2], efeito: { soOrgaos: true }, texto: "Só reduz Fome comendo carne e órgãos humanos.", pagina: 181 },
    sedeDoMatusalem: { tipo: "defeito", grupo: "Alimentação", nome: "Sede do Matusalém", niveis: [1], efeito: { fomeMinima: 1 }, texto: "Só fica totalmente saciado com sangue sobrenatural; senão, Fome mínima 1.", pagina: 181 },
    exclusaoDePresa: { tipo: "defeito", grupo: "Alimentação", nome: "Exclusão de Presa", niveis: [1, 2], efeito: { presaExcluida: true }, texto: "Recusa uma classe de presa; alimentar-se dela gera Máculas como violar um Princípio.", pagina: 181 },
    sabujoDeSangue: { tipo: "qualidade", grupo: "Alimentação", nome: "Sabujo de Sangue", niveis: [1], efeito: { farejarRessonancia: true }, texto: "Fareja a Ressonância sem provar: Determinação + Percepção, Dif 3.", pagina: 182 },
    esofagoDeFerro: { tipo: "qualidade", grupo: "Alimentação", nome: "Esôfago de Ferro", niveis: [3], proibidoPara: ["ventrue"], efeito: { ensacadoIntegral: true }, texto: "Alimenta-se de sangue frio, rançoso ou plasma fracionado (sem Ressonância).", pagina: 182 },
    // Míticos
    iscaDeEstaca: { tipo: "defeito", grupo: "Míticos", nome: "Isca de Estaca", niveis: [2], efeito: { estacaMata: true }, texto: "Estacado no coração: Morte Final em vez de Torpor.", pagina: 182 },
    perdicaoFolclorica: { tipo: "defeito", grupo: "Míticos", nome: "Perdição Folclórica", niveis: [1], parametro: ["Luz UV", "Prata", "Água benta"], texto: "Sofre Agravado da substância escolhida.", pagina: 182 },
    tabuFolclorico: { tipo: "defeito", grupo: "Míticos", nome: "Tabu Folclórico", niveis: [1], texto: "Diante do tabu, afasta-se ou gasta 1 FdV.", pagina: 182 },
    estigma: { tipo: "defeito", grupo: "Míticos", nome: "Estigma", niveis: [1], texto: "Com Fome 4, começa a sangrar.", pagina: 182 },
    ingerirComida: { tipo: "qualidade", grupo: "Míticos", nome: "Ingerir Comida", niveis: [2], texto: "Consome comida (sem nutrição) e a expele antes de descansar.", pagina: 182 },
    // Antecedentes
    aliados: { tipo: "antecedente", grupo: "Aliados", nome: "Aliados", niveis: [1, 2, 3, 4, 5, 6], relacao: true, texto: "Efetividade (• fraco a •••• mortífero) + confiabilidade (• a •••); até 6 pontos.", pagina: 184 },
    inimigos: { tipo: "defeito", grupo: "Aliados", nome: "Inimigos", niveis: [1, 2, 3, 4, 5, 6], relacao: true, texto: "Um adversário mortal com a mesma escala de Aliados.", pagina: 184 },
    contatos: { tipo: "antecedente", grupo: "Contatos", nome: "Contatos", niveis: [1, 2, 3], relacao: true, texto: "• barato/comum; •• útil; ••• caro ou difícil.", pagina: 185 },
    fama: { tipo: "antecedente", grupo: "Fama", nome: "Fama", niveis: [1, 2, 3, 4, 5], efeito: { famaCaca: true }, texto: "Subtrai da Dificuldade de testes sociais com fãs; dificulta caçar com discrição.", pagina: 186 },
    infamia: { tipo: "defeito", grupo: "Fama", nome: "Infâmia", niveis: [1, 2, 3, 4, 5], texto: "Reputação ruim conhecida.", pagina: 186 },
    segredoSombrio: { tipo: "defeito", grupo: "Fama", nome: "Segredo Sombrio", niveis: [1, 2], texto: "Um segredo que, revelado, traria perigo.", pagina: 187 },
    influencia: { tipo: "antecedente", grupo: "Influência", nome: "Influência", niveis: [1, 2, 3, 4, 5], texto: "Bem-Relacionado, Influente, Estabelecido, Poderoso, Dominante.", pagina: 187 },
    desprezado: { tipo: "defeito", grupo: "Influência", nome: "Desprezado", niveis: [2], efeito: { social: -2, condicao: "convencer alguém neutro do grupo" }, texto: "−2 dados para convencer neutros.", pagina: 187 },
    malquisto: { tipo: "defeito", grupo: "Influência", nome: "Malquisto", niveis: [1], efeito: { social: -1, condicao: "com o grupo" }, texto: "−1 dado em Sociais com o grupo.", pagina: 187 },
    refugio: { tipo: "antecedente", grupo: "Refúgio", nome: "Refúgio", niveis: [1, 2, 3], efeito: { refugio: true }, texto: "+1 Dificuldade para detectar/invadir por ponto; +1 dado para perceber perigo ou despertar.", pagina: 188 },
    semRefugio: { tipo: "defeito", grupo: "Refúgio", nome: "Nenhum Refúgio", niveis: [1], texto: "Não tem refúgio.", pagina: 188 },
    refugioQualidade: { tipo: "qualidade", grupo: "Refúgio", nome: "Qualidade de Refúgio", niveis: [1, 2, 3], porNivel: true, parametro: ["Arsenal Oculto", "Cela", "Vigilância", "Laboratório", "Biblioteca", "Localização", "Luxo", "Poterna", "Sistema de Segurança", "Sala de Operações", "Proteção"], texto: "Cada ponto, uma qualidade do refúgio (p. 188–189).", pagina: 188 },
    refugioDefeito: { tipo: "defeito", grupo: "Refúgio", nome: "Defeito de Refúgio", niveis: [1, 2], parametro: ["Comprometido (••)", "Assustador (•)", "Assombrado (•)"], texto: "Comprometido +2 dados a invasores; Assustador −2 Sociais para seduzir hóspedes; Assombrado.", pagina: 189 },
    rebanho: { tipo: "antecedente", grupo: "Rebanho", nome: "Rebanho", niveis: [1, 2, 3, 4, 5], efeito: { rebanho: true }, texto: "1–3, 4–7, 8–15, 16–30, 31–60 bolsas; alimenta sem rolar para caçar.", pagina: 189 },
    predadorManifesto: { tipo: "defeito", grupo: "Rebanho", nome: "Predador Manifesto", niveis: [2], efeito: { caca: -2, semRebanho: true }, texto: "−2 dados para caçar; não pode manter Rebanho.", pagina: 190 },
    mascara: { tipo: "antecedente", grupo: "Máscara", nome: "Máscara", niveis: [1, 2], texto: "Identidade falsa; •• passa verificação oficial.", pagina: 190 },
    zerado: { tipo: "qualidade", grupo: "Máscara", nome: "Zerado", niveis: [1], requisito: { vantagem: "mascara", nivel: 2 }, texto: "Apagado dos registros.", pagina: 191 },
    sapateiro: { tipo: "qualidade", grupo: "Máscara", nome: "Sapateiro", niveis: [1], requisito: { vantagem: "mascara", nivel: 2 }, texto: "Fabrica Máscaras para outros.", pagina: 191 },
    corpoFrioIdentificado: { tipo: "defeito", grupo: "Máscara", nome: "Corpo Frio Identificado", niveis: [2], texto: "Sua natureza vampírica está em registros.", pagina: 191 },
    cadaverIdentificado: { tipo: "defeito", grupo: "Máscara", nome: "Cadáver Identificado", niveis: [1], texto: "Oficialmente morto.", pagina: 191 },
    mawla: { tipo: "antecedente", grupo: "Mawla", nome: "Mawla", niveis: [1, 2, 3, 4, 5], relacao: true, texto: "Mentor: Neófito, Ancilla, Ancião, Primogênito, Príncipe ou Barão.", pagina: 192 },
    adversario: { tipo: "defeito", grupo: "Mawla", nome: "Adversário", niveis: [1, 2, 3, 4, 5], relacao: true, texto: "Um Membro hostil.", pagina: 193 },
    recursos: { tipo: "antecedente", grupo: "Recursos", nome: "Recursos", niveis: [1, 2, 3, 4, 5], texto: "Proletariado, Classe Média, Rico, Milionário, Bilionário.", pagina: 193 },
    destituido: { tipo: "defeito", grupo: "Recursos", nome: "Destituído", niveis: [1], texto: "Sem renda.", pagina: 193 },
    lacaios: { tipo: "antecedente", grupo: "Lacaios", nome: "Lacaios", niveis: [1, 2, 3], relacao: true, texto: "Servos: decepcionante (Fraco), carniçal (Médio), competente (Talentoso).", pagina: 194 },
    perseguidores: { tipo: "defeito", grupo: "Lacaios", nome: "Perseguidores", niveis: [1], texto: "Alguém insiste em servi-lo.", pagina: 194 },
    status: { tipo: "antecedente", grupo: "Status", nome: "Status", niveis: [1, 2, 3, 4, 5], proibidoPara: ["caitiff", "sangueRalo"], texto: "Conhecido, Respeitado, Influente, Poderoso, Luminar numa seita.", pagina: 194 },
    segregado: { tipo: "defeito", grupo: "Status", nome: "Segregado", niveis: [2], efeito: { social: -2, condicao: "com a facção" }, texto: "Banido de uma facção.", pagina: 194 },
    suspeito: { tipo: "defeito", grupo: "Status", nome: "Suspeito", niveis: [1], efeito: { social: -2, condicao: "com a facção" }, texto: "−2 dados em Sociais com a facção.", pagina: 194 },
  };

  /* Os grupos de Defeitos de Predador que o livro chama pelo grupo
     ("Inimigos ou Míticos"): resolvidos para a chave real. */
  var GRUPOS_DE_DEFEITO = {
    miticos: ["iscaDeEstaca", "perdicaoFolclorica", "tabuFolclorico", "estigma"],
    inimigos: ["inimigos"],
    fama: ["fama"],
    rebanho: ["rebanho"],
  };

  /* Sangue-Ralo (p. 182–184): sem valor em pontos; cada Defeito
     compensa uma Qualidade (1 a 3 de cada na criação). */
  var SANGUE_RALO = {
    qualidades: {
      camaradasAnarchs: { nome: "Camaradas Anarchs", texto: "Equivale a Mawla (Anarch) 1.", conflitaCom: "segregadoPelosAnarchs" },
      contatoNaCamarilla: { nome: "Contato na Camarilla", texto: "Equivale a Mawla (Camarilla) 1.", conflitaCom: "marcadoPelaCamarilla" },
      sangueAgregador: { nome: "Sangue Agregador", texto: "Cria Laços e Abraça como um vampiro pleno (o Abraço gera sangue-ralo)." },
      bebedorDiurno: { nome: "Bebedor Diurno", efeito: { sol: "metadeVitalidade" }, texto: "Ao sol, a Vitalidade cai à metade (arred. para cima) e os dons vampíricos somem; sem outro dano." },
      afinidadeComDisciplina: { nome: "Afinidade com Disciplina", efeito: { disciplinaFixa: 1 }, texto: "1 ponto numa Disciplina; aumenta como Disciplina de fora do clã; a Ressonância não dá pontos temporários." },
      semblanteDeVida: { nome: "Semblante de Vida", efeito: { semblante: true }, conflitaCom: "carneMorta", texto: "Batimento, comida, sexo; só o exame mais avançado nota." },
      alquimista: { nome: "Alquimista Sangue-Ralo", efeito: { alquimia: 1 }, texto: "1 ponto em Alquimia Sangue-Ralo e 1 fórmula." },
      resilienciaVampirica: { nome: "Resiliência Vampírica", efeito: { danoComoVampiro: true }, conflitaCom: "fragilidadeMortal", texto: "Sofre dano como vampiro pleno." },
    },
    defeitos: {
      denteDeLeite: { nome: "Dente de Leite", efeito: { semMordida: true }, texto: "Presas inúteis." },
      temperamentoBestial: { nome: "Temperamento Bestial", efeito: { frenesiPleno: true }, texto: "Testa frenesi como um vampiro pleno." },
      marcadoPelaCamarilla: { nome: "Marcado pela Camarilla", texto: "Registrado pela Camarilla." },
      maldicaoDeCla: { nome: "Maldição de Clã", efeito: { perdicaoDeCla: 1 }, texto: "Uma Perdição de clã com Gravidade 1 (Brujah e Gangrel só com Temperamento Bestial; Tremere só com Sangue Agregador)." },
      carneMorta: { nome: "Carne Morta", efeito: { socialComMortais: -1, semRubor: true }, texto: "−1 dado em Sociais face a face com mortais; não pode usar Semblante de Vida." },
      fragilidadeMortal: { nome: "Fragilidade Mortal", efeito: { curaComoMortal: true }, texto: "Não pode Inflamar o Sangue para curar; cura como mortal." },
      segregadoPelosAnarchs: { nome: "Segregado pelos Anarchs", texto: "Não pode ter Camaradas Anarchs." },
      dependenciaDeVitae: { nome: "Dependência de Vitae", efeito: { vitaeSemanal: true }, texto: "Sem saciar 1 de Fome com vitae por semana, perde Disciplinas e Alquimia." },
    },
  };

  /* Modelos de mortais (p. 185): Aliados, Lacaios, Contatos. */
  var MODELOS_MORTAIS = {
    fraco: { nome: "Fraco", atributos: [2, 2, 1, 1, 1, 1, 1, 1, 1], habilidades: [2, 2, 2, 1, 1, 1, 1, 1], vantagens: 0, defeitos: 0 },
    medio: { nome: "Médio", atributos: [3, 3, 2, 2, 2, 1, 1, 1, 1], habilidades: [3, 3, 3, 2, 2, 2, 2, 1, 1, 1, 1, 1], vantagens: 3, defeitos: 2 },
    talentoso: { nome: "Talentoso", atributos: [4, 3, 3, 2, 2, 1, 1, 1, 1], habilidades: [4, 4, 3, 3, 3, 3, 2, 2, 2, 2, 1, 1, 1, 1], especializacoes: 1, vantagens: 10, defeitos: 4 },
    mortifero: { nome: "Mortífero", atributos: [5, 5, 4, 4, 3, 3, 2, 2, 2], habilidades: [5, 4, 4, 4, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2], especializacoes: 3, vantagens: 15, defeitos: 0 },
  };

  /* ---------------------------------------------------------------
     COTERIE E DOMÍNIO (p. 195–199)
     --------------------------------------------------------------- */

  var DOMINIO = {
    chasse: { nome: "Chasse", texto: "1 ponto: Dificuldade de caça 6 no domínio; cada ponto a mais reduz 1 (Chasse 5 → 2).", pagina: 196 },
    lien: { nome: "Lien", texto: "+1 dado por ponto para interagir pacificamente com mortais nativos, encontrar algo ou investigar no domínio. Nunca modifica caça.", pagina: 196 },
    portillon: { nome: "Portillon", texto: "−1 dado por ponto na parada de quem tenta invadir, investigar ou vigiar o domínio sem a coterie saber.", pagina: 196 },
  };
  function dificuldadeDeCacaDoChasse(chasse) {
    var c = Math.max(0, Math.min(5, Number(chasse) || 0));
    return c ? 7 - c : 0;
  }

  /* Tipos de coterie: o que custa da parada (domínio e antecedentes);
     `extras` são sugestões que o grupo pode comprar. */
  var COTERIES = {
    campeoes: { nome: "Campeões", dominio: { chasse: 1, lien: 3 }, antecedentes: { aliados: 1 }, defeitos: { inimigos: 2 }, extras: ["Adversários", "Contatos"] },
    cerbero: { nome: "Cérbero", dominio: { chasse: 1, portillon: 3 }, antecedentes: { refugio: 2 }, extras: ["Adversário", "Defeito de Refúgio (Assombrado)", "Status"] },
    comando: { nome: "Comando", dominio: { chasse: 1, portillon: 2 }, antecedentes: { mawla: 3, status: 1 }, defeitos: { inimigos: 2 }, extras: ["Adversário", "Refúgio", "Máscara"] },
    cultoDeSangue: { nome: "Culto de Sangue", dominio: { lien: 1, portillon: 2 }, antecedentes: { rebanho: 3 }, defeitos: { suspeito: 1 }, extras: ["Inimigos ••", "Refúgio", "Defeito de Máscara ••", "Lacaios"] },
    gangueDasPresas: { nome: "Gangue das Presas", dominio: { chasse: 1, lien: 1, portillon: 1 }, antecedentes: { contatos: 1 }, defeitos: { inimigos: 2 }, extras: ["Refúgio", "Rebanho", "Influência", "Lacaios", "Status"] },
    grupoDeCaca: { nome: "Grupo de Caça", dominio: { chasse: 3 }, antecedentes: {}, escolha: { pontos: 1, entre: ["aliados", "mawla"] }, extras: ["Rebanho", "Influência"] },
    guardaDiurna: { nome: "Guarda Diurna", dominio: { chasse: 1, portillon: 2 }, antecedentes: { influencia: 2 }, defeitos: { inimigos: 3 }, extras: ["Aliados", "Contatos", "Refúgio", "Mawla"] },
    marechal: { nome: "Marechal", dominio: { chasse: 2, portillon: 2 }, antecedentes: { status: 3 }, extras: ["Adversários", "Influência", "Mawla", "Lacaios"] },
    nomades: { nome: "Nômades", dominio: {}, antecedentes: { contatos: 3, lacaios: 2 }, defeitos: { suspeito: 1 }, extras: ["Rebanho"] },
    plumaire: { nome: "Plumaire", dominio: { chasse: 2, lien: 2 }, antecedentes: { contatos: 3 }, extras: ["Adversário ou Inimigo", "Status"] },
    questari: { nome: "Questari", dominio: { chasse: 1, lien: 3 }, antecedentes: { contatos: 2 }, extras: ["Refúgio com Biblioteca", "Mawla", "Recursos"] },
    regencia: { nome: "Regência", dominio: { chasse: 2, portillon: 3 }, antecedentes: { mawla: 2, status: 4 }, livre: { pontos: 10, entre: ["refugio", "rebanho", "influencia", "recursos", "lacaios"], defeitosIguais: true }, extras: [] },
    sbirri: { nome: "Sbirri", dominio: {}, antecedentes: { mawla: 2, mascara: 1 }, extras: ["Adversários na Primigênie"] },
    vehme: { nome: "Vehme", dominio: { chasse: 1 }, antecedentes: { influencia: 3, status: 3 }, extras: ["Adversários", "Mawla"] },
    vigilantes: { nome: "Vigilantes", dominio: { chasse: 1, lien: 2, portillon: 1 }, antecedentes: { status: 2 }, extras: ["Contatos", "Lacaios"] },
  };

  /* ---------------------------------------------------------------
     CONFLITO (p. 124–127, 295–305)
     --------------------------------------------------------------- */

  var ARMAS = {
    improvisada: { nome: "Arma improvisada", dano: 0, tipo: "impacto" },
    estaca: { nome: "Estaca", dano: 0, tipo: "perfuracao", estaca: true },
    impactoLeve: { nome: "Impacto leve (soco inglês)", dano: 1, tipo: "impacto" },
    impactoPesado: { nome: "Impacto pesado (cassetete, taco, chave de roda)", dano: 2, tipo: "impacto" },
    perfuracaoLeve: { nome: "Perfuração leve (virote de besta, canivete)", dano: 2, tipo: "perfuracao" },
    disparoLeve: { nome: "Disparo leve (pistola .22)", dano: 2, tipo: "disparo", distancia: true },
    brancaPesada: { nome: "Arma branca pesada (espada larga, machado de bombeiro)", dano: 3, tipo: "corte" },
    disparoMedio: { nome: "Disparo médio (rifle .308, pistola 9 mm, escopeta no alcance)", dano: 3, tipo: "disparo", distancia: true },
    disparoPesado: { nome: "Disparo pesado (escopeta 12 à curta, Magnum .357)", dano: 4, tipo: "disparo", distancia: true },
    brancaEnorme: { nome: "Arma branca enorme (claymore, viga de aço)", dano: 4, tipo: "corte" },
    soproDeDragao: { nome: "Munição sopro de dragão", dano: 0, tipo: "fogo", distancia: true, agravadoEmVampiros: true, incendeia: 1 },
    raufoss: { nome: "Raufoss", dano: 5, tipo: "disparo", distancia: true, ignoraArmadura: true, agravadoEmVampiros: true },
    hafla: { nome: "Hafla", dano: 3, tipo: "fogo", distancia: true, agravadoEmVampiros: true, incendeia: 3, dificuldadeMinima: 3 },
    lancaChamas: { nome: "Lança-chamas", dano: 0, tipo: "fogo", distancia: true, agravadoEmVampiros: true, incendeia: 1 },
    molotov: { nome: "Coquetel Molotov", dano: 0, tipo: "fogo", distancia: true, agravadoEmVampiros: true, incendeia: 2, dificuldadeMinima: 4 },
    lancadorDeEstacas: { nome: "Lançador de estacas", dano: 0, tipo: "perfuracao", distancia: true, estaca: true },
  };
  var ARMADURAS = {
    reforcada: { nome: "Roupa reforçada / couro pesado", valor: 2, contraBalas: 0 },
    balistico: { nome: "Tecido balístico", valor: 2 },
    kevlar: { nome: "Colete Kevlar / jaqueta flak", valor: 4 },
    swat: { nome: "Armadura tática da SWAT / militar", valor: 6, penalidade: { destreza: 1 } },
  };
  var COBERTURA = [
    { chave: "nenhuma", nome: "Nenhuma cobertura", dados: -2 },
    { chave: "ocultacao", nome: "Apenas ocultação (arbustos, árvore pequena)", dados: -1 },
    { chave: "rigida", nome: "Cobertura rígida (bloco de motor, esquina de concreto)", dados: 0 },
    { chave: "entrincheirado", nome: "Entrincheiramento (sacos de areia, casamata)", dados: 1 },
    { chave: "ameia", nome: "Ameia (fenda de disparo de um veículo militar)", dados: 2 },
  ];
  var AUDIENCIA_SOCIAL = [
    { chave: "oponentes", nome: "Apenas oponentes", dano: 0 },
    { chave: "coterie", nome: "Sua coterie", dano: 1 },
    { chave: "valoriza", nome: "Membros cujas opiniões você valoriza", dano: 2 },
    { chave: "primogenito", nome: "Primogênito, Harpia ou outras figuras importantes; rival verdadeiro", dano: 3 },
    { chave: "principe", nome: "O Príncipe, Barão ou outra figura poderosa", dano: 4 },
  ];
  /* Ferimentos incapacitantes (p. 303): d10 + Agravado atual. */
  var FERIMENTOS = [
    { ate: 6, chave: "atordoado", nome: "Atordoado", texto: "Gaste 1 FdV ou perca um turno." },
    { ate: 8, chave: "traumaNaCabeca", nome: "Trauma grave na cabeça", texto: "Físicas −1; Mentais −2.", penalidades: { fisico: 1, mental: 2 } },
    { ate: 10, chave: "membroQuebrado", nome: "Membro quebrado ou cegado", texto: "−3 com o membro afetado (ou na visão)." },
    { ate: 11, chave: "ferimentoMacico", nome: "Ferimento maciço", texto: "Todas as rolagens −2; +1 a todo dano sofrido.", penalidades: { todas: 2 }, danoExtra: 1 },
    { ate: 12, chave: "aleijado", nome: "Aleijado", texto: "Como membro quebrado, mas o membro está perdido." },
    { ate: 99, chave: "morte", nome: "Morte (mortais) ou Torpor imediato (vampiro)", texto: "" },
  ];
  /* Conflito de rolagem única (p. 298): Dificuldade pela oposição. */
  var ROLAGEM_UNICA = [
    { chave: "fraca", nome: "Oposição fraca", dificuldade: 2 },
    { chave: "igual", nome: "Oposição equivalente", dificuldade: 4 },
    { chave: "forte", nome: "Oposição forte", dificuldade: 6 },
  ];

  /* ---------------------------------------------------------------
     AÇÕES PADRÃO (Apêndice I, p. 407–418) — paradas sugeridas
     --------------------------------------------------------------- */

  var ACOES_PADRAO = [
    { chave: "criacaoArtistica", nome: "Criação artística", parada: [["inteligencia", "oficios"], ["inteligencia", "performance"]], pagina: 407 },
    { chave: "explosivos", nome: "Explosivos", parada: [["inteligencia", "ciencia"], ["inteligencia", "tecnologia"]], pagina: 407 },
    { chave: "ocultamento", nome: "Ocultamento", parada: [["inteligencia", "sobrevivencia"], ["inteligencia", "manha"]], pagina: 407 },
    { chave: "percepcao", nome: "Percepção", parada: [["raciocinio", "percepcao"], ["inteligencia", "percepcao"], ["determinacao", "percepcao"]], pagina: 407 },
    { chave: "pesquisa", nome: "Pesquisa", parada: [["inteligencia", "erudicao"]], pagina: 408 },
    { chave: "preparacao", nome: "Preparação", parada: [["inteligencia", "armasDeFogo"], ["inteligencia", "oficios"]], pagina: 408 },
    { chave: "rastreamento", nome: "Rastreamento", parada: [["raciocinio", "sobrevivencia"]], pagina: 408 },
    { chave: "hackear", nome: "Usar computadores", parada: [["inteligencia", "tecnologia"]], pagina: 408 },
    { chave: "forca", nome: "Ações de força", parada: [["forca", "atletismo"]], pagina: 409 },
    { chave: "conducao", nome: "Condução", parada: [["destreza", "conducao"], ["raciocinio", "conducao"]], pagina: 409 },
    { chave: "escalada", nome: "Escalada", parada: [["destreza", "atletismo"]], pagina: 410 },
    { chave: "esgueirar", nome: "Esgueirar-se", parada: [["destreza", "furtividade"]], oposicao: [["raciocinio", "percepcao"]], pagina: 410 },
    { chave: "espreitamento", nome: "Espreitamento", parada: [["raciocinio", "furtividade"]], oposicao: [["raciocinio", "percepcao"]], pagina: 410 },
    { chave: "invasao", nome: "Invasão", parada: [["destreza", "ladroagem"], ["inteligencia", "ladroagem"], ["forca", "ladroagem"]], pagina: 410 },
    { chave: "natacao", nome: "Natação", parada: [["vigor", "atletismo"]], pagina: 411 },
    { chave: "perseguicao", nome: "Perseguição", parada: [["destreza", "atletismo"], ["vigor", "atletismo"], ["raciocinio", "conducao"]], pagina: 411 },
    { chave: "prestidigitacao", nome: "Prestidigitação", parada: [["destreza", "ladroagem"]], oposicao: [["raciocinio", "percepcao"]], pagina: 411 },
    { chave: "credibilidade", nome: "Credibilidade", parada: [["manipulacao", "subterfugio"]], oposicao: [["raciocinio", "sagacidade"]], pagina: 412 },
    { chave: "farrear", nome: "Farrear", parada: [["carisma", "sagacidade"]], pagina: 412 },
    { chave: "interrogacao", nome: "Interrogação", parada: [["manipulacao", "sagacidade"], ["manipulacao", "intimidacao"]], oposicao: [["autocontrole", "determinacao"]], pagina: 412 },
    { chave: "intimidacaoCoercao", nome: "Intimidação (coerção sutil)", parada: [["manipulacao", "intimidacao"]], oposicao: [["autocontrole", "determinacao"]], pagina: 413 },
    { chave: "intimidacaoAmeaca", nome: "Intimidação (ameaça aberta)", parada: [["forca", "intimidacao"]], oposicao: [["autocontrole", "determinacao"], ["forca", "intimidacao"]], pagina: 413 },
    { chave: "labia", nome: "Lábia", parada: [["carisma", "subterfugio"]], oposicao: [["autocontrole", "sagacidade"]], pagina: 414 },
    { chave: "oratoria", nome: "Oratória", parada: [["carisma", "performance"]], pagina: 414 },
    { chave: "performance", nome: "Performance artística", parada: [["carisma", "performance"]], pagina: 414 },
    { chave: "seducao", nome: "Sedução", parada: [["carisma", "subterfugio"], ["carisma", "sagacidade"], ["autocontrole", "etiqueta"]], pagina: 414 },
  ];

  var ATITUDES_SOCIAIS = [
    { chave: "leal", nome: "Leal / Devotado", dificuldade: -1 }, { chave: "amistoso", nome: "Amistoso / Fraco", dificuldade: 0 },
    { chave: "indiferente", nome: "Indiferente", dificuldade: 1 }, { chave: "desconfiado", nome: "Desconfiado", dificuldade: 2 },
    { chave: "agressivo", nome: "Agressivo / Pouco amigável", dificuldade: 3 }, { chave: "hostil", nome: "Hostil / Violento", dificuldade: 5 },
  ];

  /* Fichas de Conhecimento (p. 382–406). Cada nível se compra à parte
     (Antecedente, 3 XP por ponto); `cla`: exclusiva desse clã; `uso`:
     "historia" | "sessao" | "cronica" — o limite de uso que a ficha
     marca. Nomes conferidos no original. */
  var FICHAS_DE_CONHECIMENTO = {
    bahari: { nome: "Os Bahari", pagina: 382, cla: "", niveis: [{ nivel: 1, nome: "Reputação Perigosa", uso: "historia", texto: "+2 dados em Intimidação contra adoradores de Caim que conheçam sua filiação." }, { nivel: 2, nome: "Escarificação Ritual", uso: "sessao", texto: "Causar em si 1 Agravado para recuperar 1 nível de dano à Força de Vontade." }, { nivel: 3, nome: "Sacrifício dos Filhos", uso: "", texto: "Ao diablerizar a própria cria, +3 dados em Humanidade + Potência para absorver Disciplinas." }, { nivel: 4, nome: "O Sangue do Útero", uso: "historia", texto: "Após beber sangue do útero, +2 pontos em Vigor ou Determinação até o amanhecer." }, { nivel: 5, nome: "Amaldiçoada Original", uso: "", texto: "A Perdição de Clã diminui; caminha na primeira e na última hora de sol; irradia perigo (Predador Manifesto)." }] },
    theoBell: { nome: "Theo Bell", pagina: 383, cla: "", niveis: [{ nivel: 1, nome: "Célula Rebelde", uso: "", texto: "Um bando de mortais rebeldes (Aliado de três pontos)." }, { nivel: 2, nome: "Anarch Verdadeiro", uso: "", texto: "Dois sucessos automáticos em investigar vampiros que desertaram para o Movimento Anarch." }, { nivel: 3, nome: "Informação de Contato", uso: "", texto: "Contatar Theo Bell; o Narrador determina os efeitos." }, { nivel: 4, nome: "Círculo de Bell", uso: "", texto: "Theo Bell equivale a um Mawla de cinco pontos, com os problemas dele." }, { nivel: 5, nome: "Neutralidade de Seita", uso: "", texto: "Cinco pontos entre Contatos, Refúgio, Mawla e Lacaios." }] },
    heresiaCainita: { nome: "Heresia Cainita", pagina: 384, cla: "", niveis: [{ nivel: 1, nome: "Que Ele tenha Compreensão", uso: "historia", texto: "Uma pista grátis sobre as ações ou planos da Heresia." }, { nivel: 2, nome: "Mão da Heresia", uso: "", texto: "Três pontos entre Aliados, Rebanho, Mawla ou Lacaios; Defeito Segredo Sombrio (Heresia) em alguns domínios." }, { nivel: 3, nome: "Contra-Inquisição", uso: "", texto: "Detecta Fé Verdadeira: Determinação + seu maior valor em Heresia Cainita." }, { nivel: 4, nome: "Celebrante Vermelho", uso: "historia", texto: "Ritual de Pentecostes Vermelho (Checagem de Sangue; pode despertar frenesi em Membros participantes)." }, { nivel: 5, nome: "O Nomeado na Profecia", uso: "historia", texto: "Vencer um conflito Social com uma explicação plausível." }] },
    carna: { nome: "Carna", pagina: 385, cla: "", niveis: [{ nivel: 1, nome: "Abraçar a Visão", uso: "", texto: "+1 dado em todos os testes de Força de Vontade na presença da subfacção." }, { nivel: 2, nome: "O Rastro Rebelde", uso: "", texto: "Teste de Força de Vontade (Dif = Potência do Vitae) para ignorar um Laço de Sangue." }, { nivel: 3, nome: "Rituais Heterodoxos", uso: "historia", texto: "Realizar um ritual conhecido sem gastar Sangue (crítico bestial: transtorno até o fim da história)." }, { nivel: 4, nome: "Laço Reimaginado", uso: "", texto: "Estender os efeitos do ritual de Carna a terceiros (Laço por intercurso)." }, { nivel: 5, nome: "Livro da Guerra dos Túmulos", uso: "", texto: "Sucesso automático em Ocultismo sobre a Gehenna; imune ao Laço enquanto o possuir." }] },
    sistemaCirculatorio: { nome: "O Sistema Circulatório", pagina: 386, cla: "", niveis: [{ nivel: 1, nome: "Acessar o Sistema", uso: "historia", texto: "Solicitar bolsas específicas do Sistema." }, { nivel: 2, nome: "Livrinho Preto", uso: "", texto: "+1 dado em Investigação, Alquimia, Medicina ou Ciência sobre safras; metade do tempo de pesquisa de fórmulas de 2 ou 3." }, { nivel: 3, nome: "Fazenda Remota", uso: "", texto: "Uma fazenda de bolsas (equivale a Rebanho de quatro pontos, uma bolsa por semana)." }, { nivel: 4, nome: "Trânsito Seguro", uso: "", texto: "Acesso a um furgão blindado de trânsito protegido." }, { nivel: 5, nome: "Sommelier de Sangue", uso: "historia", texto: "+2 dados para descobrir uma Ressonância; 3 pontos entre Contatos, Aliados ou Refúgio." }] },
    convencaoDeThorns: { nome: "Convenção de Thorns", pagina: 387, cla: "", niveis: [{ nivel: 1, nome: "Historiador de Thorns", uso: "historia", texto: "Pedir ao Narrador uma informação sobre a convenção." }, { nivel: 2, nome: "Mestre da Tradição", uso: "cronica", texto: "Aplicar leis marginais da convenção." }, { nivel: 3, nome: "Segredos da Convenção", uso: "historia", texto: "+1 dado em testes Sociais com quem esteve na convenção; perguntar o nome de quem precisa dos seus conhecimentos." }, { nivel: 4, nome: "Candidato a Justicar", uso: "", texto: "Apoio para ser o próximo Justicar do seu clã." }, { nivel: 5, nome: "Novas Tradições", uso: "", texto: "Propor uma nova Tradição ao Círculo Interno; sua voz é ouvida." }] },
    primeiraInquisicao: { nome: "A Primeira Inquisição", pagina: 388, cla: "", niveis: [{ nivel: 1, nome: "Erros do Passado", uso: "historia", texto: "Uma informação sobre a Inquisição original." }, { nivel: 2, nome: "Os Nomes dos Culpados", uso: "historia", texto: "O nome de um descendente dos traidores." }, { nivel: 3, nome: "A Seita de Santiago", uso: "historia", texto: "Um Contato de quatro pontos entre os 'velhos inquisidores'." }, { nivel: 4, nome: "O Segundo Ato", uso: "", texto: "Um Contato dentro da Segunda Inquisição." }, { nivel: 5, nome: "Ponto Obscuro", uso: "historia", texto: "Um local que a Segunda Inquisição teme: escondido ali, os caçadores cancelam a busca." }] },
    golconda: { nome: "Golconda", pagina: 389, cla: "", niveis: [{ nivel: 1, nome: "Sementes da Golconda", uso: "historia", texto: "Perguntar se uma ação compromete a Golconda." }, { nivel: 2, nome: "O único Caminho Verdadeiro", uso: "historia", texto: "+3 dados em testes Sociais sobre a natureza da Golconda." }, { nivel: 3, nome: "Discípulo de Saulot", uso: "", texto: "Sucumbir voluntariamente ao frenesi dá sucesso automático no próximo teste de frenesi." }, { nivel: 4, nome: "Satisfazer a Fome", uso: "sessao", texto: "Diminuir a Fome em 1 sem se alimentar (não abaixo de 1)." }, { nivel: 5, nome: "Saudar o Sol", uso: "historia", texto: "Enfrentar a luz do sol direta sem dano; na noite seguinte desperta em frenesi de Fome." }] },
    hardestadt: { nome: "Descendente de Hardestadt", pagina: 390, cla: "ventrue", niveis: [{ nivel: 1, nome: "A Voz de Hardestadt", uso: "", texto: "Ser ouvido acima de qualquer barulho." }, { nivel: 2, nome: "Líder Supremo", uso: "historia", texto: "Ordenar a partir da retaguarda sem penalidade." }, { nivel: 3, nome: "Esteio Ventrue", uso: "", texto: "Sempre três pontos de Status com os Ventrue." }, { nivel: 4, nome: "Linha Direta com os Fundadores", uso: "cronica", texto: "Ligar ou marcar reunião com um fundador da Camarilla." }, { nivel: 5, nome: "Herdeiro de Hardestadt", uso: "", texto: "Um documento que o nomeia sucessor." }] },
    helena: { nome: "Descendente de Helena", pagina: 391, cla: "toreador", niveis: [{ nivel: 1, nome: "À Flor da Pele", uso: "historia", texto: "+1 Status ao mencionar Helena." }, { nivel: 2, nome: "Talento Inato", uso: "", texto: "Uma Habilidade entre Ofícios, Etiqueta ou Performance custa metade da XP (arred. para baixo)." }, { nivel: 3, nome: "Abrace o Estereótipo", uso: "historia", texto: "Uma festa lendária: +2 em Status e/ou Influência com os convidados." }, { nivel: 4, nome: "Pureza Divina", uso: "", texto: "+2 dados para evitar a culpa por suas ações." }, { nivel: 5, nome: "Franquia do Succubus Club", uso: "", texto: "Chasse do Domínio +2 enquanto o clube estiver aberto; 4 pontos entre Recursos, Fama e Status." }] },
    veteranoGuerraDasSeitas: { nome: "Veterano da Guerra das Seitas", pagina: 392, cla: "", niveis: [{ nivel: 1, nome: "Sobrevivente", uso: "historia", texto: "Uma informação sobre a guerra no domínio." }, { nivel: 2, nome: "Participante Ativo", uso: "", texto: "Três pontos em Status ou Mawla." }, { nivel: 3, nome: "Troféu", uso: "historia", texto: "Usar a lenda para evitar uma disputa." }, { nivel: 4, nome: "Terra de nenhum Vampiro", uso: "", texto: "+2 no Portillon do Domínio; +2 dados em Manha, Ladroagem e Furtividade em dois domínios vizinhos." }, { nivel: 5, nome: "Agitador de Seita", uso: "", texto: "+2 dados em testes Sociais para inflamar a tensão entre as seitas." }] },
    trindade: { nome: "A Trindade", pagina: 393, cla: "", niveis: [{ nivel: 1, nome: "Constantinopla", uso: "historia", texto: "Uma pergunta sobre o passado de Constantinopla." }, { nivel: 2, nome: "A Arquitetura de Antonius", uso: "historia", texto: "+2 dados em Política ao governar; mediar e acalmar um debate." }, { nivel: 3, nome: "O Sonho", uso: "historia", texto: "+1 dado em Sagacidade para sondar a Besta; gastar 1 FdV para outro vampiro rerrolar até 3 dados contra frenesi." }, { nivel: 4, nome: "O Dracon", uso: "", texto: "Um discípulo do Dracon: Mawla de cinco pontos." }, { nivel: 5, nome: "A Nova Trindade", uso: "historia", texto: "Remover até cinco Máculas antes do Remorso." }] },
    voerman: { nome: "Jeanette/Therese Voerman", pagina: 394, cla: "", niveis: [{ nivel: 1, nome: "Membro do Asylum", uso: "sessao", texto: "Caçar no Asylum uma ou duas vezes por sessão (Dificuldade 2)." }, { nivel: 2, nome: "Pau Mandado", uso: "", texto: "Recurso confiável das irmãs (missões e favores)." }, { nivel: 3, nome: "O Queridinho da Jeanette", uso: "", texto: "Mawla de quatro pontos (Malkavianos e Anarchs)." }, { nivel: 4, nome: "O Queridinho da Therese", uso: "", texto: "Mawla de três pontos." }, { nivel: 5, nome: "Gerente do Asylum", uso: "", texto: "Quatro pontos entre Refúgio, Rebanho, Recursos ou o Chasse do Domínio." }] },
    semanaDosPesadelos: { nome: "A Semana dos Pesadelos", pagina: 395, cla: "", niveis: [{ nivel: 1, nome: "História Oral", uso: "", texto: "+3 dados em Performance para contar a história." }, { nivel: 2, nome: "Ravnos Remanescentes", uso: "cronica", texto: "Três pontos de Mawla (contatos Ravnos)." }, { nivel: 3, nome: "Eu estive Lá", uso: "historia", texto: "Status entre historiadores e ocultistas; um favor menor." }, { nivel: 4, nome: "A Estrela Vermelha", uso: "historia", texto: "Reduzir a Fome em 2 ou +1 dado numa Disciplina por uma noite após encarar a estrela 10 minutos." }, { nivel: 5, nome: "Sangue de Zapathasura", uso: "", texto: "Um frasco do Sangue do Antediluviano Ravnos." }] },
    rudi: { nome: "Rudi", pagina: 396, cla: "", niveis: [{ nivel: 1, nome: "Novos Direitos", uso: "historia", texto: "Rerrolar uma parada de Habilidade ao combater ou denunciar a classe dominante." }, { nivel: 2, nome: "Eles e Deles", uso: "", texto: "Quando um Pilar de outro membro da coterie é ameaçado, você fica atento e pronto." }, { nivel: 3, nome: "Advogado Gangrel", uso: "", texto: "+1 dado em testes Sociais com os Gangrel do domínio." }, { nivel: 4, nome: "O Bando do Urso", uso: "historia", texto: "Mawla grupal de três pontos; um sucesso automático ao inflamar Anarchs e mortais." }, { nivel: 5, nome: "O Exército de Rudi", uso: "", texto: "Seis pontos entre Aliados, Influência e Contatos." }] },
    tyler: { nome: "Descendente de Tyler", pagina: 397, cla: "brujah", niveis: [{ nivel: 1, nome: "Instigador", uso: "historia", texto: "+2 dados para persuadir uma multidão de mortais a agir com violência." }, { nivel: 2, nome: "Campeão da Causa", uso: "", texto: "+2 dados em Status com quem quer liderança numa rebelião." }, { nivel: 3, nome: "A Piedade de Tyler", uso: "historia", texto: "Ao entrar em frenesi, assumir uma Compulsão Brujah para cessar imediatamente o surto." }, { nivel: 4, nome: "Os Furores", uso: "cronica", texto: "Os Furores o armam e dão santuário; Aliados de cinco pontos de Efetividade." }, { nivel: 5, nome: "Revolução Permanente", uso: "", texto: "Os Anarchs Brujah o obedecem ao pé da letra." }] },
    zelios: { nome: "Descendente de Zelios", pagina: 398, cla: "nosferatu", niveis: [{ nivel: 1, nome: "Santuário", uso: "", texto: "Dois pontos entre as Qualidades de Refúgio Poterna e Sistema de Segurança." }, { nivel: 2, nome: "Sabotador", uso: "", texto: "Encontra a fraqueza de uma construção e a destrói sem explosivos." }, { nivel: 3, nome: "Em Comissão", uso: "", texto: "Um favor menor por construir refúgios." }, { nivel: 4, nome: "O Labirinto", uso: "", texto: "Um labirinto subterrâneo que serve de Refúgio." }, { nivel: 5, nome: "Sentir as Linhas Ley", uso: "", texto: "Onde as linhas convergem, a Checagem de Sangue do despertar rola dois dados (fica o melhor)." }] },
    vasantasena: { nome: "Descendente de Vasantasena", pagina: 399, cla: "malkaviano", niveis: [{ nivel: 1, nome: "Agente do Caos", uso: "sessao", texto: "Rerrolar um único dado sem gastar Força de Vontade em situações turbulentas." }, { nivel: 2, nome: "Ouça minhas Palavras", uso: "historia", texto: "Quem para para escutar pode rerrolar uma parada num teste futuro." }, { nivel: 3, nome: "Odor do Laço", uso: "historia", texto: "Determinação + Percepção (Dif 4) para farejar o Laço." }, { nivel: 4, nome: "Destruir o Laço", uso: "historia", texto: "Remover o Laço de uma vítima bebendo o Vitae dela (e entrando em frenesi)." }, { nivel: 5, nome: "O Sabá se torna a Camarilla", uso: "historia", texto: "Desprogramar as crenças da seita: teste estendido de Inteligência ou Carisma + Sagacidade." }] },
    altoCla: { nome: "Alto-Clã", pagina: 400, cla: "", niveis: [{ nivel: 1, nome: "Pavão", uso: "sessao", texto: "Rerrolar um único dado ao ordenar a um vampiro sem título que o trate com deferência." }, { nivel: 2, nome: "Controle de Massas", uso: "", texto: "Séquito de Baixos-Clãs (Mawla de três pontos); +3 dados em Intimidação ou Liderança contra eles." }, { nivel: 3, nome: "Erguer o Baixo", uso: "cronica", texto: "Proclamar a ascendência de um Baixo-Clã; +1 dado em testes Sociais contra Baixos-Clãs." }, { nivel: 4, nome: "Abraçar para Governar", uso: "", texto: "+1 dado em Liderança com vampiros Alto-Clã que conheçam sua linhagem." }, { nivel: 5, nome: "Abençoado, não Amaldiçoado", uso: "sessao", texto: "Gastar 1 FdV para ignorar os fardos da Perdição de Clã." }] },
    baixoCla: { nome: "Baixo-Clã", pagina: 401, cla: "", niveis: [{ nivel: 1, nome: "Casca-Grossa", uso: "historia", texto: "Ignorar farpas verbais por uma cena sem teste." }, { nivel: 2, nome: "Amaldiçoado com Orgulho", uso: "historia", texto: "Um sucesso automático ao incorporar a Perdição numa ação." }, { nivel: 3, nome: "Parentesco Misterioso", uso: "", texto: "Três pontos entre Mawla ou Status com os Baixos-Clãs." }, { nivel: 4, nome: "Comércio entre Iguais", uso: "", texto: "Uma Disciplina de um Baixo-Clã custa XP como Disciplina do clã." }, { nivel: 5, nome: "Incidente Crítico", uso: "cronica", texto: "+1 dado em Projetos contra Altos-Clãs; sacrificar até 10 pontos de Antecedentes para derrubar Membros Alto-Clã." }] },
    ambrusMaropis: { nome: "Ambrus Maropis", pagina: 402, cla: "", niveis: [{ nivel: 1, nome: "Crente Sincero", uso: "", texto: "+1 dado para encontrar os melhores esconderijos compartilhados." }, { nivel: 2, nome: "Informação Clandestina", uso: "historia", texto: "Uma informação armazenada online sobre a maioria dos mortais." }, { nivel: 3, nome: "Ensinado pelos Melhores", uso: "", texto: "Ambrus como Mawla de três pontos." }, { nivel: 4, nome: "Backdoor Panóptico", uso: "historia", texto: "Dois sucessos automáticos em investigar atividades online ou celulares." }, { nivel: 5, nome: "Totalmente em outra Rede", uso: "", texto: "Identidades falsas (Máscara 2 e Zerado); +3 dados contra quem tenta encontrá-lo online." }] },
    carmelitaNeillson: { nome: "Carmelita Neillson", pagina: 403, cla: "", niveis: [{ nivel: 1, nome: "A Arte da Narrativa", uso: "", texto: "Os Toreador são atraídos pelas suas histórias." }, { nivel: 2, nome: "A Arte da Vontade", uso: "sessao", texto: "Meditar uma hora (Determinação + Erudição, Dif 5) e despertar com 1 FdV extra." }, { nivel: 3, nome: "Biblioteca Neillson", uso: "", texto: "Curador de uma biblioteca (Refúgio 2 com Biblioteca 2)." }, { nivel: 4, nome: "Entrevista com o Matusalém", uso: "historia", texto: "O Narrador conta um segredo da gravação." }, { nivel: 5, nome: "A Tumba do Ancestral", uso: "historia", texto: "Guardar o local de descanso de um ancestral: um favor maior." }] },
    fiorenzaSavona: { nome: "Fiorenza Savona", pagina: 404, cla: "", niveis: [{ nivel: 1, nome: "Na Lista de Fiorenza", uso: "", texto: "Um Lacaio mortal Talentoso." }, { nivel: 2, nome: "Café da Manhã com Fiorenza", uso: "historia", texto: "Um encontro com Fiorenza." }, { nivel: 3, nome: "Benefícios da Amizade", uso: "", texto: "Mawla de três pontos." }, { nivel: 4, nome: "A Diretoria", uso: "", texto: "Seis pontos entre Contatos, Mawla e Recursos (com Laço e memórias apagadas)." }, { nivel: 5, nome: "Influência no Governo", uso: "cronica", texto: "Cinco dados a distribuir em rolagens de ação governamental." }] },
    karlSchrekt: { nome: "Descendente de Karl Schrekt", pagina: 405, cla: "tremere", niveis: [{ nivel: 1, nome: "Não Esqueça a Casa", uso: "historia", texto: "Uma informação sobre a Casa Tremere." }, { nivel: 2, nome: "Linha Dura", uso: "", texto: "+2 dados para resistir a desviá-lo dos objetivos de Schrekt." }, { nivel: 3, nome: "Rituais Preparados", uso: "historia", texto: "Realizar um ritual conhecido em cinco minutos, sem preparação." }, { nivel: 4, nome: "Perdição dos Arcontes", uso: "", texto: "Um Aliado sobrenatural de quatro pontos." }, { nivel: 5, nome: "Conheça o Mundo", uso: "historia", texto: "Biblioteca de Refúgio de três pontos; uma pergunta simples sobre criaturas." }] },
    xaviar: { nome: "Descendente de Xaviar", pagina: 406, cla: "gangrel", niveis: [{ nivel: 1, nome: "Ancestral Martirizado", uso: "", texto: "Refúgio com outros Gangrel; dois pontos de Status." }, { nivel: 2, nome: "Onde os Corpos são Enterrados", uso: "", texto: "Determinação + Percepção para detectar quem se fundiu com a terra ou jaz em Torpor." }, { nivel: 3, nome: "Sabujo Leal", uso: "", texto: "Quatro pontos entre Domínio, Rebanho e Status." }, { nivel: 4, nome: "Morcego Monstruoso", uso: "historia", texto: "Forma de morcego humano: +1 em Atributos Físicos, plana; mordida +1 Agravado." }, { nivel: 5, nome: "Experiência com o Antediluviano", uso: "historia", texto: "Sentir a localização de um Gangrel e drenar um gole de Vitae (Fome dele até 2)." }] },
  };

  /* Prestação (p. 314–315). */
  var FAVORES = {
    trivial: { nome: "Trivial", texto: "Nenhum risco ou custo significativo." },
    menor: { nome: "Menor", texto: "Algum esforço ou risco; num teste Social contra o devedor, equivale a uma vitória automática." },
    maior: { nome: "Maior", texto: "Altera o andamento dos assuntos de um domínio." },
    vital: { nome: "Vital", texto: "O mais raro: uma vida (ou não vida) devida." },
  };

  /* Fé Verdadeira (p. 222). */
  var FE_VERDADEIRA = "Determinação + Fé contra a Força de Vontade do vampiro; cada sucesso afasta um passo; tocar causa 1 Agravado por sucesso.";

  /* Sangue contaminado (p. 310). */
  var DROGAS = {
    alcool: { nome: "Álcool", penalidades: { destreza: 1, inteligencia: 1 } },
    estimulante: { nome: "Cocaína / Metanfetamina / Speed", frenesi: 1, rerrolarBestial: true },
    alucinogeno: { nome: "Alucinógenos", penalidades: { raciocinio: 2, determinacao: 2, manipulacao: 2 } },
    opiaceo: { nome: "Heroína / Morfina / Opiáceos", penalidades: { fisico: 2 }, frenesi: -1 },
    marijuana: { nome: "Marijuana", penalidades: { raciocinio: 1 }, frenesi: -1 },
    veneno: { nome: "Veneno", penalidades: { todas: 1 }, danoSuperficial: [1, 3] },
  };

  global.RAMAVampiroCatalogo = {
    paginaDoPdf: paginaDoPdf,
    ATRIBUTOS: ATRIBUTOS, CATEGORIAS: CATEGORIAS, HABILIDADES: HABILIDADES,
    DISTRIBUICAO_DE_ATRIBUTOS: DISTRIBUICAO_DE_ATRIBUTOS, DISTRIBUICOES_DE_HABILIDADES: DISTRIBUICOES_DE_HABILIDADES,
    DIFICULDADES: DIFICULDADES, CUSTOS_XP: CUSTOS_XP, IDADES: IDADES, GERACOES: GERACOES, POTENCIA: POTENCIA,
    HUMANIDADE: HUMANIDADE, MACULAS_DE_PILAR: MACULAS_DE_PILAR, CLAS: CLAS,
    COMPULSOES: COMPULSOES, compulsaoDaTabela: compulsaoDaTabela, FRENESI: FRENESI,
    FONTES_DE_SANGUE: FONTES_DE_SANGUE, TERRITORIOS_DE_CACA: TERRITORIOS_DE_CACA, MODIFICADORES_DE_CACA: MODIFICADORES_DE_CACA,
    RESSONANCIAS: RESSONANCIAS, TEMPERAMENTOS: TEMPERAMENTOS, ressonanciaDaTabela: ressonanciaDaTabela, DISCRASIAS: DISCRASIAS,
    PREDADORES: PREDADORES, VANTAGENS: VANTAGENS, GRUPOS_DE_DEFEITO: GRUPOS_DE_DEFEITO, SANGUE_RALO: SANGUE_RALO, MODELOS_MORTAIS: MODELOS_MORTAIS,
    DOMINIO: DOMINIO, dificuldadeDeCacaDoChasse: dificuldadeDeCacaDoChasse, COTERIES: COTERIES,
    ARMAS: ARMAS, ARMADURAS: ARMADURAS, COBERTURA: COBERTURA, AUDIENCIA_SOCIAL: AUDIENCIA_SOCIAL, FERIMENTOS: FERIMENTOS, ROLAGEM_UNICA: ROLAGEM_UNICA,
    FICHAS_DE_CONHECIMENTO: FICHAS_DE_CONHECIMENTO,
    ACOES_PADRAO: ACOES_PADRAO, ATITUDES_SOCIAIS: ATITUDES_SOCIAIS, FAVORES: FAVORES, FE_VERDADEIRA: FE_VERDADEIRA, DROGAS: DROGAS,
    atributo: function (k) { return ATRIBUTOS.filter(function (a) { return a.chave === k; })[0] || null; },
    habilidade: function (k) { return HABILIDADES.filter(function (h) { return h.chave === k; })[0] || null; },
    potencia: function (v) { return POTENCIA[Math.max(0, Math.min(10, Math.floor(Number(v) || 0)))]; },
  };
})(typeof window !== "undefined" ? window : globalThis);
