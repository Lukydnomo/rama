/* =====================================================================
   R.A.M.A. — Ordem Paranormal · catálogo de itens (dados)
   =====================================================================
   Os itens oficiais dos dois livros, como DADOS — sem tela e sem
   regra. Quem lê, normaliza, busca e transforma em item de ficha é
   js/ordem/itens.js.

   Este arquivo NÃO vem com a ficha: ele é carregado na primeira vez que
   alguém abre "Da biblioteca" no inventário de uma ficha de Ordem, e
   nunca vai junto na gravação da ficha. O item que entra na ficha é uma
   CÓPIA; mudar uma entrada daqui não muda item nenhum já adicionado.

   ---------------------------------------------------------------------
   FONTES
   ---------------------------------------------------------------------

     OPRPG  Ordem Paranormal RPG — Livro de Regras, v1.1 (Jambô, 2022)
            Capítulo 3 (p. 50–67) e Itens Amaldiçoados (p. 144–151)
     SAH    Sobrevivendo ao Horror, v1.2 (Jambô, 2024)
            Equipamentos (p. 37–45) e Novos Itens Amaldiçoados (p. 57–61)

   As páginas são as do livro, não as do PDF. Os resumos são redação
   própria: guardam os números e as condições que o jogo precisa, e não
   reproduzem o texto dos livros.

   ---------------------------------------------------------------------
   FORMATO DE UMA ENTRADA
   ---------------------------------------------------------------------

     id          estável: <fonte>.<natureza/grupo>.<nome>. Nunca muda,
                 mesmo que o nome mude
     natureza    "item" (vai para o inventário), "modificacao" ou
                 "maldicao" (aplicam-se a um item que já está lá)
     aba, secao  onde a entrada aparece no seletor
     categoria   a categoria de EQUIPAMENTO do livro: "0", "I", "II",
                 "III", "IV" — ou null quando o livro não informa
     espacos     por unidade; null quando o livro não informa
     arma, protecao, municao   os dados de cada tipo
     efeitos     o que a regra faz, em frases curtas
     notas       divergências entre tabela e texto, ou entre os livros
     escolha     o que a pessoa decide ao adicionar ("de (elemento)")

   Categoria de NAVEGAÇÃO (a aba) e categoria de EQUIPAMENTO (0 a IV)
   são coisas diferentes e moram em campos diferentes.
   ===================================================================== */

