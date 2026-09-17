/* =====================================================================
   R.A.M.A. — Ordem Paranormal · catálogo de rituais (dados)
   =====================================================================
   Os rituais oficiais dos dois livros, como DADOS — sem tela e sem
   regra. Quem lê, normaliza, busca e transforma em ritual de ficha é
   js/ordem/rituais.js.

   Este arquivo NÃO vem com a ficha: ele é carregado na primeira vez que
   alguém abre "Da biblioteca" na aba Rituais, e nunca vai junto na
   gravação da ficha. O ritual que entra na ficha é uma CÓPIA; mudar uma
   entrada daqui não muda ritual nenhum já adicionado.

   ---------------------------------------------------------------------
   FONTES
   ---------------------------------------------------------------------

     OPRPG  Ordem Paranormal RPG — Livro de Regras, v1.1 (Jambô, 2022)
            Rituais (p. 117–143): regras em 117–121, lista em 122–123 e
            descrições em 124–143
     SAH    Sobrevivendo ao Horror, v1.2 (Jambô, 2024)
            Novos Rituais (p. 48–56)

   As páginas são as do livro, não as do PDF. Os resumos são redação
   própria: guardam os números, as condições e os testes que o jogo
   precisa, e não reproduzem o texto dos livros.

   ---------------------------------------------------------------------
   FORMATO DE UMA ENTRADA
   ---------------------------------------------------------------------

     id          estável: op.ritual.<nome> ou sah.ritual.<nome>. Nunca
                 muda, mesmo que o nome mude
     elemento    a chave do elemento, ou uma LISTA quando o livro dá o
                 mesmo ritual a mais de um (Amaldiçoar Arma)
     circulo     1 a 4. O custo em PE da forma básica sai do círculo
                 (Tabela 5.2: 1 PE, 3 PE, 6 PE, 10 PE)
     execucao    a ação que conjurar exige, como o livro escreve
     alcance     pessoal, toque, curto, médio, longo, extremo, ilimitado
     alvo        \
     area        | UM dos três, exatamente como o livro apresenta: são
     efeito      / informações diferentes e não se misturam
     duracao     instantânea, cena, sustentada, permanente, definida…
     resistencia o teste e o que ele faz ("Vontade anula"); ausente
                 quando o ritual não permite resistência
     resumo      o que o ritual faz, em redação própria
     efeitos     detalhes mecânicos em frases curtas, quando ajudam
     versoes     as formas avançadas que EXISTEM para aquele ritual:
                 { nome, custo (PE ADICIONAIS), requisito, alteracoes,
                   dano, danoExtra, rolagens }
     rolagens    rolagens que não são dano: { tipo, rotulo, expressao,
                 extra } — cura, PV temporários, e por aí
     escolha     o que a pessoa decide ao adicionar (o elemento de
                 Amaldiçoar Arma)
     notas       divergências entre tabela e texto, ou entre os livros

   O custo da forma básica NÃO é repetido em cada entrada: ele é o do
   círculo. O `custo` de uma versão é o ACRÉSCIMO que o livro informa
   ("Discente (+3 PE)"), nunca o total — quem soma é js/ordem/rituais.js.

   ---------------------------------------------------------------------
   COMO O TEXTO DOS LIVROS FOI NORMALIZADO
   ---------------------------------------------------------------------

   O valor dos campos é o do livro; o que muda é a forma de escrever,
   igual em todas as entradas:

     · medidas com espaço e "de": "esfera com 6m de raio" fica "esfera
       de 6 m de raio";
     · a linha "Alvos:" (plural, em alguns rituais) entra no campo
       `alvo`, como nos outros;
     · o SAH escreve "Execução ação padrão"; aqui fica "padrão", como no
       livro básico;
     · os dados de penalidade e bônus que o livro imprime como ícone
       ("–O", "+O") aparecem escritos: "−1 dado", "+1 dado";
     · Purgatório traz "Alvo: área de 6 m de raio" — o valor é uma área e
       está em `area`, com nota na entrada;
     · Dissipar Ritual traz "Alvo ou Área": o ritual aceita os dois, e
       cada um está no seu campo, com nota na entrada.

   Divergências de conteúdo (e não de escrita) estão em `notas`, entrada
   por entrada.
   ===================================================================== */

