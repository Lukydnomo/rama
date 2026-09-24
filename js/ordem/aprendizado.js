/* =====================================================================
   R.A.M.A. — Ordem Paranormal · aprendizado de rituais
   =====================================================================
   O que a progressão CONCEDE em rituais, e sob que condições. Sem tela,
   sem ficha e sem catálogo: este arquivo responde "quantos rituais, de
   que círculo, vindos de onde, guardados onde" a partir da classe, da
   trilha, do degrau e das regras opcionais ligadas.

   Quem transforma isso em vagas, pendências e registros é
   js/ordem/progressao.js. Quem mostra é a aba Rituais e a janela "Da
   biblioteca".

   ---------------------------------------------------------------------
   POR QUE UM ARQUIVO SÓ PARA ISTO
   ---------------------------------------------------------------------

   Porque são três fontes de concessão que se somam na mesma ficha, cada
   uma com uma contagem e um critério de círculo diferentes:

     CLASSE    "Você começa com três rituais de 1º círculo. Sempre que
               avança de NEX, aprende um ritual de qualquer círculo que
               possa lançar" (Escolhido pelo Outro Lado, OPRPG p. 32)
     TRILHA    Saber Ampliado e Grimório Ritualístico (Graduado, OPRPG
               p. 35), mais os rituais que outras trilhas concedem pelo
               nome
     PODER     Aprender Ritual (poder paranormal, OPRPG p. 114) — o
               único que conta no limite de rituais conhecidos

   Misturar as três numa conta só daria o número certo por acaso e o
   motivo errado sempre.

   ---------------------------------------------------------------------
   O QUE É AUTOMÁTICO E O QUE É ESCOLHA
   ---------------------------------------------------------------------

   CONCESSÃO AUTOMÁTICA   a trilha diz QUAL ritual ("Você aprende o
                          ritual Presença do Medo"). Não há o que
                          escolher; falta só trazer a cópia para a aba
                          Rituais, e o R.A.M.A. não faz isso sozinho
                          porque adicionar um ritual é escrever na ficha
   ESCOLHA                a regra diz QUANTOS e de que círculo. Quem
                          escolhe é quem joga, sempre
   ARMAZENAMENTO          o grimório de Graduado não é "mais rituais
                          conhecidos": é outro lugar, com outra condição
                          de uso (empunhar o grimório e gastar uma ação
                          completa)

   ---------------------------------------------------------------------
   NADA AQUI É DEDUZIDO
   ---------------------------------------------------------------------

   Cada concessão carrega a fonte e a página de onde saiu, e as
   quantidades são as impressas. O que os livros deixam ambíguo está em
   docs/ORDEM-REGRAS.md, na seção "Lacunas e interpretações" — não
   escondido numa constante.
   ===================================================================== */