(function (global) {
  "use strict";

  var OP = "OPRPG";
  var SAH = "SAH";

  var T33 = "Tabela 3.3 (p. 56–57)";
  var T14 = "Tabela 1.4 (p. 38)";

  var ITENS = [

    /* =================================================================
       ARMAS — OPRPG p. 54–59 · SAH p. 37–38
       tipo: corpoACorpo | arremesso | disparo | fogo | distancia
       ================================================================= */

    /* --- Armas simples · OPRPG --- */
    { id: "op.arma.faca", nome: "Faca", fonte: OP, pagina: 58, tabela: T33, aba: "armas",
      categoria: "0", espacos: 1,
      arma: { proficiencia: "simples", tipo: "corpoACorpo", empunhadura: "leve", dano: "1d4", critico: "19", alcance: "curto", tipoDano: "C", agil: true, arremessavel: true },
      resumo: "Lâmina longa e afiada: navalha, faca de churrasco ou faca militar.",
      efeitos: ["Pode ser arremessada.", "Faca de cozinha pequena causa só 1d3."] },

    { id: "op.arma.martelo", nome: "Martelo", fonte: OP, pagina: 59, tabela: T33, aba: "armas",
      categoria: "0", espacos: 1,
      arma: { proficiencia: "simples", tipo: "corpoACorpo", empunhadura: "leve", dano: "1d6", critico: "x2", alcance: "", tipoDano: "I" },
      resumo: "Ferramenta comum, usada como arma na falta de coisa melhor." },

    { id: "op.arma.punhal", nome: "Punhal", fonte: OP, pagina: 59, tabela: T33, aba: "armas",
      categoria: "0", espacos: 1,
      arma: { proficiencia: "simples", tipo: "corpoACorpo", empunhadura: "leve", dano: "1d4", critico: "x3", alcance: "", tipoDano: "P", agil: true },
      resumo: "Faca de lâmina longa e pontiaguda, comum nos rituais de cultistas." },

    { id: "op.arma.bastao", nome: "Bastão", fonte: OP, pagina: 58, tabela: T33, aba: "armas",
      categoria: "0", espacos: 1,
      arma: { proficiencia: "simples", tipo: "corpoACorpo", empunhadura: "umaMao", dano: "1d6", danoAlternativo: { dano: "1d8", rotulo: "duas mãos" }, critico: "x2", alcance: "", tipoDano: "I" },
      resumo: "Cilindro de madeira maciça: taco de beisebol, cassetete, tonfa ou clava com pregos.",
      efeitos: ["Com uma mão, 1d6; com as duas, 1d8."],
      notas: ["A tabela traz o dano como 1d6/1d8: uma mão / duas mãos."] },

    { id: "op.arma.machete", nome: "Machete", fonte: OP, pagina: 58, tabela: T33, aba: "armas",
      categoria: "0", espacos: 1,
      arma: { proficiencia: "simples", tipo: "corpoACorpo", empunhadura: "umaMao", dano: "1d6", critico: "19", alcance: "", tipoDano: "C" },
      resumo: "Lâmina longa, muito usada para abrir trilhas." },

    { id: "op.arma.lanca", nome: "Lança", fonte: OP, pagina: 58, tabela: T33, aba: "armas",
      categoria: "0", espacos: 1,
      arma: { proficiencia: "simples", tipo: "corpoACorpo", empunhadura: "umaMao", dano: "1d6", critico: "x2", alcance: "curto", tipoDano: "P", arremessavel: true },
      resumo: "Haste de madeira com ponta metálica; arcaica, mas ainda usada em artes marciais.",
      efeitos: ["Pode ser arremessada."] },

    { id: "op.arma.cajado", nome: "Cajado", fonte: OP, pagina: 58, tabela: T33, aba: "armas",
      categoria: "0", espacos: 2,
      arma: { proficiencia: "simples", tipo: "corpoACorpo", empunhadura: "duasMaos", dano: "1d6", critico: "x2", alcance: "", tipoDano: "I", agil: true },
      resumo: "Cabo longo de madeira ou barra de ferro, como o bo das artes marciais.",
      efeitos: ["Com Combater com Duas Armas (e poderes parecidos), faz ataques adicionais como se fosse uma arma de uma mão e uma arma leve."],
      notas: ["A tabela traz o dano como 1d6/1d6: o mesmo dano para cada ponta."] },

    { id: "op.arma.arco", nome: "Arco", fonte: OP, pagina: 58, tabela: T33, aba: "armas",
      categoria: "0", espacos: 2,
      arma: { proficiencia: "simples", tipo: "disparo", empunhadura: "duasMaos", dano: "1d6", critico: "x3", alcance: "medio", tipoDano: "P", municao: "op.municao.flechas" },
      resumo: "Arco e flecha comum, próprio para tiro ao alvo." },

    { id: "op.arma.besta", nome: "Besta", fonte: OP, pagina: 58, tabela: T33, aba: "armas",
      categoria: "0", espacos: 2,
      arma: { proficiencia: "simples", tipo: "disparo", empunhadura: "duasMaos", dano: "1d8", critico: "19", alcance: "medio", tipoDano: "P", municao: "op.municao.flechas" },
      resumo: "Arma da antiguidade que dispara virotes.",
      efeitos: ["Recarregar exige uma ação de movimento a cada disparo."] },

    { id: "op.arma.pistola", nome: "Pistola", fonte: OP, pagina: 59, tabela: T33, aba: "armas",
      categoria: "I", espacos: 1,
      arma: { proficiencia: "simples", tipo: "fogo", empunhadura: "leve", dano: "1d12", critico: "18", alcance: "curto", tipoDano: "B", municao: "op.municao.balas-curtas", capacidade: 12 },
      resumo: "Arma de mão comum entre policiais e militares, fácil de recarregar." },

    { id: "op.arma.revolver", nome: "Revólver", fonte: OP, pagina: 59, tabela: T33, aba: "armas",
      categoria: "I", espacos: 1,
      arma: { proficiencia: "simples", tipo: "fogo", empunhadura: "leve", dano: "2d6", critico: "19/x3", alcance: "curto", tipoDano: "B", municao: "op.municao.balas-curtas", capacidade: 6 },
      resumo: "A arma de fogo mais comum, e uma das mais confiáveis." },

    { id: "op.arma.fuzil-de-caca", nome: "Fuzil de caça", fonte: OP, pagina: 58, tabela: T33, aba: "armas",
      categoria: "I", espacos: 2,
      arma: { proficiencia: "simples", tipo: "fogo", empunhadura: "duasMaos", dano: "2d8", critico: "19/x3", alcance: "medio", tipoDano: "B", municao: "op.municao.balas-longas", capacidade: 4 },
      resumo: "Arma de fogo popular entre fazendeiros, caçadores e atiradores esportivos." },

    /* --- Armas táticas · OPRPG --- */
    { id: "op.arma.machadinha", nome: "Machadinha", fonte: OP, pagina: 58, tabela: T33, aba: "armas",
      categoria: "0", espacos: 1,
      arma: { proficiencia: "tatica", tipo: "corpoACorpo", empunhadura: "leve", dano: "1d6", critico: "x3", alcance: "curto", tipoDano: "C", arremessavel: true },
      resumo: "Ferramenta de cortar madeira, fácil de achar em obras e fazendas.",
      efeitos: ["Pode ser arremessada."] },

    { id: "op.arma.nunchaku", nome: "Nunchaku", fonte: OP, pagina: 59, tabela: T33, aba: "armas",
      categoria: "0", espacos: 1,
      arma: { proficiencia: "tatica", tipo: "corpoACorpo", empunhadura: "leve", dano: "1d8", critico: "x2", alcance: "", tipoDano: "I", agil: true },
      resumo: "Dois bastões curtos de madeira ligados por uma corrente." },

    { id: "op.arma.corrente", nome: "Corrente", fonte: OP, pagina: 58, tabela: T33, aba: "armas",
      categoria: "0", espacos: 1,
      arma: { proficiencia: "tatica", tipo: "corpoACorpo", empunhadura: "umaMao", dano: "1d8", critico: "x2", alcance: "", tipoDano: "I" },
      resumo: "Um pedaço de corrente grossa, surpreendentemente eficaz como arma.",
      efeitos: ["+2 em testes para desarmar e para derrubar."] },

    { id: "op.arma.espada", nome: "Espada", fonte: OP, pagina: 58, tabela: T33, aba: "armas",
      categoria: "I", espacos: 1,
      arma: { proficiencia: "tatica", tipo: "corpoACorpo", empunhadura: "umaMao", dano: "1d8", danoAlternativo: { dano: "1d10", rotulo: "duas mãos" }, critico: "19", alcance: "", tipoDano: "C" },
      resumo: "Arma medieval, da espada longa dos cavaleiros à cimitarra.",
      efeitos: ["Com uma mão, 1d8; com as duas, 1d10."],
      notas: ["A tabela traz o dano como 1d8/1d10: uma mão / duas mãos."] },

    { id: "op.arma.florete", nome: "Florete", fonte: OP, pagina: 58, tabela: T33, aba: "armas",
      categoria: "I", espacos: 1,
      arma: { proficiencia: "tatica", tipo: "corpoACorpo", empunhadura: "umaMao", dano: "1d6", critico: "18", alcance: "", tipoDano: "C", agil: true },
      resumo: "Espada de lâmina fina e comprida, usada na esgrima." },

    { id: "op.arma.machado", nome: "Machado", fonte: OP, pagina: 58, tabela: T33, aba: "armas",
      categoria: "I", espacos: 1,
      arma: { proficiencia: "tatica", tipo: "corpoACorpo", empunhadura: "umaMao", dano: "1d8", critico: "x3", alcance: "", tipoDano: "C" },
      resumo: "Ferramenta de lenhadores e bombeiros, capaz de ferimentos terríveis." },

    { id: "op.arma.maca", nome: "Maça", fonte: OP, pagina: 58, tabela: T33, aba: "armas",
      categoria: "I", espacos: 1,
      arma: { proficiencia: "tatica", tipo: "corpoACorpo", empunhadura: "umaMao", dano: "2d4", critico: "x2", alcance: "", tipoDano: "I" },
      resumo: "Bastão com uma cabeça metálica cheia de protuberâncias." },

    { id: "op.arma.acha", nome: "Acha", fonte: OP, pagina: 58, tabela: T33, aba: "armas",
      categoria: "I", espacos: 2,
      arma: { proficiencia: "tatica", tipo: "corpoACorpo", empunhadura: "duasMaos", dano: "1d12", critico: "x3", alcance: "", tipoDano: "C" },
      resumo: "Machado grande e pesado, feito para derrubar árvores largas." },

    { id: "op.arma.gadanho", nome: "Gadanho", fonte: OP, pagina: 58, tabela: T33, aba: "armas",
      categoria: "I", espacos: 2,
      arma: { proficiencia: "tatica", tipo: "corpoACorpo", empunhadura: "duasMaos", dano: "2d4", critico: "x4", alcance: "", tipoDano: "C" },
      resumo: "Foice grande, de duas mãos, criada para ceifar cereais." },

    { id: "op.arma.katana", nome: "Katana", fonte: OP, pagina: 58, tabela: T33, aba: "armas",
      categoria: "I", espacos: 2,
      arma: { proficiencia: "tatica", tipo: "corpoACorpo", empunhadura: "duasMaos", dano: "1d10", critico: "19", alcance: "", tipoDano: "C", agil: true },
      resumo: "Espada longa e levemente curva, de origem japonesa.",
      efeitos: ["Veterano em Luta pode usá-la como arma de uma mão."] },

    { id: "op.arma.marreta", nome: "Marreta", fonte: OP, pagina: 58, tabela: T33, aba: "armas",
      categoria: "I", espacos: 2,
      arma: { proficiencia: "tatica", tipo: "corpoACorpo", empunhadura: "duasMaos", dano: "3d4", critico: "x2", alcance: "", tipoDano: "I" },
      resumo: "Feita para demolir paredes; serve também para demolir pessoas.",
      notas: ["O livro básico (p. 59) manda usar estas estatísticas para outras ferramentas de construção, como picaretas. O Sobrevivendo ao Horror dá à picareta estatísticas próprias (ver Picareta)."] },

    { id: "op.arma.montante", nome: "Montante", fonte: OP, pagina: 59, tabela: T33, aba: "armas",
      categoria: "I", espacos: 2,
      arma: { proficiencia: "tatica", tipo: "corpoACorpo", empunhadura: "duasMaos", dano: "2d6", critico: "19", alcance: "", tipoDano: "C" },
      resumo: "Espada enorme, de 1,5 m, das armas mais poderosas de sua época." },

    { id: "op.arma.motosserra", nome: "Motosserra", alias: ["Motoserra"], fonte: OP, pagina: 59, tabela: T33, aba: "armas",
      categoria: "I", espacos: 2,
      arma: { proficiencia: "tatica", tipo: "corpoACorpo", empunhadura: "duasMaos", dano: "3d6", critico: "x2", alcance: "", tipoDano: "C", dadosAtaque: -1 },
      resumo: "Ferramenta de ferimentos profundos, potente e desajeitada.",
      efeitos: ["Cada 6 num dado de dano rola mais um dado de dano.", "Desajeitada: −1 dado nos testes de ataque.", "Ligar gasta uma ação de movimento."],
      notas: ["A tabela e a descrição escrevem “Motoserra”."] },

    { id: "op.arma.arco-composto", nome: "Arco composto", fonte: OP, pagina: 58, tabela: T33, aba: "armas",
      categoria: "I", espacos: 2,
      arma: { proficiencia: "tatica", tipo: "disparo", empunhadura: "duasMaos", dano: "1d10", critico: "x3", alcance: "medio", tipoDano: "P", municao: "op.municao.flechas", atributoDano: "for" },
      resumo: "Arco moderno de roldanas e materiais de alta tensão.",
      efeitos: ["Ao contrário das outras armas de disparo, soma sua Força ao dano."] },

    { id: "op.arma.balestra", nome: "Balestra", fonte: OP, pagina: 58, tabela: T33, aba: "armas",
      categoria: "I", espacos: 2,
      arma: { proficiencia: "tatica", tipo: "disparo", empunhadura: "duasMaos", dano: "1d12", critico: "19", alcance: "medio", tipoDano: "P", municao: "op.municao.flechas" },
      resumo: "Besta pesada, de disparos poderosos.",
      efeitos: ["Recarregar exige uma ação de movimento a cada disparo."] },

    { id: "op.arma.submetralhadora", nome: "Submetralhadora", fonte: OP, pagina: 59, tabela: T33, aba: "armas",
      categoria: "I", espacos: 1,
      arma: { proficiencia: "tatica", tipo: "fogo", empunhadura: "umaMao", dano: "2d6", critico: "19/x3", alcance: "curto", tipoDano: "B", municao: "op.municao.balas-curtas", automatica: true, capacidade: 20 },
      resumo: "Arma de fogo automática que pode ser empunhada com uma só mão." },

    { id: "op.arma.espingarda", nome: "Espingarda", fonte: OP, pagina: 58, tabela: T33, aba: "armas",
      categoria: "I", espacos: 2,
      arma: { proficiencia: "tatica", tipo: "fogo", empunhadura: "duasMaos", dano: "4d6", critico: "x3", alcance: "curto", tipoDano: "B", municao: "op.municao.cartuchos", capacidade: 6 },
      resumo: "Arma de fogo longa, de cano liso.",
      efeitos: ["Em alcance médio ou maior, causa só metade do dano."] },

    { id: "op.arma.fuzil-de-assalto", nome: "Fuzil de assalto", fonte: OP, pagina: 58, tabela: T33, aba: "armas",
      categoria: "II", espacos: 2,
      arma: { proficiencia: "tatica", tipo: "fogo", empunhadura: "duasMaos", dano: "2d10", critico: "19/x3", alcance: "medio", tipoDano: "B", municao: "op.municao.balas-longas", automatica: true, capacidade: 30 },
      resumo: "A arma de fogo padrão da maioria dos exércitos modernos.",
      notas: ["Na contagem de munição opcional (OPRPG p. 174), encher os 30 tiros exige mais de um pacote."] },

    { id: "op.arma.fuzil-de-precisao", nome: "Fuzil de precisão", fonte: OP, pagina: 58, tabela: T33, aba: "armas",
      categoria: "III", espacos: 2,
      arma: { proficiencia: "tatica", tipo: "fogo", empunhadura: "duasMaos", dano: "2d10", critico: "19/x3", alcance: "longo", tipoDano: "B", municao: "op.municao.balas-longas", capacidade: 1 },
      resumo: "Arma de uso militar para disparos longos e precisos.",
      efeitos: ["Veterano em Pontaria que mira com ele (p. 87) recebe +5 na margem de ameaça do ataque."] },

    /* --- Armas pesadas · OPRPG --- */
    { id: "op.arma.bazuca", nome: "Bazuca", fonte: OP, pagina: 58, tabela: T33, aba: "armas",
      categoria: "III", espacos: 2,
      arma: { proficiencia: "pesada", tipo: "distancia", empunhadura: "duasMaos", dano: "10d8", critico: "x2", alcance: "medio", tipoDano: "I", municao: "op.municao.foguete" },
      resumo: "Lança-foguetes antitanque, eficaz também contra criaturas.",
      efeitos: [
        "Atinge o alvo e todos os seres num raio de 3 m; os outros seres (não o alvo) fazem Reflexos (DT Agi) para sofrer metade.",
        "Pode mirar um ponto em alcance médio: sem teste de ataque e sem chance de errar, mas sem acertar ninguém diretamente.",
        "Recarregar exige uma ação de movimento a cada disparo.",
      ] },

    { id: "op.arma.lanca-chamas", nome: "Lança-chamas", fonte: OP, pagina: 58, tabela: T33, aba: "armas",
      categoria: "III", espacos: 2,
      arma: { proficiencia: "pesada", tipo: "distancia", empunhadura: "duasMaos", dano: "6d6", critico: "x2", alcance: "curto", tipoDano: "Fogo", municao: "op.municao.combustivel" },
      resumo: "Equipamento militar que esguicha líquido inflamável incandescente.",
      efeitos: [
        "Atinge todos os seres numa linha de 1,5 m de largura até alcance curto, e não vai além.",
        "Um só teste de ataque, comparado com a Defesa de cada ser na área.",
        "Quem é atingido também fica em chamas.",
      ] },

    { id: "op.arma.metralhadora", nome: "Metralhadora", fonte: OP, pagina: 59, tabela: T33, aba: "armas",
      categoria: "II", espacos: 2,
      arma: { proficiencia: "pesada", tipo: "fogo", empunhadura: "duasMaos", dano: "2d12", critico: "19/x3", alcance: "medio", tipoDano: "B", municao: "op.municao.balas-longas", automatica: true, capacidade: 50 },
      resumo: "Arma de fogo pesada, de uso militar.",
      efeitos: ["Sem Força 4 ou maior, é preciso uma ação de movimento para apoiá-la no tripé; senão, −5 nos ataques."],
      notas: ["Na contagem de munição opcional (OPRPG p. 174), encher os 50 tiros exige mais de um pacote."] },

    /* --- Armas · SAH --- */
    { id: "sah.arma.pregador-pneumatico", nome: "Pregador pneumático", fonte: SAH, pagina: 37, tabela: T14, aba: "armas",
      categoria: "0", espacos: 1,
      arma: { proficiencia: "simples", tipo: "disparo", empunhadura: "umaMao", dano: "1d4", critico: "x4", alcance: "curto", tipoDano: "P" },
      resumo: "Ferramenta parecida com uma pistola que dispara pregos sob pressão.",
      efeitos: ["Conta como arma de fogo para os seus poderes que afetam armas de fogo.", "Guarda 300 pregos em rolo, o bastante para uma missão inteira."] },

    { id: "sah.arma.estilingue", nome: "Estilingue", fonte: SAH, pagina: 37, tabela: T14, aba: "armas",
      categoria: "0", espacos: 1,
      arma: { proficiencia: "simples", tipo: "disparo", empunhadura: "duasMaos", dano: "1d4", critico: "x2", alcance: "curto", tipoDano: "I", municao: "sah.municao.bolinhas", atributoDano: "for" },
      resumo: "Arma de caça simples, de formatos e materiais variados.",
      efeitos: ["Ao contrário das outras armas de disparo, soma sua Força ao dano.", "Sem bolinhas, pedrinhas servem de munição.", "Pode lançar granadas até alcance longo."] },

    { id: "sah.arma.revolver-compacto", nome: "Revólver compacto", fonte: SAH, pagina: 37, tabela: T14, aba: "armas",
      categoria: "I", espacos: 1,
      arma: { proficiencia: "simples", tipo: "fogo", empunhadura: "leve", dano: "2d4", critico: "19/x3", alcance: "curto", tipoDano: "P", municao: "op.municao.balas-curtas", capacidade: 5, semEspacoSeTreinado: "crime" },
      resumo: "Revólver de baixo calibre, feito para ser escondido no corpo.",
      efeitos: ["Treinado em Crime carrega um revólver compacto sem que ele ocupe espaço."],
      notas: ["A Tabela 1.4 dá dano de perfuração (P)."] },

    { id: "sah.arma.baioneta", nome: "Baioneta", fonte: SAH, pagina: 37, tabela: T14, aba: "armas",
      categoria: "0", espacos: 1,
      arma: { proficiencia: "tatica", tipo: "corpoACorpo", empunhadura: "leve", dano: "1d4", danoAlternativo: { dano: "1d6", rotulo: "fixada" }, critico: "19", alcance: "", tipoDano: "P" },
      resumo: "Lâmina feita para ser presa a um fuzil ou arma parecida.",
      efeitos: [
        "Ação de movimento para fixá-la numa arma de fogo de duas mãos: vira uma arma de duas mãos ágil, com dano 1d6.",
        "Fixada, a arma de fogo ainda ataca, mas com −1 dado nos ataques à distância.",
      ] },

    { id: "sah.arma.faca-tatica", nome: "Faca tática", fonte: SAH, pagina: 37, tabela: T14, aba: "armas",
      categoria: "I", espacos: 1,
      arma: { proficiencia: "tatica", tipo: "corpoACorpo", empunhadura: "leve", dano: "1d6", critico: "19", alcance: "curto", tipoDano: "C", agil: true, arremessavel: true },
      resumo: "Faca balanceada para contra-ataques e bloqueios rápidos.",
      efeitos: [
        "No contra-ataque, +2 no teste de ataque.",
        "No bloqueio, 2 PE e sacrificar a faca somam +20 à RD do bloqueio.",
        "Pode ser arremessada.",
      ] },

    { id: "sah.arma.gancho-de-carne", nome: "Gancho de carne", fonte: SAH, pagina: 37, tabela: T14, aba: "armas",
      categoria: "0", espacos: 1,
      arma: { proficiencia: "tatica", tipo: "corpoACorpo", empunhadura: "leve", dano: "1d4", critico: "x4", alcance: "", tipoDano: "P" },
      resumo: "Gancho metálico de frigorífico, usado como arma.",
      efeitos: ["Amarrado a uma corda ou corrente, alcança 4,5 m e passa a ocupar 2 espaços."] },

    { id: "sah.arma.bastao-policial", nome: "Bastão policial", fonte: SAH, pagina: 37, tabela: T14, aba: "armas",
      categoria: "I", espacos: 1,
      arma: { proficiencia: "tatica", tipo: "corpoACorpo", empunhadura: "umaMao", dano: "1d6", critico: "x2", alcance: "curto", tipoDano: "I", agil: true },
      resumo: "Bastão com guarda lateral, a arma branca padrão das polícias.",
      efeitos: ["Na ação especial esquiva, o bônus na Defesa aumenta em +1."] },

    { id: "sah.arma.picareta", nome: "Picareta", fonte: SAH, pagina: 37, tabela: T14, aba: "armas",
      categoria: "0", espacos: 1,
      arma: { proficiencia: "tatica", tipo: "corpoACorpo", empunhadura: "umaMao", dano: "1d6", critico: "x4", alcance: "", tipoDano: "P" },
      resumo: "Ferramenta de mineração e demolição, usada em combate na falta de armas.",
      notas: ["O livro básico (p. 59) mandava usar a marreta para picaretas. O Sobrevivendo ao Horror dá estatísticas próprias, e o catálogo usa as do SAH, sem misturar as duas."] },

    { id: "sah.arma.shuriken", nome: "Shuriken", fonte: SAH, pagina: 37, tabela: T14, aba: "armas",
      categoria: "I", espacos: 0.5,
      arma: { proficiencia: "tatica", tipo: "arremesso", empunhadura: null, dano: "1d4", critico: "x2", alcance: "curto", tipoDano: "P" },
      resumo: "Pequenos projéteis de metal em forma de estrela ou dardo.",
      efeitos: [
        "Veterano em Pontaria: uma vez por rodada, 1 PE para um ataque adicional de shuriken contra o mesmo alvo.",
        "Uma shuriken é um “pacote” que dura duas cenas (ou 10 shurikens na contagem de munição opcional).",
      ],
      notas: ["A Tabela 1.4 não informa a empunhadura."] },

    { id: "sah.arma.pistola-pesada", nome: "Pistola pesada", fonte: SAH, pagina: 37, tabela: T14, aba: "armas",
      categoria: "I", espacos: 1,
      arma: { proficiencia: "tatica", tipo: "fogo", empunhadura: "umaMao", dano: "2d8", critico: "18", alcance: "curto", tipoDano: "B", municao: "op.municao.balas-curtas", capacidade: 10 },
      resumo: "Versão de calibre maior da pistola tradicional.",
      efeitos: ["Potência e coice impõem −1 dado nos testes de ataque; empunhá-la com as duas mãos anula a penalidade."] },

    { id: "sah.arma.espingarda-de-cano-duplo", nome: "Espingarda de cano duplo", fonte: SAH, pagina: 37, tabela: T14, aba: "armas",
      categoria: "II", espacos: 2,
      arma: { proficiencia: "tatica", tipo: "fogo", empunhadura: "duasMaos", dano: "4d6", danoAlternativo: { dano: "6d6", rotulo: "dois canos" }, critico: "x3", alcance: "curto", tipoDano: "B", municao: "op.municao.cartuchos", capacidade: 2 },
      resumo: "Espingarda de caça com dois canos, um cartucho em cada.",
      efeitos: [
        "Depois de disparar os dois cartuchos, recarregar exige uma ação de movimento.",
        "Pode disparar os dois canos no mesmo alvo: −1 dado no ataque e dano 6d6.",
      ] },

    /* =================================================================
       MODIFICAÇÕES PARA ARMAS — OPRPG p. 60–61 · SAH p. 38
       Não são objetos: aplicam-se a uma arma do inventário. Cada uma
       aumenta a categoria do item em I; iguais não se acumulam.
       aplicaEm: corpoACorpo, disparo, fogo, automatica, besta
       ================================================================= */

    { id: "op.mod.arma.certeira", nome: "Certeira", natureza: "modificacao", fonte: OP, pagina: 60, tabela: "Tabela 3.5 (p. 61)", aba: "armas",
      aplicaEm: ["corpoACorpo", "disparo"],
      resumo: "Fabricada para ser mais precisa e balanceada.",
      efeitos: ["+2 nos testes de ataque."],
      calculo: { ataque: 2 } },

    { id: "op.mod.arma.cruel", nome: "Cruel", natureza: "modificacao", fonte: OP, pagina: 60, tabela: "Tabela 3.5 (p. 61)", aba: "armas",
      aplicaEm: ["corpoACorpo", "disparo"],
      resumo: "Lâmina especialmente afiada ou material mais denso.",
      efeitos: ["+2 nas rolagens de dano."],
      calculo: { dano: 2 } },

    { id: "op.mod.arma.perigosa", nome: "Perigosa", natureza: "modificacao", fonte: OP, pagina: 60, tabela: "Tabela 3.5 (p. 61)", aba: "armas",
      aplicaEm: ["corpoACorpo", "disparo"],
      resumo: "Lâmina de navalha ou material maciço, de impacto terrível.",
      efeitos: ["+2 na margem de ameaça."],
      calculo: { margem: 2 } },

    { id: "op.mod.arma.discreta", nome: "Discreta", natureza: "modificacao", fonte: OP, pagina: 60, tabela: "Tabela 3.5 (p. 61)", aba: "armas",
      aplicaEm: ["corpoACorpo", "disparo", "fogo"],
      resumo: "Desmontável, retrátil ou dobrável: ocupa menos e chama menos atenção.",
      efeitos: ["−1 espaço.", "+5 em testes de Crime para ocultá-la, que pode ser feito mesmo sem treino."],
      calculo: { espacos: -1 },
      notas: ["A Tabela 3.5 dá, para armas corpo a corpo e de disparo, +10 em testes de ocultar (sem mencionar espaço); para armas de fogo, +5 e −1 espaço. O texto (p. 60), que descreve a modificação para qualquer arma, dá +5 e −1 espaço — e é o que o catálogo segue."] },

    { id: "op.mod.arma.tatica", nome: "Tática", natureza: "modificacao", fonte: OP, pagina: 60, tabela: "Tabela 3.5 (p. 61)", aba: "armas",
      aplicaEm: ["corpoACorpo", "disparo", "fogo"],
      resumo: "Cabo texturizado, bandoleira e acessórios que facilitam o manuseio.",
      efeitos: ["Sacar a arma é uma ação livre."],
      notas: ["Aparece nas duas listas da Tabela 3.5, com o mesmo efeito."] },

    { id: "op.mod.arma.alongada", nome: "Alongada", natureza: "modificacao", fonte: OP, pagina: 60, tabela: "Tabela 3.5 (p. 61)", aba: "armas",
      aplicaEm: ["fogo"],
      resumo: "Cano mais longo, que aumenta a precisão dos disparos.",
      efeitos: ["+2 nos testes de ataque."],
      calculo: { ataque: 2 } },

    { id: "op.mod.arma.calibre-grosso", nome: "Calibre grosso", natureza: "modificacao", fonte: OP, pagina: 60, tabela: "Tabela 3.5 (p. 61)", aba: "armas",
      aplicaEm: ["fogo"],
      resumo: "Dispara munição de calibre maior.",
      efeitos: [
        "+1 dado de dano do mesmo tipo (um revólver passa a 3d6; um fuzil de precisão, a 3d10).",
        "Precisa de munição de calibre grosso: mesma categoria da munição normal, e não serve em armas comuns.",
      ],
      calculo: { dadosDano: 1 } },

    { id: "op.mod.arma.compensador", nome: "Compensador", natureza: "modificacao", fonte: OP, pagina: 60, tabela: "Tabela 3.5 (p. 61)", aba: "armas",
      aplicaEm: ["automatica"],
      resumo: "Amortecedor que reduz o coice da arma.",
      efeitos: ["Anula a penalidade nos testes de ataque das rajadas. Só para armas automáticas."] },

    { id: "op.mod.arma.ferrolho-automatico", nome: "Ferrolho automático", natureza: "modificacao", fonte: OP, pagina: 60, tabela: "Tabela 3.5 (p. 61)", aba: "armas",
      aplicaEm: ["fogo"], exigeNaoAutomatica: true,
      resumo: "Mecanismo de ação modificado para disparar várias vezes em sequência.",
      efeitos: ["A arma se torna automática (rajadas, p. 59)."],
      calculo: { automatica: true } },

    { id: "op.mod.arma.mira-laser", nome: "Mira laser", natureza: "modificacao", fonte: OP, pagina: 60, tabela: "Tabela 3.5 (p. 61)", aba: "armas",
      aplicaEm: ["fogo"],
      resumo: "Laser interno que projeta um retículo luminoso para o atirador.",
      efeitos: ["+2 na margem de ameaça."],
      calculo: { margem: 2 } },

    { id: "op.mod.arma.mira-telescopica", nome: "Mira telescópica", natureza: "modificacao", fonte: OP, pagina: 60, tabela: "Tabela 3.5 (p. 61)", aba: "armas",
      aplicaEm: ["fogo"],
      resumo: "Luneta com marcações, para disparos precisos de longa distância.",
      efeitos: ["Aumenta o alcance da arma em uma categoria (curto → médio → longo → extremo).", "Permite usar Ataque Furtivo em qualquer alcance."],
      calculo: { alcance: 1 } },

    { id: "op.mod.arma.silenciador", nome: "Silenciador", natureza: "modificacao", fonte: OP, pagina: 60, tabela: "Tabela 3.5 (p. 61)", aba: "armas",
      aplicaEm: ["fogo"],
      resumo: "Abafa o estampido dos disparos.",
      efeitos: ["Reduz em 10 a penalidade em Furtividade para se esconder no turno em que atacou com a arma."] },

    { id: "op.mod.arma.visao-de-calor", nome: "Visão de calor", natureza: "modificacao", fonte: OP, pagina: 60, tabela: "Tabela 3.5 (p. 61)", aba: "armas",
      aplicaEm: ["fogo"],
      resumo: "Mira eletrônica que sobrepõe imagem visível e infravermelha.",
      efeitos: ["Ao disparar com a arma, ignora qualquer camuflagem do alvo."] },

    { id: "sah.mod.arma.carregador-rapido", nome: "Carregador rápido", natureza: "modificacao", fonte: SAH, pagina: 38, aba: "armas",
      aplicaEm: ["fogo", "besta"],
      resumo: "Só com a regra opcional de contagem de munição (OPRPG p. 174).",
      efeitos: [
        "Arma de fogo: recarregar é uma ação livre, uma vez por rodada.",
        "Besta ou balestra: até cinco recargas como ação livre, com uma mão; depois, recarregar o carregador virote por virote (ação de movimento cada).",
      ] },

    /* =================================================================
       MUNIÇÕES — OPRPG p. 59 · SAH p. 37
       A unidade é o PACOTE, que dura cenas — não um número de balas.
       ================================================================= */

    { id: "op.municao.balas-curtas", nome: "Balas curtas", fonte: OP, pagina: 59, tabela: "Tabela 3.4 (p. 59)", aba: "municoes",
      categoria: "0", espacos: 1,
      municao: { unidade: "pacote", duracao: "2 cenas", armas: "pistolas, revólveres e submetralhadoras", contagem: 20 },
      resumo: "Munição básica das armas de fogo de mão." },

    { id: "op.municao.balas-longas", nome: "Balas longas", fonte: OP, pagina: 59, tabela: "Tabela 3.4 (p. 59)", aba: "municoes",
      categoria: "I", espacos: 1,
      municao: { unidade: "pacote", duracao: "1 cena", armas: "fuzis e metralhadoras", contagem: 20 },
      resumo: "Munição maior e mais potente." },

    { id: "op.municao.cartuchos", nome: "Cartuchos", fonte: OP, pagina: 59, tabela: "Tabela 3.4 (p. 59)", aba: "municoes",
      categoria: "I", espacos: 1,
      municao: { unidade: "pacote", duracao: "1 cena", armas: "espingardas", contagem: 20 },
      resumo: "Cartuchos carregados com esferas de chumbo." },

    { id: "op.municao.combustivel", nome: "Combustível", fonte: OP, pagina: 59, tabela: "Tabela 3.4 (p. 59)", aba: "municoes",
      categoria: "I", espacos: 1,
      municao: { unidade: "tanque", duracao: "1 cena", armas: "lança-chamas", contagem: 20 },
      resumo: "Tanque de combustível para lança-chamas." },

    { id: "op.municao.flechas", nome: "Flechas", fonte: OP, pagina: 59, tabela: "Tabela 3.4 (p. 59)", aba: "municoes",
      categoria: "0", espacos: 1,
      municao: { unidade: "pacote", duracao: "1 missão", armas: "arcos e bestas", contagem: 20 },
      resumo: "Flechas reaproveitáveis depois de cada combate." },

    { id: "op.municao.foguete", nome: "Foguete", fonte: OP, pagina: 59, tabela: "Tabela 3.4 (p. 59)", aba: "municoes",
      categoria: "I", espacos: 1,
      municao: { unidade: "foguete", duracao: "1 disparo", armas: "bazucas", contagem: 1 },
      resumo: "Munição de bazuca: cada foguete serve para um único disparo, não para uma cena.",
      efeitos: ["Para vários ataques, é preciso carregar vários foguetes."] },

    { id: "sah.municao.bolinhas", nome: "Bolinhas de estilingue", alias: ["Pedrinhas"], fonte: SAH, pagina: 37, aba: "municoes",
      categoria: "0", espacos: 1,
      municao: { unidade: "pacote", duracao: "1 missão", armas: "estilingues" },
      resumo: "Bolinhas reaproveitáveis para estilingue.",
      notas: ["O SAH diz que o pacote ocupa o mesmo espaço do estilingue: 1."] },

    { id: "op.municao.dardos", nome: "Dardos para pistola de dardos", fonte: OP, pagina: 66, aba: "municoes",
      categoria: "0", espacos: 1,
      municao: { unidade: "caixa", conteudo: "2 dardos", armas: "pistola de dardos" },
      resumo: "Caixa adicional com 2 dardos soníferos." },

    { id: "op.municao.cargas-sinalizadora", nome: "Cargas para pistola sinalizadora", fonte: OP, pagina: 66, aba: "municoes",
      categoria: "0", espacos: 1,
      municao: { unidade: "caixa", conteudo: "2 cargas", armas: "pistola sinalizadora" },
      resumo: "Caixa adicional com 2 cargas de sinalizador." },

    /* --- Modificações para munições · OPRPG p. 60 --- */
    { id: "op.mod.municao.dum-dum", nome: "Dum dum", natureza: "modificacao", fonte: OP, pagina: 60, tabela: "Tabela 3.5 (p. 61)", aba: "municoes",
      aplicaEm: ["balas"],
      resumo: "Balas que se expandem no impacto.",
      efeitos: ["+1 no multiplicador de crítico da arma que usar esta munição.", "Só em balas curtas e longas."] },

    { id: "op.mod.municao.explosiva", nome: "Explosiva", natureza: "modificacao", fonte: OP, pagina: 60, tabela: "Tabela 3.5 (p. 61)", aba: "municoes",
      aplicaEm: ["balas"],
      resumo: "Balas com uma gota de mercúrio ou glicerina, que explodem no alvo.",
      efeitos: ["+2d6 no dano da arma que usar esta munição.", "Só em balas curtas e longas."] },

    /* =================================================================
       PROTEÇÕES — OPRPG p. 62
       ================================================================= */

    { id: "op.protecao.leve", nome: "Proteção leve", fonte: OP, pagina: 62, tabela: "Tabela 3.6 (p. 62)", aba: "protecoes",
      categoria: "I", espacos: 2,
      protecao: { tipo: "leve", defesa: 5 },
      resumo: "Jaqueta de couro pesada ou colete de kevlar, comum entre seguranças e policiais." },

    { id: "op.protecao.pesada", nome: "Proteção pesada", fonte: OP, pagina: 62, tabela: "Tabela 3.6 (p. 62)", aba: "protecoes",
      categoria: "II", espacos: 5,
      protecao: { tipo: "pesada", defesa: 10 },
      resumo: "Equipamento de forças especiais: capacete, ombreiras, joelheiras, caneleiras e colete de várias camadas de kevlar.",
      efeitos: ["Resistência a balístico, corte, impacto e perfuração 2.", "Desconfortável e volumosa: −5 nos testes de perícias que sofrem penalidade de carga."] },

    { id: "op.protecao.escudo", nome: "Escudo", fonte: OP, pagina: 62, tabela: "Tabela 3.6 (p. 62)", aba: "protecoes",
      categoria: "I", espacos: 2,
      protecao: { tipo: "escudo", defesa: 2 },
      resumo: "Escudo medieval ou moderno, como os das tropas de choque.",
      efeitos: ["Precisa ser empunhado em uma mão.", "A Defesa do escudo acumula com a de uma proteção.", "Para proficiência e penalidade, conta como proteção pesada."] },

    /* --- Modificações para proteções · OPRPG p. 62 --- */
    { id: "op.mod.protecao.antibombas", nome: "Antibombas", natureza: "modificacao", fonte: OP, pagina: 62, tabela: "Tabela 3.7 (p. 62)", aba: "protecoes",
      aplicaEm: ["pesada"],
      resumo: "Tratada contra calor e estilhaços, com capacete e viseira contra luz e barulho de explosões.",
      efeitos: ["+5 em testes de resistência contra efeitos de área.", "Só em proteções pesadas."] },

    { id: "op.mod.protecao.blindada", nome: "Blindada", natureza: "modificacao", fonte: OP, pagina: 62, tabela: "Tabela 3.7 (p. 62)", aba: "protecoes",
      aplicaEm: ["pesada"],
      resumo: "Placas de aço e cerâmica costuradas entre as camadas de kevlar.",
      efeitos: ["A resistência a dano da proteção passa a 5.", "+1 espaço.", "Só em proteções pesadas."],
      calculo: { espacos: 1 } },

    { id: "op.mod.protecao.discreta", nome: "Discreta", natureza: "modificacao", fonte: OP, pagina: 62, tabela: "Tabela 3.7 (p. 62)", aba: "protecoes",
      aplicaEm: ["leve"], incompativel: ["op.mod.protecao.reforcada"],
      resumo: "Colete compacto de kevlar denso, de pouco volume.",
      efeitos: ["−1 espaço.", "+5 em testes de Crime para ocultá-la, que pode ser feito mesmo sem treino.", "Só em proteções leves; não combina com Reforçada."],
      calculo: { espacos: -1 } },

    { id: "op.mod.protecao.reforcada", nome: "Reforçada", natureza: "modificacao", fonte: OP, pagina: 62, tabela: "Tabela 3.7 (p. 62)", aba: "protecoes",
      aplicaEm: ["leve", "pesada", "escudo"], incompativel: ["op.mod.protecao.discreta"],
      resumo: "Camadas extras de proteção.",
      efeitos: ["+2 na Defesa fornecida.", "+1 espaço.", "Não combina com Discreta."],
      calculo: { defesa: 2, espacos: 1 } },

    /* =================================================================
       EQUIPAMENTO GERAL — OPRPG p. 63–67
       ================================================================= */

    /* --- Acessórios --- */
    { id: "op.geral.kit-de-pericia", nome: "Kit de perícia", fonte: OP, pagina: 63, tabela: "Tabela 3.8 (p. 63)", aba: "geral", secao: "acessorios",
      categoria: "0", espacos: 1, acessorio: true,
      escolha: { tipo: "pericia", filtro: "kit", rotulo: "Perícia do kit" },
      resumo: "Ferramentas que certas perícias exigem. Existe um kit para cada perícia que o pede.",
      efeitos: ["Sem o kit, −5 no teste da perícia."] },

    { id: "op.geral.utensilio", nome: "Utensílio", fonte: OP, pagina: 63, tabela: "Tabela 3.8 (p. 63)", aba: "geral", secao: "acessorios",
      categoria: "I", espacos: 1, acessorio: true, utensilio: true,
      escolha: { tipo: "pericia", filtro: "semLutaPontaria", rotulo: "Perícia que o utensílio ajuda", opcional: true },
      resumo: "Objeto comum com uma utilidade específica: canivete, lupa, smartphone, notebook.",
      efeitos: ["+2 em uma perícia (exceto Luta e Pontaria), com aprovação do mestre.", "Precisa estar empunhado para dar o bônus.", "Sempre ocupa 1 espaço."] },

    { id: "op.geral.vestimenta", nome: "Vestimenta", fonte: OP, pagina: 63, tabela: "Tabela 3.8 (p. 63)", aba: "geral", secao: "acessorios",
      categoria: "I", espacos: 1, acessorio: true, vestimenta: true,
      escolha: { tipo: "pericia", filtro: "semLutaPontaria", rotulo: "Perícia que a vestimenta ajuda", opcional: true },
      resumo: "Peça de roupa que ajuda numa perícia: botas militares, terno elegante, manto com glifos.",
      efeitos: ["+2 em uma perícia (exceto Luta e Pontaria), com aprovação do mestre.", "Bônus de no máximo duas vestimentas ao mesmo tempo.", "Vestir ou despir é uma ação completa."] },

    /* --- Explosivos --- */
    { id: "op.geral.granada-de-atordoamento", nome: "Granada de atordoamento", alias: ["Flash-bang"], fonte: OP, pagina: 64, tabela: "Tabela 3.8 (p. 63)", aba: "geral", secao: "explosivos",
      categoria: "0", espacos: 1, consumivel: true, granada: true,
      resumo: "Estouro barulhento e luminoso.",
      efeitos: ["Seres num raio de 6 m ficam atordoados por 1 rodada (Fortitude DT Agi reduz para ofuscado e surdo por 1 rodada)."] },

    { id: "op.geral.granada-de-fragmentacao", nome: "Granada de fragmentação", fonte: OP, pagina: 64, tabela: "Tabela 3.8 (p. 63)", aba: "geral", secao: "explosivos",
      categoria: "I", espacos: 1, consumivel: true, granada: true,
      resumo: "Espalha fragmentos perfurantes.",
      efeitos: ["Seres num raio de 6 m sofrem 8d6 de perfuração (Reflexos DT Agi reduz à metade)."] },

    { id: "op.geral.granada-de-fumaca", nome: "Granada de fumaça", fonte: OP, pagina: 64, tabela: "Tabela 3.8 (p. 63)", aba: "geral", secao: "explosivos",
      categoria: "0", espacos: 1, consumivel: true, granada: true,
      resumo: "Fumaça espessa e escura.",
      efeitos: ["Seres num raio de 6 m ficam cegos e sob camuflagem total.", "A fumaça dura 2 rodadas."] },

    { id: "op.geral.granada-incendiaria", nome: "Granada incendiária", fonte: OP, pagina: 64, tabela: "Tabela 3.8 (p. 63)", aba: "geral", secao: "explosivos",
      categoria: "I", espacos: 1, consumivel: true, granada: true,
      resumo: "Espalha labaredas incandescentes.",
      efeitos: ["Seres num raio de 6 m sofrem 6d6 de fogo e ficam em chamas (Reflexos DT Agi reduz o dano à metade e evita em chamas)."] },

    { id: "op.geral.mina-antipessoal", nome: "Mina antipessoal", fonte: OP, pagina: 64, tabela: "Tabela 3.8 (p. 63)", aba: "geral", secao: "explosivos",
      categoria: "I", espacos: 1, consumivel: true,
      resumo: "Mina detonada por controle remoto que dispara centenas de bolas de aço.",
      efeitos: [
        "Detonar: ação padrão, estando até alcance longo dela.",
        "Cone de 6 m (direção escolhida ao instalar): 12d6 de perfuração em todos na área (Reflexos DT Int reduz à metade).",
        "Instalar: ação completa e Tática DT 15; falhando, a mina é gasta e não funciona.",
        "Achar uma mina instalada: Percepção contra o resultado do teste de quem a instalou.",
      ] },

    /* --- Itens operacionais --- */
    { id: "op.geral.algemas", nome: "Algemas", fonte: OP, pagina: 64, tabela: "Tabela 3.8 (p. 63)", aba: "geral", secao: "operacionais",
      categoria: "0", espacos: 1,
      resumo: "Um par de algemas de aço.",
      efeitos: [
        "Prender quem não está indefeso: empunhá-las, agarrar a pessoa e vencer um novo teste de agarrar.",
        "Nos dois pulsos: −5 em testes que usem as mãos e impede conjurar. Ou um pulso preso a objeto imóvel adjacente, para impedir que se mova.",
        "Escapar: Acrobacia DT 30 (ou as chaves).",
      ] },

    { id: "op.geral.arpeu", nome: "Arpéu", fonte: OP, pagina: 65, tabela: "Tabela 3.8 (p. 63)", aba: "geral", secao: "operacionais",
      categoria: "0", espacos: 1,
      resumo: "Gancho de aço na ponta de uma corda, para prender em muros, janelas e parapeitos.",
      efeitos: ["Prender o arpéu: Pontaria DT 15.", "Subir um muro com a corda: +5 em Atletismo."] },

    { id: "op.geral.bandoleira", nome: "Bandoleira", fonte: OP, pagina: 65, tabela: "Tabela 3.8 (p. 63)", aba: "geral", secao: "operacionais",
      categoria: "I", espacos: 1,
      resumo: "Cinto com bolsos e alças.",
      efeitos: ["Uma vez por rodada, sacar ou guardar um item do inventário como ação livre."] },

    { id: "op.geral.binoculos", nome: "Binóculos", fonte: OP, pagina: 65, tabela: "Tabela 3.8 (p. 63)", aba: "geral", secao: "operacionais",
      categoria: "0", espacos: 1,
      resumo: "Binóculos militares.",
      efeitos: ["+5 em Percepção para observar coisas distantes."] },

    { id: "op.geral.bloqueador-de-sinal", nome: "Bloqueador de sinal", fonte: OP, pagina: 65, tabela: "Tabela 3.8 (p. 63)", aba: "geral", secao: "operacionais",
      categoria: "I", espacos: 1, eletrico: true,
      resumo: "Dispositivo compacto que polui a frequência de rádio dos celulares.",
      efeitos: ["Nenhum celular em alcance médio consegue se conectar."] },

    { id: "op.geral.cicatrizante", nome: "Cicatrizante", fonte: OP, pagina: 65, tabela: "Tabela 3.8 (p. 63)", aba: "geral", secao: "operacionais",
      categoria: "I", espacos: 1, consumivel: true,
      resumo: "Spray com remédio de efeito cicatrizante potente.",
      efeitos: ["Ação padrão e o item: cura 2d8+2 PV em você ou num ser adjacente."] },

    { id: "op.geral.corda", nome: "Corda", fonte: OP, pagina: 65, tabela: "Tabela 3.8 (p. 63)", aba: "geral", secao: "operacionais",
      categoria: "0", espacos: 1,
      resumo: "Rolo com 10 metros de corda resistente.",
      efeitos: ["+5 em Atletismo para descer um buraco ou prédio.", "Serve para amarrar pessoas inconscientes, entre outros usos."] },

    { id: "op.geral.equipamento-de-sobrevivencia", nome: "Equipamento de sobrevivência", fonte: OP, pagina: 65, tabela: "Tabela 3.8 (p. 63)", aba: "geral", secao: "operacionais",
      categoria: "0", espacos: 2,
      resumo: "Mochila com saco de dormir, panelas, GPS e outros itens para o mato.",
      efeitos: ["+5 em Sobrevivência para acampar e se orientar, e permite esses testes sem treino."] },

    { id: "op.geral.lanterna-tatica", nome: "Lanterna tática", fonte: OP, pagina: 65, tabela: "Tabela 3.8 (p. 63)", aba: "geral", secao: "operacionais",
      categoria: "I", espacos: 1, eletrico: true,
      resumo: "Ilumina lugares escuros.",
      efeitos: ["Ação de movimento para mirar a luz nos olhos de um ser em alcance curto: ofuscado por 1 rodada, e imune à lanterna pelo resto da cena."] },

    { id: "op.geral.mascara-de-gas", nome: "Máscara de gás", fonte: OP, pagina: 66, tabela: "Tabela 3.8 (p. 63)", aba: "geral", secao: "operacionais",
      categoria: "0", espacos: 1,
      resumo: "Máscara com filtro que cobre o rosto inteiro.",
      efeitos: ["+10 em Fortitude contra efeitos que dependam de respiração."] },

    { id: "op.geral.mochila-militar", nome: "Mochila militar", fonte: OP, pagina: 66, tabela: "Tabela 3.8 (p. 63)", aba: "geral", secao: "operacionais",
      categoria: "I", espacos: 0, capacidade: 2,
      resumo: "Mochila leve e de alta qualidade.",
      efeitos: ["Não ocupa espaço.", "Aumenta a capacidade de carga em 2 espaços."],
      notas: ["A Tabela 3.8 traz “*” em espaços; a descrição diz que ela não usa espaço nenhum."] },

    { id: "op.geral.oculos-de-visao-termica", nome: "Óculos de visão térmica", fonte: OP, pagina: 66, tabela: "Tabela 3.8 (p. 63)", aba: "geral", secao: "operacionais",
      categoria: "I", espacos: 1, eletrico: true,
      resumo: "Óculos que mostram o calor dos corpos.",
      efeitos: ["Eliminam a penalidade em testes por camuflagem."] },

    { id: "op.geral.pe-de-cabra", nome: "Pé de cabra", fonte: OP, pagina: 66, tabela: "Tabela 3.8 (p. 63)", aba: "geral", secao: "operacionais",
      categoria: "0", espacos: 1,
      resumo: "Barra de ferro para arrombar.",
      efeitos: ["+5 em testes de Força para arrombar portas.", "Em combate, pode ser usado como um bastão (1d6 de impacto, x2)."] },

    { id: "op.geral.pistola-de-dardos", nome: "Pistola de dardos", fonte: OP, pagina: 66, tabela: "Tabela 3.8 (p. 63)", aba: "geral", secao: "operacionais",
      categoria: "I", espacos: 1,
      resumo: "Dispara dardos com um sonífero poderoso. Vem com 2 dardos.",
      efeitos: [
        "Faça um ataque à distância contra o ser: acertando, ele fica inconsciente até o fim da cena (Fortitude DT Agi reduz para desprevenido e lento por 1 rodada).",
        "Caixa adicional com 2 dardos: categoria 0, 1 espaço (ver Munições).",
      ] },

    { id: "op.geral.pistola-sinalizadora", nome: "Pistola sinalizadora", fonte: OP, pagina: 66, tabela: "Tabela 3.8 (p. 63)", aba: "geral", secao: "operacionais",
      categoria: "0", espacos: 1,
      arma: { proficiencia: null, tipo: "disparo", empunhadura: "leve", dano: "2d6", critico: "", alcance: "curto", tipoDano: "Fogo", municao: "op.municao.cargas-sinalizadora" },
      resumo: "Dispara um sinalizador luminoso para chamar outras pessoas. Vem com 2 cargas.",
      efeitos: ["Pode ser usada como arma de disparo leve, alcance curto, 2d6 de dano de fogo.", "Caixa adicional com 2 cargas: categoria 0, 1 espaço (ver Munições)."],
      notas: ["O livro não dá margem de ameaça nem multiplicador: vale a regra geral de crítico (20, x2, OPRPG p. 54)."] },

    { id: "op.geral.soqueira", nome: "Soqueira", fonte: OP, pagina: 66, tabela: "Tabela 3.8 (p. 63)", aba: "geral", secao: "operacionais",
      categoria: "0", espacos: 1, modificavelComo: "corpoACorpo",
      resumo: "Peça de metal usada entre os dedos para socos mais perigosos.",
      efeitos: ["+1 nas rolagens de dano desarmado.", "Aceita modificações e maldições de armas corpo a corpo, que valem nos ataques desarmados."] },

    { id: "op.geral.spray-de-pimenta", nome: "Spray de pimenta", fonte: OP, pagina: 66, tabela: "Tabela 3.8 (p. 63)", aba: "geral", secao: "operacionais",
      categoria: "I", espacos: 1,
      resumo: "Composto químico que causa dor e lacrimejo.",
      efeitos: ["Ação padrão contra um ser adjacente: cego por 1d4 rodadas (Fortitude DT Agi evita).", "A carga dura dois usos."] },

    { id: "op.geral.taser", nome: "Taser", fonte: OP, pagina: 66, tabela: "Tabela 3.8 (p. 63)", aba: "geral", secao: "operacionais",
      categoria: "I", espacos: 1, eletrico: true,
      resumo: "Dispositivo de eletrochoque.",
      efeitos: ["Ação padrão contra um ser adjacente: 1d6 de eletricidade e atordoado por 1 rodada (Fortitude DT Agi evita).", "A bateria dura dois usos."] },

    { id: "op.geral.traje-hazmat", nome: "Traje hazmat", fonte: OP, pagina: 66, tabela: "Tabela 3.8 (p. 63)", aba: "geral", secao: "operacionais",
      categoria: "I", espacos: 2,
      resumo: "Roupa impermeável de corpo inteiro contra materiais tóxicos.",
      efeitos: ["+5 em testes de resistência contra efeitos ambientais.", "Resistência a químico 10."] },

    /* --- Itens paranormais · OPRPG p. 66–67 --- */
    { id: "op.paranormal.amarras", nome: "Amarras de (elemento)", fonte: OP, pagina: 66, tabela: "Tabela 3.10 (p. 67)", aba: "geral", secao: "paranormais",
      categoria: "II", espacos: 1,
      escolha: { tipo: "elemento", rotulo: "Elemento das amarras" },
      resumo: "Cordas ou correntes feitas de um elemento, para imobilizar criaturas vulneráveis a ele.",
      efeitos: [
        "Armadilha: gasta as amarras, uma ação completa e 2 PE para uma armadilha de 3×3 m. A criatura que atravessa o espaço pela primeira vez no turno faz Reflexos (DT Int) ou fica imóvel até o fim da cena; mesmo passando, o espaço é terreno difícil para ela.",
        "Laçar: ação padrão e 1 PE contra uma criatura em alcance curto; Vontade (DT Agi) ou fica paralisada até o início do próximo turno dela, quando repete o teste. Manter custa 1 PE por rodada.",
      ],
      notas: ["O livro não lista quais elementos existem para as amarras."] },

    { id: "op.paranormal.camera-de-aura", nome: "Câmera de aura paranormal", alias: ["Câmara de aura paranormal"], fonte: OP, pagina: 66, tabela: "Tabela 3.10 (p. 67)", aba: "geral", secao: "paranormais",
      categoria: "II", espacos: 1, camera: true,
      resumo: "Câmera amaldiçoada com Energia e sigilos de Conhecimento que captura auras.",
      efeitos: ["Ação padrão e 1 PE por foto instantânea: revela auras paranormais em pessoas e objetos, na cor do elemento."],
      notas: ["A Tabela 3.10 escreve “Câmara de aura paranormal”."] },

    { id: "op.paranormal.componentes", nome: "Componentes ritualísticos de (elemento)", fonte: OP, pagina: 66, tabela: "Tabela 3.10 (p. 67)", aba: "geral", secao: "paranormais",
      categoria: "0", espacos: 1,
      escolha: { tipo: "elemento", semMedo: true, rotulo: "Elemento dos componentes" },
      resumo: "Objetos ligados a um elemento, necessários para conjurar os rituais dele.",
      efeitos: ["Necessários para conjurar rituais do elemento (Sangue, Morte, Conhecimento ou Energia).", "Não existem componentes ritualísticos de Medo."] },

    { id: "op.paranormal.emissor-de-pulsos", nome: "Emissor de pulsos paranormais", fonte: OP, pagina: 67, tabela: "Tabela 3.10 (p. 67)", aba: "geral", secao: "paranormais",
      categoria: "II", espacos: 1,
      resumo: "Caixa coberta de sigilos, feita para servir de isca a criaturas paranormais.",
      efeitos: ["Ação completa e 1 PE: pulso de um elemento escolhido que atrai criaturas desse elemento e afasta as do elemento oposto (Vontade DT Pre evita)."] },

    { id: "op.paranormal.escuta-de-ruidos", nome: "Escuta de ruídos paranormais", fonte: OP, pagina: 67, tabela: "Tabela 3.10 (p. 67)", aba: "geral", secao: "paranormais",
      categoria: "II", espacos: 1,
      resumo: "Microfone espião capaz de captar ruídos paranormais.",
      efeitos: ["Ação completa e 2 PE: grava por até 24 horas.", "Ouvir a gravação dá +5 em Ocultismo para identificar criatura."] },

    { id: "op.paranormal.medidor-de-estabilidade", nome: "Medidor de estabilidade da membrana", fonte: OP, pagina: 67, aba: "geral", secao: "paranormais",
      categoria: null, espacos: null,
      resumo: "Conjunto de medidores (temperatura, campo magnético, dilatação temporal) que avalia a Membrana.",
      efeitos: ["Treinado em Ocultismo avalia o estado da Membrana numa área (p. 97), o que indica a chance de uma entidade se manifestar ali.", "É um indício, não uma resposta definitiva."],
      notas: ["Descrito na p. 67, mas ausente da Tabela 3.10: o livro não informa categoria nem espaços. A categoria fica em branco para a mesa decidir; os espaços usam o padrão do livro (1)."] },

    { id: "op.paranormal.scanner", nome: "Scanner de manifestação paranormal de (elemento)", fonte: OP, pagina: 67, tabela: "Tabela 3.10 (p. 67)", aba: "geral", secao: "paranormais",
      categoria: "II", espacos: 1,
      escolha: { tipo: "elemento", rotulo: "Elemento do scanner" },
      resumo: "Dispositivo ligado a objetos amaldiçoados de uma entidade e coberto de sigilos.",
      efeitos: ["Ativar: ação padrão; consome 1 PE por rodada.", "Indica a direção de todas as manifestações ativas do elemento em alcance longo — inclusive criaturas que o têm como complemento."] },

    /* --- Modificações para acessórios · OPRPG p. 64 --- */
    { id: "op.mod.acessorio.aprimorado", nome: "Aprimorado", natureza: "modificacao", fonte: OP, pagina: 64, tabela: "Tabela 3.9 (p. 64)", aba: "geral",
      aplicaEm: ["acessorio"], repeteComFuncaoAdicional: true,
      resumo: "Melhora o bônus do acessório.",
      efeitos: ["Um bônus em perícia do acessório passa a +5.", "Com Função adicional, pode ser escolhida uma segunda vez, para a outra perícia."] },

    { id: "op.mod.acessorio.discreto", nome: "Discreto", natureza: "modificacao", fonte: OP, pagina: 64, tabela: "Tabela 3.9 (p. 64)", aba: "geral",
      aplicaEm: ["acessorio"],
      resumo: "Miniaturizado ou disfarçado de objeto inócuo, como um relógio.",
      efeitos: ["−1 espaço.", "+5 em testes de Crime para ocultá-lo, que pode ser feito mesmo sem treino."],
      calculo: { espacos: -1 } },

    { id: "op.mod.acessorio.funcao-adicional", nome: "Função adicional", natureza: "modificacao", fonte: OP, pagina: 64, tabela: "Tabela 3.9 (p. 64)", aba: "geral",
      aplicaEm: ["acessorio"],
      escolha: { tipo: "pericia", filtro: "semLutaPontaria", rotulo: "Perícia adicional", opcional: true },
      resumo: "O acessório ganha outra utilidade.",
      efeitos: ["+2 em mais uma perícia à escolha, com aprovação do mestre."] },

    { id: "op.mod.acessorio.instrumental", nome: "Instrumental", natureza: "modificacao", fonte: OP, pagina: 64, tabela: "Tabela 3.9 (p. 64)", aba: "geral",
      aplicaEm: ["acessorio"],
      escolha: { tipo: "pericia", filtro: "kit", rotulo: "Kit que o acessório substitui", opcional: true },
      resumo: "O acessório inclui as ferramentas de um kit.",
      efeitos: ["Funciona como um kit de perícia específico, escolhido ao aplicar a modificação."] },

    /* =================================================================
       EQUIPAMENTOS GERAIS — SAH p. 38–45
       ================================================================= */

    /* --- Acessórios · SAH --- */
    { id: "sah.geral.amuleto-sagrado", nome: "Amuleto sagrado", fonte: SAH, pagina: 39, tabela: "Tabela 1.5 (p. 40)", aba: "geral", secao: "acessorios",
      categoria: "0", espacos: 1, acessorio: true, utensilio: true,
      resumo: "Rosário, shimenawa, contas de oração ou outro objeto que reforça a fé.",
      efeitos: ["Utensílio especial que ocupa o espaço de um item vestido.", "+2 em Religião e em Vontade."] },

    { id: "sah.geral.celular", nome: "Celular", fonte: SAH, pagina: 39, tabela: "Tabela 1.5 (p. 40)", aba: "geral", secao: "acessorios",
      categoria: "0", espacos: 1, acessorio: true, utensilio: true, eletrico: true,
      resumo: "Utensílio especial: fotos, áudio, vídeo, internet e ligações.",
      efeitos: ["Com internet, +2 em testes de perícia que envolvam adquirir informações.", "Lanterna fraca: ilumina um cone de 4,5 m."] },

    { id: "sah.geral.chave-de-fenda-universal", nome: "Chave de fenda universal", fonte: SAH, pagina: 39, tabela: "Tabela 1.5 (p. 40)", aba: "geral", secao: "acessorios",
      categoria: "0", espacos: 1, acessorio: true,
      resumo: "Ferramenta para quase qualquer conserto.",
      efeitos: ["+2 em testes de perícia para criar ou reparar objetos, de panelas a motores de avião.", "Também dá o bônus como item de apoio, como mexer em cabos para hackear um servidor."] },

    { id: "sah.geral.chaves", nome: "Chaves", fonte: SAH, pagina: 39, tabela: "Tabela 1.5 (p. 40)", aba: "geral", secao: "acessorios",
      categoria: "0", espacos: 1, acessorio: true,
      resumo: "Molho de chaves de casa, veículo ou cadeados.",
      efeitos: ["Usar o barulho das chaves para distrair alguém dá +2 em Furtividade na mesma rodada."] },

    { id: "sah.geral.documentos-falsos", nome: "Documentos falsos", fonte: SAH, pagina: 39, tabela: "Tabela 1.5 (p. 40)", aba: "geral", secao: "acessorios",
      categoria: "I", espacos: 1, acessorio: true,
      resumo: "Identidade, habilitação e cartões em nome de uma identidade falsa.",
      efeitos: ["+2 em Diplomacia, Enganação e Intimidação para se passar pela pessoa dos documentos."] },

    { id: "sah.geral.manual-operacional", nome: "Manual operacional", fonte: SAH, pagina: 39, tabela: "Tabela 1.5 (p. 40)", aba: "geral", secao: "acessorios",
      categoria: "I", espacos: 1, acessorio: true,
      escolha: { tipo: "pericia", rotulo: "Perícia do manual", opcional: true },
      resumo: "Livro com lições práticas sobre um assunto. Existe um manual para cada perícia.",
      efeitos: [
        "Uma ação de interlúdio lendo permite usar a perícia como treinado até o próximo interlúdio.",
        "Manual operacional aprimorado (OPRPG p. 64) também dá +5 na perícia.",
        "Só o benefício de um manual por vez.",
      ] },

    { id: "sah.geral.notebook", nome: "Notebook", alias: ["Tablet"], fonte: SAH, pagina: 39, tabela: "Tabela 1.5 (p. 40)", aba: "geral", secao: "acessorios",
      categoria: "0", espacos: 2, acessorio: true, utensilio: true, eletrico: true,
      resumo: "Utensílio especial. Tablets contam como uma variação de notebook.",
      efeitos: ["Com internet, +2 em testes de perícia que envolvam adquirir informações.", "Ao relaxar no interlúdio, recupera 1 ponto adicional de Sanidade.", "A tela ilumina um cone de 4,5 m."] },

    /* --- Modificação para acessórios · SAH p. 39 --- */
    { id: "sah.mod.acessorio.bateria-potente", nome: "Bateria potente", natureza: "modificacao", fonte: SAH, pagina: 39, aba: "geral",
      aplicaEm: ["eletrico"],
      resumo: "Modificação para objetos elétricos, que aumenta eficiência e duração.",
      efeitos: [
        "Lanterna, celular e notebook: dobra a duração da bateria e o alcance da luz.",
        "Taser: dobra os usos, o dano vira 1d8 e a DT para resistir sobe +5.",
        "Outros objetos, a critério do mestre.",
        "Com a opção de duração de baterias, o dado da bateria cai um passo a cada dois usos.",
      ] },

    /* --- Explosivos · SAH p. 40 --- */
    { id: "sah.geral.dinamite", nome: "Dinamite", fonte: SAH, pagina: 41, tabela: "Tabela 1.5 (p. 40)", aba: "geral", secao: "explosivos",
      categoria: "I", espacos: 1, consumivel: true,
      resumo: "Bastão de 20 cm à base de nitroglicerina, com pavio.",
      efeitos: ["Com a mesma ação padrão, acende o pavio e arremessa a um ponto em alcance médio.", "Raio de 6 m: 4d6 de impacto e 4d6 de fogo, e em chamas (Reflexos DT Agi reduz à metade e evita em chamas)."] },

    { id: "sah.geral.explosivo-plastico", nome: "Explosivo plástico", fonte: SAH, pagina: 41, tabela: "Tabela 1.5 (p. 40)", aba: "geral", secao: "explosivos",
      categoria: "I", espacos: 1, consumivel: true,
      resumo: "Massa adesiva com pinos de ignição e detonador remoto.",
      efeitos: [
        "Duas rodadas para preparar os pinos e grudar numa superfície.",
        "Detona pelo detonador (ação livre, de alcance longo) ou com 1 ponto de dano de fogo ou eletricidade.",
        "Raio de 3 m: 16d6 de impacto em seres e objetos (Reflexos DT Int reduz à metade).",
        "Nas mãos de um especialista em explosivos (treinado em Crime ou Profissão adequada), dobro de dano em objetos e estruturas, ignorando a RD deles.",
      ] },

    { id: "sah.geral.galao-vermelho", nome: "Galão vermelho", fonte: SAH, pagina: 41, tabela: "Tabela 1.5 (p. 40)", aba: "geral", secao: "explosivos",
      categoria: "0", espacos: 2, consumivel: true,
      resumo: "Galão de substância inflamável, comum em ambientes industriais.",
      efeitos: [
        "Ao sofrer dano de fogo ou balístico, explode numa esfera de 6 m: 12d6 de fogo e em chamas (Reflexos DT 25 reduz à metade e evita em chamas).",
        "A área fica em chamas (1d6 de fogo por rodada em seres e objetos) até ser apagada ou a cena acabar.",
      ] },

    { id: "sah.geral.granada-de-gas-sonifero", nome: "Granada de gás sonífero", fonte: SAH, pagina: 41, tabela: "Tabela 1.5 (p. 40)", aba: "geral", secao: "explosivos",
      categoria: "I", espacos: 1, consumivel: true, granada: true,
      resumo: "Libera uma fumaça branca que faz dormir.",
      efeitos: [
        "Fumaça num raio de 6 m, por 2 rodadas.",
        "Quem começa o turno na área fica inconsciente e caído — ou, em atividade física intensa como combate, exausto por 1 rodada e depois fatigado (Fortitude DT Agi reduz para fatigado por 1d4 rodadas).",
      ] },

    { id: "sah.geral.granada-de-pem", nome: "Granada de PEM", fonte: SAH, pagina: 41, tabela: "Tabela 1.5 (p. 40)", aba: "geral", secao: "explosivos",
      categoria: "I", espacos: 1, consumivel: true, granada: true,
      resumo: "Emite um pulso eletromagnético poderoso.",
      efeitos: [
        "Desativa equipamentos elétricos num raio de 18 m até o fim da cena.",
        "Criaturas de Energia na área sofrem 6d6 de impacto e ficam paralisadas por 1 rodada (uma vez por cena; Fortitude DT Agi reduz à metade e evita a condição).",
      ] },

    /* --- Itens operacionais · SAH p. 41–44 --- */
    { id: "sah.geral.alarme-de-movimento", nome: "Alarme de movimento", fonte: SAH, pagina: 42, tabela: "Tabela 1.5 (p. 40)", aba: "geral", secao: "operacionais",
      categoria: "0", espacos: 1, eletrico: true,
      resumo: "Sensor pequeno controlado por um dispositivo ou aplicativo.",
      efeitos: ["Ação completa para posicionar e ativar.", "Avisa sempre que há movimento significativo num cone de 30 m — com sinal discreto ou alarme sonoro; a sensibilidade é ajustável."] },

    { id: "sah.geral.alimento-energetico", nome: "Alimento energético", fonte: SAH, pagina: 42, tabela: "Tabela 1.5 (p. 40)", aba: "geral", secao: "operacionais",
      categoria: "II", espacos: 1, consumivel: true,
      resumo: "Alimento ou suplemento de alta tecnologia que recupera as energias mentais.",
      efeitos: ["Ação padrão para consumir: recupera 1d4 PE."] },

    { id: "sah.geral.aplicador-de-medicamentos", nome: "Aplicador de medicamentos", fonte: SAH, pagina: 42, tabela: "Tabela 1.5 (p. 40)", aba: "geral", secao: "operacionais",
      categoria: "I", espacos: 1,
      resumo: "Bomba injetora portátil presa ao braço ou à perna.",
      efeitos: ["Aplica cicatrizante ou medicamento com uma ação de movimento.", "Três doses, já contadas no espaço do item.", "Carregar uma dose é uma ação padrão."] },

    { id: "sah.geral.bracadeira-reforcada", nome: "Braçadeira reforçada", fonte: SAH, pagina: 42, tabela: "Tabela 1.5 (p. 40)", aba: "geral", secao: "operacionais",
      categoria: "I", espacos: 1,
      resumo: "Proteções de braço como as das artes marciais.",
      efeitos: ["+2 na RD que você recebe por bloquear."] },

    { id: "sah.geral.cao-adestrado", nome: "Cão adestrado", fonte: SAH, pagina: 42, tabela: "Tabela 1.5 (p. 40)", aba: "geral", secao: "operacionais",
      categoria: "I", espacos: 0,
      resumo: "Cão corajoso e grande, treinado para investigação e combate.",
      efeitos: [
        "Aliado para quem é treinado em Adestramento (regras de aliados, OPRPG p. 171).",
        "Bônus: +2 em Investigação e Percepção.",
        "Ladrar e morder: 1 PE para +2 na Defesa por 1 rodada.",
      ],
      notas: ["Na Tabela 1.5 os espaços aparecem como “–”: um aliado não ocupa o inventário."] },

    { id: "sah.geral.coldre-saque-rapido", nome: "Coldre saque rápido", fonte: SAH, pagina: 42, tabela: "Tabela 1.5 (p. 40)", aba: "geral", secao: "operacionais",
      categoria: "I", espacos: 1,
      resumo: "Coldre projetado para sacar e guardar com movimento mínimo.",
      efeitos: ["Uma vez por rodada, sacar ou guardar uma arma de fogo leve como ação livre."] },

    { id: "sah.geral.equipamento-de-escuta", nome: "Equipamento de escuta", fonte: SAH, pagina: 42, tabela: "Tabela 1.5 (p. 40)", aba: "geral", secao: "operacionais",
      categoria: "I", espacos: 1, eletrico: true,
      resumo: "Receptor de 90 m de alcance e três transmissores minúsculos.",
      efeitos: [
        "Cada transmissor capta sons num raio de 9 m.",
        "Instalar: alguns minutos e Crime DT 20 (falhando, não transmite); o resultado é a DT para achar o transmissor.",
        "Instalar com gente por perto: ação completa, Furtividade oposta à Percepção dos presentes e Crime com DT +5.",
      ] },

    { id: "sah.geral.estrepes", nome: "Estrepes (saco)", fonte: SAH, pagina: 42, tabela: "Tabela 1.5 (p. 40)", aba: "geral", secao: "operacionais",
      categoria: "0", espacos: 1, consumivel: true,
      resumo: "Peças de metal de quatro pontas; uma sempre fica para cima.",
      efeitos: [
        "Ação padrão para cobrir um quadrado de 1,5 m: quem pisa sofre 1d4 de perfuração e fica lento por um dia.",
        "Em perseguição: aplicar como parte da ação dá −1 dado no seu teste; o perseguidor que pisa sofre −1 dado nos testes até o fim da cena.",
        "Reflexos (DT Agi) evita; não afetam seres capazes de resistir a todo o dano.",
      ] },

    { id: "sah.geral.faixa-de-pregos", nome: "Faixa de pregos", fonte: SAH, pagina: 42, tabela: "Tabela 1.5 (p. 40)", aba: "geral", secao: "operacionais",
      categoria: "I", espacos: 2,
      resumo: "Trilha sanfonada de hastes com pregos, feita para parar veículos.",
      efeitos: ["Funciona como estrepes numa linha de 9 m.", "Pneus de borracha que passam por ela furam, e o veículo anda metade do deslocamento."] },

    { id: "sah.geral.isqueiro", nome: "Isqueiro", fonte: SAH, pagina: 43, tabela: "Tabela 1.5 (p. 40)", aba: "geral", secao: "operacionais",
      categoria: "0", espacos: 0.5,
      resumo: "Isqueiro de metal ou descartável.",
      efeitos: ["Ação de movimento para acender uma chama pequena.", "Incendeia objetos inflamáveis e ilumina um raio de 3 m."] },

    /* Medicamentos: ação padrão e o medicamento, em você ou num ser adjacente. */
    { id: "sah.medicamento.antibiotico", nome: "Antibiótico", fonte: SAH, pagina: 43, tabela: "Tabela 1.5 (p. 40)", aba: "geral", secao: "operacionais", medicamento: true,
      categoria: "I", espacos: 0.5, consumivel: true,
      resumo: "Fortalece a imunidade contra vírus e bactérias.",
      efeitos: ["+5 no próximo teste de Fortitude contra efeitos de uma doença, até o fim do dia."] },

    { id: "sah.medicamento.antidoto", nome: "Antídoto", fonte: SAH, pagina: 43, tabela: "Tabela 1.5 (p. 40)", aba: "geral", secao: "operacionais", medicamento: true,
      categoria: "I", espacos: 0.5, consumivel: true,
      resumo: "Ajuda o corpo a lidar com venenos.",
      efeitos: ["+5 no próximo teste de Fortitude contra efeitos de um veneno, até o fim do dia.", "Um antídoto feito para um veneno específico remove o veneno."] },

    { id: "sah.medicamento.antiemetico", nome: "Antiemético", fonte: SAH, pagina: 43, tabela: "Tabela 1.5 (p. 40)", aba: "geral", secao: "operacionais", medicamento: true,
      categoria: "I", espacos: 0.5, consumivel: true,
      resumo: "Contra náusea e vômito.",
      efeitos: ["Remove a condição enjoado e dá +5 em testes para evitá-la até o fim da cena.", "A critério do mestre, serve para outras condições causadas por náusea."] },

    { id: "sah.medicamento.antihistaminico", nome: "Antihistamínico", fonte: SAH, pagina: 43, tabela: "Tabela 1.5 (p. 40)", aba: "geral", secao: "operacionais", medicamento: true,
      categoria: "I", espacos: 0.5, consumivel: true,
      resumo: "Reduz reações alérgicas perigosas.",
      efeitos: ["+5 no próximo teste contra efeitos de uma alergia, até o fim do dia."] },

    { id: "sah.medicamento.anti-inflamatorio", nome: "Anti-inflamatório", fonte: SAH, pagina: 43, tabela: "Tabela 1.5 (p. 40)", aba: "geral", secao: "operacionais", medicamento: true,
      categoria: "I", espacos: 0.5, consumivel: true,
      resumo: "Reduz dor e inchaço.",
      efeitos: ["Fornece 1d8+2 PV temporários."] },

    { id: "sah.medicamento.antitermico", nome: "Antitérmico", fonte: SAH, pagina: 43, tabela: "Tabela 1.5 (p. 40)", aba: "geral", secao: "operacionais", medicamento: true,
      categoria: "I", espacos: 0.5, consumivel: true,
      resumo: "Reduz febre e alivia dores de cabeça.",
      efeitos: ["Permite um novo teste contra uma condição mental que o usuário esteja sofrendo.", "Só funciona uma vez por cena."] },

    { id: "sah.medicamento.broncodilatador", nome: "Broncodilatador", fonte: SAH, pagina: 43, tabela: "Tabela 1.5 (p. 40)", aba: "geral", secao: "operacionais", medicamento: true,
      categoria: "I", espacos: 0.5, consumivel: true,
      resumo: "Auxilia na respiração.",
      efeitos: ["+5 em testes para evitar as condições asfixiado ou fatigado, até o fim do dia."] },

    { id: "sah.medicamento.coagulante", nome: "Coagulante", fonte: SAH, pagina: 43, tabela: "Tabela 1.5 (p. 40)", aba: "geral", secao: "operacionais", medicamento: true,
      categoria: "I", espacos: 0.5, consumivel: true,
      resumo: "Aumenta a capacidade de coagulação.",
      efeitos: ["+5 em testes para se estabilizar da condição sangrando, até o fim do dia.", "Junto de um teste de Medicina para tirar alguém de morrendo, também +5 nesse teste."] },

    { id: "sah.geral.oculos-de-visao-noturna", nome: "Óculos de visão noturna", fonte: SAH, pagina: 43, tabela: "Tabela 1.5 (p. 40)", aba: "geral", secao: "operacionais",
      categoria: "I", espacos: 1, eletrico: true,
      resumo: "Óculos alimentados por bateria que enxergam no escuro.",
      efeitos: ["Visão no escuro.", "−1 dado em testes de resistência contra a condição ofuscado e efeitos baseados em luz (como granada de atordoamento)."] },

    { id: "sah.geral.oculos-escuros", nome: "Óculos escuros", fonte: SAH, pagina: 43, tabela: "Tabela 1.5 (p. 40)", aba: "geral", secao: "operacionais",
      categoria: "0", espacos: 1,
      resumo: "Óculos de lentes escuras.",
      efeitos: ["Quem os veste não pode ser ofuscado."] },

    { id: "sah.geral.pa", nome: "Pá", fonte: SAH, pagina: 43, tabela: "Tabela 1.5 (p. 40)", aba: "geral", secao: "operacionais",
      categoria: "0", espacos: 2,
      resumo: "Ferramenta pesada para cavar.",
      efeitos: ["+5 em testes de Força para cavar buracos e mover detritos.", "Em combate, pode ser usada como um bastão."] },

    { id: "sah.geral.paraquedas", nome: "Paraquedas", fonte: SAH, pagina: 43, tabela: "Tabela 1.5 (p. 40)", aba: "geral", secao: "operacionais",
      categoria: "I", espacos: 2,
      resumo: "Anula o dano de queda.",
      efeitos: [
        "Veterano em Acrobacia, Pilotagem, Reflexos, Tática ou numa Profissão específica sabe usar.",
        "Sem isso, ou em quedas muito curtas, exige Reflexos DT 20; falhando, só reduz o dano de queda à metade.",
      ],
      notas: ["A Tabela 1.5 escreve a categoria como “1”; o catálogo lê como I."] },

    { id: "sah.geral.traje-de-mergulho", nome: "Traje de mergulho", fonte: SAH, pagina: 44, tabela: "Tabela 1.5 (p. 40)", aba: "geral", secao: "operacionais",
      categoria: "I", espacos: 2,
      resumo: "Roupa impermeável com tanque e máscara para 1 hora de oxigênio.",
      efeitos: ["+5 em testes de resistência contra efeitos ambientais.", "Resistência a dano químico 5.", "Ocupa o espaço de uma vestimenta; vestir ou despir é uma ação completa."],
      notas: ["A Tabela 1.5 escreve a categoria como “1”; o catálogo lê como I."] },

    { id: "sah.geral.traje-espacial", nome: "Traje espacial", fonte: SAH, pagina: 44, tabela: "Tabela 1.5 (p. 40)", aba: "geral", secao: "operacionais",
      categoria: "II", espacos: 5,
      resumo: "Roupa de corpo inteiro para o vácuo, com oito horas de água e oxigênio.",
      efeitos: ["+10 em testes de resistência contra efeitos ambientais.", "Resistência a dano químico 20.", "Ocupa o espaço de uma vestimenta; vestir ou despir leva duas rodadas."],
      notas: ["A Tabela 1.5 escreve a categoria como “2”; o catálogo lê como II."] },

    /* --- Itens paranormais · SAH p. 44–45 --- */
    { id: "sah.paranormal.catalisador-ampliador", nome: "Catalisador ritualístico ampliador", fonte: SAH, pagina: 44, tabela: "Tabela 1.5 (p. 40)", aba: "geral", secao: "paranormais",
      categoria: "I", espacos: 0.5, consumivel: true, catalisador: true,
      escolha: { tipo: "elemento", semMedo: true, rotulo: "Elemento do catalisador" },
      resumo: "Componente alterado pela exposição paranormal, consumido ao conjurar.",
      efeitos: ["Aumenta o alcance do ritual em um passo (curto → médio → longo → extremo) ou dobra a área de efeito."] },

    { id: "sah.paranormal.catalisador-perturbador", nome: "Catalisador ritualístico perturbador", fonte: SAH, pagina: 44, tabela: "Tabela 1.5 (p. 40)", aba: "geral", secao: "paranormais",
      categoria: "I", espacos: 0.5, consumivel: true, catalisador: true,
      escolha: { tipo: "elemento", semMedo: true, rotulo: "Elemento do catalisador" },
      resumo: "Componente alterado pela exposição paranormal, consumido ao conjurar.",
      efeitos: ["+2 na DT para resistir ao ritual."] },

    { id: "sah.paranormal.catalisador-potencializador", nome: "Catalisador ritualístico potencializador", fonte: SAH, pagina: 44, tabela: "Tabela 1.5 (p. 40)", aba: "geral", secao: "paranormais",
      categoria: "I", espacos: 0.5, consumivel: true, catalisador: true,
      escolha: { tipo: "elemento", semMedo: true, rotulo: "Elemento do catalisador" },
      resumo: "Componente alterado pela exposição paranormal, consumido ao conjurar.",
      efeitos: ["O dano do ritual aumenta em um dado do mesmo tipo."] },

    { id: "sah.paranormal.catalisador-prolongador", nome: "Catalisador ritualístico prolongador", fonte: SAH, pagina: 44, tabela: "Tabela 1.5 (p. 40)", aba: "geral", secao: "paranormais",
      categoria: "I", espacos: 0.5, consumivel: true, catalisador: true,
      escolha: { tipo: "elemento", semMedo: true, rotulo: "Elemento do catalisador" },
      resumo: "Componente alterado pela exposição paranormal, consumido ao conjurar.",
      efeitos: ["A duração do ritual dobra. Não funciona em rituais instantâneos nem sustentados."] },

    { id: "sah.paranormal.ligacao-direta-infernal", nome: "Ligação direta infernal", fonte: SAH, pagina: 44, tabela: "Tabela 1.5 (p. 40)", aba: "geral", secao: "paranormais",
      categoria: "II", espacos: 1,
      resumo: "Fios de cobre contaminados com Sangue e Energia.",
      efeitos: [
        "Ação completa para ligar um veículo automaticamente: ele ganha RD 20 (cumulativa) e imunidade a Sangue, e você +5 em Pilotagem para conduzi-lo.",
        "O veículo tenta causar o máximo de confusão: as consequências de falhas em Pilotagem são amplificadas (em geral, dobradas).",
        "Remover a ligação: ação completa.",
      ] },

    { id: "sah.paranormal.medidor-de-condicao-vertebral", nome: "Medidor de condição vertebral", fonte: SAH, pagina: 44, tabela: "Tabela 1.5 (p. 40)", aba: "geral", secao: "paranormais",
      categoria: "II", espacos: 1, vestimenta: true,
      resumo: "Coluna vertebral sustentada por Lodo de Morte e revestida de cabos de Energia.",
      efeitos: [
        "Conectá-lo à coluna do usuário: ação completa, que deixa atordoado por 1 rodada.",
        "Conta como vestimenta de +2 em Fortitude.",
        "Acende em cores conforme a saúde do usuário e pulsa lilás sob efeito paranormal; dá +5 em Medicina para ajudar o usuário.",
      ] },

    { id: "sah.paranormal.pe-de-morto", nome: "Pé de morto", fonte: SAH, pagina: 45, tabela: "Tabela 1.5 (p. 40)", aba: "geral", secao: "paranormais",
      categoria: "II", espacos: 1,
      resumo: "Botas costuradas com pele de cadáveres amaldiçoados pela Morte.",
      efeitos: ["+5 em Furtividade.", "Em cenas de furtividade, ações chamativas que envolvam só se mover aumentam a visibilidade em apenas +1."] },

    { id: "sah.paranormal.pen-drive-selado", nome: "Pen drive selado", alias: ["Pendrive selado"], fonte: SAH, pagina: 45, tabela: "Tabela 1.5 (p. 40)", aba: "geral", secao: "paranormais",
      categoria: "II", espacos: 0.5,
      resumo: "Dispositivo gravado com sigilos dourados de Conhecimento.",
      efeitos: [
        "Não pode ser invadido nem afetado por rituais, seres e efeitos de Energia.",
        "Serve para invadir outros dispositivos sem ser contaminado pela entidade.",
        "Existem HDs externos e celulares selados.",
      ],
      notas: ["A Tabela 1.5 escreve “Pendrive selado”."] },

    { id: "sah.paranormal.valete-da-salvacao", nome: "Valete da salvação", fonte: SAH, pagina: 45, tabela: "Tabela 1.5 (p. 40)", aba: "geral", secao: "paranormais",
      categoria: "I", espacos: 0.5, consumivel: true,
      resumo: "Valete de ouros pintado de dourado e coberto de sigilos de Conhecimento.",
      efeitos: ["Ação padrão para atirar a carta: ela voa em alcance médio apontando a melhor rota de fuga e deixa de existir.", "Numa perseguição, você é bem-sucedido numa ação de cortar caminho."] },

    /* --- Modificação paranormal · SAH p. 45 --- */
    { id: "sah.mod.paranormal.lente-de-revelacao", nome: "Lente de revelação", natureza: "modificacao", fonte: SAH, pagina: 45, aba: "geral",
      aplicaEm: ["camera"], semAcrescimoDeCategoria: true,
      resumo: "Modificação para câmeras de aura paranormal.",
      efeitos: [
        "A câmera mostra seres invisíveis e incorpóreos e ignora a camuflagem deles.",
        "Ação padrão e 1 PE para fotografar uma criatura em alcance curto: até o fim da cena, ela perde camuflagem e invisibilidade e fica corpórea (Vontade DT Pre evita).",
      ],
      notas: ["O SAH não diz quanto a lente aumenta a categoria da câmera. O catálogo não soma nada; a mesa ajusta, se quiser."] },

    /* =================================================================
       MALDIÇÕES — OPRPG p. 145–147
       Funcionam como modificações: a PRIMEIRA maldição de um item soma
       II à categoria, as seguintes somam I.
       ================================================================= */

    /* --- Para armas --- */
    { id: "op.maldicao.arma.antielemento", nome: "Antielemento", natureza: "maldicao", elemento: "conhecimento", fonte: OP, pagina: 145, aba: "amaldicoados", secao: "maldicoesArmas",
      aplicaEm: ["arma"],
      escolha: { tipo: "elemento", semMedo: true, rotulo: "Elemento contra o qual a arma é letal" },
      resumo: "A arma é letal contra criaturas de um elemento.",
      efeitos: ["Ao atacar uma criatura desse elemento, pode gastar 2 PE: acertando, +4d8 de dano.", "Sorteio do elemento (1d4): 1 Conhecimento, 2 Energia, 3 Morte, 4 Sangue."] },

    { id: "op.maldicao.arma.ritualistica", nome: "Ritualística", natureza: "maldicao", elemento: "conhecimento", fonte: OP, pagina: 145, aba: "amaldicoados", secao: "maldicoesArmas",
      aplicaEm: ["arma"],
      resumo: "A arma guarda um ritual para descarregar no golpe.",
      efeitos: ["Armazena um ritual de alvo ou área, pagando os PE como se o conjurasse, sem efeito na hora.", "Ao acertar um ataque, descarrega o ritual como ação livre: o alvo (ou o centro da área) é o ser atingido. Depois, outro pode ser armazenado."] },

    { id: "op.maldicao.arma.senciente", nome: "Senciente", natureza: "maldicao", elemento: "conhecimento", fonte: OP, pagina: 146, aba: "amaldicoados", secao: "maldicoesArmas",
      aplicaEm: ["arma"],
      resumo: "A arma recebe uma fagulha da sua consciência e luta sozinha.",
      efeitos: [
        "Ação de movimento e 2 PE: a arma flutua ao seu lado e, uma vez por rodada, ataca um ser em alcance curto (ou no alcance dela, o que for maior) com as estatísticas que teria na sua mão.",
        "1 PE no início de cada turno mantém o efeito; senão, ela cai. Apanhá-la no ar é uma ação de movimento; soltá-la para voltar a flutuar, ação livre.",
      ] },

    { id: "op.maldicao.arma.empuxo", nome: "Empuxo", natureza: "maldicao", elemento: "energia", fonte: OP, pagina: 146, aba: "amaldicoados", secao: "maldicoesArmas",
      aplicaEm: ["corpoACorpo"],
      resumo: "Descargas de Energia arremessam a arma e a trazem de volta.",
      efeitos: [
        "A arma pode ser arremessada em alcance curto (se já podia, o alcance sobe uma categoria) e causa +1 dado de dano do mesmo tipo quando arremessada.",
        "Depois do ataque à distância, volta voando para você no mesmo turno; pegá-la é uma reação.",
        "Só armas corpo a corpo.",
      ] },

    { id: "op.maldicao.arma.energetica", nome: "Energética", natureza: "maldicao", elemento: "energia", fonte: OP, pagina: 146, aba: "amaldicoados", secao: "maldicoesArmas",
      aplicaEm: ["arma"],
      resumo: "A arma (ou a munição) vira Energia pura por um ataque.",
      efeitos: ["2 PE por ataque: +5 no teste de ataque, ignora resistência a dano e todo o dano vira Energia.", "Armas corpo a corpo brilham como uma lâmpada; munição vira feixe de plasma."] },

    { id: "op.maldicao.arma.vibrante", nome: "Vibrante", natureza: "maldicao", elemento: "energia", fonte: OP, pagina: 146, aba: "amaldicoados", secao: "maldicoesArmas",
      aplicaEm: ["arma"],
      resumo: "Um fluxo constante de Energia faz a arma vibrar.",
      efeitos: ["Você recebe Ataque Extra (Operações Especiais, combatente); se já o tiver, o custo dele cai em 1 PE."] },

    { id: "op.maldicao.arma.consumidora", nome: "Consumidora", natureza: "maldicao", elemento: "morte", fonte: OP, pagina: 146, aba: "amaldicoados", secao: "maldicoesArmas",
      aplicaEm: ["arma"],
      resumo: "A arma drena a entropia dos seres.",
      efeitos: ["Alvos atingidos ficam lentos até o fim da cena.", "Ao atacar, 2 PE: acertando, o alvo fica imóvel por 1 rodada."] },

    { id: "op.maldicao.arma.erosiva", nome: "Erosiva", natureza: "maldicao", elemento: "morte", fonte: OP, pagina: 146, aba: "amaldicoados", secao: "maldicoesArmas",
      aplicaEm: ["arma"],
      resumo: "A arma acelera o envelhecimento dos alvos.",
      efeitos: ["+1d8 de dano de Morte.", "Ao atacar, 2 PE: acertando, a vítima sofre 2d4 de Morte no início dos turnos dela pelas próximas duas rodadas."] },

    { id: "op.maldicao.arma.repulsora", nome: "Repulsora", natureza: "maldicao", elemento: "morte", fonte: OP, pagina: 146, aba: "amaldicoados", secao: "maldicoesArmas",
      aplicaEm: ["arma"],
      resumo: "Aura de fumaça espiralada que desacelera ataques contra você.",
      efeitos: ["+2 na Defesa enquanto empunhada.", "Ao bloquear, 2 PE dão mais +5 na Defesa."] },

    { id: "op.maldicao.arma.lancinante", nome: "Lancinante", natureza: "maldicao", elemento: "sangue", fonte: OP, pagina: 146, aba: "amaldicoados", secao: "maldicoesArmas",
      aplicaEm: ["arma"],
      resumo: "A arma inflige ferimentos terríveis.",
      efeitos: ["+1d8 de dano de Sangue.", "Esse dado é multiplicado no crítico: com crítico x3, vira +3d8."] },

    { id: "op.maldicao.arma.predadora", nome: "Predadora", natureza: "maldicao", elemento: "sangue", fonte: OP, pagina: 146, aba: "amaldicoados", secao: "maldicoesArmas",
      aplicaEm: ["arma"],
      resumo: "A arma tem sede de sangue e persegue os alvos.",
      efeitos: [
        "Anula penalidades por camuflagem e cobertura (mas não cobertura total).",
        "Arma de ataque à distância: alcance sobe uma categoria.",
        "A margem de ameaça dobra, antes de qualquer aumento (um fuzil de caça predador tem margem 17).",
      ],
      calculo: { margemDobra: true, alcanceSeDistancia: 1 } },

    { id: "op.maldicao.arma.sanguinaria", nome: "Sanguinária", natureza: "maldicao", elemento: "sangue", fonte: OP, pagina: 146, aba: "amaldicoados", secao: "maldicoesArmas",
      aplicaEm: ["arma"],
      resumo: "Os ferimentos se rasgam além do ponto atingido.",
      efeitos: ["O ser atingido fica sangrando, e o sangramento acumula (atingido duas vezes, 2d6 por rodada).", "No crítico, a arma drena o sangue: o alvo fica fraco e você ganha 2d10 PV temporários."] },

    /* --- Para proteções --- */
    { id: "op.maldicao.protecao.abascanta", nome: "Abascanta", natureza: "maldicao", elemento: "conhecimento", fonte: OP, pagina: 146, aba: "amaldicoados", secao: "maldicoesProtecoes",
      aplicaEm: ["protecao"],
      resumo: "A proteção repele rituais.",
      efeitos: ["+5 em testes de resistência contra rituais.", "Uma vez por cena, alvo de um ritual: reação e PE igual ao custo dele para refleti-lo ao conjurador (você toma as decisões do ritual)."] },

    { id: "op.maldicao.protecao.profetica", nome: "Profética", natureza: "maldicao", elemento: "conhecimento", fonte: OP, pagina: 146, aba: "amaldicoados", secao: "maldicoesProtecoes",
      aplicaEm: ["protecao"],
      resumo: "Vislumbres de um futuro imediato possível.",
      efeitos: ["Resistência a Conhecimento 10.", "2 PE para rolar de novo um teste de resistência, uma vez."] },

    { id: "op.maldicao.protecao.sombria", nome: "Sombria", natureza: "maldicao", elemento: "conhecimento", fonte: OP, pagina: 147, aba: "amaldicoados", secao: "maldicoesProtecoes",
      aplicaEm: ["protecao"],
      resumo: "A proteção confunde os sentidos.",
      efeitos: ["+5 em Furtividade, e ignora a penalidade de carga nessa perícia.", "Ação de movimento e 1 PE: parece uma roupa comum, mantendo todas as propriedades."] },

    { id: "op.maldicao.protecao.cinetica", nome: "Cinética", natureza: "maldicao", elemento: "energia", fonte: OP, pagina: 147, aba: "amaldicoados", secao: "maldicoesProtecoes",
      aplicaEm: ["protecao"],
      resumo: "Barreira invisível que desvia ataques.",
      efeitos: ["+2 na Defesa.", "Resistência a dano 2 (proteção leve ou escudo) ou 5 (proteção pesada)."],
      calculo: { defesa: 2 } },

    { id: "op.maldicao.protecao.lepida", nome: "Lépida", natureza: "maldicao", elemento: "energia", fonte: OP, pagina: 147, aba: "amaldicoados", secao: "maldicoesProtecoes",
      aplicaEm: ["protecao"],
      resumo: "A proteção amplifica a mobilidade.",
      efeitos: ["+10 em Atletismo e +3 m de deslocamento.", "2 PE: até o fim do turno, ignora terreno difícil, escala com o deslocamento terrestre e fica imune a dano de queda de até 9 m."] },

    { id: "op.maldicao.protecao.voltaica", nome: "Voltaica", natureza: "maldicao", elemento: "energia", fonte: OP, pagina: 147, aba: "amaldicoados", secao: "maldicoesProtecoes",
      aplicaEm: ["protecao"],
      resumo: "A proteção emite arcos de Energia.",
      efeitos: ["Resistência a Energia 10.", "Ação de movimento e 2 PE: até o fim da cena, no fim de cada turno seu, 2d6 de Energia em todos os seres adjacentes."] },

    { id: "op.maldicao.protecao.letargica", nome: "Letárgica", natureza: "maldicao", elemento: "morte", fonte: OP, pagina: 147, aba: "amaldicoados", secao: "maldicoesProtecoes",
      aplicaEm: ["protecao"],
      resumo: "A proteção desacelera ataques perigosos.",
      efeitos: ["+2 na Defesa.", "25% (proteção leve ou escudo) ou 50% (pesada) de chance de ignorar o dano extra de acertos críticos e ataques furtivos."],
      calculo: { defesa: 2 } },

    { id: "op.maldicao.protecao.repulsiva", nome: "Repulsiva", natureza: "maldicao", elemento: "morte", fonte: OP, pagina: 147, aba: "amaldicoados", secao: "maldicoesProtecoes",
      aplicaEm: ["protecao"],
      resumo: "Camada de lodo preto sobre o corpo.",
      efeitos: ["Resistência a Morte 10.", "Ação de movimento e 2 PE: até o fim da cena, quem ataca você corpo a corpo sofre 2d8 de Morte."] },

    { id: "op.maldicao.protecao.regenerativa", nome: "Regenerativa", natureza: "maldicao", elemento: "sangue", fonte: OP, pagina: 147, aba: "amaldicoados", secao: "maldicoesProtecoes",
      aplicaEm: ["protecao"],
      resumo: "Melhora a resistência e a regeneração.",
      efeitos: ["Resistência a Sangue 10.", "Ação de movimento e 1 PE: recupera 1d12 PV."] },

    { id: "op.maldicao.protecao.sadica", nome: "Sádica", natureza: "maldicao", elemento: "sangue", fonte: OP, pagina: 147, aba: "amaldicoados", secao: "maldicoesProtecoes",
      aplicaEm: ["protecao"],
      resumo: "A dor sofrida vira fúria.",
      efeitos: ["No início do turno, +1 em testes de ataque e rolagens de dano para cada 10 pontos de dano sofridos desde o fim do seu último turno (45 de dano: +4)."] },

    /* --- Para acessórios (utensílios e vestuários) --- */
    { id: "op.maldicao.acessorio.carisma", nome: "Carisma", natureza: "maldicao", elemento: "conhecimento", fonte: OP, pagina: 147, aba: "amaldicoados", secao: "maldicoesAcessorios",
      aplicaEm: ["utensilio", "vestimenta"],
      resumo: "Aura que deixa você mais carismático e autoconfiante.",
      efeitos: ["+1 em Presença (sem PE adicionais)."] },

    { id: "op.maldicao.acessorio.conjuracao", nome: "Conjuração", natureza: "maldicao", elemento: "conhecimento", fonte: OP, pagina: 147, aba: "amaldicoados", secao: "maldicoesAcessorios",
      aplicaEm: ["utensilio", "vestimenta"],
      escolha: { tipo: "texto", rotulo: "Ritual de 1º círculo", opcional: true },
      resumo: "O acessório guarda um ritual de 1º círculo.",
      efeitos: ["Empunhando o item, conjura o ritual como se o conhecesse.", "Se já conhece o ritual, o custo dele diminui em 1 PE."] },

    { id: "op.maldicao.acessorio.escudo-mental", nome: "Escudo mental", natureza: "maldicao", elemento: "conhecimento", fonte: OP, pagina: 147, aba: "amaldicoados", secao: "maldicoesAcessorios",
      aplicaEm: ["utensilio", "vestimenta"],
      resumo: "Barreira psíquica.",
      efeitos: ["Resistência mental 10."] },

    { id: "op.maldicao.acessorio.reflexao", nome: "Reflexão", natureza: "maldicao", elemento: "conhecimento", fonte: OP, pagina: 147, aba: "amaldicoados", secao: "maldicoesAcessorios",
      aplicaEm: ["utensilio", "vestimenta"],
      resumo: "Devolve rituais ao conjurador.",
      efeitos: ["Uma vez por rodada, alvo de um ritual: PE igual ao custo dele para refleti-lo ao conjurador (você toma as decisões do ritual)."] },

    { id: "op.maldicao.acessorio.sagacidade", nome: "Sagacidade", natureza: "maldicao", elemento: "conhecimento", fonte: OP, pagina: 147, aba: "amaldicoados", secao: "maldicoesAcessorios",
      aplicaEm: ["utensilio", "vestimenta"],
      resumo: "A mente acelerada pelas forças do Conhecimento.",
      efeitos: ["+1 em Intelecto (sem perícias treinadas adicionais)."] },

    { id: "op.maldicao.acessorio.defesa", nome: "Defesa", natureza: "maldicao", elemento: "energia", fonte: OP, pagina: 147, aba: "amaldicoados", secao: "maldicoesAcessorios",
      aplicaEm: ["utensilio", "vestimenta"],
      resumo: "Barreira de energia invisível.",
      efeitos: ["+5 na Defesa."] },

    { id: "op.maldicao.acessorio.destreza", nome: "Destreza", natureza: "maldicao", elemento: "energia", fonte: OP, pagina: 147, aba: "amaldicoados", secao: "maldicoesAcessorios",
      aplicaEm: ["utensilio", "vestimenta"],
      resumo: "Aprimora coordenação e velocidade.",
      efeitos: ["+1 em Agilidade."] },

    { id: "op.maldicao.acessorio.potencia", nome: "Potência", natureza: "maldicao", elemento: "energia", fonte: OP, pagina: 147, aba: "amaldicoados", secao: "maldicoesAcessorios",
      aplicaEm: ["utensilio", "vestimenta"],
      resumo: "Fortalece suas habilidades.",
      efeitos: ["+1 na DT contra suas habilidades e rituais."],
      notas: ["O texto do livro diz “magias e habilidades”."] },

    { id: "op.maldicao.acessorio.esforco-adicional", nome: "Esforço adicional", natureza: "maldicao", elemento: "morte", fonte: OP, pagina: 147, aba: "amaldicoados", secao: "maldicoesAcessorios",
      aplicaEm: ["utensilio", "vestimenta"],
      resumo: "Reserva de esforço emprestada da Morte.",
      efeitos: ["+5 PE.", "Só começa a valer depois de um dia de uso."] },

    { id: "op.maldicao.acessorio.disposicao", nome: "Disposição", natureza: "maldicao", elemento: "sangue", fonte: OP, pagina: 147, aba: "amaldicoados", secao: "maldicoesAcessorios",
      aplicaEm: ["utensilio", "vestimenta"],
      resumo: "O vigor do Sangue.",
      efeitos: ["+1 em Vigor."] },

    { id: "op.maldicao.acessorio.pujanca", nome: "Pujança", natureza: "maldicao", elemento: "sangue", fonte: OP, pagina: 147, aba: "amaldicoados", secao: "maldicoesAcessorios",
      aplicaEm: ["utensilio", "vestimenta"],
      resumo: "Aumenta a potência muscular.",
      efeitos: ["+1 em Força."] },

    { id: "op.maldicao.acessorio.vitalidade", nome: "Vitalidade", natureza: "maldicao", elemento: "sangue", fonte: OP, pagina: 147, aba: "amaldicoados", secao: "maldicoesAcessorios",
      aplicaEm: ["utensilio", "vestimenta"],
      resumo: "Reserva de vida do Sangue.",
      efeitos: ["+15 PV.", "Só começa a valer depois de um dia de uso."] },

    { id: "op.maldicao.acessorio.protecao-elemental", nome: "Proteção elemental", natureza: "maldicao", elemento: "varia", fonte: OP, pagina: 147, aba: "amaldicoados", secao: "maldicoesAcessorios",
      aplicaEm: ["utensilio", "vestimenta"],
      escolha: { tipo: "elemento", rotulo: "Elemento contra o qual protege", defineElemento: true },
      resumo: "Resistência contra um elemento.",
      efeitos: ["Resistência 10 contra um elemento.", "O acessório conta como item do elemento contra o qual protege."] },

    /* =================================================================
       ITENS AMALDIÇOADOS ESPECIAIS — OPRPG p. 148–151
       Salvo indicação, categoria II e 1 espaço (p. 148); para PV e
       preço, contam como tendo uma maldição.
       ================================================================= */

    /* --- Sangue --- */
    { id: "op.amaldicoado.coracao-pulsante", nome: "Coração pulsante", elemento: "sangue", fonte: OP, pagina: 148, aba: "amaldicoados", secao: "especiais",
      categoria: "II", espacos: 1,
      resumo: "Coração humano banhado em sangue que continua pulsando.",
      efeitos: [
        "Empunhando-o, ao sofrer dano: reação para espremê-lo e reduzir o dano à metade.",
        "A cada uso, Fortitude DT 15 (+5 por uso adicional no mesmo dia); falhando, o item é destruído.",
        "O compartimento onde ele fica precisa ser drenado uma vez por dia, ou o Sangue escorre e danifica outros objetos.",
      ] },

    { id: "op.amaldicoado.coroa-de-espinhos", nome: "Coroa de espinhos", elemento: "sangue", fonte: OP, pagina: 148, aba: "amaldicoados", secao: "especiais",
      categoria: "II", espacos: 1,
      resumo: "Coroa, colar ou pulseira de espinhos de roseira banhados em sangue.",
      efeitos: ["Uma vez por rodada, reação para transformar dano mental que sofreria em dano de Sangue.", "Enquanto a veste, não recupera Sanidade por descanso.", "Precisa ser vestida por uma semana para funcionar."] },

    { id: "op.amaldicoado.frasco-de-vitalidade", nome: "Frasco de vitalidade", elemento: "sangue", fonte: OP, pagina: 148, aba: "amaldicoados", secao: "especiais",
      categoria: "II", espacos: 1,
      resumo: "Recipiente de vidro com tampa gravada com um selo de Sangue.",
      efeitos: ["1 minuto e até 20 de dano sofrido para enchê-lo com o próprio sangue, que se mantém fresco.", "Ação padrão para beber: recupera os PV armazenados (Fortitude DT 20 ou enjoado por 1 rodada)."] },

    { id: "op.amaldicoado.perola-de-sangue", nome: "Pérola de sangue", elemento: "sangue", fonte: OP, pagina: 148, aba: "amaldicoados", secao: "especiais",
      categoria: "II", espacos: 1, consumivel: true,
      resumo: "Esfera vermelho-viva de 2 cm, lisa como uma pérola.",
      efeitos: [
        "Ação de movimento para absorvê-la pela pele: +5 em testes de Agilidade, Força e Vigor (e baseados neles) até o fim da cena.",
        "No fim da cena, Fortitude DT 20: falhando, fatigado até o fim do dia; falhando por 5 ou mais, parada cardíaca (morrendo).",
        "Quem morre assim vira uma criatura de Sangue de VD parecido com o NEX.",
      ] },

    { id: "op.amaldicoado.punhos-enraivecidos", nome: "Punhos enraivecidos", elemento: "sangue", fonte: OP, pagina: 148, aba: "amaldicoados", secao: "especiais",
      categoria: "II", espacos: 1,
      arma: { proficiencia: null, tipo: "corpoACorpo", empunhadura: "leve", dano: "1d8", critico: "", alcance: "", tipoDano: "Sangue", desarmado: true },
      resumo: "Soqueiras de metal vermelho-vivo gravadas com símbolos de Sangue.",
      efeitos: [
        "Seus ataques desarmados causam 1d8 de dano de Sangue.",
        "Ao acertar um ataque desarmado, pode atacar de novo o mesmo alvo pagando 2 PE por ataque já feito no turno (2, depois 4, e assim por diante), até errar ou ficar sem PE.",
      ],
      notas: ["O livro não dá margem nem multiplicador: vale a regra geral de crítico (20, x2). Como ataque desarmado, é corpo a corpo leve."] },

    { id: "op.amaldicoado.seringa-de-transfiguracao", nome: "Seringa de transfiguração", elemento: "sangue", fonte: OP, pagina: 148, aba: "amaldicoados", secao: "especiais",
      categoria: "II", espacos: 1,
      resumo: "Seringa de aparência orgânica, cheia de veias pulsantes.",
      efeitos: [
        "Ação padrão para sugar sangue de um alvo adjacente (acertando um ataque corpo a corpo, se ele não quiser).",
        "Ação padrão para injetar noutra pessoa adjacente: ela assume a aparência do dono do sangue, como Distorcer Aparência durando um dia.",
        "Quando o efeito acaba, ela rola 1d6: com 1, perde 1 PV permanentemente.",
      ] },

    /* --- Morte --- */
    { id: "op.amaldicoado.amarras-mortais", nome: "Amarras mortais", elemento: "morte", fonte: OP, pagina: 148, aba: "amaldicoados", secao: "especiais",
      categoria: "II", espacos: 1,
      resumo: "Correntes de ferro negro que se enrolam nos antebraços.",
      efeitos: ["Uma vez por rodada, ação padrão e 2 PE: agarrar um alvo Grande ou menor em alcance curto, com +10 no teste oposto.", "Ação de movimento para puxar um alvo agarrado para junto de você."] },

    { id: "op.amaldicoado.casaco-de-lodo", nome: "Casaco de lodo", elemento: "morte", fonte: OP, pagina: 149, aba: "amaldicoados", secao: "especiais",
      categoria: "II", espacos: 1, vestimenta: true,
      resumo: "Sobretudo preto fosco feito de Lodo ativo, que absorve a luz.",
      efeitos: ["Resistência a corte, impacto, Morte e perfuração 5.", "Vulnerabilidade a dano balístico e de Energia."] },

    { id: "op.amaldicoado.coletora", nome: "Coletora", elemento: "morte", fonte: OP, pagina: 149, aba: "amaldicoados", secao: "especiais",
      categoria: "II", espacos: 1,
      resumo: "Punhal de lâmina totalmente negra e empunhadura em espiral.",
      efeitos: [
        "Ação completa para apunhalar alguém que esteja morrendo: o alvo morre e o punhal armazena 1d8 PE (máximo de 20).",
        "Os PE armazenados podem ser usados como seus, depois de portá-lo por uma semana.",
        "Enquanto o porta, pesadelos deixam seu descanso sempre em condições ruins.",
      ],
      notas: ["O livro não repete as estatísticas de arma; como punhal, a mesa pode usar as do Punhal (OPRPG p. 56)."] },

    { id: "op.amaldicoado.cranio-espiral", nome: "Crânio espiral", elemento: "morte", fonte: OP, pagina: 149, aba: "amaldicoados", secao: "especiais",
      categoria: "II", espacos: 1,
      resumo: "Crânio distorcido em espiral que chora Lodo.",
      efeitos: ["Empunhado, uma vez por rodada, ação livre para ativá-lo: +1 ação padrão na rodada.", "A cada uso, Vontade DT 15 (+5 por uso adicional no dia); falhando, recebe o benefício mas envelhece 1d4 anos e não pode usá-lo de novo no dia."] },

    { id: "op.amaldicoado.frasco-de-lodo", nome: "Frasco de lodo", elemento: "morte", fonte: OP, pagina: 149, aba: "amaldicoados", secao: "especiais",
      categoria: "II", espacos: 1, consumivel: true,
      resumo: "Frasco pequeno com lodo de Morte, para uma única aplicação.",
      efeitos: ["Ação padrão num ferimento sofrido até uma rodada atrás: recupera 6d8+20 PV.", "Ferimento mais antigo: role um dado — par recupera 3d8+10 PV; ímpar infecciona e causa 3d8+10 de dano de Morte."] },

    { id: "op.amaldicoado.vislumbre-do-fim", nome: "Vislumbre do fim", elemento: "morte", fonte: OP, pagina: 149, aba: "amaldicoados", secao: "especiais",
      categoria: "II", espacos: 1,
      resumo: "Óculos escuros com símbolos e espirais na armação.",
      efeitos: ["Ação de movimento para se concentrar num ser que esteja vendo e ver a morte dele.", "Pessoa comum: um contador de tempo, que muda com as ações de um marcado. Marcados e criaturas: a pior resistência (Fortitude, Reflexos ou Vontade) e as vulnerabilidades."] },

    /* --- Conhecimento --- */
    { id: "op.amaldicoado.aneis-do-elo-mental", nome: "Anéis do elo mental", elemento: "conhecimento", fonte: OP, pagina: 149, aba: "amaldicoados", secao: "especiais",
      categoria: "II", espacos: 1,
      resumo: "Par de anéis dourados com os símbolos do ritual Ligação Telepática.",
      efeitos: [
        "Usados por duas pessoas por 24 h, ligam as duas como Invadir Mente (ligação telepática) enquanto os usarem.",
        "As duas fazem testes de Vontade com a melhor quantidade de dados e bônus entre elas.",
        "Todo dano mental e toda condição mental ou de medo de uma também afeta a outra.",
      ] },

    { id: "op.amaldicoado.lanterna-reveladora", nome: "Lanterna reveladora", elemento: "conhecimento", fonte: OP, pagina: 149, aba: "amaldicoados", secao: "especiais",
      categoria: "II", espacos: 1,
      resumo: "Lanterna dourada decorada com sigilos do Outro Lado.",
      efeitos: ["Ação padrão e 1 PE: luz por uma cena com as propriedades do ritual Terceiro Olho.", "Criaturas de Sangue iluminadas por ela passam a atacar você antes de outros alvos na mesma categoria de alcance."] },

    { id: "op.amaldicoado.mascara-das-pessoas-nas-sombras", nome: "Máscara das pessoas nas sombras", elemento: "conhecimento", fonte: OP, pagina: 149, aba: "amaldicoados", secao: "especiais",
      categoria: "II", espacos: 1,
      resumo: "Ferramenta e marca registrada da Seita das Máscaras.",
      efeitos: ["Resistência a Conhecimento 10.", "Ação de movimento e 2 PE: entra numa sombra adjacente e sai noutra que possa ver em alcance médio.", "Vesti-la é como assinar um acordo: pode despertar o interesse da mente única das Máscaras."] },

    { id: "op.amaldicoado.municao-jurada", nome: "Munição jurada", elemento: "conhecimento", fonte: OP, pagina: 150, aba: "amaldicoados", secao: "especiais",
      categoria: "II", espacos: 1,
      resumo: "Bala de arma de fogo com um sigilo gravado.",
      efeitos: [
        "Ritual de uma hora vincula a bala a um ser conhecido.",
        "Contra esse ser: +10 no teste de ataque, margem de ameaça da arma dobrada e +6d12 de dano de Conhecimento.",
        "Portá-la deixa você obcecado pelo alvo: −2 na Defesa e nos ataques contra qualquer outro alvo.",
      ] },

    { id: "op.amaldicoado.pergaminho-da-pertinacia", nome: "Pergaminho da pertinácia", elemento: "conhecimento", fonte: OP, pagina: 150, aba: "amaldicoados", secao: "especiais",
      categoria: "II", espacos: 1,
      resumo: "Pergaminho amarelado com sigilos dourados no interior.",
      efeitos: ["Ação padrão encarando os sigilos: 5 PE temporários até o fim da cena.", "A cada uso, Ocultismo DT 15 (+5 por uso adicional no dia); falhando, o pergaminho se desfaz."] },

    /* --- Energia --- */
    { id: "op.amaldicoado.arcabuz-dos-moretti", nome: "Arcabuz dos Moretti", elemento: "energia", fonte: OP, pagina: 150, aba: "amaldicoados", secao: "especiais",
      categoria: "II", espacos: 1,
      arma: { proficiencia: "simples", tipo: "fogo", empunhadura: "umaMao", dano: "", danoPorD6: ["2d4", "2d6", "2d8", "2d10", "2d12", "2d20"], critico: "x3", alcance: "curto", tipoDano: "", bonusAtaque: 2, semMunicao: true },
      resumo: "Arma do século XV, rachada e brilhando rosado por dentro, com um selo “M” no cabo.",
      efeitos: [
        "Arma simples, de fogo e de uma mão: +2 nos testes de ataque, alcance curto, crítico x3.",
        "Não precisa de munição.",
        "A cada disparo, role 1d6 com o ataque para o dano: 1) 2d4, 2) 2d6, 3) 2d8, 4) 2d10, 5) 2d12, 6) 2d20.",
      ] },

    { id: "op.amaldicoado.bateria-reversa", nome: "Bateria reversa", elemento: "energia", fonte: OP, pagina: 150, aba: "amaldicoados", secao: "especiais",
      categoria: "II", espacos: 1,
      resumo: "Pequena bateria elétrica repleta de sigilos.",
      efeitos: [
        "Ação padrão e 2 PE: absorve a carga de um dispositivo eletrônico em alcance curto, que descarrega.",
        "Cheia, ação padrão para transferir a carga a um dispositivo descarregado em alcance curto.",
        "A cada uso, Ocultismo DT 15 (+5 por uso adicional no dia); falhando, explode: 12d6 de Energia em todos a até 3 m.",
      ] },

    { id: "op.amaldicoado.peitoral-da-segunda-chance", nome: "Peitoral da segunda chance", elemento: "energia", fonte: OP, pagina: 150, aba: "amaldicoados", secao: "especiais",
      categoria: "II", espacos: 1,
      resumo: "Colete pequeno com uma peça eletrônica sobre o coração.",
      efeitos: [
        "Reduzido a 0 PV, o colete gasta 5 PE seus para reanimar você com 4d10 PV (sem PE suficiente, falha).",
        "A cada ativação, chance de 1 em 1d10 de a descarga matar você na hora, transformando corpo e equipamento (menos o colete) em plasma.",
      ] },

    { id: "op.amaldicoado.relogio-de-arnaldo", nome: "Relógio de Arnaldo", elemento: "energia", fonte: OP, pagina: 150, aba: "amaldicoados", secao: "especiais",
      categoria: "II", espacos: 1,
      resumo: "Relógio de ouro chamuscado com uma foto antiga por dentro.",
      efeitos: ["Uma vez por rodada, 1 PE para rolar de novo qualquer dado que caiu 1.", "O custo sobe +1 a cada ativação no mesmo dia."] },

    { id: "op.amaldicoado.talisma-da-sorte", nome: "Talismã da sorte", elemento: "energia", fonte: OP, pagina: 150, aba: "amaldicoados", secao: "especiais",
      categoria: "II", espacos: 1,
      resumo: "Figa, moeda, pé de coelho ou outro badulaque modificado por um ritual.",
      efeitos: ["Vestindo-o, ao sofrer dano: reação e 3 PE para rolar 1d4.", "2 ou 3: evita todo o dano. 4: evita, mas o talismã vira cinzas. 1: sofre o dobro do dano e o talismã vira cinzas."] },

    { id: "op.amaldicoado.teclado-de-conexao-neural", nome: "Teclado de conexão neural", elemento: "energia", fonte: OP, pagina: 150, aba: "amaldicoados", secao: "especiais",
      categoria: "II", espacos: 1,
      resumo: "Teclado USB coberto de glifos de Energia.",
      efeitos: ["Plugá-lo num computador é uma ação de movimento: usa a máquina sem impedimento tecnológico ou de idioma, +10 em testes para hackear e metade do tempo para localizar arquivos.", "Sofre 1d6 de dano mental por rodada de uso."] },

    { id: "op.amaldicoado.tela-do-pesadelo", nome: "Tela do pesadelo", elemento: "energia", fonte: OP, pagina: 151, aba: "amaldicoados", secao: "especiais",
      categoria: "II", espacos: 1,
      resumo: "Celular, tablet ou TV com sigilos minúsculos nas bordas.",
      efeitos: [
        "Ação padrão e 2 PE: a próxima pessoa a tocar a tela vê uma ilusão horrível avançar contra ela.",
        "Vontade (DT do usuário +5): falhando, fica atordoada, sofre 4d6 de dano mental e repete o teste na rodada seguinte, até passar ou enlouquecer.",
        "Depois do efeito, a tela fica inerte até ser ativada de novo.",
      ] },

    { id: "op.amaldicoado.veiculo-energizado", nome: "Veículo energizado", elemento: "energia", fonte: OP, pagina: 151, aba: "amaldicoados", secao: "especiais",
      categoria: "II", espacos: 1,
      resumo: "Veículo com motor modificado paranormalmente, que não precisa de combustível.",
      efeitos: ["O motorista pode gastar uma reação e passar em Pilotagem DT 25 para o carro e os ocupantes virarem energia por um instante e atravessarem um objeto com que colidiriam."],
      notas: ["A regra geral dos itens especiais (p. 148) dá 1 espaço; um veículo não é carregado no inventário, então a mesa pode zerar os espaços."] },

    /* --- Medo --- */
    { id: "op.amaldicoado.jaqueta-de-verissimo", nome: "Jaqueta de Veríssimo", elemento: "medo", fonte: OP, pagina: 151, aba: "amaldicoados", secao: "especiais",
      categoria: "IV", espacos: 1, unico: true,
      resumo: "Jaqueta de aviador de couro marrom, passada de agente para agente ao longo de muitas batalhas.",
      efeitos: ["Resistência a dano paranormal 15.", "Quando um aliado adjacente for sofrer dano, reação e 2 PE para receber o dano no lugar dele.", "Item único: só um agente pode escolhê-la."] },

    /* --- Varia --- */
    { id: "op.amaldicoado.dedo-decepado", nome: "Dedo decepado", elemento: "varia", fonte: OP, pagina: 151, aba: "amaldicoados", secao: "especiais",
      categoria: "II", espacos: 1,
      escolha: { tipo: "texto", rotulo: "Poder paranormal do dono do dedo", opcional: true },
      resumo: "Dedo seco de alguém com alto nível de exposição paranormal.",
      efeitos: [
        "Você recebe um poder paranormal que o dono do dedo tinha; o elemento do poder é o da maldição.",
        "Ao dormir ou relaxar no interlúdio, role 1d4: com 1, não recupera PV, PE nem Sanidade.",
        "Ser visto com ele dá −10 em Diplomacia e pode causar reações severas.",
        "Precisa ser vestido por uma semana para funcionar.",
      ] },

    { id: "op.amaldicoado.selos-paranormais", nome: "Selo paranormal", alias: ["Selos paranormais"], elemento: "varia", fonte: OP, pagina: 151, aba: "amaldicoados", secao: "especiais",
      categoria: null, espacos: 1, consumivel: true,
      escolha: { tipo: "circulo", rotulo: "Círculo do ritual do selo" },
      resumo: "Sigilos gravados num objeto pequeno — pergaminho, moeda, pedra, osso — com um ritual.",
      efeitos: [
        "Ativar: empunhá-lo e ler em voz alta (ação padrão ou a do ritual, a maior).",
        "Precisa conhecer o ritual ou passar em Ocultismo (DT 20 + custo em PE do ritual).",
        "O ritual é conjurado sem componentes e o selo vira cinzas; valem O Custo do Paranormal e Invocando o Medo (p. 121).",
        "Conhecendo o ritual, aplica suas habilidades de ritual e pode usar versões avançadas pagando só o custo adicional.",
        "A categoria é igual ao círculo do ritual (1º círculo: I; 2º: II…).",
      ] },

    /* =================================================================
       NOVOS ITENS AMALDIÇOADOS — SAH p. 57–61 (Tabela 1.6, p. 58)
       ================================================================= */

    { id: "sah.amaldicoado.conector-de-membros", nome: "Conector de membros", elemento: "sangue", fonte: SAH, pagina: 57, tabela: "Tabela 1.6 (p. 58)", aba: "amaldicoados", secao: "especiais",
      categoria: "III", espacos: 1,
      resumo: "Dois anéis metálicos com símbolos de Sangue, unidos por uma sanfona de tecido humano.",
      efeitos: [
        "Ação padrão para religar braço, perna ou cabeça decepados há até três rodadas; não cura PV, mas tira o alvo de morrendo ou morto (fica inconsciente com 1 PV).",
        "Removido o conector, a parte cai de novo e não pode mais ser religada por ele.",
        "25% de chance de a parte ganhar vida própria: perna deixa lento; braço dá −1 dado nos testes com ele; cabeça dá 25% de ficar confuso no início de cada cena tensa.",
      ] },

    { id: "sah.amaldicoado.dose-da-praga", nome: "Dose d’A Praga", alias: ["Dose da Praga"], elemento: "sangue", fonte: SAH, pagina: 57, tabela: "Tabela 1.6 (p. 58)", aba: "amaldicoados", secao: "especiais",
      categoria: "III", espacos: 1, consumivel: true,
      resumo: "Frasco reforçado com um líquido vermelho que se debate contra o vidro.",
      efeitos: [
        "Ação padrão: você ou um ser adjacente fica sob Arma de Sangue, Sangue de Ferro e Sangue Vivo até o fim da cena.",
        "No fim, Fortitude (DT 20 + 5 por dose anterior desde o último interlúdio): falhando, 2d4 de dano mental, mantém os poderes por mais uma cena e fica sob Ódio Incontrolável.",
      ] },

    { id: "sah.amaldicoado.mandibula-agonizante", nome: "Mandíbula agonizante", elemento: "sangue", fonte: SAH, pagina: 57, tabela: "Tabela 1.6 (p. 58)", aba: "amaldicoados", secao: "especiais",
      categoria: "II", espacos: 1,
      resumo: "Parte inferior de um crânio, com músculos e símbolos de sangue, que geme sem parar.",
      efeitos: [
        "Ação padrão para pressioná-la e arremessá-la a um ponto em alcance médio: grita alto e encobre qualquer som num raio de 30 m até o fim da cena.",
        "Numa cena de furtividade, você passa automaticamente num teste para distrair.",
        "Criaturas de Sangue precisam passar em Vontade DT 35 para não ir até ela e devorá-la.",
        "Depois da cena, precisa descansar por uma cena antes de ser usada de novo.",
      ] },

    { id: "sah.amaldicoado.retalho-tenebroso", nome: "Retalho tenebroso", elemento: "sangue", fonte: SAH, pagina: 57, tabela: "Tabela 1.6 (p. 58)", aba: "amaldicoados", secao: "especiais",
      categoria: "II", espacos: 1,
      resumo: "Pedaço retangular de carne com pele e pelos bestiais.",
      efeitos: [
        "Ação padrão para aplicá-lo no rosto: faro e visão no escuro, mas vulnerabilidade a Morte e −2 dados em perícias de interação social.",
        "+1 cumulativo nas rolagens de dano por dia seguido com ele.",
        "No fim de cada dia, perde 1d6 PV (Fortitude DT 15, +5 por teste seguido, evita); essa perda só é recuperada depois de removê-lo.",
        "Remover: ação padrão e o mesmo teste (falhando, perde 1d6 PV). Solta-se sozinho se o portador morrer.",
      ] },

    { id: "sah.amaldicoado.ampulheta-do-tempo-sofrido", nome: "Ampulheta do tempo sofrido", elemento: "morte", fonte: SAH, pagina: 58, tabela: "Tabela 1.6 (p. 58)", aba: "amaldicoados", secao: "especiais",
      categoria: "II", espacos: 1,
      resumo: "Ampulheta de madeira com areia negra de formas humanoides desesperadas.",
      efeitos: ["Empunhada, 5 PE para receber na hora os benefícios de uma ação de interlúdio à escolha.", "Só volta a funcionar depois que você gastar uma ação de interlúdio devolvendo o tempo emprestado."] },

    { id: "sah.amaldicoado.injecao-de-lodo", nome: "Injeção de Lodo", elemento: "morte", fonte: SAH, pagina: 59, tabela: "Tabela 1.6 (p. 58)", aba: "amaldicoados", secao: "especiais",
      categoria: "II", espacos: 0.5, consumivel: true,
      resumo: "Seringa de bronze enferrujado cheia de Lodo preto.",
      efeitos: ["Ação padrão para injetar em você ou num ser adjacente voluntário.", "Até o fim da cena: vulnerabilidade a balístico e Energia; na próxima vez que chegaria a 0 PV nessa cena, fica com 1 PV."] },

    { id: "sah.amaldicoado.instantaneo-mortal", nome: "Instantâneo mortal", elemento: "morte", fonte: SAH, pagina: 59, tabela: "Tabela 1.6 (p. 58)", aba: "amaldicoados", secao: "especiais",
      categoria: "II", espacos: 0.5,
      resumo: "Fotografia dos últimos momentos de alguém antes de morrer.",
      efeitos: ["Empunhando-o num teste para procurar pistas com perícia ligada à morte retratada, 1 PE: a imagem aponta uma direção útil (+1 dado no teste).", "O mestre decide quais perícias se relacionam a cada instantâneo."] },

    { id: "sah.amaldicoado.projetil-de-lodo-curto", nome: "Projétil de Lodo, curto", elemento: "morte", fonte: SAH, pagina: 59, tabela: "Tabela 1.6 (p. 58)", aba: "amaldicoados", secao: "especiais",
      categoria: "I", espacos: 1, municaoAmaldicoada: true,
      resumo: "Munição fundida com Lodo, que carrega a Morte consigo.",
      efeitos: ["Usá-la converte todo o dano da arma em Morte.", "No fim da cena, a arma se degrada até se desfazer."] },

    { id: "sah.amaldicoado.projetil-de-lodo-longo", nome: "Projétil de Lodo, longo", elemento: "morte", fonte: SAH, pagina: 59, tabela: "Tabela 1.6 (p. 58)", aba: "amaldicoados", secao: "especiais",
      categoria: "II", espacos: 1, municaoAmaldicoada: true,
      resumo: "Munição fundida com Lodo, que carrega a Morte consigo.",
      efeitos: ["Usá-la converte todo o dano da arma em Morte.", "No fim da cena, a arma se degrada até se desfazer."] },

    { id: "sah.amaldicoado.radio-chiador", nome: "Rádio chiador", elemento: "morte", fonte: SAH, pagina: 59, tabela: "Tabela 1.6 (p. 58)", aba: "amaldicoados", secao: "especiais",
      categoria: "II", espacos: 1,
      resumo: "Rádio gravador de bolso empoeirado que já captou muitas vidas se esvaindo.",
      efeitos: [
        "Ligado, chia se houver criatura paranormal em alcance extremo — mais alto quanto mais perto, o que indica direção e alcance aproximados.",
        "Criaturas paranormais tendem a ser atraídas pelo chiado.",
        "As pilhas duram doze horas e viram Lodo. As funções normais de rádio não funcionam.",
      ] },

    { id: "sah.amaldicoado.camera-obscura", nome: "Câmera obscura", elemento: "conhecimento", fonte: SAH, pagina: 59, tabela: "Tabela 1.6 (p. 58)", aba: "amaldicoados", secao: "especiais",
      categoria: "III", espacos: 1,
      resumo: "Uma das mais antigas câmeras de aura paranormal, uma Polaroid Model 95.",
      efeitos: [
        "Tem a modificação lente de revelação, com +10 na DT para resistir.",
        "Criatura com invisibilidade, incorporeidade ou camuflagem que falha também sofre 6d6 de dano de frio.",
      ] },

    { id: "sah.amaldicoado.enxame-fantasmagorico", nome: "Enxame fantasmagórico", elemento: "conhecimento", fonte: SAH, pagina: 60, tabela: "Tabela 1.6 (p. 58)", aba: "amaldicoados", secao: "especiais",
      categoria: "III", espacos: 1, vestimenta: true,
      resumo: "Manto quase invisível tecido de traças e mariposas esbranquiçadas.",
      efeitos: ["Vestido, deixa o usuário invisível (p. 125).", "No início de cada turno vestindo-o, 1 de dano mental, que ignora qualquer resistência."] },

    { id: "sah.amaldicoado.repositorio-do-fracasso", nome: "Repositório do fracasso", elemento: "conhecimento", fonte: SAH, pagina: 60, tabela: "Tabela 1.6 (p. 58)", aba: "amaldicoados", secao: "especiais",
      categoria: "II", espacos: 1,
      resumo: "Caixinha de madeira decorada com figuras espectrais desesperadas.",
      efeitos: [
        "Cada 1 natural nos d20 de testes de criaturas paranormais em alcance médio dá uma carga (máximo de 6).",
        "Uma vez por rodada, consuma uma carga para recuperar 1d4 PE, com −1 cumulativo em Vontade até o próximo interlúdio.",
      ] },

    { id: "sah.amaldicoado.tabula-do-saber-custoso", nome: "Tábula do saber custoso", alias: ["Tablet do saber custoso"], elemento: "conhecimento", fonte: SAH, pagina: 60, tabela: "Tabela 1.6 (p. 58)", aba: "amaldicoados", secao: "especiais",
      categoria: "II", espacos: 1,
      resumo: "Pequena tábula marcada com sigilos de Conhecimento.",
      efeitos: ["Empunhando-a, recebe os benefícios de treinado numa perícia por um único teste.", "Perde Sanidade igual ao valor do atributo-chave dessa perícia."],
      notas: ["A Tabela 1.6 chama o item de “Tablet do saber custoso”; a descrição, de “Tábula do Saber Custoso”. O catálogo usa o nome da descrição e acha pelos dois."] },

    { id: "sah.amaldicoado.arreio-neural", nome: "Arreio neural", elemento: "energia", fonte: SAH, pagina: 60, tabela: "Tabela 1.6 (p. 58)", aba: "amaldicoados", secao: "especiais",
      categoria: "II", espacos: 1,
      resumo: "Correias de couro e fivelas vitorianas presas à cabeça como um cabresto.",
      efeitos: ["Usando-o, cada vez que sofre 5 ou mais de dano de eletricidade ou Energia, recupera 1 PE.", "Máximo de PE recuperados assim por dia: o dobro do seu Vigor."] },

    { id: "sah.amaldicoado.centrifugador-existencial", nome: "Centrifugador existencial", elemento: "energia", fonte: SAH, pagina: 60, tabela: "Tabela 1.6 (p. 58)", aba: "amaldicoados", secao: "especiais",
      categoria: "III", espacos: 1,
      resumo: "Dois círculos de cobre concêntricos que giram em sentidos opostos.",
      efeitos: [
        "Ação padrão e 3 PE: você se divide em duas possibilidades e ganha um turno adicional na última contagem de iniciativa da rodada; sorteie qual versão se dissipa no fim.",
        "A cada uso, Ocultismo DT 15 (+5 por uso adicional no dia); falhando, perde metade dos atributos (arredondado para baixo) e recupera 1 ponto de cada por interlúdio.",
      ] },

    { id: "sah.amaldicoado.espelho-refletor", nome: "Espelho refletor", elemento: "energia", fonte: SAH, pagina: 61, tabela: "Tabela 1.6 (p. 58)", aba: "amaldicoados", secao: "especiais",
      categoria: "II", espacos: 1,
      resumo: "Placa metálica tirada de criaturas como o Ciborgue e polida em ritual.",
      efeitos: [
        "Ação de movimento para observar um ponto ou ser fora do seu ângulo de visão em alcance médio: +1 dado em Percepção e chance de ver até através de cobertura total.",
        "Ao sofrer dano de Energia, sacrifique o espelho para evitar o dano e refleti-lo de volta à origem.",
      ] },

    { id: "sah.amaldicoado.fuzil-alheio", nome: "Fuzil alheio", elemento: "energia", fonte: SAH, pagina: 61, tabela: "Tabela 1.6 (p. 58)", aba: "amaldicoados", secao: "especiais",
      categoria: "IV", espacos: 2,
      arma: { proficiencia: "tatica", tipo: "fogo", empunhadura: "duasMaos", dano: "2d10", critico: "17/x3", alcance: "extremo", tipoDano: "Energia", semMunicao: true },
      resumo: "Arma alienígena deixada para trás pelo Estrangeiro e seus Alheios.",
      efeitos: [
        "Fuzil de precisão com mira telescópica e mira laser.",
        "Causa dano de Energia e não precisa de munição.",
        "Como fuzil de precisão: veterano em Pontaria que mira recebe +5 na margem de ameaça.",
      ],
      notas: ["O SAH descreve o item como um fuzil de precisão (OPRPG p. 57: 2d10, 19/x3, longo) com mira telescópica (+1 categoria de alcance: extremo) e mira laser (+2 na margem: 17). O catálogo aplica essas duas modificações descritas — nada além."] },

    { id: "sah.amaldicoado.primeira-adaga", nome: "A Primeira Adaga", alias: ["Primeira Adaga, A"], elemento: "medo", fonte: SAH, pagina: 61, tabela: "Tabela 1.6 (p. 58)", aba: "amaldicoados", secao: "especiais",
      categoria: "III", espacos: 1,
      resumo: "Lâmina de pedra polida e cabo de madeira: a primeira adaga usada num ritual.",
      efeitos: [
        "Usada como componente ritualístico, dá ao ritual os efeitos dos catalisadores ampliador, perturbador, potencializador e prolongador (SAH p. 44).",
        "O tempo de conjuração vira 1 rodada, mesmo com Conjuração Complexa e Combate Narrativo.",
        "O conjurador perde metade dos PV totais (conta como dano massivo). Pagar com uma vítima de sacrifício é possível — e um ato de extrema crueldade.",
      ],
      notas: ["O livro não dá estatísticas de arma para a adaga."] },
  ];

  global.RAMAOrdemItensDados = {
    versao: 1,
    fontes: {
      OPRPG: { nome: "Ordem Paranormal RPG", curto: "Livro básico", edicao: "v1.1" },
      SAH: { nome: "Sobrevivendo ao Horror", curto: "Sobrevivendo ao Horror", edicao: "v1.2" },
    },
    itens: ITENS,
  };
})(typeof window !== "undefined" ? window : globalThis);