(function (global) {
  "use strict";

  var OP = "OPRPG";
  var SAH = "SAH";

  var CO = "conhecimento";
  var EN = "energia";
  var MO = "morte";
  var SA = "sangue";
  var ME = "medo";

  var RITUAIS = [

    /* =================================================================
       LIVRO BÁSICO — OPRPG p. 124–143, em ordem alfabética
       ================================================================= */

    { id: "op.ritual.alterar-destino", nome: "Alterar Destino", elemento: EN, circulo: 4, fonte: OP, pagina: 124,
      execucao: "reação", alcance: "pessoal", alvo: "você", duracao: "instantânea",
      resumo: "Você lê milhões de futuros possíveis e escolhe o melhor: +15 em um teste de resistência ou na Defesa contra um ataque.",
      versoes: [
        { nome: "Verdadeiro", custo: 5, alteracoes: "Alcance curto e alvo “um aliado à sua escolha”." },
      ] },

    { id: "op.ritual.alterar-memoria", nome: "Alterar Memória", elemento: CO, circulo: 3, fonte: OP, pagina: 124,
      execucao: "padrão", alcance: "toque", alvo: "1 pessoa", duracao: "instantânea", resistencia: "Vontade anula",
      resumo: "Você entra na mente do alvo e apaga ou altera o que ele lembra da última hora — dá para mudar detalhes de eventos recentes, não reescrevê-los. O alvo recupera as memórias em 1d4 dias.",
      versoes: [
        { nome: "Verdadeiro", custo: 4, requisito: "4º círculo", alteracoes: "Alcança memórias de até 24 horas atrás." },
      ] },

    { id: "op.ritual.amaldicoar-arma", nome: "Amaldiçoar Arma", elemento: [CO, EN, MO, SA], circulo: 1, fonte: OP, pagina: 124,
      execucao: "padrão", alcance: "toque", alvo: "1 arma corpo a corpo ou pacote de munição", duracao: "cena",
      escolha: { tipo: "elemento", rotulo: "Elemento do ritual", opcoes: [CO, EN, MO, SA] },
      resumo: "A arma ou a munição é imbuída com o elemento escolhido e passa a causar +1d6 de dano daquele tipo. O elemento é escolhido ao aprender o ritual e vale para sempre.",
      versoes: [
        { nome: "Normal", dano: "1d6" },
        { nome: "Discente", custo: 2, requisito: "2º círculo", alteracoes: "O bônus de dano vira +2d6.", dano: "2d6" },
        { nome: "Verdadeiro", custo: 5, requisito: "3º círculo e afinidade", alteracoes: "O bônus de dano vira +4d6.", dano: "4d6" },
      ] },

    { id: "op.ritual.amaldicoar-tecnologia", nome: "Amaldiçoar Tecnologia", elemento: EN, circulo: 1, fonte: OP, pagina: 124,
      execucao: "padrão", alcance: "toque", alvo: "1 acessório ou arma de fogo", duracao: "cena",
      resumo: "O item funciona acima da própria capacidade: ganha uma modificação à sua escolha.",
      versoes: [
        { nome: "Discente", custo: 2, requisito: "2º círculo", alteracoes: "Duas modificações." },
        { nome: "Verdadeiro", custo: 5, requisito: "3º círculo e afinidade", alteracoes: "Três modificações." },
      ] },

    { id: "op.ritual.ancora-temporal", nome: "Âncora Temporal", elemento: MO, circulo: 3, fonte: OP, pagina: 124,
      execucao: "padrão", alcance: "curto", alvo: "1 ser", duracao: "cena", resistencia: "Vontade parcial",
      resumo: "Uma aura espiralada prende o alvo a um ponto: no início de cada turno dele, Vontade; falhando, ele não se desloca naquele turno (ainda pode agir). Dois sucessos seguidos encerram o efeito.",
      versoes: [
        { nome: "Verdadeiro", custo: 4, requisito: "4º círculo", alteracoes: "O alvo passa a ser “seres à sua escolha”." },
      ] },

    { id: "op.ritual.aprimorar-fisico", nome: "Aprimorar Físico", elemento: SA, circulo: 2, fonte: OP, pagina: 125,
      execucao: "padrão", alcance: "toque", alvo: "1 ser", duracao: "cena",
      resumo: "Músculos tonificados e ligamentos reforçados: o alvo recebe +1 em Agilidade ou Força, à escolha dele.",
      versoes: [
        { nome: "Discente", custo: 3, requisito: "3º círculo", alteracoes: "O bônus vira +2." },
        { nome: "Verdadeiro", custo: 7, requisito: "4º círculo e afinidade", alteracoes: "O bônus vira +3." },
      ] },

    { id: "op.ritual.aprimorar-mente", nome: "Aprimorar Mente", elemento: CO, circulo: 2, fonte: OP, pagina: 125,
      execucao: "padrão", alcance: "toque", alvo: "1 ser", duracao: "cena",
      resumo: "A mente do alvo é energizada: +1 em Intelecto ou Presença, à escolha dele. O aumento não dá PE nem perícias treinadas.",
      versoes: [
        { nome: "Discente", custo: 3, requisito: "3º círculo", alteracoes: "O bônus vira +2." },
        { nome: "Verdadeiro", custo: 7, requisito: "4º círculo e afinidade", alteracoes: "O bônus vira +3." },
      ] },

    { id: "op.ritual.arma-atroz", nome: "Arma Atroz", elemento: SA, circulo: 1, fonte: OP, pagina: 125,
      execucao: "padrão", alcance: "toque", alvo: "1 arma corpo a corpo", duracao: "sustentada",
      resumo: "Veias carmesim cobrem a arma, que passa a dar +2 em testes de ataque e +1 na margem de ameaça.",
      versoes: [
        { nome: "Discente", custo: 2, requisito: "2º círculo", alteracoes: "O bônus de ataque vira +5." },
        { nome: "Verdadeiro", custo: 5, requisito: "3º círculo e afinidade", alteracoes: "+5 em ataque, +2 na margem de ameaça e +2 no multiplicador de crítico." },
      ] },

    { id: "op.ritual.armadura-de-sangue", nome: "Armadura de Sangue", elemento: SA, circulo: 1, fonte: OP, pagina: 125,
      execucao: "padrão", alcance: "pessoal", alvo: "você", duracao: "cena",
      resumo: "Seu sangue endurece sobre o corpo como carapaça: +5 na Defesa. O bônus acumula com outros rituais, mas não com o de equipamento.",
      versoes: [
        { nome: "Discente", custo: 5, requisito: "3º círculo", alteracoes: "+10 na Defesa e resistência a balístico, corte, impacto e perfuração 5." },
        { nome: "Verdadeiro", custo: 9, requisito: "4º círculo e afinidade", alteracoes: "+15 na Defesa e resistência a balístico, corte, impacto e perfuração 10." },
      ] },

    { id: "op.ritual.canalizar-o-medo", nome: "Canalizar o Medo", elemento: ME, circulo: 4, fonte: OP, pagina: 125,
      execucao: "padrão", alcance: "toque", alvo: "1 pessoa", duracao: "permanente até ser descarregada",
      resumo: "Você entrega parte do seu poder a outra pessoa: escolha um ritual de até 3º círculo que conheça, e o alvo pode conjurá-lo uma vez na forma básica sem pagar PE (formas avançadas saem do PE dele). Até isso acontecer, seu PE máximo cai pelo custo do ritual guardado.",
      versoes: [] },

    { id: "op.ritual.capturar-o-coracao", nome: "Capturar o Coração", elemento: SA, circulo: 4, fonte: OP, pagina: 125,
      execucao: "padrão", alcance: "curto", alvo: "1 pessoa", duracao: "cena", resistencia: "Vontade parcial",
      resumo: "Uma paixão obcecada por você domina o alvo, que passa a querer agradá-lo a qualquer custo, até contra os próprios aliados. No início de cada turno dele, Vontade; falhando, age para ajudá-lo o melhor que puder naquele turno. Dois sucessos seguidos encerram o efeito.",
      versoes: [] },

    { id: "op.ritual.chamas-do-caos", nome: "Chamas do Caos", elemento: EN, circulo: 2, fonte: OP, pagina: 126,
      execucao: "padrão", alcance: "curto", alvo: "veja texto", duracao: "cena",
      resumo: "Você manipula calor e fogo. Ao conjurar, escolha um efeito: Chamejar, Esquentar, Extinguir ou Modelar.",
      efeitos: [
        "Chamejar: uma arma corpo a corpo passa a causar +1d6 de dano de fogo.",
        "Esquentar: um objeto sofre 1d6 de fogo por rodada e causa o mesmo a quem o empunha ou veste; uma ação completa para resfriá-lo cancela o ritual.",
        "Extinguir: apaga uma chama de tamanho Grande ou menor e deixa fumaça numa esfera de 3 m de raio, que dá camuflagem.",
        "Modelar: move uma chama Grande ou menor 9 m por rodada (ação livre); atravessar um ser causa 3d6 de fogo, uma vez por rodada em cada um.",
      ],
      versoes: [
        { nome: "Discente", custo: 3, alteracoes: "Duração sustentada e “Resistência: Reflexos reduz à metade”. Em vez do normal, uma ação de movimento por rodada projeta uma labareda num alvo em alcance curto: 4d6 de dano de Energia.", dano: "4d6" },
        { nome: "Verdadeiro", custo: 7, requisito: "3º círculo", alteracoes: "Como a discente, com dano 8d6.", dano: "8d6" },
      ] },

    { id: "op.ritual.cicatrizacao", nome: "Cicatrização", elemento: MO, circulo: 1, fonte: OP, pagina: 126,
      execucao: "padrão", alcance: "toque", alvo: "1 ser", duracao: "instantânea",
      resumo: "O tempo acelera ao redor dos ferimentos: o alvo recupera 3d8+3 PV e envelhece 1 ano.",
      versoes: [
        { nome: "Normal", rolagens: [{ tipo: "cura", rotulo: "Cura", expressao: "3d8", extra: "3" }] },
        { nome: "Discente", custo: 2, requisito: "2º círculo", alteracoes: "A cura vira 5d8+5 PV.",
          rolagens: [{ tipo: "cura", rotulo: "Cura", expressao: "5d8", extra: "5" }] },
        { nome: "Verdadeiro", custo: 9, requisito: "4º círculo e afinidade com Morte", alteracoes: "Alcance curto, alvo “seres escolhidos” e cura 7d8+7 PV.",
          rolagens: [{ tipo: "cura", rotulo: "Cura", expressao: "7d8", extra: "7" }] },
      ] },

    { id: "op.ritual.cineraria", nome: "Cinerária", elemento: ME, circulo: 1, fonte: OP, pagina: 126,
      execucao: "padrão", alcance: "curto", area: "nuvem de 6 m de raio", duracao: "cena",
      resumo: "Uma névoa carregada de essência paranormal cobre a área: rituais conjurados dentro dela têm +5 na DT.",
      versoes: [
        { nome: "Discente", custo: 2, alteracoes: "Além do normal, rituais conjurados na névoa custam −2 PE." },
        { nome: "Verdadeiro", custo: 5, alteracoes: "Além do normal, rituais conjurados na névoa causam dano maximizado." },
      ] },

    { id: "op.ritual.coincidencia-forcada", nome: "Coincidência Forçada", elemento: EN, circulo: 1, fonte: OP, pagina: 126,
      execucao: "padrão", alcance: "curto", alvo: "1 ser", duracao: "cena",
      resumo: "Os caminhos do caos favorecem o alvo, que recebe +2 em testes de perícia.",
      versoes: [
        { nome: "Discente", custo: 2, requisito: "2º círculo", alteracoes: "O alvo vira “aliados à sua escolha”." },
        { nome: "Verdadeiro", custo: 5, requisito: "3º círculo e afinidade", alteracoes: "Alvo “aliados à sua escolha” e bônus +5." },
      ],
      notas: ["A linha do livro diz “Alvos: 1 ser”."] },

    { id: "op.ritual.compreensao-paranormal", nome: "Compreensão Paranormal", elemento: CO, circulo: 1, fonte: OP, pagina: 126,
      execucao: "padrão", alcance: "toque", alvo: "1 ser ou objeto", duracao: "cena", resistencia: "Vontade anula (veja texto)",
      resumo: "Compreensão sobrenatural de linguagem: tocando um objeto com informação, você entende as palavras de qualquer idioma humano (não símbolos ou sigilos paranormais); tocando uma pessoa, conversa com ela como se tivessem um idioma em comum; tocando um ser não inteligente, percebe sentimentos básicos.",
      efeitos: ["Alvo involuntário tem direito a um teste de Vontade."],
      versoes: [
        { nome: "Discente", custo: 2, requisito: "2º círculo", alteracoes: "Alcance curto e alvo “alvos escolhidos”; você entende todos eles." },
        { nome: "Verdadeiro", custo: 5, requisito: "3º círculo", alteracoes: "Alcance pessoal, alvo você; em vez do normal, fala, entende e escreve qualquer idioma humano." },
      ] },

    { id: "op.ritual.conhecendo-o-medo", nome: "Conhecendo o Medo", elemento: ME, circulo: 4, fonte: OP, pagina: 127,
      execucao: "padrão", alcance: "toque", alvo: "1 pessoa", duracao: "cena", resistencia: "Vontade parcial",
      resumo: "Medo absoluto na mente do alvo. Falhando na resistência, a Sanidade dele cai a 0 e ele fica enlouquecendo; passando, sofre 10d6 de dano mental e fica apavorado por 1 rodada.",
      efeitos: ["Quem fica insano por este ritual vira uma criatura paranormal, a critério do mestre."],
      versoes: [
        { nome: "Normal", dano: "10d6" },
      ] },

    { id: "op.ritual.consumir-manancial", nome: "Consumir Manancial", elemento: MO, circulo: 1, fonte: OP, pagina: 127,
      execucao: "padrão", alcance: "pessoal", alvo: "você", duracao: "instantânea",
      resumo: "Você suga o tempo de vida de plantas, insetos e do solo em volta, gerando lodo e recebendo 3d6 PV temporários, que somem no fim da cena.",
      versoes: [
        { nome: "Normal", rolagens: [{ tipo: "outra", rotulo: "PV temporários", expressao: "3d6" }] },
        { nome: "Discente", custo: 2, requisito: "2º círculo", alteracoes: "Os PV temporários viram 6d6.",
          rolagens: [{ tipo: "outra", rotulo: "PV temporários", expressao: "6d6" }] },
        { nome: "Verdadeiro", custo: 5, requisito: "3º círculo e afinidade", alteracoes: "Área “esfera de 6 m de raio centrada em você” e “Fortitude reduz à metade”. Em vez do normal, suga a energia de todos os seres vivos na área: 3d6 de dano de Morte em cada um, e você recebe PV temporários iguais ao dano total até o fim da cena.",
          dano: "3d6" },
      ] },

    { id: "op.ritual.contato-paranormal", nome: "Contato Paranormal", elemento: CO, circulo: 3, fonte: OP, pagina: 127,
      execucao: "completa", alcance: "pessoal", alvo: "você", duracao: "1 dia",
      resumo: "Você barganha com a entidade de Conhecimento por ajuda durante o dia, em troca de Sanidade: recebe seis d6 e pode gastar um deles em qualquer teste de perícia, somando o resultado. Cada 6 rolado custa 2 pontos de Sanidade. Sem dados ou com Sanidade 0, o ritual acaba.",
      versoes: [
        { nome: "Normal", rolagens: [{ tipo: "outra", rotulo: "Dado de auxílio", expressao: "1d6" }] },
        { nome: "Discente", custo: 4, requisito: "4º círculo", alteracoes: "Os dados viram d8; cada 8 rolado custa 3 pontos de Sanidade.",
          rolagens: [{ tipo: "outra", rotulo: "Dado de auxílio", expressao: "1d8" }] },
        { nome: "Verdadeiro", custo: 9, requisito: "4º círculo e afinidade", alteracoes: "Os dados viram d12; cada 12 rolado custa 5 pontos de Sanidade.",
          rolagens: [{ tipo: "outra", rotulo: "Dado de auxílio", expressao: "1d12" }] },
      ] },

    { id: "op.ritual.contencao-fantasmagorica", nome: "Contenção Fantasmagórica", elemento: EN, circulo: 2, fonte: OP, pagina: 127,
      execucao: "padrão", alcance: "médio", alvo: "1 ser", duracao: "cena", resistencia: "Reflexos anula",
      resumo: "Três laços de Energia saem do chão e agarram o alvo. Ele pode gastar uma ação padrão num teste de Atletismo (DT do ritual) para destruir um laço, mais um por cada 5 pontos acima da DT.",
      efeitos: [
        "Cada laço tem Defesa 10, 10 PV, RD 5 e imunidade a Energia; destruir todos dissipa o ritual.",
        "Sendo de Energia, os laços afetam criaturas incorpóreas.",
      ],
      versoes: [
        { nome: "Discente", custo: 3, requisito: "3º círculo", alteracoes: "São 6 laços, e você escolhe o alvo de cada um, com no mínimo dois laços por alvo." },
        { nome: "Verdadeiro", custo: 5, requisito: "3º círculo e afinidade", alteracoes: "Como a discente, e cada laço destruído solta uma onda de choque com 2d6+2 de dano de Energia no alvo agarrado.",
          dano: "2d6", danoExtra: "2" },
      ] },

    { id: "op.ritual.controle-mental", nome: "Controle Mental", elemento: CO, circulo: 4, fonte: OP, pagina: 128,
      execucao: "padrão", alcance: "médio", alvo: "1 pessoa ou animal", duracao: "sustentada", resistencia: "Vontade parcial",
      resumo: "Você domina a mente do alvo, que obedece a todos os seus comandos, exceto ordens suicidas. No fim de cada turno dele, um teste de Vontade se livra do efeito; quem passa fica pasmo por 1 rodada.",
      versoes: [
        { nome: "Discente", custo: 5, alteracoes: "Alvo até cinco pessoas ou animais." },
        { nome: "Verdadeiro", custo: 10, requisito: "afinidade com Conhecimento", alteracoes: "Alvo até dez pessoas ou animais." },
      ] },

    { id: "op.ritual.convocacao-instantanea", nome: "Convocação Instantânea", elemento: EN, circulo: 3, fonte: OP, pagina: 128,
      execucao: "padrão", alcance: "ilimitado", alvo: "1 objeto de até 2 espaços", duracao: "instantânea", resistencia: "Vontade anula",
      resumo: "Você chama para a sua mão um objeto preparado com o símbolo do ritual, de qualquer lugar. Se alguém o estiver empunhando, um teste de Vontade nega o efeito — mas você fica sabendo onde o objeto está e quem o carrega. Por 1 hora, uma ação de movimento o devolve ao lugar de origem.",
      versoes: [
        { nome: "Discente", custo: 4, alteracoes: "Alvo um objeto de até 10 espaços." },
        { nome: "Verdadeiro", custo: 9, alteracoes: "Alvo “1 recipiente Médio com itens que somem até 10 espaços” e duração permanente: o recipiente fica escondido no Outro Lado e você o convoca (ou o devolve) como ação padrão, segurando uma miniatura dele — um utensílio de categoria II. Conjurar esta versão custa 1 PE permanente." },
      ] },

    { id: "op.ritual.convocar-o-algoz", nome: "Convocar o Algoz", elemento: MO, circulo: 4, fonte: OP, pagina: 128,
      execucao: "padrão", alcance: "1,5 m", alvo: "1 pessoa", duracao: "sustentada", resistencia: "Vontade parcial, Fortitude parcial",
      resumo: "Dos medos subconscientes do alvo você molda uma imagem daquilo que ele mais teme. Só a vítima o vê com nitidez; os outros veem um vulto. O algoz surge adjacente a você e flutua 12 m na direção dela no fim de cada turno seu.",
      efeitos: [
        "Terminando o turno em alcance curto da vítima: Vontade ou ela fica abalada.",
        "Terminando o turno adjacente a ela: Fortitude ou colapso, ficando com 0 PV; passando, sofre 6d6 de dano de Morte (que não a reduz a menos de 1 PV).",
        "O algoz persegue o alvo além do alcance do ritual, é incorpóreo, imune a dano e só para se o deixar morrendo ou se for dissipado.",
      ],
      versoes: [
        { nome: "Normal", dano: "6d6" },
      ] },

    { id: "op.ritual.corpo-adaptado", nome: "Corpo Adaptado", elemento: SA, circulo: 1, fonte: OP, pagina: 128,
      execucao: "padrão", alcance: "toque", alvo: "1 pessoa ou animal", duracao: "cena",
      resumo: "A biologia do alvo se adapta a ambientes hostis: imunidade a calor e frio extremos, respirar na água (ou no ar, se for o caso) e não sufocar em fumaça densa.",
      versoes: [
        { nome: "Discente", custo: 2, alteracoes: "Duração 1 dia." },
        { nome: "Verdadeiro", custo: 5, alteracoes: "Alcance curto e alvo “pessoas ou animais escolhidos”." },
      ] },

    { id: "op.ritual.decadencia", nome: "Decadência", elemento: MO, circulo: 1, fonte: OP, pagina: 129,
      execucao: "padrão", alcance: "toque", alvo: "1 ser", duracao: "instantânea", resistencia: "Fortitude reduz à metade",
      resumo: "Espirais de trevas envolvem sua mão e definham o alvo: 2d8+2 de dano de Morte.",
      versoes: [
        { nome: "Normal", dano: "2d8", danoExtra: "2" },
        { nome: "Discente", custo: 2, alteracoes: "Sem resistência e dano 3d8+3. Como parte da execução, você passa as espirais para uma arma e faz um ataque corpo a corpo com ela: acertando, soma o dano da arma e o do ritual.", dano: "3d8", danoExtra: "3" },
        { nome: "Verdadeiro", custo: 5, requisito: "3º círculo", alteracoes: "Alcance pessoal, área “explosão de 6 m de raio” e dano 8d8+8 em todos os seres na área.", dano: "8d8", danoExtra: "8" },
      ] },

    { id: "op.ritual.definhar", nome: "Definhar", elemento: MO, circulo: 1, fonte: OP, pagina: 129,
      execucao: "padrão", alcance: "curto", alvo: "1 ser", duracao: "cena", resistencia: "Fortitude parcial",
      resumo: "Uma lufada de cinzas drena as forças do alvo, que fica fatigado — ou vulnerável, se passar na resistência.",
      versoes: [
        { nome: "Discente", custo: 2, requisito: "2º círculo", alteracoes: "O alvo fica exausto; passando na resistência, fatigado." },
        { nome: "Verdadeiro", custo: 5, requisito: "3º círculo e afinidade com Morte", alteracoes: "Como a discente, com alvo “até 5 seres”." },
      ] },

    { id: "op.ritual.deflagracao-de-energia", nome: "Deflagração de Energia", elemento: EN, circulo: 4, fonte: OP, pagina: 129,
      execucao: "completa", alcance: "pessoal", area: "explosão de 15 m de raio", resistencia: "Fortitude parcial",
      resumo: "Você acumula Energia e a libera como uma estrela em terra: todos na área sofrem 3d10 × 10 de dano de Energia e todo item tecnológico (armas de fogo, acessórios, utensílios) para de funcionar, quebrado. Você não é afetado. Quem passa em Fortitude sofre metade do dano e recupera os itens em 1d4 rodadas.",
      versoes: [
        { nome: "Normal", rolagens: [{ tipo: "dano", rotulo: "Dano (role e multiplique por 10)", expressao: "3d10" }] },
        { nome: "Verdadeiro", custo: 5, alteracoes: "Afeta apenas alvos à sua escolha.",
          rolagens: [{ tipo: "dano", rotulo: "Dano (role e multiplique por 10)", expressao: "3d10" }] },
      ],
      notas: [
        "O dano é “3d10 x 10”: a rolagem entrega os 3d10 e a multiplicação por 10 fica com quem joga — o motor de dados não multiplica expressões.",
        "O livro não informa a duração deste ritual.",
      ] },

    { id: "op.ritual.desacelerar-impacto", nome: "Desacelerar Impacto", elemento: MO, circulo: 2, fonte: OP, pagina: 129,
      execucao: "reação", alcance: "curto", alvo: "1 ser ou objetos somando até 10 espaços",
      duracao: "até chegar ao solo ou cena, o que vier primeiro",
      resumo: "O alvo passa a cair devagar — 18 m por rodada, o bastante para não sofrer dano. Sendo reação, dá para salvar você ou um aliado de uma queda inesperada. Contra um projétil (um disparo, um objeto largado do alto), o dano cai à metade.",
      efeitos: ["Só funciona em queda livre ou parecido: não freia um golpe de faca nem um voo rasante."],
      versoes: [
        { nome: "Discente", custo: 3, alteracoes: "Alvo até seres ou objetos somando 100 espaços." },
      ] },

    { id: "op.ritual.descarnar", nome: "Descarnar", elemento: SA, circulo: 2, fonte: OP, pagina: 129,
      execucao: "padrão", alcance: "toque", alvo: "1 ser", duracao: "instantânea", resistencia: "Fortitude parcial",
      resumo: "Lacerações se abrem na pele e nos órgãos do alvo: 6d8 de dano (metade corte, metade Sangue) e hemorragia severa. No início de cada turno dele, Fortitude; falhando, sofre 2d8 de dano de Sangue. Dois sucessos seguidos estancam. Quem passa na resistência inicial sofre metade do dano e não sangra.",
      versoes: [
        { nome: "Normal", dano: "6d8", rolagens: [{ tipo: "dano", rotulo: "Hemorragia (por turno)", expressao: "2d8" }] },
        { nome: "Discente", custo: 3, requisito: "3º círculo", alteracoes: "Dano direto 10d8 e hemorragia 4d8.",
          dano: "10d8", rolagens: [{ tipo: "dano", rotulo: "Hemorragia (por turno)", expressao: "4d8" }] },
        { nome: "Verdadeiro", custo: 7, requisito: "3º círculo e afinidade", alteracoes: "Alvo você e duração sustentada: seus ataques corpo a corpo causam +4d8 de dano de Sangue e deixam hemorragia automaticamente (com o teste de Fortitude por turno).",
          dano: "4d8" },
      ] },

    { id: "op.ritual.deteccao-de-ameacas", nome: "Detecção de Ameaças", elemento: CO, circulo: 2, fonte: OP, pagina: 130,
      execucao: "padrão", alcance: "pessoal", area: "esfera de 18 m de raio", duracao: "cena",
      resumo: "Percepção aguçada de perigo: quando um ser hostil ou uma armadilha entra na área, você sente e pode gastar uma ação de movimento num teste de Percepção (DT 20) para saber a direção e a distância.",
      versoes: [
        { nome: "Discente", custo: 3, requisito: "3º círculo", alteracoes: "Além do normal, você não fica desprevenido contra perigos detectados e recebe +5 em resistência contra armadilhas." },
        { nome: "Verdadeiro", custo: 5, requisito: "4º círculo", alteracoes: "Duração 1 dia, com os mesmos benefícios da discente." },
      ] },

    { id: "op.ritual.dissipar-ritual", nome: "Dissipar Ritual", elemento: ME, circulo: 3, fonte: OP, pagina: 130,
      execucao: "padrão", alcance: "médio", alvo: "1 ser ou objeto", area: "esfera de 3 m de raio", duracao: "instantânea",
      resumo: "Você encerra rituais ativos como se a duração deles tivesse acabado: faça um teste de Ocultismo e anule os rituais no alvo ou na área com DT igual ou menor que o resultado. Efeitos de rituais instantâneos não podem ser dissipados.",
      efeitos: ["Conjurado num item amaldiçoado, o item fica mundano por um dia; se estiver com alguém, um teste de Vontade nega."],
      versoes: [],
      notas: ["O livro apresenta a linha como “Alvo ou Área: 1 ser ou objeto, ou esfera com 3 m de raio”: o ritual aceita os dois, e o catálogo guarda cada um no seu campo."] },

    { id: "op.ritual.dissonancia-acustica", nome: "Dissonância Acústica", elemento: EN, circulo: 2, fonte: OP, pagina: 130,
      execucao: "padrão", alcance: "médio", area: "esfera de 6 m de raio", duracao: "sustentada",
      resumo: "A vibração do ar vira dissonância: todos os seres na área ficam surdos, e ninguém dentro dela consegue conjurar rituais.",
      versoes: [
        { nome: "Discente", custo: 1, alteracoes: "Vira “alvo: 1 objeto”, que emana uma área de silêncio de 3 m de raio. Num objeto de alguém involuntário, um teste de Vontade anula." },
        { nome: "Verdadeiro", custo: 3, requisito: "3º círculo", alteracoes: "Duração cena: nenhum som sai da área, mas quem está dentro fala, ouve e conjura normalmente." },
      ] },

    { id: "op.ritual.distorcao-temporal", nome: "Distorção Temporal", elemento: MO, circulo: 4, fonte: OP, pagina: 130,
      execucao: "padrão", alcance: "pessoal", alvo: "veja texto", duracao: "veja texto",
      resumo: "Um bolsão temporal de 3 rodadas se fecha em volta de você: dá para agir, mas não sair do lugar nem interagir com seres e objetos. Efeitos contínuos não o alcançam, e nada que você comece afeta a área em volta. Efeitos de área mais longos voltam a agir quando o bolsão acaba.",
      versoes: [] },

    { id: "op.ritual.distorcer-aparencia", nome: "Distorcer Aparência", elemento: SA, circulo: 1, fonte: OP, pagina: 130,
      execucao: "padrão", alcance: "pessoal", alvo: "você", duracao: "cena", resistencia: "Vontade desacredita",
      resumo: "Você muda a própria aparência — altura, peso, pele, cabelo, voz, impressão digital, córnea — e recebe +10 em Enganação para disfarce. Não ganha habilidades da nova forma nem muda outras estatísticas.",
      versoes: [
        { nome: "Discente", custo: 2, alteracoes: "Alcance curto e alvo “1 ser”; alvo involuntário anula com Vontade." },
        { nome: "Verdadeiro", custo: 5, requisito: "3º círculo", alteracoes: "Como a discente, com alvo “seres escolhidos”." },
      ] },

    { id: "op.ritual.eco-espiral", nome: "Eco Espiral", elemento: MO, circulo: 2, fonte: OP, pagina: 131,
      execucao: "padrão", alcance: "curto", alvo: "1 ser", duracao: "2 rodadas", resistencia: "Fortitude reduz à metade",
      resumo: "Nas suas mãos aparece uma cópia do alvo feita de cinzas. No início do próximo turno você gasta uma ação padrão para se concentrar nela; no seguinte, uma ação padrão para descarregá-la. A cópia explode e o alvo sofre dano de Morte igual ao dano que ele sofreu na rodada da concentração. Faltando qualquer uma das ações, o ritual se dissipa sem efeito.",
      versoes: [
        { nome: "Discente", custo: 3, alteracoes: "Alvo até 5 seres." },
        { nome: "Verdadeiro", custo: 7, requisito: "4º círculo e afinidade", alteracoes: "Duração até 3 rodadas: concentra nas duas primeiras e descarrega na terceira." },
      ],
      notas: ["O dano depende do que o alvo sofreu em jogo: não há expressão fixa para rolar."] },

    { id: "op.ritual.eletrocussao", nome: "Eletrocussão", elemento: EN, circulo: 1, fonte: OP, pagina: 131,
      execucao: "padrão", alcance: "curto", alvo: "1 ser ou objeto", duracao: "instantânea", resistencia: "Fortitude parcial",
      resumo: "Uma corrente elétrica atinge o alvo: 3d6 de dano de eletricidade e vulnerável por uma rodada. Passando na resistência, metade do dano e nenhuma condição. Contra objetos eletrônicos, dano dobrado e sem resistência a dano.",
      versoes: [
        { nome: "Normal", dano: "3d6" },
        { nome: "Discente", custo: 2, requisito: "2º círculo", alteracoes: "Área “linha de 30 m”: um raio causa 6d6 de dano de Energia em todos os seres e objetos livres na área.", dano: "6d6" },
        { nome: "Verdadeiro", custo: 5, requisito: "3º círculo", alteracoes: "Alvos escolhidos: um relâmpago para cada, com 8d6 de dano de Energia em cada um.", dano: "8d6" },
      ] },

    { id: "op.ritual.embaralhar", nome: "Embaralhar", elemento: EN, circulo: 1, fonte: OP, pagina: 131,
      execucao: "padrão", alcance: "pessoal", alvo: "você", duracao: "cena",
      resumo: "Três cópias ilusórias suas imitam seus movimentos e confundem quem ataca: +6 na Defesa. Cada ataque que erra some com uma cópia e reduz o bônus em 2. Quem não vê as cópias não é confundido — invisível ou contra um atacante de olhos fechados, você não recebe o bônus.",
      versoes: [
        { nome: "Discente", custo: 2, requisito: "2º círculo", alteracoes: "Cinco cópias, +10 na Defesa." },
        { nome: "Verdadeiro", custo: 5, requisito: "3º círculo", alteracoes: "Oito cópias, +16 na Defesa; cada cópia destruída solta um clarão que deixa quem a destruiu ofuscado por uma rodada." },
      ] },

    { id: "op.ritual.enfeiticar", nome: "Enfeitiçar", elemento: CO, circulo: 1, fonte: OP, pagina: 131,
      execucao: "padrão", alcance: "curto", alvo: "1 pessoa", duracao: "cena", resistencia: "Vontade anula",
      resumo: "O alvo fica prestativo: não obedece a você, mas entende suas palavras e ações da maneira mais favorável possível, e você recebe +10 em Diplomacia com ele. Alvo hostil ou em combate recebe +5 na resistência. Qualquer ação hostil sua ou dos seus aliados dissipa o efeito.",
      versoes: [
        { nome: "Discente", custo: 2, requisito: "2º círculo", alteracoes: "Em vez do normal, você sugere uma ação aceitável e o alvo obedece; pode ser condicionada a um evento. Quando ele executa, o efeito termina." },
        { nome: "Verdadeiro", custo: 5, requisito: "3º círculo", alteracoes: "Afeta todos os alvos dentro do alcance." },
      ] },

    { id: "op.ritual.esconder-dos-olhos", nome: "Esconder dos Olhos", elemento: CO, circulo: 2, fonte: OP, pagina: 132,
      execucao: "livre", alcance: "pessoal", alvo: "você", duracao: "1 rodada",
      resumo: "Você e o seu equipamento ficam invisíveis: camuflagem total e +15 em Furtividade. Quem não o vê fica desprevenido contra os seus ataques.",
      efeitos: [
        "O efeito termina se você atacar ou usar uma habilidade hostil; agir sobre objetos livres não dissipa, e dano indireto (um explosivo preparado antes) não conta como ataque.",
        "Objetos soltos voltam a ser visíveis e os que você apanha ficam invisíveis. Luz carregada nunca fica invisível, e o que se estende além do seu alcance corpo a corpo aparece.",
      ],
      versoes: [
        { nome: "Discente", custo: 3, requisito: "3º círculo", alteracoes: "Duração sustentada e uma esfera de invisibilidade: você e os aliados a até 3 m ficam invisíveis, e quem sai da esfera aparece." },
        { nome: "Verdadeiro", custo: 7, requisito: "4º círculo e afinidade", alteracoes: "Execução padrão, alcance toque, alvo “1 ser” e duração sustentada; atacar ou agir hostilmente não dissipa o efeito." },
      ] },

    { id: "op.ritual.espirais-da-perdicao", nome: "Espirais da Perdição", elemento: MO, circulo: 1, fonte: OP, pagina: 132,
      execucao: "padrão", alcance: "curto", alvo: "1 ser", duracao: "cena",
      resumo: "Espirais surgem no corpo do alvo e deixam os movimentos dele lentos: −1 dado nos testes de ataque.",
      versoes: [
        { nome: "Discente", custo: 2, requisito: "2º círculo", alteracoes: "A penalidade vira −2 dados." },
        { nome: "Verdadeiro", custo: 8, requisito: "3º círculo", alteracoes: "Penalidade de −2 dados e alvo “seres escolhidos”." },
      ],
      notas: ["O livro imprime a mesma penalidade (−2 dados) na forma discente e na verdadeira; a verdadeira acrescenta os vários alvos."] },

    { id: "op.ritual.ferver-sangue", nome: "Ferver Sangue", elemento: SA, circulo: 3, fonte: OP, pagina: 132,
      execucao: "padrão", alcance: "curto", alvo: "1 ser", duracao: "sustentada", resistencia: "Fortitude parcial",
      resumo: "O sangue do alvo entra em ebulição. Ao conjurar e no início de cada turno dele, Fortitude: falhando, 4d8 de dano de Sangue e fica fraco; passando, metade do dano e sem a condição. Dois sucessos seguidos encerram.",
      versoes: [
        { nome: "Normal", dano: "4d8" },
        { nome: "Verdadeiro", custo: 4, requisito: "4º círculo e afinidade", alteracoes: "Alvo “seres escolhidos”.", dano: "4d8" },
      ] },

    { id: "op.ritual.fim-inevitavel", nome: "Fim Inevitável", elemento: MO, circulo: 4, fonte: OP, pagina: 132,
      execucao: "completa", alcance: "extremo", efeito: "buraco negro com 1,5 m de diâmetro", duracao: "4 rodadas", resistencia: "Fortitude parcial",
      resumo: "Um vácuo se abre num espaço desocupado. No início de cada um dos seus quatro turnos seguintes, todos os seres a até 90 m dele — você incluído — fazem Fortitude; falhando, ficam caídos e são puxados 30 m na direção do vácuo. Objetos soltos também são puxados.",
      efeitos: [
        "Uma ação de movimento para se segurar em algo fixo dá +5 na resistência.",
        "Quem começa o turno tocando o vácuo sofre 100 pontos de dano de Morte por rodada.",
      ],
      versoes: [
        { nome: "Discente", custo: 5, requisito: "afinidade", alteracoes: "Duração 5 rodadas e você não é afetado." },
        { nome: "Verdadeiro", custo: 10, requisito: "afinidade", alteracoes: "Duração 6 rodadas e os seres que você escolher dentro do alcance não são afetados." },
      ] },

    { id: "op.ritual.flagelo-de-sangue", nome: "Flagelo de Sangue", elemento: SA, circulo: 2, fonte: OP, pagina: 133,
      execucao: "padrão", alcance: "toque", alvo: "1 pessoa", duracao: "cena", resistencia: "Fortitude parcial",
      resumo: "Você grava uma marca escarificada no corpo do alvo junto de uma ordem (“não me ataque”, “siga-me”, “não saia desta sala”). Cada rodada de desobediência traz dor excruciante: 10d6 de dano de Sangue e enjoado pela rodada (Fortitude reduz o dano à metade e evita a condição). Dois sucessos seguidos apagam a marca.",
      versoes: [
        { nome: "Normal", dano: "10d6" },
        { nome: "Discente", custo: 3, requisito: "3º círculo", alteracoes: "Alvo “1 ser (exceto criaturas de Sangue)”.", dano: "10d6" },
        { nome: "Verdadeiro", custo: 7, requisito: "4º círculo e afinidade", alteracoes: "Como a discente, com duração 1 dia.", dano: "10d6" },
      ] },

    { id: "op.ritual.forma-monstruosa", nome: "Forma Monstruosa", elemento: SA, circulo: 3, fonte: OP, pagina: 133,
      execucao: "padrão", alcance: "pessoal", alvo: "você", duracao: "cena",
      resumo: "Seu corpo assume uma forma que mistura você com uma criatura de Sangue: roupas e proteção viram couraça, o que estava nas mãos vira garras. Tamanho Grande, +5 em testes de ataque e rolagens de dano corpo a corpo e 30 PV temporários.",
      efeitos: [
        "O equipamento fica inacessível, mas os bônus dele continuam valendo.",
        "A fúria toma a mente: você não fala nem conjura rituais e precisa atacar o ser mais próximo a cada rodada (ou se deslocar até ele).",
        "Se o mais próximo for um aliado, um teste de Vontade (DT do ritual) devolve a escolha do alvo naquele turno.",
      ],
      versoes: [
        { nome: "Normal", rolagens: [{ tipo: "outra", rotulo: "PV temporários", expressao: "", extra: "30" }] },
        { nome: "Discente", custo: 3, requisito: "3º círculo", alteracoes: "Além do normal, imunidade a atordoamento, fadiga, sangramento, sono e veneno." },
        { nome: "Verdadeiro", custo: 9, requisito: "4º círculo e afinidade", alteracoes: "Os bônus viram +10 e os PV temporários, 50.",
          rolagens: [{ tipo: "outra", rotulo: "PV temporários", expressao: "", extra: "50" }] },
      ] },

    { id: "op.ritual.fortalecimento-sensorial", nome: "Fortalecimento Sensorial", elemento: SA, circulo: 1, fonte: OP, pagina: 133,
      execucao: "padrão", alcance: "pessoal", alvo: "você", duracao: "cena",
      resumo: "Seus sentidos se afiam: +1 dado em Investigação, Luta, Percepção e Pontaria.",
      versoes: [
        { nome: "Discente", custo: 2, requisito: "2º círculo", alteracoes: "Além do normal, seus inimigos sofrem −1 dado nos ataques contra você." },
        { nome: "Verdadeiro", custo: 5, requisito: "4º círculo e afinidade", alteracoes: "Além do normal, imunidade a surpreendido e desprevenido, +10 na Defesa e em Reflexos." },
      ] },

    { id: "op.ritual.hemofagia", nome: "Hemofagia", elemento: SA, circulo: 2, fonte: OP, pagina: 133,
      execucao: "padrão", alcance: "toque", alvo: "1 ser", duracao: "instantânea", resistencia: "Fortitude reduz à metade",
      resumo: "Você arranca o sangue do alvo pela pele: 6d6 de dano de Sangue, e absorve esse sangue recuperando PV iguais à metade do dano causado.",
      versoes: [
        { nome: "Normal", dano: "6d6" },
        { nome: "Discente", custo: 3, alteracoes: "Sem resistência; como parte da execução você faz um ataque corpo a corpo e, acertando, soma o dano do ataque e do ritual, recuperando metade do total em PV.", dano: "6d6" },
        { nome: "Verdadeiro", custo: 7, requisito: "4º círculo", alteracoes: "Alcance pessoal, alvo você, duração cena: a cada rodada, uma ação padrão toca 1 ser e causa 4d6 de dano de Sangue, recuperando metade em PV.", dano: "4d6" },
      ] },

    { id: "op.ritual.inexistir", nome: "Inexistir", elemento: CO, circulo: 4, fonte: OP, pagina: 134,
      execucao: "padrão", alcance: "toque", alvo: "1 ser", duracao: "instantânea", resistencia: "Vontade parcial",
      resumo: "Você toca o alvo para apagá-lo da existência: ele levita, textos da vida dele brilham sobre a pele e a existência começa a ser destruída de dentro — 10d12+10 de dano de Conhecimento. Passando na resistência, 2d12 e debilitado por uma rodada. Se os PV chegarem a 0, nada da existência dele resta.",
      versoes: [
        { nome: "Normal", dano: "10d12", danoExtra: "10", rolagens: [{ tipo: "dano", rotulo: "Dano se resistir", expressao: "2d12" }] },
        { nome: "Discente", custo: 5, alteracoes: "Dano 15d12+15, e 3d12 se resistir.",
          dano: "15d12", danoExtra: "15", rolagens: [{ tipo: "dano", rotulo: "Dano se resistir", expressao: "3d12" }] },
        { nome: "Verdadeiro", custo: 10, requisito: "afinidade", alteracoes: "Dano 20d12+20, e 4d12 se resistir.",
          dano: "20d12", danoExtra: "20", rolagens: [{ tipo: "dano", rotulo: "Dano se resistir", expressao: "4d12" }] },
      ] },

    { id: "op.ritual.invadir-mente", nome: "Invadir Mente", elemento: CO, circulo: 2, fonte: OP, pagina: 134,
      execucao: "padrão", alcance: "médio ou toque", alvo: "1 ser ou 2 pessoas voluntárias",
      duracao: "instantânea ou 1 dia", resistencia: "Vontade parcial ou nenhuma",
      resumo: "Ao conjurar, escolha um dos dois efeitos — e com ele a linha do cabeçalho que vale.",
      efeitos: [
        "Rajada mental (alcance médio, alvo 1 ser, instantânea, Vontade parcial): o Conhecimento proibido dilacera o cérebro do alvo, com 6d6 de dano de Conhecimento e atordoado por uma rodada; passando, metade do dano e sem a condição. Cada alvo só fica atordoado uma vez por cena.",
        "Ligação telepática (toque, 2 pessoas voluntárias, 1 dia, sem resistência): as duas se comunicam a qualquer distância pela duração.",
      ],
      versoes: [
        { nome: "Normal", dano: "6d6" },
        { nome: "Discente", custo: 3, requisito: "3º círculo", alteracoes: "Rajada mental vira 10d6. Ligação telepática vira um elo que deixa você ver e ouvir pelos sentidos do alvo, gastando uma ação de movimento para se concentrar; alvo involuntário suprime o ritual por uma hora com Vontade.", dano: "10d6" },
        { nome: "Verdadeiro", custo: 7, alteracoes: "Rajada mental com 10d6 e alvo “seres escolhidos”. Ligação telepática entre até 5 pessoas.", dano: "10d6" },
      ] },

    { id: "op.ritual.involucro-de-carne", nome: "Invólucro de Carne", elemento: SA, circulo: 4, fonte: OP, pagina: 134,
      execucao: "padrão", alcance: "curto", efeito: "1 clone seu", duracao: "cena",
      resumo: "De uma poça de sangue emerge uma cópia sua, idêntica em aparência e estatísticas, com cópias do equipamento mundano que você carrega. Ela não tem consciência (Intelecto e Presença nulos) e só age por ordem sua — uma ação de movimento para mandar, e ela cumpre no fim de cada turno seu, inclusive ordens perigosas.",
      efeitos: [
        "No início do seu turno você pode controlar a cópia ativamente: entra em transe e usa os sentidos dela.",
        "Quem interage com a cópia tem um teste de Percepção (DT do ritual) para notar que é uma cópia.",
        "A cópia se desfaz em sangue coagulado com 0 PV ou ao sair do alcance.",
      ],
      versoes: [] },

    { id: "op.ritual.lamina-do-medo", nome: "Lâmina do Medo", elemento: ME, circulo: 4, fonte: OP, pagina: 135,
      execucao: "padrão", alcance: "toque", alvo: "1 ser", duracao: "instantânea", resistencia: "Fortitude parcial",
      resumo: "Você empunha uma fenda na Realidade e golpeia um alvo adjacente. Falhando em Fortitude, os PV dele caem a 0 e ele fica morrendo; passando, sofre 10d8 de dano de Medo (que ignora todas as resistências) e fica apavorado por uma rodada.",
      efeitos: [
        "Quem fica morrendo pela lâmina e sobrevive carrega um ferimento que nunca cicatriza, em dor constante.",
        "Aprender este ritual exige um poder de trilha específico.",
      ],
      versoes: [
        { nome: "Normal", dano: "10d8" },
      ] },

    { id: "op.ritual.localizacao", nome: "Localização", elemento: CO, circulo: 2, fonte: OP, pagina: 135,
      execucao: "padrão", alcance: "pessoal", area: "círculo de 90 m de raio", duracao: "cena",
      resumo: "O ritual aponta a direção e a distância da pessoa ou do objeto mais próximo do tipo que você pensar — geral (“um policial”, “algo de metal”) ou específico (“a delegada Joana”). Você pode andar para continuar procurando.",
      efeitos: [
        "Algo muito específico exige uma imagem precisa na mente; se a imagem não corresponder, o ritual falha e os PE são gastos.",
        "Uma fina camada de chumbo bloqueia o ritual.",
      ],
      versoes: [
        { nome: "Discente", custo: 3, alteracoes: "Alcance toque, alvo “1 pessoa”, duração 1 hora: a pessoa tocada descobre o caminho mais direto para entrar ou sair de um lugar (lugares, não pessoas ou objetos). Demorando mais de uma hora, o conhecimento se perde." },
        { nome: "Verdadeiro", custo: 7, requisito: "4º círculo", alteracoes: "Área círculo de 1 km de raio." },
      ] },

    { id: "op.ritual.luz", nome: "Luz", elemento: EN, circulo: 1, fonte: OP, pagina: 135,
      execucao: "padrão", alcance: "curto", alvo: "1 objeto", duracao: "cena", resistencia: "Vontade anula (veja texto)",
      resumo: "O objeto emite luz de cores alternadas, sem calor, numa área de 9 m de raio. Guardá-lo interrompe a luz, que volta quando ele reaparece. Num objeto de alguém involuntário, um teste de Vontade anula.",
      versoes: [
        { nome: "Discente", custo: 2, requisito: "2º círculo", alteracoes: "Alcance longo e, em vez do normal, 4 esferas flutuantes de luz de 10 cm que você posiciona no alcance e move uma vez por rodada (ação livre). Cada uma ilumina 6 m de raio; uma esfera no espaço de um ser o deixa ofuscado e revela a silhueta dele." },
        { nome: "Verdadeiro", custo: 5, requisito: "3º círculo", alteracoes: "A luz fica cálida como a do sol: aliados na área recebem +1 dado em Vontade e inimigos ficam ofuscados." },
      ] },

    { id: "op.ritual.medo-tangivel", nome: "Medo Tangível", elemento: ME, circulo: 4, fonte: OP, pagina: 135,
      execucao: "padrão", alcance: "pessoal", alvo: "você", duracao: "cena",
      resumo: "Seu corpo vira uma manifestação do Medo, imune a efeitos mundanos: imunidade a atordoado, cego, debilitado, enjoado, envenenado, exausto, fatigado, fraco, lento, ofuscado e paralisado, além de doenças e venenos, e nenhum dano adicional de crítico ou ataque furtivo.",
      efeitos: ["Dano balístico, de corte, de impacto ou de perfuração não reduz seus PV abaixo de 1."],
      versoes: [] },

    { id: "op.ritual.mergulho-mental", nome: "Mergulho Mental", elemento: CO, circulo: 3, fonte: OP, pagina: 136,
      execucao: "padrão", alcance: "toque", alvo: "1 pessoa", duracao: "sustentada", resistencia: "Vontade parcial (veja texto)",
      resumo: "Você mergulha nos pensamentos do alvo — e fica desprevenido enquanto isso. No início de cada turno seu sustentando e tocando o alvo, ele faz Vontade; falhando, responde uma pergunta de sim ou não sem poder mentir. O que aparece depende das perguntas e do mestre.",
      versoes: [
        { nome: "Verdadeiro", custo: 4, requisito: "4º círculo", alteracoes: "Execução 1 dia, alcance ilimitado e componentes extras (uma cuba de ouro com água e uma máscara, acessório de categoria II): o mergulho é feito à distância, com o rosto mascarado na água. Exige alguma informação do alvo (nome completo) e um objeto pessoal ou fotografia." },
      ] },

    { id: "op.ritual.miasma-entropico", nome: "Miasma Entrópico", elemento: MO, circulo: 2, fonte: OP, pagina: 136,
      execucao: "padrão", alcance: "médio", area: "nuvem de 6 m de raio", duracao: "instantânea", resistencia: "Fortitude parcial (veja texto)",
      resumo: "Uma explosão de emanações tóxicas: quem está na área sofre 4d8 de dano químico e fica enjoado por 1 rodada; passando, metade do dano e sem a condição.",
      versoes: [
        { nome: "Normal", dano: "4d8" },
        { nome: "Discente", custo: 3, alteracoes: "O dano vira 6d8, de Morte.", dano: "6d8" },
        { nome: "Verdadeiro", custo: 7, requisito: "3º círculo", alteracoes: "Duração 3 rodadas: quem começa o turno na área sofre o dano de novo.", dano: "6d8" },
      ] },

    { id: "op.ritual.nuvem-de-cinzas", nome: "Nuvem de Cinzas", elemento: MO, circulo: 1, fonte: OP, pagina: 136,
      execucao: "padrão", alcance: "curto", efeito: "nuvem de 6 m de raio e 6 m de altura", duracao: "cena",
      resumo: "Fuligem espessa sobe de um ponto à sua escolha e obscurece a visão: seres a até 1,5 m têm camuflagem, e a partir de 3 m, camuflagem total. Vento forte dispersa em 4 rodadas, e um vendaval em 1 rodada. Não funciona sob a água.",
      versoes: [
        { nome: "Discente", custo: 2, requisito: "2º círculo", alteracoes: "Seres escolhidos no alcance enxergam através da nuvem." },
        { nome: "Verdadeiro", custo: 5, requisito: "3º círculo", alteracoes: "A nuvem fica quase sólida: quem está dentro tem deslocamento reduzido a 3 m e sofre −2 em testes de ataque." },
      ] },

    { id: "op.ritual.odio-incontrolavel", nome: "Ódio Incontrolável", elemento: SA, circulo: 1, fonte: OP, pagina: 136,
      execucao: "padrão", alcance: "toque", alvo: "1 pessoa", duracao: "cena",
      resumo: "O alvo entra em frenesi: +2 em testes de ataque e rolagens de dano corpo a corpo e resistência a balístico, corte, impacto e perfuração 5.",
      efeitos: ["Enquanto durar, o alvo não faz nada que exija calma (Furtividade, conjurar rituais) e precisa atacar alguém na própria rodada, mesmo que seja um aliado, se for o único ao alcance."],
      versoes: [
        { nome: "Discente", custo: 2, alteracoes: "Além do normal, ao usar a ação agredir o alvo faz um ataque corpo a corpo adicional contra o mesmo alvo." },
        { nome: "Verdadeiro", custo: 5, requisito: "3º círculo e afinidade", alteracoes: "Os bônus viram +5, e o alvo passa a sofrer apenas metade do dano balístico, de corte, de impacto e de perfuração." },
      ] },

    { id: "op.ritual.ouvir-os-sussurros", nome: "Ouvir os Sussurros", elemento: CO, circulo: 1, fonte: OP, pagina: 137,
      execucao: "completa", alcance: "pessoal", alvo: "você", duracao: "instantânea",
      resumo: "Você consulta os sussurros do Outro Lado sobre algo que está prestes a fazer, na mesma cena, com uma pergunta de sim ou não. O mestre rola 1d6 em segredo: de 2 a 6 a resposta vem — “sim”, “não” ou “sim e não”.",
      efeitos: [
        "No resultado 1 o ritual falha e responde “não”, sem que ninguém saiba que falhou.",
        "Repetir o ritual sobre o mesmo assunto devolve sempre a primeira resposta.",
      ],
      versoes: [
        { nome: "Normal", rolagens: [{ tipo: "outra", rotulo: "Chance de falha (mestre)", expressao: "1d6" }] },
        { nome: "Discente", custo: 2, requisito: "2º círculo", alteracoes: "Execução 1 minuto: a pergunta pode ser sobre um evento de até um dia no futuro, e a resposta vem como frase, profecia ou enigma — em geral, uma pista. Na falha, nenhuma resposta." },
        { nome: "Verdadeiro", custo: 5, requisito: "3º círculo", alteracoes: "Execução 10 minutos e duração 5 rodadas: uma pergunta por rodada, respondida com “sim”, “não” ou “ninguém sabe”, com a chance de falha rolada para cada uma." },
      ] },

    { id: "op.ritual.paradoxo", nome: "Paradoxo", elemento: MO, circulo: 2, fonte: OP, pagina: 137,
      execucao: "padrão", alcance: "médio", area: "esfera de 6 m de raio", duracao: "instantânea", resistencia: "Fortitude reduz à metade",
      resumo: "Uma implosão de distorção temporal contraditória causa 6d6 de dano de Morte em todos os seres na área.",
      versoes: [
        { nome: "Normal", dano: "6d6" },
        { nome: "Discente", custo: 3, alteracoes: "Vira “efeito: esfera de tamanho Médio” com duração cena: uma esfera de espirais sibilantes de 1,5 m causa 4d6 de dano de Morte a quem estiver no mesmo espaço, uma vez por rodada. Uma ação de movimento a faz voar 9 m.", dano: "4d6" },
        { nome: "Verdadeiro", custo: 7, requisito: "4º círculo", alteracoes: "Dano 13d6; quem é reduzido a 0 PV faz Fortitude e, falhando, vira cinzas (morre imediatamente).", dano: "13d6" },
      ] },

    { id: "op.ritual.perturbacao", nome: "Perturbação", elemento: CO, circulo: 1, fonte: OP, pagina: 137,
      execucao: "padrão", alcance: "curto", alvo: "1 pessoa", duracao: "1 rodada", resistencia: "Vontade anula",
      resumo: "Você dá uma ordem que o alvo precisa ouvir (mas não entender). Falhando na resistência, ele obedece no próprio turno, da melhor maneira possível. Escolha um comando ao conjurar.",
      efeitos: [
        "Fuja: gasta o turno tentando se afastar de você.",
        "Largue: solta o que está segurando e não pega de volta até o início do próximo turno dele.",
        "Pare: fica pasmo (só reações).",
        "Sente-se: senta no chão (ou desce, se estava no ar) e não se levanta até o início do próximo turno dele.",
        "Venha: gasta o turno se aproximando de você.",
      ],
      versoes: [
        { nome: "Discente", custo: 2, alteracoes: "Alvo “1 ser” e mais um comando — Sofra: dor aguda com 3d8 de dano de Conhecimento e abalado por uma rodada.", dano: "3d8" },
        { nome: "Verdadeiro", custo: 5, requisito: "3º círculo e afinidade", alteracoes: "Alvo “até 5 seres” ou mais um comando — Ataque: o alvo agride outro alvo à sua escolha em alcance médio, com tudo o que tem." },
      ] },

    { id: "op.ritual.poeira-da-podridao", nome: "Poeira da Podridão", elemento: MO, circulo: 3, fonte: OP, pagina: 138,
      execucao: "padrão", alcance: "médio", area: "nuvem de 6 m de raio", duracao: "sustentada", resistencia: "Fortitude (veja texto)",
      resumo: "Uma nuvem de poeira apodrece o que está na área. Ao conjurar e no início de cada turno seu, seres e objetos na área sofrem 4d8 de dano de Morte (Fortitude reduz à metade). Quem falha também não recupera PV de nenhuma forma por uma rodada.",
      versoes: [
        { nome: "Normal", dano: "4d8" },
        { nome: "Verdadeiro", custo: 4, alteracoes: "O dano vira 4d8+16.", dano: "4d8", danoExtra: "16" },
      ] },

    { id: "op.ritual.polarizacao-caotica", nome: "Polarização Caótica", elemento: EN, circulo: 1, fonte: OP, pagina: 138,
      execucao: "padrão", alcance: "curto", alvo: "você", duracao: "sustentada", resistencia: "Vontade anula",
      resumo: "Uma aura magnética sobrenatural envolve você. Escolha Atrair ou Repelir ao conjurar.",
      efeitos: [
        "Atrair: uma ação de movimento puxa um objeto metálico de até 2 espaços no alcance; se estiver livre, ele voa para as suas mãos (ou pés).",
        "Repelir: você repele objetos de até 2 espaços — quase todo projétil e arma de arremesso — e recebe resistência a balístico, corte, impacto e perfuração 5.",
      ],
      versoes: [
        { nome: "Discente", custo: 2, alteracoes: "A energia sai de uma vez e arremessa até 10 objetos (ou 10 espaços, o que for menor) que estejam a até 3 m entre si. O dano vai de 1 de impacto por espaço (objetos macios) a 1d6 por espaço (duros, pontudos ou afiados), com Reflexos para metade. Seres dentro da capacidade podem ser arremessados, com Vontade para evitar; quem bate numa superfície sólida sofre 1d6 de impacto por 3 m percorridos." },
        { nome: "Verdadeiro", custo: 5, alteracoes: "Alcance médio: uma ação de movimento levita e move um ser ou objeto de até 10 espaços por 9 m em qualquer direção no alcance. Vontade anula sobre o ser ou o objeto dele; o alvo cai ao sair do alcance ou quando o efeito termina." },
      ] },

    { id: "op.ritual.possessao", nome: "Possessão", elemento: CO, circulo: 4, fonte: OP, pagina: 138,
      execucao: "padrão", alcance: "longo", alvo: "1 pessoa viva ou morta", duracao: "1 dia", resistencia: "Vontade anula",
      resumo: "Você projeta a consciência no corpo do alvo e assume o controle total dele; se estiver vivo, a consciência dele troca de lugar com a sua e fica inerte no seu corpo desacordado. Você continua usando a sua ficha, com os atributos físicos e o deslocamento do alvo.",
      efeitos: [
        "Quem passa na resistência sabe da tentativa e fica imune ao ritual por um dia.",
        "Se qualquer um dos dois morrer, a mente sobrevivente fica presa no corpo novo — a não ser que conjure o ritual outra vez.",
        "Voltar ao próprio corpo de propósito é uma ação livre.",
      ],
      versoes: [] },

    { id: "op.ritual.presenca-do-medo", nome: "Presença do Medo", elemento: ME, circulo: 4, fonte: OP, pagina: 139,
      execucao: "padrão", alcance: "pessoal", area: "emanação de 9 m de raio", duracao: "sustentada",
      resumo: "Você vira receptáculo do Medo puro e emana ondas de pavor: quem está na área ao conjurar, ou no início de cada turno seu, sofre 5d8 de dano mental e 5d8 de dano de Medo (Vontade reduz os dois à metade). Quem falha fica atordoado por uma rodada, uma vez por cena.",
      versoes: [
        { nome: "Normal", dano: "5d8", rolagens: [{ tipo: "dano", rotulo: "Dano de Medo", expressao: "5d8" }] },
      ],
      notas: ["São duas rolagens separadas: 5d8 de dano mental e 5d8 de dano de Medo."] },

    { id: "op.ritual.protecao-contra-rituais", nome: "Proteção contra Rituais", elemento: ME, circulo: 2, fonte: OP, pagina: 139,
      execucao: "padrão", alcance: "toque", alvo: "1 ser", duracao: "cena",
      resumo: "Uma aura de Medo puro protege o alvo do paranormal: resistência a dano paranormal 5 e +5 em testes de resistência contra rituais e habilidades de criaturas paranormais.",
      versoes: [
        { nome: "Discente", custo: 3, requisito: "3º círculo", alteracoes: "Alvo “até 5 seres tocados”." },
        { nome: "Verdadeiro", custo: 6, requisito: "4º círculo", alteracoes: "Alvo “até 5 seres tocados”, resistência a dano 10 e bônus +10 nos testes de resistência." },
      ] },

    { id: "op.ritual.purgatorio", nome: "Purgatório", elemento: SA, circulo: 3, fonte: OP, pagina: 139,
      execucao: "padrão", alcance: "curto", area: "6 m de raio", duracao: "sustentada", resistencia: "Fortitude parcial",
      resumo: "Uma poça de sangue pegajoso brota na área e deixa os inimigos dentro dela vulneráveis a dano balístico, de corte, de impacto e de perfuração. Quem tenta sair sente uma dor terrível: 6d6 de dano de Sangue e um teste de Fortitude — passando, sai; falhando, perde a ação de movimento.",
      versoes: [
        { nome: "Normal", dano: "6d6" },
      ],
      notas: ["A linha do livro diz “Alvo: área de 6 m de raio”; o catálogo guarda o valor como área."] },

    { id: "op.ritual.rejeitar-nevoa", nome: "Rejeitar Névoa", elemento: ME, circulo: 2, fonte: OP, pagina: 139,
      execucao: "padrão", alcance: "curto", area: "nuvem de 6 m de raio", duracao: "cena",
      resumo: "Um redemoinho de névoa atravessa a área e atrapalha quem conjura dentro dela: +2 PE por círculo no custo e execução um passo mais lenta (livre → movimento → padrão → completa → duas rodadas).",
      efeitos: ["Rejeitar Névoa anula Cinerária, a menos que o conjurador dela gaste uma ação completa por rodada para manter o ritual — e aí os dois se neutralizam."],
      versoes: [
        { nome: "Discente", custo: 2, alteracoes: "Além do normal, a DT dos testes de resistência contra rituais conjurados na área cai 5." },
        { nome: "Verdadeiro", custo: 5, alteracoes: "Como a discente, e o dano de rituais dentro da névoa é sempre o mínimo." },
      ] },

    { id: "op.ritual.salto-fantasma", nome: "Salto Fantasma", elemento: EN, circulo: 3, fonte: OP, pagina: 139,
      execucao: "padrão", alcance: "médio", alvo: "você", duracao: "instantânea",
      resumo: "Seu corpo vira Energia pura e reaparece em outro ponto do alcance. Você não precisa ver o destino nem ter linha de efeito, basta já ter observado o lugar (pessoalmente, em foto, em vídeo). Depois do salto você não age mais neste turno.",
      efeitos: ["Não dá para aparecer dentro de um corpo sólido: sem espaço livre, você surge na área vazia mais próxima."],
      versoes: [
        { nome: "Discente", custo: 2, alteracoes: "Execução reação: em vez do normal, você salta para um espaço adjacente e recebe +10 na Defesa e em Reflexos contra o ataque ou efeito que está a ponto de atingi-lo." },
        { nome: "Verdadeiro", custo: 4, alteracoes: "Alcance longo e alvo você mais até dois seres voluntários que esteja tocando." },
      ] },

    { id: "op.ritual.sopro-do-caos", nome: "Sopro do Caos", elemento: EN, circulo: 2, fonte: OP, pagina: 140,
      execucao: "padrão", alcance: "médio", area: "varia", duracao: "sustentada", resistencia: "veja texto",
      resumo: "Você move massas de ar de forma caótica. Ao conjurar, escolha Ascender, Sopro ou Vento.",
      efeitos: [
        "Ascender: uma corrente ascendente ergue um ser ou objeto Médio; uma ação de movimento o sobe ou desce até 6 m por rodada, até 30 m de altura. Quem levita fica vulnerável; alvo involuntário faz Fortitude no início de cada turno para encerrar. Parar a corrente causa o dano normal de queda, e serve como manobra derrubar contra alvo voador, com Ocultismo em vez de Luta.",
        "Sopro: uma lufada num cone de 4,5 m empurra alvos Médios ou menores — manobra empurrar com Ocultismo, uma rolagem para todos —, além de fazer o que um vento forte e súbito faria. Manter exige ação padrão.",
        "Vento: cria uma área de vento forte no alcance (ou aumenta um efeito de vento existente em um passo); manter exige ação de movimento. Também serve para reduzir vento.",
      ],
      versoes: [
        { nome: "Discente", custo: 3, alteracoes: "Passa a afetar alvos Grandes." },
        { nome: "Verdadeiro", custo: 9, alteracoes: "Passa a afetar alvos Enormes." },
      ] },

    { id: "op.ritual.tecer-ilusao", nome: "Tecer Ilusão", elemento: CO, circulo: 1, fonte: OP, pagina: 140,
      execucao: "padrão", alcance: "médio", efeito: "ilusão que se estende a até 4 cubos de 1,5 m", duracao: "cena", resistencia: "Vontade desacredita",
      resumo: "Você cria uma ilusão visual (uma pessoa, uma parede) ou sonora (um grito, um uivo) simples, com volume de uma voz humana por cubo de 1,5 m. Nada de cheiros, texturas, temperaturas ou sons complexos. Seres e objetos atravessam a ilusão sem sofrer dano — mas ela esconde uma armadilha ou emboscada. Sair do alcance dissipa.",
      versoes: [
        { nome: "Discente", custo: 2, requisito: "2º círculo", alteracoes: "Até 8 cubos e duração sustentada: imagem e som combinados, sons complexos, odores, sensações térmicas e táteis. Objetos ainda atravessam, mas seres precisam passar em Vontade para isso. Uma ação livre por rodada move ou altera a ilusão, que continua sem causar nem sofrer dano; ao parar de sustentar, ela persiste por uma rodada." },
        { nome: "Verdadeiro", custo: 5, requisito: "3º círculo", alteracoes: "A ilusão é de um perigo mortal: ao conjurar e no início de cada turno seu, quem interage faz Vontade e, falhando, acredita e sofre 6d6 de dano de Conhecimento, racionalizando o efeito. Dois sucessos seguidos anulam para aquele alvo.", dano: "6d6" },
      ] },

    { id: "op.ritual.tela-de-ruido", nome: "Tela de Ruído", elemento: EN, circulo: 2, fonte: OP, pagina: 141,
      execucao: "padrão", alcance: "pessoal", alvo: "você", duracao: "cena",
      resumo: "Uma película de energia recobre o corpo e absorve energia cinética: 30 PV temporários, válidos só contra dano balístico, de corte, de impacto ou de perfuração. Como alternativa, conjurado em reação ao sofrer dano, dá resistência 15 contra aquele dano.",
      versoes: [
        { nome: "Normal", rolagens: [{ tipo: "outra", rotulo: "PV temporários", expressao: "", extra: "30" }] },
        { nome: "Discente", custo: 3, alteracoes: "PV temporários 60 e resistência 30.",
          rolagens: [{ tipo: "outra", rotulo: "PV temporários", expressao: "", extra: "60" }] },
        { nome: "Verdadeiro", custo: 7, requisito: "4º círculo", alteracoes: "Alcance curto e alvo “1 ser ou objeto Enorme ou menor”: em vez do normal, cria uma esfera imóvel e tremeluzente do tamanho do alvo, centrada nele. Nada — ser, objeto ou efeito de dano — passa pela esfera, e quem está dentro respira normalmente. Reflexos evita ser aprisionado." },
      ] },

    { id: "op.ritual.teletransporte", nome: "Teletransporte", elemento: EN, circulo: 4, fonte: OP, pagina: 141,
      execucao: "padrão", alcance: "toque", alvo: "até 5 seres voluntários", duracao: "instantânea",
      resumo: "Corpo e equipamento dos alvos viram energia pura e reaparecem num lugar à sua escolha em até 1.000 km. Ao conjurar, um teste de Ocultismo com DT pelo seu conhecimento do destino: DT 25 para um lugar que você visita com frequência, DT 30 para um que já visitou uma vez, DT 35 para um que só conhece pela descrição de quem esteve lá.",
      efeitos: [
        "Sem visita nem descrição, não há destino: não dá para ir “onde a Júlia está presa”.",
        "Falhando, você chega a um lugar parecido, errado ou distante (até 1d10 × 10 km). Falhando por 5 ou mais, o ritual falha, os PE são gastos e você fica atordoado por 1d4 rodadas.",
      ],
      versoes: [
        { nome: "Verdadeiro", custo: 5, alteracoes: "Pode se teletransportar para qualquer lugar da Terra." },
      ] },

    { id: "op.ritual.tentaculos-de-lodo", nome: "Tentáculos de Lodo", elemento: MO, circulo: 3, fonte: OP, pagina: 141,
      execucao: "padrão", alcance: "médio", area: "círculo de 6 m de raio", duracao: "cena",
      resumo: "Uma fenda no chão solta tentáculos de lodo da Morte. Ao conjurar e no início de cada turno seu, você faz a manobra agarrar (com Ocultismo em vez de Luta) contra cada alvo na área: vencendo, o ser fica agarrado; se já estava, é esmagado e sofre 4d6 de dano (metade impacto, metade Morte).",
      efeitos: ["A área conta como terreno difícil, e os tentáculos são imunes a dano."],
      versoes: [
        { nome: "Normal", dano: "4d6" },
        { nome: "Verdadeiro", custo: 5, alteracoes: "Raio 9 m e dano 6d6.", dano: "6d6" },
      ] },

    { id: "op.ritual.terceiro-olho", nome: "Terceiro Olho", elemento: CO, circulo: 1, fonte: OP, pagina: 141,
      execucao: "padrão", alcance: "pessoal", alvo: "você", duracao: "cena",
      resumo: "Sigilos enchem seus olhos e você passa a ver auras paranormais em alcance longo — rituais, itens amaldiçoados e criaturas —, sabendo o elemento e o poder aproximado de cada uma.",
      efeitos: [
        "Aura fraca: rituais de 1º círculo e criaturas de VD até 80. Moderada: 2º e 3º círculos e VD 81 a 280. Poderosa: 4º círculo e VD 281 ou mais.",
        "Uma ação de movimento descobre se um ser que você vê em alcance médio tem poderes paranormais ou conjura rituais, e de quais elementos.",
      ],
      versoes: [
        { nome: "Discente", custo: 2, alteracoes: "Duração 1 dia." },
        { nome: "Verdadeiro", custo: 5, alteracoes: "Também mostra objetos e seres invisíveis, como formas translúcidas." },
      ] },

    { id: "op.ritual.transfigurar-agua", nome: "Transfigurar Água", elemento: EN, circulo: 3, fonte: OP, pagina: 142,
      execucao: "padrão", alcance: "longo", area: "esfera de 30 m de raio", duracao: "cena", resistencia: "veja texto",
      resumo: "Você dá à água comportamentos paranormais e caóticos. Ao conjurar, escolha um efeito.",
      efeitos: [
        "Congelar: toda a água mundana da área congela; quem estava nadando fica imóvel e escapa com uma ação padrão e Atletismo (DT do ritual).",
        "Derreter: o gelo mundano da área vira água e o ritual termina; pode criar terreno difícil.",
        "Enchente: o nível da água sobe até 4,5 m; como alternativa, vira “alvo: uma embarcação”, que recebe +6 m de deslocamento pela duração.",
        "Evaporar: toda a água e o gelo evaporam na hora e o ritual termina; seres vivos na área sofrem 5d8 de dano de Energia (Fortitude reduz à metade), e criaturas de Morte, o dobro.",
        "Partir: o nível da água baixa até 4,5 m, abrindo caminho seco em água rasa ou um redemoinho que prende barcos em água profunda (Pilotagem com a DT do ritual livra a embarcação).",
      ],
      versoes: [
        { nome: "Normal", rolagens: [{ tipo: "dano", rotulo: "Evaporar", expressao: "5d8" }] },
        { nome: "Verdadeiro", custo: 5, alteracoes: "Enchente dá +12 m de deslocamento e evaporar causa 10d8.",
          rolagens: [{ tipo: "dano", rotulo: "Evaporar", expressao: "10d8" }] },
      ] },

    { id: "op.ritual.transfigurar-terra", nome: "Transfigurar Terra", elemento: EN, circulo: 3, fonte: OP, pagina: 142,
      execucao: "padrão", alcance: "longo", area: "9 cubos de 1,5 m de lado", duracao: "instantânea", resistencia: "veja texto",
      resumo: "Você imbui terra, pedra, lama, argila ou areia com Energia. Ao conjurar, escolha um efeito.",
      efeitos: [
        "Amolecer: no teto, numa coluna ou num suporte, provoca desabamento com 10d6 de dano de impacto na área (Reflexos reduz à metade); num piso, cria terreno difícil de areia ou argila.",
        "Modelar: com pedra ou argila, cria objetos simples de tamanho Enorme ou menor, sem partes móveis — um martelo, uma passagem numa parede, paredes de cobertura total (RD 8 e 50 PV a cada 3 m).",
        "Solidificar: lama ou areia vira terra ou pedra, e quem está com os pés na superfície fica agarrado (ação padrão e Atletismo, DT do ritual, para soltar).",
      ],
      versoes: [
        { nome: "Normal", rolagens: [{ tipo: "dano", rotulo: "Amolecer (desabamento)", expressao: "10d6" }] },
        { nome: "Discente", custo: 3, alteracoes: "Área de 15 cubos de 1,5 m de lado.",
          rolagens: [{ tipo: "dano", rotulo: "Amolecer (desabamento)", expressao: "10d6" }] },
        { nome: "Verdadeiro", custo: 7, requisito: "4º círculo", alteracoes: "Também afeta todos os minerais e metais.",
          rolagens: [{ tipo: "dano", rotulo: "Amolecer (desabamento)", expressao: "10d6" }] },
      ] },

    { id: "op.ritual.transfusao-vital", nome: "Transfusão Vital", elemento: SA, circulo: 2, fonte: OP, pagina: 142,
      execucao: "padrão", alcance: "toque", alvo: "1 ser", duracao: "instantânea",
      resumo: "Você transfere a própria energia vital: sofre até 30 pontos de dano de Sangue e o alvo recupera a mesma quantidade em PV. O ritual nunca o deixa com menos de 1 PV.",
      versoes: [
        { nome: "Discente", custo: 3, requisito: "3º círculo", alteracoes: "Transfere até 50 pontos de vida." },
        { nome: "Verdadeiro", custo: 7, requisito: "4º círculo", alteracoes: "Transfere até 100 pontos de vida." },
      ],
      notas: ["A quantidade transferida é escolhida na hora, até o limite da versão: não há expressão de dados para rolar."] },

    { id: "op.ritual.velocidade-mortal", nome: "Velocidade Mortal", elemento: MO, circulo: 2, fonte: OP, pagina: 142,
      execucao: "padrão", alcance: "curto", alvo: "1 ser", duracao: "sustentada",
      resumo: "O tempo se distorce ao redor do alvo, que fica muito veloz: recebe uma ação de movimento adicional por turno, que não pode conjurar rituais.",
      versoes: [
        { nome: "Discente", custo: 3, alteracoes: "Em vez da ação de movimento, o alvo recebe uma ação padrão adicional por turno." },
        { nome: "Verdadeiro", custo: 7, requisito: "4º círculo e afinidade", alteracoes: "Alvo “alvos escolhidos”." },
      ] },

    { id: "op.ritual.videncia", nome: "Vidência", elemento: CO, circulo: 3, fonte: OP, pagina: 143,
      execucao: "completa", alcance: "ilimitado", alvo: "1 ser", duracao: "5 rodadas", resistencia: "Vontade anula",
      resumo: "Por uma superfície reflexiva — espelho, bacia de água, TV desligada — você vê e ouve um ser e o que está a cerca de 6 m dele, a qualquer distância. No início de cada turno dele, um teste de resistência impede a vidência naquele turno; dois sucessos seguidos encerram o ritual e o deixam imune por uma semana.",
      efeitos: [
        "O ritual exige alguma informação do alvo (nome, foto).",
        "O quanto você conhece o alvo muda a resistência dele: sabendo o mínimo, +10; com algumas informações ou já o tendo visto, +5; conhecendo bem, sem ajuste; com um pertence pessoal, −5; com uma parte do corpo dele, −10.",
      ],
      versoes: [] },

    { id: "op.ritual.vinculo-de-sangue", nome: "Vínculo de Sangue", elemento: SA, circulo: 4, fonte: OP, pagina: 143,
      execucao: "padrão", alcance: "curto", alvo: "1 ser", duracao: "cena", resistencia: "Fortitude anula",
      resumo: "Um símbolo de Sangue aparece no seu corpo e no do alvo: sempre que você sofrer dano, ele faz Fortitude e, falhando, cada um leva metade.",
      efeitos: [
        "Dá para conjurar ao contrário: você recebe metade de todo o dano que o alvo sofreria.",
        "Alvo voluntário não faz teste de resistência.",
      ],
      versoes: [] },

    { id: "op.ritual.vomitar-pestes", nome: "Vomitar Pestes", elemento: SA, circulo: 3, fonte: OP, pagina: 143,
      execucao: "padrão", alcance: "médio", efeito: "1 enxame Grande (quadrado de 3 m)", duracao: "sustentada", resistencia: "Reflexos reduz à metade",
      resumo: "Você vomita um enxame de pequenas criaturas de Sangue num ponto adjacente. Ele passa pelo espaço de outros seres e, no fim de cada turno seu, causa 5d12 de dano de Sangue em quem estiver no espaço dele (Reflexos reduz à metade). Uma ação de movimento o desloca 12 m.",
      versoes: [
        { nome: "Normal", dano: "5d12" },
        { nome: "Discente", custo: 2, alteracoes: "Além do normal, quem falha em Reflexos fica agarrado pelo enxame e escapa com uma ação padrão e Acrobacia ou Atletismo; mover o enxame liberta o alvo.", dano: "5d12" },
        { nome: "Verdadeiro", custo: 5, alteracoes: "O enxame vira Enorme (cubo de 6 m) e ganha deslocamento de voo 18 m.", dano: "5d12" },
      ] },

    { id: "op.ritual.zerar-entropia", nome: "Zerar Entropia", elemento: MO, circulo: 3, fonte: OP, pagina: 143,
      execucao: "padrão", alcance: "curto", alvo: "1 pessoa", duracao: "cena", resistencia: "Vontade parcial",
      resumo: "Você zera a entropia do alvo em relação ao ambiente e ele fica paralisado — ou lento, se passar na resistência. No início de cada turno dele, uma ação completa permite um novo teste de Vontade para encerrar.",
      versoes: [
        { nome: "Discente", custo: 4, requisito: "4º círculo", alteracoes: "Alvo “1 ser”." },
        { nome: "Verdadeiro", custo: 11, requisito: "4º círculo e afinidade", alteracoes: "Alvo “seres escolhidos”." },
      ] },

    /* =================================================================
       SOBREVIVENDO AO HORROR — SAH p. 48–56, por elemento e círculo
       ================================================================= */

    { id: "sah.ritual.esfolar", nome: "Esfolar", elemento: SA, circulo: 1, fonte: SAH, pagina: 48,
      execucao: "padrão", alcance: "curto", alvo: "1 ser", duracao: "instantânea", resistencia: "Reflexos parcial",
      resumo: "Seu corpo vira passagem para o Sangue e projeta agulhas e lâminas rubras quase invisíveis: o alvo sofre 3d4+3 de dano de corte e fica sangrando. Passando na resistência, metade do dano e sem a condição.",
      versoes: [
        { nome: "Normal", dano: "3d4", danoExtra: "3" },
        { nome: "Discente", custo: 2, requisito: "2º círculo", alteracoes: "Alcance médio, dano 5d4+5 e alvo “explosão de 6 m de raio”.", dano: "5d4", danoExtra: "5" },
        { nome: "Verdadeiro", custo: 5, requisito: "3º círculo", alteracoes: "Alcance longo, dano 10d4+10, alvo “explosão de 6 m de raio”, e passar na resistência não evita o sangramento.", dano: "10d4", danoExtra: "10" },
      ] },

    { id: "sah.ritual.sede-de-adrenalina", nome: "Sede de Adrenalina", elemento: SA, circulo: 2, fonte: SAH, pagina: 49,
      execucao: "reação", alcance: "pessoal", alvo: "você", duracao: "instantânea",
      resumo: "Ao falhar num teste de Acrobacia ou Atletismo, você repete o teste usando Presença no lugar do atributo da perícia. Como alternativa, ao sofrer dano de impacto, reduz esse dano em 20. Uma vez por rodada, de um jeito ou de outro.",
      efeitos: ["Usando para reduzir dano, você passa 1 rodada atordoado enquanto o Sangue retorce seus ossos — mesmo que o dano chegue a 0."],
      versoes: [
        { nome: "Discente", custo: 3, alteracoes: "A redução de dano de impacto vira 40." },
        { nome: "Verdadeiro", custo: 7, requisito: "4º círculo e afinidade", alteracoes: "A redução de dano de impacto vira 70." },
      ] },

    { id: "sah.ritual.odor-da-cacada", nome: "Odor da Caçada", elemento: SA, circulo: 3, fonte: SAH, pagina: 49,
      execucao: "padrão", alcance: "pessoal", alvo: "você", duracao: "cena",
      resumo: "Os odores ao redor se intensificam e você recebe faro (OPRPG p. 179). Numa cena de perseguição, ganha +5 nos testes de Atletismo e não perde PV pela ação de esforço extra, desde que quem persegue (ou quem é perseguido) emita odor.",
      efeitos: ["O preço vem na cena seguinte: você fica sob fome e sede (OPRPG p. 292) como se tivesse falhado no teste de Fortitude do primeiro dia."],
      versoes: [
        { nome: "Discente", custo: 4, alteracoes: "Alcance toque e alvo “1 ser”." },
        { nome: "Verdadeiro", custo: 9, requisito: "afinidade", alteracoes: "Alcance curto e alvo “até 5 seres”." },
      ] },

    { id: "sah.ritual.martirio-de-sangue", nome: "Martírio de Sangue", elemento: SA, circulo: 4, fonte: SAH, pagina: 50,
      execucao: "padrão", alcance: "pessoal", alvo: "você", duracao: "veja texto",
      resumo: "Você se entrega ao Sangue e vira uma monstruosidade bestial: faro, visão no escuro, cura acelerada 10, +10 em testes de ataque, em rolagens de dano corpo a corpo e na Defesa, 30 PV temporários, e seus ataques desarmados causam um dado de dano adicional e passam a ser letais (corte, impacto ou perfuração, à sua escolha no ataque).",
      efeitos: [
        "Depois de conjurar, você não faz mais nada que exija foco e concentração — conjurar rituais, por exemplo.",
        "Pela aparência e pela violência, você sofre −3 dados em perícias de interação social, como Diplomacia e Enganação.",
        "Este ritual não tem fim: quando a cena acaba, você se torna permanentemente uma criatura de Sangue e o personagem está perdido.",
      ],
      versoes: [
        { nome: "Normal", rolagens: [{ tipo: "outra", rotulo: "PV temporários", expressao: "", extra: "30" }] },
        { nome: "Discente", custo: 5, requisito: "afinidade", alteracoes: "Os bônus viram +20 e os PV temporários, 50.",
          rolagens: [{ tipo: "outra", rotulo: "PV temporários", expressao: "", extra: "50" }] },
      ] },

    { id: "sah.ritual.apagar-as-luzes", nome: "Apagar as Luzes", elemento: MO, circulo: 1, fonte: SAH, pagina: 50,
      execucao: "padrão", alcance: "pessoal", alvo: "você", duracao: "instantânea",
      resumo: "Toda fonte de luz em alcance curto — natural ou paranormal — se apaga do jeito mais dramático possível: lâmpadas estouram, janelas se fecham, nuvens cobrem o sol. Você recebe visão no escuro até o fim da cena.",
      efeitos: ["O apagão é instantâneo, mas o que é temporário (a nuvem, a janela) continua segurando a escuridão até o fim da cena."],
      versoes: [
        { nome: "Discente", custo: 2, requisito: "2º círculo", alteracoes: "O alcance para determinar as fontes de luz vira longo." },
        { nome: "Verdadeiro", custo: 5, requisito: "3º círculo", alteracoes: "Como a discente, e até cinco outros seres no alcance também recebem visão no escuro." },
      ] },

    { id: "sah.ritual.lingua-morta", nome: "Língua Morta", elemento: MO, circulo: 2, fonte: SAH, pagina: 51,
      execucao: "padrão", alcance: "toque", alvo: "1 cadáver", duracao: "sustentada",
      resumo: "O Lodo da Morte reanima um cadáver humano preparado, que responde uma pergunta sobre a própria vida por rodada sustentada, até três rodadas. Não há teste: a clareza das respostas depende do estado do corpo e do mestre.",
      efeitos: [
        "Encerrando antes da terceira pergunta, o cadáver se desmancha em Lodo preto.",
        "Depois da terceira resposta, ele é consumido e vira um esqueleto de Lodo (OPRPG p. 217).",
      ],
      versoes: [
        { nome: "Discente", custo: 3, alteracoes: "Limite de quatro rodadas; no fim, o cadáver vira um enraizado (OPRPG p. 214)." },
        { nome: "Verdadeiro", custo: 7, requisito: "4º círculo e afinidade", alteracoes: "Limite de cinco rodadas; no fim, o cadáver vira uma marionete (OPRPG p. 218)." },
      ] },

    { id: "sah.ritual.fedor-putrido", nome: "Fedor Pútrido", elemento: MO, circulo: 3, fonte: SAH, pagina: 52,
      execucao: "padrão", alcance: "pessoal", alvo: "você", duracao: "sustentada",
      resumo: "Você cobre o corpo com o fedor da Morte: o coração para, o sangue cessa, tudo passa a ser sustentado pelo Lodo. Animais se afastam por instinto, você sofre −3 dados em Diplomacia, recebe +5 em Furtividade e +10 em Enganação para se fingir de morto. Parado numa cena de furtividade, sua visibilidade conta 1 ponto menor.",
      efeitos: [
        "Você não está morto nem é morto-vivo: doenças e efeitos biológicos continuam valendo, e você ainda precisa dormir.",
        "Cada rodada sustentando custa 1d4 de dano de Morte, que ignora resistências.",
      ],
      versoes: [
        { nome: "Normal", rolagens: [{ tipo: "dano", rotulo: "Dano por rodada", expressao: "1d4" }] },
        { nome: "Discente", custo: 4, alteracoes: "Alcance toque e alvo “1 ser voluntário”.",
          rolagens: [{ tipo: "dano", rotulo: "Dano por rodada", expressao: "1d4" }] },
        { nome: "Verdadeiro", custo: 9, requisito: "afinidade", alteracoes: "Alcance curto e alvo “até 5 seres voluntários”.",
          rolagens: [{ tipo: "dano", rotulo: "Dano por rodada", expressao: "1d4" }] },
      ] },

    { id: "sah.ritual.singularidade-temporal", nome: "Singularidade Temporal", elemento: MO, circulo: 4, fonte: SAH, pagina: 52,
      execucao: "padrão", alcance: "curto", alvo: "1 objeto não paranormal Médio", duracao: "instantânea", resistencia: "veja texto",
      resumo: "Espirais avançam o objeto no tempo até o estado de decomposição mais avançado que algo daquele tipo poderia alcançar. Uma maçã apodrece por inteiro; um diamante talvez nem sinta; um pneu resseca e rasga.",
      efeitos: [
        "Em regra, o objeto pode ficar danificado (por exemplo, −5 nos testes em que é usado) ou ser destruído — a natureza dele decide, com o mestre.",
        "Objeto em uso por alguém também pode ser afetado, mas a pessoa faz um teste de Fortitude para protegê-lo.",
      ],
      versoes: [
        { nome: "Discente", custo: 5, alteracoes: "Objeto de tamanho Grande." },
        { nome: "Verdadeiro", custo: 10, alteracoes: "Objeto de tamanho Enorme." },
      ] },

    { id: "sah.ritual.desfazer-sinapses", nome: "Desfazer Sinapses", elemento: CO, circulo: 1, fonte: SAH, pagina: 53,
      execucao: "padrão", alcance: "curto", alvo: "1 ser", duracao: "instantânea", resistencia: "Vontade parcial",
      resumo: "A entidade do Conhecimento faz bilhões de neurônios do alvo deixarem de existir: 2d6+2 de dano de Conhecimento e frustrado por uma rodada. Passando na resistência, metade do dano e sem a condição. O alvo precisa ter cérebro — o efeito parece uma dor de cabeça severa, com sangramento leve pelos olhos, nariz, orelhas e boca.",
      versoes: [
        { nome: "Normal", dano: "2d6", danoExtra: "2" },
        { nome: "Discente", custo: 2, requisito: "2º círculo", alteracoes: "Alcance longo, dano 3d6+3 e alvo “até 5 seres à sua escolha”.", dano: "3d6", danoExtra: "3" },
        { nome: "Verdadeiro", custo: 5, requisito: "3º círculo", alteracoes: "Alcance extremo, dano 8d6+8 e a condição vira esmorecido (frustrado, se passar na resistência).", dano: "8d6", danoExtra: "8" },
      ] },

    { id: "sah.ritual.aurora-da-verdade", nome: "Aurora da Verdade", elemento: CO, circulo: 2, fonte: SAH, pagina: 53,
      execucao: "padrão", alcance: "curto", area: "esfera de 3 m de raio", duracao: "sustentada", resistencia: "Vontade parcial",
      resumo: "Uma luz espectral, como uma aurora dourada, ocupa a área: todo ser dentro dela — incluindo você — só consegue falar a verdade. Quem passa na resistência consegue mentir (e ainda pode ser pego por Intuição).",
      efeitos: ["Quem tenta se esconder, ganhar camuflagem ou ficar invisível dentro da luz é revelado na hora por sigilos minúsculos."],
      versoes: [
        { nome: "Discente", custo: 3, alteracoes: "Alcance médio, área esfera de 9 m de raio, e o conjurador deixa de ser afetado." },
        { nome: "Verdadeiro", custo: 7, requisito: "4º círculo e afinidade", alteracoes: "Como a discente, com alcance longo e duração cena; você também ouve tudo o que é falado na área, a qualquer distância." },
      ] },

    { id: "sah.ritual.relembrar-fragmento", nome: "Relembrar Fragmento", elemento: CO, circulo: 3, fonte: SAH, pagina: 54,
      execucao: "padrão", alcance: "toque", alvo: "1 objeto", duracao: "instantânea",
      resumo: "Você toca uma fonte de conhecimento escrito — livro, caderno, papel, pergaminho — ilegível pelo tempo ou por dano, e basta um pedaço do tamanho de um dedo mindinho: o objeto é restaurado ao momento da última anotação, e continua assim enquanto você o segurar.",
      efeitos: [
        "Soltando o objeto, ele volta ao estado danificado.",
        "O Conhecimento não relembra objetos destruídos por meios paranormais.",
      ],
      versoes: [
        { nome: "Discente", custo: 4, alteracoes: "O objeto continua restaurado até o fim da missão." },
        { nome: "Verdadeiro", custo: 9, requisito: "afinidade", alteracoes: "Em vez de restaurar, o ritual altera o objeto de forma imperceptível, como você quiser (uma folha qualquer vira um porte de arma “legítimo”), e a alteração dura até o fim da missão." },
      ] },

    { id: "sah.ritual.pronunciar-sigilo", nome: "Pronunciar Sigilo", elemento: CO, circulo: 4, fonte: SAH, pagina: 54,
      execucao: "padrão", alcance: "curto", alvo: "1 ser", duracao: "instantânea / veja texto", resistencia: "Vontade parcial",
      resumo: "Você pronuncia em voz alta um dos Sigilos do Conhecimento — um som indescritível, impossível de gravar ou lembrar — e deturpa a natureza de um ser. Escolha um efeito ao conjurar.",
      efeitos: [
        "Esquecer: o alvo esquece quem é ou o que está fazendo e fica atordoado por 1d4+1 rodadas (uma vez por cena); passando na resistência, ou já tendo sido atordoado pelo ritual, fica desprevenido por 1d4 rodadas.",
        "Cegar: o alvo fica cego; passando, ofuscado por 1d4 rodadas.",
        "Inexistir: o alvo deixa de existir por 1d4+1 rodadas (1 rodada, se passar) e volta ao espaço onde estava, ou a um adjacente se estiver ocupado. Criatura volta a um ponto à escolha dela num raio de 18 m. Uma vez por cena por ser.",
      ],
      versoes: [
        { nome: "Discente", custo: 5, alteracoes: "Alcance extremo." },
        { nome: "Verdadeiro", custo: 10, requisito: "afinidade", alteracoes: "Alvo até cinco seres." },
      ] },

    { id: "sah.ritual.overclock", nome: "Overclock", elemento: EN, circulo: 1, fonte: SAH, pagina: 55,
      execucao: "reação", alcance: "pessoal", alvo: "você", duracao: "instantânea",
      resumo: "Depois de saber o resultado de um teste de Tecnologia sobre um objeto eletrônico, você conjura o ritual para arrancar a informação de outra forma, forçando o aparelho com descargas de Energia.",
      efeitos: [
        "A informação sai de um desafio na mesa: o mestre toca uma música e você mexe os dedos como num teclado invisível; quando a música para, você precisa ficar imóvel. Qualquer movimento errado falha. Chegando ao fim da música, você descobre o que queria. A mesa pode trocar o jogo de estátua por outro jogo analógico.",
        "Com informação ou sem, o aparelho fica inutilizável: chiados, cores contrastantes, imagens invertidas e janelas aleatórias, como se tivesse um vírus paranormal.",
      ],
      versoes: [
        { nome: "Discente", custo: 2, requisito: "2º círculo", alteracoes: "Você só falha se errar duas vezes no jogo." },
        { nome: "Verdadeiro", custo: 5, requisito: "3º círculo", alteracoes: "Você só falha se errar três vezes no jogo." },
      ] },

    { id: "sah.ritual.tremeluzir", nome: "Tremeluzir", elemento: EN, circulo: 2, fonte: SAH, pagina: 55,
      execucao: "padrão", alcance: "pessoal", alvo: "você", duracao: "sustentada",
      resumo: "A Energia reorganiza suas moléculas em fótons e sua matéria pisca como um monitor oscilando: você e tudo o que carrega atravessam objetos sólidos.",
      efeitos: [
        "Você não fica incorpóreo: cada objeto atravessado exige uma ação de movimento, com 25% de chance (1 em 1d4) de dar de cara com ele.",
        "Numa cena de perseguição, você usa a ação de cortar caminho sem penalidade em Atletismo.",
        "Cada rodada ativa custa 1d4 de dano de Energia que ignora resistência, e mais 1d4 se você terminar a rodada com o corpo (ou parte dele) dentro de um objeto sólido.",
      ],
      versoes: [
        { nome: "Normal", rolagens: [
          { tipo: "dano", rotulo: "Dano por rodada", expressao: "1d4" },
          { tipo: "outra", rotulo: "Atravessar (1 em 1d4 falha)", expressao: "1d4" },
        ] },
        { nome: "Discente", custo: 3, alteracoes: "Alcance toque e alvo “1 ser voluntário”.",
          rolagens: [{ tipo: "dano", rotulo: "Dano por rodada", expressao: "1d4" }] },
        { nome: "Verdadeiro", custo: 7, requisito: "4º círculo", alteracoes: "Alcance curto e alvo “até 5 seres voluntários”.",
          rolagens: [{ tipo: "dano", rotulo: "Dano por rodada", expressao: "1d4" }] },
      ] },

    { id: "sah.ritual.mutar", nome: "Mutar", elemento: EN, circulo: 3, fonte: SAH, pagina: 56,
      execucao: "padrão", alcance: "pessoal", alvo: "você", duracao: "cena",
      resumo: "A Energia distorce as ondas ao seu redor e nenhum som sai de você — passos, disparos, voz. Em troca, som nenhum chega até você. O ritual dá +10 em Furtividade e reduz em 1 o ganho de visibilidade em cenas de furtividade, a critério do mestre.",
      efeitos: ["Na mesa: quem está sob o efeito só fala com permissão do mestre, mesmo para descrever ações; falar sem permissão desfaz o ritual."],
      versoes: [
        { nome: "Discente", custo: 4, alteracoes: "Alcance toque e alvo “1 ser”." },
        { nome: "Verdadeiro", custo: 9, requisito: "afinidade com Energia", alteracoes: "Alcance curto e alvo “até 5 seres”." },
      ] },

    { id: "sah.ritual.milagre-ionizante", nome: "Milagre Ionizante", elemento: EN, circulo: 3, fonte: SAH, pagina: 56,
      execucao: "completa", alcance: "toque", alvo: "1 ser", duracao: "instantânea",
      resumo: "Você usa o caos para destruir só a estrutura maligna que habita um corpo: cura o alvo de uma condição à sua escolha entre abalado, apavorado, alquebrado, atordoado, cego, confuso, debilitado, enjoado, envenenado, esmorecido, exausto, fascinado, fatigado, fraco, frustrado, lento, ofuscado, paralisado, pasmo ou surdo, ou de uma doença ou veneno.",
      efeitos: [
        "Alcança efeitos paranormais, exceto os causados pela entidade de Energia e condições permanentes.",
        "O caos cobra o preço: depois da cura, o alvo faz Fortitude (DT 30) e, falhando, é incubado pelo vírus do infectcídio (OPRPG p. 292).",
      ],
      versoes: [],
      notas: ["O SAH imprime “ENERGIA 3” para este ritual. Nos outros elementos o capítulo traz um ritual de cada círculo (1º ao 4º), e aqui Energia fica com dois de 3º e nenhum de 4º; o catálogo mantém o círculo impresso."] },

  ];

  /* FIM DOS RITUAIS — o próximo lote entra acima desta linha. */

  global.RAMAOrdemRituaisDados = {
    versao: 1,
    fontes: {
      OPRPG: { nome: "Ordem Paranormal RPG", curto: "Livro básico", edicao: "v1.1" },
      SAH: { nome: "Sobrevivendo ao Horror", curto: "Sobrevivendo ao Horror", edicao: "v1.2" },
    },
    rituais: RITUAIS,
  };
})(typeof window !== "undefined" ? window : globalThis);
