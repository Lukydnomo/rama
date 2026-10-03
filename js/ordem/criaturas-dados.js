/* =====================================================================
   R.A.M.A. — Ordem Paranormal · catálogo de criaturas (dados)
   =====================================================================
   As ameaças publicadas nos dois livros, como DADOS — sem tela e sem
   regra. Quem lê, confere, busca e transforma em criatura do R.A.M.A.
   é js/ordem/criaturas.js.

   Este arquivo NÃO vem com nenhuma página: ele é carregado na primeira
   vez que alguém abre a biblioteca de criaturas, e nunca vai junto na
   gravação de ficha, combate ou Homebrew. O que entra num combate, num
   aliado ou no Homebrew é uma CÓPIA; corrigir uma entrada daqui não
   muda nada que já foi usado.

   ---------------------------------------------------------------------
   FONTES
   ---------------------------------------------------------------------

     OPRPG  Ordem Paranormal RPG — Livro de Regras (Jambô)
            Criaturas de Sangue (p. 182–206), Morte (p. 207–230),
            Conhecimento (p. 231–254), Energia (p. 255–278), Medo
            (p. 279–283) e Ameaças da Realidade (p. 284–289)
     SAH    Sobrevivendo ao Horror, v1.2 (Jambô)
            Ameaças paranormais (p. 125–157), novas ameaças da Realidade
            (p. 158–165) e as fichas das missões Noite de Compras
            (p. 192–193) e O Terminal do Fim (p. 218)
     AS1    Arquivos Secretos 1, v1.1 (Jambô, pacote de conteúdo oficial)
            Transtornados (p. 28–39), o anulado (p. 53), a Volante e o
            Cangaceiro (p. 68–71) e Agatha como aliada (p. 19)
     AS2    Arquivos Secretos 2, v1.0 (Jambô, pacote de conteúdo oficial)
            Ameaças do Hexatombe (p. 26–32), os Mascarados com as formas
            da intenção assassina (p. 39–64), os agentes (p. 70–86),
            Juan Davo (p. 91–92) e os perfis "como aliado" (p. 41–93)

   As páginas são as do livro, não as do PDF. Os resumos são redação
   própria: guardam os números, as condições e os testes que o jogo
   precisa, e não reproduzem o texto dos livros. Ficaram FORA, de
   propósito: a ficha de exemplo do Marcado (SAH p. 132, um exemplo de
   regra, não uma ameaça), o modelo de espectro (SAH p. 131, uma receita
   que depende da ficha de um Marcado) e os perigos e armadilhas, que
   não são criaturas.

   ---------------------------------------------------------------------
   FORMATO DE UMA ENTRADA
   ---------------------------------------------------------------------

     id            estável: <livro>.criatura.<nome> (op, sah, as1, as2, as3).
                   Nunca muda, mesmo que o nome mude. Variantes têm o id
                   da base mais um sufixo (op.criatura.o-anfitriao.liber)
     livro, pagina a referência impressa
     natureza      paranormal | humana | animal — é por ela que pessoas
                   e animais usam o mesmo modelo e ainda assim se separam
                   na busca
     tipo          a linha de tipo do livro (Criatura, Relíquia, Pessoa,
                   Animal, Animal (enxame))
     tamanho       como impresso; null quando a ficha não diz
     elementos     a lista de elementos, na ordem do cabeçalho
     vd            número; null quando a ficha traz nível em vez de VD
     nivel         "Nível 3 · NEX 10%" nas fichas de NPC de missão
     presenca      { dt, dano, imune } — dano mental, sem o "mental"
     percepcao, iniciativa, fortitude, reflexos, vontade
                   expressões no formato do motor ("3d20+10"; "-2d20"
                   é o pior de dois d20). O "O" do livro é o d20
     defesa, pv, machucado, pe
                   números como impressos
     resistencias  [[valor, tipo, tipo...]] — "dano" quer dizer qualquer
                   tipo de dano
     imunidades, vulnerabilidades
                   listas de texto
     atributos     [AGI, FOR, INT, PRE, VIG]; "—" = não se aplica
     pericias      [[nome, expressão]]
     deslocamento  [[metros, quadrados, modo]]; sem modo = em terra
     estados       contadores de fase ou de recurso da criatura
                   ({ id, nome, maximo, inicial, altera })
     habilidades   passivas; acoes: padrão, movimento, completa, livre,
                   reação — com ataques e rolagens próprios
     enigma        { texto, efeito, altera } — `altera` só existe quando
                   o livro dá números para o efeito
     notas         divergências do livro e leituras feitas aqui
     formas        (AS2) fichas da MESMA ocorrência, como a forma tomada
                   pela intenção assassina: { id, nome, pagina, vd, pv,
                   machucado, defesa, testes, pericias, habilidades,
                   acoes, ativacao, notas } — valores publicados, finais
     aliada, ficha perfil "como aliado" (sem PV/PE) e a ficha de ameaça
                   da mesma pessoa

   VALORES ESPECIAIS: 0 é zero; null (ou ausente) é "não informado";
   "—" é "não se aplica"; qualquer outro texto ("veja texto") é exibido
   como está e nunca é rolado. As estatísticas publicadas já incluem os
   modificadores da criatura: nada aqui é somado de novo.

   ---------------------------------------------------------------------
   LEITURAS DO LIVRO (pendências conferidas)
   ---------------------------------------------------------------------

   Onde o texto impresso não fecha, a entrada traz o valor como
   publicado e uma nota explicando a leitura: dados sem tipo ("4d+10",
   "5D+30") lidos como d20; o machucado do Sempiternal (445); o
   deslocamento do Tempestuoso (24 m | 12); a Presença do Viajante; os
   PV do Anfitrião ("01413"); o Aterrorizar do espectro de exemplo
   contra a Tabela 3.1; o bônus ilegível da Voz Guia do Religioso.
   ===================================================================== */

(function (global) {
  "use strict";

  var OP = "OPRPG";
  var SAH = "SAH";
  var AS1 = "AS1";
  var AS2 = "AS2";
  var AS3 = "AS3";

  var SA = "sangue";
  var MO = "morte";
  var CO = "conhecimento";
  var EN = "energia";
  var ME = "medo";

  function comExtra(base, extra) {
    if (extra) Object.keys(extra).forEach(function (k) { base[k] = extra[k]; });
    return base;
  }

  /* Um ataque: alcance como o livro escreve, quantidade (o "x2"), o
     teste e o dano — texto, ou lista de partes quando o golpe causa
     dois tipos ao mesmo tempo. extra: { critico: "19/x3", nota }. */
  function at(nome, alcance, quantidade, teste, dano, extra) {
    return comExtra({
      nome: nome, alcance: alcance, quantidade: quantidade, teste: teste,
      dano: Array.isArray(dano) ? dano : [dano],
    }, extra);
  }

  /* Habilidade passiva. extra: { rolagens, resistencia, limite, requer,
     marcador, custo, recarga }. */
  function hab(nome, texto, extra) { return comExtra({ nome: nome, texto: texto }, extra); }

  /* Ação: padrao | movimento | completa | livre | reacao. */
  function acao(tipo, nome, texto, extra) { return comExtra({ tipo: tipo, nome: nome, texto: texto }, extra); }

  /* A ação agredir: uma lista de ataques feitos na MESMA ação. */
  function agredir(ataques, extra) {
    var e = extra || {};
    var base = { tipo: "padrao", nome: e.nome || "Agredir", texto: e.texto || "", ataques: ataques };
    Object.keys(e).forEach(function (k) { if (k !== "nome" && k !== "texto") base[k] = e[k]; });
    return base;
  }

  /* Rolagens soltas de uma habilidade ou ação. */
  function teste(rotulo, expressao) { return { tipo: "teste", rotulo: rotulo, expressao: expressao }; }
  function dano(rotulo, partes) { return { tipo: "dano", rotulo: rotulo, partes: Array.isArray(partes) ? partes : [partes] }; }
  function soma(rotulo, expressao) { return { tipo: "soma", rotulo: rotulo, expressao: expressao }; }

  /* Perfil "como aliado" do Arquivos Secretos 2: benefícios de aliado
     (OPRPG p. 170), sem PV, PE nem ficha de combate. */
  function aliadoAs2(chave, nome, pagina, paginaDaFicha, descricao, habilidades, tipo, notas) {
    var t = tipo || "Aliado";
    return {
      id: "as2.criatura." + chave + "-aliado", livro: AS2, pagina: pagina, aliada: true,
      nome: nome + " (" + t.toLowerCase() + ")", natureza: "humana", tipo: t, tamanho: null, categoria: "Aliados",
      nivel: t + " (OPRPG p. 170)", elementos: [], vd: null,
      descricao: descricao,
      ficha: { id: "as2.criatura." + chave, nome: nome, pagina: paginaDaFicha },
      notas: ["Perfil “como aliado”: são os benefícios para quem o acompanha, sem estatísticas de combate. A ficha de ameaça é outra entrada."].concat(notas || []),
      habilidades: habilidades,
      acoes: [],
    };
  }

  /* Perfil "como aliado" do Arquivos Secretos 3 (p. 116-118). */
  function aliadoAs3(chave, nome, pagina, paginaDaFicha, descricao, habilidades, tipo, notas) {
    var t = tipo || "Aliado";
    return {
      id: "as3.criatura." + chave + "-aliado", livro: AS3, pagina: pagina, aliada: true,
      nome: nome + " (" + t.toLowerCase() + ")", natureza: "humana", tipo: t, tamanho: null, categoria: "Aliados",
      nivel: t + " (OPRPG p. 170)", elementos: [], vd: null,
      descricao: descricao,
      ficha: { id: "as3.criatura." + chave, nome: nome, pagina: paginaDaFicha },
      notas: ["Perfil “como aliado”: são os benefícios para quem o acompanha, sem estatísticas de combate. A ficha de ameaça é outra entrada.",
        "Na ficha, o painel do Arquivos Secretos 3 liga os bônus fixos deste aliado enquanto ele acompanha o personagem."].concat(notas || []),
      habilidades: habilidades,
      acoes: [],
    };
  }

  /* Aliado animal especial (AS3 p. 133): sem ficha de ameaça publicada.
     O id leva "-animal" para não colidir com a pessoa de mesmo nome. */
  function aliadoAnimal(chave, nome, descricao, habilidades) {
    return {
      id: "as3.criatura." + chave + "-animal", livro: AS3, pagina: 133, aliada: true,
      nome: nome + " (animal)", natureza: "animal", tipo: "Animal", tamanho: null, categoria: "Animais treinados",
      nivel: "Aliado animal (OPRPG p. 170)", elementos: [], vd: null,
      descricao: descricao,
      notas: [
        "Aliado animal especial: pode substituir as regras de um aliado animal recebido por habilidade (AS3 p. 132).",
        "Animais não são afetados por Presença Perturbadora. Como ficha de ameaça da realidade, o VD acompanha o NEX do dono (p. 134) — ver Animais Treinados no painel.",
      ],
      habilidades: habilidades,
      acoes: [],
    };
  }

  /* Hora do Show (PSIKOLERA, AS3 p. 11-37): a forma mascarada. A Defesa
     e os PV são os impressos entre parênteses; ao entrar, +20 PV atuais.
     As ações são as da ficha com as alterações listadas aplicadas. */
  function musicaDoDiabo() {
    return acao("livre", "Música do Diabo", "Só de máscara. Começa a tocar a sua parte: todos os membros do PSIKOLERA recebem dano extra do mesmo tipo sempre que causam dano, conforme quantos tocam — 1: +1d4; 2: +1d6; 3: +1d8; 4: +1d10; 5 (todos): +1d12. A ordem é Franco (guitarra), Cindy (baixo), Alê (teclado), Eloy (bateria) e Caio (vocal).",
      { rolagens: [dano("1 tocando", "1d4"), dano("2 tocando", "1d6"), dano("3 tocando", "1d8"), dano("4 tocando", "1d10"), dano("5 tocando", "1d12")] });
  }
  function mascara(testeDaManobra) {
    return hab("A máscara", "Pode ser arrancada ou destruída. Arrancar: se perder numa manobra de desarmar (teste " + testeDaManobra + ") contra quem tenta tirá-la, perde a Hora do Show. Destruir: se perder numa manobra de quebrar (teste " + testeDaManobra + "), a máscara sofre o dano (RD 10, 5 PV); quebrada, perde a Hora do Show. Perdendo, volte a ocorrência à ficha de partida.",
      { rolagens: [teste("Resistir à manobra", testeDaManobra)] });
  }
  function horaDoShow(pessoa, pagina, defesa, pv, testeDaManobra, habilidades, acoes, notas) {
    return {
      id: "hora-do-show", nome: "Hora do Show (mascarado)", pagina: pagina, vd: 80, defesa: defesa, pv: pv, somaAtuais: 20,
      ativacao: "Hora do Show (ação padrão): " + pessoa + " coloca a máscara — +5 nos testes de ataque, +10 na Defesa, +20 PV máximos e atuais, +5 na DT das habilidades, +2 dados de dano do mesmo tipo e Música do Diabo.",
      habilidades: habilidades.concat([mascara(testeDaManobra)]),
      acoes: acoes.concat([musicaDoDiabo()]),
      notas: ["O livro não imprime a ficha mascarada: as ações são as da ficha com +5 no ataque, +2 dados de dano e +5 na DT aplicados. Testes, perícias e o PV de machucado continuam os da ficha."].concat(notas || []),
    };
  }

  var CRIATURAS = [
    /* ---------------- OPRPG · Criaturas de Sangue (p. 182–203) ---------------- */

    {
      id: "op.criatura.aberracao-de-carne", livro: OP, pagina: 182,
      nome: "Aberração de Carne", natureza: "paranormal", tipo: "Criatura", tamanho: "Grande",
      elementos: [SA], vd: 40,
      descricao: "Dois corpos fundidos num experimento fracassado; a dor das duas cobaias virou fúria de Sangue.",
      presenca: { dt: 15, dano: "3d6", imune: "NEX 30%+" },
      percepcao: "1d20+5", iniciativa: "1d20", sentidos: ["percepção às cegas"],
      defesa: 19, fortitude: "3d20+10", reflexos: "1d20", vontade: "1d20",
      pv: 70, machucado: 35,
      resistencias: [[5, "balístico", "impacto", "perfuração"], [10, "Sangue"]],
      vulnerabilidades: ["Morte"],
      atributos: [1, 3, 0, 1, 3],
      deslocamento: [[9, 6]],
      acoes: [
        agredir([at("Pancada", "corpo a corpo", 2, "3d20+10", "2d6+6 impacto")]),
        acao("reacao", "Agarrão", "Ao acertar uma pancada, pode tentar agarrar o alvo (teste 3d20+12). Mantém até dois personagens agarrados.",
          { rolagens: [teste("Agarrar", "3d20+12")] }),
        acao("movimento", "Abocanhar", "Leva até dois personagens que esteja agarrando para a boca central (continuam agarrados). Ao serem abocanhados e no início de cada turno da aberração em que continuarem ali, sofrem 3d6 de dano de perfuração (Fortitude DT 15 reduz à metade). Um personagem adjacente pode gastar uma ação padrão e um teste de Atletismo DT 20 para tirar outro de dentro da boca.",
          { rolagens: [dano("Dano na boca", "3d6 perfuração")], resistencia: "Fortitude DT 15 reduz à metade" }),
      ],
    },

    {
      id: "op.criatura.aniquilacao", livro: OP, pagina: 186,
      nome: "Aniquilação", natureza: "paranormal", tipo: "Criatura", tamanho: "Colossal",
      elementos: [SA, ME], vd: 380,
      descricao: "A maior criatura registrada: um apocalipse de Sangue com braços, tentáculos, asas e espinhos, que talvez apenas durma.",
      presenca: { dt: 45, dano: "9d8" },
      percepcao: "4d20+20", iniciativa: "4d20+20", sentidos: ["percepção às cegas"],
      defesa: 58, fortitude: "5d20+30", reflexos: "4d20+25", vontade: "4d20+20",
      pv: 1200, machucado: 600,
      resistencias: [[50, "dano"]],
      vulnerabilidades: ["Morte"],
      atributos: [4, 5, 3, 4, 5],
      pericias: [["Atletismo", "5d20+20"]],
      deslocamento: [[15, 10]],
      acoes: [
        agredir([
          at("Garras", "corpo a corpo", 2, "5d20+40", "4d10+30 Sangue"),
          at("Tentáculos Espinhentos", "corpo a corpo", 2, "5d20+40", "2d12+30 Sangue"),
        ]),
        agredir([at("Disparo de Espinhos", "médio", 3, "4d20+40", "2d10+20 Sangue")], { nome: "Agredir (distância)" }),
        acao("reacao", "Agarrão", "Ao acertar tentáculos espinhentos, pode tentar agarrar o alvo (teste 5d20+50). Mantém até quatro personagens agarrados.",
          { rolagens: [teste("Agarrar", "5d20+50")] }),
        acao("reacao", "Instinto Aniquilador", "Sempre que um personagem em alcance curto se desloca mais de 3 m, a aniquilação faz um ataque de tentáculos espinhentos contra ele."),
        acao("livre", "Apertar e Destruir", "No início do turno, aperta os personagens agarrados: 40 de dano de Sangue em cada um.",
          { rolagens: [dano("Aperto", "40 Sangue")] }),
        acao("movimento", "Bater as Asas", "Som ensurdecedor: cada personagem em alcance longo sofre 8d6 de dano mental, é empurrado 6 m e fica atordoado por 1 rodada (Fortitude DT 40 reduz o dano à metade e evita os efeitos).",
          { rolagens: [dano("Dano mental", "8d6 mental")], resistencia: "Fortitude DT 40 reduz à metade e evita os efeitos" }),
        acao("movimento", "Estrangulamento Final", "Desloca-se 15 m; quem ficar adjacente durante o trajeto fica agarrado e asfixiado (Reflexos DT 30 evita). Para escapar: ação padrão e Reflexos DT 30.",
          { resistencia: "Reflexos DT 30 evita" }),
        acao("completa", "Tempestade de Espinhos", "Todos os personagens em alcance médio sofrem 20d6+20 de dano de Sangue (Reflexos DT 40 reduz à metade). Uma vez por cena; depois de usar, perde o Disparo de Espinhos até o fim da cena.",
          { rolagens: [dano("Tempestade", "20d6+20 Sangue")], resistencia: "Reflexos DT 40 reduz à metade", limite: [1, "cena"] }),
      ],
      enigma: {
        texto: "O enigma da Aniquilação é desconhecido: o mestre define o que é preciso descobrir.",
        efeito: "Resolvido, ela perde a resistência a dano e a habilidade Tempestade de Espinhos.",
        altera: { resistencias: [], desativar: ["Tempestade de Espinhos"] },
      },
    },

    {
      id: "op.criatura.carente", livro: OP, pagina: 188,
      nome: "Carente", natureza: "paranormal", tipo: "Criatura", tamanho: "Grande",
      elementos: [SA, MO], vd: 300,
      descricao: "Nascido de uma história de terror famosa: imita uma criança perdida batendo à porta e, quando a porta se abre, devora os órgãos de quem já foi mãe.",
      presenca: { dt: 35, dano: "7d8", imune: "NEX 90%+" },
      percepcao: "3d20+10", iniciativa: "4d20+15", sentidos: ["percepção às cegas"],
      defesa: 40, fortitude: "4d20+25", reflexos: "4d20+25", vontade: "3d20+15",
      pv: 700, machucado: 350,
      resistencias: [[20, "balístico", "impacto", "perfuração", "Sangue"]],
      vulnerabilidades: ["Morte"],
      atributos: [4, 4, 2, 3, 4],
      pericias: [["Atletismo", "4d20+20"], ["Enganação", "3d20+15"]],
      deslocamento: [[12, 8]],
      habilidades: [
        hab("Carência", "Qualquer ser que já tenha passado por uma gestação recebe +1 dado em ataques contra o carente — e o carente recebe +1 dado em ataques contra esse ser."),
        hab("Regeneração de Sangue", "Cura acelerada 20. Se ficar inconsciente ou sofrer dano de Energia, a regeneração para até o fim da cena.",
          { marcador: "Suspensa nesta cena" }),
      ],
      acoes: [
        agredir([
          at("Garras de Sangue", "corpo a corpo", 2, "4d20+35", "2d8+20 Sangue"),
          at("Ferrão de Sangue", "corpo a corpo", 1, "4d20+35", "2d12+20 Sangue"),
          at("Tentáculo", "corpo a corpo", 1, "4d20+35", "2d8+20 Sangue"),
        ]),
        acao("movimento", "Forma Infantil", "Volta ao corpo da criança para passar por espaços pequenos. Não consegue abrir sozinho a primeira porta de um lugar; depois que ela é aberta e ele sai da forma infantil, a restrição deixa de valer."),
        acao("reacao", "Rasteira de Tentáculo", "Uma vez por rodada, quando fica adjacente a dois ou mais seres, ataca um deles com o tentáculo; se acertar, a vítima fica caída e é empurrada 6 m.",
          { limite: [1, "rodada"] }),
        acao("livre", "Sugada Mortal", "Um ser atingido pelo ferrão de sangue fica debilitado e enjoado até o fim da cena (Fortitude DT 35 evita).",
          { resistencia: "Fortitude DT 35 evita" }),
        acao("movimento", "Você é Minha Mamãe?", "Abraça um ser adjacente com o corpo de criança: ele fica paralisado até ser solto (Reflexos DT 25 evita). Pode manter o abraço indefinidamente, mas solta o alvo se sofrer dano de Energia.",
          { resistencia: "Reflexos DT 25 evita" }),
      ],
    },

    {
      id: "op.criatura.dama-de-sangue", livro: OP, pagina: 190,
      nome: "Dama de Sangue", natureza: "paranormal", tipo: "Criatura", tamanho: "Enorme",
      elementos: [SA, ME, MO], vd: 60,
      descricao: "Um corpo humano partido e fundido a plantas, com sete tentáculos floridos; surge de um ritual de sacrifício ligado ao mito do Serafim Escarlate.",
      presenca: { dt: 20, dano: "3d6", imune: "NEX 35%+" },
      percepcao: "2d20+10", iniciativa: "2d20", sentidos: ["percepção às cegas"],
      defesa: 20, fortitude: "2d20+10", reflexos: "2d20+5", vontade: "2d20",
      pv: 105, machucado: 52,
      resistencias: [[10, "balístico", "impacto", "perfuração"], [20, "Sangue"]],
      vulnerabilidades: ["Morte"],
      atributos: [2, 3, 1, 2, 2],
      deslocamento: [[12, 8]],
      estados: [{ id: "corpos", nome: "Corpos consumidos", maximo: 7 }],
      habilidades: [
        hab("Consumir", "Invocada sem as habilidades de flor. A cada corpo consumido (ação padrão, adjacente ao cadáver) ganha a próxima, na ordem da ficha: Arremessar, Chuva de Ácido, Espinhos, Grito Devastador, Miasma Fétido, Prisão de Tentáculos e Visão Macabra. Enquanto não tiver consumido sete corpos, usa suas ações para ir até um e consumi-lo."),
      ],
      acoes: [
        agredir([at("Tentáculo", "corpo a corpo", 2, "3d20+10", "2d6+5 impacto")]),
        acao("movimento", "Arremessar (Flor Rosa)", "Ergue um personagem em alcance curto e o arremessa a outro ponto em alcance curto: 2d6 de impacto e caído (Reflexos DT 15 evita tudo). Murcha com fertilizante: perde a habilidade e sofre −1 dado em Luta.",
          { requer: ["corpos", 1], marcador: "Murcha", rolagens: [dano("Arremesso", "2d6 impacto")], resistencia: "Reflexos DT 15 evita" }),
        acao("movimento", "Chuva de Ácido (Flor Vermelha)", "Todos em alcance curto sofrem 4d4 de dano químico (Fortitude DT 15 reduz à metade). Murcha com agrotóxico: perde a habilidade e as resistências a dano caem 5.",
          { requer: ["corpos", 2], marcador: "Murcha", rolagens: [dano("Ácido", "4d4 químico")], resistencia: "Fortitude DT 15 reduz à metade" }),
        acao("movimento", "Espinhos (Flor Amarela)", "Até três alvos em alcance médio sofrem 2d8 de perfuração cada (Reflexos DT 15 reduz à metade). Murcha ao sofrer 10 de dano de fogo num único efeito: perde a habilidade e sofre −1 dado em Reflexos.",
          { requer: ["corpos", 3], marcador: "Murcha", rolagens: [dano("Espinhos (por alvo)", "2d8 perfuração")], resistencia: "Reflexos DT 15 reduz à metade" }),
        acao("movimento", "Grito Devastador (Flor Roxa)", "Todos em alcance curto ficam confusos (Vontade DT 15 evita); quem falha repete o teste no fim do próprio turno. Murcha com o bulbo de bravo purpulis: perde a habilidade e sofre −1 dado em Vontade.",
          { requer: ["corpos", 4], marcador: "Murcha", resistencia: "Vontade DT 15 evita" }),
        acao("padrao", "Miasma Fétido (Flor Azul)", "Todos em alcance curto ficam enjoados por 1d4+1 rodadas (Fortitude DT 15 reduz a 1 rodada). Murcha com dano de eletricidade ou Energia: perde a habilidade e o deslocamento cai 6 m.",
          { requer: ["corpos", 5], marcador: "Murcha", rolagens: [soma("Rodadas enjoado", "1d4+1")], resistencia: "Fortitude DT 15 reduz a 1 rodada" }),
        acao("padrao", "Prisão de Tentáculos (Flor Verde)", "Um personagem em alcance curto fica agarrado até que os tentáculos sejam destruídos (acertados automaticamente, 20 PV). Murcha se molhada em água corrente: perde a habilidade e a Defesa cai 5.",
          { requer: ["corpos", 6], marcador: "Murcha" }),
        acao("movimento", "Visão Macabra (Flor Laranja)", "Todos em alcance médio sofrem 1d6 de dano mental (Vontade DT 15 reduz à metade). Murcha ao sofrer 10 de dano de corte num único efeito: perde a habilidade e os PV totais caem 20.",
          { requer: ["corpos", 7], marcador: "Murcha", rolagens: [dano("Dano mental", "1d6 mental")], resistencia: "Vontade DT 15 reduz à metade" }),
      ],
      enigma: {
        texto: "Invocada pelo sacrifício de sete pessoas para o desabrochar de sete flores; cada flor tem a própria fraqueza, descrita na habilidade correspondente.",
        efeito: "Cada flor murcha separadamente — use o marcador “Murcha” de cada habilidade.",
      },
    },

    {
      id: "op.criatura.enpap-x", livro: OP, pagina: 193,
      nome: "Enpap-X", natureza: "paranormal", tipo: "Criatura", tamanho: "Grande",
      elementos: [SA, CO], vd: 180,
      descricao: "Um prisioneiro torturado e acorrentado até a mente virar ódio; liberto e ferido, expande-se num monstro de quatro braços em busca de vingança.",
      presenca: { dt: 25, dano: "6d6", imune: "NEX 60%+" },
      percepcao: "2d20+10", iniciativa: "2d20+10", sentidos: ["percepção às cegas"],
      defesa: 36, fortitude: "3d20+15", reflexos: "2d20+15", vontade: "2d20+10",
      pv: 360, machucado: 180,
      resistencias: [[10, "balístico", "impacto", "perfuração"], [20, "Sangue"]],
      vulnerabilidades: ["Morte"],
      atributos: [2, 4, 1, 2, 3],
      deslocamento: [[12, 8]],
      estados: [{ id: "transformado", nome: "Transformado (usa esta ficha)", maximo: 1 }],
      forma: { inicial: "op.criatura.existido", nota: "Começa o combate com a ficha do Existido (p. 240). Ao chegar a 0 PV, em vez de morrer, transforma-se: passa a usar esta ficha (inclusive a Presença Perturbadora) com 360 PV." },
      habilidades: [
        hab("Transformação", "Começa como um existido comum (ficha da p. 240). Reduzido a 0 PV, não morre: passa a usar esta ficha, gera a Presença Perturbadora e recupera todos os PV (360)."),
      ],
      acoes: [
        agredir([at("Socão", "corpo a corpo", 4, "4d20+20", "2d10+10 impacto")]),
        agredir([at("Correntes", "curto", 3, "2d20+15", "2d8+10 impacto")], { nome: "Agredir (distância)" }),
        acao("livre", "Acorrentar", "Ao acertar as correntes num personagem Médio ou menor, pode agarrá-lo à distância (teste 2d20+17). No começo do turno, estrangula cada agarrado assim: 4d6 de impacto. Mantém até dois.",
          { rolagens: [teste("Agarrar", "2d20+17"), dano("Estrangular", "4d6 impacto")] }),
        acao("reacao", "Forma Desencadeada", "Num acerto crítico com socão ou corrente, pode derrubar o alvo ou empurrá-lo 3 m."),
        acao("reacao", "Crescer", "Cada socão que acerta dá +1d6 cumulativo nas próximas rolagens de dano até o fim do turno (+1d6 no segundo, +2d6 no terceiro, +3d6 no quarto).",
          { rolagens: [dano("+1d6", "1d6"), dano("+2d6", "2d6"), dano("+3d6", "3d6")] }),
        acao("movimento", "Marcas do Terror", "As marcas brilham: todos em alcance curto sofrem 4d6 de dano mental (Vontade DT 25 reduz à metade). Quem passa fica imune a esta habilidade até o fim da cena.",
          { rolagens: [dano("Dano mental", "4d6 mental")], resistencia: "Vontade DT 25 reduz à metade" }),
      ],
    },

    {
      id: "op.criatura.kerberos", livro: OP, pagina: 194,
      nome: "Kerberos", natureza: "paranormal", tipo: "Criatura", tamanho: "Enorme",
      elementos: [SA], vd: 340,
      descricao: "O cão de três cabeças e seis patas que guarda a entrada de um “Inferno” de Sangue; brutal e sem estratégia, só protege o seu ponto.",
      presenca: { dt: 35, dano: "10d6", imune: "NEX 99%+" },
      percepcao: "3d20+20", iniciativa: "4d20+15", sentidos: ["percepção às cegas"],
      defesa: 46, fortitude: "5d20+25", reflexos: "4d20+20", vontade: "3d20+15",
      pv: 1150, machucado: 575,
      resistencias: [[20, "balístico", "impacto", "perfuração", "Sangue"]],
      vulnerabilidades: ["Morte"],
      atributos: [4, 5, 0, 3, 5],
      pericias: [["Atletismo", "5d20+25"]],
      deslocamento: [[18, 12]],
      habilidades: [
        hab("Ataque Flexível", "Faz até quatro ataques por rodada, misturando corpo a corpo e distância, mas nunca o mesmo ataque mais de três vezes na mesma rodada."),
      ],
      acoes: [
        agredir([at("Mordida", "corpo a corpo", 1, "5d20+40", "4d12+30 Sangue")]),
        agredir([at("Disparo de Espinhos", "médio", 1, "4d20+35", "4d8+20 Sangue")], { nome: "Agredir (distância)" }),
        acao("livre", "Devorar", "Uma vez por cena, ao reduzir um personagem a 0 PV com a mordida, pode devorá-lo: morte instantânea e recupera PV iguais à metade dos PV totais da vítima (Fortitude DT 40 evita).",
          { limite: [1, "cena"], resistencia: "Fortitude DT 40 evita" }),
        acao("completa", "Derrubar e Devorar", "Tenta derrubar um personagem a até 3 m (teste 5d20+45); se vencer, faz três mordidas contra ele, com dano 4d12+40 cada.",
          { rolagens: [teste("Derrubar", "5d20+45"), dano("Mordida reforçada", "4d12+40 Sangue")] }),
      ],
    },

    {
      id: "op.criatura.minotauro", livro: OP, pagina: 197,
      nome: "Minotauro", natureza: "paranormal", tipo: "Criatura", tamanho: "Grande",
      elementos: [SA], vd: 280,
      descricao: "Besta bípede de mais de três metros, com um machado fundido ao braço, que caça vítimas no próprio labirinto.",
      presenca: { dt: 35, dano: "8d6", imune: "NEX 80%+" },
      percepcao: "3d20+20", iniciativa: "4d20+15", sentidos: ["percepção às cegas"],
      defesa: 44, fortitude: "5d20+20", reflexos: "4d20+15", vontade: "3d20+10",
      pv: 750, machucado: 375,
      resistencias: [[20, "balístico", "impacto", "perfuração", "Sangue"]],
      vulnerabilidades: ["Morte"],
      atributos: [4, 5, 1, 3, 5],
      pericias: [["Atletismo", "5d20+20"]],
      deslocamento: [[12, 8]],
      acoes: [
        agredir([
          at("Chifres", "corpo a corpo", 1, "5d20+30", "6d12+20 perfuração"),
          at("Machado", "corpo a corpo", 2, "5d20+32", "4d12+20 corte"),
        ]),
        acao("livre", "Cravar Chifres", "Ao acertar uma investida com os chifres, crava-os no alvo, que fica agarrado; enquanto isso não ataca com os chifres. No fim de cada turno da vítima ainda presa, ela sofre 4d12+20 de dano de Sangue.",
          { rolagens: [dano("Chifres cravados", "4d12+20 Sangue")] }),
      ],
    },
    {
      id: "op.criatura.mulher-afogada", livro: OP, pagina: 199,
      nome: "Mulher Afogada", natureza: "paranormal", tipo: "Criatura", tamanho: "Grande",
      elementos: [SA, EN, ME], vd: 140,
      descricao: "Lenda urbana ligada a mulheres que morreram afogadas; anda como Sangue líquido pelos encanamentos e puxa vítimas para dentro dos canos.",
      presenca: { dt: 25, dano: "4d8", imune: "NEX 50%+" },
      percepcao: "2d20+5", iniciativa: "4d20+10", sentidos: ["percepção às cegas"],
      defesa: 28, fortitude: "3d20+10", reflexos: "4d20+10", vontade: "2d20+5",
      pv: 240, machucado: 120,
      resistencias: [[10, "balístico", "Energia", "impacto", "perfuração"], [20, "Sangue"]],
      vulnerabilidades: ["Morte"],
      atributos: [4, 3, 2, 2, 3],
      deslocamento: [[9, 6], [36, 24, "forma líquida"]],
      habilidades: [
        hab("Forma de Sangue", "Começa na forma líquida: resistência a balístico, corte, impacto, perfuração e Sangue 20; deslocamento 36 m; atravessa canos, frestas e orifícios; e ganha Afogar em Sangue, Arrancar Sangue e Invadir Órgãos. Perde esta habilidade quando é invocada na forma física (depois que o enigma é desvendado)."),
      ],
      acoes: [
        agredir([
          at("Mordida", "corpo a corpo", 1, "3d20+15", "4d8+8 perfuração"),
          at("Garras", "corpo a corpo", 2, "4d20+15", "4d6+6 corte"),
        ]),
        agredir([at("Jato de Sangue", "curto", 1, "4d20+10", "4d8+8 Sangue")], { nome: "Agredir (distância)" }),
        acao("movimento", "Sugar Sangue", "Devora o corpo de um personagem adjacente que morreu nesta cena e recupera 40 PV."),
        acao("padrao", "Afogar em Sangue (forma de Sangue)", "Invade nariz e boca de um personagem em alcance curto, que fica asfixiado. No início de cada turno dele, Fortitude DT 24 encerra a condição e expulsa a criatura, em forma líquida, para um espaço adjacente.",
          { resistencia: "Fortitude DT 24 encerra" }),
        acao("reacao", "Arrancar Sangue (forma de Sangue)", "Sempre que é arrancada de um corpo que asfixiava com Afogar em Sangue, leva parte do sangue da vítima: 6d6 de dano de Sangue e a vítima fica fraca.",
          { rolagens: [dano("Sangue arrancado", "6d6 Sangue")] }),
        acao("movimento", "Invadir Órgãos (forma de Sangue)", "Invade órgãos vitais de quem está asfixiando com Afogar em Sangue: 6d6 de dano de Sangue e o personagem fica enjoado.",
          { rolagens: [dano("Órgãos invadidos", "6d6 Sangue")] }),
      ],
      enigma: {
        texto: "Toda fonte de água ligada à rede hidráulica é um ponto de invocação; enfrentá-la direto é inútil, porque ela foge e se recupera pelos canos. É preciso bloquear todas as saídas de água, fechar o registro do local e abrir todas as torneiras, forçando a manifestação física sem rota de fuga.",
        efeito: "Desvendado, ela é invocada na forma física e perde a Forma de Sangue e as três ações dessa forma.",
        altera: { desativar: ["Forma de Sangue", "Afogar em Sangue (forma de Sangue)", "Arrancar Sangue (forma de Sangue)", "Invadir Órgãos (forma de Sangue)"] },
      },
    },

    {
      id: "op.criatura.tita-de-sangue", livro: OP, pagina: 201,
      nome: "Titã de Sangue", natureza: "paranormal", tipo: "Criatura", tamanho: "Colossal",
      elementos: [SA], vd: 220,
      descricao: "A maior forma de zumbi de sangue: mais de quatro metros de carne endurecida, surgida de massacres ou de alguém muito exposto ao paranormal devorado pelo Sangue.",
      presenca: { dt: 30, dano: "7d6", imune: "NEX 70%+" },
      percepcao: "1d20+15", iniciativa: "2d20+10", sentidos: ["percepção às cegas"],
      defesa: 35, fortitude: "4d20+15", reflexos: "2d20+10", vontade: "1d20+10",
      pv: 550, machucado: 275,
      resistencias: [[20, "balístico", "impacto", "perfuração", "Sangue"]],
      vulnerabilidades: ["Morte"],
      atributos: [2, 5, 1, 1, 4],
      deslocamento: [[12, 8]],
      habilidades: [
        hab("Sede de Sangue", "Os ataques do titã causam +4d6 de dano de Sangue contra personagens machucados ou sangrando.",
          { rolagens: [dano("Sede de Sangue", "4d6 Sangue")] }),
      ],
      acoes: [
        agredir([
          at("Mordida", "corpo a corpo", 1, "5d20+25", "4d12+10 perfuração"),
          at("Garras", "corpo a corpo", 2, "5d20+25", "4d8+10 corte"),
        ]),
        acao("livre", "Estraçalhar", "Ao acertar a mordida, estraçalha o alvo: 4d12+10 de perfuração e sangrando até o fim da cena (Reflexos DT 30 reduz o dano à metade e evita a condição).",
          { rolagens: [dano("Estraçalhar", "4d12+10 perfuração")], resistencia: "Reflexos DT 30 reduz à metade e evita a condição" }),
      ],
    },

    {
      id: "op.criatura.zumbi-de-sangue", livro: OP, pagina: 202,
      nome: "Zumbi de Sangue", natureza: "paranormal", tipo: "Criatura", tamanho: "Médio",
      elementos: [SA], vd: 20,
      descricao: "Cadáver de morte brutal tomado pelo Sangue: cego, guiado pela dor das correntes de ar, age como fera descontrolada.",
      presenca: { dt: 15, dano: "2d6", imune: "NEX 25%+" },
      percepcao: "1d20+10", iniciativa: "2d20+5", sentidos: ["percepção às cegas"],
      defesa: 17, fortitude: "2d20+5", reflexos: "2d20+5", vontade: "1d20+5",
      pv: 45, machucado: 22,
      resistencias: [[5, "balístico", "impacto", "perfuração"], [10, "Sangue"]],
      vulnerabilidades: ["Morte"],
      atributos: [2, 2, 0, 1, 2],
      deslocamento: [[9, 6]],
      acoes: [
        agredir([at("Garras", "corpo a corpo", 2, "2d20+5", "1d6+5 corte")]),
      ],
    },

    {
      id: "op.criatura.zumbi-de-sangue-bestial", livro: OP, pagina: 203,
      nome: "Zumbi de Sangue Bestial", natureza: "paranormal", tipo: "Criatura", tamanho: "Grande",
      elementos: [SA], vd: 100,
      descricao: "Versão quadrúpede e muito maior do zumbi de sangue, com o crânio aberto numa bocarra; caça com estratégia e prefere emboscadas.",
      presenca: { dt: 20, dano: "4d6", imune: "NEX 45%+" },
      percepcao: "2d20+10", iniciativa: "2d20+15", sentidos: ["percepção às cegas"],
      defesa: 23, fortitude: "3d20+10", reflexos: "2d20+5", vontade: "2d20+5",
      pv: 200, machucado: 100,
      resistencias: [[5, "balístico", "impacto", "perfuração"], [10, "Sangue"]],
      vulnerabilidades: ["Morte"],
      atributos: [2, 3, 0, 2, 3],
      pericias: [["Furtividade", "2d20+13"]],
      deslocamento: [[12, 8]],
      habilidades: [
        hab("Furtivo e Letal", "Contra um personagem desprevenido, recebe +1 dado nos testes de ataque e, se acertar, cada ataque causa dois dados de dano adicionais do mesmo tipo."),
        hab("Instinto Predatório", "Não sofre penalidade em Furtividade por se mover com o deslocamento normal."),
      ],
      acoes: [
        agredir([
          at("Mordida de Sangue", "corpo a corpo", 1, "3d20+15", "2d10+5 perfuração"),
          at("Garras de Sangue", "corpo a corpo", 2, "3d20+15", "2d6+5 corte"),
        ]),
      ],
    },

    {
      id: "op.criatura.o-diabo", livro: OP, pagina: 206,
      nome: "O Diabo", natureza: "paranormal", tipo: "Criatura", tamanho: "Médio",
      elementos: [SA, CO, ME], vd: 400,
      descricao: "O Sangue encarnado: nunca derrotado, controla criaturas irracionais de Sangue e se alimenta de emoções extremas, sobretudo por meio de pactos.",
      presenca: { dt: 45, dano: "10d8" },
      percepcao: "6d20+25", iniciativa: "6d20+35", sentidos: ["percepção às cegas"],
      defesa: 66, fortitude: "6d20+35", reflexos: "6d20+35", vontade: "6d20+35",
      pv: 1666, machucado: 833,
      imunidades: ["condições de atordoamento e paralisia", "dano", "dano e efeitos de Sangue"],
      resistencias: [[20, "balístico", "impacto", "perfuração"]],
      vulnerabilidades: ["Morte"],
      atributos: [6, 6, 6, 6, 6],
      deslocamento: [[18, 12]],
      habilidades: [
        hab("Ardiloso", "Gosta de pactos e às vezes aparece a pessoas comuns: pode escolher não ativar a Presença Perturbadora ao encontrar um personagem."),
        hab("Decepar Máscara", "Só a intensidade dos sentimentos do Diabo rompe a calmaria do Equilíbrio e resolve o Enigma de Medo da Máscara do Desespero."),
        hab("Potência de Sangue", "Recupera 50 PV no início de cada turno. Em testes de perícia, usa +35 nos baseados em Força, Vigor ou Presença e +25 nos demais.",
          { rolagens: [teste("Perícia de FOR, VIG ou PRE", "6d20+35"), teste("Perícia de AGI ou INT", "6d20+25")] }),
      ],
      acoes: [
        agredir([
          at("Arma Sangrenta", "corpo a corpo", 2, "6d20+45", "2d10+50 Sangue", { critico: "x3" }),
          at("Chifre do Diabo", "corpo a corpo", 1, "6d20+45", "2d8+50 Sangue", { critico: "x3" }),
        ]),
        agredir([at("Arma Sangrenta", "médio", 2, "6d20+45", "2d10+50 Sangue", { critico: "x3" })], { nome: "Agredir (distância)" }),
        acao("livre", "Explodir em Sangue", "Ao causar dano com a arma sangrenta, ou ao tocar a ferida de um personagem, faz o sangue dele explodir: 10d6 de dano de Sangue. Até duas vezes por turno.",
          { rolagens: [dano("Explosão", "10d6 Sangue")], limite: [2, "turno"] }),
        acao("livre", "Sangrar", "Ao acertar com o chifre, pode deixá-lo cravado: o personagem fica vulnerável a Sangue até removê-lo (ação padrão, que causa 8d8 de dano de Sangue). O chifre volta a crescer no começo do turno do Diabo.",
          { rolagens: [dano("Remover o chifre", "8d8 Sangue")] }),
        acao("movimento", "Transportar pelo Sangue", "Desloca-se para qualquer espaço com muito sangue exposto ou adjacente a um personagem machucado ou morrendo."),
        acao("padrao", "Senhor do Sangue", "Uma vez por cena, invoca e controla criaturas de Sangue com VD somado de até 400. Elas surgem em alcance médio e agem a partir da próxima rodada, no turno do Diabo.",
          { limite: [1, "cena"] }),
        acao("padrao", "Pacto", "Oferece um pacto de Sangue. Aceito, o Diabo cumpre o prometido (em geral ao pé da letra, de forma distorcida) e o alvo sofre 10d6 de dano mental; se enlouquecer com isso, torna-se servo obcecado do Diabo para sempre.",
          { rolagens: [dano("Preço do pacto", "10d6 mental")] }),
        acao("completa", "Desejos de Sangue", "Todos os personagens em alcance médio entram em fúria e atacam outro personagem em alcance curto escolhido pelo Diabo (Vontade DT 45 evita). Afetados usam a ação de maior potencial de dano e não podem conjurar rituais. Quem passa fica imune até o fim da cena.",
          { resistencia: "Vontade DT 45 evita" }),
      ],
      enigma: {
        texto: "Ninguém sabe como derrotá-lo; símbolos sagrados não funcionam de verdade. A Morte oprime o Sangue: talvez uma manifestação de Morte com força equivalente seja a chave.",
        efeito: "Resolvido, perde a imunidade a dano e os testes de resistência caem para +25.",
        altera: { imunidades: ["condições de atordoamento e paralisia", "dano e efeitos de Sangue"], fortitude: "6d20+25", reflexos: "6d20+25", vontade: "6d20+25" },
      },
    },
    /* ---------------- OPRPG · Criaturas de Morte (p. 208–229) ---------------- */

    {
      id: "op.criatura.aracnasita", livro: OP, pagina: 209,
      nome: "Aracnasita", natureza: "paranormal", tipo: "Criatura", tamanho: "Grande",
      elementos: [MO, ME], vd: 80,
      descricao: "Uma aranha deformada pelo lodo da Morte que parasita humanos num casulo do abdômen e cresce consumindo o tempo de vida deles.",
      presenca: { dt: 20, dano: "4d6", imune: "NEX 40%+" },
      percepcao: "1d20+10", iniciativa: "3d20+10", sentidos: ["percepção às cegas"],
      defesa: 23, fortitude: "2d20+5", reflexos: "3d20+10", vontade: "1d20+5",
      pv: 140, machucado: 70,
      imunidades: ["dano"],
      vulnerabilidades: ["Energia"],
      atributos: [3, 2, 1, 1, 2],
      pericias: [["Furtividade", "3d20+8"]],
      deslocamento: [[12, 8]],
      estados: [{ id: "desova", nome: "Turnos desde a desova", maximo: 4 }],
      habilidades: [
        hab("Percepção Tátil", "Percebe tudo o que toca a sua teia e ignora penalidades de visão ou de sentidos contra seres e objetos em contato com ela."),
      ],
      acoes: [
        agredir([at("Mordida", "corpo a corpo", 1, "3d20+15", "2d10+10 perfuração")]),
        acao("livre", "Estacar", "Ao causar dano com a mordida, prende o alvo com o lodo: +1d10 de dano de Morte e a vítima fica agarrada. Soltar-se: ação padrão e Atletismo DT 20; um adjacente pode usar ação padrão para soltá-la com o mesmo teste ou ajudar.",
          { rolagens: [dano("Lodo", "1d10 Morte")] }),
        acao("reacao", "Desovar Aranhas", "Uma vez por cena, ao ficar machucada, desova aranhas. No início de cada turno seguinte, em ordem: 1º — até o fim da cena, quem começa o turno em alcance curto sofre 2d6 de dano mental (Vontade DT 15 reduz à metade); 2º em diante — também 2d8 de dano de Morte (Fortitude DT 15 reduz à metade); 3º — os dois efeitos passam a alcance médio; 4º em diante — quem morrer em alcance médio vira uma nova aracnasita com 70 PV e sem esta habilidade.",
          { limite: [1, "cena"], rolagens: [dano("Aranhas (mental)", "2d6 mental"), dano("Aranhas (Morte)", "2d8 Morte")] }),
        acao("movimento", "Disparar Teia", "Teia em alcance curto, num quadrado de 3 m: quem está ou entra na área fica agarrado (Reflexos DT 20 evita). Quem começa o turno preso sofre 2d8+10 de dano de Morte. Escapar: 15 de dano de corte na teia ou ação padrão e Atletismo DT 20. Dura até o fim da cena.",
          { rolagens: [dano("Teia", "2d8+10 Morte")], resistencia: "Reflexos DT 20 evita" }),
      ],
      enigma: {
        texto: "O lodo de Morte que cobre o corpo e guarda a vítima no abdômen torna a aracnasita impossível de ferir — mas esse lodo foge do fogo e do calor.",
        efeito: "Quando sofre dano de fogo, perde a imunidade a dano até o início do seu próximo turno (marque enquanto durar).",
        altera: { imunidades: [] },
      },
    },

    {
      id: "op.criatura.carnical-preto-da-morte", livro: OP, pagina: 211,
      nome: "Carniçal Preto da Morte", natureza: "paranormal", tipo: "Criatura", tamanho: "Médio",
      elementos: [MO, CO], vd: 200,
      descricao: "Lodo entrelaçado a um crânio apodrecido numa tentativa de dar consciência à Morte; arrogante e estratégico, hipnotiza quem olha o símbolo da sua cabeça.",
      presenca: { dt: 30, dano: "6d6", imune: "NEX 65%+" },
      percepcao: "3d20+15", iniciativa: "4d20+15", sentidos: ["percepção às cegas"],
      defesa: 38, fortitude: "3d20+15", reflexos: "4d20+15", vontade: "3d20+15",
      pv: 400, machucado: 200,
      imunidades: ["dano balístico"],
      resistencias: [[10, "corte", "impacto", "perfuração"], [20, "Morte"]],
      vulnerabilidades: ["Energia"],
      atributos: [4, 4, 3, 3, 3],
      pericias: [["Atletismo", "4d20+15"]],
      deslocamento: [[12, 8]],
      habilidades: [
        hab("Físico Paranormal", "Pode saltar o dobro do deslocamento normal."),
        hab("Instinto Mortal", "Machucado (200 PV ou menos), usa Hipnose como ação livre no começo de cada turno e, se atacar o mesmo alvo com as duas garras, faz um ataque adicional de garra da morte."),
        hab("Corpo Fechado", "Quem usa a ação mirar para disparar na cabeça do carniçal ignora a imunidade a dano balístico."),
      ],
      acoes: [
        agredir([at("Garra da Morte", "corpo a corpo", 2, "4d20+25", "4d10+20 Morte")]),
        acao("reacao", "Pancada Poderosa", "Num acerto crítico com a garra da morte, empurra o alvo 6 m; se ele colidir com algo resistente, sofre 4d6 de impacto (se colidir com outro ser, os dois sofrem).",
          { rolagens: [dano("Colisão", "4d6 impacto")] }),
        acao("movimento", "Comando", "Dá uma ordem a um ser em alcance curto, que obedece da forma mais eficiente (Vontade DT 29 evita). Equivale a um efeito básico do ritual Perturbação (p. 137).",
          { resistencia: "Vontade DT 29 evita" }),
        acao("padrao", "Hipnose", "Domina a mente de um ser em alcance curto (Vontade DT 29 evita): fica sob controle total, exceto tirar a própria vida. No fim de cada turno dele, repete o teste com +1 cumulativo por tentativa. Até três hipnotizados. Contra quem está enlouquecendo, falha automática e domínio permanente (até o carniçal ser destruído), inclusive para tirar a própria vida.",
          { resistencia: "Vontade DT 29 evita" }),
        acao("completa", "Reanimar Corpos", "Uma vez por cena, reanima 2d4+2 corpos em alcance médio, que atacam o ser mais próximo até serem destruídos. Use a ficha do esqueleto de lodo para eles.",
          { limite: [1, "cena"], rolagens: [soma("Corpos reanimados", "2d4+2")] }),
      ],
    },

    {
      id: "op.criatura.ceifador-espiral", livro: OP, pagina: 213,
      nome: "Ceifador Espiral", natureza: "paranormal", tipo: "Criatura", tamanho: "Grande",
      elementos: [MO, ME], vd: 380,
      descricao: "O rosto da Morte visto em experiências de quase morte: devora os momentos de uma vida e deixa desertos de cinzas espiralados.",
      presenca: { dt: 45, dano: "9d8" },
      percepcao: "5d20+20", iniciativa: "5d20+20", sentidos: ["percepção às cegas"],
      defesa: 58, fortitude: "5d20+25", reflexos: "5d20+25", vontade: "5d20+25",
      pv: 999, machucado: 499,
      imunidades: ["condições de paralisia e lento", "efeitos e dano de Morte"],
      resistencias: [[50, "dano"]],
      vulnerabilidades: ["Energia"],
      atributos: [5, 5, 5, 5, 5],
      deslocamento: [[15, 10]],
      habilidades: [
        hab("Decepar", "Num acerto crítico com a Foice da Morte, o alvo cai para 25 PV e perde 1 ponto de Força, Agilidade ou Vigor para sempre (sorteie); com 25 PV ou menos, morre na hora. Cada criatura que o ceifador mata lhe dá 50 PV temporários e +1d10 de dano na foice até o fim da cena.",
          { rolagens: [dano("Bônus por morte", "1d10 Morte")] }),
      ],
      acoes: [
        agredir([at("Foice da Morte", "corpo a corpo", 2, "5d20+40", "5d10+20 Morte")]),
        acao("movimento", "Transporte pelo Pó", "Dentro da área de Cinzas das Terras Desoladas, transporta-se para outro espaço da área e, ao terminar, pode atacar com a Foice da Morte como ação livre."),
        acao("completa", "Contemplar a Espiral", "Todos os seres em alcance médio que o vejam sofrem 10d10+30 de dano mental (Vontade DT 43 reduz à metade). Quem sofrer dano fica imune até o fim da cena.",
          { rolagens: [dano("Espiral", "10d10+30 mental")], resistencia: "Vontade DT 43 reduz à metade" }),
        acao("completa", "Cinzas das Terras Desoladas", "Uma área de alcance longo ao redor vira cinzas: cada ser nela sofre 10d10+20 de dano de Morte e fica enjoado (Fortitude DT 43 reduz o dano à metade e evita a condição). Quem termina o turno na área sofre 20 de dano de Morte.",
          { rolagens: [dano("Cinzas", "10d10+20 Morte"), dano("Fim do turno na área", "20 Morte")], resistencia: "Fortitude DT 43 reduz à metade e evita a condição" }),
      ],
      enigma: {
        texto: "A espiral não pode ser parada, só transformada numa linha — que, mesmo infinita, tem bordas e portanto saída. Fazer isso exige um esforço quase inimaginável.",
        efeito: "Resolvido, perde a resistência a dano, e qualquer área de Terras Desoladas vira terreno normal no fim do seu próximo turno.",
        altera: { resistencias: [] },
      },
    },

    {
      id: "op.criatura.enraizado", livro: OP, pagina: 214,
      nome: "Enraizado", natureza: "paranormal", tipo: "Criatura", tamanho: "Médio",
      elementos: [MO], vd: 120,
      descricao: "Cadáver enterrado perto de vegetação infestada pela Morte, invadido por raízes que formam um esqueleto armadurado cheio de lodo.",
      presenca: { dt: 20, dano: "4d6", imune: "NEX 50%+" },
      percepcao: "1d20+10", iniciativa: "3d20+10", sentidos: ["percepção às cegas"],
      defesa: 28, fortitude: "3d20+10", reflexos: "3d20+10", vontade: "1d20+5",
      pv: 140, machucado: 70,
      resistencias: [[10, "corte", "impacto", "perfuração"], [20, "Morte"]],
      vulnerabilidades: ["Energia"],
      atributos: [3, 3, 1, 1, 3],
      pericias: [["Atletismo", "3d20+10"]],
      deslocamento: [[9, 6]],
      habilidades: [
        hab("Imortalidade", "Ao morrer vira uma poça de lodo, galhos e raízes e volta após 1d2 rodadas com 70 PV. Destruído para sempre se sofrer 20 de dano de fogo ou Energia (somados) enquanto for poça.",
          { rolagens: [soma("Rodadas até voltar", "1d2")], marcador: "Em forma de poça" }),
        hab("Veneno Pútrido", "Na primeira vez numa cena em que um personagem sofre dano do punho espinhento, fica envenenado: no início de cada turno, Fortitude DT 23; falha = 4d12 de dano de Morte, sucesso = cura o veneno.",
          { rolagens: [dano("Veneno", "4d12 Morte")] }),
      ],
      acoes: [
        agredir([at("Punho Espinhento", "corpo a corpo", 2, "3d20+15", ["2d8+8 impacto", "2d12 Morte"])]),
      ],
    },

    {
      id: "op.criatura.escutado", livro: OP, pagina: 216,
      nome: "Escutado", natureza: "paranormal", tipo: "Criatura", tamanho: "Médio",
      elementos: [MO, EN, ME], vd: 160,
      descricao: "Quem ouviu inteira a proibida Melodia Espiral: um corpo magro e invertido, de cabeça destacável, atraído por qualquer música.",
      presenca: { dt: 25, dano: "4d8", imune: "NEX 55%+" },
      percepcao: "2d20+10", iniciativa: "4d20+10", sentidos: ["percepção às cegas"],
      defesa: 29, fortitude: "3d20+10", reflexos: "4d20+10", vontade: "2d20+5",
      pv: 290, machucado: 145,
      imunidades: ["dano"],
      atributos: [4, 3, 1, 2, 3],
      deslocamento: [[12, 8]],
      habilidades: [
        hab("Multiplicação Melódica", "No início do turno, se estiver ouvindo a melodia da sua criação, cria uma cópia em alcance curto: 145 PV, sem imunidade a dano, age a partir do próximo turno do original e também se multiplica. Todos tentam eliminar quem toca a melodia.",
          { rolagens: [] }),
      ],
      acoes: [
        agredir([at("Mordida", "corpo a corpo", 2, "3d20+20", "3d6+10 perfuração")]),
        agredir([at("Cabeça Arremessada", "curto", 2, "4d20+15", "1d10+10 impacto")], { nome: "Agredir (distância)" }),
        acao("movimento", "Vomitar Lodo", "Uma vez por cena, na primeira rodada após surgir, cada cópia despeja lodo num ser em alcance curto: 4d10+10 de dano de Morte e lento até o fim da cena (Reflexos DT 25 reduz o dano à metade e evita a condição).",
          { limite: [1, "cena"], rolagens: [dano("Lodo", "4d10+10 Morte")], resistencia: "Reflexos DT 25 reduz à metade e evita a condição" }),
      ],
      estados: [{ id: "rodadas-melodia", nome: "Rodadas ouvindo a melodia", maximo: 4 }],
      enigma: {
        texto: "Tocar a melodia exige uma ação padrão e Artes DT 25 por rodada, ou um aparelho com a música. Enquanto ela toca, o escutado se multiplica; se ouvi-la por 4 rodadas seguidas, pode enfim ser derrotado — sem destruir cópias, seriam 16 criaturas no fim da quarta rodada.",
        efeito: "Depois de 4 rodadas ininterruptas, perde a imunidade a dano até o fim da cena.",
        altera: { imunidades: [] },
      },
    },

    {
      id: "op.criatura.esqueleto-de-lodo", livro: OP, pagina: 217,
      nome: "Esqueleto de Lodo", natureza: "paranormal", tipo: "Criatura", tamanho: "Médio",
      elementos: [MO], vd: 20,
      descricao: "Cadáver acinzentado consumido pela Morte, escorrendo lodo; regenera-se, a menos que o lodo seja queimado ou exposto à Energia.",
      presenca: { dt: 14, dano: "2d4", imune: "NEX 25%+" },
      percepcao: "1d20", iniciativa: "2d20", sentidos: ["percepção às cegas"],
      defesa: 14, fortitude: "2d20", reflexos: "2d20+5", vontade: "1d20",
      pv: 40, machucado: 20,
      resistencias: [[5, "corte", "impacto", "perfuração"], [10, "Morte"]],
      vulnerabilidades: ["Energia"],
      atributos: [2, 2, 0, 1, 1],
      deslocamento: [[6, 4]],
      habilidades: [
        hab("Imortalidade", "Ao morrer vira poça de lodo e ossos e volta após 1d3 rodadas com 20 PV. Destruído para sempre se sofrer dano de fogo ou Energia enquanto for poça.",
          { rolagens: [soma("Rodadas até voltar", "1d3")], marcador: "Em forma de poça" }),
      ],
      acoes: [
        agredir([at("Garras", "corpo a corpo", 2, "2d20+5", "2d6+2 corte")]),
        acao("completa", "Espiral de Lodo", "Vira poça e se lança em espiral até 9 m em linha reta: cada ser no caminho sofre 2d10 de dano de Morte (Reflexos DT 14 reduz à metade). Reforma-se no fim do trajeto.",
          { rolagens: [dano("Espiral", "2d10 Morte")], resistencia: "Reflexos DT 14 reduz à metade" }),
      ],
    },

    {
      id: "op.criatura.marionete", livro: OP, pagina: 219,
      nome: "Marionete", natureza: "paranormal", tipo: "Criatura", tamanho: "Médio",
      elementos: [MO], vd: 280,
      descricao: "Resquício de um luto negado: esqueleto de lodo suspenso por fios invisíveis, com traços de quem já se foi e uma foice de ossos.",
      presenca: { dt: 35, dano: "8d6", imune: "NEX 85%+" },
      percepcao: "5d20+15", iniciativa: "3d20+15", sentidos: ["percepção às cegas"],
      defesa: 40, fortitude: "2d20+10", reflexos: "3d20+15", vontade: "5d20+20",
      pv: 700, machucado: 350,
      resistencias: [[20, "corte", "impacto", "perfuração", "Morte"]],
      vulnerabilidades: ["Energia"],
      atributos: [3, 5, 1, 5, 2],
      deslocamento: [[6, 4]],
      habilidades: [
        hab("Momento Passivo", "O deslocamento não pode ser reduzido, ignora terreno difícil e não sofre dano nem efeitos que dependam de tocar o chão."),
      ],
      acoes: [
        agredir([at("Foice da Morte", "corpo a corpo", 2, "5d20+30", "10d8+10 Morte")]),
        acao("reacao", "Reflexos Guiados por Corda", "Uma vez por rodada, quando um ser fica adjacente, ataca-o com a foice da morte.",
          { limite: [1, "rodada"] }),
        acao("completa", "Ironia do Destino", "Faz dois ataques de foice contra um ser adjacente. Se o segundo acertar, agarra-o com a foice e pode se deslocar 6 m levando-o. Enquanto o carrega, todo dano que sofre é dividido com o ser agarrado."),
      ],
    },

    {
      id: "op.criatura.mumia-xipofaga", livro: OP, pagina: 221,
      nome: "Múmia Xipófaga", natureza: "paranormal", tipo: "Criatura", tamanho: "Médio",
      elementos: [MO], vd: 240,
      descricao: "Corpos mumificados vivos e entrelaçados por seitas antigas; quem ela agarra até o fim é fundido ao seu corpo.",
      presenca: { dt: 30, dano: "6d8", imune: "NEX 75%+" },
      percepcao: "3d20+10", iniciativa: "5d20+15", sentidos: ["percepção às cegas"],
      defesa: 35, fortitude: "4d20+15", reflexos: "5d20+15", vontade: "3d20+10",
      pv: 400, machucado: 200,
      resistencias: [[10, "corte", "impacto", "perfuração"], [20, "Morte"]],
      vulnerabilidades: ["Energia", "fogo"],
      atributos: [5, 4, 2, 3, 4],
      deslocamento: [[9, 6]],
      estados: [{ id: "amalgamas", nome: "Seres amalgamados", maximo: 2 }],
      habilidades: [
        hab("Faixas da Permanência", "Reduzida a 0 PV, não é destruída: continua agindo até o fim do próximo turno e só morre se não o terminar com pelo menos 1 PV."),
      ],
      acoes: [
        agredir([at("Garra Enfaixada", "corpo a corpo", 2, "4d20+30", "4d8+30 corte")], { nota: "Amalgamada uma vez: três garras e +5 de dano; duas vezes: quatro garras e +10." }),
        agredir([at("Vomitar Lodo", "curto", 2, "5d20+25", ["3d6+30 Morte", "3d8 mental"])], { nome: "Agredir (distância)" }),
        acao("livre", "Agarrada Mumificadora", "Ao acertar a garra enfaixada, pode agarrar o alvo (teste 4d20+30). No início de cada turno da vítima ela sofre 4d8+30 de dano de Morte e a múmia recupera o mesmo. Quem chega a 0 PV assim vira esqueleto de lodo no começo do próprio turno.",
          { rolagens: [teste("Agarrar", "4d20+30"), dano("Mumificar", "4d8+30 Morte")] }),
        acao("padrao", "Amalgamar", "Com 0 PV, pode se fundir a um ser morto ou criatura de Morte adjacente: recupera 200 PV, passa a fazer três ataques de garra e +5 de dano por ataque. Pode repetir uma vez (dois seres): mais 200 PV, quatro garras e +10 de dano no total.",
          { limite: [2, "combate"] }),
      ],
    },
    {
      id: "op.criatura.nidere", livro: OP, pagina: 224,
      nome: "Nidere", natureza: "paranormal", tipo: "Criatura", tamanho: "Grande",
      elementos: [MO, SA, ME], vd: 320,
      descricao: "O “lobo invertido” do folclore sul-americano: predador alfa que some com grupos de campistas e deixa pistas falsas para atrair mais presas.",
      presenca: { dt: 35, dano: "8d6", imune: "NEX 95%+" },
      percepcao: "4d20+25", iniciativa: "5d20+25", sentidos: ["faro"],
      defesa: 50, fortitude: "5d20+25", reflexos: "5d20+25", vontade: "4d20+15",
      pv: 800, machucado: 400,
      resistencias: [[20, "corte", "impacto", "perfuração", "Morte"]],
      vulnerabilidades: ["Energia"],
      atributos: [5, 5, 3, 4, 5],
      pericias: [["Furtividade", "5d20+23"], ["Sobrevivência", "4d20+20"]],
      deslocamento: [[24, 18]],
      habilidades: [
        hab("Caçador Veloz", "Move-se com o deslocamento normal sem penalidade em Furtividade."),
        hab("Regeneração Acelerada", "Cura acelerada 50. Perde esta habilidade se o enigma for resolvido."),
        hab("Senso de Direção Perfeito", "Nunca se perde e recebe +2 dados em Percepção e Sobrevivência. Perde esta habilidade se o enigma for resolvido."),
      ],
      acoes: [
        agredir([
          at("Garra Invertida", "corpo a corpo", 2, "5d20+35", "4d10+40 Morte"),
          at("Mordida Invertida", "corpo a corpo", 1, "5d20+35", "4d12+40 Morte"),
        ]),
        acao("livre", "Reverter", "Quem sofre dano das garras invertidas fica enjoado até o fim do próprio próximo turno."),
        acao("livre", "Rastrear e Abater", "Causa +6d6 de dano contra seres desprevenidos.",
          { rolagens: [dano("Contra desprevenido", "6d6")] }),
      ],
      enigma: {
        texto: "É preciso achar o covil (em geral cavernas fundas na floresta) enquanto ele não está lá e decifrar a engenhoca de ossos das vítimas, cuja lógica liga-se à identidade de quem ele devorou; destruir essa origem é o caminho.",
        efeito: "Com a origem destruída, entra em fúria: −10 na Defesa, −2 dados em testes de resistência e perde Regeneração Acelerada e Senso de Direção Perfeito (o mestre retira também o bônus deste em Percepção e Sobrevivência).",
        altera: { defesa: 40, fortitude: "3d20+25", reflexos: "3d20+25", vontade: "2d20+15", desativar: ["Regeneração Acelerada", "Senso de Direção Perfeito"] },
      },
    },

    {
      id: "op.criatura.sempiternal", livro: OP, pagina: 226,
      nome: "Sempiternal", natureza: "paranormal", tipo: "Criatura", tamanho: "Médio",
      elementos: [MO], vd: 360,
      descricao: "Fruto de gerações de exposição à Morte numa civilização isolada: esquelético, de olhos negros, percebe o tempo como quer e não come nem dorme.",
      presenca: { dt: 40, dano: "8d8" },
      percepcao: "5d20+20", iniciativa: "5d20+25",
      defesa: 53, fortitude: "4d20+20", reflexos: "5d20+30", vontade: "5d20+25",
      pv: 990, machucado: 445,
      imunidades: ["condições lento e de paralisia", "dano e efeitos de Morte"],
      resistencias: [[20, "corte", "impacto", "perfuração"]],
      vulnerabilidades: ["Energia"],
      atributos: [5, 5, 4, 5, 4],
      deslocamento: [[12, 8]],
      notas: ["O livro imprime 445 como valor de machucado (a metade de 990 seria 495); mantido como publicado."],
      habilidades: [
        hab("Toque Acelerador", "Quem sofre dano dos dedos alongados envelhece 1d10 anos. Com 20 anos ou mais envelhecidos assim, fica fraco até o fim da cena; com 40 ou mais, debilitado; com 60 ou mais, morre. Seres com afinidade com a Morte são imunes.",
          { rolagens: [soma("Anos envelhecidos", "1d10")] }),
      ],
      acoes: [
        agredir([at("Dedos Alongados", "corpo a corpo", 4, "5d20+40", "4d10 Morte", { nota: "mais envelhecimento (Toque Acelerador)" })]),
        acao("movimento", "Correntes de Lodo", "Vinhas de lodo cobrem toda a área em alcance médio: 20d6 de dano de Morte em cada ser (Fortitude DT 40 reduz à metade). Quem fica machucado por esse dano ganha vulnerabilidade a Morte até o fim da cena; quem cai a 0 PV ou menos vira um enraizado.",
          { rolagens: [dano("Lodo", "20d6 Morte")], resistencia: "Fortitude DT 40 reduz à metade" }),
      ],
    },

    {
      id: "op.criatura.succ", livro: OP, pagina: 227,
      nome: "Succ", natureza: "paranormal", tipo: "Criatura", tamanho: "Médio",
      elementos: [MO, EN], vd: 40,
      descricao: "Quadrúpede enrugado de pescoço longo e boca circular, que suga o ar dos pulmões da vítima com um som de aspirador.",
      presenca: { dt: 15, dano: "3d6", imune: "NEX 30%+" },
      percepcao: "1d20+5", iniciativa: "4d20+5", sentidos: ["percepção às cegas"],
      defesa: 20, fortitude: "1d20", reflexos: "4d20+10", vontade: "1d20+5",
      pv: 65, machucado: 32,
      resistencias: [[5, "corte", "impacto", "perfuração"], [10, "Morte"]],
      vulnerabilidades: ["Energia"],
      atributos: [4, 2, 0, 1, 1],
      deslocamento: [[12, 8]],
      acoes: [
        agredir([at("Mordida", "corpo a corpo", 1, "4d20+10", "2d8+2 perfuração")]),
        acao("livre", "Sucção", "Ao acertar a mordida, prende-se ao rosto e suga o ar: Fortitude DT 17; passou, solta-se; falhou, fica inconsciente e, no início do próximo turno do succ, cai a 0 PV e fica morrendo. Prendendo alguém, o succ só faz reações e seu deslocamento cai para 3 m. Se sofrer 10 de dano ou mais na mesma rodada, solta a vítima.",
          { resistencia: "Fortitude DT 17 evita" }),
      ],
    },

    {
      id: "op.criatura.o-deus-da-morte", livro: OP, pagina: 230,
      nome: "O Deus da Morte", natureza: "paranormal", tipo: "Relíquia", tamanho: "Grande",
      elementos: [MO, CO, ME], vd: 400,
      descricao: "O Parasita de Dimensões: relíquia consciente que consome o tempo de tudo o que vive e salta de receptáculo em receptáculo, em vários pontos da Realidade ao mesmo tempo.",
      presenca: { dt: 45, dano: "10d8" },
      percepcao: "5d20+30", iniciativa: "6d20+30", sentidos: ["percepção às cegas"],
      defesa: 60, fortitude: "7d20+35", reflexos: "6d20+35", vontade: "5d20+35",
      pv: 2000, machucado: 1000,
      imunidades: ["condições de atordoamento e paralisia", "dano e efeitos de Morte"],
      resistencias: [[20, "corte", "impacto", "perfuração"]],
      vulnerabilidades: ["Energia"],
      atributos: [6, 6, 5, 5, 7],
      deslocamento: [[15, 10]],
      habilidades: [
        hab("Ciclo Infinito", "Recupera 50 PV no início de cada turno. Reduzido a 0 PV ou menos, vira poça de lodo e, no começo do próximo turno, manifesta-se no cadáver mais próximo do corpo original (ou no de maior NEX ao alcance), com todos os PV e sem condições. Resolvido o enigma, perde a regeneração e o retorno."),
        hab("Destruir o Diabo", "É a única coisa capaz de resolver o Enigma de Medo do Diabo."),
        hab("Potência de Morte", "Em testes de perícia, usa +35 nos baseados em Força, Vigor ou Presença e +25 nos demais.",
          { rolagens: [teste("Perícia de FOR (6) ou VIG (7)", "7d20+35"), teste("Perícia de PRE (5)", "5d20+35"), teste("Perícia de AGI (6)", "6d20+25"), teste("Perícia de INT (5)", "5d20+25")] }),
        hab("Senhor do Tempo", "No início de cada rodada, rola 1d20 e ganha um turno adicional nessa contagem de iniciativa.",
          { rolagens: [soma("Turno adicional (iniciativa)", "1d20")] }),
      ],
      acoes: [
        agredir([at("Soco Espiral", "corpo a corpo", 2, "6d20+45", "5d10+50 Morte")]),
        acao("livre", "Agarrão", "Ao acertar o soco espiral num ser Médio ou menor, pode agarrá-lo (teste 6d20+47).",
          { rolagens: [teste("Agarrar", "6d20+47")] }),
        acao("livre", "Controlar Relógio Interno", "No início de cada turno, encerra até duas condições que o afetem."),
        acao("movimento", "Controlar Mortos", "Faz qualquer criatura de Morte em alcance longo percorrer seu deslocamento e fazer um ataque."),
        acao("movimento", "Espiral Descendente", "Acelera o tempo de um ser que esteja agarrando, que sente cada segundo paralisado: envelhece 3d20 anos e sofre 1 de dano mental por ano.",
          { rolagens: [soma("Anos envelhecidos (= dano mental)", "3d20")] }),
        acao("padrao", "Espiral Destrutiva", "Espiral de Morte com 12 m de raio em alcance longo: 10d10+50 de dano de Morte em cada personagem na área (Fortitude DT 45 reduz à metade).",
          { rolagens: [dano("Espiral", "10d10+50 Morte")], resistencia: "Fortitude DT 45 reduz à metade" }),
      ],
      enigma: {
        texto: "Manifestação primordial da Morte e guardiã da cronologia; ninguém sabe como destruí-lo, mas tudo indica que a resposta está em outra entidade.",
        efeito: "Resolvido, perde Ciclo Infinito (a regeneração e o retorno num corpo próximo) e Senhor do Tempo.",
        altera: { desativar: ["Ciclo Infinito", "Senhor do Tempo"] },
      },
    },
    /* ---------------- OPRPG · Criaturas de Conhecimento (p. 232–255) ---------------- */

    {
      id: "op.criatura.anjo", livro: OP, pagina: 234,
      nome: "Anjo", natureza: "paranormal", tipo: "Criatura", tamanho: "Enorme",
      elementos: [CO, ME], vd: 380,
      descricao: "O Conhecimento do Outro Lado em forma de criatura: vê-lo derrete os olhos em lágrimas douradas; não há registro de um desde o século XIII.",
      presenca: { dt: 40, dano: "10d6" },
      percepcao: "5d20+25", iniciativa: "4d20+25", sentidos: ["percepção às cegas"],
      defesa: 57, fortitude: "5d20+25", reflexos: "4d20+25", vontade: "5d20+30",
      pv: 1111, machucado: 555,
      imunidades: ["condições de paralisia", "dano e efeitos de Conhecimento"],
      resistencias: [[50, "dano"]],
      vulnerabilidades: ["Sangue"],
      atributos: [4, 5, 5, 5, 5],
      deslocamento: [[24, 16, "voo"]],
      habilidades: [
        hab("Julgamento", "Quem sofre dano de Conhecimento das Asas do Conhecimento ou dos Olhares do Saber sofre também dano mental igual à metade desse dano (depois das resistências). Quem chega a Sanidade 0 assim inexiste e morre na hora."),
      ],
      acoes: [
        agredir([
          at("Asas do Conhecimento", "corpo a corpo", 2, "5d20+40", "4d10+40 Conhecimento"),
          at("Olhares do Saber", "longo", 2, "4d20+40", "6d8+20 Conhecimento"),
        ]),
        acao("livre", "Faixas Detentoras", "Ao acertar as Asas do Conhecimento num ser Médio ou menor, pode agarrá-lo com as faixas das asas (teste 5d20+45); o agarrado também fica fascinado. Um por vez, sem impedir o uso das asas.",
          { rolagens: [teste("Agarrar", "5d20+45")] }),
        acao("padrao", "Chamas Reveladoras", "Círculo de chamas douradas em alcance médio: 10d8 de dano de Conhecimento em cada ser (Vontade DT 43 reduz à metade). Quem sofre dano ganha uma auréola: até o fim da cena, o anjo sabe onde ele está e ignora furtividade, invisibilidade e ilusões contra ele.",
          { rolagens: [dano("Chamas", "10d8 Conhecimento")], resistencia: "Vontade DT 43 reduz à metade" }),
        acao("completa", "Raio Dourado", "Uma vez por cena, raio do olho central numa linha de 3 m em alcance longo: 15d8+50 de dano de Conhecimento (Reflexos DT 43 reduz à metade).",
          { limite: [1, "cena"], rolagens: [dano("Raio", "15d8+50 Conhecimento")], resistencia: "Reflexos DT 43 reduz à metade" }),
      ],
      enigma: {
        texto: "Seres puros de Conhecimento, presos ao alinhamento de Justiça Perfeita, podem ser enganados: um anjo que julga errado pode cair e ser alcançado por mortais.",
        efeito: "Resolvido, perde a resistência a dano, o voo e Julgamento.",
        altera: { resistencias: [], deslocamento: [], desativar: ["Julgamento"] },
      },
    },

    {
      id: "op.criatura.bicho-papao", livro: OP, pagina: 237,
      nome: "Bicho-Papão", natureza: "paranormal", tipo: "Criatura", tamanho: "Grande",
      elementos: [CO], vd: 300,
      descricao: "Nascido do medo de gerações de crianças: figura encapuzada de muitos membros que se esconde em telhados, dutos e debaixo da cama.",
      presenca: { dt: 35, dano: "7d8", imune: "NEX 90%+" },
      percepcao: "5d20+20", iniciativa: "5d20+20", sentidos: ["percepção às cegas"],
      defesa: 41, fortitude: "4d20+15", reflexos: "5d20+25", vontade: "5d20+20",
      pv: 750, machucado: 375,
      resistencias: [[20, "balístico", "corte", "impacto", "Conhecimento"]],
      vulnerabilidades: ["Sangue"],
      atributos: [5, 4, 3, 5, 4],
      pericias: [["Atletismo", "4d20+15"], ["Furtividade", "5d20+18"]],
      deslocamento: [[15, 10]],
      habilidades: [
        hab("Tamanho Adaptável", "Esconde-se em lugares menores que ele, reduzindo-se a qualquer categoria de tamanho menor; o deslocamento não cai por andar furtivamente ou escalar."),
        hab("Tormento Infantil", "Fica desprevenido enquanto ouve uma cantiga de ninar ou canção infantil. Ouvindo uma criança chorar, usa todas as ações para encontrar e silenciar a fonte."),
        hab("Destruir Mente", "Cada acerto das Garras Atormentadoras num alvo perturbado causa também 1d8 de dano mental.",
          { rolagens: [dano("Mente destruída", "1d8 mental")] }),
      ],
      acoes: [
        agredir([at("Garras Atormentadoras", "corpo a corpo", 3, "5d20+35", "4d10+10 Conhecimento")]),
        acao("movimento", "Atormentar", "Sussurros num ser em alcance curto: 3d8 de dano mental (Vontade DT 30 reduz à metade); +3d8 se estiver escondido do alvo.",
          { rolagens: [dano("Atormentar", "3d8 mental"), dano("Escondido: +3d8", "3d8 mental")], resistencia: "Vontade DT 30 reduz à metade" }),
        acao("completa", "Saltar e Assustar", "Escondido de um ser em alcance curto, sai e se aproxima numa forma assustadora: o ser sofre 10d8 de dano mental (Vontade DT 35 reduz à metade).",
          { rolagens: [dano("Susto", "10d8 mental")], resistencia: "Vontade DT 35 reduz à metade" }),
      ],
    },

    {
      id: "op.criatura.espreitador", livro: OP, pagina: 238,
      nome: "Espreitador", natureza: "paranormal", tipo: "Criatura", tamanho: "Médio",
      elementos: [CO, ME], vd: 220,
      descricao: "Criatura trêmula cheia de olhos amarelos que espia pelas frestas, devora o sono e a sanidade de quem escolheu assombrar.",
      presenca: { dt: 30, dano: "7d6", imune: "NEX 70%+" },
      percepcao: "3d20+15", iniciativa: "4d20+15", sentidos: ["percepção às cegas"],
      defesa: 34, fortitude: "2d20+10", reflexos: "4d20+15", vontade: "3d20+15",
      pv: 500, machucado: 250,
      imunidades: ["dano"],
      vulnerabilidades: ["Sangue"],
      atributos: [4, 2, 3, 3, 2],
      pericias: [["Furtividade", "4d20+20"]],
      deslocamento: [[12, 8]],
      acoes: [
        agredir([at("Pancada", "corpo a corpo", 2, "2d20+10", "1d6+2 impacto")]),
        acao("movimento", "Correr pelas Frestas", "Teleporta-se para qualquer espaço em alcance longo, desde que haja uma fresta no caminho (um espaço Pequeno ou menor totalmente delimitado, como uma porta entreaberta)."),
        acao("completa", "Espreitar", "Uma vez por cena, adjacente a um ser dormindo, causa 10d6 de dano mental (Vontade DT 30 reduz à metade). Se a vítima ficar enlouquecendo por isso, pode criar uma cópia observada dela.",
          { limite: [1, "cena"], rolagens: [dano("Espreitar", "10d6 mental")], resistencia: "Vontade DT 30 reduz à metade" }),
        acao("padrao", "Cópia Observada", "Cria a cópia de um ser que deixou enlouquecendo com Espreitar: mesma ficha, mas causa dano de Conhecimento, não conjura rituais nem usa habilidades paranormais, e dura até o fim da cena."),
      ],
      enigma: {
        texto: "O alvo espreitado deve fingir dormir no escuro: às 2h11 a criatura sai do esconderijo se sentir segurança. A porta pela qual saiu precisa ser fechada antes que volte, deixando-a encurralada.",
        efeito: "Encurralado, perde a imunidade a dano.",
        altera: { imunidades: [] },
      },
    },

    {
      id: "op.criatura.existido", livro: OP, pagina: 240,
      nome: "Existido", natureza: "paranormal", tipo: "Criatura", tamanho: "Médio",
      elementos: [CO], vd: 20,
      descricao: "Alguém que entendeu o Outro Lado por completo e virou casca; repete o próprio nome para continuar sendo lembrado, coberto de frases que causam Medo.",
      presenca: { dt: 14, dano: "1d6", imune: "NEX 25%+" },
      percepcao: "2d20+5", iniciativa: "1d20+5", sentidos: ["percepção às cegas"],
      defesa: 13, fortitude: "2d20", reflexos: "1d20", vontade: "2d20+10",
      pv: 36, machucado: 18,
      resistencias: [[5, "balístico", "corte", "impacto"], [10, "Conhecimento"]],
      vulnerabilidades: ["Sangue"],
      atributos: [1, 1, 4, 2, 2],
      pericias: [["Ciências", "4d20+10"], ["Ocultismo", "4d20+10"]],
      deslocamento: [[9, 6]],
      acoes: [
        agredir([at("Pancada", "corpo a corpo", 1, "1d20+5", "1d4+1 impacto")]),
        acao("livre", "Brilho Enlouquecedor", "Uma vez por rodada, as marcas douradas brilham: todos em alcance médio que o vejam sofrem 1d6 de dano mental (Vontade DT 14 reduz à metade).",
          { limite: [1, "rodada"], rolagens: [dano("Brilho", "1d6 mental")], resistencia: "Vontade DT 14 reduz à metade" }),
        acao("movimento", "Fortalecimento Paranormal", "Até o fim da cena, +1 dado em testes de Agilidade, Força e Vigor e as pancadas causam +2d4 de dano de Conhecimento. Só se já causou dano mental com o Brilho Enlouquecedor nesta cena.",
          { marcador: "Ativo nesta cena", rolagens: [dano("Pancada fortalecida", "2d4 Conhecimento")] }),
      ],
    },

    {
      id: "op.criatura.lembrado", livro: OP, pagina: 241,
      nome: "Lembrado", natureza: "paranormal", tipo: "Criatura", tamanho: "Médio",
      elementos: [CO], vd: 100,
      descricao: "Um existido amplificado pela barreira mental de quem tinha muita exposição paranormal; comete atrocidades para jamais ser esquecido.",
      presenca: { dt: 20, dano: "4d6", imune: "NEX 45%+" },
      percepcao: "2d20+10", iniciativa: "2d20+10", sentidos: ["percepção às cegas"],
      defesa: 22, fortitude: "2d20+5", reflexos: "2d20", vontade: "2d20+10",
      pv: 180, machucado: 90,
      resistencias: [[10, "balístico", "corte", "impacto"], [20, "Conhecimento"]],
      vulnerabilidades: ["Sangue"],
      atributos: [2, 2, 4, 2, 2],
      pericias: [["Ciências", "4d20+10"], ["Ocultismo", "4d20+10"]],
      deslocamento: [[9, 6]],
      habilidades: [
        hab("Aura Manifestada", "Uma aura de rostos dourados que gritam: personagens em alcance curto sofrem −2 dados em todos os testes."),
      ],
      acoes: [
        agredir([at("Pancada", "corpo a corpo", 2, "2d20+5", "2d4+7 impacto")]),
        acao("padrao", "Expandir Aura", "Seres em alcance curto sofrem 6d6 de dano mental (Vontade DT 20 reduz à metade).",
          { rolagens: [dano("Aura", "6d6 mental")], resistencia: "Vontade DT 20 reduz à metade" }),
      ],
    },

    {
      id: "op.criatura.estrangeiro", livro: OP, pagina: 243,
      nome: "EstrangEiro", natureza: "paranormal", tipo: "Criatura", tamanho: "Grande",
      elementos: [CO, EN, ME], vd: 340,
      descricao: "Inteligência paranormal confundida com alienígenas: sinais misteriosos, abduções sempre no mesmo horário e vítimas que voltam sentindo algo crescer dentro delas.",
      presenca: { dt: 40, dano: "10d6", imune: "NEX 99%+" },
      percepcao: "5d20+25", iniciativa: "3d20+20", sentidos: ["percepção às cegas"],
      defesa: 50, fortitude: "3d20+15", reflexos: "3d20+20", vontade: "5d20+25",
      pv: 750, machucado: 375,
      imunidades: ["dano"],
      vulnerabilidades: ["Sangue"],
      atributos: [3, 5, 5, 5, 3],
      pericias: [["Ciência", "5d20+20"], ["Ocultismo", "5d20+20"], ["Furtividade", "3d20+20"]],
      deslocamento: [[15, 10, "voo"]],
      notas: ["O nome é grafado no livro com o “E” do meio estilizado: EstrangEiro."],
      acoes: [
        agredir([at("Toque Sutil", "corpo a corpo", 3, "5d20+35", "4d8+10 Conhecimento")]),
        agredir([at("Rajada Psíquica", "extremo", 2, "5d20+35", "4d10+20 Conhecimento")], { nome: "Agredir (distância)" }),
        acao("livre", "Comandar", "Ao causar dano com a Rajada Psíquica, domina o alvo (Vontade DT 35 evita), que no próximo turno cumpre uma ordem: atacar um aliado com a arma em mãos (sem gastar PE), render-se (cai e arremessa as armas em direção aleatória, alcance curto) ou fugir. Seres com Intelecto 5 ou mais são imunes.",
          { resistencia: "Vontade DT 35 evita" }),
        acao("livre", "Apagar Memória", "Quem fica insano por seus ataques ou efeitos passa a ser controlado por ele; ou, em vez disso, ele apaga a memória da vítima e devolve 1d4 de Sanidade, fazendo-a duvidar do encontro.",
          { rolagens: [soma("Sanidade devolvida", "1d4")] }),
        acao("livre", "Oblívio", "Quem sofre dano do Toque Sutil esquece a existência dele (Vontade DT 30 evita): o considera invisível e esquece as interações. No fim de cada turno repete o teste; passando, volta a percebê-lo, encerra o efeito e sofre 6d6 de dano mental. Quem incuba uma larva não repete o teste.",
          { rolagens: [dano("Ao se lembrar", "6d6 mental")], resistencia: "Vontade DT 30 evita" }),
        acao("completa", "Incubar", "Toca um ser adjacente que esteja alheio a ele (Oblívio) e implanta uma larva: lê pensamentos e memórias do hospedeiro à distância; a larva causa 1d6 de dano mental no início de cada cena e, com Sanidade 0, um novo EstrangEiro eclode da cabeça e mata o hospedeiro.",
          { rolagens: [dano("Larva (por cena)", "1d6 mental")] }),
      ],
      enigma: {
        texto: "As intenções dele precisam ser decifradas: investigar seus sinais, aprender sua linguagem e entender as mensagens para usar as tecnologias paranormais dele contra ele.",
        efeito: "Decifrado, perde a imunidade a dano (continua imune a dano de Conhecimento) e não pode usar Incubar.",
        altera: { imunidades: ["dano de Conhecimento"], desativar: ["Incubar"] },
      },
    },

    {
      id: "op.criatura.ocioso", livro: OP, pagina: 244,
      nome: "Ocioso", natureza: "paranormal", tipo: "Criatura", tamanho: "Grande",
      elementos: [CO], vd: 260,
      descricao: "Uma presença parada que só o alvo vê, em todo lugar e a todo momento; não ataca, mas reage — e deixa a vítima viva e incapaz de se mover.",
      presenca: { dt: 35, dano: "8d6", imune: "NEX 80%+" },
      percepcao: "5d20+15", iniciativa: "1d20", sentidos: ["percepção às cegas"],
      defesa: 37, fortitude: "3d20+15", reflexos: "1d20", vontade: "5d20+20",
      pv: 390, machucado: 195,
      resistencias: [[20, "balístico", "corte", "impacto", "Conhecimento"]],
      vulnerabilidades: ["Sangue"],
      atributos: [1, 5, 1, 5, 3],
      deslocamento: [[0, 0, "voo"]],
      habilidades: [
        hab("Sempre Presente", "No começo da cena, escolhe como alvo um personagem que possa ver; só o alvo enxerga o ocioso, que é invisível para os demais."),
      ],
      acoes: [
        acao("reacao", "Retaliação", "Sempre que é atacado ou alvo de uma habilidade, teleporta-se para perto do atacante e faz um ataque corpo a corpo (teste 5d20+30, dano 4d10+20 de impacto não letal).",
          { ataques: [at("Retaliação", "corpo a corpo", 1, "5d20+30", "4d10+20 impacto", { nota: "dano não letal" })] }),
        acao("livre", "Permanecer Próximo", "Uma vez por rodada, teleporta-se para qualquer ponto no campo de visão do alvo.",
          { limite: [1, "rodada"] }),
        acao("completa", "Aterrorizar", "Fica parado, olhando: o alvo, se estiver adjacente, sofre 4d10+10 de dano mental.",
          { rolagens: [dano("Olhar", "4d10+10 mental")] }),
      ],
    },

    {
      id: "op.criatura.parasita-de-culpa", livro: OP, pagina: 246,
      nome: "Parasita de Culpa", natureza: "paranormal", tipo: "Criatura", tamanho: "Médio",
      elementos: [CO, SA, MO, ME], vd: 60,
      descricao: "Criatura disforme que se alimenta da culpa por meio de pesadelos e ilusões tirados do passado da vítima.",
      presenca: { dt: 20, dano: "2d6", imune: "NEX 35%+" },
      percepcao: "4d20", iniciativa: "1d20", sentidos: ["percepção às cegas"],
      defesa: 15, fortitude: "1d20+10", reflexos: "2d20+10", vontade: "4d20+10",
      pv: 90, machucado: 45,
      imunidades: ["dano (exceto o causado pelo hospedeiro)"],
      atributos: [2, 0, 4, 4, 1],
      deslocamento: [[6, 4]],
      habilidades: [
        hab("Devorar Culpa", "Fixado num personagem dormindo, expande a influência: todos que dormem em alcance médio ficam presos num sonho compartilhado até o parasita ser derrotado ou o hospedeiro morrer ou enlouquecer."),
      ],
      acoes: [
        agredir([at("Pancada", "corpo a corpo", 1, "1d20", "1d4 impacto")]),
        acao("completa", "Fixar", "Aproxima-se de um personagem dormindo: Percepção dele (com −2 dados por estar dormindo) contra a Furtividade do parasita (2d20+15). Se passar, acorda e o parasita foge; se falhar, vira hospedeiro.",
          { rolagens: [teste("Furtividade do parasita", "2d20+15")] }),
        acao("completa", "Atormentar", "Fixado num hospedeiro, no início de cada cena do sonho todos os personagens dentro dele sofrem 2d6 de dano mental (Vontade DT 20 reduz à metade).",
          { rolagens: [dano("Tormento", "2d6 mental")], resistencia: "Vontade DT 20 reduz à metade" }),
        acao("completa", "Cópias do Hospedeiro", "Cria uma cópia de Conhecimento do hospedeiro: mesmas estatísticas, 20 PV e dano de Conhecimento. Até quatro cópias. Dentro do sonho, a cópia usa a Presença do parasita no lugar dos atributos e causa dano mental."),
      ],
      enigma: {
        texto: "Os personagens precisam perceber que vivem um sonho compartilhado e descobrir quem é o hospedeiro; então o hospedeiro deve enfrentar e derrotar as manifestações do sonho sozinho. Tudo no sonho, exceto os personagens, é construto de Conhecimento.",
        efeito: "O livro não traz alteração numérica: a solução é narrativa e o mestre conduz o sonho.",
      },
    },

    {
      id: "op.criatura.rastejador-sombrio", livro: OP, pagina: 248,
      nome: "Rastejador Sombrio", natureza: "paranormal", tipo: "Criatura", tamanho: "Médio",
      elementos: [CO, SA], vd: 180,
      descricao: "Entidade sádica de sobretudo e chapéu que se esconde em sombras distorcidas e se aproxima devagar; perde força sob luz forte.",
      presenca: { dt: 25, dano: "6d6", imune: "NEX 60%+" },
      percepcao: "3d20+15", iniciativa: "4d20+15", sentidos: ["percepção às cegas"],
      defesa: 41, fortitude: "3d20+15", reflexos: "4d20+15", vontade: "3d20+10",
      pv: 330, machucado: 165,
      resistencias: [[10, "balístico", "corte", "impacto"], [20, "Conhecimento"]],
      vulnerabilidades: ["Sangue"],
      atributos: [4, 3, 3, 3, 3],
      pericias: [["Furtividade", "4d20+15"], ["Ocultismo", "3d20+15"]],
      deslocamento: [[12, 8]],
      habilidades: [
        hab("Vulnerabilidade a Luz", "Exposto diretamente a uma luz forte que o ilumine por inteiro, sofre −10 na Defesa e perde Desespero, Rastejar e Tentáculos das Sombras.",
          { marcador: "Sob luz forte" }),
      ],
      acoes: [
        agredir([at("Toque da Dor", "corpo a corpo", 3, "4d20+20", "4d8+5 Conhecimento")]),
        acao("livre", "Desespero", "Quem sofre dano do toque da dor sofre a mesma quantidade de dano mental (Vontade DT 25 reduz o dano mental à metade).",
          { resistencia: "Vontade DT 25 reduz o dano mental à metade" }),
        acao("livre", "Rastejar", "Até o início do próximo turno, sob cobertura ou camuflagem parcial, recebe +10 em Furtividade e não tem o deslocamento reduzido por se mover furtivamente."),
        acao("movimento", "Tentáculos das Sombras", "Projeta-se pelas sombras sobre até três seres em alcance médio, que ficam agarrados (Reflexos DT 28 evita). Com uma ação de movimento, arrasta até três agarrados para outros pontos em alcance médio. Quem termina o turno agarrado assim sofre 4d6 de dano mental.",
          { rolagens: [dano("Fim do turno agarrado", "4d6 mental")], resistencia: "Reflexos DT 28 evita" }),
      ],
    },

    {
      id: "op.criatura.silhueta", livro: OP, pagina: 250,
      nome: "Silhueta", natureza: "paranormal", tipo: "Criatura", tamanho: "Médio",
      elementos: [CO], vd: 360,
      descricao: "O eco de alguém inexistido pelo Conhecimento: forma humanoide vazia cercada de sigilos que reescrevem tudo à volta; o que a toca se desfaz.",
      presenca: { dt: 40, dano: "8d8" },
      percepcao: "5d20+25", iniciativa: "4d20+20", sentidos: ["percepção às cegas"],
      defesa: 55, fortitude: "4d20+20", reflexos: "4d20+20", vontade: "5d20+25",
      pv: 500, machucado: 250,
      imunidades: ["condições de paralisia", "efeitos e dano de Conhecimento", "manobras de combate"],
      resistencias: [[30, "dano"]],
      vulnerabilidades: ["Sangue"],
      atributos: [4, 4, 5, 5, 4],
      deslocamento: [[12, 8]],
      habilidades: [
        hab("Aura Tangível", "Todo ser ou item que toca a silhueta sofre 20d12 de dano de Conhecimento (Fortitude DT 42 reduz à metade) e, se cair a 0 PV, é desintegrado. No máximo uma vez por turno para cada ser ou item.",
          { rolagens: [dano("Aura", "20d12 Conhecimento")], resistencia: "Fortitude DT 42 reduz à metade" }),
        hab("Conhecimento Verdadeiro", "Sabe tudo: testes baseados em Intelecto e Presença com +25 e em Agilidade, Força e Vigor com +20.",
          { rolagens: [teste("Teste de INT ou PRE", "5d20+25"), teste("Teste de AGI, FOR ou VIG", "4d20+20")] }),
      ],
      acoes: [
        acao("livre", "Reescrever a Realidade", "Enquanto se desloca, pode transformar objetos em alcance curto em outros do mesmo tamanho. Seres vivos e o que vestem ou carregam não são afetados."),
        acao("padrao", "Toque Devastador", "Toca até dois seres e/ou objetos, causando o dano da Aura Tangível."),
      ],
    },

    {
      id: "op.criatura.vulto", livro: OP, pagina: 251,
      nome: "Vulto", natureza: "paranormal", tipo: "Criatura", tamanho: "Médio",
      elementos: [CO], vd: 40,
      descricao: "Uma criatura de névoa sólida criada pelo Outro Lado a partir do susto de quem imaginou ver algo onde a Membrana está frágil.",
      presenca: { dt: 15, dano: "3d6", imune: "NEX 30%+" },
      percepcao: "2d20+5", iniciativa: "4d20+5", sentidos: ["percepção às cegas"],
      defesa: 19, fortitude: "1d20", reflexos: "4d20+5", vontade: "2d20+5",
      pv: 60, machucado: 30,
      resistencias: [[5, "balístico", "corte", "perfuração"], [10, "Conhecimento"]],
      vulnerabilidades: ["Sangue"],
      atributos: [4, 2, 2, 2, 1],
      pericias: [["Furtividade", "4d20+10"]],
      deslocamento: [[12, 8]],
      habilidades: [
        hab("Aura Tangível", "Os ataques contra criaturas sob qualquer condição de medo causam +2d6 de dano de Conhecimento.",
          { rolagens: [dano("Contra quem tem medo", "2d6 Conhecimento")] }),
      ],
      acoes: [
        agredir([at("Toque Macabro", "corpo a corpo", 2, "4d20+10", "2d6 Conhecimento")]),
        acao("completa", "Plantar Paranoia", "Cada personagem em alcance médio fica abalado (Vontade DT 15 evita); quem já estava abalado fica apavorado. Se o vulto estiver escondido, o teste de Vontade sofre −1 dado.",
          { resistencia: "Vontade DT 15 evita" }),
      ],
    },

    {
      id: "op.criatura.mascara-do-desespero", livro: OP, pagina: 254,
      nome: "Máscara do Desespero", natureza: "paranormal", tipo: "Relíquia", tamanho: "Minúsculo",
      elementos: [CO, ME], vd: 400,
      descricao: "A Relíquia do Conhecimento: máscara indestrutível que soterra o ego de quem a usa e a torna a Magistrada, guardiã do equilíbrio na Realidade.",
      presenca: { dt: 45, dano: "10d8" },
      percepcao: "6d20+35", iniciativa: "4d20+25", sentidos: ["percepção às cegas"],
      defesa: 55, fortitude: "5d20+35", reflexos: "4d20+25", vontade: "6d20+35",
      pv: 1200, machucado: 600,
      imunidades: ["condições", "dano"],
      vulnerabilidades: ["Sangue"],
      atributos: [4, 4, 6, 6, 5],
      pericias: [["Ciência", "6d20+35"], ["Ocultismo", "6d20+35"], ["Religião", "6d20+35"]],
      deslocamento: [[12, 8, "voo"]],
      habilidades: [
        hab("Destronar o Anfitrião", "É a única capaz de resolver o Enigma de Medo do Anfitrião."),
        hab("Potência do Conhecimento", "Em testes de perícia, usa +35 nos baseados em Intelecto, Presença e Vigor e +25 nos demais.",
          { rolagens: [teste("Perícia de INT ou PRE (6)", "6d20+35"), teste("Perícia de VIG (5)", "5d20+35"), teste("Perícia de AGI ou FOR (4)", "4d20+25")] }),
      ],
      acoes: [
        acao("livre", "Conjuração Verdadeira", "Uma vez por turno, conjura um ritual de Conhecimento de qualquer círculo com execução de até uma ação completa, gastando no máximo 20 PE; a DT para resistir é 45.",
          { limite: [1, "turno"] }),
        acao("movimento", "Onipresença", "Vai a qualquer lugar da Realidade onde haja sombra ou escuridão, a qualquer distância, e sabe tudo o que acontece ao mesmo tempo: ninguém se esconde dela e ela não precisa ver ou ouvir para usar habilidades."),
        acao("padrao", "Reescrever Realidade", "Altera seres e objetos em alcance médio. Objetos de até 1 tonelada mudam de composição, posição ou estado (objeto vestido ou empunhado: Reflexos DT 45 do portador evita). Contra um ser: 10d6 de dano de Conhecimento, 10d6 de dano mental e uma condição qualquer, exceto morrendo e enlouquecendo (Vontade DT 45 reduz cada dano à metade e evita a condição).",
          { rolagens: [dano("Contra um ser", ["10d6 Conhecimento", "10d6 mental"])], resistencia: "Vontade DT 45 reduz cada dano à metade e evita a condição" }),
      ],
      enigma: {
        texto: "A Máscara e quem a porta são indestrutíveis, mas há dois caminhos registrados: abalar o Equilíbrio quebrando as regras da Realidade pelo Medo, de forma inexplicável, ou devastar a razão do portador com a brutalidade do Diabo.",
        efeito: "Resolvido, perde a imunidade a dano e Onipresença.",
        altera: { imunidades: ["condições"], desativar: ["Onipresença"] },
      },
    },
    /* ---------------- OPRPG · Criaturas de Energia (p. 256–279) ---------------- */

    {
      id: "op.criatura.anarquico", livro: OP, pagina: 257,
      nome: "Anárquico", natureza: "paranormal", tipo: "Criatura", tamanho: "Médio",
      elementos: [EN], vd: 20,
      descricao: "Quem morre de forma azarada onde a Membrana está danificada: corpo translúcido e brilhante, sorriso rasgado, movimentos erráticos.",
      presenca: { dt: 14, dano: "2d6", imune: "NEX 25%+" },
      percepcao: "-2d20", iniciativa: "3d20+5", sentidos: ["visão no escuro"],
      defesa: 21, fortitude: "1d20", reflexos: "3d20+10", vontade: "-2d20",
      pv: 30, machucado: 15,
      resistencias: [[5, "Energia"]],
      vulnerabilidades: ["Conhecimento"],
      atributos: [3, 2, 0, 0, 1],
      deslocamento: [[9, 6]],
      habilidades: [
        hab("Comportamento Errático", "No começo do turno, rola 1d6. 1–2: salta sobre o personagem mais próximo (investida, ou agredir se já estiver perto; senão corre até ele). 3–4: luz prismática num ser em alcance médio — 2d8 de Energia e atordoado por 1 rodada (Fortitude DT 14 reduz o dano à metade e evita a condição). 5: explosão — 2d6 de Energia em cada ser em alcance curto (Reflexos DT 14 reduz à metade), +1d6 nos adjacentes. 6: gargalhada — faz agredir no mais próximo e, até o fim do próximo turno, fica desprevenido, mas seus ataques não podem ser esquivados. Se não puder cumprir o resultado, fica se contorcendo e ganha resistência a dano 5 até o próximo turno.",
          { rolagens: [soma("Comportamento", "1d6"), dano("Luz prismática", "2d8 Energia"), dano("Explosão", "2d6 Energia"), dano("Explosão (adjacente, extra)", "1d6 Energia")] }),
      ],
      acoes: [
        agredir([at("Pancada Errática", "corpo a corpo", 1, "2d20+5", "2d12 impacto")]),
      ],
    },

    {
      id: "op.criatura.anarquico-descontrolado", livro: OP, pagina: 259,
      nome: "Anárquico Descontrolado", natureza: "paranormal", tipo: "Criatura", tamanho: "Médio",
      elementos: [EN], vd: 120,
      descricao: "Um anárquico nascido de alguém com muita exposição paranormal: translúcido, hiperativo, capaz de explodir o próprio corpo.",
      presenca: { dt: 21, dano: "4d6", imune: "NEX 50%+" },
      percepcao: "2d20+5", iniciativa: "4d20+10", sentidos: ["visão no escuro"],
      defesa: 28, fortitude: "3d20+10", reflexos: "4d20+10", vontade: "2d20+5",
      pv: 120, machucado: 60,
      resistencias: [[10, "balístico", "corte", "perfuração"], [20, "Energia"]],
      vulnerabilidades: ["Conhecimento"],
      atributos: [4, 3, 2, 2, 3],
      deslocamento: [[12, 8]],
      acoes: [
        agredir([at("Pancada Energética", "corpo a corpo", 2, "4d20+15", "4d12 impacto")]),
        acao("livre", "Aceleração", "Quem sofre dano da pancada energética fica acelerado: no próximo turno, se fizer uma ação de movimento e uma padrão (ou uma completa), sofre 4d12 de dano de Energia.",
          { rolagens: [dano("Dano colateral", "4d12 Energia")] }),
        acao("movimento", "Autodestruição", "Explode: 8d12 de dano de Energia em todos os personagens em alcance curto (Reflexos DT 25 reduz à metade; adjacentes sofrem −2 dados no teste). Morre depois.",
          { rolagens: [dano("Explosão", "8d12 Energia")], resistencia: "Reflexos DT 25 reduz à metade" }),
      ],
    },

    {
      id: "op.criatura.anomalia", livro: OP, pagina: 261,
      nome: "Anomalia", natureza: "paranormal", tipo: "Criatura", tamanho: "Médio",
      elementos: [EN, ME], vd: 380,
      descricao: "Um monstro escondido na menor das probabilidades: surge quando se abre uma porta qualquer e persegue quem a manifestou, enlouquecendo-o.",
      presenca: { dt: 45, dano: "9d8" },
      percepcao: "—", iniciativa: "—", sentidos: ["visão no escuro"],
      defesa: "—", fortitude: "5d20+15", reflexos: "5d20+15", vontade: "5d20+15",
      pv: 1000, machucado: 500,
      imunidades: ["dano", "todas as condições"],
      vulnerabilidades: ["Conhecimento"],
      atributos: ["—", "—", 5, 5, "—"],
      deslocamento: [[0, 0]],
      habilidades: [
        hab("Imaterial", "Corpo físico desprezível escondido atrás de Energia: imune a dano e a todas as condições, não faz testes e não age como as outras criaturas. Só é derrotada resolvendo o enigma."),
        hab("Existência Impossível", "Não se desloca: existe só dentro de algo que se abra por uma porta. Com a porta aberta, manifesta-se e usa seus poderes; depois persegue quem a manifestou, surgindo sempre que abrem uma porta ou compartimento."),
      ],
      acoes: [
        acao("livre", "Romper Consciência", "No início do turno, sorteia um ser em linha de visão: 10d6 de dano mental (Vontade DT 41 reduz à metade); se ficar insano por isso, é absorvido.",
          { rolagens: [dano("Romper", "10d6 mental")], resistencia: "Vontade DT 41 reduz à metade" }),
        acao("livre", "Manipular Ondas da Existência", "No fim do turno, ativa, desativa ou opera até seis objetos tecnológicos em alcance médio — ou os sobrecarrega: 2d12 de dano de Energia por objeto em todos os seres na área (Reflexos DT 30 reduz à metade).",
          { rolagens: [dano("Descarga (por objeto)", "2d12 Energia")], resistencia: "Reflexos DT 30 reduz à metade" }),
        acao("completa", "Manifestar o Impossível", "Invoca criaturas de Energia com VD somado de até 240 em alcance curto; agem a partir da próxima rodada, por impulso caótico."),
      ],
      enigma: {
        texto: "A anomalia é o caos colapsando com a Realidade; o único jeito de enfrentá-la é mergulhar nela para entendê-la no Outro Lado.",
        efeito: "Resolvido, ela vira um ser ou objeto aleatório por 2d4 rodadas: nesse tempo perde as imunidades e usa as estatísticas desse ser ou objeto, exceto os PV.",
        altera: { imunidades: [] },
        rolagens: [soma("Rodadas transformada", "2d4")],
      },
    },

    {
      id: "op.criatura.anomiatico", livro: OP, pagina: 263,
      nome: "Anomiático", natureza: "paranormal", tipo: "Criatura", tamanho: "Médio",
      elementos: [EN], vd: 240,
      descricao: "Um anárquico de exposição altíssima em que o caos se multiplicou: vulto de luz que se teleporta rindo e ataca a esmo.",
      presenca: { dt: 30, dano: "6d8", imune: "NEX 75%+" },
      percepcao: "4d20+10", iniciativa: "5d20+15", sentidos: ["visão no escuro"],
      defesa: 41, fortitude: "3d20+10", reflexos: "5d20+20", vontade: "4d20+15",
      pv: 600, machucado: 300,
      resistencias: [[10, "balístico", "corte", "perfuração"], [20, "Energia"]],
      vulnerabilidades: ["Conhecimento"],
      atributos: [5, 3, 1, 4, 3],
      deslocamento: [[18, 12]],
      acoes: [
        agredir([at("Garra Desintegradora", "corpo a corpo", 2, "5d20+30", "4d12+20 Energia")]),
        acao("livre", "Comportamento Errático", "No começo do turno, rola 1d6 três vezes e cumpre os resultados na ordem. 1–2: salta até 18 m rumo ao ser mais próximo e, se ficar adjacente, faz agredir. 3: vira um facho de Energia e vai até um ser sorteado entre os que o enfrentam. 4: parte do corpo explode — 4d12+20 de Energia em alcance médio, 6d12+20 em curto e 8d12+20 em adjacentes (Reflexos DT 30 reduz à metade para quem está em médio ou curto); perde 50 PV. 5: gargalhada — desprevenido até o próximo turno, mas seus ataques não podem ser esquivados. 6: toca um ser adjacente — 10d12+20 de Energia (Fortitude DT 30 reduz à metade). Cada ação que não puder cumprir é perdida e soma +10 às resistências a dano até o próximo turno.",
          { rolagens: [soma("Comportamento", "1d6"), dano("Explosão (médio)", "4d12+20 Energia"), dano("Explosão (curto)", "6d12+20 Energia"), dano("Explosão (adjacente)", "8d12+20 Energia"), dano("Toque", "10d12+20 Energia")] }),
      ],
    },

    {
      id: "op.criatura.ciborgue", livro: OP, pagina: 265,
      nome: "Ciborgue", natureza: "paranormal", tipo: "Criatura", tamanho: "Grande",
      elementos: [EN, SA, ME], vd: 80,
      descricao: "Um cientista que trocou os próprios membros por mecanismos movidos a Energia paranormal até virar um aglomerado brutal de metal e carne.",
      presenca: { dt: 15, dano: "2d6", imune: "NEX 40%+" },
      percepcao: "2d20+5", iniciativa: "2d20+10", sentidos: ["visão no escuro"],
      defesa: 25, fortitude: "3d20+10", reflexos: "3d20+5", vontade: "2d20",
      pv: 160, machucado: 80,
      imunidades: ["condições de paralisia"],
      resistencias: [[10, "balístico", "corte", "perfuração"], [20, "Energia"]],
      vulnerabilidades: ["Conhecimento"],
      atributos: [3, 3, 2, 2, 3],
      deslocamento: [[9, 6]],
      estados: [
        { id: "alpha", nome: "Estado Alpha perdido", maximo: 1 },
        { id: "beta", nome: "Estado Beta perdido", maximo: 1 },
        { id: "gama", nome: "Estado Gama perdido", maximo: 1 },
        { id: "delta", nome: "Estado Delta perdido", maximo: 1 },
      ],
      habilidades: [
        hab("Estado de Combate", "No começo do turno, assume um estado disponível: Alpha (atacar quem está perto), Beta (perseguir e atacar quem está longe), Gama (ataques à distância) ou Delta (tático e defensivo). O estado define quais ações pode usar. Um estado deixa de existir quando sua fraqueza é resolvida."),
        hab("Regeneração Energética", "Recupera 20 PV no começo do turno. Perde esta habilidade ao perder três ou mais estados.",
          { marcador: "Perdida" }),
      ],
      acoes: [
        agredir([at("Braço Laminado", "corpo a corpo", 2, "3d20+10", "1d12+10 corte", { critico: "18" })], { nome: "Agredir (Estado Alpha)" }),
        agredir([at("Punho Energizado", "corpo a corpo", 1, "3d20+10", "2d8+10 impacto")], { nome: "Agredir (Estado Beta)" }),
        acao("completa", "Investida Energética (Estado Beta)", "Avança até 24 m e ataca com o punho energizado com +1 dado; se acertar, +2d8 de dano (total 4d8+10) e derruba o alvo (Fortitude DT 20 evita a queda).",
          { rolagens: [teste("Punho com +1 dado", "4d20+10"), dano("Punho na investida", "4d8+10 impacto")] }),
        agredir([at("Canhão", "longo", 1, "3d20+10", "4d12+5 Energia")], { nome: "Agredir (Estado Gama)" }),
        agredir([at("Raio Energético", "médio", 1, "3d20+10", "1d12+5 Energia")], { nome: "Agredir (Estado Delta)" }),
        acao("movimento", "Criar Barreira (Estado Delta)", "+5 na Defesa até o início do próximo turno."),
        acao("movimento", "Reiniciar (Estado Delta)", "Encerra uma condição que o afete."),
        acao("livre", "Desorientar (Estado Delta)", "Quem sofre dano do raio energético fica alquebrado; se já estava, fica atordoado por 1 rodada (Vontade DT 20 evita).",
          { resistencia: "Vontade DT 20 evita" }),
      ],
      enigma: {
        texto: "Cada estado de combate tem uma fraqueza definida quando a Entidade o cria (por exemplo, 15 de dano de um tipo num único ataque, ou contato com uma substância). Uma fraqueza só é resolvida com o ciborgue no estado correspondente, e aquele estado deixa de existir.",
        efeito: "Sem nenhum estado, ele se desativa: Defesa 10 e deslocamento 0 m. Marque os estados perdidos; o estado “desativado” equivale ao enigma resolvido.",
        altera: { defesa: 10, deslocamento: [[0, 0]] },
      },
    },

    {
      id: "op.criatura.infecticidio", livro: OP, pagina: 267,
      nome: "Infecticídio", natureza: "paranormal", tipo: "Criatura", tamanho: "Enorme",
      elementos: [EN, SA], vd: 280,
      descricao: "Um vírus paranormal que nasce digital, infecta pessoas por aparelhos, sangue ou saliva e forma uma horda de mente compartilhada.",
      presenca: { dt: 35, dano: "8d6", imune: "NEX 85%+" },
      percepcao: "1d20+10", iniciativa: "3d20+15", sentidos: ["visão no escuro"],
      defesa: 25, fortitude: "5d20+20", reflexos: "3d20+15", vontade: "1d20+15",
      pv: 600, machucado: 300,
      resistencias: [[20, "balístico", "corte", "perfuração", "Energia"]],
      vulnerabilidades: ["Conhecimento"],
      atributos: [3, 5, 1, 1, 5],
      deslocamento: [[9, 6]],
      habilidades: [
        hab("Horda", "Sofre metade do dano de ataques e habilidades de alvo único e o dobro de efeitos de área. Quando erra um ataque, ainda causa metade do dano (exceto se o defensor usou reação para se esquivar)."),
      ],
      acoes: [
        agredir([at("Pancadas Infectadas", "corpo a corpo", 3, "5d20+30", "4d12+20 Energia")]),
        acao("livre", "Infecção", "Quem sofre dano das pancadas contrai a doença vírus do infecticídio (Fortitude DT 30 evita); quem passa fica imune a ela até o fim da cena.",
          { resistencia: "Fortitude DT 30 evita" }),
        acao("reacao", "Consumação Insidiosa", "Ao reduzir um ser a 0 PV com as pancadas, consome a vítima e recupera 50 PV."),
        acao("completa", "Atropelar", "Percorre até o dobro do deslocamento, atravessando o espaço de outros seres, e faz um ataque de pancada contra cada ser por onde passar."),
      ],
    },

    {
      id: "op.criatura.perturbado-de-energia", livro: OP, pagina: 268,
      nome: "Perturbado de Energia", natureza: "paranormal", tipo: "Criatura", tamanho: "Médio",
      elementos: [EN], vd: 40,
      descricao: "Uma alma enlouquecida tão de repente que não percebeu que morreu: forma plasmática confusa que se agarra a qualquer consciência por perto.",
      presenca: { dt: 15, dano: "2d8", imune: "NEX 30%+" },
      percepcao: "-2d20", iniciativa: "4d20+10", sentidos: ["visão no escuro"],
      defesa: 19, fortitude: "-2d20", reflexos: "4d20+10", vontade: "-2d20",
      pv: 60, machucado: 30,
      resistencias: [[5, "balístico", "corte", "perfuração"], [10, "Energia"]],
      vulnerabilidades: ["Conhecimento"],
      atributos: [4, 1, 0, 0, 0],
      deslocamento: [[9, 6]],
      notas: ["O teste de agarrar de Implantar Confusão está impresso como “4d+10”, sem o tipo do dado; aqui ele foi lido como 4d20+10, o mesmo do toque plasmático. Confira no livro (p. 268)."],
      acoes: [
        agredir([at("Toque Plasmático", "corpo a corpo", 2, "4d20+10", "2d12 Energia")]),
        acao("livre", "Implantar Confusão", "Uma vez por rodada, tenta agarrar um personagem que acabou de sofrer dano do toque plasmático. Se conseguir, faz o alvo reviver traumas: 2d8 de dano mental (Vontade DT 15 reduz à metade) e vulnerabilidade a dano de Energia até o fim da cena.",
          { limite: [1, "rodada"], rolagens: [teste("Agarrar (lido como 4d20+10)", "4d20+10"), dano("Traumas", "2d8 mental")], resistencia: "Vontade DT 15 reduz à metade" }),
      ],
    },

    {
      id: "op.criatura.sukkalgir", livro: OP, pagina: 269,
      nome: "Sukkalgir", natureza: "paranormal", tipo: "Criatura", tamanho: "Médio",
      elementos: [EN, CO], vd: 160,
      descricao: "Alma da antiga Suméria torturada a brasa com os feitos do captor; labareda de cores impossíveis que grita sem parar.",
      presenca: { dt: 25, dano: "4d8", imune: "NEX 55%+" },
      percepcao: "3d20+10", iniciativa: "3d20+10", sentidos: ["visão no escuro"],
      defesa: 34, fortitude: "2d20+5", reflexos: "3d20+10", vontade: "3d20+15",
      pv: 220, machucado: 110,
      imunidades: ["dano balístico, de corte e de perfuração"],
      resistencias: [[10, "impacto", "Energia"]],
      vulnerabilidades: ["Conhecimento"],
      atributos: [3, 2, 3, 3, 2],
      deslocamento: [[18, 12, "voo"]],
      habilidades: [
        hab("Aura Desesperada", "Quem começa o turno em alcance curto sofre 2d12 de dano mental (Vontade DT 25 reduz à metade).",
          { rolagens: [dano("Aura", "2d12 mental")], resistencia: "Vontade DT 25 reduz à metade" }),
        hab("Espírito Plasmático", "Parcialmente intangível: atravessa obstáculos sólidos como paredes."),
      ],
      acoes: [
        agredir([at("Mordida do Outro Lado", "corpo a corpo", 2, "3d20+15", "2d12 mental")]),
        acao("livre", "Agarrão", "Ao acertar a mordida num ser Médio ou menor, pode agarrá-lo (teste 3d20+15).",
          { rolagens: [teste("Agarrar", "3d20+15")] }),
        acao("completa", "Grito de Desespero", "Cada ser em alcance médio sofre 3d12 de dano mental (Vontade DT 20 reduz à metade; cobertura dá +5 no teste).",
          { rolagens: [dano("Grito", "3d12 mental")], resistencia: "Vontade DT 20 reduz à metade" }),
      ],
    },

    {
      id: "op.criatura.telopsia", livro: OP, pagina: 271,
      nome: "Telopsia", natureza: "paranormal", tipo: "Criatura", tamanho: "Médio",
      elementos: [EN, MO, ME], vd: 340,
      descricao: "A criatura da fita VHS amaldiçoada: homem esquelético de sobretudo com uma TV no lugar da cabeça, que vem buscar quem assistiu ao filme.",
      presenca: { dt: 40, dano: "10d6", imune: "NEX 99%+" },
      percepcao: "5d20+25", iniciativa: "4d20+20", sentidos: ["visão no escuro"],
      defesa: 48, fortitude: "2d20+15", reflexos: "4d20+20", vontade: "5d20+25",
      pv: 560, machucado: 280,
      imunidades: ["condições de paralisia"],
      resistencias: [[20, "balístico", "corte", "perfuração", "Energia"]],
      vulnerabilidades: ["Conhecimento"],
      atributos: [4, 2, 3, 5, 2],
      pericias: [["Furtividade", "4d20+20"]],
      deslocamento: [[12, 8]],
      acoes: [
        agredir([at("Toque Desintegrador", "corpo a corpo", 3, "4d20+35", "6d12+30 Energia")]),
        acao("movimento", "Viajar pela Tela", "Desmaterializa-se e reaparece em outra tela ou visor em alcance longo; depois se desloca 9 m."),
        acao("padrao", "Tela Zumbificadora", "Todos em alcance médio sofrem 6d6 de dano mental e ficam confusos até o fim da cena (Vontade DT 30 reduz o dano à metade e evita a condição). Quem já está confuso e falha fica também fascinado.",
          { rolagens: [dano("Imagens", "6d6 mental")], resistencia: "Vontade DT 30 reduz à metade e evita a condição" }),
        acao("completa", "Prender na Tela", "Desintegra um ser em alcance curto e o materializa na própria tela (Fortitude DT 30 evita): paralisado, sofre 2d12 de dano mental no início de cada turno. Cada vez que o telopsia sofre 50 ou mais de dano num turno, o preso repete o teste; passando, sai num ponto adjacente à escolha dele.",
          { rolagens: [dano("Preso na tela", "2d12 mental")], resistencia: "Fortitude DT 30 evita" }),
      ],
      enigma: {
        texto: "A teoria é destruir a própria fita amaldiçoada, investigando as vítimas para achá-la — e ninguém lembra o que fez com ela depois de assistir. Sem isso, mesmo derrotado, ele volta com o tempo.",
        efeito: "Destruída a fita, os PV do telopsia caem a 0 e ele é destruído.",
      },
    },

    {
      id: "op.criatura.tempestuoso", livro: OP, pagina: 273,
      nome: "Tempestuoso", natureza: "paranormal", tipo: "Criatura", tamanho: "Médio",
      elementos: [EN], vd: 360,
      descricao: "Uma supernova implodindo em forma humanoide, contida por cabos de tecnologia estranha; surge em lugares como usinas radioativas abandonadas.",
      presenca: { dt: 40, dano: "8d8" },
      percepcao: "5d20+20", iniciativa: "4d20+25", sentidos: ["visão no escuro"],
      defesa: 56, fortitude: "4d20+20", reflexos: "5d20+30", vontade: "5d20+25",
      pv: 950, machucado: 475,
      imunidades: ["condições de paralisia"],
      resistencias: [[20, "balístico", "corte", "perfuração", "Energia"]],
      vulnerabilidades: ["Conhecimento"],
      atributos: [5, 4, 2, 5, 4],
      deslocamento: [[24, 12]],
      notas: ["Deslocamento impresso como 24 m | 12 quadrados (24 m seriam 16 quadrados); mantido como publicado."],
      habilidades: [
        hab("Aura Radioativa", "Quem começa o turno em alcance curto sofre 2d20+20 de dano de Energia (Fortitude DT 40 reduz à metade).",
          { rolagens: [dano("Aura", "2d20+20 Energia")], resistencia: "Fortitude DT 40 reduz à metade" }),
        hab("Espectro Radioativo", "Ataques e habilidades corpo a corpo dele alcançam até alcance curto."),
      ],
      acoes: [
        agredir([at("Garras Radioativas", "corpo a corpo", 2, "5d20+40", "4d20+20 Energia", { nota: "alcançam alvos em alcance curto" })]),
        acao("livre", "Raio de Energia Radioativa", "Ao acertar duas garras no mesmo ser, projeta dele um raio para outro alvo em alcance médio: 4d20+20 de dano de Energia (Reflexos DT 40 reduz à metade).",
          { rolagens: [dano("Raio", "4d20+20 Energia")], resistencia: "Reflexos DT 40 reduz à metade" }),
        acao("completa", "Expandir em Radiação", "Explosão: cada ser em alcance longo sofre 10d20+20 de dano de Energia (Reflexos DT 40 reduz à metade). O tempestuoso perde 100 PV.",
          { rolagens: [dano("Explosão", "10d20+20 Energia")], resistencia: "Reflexos DT 40 reduz à metade" }),
      ],
    },

    {
      id: "op.criatura.viajante", livro: OP, pagina: 274,
      nome: "Viajante", natureza: "paranormal", tipo: "Criatura", tamanho: "Médio",
      elementos: [EN, CO, ME], vd: 200,
      descricao: "O viajante das Polaroids: invisível, anda por paredes e tetos, viaja por fotografias e devora rostos e memórias.",
      presenca: { dt: 20, dano: "6d6", imune: "NEX 60%" },
      percepcao: "4d20+15", iniciativa: "4d20+15", sentidos: ["visão no escuro"],
      defesa: 34, fortitude: "2d20+10", reflexos: "4d20+15", vontade: "4d20+15",
      pv: 360, machucado: 180,
      resistencias: [[10, "balístico", "corte", "perfuração"], [20, "Energia"]],
      vulnerabilidades: ["Conhecimento"],
      atributos: [4, 2, 3, 4, 2],
      deslocamento: [[9, 6], [9, 6, "escalada"]],
      notas: ["A linha da Presença Perturbadora está impressa como “NEX 60% DT 20 6d6 mental”, sem o “+ é imune” das outras fichas."],
      habilidades: [
        hab("Invisibilidade Permanente", "É invisível: camuflagem total, +15 em Furtividade, e quem não pode vê-lo fica desprevenido contra os ataques dele."),
      ],
      acoes: [
        agredir([at("Pancada", "corpo a corpo", 2, "4d20+15", "2d12+10 impacto")]),
        acao("livre", "Agarrão", "Ao acertar a pancada num ser Médio ou menor, pode agarrá-lo (teste 4d20+15).",
          { rolagens: [teste("Agarrar", "4d20+15")] }),
        acao("completa", "Devorar Memória", "Entra na mente de quem está agarrando: 4d12 de dano mental e a vítima esquece completamente uma pessoa (Vontade DT 29 reduz o dano à metade e evita o efeito). Para cada ser que deixar perturbado assim, a pancada causa +1d12 até o fim da cena.",
          { rolagens: [dano("Devorar", "4d12 mental"), dano("Pancada +1d12", "1d12")], resistencia: "Vontade DT 29 reduz à metade e evita o efeito" }),
      ],
      enigma: {
        texto: "Só se enxerga o viajante fotografando-o: capturar a existência dele numa imagem, sem que ele esteja viajando por ela, o distrai e o torna visível por alguns segundos.",
        efeito: "Resolvido, perde Invisibilidade Permanente até o início do próximo turno de quem capturou a imagem.",
        altera: { desativar: ["Invisibilidade Permanente"] },
      },
    },

    {
      id: "op.criatura.o-anfitriao", livro: OP, pagina: 278,
      nome: "O Anfitrião", natureza: "paranormal", tipo: "Criatura", tamanho: "Médio",
      elementos: [EN, CO, ME], vd: 400,
      descricao: "A personificação do caos e da irracionalidade, que transforma tudo o que toca; começa o combate dividido em cinco facetas teatrais.",
      presenca: { dt: 45, dano: "10d8" },
      percepcao: "6d20+25", iniciativa: "7d20+35", sentidos: ["visão no escuro"],
      defesa: 59, fortitude: "5d20+25", reflexos: "7d20+35", vontade: "6d20+25",
      pv: 1413, machucado: 706,
      imunidades: ["condições de paralisia", "dano", "dano e efeitos de Energia"],
      vulnerabilidades: ["Conhecimento"],
      atributos: [7, 5, 6, 6, 5],
      deslocamento: [[12, 8]],
      notas: ["Os PV estão impressos como “01413”, no mesmo estilo gráfico do “VD 0400”; aqui, 1413."],
      estados: [{ id: "ato2", nome: "Ato 2 (forma única)", maximo: 1 }],
      habilidades: [
        hab("Transformar a Morte", "Só o caos ilógico do Anfitrião enfrenta a onipresença temporal do Deus da Morte e resolve o enigma dele."),
        hab("Potência de Energia", "Em testes de perícia, usa +35 nos baseados em Agilidade e Intelecto e +25 nos demais.",
          { rolagens: [teste("Perícia de AGI (7)", "7d20+35"), teste("Perícia de INT (6)", "6d20+35"), teste("Perícia de PRE (6)", "6d20+25"), teste("Perícia de FOR ou VIG (5)", "5d20+25")] }),
        hab("Ato 1", "Começa o combate dividido em cinco facetas — Amphitruo, Aeneas, Liber, Silenus e Plautus —, cada uma com as estatísticas do Anfitrião, mas 250 PV e resistência a dano 20, usando só as habilidades e ataques com o próprio nome. Destruídas todas, começa o Ato 2. (O catálogo traz as cinco facetas como variantes desta ficha.)"),
        hab("Ato 2", "Volta à forma única com todos os PV, pode usar todas as habilidades (inclusive as das facetas) e fazer 3 ações padrão diferentes por rodada.",
          { requer: ["ato2", 1] }),
        hab("Trilha Sonora (Ato 2)", "No início de cada turno do Anfitrião, cada ser em alcance longo sofre 2d10 de dano mental.",
          { requer: ["ato2", 1], rolagens: [dano("Trilha", "2d10 mental")] }),
        hab("Roleta Maluca (Ato 2)", "No começo do turno, cada ser em alcance longo rola 1d6 (efeitos iguais acumulam): 1 — −5 na Defesa até o fim da cena; 2 — gasta uma ação completa fazendo coisas sem sentido ou sofre 4d10 de dano mental no fim do turno; 3 — 4d20 de dano de Energia; 4 — −1 dado em Pontaria até o fim da cena; 5 — −1 dado em Luta até o fim da cena; 6 — nada.",
          { requer: ["ato2", 1], rolagens: [soma("Roleta (por ser)", "1d6"), dano("Resultado 2", "4d10 mental"), dano("Resultado 3", "4d20 Energia")] }),
      ],
      acoes: [
        acao("padrao", "Teatro (Amphitruo)", "Projeta na mente do alvo um texto quase incompreensível, que precisa ser decorado e recitado perfeitamente em segundos, ou o alvo sofre 10d6 de dano mental (Artes DT 35 ou Vontade DT 45 evita).",
          { rolagens: [dano("Teatro", "10d6 mental")], resistencia: "Artes DT 35 ou Vontade DT 45 evita" }),
        acao("padrao", "Queimar (Aeneas)", "Chamas num cone em alcance médio: 10d6+20 de dano de Energia (Reflexos DT 45 reduz à metade).",
          { rolagens: [dano("Chamas", "10d6+20 Energia")], resistencia: "Reflexos DT 45 reduz à metade" }),
        agredir([at("Corte Caótico", "corpo a corpo", 1, "7d20+45", "3d12+20 Energia")], { nome: "Agredir (Liber)" }),
        acao("livre", "Romance Forçado (Liber)", "Ao acertar o corte caótico, escolhe outro ser que veja: os dois decidem entre si, antes de rolar o dano, quem sofre o ataque."),
        agredir([at("Lança e Adaga", "corpo a corpo", 2, "7d20+45", "2d12+20 Energia")], { nome: "Agredir (Plautus)" }),
        acao("livre", "Eu Sou o Caos (Plautus)", "Ao acertar Lança e Adaga num ser desprevenido ou flanqueado, causa +4d12 de dano de Energia.",
          { rolagens: [dano("Caos", "4d12 Energia")] }),
        agredir([at("Corte de Água", "corpo a corpo", 1, "7d20+45", "5d12+20 Energia")], { nome: "Agredir (Silenus)" }),
        acao("livre", "Afogamento (Silenus)", "Quem sofre dano do Corte de Água fica asfixiado (Fortitude DT 35 evita); repete o teste no fim de cada turno e, passando, a condição termina.",
          { resistencia: "Fortitude DT 35 evita" }),
        acao("movimento", "Teletransporte", "Transporta-se para outro ponto em alcance médio."),
      ],
      enigma: {
        texto: "O Anfitrião é caos puro; enfrentá-lo de forma justa só sob a proteção soberana do Equilíbrio, que apenas a Máscara do Desespero pode oferecer.",
        efeito: "O livro não traz alteração numérica para a resolução: o mestre decide o efeito.",
      },
    },

    /* ---------------- OPRPG · Criatura do Medo (p. 280–283) ---------------- */

    {
      id: "op.criatura.degolificada", livro: OP, pagina: 282,
      nome: "Degolificada", natureza: "paranormal", tipo: "Criatura", tamanho: "Médio",
      elementos: [ME, EN, CO, SA, MO], vd: 320,
      descricao: "Manifestação de todos os elementos ligada a tragédias com jovens em rituais: flutua, cabelos longos se arrastando, cercada de almas atormentadas.",
      presenca: { dt: 40, dano: "9d6", imune: "NEX 95%+" },
      percepcao: "4d20+15", iniciativa: "3d20", sentidos: ["percepção às cegas"],
      defesa: 45, fortitude: "4d20+20", reflexos: "3d20+15", vontade: "4d20+25",
      pv: 850, machucado: 425,
      imunidades: ["dano"],
      atributos: [3, 5, 3, 4, 4],
      deslocamento: [[6, 4]],
      estados: [
        { id: "conturbada", nome: "Conturbada (Energia)", maximo: 1 },
        { id: "gnostica", nome: "Gnóstica (Conhecimento)", maximo: 1 },
        { id: "devoradora", nome: "Devoradora (Sangue)", maximo: 1 },
        { id: "decrepita", nome: "Decrépita (Morte)", maximo: 1 },
      ],
      notas: ["Metamorfoses (p. 283): o texto chama a forma de Sangue de “devoradora”; a legenda da arte, de “devorada”."],
      habilidades: [
        hab("Criatura do Medo", "Imune a dano até que se resolva o mistério da sua origem."),
        hab("Metamorfose: Conturbada (Energia)", "Ao enlouquecer um alvo, vira espectro de Energia: atravessa paredes, ignora coberturas, seus ataques causam dano de Energia e ganha resistência a Energia 20.",
          { requer: ["conturbada", 1] }),
        hab("Metamorfose: Gnóstica (Conhecimento)", "Ao receber uma resposta errada para o enigma: no fim de cada turno dela, o alvo visível mais próximo tem uma alucinação ligada ao enigma — 4d6 de dano mental e atordoado até o fim do próximo turno (Vontade DT 35 reduz o dano à metade e evita a condição).",
          { requer: ["gnostica", 1], rolagens: [dano("Alucinação", "4d6 mental")], resistencia: "Vontade DT 35 reduz à metade e evita a condição" }),
        hab("Metamorfose: Devoradora (Sangue)", "Se matar um alvo e mantê-lo agarrado até o próximo turno, absorve-o: ganha uma mordida adicional (5d20+35, 10d10+20 de Sangue) e resistência a Sangue 20.",
          { requer: ["devoradora", 1], ataques: [at("Mordida (devoradora)", "corpo a corpo", 1, "5d20+35", "10d10+20 Sangue")] }),
        hab("Metamorfose: Decrépita (Morte)", "Depois de três erros seguidos de ataques contra ela: deslocamento 12 m, resistência a Morte 20 e, com uma ação de movimento, agarra com os cabelos de lodo uma criatura em alcance curto (Reflexos DT 35 evita).",
          { requer: ["decrepita", 1], resistencia: "Reflexos DT 35 evita" }),
      ],
      acoes: [
        agredir([at("Pancada", "corpo a corpo", 2, "5d20+35", "8d8+20 impacto")]),
        acao("livre", "Agarrar e Estrangular", "Ao acertar a pancada num personagem Médio ou menor, pode agarrá-lo (teste 5d20+35); o agarrado também fica asfixiado. Mantém até dois.",
          { rolagens: [teste("Agarrar", "5d20+35")] }),
        acao("livre", "Grito Rasgado", "Uma vez por cena: cada personagem em alcance médio sofre 4d10+10 de dano mental e um efeito de 1d4 (Vontade DT 35 reduz o dano à metade e evita o efeito) — 1: surdo dos dois ouvidos para sempre; 2: surdo de um ouvido para sempre; 3: surdo dos dois até o fim da cena; 4: surdo de um até o fim da cena. Cada efeito conta como lesão (p. 174).",
          { limite: [1, "cena"], rolagens: [dano("Grito", "4d10+10 mental"), soma("Efeito do grito", "1d4")], resistencia: "Vontade DT 35 reduz à metade e evita o efeito" }),
        acao("movimento", "Desfiguramento Capilar", "Cada personagem agarrado sofre 10d6+20 de perfuração (Fortitude DT 35 reduz à metade) e 6d10 de dano mental (Vontade DT 35 reduz à metade).",
          { rolagens: [dano("Cabelos", "10d6+20 perfuração"), dano("Olhar vazio", "6d10 mental")] }),
      ],
      enigma: {
        texto: "Ela precisa ser confrontada com a causa da própria morte, sem poder escapar do confronto.",
        efeito: "Confrontada assim, perde a imunidade a dano.",
        altera: { imunidades: [] },
      },
    },
    /* ---------------- OPRPG · Ameaças da Realidade (p. 284–289) ---------------- */

    {
      id: "op.criatura.bandido", livro: OP, pagina: 284,
      nome: "Bandido", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Criminosos & Mercenários",
      elementos: [], vd: 10,
      descricao: "Um criminoso típico, como um ladrão ou assaltante.",
      percepcao: "1d20", iniciativa: "2d20+5",
      defesa: 14, fortitude: "1d20", reflexos: "2d20+5", vontade: "1d20",
      pv: 8, machucado: 4,
      atributos: [2, 2, 1, 1, 1],
      pericias: [["Crime", "2d20+5"], ["Furtividade", "2d20+5"]],
      deslocamento: [[9, 6]],
      acoes: [
        agredir([at("Faca", "corpo a corpo", 1, "2d20+5", "1d4+2 perfuração")]),
        acao("livre", "Ataque Furtivo", "Uma vez por rodada, +1d6 de dano com ataque corpo a corpo, ou à distância em alcance curto, contra alvo desprevenido ou que esteja flanqueando.",
          { limite: [1, "rodada"], rolagens: [dano("Furtivo", "1d6")] }),
      ],
    },

    {
      id: "op.criatura.capanga", livro: OP, pagina: 284,
      nome: "Capanga", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Criminosos & Mercenários",
      elementos: [], vd: 20,
      descricao: "Gente embrutecida que vive da violência: membros de gangue, executores da máfia, leões de chácara.",
      percepcao: "1d20+5", iniciativa: "1d20+5",
      defesa: 13, fortitude: "2d20+5", reflexos: "1d20+5", vontade: "1d20",
      pv: 17, machucado: 8,
      atributos: [1, 2, 1, 1, 2],
      pericias: [["Intimidação", "1d20+5"]],
      deslocamento: [[9, 6]],
      acoes: [
        agredir([at("Bastão", "corpo a corpo", 1, "2d20+5", "1d8+7 impacto")]),
        agredir([at("Revólver", "curto", 1, "1d20+5", "2d6+5 balístico", { critico: "19/x3" })], { nome: "Agredir (distância)" }),
        acao("livre", "Ataque Furtivo", "Uma vez por rodada, +2d6 de dano com ataque corpo a corpo, ou à distância em alcance curto, contra alvo desprevenido ou que esteja flanqueando.",
          { limite: [1, "rodada"], rolagens: [dano("Furtivo", "2d6")] }),
      ],
    },

    {
      id: "op.criatura.soldado-de-aluguel", livro: OP, pagina: 284,
      nome: "Soldado de Aluguel", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Criminosos & Mercenários",
      elementos: [], vd: 40,
      descricao: "Combatente profissional que trabalha para quem pagar mais.",
      percepcao: "1d20+5", iniciativa: "2d20+10",
      defesa: 18, fortitude: "2d20+5", reflexos: "2d20+5", vontade: "1d20",
      pv: 25, machucado: 12,
      atributos: [2, 2, 1, 1, 2],
      deslocamento: [[9, 6]],
      acoes: [
        agredir([at("Machete", "corpo a corpo", 1, "2d20+10", "1d6+9 corte", { critico: "19" })]),
        agredir([at("Fuzil de Assalto", "médio", 1, "2d20+10", "2d8+9 balístico", { critico: "19/x3" })], { nome: "Agredir (distância)" }),
        acao("completa", "Ataque em Movimento", "Percorre o deslocamento e ataca em qualquer ponto do trajeto."),
      ],
    },

    {
      id: "op.criatura.assassino", livro: OP, pagina: 285,
      nome: "Assassino", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Criminosos & Mercenários",
      elementos: [], vd: 80,
      descricao: "Matador habilidoso e furtivo, chamado quando é preciso eliminar alguém com discrição.",
      percepcao: "3d20+10", iniciativa: "4d20+15",
      defesa: 26, fortitude: "2d20+5", reflexos: "4d20+10", vontade: "3d20+10",
      pv: 90, machucado: 45,
      atributos: [4, 2, 3, 3, 2],
      pericias: [["Crime", "4d20+10"], ["Enganação", "3d20+10"], ["Furtividade", "4d20+10"]],
      deslocamento: [[9, 6]],
      habilidades: [
        hab("Evasão", "Contra um efeito que permite Reflexos para reduzir o dano à metade, não sofre dano algum se passar."),
      ],
      acoes: [
        agredir([at("Faca", "corpo a corpo", 2, "4d20+17", "1d4+11 corte", { critico: "19" })]),
        agredir([at("Pistola", "curto", 2, "4d20+15", "1d12+14 balístico", { critico: "16/x4" })], { nome: "Agredir (distância)" }),
        acao("livre", "Ataque Furtivo", "Uma vez por rodada, +4d6 de dano com ataque corpo a corpo, ou à distância em alcance curto, contra alvo desprevenido ou que esteja flanqueando.",
          { limite: [1, "rodada"], rolagens: [dano("Furtivo", "4d6"), dano("Furtivo dobrado (Assassinar)", "8d6")] }),
        acao("livre", "Mão na Boca", "Num ataque corpo a corpo furtivo contra criatura desprevenida, pode tentar agarrá-la (teste 2d20+15); agarrada, ela não consegue falar.",
          { rolagens: [teste("Agarrar", "2d20+15")] }),
        acao("movimento", "Assassinar", "Analisa uma criatura em alcance curto: até o fim do próximo turno, o primeiro Ataque Furtivo que causar dano a ela tem os dados extras dobrados."),
      ],
    },

    {
      id: "op.criatura.comandante-mercenario", livro: OP, pagina: 285,
      nome: "Comandante Mercenário", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Criminosos & Mercenários",
      elementos: [], vd: 120,
      descricao: "Veterano endurecido por anos de conflito: oficial capaz de liderar e combatente perigoso.",
      percepcao: "2d20+10", iniciativa: "3d20+15",
      defesa: 29, fortitude: "3d20+10", reflexos: "3d20+10", vontade: "2d20+5",
      pv: 145, machucado: 72,
      resistencias: [[5, "balístico", "corte", "impacto", "perfuração"]],
      atributos: [3, 3, 2, 2, 3],
      pericias: [["Intimidação", "2d20+10"], ["Tática", "2d20+10"]],
      deslocamento: [[6, 4]],
      habilidades: [
        hab("Sadismo", "Depois de causar dano a um inimigo, recebe +1 dado em testes de ataque e, se acertar, causa mais um dado de dano do mesmo tipo.",
          { marcador: "Ativo" }),
      ],
      acoes: [
        agredir([at("Machete", "corpo a corpo", 2, "3d20+17", "1d6+15 corte", { critico: "19" })]),
        agredir([at("Metralhadora", "médio", 2, "2d20+17", "3d12+15 balístico", { critico: "19/x3" })], { nome: "Agredir (distância)" }),
        acao("completa", "Ataque em Movimento", "Percorre o deslocamento e ataca em qualquer ponto do trajeto, podendo fazer os dois ataques corpo a corpo ou os dois à distância."),
        acao("movimento", "Ordens", "Aliados em alcance médio recebem +1 dado em testes de perícia e causam mais um dado de dano do mesmo tipo até o fim da cena."),
      ],
    },

    {
      id: "op.criatura.iniciado", livro: OP, pagina: 286,
      nome: "Iniciado", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Cultistas",
      elementos: [], vd: 20,
      descricao: "Cultista no começo da adoração às entidades, mas já capaz de conjurar rituais.",
      percepcao: "2d20+5", iniciativa: "1d20",
      defesa: 16, fortitude: "1d20", reflexos: "1d20", vontade: "2d20+5",
      pv: 15, machucado: 7,
      atributos: [1, 1, 2, 2, 1],
      pericias: [["Enganação", "2d20+5"], ["Ocultismo", "2d20+5"]],
      deslocamento: [[9, 6]],
      habilidades: [
        hab("Conjurador", "Escolha dois rituais de 1º círculo de um elemento. Conjura-os até um limite de 3 PE por conjuração, com a ação de cada ritual. DT dos rituais: 15."),
      ],
      acoes: [
        agredir([at("Faca", "corpo a corpo", 1, "1d20", "1d4+1 corte", { critico: "19" })]),
      ],
    },

    {
      id: "op.criatura.investido", livro: OP, pagina: 286,
      nome: "Investido", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Cultistas",
      elementos: [], vd: 40,
      descricao: "Cultista admitido e leal ao seu Elemento, comprometido com as Entidades.",
      percepcao: "2d20+5", iniciativa: "2d20+5",
      defesa: 17, fortitude: "1d20", reflexos: "2d20", vontade: "2d20+5",
      pv: 35, machucado: 17,
      atributos: [2, 1, 2, 2, 1],
      pericias: [["Enganação", "2d20+10"], ["Ocultismo", "2d20+10"]],
      deslocamento: [[9, 6]],
      habilidades: [
        hab("Conjurador", "Escolha dois rituais de 1º círculo e dois de 2º círculo, de até dois elementos. Conjura-os sem pagar PE, até um limite de 5 PE por conjuração, com a ação de cada ritual. DT dos rituais: 17."),
      ],
      acoes: [
        agredir([at("Faca", "corpo a corpo", 1, "1d20+5", "1d4+1 corte", { critico: "19" })]),
        agredir([at("Revólver", "curto", 1, "1d20", "2d6 balístico", { critico: "19/x3" })], { nome: "Agredir (distância)" }),
      ],
    },

    {
      id: "op.criatura.lider-de-culto", livro: OP, pagina: 286,
      nome: "Líder de Culto", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Cultistas",
      elementos: [], vd: 140,
      descricao: "Mestre cultista que conjura rituais poderosos sob o disfarce de bom cidadão — pode ser alguém próximo dos agentes.",
      percepcao: "3d20+10", iniciativa: "2d20+10",
      defesa: 27, fortitude: "2d20+10", reflexos: "2d20+5", vontade: "3d20+15",
      pv: 150, machucado: 75,
      atributos: [2, 1, 3, 3, 2],
      pericias: [["Enganação", "3d20+15"], ["Ocultismo", "3d20+15"]],
      deslocamento: [[9, 6]],
      habilidades: [
        hab("Conjurador", "Escolha dois rituais de 1º, dois de 2º e dois de 3º círculo, de até dois elementos. Conjura-os sem pagar PE, até um limite de 10 PE por conjuração, com a ação de cada ritual. DT dos rituais: 25."),
      ],
      acoes: [
        agredir([at("Faca", "corpo a corpo", 1, "2d20+10", "1d4+1 corte", { critico: "19" })]),
        agredir([at("Revólver", "curto", 1, "2d20+5", "2d6 balístico", { critico: "19/x3" })], { nome: "Agredir (distância)" }),
      ],
    },

    {
      id: "op.criatura.policial", livro: OP, pagina: 287,
      nome: "Policial", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Policiais",
      elementos: [], vd: 20,
      descricao: "O policial que patrulha as ruas; serve também para vigias, seguranças e qualquer pessoa com algum treino com armas.",
      percepcao: "1d20+5", iniciativa: "2d20+5",
      defesa: 19, fortitude: "2d20+5", reflexos: "2d20+5", vontade: "1d20",
      pv: 15, machucado: 7,
      atributos: [2, 2, 1, 1, 2],
      deslocamento: [[9, 6]],
      acoes: [
        agredir([at("Bastão", "corpo a corpo", 1, "2d20+5", "1d8+7 impacto")]),
        agredir([at("Pistola", "curto", 1, "2d20+5", "1d12+5 balístico", { critico: "18" })], { nome: "Agredir (distância)" }),
      ],
    },

    {
      id: "op.criatura.policial-de-elite", livro: OP, pagina: 287,
      nome: "Policial de Elite", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Policiais",
      elementos: [], vd: 60,
      descricao: "Tropa treinada e equipada para situações extremas, a primeira a chegar quando a investigação vira confronto armado.",
      percepcao: "1d20+10", iniciativa: "3d20+15",
      defesa: 27, fortitude: "3d20+10", reflexos: "3d20+10", vontade: "1d20+10",
      pv: 40, machucado: 20,
      resistencias: [[5, "balístico", "corte", "impacto", "perfuração"]],
      atributos: [3, 3, 1, 1, 3],
      deslocamento: [[6, 4]],
      habilidades: [
        hab("Fortificação", "O equipamento dá 50% de chance de ignorar o dano adicional de um acerto crítico ou ataque furtivo.",
          { rolagens: [soma("Fortificação (1–50 ignora)", "1d100")] }),
      ],
      acoes: [
        agredir([at("Bastão", "corpo a corpo", 2, "3d20+10", "1d8+13 impacto")]),
        agredir([at("Fuzil de Assalto", "médio", 1, "3d20+10", "2d8+13 balístico", { critico: "17/x3" })], { nome: "Agredir (distância)" }),
        acao("padrao", "Lança-Granadas", "Uma vez por cena, dispara uma granada em alcance médio: cada ser a até 6 m do impacto sofre 8d6 de impacto (Reflexos DT 19 reduz à metade).",
          { limite: [1, "cena"], rolagens: [dano("Granada", "8d6 impacto")], resistencia: "Reflexos DT 19 reduz à metade" }),
        acao("completa", "Empurrar e Atirar", "Empurra um personagem adjacente 3 m (Fortitude DT 19 evita) e atira com o fuzil a curta distância; se empurrou, recebe +1 dado no ataque e, se acertar, +2d8 de dano.",
          { rolagens: [teste("Fuzil com +1 dado", "4d20+10"), dano("Dano extra", "2d8")], resistencia: "Fortitude DT 19 evita o empurrão" }),
      ],
    },

    {
      id: "op.criatura.chefe-de-policia", livro: OP, pagina: 287,
      nome: "Chefe de Polícia", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Policiais",
      elementos: [], vd: 100,
      descricao: "Delegado ou coronel experiente que não se intimida fácil.",
      percepcao: "3d20+15", iniciativa: "2d20+10",
      defesa: 25, fortitude: "3d20+10", reflexos: "2d20+10", vontade: "3d20+15",
      pv: 105, machucado: 52,
      atributos: [2, 3, 2, 3, 3],
      deslocamento: [[9, 6]],
      acoes: [
        agredir([at("Bastão", "corpo a corpo", 2, "3d20+15", "1d8+8 impacto")]),
        agredir([at("Espingarda", "curto", 2, "2d20+17", "4d6+12 balístico", { critico: "x3" })], { nome: "Agredir (distância)" }),
        acao("reacao", "Teimoso", "Uma vez por cena, ignora um efeito que exija teste de resistência ou reduz à metade um dano que acabou de sofrer.",
          { limite: [1, "cena"] }),
      ],
    },

    {
      id: "op.criatura.cao-de-guarda", livro: OP, pagina: 288,
      nome: "Cão de Guarda", natureza: "animal", tipo: "Animal", tamanho: "Médio",
      elementos: [], vd: 10,
      descricao: "Cão treinado para guarda; serve também para cães policiais ou lobos.",
      percepcao: "1d20+10", iniciativa: "2d20+5", sentidos: ["faro", "visão na penumbra"],
      defesa: 14, fortitude: "2d20+5", reflexos: "2d20+5", vontade: "1d20",
      pv: 12, machucado: 6,
      atributos: [2, 2, 0, 1, 2],
      pericias: [["Sobrevivência", "1d20+10"]],
      deslocamento: [[12, 8]],
      acoes: [
        agredir([at("Mordida", "corpo a corpo", 1, "2d20+5", "1d6+2 corte")]),
        acao("livre", "Derrubar", "Ao acertar a mordida, pode fazer a manobra derrubar (bônus 2d20+5).",
          { rolagens: [teste("Derrubar", "2d20+5")] }),
      ],
    },

    {
      id: "op.criatura.enxame-de-abelhas", livro: OP, pagina: 288,
      nome: "Enxame de Abelhas", natureza: "animal", tipo: "Animal (enxame)", tamanho: "Médio",
      elementos: [], vd: 10,
      descricao: "Abelhas defendendo a colmeia, em zonas rurais, parques ou casas abandonadas.",
      percepcao: "1d20+5", iniciativa: "1d20+5", sentidos: ["visão na penumbra"],
      defesa: 15, fortitude: "-2d20", reflexos: "1d20+5", vontade: "1d20",
      pv: 10, machucado: 5,
      atributos: [1, 0, 0, 1, 0],
      deslocamento: [[3, 2], [9, 6, "voo"]],
      habilidades: [
        hab("Enxame", "Pode entrar no espaço de um ser. No fim do turno, causa 2d6 de perfuração automaticamente em cada ser no seu espaço. Imune a manobras de combate e a efeitos de alvo único que não causam dano; sofre metade do dano de ataques com armas e 50% a mais de efeitos de área.",
          { rolagens: [dano("Enxame", "2d6 perfuração")] }),
        hab("Zumbido Nauseante", "Quem sofre dano do enxame fica enjoado por 1 rodada (Fortitude DT 15 evita).",
          { resistencia: "Fortitude DT 15 evita" }),
      ],
    },

    {
      id: "op.criatura.enxame-de-ratos", livro: OP, pagina: 288,
      nome: "Enxame de Ratos", natureza: "animal", tipo: "Animal (enxame)", tamanho: "Médio",
      elementos: [], vd: 10,
      descricao: "Ratos que se juntam em enxames perigosos movidos por fome intensa ou energias paranormais.",
      percepcao: "1d20+5", iniciativa: "2d20+5", sentidos: ["faro", "visão na penumbra"],
      defesa: 13, fortitude: "1d20+5", reflexos: "1d20+5", vontade: "1d20",
      pv: 15, machucado: 7,
      atributos: [1, 0, 0, 1, 0],
      deslocamento: [[9, 6], [6, 4, "escalar/nadar"]],
      habilidades: [
        hab("Enxame", "Pode entrar no espaço de um ser. No fim do turno, causa 2d6 de perfuração automaticamente em cada ser no seu espaço. Imune a manobras de combate e a efeitos de alvo único que não causam dano; sofre metade do dano de ataques com armas e 50% a mais de efeitos de área.",
          { rolagens: [dano("Enxame", "2d6 perfuração")] }),
        hab("Doença", "Quem sofre dano do enxame contrai febre hemorrágica (Fortitude DT 15 evita).",
          { resistencia: "Fortitude DT 15 evita" }),
      ],
    },

    {
      id: "op.criatura.jacare", livro: OP, pagina: 288,
      nome: "Jacaré", natureza: "animal", tipo: "Animal", tamanho: "Grande",
      elementos: [], vd: 40,
      descricao: "Um espécime grande, capaz de aparecer até em áreas urbanas.",
      percepcao: "1d20+5", iniciativa: "1d20+5", sentidos: ["visão na penumbra"],
      defesa: 16, fortitude: "2d20+5", reflexos: "1d20+5", vontade: "1d20",
      pv: 40, machucado: 20,
      atributos: [1, 3, 0, 1, 2],
      pericias: [["Furtividade", "1d20+8"]],
      deslocamento: [[6, 4], [9, 6, "nadar"]],
      habilidades: [
        hab("Giro da Morte", "Agarrando um ser dentro da água, se fizer agarrar de novo para causar dano, causa +2d8.",
          { rolagens: [dano("Giro", "2d8")] }),
      ],
      acoes: [
        agredir([
          at("Mordida", "corpo a corpo", 1, "3d20+5", "1d8+8 corte"),
          at("Cauda", "corpo a corpo", 1, "3d20+5", "1d12 impacto"),
        ]),
        acao("livre", "Agarrão", "Ao acertar a mordida num ser Médio ou menor, pode agarrá-lo (teste 3d20+7).",
          { rolagens: [teste("Agarrar", "3d20+7")] }),
      ],
    },

    {
      id: "op.criatura.javaporco", livro: OP, pagina: 289,
      nome: "Javaporco", natureza: "animal", tipo: "Animal", tamanho: "Médio",
      elementos: [], vd: 20,
      descricao: "Cruza de javali e porco doméstico, praga voraz em regiões rurais.",
      percepcao: "1d20+5", iniciativa: "1d20+5", sentidos: ["faro", "visão na penumbra"],
      defesa: 14, fortitude: "3d20+5", reflexos: "1d20+5", vontade: "1d20",
      pv: 35, machucado: 17,
      atributos: [1, 2, 0, 1, 3],
      deslocamento: [[12, 8]],
      habilidades: [
        hab("Ferocidade", "Depois de sofrer dano, recebe +1 dado em testes de ataque e um dado de dano adicional em todas as rolagens de dano até o fim da cena.",
          { marcador: "Ativa" }),
      ],
      acoes: [
        agredir([at("Mordida", "corpo a corpo", 1, "2d20+5", "1d8+4 corte")]),
        acao("reacao", "Mordida Final", "Ao cair a 0 PV, morde um oponente aleatório ao alcance antes de morrer."),
      ],
    },

    {
      id: "op.criatura.onca-pintada", livro: OP, pagina: 289,
      nome: "Onça-Pintada", natureza: "animal", tipo: "Animal", tamanho: "Grande",
      elementos: [], vd: 40,
      descricao: "O maior felino das Américas, predador das selvas brasileiras.",
      percepcao: "1d20+10", iniciativa: "3d20+10", sentidos: ["faro", "visão na penumbra"],
      defesa: 16, fortitude: "2d20+5", reflexos: "3d20+5", vontade: "1d20+5",
      pv: 55, machucado: 27,
      atributos: [3, 3, 0, 1, 2],
      pericias: [["Furtividade", "3d20+13"]],
      deslocamento: [[12, 8], [6, 4, "escalar/nadar"]],
      acoes: [
        agredir([
          at("Mordida", "corpo a corpo", 1, "3d20+10", "1d8+5 corte"),
          at("Garras", "corpo a corpo", 2, "3d20+10", "1d6+5 corte", { critico: "19" }),
        ]),
        acao("livre", "Agarrão", "Ao acertar a mordida num ser Médio ou menor, pode agarrá-lo (teste 3d20+7).",
          { rolagens: [teste("Agarrar", "3d20+7")] }),
        acao("completa", "Bote", "Faz uma investida e ataca com a mordida e as duas garras, todos com o +1 dado da investida e contra o mesmo alvo.",
          { rolagens: [teste("Mordida no bote", "4d20+10"), teste("Garra no bote", "4d20+10")] }),
      ],
    },

    {
      id: "op.criatura.sucuri", livro: OP, pagina: 289,
      nome: "Sucuri", natureza: "animal", tipo: "Animal", tamanho: "Grande",
      elementos: [], vd: 40,
      descricao: "Grande cobra constritora amazônica, às vezes mantida por colecionadores ou cultistas.",
      percepcao: "1d20+5", iniciativa: "2d20+5", sentidos: ["faro", "visão na penumbra"],
      defesa: 16, fortitude: "3d20+5", reflexos: "2d20+5", vontade: "1d20",
      pv: 68, machucado: 34,
      atributos: [2, 3, 0, 1, 3],
      pericias: [["Furtividade", "2d20+8"]],
      deslocamento: [[6, 4], [9, 6, "escalar/nadar"]],
      acoes: [
        agredir([at("Mordida", "corpo a corpo", 1, "3d20+10", "1d6+8 corte")]),
        acao("livre", "Agarrão", "Ao acertar a mordida num ser Médio ou menor, pode agarrá-lo (teste 4d20+12).",
          { rolagens: [teste("Agarrar", "4d20+12")] }),
        acao("livre", "Constrição", "No início de cada turno, causa 2d6+8 de impacto em quem estiver agarrando.",
          { rolagens: [dano("Constrição", "2d6+8 impacto")] }),
      ],
    },
    /* ---------------- SAH · Ameaças paranormais (p. 125–157) ---------------- */

    {
      id: "sah.criatura.sepultado", livro: SAH, pagina: 127,
      nome: "Sepultado", natureza: "paranormal", tipo: "Criatura", tamanho: "Médio",
      elementos: [MO], vd: 20,
      descricao: "Um caixão animado por corpos selados juntos numa maldição: bate por dentro como alguém enterrado vivo para atrair vítimas e as traga para o seu interior.",
      presenca: { dt: 15, dano: "2d4", imune: "NEX 25%+" },
      percepcao: "1d20", iniciativa: "1d20", sentidos: ["percepção às cegas"],
      defesa: 16, fortitude: "3d20+5", reflexos: "1d20", vontade: "1d20",
      pv: 50, machucado: 25,
      resistencias: [[5, "balístico", "corte", "impacto", "perfuração"], [10, "Morte"]],
      vulnerabilidades: ["Energia"],
      atributos: [1, 3, 0, 1, 3],
      pericias: [["Furtividade", "1d20+10"]],
      deslocamento: [[9, 6], [9, 6, "escalada"]],
      habilidades: [
        hab("Membros Longos", "Apesar de Médio, tem alcance natural de 3 m."),
        hab("Parte do Cenário", "Em forma de caixão, em cemitérios, mausoléus e lugares parecidos, recebe +10 em Furtividade. Quem é treinado em Ocultismo e procura ameaças ativamente pode, como reação, fazer um teste (DT 20) para sentir que há uma criatura paranormal oculta por perto.",
          { rolagens: [teste("Furtividade (como caixão)", "1d20+20")] }),
      ],
      acoes: [
        agredir([at("Dedos Ósseos", "corpo a corpo", 3, "3d20+5", "1d6+5 corte")]),
        acao("livre", "Agarrão", "Ao acertar os dedos ósseos, pode tentar agarrar o alvo (teste 3d20+5).",
          { rolagens: [teste("Agarrar", "3d20+5")] }),
        acao("padrao", "Bater Desesperado", "Batidas que parecem de alguém preso lá dentro, ouvidas a até 90 m. Pessoas e animais a até 9 m ficam atordoados por uma rodada (Vontade DT 14 reduz para abalado por uma rodada); quem passa fica imune a esta habilidade até o fim da cena.",
          { resistencia: "Vontade DT 14 reduz para abalado" }),
        acao("completa", "Tragar", "Traga para dentro do caixão um ser Médio ou menor que esteja agarrando: ele fica agarrado e imóvel e, ao ser tragado e no início de cada turno lá dentro, sofre 2d4 de dano mental (Vontade DT 14 reduz à metade). Só se liberta destruindo o Sepultado, que só traga um ser por vez.",
          { rolagens: [dano("Enterrado vivo", "2d4 mental")], resistencia: "Vontade DT 14 reduz à metade" }),
      ],
    },

    {
      id: "sah.criatura.mescla", livro: SAH, pagina: 129,
      nome: "Mescla", natureza: "paranormal", tipo: "Criatura", tamanho: "Grande",
      elementos: [SA], vd: 60,
      descricao: "Pessoa que se entregou a uma convivência doentia com insetos e parasitas até virar uma fusão de carapaça e carne, cheia de larvas e com um fedor insuportável.",
      presenca: { dt: 20, dano: "3d6", imune: "NEX 35%+" },
      percepcao: "1d20+5", iniciativa: "3d20+10", sentidos: ["faro", "percepção às cegas (alcance longo)"],
      defesa: 21, fortitude: "2d20+5", reflexos: "3d20+10", vontade: "1d20+5",
      pv: 100, machucado: 50,
      imunidades: ["químico"],
      resistencias: [[10, "balístico", "corte", "perfuração"], [20, "Sangue"]],
      vulnerabilidades: ["Morte", "fogo", "frio"],
      atributos: [3, 3, 1, 1, 2],
      pericias: [["Acrobacia", "3d20+10"], ["Atletismo", "3d20+10"], ["Furtividade", "3d20+8"]],
      deslocamento: [[12, 8], [12, 8, "escalada"], [9, 6, "voo"]],
      habilidades: [
        hab("Fluidos Repugnantes", "Quem causa dano a ela corpo a corpo ou em alcance curto, ou sofre dano de Sangue dela, fica enjoado por uma rodada (Fortitude DT 20 evita).",
          { resistencia: "Fortitude DT 20 evita" }),
        hab("Percepção Multifacetada", "Não pode ser flanqueada nem surpreendida."),
      ],
      acoes: [
        agredir([at("Garras", "corpo a corpo", 2, "3d20+10", "2d6+5 corte")]),
        agredir([at("Cuspe Ácido", "curto", 1, "3d20+10", "3d12 Sangue")], { nome: "Agredir (distância)" }),
        acao("livre", "Vomitar Ácido", "Se acertar as duas garras na mesma ação agredir, a vítima sofre mais 1d12 de dano de Sangue.",
          { rolagens: [dano("Vômito", "1d12 Sangue")] }),
        acao("reacao", "Agarrão", "Se acertar as duas garras no mesmo ser na mesma ação agredir, pode tentar agarrá-lo (teste 3d20+12).",
          { rolagens: [teste("Agarrar", "3d20+12")] }),
        acao("completa", "Camuflagem Sobrenatural", "Se nenhuma pessoa a estiver vendo, fica imóvel e muda de cor: camuflagem total e +10 em Furtividade.",
          { marcador: "Camuflada", rolagens: [teste("Furtividade (camuflada)", "3d20+18")] }),
        acao("completa", "Incubar Ovos", "Contra um ser que esteja agarrando, ataca com o ferrão da língua (teste 3d20+10). Se acertar, incuba 1d4 ovos (Fortitude DT 5 + 5 por ovo evita). O alvo contrai uma versão de Sangue Quente (OPRPG, p. 291) com um Estágio IV, no qual uma nova Mescla nasce do corpo e mata a vítima.",
          { rolagens: [teste("Ferrão", "3d20+10"), soma("Ovos incubados", "1d4")], resistencia: "Fortitude DT 5 + 5 por ovo evita" }),
        acao("completa", "Investida Insectoide", "Estando acima de um ser em alcance médio, salta e aterrissa ao lado dele; conta como investida e ela faz os dois ataques de garra, ambos com o bônus da investida."),
      ],
    },

    {
      id: "sah.criatura.espectro-inesquecido", livro: SAH, pagina: 133,
      nome: "Espectro Inesquecido (exemplo)", natureza: "paranormal", tipo: "Criatura", tamanho: "Médio",
      elementos: [EN, CO, MO, ME], vd: 220,
      descricao: "Eco translúcido de um Marcado que morreu quando poderia ter sobrevivido. Esta é a ficha de exemplo do livro, gerada a partir de um Marcado de NEX 55%.",
      presenca: { dt: 35, dano: "6d8", imune: "NEX 75%+" },
      percepcao: "3d20+15", iniciativa: "3d20+5", sentidos: ["percepção às cegas", "visão no escuro"],
      defesa: 27, fortitude: "3d20+5", reflexos: "3d20+15", vontade: "4d20+15",
      pv: 340, machucado: 170, pe: 66,
      resistencias: [[15, "balístico", "corte", "impacto", "perfuração", "Conhecimento", "Morte"], [25, "Energia"]],
      vulnerabilidades: ["Conhecimento"],
      atributos: [2, 1, 3, 3, 2],
      pericias: [["Atletismo", "1d20+5"], ["Ciências", "3d20+10"], ["Furtividade", "2d20+10"], ["Intimidação", "3d20+5"], ["Intuição", "3d20+10"],
        ["Investigação", "3d20+10"], ["Medicina", "3d20+10"], ["Percepção", "3d20+10"]],
      deslocamento: [[9, 6]],
      notas: [
        "Cada espectro inesquecido nasce da ficha de um Marcado específico (regras do modelo nas p. 131–132, com a Tabela 3.1). O R.A.M.A. traz só a ficha de exemplo publicada; montar um espectro a partir de outro Marcado é trabalho do mestre.",
        "Aterrorizar está impresso com 2d8 de dano mental e DT 15, mas a Tabela 3.1 indica DT 35 e 6d8 para VD 220. Mantido como publicado na ficha.",
      ],
      habilidades: [
        hab("Balística Avançada", "Conserva a proficiência com armas táticas de fogo e +2 nas rolagens de dano com elas (já incluído no ataque à distância)."),
      ],
      acoes: [
        agredir([at("Lâmina Espectral", "corpo a corpo", 1, "2d20+10", "1d4+31 Energia", { critico: "19" })]),
        agredir([at("Pistola Sinalizadora Espectral", "curto", 1, "3d20+15", "2d6+32 Energia")], { nome: "Agredir (distância)" }),
        acao("livre", "Conhecimento Aplicado", "Num teste de perícia (exceto Luta e Pontaria), gasta 2 PE para trocar o atributo-base por Intelecto.", { custo: "2 PE" }),
        acao("livre", "Eclético", "Num teste de perícia, gasta 2 PE para ter os benefícios de treinado nela, ou 4 PE para os de veterano.", { custo: "2 ou 4 PE" }),
        acao("livre", "Investigação Científica", "Uma vez por cena de investigação, procura pistas com Ciências no lugar da perícia indicada.", { limite: [1, "cena"] }),
        acao("livre", "Na Trilha Certa", "Após passar num teste para procurar pistas, gasta 1 PE para +1d20 no próximo teste; custo e bônus se acumulam a cada sucesso seguido (2 PE para +2d20 e assim por diante).", { custo: "1 PE (cumulativo)" }),
        acao("livre", "Pensamento Ágil", "Uma vez por rodada, numa cena de investigação, gasta 2 PE para uma ação extra de procurar pistas.", { limite: [1, "rodada"], custo: "2 PE" }),
        acao("livre", "Perito", "Perito em Ciências e Medicina: num teste dessas perícias, gasta 2 PE para +1d6, 3 PE para +1d8 ou 4 PE para +1d10.",
          { custo: "2, 3 ou 4 PE", rolagens: [soma("Perito (2 PE)", "1d6"), soma("Perito (3 PE)", "1d8"), soma("Perito (4 PE)", "1d10")] }),
        acao("padrao", "Equipe de Trauma", "Gasta 2 PE para remover uma condição negativa (exceto morrendo) de um aliado adjacente.", { custo: "2 PE" }),
        acao("padrao", "Paramédico", "Gasta 2 PE para curar 2d10 PV, ou 3 PE para curar 3d10 PV, de si ou de um aliado adjacente.",
          { custo: "2 ou 3 PE", rolagens: [soma("Cura (2 PE)", "2d10"), soma("Cura (3 PE)", "3d10")] }),
        acao("completa", "Aterrorizar", "Pessoas e animais em alcance curto sofrem 2d8 de dano mental (Vontade DT 15 reduz à metade).",
          { rolagens: [dano("Aterrorizar", "2d8 mental")], resistencia: "Vontade DT 15 reduz à metade" }),
      ],
      enigma: {
        texto: "Cada espectro tem um enigma próprio, ligado à personalidade, às escolhas e às ações do Marcado em vida, distorcidas pelas entidades; o livro não fixa um para esta ficha.",
      },
    },

    {
      id: "sah.criatura.derretido", livro: SAH, pagina: 135,
      nome: "Derretido", natureza: "paranormal", tipo: "Criatura", tamanho: "Enorme",
      elementos: [SA, EN], vd: 80,
      descricao: "Massa gelatinosa de carne, vísceras e ácido que absorve tudo pelo caminho, passa por frestas e canos e às vezes imita a silhueta do que já engoliu.",
      presenca: { dt: 20, dano: "4d6", imune: "NEX 40%+" },
      percepcao: "1d20+5", iniciativa: "1d20+5", sentidos: ["percepção às cegas"],
      defesa: 23, fortitude: "4d20+10", reflexos: "1d20+5", vontade: "1d20+5",
      pv: 140, machucado: 70,
      imunidades: ["balístico", "corte", "impacto", "perfuração"],
      resistencias: [[20, "Sangue"]],
      vulnerabilidades: ["Morte", "fogo", "químico"],
      atributos: [1, 4, 0, 1, 4],
      pericias: [["Enganação", "1d20"], ["Furtividade", "1d20"]],
      deslocamento: [[9, 6], [9, 6, "escalada"]],
      habilidades: [
        hab("Amorfo", "Não é contido por obstáculos físicos e passa por qualquer fresta por onde passaria água (debaixo de portas, encanamentos, janelas). Enquanto se espreme por um obstáculo, fica lento."),
        hab("Liberdade de Espaço", "Pode ocupar quadrados de outras criaturas, e elas podem atravessar os dele, que contam como terreno difícil."),
        hab("Matéria Nociva", "Quem entra na área dele ou começa o turno nela sofre 6d6 de dano de Sangue e fica lento e enjoado por uma rodada (Fortitude DT 20 reduz o dano à metade e evita o lento). Cada criatura só é afetada uma vez por rodada. Pode também danificar objetos para abrir caminho.",
          { rolagens: [dano("Matéria nociva", "6d6 Sangue")], resistencia: "Fortitude DT 20 reduz à metade e evita lento" }),
      ],
      acoes: [
        acao("padrao", "Arrastar Repulsivo", "Até o início do próximo turno, ao se mover arrasta seres e objetos da sua área que escolher (Atletismo DT 20 evita); os arrastados sofrem 4d6 de dano de Sangue e ficam caídos.",
          { rolagens: [dano("Arrastado", "4d6 Sangue")], resistencia: "Atletismo DT 20 evita" }),
        acao("padrao", "Rastro Corrosivo", "Até o início do próximo turno, deixa por onde passa um rastro de ácido (terreno difícil). Quem entra nele ou começa o turno nele sofre 1d6 de dano de ácido, uma vez por rodada.",
          { rolagens: [dano("Rastro", "1d6 ácido")] }),
        acao("padrao", "Simular Corpo", "Molda a silhueta de uma pessoa, animal ou objeto. Em penumbra ou escuridão, recebe +10 em Furtividade para se esconder e em Enganação para disfarce.",
          { marcador: "Simulando", rolagens: [teste("Furtividade/Enganação (simulando)", "1d20+10")] }),
        acao("completa", "Consumir", "Dissolve um ser inconsciente com 0 PV na sua área (mesmo que não esteja morrendo) e recupera 20 PV."),
        acao("completa", "Deslizar Nojento", "Se não estiver se espremendo, percorre o triplo do deslocamento desviando de obstáculos."),
      ],
    },

    {
      id: "sah.criatura.o-uivar", livro: SAH, pagina: 137,
      nome: "O Uivar", natureza: "paranormal", tipo: "Criatura", tamanho: "Médio",
      elementos: [EN], vd: 100,
      descricao: "Presença invisível que traz nevasca a qualquer lugar e rouba o calor das vítimas, deixando estátuas de gelo; há quem a trate como anomalia climática, não como criatura.",
      presenca: { dt: 20, dano: "4d6", imune: "NEX 45%+" },
      percepcao: "3d20+10", iniciativa: "3d20+10", sentidos: ["percepção às cegas"],
      defesa: 20, fortitude: "1d20+5", reflexos: "3d20+10", vontade: "3d20+10",
      pv: 100, machucado: 50,
      imunidades: ["dano"],
      atributos: [3, "—", 3, 3, 1],
      deslocamento: [[12, 8, "voo"]],
      habilidades: [
        hab("Alterações Climáticas", "Num raio de 90 m ao redor, há sempre frio extremo, neblina, neve e vento forte (OPRPG, p. 290)."),
        hab("Vibrações Térmicas", "É invisível (SAH, p. 125) e incorpóreo, e não faz mais barulho que o assobio do vento. Quem consegue vê-lo enxerga uma silhueta Média, vazia e curvada."),
      ],
      acoes: [
        acao("movimento", "Granizo Perfurante", "Passa a gerar granizo (OPRPG, p. 290). Se usar Congelar na mesma rodada, quem estiver sem cobertura na área sofre também 2d8 de dano de perfuração (Reflexos DT 20 reduz à metade); coberturas frágeis, como tendas, são destruídas.",
          { rolagens: [dano("Granizo", "2d8 perfuração")], resistencia: "Reflexos DT 20 reduz à metade" }),
        acao("padrao", "Congelar", "Ondas de frio num raio de 90 m: cada ser sofre 2d8 de dano de frio (Fortitude DT 20 reduz à metade). O céu se fecha (dia vira penumbra, noite vira escuridão), objetos ganham gelo (testes de manipular itens podem sofrer −1d20) e surgem granizo, chuva e vendaval, até o fim da cena ou da missão.",
          { rolagens: [dano("Frio", "2d8 frio")], resistencia: "Fortitude DT 20 reduz à metade" }),
        acao("padrao", "Beijo Gélido", "Suga o calor de um ser em alcance corpo a corpo: 6d6 de dano de Energia e lento (Fortitude DT 20 reduz à metade). Quem chega a 0 PV por isso, ou já estava com 0 PV, vira estátua de gelo: petrificado e sem recuperar PV, mas sem estar morrendo, até a camada de gelo (20 PV, RD 20/fogo) ser destruída; dano que não seja de fogo no gelo também fere a vítima e a deixa morrendo. Criar uma estátua cura 20 PV do Uivar; destruir uma tira 10 PV dele, e quem matar a pessoa congelada sofre 6d6 de dano mental (Vontade DT 20 reduz à metade).",
          { rolagens: [dano("Beijo gélido", "6d6 Energia"), dano("Matar quem está congelado (mental)", "6d6 mental")], resistencia: "Fortitude DT 20 reduz à metade" }),
      ],
    },

    {
      id: "sah.criatura.melancolia", livro: SAH, pagina: 140,
      nome: "Melancolia", natureza: "paranormal", tipo: "Criatura", tamanho: "Minúsculo",
      elementos: [CO, SA, MO, ME], vd: 140,
      descricao: "Parasita invisível que se agarra às costas da vítima e consome seus sentimentos, deixando marcas como tatuagens e um rosto paralisado numa expressão de tristeza.",
      presenca: { dt: 25, dano: "4d8", imune: "NEX 50%+" },
      percepcao: "3d20+5", iniciativa: "4d20+5", sentidos: ["visão no escuro"],
      defesa: 29, fortitude: "1d20+5", reflexos: "4d20+5", vontade: "3d20+5",
      pv: 200, machucado: 100,
      imunidades: ["dano"],
      atributos: [4, "—", 4, 3, 1],
      pericias: [["Furtividade", "4d20+5"]],
      deslocamento: [[9, 6]],
      estados: [{ id: "estagio", nome: "Estágio da vítima", maximo: 4 }],
      habilidades: [
        hab("Parasita Invisível", "É invisível (SAH, p. 125) e incorpórea e sobe numa pessoa sem ser sentida. A vítima só evita a infecção passando em Vontade (DT do estágio atual, 25 no início); se passar, o parasita procura outro ser e ela nem percebe.",
          { resistencia: "Vontade DT 25 evita" }),
        hab("Parasitose Melancólica", "Segue as regras de doença (OPRPG, p. 291), por contato. Estágio I (Medo): abalado, mesmo para quem é imune a medo; parasita Minúsculo, Vontade DT 25. Estágio II (Sangue): alquebrado e frustrado, mesmo para imunes a efeitos mentais; parasita Pequeno, DT 30. Estágio III (Morte): esmorecido, mesmo para imunes a efeitos mentais; parasita Médio, DT 35. Estágio IV (Conhecimento): a vítima só age para tirar a própria vida; parasita Grande, DT 40. Ao vencer a infecção, o parasita parte, mas a vítima leva um dia para descer cada estágio."),
        hab("Parasitas Poderosos", "Um parasita que já consumiu outros seres é maior: a DT do Estágio I passa a ser a do tamanho atual dele, até Grande (DT 40)."),
      ],
      acoes: [],
      enigma: {
        texto: "A vítima precisa perceber o parasita: por narrativa ou por falhar por 5 ou menos no teste de Vontade. Quem convive com ela também pode notar com Intuição, Medicina, Ocultismo ou Profissão (psicólogo) contra a DT atual. Só efeitos paranormais ajudam: pequenos rituais de apoio (Ocultismo contra a DT atual).",
        efeito: "Cada ajuda bem-sucedida reduz em 5 a DT contra o parasita, na frequência que o mestre permitir. Com a DT em 0, perde invisibilidade, incorporeidade e imunidade a dano, fica vulnerável a todo dano não paranormal e tenta fugir ou infectar outro ser.",
        altera: { imunidades: [], vulnerabilidades: ["todo dano não paranormal"] },
      },
    },

    {
      id: "sah.criatura.quibungo", livro: SAH, pagina: 143,
      nome: "Quibungo", natureza: "paranormal", tipo: "Criatura", tamanho: "Grande",
      elementos: [SA], vd: 160,
      descricao: "Fera de lendas africanas e nordestinas distorcida pelo Sangue: mais de 3 m, quatro braços e uma bocarra nas costas onde as vítimas são digeridas vivas por dias.",
      presenca: { dt: 25, dano: "4d8", imune: "NEX 55%+" },
      percepcao: "3d20+10", iniciativa: "4d20+10", sentidos: ["faro", "visão no escuro"],
      defesa: 34, fortitude: "4d20+10", reflexos: "4d20+10", vontade: "3d20+5",
      pv: 320, machucado: 160,
      resistencias: [[20, "balístico", "impacto", "perfuração", "Sangue"]],
      vulnerabilidades: ["Morte"],
      atributos: [4, 4, 1, 3, 4],
      pericias: [["Atletismo", "4d20+10"], ["Furtividade", "4d20+8"], ["Sobrevivência", "1d20+20"]],
      deslocamento: [[15, 10], [15, 10, "escalada"], [15, 10, "natação"]],
      habilidades: [
        hab("Besta da Mata", "Em mata fechada, +10 em Furtividade e camuflagem total contra seres a mais de 9 m.",
          { rolagens: [teste("Furtividade (mata fechada)", "4d20+18")] }),
        hab("Regeneração Acelerada", "Cura acelerada 10/Morte."),
      ],
      acoes: [
        agredir([
          at("Garras", "corpo a corpo", 4, "4d20+20", "2d6+10 corte"),
          at("Mordida", "corpo a corpo", 1, "4d20+20", "3d12+10 perfuração"),
        ]),
        acao("reacao", "Agarrão", "Ao acertar uma garra, pode tentar agarrar o alvo (teste 4d20+22).",
          { rolagens: [teste("Agarrar", "4d20+22")] }),
        acao("livre", "Dilacerar", "Uma vez por rodada, se acertar duas garras no mesmo alvo, causa mais 1d12+10 de dano de perfuração.",
          { limite: [1, "rodada"], rolagens: [dano("Dilacerar", "1d12+10 perfuração")] }),
        acao("reacao", "Instintos Bestiais", "Uma vez por rodada, esquiva-se por completo de um ataque à distância ou de um efeito em área, sem sofrer o dano.",
          { limite: [1, "rodada"] }),
        acao("completa", "Bocarra Torturadora", "Põe na bocarra das costas um ser que esteja agarrando: ele continua agarrado, tem cobertura contra o que vem de fora (e vice-versa) e sofre 1d12+10 de dano de Sangue no início de cada turno do Quibungo. Escapa vencendo um teste de agarrar ou de Acrobacia, ou causando 25 de dano; sai caído à frente dele. Só um ser por vez. Com 0 PV lá dentro, a vítima não fica inconsciente nem morrendo, só grita, até o Quibungo gastar uma ação completa para engoli-la e matá-la (e recuperar 25 PV). Outros podem libertá-la vencendo um teste de agarrar; quem falha sofre 1d12+10 de perfuração. No início de cada turno em que ele mantém alguém com 0 PV na bocarra, quem presencia sofre 4d8 de dano mental (Vontade DT 25 reduz à metade).",
          { rolagens: [dano("Digestão", "1d12+10 Sangue"), dano("Dentes (resgate falho)", "1d12+10 perfuração"), dano("Presenciar (mental)", "4d8 mental")], resistencia: "Vontade DT 25 reduz à metade (dano mental)" }),
        acao("completa", "Investida Brutal", "Percorre o dobro do deslocamento, sem precisar ser em linha reta, até o alvo; conta como investida (+1d20 nos ataques e −5 na Defesa até o próximo turno) e termina com dois ataques de garras."),
      ],
    },

    {
      id: "sah.criatura.profundo", livro: SAH, pagina: 147,
      nome: "Profundo", natureza: "paranormal", tipo: "Criatura", tamanho: "Enorme",
      elementos: [EN, SA], vd: 200,
      descricao: "Predador das profundezas parecido com uma lula alongada de pele translúcida, tentáculos de até 8 m e um brilho vermelho que é a última coisa que os mergulhadores veem.",
      presenca: { dt: 30, dano: "6d6", imune: "NEX 65%+" },
      percepcao: "2d20+10", iniciativa: "4d20+15", sentidos: ["percepção às cegas", "visão no escuro"],
      defesa: 34, fortitude: "2d20+10", reflexos: "4d20+15", vontade: "2d20+10",
      pv: 380, machucado: 190,
      resistencias: [[20, "balístico", "corte", "impacto", "perfuração", "Energia", "Sangue"]],
      vulnerabilidades: ["Conhecimento"],
      atributos: [4, 4, 2, 2, 2],
      pericias: [["Furtividade", "4d20+10"]],
      deslocamento: [[6, 4], [15, 10, "natação"]],
      habilidades: [
        hab("Camuflagem Submersa", "Submerso, tem camuflagem contra seres a 1,5 m, camuflagem total contra os que estão mais longe e +10 em Furtividade.",
          { rolagens: [teste("Furtividade (submerso)", "4d20+20")] }),
        hab("Regeneração Acelerada", "Cura acelerada 20/Morte e fogo."),
      ],
      acoes: [
        agredir([
          at("Mordida", "corpo a corpo", 1, "4d20+25", "4d10+20 perfuração"),
          at("Tentáculos", "corpo a corpo", 6, "4d20+25", "2d10+10 impacto", { nota: "no máximo dois ataques de tentáculo contra o mesmo ser por ação agredir" }),
        ]),
        acao("reacao", "Agarrão", "Ao acertar um tentáculo, pode agarrar o ser (teste 4d20+30). Mantém só um ser agarrado assim, sem perder ataques de tentáculo.",
          { rolagens: [teste("Agarrar", "4d20+30")] }),
        acao("livre", "Mastigar", "Uma vez por rodada, se acertar dois tentáculos no mesmo ser na rodada, faz um ataque extra de mordida.",
          { limite: [1, "rodada"] }),
        acao("completa", "Engolir", "Começando o turno agarrando alguém com os tentáculos, faz um teste de agarrar (4d20+30); se vencer, engole o ser, senão ele se solta. O engolido fica agarrado e cego, tem cobertura total contra o que vem de fora (e vice-versa) e sofre 2d10 de Sangue e 2d10 de perfuração no início de cada turno do Profundo. Escapa vencendo agarrar ou Acrobacia, ou causando 30 de dano, e sai caído à frente dele. Um ser por vez. De fora, ajudar exige uma ação de movimento e Percepção DT 25 para achar o ponto certo.",
          { rolagens: [teste("Agarrar", "4d20+30"), dano("Digestão", ["2d10 Sangue", "2d10 perfuração"])] }),
        acao("completa", "Onda Energética", "Onda invisível que enlouquece eletrônicos num raio de 90 m (desligam, piscam, entram em curto, explodem). Quem porta o aparelho pode evitar com Vontade DT 25.",
          { resistencia: "Vontade DT 25 evita (por aparelho portado)" }),
      ],
    },

    {
      id: "sah.criatura.memento-mori", livro: SAH, pagina: 149,
      nome: "Memento Mori", natureza: "paranormal", tipo: "Criatura", tamanho: "Médio",
      elementos: [MO, CO, ME], vd: 260,
      descricao: "Figura encapuzada com crânio de pássaro e uma ampulheta de cinzas: surge já com um alvo marcado e caminha devagar e sem parar até ele.",
      presenca: { dt: 35, dano: "8d6", imune: "NEX 80%+" },
      percepcao: "3d20+20", iniciativa: "1d20+15", sentidos: ["visão no escuro"],
      defesa: 44, fortitude: "3d20+20", reflexos: "1d20+15", vontade: "3d20+20",
      pv: 650, machucado: 325,
      resistencias: [[20, "balístico", "corte", "impacto", "perfuração", "Morte"]],
      vulnerabilidades: ["Energia"],
      atributos: [1, 1, 3, 3, 3],
      pericias: [["Furtividade", "1d20+30"]],
      deslocamento: [[9, 6]],
      notas: ["O ataque de garras está impresso com 5d20, embora AGI e FOR sejam 1; mantido como publicado."],
      habilidades: [
        hab("A Ampulheta da Morte", "Surge com um alvo cujo tempo de vida escorre na ampulheta. Em mãos de uma pessoa, ela é um item amaldiçoado de Morte indestrutível (uma mão, 1 espaço); com uma ação padrão, 2 PE e 2 de Sanidade, o portador descobre o nome do ser ligado à areia e uma estimativa, nunca exata, do tempo que lhe resta."),
        hab("Ininterrupto", "Não corre e só usa uma ação por rodada para se deslocar, mas nada (paranormal ou não) reduz ou impede seu deslocamento."),
        hab("Inevitável Fim", "Com 0 PV não morre: some em cinzas e sombras até o fim da cena e pode voltar depois a perseguir o alvo."),
      ],
      acoes: [
        agredir([at("Garras", "corpo a corpo", 2, "5d20+30", "4d10+30 corte")]),
        acao("movimento", "Visagem", "Até três vezes por cena, teletransporta-se para um espaço livre em alcance extremo; ou gasta um uso para ficar invisível até fazer algo além de se mover.",
          { limite: [3, "cena"] }),
        acao("padrao", "Encarar o Abismo", "Um ser em alcance curto sofre 4d10+30 de dano de Morte e revela memórias e pensamentos a ele (Vontade DT 35 reduz à metade e evita a revelação). Costuma usá-lo para achar a ampulheta perdida.",
          { rolagens: [dano("Olhar", "4d10+30 Morte")], resistencia: "Vontade DT 35 reduz à metade e evita a revelação" }),
        acao("padrao", "Revelar a Ampulheta", "Quem estiver a até 36 m e puder ver a ampulheta testemunha presságios de incontáveis mortes: 8d6 de dano mental (Vontade DT 35 reduz à metade).",
          { rolagens: [dano("Presságios", "8d6 mental")], resistencia: "Vontade DT 35 reduz à metade" }),
        acao("completa", "Atrair a Ampulheta", "Em alcance curto da ampulheta, mesmo sem vê-la, ele a sente e a teletransporta para as mãos."),
      ],
      enigma: {
        texto: "Quem se torna alvo não escapa, mas pode ganhar tempo: sem a ampulheta, ele deixa o alvo e persegue o item até recuperá-lo. Lendas falam de um ritual capaz de destruir a ampulheta, matando-o de vez e libertando o alvo, mas não há informação útil sobre ele.",
        efeito: "Tirar a ampulheta muda o alvo da perseguição para o item. Destruí-la (pelo ritual lendário) mata o Memento Mori e liberta o alvo.",
      },
    },

    {
      id: "sah.criatura.rascunho", livro: SAH, pagina: 151,
      nome: "Rascunho", natureza: "paranormal", tipo: "Criatura", tamanho: "Médio",
      elementos: [CO, EN], vd: 300,
      descricao: "Ideia abortada que virou ser: contornos negros como rabiscos, que só se aproximam pelo canto do olho e somem quando alguém olha diretamente.",
      presenca: { dt: 35, dano: "7d8", imune: "NEX 90%+" },
      percepcao: "5d20+25", iniciativa: "2d20+15", sentidos: ["percepção às cegas", "visão no escuro"],
      defesa: 48, fortitude: "5d20+20", reflexos: "2d20+15", vontade: "5d20+25",
      pv: 750, machucado: 375,
      resistencias: [[20, "balístico", "corte", "impacto", "perfuração", "Conhecimento", "Energia"]],
      vulnerabilidades: ["Sangue"],
      atributos: [2, 2, 5, 5, 2],
      deslocamento: [[15, 10]],
      habilidades: [
        hab("Ele Não Existe", "Enquanto algum ser o olha diretamente (até por um reflexo), é invisível (SAH, p. 125), inaudível e incorpóreo, e passa automaticamente em Furtividade. Sem ninguém o observando, perde essas três características. Lutar sem olhar para ele impõe as penalidades de estar cego.",
          { marcador: "Sendo observado" }),
        hab("Vulnerabilidade à Luz", "Num ambiente com luz que o ilumine por completo, sofre −10 na Defesa, perde as resistências a dano e faz de tudo para fugir.",
          { marcador: "Iluminado por completo" }),
      ],
      acoes: [
        acao("movimento", "Possuir Objeto", "Se não estiver sendo observado, uma vez por rodada arremessa um objeto por telecinesia contra um ser em alcance médio: 4d6 de dano de impacto (Reflexos DT 35 reduz à metade), dobrado se o objeto for muito pesado.",
          { limite: [1, "rodada"], rolagens: [dano("Objeto", "4d6 impacto"), dano("Objeto muito pesado", "8d6 impacto")], resistencia: "Reflexos DT 35 reduz à metade" }),
        acao("padrao", "Aterrorizar", "Seres à escolha dele a até 9 m sofrem 7d8 de dano mental (Vontade DT 35 reduz à metade).",
          { rolagens: [dano("Aterrorizar", "7d8 mental")], resistencia: "Vontade DT 35 reduz à metade" }),
        acao("completa", "Piscar", "Até três vezes por cena, teletransporta-se para um espaço livre em alcance extremo, mesmo sem linha de visão. Surgindo ao lado de alguém, pode usar Aterrorizar contra esse ser como ação livre.",
          { limite: [3, "cena"] }),
      ],
    },

    {
      id: "sah.criatura.medusa", livro: SAH, pagina: 153,
      nome: "Medusa", natureza: "paranormal", tipo: "Criatura", tamanho: "Grande",
      elementos: [CO, MO], vd: 320,
      descricao: "Versão do Outro Lado do mito grego: corpo serpentino escuro como sombra e olhos que paralisam no tempo quem os encara, num covil decorado com as vítimas.",
      presenca: { dt: 40, dano: "9d6", imune: "NEX 95%+" },
      percepcao: "5d20+25", iniciativa: "4d20+20", sentidos: ["faro", "visão no escuro"],
      defesa: 50, fortitude: "4d20+20", reflexos: "4d20+20", vontade: "5d20+25",
      pv: 380, machucado: 190,
      imunidades: ["Conhecimento"],
      resistencias: [[20, "corte", "impacto", "perfuração", "Morte"]],
      vulnerabilidades: ["Sangue"],
      atributos: [5, 5, 4, 5, 3],
      deslocamento: [[12, 8], [12, 8, "escalada"], [12, 8, "natação"]],
      habilidades: [
        hab("Camuflagem Sombria", "Em penumbra ou escuridão, tem camuflagem e +10 em Furtividade.",
          { rolagens: [teste("Furtividade (na penumbra)", "4d20+30")] }),
        hab("Conhecimento de Eras", "É expert em todas as perícias (4d20+20 nas que a ficha não lista) e se comunica normalmente com pessoas.",
          { rolagens: [teste("Perícia", "4d20+20")] }),
        hab("Olhar Petrificante", "Quem olha nos olhos dela faz Reflexos (DT 40); se falhar, fica petrificado no tempo: parece paralisado, pode ser ferido, mas o ferimento não mostra a passagem do tempo. Só matar a Medusa que o petrificou o salva. Lutar sem olhar para ela impõe as penalidades de estar cego.",
          { resistencia: "Reflexos DT 40 evita" }),
        hab("Recuperação Acelerada", "Cura acelerada 20, que não recupera dano de acertos críticos nem de golpes de corte no pescoço (Defesa 60)."),
        hab("Veneno Mortal", "Quem é atingido pelas garras ou pelo jato fica envenenado: no início de cada turno faz Fortitude (DT 40); falhando, sofre 4d10 de dano de Morte; passando, cura-se.",
          { rolagens: [dano("Veneno", "4d10 Morte")], resistencia: "Fortitude DT 40 encerra" }),
      ],
      acoes: [
        agredir([
          at("Garras", "corpo a corpo", 2, "5d20+35", "8d8+20 corte"),
          at("Cauda", "curto", 1, "5d20+35", "8d8+40 impacto"),
        ]),
        agredir([at("Jato Venenoso", "longo", 1, "5d20+35", "8d12 Morte")], { nome: "Agredir (jato)" }),
        acao("reacao", "Agarrão", "Ao acertar a cauda, pode tentar agarrar o alvo (teste 5d20+37).",
          { rolagens: [teste("Agarrar", "5d20+37")] }),
        acao("livre", "Dilacerar", "Se acertar as duas garras, causa mais 8d8 de dano de corte.",
          { rolagens: [dano("Dilacerar", "8d8 corte")] }),
        acao("padrao", "Sussurrar Maléfico", "Um ser em alcance médio sofre 6d10 de dano mental (Vontade DT 40 reduz à metade).",
          { rolagens: [dano("Sussurro", "6d10 mental")], resistencia: "Vontade DT 40 reduz à metade" }),
        acao("padrao", "Sugestões Irresistíveis", "Um ser em alcance médio faz Vontade (DT 40); se falhar, não consegue deixar de olhar para ela até o início do próprio próximo turno.",
          { resistencia: "Vontade DT 40 evita" }),
        acao("completa", "Rastejar Imparável", "Percorre até o dobro do deslocamento ignorando terreno difícil; terminando ao lado de alguém, ataca com garras ou cauda como ação livre."),
      ],
    },

    {
      id: "sah.criatura.amigo-imaginario", livro: SAH, pagina: 156,
      nome: "Amigo Imaginário", natureza: "paranormal", tipo: "Criatura", tamanho: "Grande",
      elementos: [MO, SA, ME], vd: 360,
      descricao: "Ser encapuzado de mais de 2,5 m, com tentáculos sob o manto e Tinta escorrendo do rosto, nascido do delírio de uma ilha isolada e anunciado pelo som de um sino.",
      presenca: { dt: 40, dano: "8d8" },
      percepcao: "5d20+30", iniciativa: "5d20+30", sentidos: ["percepção às cegas (alcance extremo)"],
      defesa: 56, fortitude: "4d20+20", reflexos: "5d20+30", vontade: "5d20+30",
      pv: 1000, machucado: 500,
      imunidades: ["Morte", "Sangue"],
      resistencias: [[20, "balístico", "corte", "impacto", "perfuração"]],
      vulnerabilidades: ["Energia"],
      atributos: [5, 5, 3, 5, 4],
      pericias: [["Furtividade", "5d20+28"], ["Furtividade (em um quadro)", "5d20+48"]],
      deslocamento: [[12, 8]],
      notas: [
        "A Presença Perturbadora não informa NEX de imunidade.",
        "O Frenesi de Sangue muda a Fortitude para “5D+30”, sem o tipo do dado; aqui, 5d20+30.",
      ],
      estados: [{
        id: "frenesi", nome: "Frenesi de Sangue", maximo: 1,
        altera: { fortitude: "5d20+30", atributos: { VIG: 5 }, deslocamento: [[12, 8], [15, 10, "escalada"]] },
      }],
      habilidades: [
        hab("Quadros", "Sete quadros influenciados pelo Medo o alimentam. Quem observa um deles por algum tempo faz Vontade (DT 40); se falhar, “Entra no Quadro”: revive memórias, traumas ou ilusões e sofre 8d8 de dano mental (Vontade DT 40 evita). Cada entrada deteriora a Membrana da região.",
          { rolagens: [dano("Entrar no Quadro", "8d8 mental")], resistencia: "Vontade DT 40 evita" }),
        hab("O Sino", "Ao aparecer, e no início de cada turno dele, quem estiver em alcance extremo e puder ouvir escuta um sino: fica pasmo por 1 rodada (Vontade DT 40 evita e deixa imune até o fim da cena). Quem falhou e já “Entrou em um Quadro” não consegue se afastar dele até o fim da cena.",
          { resistencia: "Vontade DT 40 evita" }),
        hab("Frenesi de Sangue", "Machucado, entra em fúria: Vigor 5, Fortitude 5d20+30, escalada 15 m e duas ações padrão e duas de movimento por turno. O sino se distorce: quem falhar gasta as ações para alcançar o ser vivo mais próximo e mordê-lo (ou morde a si mesmo); quem já passou contra o sino normal testa de novo, e quem passa fica imune até o fim da cena.",
          { requer: ["frenesi", 1] }),
      ],
      acoes: [
        agredir([
          at("Garras", "corpo a corpo", 2, "5d20+40", "4d10+10 corte"),
          at("Tentáculos", "médio", 1, "5d20+40", "4d10+20 impacto"),
        ]),
        acao("reacao", "Agarrão", "Ao acertar os tentáculos, pode tentar agarrar o alvo (teste 5d20+42). Para libertá-lo, basta destruir o tentáculo (Defesa 30, PV 50, imune a Morte e Sangue, vulnerável a Energia); isso tira 50 PV do Amigo Imaginário.",
          { rolagens: [teste("Agarrar", "5d20+42")] }),
        acao("completa", "Derreter", "Despeja Tinta corrosiva no rosto de um alvo agarrado: 4d10+10 de dano de Morte e 4d10+10 de dano de Sangue (Fortitude DT 40 reduz à metade).",
          { rolagens: [dano("Derreter", ["4d10+10 Morte", "4d10+10 Sangue"])], resistencia: "Fortitude DT 40 reduz à metade" }),
        acao("completa", "Dissolver", "Envolve um alvo agarrado com outros tentáculos: 4d10+20 de dano químico (Fortitude DT 40 reduz à metade), e ele recupera PV iguais ao dano causado.",
          { rolagens: [dano("Dissolver", "4d10+20 químico")], resistencia: "Fortitude DT 40 reduz à metade" }),
      ],
    },
    /* ---------------- SAH · Novas ameaças da Realidade (p. 158–165) ---------------- */

    {
      id: "sah.criatura.bebado-local", livro: SAH, pagina: 158,
      nome: "Bêbado Local", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Pessoas",
      elementos: [], vd: 10,
      descricao: "Figura conhecida da vizinhança, que vive de bar em bar: fonte de causos para quem investiga e, às vezes, espião de quem quer vigiar forasteiros.",
      percepcao: "-2d20+5", iniciativa: "1d20",
      defesa: 12, fortitude: "1d20+5", reflexos: "1d20", vontade: "-2d20",
      pv: 6, machucado: 3,
      resistencias: [[1, "químico"]],
      atributos: [1, 1, 0, 0, 1],
      pericias: [["Diplomacia", "1d20+5"]],
      deslocamento: [[6, 4]],
      habilidades: [
        hab("Causos e Histórias", "Quem interroga o bêbado recebe +5 em Investigação, desde que a DT da informação seja 20 ou menos."),
        hab("Espião Involuntário", "Um NPC pode usá-lo como espião. Quem interage com ele faz Intuição ou Vontade (DT 15); se falhar, deixa escapar algo relevante, e cada informação vira um bônus de +5 que o mestre pode gastar para aumentar a DT de um teste ligado à investigação.",
          { resistencia: "Intuição ou Vontade DT 15 evita" }),
        hab("Invisibilidade Social", "Se não estiver fazendo nada chamativo, os outros precisam passar em Percepção (DT 15) para notá-lo."),
      ],
      acoes: [
        agredir([at("Soco", "corpo a corpo", 1, "1d20", "1d3+1 impacto")]),
      ],
    },

    {
      id: "sah.criatura.burocrata", livro: SAH, pagina: 158,
      nome: "Burocrata", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Pessoas",
      elementos: [], vd: 10,
      descricao: "Encarregado de normas e procedimentos, público ou privado; útil como fonte de informação, mas um obstáculo quando o tempo é curto.",
      percepcao: "2d20+5", iniciativa: "1d20",
      defesa: 11, fortitude: "1d20", reflexos: "1d20", vontade: "2d20+5",
      pv: 6, machucado: 3,
      atributos: [1, 1, 2, 2, 1],
      pericias: [["Diplomacia", "2d20+5"], ["Profissão (burocrata)", "2d20+10"]],
      deslocamento: [[9, 6]],
      habilidades: [
        hab("Atendimento Protocolar", "Começa indiferente com desconhecidos. Enquanto estiver indiferente (ou pior) com alguém, essa pessoa sofre −5 em testes baseados em Intelecto e Presença contra ele."),
        hab("Burocracia Frustrante", "Quem falha num teste baseado em Intelecto ou Presença contra ele perde 1 ponto de Sanidade."),
        hab("Morosidade", "Numa cena em que o tempo importa, cada personagem faz Diplomacia (DT 15) ao encontrá-lo pela primeira vez; se falhar, perde uma rodada em discussões e procedimentos.",
          { resistencia: "Diplomacia DT 15 evita" }),
        hab("Preencha o Formulário", "Interrogá-lo exige a perícia certa para a área dele, definida pelo mestre (Artes numa galeria, Crime num tribunal, Religião numa igreja…). Interrogar com a perícia errada falha automaticamente; os personagens podem adivinhar ou conversar para descobrir a certa."),
      ],
      acoes: [
        agredir([at("Soco", "corpo a corpo", 1, "1d20", "1d3+1 impacto")]),
      ],
    },

    {
      id: "sah.criatura.fazendeiro-isolado", livro: SAH, pagina: 159,
      nome: "Fazendeiro Isolado", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Pessoas",
      elementos: [], vd: 20,
      descricao: "Gente do campo acostumada a resolver tudo sozinha, longe de vizinhos e da cidade; desconfiada de estranhos.",
      percepcao: "2d20+5", iniciativa: "1d20",
      defesa: 16, fortitude: "2d20+5", reflexos: "1d20", vontade: "2d20+5",
      pv: 16, machucado: 8,
      atributos: [1, 2, 1, 2, 2],
      pericias: [["Profissão (fazendeiro)", "1d20+10"]],
      deslocamento: [[9, 6]],
      habilidades: [
        hab("De Sol a Sol", "Não fica inconsciente por chegar a 0 PV."),
        hab("Histórias de Pescador", "Se o grupo dividir a investigação com ele, pode, a critério do mestre, fazer um teste de revisar o caso (OPRPG, p. 93) com Profissão (fazendeiro); passando, fornece uma pista.",
          { rolagens: [teste("Revisar o caso", "1d20+10")] }),
        hab("Resiliência do Campo", "Pode usar Profissão (fazendeiro) no lugar de perícias baseadas em Força ou Presença."),
      ],
      acoes: [
        agredir([at("Peixeira", "corpo a corpo", 1, "2d20+5", "1d8+5 corte", { critico: "19" })]),
        agredir([at("Espingarda", "curto", 1, "1d20+5", "4d6 balístico", { critico: "x3" })], { nome: "Agredir (distância)" }),
        acao("movimento", "Atiçar os Cães", "Manda os cães de guarda cercarem um alvo em alcance curto: o próximo ataque que o fazendeiro acertar causa +1d8 de dano de perfuração e deixa o alvo caído (Luta DT 15 evita a condição).",
          { rolagens: [dano("Cães", "1d8 perfuração")], resistencia: "Luta DT 15 evita a condição", marcador: "Cães atiçados" }),
      ],
    },

    {
      id: "sah.criatura.investigador", livro: SAH, pagina: 159,
      nome: "Investigador", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Pessoas",
      elementos: [], vd: 40,
      descricao: "Profissional de investigação de campo — policial civil, perito de seguradora ou detetive particular —, que pode ajudar ou atrapalhar os agentes.",
      percepcao: "2d20+5", iniciativa: "2d20+5",
      defesa: 18, fortitude: "2d20", reflexos: "2d20+5", vontade: "1d20+5",
      pv: 68, machucado: 34,
      atributos: [2, 1, 2, 1, 2],
      pericias: [["Crime", "2d20+5"], ["Diplomacia", "1d20+5"], ["Furtividade", "2d20+5"], ["Intuição", "1d20+5"], ["Investigação", "2d20+5"]],
      deslocamento: [[9, 6]],
      habilidades: [
        hab("Fonte de Informações", "Um investigador amistoso ou prestativo, consultado uma vez por interlúdio, dá +5 numa única ação de revisar caso. O mestre decide se ele está disponível.",
          { limite: [1, "interlúdio"] }),
      ],
      acoes: [
        agredir([at("Soco", "corpo a corpo", 1, "1d20+10", "1d3+1 impacto")]),
        agredir([at("Revólver", "curto", 1, "2d20+10", "2d6+6 balístico", { critico: "19/x3" })], { nome: "Agredir (distância)" }),
        acao("movimento", "Olhar do Investigador", "Faz Investigação (DT 15) para notar uma fraqueza num ser em alcance médio; passando, seus ataques contra ele causam +1d6 de dano até o fim da cena.",
          { rolagens: [teste("Investigação", "2d20+5"), dano("Fraqueza", "1d6")], marcador: "Fraqueza observada" }),
      ],
    },

    {
      id: "sah.criatura.medico", livro: SAH, pagina: 160,
      nome: "Médico", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Pessoas",
      elementos: [], vd: 20,
      descricao: "Treinado para salvar vidas — e, nas mãos erradas ou tomado pelo paranormal, para causar dor com precisão.",
      percepcao: "2d20+5", iniciativa: "1d20",
      defesa: 13, fortitude: "1d20+5", reflexos: "1d20", vontade: "2d20+5",
      pv: 14, machucado: 7,
      atributos: [1, 1, 2, 2, 1],
      pericias: [["Ciências", "2d20+5"], ["Medicina", "2d20+10"]],
      deslocamento: [[9, 6]],
      habilidades: [
        hab("Conhecimento Anatômico", "Quem é atingido pelo bisturi fica atordoado por uma rodada e sangrando (Fortitude DT 15 evita). A mesma pessoa só é atordoada assim uma vez por cena.",
          { resistencia: "Fortitude DT 15 evita" }),
      ],
      acoes: [
        agredir([at("Bisturi", "corpo a corpo", 1, "2d20+5", "1d4+1 corte", { critico: "18" })]),
        acao("padrao", "Tratar Ferimentos", "Cura 2d10+2 PV de si ou de um ser adjacente, uma vez por dia por ser.",
          { rolagens: [soma("Cura", "2d10+2")] }),
      ],
    },

    {
      id: "sah.criatura.religioso", livro: SAH, pagina: 160,
      nome: "Religioso", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Pessoas",
      elementos: [], vd: 40,
      descricao: "Líder carismático de uma fé qualquer, capaz de mobilizar seus fiéis — para o bem da congregação ou em busca de riqueza, influência e até poder paranormal.",
      percepcao: "3d20+5", iniciativa: "1d20+5",
      defesa: 15, fortitude: "1d20", reflexos: "1d20", vontade: "3d20+5",
      pv: 32, machucado: 16,
      atributos: [1, 1, 2, 3, 1],
      pericias: [["Diplomacia", "3d20+5"], ["Intuição", "3d20+5"], ["Religião", "3d20+5"]],
      deslocamento: [[9, 6]],
      notas: ["Em Voz Guia, o bônus está impresso como “+” seguido de um ornamento, sem valor legível; o R.A.M.A. não rola nem aplica esse bônus."],
      habilidades: [
        hab("Fé Inabalável", "+10 em Vontade contra efeitos paranormais (incluindo rituais).",
          { rolagens: [teste("Vontade contra paranormal", "3d20+15")] }),
        hab("Potência da Voz", "Com microfone ou outro amplificador, o alcance das habilidades dele aumenta um passo e a DT para resistir a elas aumenta em +5."),
        hab("Seguidores", "Sempre acompanhado de 1d4+1 devotos fiéis (ficha de iniciado, OPRPG p. 286), dispostos a tudo para protegê-lo.",
          { rolagens: [soma("Devotos", "1d4+1")] }),
      ],
      acoes: [
        agredir([at("Pancada", "corpo a corpo", 1, "1d20+5", "1d3+1 impacto")]),
        acao("padrao", "Voz Guia", "Uma pessoa em alcance curto que possa ouvi-lo recebe um bônus no próximo teste de perícia feito até o fim da próxima rodada (valor ilegível no livro; veja as notas)."),
        acao("padrao", "Voz Acusadora", "Humilha uma pessoa em alcance curto com os próprios defeitos: 3d6 de dano mental e alquebrada (Vontade DT 15 reduz à metade e evita a condição).",
          { rolagens: [dano("Acusação", "3d6 mental")], resistencia: "Vontade DT 15 reduz à metade e evita a condição" }),
        acao("reacao", "Sacrifício Sagrado", "Uma vez por rodada, ao sofrer dano, troca de lugar com um seguidor adjacente, que sofre o dano no lugar dele.",
          { limite: [1, "rodada"] }),
      ],
    },

    {
      id: "sah.criatura.predador-sofisticado", livro: SAH, pagina: 161,
      nome: "Predador Sofisticado", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Serial killers",
      elementos: [], vd: 60,
      descricao: "Assassino em série endinheirado, que caça em lugares movimentados e usa status e recursos para fazer as vítimas sumirem sem rastro.",
      percepcao: "3d20+10", iniciativa: "3d20+5",
      defesa: 21, fortitude: "1d20+5", reflexos: "3d20+10", vontade: "3d20+10",
      pv: 60, machucado: 30,
      atributos: [3, 3, 2, 3, 1],
      pericias: [["Diplomacia", "3d20+10"], ["Enganação", "3d20+10"], ["Intimidação", "3d20+10"]],
      deslocamento: [[9, 6]],
      habilidades: [
        hab("Escondido em Plena Vista", "Em lugares movimentados (shoppings, metrôs), usa Enganação no lugar de Furtividade e não sofre penalidades nem perde deslocamento por ações chamativas enquanto furtivo."),
        hab("Recursos Abundantes", "Entra em lugares e acessa documentos fora do alcance comum e escapa impune de crimes menores; para crimes graves, pode arranjar um bode expiatório, a critério do mestre."),
        hab("Sorriso Sedutor", "Quem não sabe que ele é um assassino fica desprevenido contra ele e sofre −1d20 em testes contra ele."),
      ],
      acoes: [
        agredir([at("Navalha", "corpo a corpo", 2, "3d20+10", "1d8+13 corte", { critico: "19/x3" })]),
        agredir([at("Machado", "corpo a corpo", 2, "3d20+10", "2d8+13 corte", { critico: "x3" })], { nome: "Agredir (machado)" }),
        agredir([at("Pistola Silenciada", "curto", 2, "3d20+10", "1d12+13 balístico", { critico: "x3" })], { nome: "Agredir (distância)" }),
        acao("livre", "Ataque Furtivo", "Uma vez por rodada, +3d6 de dano com ataque corpo a corpo, ou à distância em alcance curto, contra alvo desprevenido ou que esteja flanqueando.",
          { limite: [1, "rodada"], rolagens: [dano("Furtivo", "3d6")] }),
        acao("padrao", "Guarda-Costas", "Uma vez por cena, chama 1d4+1 capangas (OPRPG, p. 284), que entram no início da próxima rodada.",
          { limite: [1, "cena"], rolagens: [soma("Capangas", "1d4+1")] }),
      ],
    },

    {
      id: "sah.criatura.cacador-de-gente", livro: SAH, pagina: 162,
      nome: "Caçador de Gente", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Serial killers",
      elementos: [], vd: 80,
      descricao: "Assassino brutal e incontrolável que se isola no campo ou em prédios abandonados e caça pessoas no próprio território.",
      percepcao: "1d20+5", iniciativa: "2d20+10",
      defesa: 23, fortitude: "3d20+10", reflexos: "2d20+10", vontade: "1d20+5",
      pv: 80, machucado: 40,
      atributos: [2, 3, 1, 1, 3],
      pericias: [["Atletismo", "3d20+10"], ["Sobrevivência", "1d20+10"]],
      deslocamento: [[9, 6]],
      habilidades: [
        hab("Abrutalhado", "Usa itens de duas mãos com uma só e objetos para criaturas Grandes sem penalidade. Machucado, tem resistência a dano 10/paranormal."),
        hab("Área de Caça", "Na área isolada onde caça (definida pelo mestre), recebe +1d20 em testes de perícia."),
        hab("Faro para Humanos", "+2d20 em Sobrevivência envolvendo pessoas, e percebe humanos pelo olfato, como se tivesse faro.",
          { rolagens: [teste("Sobrevivência (rastrear pessoas)", "3d20+10")] }),
      ],
      acoes: [
        agredir([at("Pancada", "corpo a corpo", 2, "3d20+15", "1d4+15 impacto")]),
        agredir([at("Machado", "corpo a corpo", 2, "3d20+15", "2d8+15 corte", { critico: "x3" })], { nome: "Agredir (machado)" }),
        agredir([at("Motosserra", "corpo a corpo", 2, "3d20+15", "3d6+15 corte", { critico: "x4" })], { nome: "Agredir (motosserra)" }),
        acao("livre", "Ataque Furtivo", "Uma vez por rodada, +4d6 de dano com ataque corpo a corpo, ou à distância em alcance curto, contra alvo desprevenido ou que esteja flanqueando.",
          { limite: [1, "rodada"], rolagens: [dano("Furtivo", "4d6")] }),
        acao("movimento", "Imparável", "Anula qualquer efeito que esteja reduzindo seu deslocamento (as demais consequências do efeito continuam)."),
        acao("padrao", "Assustar", "Um gesto assustador (grito, gargalhada, motosserra roncando): 4d6 de dano mental em pessoas e animais em alcance curto que o vejam ou ouçam (Vontade DT 20 reduz à metade).",
          { rolagens: [dano("Susto", "4d6 mental")], resistencia: "Vontade DT 20 reduz à metade" }),
        acao("padrao", "Fatalidade", "Um único ataque de pancada; se acertar, além do dano, causa um ferimento debilitante (SAH, p. 105). Uma vez por cena por ser.",
          { ataques: [at("Pancada", "corpo a corpo", 1, "3d20+15", "1d4+15 impacto")] }),
      ],
    },

    {
      id: "sah.criatura.artista-da-morte", livro: SAH, pagina: 162,
      nome: "Artista da Morte", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Serial killers",
      elementos: [], vd: 140,
      descricao: "Assassino meticuloso que trata cada morte como obra de arte, com tempo, técnica e uma cena do crime perfeita; raramente um combatente.",
      percepcao: "3d20+15", iniciativa: "3d20+15",
      defesa: 27, fortitude: "1d20+5", reflexos: "3d20+15", vontade: "3d20+15",
      pv: 150, machucado: 75,
      atributos: [3, 1, 3, 3, 1],
      pericias: [["Artes", "3d20+15"], ["Enganação", "3d20+15"], ["Furtividade", "3d20+15"]],
      deslocamento: [[9, 6]],
      habilidades: [
        hab("Matar é uma Arte", "Usa Artes no lugar de qualquer perícia em testes que envolvam mentes e corpos humanos (necrópsia, persuasão…). Com algumas horas para analisar uma cena ou vítima, troca Investigação por Artes com +1d20.",
          { rolagens: [teste("Artes (analisar cena)", "4d20+15")] }),
        hab("Cenas Imprevisíveis", "Se quis disfarçar a morte, os testes para achar pistas na cena têm DT +5. Se quis deixar sua marca, quem vê a cena fica enjoado e, se não sair logo, sofre 4d8 de dano mental (Vontade DT 25 reduz à metade e evita a condição).",
          { rolagens: [dano("Cena do crime", "4d8 mental")], resistencia: "Vontade DT 25 reduz à metade e evita a condição" }),
      ],
      acoes: [
        agredir([at("Bisturi", "corpo a corpo", 2, "3d20+15", "1d4+17 corte", { critico: "19/x4" })]),
        acao("livre", "Ataque Furtivo", "Uma vez por rodada, +7d6 de dano com ataque corpo a corpo, ou à distância em alcance curto, contra alvo desprevenido ou que esteja flanqueando.",
          { limite: [1, "rodada"], rolagens: [dano("Furtivo", "7d6")] }),
        acao("padrao", "Discurso Artístico", "Justifica sua arte para quem o ouve em alcance curto: 4d8 de dano mental, alquebrado e frustrado (Vontade DT 25 reduz à metade e evita o frustrado). Uma vez por cena por pessoa.",
          { rolagens: [dano("Discurso", "4d8 mental")], resistencia: "Vontade DT 25 reduz à metade e evita frustrado" }),
      ],
    },

    {
      id: "sah.criatura.ariranha", livro: SAH, pagina: 163,
      nome: "Ariranha", natureza: "animal", tipo: "Animal", tamanho: "Médio", categoria: "Animais",
      elementos: [], vd: 20,
      descricao: "Predadora corajosa do Pantanal e da Amazônia, que vive em bandos familiares capazes de derrotar oponentes bem maiores.",
      percepcao: "1d20+5", iniciativa: "2d20+5", sentidos: ["faro", "visão na penumbra"],
      defesa: 16, fortitude: "2d20", reflexos: "2d20+5", vontade: "1d20",
      pv: 32, machucado: 16,
      atributos: [2, 1, 0, 1, 2],
      deslocamento: [[12, 8], [9, 6, "natação"]],
      habilidades: [
        hab("Evasão", "Contra efeitos que permitem Reflexos para reduzir o dano à metade, não sofre dano nenhum se passar."),
        hab("Táticas Familiares", "+2 no ataque e no dano para cada outra ariranha atacando o mesmo oponente na rodada."),
      ],
      acoes: [
        agredir([at("Mordida", "corpo a corpo", 1, "2d20+5", "2d4+2 corte")]),
      ],
    },

    {
      id: "sah.criatura.cavalo", livro: SAH, pagina: 163,
      nome: "Cavalo", natureza: "animal", tipo: "Animal", tamanho: "Grande", categoria: "Animais",
      elementos: [], vd: 10,
      descricao: "Animal de transporte, tração, policiamento ou esporte; geralmente pacato, mas com coices poderosos.",
      percepcao: "1d20+5", iniciativa: "1d20+5", sentidos: ["faro", "visão na penumbra"],
      defesa: 13, fortitude: "2d20", reflexos: "1d20+5", vontade: "1d20",
      pv: 12, machucado: 6,
      atributos: [1, 3, 0, 1, 2],
      deslocamento: [[15, 10]],
      habilidades: [
        hab("Montaria", "Quem é treinado em Adestramento pode montá-lo: conta como aliado que eleva o deslocamento a 15 m e dá uma ação extra por rodada, só para se deslocar."),
      ],
      acoes: [
        agredir([at("Cascos", "corpo a corpo", 1, "3d20+5", "2d4+3 impacto")]),
      ],
    },

    {
      id: "sah.criatura.enxame-de-tocandiras", livro: SAH, pagina: 164,
      nome: "Enxame de Tocandiras", natureza: "animal", tipo: "Animal (enxame)", tamanho: "Médio", categoria: "Animais",
      elementos: [], vd: 20,
      descricao: "Enxame de formigas-bala da Amazônia, cuja picada causa uma dor intensa e debilitante.",
      percepcao: "1d20+5", iniciativa: "1d20+5", sentidos: ["visão na penumbra"],
      defesa: 16, fortitude: "-2d20", reflexos: "1d20+5", vontade: "1d20",
      pv: 22, machucado: 11,
      atributos: [1, 0, 0, 1, 0],
      deslocamento: [[6, 4], [6, 4, "escalada"]],
      habilidades: [
        hab("Enxame", "Pode entrar no espaço de outro ser e, no fim do turno, causa automaticamente 4d4 de dano de perfuração a quem estiver no seu espaço. Imune a manobras e a efeitos de alvo único que não causam dano; sofre metade do dano de armas e 50% a mais de efeitos de área.",
          { rolagens: [dano("Enxame", "4d4 perfuração")] }),
        hab("Dor Debilitante", "Quem sofre dano do enxame sofre −1d20 em todos os testes (Fortitude DT 20 evita), até dormir num interlúdio ou receber uma dose de antídoto.",
          { resistencia: "Fortitude DT 20 evita" }),
        hab("Por Dentro das Roupas", "Quem sai do espaço do enxame leva formigas nas roupas e continua sofrendo metade do dano (2d4) até gastar uma ação de movimento para se livrar delas.",
          { rolagens: [dano("Formigas nas roupas", "2d4 perfuração")] }),
      ],
      acoes: [],
    },

    {
      id: "sah.criatura.gorila", livro: SAH, pagina: 164,
      nome: "Gorila", natureza: "animal", tipo: "Animal", tamanho: "Grande", categoria: "Animais",
      elementos: [], vd: 40,
      descricao: "Animal territorial e imponente, que faz de tudo para proteger seu habitat.",
      percepcao: "1d20+5", iniciativa: "2d20+5", sentidos: ["faro", "visão na penumbra"],
      defesa: 19, fortitude: "3d20+5", reflexos: "2d20+5", vontade: "1d20",
      pv: 70, machucado: 35,
      atributos: [2, 3, 0, 1, 3],
      pericias: [["Atletismo", "3d20+5"]],
      deslocamento: [[9, 6], [9, 6, "escalada"]],
      acoes: [
        agredir([at("Pancada", "corpo a corpo", 2, "2d20+10", "1d6+3 impacto")]),
        acao("livre", "Morder", "Se acertar as duas pancadas no mesmo ser na rodada, ataca-o com uma mordida.",
          { ataques: [at("Mordida", "corpo a corpo", 1, "2d20+10", "1d6+4 corte")] }),
      ],
    },

    {
      id: "sah.criatura.leao", livro: SAH, pagina: 164,
      nome: "Leão", natureza: "animal", tipo: "Animal", tamanho: "Grande", categoria: "Animais",
      elementos: [], vd: 60,
      descricao: "Grande predador das savanas africanas, ainda encontrado em abrigos ou em coleções, quase sempre ilegais, de animais exóticos.",
      percepcao: "1d20+10", iniciativa: "3d20+10", sentidos: ["faro", "visão na penumbra"],
      defesa: 18, fortitude: "2d20+5", reflexos: "3d20+10", vontade: "2d20+5",
      pv: 80, machucado: 40,
      atributos: [3, 3, 0, 2, 2],
      pericias: [["Atletismo", "3d20+10"], ["Furtividade", "3d20+8"]],
      deslocamento: [[15, 10]],
      acoes: [
        agredir([
          at("Garras", "corpo a corpo", 2, "3d20+10", "1d6+4 corte", { critico: "19" }),
          at("Mordida", "corpo a corpo", 1, "3d20+10", "1d8+4 corte"),
        ]),
        acao("livre", "Agarrão", "Ao acertar a mordida num ser Médio ou menor, pode tentar agarrá-lo (teste 3d20+12).",
          { rolagens: [teste("Agarrar", "3d20+12")] }),
        acao("completa", "Bote", "Faz uma investida e ataca com a mordida e as duas garras, todas contra o mesmo alvo e com o +1d20 da investida."),
      ],
    },

    {
      id: "sah.criatura.lobo", livro: SAH, pagina: 165,
      nome: "Lobo", natureza: "animal", tipo: "Animal", tamanho: "Médio", categoria: "Animais",
      elementos: [], vd: 20,
      descricao: "Caçador hábil em grupo; quando um uiva, nunca está sozinho.",
      percepcao: "1d20+5", iniciativa: "3d20+5", sentidos: ["faro", "visão na penumbra"],
      defesa: 15, fortitude: "2d20+5", reflexos: "3d20+5", vontade: "1d20",
      pv: 18, machucado: 9,
      atributos: [3, 3, 0, 1, 2],
      pericias: [["Sobrevivência", "1d20+10"]],
      deslocamento: [[12, 8]],
      habilidades: [
        hab("Táticas de Alcateia", "Flanqueando, recebe +1d20 no ataque (além do bônus normal de flanquear, total +2d20) e causa +1d6 de dano com a mordida.",
          { rolagens: [dano("Alcateia", "1d6")] }),
      ],
      acoes: [
        agredir([at("Mordida", "corpo a corpo", 1, "3d20+5", "1d6+4 corte")]),
        acao("livre", "Derrubar", "Ao acertar a mordida, pode fazer a manobra derrubar (teste 3d20+5).",
          { rolagens: [teste("Derrubar", "3d20+5")] }),
      ],
    },

    {
      id: "sah.criatura.touro", livro: SAH, pagina: 165,
      nome: "Touro", natureza: "animal", tipo: "Animal", tamanho: "Grande", categoria: "Animais",
      elementos: [], vd: 20,
      descricao: "Montanha de músculos de temperamento imprevisível.",
      percepcao: "1d20+5", iniciativa: "1d20", sentidos: ["faro", "visão na penumbra"],
      defesa: 15, fortitude: "2d20+5", reflexos: "1d20", vontade: "1d20",
      pv: 38, machucado: 19,
      atributos: [1, 3, 0, 1, 2],
      deslocamento: [[12, 8]],
      acoes: [
        agredir([at("Chifres", "corpo a corpo", 1, "3d20+5", "2d6+6 perfuração")]),
        acao("completa", "Atropelamento", "Percorre até o dobro do deslocamento em linha reta, passando pelo espaço de seres menores; quem estiver na linha sofre 2d6+6 de dano de impacto e fica caído (Reflexos DT 15 reduz à metade e evita a condição).",
          { rolagens: [dano("Atropelamento", "2d6+6 impacto")], resistencia: "Reflexos DT 15 reduz à metade e evita a condição", recarga: "ação de movimento" }),
      ],
    },

    {
      id: "sah.criatura.urso-pardo", livro: SAH, pagina: 165,
      nome: "Urso Pardo", natureza: "animal", tipo: "Animal", tamanho: "Grande", categoria: "Animais",
      elementos: [], vd: 60,
      descricao: "Um dos ursos mais perigosos: predador imponente e poderoso.",
      percepcao: "1d20+5", iniciativa: "1d20+5", sentidos: ["faro", "visão na penumbra"],
      defesa: 19, fortitude: "3d20+10", reflexos: "1d20+5", vontade: "2d20",
      pv: 90, machucado: 45,
      resistencias: [[2, "balístico", "corte", "impacto", "perfuração"]],
      atributos: [1, 3, 0, 2, 3],
      pericias: [["Atletismo", "3d20+10"]],
      deslocamento: [[12, 8]],
      acoes: [
        agredir([
          at("Garras", "corpo a corpo", 2, "3d20+10", "1d6+4 corte", { critico: "19" }),
          at("Mordida", "corpo a corpo", 1, "3d20+10", "1d8+4 corte"),
        ]),
        acao("livre", "Agarrão", "Ao acertar a mordida num ser Médio ou menor, pode tentar agarrá-lo (teste 3d20+12).",
          { rolagens: [teste("Agarrar", "3d20+12")] }),
      ],
    },
    /* ---------------- SAH · Missões (p. 168–225) ---------------- */

    {
      id: "sah.criatura.amanda-sousa", livro: SAH, pagina: 192,
      nome: "Amanda Sousa / Antonella Blanchard", natureza: "humana", tipo: "Pessoa", tamanho: null, categoria: "Missão: Noite de Compras",
      nivel: "Nível 3 · NEX 10%",
      elementos: [], vd: null,
      descricao: "Atendente tímida do shopping que, na verdade, é Antonella Blanchard disfarçada para acompanhar o experimento; anota num caderninho todo indício do paranormal.",
      percepcao: "3d20+5", iniciativa: "3d20+5",
      defesa: 16, fortitude: "2d20", reflexos: "3d20", vontade: "3d20+5",
      pv: 30, machucado: 15,
      atributos: [3, 1, 3, 3, 2],
      pericias: [["Atualidades", "3d20+5"], ["Diplomacia", "3d20+5"], ["Enganação", "3d20+5"], ["Ocultismo", "3d20+5"], ["Profissão (executiva)", "3d20+5"]],
      deslocamento: [[9, 6]],
      notas: ["Ficha de NPC da missão, com nível e NEX em vez de VD e sem tamanho impresso."],
      acoes: [
        agredir([
          at("Tapa", "corpo a corpo", 1, "1d20", "1d3+1 impacto"),
          at("Pistola", "curto", 1, "3d20+5", "1d12 balístico", { critico: "18" }),
        ]),
      ],
    },

    {
      id: "sah.criatura.vigia-ensandecido", livro: SAH, pagina: 193,
      nome: "Vigia Ensandecido", natureza: "humana", tipo: "Pessoa", tamanho: null, categoria: "Missão: Noite de Compras",
      nivel: "Nível 1 · NEX 2%",
      elementos: [], vd: null,
      descricao: "Segurança do shopping em surto psicótico depois de ver atrocidades demais; não há conversa possível. Tem na pele a marca de um ritual de um experimento.",
      percepcao: "1d20+5", iniciativa: "1d20+5",
      defesa: 14, fortitude: "2d20+5", reflexos: "1d20", vontade: "1d20",
      pv: 11, machucado: 5,
      atributos: [1, 2, 1, 1, 2],
      deslocamento: [[9, 6]],
      notas: ["Ficha de NPC da missão, com nível e NEX em vez de VD e sem tamanho impresso."],
      acoes: [
        agredir([at("Bastão", "corpo a corpo", 1, "2d20+5", "1d6+2 impacto")]),
      ],
    },

    {
      id: "sah.criatura.o-terminal", livro: SAH, pagina: 218,
      nome: "O Terminal", natureza: "paranormal", tipo: "Criatura", tamanho: "Colossal", categoria: "Missão: O Terminal do Fim",
      elementos: [MO], vd: 260,
      descricao: "Massa espiralada de tentáculos de Lodo e rostos em agonia que isola um lugar inteiro da Realidade e devora devagar quem é tomado pela desolação.",
      presenca: { dt: 30, dano: "8d6", imune: "NEX 85%+" },
      percepcao: "1d20+5", iniciativa: "3d20+15", sentidos: ["percepção às cegas"],
      defesa: 28, fortitude: "5d20+15", reflexos: "veja texto", vontade: "4d20+20",
      pv: 700, machucado: 350,
      resistencias: [[10, "balístico", "impacto", "perfuração"], [20, "Morte"]],
      vulnerabilidades: ["Energia"],
      atributos: [0, 5, 2, 4, 5],
      deslocamento: [[15, 10]],
      notas: [
        "Reflexos: falha automaticamente (Corpo Tentacular). O R.A.M.A. não rola esse teste.",
        "O deslocamento está impresso, mas Corpo Tentacular diz que ele não se move.",
        "O texto da missão remete à p. 217; a ficha está na p. 218.",
      ],
      estados: [{ id: "casulos", nome: "Casulos ocupados", maximo: 8, inicial: 8 }],
      habilidades: [
        hab("Corpo Tentacular", "Não se move nem pode ser movido por efeito algum, falha automaticamente em Reflexos e não tem ação de movimento, mas faz três ações padrão por rodada."),
        hab("Lamúrio Melancólico", "Quem termina o turno a 9 m ou menos faz Vontade (DT 30); se falhar, sofre 1d6 de dano mental e fica frustrado até o fim do próprio próximo turno.",
          { rolagens: [dano("Lamúrio", "1d6 mental")], resistencia: "Vontade DT 30 evita" }),
        hab("Troca Equivalente", "As vítimas ficam em casulos de Lodo ligados a ele por tentáculos. Sempre que sofre dano, transfere 10 pontos para um casulo ocupado; cada vítima tem 20 PV e morre a 0, destruindo o casulo. Começa com 8 casulos ocupados. Um personagem adjacente abre um casulo com uma ação padrão; o tentáculo de um casulo pode ser destruído (Defesa 18, 25 PV, mesmas resistências, imunidades e vulnerabilidades do corpo)."),
        hab("Úlcera Raivosa", "No fim de cada rodada em que sofreu 50 de dano ou mais, forma uma bolha (Defesa 20, 100 PV) que explode duas rodadas depois e liberta 2d4 esqueletos de Lodo, que agem a partir da rodada seguinte na iniciativa dele.",
          { rolagens: [soma("Esqueletos de Lodo", "2d4")] }),
      ],
      acoes: [
        agredir([at("Tentáculos", "corpo a corpo (9 m)", 2, "5d20+30", ["3d6 impacto", "3d6 Morte"])]),
        acao("reacao", "Surto de Negação", "Uma vez por rodada, nega um efeito negativo que sofreria por uma habilidade ou ritual.",
          { limite: [1, "rodada"] }),
      ],
      enigma: {
        texto: "Vive num covil protegido por uma neblina paranormal intransponível. Para chegar até ele é preciso um ritual: uma série de ações que conectam o grupo às histórias que deram origem à criatura (veja “O mistério da Linha Magenta”, p. 195).",
        efeito: "Com o ritual feito, a neblina se dissipa e o combate final pode acontecer; o livro não traz alteração numérica.",
      },
    },

    /* ---------------- AS1 · Arquivos Secretos 1 (v1.1) ---------------- */

    {
      id: "as1.criatura.anulado", livro: AS1, pagina: 53,
      nome: "Anulado", natureza: "paranormal", tipo: "Criatura", tamanho: "Médio",
      elementos: [SA], vd: 100,
      descricao: "Corpo abandonado por tempo demais depois de uma Passagem de Conhecimento: um quase ser de carne e memórias, instável, que suga órgãos para completar a si mesmo.",
      presenca: { dt: 20, dano: "4d6", imune: "NEX 45%" },
      percepcao: "3d20+10", iniciativa: "2d20+10", sentidos: ["visão no escuro"],
      defesa: 25, fortitude: "3d20+10", reflexos: "2d20+5", vontade: "1d20+10",
      pv: 190, machucado: 95,
      atributos: [2, 3, 1, 1, 3],
      deslocamento: [[9, 6]],
      notas: ["A imunidade da Presença está impressa como “NEX 45% é imune”, sem o “+”; mantida como impressa."],
      habilidades: [
        hab("Corpo Oscilante", "Na primeira vez que um ser olha diretamente para ele (qualquer ação que o tenha como alvo), sofre 2d6 de dano mental. Quem age contra ele sem olhar não sofre isso, mas tem −1d20 nos testes.",
          { rolagens: [dano("Olhar", "2d6 mental")] }),
        hab("Golpes Anulados", "Pode distribuir os ataques entre até três alvos diferentes."),
        hab("Quero o Seu Corpo", "Quem ataca e erra faz Reflexos (DT 25) ou fica agarrado. Começando o turno agarrando alguém, suga os órgãos dele: 4d10 de dano de Sangue, e o anulado recupera PV iguais à metade do dano.",
          { rolagens: [dano("Sugar órgãos", "4d10 Sangue")], resistencia: "Reflexos DT 25 evita ficar agarrado" }),
      ],
      acoes: [
        agredir([
          at("Braços Grotescos", "corpo a corpo", 2, "3d20+15", "1d8+10 impacto"),
          at("Mordida Asquerosa", "corpo a corpo", 1, "3d20+15", "1d10+10 Sangue"),
        ]),
      ],
    },

    {
      id: "as1.criatura.assecla", livro: AS1, pagina: 28,
      nome: "Assecla", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Transtornados",
      elementos: [], vd: 40,
      descricao: "Recém-chegado ao culto dos Transtornados: alguém quebrado pela vida ou pelo paranormal, usado em tarefas básicas e rituais menores.",
      percepcao: "1d20+5", iniciativa: "1d20+5",
      defesa: 18, fortitude: "2d20+5", reflexos: "1d20+5", vontade: "1d20+5",
      pv: 30, machucado: 15,
      atributos: [1, 2, 2, 1, 2],
      pericias: [["Atletismo", "2d20+5"], ["Intimidação", "1d20+5"], ["Ocultismo", "2d20+5"]],
      deslocamento: [[9, 6]],
      notas: ["O título da ficha traz a marca “WIP” no PDF v1.1, um resto de diagramação; a ficha está completa."],
      habilidades: [
        hab("Rituais (DT 15)", "Conjura os rituais abaixo sem pagar PE, até 3 PE por conjuração, com a ação de cada um."),
        hab("Corrente Farpada", "A corrente alcança 3 m e dá +2 em testes para desarmar e derrubar."),
      ],
      acoes: [
        agredir([at("Corrente Farpada", "corpo a corpo (3 m)", 1, "2d20+5", "1d8+10 corte", { critico: "19" })]),
        acao("padrao", "Ritual: Armadura de Sangue (Sangue 1)", "+5 na Defesa até o fim da cena.", { marcador: "Ativa" }),
        acao("padrao", "Ritual: Esfolar Discente (Sangue 1)", "Explosão de 6 m de raio em alcance médio: 5d4+5 de dano de corte e sangrando em todos ali (Reflexos DT 15 reduz à metade e evita a condição).",
          { rolagens: [dano("Esfolar", "5d4+5 corte")], resistencia: "Reflexos DT 15 reduz à metade e evita sangrando" }),
      ],
    },

    {
      id: "as1.criatura.investido", livro: AS1, pagina: 29,
      nome: "Investido", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Transtornados",
      elementos: [], vd: 80,
      descricao: "Cultista que já participou de rituais e sobreviveu, marcado para sempre: o executor fanático da vontade do culto.",
      percepcao: "2d20+10", iniciativa: "3d20+5",
      defesa: 23, fortitude: "2d20+10", reflexos: "1d20+5", vontade: "2d20+10",
      pv: 90, machucado: 45,
      atributos: [1, 3, 2, 2, 2],
      pericias: [["Atletismo", "3d20+10"], ["Intimidação", "2d20+10"], ["Ocultismo", "2d20+10"]],
      deslocamento: [[9, 6]],
      habilidades: [
        hab("Rituais (DT 20)", "Conjura os rituais abaixo sem pagar PE, até 6 PE por conjuração, com a ação de cada um."),
      ],
      acoes: [
        agredir([at("Cutelo", "corpo a corpo", 2, "4d20+15", "1d6+15 corte", { critico: "x3" })]),
        acao("padrao", "Ritual: Armadura de Sangue Discente (Sangue 1)", "+10 na Defesa e resistência a balístico, corte, impacto e perfuração 5 até o fim da cena.", { marcador: "Ativa" }),
        acao("padrao", "Ritual: Descarnar Discente (Sangue 2)", "Toca um ser: 10d8 de dano (metade corte, metade Sangue) e hemorragia (Fortitude DT 20 reduz à metade e evita a hemorragia). Com hemorragia, no início de cada turno faz Fortitude DT 20: falhando, 4d8 de dano de Sangue; passando, nada, e dois sucessos seguidos estancam.",
          { rolagens: [dano("Descarnar (metade corte, metade Sangue)", "10d8"), dano("Hemorragia", "4d8 Sangue")], resistencia: "Fortitude DT 20 reduz à metade e evita hemorragia" }),
        acao("padrao", "Ritual: Esfolar Discente (Sangue 1)", "Explosão de 6 m de raio em alcance médio: 5d4+5 de dano de corte e sangrando (Reflexos DT 20 reduz à metade e evita a condição).",
          { rolagens: [dano("Esfolar", "5d4+5 corte")], resistencia: "Reflexos DT 20 reduz à metade e evita sangrando" }),
        acao("padrao", "Ritual: Transfusão Vital (Sangue 2)", "Perde até 50 PV e toca um aliado, que recupera a mesma quantidade."),
      ],
    },

    {
      id: "as1.criatura.apostolo-do-sangue", livro: AS1, pagina: 30,
      nome: "Apóstolo do Sangue", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Transtornados",
      elementos: [], vd: 200,
      descricao: "O topo da hierarquia dos Transtornados: sádico, deformado, dizendo falar com o Diabo — e capaz de esmagar ossos com a marreta.",
      percepcao: "3d20+15", iniciativa: "2d20+10", sentidos: ["percepção às cegas"],
      defesa: 30, fortitude: "3d20+15", reflexos: "2d20+10", vontade: "3d20+15",
      pv: 300, machucado: 150,
      atributos: [2, 4, 2, 3, 3],
      pericias: [["Atletismo", "4d20+15"], ["Intimidação", "3d20+15"], ["Ocultismo", "2d20+15"]],
      deslocamento: [[9, 6]],
      habilidades: [
        hab("Marreta Transtornada", "Num acerto crítico com a marreta, quebra um osso: o alvo fica fraco até cuidados prolongados num interlúdio (Fortitude DT 29 evita). Ficando fraco de novo por ela, fica debilitado.",
          { resistencia: "Fortitude DT 29 evita" }),
        hab("Rituais (DT 29)", "Conjura os rituais abaixo sem pagar PE, até 10 PE por conjuração, com a ação de cada um."),
      ],
      acoes: [
        agredir([at("Marreta Sanguinária", "corpo a corpo", 2, "4d20+20", "4d10+30 impacto, perfuração ou Sangue", { critico: "x4", nota: "o tipo do dano é escolhido a cada golpe" })]),
        acao("livre", "Rituais Acelerados", "Uma vez por rodada, ao conjurar ritual de execução completa ou menor, a execução vira livre.", { limite: [1, "rodada"] }),
        acao("padrao", "Ritual: Armadura de Sangue Discente (Sangue 1)", "+10 na Defesa e resistência a balístico, corte, impacto e perfuração 5 até o fim da cena.", { marcador: "Ativa" }),
        acao("padrao", "Ritual: Descarnar Discente (Sangue 2)", "Toca um ser: 10d8 de dano (metade corte, metade Sangue) e hemorragia (Fortitude DT 29 reduz à metade e evita). Com hemorragia, Fortitude DT 29 no início de cada turno: falhando, 4d8 de Sangue; dois sucessos seguidos estancam.",
          { rolagens: [dano("Descarnar (metade corte, metade Sangue)", "10d8"), dano("Hemorragia", "4d8 Sangue")], resistencia: "Fortitude DT 29 reduz à metade e evita hemorragia" }),
        acao("padrao", "Ritual: Esfolar Verdadeiro (Sangue 1)", "Explosão de 6 m de raio em alcance longo: 10d4+10 de dano de corte e sangrando (Reflexos DT 29 reduz à metade e evita a condição).",
          { rolagens: [dano("Esfolar", "10d4+10 corte")], resistencia: "Reflexos DT 29 reduz à metade e evita sangrando" }),
        acao("padrao", "Ritual: Hemofagia Discente (Sangue 2)", "Ataca com a marreta como parte do ritual; acertando, causa também +6d6 de dano de Sangue e recupera PV iguais à metade do dano total.",
          { rolagens: [dano("Hemofagia (extra)", "6d6 Sangue")] }),
        acao("padrao", "Ritual: Transfusão Vital (Sangue 2)", "Perde até 50 PV e toca um aliado, que recupera a mesma quantidade."),
        acao("padrao", "Ritual: Vomitar Pestes Discente (Sangue 3)", "Vomita um enxame Grande (3 m) num ponto adjacente. O enxame passa por outros seres e não os bloqueia; no fim de cada turno dele, 5d12 de dano de Sangue e agarrado em quem estiver no espaço (Reflexos DT 29 reduz à metade e evita a condição). Ação de movimento move o enxame 12 m; um alvo escapa com ação padrão e Acrobacia ou Atletismo DT 29, ou quando o enxame se move.",
          { rolagens: [dano("Enxame", "5d12 Sangue")], resistencia: "Reflexos DT 29 reduz à metade e evita agarrado", marcador: "Enxame em cena" }),
      ],
    },

    {
      id: "as1.criatura.giovanni-opspor", livro: AS1, pagina: 33,
      nome: "Giovanni Opspor", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Transtornados",
      elementos: [], vd: 80,
      descricao: "Empresário sociopata e líder de Transtornados, sempre dois passos à frente: manipula, assassina e espalhou a droga rubra pelo país.",
      percepcao: "3d20+10", iniciativa: "2d20+5",
      defesa: 23, fortitude: "1d20+5", reflexos: "2d20+5", vontade: "3d20+10",
      pv: 70, machucado: 35,
      atributos: [2, 1, 4, 3, 1],
      pericias: [["Crime", "2d20+10"], ["Enganação", "3d20+10"], ["Furtividade", "2d20+10"], ["Ocultismo", "2d20+5"]],
      deslocamento: [[9, 6]],
      notas: ["A biografia está na p. 32 e a ficha na p. 33.", "O ritual Espelho (Sangue e Conhecimento, 2º círculo) aparece só nesta ficha, sem os campos de um ritual de personagem; por isso não entra no catálogo de rituais."],
      habilidades: [
        hab("Rituais (DT 20)", "Conjura os rituais abaixo sem pagar PE, até 6 PE por conjuração, com a ação de cada um."),
      ],
      acoes: [
        agredir([at("Revólver", "curto", 2, "2d20+5", "2d6+10 balístico", { critico: "19" })]),
        agredir([at("Faca", "corpo a corpo", 1, "2d20+5", "1d4+10 perfuração", { critico: "19" })], { nome: "Agredir (faca)" }),
        acao("padrao", "Ritual: Distorcer Aparência (Sangue 1)", "Muda a aparência dele ou de um ser em alcance curto até o fim da cena: +10 em Enganação para disfarce, sem habilidades nem estatísticas da nova forma. Vontade DT 20 resiste ou identifica.",
          { resistencia: "Vontade DT 20 resiste ou identifica" }),
        acao("padrao", "Ritual: Esconder dos Olhos (Conhecimento 2)", "Fica invisível (camuflagem total e +15 em Furtividade) até atacar ou usar uma habilidade hostil.", { marcador: "Invisível" }),
        acao("padrao", "Ritual: Espelho (Sangue e Conhecimento 2)", "Cria uma cópia de carne e sangue de si ou de um ser que já viu, com as mesmas estatísticas; controla a cópia e percebe o que ela percebe, mas fica atordoado enquanto se concentra nela. Se a cópia morrer ou ele sair do atordoamento, o ritual acaba. Identificar a cópia: Intuição, Ocultismo, Percepção ou Vontade DT 20.",
          { marcador: "Cópia ativa" }),
        acao("padrao", "Ritual: Fortalecimento Sensorial Discente (Sangue 1)", "Até o fim da cena, +1d20 em Investigação, Luta, Percepção e Pontaria, e os inimigos sofrem −1d20 nos ataques contra ele.", { marcador: "Ativo" }),
        acao("padrao", "Ritual: Terceiro Olho (Conhecimento 1)", "Enxerga auras paranormais em alcance longo por 1 dia; com ação de movimento, descobre se um ser em alcance médio tem poderes paranormais ou conjura rituais, e de quais elementos.", { marcador: "Ativo" }),
      ],
    },

    {
      id: "as1.criatura.mosto", livro: AS1, pagina: 35,
      nome: "Mosto", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Transtornados",
      elementos: [], vd: 60,
      descricao: "Brutamontes silencioso de rosto desfigurado coberto por um saco de pão: lutador do submundo e guarda-costas fiel de Giovanni.",
      percepcao: "1d20", iniciativa: "2d20+5",
      defesa: 20, fortitude: "3d20+10", reflexos: "1d20+5", vontade: "1d20",
      pv: 100, machucado: 50,
      atributos: [1, 4, 1, 1, 3],
      pericias: [["Atletismo", "4d20+10"]],
      deslocamento: [[9, 6]],
      notas: ["A biografia está na p. 34 e a ficha na p. 35."],
      estados: [{ id: "furioso", nome: "Furioso (rosto exposto)", maximo: 1 }],
      habilidades: [
        hab("Rosto Desfigurado", "Se tirarem o saco do rosto dele, fica furioso: +1d8 nas rolagens de dano e pode usar Trocação Justa.",
          { rolagens: [dano("Fúria (dano extra)", "1d8")] }),
      ],
      acoes: [
        agredir([at("Cutelo", "corpo a corpo", 1, "4d20+10", "1d6+10 corte", { critico: "19/x3" })]),
        agredir([at("Desarmado", "corpo a corpo", 1, "4d20+10", "1d4+10 impacto")], { nome: "Agredir (desarmado)" }),
        acao("completa", "Surra Brutal", "Um ataque com o cutelo e outro desarmado; abre a guarda e sofre −5 na Defesa até o próximo turno.",
          { ataques: [at("Cutelo", "corpo a corpo", 1, "4d20+10", "1d6+10 corte", { critico: "19/x3" }), at("Desarmado", "corpo a corpo", 1, "4d20+10", "1d4+10 impacto")] }),
        acao("completa", "Trocação Justa", "Salta sobre um inimigo. O alvo escolhe: partir para a trocação (os dois rolam dano alternadamente, sem bloqueio, até um cair ou desistir) ou se defender com Fortitude DT 20 (passando, 1d6+10 de dano; falhando, 1d6+1d4+20 — esses podem ser bloqueados).",
          { requer: ["furioso", 1], rolagens: [dano("Defendeu-se e passou", "1d6+10"), dano("Defendeu-se e falhou", "1d6+1d4+20")], resistencia: "Fortitude DT 20 (na defesa)" }),
      ],
    },

    {
      id: "as1.criatura.tarrafa", livro: AS1, pagina: 37,
      nome: "Tarrafa", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Transtornados",
      elementos: [], vd: 60,
      descricao: "Pescador que vendeu a alma por uma rede cheia e virou Transtornado: sente prazer na dor e engole metal.",
      percepcao: "1d20+5", iniciativa: "3d20+10",
      defesa: 21, fortitude: "2d20+5", reflexos: "3d20+10", vontade: "1d20",
      pv: 80, machucado: 40,
      atributos: [3, 2, 1, 1, 2],
      pericias: [["Acrobacia", "3d20+10"], ["Atletismo", "2d20+10"]],
      deslocamento: [[9, 6]],
      notas: ["A biografia está na p. 36 e a ficha na p. 37."],
      estados: [{ id: "ingeridos", nome: "Itens de metal ingeridos", maximo: 3 }],
      habilidades: [
        hab("Perfuração Permanente", "Acertando o arremesso do arpão, o alvo fica lento e precisa de uma ação padrão e Atletismo ou Luta (DT 20) para tirar o arpão."),
        hab("Prazer na Dor", "Machucado, tem resistência a dano 5."),
      ],
      acoes: [
        agredir([at("Arpão do Pescador", "curto", 1, "3d20+10", ["1d6+10 perfuração", "1d6 Sangue"], { critico: "x3" })]),
        agredir([at("Faca", "corpo a corpo", 2, "3d20+10", "1d4+10 perfuração", { critico: "19" })], { nome: "Agredir (faca)" }),
        acao("padrao", "Engolir Metal", "Engole um objeto de metal Pequeno ou menor: perde 1d6 PV e recebe +2 em testes baseados em Força e Agilidade. Cumulativo, até três itens ingeridos (costuma esconder a faca assim).",
          { rolagens: [soma("PV perdidos", "1d6")] }),
      ],
    },

    {
      id: "as1.criatura.carrara", livro: AS1, pagina: 38,
      nome: "Carrara", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Transtornados",
      elementos: [], vd: 60,
      descricao: "Transtornado de meia-idade com pregos cravados no crânio e nos braços, de onde o sangue não para de escorrer.",
      percepcao: "2d20+5", iniciativa: "2d20+10",
      defesa: 18, fortitude: "1d20", reflexos: "2d20+10", vontade: "2d20+5",
      pv: 70, machucado: 35,
      atributos: [2, 1, 2, 2, 1],
      pericias: [["Atletismo", "1d20+10"], ["Enganação", "2d20+10"]],
      deslocamento: [[9, 6]],
      habilidades: [
        hab("Sangue Maldito", "Munição banhada no sangue dele causa +1d6 de dano de Sangue, uma única vez.",
          { rolagens: [dano("Munição banhada", "1d6 Sangue")] }),
      ],
      acoes: [
        agredir([at("Soco com Pregos", "corpo a corpo", 2, "1d20+10", "1d4+10 impacto")]),
        agredir([at("Pregador Pneumático", "curto", 2, "2d20+10", ["3d4+10 perfuração", "1d6 Sangue"], { critico: "x4" })], { nome: "Agredir (pregador)" }),
        acao("completa", "Pregos de Sangue", "Arranca pregos do corpo e recarrega o pregador com eles, aproveitando Sangue Maldito."),
      ],
    },

    {
      id: "as1.criatura.nando-salles", livro: AS1, pagina: 39,
      nome: "Nando Salles", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Transtornados",
      elementos: [], vd: 20,
      descricao: "Influenciador de finanças e apostador de lutas ilegais, sacrifício da equipe dos Transtornados no Hexatombe: cínico e imprudente.",
      percepcao: "2d20+5", iniciativa: "2d20+5",
      defesa: 16, fortitude: "2d20+5", reflexos: "2d20+5", vontade: "2d20+5",
      pv: 35, machucado: 17,
      atributos: [2, 1, 2, 2, 2],
      pericias: [["Enganação", "2d20+5"]],
      deslocamento: [[9, 6]],
      acoes: [
        agredir([at("Pistola", "curto", 1, "2d20+5", "1d12+5 balístico", { critico: "18" })]),
        acao("completa", "Arrogância Diabólica", "Diz a uma pessoa em alcance longo que ela pode tudo, “basta ter o mindset certo”: Vontade DT 25. Falhando, ela faz algo extremamente imprudente no próximo turno; se recusar, sofre 2d6 de dano mental que não pode ser evitado, reduzido nem resistido.",
          { rolagens: [dano("Recusou (mental)", "2d6 mental")], resistencia: "Vontade DT 25 evita" }),
      ],
    },

    {
      id: "as1.criatura.cleo-brisa", livro: AS1, pagina: 69,
      nome: "Cleo Brisa", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Hexatombe",
      elementos: [], vd: 60,
      descricao: "Investigadora da Polícia Civil de Inquisidor do Vale arrastada para o Hexatombe no lugar de um cultista; sobreviveu fugindo, até virar cobaia dos Vampiros.",
      percepcao: "2d20+5", iniciativa: "2d20+10",
      defesa: 20, fortitude: "2d20+5", reflexos: "2d20+5", vontade: "2d20+10",
      pv: 80, machucado: 40,
      atributos: [2, 2, 2, 2, 2],
      pericias: [["Atletismo", "2d20+5"], ["Crime", "2d20+5"], ["Intuição", "2d20+10"], ["Investigação", "2d20+10"], ["Tática", "2d20+5"]],
      deslocamento: [[9, 6]],
      notas: ["A biografia está nas p. 68–69. O texto de Empurrar e Atirar escreve “Cloe”; é a mesma Cleo."],
      acoes: [
        agredir([at("Pistola", "curto", 2, "2d20+10", "1d12+10 balístico", { critico: "18" })]),
        agredir([at("Pé de Cabra", "corpo a corpo", 2, "2d20+10", "1d8+10 impacto")], { nome: "Agredir (pé de cabra)" }),
        acao("completa", "Empurrar e Atirar", "Empurra um alvo 3 m com o pé de cabra (Fortitude DT 20 evita) e atira com a pistola; se o empurrão deu certo, +1d20 no ataque e, acertando, +1d12 de dano.",
          { rolagens: [dano("Dano extra (se empurrou)", "1d12")], resistencia: "Fortitude DT 20 evita o empurrão",
            ataques: [at("Pistola", "curto", 1, "2d20+10", "1d12+10 balístico", { critico: "18" }), at("Pistola (alvo empurrado)", "curto", 1, "3d20+10", ["1d12+10 balístico", "1d12 balístico"], { critico: "18" })] }),
      ],
    },

    {
      id: "as1.criatura.cristino", livro: AS1, pagina: 71,
      nome: "Cristino", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Hexatombe",
      elementos: [], vd: 180,
      descricao: "Cangaceiro enigmático que chegou a pé à Coroa de Espinhos para cumprir a promessa do irmão: caçador metódico e implacável.",
      percepcao: "2d20+5", iniciativa: "2d20+15",
      defesa: 36, fortitude: "3d20+15", reflexos: "3d20+15", vontade: "2d20+10",
      pv: 240, machucado: 120,
      atributos: [3, 3, 2, 2, 3],
      pericias: [["Atletismo", "3d20+15"], ["Furtividade", "3d20+15"], ["Medicina", "2d20+15"], ["Sobrevivência", "2d20+15"]],
      deslocamento: [[9, 6]],
      notas: ["A biografia está na p. 70 e a ficha na p. 71.", "A coronha da espingarda causa dano de perfuração, como impresso."],
      habilidades: [
        hab("Combinação Cruel", "Em vez do normal, pode fazer dois ataques por rodada combinando tipos de ataque diferentes (um disparo e um golpe de coronha, por exemplo)."),
      ],
      acoes: [
        agredir([at("Peixeira", "corpo a corpo", 2, "3d20+20", "3d8+30 corte", { critico: "19" })]),
        agredir([at("Coronha da Espingarda", "corpo a corpo", 2, "3d20+20", "3d6+30 perfuração", { critico: "x3" })], { nome: "Agredir (coronha)" }),
        agredir([at("Espingarda", "curto", 2, "3d20+20", "4d6+30 balístico", { critico: "x3" })], { nome: "Agredir (espingarda)" }),
        acao("padrao", "Luzernas", "Posiciona uma lamparina que ilumina em alcance curto: quem estiver iluminado é percebido por ele, a qualquer distância. Atirando na lamparina, ela explode: 6d6 de dano de fogo e em chamas em quem estiver em alcance curto dela (Reflexos DT 28 reduz à metade e evita a condição).",
          { rolagens: [dano("Explosão", "6d6 fogo")], resistencia: "Reflexos DT 28 reduz à metade e evita em chamas", marcador: "Lamparina posicionada" }),
        acao("completa", "Emboscada do Cangaço", "Escondido, espera os inimigos (Percepção DT 30). Se ninguém passar, dispara duas vezes a espingarda e salta com um golpe de coronha — três ataques na mesma ação; os alvos ficam desprevenidos (−5 na Defesa e −1d20 em Reflexos) e não podem usar reações.",
          { ataques: [at("Espingarda", "curto", 2, "3d20+20", "4d6+30 balístico", { critico: "x3" }), at("Coronha da Espingarda", "corpo a corpo", 1, "3d20+20", "3d6+30 perfuração", { critico: "x3" })] }),
      ],
    },

    /* Agatha não tem ficha de ameaça: o suplemento a apresenta como aliada,
       pelas regras de aliados do livro básico (OPRPG p. 170). */
    {
      id: "as1.criatura.agatha-volkomenn", livro: AS1, pagina: 19, aliada: true,
      nome: "Agatha Volkomenn (aliada)", natureza: "humana", tipo: "Aliada", tamanho: null, categoria: "Aliados",
      nivel: "Aliada (OPRPG p. 170)",
      elementos: [], vd: null,
      descricao: "Ocultista e maledictóloga: passa missões, identifica itens, ajuda com mistérios, conjura rituais aos quais os agentes não têm acesso — e, se o mestre quiser, acompanha o grupo como aliada.",
      notas: [
        "Não é ficha de ameaça: são os benefícios de Agatha como aliada (OPRPG p. 170). Sem estatísticas de combate no livro.",
        "Os benefícios valem para o personagem acompanhado por ela, à escolha da mesa.",
      ],
      habilidades: [
        hab("Bônus", "Você é considerado treinado em Ocultismo; se já for, recebe +1d20 nessa perícia."),
        hab("Maledictóloga Ocultista", "Ao identificar item amaldiçoado ou ritual, 1 PE dá +1d10 no teste; identificar item amaldiçoado como ação completa dá só −1d20. Ao conjurar um ritual, 1 PE aumenta a DT dele em +2.",
          { custo: "1 PE", rolagens: [soma("Identificação (+1d10)", "1d10")] }),
        hab("Ferida pelo Medo", "No início de cada cena, role 1d4: com 1, ela sangra e sente dor, e não pode atuar como aliada até o fim da cena. O mestre pode pedir a rolagem também quando ela faz um feito extremo, como combater ou conjurar um ritual poderoso.",
          { rolagens: [soma("Ferida (1 = fora da cena)", "1d4")], marcador: "Fora de ação nesta cena" }),
      ],
      acoes: [],
    },

    /* ---------------- AS2 · Arquivos Secretos 2 (v1.0) ---------------- */

    /* Ameaças do Hexatombe (p. 26–32). O suplemento também cita o
       Quibungo (SAH p. 142) e os zumbis de Sangue (OPRPG p. 202–203),
       que já estão no catálogo. */
    {
      id: "as2.criatura.arara-vermelha", livro: AS2, pagina: 26,
      nome: "Arara-vermelha", natureza: "animal", tipo: "Animal", tamanho: "Pequeno", categoria: "Ameaças do Hexatombe",
      elementos: [], vd: 10,
      descricao: "A grande arara de plumagem vermelha, amarela e azul da região do Hexatombe — ainda sem a corrupção do Sangue.",
      percepcao: "2d20+5", iniciativa: "2d20+5",
      defesa: 12, fortitude: "1d20", reflexos: "2d20+5", vontade: "2d20",
      pv: 8, machucado: 4,
      atributos: [2, 1, 0, 2, 1],
      deslocamento: [[3, 2], [9, 6, "voo"]],
      habilidades: [
        hab("E do Nada", "Na primeira rodada de combate, quem age depois dela na iniciativa fica desprevenido contra ela."),
      ],
      acoes: [
        agredir([
          at("Bicada", "corpo a corpo", 1, "2d20+5", "1d6+2 perfuração"),
          at("Arranhão", "corpo a corpo", 2, "2d20+5", "1d4+2 corte"),
        ]),
      ],
    },

    {
      id: "as2.criatura.arara-devorada", livro: AS2, pagina: 27,
      nome: "Arara-devorada", natureza: "paranormal", tipo: "Criatura", tamanho: "Médio", categoria: "Ameaças do Hexatombe",
      elementos: [SA], vd: 80,
      descricao: "A arara-vermelha tomada pelo Sangue: maior, com garras nas asas, presas no bico e ossos rompendo a pele.",
      presenca: { dt: 20, dano: "3d8", imune: "NEX 40%" },
      percepcao: "2d20+5", iniciativa: "3d20+10",
      defesa: 21, fortitude: "2d20+5", reflexos: "3d20+10", vontade: "2d20",
      pv: 120, machucado: 60,
      resistencias: [[5, "balístico", "impacto", "perfuração"], [10, "Sangue"]],
      vulnerabilidades: ["Morte"],
      atributos: [3, 2, 0, 2, 2],
      deslocamento: [[9, 6], [12, 8, "voo"]],
      habilidades: [
        hab("E do Nada", "Na primeira rodada de combate, quem age depois dela na iniciativa fica desprevenido contra ela."),
      ],
      acoes: [
        agredir([
          at("Bicada", "corpo a corpo", 1, "3d20+5", ["1d8+5 perfuração", "1d8 Sangue"]),
          at("Garras", "corpo a corpo", 2, "3d20+5", "1d6+5 corte"),
        ]),
        acao("livre", "Agarrão", "Acertando um ataque de garras, usa os braços extras para agarrar a vítima.",
          { rolagens: [teste("Agarrar", "3d20+7")] }),
        acao("completa", "Penas Afiadas", "Grita e dispara as penas em todos os seres num raio de 9 m (Reflexos DT 20 evita). Cada atingido rola 1d6 para a cor: 1–2 vermelha (sangrando); 3–4 azul (lento até recuperar qualquer quantidade de PV); 5–6 amarela (fraco até o fim da cena ou até um efeito que remova veneno).",
          { rolagens: [soma("Cor da pena (1d6)", "1d6")], resistencia: "Reflexos DT 20 evita" }),
      ],
    },

    {
      id: "as2.criatura.arara-infernal", livro: AS2, pagina: 28,
      nome: "Arara-infernal", natureza: "paranormal", tipo: "Criatura", tamanho: "Grande", categoria: "Ameaças do Hexatombe",
      elementos: [SA], vd: 120,
      descricao: "O estágio final da arara corrompida: quatro garras, braços extras e uma bocarra no abdome que mastiga e engole.",
      presenca: { dt: 23, dano: "4d6", imune: "NEX 50%" },
      percepcao: "2d20+5", iniciativa: "4d20+10",
      defesa: 26, fortitude: "3d20+10", reflexos: "4d20+10", vontade: "2d20+5",
      pv: 220, machucado: 110,
      resistencias: [[10, "balístico", "impacto", "perfuração"], [20, "Sangue"]],
      vulnerabilidades: ["Morte"],
      atributos: [4, 2, 0, 2, 3],
      deslocamento: [[12, 8], [15, 10, "voo"]],
      habilidades: [
        hab("E do Nada", "Na primeira rodada de combate, quem age depois dela na iniciativa fica desprevenido contra ela."),
      ],
      acoes: [
        agredir([
          at("Bicada", "corpo a corpo", 1, "4d20+10", ["1d10+10 perfuração", "1d10 Sangue"]),
          at("Garras", "corpo a corpo", 4, "4d20+10", "1d8+10 corte"),
        ]),
        acao("livre", "Agarrão", "Acertando um ataque de garras, usa os braços extras para agarrar a vítima.",
          { rolagens: [teste("Agarrar", "4d20+12")] }),
        acao("movimento", "Mastigar", "Mastiga um ser que está agarrando: 6d10 de dano de Sangue (Fortitude DT 23 reduz à metade). Quem fica morrendo por isso é engolido, e a arara recupera 2d10 PV.",
          { rolagens: [dano("Mastigar", "6d10 Sangue"), soma("PV recuperados", "2d10")], resistencia: "Fortitude DT 23 reduz à metade" }),
        acao("completa", "Penas Afiadas", "Grita e dispara as penas em todos os seres num raio de 9 m (Reflexos DT 23 evita). Cada atingido perde 2d6 PV e rola 1d6 para a cor: 1–2 vermelha (sangrando); 3–4 azul (lento até recuperar qualquer quantidade de PV); 5–6 amarela (fraco até o fim da cena ou até um efeito que remova veneno).",
          { rolagens: [soma("Cor da pena (1d6)", "1d6"), soma("PV perdidos", "2d6")], resistencia: "Reflexos DT 23 evita" }),
      ],
    },

    {
      id: "as2.criatura.jaguatirica", livro: AS2, pagina: 30,
      nome: "Jaguatirica", natureza: "animal", tipo: "Animal", tamanho: "Pequeno", categoria: "Ameaças do Hexatombe",
      elementos: [], vd: 10,
      descricao: "Felino esguio do tamanho de um gato doméstico, de pelagem manchada e olhos âmbar — antes da corrupção do Sangue.",
      percepcao: "1d20+5", iniciativa: "2d20+5",
      defesa: 13, fortitude: "1d20", reflexos: "2d20+5", vontade: "1d20",
      pv: 16, machucado: 8,
      atributos: [2, 1, 0, 1, 1],
      deslocamento: [[12, 8]],
      acoes: [
        agredir([
          at("Mordida", "corpo a corpo", 1, "2d20+5", "1d6+2 corte"),
          at("Arranhar", "corpo a corpo", 2, "2d20+5", "1d4+2 corte"),
        ]),
        acao("movimento", "Pulo do Gato", "Salta na direção de um alvo em alcance curto; agredindo com mordida ou arranhar no mesmo turno, causa +1d4 de dano. Contra alvo desprevenido, pode ser ação livre uma vez por rodada.",
          { rolagens: [dano("Pulo (dano adicional)", "1d4")] }),
      ],
    },

    {
      id: "as2.criatura.felino-devorado", livro: AS2, pagina: 31,
      nome: "Felino-devorado", natureza: "paranormal", tipo: "Criatura", tamanho: "Médio", categoria: "Ameaças do Hexatombe",
      elementos: [SA], vd: 80,
      descricao: "A jaguatirica tomada pelo Sangue: músculos inchados de veias expostas, cauda com um osso pontiagudo e duas bocas dentadas no lugar da face.",
      presenca: { dt: 20, dano: "3d8", imune: "NEX 40%" },
      percepcao: "2d20+10", iniciativa: "3d20+10",
      defesa: 23, fortitude: "2d20+5", reflexos: "3d20+10", vontade: "2d20",
      pv: 140, machucado: 70,
      resistencias: [[5, "balístico", "impacto", "perfuração"], [10, "Sangue"]],
      vulnerabilidades: ["Morte"],
      atributos: [3, 2, 0, 2, 2],
      deslocamento: [[12, 8]],
      habilidades: [
        hab("Camuflagem Perversa", "Está sempre com camuflagem leve, e testes para percebê-lo ou seguir seus rastros sofrem −1d20. Uma vez por cena, quando sofre um acerto crítico, ignora os efeitos do crítico e o trata como acerto comum.",
          { limite: [1, "cena"] }),
      ],
      acoes: [
        agredir([
          at("Mordidas", "corpo a corpo", 2, "3d20+10", ["1d8+5 corte", "1d8 Sangue"]),
          at("Garras", "corpo a corpo", 2, "3d20+10", "1d6+5 corte"),
        ]),
        acao("movimento", "Pulo do Felino", "Salta na direção de um alvo em alcance curto; agredindo com mordidas ou garras no mesmo turno, causa +1d8 de dano. Contra alvo desprevenido, pode ser ação livre uma vez por rodada.",
          { rolagens: [dano("Pulo (dano adicional)", "1d8")] }),
        acao("padrao", "Chicotada Perfurante", "A cauda perfura e puxa um ser em alcance curto: 4d8 de dano de Sangue, caído e movido para um espaço livre em alcance curto à escolha do felino (Reflexos DT 20 reduz o dano à metade e evita condição e movimento).",
          { rolagens: [dano("Chicotada", "4d8 Sangue")], resistencia: "Reflexos DT 20 reduz à metade e evita condição e movimento" }),
      ],
    },

    {
      id: "as2.criatura.felino-infernal", livro: AS2, pagina: 32,
      nome: "Felino-infernal", natureza: "paranormal", tipo: "Criatura", tamanho: "Grande", categoria: "Ameaças do Hexatombe",
      elementos: [SA], vd: 120,
      descricao: "A forma mais terrível do felino-devorado: maior, de cauda mais longa, com as bocas abertas como uma flor de ossos.",
      presenca: { dt: 23, dano: "4d6", imune: "NEX 50%" },
      percepcao: "2d20+10", iniciativa: "4d20+10",
      defesa: 28, fortitude: "3d20+10", reflexos: "4d20+10", vontade: "2d20+5",
      pv: 230, machucado: 125,
      resistencias: [[10, "balístico", "impacto", "perfuração"], [20, "Sangue"]],
      vulnerabilidades: ["Morte"],
      atributos: [4, 2, 0, 2, 3],
      deslocamento: [[12, 8]],
      notas: [
        "O quadro de estatísticas saiu com o título “Arara-infernal”, um erro de diagramação: os números são do felino-infernal.",
        "Machucado impresso como 125 com 230 PV (não é a metade); mantido como publicado.",
        "Boca da Loucura cita o “felino-infernal supremo”; é o próprio felino-infernal.",
      ],
      habilidades: [
        hab("Camuflagem Perversa", "Está sempre com camuflagem leve, e testes para percebê-lo ou seguir seus rastros sofrem −2d20. Uma vez por cena, quando sofre um acerto crítico, ignora os efeitos do crítico e o trata como acerto comum.",
          { limite: [1, "cena"] }),
      ],
      acoes: [
        agredir([
          at("Mordidas", "corpo a corpo", 2, "4d20+10", ["2d8+5 corte", "2d8 Sangue"]),
          at("Garras", "corpo a corpo", 2, "4d20+10", "2d6+5 corte"),
        ]),
        acao("movimento", "Pulo do Felino", "Salta na direção de um alvo em alcance curto; agredindo com mordidas ou garras no mesmo turno, causa +2d8 de dano. Contra alvo desprevenido, pode ser ação livre uma vez por rodada.",
          { rolagens: [dano("Pulo (dano adicional)", "2d8")] }),
        acao("padrao", "Boca da Loucura", "Tenta envolver a cabeça de um ser adjacente (Reflexos DT 23). Falhando, o alvo fica agarrado e sofre 4d6 de dano de Sangue e 4d6 de dano mental — e de novo no início de cada turno do felino enquanto continuar agarrado. Soltar-se: uma ação e Acrobacia, Atletismo ou Luta DT 23. Enquanto agarra, o felino não usa as mordidas.",
          { rolagens: [dano("Boca da Loucura", ["4d6 Sangue", "4d6 mental"])], resistencia: "Reflexos DT 23 evita", marcador: "Agarrando com a boca" }),
        acao("padrao", "Chicotada Perfurante", "A cauda perfura e puxa um ser em alcance curto: 6d8 de dano de Sangue, caído, sangrando e movido para um espaço livre em alcance curto à escolha do felino (Reflexos DT 23 reduz o dano à metade e evita condições e movimento).",
          { rolagens: [dano("Chicotada", "6d8 Sangue")], resistencia: "Reflexos DT 23 reduz à metade e evita condições e movimento" }),
      ],
    },

    /* Os Mascarados (p. 34–67): os corpos dos assassinos em série, cada
       um com a forma tomada pela intenção assassina. A forma é a MESMA
       ocorrência (o seletor de forma do painel), nunca outra criatura. */
    {
      id: "as2.criatura.jonas-aguiar", livro: AS2, pagina: 39,
      nome: "Jonas Aguiar", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Mascarados",
      elementos: [], vd: 80,
      descricao: "Patrulheiro criado por um casal de assassinos que o ensinou a separar “dignos” de “indignos”: o serial killer chamado Mutilador Noturno.",
      percepcao: "1d20+5", iniciativa: "2d20+5",
      defesa: 21, fortitude: "2d20+5", reflexos: "2d20+5", vontade: "1d20+5",
      pv: 120, machucado: 60,
      atributos: [2, 3, 1, 2, 2],
      pericias: [["Adestramento", "2d20+5"], ["Atletismo", "3d20+10"], ["Crime", "2d20+5"], ["Enganação", "2d20+5"], ["Furtividade", "2d20+5"],
        ["Investigação", "1d20+5"], ["Pilotagem", "2d20+5"], ["Sobrevivência", "1d20+5"]],
      deslocamento: [[9, 6]],
      estados: [{ id: "ferimentos", nome: "Ferimentos de 5+ de dano", maximo: 3 }, { id: "adormecida", nome: "Intenção adormecida (até dormir)", maximo: 1 }],
      notas: [
        "Biografia nas p. 36–38; a forma Mutilador Noturno está na p. 40 e o perfil como aliado na p. 41.",
        "As fichas do suplemento são as de mesa: as da transmissão tinham mais dano e menos PV (p. 38).",
        "O poder de Intenção (Filho da Dor, p. 95) usa outra reação para desligar a RD; a ficha não fala disso.",
      ],
      acoes: [
        agredir([at("Machado", "corpo a corpo", 2, "3d20+10", ["1d8+10 corte", "1d8 Sangue"], { critico: "x3", multiplicaTudo: true, nota: "o dano de Sangue também multiplica no crítico; o alvo fica sangrando" })]),
        agredir([at("Revólver", "curto", 2, "2d20+10", "2d6+10 balístico", { critico: "19/x3" })], { nome: "Agredir (revólver)" }),
        acao("reacao", "Revidar", "Uma vez por rodada, quando um ataque contra ele erra, faz um ataque corpo a corpo contra o atacante.", { limite: [1, "rodada"] }),
        acao("livre", "Golpe Cruel", "Uma vez por rodada, ao atacar, recebe +5 no teste de ataque e na rolagem de dano.", { limite: [1, "rodada"] }),
        acao("padrao", "Predador de Sangue", "Memoriza o odor de uma vítima (precisa de uma fonte, como um retalho da roupa): +1d20 para rastreá-la, percebê-la e atacá-la. Uma vítima por vez.", { marcador: "Vítima memorizada" }),
        acao("reacao", "Filho da Dor (poder de Intenção)", "Depois de ser ferido três vezes (cada ferimento com pelo menos 5 de dano), ativa resistência a dano 25; enquanto ela durar, perde 5 PV no início de cada turno.",
          { requer: ["ferimentos", 3], marcador: "RD 25 ativa" }),
        acao("padrao", "Intenção Assassina", "Desperta a intenção assassina e vira o Mutilador Noturno — use o seletor de forma desta ocorrência."),
      ],
      formas: [{
        id: "mutilador-noturno", nome: "Mutilador Noturno", pagina: 40, vd: 140,
        percepcao: "1d20+10", iniciativa: "2d20+10", defesa: 29, fortitude: "2d20+10", reflexos: "2d20+10", vontade: "1d20+10",
        pv: 260, machucado: 130,
        ativacao: "Intenção Assassina (ação padrão). Sem limite de duração; se não matar uma pessoa até o fim da cena, a intenção adormece e só volta depois de dormir (p. 41).",
        pericias: [["Adestramento", "2d20+10"], ["Atletismo", "3d20+15"], ["Crime", "2d20+10"], ["Enganação", "2d20+10"], ["Furtividade", "2d20+10"],
          ["Investigação", "1d20+10"], ["Pilotagem", "2d20+10"], ["Sobrevivência", "1d20+10"]],
        habilidades: [hab("Predador Perfeito", "Faz uma ação padrão adicional por rodada.")],
        acoes: [
          agredir([at("Machado", "corpo a corpo", 2, "3d20+15", ["1d8+20 corte", "2d8 Sangue"], { critico: "x3", multiplicaTudo: true, nota: "o dano de Sangue também multiplica no crítico; o alvo fica sangrando" })]),
          agredir([at("Revólver", "curto", 2, "2d20+15", "3d6+20 balístico", { critico: "19/x3" })], { nome: "Agredir (revólver)" }),
          acao("reacao", "Revidar Violento", "Duas vezes por rodada, quando um ataque corpo a corpo contra ele erra, faz um ataque corpo a corpo contra o atacante.", { limite: [2, "rodada"] }),
          acao("livre", "Golpe Mutilador", "Uma vez por rodada, ao atacar, recebe +5 no teste de ataque e +10 na rolagem de dano.", { limite: [1, "rodada"] }),
          acao("padrao", "Predador Sanguinário", "Memoriza o odor de uma vítima (precisa de uma fonte): +1d20 para rastreá-la, percebê-la e atacá-la. Uma vítima por vez.", { marcador: "Vítima memorizada" }),
          acao("reacao", "Filho da Dor (poder de Intenção)", "Depois de ser ferido três vezes (cada ferimento com pelo menos 5 de dano), ativa resistência a dano 25; enquanto ela durar, perde 5 PV no início de cada turno.",
            { requer: ["ferimentos", 3], marcador: "RD 25 ativa" }),
          acao("padrao", "Intenção Assassina", "Adormece a intenção: volta a ser Jonas (seletor de forma) e não a desperta de novo até dormir."),
        ],
      }],
    },

    {
      id: "as2.criatura.dalmo-magno", livro: AS2, pagina: 45,
      nome: "Dalmo Magno", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Mascarados",
      elementos: [], vd: 80,
      descricao: "Motorista de ônibus que virou lutador de arena clandestina para pagar o tratamento da filha — e, na jaula, o Colosso.",
      percepcao: "1d20+5", iniciativa: "1d20+5",
      defesa: 23, fortitude: "3d20+10", reflexos: "1d20+5", vontade: "1d20+5",
      pv: 140, machucado: 70,
      atributos: [1, 4, 1, 1, 3],
      pericias: [["Atletismo", "4d20+10"], ["Intimidação", "1d20+10"], ["Pilotagem", "1d20+10"]],
      deslocamento: [[9, 6]],
      estados: [{ id: "adormecida", nome: "Intenção adormecida (até dormir)", maximo: 1 }],
      notas: [
        "Biografia nas p. 42–44; a forma Colosso está na p. 46 e o perfil como aliado na p. 47.",
        "A ficha de Dalmo não traz poder de Intenção.",
      ],
      habilidades: [
        hab("Lutador de Arena", "+5 em testes de manobras de combate, inclusive para resistir a elas."),
      ],
      acoes: [
        agredir([at("Pancada", "corpo a corpo", 2, "4d20+10", ["2d6+10 impacto", "1d10 Energia"])]),
        acao("reacao", "Corpo Fechado", "Uma vez por rodada, ao sofrer dano, levanta a guarda: resistência a dano 10 contra esse dano.", { limite: [1, "rodada"] }),
        acao("reacao", "Pressão Atmosférica", "Uma vez por rodada, ao acertar um ataque corpo a corpo num alvo agarrado: +1d10 de dano de Energia e atordoado por uma rodada (Fortitude DT 20 evita a condição). Cada ser só pode ser atordoado assim uma vez por cena.",
          { limite: [1, "rodada"], rolagens: [dano("Pressão (adicional)", "1d10 Energia")], resistencia: "Fortitude DT 20 evita atordoado" }),
        acao("livre", "Golpes de Arena", "Uma vez por rodada, ao acertar um ataque corpo a corpo, faz uma pancada adicional ou uma manobra de combate contra o mesmo alvo.", { limite: [1, "rodada"] }),
        acao("padrao", "Intenção Assassina", "Desperta a intenção assassina e vira o Colosso — use o seletor de forma desta ocorrência."),
      ],
      formas: [{
        id: "colosso", nome: "Colosso", pagina: 46, vd: 140,
        percepcao: "1d20+10", iniciativa: "1d20+10", defesa: 31, fortitude: "3d20+15", reflexos: "1d20+10", vontade: "1d20+10",
        pv: 280, machucado: 140,
        ativacao: "Intenção Assassina (ação padrão). Sem limite de duração; se não matar uma pessoa até o fim da cena, a intenção adormece e só volta depois de dormir (p. 47).",
        pericias: [["Atletismo", "4d20+15"], ["Intimidação", "1d20+15"], ["Pilotagem", "1d20+15"]],
        notas: ["A Pancada do Colosso não tem a parte de Energia da ficha de Dalmo; mantido como publicado."],
        habilidades: [hab("Campeão de Arena", "+10 em testes de manobras de combate, inclusive para resistir a elas.")],
        acoes: [
          agredir([at("Pancada", "corpo a corpo", 2, "4d20+15", "4d6+20 impacto")]),
          acao("reacao", "Campo de Pressão", "Uma vez por rodada, ao sofrer dano, levanta a guarda: resistência a dano 15 contra esse dano.", { limite: [1, "rodada"] }),
          acao("reacao", "Implosão Atmosférica", "Uma vez por rodada, ao acertar um ataque corpo a corpo num alvo agarrado: +1d10 de dano de Energia; o alvo fica atordoado por uma rodada (Fortitude DT 24 evita), caído e sangrando. Cada ser só pode ser atordoado assim uma vez por cena.",
            { limite: [1, "rodada"], rolagens: [dano("Implosão (adicional)", "1d10 Energia")], resistencia: "Fortitude DT 24 evita atordoado" }),
          acao("livre", "Golpes de Jaula", "Uma vez por rodada, ao acertar um ataque corpo a corpo, faz uma pancada adicional ou uma manobra de combate contra o mesmo alvo; acertando essa segunda, causa também 1d10 de dano de impacto.",
            { limite: [1, "rodada"], rolagens: [dano("Golpe de jaula (adicional)", "1d10 impacto")] }),
          acao("padrao", "Intenção Assassina", "Adormece a intenção: volta a ser Dalmo (seletor de forma) e não a desperta de novo até dormir."),
        ],
      }],
    },

    {
      id: "as2.criatura.jae-yoon", livro: AS2, pagina: 51,
      nome: "Park Jae-Yoon", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Mascarados",
      elementos: [], vd: 80,
      descricao: "Filha de um empresário de hotéis, criada entre regras e silêncios; vive como influenciadora — e, nas sombras, como X, a assassina que marca as vítimas com um “X”.",
      percepcao: "1d20+5", iniciativa: "3d20+10",
      defesa: 22, fortitude: "1d20+5", reflexos: "3d20+10", vontade: "1d20+5",
      pv: 100, machucado: 50,
      atributos: [3, 2, 3, 1, 1],
      pericias: [["Acrobacia", "3d20+5"], ["Atletismo", "2d20+5"], ["Crime", "3d20+10"], ["Enganação", "1d20+10"], ["Furtividade", "3d20+10"],
        ["Investigação", "3d20+10"], ["Tecnologia", "3d20+5"]],
      deslocamento: [[9, 6]],
      estados: [{ id: "areas", nome: "Áreas “X” marcadas", maximo: 3 }, { id: "adormecida", nome: "Intenção adormecida (até dormir)", maximo: 1 }],
      notas: [
        "Biografia nas p. 48–50; a forma X está na p. 52 e o perfil como aliada na p. 53.",
        "Na ficha, o poder de Intenção (O Sabor do Silêncio) é uma reação; o texto do poder (p. 95) pede uma ação padrão.",
      ],
      acoes: [
        agredir([at("Punhal", "corpo a corpo", 2, "3d20+10", ["2d4+10 perfuração", "1d6 Conhecimento"], { critico: "19/x2" })]),
        acao("reacao", "Esquiva Tática", "Uma vez por rodada, ao sofrer um ataque, esquiva: +10 na Defesa contra ele.", { limite: [1, "rodada"] }),
        acao("reacao", "Perito", "Uma vez por rodada, num teste de perícia treinada, soma +1d8.", { limite: [1, "rodada"], rolagens: [soma("Perito (+1d8)", "1d8")] }),
        acao("livre", "Assassinato Furtivo", "Uma vez por rodada, ao atingir alvo desprevenido ou que esteja flanqueando, causa +3d8 de dano.", { limite: [1, "rodada"], rolagens: [dano("Assassinato furtivo", "3d8")] }),
        acao("livre", "Punhal X", "Uma vez por rodada, ao atacar, deixa o alvo desprevenido; causando dano, ele fica cego por 1 rodada. Cada alvo só fica cego assim uma vez por cena.", { limite: [1, "rodada"] }),
        acao("completa", "Zona dos Sussurros", "Marca uma área do tamanho de um cômodo com vários “X” (áreas maiores pedem mais usos): ali recebe +5 nos ataques e não sofre penalidade em Furtividade depois de atacar ou chamar atenção. No máximo três áreas; a quarta apaga uma das anteriores."),
        acao("reacao", "O Sabor do Silêncio (poder de Intenção)", "Prova o sangue de uma pessoa adjacente machucada. Até o fim da cena, seus ataques causam +1d8 de dano e têm +2 na margem de ameaça; num crítico, corta a boca do alvo em “X”: ele não se comunica nem usa poderes ou rituais por 1d4 rodadas.",
          { marcador: "Sangue provado (até o fim da cena)", rolagens: [dano("Dano extra", "1d8"), soma("Rodadas silenciado", "1d4")] }),
        acao("padrao", "Intenção Assassina", "Desperta a intenção assassina e vira X — use o seletor de forma desta ocorrência."),
      ],
      formas: [{
        id: "x", nome: "X", pagina: 52, vd: 140,
        percepcao: "1d20+10", iniciativa: "3d20+15", defesa: 30, fortitude: "1d20+10", reflexos: "3d20+15", vontade: "1d20+10",
        pv: 200, machucado: 100,
        ativacao: "Intenção Assassina (ação padrão). Sem limite de duração; se não matar uma pessoa até o fim da cena, a intenção adormece e só volta depois de dormir (p. 53).",
        pericias: [["Acrobacia", "3d20+10"], ["Atletismo", "2d20+10"], ["Crime", "3d20+15"], ["Enganação", "1d20+15"], ["Furtividade", "3d20+15"],
          ["Investigação", "3d20+15"], ["Tecnologia", "3d20+10"]],
        acoes: [
          agredir([at("Punhal", "corpo a corpo", 2, "3d20+15", ["4d4+20 perfuração", "2d6 Conhecimento"], { critico: "19/x2" })]),
          acao("reacao", "Analítico", "Uma vez por rodada, num teste de perícia treinada, soma +1d12.", { limite: [1, "rodada"], rolagens: [soma("Analítico (+1d12)", "1d12")] }),
          acao("reacao", "Esquiva Sombria", "Duas vezes por rodada, ao sofrer um ataque, esquiva: +10 na Defesa contra ele.", { limite: [2, "rodada"] }),
          acao("livre", "Assassinato Cruel", "Uma vez por rodada, ao atingir alvo desprevenido ou que esteja flanqueando, causa +6d8 de dano.", { limite: [1, "rodada"], rolagens: [dano("Assassinato cruel", "6d8")] }),
          acao("livre", "Punhal X", "Uma vez por rodada, ao atacar, deixa o alvo desprevenido; causando dano, ele fica cego por 2 rodadas. Cada alvo só fica cego assim uma vez por cena.", { limite: [1, "rodada"] }),
          acao("completa", "Zona das Sombras", "Como Zona dos Sussurros (+5 nos ataques, sem penalidade em Furtividade depois de atacar, no máximo três áreas). Além disso, dentro da área, ao usar Assassinato Cruel pode rolar de novo os resultados 7 ou 8 dos dados e somar ao dano."),
          acao("reacao", "O Sabor do Silêncio (poder de Intenção)", "Prova o sangue de uma pessoa adjacente machucada. Até o fim da cena, seus ataques causam +1d8 de dano e têm +2 na margem de ameaça; num crítico, corta a boca do alvo em “X”: ele não se comunica nem usa poderes ou rituais por 1d4 rodadas.",
            { marcador: "Sangue provado (até o fim da cena)", rolagens: [dano("Dano extra", "1d8"), soma("Rodadas silenciado", "1d4")] }),
          acao("padrao", "Intenção Assassina", "Adormece a intenção: volta a ser Jae (seletor de forma) e não a desperta de novo até dormir."),
        ],
      }],
    },

    {
      id: "as2.criatura.kemi", livro: AS2, pagina: 57,
      nome: "Kemi", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Mascarados",
      elementos: [], vd: 80,
      descricao: "Atiradora de elite de precisão impossível — a assassina chamada Fantasma.",
      percepcao: "2d20+5", iniciativa: "3d20+10",
      defesa: 23, fortitude: "1d20+5", reflexos: "3d20+10", vontade: "2d20+5",
      pv: 90, machucado: 45,
      atributos: [3, 1, 3, 2, 1],
      pericias: [["Acrobacia", "3d20+10"], ["Atletismo", "1d20+5"], ["Crime", "3d20+10"], ["Furtividade", "3d20+10"], ["Investigação", "3d20+10"],
        ["Medicina", "3d20+5"], ["Ocultismo", "3d20+5"], ["Sobrevivência", "2d20+5"]],
      deslocamento: [[9, 6]],
      estados: [{ id: "adormecida", nome: "Intenção adormecida (até dormir)", maximo: 1 }],
      notas: [
        "A forma Fantasma está na p. 58 e o perfil como aliada na p. 59.",
        "A ficha de NPC limita Sede de Vingança a uma vez por rodada; o texto do poder (p. 95) não.",
      ],
      habilidades: [
        hab("Sniper da Morte", "Quem cai a 0 PV pelo dano do fuzil dela morre se começar 2 turnos morrendo, em vez de 3."),
      ],
      acoes: [
        agredir([at("Facada", "corpo a corpo", 2, "3d20+10", "2d4+10 perfuração", { critico: "19/x2" })]),
        agredir([at("Fuzil de Precisão", "longo", 1, "3d20+10", ["2d10+20 balístico", "2d4 Morte"], { critico: "17/x3" })], { nome: "Agredir (fuzil)" }),
        acao("reacao", "Esquiva Tática", "Uma vez por rodada, ao sofrer um ataque, esquiva: +10 na Defesa contra ele.", { limite: [1, "rodada"] }),
        acao("reacao", "Perito", "Uma vez por rodada, num teste de perícia treinada, soma +1d8.", { limite: [1, "rodada"], rolagens: [soma("Perito (+1d8)", "1d8")] }),
        acao("livre", "Disparo da Morte", "Uma vez por rodada, ao atacar com arma de fogo, +2 na margem de ameaça.", { limite: [1, "rodada"] }),
        acao("reacao", "Sede de Vingança (poder de Intenção)", "Uma vez por rodada, ao ouvir o grito de morte de alguém à vista que tentou proteger, ataca quem deixou o aliado morrendo. Também serve para atacar o inimigo que a deixou morrendo.", { limite: [1, "rodada"] }),
        acao("padrao", "Intenção Assassina", "Desperta a intenção assassina e vira Fantasma — use o seletor de forma desta ocorrência."),
      ],
      formas: [{
        id: "fantasma", nome: "Fantasma", pagina: 58, vd: 140,
        percepcao: "2d20+10", iniciativa: "3d20+15", defesa: 30, fortitude: "1d20+10", reflexos: "3d20+15", vontade: "2d20+10",
        pv: 180, machucado: 90,
        ativacao: "Intenção Assassina (ação padrão). Sem limite de duração; se não matar uma pessoa até o fim da cena, a intenção adormece e só volta depois de dormir (p. 59).",
        pericias: [["Acrobacia", "3d20+15"], ["Atletismo", "1d20+10"], ["Crime", "3d20+15"], ["Furtividade", "3d20+15"], ["Investigação", "3d20+15"],
          ["Medicina", "3d20+10"], ["Ocultismo", "3d20+10"], ["Sobrevivência", "2d20+10"]],
        habilidades: [hab("Sniper da Morte", "Quem cai a 0 PV pelo dano do fuzil dela morre se começar 2 turnos morrendo, em vez de 3.")],
        acoes: [
          agredir([at("Facada", "corpo a corpo", 2, "3d20+15", "4d4+20 perfuração", { critico: "19/x2" })]),
          agredir([at("Fuzil de Precisão", "longo", 1, "3d20+15", ["4d10+40 balístico", "4d4 Morte"], { critico: "17/x3" })], { nome: "Agredir (fuzil)" }),
          acao("reacao", "Esquiva Fantasma", "Duas vezes por rodada, ao sofrer um ataque, esquiva: +10 na Defesa contra ele.", { limite: [2, "rodada"] }),
          acao("reacao", "Analítica", "Uma vez por rodada, num teste de perícia treinada, soma +1d12.", { limite: [1, "rodada"], rolagens: [soma("Analítica (+1d12)", "1d12")] }),
          acao("livre", "Disparo Espiral", "Uma vez por rodada, ao atacar com arma de fogo, +2 na margem de ameaça; o disparo curva até o alvo e ignora cobertura e 10 pontos de resistência a dano.", { limite: [1, "rodada"] }),
          acao("reacao", "Sede de Vingança (poder de Intenção)", "Uma vez por rodada, ao ouvir o grito de morte de alguém à vista que tentou proteger, ataca quem deixou o aliado morrendo. Também serve para atacar o inimigo que a deixou morrendo.", { limite: [1, "rodada"] }),
          acao("padrao", "Intenção Assassina", "Adormece a intenção: volta a ser Kemi (seletor de forma) e não a desperta de novo até dormir."),
        ],
      }],
    },

    {
      id: "as2.criatura.labirinto", livro: AS2, pagina: 62,
      nome: "Labirinto", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Mascarados",
      elementos: [], vd: 80,
      descricao: "Ocultista de capacidades que nem ele compreende, sempre com a antena parabólica que guarda um ritual pronto.",
      percepcao: "3d20+5", iniciativa: "1d20+5",
      defesa: 20, fortitude: "1d20+5", reflexos: "1d20+5", vontade: "3d20+10",
      pv: 120, machucado: 60,
      atributos: [1, 1, 3, 3, 2],
      pericias: [["Ciências", "3d20+10"], ["Intuição", "3d20+5"], ["Investigação", "3d20+10"], ["Medicina", "3d20+10"], ["Ocultismo", "3d20+15"],
        ["Sobrevivência", "3d20+5"], ["Tecnologia", "3d20+10"]],
      deslocamento: [[9, 6]],
      estados: [{ id: "simbolos", nome: "Símbolos de Morte ativos", maximo: 3 }, { id: "adormecida", nome: "Intenção adormecida (até dormir)", maximo: 1 }],
      notas: [
        "Ficha nas p. 62–63; a forma tomada pela intenção assassina está na p. 64 e o perfil como aliado na p. 67.",
        "Novo Caminho aparece duas vezes: como reação no destaque do poder de Intenção e como ação padrão na lista de ações; a p. 95 diz ação padrão.",
        "Os quatro rituais da ficha também estão no catálogo de rituais do suplemento; a ficha usa a versão de 8d8 da Rajada Caótica.",
      ],
      habilidades: [
        hab("Antena do Medo", "Pode conjurar um ritual NA antena: ele não faz efeito na hora e fica contido. Com uma ação padrão, liberta o ritual e gera o efeito, sem ações de conjuração nem outro custo. Um ritual por vez.",
          { marcador: "Ritual contido na antena" }),
      ],
      acoes: [
        agredir([at("Pancada com Antena", "corpo a corpo", 2, "1d20+5", "1d8+10 impacto")]),
        acao("padrao", "Novo Caminho (poder de Intenção)", "Depois de testemunhar a morte de uma pessoa, absorve as intenções dela (em alcance curto): um ser em alcance curto recupera PV iguais à metade dos PV máximos do cadáver."),
        acao("padrao", "Ritual: Capturar Momento (Morte 2)", "Marca um local em alcance médio com um símbolo invisível que capta imagens e sons em alcance médio dele; com uma ação padrão, vê e ouve o que o símbolo capta, mesmo longe. No máximo três símbolos; o quarto apaga um dos anteriores."),
        acao("padrao", "Ritual: Labirinto Mental (Conhecimento 2)", "Prende a mente de uma pessoa em alcance médio: por 1d4 rodadas ela gasta as ações se movendo em direção aleatória. No início de cada turno dela, Vontade DT 20 liberta.",
          { rolagens: [soma("Rodadas", "1d4")], resistencia: "Vontade DT 20 (a cada turno) liberta" }),
        acao("padrao", "Ritual: Mapa Sanguíneo (Sangue 2)", "Desenha com gotas de sangue um mapa que mostra, em tempo real, onde estão todos os seres num raio de 1 km. Vontade DT 20 evita aparecer. Dura até o fim da cena.",
          { resistencia: "Vontade DT 20 evita", marcador: "Mapa ativo" }),
        acao("padrao", "Ritual: Rajada Caótica (Energia 2)", "Um raio em um ser em alcance médio: 8d8 de dano de Energia (Reflexos DT 20 reduz à metade).",
          { rolagens: [dano("Rajada", "8d8 Energia")], resistencia: "Reflexos DT 20 reduz à metade" }),
        acao("padrao", "Intenção Assassina", "Desperta a intenção assassina — use o seletor de forma desta ocorrência."),
      ],
      formas: [{
        id: "intencao-assassina", nome: "Intenção assassina", pagina: 64, vd: 140,
        percepcao: "3d20+10", iniciativa: "1d20+10", defesa: 28, fortitude: "1d20+10", reflexos: "1d20+10", vontade: "3d20+15",
        pv: 240, machucado: 120,
        ativacao: "Intenção Assassina (ação padrão). A forma não ganha outro nome no livro; a ficha da p. 64 também se chama Labirinto. Adormece até dormir quando ele abandona a forma.",
        pericias: [["Ciências", "3d20+15"], ["Intuição", "3d20+10"], ["Investigação", "3d20+15"], ["Medicina", "3d20+15"], ["Ocultismo", "3d20+20"],
          ["Sobrevivência", "3d20+10"], ["Tecnologia", "3d20+15"]],
        notas: [
          "Os rituais desta forma trazem o círculo impresso como “???”: nenhum círculo foi deduzido do dano.",
          "A ficha da forma não repete Novo Caminho.",
        ],
        habilidades: [
          hab("Antena do Medo", "Pode conjurar um ritual NA antena: ele não faz efeito na hora e fica contido. Com uma ação padrão, liberta o ritual e gera o efeito, sem ações de conjuração nem outro custo. Um ritual por vez.",
            { marcador: "Ritual contido na antena" }),
        ],
        acoes: [
          agredir([at("Pancada com Antena", "corpo a corpo", 2, "1d20+10", "2d8+20 impacto")]),
          acao("padrao", "Ritual: Consumir Momento (Morte, círculo ???)", "Como Capturar Momento (símbolos que captam imagens e sons, no máximo três). Além disso, com uma ação padrão, faz um símbolo explodir: 8d8 de dano de Morte em todos os seres captados por ele no momento (Fortitude DT 25 reduz à metade).",
            { rolagens: [dano("Explosão", "8d8 Morte")], resistencia: "Fortitude DT 25 reduz à metade" }),
          acao("padrao", "Ritual: Labirinto Abissal (Conhecimento, círculo ???)", "Prende a mente de uma pessoa em alcance médio: até o fim da cena ela gasta as ações se movendo em direção aleatória. No início de cada turno dela, Vontade DT 25 liberta.",
            { resistencia: "Vontade DT 25 (a cada turno) liberta" }),
          acao("padrao", "Ritual: Revelação Sanguínea (Sangue, círculo ???)", "Mapa de sangue de todos os seres num raio de 1 km, em tempo real, com o estado de saúde de cada um (ileso, ferido, machucado ou morrendo). Vontade DT 25 evita aparecer. Até o fim da cena.",
            { resistencia: "Vontade DT 25 evita", marcador: "Mapa ativo" }),
          acao("padrao", "Ritual: Tempestade Caótica (Energia, círculo ???)", "Um raio em um ser em alcance médio: 8d10 de dano de Energia (Reflexos DT 25 reduz à metade). Até o fim da cena, nas rodadas seguintes, uma ação padrão dispara outro raio igual.",
            { rolagens: [dano("Raio", "8d10 Energia")], resistencia: "Reflexos DT 25 reduz à metade", marcador: "Tempestade ativa" }),
          acao("padrao", "Intenção Assassina", "Adormece a intenção: volta à ficha de partida (seletor de forma) e não a desperta de novo até dormir."),
        ],
      }],
    },

    /* Os agentes da Ordem nos corpos dos Mascarados (p. 68–87): fichas
       próprias, sem forma transformada. */
    {
      id: "as2.criatura.jasper", livro: AS2, pagina: 70,
      nome: "Jasper", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Agentes no Hexatombe",
      elementos: [], vd: 80,
      descricao: "Agente que cresceu como cobaia de um culto e ficou tolerante ao paranormal; luta com duas foices presas ao corpo por correntes.",
      percepcao: "2d20", iniciativa: "3d20+5",
      defesa: 23, fortitude: "2d20+5", reflexos: "3d20+10", vontade: "2d20",
      pv: 90, machucado: 45,
      resistencias: [[5, "paranormal"]],
      atributos: [3, 3, 1, 1, 2],
      pericias: [["Atletismo", "3d20+10"], ["Religião", "1d20+5"]],
      deslocamento: [[9, 6]],
      estados: [{ id: "acopladas", nome: "Foices acopladas", maximo: 1 }],
      notas: ["O perfil como aliado está na p. 71, junto da regra de armas acopláveis."],
      habilidades: [
        hab("Conduíte Paranormal", "Resistência a dano paranormal 5 e +5 em testes de resistência contra rituais e habilidades de criaturas paranormais."),
        hab("Correntes Acopladas", "As foices são presas ao corpo por correntes: não podem ser desarmadas, atacam alvos a até 4,5 m e dão +5 em manobras de combate."),
      ],
      acoes: [
        agredir([at("Foices Acorrentadas", "corpo a corpo (4,5 m)", 2, "3d20+10", "3d4+10 corte", { critico: "19" })]),
        agredir([at("Foices Acopladas", "corpo a corpo (4,5 m)", 1, "3d20+10", "6d4+10 corte", { critico: "x4" })], { nome: "Agredir (foices acopladas)", requer: ["acopladas", 1] }),
        acao("livre", "Puxar pra Briga", "Acertando um ataque com as foices, puxa o alvo para um espaço livre adjacente. Se o alvo se afastar dele, sofre −1d20 nos ataques contra outros alvos por 1 rodada."),
        acao("movimento", "Acoplar Foices", "Junta as duas foices numa única arma: menos versatilidade, mais letalidade. Marque “Foices acopladas” nesta ocorrência."),
        acao("completa", "Ceifar", "Com as foices acopladas, faz um único teste de ataque contra a Defesa de todos os seres adjacentes que escolher. Os atingidos sofrem +4d4 de dano de corte (multiplicado no crítico) e ficam sangrando.",
          { requer: ["acopladas", 1], ataques: [at("Foices Acopladas (Ceifar)", "adjacentes", 1, "3d20+10", ["6d4+10 corte", "4d4 corte"], { critico: "x4", multiplicaTudo: true })] }),
      ],
    },

    {
      id: "as2.criatura.lena-viegas", livro: AS2, pagina: 74,
      nome: "Lena Viegas", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Agentes no Hexatombe",
      elementos: [], vd: 80,
      descricao: "Ocultista de conhecimento amplo e técnicas versáteis, de brincos e acessórios impregnados pelo Outro Lado.",
      percepcao: "3d20", iniciativa: "2d20+5",
      defesa: 22, fortitude: "1d20", reflexos: "2d20+5", vontade: "3d20+10",
      pv: 80, machucado: 40,
      atributos: [2, 1, 3, 3, 1],
      pericias: [["Diplomacia", "3d20+5"], ["Investigação", "3d20+5"], ["Ocultismo", "3d20+10"]],
      deslocamento: [[9, 6]],
      estados: [{ id: "catalisadores", nome: "d6 dos catalisadores gastos na cena", maximo: 3 }],
      notas: [
        "O perfil como aliada está na p. 75.",
        "Eletrocussão e Flagelo de Sangue não trazem a DT ao lado do teste; vale a DT 20 dos rituais da ficha.",
      ],
      habilidades: [
        hab("Catalisadores Sofisticados", "Uma vez por cena recebe 3d6. Ao conjurar um ritual, pode gastar 1d6 (ação livre) para somar +1d6 ao dano, à cura ou à DT dele — só 1d6 por ritual, e só no momento de conjurar. Os d6 que sobram se perdem no fim da cena.",
          { rolagens: [soma("Catalisador (+1d6)", "1d6")] }),
        hab("Rituais (DT 20)", "Conjura os rituais abaixo sem pagar PE, até 6 PE por conjuração, com a ação de cada um."),
      ],
      acoes: [
        agredir([at("Pistola", "curto", 2, "2d20+10", "1d12+10 balístico", { critico: "18" })]),
        acao("padrao", "Ritual: Cicatrização Discente (Morte 1)", "Toca um ser: ele recupera 5d8+5 PV, mas envelhece 1 ano.", { rolagens: [soma("Cura", "5d8+5")] }),
        acao("padrao", "Ritual: Eletrocussão Discente (Energia 1)", "Raio em linha de 30 m: 6d6 de dano de Energia em todos os seres e objetos livres nela (Fortitude reduz à metade).",
          { rolagens: [dano("Eletrocussão", "6d6 Energia")], resistencia: "Fortitude DT 20 reduz à metade" }),
        acao("padrao", "Ritual: Esconder dos Olhos (Conhecimento 2)", "Fica invisível, com o equipamento, por 1 rodada: camuflagem total e +15 em Furtividade; quem não a vê fica desprevenido. Termina se atacar ou usar habilidade hostil.", { marcador: "Invisível" }),
        acao("padrao", "Ritual: Flagelo de Sangue (Sangue 2)", "Grava uma marca no corpo de uma pessoa tocada junto de uma ordem; até o fim da cena, a cada rodada de desobediência, 10d6 de dano de Sangue e enjoado pela rodada (Fortitude reduz à metade e evita a condição). Passar no teste dois turnos seguidos apaga a marca.",
          { rolagens: [dano("Flagelo", "10d6 Sangue")], resistencia: "Fortitude DT 20 reduz à metade e evita enjoado" }),
      ],
    },

    {
      id: "as2.criatura.maria", livro: AS2, pagina: 78,
      nome: "Maria", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Agentes no Hexatombe",
      elementos: [], vd: 80,
      descricao: "Profissional de saúde de métodos duvidosos e fé cega em Kian — que, às vezes, de fato a salva.",
      percepcao: "2d20+5", iniciativa: "3d20+5",
      defesa: 21, fortitude: "1d20+5", reflexos: "3d20+10", vontade: "2d20+5",
      pv: 80, machucado: 40,
      atributos: [3, 1, 3, 2, 1],
      pericias: [["Enganação", "2d20+10"], ["Medicina", "3d20+5"], ["Ocultismo", "3d20+5"]],
      deslocamento: [[9, 6]],
      notas: ["O número da página saiu duplicado (“7878”); é a p. 78. O perfil como aliada está na p. 79."],
      habilidades: [
        hab("Estágio Terminal", "Machucada, recebe uma ação de movimento extra até o fim da cena.", { marcador: "Ação extra (machucada)" }),
        hab("Fim Precoce", "Quando é responsável pela morte de alguém, recebe +1d20 em todos os testes até o fim da cena.", { marcador: "+1d20 até o fim da cena" }),
        hab("Kian Vai Nos Salvar", "A critério do mestre, diante de um desafio em que a fé em Kian a motive, conjura um único ritual de Conhecimento de até 3º círculo como se o conhecesse (fora do limite de rituais), disponível até o fim da cena. Nunca dois rituais assim na mesma cena.",
          { marcador: "Ritual de Kian nesta cena" }),
        hab("Rituais (DT 20)", "Conjura os rituais abaixo sem pagar PE, até 6 PE por conjuração, com a ação de cada um."),
      ],
      acoes: [
        agredir([at("Pistola", "curto", 2, "2d20+10", "1d12+10 balístico", { critico: "18" })]),
        acao("padrao", "Ritual: Hemofagia (Sangue 2)", "Arranca o sangue de um ser tocado: 6d6 de dano de Sangue (Fortitude reduz à metade); recupera PV iguais à metade do dano causado.",
          { rolagens: [dano("Hemofagia", "6d6 Sangue")], resistencia: "Fortitude DT 20 reduz à metade" }),
        acao("padrao", "Tratamento de Emergência", "Uma aplicação arriscada dá 2d10+10 PV temporários a um ser tocado; quando eles acabam, o ser fica fraco até o fim da cena. O mesmo alvo só uma vez por cena.",
          { rolagens: [soma("PV temporários", "2d10+10")] }),
      ],
    },

    {
      id: "as2.criatura.remi", livro: AS2, pagina: 82,
      nome: "Remi", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Agentes no Hexatombe",
      elementos: [], vd: 80,
      descricao: "Musicista e conjurador profundamente perturbado, de espada enferrujada e harpa acoplada ao braço.",
      percepcao: "2d20+5", iniciativa: "3d20+5",
      defesa: 21, fortitude: "2d20", reflexos: "2d20+5", vontade: "2d20+10",
      pv: 90, machucado: 45,
      atributos: [2, 1, 3, 2, 2],
      pericias: [["Artes", "2d20+10"], ["Ocultismo", "3d20+5"]],
      deslocamento: [[9, 6]],
      notas: ["Os poderes e o perfil como aliado estão na p. 83."],
      habilidades: [
        hab("Sem Espaço para Erro", "Uma vez por rodada, errando um ataque com a espada, rola de novo; acertando na segunda tentativa, causa +1 dado de dano do mesmo tipo. Com a espada, ataque e dano usam Intelecto em vez de Força.",
          { limite: [1, "rodada"], rolagens: [dano("Dado extra (segunda tentativa)", "1d8 corte")] }),
        hab("Rituais (DT 20)", "Conjura os rituais abaixo sem pagar PE, até 6 PE por conjuração, com a ação de cada um."),
      ],
      acoes: [
        agredir([at("Espada Enferrujada", "corpo a corpo", 2, "3d20+10", "2d8+10 corte", { critico: "19" })]),
        acao("movimento", "Dedilhar Harpa", "Toca a harpa e a melodia afeta a espada até o início do próximo turno, com um efeito à escolha: +5 no ataque, +5 de dano, +2 na margem de ameaça ou alcance corpo a corpo de 9 m.",
          { marcador: "Melodia ativa" }),
        acao("padrao", "Ritual: Amaldiçoar Arma Discente (Sangue 1 ou Conhecimento 1)", "Uma arma ou munição tocada causa +2d6 de dano de Sangue ou de Conhecimento até o fim da cena.",
          { rolagens: [dano("Arma amaldiçoada (adicional)", "2d6")], marcador: "Arma amaldiçoada" }),
        acao("padrao", "Ritual: Distorcer Aparência (Sangue 1)", "Muda a própria aparência até o fim da cena: +10 em Enganação para disfarce, sem habilidades nem estatísticas da nova forma."),
        acao("padrao", "Ritual: Desfazer Sinapses Discente (Conhecimento 1)", "Até 5 seres com cérebro em alcance longo sofrem 3d6+3 de dano de Conhecimento e ficam frustrados por uma rodada (Vontade reduz à metade e evita a condição).",
          { rolagens: [dano("Sinapses", "3d6+3 Conhecimento")], resistencia: "Vontade DT 20 reduz à metade e evita frustrado" }),
      ],
    },

    {
      id: "as2.criatura.tuco", livro: AS2, pagina: 86,
      nome: "Tuco", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Agentes no Hexatombe",
      elementos: [], vd: 80,
      descricao: "Ex-militar de aparência distraída e treinamento intacto: tática e pancadaria.",
      percepcao: "1d20+5", iniciativa: "1d20+10",
      defesa: 24, fortitude: "3d20+5", reflexos: "1d20+10", vontade: "2d20+5",
      pv: 90, machucado: 45,
      atributos: [1, 3, 1, 2, 3],
      pericias: [["Atletismo", "3d20+10"], ["Furtividade", "1d20+10"]],
      deslocamento: [[9, 6]],
      notas: [
        "O primeiro ataque saiu com o nome “Foices Acorrentadas” e dano de impacto; Imobilização Militar o chama de porrada. Mantido como publicado.",
        "Imobilização Militar traz o teste como “+12”, sem o número de dados; não há rolagem pronta para ele.",
        "Os poderes e o perfil como aliado estão na p. 87.",
      ],
      habilidades: [
        hab("Aí Sim, Neném", "+1d20 nos ataques contra alvos que não estão engajados em combate."),
        hab("Sentido Tático", "Imune a desprevenido. Quem sofre dano dele falha automaticamente em Furtividade contra ele por 1 rodada."),
      ],
      acoes: [
        agredir([at("Foices Acorrentadas (porrada)", "corpo a corpo", 2, "3d20+10", "2d6+10 impacto", { critico: "19" })]),
        agredir([at("Pistola", "curto", 2, "1d20+10", "1d12+10 balístico", { critico: "18" })], { nome: "Agredir (pistola)" }),
        acao("livre", "Imobilização Militar", "Uma vez por rodada, acertando uma porrada, tenta agarrar o alvo (teste +12).", { limite: [1, "rodada"] }),
        acao("movimento", "Movimentação Tática", "Movendo-se em direção a uma cobertura ou a um inimigo, percorre o dobro do deslocamento."),
        acao("completa", "Marteladas", "Uma série de porradas num ser adjacente: 6d6+20 de dano de impacto (Fortitude DT 20 reduz à metade).",
          { rolagens: [dano("Marteladas", "6d6+20 impacto")], resistencia: "Fortitude DT 20 reduz à metade" }),
      ],
    },

    {
      id: "as2.criatura.juan-davo", livro: AS2, pagina: 91,
      nome: "Juan Davo", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Hexatombe",
      elementos: [], vd: 80,
      descricao: "O sacrifício que encontrou o símbolo do Pacto na própria memória e quer provar ser digno do Trono.",
      percepcao: "3d20+5", iniciativa: "3d20+10",
      defesa: 20, fortitude: "1d20+5", reflexos: "2d20+10", vontade: "3d20+10",
      pv: 100, machucado: 50,
      atributos: [2, 1, 2, 2, 3],
      pericias: [["Atletismo", "2d20+5"], ["Enganação", "3d20+5"], ["Intimidação", "3d20+10"], ["Ocultismo", "2d20+10"]],
      deslocamento: [[9, 6]],
      estados: [{ id: "obedeceu", nome: "Obedeceu a Ele nesta cena", maximo: 1 }, { id: "adormecida", nome: "Forma diabólica adormecida (até dormir)", maximo: 1 }],
      notas: [
        "A abertura está nas p. 88–90; a forma Juan Diabólico na p. 92 e o perfil como aliado na p. 93.",
        "O ritual saiu impresso como “Descansar Discente”; o efeito é o de Descarnar.",
      ],
      acoes: [
        agredir([at("Facada", "corpo a corpo", 2, "2d20+10", ["2d4+10 perfuração", "2d10 Sangue"], { critico: "19/x2" })]),
        acao("reacao", "Faca Predadora", "Uma vez por rodada, ao acertar um ataque, recupera 2d10 PV; o que passar dos PV máximos vira PV temporário.",
          { limite: [1, "rodada"], rolagens: [soma("PV recuperados", "2d10")] }),
        acao("padrao", "Armadura de Sangue Diabólica", "Conjura a armadura e vira Juan Diabólico — use o seletor de forma desta ocorrência."),
        acao("padrao", "Ritual: Descarnar Discente (Sangue 2)", "Toca um ser: 10d8 de dano (metade corte, metade Sangue) e hemorragia severa. No início de cada turno, Fortitude DT 20: falhando, 4d8 de dano de Sangue; dois sucessos seguidos estancam.",
          { rolagens: [dano("Descarnar (metade corte, metade Sangue)", "10d8"), dano("Hemorragia", "4d8 Sangue")], resistencia: "Fortitude DT 20 (a cada turno)" }),
        acao("padrao", "Ritual: Perturbação Discente (Conhecimento 2)", "Uma ordem a um ser em alcance curto (Vontade DT 20 anula): Fuja, Largue, Senta, Venha ou Sofra (3d8 de dano de Conhecimento e abalado por 1 rodada).",
          { rolagens: [dano("Sofra", "3d8 Conhecimento")], resistencia: "Vontade DT 20 anula" }),
        acao("padrao", "Ritual: Vínculo de Sangue (Sangue 4)", "Um símbolo nele e num ser em alcance curto até o fim da cena (Fortitude DT 20 evita, se involuntário): metade do dano que Juan sofre passa para o alvo — ou o inverso, se conjurado assim.",
          { resistencia: "Fortitude DT 20 evita", marcador: "Vínculo ativo" }),
        acao("reacao", "Desejo Diabólico (poder de Intenção)", "Uma vez por cena, na cena em que obedeceu a uma vontade d’Ele, decide que um teste é um sucesso automático (como um 20 natural), sem rolar.",
          { requer: ["obedeceu", 1], limite: [1, "cena"] }),
      ],
      formas: [{
        id: "juan-diabolico", nome: "Juan Diabólico", pagina: 92, vd: 140,
        percepcao: "3d20+10", iniciativa: "3d20+15", defesa: 31, fortitude: "1d20+10", reflexos: "2d20+15", vontade: "3d20+15",
        pv: 280, machucado: 140,
        ativacao: "Armadura de Sangue Diabólica (ação padrão). Sem limite de duração; se não matar uma pessoa até o fim da cena, a forma diabólica adormece e só volta depois de dormir (p. 92–93).",
        pericias: [["Atletismo", "2d20+10"], ["Enganação", "3d20+10"], ["Intimidação", "3d20+15"], ["Ocultismo", "2d20+15"]],
        notas: [
          "O tipo da ficha saiu impresso como “PPESSOA”.",
          "Os rituais desta forma trazem o círculo impresso como “???”: nenhum círculo foi deduzido do dano.",
        ],
        acoes: [
          agredir([at("Facada", "corpo a corpo", 2, "2d20+15", ["4d4+20 perfuração", "4d10 Sangue"], { critico: "19/x2" })]),
          acao("reacao", "Faca Predadora", "Uma vez por rodada, ao acertar um ataque, recupera 4d10 PV; o que passar dos PV máximos vira PV temporário.",
            { limite: [1, "rodada"], rolagens: [soma("PV recuperados", "4d10")] }),
          acao("padrao", "Armadura de Sangue Diabólica", "Abandona a forma diabólica: volta a ser Juan (seletor de forma) e não a usa de novo até dormir."),
          acao("padrao", "Ritual: Descarnar Discente Diabólico (Sangue, círculo ???)", "Um ser em alcance curto: 12d8 de dano (metade corte, metade Sangue) e hemorragia severa. No início de cada turno, Fortitude DT 25: falhando, 5d8 de dano de Sangue; dois sucessos seguidos estancam.",
            { rolagens: [dano("Descarnar (metade corte, metade Sangue)", "12d8"), dano("Hemorragia", "5d8 Sangue")], resistencia: "Fortitude DT 25 (a cada turno)" }),
          acao("padrao", "Ritual: Perturbação Discente Diabólica (Conhecimento, círculo ???)", "Uma ordem a um ser em alcance médio (Vontade DT 25 anula): Fuja, Largue, Senta, Venha ou Sofra (5d8 de dano de Conhecimento e abalado por 1 rodada).",
            { rolagens: [dano("Sofra", "5d8 Conhecimento")], resistencia: "Vontade DT 25 anula" }),
          acao("padrao", "Ritual: Vínculo de Sangue Diabólico (Sangue, círculo ???)", "Um símbolo nele e num ser em alcance médio até o fim da cena (Fortitude DT 25 evita, se involuntário): metade do dano que Juan sofre passa para o alvo — ou o inverso, se conjurado assim.",
            { resistencia: "Fortitude DT 25 evita", marcador: "Vínculo ativo" }),
          acao("reacao", "Desejo Diabólico (poder de Intenção)", "Uma vez por cena, na cena em que obedeceu a uma vontade d’Ele, decide que um teste é um sucesso automático (como um 20 natural), sem rolar.",
            { requer: ["obedeceu", 1], limite: [1, "cena"] }),
        ],
      }],
    },

    /* Perfis "como aliado" (OPRPG p. 170): benefícios para quem o NPC
       acompanha, sem PV nem PE. `ficha` aponta a ficha de ameaça. */
    aliadoAs2("jonas-aguiar", "Jonas Aguiar", 41, 39, "Policial e serial killer ao mesmo tempo.", [
      hab("Bônus", "Você recebe +1d20 nos testes de ataque."),
      hab("Investigador e Caçador", "Num teste de Investigação ou Sobrevivência para achar pistas ou rastros, 1 PE dá +1d8 no teste.",
        { custo: "1 PE", rolagens: [soma("Investigador e Caçador (+1d8)", "1d8")] }),
    ]),
    aliadoAs2("dalmo-magno", "Dalmo Magno", 47, 45, "Motorista e lutador de arena.", [
      hab("Bônus", "Sempre que você causa dano, causa +1d10 de dano de Energia.", { rolagens: [dano("Bônus de Dalmo", "1d10 Energia")] }),
      hab("Motorista Veterano", "2 PE dão treinamento em Pilotagem até o fim da cena; se já for treinado, +1d20 em Pilotagem.", { custo: "2 PE", marcador: "Até o fim da cena" }),
    ]),
    aliadoAs2("jae-yoon", "Park Jae-Yoon", 53, 51, "Influenciadora e serial killer.", [
      hab("Bônus", "Você pode usar a habilidade de trilha Ataque Furtivo; se já a tiver, o dano furtivo aumenta em +1d6.", { rolagens: [dano("Furtivo extra", "1d6")] }),
      hab("Figura Influente", "Num teste de Diplomacia, Enganação ou Intimidação, 3 PE permitem rolar de novo e ficar com o melhor resultado.", { custo: "3 PE" }),
    ], "Aliada"),
    aliadoAs2("kemi", "Kemi", 59, 57, "Atiradora de elite.", [
      hab("Bônus", "Sempre que você causa dano, causa +3d4 de dano de Morte, que ignora 10 pontos de resistência a dano do alvo.", { rolagens: [dano("Bônus de Kemi", "3d4 Morte")] }),
      hab("Figura Influente", "Uma vez por rodada, depois de um ataque à distância com arma de fogo ou de disparo, 2 PE dão uma ação de movimento adicional, só para se deslocar logo após o ataque.",
        { custo: "2 PE", limite: [1, "rodada"] }),
    ], "Aliada", ["A segunda habilidade saiu com o mesmo nome da de Jae-Yoon (“Figura Influente”); mantido como publicado."]),
    aliadoAs2("labirinto", "Labirinto", 67, 62, "Ocultista de capacidades que nem ele compreende.", [
      hab("Bônus", "Uma vez por dia, você recebe +2d4 PE atuais e máximos, até o fim do dia; no dia seguinte, rola de novo.",
        { limite: [1, "dia"], rolagens: [soma("PE do dia", "2d4")], marcador: "Bônus do dia aplicado" }),
      hab("Labirinto para o Outro Lado", "2 PE aumentam em +3 a DT das suas habilidades (poderes, rituais etc.) até o fim da cena; acumula com A Antena e outras fontes.",
        { custo: "2 PE", marcador: "+3 na DT até o fim da cena" }),
    ]),
    aliadoAs2("jasper", "Jasper", 71, 70, "Defensor contra o paranormal e combatente letal.", [
      hab("Bônus", "Você recebe resistência a dano paranormal 5."),
      hab("Letalidade do Ceifador", "Ao fazer um ataque, 2 PE aumentam a margem de ameaça dele em +2.", { custo: "2 PE" }),
    ]),
    aliadoAs2("lena-viegas", "Lena Viegas", 75, 74, "Ocultista de conhecimento amplo e técnicas versáteis.", [
      hab("Bônus", "Você recebe +1d20 em Ocultismo e Vontade."),
      hab("Versatilidade Mística", "3 PE dão os efeitos de um Catalisador Sofisticado e Horrorizado até o fim da cena, como se você o vestisse.", { custo: "3 PE", marcador: "Catalisador até o fim da cena" }),
    ], "Aliada"),
    aliadoAs2("maria", "Maria", 79, 78, "Profissional de saúde de habilidades duvidosas, que surpreende.", [
      hab("Bônus", "Você recebe +1d20 em Medicina."),
      hab("De Onde Veio Isso?", "Você pode usar a habilidade Kian Vai Nos Salvar, mesmo sem saber da fé de Maria — nem ela sabe como funciona."),
    ], "Aliada"),
    aliadoAs2("remi", "Remi", 83, 82, "Musicista e conjurador extremamente perturbado.", [
      hab("Bônus", "Você recebe +1d20 em Artes e Ocultismo."),
      hab("Sintonização e Sincronia", "Você pode usar os poderes Sintonização Mental com Arma e Sintonização Mental com Proteção como se os tivesse."),
    ], "Aliado", ["O perfil chama os poderes de “Sintonia Mental”; são os poderes Sintonização Mental da mesma página."]),
    aliadoAs2("tuco", "Tuco", 87, 86, "Máquina militar de tática e pancadaria.", [
      hab("Bônus", "Você recebe +1d20 em testes de Luta e +1d6 nas rolagens de dano corpo a corpo.", { rolagens: [dano("Bônus de Tuco", "1d6")] }),
      hab("Instintos Militares de Combate", "Você pode usar o poder Sentido Tático como se o tivesse."),
    ]),
    aliadoAs2("juan-davo", "Juan Davo", 93, 91, "Aliado assustador, de habilidades ocultistas temidas.", [
      hab("Bônus", "Você recebe +1d20 em Intimidação e Ocultismo."),
      hab("Ligado ao Sangue", "Você conjura Armadura de Sangue e Descarnar como se os conhecesse (fora do limite de rituais), respeitando o círculo das formas avançadas. Se já conhece um deles, o custo dele cai em 1 PE."),
    ]),

    /* =================================================================
       ARQUIVOS SECRETOS 3 — as equipes do Hexatombe
       -----------------------------------------------------------------
       PSIKOLERA (p. 4-41), Couraças (p. 42-73) e Pássaros (p. 74-105).
       Fichas como publicadas: "O" é d20 e "–2O" é o pior de dois d20
       (atributo 0). A Hora do Show do PSIKOLERA é uma FORMA da mesma
       ocorrência (+20 PV atuais ao entrar); as ações mascaradas são as
       da ficha com as alterações que o livro lista, porque ele não
       imprime a ficha mascarada. Rituais das fichas são habilidades da
       ameaça — não entram na biblioteca de rituais.
       ================================================================= */

    /* ---------------- PSIKOLERA ---------------- */

    {
      id: "as3.criatura.ale", livro: AS3, pagina: 11,
      nome: "Alê", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "PSIKOLERA",
      elementos: [], vd: 80,
      descricao: "Tecladista do PSIKOLERA, ocultista silencioso que fundiu música e misticismo numa coisa só.",
      percepcao: "3d20+10", iniciativa: "3d20+5",
      defesa: 18, fortitude: "1d20", reflexos: "3d20+5", vontade: "3d20+10",
      pv: 45, machucado: 22,
      atributos: [3, 1, 3, 3, 1],
      pericias: [["Artes", "3d20+10"], ["Ocultismo", "3d20+10"]],
      deslocamento: [[9, 6]],
      notas: [
        "Biografia nas p. 6–10; perfil como aliado na p. 118.",
        "Hora do Show: o livro imprime Defesa 26 e 90 PV, mas a ficha tem Defesa 18 e 45 PV (+10 e +20 dariam 28 e 65). A forma usa os valores impressos; ajuste na ocorrência se a mesa preferir a conta.",
      ],
      habilidades: [hab("Rituais (DT 20)", "Conjura os rituais da ficha sem pagar PE, até 6 PE por conjuração, com a ação apropriada.")],
      acoes: [
        agredir([at("Cortar com Teclado", "corpo a corpo", 2, "1d20+10", "2d6+10 corte", { critico: "19" })]),
        acao("padrao", "Desfazer Sinapses", "Notas dissonantes sobrecarregam ouvidos e mente de um ser em alcance médio: 3d10+10 de dano de Conhecimento e confuso por 1 rodada (Vontade DT 20 reduz à metade e evita a condição).",
          { rolagens: [dano("Desfazer Sinapses", "3d10+10 Conhecimento")], resistencia: "Vontade DT 20 reduz à metade e evita confuso" }),
        acao("padrao", "Hora do Show", "Coloca a máscara — use o seletor de forma desta ocorrência."),
        acao("padrao", "Ritual: Cicatrização (Discente, Morte 1)", "Acelera o tempo nas feridas de 1 ser adjacente: ele recupera 5d8+5 PV, mas envelhece 1 ano.",
          { rolagens: [soma("PV recuperados", "5d8+5")] }),
        acao("padrao", "Ritual: Proteção Sigilosa (Conhecimento 2)", "Sigilos numa área de 3 m de raio em alcance de toque, até o fim da cena: Alê e os aliados dentro dela recebem +5 na Defesa, em testes de resistência e em Furtividade."),
      ],
      formas: [horaDoShow("Alê", 11, 26, 90, "1d20+10", [
        hab("Rituais (DT 25)", "Conjura os rituais da ficha sem pagar PE, até 6 PE por conjuração, com a ação apropriada (DT das habilidades +5)."),
      ], [
        agredir([at("Cortar com Teclado", "corpo a corpo", 2, "1d20+15", "4d6+10 corte", { critico: "19" })]),
        acao("padrao", "Desfazer Sinapses", "Como na ficha, com +2 dados e DT 25: 5d10+10 de dano de Conhecimento e confuso por 1 rodada (Vontade DT 25 reduz à metade e evita a condição).",
          { rolagens: [dano("Desfazer Sinapses", "5d10+10 Conhecimento")], resistencia: "Vontade DT 25 reduz à metade e evita confuso" }),
        acao("padrao", "Ritual: Cicatrização (Discente, Morte 1)", "Acelera o tempo nas feridas de 1 ser adjacente: ele recupera 5d8+5 PV, mas envelhece 1 ano.",
          { rolagens: [soma("PV recuperados", "5d8+5")] }),
        acao("padrao", "Ritual: Proteção Sigilosa (Conhecimento 2)", "Sigilos numa área de 3 m de raio em alcance de toque, até o fim da cena: Alê e os aliados dentro dela recebem +5 na Defesa, em testes de resistência e em Furtividade."),
      ], ["Proteção Sigilosa e Cicatrização não causam dano: ficam como na ficha. O PV de machucado da forma não é impresso."])],
    },

    {
      id: "as3.criatura.caio", livro: AS3, pagina: 17,
      nome: "Caio", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "PSIKOLERA",
      elementos: [], vd: 80,
      descricao: "Vocal do PSIKOLERA: a voz é a arma, com uma espada-microfone e um grito que ensurdece.",
      percepcao: "2d20", iniciativa: "2d20+5",
      defesa: 17, fortitude: "2d20+10", reflexos: "2d20+5", vontade: "2d20",
      pv: 60, machucado: 30,
      atributos: [2, 2, 1, 2, 2],
      pericias: [["Artes", "2d20+10"], ["Atletismo", "2d20+10"]],
      deslocamento: [[9, 6]],
      notas: ["Biografia nas p. 12–16; perfil como aliado na p. 118."],
      habilidades: [],
      acoes: [
        agredir([at("Ataque com Espada", "corpo a corpo", 2, "2d20+10", "2d8+10 corte", { critico: "19" })]),
        acao("padrao", "Berrão", "Finca a espada no chão e grita no ouvido de um alvo em alcance de toque: 4d8 de dano de impacto, surdo por 1 rodada e larga o que segura para tapar os ouvidos. O alvo pode escolher largar o que segura para tapar os ouvidos: reduz o dano à metade e evita a condição.",
          { rolagens: [dano("Berrão", "4d8 impacto")] }),
        acao("padrao", "Corte na Jugular", "Gira a espada-microfone na garganta de um ser adjacente: 2d8+10 de corte e sangrando (Reflexos DT 20 reduz à metade e evita a condição).",
          { rolagens: [dano("Corte na Jugular", "2d8+10 corte")], resistencia: "Reflexos DT 20 reduz à metade e evita sangrando" }),
        acao("padrao", "Hora do Show", "Coloca a máscara — use o seletor de forma desta ocorrência."),
      ],
      formas: [horaDoShow("Caio", 17, 27, 80, "2d20+10", [], [
        agredir([at("Ataque com Espada", "corpo a corpo", 2, "2d20+15", "4d8+10 corte", { critico: "19" })]),
        acao("padrao", "Berrão", "Como na ficha, com +2 dados: 6d8 de impacto, surdo por 1 rodada e larga o que segura. Largar o que segura para tapar os ouvidos reduz à metade e evita a condição.",
          { rolagens: [dano("Berrão", "6d8 impacto")] }),
        acao("padrao", "Corte na Jugular", "Como na ficha, com +2 dados e DT 25: 4d8+10 de corte e sangrando (Reflexos DT 25 reduz à metade e evita a condição).",
          { rolagens: [dano("Corte na Jugular", "4d8+10 corte")], resistencia: "Reflexos DT 25 reduz à metade e evita sangrando" }),
      ], ["O teste para resistir a destruir a máscara sai impresso como “2d20+10” e o de arrancar como “2O+10”: são o mesmo."])],
    },

    {
      id: "as3.criatura.eloy", livro: AS3, pagina: 23,
      nome: "Eloy", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "PSIKOLERA",
      elementos: [], vd: 80,
      descricao: "Baterista do PSIKOLERA: braços largos, energia sem fim e pancadas no ritmo da bateria.",
      percepcao: "1d20", iniciativa: "2d20+5",
      defesa: 16, fortitude: "3d20+10", reflexos: "2d20+5", vontade: "1d20",
      pv: 70, machucado: 35,
      atributos: [1, 3, 1, 1, 3],
      pericias: [["Artes", "1d20+10"], ["Atletismo", "3d20+10"]],
      deslocamento: [[9, 6]],
      notas: ["Biografia nas p. 18–22; perfil como aliado na p. 118."],
      habilidades: [],
      acoes: [
        agredir([at("Pancada", "corpo a corpo", 2, "3d20+10", "4d4+10 impacto", { critico: "19" })]),
        acao("padrao", "Hora do Show", "Coloca a máscara — use o seletor de forma desta ocorrência."),
        acao("padrao", "Moeller Method", "Atira-se sobre um ser adjacente e o espanca como uma bateria. Fortitude DT 20: passando, 2d4+5 de impacto; falhando, 4d4+10 de impacto e aturdido, e Eloy continua — novo teste, e assim por diante, até o alvo passar num teste ou falhar três vezes seguidas.",
          { rolagens: [dano("Passou", "2d4+5 impacto"), dano("Falhou", "4d4+10 impacto")], resistencia: "Fortitude DT 20, repetido" }),
      ],
      formas: [horaDoShow("Eloy", 23, 26, 90, "3d20+10", [], [
        agredir([at("Pancada", "corpo a corpo", 2, "3d20+15", "6d4+10 impacto", { critico: "19" })]),
        acao("padrao", "Moeller Method", "Como na ficha, com +2 dados e DT 25: passando, 4d4+5 de impacto; falhando, 6d4+10 de impacto e aturdido, e o processo se repete até passar ou falhar três vezes seguidas.",
          { rolagens: [dano("Passou", "4d4+5 impacto"), dano("Falhou", "6d4+10 impacto")], resistencia: "Fortitude DT 25, repetido" }),
      ])],
    },

    {
      id: "as3.criatura.franco", livro: AS3, pagina: 29,
      nome: "Franco", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "PSIKOLERA",
      elementos: [], vd: 80,
      descricao: "Guitarrista do PSIKOLERA, fanático por fogo e explosivos, com uma guitarra lança-chamas.",
      percepcao: "1d20", iniciativa: "2d20+5",
      defesa: 16, fortitude: "2d20+5", reflexos: "2d20+10", vontade: "1d20",
      pv: 55, machucado: 27,
      atributos: [2, 2, 1, 1, 2],
      pericias: [["Acrobacia", "2d20+10"], ["Artes", "1d20+10"]],
      deslocamento: [[9, 6]],
      notas: ["Biografia nas p. 24–28; perfil como aliado na p. 118.", "O dano de Bater com Guitarra sai impresso como “d10+5”: lido como 1d10+5."],
      habilidades: [],
      acoes: [
        agredir([at("Bater com Guitarra", "corpo a corpo", 2, "2d20+5", "1d10+5 impacto")]),
        acao("padrao", "Hora do Show", "Coloca a máscara — use o seletor de forma desta ocorrência."),
        acao("padrao", "Imolar", "Força o lança-chamas ao máximo contra um ser em alcance curto. Role 1d20: 10 ou mais, o alvo sofre 8d6+10 de fogo e fica em chamas (Reflexos DT 20 reduz à metade e evita a condição); 9 ou menos, vaza combustível flamejante sobre o próprio Franco, que sofre 4d6 de fogo e fica em chamas.",
          { rolagens: [teste("Imolar (1d20: 10+ acerta)", "1d20"), dano("No alvo", "8d6+10 fogo"), dano("Em Franco", "4d6 fogo")], resistencia: "Reflexos DT 20 reduz à metade e evita em chamas" }),
        acao("padrao", "Incinerar", "Chamas da guitarra num ser em alcance curto: 6d6+5 de fogo e em chamas (Reflexos DT 20 reduz à metade e evita a condição).",
          { rolagens: [dano("Incinerar", "6d6+5 fogo")], resistencia: "Reflexos DT 20 reduz à metade e evita em chamas" }),
      ],
      formas: [horaDoShow("Franco", 29, 26, 75, "2d20+5", [], [
        agredir([at("Bater com Guitarra", "corpo a corpo", 2, "2d20+10", "3d10+5 impacto")]),
        acao("padrao", "Imolar", "Como na ficha, com +2 dados e DT 25: 10 ou mais, 10d6+10 de fogo e em chamas (Reflexos DT 25 reduz à metade e evita); 9 ou menos, Franco sofre 4d6 de fogo e fica em chamas.",
          { rolagens: [teste("Imolar (1d20: 10+ acerta)", "1d20"), dano("No alvo", "10d6+10 fogo"), dano("Em Franco", "4d6 fogo")], resistencia: "Reflexos DT 25 reduz à metade e evita em chamas" }),
        acao("padrao", "Incinerar", "Como na ficha, com +2 dados e DT 25: 8d6+5 de fogo e em chamas (Reflexos DT 25 reduz à metade e evita).",
          { rolagens: [dano("Incinerar", "8d6+5 fogo")], resistencia: "Reflexos DT 25 reduz à metade e evita em chamas" }),
      ], ["O dano que Franco sofre ao falhar em Imolar não é dano que ele causa: fica 4d6."])],
    },

    {
      id: "as3.criatura.cindy", livro: AS3, pagina: 37,
      nome: "Cindy", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "PSIKOLERA",
      elementos: [], vd: 80,
      descricao: "Baixista do PSIKOLERA, que arma o palco e move as cordas da banda a qualquer custo.",
      percepcao: "3d20+5", iniciativa: "3d20+10",
      defesa: 17, fortitude: "1d20", reflexos: "3d20+10", vontade: "3d20+5",
      pv: 50, machucado: 25,
      atributos: [3, 1, 2, 3, 1],
      pericias: [["Artes", "3d20+10"], ["Enganação", "3d20+10"]],
      deslocamento: [[9, 6]],
      notas: ["Biografia nas p. 30–36; perfil como aliado na p. 118."],
      habilidades: [],
      acoes: [
        agredir([at("Pancada com Baixo", "corpo a corpo", 2, "1d20+10", "1d6+10 impacto")]),
        agredir([at("Disparo com Baixo", "médio", 2, "3d20+10", "2d8+10 balístico", { critico: "19/x3" })], { nome: "Agredir (distância)" }),
        acao("padrao", "Hora do Show", "Coloca a máscara — use o seletor de forma desta ocorrência."),
        acao("padrao", "Silenciar", "Faz sinal de silêncio para um ser em alcance médio: 2d6 de dano mental e trêmulo por 3 rodadas (Vontade DT 20 reduz à metade e muda a duração para 1 rodada).",
          { rolagens: [dano("Silenciar", "2d6 mental")], resistencia: "Vontade DT 20 reduz à metade e trêmulo por 1 rodada" }),
      ],
      formas: [horaDoShow("Cindy", 37, 27, 70, "1d20+10", [], [
        agredir([at("Pancada com Baixo", "corpo a corpo", 2, "1d20+15", "3d6+10 impacto")]),
        agredir([at("Disparo com Baixo", "médio", 2, "3d20+15", "4d8+10 balístico", { critico: "19/x3" })], { nome: "Agredir (distância)" }),
        acao("padrao", "Silenciar", "Como na ficha, com +2 dados e DT 25: 4d6 de dano mental e trêmulo por 3 rodadas (Vontade DT 25 reduz à metade e muda para 1 rodada).",
          { rolagens: [dano("Silenciar", "4d6 mental")], resistencia: "Vontade DT 25 reduz à metade e trêmulo por 1 rodada" }),
      ])],
    },

    {
      id: "as3.criatura.caito", livro: AS3, pagina: 41,
      nome: "Caíto", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "PSIKOLERA",
      elementos: [], vd: 20,
      descricao: "Rapaz marcado desde o nascimento pela incompetência dos outros, com uma raiva contida pronta para explodir.",
      percepcao: "1d20+5", iniciativa: "2d20+5",
      defesa: 17, fortitude: "1d20", reflexos: "2d20+5", vontade: "1d20+5",
      pv: 20, machucado: 10,
      atributos: [2, 1, 2, 1, 1],
      pericias: [["Furtividade", "2d20+5"]],
      deslocamento: [[9, 6]],
      notas: [
        "Biografia nas p. 38–40; a ficha está na seção do PSIKOLERA.",
        "Ódio Suprimido é o poder de sacrifício do Rancor (p. 111); a ficha traz a versão de NPC, com DT 20 e os danos de Caíto.",
      ],
      habilidades: [],
      acoes: [
        agredir([at("Disparo de Pistola", "curto", 2, "2d20+5", "1d12+5 balístico", { critico: "18" })]),
        acao("completa", "Ódio Suprimido", "Explode de raiva, gritando, correndo e saltando sobre quem estiver no caminho. Todo ser em alcance curto faz Fortitude e Reflexos (DT 20 cada). Falhou em Fortitude: chutado e mordido, fica caído e sofre 1d4+6 de impacto. Falhou em Reflexos: atingido por um disparo, sofre 1d12+5 balístico. Depois, Caíto cai chorando e tremendo: exausto até o fim da cena.",
          { rolagens: [dano("Falhou em Fortitude", "1d4+6 impacto"), dano("Falhou em Reflexos", "1d12+5 balístico")], resistencia: "Fortitude DT 20 e Reflexos DT 20, separados" }),
      ],
    },

    /* ---------------- Couraças ---------------- */

    {
      id: "as3.criatura.ana", livro: AS3, pagina: 47,
      nome: "Ana", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Couraças",
      elementos: [], vd: 100,
      descricao: "Combatente sanguinária e apaixonada, fiel a Escarlata até o fim.",
      percepcao: "1d20+5", iniciativa: "2d20+5",
      defesa: 27, fortitude: "3d20+10", reflexos: "2d20+5", vontade: "1d20+5",
      pv: 90, machucado: 45,
      resistencias: [[5, "balístico", "impacto", "perfuração"], [10, "Sangue"]],
      vulnerabilidades: ["Morte"],
      atributos: [2, 3, 1, 1, 3],
      pericias: [["Atletismo", "3d20+10"]],
      deslocamento: [[9, 6]],
      estados: [{ id: "escarlata-morta", nome: "Escarlata morreu (Fúria Apaixonada)", maximo: 1 }],
      notas: [
        "Biografia nas p. 43–46; perfil como aliado na p. 116.",
        "Hemofagia não imprime a DT da Fortitude; a dos rituais da ficha é 20.",
      ],
      habilidades: [
        hab("Fúria Apaixonada", "Se Escarlata morrer, até o fim do combate (uma vez por cena), ação padrão para três ataques contra quem a matou — dois com a maça e um com a espada —, cada um com +1d10 de dano do mesmo tipo.",
          { limite: [1, "cena"], requer: ["escarlata-morta", 1], rolagens: [dano("Fúria (+1d10 por ataque)", "1d10")] }),
        hab("Paixão Servil", "Em alcance curto de Escarlata, +1d6 em todos os testes e rolagens; se Escarlata foi atacada desde a última rodada, +1d10.",
          { rolagens: [soma("Paixão Servil (+1d6)", "1d6"), soma("Escarlata atacada (+1d10)", "1d10")] }),
        hab("Rituais (DT 20)", "Conjura os rituais da ficha sem pagar PE, até 6 PE por conjuração, com a ação apropriada."),
      ],
      acoes: [
        agredir([
          at("Ataque com Maça", "corpo a corpo", 1, "3d20+15", "6d4+10 perfuração", { critico: "x3" }),
          at("Ataque com Espada", "corpo a corpo", 1, "3d20+15", "4d6+10 corte", { critico: "19" }),
        ]),
        acao("padrao", "Ritual: Hemofagia (Sangue 2)", "Arranca o sangue de um ser em alcance de toque pela pele: 6d6 de dano de Sangue (Fortitude reduz à metade) e Ana recupera PV iguais à metade do dano causado.",
          { rolagens: [dano("Hemofagia", "6d6 Sangue")], resistencia: "Fortitude (DT 20) reduz à metade" }),
      ],
    },

    {
      id: "as3.criatura.argano", livro: AS3, pagina: 51,
      nome: "Argano", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Couraças",
      elementos: [], vd: 100,
      descricao: "Amante leal e obstinado de Escarlata, de força devastadora e tamanho que serve de muralha.",
      percepcao: "-2d20", iniciativa: "1d20+5",
      defesa: 26, fortitude: "4d20+10", reflexos: "1d20+5", vontade: "-2d20",
      pv: 120, machucado: 60,
      resistencias: [[5, "balístico", "impacto", "perfuração"], [10, "Sangue"]],
      vulnerabilidades: ["Morte"],
      atributos: [1, 4, 1, 0, 4],
      pericias: [["Atletismo", "4d20+10"]],
      deslocamento: [[9, 6]],
      estados: [{ id: "maca-erguida", nome: "Maça erguida", maximo: 1 }],
      notas: [
        "Biografia nas p. 48–50; perfil como aliado na p. 116.",
        "Percepção e Vontade saem impressas como “–2O”: com Presença 0, o pior de dois d20 — não é um número negativo.",
      ],
      habilidades: [],
      acoes: [
        agredir([at("Maça Pesada", "corpo a corpo", 1, "4d20+15", "4d8+20 perfuração", { critico: "x3" })]),
        acao("reacao", "Guardião", "Uma vez por rodada, em alcance curto de Escarlata, sofre no lugar dela um dano direcionado a ela.", { limite: [1, "rodada"] }),
        acao("padrao", "Erguer Maça", "Ergue a maça acima da cabeça. Sozinha não faz nada, mas permite usar Golpe Arrasador (marque o estado “Maça erguida”).", { marcador: "Maça erguida" }),
        acao("padrao", "Golpe Arrasador", "Desce a maça num ser adjacente: 4d12+20 de perfuração (Fortitude DT 21 reduz à metade).",
          { requer: ["maca-erguida", 1], rolagens: [dano("Golpe Arrasador", "4d12+20 perfuração")], resistencia: "Fortitude DT 21 reduz à metade" }),
        acao("completa", "Esmagar Ossos", "Move-se e passa por cima de um ser caído ou atordoado em alcance curto, usando o peso da armadura: 4d10+20 de perfuração e fraco por um dia (Reflexos DT 21 reduz à metade e evita a condição).",
          { rolagens: [dano("Esmagar Ossos", "4d10+20 perfuração")], resistencia: "Reflexos DT 21 reduz à metade e evita fraco" }),
      ],
    },

    {
      id: "as3.criatura.chispa", livro: AS3, pagina: 57,
      nome: "Chispa", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Couraças",
      elementos: [], vd: 100,
      descricao: "Inventor rápido e eficiente, num triciclo motorizado e sempre com uma traquitana inesperada.",
      percepcao: "1d20+10", iniciativa: "3d20+5",
      defesa: 26, fortitude: "1d20+5", reflexos: "3d20+10", vontade: "1d20+10",
      pv: 90, machucado: 45,
      resistencias: [[5, "balístico", "impacto", "perfuração"], [10, "Sangue"]],
      vulnerabilidades: ["Morte"],
      atributos: [3, 1, 4, 1, 1],
      pericias: [["Pilotagem", "3d20+10"], ["Tecnologia", "4d20+10"]],
      deslocamento: [[15, 10]],
      estados: [{ id: "motor-destruido", nome: "Motor destruído", maximo: 1,
        altera: { deslocamento: [[0, 0]], desativar: ["Acelerar", "Investida com Lança"] } }],
      notas: ["Biografia nas p. 52–56; perfil como aliado na p. 116."],
      habilidades: [
        hab("Motor Frágil", "Atacar o motor na traseira do triciclo sofre –1d20 (alvo pequeno e em movimento). O motor tem Defesa 26, RD 5 e 20 PV; destruído, explode em fumaça: 4d6 de dano em Chispa (metade perfuração, metade fogo), que fica imóvel, desprevenido e perde Acelerar e Investida com Lança (marque o estado). Consertar leva 1d4+1 horas.",
          { rolagens: [dano("Explosão do motor", ["2d6 perfuração", "2d6 fogo"]), soma("Horas de conserto", "1d4+1")] }),
      ],
      acoes: [
        agredir([at("Tiro de Escopeta", "curto", 1, "3d20+15", "6d6+20 balístico", { critico: "x3" })], { nome: "Agredir (distância)" }),
        acao("reacao", "Acelerar", "Uma vez por rodada, acelera o triciclo para escapar de um ataque ou efeito: +5 na Defesa e nos testes de resistência contra ele.", { limite: [1, "rodada"] }),
        acao("padrao", "Granada Flamejante", "Atira um explosivo em alcance curto: seres a até 3 m sofrem 6d6 de fogo e ficam em chamas (Reflexos DT 21 reduz à metade e evita a condição).",
          { rolagens: [dano("Granada Flamejante", "6d6 fogo")], resistencia: "Reflexos DT 21 reduz à metade e evita em chamas" }),
        acao("completa", "Investida com Lança", "Acelera contra um ser em alcance médio. Saltar para fora: Reflexos DT 21; falhando, é trespassado (6d8+20 de perfuração). Resistir: faz um ataque contra Chispa (resolvido normalmente) e depois é trespassado; ou outra ação, com um teste de perícia DT 21 — falhando, não consegue e é trespassado.",
          { rolagens: [dano("Trespassado", "6d8+20 perfuração")], resistencia: "Reflexos DT 21 (saltar) ou perícia DT 21" }),
      ],
    },

    {
      id: "as3.criatura.torvo", livro: AS3, pagina: 63,
      nome: "Torvo", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Couraças",
      elementos: [], vd: 20,
      descricao: "Quase um cadáver animado, levado na coleira como fonte ambulante de componentes ritualísticos.",
      percepcao: "1d20", iniciativa: "1d20",
      defesa: 21, fortitude: "2d20+5", reflexos: "1d20", vontade: "1d20+10",
      pv: 30, machucado: 15,
      resistencias: [[5, "balístico", "impacto", "perfuração"], [10, "Sangue"]],
      vulnerabilidades: ["Morte"],
      atributos: [1, 1, 1, 1, 2],
      deslocamento: [[0, 0]],
      notas: ["Biografia nas p. 58–62; perfil como aliado na p. 116."],
      habilidades: [
        hab("Fonte de Rituais", "Em alcance curto de Escarlata, ela pode arrancar a vida dele sempre que causar dano com um ritual: o ritual causa +2d6 de dano do mesmo tipo e Torvo perde 2d6 PV.",
          { rolagens: [dano("No ritual de Escarlata", "2d6"), soma("PV que Torvo perde", "2d6")] }),
      ],
      acoes: [
        agredir([at("Manopla Espinhenta", "corpo a corpo", 1, "1d20+10", "1d6+5 perfuração")]),
      ],
    },

    {
      id: "as3.criatura.escarlata", livro: AS3, pagina: 69,
      nome: "Escarlata", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Couraças",
      elementos: [], vd: 120,
      descricao: "Líder dos Couraças, sedutora e manipuladora, que transforma desejo em dominação.",
      percepcao: "4d20+10", iniciativa: "3d20+10",
      defesa: 28, fortitude: "2d20+5", reflexos: "3d20+5", vontade: "4d20+10",
      pv: 100, machucado: 50,
      resistencias: [[5, "balístico", "impacto", "perfuração"], [10, "Sangue"]],
      vulnerabilidades: ["Morte"],
      atributos: [3, 2, 3, 4, 2],
      pericias: [["Atletismo", "2d20+5"], ["Enganação", "4d20+10"], ["Ocultismo", "3d20+10"]],
      deslocamento: [[9, 6]],
      notas: [
        "Biografia nas p. 64–68; perfil como aliado na p. 116.",
        "Descarnar imprime “Fortitude DT 29” para o primeiro teste; os rituais da ficha têm DT 23 (e os testes seguintes de hemorragia, também). Mantido como publicado.",
      ],
      habilidades: [
        hab("Dar o Fora", "Quem se envolveu com Escarlata (Sedução) pode tentar terminar: Vontade DT 23 mais a penalidade de 1d8 ou 2d8 (como em Dominação). Passando, os efeitos de Sedução terminam — perde os PE temporários e não é mais afetado por Dominação. Falhando, não se livra dos sentimentos, fica na bad e sofre 1d6 de dano mental; pode tentar de novo, sofrendo o dano a cada falha.",
          { rolagens: [dano("Falhou", "1d6 mental"), soma("Penalidade (um pouco a fim)", "1d8"), soma("Penalidade (muito a fim)", "2d8")] }),
        hab("Rituais (DT 23)", "Conjura os rituais da ficha sem pagar PE, até 7 PE por conjuração, com a ação apropriada."),
      ],
      acoes: [
        agredir([at("Rasgar com Garras", "corpo a corpo", 2, "3d20+15", "4d10+10 corte", { critico: "19" })]),
        acao("padrao", "Dominação", "Ordena a um ser afetado por Sedução: Vontade DT 23 ou obedece da melhor forma que puder. Ordem de mais de uma rodada: novo teste por rodada, +1 cumulativo por teste já feito; passando, anula. Em todo teste contra esta habilidade, o personagem rola 1d8 (um pouco a fim) ou 2d8 (muito a fim) como penalidade.",
          { rolagens: [soma("Penalidade (um pouco a fim)", "1d8"), soma("Penalidade (muito a fim)", "2d8")], resistencia: "Vontade DT 23 menos a penalidade" }),
        acao("padrao", "Ritual: Descarnar (Discente, Sangue 2)", "Toca um ser: 10d8 de dano (metade corte, metade Sangue) e hemorragia (Fortitude DT 29 reduz à metade e evita a hemorragia). Com hemorragia, no início de cada turno, Fortitude DT 23: falhando, 4d8 de Sangue; passando dois seguidos, estanca.",
          { rolagens: [dano("Descarnar", ["5d8 corte", "5d8 Sangue"]), dano("Hemorragia", "4d8 Sangue")], resistencia: "Fortitude DT 29 (depois DT 23 por turno)" }),
        acao("padrao", "Ritual: Flagelo de Sangue (Discente, Sangue 2)", "Toca um ser (exceto criaturas de Sangue) e grava uma marca com uma ordem, até o fim da cena. A cada rodada em que desobedecer, 10d6 de Sangue e enjoado pela rodada (Fortitude DT 23 reduz à metade e evita a condição); passando dois turnos seguidos, a marca some.",
          { rolagens: [dano("Flagelo", "10d6 Sangue")], resistencia: "Fortitude DT 23 reduz à metade e evita enjoado" }),
        acao("padrao", "Ritual: Hemofagia (Discente, Sangue 2)", "Faz um ataque com garras como parte do ritual. Acertando, além do dano das garras, causa +6d6 de Sangue e recupera PV iguais à metade do dano total.",
          { ataques: [at("Rasgar com Garras", "corpo a corpo", 1, "3d20+15", ["4d10+10 corte", "6d6 Sangue"], { critico: "19" })] }),
        acao("padrao", "Sedução", "Flerta com um personagem, que decide como se sente: não ficou a fim (nada); um pouco a fim (+1d8 PE temporários e suscetível a Dominação); muito a fim (+2d8 PE temporários e suscetível). Duram até ele Dar o Fora.",
          { rolagens: [soma("PE temporários (um pouco)", "1d8"), soma("PE temporários (muito)", "2d8")] }),
      ],
    },

    {
      id: "as3.criatura.miasma", livro: AS3, pagina: 73,
      nome: "Miasma", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Couraças",
      elementos: [], vd: 40,
      descricao: "Servo do prazer e da paixão por Escarlata, que acorrenta os outros na mesma obsessão.",
      percepcao: "1d20", iniciativa: "2d20+5",
      defesa: 18, fortitude: "2d20+5", reflexos: "2d20", vontade: "1d20",
      pv: 30, machucado: 15,
      atributos: [2, 2, 1, 1, 2],
      deslocamento: [[9, 6]],
      notas: [
        "Biografia nas p. 70–72; a ficha está na seção dos Couraças.",
        "Despertar Obsessão é o poder de sacrifício da Obsessão (p. 110); a ficha traz a versão de NPC (DT 25, correntada à distância, obsessão por Escarlata).",
      ],
      habilidades: [],
      acoes: [
        agredir([at("Golpe com Correntes", "corpo a corpo", 1, "2d20+5", "2d8+5 impacto")]),
        acao("padrao", "Despertar Obsessão", "Encara uma pessoa em alcance curto, que escolhe: desviar o olhar (Miasma aproveita e dá uma correntada, mesmo à distância: 2d8+5 de impacto) ou encarar (Vontade DT 25; falhando, por 1 rodada gasta todas as ações para se aproximar de Escarlata e adorá-la — se não quiser, ataca a si mesma e o efeito termina).",
          { rolagens: [dano("Desviou o olhar", "2d8+5 impacto")], resistencia: "Vontade DT 25 (se encarar)" }),
      ],
    },

    /* ---------------- Pássaros ---------------- */

    {
      id: "as3.criatura.coruja", livro: AS3, pagina: 81,
      nome: "Coruja", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Pássaros",
      elementos: [], vd: 40,
      descricao: "Esperta e observadora, cozinha para o grupo e compartilha tudo o que sabe.",
      percepcao: "2d20+10", iniciativa: "3d20+10",
      defesa: 19, fortitude: "1d20", reflexos: "3d20+10", vontade: "2d20+5",
      pv: 50, machucado: 25,
      atributos: [3, 1, 3, 2, 1],
      pericias: [["Adestramento", "2d20+10"], ["Atualidades", "3d20+10"], ["Ciências", "3d20+10"], ["Furtividade", "3d20+10"], ["Sobrevivência", "3d20+10"]],
      deslocamento: [[9, 6]],
      notas: ["Biografia nas p. 76–80; perfil como aliado na p. 117.", "Os rituais saem impressos com “CD20”: lido como DT 20."],
      habilidades: [
        hab("Dardos Sedativos", "Um alvo atingido por um dardo fica sedado (inconsciente) até ser acordado ou até o fim da cena (Fortitude DT 20 evita).", { resistencia: "Fortitude DT 20 evita" }),
        hab("Rituais (DT 20)", "Conjura os rituais da ficha sem pagar PE, até 4 PE por conjuração, com a ação apropriada."),
        hab("Validação de Hipótese", "Num acerto crítico, recebe +1d20 em testes contra o mesmo alvo.", { marcador: "+1d20 contra o alvo" }),
      ],
      acoes: [
        agredir([at("Tiro de Zarabatana", "curto", 1, "3d20+10", "1d4+1 perfuração", { critico: "19", nota: "mais o sedativo" })], { nome: "Agredir (distância)" }),
        acao("padrao", "Ritual: Aprimorar Físico (Sangue 2)", "Tonifica 1 ser em alcance de toque: +1 em Agilidade ou Força, à escolha dele, até o fim da cena."),
        acao("padrao", "Ritual: Aprimorar Mente (Conhecimento 2)", "Alimenta com sigilos a mente de 1 ser em alcance de toque: +1 em Intelecto ou Presença, à escolha dele, até o fim da cena."),
      ],
    },

    {
      id: "as3.criatura.corvo", livro: AS3, pagina: 88,
      nome: "Corvo", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Pássaros",
      elementos: [], vd: 40,
      descricao: "Ocultista didático, fascinado pelo fim inevitável de todas as coisas.",
      percepcao: "2d20+10", iniciativa: "3d20+10",
      defesa: 18, fortitude: "1d20+5", reflexos: "2d20+5", vontade: "3d20+10",
      pv: 60, machucado: 30,
      atributos: [2, 1, 3, 3, 1],
      pericias: [["Adestramento", "3d20+10"], ["Atualidades", "3d20+10"], ["Furtividade", "3d20+10"], ["Ocultismo", "3d20+10"], ["Sobrevivência", "3d20+10"]],
      deslocamento: [[9, 6]],
      notas: [
        "Biografia nas p. 82–87; perfil como aliado na p. 117. O animal Corvo (p. 133) é outra entrada.",
        "Os rituais saem impressos com “CD 20”: lido como DT 20. Definhar imprime DT 15; mantido.",
      ],
      habilidades: [
        hab("Rituais (DT 20)", "Conjura os rituais da ficha sem pagar PE, até 4 PE por conjuração, com a ação apropriada."),
        hab("Silêncio Fúnebre", "Morto, o corpo recebe 30 PV temporários e vira mau agouro: testes contra aliados do Corvo num raio de 30 m do corpo sofrem –2d20. Dura até o fim da cena ou até os PV temporários acabarem.",
          { marcador: "Corpo de mau agouro (30 PV temporários)" }),
      ],
      acoes: [
        agredir([at("Pancada", "corpo a corpo", 1, "1d20+5", "1d4+5 impacto")]),
        acao("livre", "Ritual: Esconder os Olhos (Conhecimento 1)", "Fica invisível por 1 rodada, com o equipamento: camuflagem total e +15 em Furtividade; quem não pode vê-lo fica desprevenido contra os ataques dele. Termina se ele atacar ou usar uma habilidade hostil (ações contra objetos livres e dano indireto não dissipam). Objetos soltos voltam a aparecer; luz transportada nunca fica invisível."),
        acao("padrao", "Ritual: Cicatrização (Discente, Morte 1)", "Acelera o tempo nas feridas de 1 ser adjacente: ele recupera 5d8+5 PV, mas envelhece 1 ano.",
          { rolagens: [soma("PV recuperados", "5d8+5")] }),
        acao("padrao", "Ritual: Definhar (Discente, Morte 1)", "Lufada de cinzas num ser em alcance curto: exausto até o fim da cena (Fortitude DT 15 muda para fatigado).",
          { resistencia: "Fortitude DT 15 muda para fatigado" }),
        acao("padrao", "Ritual: Tecer Ilusão (Discente, Conhecimento 1)", "Ilusão em alcance médio, até 8 cubos de 1,5 m, até o fim da cena: visual, sonora, tátil, térmica e/ou olfativa, mas só imagens e sons simples (volume de uma voz por cubo), sem cheiros, texturas, temperaturas nem sons complexos. Seres e objetos a atravessam; é dissipada se Corvo sair do alcance."),
      ],
    },

    {
      id: "as3.criatura.papagaio", livro: AS3, pagina: 92,
      nome: "Papagaio", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Pássaros",
      elementos: [], vd: 40,
      descricao: "Malandro de chá, piada e cachimbo, que se vira em qualquer situação.",
      percepcao: "3d20+10", iniciativa: "2d20+10",
      defesa: 21, fortitude: "1d20+5", reflexos: "2d20+5", vontade: "3d20+10",
      pv: 60, machucado: 30,
      atributos: [2, 2, 1, 3, 2],
      pericias: [["Adestramento", "3d20+10"], ["Artes", "3d20+5"], ["Crime", "2d20+10"], ["Diplomacia", "3d20+10"], ["Enganação", "3d20+10"]],
      deslocamento: [[9, 6]],
      notas: ["Biografia nas p. 89–91; perfil como aliado na p. 117."],
      habilidades: [],
      acoes: [
        agredir([at("Garrafada", "corpo a corpo", 2, "2d20+10", "1d4+10 impacto")]),
        acao("padrao", "Cachimbo do Capeta", "Sopra a fumaça do cachimbo num alvo adjacente: asfixiado, e precisa gastar uma ação padrão para recuperar o fôlego (Fortitude DT 20 evita).",
          { resistencia: "Fortitude DT 20 evita" }),
        acao("livre", "Desarmar", "Acertando um ataque com a garrafa, tenta desarmar o alvo.", { rolagens: [teste("Desarmar", "2d20+15")] }),
      ],
    },

    {
      id: "as3.criatura.pomba", livro: AS3, pagina: 95,
      nome: "Pomba", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Pássaros",
      elementos: [], vd: 40,
      descricao: "Explorador nato, que desenha cada mapa para ninguém se perder.",
      percepcao: "2d20+10", iniciativa: "2d20+5",
      defesa: 20, fortitude: "2d20+5", reflexos: "2d20+5", vontade: "2d20+10",
      pv: 50, machucado: 25,
      atributos: [2, 1, 3, 3, 1],
      pericias: [["Atletismo", "1d20+15"], ["Ciências", "2d20+10"], ["Furtividade", "2d20+5"], ["Intuição", "2d20+10"], ["Investigação", "2d20+10"], ["Percepção", "2d20+10"], ["Pilotagem", "2d20+5"], ["Sobrevivência", "2d20+5"]],
      deslocamento: [[9, 6]],
      notas: ["Biografia nas p. 93–94; perfil como aliado na p. 117."],
      habilidades: [
        hab("Ensinamentos do Ninho", "Depois de presenciar a morte de um aliado, até o fim da cena, pode usar uma única vez qualquer habilidade que o parceiro falecido conhecia.", { marcador: "Habilidade do parceiro usada" }),
        hab("Voe para Longe", "Na primeira rodada de um combate, pode se mover até o dobro do deslocamento com uma única ação de movimento."),
      ],
      acoes: [
        agredir([at("Ataque com Canivete", "corpo a corpo", 2, "2d20+10", "1d4+5 corte")]),
      ],
    },

    {
      id: "as3.criatura.harpia", livro: AS3, pagina: 101,
      nome: "Harpia", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Pássaros",
      elementos: [], vd: 80,
      descricao: "Líder atento e convicto dos Pássaros, sempre cuidando dos companheiros, com aves adestradas.",
      percepcao: "2d20+10", iniciativa: "3d20+10",
      defesa: 22, fortitude: "3d20+10", reflexos: "3d20+10", vontade: "2d20+5",
      pv: 100, machucado: 50,
      atributos: [3, 3, 2, 2, 3],
      pericias: [["Adestramento", "2d20+10"], ["Atletismo", "3d20+10"], ["Furtividade", "3d20+10"], ["Sobrevivência", "2d20+10"], ["Tática", "2d20+10"]],
      deslocamento: [[9, 6]],
      notas: ["Biografia nas p. 96–100; perfil como aliado na p. 117. A arma dele é a Garra do Harpia (p. 112)."],
      habilidades: [],
      acoes: [
        agredir([at("Garra do Harpia", "corpo a corpo", 2, "3d20+10", "2d8+10 corte", { critico: "19" })]),
        agredir([at("Pistola", "curto", 2, "3d20+10", "1d12+10 balístico", { critico: "18" })], { nome: "Agredir (distância)" }),
        acao("livre", "Agarrar", "Acertando um ataque com a garra, tenta agarrar o alvo.", { rolagens: [teste("Agarrar", "3d20+15")] }),
        acao("livre", "Assobio do Harpia", "Uma vez por rodada, as aves avançam sobre um alvo em alcance longo com um efeito: Cegar (3d6 de perfuração e cego por 1 rodada; Reflexos DT 20 reduz à metade e evita), Distrair (pasmo por 1 rodada; Vontade DT 20 evita; um mesmo alvo uma vez por cena) ou Sangrar (5d6 de perfuração e sangrando; Fortitude DT 20 reduz à metade e evita).",
          { limite: [1, "rodada"], rolagens: [dano("Cegar", "3d6 perfuração"), dano("Sangrar", "5d6 perfuração")], resistencia: "Reflexos, Vontade ou Fortitude DT 20, conforme o efeito" }),
      ],
    },

    {
      id: "as3.criatura.suellen", livro: AS3, pagina: 105,
      nome: "Suellen", natureza: "humana", tipo: "Pessoa", tamanho: "Médio", categoria: "Pássaros",
      elementos: [], vd: 20,
      descricao: "Criança doente, adolescente doente e, por fim, adulta cruel, que morreu pelo que praticou.",
      percepcao: "2d20+5", iniciativa: "1d20+5",
      defesa: 15, fortitude: "2d20+5", reflexos: "2d20+5", vontade: "2d20+5",
      pv: 30, machucado: 15,
      atributos: [1, 2, 2, 2, 2],
      pericias: [["Adestramento", "2d20+10"], ["Atualidades", "2d20+10"], ["Enganação", "2d20+10"]],
      deslocamento: [[9, 6]],
      notas: [
        "Biografia nas p. 102–104; a ficha está na seção dos Pássaros.",
        "A ficha imprime a linha de atributos duas vezes, em ordens diferentes, com os mesmos valores.",
        "Estimular Hedonismo é o poder de sacrifício do Prazer (p. 111); a ficha traz a versão de NPC, com DT 20.",
      ],
      habilidades: [],
      acoes: [
        agredir([at("Golpe com Cutelo", "corpo a corpo", 1, "2d20+5", "1d8+5 corte")]),
        acao("padrao", "Estimular Hedonismo", "Uma pessoa em alcance curto é tomada por uma onda de prazer insana (Vontade DT 20 evita): perde o senso de autopreservação e fica indefesa por 1 rodada.",
          { resistencia: "Vontade DT 20 evita" }),
      ],
    },

    /* Perfis "como aliado" (OPRPG p. 170) do Arquivos Secretos 3: as
       equipes (p. 116-118) e os animais treinados (p. 133). */
    aliadoAs3("ana", "Ana", 116, 47, "Combatente sanguinária, habilidosa, apaixonada e fiel.", [
      hab("Bônus", "Sempre que causa dano com um ataque corpo a corpo, você também causa +1 dado de dano do mesmo tipo."),
      hab("Dupla Empunhadura", "1 PE: usa Combater com Duas Armas como se tivesse. Se já tiver, não sofre a penalidade de –1d20.", { custo: "1 PE" }),
    ], "Aliada"),
    aliadoAs3("argano", "Argano", 116, 51, "Amante leal, obstinado e muito forte, que serve de cobertura.", [
      hab("Bônus", "Sempre que causa dano, você também causa +1d12 de perfuração.", { rolagens: [dano("Bônus de Argano", "1d12 perfuração")] }),
      hab("Cobertura Viva", "1 PE: cobertura leve, até você se mover.", { custo: "1 PE", marcador: "Cobertura leve (até se mover)" }),
    ]),
    aliadoAs3("chispa", "Chispa", 116, 57, "Inteligente, rápido, eficiente e sempre com uma traquitana útil.", [
      hab("Bônus", "+9 m de deslocamento."),
      hab("Traquitana Explosiva", "Uma vez por cena de combate, 1 PE: Chispa te dá uma granada (escolha o tipo, OPRPG p. 64).", { custo: "1 PE", limite: [1, "combate"] }),
    ]),
    aliadoAs3("escarlata", "Escarlata", 116, 69, "Seduz e manipula quem acha interessante, mas sempre com algum bônus.", [
      hab("Bônus", "+5 em todo teste feito para proteger ou beneficiar a Escarlata."),
      hab("A Dor do Amor", "Perca 1d8+1 PV para agraciá-la: ela retribui com 10 PE temporários.", { rolagens: [soma("PV perdidos", "1d8+1")] }),
    ], "Aliada"),
    aliadoAs3("torvo", "Torvo", 116, 63, "Só acompanha quem o mantém na coleira; o sofrimento dele é fonte para o Outro Lado.", [
      hab("Bônus", "Rituais de Sangue dispensam componentes ritualísticos e custam 1 PE a menos (cumulativo com outras reduções)."),
      hab("Catalisador Vivo", "Ao conjurar um ritual de Sangue, 1 PE aplica o efeito de um catalisador ritualístico à sua escolha.", { custo: "1 PE" }),
    ]),
    aliadoAs3("coruja", "Coruja", 117, 81, "Esperta, observadora e disposta a compartilhar o que sabe.", [
      hab("Bônus", "Escolha duas perícias de Intelecto: você é considerado treinado nelas."),
      hab("Olhos Treinados", "Ao atacar, 2 PE ignoram cobertura leve e camuflagem leve.", { custo: "2 PE" }),
    ], "Aliada"),
    aliadoAs3("harpia", "Harpia", 117, 101, "Líder atento e convicto, sempre cuidando dos companheiros.", [
      hab("Bônus", "Você não fica desprevenido contra inimigos que não pode ver e, ao errar um ataque por camuflagem, pode rolar mais uma vez o dado da chance de falha."),
      hab("Aves de Rapina", "Ao atacar, 2 PE fazem as aves de Harpia deixarem o alvo desprevenido.", { custo: "2 PE" }),
    ]),
    aliadoAs3("corvo", "Corvo", 117, 88, "Ocultista didático, fascinado pelo fim inevitável de todas as coisas.", [
      hab("Bônus", "Uma vez por cena, ao sofrer dano que o deixaria com 0 PV, você fica com 1 PV.", { limite: [1, "cena"] }),
      hab("Pela Hora da Morte", "Uma vez por rodada, 2 PE: todos os seres que você escolher e estiverem machucados na cena perdem 1d8 PV.",
        { custo: "2 PE", limite: [1, "rodada"], rolagens: [soma("PV perdidos", "1d8")] }),
    ], "Aliado", ["É o Corvo dos Pássaros (pessoa). O animal treinado Corvo (p. 133) é o perfil “Corvo (animal)”."]),
    aliadoAs3("papagaio", "Papagaio", 117, 92, "Malandro que se vira em qualquer situação, faz um bom chá e acalma os ânimos com piadinhas.", [
      hab("Bônus", "No fim de uma cena de interlúdio, você recupera 1d6 PE.", { rolagens: [soma("PE recuperados", "1d6")] }),
      hab("Meter o Migué", "Uma vez por cena, num teste de perícia, 2 PE trocam o atributo do teste por outro à sua escolha.", { custo: "2 PE", limite: [1, "cena"] }),
    ]),
    aliadoAs3("pomba", "Pomba", 117, 95, "Explorador nato dos caminhos urbanos e da natureza.", [
      hab("Bônus", "Você é considerado treinado em Crime e Sobrevivência; se já for, recebe +2."),
      hab("Atalhos em Todo Lugar", "Uma vez por rodada, 2 PE dão uma ação de movimento adicional, só para se deslocar.", { custo: "2 PE", limite: [1, "rodada"] }),
    ]),
    aliadoAs3("ale", "Alê", 118, 11, "Grande intuição ou vislumbres proféticos: parece saber tudo o que pode dar errado.", [
      hab("Bônus", "Uma vez por cena, você pode rolar um teste de novo e escolher o melhor resultado.", { limite: [1, "cena"], especial: "rolarDeNovoMelhor" }),
      hab("Prever Resultados", "Uma vez por missão, 2 PE: role 2d20 e anote. Até o fim da missão, em qualquer teste seu ou de outro ser (mesmo fora da sua vista), troque o d20 mais alto por um dos valores anotados — ele vale no lugar, mesmo se for menor. Cada valor só se usa uma vez.",
        { custo: "2 PE", limite: [1, "missão"], especial: "trocarPorGuardado", rolagens: [soma("Valores anotados", "2d20")] }),
    ]),
    aliadoAs3("caio", "Caio", 118, 17, "Não se importa de ficar para trás se for para causar um estardalhaço e distrair quem puder.", [
      hab("Bônus", "+1d20 em testes de Furtividade (Caio chama mais atenção que você)."),
      hab("Barulheira", "Uma vez por cena, 1 PE: a barulheira faz todo teste de inimigos na cena que não tenha Caio como único alvo sofrer –1d20.", { custo: "1 PE", limite: [1, "cena"], marcador: "Barulheira (–1d20 nos inimigos)" }),
    ]),
    aliadoAs3("cindy", "Cindy", 118, 37, "Arma o palco, move as cordas dos seus bonequinhos e garante o sucesso a qualquer custo.", [
      hab("Bônus", "+5 em Diplomacia, Enganação e Intimidação, exceto contra a Cindy."),
      hab("Tiro de Aviso", "Ao acertar um ataque, 2 PE: Cindy dispara uma rajada e você causa +2d8 de dano balístico.", { custo: "2 PE", rolagens: [dano("Tiro de Aviso", "2d8 balístico")] }),
    ], "Aliada"),
    aliadoAs3("eloy", "Eloy", 118, 23, "Braços largos, energia ilimitada, personalidade cativante — um baterista capaz de esmagar crânios.", [
      hab("Bônus", "Você recebe resistência a dano 5."),
      hab("Porrada Rítmica", "Uma vez por rolagem de dano, 1 PE: role de novo todos os resultados 1 ou 2. Os novos valem, mesmo se forem menores.", { custo: "1 PE", especial: "rolarDeNovoObrigatorio" }),
    ]),
    aliadoAs3("franco", "Franco", 118, 29, "Fanático por fogo e explosivos, sempre disposto a ver tudo queimar.", [
      hab("Bônus", "+1d20 em testes para quebrar objetos e +1d6 de dano do mesmo tipo neles.", { rolagens: [dano("Contra objetos (+1d6)", "1d6")] }),
      hab("Fogo em Geral", "Ao atacar um alvo, 1 PE o deixa em chamas.", { custo: "1 PE" }),
    ]),
    aliadoAnimal("serpente", "Serpente", "Réptil Squamata de corpo alongado e escamoso, sem patas nem pálpebras.", [
      hab("Bônus", "+2 em Enganação e Intimidação."),
      hab("Peçonhenta", "Ao causar dano num alvo, 1 PE causa também a perda de 1d12 PV por veneno.", { custo: "1 PE", rolagens: [soma("PV perdidos (veneno)", "1d12")] }),
    ]),
    aliadoAnimal("corvo", "Corvo", "Ave inteligente e onívora do gênero Corvus, de plumagem geralmente preta e grande porte.", [
      hab("Bônus", "+2 em Percepção e Sobrevivência."),
      hab("Ataque os Olhos", "Ao causar dano num alvo, 1 PE o deixa ofuscado por 1 rodada; num acerto crítico, cego por 1 rodada.", { custo: "1 PE" }),
    ]),
    aliadoAnimal("gato", "Gato", "Mamífero carnívoro Felidae: agilidade, garras retráteis, caça e independência.", [
      hab("Bônus", "+2 em Percepção e Reflexos."),
      hab("Visão Noturna", "Na escuridão (exceto paranormal), 1 PE: o gato fica alerta por você até o fim da cena — como visão na penumbra (OPRPG p. 180).", { custo: "1 PE", marcador: "Visão na penumbra até o fim da cena" }),
    ]),
  ];

  /* ---------------------------------------------------------------------
     As cinco facetas do Anfitrião (OPRPG p. 278, "Ato 1"): cada uma com
     as estatísticas dele, 250 PV, resistência a dano 20 e só as ações
     que têm o próprio nome. São VARIANTES — id próprio, mas `variante.de`
     aponta a ficha base, que continua sendo a do Ato 2.
     --------------------------------------------------------------------- */
  (function facetas() {
    var base = CRIATURAS.filter(function (c) { return c.id === "op.criatura.o-anfitriao"; })[0];
    if (!base) return;
    ["Amphitruo", "Aeneas", "Liber", "Silenus", "Plautus"].forEach(function (nome) {
      var f = JSON.parse(JSON.stringify(base));
      f.id = base.id + "." + nome.toLowerCase();
      f.nome = "O Anfitrião — " + nome;
      f.variante = { de: base.id, rotulo: "Faceta do Ato 1" };
      f.descricao = "Faceta " + nome + " do Anfitrião no Ato 1. Quando todas as facetas caem, o Anfitrião volta à forma única (Ato 2).";
      f.pv = 250;
      f.machucado = null;
      f.resistencias = [[20, "dano"]];
      f.estados = [];
      f.habilidades = [];
      f.acoes = base.acoes.filter(function (a) { return a.nome.indexOf("(" + nome + ")") >= 0; })
        .map(function (a) { return JSON.parse(JSON.stringify(a)); });
      delete f.enigma;
      f.notas = [
        "O livro dá 250 PV e resistência a dano 20 a cada faceta, sem valor de machucado.",
        "A ficha base também lista imunidade a dano, como impresso; o mestre decide como ela convive com a resistência da faceta.",
      ];
      CRIATURAS.push(f);
    });
  })();

  global.RAMAOrdemCriaturasDados = {
    versao: 1,
    fontes: {
      OPRPG: { nome: "Ordem Paranormal RPG", sigla: "LB" },
      SAH: { nome: "Sobrevivendo ao Horror", sigla: "SAH" },
      AS1: { nome: "Arquivos Secretos 1", sigla: "AS1" },
      AS2: { nome: "Arquivos Secretos 2", sigla: "AS2" },
      AS3: { nome: "Arquivos Secretos 3", sigla: "AS3" },
    },
    criaturas: CRIATURAS,
  };
})(typeof window !== "undefined" ? window : globalThis);
