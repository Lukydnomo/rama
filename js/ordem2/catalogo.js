/* =====================================================================
   R.A.M.A. — Ordem Paranormal RPG II (Experimental) · catálogo (v9.0)
   ---------------------------------------------------------------------
   Os dados dos dois playtests, com a fonte de cada um:

     Alpha  "Ordem Paranormal RPG 2 — Playtest Alpha" (pp. 14–26) e as
            fichas do Ato II (ZIP de extras do Alpha)
     Beta   "Ordem 2 — Playtest Beta, Missões 1 e 2" (pp. 2, 6–25) e as
            fichas dos ZIPs de extras do Beta (Missão 1 e Missão 2)

   Nada aqui é texto do livro: são números, nomes e resumos próprios das
   regras, com a página. Onde as fontes divergem, DIVERGENCIAS diz qual
   comportamento o R.A.M.A. adota e qual teste o fixa (docs/ORDEM2.md).

   Ordem II é um sistema À PARTE do `ordem` (Ordem Paranormal, 1ª
   edição): nada de categoria, crédito, PE, SAN ou crítico de Ordem I.

   Copiado para backend/Ordem2.gs (testes/gerar-ordem2-gs.js).
   ===================================================================== */

(function (global) {
  "use strict";

  /* A versão destes DADOS (presets, catálogos). Uma ficha copiada de um
     preset guarda a versão de então; quando os dados mudarem, a ficha
     NÃO é atualizada sozinha — a tela só avisa. */
  var VERSAO_DADOS = 1;

  var FONTES = {
    alpha: { nome: "Playtest Alpha", curto: "Alpha" },
    alphaAto2: { nome: "Playtest Alpha — fichas do Ato II", curto: "Alpha Ato II" },
    beta: { nome: "Playtest Beta — Missões 1 e 2", curto: "Beta" },
    betaFichas: { nome: "Playtest Beta — fichas de personagens", curto: "Beta (fichas)" },
  };
  function referencia(fonte, pagina) {
    var f = FONTES[fonte] || { curto: fonte };
    return f.curto + (pagina ? " p. " + pagina : "");
  }

  /* ---------------------------------------------------------------
     PERFIS DE REGRAS E AMBIENTAÇÃO
     --------------------------------------------------------------- */
  var PERFIS_REGRAS = {
    "alpha-contemporaneo": {
      id: "alpha-contemporaneo", nome: "Alpha · Contemporâneo", curto: "Alpha",
      fonte: "alpha", ambientacao: "contemporaneo", termoOcupacao: "Ocupação",
      combate: "simplificado", /* Alpha p. 26: só o conflito simplificado */
      texto: "Investigação do Playtest Alpha (pp. 14–26), perícias da p. 17, ocupação, e o conflito simplificado da p. 26.",
    },
    "beta-vigilia": {
      id: "beta-vigilia", nome: "Beta · Vigília", curto: "Beta",
      fonte: "beta", ambientacao: "vigilia", termoOcupacao: "Vocação",
      combate: "fases", /* Beta p. 18: três fases */
      texto: "Ação do Playtest Beta (pp. 6–25), perícias da p. 9, vocação, combate em fases, lesões e traumas, pavor e relações.",
    },
  };
  var ORDEM_PERFIS_REGRAS = ["alpha-contemporaneo", "beta-vigilia"];
  var AMBIENTACOES = {
    contemporaneo: { nome: "Contemporâneo (Ordo Realitas)", rotuloOcultismo: "Ocultismo" },
    vigilia: { nome: "Vigília (Idade Média)", rotuloOcultismo: "Bruxaria" },
  };

  /* ---------------------------------------------------------------
     ATRIBUTOS E DEGRAUS (Alpha p. 16; Beta p. 8)
     --------------------------------------------------------------- */
  var ATRIBUTOS = {
    fisico: { nome: "Físico", curto: "FÍS" },
    mente: { nome: "Mente", curto: "MEN" },
    emocao: { nome: "Emoção", curto: "EMO" },
  };
  var ORDEM_ATRIBUTOS = ["fisico", "mente", "emocao"];
  /* d20 só quando um efeito autoriza (Alpha p. 20; Beta p. 12). */
  var DEGRAUS = [4, 6, 8, 10, 12];
  var ESCALA_ATRIBUTO = { 4: "Abaixo da média", 6: "Média humana", 8: "Acima da média", 10: "Muito acima da média", 12: "Ápice humano", 20: "Sobre-humano (paranormal)" };
  var ESCALA_PERICIA = { 4: "Destreinado", 6: "Treinado", 8: "Especialista", 10: "Mestre", 12: "Grão-mestre", 20: "Sobre-humano (paranormal)" };

  /* ---------------------------------------------------------------
     PERÍCIAS — duas listas (Alpha p. 17; Beta p. 9)
     `ocultismo` é UMA chave: o rótulo segue a ambientação (Ocultismo /
     Bruxaria). `metalurgia` aceita "Ofício" como alias. Pesquisar
     (Alpha) e Inspecionar (Beta) são a mesma função em perfis
     diferentes: cada perfil tem a sua, nunca as duas.
     --------------------------------------------------------------- */
  var PERICIAS_ALPHA = [
    ["acrobacia", "Acrobacia", "fisico", "Ginástica, parkour, skate e patins."],
    ["aptidao", "Aptidão", "mente", "Conhecimento em um campo específico (especialização)."],
    ["atletismo", "Atletismo", "fisico", "Correr, saltar, escalar, nadar, remar."],
    ["crime", "Crime", "fisico", "Furtar, abrir fechaduras, falsificar documentos."],
    ["disciplina", "Disciplina", "emocao", "Estudar, meditar, resistir a traumas e sustos."],
    ["enganacao", "Enganação", "emocao", "Mentir, disfarçar-se, seduzir."],
    ["furtividade", "Furtividade", "fisico", "Esconder-se, andar sem ser visto ou ouvido."],
    ["intimidar", "Intimidar", "emocao", "Assustar e coagir pessoas."],
    ["intuicao", "Intuição", "emocao", "\"Sexto sentido\" sobre pessoas e ambientes."],
    ["luta", "Luta", "fisico", "Atacar desarmado ou com armas corpo a corpo."],
    ["maquinas", "Máquinas", "mente", "Operar e consertar máquinas, dirigir veículos."],
    ["medicina", "Medicina", "mente", "Primeiros socorros, tratamentos, necropsias."],
    ["ocultismo", "Ocultismo", "mente", "Conhecimento sobre o paranormal."],
    ["percepcao", "Percepção", "mente", "Notar coisas pelos sentidos, revistar lugares."],
    ["persuasao", "Persuasão", "emocao", "Convencer com argumentos e lábia."],
    ["pesquisar", "Pesquisar", "mente", "Pesquisar documentos e bancos de dados, analisar evidências."],
    ["pontaria", "Pontaria", "fisico", "Atacar com armas de arremesso ou de disparo."],
    ["sobrevivencia", "Sobrevivência", "mente", "Acampar, rastrear, acalmar animais ferozes."],
    ["tecnologia", "Tecnologia", "mente", "Operar dispositivos, hackear redes."],
    ["vigor", "Vigor", "fisico", "Fôlego, venenos, suportar ferimentos."],
  ];
  var PERICIAS_BETA = [
    ["acrobacia", "Acrobacia", "fisico", "Ginástica, parkour, equilíbrio."],
    ["animais", "Animais", "emocao", "Manejar animais, acalmar feras, cavalgar."],
    ["aptidao", "Aptidão", "mente", "Conhecimento em um campo específico (especialização)."],
    ["atletismo", "Atletismo", "fisico", "Correr, saltar, escalar, nadar, remar."],
    ["ocultismo", "Bruxaria", "mente", "Conhecimento sobre o paranormal."],
    ["crime", "Crime", "fisico", "Furtar, abrir fechaduras, falsificar documentos."],
    ["disciplina", "Disciplina", "emocao", "Estudar, meditar, resistir a traumas e sustos."],
    ["enganacao", "Enganação", "emocao", "Mentir, disfarçar-se, seduzir."],
    ["furtividade", "Furtividade", "fisico", "Esconder-se, andar sem ser visto ou ouvido."],
    ["intimidar", "Intimidar", "emocao", "Assustar e coagir pessoas."],
    ["intuicao", "Intuição", "emocao", "\"Sexto sentido\" sobre pessoas e ambientes."],
    ["inspecionar", "Inspecionar", "mente", "Examinar documentos e analisar evidências."],
    ["luta", "Luta", "fisico", "Atacar desarmado ou com armas corpo a corpo."],
    ["medicina", "Medicina", "mente", "Primeiros socorros, tratamentos."],
    ["metalurgia", "Metalurgia", "mente", "Fabricar e consertar itens. Nas fichas: \"Ofício\"."],
    ["percepcao", "Percepção", "mente", "Notar coisas pelos sentidos, revistar lugares."],
    ["persuasao", "Persuasão", "emocao", "Convencer com argumentos e lábia."],
    ["pontaria", "Pontaria", "fisico", "Atacar com armas de arremesso ou de disparo."],
    ["sobrevivencia", "Sobrevivência", "mente", "Acampar, rastrear, acalmar animais ferozes."],
    ["vigor", "Vigor", "fisico", "Fôlego, venenos, suportar ferimentos."],
  ];
  var ESPECIALIZACOES = {
    "alpha-contemporaneo": ["Artes", "Atualidades", "Burocracia", "Exatas", "Humanas", "Tática"],
    "beta-vigilia": ["Artes", "Erudição", "Folclore", "Guerra", "Nobreza", "Religião"],
  };
  /* Rótulos de ficha que apontam para uma chave da lista (Beta: as
     fichas impressas usam "Ofício" para Metalurgia e "Ocultismo" para
     Bruxaria). */
  var ALIASES = { oficio: "metalurgia", "ofício": "metalurgia", bruxaria: "ocultismo" };

  function listaDePericias(perfil) {
    var l = perfil === "beta-vigilia" ? PERICIAS_BETA : PERICIAS_ALPHA;
    return l.map(function (p) { return { chave: p[0], nome: p[1], atributo: p[2], texto: p[3] }; });
  }
  function pericia(perfil, chave) {
    var c = ALIASES[chave] || chave;
    return listaDePericias(perfil).filter(function (p) { return p.chave === c; })[0] || null;
  }
  /* O nome que a tela mostra: Ocultismo/Bruxaria pela ambientação. */
  function nomeDaPericia(perfil, chave, ambientacao) {
    if (chave === "ocultismo") {
      var amb = AMBIENTACOES[ambientacao] || AMBIENTACOES[(PERFIS_REGRAS[perfil] || {}).ambientacao] || AMBIENTACOES.contemporaneo;
      return amb.rotuloOcultismo;
    }
    var p = pericia(perfil, chave);
    if (p) return p.nome;
    var outra = pericia(perfil === "beta-vigilia" ? "alpha-contemporaneo" : "beta-vigilia", chave);
    return outra ? outra.nome : chave;
  }
  /* A perícia de "pesquisa" do perfil (Compartilhar, ver DIVERGENCIAS). */
  function periciaDePesquisa(perfil) { return perfil === "beta-vigilia" ? "inspecionar" : "pesquisar"; }

  /* ---------------------------------------------------------------
     PERFIS (Alpha p. 14; Beta p. 6)
     --------------------------------------------------------------- */
  var PERFIS = {
    executor: { nome: "Executor", texto: "Age primeiro e insiste até conseguir." },
    analista: { nome: "Analista", texto: "Observa, entende e se prepara antes de agir." },
    vigilante: { nome: "Vigilante", texto: "Atento aos arredores; age primeiro e decide sob pressão." },
  };
  var ORDEM_PERFIS = ["executor", "analista", "vigilante"];

  /* A habilidade de perfil que cada perfil de regras DOCUMENTA para uma
     ficha nova. Beta: as fichas prontas trazem o mesmo texto por perfil
     (fato). Alpha: as fichas do Ato II são de nível 6; para Executor o
     R.A.M.A. usa a versão de 3 espaços (Alan, nível 2, e Raven) —
     inferência registrada em DIVERGENCIAS. */
  var HABILIDADE_DE_PERFIL = {
    "alpha-contemporaneo": { executor: "impeto_alpha3", analista: "avaliacao_alpha", vigilante: "prontidao_alpha" },
    "beta-vigilia": { executor: "impeto_beta", analista: "analise_beta", vigilante: "prontidao_beta" },
  };

  /* ---------------------------------------------------------------
     HABILIDADES
     `motor` diz ao motor (js/ordem2/motor.js) o que automatizar; o resto
     é confirmação narrativa. janela: acao | antes | depois | passiva |
     reacao | inicioCombate | inicioCena. limite: rodada | cena |
     cenaConflito | missao | porAlvoCena.
     --------------------------------------------------------------- */
  var HABILIDADES = {
    impeto_alpha3: { nome: "Ímpeto", versao: "alpha", fonte: "alpha", pagina: 15, perfil: "executor",
      texto: "Barra com 3 espaços; cada teste falho preenche 1. Gaste 1 espaço para +d4 num teste ou 3 para aumentar um atributo em um passo até o fim da cena.",
      motor: { tipo: "impeto", espacos: 3, zeraFimCena: false, opcoes: [{ custo: 1, efeito: "dado", faces: 4 }, { custo: 3, efeito: "passoAtributo" }] } },
    impeto_alpha5: { nome: "Ímpeto", versao: "alpha", fonte: "alphaAto2", pagina: null, perfil: "executor", ficha: "Heitor",
      texto: "Barra com 5 espaços; cada teste falho preenche 1. Gaste 1 para +d4, 2 para +d10, 3 para aumentar um atributo até o fim da cena ou 5 para uma ação extra na rodada.",
      motor: { tipo: "impeto", espacos: 5, zeraFimCena: false, opcoes: [{ custo: 1, efeito: "dado", faces: 4 }, { custo: 2, efeito: "dado", faces: 10 }, { custo: 3, efeito: "passoAtributo" }, { custo: 5, efeito: "acaoExtra" }] } },
    impeto_beta: { nome: "Ímpeto", versao: "beta", fonte: "betaFichas", pagina: null, perfil: "executor",
      texto: "Barra com 5 espaços; cada teste falho preenche 1. Ação livre: 1 espaço dá +d4 num teste; 3 aumentam um atributo até o fim da cena; 3 dão uma ação extra em cena de conflito. Esvazia no fim da cena.",
      motor: { tipo: "impeto", espacos: 5, zeraFimCena: true, opcoes: [{ custo: 1, efeito: "dado", faces: 4 }, { custo: 3, efeito: "passoAtributo" }, { custo: 3, efeito: "acaoExtra", soConflito: true }] } },
    impeto_fervilhante: { nome: "Ímpeto Fervilhante", versao: "beta", fonte: "betaFichas", ficha: "Malik",
      texto: "No início de cada cena, preenche 1 espaço da barra de ímpeto.", motor: { tipo: "impetoInicioCena", espacos: 1 } },
    analise_beta: { nome: "Análise", versao: "beta", fonte: "beta", pagina: 7, perfil: "analista",
      texto: "Uma ação dá 2 marcadores (máximo 4). Depois de rolar, cada marcador muda um dado em +1 ou −1, dentro das faces dele. Os não usados somem no fim da cena.",
      motor: { tipo: "analise", ganho: 2, maximo: 4, zeraFimCena: true } },
    leitura_combate: { nome: "Leitura de Combate", versao: "beta", fonte: "beta", pagina: 7, ficha: "Rhiona",
      texto: "Em combate, gastar uma ação para se defender dá 1 marcador de análise.", motor: { tipo: "marcadorAoDefender", ganho: 1 } },
    segredo_do_aco: { nome: "Segredo do Aço", versao: "beta", fonte: "beta", pagina: 7, ficha: "Rhiona",
      texto: "Sabe usar equipamento marcial; um item vestido que dá pontos de armadura dá 1 ponto a mais.", motor: { tipo: "armaduraExtra", valor: 1 } },
    avaliacao_alpha: { nome: "Avaliação", versao: "alpha", fonte: "alphaAto2", perfil: "analista", ficha: "Amanda e Antônio",
      texto: "Uma ação e 2 PD para observar um ser ou ambiente: recebe 2 dados bônus d4 para testes relativos a ele (+2d4 num teste ou +d4 em dois). No máximo 2 dados por esta habilidade.",
      motor: { tipo: "avaliacao", pd: 2, dados: 2, faces: 4, maximo: 2 } },
    prontidao_alpha: { nome: "Prontidão", versao: "alpha", fonte: "alphaAto2", perfil: "vigilante", ficha: "Val",
      texto: "No início de qualquer conflito, gaste 3 PD para ganhar uma rodada em que age antes dos demais personagens e NPCs.",
      motor: { tipo: "rodadaAntecipada", pd: 3 } },
    prontidao_beta: { nome: "Prontidão", versao: "beta", fonte: "betaFichas", perfil: "vigilante",
      texto: "Uma vez por rodada, quando você ou outro ser em alcance curto faz um teste, gaste 2 PD para rolar de novo um dado que não deu 1. Em combate, pode agir na fase da ação ou em fases posteriores, e depois das rolagens daquela fase.",
      motor: { tipo: "prontidao", pd: 2, limite: "rodada", atrasar: true } },
    antecipacao_tatica: { nome: "Antecipação Tática", versao: "beta", fonte: "betaFichas", ficha: "Sira",
      texto: "No início de qualquer combate, gaste 2 PD para ganhar uma rodada em que age antes dos demais.", motor: { tipo: "rodadaAntecipada", pd: 2 } },
    foco_mental: { nome: "Foco Mental", versao: "alpha", fonte: "alpha", pagina: 15,
      texto: "Num teste mental (com o atributo Mente), gaste PD para receber um dado bônus. O custo e o dado dependem da ficha.",
      motor: { tipo: "dadoPorPd", atributo: "mente", pd: 2, faces: 4 } },
    olhar_infalivel: { nome: "Olhar Infalível", versao: "alpha", fonte: "alphaAto2", ficha: "Amanda",
      texto: "Num teste de examinar, gaste 2 PD para rolar de novo um dos dados.", motor: { tipo: "rerrolarExaminar", pd: 2 } },
    amor_descoberta: { nome: "Amor pela Descoberta", versao: "alpha", fonte: "alphaAto2", ficha: "Antônio",
      texto: "Quando examina um ponto de interesse e recebe informação nova, recupera 1 PD.", motor: { tipo: "pdAoDescobrir", pd: 1 } },
    mentoria: { nome: "Mentoria", versao: "ambas", fonte: "alphaAto2", ficha: "Antônio e Cavan",
      texto: "Ao ajudar, faça um teste da perícia usada contra DT 7. Se passar, quem foi ajudado pode trocar um dos dados dele pela sua rolagem alta.", motor: { tipo: "mentoria", dt: 7 } },
    incansavel: { nome: "Incansável", versao: "alpha", fonte: "alphaAto2", ficha: "Heitor",
      texto: "Uma vez por cena de conflito, gaste 5 PV para fazer uma ação extra.", motor: { tipo: "acaoExtraPorPv", pv: 5, limite: "cenaConflito" } },
    linha_de_tiro: { nome: "Linha de Tiro", versao: "alpha", fonte: "alphaAto2", ficha: "Heitor",
      texto: "Proficiência com armas de fogo; num ataque com elas, gaste 4 PD para +d10.", motor: { tipo: "dadoEmAtaque", categoria: "fogo", pd: 4, faces: 10 } },
    estoico: { nome: "Estoico", versao: "alpha", fonte: "alphaAto2", ficha: "Raven",
      texto: "+d6 em testes de trauma; na primeira vez em cada cena em que faz um teste de trauma, recupera 9 PD.", motor: { tipo: "estoico", faces: 6, pd: 9 } },
    para_bellum: { nome: "Para Bellum", versao: "alpha", fonte: "alphaAto2", ficha: "Raven",
      texto: "Proficiência com armas de fogo; dano com elas +2.", motor: { tipo: "danoPorCategoria", categoria: "fogo", valor: 2 } },
    tecnica_medicinal: { nome: "Técnica Medicinal", versao: "alpha", fonte: "alphaAto2", ficha: "Val",
      texto: "Efeitos de cura que você usa curam +1 PV (ou +1 PV por dado).", motor: { tipo: "curaExtra", valor: 1 } },
    varredura_ampla: { nome: "Varredura Ampla", versao: "alpha", fonte: "alphaAto2", ficha: "Val",
      texto: "Ao investigar um ponto de interesse, escolha duas perícias e receba as informações de ambas.", motor: { tipo: "duasPericias" } },
    esquiva: { nome: "Esquiva", versao: "beta", fonte: "betaFichas", ficha: "Rowan",
      texto: "Uma vez por rodada, ao sofrer um ataque, faça um teste de Acrobacia oposto como ação livre; se vencer, evita o ataque.", motor: { tipo: "esquiva", limite: "rodada" } },
    espectro_lobo: { nome: "Espectro, o Lobo", versao: "beta", fonte: "betaFichas", ficha: "Rowan",
      texto: "Um lobo parceiro dá +d6 em ataques corpo a corpo; se esse dado der 1, o lobo se machuca e não ajuda até o fim da cena.", motor: { tipo: "parceiro", faces: 6, ataque: "corpo" } },
    arsenal_herborista: { nome: "Arsenal de Herborista", versao: "beta", fonte: "betaFichas", ficha: "Muirenn",
      texto: "Preparados de uso único (uma ação e um alvo): tônico de urtiga-feroz (Físico +1 passo por uma cena), bálsamo de confrei (2d4 PV; outro alvo fica parado na rodada) e pote de vespa (ataque à distância com Sobrevivência, dano RA+1; o alvo que sobreviver perde a próxima ação).",
      motor: { tipo: "consumiveis" } },
    curandeiro: { nome: "Curandeiro", versao: "beta", fonte: "betaFichas", ficha: "Cavan",
      texto: "Uma ação e 2 PD: teste de Medicina (DT 7); se passar, cura PV do aliado iguais à RA. Uma vez por cena em cada alvo.", motor: { tipo: "curaPorTeste", pd: 2, dt: 7, pericia: "medicina", limite: "porAlvoCena" } },
    sorrateiro: { nome: "Sorrateiro", versao: "beta", fonte: "betaFichas", ficha: "Sira",
      texto: "Num teste de Crime ou Furtividade, gaste 3 PD para +d8.", motor: { tipo: "dadoPorPd", pericias: ["crime", "furtividade"], pd: 3, faces: 8 } },
    guardia: { nome: "Guardiã", versao: "beta", fonte: "betaFichas", ficha: "Sorcha",
      texto: "+1 PV por patamar (já anotado na ficha). Uma vez por rodada, quando um aliado em alcance curto sofre um ataque, gaste 2 PD para se tornar o alvo.", motor: { tipo: "redirecionarAtaque", pd: 2, limite: "rodada" } },
    instinto_sobrevivencia: { nome: "Instinto de Sobrevivência", versao: "beta", fonte: "betaFichas", ficha: "Sorcha",
      texto: "Com metade ou menos dos PV máximos, recebe um aumento de passo em todos os testes.", motor: { tipo: "passoComPvBaixo" } },
    heranca: { nome: "Herança", versao: "beta", fonte: "betaFichas", ficha: "Cormac",
      texto: "A categoria de riqueza aumenta em 1 (as regras de compra virão depois).", motor: { tipo: "narrativa" } },
    plano_estrategico: { nome: "Plano Estratégico", versao: "beta", fonte: "betaFichas", ficha: "Cormac",
      texto: "Uma ação e 3 PD: teste de Aptidão (Guerra) contra DT 7. Se passar, o grupo recebe d6, mais d6 a cada 3 pontos acima da DT, para gastar em testes até o fim da cena.",
      motor: { tipo: "reservaDeGrupo", pd: 3, dt: 7, pericia: "aptidao", especializacao: "Guerra", faces: 6 } },
  };

  /* ---------------------------------------------------------------
     OCUPAÇÕES (Alpha) E VOCAÇÕES (Beta)
     `habilidade`: documentada para a ocupação (a ficha só tem as duas de
     criação). `vistas`: habilidades que aparecem em fichas dela, mas sem
     dizer qual é a da ocupação — a criação guiada só dá uma se a
     pessoa escolher explicitamente.
     --------------------------------------------------------------- */
  var OCUPACOES = {
    "alpha-contemporaneo": [
      { id: "cientista", nome: "Cientista", habilidade: "foco_mental", nota: "Alan (nível 2) tem só Ímpeto e Foco Mental: Foco Mental é a de ocupação.", vistas: ["foco_mental", "avaliacao_alpha", "olhar_infalivel"] },
      { id: "professor", nome: "Professor", habilidade: "", vistas: ["amor_descoberta", "mentoria"] },
      { id: "policial", nome: "Policial", habilidade: "", vistas: ["incansavel", "linha_de_tiro"] },
      { id: "militar", nome: "Militar", habilidade: "", vistas: ["estoico", "para_bellum"] },
      { id: "medico", nome: "Médico", habilidade: "", vistas: ["tecnica_medicinal", "varredura_ampla"] },
    ],
    "beta-vigilia": [
      { id: "ferreira", nome: "Ferreira", habilidade: "", vistas: ["leitura_combate", "segredo_do_aco"] },
      { id: "adestrador", nome: "Adestrador", habilidade: "", vistas: ["esquiva", "espectro_lobo"] },
      { id: "herborista", nome: "Herborista", habilidade: "arsenal_herborista", nota: "Muirenn tem só Ímpeto e Arsenal de Herborista.", vistas: ["arsenal_herborista"] },
      { id: "professor", nome: "Professor", habilidade: "", vistas: ["curandeiro", "mentoria"] },
      { id: "explorador", nome: "Explorador", habilidade: "impeto_fervilhante", nota: "Malik tem só Ímpeto e Ímpeto Fervilhante.", vistas: ["impeto_fervilhante"] },
      { id: "viking", nome: "Viking", habilidade: "", vistas: ["antecipacao_tatica", "sorrateiro"] },
      { id: "talentosa", nome: "Talentosa", habilidade: "", vistas: ["guardia", "instinto_sobrevivencia"] },
      { id: "aristocrata", nome: "Aristocrata", habilidade: "", vistas: ["heranca", "plano_estrategico"] },
    ],
  };

  /* ---------------------------------------------------------------
     RELAÇÕES (Beta pp. 24–25)
     --------------------------------------------------------------- */
  var GRAUS_RELACAO = {
    1: { nome: "Afinidade", dado: 6, recuperar: null, acaoExtra: false },
    2: { nome: "Vínculo", dado: 8, recuperar: "2d4", acaoExtra: false },
    3: { nome: "Devoção", dado: 12, recuperar: "2d6", acaoExtra: true },
  };

  /* ---------------------------------------------------------------
     TABELAS (Alpha p. 19; Beta pp. 11, 22–23)
     --------------------------------------------------------------- */
  var FALHA_CRITICA = [
    { d: 1, nome: "Vexame", texto: "Descreva a falha de forma vergonhosa. Sem efeito em regras.", efeito: null },
    { d: 2, nome: "Machucado", texto: "Físico −1 passo até o fim da cena.", efeito: { tipo: "passoAtributo", alvo: "fisico", n: -1, expira: "cena" } },
    { d: 3, nome: "Desatenção", texto: "Mente −1 passo até o fim da cena.", efeito: { tipo: "passoAtributo", alvo: "mente", n: -1, expira: "cena" } },
    { d: 4, nome: "Irritação", texto: "Emoção −1 passo até o fim da cena.", efeito: { tipo: "passoAtributo", alvo: "emocao", n: -1, expira: "cena" } },
    { d: 5, nome: "Acidente", texto: "Perde 1d4 PV.", efeito: { tipo: "perda", recurso: "pv", dado: 4 } },
    { d: 6, nome: "Frustração", texto: "Perde 1d4 PD.", efeito: { tipo: "perda", recurso: "pd", dado: 4 } },
    { d: 7, nome: "Perda", texto: "Um item carregado (ou espaço de compra) se perde.", efeito: { tipo: "narrativa" } },
    { d: 8, nome: "Nenhum efeito adicional", texto: "Só a falha.", efeito: null },
  ];
  /* Lesões (Beta p. 22). `perm`: permanente (10–18). */
  var LESOES = [
    { de: 1, ate: 4, id: "morteSubita", nome: "Morte Súbita", texto: "O personagem morre.", efeito: { tipo: "morte" } },
    { de: 5, ate: 9, id: "morteLenta", nome: "Morte Lenta", texto: "Recupera 1 PV e acorda; age na rodada seguinte e morre ao fim dela. Nada impede.", efeito: { tipo: "morteLenta" } },
    { de: 10, ate: 10, id: "laceracao", nome: "Laceração Profunda", perm: true, acumula: true, texto: "Perde 2 PV (permanente; acumula).", efeito: { tipo: "pvMax", valor: -2 } },
    { de: 11, ate: 11, id: "semOlho", nome: "Sem Olho", perm: true, texto: "−1 em Percepção e Pontaria.", efeito: { tipo: "modPericia", pericias: { percepcao: -1, pontaria: -1 } } },
    { de: 12, ate: 12, id: "semMao", nome: "Sem Mão", perm: true, texto: "Só empunha um item; tarefas de duas mãos: −1 passo ou falha, a critério do Mestre.", efeito: { tipo: "narrativa" } },
    { de: 13, ate: 13, id: "semPe", nome: "Sem Pé", perm: true, texto: "−2 passos em movimentar-se e perseguição a pé.", efeito: { tipo: "narrativa" } },
    { de: 14, ate: 14, id: "tendao", nome: "Tendão Comprometido", perm: true, texto: "−2 em Acrobacia.", efeito: { tipo: "modPericia", pericias: { acrobacia: -2 } } },
    { de: 15, ate: 15, id: "musculo", nome: "Músculo Comprometido", perm: true, texto: "−2 em Atletismo.", efeito: { tipo: "modPericia", pericias: { atletismo: -2 } } },
    { de: 16, ate: 16, id: "orgaoInterno", nome: "Órgão Interno Comprometido", perm: true, texto: "−2 em Vigor.", efeito: { tipo: "modPericia", pericias: { vigor: -2 } } },
    { de: 17, ate: 17, id: "orgaoSensorial", nome: "Órgão Sensorial Comprometido", perm: true, texto: "−2 em Percepção.", efeito: { tipo: "modPericia", pericias: { percepcao: -2 } } },
    { de: 18, ate: 18, id: "cicatriz", nome: "Cicatriz Assustadora", perm: true, texto: "−2 em Persuasão e +1 em Intimidar.", efeito: { tipo: "modPericia", pericias: { persuasao: -2, intimidar: 1 } } },
    { de: 19, ate: 19, id: "contusao", nome: "Contusão", texto: "Físico −1 passo até o fim da cena.", efeito: { tipo: "passoAtributo", alvo: "fisico", n: -1, expira: "cena" } },
    { de: 20, ate: 99, id: "surto", nome: "Surto de Adrenalina", texto: "Sem sequelas; recupera 1 PV.", efeito: { tipo: "recupera", recurso: "pv", valor: 1 } },
  ];
  /* Traumas (Beta p. 23). `cura`: dura até ser curado (5–14). */
  var TRAUMAS = [
    { de: 1, ate: 4, id: "colapso", nome: "Colapso Total", texto: "A mente sucumbe: o personagem está perdido.", efeito: { tipo: "colapso" } },
    { de: 5, ate: 6, id: "tept", nome: "Estresse Pós-Traumático", cura: true, texto: "Dano emocional sofrido +1.", efeito: { tipo: "danoEmocionalExtra", valor: 1 } },
    { de: 7, ate: 8, id: "degradacao", nome: "Degradação Cognitiva", cura: true, texto: "−1 em Mente.", efeito: { tipo: "modAtributo", atributo: "mente", valor: -1 } },
    { de: 9, ate: 10, id: "macula", nome: "Mácula Psíquica", cura: true, texto: "−1 em Emoção.", efeito: { tipo: "modAtributo", atributo: "emocao", valor: -1 } },
    { de: 11, ate: 12, id: "chaga", nome: "Chaga da Alma", cura: true, texto: "Perde 2 PD (enquanto não for curado).", efeito: { tipo: "pdMax", valor: -2 } },
    { de: 13, ate: 14, id: "retracao", nome: "Retração Defensiva", cura: true, texto: "−2 em Persuasão e Intuição.", efeito: { tipo: "modPericia", pericias: { persuasao: -2, intuicao: -2 } } },
    { de: 15, ate: 17, id: "panico", nome: "Pânico", texto: "Recebe um dado de pavor.", efeito: { tipo: "pavor" } },
    { de: 18, ate: 19, id: "estupor", nome: "Estupor Catatônico", texto: "Perde a ação na próxima rodada.", efeito: { tipo: "perdeAcao" } },
    { de: 20, ate: 99, id: "injecao", nome: "Injeção de Ânimo", texto: "Sem sequelas; recupera 1 PD.", efeito: { tipo: "recupera", recurso: "pd", valor: 1 } },
  ];
  function daTabela(tabela, n) {
    for (var i = 0; i < tabela.length; i++) if (n >= tabela[i].de && n <= tabela[i].ate) return tabela[i];
    return n < 1 ? tabela[0] : tabela[tabela.length - 1];
  }
  /* Bônus por patamar no d20 de lesão/trauma (Beta pp. 22–23): só
     quando o patamar for informado (o playtest não define patamares). */
  var PATAMARES = { "": { nome: "Não informado", bonus: 0 }, iniciante: { nome: "Iniciante", bonus: 0 }, veterano: { nome: "Veterano", bonus: 1 }, elite: { nome: "Elite", bonus: 2 }, lenda: { nome: "Lenda", bonus: 3 } };

  /* ---------------------------------------------------------------
     COMBATE (Beta pp. 18–21)
     --------------------------------------------------------------- */
  var FASES = {
    geral: { nome: "Fase Geral", texto: "Qualquer ação, exceto ataques." },
    distancia: { nome: "Ataques à Distância", texto: "Ataques com armas de arremesso ou disparo." },
    corpo: { nome: "Corpo a Corpo", texto: "Ataques corpo a corpo e manobras." },
  };
  var ORDEM_FASES_PADRAO = ["geral", "distancia", "corpo"];
  var ACOES_COMBATE = {
    atrapalhar: { fase: "geral", nome: "Atrapalhar", texto: "Perícia coerente contra a Percepção do alvo (curto); vencendo, o alvo sofre −1 passo em todos os testes até o fim da rodada." },
    defender: { fase: "geral", nome: "Defender-se", texto: "Acrobacia +d6 (ou Luta, contra corpo a corpo) oposta a um ataque escolhido antes da rolagem; vencendo, não sofre dano (nem causa)." },
    fintar: { fase: "geral", nome: "Fintar", texto: "Enganação contra a Intuição do alvo (curto); vencendo, +2 passos no próximo ataque contra ele até o fim da próxima rodada." },
    mirar: { fase: "geral", nome: "Mirar", texto: "Na próxima rodada, +d6 em ataques à distância contra o alvo." },
    preparar: { fase: "geral", nome: "Preparar", texto: "Declara uma ação e o evento que a dispara; ela acontece antes do evento. Sem o evento, perde a ação." },
    habilidade: { fase: "geral", nome: "Usar habilidade ou item", texto: "Conforme o texto da habilidade ou item." },
    outra: { fase: "geral", nome: "Outra ação", texto: "Movimentar-se, ajudar, interagir…" },
    agredirDistancia: { fase: "distancia", nome: "Agredir (à distância)", texto: "Pontaria contra DT 7 (+3 em alcance longo)." },
    agredirCorpo: { fase: "corpo", nome: "Agredir (corpo a corpo)", texto: "Luta contra DT 7 (alcance curto)." },
    agarrar: { fase: "corpo", manobra: true, nome: "Agarrar", texto: "O alvo fica imóvel, −1 passo em ataques e só ataca com armas pequenas." },
    derrubar: { fase: "corpo", manobra: true, nome: "Derrubar", texto: "O alvo fica caído; vencendo por 5+, dano de impacto igual à RB." },
    desarmar: { fase: "corpo", manobra: true, nome: "Desarmar", texto: "O alvo larga um item; por 5+, você pega ou arremessa." },
    empurrar: { fase: "corpo", manobra: true, nome: "Empurrar", texto: "Empurra alguns metros; por 5+, −1 passo no próximo teste do alvo." },
    quebrar: { fase: "corpo", manobra: true, nome: "Quebrar", texto: "Causa o dano do ataque num item empunhado ou vestido." },
  };
  /* Ações livres (Beta p. 19): sacar/guardar e erguer-se custam −1 passo
     em todos os testes da rodada; jogar-se no chão não custa. */
  var ACOES_LIVRES = {
    sacar: { nome: "Sacar ou guardar item", passosNaRodada: -1 },
    erguer: { nome: "Erguer-se", passosNaRodada: -1, levanta: true },
    jogarSe: { nome: "Jogar-se no chão", passosNaRodada: 0, cai: true },
  };

  /* ---------------------------------------------------------------
     MINIJOGOS (Alpha pp. 24–25; Beta pp. 16–17)
     --------------------------------------------------------------- */
  var MINIJOGOS = {
    destrancar: { nome: "Destrancar", fonte: "beta", pagina: 16, texto: "O Mestre rola a senha escondido; você posiciona os dados e ouve alto, baixo ou exato. Tentativas por rodada pelo Crime (d4 = 1 … d12 = 5); excedido o máximo da fechadura, ela só abre na força ou com a chave." },
    arrombar: { nome: "Arrombar", fonte: "beta", pagina: 16, texto: "1 PV por tentativa; teste de Atletismo contra a DT do objeto; cada sucesso soma a RA até a pontuação alvo." },
    equilibrio: { nome: "Teste de Equilíbrio", fonte: "beta", pagina: 17, texto: "2d10 sem somar: iguais ou com 1 de diferença, você se equilibra. Dados de equilíbrio (d4, metade da Acrobacia) somam a um dos d10." },
    alcancarSeguro: { nome: "Alcançar do jeito seguro", fonte: "beta", pagina: 17, texto: "Duas ações seguidas com Acrobacia; falhando em qualquer uma, dano igual à RB e recomeça." },
    alcancarArriscado: { nome: "Alcançar do jeito arriscado", fonte: "beta", pagina: 17, texto: "Uma ação, Acrobacia com DT +3; falhando, dano igual à RA." },
    sustentar: { nome: "Sustentar", fonte: "beta", pagina: 17, texto: "1 PV e Atletismo; a cada rodada, novo teste com −1 passo acumulado." },
    hackTecnico: { nome: "Hack técnico", fonte: "alpha", pagina: 25, texto: "Teste de Tecnologia e um problema matemático em 10 segundos (mais fácil quanto maior o resultado)." },
    hackSocial: { nome: "Hack social", fonte: "alpha", pagina: 25, texto: "Teste de Intuição e perguntas sobre quem criou a senha; a cada 3 acima da DT, uma chance extra." },
  };

  /* ---------------------------------------------------------------
     O BLOCO PARANORMAL — consultável, ainda sem conjuração (etapa 3)
     --------------------------------------------------------------- */
  var PARANORMAL = {
    disponivel: false,
    texto: "Rituais, poderes e objetos amaldiçoados ainda não chegaram nos playtests usados aqui. O que já vale: atributos e perícias podem chegar a d20 só com efeito paranormal explícito (Alpha p. 16 e 20; Beta p. 8 e 12), e Ocultismo/Bruxaria é a perícia do conhecimento paranormal.",
  };

  /* ---------------------------------------------------------------
     FICHAS PRONTAS
     Dados de perícia na ordem da lista do perfil, com as Aptidões
     escritas à parte. PV e PD são os IMPRESSOS — nunca calculados.
     --------------------------------------------------------------- */
  var ORDEM_A = ["acrobacia", "aptidao", "atletismo", "crime", "disciplina", "enganacao", "furtividade", "intimidar", "intuicao", "luta", "maquinas", "medicina", "ocultismo", "percepcao", "persuasao", "pesquisar", "pontaria", "sobrevivencia", "tecnologia", "vigor"];
  var ORDEM_B = ["acrobacia", "animais", "aptidao", "atletismo", "crime", "disciplina", "enganacao", "furtividade", "inspecionar", "intimidar", "intuicao", "luta", "medicina", "ocultismo", "metalurgia", "percepcao", "persuasao", "pontaria", "sobrevivencia", "vigor"];

  /* Monta as perícias: `dados` na ordem da lista; `aptidoes` substitui a
     entrada "aptidao" por uma ou mais especializações. */
  function periciasDe(ordem, dados, aptidoes, extras) {
    var saida = [];
    ordem.forEach(function (k, i) {
      if (k === "aptidao") {
        (aptidoes || [{ esp: "", dado: dados[i] }]).forEach(function (a) { saida.push({ chave: "aptidao", especializacao: a.esp, dado: a.dado }); });
        return;
      }
      var e = { chave: k, especializacao: "", dado: dados[i] };
      if (extras && extras[k]) Object.keys(extras[k]).forEach(function (x) { e[x] = extras[k][x]; });
      saida.push(e);
    });
    return saida;
  }
  /* Os rótulos impressos nas fichas Beta (ver DIVERGENCIAS). */
  var IMPRESSO_BETA = { ocultismo: { rotuloImpresso: "Ocultismo" }, metalurgia: { rotuloImpresso: "Ofício" } };
  function impressoBeta(espMetalurgia) {
    return { ocultismo: { rotuloImpresso: "Ocultismo" }, metalurgia: espMetalurgia ? { rotuloImpresso: "Ofício (" + espMetalurgia + ")", especializacao: espMetalurgia } : { rotuloImpresso: "Ofício" } };
  }
  function rel(nome, rotulo, descricao, grau) { return { nome: nome, rotulo: rotulo, descricao: descricao, grau: grau || 0 }; }
  function arma(nome, tipo, dano, extra) { return Object.assign({ nome: nome, tipo: "arma", alcance: tipo, dano: dano }, extra || {}); }
  function item(nome, extra) { return Object.assign({ nome: nome, tipo: "item" }, extra || {}); }

  var PRESETS = [
    /* ---------------- ALPHA ---------------- */
    { id: "alan", nome: "Alan", perfilRegras: "alpha-contemporaneo", fonte: "alpha", pagina: 15, perfil: "executor", ocupacao: "Cientista", nivel: 2,
      atributos: { fisico: 6, mente: 8, emocao: 8 }, pv: 10, pd: 16,
      pericias: periciasDe(ORDEM_A, [4, 6, 4, 6, 6, 6, 4, 4, 4, 4, 4, 4, 4, 8, 4, 6, 4, 4, 4, 6], [{ esp: "Humanas", dado: 6 }]),
      habilidades: [{ id: "foco_mental", param: { pd: 2, faces: 4 } }, { id: "impeto_alpha3" }],
      itens: [], relacoes: [], idade: null, resumo: "Personagem pronto da explicação da ficha no Alpha." },
    { id: "amanda", nome: "Amanda", perfilRegras: "alpha-contemporaneo", fonte: "alphaAto2", perfil: "analista", ocupacao: "Cientista", nivel: 6,
      atributos: { fisico: 8, mente: 8, emocao: 8 }, pv: 26, pd: 26,
      pericias: periciasDe(ORDEM_A, [4, 0, 4, 6, 6, 6, 4, 4, 8, 4, 6, 6, 4, 10, 4, 10, 4, 4, 10, 4], [{ esp: "Burocracia", dado: 8 }, { esp: "Exatas", dado: 8 }]),
      habilidades: [{ id: "avaliacao_alpha" }, { id: "foco_mental", param: { pd: 4, faces: 8 } }, { id: "olhar_infalivel" }],
      itens: [], relacoes: [], idade: 25, resumo: "Perita criminal cética, recrutada pela Ordo Realitas." },
    { id: "antonio", nome: "Antônio", perfilRegras: "alpha-contemporaneo", fonte: "alphaAto2", perfil: "analista", ocupacao: "Professor", nivel: 6,
      atributos: { fisico: 6, mente: 12, emocao: 6 }, pv: 24, pd: 24,
      pericias: periciasDe(ORDEM_A, [4, 0, 4, 8, 10, 8, 6, 4, 8, 4, 4, 4, 10, 8, 4, 4, 6, 4, 6, 8], [{ esp: "Humanas", dado: 10 }, { esp: "Burocracia", dado: 8 }]),
      habilidades: [{ id: "amor_descoberta" }, { id: "avaliacao_alpha" }, { id: "mentoria" }],
      itens: [], relacoes: [], idade: 60, resumo: "Pesquisador universitário que estuda o paranormal para a Ordem." },
    { id: "heitor", nome: "Heitor", perfilRegras: "alpha-contemporaneo", fonte: "alphaAto2", perfil: "executor", ocupacao: "Policial", nivel: 6,
      atributos: { fisico: 10, mente: 6, emocao: 8 }, pv: 34, pd: 20,
      pericias: periciasDe(ORDEM_A, [4, 0, 10, 4, 6, 4, 4, 6, 4, 10, 4, 4, 4, 10, 4, 6, 8, 4, 4, 8], [{ esp: "Tática", dado: 8 }]),
      habilidades: [{ id: "impeto_alpha5" }, { id: "incansavel" }, { id: "linha_de_tiro" }],
      itens: [], relacoes: [], idade: 31, resumo: "Ex-policial, agente de linha de frente." },
    { id: "raven", nome: "Raven", perfilRegras: "alpha-contemporaneo", fonte: "alphaAto2", perfil: "executor", ocupacao: "Militar", nivel: 6,
      atributos: { fisico: 10, mente: 8, emocao: 6 }, pv: 28, pd: 24,
      pericias: periciasDe(ORDEM_A, [4, 0, 8, 4, 6, 4, 4, 6, 4, 6, 10, 4, 4, 8, 4, 4, 10, 8, 4, 10], [{ esp: "Tática", dado: 10 }]),
      habilidades: [{ id: "estoico" }, { id: "impeto_alpha3" }, { id: "para_bellum" }],
      itens: [], relacoes: [], idade: 29, resumo: "Ex-oficial e piloto, agora na aviação civil e na Ordem." },
    { id: "val", nome: "Val", perfilRegras: "alpha-contemporaneo", fonte: "alphaAto2", perfil: "vigilante", ocupacao: "Médico", nivel: 6,
      atributos: { fisico: 6, mente: 10, emocao: 8 }, pv: 18, pd: 32,
      pericias: periciasDe(ORDEM_A, [4, 0, 4, 4, 10, 6, 4, 4, 8, 4, 4, 10, 8, 6, 8, 6, 10, 4, 10, 4], [{ esp: "Exatas", dado: 10 }]),
      habilidades: [{ id: "prontidao_alpha" }, { id: "tecnica_medicinal" }, { id: "varredura_ampla" }],
      itens: [], relacoes: [], idade: 28, resumo: "Estudante de medicina que decidiu salvar vidas depois de um encontro paranormal." },

    /* ---------------- BETA (nível 3) ---------------- */
    { id: "rhiona", nome: "Rhiona Mac Tuirenn", perfilRegras: "beta-vigilia", fonte: "beta", pagina: 7, fonteExtra: "betaFichas", perfil: "analista", ocupacao: "Ferreira", nivel: 3,
      atributos: { fisico: 10, mente: 6, emocao: 6 }, pv: 22, pd: 12,
      pericias: periciasDe(ORDEM_B, [4, 4, 4, 8, 4, 6, 4, 4, 4, 4, 4, 10, 4, 4, 8, 6, 6, 4, 4, 8], null, impressoBeta("Metalurgia")),
      habilidades: [{ id: "analise_beta" }, { id: "leitura_combate" }, { id: "segredo_do_aco" }],
      itens: [arma("Martelo de forja", "corpo", 3), item("Tenaz de ferreiro")],
      relacoes: [rel("Rowan", "Confiança", "Traz o minério de ferro do pântano."), rel("Muirenn", "Neutro", "Ouviu falar dos enfermos tratados pela curandeira."), rel("Cavan", "Amizade", "Debatem contabilidade."), rel("Malik", "Admiração", "Gosta das histórias de terras distantes."), rel("Sira", "Neutro", "Quer perguntar sobre o naufrágio."), rel("Sorcha", "Respeito", "Reconhece a vigilância dela."), rel("Cormac", "Curiosidade", "De onde vem a espada dele?")],
      idade: 23, resumo: "Filha do ferreiro de Ballynyr, versada no ferro e no fogo." },
    { id: "rowan", nome: "Rowan Lobo Castanho", perfilRegras: "beta-vigilia", fonte: "betaFichas", perfil: "vigilante", ocupacao: "Adestrador", nivel: 3,
      atributos: { fisico: 8, mente: 8, emocao: 6 }, pv: 20, pd: 12,
      pericias: periciasDe(ORDEM_B, [6, 6, 4, 6, 4, 4, 4, 6, 4, 4, 4, 6, 6, 4, 4, 8, 4, 10, 8, 6], null, impressoBeta("")),
      habilidades: [{ id: "prontidao_beta" }, { id: "esquiva" }, { id: "espectro_lobo" }],
      itens: [arma("Arco curto de teixo", "distancia", 1), arma("Lança de javali", "corpo", 2, { efeitos: ["passoPrimeiroAtaqueCena"], especial: "+1 passo no primeiro ataque da cena." })],
      relacoes: [rel("Rhiona", "Dever", "A ferreira é importante e deve ser protegida."), rel("Muirenn", "Cumplicidade", "Vivem à parte da vila."), rel("Cavan", "Neutro", "Bons conselhos aos camponeses."), rel("Malik", "Neutro", "O jeito bisbilhoteiro não incomoda."), rel("Sira", "Neutro", "Viram-se uma vez."), rel("Sorcha", "Neutro", "Os rastros dela chamam atenção demais."), rel("Cormac", "Tranquilidade", "Não o considera ameaça.")],
      idade: 25, resumo: "Aprendiz do caçador da vila, com um lobo castanho leal." },
    { id: "muirenn", nome: "Muirenn da Lua Pálida", perfilRegras: "beta-vigilia", fonte: "betaFichas", perfil: "executor", ocupacao: "Herborista", nivel: 3,
      atributos: { fisico: 8, mente: 8, emocao: 8 }, pv: 15, pd: 17,
      pericias: periciasDe(ORDEM_B, [4, 4, 0, 6, 4, 6, 4, 4, 6, 6, 6, 4, 8, 8, 4, 4, 4, 6, 8, 6], [{ esp: "Folclore", dado: 8 }], impressoBeta("")),
      habilidades: [{ id: "impeto_beta" }, { id: "arsenal_herborista" }],
      itens: [arma("Faca ritualística", "corpo", 0), item("Maleta de medicamentos"),
        item("Tônico de urtiga-feroz", { consumivel: "tonico", quantidade: 1 }), item("Bálsamo de confrei", { consumivel: "balsamo", quantidade: 1 }), item("Pote de vespa", { consumivel: "vespa", quantidade: 1 })],
      relacoes: [rel("Rhiona", "Neutro", "Não gosta de armas de metal."), rel("Rowan", "Amizade", "Não tem medo do lobo."), rel("Cavan", "Neutro", "Desaprova a doutrina escrita."), rel("Malik", "Neutro", "Tolo, mas não perigoso."), rel("Sira", "Neutro", "Sabe que ela finge debilidade."), rel("Sorcha", "Neutro", "Duvida da proteção da guarda."), rel("Cormac", "Neutro", "Mais um forasteiro bem recebido.")],
      idade: 21, resumo: "Bruxa do bosque; dizem ser filha das fadas." },
    { id: "cavan", nome: "Irmão Cavan", perfilRegras: "beta-vigilia", fonte: "betaFichas", perfil: "analista", ocupacao: "Professor", nivel: 3,
      atributos: { fisico: 6, mente: 10, emocao: 6 }, pv: 15, pd: 15,
      pericias: periciasDe(ORDEM_B, [6, 4, 0, 10, 4, 8, 4, 4, 8, 4, 6, 8, 6, 6, 4, 6, 4, 4, 4, 6], [{ esp: "Erudição", dado: 6 }], impressoBeta("")),
      habilidades: [{ id: "analise_beta" }, { id: "curandeiro" }, { id: "mentoria" }],
      itens: [arma("Porrete", "corpo", 1)],
      relacoes: [rel("Rhiona", "Grande afeição", "Sentimento em conflito com os votos."), rel("Rowan", "Neutro", "Espera conversar melhor."), rel("Muirenn", "Neutro", "Desaprova a tradição, sem ódio."), rel("Malik", "Admiração", "O conhecimento de outras terras."), rel("Sira", "Neutro", "Quer perguntar sobre o naufrágio."), rel("Sorcha", "Neutro", "Acha que ela já sofreu muito."), rel("Cormac", "Discrição", "Reconhece o sotaque nobre e não conta.")],
      idade: 26, nomeCompleto: "Irmão Cavan do Mosteiro do Olmo Cinzento", resumo: "Monge educador, contabilista e guia espiritual." },
    { id: "malik", nome: "Malik ibn Qamar", perfilRegras: "beta-vigilia", fonte: "betaFichas", perfil: "executor", ocupacao: "Explorador", nivel: 3,
      atributos: { fisico: 6, mente: 6, emocao: 10 }, pv: 15, pd: 19,
      pericias: periciasDe(ORDEM_B, [4, 4, 0, 6, 4, 6, 4, 4, 6, 4, 4, 4, 4, 4, 4, 10, 6, 8, 6, 4], [{ esp: "Erudição", dado: 8 }], impressoBeta("")),
      habilidades: [{ id: "impeto_beta" }, { id: "impeto_fervilhante" }],
      itens: [arma("Arco composto de Al-Andalus", "distancia", 1), item("Diário de viagem")],
      relacoes: [rel("Rhiona", "Neutro", "Boa ouvinte das histórias."), rel("Rowan", "Neutro", "O lobo e as superstições."), rel("Muirenn", "Admiração", "O conhecimento ancestral."), rel("Cavan", "Admiração", "A caligrafia e a didática."), rel("Sira", "Curiosidade", "Enche-a de perguntas."), rel("Sorcha", "Neutro", "O olhar desconfiado dela pesa."), rel("Cormac", "Curiosidade", "Admira o vocabulário.")],
      idade: 24, resumo: "Andarilho árabe atrás das maravilhas e horrores do mundo." },
    { id: "sira", nome: "Sira Cissé", perfilRegras: "beta-vigilia", fonte: "betaFichas", perfil: "vigilante", ocupacao: "Viking", nivel: 3,
      atributos: { fisico: 8, mente: 6, emocao: 8 }, pv: 20, pd: 12,
      pericias: periciasDe(ORDEM_B, [6, 4, 0, 6, 8, 4, 4, 10, 4, 4, 4, 8, 4, 4, 4, 6, 4, 4, 4, 6], [{ esp: "Erudição", dado: 6 }], impressoBeta("")),
      habilidades: [{ id: "prontidao_beta" }, { id: "antecipacao_tatica" }, { id: "sorrateiro" }],
      itens: [arma("Machado de batalha nórdico", "corpo", 3)],
      atributosImpressos: { intuicao: "fisico", luta: "mente", percepcao: "emocao" },
      relacoes: [rel("Rhiona", "Anseio", "Quer o poder social dela para voltar ao mar."), rel("Rowan", "Neutro", "Viram-se uma vez."), rel("Muirenn", "Gratidão", "Tratou as feridas do naufrágio."), rel("Cavan", "Anseio", "Quer o poder religioso dele."), rel("Malik", "Neutro", "Perguntas demais."), rel("Sorcha", "Respeito", "Pode contar com ela numa luta."), rel("Cormac", "Empatia", "Ele também esconde algo.")],
      idade: 27, resumo: "Náufraga recém-chegada; veio de muito longe." },
    { id: "sorcha", nome: "Sorcha Roth", perfilRegras: "beta-vigilia", fonte: "betaFichas", perfil: "vigilante", ocupacao: "Talentosa", nivel: 3,
      atributos: { fisico: 8, mente: 6, emocao: 8 }, pv: 22, pd: 14,
      pericias: periciasDe(ORDEM_B, [4, 4, 0, 8, 4, 8, 4, 4, 4, 4, 6, 8, 6, 4, 4, 6, 4, 4, 4, 8], [{ esp: "Erudição", dado: 4 }], impressoBeta("")),
      habilidades: [{ id: "prontidao_beta" }, { id: "guardia" }, { id: "instinto_sobrevivencia" }],
      itens: [arma("Lança", "corpo", 2, { efeitos: ["passoContraQuemNaoAtacou"], especial: "+1 passo no primeiro ataque contra um inimigo que ainda não a atacou." }),
        item("Escudo", { efeitos: ["escudo"], especial: "Perdendo um teste oposto de ataque com total 7 ou mais, reduz o dano recebido pela sua rolagem baixa." }),
        item("Elmo aberto", { armadura: 1, passos: { percepcao: -1 }, vestido: true, especial: "1 ponto de armadura; Percepção −1 passo." })],
      atributosImpressos: { intuicao: "fisico", luta: "mente", percepcao: "emocao" },
      relacoes: [rel("Rhiona", "Respeito", "Depende das armas dela."), rel("Rowan", "Neutro", "Prefere distância do lobo."), rel("Muirenn", "Admiração", "Valoriza os remédios."), rel("Cavan", "Proteção", "Acha o monge ingênuo."), rel("Malik", "Neutro", "Mantém-no sob vigilância."), rel("Sira", "Suspeita", "Não acredita na fragilidade dela."), rel("Cormac", "Suspeita", "Postura nobre demais para um andarilho.")],
      idade: 28, resumo: "Guarda de Ballynyr, veterana contra saqueadores." },
    { id: "cormac", nome: "Cormac Coluim", perfilRegras: "beta-vigilia", fonte: "betaFichas", perfil: "executor", ocupacao: "Aristocrata", nivel: 3,
      atributos: { fisico: 8, mente: 8, emocao: 6 }, pv: 17, pd: 15,
      pericias: periciasDe(ORDEM_B, [4, 4, 0, 6, 4, 8, 4, 6, 6, 4, 4, 8, 4, 4, 4, 6, 6, 4, 8, 8], [{ esp: "Erudição", dado: 6 }, { esp: "Guerra", dado: 6 }, { esp: "Nobreza", dado: 6 }], impressoBeta("")),
      habilidades: [{ id: "impeto_beta" }, { id: "heranca" }, { id: "plano_estrategico" }],
      itens: [arma("Espada forjada em castelo", "corpo", 3, { efeitos: ["critico5"], especial: "Crítico com dois valores 5 ou mais." }),
        item("Cota de malha", { armadura: 2, passos: { furtividade: -1 }, vestido: true, especial: "2 pontos de armadura; Furtividade −1 passo." })],
      relacoes: [rel("Rhiona", "Admiração", "A líder que ele não quis ser."), rel("Rowan", "Neutro", "Admira a liberdade nos ermos."), rel("Muirenn", "Neutro", "Teme que ela revele quem ele é."), rel("Cavan", "Vínculo", "A única companhia intelectual da vila.", 2), rel("Malik", "Afinidade", "Gosta das histórias de longe.", 1), rel("Sira", "Neutro", "Ela também esconde algo."), rel("Sorcha", "Confiança", "Aprendeu a confiar em soldados.")],
      idade: 22, resumo: "Andarilho de postura e equipamento aristocráticos." },
  ];
  /* Cavan: a coluna de atributo impressa está trocada em várias linhas. */
  PRESETS.filter(function (p) { return p.id === "cavan"; })[0].atributosImpressos = { inspecionar: "emocao", intuicao: "fisico", luta: "mente", percepcao: "emocao", persuasao: "mente", pontaria: "fisico(d10)", sobrevivencia: "mente(d6)" };
  /* As entradas com dado 0 são as Aptidões substituídas (sem uso). */
  PRESETS.forEach(function (p) { p.pericias = p.pericias.filter(function (x) { return x.dado > 0; }); });

  function preset(id) { return PRESETS.filter(function (p) { return p.id === id; })[0] || null; }

  /* ---------------------------------------------------------------
     DIVERGENCIAS — fonte, escolha e o teste que fixa (docs/ORDEM2.md)
     --------------------------------------------------------------- */
  var DIVERGENCIAS = [
    { id: "compartilhar", fontes: "Alpha p. 23; Beta p. 15", texto: "O texto de Compartilhar pede Pesquisar (DT 10); a tabela-resumo diz Intuição. O Beta não tem Pesquisar.", escolha: "Vale o texto: Pesquisar no Alpha e Inspecionar (a mesma descrição, p. 9) no Beta. O Mestre pode trocar a perícia.", teste: "executar-ordem2: Compartilhar usa a perícia de pesquisa do perfil" },
    { id: "ocultismo", fontes: "Beta p. 9; fichas Beta", texto: "A lista do Beta chama a perícia de Bruxaria; as fichas impressas dizem Ocultismo.", escolha: "Uma chave só (ocultismo); a tela mostra Bruxaria na Vigília e guarda o rótulo impresso no preset.", teste: "executar-ordem2: ocultismo é único e o rótulo segue a ambientação" },
    { id: "oficio", fontes: "Beta p. 9; fichas Beta", texto: "A lista diz Metalurgia; as fichas dizem Ofício (Rhiona: Ofício (Metalurgia)).", escolha: "Metalurgia, com Ofício como alias; a especialização escrita fica.", teste: "executar-ordem2: Ofício é alias de Metalurgia" },
    { id: "atributoImpresso", fontes: "Fichas Beta de Sira, Sorcha e Cavan", texto: "A coluna de atributo-base impressa está desalinhada (ex.: Intuição/Físico, Luta/Mente, Percepção/Emoção).", escolha: "O motor usa o atributo-base da lista (p. 9); o preset guarda o impresso e a confirmação mostra a diferença. O Mestre pode trocar o atributo de um teste.", teste: "executar-ordem2: atributo impresso divergente não muda o atributo-base" },
    { id: "graus", fontes: "Beta pp. 24–25; fichas Beta", texto: "As relações das fichas têm rótulos livres (Confiança, Amizade, Neutro…); os graus são Afinidade, Vínculo e Devoção.", escolha: "O grau não é deduzido do rótulo; só Vínculo e Afinidade de Cormac viram grau. Sem grau, a relação não pode ser invocada até alguém escolher.", teste: "executar-ordem2: rótulo livre não vira grau" },
    { id: "impetoAlpha", fontes: "Alpha p. 15 (Alan); Ato II (Heitor, Raven); fichas Beta", texto: "Ímpeto tem 3 espaços (Alan, Raven), 5 com +d10 e ação extra (Heitor) e 5 que esvaziam no fim da cena (Beta).", escolha: "Cada ficha usa a versão dela; uma ficha nova de Executor no Alpha recebe a de 3 espaços (inferência: a de Alan, nível 2).", teste: "executar-ordem2: as três versões de Ímpeto" },
    { id: "prontidaoAlpha", fontes: "Ato II (Val); fichas Beta", texto: "Prontidão no Alpha é a rodada antecipada por 3 PD; no Beta é a rolagem de novo por 2 PD (e Antecipação Tática é a rodada por 2 PD).", escolha: "Cada ficha usa a sua; Val gasta 3 PD no início do conflito.", teste: "executar-ordem2: Val 18/32 com a Prontidão Alpha" },
    { id: "testeDeMorte", fontes: "Beta pp. 21–23", texto: "Moribundo pede \"teste de morte\"; a p. 21 chama o mesmo teste de \"teste de lesão\".", escolha: "Um só teste (Físico + Vigor, DT 7 +3 por teste na cena) na máquina de estados de lesão.", teste: "executar-ordem2: moribundo faz o teste de lesão no fim da rodada" },
    { id: "naoLetal", fontes: "Beta p. 23", texto: "Dano não letal dá +1d6 no \"teste de morte\" e, num \"ferimento grave\", 2d20 escolhendo o melhor.", escolha: "+d6 no teste de lesão e 2d20 (o maior) na tabela de lesões, quando o zero veio da soma de letal e não letal.", teste: "executar-ordem2: não letal" },
    { id: "patamar", fontes: "Beta pp. 22–23", texto: "Lesão e trauma dão +1 por patamar acima de iniciante, mas o playtest não define patamares.", escolha: "Bônus só quando o patamar estiver informado na ficha (padrão: não informado = +0).", teste: "executar-ordem2: patamar só quando informado" },
    { id: "laceracao", fontes: "Beta p. 22", texto: "Laceração Profunda: \"perde 2 PV\" e é permanente.", escolha: "Inferência: o máximo de PV cai 2 (acumula). Chaga da Alma: o máximo de PD cai 2 enquanto não for curada.", teste: "executar-ordem2: duplicatas e Laceração" },
    { id: "modNumerico", fontes: "Beta pp. 22–23", texto: "Lesões e traumas dão \"−1 em Percepção\", \"−2 em Vigor\"… num sistema de passos.", escolha: "Modificador numérico somado ao resultado do teste; passos continuam passos.", teste: "executar-ordem2: modificador numérico de lesão" },
    { id: "contadorAlpha", fontes: "Alpha p. 26; Beta pp. 21, 23", texto: "Alpha: DT 7 +3 \"por teste já realizado\"; Beta: \"na cena\".", escolha: "Beta zera no fim da cena; Alpha mantém até o Mestre zerar.", teste: "executar-ordem2: zero de PV/PD nos dois perfis" },
    { id: "fases", fontes: "Beta pp. 12, 18, 24", texto: "A p. 12 diz que a ordem de combate virá depois; a p. 18 a define; a p. 18 também cita uma \"fase tática\" e a p. 24 uma \"fase de suporte\".", escolha: "Três fases (Geral → Distância → Corpo a corpo); tática e suporte = Fase Geral. A ordem é configurável por cena.", teste: "executar-ordem2: fases e simultaneidade" },
    { id: "caido", fontes: "Beta pp. 21 e 24", texto: "A p. 21 dá +1 passo ao corpo a corpo e DT +3 à distância contra caído; a p. 24 diz \"ataques\" +1 passo.", escolha: "Vale a p. 21 (mais específica).", teste: "executar-ordem2: modificadores de ataque" },
    { id: "ajudaPagina", fontes: "Beta p. 11", texto: "Ajuda remete à \"página 20\" (a do Alpha).", escolha: "Passos pela p. 12 do Beta.", teste: "—" },
    { id: "escudo", fontes: "Ficha de Sorcha", texto: "\"reduz a sua rolagem baixa do dano recebido\".", escolha: "Inferência: o dano cai pela RB de Sorcha naquele teste.", teste: "executar-ordem2: escudo de Sorcha" },
    { id: "arsenal", fontes: "Ficha de Muirenn", texto: "Os preparados são de uso único, sem quantidade impressa.", escolha: "Inferência: uma dose de cada, editável.", teste: "—" },
    { id: "diarmaid", fontes: "Ficha de Cormac", texto: "A nota de rodapé de Herança fala em \"Diarmaid\" (nome anterior).", escolha: "Nada muda; só registrado.", teste: "—" },
    { id: "ocupacaoAlan", fontes: "Alpha pp. 15 e 62", texto: "A ficha de Alan diz Cientista; a missão o chama de arqueólogo.", escolha: "Vale a ficha.", teste: "executar-ordem2: presets conferidos" },
  ];

  /* Decisões de implementação (não são regras publicadas). */
  var DECISOES = [
    { id: "tresMaiores", texto: "Com quatro dados de teste, a soma sugerida é a dos três maiores; a pessoa pode escolher outros três (Alpha p. 20; Beta p. 12 não dizem quais)." },
    { id: "sobreviventes", texto: "Crítico, RA e RB leem os dados de teste que sobraram depois do pavor; a escolha dos três afeta só a soma. O dado de pavor nunca entra no crítico. Sem dado sobrando: falha crítica." },
    { id: "pavorPiso", texto: "Controlar o pavor não desce abaixo de d4; o efeito só termina com o resultado 1 (ou pelo Mestre)." },
    { id: "pavorAbraco", texto: "Abraçar o pavor converte o dado em bônus SÓ naquele teste; o pavor continua nos seguintes." },
    { id: "impetoAntes", texto: "Gastar Ímpeto (+d4, +d10) é antes da rolagem." },
    { id: "prontidaoForaDeCombate", texto: "Fora de rodadas, \"uma vez por rodada\" vale uma vez por teste." },
    { id: "passoSemAlvo", texto: "Quando o efeito não diz que dado recebe o passo, a tela pergunta (padrão: a perícia) e registra a escolha." },
    { id: "pvPdGuiada", texto: "Criação guiada: 16 PV e 12 PD de referência inicial de mesa para teste — valores novos, editáveis, não uma dedução do livro." },
    { id: "armadura", texto: "Gastar o ponto de armadura é marcado ao aplicar o dano (uma vez por ocorrência)." },
  ];

  global.RAMAOrdem2Catalogo = {
    VERSAO_DADOS: VERSAO_DADOS,
    FONTES: FONTES, referencia: referencia,
    PERFIS_REGRAS: PERFIS_REGRAS, ORDEM_PERFIS_REGRAS: ORDEM_PERFIS_REGRAS, AMBIENTACOES: AMBIENTACOES,
    ATRIBUTOS: ATRIBUTOS, ORDEM_ATRIBUTOS: ORDEM_ATRIBUTOS, DEGRAUS: DEGRAUS, ESCALA_ATRIBUTO: ESCALA_ATRIBUTO, ESCALA_PERICIA: ESCALA_PERICIA,
    PERICIAS_ALPHA: PERICIAS_ALPHA, PERICIAS_BETA: PERICIAS_BETA, ESPECIALIZACOES: ESPECIALIZACOES, ALIASES: ALIASES,
    listaDePericias: listaDePericias, pericia: pericia, nomeDaPericia: nomeDaPericia, periciaDePesquisa: periciaDePesquisa,
    PERFIS: PERFIS, ORDEM_PERFIS: ORDEM_PERFIS, HABILIDADE_DE_PERFIL: HABILIDADE_DE_PERFIL,
    HABILIDADES: HABILIDADES, OCUPACOES: OCUPACOES, GRAUS_RELACAO: GRAUS_RELACAO,
    FALHA_CRITICA: FALHA_CRITICA, LESOES: LESOES, TRAUMAS: TRAUMAS, daTabela: daTabela, PATAMARES: PATAMARES,
    FASES: FASES, ORDEM_FASES_PADRAO: ORDEM_FASES_PADRAO, ACOES_COMBATE: ACOES_COMBATE, ACOES_LIVRES: ACOES_LIVRES,
    MINIJOGOS: MINIJOGOS, PARANORMAL: PARANORMAL,
    PRESETS: PRESETS, preset: preset, IMPRESSO_BETA: IMPRESSO_BETA,
    DIVERGENCIAS: DIVERGENCIAS, DECISOES: DECISOES,
  };
})(typeof window !== "undefined" ? window : globalThis);
