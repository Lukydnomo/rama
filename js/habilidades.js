/* =====================================================================
   R.A.M.A. — habilidades
   ---------------------------------------------------------------------
   O modelo de habilidade e a árvore que as organiza. Mora fora de
   ficha.js porque três lugares diferentes usam exatamente a mesma
   estrutura: a ficha de um personagem, a biblioteca Homebrew e a mini
   ficha de uma criatura. Dois schemas de "habilidade" seria a forma
   mais rápida de eles divergirem.

   HABILIDADE É INFORMAÇÃO, e isso é decisão de modelo, não de tela.
   Ela não tem valor, não tem dado e não tem atributo vinculado —
   clicar nela não rola nada. É texto que se lê durante a sessão.

   A ÁRVORE É RECURSIVA de verdade. Não é "pasta → habilidade": uma
   pasta guarda filhos, e um filho pode ser outra pasta. Modelar isso
   como dois níveis fixos condenaria a estrutura a uma reescrita no dia
   em que alguém quisesse "Classe → Passivas → Defensivas".

   Um nó é uma de duas coisas, e o campo `tipo` diz qual:

     pasta       { id, tipo, nome, aberta, filhos: [] }
     habilidade  { id, tipo, nome, texto, origem, cor, negrito }

   Nenhuma posição de array é identidade. Todo nó tem id permanente.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;

  /* Profundidade máxima de pastas. Não é limite do modelo — é limite da
     tela: mais que isto e o recuo de cada nível já não cabe num
     celular. O modelo aceitaria mais. */
  var MAX_PROFUNDIDADE = 6;

  var TIPO_PASTA = "pasta";
  var TIPO_HABILIDADE = "habilidade";

  /* =================================================================
     CORES
     -----------------------------------------------------------------
     A cor é detalhe de contorno, nunca preenchimento do cartão inteiro:
     a interface é escura e sóbria de propósito, e um bloco de cor forte
     brigaria com a leitura.

     E a cor NUNCA é a única forma de distinguir alguma coisa — quem não
     distingue cores continua lendo nome, texto e origem normalmente.
     ================================================================= */

  var CORES = [
    { valor: "",        nome: "Sem cor" },
    { valor: "#C6564B", nome: "Rubro" },
    { valor: "#C9A227", nome: "Âmbar" },
    { valor: "#6FB07A", nome: "Verde" },
    { valor: "#5B8DB8", nome: "Azul" },
    { valor: "#7E6BB5", nome: "Violeta" },
    { valor: "#A0A0A0", nome: "Cinza" },
  ];

  /* Só hexadecimal de 3 ou 6 dígitos passa. É o que impede que um texto
     vindo de um arquivo importado — ou digitado de má-fé — vire CSS
     arbitrário quando a cor for aplicada a um elemento. */
  function corValida(valor) {
    var v = U.aparar(valor, 7);
    if (!v) return "";
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v) ? v : "";
  }

  /* =================================================================
     CONSTRUÇÃO
     ================================================================= */

  function criarHabilidade(dados) {
    var d = dados || {};
    return {
      id: U.uuid(),
      tipo: TIPO_HABILIDADE,
      nome: U.aparar(d.nome, 120) || "Nova habilidade",
      texto: U.aparar(d.texto, 8000),
      origem: U.aparar(d.origem, 60),
      cor: corValida(d.cor),
      negrito: !!d.negrito,
      /* De onde veio, quando veio de uma biblioteca. É rastro, não
         vínculo: editar o modelo depois NÃO muda esta cópia. */
      origemHabilidadeId: d.origemHabilidadeId || null,
    };
  }

  function criarPasta(nome) {
    return {
      id: U.uuid(),
      tipo: TIPO_PASTA,
      nome: U.aparar(nome, 80) || "Nova pasta",
      aberta: true,
      filhos: [],
    };
  }

  function arvoreVazia() { return { filhos: [] }; }

  /* =================================================================
     NORMALIZAÇÃO
     -----------------------------------------------------------------
     Recursiva, com teto de profundidade. O teto não é preciosismo: um
     JSON importado pode trazer uma pasta que aponta para si mesma pela
     serialização, e sem limite a normalização entraria em recursão
     infinita antes de qualquer validação adiantar alguma coisa.
     ================================================================= */

  function normalizarArvore(bruto) {
    var b = (bruto && typeof bruto === "object") ? bruto : {};
    return { filhos: normalizarFilhos(b.filhos, 0) };
  }

  function normalizarFilhos(lista, profundidade) {
    if (!Array.isArray(lista) || profundidade > MAX_PROFUNDIDADE) return [];

    return lista.map(function (no) {
      return normalizarNo(no, profundidade);
    }).filter(Boolean);
  }

  function normalizarNo(no, profundidade) {
    if (!no || typeof no !== "object") return null;

    if (no.tipo === TIPO_PASTA || Array.isArray(no.filhos)) {
      var nome = U.aparar(no.nome, 80);
      if (!nome) nome = "Pasta";
      return {
        id: no.id || U.uuid(),
        tipo: TIPO_PASTA,
        nome: nome,
        /* Pasta sem `aberta` definido nasce aberta: esconder conteúdo
           que a pessoa não mandou esconder é pior do que mostrar. */
        aberta: no.aberta === undefined ? true : !!no.aberta,
        filhos: normalizarFilhos(no.filhos, profundidade + 1),
      };
    }

    var habilidade = normalizarHabilidade(no);
    if (!habilidade) return null;
    habilidade.id = no.id || habilidade.id;
    return habilidade;
  }

  function normalizarHabilidade(bruto) {
    if (!bruto || typeof bruto !== "object") return null;
    var nome = U.aparar(bruto.nome, 120);
    if (!nome) return null;

    return {
      id: bruto.id || U.uuid(),
      tipo: TIPO_HABILIDADE,
      nome: nome,
      texto: U.aparar(bruto.texto, 8000),
      origem: U.aparar(bruto.origem, 60),
      cor: corValida(bruto.cor),
      negrito: !!bruto.negrito,
      origemHabilidadeId: bruto.origemHabilidadeId || null,
    };
  }

  /* =================================================================
     PERCURSO
     -----------------------------------------------------------------
     Um só percurso recursivo, usado por tudo o que precisa achar,
     contar, mover ou remover. Reescrever a recursão em cada operação
     seria multiplicar a chance de esquecer um nível.
     ================================================================= */

  /* Chama fn(no, pai, indice, profundidade) para cada nó, de cima para
     baixo. Devolver `false` em fn interrompe a descida naquele ramo. */
  function percorrer(arvore, fn) {
    function desce(lista, pai, profundidade) {
      (lista || []).forEach(function (no, i) {
        var continuar = fn(no, pai, i, profundidade);
        if (continuar === false) return;
        if (no.tipo === TIPO_PASTA) desce(no.filhos, no, profundidade + 1);
      });
    }
    desce(arvore && arvore.filhos, null, 0);
  }

  function achar(arvore, id) {
    var achado = null;
    percorrer(arvore, function (no, pai, indice, profundidade) {
      if (no.id === id) {
        achado = { no: no, pai: pai, indice: indice, profundidade: profundidade };
        return false;
      }
    });
    return achado;
  }

  /* A lista de filhos onde um nó vive: os filhos do pai, ou a raiz. */
  function irmaosDe(arvore, pai) {
    return pai ? pai.filhos : arvore.filhos;
  }

  function contar(arvore) {
    var total = { pastas: 0, habilidades: 0 };
    percorrer(arvore, function (no) {
      if (no.tipo === TIPO_PASTA) total.pastas++;
      else total.habilidades++;
    });
    return total;
  }

  function todasAsHabilidades(arvore) {
    var saida = [];
    percorrer(arvore, function (no) {
      if (no.tipo !== TIPO_PASTA) saida.push(no);
    });
    return saida;
  }

  /* Pastas que podem receber um nó, com o caminho legível de cada uma.
     Uma pasta não pode receber a si mesma nem um descendente seu — isso
     desligaria o ramo da árvore e ele sumiria da tela sem ter sido
     apagado. */
  function destinosPossiveis(arvore, idMovido) {
    var proibidos = {};

    if (idMovido) {
      var alvo = achar(arvore, idMovido);
      if (alvo && alvo.no.tipo === TIPO_PASTA) {
        proibidos[alvo.no.id] = true;
        percorrer({ filhos: alvo.no.filhos }, function (no) { proibidos[no.id] = true; });
      }
    }

    var destinos = [{ id: null, caminho: "Raiz", profundidade: -1 }];
    var caminhoDe = {};

    percorrer(arvore, function (no, pai, indice, profundidade) {
      if (no.tipo !== TIPO_PASTA) return;
      var prefixo = pai ? caminhoDe[pai.id] + " / " : "";
      caminhoDe[no.id] = prefixo + no.nome;
      if (proibidos[no.id]) return;
      /* Uma pasta no último nível não pode receber outra pasta. */
      if (profundidade >= MAX_PROFUNDIDADE - 1) return;
      destinos.push({ id: no.id, caminho: caminhoDe[no.id], profundidade: profundidade });
    });

    return destinos;
  }

  /* =================================================================
     OPERAÇÕES
     ================================================================= */

  function inserir(arvore, no, pastaId) {
    if (!pastaId) { arvore.filhos.push(no); return true; }
    var destino = achar(arvore, pastaId);
    if (!destino || destino.no.tipo !== TIPO_PASTA) { arvore.filhos.push(no); return true; }
    destino.no.filhos.push(no);
    destino.no.aberta = true;
    return true;
  }

  function remover(arvore, id) {
    var alvo = achar(arvore, id);
    if (!alvo) return null;
    var lista = irmaosDe(arvore, alvo.pai);
    return lista.splice(alvo.indice, 1)[0] || null;
  }

  function mover(arvore, id, pastaDestinoId) {
    var alvo = achar(arvore, id);
    if (!alvo) return false;

    /* Mover uma pasta para dentro dela mesma a desligaria da árvore. */
    if (pastaDestinoId) {
      var permitidos = destinosPossiveis(arvore, id);
      if (!permitidos.some(function (d) { return d.id === pastaDestinoId; })) return false;
    }

    var no = remover(arvore, id);
    if (!no) return false;
    return inserir(arvore, no, pastaDestinoId);
  }

  /* Sobe ou desce um nó entre os próprios irmãos. Reordenar dentro do
     nível é o suficiente: mover entre níveis é a operação de mover. */
  function reordenar(arvore, id, direcao) {
    var alvo = achar(arvore, id);
    if (!alvo) return false;

    var lista = irmaosDe(arvore, alvo.pai);
    var destino = alvo.indice + (direcao < 0 ? -1 : 1);
    if (destino < 0 || destino >= lista.length) return false;

    var movido = lista.splice(alvo.indice, 1)[0];
    lista.splice(destino, 0, movido);
    return true;
  }

  /* O que existe dentro de uma pasta, para a confirmação de exclusão
     dizer exatamente o que vai sumir em vez de "tem certeza?". */
  function conteudoDaPasta(pasta) {
    var total = contar({ filhos: pasta.filhos || [] });
    return total;
  }

  /* Tira o conteúdo de uma pasta e o coloca no lugar dela, para excluir
     a pasta sem levar as habilidades junto. */
  function esvaziarPara(arvore, pastaId) {
    var alvo = achar(arvore, pastaId);
    if (!alvo || alvo.no.tipo !== TIPO_PASTA) return false;

    var lista = irmaosDe(arvore, alvo.pai);
    var filhos = alvo.no.filhos || [];
    lista.splice.apply(lista, [alvo.indice, 1].concat(filhos));
    return true;
  }

  /* =================================================================
     CÓPIA PARA A FICHA
     -----------------------------------------------------------------
     Mesmo princípio que já vale entre Homebrew e inventário: o que
     entra na ficha é uma CÓPIA. Editar o modelo na biblioteca semanas
     depois não pode mudar a habilidade de um personagem em jogo.
     ================================================================= */

  function copiarParaFicha(modelo) {
    var copia = normalizarHabilidade(modelo);
    if (!copia) return null;
    copia.id = U.uuid();
    copia.origemHabilidadeId = modelo.id || null;
    return copia;
  }

  global.RAMAHabilidades = {
    TIPO_PASTA: TIPO_PASTA,
    TIPO_HABILIDADE: TIPO_HABILIDADE,
    MAX_PROFUNDIDADE: MAX_PROFUNDIDADE,
    CORES: CORES,

    corValida: corValida,
    criarHabilidade: criarHabilidade,
    criarPasta: criarPasta,
    arvoreVazia: arvoreVazia,
    normalizarArvore: normalizarArvore,
    normalizarHabilidade: normalizarHabilidade,

    percorrer: percorrer,
    achar: achar,
    contar: contar,
    todasAsHabilidades: todasAsHabilidades,
    destinosPossiveis: destinosPossiveis,

    inserir: inserir,
    remover: remover,
    mover: mover,
    reordenar: reordenar,
    conteudoDaPasta: conteudoDaPasta,
    esvaziarPara: esvaziarPara,
    copiarParaFicha: copiarParaFicha,
  };
})(typeof window !== "undefined" ? window : globalThis);
