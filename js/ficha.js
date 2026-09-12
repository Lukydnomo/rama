/* =====================================================================
   R.A.M.A. — modelo da ficha
   ---------------------------------------------------------------------
   O formato dos dados de um personagem, a ficha padrão de quem acabou
   de ser criado e a normalização do que chega de fora (importação,
   planilha antiga, JSON escrito à mão).

   Duas ideias sustentam o arquivo inteiro:

   1. NADA é campo fixo além do que precisa ser. Força e PV são padrões
      iniciais, não estrutura da tabela. Quem quiser CORRUPÇÃO, SANGUE
      ou uma perícia nova acrescenta, e o modelo aceita — por isso tudo
      é lista de objetos com id, e não coluna.

   2. Todo registro carrega um id permanente. Nome muda, ordem muda,
      atributo vinculado muda; o id não. É o que permite renomear
      "Vigor" sem quebrar as perícias que apontam para ele.

   O sistema classifica cada campo em três naturezas, e isso é parte do
   DADO, não só da tela:

     informacao  — texto que se lê (nome, classe, origem)
     rolavel     — tem valor E tem dado, que são coisas diferentes:
                   Vigor 2 não quer dizer 2d20
     dependente  — rola através de outro (a perícia usa o dado do
                   atributo vinculado e só depois soma o que é seu)
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var D = global.RAMADados;

  /* 1 → 2: a ficha ganhou Habilidades, Rituais e categoria no
     inventário.
     2 → 3: cada ritual ganhou uma coleção de VERSÕES, cada uma com nome
     e dano próprios.
     3 → 4: a ficha ganhou `tipoFicha` e, quando é de Ordem, o bloco
     `ordem` com as escolhas do sistema. Ficha sem o campo é universal,
     que é o que toda ficha gravada antes desta versão é.
     4 → 5: o bloco `ordem` ganhou `escolhas` (as decisões de cada etapa
     de progressão), `afinidade`, `patente` e o ajuste temporário de
     capacidade; os itens de uma ficha de Ordem ganharam o bloco `ordem`
     com espaços, quantidade e categoria.

     Nenhuma das subidas exige migração: normalizarFicha() cria o que
     falta, vazio, e não toca no que existe. Um ritual gravado na 2 abre
     na 3 com a versão Normal em branco; uma ficha de Ordem gravada na 4
     abre na 5 sem escolhas registradas, com as pendências calculadas a
     partir da classe e do NEX. Ver docs/CHARACTER_SCHEMA.md. */
  var VERSAO_SCHEMA = 5;

  var NATUREZA = { INFORMACAO: "informacao", ROLAVEL: "rolavel", DEPENDENTE: "dependente" };

  var TIPOS_ITEM = ["item", "arma", "armadura", "mochila"];

  /* Dado inicial de todo atributo. Um d20 puro; quem joga com 2d20 ou
     -2d20 configura no modo edição, atributo por atributo. */
  var DADO_PADRAO = "1d20";

  /* =================================================================
     PADRÕES
     ================================================================= */

  var ATRIBUTOS_PADRAO = [
    { nome: "Força",     sigla: "FOR" },
    { nome: "Agilidade", sigla: "AGI" },
    { nome: "Presença",  sigla: "PRE" },
    { nome: "Intelecto", sigla: "INT" },
    { nome: "Vigor",     sigla: "VIG" },
  ];

  var STATUS_PADRAO = [
    { nome: "PV" },
    { nome: "PE" },
    { nome: "Sanidade" },
  ];

  /* As 28 perícias do projeto, com o atributo de cada uma.

     Os asteriscos fazem parte do nome e ficam onde estão — eles marcam
     a perícia que se especializa (Artes*, Ofício*, Ciências*), e apagar
     o símbolo apagaria a informação.

     Sobrevivência é a única com dois atributos possíveis: cada ficha
     escolhe o seu, e por isso ela carrega `atributosPermitidos`. */
  var PERICIAS_PADRAO = [
    { nome: "Acrobacia",      sigla: "AGI" },
    { nome: "Adestramento*",  sigla: "PRE" },
    { nome: "Artes*",         sigla: "PRE" },
    { nome: "Atletismo",      sigla: "FOR" },
    { nome: "Atualidades",    sigla: "INT" },
    { nome: "Ciências*",      sigla: "INT" },
    { nome: "Crime*",         sigla: "AGI" },
    { nome: "Diplomacia",     sigla: "PRE" },
    { nome: "Enganação",      sigla: "PRE" },
    { nome: "Fortitude",      sigla: "VIG" },
    { nome: "Furtividade",    sigla: "AGI" },
    { nome: "Iniciativa",     sigla: "AGI" },
    { nome: "Intimidação",    sigla: "PRE" },
    { nome: "Intuição",       sigla: "INT" },
    { nome: "Investigação",   sigla: "INT" },
    { nome: "Luta",           sigla: "FOR" },
    { nome: "Medicina",       sigla: "INT" },
    { nome: "Ocultismo*",     sigla: "INT" },
    { nome: "Percepção",      sigla: "PRE" },
    { nome: "Pilotagem*",     sigla: "AGI" },
    { nome: "Pontaria",       sigla: "AGI" },
    { nome: "Profissão*",     sigla: "INT" },
    { nome: "Reflexos",       sigla: "AGI" },
    { nome: "Religião*",      sigla: "INT" },
    { nome: "Sobrevivência",  sigla: "INT", permitidos: ["INT", "PRE"] },
    { nome: "Tática*",        sigla: "INT" },
    { nome: "Tecnologia*",    sigla: "INT" },
    { nome: "Vontade",        sigla: "PRE" },
  ];

  var DEFESA_PADRAO = { dt: 0, esquiva: 0, bloqueio: 0, resistencia: 0 };

  /* =================================================================
     RITUAIS
     -----------------------------------------------------------------
     O NOME da seção e os RÓTULOS dos campos são configuráveis; as
     CHAVES internas não. Quem troca "Círculo" por "Nível" está mudando
     o que a tela escreve, não o que o dado é — se a chave mudasse
     junto, cada renomeação exigiria migrar todos os rituais da ficha, e
     um erro no meio disso apagaria conteúdo.

     Os rótulos pertencem à SEÇÃO, não a cada ritual. Cinco nomes de
     campo por ritual dariam uma ficha onde dois rituais mostram coisas
     diferentes com o mesmo significado.
     ================================================================= */

  var CAMPOS_RITUAL = ["circulo", "alcance", "duracao", "alvo", "efeito"];

  var ROTULOS_RITUAL_PADRAO = {
    circulo: "Círculo",
    alcance: "Alcance",
    duracao: "Duração",
    alvo: "Alvo",
    efeito: "Efeito",
  };

  var ROTULO_SECAO_RITUAIS = "Rituais";

  /* =================================================================
     TIPO DE FICHA
     -----------------------------------------------------------------
     O R.A.M.A. passa a ter dois modelos de ficha:

       universal  o modelo flexível que sempre existiu. Nada nele é
                  imposto: atributos, perícias, status e seções são de
                  quem joga.
       ordem      a ficha de Ordem Paranormal RPG, com as regras, os
                  cálculos e o catálogo dos livros.

     O TIPO É UM CAMPO, E SÓ UM CAMPO
     -----------------------------------------------------------------
     Ele é gravado explicitamente e nunca deduzido. Nada no sistema
     olha para o nome de um atributo, de uma seção ou de um personagem
     para decidir que ficha é aquela — uma ficha universal cujo dono
     resolveu chamar os atributos de AGI, FOR, INT, PRE e VIG continua
     sendo universal, e uma ficha de Ordem com a seção de rituais
     renomeada para "Magias" continua sendo de Ordem.

     Deduzir o sistema pelo conteúdo seria adivinhar a intenção de
     quem joga a partir de um nome que ele escolheu por outro motivo.

     FICHA ANTIGA É UNIVERSAL
     -----------------------------------------------------------------
     Toda ficha gravada antes desta versão não tem o campo, e a
     normalização a trata como universal. É o comportamento correto e
     não é um chute: universal é o único modelo que existia, e é o
     modelo que não impõe nada. Uma ficha antiga continua abrindo, com
     os mesmos dados e o mesmo funcionamento.

     NÃO EXISTE CONVERSÃO AUTOMÁTICA
     -----------------------------------------------------------------
     Nesta entrega não há caminho de universal para ordem nem o
     contrário. Uma conversão automática teria de adivinhar qual dos
     atributos livres vira Agilidade, qual perícia vira qual, e o que
     fazer com o que não tem equivalente — e cada adivinhação dessas é
     uma chance de apagar o trabalho de alguém em silêncio. Trocar o
     tipo é uma decisão com perda de dados, e enquanto não houver um
     caminho que a torne segura, ela não existe.

     A escolha inicial também não pode virar uma armadilha: o tipo
     escolhido na criação não apaga nada depois, porque ele nunca
     muda sozinho. */

  var TIPOS_FICHA = ["universal", "ordem"];
  var TIPO_FICHA_PADRAO = "universal";

  /* Qualquer coisa que não seja um tipo conhecido vira universal.
     Errar para o lado do modelo que não impõe regra nenhuma é o único
     erro seguro aqui: um arquivo adulterado que dissesse "ordem" faria
     a ficha ser desenhada com cálculos que os dados dela não
     sustentam. */
  function tipoDeFicha(valor) {
    var t = U.texto(valor).trim().toLowerCase();
    return TIPOS_FICHA.indexOf(t) >= 0 ? t : TIPO_FICHA_PADRAO;
  }

  function ehDeOrdem(ficha) {
    return !!ficha && tipoDeFicha(ficha.tipoFicha) === "ordem";
  }

  /* =================================================================
     CONSTRUÇÃO
     ================================================================= */

  function criarAtributo(base) {
    return {
      id: U.uuid(),
      natureza: NATUREZA.ROLAVEL,
      nome: base.nome,
      sigla: base.sigla,
      valor: 0,
      /* valor e dado são independentes de propósito: um atributo 2 pode
         rolar 3d20, e um atributo 5 pode rolar 1d20 */
      dado: DADO_PADRAO,
    };
  }

  function criarStatus(base) {
    return {
      id: U.uuid(),
      nome: base.nome,
      atual: 0,
      maximo: 0,
    };
  }

  function criarPericia(base, porSigla) {
    var pericia = {
      id: U.uuid(),
      natureza: NATUREZA.DEPENDENTE,
      nome: base.nome,
      atributoId: porSigla[base.sigla],
      bonus: 0,
      bonusTemporario: 0,
      dadosExtras: [],
    };
    if (base.permitidos) {
      pericia.atributosPermitidos = base.permitidos.map(function (s) { return porSigla[s]; });
    }
    return pericia;
  }

  function criarFicha(inicial) {
    var i = inicial || {};
    var agora = U.agoraISO();

    var atributos = ATRIBUTOS_PADRAO.map(criarAtributo);

    var porSigla = {};
    atributos.forEach(function (a) { porSigla[a.sigla] = a.id; });

    return {
      schemaVersion: VERSAO_SCHEMA,
      /* Explícito desde o nascimento da ficha. */
      tipoFicha: tipoDeFicha(i.tipoFicha),

      nome: U.aparar(i.nome, 80) || "Novo personagem",
      campanhaId: i.campanhaId || null,
      classe: U.aparar(i.classe, 60),
      origem: U.aparar(i.origem, 60),

      criadoEm: agora,
      atualizadoEm: agora,

      atributos: atributos,
      status: STATUS_PADRAO.map(criarStatus),
      defesa: Object.assign({}, DEFESA_PADRAO),
      pericias: PERICIAS_PADRAO.map(function (p) { return criarPericia(p, porSigla); }),

      habilidades: global.RAMAHabilidades.arvoreVazia(),
      rituais: rituaisVazios(),

      /* Só a ficha de Ordem carrega este bloco. Numa universal ele não
         existe, e nada do sistema o procura. */
      ordem: tipoDeFicha(i.tipoFicha) === "ordem" && global.RAMAOrdemRegras
        ? global.RAMAOrdemRegras.fichaVazia()
        : undefined,

      inventario: { limite: 0, itens: [] },
      anotacoes: { pastas: [], soltas: [] },
      camposCustomizados: [],
    };
  }

  function rituaisVazios() {
    return {
      rotuloSecao: ROTULO_SECAO_RITUAIS,
      rotulos: Object.assign({}, ROTULOS_RITUAL_PADRAO),
      itens: [],
    };
  }

  /* =================================================================
     VERSÕES DO RITUAL
     -----------------------------------------------------------------
     Um ritual pode ser conjurado de mais de um jeito, e cada jeito tem
     o próprio dano. Em Ordem Paranormal o uso típico é Normal, Discente
     e Verdadeiro — mas isso é vocabulário DE UMA MESA, não estrutura do
     R.A.M.A.

     Por isso as versões são uma COLEÇÃO, e não três campos fixos
     chamados dano, danoDiscente e danoVerdadeiro. A diferença não é
     estética:

       · campos fixos obrigariam todo ritual a ter os três, e um
         sistema com quatro níveis não caberia sem mexer no código;
       · o nome exibido deixaria de ser texto e viraria chave. Renomear
         "Discente" para "Ampliado" mudaria onde o dado está gravado, e
         quem renomeasse perderia o valor.

     Aqui o NOME é conteúdo e o ID é identidade. Renomear uma versão não
     move nada; remover uma não desloca as outras; e duas versões podem
     até se chamar igual sem uma sobrescrever a outra.

     Nesta entrega a versão guarda só nome e dano. Alcance, duração e os
     outros campos continuam sendo do ritual inteiro, compartilhados —
     dar uma ficha completa a cada versão seria construir um sistema que
     ninguém pediu.
     ================================================================= */

  var NOME_VERSAO_PADRAO = "Normal";

  /* Teto de sanidade, como o do motor de dados: é contra o acidente de
     um arquivo importado trazer mil versões, não uma regra de jogo. */
  var MAX_VERSOES_RITUAL = 12;

  /* O dano é OPCIONAL: existe ritual que não causa dano nenhum, e
     campo vazio é uma resposta legítima — nunca zero.

     Expressão válida é gravada na forma canônica, para "6 D 8" e "6d8"
     não virarem dois valores diferentes na conciliação. Expressão
     inválida é gravada COMO VEIO: apagá-la em silêncio faria alguém
     perder o que digitou sem nunca saber por quê. Ela volta a aparecer
     na tela, o editor recusa salvar por cima dela e a rolagem explica
     o motivo. */
  function danoDeVersao(valor) {
    var bruto = U.aparar(valor, 40);
    if (!bruto) return "";
    return D.normalizar(bruto) || bruto;
  }

  function criarVersaoRitual(dados) {
    var d = dados || {};
    return {
      id: U.uuid(),
      nome: U.aparar(d.nome, 40) || NOME_VERSAO_PADRAO,
      dano: danoDeVersao(d.dano),
    };
  }

  /* normalizarVersoesRitual(bruto, { idsNovos })

     idsNovos:false (padrão)  preserva os ids que vieram — é o caminho
                              de ler da planilha, de importar e de
                              salvar uma edição. Renomear não pode
                              trocar a identidade de uma versão.

     idsNovos:true            gera ids do zero — é o caminho de
                              DUPLICAR. Uma cópia que reaproveitasse os
                              ids do original ficaria colada nele na
                              hora de conciliar duas edições.

     Em qualquer caminho, o resultado tem PELO MENOS uma versão. É isso
     que faz um ritual antigo, gravado antes de as versões existirem,
     abrir com a Normal em branco em vez de abrir sem nada — e é isso
     que impede a normalização seguinte de acrescentar uma segunda
     Normal, porque quando já existe uma ela não acrescenta nada. */
  function normalizarVersoesRitual(bruto, opcoes) {
    var o = opcoes || {};
    var entrada = Array.isArray(bruto) ? bruto : [];

    var saida = [];
    var vistos = {};

    entrada.slice(0, MAX_VERSOES_RITUAL).forEach(function (v) {
      if (!v || typeof v !== "object") return;

      /* Id repetido dentro do mesmo ritual quebraria a remoção e a
         conciliação por id — e um arquivo importado pode trazer
         qualquer coisa. O segundo ganha um id novo em vez de derrubar
         o primeiro. */
      var id = (!o.idsNovos && v.id) ? String(v.id) : U.uuid();
      if (vistos[id]) id = U.uuid();
      vistos[id] = true;

      saida.push({
        id: id,
        nome: U.aparar(v.nome, 40) || NOME_VERSAO_PADRAO,
        dano: danoDeVersao(v.dano),
      });
    });

    if (!saida.length) saida.push(criarVersaoRitual({}));

    return saida;
  }

  /* As versões que a ficha mostra: só as que têm dano. Uma lista de
     três nomes com o campo em branco do lado é ruído, não informação —
     o mesmo critério dos campos do ritual. */
  function versoesComDano(ritual) {
    if (!ritual || !Array.isArray(ritual.versoes)) return [];
    return ritual.versoes.filter(function (v) { return !!U.aparar(v && v.dano); });
  }

  /* Cria um ritual NOVO a partir de dados quaisquer — inclusive de
     outro ritual, que é o caso de duplicar. Por isso os ids das versões
     nascem do zero: a cópia é outro registro, e precisa ser outro
     registro também para a conciliação. */
  function criarRitual(dados) {
    var d = dados || {};
    var ritual = { id: U.uuid(), nome: U.aparar(d.nome, 120) || "Novo ritual" };
    CAMPOS_RITUAL.forEach(function (campo) {
      ritual[campo] = U.aparar(d[campo], campo === "efeito" ? 8000 : 200);
    });
    ritual.versoes = normalizarVersoesRitual(d.versoes, { idsNovos: true });
    return ritual;
  }

  /* =================================================================
     ITENS DE INVENTÁRIO
     -----------------------------------------------------------------
     Cada tipo tem os seus campos, e só os seus. Guardar "dano" numa
     armadura e "defesa" numa arma tornaria a ficha impossível de
     validar depois.
     ================================================================= */

  function criarItem(tipo, dados) {
    var d = dados || {};
    var base = {
      id: U.uuid(),
      tipo: TIPOS_ITEM.indexOf(tipo) >= 0 ? tipo : "item",
      nome: U.aparar(d.nome, 80) || nomePadraoDoTipo(tipo),
      /* Categoria é diferente de tipo. O tipo diz o que o item É para o
         sistema (arma, mochila) e é fechado; a categoria diz como quem
         joga o organiza (Consumível, Corpo a corpo) e é texto livre —
         fechá-la num enum obrigaria a mexer no código toda vez que uma
         mesa inventasse uma gaveta nova. */
      categoria: U.aparar(d.categoria, 60),
      descricao: U.aparar(d.descricao, 2000),
      /* De onde este item veio, quando veio da biblioteca. É rastro,
         não vínculo: editar o modelo na Homebrew NÃO muda a ficha. */
      origemHomebrewId: d.origemHomebrewId || null,
    };

    /* Espaços, quantidade e categoria de Ordem Paranormal. O bloco só
       existe no item que já o tinha — um item da ficha universal nunca
       ganha campo novo por causa disto. */
    if (d.ordem && typeof d.ordem === "object") {
      base.ordem = global.RAMAOrdemInventario
        ? global.RAMAOrdemInventario.normalizarDados(d.ordem, base.tipo)
        : JSON.parse(JSON.stringify(d.ordem));
    }

    if (base.tipo === "mochila") {
      base.reducaoPeso = U.peso(d.reducaoPeso);
      return base;
    }

    base.peso = U.peso(d.peso);

    if (base.tipo === "arma") {
      base.periciaId = d.periciaId || null;
      base.dano = D.normalizar(d.dano);
      base.danoExtra = U.aparar(d.danoExtra, 20);
      base.critico = Math.max(0, U.inteiro(d.critico, 0));
      base.multiplicador = Math.max(1, U.inteiro(d.multiplicador, 2));
    }

    if (base.tipo === "armadura") {
      base.defesa = U.inteiro(d.defesa, 0);
    }

    return base;
  }

  function nomePadraoDoTipo(tipo) {
    if (tipo === "arma") return "Nova arma";
    if (tipo === "armadura") return "Nova armadura";
    if (tipo === "mochila") return "Nova mochila";
    return "Novo item";
  }

  function rotuloDoTipo(tipo) {
    if (tipo === "arma") return "Arma";
    if (tipo === "armadura") return "Armadura";
    if (tipo === "mochila") return "Mochila";
    return "Item";
  }

  /* =================================================================
     PESO
     -----------------------------------------------------------------
     Soma do que se carrega, menos o que as mochilas aliviam, nunca
     abaixo de zero. É calculado, e por isso nunca editável na tela: um
     peso digitado à mão deixaria de bater com o inventário na primeira
     troca de item.
     ================================================================= */

  function pesoAtual(inventario) {
    var itens = (inventario && inventario.itens) || [];

    var carregado = 0;
    var reducao = 0;

    itens.forEach(function (item) {
      if (!item) return;
      /* A mochila não pesa por si — ela é o que tira peso. */
      if (item.tipo === "mochila") reducao += Math.max(0, U.numero(item.reducaoPeso, 0));
      else carregado += Math.max(0, U.numero(item.peso, 0));
    });

    return U.peso(Math.max(0, carregado - reducao));
  }

  /* =================================================================
     CATEGORIAS
     -----------------------------------------------------------------
     A categoria é texto livre, então "Consumível", " consumível " e
     "CONSUMÍVEL" chegam como três coisas e são a mesma gaveta. A chave
     canônica agrupa; o rótulo mostrado é a primeira grafia que
     apareceu, para a tela não impor maiúsculas a quem escreveu com
     capitalização própria.
     ================================================================= */

  function chaveDeCategoria(texto) {
    return U.chaveDeBusca(U.texto(texto).replace(/\s+/g, " ").trim());
  }

  var CATEGORIA_VAZIA = "__sem__";

  function categoriasDe(inventario) {
    var itens = (inventario && inventario.itens) || [];
    var mapa = {};

    itens.forEach(function (item) {
      if (!item) return;
      var bruto = U.aparar(item.categoria, 60);
      var chave = bruto ? chaveDeCategoria(bruto) : CATEGORIA_VAZIA;

      if (!mapa[chave]) {
        mapa[chave] = { chave: chave, rotulo: bruto || "Sem categoria", quantidade: 0 };
      }
      mapa[chave].quantidade++;
    });

    return Object.keys(mapa)
      .map(function (k) { return mapa[k]; })
      .sort(function (a, b) {
        /* "Sem categoria" fica sempre no fim: é a ausência de escolha,
           não uma gaveta concorrendo com as outras. */
        if (a.chave === CATEGORIA_VAZIA) return 1;
        if (b.chave === CATEGORIA_VAZIA) return -1;
        return a.rotulo.localeCompare(b.rotulo, "pt-BR");
      });
  }

  function itemNaCategoria(item, chave) {
    if (!chave) return true;
    var bruto = U.aparar(item && item.categoria, 60);
    var atual = bruto ? chaveDeCategoria(bruto) : CATEGORIA_VAZIA;
    return atual === chave;
  }

  function defesaDeArmaduras(inventario) {
    var itens = (inventario && inventario.itens) || [];
    return itens.reduce(function (t, i) {
      return t + (i && i.tipo === "armadura" ? U.inteiro(i.defesa, 0) : 0);
    }, 0);
  }

  /* =================================================================
     ANOTAÇÕES
     ================================================================= */

  function criarPasta(nome) {
    return { id: U.uuid(), nome: U.aparar(nome, 60) || "Nova pasta", notas: [] };
  }

  function criarNota(titulo) {
    var agora = U.agoraISO();
    return {
      id: U.uuid(),
      titulo: U.aparar(titulo, 80) || "Nova anotação",
      conteudo: "",
      criadoEm: agora,
      atualizadoEm: agora,
    };
  }

  /* Todas as notas da ficha, com a pasta de cada uma, para busca e para
     desenhar a árvore sem percorrer a estrutura duas vezes. */
  function todasAsNotas(anotacoes) {
    var saida = [];
    var a = anotacoes || {};
    (a.pastas || []).forEach(function (pasta) {
      (pasta.notas || []).forEach(function (nota) {
        saida.push({ nota: nota, pastaId: pasta.id, pastaNome: pasta.nome });
      });
    });
    (a.soltas || []).forEach(function (nota) {
      saida.push({ nota: nota, pastaId: null, pastaNome: "" });
    });
    return saida;
  }

  function acharNota(anotacoes, notaId) {
    return todasAsNotas(anotacoes).find(function (r) { return r.nota.id === notaId; }) || null;
  }

  /* =================================================================
     CAMPOS PERSONALIZADOS
     ================================================================= */

  function criarCampo(natureza) {
    var campo = {
      id: U.uuid(),
      natureza: natureza === NATUREZA.ROLAVEL ? NATUREZA.ROLAVEL : NATUREZA.INFORMACAO,
      nome: "Novo campo",
      valor: natureza === NATUREZA.ROLAVEL ? 0 : "",
    };
    if (campo.natureza === NATUREZA.ROLAVEL) campo.dado = DADO_PADRAO;
    return campo;
  }

  /* =================================================================
     NORMALIZAÇÃO
     -----------------------------------------------------------------
     Toda ficha que entra no sistema passa por aqui: a que veio da
     planilha, a que veio de um arquivo importado e a que veio de uma
     versão anterior do schema.

     A regra é não descartar o que dá para consertar e não confiar no
     que não dá. Um dado "2x10" vira "" (a arma fica sem dano e a pessoa
     conserta na tela) em vez de derrubar a ficha inteira.
     ================================================================= */

  function normalizarFicha(bruto) {
    var b = (bruto && typeof bruto === "object") ? bruto : {};
    var agora = U.agoraISO();

    var ficha = {
      schemaVersion: VERSAO_SCHEMA,
      /* Sem o campo, universal — que é o que toda ficha gravada antes
         desta versão é, e o único modelo que não impõe regra nenhuma. */
      tipoFicha: tipoDeFicha(b.tipoFicha),
      nome: U.aparar(b.nome, 80) || "Sem nome",
      campanhaId: b.campanhaId || null,
      classe: U.aparar(b.classe, 60),
      origem: U.aparar(b.origem, 60),
      criadoEm: U.paraData(b.criadoEm) ? new Date(b.criadoEm).toISOString() : agora,
      atualizadoEm: U.paraData(b.atualizadoEm) ? new Date(b.atualizadoEm).toISOString() : agora,
    };

    /* ---- atributos ----
       Uma ficha sem atributo nenhum não é uma ficha: as perícias não
       teriam onde se apoiar. Nesse caso os cinco padrões voltam. */
    var atributos = lista(b.atributos).map(normalizarAtributo).filter(Boolean);
    if (!atributos.length) atributos = ATRIBUTOS_PADRAO.map(criarAtributo);
    ficha.atributos = atributos;

    var idsAtributo = atributos.map(function (a) { return a.id; });
    var primeiroAtributo = idsAtributo[0];

    /* ---- status ---- */
    ficha.status = lista(b.status).map(normalizarStatus).filter(Boolean);

    /* ---- defesa ---- */
    var defesa = (b.defesa && typeof b.defesa === "object") ? b.defesa : {};
    ficha.defesa = {
      dt: U.inteiro(defesa.dt, 0),
      esquiva: U.inteiro(defesa.esquiva, 0),
      bloqueio: U.inteiro(defesa.bloqueio, 0),
      resistencia: U.inteiro(defesa.resistencia, 0),
    };

    /* ---- perícias ----
       Uma perícia apontando para um atributo que não existe mais rola
       no vazio. Religar ao primeiro atributo é melhor do que apagar a
       perícia: o vínculo se conserta em um clique, a perícia não. */
    ficha.pericias = lista(b.pericias).map(function (p) {
      return normalizarPericia(p, idsAtributo, primeiroAtributo);
    }).filter(Boolean);

    /* ---- inventário ---- */
    var inv = (b.inventario && typeof b.inventario === "object") ? b.inventario : {};
    ficha.inventario = {
      limite: Math.max(0, U.numero(inv.limite, 0)),
      itens: lista(inv.itens).map(normalizarItem).filter(Boolean),
    };

    /* ---- anotações ---- */
    var an = (b.anotacoes && typeof b.anotacoes === "object") ? b.anotacoes : {};
    ficha.anotacoes = {
      pastas: lista(an.pastas).map(normalizarPasta).filter(Boolean),
      soltas: lista(an.soltas).map(normalizarNota).filter(Boolean),
    };

    /* ---- Ordem Paranormal ----
       O bloco só é montado quando a ficha É de Ordem. Mas ele é
       PRESERVADO sempre que existir no que veio: uma ficha universal
       que um dia foi de Ordem não perde as escolhas por causa de uma
       leitura — perder dado em silêncio é o contrário do que esta
       função existe para fazer. */
    if (global.RAMAOrdemRegras && (ficha.tipoFicha === "ordem" || b.ordem)) {
      ficha.ordem = global.RAMAOrdemRegras.normalizar(b.ordem);
    }

    /* ---- campos personalizados ---- */
    ficha.camposCustomizados = lista(b.camposCustomizados).map(normalizarCampo).filter(Boolean);

    /* ---- habilidades (schema 2) ----
       Ficha gravada antes desta versão não tem o campo. Ela recebe uma
       árvore vazia e abre normalmente — nenhuma migração manual, nenhum
       aviso, nenhuma célula editada à mão. */
    ficha.habilidades = global.RAMAHabilidades.normalizarArvore(b.habilidades);

    /* ---- rituais (schema 2) ---- */
    ficha.rituais = normalizarRituais(b.rituais);

    return ficha;
  }

  function normalizarRituais(bruto) {
    var b = (bruto && typeof bruto === "object") ? bruto : {};
    var rotulosBrutos = (b.rotulos && typeof b.rotulos === "object") ? b.rotulos : {};

    var rotulos = {};
    CAMPOS_RITUAL.forEach(function (campo) {
      /* Rótulo em branco voltaria a seção para uma coluna sem nome;
         nesse caso o padrão volta a valer. */
      rotulos[campo] = U.aparar(rotulosBrutos[campo], 40) || ROTULOS_RITUAL_PADRAO[campo];
    });

    return {
      rotuloSecao: U.aparar(b.rotuloSecao, 40) || ROTULO_SECAO_RITUAIS,
      rotulos: rotulos,
      itens: lista(b.itens).map(normalizarRitual).filter(Boolean),
    };
  }

  function normalizarRitual(bruto) {
    if (!bruto || typeof bruto !== "object") return null;
    var nome = U.aparar(bruto.nome, 120);
    if (!nome) return null;

    var ritual = { id: bruto.id || U.uuid(), nome: nome };
    CAMPOS_RITUAL.forEach(function (campo) {
      ritual[campo] = U.aparar(bruto[campo], campo === "efeito" ? 8000 : 200);
    });
    /* Ler NUNCA troca id: é o mesmo registro voltando da planilha, de
       um arquivo importado ou de uma edição salva. Um ritual gravado
       antes de as versões existirem sai daqui com a Normal em branco, e
       a normalização seguinte não acrescenta uma segunda. */
    ritual.versoes = normalizarVersoesRitual(bruto.versoes);
    return ritual;
  }

  function lista(v) { return Array.isArray(v) ? v : []; }

  function normalizarAtributo(a) {
    if (!a || typeof a !== "object") return null;
    var nome = U.aparar(a.nome, 40);
    if (!nome) return null;
    return {
      id: a.id || U.uuid(),
      natureza: NATUREZA.ROLAVEL,
      nome: nome,
      sigla: (U.aparar(a.sigla, 6) || nome.slice(0, 3)).toUpperCase(),
      valor: U.inteiro(a.valor, 0),
      dado: D.normalizar(a.dado) || DADO_PADRAO,
    };
  }

  function normalizarStatus(s) {
    if (!s || typeof s !== "object") return null;
    var nome = U.aparar(s.nome, 40);
    if (!nome) return null;
    var maximo = Math.max(0, U.inteiro(s.maximo, 0));
    var atual = U.inteiro(s.atual, 0);
    return {
      id: s.id || U.uuid(),
      nome: nome,
      /* O atual não passa do máximo nem cai abaixo de zero — a não ser
         que o máximo seja 0, que é o estado "ainda não configurado" e
         não deve zerar o que a pessoa já anotou. */
      atual: maximo > 0 ? U.limitar(atual, 0, maximo) : Math.max(0, atual),
      maximo: maximo,
    };
  }

  function normalizarPericia(p, idsAtributo, padrao) {
    if (!p || typeof p !== "object") return null;
    var nome = U.aparar(p.nome, 60);
    if (!nome) return null;

    var permitidos = lista(p.atributosPermitidos)
      .filter(function (id) { return idsAtributo.indexOf(id) >= 0; });

    var atributoId = idsAtributo.indexOf(p.atributoId) >= 0 ? p.atributoId : null;
    if (!atributoId) atributoId = permitidos[0] || padrao;

    return {
      id: p.id || U.uuid(),
      natureza: NATUREZA.DEPENDENTE,
      nome: nome,
      atributoId: atributoId,
      atributosPermitidos: permitidos.length > 1 ? permitidos : undefined,
      bonus: U.inteiro(p.bonus, 0),
      bonusTemporario: U.inteiro(p.bonusTemporario, 0),
      dadosExtras: lista(p.dadosExtras).map(normalizarDadoExtra).filter(Boolean),
    };
  }

  function normalizarDadoExtra(m) {
    if (!m || typeof m !== "object") return null;
    var dado = D.normalizar(m.dado);
    if (!dado) return null;
    return {
      id: m.id || U.uuid(),
      operacao: m.operacao === "-" ? "-" : "+",
      dado: dado,
    };
  }

  function normalizarItem(i) {
    if (!i || typeof i !== "object") return null;
    var tipo = TIPOS_ITEM.indexOf(i.tipo) >= 0 ? i.tipo : "item";
    var item = criarItem(tipo, i);
    /* criarItem gera id novo; um item que já tinha id mantém o seu, ou
       referências dentro da ficha apontariam para o nada. */
    if (i.id) item.id = i.id;
    return item;
  }

  function normalizarPasta(p) {
    if (!p || typeof p !== "object") return null;
    return {
      id: p.id || U.uuid(),
      nome: U.aparar(p.nome, 60) || "Pasta",
      notas: lista(p.notas).map(normalizarNota).filter(Boolean),
    };
  }

  function normalizarNota(n) {
    if (!n || typeof n !== "object") return null;
    var agora = U.agoraISO();
    return {
      id: n.id || U.uuid(),
      titulo: U.aparar(n.titulo, 120) || "Anotação",
      conteudo: U.aparar(n.conteudo, 20000),
      criadoEm: U.paraData(n.criadoEm) ? new Date(n.criadoEm).toISOString() : agora,
      atualizadoEm: U.paraData(n.atualizadoEm) ? new Date(n.atualizadoEm).toISOString() : agora,
    };
  }

  function normalizarCampo(c) {
    if (!c || typeof c !== "object") return null;
    var nome = U.aparar(c.nome, 60);
    if (!nome) return null;
    var natureza = c.natureza === NATUREZA.ROLAVEL ? NATUREZA.ROLAVEL : NATUREZA.INFORMACAO;
    var campo = { id: c.id || U.uuid(), natureza: natureza, nome: nome };
    if (natureza === NATUREZA.ROLAVEL) {
      campo.valor = U.inteiro(c.valor, 0);
      campo.dado = D.normalizar(c.dado) || DADO_PADRAO;
    } else {
      campo.valor = U.aparar(c.valor, 2000);
    }
    return campo;
  }

  /* =================================================================
     CONSULTAS DE APOIO
     ================================================================= */

  function atributoDaPericia(ficha, pericia) {
    if (!ficha || !pericia) return null;
    return U.porId(ficha.atributos, pericia.atributoId);
  }

  /* Bônus total mostrado ao lado da perícia: fixo + temporário. Os
     dados extras não entram — eles não são um número até rolarem. */
  function bonusDaPericia(pericia) {
    return U.inteiro(pericia.bonus, 0) + U.inteiro(pericia.bonusTemporario, 0);
  }

  /* Prepara o pedido que o motor de dados espera para uma perícia. É
     aqui, e só aqui, que a ficha vira rolagem. */
  function pedidoDeRolagem(ficha, pericia) {
    var atributo = atributoDaPericia(ficha, pericia);
    return {
      nome: pericia.nome,
      sigla: atributo ? atributo.sigla : "",
      expressao: atributo ? atributo.dado : DADO_PADRAO,
      bonus: U.inteiro(pericia.bonus, 0),
      bonusTemporario: U.inteiro(pericia.bonusTemporario, 0),
      modificadores: pericia.dadosExtras || [],
    };
  }

  function resumoDeStatus(status) {
    var maximo = U.inteiro(status.maximo, 0);
    var atual = U.inteiro(status.atual, 0);
    if (maximo <= 0) return { porcentagem: 0, nivel: "indefinido" };
    var p = U.limitar(Math.round((atual / maximo) * 100), 0, 100);
    var nivel = p <= 25 ? "critico" : (p <= 50 ? "baixo" : "normal");
    return { porcentagem: p, nivel: nivel };
  }

  global.RAMAFicha = {
    VERSAO_SCHEMA: VERSAO_SCHEMA,
    TIPOS_FICHA: TIPOS_FICHA,
    TIPO_FICHA_PADRAO: TIPO_FICHA_PADRAO,
    tipoDeFicha: tipoDeFicha,
    ehDeOrdem: ehDeOrdem,
    NATUREZA: NATUREZA,
    TIPOS_ITEM: TIPOS_ITEM,
    DADO_PADRAO: DADO_PADRAO,
    ATRIBUTOS_PADRAO: ATRIBUTOS_PADRAO,
    PERICIAS_PADRAO: PERICIAS_PADRAO,

    CAMPOS_RITUAL: CAMPOS_RITUAL,
    ROTULOS_RITUAL_PADRAO: ROTULOS_RITUAL_PADRAO,
    CATEGORIA_VAZIA: CATEGORIA_VAZIA,

    criarFicha: criarFicha,
    criarRitual: criarRitual,
    criarVersaoRitual: criarVersaoRitual,
    normalizarVersoesRitual: normalizarVersoesRitual,
    versoesComDano: versoesComDano,
    NOME_VERSAO_PADRAO: NOME_VERSAO_PADRAO,
    MAX_VERSOES_RITUAL: MAX_VERSOES_RITUAL,
    rituaisVazios: rituaisVazios,
    normalizarRituais: normalizarRituais,
    chaveDeCategoria: chaveDeCategoria,
    categoriasDe: categoriasDe,
    itemNaCategoria: itemNaCategoria,
    criarAtributo: criarAtributo,
    criarStatus: criarStatus,
    criarItem: criarItem,
    criarPasta: criarPasta,
    criarNota: criarNota,
    criarCampo: criarCampo,

    normalizarFicha: normalizarFicha,
    normalizarItem: normalizarItem,

    pesoAtual: pesoAtual,
    defesaDeArmaduras: defesaDeArmaduras,
    todasAsNotas: todasAsNotas,
    acharNota: acharNota,
    atributoDaPericia: atributoDaPericia,
    bonusDaPericia: bonusDaPericia,
    pedidoDeRolagem: pedidoDeRolagem,
    resumoDeStatus: resumoDeStatus,
    rotuloDoTipo: rotuloDoTipo,
  };
})(typeof window !== "undefined" ? window : globalThis);