(function (global) {
  "use strict";

  function C() { return global.RAMAOrdemCatalogo; }

  var OPRPG = "OPRPG";
  var SAH = "SAH";

  /* Onde um ritual aprendido fica guardado. A diferença é funcional:
     ver GRIMÓRIO, abaixo. */
  var DESTINOS = {
    conhecido: {
      chave: "conhecido",
      nome: "Aprendido",
      resumo: "Fica conhecido: conjurar é só gastar o PE do círculo.",
    },
    grimorio: {
      chave: "grimorio",
      nome: "Grimório",
      resumo: "Fica registrado no grimório: para conjurar, é preciso empunhá-lo e gastar uma ação completa folheando.",
    },
  };

  /* De onde a concessão veio. Classe e trilha aparecem SEPARADAS mesmo
     quando caem no mesmo degrau (Saber Ampliado e o ritual por NEX
     chegam juntos em vários degraus). */
  var ORIGENS = {
    classe: { chave: "classe", nome: "Classe" },
    trilha: { chave: "trilha", nome: "Trilha" },
    poder: { chave: "poder", nome: "Poder" },
  };

  /* =================================================================
     OS RITUAIS QUE UMA TRILHA CONCEDE PELO NOME
     -----------------------------------------------------------------
     O catálogo de rituais (js/ordem/rituais-dados.js) é carregado sob
     demanda e NÃO está presente na maior parte das páginas. Por isso o
     que esta tabela guarda de cada ritual é o mínimo para mostrar e
     conferir a concessão — id, nome, círculo e elemento —, e o teste
     "as concessões batem com o catálogo" garante que os dois não
     divirjam em silêncio.
     ================================================================= */

  function ritual(id, nome, circulo, elemento) {
    return { id: id, nome: nome, circulo: circulo, elemento: elemento };
  }

  var RITUAIS_DE_TRILHA = [
    { trilha: "conduite", poder: "canalizarOMedo", nome: "Canalizar o Medo", nex: 99,
      fonte: OPRPG, pagina: 34,
      ritual: ritual("op.ritual.canalizar-o-medo", "Canalizar o Medo", 4, "medo") },

    { trilha: "flagelador", poder: "medoTangivel", nome: "Medo Tangível", nex: 99,
      fonte: OPRPG, pagina: 35,
      ritual: ritual("op.ritual.medo-tangivel", "Medo Tangível", 4, "medo") },

    { trilha: "graduado", poder: "conhecendoOMedo", nome: "Conhecendo o Medo", nex: 99,
      fonte: OPRPG, pagina: 35,
      ritual: ritual("op.ritual.conhecendo-o-medo", "Conhecendo o Medo", 4, "medo") },

    { trilha: "intuitivo", poder: "presencaDoMedo", nome: "Presença do Medo", nex: 99,
      fonte: OPRPG, pagina: 35,
      ritual: ritual("op.ritual.presenca-do-medo", "Presença do Medo", 4, "medo") },

    { trilha: "laminaparanormal", poder: "laminaMaldita", nome: "Lâmina Maldita", nex: 10,
      fonte: OPRPG, pagina: 35,
      ritual: ritual("op.ritual.amaldicoar-arma", "Amaldiçoar Arma", 1, "conhecimento"),
      nota: "Se o personagem já conhecia Amaldiçoar Arma, a trilha não dá outra cópia: o custo dele cai −1 PE." },

    { trilha: "laminaparanormal", poder: "laminaDoMedo", nome: "Lâmina do Medo", nex: 99,
      fonte: OPRPG, pagina: 35,
      ritual: ritual("op.ritual.lamina-do-medo", "Lâmina do Medo", 4, "medo") },

    /* Ser Aterrorizante concede um ritual diferente por elemento da
       maldição — e, no Conhecimento, uma ESCOLHA: "aprende um ritual de
       Conhecimento de 4º círculo a sua escolha" (SAH p. 22). */
    { trilha: "monstruoso", poder: "serAterrorizante", nome: "Ser Aterrorizante", nex: 99,
      fonte: SAH, pagina: 20, dependeDe: "serAmaldicoado",
      porElemento: {
        sangue: { ritual: ritual("op.ritual.forma-monstruosa", "Forma Monstruosa", 3, "sangue") },
        morte: { ritual: ritual("op.ritual.fim-inevitavel", "Fim Inevitável", 4, "morte") },
        energia: { ritual: ritual("op.ritual.deflagracao-de-energia", "Deflagração de Energia", 4, "energia") },
        conhecimento: { escolha: { circulos: [4], elemento: "conhecimento" } },
      } },
  ];

  /* =================================================================
     REGRAS OPCIONAIS QUE MEXEM NO APRENDIZADO
     -----------------------------------------------------------------
     "Os Limites da Compreensão Humana" (SAH p. 113) apresenta DUAS
     alternativas, e o R.A.M.A. as trata como duas chaves incompatíveis
     porque é assim que elas convivem: ou uma, ou a outra, ou nenhuma.
     ================================================================= */

  var REGRA_LENTO = "limitesCompreensao";
  var REGRA_CAMPO = "aprendizadoEmCampo";

  /* =================================================================
     CÍRCULOS
     ================================================================= */

  /* O círculo máximo que a classe conjura NAQUELE degrau — não agora.
     Uma escolha de NEX 20% é conferida contra o NEX 20%, e o livro não
     dá acesso retroativo (OPRPG p. 32).

     Com NEX & Experiência, o degrau é o nível e o acesso acompanha o
     nível: "Escolhido pelo Outro Lado" é habilidade de CLASSE, e o
     nível "substitui o NEX em Benefícios por NEX" (SAH p. 98). */
  function circuloMaximoNoDegrau(chaveClasse, degrau) {
    var classe = C() ? C().classe(chaveClasse) : null;
    if (!classe || !classe.circuloPorNex) return 0;
    var nex = degrau >= 20 ? 99 : Math.max(0, degrau) * 5;
    var maximo = 0;
    classe.circuloPorNex.forEach(function (faixa) {
      if (nex >= faixa.nex) maximo = faixa.circulo;
    });
    return maximo;
  }

  /* Os degraus em que a classe GANHA um círculo novo, depois de um
     degrau de corte. É o gatilho de "toda vez que ganha acesso a um
     novo círculo" (Saber Ampliado e Grimório, OPRPG p. 35). */
  function degrausDeCirculoNovo(chaveClasse, depoisDoDegrau) {
    var classe = C() ? C().classe(chaveClasse) : null;
    if (!classe || !classe.circuloPorNex) return [];
    var saida = [];
    classe.circuloPorNex.forEach(function (faixa) {
      var d = faixa.nex >= 99 ? 20 : Math.round(faixa.nex / 5);
      if (d > depoisDoDegrau) saida.push({ degrau: d, circulo: faixa.circulo });
    });
    return saida;
  }

  function ate(maximo) {
    var saida = [];
    for (var i = 1; i <= maximo; i++) saida.push(i);
    return saida;
  }

  /* O círculo máximo que Aprender Ritual alcança. Este é poder
     PARANORMAL: com nível e NEX separados ele continua olhando para o
     NEX de exposição, não para o nível (SAH p. 98). */
  var CIRCULO_DE_APRENDER_RITUAL = [
    { nex: 0, circulo: 1 },
    { nex: 45, circulo: 2 },
    { nex: 75, circulo: 3 },
  ];

  function circuloDeAprenderRitual(exposicao) {
    var maximo = 1;
    CIRCULO_DE_APRENDER_RITUAL.forEach(function (faixa) {
      if ((Number(exposicao) || 0) >= faixa.nex) maximo = faixa.circulo;
    });
    return maximo;
  }

  /* =================================================================
     AS CONCESSÕES
     -----------------------------------------------------------------
     ctx = {
       classe, trilha, passos,      o trilho de progressão já resolvido
       separado,                    NEX & Experiência ligada
       lento, campo,                as duas variantes de SAH p. 113
       elementoMaldicao,            o elemento de Ser Amaldiçoado
     }

     Cada concessão:

       id           o id ESTÁVEL da vaga, no mesmo formato do resto da
                    progressão: d<degrau>.<sufixo>. Ele diz de onde a
                    concessão veio, nunca o texto mostrado
       degrau       o passo de progressão que a abriu
       origem       classe | trilha
       poder        a chave da habilidade que concede
       quantidade   um número, ou "intelecto" (resolvido na etapa)
       circulos     a lista de círculos aceitos, já resolvida
       elemento     "" ou o elemento exigido
       destino      conhecido | grimorio
       fixo         o ritual concedido pelo nome, quando é automática
       opcional     "pode incluir" é diferente de "aprende"
     ================================================================= */

  function concessao(extra) {
    return Object.assign({
      id: "",
      degrau: 1,
      origem: ORIGENS.classe.chave,
      poder: "",
      nomePoder: "",
      fonte: OPRPG,
      pagina: 0,
      quantidade: 1,
      circulos: [1],
      elemento: "",
      destino: DESTINOS.conhecido.chave,
      fixo: null,
      opcional: false,
      contaNoLimite: false,
      nota: "",
    }, extra || {});
  }

  function concessoes(ctx) {
    var c = ctx || {};
    var passos = Math.max(0, Number(c.passos) || 0);
    var lista = [];
    if (!passos) return lista;

    concessoesDaClasse(lista, c, passos);
    concessoesDaTrilha(lista, c, passos);
    concessoesAutomaticas(lista, c, passos);

    return lista.sort(function (a, b) {
      return (a.degrau - b.degrau) || (a.origem === b.origem ? 0 : (a.origem === "classe" ? -1 : 1));
    });
  }

  /* ---------------------------------------------------------------
     CLASSE — Escolhido pelo Outro Lado (OPRPG p. 32)
     --------------------------------------------------------------- */

  function concessoesDaClasse(lista, c, passos) {
    var maximoInicial = circuloMaximoNoDegrau(c.classe, 1);
    if (!maximoInicial) return;   /* a classe não conjura por NEX */

    lista.push(concessao({
      id: "d1.rituaisIniciais",
      degrau: 1,
      origem: ORIGENS.classe.chave,
      poder: "escolhidoPeloOutroLado",
      nomePoder: "Escolhido pelo Outro Lado",
      pagina: 32,
      quantidade: 3,
      circulos: [1],
    }));

    /* "Sempre que avança de NEX, aprende um ritual de qualquer círculo
       que possa lançar" — um por degrau, a partir do segundo.

       Aprendizado em campo (SAH p. 113) tira estes avanços: os rituais
       passam a ser encontrados em missão e aprendidos por estudo.
       Aprendizado lento deixa só os degraus ímpares. */
    if (c.campo) return;

    for (var d = 2; d <= passos; d++) {
      if (c.lento && d % 2 === 0) continue;
      lista.push(concessao({
        id: "d" + d + ".ritualClasse",
        degrau: d,
        origem: ORIGENS.classe.chave,
        poder: "escolhidoPeloOutroLado",
        nomePoder: "Escolhido pelo Outro Lado",
        pagina: 32,
        quantidade: 1,
        circulos: ate(circuloMaximoNoDegrau(c.classe, d)),
        nota: c.lento ? "Com o limite por aprendizado lento, o ritual vem só nos degraus ímpares (Sobrevivendo ao Horror, p. 113)." : "",
      }));
    }
  }

  /* ---------------------------------------------------------------
     TRILHA GRADUADO — Saber Ampliado e Grimório (OPRPG p. 35)
     --------------------------------------------------------------- */

  var DEGRAU_SABER_AMPLIADO = 2;    /* NEX 10% */
  var DEGRAU_GRIMORIO = 8;          /* NEX 40% */

  function concessoesDaTrilha(lista, c, passos) {
    if (c.trilha !== "graduado") return;
    if (!circuloMaximoNoDegrau(c.classe, 1)) return;

    /* Saber Ampliado: "Você aprende um ritual de 1º círculo. Toda vez
       que ganha acesso a um novo círculo, aprende um ritual adicional
       daquele círculo." O adicional é DAQUELE círculo, não até ele. */
    if (passos >= DEGRAU_SABER_AMPLIADO) {
      lista.push(concessao({
        id: "d" + DEGRAU_SABER_AMPLIADO + ".saberAmpliado",
        degrau: DEGRAU_SABER_AMPLIADO,
        origem: ORIGENS.trilha.chave,
        poder: "saberAmpliado",
        nomePoder: "Saber Ampliado",
        pagina: 35,
        quantidade: 1,
        circulos: [1],
      }));

      degrausDeCirculoNovo(c.classe, DEGRAU_SABER_AMPLIADO).forEach(function (novo) {
        if (novo.degrau > passos) return;
        lista.push(concessao({
          id: "d" + novo.degrau + ".saberAmpliado",
          degrau: novo.degrau,
          origem: ORIGENS.trilha.chave,
          poder: "saberAmpliado",
          nomePoder: "Saber Ampliado",
          pagina: 35,
          quantidade: 1,
          circulos: [novo.circulo],
        }));
      });
    }

    /* Grimório Ritualístico: "Você aprende uma quantidade de rituais de
       1º ou 2º círculos igual ao seu Intelecto. Quando ganha acesso a um
       novo círculo, PODE incluir um novo ritual desse círculo em seu
       grimório." O segundo é uma permissão, não uma obrigação. */
    if (passos >= DEGRAU_GRIMORIO) {
      lista.push(concessao({
        id: "d" + DEGRAU_GRIMORIO + ".grimorio",
        degrau: DEGRAU_GRIMORIO,
        origem: ORIGENS.trilha.chave,
        poder: "grimorioRitualistico",
        nomePoder: "Grimório Ritualístico",
        pagina: 35,
        quantidade: "intelecto",
        circulos: [1, 2],
        destino: DESTINOS.grimorio.chave,
      }));

      degrausDeCirculoNovo(c.classe, DEGRAU_GRIMORIO).forEach(function (novo) {
        if (novo.degrau > passos) return;
        lista.push(concessao({
          id: "d" + novo.degrau + ".grimorio",
          degrau: novo.degrau,
          origem: ORIGENS.trilha.chave,
          poder: "grimorioRitualistico",
          nomePoder: "Grimório Ritualístico",
          pagina: 35,
          quantidade: 1,
          circulos: [novo.circulo],
          destino: DESTINOS.grimorio.chave,
          opcional: true,
        }));
      });
    }
  }

  /* ---------------------------------------------------------------
     CONCESSÕES AUTOMÁTICAS — a trilha diz qual ritual
     --------------------------------------------------------------- */

  function concessoesAutomaticas(lista, c, passos) {
    RITUAIS_DE_TRILHA.forEach(function (entrada) {
      if (entrada.trilha !== c.trilha) return;
      var d = entrada.nex >= 99 ? 20 : Math.round(entrada.nex / 5);
      if (d > passos) return;

      var base = {
        id: "d" + d + "." + entrada.poder,
        degrau: d,
        origem: ORIGENS.trilha.chave,
        poder: entrada.poder,
        nomePoder: entrada.nome,
        fonte: entrada.fonte,
        pagina: entrada.pagina,
        quantidade: 1,
        nota: entrada.nota || "",
      };

      if (entrada.porElemento) {
        /* Sem o elemento da maldição escolhido não dá para saber o que a
           habilidade concede — e chutar seria conceder por engano. */
        var ramo = entrada.porElemento[c.elementoMaldicao || ""];
        if (!ramo) return;
        if (ramo.ritual) {
          lista.push(concessao(Object.assign(base, {
            circulos: [ramo.ritual.circulo],
            elemento: ramo.ritual.elemento,
            fixo: ramo.ritual,
          })));
        } else {
          lista.push(concessao(Object.assign(base, {
            circulos: ramo.escolha.circulos.slice(),
            elemento: ramo.escolha.elemento || "",
          })));
        }
        return;
      }

      lista.push(concessao(Object.assign(base, {
        circulos: [entrada.ritual.circulo],
        elemento: entrada.ritual.elemento,
        fixo: entrada.ritual,
      })));
    });
  }

  /* =================================================================
     QUANTIDADE, RÓTULO E EXPLICAÇÃO
     ================================================================= */

  /* "igual ao seu Intelecto" é resolvido NA ETAPA: o Intelecto que vale
     é o que o personagem tinha ali, não o de hoje. Quem passa o número
     é o motor de progressão, que mantém o percurso. */
  function quantidadeDa(c, intelecto) {
    if (!c) return 0;
    if (c.quantidade === "intelecto") return Math.max(0, Number(intelecto) || 0);
    return Math.max(0, Number(c.quantidade) || 0);
  }

  function rotuloDaConcessao(c) {
    if (!c) return "Rituais";
    if (c.id === "d1.rituaisIniciais") return "Rituais iniciais";
    /* Sem o nome do ritual: quem mostra o rótulo mostra a decisão do
       lado ("Ritual concedido: Conhecendo o Medo"), e repetir o nome nos
       dois daria "Conhecendo o Medo: Conhecendo o Medo". */
    if (c.fixo) return "Ritual concedido";
    if (c.destino === DESTINOS.grimorio.chave) return "Rituais do grimório";
    if (c.poder === "saberAmpliado") return "Saber Ampliado";
    if (c.poder === "escolhidoPeloOutroLado") return "Ritual de ocultista";
    return "Rituais — " + c.nomePoder;
  }

  function textoDosCirculos(c) {
    var lista = (c && c.circulos) || [];
    if (!lista.length) return "nenhum círculo disponível";
    if (lista.length === 1) return lista[0] + "º círculo";
    var ultimos = lista.slice();
    var ultimo = ultimos.pop();
    return ultimos.map(function (n) { return n + "º"; }).join(", ") + " ou " + ultimo + "º círculo";
  }

  function explicacaoDaConcessao(c, quantidade) {
    if (!c) return "";
    if (c.fixo) {
      /* A habilidade de trilha costuma ter o NOME do ritual que concede
         ("NEX 99% — Conhecendo o Medo. Você aprende o ritual Conhecendo
         o Medo"). Dizer "Conhecendo o Medo concede Conhecendo o Medo"
         seria fiel e inútil. */
      return "Esta habilidade de trilha concede o ritual " + c.fixo.nome + ", pelo nome. " +
        "Não há o que escolher: falta trazer a cópia para a aba Rituais." + (c.nota ? " " + c.nota : "");
    }
    var quantos = quantidade === undefined ? quantidadeDa(c, 0) : quantidade;
    var partes = [
      (c.opcional ? "Pode incluir " : "Escolha ") + quantos + (quantos === 1 ? " ritual" : " rituais") +
      " de " + textoDosCirculos(c) + ".",
    ];
    if (c.destino === DESTINOS.grimorio.chave) partes.push(DESTINOS.grimorio.resumo);
    if (c.contaNoLimite) partes.push("Este conta no limite de rituais conhecidos (Intelecto).");
    else partes.push("Não conta no limite de rituais conhecidos.");
    if (c.nota) partes.push(c.nota);
    return partes.join(" ");
  }

  /* =================================================================
     ELEGIBILIDADE
     -----------------------------------------------------------------
     `dados` é o que se sabe do ritual candidato: { circulo, elemento,
     elementos, catalogo }. O motivo é sempre escrito por extenso — uma
     opção indisponível continua à vista, com o porquê.
     ================================================================= */

  function elegibilidade(c, dados) {
    var d = dados || {};
    if (!c) return { ok: false, motivo: "Esta concessão não existe mais na progressão." };

    if (c.fixo) {
      if (d.catalogo && d.catalogo === c.fixo.id) return { ok: true, motivo: "" };
      return { ok: false, motivo: c.nomePoder + " concede " + c.fixo.nome + ", e só ele." };
    }

    var circulo = Math.round(Number(d.circulo));
    if (!Number.isFinite(circulo) || circulo < 1) {
      return { ok: false, motivo: "Este ritual não informa o círculo, e a concessão é por círculo." };
    }
    if (c.circulos.indexOf(circulo) < 0) {
      return { ok: false, motivo: "Esta concessão aceita " + textoDosCirculos(c) + "; este ritual é de " + circulo + "º." };
    }

    if (c.elemento) {
      var elementos = Array.isArray(d.elementos) && d.elementos.length ? d.elementos : (d.elemento ? [d.elemento] : []);
      if (elementos.indexOf(c.elemento) < 0) {
        return { ok: false, motivo: "Esta concessão é de " + c.elemento + "; este ritual não é." };
      }
    }

    return { ok: true, motivo: "" };
  }

  /* =================================================================
     LIMITE DE RITUAIS CONHECIDOS
     -----------------------------------------------------------------
     "Qualquer personagem pode aprender rituais através do poder
     paranormal Aprender Ritual. Porém, um personagem só pode aprender
     um número de rituais dessa forma igual ao seu Intelecto. Além
     disso, ocultistas aprendem rituais através de suas habilidades de
     classe. Esses rituais NÃO contam no limite" (OPRPG p. 119).

     Por isso o limite conta só o que veio de Aprender Ritual — e é por
     isso que ele existe como conta separada, e não como "quantos
     rituais a ficha tem".
     ================================================================= */

  function limite(intelecto, usados) {
    var total = Math.max(0, Number(intelecto) || 0);
    var gastos = Math.max(0, Number(usados) || 0);
    return {
      total: total,
      usados: gastos,
      restantes: Math.max(0, total - gastos),
      excedido: gastos > total,
    };
  }

  global.RAMAOrdemAprendizado = {
    DESTINOS: DESTINOS,
    ORIGENS: ORIGENS,
    RITUAIS_DE_TRILHA: RITUAIS_DE_TRILHA,
    REGRA_LENTO: REGRA_LENTO,
    REGRA_CAMPO: REGRA_CAMPO,
    DEGRAU_SABER_AMPLIADO: DEGRAU_SABER_AMPLIADO,
    DEGRAU_GRIMORIO: DEGRAU_GRIMORIO,
    CIRCULO_DE_APRENDER_RITUAL: CIRCULO_DE_APRENDER_RITUAL,

    concessoes: concessoes,
    circuloMaximoNoDegrau: circuloMaximoNoDegrau,
    degrausDeCirculoNovo: degrausDeCirculoNovo,
    circuloDeAprenderRitual: circuloDeAprenderRitual,
    quantidadeDa: quantidadeDa,
    rotuloDaConcessao: rotuloDaConcessao,
    explicacaoDaConcessao: explicacaoDaConcessao,
    textoDosCirculos: textoDosCirculos,
    elegibilidade: elegibilidade,
    limite: limite,
  };
})(typeof window !== "undefined" ? window : globalThis);
